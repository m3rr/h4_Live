import os
import json
import torch
import numpy as np
from PIL import Image
import folder_paths
import logging
import server
from aiohttp import web
from concurrent.futures import ThreadPoolExecutor
import asyncio

# --- Global Kinetic Executor for Forensic Thumbnails ---
_h4_io_executor = ThreadPoolExecutor(max_workers=4)

# --- Internal H4 Utilities ---
def normalize_root_dir(path):
    if not path: return ""
    return os.path.abspath(path).replace("\\", "/")

def ensure_dir(path):
    if not os.path.exists(path):
        os.makedirs(path, exist_ok=True)

def clean_nan(obj):
    if isinstance(obj, dict):
        return {k: clean_nan(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_nan(x) for x in obj]
    elif isinstance(obj, float):
        if np.isnan(obj) or np.isinf(obj): return 0.0
        return obj
    return obj

class H4_SmartSave:
    def __init__(self):
        self.output_dir = folder_paths.get_output_directory()
        self.type = "output"
        self.prefix_append = ""

    @classmethod
    def INPUT_TYPES(cls):
        modes = [
            "None",
            "Clean (Author)",
            "Lite (Author+Model)",
            "Lite+ (+Prompt)",
            "Full (Forensic)",
            "Custom",
        ]
        return {
            "required": {
                "images": ("IMAGE",),
            },
            "optional": {
                "filename_prefix": ("STRING", {"default": "h4_", "multiline": False}),
                "save_mode": ("BOOLEAN", {"default": False, "label_on": "SAVE TO DISK", "label_off": "PREVIEW ONLY"}),
                "output_path": ("STRING", {"default": "", "multiline": False}),
                "metadata_mode": (modes, {"default": "Lite (Author+Model)"}),
                "json_mode": (modes, {"default": "Full (Forensic)"}),
                "author": ("STRING", {"default": "h4"}),
                "comments": ("STRING", {"default": "h4 - [ Approved ] - (b'.')b", "multiline": True}),
                "custom_json": ("STRING", {"default": "", "multiline": True}),
                "model_name": ("STRING", {"default": "Awesome Model of Awesomeness"}),
            },
            "hidden": {
                "prompt": "PROMPT",
                "extra_pnginfo": "EXTRA_PNGINFO",
                "unique_id": "UNIQUE_ID"
            },
        }

    RETURN_TYPES = ("IMAGE",)
    FUNCTION = "smart_save"
    CATEGORY = "h4/IO"
    OUTPUT_NODE = True

    def _resolve_output(self, filename_prefix, save_mode, output_path):
        if save_mode:
            if output_path and os.path.isabs(output_path):
                full_output_dir = output_path
                subfolder = ""
                filename = os.path.basename(os.path.normpath(filename_prefix)) or "h4_SmartSave"
            else:
                root_dir = normalize_root_dir(folder_paths.get_output_directory())
                norm_prefix = os.path.normpath(filename_prefix)
                prefix_sub = os.path.dirname(norm_prefix)
                filename_base = os.path.basename(norm_prefix) or "h4_SmartSave"
                final_sub = os.path.join(output_path, prefix_sub) if output_path else prefix_sub
                full_output_dir = os.path.join(root_dir, final_sub)
                subfolder = final_sub.replace("\\", "/")
                filename = filename_base
            
            ensure_dir(full_output_dir)
            return full_output_dir, subfolder, filename
        else:
            subfolder = "h4_previews"
            full_output_dir = os.path.join(folder_paths.get_temp_directory(), subfolder)
            ensure_dir(full_output_dir)
            import random
            rand_id = random.randint(1000, 9999)
            file = f"h4_preview_{rand_id}.png"
            json_file = file.replace(".png", ".json")
            return full_output_dir, subfolder, file

    def smart_save(
        self,
        images,
        filename_prefix="h4_",
        save_mode=False,
        metadata_mode="None",
        json_mode="None",
        output_path="",
        author="h4",
        model_name="Awesome Model of Awesomeness",
        comments="h4 - [ Approved ] - (b'.')b",
        custom_json="",
        prompt=None,
        extra_pnginfo=None,
        unique_id=None
    ):
        from core.h4_session_manager import H4_SessionManager

        if images is None or len(images) == 0:
            print("\n[H4_SmartSave] \ud83c\udfaf ABORT: No images detected on input. Verify your output link.")
            return {"ui": {"images": []}, "result": (None,)}

        full_output_dir, subfolder, filename = self._resolve_output(filename_prefix, save_mode, output_path)

        forensics_map = {}
        telemetry = {}

        try:
            fs_manager = H4_SessionManager()
            extracted = fs_manager.extract_metadata(prompt, unique_id) or {}
            forensics_map = extracted.get("nodes", {}) or {}
            telemetry = extracted.get("A") or {}
        except Exception as e:
            print(f"[H4_SmartSave] Forensic Extraction Critical Fault: {e}")

        sidecar_data = self._build_sidecar(
            json_mode=json_mode,
            metadata_mode=metadata_mode,
            author=author,
            model_name=model_name,
            comments=comments,
            custom_json=custom_json,
            forensics_map=forensics_map,
            telemetry=telemetry,
            prompt=prompt,
            extra_pnginfo=extra_pnginfo
        )

        results = []
        for i, tensor in enumerate(images):
            img = Image.fromarray(np.clip(255. * tensor.cpu().numpy(), 0, 255).astype(np.uint8))
            
            if save_mode:
                file_name = f"{filename}_{i+1:04}.png"
                json_name = f"{filename}_{i+1:04}.json"
            else:
                file_name = filename
                json_name = filename.replace(".png", ".json")

            save_path = os.path.join(full_output_dir, file_name)
            json_path = os.path.join(full_output_dir, json_name)

            img.save(save_path, pnginfo=None, compress_level=1)
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(clean_nan(sidecar_data), f, indent=2, ensure_ascii=False)
            
            results.append({
                "filename": file_name,
                "subfolder": subfolder,
                "type": "output" if save_mode else "temp",
                "sidecar": sidecar_data
            })

        return {"ui": {"images": results}, "result": (images,)}

    def _build_sidecar(self, json_mode, metadata_mode, author, model_name, comments, custom_json, forensics_map, telemetry, prompt, extra_pnginfo):
        sidecar_data = {
            "h4_identity": {
                "author": author,
                "model_assigned": model_name,
                "comments": comments,
                "timestamp": server.PromptServer.instance.last_node_id if hasattr(server.PromptServer.instance, 'last_node_id') else 0
            }
        }
        
        if json_mode != "None":
            if json_mode == "Custom" and custom_json:
                try:
                    sidecar_data["custom_dna"] = json.loads(custom_json)
                except:
                    sidecar_data["custom_dna_error"] = "Invalid JSON structure."
            elif json_mode == "Full (Forensic)":
                sidecar_data["h4_forensics"] = forensics_map or {}
        
        return sidecar_data

# --- API ROUTES ---
try:
    from server import PromptServer

    @PromptServer.instance.routes.get("/h4/smart_save/history")
    async def get_smart_save_history(request):
        try:
            history = []
            
            # --- Forensic Scan: Output ---
            out_root = folder_paths.get_output_directory()
            print(f"[H4_SmartSave] Auditing Output Manifest: {out_root}")
            for root, dirs, files in os.walk(out_root):
                for f in files:
                    if f.endswith(".json") and ("h4" in f.lower()):
                        json_path = os.path.join(root, f)
                        try:
                            with open(json_path, "r", encoding="utf-8") as jf:
                                data = json.load(jf)
                                # Be permissive with identity checks
                                img_file = f.replace(".json", ".png")
                                if os.path.exists(os.path.join(root, img_file)):
                                    sub = os.path.relpath(root, out_root)
                                    if sub == ".": sub = ""
                                    history.append({
                                        "filename": img_file,
                                        "subfolder": sub.replace("\\", "/"),
                                        "type": "output",
                                        "timestamp": os.path.getmtime(json_path),
                                        "sidecar": data
                                    })
                        except: continue

            # --- Forensic Scan: Temp ---
            temp_root = folder_paths.get_temp_directory()
            prev_dir = os.path.join(temp_root, "h4_previews")
            print(f"[H4_SmartSave] Auditing Preview Manifest: {prev_dir}")
            if os.path.exists(prev_dir):
                for f in os.listdir(prev_dir):
                    if f.endswith(".png") or f.endswith(".json"):
                        # Accept either PNG or JSON for previews to ensure visibility
                        base_name = os.path.splitext(f)[0]
                        img_file = base_name + ".png"
                        json_file = base_name + ".json"
                        
                        full_img = os.path.join(prev_dir, img_file)
                        if os.path.exists(full_img):
                            # Check if already added
                            if not any(x["filename"] == img_file and x["type"] == "temp" for x in history):
                                history.append({
                                    "filename": img_file,
                                    "subfolder": "h4_previews",
                                    "type": "temp",
                                    "timestamp": os.path.getmtime(full_img),
                                    "sidecar": {} # Will be fetched via sidecar API if needed
                                })

            # Deduplicate and Sort
            history.sort(key=lambda x: x["timestamp"], reverse=True)
            rendered = history[:50]
            print(f"[H4_SmartSave] Forensic Audit Complete: {len(rendered)} assets identified.")
            return web.json_response(clean_nan(rendered))

        except Exception as e:
            print(f"[H4_SmartSave] History Registry Fault: {e}")
            return web.json_response({"error": str(e)}, status=500)

    @PromptServer.instance.routes.get("/h4/smart_save/sidecar")
    async def get_smart_save_sidecar(request):
        try:
            filename = request.query.get("filename")
            subfolder = request.query.get("subfolder", "")
            dir_type = request.query.get("type", "output")

            if not filename:
                return web.Response(status=400)

            root_dir = folder_paths.get_temp_directory() if dir_type == "temp" else folder_paths.get_output_directory()
            root_dir = normalize_root_dir(root_dir)

            base_name = os.path.splitext(filename)[0]
            json_filename = base_name + ".json"
            json_path = os.path.join(root_dir, subfolder, json_filename)

            if not os.path.exists(json_path):
                return web.json_response({"error": "Sidecar not found"}, status=404)

            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            return web.json_response(clean_nan(data))

        except Exception as e:
            print(f"[H4_SmartSave] Sidecar API Error: {e}")
            return web.json_response({"error": str(e)}, status=500)

    @PromptServer.instance.routes.post("/h4/smart_save/cache_swap")
    async def post_smart_save_cache_swap(request):
        try:
            body = await request.json()
            node_id = str(body.get("node_id"))
            values = body.get("values")
            if not node_id: return web.Response(status=400)
            temp_dir = folder_paths.get_temp_directory()
            cache_path = os.path.join(temp_dir, "h4_smart_save_swap_undo.json")
            cache = {}
            if os.path.exists(cache_path):
                try:
                    with open(cache_path, "r", encoding="utf-8") as f: cache = json.load(f)
                except Exception: cache = {}
            cache[node_id] = values
            with open(cache_path, "w", encoding="utf-8") as f: json.dump(clean_nan(cache), f, ensure_ascii=False)
            return web.json_response({"status": "success"})
        except Exception as e: return web.json_response({"error": str(e)}, status=500)

    @PromptServer.instance.routes.get("/h4/smart_save/cache_swap")
    async def get_smart_save_cache_swap(request):
        try:
            node_id = request.query.get("node_id")
            if not node_id: return web.Response(status=400)
            temp_dir = folder_paths.get_temp_directory()
            cache_path = os.path.join(temp_dir, "h4_smart_save_swap_undo.json")
            if not os.path.exists(cache_path): return web.json_response({"error": "Cache empty"}, status=404)
            with open(cache_path, "r", encoding="utf-8") as f: cache = json.load(f)
            node_data = cache.get(str(node_id))
            if node_data is None: return web.json_response({"error": "Node not in cache"}, status=404)
            return web.json_response({"values": clean_nan(node_data)})
        except Exception as e: return web.json_response({"error": str(e)}, status=500)

    @PromptServer.instance.routes.get("/h4/thumbnail")
    async def get_smart_save_thumbnail(request):
        try:
            filename = request.query.get("filename")
            subfolder = request.query.get("subfolder", "")
            dir_type = request.query.get("type", "output")
            full_res = request.query.get("full", "false").lower() == "true"

            if not filename: return web.Response(status=400)
            
            # --- Robust Path Resolution ---
            if dir_type == "temp":
                root_dir = folder_paths.get_temp_directory()
            else:
                root_dir = folder_paths.get_output_directory()
            
            img_path = os.path.normpath(os.path.join(root_dir, subfolder, filename))
            
            if not os.path.exists(img_path):
                # Critical Fallback: Try checking the other root just in case of mis-labeling
                alt_root = folder_paths.get_output_directory() if dir_type == "temp" else folder_paths.get_temp_directory()
                img_path = os.path.normpath(os.path.join(alt_root, subfolder, filename))
                if not os.path.exists(img_path): return web.Response(status=404)

            if full_res: return web.FileResponse(img_path)

            # --- Cache Management ---
            cache_dir = os.path.normpath(os.path.join(folder_paths.get_temp_directory(), "h4_thumbs_v3"))
            if not os.path.exists(cache_dir): os.makedirs(cache_dir, exist_ok=True)
            
            # Sanitized Cache Name
            safe_sub = subfolder.replace("\\", "_").replace("/", "_")
            thumb_name = f"h4_t3_{dir_type}_{safe_sub}_{filename}.jpg"
            thumb_path = os.path.join(cache_dir, thumb_name)

            # --- Manifest Retrieval ---
            if os.path.exists(thumb_path) and os.path.getmtime(thumb_path) >= os.path.getmtime(img_path):
                return web.FileResponse(thumb_path)

            # --- Synchronous Forensic Manifestation (Stabilization Mode) ---
            with Image.open(img_path) as img:
                # Convert to RGB for JPEG compatibility (RGBA fix)
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                img.thumbnail((160, 160), Image.LANCZOS)
                img.save(thumb_path, "JPEG", quality=90, optimize=True)

            return web.FileResponse(thumb_path)
            
        except Exception as e:
            print(f"[H4_SmartSave] Kinetic Audit Failure: {e}")
            return web.Response(status=500)

except Exception as e:
    print(f"[H4_SmartSave] Failed api register: {e}")