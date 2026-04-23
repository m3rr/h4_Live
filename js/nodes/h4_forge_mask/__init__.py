import os
from .nodes import H4_ForgeMask

NODE_CLASS_MAPPINGS = {
    "H4_ForgeMask": H4_ForgeMask
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "H4_ForgeMask": "h4 - Forge_Mask"
}

WEB_DIRECTORY = "./web"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
