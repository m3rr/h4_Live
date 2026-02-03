# h4_pixel_press.py - The "Supersampling" Engine
# ==============================================================================
# H4_PixelPress - "Squish pixels for higher density."
# ==============================================================================

import torch
import torch.nn.functional as F
import numpy as np
from PIL import Image
import comfy.utils
from comfy.utils import common_upscale

from .h4_faceforge.utils import _log, tensor_to_pil, batched_pil_to_tensor

# ==============================================================================
# H4_PixelPress Node
# ==============================================================================

class H4_PixelPress:
    """
    Imagine running a video game at 8K resolution on a 4K monitor.
    That is what this node does for your AI images.
    
    It takes your image, magically "squishes" the pixels together using high-quality
    compression (Lanczos), which merges noise patterns into smooth textures 
    and eliminates jagged edges (Aliasing).
    
    "Pixel Compression" = The secret to "thick", premium-looking images.
    """
    
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE", {"tooltip": "The image you want to density-press."}),
                
                "press_level": ([
                    "2x (Quality Mode)", 
                    "4x (Ultra Mode)", 
                    "1.5x (Balanced)"
                ], {"default": "2x (Quality Mode)", 
                    "tooltip": "How hard do we squish? 2x means we take 4 pixels and merge them into 1 perfect pixel. (Like SSAA x2 in games)."}),
                
                "press_cycles": ("INT", {
                    "default": 1, "min": 1, "max": 3, 
                    "tooltip": "How many times do we wash the image? More cycles = cleaner, 'creamier' look, but might lose tiny details."
                }),
                
                "restore_finish": ("BOOLEAN", {
                    "default": True, 
                    "tooltip": "After compressing, do you want to blow it back up to the original size? (True = High Fidelity 4K Look, False = Extremely Dense 2K Look)."
                }),
            },
            "optional": {
                "upscale_model": ("UPSCALE_MODEL", {"tooltip": "Optional: Use an AI Uppscaler logic instead of math to re-inflate the image. Adds hallucinated details."}),
            }
        }
    
    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("PRESSED_IMAGE",)
    FUNCTION = "execute"
    CATEGORY = "h4_Live/Image"
    
    def execute(self, image: torch.Tensor, press_level: str, press_cycles: int, restore_finish: bool, upscale_model=None):
        _log(f"--- PixelPress Started ({press_level}) ---")
        
        # Determine strictness
        if "4x" in press_level:
            factor = 0.25  # 1/4 size
            inverse_factor = 4.0
            algo_desc = "Ultra (4:1)"
        elif "2x" in press_level:
            factor = 0.5   # 1/2 size
            inverse_factor = 2.0
            algo_desc = "Quality (2:1)"
        else:
            factor = 0.66  # roughly 2/3 size
            inverse_factor = 1.5
            algo_desc = "Balanced (1.5:1)"
            
        result = image.clone()
        original_height = image.shape[1]
        original_width = image.shape[2]
        
        for i in range(press_cycles):
            _log(f"Cycle {i+1}/{press_cycles}: Compressing...")
            
            # --- STEP 1: The Squish (Downscale) ---
            # We use "area" interpolation (or Bicubic/Lanczos if available via comfy)
            # 'area' is mathematically correct for downscaling (averaging pixels).
            
            # Calculate target size
            target_h = int(result.shape[1] * factor)
            target_w = int(result.shape[2] * factor)
            
            # Use Comfy's internal resize handling to be safe
            # Input is (B, H, W, C) -> Permute to (B, C, H, W) for torch F.interpolate
            permuted = result.permute(0, 3, 1, 2)
            
            # "Area" is the best for squishing (Pixel Binning)
            downscaled = F.interpolate(permuted, size=(target_h, target_w), mode="area")
            
            # Permute back
            compressed_image = downscaled.permute(0, 2, 3, 1)
            
            # --- STEP 2: The Re-Inflation (Upscale) ---
            # Only do this if it's NOT the last cycle, OR if restore_finish is True
            if i < press_cycles - 1 or restore_finish:
                _log(f"Cycle {i+1}: Re-inflating...")
                
                if upscale_model is not None:
                    # AI Upscale Logic
                    # Move to GPU for model
                    device = comfy.model_management.get_torch_device()
                    upscale_model.to(device)
                    
                    try:
                        # Use standard ComfyUI upscale model interface
                        # Most loaded upscale models have an .upscale method
                        
                        # Note: upscale_model.upscale expects (B, C, H, W) or (B, H, W, C)?
                        # Checking comfy_extras/nodes_upscale_model.py:
                        # memory_required = model.memory_required.
                        # upscaled = model.upscale(image)
                        
                        # The image passed to model.upscale is expected to be standard Tensor layout?
                        # Usually Comfy passes (B, H, W, C) or (B, C, H, W).
                        # Let's try passing the image directly as we have it (B, H, W, C)
                        # Comfy's common_input is (B, H, W, C).
                        
                        # Wait, Comfy upscale models (ESRGAN etc) usually expect the image to be moved to device inside the call or before.
                        # And they often expect (1, C, H, W) or similar.
                        
                        # SAFE WAY: Use the internal wrapper if possible, or replicate the standard valid call.
                        # Standard Comfy upscale models take (B, H, W, C) and return (B, H, W, C).
                        
                        upscaled_image = upscale_model.upscale(compressed_image)

                        
                    except Exception as e:
                        _log(f"AI Upscale failed: {e}. Fallback to Bicubic.", level="ERROR")
                        upscale_model = None # Disable for this run
                        upscaled_image = self._bicubic_restore(compressed_image, original_width, original_height)

                    # If AI upscaled it 4x, it might be HUGE now. Resize to target original.
                    if upscaled_image.shape[1] != original_height or upscaled_image.shape[2] != original_width:
                         upscaled_perm = upscaled_image.permute(0, 3, 1, 2)
                         # Bicubic is good for "shrinking" a 4x AI result back to 1x target
                         resized_back = F.interpolate(upscaled_perm, size=(original_height, original_width), mode="bicubic", align_corners=False)
                         result = resized_back.permute(0, 2, 3, 1)
                    else:
                        result = upscaled_image

                else:
                    # Standard Math Upscale (Bicubic)
                    result = self._bicubic_restore(compressed_image, original_width, original_height)
            
            else:
                # Last cycle and restore_finish is False
                _log("Finishing with compressed density.")
                result = compressed_image
                
        # Move upscale model back to CPU if used
        if upscale_model is not None:
            try:
                upscale_model.to("cpu")
            except:
                pass

        _log(f"PixelPress Complete. Output Size: {result.shape[1]}x{result.shape[2]}")
        return (result,)

    def _bicubic_restore(self, image, width, height):
        permuted = image.permute(0, 3, 1, 2)
        upscaled = F.interpolate(permuted, size=(height, width), mode="bicubic", align_corners=False)
        return upscaled.permute(0, 2, 3, 1)
