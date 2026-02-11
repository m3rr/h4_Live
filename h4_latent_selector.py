import torch
import nodes
import comfy.utils
import comfy.model_management

class H4_LatentSelector:
    """
    Select legitimate latent sizes for various models (SD1.5, SDXL, Flux, Wan, etc.).
    """
    
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "base_model": (["SD1.5", "SDXL", "Flux", "Wan/Z-Image", "Start From Custom"], {"default": "SDXL"}),
                "aspect_ratio": ([
                    "1:1 (Square)", 
                    "16:9 (Cinema Landscape)", "9:16 (Story Portrait)", 
                    "4:3 (Photo Landscape)", "3:4 (Photo Portrait)", 
                    "3:2 (Classic Landscape)", "2:3 (Classic Portrait)", 
                    "21:9 (Ultrawide)", "9:21 (Ultrawide Portrait)", 
                    "1:2 (Tall)", "2:1 (Wide)",
                    "Custom Dimensions"
                ], {"default": "1:1 (Square)"}),
                "batch_size": ("INT", {"default": 1, "min": 1, "max": 64}),
                
                # Custom Inputs (Enabled only when 'Custom' is selected in frontend)
                "custom_width": ("INT", {"default": 1024, "min": 64, "max": 16384, "step": 8}),
                "custom_height": ("INT", {"default": 1024, "min": 64, "max": 16384, "step": 8}),
            },
        }

    RETURN_TYPES = ("LATENT", "INT", "INT")
    RETURN_NAMES = ("LATENT", "WIDTH", "HEIGHT")
    FUNCTION = "generate"
    CATEGORY = "h4_ToolKit/Latents"

    def generate(self, base_model, aspect_ratio, batch_size, custom_width, custom_height):
        
        width = custom_width
        height = custom_height
        
        # --- 1. Resolution Logic (If not Custom) ---
        if base_model != "Start From Custom" and aspect_ratio != "Custom Dimensions":
            # Define Base Pixels
            # SD1.5: 512x512 = 262,144
            # SDXL: 1024x1024 = 1,048,576
            # Flux: 1024x1024 = 1,048,576 (Flexible)
            # Wan: 720p/1080p? Let's use 1280x720 baseline (921,600) or 1024x1024
            
            target_area = 1048576 # Default SDXL
            
            if base_model == "SD1.5":
                target_area = 262144 # 512*512
            elif base_model == "Wan/Z-Image":
                # Wan T2V often 1280x720. Let's target 1280x720 area = 921600
                target_area = 1280 * 720 
            
            # Aspect Ratio Multipliers
            ratio_val = 1.0
            if "16:9" in aspect_ratio: ratio_val = 16/9
            elif "9:16" in aspect_ratio: ratio_val = 9/16
            elif "4:3" in aspect_ratio: ratio_val = 4/3
            elif "3:4" in aspect_ratio: ratio_val = 3/4
            elif "3:2" in aspect_ratio: ratio_val = 3/2
            elif "2:3" in aspect_ratio: ratio_val = 2/3
            elif "21:9" in aspect_ratio: ratio_val = 21/9
            elif "9:21" in aspect_ratio: ratio_val = 9/21
            elif "1:2" in aspect_ratio: ratio_val = 0.5
            elif "2:1" in aspect_ratio: ratio_val = 2.0
            
            import math
            # W = sqrt(Area * Ratio)
            w = math.sqrt(target_area * ratio_val)
            h = target_area / w
            
            # Snap to 16 to be safe for all models (SDXL prefers 8, but 16 is safer for video/Wan)
            width = round(w / 16) * 16
            height = round(h / 16) * 16
            
        # --- 2. Create Empty Latent ---
        # Format: [batch, 4, h/8, w/8]
        # Note: Latents are essentially encoded images division by 8.
        latent = torch.zeros([batch_size, 4, height // 8, width // 8], device=comfy.model_management.intermediate_device())
            
        return ({"samples": latent}, width, height)


