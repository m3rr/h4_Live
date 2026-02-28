import os
import json
import folder_paths
from aiohttp import web
from server import PromptServer
from .utils import _log

# ==============================================================================
# Paths & Setup
# ==============================================================================

PRESETS_DIR = os.path.join(os.path.dirname(__file__), "presets")
os.makedirs(PRESETS_DIR, exist_ok=True)

def get_preset_path(name: str) -> str:
    # Sanitize name
    safe_name = "".join([c for c in name if c.isalpha() or c.isdigit() or c in (' ', '_', '-')]).strip()
    return os.path.join(PRESETS_DIR, f"{safe_name}.json")

# ==============================================================================
# API Routes
# ==============================================================================

@PromptServer.instance.routes.get("/h4/presets/list")
async def list_presets(request):
    try:
        files = [f for f in os.listdir(PRESETS_DIR) if f.endswith(".json")]
        # Return names without extension
        names = [os.path.splitext(f)[0] for f in files]
        names.sort()
        return web.json_response({"presets": names})
    except Exception as e:
        _log(f"Failed to list presets: {e}", level="ERROR")
        return web.json_response({"error": str(e)}, status=500)

@PromptServer.instance.routes.post("/h4/presets/save")
async def save_preset(request):
    try:
        data = await request.json()
        name = data.get("name")
        settings = data.get("settings")
        
        if not name or not settings:
            return web.json_response({"error": "Missing name or settings"}, status=400)
            
        path = get_preset_path(name)
        
        with open(path, "w", encoding="utf-8") as f:
            json.dump(settings, f, indent=4)
            
        _log(f"Saved Persona Preset: {name}")
        return web.json_response({"success": True})
    except Exception as e:
        _log(f"Failed to save preset: {e}", level="ERROR")
        return web.json_response({"error": str(e)}, status=500)

@PromptServer.instance.routes.post("/h4/presets/load")
async def load_preset(request):
    try:
        data = await request.json()
        name = data.get("name")
        
        if not name:
            return web.json_response({"error": "Missing name"}, status=400)
            
        path = get_preset_path(name)
        if not os.path.exists(path):
            return web.json_response({"error": "Preset not found"}, status=404)
            
        with open(path, "r", encoding="utf-8") as f:
            settings = json.load(f)
            
        return web.json_response({"settings": settings})
    except Exception as e:
        _log(f"Failed to load preset: {e}", level="ERROR")
        return web.json_response({"error": str(e)}, status=500)

@PromptServer.instance.routes.post("/h4/presets/delete")
async def delete_preset(request):
    try:
        data = await request.json()
        name = data.get("name")
        
        if not name:
            return web.json_response({"error": "Missing name"}, status=400)
            
        path = get_preset_path(name)
        if os.path.exists(path):
            os.remove(path)
            _log(f"Deleted Persona Preset: {name}")
            return web.json_response({"success": True})
        else:
            return web.json_response({"error": "Preset not found"}, status=404)
            
    except Exception as e:
        _log(f"Failed to delete preset: {e}", level="ERROR")
        return web.json_response({"error": str(e)}, status=500)
