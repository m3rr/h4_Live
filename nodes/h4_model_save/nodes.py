import folder_paths
import json
import os
import gc
import torch
import comfy.sd
import comfy.utils
import comfy.model_management

# ==============================================================================
# H4_ModelSave — Uses ComfyUI's native save_checkpoint pipeline to ensure
# all architecture-specific key prefixes (SDXL conditioner, SD1.5
# cond_stage_model, Flux text_encoders, etc.) are correctly applied by
# the model_config classes. Custom dtype casting is done in post.
# ==============================================================================

class H4_ModelSave:
    """
    H4 Model Save — Saves MODEL + CLIP + VAE as a single .safetensors checkpoint.
    Delegates key mapping to ComfyUI's native model_config pipeline via
    model.state_dict_for_saving(). Supports custom dtype casting and metadata.
    """

    def __init__(self):
        # Default output directory from ComfyUI's folder_paths configuration
        self.output_dir = folder_paths.get_output_directory()

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "model": ("MODEL",),
                "clip": ("CLIP",),
                "vae": ("VAE",),
                "filename_prefix": ("STRING", {"default": "h4_Checkpoint_"}),
                "save_meta": ("BOOLEAN", {"default": True}),
                "save_dtype": (
                    ["float16", "bfloat16", "float32", "float8_e4m3fn", "float8_e5m2"],
                    {
                        "default": "float16",
                        "tooltip": "The precision to save the model in. float16/bfloat16 recommended for most uses. float8 requires recent PyTorch/GPU support."
                    }
                ),
            },
            "optional": {
                "custom_metadata": (
                    "STRING",
                    {
                        "multiline": True,
                        "dynamicPrompts": False,
                        "placeholder": "Enter custom metadata here (JSON format recommended but not required)..."
                    }
                ),
            },
            "hidden": {"prompt": "PROMPT", "extra_pnginfo": "EXTRA_PNGINFO"},
        }

    RETURN_TYPES = ()
    FUNCTION = "save"
    OUTPUT_NODE = True
    CATEGORY = "h4_ToolKit/Model Merging"

    def save(self, model, clip, vae, filename_prefix, save_meta, save_dtype, custom_metadata="", prompt=None, extra_pnginfo=None):
        """
        Save a MODEL + CLIP + VAE as a single .safetensors checkpoint file.

        Uses ComfyUI's native state_dict_for_saving() pipeline which correctly
        handles per-architecture key prefixes (SDXL conditioner, SD1.5 cond_stage_model,
        Flux text_encoders, etc.), CLIP format conversions, and VAE key mapping.

        Custom dtype casting is applied after the native pipeline produces the
        correctly-keyed state dict, before writing to disk.
        """
        # ──────────────────────────────────────────────────────────────────────
        # STEP 1: Strip metadata if user opted out
        # ──────────────────────────────────────────────────────────────────────
        if not save_meta:
            prompt = None
            extra_pnginfo = None

        # ──────────────────────────────────────────────────────────────────────
        # STEP 2: Resolve target dtype from string selection
        # ──────────────────────────────────────────────────────────────────────
        dtype_map = {
            "float16": torch.float16,
            "bfloat16": torch.bfloat16,
            "float32": torch.float32,
            "float8_e4m3fn": getattr(torch, "float8_e4m3fn", None),
            "float8_e5m2": getattr(torch, "float8_e5m2", None),
        }

        target_dtype = dtype_map.get(save_dtype)
        if target_dtype is None:
            print(f"[H4_ModelSave] Warning: {save_dtype} not supported by this PyTorch version. Falling back to float16.")
            target_dtype = torch.float16

        # ──────────────────────────────────────────────────────────────────────
        # STEP 3: Resolve output path using ComfyUI's standard counter logic
        # ──────────────────────────────────────────────────────────────────────
        full_output_folder, filename, counter, subfolder, filename_prefix = \
            folder_paths.get_save_image_path(filename_prefix, self.output_dir)

        output_checkpoint = f"{filename}_{counter:05}_.safetensors"
        output_path = os.path.join(full_output_folder, output_checkpoint)

        # ──────────────────────────────────────────────────────────────────────
        # STEP 4: Pre-save memory cleanup to maximize available RAM for the
        #         state dict assembly that follows
        # ──────────────────────────────────────────────────────────────────────
        try:
            comfy.model_management.unload_all_models()
            comfy.model_management.soft_empty_cache()
            gc.collect()
        except Exception as mem_err:
            print(f"[H4_ModelSave] Non-critical memory cleanup warning: {mem_err}")

        # ──────────────────────────────────────────────────────────────────────
        # STEP 5: Build metadata dict (prompt, workflow, custom user metadata)
        # ──────────────────────────────────────────────────────────────────────
        metadata = {}

        if save_meta:
            # Inject ComfyUI prompt JSON (used by metadata readers and loaders)
            if prompt is not None:
                metadata["prompt"] = json.dumps(prompt)

            # Inject extra workflow/PNG info from ComfyUI's internal pipeline
            if extra_pnginfo is not None:
                for x in extra_pnginfo:
                    metadata[x] = json.dumps(extra_pnginfo[x])

        # Inject user-provided custom metadata (supports JSON dict or plain text)
        if custom_metadata and custom_metadata.strip():
            try:
                custom_dict = json.loads(custom_metadata)
                for k, v in custom_dict.items():
                    metadata[str(k)] = str(v)
            except json.JSONDecodeError:
                # Not valid JSON — store as a plain comment string
                metadata["h4_user_comment"] = str(custom_metadata)

        # ──────────────────────────────────────────────────────────────────────
        # STEP 6: Assemble state dict using ComfyUI's NATIVE pipeline
        #
        # model.state_dict_for_saving(clip_sd, vae_sd) calls:
        #   - model_config.process_unet_state_dict_for_saving()
        #     → Adds correct UNet prefix (e.g., "model.diffusion_model." for SD/SDXL)
        #   - model_config.process_clip_state_dict_for_saving()
        #     → SDXL: Converts OpenAI→HuggingFace CLIP format, maps to
        #       "conditioner.embedders.0/1." prefixes
        #     → SD1.5: Maps to "cond_stage_model." prefix
        #   - model_config.process_vae_state_dict_for_saving()
        #     → Adds "first_stage_model." prefix
        #
        # This eliminates all manual key-mapping bugs and automatically
        # supports every architecture ComfyUI knows about.
        # ──────────────────────────────────────────────────────────────────────
        try:
            # Load model to GPU so weights are accessible for state_dict extraction
            load_models = [model]
            if clip is not None:
                load_models.append(clip.load_model())
            comfy.model_management.load_models_gpu(load_models, force_full_load=True)

            # Get CLIP and VAE state dicts (raw, without architecture prefixes)
            clip_sd = clip.get_sd() if clip is not None else None
            vae_sd = vae.get_sd() if vae is not None else None

            # Assemble the full checkpoint state dict with correct key prefixes
            # This is the CRITICAL call — ComfyUI's model_config handles all
            # architecture-specific key remapping internally
            sd = model.state_dict_for_saving(clip_sd, vae_sd, clip_vision_state_dict=None)

            total_keys = len(sd)
            sample_keys = list(sd.keys())[:5]
            print(f"[H4_ModelSave] State dict assembled. Total keys: {total_keys}")
            print(f"[H4_ModelSave] Sample keys: {sample_keys}")

        except Exception as e:
            print(f"[H4_ModelSave] Error assembling state dict: {e}")
            raise e

        # ──────────────────────────────────────────────────────────────────────
        # STEP 7: Apply custom dtype casting to every tensor in the state dict
        #
        # Done AFTER the native pipeline assembles keys, so we don't interfere
        # with key mapping. Each tensor is moved to CPU and cast to the
        # user-selected dtype before writing.
        # ──────────────────────────────────────────────────────────────────────
        try:
            cast_count = 0
            for k in sd:
                t = sd[k]
                # Only cast floating-point tensors (skip integer embeddings, etc.)
                if t.is_floating_point() and t.dtype != target_dtype:
                    sd[k] = t.to(dtype=target_dtype)
                    cast_count += 1
                # Ensure tensors are contiguous for safetensors serialization
                if not sd[k].is_contiguous():
                    sd[k] = sd[k].contiguous()

            print(f"[H4_ModelSave] Cast {cast_count} tensors to {save_dtype}")

        except Exception as e:
            print(f"[H4_ModelSave] Error during dtype casting: {e}")
            raise e

        # ──────────────────────────────────────────────────────────────────────
        # STEP 8: Write to disk using ComfyUI's save_torch_file (safetensors)
        # ──────────────────────────────────────────────────────────────────────
        try:
            comfy.utils.save_torch_file(sd, output_path, metadata=metadata)
            print(f"[H4_ModelSave] ✅ Saved checkpoint: {output_path}")
            print(f"[H4_ModelSave]    dtype={save_dtype}, keys={total_keys}, metadata_keys={len(metadata)}")

        except Exception as e:
            print(f"[H4_ModelSave] ❌ CRITICAL SAVE ERROR: {e}")
            # Clean up partial file on failure to avoid corrupted checkpoints
            if os.path.exists(output_path):
                try:
                    os.remove(output_path)
                    print(f"[H4_ModelSave] Removed partial file: {output_path}")
                except Exception as del_err:
                    print(f"[H4_ModelSave] Warning: Could not remove partial file: {del_err}")
            raise e

        finally:
            # ──────────────────────────────────────────────────────────────────
            # STEP 9: Post-save cleanup — release state dict memory
            # ──────────────────────────────────────────────────────────────────
            if 'sd' in locals():
                del sd
            if 'clip_sd' in locals():
                del clip_sd
            if 'vae_sd' in locals():
                del vae_sd
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()

        return {}
