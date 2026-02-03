import torch
import numpy as np
from PIL import Image
import cv2
import comfy.samplers
import comfy.sd
import comfy.utils
import comfy.model_management
import folder_paths
import nodes

from .utils import tensor_to_pil, pil_to_tensor, batch_tensor_to_pil, batched_pil_to_tensor, _log
from .nodes_utility import analyze_faces

class H4_FaceDetailer:
    """
    H4_FaceDetailer: The "Pore Restorer".
    
    A specialized node that performs high-fidelity "Face Detailing" (ADetailer style).
    It detects faces in the input image, crops them, runs a KSampler pass using the 
    connected High-Res Model/LoRA, and blends them back.
    
    Best used AFTER a Face Swap and Upscale to restore the texture lost by the 128px swapper.
    """
    
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "image": ("IMAGE", {"tooltip": "The upscaled image to refine."}),
                "model": ("MODEL", {"tooltip": "The Model/LoRA stack used to generate the details."}),
                "clip": ("CLIP", {"tooltip": "CLIP model for text guidance."}),
                "vae": ("VAE", {"tooltip": "VAE for encoding/decoding the face crop."}),
                
                "guide_size": ("INT", {"default": 512, "min": 256, "max": 2048, "step": 64, "tooltip": "Resolution to process the face at. Higher = More detail but slower. 512-768 is sweet spot."}),
                "guide_size_for": ("BOOLEAN", {"default": True, "label_on": "BBox", "label_off": "Crop", "tooltip": "Reference size for the bounding box or the actual crop? usually BBox is safer."}),
                "max_megapixels": ("FLOAT", {"default": 2.0, "min": 0.5, "max": 16.0, "step": 0.1, "tooltip": "Safety limit for VRAM usage."}),
                
                "steps": ("INT", {"default": 20, "min": 1, "max": 100, "tooltip": "Sampler steps for the detail pass."}),
                "cfg": ("FLOAT", {"default": 8.0, "min": 0.0, "max": 100.0, "tooltip": "Creativity scale."}),
                "denoise": ("FLOAT", {"default": 0.30, "min": 0.01, "max": 1.0, "step": 0.01, "tooltip": "How much to hallucinate? 0.30 adds texture without changing structure. Above 0.5 will change the face."}),
                
                "sampler_name": (comfy.samplers.KSampler.SAMPLERS, ),
                "scheduler": (comfy.samplers.KSampler.SCHEDULERS, ),
                
                "positive": ("STRING", {"multiline": True, "dynamicPrompts": True, "default": "detailed face, high qualty, skin texture, pore details", "tooltip": "Prompts to guide the detailing. Keep it simple."}),
                "negative": ("STRING", {"multiline": True, "dynamicPrompts": True, "default": "blur, smooth, cartoon, anime, lowres", "tooltip": "What to avoid."}),
                
                "feather_mask": ("INT", {"default": 32, "min": 0, "max": 256, "tooltip": "Softness of the paste edge in pixels."}),
                "force_inpaint": ("BOOLEAN", {"default": True, "tooltip": "Use inpaint masking logic (better blending) vs simple overlay."}),
            },
            "optional": {
                "bbox_detector": ("BBOX_DETECTOR", {"tooltip": "Optional external detector (not used yet, internal detector is default)."}),
            }
        }

    RETURN_TYPES = ("IMAGE", "IMAGE")
    RETURN_NAMES = ("detailed_image", "face_crop")
    FUNCTION = "detail_faces"
    CATEGORY = "h4/IdentityEngine"

    def detail_faces(self, image, model, clip, vae, guide_size, guide_size_for, max_megapixels, steps, cfg, denoise, sampler_name, scheduler, positive, negative, feather_mask, force_inpaint, bbox_detector=None):
        
        _log("--- Face Detailer Started ---")
        
        # 1. Text Encode (Prompt)
        # -----------------------
        tokens_pos = clip.tokenize(positive)
        cond_pos = clip.encode_from_tokens(tokens_pos, return_pooled=True)
        cond = [[cond_pos[0], {"pooled_output": cond_pos[1]}]]

        tokens_neg = clip.tokenize(negative)
        cond_neg_tokens = clip.encode_from_tokens(tokens_neg, return_pooled=True)
        cond_neg = [[cond_neg_tokens[0], {"pooled_output": cond_neg_tokens[1]}]]

        # 2. Process Batch
        # ----------------
        pil_images = batch_tensor_to_pil(image)
        results = []
        crops = []
        
        for i, pil_img in enumerate(pil_images):
            # Detect
            img_np = np.array(pil_img) # RGB
            img_bgr = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
            
            # Use utility analyzer (InsightFace)
            faces = analyze_faces(img_bgr)
            _log(f"Image {i}: Found {len(faces)} faces.")
            
            if not faces:
                results.append(pil_img)
                continue
                
            # Sort by size (largest first)
            faces.sort(key=lambda x: (x.bbox[2]-x.bbox[0]) * (x.bbox[3]-x.bbox[1]), reverse=True)
            
            # We process the MAIN face (index 0) usually, but loop for all?
            # Let's loop all faces for completeness.
            
            canvas = img_np.copy() # Working on RGB
            
            for face in faces:
                bbox = face.bbox.astype(int)
                x1, y1, x2, y2 = bbox
                w, h = x2 - x1, y2 - y1
                
                # Expand BBox slightly for context
                pad_x = int(w * 0.2)
                pad_y = int(h * 0.2)
                
                x1 = max(0, x1 - pad_x)
                y1 = max(0, y1 - pad_y)
                x2 = min(img_np.shape[1], x2 + pad_x)
                y2 = min(img_np.shape[0], y2 + pad_y)
                
                crop_w = x2 - x1
                crop_h = y2 - y1
                
                # Crop
                face_crop = canvas[y1:y2, x1:x2]
                face_pil = Image.fromarray(face_crop)
                
                # Resize for processing if needed
                # If guide_size_for is 'BBox', we scale so the crop is approx 'guide_size'
                original_crop_size = face_pil.size
                
                scale_factor = 1.0
                if max(crop_w, crop_h) < guide_size:
                    # Upscale small faces to guide size for better detail
                    scale_factor = guide_size / max(crop_w, crop_h)
                elif max(crop_w, crop_h) > guide_size:
                    # Downscale huge faces? No, usually keep them unless VRAM limit
                    pass
                    
                target_w = int(crop_w * scale_factor)
                target_h = int(crop_h * scale_factor)
                
                # Ensure multiple of 8 for VAE
                target_w = (target_w // 8) * 8
                target_h = (target_h // 8) * 8
                
                processed_pil = face_pil.resize((target_w, target_h), Image.Resampling.LANCZOS)
                
                # Convert to Tensor for KSampler
                proc_tensor = pil_to_tensor(processed_pil)
                
                # VAE Encode
                latent = vae.encode(proc_tensor[:,:,:,:3])
                latent_image = {"samples": latent}
                
                # SAMPLING (The Magic)
                try:
                    # Seed logic - Randomize for texture
                    # Capping at 2**63 - 1 to prevent "Overflow when unpacking long long" (Signed INT64 limit)
                    seed = torch.randint(0, 2**63 - 1, (1,)).item()
                    
                    # Common KSampler
                    samples = nodes.common_ksampler(
                        model, seed, steps, cfg, sampler_name, scheduler, 
                        cond, cond_neg, latent_image, denoise=denoise
                    )[0]["samples"]
                    
                    # VAE Decode
                    decoded = vae.decode(samples)
                    decoded_pil = tensor_to_pil(decoded)
                    
                    # Append debug crop
                    if len(crops) < 5: 
                        # Resize to fixed size for batching (Preview only)
                        crops.append(decoded_pil.resize((512, 512), Image.Resampling.LANCZOS))

                    # Paste Back
                    # Resize back to original slot
                    decoded_pil = decoded_pil.resize(original_crop_size, Image.Resampling.LANCZOS)
                    decoded_np = np.array(decoded_pil)
                    
                    # Create Mask
                    # Soft ellipse mask
                    mask = np.zeros((crop_h, crop_w), dtype=np.float32)
                    center = (crop_w // 2, crop_h // 2)
                    axes = (int(crop_w * 0.45), int(crop_h * 0.45))
                    cv2.ellipse(mask, center, axes, 0, 0, 360, 1.0, -1)
                    
                    # Blur mask
                    if feather_mask > 0:
                        k = feather_mask if feather_mask % 2 == 1 else feather_mask + 1
                        mask = cv2.GaussianBlur(mask, (k, k), 0)
                        
                    mask = np.clip(mask, 0, 1)
                    mask_3c = np.dstack([mask, mask, mask])
                    
                    # Blend
                    # canvas region logic
                    current_region = canvas[y1:y2, x1:x2]
                    blended = (decoded_np * mask_3c + current_region * (1 - mask_3c)).astype(np.uint8)
                    
                    canvas[y1:y2, x1:x2] = blended
                    
                except Exception as e:
                    _log(f"Sampling failed for face: {e}", level="ERROR")
                    continue
            
            results.append(Image.fromarray(canvas))
            
        final_tensor = batched_pil_to_tensor(results)
        
        # Crops output (for preview)
        crop_tensor = batched_pil_to_tensor(crops) if crops else torch.zeros((1, 512, 512, 3))
        
        return (final_tensor, crop_tensor)
