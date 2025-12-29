# FILE: custom_nodes/comfyui_h4_live/__init__.py
# ------------------------------------------------------------------------------
# Module Registration & Startup
# ------------------------------------------------------------------------------
from .h4_traffic import H4_TrafficCop, H4_StateMonitor, H4_TrafficMerge
from .version import __version__

NODE_CLASS_MAPPINGS = {
    "H4_TrafficCop": H4_TrafficCop,
    "H4_TrafficMerge": H4_TrafficMerge,
    "H4_StateMonitor": H4_StateMonitor
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "H4_TrafficCop": "h4 Traffic Cop (Live Logic)",
    "H4_TrafficMerge": "h4 Traffic Merge (Safe Select)",
    "H4_StateMonitor": "h4 State Monitor"
}

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]

# ------------------------------------------------------------------------------
# Console Status Report
# ------------------------------------------------------------------------------
def print_status():
    green = "\033[92m"
    reset = "\033[0m"
    check = f"{green}✅{reset}"
    
    print(f"\n--------------------------------------------------------------")
    print(f" 🚀 h4_Live ToolKit | Version: {__version__}")
    print(f"    (Nuclear Logic & Persistent State for ComfyUI)")
    print(f"--------------------------------------------------------------")
    print(f"| {'Node Name':<35} | {'Global ID':<15} | {'Load':<5} |")
    print(f"--------------------------------------------------------------")
    
    for key, val in NODE_DISPLAY_NAME_MAPPINGS.items():
        # Clean up the name for display
        name = val
        print(f"| {name:<35} | {key:<15} |  {check}   |")
        
    print(f"--------------------------------------------------------------\n")

print_status()
