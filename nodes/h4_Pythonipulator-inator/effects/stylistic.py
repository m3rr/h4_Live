from PIL import Image, ImageDraw
import numpy as np

def apply(img, p):
    """
    Artisan Effects Kernel. Implements non-standard visual abstractions 
    including pixelation and vignette overlays.
    """
    
    # 1. Pixelation
    pixel_size = p.get("sty_pixelate", 1)
    if pixel_size > 1:
        # Scale down and back up with Nearest Neighbor
        orig_size = img.size
        small = img.resize((max(1, orig_size[0] // pixel_size), 
                           max(1, orig_size[1] // pixel_size)), 
                          resample=Image.NEAREST)
        img = small.resize(orig_size, resample=Image.NEAREST)

    # 2. Vignette
    vignette_str = p.get("sty_vignette", 0.0)
    if vignette_str > 0.0:
        width, height = img.size
        X, Y = np.ogrid[:height, :width]
        center_x, center_y = width / 2, height / 2
        
        # Calculate radial distance from center
        dist = np.sqrt((X - center_y)**2 + (Y - center_x)**2)
        max_dist = np.sqrt(center_x**2 + center_y**2)
        
        # Create mask
        # Higher distance = darker
        mask = 1.0 - (dist / max_dist) * vignette_str
        mask = np.clip(mask, 0, 1)
        
        # Apply mask
        img_array = np.array(img).astype(np.float32)
        if len(img_array.shape) == 3: # RGB/RGBA
            for c in range(3): # Apply to RGB, skip A if present
                img_array[:,:,c] *= mask
        else: # L
            img_array *= mask
            
        img = Image.fromarray(np.clip(img_array, 0, 255).astype(np.uint8))

    return img
