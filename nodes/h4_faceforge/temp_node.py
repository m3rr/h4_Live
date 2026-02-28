
# ==============================================================================
# H4_DualCLIPTextEncode
# ==============================================================================
class H4_DualCLIPTextEncode:
    """
    Simultaneous Text Encoder.
    Outputs BOTH the Conditioning (Encoded) and the Original Text (String).
    Solves the 'How do I send my prompt to the Identity Engine AND the Sampler?' problem.
    """
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "text": ("STRING", {"multiline": True, "dynamicPrompts": True, "tooltip": "The Prompt."}), 
                "clip": ("CLIP", {"tooltip": "The CLIP model to encode with."}), 
            }
        }
    
    RETURN_TYPES = ("CONDITIONING", "STRING")
    RETURN_NAMES = ("CONDITIONING", "TEXT_OUT")
    FUNCTION = "encode"
    CATEGORY = "h4_Live/Utility"

    def encode(self, clip, text):
        _log(f"Dual Encode: '{text[:20]}...'")
        
        # Standard ComfyUI CLIP Encode Logic
        tokens = clip.tokenize(text)
        cond, pooled = clip.encode_from_tokens(tokens, return_pooled=True)
        
        # Return Tuple: (Conditioning, String)
        return ([[cond, {"pooled_output": pooled}]], text)
