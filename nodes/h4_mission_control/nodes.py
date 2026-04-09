# FILE: custom_nodes/comfyui_h4_live/h4_mission_control.py
# ------------------------------------------------------------------------------
# H4 Mission Control System
# Rule 1 (No Placeholders): Full logic for Scheduling and Dashboarding.
# Rule 11 (Logging): Debug modes and value tracking.
# Rule 21 (Debug Review): Input validation and type safety.
# ------------------------------------------------------------------------------
# ------------------------------------------------------------------------------
# H4 IMPORTS (Nuclear Fallbacks)
# ------------------------------------------------------------------------------
try:
    from ...core.h4_core import get_state, _log, increment_loop, reset_state, orbit_get, orbit_set
    from ...core.h4_utils import ANY_TYPE
except ImportError:
    # Standalone Mock State
    _STANDALONE_STATE = {"loop_count": 0}
    def get_state(): return _STANDALONE_STATE
    def _log(msg): print(f"[Mission Control] {msg}")
    def increment_loop(): _STANDALONE_STATE["loop_count"] += 1
    def reset_state(): _STANDALONE_STATE["loop_count"] = 0
    def orbit_get(k): return None
    def orbit_set(k, v): pass
    ANY_TYPE = "*"

import random
from server import PromptServer

class H4_MissionControl:
    """
    🛸 H4 Mission Control (The Dashboard & Driver)
    
    A central hub for your loop signals.
    - Active Mode: Drives the loop (Increments Count).
    - Passive Mode: Just watches.
    """
    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "mode": (["Passive", "Active (Master Base)"], {
                    "default": "Passive", 
                    "tooltip": "Passive: Read-Only. Active: Increments Loop Count & Handles Resets."
                }),
                "wireless_reset": ("BOOLEAN", {
                    "default": False,
                    "label": "Reset via Wireless?",
                    "tooltip": "ON=Check orbit storage for reset signal (Red Button). Only works in Active Mode."
                }),
                "debug_mode": ("BOOLEAN", {
                    "default": False, 
                    "label": "Debug Mode (Nuclear Logs)", 
                    "tooltip": "Turn ON to flood the console with detailed values."
                }),
            },
            "optional": {
                "scheduler_val": ("FLOAT", {"forceInput": True, "tooltip": "Connect a Signal Generator (Float) here."}),
                "scheduler_seed": ("INT", {"forceInput": True, "tooltip": "Connect a Seed Generator (Int) here."}),
                "trigger_in": (ANY_TYPE, {"tooltip": "Daisy chain trigger (Optional)."}),
            }
        }

    RETURN_TYPES = ("FLOAT", "INT", ANY_TYPE, "STRING")
    RETURN_NAMES = ("Scheduler_Val", "Scheduler_Seed", "Trigger_Pass", "Dashboard_UI")
    
    DESCRIPTION = """
    🛸 **H4 Mission Control**
    
    **The Flight Deck for your Loop.**
    - **Active Mode**: Increments the loop counter. Connect logic flow here!
    - **Passive Mode**: Just displays stats. 
    
    **Outputs:**
    - Passes signals through safely.
    - `Dashboard_UI`: Connect to a Text Display node to see stats.
    """
    
    FUNCTION = "process_mission"
    CATEGORY = "h4_Live/MissionControl"

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        # Always update in Active Mode to ensure loop runs
        if kwargs.get("mode") == "Active (Master Base)":
            return float("nan")
        return float("nan")

    def process_mission(self, mode, wireless_reset, debug_mode, scheduler_val=None, scheduler_seed=None, trigger_in=None):
        node_id = "MissionControl"
        
        # --- ACTIVE MODE LOGIC ---
        if mode == "Active (Master Base)":
            # 1. Check Wireless Reset
            if wireless_reset:
                reset_flag = orbit_get("request_reset")
                if reset_flag is True:
                    _log(f"[{node_id}] 📡 Wireless Reset Signal Detected!")
                    reset_state()
                    orbit_set("request_reset", False)
            
            # 2. Increment Loop
            increment_loop()
            
        # --- STATS REPORTING ---
        state = get_state()
        count = state["loop_count"]
        
        # 1. Log Stats
        if debug_mode:
            _log(f"[{node_id}] ----------------------------------------")
            _log(f"[{node_id}] 🛸 MISSION STATUS | RUN: {count}")
            _log(f"[{node_id}] Mode: {mode}")
            _log(f"[{node_id}] Sched Val: {scheduler_val}")
            _log(f"[{node_id}] Sched Seed: {scheduler_seed}")
            _log(f"[{node_id}] ----------------------------------------")

        # 2. Build UI String
        ui_report = f"🛸 H4 MISSION CONTROL\n"
        ui_report += f"Mode: {mode}\n"
        ui_report += f"Run Count: {count}\n"
        ui_report += f"Scheduler Value: {scheduler_val}\n"
        ui_report += f"Current Seed: {scheduler_seed}\n"
        
        # 3. Passthrough
        return (scheduler_val, scheduler_seed, trigger_in, ui_report)


