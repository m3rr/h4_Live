# h4_loaders.py - Unified Model Loader
# ==============================================================================
# H4_UniversalLoader
# ==============================================================================

import folder_paths
import comfy.sd
import comfy.utils
import comfy.model_patcher
import comfy.model_management
import comfy.supported_models
try:
    from comfy.model_detection import count_blocks
except ImportError:
    def count_blocks(state_dict_keys, template):
        """Fallback layer/block count helper for modern ComfyUI releases."""
        max_idx = -1
        prefix = template.split("{}")[0]
        suffix = template.split("{}")[1] if "{}" in template else ""
        for k in state_dict_keys:
            if k.startswith(prefix):
                rest = k[len(prefix):]
                if suffix:
                    parts = rest.split(suffix)
                    if parts[0].isdigit():
                        max_idx = max(max_idx, int(parts[0]))
                else:
                    parts = rest.split(".")
                    if parts[0].isdigit():
                        max_idx = max(max_idx, int(parts[0]))
        return max_idx + 1 if max_idx >= 0 else 0
import os
import node_helpers
from PIL import Image, ImageOps
import numpy as np
import torch

try:
    from ...core.h4_core import _log
except ImportError:
    def _log(msg):
        print(f"[H4_Loaders] {msg}")

# ==============================================================================
# Helper for Image Loading natively
# ==============================================================================
def _load_image(image_name):
    def _empty():
        image = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
        mask  = torch.zeros((1, 64, 64),    dtype=torch.float32)
        return image, mask

    if image_name == "none" or not image_name:
        return _empty()

    image_path = folder_paths.get_annotated_filepath(image_name)
    if not image_path:
        return _empty()

    try:
        img  = Image.open(image_path)
        img  = node_helpers.pillow(ImageOps.exif_transpose, img)
        img_rgb = img.convert("RGB")
        image = np.array(img_rgb).astype(np.float32) / 255.0
        image = torch.from_numpy(image)[None,]  # [1, H, W, 3]

        if 'A' in img.getbands():
            mask = np.array(img.getchannel('A')).astype(np.float32) / 255.0
            mask = 1. - mask
            mask = torch.from_numpy(mask)[None,]  # [1, H, W]
        else:
            mask = torch.zeros((1, image.shape[1], image.shape[2]), dtype=torch.float32)

        return image, mask
    except Exception as e:
        _log(f"[WARNING] Failed to load image {image_name}: {e}")
        return _empty()

