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
                
                "sharpness": ("FLOAT", {
                    "default": 0.3, "min": 0.0, "max": 1.0, "step": 0.05,
                    "tooltip": "Post-restoration sharpening intensity. 0.0 = None, 1.0 = Max. Use carefully."
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
    
    def execute(self, image: torch.Tensor, press_level: str, press_cycles: int, restore_finish: bool, sharpness: float, upscale_model=None):
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
        
        # Initialize Progress Bar
        total_steps = press_cycles
        pbar = comfy.utils.ProgressBar(total_steps)
        
        for i in range(press_cycles):
            _log(f"Cycle {i+1}/{press_cycles}: Compressing...")
            
            # --- STEP 1: The Squish (Downscale) ---
            target_h = int(result.shape[1] * factor)
            target_w = int(result.shape[2] * factor)
            
            permuted = result.permute(0, 3, 1, 2)
            downscaled = F.interpolate(permuted, size=(target_h, target_w), mode="area")
            compressed_image = downscaled.permute(0, 2, 3, 1)
            
            # --- STEP 2: The Re-Inflation (Upscale) ---
            if i < press_cycles - 1 or restore_finish:
                _log(f"Cycle {i+1}: Re-inflating...")
                
                if upscale_model is not None:
                    # AI Upscale Logic
                    device = comfy.model_management.get_torch_device()
                    upscale_model.to(device)
                    
                    try:
                        upscaled_image = upscale_model.upscale(compressed_image)
                    except Exception as e:
                        _log(f"AI Upscale failed: {e}. Fallback to Bicubic.", level="ERROR")
                        upscale_model = None # Disable for this run
                        upscaled_image = self._bicubic_restore(compressed_image, original_width, original_height)

                    # Resize to target original
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
            
            # Update Progress
            pbar.update(1)
                
        # --- STEP 3: The Sharpening Pass (Unsharp Mask) ---
        if restore_finish and sharpness > 0.0:
            _log(f"Applying Unsharp Mask (Strength: {sharpness})...")
            result = self._apply_sharpening(result, sharpness)
                
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

    def _apply_sharpening(self, image, strength):
        """
        Simple unsharp mask implementation using heavy gaussian blur subtraction.
        """
        # (B, H, W, C) -> (B, C, H, W)
        img_perm = image.permute(0, 3, 1, 2)
        
        # Blur it (Gaussian Kernel approximation)
        # Standard unsharp mask: Original + (Original - Blurred) * Amount
        
        # Create a simple blur via avg pool or manual key
        # Using a small kernel for fine detail sharpening
        blurred = self._gaussian_blur(img_perm, kernel_size=5, sigma=1.0)
        
        # Detail = Original - Blurred
        detail = img_perm - blurred
        
        # Sharpened = Original + Detail * Strength
        sharpened = img_perm + (detail * strength)
        
        # Clamp
        sharpened = torch.clamp(sharpened, 0, 1)
        
        return sharpened.permute(0, 2, 3, 1)

    def _gaussian_blur(self, x, kernel_size=5, sigma=1.0):
        # Create 1D Gaussian kernel
        k = torch.tensor([np.exp(-0.5 * (i - kernel_size // 2)**2 / sigma**2) for i in range(kernel_size)], dtype=torch.float32)
        k /= k.sum()
        k = k.to(x.device)
        
        # Separateable 2D conv: 1xK then Kx1
        k_x = k.view(1, 1, 1, kernel_size).repeat(x.shape[1], 1, 1, 1)
        k_y = k.view(1, 1, kernel_size, 1).repeat(x.shape[1], 1, 1, 1)
        
        padding = kernel_size // 2
        
        # Apply X
        x_blurred = F.conv2d(x, k_x, padding=(0, padding), groups=x.shape[1])
        # Apply Y
        x_blurred = F.conv2d(x_blurred, k_y, padding=(padding, 0), groups=x.shape[1])
        
        return x_blurred
