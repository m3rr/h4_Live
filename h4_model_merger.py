import torch
import comfy.sd
import comfy.model_management
import comfy.utils
import folder_paths
import nodes
import logging

class H4_ModelMerger:
    @classmethod
    def INPUT_TYPES(s):
        # Programmatically generate block inputs to keep code clean-ish
        # We'll use a standard set of blocks common in SD1.5/SDXL/SD2
        # SD1.5: IN0-11, MID, OUT0-11
        # Each model (1-4) gets a full set.
        
        block_inputs = {}
        for m in range(1, 4): # Models 1 to 3
            # Global weight for the model
            block_inputs[f"w_{m}"] = ("FLOAT", {"default": 1.0, "min": 0.0, "max": 1.0, "step": 0.01, "tooltip": f"Global influence of Model {m}. Acts as a multiplier for all block weights below."})
            
            # Input Blocks (0-11)
            for b in range(12):
                block_inputs[f"m{m}_in_{b:02d}"] = ("FLOAT", {"default": 1.0, "min": 0.0, "max": 1.0, "step": 0.01, "tooltip": f"Model {m} Input Block {b}: Controls the flow of data into the UNet. Lower blocks affect composition/layout, higher blocks affect details."})
            
            # Middle Block
            block_inputs[f"m{m}_mid"] = ("FLOAT", {"default": 1.0, "min": 0.0, "max": 1.0, "step": 0.01, "tooltip": f"Model {m} Middle Block: The core processing. Often affects the fundamental 'soul' or coherence of the image."})
            
            # Output Blocks (0-11)
            for b in range(12):
                block_inputs[f"m{m}_out_{b:02d}"] = ("FLOAT", {"default": 1.0, "min": 0.0, "max": 1.0, "step": 0.01, "tooltip": f"Model {m} Output Block {b}: Controls the refinement and final look. Affects textures, lighting, and style."})

        return {
            "required": {
                "model_count": ("INT", {"default": 2, "min": 1, "max": 3, "step": 1, "tooltip": "How many models are we throwing into the pot? Choose between 2 to 3 models to blend together."}),
                "settings": ("BOOLEAN", {"default": False, "label_on": "Settings (ON)", "label_off": "Settings (OFF)", "tooltip": "Unlock the Mad Science Drawer! Reveals granular block-level weight controls for every model."}),
                "memory_manager": ("BOOLEAN", {"default": True, "label_on": "Inteligent Memory (ON)", "label_off": "Brute Force (OFF)", "tooltip": "Optimized loading. Keeps VRAM usage low by loading/merging/unloading one model at a time."}),
                "testing_mode": ("BOOLEAN", {"default": False, "label_on": "Testing (Active)", "label_off": "Testing (Inactive)", "tooltip": "Run a live test generation inside the node to verify your merge."}),
            },
            "optional": {
                # Settings
                "interpolation_mode": (["Weighted Average", "Add Difference", "Subtract", "Add"], {"tooltip": "The specific algorithm used to blend the weights."}),

                # Model Loaders
                "ckpt_1": (folder_paths.get_filename_list("checkpoints"), {"tooltip": "Base Model 1"}),
                "model_override_1": ("MODEL", {"tooltip": "Override Model 1"}),
                "clip_override_1": ("CLIP", {"tooltip": "Override CLIP 1"}),
                "vae_override_1": ("VAE", {"tooltip": "Override VAE 1"}),

                "ckpt_2": (folder_paths.get_filename_list("checkpoints"), {"tooltip": "Model 2"}),
                "model_override_2": ("MODEL", {"tooltip": "Override Model 2"}),
                "clip_override_2": ("CLIP", {"tooltip": "Override CLIP 2"}),
                "vae_override_2": ("VAE", {"tooltip": "Override VAE 2"}),

                "ckpt_3": (folder_paths.get_filename_list("checkpoints"), {"tooltip": "Model 3"}),
                "model_override_3": ("MODEL", {"tooltip": "Override Model 3"}),
                "clip_override_3": ("CLIP", {"tooltip": "Override CLIP 3"}),
                "vae_override_3": ("VAE", {"tooltip": "Override VAE 3"}),

                "ckpt_4": (folder_paths.get_filename_list("checkpoints"), {"tooltip": "Model 4"}),
                "model_override_4": ("MODEL", {"tooltip": "Override Model 4"}),
                "clip_override_4": ("CLIP", {"tooltip": "Override CLIP 4"}),
                "vae_override_4": ("VAE", {"tooltip": "Override VAE 4"}),

                # Testing
                "test_seed": ("INT", {"default": 0, "min": 0, "max": 0xffffffffffffffff}),
                "test_steps": ("INT", {"default": 20, "min": 1, "max": 100}),
                "test_cfg": ("FLOAT", {"default": 8.0, "min": 0.0, "max": 100.0}),
                "test_sampler": (comfy.samplers.KSampler.SAMPLERS, {"default": "euler"}),
                "test_scheduler": (comfy.samplers.KSampler.SCHEDULERS, {"default": "normal"}),
                "test_prompt": ("STRING", {"multiline": True, "default": "masterpiece, best quality, a beautiful landscape"}),
                
                # Expansion of Block Inputs
                **block_inputs
            }
        }

    RETURN_TYPES = ("MODEL", "CLIP", "VAE", "IMAGE")
    RETURN_NAMES = ("MODEL", "CLIP", "VAE", "TEST_IMAGE")
    FUNCTION = "process"
    CATEGORY = "h4_ToolKit/Model Merging"

    def process(self, model_count, settings, memory_manager, testing_mode, test_seed=0, test_steps=20, test_cfg=8.0, test_sampler="euler", test_scheduler="normal", test_prompt="", interpolation_mode="Weighted Average", **kwargs):
        
        merged_model = None
        merged_clip = None
        merged_vae = None
        
        # --- Helpers ---
        def get_model_components(index):
            idx_str = str(index)
            model_override = kwargs.get(f"model_override_{idx_str}")
            clip_override = kwargs.get(f"clip_override_{idx_str}")
            vae_override = kwargs.get(f"vae_override_{idx_str}")
            
            if model_override is not None:
                return model_override, clip_override, vae_override
            
            ckpt_name = kwargs.get(f"ckpt_{idx_str}")
            if ckpt_name:
                ckpt_path = folder_paths.get_full_path_or_raise("checkpoints", ckpt_name)
                # Load logic
                out = comfy.sd.load_checkpoint_guess_config(ckpt_path, output_vae=True, output_clip=True, embedding_directory=folder_paths.get_folder_paths("embeddings"))
                return out[:3]
            return None, None, None

        def get_block_weight(model_idx, key):
            """
            Determine the specific weight for a given key based on granular block settings.
            Returns: global_weight * block_weight
            """
            # 1. Base Global Weight
            w_global = kwargs.get(f"w_{model_idx}", 1.0)
            
            # 2. Key Analysis (Heuristic for SD1.5/SDXL)
            # Keys usually look like: "diffusion_model.input_blocks.4.1.transformer_blocks..."
            
            block_weight = 1.0
            
            if "input_blocks" in key:
                # Extract block index
                try:
                    # Split by dot, find number after 'input_blocks'
                    parts = key.split(".")
                    # Index of 'input_blocks'
                    idx = parts.index("input_blocks")
                    block_num = int(parts[idx + 1])
                    # Map to mX_in_YY
                    # Clamp to 11 just in case
                    if block_num > 11: block_num = 11 
                    block_weight = kwargs.get(f"m{model_idx}_in_{block_num:02d}", 1.0)
                except:
                    pass
                    
            elif "middle_block" in key:
                block_weight = kwargs.get(f"m{model_idx}_mid", 1.0)
                
            elif "output_blocks" in key:
                try:
                    parts = key.split(".")
                    idx = parts.index("output_blocks")
                    block_num = int(parts[idx + 1])
                    if block_num > 11: block_num = 11
                    block_weight = kwargs.get(f"m{model_idx}_out_{block_num:02d}", 1.0)
                except:
                     pass
            
            return w_global * block_weight

        def merge_component(base, target, model_idx, mode, is_clip=False):
            if base is None: return target.clone()
            if target is None: return base
            
            m = base.clone()
            
            # Get patches
            if not is_clip:
                kp = target.get_key_patches("diffusion_model.")
            else:
                kp = target.get_key_patches()

            for k in kp:
                if is_clip:
                    # Clip usually simple fusion
                    weight = kwargs.get(f"w_{model_idx}", 1.0) # Clip uses global weight only
                    if k.endswith(".position_ids") or k.endswith(".logit_scale"): continue
                    ratio = weight
                else:
                    # Model uses granular block weights
                    ratio = get_block_weight(model_idx, k)

                # Apply Merge
                if mode == "Weighted Average":
                    # add_patches(patches, strength_patch, strength_model)
                    # We want: Result = Base * (1 - ratio) + Target * ratio
                    # So: strength_model = (1 - ratio), strength_patch = ratio
                    m.add_patches({k: kp[k]}, ratio, 1.0 - ratio)
                    
                elif mode == "Add Difference":
                     # Result = Base + (Target * ratio)
                     # strength_model = 1.0, strength_patch = ratio
                     m.add_patches({k: kp[k]}, ratio, 1.0)
                
                elif mode == "Subtract":
                     # Result = Base - (Target * ratio)
                     m.add_patches({k: kp[k]}, -ratio, 1.0)
                
                elif mode == "Add":
                     # Result = Base + (Target * ratio)
                     m.add_patches({k: kp[k]}, ratio, 1.0)

            print(f"[H4_ModelMerger] Merged {model_idx} with mode {mode}. Logic: Base * (1-R) + Target * R")
            return m

        # --- Main Loop ---
        for i in range(1, model_count + 1):
            
            print(f"[H4_ModelMerger] Processing Model {i}")
            
            model, clip, vae = get_model_components(i)
            if model is None: continue

            if merged_model is None:
                merged_model = model.clone()
                merged_clip = clip.clone() if clip else None
                merged_vae = vae
            else:
                # Merge
                merged_model = merge_component(merged_model, model, i, interpolation_mode, is_clip=False)
                if clip and merged_clip:
                     merged_clip = merge_component(merged_clip, clip, i, interpolation_mode, is_clip=True)
                if vae: merged_vae = vae
            
            if memory_manager:
                comfy.model_management.soft_empty_cache()

        # --- Testing ---
        test_image = None
        if testing_mode and merged_model and merged_clip:
            try:
                # 1. Encode
                tokens = merged_clip.tokenize(test_prompt)
                cond, pooled = merged_clip.encode_from_tokens(tokens, return_pooled=True)
                positive = [[cond, {"pooled_output": pooled}]]
                
                tokens_neg = merged_clip.tokenize("")
                cond_neg, pooled_neg = merged_clip.encode_from_tokens(tokens_neg, return_pooled=True)
                negative = [[cond_neg, {"pooled_output": pooled_neg}]]

                # 2. Latent
                width, height = 512, 512
                latent = torch.zeros([1, 4, height // 8, width // 8], device=comfy.model_management.intermediate_device())
                latent_dict = {"samples": latent}

                # 3. Sample
                comfy.model_management.load_model_gpu(merged_model)
                samples = nodes.common_ksampler(
                    model=merged_model, 
                    seed=test_seed, 
                    steps=test_steps, 
                    cfg=test_cfg, 
                    sampler_name=test_sampler, 
                    scheduler=test_scheduler, 
                    positive=positive, 
                    negative=negative, 
                    latent=latent_dict, 
                    denoise=1.0
                )[0]

                # 4. Decode
                if merged_vae:
                    images = merged_vae.decode(samples["samples"])
                    test_image = images
                else:
                    # Fallback if no VAE (rare)
                    test_image = torch.zeros((1, 512, 512, 3))

            except Exception as e:
                print(f"[H4_ModelMerger] Testing Failed: {e}")
                import traceback
                traceback.print_exc()

        if test_image is None:
             test_image = torch.zeros((1, 1, 1, 3))

        return (merged_model, merged_clip, merged_vae, test_image)

