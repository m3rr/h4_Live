import os
import folder_paths
import comfy.utils
import torch
from safetensors import safe_open

from ..h4_model_save.nodes import H4_ModelSave

# ==============================================================================
# H4_ModelPruner — Hybrid Pruner Node
# Mode 1: Raw File (Fast). Operates directly on the .safetensors file to strip
#         EMA and optimizer weights, significantly reducing size.
# Mode 2: In-Memory. Acts as an end-of-line saver, forcing garbage collection
#         and utilizing ComfyUI's innate pruning.
# ==============================================================================

class H4_ModelPruner:
    """
    H4 Model Pruner — Removes training-specific data (EMA, Optimizers) from checkpoints.
    Supports a "Raw File" mode for extremely fast, low-memory pruning via file path,
    or an "In-Memory" mode that directly chains from MODEL/CLIP/VAE pipelines.
    """

    def __init__(self):
        self.output_dir = folder_paths.get_output_directory()

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "prune_mode": (["Raw File (Fast - Recommended)", "In-Memory (Passthrough)"], {"default": "Raw File (Fast - Recommended)"}),
                "target_precision": (["auto", "float16", "bfloat16", "float32", "float8_e4m3fn", "float8_e5m2"], {"default": "auto"}),
                "filename_prefix": ("STRING", {"default": "h4_Pruned_"}),
            },
            "optional": {
                "saved_model_path": (
                    "STRING", 
                    {
                        "forceInput": True, 
                        "tooltip": "Connect the 'saved_model_path' from H4_ModelSave for Raw File mode."
                    }
                ),
                "model": ("MODEL",),
                "clip": ("CLIP",),
                "vae": ("VAE",),
            }
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("pruned_model_path",)
    FUNCTION = "prune"
    OUTPUT_NODE = True
    CATEGORY = "h4_ToolKit/Model Merging"

    def prune(self, prune_mode, target_precision, filename_prefix, saved_model_path=None, model=None, clip=None, vae=None):
        print(f"[H4_ModelPruner] Initiating pruning sequence: {prune_mode}")

        # ──────────────────────────────────────────────────────────────────────
        # MODE: IN-MEMORY (Passthrough)
        # Delegates directly to H4_ModelSave logic
        # ──────────────────────────────────────────────────────────────────────
        if prune_mode == "In-Memory (Passthrough)":
            if model is None:
                raise ValueError("[H4_ModelPruner] In-Memory mode requires the 'model' input to be connected.")
            
            print("[H4_ModelPruner] Executing In-Memory pruning via H4_ModelSave core...")
            saver = H4_ModelSave()
            result = saver.save(
                model=model, clip=clip, vae=vae,
                filename_prefix=filename_prefix,
                save_meta=True, 
                save_dtype=target_precision,
                custom_metadata='{"h4_pruned": "true", "mode": "in_memory"}'
            )
            return result

        # ──────────────────────────────────────────────────────────────────────
        # MODE: RAW FILE (Direct Dictionary Manipulation)
        # ──────────────────────────────────────────────────────────────────────
        elif prune_mode == "Raw File (Fast - Recommended)":
            if not saved_model_path or not os.path.exists(saved_model_path):
                raise ValueError("[H4_ModelPruner] Raw File mode requires a valid 'saved_model_path'. Please connect it from an H4_ModelSave node.")
            
            print(f"[H4_ModelPruner] Loading raw file for pruning: {saved_model_path}")
            
            # 1. Load existing metadata (safetensors only)
            metadata = {}
            if saved_model_path.endswith(".safetensors"):
                try:
                    with safe_open(saved_model_path, framework="pt", device="cpu") as f:
                        meta = f.metadata()
                        if meta:
                            metadata.update(meta)
                except Exception as e:
                    print(f"[H4_ModelPruner] Warning: Could not read metadata: {e}")
            
            # 2. Load the tensor dictionary into RAM
            try:
                sd = comfy.utils.load_torch_file(saved_model_path, safe_load=True)
            except Exception as e:
                raise RuntimeError(f"[H4_ModelPruner] Failed to load checkpoint file: {e}")

            # 3. Setup dtype map
            dtype_map = {
                "float16": torch.float16,
                "bfloat16": torch.bfloat16,
                "float32": torch.float32,
                "float8_e4m3fn": getattr(torch, "float8_e4m3fn", None),
                "float8_e5m2": getattr(torch, "float8_e5m2", None),
            }
            target_dtype = None if target_precision == "auto" else dtype_map.get(target_precision, torch.float16)

            # 4. Filter keys and cast precision
            new_sd = {}
            pruned_count = 0
            cast_count = 0
            
            for k, v in sd.items():
                # Strip Exponential Moving Average and Optimizer states
                if k.startswith("model_ema.") or k.startswith("optimizer") or k.startswith("optimizer_states"):
                    pruned_count += 1
                    continue
                
                # Downcast to target precision
                if target_dtype is not None and v.is_floating_point() and v.dtype != target_dtype:
                    v = v.to(dtype=target_dtype)
                    cast_count += 1
                
                # Ensure contiguous memory block
                if not v.is_contiguous():
                    v = v.contiguous()
                
                new_sd[k] = v

            print(f"[H4_ModelPruner] ✂️ Pruning Complete! Removed {pruned_count} redundant keys.")
            print(f"[H4_ModelPruner] 📉 Cast {cast_count} tensors to {target_precision}.")
            
            # Update metadata flag
            metadata["h4_pruned_keys"] = str(pruned_count)
            metadata["h4_pruned_dtype"] = str(target_precision)

            # 5. Resolve standard output path
            full_output_folder, filename, counter, subfolder, filename_prefix = \
                folder_paths.get_save_image_path(filename_prefix, self.output_dir)
            
            output_checkpoint = f"{filename}_{counter:05}_.safetensors"
            output_path = os.path.join(full_output_folder, output_checkpoint)
            
            # 6. Save pruned tensor dict to disk
            print(f"[H4_ModelPruner] Saving pruned model to: {output_path}")
            try:
                comfy.utils.save_torch_file(new_sd, output_path, metadata=metadata)
                print("[H4_ModelPruner] ✅ Save successful.")
            except Exception as e:
                print(f"[H4_ModelPruner] ❌ Error saving pruned model: {e}")
                if os.path.exists(output_path):
                    os.remove(output_path)
                raise e
            
            return (output_path,)
