import os
import json
import torch
import numpy as np
from PIL import Image
import folder_paths
import logging
import server
import sqlite3
import threading
from aiohttp import web
from concurrent.futures import ThreadPoolExecutor
import asyncio

# --- Global Kinetic Executor for Forensic Thumbnails ---
_h4_io_executor = ThreadPoolExecutor(max_workers=16)

def get_h4_thumb_path(filename, subfolder, dir_type):
    cache_dir = os.path.normpath(os.path.join(folder_paths.get_temp_directory(), "h4_thumbs_v3"))
    if not os.path.exists(cache_dir): os.makedirs(cache_dir, exist_ok=True)
    safe_sub = subfolder.replace("\\", "_").replace("/", "_")
    return os.path.join(cache_dir, f"h4_t3_{dir_type}_{safe_sub}_{filename}.jpg")

def generate_h4_thumbnail(img_or_path, thumb_path):
    """
    Kinetic Forensic Manifestation: Generates a 160x160 JPEG thumbnail.
    Handles both PIL objects (eager) and file paths (lazy/API).
    """
    try:
        source_img = None
        if isinstance(img_or_path, str):
            if not os.path.exists(img_or_path):
                return False
            # Check if it's already a thumbnail request for a thumb
            if img_or_path == thumb_path: return True
            source_img = Image.open(img_or_path)
        else:
            # Thread-safe copy of the PIL object
            source_img = img_or_path.copy()

        if source_img:
            # Ensure we are in RGB mode for JPEG compatibility
            if source_img.mode != 'RGB':
                source_img = source_img.convert('RGB')
            
            # Sub-sampled resizing (LANCZOS is the industrial standard here)
            source_img.thumbnail((160, 160), Image.LANCZOS)
            
            # Save to disk with aggressive optimization
            source_img.save(thumb_path, "JPEG", quality=80, optimize=True)
            source_img.close()
            return True
            
    except Exception as e:
        # We catch but don't crash, as this is a background forensic step
        print(f"[H4_Thumb] Forensic Manifestation Fault: {e}")
    return False

