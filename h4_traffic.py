# FILE: custom_nodes/comfyui_h4_live/h4_traffic.py
# ------------------------------------------------------------------------------
# Traffic Control Nodes
# Rule 1 (No Placeholders): Fully functional logic gating.
# Rule 11 (Logging): Detailed payload inspection.
# Rule 21 (Debug Review): Input/Output validation.
# ------------------------------------------------------------------------------
from .h4_core import get_state, increment_loop, reset_state, orbit_set, orbit_get, buffer_image, get_buffered_image
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
            },
            "optional": {
                "first_run_in": (ANY_TYPE, {"tooltip": "Items for the FIRST run (Run 0)."}),
                "loop_run_in": (ANY_TYPE, {"tooltip": "Items for the LOOP runs (Run 1+)."}),
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

    @classmethod
    def VALIDATE_INPUTS(cls, **kwargs):
         print(f"[H4_TrafficRouter][GOD MODE] 🚦 Nexus Check! Inputs: {list(kwargs.keys())}")
         return True

    def check_lazy_status(self, first_denoise=None, loop_denoise=None, restart=False, first_run_in=None, loop_run_in=None, **kwargs):
        node_id = "TrafficRouter"
        try:
            # Always need these controls
            needed = ["first_denoise", "loop_denoise", "restart"]
            
            print(f"[H4_TrafficRouter][GOD MODE] 💤 Lazy Check... Args: {list(kwargs.keys())}")
            _log(node_id, f"Lazy Check | Restart: {restart}")
            
            state = get_state()
            count = state.get("loop_count", -1)
            
            if restart:
                needed.append("first_run_in")
                return needed
                
            if count == 0:
                needed.append("first_run_in")
            else:
                needed.append("loop_run_in")
                
            print(f"[H4_TrafficRouter][GOD MODE] 💤 Lazy Result: {needed}")    
            return needed
        except Exception as e:
            _log(node_id, f"Lazy Check Error: {e}")
            return []

    def process_router(self, first_denoise, loop_denoise, restart, first_run_in=None, loop_run_in=None):
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
                # Flawless Logic: If start is missing, check if loop is there (fallback)? No, Start 0 needs Start.
                raise ValueError(f"[{node_id}] CRITICAL: 'first_run_in' is missing! I cannot start without it.")
            
            return (first_run_in, first_denoise)
        else:
            _log(node_id, f"👉 Route: LOOP MODE (Run {current_count}) | Denoise: {loop_denoise}")
            if loop_run_in is None:
                 # Flawless Logic: If Loop is missing, try First Run as backup (e.g. single run mode)?
                 if first_run_in is not None:
                     _log(node_id, "⚠️ Loop Input Missing! Falling back to Setup Input.")
                     return (first_run_in, loop_denoise)
                 raise ValueError(f"[{node_id}] CRITICAL: 'loop_run_in' is connected but empty! Run {current_count} needs data.")

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
        print(f"[H4_TrafficCop][GOD MODE] 🚦 Check! Inputs: {list(kwargs.keys())}")
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
            "optional": {
                "run_once_input": (ANY_TYPE, {"tooltip": "The item to use for the very first time only."}),
                "loop_input": (ANY_TYPE, {"tooltip": "⚠️ LEAVE EMPTY FOR LOOPS! Use H4_ImageBuffer wireless mode instead. Wiring this directly causes ComfyUI Cycle Errors."}),
            }
        }

    RETURN_TYPES = (ANY_TYPE, "FLOAT")
    RETURN_NAMES = ("Selected_Output", "Denoise_Val")
    
    DESCRIPTION = """
    🤐 **H4 Traffic Merge (Smart)**
    
    Merges two inputs into one stream.
    Selects Denoise value automatically.
    
    **CRITICAL WARNING:**
    Due to ComfyUI limitations, you CANNOT wire the loop input directly from a later node (Cycle Error).
    **SOLUTION:** Use `H4_ImageBuffer` and leave `loop_input` EMPTY (Wireless Mode).
    """
    
    FUNCTION = "process_merge"
    CATEGORY = "h4_Live/Logic"

    # CRITICAL: Always update
    @classmethod
    def IS_CHANGED(cls, **kwargs):
        return float("nan")

    @classmethod
    def VALIDATE_INPUTS(cls, **kwargs):
        print(f"[H4_TrafficMerge][GOD MODE] 🤐 Check! Inputs: {list(kwargs.keys())}")
        
        # PROACTIVE WARNING:
        if "loop_input" in kwargs:
             print("[H4_TrafficMerge] ⚠️ CRITICAL WARNING: You have wired 'loop_input'. This WILL cause a ComfyUI Cycle Error during loops. Please UNPLUG it and use H4_ImageBuffer wirelessly!")
             
        return True

    def process_merge(self, first_denoise, loop_denoise, restart_on_true, run_once_input=None, loop_input=None):
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
        # 3. Select w/ Logging
            # 3. Select w/ Logging
        if current_count == 0:
            # Handle possible None input
            if run_once_input is None:
                 raise ValueError(f"[{node_id}] CRITICAL: Run 0 Input (Top) is Not Connected.")
            
            # MEMORY: Save the expected type for future runs
            item_type = type(run_once_input).__name__
            orbit_set("setup_type_name", item_type) 
            
            _log(node_id, f"👉 Selecting: SETUP Input ({item_type}) | Denoise: {first_denoise}")
            return (run_once_input, first_denoise)
            
        else:
            _log(node_id, f"👉 Routing to: LOOP MODE (Run {current_count}) | Denoise: {loop_denoise}")
            
            # WIRELESS FALLBACK
            final_loop_input = loop_input
            if loop_input is None:
                _log(node_id, "📡 WIRELESS MODE ENGAGED: Checking Universal Buffer...")
                buffered_data = get_buffered_image() # This is now 'get_buffered_data' effectively
                
                if buffered_data is not None:
                     _log(node_id, "✅ Wireless Data Acquired!")
                     final_loop_input = buffered_data
                else:
                     # Check if we should fallback to run_once input? No, that's dangerous.
                     _log(node_id, "❌ CRITICAL: Wireless Buffer is EMPTY. Did you place H4_ImageBuffer after the sender?")
            
            if final_loop_input is None:
                 if run_once_input is not None:
                     _log(node_id, "⚠️ Loop Input Missing! Falling back to Setup Input.")
                     return (run_once_input, loop_denoise)
                 raise ValueError(f"[{node_id}] CRITICAL: Run {current_count} needs data. Wired & Wireless failed.")

            # TYPE SAFETY CHECK (MEMORY BASED)
            # Retrieve what we saw in Run 0
            expected_type_name = orbit_get("setup_type_name")
            current_type_name = type(final_loop_input).__name__
            
            # If we have a memory record, we must enforce it.
            if expected_type_name and expected_type_name != current_type_name:
                
                # Strict enforcement to prevent obscure crashes (Image -> Latent)
                msg = f"[{node_id}] ⛔ TYPE MISMATCH DETECTED!\n"
                msg += f"   - SETUP Input (Run 0) was: {expected_type_name} (The correct type)\n"
                msg += f"   - LOOP  Input (Run {current_count}) is : {current_type_name} (The WRONG type)\n\n"
                msg += "   ❌ CRASH PREVENTED: You are trying to loop data that doesn't match the start!\n"
                msg += "   👉 FIX: Check your 'H4_ImageBuffer'. It captures changes. Is it connected to the same type of output?\n"
                msg += "      (Example: If Run 0 is LATENT, Buffer must capture LATENT, not IMAGE)."
                
                _log(node_id, "CRITICAL ERROR: Type Mismatch.")
                print(f"\n{msg}\n")
                raise ValueError(msg)

            # Fallback for legacy (if reset didn't happen properly)
            # if run_once_input is not None: ... (Removed, memory is superior)

            _log(node_id, f"👉 Selecting: LOOP Input ({current_type_name}) | Denoise: {loop_denoise}")
            return (final_loop_input, loop_denoise)

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


