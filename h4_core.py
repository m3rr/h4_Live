# FILE: custom_nodes/comfyui_h4_live/h4_core.py
# ------------------------------------------------------------------------------
# Core State Manager
# Rule 8 (Security): No external IO, memory only.
# Rule 11 (Logging): Contextual print statements for debugging.
# Rule 21 (Debug Review): Nuclear logging implemented.
# ------------------------------------------------------------------------------
import time
import datetime

# The "Holy Grail" - This variable lives as long as ComfyUI runs.
_H4_GLOBAL_STATE = {
    "loop_count": 0,
    "last_run_time": 0.0,
    "active": True
}

# ORBIT STORAGE (Wireless Feedback)
_H4_ORBIT_STORAGE = {}

def _log(message: str):
    """Internal helper for timestamped logging (Rule 11)."""
    ts = datetime.datetime.now().strftime("%H:%M:%S.%f")[:-3]
    print(f"[h4_Live][CORE][{ts}] {message}")

def get_state():
    return _H4_GLOBAL_STATE

def orbit_set(key, value):
    _H4_ORBIT_STORAGE[key] = value

def orbit_get(key):
    return _H4_ORBIT_STORAGE.get(key, None)

def increment_loop():
    """Safely increments the loop counter with nuclear logging."""
    global _H4_GLOBAL_STATE
    
    old_count = _H4_GLOBAL_STATE["loop_count"]
    _H4_GLOBAL_STATE["loop_count"] += 1
    _H4_GLOBAL_STATE["last_run_time"] = time.time()
    
    new_count = _H4_GLOBAL_STATE["loop_count"]
    _log(f"State UPDATE | Increment | {old_count} -> {new_count}")
    
    return new_count

def reset_state():
    """Resets the loop counter to zero (The Nuclear Reset)."""
    global _H4_GLOBAL_STATE
    
    old_count = _H4_GLOBAL_STATE["loop_count"]
    _H4_GLOBAL_STATE["loop_count"] = 0
    _H4_GLOBAL_STATE["last_run_time"] = time.time()
    
    _log(f"☢️ NUCLEAR RESET TRIGGERED | {old_count} -> 0")
    return 0
