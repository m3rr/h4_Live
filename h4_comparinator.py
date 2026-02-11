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
import json
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
    def trigger_manual_save(cls, node_id, settings):
        """
        Manually triggers a save for the latest history item of the given node.
        Used by the API endpoint /h4/comparinator/save_now
        """
        try:
            if node_id not in cls.HISTORY_CACHE or not cls.HISTORY_CACHE[node_id]:
                return {"error": "No history found for this node."}

            # Get latest item (index 0)
            item = cls.HISTORY_CACHE[node_id][0]
            filename_a = item["filename_a"]
            filename_b = item["filename_b"]
            
            # Extract Metadata
            extra_pnginfo = item.get("extra_pnginfo", None)
            prompt = item.get("prompt", None)
            metadata_text = item.get("metadata_text", "")
            
            # Load images from Temp
            temp_dir = folder_paths.get_temp_directory()
            path_a = os.path.join(temp_dir, filename_a)
            path_b = os.path.join(temp_dir, filename_b)
            
            if not os.path.exists(path_a) or not os.path.exists(path_b):
                 return {"error": "Source temp files missing."}
                 
            img_a = Image.open(path_a)
            img_b = Image.open(path_b)
            
            # Use Instance method? No, make it static or class method helper
            results = cls._process_save_logic(img_a, img_b, settings, node_id, extra_pnginfo, prompt, metadata_text)
            return {"success": True, "saved": results}
            
        except Exception as e:
            _log(f"[{node_id}] ❌ Manual Save Error: {e}")
            return {"error": str(e)}

    @staticmethod
    def _process_save_logic(img_a, img_b, settings, node_id="Manual", extra_pnginfo=None, prompt=None, user_meta_text=""):
        """
        Core saving logic for PIL images.
        """
        saved_files = []
        try:
            # Defaults
            do_save_a = settings.get("save_a", True)
            do_save_b = settings.get("save_b", True)
            do_save_comp = settings.get("save_comp", False)
            custom_path = settings.get("path", "comparisons")
            custom_prefix = settings.get("prefix", "h4_compare")
            
            output_dir = folder_paths.get_output_directory()
            full_output_dir = os.path.join(output_dir, custom_path)
            os.makedirs(full_output_dir, exist_ok=True)
            
            ts_sec = int(time.time())
            prefix = custom_prefix if custom_prefix else "h4_compare"
            
            # Use metadata if passed? (Not easily available in manual mode unless stored in history)
            # For now, simplistic save
            
            # Prepare Metadata
            png_metadata = None
            if settings.get("save_wf", True) or settings.get("save_meta", True) or settings.get("save_prompt", True):
                from PIL.PngImagePlugin import PngInfo
                png_metadata = PngInfo()
                
                # 1. Workflow (workflow)
                if settings.get("save_wf", True) and extra_pnginfo is not None:
                    for k, v in extra_pnginfo.items():
                         if isinstance(v, (dict, list)):
                             png_metadata.add_text(k, json.dumps(v))
                         else:
                             png_metadata.add_text(k, str(v))
                             
                # 2. Prompt (prompt)
                if settings.get("save_prompt", True) and prompt is not None:
                     png_metadata.add_text("prompt", json.dumps(prompt))
                     
                # 3. User Metadata (Comment)
                if settings.get("save_meta", True) and user_meta_text:
                    png_metadata.add_text("Comment", str(user_meta_text))
                    # Also generic "parameters" if standard format preferred?
                    # Comfy usually puts just workflow/prompt. 
                    # "Comment" is visible in many viewers.

            # Save A
            if do_save_a:
                name_a = f"{prefix}_{ts_sec}_A.png"
                path_a = os.path.join(full_output_dir, name_a)
                path_a = os.path.join(full_output_dir, name_a)
                img_a.save(path_a, pnginfo=png_metadata)
                saved_files.append(path_a)

            # Save B
            if do_save_b:
                name_b = f"{prefix}_{ts_sec}_B.png"
                path_b = os.path.join(full_output_dir, name_b)
                path_b = os.path.join(full_output_dir, name_b)
                img_b.save(path_b, pnginfo=png_metadata)
                saved_files.append(path_b)

            # Save Comparison
            if do_save_comp:
                wA, hA = img_a.size
                wB, hB = img_b.size
                
                # Resize B to match A height
                if hA != hB:
                    new_w = int(wB * (hA / hB))
                    img_b_resized = img_b.resize((new_w, hA), Image.Resampling.LANCZOS)
                else:
                    img_b_resized = img_b
                    new_w = wB

                comp_img = Image.new('RGB', (wA + new_w, hA))
                comp_img.paste(img_a, (0, 0))
                comp_img.paste(img_b_resized, (wA, 0))
                
                name_c = f"{prefix}_{ts_sec}_VS.png"
                path_c = os.path.join(full_output_dir, name_c)
                path_c = os.path.join(full_output_dir, name_c)
                comp_img.save(path_c, pnginfo=png_metadata)
                saved_files.append(path_c)

            _log(f"[{node_id}] 💾 Saved {len(saved_files)} images to {full_output_dir}")
            return saved_files

        except Exception as e:
            _log(f"[{node_id}] ❌ Process Save Error: {e}")
            return []

    
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "image_a": ("IMAGE", {"tooltip": "The 'Before' or 'Control' image"}),
                "save_mode": ("BOOLEAN", {"default": False, "label_on": "💾 SAVE", "label_off": "PREVIEW", "tooltip": "Save images to Output folder?"}),
                "filename_prefix": ("STRING", {"default": "h4_Compare_"}),
            },
            "optional": {
                "image_b": ("IMAGE", {"tooltip": "The 'After' or 'Test' image"}),
                "frozen_image": ("IMAGE", {"tooltip": "Overrides Image B. Useful for freezing a comparison state."}),
                "metadata_text": ("STRING", {"multiline": True, "default": "", "tooltip": "Custom metadata to embed"}),
                "save_settings": ("STRING", {"default": "", "multiline": False}),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID",
                "extra_pnginfo": "EXTRA_PNGINFO",
                "prompt": "PROMPT"
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

    def compare_images(self, image_a, save_mode=False, filename_prefix="h4_compare", image_b=None, frozen_image=None, metadata_text="", save_settings="", unique_id=None, extra_pnginfo=None, prompt=None):
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
                # Parse Settings
                settings = {}
                if save_settings and save_settings.strip():
                    try:
                        settings = json.loads(save_settings)
                    except:
                        pass
                
                # Save Logic using Helper
                # Convert Tensors to PIL first
                # (Batch 0 assumed)
                pil_a = Image.fromarray((image_a[0].cpu().numpy() * 255).astype(np.uint8))
                
                # final_b might be tensor or None (handled at start)
                pil_b = Image.fromarray((final_b[0].cpu().numpy() * 255).astype(np.uint8))
                
                # Use class static method
                self._process_save_logic(pil_a, pil_b, settings, node_id)
                
            except Exception as e:
                _log(f"[{node_id}] ❌ Save Logic Error: {e}")

        # 3. Update History (Using Temp Files)
        history_entry = {
            "id": f"{timestamp}",
            "filename_a": temp_a_name,
            "filename_b": temp_b_name,

            "timestamp": timestamp,
            "extra_pnginfo": extra_pnginfo,
            "prompt": prompt,
            "metadata_text": metadata_text
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
