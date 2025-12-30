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

class H4_DebugSender:
    """
    {h4-DEBUG} Sender (The Portal Gun) 🟠
    Teleports data to the global storage.
    Acts as a passthrough for convenience.
    """
    def __init__(self):
        pass
    
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "any_input": (ANY_TYPE,),
                "trigger_key": ("STRING", {"default": "my_signal", "multiline": False}),
            }
        }

    RETURN_TYPES = (ANY_TYPE,)
    RETURN_NAMES = ("any_input",)
    FUNCTION = "send_debug"
    CATEGORY = "h4_Live/Debug"

    def send_debug(self, any_input, trigger_key):
        input_type = type(any_input).__name__
        _log("DebugSender", f"🟠 Sending '{trigger_key}' to Orbit. Type: {input_type}")
        
        # Log Shape/Details if possible
        if hasattr(any_input, "shape"):
             _log("DebugSender", f"   Info: Shape {any_input.shape}")
             
        orbit_set(trigger_key, any_input)
        return (any_input,)

class H4_DebugReceiver:
    """
    {h4-DEBUG} Receiver (The Portal Exit) 🔵
    Retrieves data from global storage.
    Breaks loops because it has no wired input.
    """
    def __init__(self):
        pass
    
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "listen_key": ("STRING", {"default": "my_signal", "multiline": False}),
            }
        }

    RETURN_TYPES = (ANY_TYPE,)
    RETURN_NAMES = ("teleported_data",)
    FUNCTION = "receive_debug"
    CATEGORY = "h4_Live/Debug"
    
    # Needs to update every run to fetch new data
    @classmethod
    def IS_CHANGED(cls, **kwargs):
        return float("nan")

    def receive_debug(self, listen_key):
        val = orbit_get(listen_key)
        
        if val is None:
            _log("DebugReceiver", f"🔵 Listening for '{listen_key}'... NOTHING FOUND.")
            # Return None to avoid crashing execution if possible, or maybe a safetensor?
            return (None,)
            
        input_type = type(val).__name__
        _log("DebugReceiver", f"🔵 Received '{listen_key}' from Orbit. Type: {input_type}")
        return (val,)

class H4_TrafficCop:
    """
    The Main Logic Gate (Friendly Version).
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
    
    I help you run things differently 
    the first time vs the next times.
    
    **How I work:**
    1. **First Run (Setup)**:
       When you hit Queue, I send your input 
       to the TOP output ("Run_Once"). 
       The bottom output stays dead.
       
    2. **Next Runs (Looping)**:
       If you are auto-queuing, every run 
       after the first one goes to the 
       BOTTOM output ("Loop"). 
       The top output stays dead.
    
    **Use me to:**
    - Load a model once, reuse many times.
    - Generate a seed, then refine forever.
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

        # 4. Route Traffic
        if current_count == 0:
            _log(node_id, "👉 Routing to: RUN ONCE (Start)")
            # First Run: Send Signal to Setup (Top), Send None to Loop (Bottom)
            return (any_input, None)
        else:
            _log(node_id, "👉 Routing to: LOOP (Continue)")
            # Subsequent Runs: Send None to Setup (Top), Send Signal to Loop (Bottom)
            return (None, any_input)

class H4_TrafficMerge:
    """
    The Merge Node (Friendly Version).
    Safely selects between two inputs based on the run count.
    Prevents 'None' crashes by merging the flow into one active path.
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
                "restart_on_true": ("BOOLEAN", {
                    "default": False, 
                    "label": "Restart Count? (True=Reset)",
                    "tooltip": "Turn this ON to start continuously from the beginning. Turn it OFF to allow looping."
                }),
            },
        }

    RETURN_TYPES = (ANY_TYPE,)
    RETURN_NAMES = ("Selected_Output",)
    
    DESCRIPTION = """
    🤐 I am the Traffic Zipper.
    
    I solve the "Red Node Crash".
    Instead of splitting logic, I merge it.
    
    **How I work:**
    - **Run 0**: I grab `run_once_input`.
    - **Run 1+**: I grab `loop_input`.
    
    **Why use me?**
    Connect **Empty Latent** to Top.
    Connect **Feedback Latent** to Bottom.
    Feed my Output to **ONE** KSampler.
    
    Now you loop safely without 
    complex switching logic!
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

    def process_merge(self, run_once_input, loop_input, restart_on_true):
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
            _log(node_id, f"👉 Selecting: SETUP Input ({item_type})")
            return (run_once_input,)
        else:
            item_type = type(loop_input).__name__
            _log(node_id, f"👉 Selecting: LOOP Input ({item_type})")
            return (loop_input,)

class H4_StateMonitor:
    """
    Debug Node (Friendly Version).
    """
    @classmethod
    def INPUT_TYPES(s):
        return {"required": {}}
    
    RETURN_TYPES = ("INT",)
    RETURN_NAMES = ("loop_count_number",)
    
    DESCRIPTION = """
    👀 I am a simple counter.
    
    I look at system memory 
    and ask: "What run is this?"
    
    - 0 = First run.
    - 1 = Second run.
    - 100 = Running loop.
    """
    
    FUNCTION = "report_state"
    CATEGORY = "h4_Live/Debug"

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        return float("nan")

    def report_state(self):
        state = get_state()
        # count = state["loop_count"] 
        # _log("StateMonitor", f"Reporting Count: {count}") # Commented out to avoid spam, uncomment if needed
        return (state["loop_count"],)
