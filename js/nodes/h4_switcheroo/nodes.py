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
                "swap_count": ("INT", {"default": 1, "min": 0, "max": 10, "step": 1, "tooltip": "How many find/replace operations to perform."}),
            },
            "optional": {
                "clip": ("CLIP", {"tooltip": "Optional: Connect a CLIP model to enable automatic re-encoding if the subject is a prompt."}),
                "case_sensitive": ("BOOLEAN", {"default": False, "tooltip": "If ON, 'News' and 'news' are treated as different words."}),
                "regex_mode": ("BOOLEAN", {"default": False, "tooltip": "If ON, you can use regular expressions (e.g., 'mid-.*') in the FIND boxes."}),
                "strip_whitespace": ("BOOLEAN", {"default": True, "tooltip": "If ON, accidental spaces at the start/end of your entries are ignored."}),
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
    OUTPUT_NODE = True

    def execute_swap(self, subject, swap_count, clip=None, case_sensitive=False, regex_mode=False, strip_whitespace=True, **kwargs):
        # [LANDMARK] Function: Primary Execution Pipeline
        _nuclear_log(f"Engaging Switcheroo Pipeline. Count: {swap_count} | Regex: {regex_mode} | Strip: {strip_whitespace}")
        
        # 0. Pass-Through Safety (Rule 6)
        if swap_count <= 0:
            _nuclear_log("Swap Count is 0. Engaging PASS-THROUGH mode.")
            processed_conditioning = None
            if clip:
                import torch
                processed_conditioning = clip.encode(subject if isinstance(subject, str) else str(subject))
            return {"ui": {"text": [str(subject)], "segments": [{"t": str(subject), "c": False}]}, "result": (subject, str(subject), processed_conditioning)}

        # 1. Type Identification & Standardization
        # ... (lines 58-100 remain the same)
        original_type = type(subject)
        working_buffer = ""
        is_json = False
        is_conditioning = False
        
        try:
            if isinstance(subject, str):
                working_buffer = subject
                _nuclear_log("Subject identified as: STRING")
            elif isinstance(subject, (dict, list)):
                if isinstance(subject, list) and len(subject) > 0 and isinstance(subject[0], list):
                    is_conditioning = True
                    _nuclear_log("Subject identified as: CONDITIONING")
                    def extract_strings(obj):
                        if isinstance(obj, str): return [obj]
                        elif isinstance(obj, dict):
                            res = []
                            for v in obj.values(): res.extend(extract_strings(v))
                            return res
                        elif isinstance(obj, (list, tuple)):
                            res = []
                            for v in obj: res.extend(extract_strings(v))
                            return res
                        return []
                    found_strs = extract_strings(subject)
                    working_buffer = "\n".join(found_strs) if found_strs else ""
                    if not working_buffer:
                        working_buffer = "ERROR: WIRING FAULT DETECTED.\nYou wired mathematical Tensors into Switcheroo.\nPlease wire the raw 'STRING' prompt instead before the CLIPTextEncode node."
                        _nuclear_log("WARNING: Connected Subject is purely mathematical Tensors.", "WARNING")
                else:
                    working_buffer = json.dumps(subject)
                    is_json = True
                    _nuclear_log("Subject identified as: JSON/COLLECTION")
            else:
                working_buffer = str(subject)
                _nuclear_log(f"Subject identified as: {original_type.__name__}")
        except Exception as e:
            _nuclear_log(f"CRITICAL FAULT during Standardization: {e}", "ERROR")
            raise ValueError(f"Switcheroo can't read your subject. It's a {original_type.__name__}.")
        # 2. Iterative Replacement Pass
        working_buffer_start = working_buffer # [LANDMARK] Capture initial state for diffing
        import re

        def replace_strings_in_obj(obj, pattern, replacement, target):
            if isinstance(obj, str):
                if pattern:
                    return pattern.sub(lambda m: replacement, obj)
                return obj.replace(target, replacement)
            elif isinstance(obj, dict):
                return {k: replace_strings_in_obj(v, pattern, replacement, target) for k, v in obj.items()}
            elif isinstance(obj, (list, tuple)):
                items = [replace_strings_in_obj(v, pattern, replacement, target) for v in obj]
                return items if isinstance(obj, list) else tuple(items)
            return obj

        mutated_subject = subject

        for i in range(1, swap_count + 1):
            target = kwargs.get(f"find_{i}", "")
            replacement = kwargs.get(f"replace_{i}", "")
            
            if strip_whitespace:
                target = target.strip()
                replacement = replacement.strip()

            if not target: continue

            _nuclear_log(f"Slot {i} Attempt: Finding '{target}' -> Replacing with '{replacement}'")

            try:
                pattern = None
                # [RULE 13/Perf] Smart Character Mapping (Unicode Resilience)
                # If case-insensitive and not regex, we convert target into a character-variant-resilient regex
                if not case_sensitive and not regex_mode:
                    p_str = re.escape(target)
                    # Normalize hyphens: Match standard, non-breaking, en-dash, em-dash
                    p_str = p_str.replace(r"\-", r"[\-\u2011\u2013\u2014]")
                    # Normalize quotes
                    p_str = p_str.replace(r"\'", r"[\'\u2018\u2019]")
                    p_str = p_str.replace(r"\"", r"[\"\u201C\u201D]")
                    # Normalize spaces (standard + non-breaking)
                    p_str = p_str.replace(r"\ ", r"[\ \u00A0]")
                    
                    pattern = re.compile(p_str, re.IGNORECASE)
                    working_buffer, count = pattern.subn(lambda m: replacement, working_buffer)
                    _nuclear_log(f"Slot {i}: Smart Mapping Active. Regex generated: {p_str}", "DEBUG")
                
                elif regex_mode or not case_sensitive:
                    flags = re.IGNORECASE if not case_sensitive else 0
                    p_str = re.escape(target) if not regex_mode else target
                    pattern = re.compile(p_str, flags)
                    working_buffer, count = pattern.subn(lambda m: replacement, working_buffer)
                else:
                    count = working_buffer.count(target)
                    working_buffer = working_buffer.replace(target, replacement)
                
                if count > 0:
                    _nuclear_log(f"Slot {i}: Success. Replaced {count} matches.")
                else:
                    # [MAGICIAN DIAGNOSTIC]
                    _nuclear_log(f"Slot {i}: Zero matches found.", "WARNING")
                    _nuclear_log(f"TARGET HEX: {target.encode('utf-8').hex()}", "DEBUG")
                    
                    # [NUCLEAR INVESTIGATION] Check for encoding mismatches (Rule 24)
                    if not regex_mode:
                        # Scan buffer for similar looking characters
                        test_target = target.replace("-", "!").replace("'", "!").replace("\"", "!").replace(" ", "!")
                        test_pattern = re.escape(test_target).replace("!", ".")
                        near_matches = re.findall(test_pattern, working_buffer, re.IGNORECASE)
                        if near_matches:
                            _nuclear_log(f"CRITICAL DIAGNOSTIC: Found {len(near_matches)} near-matches: {near_matches}", "IMPORTANT")
                            _nuclear_log("Check if your target has hidden Unicode characters (long dashes, smart quotes, non-breaking spaces).", "TIP")
                    
                    # Fuzzy match check (legacy)
                    if len(target) > 3:
                        root = target[:4]
                        root_matches = len(re.findall(re.escape(root), working_buffer, re.IGNORECASE))
                        if root_matches > 0:
                            _nuclear_log(f"DIAGNOSTIC: Found {root_matches} occurrences of '{root}' — check for typos in the rest of your string!", "TIP")
                    
                    snippet = working_buffer[:500]
                    _nuclear_log(f"DEBUG: Buffer Head (500 chars): '{snippet}'", "DEBUG")
                
                mutated_subject = replace_strings_in_obj(mutated_subject, pattern, replacement, target)
                if isinstance(subject, str):
                    mutated_subject = working_buffer

            except Exception as e:
                _nuclear_log(f"Replacement Failure in Slot {i}: {e}", "ERROR")

        # 3. Restoration & Re-encoding
        final_data = mutated_subject
        final_string = str(working_buffer)
        
        # 3. Diff & Segment generation
        _nuclear_log("Generating Mutation Highlight Segments...")
        import difflib
        
        highlighted_segments = []
        try:
            # [FIX] Normalize line endings to prevent "phantom changes" from painting everything green
            input_text = working_buffer_start.replace("\r\n", "\n") if working_buffer_start else ""
            diff_final = final_string.replace("\r\n", "\n") if final_string else ""
            
            # [FIX] autojunk=False prevents SequenceMatcher from being too aggressive on common words
            s = difflib.SequenceMatcher(None, input_text, diff_final, autojunk=False)
            for tag, i1, i2, j1, j2 in s.get_opcodes():
                segment_text = diff_final[j1:j2]
                if not segment_text: continue
                
                # We highlight 'replace' and 'insert' as changed (Green)
                highlighted_segments.append({
                    "t": segment_text,
                    "c": tag in ("replace", "insert")
                })
            _nuclear_log(f"Diff Analysis parsed {len(highlighted_segments)} segments for UI.")
        except Exception as diff_err:
            _nuclear_log(f"Highlighting Engine Failed: {diff_err}", "WARNING")
            highlighted_segments = [{"t": final_string, "c": False}]

        # Handle CLIP Encoding
        if clip:
            if is_conditioning and "ERROR: WIRING FAULT DETECTED" in final_string:
                _nuclear_log("ABORTING CLIP ENCODE: Subverting Tensor encoding crash.", "ERROR")
            else:
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
            elif is_json and isinstance(mutated_subject, (dict, list)):
                final_data = mutated_subject
                _nuclear_log("Retaining mutated valid JSON/Collection.")
            elif is_conditioning:
                final_data = final_cond if final_cond else mutated_subject
                _nuclear_log("Retaining mutated CONDITIONING or re-encoded block.")
            else:
                final_data = mutated_subject if not isinstance(mutated_subject, str) else final_string
        except Exception as cast_err:
            _nuclear_log(f"RESTORATION FAILED: {cast_err}", "WARNING")
            final_data = final_string

        _nuclear_log("Pipeline Complete.")
        return {"ui": {"text": [final_string], "segments": highlighted_segments}, "result": (final_data, final_string, final_cond)}