class H4_ManifestCache:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(H4_ManifestCache, cls).__new__(cls)
                cls._instance._init_db()
        return cls._instance

    def _init_db(self):
        try:
            temp_dir = folder_paths.get_temp_directory()
            if not os.path.exists(temp_dir):
                os.makedirs(temp_dir, exist_ok=True)
            self.db_path = os.path.abspath(os.path.join(temp_dir, "h4_smart_manifest_v1.db"))
            
            conn = sqlite3.connect(self.db_path)
            try:
                # Force WAL mode for better concurrency in ComfyUI's multi-threaded/async env
                conn.execute("PRAGMA journal_mode=WAL")
                with conn:
                    conn.execute("""
                        CREATE TABLE IF NOT EXISTS assets (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            filename TEXT,
                            subfolder TEXT,
                            type TEXT,
                            timestamp REAL,
                            sidecar TEXT
                        )
                    """)
                    conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_asset_uniq ON assets(filename, subfolder, type)")
                    conn.execute("CREATE INDEX IF NOT EXISTS idx_asset_time ON assets(timestamp DESC)")
                print(f"[H4_Manifest] DNA Registry Initialized: {self.db_path}")
            finally:
                conn.close()
        except Exception as e:
            print(f"[H4_Manifest] Registry Critical Initialization Failure: {e}")

    def _ensure_schema(self, conn):
        """Failsafe check to ensure table exists in the current connection context."""
        try:
            conn.execute("SELECT 1 FROM assets LIMIT 1")
        except sqlite3.OperationalError as e:
            if "no such table" in str(e).lower():
                print("[H4_Manifest] Table 'assets' missing in active connection. Re-initializing...")
                self._init_db()

    def record(self, filename, subfolder, dir_type, timestamp, sidecar):
        conn = None
        try:
            # --- FIFO Cache Management: Thumbnails ---
            cache_dir = os.path.join(folder_paths.get_temp_directory(), "h4_thumbs_v3")
            if os.path.exists(cache_dir):
                thumbs = [os.path.join(cache_dir, f) for f in os.listdir(cache_dir)]
                if len(thumbs) > 300:
                    thumbs.sort(key=os.path.getmtime)
                    for old_thumb in thumbs[:50]:
                        try: os.remove(old_thumb)
                        except: pass

            conn = sqlite3.connect(self.db_path)
            self._ensure_schema(conn)
            with conn:
                conn.execute("""
                    INSERT INTO assets (filename, subfolder, type, timestamp, sidecar) 
                    VALUES (?, ?, ?, ?, ?)
                    ON CONFLICT(filename, subfolder, type) 
                    DO UPDATE SET timestamp=excluded.timestamp, sidecar=excluded.sidecar
                """, (filename, subfolder, dir_type, timestamp, json.dumps(sidecar)))
        except Exception as e:
            print(f"[H4_Manifest] Registry Mutation Failure: {e}")
        finally:
            if conn: conn.close()

    def query_history(self, limit=10):
        conn = None
        try:
            conn = sqlite3.connect(self.db_path)
            self._ensure_schema(conn)
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("SELECT filename, subfolder, type, timestamp, sidecar FROM assets ORDER BY timestamp DESC LIMIT ?", (limit,))
            results = []
            for row in cursor:
                results.append({
                    "filename": row["filename"],
                    "subfolder": row["subfolder"],
                    "type": row["type"],
                    "timestamp": row["timestamp"],
                    "sidecar": json.loads(row["sidecar"]) if row["sidecar"] else {}
                })
            return results
        except Exception as e:
            # Final fallback to avoid crash-loop
            if "no such table" in str(e).lower():
                print("[H4_Manifest] Schema recovery failed in query_history.")
            else:
                print(f"[H4_Manifest] Registry Query Failure: {e}")
            return []
        finally:
            if conn: conn.close()

    def report_status(self):
        # Verification pass on boot
        conn = None
        try:
            conn = sqlite3.connect(self.db_path)
            self._ensure_schema(conn)
            print(f"[H4_Manifest] DNA Registry Active & Verified at: {self.db_path}")
        except:
            print(f"[H4_Manifest] DNA Registry Active (Schema Pending) at: {self.db_path}")
        finally:
            if conn: conn.close()

    def cold_boot_sync(self):
        # --- Flat Shallow Scan Only (Performance Priority) ---
        out_root = folder_paths.get_output_directory()
        temp_root = folder_paths.get_temp_directory()
        prev_dir = os.path.join(temp_root, "h4_previews")
        
        found = []
        
        # 1. Output Root & h4_* Subdirs
        scan_paths = [out_root]
        if os.path.exists(out_root):
             with os.scandir(out_root) as it:
                 for entry in it:
                     if entry.is_dir() and entry.name.startswith("h4"):
                         scan_paths.append(entry.path)
        
        for p in scan_paths:
            if not os.path.exists(p): continue
            with os.scandir(p) as it:
                for entry in it:
                    if entry.is_file() and entry.name.endswith(".json") and "h4" in entry.name.lower():
                        img_file = entry.name.replace(".json", ".png")
                        if os.path.exists(os.path.join(p, img_file)):
                            sub = os.path.relpath(p, out_root) if p.startswith(out_root) else ""
                            if sub == ".": sub = ""
                            try:
                                with open(entry.path, "r", encoding="utf-8") as f:
                                    data = json.load(f)
                                record = (img_file, sub.replace("\\", "/"), "output", os.path.getmtime(entry.path), json.dumps(data))
                                found.append(record)
                            except: continue

        # 2. Previews
        if os.path.exists(prev_dir):
            with os.scandir(prev_dir) as it:
                for entry in it:
                    if entry.is_file() and entry.name.endswith(".png"):
                        record = (entry.name, "h4_previews", "temp", os.path.getmtime(entry.path), "{}")
                        found.append(record)

        if found:
            conn = None
            try:
                conn = sqlite3.connect(self.db_path)
                with conn:
                    conn.executemany("INSERT OR IGNORE INTO assets (filename, subfolder, type, timestamp, sidecar) VALUES (?, ?, ?, ?, ?)", found)
                print(f"[H4_Manifest] Cold Boot Complete: {len(found)} assets indexed.")
            except Exception as e:
                print(f"[H4_Manifest] Cold Boot Sync Fault: {e}")
            finally:
                if conn: conn.close()

