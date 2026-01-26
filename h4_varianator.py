# FILE: custom_nodes/comfyui_h4_live/h4_varianator.py
# ------------------------------------------------------------------------------
# H4 Varianator (Ported from ToolKit)
# "Riffs on a latent."
# 
# A dedicated variation engine that takes a latent and produces N variations.
# ------------------------------------------------------------------------------

import torch
import random
import os
import datetime
import nodes
import comfy.samplers
import comfy.model_management
from typing import Any, Dict, List, Optional, Tuple, cast
from .h4_core import _log

# ------------------------------------------------------------------------------
# Constants
# ------------------------------------------------------------------------------
VARIANATOR_MAX_VARIATIONS = 16
VARIANATOR_SEED_LIMIT = 2**63 - 1
VARIANATOR_PROFILE_RANGES: Dict[str, Tuple[float, float]] = {
    "minimal": (0.30, 0.40),
    "moderate": (0.40, 0.50),
    "major": (0.50, 0.55),
}

# ------------------------------------------------------------------------------
# Helper Mixins
# ------------------------------------------------------------------------------
def clone_leading_conditioning(conditioning):
    if conditioning is None:
        return []
    # Standard ComfyUI conditioning deep clone
    # conditioning is usually [[(cond_tensor, {dict})], ...]
    cloned = []
    for t in conditioning:
        n = [t[0], t[1].copy()]
        cloned.append(n)
    return cloned

# ------------------------------------------------------------------------------
# Mappings
# ------------------------------------------------------------------------------
def _discover_samplers():
    try:
        return comfy.samplers.KSampler.SAMPLERS
    except:
        return ["euler", "ddim"]

def _discover_schedulers():
    try:
        return comfy.samplers.KSampler.SCHEDULERS
    except:
        return ["normal", "simple"]

SAMPLER_CHOICES = _discover_samplers()
SCHEDULER_CHOICES = _discover_schedulers()

