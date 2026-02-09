# FILE: custom_nodes/comfyui_h4_live/__init__.py
# ------------------------------------------------------------------------------
# 🚀 h4_Live ToolKit | Nuclear Logic & Persistent State
# ------------------------------------------------------------------------------
import sys

# Version Check
try:
    from .version import __version__
except ImportError:
    __version__ = "?.?.?"

# Import Nodes
from .h4_traffic import H4_TrafficCop, H4_TrafficMerge, H4_TrafficRouter, H4_StateMonitor, H4_LoopIncrementer, H4_WirelessResetButton, H4_ImageBuffer
from .h4_context import H4_ContextHub, H4_ContextUnpack
from .h4_smart_debug import H4_SmartConsole
from .h4_mission_control import H4_MissionControl, H4_LinearScheduler, H4_SeedGenerator
from .h4_gridinator import H4_Gridinator
from .h4_debug_error import H4_DebugErrorGenerator
from .h4_discombobulator import H4_Discombobulator
from .h4_datastream import H4_DataStream
from .h4_axis import H4_AxisDriver
from .h4_varianator import H4_Varianator
from .h4_seed_sequencer import H4_SeedSequencer
from .h4_notes import H4_NoteInjector
from .h4_pixel_press import H4_PixelPress
from .h4_comparinator import H4_Comparinator
from .h4_visual_tokenizer import H4_VisualTokenizer
from .h4_loaders import H4_UniversalLoader
from .h4_model_merger import H4_ModelMerger
from .h4_model_save import H4_ModelSave

# FaceForge Module (AIO Face Swap Suite)
from .h4_faceforge import (
    H4_FaceForge,
    H4_LoadFaceModel,
    H4_BuildFaceModel,
    H4_SaveFaceModel,
    H4_IdentityEngine,
    H4_FaceDetailer,
    NODE_CLASS_MAPPINGS as FACEFORGE_CLASS_MAPPINGS,
    NODE_DISPLAY_NAME_MAPPINGS as FACEFORGE_DISPLAY_MAPPINGS,
)

# DisplayAny Module
from .h4_display_any import H4_DisplayAny

# DocuScribe Module
from .h4_docuscribe import H4_DocuScribe

# SmartSave Module
from .h4_smart_save import H4_SmartSave

# Server / API Logic (Presets)
from . import h4_server

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
    "H4_Discombobulator": H4_Discombobulator,
    "H4_DataStream": H4_DataStream,
    "H4_AxisDriver": H4_AxisDriver,
    "H4_Varianator": H4_Varianator,
    "H4_SeedSequencer": H4_SeedSequencer,
    "H4_NoteInjector": H4_NoteInjector,
    "H4_PixelPress": H4_PixelPress,
    "H4_Comparinator": H4_Comparinator,
    "H4_VisualTokenizer": H4_VisualTokenizer,
    "H4_ModelMerger": H4_ModelMerger,
    "H4_ModelSave": H4_ModelSave,
    # FaceForge Suite
    **FACEFORGE_CLASS_MAPPINGS,
    # Logic
    "H4_DisplayAny": H4_DisplayAny,
    "H4_UniversalLoader": H4_UniversalLoader,
    "H4_DocuScribe": H4_DocuScribe,
    "H4_SmartSave": H4_SmartSave,
    "H4_NoteInjector": H4_NoteInjector,
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
    "H4_Discombobulator": "The Discombobulator (Use with CAUTION)",
    "H4_DataStream": "h4 DataStream (Batch Loader)",
    "H4_AxisDriver": "h4 Axis Driver (Grid Tools)",
    "H4_Varianator": "h4 Varianator (Latent Riffler)",
    "H4_SeedSequencer": "h4 Seed Sequencer (Chaos Control)",
    "H4_PixelPress": "h4 Pixel Press (Density)",
    # FaceForge Suite
    **FACEFORGE_DISPLAY_MAPPINGS,
    # Logic
    "H4_DisplayAny": "h4 Display Any+ (Universal Monitor)",
    "H4_UniversalLoader": "h4 Universal Loader (Checkpoint/Diffusers)",
    "H4_DocuScribe": "📜 H4 DocuScribe (Workflow Reporter)",
    "H4_SmartSave": "💾 H4 SmartSave (Preview/Save)",
    "H4_Comparinator": "⚔️ h4 Comparinator (A/B Test)",
    "H4_NoteInjector": "📝 H4 Note Injector (Title Bar)",
    "H4_VisualTokenizer": "👁️ h4 Visual Tokenizer (Weights)",
    "H4_ModelMerger": "🧪 H4 Model Merger (Mad Science!)",
    "H4_ModelSave": "💾 H4 Model Save (Simple)",
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
        if "Discombobulator" in key:
            continue
            
        # Clean up the name for display
        name = val
        print(f"| {name:<55} | {key:<18} |  {check}   |")
        
    print(f"-------------------------------------------------------------------------------------\n")

print_status()
