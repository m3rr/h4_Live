from PIL import Image, ImageFilter

def apply(img, p):
    """
    Diffusion & Focus Kernel. Operates on spatial frequencies to induce
    blur states or sharpen edges.
    """
    
    # 1. Gaussian Blur
    g_blur = p.get("blur_gaussian", 0.0)
    if g_blur > 0.0:
        img = img.filter(ImageFilter.GaussianBlur(radius=g_blur))
        
    # 2. Box Blur
    b_blur = p.get("blur_box", 0.0)
    if b_blur > 0.0:
        img = img.filter(ImageFilter.BoxBlur(radius=b_blur))
        
    # 3. Median Filter (Noise Reduction)
    m_blur = p.get("blur_median", 0)
    if m_blur > 1:
        # Median filter size must be an odd integer
        size = int(m_blur)
        if size % 2 == 0: size += 1
        img = img.filter(ImageFilter.MedianFilter(size=size))
        
    # 4. Sharpen
    if p.get("blur_sharpen", False):
        img = img.filter(ImageFilter.SHARPEN)
        
    return img
