# FILE: custom_nodes/comfyui_h4_live/h4_traffic.py
# ------------------------------------------------------------------------------
# Traffic Control Nodes
# Rule 1 (No Placeholders): Fully functional logic gating.
# Rule 11 (Logging): Detailed payload inspection.
# Rule 21 (Debug Review): Input/Output validation.
# ------------------------------------------------------------------------------
from .h4_core import get_state, increment_loop, reset_state, orbit_set, orbit_get
from .h4_utils import ANY_TYPE
import datetime

def _log(node_name: str, message: str):
    """Internal helper to standardize logging format per Rule 11."""
    ts = datetime.datetime.now().strftime("%H:%M:%S.%f")[:-3]
    print(f"[h4_Live][{node_name}][{ts}] {message}")

class H4_TrafficRouter:
    """
    🚦 H4 Traffic Router (The Nexus)
    Combines the Splitter and Merger into one powerful node.
    NOW WITH SMART DENOISE CONTROL.
    """
    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "first_run_in": (ANY_TYPE, {"tooltip": "Items for the FIRST run (Run 0)."}),
                "loop_run_in": (ANY_TYPE, {"tooltip": "Items for the LOOP runs (Run 1+)."}),
                "first_denoise": ("FLOAT", {
                    "default": 1.00, "min": 0.00, "max": 1.00, "step": 0.01,
                    "label": "First Run Denoise",
                    "tooltip": "Denoise value to send during the start (Run 0)."
                }),
                "loop_denoise": ("FLOAT", {
                    "default": 0.45, "min": 0.00, "max": 1.00, "step": 0.01,
                    "label": "Loop Run Denoise",
                    "tooltip": "Denoise value to send during the loop (Run 1+)."
                }),
                "restart": ("BOOLEAN", {
                    "default": False, 
                    "label": "Restart Count?", 
                    "tooltip": "True = Reset to 0. False = Continue Looping."
                }),
            }
        }

    # Outputs: Context (Data), Denoise (Float)
    RETURN_TYPES = (ANY_TYPE, "FLOAT")
    RETURN_NAMES = ("Context_Out", "Denoise_Val")
    
    DESCRIPTION = """
    🚦 **H4 Traffic Router (Smart Nexus)**
    
    Merges "Start" and "Loop" flows into one stream.
    Automatically switches Denoise values based on the run count.
    
    **Usage:**
    1. Connect `Context_Out` to your KSampler's `input`.
    2. Connect `Denoise_Val` to your KSampler's `denoise`.
    """
    
    FUNCTION = "process_router"
    CATEGORY = "h4_Live/Logic"

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        return float("nan")

    def process_router(self, first_run_in, loop_run_in, first_denoise, loop_denoise, restart):
        node_id = "TrafficRouter"
        
        # 1. Handle Reset
        if restart:
            _log(node_id, "⚠️ RESTART SIGNAL RECEIVED")
            current_count = reset_state()
        else:
            state = get_state()
            current_count = state["loop_count"]
            
        _log(node_id, f"Processing Nexus | ID: {current_count}")
        
        if not restart:
            increment_loop()

        # 3. Routing Logic & Denoise Selection
        if current_count == 0:
            _log(node_id, f"👉 Route: START MODE (Run 0) | Denoise: {first_denoise}")
            if first_run_in is None:
                raise ValueError(f"[{node_id}] CRITICAL: 'first_run_in' is missing! I cannot start without it.")
            
            # Smart Output: First Run Data + First Run Denoise
            return (first_run_in, first_denoise)
        else:
            _log(node_id, f"👉 Route: LOOP MODE (Run {current_count}) | Denoise: {loop_denoise}")
            if loop_run_in is None:
                 raise ValueError(f"[{node_id}] CRITICAL: 'loop_run_in' is connected but empty! Run {current_count} needs data.")

            # Smart Output: Loop Run Data + Loop Run Denoise
            return (loop_run_in, loop_denoise)

class H4_TrafficCop:
    """
    The Main Logic Gate (Legacy Splitter).
    Now with SAFE PASSTHROUGH to prevents Red Node Crashes.
    """
    
    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "any_input": (ANY_TYPE, {
                    "tooltip": "Connect the item you want to control. It can be anything (Image, Model, Text, etc)."
                }),
                "restart_on_true": ("BOOLEAN", {
                    "default": False, 
                    "label": "Restart Count? (True=Reset)",
                    "tooltip": "Turn this ON to start continuously from the beginning. Turn it OFF to allow looping."
                }),
            },
        }

    # Two outputs: Friendly Names
    RETURN_TYPES = (ANY_TYPE, ANY_TYPE)
    RETURN_NAMES = ("Run_Once_(Start)", "Loop_(Continue)")
    
    # Detailed User-Friendly Description
    DESCRIPTION = """
    👋 Hi! I am your Workflow Splitter.
    *(Legacy Node: Consider using H4 Traffic Router for more options)*
    
    I help you run things differently 
    the first time vs the next times.
    
    **SAFE MODE ACTIVE:**
    I will never output 'Nothing'. 
    If a path is inactive, I send the data anyway 
    to prevent your workflow from crashing.
    """
    
    FUNCTION = "process_logic"
    CATEGORY = "h4_Live/Logic"

    # CRITICAL: This tells Comfy "I am always new." 
    @classmethod
    def IS_CHANGED(cls, **kwargs):
        return float("nan")

    @classmethod
    def VALIDATE_INPUTS(cls, **kwargs):
        return True

    def process_logic(self, any_input, restart_on_true):
        node_id = "TrafficCop"
        
        # 0. Log Inputs (Rule 24: Nuclear Debugging)
        input_type = type(any_input).__name__
        _log(node_id, f"📥 Received Input Type: {input_type}")
        if restart_on_true:
             _log(node_id, "⚠️ RESTART SIGNAL RECEIVED")

        # 1. Handle Reset Request
        if restart_on_true:
            current_count = reset_state()
        else:
            state = get_state()
            current_count = state["loop_count"]

        # 2. Log Decision
        _log(node_id, f"Processing Logic | ID: {current_count}")

        # 3. Increment for the *next* pass
        if not restart_on_true:
            increment_loop()
        
        # Validation
        if any_input is None:
             raise ValueError(f"[{node_id}] ERROR: Input is missing! I cannot split 'Nothing'.")

        # 4. Route Traffic (Safe Mode)
        if current_count == 0:
            _log(node_id, "👉 Routing to: RUN ONCE (Start)")
            # Run 0: Active on Top, Fallback on Bottom
            return (any_input, any_input)
        else:
            _log(node_id, "👉 Routing to: LOOP (Continue)")
            # Run 1+: Fallback on Top, Active on Bottom
            return (any_input, any_input)

