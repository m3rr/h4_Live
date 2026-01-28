# h4_faceforge/nodes_utility.py - Face Model Utility Nodes
# ==============================================================================
# H4_LoadFaceModel, H4_BuildFaceModel, H4_SaveFaceModel
# ==============================================================================

import os
import numpy as np
from typing import List, Optional, Tuple, Any
from PIL import Image
import cv2
import torch

from safetensors.torch import save_file, safe_open
from insightface.app.common import Face

from .utils import (
    _log,
    tensor_to_pil,
    batch_tensor_to_pil,
    get_face_models_path,
    progress_bar,
    progress_bar_reset,
)
from .models import get_face_models, get_face_model_path

# We'll lazy import insightface to avoid startup issues
FACE_ANALYZER = None

def get_face_analyzer(det_size: Tuple[int, int] = (640, 640)):
    """
    Lazy-load the InsightFace analyzer.
    Caches the instance for reuse.
    """
    global FACE_ANALYZER
    
    if FACE_ANALYZER is None:
        import insightface
        import folder_paths
        
        # Determine providers based on available hardware
        try:
            if torch.cuda.is_available():
                providers = ["CUDAExecutionProvider"]
            else:
                providers = ["CPUExecutionProvider"]
        except:
            providers = ["CPUExecutionProvider"]
        
        models_dir = folder_paths.models_dir
        insightface_path = os.path.join(models_dir, "insightface")
        
        FACE_ANALYZER = insightface.app.FaceAnalysis(
            name="buffalo_l",
            providers=providers,
            root=insightface_path
        )
    
    FACE_ANALYZER.prepare(ctx_id=0, det_size=det_size)
    return FACE_ANALYZER


def analyze_faces(img_data: np.ndarray, det_size: Tuple[int, int] = (640, 640)) -> List[Face]:
    """
    Detect and analyze faces in an image.
    
    Args:
        img_data: BGR numpy array
        det_size: Detection size tuple
        
    Returns:
        List of Face objects
    """
    analyzer = get_face_analyzer(det_size)
    
    try:
        faces = analyzer.get(img_data)
    except Exception as e:
        _log(f"Face analysis error: {e}", level="ERROR")
        faces = []
    
    # Try smaller det_size if no faces found
    if len(faces) == 0 and det_size[0] > 320:
        half_size = (det_size[0] // 2, det_size[1] // 2)
        _log(f"No faces found, retrying with det_size={half_size}")
        return analyze_faces(img_data, half_size)
    
    return faces


# ==============================================================================
# H4_LoadFaceModel
# ==============================================================================
class H4_LoadFaceModel:
    """
    Load a saved face model from disk.
    
    Loads .safetensors face embedding files created by H4_SaveFaceModel.
    These can be used as source faces in H4_FaceForge without needing
    a source image.
    """
    
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "face_model": (get_face_models(),),
            }
        }
    
    RETURN_TYPES = ("FACE_MODEL", "STRING")
    RETURN_NAMES = ("FACE_MODEL", "FACE_MODEL_NAME")
    FUNCTION = "load_model"
    CATEGORY = "h4_Live/FaceForge"
    
    def load_model(self, face_model: str):
        """
        Load a face model from .safetensors file.
        
        Returns:
            Tuple of (Face object or None, model name string)
        """
        if face_model == "none":
            return (None, "none")
        
        model_path = get_face_model_path(face_model)
        if model_path is None:
            _log(f"Face model not found: {face_model}", level="ERROR")
            return (None, face_model)
        
        try:
            # Load from safetensors
            with safe_open(model_path, framework="pt") as f:
                embedding = f.get_tensor("embedding").numpy()
                bbox = f.get_tensor("bbox").numpy() if "bbox" in f.keys() else np.array([0, 0, 512, 512])
                kps = f.get_tensor("kps").numpy() if "kps" in f.keys() else None
                det_score = f.get_tensor("det_score").item() if "det_score" in f.keys() else 1.0
                
                # Check for NaNs or empty embedding
                if embedding is None or embedding.size == 0 or np.isnan(embedding).any():
                    _log(f"Invalid embedding in model: {face_model}", level="ERROR")
                    return (None, face_model)
                
                # Normalize the embedding to unit length (InsightFace requirment)
                norm = np.linalg.norm(embedding)
                if norm > 0:
                    embedding = embedding / norm

                # Reconstruct Face object
                face = Face(
                    bbox=bbox,
                    kps=kps,
                    det_score=det_score,
                    embedding=embedding
                )
                
                # Add optional attributes if they exist
                if "landmark_3d_68" in f.keys():
                    face.landmark_3d_68 = f.get_tensor("landmark_3d_68").numpy()
                if "landmark_2d_106" in f.keys():
                    face.landmark_2d_106 = f.get_tensor("landmark_2d_106").numpy()
                if "pose" in f.keys():
                    face.pose = f.get_tensor("pose").numpy()
                if "gender" in f.keys():
                    face.gender = int(f.get_tensor("gender").item())
                if "age" in f.keys():
                    face.age = int(f.get_tensor("age").item())
            
            # Clean model name for display
            display_name = face_model.replace(".safetensors", "")
            _log(f"Loaded face model: {display_name} (Norm: {np.linalg.norm(face.normed_embedding):.2f})")
            
            return (face, display_name)
            
        except Exception as e:
            _log(f"Failed to load face model: {e}", level="ERROR")
            return (None, face_model)


