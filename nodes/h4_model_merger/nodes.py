import torch
import gc
import comfy.sd
import comfy.model_management
import comfy.utils
import folder_paths
import nodes
import logging

class H4_ModelMerger:
    @classmethod
    def INPUT_TYPES(s):
        # Generate block inputs for Model Merge (SD1.5/SDXL/SD2 support)
        # Includes: IN0-11, MID, OUT0-11 for each model input
        
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
                "memory_manager": ("BOOLEAN", {"default": True, "label_on": "Intelligent Memory (ON)", "label_off": "Brute Force (OFF)", "tooltip": "Optimized loading. Keeps VRAM usage low by loading/merging/unloading one model at a time."}),
                "testing_mode": ("BOOLEAN", {"default": False, "label_on": "Testing (Active)", "label_off": "Testing (Inactive)", "tooltip": "Run a live test generation inside the node to verify your merge."}),
            },
            "optional": {
                # Settings
                "interpolation_mode": (["Weighted Average", "Symmetric Average", "Add Difference", "Subtract", "Add"], {"default": "Symmetric Average", "tooltip": "Weighted Average: Base*(1-R) + Target*R. Symmetric Average: (M1*W1 + M2*W2 + M3*W3) / Total."}),
                "clip_source": (["Merged", "Model 1", "Model 2", "Model 3"], {"default": "Merged"}),
                "vae_source": (["Model 1", "Model 2", "Model 3"], {"default": "Model 1"}),

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
                "test_width": ("INT", {"default": 512, "min": 64, "max": 4096, "step": 8, "tooltip": "Width of the test generation image."}),
                "test_height": ("INT", {"default": 512, "min": 64, "max": 4096, "step": 8, "tooltip": "Height of the test generation image."}),
                "decode_test_image": ("BOOLEAN", {"default": False, "label_on": "Decode Test Image", "label_off": "Skip Decode (Latent Only)", "tooltip": "If OFF, skips the potentially slow/heavy VAE Decode step. The node will output a placeholder image and the real LATENT."}),
                "test_prompt": ("STRING", {"multiline": True, "default": "masterpiece, best quality, a beautiful landscape"}),
                
                # Expansion of Block Inputs
                **block_inputs
            }
        }

    RETURN_TYPES = ("MODEL", "CLIP", "VAE", "LATENT", "IMAGE")
    RETURN_NAMES = ("MODEL", "CLIP", "VAE", "TEST_LATENT", "TEST_IMAGE")
    FUNCTION = "process"
    CATEGORY = "h4_ToolKit/Model Merging"

    def process(self, model_count, settings, memory_manager, testing_mode, test_seed=0, test_steps=20, test_cfg=8.0, test_sampler="euler", test_scheduler="normal", test_width=512, test_height=512, decode_test_image=False, test_prompt="", interpolation_mode="Weighted Average", **kwargs):
        
        merged_model = None
        merged_clip = None
        merged_vae = None
        test_latent = None
        test_image = None
        
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

        def check_compatibility(base_model, new_model, index):
            """Ensures models being merged have the same architecture."""
            if base_model is None or new_model is None: return
            
            # Check Model Architecture Type (e.g. SD1.5 vs SDXL vs SD3)
            # We compare the class name of the internal model object
            base_type = type(base_model.model).__name__
            new_type = type(new_model.model).__name__
            
            if base_type != new_type:
                raise ValueError(f"[H4_ModelMerger] ❌ CRITICAL: Incompatible Models! Model 1 is '{base_type}' but Model {index} is '{new_type}'. You cannot merge different architectures (e.g. SD1.5 vs SDXL).")
                
            print(f"[H4_ModelMerger] Compatibility Check Passed for Model {index} ({base_type})")

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
        models_data = []
        for i in range(1, model_count + 1):
            m, c, v = get_model_components(i)
            if m: models_data.append({"model": m, "clip": c, "vae": v, "index": i})
        
        if not models_data:
            return (None, None, None, None, None)

        # 1. Start with Model 1 as Base
        base_data = models_data[0]
        merged_model = base_data["model"].clone()
        merged_clip = base_data["clip"].clone() if base_data["clip"] else None
        
        # 2. Sequential / Symmetric Merge
        for i in range(1, len(models_data)):
            target_data = models_data[i]
            idx = target_data["index"]
            
            check_compatibility(merged_model, target_data["model"], idx)
            
            if interpolation_mode == "Symmetric Average":
                # Symmetric handles Model 1 weights by calculating ratios dynamically per block
                merged_model = self.merge_symmetric(merged_model, target_data["model"], 1, idx, kwargs)
                if merged_clip:
                    merged_clip = self.merge_symmetric(merged_clip, target_data["clip"], 1, idx, kwargs, is_clip=True)
            else:
                # Traditional Sequential
                merged_model = merge_component(merged_model, target_data["model"], idx, interpolation_mode, is_clip=False)
                if merged_clip:
                    merged_clip = merge_component(merged_clip, target_data["clip"], idx, interpolation_mode, is_clip=True)

        # 3. Final Component Selection
        # CLIP Selection
        clip_choice = kwargs.get("clip_source", "Merged")
        if clip_choice != "Merged":
            c_idx = int(clip_choice.split(" ")[-1])
            for d in models_data:
                if d["index"] == c_idx:
                    merged_clip = d["clip"]
                    break
        
        # VAE Selection
        vae_choice = kwargs.get("vae_source", "Model 1")
        v_idx = int(vae_choice.split(" ")[-1])
        for d in models_data:
            if d["index"] == v_idx:
                merged_vae = d["vae"]
                break
            
        if memory_manager:
            comfy.model_management.soft_empty_cache()

        # --- Test Generation ---
        test_image = None

        if testing_mode and merged_model and merged_clip:
            # Use explicit test params if testing_mode is on, otherwise use safe defaults
            active_seed = test_seed if testing_mode else 0
            active_steps = test_steps if testing_mode else 20
            active_cfg = test_cfg if testing_mode else 7.0
            active_sampler = test_sampler if testing_mode else "euler"
            active_scheduler = test_scheduler if testing_mode else "normal"
            active_prompt = test_prompt if (testing_mode and test_prompt.strip()) else "masterpiece, best quality, 1girl, upper body, simple background"

            try:
                # 1. Encode Positive + Negative Conditioning
                print(f"[H4_ModelMerger] Test Gen: seed={active_seed}, steps={active_steps}, cfg={active_cfg}, sampler={active_sampler}")

                tokens = merged_clip.tokenize(active_prompt)
                cond, pooled = merged_clip.encode_from_tokens(tokens, return_pooled=True)
                positive = [[cond, {"pooled_output": pooled}]]

                tokens_neg = merged_clip.tokenize("lowres, bad anatomy, worst quality")
                cond_neg, pooled_neg = merged_clip.encode_from_tokens(tokens_neg, return_pooled=True)
                negative = [[cond_neg, {"pooled_output": pooled_neg}]]

                # 2. Create Empty Latent (User Resolution)
                width, height = test_width, test_height
                latent = torch.zeros([1, 4, height // 8, width // 8], device=comfy.model_management.intermediate_device())
                test_latent = {"samples": latent}

                # 3. Sample (KSampler)
                comfy.model_management.load_model_gpu(merged_model)
                test_latent = nodes.common_ksampler(
                    model=merged_model,
                    seed=active_seed,
                    steps=active_steps,
                    cfg=active_cfg,
                    sampler_name=active_sampler,
                    scheduler=active_scheduler,
                    positive=positive,
                    negative=negative,
                    latent=test_latent,
                    denoise=1.0
                )[0]


                # 4. Decode with Robust Fallback (Smart Tiling + FP32 Casting)
                if decode_test_image:
                    if merged_vae:
                        try:
                            valid_output = False
                            
                            # Helper: Decode Strategy
                            def try_decode(samples_in, use_tiled=False):
                                if use_tiled and hasattr(merged_vae, "decode_tiled"):
                                    print(f"[H4_ModelMerger] Decoding via Tiled VAE ({tile_x}px)...")
                                    return merged_vae.decode_tiled(samples_in, tile_x=512, tile_y=512)
                                else:
                                    print(f"[H4_ModelMerger] Decoding via Standard VAE...")
                                    return merged_vae.decode(samples_in)

                            # Logic: Use Tiled only for > 1024px to avoid overhead on small images
                            use_tiled = (width > 1024 or height > 1024)
                            tile_x = 512 # Default tile size
                            
                            # Attempt 1: Standard/Smart Configuration
                            try:
                                test_image = try_decode(test_latent["samples"], use_tiled)
                            except Exception as e1:
                                print(f"[H4_ModelMerger] Decode failed: {e1}. Retrying with alternate method...")
                                test_image = try_decode(test_latent["samples"], not use_tiled)

                            # Validation (NaN / Black Check)
                            if test_image is not None:
                                # Check for NaNs or virtually black image (Max < 0.05)
                                if torch.isnan(test_image).any() or test_image.max() < 1e-4: 
                                    print(f"[H4_ModelMerger] ⚠️ Output is NaN or Black (Max={test_image.max() if test_image is not None else 'None'}). Retrying in FP32...")
                                    valid_output = False
                                else:
                                    valid_output = True
                            
                            if not valid_output:
                                # Retry in FP32 (Full Precision)
                                print(f"[H4_ModelMerger] Force-casting samples to Float32 for robust decode...")
                                # Use standard decode for FP32 usually safer? Or Tiled? Try Smart again.
                                test_image = try_decode(test_latent["samples"].float(), use_tiled)
                                
                                # Re-Validate
                                if test_image is not None and (torch.isnan(test_image).any() or test_image.max() < 1e-4):
                                    print(f"[H4_ModelMerger] ❌ FP32 Decode also failed. VAE likely incompatible with Model.")
                                    test_image = None
                                else:
                                    print(f"[H4_ModelMerger] ✅ FP32 Decode successful.")

                        except Exception as vae_err:
                            print(f"[H4_ModelMerger] ❌ VAE Decode Critical Failure: {vae_err}")
                            test_image = None
                    else:
                        print(f"[H4_ModelMerger] No VAE available, returning black placeholder")
                        test_image = torch.zeros((1, height, width, 3))
                else:
                    print(f"[H4_ModelMerger] Skipping VAE Decode (Decode Disabled). Returning placeholder.")
                    # Return a small placeholder to indicate "Latent Only" mode
                    # Use a dim blue color to distinguish from Errors (Red)
                    test_image = torch.zeros((1, 64, 64, 3))
                    test_image[:, :, :, 2] = 0.5 # Blue
                

                # 5. Cleanup to free VRAM for downstream nodes
                del latent, positive, negative
                del cond, pooled, cond_neg, pooled_neg, tokens, tokens_neg
                gc.collect()
                comfy.model_management.soft_empty_cache()

                print(f"[H4_ModelMerger] ✅ Test generation complete")

            except Exception as e:
                print(f"[H4_ModelMerger] ❌ Test generation failed: {e}")
                import traceback
                traceback.print_exc()
                test_image = None

        # 5. Safe Return Definition
        if test_image is None:
            # 64x64 RED placeholder if generation failed (visible = something went wrong)
            print(f"[H4_ModelMerger] Returning error placeholder (64x64 red)")
            test_image = torch.zeros((1, 64, 64, 3))
            test_image[:, :, :, 0] = 0.8  # Red channel = error indicator
        
        if test_latent is None:
             # Return dummy latent
             test_latent = {"samples": torch.zeros([1, 4, 8, 8])}

        return (merged_model, merged_clip, merged_vae, test_latent, test_image)

    def merge_symmetric(self, base, target, idx_base, idx_target, kwargs, is_clip=False):
        """
        Calculates Symmetric ratio: R = W_target / (W_base + W_target)
        This ensures Model 1's weights are respected.
        """
        if base is None: return target.clone()
        if target is None: return base
        m = base.clone()
        kp = target.get_key_patches("diffusion_model.") if not is_clip else target.get_key_patches()

        for k in kp:
            if is_clip:
                w_b = kwargs.get(f"w_{idx_base}", 1.0)
                w_t = kwargs.get(f"w_{idx_target}", 1.0)
            else:
                # Granular Block weights for both
                w_b = self._get_granular_weight(idx_base, k, kwargs)
                w_t = self._get_granular_weight(idx_target, k, kwargs)
            
            # Symmetric Average: Result = (Base*W_b + Target*W_t) / (W_b + W_t)
            # This is equivalent to add_patches with:
            # strength_patch = W_t / (W_b + W_t)
            # strength_model = W_b / (W_b + W_t)
            total = w_b + w_t
            if total <= 0: ratio = 0.5
            else: ratio = w_t / total

            m.add_patches({k: kp[k]}, ratio, 1.0 - ratio)
        return m

    def _get_granular_weight(self, model_idx, key, kwargs):
        w_global = kwargs.get(f"w_{model_idx}", 1.0)
        block_weight = 1.0
        if "input_blocks" in key:
            try:
                parts = key.split(".")
                idx = parts.index("input_blocks")
                block_num = int(parts[idx + 1])
                if block_num > 11: block_num = 11 
                block_weight = kwargs.get(f"m{model_idx}_in_{block_num:02d}", 1.0)
            except: pass
        elif "middle_block" in key:
            block_weight = kwargs.get(f"m{model_idx}_mid", 1.0)
        elif "output_blocks" in key:
            try:
                parts = key.split(".")
                idx = parts.index("output_blocks")
                block_num = int(parts[idx + 1])
                if block_num > 11: block_num = 11
                block_weight = kwargs.get(f"m{model_idx}_out_{block_num:02d}", 1.0)
            except: pass
        return w_global * block_weight