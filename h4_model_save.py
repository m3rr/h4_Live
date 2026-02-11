import folder_paths
import nodes
import json
import os
import comfy.sd

class H4_ModelSave:
    def __init__(self):
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
                "save_dtype": (["float16", "bfloat16", "float32", "float8_e4m3fn", "float8_e5m2"], {"default": "float16", "tooltip": "The precision to save the model in. float16/bfloat16 recommended for most uses. float8 requires recent PyTorch/GPU support."}),
            },
            "optional": {
                "custom_metadata": ("STRING", {"multiline": True, "dynamicPrompts": False, "placeholder": "Enter custom metadata here (JSON format recommended but not required)..."}),
            },
            "hidden": {"prompt": "PROMPT", "extra_pnginfo": "EXTRA_PNGINFO"},
        }

    RETURN_TYPES = ()
    FUNCTION = "save"
    OUTPUT_NODE = True
    CATEGORY = "h4_ToolKit/Model Merging"

    def save(self, model, clip, vae, filename_prefix, save_meta, save_dtype, custom_metadata="", prompt=None, extra_pnginfo=None):
        if not save_meta:
             prompt = None
             extra_pnginfo = None
        
        # 1. Map Dtype string to torch.dtype
        dtype_map = {
            "float16": torch.float16,
            "bfloat16": torch.bfloat16,
            "float32": torch.float32,
            "float8_e4m3fn": getattr(torch, "float8_e4m3fn", None),
            "float8_e5m2": getattr(torch, "float8_e5m2", None)
        }
        
        target_dtype = dtype_map.get(save_dtype)
        if target_dtype is None:
             print(f"Warning: {save_dtype} not supported by this PyTorch version. Falling back to float16.")
             target_dtype = torch.float16

        # Use Standard Comfy Save Logic reuse
        full_output_folder, filename, counter, subfolder, filename_prefix = folder_paths.get_save_image_path(filename_prefix, self.output_dir)
        
        # Optimization: Clean up VRAM/RAM before save to prevent MemoryError
        try:
            import comfy.model_management
            comfy.model_management.unload_all_models()
            comfy.model_management.soft_empty_cache()
            gc.collect()
        except:
            pass

        # Metadata handling
        prompt_info = ""
        if prompt is not None:
            prompt_info = json.dumps(prompt)

        metadata = {}
        
        if save_meta:
             metadata["prompt"] = prompt_info
             if extra_pnginfo is not None:
                for x in extra_pnginfo:
                    metadata[x] = json.dumps(extra_pnginfo[x])
        
        if custom_metadata and custom_metadata.strip():
            try:
                custom_dict = json.loads(custom_metadata)
                for k, v in custom_dict.items():
                    metadata[str(k)] = str(v)
            except json.JSONDecodeError:
                metadata["h4_user_comment"] = str(custom_metadata)

        output_checkpoint = f"{filename}_{counter:05}_.safetensors"
        output_checkpoint = os.path.join(full_output_folder, output_checkpoint)

        # ------------------------------------------------------------------------------
        # NUCLEAR RAM SAVER (Iterative SafeTensors)
        # ------------------------------------------------------------------------------
        
        # 1. Prepare Model & Dicts
        # We need to gather the state dict without moving everything to CPU/RAM yet if possible
        # ComfyUI models are usually on GPU or CPU. We need to handle them carefully.
        
        try:
            # Clean before start
            import comfy.model_management
            comfy.model_management.soft_empty_cache()
            gc.collect()

            # Merge State Dicts (Model + CLIP + VAE)
            # This part still requires some RAM to hold the references and keys, but not the tensor data itself
            sd = model.model.state_dict_for_saving(clip_state_dict=clip.get_sd(), vae_state_dict=vae.get_sd(), clip_vision_state_dict=None)
        except MemoryError:
             print("CRITICAL: OOM just trying to get state_dict refs. Triggering Nuclear Cleanup.")
             import comfy.model_management
             comfy.model_management.unload_all_models()
             comfy.model_management.soft_empty_cache()
             gc.collect()
             sd = model.model.state_dict_for_saving(clip_state_dict=clip.get_sd(), vae_state_dict=vae.get_sd(), clip_vision_state_dict=None)

        # 2. Define Helper for Header Construction
        # Safetensors header is a JSON object telling offsets for each tensor
        # We must calculate offsets BEFORE writing data.
        
        header = {}
        data_offset = 0
        sorted_keys = sorted(sd.keys())
        
        # We need to know exact byte size of each tensor
        # target_dtype (float16) = 2 bytes per element
        dtype_bytes = {
            torch.float16: 2,
            torch.bfloat16: 2,
            torch.float32: 4,
            torch.int8: 1,
            torch.uint8: 1,
            torch.float64: 8
        }
        
        # Fallback for float8 if available
        if hasattr(torch, "float8_e4m3fn"): dtype_bytes[torch.float8_e4m3fn] = 1
        if hasattr(torch, "float8_e5m2"): dtype_bytes[torch.float8_e5m2] = 1

        bpe = dtype_bytes.get(target_dtype, 2)

        # Calculate Header
        for k in sorted_keys:
            v = sd[k]
            # Calculate size
            numel = v.numel()
            size_bytes = numel * bpe
            
            # Safetensors format: {"dtype": "F16", "shape": [1024, 1024], "data_offsets": [start, end]}
            
            # Map torch dtype string to safetensors string
            st_dtype = str(target_dtype).split(".")[-1].upper() # float16 -> FLOAT16
            if st_dtype == "FLOAT16": st_dtype = "F16"
            elif st_dtype == "BFLOAT16": st_dtype = "BF16"
            elif st_dtype == "FLOAT32": st_dtype = "F32"
            
            header[k] = {
                "dtype": st_dtype,
                "shape": list(v.shape),
                "data_offsets": [data_offset, data_offset + size_bytes]
            }
            data_offset += size_bytes
            
        header["__metadata__"] = metadata

        # 3. Write File Iteratively
        import struct
        
        json_header = json.dumps(header).encode('utf-8')
        # Padding (n bytes + 8 bytes length must be divisible by 8? No, just N)
        # Safetensors spec: 8 bytes (u64) containing length of header (N)
        # Followed by N bytes of JSON header
        # Followed by Data
        
        # Align header size?
        # "The header is a JSON object... The length of the header... is stored in the first 8 bytes... as a little-endian unsigned 64-bit integer."
        
        try:
            with open(output_checkpoint, "wb") as f:
                # Write Header Length
                f.write(struct.pack("<Q", len(json_header)))
                # Write Header
                f.write(json_header)
                
                # Stream Tensors
                for k in sorted_keys:
                    v = sd[k]
                    # Process ONE tensor
                    # Move to CPU, Cast, Numpy
                    
                    if v.device != torch.device("cpu"):
                        v = v.cpu()
                        
                    if v.dtype != target_dtype:
                        v = v.to(target_dtype)
                        
                    # Write bytes
                    f.write(v.numpy().tobytes())
                    
                    # Cleanup immediately
                    del v
                    
                    # Periodic GC (every 50 tensors or so to avoid stutter, or aggressive?)
                    # Aggressive is safer for your 16GB RAM + 18GB Model scenario
                    # But too slow if called every time. Let Python's ref counting handle most 'del'
            
            print(f"✅ Saved Iteratively: {output_checkpoint}")
            
        except Exception as e:
            print(f"❌ CRITICAL SAVE ERROR: {e}")
            # Try to cleanup partial file
            if os.path.exists(output_checkpoint):
                 try: os.remove(output_checkpoint)
                 except: pass
            raise e
        finally:
             # Final Cleanup
             del sd
             gc.collect()
             if torch.cuda.is_available():
                 torch.cuda.empty_cache()

        return {}
