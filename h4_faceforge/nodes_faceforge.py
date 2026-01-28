# h4_faceforge/nodes_faceforge.py - AIO Face Swap Node
# ==============================================================================
# H4_FaceForge - All-In-One Face Swap, Restore, Boost, Upscale, SAM Occlusion
# ==============================================================================

import os
import sys
import numpy as np
from typing import List, Optional, Tuple, Dict, Any, Union
from PIL import Image
import cv2
import torch

from insightface.app.common import Face

import comfy.model_management as model_management
import comfy.utils
import folder_paths

from .utils import (
    _log,
    tensor_to_pil,
    batch_tensor_to_pil,
    pil_to_tensor,
    batched_pil_to_tensor,
    get_image_md5hash,
    progress_bar,
    progress_bar_reset,
)
from .models import (
    get_swap_models,
    get_restore_models,
    get_upscale_models,
    get_sam_models,
    get_swap_model_path,
    get_restore_model_path,
    get_upscale_model_path,
    get_sam_model_path,
)
from .nodes_utility import analyze_faces, get_face_analyzer
from .sfw_utils import check_image_safety

# ==============================================================================
# Global State & Caching
# ==============================================================================

# Cached models to avoid reloading
SWAP_MODEL_CACHE: Dict[str, Any] = {}
RESTORE_MODEL_CACHE: Dict[str, Any] = {}
UPSCALE_MODEL_CACHE: Dict[str, Any] = {}
SAM_MODEL_CACHE: Dict[str, Any] = {}

# Face caching for performance
SOURCE_FACES = None
SOURCE_IMAGE_HASH = None
TARGET_FACES = None
TARGET_IMAGE_HASH = None

# SFW Mode state (read from JS localStorage via endpoint)
# SFW_MODE_ENABLED = True  # Default to safe (moved to sfw_utils)

# ==============================================================================
# Helper Functions
# ==============================================================================

def soft_empty_cache():
    """Aggressive VRAM cleanup."""
    import gc
    gc.collect()
    try:
        torch.cuda.empty_cache()
        torch.cuda.ipc_collect()
    except:
        pass

def offload_model(model):
    """Move model to CPU to free VRAM."""
    try:
        if hasattr(model, "to"):
            model.to("cpu")
        elif hasattr(model, "model") and hasattr(model.model, "to"):
            model.model.to("cpu")
    except:
        pass

def get_swap_model(model_name: str):
    """
    Load and cache a face swap model.
    Supports InsightFace/ReSwapper/HyperSwap.
    """
    global SWAP_MODEL_CACHE
    
    if model_name == "none":
        return None
    
    if model_name in SWAP_MODEL_CACHE:
        return SWAP_MODEL_CACHE[model_name]
    
    model_path = get_swap_model_path(model_name)
    if model_path is None:
        return None
    
    try:
        # Determine model type and load appropriately
        # Prioritize GPU - onnxruntime-gpu is required for this
        if "cuda" in str(model_management.get_torch_device()):
            providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
        else:
            providers = ["CPUExecutionProvider"]

        _log(f"DEBUG: Initializing ONNX session with providers: {providers}")
        
        if "hyperswap" in model_name.lower():
            import onnxruntime as ort
            # Verify if CUDA is actually available in ORT
            available_providers = ort.get_available_providers()
            _log(f"DEBUG: ORT Available Providers: {available_providers}")
            
            model = ort.InferenceSession(model_path, providers=providers)
        else:
            # InsightFace or ReSwapper
            import insightface
            # InsightFace might swallow provider errors, so we check carefully
            model = insightface.model_zoo.get_model(model_path, providers=providers)
        
        SWAP_MODEL_CACHE[model_name] = model
        _log(f"Loaded swap model: {model_name}")
        return model
        
    except Exception as e:
        _log(f"Failed to load swap model {model_name}: {e}", level="ERROR")
        return None