_manifest = H4_ManifestCache()

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
            file = f"h4_preview_{rand_id}" # Stem only
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
        print(f"[H4_SmartSave] DEBUG: Received save_mode = {save_mode} (Type: {type(save_mode)})")
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

        # --- SMART COUNTER: Resolve next available slot to prevent generational overwrites ---
        clean_prefix = filename[:-1] if filename.endswith("_") else filename
        def get_max_counter(target_dir, pfx):
            import re
            pattern = re.compile(rf"^{re.escape(pfx)}_(\d+)\.png$")
            found_max = 0
            if os.path.exists(target_dir):
                for f in os.listdir(target_dir):
                    m = pattern.match(f)
                    if m: found_max = max(found_max, int(m.group(1)))
            return found_max

        start_counter = get_max_counter(full_output_dir, clean_prefix) + 1
        results = []

        for i, tensor in enumerate(images):
            img = Image.fromarray(np.clip(255. * tensor.cpu().numpy(), 0, 255).astype(np.uint8))
            
            # --- SEQUENTIAL ASSIGNMENT ---
            current_count = start_counter + i
            file_name = f"{clean_prefix}_{current_count:04}.png"
            json_name = f"{clean_prefix}_{current_count:04}.json"

            save_path = os.path.abspath(os.path.join(full_output_dir, file_name))
            json_path = os.path.abspath(os.path.join(full_output_dir, json_name))

            print(f"[H4_SmartSave] [IO] Target: {save_path} (Mode: {'SAVE' if save_mode else 'PREVIEW'})")

            img.save(save_path, pnginfo=None, compress_level=1)
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(clean_nan(sidecar_data), f, indent=2, ensure_ascii=False)
            
            save_res = {
                "filename": file_name,
                "subfolder": subfolder,
                "type": "output" if save_mode else "temp",
                "sidecar": sidecar_data,
                "timestamp": os.path.getmtime(save_path)
            }
            results.append(save_res)

            # --- Synchronize Manifest Registry ---
            _manifest.record(
                filename=file_name,
                subfolder=subfolder,
                dir_type=save_res["type"],
                timestamp=save_res["timestamp"],
                sidecar=sidecar_data
            )

            # --- Eager Kinetic Thumbnailing (Background) ---
            t_path = get_h4_thumb_path(file_name, subfolder, save_res["type"])
            _h4_io_executor.submit(generate_h4_thumbnail, img, t_path)

        return {"ui": {"images": results}, "result": (images,)}

    def _build_sidecar(self, json_mode, metadata_mode, author, model_name, comments, custom_json, forensics_map, telemetry, prompt, extra_pnginfo):
        sidecar_data = {}

        # --- 1. IDENTITY BLOCK (Controlled by metadata_mode) ---
        if metadata_mode == "Custom":
            # --- OVERRIDE: Use custom payload as the primary identity ---
            if custom_json:
                try:
                    sidecar_data["h4_identity"] = json.loads(custom_json)
                except:
                    sidecar_data["h4_identity"] = {"raw_custom": custom_json}
        elif metadata_mode != "None":
            identity = {
                "h4_timestamp": server.PromptServer.instance.last_node_id if hasattr(server.PromptServer.instance, "last_node_id") else 0
            }
            
            # --- Hierarchical Mapping ---
            if metadata_mode in ["Clean (Author)", "Lite (Author+Model)", "Lite+ (+Prompt)", "Full (Forensic)"]:
                identity["author"] = author
            
            if metadata_mode in ["Lite (Author+Model)", "Lite+ (+Prompt)", "Full (Forensic)"]:
                identity["model_assigned"] = model_name
                
            if metadata_mode in ["Lite+ (+Prompt)", "Full (Forensic)"]:
                identity["comments"] = comments

            sidecar_data["h4_identity"] = identity

        # --- 2. DATA PAYLOADS (Controlled by json_mode) ---
        if json_mode != "None":
            if json_mode == "Custom" and custom_json:
                try:
                    # Attempt to parse as JSON. If it fails, we treat it as raw text.
                    sidecar_data["custom_dna"] = json.loads(custom_json)
                except:
                    sidecar_data["custom_dna"] = custom_json
            elif json_mode == "Full (Forensic)":
                sidecar_data["h4_forensics"] = forensics_map or {}
                # Also include telemetry if available
                if telemetry:
                    sidecar_data["h4_telemetry"] = telemetry
        
        return sidecar_data

# --- API ROUTES ---
try:
    from server import PromptServer

    @PromptServer.instance.routes.get("/h4/smart_save/history")
    async def get_smart_save_history(request):
        try:
            # Shift to 5 thumbnails per user request for performance
            history = _manifest.query_history(limit=5)
            
            # --- Optional Cold Boot Migration (Only if empty) ---
            if not history:
                _manifest.cold_boot_sync()
                history = _manifest.query_history(limit=5)

            return web.json_response(clean_nan(history))

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
            if os.path.exists(thumb_path):
                # Only check mtime if it's a persistent output to allow for edits, 
                # but for thumbnails speed is king
                return web.FileResponse(thumb_path, headers={"Cache-Control": "public, max-age=86400"})

            # --- Asynchronous Forensic Manifestation ---
            # We await the executor to ensure the file exists before attempting to serve it
            success = await asyncio.get_event_loop().run_in_executor(_h4_io_executor, generate_h4_thumbnail, img_path, thumb_path)
            
            if success and os.path.exists(thumb_path):
                return web.FileResponse(thumb_path, headers={"Cache-Control": "public, max-age=86400"})
            else:
                # If thumbnail failed, we'll try to serve the full image as a last resort if it's not too big
                if os.path.exists(img_path) and os.path.getsize(img_path) < 1024 * 1024: # 1MB limit for fallback
                    return web.FileResponse(img_path)
                return web.Response(status=404)
            
        except Exception as e:
            print(f"[H4_SmartSave] Kinetic Audit Failure: {e}")
            return web.Response(status=500)

except Exception as e:
    print(f"[H4_SmartSave] Failed api register: {e}")