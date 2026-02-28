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
from ..core.h4_core import _log

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
                    "placeholder": "C:\\Images\\My_Batch  (or use Browse button)",
                    "tooltip": "Paste the full path to your folder here (e.g. C:\\MyPhotos). Or use the Browse button if available."
                }),
                "current_index": ("INT", {
                    "default": 0, "min": 0, "max": 99999,
                    "tooltip": "Which image number are we on? (0 = First Image). Auto-increments."
                }),
                "auto_queue_remaining": ("BOOLEAN", {
                    "default": False,
                    "tooltip": "If ON, I will automatically keep processing the rest of the folder for you."
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
        
        # 1. Resolve Path and Detect Video
        target = folder_path.strip()
        if target.startswith('"') and target.endswith('"'):
            target = target[1:-1]
            
        if not os.path.exists(target):
            _log(f"[{node_id}] ❌ ERROR: Path not found: {target}")
            raise ValueError(f"Path not found: {target}")

        # Check if it's a video file or directory
        is_video = False
        valid_video_exts = {'.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.gif'}
        if os.path.isfile(target):
             ext = os.path.splitext(target)[1].lower()
             if ext in valid_video_exts:
                 is_video = True
             else:
                 _log(f"[{node_id}] ❌ Invalid File: {target}. Must be directory or video {valid_video_exts}")
                 raise ValueError(f"Invalid File. Must be directory or video.")
        
        image_tensor = None
        filename = ""
        total_count = 0
        effective_index = 0
        
        # --- VIDEO MODE ---
        if is_video:
            try:
                import cv2
            except ImportError:
                 raise ImportError("Opencv-python (cv2) is required for video support. Please install it.")

            cap = cv2.VideoCapture(target)
            if not cap.isOpened():
                raise ValueError(f"Could not open video file: {target}")
            
            total_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            
            # Index Clamping
            effective_index = current_index
            if current_index >= total_count:
                effective_index = total_count - 1
            elif current_index < 0:
                effective_index = 0
                
            # Seek
            cap.set(cv2.CAP_PROP_POS_FRAMES, effective_index)
            ret, frame = cap.read()
            cap.release()
            
            if not ret:
                raise ValueError(f"Failed to read frame {effective_index} from video.")
                
            # Convert BGR (OpenCV) to RGB
            frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Normalize to 0-1 and Tensor [B, H, W, C]
            image_np = frame.astype(np.float32) / 255.0
            image_tensor = torch.from_numpy(image_np)[None,]
            
            filename = os.path.basename(target)
            _log(f"[{node_id}] 🎬 Video Frame {effective_index}/{total_count}: {filename}")

        # --- FOLDER MODE (Existing Logic) ---
        else:
            # 2. Scan & Sort Files (Images Only)
            valid_extensions = {'.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif', '.tiff'}
            files = []
            try:
                for f in os.listdir(target):
                    if os.path.isfile(os.path.join(target, f)):
                        ext = os.path.splitext(f)[1].lower()
                        if ext in valid_extensions:
                            files.append(f)
            except Exception as e:
                 _log(f"[{node_id}] ❌ Error scanning directory: {e}")
                 raise ValueError(f"Error scanning directory: {e}")
                 
            # Natural Sort
            files.sort()
            total_count = len(files)
            
            if total_count == 0:
                _log(f"[{node_id}] ❌ No images found in: {target}")
                raise ValueError(f"No Valid Images found in {target}")
    
            # 3. Handle Index Clamping & Wrapping
            effective_index = current_index
            if current_index >= total_count:
                 _log(f"[{node_id}] ⚠️ Index {current_index} > Total {total_count}. Clamping to last image.")
                 effective_index = total_count - 1
            elif current_index < 0:
                 effective_index = 0
                 
            filename = files[effective_index]
            image_path = os.path.join(target, filename)
            
            _log(f"[{node_id}] Streaming Frame {effective_index+1}/{total_count}: {filename}")
            
            # 4. Load Image (PIL to Tensor)
            i = Image.open(image_path)
            i = ImageOps.exif_transpose(i)
            
            if i.mode == 'I':
                i = i.point(lambda i: i * (1 / 255))
            image = i.convert("RGB")
            
            image_np = np.array(image).astype(np.float32) / 255.0
            image_tensor = torch.from_numpy(image_np)[None,] 

        # --- COMMON POST-PROCESSING ---
        is_last = (effective_index == total_count - 1)
        
        # 5. Handle Auto-Queue Logic
        if auto_queue_remaining:
            remaining = total_count - (effective_index + 1)
            if remaining > 0:
                _log(f"[{node_id}] 🚀 Triggering Auto-Queue for {remaining} more frames...")
                PromptServer.instance.send_sync("h4.datastream.queue_batch", {
                    "node_id": unique_id,
                    "folder": target, 
                    "start_index": effective_index + 1,
                    "count": remaining
                })
        
        # 6. Send UI Update (Preview)
        preview_filename = f"h4_preview_{unique_id}.webp"
        preview_path = os.path.join(folder_paths.get_temp_directory(), preview_filename)
        
        # Save thumbnail (Reuse tensor to save PIL to ensure WYSIWYG)
        try:
             # Tensor [1, H, W, C] -> Numpy [H, W, C] -> PIL
             p_img = (image_tensor[0].numpy() * 255).astype(np.uint8)
             Image.fromarray(p_img).save(preview_path, format="WEBP", quality=80)
        except Exception as e:
             _log(f"[{node_id}] ⚠️ Failed to save preview: {e}")

        PromptServer.instance.send_sync("h4.datastream.update_ui", {
            "node_id": unique_id,
            "filename": filename,
            "current": effective_index + 1,
            "total": total_count,
            "preview_url": preview_filename 
        })
        
        return (image_tensor, filename, effective_index, total_count, is_last)