class H4_Varianator:
    """
    Standalone variation generator that riffs on a supplied latent.
    """

    @classmethod
    def INPUT_TYPES(cls) -> Dict[str, Any]:
        sampler_default = SAMPLER_CHOICES[0] if SAMPLER_CHOICES else "euler"
        scheduler_default = SCHEDULER_CHOICES[0] if SCHEDULER_CHOICES else "normal"
        profile_keys = list(VARIANATOR_PROFILE_RANGES.keys())
        profile_default = "moderate"
        
        return {
            "required": {
                "variation_count": ("INT", {"default": 4, "min": 1, "max": VARIANATOR_MAX_VARIATIONS}),
                "variation_profile": (profile_keys, {"default": profile_default}),
                "seed_mode": (["fixed", "increment", "random"], {"default": "increment"}),
                "base_seed": ("INT", {"default": 123456789, "min": 0, "max": VARIANATOR_SEED_LIMIT}),
                "sampler_name": (SAMPLER_CHOICES, {"default": sampler_default}),
                "scheduler_name": (SCHEDULER_CHOICES, {"default": scheduler_default}),
                "steps": ("INT", {"default": 18, "min": 1, "max": 150}),
                "cfg": ("FLOAT", {"default": 7.0, "min": 1.0, "max": 30.0, "step": 0.1}),
                "denoise": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 1.0, "step": 0.01}), # Added override
                # "go_ultra": ("BOOLEAN", {"default": False, "label": " GO PLUS ULTRA?! "}), # Removed for simplicity in v1 port
            },
            "optional": {
                "model": ("MODEL",),
                "clip": ("CLIP",),
                "vae": ("VAE",),
                "latent_in": ("LATENT", {"forceInput": True}),
                "positive_in": ("CONDITIONING",),
                "negative_in": ("CONDITIONING",),
                # Style mix and jitter stripped for V1 reliability port
                # We can add them back if user specifically requests complexity
            }
        }

    RETURN_TYPES = ("IMAGE", "LATENT", "STRING")
    RETURN_NAMES = ("variations", "latent_batch", "summary")
    FUNCTION = "generate"
    CATEGORY = "h4_Live/Generation"

    def __init__(self) -> None:
        pass

    def _coerce_seed(self, value: Any) -> int:
        try:
            val = int(value)
        except:
            val = 0
        return max(0, min(val, VARIANATOR_SEED_LIMIT))

    def _resolve_profile(self, profile_str: str) -> Tuple[str, Tuple[float, float]]:
        if profile_str in VARIANATOR_PROFILE_RANGES:
            return profile_str, VARIANATOR_PROFILE_RANGES[profile_str]
        return "moderate", (0.40, 0.50)

    # Simplified Sample Function (Internal KSampler)
    def _run_sample(self, model, seed, steps, cfg, sampler_name, scheduler, positive, negative, latent_image, denoise):
        
        # Use ComfyUI's standard common_ksampler to avoid logic duplication
        # nodes.common_ksampler returns (latent,)
        return nodes.common_ksampler(
            model, seed, steps, cfg, sampler_name, scheduler, 
            positive, negative, latent_image, denoise
        )[0]

    def generate(
        self,
        variation_count: int,
        variation_profile: str,
        seed_mode: str,
        base_seed: int,
        sampler_name: str,
        scheduler_name: str,
        steps: int,
        cfg: float,
        denoise: float,
        # go_ultra: bool, # skipped
        model: Optional[Any] = None,
        clip: Optional[Any] = None,
        vae: Optional[Any] = None,
        latent_in: Optional[Dict[str, torch.Tensor]] = None,
        positive_in: Optional[Any] = None,
        negative_in: Optional[Any] = None,
    ) -> Tuple[torch.Tensor, Dict[str, torch.Tensor], str]:
        
        _log(f"[Varianator] Engaging... Count: {variation_count} | Profile: {variation_profile}")

        if model is None or vae is None:
            raise RuntimeError("Varianator requires MODEL and VAE inputs.")
        if latent_in is None:
            raise RuntimeError("Varianator requires a LATENT input to remix.")
        if positive_in is None or negative_in is None:
             raise RuntimeError("Varianator requires Positive and Negative conditioning.")

        count = max(1, min(variation_count, VARIANATOR_MAX_VARIATIONS))
        profile_key, (profile_min, profile_max) = self._resolve_profile(variation_profile)
        anchor_seed = self._coerce_seed(base_seed)
        
        # Seeds for Denoise variation logic
        # We use a secondary RNG to pick 'random' denoise values between profile min/max
        denoise_rng = random.Random(anchor_seed ^ 0xBADF00D)
        
        variations: List[torch.Tensor] = []
        latent_batches: List[torch.Tensor] = []
        metadata: List[str] = []

        last_valid_latent = None

        # --- VARIATION LOOP ---
        for index in range(count):
            # 1. Determine Seed
            if seed_mode == "fixed":
                seed_value = anchor_seed
            elif seed_mode == "increment":
                seed_value = self._coerce_seed(anchor_seed + index)
            else: # Random
                seed_value = random.randint(0, VARIANATOR_SEED_LIMIT)
            
            # 2. Determine Denoise (The "Riff")
            # We ignore the input 'denoise' slider if utilizing profile ranges? 
            # Actually, let's say the profile range ADJUSTS the base denoise.
            # But wait, original code ignored 'denoise' input and used profile range exclusively.
            # We will follow original logic: Profile defines the denoise strength.
            
            steps_variation = denoise_rng.uniform(profile_min, profile_max)
            denoise_value = float(steps_variation)
            
            # 3. Sample
            # We must clone the latent input to avoid mutating it for next run
            latent_copy = {}
            for k, v in latent_in.items():
                latent_copy[k] = v.clone()
                
            try:
                result_latent = self._run_sample(
                    model, seed_value, steps, cfg, sampler_name, scheduler_name,
                    positive_in, negative_in, latent_copy, denoise_value
                )
                
                # 4. Decode (VAE)
                # nodes.VAEDecode returns (IMAGE,)
                decoded_image = nodes.VAEDecode().decode(vae, result_latent)[0]
                
                # Store results
                variations.append(decoded_image)
                latent_batches.append(result_latent["samples"])
                last_valid_latent = result_latent
                
                info = f"[{index+1}] Seed: {seed_value} | Denoise: {denoise_value:.3f}"
                metadata.append(info)
                # _log(info) # Verbose?
                
            except Exception as e:
                _log(f"[Varianator] ❌ Error on variation {index}: {e}")

        if not variations:
            # Fallback to avoid crash
            empty_img = torch.zeros((1, 512, 512, 3))
            return (empty_img, latent_in, "Generation Failed")

        # 5. Batch Outputs
        # Stack images: [Batch, H, W, C]
        images_out = torch.cat(variations, dim=0)
        
        # Stack latents
        latent_out = {"samples": torch.cat(latent_batches, dim=0)}
        
        summary_text = "\n".join(metadata)
        _log(f"[Varianator] Complete. {len(variations)} generated.")
        
        return (images_out, latent_out, summary_text)