# ==============================================================================
# H4_BuildFaceModel
# ==============================================================================
class H4_BuildFaceModel:
    """
    Build a face model from one or more images.
    
    Accepts a batch of images (e.g., 10 photos of the same person from 
    different angles) and combines their face embeddings into a single
    high-quality face model using the selected compute method.
    
    More images = better quality face model that generalizes better.
    """
    
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "compute_method": (["Mean", "Median", "Mode"], {"default": "Mean"}),
            },
            "optional": {
                "images": ("IMAGE",),
                "folder_path": ("STRING", {"default": "", "multiline": False}),
                "det_size": (["640x640", "320x320"], {"default": "640x640"}),
            }
        }
    
    RETURN_TYPES = ("FACE_MODEL",)
    RETURN_NAMES = ("FACE_MODEL",)
    FUNCTION = "build_model"
    CATEGORY = "h4_Live/FaceForge"
    
    def build_all_faces(self, image: Image.Image, det_size: Tuple[int, int]) -> List[Face]:
        """
        Extract ALL faces from a single PIL image.
        
        Returns:
            List of Face objects found
        """
        # Convert PIL to BGR numpy (InsightFace expects BGR)
        img_np = np.array(image)
        if img_np.shape[2] == 4:  # RGBA
            img_np = img_np[:, :, :3]
        img_bgr = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
        
        faces = analyze_faces(img_bgr, det_size)
        return faces
    
    def build_model(self, compute_method: str, images: Optional[torch.Tensor] = None, folder_path: str = "", det_size: str = "640x640"):
        """
        Build a face model from batch of images OR folder using ALL detected faces.
        
        Args:
            compute_method: How to combine embeddings (Mean/Median/Mode)
            images: Optional Batch of images (B, H, W, C)
            folder_path: Optional path to folder of images
            det_size: Detection size for face analysis
            
        Returns:
            Tuple containing the blended Face object
        """
        # Parse detection size
        det_size_tuple = (640, 640) if det_size == "640x640" else (320, 320)
        
        all_faces: List[Face] = []
        embeddings: List[np.ndarray] = []
        
        # --- Source 1: Tensor Batch ---
        if images is not None:
            pil_images = batch_tensor_to_pil(images)
            n_images = len(pil_images)
            
            _log(f"Scanning batch of {n_images} image(s)...")
            
            pbar = progress_bar(n_images)
            for i, img in enumerate(pil_images):
                found_faces = self.build_all_faces(img, det_size_tuple)
                if found_faces:
                    all_faces.extend(found_faces)
                    for face in found_faces:
                        embeddings.append(face.embedding)
                    _log(f"Batch Image {i+1}: Found {len(found_faces)} face(s)")
                pbar.update(1)
            progress_bar_reset(pbar)

        # --- Source 2: Folder Path ---
        if folder_path and os.path.isdir(folder_path):
            valid_exts = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tiff"}
            file_list = [f for f in os.listdir(folder_path) if os.path.splitext(f)[1].lower() in valid_exts]
            n_files = len(file_list)
            
            _log(f"Scanning folder '{folder_path}' ({n_files} images)...")
            
            pbar = progress_bar(n_files)
            for i, filename in enumerate(file_list):
                file_path = os.path.join(folder_path, filename)
                try:
                    # Load processing one-by-one to save VRAM
                    with Image.open(file_path) as img:
                        img = img.convert("RGB")
                        found_faces = self.build_all_faces(img, det_size_tuple)
                        
                        if found_faces:
                            all_faces.extend(found_faces)
                            for face in found_faces:
                                embeddings.append(face.embedding)
                            _log(f"File '{filename}': Found {len(found_faces)} face(s)")
                except Exception as e:
                    _log(f"Error reading {filename}: {e}", level="WARNING")
                
                pbar.update(1)
            progress_bar_reset(pbar)
        
        # --- Validation ---
        if len(all_faces) == 0:
            _log("No faces found from any source (Batch or Folder)!", level="ERROR")
            return (None,)
        
        # --- Blending Logic ---
        embeddings_array = np.array(embeddings)
        
        if compute_method == "Mean":
            blended_embedding = np.mean(embeddings_array, axis=0)
        elif compute_method == "Median":
            blended_embedding = np.median(embeddings_array, axis=0)
        elif compute_method == "Mode":
            centroid = np.mean(embeddings_array, axis=0)
            distances = [np.linalg.norm(e - centroid) for e in embeddings_array]
            closest_idx = np.argmin(distances)
            blended_embedding = embeddings_array[closest_idx]
        else:
            blended_embedding = np.mean(embeddings_array, axis=0)
        
        # Normalize the blended embedding to unit length
        # This ensures the Face object has a valid, strong embedding
        norm = np.linalg.norm(blended_embedding)
        if norm > 0:
            blended_embedding = blended_embedding / norm
        
        # Create blended face using first face as template
        template_face = all_faces[0] 
        blended_face = Face(
            bbox=template_face.bbox,
            kps=template_face.kps,
            det_score=1.0, 
            embedding=blended_embedding,
        )
        
        # Copy optional attributes
        attrs = ['landmark_3d_68', 'landmark_2d_106', 'pose', 'gender', 'age']
        for attr in attrs:
            if hasattr(template_face, attr):
                setattr(blended_face, attr, getattr(template_face, attr))
        
        _log(f"Built Unified Model from {len(all_faces)} faces. Method: {compute_method}")
        
        return (blended_face,)