class H4_UniversalLoader:
    """
    The One Loader to Rule Them All.
    Switchable between Standard Checkpoints and Component (Diffusers/UNET) loading.
    Zero external dependencies. Pure ComfyUI logic.
    """
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "load_mode": (["Checkpoint (Standard)", "Diffusers (Component)"], {"default": "Checkpoint (Standard)"}),
            },
            "optional": {
                "ckpt_name": (folder_paths.get_filename_list("checkpoints"), {"tooltip": "The main Checkpoint (.safetensors)."}),
                "unet_name": (folder_paths.get_filename_list("diffusion_models") + folder_paths.get_filename_list("unet_gguf") if "unet_gguf" in folder_paths.folder_names_and_paths else folder_paths.get_filename_list("diffusion_models"), {"tooltip": "Standalone UNET model (Supports .gguf if ComfyUI-GGUF is installed)."}),
                "vae_name": (["Baked / None"] + folder_paths.get_filename_list("vae"), {"tooltip": "Standalone VAE model."}),
                "clip_name": (["Baked / None"] + folder_paths.get_filename_list("clip") + (folder_paths.get_filename_list("clip_gguf") if "clip_gguf" in folder_paths.folder_names_and_paths else []), {"tooltip": "Standalone CLIP model (Supports .gguf)."}),
                "lora_name": (["None"] + folder_paths.get_filename_list("loras"), {"tooltip": "Optional LORA model to apply."}),
                "lora_strength": ("FLOAT", {"default": 1.0, "min": -10.0, "max": 10.0, "step": 0.01, "tooltip": "Strength of the LORA."}),
            }
        }
    
    RETURN_TYPES = ("MODEL", "CLIP", "VAE")
    RETURN_NAMES = ("MODEL", "CLIP", "VAE")
    FUNCTION = "load"
    CATEGORY = "h4_Live/Loaders/_Legacy"

    @classmethod
    def VALIDATE_INPUTS(s, input_types):
        return True

    def _validate_model_clip(self, model, clip, unet_name, clip_name):
        """
        Runtime Guard to prevent Silent Crashes during Sampling.
        Specifically targets the Lumina (2560) vs T5 (4096) mismatch.
        """
        if model is None or clip is None:
            return

        try:
            # Detect Lumina / Z-Image Architecture
            # We check typical classes or config signatures
            is_lumina = False
            model_class = model.model.diffusion_model.__class__.__name__
            
            # Known Lumina variants
            if "NextDiT" in model_class or "Lumina" in model_class:
                is_lumina = True
            
            # GGUF models might not expose class clearly, check config
            if hasattr(model.model, "model_config"):
                conf_class = model.model.model_config.__class__.__name__
                if "Lumina" in conf_class or "Gemma" in conf_class:
                    is_lumina = True
            
            # Heuristic: Check name
            if unet_name and ("zimage" in unet_name.lower() or "lumina" in unet_name.lower()):
                is_lumina = True

            if is_lumina:
                # Check CLIP Dimension via dummy encode? 
                # Or just check if T5 is present in name/type
                # Lumina expects 2560 (Gemma). T5 XXL is 4096.
                
                # Check Clip Name Check
                is_t5 = False
                if clip_name and ("t5" in clip_name.lower() or "xxl" in clip_name.lower()):
                    is_t5 = True
                
                if is_t5:
                     _log("\n" + "="*60)
                     _log("🚨 FATAL CONFIGURATION ERROR DETECTED 🚨")
                     _log(f"Model seems to be Lumina/Z-Image (Expects 2560-dim Embeddings).")
                     _log(f"CLIP seems to be T5/XXL (Provides 4096-dim Embeddings).")
                     _log("This WILL cause a crash during Sampling: 'RuntimeError: Given normalized_shape=[2560]...'")
                     _log("SOLUTION: Use a Gemma 2B based text encoder (e.g. 'gemmas_2b_v1.safetensors') or the specific Z-Image encoder.")
                     _log("="*60 + "\n")
                     # We do not raise error here to allow 'lucky' users to proceed if our detection is wrong,
                     # but we screamed in the log.
                     
        except Exception as e:
            _log(f"Validation Warning: Could not validate Model/CLIP compatibility: {e}")

    def load(self, load_mode, ckpt_name=None, unet_name=None, vae_name="Baked / None", clip_name="Baked / None", lora_name="None", lora_strength=1.0):
        _log(f"UniversalLoader: Mode [{load_mode}]")
        _log(f"UniversalLoader Inputs: ckpt='{ckpt_name}', unet='{unet_name}', clip='{clip_name}', lora='{lora_name}'")
        
        # ----------------------------------------------------------------------
        # MODE 1: Checkpoint (Standard)
        # ----------------------------------------------------------------------
        is_wan_intent = False
        if load_mode == "Checkpoint (Standard)":
            if not ckpt_name:
                raise ValueError("UniversalLoader (Checkpoint Mode): No 'ckpt_name' selected! Please select a checkpoint.")
                
            _log(f"Loading Checkpoint: {ckpt_name}")
            
            try:
                ckpt_path = folder_paths.get_full_path("checkpoints", ckpt_name)
                
                if not ckpt_path:
                    # Fallback: Check if it exists as absolute path or just filename
                    import os
                    if os.path.exists(ckpt_name):
                        ckpt_path = ckpt_name
                    else:
                        raise FileNotFoundError(f"Checkpoint not found: {ckpt_name}. Please verify the file exists in your models/checkpoints folder.")
                
                _log(f"Resolved Checkpoint Path: {ckpt_path}")
                
                out = comfy.sd.load_checkpoint_guess_config(ckpt_path, output_vae=True, output_clip=True, embedding_directory=folder_paths.get_folder_paths("embeddings"))
                
                # Retrieve components for validation
                model = out[0]
                clip = out[1]
                vae = out[2]
                
                # Apply LORA if specified
                if lora_name != "None":
                    lora_path = folder_paths.get_full_path("loras", lora_name)
                    if lora_path:
                        lora = comfy.utils.load_torch_file(lora_path, safe_load=True)
                        model, clip = comfy.sd.load_lora_for_models(model, clip, lora, lora_strength, lora_strength)
                        _log(f"Applied LORA: {lora_name} at strength {lora_strength}")

                # Run Validation (Now reachable)
                self._validate_model_clip(model, clip, ckpt_name, "Baked")
                
                return (model, clip, vae) 

            except Exception as e:
                _log(f"CRITICAL ERROR loading checkpoint: {e}")
                # Re-raise nicely so ComfyUI GUI shows popup
                raise RuntimeError(f"Failed to load checkpoint '{ckpt_name}': {e}")

        # ----------------------------------------------------------------------
        # MODE 2: Diffusers (Component Loading)
        # ----------------------------------------------------------------------
        else:
            if not unet_name:
                raise ValueError("UniversalLoader (Diffusers Mode): No 'unet_name' selected!")

            _log(f"Loading Components: UNET={unet_name}, VAE={vae_name}, CLIP={clip_name}")
            
            # 1. Load UNET
            # --------------------------------------------------------------------------------------
            unet_path = folder_paths.get_full_path("diffusion_models", unet_name)
            if not unet_path:
                 # Check GGUF path if not found in diffusion_models
                 unet_path = folder_paths.get_full_path("unet_gguf", unet_name)
            
            if not unet_path:
                 raise FileNotFoundError(f"UniversalLoader: Unit path not found for {unet_name}")

            model = None
            
            # GGUF BRIDGE: Delegate to ComfyUI-GGUF if .gguf
            if unet_name.lower().endswith(".gguf"):
                _log(f"Detected GGUF Model: {unet_name} -> Delegating to ComfyUI-GGUF")
                try:
                    # ----------------------------------------------------------------------
                    # INTERNAL GGUF LOADING
                    # ----------------------------------------------------------------------
                    
                    # Check for Wan specifically (exclude z-image/lumina which should use standard loader)
                    is_wan_gguf = "wan" in unet_name.lower() and "zimage" not in unet_name.lower() and "z-image" not in unet_name.lower()
                    
                    if is_wan_gguf:
                        try:
                             # ----------------------------------------------------------------------
                             # MANUAL WAN LOGIC (Internal)
                             # ----------------------------------------------------------------------
                             from .gguf.loader import gguf_sd_loader
                             
                             unet_path = folder_paths.get_full_path("unet", unet_name)
                             if not unet_path:
                                 unet_path = folder_paths.get_full_path("diffusion_models", unet_name)
                             sd, _ = gguf_sd_loader(unet_path)
                             
                             # Safety Check for non-Wan models (Lumina/Z-Image)
                             for k in sd:
                                 if "cap_embedder" in k:
                                      _log(f"DETECTED LUMINA/NEXTDIT (Z-Image) ARCHITECTURE. Key: {k}")
                                      _log("WARNING: This model expects 2560-dim embeddings (Gemma 2B?), but you are likely providing 4096-dim (T5/Llama3). FAILSAFE ACTIVATED: Aborting Wan Loader.")
                                      is_wan_gguf = False
                                      break
                             
                             if is_wan_gguf:
                                 _log(f"Detected potential Wan/ZImage GGUF: {unet_name} -> FORCING INTERNAL WAN LOADER")
                                 
                                 from .gguf.ops import GGMLOps
                                 from .gguf.nodes import GGUFModelPatcher
                                 
                                 # Manual Config for Wan
                                 unet_config = {}
                                 unet_config["image_model"] = "wan2.1"
                                 unet_config["model_type"] = "t2v"
                                 
                                 # Guess Dim from sd keys
                                 dim = 0
                                 for k in sd:
                                     if k.endswith("head.modulation"):
                                         dim = sd[k].shape[-1]
                                         break
                                 
                                 if dim == 0:
                                     for k in sd:
                                         if k.endswith("patch_embedding.weight"):
                                             dim = sd[k].shape[0] 
                                             break
                                              
                                 if dim == 0:
                                     _log("WARNING: Could not determine Wan dimension from GGUF. Defaulting to 5120 (14B).")
                                     dim = 5120
                             
                             unet_config["dim"] = dim
                             unet_config["num_heads"] = dim // 128
                             # DEBUG: Dump keys to find the right ones
                             _log(f"DEBUG: First 20 Keys in GGUF: {list(sd.keys())[:20]}")
                             
                             # Layer Count Logic
                             num_layers = count_blocks(list(sd.keys()), 'blocks.{}')
                             if num_layers == 0:
                                 # Try other patterns
                                 num_layers = count_blocks(list(sd.keys()), 'model.diffusion_model.blocks.{}')
                             if num_layers == 0:
                                 # Manual scan for highest block index
                                 import re
                                 max_idx = -1
                                 for k in sd:
                                     m = re.search(r"blocks\.(\d+)\.", k)
                                     if m:
                                         idx = int(m.group(1))
                                         if idx > max_idx:
                                             max_idx = idx
                                 if max_idx >= 0:
                                     num_layers = max_idx + 1
                             
                             if num_layers == 0:
                                 _log(f"WARNING: Could not determine Wan layers from GGUF. Defaulting to 40.")
                                 num_layers = 40 
                                 
                             unet_config["num_layers"] = num_layers
                             
                             # Wan Defaults
                             unet_config["patch_size"] = (1, 2, 2)
                             unet_config["freq_dim"] = 256
                             unet_config["window_size"] = (-1, -1)
                             unet_config["qk_norm"] = True
                             unet_config["cross_attn_norm"] = True
                             unet_config["eps"] = 1e-6

                             _log(f"Wan Config: Dim={dim}, Layers={unet_config['num_layers']}")
                             
                             try:
                                 # Initialize Model Wrapper
                                 wrapper = comfy.supported_models.WAN21_T2V(unet_config)
                                 model = wrapper.get_model(sd)
                                 
                                 # Wrap in ModelPatcher (Critical Fix)
                                 model = comfy.model_patcher.ModelPatcher(model, load_device=comfy.model_management.get_torch_device(), offload_device=comfy.model_management.unet_offload_device())
                                 
                                 # Set Custom Ops (GGUF)
                                 ops = GGMLOps()
                                 ops.Linear.dequant_dtype = None
                                 ops.Linear.patch_dtype = None
                                 model.model_options["custom_operations"] = ops
                                 
                                 # Wrap in GGUF Patcher
                                 model = GGUFModelPatcher.clone(model)
                                 model.patch_on_device = False
                                 
                                 _log("Internal GGUF Wan Load SUCCESS.")
                                 
                             except Exception as exc:
                                 _log(f"CRITICAL ERROR during Wan Model Init: {exc}")
                                 import traceback
                                 traceback.print_exc()
                                 raise exc
                             
                        except Exception as e:
                            _log(f"Manual Wan GGUF Load Failed: {e}. Falling back to standard GGUF loader.")
                            is_wan_gguf = False # Trigger fallback
                            
                    if not is_wan_gguf:
                        # Standard GGUF (Not Wan or Fallback)
                        from .gguf.nodes import UnetLoaderGGUF
                        loader = UnetLoaderGGUF()
                        out = loader.load_unet(unet_name, "default", "default", False)
                        model = out[0]
                        _log("GGUF UNET Loaded Successfully via Internal Port.")
                    
                    try:
                        conf_class = model.model.model_config.__class__.__name__
                        _log(f"DEBUG: GGUF Internal Config Class: {conf_class}")
                        _log(f"DEBUG: Model Type: {type(model.model.diffusion_model)}")
                    except Exception as e:
                        _log(f"DEBUG: Could not inspect model config: {e}")
                    
                except ImportError as e:
                    raise ImportError(f"Internal GGUF Port Missing: {e}")
                except Exception as e:
                     # Clean up memory if failed
                     import gc
                     gc.collect()
                     raise RuntimeError(f"GGUF Load Error: {e}")

            # --------------------------------------------------------------------------------------
            # UNET Loading (Standard & Wan Force) - Only run if not GGUF
            # --------------------------------------------------------------------------------------
            if model is None:
                is_wan_intent = False
            
            # Heuristic: Check for Wan/UMT5 context in names
            # If user explicitly selected UMT5 CLIP, they likely want Wan UNET
            if (clip_name and "umt5" in clip_name.lower()) or "wan" in unet_name.lower() or "zimage" in unet_name.lower():
                is_wan_intent = True
                
            if is_wan_intent:
                _log(f"UniversalLoader: Wan/UMT5 context detected. Checking {unet_name} for Wan signature...")
                try:
                    # NOTE: Imports moved to top or accessed via existing global 'comfy'
                    # import comfy.model_detection 
                    # import comfy.supported_models
                    from comfy.model_detection import count_blocks
                    
                    # Load State Dict without processing
                    sd = comfy.utils.load_torch_file(unet_path)
                    
                    # Check keys to confirm it is wan or similar
                    # Wan 2.1 signature: 'head.modulation'
                    has_wan_sig = any(k.endswith("head.modulation") for k in sd.keys())
                    # Some quantized models might rename keys, but usually structure remains.
                    # If assume zImageFp8 is Wan, it SHOULD have these keys.
                    
                    if has_wan_sig or "wan" in unet_name.lower() or "zimage" in unet_name.lower():
                         _log("FORCING Manual Wan UNET Load (Bypassing Detection)")
                         
                         # Construct config manually (Mirrors comfy.model_detection logic for Wan 2.1)
                         unet_config = {}
                         unet_config["image_model"] = "wan2.1"
                         
                         # Extract Dimensions
                         # Default to T2V if unknown
                         unet_config["model_type"] = "t2v" 
                         
                         # Attempt to find dim from weights
                         # Try 'head.modulation'
                         dim = 0
                         for k in sd:
                             if k.endswith("head.modulation"):
                                 dim = sd[k].shape[-1]
                                 break
                         
                         if dim == 0:
                             # Fallback: try patch_embedding
                             for k in sd:
                                 if k.endswith("patch_embedding.weight"):
                                    dim = sd[k].shape[1] # in_dim? No, patch_embedding is (out, in, ...)
                                    # Wait, patch_embedding.weight shape is [dim, in_channels, t, h, w]
                                    # So dim is shape[0]
                                    # But Wan detection uses modulation shape[-1] which is dim.
                                    # Let's hope modulation exists.
                                    pass
                         
                         if dim == 0:
                             # Fallback guessing based on file?
                             # 14B likely has dim around 5120?
                             # For now, let's assume modulation exists if we are here. 
                             # If not, let standard loader fail?
                             # But zImageFp8 failed with 2560 error. 
                             # If we can't find modulation, standard load will run.
                             pass
                         else:
                             # Found keys, proceed
                             unet_config["dim"] = dim
                             unet_config["num_heads"] = dim // 128
                             
                             # Count layers
                             # Wan uses 'blocks.'
                             # model_detection: dit_config["num_layers"] = count_blocks(state_dict_keys, '{}blocks.'.format(key_prefix) + '{}.')
                             # We assume prefix is empty
                             unet_config["num_layers"] = count_blocks(list(sd.keys()), 'blocks.{}')
                             
                             # Other params
                             unet_config["patch_size"] = (1, 2, 2)
                             unet_config["freq_dim"] = 256
                             unet_config["window_size"] = (-1, -1)
                             unet_config["qk_norm"] = True
                             unet_config["cross_attn_norm"] = True
                             unet_config["eps"] = 1e-6
                             
                             # Instantiate Wan Model Wrapper
                             # Use WAN21_T2V class
                             wrapper = comfy.supported_models.WAN21_T2V(unet_config)
                             model = wrapper.get_model(sd)
                             
                             # WRAP IN MODEL PATCHER (Critical for ComfyUI Memory Management)
                             # NOTE: Imports accessed via existing global 'comfy' to avoid UnboundLocalError
                             # import comfy.model_patcher
                             # import comfy.model_management
                             
                             load_device = comfy.model_management.get_torch_device()
                             offload_device = comfy.model_management.unet_offload_device()
                             
                             # Use CoreModelPatcher if available (ComfyUI v0.3+), else ModelPatcher
                             if hasattr(comfy.model_patcher, "CoreModelPatcher"):
                                 model = comfy.model_patcher.CoreModelPatcher(model, load_device=load_device, offload_device=offload_device)
                             else:
                                 model = comfy.model_patcher.ModelPatcher(model, load_device=load_device, offload_device=offload_device)
                             
                             # Load Weights into the Model (via Patcher to handle devices)
                             # Note: model is now a Patcher instance
                             model.load_model_weights(sd, "")
                             
                             _log(f"Manual Wan Load SUCCESS. Dim={dim}, Layers={unet_config['num_layers']}")
                             
                             # CRITICAL: Clean up memory immediately (sd is huge)
                             del sd
                             import gc
                             gc.collect()
                             if torch.cuda.is_available():
                                 torch.cuda.empty_cache()

                except Exception as e:
                    _log(f"Manual Wan UNET detection failed: {e}. Falling back to standard.")
                    if 'sd' in locals():
                        del sd
                    import gc
                    gc.collect()
                    import torch
                    if torch.cuda.is_available():
                        torch.cuda.empty_cache()

            if model is None:
                # Standard Comfy Load
                model = comfy.sd.load_diffusion_model(unet_path)
            
            # 2. Load CLIP
            # --------------------------------------------------------------------------------------
            # CLIP Loading (Standard, GGUF, & Detection for Wan/UMT5)
            # --------------------------------------------------------------------------------------
            clip = None
            if clip_name not in ["None", "Baked / None"]:
                clip_path = folder_paths.get_full_path("clip", clip_name)
                if not clip_path:
                    clip_path = folder_paths.get_full_path("clip_gguf", clip_name)

                # GGUF BRIDGE for CLIP
                if clip_name.lower().endswith(".gguf"):
                     _log(f"Detected GGUF CLIP: {clip_name} -> Delegating to ComfyUI-GGUF")
                     try:
                        # Re-use the module finding logic (simplified here as we likely found it above, but strict check again)
                        import sys
                        gguf_module = None
                        for name, module in sys.modules.items():
                            if "ComfyUI-GGUF" in name and "nodes" in name:
                                gguf_module = module
                                break
                        
                        if not gguf_module:
                             # Re-import if we skipped UNET load or it failed silently
                             import __main__
                             import os
                             import importlib.util
                             base_path = os.path.dirname(os.path.abspath(__main__.__file__))
                             gguf_node_path = os.path.join(base_path, "custom_nodes", "ComfyUI-GGUF", "nodes.py")
                             spec = importlib.util.spec_from_file_location("ComfyUI_GGUF_nodes", gguf_node_path)
                             gguf_module = importlib.util.module_from_spec(spec)
                             sys.modules["ComfyUI_GGUF_nodes"] = gguf_module
                             spec.loader.exec_module(gguf_module)

                        loader = gguf_module.CLIPLoaderGGUF()
                        # Signature: load_clip(self, clip_name, type="stable_diffusion")
                        # We try to infer type from name or default to stable_diffusion
                        ctype = "stable_diffusion"
                        if "t5" in clip_name.lower(): ctype = "sd3" # generic T5
                        if "sd3" in clip_name.lower(): ctype = "sd3"
                        if "flux" in clip_name.lower(): ctype = "flux"
                        
                        out = loader.load_clip(clip_name, type=ctype)
                        clip = out[0]
                        _log(f"GGUF CLIP Loaded Successfully via Bridge (Type: {ctype}).")
                        
                     except Exception as e:
                         raise RuntimeError(f"GGUF CLIP Load Error: {e}")
                
                # Detect Wan / Z-Image UMT5 to fix Vocab Size Mismatch (256k vs 32k) & Misidentification (Gemma/Lumina)
                elif "umt5" in clip_name.lower():
                    _log(f"Detected UMT5/Wan Text Encoder: {clip_name} -> FORCING Manual WanTEModel Load")
                    try:
                        # Manual Load to bypass comfy.sd.load_clip incorrect detection (often detects as Lumina/Gemma)
                        # Use importlib to avoid 'UnboundLocalError' for 'comfy'
                        import importlib
                        wan_module = importlib.import_module("comfy.text_encoders.wan")
                        from comfy.sd import CLIP, load_text_encoder_state_dicts, t5xxl_detect
                        from types import SimpleNamespace
                        
                        # Load state dict
                        clip_data = comfy.utils.load_torch_file(clip_path, safe_load=True)
                        
                        # Prepare target to mimic CLIPType.WAN logic
                        clip_target = SimpleNamespace()
                        clip_target.params = {} # Mock params to satisfy CLIP constructor
                        
                        # Use t5xxl_detect if available to handle quantization/dtype, otherwise empty dict
                        try:
                            t5_args = t5xxl_detect([clip_data])
                        except:
                            t5_args = {}
                            
                        # Prepare tokenizer data (critical for SPieceTokenizer)
                        tokenizer_data = {}
                        tokenizer_data["spiece_model"] = clip_data.get("spiece_model", None)
                        if tokenizer_data["spiece_model"] is None:
                            _log("WARNING: 'spiece_model' not found in checkpoint. Tokenizer load may fail if external file is missing.")

                        clip_target.clip = wan_module.te(**t5_args)
                        clip_target.tokenizer = wan_module.WanT5Tokenizer
                        
                        # Instantiate CLIP wrapper manually
                        # We behave as if we are load_clip -> load_text_encoder_state_dicts
                        # But we enforce correct class map
                        clip = CLIP(clip_target, embedding_directory=folder_paths.get_folder_paths("embeddings"), state_dict=[clip_data], tokenizer_data=tokenizer_data)
                        
                        # CRITICAL: Clean up memory immediately
                        del clip_data
                        import gc
                        gc.collect()
                        if torch.cuda.is_available():
                            torch.cuda.empty_cache()
                        
                    except Exception as e:
                        _log(f"Manual Wan Load Failed: {e}. Falling back to standard load with hint.")
                        # CRITICAL: Clean up memory before fallback to prevent OOM (page file error)
                        try:
                            if 'clip_data' in locals():
                                del clip_data
                            if 'clip_target' in locals():
                                del clip_target
                            if 'wan_module' in locals():
                                del wan_module
                            import gc
                            gc.collect()
                            import torch
                            if torch.cuda.is_available():
                                torch.cuda.empty_cache()
                        except:
                            pass
                            
                        # Fallback to previous heuristic
                        try:
                            clip_type = comfy.sd.CLIPType.WAN
                        except AttributeError:
                            clip_type = 13 
                        clip = comfy.sd.load_clip(ckpt_paths=[clip_path], embedding_directory=folder_paths.get_folder_paths("embeddings"), clip_type=clip_type)
                else:
                    # Standard load
                    clip = comfy.sd.load_clip(ckpt_paths=[clip_path], embedding_directory=folder_paths.get_folder_paths("embeddings"))
            else:
                # If user selects Diffusers mode but forgets CLIP, we can't really "guess" 
                # effectively without a checkpoint. So we return a dummy or fail.
                # Actually, standard practice is to fail or rely on user.
                # Let's try to load the UNET's internal CLIP if possible? No, UNETs don't have CLIP.
                _log("Warning: No CLIP selected in Diffusers mode!")
                clip = None 

            # 3. Load VAE
            if vae_name != "Baked / None":
                vae_path = folder_paths.get_full_path("vae", vae_name)
                vae = comfy.sd.VAE(sd=comfy.utils.load_torch_file(vae_path))
            else:
                 _log("Warning: No VAE selected in Diffusers mode!")
                 vae = None

            # 4. Apply Lora
            if lora_name != "None":
                lora_path = folder_paths.get_full_path("loras", lora_name)
                if lora_path:
                    lora = comfy.utils.load_torch_file(lora_path, safe_load=True)
                    model, clip = comfy.sd.load_lora_for_models(model, clip, lora, lora_strength, lora_strength)
                    _log(f"Applied LORA: {lora_name} at strength {lora_strength}")

            # 5. Final Validation (Runtime Guard)
            self._validate_model_clip(model, clip, unet_name if unet_name else ckpt_name, clip_name)

            return (model, clip, vae)


