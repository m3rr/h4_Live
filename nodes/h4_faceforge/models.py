# h4_faceforge/models.py - Model Detection and Loading
# ==============================================================================
# Auto-detect installed models, auto-download missing models, load models
# ==============================================================================

import os
import glob
from typing import List, Dict, Optional, Any
import folder_paths

from .utils import (
    _log,
    download_model,
    get_models_dir,
    get_faceforge_models_path,
    get_face_models_path,
    get_swap_models_path,
    get_restore_models_path,
    get_upscale_models_path,
)

# ------------------------------------------------------------------------------
# Model URLs for Auto-Download
# ------------------------------------------------------------------------------

# Face Restore Models
RESTORE_MODEL_URLS = {
    "GFPGANv1.3.pth": "https://huggingface.co/datasets/Gourieff/ReActor/resolve/main/models/facerestore_models/GFPGANv1.3.pth",
    "GFPGANv1.4.pth": "https://huggingface.co/datasets/Gourieff/ReActor/resolve/main/models/facerestore_models/GFPGANv1.4.pth",
    "codeformer-v0.1.0.pth": "https://huggingface.co/datasets/Gourieff/ReActor/resolve/main/models/facerestore_models/codeformer-v0.1.0.pth",
    "GPEN-BFR-512.onnx": "https://huggingface.co/datasets/Gourieff/ReActor/resolve/main/models/facerestore_models/GPEN-BFR-512.onnx",
}

# Upscale Models (4K/8K capable)
UPSCALE_MODEL_URLS = {
    "RealESRGAN_x4plus.pth": "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth",
    "4x-UltraSharp.pth": "https://huggingface.co/Kim2091/UltraSharp/resolve/main/4x-UltraSharp.pth",
    # Note: 8x NMKD model is large, URL may vary - placeholder for now
}

# SAM Models
SAM_MODEL_URLS = {
    "sam_vit_b_01ec64.pth": "https://dl.fbaipublicfiles.com/segment_anything/sam_vit_b_01ec64.pth",
    "sam_vit_l_0b3195.pth": "https://dl.fbaipublicfiles.com/segment_anything/sam_vit_l_0b3195.pth",
    "sam_vit_h_4b8939.pth": "https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth",
}

# ------------------------------------------------------------------------------
# Model Detection Functions
# ------------------------------------------------------------------------------

def get_swap_models() -> List[str]:
    """
    Detect available face swap models.
    Scans: insightface/, reswapper/, hyperswap/ directories.
    
    Returns:
        List of model filenames (e.g., ["inswapper_128.onnx", "reswapper_256.onnx"])
    """
    models_dir = get_models_dir()
    models = []
    
    # InsightFace models
    insightface_path = os.path.join(models_dir, "insightface", "*.onnx")
    models.extend([os.path.basename(m) for m in glob.glob(insightface_path)])
    
    # Also check insightface/models subdirectory
    insightface_models_path = os.path.join(models_dir, "insightface", "models", "*.onnx")
    models.extend([os.path.basename(m) for m in glob.glob(insightface_models_path)])
    
    # ReSwapper models
    reswapper_path = os.path.join(models_dir, "reswapper", "*.onnx")
    models.extend([os.path.basename(m) for m in glob.glob(reswapper_path)])
    reswapper_pth_path = os.path.join(models_dir, "reswapper", "*.pth")
    models.extend([os.path.basename(m) for m in glob.glob(reswapper_pth_path)])
    
    # HyperSwap models
    hyperswap_path = os.path.join(models_dir, "hyperswap", "*.onnx")
    models.extend([os.path.basename(m) for m in glob.glob(hyperswap_path)])
    
    # Remove duplicates and sort
    models = list(set(models))
    models.sort(key=str.lower)
    
    if not models:
        _log("No swap models found. Please install InsightFace/ReSwapper/HyperSwap models.", level="WARNING")
        models = ["none"]
    
    return models


def get_restore_models(auto_download: bool = True) -> List[str]:
    """
    Detect available face restoration models.
    Auto-downloads default models if none found and auto_download is True.
    
    Returns:
        List of model filenames (e.g., ["GFPGANv1.4.pth", "codeformer-v0.1.0.pth"])
    """
    restore_path = get_restore_models_path()
    
    # Scan for existing models
    pth_models = glob.glob(os.path.join(restore_path, "*.pth"))
    onnx_models = glob.glob(os.path.join(restore_path, "*.onnx"))
    models = [os.path.basename(m) for m in pth_models + onnx_models]
    
    # Auto-download if none found
    if not models and auto_download:
        _log("No restore models found. Auto-downloading defaults...")
        for model_name, url in RESTORE_MODEL_URLS.items():
            dest = os.path.join(restore_path, model_name)
            download_model(url, dest, model_name)
        
        # Re-scan
        pth_models = glob.glob(os.path.join(restore_path, "*.pth"))
        onnx_models = glob.glob(os.path.join(restore_path, "*.onnx"))
        models = [os.path.basename(m) for m in pth_models + onnx_models]
    
    models.sort(key=str.lower)
    models.insert(0, "none")  # Allow no restoration
    
    return models


