# h4_faceforge/utils.py - Shared Utilities
# ==============================================================================
# Image conversion, hashing, model downloading, and detection utilities
# ==============================================================================

import os
import hashlib
import urllib.request
import numpy as np
import torch
from PIL import Image
from typing import List, Optional, Tuple
import folder_paths
import logging

# ------------------------------------------------------------------------------
# Logging
# ------------------------------------------------------------------------------
def _log(message: str, level: str = "INFO"):
    """
    Internal logging function for FaceForge module.
    Outputs timestamped messages to console.
    """
    from datetime import datetime
    timestamp = datetime.now().strftime("%H:%M:%S")
    prefix = f"[h4_FaceForge] [{timestamp}]"
    print(f"{prefix} [{level}] {message}")

# ------------------------------------------------------------------------------
# Image Conversions
# ------------------------------------------------------------------------------
def tensor_to_pil(img_tensor: torch.Tensor, batch_index: int = 0) -> Image.Image:
    """
    Convert a ComfyUI IMAGE tensor to PIL Image.
    
    Args:
        img_tensor: Tensor of shape (B, H, W, C) with values in [0, 1]
        batch_index: Which image in the batch to extract
        
    Returns:
        PIL.Image in RGB mode
    """
    if img_tensor.dim() == 4:
        img_tensor = img_tensor[batch_index]
    
    # Convert from (H, W, C) tensor [0,1] to numpy [0,255]
    img_np = (img_tensor.cpu().numpy() * 255).astype(np.uint8)
    
    return Image.fromarray(img_np, mode="RGB")


def batch_tensor_to_pil(img_tensor: torch.Tensor) -> List[Image.Image]:
    """
    Convert an entire batch of IMAGE tensors to PIL Images.
    
    Args:
        img_tensor: Tensor of shape (B, H, W, C)
        
    Returns:
        List of PIL.Image objects
    """
    images = []
    for i in range(img_tensor.shape[0]):
        images.append(tensor_to_pil(img_tensor, i))
    return images


def pil_to_tensor(image: Image.Image) -> torch.Tensor:
    """
    Convert a PIL Image to ComfyUI IMAGE tensor.
    
    Args:
        image: PIL.Image in RGB mode
        
    Returns:
        Tensor of shape (1, H, W, C) with values in [0, 1]
    """
    # Ensure RGB mode
    if image.mode != "RGB":
        image = image.convert("RGB")
    
    img_np = np.array(image).astype(np.float32) / 255.0
    img_tensor = torch.from_numpy(img_np).unsqueeze(0)
    
    return img_tensor


def batched_pil_to_tensor(images: List[Image.Image]) -> torch.Tensor:
    """
    Convert a list of PIL Images to a batched ComfyUI IMAGE tensor.
    
    Args:
        images: List of PIL.Image objects
        
    Returns:
        Tensor of shape (B, H, W, C)
    """
    tensors = [pil_to_tensor(img) for img in images]
    return torch.cat(tensors, dim=0)

# ------------------------------------------------------------------------------
# Hashing
# ------------------------------------------------------------------------------
def get_image_md5hash(image) -> str:
    """
    Compute MD5 hash of an image for caching purposes.
    
    Args:
        image: Either PIL.Image or numpy array
        
    Returns:
        MD5 hash string
    """
    if isinstance(image, Image.Image):
        img_bytes = np.array(image).tobytes()
    elif isinstance(image, np.ndarray):
        img_bytes = image.tobytes()
    else:
        img_bytes = str(image).encode()
    
    return hashlib.md5(img_bytes).hexdigest()

# ------------------------------------------------------------------------------
# Model Downloading
# ------------------------------------------------------------------------------
def download_model(url: str, dest_path: str, model_name: str) -> bool:
    """
    Download a model file from URL if it doesn't exist.
    Shows progress in console.
    
    Args:
        url: Source URL
        dest_path: Full path to save the model
        model_name: Display name for logging
        
    Returns:
        True if download successful or file exists, False otherwise
    """
    if os.path.exists(dest_path):
        _log(f"Model already exists: {model_name}")
        return True
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    
    _log(f"Downloading: {model_name}...")
    
    try:
        # Download with progress
        def _progress_hook(block_num, block_size, total_size):
            if total_size > 0:
                percent = min(100, (block_num * block_size * 100) // total_size)
                if block_num % 100 == 0:  # Don't spam console
                    print(f"\r  Progress: {percent}%", end="", flush=True)
        
        urllib.request.urlretrieve(url, dest_path, reporthook=_progress_hook)
        print()  # Newline after progress
        _log(f"Downloaded: {model_name}")
        return True
        
    except Exception as e:
        _log(f"Failed to download {model_name}: {e}", level="ERROR")
        return False

# ------------------------------------------------------------------------------
# Model Path Helpers
# ------------------------------------------------------------------------------
def get_models_dir() -> str:
    """Get the ComfyUI models directory path."""
    return folder_paths.models_dir


def get_faceforge_models_path() -> str:
    """Get the FaceForge models subdirectory, creating if needed."""
    path = os.path.join(get_models_dir(), "faceforge")
    os.makedirs(path, exist_ok=True)
    return path


def get_face_models_path() -> str:
    """Get the face models subdirectory (for saved face embeddings)."""
    path = os.path.join(get_faceforge_models_path(), "faces")
    os.makedirs(path, exist_ok=True)
    return path


def get_swap_models_path() -> str:
    """Get swap models directory (InsightFace, ReSwapper, HyperSwap)."""
    return os.path.join(get_models_dir(), "insightface")


def get_restore_models_path() -> str:
    """Get face restore models directory."""
    path = os.path.join(get_models_dir(), "facerestore_models")
    os.makedirs(path, exist_ok=True)
    return path


def get_upscale_models_path() -> str:
    """Get upscaler models directory."""
    # Use existing ComfyUI upscale_models path if registered
    upscale_paths = folder_paths.folder_names_and_paths.get("upscale_models", ([], []))
    if upscale_paths[0]:
        return upscale_paths[0][0]
    
    # Fallback to our own directory
    path = os.path.join(get_models_dir(), "upscale_models")
    os.makedirs(path, exist_ok=True)
    return path

# ------------------------------------------------------------------------------
# Progress Bar Helper
# ------------------------------------------------------------------------------
class ProgressBar:
    """
    Simple progress bar wrapper compatible with ComfyUI's ProgressBar.
    """
    def __init__(self, total: int):
        self.total = total
        self.current = 0
        try:
            from comfy.utils import ProgressBar as ComfyProgressBar
            self._pbar = ComfyProgressBar(total)
        except ImportError:
            self._pbar = None
    
    def update(self, n: int = 1):
        self.current += n
        if self._pbar:
            self._pbar.update(n)
    
    def reset(self):
        self.current = 0


def progress_bar(total: int) -> ProgressBar:
    """Create a new progress bar."""
    return ProgressBar(total)


def progress_bar_reset(pbar: ProgressBar):
    """Reset a progress bar."""
    if pbar:
        pbar.reset()
