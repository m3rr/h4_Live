import cv2
import numpy as np
from PIL import Image

def apply(img, p):
    """
    Structural Detail Kernel. Analyzes spatial gradients to identify 
    boundaries and high-frequency contours using the Canny algorithm.
    """
    
    # 1. Edge Detection
    if p.get("edge_canny", False):
        t1 = p.get("edge_canny_low", 100)
        t2 = p.get("edge_canny_high", 200)
        
        # Convert PIL to CV2 (BGR)
        cv_img = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
        
        # Edge processing
        edges = cv2.Canny(cv_img, t1, t2)
        
        # Back to RGB (Gray to RGB)
        edges_rgb = cv2.cvtColor(edges, cv2.COLOR_GRAY2RGB)
        
        # If user wants edges overlaid or just edges
        mode = p.get("edge_mode", "Standalone")
        if mode == "Standalone":
            img = Image.fromarray(edges_rgb)
        else: # Overlay (Simple addition)
            img_array = np.array(img)
            # Add edges as white highlights
            img_array = np.clip(img_array + edges_rgb, 0, 255)
            img = Image.fromarray(img_array.astype(np.uint8))

    return img
