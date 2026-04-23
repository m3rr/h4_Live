from PIL import Image, ImageEnhance, ImageOps
import numpy as np

def apply(img, p):
    """
    Chrominance & Luminance Kernel. Manages color grading, tonal correction,
    and elective inversion.
    """
    
    # 1. Brightness
    brightness = p.get("clr_brightness", 1.0)
    if brightness != 1.0:
        img = ImageEnhance.Brightness(img).enhance(brightness)
        
    # 2. Contrast
    contrast = p.get("clr_contrast", 1.0)
    if contrast != 1.0:
        img = ImageEnhance.Contrast(img).enhance(contrast)
        
    # 3. Saturation (Color)
    saturation = p.get("clr_saturation", 1.0)
    if saturation != 1.0:
        img = ImageEnhance.Color(img).enhance(saturation)
        
    # 4. Sharpness (Technically color/detail)
    sharpness = p.get("clr_sharpness", 1.0)
    if sharpness != 1.0:
        img = ImageEnhance.Sharpness(img).enhance(sharpness)
        
    # 5. Inversion
    if p.get("clr_invert", False):
        # Handle alpha channel if present
        if img.mode == 'RGBA':
            r, g, b, a = img.split()
            rgb_img = Image.merge('RGB', (r, g, b))
            inverted_rgb = ImageOps.invert(rgb_img)
            r2, g2, b2 = inverted_rgb.split()
            img = Image.merge('RGBA', (r2, g2, b2, a))
        else:
            img = ImageOps.invert(img)

    # 6. Gamma Correction
    gamma = p.get("clr_gamma", 1.0)
    if gamma != 1.0:
        # Build lookup table for gamma
        lut = [pow(x / 255., gamma) * 255. for x in range(256)]
        lut = lut * img.mode.count('RGB') # Repeat for each channel
        if img.mode == 'RGBA':
            lut += list(range(256)) # Identity for Alpha
        img = img.point(lut)

    return img