class H4_TrafficMerge:
    """
    The Merge Node (Zipper).
    Safely selects between two inputs based on the run count.
    Also controls Denoise.
    """
    
    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "run_once_input": (ANY_TYPE, {
                    "tooltip": "The item to use for the very first time only."
                }),
                "loop_input": (ANY_TYPE, {
                    "tooltip": "The item to use for every time after the first."
                }),
                "first_denoise": ("FLOAT", {
                    "default": 1.00, "min": 0.00, "max": 1.00, "step": 0.01,
                    "label": "First Run Denoise",
                    "tooltip": "Denoise value to send during the start (Run 0)."
                }),
                "loop_denoise": ("FLOAT", {
                    "default": 0.45, "min": 0.00, "max": 1.00, "step": 0.01,
                    "label": "Loop Run Denoise",
                    "tooltip": "Denoise value to send during the loop (Run 1+)."
                }),
                "restart_on_true": ("BOOLEAN", {
                    "default": False, 
                    "label": "Restart Count? (True=Reset)",
                    "tooltip": "Turn this ON to start continuously from the beginning. Turn it OFF to allow looping."
                }),
            },
        }

    RETURN_TYPES = (ANY_TYPE, "FLOAT")
    RETURN_NAMES = ("Selected_Output", "Denoise_Val")
    
    DESCRIPTION = """
    🤐 **H4 Traffic Merge (Smart)**
    
    Merges two inputs into one stream.
    Selects Denoise value automatically.
    
    **How I work:**
    - **Run 0**: I grab `run_once_input` & `first_denoise`.
    - **Run 1+**: I grab `loop_input` & `loop_denoise`.
    """
    
    FUNCTION = "process_merge"
    CATEGORY = "h4_Live/Logic"

    # CRITICAL: Always update
    @classmethod
    def IS_CHANGED(cls, **kwargs):
        return float("nan")

    @classmethod
    def VALIDATE_INPUTS(cls, **kwargs):
        return True

    def process_merge(self, run_once_input, loop_input, first_denoise, loop_denoise, restart_on_true):
        node_id = "TrafficZipper"
        
        # 1. Handle Reset
        if restart_on_true:
            _log(node_id, "⚠️ RESTART SIGNAL RECEIVED")
            current_count = reset_state()
        else:
            state = get_state()
            current_count = state["loop_count"]
            
        _log(node_id, f"Processing Merge | ID: {current_count}")
        
        if not restart_on_true:
            increment_loop()

        # 3. Select w/ Logging
        if current_count == 0:
            item_type = type(run_once_input).__name__
            _log(node_id, f"👉 Selecting: SETUP Input ({item_type}) | Denoise: {first_denoise}")
            if run_once_input is None:
                 raise ValueError(f"[{node_id}] CRITICAL: Run 0 Input (Top) is Not Connected.")
            return (run_once_input, first_denoise)
        else:
            item_type = type(loop_input).__name__
            _log(node_id, f"👉 Selecting: LOOP Input ({item_type}) | Denoise: {loop_denoise}")
            if loop_input is None:
                 if run_once_input is not None:
                     _log(node_id, "⚠️ Loop Input Missing! Falling back to Setup Input to prevent crash.")
                     return (run_once_input, loop_denoise)
                 raise ValueError(f"[{node_id}] CRITICAL: Run {current_count} Input (Bottom) is Not Connected!")
            return (loop_input, loop_denoise)

class H4_StateMonitor:
    """
    Debug Node (Friendly Version).
    """
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {},
            "optional": {
                 "Any_In": (ANY_TYPE, {"tooltip": "Optional: Connect an output here to force this monitor to wait for that node (Daisy Chaining)."})
            }
        }
    
    RETURN_TYPES = ("INT", ANY_TYPE)
    RETURN_NAMES = ("loop_count_number", "Any_Pass")
    
    DESCRIPTION = """
    👀 I am a simple counter.
    
    I look at system memory 
    and ask: "What run is this?"
    
    **Tip**: Connect the output of your 
    Logic Node to `Any_In` to make sure 
    I wait for the Reset to happen first!
    """
    
    FUNCTION = "report_state"
    CATEGORY = "h4_Live/Debug"

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        return float("nan")

    def report_state(self, Any_In=None):
        state = get_state()
        return (state["loop_count"], Any_In)
