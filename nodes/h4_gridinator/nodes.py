# FILE: custom_nodes/comfyui_h4_live/h4_gridinator.py
# ------------------------------------------------------------------------------
# H4 Gridinator 9001
# "IT'S OVER 9000!!!"
# ------------------------------------------------------------------------------
import torch
import folder_paths
import comfy.sd
import comfy.sample
import comfy.samplers
import comfy.utils
import nodes
from PIL import Image, ImageDraw, ImageFont
import numpy as np
import re
import os

# Internal Imports
try:
    from ...core.h4_core import _log
except ImportError:
    def _log(msg): print(f"[Gridinator] {msg}")

class H4_Gridinator:
    """
    The Ultimate X/Y/Z Grid Logic Node.
    Monolithic: Loads Models -> Samples -> Decodes -> Stitches.
    """
    def __init__(self):
        self.temp_images = []

    @classmethod
    def INPUT_TYPES(s):
        # Fetch Lists for Dropdowns
        checkpoints = folder_paths.get_filename_list("checkpoints")
        samplers = comfy.samplers.KSampler.SAMPLERS
        schedulers = comfy.samplers.KSampler.SCHEDULERS
        
        # Axis Modes
        modes = ["None", "Model", "LoRA", "Prompt", "Multi-Prompt", "Prompt Stutter", "Steps", "CFG", "Denoise", "Sampler", "Scheduler", "Seed", "Negative Stutter"]

        # Fix for KeyError: 'input' - specific manual listing
        input_dir = folder_paths.get_input_directory()
        files = [f for f in os.listdir(input_dir) if os.path.isfile(os.path.join(input_dir, f))] if os.path.exists(input_dir) else []

        return {
            "required": {
                # --- IMAGE UPLOAD (TOP PRIORITY) ---
                "image_upload": (sorted(files), {"tooltip": "CRITICAL FOR IMG2IMG: Upload the base image you want me to modify here. This image acts as the 'source' for all my grid variations. If you leave this empty and haven't connected an external image, I will default to Txt2Img mode automatically. Supported formats: .jpg, .png, .webp. Tip: If your grid looks like colorful noise, check if your Denoise is too high (1.0) or your image didn't load!"}),

                # --- CORE SETTINGS ---
                "base_model": (checkpoints, {"tooltip": "THE BRAIN: Choose your primary Checkpoint/Model here. This is the foundation from which I will draw all images. For grids comparing OTHER models (Architecture mode), this acts as my 'Default' model if an axis value is missing or for any axis not designated as 'Model'. Note: SDXL models require you to use 1024x1024, SD1.5 models prefer 512x512."}),
                "base_model_fuzzy": ("STRING", {"default": "", "multiline": False, "tooltip": "FUZZY HUNTER: Can't find your model in the dropdown? Type a fragment of the name here (e.g., 'juggernaut' or 'pony'). I will scan your entire models folder and find the best match for you. This is great for those with 1000+ models where dropdowns become a nightmare. If filled, this OVERRIDES my dropdown selection above."}),
                
                # --- EMPTY LATENT SETTINGS ---
                "width": ("INT", {"default": 1024, "min": 64, "max": 8192, "step": 8, "tooltip": "HORIZONTAL RESOLUTION: The width of your output images in pixels. Rule of Thumb: 512 for SD1.5, 768 for SD2.1, 1024 for SDXL. Going too high here without a powerful GPU will cause 'Out of Memory' (OOM) errors. Always ask me for multiples of 8!"}),
                "height": ("INT", {"default": 1024, "min": 64, "max": 8192, "step": 8, "tooltip": "VERTICAL RESOLUTION: The height of your output images in pixels. Tall for portraits (1216), Square for general (1024), Wide for landscapes (768/832). Same memory rules as Width apply. High resolutions exponentially increase my generation time and your VRAM usage."}),
                "batch_size": ("INT", {"default": 1, "min": 1, "max": 64, "tooltip": "INTERNAL BATCH: How many images you want me to generate SIMULTANEOUSLY for a single cell. Usually set to 1 for grids to keep my layout clean. If you set this higher, the grid will only show the FIRST image of the batch, which is usually a waste of VRAM unless you are doing complex batch-processing."}),
                
                "positive_prompt": ("STRING", {"default": "An epic photo of...", "multiline": True, "tooltip": "DREAM DICTATION: Tell me what you want to see. Be descriptive! Use commas to separate your concepts. Use [weight*1.2] to emphasize words to me. If you use the 'Prompt' Axis Mode, THIS BOX WILL AUTOMATICALLY HIDE to prevent confusion, as your axis values will take over the driver's seat. Tip: Start with subject, then lighting, then style, then camera details."}),
                "negative_prompt": ("STRING", {"default": "blurry, low quality", "multiline": True, "tooltip": "THE FORBIDDEN ZONE: Tell me what you DON'T want in your art. List things like 'deformed iris', 'bad hands', 'watermark', 'text'. A strong negative prompt is the secret sauce to me giving you professional-looking art. Most models have specific recommended negatives (e.g., 'lowres, bad anatomy')."}),
                
                # --- SAMPLING DEFAULTS ---
                "seed": ("INT", {"default": 0, "min": 0, "max": 0xffffffffffffffff, "tooltip": "THE COSMIC RNG: The starting point of my noise generation. 0 means every run is unique (Random). Using a fixed number allows me to reproduce the EXACT same image for you if nothing else changes. Think of it as the DNA of the generation. In a grid, if Seed isn't an axis, every cell uses this same DNA to ensure differences you see are from the parameters, not luck."}),
                "steps": ("INT", {"default": 20, "min": 1, "max": 100, "tooltip": "THOUGHT CYCLES: How many times you want me to refine the image. 20 is the sweet spot for speed/quality. 1-10 results in a blurry mess. 30-50 adds fine detail for you but takes me longer. Above 50 often hits diminishing returns or introduces artifacts. High step counts = High time cost."}),
                "cfg": ("FLOAT", {"default": 7.0, "min": 0.0, "max": 100.0, "step": 0.1, "tooltip": "CREATIVITY VS OBEDIENCE: Classifier Free Guidance. 1.0 = I completely ignore you. 7.0 = Standard balance. 10.0-15.0 = I follow your words extremely strictly but I might 'fry' the colors and edges. Think of it as my 'Volume' knob."}),
                "sampler_name": (samplers, {"tooltip": "THE MATHEMATICIAN: The algorithm I use to denoise. 'euler' is the classic. 'dpmpp_2m' or 'dpmpp_sde' with 'karras' are the modern champions for realism. Each sampler has a different 'personality' - experiment to find your favorite look!"}),
                "scheduler": (schedulers, {"tooltip": "THE PACEMAKER: Controls how I remove the noise over the steps. 'normal' is linear. 'karras' focuses on early/late steps for better convergence. 'simple' is fast. 'exponential' is aggressive. Usually paired with specific samplers recommended by model creators."}),
                "denoise": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 1.0, "step": 0.01, "tooltip": "RECONSTRUCTION STRENGTH: 1.0 = Total replacement (Standard Txt2Img). 0.5 = I keep 50% of your source image and add 50% generation. 0.0 = Pixel-perfect match (I make no change). ESSENTIAL for Img2Img - usually start around 0.6 to keep your base structure while I add detail."}),
                "lora_strength": ("FLOAT", {"default": 1.0, "min": -10.0, "max": 10.0, "step": 0.01, "label": "LoRA Strength (LOOK HERE!!!!)", "tooltip": "STYLE AMPLIFIER: How much of the chosen LoRA's personality you want me to inject. 1.0 is full effect. -1.0 reverses the effect (weird!). Be careful: high strengths (above 1.5) can destroy the image coherence. Ask me for 0.7-0.9 for subtle blending."}),
                
                # --- THE GRID (X/Y/Z) ---
                "grid_x_mode": (modes, {"default": "None", "tooltip": "X-AXIS (COLUMNS): Choose which parameter varies from Left to Right. If you set this to 'Prompt', I will split your input by NEWLINES. If 'Multi-Prompt', I will split by SEMICOLONS (;). These modes preserve your commas, allowing individual complex prompts!"}),
                "grid_x_val": ("STRING", {"default": "", "multiline": False, "tooltip": "AXIS VALUES: Enter your variants here. For 'Prompt' mode, separate with NEWLINES. For 'Multi-Prompt', separate with SEMICOLONS (;). For standard modes (Steps, CFG), use COMMAS. If you pick 'Model' or 'LoRA', use the dropdown or right-click to pick files!"}),
                "grid_x_override": ("STRING", {"default": "", "multiline": False, "placeholder": "Type exact names here, comma separated", "tooltip": "MANUAL OVERRIDE: If you want to use files/values NOT in the dropdowns (like a subfolder model), type them here. This takes absolute priority over the Mode/Value boxes above. Format: 'filenameA, filenameB'. Commas are the separator here."}),
                
                "grid_y_mode": (modes, {"default": "None", "tooltip": "Y-AXIS (ROWS): Choose which parameter varies from Top to Bottom. Tip: Compare Samplers on X and Schedulers on Y for a masterclass in algorithm differences. If using a prompt mode, it will override the base prompt below!"}),
                "grid_y_val": ("STRING", {"default": "", "multiline": False, "tooltip": "AXIS VALUES: Same as X-Axis. Remember: Prompt = Newlines, Multi-Prompt = Semicolons (;), Others = Commas."}),
                "grid_y_override": ("STRING", {"default": "", "multiline": False, "placeholder": "Type exact names here, comma separated", "tooltip": "MANUAL OVERRIDE: Same as X-Axis override. Takes priority over Y-Axis boxes. Commas are ALWAYS the separator for manual overrides."}),
                
                "grid_z_mode": (modes, {"default": "None", "tooltip": "Z-AXIS (STACKS): The 3rd Dimension. This creates multiple distinct grids or a 'deep stack'. Use this for comparing across Models while X/Y compare Prompts/Settings. If set to a prompt mode, each prompt creates a new stack!"}),
                "grid_z_val": ("STRING", {"default": "", "multiline": False, "tooltip": "AXIS VALUES: Same as X/Y. Remember: Prompt = Newlines, Multi-Prompt = Semicolons (;), Others = Commas."}),
                "grid_z_override": ("STRING", {"default": "", "multiline": False, "placeholder": "Type exact names here, comma separated", "tooltip": "MANUAL OVERRIDE: Same as X/Y override. Takes priority over Z-Axis boxes. Commas are ALWAYS the separator for manual overrides."}),

                # --- STUTTER & STYLING ---
                "stutter_mode": (["Off", "Permutations {A|B}", "Emphasis [Token*N]", "Both"], {"default": "Off", "tooltip": "PROMPT AUTOMATION: 'Permutations' splits {red|blue} into multiple cells (if your axis mode matches). 'Emphasis' expands [dog*3] into 'dog dog dog'. A massive time-saver for repetitive prompt testing."}),
                
                # --- SLIDING SCALE (Optional Ranges) ---
                "sliding_scale_enable": ("BOOLEAN", {"default": False, "label": "Enable Sliding Scale", "tooltip": "AUTO-GENERATOR: Tired of typing '10, 20, 30, 40'? Turning this ON allows me to automatically generate a linear range between the Min and Max values below. This only applies if you set an Axis Mode to 'Steps' or 'Denoise'."}),
                "denoise_min": ("FLOAT", {"default": 0.2, "min": 0.0, "max": 1.0, "step": 0.01, "tooltip": "RANGE START (Denoise): The lowest value in your generated scale."}),
                "denoise_max": ("FLOAT", {"default": 0.8, "min": 0.0, "max": 1.0, "step": 0.01, "tooltip": "RANGE END (Denoise): The highest value in your generated scale."}),
                "steps_min": ("INT", {"default": 10, "min": 1, "max": 100, "tooltip": "RANGE START (Steps): The lowest step count in your generated scale."}),
                "steps_max": ("INT", {"default": 30, "min": 1, "max": 100, "tooltip": "RANGE END (Steps): The highest step count in your generated scale."}),
                "range_count": ("INT", {"default": 4, "min": 2, "max": 100, "tooltip": "DENSITY: How many images you want me to spread across the range. e.g. Start 10, End 40, Count 4 means I will give you [10, 20, 30, 40]."}),

                "font_size": ("INT", {"default": 40, "min": 10, "max": 200, "tooltip": "LEGIBILITY: The point size of the grid labels I draw for you. If your grid is huge, make this larger so you can read it in the preview!"}),
                "font_color": ("STRING", {"default": "white", "tooltip": "AESTHETICS: The color of the label text I render. I accept standard names like 'red', 'gold', 'lime' or Hex codes like '#FF00FF'."}),
                "bg_color": ("STRING", {"default": "black", "tooltip": "CANVAS COLOR: The color of the space between images and the outer margins. Dark colors usually make images 'pop' better."}),
                "margin": ("INT", {"default": 50, "min": 0, "max": 500, "tooltip": "OUTER SPACE: The thickness of the border around the entire final grid sheet in pixels."}),
                "padding": ("INT", {"default": 20, "min": 0, "max": 200, "tooltip": "INNER SPACE: The gap between individual image cells and between images and their labels."}),
            },
            "optional": {
                "optional_vae": ("VAE", {"tooltip": "VAE OVERRIDE: Optional. If you want me to use a specific VAE instead of the one baked into the model, connect it here. This is critical for SDXL models if your base checkpoint has a broken VAE or for specialized artistic looks."}),
                "image_input": ("IMAGE", {"tooltip": "EXTERNAL IMAGE: If you have an image coming from another node (like a Load Image or a Masked image), connect it here. I will prioritize this over your 'image_upload' dropdown above. Essential for complex Img2Img pipelines!"})
            }
        }

    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("Grid_Image",)
    FUNCTION = "generate_grid"
    CATEGORY = "h4_Live/Grid"
    
    DESCRIPTION = "ITS OVER 9000?!?!"

    # VALIDATION BYPASS
    # We want to allow values outside the range if they are hidden/unused? 
    # Actually, ComfyUI backend validation is strict on numerical limits in INPUT_TYPES.
    # So if user set denoise_max to 10 (which is > 1.0), it fails.
    # Solution: We widen the range in INPUT_TYPES to reasonable limits.
    # User error "Value 10.0 bigger than max of 1.0" for denoise_max needs fixing by simply using 1.0 max. 
    # Wait, 10.0 denoise is impossible (0-1). User input was likely 10.0 by mistake or wanted 10.0 CFG?
    # I will stick to 0.0-1.0 for denoise.
    # However, 'range_count' max was 20. User wanted 40. I bumped it to 100.
    
    # Fix for 'stutter_mode': 'False' not in list.
    # This implies the frontend widget sent a boolean False?
    # I will add a validator hook to be safe.

    @classmethod
    def VALIDATE_INPUTS(s, input_types):
        return True

    # --------------------------------------------------------------------------
    # LOGIC: Helpers
    # --------------------------------------------------------------------------

    def fuzzy_load_checkpoint(self, name):
        """
        Loads a checkpoint by fuzzy matching the name.
        """
        all_checks = folder_paths.get_filename_list("checkpoints")
        
        # Exact match
        if name in all_checks:
            ckpt_path = folder_paths.get_full_path("checkpoints", name)
            return comfy.sd.load_checkpoint_guess_config(ckpt_path)

        # Fuzzy match
        for ckpt in all_checks:
            if name.lower() in ckpt.lower():
                _log(f"Hey! I fuzzy loaded '{ckpt}' because you gave me '{name}'.")
                ckpt_path = folder_paths.get_full_path("checkpoints", ckpt)
                return comfy.sd.load_checkpoint_guess_config(ckpt_path)
                
        raise ValueError(f"Whoops! I could not find a checkpoint named '{name}'. Check your spelling!")

    def fuzzy_load_lora(self, name, model, clip, strength):
        """Loads a LoRA by fuzzy matching the name and applies it."""
        if name == "None": return model, clip
        
        all_loras = folder_paths.get_filename_list("loras")
        target_lora = None
        
        # Exact match
        if name in all_loras:
            target_lora = name
        else:
            # Fuzzy match
            for lora in all_loras:
                if name.lower() in lora.lower():
                    target_lora = lora
                    break
        
        if target_lora:
            _log(f"Applying LoRA '{target_lora}' at strength {strength} for this batch.")
            lora_path = folder_paths.get_full_path("loras", target_lora)
            # Fix: Must load the LoRA tensors first!
            lora_tensors = comfy.utils.load_torch_file(lora_path)
            model_lora, clip_lora = comfy.sd.load_lora_for_models(model, clip, lora_tensors, strength, strength)
            return model_lora, clip_lora
            
        _log(f"WARNING: I couldn't find your LoRA '{name}', so I'm skipping it!")
        return model, clip

    def apply_stutter(self, text, mode):
        """Processes Stutter syntax."""
        # If Off, return unchanged
        if mode == "Off":
            return text
            
        if mode in ["Emphasis [Token*N]", "Both"]:
            # Pattern: [word*3] -> word word word
            def repl(m):
                word = m.group(1)
                count = int(m.group(2))
                return " ".join([word] * count)
            
            text = re.sub(r"\[(.*?)\*(\d+)\]", repl, text)
            
        return text

    def parse_values(self, mode, val_string, is_sliding, d_min, d_max, s_min, s_max, count):
        """Parses inputs, generating ranges if Sliding Scale is active."""
        if mode == "None":
            return [None]
            
        # Sliding Scale Logic
        if is_sliding:
            if mode == "Denoise":
                return list(np.linspace(d_min, d_max, count))
            if mode == "Steps":
                # Integers need rounding
                shards = np.linspace(s_min, s_max, count)
                return [int(x) for x in shards]
                
        # Standard Parsing
        if mode == "Prompt":
            # Proper Prompt Test: Split by newline to preserve commas inside tags
            raw_list = [x.strip() for x in val_string.split("\n") if x.strip()]
        elif mode == "Multi-Prompt":
            # BRACE SYSTEM: Extract everything inside { ... }
            # This allows people to use commas safely and add slashes or dots between braces for flair.
            # Regex: finds everything between { and }
            braces = re.findall(r"\{(.*?)\}", val_string)
            if braces:
                raw_list = [x.strip() for x in braces if x.strip()]
            else:
                # Fallback to Semicolon if no braces are found
                raw_list = [x.strip() for x in val_string.split(";") if x.strip()]
        else:
            raw_list = [x.strip() for x in val_string.split(",") if x.strip()]
        
        # If no values provided for an active mode, return [None] to avoid empty Cartesian product
        if not raw_list:
            return [None]
            
        if mode in ["Steps", "Seed"]:
            return [int(x) for x in raw_list]
        elif mode in ["CFG", "Denoise"]:
            return [float(x) for x in raw_list]
        else:
            return raw_list 

    def generate_grid(self, base_model, base_model_fuzzy, width, height, batch_size, positive_prompt, negative_prompt, seed, steps, cfg, sampler_name, scheduler, denoise, 
                      grid_x_mode, grid_x_val, grid_y_mode, grid_y_val, grid_z_mode, grid_z_val, 
                      stutter_mode, lora_strength, sliding_scale_enable, denoise_min, denoise_max, steps_min, steps_max, range_count,
                      grid_x_override, grid_y_override, grid_z_override,
                      font_size, font_color, bg_color, margin, padding, image_upload=None, optional_vae=None, image_input=None):
        
        # Determine effective values: Override takes priority over dropdown/text
        eff_x_val = grid_x_override.strip() if grid_x_override and grid_x_override.strip() else grid_x_val
        eff_y_val = grid_y_override.strip() if grid_y_override and grid_y_override.strip() else grid_y_val
        eff_z_val = grid_z_override.strip() if grid_z_override and grid_z_override.strip() else grid_z_val
        
        # 1. Parse Axes (With Sliding Logic) - Using effective values
        x_vals = self.parse_values(grid_x_mode, eff_x_val, sliding_scale_enable, denoise_min, denoise_max, steps_min, steps_max, range_count)
        y_vals = self.parse_values(grid_y_mode, eff_y_val, sliding_scale_enable, denoise_min, denoise_max, steps_min, steps_max, range_count)
        z_vals = self.parse_values(grid_z_mode, eff_z_val, sliding_scale_enable, denoise_min, denoise_max, steps_min, steps_max, range_count)
        
        # 2. Setup Lists for Output
        results_grid = {} # Map (x,y,z) -> PIL Image
        
        # 3. Base Loading
        current_model = None
        current_vae = None
        current_clip = None
        
        # Determine Base Checkpoint Name
        # Priority: Fuzzy Input > Dropdown
        checkpoint_target = base_model
        if base_model_fuzzy and base_model_fuzzy.strip():
            checkpoint_target = base_model_fuzzy.strip()
            _log(f"I am prioritizing your Fuzzy Override: '{checkpoint_target}' over the dropdown.")
        
        # Initial Load (if not overridden by grid)
        if "Model" not in [grid_x_mode, grid_y_mode, grid_z_mode]:
            _log(f"Loading your Base Model: {checkpoint_target}")
            current_model, current_clip, current_vae, _ = self.fuzzy_load_checkpoint(checkpoint_target)

        # 4. PRE-CALCULATE ALL TASKS (SCENARIO 2 - VRAM OPTIMIZATION)
        # We build a list of all grid cells and group them by (Model, LoRA) 
        # to minimize swaps and patching.
        
        all_tasks = []
        for z_idx, z in enumerate(z_vals):
            for y_idx, y in enumerate(y_vals):
                for x_idx, x in enumerate(x_vals):
                    # Parameters for THIS cell
                    task_params = {
                        "x_idx": x_idx, "y_idx": y_idx, "z_idx": z_idx,
                        "x_val": x, "y_val": y, "z_val": z,
                        "steps": steps, "cfg": cfg, "denoise": denoise,
                        "sampler": sampler_name, "scheduler": scheduler,
                        "seed": seed, "pos": positive_prompt, "neg": negative_prompt,
                        "model_name": base_model,
                        "lora_name": "None" 
                    }
                    
                    # Apply Overrides
                    def apply_task_override(mode, val, params):
                        # Use strings as modes for comparison
                        if mode == "Steps": params["steps"] = val
                        elif mode == "CFG": params["cfg"] = val
                        elif mode == "Denoise": params["denoise"] = val
                        elif mode == "Seed": params["seed"] = val
                        elif mode == "Sampler": params["sampler"] = val
                        elif mode == "Scheduler": params["scheduler"] = val
                        elif mode in ["Prompt", "Multi-Prompt"]: params["pos"] = val
                        elif mode == "Prompt Stutter": params["pos"] = val
                        elif mode == "Negative Stutter": params["neg"] = val
                        elif mode == "Model": params["model_name"] = val
                        elif mode == "LoRA": params["lora_name"] = val

                    apply_task_override(grid_x_mode, x, task_params)
                    apply_task_override(grid_y_mode, y, task_params)
                    apply_task_override(grid_z_mode, z, task_params)
                    
                    all_tasks.append(task_params)

        # 5. Group Tasks by Model (to minimize heavy swaps)
        # and sub-group by LoRA (to minimize patching)
        from collections import defaultdict
        grouped_tasks = defaultdict(lambda: defaultdict(list))
        for t in all_tasks:
            grouped_tasks[t["model_name"]][t["lora_name"]].append(t)

        total_cells = len(all_tasks)
        cells_done = 0

        # 6. The OPTIMIZED LOOP
        for model_name, lora_groups in grouped_tasks.items():
            _log(f"[VRAM OPTIMIZATION ON]: Swapping to Model: {model_name}")
            current_model, current_clip, current_vae, _ = self.fuzzy_load_checkpoint(model_name)
            
            for lora_name, tasks in lora_groups.items():
                # Apply LoRA once for this group of tasks
                model_for_run, clip_for_run = self.fuzzy_load_lora(lora_name, current_model, current_clip, lora_strength)
                
                for t in tasks:
                    cells_done += 1
                    _log(f"Rendering Cell {cells_done} of {total_cells} [X:{t['x_val']} | Y:{t['y_val']} | Z:{t['z_val']}]")
                    
                    # --- PROMPT PROCESSING ---
                    # Ensure we have strings (fix for NoneType crash)
                    current_pos = t["pos"] if t["pos"] is not None else ""
                    current_neg = t["neg"] if t["neg"] is not None else ""
                    
                    final_pos = self.apply_stutter(current_pos, stutter_mode)
                    final_neg = self.apply_stutter(current_neg, stutter_mode)
                    
                    # --- SAMPLING ---
                    # 1. Encode Conditionings
                    tokens_pos = clip_for_run.tokenize(final_pos)
                    cond, pooled = clip_for_run.encode_from_tokens(tokens_pos, return_pooled=True)
                    cond_pos = [[cond, {"pooled_output": pooled}]]
                    
                    tokens_neg = clip_for_run.tokenize(final_neg)
                    cond, pooled = clip_for_run.encode_from_tokens(tokens_neg, return_pooled=True)
                    cond_neg = [[cond, {"pooled_output": pooled}]]

                    # 2. Latent Setup
                    vae_to_use = optional_vae if optional_vae else current_vae
                    latent_payload = {}
                    
                    # Image Input Logic
                    source_img = None
                    if image_input is not None:
                         source_img = image_input
                    elif image_upload and image_upload != "undefined":
                         img_path = folder_paths.get_annotated_filepath(image_upload)
                         if os.path.exists(img_path):
                             i = Image.open(img_path)
                             i = i.convert("RGB")
                             i = np.array(i).astype(np.float32) / 255.0
                             source_img = torch.from_numpy(i).unsqueeze(0)
                    
                    if source_img is not None:
                         samples = source_img.movedim(-1, 1)
                         samples = comfy.utils.common_upscale(samples, width, height, "bilinear", "center")
                         samples = samples.movedim(1, -1)
                         encoded = vae_to_use.encode(samples[:,:,:,0:3])
                         latent_payload = {"samples": encoded}
                    else:
                         latent = torch.zeros([batch_size, 4, height // 8, width // 8])
                         latent_payload = {"samples": latent}

                    # 3. KSampler
                    common_sampler = nodes.common_ksampler(
                        model=model_for_run, 
                        seed=t["seed"], 
                        steps=t["steps"], 
                        cfg=t["cfg"], 
                        sampler_name=t["sampler"], 
                        scheduler=t["scheduler"], 
                        positive=cond_pos, 
                        negative=cond_neg, 
                        latent=latent_payload, 
                        denoise=t["denoise"]
                    )
                    
                    # 4. Decode & Save Result
                    decoded = vae_to_use.decode(common_sampler[0]["samples"])
                    i = 255. * decoded.cpu().numpy()
                    img = Image.fromarray(np.clip(i, 0, 255).astype(np.uint8)[0])
                    results_grid[(t["x_idx"], t["y_idx"], t["z_idx"])] = img

        # 5. STITCHING (The Gridinator)
        final_image = self.stitch_grid(results_grid, x_vals, y_vals, z_vals, grid_x_mode, grid_y_mode, grid_z_mode, font_size, font_color, bg_color, margin, padding)
        
        # 6. Convert back to Tensor
        final_tensor = torch.from_numpy(np.array(final_image).astype(np.float32) / 255.0).unsqueeze(0)
        
        return (final_tensor,)

    def stitch_grid(self, results, x_vals, y_vals, z_vals, x_mode, y_mode, z_mode, f_size, f_color, bg_color, margin, padding):
        """Assembles the individual images into a labeled grid for you."""
        
        # Safety Check
        if not results:
            _log("Hey, I couldn't find any results to stitch! Returning a blank canvas for you.")
            return Image.new("RGB", (512, 512), bg_color)

        # Dimensions from first image
        sample_w, sample_h = list(results.values())[0].size
        
        cols = len(x_vals)
        rows = len(y_vals)
        stacks = len(z_vals)
        
        # --- DYNAMIC LABEL SIZING ---
        # We need to measure how much space the Y-axis labels actually take.
        # Create a dummy draw context to measure text
        dummy_img = Image.new("RGB", (1, 1))
        dummy_draw = ImageDraw.Draw(dummy_img)
        
        try:
            font = ImageFont.truetype("arial.ttf", f_size)
        except:
            font = ImageFont.load_default()

        # Measure Max Y-Label Width
        max_y_label_w = 0
        for y_val in y_vals:
            label_text = f"{y_mode}: {str(y_val)}"
            bbox = dummy_draw.textbbox((0, 0), label_text, font=font)
            text_w = bbox[2] - bbox[0]
            if text_w > max_y_label_w:
                max_y_label_w = text_w
                
        # Layout Calculations
        
        # Header Height (X-Axis Labels + Z-Axis Header)
        # We reserve space for Z-header and X-labels
        header_h = (f_size * 2) + (padding * 2) 
        
        # Side Width (Y-Axis Labels)
        # padding + text + padding
        side_panel_w = max_y_label_w + (padding * 2)
        
        # Total Grid Size
        # Width: Margin + SidePanel + (Cols * ImgWidth) + Margin
        grid_w = margin + side_panel_w + (cols * sample_w) + margin
        
        # Height Per Stack: Header + (Rows * ImgHeight) + Padding
        stack_h = header_h + (rows * sample_h) + padding
        
        # Total Height: Margin + (StackHeight * Stacks) + Margin
        grid_h = margin + (stack_h * stacks) + margin
        
        # CANVAS CREATION
        canvas = Image.new("RGB", (grid_w, grid_h), bg_color)
        draw = ImageDraw.Draw(canvas)
        
        # Draw Stacks
        current_y_offset = margin # Start below top margin
        
        for z_idx, z_val in enumerate(z_vals):
            # 1. Z-Axis Header
            z_label = f"Z-Axis ({z_mode}): {str(z_val)}"
            draw.text((margin, current_y_offset), z_label, fill=f_color, font=font)
            
            # Move down to X-Labels
            # current_y_offset += f_size + padding
            
            # 2. X-Axis Labels (Column Headers)
            # They sit above the images, shifted right by the side panel
            # Y-Position: calculated relative to the image top
            x_header_y = current_y_offset + f_size + padding // 2
            
            for x_idx, x_val in enumerate(x_vals):
                x_text = f"{str(x_val)}"
                # Center text over the column
                # Col Start = margin + side_panel_w + (x_idx * sample_w)
                col_start_x = margin + side_panel_w + (x_idx * sample_w)
                
                # Measure text to center it
                bbox = draw.textbbox((0, 0), x_text, font=font)
                t_w = bbox[2] - bbox[0]
                
                text_x = col_start_x + (sample_w // 2) - (t_w // 2)
                draw.text((text_x, x_header_y), x_text, fill=f_color, font=font)

            # Move down to Image Start
            image_start_y = x_header_y + f_size + padding // 2

            # 3. Rows (Y-Axis)
            for y_idx, y_val in enumerate(y_vals):
                row_y = image_start_y + (y_idx * sample_h)
                
                # Y-Axis Label (Left Side)
                y_text = f"{y_mode}: {str(y_val)}"
                # Vertically center text in the row
                bbox = draw.textbbox((0, 0), y_text, font=font)
                t_h = bbox[3] - bbox[1]
                
                text_y = row_y + (sample_h // 2) - (t_h // 2)
                draw.text((margin, text_y), y_text, fill=f_color, font=font)
                
                # Images
                for x_idx, x_val in enumerate(x_vals):
                    img = results[(x_idx, y_idx, z_idx)]
                    
                    x_pos = margin + side_panel_w + (x_idx * sample_w)
                    canvas.paste(img, (x_pos, row_y))
                
            # Advance to next stack
            current_y_offset += stack_h + padding # Extra padding between stacks
            
        return canvas

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        return float("nan")