# FILE: custom_nodes/comfyui_h4_live/h4_visual_tokenizer.py
# ------------------------------------------------------------------------------
# H4 Visual Tokenizer - The "Mind of the Model"
# Rule 1: No Placeholders
# Rule 11: Mandatory Logging
# ------------------------------------------------------------------------------
import torch
import comfy.sd1_clip
import comfy.model_management
from server import PromptServer
from ...core.h4_core import _log

class H4_VisualTokenizer:
    """
    👁️ H4 Visual Tokenizer
    "See what the AI sees."
    
    Visualizes Tokenization & Weights.
    """
    
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "clip": ("CLIP", {"tooltip": "The CLIP model to use for tokenization"}),
                "text": ("STRING", {"multiline": True, "default": "", "tooltip": "The prompt to analyze"}),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID",
            }
        }
    
    RETURN_TYPES = ("STRING",) # Passthrough text
    RETURN_NAMES = ("text",)
    FUNCTION = "visualize_tokens"
    CATEGORY = "h4_Live/Debug"
    OUTPUT_NODE = True 
    
    DESCRIPTION = """
    👁️ Visual Tokenizer
    
    Input your prompt and the CLIP model.
    This node will show you EXACTLY how the model breaks down your words (tokens)
    and applying weights (e.g. (word:1.2)).
    
    Please wait for the node to run to see the visualization.
    """

    def visualize_tokens(self, clip, text, unique_id):
        node_id = str(unique_id)
        _log(f"[{node_id}] 👁️ Visual Tokenizer: Analyzing '{text[:50]}...'")
        
        # 1. Get the Tokenizer
        # ComfyUI CLIP object wrapper usually has 'tokenizer' attribute
        # It might be in clip.cond_stage_model if using SDXL
        # We need to handle SD1.5 vs SDXL structure if possible, but start standard.
        
        tokenizer = None
        if hasattr(clip, "tokenizer"):
            tokenizer = clip.tokenizer
        elif hasattr(clip, "cond_stage_model") and hasattr(clip.cond_stage_model, "tokenizer"):
            tokenizer = clip.cond_stage_model.tokenizer
        else:
             # Fallback for some custom loaders?
             _log(f"[{node_id}] ⚠️ Could not find 'tokenizer' in CLIP object. Analysis aborted.")
             return (text,)
             
        # 2. Parse Weights (Comfy Standard Parser)
        # We use the internal function Comfy uses for weight parsing
        # comfy.sd1_clip.parse_parentheses(text) -> returns list of (text, weight)
        
        weighted_segments = comfy.sd1_clip.token_weights(text, 1.0)
        
        # 3. Tokenize Each Segment
        # We need to reconstruct the token list.
        # Note: CLIP tokenizer includes Start/End tokens (49406, 49407) usually. 
        # But Comfy's parser chunks it up.
        
        token_data = [] # List of { "token": str, "id": int, "weight": float }
        
        # We'll stick to the core tokenizer logic logic found in sd1_clip.py's tokenize()
        # simplified for visualization.
        
        # Extract the underlying HuggingFace Tokenizer to properly tokenize words.
        # ComfyUI dynamically wraps tokenizers depending on SD1.5/SDXL/Flux architectures.
        def find_hf_tokenizer(obj, depth=0):
            if depth > 4 or obj is None: return None
            # Check if it has the standard HuggingFace methods
            if hasattr(obj, "convert_tokens_to_ids") and hasattr(obj, "tokenize"):
                return obj
            # Check common wrappers
            for attr in ["tokenizer", "clip_l", "cond_stage_model", "text_encoder"]:
                if hasattr(obj, attr):
                    res = find_hf_tokenizer(getattr(obj, attr), depth + 1)
                    if res: return res
            return None

        hx_tokenizer = find_hf_tokenizer(clip)
            
        for segment_text, segment_weight in weighted_segments:
            try:
                if hx_tokenizer:
                    tokens = hx_tokenizer.tokenize(segment_text)
                    ids = hx_tokenizer.convert_tokens_to_ids(tokens)
                    for t_str, t_id in zip(tokens, ids):
                        # Clean up subword markers for display
                        display_str = t_str.replace("</w>", "")
                        token_data.append({
                            "token": display_str,
                            "id": t_id,
                            "weight": segment_weight
                        })
                else:
                    # Fallback if architecture totally changed
                    token_data.append({"token": segment_text, "id": -1, "weight": segment_weight})
            except Exception as e:
                _log(f"[{node_id}] ⚠️ Tokenization Error on '{segment_text}': {e}")
                token_data.append({"token": segment_text, "id": -1, "weight": segment_weight})

        # 4. Send to UI
        # We also want to know the Total Token Count (75 limit check etc)
        # Standard CLIP limit is 75 tokens + 2 (start/end). 
        # We should show if it's over limit.
        
        ui_payload = {
            "node_id": node_id,
            "tokens": token_data,
            "count": len(token_data)
        }
        
        PromptServer.instance.send_sync("h4.visual_tokenizer.update", ui_payload)
        
        return (text,)