def get_upscale_models(auto_download: bool = True) -> List[str]:
    """
    Detect available upscale models.
    Auto-downloads 4x-UltraSharp if none found and auto_download is True.
    
    Returns:
        List of model filenames
    """
    upscale_path = get_upscale_models_path()
    
    # Scan for existing models
    pth_models = glob.glob(os.path.join(upscale_path, "*.pth"))
    onnx_models = glob.glob(os.path.join(upscale_path, "*.onnx"))
    bin_models = glob.glob(os.path.join(upscale_path, "*.bin"))
    models = [os.path.basename(m) for m in pth_models + onnx_models + bin_models]
    
    # Auto-download essentials if none found
    if not models and auto_download:
        _log("No upscale models found. Auto-downloading 4x-UltraSharp...")
        for model_name in ["RealESRGAN_x4plus.pth", "4x-UltraSharp.pth"]:
            if model_name in UPSCALE_MODEL_URLS:
                dest = os.path.join(upscale_path, model_name)
                download_model(UPSCALE_MODEL_URLS[model_name], dest, model_name)
        
        # Re-scan
        pth_models = glob.glob(os.path.join(upscale_path, "*.pth"))
        models = [os.path.basename(m) for m in pth_models]
    
    models.sort(key=str.lower)
    models.insert(0, "none")
    
    return models


def get_face_models() -> List[str]:
    """
    Detect saved face models (.safetensors files).
    
    Returns:
        List of face model filenames
    """
    face_path = get_face_models_path()
    
    safetensors = glob.glob(os.path.join(face_path, "*.safetensors"))
    models = [os.path.basename(m) for m in safetensors]
    
    models.sort(key=str.lower)
    models.insert(0, "none")
    
    return models


def get_sam_models(auto_download: bool = True) -> List[str]:
    """
    Detect available SAM models.
    Auto-downloads sam_vit_b (smallest) if none found.
    
    Returns:
        List of SAM model filenames
    """
    sams_path = os.path.join(get_models_dir(), "sams")
    os.makedirs(sams_path, exist_ok=True)
    
    # Scan for existing models
    pth_models = glob.glob(os.path.join(sams_path, "*.pth"))
    models = [os.path.basename(m) for m in pth_models]
    
    # Auto-download smallest SAM if none found
    if not models and auto_download:
        _log("No SAM models found. Auto-downloading sam_vit_b (375MB)...")
        model_name = "sam_vit_b_01ec64.pth"
        dest = os.path.join(sams_path, model_name)
        download_model(SAM_MODEL_URLS[model_name], dest, model_name)
        
        models = [model_name]
    
    models.sort(key=str.lower)
    models.insert(0, "none")
    
    return models

# ------------------------------------------------------------------------------
# Model Path Resolution
# ------------------------------------------------------------------------------

def get_swap_model_path(model_name: str) -> Optional[str]:
    """
    Get full path for a swap model by name.
    Searches across insightface, reswapper, hyperswap directories.
    """
    models_dir = get_models_dir()
    
    # Check each possible location
    search_paths = [
        os.path.join(models_dir, "insightface", model_name),
        os.path.join(models_dir, "insightface", "models", model_name),
        os.path.join(models_dir, "reswapper", model_name),
        os.path.join(models_dir, "hyperswap", model_name),
    ]
    
    for path in search_paths:
        if os.path.exists(path):
            return path
    
    _log(f"Swap model not found: {model_name}", level="ERROR")
    return None


def get_restore_model_path(model_name: str) -> Optional[str]:
    """Get full path for a restore model by name."""
    if model_name == "none":
        return None
    
    path = os.path.join(get_restore_models_path(), model_name)
    if os.path.exists(path):
        return path
    
    # Check via folder_paths
    try:
        return folder_paths.get_full_path("facerestore_models", model_name)
    except:
        pass
    
    _log(f"Restore model not found: {model_name}", level="ERROR")
    return None


def get_upscale_model_path(model_name: str) -> Optional[str]:
    """Get full path for an upscale model by name."""
    if model_name == "none":
        return None
    
    path = os.path.join(get_upscale_models_path(), model_name)
    if os.path.exists(path):
        return path
    
    # Check via folder_paths
    try:
        return folder_paths.get_full_path("upscale_models", model_name)
    except:
        pass
    
    _log(f"Upscale model not found: {model_name}", level="ERROR")
    return None


def get_sam_model_path(model_name: str) -> Optional[str]:
    """Get full path for a SAM model by name."""
    if model_name == "none":
        return None
    
    sams_path = os.path.join(get_models_dir(), "sams")
    path = os.path.join(sams_path, model_name)
    
    if os.path.exists(path):
        return path
    
    _log(f"SAM model not found: {model_name}", level="ERROR")
    return None


def get_face_model_path(model_name: str) -> Optional[str]:
    """Get full path for a saved face model by name."""
    if model_name == "none":
        return None
    
    path = os.path.join(get_face_models_path(), model_name)
    if os.path.exists(path):
        return path
    
    # Try without extension
    if not model_name.endswith(".safetensors"):
        path_with_ext = os.path.join(get_face_models_path(), f"{model_name}.safetensors")
        if os.path.exists(path_with_ext):
            return path_with_ext
    
    _log(f"Face model not found: {model_name}", level="ERROR")
    return None
