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

# Register on import
register_routes()
