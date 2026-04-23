import numpy as np
from PIL import Image, ImageChops

def apply(img, p):
    """
    Sovereign Cyberpunk Kernel. 
    Implements high-fidelity digital artifacts including chromatic aberration,
    scanlines, and block displacement glitching.
    """
    
    # 1. Chromatic Aberration (RGB Split)
    ca_amount = p.get("cb_chromatic", 0)
    if ca_amount > 0:
        r, g, b = img.split()
        # Offset red and blue channels
        r = ImageChops.offset(r, ca_amount, 0)
        b = ImageChops.offset(b, -ca_amount, 0)
        img = Image.merge("RGB", (r, g, b))

    # 2. Digital Glitch (Block Displacement)
    glitch_p = p.get("cb_glitch", 0.0)
    if glitch_p > 0.0:
        arr = np.array(img)
        h, w, c = arr.shape
        num_glitches = int(glitch_p * 20)
        for _ in range(num_glitches):
            # Random block height and width
            bh = np.random.randint(5, h // 5)
            # Random position
            y = np.random.randint(0, h - bh)
            # Drift amount
            drift = np.random.randint(-int(glitch_p * 50), int(glitch_p * 50))
            # Shift the block
            arr[y:y+bh] = np.roll(arr[y:y+bh], drift, axis=1)
        img = Image.fromarray(arr)

    # 3. Scanlines
    scan_p = p.get("cb_scanlines", 0.0)
    if scan_p > 0.0:
        arr = np.array(img).astype(np.float32)
        h, w, c = arr.shape
        # Create scanline mask
        mask = np.ones((h, 1, 1), dtype=np.float32)
        mask[::2] = 1.0 - (scan_p * 0.5) # Dimm every other row
        arr *= mask
        img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))

    return img
