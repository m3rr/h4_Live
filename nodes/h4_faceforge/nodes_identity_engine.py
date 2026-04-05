import os
import torch
import comfy.samplers
import comfy.sample
import comfy.sd
import folder_paths
import nodes
from .nodes_faceforge import H4_FaceForge
from .models import (
    get_face_models, get_swap_models, get_restore_models, 
    get_upscale_models, get_sam_models
)
from .utils import _log

class H4_IdentityEngine:
    """
    The "IdentityEngine" Character Studio.
    Scalable, Standalone, Presettable.
    """
    
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                # --- Management ---
                "preset": ("STRING", {"default": "None", "tooltip": "Select a saved character preset."}), # JS converts to Combo
                
                # --- Standalone Loader ---
                "ckpt_name": (folder_paths.get_filename_list("checkpoints"), {"tooltip": "The main AI Brain (Checkpoint). Determines the art style."}),
                "vae_name": (["Baked", "Use Input"] + folder_paths.get_filename_list("vae"), {"tooltip": "Color correction. 'Baked' means use what's inside the Checkpoint."}),
                "clip_name": (["Use Checkpoint", "Use Input"] + folder_paths.get_filename_list("clip"), {"tooltip": "Text Interpreter. 'Use Checkpoint' is usually best."}),
                
                # --- Generative Inputs ---
                "seed": ("INT", {"default": 0, "min": 0, "max": 0xffffffffffffffff, "tooltip": "The magic number definition. Same Seed + Same Settings = Same Image."}),
                "steps": ("INT", {"default": 20, "min": 1, "max": 10000, "tooltip": "How many times to polish the image. 20-30 is standard."}),
                "cfg": ("FLOAT", {"default": 8.0, "min": 0.0, "max": 100.0, "tooltip": "Creativity Scale. Low (5-7) = Creative. High (8-12) = Strict."}),
                "sampler_name": (comfy.samplers.KSampler.SAMPLERS, {"tooltip": "The drawing method. 'euler' is fast, 'dpmpp_2m' is detailed."}),
                "scheduler": (comfy.samplers.KSampler.SCHEDULERS, {"tooltip": "How noise is removed. 'normal' or 'karras' work well."}),
                "denoise": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 1.0, "step": 0.01, "tooltip": "Img2Img Only: How much to change the original? 1.0 = New Image, 0.4 = Minor Edits."}), # For Img2Img
                
                "positive_dna": ("STRING", {"multiline": True, "dynamicPrompts": True, "default": "", "tooltip": "DNA Prompt: Fixed character persistence (e.g. 'blonde, scars'). Concats with Positive."}),
                "positive": ("STRING", {"multiline": True, "dynamicPrompts": True, "tooltip": "Scene Prompt: What they are doing (e.g. 'riding a moto')."}),
                "negative": ("STRING", {"multiline": True, "dynamicPrompts": True, "tooltip": "What do you NOT want? (e.g. 'blurry, ugly, bad hands')"}),
                "width": ("INT", {"default": 512, "min": 16, "max": 4096, "step": 8, "tooltip": "Image Width."}),
                "height": ("INT", {"default": 512, "min": 16, "max": 4096, "step": 8, "tooltip": "Image Height."}),
                "batch_size": ("INT", {"default": 1, "min": 1, "max": 64, "tooltip": "How many images to create at once."}),

                # --- FaceForge Inputs ---
                "face_image": ("IMAGE", {"tooltip": "Drag a photo here to clone this face onto the character."}), # REQUIRED for Identity
                "face_model": (["None", "none"] + [x for x in get_face_models() if x != "none"], {"tooltip": "Or pick a pre-saved .safetensors face model. 'None' to disable."}),
                "swap_enabled": ("BOOLEAN", {"default": True, "tooltip": "Turn ON to enable face swapping."}),
                "face_similarity": ("FLOAT", {"default": 0.5, "min": 0.0, "max": 1.0, "step": 0.05, "tooltip": "How strictly to copy the face features. Higher = More likeness, but maybe weird."}),
                "restore_enabled": ("BOOLEAN", {"default": True, "tooltip": "Fix blurry faces automatically."}),
                "restore_visibility": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 1.0, "step": 0.05, "tooltip": "Restore strength. 1.0 = Full Fix."}),
                "restore_model": (get_restore_models(), {"default": "codeformer-v0.1.0.pth", "tooltip": "The repair tool to use."}),
                "codeformer_weight": ("FLOAT", {"default": 0.5, "min": 0.0, "max": 1.0, "step": 0.05, "tooltip": "Fidelity vs. Quality. 0.0 = High Fidelity, 1.0 = Smooth Skin."}),
                
                # --- Advanced Forge ---
                "swap_model": (get_swap_models(), {"default": "inswapper_128.onnx", "tooltip": "The logic engine for the swap."}),
                "boost_enabled": ("BOOLEAN", {"default": False, "tooltip": "High-Res swap? Slower but sharper."}),
                "occlusion_enabled": ("BOOLEAN", {"default": True, "tooltip": "Prevent face from overlapping hair/hands."}),
                "sam_model": (get_sam_models(), {"default": "none", "tooltip": "SAM model for perfect occlusion masks."}),
                "preserve_glasses": ("BOOLEAN", {"default": True, "tooltip": "Attempt to keep the target's eyewear."}),
                
                # --- Upscaling ---
                "upscale_enabled": ("BOOLEAN", {"default": False, "tooltip": "Upscale the FINAL result."}),
                "upscale_model": (get_upscale_models(), {"default": "none", "tooltip": "The upscaler engine."}),
                "upscale_face_only": ("BOOLEAN", {"default": False, "tooltip": "Only upscale the face region? (Saves VRAM)"}),
            },
            "optional": {
                "model_opt": ("MODEL",),
                "clip_opt": ("CLIP",),
                "vae_opt": ("VAE",),
                "image_optional": ("IMAGE",), # Triggers Img2Img
                "positive_text": ("STRING", {"forceInput": True, "multiline": True, "dynamicPrompts": True, "tooltip": "[Override] Connect external Scene Prompt here (e.g. from a Primitive)."}),
                "negative_text": ("STRING", {"forceInput": True, "multiline": True, "dynamicPrompts": True, "tooltip": "[Override] Connect external Negative Prompt here."}),
            }
        }

    @classmethod
    def VALIDATE_INPUTS(s, input_types):
        return True

    RETURN_TYPES = ("IMAGE", "MODEL", "CLIP", "VAE")
    RETURN_NAMES = ("character_image", "model", "clip", "vae")
    FUNCTION = "generate_identity"
    CATEGORY = "h4/IdentityEngine"

    def generate_identity(self, preset, ckpt_name, vae_name, clip_name, seed, steps, cfg, sampler_name, scheduler, denoise,
                         positive_dna, positive, negative, width, height, batch_size,
                         face_image, face_model, swap_enabled, face_similarity, restore_enabled, restore_visibility, restore_model,
                         codeformer_weight, swap_model, boost_enabled, occlusion_enabled, sam_model, preserve_glasses,
                         upscale_enabled, upscale_model, upscale_face_only,
                         model_opt=None, clip_opt=None, vae_opt=None, image_optional=None, positive_text=None, negative_text=None):

        _log(f"--- IdentityEngine Started (Preset: {preset}) ---")

        # 1. Resolve Model Source (Standalone vs Wire)
        # ----------------------------------------------------------------
        model, clip, vae = None, None, None
        
        # Priority: Wire > Loader (User preference? Usually Wire overrides Loader)
        # Plan: If wire is connected, use it. If not, load checkpoint.
        
        if model_opt:
            model = model_opt
        else:
            _log(f"Loading Checkpoint: {ckpt_name}")
            out = comfy.sd.load_checkpoint_guess_config(folder_paths.get_full_path("checkpoints", ckpt_name), output_vae=True, output_clip=True, embedding_directory=folder_paths.get_folder_paths("embeddings"))
            model = out[0]
            # Use loaded CLIP/VAE as defaults unless overridden below
            if not clip_opt: clip = out[1]
            if not vae_opt: vae = out[2]

        if clip_opt:
            clip = clip_opt
        elif clip is None:
            # Load CLIP (Specific or Checkpoint fallback)
            if clip_name != "Use Checkpoint" and clip_name != "Use Input":
                 clip_path = folder_paths.get_full_path("clip", clip_name)
                 clip = comfy.sd.load_clip(path=clip_path, embedding_directory=folder_paths.get_folder_paths("embeddings"))

        if vae_opt:
            vae = vae_opt
        elif vae is None:
             if vae_name != "Baked" and vae_name != "Use Input":
                 vae_path = folder_paths.get_full_path("vae", vae_name)
                 vae = comfy.sd.VAE(sd=comfy.utils.load_torch_file(vae_path))

        # Output loaded models (Passthrough)
        final_model, final_clip, final_vae = model, clip, vae

        # 2. Text Encode
        # ----------------------------------------------------------------
        # LOGIC: Input Wire > Widget
        scene_prompt = positive_text if positive_text else positive
        neg_prompt = negative_text if negative_text else negative
        
        final_positive = f"{positive_dna}, {scene_prompt}" if positive_dna.strip() else scene_prompt
        
        tokens_pos = final_clip.tokenize(final_positive)
        cond, pooled = final_clip.encode_from_tokens(tokens_pos, return_pooled=True)
        cond_pos = [[cond, {"pooled_output": pooled}]]
        
        tokens_neg = final_clip.tokenize(neg_prompt)
        cond, pooled = final_clip.encode_from_tokens(tokens_neg, return_pooled=True)
        cond_neg = [[cond, {"pooled_output": pooled}]]

        # 3. Latent Preparation (Txt2Img vs Img2Img)
        # ----------------------------------------------------------------
        latent_dict = {}
        
        if image_optional is not None:
             # Img2Img Mode
             _log("Mode: Img2Img (Auto-Switch)")
             # Resize image to target width/height if needed? Or use image size?
             # For standard Img2Img, we usually encode the pixels.
             # Let's VAE Encode the input image.
             
             # Basic VAE Encode logic
             # image is [B, H, W, C]
             # We might need to resize it to match the requested width/height or just use it.
             # User provided `width` and `height`. Let's assume target size.
             from nodes import VAEEncode
             
             # Resize not implemented here for brevity, assume input is correct or VAE handles it?
             # VAE Encode expects pixels.
             encoder = VAEEncode()
             latent_dict = encoder.encode(final_vae, image_optional)[0]
        else:
             # Txt2Img Mode
             _log("Mode: Txt2Img")
             latent = torch.zeros([batch_size, 4, height // 8, width // 8])
             latent_dict = {"samples": latent}

        # 4. Sampling
        # ----------------------------------------------------------------
        # Denoise handling: if Txt2Img, denoise is 1.0 (usually). If Img2Img, use widget.
        # However, `common_ksampler` takes denoise.
        # If Txt2Img, we should force 1.0? 
        # Actually, `common_ksampler` applies noise based on denoise.
        
        actual_denoise = denoise if image_optional is not None else 1.0
        
        try:
            sampled_latent = nodes.common_ksampler(final_model, seed, steps, cfg, sampler_name, scheduler, cond_pos, cond_neg, latent_dict, denoise=actual_denoise)[0]
        except Exception as e:
            _log(f"Sampling Failed: {e}", level="ERROR")
            raise e

        # 5. Decode
        # ----------------------------------------------------------------
        decoded_image = final_vae.decode(sampled_latent["samples"])

        # 6. FaceForge Integration
        # ----------------------------------------------------------------
        # Load Face Model (if selected)
        face_model_obj = None
        if face_model != "None":
             from .nodes_utility import H4_LoadFaceModel
             loader = H4_LoadFaceModel()
             face_model_obj = loader.load_model(face_model)[0]
        
        forge = H4_FaceForge()
        
        result_image = forge.execute(
            input_image=decoded_image,
            source_image=face_image,
            face_model=face_model_obj,
            swap_enabled=swap_enabled,
            face_selection_mode="index",
            target_face_index="0",
            source_face_index="0",
            restore_enabled=restore_enabled,
            restore_model=restore_model,
            restore_visibility=restore_visibility,
            codeformer_weight=codeformer_weight,
            swap_model=swap_model,
            boost_enabled=boost_enabled,
            occlusion_enabled=occlusion_enabled,
            sam_model=sam_model,
            preserve_glasses=preserve_glasses,
            preserve_hair=False, # Removed from IE for simplicity but available in main Forge
            upscale_enabled=upscale_enabled, 
            upscale_model=upscale_model,
            upscale_face_only=upscale_face_only,
        )[0]
        
        return (result_image, final_model, final_clip, final_vae)
