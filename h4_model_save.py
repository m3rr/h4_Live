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
            },
            "hidden": {"prompt": "PROMPT", "extra_pnginfo": "EXTRA_PNGINFO"},
        }

    RETURN_TYPES = ()
    FUNCTION = "save"
    OUTPUT_NODE = True
    CATEGORY = "h4_ToolKit/Model Merging"

    def save(self, model, clip, vae, filename_prefix, save_meta, prompt=None, extra_pnginfo=None):
        if not save_meta:
             prompt = None
             extra_pnginfo = None
        
        # Use Standard Comfy Save Logic reuse
        full_output_folder, filename, counter, subfolder, filename_prefix = folder_paths.get_save_image_path(filename_prefix, self.output_dir)
        
        # Metadata handling logic copied/adapted from nodes.py CheckpointSave
        prompt_info = ""
        if prompt is not None:
            prompt_info = json.dumps(prompt)

        metadata = {}
        
        # We can just call comfy.sd.save_checkpoint
        # It handles most metadata internally if passed, but we need to structure it
        
        # Basic metadata
        if save_meta:
             metadata["prompt"] = prompt_info
             if extra_pnginfo is not None:
                for x in extra_pnginfo:
                    metadata[x] = json.dumps(extra_pnginfo[x])

        output_checkpoint = f"{filename}_{counter:05}_.safetensors"
        output_checkpoint = os.path.join(full_output_folder, output_checkpoint)

        comfy.sd.save_checkpoint(output_checkpoint, model, clip, vae, metadata=metadata)
        
        return {}
