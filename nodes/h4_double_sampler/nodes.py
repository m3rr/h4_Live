# H4_DoubleSampler v7.5.6 - THE MUTATION MANIFESTO
# Stage-Driven Generation Component
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
from ...core.h4_core import _log

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
                
                # --- CHAOS ENGINE TRIGGER ---
                "enable_chaos_engine": ("BOOLEAN", {"default": False, "label_on": "ON", "label_off": "OFF"}),
                
                # --- ADVANCED CONTROLS / EXTRA ---
                "enable_extra_options": ("BOOLEAN", {"default": False, "label_on": "ON", "label_off": "OFF"}),
                "cfg_sliding_scale": ("BOOLEAN", {"default": False, "tooltip": "When ON, the CFG will shift from its start value to the CFG End value over the course of the steps."}),
                "cfg_end": ("FLOAT", {"default": 4.0, "min": 0.0, "max": 100.0, "step":0.1, "round": 0.01, "tooltip": "The landing target for the CFG slide. Lower values give more 'air' to the image near the end."}),
                
                "prompt_stutter": ("FLOAT", {"default": 0.0, "min": 0.0, "max": 1.0, "step": 0.05, "tooltip": "Probability of randomly repeating tokens to trick the model into deep-fried emphasis levels."}),
                "seed_variation": ("FLOAT", {"default": 0.0, "min": 0.0, "max": 1.0, "step": 0.01, "tooltip": "Global chaos delta. Higher values force the seed to drift away from the baseline pattern."}),
                "variation_seed": ("INT", {"default": 0, "min": 0, "max": 0xffffffffffffffff, "tooltip": "The core of the noise drift. Change this to explore a different flavor of chaos."}),

                # --- CHAOS ENGINE (DRAWER TARGETS) ---
                "chaos_mode": (["OFF", "Pure Chaos", "Odds", "Evens", "Every #nth number", "Random Pulse"], {"default": "OFF", "tooltip": "Pick your injection pattern. 'Pure Chaos' hits everything; 'Odds/Evens' creates structured noise; 'Every #nth number' gives you frequency control; 'Random Pulse' keeps it weird."}),
                "chaos_every": ("INT", {"default": 3, "min": 1, "max": 100, "tooltip": "The specific input for your 'nth' number. 3 means every 3rd word gets hammered by the chaos logic."}),
                "chaos_range": ("STRING", {"default": "-1.0-1.5", "tooltip": "Min-Max weight spectrum. High values (1.5+) explode detail; Negative values (-1.0) try to delete concepts."}),
                "chaos_batch": ("INT", {"default": 1, "min": 1, "max": 64, "tooltip": "How many unique chaos variants to spawn in a single execution."}),
                "chaos_denoise": ("FLOAT", {"default": 0.45, "min": 0.0, "max": 1.0, "step": 0.01, "tooltip": "The 'Mutation Strength' for Chaos variants. High values (0.7+) allow the chaos to completely overwrite the original; low values (0.3) just add subtle weirdness."}),
                "show_legend": ("BOOLEAN", {"default": False, "tooltip": "Burn the diagnostic stats directly onto the top-left of the preview image."}),
                "label_seed": ("BOOLEAN", {"default": False, "tooltip": "Explicitly output the seed used for each specific batch index."}),
            },
            "optional": {
                "clip": ("CLIP",),
                "vae": ("VAE",),
                "positive_text": ("STRING", {"multiline": True, "placeholder": "Raw Positive Prompt (Enables Stutter/Wildcard)"}),
                "negative_text": ("STRING", {"multiline": True, "placeholder": "Raw Negative Prompt"}),
                "wildcard_text": ("STRING", {"multiline": True, "placeholder": "Key=Value pairs for wildcards (one per line, e.g. blue=red)"}),
            }
        }

    RETURN_TYPES = ("LATENT", "IMAGE", "STRING", "INT", "INT", "FLOAT", "STRING", "STRING")
    RETURN_NAMES = ("latent", "preview", "processed_prompt", "seed_out", "steps_out", "cfg_out", "sampler_str", "scheduler_str")
    FUNCTION = "execute_sampling"
    CATEGORY = "h4_Live/Generation"

    def execute_sampling(self, model, positive, negative, latent_image, seed, steps, cfg, sampler_name, scheduler, denoise, 
                         enable_stage_2, stage_2_sampler, stage_2_scheduler, stage_2_steps, stage_2_denoise, stage_2_cfg,
                         enable_chaos_engine,
                         enable_extra_options, cfg_sliding_scale, cfg_end, prompt_stutter, seed_variation, variation_seed, 
                         chaos_mode, chaos_every, chaos_range, chaos_batch, chaos_denoise, show_legend, label_seed,
                         clip=None, vae=None, positive_text="", negative_text="", wildcard_text=""):
        
        _log(f"Engaging H4_DoubleSampler | Seed: {seed} | Chaos: {chaos_mode}")

        # 1. Standard Prompt Processing
        final_pos = positive
        final_neg = negative
        processed_pos_text = positive_text

        if clip is not None and (positive_text or negative_text):
            wildcards = {}
            if wildcard_text:
                for line in wildcard_text.split("\n"):
                    if "=" in line:
                        k, v = line.split("=", 1)
                        wildcards[k.strip()] = v.strip()

            processed_pos_text = self._transform_prompt(positive_text, prompt_stutter, seed, wildcards)
            processed_neg_text = self._transform_prompt(negative_text, 0.0, seed, wildcards) 
            
            # Encode Baseline (matches current CLIPTextEncode API)
            pos_tokens = clip.tokenize(processed_pos_text)
            pos_output = clip.encode_from_tokens(pos_tokens, return_pooled=True, return_dict=True)
            pos_cond = pos_output.pop("cond")
            final_pos = [[pos_cond, pos_output]]

            neg_tokens = clip.tokenize(processed_neg_text)
            neg_output = clip.encode_from_tokens(neg_tokens, return_pooled=True, return_dict=True)
            neg_cond = neg_output.pop("cond")
            final_neg = [[neg_cond, neg_output]]

        # 2. CFG sliding is handled if needed (cloned model)
        active_model = model
        if cfg_sliding_scale:
            active_model = model.clone()

        # ----------------------------------------------------------------------
        # PHASE 1: THE BASELINE GENERATION
        # ----------------------------------------------------------------------
        ksampler = nodes.KSampler()
        
        # Primary Pass
        baseline_latent = ksampler.sample(active_model, seed, steps, cfg, sampler_name, scheduler, 
                                          final_pos, final_neg, latent_image, denoise)[0]
        
        # Refiner Pass (Stage 2)
        if enable_stage_2:
            baseline_latent = ksampler.sample(active_model, seed, stage_2_steps, stage_2_cfg, stage_2_sampler, stage_2_scheduler,
                                              final_pos, final_neg, baseline_latent, stage_2_denoise)[0]

        # Final Base Latent Storage
        final_latents = [baseline_latent["samples"]]
        final_previews = []
        final_prompts = [processed_pos_text]

        # Decode Baseline for Preview
        if vae is not None:
            pimg = nodes.VAEDecode().decode(vae, {"samples": baseline_latent["samples"]})[0]
            if show_legend:
                pimg = self._render_legend(pimg, seed, steps, cfg, sampler_name, scheduler, 
                                          enable_stage_2, stage_2_steps, stage_2_cfg, stage_2_sampler, stage_2_scheduler,
                                          chaos_active=False)
            final_previews.append(pimg)

        # ----------------------------------------------------------------------
        # PHASE 2: THE CHAOS BRANCH (Branching Second Pass)
        # ----------------------------------------------------------------------
        chaos_active = enable_chaos_engine and chaos_mode != "OFF"
        if chaos_active:
            _log(f"⚡ CHAOS ENGINE ENGAGED | Mode: {chaos_mode} | Variants: {chaos_batch}")
            
            # Use original conditioning if text is empty
            base_pos = final_pos
            base_neg = final_neg
            
            # Determine weight range
            min_w, max_w = -1.0, 1.5
            if chaos_range and "-" in chaos_range:
                try:
                    parts = chaos_range.split("-")
                    min_w = float(parts[0]); max_w = float(parts[1])
                except: pass

            for i in range(max(1, int(chaos_batch))):
                iter_seed = seed + 1000 + i # Offset to prevent seed collision with variations
                
                # Apply Chaos weights if we have text and a clip
                if clip is not None and positive_text:
                    chaos_text = self._apply_chaos(positive_text, chaos_mode, chaos_every, min_w, max_w, iter_seed)
                    chaos_tokens = clip.tokenize(chaos_text)
                    chaos_output = clip.encode_from_tokens(chaos_tokens, return_pooled=True, return_dict=True)
                    chaos_cond = chaos_output.pop("cond")
                    chaos_pos = [[chaos_cond, chaos_output]]
                else:
                    chaos_text = positive_text
                    chaos_pos = base_pos

                # Execute Chaos Sampling starting from BASELINE latent
                # This treats Chaos as a mutation of the primary result
                chaos_res = ksampler.sample(active_model, iter_seed, steps, cfg, sampler_name, scheduler,
                                            chaos_pos, base_neg, baseline_latent, chaos_denoise)[0]
                
                final_latents.append(chaos_res["samples"])
                final_prompts.append(chaos_text)

                # Decode Preview
                if vae is not None:
                    cpimg = nodes.VAEDecode().decode(vae, {"samples": chaos_res["samples"]})[0]
                    if show_legend:
                        cpimg = self._render_legend(cpimg, iter_seed, steps, cfg, sampler_name, scheduler, 
                                                   enable_stage_2, stage_2_steps, stage_2_cfg, stage_2_sampler, stage_2_scheduler,
                                                   chaos_active=True, chaos_mode=chaos_mode)
                    final_previews.append(cpimg)

        # ----------------------------------------------------------------------
        # FINAL ASSEMBLY
        # ----------------------------------------------------------------------
        # Construct the final out-batch (Baseline Image + N Chaos Variants)
        out_latent = {"samples": torch.cat(final_latents, dim=0)}
        
        if final_previews:
            out_previews = torch.cat(final_previews, dim=0)
        else:
            # Fallback for unconnected VAE: match the latent batch size with black frames
            out_previews = torch.zeros((len(final_latents), 64, 64, 3))
            
        _log(f"H4 Engine Assembly Complete | Total Batch Size: {len(final_latents)} | Images: {len(final_previews)}")

        # Build the processed prompt output
        # If the user typed text into the widget, output the processed version
        # If using external CONDITIONING (no text), output a generation summary
        valid_prompts = [p for p in final_prompts if p and p.strip()]
        if valid_prompts:
            out_prompt = "\n".join(valid_prompts)
        else:
            out_prompt = f"seed:{seed} | steps:{steps} | cfg:{cfg} | {sampler_name} | {scheduler}"
            if enable_stage_2:
                out_prompt += f" | refiner:{stage_2_steps}steps/{stage_2_cfg}cfg"
        return (out_latent, out_previews, out_prompt, seed, steps, cfg, sampler_name, scheduler)

    def _apply_chaos(self, text, mode, every_n, min_w, max_w, seed):
        if not text: return ""
        rng = random.Random(seed)
        
        # Protection list: symbols and special keywords
        protected = ["BREAK", "(", ")", ":", "{", "|", "}", ",", ".", "-", "_"]
        
        words = text.split()
        new_words = []
        
        # We use a simple counter for 'every' mode to avoid indexing issues with splitting
        word_idx = 0
        for w in words:
            # Skip if protected
            if any(p in w for p in protected) or len(w) <= 1:
                new_words.append(w)
                continue
            
            apply = False
            if mode == "Pure Chaos": apply = True
            elif mode == "Odds": apply = (word_idx % 2 != 0)
            elif mode == "Evens": apply = (word_idx % 2 == 0)
            elif mode == "Every #nth number": 
                safe_every = max(1, every_n)
                apply = (word_idx % safe_every == 0)
            elif mode == "Random Pulse": apply = (rng.random() > 0.5)
            
            if apply:
                # Use a chaotic weight round to 2 decimals
                weight = round(rng.uniform(min_w, max_w), 2)
                new_words.append(f"({w}:{weight})")
            else:
                new_words.append(w)
            word_idx += 1
            
        return " ".join(new_words)

    def _render_legend(self, img_tensor, seed, steps, cfg, sampler, scheduler, s2_on, s2_steps, s2_cfg, s2_sampler, s2_scheduler, chaos_active=False, chaos_mode="OFF"):
        from PIL import Image, ImageDraw, ImageFont
        import numpy as np
        
        # Convert tensor to PIL: img_tensor is [B, H, W, C]
        img_np = (img_tensor[0].cpu().numpy() * 255).astype(np.uint8)
        img = Image.fromarray(img_np)
        
        draw = ImageDraw.Draw(img)
        
        # Try to load a nice font, or fallback
        try:
            # Standard path for many systems
            font = ImageFont.truetype("arial.ttf", 12)
        except:
            font = ImageFont.load_default()
        
        lines = [
            f"SEED: {seed}",
            f"PASS 1: {steps} steps | {cfg} cfg | {sampler} | {scheduler}"
        ]
        
        if s2_on:
            lines.append(f"PASS 2 (REFINER): {s2_steps} steps | {s2_cfg} cfg | {s2_sampler} | {s2_scheduler}")
            
        if chaos_active:
             lines.append(f"🔥 CHAOS ENGINE ACTIVE: {chaos_mode}")
            
        # Draw backdrop with dynamic height
        line_height = 16
        rect_h = 10 + (len(lines) * line_height)
        draw.rectangle([5, 5, 450, 5 + rect_h], fill=(0, 0, 0, 160))
        
        y = 10
        for line in lines:
            color = (255, 255, 255)
            if "CHAOS" in line: color = (255, 100, 0)
            elif "PASS 1" in line: color = (0, 240, 255)
            elif "PASS 2" in line: color = (240, 0, 255)
            
            draw.text((12, y), line, fill=color, font=font)
            y += line_height
            
        # Convert back to tensor [1, H, W, 3]
        return torch.from_numpy(np.array(img).astype(np.float32) / 255.0).unsqueeze(0)

    def _transform_prompt(self, text: str, stutter_prob: float, seed: int, wildcards: Dict[str, str]) -> str:
        if not text:
            return ""
        
        rng = random.Random(seed)
        
        # Wildcard replacement: __key__
        def replace_wildcard(match):
            key = match.group(1)
            # Match objects need careful handling
            return wildcards.get(key, match.group(0))
        
        # Standard re.sub in Python works fine with callable
        transformed = re.sub(r"__([\w-]+)__", replace_wildcard, text)

        # Stuttering logic: randomly repeat words for emphasis
        if stutter_prob > 0:
            words = transformed.split()
            new_words = []
            for w in words:
                new_words.append(w)
                # Avoid stuttering on small syntax words or symbols
                if len(w) > 3 and rng.random() < stutter_prob:
                    # Repeat once or twice
                    repeats = rng.randint(1, 2)
                    for _ in range(repeats):
                        new_words.append(w)
            transformed = " ".join(new_words)
            
        return transformed