def get_restore_model(model_name: str, device):
    """
    Load and cache a face restoration model.
    Supports GFPGAN, CodeFormer, GPEN.
    """
    global RESTORE_MODEL_CACHE
    
    if model_name == "none":
        return None
    
    cache_key = f"{model_name}_{device}"
    if cache_key in RESTORE_MODEL_CACHE:
        return RESTORE_MODEL_CACHE[cache_key]
    
    model_path = get_restore_model_path(model_name)
    if model_path is None:
        return None
    
    try:
        if "codeformer" in model_name.lower():
            # Import CodeFormer architecture
            from .restore_arch import ARCH_REGISTRY
            
            model = ARCH_REGISTRY.get("CodeFormer")(
                dim_embd=512,
                codebook_size=1024,
                n_head=8,
                n_layers=9,
                connect_list=["32", "64", "128", "256"],
            ).to(device)
            checkpoint = torch.load(model_path)["params_ema"]
            model.load_state_dict(checkpoint)
            model = model.eval()
            
        elif ".onnx" in model_name.lower():
            # ONNX model (GPEN)
            import onnxruntime as ort
            providers = ["CUDAExecutionProvider"] if torch.cuda.is_available() else ["CPUExecutionProvider"]
            model = ort.InferenceSession(model_path, providers=providers)
            
        else:
            # GFPGAN or similar .pth model
            sd = comfy.utils.load_torch_file(model_path, safe_load=True)
            # Try to use chainner model loading if available
            try:
                from .restore_chain import model_loading
                model = model_loading.load_state_dict(sd).eval()
            except:
                # Fallback: try direct state dict load
                _log(f"Using fallback model loading for {model_name}", level="WARNING")
                model = None
            
            if model is not None:
                model.to(device)
        
        RESTORE_MODEL_CACHE[cache_key] = model
        _log(f"Loaded restore model: {model_name}")
        return model
        
    except Exception as e:
        _log(f"Failed to load restore model {model_name}: {e}", level="ERROR")
        return None


def get_upscaler(model_name: str, device):
    """
    Load and cache an upscale model.
    """
    global UPSCALE_MODEL_CACHE
    
    if model_name == "none":
        return None
    
    cache_key = f"{model_name}_{device}"
    if cache_key in UPSCALE_MODEL_CACHE:
        return UPSCALE_MODEL_CACHE[cache_key]
    
    model_path = get_upscale_model_path(model_name)
    if model_path is None:
        return None
    
    try:
        # Load via comfy utils
        sd = comfy.utils.load_torch_file(model_path, safe_load=True)
        
        # Try to use built-in upscaler loading
        try:
            from comfy_extras.chainner_models import model_loading as comfy_model_loading
            model = comfy_model_loading.load_state_dict(sd).eval()
            model.to(device)
        except ImportError:
            _log(f"Upscaler loading fallback for {model_name}", level="WARNING")
            model = None
        
        if model is not None:
            UPSCALE_MODEL_CACHE[cache_key] = model
            _log(f"Loaded upscale model: {model_name}")
        
        return model
        
    except Exception as e:
        _log(f"Failed to load upscale model {model_name}: {e}", level="ERROR")
        return None


def sort_faces_by_order(faces: List[Face], order: str) -> List[Face]:
    """
    Sort detected faces by the specified order.
    """
    if order == "left-right":
        return sorted(faces, key=lambda x: x.bbox[0])
    elif order == "right-left":
        return sorted(faces, key=lambda x: x.bbox[0], reverse=True)
    elif order == "top-bottom":
        return sorted(faces, key=lambda x: x.bbox[1])
    elif order == "bottom-top":
        return sorted(faces, key=lambda x: x.bbox[1], reverse=True)
    elif order == "small-large":
        return sorted(faces, key=lambda x: (x.bbox[2] - x.bbox[0]) * (x.bbox[3] - x.bbox[1]))
    else:  # "large-small" (default)
        return sorted(faces, key=lambda x: (x.bbox[2] - x.bbox[0]) * (x.bbox[3] - x.bbox[1]), reverse=True)


