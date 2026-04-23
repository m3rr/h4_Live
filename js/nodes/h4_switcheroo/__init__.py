# H4_Switcheroo - Modular Registration
# [LANDMARK] File: h4_switcheroo/__init__.py
# [LANDMARK] Purpose: Ensure standalone operation while supporting pack discovery.

import os
import sys

# Add self to path for absolute-standard internal imports if needed
sys.path.append(os.path.dirname(__file__))

from .nodes import H4_Switcheroo

NODE_CLASS_MAPPINGS = {
    "H4_Switcheroo": H4_Switcheroo
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "H4_Switcheroo": "h4 - Switcheroo"
}

WEB_DIRECTORY = "./web"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