# ==============================================================================
# H4_SaveFaceModel
# ==============================================================================
class H4_SaveFaceModel:
    """
    Save a face model to disk.
    
    Saves the face embedding and metadata to a .safetensors file
    that can be loaded later with H4_LoadFaceModel.
    """
    
    def __init__(self):
        self.output_dir = get_face_models_path()
    
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "face_model": ("FACE_MODEL",),
                "filename": ("STRING", {"default": "my_face_model"}),
            },
            "optional": {
                "overwrite": ("BOOLEAN", {"default": False}),
            }
        }
    
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("SAVED_PATH",)
    FUNCTION = "save_model"
    OUTPUT_NODE = True
    CATEGORY = "h4_Live/FaceForge"
    
    def save_model(self, face_model: Face, filename: str, overwrite: bool = False):
        """
        Save face model to .safetensors file.
        
        Args:
            face_model: Face object to save
            filename: Name for the file (without extension)
            overwrite: Whether to overwrite existing file
            
        Returns:
            Tuple containing the saved file path
        """
        if face_model is None:
            _log("No face model provided to save!", level="ERROR")
            return ("",)
        
        # Ensure filename is clean
        filename = filename.strip()
        if not filename:
            filename = "unnamed_face"
        
        # Remove any extension if user added one
        if filename.endswith(".safetensors"):
            filename = filename[:-12]
        
        # Build full path
        save_path = os.path.join(self.output_dir, f"{filename}.safetensors")
        
        # Check for existing file
        if os.path.exists(save_path) and not overwrite:
            _log(f"File exists: {save_path}. Enable 'overwrite' to replace.", level="WARNING")
            # Add number suffix to avoid overwrite
            counter = 1
            while os.path.exists(save_path):
                save_path = os.path.join(self.output_dir, f"{filename}_{counter}.safetensors")
                counter += 1
        
        try:
            # Build tensor dictionary
            tensors = {
                "embedding": torch.from_numpy(face_model.embedding),
                "bbox": torch.from_numpy(np.array(face_model.bbox)),
                "det_score": torch.tensor(face_model.det_score),
            }
            
            # Add optional attributes
            if face_model.kps is not None:
                tensors["kps"] = torch.from_numpy(face_model.kps)
            if hasattr(face_model, 'landmark_3d_68') and face_model.landmark_3d_68 is not None:
                tensors["landmark_3d_68"] = torch.from_numpy(face_model.landmark_3d_68)
            if hasattr(face_model, 'landmark_2d_106') and face_model.landmark_2d_106 is not None:
                tensors["landmark_2d_106"] = torch.from_numpy(face_model.landmark_2d_106)
            if hasattr(face_model, 'pose') and face_model.pose is not None:
                tensors["pose"] = torch.from_numpy(face_model.pose)
            if hasattr(face_model, 'gender') and face_model.gender is not None:
                tensors["gender"] = torch.tensor(face_model.gender)
            if hasattr(face_model, 'age') and face_model.age is not None:
                tensors["age"] = torch.tensor(face_model.age)
            
            # Save to file
            save_file(tensors, save_path)
            
            _log(f"Saved face model to: {save_path}")
            
            return (save_path,)
            
        except Exception as e:
            _log(f"Failed to save face model: {e}", level="ERROR")
            return ("",)


# ==============================================================================
# Node Exports
# ==============================================================================
__all__ = [
    "H4_LoadFaceModel",
    "H4_BuildFaceModel", 
    "H4_SaveFaceModel",
]
