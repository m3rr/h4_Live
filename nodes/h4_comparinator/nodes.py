# ------------------------------------------------------------------------------
# H4 Comparinator - The Ultimate A/B Test Node
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
try:
    from ...core.h4_core import _log
except ImportError:
    def _log(msg):
        print(f"[H4_Comparinator] {msg}")

try:
    from ..h4_comparinator_vault.nodes import ComparinatorVault
except ImportError:
    class MockVault:
        ROOT_DIR = os.path.join(folder_paths.get_output_directory(), "h4_comparinator_vault")
        @staticmethod
        def save_entry(*args, **kwargs):
            pass
        @staticmethod
        def get_all_history():
            return []
    ComparinatorVault = MockVault

try:
    from ...core.h4_session_manager import session_manager
except ImportError:
    class MockSession:
        @staticmethod
        def tag_execution(*args, **kwargs): pass
    session_manager = MockSession
import shutil
from aiohttp import web

def clean_nan(obj):
    """Recursively replace NaN/Inf with None so JSON serialization doesn't explode."""
    if isinstance(obj, float):
        if np.isnan(obj) or np.isinf(obj):
            return None  # JSON null — safe, parseable
        return obj
    elif isinstance(obj, dict):
        return {k: clean_nan(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_nan(v) for v in obj]
    return obj

class H4_Comparinator:
    """
    Dual-Channel Image Comparator with Time-Travel History.
    """
    
    # Persistent History is now handled by the Vault on disk
    
    @classmethod
    def trigger_manual_save(cls, node_id, settings, target_item=None):
        """
        Manually triggers a save for a specific history item.
        If target_item is provided, it uses that specific item.
        Otherwise, it falls back to the latest runtime cache (Legacy behavior).
        """
        try:
            item = target_item
            
            # Fallback to cache if no target provided
            if not item:
                if node_id not in cls.RUNTIME_CACHE or not cls.RUNTIME_CACHE[node_id]:
                    return {"error": "No runtime history found and no target item provided."}
                item = cls.RUNTIME_CACHE[node_id][0]

            # Extract File Info
            filename_a = item.get("filename_a")
            filename_b = item.get("filename_b")
            source = item.get("source", "temp")
            
            # Extract Metadata
            extra_pnginfo = item.get("extra_pnginfo", None)
            prompt = item.get("prompt", None)
            metadata_text = item.get("metadata_text", "")
            
            # Resolve Paths based on Source
            path_a = cls._resolve_path(filename_a, source, item.get("relative_path_a"))
            path_b = cls._resolve_path(filename_b, source, item.get("relative_path_b"))

            if not path_a or not os.path.exists(path_a):
                return {"error": f"Source file A missing: {filename_a} ({source})"}
            if not path_b or not os.path.exists(path_b):
                 return {"error": f"Source file B missing: {filename_b} ({source})"}

            img_a = Image.open(path_a)
            img_b = Image.open(path_b)
            
            results = cls._process_save_logic(img_a, img_b, settings, node_id, extra_pnginfo, prompt, metadata_text)
            return {"success": True, "saved": results}
            
        except Exception as e:
            _log(f"[{node_id}] ❌ Manual Save Error: {e}")
            return {"error": str(e)}

    @staticmethod
    def _resolve_path(filename, source, relative_path=None):
        """Resolves absolute path dynamically based on source."""
        if not filename: return None
        
        if source == "vault":
            # 1. Try Vault Root (using relative path if available)
            if relative_path:
                 vault_path = os.path.join(ComparinatorVault.ROOT_DIR, relative_path)
                 if os.path.exists(vault_path): return vault_path
                 
            # 2. Search Vault via filename (fallback)
            # Optimized to avoid deep recursive walk
            for entry in os.scandir(ComparinatorVault.ROOT_DIR):
                if entry.is_dir():
                    check_path = os.path.join(entry.path, filename)
                    if os.path.exists(check_path): return check_path
                    
        # 3. Default to Temp (works for "temp" source and "temp_recovery")
        temp_dir = folder_paths.get_temp_directory()
        temp_path = os.path.join(temp_dir, filename)
        if os.path.exists(temp_path): return temp_path
        
        return None

    # Keep a small runtime cache for Manual Save operations (Temp files references)
    RUNTIME_CACHE = defaultdict(lambda: deque(maxlen=10))

    @staticmethod
    def _process_save_logic(img_a, img_b, settings, node_id="Manual", extra_pnginfo=None, prompt=None, user_meta_text=""):
        """
        Core saving logic for PIL images.
        """
        saved_files = []
        try:
            do_save_a = settings.get("save_a", True)
            do_save_b = settings.get("save_b", True)
            do_save_comp = settings.get("save_comp", False)
            custom_path = settings.get("path", "comparisons")
            custom_prefix = settings.get("prefix", "h4_compare")
            
            output_dir = folder_paths.get_output_directory()
            # Safety check if it returns a list
            if isinstance(output_dir, list): output_dir = output_dir[0]
            
            # Normalize user-provided path to avoid traversal issues
            safe_custom_path = os.path.normpath(custom_path)
            # Remove any leading ".." to prevent escaping output dir context
            if safe_custom_path.startswith(".."): safe_custom_path = safe_custom_path.replace("..", "")
            
            full_output_dir = os.path.join(output_dir, safe_custom_path)
            os.makedirs(full_output_dir, exist_ok=True)
            
            ts_sec = int(time.time())
            prefix = custom_prefix if custom_prefix else "h4_compare"
            
            # Prepare Metadata
            png_metadata = None
            if settings.get("save_wf", True) or settings.get("save_meta", True) or settings.get("save_prompt", True):
                from PIL.PngImagePlugin import PngInfo
                png_metadata = PngInfo()
                
                if settings.get("save_wf", True) and extra_pnginfo is not None:
                    for k, v in extra_pnginfo.items():
                         if isinstance(v, (dict, list)):
                             png_metadata.add_text(k, json.dumps(v))
                         else:
                             png_metadata.add_text(k, str(v))
                             
                if settings.get("save_prompt", True) and prompt is not None:
                     png_metadata.add_text("prompt", json.dumps(prompt))
                     
                if settings.get("save_meta", True) and user_meta_text:
                    png_metadata.add_text("Comment", str(user_meta_text))

            # Save A
            if do_save_a:
                name_a = f"{prefix}_{ts_sec}_A.png"
                path_a = os.path.join(full_output_dir, name_a)
                img_a.save(path_a, pnginfo=png_metadata)
                saved_files.append(path_a)

            # Save B
            if do_save_b:
                name_b = f"{prefix}_{ts_sec}_B.png"
                path_b = os.path.join(full_output_dir, name_b)
                img_b.save(path_b, pnginfo=png_metadata)
                saved_files.append(path_b)

            # Save Comparison
            if do_save_comp:
                wA, hA = img_a.size
                wB, hB = img_b.size
                
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
    H4 Comparinator
    Dual-Channel Image Comparator with History Vault.
    """

    def compare_images(self, image_a, save_mode=False, filename_prefix="h4_compare", image_b=None, frozen_image=None, metadata_text="", save_settings="", unique_id=None, extra_pnginfo=None, prompt=None):
        node_id = str(unique_id)
        
        # Logic: Frozen Image overrides Image B
        final_b = frozen_image if frozen_image is not None else image_b
        
        if final_b is None:
            final_b = image_a
            
        _log(f"[{node_id}] ⚔️ Comparinator Active - Mode: {'SAVE' if save_mode else 'PREVIEW'}")
        
        # 1. Standardize Temp Save (For UI History)
        timestamp = int(time.time() * 1000)
        
        temp_a_name, temp_a_path = self._save_image(image_a, f"h4_comp_{node_id}_{timestamp}_A", folder_paths.get_temp_directory(), "WEBP")
        temp_b_name, temp_b_path = self._save_image(final_b, f"h4_comp_{node_id}_{timestamp}_B", folder_paths.get_temp_directory(), "WEBP")
        
        # 2. Handle Permanent Save (Manual Trigger Logic)
        if save_mode:
            try:
                settings = {}
                if save_settings and save_settings.strip():
                    try:
                        settings = json.loads(save_settings)
                    except:
                        pass
                
                pil_a = Image.fromarray((image_a[0].cpu().float().numpy() * 255).astype(np.uint8))
                pil_b = Image.fromarray((final_b[0].cpu().float().numpy() * 255).astype(np.uint8))
                
                self._process_save_logic(pil_a, pil_b, settings, node_id)
                
            except Exception as e:
                _log(f"[{node_id}] ❌ Save Logic Error: {e}")

        # 3. Vault Integration (The New Backend)
        meta = {}
        try:
            from ...core.h4_session_manager import session_manager
            meta = session_manager.extract_metadata(prompt, unique_id)
            # Ensure mandatory fields for validation
            meta["image_id"] = node_id
            meta["temp_save_name"] = temp_b_name # Link to B as the "Generated" image
            meta["filename_a"] = temp_a_name # Also store A
            meta["filename_b"] = temp_b_name 
            
            # Save to Vault
            ComparinatorVault.save_entry(meta)
            
        except Exception as e:
             _log(f"[{node_id}] Vault Save Failed: {e}")

        # 4. Update Runtime Cache (For Manual Save)
        history_entry = {
            "id": f"{timestamp}",
            "filename_a": temp_a_name,
            "filename_b": temp_b_name,
            "timestamp": timestamp,
            "type": "temp",
            "subfolder": "",
            "extra_pnginfo": extra_pnginfo,
            "prompt": prompt,
            "metadata_text": metadata_text,
            "meta": meta 
        }
        
        H4_Comparinator.RUNTIME_CACHE[node_id].appendleft(history_entry)
        
        # Invalidate vault cache before broadcast
        ComparinatorVault.invalidate_cache()
                
        ui_payload = {
            "node_id": node_id,
            "current": history_entry,
            "history": ComparinatorVault.get_all_history()[:25]
        }
        
        try:
            safe_payload = clean_nan(ui_payload)
            PromptServer.instance.send_sync("h4.comparinator.update", safe_payload)
        except:
            pass
        
        return (image_a, final_b)

    def _save_image(self, tensor, filename_prefix, directory, format="WEBP", png_info=None):
        if len(tensor.shape) > 3 and tensor.shape[0] > 1:
            tensor = tensor[0].unsqueeze(0)
            
        i = 255. * tensor.cpu().float().numpy()
        img = Image.fromarray(np.clip(i, 0, 255).astype(np.uint8)[0])
        
        extension = format.lower()
        if "png" in extension: format = "PNG"
        elif "webp" in extension: format = "WEBP"
            
        full_filename = f"{filename_prefix}.{extension}"
        fullpath = os.path.join(directory, full_filename)
        
        kwargs = {"format": format}
        if format == "WEBP": kwargs["quality"] = 90
        if png_info and format == "PNG": kwargs["pnginfo"] = png_info
            
        img.save(fullpath, **kwargs)
        
        return full_filename, fullpath


# --- API REGISTRATION ---
try:
    @PromptServer.instance.routes.get("/h4/comparinator/history")
    async def get_history(request):
        history = ComparinatorVault.get_all_history()
        return web.json_response(history)

    @PromptServer.instance.routes.get("/h4/comparinator/image")
    async def get_vault_image(request):
        filename = request.query.get("filename")
        if not filename: return web.Response(status=404)
        
        # Security: Resolve absolute paths to prevent traversal
        safe_root = os.path.abspath(ComparinatorVault.ROOT_DIR)
        target_path = os.path.abspath(os.path.join(safe_root, filename))
        
        if not target_path.startswith(safe_root):
             return web.Response(status=403, text="Access Denied")
             
        if os.path.exists(target_path):
            return web.FileResponse(target_path)
        return web.Response(status=404)

    @PromptServer.instance.routes.post("/h4/comparinator/save_now")
    async def save_now(request):
        try:
            data = await request.json()
            node_id = data.get("node_id")
            settings = data.get("settings", {})
            target_item = data.get("target_item", None)
            result = H4_Comparinator.trigger_manual_save(str(node_id), settings, target_item=target_item)
            return web.json_response(result)
        except Exception as e:
            _log(f"Manual Save API Error: {e}")
            return web.json_response({"error": str(e)}, status=500)
        
except Exception as e:
    _log(f"API Registration Failed: {e}")