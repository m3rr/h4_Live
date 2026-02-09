
import os
import json
import folder_paths
from PIL import Image
from PIL.PngImagePlugin import PngInfo
import numpy as np
import torch

class H4_SmartSave:
    """
    H4 SmartSave - A dual-mode image handler.
    Toggle between 'Preview Only' (Temp) and 'Save to Disk' (Output).
    Supports injecting custom JSON metadata into the saved image.
    """
    
    def __init__(self):
        self.output_dir = folder_paths.get_output_directory()
        self.type = "output"
        self.prefix_append = ""
        self.compress_level = 4

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "images": ("IMAGE", ),
                "filename_prefix": ("STRING", {"default": "h4_", "multiline": False}),
                "save_mode": ("BOOLEAN", {"default": False, "label_on": "💾 SAVE TO DISK", "label_off": "👁️ PREVIEW ONLY"}),
            },
            "optional": {
                 "custom_metadata": ("STRING", {"default": "{}", "multiline": True, "placeholder": "JSON Metadata here..."}),
            },
            "hidden": {"prompt": "PROMPT", "extra_pnginfo": "EXTRA_PNGINFO"},
        }

    RETURN_TYPES = ("IMAGE", )
    FUNCTION = "smart_save"
    CATEGORY = "h4/IO"
    OUTPUT_NODE = True

    def smart_save(self, images, filename_prefix, save_mode, custom_metadata="{}", prompt=None, extra_pnginfo=None):
        
        # 1. Determine Mode
        # If Save Mode is OFF, we act like PreviewImage (use temp folder)
        # If Save Mode is ON, we act like SaveImage (use output folder)
        
        if save_mode:
            root_dir = list(folder_paths.get_output_directory())[0] if isinstance(folder_paths.get_output_directory(), list) else folder_paths.get_output_directory()
            relative_prefix = filename_prefix
            subfolder = os.path.dirname(os.path.normpath(filename_prefix))
            filename = os.path.basename(os.path.normpath(filename_prefix))
            full_output_dir = os.path.join(root_dir, subfolder)
        else:
             # Preview Mode - use temp
             root_dir = folder_paths.get_temp_directory()
             relative_prefix = "h4_preview_"
             filename = "h4_preview"
             full_output_dir = root_dir

        if not os.path.exists(full_output_dir):
            os.makedirs(full_output_dir, exist_ok=True)
            
        results = list()
        
        # 2. Metadata Preparation
        metadata = PngInfo()
        if prompt is not None:
            metadata.add_text("prompt", json.dumps(prompt))
        if extra_pnginfo is not None:
            for x in extra_pnginfo:
                metadata.add_text(x, json.dumps(extra_pnginfo[x]))
        
        # Inject Custom Metadata
        try:
             if custom_metadata and custom_metadata.strip() != "":
                 user_meta = json.loads(custom_metadata)
                 for k, v in user_meta.items():
                     val_str = json.dumps(v) if isinstance(v, (dict, list)) else str(v)
                     metadata.add_text(k, val_str)
        except Exception as e:
            print(f"[H4_SmartSave] Metadata Error: {e}")

        # 3. Save Loop
        for image in images:
            i = 255. * image.cpu().numpy()
            img = Image.fromarray(np.clip(i, 0, 255).astype(np.uint8))
            
            if save_mode:
                # Save Logic using internal Comfy counter mechanism logic simulation
                # Simplified: we use the standard counter logic or just timestamp?
                # Let's rely on standard counter finding
                
                # Check for %date identifiers?
                # User standard logic
                
                file_name_formatted = filename # Simplified
                
                # We need a counter.
                counter = 1
                while True:
                     file = f"{file_name_formatted}_{counter:05}_.png"
                     if not os.path.exists(os.path.join(full_output_dir, file)):
                         break
                     counter += 1
                     
                file_path = os.path.join(full_output_dir, file)
                img.save(file_path, pnginfo=metadata, compress_level=self.compress_level)
                
                # For UI return (filename, subfolder, type)
                results.append({
                    "filename": file,
                    "subfolder": subfolder,
                    "type": self.type
                })
                
            else:
                # Preview Logic
                # Use a temp name
                import random
                rand_id = random.randint(0, 100000)
                file = f"h4_preview_{rand_id}.png"
                file_path = os.path.join(full_output_dir, file)
                img.save(file_path, pnginfo=metadata, compress_level=1)
                
                results.append({
                    "filename": file,
                    "subfolder": "",
                    "type": "temp"
                })

        return {"ui": {"images": results}, "result": (images,)}
