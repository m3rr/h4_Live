import torch
import numpy as np
import datetime
from .h4_utils import ANY_TYPE

class H4_SmartConsole:
    """
    The Inline Debugger (H4 Smart Console).
    Displays data details in the console AND on the node itself.
    Modes: Normal vs +ULTRA.
    """
    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "Anything In": (ANY_TYPE,),
                "+ULTRA": ("BOOLEAN", {
                    "default": False, 
                    "label": "+ULTRA - Ultra Verbose Debugging", 
                    "tooltip": "OFF=Basic Stats. ON=Deep Inspection (Min/Max, Attributes, Memory)."
                }),
            }
        }

    RETURN_TYPES = (ANY_TYPE,)
    RETURN_NAMES = ("Anything Out",)
    FUNCTION = "process"
    CATEGORY = "h4_Live/Debug"
    OUTPUT_NODE = True

    def process(self, **kwargs):
        # Handle inputs with spaces via kwargs
        any_in = kwargs.get("Anything In", None)
        plus_ultra = kwargs.get("+ULTRA", False)
        
        log_lines = []
        ts = datetime.datetime.now().strftime("%H:%M:%S")
        input_type = type(any_in).__name__
        
        # --- HEADER ---
        header_emoji = "🔥" if plus_ultra else "🟢"
        title = f"[{ts}] {header_emoji} TYPE: {input_type}"
        log_lines.append(title)
        
        # --- INSPECTION LOGIC ---
        stats = self.analyze(any_in, plus_ultra)
        log_lines.extend(stats)
        
        # --- OUTPUT TO CONSOLE ---
        # Hardcoded Cyan (Blue-Green) as requested "Sticks out"
        c_code = "\033[96m" 
        reset = "\033[0m"
        
        print(f"{c_code}--- H4 SMART CONSOLE ---{reset}")
        for line in log_lines:
            print(f"{c_code}{line}{reset}")
        print(f"{c_code}------------------------{reset}")

        # --- OUTPUT TO NODE UI ---
        # Join lines for the text box
        ui_text = log_lines # Pass list, JS joins it
        
        return {"ui": {"text": ui_text}, "result": (any_in,)}

    def analyze(self, obj, ultra):
        """Analyzes the object and returns a list of string lines."""
        lines = []
        
        # 1. TENSOR (Torch)
        if isinstance(obj, torch.Tensor):
            lines.append(f"Shape: {list(obj.shape)}")
            lines.append(f"Dtype: {obj.dtype}")
            lines.append(f"Device: {obj.device}")
            
            if ultra:
                lines.append(f"Min: {obj.min().item():.4f}")
                lines.append(f"Max: {obj.max().item():.4f}")
                lines.append(f"Mean: {obj.mean().item():.4f}")
                if obj.grad is not None:
                     lines.append("Gradient: Present")
                else:
                     lines.append("Gradient: None")
        
        # 2. DICTIONARY (Latents, etc)
        elif isinstance(obj, dict):
            keys = list(obj.keys())
            lines.append(f"Keys ({len(keys)}): {keys[:5]}...")
            if "samples" in obj and isinstance(obj["samples"], torch.Tensor):
                lines.append(f"Latent Shape: {list(obj['samples'].shape)}")
            
            if ultra:
                for k, v in obj.items():
                    val_type = type(v).__name__
                    lines.append(f"Key '{k}': {val_type}")
                    # Recursive check safe? maybe just shallow
                    
        # 3. LIST / TUPLE (Batches)
        elif isinstance(obj, (list, tuple)):
            lines.append(f"Length: {len(obj)}")
            if len(obj) > 0:
                lines.append(f"Item 0 Type: {type(obj[0]).__name__}")
                
            if ultra and len(obj) > 0:
                # Inspect first 3 items
                for i in range(min(3, len(obj))):
                    lines.append(f"[{i}]: {str(obj[i])[:50]}...")
                    
        # 4. BASIC TYPES (String, Int, Float)
        elif isinstance(obj, (str, int, float, bool)):
            lines.append(f"Value: {obj}")
            
        # 5. GENERIC OBJECTS
        else:
            if ultra:
                # Inspect attributes
                attributes = [a for a in dir(obj) if not a.startswith('__')]
                lines.append(f"Attributes: {attributes[:10]}...")
                lines.append(f"String Rep: {str(obj)[:100]}")
            else:
                lines.append("Object: Complex Object (Use +ULTRA for details)")
                
        return lines
