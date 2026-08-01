# h4_server.py - Backend API for h4_Live
# ==============================================================================
# Handles REST endpoints for internal logic, presets, and file management.
# ==============================================================================

import os
import json
import time
import folder_paths
from server import PromptServer
from aiohttp import web
from PIL import Image, ImageOps
import io

# ------------------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------------------
PRESET_DIR = os.path.join(os.path.dirname(__file__), "presets")

if not os.path.exists(PRESET_DIR):
    os.makedirs(PRESET_DIR, exist_ok=True)

# ------------------------------------------------------------------------------
# Routes
# ------------------------------------------------------------------------------
def register_routes():
    print(f"🚀 h4_Live Server: Registering Routes... (Presets Dir: {PRESET_DIR})")
    
    # 1. List Presets
    @PromptServer.instance.routes.get("/h4/presets/list")
    async def list_presets(request):
        try:
            files = [f.replace(".json", "") for f in os.listdir(PRESET_DIR) if f.endswith(".json")]
            files.sort()
            return web.json_response({"presets": files})
        except Exception as e:
            print(f"[h4_server] Error listing presets: {e}")
            return web.json_response({"error": str(e)}, status=500)

    # 2. Save Preset
    @PromptServer.instance.routes.post("/h4/presets/save")
    async def save_preset(request):
        try:
            data = await request.json()
            name = data.get("name")
            settings = data.get("settings")
            
            if not name or not settings:
                return web.json_response({"error": "Missing name or settings"}, status=400)
            
            # Sanitize filename
            safe_name = "".join([c for c in name if c.isalpha() or c.isdigit() or c in (' ', '-', '_')]).strip()
            filepath = os.path.join(PRESET_DIR, f"{safe_name}.json")
            
            with open(filepath, "w", encoding='utf-8') as f:
                json.dump(settings, f, indent=4)
                
            return web.json_response({"success": True, "path": filepath})
        except Exception as e:
            print(f"[h4_server] Error saving preset: {e}")
            return web.json_response({"error": str(e)}, status=500)

    # 2.5 Comparinator Manual Save
    @PromptServer.instance.routes.post("/h4/comparinator/save_now")
    async def comparinator_save_now(request):
        try:
            data = await request.json()
            node_id = str(data.get("node_id"))
            settings = data.get("settings", {})
            
            from ..nodes.h4_comparinator.nodes import H4_Comparinator
            
            result = H4_Comparinator.trigger_manual_save(node_id, settings)
            return web.json_response(result)
            
        except Exception as e:
            print(f"[h4_server] Error saving comparinator: {e}")
            return web.json_response({"error": str(e)}, status=500)

    # 3. Load Preset
    @PromptServer.instance.routes.post("/h4/presets/load")
    async def load_preset(request):
        try:
            data = await request.json()
            name = data.get("name")
            
            if not name:
                return web.json_response({"error": "Missing name"}, status=400)
                
            safe_name = "".join([c for c in name if c.isalpha() or c.isdigit() or c in (' ', '-', '_')]).strip()
            filepath = os.path.join(PRESET_DIR, f"{safe_name}.json")
            
            if not os.path.exists(filepath):
                 return web.json_response({"error": "Preset not found"}, status=404)
                 
            with open(filepath, "r", encoding='utf-8') as f:
                settings = json.load(f)
                
            return web.json_response({"success": True, "settings": settings})
        except Exception as e:
            print(f"[h4_server] Error loading preset: {e}")
            return web.json_response({"error": str(e)}, status=500)

    # 4. Delete Preset
    @PromptServer.instance.routes.post("/h4/presets/delete")
    async def delete_preset(request):
        try:
            data = await request.json()
            name = data.get("name")
            
            if not name:
                return web.json_response({"error": "Missing name"}, status=400)
                
            safe_name = "".join([c for c in name if c.isalpha() or c.isdigit() or c in (' ', '-', '_')]).strip()
            filepath = os.path.join(PRESET_DIR, f"{safe_name}.json")
            
            if os.path.exists(filepath):
                os.remove(filepath)
                return web.json_response({"success": True})
            else:
                return web.json_response({"error": "File not found"}, status=404)
                
        except Exception as e:
            print(f"[h4_server] Error deleting preset: {e}")
            return web.json_response({"error": str(e)}, status=500)

    # 5. Get History for Node
    @PromptServer.instance.routes.get("/h4/history")
    async def get_history(request):
        try:
            node_id = request.query.get("node_id")
            if not node_id:
                return web.json_response({"error": "Missing node_id"}, status=400)
            
            # Correct import path from nodes package
            from ..nodes.h4_comparinator.nodes import H4_Comparinator
            
            history = list(H4_Comparinator.RUNTIME_CACHE.get(node_id, []))
            return web.json_response({"history": history})
            
        except Exception as e:
            print(f"[h4_server] Error fetching history: {e}")
            return web.json_response({"error": str(e)}, status=500)

    # 6. Get Full Session Metadata (The Database)
    @PromptServer.instance.routes.get("/h4/session/get")
    async def get_session(request):
        try:
            from .h4_session_manager import session_manager
            data = session_manager.get_session()
            return web.json_response(data)
        except Exception as e:
            print(f"[h4_server] Error fetching session DB: {e}")
            return web.json_response({"error": str(e)}, status=500)

    # 7. Get The Book of H4 (Lore)
    @PromptServer.instance.routes.get("/h4/lore")
    async def get_lore(request):
        try:
            lore_path = os.path.join(os.path.dirname(__file__), "..", "nodes", "h4_smart_save", "Lore", "The_Book_of_H4.json")
            print(f"[h4_server] 📖 Fetching Lore from: {lore_path}")
            
            if not os.path.exists(lore_path):
                 print(f"[h4_server] ❌ Lore file NOT FOUND at: {lore_path}")
                 return web.json_response({"error": f"Lore file not found at {lore_path}"}, status=404)
            
            with open(lore_path, "r", encoding='utf-8') as f:
                data = json.load(f)
            
            print(f"[h4_server] ✅ Lore loaded successfully for {len(data)} nodes.")
            return web.json_response(data)
        except Exception as e:
            print(f"[h4_server] ❌ Error fetching Lore: {e}")
            import traceback
            traceback.print_exc()
            return web.json_response({"error": str(e)}, status=500)

    # 8. Get Translations
    @PromptServer.instance.routes.get("/h4/translations")
    async def get_translations(request):
        try:
            # File is in the root extension folder
            base_dir = os.path.dirname(__file__)
            trans_path = os.path.join(base_dir, "..", "translations.json")
            
            if not os.path.exists(trans_path):
                 print(f"[h4_server] ❌ Translation file NOT FOUND at: {trans_path}")
                 return web.json_response({"error": "Translation file missing"}, status=404)
            
            with open(trans_path, "r", encoding='utf-8') as f:
                data = json.load(f)
            
            return web.json_response(data)
        except Exception as e:
            print(f"[h4_server] ❌ Error fetching Translations: {e}")
            return web.json_response({"error": str(e)}, status=500)

    # 8.5 Get Metadata (Lazy loading implementation)
    @PromptServer.instance.routes.get("/h4/metadata")
    async def get_metadata(request):
        filename = request.query.get("filename")
        subfolder = request.query.get("subfolder", "")
        folder_type = request.query.get("type", "output")
        
        if not filename: return web.Response(status=404)
        
        # Security
        if ".." in filename or ".." in subfolder: return web.Response(status=403)
        
        # Resolve Source Path
        base = folder_paths.get_output_directory() if folder_type == "output" else folder_paths.get_temp_directory()
        if isinstance(base, list): base = base[0]
        
        full_path = os.path.join(base, subfolder, filename)
        
        if not os.path.exists(full_path):
            return web.json_response({"error": "File not found"}, status=404)
            
        try:
            img = Image.open(full_path)
            info = img.info
            
            prompt = None
            workflow = None
            user_meta = {}
            
            if "prompt" in info:
                try: prompt = json.loads(info["prompt"])
                except: pass
            
            if "workflow" in info:
                 try: workflow = json.loads(info["workflow"])
                 except: pass
                 
            for k, v in info.items():
                if k not in ["prompt", "workflow"]:
                     user_meta[k] = v
            
            return web.json_response({
                "prompt": prompt,
                "workflow": workflow,
                "user_meta": user_meta
            })
        except Exception as e:
            return web.json_response({"error": str(e)}, status=500)

    # 8.7 Full Resolution Vault Image
    @PromptServer.instance.routes.get("/h4/comparinator/image")
    async def get_vault_image(request):
        filename = request.query.get("filename")
        if not filename: return web.Response(status=404)
        if ".." in filename: return web.Response(status=403)
        
        # Mapping: /nodes/h4_comparinator_vault/comparinator/
        base_dir = os.path.dirname(os.path.dirname(__file__))
        vault_base = os.path.join(base_dir, "nodes", "h4_comparinator_vault", "comparinator")
        full_path = os.path.normpath(os.path.join(vault_base, filename))
        
        if os.path.exists(full_path):
            return web.FileResponse(full_path)
        return web.Response(status=404)

    # 9. Get Image Compressor History
    @PromptServer.instance.routes.get("/h4/image_compressor/history")
    async def get_compressor_history(request):
        try:
            # Locate saved files under ComfyUI output directory or custom h4 paths
            output_dir = folder_paths.get_output_directory()
            if isinstance(output_dir, list):
                output_dir = output_dir[0]
            
            # Default target subdirectory
            target_sub = "H4_Compressor"
            target_dir = os.path.join(output_dir, target_sub)
            
            history_items = []
            if os.path.exists(target_dir):
                for f in os.listdir(target_dir):
                    ext = f.split(".")[-1].lower()
                    if ext in ["png", "jpg", "jpeg", "webp", "gif", "avif", "bmp", "tiff"]:
                        f_path = os.path.join(target_dir, f)
                        stat = os.stat(f_path)
                        
                        # Open image to inspect dimensions/format
                        try:
                            with Image.open(f_path) as img:
                                width, height = img.size
                                img_format = img.format or ext.upper()
                        except:
                            width, height = 0, 0
                            img_format = ext.upper()
                            
                        history_items.append({
                            "filename": f,
                            "subfolder": target_sub,
                            "type": "output",
                            "timestamp": stat.st_mtime,
                            "size_bytes": stat.st_size,
                            "format": img_format,
                            "width": width,
                            "height": height
                        })
            
            # Sort by newest first
            history_items.sort(key=lambda x: x["timestamp"], reverse=True)
            return web.json_response(history_items[:50])
        except Exception as e:
            print(f"[h4_server] Error fetching compressor history: {e}")
            return web.json_response({"error": str(e)}, status=500)

    # 10. Link QoL: Civitai Search Endpoint
    @PromptServer.instance.routes.get("/h4/link/search")
    async def link_civitai_search(request):
        try:
            from ..nodes.h4_link_qol.civitai_api import search_civitai
            query = request.query.get("query", "")
            model_type = request.query.get("type", "All")
            base_model = request.query.get("baseModel", "All")
            sort = request.query.get("sort", "Highest Rated")
            page = int(request.query.get("page", 1))
            
            res = search_civitai(query=query, model_type=model_type, base_model=base_model, sort=sort, page=page)
            return web.json_response(res)
        except Exception as e:
            return web.json_response({"success": False, "error": str(e)}, status=500)

    # 11. Link QoL: Civitai Download Endpoint
    @PromptServer.instance.routes.post("/h4/link/download")
    async def link_civitai_download(request):
        try:
            from ..nodes.h4_link_qol.civitai_api import start_model_download
            data = await request.json()
            download_url = data.get("download_url")
            filename = data.get("filename")
            model_type = data.get("model_type", "LoRA")
            model_name = data.get("model_name", "")
            version_name = data.get("version_name", "")
            trigger_words = data.get("trigger_words", [])
            
            if not download_url or not filename:
                return web.json_response({"error": "Missing download_url or filename"}, status=400)
                
            task_id = start_model_download(download_url, filename, model_type, model_name, version_name, trigger_words)
            return web.json_response({"success": True, "download_id": task_id})
        except Exception as e:
            return web.json_response({"error": str(e)}, status=500)

    # 12. Link QoL: Civitai Download Status Endpoint
    @PromptServer.instance.routes.get("/h4/link/status")
    async def link_civitai_status(request):
        try:
            from ..nodes.h4_link_qol.civitai_api import get_download_status
            download_id = request.query.get("download_id", None)
            res = get_download_status(download_id)
            return web.json_response(res)
        except Exception as e:
            return web.json_response({"error": str(e)}, status=500)

    # 13. Link QoL: Civitai Model Details Endpoint
    @PromptServer.instance.routes.get("/h4/link/details")
    async def link_civitai_details(request):
        try:
            from ..nodes.h4_link_qol.civitai_api import fetch_model_details
            model_id = request.query.get("id")
            if not model_id:
                return web.json_response({"success": False, "error": "Missing model id"}, status=400)
            res = fetch_model_details(model_id)
            return web.json_response(res)
        except Exception as e:
            return web.json_response({"success": False, "error": str(e)}, status=500)

# Register on import
register_routes()