# ------------------------------------------------------------------------------
# NEW NODES (v2.2.2b) - INCREMENT & LAG REPAIR
# ------------------------------------------------------------------------------

class H4_LoopIncrementer:
    """
    ➕ H4 Loop Incrementer (Hybrid)
    Bumps the loop counter. 
    Use this if you want to separate the 'Action' from the 'Router'.
    """
    
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "pulse": (ANY_TYPE, {"tooltip": "Connect any output to trigger increment."}),
                "wireless_reset": ("BOOLEAN", {
                    "default": False,
                    "label": "Reset via Wireless?",
                    "tooltip": "ON=Check orbit storage for reset signal (no wire needed)."
                }),
            },
        }
    
    RETURN_TYPES = (ANY_TYPE,)
    RETURN_NAMES = ("pass_through",)
    FUNCTION = "do_increment"
    CATEGORY = "h4_Live/Logic"
    
    @classmethod
    def IS_CHANGED(cls, **kwargs):
        return float("nan")
    
    def do_increment(self, pulse, wireless_reset):
        node_id = "LoopIncrementer"
        
        # Check wireless reset flag
        if wireless_reset:
            reset_flag = orbit_get("request_reset")
            if reset_flag is True:
                _log(node_id, "📡 Wireless Reset Signal Detected!")
                reset_state()
                orbit_set("request_reset", False)  # clear it
                return (pulse,)
        
        # Normal increment
        increment_loop()
        return (pulse,)

