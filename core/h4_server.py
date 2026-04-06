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
THUMB_DIR = os.path.join(folder_paths.get_temp_directory(), "h4_thumbs")

if not os.path.exists(PRESET_DIR):
    os.makedirs(PRESET_DIR, exist_ok=True)
if not os.path.exists(THUMB_DIR):
    os.makedirs(THUMB_DIR, exist_ok=True)

# [H4] Startup Cleanup: Remove thumbnails older than 24 hours
def cleanup_old_thumbnails():
    try:
        now = time.time()
        count = 0
        for f in os.listdir(THUMB_DIR):
            fpath = os.path.join(THUMB_DIR, f)
            if os.stat(fpath).st_mtime < now - 86400:
                os.remove(fpath)
                count += 1
        if count > 0:
            print(f"[h4_server] 🧹 Cleaned up {count} old thumbnails.")
    except Exception as e:
        print(f"[h4_server] Error during thumbnail cleanup: {e}")

cleanup_old_thumbnails()

# ------------------------------------------------------------------------------
# Thumbnail Logic
# ------------------------------------------------------------------------------
import hashlib

def create_thumbnail(path, filename):
    """
    Generates a 256px WebP thumbnail for the given image path.
    Uses a SHA-256 hash of the full path to avoid filename collisions.
    Returns the path to the cached thumbnail.
    """
    if not path or not os.path.exists(path):
        return None

    # [H4] Generate unique key based on absolute path to prevent collisions
    # This ensures folderA/img1.png and folderB/img1.png have distinct thumbs
    abs_path = os.path.abspath(path)
    path_hash = hashlib.sha256(abs_path.encode('utf-8')).hexdigest()[:16]
    
    thumb_name = f"thumb_{path_hash}_{filename}.webp"
    thumb_path = os.path.join(THUMB_DIR, thumb_name)
    
    # Cache Hit (Speed optimization)
    if os.path.exists(thumb_path):
        # Optional: check mtime to invalidate stale cache?
        # For performance, we trust the hash if the file hasn't changed.
        return thumb_path
        
    try:
        # Load and process image efficiently
        img = Image.open(path)
        img = ImageOps.exif_transpose(img)
        
        # [H4] Fast Resize (LANCZOS is high quality, but BICUBIC is faster for thumbs)
        img.thumbnail((256, 256), Image.Resampling.BICUBIC)
        
        # Optimization: Save as WebP (Lossy 60) for minimal size and fast transfer
        img.save(thumb_path, "WEBP", quality=60, method=0) # method=0 for speed
        return thumb_path
    except Exception as e:
        print(f"[h4_server] ❌ Thumbnail generation failed for {path}: {e}")
        return None

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
                
            filepath = os.path.join(PRESET_DIR, f"{name}.json")
            
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
                
            filepath = os.path.join(PRESET_DIR, f"{name}.json")
            
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
            
            # Import here to avoid circular dependency at top level
            from .h4_comparinator import H4_Comparinator
            
            history = list(H4_Comparinator.HISTORY_CACHE.get(node_id, []))
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

    # 9. Thumbnail API (Memory Optimization)
    @PromptServer.instance.routes.get("/h4/thumbnail")
    async def get_thumbnail(request):
        filename = request.query.get("filename")
        subfolder = request.query.get("subfolder", "")
        folder_type = request.query.get("type", "output")
        
        if not filename: return web.Response(status=404)
        
        # Security Check
        if ".." in filename or ".." in subfolder: return web.Response(status=403)

        # Resolve Source Path
        source_path = None
        
        if folder_type == "output":
            base = folder_paths.get_output_directory()
        elif folder_type == "temp":
            base = folder_paths.get_temp_directory()
        elif folder_type == "input":
            base = folder_paths.get_input_directory()
        else:
            base = folder_paths.get_output_directory()
            
        # [H4] Handle subfolder properly for vault items
        if subfolder and "comparinator" in subfolder:
             # subfolder usually looks like 'comparinator/2026-04-06'
             # vault_base is the root 'comparinator' folder in the vault node
             base_dir = os.path.dirname(os.path.dirname(__file__))
             vault_root = os.path.join(base_dir, "nodes", "h4_comparinator_vault")
             # Join the vault root with the subfolder (which starts with 'comparinator/')
             source_path = os.path.normpath(os.path.join(vault_root, subfolder, filename))
        else:
             source_path = os.path.normpath(os.path.join(base, subfolder or "", filename))
             
        if not source_path or not os.path.exists(source_path):
            return web.Response(status=404)
            
        # Generate/Fetch Thumbnail
        thumb_path = create_thumbnail(source_path, filename)
        
        if thumb_path and os.path.exists(thumb_path):
            return web.FileResponse(thumb_path)
        else:
            # Fallback to source if thumb fails
            return web.FileResponse(source_path)

# Register on import
register_routes()
