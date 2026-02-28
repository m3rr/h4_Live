# FILE: custom_nodes/comfyui_h4_live/h4_utils.py
# ------------------------------------------------------------------------------
# Utility Helpers & Type Definitions
# Rule 3 (Modular Architecture): Clean separation of utility classes.
# Rule 20 (Clairvoyant Development): Robust type handling for unknown inputs.
# ------------------------------------------------------------------------------

class AnyType(str):
    """
    A wildcard type (Universal Socket) that tricks ComfyUI's validation system.
    
    It behaves like a string mostly, but overrides equality checks to match 
    ANY other type it is compared against during the connection phase.
    
    Nuclear Strategy:
    - __ne__: Always returns False (Nothing is 'not equal' to me).
    - __eq__: Always returns True (Everything is 'equal' to me).
    """
    def __ne__(self, __value: object) -> bool:
        return False
        
    def __eq__(self, __value: object) -> bool:
        return True

# Instance for import - The "Universal Key"
ANY_TYPE = AnyType("*")

# FAILSAFE: Using standard ComfyUI wildcard
# ANY_TYPE = "*"