class H4_WirelessResetButton:
    """
    🔴 Wireless Reset Button. 
    No wires. Just a toggle. Sets the global reset flag.
    """
    
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "trigger_reset": ("BOOLEAN", {
                    "default": False,
                    "label": "🔴 RESET (Wireless)",
                    "tooltip": "Toggle ON to reset counter (wireless to H4_LoopIncrementer)."
                }),
            }
        }
    
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("reset_status",)
    FUNCTION = "send_reset"
    CATEGORY = "h4_Live/Logic"
    OUTPUT_NODE = True
    
    @classmethod
    def IS_CHANGED(cls, **kwargs):
        return float("nan")
    
    def send_reset(self, trigger_reset):
        if trigger_reset:
            orbit_set("request_reset", True)
            return ("✅ RESET SENT",)
        return ("Idle...",)

class H4_ImageBuffer:
    """
    📦 H4 Universal Buffer (Anti-Lag)
    Catches ANY data (Images, Latents, Texts) and holds it for the next cycle.
    Eliminates the 1-cycle drive lag in loops.
    """
    
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {},
            "optional": {
                "image_in": (ANY_TYPE, {"tooltip": "Wire ANYTHING here (Image, Latent, etc) to Store. Leave empty to Load."}),
            }
        }
    
    RETURN_TYPES = (ANY_TYPE,)
    RETURN_NAMES = ("buffered_data",)
    FUNCTION = "buffer_and_pass"
    CATEGORY = "h4_Live/Logic"
    OUTPUT_NODE = True
    
    @classmethod
    def VALIDATE_INPUTS(cls, **kwargs):
        return True # Universal acceptance

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        return float("nan")
    
    def buffer_and_pass(self, image_in=None):
        node_id = "UniversalBuffer"
        
        # 1. STORE (Write Mode)
        if image_in is not None:
            # Debug: What are we buffering?
            t = type(image_in)
            info = str(t)
            if hasattr(image_in, "shape"):
                info += f" shape={image_in.shape}"
            elif hasattr(image_in, "__len__"):
                info += f" len={len(image_in)}"
            elif isinstance(image_in, (int, float, str)):
                info += f" val={str(image_in)[:50]}"
                
            print(f"[{node_id}] 📥 BUFFERING Data: {info}")
            
            # Store it globally (overwriting old data)
            buffer_image(image_in) 
            return (image_in,)

        # 2. RETRIEVE (Read/Pass-Through Mode)
        print(f"[{node_id}] ⚠️ Input is None. Checking Backup...")
        buffered = get_buffered_image()
        
        if buffered is not None:
             print(f"[{node_id}] 📤 RECYCLING Last Data.")
             return (buffered,)
        
        # 3. FAIL SOFTLY
        print(f"[{node_id}] ❌ EMPTY. Nothing to pass.")
        return (None,)
    



