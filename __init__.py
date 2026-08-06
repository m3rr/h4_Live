# 👁️ h4_Live ToolKit - The Mothership (Dynamic Discovery Engine)
# ==============================================================================
# v7.0.1 - Atomic Plugin Architecture
# ==============================================================================
# This is the central brain that scans the 'nodes/' shelf for hot-swappable nodes.
# Deleting a folder in 'nodes/' safely removes it from the pack without side-effects.

import os
import sys
import importlib
import logging

# Ensure root directory is in sys.path so members can import correctly
sys.path.append(os.path.dirname(__file__))

# Import the "OS" (Core Logic)
from .core.h4_core import _log

import shutil

def nuke_pycache(root_dir):
    try:
        for root, dirs, files in os.walk(root_dir):
            if "__pycache__" in dirs:
                shutil.rmtree(os.path.join(root, "__pycache__"), ignore_errors=True)
    except:
        pass

# NUKE PYCACHE (Keeping the house clean)
nuke_pycache(os.path.dirname(__file__))

# --- GLOBALS & PROTECTED ASSETS ---
NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}
__version__ = "11.2.7"
WEB_DIRECTORY = "./js"

# Files that stay in the root /js folder and are NEVER deleted by the harvester
PROTECTED_JS = [
    "assets", "h4_theme_overrides.json", "h4themeoverrides.json",
    "h4_BigBrother.js", "h4BigBrother.js", "h4_Dashboard.js", "h4Dashboard.js",
    "h4_Sidebar.js", "h4Sidebar.js", "h4_generation.js", "h4generation.js",
    "h4_ParameterTracer.js", "h4ParameterTracer.js", "h4_LoreManager.js", "h4LoreManager.js",
    "h4_Comparinator.js", "h4Comparinator.js", "h4_Switcheroo.js", "h4Switcheroo.js",
    "h4_SmartSave.js", "h4SmartSave.js", "h4_MissionControl.js", "h4MissionControl.js",
    "h4_dead_weight.js", "h4_deadweight.js", "h4deadweight.js", "h4_SovereignCore.js", "h4SovereignCore.js",
    "h4_Lore.js", "h4_DisplayAny.js", "h4_DocuScribe.js", "h4_DoubleSampler.js",
    "h4_ForgeMask.js", "h4_IdentityEngine.js", "h4_LatentSelector.js", "h4_Loaders.js",
    "h4_Mutate.js", "h4_Oxidine.js", "h4_PixelPress.js", "h4_VisualTokenizer.js",
    "h4_datastream.js", "h4_faceforge.js", "h4_gridinator.js", "h4_model_merger.js",
    "h4_model_save.js", "h4_node_translator.js", "pythonipulator_inator.js", "h4_img_compress.js",
    "h4_LinkQoL.js"
]

def harvest_js_assets(nodes_dir, root_js_dir):
    """
    Synchronizes JS assets from individual node folders to the root WEB_DIRECTORY.
    Dynamically preserves standalone root extension scripts.
    """
    try:
        if not os.path.exists(root_js_dir):
            os.makedirs(root_js_dir, exist_ok=True)
            _log(f"MOTHERSHIP: Created root JS directory at {root_js_dir}")
            
        # Discover all valid JS assets across node web/ folders
        managed_node_js = set()
        if os.path.exists(nodes_dir):
            for node_folder in os.listdir(nodes_dir):
                if node_folder.startswith("__"): continue
                web_path = os.path.join(nodes_dir, node_folder, "web")
                if os.path.isdir(web_path):
                    for item in os.listdir(web_path):
                        managed_node_js.add(item)
                        
        # 1. Clean stale node JS only if it is no longer present in any node web folder AND not protected
        for item in os.listdir(root_js_dir):
            if item not in PROTECTED_JS and item not in managed_node_js and not item.endswith(".js"):
                path = os.path.join(root_js_dir, item)
                try:
                    if os.path.isdir(path):
                        shutil.rmtree(path)
                    else:
                        os.remove(path)
                except Exception as e:
                    _log(f"MOTHERSHIP: [WARNING] Lock on {item} - skipping prune. {e}")
                    
        # 2. Harvest fresh JS from nodes
        count = 0
        if not os.path.exists(nodes_dir):
            return False

        for node_folder in os.listdir(nodes_dir):
            if node_folder.startswith("__"): continue
            
            web_path = os.path.join(nodes_dir, node_folder, "web")
            if os.path.isdir(web_path):
                for js_file in os.listdir(web_path):
                    src = os.path.join(web_path, js_file)
                    dst = os.path.join(root_js_dir, js_file)
                    
                    try:
                        if os.path.isdir(src):
                            shutil.copytree(src, dst, dirs_exist_ok=True)
                        else:
                            shutil.copy2(src, dst)
                        count += 1
                    except Exception as e:
                        _log(f"MOTHERSHIP: [ERROR] Failed to sync {js_file}: {e}")

        _log(f"MOTHERSHIP: 📡 JS Harvest Complete: {count} assets synced.")
        return True
    except Exception as e:
        _log(f"[ERROR] MOTHERSHIP: ❌ JS Harvester Critical Fault -> {e}")
        return False

