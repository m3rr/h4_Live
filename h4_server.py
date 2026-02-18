# h4_server.py - Backend API for h4_Live
# ==============================================================================
# Handles REST endpoints for internal logic, presets, and file management.
# ==============================================================================

import os
import json
import folder_paths
from server import PromptServer
from aiohttp import web

# ------------------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------------------
PRESET_DIR = os.path.join(folder_paths.base_path, "web", "extensions", "h4_presets") # Save in web/extensions for easy access or user dir?
# User requested: "a folder in the nodes folder called presets"
# Node folder: d:\PROJECTS\COMFYUI_Custom_Node\h4_ToolKit_v2\comfyui_h4_live
# We can use os.path.dirname(__file__)
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
            
            from .h4_comparinator import H4_Comparinator
            
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
            lore_path = os.path.join(os.path.dirname(__file__), "h4_smart_save", "Lore", "The_Book_of_H4.json")
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
            trans_path = os.path.join(base_dir, "translations.json")
            
            if not os.path.exists(trans_path):
                 print(f"[h4_server] ❌ Translation file NOT FOUND at: {trans_path}")
                 return web.json_response({"error": "Translation file missing"}, status=404)
            
            with open(trans_path, "r", encoding='utf-8') as f:
                data = json.load(f)
            
            return web.json_response(data)
        except Exception as e:
            print(f"[h4_server] ❌ Error fetching Translations: {e}")
            return web.json_response({"error": str(e)}, status=500)

# Register on import
register_routes()
