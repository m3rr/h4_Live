
import os
import json
import datetime
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
                "save_mode": ("BOOLEAN", {"default": False, "label_on": "SAVE TO DISK", "label_off": "PREVIEW ONLY"}),
                "output_path": ("STRING", {"default": "", "multiline": False}),
                "author": ("STRING", {"default": "h4"}),
                "model_name": ("STRING", {"default": "Awesome Model of Awesomeness"}),
                "comments": ("STRING", {"default": "You're only at your best, when you've been through the worst\n(b'.')b - Be Your best - h4", "multiline": True}),
                "custom_json": ("STRING", {"default": "", "multiline": True})
            },
            "hidden": {"prompt": "PROMPT", "extra_pnginfo": "EXTRA_PNGINFO"},
        }

    RETURN_TYPES = ("IMAGE", )
    FUNCTION = "smart_save"
    CATEGORY = "h4/IO"
    OUTPUT_NODE = True

    def smart_save(self, images, filename_prefix, save_mode, output_path="", author="h4", model_name="", comments="", custom_json="", prompt=None, extra_pnginfo=None):
        if save_mode:
            # Handle Path Overrides
            if output_path and os.path.isabs(output_path):
                full_output_dir = output_path
                subfolder = ""
            else:
                root_dir = folder_paths.get_output_directory()
                if isinstance(root_dir, list): root_dir = root_dir[0]
                
                # Combine user output_path with prefix subfolder
                norm_prefix = os.path.normpath(filename_prefix)
                prefix_sub = os.path.dirname(norm_prefix)
                filename_base = os.path.basename(norm_prefix)
                
                final_sub = os.path.join(output_path, prefix_sub) if output_path else prefix_sub
                full_output_dir = os.path.join(root_dir, final_sub)
                subfolder = final_sub
                filename = filename_base
        else:
             root_dir = folder_paths.get_temp_directory()
             filename = "h4_preview"
             subfolder = ""
             full_output_dir = root_dir

        if not os.path.exists(full_output_dir):
            os.makedirs(full_output_dir, exist_ok=True)
            
        results = list()
        
        # Metadata Prep
        # WORKFLOW INTELLIGENCE: Trace back to find generation DNA
        telemetry_data = []
        if prompt is not None:
            try:
                # Find the KSampler or similar node that produced the images
                # We look for nodes that take 'model', 'positive', 'negative' and have 'steps', 'cfg', etc.
                sampler_nodes = []
                for node_id, node_data in prompt.items():
                    class_type = node_data.get("class_type", "")
                    if any(x in class_type.lower() for x in ["sampler", "sampling"]):
                        sampler_nodes.append(node_data)
                
                if sampler_nodes:
                    # Sort nodes to find the most likely 'main' sampler (heuristic: largest ID or last executed)
                    main_sampler = sampler_nodes[-1]
                    s_type = main_sampler.get("class_type", "Unknown Sampler")
                    s_inputs = main_sampler.get("inputs", {})
                    
                    telemetry_data.append(f"SAMPLER: {s_type}")
                    telemetry_data.append(f"STEPS: {s_inputs.get('steps', '?')}")
                    telemetry_data.append(f"CFG: {s_inputs.get('cfg', '?')}")
                    telemetry_data.append(f"SAMPLER_NAME: {s_inputs.get('sampler_name', '?')}")
                    telemetry_data.append(f"SCHEDULER: {s_inputs.get('scheduler', '?')}")
                    telemetry_data.append(f"SEED: {s_inputs.get('seed', '?')}")

                    # Trace Positive/Negative prompts
                    def get_text_from_link(link_data):
                        if isinstance(link_data, list) and len(link_data) > 0:
                            source_node_id = str(link_data[0])
                            source_node = prompt.get(source_node_id)
                            if source_node:
                                inputs = source_node.get("inputs", {})
                                return inputs.get("text", inputs.get("string", ""))
                        return ""

                    pos_text = get_text_from_link(s_inputs.get("positive"))
                    neg_text = get_text_from_link(s_inputs.get("negative"))
                    if pos_text: telemetry_data.append(f"\nPOSITIVE PROMPT:\n{pos_text}")
                    if neg_text: telemetry_data.append(f"\nNEGATIVE PROMPT:\n{neg_text}")

                # Find Model
                for node_id, node_data in prompt.items():
                    class_type = node_data.get("class_type", "")
                    if "checkpointloader" in class_type.lower():
                        telemetry_data.append(f"\nMODEL: {node_data.get('inputs', {}).get('ckpt_name', 'Unknown')}")
                        break

            except Exception as e:
                telemetry_data.append(f"Workflow Intelligence Error: {e}")

        telemetry_str = "\n".join(telemetry_data) if telemetry_data else "NO WORKFLOW DNA DETECTED"

        # Sidecar and Metadata updates
        sidecar_data = {
            "Author": author,
            "Model": model_name,
            "Comments": comments,
            "h4_timestamp": datetime.datetime.now().isoformat(),
            "telemetry": telemetry_str
        }

        # Merge custom JSON if valid
        if custom_json.strip():
            try:
                custom_data = json.loads(custom_json)
                if isinstance(custom_data, dict):
                    sidecar_data.update(custom_data)
            except Exception as e:
                logging.warning(f"h4_SmartSave: Failed to parse custom_json: {e}")

        metadata = PngInfo()
        metadata.add_text("Author", author)
        metadata.add_text("Model", model_name)
        metadata.add_text("Comments", comments)

        if prompt is not None:
            metadata.add_text("prompt", json.dumps(prompt))
            sidecar_data["prompt"] = prompt
        if extra_pnginfo is not None:
            for x in extra_pnginfo:
                metadata.add_text(x, json.dumps(extra_pnginfo[x]))
                sidecar_data[x] = extra_pnginfo[x]
        
        for image in images:
            i = 255. * image.cpu().float().numpy()
            img = Image.fromarray(np.clip(i, 0, 255).astype(np.uint8))
            
            if save_mode:
                counter = 1
                while True:
                     file = f"{filename}_{counter:05}_.png"
                     json_file = f"{filename}_{counter:05}_.json"
                     if not os.path.exists(os.path.join(full_output_dir, file)):
                         break
                     counter += 1
                     
                file_path = os.path.join(full_output_dir, file)
                json_path = os.path.join(full_output_dir, json_file)
                
                img.save(file_path, pnginfo=metadata, compress_level=self.compress_level)
                with open(json_path, 'w', encoding='utf-8') as f:
                    json.dump(sidecar_data, f, indent=2, ensure_ascii=False)
                
                results.append({
                    "filename": file,
                    "subfolder": subfolder,
                    "type": "output"
                })
            else:
                import random
                rand_id = random.randint(0, 1000000)
                file = f"h4_preview_{rand_id}.png"
                file_path = os.path.join(full_output_dir, file)
                img.save(file_path, pnginfo=metadata, compress_level=1)
                
                results.append({
                    "filename": file,
                    "subfolder": "",
                    "type": "temp"
                })

        if save_mode:
             self._prune_files(full_output_dir, filename_prefix, limit=25)

        return {"ui": {"images": results}, "result": (images,)}

        return {"ui": {"images": results}, "result": (images,)}
    
    def _prune_files(self, folder, prefix, limit=25):
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
            
            files_found = []
            
            # [H4] High-Performance Scan Optimization
            # Instead of a deep walk, we do a targeted breadth scan of base_dir and its immediate subfolders.
            for base_dir, dir_type in scan_targets:
                try:
                    # 1. Scan root files first
                    with os.scandir(base_dir) as it:
                        for entry in it:
                            if entry.is_file() and entry.name.lower().endswith(exts):
                                if "thumb_" in entry.name.lower(): continue
                                try:
                                    files_found.append((entry.path, entry.stat().st_mtime, base_dir, dir_type))
                                except OSError: pass
                            
                            # 2. Scan immediate subfolders (one level deep is usually enough for prefix/subfolders)
                            elif entry.is_dir() and not entry.name.startswith("."):
                                try:
                                    with os.scandir(entry.path) as sub_it:
                                        for sub_entry in sub_it:
                                            if sub_entry.is_file() and sub_entry.name.lower().endswith(exts):
                                                if "thumb_" in sub_entry.name.lower(): continue
                                                try:
                                                    files_found.append((sub_entry.path, sub_entry.stat().st_mtime, base_dir, dir_type))
                                                except OSError: pass
                                except Exception: pass
                                
                    # Safety Break: If we found thousands of files, we stop there to prevent API hanging.
                    if len(files_found) > 1000:
                         break
                except Exception as e:
                    print(f"[H4_SmartSave] Scan error for {base_dir}: {e}")

            # [H4] NUCLEAR DIAGNOSTICS: Logging newest discovery
            files_found.sort(key=lambda x: (x[1], x[0]), reverse=True)
            top_limited = files_found[:25]
            
            if top_limited:
                print(f"[H4_SmartSave] 🎯 NEWEST FILE IN SCAN: {os.path.basename(top_limited[0][0])} | MTIME: {top_limited[0][1]}")
            
            seen_filenames = set()
            for path, mtime, base_dir, dir_type in top_limited:
                try:
                    rel_path = os.path.relpath(path, base_dir)
                    subfolder = os.path.dirname(rel_path)
                    filename = os.path.basename(rel_path)
                    subfolder = subfolder.replace("\\", "/")
                    
                    # De-duplication: If we see the same filename (e.g. Temp vs Output), keep newest
                    if filename in seen_filenames: continue
                    seen_filenames.add(filename)
                    
                    history.append({
                        "filename": filename,
                        "subfolder": subfolder,
                        "type": dir_type,
                        "timestamp": int(mtime * 1000)
                    })
                except Exception as e:
                    print(f"[H4_SmartSave] Error processing {path}: {e}")
                    continue
            
            # [H4] Sanitize NaN/Inf values which break JS JSON.parse
            import math
            def clean_nan(obj):
                if isinstance(obj, (float, int)):
                    if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
                        return None
                elif isinstance(obj, dict):
                    return {k: clean_nan(v) for k, v in obj.items()}
                elif isinstance(obj, list):
                    return [clean_nan(v) for v in obj]
                return obj

            history = clean_nan(history)
            return web.json_response(history)
            
        except Exception as e:
            print(f"[H4_SmartSave] History API Error: {e}")
            return web.json_response({"error": str(e)}, status=500)

    @PromptServer.instance.routes.get("/h4/thumbnail")
    async def get_smart_save_thumbnail(request):
        """
        Serves an image from the vault. 
        If 'full=true' is passed, serves the original high-resolution file.
        Otherwise, serves a resized thumbnail for the history rail.
        """
        try:
            filename = request.query.get("filename")
            subfolder = request.query.get("subfolder", "")
            dir_type = request.query.get("type", "output")
            full_res = request.query.get("full", "false").lower() == "true"
            
            if not filename:
                return web.Response(status=400)
            
            # Resolve root
            if dir_type == "temp":
                root_dir = folder_paths.get_temp_directory()
            else:
                root_dir = folder_paths.get_output_directory()
                if isinstance(root_dir, list): root_dir = root_dir[0]
            
            # Final Path
            img_path = os.path.join(root_dir, subfolder, filename)
            if not os.path.exists(img_path):
                return web.Response(status=404)
            
            # 1. SERVE FULL RESOLUTION
            if full_res:
                return web.FileResponse(img_path)
            
            # 2. SERVE OPTIMIZED THUMBNAIL
            # Check for existing h4_thumb_ prefix to avoid re-generating
            cache_dir = os.path.join(folder_paths.get_temp_directory(), "h4_thumbs")
            os.makedirs(cache_dir, exist_ok=True)
            
            thumb_name = f"h4_thumb_{filename}"
            thumb_path = os.path.join(cache_dir, thumb_name)
            
            if os.path.exists(thumb_path):
                return web.FileResponse(thumb_path)
            
            # Generate Thumb JIT
            with Image.open(img_path) as img:
                # Square Crop for history rail
                side = min(img.width, img.height)
                left = (img.width - side) / 2
                top = (img.height - side) / 2
                img = img.crop((left, top, left + side, top + side))
                
                img.thumbnail((256, 256))
                img.save(thumb_path, "PNG", compress_level=1)
            
            return web.FileResponse(thumb_path)
            
        except Exception as e:
            print(f"[H4_SmartSave] Thumbnail API Error: {e}")
            return web.Response(status=500)

except Exception as e:
    print(f"[H4_SmartSave] Failed api register: {e}")
