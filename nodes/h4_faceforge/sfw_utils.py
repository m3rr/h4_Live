# h4_faceforge/sfw_utils.py - SFW Enforcement Logic
# ==============================================================================
# "The Boobies Switch" - Logic & State
# ==============================================================================

import os
import logging
from typing import Union, Tuple
from PIL import Image
import numpy as np
import torch
import comfy.model_management as model_management

from .utils import _log, download_model, get_models_dir, tensor_to_pil

# ==============================================================================
# State Management
# ==============================================================================

import json

# Default to "Safe" (Filtering ON)
# Can be toggled via API or JS
SFW_STATE = {"enabled": True}
CONFIG_FILE = os.path.join(os.path.dirname(__file__), "sfw_config.json")

def load_state():
    """Load SFW state from disk."""
    global SFW_STATE
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                data = json.load(f)
                if "enabled" in data:
                    SFW_STATE["enabled"] = data["enabled"]
                    _log(f"SFW State Loaded: {'SAFE' if SFW_STATE['enabled'] else 'NSFW ALLOWED'}")
        except Exception as e:
            _log(f"Failed to load SFW config: {e}", level="WARNING")

def save_state():
    """Save SFW state to disk."""
    try:
        with open(CONFIG_FILE, 'w') as f:
            json.dump(SFW_STATE, f)
    except Exception as e:
        _log(f"Failed to save SFW config: {e}", level="ERROR")

# Load state on module import
load_state()

def is_sfw_enabled() -> bool:
    """Check if SFW filtering is active."""
    return SFW_STATE["enabled"]

def set_sfw_state(enabled: bool):
    """Set SFW filtering state."""
    SFW_STATE["enabled"] = enabled
    save_state() # Persist change
    if not enabled:
       _log("Boobies Activated (Filter DISABLED)", level="INFO")
    else:
       _log("Boobies Deactivated (Filter ENABLED)", level="INFO")

# ==============================================================================
# Model Management
# ==============================================================================

NSFW_MODEL_URLS = [
    "https://huggingface.co/AdamCodd/vit-base-nsfw-detector/resolve/main/config.json",
    "https://huggingface.co/AdamCodd/vit-base-nsfw-detector/resolve/main/model.safetensors",
    "https://huggingface.co/AdamCodd/vit-base-nsfw-detector/resolve/main/preprocessor_config.json",
]

def get_nsfw_model_path() -> str:
    """Get path to NSFW detection model, creating if needed."""
    path = os.path.join(get_models_dir(), "nsfw_detector")
    os.makedirs(path, exist_ok=True)
    return path

def ensure_nsfw_model() -> bool:
    """
    Ensure NSFW detection model files are present.
    Auto-downloads if missing.
    """
    model_dir = get_nsfw_model_path()
    success_count = 0
    
    for url in NSFW_MODEL_URLS:
        filename = os.path.basename(url)
        dest = os.path.join(model_dir, filename)
        
        if os.path.exists(dest):
            success_count += 1
            continue
            
        if download_model(url, dest, f"NSFW Detector ({filename})"):
            success_count += 1
            
    return success_count == len(NSFW_MODEL_URLS)

# ==============================================================================
# Detection Logic
# ==============================================================================

# Threshold for blocking content (0.0 to 1.0)
# Higher = stricter (blocks less), Lower = looser (blocks more? wait)
# High score = High confidence it IS NSFW.
# So score > 0.9 means "I am 90% sure this is naked".
NSFW_THRESHOLD = 0.90

def check_image_safety(image: Union[Image.Image, torch.Tensor, np.ndarray]) -> bool:
    """
    Check if an image is safe for work.
    
    Args:
        image: PIL Image, Tensor, or Numpy Array
        
    Returns:
        True if SAFE, False if NSFW
    """
    # 0. If SFW mode is disabled, everything is safe
    if not is_sfw_enabled():
        return True
    
    # 1. Prepare Image
    if isinstance(image, torch.Tensor):
        pil_img = tensor_to_pil(image)
    elif isinstance(image, np.ndarray):
        pil_img = Image.fromarray(image)
    else:
        pil_img = image
        
    # 2. Ensure Model
    if not ensure_nsfw_model():
        _log("Failed to load NSFW detector models. Blocking by default for safety.", level="WARNING")
        return False
    
    # 3. Predict
    model_path = get_nsfw_model_path()
    device = model_management.get_torch_device()
    
    try:
        from transformers import pipeline
        
        # Determine device ID for pipeline (-1 = CPU, 0+ = GPU)
        device_id = -1
        if "cuda" in str(device):
            # Extract simple index if possible, or default to 0
            try:
                parts = str(device).split(":")
                if len(parts) > 1:
                    device_id = int(parts[1])
                else:
                    device_id = 0
            except:
                device_id = 0
        
        # Suppress huggingface logs
        logging.getLogger("transformers").setLevel(logging.ERROR)
        
        classifier = pipeline("image-classification", model=model_path, device=device_id)
        result = classifier(pil_img)
        
        # Result is list of dicts: [{'label': 'nsfw', 'score': 0.99}, {'label': 'sfw', ...}]
        # Check primary label
        top_result = result[0]
        label = top_result['label']
        score = top_result['score']
        
        if label == "nsfw" and score > NSFW_THRESHOLD:
            _log(f"NSFW content detected (Score: {score:.2f}). Censoring.", level="WARNING")
            return False
            
        return True
        
    except Exception as e:
        _log(f"NSFW detection failed: {e}. Blocking for safety.", level="ERROR")
        return False