def parse_face_indices(index_string: str) -> List[int]:
    """
    Parse a comma-separated string of face indices.
    Example: "0,1,2" -> [0, 1, 2]
    """
    indices = []
    for part in index_string.split(","):
        part = part.strip()
        if part.isdigit():
            indices.append(int(part))
    return indices if indices else [0]


# ==============================================================================
# H4_FaceForge - AIO Node
# ==============================================================================

class H4_FaceForge:
    """
    All-In-One Face Swap Node.
    
    Combines face swapping, restoration, boosting, upscaling, and 
    SAM-based occlusion handling into a single configurable node.
    
    All features are toggleable - at least one must be enabled to run.
    """
    
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "input_image": ("IMAGE",),
                
                # === Swap Settings ===
                "swap_enabled": ("BOOLEAN", {"default": True, "label_off": "OFF", "label_on": "ON"}),
                "swap_model": (get_swap_models(),),
                "target_face_index": ("STRING", {"default": "0", "multiline": False}),
                "source_face_index": ("STRING", {"default": "0", "multiline": False}),
                "face_selection_mode": (["large-small", "left-right", "right-left", "top-bottom", "small-large"],),
                
                # === Restore Settings ===
                "restore_enabled": ("BOOLEAN", {"default": True, "label_off": "OFF", "label_on": "ON"}),
                "restore_model": (get_restore_models(),),
                "restore_visibility": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 1.0, "step": 0.05}),
                "codeformer_weight": ("FLOAT", {"default": 0.5, "min": 0.0, "max": 1.0, "step": 0.05}),
                
                # === Boost Settings ===
                "boost_enabled": ("BOOLEAN", {"default": False, "label_off": "OFF", "label_on": "ON"}),
                
                # === Upscale Settings ===
                "upscale_enabled": ("BOOLEAN", {"default": False, "label_off": "OFF", "label_on": "ON"}),
                "upscale_model": (get_upscale_models(),),
                "upscale_face_only": ("BOOLEAN", {"default": False, "label_off": "Full Image", "label_on": "Face Only"}),
                
                # === Occlusion (SAM) Settings ===
                "occlusion_enabled": ("BOOLEAN", {"default": False, "label_off": "OFF", "label_on": "ON", 
                    "tooltip": "⚠️ SAM is VRAM hungry! Disable if running low on memory."}),
                "preserve_glasses": ("BOOLEAN", {"default": True}),
                "preserve_hair": ("BOOLEAN", {"default": True}),
            },
            "optional": {
                "source_image": ("IMAGE",),
                "face_model": ("FACE_MODEL",),
                "sam_model": (get_sam_models(),),
            }
        }
    
    RETURN_TYPES = ("IMAGE", "FACE_MODEL", "IMAGE")
    RETURN_NAMES = ("SWAPPED_IMAGE", "FACE_MODEL", "ORIGINAL_IMAGE")
    FUNCTION = "execute"
    CATEGORY = "h4_Live/FaceForge"
    
    def __init__(self):
        self.last_swapped_bboxes = None
    
    # ==========================================================================
    # Core Pipeline
    # ==========================================================================
    
    def execute(
        self,
        input_image: torch.Tensor,
        swap_enabled: bool,
        swap_model: str,
        target_face_index: str,
        source_face_index: str,
        face_selection_mode: str,
        restore_enabled: bool,
        restore_model: str,
        restore_visibility: float,
        codeformer_weight: float,
        boost_enabled: bool,
        upscale_enabled: bool,
        upscale_model: str,
        upscale_face_only: bool,
        occlusion_enabled: bool,
        preserve_glasses: bool,
        preserve_hair: bool,
        source_image: Optional[torch.Tensor] = None,
        face_model: Optional[Face] = None,
        sam_model: str = "none",
    ):
        """
        Main execution pipeline.
        
        Flow:
        1. Validate inputs (at least one feature enabled)
        2. Detect faces
        3. [Optional] SAM occlusion mask extraction
        4. [Optional] Face swap
        5. [Optional] Face boost (during swap)
        6. [Optional] Composite preserved regions (if SAM)
        7. [Optional] Face restore
        8. [Optional] Upscale
        9. Return results
        """
        
        # === Validation ===
        # 0. SFW Check (The Boobies Switch)
        is_safe = check_image_safety(input_image)
        _log(f"DEBUG: SFW Check Result: {'SAFE' if is_safe else 'NSFW'}")
        
        if not is_safe:
            _log("SFW Block Active: Content flagged as NSFW.", level="WARNING")
            return (input_image, face_model, input_image)
            
        if not any([swap_enabled, restore_enabled, boost_enabled, upscale_enabled]):
            _log("At least one feature must be enabled!", level="ERROR")
            return (input_image, None, input_image)
        
        if swap_enabled and source_image is None and face_model is None:
            _log("Swap enabled but no source_image or face_model provided!", level="ERROR")
            return (input_image, None, input_image)
        
        device = model_management.get_torch_device()
        original_image = input_image.clone()
        result = input_image
        output_face_model = face_model
        
        # Convert to PIL for processing
        pil_images = batch_tensor_to_pil(input_image)
        
        _log(f"Processing {len(pil_images)} image(s)...")
        _log(f"  Swap: {swap_enabled} | Restore: {restore_enabled} | Boost: {boost_enabled}")
        _log(f"  Upscale: {upscale_enabled} | SAM Occlusion: {occlusion_enabled}")
        
        # === Face Detection ===
        target_indices = parse_face_indices(target_face_index)
        source_indices = parse_face_indices(source_face_index)
        
        _log(f"DEBUG: Target Indices: {target_indices}")
        _log(f"DEBUG: Source Indices: {source_indices}")
        
        # Get source face
        source_face = None
        if swap_enabled:
            _log("DEBUG: Swap Enabled. Resolving Source Face...")
            if face_model is not None:
                source_face = face_model
                _log("DEBUG: Using provided Face Model as source.")
            elif source_image is not None:
                _log("DEBUG: Analyzing Source Image for faces...")
                source_pil = tensor_to_pil(source_image)
                source_bgr = cv2.cvtColor(np.array(source_pil), cv2.COLOR_RGB2BGR)
                source_faces = analyze_faces(source_bgr)
                if source_faces:
                    sorted_source = sort_faces_by_order(source_faces, face_selection_mode)
                    # Safe index access
                    idx = min(source_indices[0], len(sorted_source) - 1)
                    source_face = sorted_source[idx]
                    output_face_model = source_face
                    _log(f"DEBUG: Detected {len(source_faces)} source face(s). Using face #{idx}")
                else:
                    _log(f"❌ ERROR: NO FACES detected in source image!", level="ERROR")
                    return (input_image, None, input_image)
            else:
                _log("❌ ERROR: Swap enabled but no Source Image OR Face Model!", level="ERROR")
                return (input_image, None, input_image)
        else:
             _log("DEBUG: Swap is DISABLED.")
        
        # === Process Each Image ===
        result_images = []
        pbar = progress_bar(len(pil_images))
        
        for img_idx, pil_img in enumerate(pil_images):
            current_result = pil_img
            
            # Convert to BGR for processing
            img_bgr = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
            # Detect target faces
            target_faces = analyze_faces(img_bgr)
            if not target_faces:
                _log(f"DEBUG: Image {img_idx}: No target faces detected. Skipping.", level="WARNING")
                result_images.append(pil_img)
                pbar.update(1)
                continue
            
            _log(f"DEBUG: Image {img_idx}: Found {len(target_faces)} target face(s).")
            sorted_targets = sort_faces_by_order(target_faces, face_selection_mode)
            
            # === SAM Occlusion Masks ===
            occlusion_masks = {}
            if occlusion_enabled and sam_model != "none":
                occlusion_masks = self._extract_occlusion_masks(
                    img_bgr, 
                    sorted_targets, 
                    sam_model,
                    preserve_glasses,
                    preserve_hair
                )
                # Cleanup SAM immediately
                soft_empty_cache()
            
            # === Face Swap ===
            if swap_enabled and source_face is not None:
                swapper = get_swap_model(swap_model)
                if swapper is not None:
                    for face_idx in target_indices:
                        if face_idx >= len(sorted_targets):
                            continue
                        
                        target_face = sorted_targets[face_idx]
                        
                        try:
                            if "hyperswap" in swap_model.lower():
                                # HyperSwap uses different interface
                                img_bgr = self._hyperswap(swapper, source_face, target_face, img_bgr)
                            else:
                                # InsightFace/ReSwapper
                                if boost_enabled:
                                    # Face boost during swap
                                    img_bgr = self._boosted_swap(swapper, source_face, target_face, img_bgr,
                                                                  restore_model, restore_visibility, codeformer_weight, device)
                                else:
                                    img_bgr = swapper.get(img_bgr, target_face, source_face)
                            
                            self.last_swapped_bboxes = [target_face.bbox]
                            _log(f"Image {img_idx}: Swapped face {face_idx}")
                            
                        except Exception as e:
                            _log(f"Swap failed for face {face_idx}: {e}", level="ERROR")
                    
                    # FORCE CLEANUP: Flush VRAM after swap to allow Upscale to run
                    try:
                        offload_model(swapper)
                        if swap_model in SWAP_MODEL_CACHE:
                            del SWAP_MODEL_CACHE[swap_model]
                    except:
                        pass
                    
                    soft_empty_cache()

            # === Composite Occlusion Regions ===
            if occlusion_enabled and occlusion_masks:
                original_bgr = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
                img_bgr = self._composite_occlusions(img_bgr, original_bgr, occlusion_masks)
            
            # === Face Restore (if not already done via boost) ===
            if restore_enabled and not (swap_enabled and boost_enabled):
                img_bgr = self._restore_faces(
                    img_bgr, 
                    restore_model, 
                    restore_visibility, 
                    codeformer_weight,
                    device
                )
                soft_empty_cache()
            
            # === Upscale ===
            if upscale_enabled and upscale_model != "none":
                soft_empty_cache() # Flush before heavy lift
                try:
                    _log(f"Upscaling with {upscale_model}...")
                    if upscale_face_only:
                        img_bgr = self._upscale_faces_only(img_bgr, upscale_model, device)
                    else:
                        img_bgr = self._upscale_full(img_bgr, upscale_model, device)
                except Exception as e:
                    _log(f"Upscale failed: {e}. Returning non-upscaled result.", level="ERROR")
                    # We catch the error so we can still return the swapped/restored result
                    # instead of crashing the whole workflow
                finally:
                    soft_empty_cache()
            
            # Convert back to RGB PIL
            result_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
            result_images.append(Image.fromarray(result_rgb))
            
            pbar.update(1)
        
        progress_bar_reset(pbar)
        
        # Final cleanup
        soft_empty_cache()
        
        # Convert back to tensor
        result = batched_pil_to_tensor(result_images)
        
        _log("Processing complete!")
        
        return (result, output_face_model, original_image)
    
    # ==========================================================================
    # Sub-Pipeline Methods
    # ==========================================================================
    
    def _hyperswap(self, session, source_face: Face, target_face: Face, img_bgr: np.ndarray) -> np.ndarray:
        """
        Perform face swap using HyperSwap model.
        """
        # Get landmarks
        target_kps = target_face.kps if target_face.kps is not None else target_face.landmark_2d_106[:5] if hasattr(target_face, 'landmark_2d_106') else None
        
        if target_kps is None:
            _log("HyperSwap: No landmarks available", level="ERROR")
            return img_bgr
        
        # Standard 256x256 alignment points
        std_landmarks = np.array([
            [84.87, 105.94], [171.13, 105.94], [128.00, 146.66],
            [96.95, 188.64], [159.05, 188.64]
        ], dtype=np.float32)
        
        # Compute affine transform
        M, _ = cv2.estimateAffinePartial2D(target_kps.astype(np.float32), std_landmarks)
        
        # Warp target region
        crop = cv2.warpAffine(img_bgr, M, (256, 256), flags=cv2.INTER_CUBIC)
        
        # Prepare input
        crop_input = crop[:, :, ::-1].astype(np.float32) / 255.0
        crop_input = (crop_input - 0.5) / 0.5
        crop_input = crop_input.transpose(2, 0, 1)[np.newaxis, ...].astype(np.float32)
        
        source_embedding = source_face.normed_embedding.reshape(1, -1).astype(np.float32)
        
        try:
            output = session.run(None, {'source': source_embedding, 'target': crop_input})[0][0]
            output = (output * 0.5 + 0.5) * 255.0
            output = np.clip(output, 0, 255).astype(np.uint8)
            output = output.transpose(1, 2, 0)[:, :, ::-1]
            
            # Paste back with gradient mask
            _log(f"DEBUG: Pasting back face with shape {output.shape} using Matrix {M.shape}")
            img_bgr = self._paste_back_gradient(img_bgr, output, M, 256)
            _log("DEBUG: Paste back complete.")
            
        except Exception as e:
            _log(f"HyperSwap inference failed: {e}", level="ERROR")
        
        return img_bgr
    
    def _paste_back_gradient(self, target_img: np.ndarray, face: np.ndarray, M: np.ndarray, size: int) -> np.ndarray:
        """
        Paste a swapped face back using gradient blending.
        """
        h, w = target_img.shape[:2]
        
        # Create gradient mask
        mask = np.zeros((size, size), dtype=np.float32)
        center = (size // 2, size // 2)
        axes = (int(size * 0.35), int(size * 0.4))
        cv2.ellipse(mask, center, axes, 0, 0, 360, 1.0, -1)
        mask = cv2.GaussianBlur(mask, (15, 15), 0)
        mask_3c = np.stack([mask] * 3, axis=2)
        
        # Inverse warp
        inv_face = cv2.warpAffine(face.astype(np.float32), M, (w, h),
                                   flags=cv2.INTER_LANCZOS4 | cv2.WARP_INVERSE_MAP)
        inv_mask = cv2.warpAffine(mask_3c, M, (w, h),
                                   flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP)
        inv_mask = np.clip(inv_mask, 0, 1)
        
        # Blend
        result = target_img.astype(np.float32) * (1 - inv_mask) + inv_face * inv_mask
        return np.clip(result, 0, 255).astype(np.uint8)
    
    def _boosted_swap(self, swapper, source_face: Face, target_face: Face, img_bgr: np.ndarray,
                      restore_model: str, visibility: float, cf_weight: float, device) -> np.ndarray:
        """
        Perform face swap with integrated face boost.
        """
        # Get swapped face without paste-back
        try:
            # Try to get crop without paste_back
            # InsightFace swapper.get returns (bgr_face, M) if paste_back=False
            res = swapper.get(img_bgr, target_face, source_face, paste_back=False)
            if isinstance(res, tuple):
                 bgr_fake, M = res
            else:
                 # Some versions might return just the face? Unlikely but possible.
                 _log("Swapper returned unexpected format. Fallback to default swap.", level="WARNING")
                 return swapper.get(img_bgr, target_face, source_face)

        except TypeError:
            # Fallback if model doesn't support paste_back=False (older insightface?)
            _log("Swapper does not support paste_back=False. Skipping boost.", level="WARNING")
            return swapper.get(img_bgr, target_face, source_face)
        except Exception as e:
             _log(f"Boosted swap preparation failed: {e}", level="ERROR")
             return img_bgr
        
        # Restore the swapped face
        if restore_model != "none":
            restorer = get_restore_model(restore_model, device)
            if restorer is not None:
                bgr_fake = self._restore_single_face(bgr_fake, restorer, visibility, cf_weight, restore_model, device)
        
        # Paste back
        return self._paste_back_gradient(img_bgr, bgr_fake, M, bgr_fake.shape[0])
    
    def _restore_faces(self, img_bgr: np.ndarray, model_name: str, visibility: float, 
                       cf_weight: float, device) -> np.ndarray:
        """
        Apply face restoration to all detected faces.
        """
        if model_name == "none":
            return img_bgr
        
        restorer = get_restore_model(model_name, device)
        if restorer is None:
            return img_bgr
        
        # Use FaceRestoreHelper for proper alignment
        try:
            from .restore_helper import FaceRestoreHelper
            
            face_helper = FaceRestoreHelper(
                1, face_size=512, crop_ratio=(1, 1),
                det_model='retinaface_resnet50',
                save_ext='png', use_parse=True, device=device
            )
            
            face_helper.clean_all()
            face_helper.read_image(img_bgr)
            face_helper.get_face_landmarks_5(only_center_face=False, resize=640, eye_dist_threshold=5)
            face_helper.align_warp_face()
            
            for cropped_face in face_helper.cropped_faces:
                restored = self._restore_single_face(cropped_face, restorer, visibility, cf_weight, model_name, device)
                if visibility < 1:
                    restored = cropped_face * (1 - visibility) + restored * visibility
                face_helper.add_restored_face(restored.astype(np.uint8))
            
            face_helper.get_inverse_affine(None)
            img_bgr = face_helper.paste_faces_to_input_image()
            face_helper.clean_all()
            
        except ImportError:
            _log("FaceRestoreHelper not available, skipping restore", level="WARNING")
        except Exception as e:
            _log(f"Face restore failed: {e}", level="ERROR")
        
        return img_bgr
    
    def _restore_single_face(self, face_bgr: np.ndarray, restorer, visibility: float,
                             cf_weight: float, model_name: str, device) -> np.ndarray:
        """
        Restore a single cropped face image.
        """
        # Prepare input
        from torchvision.transforms.functional import normalize
        
        face_t = torch.from_numpy(face_bgr[:, :, ::-1].copy()).float() / 255.0
        face_t = face_t.permute(2, 0, 1).unsqueeze(0)
        normalize(face_t, (0.5, 0.5, 0.5), (0.5, 0.5, 0.5), inplace=True)
        face_t = face_t.to(device)
        
        try:
            with torch.no_grad():
                if "codeformer" in model_name.lower():
                    output = restorer(face_t, w=cf_weight)[0]
                else:
                    output = restorer(face_t)[0]
            
            # Convert back
            output = output.squeeze(0).permute(1, 2, 0).cpu().numpy()
            output = (output * 0.5 + 0.5) * 255.0
            output = np.clip(output, 0, 255).astype(np.uint8)
            output = output[:, :, ::-1]  # RGB to BGR
            
            return output
            
        except Exception as e:
            _log(f"Single face restore failed: {e}", level="ERROR")
            return face_bgr
    
    def _upscale_full(self, img_bgr: np.ndarray, model_name: str, device) -> np.ndarray:
        """
        Upscale the full image.
        """
        upscaler = get_upscaler(model_name, device)
        if upscaler is None:
            return img_bgr
        
        try:
            # Convert to tensor
            img_t = torch.from_numpy(img_bgr[:, :, ::-1].copy()).float() / 255.0
            img_t = img_t.permute(2, 0, 1).unsqueeze(0).to(device)
            
            with torch.no_grad():
                output = upscaler(img_t)
            
            output = output.squeeze(0).permute(1, 2, 0).cpu().numpy()
            output = (output * 255.0).clip(0, 255).astype(np.uint8)
            output = output[:, :, ::-1]  # RGB to BGR
            
            _log(f"Upscaled from {img_bgr.shape[:2]} to {output.shape[:2]}")
            return output
            
        except Exception as e:
            _log(f"Upscale failed: {e}", level="ERROR")
            return img_bgr
    
    def _upscale_faces_only(self, img_bgr: np.ndarray, model_name: str, device) -> np.ndarray:
        """
        Upscale only the face regions.
        """
        # Detect faces
        faces = analyze_faces(img_bgr)
        if not faces:
            _log("No faces found for face-only upscale", level="WARNING")
            return img_bgr
        
        upscaler = get_upscaler(model_name, device)
        if upscaler is None:
            return img_bgr
        
        result = img_bgr.copy()
        
        for face in faces:
            x1, y1, x2, y2 = map(int, face.bbox)
            
            # Add padding
            pad = int((x2 - x1) * 0.1)
            x1 = max(0, x1 - pad)
            y1 = max(0, y1 - pad)
            x2 = min(img_bgr.shape[1], x2 + pad)
            y2 = min(img_bgr.shape[0], y2 + pad)
            
            face_crop = img_bgr[y1:y2, x1:x2]
            
            try:
                # Upscale
                face_t = torch.from_numpy(face_crop[:, :, ::-1].copy()).float() / 255.0
                face_t = face_t.permute(2, 0, 1).unsqueeze(0).to(device)
                
                with torch.no_grad():
                    upscaled = upscaler(face_t)
                
                upscaled = upscaled.squeeze(0).permute(1, 2, 0).cpu().numpy()
                upscaled = (upscaled * 255.0).clip(0, 255).astype(np.uint8)
                upscaled = upscaled[:, :, ::-1]
                
                # Resize back to original face size and paste
                upscaled = cv2.resize(upscaled, (x2 - x1, y2 - y1), interpolation=cv2.INTER_LANCZOS4)
                result[y1:y2, x1:x2] = upscaled
                
            except Exception as e:
                _log(f"Face upscale failed: {e}", level="ERROR")
        
        return result
    
    def _extract_occlusion_masks(self, img_bgr: np.ndarray, faces: List[Face], 
                                  sam_model: str, glasses: bool, hair: bool) -> Dict:
        """
        Extract occlusion masks using SAM.
        Returns masks for glasses, hair, etc.
        """
        masks = {}
        
        sam_path = get_sam_model_path(sam_model)
        if sam_path is None:
            return masks
        
        try:
            from segment_anything import sam_model_registry, SamPredictor
            
            # Determine SAM model type from filename
            if "vit_b" in sam_model:
                model_type = "vit_b"
            elif "vit_l" in sam_model:
                model_type = "vit_l"
            else:
                model_type = "vit_h"
            
            device = model_management.get_torch_device()
            sam = sam_model_registry[model_type](checkpoint=sam_path)
            sam.to(device)
            predictor = SamPredictor(sam)
            
            img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
            predictor.set_image(img_rgb)
            
            for i, face in enumerate(faces):
                bbox = face.bbox
                
                # Use face bbox to prompt SAM
                input_box = np.array([bbox[0], bbox[1], bbox[2], bbox[3]])
                
                mask, _, _ = predictor.predict(
                    box=input_box,
                    multimask_output=False
                )
                
                masks[f"face_{i}"] = mask[0]
            
            _log(f"Extracted {len(masks)} occlusion masks")
            
        except ImportError:
            _log("segment_anything not installed, skipping SAM", level="WARNING")
        except Exception as e:
            _log(f"SAM mask extraction failed: {e}", level="ERROR")
        
        return masks
    
    def _composite_occlusions(self, swapped_bgr: np.ndarray, original_bgr: np.ndarray, 
                               masks: Dict) -> np.ndarray:
        """
        Composite preserved occlusion regions onto swapped image.
        """
        result = swapped_bgr.copy()
        
        for name, mask in masks.items():
            # Invert mask to get occlusion regions
            occlusion_mask = 1 - mask.astype(np.float32)
            occlusion_mask = cv2.GaussianBlur(occlusion_mask, (5, 5), 0)
            occlusion_mask = np.stack([occlusion_mask] * 3, axis=2)
            
            # Blend original occlusions onto swapped face
            result = result * (1 - occlusion_mask) + original_bgr * occlusion_mask
        
        return result.astype(np.uint8)


# ==============================================================================
# Node Exports
# ==============================================================================
__all__ = ["H4_FaceForge"]
