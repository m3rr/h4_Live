# FILE: custom_nodes/comfyui_h4_live/h4_comparinator.py
# ------------------------------------------------------------------------------
# H4 Comparinator - The Ultimate A/B Test Node
# Rule 1: No Placeholders
# Rule 11: Mandatory Logging
# ------------------------------------------------------------------------------
import os
import torch
import numpy as np
import folder_paths
import time
from collections import deque, defaultdict
from PIL import Image, ImageOps
from server import PromptServer
from .h4_core import _log

class H4_Comparinator:
    """
    ⚔️ H4 Comparinator
    "I'll be back... with a better version."
    
    Dual-Channel Image Comparator with Time-Travel History.
    """
    
    # Persistent History Cache: { node_id: deque([{a, b, timestamp}, ...]) }
    HISTORY_CACHE = defaultdict(lambda: deque(maxlen=50))
    
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "image_a": ("IMAGE", {"tooltip": "The 'Before' or 'Control' image"}),
                "save_mode": ("BOOLEAN", {"default": False, "label_on": "💾 SAVE", "label_off": "PREVIEW", "tooltip": "Save images to Output folder?"}),
                "filename_prefix": ("STRING", {"default": "h4_compare"}),
            },
            "optional": {
                "image_b": ("IMAGE", {"tooltip": "The 'After' or 'Test' image"}),
                "frozen_image": ("IMAGE", {"tooltip": "Overrides Image B. Useful for freezing a comparison state."}),
                "metadata_text": ("STRING", {"multiline": True, "default": "", "tooltip": "Custom metadata to embed"}),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID",
                "extra_pnginfo": "EXTRA_PNGINFO"
            }
        }
    
    RETURN_TYPES = ("IMAGE", "IMAGE")
    RETURN_NAMES = ("image_a", "image_b")
    FUNCTION = "compare_images"
    CATEGORY = "h4_Live/Visuals"
    OUTPUT_NODE = True
    
    DESCRIPTION = """
    ⚔️ H4 Comparinator
    
    The ultimate A/B comparison tool.
    Input two images to compare them side-by-side with a slider.
    Keeps a history of the last 10 comparisons for reference.
    """

    def compare_images(self, image_a, save_mode=False, filename_prefix="h4_compare", image_b=None, frozen_image=None, metadata_text="", unique_id=None, extra_pnginfo=None):
        node_id = str(unique_id)
        
        # Logic: Frozen Image overrides Image B
        final_b = frozen_image if frozen_image is not None else image_b
        
        # If neither B nor Frozen is provided, use A (Compare against self? Or error?)
        # Let's fallback to A for safety, effectively showing NO difference.
        if final_b is None:
            final_b = image_a
            
        _log(f"[{node_id}] ⚔️ Comparinator Active - Mode: {'SAVE' if save_mode else 'PREVIEW'} - Frozen: {'YES' if frozen_image is not None else 'NO'}")
        
        # 1. Standardize Temp Save (For UI History)
        # Always save temp WebP for the UI to display.
        # MUST use unique names so history doesn't point to the same overwritten file.
        timestamp = int(time.time() * 1000)
        
        temp_a_name, temp_a_path = self._save_image(image_a, f"h4_comp_{node_id}_{timestamp}_A", folder_paths.get_temp_directory(), "WEBP")
        temp_b_name, temp_b_path = self._save_image(final_b, f"h4_comp_{node_id}_{timestamp}_B", folder_paths.get_temp_directory(), "WEBP")
        
        # 2. Handle Permanent Save (Output Folder)
        if save_mode:
            try:
                output_dir = folder_paths.get_output_directory()
                subfolder = "comparisons"
                full_output_dir = os.path.join(output_dir, subfolder)
                os.makedirs(full_output_dir, exist_ok=True)
                
                # Timestamp for file uniqueness
                ts_sec = int(time.time())
                prefix = filename_prefix if filename_prefix else "h4_compare"
                
                # Metadata
                png_info = None
                if metadata_text or extra_pnginfo:
                    from PIL.PngImagePlugin import PngInfo
                    png_info = PngInfo()
                    if metadata_text:
                        png_info.add_text("parameters", metadata_text)
                    if extra_pnginfo:
                        for k, v in extra_pnginfo.items():
                             png_info.add_text(k, str(v))
                
                # Save A
                name_a = f"{prefix}_{ts_sec}_A"
                self._save_image(image_a, name_a, full_output_dir, "PNG", png_info=png_info)
                
                # Save B
                name_b = f"{prefix}_{ts_sec}_B"
                self._save_image(image_b, name_b, full_output_dir, "PNG", png_info=png_info)
                
                _log(f"[{node_id}] 💾 Saved comparison pair to {full_output_dir}")
                
            except Exception as e:
                _log(f"[{node_id}] ❌ Save Error: {e}")

        # 3. Update History (Using Temp Files)
        history_entry = {
            "id": f"{timestamp}",
            "filename_a": temp_a_name,
            "filename_b": temp_b_name,
            "timestamp": timestamp
        }
        
        H4_Comparinator.HISTORY_CACHE[node_id].appendleft(history_entry)
        
        # 4. Sync UI
        history_list = list(H4_Comparinator.HISTORY_CACHE[node_id])
        ui_payload = {
            "node_id": node_id,
            "current": history_entry,
            "history": history_list
        }
        
        PromptServer.instance.send_sync("h4.comparinator.update", ui_payload)
        
        return (image_a, image_b)

    def _save_image(self, tensor, filename_prefix, directory, format="WEBP", png_info=None):
        """
        Generic image saver.
        """
        # Take first frame
        if len(tensor.shape) > 3 and tensor.shape[0] > 1:
            tensor = tensor[0].unsqueeze(0)
            
        i = 255. * tensor.cpu().numpy()
        img = Image.fromarray(np.clip(i, 0, 255).astype(np.uint8)[0])
        
        # Unique check if generic prefix?
        # Actually for temp we rely on timestamp in prefix or here.
        # If filename_prefix has no timestamp, we might overwrite.
        # Let caller handle uniqueness or append timestamp here if generic.
        
        # If 'h4_comp' is in prefix, user handled unique logic (or caller did)
        
        extension = format.lower()
        if "png" in extension:
            format = "PNG"
        elif "webp" in extension:
            format = "WEBP"
            
        full_filename = f"{filename_prefix}.{extension}"
        fullpath = os.path.join(directory, full_filename)
        
        kwargs = {"format": format}
        if format == "WEBP":
            kwargs["quality"] = 90
        if png_info and format == "PNG":
            kwargs["pnginfo"] = png_info
            
        # Optimize metadata for webp? usually exif.
            
        img.save(fullpath, **kwargs)
        
        return full_filename, fullpath