# ==============================================================================
# H4_CompleteLoader
# ==============================================================================

class H4_CompleteLoader(H4_UniversalLoader):
    """
    Universal Loader on steroids with integrated Image uploading.
    Allows loading up to 4 dynamic images alongside standard Checkpoint / UNET / VAE / CLIP loading.
    JS Extension manages the interface to appear sleek with one upload button.
    """
    @classmethod
    def INPUT_TYPES(s):
        input_dir = folder_paths.get_input_directory()
        valid_exts = ('.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif')
        files = ["none"] + [f for f in os.listdir(input_dir) if os.path.isfile(os.path.join(input_dir, f)) and f.lower().endswith(valid_exts)]
        
        # Start with Universal Loader schema
        schema = H4_UniversalLoader.INPUT_TYPES()
        
        # Add dynamic image properties
        for i in range(1, 5):
            schema["optional"][f"image_{i}"] = (files, {"image_upload": True})
            
        return schema
        
    RETURN_TYPES = tuple(["MODEL", "CLIP", "VAE"] + [item for i in range(1, 5) for item in ("IMAGE", "MASK")])
    RETURN_NAMES = tuple(["MODEL", "CLIP", "VAE"] + [item for i in range(1, 5) for item in (f"IMAGE_{i}", f"MASK_{i}")])
    FUNCTION = "load_complete"
    CATEGORY = "h4_Live/Loaders"

    def load_complete(self, load_mode, ckpt_name=None, unet_name=None, vae_name="Baked / None", clip_name="Baked / None",
                      lora_name="None", lora_strength=1.0,
                      image_1="none", image_2="none", image_3="none", image_4="none"):
        model, clip, vae = self.load(load_mode, ckpt_name, unet_name, vae_name, clip_name, lora_name, lora_strength)
        
        results = [model, clip, vae]
        for img_name in [image_1, image_2, image_3, image_4]:
            img, mask = _load_image(img_name)
            # Must return a mock tensor if missing so the graph doesn't crash if explicitly linked but empty?
            # actually if the user wired it, it usually evaluates. Returning None is fine and handled by ComfyUI
            # but if it breaks on None, we yield 1x1 black tensors. We will just return None if unassigned.
            results.append(img)
            results.append(mask)

        return tuple(results)


# ==============================================================================
# H4_MultiImgUpload
# ==============================================================================

class H4_MultiImgUpload:
    """
    Batch loader for specific images, stripped down from Complete Loader.
    Up to 10 images with dynamically appearing slots.
    """
    @classmethod
    def INPUT_TYPES(s):
        input_dir = folder_paths.get_input_directory()
        valid_exts = ('.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif')
        files = ["none"] + [f for f in os.listdir(input_dir) if os.path.isfile(os.path.join(input_dir, f)) and f.lower().endswith(valid_exts)]
        
        return {
            "required": {},
            "optional": {f"image_{i}": (files, {"image_upload": True}) for i in range(1, 11)}
        }
        
    RETURN_TYPES = tuple([item for i in range(1, 11) for item in ("IMAGE", "MASK")])
    RETURN_NAMES = tuple([item for i in range(1, 11) for item in (f"IMAGE_{i}", f"MASK_{i}")])
    FUNCTION = "load_images"
    CATEGORY = "h4_Live/Loaders"

    def load_images(self, **kwargs):
        results = []
        for i in range(1, 11):
            img_name = kwargs.get(f"image_{i}", "none")
            img, mask = _load_image(img_name)
            results.append(img)
            results.append(mask)
        return tuple(results)