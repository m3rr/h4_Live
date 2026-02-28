import torch
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageCms, ImageOps
import comfy.utils
import folder_paths
import gc

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
                "tile_size": ("INT", {"default": 512, "min": 256, "max": 2048, "step": 64, "tooltip": "Tile size for HDR processing. Lower if OOM."}),
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

    def _tiled_upscale(self, img_tensor, model, scale, tile_size, overlap):
        """
        Upscales an image tensor using a model in tiles to save VRAM.
        img_tensor: (H, W, C) [Standard Comfy format is B,H,W,C but here we process single image H,W,C from loop]
        Wait, loop passes `img_tensor = image[i]`. Shape is (H,W,C).
        """
        h, w, c = img_tensor.shape
        
        # Output canvas
        target_h, target_w = h * scale, w * scale
        output = np.zeros((target_h, target_w, c), dtype=np.uint8)
        
        device = comfy.model_management.get_torch_device()
        model.to(device)
        
        try:
             # Iterate tiles
            for y in range(0, h, tile_size):
                for x in range(0, w, tile_size):
                    # Input Box (with overlap)
                    box_x = max(0, x - overlap)
                    box_y = max(0, y - overlap)
                    box_w = min(w, x + tile_size + overlap)
                    box_h = min(h, y + tile_size + overlap)
                    
                    # Extract Input Tile
                    # img_tensor is (H,W,C)
                    # slice: [y:y+h, x:x+w, :]
                    tile_input = img_tensor[box_y:box_h, box_x:box_w, :]
                    
                    # Prepare for Model: (1, C, H, W)
                    tile_input = tile_input.permute(2, 0, 1).unsqueeze(0)
                    
                    # Run Model
                    with torch.no_grad():
                        tile_output = model(tile_input.to(device))
                        
                    # Process Output
                    # Shape: (1, C, H*scale, W*scale)
                    tile_output = tile_output.squeeze(0).permute(1, 2, 0).cpu().numpy()
                    
                    # Output is 0-1 float usually from model execution in Comfy? 
                    # Comfy upscale models return matching input range.
                    # My input was from `valid tensor` (0-1).
                    # So output is 0-1.
                    tile_output = np.clip(tile_output * 255, 0, 255).astype(np.uint8)
                    
                    # Calculate Valid Region (removing overlap) in Output Space
                    # Valid region in Input Space
                    valid_x = overlap if x > 0 else 0
                    valid_y = overlap if y > 0 else 0
                    valid_w = (box_w - box_x) - (overlap if box_w < w else 0)
                    valid_h = (box_h - box_y) - (overlap if box_h < h else 0)
                    
                    # Scale to Output Space
                    out_valid_x = valid_x * scale
                    out_valid_y = valid_y * scale
                    out_valid_w = valid_w * scale
                    out_valid_h = valid_h * scale
                    
                    # Crop from Output Tile
                    # We assume model output corresponds exact scaling
                    # Output Tile Box
                    # We just take the corresponding region from the result
                    # Tile result size should be (box_h*scale, box_w*scale, C)
                    
                    term_x = out_valid_x
                    term_y = out_valid_y
                    term_w = out_valid_w
                    term_h = out_valid_h
                    
                    tile_crop = tile_output[term_y:term_y+term_h, term_x:term_x+term_w, :]
                    
                    # Paste into Canvas
                    paste_x = (box_x + valid_x) * scale
                    paste_y = (box_y + valid_y) * scale
                    
                    output[paste_y:paste_y+term_h, paste_x:paste_x+term_w, :] = tile_crop
                    
                    del tile_input, tile_output, tile_crop
            
            return Image.fromarray(output)
            
        finally:
            model.to("cpu")
            if torch.cuda.is_available():
                torch.cuda.empty_cache()

    def execute(self, image, supersample_scale, sharpness, enable_hdr, tiled_processing, hdr_intensity, shadow_intensity, highlight_intensity, gamma_intensity, contrast, enhance_color, upscale_model=None, tile_size=512):
        
        # Parse Scale
        scale_map = {"2x": 2, "3x": 3, "4x": 4}
        scale = scale_map.get(supersample_scale, 2)
        
        results = []
        batch_size = image.shape[0]
        
        # Profiles for HDR
        sRGB_profile = ImageCms.createProfile("sRGB")
        Lab_profile = ImageCms.createProfile("LAB")
        
        hdr_params = (hdr_intensity, shadow_intensity, highlight_intensity, gamma_intensity, contrast, enhance_color)

        try:
            for i in range(batch_size):
                # 1. Convert to PIL
                img_tensor = image[i]
                img_np = (img_tensor.cpu().numpy() * 255).astype(np.uint8)
                pil_img = Image.fromarray(img_np).convert("RGB")
                
                if i == 0 and enable_hdr:
                    print(f"[H4_PixelPress] Processing Batch {i+1}/{batch_size} with HDR Enabled. Tiled: {tiled_processing} (Size: {tile_size})")
                    comfy.model_management.soft_empty_cache()
                
                orig_w, orig_h = pil_img.size
                target_w, target_h = orig_w * scale, orig_h * scale
                
                # 2. Upscale (Phase 1)
                upscaled_img = None
                
                if upscale_model:
                    try:
                        if tiled_processing:
                            # Tiled Model Upscale
                            upscaled_img = self._tiled_upscale(img_tensor, upscale_model, scale, tile_size, 32)
                        else:
                            # Full Frame Model Upscale
                            input_tensor = img_tensor.permute(2, 0, 1).unsqueeze(0)
                            device = comfy.model_management.get_torch_device()
                            upscale_model.to(device)
                            
                            upscaled_tensor = upscale_model(input_tensor.to(device))
                            u_tensor = upscaled_tensor.squeeze(0).permute(1, 2, 0).cpu()
                            u_np = (u_tensor.numpy() * 255).astype(np.uint8)
                            upscaled_img = Image.fromarray(u_np)

                    except Exception as e:
                        print(f"[H4_PixelPress] Model OOM/Fail, fallback to Lanczos. Error: {e}")
                        upscaled_img = pil_img.resize((target_w, target_h), Image.Resampling.LANCZOS)
                    finally:
                        upscale_model.to("cpu")
                        if torch.cuda.is_available():
                            torch.cuda.empty_cache()
                else:
                    upscaled_img = pil_img.resize((target_w, target_h), Image.Resampling.LANCZOS)
                
                # 3. HDR Pass (Phase 2)
                current_img = upscaled_img
                
                if enable_hdr:
                    if tiled_processing:
                         # Reuse tiling logic for HDR?
                         # The existing logic below iterates on `current_img` which is now upscaled.
                         # We should ensure `tile_size` is appropriate for the UPSCALE resolution.
                         # If tile_size is 512, and image is 4K, that's fine.
                         
                         overlap = 64
                         iw, ih = current_img.size
                         new_img = Image.new("RGB", (iw, ih))
                         
                         for y in range(0, ih, tile_size):
                             for x in range(0, iw, tile_size):
                                 box_x = max(0, x - overlap)
                                 box_y = max(0, y - overlap)
                                 box_w = min(iw, x + tile_size + overlap)
                                 box_h = min(ih, y + tile_size + overlap)
                                 
                                 tile = current_img.crop((box_x, box_y, box_w, box_h))
                                 processed_tile = self.process_tile(tile, sRGB_profile, Lab_profile, hdr_params)
                                 
                                 valid_x = overlap if x > 0 else 0
                                 valid_y = overlap if y > 0 else 0
                                 valid_w = (box_w - box_x) - (overlap if box_w < iw else 0)
                                 valid_h = (box_h - box_y) - (overlap if box_h < ih else 0)
                                 
                                 center_tile = processed_tile.crop((valid_x, valid_y, valid_w, valid_h))
                                 new_img.paste(center_tile, (box_x + valid_x, box_y + valid_y))
                                 
                                 del tile, processed_tile, center_tile
                         
                         current_img = new_img
                         gc.collect()
                        
                    else:
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
                
                del current_img, upscaled_img, final_img, final_np
                gc.collect()
                
        except Exception as e:
            print(f"[H4_PixelPress] Critical Execute Error: {e}")
            raise e
            
        return (torch.stack(results),)
