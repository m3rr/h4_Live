# h4_faceforge - All-In-One Face Swap Module
# ==============================================================================
# Part of h4_Live ToolKit
# ==============================================================================

# --- ML_DTYPES UNIVERSAL ENVIRONMENT POLYFILL ---
try:
    import ml_dtypes
    _fb_type = getattr(ml_dtypes, "float8_e4m3fn", None) or getattr(ml_dtypes, "int4", None) or object
    for _attr in ["float4_e2m1fn", "float8_e8m0fnu", "float8_e4m3fnuz", "float8_e5m2fnuz", "float8_e4m3b11", "float8_e4m3fn", "float8_e5m2"]:
        if not hasattr(ml_dtypes, _attr):
            try:
                setattr(ml_dtypes, _attr, _fb_type)
            except Exception:
                pass
    _orig_getattr = getattr(ml_dtypes, "__getattr__", None)
    def _ml_dtypes_safe_getattr(name):
        if _orig_getattr:
            try:
                return _orig_getattr(name)
            except AttributeError:
                pass
        return _fb_type
    try:
        setattr(ml_dtypes, "__getattr__", _ml_dtypes_safe_getattr)
    except Exception:
        pass
except Exception:
    pass



from .nodes_utility import H4_LoadFaceModel, H4_BuildFaceModel, H4_SaveFaceModel, H4_DualCLIPTextEncode
from .nodes_faceforge import H4_FaceForge
from .nodes_identity_engine import H4_IdentityEngine
from .nodes_detailer import H4_FaceDetailer

# Import API routes for Presets
from . import presets_api

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
        "mode": "h4 - Mode" if enabled else "off"
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
        "mode": "h4 - Mode" if new_state else "off"
    })


# ==============================================================================
# Node Mappings for ComfyUI registration
# ==============================================================================

NODE_CLASS_MAPPINGS = {
    "H4_FaceForge": H4_FaceForge,
    "H4_LoadFaceModel": H4_LoadFaceModel,
    "H4_BuildFaceModel": H4_BuildFaceModel,
    "H4_SaveFaceModel": H4_SaveFaceModel,
    "H4_IdentityEngine": H4_IdentityEngine,
    "H4_FaceDetailer": H4_FaceDetailer,
    "H4_DualCLIPTextEncode": H4_DualCLIPTextEncode,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "H4_FaceForge": "h4 - Face Forge",
    "H4_LoadFaceModel": "h4 - Load Face Model",
    "H4_BuildFaceModel": "h4 - Build Face Model",
    "H4_SaveFaceModel": "h4 - Save Face Model",
    "H4_IdentityEngine": "h4 - Identity Engine",
    "H4_FaceDetailer": "h4 - Face Detailer",
    "H4_DualCLIPTextEncode": "h4 - Dual Clip Text Encode",
}

__all__ = [
    "H4_FaceForge",
    "H4_LoadFaceModel", 
    "H4_BuildFaceModel",
    "H4_SaveFaceModel",
    "H4_IdentityEngine",
    "H4_FaceDetailer",
    "H4_DualCLIPTextEncode",
    "NODE_CLASS_MAPPINGS",
    "NODE_DISPLAY_NAME_MAPPINGS",
    "is_sfw_enabled",
]

# [H4] Standalone Modularity
WEB_DIRECTORY = "./web"
