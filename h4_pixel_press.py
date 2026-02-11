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
                "tiled_processing": ("BOOLEAN", {"default": True}),
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
    
    # --- TILING HELPERS ---
    def process_tile(self, tile_img, sRGB_profile, Lab_profile, hdr_params):
        """Applies HDR logic to a single PIL Image Tile"""
        try:
            # Unwrap params
            (hdr_intensity, shadow_intensity, highlight_intensity, gamma_intensity, contrast, enhance_color) = hdr_params

            # RGB -> LAB
            img_lab = ImageCms.profileToProfile(tile_img, sRGB_profile, Lab_profile, outputMode='LAB')
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
            
            return current_img
            
        except Exception as e:
            print(f"!!! H4_PixelPress HDR Failed: {e}")
            import traceback
            traceback.print_exc()
            return tile_img

    def execute(self, image, supersample_scale, sharpness, enable_hdr, tiled_processing, hdr_intensity, shadow_intensity, highlight_intensity, gamma_intensity, contrast, enhance_color, upscale_model=None):
        
        # Parse Scale
        scale_map = {"2x": 2, "3x": 3, "4x": 4}
        scale = scale_map.get(supersample_scale, 2)
        
        results = []
        batch_size = image.shape[0]
        
        # Profiles for HDR
        sRGB_profile = ImageCms.createProfile("sRGB")
        Lab_profile = ImageCms.createProfile("LAB")
        
        hdr_params = (hdr_intensity, shadow_intensity, highlight_intensity, gamma_intensity, contrast, enhance_color)

        for i in range(batch_size):
            # 1. Convert to PIL
            img_tensor = image[i]
            img_np = (img_tensor.cpu().numpy() * 255).astype(np.uint8)
            pil_img = Image.fromarray(img_np).convert("RGB")
            
            if i == 0 and enable_hdr:
                print(f"[H4_PixelPress] Processing Batch {i+1}/{batch_size} with HDR Enabled. Tiled: {tiled_processing}")
            
            orig_w, orig_h = pil_img.size
            target_w, target_h = orig_w * scale, orig_h * scale
            
            # 2. Upscale (Phase 1)
            # Upscaling is usually fast enough on GPU, but if we use a model we might OOM.
            # For now, let's assume Model Upscale handles itself or is tiled internally by Comfy/Model.
            # If not, we might need tiling there too. But user complained about HDR step OOM.
            
            if upscale_model:
                # Use Model
                input_tensor = img_tensor.permute(2, 0, 1).unsqueeze(0)
                device = comfy.model_management.get_torch_device()
                upscale_model.to(device)
                try:
                    upscaled_tensor = upscale_model(input_tensor.to(device))
                    u_tensor = upscaled_tensor.squeeze(0).permute(1, 2, 0).cpu()
                    u_np = (u_tensor.numpy() * 255).astype(np.uint8)
                    upscaled_img = Image.fromarray(u_np)
                except Exception as e:
                    print(f"Model Upscale Failed/OOM, falling back to Lanczos: {e}")
                    upscaled_img = pil_img.resize((target_w, target_h), Image.Resampling.LANCZOS)
                upscale_model.to("cpu")
            else:
                upscaled_img = pil_img.resize((target_w, target_h), Image.Resampling.LANCZOS)
            
            # 3. HDR Pass (Phase 2)
            current_img = upscaled_img
            
            if enable_hdr:
                if tiled_processing:
                    # --- TILED MODE ---
                    tile_size = 512
                    overlap = 64
                    
                    iw, ih = current_img.size
                    
                    # Create canvas
                    new_img = Image.new("RGB", (iw, ih))
                    
                    # Loop tiles
                    for y in range(0, ih, tile_size):
                         for x in range(0, iw, tile_size):
                             # Define box with overlap
                             box_x = max(0, x - overlap)
                             box_y = max(0, y - overlap)
                             box_w = min(iw, x + tile_size + overlap)
                             box_h = min(ih, y + tile_size + overlap)
                             
                             box = (box_x, box_y, box_w, box_h)
                             tile = current_img.crop(box)
                             
                             # Process Tile
                             processed_tile = self.process_tile(tile, sRGB_profile, Lab_profile, hdr_params)
                             
                             # Calculate paste position excluding blend overlap to keep it simple?
                             # Or just paste valid center region.
                             # Simple 2-pass: extract center valid region.
                             
                             # Valid Region logic:
                             # The 'valid' part of this tile relative to itself
                             valid_x = overlap if x > 0 else 0
                             valid_y = overlap if y > 0 else 0
                             valid_w = (box_w - box_x) - (overlap if box_w < iw else 0)
                             valid_h = (box_h - box_y) - (overlap if box_h < ih else 0)
                             
                             # Crop valid center from processed tile
                             # Wait, simple overlap paste works better if we feather, but verify complexity.
                             # Simplest functional approach: Cut cleanly.
                             # If we cut cleanly, we might see seams due to HDR local contrast.
                             # But 64px padding usually absorbs the boundary effects of operations like UnsharpMask/Contrast.
                             
                             # Let's try simple crop-paste of valid center.
                             center_tile = processed_tile.crop((valid_x, valid_y, valid_w, valid_h))
                             
                             # Paste into main image
                             # Target coords
                             paste_x = box_x + valid_x
                             paste_y = box_y + valid_y
                             
                             new_img.paste(center_tile, (paste_x, paste_y))
                             
                             # GC
                             del tile, processed_tile, center_tile
                    
                    current_img = new_img
                    # Aggressive GC
                    import gc
                    gc.collect()
                    
                else:
                    # --- FULL FRAME MODE ---
                    current_img = self.process_tile(current_img, sRGB_profile, Lab_profile, hdr_params)
            
            # 4. Sharpen (Phase 3)
            if sharpness > 0:
                radius = scale 
                percent = int(sharpness * 100) 
                current_img = current_img.filter(ImageFilter.UnsharpMask(radius=radius, percent=percent, threshold=3))
            
            # 5. Downscale (Phase 4)
            final_img = current_img.resize((orig_w, orig_h), Image.Resampling.LANCZOS)
            
            final_np = np.array(final_img).astype(np.float32) / 255.0
            results.append(torch.from_numpy(final_np))
            
            # Cleanup per batch
            del current_img, upscaled_img, final_img, final_np
            import gc
            gc.collect()
            
        return (torch.stack(results),)
