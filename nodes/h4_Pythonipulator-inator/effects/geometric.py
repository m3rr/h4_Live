from PIL import Image
import numpy as np
import cv2

def apply(img, p):
    """
    Tactical Geometric Kernel. Handles spatial transformations including rotation,
    flipping, and precision resizing.
    """
    
    # 1. Flip Control
    flip_mode = p.get("geo_flip", "None")
    if flip_mode == "Horizontal":
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
    elif flip_mode == "Vertical":
        img = img.transpose(Image.FLIP_TOP_BOTTOM)
    elif flip_mode == "Both":
        img = img.transpose(Image.FLIP_LEFT_RIGHT).transpose(Image.FLIP_TOP_BOTTOM)

    # 2. Rotation Engine
    rotate_angle = p.get("geo_rotate", 0.0)
    if rotate_angle != 0.0:
        expand = p.get("geo_rotate_expand", False)
        # We use PIL for high-quality bicubic rotation by default
        img = img.rotate(rotate_angle, resample=Image.BICUBIC, expand=expand)

    # 3. Resize Logic
    resize_mode = p.get("geo_resize", "None")
    if resize_mode == "Scale":
        scale = p.get("geo_resize_scale", 1.0)
        if scale != 1.0:
            new_w = int(img.width * scale)
            new_h = int(img.height * scale)
            img = img.resize((new_w, new_h), Image.LANCZOS)
    elif resize_mode == "Dimensions":
        target_w = p.get("geo_resize_w", 512)
        target_h = p.get("geo_resize_h", 512)
        img = img.resize((target_w, target_h), Image.LANCZOS)

    return img
