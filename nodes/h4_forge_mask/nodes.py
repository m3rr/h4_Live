# H4_ForgeMask v1.0.0 - The Surgical Suite
# [LANDMARK] File: h4_forge_mask/nodes.py
# [LANDMARK] Purpose: High-fidelity interactive masking with Forge-style blending logic.
# [LANDMARK] Design: Modular, Independent, Off-Black Premium UI.
# ==============================================================================

import torch
import numpy as np
from PIL import Image, ImageOps, ImageFilter
import io
import base64
import json

try:
    from ...core.h4_core import _log
except ImportError:
    def _log(msg):
        print(f"[Forge Mask] {msg}")

class H4_ForgeMask:
    """
    👁️ H4 Forge Mask (The Surgical Suite)
    A high-performance interactive masking tool inspired by the Forge UI.
    Supports Brush, Polygon Lasso, and specialized shapes.
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE", {"tooltip": "The source image to mask."}),
                "mask_blur": ("INT", {
                    "default": 4, "min": 0, "max": 128, "step": 1,
                    "tooltip": "The smoothness of the edges. A tiny bit of blur (4-8) helps the AI blend your changes without leaving hard lines."
                }),
                "mask_strength": ("FLOAT", {
                    "default": 1.0, "min": 0.0, "max": 1.0, "step": 0.01,
                    "tooltip": "How 'opaque' the mask is. 1.0 means full strength; lower it if you want your changes to be more subtle or ghost-like."
                }),
                "mask_expansion": ("INT", {
                    "default": 0, "min": -64, "max": 64, "step": 1,
                    "tooltip": "Grows or shrinks the mask area. Positive values expand the mask outwards, which is great for ensuring the background matches perfectly around your cutout."
                }),
                "invert_mask": ("BOOLEAN", {
                    "default": False,
                    "tooltip": "Swaps the selection. Use this if you want to change EVERYTHING EXCEPT the area you painted."
                }),
                "mask_data": ("STRING", {
                    "multiline": True,
                    "default": "",
                    "tooltip": "The invisible code for your hand-painted mask. I manage this for you behind the scenes!"
                }),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID",
            }
        }

    RETURN_TYPES = ("IMAGE", "MASK")
    RETURN_NAMES = ("IMAGE", "MASK")
    FUNCTION = "process_mask"
    CATEGORY = "h4_Live/Masking"
    OUTPUT_NODE = True 

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        return float("nan")

    def process_mask(self, image, mask_blur, mask_strength, mask_expansion, invert_mask, mask_data="", unique_id=None):
        print(f"H4 Forge Mask: Received mask_data (len: {len(mask_data) if mask_data else 0})")
        node_id = f"Forge_Mask_{unique_id}"
        batch_size, h, w, c = image.shape

        mask_tensor = None
        
        if mask_data and "base64," in mask_data:
            try:
                clean_data = mask_data.split("base64,")[1]
                mask_bytes = base64.b64decode(clean_data)
                mask_pil = Image.open(io.BytesIO(mask_bytes)).convert("L")
                
                if mask_pil.size != (w, h):
                    mask_pil = mask_pil.resize((w, h), Image.Resampling.LANCZOS)

                # 1. Expansion (Dilation) - Handles your "Area Analysis" request
                if mask_expansion != 0:
                    # Positive = Expansion, Negative = Erosion
                    # PIL MaxFilter for dilation, MinFilter for erosion
                    filter_size = abs(mask_expansion) * 2 + 1
                    if mask_expansion > 0:
                        mask_pil = mask_pil.filter(ImageFilter.MaxFilter(filter_size))
                    else:
                        mask_pil = mask_pil.filter(ImageFilter.MinFilter(filter_size))

                # 2. Smoothing
                if mask_blur > 0:
                    mask_pil = mask_pil.filter(ImageFilter.GaussianBlur(mask_blur))
                
                if invert_mask:
                    mask_pil = ImageOps.invert(mask_pil)

                mask_array = np.array(mask_pil).astype(np.float32) / 255.0
                mask_array = mask_array * mask_strength 
                
                mask_tensor = torch.from_numpy(mask_array)[None,].repeat(batch_size, 1, 1)
                
            except Exception as e:
                _log(f"[{node_id}] ❌ Extraction Error: {e}")

        if mask_tensor is None:
            mask_tensor = torch.zeros((batch_size, h, w), dtype=torch.float32)

        return (image, mask_tensor)
