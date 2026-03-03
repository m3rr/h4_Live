
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
                "custom_metadata": ("STRING", {"default": '{\n  "author": "h4",\n  "details": "an awesome image",\n  "model": "awesome model",\n  "date": "Awesome day!!",\n  "Comments": "You\'re only capable of your best, when you\'ve been through your worst. Be Your Best",\n  "extra_01": "This is filler data",\n  "extra_02": "To show the list",\n  "extra_03": "Can hold many keys",\n  "extra_04": "Structured data",\n  "extra_05": "Easy parsing",\n  "extra_06": "Json format",\n  "extra_07": "User defined",\n  "extra_08": "Flexible",\n  "extra_09": "Scalable",\n  "extra_10": "Awesome"\n}', "multiline": True, "placeholder": '{\n  "author": "h4",\n  "details": "an awesome image",\n  "model": "awesome model",\n  "date": "Awesome day!!",\n  "Comments": "You\'re only capable of your best, when you\'ve been through your worst. Be Your Best",\n  "extra_01": "This is filler data",\n  "extra_02": "To show the list",\n  "extra_03": "Can hold many keys",\n  "extra_04": "Structured data",\n  "extra_05": "Easy parsing",\n  "extra_06": "Json format",\n  "extra_07": "User defined",\n  "extra_08": "Flexible",\n  "extra_09": "Scalable",\n  "extra_10": "Awesome"\n}'}),
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
            root_dir = folder_paths.get_output_directory()
            # Handle list return type from ComfyUI (some versions)
            if isinstance(root_dir, list):
                root_dir = root_dir[0]
                
            # Normalize path for OS compatibility
            norm_prefix = os.path.normpath(filename_prefix)
            subfolder = os.path.dirname(norm_prefix)
            filename = os.path.basename(norm_prefix)
            
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

        # 4. FIFO Pruning (Save Mode Only)
        if save_mode:
             self._prune_files(full_output_dir, filename_prefix, limit=50)

        return {"ui": {"images": results}, "result": (images,)}
    
    def _prune_files(self, folder, prefix, limit=50):
        try:
            # Safely identify candidates
            # We match strict prefix
            candidates = []
            
            # Subfolder handling in prefix
            norm_prefix = os.path.normpath(prefix)
            base_filename = os.path.basename(norm_prefix) # e.g. "h4_" from "sub/h4_"
            
            # Since full_output_dir already includes the subfolder,
            # we just look for files starting with base_filename
            
            for f in os.listdir(folder):
                if f.startswith(base_filename) and f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
                    full = os.path.join(folder, f)
                    try:
                        candidates.append((full, os.path.getmtime(full)))
                    except: pass
            
            # Sort Newest First
            candidates.sort(key=lambda x: x[1], reverse=True)
            
            if len(candidates) > limit:
                to_delete = candidates[limit:]
                print(f"[H4_SmartSave] Pruning {len(to_delete)} old files (Limit: {limit})")
                for path, _ in to_delete:
                    try:
                        os.remove(path)
                    except Exception as e:
                        print(f"[H4_SmartSave] Error pruning {path}: {e}")
                        
        except Exception as e:
            print(f"[H4_SmartSave] Pruning Failed: {e}")

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
        # print(f"[H4_SmartSave] History scan requested...")
        history = []
        try:
            output_dir = folder_paths.get_output_directory()
            temp_dir = folder_paths.get_temp_directory()

            # Supported Extensions
            exts = ('.png', '.jpg', '.jpeg', '.webp')
            
            # Scan both output and temp directories
            # Preview-mode images go to temp, Save-mode images go to output
            scan_targets = []
            if output_dir:
                if isinstance(output_dir, list):
                     for d in output_dir:
                         if os.path.exists(d): scan_targets.append((d, "output"))
                elif os.path.exists(output_dir):
                    scan_targets.append((output_dir, "output"))
            if temp_dir and os.path.exists(temp_dir):
                scan_targets.append((temp_dir, "temp"))
            
            if not scan_targets:
                return web.json_response([])
            
            files_found = []
            
            # [H4] Performance Optimization: Limited recursive scan for subfolders
            for base_dir, dir_type in scan_targets:
                try:
                    for root, dirs, files in os.walk(base_dir):
                        # Limit depth to prevent massive hangs. depth=0 is base_dir. Max depth 2.
                        depth = root[len(base_dir):].count(os.sep)
                        if depth > 2:
                            del dirs[:] # Stop recursing here
                            continue

                        for file in files:
                            if file.lower().endswith(exts):
                                full_path = os.path.join(root, file)
                                try:
                                    files_found.append((full_path, os.path.getmtime(full_path), base_dir, dir_type))
                                except OSError:
                                    pass
                except Exception as e:
                    print(f"[H4_SmartSave] Scan error for {base_dir}: {e}")

            # Sort by Modified Time (Newest First)
            files_found.sort(key=lambda x: x[1], reverse=True)
            # Limit to top 15 for the filmstrip UI
            top_limited = files_found[:15]
            
            for path, mtime, base_dir, dir_type in top_limited:
                try:
                    rel_path = os.path.relpath(path, base_dir)
                    subfolder = os.path.dirname(rel_path)
                    filename = os.path.basename(rel_path)
                    subfolder = subfolder.replace("\\", "/")
                    
                    # [H4] LAZY LOADING: We NO LONGER open the image here.
                    # Metadata fetch is deferred to the /h4/metadata endpoint.
                    history.append({
                        "filename": filename,
                        "subfolder": subfolder,
                        "type": dir_type,
                        "timestamp": int(mtime * 1000)
                    })
                    
                except Exception as e:
                    print(f"[H4_SmartSave] Error processing {path}: {e}")
                    continue
                    
            # print(f"[H4_SmartSave] Found {len(files_found)} images. Returning top 50.")
            # print(f"[H4_SmartSave] Found {len(files_found)} images. Returning top 50.")
            
            # [H4] FIFO Check on GET?
            # User requested pruning "in the film strip"
            # We did pruning on SAVE, but if files accumulate from other sources, we might want to ensure consistency.
            # However, deleting files just by viewing is risky if the prefix isn't known here (we scan everything).
            # So we only prune on SAVE.
            
            # [H4] Sanitize NaN/Inf values which break JS JSON.parse
            import math
            def clean_nan(obj):
                if isinstance(obj, float):
                    if math.isnan(obj) or math.isinf(obj):
                        return None
                elif isinstance(obj, dict):
                    return {k: clean_nan(v) for k, v in obj.items()}
                elif isinstance(obj, list):
                    return [clean_nan(v) for v in obj]
                return obj

            history = clean_nan(history)

            # print(f"[H4_SmartSave] Returning {len(history)} items to frontend.")
            return web.json_response(history)
            
        except Exception as e:
            print(f"[H4_SmartSave] History API Error: {e}")
            return web.json_response({"error": str(e)}, status=500)

except Exception as e:
    print(f"[H4_SmartSave] Failed api register: {e}")
