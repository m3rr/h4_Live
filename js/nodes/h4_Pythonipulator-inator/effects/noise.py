import numpy as np
from PIL import Image

def apply(img, p):
    """
    Entropy Injection Kernel. Introduces randomness and digital artifacts
    to simulate analog grain or signal degradation.
    """
    
    # 1. Gaussian Noise
    noise_str = p.get("noise_gaussian", 0.0)
    if noise_str > 0.0:
        img_array = np.array(img).astype(np.float32)
        # Scale noise intensity based on bit depth
        noise = np.random.normal(0, noise_str * 255.0, img_array.shape)
        
        # Apply only to RGB, preserve Alpha if present
        if len(img_array.shape) == 3 and img_array.shape[2] == 4:
            img_array[:,:,:3] = np.clip(img_array[:,:,:3] + noise[:,:,:3], 0, 255)
        else:
            img_array = np.clip(img_array + noise, 0, 255)
            
        img = Image.fromarray(img_array.astype(np.uint8))

    return img
