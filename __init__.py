# FILE: custom_nodes/comfyui_h4_live/__init__.py
# ------------------------------------------------------------------------------
from .version import __version__
from .h4_traffic import H4_TrafficCop, H4_TrafficMerge, H4_TrafficRouter, H4_StateMonitor, H4_LoopIncrementer, H4_WirelessResetButton, H4_ImageBuffer
from .h4_context import H4_ContextHub, H4_ContextUnpack
from .h4_smart_debug import H4_SmartConsole
from .h4_mission_control import H4_MissionControl, H4_LinearScheduler, H4_SeedGenerator
from .h4_gridinator import H4_Gridinator
from .h4_debug_error import H4_DebugErrorGenerator
from .h4_discombobulator import H4_Discombobulator

NODE_CLASS_MAPPINGS = {
    "H4_TrafficCop": H4_TrafficCop,
    "H4_TrafficMerge": H4_TrafficMerge,
    "H4_TrafficRouter": H4_TrafficRouter,
    "H4_StateMonitor": H4_StateMonitor,
    "H4_ContextHub": H4_ContextHub,
    "H4_ContextUnpack": H4_ContextUnpack,
    "H4_SmartConsole": H4_SmartConsole,
    "H4_MissionControl": H4_MissionControl,
    "H4_LinearScheduler": H4_LinearScheduler,
    "H4_SeedGenerator": H4_SeedGenerator,
    "H4_LoopIncrementer": H4_LoopIncrementer,
    "H4_WirelessResetButton": H4_WirelessResetButton,
    "H4_ImageBuffer": H4_ImageBuffer,
    "H4_Gridinator": H4_Gridinator,
    "H4_DebugErrorGenerator": H4_DebugErrorGenerator,
    "H4_Discombobulator": H4_Discombobulator
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "H4_TrafficCop": "h4 Traffic Cop (Live Logic)",
    "H4_TrafficMerge": "h4 Traffic Merge (Safe Select)",
    "H4_TrafficRouter": "h4 Traffic Router (The Nexus)",
    "H4_StateMonitor": "h4 State Monitor",
    "H4_ContextHub": "h4 Context Hub (Mothership)",
    "H4_ContextUnpack": "h4 Context Unpack (Distributor)",
    "H4_SmartConsole": "{h4 - DEBUGGER} - Inline Debugger {Smart Console}",
    "H4_MissionControl": "h4 Mission Control (Dashboard)",
    "H4_LinearScheduler": "h4 Linear Scheduler (Signal Gen)",
    "H4_SeedGenerator": "h4 Seed Generator (Signal Gen)",
    "H4_LoopIncrementer": "h4 Loop Incrementer (Hybrid)",
    "H4_WirelessResetButton": "h4 Wireless Reset (Toggle)",
    "H4_ImageBuffer": "h4 Image Buffer (Anti-Lag)",
    "H4_Gridinator": "h4 - Gridinator 9001",
    "H4_DebugErrorGenerator": "🔬 h4 Debug Error (TEST ONLY)",
    "H4_Discombobulator": "The Discombobulator - (b'.')b / t('.'t)"
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
        # Hide the stealth nodes from the terminal status list
        if key in ["H4_Discombobulator"]:
            continue
            
        # Clean up the name for display
        name = val
        print(f"| {name:<55} | {key:<18} |  {check}   |")
        
    print(f"-------------------------------------------------------------------------------------\n")

print_status()
