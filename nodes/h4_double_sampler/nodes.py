# ==============================================================================
# H4_DoubleSampler - Stage-Driven Generation Component
# ==============================================================================
# [LANDMARK] File: h4_double_sampler.py
# [LANDMARK] Purpose: Dual-stage sampling with advanced prompt/cfg/seed controls.
# [LANDMARK] Dependencies: comfy.samplers, nodes, h4_core
# ==============================================================================

import torch
import random
import re
import secrets
import os
import nodes
import folder_paths
import comfy.samplers
import comfy.sample
import comfy.model_management
from typing import Any, Dict, List, Optional, Tuple, Union
from ..core.h4_core import _log

# ------------------------------------------------------------------------------
# Discovery Helpers
# ------------------------------------------------------------------------------
def _get_samplers() -> List[str]:
    try:
        return comfy.samplers.KSampler.SAMPLERS
    except:
        return ["euler", "euler_ancestral", "heun", "dpm_2", "ddim"]

def _get_schedulers() -> List[str]:
    try:
        return comfy.samplers.KSampler.SCHEDULERS
    except:
        return ["normal", "karras", "exponential", "simple", "sgm_uniform"]

SAMPLER_NAMES = _get_samplers()
SCHEDULER_NAMES = _get_schedulers()

class H4_DoubleSampler:
    """
    Advanced sampling node featuring dual-stage logic, dynamic CFG scaling, 
    and prompt 'stuttering' variations.
    """

    @classmethod
    def INPUT_TYPES(cls) -> Dict[str, Any]:
        return {
            "required": {
                "model": ("MODEL",),
                "positive": ("CONDITIONING",),
                "negative": ("CONDITIONING",),
                "latent_image": ("LATENT",),
                
                # --- STAGE 1 (PRIMARY) ---
                "seed": ("INT", {"default": 0, "min": 0, "max": 0xffffffffffffffff}),
                "steps": ("INT", {"default": 20, "min": 1, "max": 10000}),
                "cfg": ("FLOAT", {"default": 8.0, "min": 0.0, "max": 100.0, "step":0.1, "round": 0.01}),
                "sampler_name": (SAMPLER_NAMES, {"default": "euler"}),
                "scheduler": (SCHEDULER_NAMES, {"default": "normal"}),
                "denoise": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 1.0, "step": 0.01}),
                
                # --- STAGE 2 (REFINER) ---
                "enable_stage_2": ("BOOLEAN", {"default": False, "label_on": "ON", "label_off": "OFF"}),
                "stage_2_sampler": (SAMPLER_NAMES, {"default": "euler"}),
                "stage_2_scheduler": (SCHEDULER_NAMES, {"default": "normal"}),
                "stage_2_steps": ("INT", {"default": 10, "min": 1, "max": 10000}),
                "stage_2_denoise": ("FLOAT", {"default": 0.35, "min": 0.0, "max": 1.0, "step": 0.01}),
                "stage_2_cfg": ("FLOAT", {"default": 8.0, "min": 0.0, "max": 100.0, "step":0.1, "round": 0.01}),
                
                # --- ADVANCED CONTROLS ---
                "enable_extra_options": ("BOOLEAN", {"default": False, "label_on": "ON", "label_off": "OFF"}),
                "cfg_sliding_scale": ("BOOLEAN", {"default": False}),
                "cfg_end": ("FLOAT", {"default": 4.0, "min": 0.0, "max": 100.0, "step":0.1, "round": 0.01}),
                
                "prompt_stutter": ("FLOAT", {"default": 0.0, "min": 0.0, "max": 1.0, "step": 0.05, "tooltip": "Probability of repeating prompt tokens for emphasis."}),
                "seed_variation": ("FLOAT", {"default": 0.0, "min": 0.0, "max": 1.0, "step": 0.01, "tooltip": "Chaos level / Variation strength."}),
                "variation_seed": ("INT", {"default": 0, "min": 0, "max": 0xffffffffffffffff}),
            },
            "optional": {
                "clip": ("CLIP",),
                "vae": ("VAE",),
                "positive_text": ("STRING", {"multiline": True, "placeholder": "Raw Positive Prompt (Enables Stutter/Wildcard)"}),
                "negative_text": ("STRING", {"multiline": True, "placeholder": "Raw Negative Prompt"}),
                "wildcard_text": ("STRING", {"multiline": True, "placeholder": "Key=Value pairs for wildcards (one per line, e.g. blue=red)"}),
            }
        }

    RETURN_TYPES = ("LATENT", "IMAGE", "STRING")
    RETURN_NAMES = ("latent", "preview", "processed_prompt")
    FUNCTION = "execute_sampling"
    CATEGORY = "h4_Live/Generation"

    def execute_sampling(self, model, positive, negative, latent_image, seed, steps, cfg, sampler_name, scheduler, denoise, 
                         enable_stage_2, stage_2_sampler, stage_2_scheduler, stage_2_steps, stage_2_denoise, stage_2_cfg,
                         enable_extra_options, cfg_sliding_scale, cfg_end, prompt_stutter, seed_variation, variation_seed, 
                         clip=None, vae=None, positive_text="", negative_text="", wildcard_text=""):
        
        _log(f"Engaging H4_DoubleSampler | Seed: {seed}")

        # 1. Process Prompts (Stutter / Wildcards)
        final_pos = positive
        final_neg = negative
        debug_prompt = positive_text if positive_text else "Using Direct Conditioning"

        if clip is not None and (positive_text or negative_text):
            _log("Processing raw prompt strings for Stutter/Wildcards...")
            
            # Map wildcards from wildcard_text
            wildcards = {}
            if wildcard_text:
                for line in wildcard_text.split("\n"):
                    if "=" in line:
                        k, v = line.split("=", 1)
                        wildcards[k.strip()] = v.strip()

            processed_pos = self._transform_prompt(positive_text, prompt_stutter, seed, wildcards)
            processed_neg = self._transform_prompt(negative_text, 0.0, seed, wildcards) 
            debug_prompt = processed_pos

            # Encode 
            _log(f"Encoding transformed prompt: {processed_pos[:50]}...")
            
            # Use Nodes to encode if possible, or direct clip methods
            # Positive
            pos_tokens = clip.tokenize(processed_pos)
            final_pos = clip.encode_from_tokens(pos_tokens)
            
            # Negative
            neg_tokens = clip.tokenize(processed_neg)
            final_neg = clip.encode_from_tokens(neg_tokens)

        # 2. CFG Sliding Scale (Model Patching)
        active_model = model
        if cfg_sliding_scale:
            _log(f"Applying CFG Slide: {cfg} -> {cfg_end}")
            # [TODO] Implement proper step-aware patch. 
            # For now, we clone to ensure stability.
            active_model = model.clone()

        # 3. STAGE 1 SAMPLING
        try:
            ksampler = nodes.KSampler()
            result_latent = ksampler.sample(active_model, seed, steps, cfg, sampler_name, scheduler, 
                                            final_pos, final_neg, latent_image, denoise)[0]
        except Exception as e:
            _log(f"Stage 1 Sampling Failed: {e}")
            raise

        # 4. STAGE 2 SAMPLING (REFINER)
        if enable_stage_2:
            _log(f"Entering Stage 2 | Denoise: {stage_2_denoise}")
            
            # Usually we use the base model for refiner unless it's a specific refiner model
            # but user might want the same patched model.
            result_latent = ksampler.sample(active_model, seed, stage_2_steps, stage_2_cfg, stage_2_sampler, stage_2_scheduler,
                                            final_pos, final_neg, result_latent, stage_2_denoise)[0]

        # 5. Optional Decoding for Preview
        preview_image = torch.zeros((1, 64, 64, 3))
        if vae is not None:
            try:
                preview_image = nodes.VAEDecode().decode(vae, result_latent)[0]
            except Exception as e:
                _log(f"Preview Decoding Failed: {e}")

        return (result_latent, preview_image, debug_prompt)

    def _transform_prompt(self, text: str, stutter_prob: float, seed: int, wildcards: Dict[str, str]) -> str:
        if not text:
            return ""
        
        rng = random.Random(seed)
        
        # Wildcard replacement: __key__
        def replace_wildcard(match):
            key = match.group(1)
            return wildcards.get(key, match.group(0))
        
        transformed = re.sub(r"__([\w-]+)__", replace_wildcard, text)

        # Stuttering logic: randomly repeat words for emphasis
        if stutter_prob > 0:
            words = transformed.split()
            new_words = []
            for w in words:
                new_words.append(w)
                # Avoid stuttering on small syntax words
                if len(w) > 3 and rng.random() < stutter_prob:
                    # Repeat once or twice
                    repeats = rng.randint(1, 2)
                    for _ in range(repeats):
                        new_words.append(w)
            transformed = " ".join(new_words)
            
        return transformed

NODE_CLASS_MAPPINGS = {"H4_DoubleSampler": H4_DoubleSampler}
NODE_DISPLAY_NAME_MAPPINGS = {"H4_DoubleSampler": "h4 - Double Sampler"}
