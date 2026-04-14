# H4_Switcheroo v1.0.0 - The Universal Switcheroo
# [LANDMARK] File: h4_switcheroo/nodes.py
# [LANDMARK] Purpose: Multi-pass text/data replacement engine with intelligent type proxying.
# ==============================================================================

import torch
import json
import logging
import time

# --- NUCLEAR DEBUG LOGGER (Rule 11/24) ---
def _nuclear_log(msg, level="INFO"):
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    formatted = f"[{timestamp}] [NUCLEAR] [Switcheroo] {msg}"
    print(formatted)

# [LANDMARK] Section: Core Node Definition
class H4_Switcheroo:
    """
    🔄 H4 Universal Switcheroo
    The last find-and-replace node you'll ever need.
    Handles Strings, JSON strings, and attempts to proxy any text-like data.
    """

    @classmethod
    def INPUT_TYPES(cls):
        # [LANDMARK] Logic: Dynamic Widget Generation
        # We generate 10 slots programmatically (Rule 13)
        inputs = {
            "required": {
                "subject": ("*", {"tooltip": "The text, JSON, or data container you want to perform swaps on."}),
                "swap_count": ("INT", {"default": 1, "min": 1, "max": 10, "step": 1, "tooltip": "How many find/replace operations to perform."}),
            },
            "optional": {
                "clip": ("CLIP", {"tooltip": "Optional: Connect a CLIP model to enable automatic re-encoding if the subject is a prompt."}),
                "case_sensitive": ("BOOLEAN", {"default": False, "tooltip": "If ON, 'News' and 'news' are treated as different words."}),
            }
        }

        # Dynamic Slots 1-10
        for i in range(1, 11):
            inputs["optional"][f"find_{i}"] = ("STRING", {"multiline": False, "default": "", "tooltip": f"Target string for swap #{i}."})
            inputs["optional"][f"replace_{i}"] = ("STRING", {"multiline": True, "default": "", "tooltip": f"Replacement string for swap #{i}."})

        return inputs

    RETURN_TYPES = ("*", "STRING", "CONDITIONING")
    RETURN_NAMES = ("data", "string", "conditioning")
    FUNCTION = "execute_swap"
    CATEGORY = "h4_Live/Logic"

    def execute_swap(self, subject, swap_count, clip=None, case_sensitive=False, **kwargs):
        # [LANDMARK] Function: Primary Execution Pipeline
        _nuclear_log(f"Engaging Switcheroo Pipeline. Count: {swap_count}")
        
        # 1. Type Identification & Standardization
        original_type = type(subject)
        working_buffer = ""
        is_json = False
        is_conditioning = False
        
        try:
            if isinstance(subject, str):
                working_buffer = subject
                _nuclear_log("Subject identified as: STRING")
            elif isinstance(subject, (dict, list)):
                # Detect if it's a conditioning list [[tensor, dict], ...]
                if isinstance(subject, list) and len(subject) > 0 and isinstance(subject[0], list):
                    is_conditioning = True
                    _nuclear_log("Subject identified as: CONDITIONING (Search for embedded text...)")
                    # Note: Full conditioning modification requires specialized handling, 
                    # here we assume the user is passing the text represention or wanting a re-encode.
                    working_buffer = str(subject) 
                else:
                    working_buffer = json.dumps(subject)
                    is_json = True
                    _nuclear_log("Subject identified as: JSON/COLLECTION")
            else:
                # Type Proxy Fallback
                working_buffer = str(subject)
                _nuclear_log(f"Subject identified as: {original_type.__name__} (Attempting String Proxy)")
        except Exception as e:
            _nuclear_log(f"CRITICAL FAULT during Standardization: {e}", "ERROR")
            raise ValueError(f"Switcheroo can't read your subject. It's a {original_type.__name__}, not a book. |m/")

        # 2. Iterative Replacement Pass
        import re
        for i in range(1, swap_count + 1):
            target = kwargs.get(f"find_{i}", "")
            replacement = kwargs.get(f"replace_{i}", "")
            if not target: continue

            try:
                if not case_sensitive:
                    pattern = re.compile(re.escape(target), re.IGNORECASE)
                    working_buffer, count = pattern.subn(replacement, working_buffer)
                    _nuclear_log(f"Slot {i}: Replaced {count} matches (Case-Insensitive).")
                else:
                    count = working_buffer.count(target)
                    working_buffer = working_buffer.replace(target, replacement)
                    _nuclear_log(f"Slot {i}: Replaced {count} matches (Literal).")
            except Exception as e:
                _nuclear_log(f"Replacement Failure in Slot {i}: {e}")

        # 3. Restoration & Re-encoding
        final_data = None
        final_string = str(working_buffer)
        final_cond = None

        # Handle CLIP Encoding
        if clip:
            try:
                _nuclear_log("CLIP Model detected. Initiating Smart Encoding...")
                tokens = clip.tokenize(final_string)
                cond, pooled = clip.encode_from_tokens(tokens, return_pooled=True)
                final_cond = [[cond, {"pooled_output": pooled}]]
                _nuclear_log("✅ CLIP Re-encoding successful.")
            except Exception as enc_err:
                _nuclear_log(f"CLIP Encoding Failed: {enc_err}", "WARNING")

        # Restoration Logic
        try:
            if original_type == str:
                final_data = final_string
            elif is_json:
                final_data = json.loads(final_string)
                _nuclear_log("Casting back to: JSON")
            elif is_conditioning:
                final_data = final_cond if final_cond else subject
                _nuclear_log("Casting back to: CONDITIONING")
            else:
                final_data = final_string 
        except Exception as cast_err:
            _nuclear_log(f"RESTORATION FAILED: {cast_err}", "WARNING")
            final_data = final_string

        _nuclear_log("Pipeline Complete.")
        return (final_data, final_string, final_cond)
