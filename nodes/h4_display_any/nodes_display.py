import torch
import numpy as np
import json
import base64
from io import BytesIO
from PIL import Image

def tensor_to_pil(img_tensor, batch_index: int = 0) -> Image.Image:
    """Convert a ComfyUI IMAGE tensor (B, H, W, C) to PIL Image safely."""
    try:
        if hasattr(img_tensor, "cpu"):
            img_tensor = img_tensor.cpu()
        if hasattr(img_tensor, "numpy"):
            img_np = img_tensor.numpy()
        else:
            img_np = np.array(img_tensor)

        if len(img_np.shape) == 4:
            img_np = img_np[batch_index]

        img_np = np.clip(img_np * 255.0, 0, 255).astype(np.uint8)
        return Image.fromarray(img_np)
    except Exception:
        return Image.new("RGB", (256, 256), color=(30, 30, 30))


class AnyType(str):
    """A special class that is always equal in not equal comparisons. Credit to pythongosssss"""
    def __ne__(self, __value: object) -> bool:
        return False

# Wildcard type
any_type = AnyType("*")

class H4_DisplayAny:
    """
    Universal Monitor Node.
    Accepts 4 inputs of any type and serializes them for the frontend.
    """
    
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {},
            "optional": {
                "source_1": (any_type, {"tooltip": "Connect anything here. New slots will appear automatically."}),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID",
                "extra_pnginfo": "EXTRA_PNGINFO",
            },
        }

    RETURN_TYPES = ()
    FUNCTION = "process_display"
    CATEGORY = "h4/Logic"
    OUTPUT_NODE = True

    def process_display(self, unique_id, extra_pnginfo, **kwargs):
        
        # Prepare payload
        payload = []
        
        # 1. Dynamic Key Harvesting
        # We look for ANY key starting with "source_" and sort them by number
        # kwargs = {'source_1': val, 'source_2': val, ...}
        
        sources = []
        for key, value in kwargs.items():
            if key.startswith("source_"):
                try:
                    idx = int(key.split("_")[1])
                    sources.append((idx, value))
                except:
                    continue
                    
        # Sort by index (source_1, source_2, ...)
        sources.sort(key=lambda x: x[0])
        
        # Extract values in order
        inputs = [val for _, val in sources]
        
        # Add a "node_id" to the payload for frontend navigation
        # We can't easily get the source node ID here without expensive graph traversal
        # BUT, the frontend can deduce it from link data.
        
        for val in inputs:
            if val is None:
                payload.append({"type": "empty", "content": "No Input"})
                continue
                
            try:
                serialized = self.serialize(val)
                payload.append(serialized)
            except Exception as e:
                payload.append({"type": "error", "content": str(e)})

        return {"ui": {"display_data": payload}}

    def serialize(self, data):
        """
        Intelligently convert data to a displayable format.
        """
        # HACK: Handle Lazy objects if they come through unwrapped? 
        # ComfyUI usually unwraps them before passed to function if we don't handle lazy execution manually.
        # But 'lazy': True meant we might get a Function/Lazy wrapper.
        # Assuming standar execution for now.
        
        # 1. Images (Tensor or PIL)
        if isinstance(data, torch.Tensor):
            # Check dimensions to see if it's an image [B,H,W,C] or [B,C,H,W]
            # Standard Comfy Image is [B,H,W,C]
            if data.ndim == 4:
                # Limit to first 4 frames if batch
                max_frames = min(4, data.shape[0])
                images = []
                for i in range(max_frames):
                    img = tensor_to_pil(data[i])
                    b64 = self.pil_to_b64(img)
                    images.append(b64)
                
                return {"type": "image_list" if len(images) > 1 else "image", "content": images if len(images) > 1 else images[0]}
                
            elif data.ndim == 3: # Single image? or Mask [H,W]
                 # Treat as single image
                 img = tensor_to_pil(data)
                 return {"type": "image", "content": self.pil_to_b64(img)}
                 
            else:
                # Latent or other tensor
                return {"type": "text", "content": f"Tensor Shape: {list(data.shape)}\nDtype: {data.dtype}"}

            # 2. Lists
        if isinstance(data, list):
            if not data:
                return {"type": "text", "content": "[] (Empty List)"}
            
            # Peek first item
            first = data[0]
            
            # Check for ComfyUI Conditioning: [[Tensor, Dict], ...]
            if isinstance(first, list) and len(first) >= 2:
                if isinstance(first[0], torch.Tensor) and isinstance(first[1], dict):
                     # Conditioning detected
                     cond_len = len(data)
                     first_shape = list(first[0].shape)
                     return {"type": "text", "content": f"CONDITIONING ({cond_len})\nTensor Shape: {first_shape}\nParams: {str(first[1].keys())}"}

            if isinstance(first, torch.Tensor) and first.ndim >= 3:
                 # List of Images?
                 # Convert up to 4
                 images = []
                 for i, item in enumerate(data[:4]):
                     if isinstance(item, torch.Tensor):
                         img = tensor_to_pil(item)
                         images.append(self.pil_to_b64(img))
                 return {"type": "image_list", "content": images}
            
            if isinstance(first, str):
                # Text List
                return {"type": "list", "content": data}
            
            # Generic List
            return {"type": "text", "content": f"List[{len(data)}]: {str(data)[:500]}"}

        # 3. Strings / Primitives
        if isinstance(data, (str, int, float, bool)):
            return {"type": "text", "content": str(data)}

        # 4. Dictionary (Latent wrapper?)
        if isinstance(data, dict):
             if "samples" in data:
                 return {"type": "text", "content": f"LATENT\nShape: {list(data['samples'].shape)}"}
             return {"type": "json", "content": json.dumps(str(data))[:500]}

        # 5. Objects
        return {"type": "text", "content": f"Object: {type(data).__name__}\n{str(data)[:200]}"}

    def pil_to_b64(self, img):
        # Resize for thumbnail if too large
        MAX_SIZE = 512
        if img.width > MAX_SIZE or img.height > MAX_SIZE:
            img.thumbnail((MAX_SIZE, MAX_SIZE))
            
        buffered = BytesIO()
        img.save(buffered, format="JPEG", quality=80)
        return "data:image/jpeg;base64," + base64.b64encode(buffered.getvalue()).decode("utf-8")
        
    # Helper to resolve lazy if we manually handled it... but standard Comfy passes resolved data.