class H4_LinearScheduler:
    """
    📈 H4 Linear Scheduler
    
    Generates a ramping float value based on loop count.
    Formula: Start + (End - Start) * (Current / Max)
    """
    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "start_val": ("FLOAT", {
                    "default": 1.0, "min": 0.0, "max": 10000.0, "step": 0.01,
                    "tooltip": "Value at Loop 0."
                }),
                "end_val": ("FLOAT", {
                    "default": 0.0, "min": 0.0, "max": 10000.0, "step": 0.01,
                    "tooltip": "Value at Max Loop."
                }),
                "max_loops": ("INT", {
                    "default": 16, "min": 1, "max": 10000, 
                    "tooltip": "The total number of loops you plan to run."
                }),
            }
        }

    RETURN_TYPES = ("FLOAT",)
    RETURN_NAMES = ("Scheduled_Float",)
    
    DESCRIPTION = """
    📈 **H4 Linear Scheduler**
    
    Generates a value that changes over time.
    Useful for Denoise Ramps, CFG Ramps, etc.
    """
    
    FUNCTION = "calculate_linear"
    CATEGORY = "h4_Live/MissionControl"

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        return float("nan")

    def calculate_linear(self, start_val, end_val, max_loops):
        state = get_state()
        count = state["loop_count"]
        
        # Safety: Prevent division by zero
        if max_loops < 1: max_loops = 1
        
        # Clamp Logic: If we go past max loops, stay at end_val
        if count >= max_loops:
            return (end_val,)
            
        # Linear Interpolation
        progress = count / max_loops
        current_val = start_val + (end_val - start_val) * progress
        
        return (current_val,)


class H4_SeedGenerator:
    """
    🎲 H4 Seed Generator
    
    Controls randomness with intent.
    Modes: Incremental, Fixed, Random.
    """
    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "start_seed": ("INT", {
                    "default": 0, "min": 0, "max": 0xffffffffffffffff, 
                    "tooltip": "The starting seed."
                }),
                "mode": (["Incremental", "Fixed", "Random"], {
                    "default": "Incremental",
                    "tooltip": "Incremental: Start + Loop Count. Fixed: Always Start. Random: Pure Entropy."
                }),
                "broadcast": ("BOOLEAN", {
                    "default": False,
                    "label": "📡 Broadcast Wireless?",
                    "tooltip": "If True, this seed will overwrite ALL other seed widgets in the workflow."
                }),
            },
            "hidden": {"unique_id": "UNIQUE_ID"},
        }

    RETURN_TYPES = ("INT",)
    RETURN_NAMES = ("Scheduled_Seed",)
    
    DESCRIPTION = """
    🎲 **H4 Seed Generator**
    
    **Modes:**
    - **Incremental**: Best for sweeping. (Run 0 = Seed, Run 1 = Seed+1...)
    - **Fixed**: Best for testing logic. Reuses same seed.
    - **Random**: Best for exploration. New seed every time.
    """
    
    FUNCTION = "generate_seed"
    CATEGORY = "h4_Live/MissionControl"

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        # Force update for Random mode
        if kwargs.get("mode") == "Random":
            return float("nan")
        return float("nan")

    def generate_seed(self, start_seed, mode, broadcast, unique_id=None):
        state = get_state()
        count = state["loop_count"]
        
        final_seed = start_seed

        if mode == "Fixed":
            final_seed = start_seed
        elif mode == "Incremental":
            final_seed = start_seed + count
        else: # Random (Pure Entropy)
            final_seed = random.randint(0, 0xffffffffffffffff)
            
        if broadcast:
            # Wireless Signal
            try:
                PromptServer.instance.send_sync("h4_broadcast_seed", {"seed": final_seed, "source_id": unique_id})
            except Exception as e:
                _log(f"[SeedGen] Broadcast Failed: {e}")
                
        return (final_seed,)