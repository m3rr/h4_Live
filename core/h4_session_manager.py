# FILE: custom_nodes/comfyui_h4_live/h4_server.py
# This file implements the H4_SessionManager class for transient session data management.
import os
import json
import logging
import atexit
from collections import defaultdict
import folder_paths
from PIL import Image
import re

# --- H4 Session Manager ---

class H4_SessionManager:
    """
    Manages a transient JSON database for the current ComfyUI session.
    - Created on init (wiped).
    - Updated on image generation.
    - Deleted on exit (best effort).
    """
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(H4_SessionManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized: return
        self._initialized = True
        
        # Path logic: Use temp dir or extension dir?
        # Displays User requested "extensions/h4_live/h4_session.json" effectively.
        # But writing to extension dir is cleaner for persistence across crashes.
        self.session_file = os.path.join(os.path.dirname(__file__), "h4_session.json")
        
        # Clear on start
        self._wipe_session()
        
        # Register cleanup
        atexit.register(self._cleanup)
        
        self.session_data = {
            "session_id": os.getpid(),
            "history": {}
        }
        
    def _wipe_session(self):
        try:
            if os.path.exists(self.session_file):
                os.remove(self.session_file)
        except Exception as e:
            print(f"[H4_Session] Failed to wipe old session: {e}")

    def _cleanup(self):
        self._wipe_session()

    def update_session(self, timestamp_id, metadata):
        """
        Updates the session database with new image metadata.
        """
        try:
            self.session_data["history"][str(timestamp_id)] = metadata
            
            # Memory Safety: Limit size (Keep last 50)
            if len(self.session_data["history"]) > 50:
                 # Remove oldest (First key)
                 oldest = next(iter(self.session_data["history"]))
                 del self.session_data["history"][oldest]
            
            # Write to disk
            with open(self.session_file, "w", encoding='utf-8') as f:
                json.dump(self.session_data, f, indent=2)
                
        except Exception as e:
            print(f"[H4_Session] Update Failed: {e}")

    def get_session(self):
        """
        Returns full session data.
        """
        return self.session_data

    # --- Metadata Extractor Helper ---
    
    @staticmethod
    def extract_metadata(prompt, unique_id):
        """
        Traces the execution graph upstream from the given node (unique_id)
        to find generation parameters for BOTH Image A and Image B.
        """
        base_meta = {
             "seed": None,
             "sampler_name": "unknown",
             "scheduler": "unknown",
             "steps": 0,
             "cfg": 0.0,
             "ckpt_name": "unknown",
             "vae_name": "unknown",
             "loras": [],
             "clip_skip": None,
             "positive": "",
             "negative": "",
             "width": 0,
             "height": 0,
             "aspect_ratio": "unknown"
        }

        # [NEW] Return Structure: Root keys for compatibility + A/B sub-objects
        meta = {
            "image_id": str(unique_id) if unique_id else None,
            "A": None, # Will be populated if found
            "B": None
        }
        
        if not prompt: return meta

        # --- Helper Functions ---
        
        def get_node(nid):
            return prompt.get(str(nid), {})

        def get_input_link(nid, name):
            """Returns the source node ID for a given input name."""
            node = get_node(nid)
            inp = node.get("inputs", {}).get(name)
            if isinstance(inp, list): return str(inp[0]) # Link [id, slot]
            return None

        # Recursive Trace for specific types
        def find_upstream_nodes(start_nid, target_types, stop_types=None, visited=None, exclude_inputs=None):
            """Finds all nodes of target_types upstream from start_nid."""
            if visited is None: visited = set()
            
            # Prevent infinite loops
            if start_nid in visited: return []
            visited.add(start_nid)
            
            node = get_node(start_nid)
            ctype = node.get("class_type", "")
            
            # [DEBUG TRACE]
            # print(f"[Metadata Debug] Visiting Node {start_nid} ({ctype})")
            
            found = []
            
            # Check match
            for t in target_types:
                if t in ctype:
                    found.append((start_nid, node))

            # Stop if we hit a boundary
            if stop_types:
                for t in stop_types:
                    if t in ctype and start_nid != unique_id:
                         return found 

            # [NEW] Smart Switch Logic
            inputs = node.get("inputs", {})
            inputs_to_trace = list(inputs.items())

            if "Switch" in ctype:
                try:
                    # Boolean Switch (Crystools, Impact, etc)
                    switch_val = inputs.get("boolean")
                    if switch_val is not None and not isinstance(switch_val, list):
                        target_input = "on_true" if switch_val else "on_false"
                        if target_input in inputs:
                            # print(f"[Metadata Debug] Switch '{ctype}' is {switch_val} -> Tracing '{target_input}' only.")
                            inputs_to_trace = [(target_input, inputs[target_input])]

                    # Index Switch
                    select_val = inputs.get("select") or inputs.get("index")
                    if select_val is not None and not isinstance(select_val, list):
                        target_input = f"input{select_val}"
                         # Some nodes use 0-based, some 1-based. Check both.
                        if target_input in inputs:
                            # print(f"[Metadata Debug] Switch '{ctype}' index {select_val} -> Tracing '{target_input}' only.")
                            inputs_to_trace = [(target_input, inputs[target_input])]
                        elif str(select_val) == "0" and "input1" in inputs: # Maybe 1-based?
                             pass 
                        elif f"input{int(select_val)+1}" in inputs:
                            target_input = f"input{int(select_val)+1}"
                            # print(f"[Metadata Debug] Switch '{ctype}' index {select_val} -> Tracing '{target_input}' (adjusted) only.")
                            inputs_to_trace = [(target_input, inputs[target_input])]

                except Exception as e:
                    pass # print(f"[Metadata Debug] Switch logic error: {e}")

            # Trace inputs
            for k, v in inputs_to_trace:
                if exclude_inputs and k in exclude_inputs:
                     # print(f"[Metadata Debug] Skipping excluded input: {k}")
                     continue

                if isinstance(v, list):
                    # Link [id, slot]
                    # print(f"  -> Tracing input {k} to {v[0]}")
                    found.extend(find_upstream_nodes(str(v[0]), target_types, stop_types, visited, exclude_inputs))
            
            return found

        # --- Extractor Helper ---
        def extract_single_source_meta(source_node_id):
            if not source_node_id: return None
            
            # Clone defaults
            m = base_meta.copy()
            
            # 2. Trace back to KSampler / Common Loaders
            samplers = find_upstream_nodes(source_node_id, ["KSampler", "Efficient Loader", "Ksampler", "Sampler", "UltimateSDUpscale"])
            
            if samplers:
                target_id, target_node = samplers[0] # Takes first one
                widgets = target_node.get("inputs", {}) # Usually inputs for samplers
                
                # Helper to get value (handle widget vs input)
                def get_val(keys):
                    for k in keys:
                        if k in widgets:
                            val = widgets[k]
                            if not isinstance(val, list): return val
                    return None

                m["seed"] = get_val(["seed", "noise_seed", "seed_int"])
                m["steps"] = get_val(["steps", "total_steps", "steps_total"])
                m["cfg"] = get_val(["cfg", "cfg_scale", "ovr_cfg"])
                m["sampler_name"] = get_val(["sampler_name", "sampler"]) or "unknown"
                m["scheduler"] = get_val(["scheduler", "schedule"]) or "unknown"
                m["denoise"] = get_val(["denoise", "denoising_strength"])
                
                # --- GENERIC TRACER HELPERS ---
                
                # Keys to follow for pipelines
                PIPE_KEYS = ["basic_pipe", "pipe", "bus"]

                def trace_model_chain(start_id, visited=None):
                    if not start_id: return "unknown", [], None
                    if visited is None: visited = set()
                    if start_id in visited: return "unknown", [], None
                    visited.add(start_id)

                    node = get_node(start_id)
                    ctype = node.get("class_type", "")
                    inputs = node.get("inputs", {})

                    print(f"[Metadata Debug] Tracing Model Node: {start_id} ({ctype})")

                    current_loras = []
                    
                    def extract_node_loras(inputs):
                        found = []
                        lname = inputs.get("lora_name")
                        if lname and isinstance(lname, str) and lname != "None":
                             str_m = inputs.get("strength_model", 1.0)
                             found.append({"name": lname, "strength": str_m})

                        for i in range(1, 10):
                            k_name = f"lora_{i}"
                            val = inputs.get(k_name)
                            if val and isinstance(val, str) and val != "None":
                                s = inputs.get(f"strength_model_{i}", inputs.get(f"strength_{i}", 1.0))
                                found.append({"name": val, "strength": s})
                        return found

                    # 1. STOP: Checkpoint / Loader
                    if "CheckpointLoader" in ctype or "Loader" in ctype:
                         name = inputs.get("ckpt_name")
                         if not name: name = inputs.get("model")
                         
                         if isinstance(name, str): 
                             print(f"[Metadata Debug] FOUND Checkpoint: {name}")
                             current_loras.extend(extract_node_loras(inputs))
                             return name, current_loras, start_id

                    # 2. CONTINUE: Lora Loader
                    if "LoraLoader" in ctype:
                        current_loras.extend(extract_node_loras(inputs))
                        # Trace 'model'
                        res_ckpt, res_loras, res_id = trace_model_chain(get_input_link(start_id, "model"), visited)
                        return res_ckpt, res_loras + current_loras, res_id

                    # 3. RECURSE: Follow Links (Model -> Pipe)
                    link_candidates = ["model"] + PIPE_KEYS
                    for key in link_candidates:
                        if key in inputs:
                            res_ckpt, res_loras, res_id = trace_model_chain(get_input_link(start_id, key), visited)
                            if res_ckpt != "unknown":
                                return res_ckpt, res_loras + current_loras, res_id

                    return "unknown", [], None

                def trace_vae_chain(start_id, visited=None):
                    if not start_id: return "unknown"
                    if visited is None: visited = set()
                    if start_id in visited: return "unknown"
                    visited.add(start_id)
                    
                    node = get_node(start_id)
                    ctype = node.get("class_type", "")
                    inputs = node.get("inputs", {})
                    
                    if "VAELoader" in ctype: return inputs.get("vae_name") or "unknown"
                    if "CheckpointLoader" in ctype or "Loader" in ctype: return inputs.get("vae_name") or "Baked VAE"
                        
                    link_candidates = ["vae"] + PIPE_KEYS
                    for key in link_candidates:
                        if key in inputs:
                            res = trace_vae_chain(get_input_link(start_id, key), visited)
                            if res != "unknown": return res
                        
                    return "unknown"

                def trace_clip_chain(start_id, visited=None):
                    """Traces CLIP to find Skip."""
                    if not start_id: return None
                    if visited is None: visited = set()
                    if start_id in visited: return None
                    visited.add(start_id)

                    node = get_node(start_id)
                    ctype = node.get("class_type", "")
                    inputs = node.get("inputs", {})

                    if "CLIPSetLastLayer" in ctype: return inputs.get("stop_at_clip_layer")
                    if "Loader" in ctype:
                        val = inputs.get("clip_skip")
                        if val: return val

                    # Trace upstream
                    link_candidates = ["clip", "conditioning"] + PIPE_KEYS
                    for key in link_candidates:
                         if key in inputs:
                             res = trace_clip_chain(get_input_link(start_id, key), visited)
                             if res: return res

                    return None
                    
                def extract_text_chain(start_id, visited=None):
                    """Recursively finds text prompt from conditioning/text inputs."""
                    if not start_id: return ""
                    if visited is None: visited = set()
                    if start_id in visited: return ""
                    visited.add(start_id)
                    
                    node = get_node(start_id)
                    ctype = node.get("class_type", "")
                    inputs = node.get("inputs", {})
                    
                    # 1. Direct Text Found?
                    txt = inputs.get("text") or inputs.get("string") or inputs.get("text_g") or inputs.get("text_l")
                    if isinstance(txt, str) and len(txt) > 0: return txt
                    
                    # 2. Recurse
                    # Prefer 'text' input links (primitive nodes)
                    # Then 'conditioning', 'positive', 'negative', 'clip'
                    # Then pipes
                    # Added conditioning_1/2 for combiners
                    link_candidates = ["text", "string", "conversation", "conditioning", "positive", "negative", "conditioning_1", "conditioning_2", "clip"] + PIPE_KEYS
                    
                    for key in link_candidates:
                        if key in inputs:
                            res = extract_text_chain(get_input_link(start_id, key), visited)
                            if res: return res
                            
                    return ""

                # ── EXECUTION ──
                
                # Checkpoints & LoRAs
                model_source = get_input_link(target_id, "model")
                ckpt, loras, loader_id = trace_model_chain(model_source) # Get loader_id
                m["ckpt_name"] = ckpt
                m["loras"] = loras

                # VAE (Trace or Fallback to Loader)
                vae_source = get_input_link(target_id, "vae")
                m["vae_name"] = trace_vae_chain(vae_source)
                
                # If VAE is unknown, try to get it from the Checkpoint Loader we found!
                if m["vae_name"] == "unknown" and loader_id:
                     loader_node = get_node(loader_id)
                     # Check if it has a vae_name input
                     lname = loader_node.get("inputs", {}).get("vae_name")
                     if lname:
                         m["vae_name"] = lname
                     # Note: If lname matches "Baked / None", it's good.
                     elif "CheckpointLoader" in loader_node.get("class_type", ""):
                         m["vae_name"] = "Baked VAE"

                # CLIP SKIP
                pos_source = get_input_link(target_id, "positive")
                m["clip_skip"] = trace_clip_chain(pos_source)
                
                # PROMPTS
                # Trace positive/negative recursing upstream
                m["positive"] = extract_text_chain(pos_source)
                
                neg_source = get_input_link(target_id, "negative")
                m["negative"] = extract_text_chain(neg_source)
                
                print(f"[Metadata Debug] Extracted: CKPT={ckpt} | LORAS={len(loras)} | VAE={m['vae_name']} | SKIP={m['clip_skip']}")
                
                
                # 4. Dimensions (Width/Height)
                # Trace 'latent_image' input on Sampler to find EmptyLatentImage
                latent_source = get_input_link(target_id, "latent_image")
                if latent_source:
                    latents = find_upstream_nodes(latent_source, ["EmptyLatentImage", "LatentUpscale", "ImageScale"])
                    if latents:
                        l_id, l_node = latents[0]
                        # EmptyLatentImage has width/height inputs
                        w = l_node.get("inputs", {}).get("width")
                        h = l_node.get("inputs", {}).get("height")
                        
                        if w and h:
                            m["width"] = w
                            m["height"] = h
                            # Use helper if available
                            try:
                                m["aspect_ratio"] = H4_SessionManager.calculate_aspect_ratio(w, h)
                            except:
                                m["aspect_ratio"] = f"{w}:{h}"

            # Fallback for LoadImage (Static Source)
            if not m["seed"]:
                # Check if source node is LoadImage
                # We need source_node object
                src = get_node(source_node_id)
                ctype = src.get("class_type", "")
                
                if "LoadImage" in ctype or "Loader" in ctype:
                    # Try to get filename
                    widgets = src.get("inputs", {}) # API inputs
                    # In API, LoadImage 'image' is in inputs
                    fname = widgets.get("image")
                    
                    if fname and isinstance(fname, str):
                        try:
                            image_path = folder_paths.get_annotated_filepath(fname)
                            if os.path.exists(image_path):
                                with Image.open(image_path) as img:
                                    info = img.info or {}
                                    params = info.get("parameters", "")
                                    
                                    if params:
                                        # 1. Extract Prompts (Simpler Approach)
                                        # Split by "Negative prompt:"
                                        parts = params.split("Negative prompt:")
                                        if len(parts) > 0:
                                            m["positive"] = parts[0].strip()
                                        if len(parts) > 1:
                                            # Negative is parts[1] until "Steps:"
                                            neg_part = parts[1].split("Steps:")[0]
                                            m["negative"] = neg_part.strip()
                                            
                                        # 2. Extract Key-Values
                                        # "Steps: 20, Sampler: ..., CFG scale: ..., Seed: ..."
                                        # Regex for numbers
                                        
                                        def extract_val(key, cast=str):
                                            # Matches "Key: Value," or "Key: Value" (end of string)
                                            # Example: "Steps: 20,"
                                            r = re.search(f"{key}: ([^,]+)", params)
                                            if r:
                                                try:
                                                    return cast(r.group(1))
                                                except: return None
                                            return None

                                        m["seed"] = extract_val("Seed", int) or extract_val("seed", int)
                                        m["steps"] = extract_val("Steps", int)
                                        m["cfg"] = extract_val("CFG scale", float)
                                        m["sampler_name"] = extract_val("Sampler")
                                        m["scheduler"] = extract_val("Scheduler")
                                        m["model"] = extract_val("Model") # Model hash usually?
                                        
                                        # Dimensions from Size: 512x768
                                        size_match = re.search(r"Size: (\d+)x(\d+)", params)
                                        if size_match:
                                            m["width"] = int(size_match.group(1))
                                            m["height"] = int(size_match.group(2))
                                            try:
                                                m["aspect_ratio"] = H4_SessionManager.calculate_aspect_ratio(m["width"], m["height"])
                                            except: pass
                        except Exception as e:
                            print(f"[H4_SessionManager] Failed to read metadata from file {fname}: {e}")

            return m

        # --- Execution ---

        # 1. Find Source IDs
        source_a = get_input_link(unique_id, "image_a")
        source_b = get_input_link(unique_id, "image_b")
        
        # 2. Extract
        meta["A"] = extract_single_source_meta(source_a)
        meta["B"] = extract_single_source_meta(source_b)
        
        # 3. Flatten B into root for backward compatibility?
        # The user seems to want separate tabs.
        # But `h4_comparinator.py` manual save might rely on root keys?
        # Let's populate root keys from B (default Result) just in case.
        if meta["B"]:
            for k, v in meta["B"].items():
                if k not in meta: meta[k] = v

        return meta



    @staticmethod
    def calculate_aspect_ratio(w, h):
        if not w or not h: return "unknown"
        r = w / h
        
        # Standard Ratios
        ratios = {
            (16, 9): 1.777,
            (9, 16): 0.5625,
            (4, 3): 1.333,
            (3, 4): 0.75,
            (1, 1): 1.0,
            (21, 9): 2.333,
            (3, 2): 1.5,
            (2, 3): 0.666
        }
        
        best_match = "custom"
        min_diff = 0.05 # Tolerance
        
        for (rw, rh), val in ratios.items():
            if abs(r - val) < min_diff:
                best_match = f"{rw}:{rh}"
                break
                
        return best_match

# Singleton
session_manager = H4_SessionManager()
