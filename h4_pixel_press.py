import torch
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageCms, ImageOps
import comfy.utils
import folder_paths

# --- HDR HELPER FUNCTIONS (Ported from SuperBeasts) ---

def adjust_shadows_non_linear(luminance, shadow_intensity, max_shadow_adjustment=1.5):
    lum_array = np.array(luminance, dtype=np.float32) / 255.0
    shadows = lum_array ** (1 / (1 + shadow_intensity * max_shadow_adjustment))
    return np.clip(shadows * 255, 0, 255).astype(np.uint8)

def adjust_highlights_non_linear(luminance, highlight_intensity, max_highlight_adjustment=1.5):
    lum_array = np.array(luminance, dtype=np.float32) / 255.0
    highlights = 1 - (1 - lum_array) ** (1 + highlight_intensity * max_highlight_adjustment)
    return np.clip(highlights * 255, 0, 255).astype(np.uint8)

def apply_gamma_correction(lum_array, gamma):
    if gamma == 0: return np.clip(lum_array, 0, 255).astype(np.uint8)
    gamma_corrected = 1 / (1.1 - gamma)
    adjusted = 255 * ((lum_array / 255) ** gamma_corrected)
    return np.clip(adjusted, 0, 255).astype(np.uint8)

def merge_adjustments_with_blend_modes(luminance, shadows, highlights, hdr_intensity, shadow_intensity, highlight_intensity):
    base = np.array(luminance, dtype=np.float32)
    
    scaled_shadow_intensity = shadow_intensity ** 2 * hdr_intensity
    scaled_highlight_intensity = highlight_intensity ** 2 * hdr_intensity
    
    shadow_mask = np.clip((1 - (base / 255)) ** 2, 0, 1)
    highlight_mask = np.clip((base / 255) ** 2, 0, 1)
    
    adjusted_shadows = np.clip(base * (1 - shadow_mask * scaled_shadow_intensity), 0, 255)
    adjusted_highlights = np.clip(base + (255 - base) * highlight_mask * scaled_highlight_intensity, 0, 255)
    
    adjusted_luminance = np.clip(adjusted_shadows + adjusted_highlights - base, 0, 255)
    final_luminance = np.clip(base * (1 - hdr_intensity) + adjusted_luminance * hdr_intensity, 0, 255).astype(np.uint8)
    return Image.fromarray(final_luminance)

# --- MAIN NODE ---

