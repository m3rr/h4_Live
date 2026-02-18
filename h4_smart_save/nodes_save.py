
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
            i = 255. * image.cpu().float().numpy()
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

# --- API FOR HISTORY ---
try:
    from server import PromptServer
    from aiohttp import web

    @PromptServer.instance.routes.get("/h4/smart_save/history")
    async def get_smart_save_history(request):
        """
        Scans output folder for images, returning the 50 most recent.
        Format: JSON list of { filename, subfolder, type, timestamp, metadata }
        """
        history = []
        try:
            output_dir = folder_paths.get_output_directory()
            if not os.path.exists(output_dir):
                return web.json_response([])

            # Supported Extensions
            exts = ('.png', '.jpg', '.jpeg', '.webp')
            
            # recursive scan (limit depth? no, just simple walk)
            # Actually, standard Comfy only scans top level or specific subfolders.
            # let's scan recursively but be careful.
            # To be safe and fast: just scan the root output dir + 1 level deep?
            # Or just use os.walk and limit count?
            
            files_found = []
            
            for root, dirs, files in os.walk(output_dir):
                for f in files:
                    if f.lower().endswith(exts):
                        full_path = os.path.join(root, f)
                        try:
                            stats = os.stat(full_path)
                            files_found.append((full_path, stats.st_mtime))
                        except:
                            continue

            # Sort by Modified Time (Newest First)
            files_found.sort(key=lambda x: x[1], reverse=True)
            
            # Take top 50
            top_50 = files_found[:50]
            
            for path, mtime in top_50:
                try:
                    # Relativize path for ComfyUI API
                    rel_path = os.path.relpath(path, output_dir)
                    subfolder = os.path.dirname(rel_path)
                    filename = os.path.basename(rel_path)
                    
                    # Read Metadata (Heavy I/O? accept it for 50 items)
                    img = Image.open(path)
                    info = img.info
                    
                    # Parse Prompt/Workflow if exists
                    prompt = None
                    workflow = None
                    user_meta = {}
                    
                    if "prompt" in info:
                        try: prompt = json.loads(info["prompt"])
                        except: pass
                    
                    if "workflow" in info:
                         try: workflow = json.loads(info["workflow"])
                         except: pass
                         
                    # Custom H4 Metadata (stored as text keys usually)
                    # We iterate all info keys to find non-standard ones
                    for k, v in info.items():
                        if k not in ["prompt", "workflow"]:
                             user_meta[k] = v

                    history.append({
                        "filename": filename,
                        "subfolder": subfolder,
                        "type": "output",
                        "timestamp": int(mtime * 1000),
                        "prompt": prompt,
                        "workflow": workflow,
                        "user_meta": user_meta,
                        "width": img.width,
                        "height": img.height
                    })
                    
                except Exception as e:
                    print(f"[H4_SmartSave] Error reading {path}: {e}")
                    continue
                    
            return web.json_response(history)
            
        except Exception as e:
            print(f"[H4_SmartSave] History API Error: {e}")
            return web.json_response({"error": str(e)}, status=500)

except Exception as e:
    print(f"[H4_SmartSave] Failed api register: {e}")
