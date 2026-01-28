# h4_faceforge - All-In-One Face Swap Module
# ==============================================================================
# Part of h4_Live ToolKit
# ==============================================================================

from .nodes_utility import H4_LoadFaceModel, H4_BuildFaceModel, H4_SaveFaceModel
from .nodes_faceforge import H4_FaceForge

# ==============================================================================
# Web API Endpoints
# ==============================================================================

from aiohttp import web
from server import PromptServer

# Store SFW mode logic is now in sfw_utils to avoid circular imports
from .sfw_utils import is_sfw_enabled, set_sfw_state

@PromptServer.instance.routes.get("/h4/sfw_status")
async def get_sfw_status(request):
    """
    Get current SFW filter status.
    """
    # Allow JS to sync its localStorage state to the server
    mode = request.rel_url.query.get("mode", None)
    if mode in ("on", "off"):
        set_sfw_state(mode == "on")
    
    enabled = is_sfw_enabled()
    return web.json_response({
        "sfw_enabled": enabled,
        "mode": "on" if enabled else "off"
    })


@PromptServer.instance.routes.post("/h4/sfw_toggle")
async def toggle_sfw_status(request):
    """
    Toggle SFW filter status.
    """
    new_state = not is_sfw_enabled()
    set_sfw_state(new_state)
    
    return web.json_response({
        "sfw_enabled": new_state,
        "mode": "on" if new_state else "off"
    })


# ==============================================================================
# Node Mappings for ComfyUI registration
# ==============================================================================

NODE_CLASS_MAPPINGS = {
    "H4_FaceForge": H4_FaceForge,
    "H4_LoadFaceModel": H4_LoadFaceModel,
    "H4_BuildFaceModel": H4_BuildFaceModel,
    "H4_SaveFaceModel": H4_SaveFaceModel,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "H4_FaceForge": "h4 FaceForge (AIO Face Swap)",
    "H4_LoadFaceModel": "h4 Load Face Model",
    "H4_BuildFaceModel": "h4 Build Face Model",
    "H4_SaveFaceModel": "h4 Save Face Model",
}

__all__ = [
    "H4_FaceForge",
    "H4_LoadFaceModel", 
    "H4_BuildFaceModel",
    "H4_SaveFaceModel",
    "NODE_CLASS_MAPPINGS",
    "NODE_DISPLAY_NAME_MAPPINGS",
    "is_sfw_enabled",
]
