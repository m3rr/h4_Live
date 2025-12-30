# FILE: custom_nodes/comfyui_h4_live/__init__.py
# ------------------------------------------------------------------------------
from .h4_traffic import H4_TrafficCop, H4_StateMonitor, H4_TrafficMerge
from .h4_context import H4_ContextHub, H4_ContextUnpack
from .h4_smart_debug import H4_SmartConsole
from .version import __version__

NODE_CLASS_MAPPINGS = {
    "H4_TrafficCop": H4_TrafficCop,
    "H4_TrafficMerge": H4_TrafficMerge,
    "H4_StateMonitor": H4_StateMonitor,
    "H4_ContextHub": H4_ContextHub,
    "H4_ContextUnpack": H4_ContextUnpack,
    "H4_SmartConsole": H4_SmartConsole
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "H4_TrafficCop": "h4 Traffic Cop (Live Logic)",
    "H4_TrafficMerge": "h4 Traffic Merge (Safe Select)",
    "H4_StateMonitor": "h4 State Monitor",
    "H4_ContextHub": "h4 Context Hub (Mothership)",
    "H4_ContextUnpack": "h4 Context Unpack (Distributor)",
    "H4_SmartConsole": "{h4 - DEBUGGER} - Inline Debugger {Smart Console}"
}

WEB_DIRECTORY = "./js"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]

# ------------------------------------------------------------------------------
# Console Status Report
# ------------------------------------------------------------------------------
def print_status():
    green = "\033[92m"
    reset = "\033[0m"
    check = f"{green}✅{reset}"
    
    print(f"\n-------------------------------------------------------------------------------------")
    print(f" 🚀 h4_Live ToolKit | Version: {__version__}")
    print(f"    (Nuclear Logic & Persistent State for ComfyUI)")
    print(f"-------------------------------------------------------------------------------------")
    print(f"| {'Node Name':<55} | {'Global ID':<18} | {'Load':<5}|")
    print(f"-------------------------------------------------------------------------------------")
    
    for key, val in NODE_DISPLAY_NAME_MAPPINGS.items():
        # Clean up the name for display
        name = val
        print(f"| {name:<55} | {key:<18} |  {check}   |")
        
    print(f"-------------------------------------------------------------------------------------\n")

print_status()
