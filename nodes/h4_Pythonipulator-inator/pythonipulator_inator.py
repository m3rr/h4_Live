import os
import sys
import subprocess
import torch
import numpy as np
from PIL import Image

# --- Dependency Management ---
# Ensures all tactical libraries are present before operation.
def check_dependencies():
    """
    Scans the environment for necessary image processing libraries.
    Operation is silent unless a deployment is actually required, 
    ensuring the Mothership audit table remains clean.
    """
    required = {
        "Pillow": "PIL",
        "opencv-python": "cv2",
        "numpy": "numpy",
        "scikit-image": "skimage"
    }
    
    for package, import_name in required.items():
        try:
            __import__(import_name)
        except ImportError:
            print(f"[H4 Pythonipulator] CRITICAL: Dependency '{package}' missing. Initiating deployment...")
            try:
                subprocess.check_call([sys.executable, "-m", "pip", "install", package])
                print(f"[H4 Pythonipulator] Successfully installed {package}.")
            except Exception as e:
                print(f"[H4 Pythonipulator] FAILED to install {package}. Manual intervention may be required: {str(e)}")

# Execute check on load
check_dependencies()

# --- Module Imports ---
# Import the sub-modules for specific image manipulation kernels.
from .effects import geometric, color, blur, stylistic, edge, noise, output, cyberpunk

class PythonipulatorInator:
    """
    The Pythonipulator-inator is the definitive image manipulation kernel for the h4 toolkit.
    It combines multiple computer vision libraries into a single, high-performance node
    capable of inline transformations and end-of-workflow file operations.
    """
    
    @classmethod
    def INPUT_TYPES(cls):
        """
        Defines the extensive input schema. Organized by effect category.
        Each category has a master 'enabled' toggle for surgical control.
        """
        return {
            "required": {
                "image": ("IMAGE",),
                "operation_mode": (["Passthrough", "Save to Disk", "Both"], {"default": "Passthrough"}),
            },
            "optional": {
                # --- Cyberpunk ---
                "cb_enabled": ("BOOLEAN", {"default": False}),
                "cb_chromatic": ("INT", {"default": 0, "min": 0, "max": 100, "step": 1}),
                "cb_glitch": ("FLOAT", {"default": 0.0, "min": 0.0, "max": 1.0, "step": 0.01}),
                "cb_scanlines": ("FLOAT", {"default": 0.0, "min": 0.0, "max": 1.0, "step": 0.01}),

                # --- Geometric ---
                "geo_enabled": ("BOOLEAN", {"default": False}),
                "geo_flip": (["None", "Horizontal", "Vertical", "Both"], {"default": "None"}),
                "geo_rotate": ("FLOAT", {"default": 0.0, "min": -360.0, "max": 360.0, "step": 0.1}),
                "geo_rotate_expand": ("BOOLEAN", {"default": False}),
                "geo_resize": (["None", "Scale", "Dimensions"], {"default": "None"}),
                "geo_resize_scale": ("FLOAT", {"default": 1.0, "min": 0.01, "max": 10.0, "step": 0.01}),
                "geo_resize_w": ("INT", {"default": 512, "min": 8, "max": 8192, "step": 8}),
                "geo_resize_h": ("INT", {"default": 512, "min": 8, "max": 8192, "step": 8}),

                # --- Color ---
                "clr_enabled": ("BOOLEAN", {"default": False}),
                "clr_brightness": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 10.0, "step": 0.01}),
                "clr_contrast": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 10.0, "step": 0.01}),
                "clr_saturation": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 10.0, "step": 0.01}),
                "clr_sharpness": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 10.0, "step": 0.01}),
                "clr_invert": ("BOOLEAN", {"default": False}),
                "clr_gamma": ("FLOAT", {"default": 1.0, "min": 0.1, "max": 5.0, "step": 0.01}),

                # --- Blur ---
                "blur_enabled": ("BOOLEAN", {"default": False}),
                "blur_gaussian": ("FLOAT", {"default": 0.0, "min": 0.0, "max": 100.0, "step": 0.1}),
                "blur_box": ("FLOAT", {"default": 0.0, "min": 0.0, "max": 100.0, "step": 0.1}),
                "blur_median": ("INT", {"default": 0, "min": 0, "max": 99, "step": 1}),
                "blur_sharpen": ("BOOLEAN", {"default": False}),

                # --- Stylistic ---
                "sty_enabled": ("BOOLEAN", {"default": False}),
                "sty_pixelate": ("INT", {"default": 1, "min": 1, "max": 128, "step": 1}),
                "sty_vignette": ("FLOAT", {"default": 0.0, "min": 0.0, "max": 1.0, "step": 0.01}),

                # --- Noise ---
                "noise_enabled": ("BOOLEAN", {"default": False}),
                "noise_gaussian": ("FLOAT", {"default": 0.0, "min": 0.0, "max": 1.0, "step": 0.01}),

                # --- Edge ---
                "edge_enabled": ("BOOLEAN", {"default": False}),
                "edge_canny": ("BOOLEAN", {"default": False}),
                "edge_canny_low": ("INT", {"default": 100, "min": 0, "max": 255}),
                "edge_canny_high": ("INT", {"default": 200, "min": 0, "max": 255}),
                "edge_mode": (["Standalone", "Overlay"], {"default": "Standalone"}),

                # --- Output ---
                "save_filename": ("STRING", {"default": "h4_"}),
                "output_folder": ("STRING", {"default": "output/h4_pythonipulator"}),
            }
        }

    RETURN_TYPES = ("IMAGE",)
    FUNCTION = "manipulate"
    CATEGORY = "h4_Live"

    def manipulate(self, image, operation_mode, **kwargs):
        """
        Main execution kernel. Processes the input tensor through selected effects
        and manages the output/save workflow based on the operation_mode toggle.
        """
        processed_images = []
        
        for img_tensor in image:
            # 1. Conversion: Tensor -> PIL
            i = 255. * img_tensor.cpu().numpy()
            img = Image.fromarray(np.clip(i, 0, 255).astype(np.uint8))
            
            # 2. Sequential Processing Pipeline
            # Kernels only execute if their master toggle is ACTIVE.
            if kwargs.get("cb_enabled", False):
                img = cyberpunk.apply(img, kwargs)
            if kwargs.get("geo_enabled", False):
                img = geometric.apply(img, kwargs)
            if kwargs.get("clr_enabled", False):
                img = color.apply(img, kwargs)
            if kwargs.get("blur_enabled", False):
                img = blur.apply(img, kwargs)
            if kwargs.get("sty_enabled", False):
                img = stylistic.apply(img, kwargs)
            if kwargs.get("noise_enabled", False):
                img = noise.apply(img, kwargs)
            if kwargs.get("edge_enabled", False):
                img = edge.apply(img, kwargs)
            
            # 3. Save Logic
            if operation_mode in ["Save to Disk", "Both"]:
                output.save_image(img, kwargs.get("save_filename", "h4_"), kwargs.get("output_folder", "output/h4_pythonipulator"))
            
            # 4. Conversion: PIL -> Tensor
            out_tensor = torch.from_numpy(np.array(img).astype(np.float32) / 255.0).unsqueeze(0)
            processed_images.append(out_tensor)

        # 5. Result Synthesis
        result_tensor = torch.cat(processed_images, dim=0)
        
        return (result_tensor,)

NODE_CLASS_MAPPINGS = {
    "H4_Pythonipulator-inator": PythonipulatorInator
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "H4_Pythonipulator-inator": "h4_Pythonipulator-inator 🐍"
}
