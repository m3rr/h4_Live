"""
H4_NodeTranslator - Frontend Translation Controller
---------------------------------------------------
A stateless node that acts as a marker for the frontend translation engine.
It allows users to select a target language for the ComfyUI interface.
"""

class H4_NodeTranslator:
    """
    Acts as a controller for the frontend translation system.
    Does nothing on the backend.
    """
    
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "language": ([
                    "Spanish (es)", 
                    "Mandarin (zh)", 
                    "German (de)",
                    "English (en)"
                ], {"default": "Spanish (es)", "tooltip": "Select the target language for node titles and widgets."}),
                "mode": (["Active", "Disabled"], {"default": "Active", "tooltip": "Enable or disable live translation."}),
            },
        }

    RETURN_TYPES = ()
    FUNCTION = "noop"
    CATEGORY = "h4_Live/Tools"
    OUTPUT_NODE = True 

    def noop(self, **kwargs):
        return {}

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        return float("NaN")