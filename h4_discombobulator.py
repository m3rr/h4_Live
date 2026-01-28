"""
👁️ h4 The Discombobulator - (b'.')b / t('.'t)
-------------------------------------------------------------------------------
A stealth, harmless node that triggers a JS translation engine for ComfyUI popups.
Does nothing in the backend - strictly a UI marker.
"""

import logging

# [h4 DEBUG PROTOCOL] NUCLEAR logging
logger = logging.getLogger("h4_Live")

class H4_Discombobulator:
    """
    (b'.')b The Discombobulator t('.'t)
    When this node is on the graph, it intercepts ComfyUI notifications
    and converts them into binary, leet, base64, or glitch text.
    """
    
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "discombobulation_choice": ([
                    "1337", 
                    "b1n4ry", 
                    "B64", 
                    "V 0 1 D"
                ], {"default": "1337"}),
            },
        }

    RETURN_TYPES = ()
    FUNCTION = "noop"
    CATEGORY = "h4_Live/Stealth/Legacy" # BURIED DEEP
    OUTPUT_NODE = True # Ensures it stays on the graph

    def noop(self, **kwargs):
        # [h4-DEBUG] Easter Egg Active
        # This node does literally nothing on the python side.
        # It's an anchor for the JS glitch engine and notification interceptor.
        return {}

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        # We don't want this to ever trigger a rerun on its own
        return float("NaN")

NODE_CLASS_MAPPINGS = {
    "H4_Discombobulator": H4_Discombobulator
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "H4_Discombobulator": "The Discombobulator (Use with CAUTION)"
}
