import torch

# H4 IMPORTS
from .h4_utils import ANY_TYPE

class H4_ContextHub:
    """
    The 'Mothership' node.
    1. Accepts optional inputs for all major ComfyUI types.
    2. Logs detailed debug info to the console.
    3. Bundles inputs into a single 'h4_pipe' dictionary.
    """
    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {},
            "optional": {
                "base_pipe": ("H4_PIPE",),
                "model": ("MODEL",),
                "vae": ("VAE",),
                "clip": ("CLIP",),
                "positive": ("CONDITIONING",),
                "negative": ("CONDITIONING",),
                "latent": ("LATENT",),
                "image": ("IMAGE",),
                "mask": ("MASK",),
                "any_A": (ANY_TYPE,),
                "any_B": (ANY_TYPE,),
            }
        }

    RETURN_TYPES = ("H4_PIPE", "MODEL", "VAE", "CLIP", "CONDITIONING", "CONDITIONING", "LATENT", "IMAGE", "MASK", ANY_TYPE, ANY_TYPE)
    RETURN_NAMES = ("h4_pipe", "model", "vae", "clip", "positive", "negative", "latent", "image", "mask", "any_A", "any_B")
    FUNCTION = "process_hub"
    CATEGORY = "h4_Live"

    def log_input(self, name, value):
        if value is None:
            # print(f"   ⚠️ [{name.upper()}] is MISSING/None") 
            return
            
        print(f"   🔹 [{name.upper()}] detected:", end=" ")
        
        try:
            # Tensor / Image / Mask
            if torch.is_tensor(value):
                print(f"Tensor Shape: {list(value.shape)} | Device: {value.device} | Dtype: {value.dtype}")
            
            # Latent Dictionary
            elif isinstance(value, dict) and "samples" in value:
                print(f"Latent Shape: {list(value['samples'].shape)}")
                
            # Standard Classes
            elif hasattr(value, '__class__'):
                class_name = value.__class__.__name__
                print(f"Class: {class_name}")
                
            # Lists (Batches often come as lists)
            elif isinstance(value, list):
                print(f"List (Length: {len(value)})")
                
            # Primitives
            else:
                print(f"Value: {value}")
        except Exception as e:
            print(f"Error inspecting {name}: {e}")

    def process_hub(self, base_pipe=None, model=None, vae=None, clip=None, positive=None, negative=None, latent=None, image=None, mask=None, any_A=None, any_B=None):
        print("\n[h4_Live] 📡 Context Hub Report")
        print("-------------------------------------------------")
        
        try:
            # 1. Initialize Pipe (Start fresh or extend existing)
            if base_pipe:
                new_pipe = base_pipe.copy()
                print(f"   🔄 Extending Base Pipe (Keys: {len(base_pipe)})")
            else:
                new_pipe = {}

            # 2. Update Pipe & Log
            inputs = {
                "model": model, "vae": vae, "clip": clip, 
                "positive": positive, "negative": negative, 
                "latent": latent, "image": image, "mask": mask,
                "any_A": any_A, "any_B": any_B
            }

            for key, val in inputs.items():
                if val is not None:
                    new_pipe[key] = val
                    self.log_input(key, val)

            print("-------------------------------------------------\n")

            # 3. Return Passthrough (Use value from pipe if exists, or current input)
            def get_val(k):
                return new_pipe.get(k, None)

            return (
                new_pipe,
                get_val("model"), get_val("vae"), get_val("clip"),
                get_val("positive"), get_val("negative"),
                get_val("latent"), get_val("image"), get_val("mask"),
                get_val("any_A"), get_val("any_B")
            )
            
        except Exception as e:
            print(f"❌ [H4_ContextHub] CRITICAL ERROR: {e}")
            # Fail gracefully (?) or re-raise
            return ({}, None, None, None, None, None, None, None, None, None, None)

class H4_ContextUnpack:
    """
    The Distributor node.
    Unpacks the 'h4_pipe' dictionary back into individual connections.
    """
    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "h4_pipe": ("H4_PIPE",),
            }
        }

    RETURN_TYPES = ("MODEL", "VAE", "CLIP", "CONDITIONING", "CONDITIONING", "LATENT", "IMAGE", "MASK", ANY_TYPE, ANY_TYPE)
    RETURN_NAMES = ("model", "vae", "clip", "positive", "negative", "latent", "image", "mask", "any_A", "any_B")
    FUNCTION = "unpack_pipe"
    CATEGORY = "h4_Live"
    
    def unpack_pipe(self, h4_pipe):
        try:
            def get_val(k):
                val = h4_pipe.get(k, None)
                if val is None:
                    # Optional: Print warning to console if critical types are missing?
                    pass
                return val
                
            return (
                get_val("model"), get_val("vae"), get_val("clip"),
                get_val("positive"), get_val("negative"),
                get_val("latent"), get_val("image"), get_val("mask"),
                get_val("any_A"), get_val("any_B")
            )
        except Exception as e:
            print(f"❌ [H4_ContextUnpack] CRITICAL ERROR: {e}")
            return (None,)*10
