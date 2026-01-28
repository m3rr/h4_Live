# FILE: custom_nodes/comfyui_h4_live/h4_datastream.py
# ------------------------------------------------------------------------------
# H4 DataStream - Sequential Image Loader
# Rule 1: No Placeholders
# Rule 11: Mandatory Logging
# ------------------------------------------------------------------------------
import os
import torch
import numpy as np
import folder_paths
from PIL import Image, ImageOps, ImageSequence
from server import PromptServer
from aiohttp import web
from .h4_core import _log

# ------------------------------------------------------------------------------
# API: Server-Side Folder Browser (Localhost Only)
# ------------------------------------------------------------------------------
# Delayed import for Tkinter to prevent startup freeze
TK_AVAILABLE = False # Will be checked at runtime

@PromptServer.instance.routes.get("/h4/browse")
async def h4_browse_folder(request):
    # Lazy Import inside function to prevent startup freeze
    try:
        import tkinter
        from tkinter import filedialog
    except ImportError:
        return web.json_response({"path": "", "error": "Tkinter not installed/available"})

    # Run Tkinter in a way that doesn't freeze the async loop
    # We cheat by creating a temporary root, hiding it, and destroying it
    try:
        root = tkinter.Tk()
        root.withdraw() # Hide the main window
        root.attributes('-topmost', True) # Make dialog appear on top
        
        # Open dialog
        folder_path = filedialog.askdirectory(title="Select Image Folder")
        
        root.destroy()
        
        return web.json_response({"path": folder_path})
    except Exception as e:
        print(f"[H4_DataStream] Browser Error: {e}")
        return web.json_response({"path": "", "error": str(e)})

class H4_DataStream:
    """
    📡 H4 DataStream - Sequential Image Loader
    "Stream the feed. One frame at a time."
    
    Loads images from input folder one at a time.
    Auto-Queue toggle processes entire folder in one click.
    """
    
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "folder_path": ("STRING", {
                    "default": "", 
                    "multiline": False,
                    "placeholder": "C:\\Images\\My_Batch  (or use Browse button)"
                }),
                "current_index": ("INT", {
                    "default": 0, "min": 0, "max": 99999,
                    "tooltip": "Current image index. Auto-increments with batch queue."
                }),
                "auto_queue_remaining": ("BOOLEAN", {
                    "default": False,
                    "tooltip": "When ON: Automatically queues all remaining images after this one."
                }),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID"
            }
        }
    
    RETURN_TYPES = ("IMAGE", "STRING", "INT", "INT", "BOOLEAN")
    RETURN_NAMES = ("image", "filename", "current_index", "total_count", "is_last")
    FUNCTION = "stream_image"
    CATEGORY = "h4_Live/IO"
    OUTPUT_NODE = True  # For UI messaging

    DESCRIPTION = """
    📡 DataStream - Batch Image Loader
    
    Loads images from ANY folder on your drive (Absolute Path).
    Set index to 0, enable Auto-Queue, hit Queue once.
    """

    def stream_image(self, folder_path, current_index, auto_queue_remaining, unique_id):
        node_id = f"DataStream_{unique_id}"
        
        # 1. Resolve Path
        # Handle "Input Folder" shortcuts? No, strict absolute path for now + browser.
        target_dir = folder_path.strip()
        
        # Clean quotes if user pasted them
        if target_dir.startswith('"') and target_dir.endswith('"'):
            target_dir = target_dir[1:-1]
        
        if not os.path.isdir(target_dir):
            _log(f"[{node_id}] ❌ ERROR: Directory not found: {target_dir}")
            raise ValueError(f"Directory not found: {target_dir}")
            
        # 2. Scan & Sort Files (Images Only)
        valid_extensions = {'.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif', '.tiff'}
        files = []
        try:
            for f in os.listdir(target_dir):
                if os.path.isfile(os.path.join(target_dir, f)):
                    ext = os.path.splitext(f)[1].lower()
                    if ext in valid_extensions:
                        files.append(f)
        except Exception as e:
             _log(f"[{node_id}] ❌ Error scanning directory: {e}")
             raise ValueError(f"Error scanning directory: {e}")
             
        # Natural Sort (ASCII for now, simple sort)
        files.sort()
        total_count = len(files)
        
        if total_count == 0:
            _log(f"[{node_id}] ❌ No images found in: {target_dir}")
            raise ValueError(f"No Valid Images found in {target_dir}")

        # 3. Handle Index Clamping & Wrapping
        # We clamp to valid range to prevent crashes, but log it
        effective_index = current_index
        if current_index >= total_count:
             _log(f"[{node_id}] ⚠️ Index {current_index} > Total {total_count}. Clamping to last image.")
             effective_index = total_count - 1
        elif current_index < 0:
             effective_index = 0
             
        filename = files[effective_index]
        image_path = os.path.join(target_dir, filename)
        is_last = (effective_index == total_count - 1)
        
        _log(f"[{node_id}] Streaming Frame {effective_index+1}/{total_count}: {filename}")
        
        # 4. Load Image (PIL to Tensor)
        # Standard ComfyUI image loading pattern
        i = Image.open(image_path)
        i = ImageOps.exif_transpose(i)
        
        if i.mode == 'I':
            i = i.point(lambda i: i * (1 / 255))
        image = i.convert("RGB")
        
        image_np = np.array(image).astype(np.float32) / 255.0
        image_tensor = torch.from_numpy(image_np)[None,] # Add batch dim [1, H, W, C]
        
        # 5. Handle Auto-Queue Logic
        # If requested, we tell the frontend to queue the NEXT set of images
        if auto_queue_remaining:
            remaining = total_count - (current_index + 1)
            if remaining > 0:
                _log(f"[{node_id}] 🚀 Triggering Auto-Queue for {remaining} more frames...")
                # Send async message to JS
                PromptServer.instance.send_sync("h4.datastream.queue_batch", {
                    "node_id": unique_id,
                    "folder": target_dir, 
                    "start_index": current_index + 1,
                    "count": remaining
                })
        
        # 6. Send UI Update (Preview)
        # We save a temporary preview file so the browser can load it via /view
        # without running into security restrictions on absolute paths
        preview_filename = f"h4_preview_{unique_id}.webp"
        preview_path = os.path.join(folder_paths.get_temp_directory(), preview_filename)
        
        # Save thumbnail (optional resize could go here, but full res is fine for local)
        # We use the PIL image 'i' we already loaded
        try:
             i.save(preview_path, format="WEBP", quality=80)
        except Exception as e:
             _log(f"[{node_id}] ⚠️ Failed to save preview: {e}")

        PromptServer.instance.send_sync("h4.datastream.update_ui", {
            "node_id": unique_id,
            "filename": filename,
            "current": effective_index + 1,
            "total": total_count,
            "preview_url": preview_filename # Filename in temp
        })
        
        return (image_tensor, filename, effective_index, total_count, is_last)