def dynamic_discovery():
    """
    Scans the './nodes/' directory for standalone modules (.py) or folders with __init__.py.
    Builds the final NODE_CLASS_MAPPINGS and reports status to the console.
    """
    global NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS
    
    root_dir = os.path.dirname(__file__)
    nodes_dir = os.path.join(root_dir, "nodes")
    root_js_dir = os.path.join(root_dir, "js")
    
    if not os.path.exists(nodes_dir):
        _log(f"[ERROR] WARNING: The shelf directory '{nodes_dir}' is missing. Pack is offline.")
        return

    # --- JS HARVEST ---
    harvest_js_assets(nodes_dir, root_js_dir)

    # --- Live Audit Table Header ---
    _log("=" * 60)
    _log(f"  h4_Live DISCOVERY: [ SHELF AUDIT v3 ]")
    _log("-" * 60)
    _log("{:<24} | {:<20} | {:<10}".format("MODULE", "NODE_STATUS", "INTEGRITY"))
    _log("-" * 60)
    
    # 1. Gather all potential node modules
    items = [i for i in os.listdir(nodes_dir) if not i.startswith("__")]
    items.sort()
    
    for item in items:
        item_path = os.path.join(nodes_dir, item)
        is_python_file = item.endswith(".py")
        is_folder = os.path.isdir(item_path)
        
        # 1.5. Guard: Skip invalid module candidates (e.g. archives, docs, temp files)
        if not (is_python_file or is_folder):
            continue
        
        module_name = item.replace(".py", "") if is_python_file else item
        full_module_path = f".nodes.{module_name}"
        
        status = "OFFLINE"
        integrity = "VOID"
        
        try:
            # 2. Dynamic Import
            module = importlib.import_module(full_module_path, package=__name__)
            
            # 3. Pull Class Mappings if present
            if hasattr(module, "NODE_CLASS_MAPPINGS"):
                mappings = getattr(module, "NODE_CLASS_MAPPINGS")
                NODE_CLASS_MAPPINGS.update(mappings)
                
                # Pull Display Name Mappings (Optional)
                if hasattr(module, "NODE_DISPLAY_NAME_MAPPINGS"):
                    display_mappings = getattr(module, "NODE_DISPLAY_NAME_MAPPINGS")
                    NODE_DISPLAY_NAME_MAPPINGS.update(display_mappings)
                
                status = "[ ACTIVE ]"
                integrity = f"OK ({len(mappings)})"
            else:
                status = "[ PASIVE ]"
                integrity = "UTILITY"
                
        except Exception as e:
            status = "[ ERROR  ]"
            integrity = "FAILED"
            _log(f"[ERROR] MOTHERSHIP: Fault in {module_name} -> {e}")
            
        # 4. Print Table Row
        _log("{:<24} | {:<20} | {:<10}".format(module_name, status, integrity))
            
    _log("-" * 60)
    _log(f"  SYSTEM ONLINE: {len(NODE_CLASS_MAPPINGS)} nodes available across {len(items)} modules.")
    _log("=" * 60)

# Run the Discovery
dynamic_discovery()

# --- POST-BOOT FORENSIC STATUS ---
try:
    from .nodes.h4_smart_save.nodes_save import _manifest
    if _manifest:
        _manifest.report_status()
except:
    pass

# --- SERVER EXTENSION REGISTRATION ---
# This ensures h4_server still registers its API endpoints
try:
    # Manual trigger for the server module to ensure it registers its routes
    from .core import h4_server
except Exception as e:
    _log(f"[ERROR] MOTHERSHIP: Critical Engine Fault (Server) -> {e}")

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