class H4_PixelPress:
    """
    True Supersampling Node (SSAA).
    Upscales -> Enhances (HDR/Sharpen) -> Downscales (Lanczos).
    """
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE",),
                "supersample_scale": (["2x", "3x", "4x"], {"default": "2x"}),
                "sharpness": ("FLOAT", {"default": 0.3, "min": 0.0, "max": 2.0, "step": 0.1}),
                "enable_hdr": ("BOOLEAN", {"default": False}),
                # HDR Settings (Hidden unless enable_hdr is True via JS)
                "hdr_intensity": ("FLOAT", {"default": 0.5, "min": 0.0, "max": 5.0, "step": 0.1}),
                "shadow_intensity": ("FLOAT", {"default": 0.25, "min": 0.0, "max": 1.0, "step": 0.05}),
                "highlight_intensity": ("FLOAT", {"default": 0.75, "min": 0.0, "max": 1.0, "step": 0.05}),
                "gamma_intensity": ("FLOAT", {"default": 0.0, "min": 0.0, "max": 1.0, "step": 0.05}),
                "contrast": ("FLOAT", {"default": 0.1, "min": 0.0, "max": 1.0, "step": 0.05}),
                "enhance_color": ("FLOAT", {"default": 0.25, "min": 0.0, "max": 1.0, "step": 0.05}),
            },
            "optional": {
                "upscale_model": ("UPSCALE_MODEL",),
            }
        }

    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("pressed_image",)
    FUNCTION = "execute"
    CATEGORY = "h4_Live/Image"

    def execute(self, image, supersample_scale, sharpness, enable_hdr, hdr_intensity, shadow_intensity, highlight_intensity, gamma_intensity, contrast, enhance_color, upscale_model=None):
        
        # Parse Scale
        scale_map = {"2x": 2, "3x": 3, "4x": 4}
        scale = scale_map.get(supersample_scale, 2)
        
        results = []
        batch_size = image.shape[0]
        
        # Profiles for HDR
        sRGB_profile = ImageCms.createProfile("sRGB")
        Lab_profile = ImageCms.createProfile("LAB")

        for i in range(batch_size):
            # 1. Convert to PIL
            img_tensor = image[i]
            img_np = (img_tensor.cpu().numpy() * 255).astype(np.uint8)
            pil_img = Image.fromarray(img_np)
            
            orig_w, orig_h = pil_img.size
            
            # 2. Upscale (Phase 1)
            if upscale_model:
                # Use Model
                # Need to permute to [1, C, H, W] for model
                # image[i] is [H, W, C]
                input_tensor = img_tensor.permute(2, 0, 1).unsqueeze(0)
                device = comfy.model_management.get_torch_device()
                upscale_model.to(device)
                
                try:
                    # Model expects [B, C, H, W]
                    upscaled_tensor = upscale_model(input_tensor.to(device))
                    # Result is [B, C, H, W] -> [H, W, C] (squeeze batch)
                    u_tensor = upscaled_tensor.squeeze(0).permute(1, 2, 0).cpu()
                    
                    # Convert result back to PIL
                    u_np = (u_tensor.numpy() * 255).astype(np.uint8)
                    upscaled_img = Image.fromarray(u_np)
                except Exception as e:
                    print(f"Model Upscale Failed: {e}")
                    upscaled_img = pil_img.resize((orig_w * scale, orig_h * scale), Image.Resampling.LANCZOS)
                    
                upscale_model.to("cpu")
            else:
                # Lanczos Upsale
                upscaled_img = pil_img.resize((orig_w * scale, orig_h * scale), Image.Resampling.LANCZOS)
            
            # 3. HDR Pass (Phase 2)
            current_img = upscaled_img
            if enable_hdr:
                # RGB -> LAB
                try:
                    img_lab = ImageCms.profileToProfile(current_img, sRGB_profile, Lab_profile, outputMode='LAB')
                    luminance, a, b = img_lab.split()
                    
                    lum_array = np.array(luminance, dtype=np.float32)
                    
                    # Adjust
                    shad_adj = adjust_shadows_non_linear(luminance, shadow_intensity)
                    high_adj = adjust_highlights_non_linear(luminance, highlight_intensity)
                    
                    merged = merge_adjustments_with_blend_modes(lum_array, shad_adj, high_adj, hdr_intensity, shadow_intensity, highlight_intensity)
                    
                    gamma_corr = apply_gamma_correction(np.array(merged), gamma_intensity)
                    gamma_corr = Image.fromarray(gamma_corr).resize(a.size)
                    
                    adj_lab = Image.merge('LAB', (gamma_corr, a, b))
                    current_img = ImageCms.profileToProfile(adj_lab, Lab_profile, sRGB_profile, outputMode='RGB')
                    
                    # Contrast
                    enhancer = ImageEnhance.Contrast(current_img)
                    current_img = enhancer.enhance(1 + contrast)
                    
                    # Color
                    enhancer = ImageEnhance.Color(current_img)
                    current_img = enhancer.enhance(1 + enhance_color * 0.2)
                    
                except Exception as e:
                    print(f"HDR Failed: {e}")
            
            # 4. Sharpen (Phase 3)
            # Unsharp Mask at high res
            if sharpness > 0:
                # Radius depends on scale?
                radius = scale # larger radius for larger image
                percent = int(sharpness * 100) # UnsharpMask takes percent?
                # PIL UnsharpMask: radius, percent, threshold
                # Default percent is usually 150.
                # Sharpness input 0.5 -> 50%? Or 1.0 -> 100%?
                # Let's say max 2.0 -> 200%.
                
                # Using ImageFilter.UnsharpMask
                current_img = current_img.filter(ImageFilter.UnsharpMask(radius=radius, percent=percent, threshold=3))
            
            # 5. Downscale (Phase 4 - THe Press)
            # Lanczos to original size
            final_img = current_img.resize((orig_w, orig_h), Image.Resampling.LANCZOS)
            
            # Convert to Tensor
            final_np = np.array(final_img).astype(np.float32) / 255.0
            results.append(torch.from_numpy(final_np))
            
        return (torch.stack(results),)
