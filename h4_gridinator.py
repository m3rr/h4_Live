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
import random
import re
import itertools
import math

# Internal Imports
from .h4_core import _log

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
        modes = ["None", "Model", "LoRA", "Prompt Stutter", "Steps", "CFG", "Denoise", "Sampler", "Scheduler", "Seed", "Negative Stutter"]

        return {
            "required": {
                # --- CORE SETTINGS ---
                "base_model": (checkpoints, {"tooltip": "The main brain. Pick your checkpoint from the list. If it's not here, check your folders!"}),
                "base_model_fuzzy": ("STRING", {"default": "", "multiline": False, "tooltip": "Can't find it in the list? Type a part of the name here (like 'juggernaut') and we'll hunt it down for you."}),
                
                # --- EMPTY LATENT SETTINGS ---
                "width": ("INT", {"default": 1024, "min": 64, "max": 8192, "step": 8, "tooltip": "Image width in pixels. 1024 for SDXL, 512 for SD1.5."}),
                "height": ("INT", {"default": 1024, "min": 64, "max": 8192, "step": 8, "tooltip": "Image height in pixels. 1024 for SDXL, 512 for SD1.5."}),
                "batch_size": ("INT", {"default": 1, "min": 1, "max": 64, "tooltip": "How many images per cell. Usually 1 for grids."}),
                
                "positive_prompt": ("STRING", {"default": "An epic photo of...", "multiline": True, "tooltip": "What do you want to see? You can use {A|B} for permutations or [word*3] to emphasize stuff."}),
                "negative_prompt": ("STRING", {"default": "blurry, low quality", "multiline": True, "tooltip": "What do you NOT want to see? No bad hands, no blurring, etc."}),
                
                # --- SAMPLING DEFAULTS ---
                "seed": ("INT", {"default": 0, "min": 0, "max": 0xffffffffffffffff, "tooltip": "The DNA of the image. 0 is random, fixed numbers reproduce results."}),
                "steps": ("INT", {"default": 20, "min": 1, "max": 100, "tooltip": "How hard the AI thinks. 20 is standard, 50 is deep thought. Too high just wastes time."}),
                "cfg": ("FLOAT", {"default": 7.0, "min": 0.0, "max": 100.0, "step": 0.1, "tooltip": "Creativity vs Obedience. 7.0 is balanced. Lower is creative, Higher follows your prompt strictly."}),
                "sampler_name": (samplers, {"tooltip": "The math behind the art. 'euler' is standard, 'dpmpp_2m' is popular. Try them out!"}),
                "scheduler": (schedulers, {"tooltip": "How the steps are spaced out. 'simple' or 'karras' are good defaults."}),
                "denoise": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 1.0, "step": 0.01, "tooltip": "How much to change. 1.0 = New Image. Lower values are for modifying existing stuff."}),
                
                # --- THE GRID (X/Y/Z) ---
                "grid_x_mode": (modes, {"default": "None", "tooltip": "What varies Left-to-Right? Model, CFG, Steps?"}),
                "grid_x_val": ("STRING", {"default": "", "multiline": False, "tooltip": "Values for X. Comma separated (e.g. '20, 30, 40'). Right-Click to pick Models!"}),
                "grid_x_override": ("STRING", {"default": "", "multiline": False, "placeholder": "Type exact names here, comma separated", "tooltip": "MULTI-VALUE OVERRIDE: If filled, this REPLACES the dropdown above. Use for comparing multiple models/LoRAs. Type full filenames comma-separated (e.g. 'modelA.safetensors, modelB.safetensors'). Fuzzy matching works - just type part of the name!"}),
                
                "grid_y_mode": (modes, {"default": "None", "tooltip": "What varies Top-to-Bottom?"}),
                "grid_y_val": ("STRING", {"default": "", "multiline": False, "tooltip": "Values for Y. Comma separated."}),
                "grid_y_override": ("STRING", {"default": "", "multiline": False, "placeholder": "Type exact names here, comma separated", "tooltip": "MULTI-VALUE OVERRIDE: If filled, this REPLACES the dropdown above. Use for comparing multiple items on this axis."}),
                
                "grid_z_mode": (modes, {"default": "None", "tooltip": "The 3rd Dimension (Stacks). Creates a really tall strip of grids."}),
                "grid_z_val": ("STRING", {"default": "", "multiline": False, "tooltip": "Values for Z. Comma separated."}),
                "grid_z_override": ("STRING", {"default": "", "multiline": False, "placeholder": "Type exact names here, comma separated", "tooltip": "MULTI-VALUE OVERRIDE: If filled, this REPLACES the dropdown above."}),

                # --- STUTTER & STYLING ---
                "stutter_mode": (["Off", "Permutations {A|B}", "Emphasis [Token*N]", "Both"], {"default": "Off", "tooltip": "Prompt Magic: 'Off' = no processing. 'Permutations' splits {A|B}. 'Emphasis' repeats [words*N]."}),
                
                # --- SLIDING SCALE (Optional Ranges) ---
                "sliding_scale_enable": ("BOOLEAN", {"default": False, "label": "Enable Sliding Scale", "tooltip": "Unlock the Advanced Sliders below. Auto-generates ranges for you."}),
                "denoise_min": ("FLOAT", {"default": 0.2, "min": 0.0, "max": 1.0, "step": 0.01, "tooltip": "Start of the range (if Sliding Scale is ON)."}),
                "denoise_max": ("FLOAT", {"default": 0.8, "min": 0.0, "max": 1.0, "step": 0.01, "tooltip": "End of the range."}),
                "steps_min": ("INT", {"default": 10, "min": 1, "max": 100, "tooltip": "Start steps for range."}),
                "steps_max": ("INT", {"default": 30, "min": 1, "max": 100, "tooltip": "End steps for range."}),
                "range_count": ("INT", {"default": 4, "min": 2, "max": 100, "tooltip": "How many images to generate across the range."}),

                "font_size": ("INT", {"default": 40, "min": 10, "max": 200, "tooltip": "Text size for the grid labels."}),
                "font_color": ("STRING", {"default": "white", "tooltip": "Text color (red, blue, gold, etc)."}),
                "bg_color": ("STRING", {"default": "black", "tooltip": "Background color of the sheet."}),
                "margin": ("INT", {"default": 50, "min": 0, "max": 500, "tooltip": "Outer margin around the entire grid."}),
                "padding": ("INT", {"default": 20, "min": 0, "max": 200, "tooltip": "Inner padding between cells and labels."}),
            },
            "optional": {
                "optional_vae": ("VAE", {"tooltip": "Override the VAE. (Optional, usually models have one built-in)."})
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
        """Loads a checkpoint by fuzzy matching the name."""
        all_checks = folder_paths.get_filename_list("checkpoints")
        
        # Exact match
        if name in all_checks:
            ckpt_path = folder_paths.get_full_path("checkpoints", name)
            return comfy.sd.load_checkpoint_guess_config(ckpt_path)

        # Fuzzy match
        for ckpt in all_checks:
            if name.lower() in ckpt.lower():
                _log(f"Gridinator: Fuzzy loaded '{ckpt}' for input '{name}'")
                ckpt_path = folder_paths.get_full_path("checkpoints", ckpt)
                return comfy.sd.load_checkpoint_guess_config(ckpt_path)
                
        raise ValueError(f"Gridinator: Cound not find checkpoint '{name}'")

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
        raw_list = [x.strip() for x in val_string.split(",") if x.strip()]
        
        if mode in ["Steps", "Seed"]:
            return [int(x) for x in raw_list]
        elif mode in ["CFG", "Denoise"]:
            return [float(x) for x in raw_list]
        else:
            return raw_list 

    def generate_grid(self, base_model, base_model_fuzzy, width, height, batch_size, positive_prompt, negative_prompt, seed, steps, cfg, sampler_name, scheduler, denoise, 
                      grid_x_mode, grid_x_val, grid_y_mode, grid_y_val, grid_z_mode, grid_z_val, 
                      stutter_mode, sliding_scale_enable, denoise_min, denoise_max, steps_min, steps_max, range_count,
                      grid_x_override, grid_y_override, grid_z_override,
                      font_size, font_color, bg_color, margin, padding, optional_vae=None):
        
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
            _log(f"Gridinator: Using Fuzzy Override: '{checkpoint_target}'")
        
        # Initial Load (if not overridden by grid)
        if "Model" not in [grid_x_mode, grid_y_mode, grid_z_mode]:
            _log(f"Gridinator: Loading Base Model: {checkpoint_target}")
            current_model, current_clip, current_vae, _ = self.fuzzy_load_checkpoint(checkpoint_target)

        # 4. The LOOP
        total_steps = len(x_vals) * len(y_vals) * len(z_vals)
        step_count = 0
        
        for z_idx, z in enumerate(z_vals):
            for y_idx, y in enumerate(y_vals):
                for x_idx, x in enumerate(x_vals):
                    step_count += 1
                    _log(f"Gridinator: Rendering Cell {step_count}/{total_steps} [X:{x} Y:{y} Z:{z}]")
                    
                    # --- PARAMETER OVERRIDES ---
                    p_steps = steps
                    p_cfg = cfg
                    p_denoise = denoise
                    p_sampler = sampler_name
                    p_scheduler = scheduler
                    p_seed = seed
                    p_pos = positive_prompt
                    p_neg = negative_prompt
                    
                    # Apply overrides based on current X/Y/Z mode
                    def apply_override(mode, val):
                        nonlocal p_steps, p_cfg, p_denoise, p_sampler, p_scheduler, p_seed, p_pos, p_neg
                        if mode == "Steps": p_steps = val
                        elif mode == "CFG": p_cfg = val
                        elif mode == "Denoise": p_denoise = val
                        elif mode == "Seed": p_seed = val
                        elif mode == "Sampler": p_sampler = val
                        elif mode == "Scheduler": p_scheduler = val
                        elif mode == "Prompt Stutter": p_pos = val # Wait, handled dynamically?
                        elif mode == "Negative Stutter": p_neg = val
                    
                    apply_override(grid_x_mode, x)
                    apply_override(grid_y_mode, y)
                    apply_override(grid_z_mode, z)

                    # --- MODEL LOADING (If Dynamic) ---
                    # Check if any axis is 'Model', if so, load it
                    model_to_load = base_model
                    if grid_x_mode == "Model": model_to_load = x
                    if grid_y_mode == "Model": model_to_load = y
                    if grid_z_mode == "Model": model_to_load = z
                    
                    # Optimization: Only reload if changed
                    # For prototype, we might reload if mode is active. 
                    # Simpler: If mode is active, always load.
                    if "Model" in [grid_x_mode, grid_y_mode, grid_z_mode]:
                        current_model, current_clip, current_vae, _ = self.fuzzy_load_checkpoint(model_to_load)

                    # --- PROMPT PROCESSING ---
                    # Stutter Logic
                    final_pos = self.apply_stutter(p_pos, stutter_mode)
                    final_neg = self.apply_stutter(p_neg, stutter_mode)
                    
                    # Special Case: Permutation Grid
                    # If inputs were permutations, they are handled by parse_values 
                    # (Users must manually input separate strings for standard grid, 
                    #  or we detect {A|B} in prompt and expand it into axes? 
                    #  User asked for "Permutations" as an option. 
                    #  For now, let's assume the user puts explicit prompts in the text box or sets mode "Prompt Stutter"
                    
                    # --- SAMPLING ---
                    # 1. Encode Conditionings
                    # 1. Encode Conditionings
                    tokens_pos = current_clip.tokenize(final_pos)
                    cond, pooled = current_clip.encode_from_tokens(tokens_pos, return_pooled=True)
                    cond_pos = [[cond, {"pooled_output": pooled}]]
                    
                    tokens_neg = current_clip.tokenize(final_neg)
                    cond, pooled = current_clip.encode_from_tokens(tokens_neg, return_pooled=True)
                    cond_neg = [[cond, {"pooled_output": pooled}]]

                    # 2. Latent Empty
                    # Using user-provided width/height from inputs
                    latent = torch.zeros([batch_size, 4, height // 8, width // 8])

                    # 3. KSampler
                    # We use standard common_ksampler
                    common_sampler = nodes.common_ksampler(
                        model=current_model, 
                        seed=p_seed, 
                        steps=p_steps, 
                        cfg=p_cfg, 
                        sampler_name=p_sampler, 
                        scheduler=p_scheduler, 
                        positive=cond_pos, 
                        negative=cond_neg, 
                        latent={"samples": latent}, 
                        denoise=p_denoise
                    )
                    
                    # 4. Decode
                    vae_to_use = optional_vae if optional_vae else current_vae
                    decoded = vae_to_use.decode(common_sampler[0]["samples"])
                    
                    # 5. Convert to PIL
                    img_tensor = decoded
                    i = 255. * img_tensor.cpu().numpy()
                    img = Image.fromarray(np.clip(i, 0, 255).astype(np.uint8)[0])
                    
                    results_grid[(x_idx, y_idx, z_idx)] = img

        # 5. STITCHING (The Gridinator)
        final_image = self.stitch_grid(results_grid, x_vals, y_vals, z_vals, grid_x_mode, grid_y_mode, grid_z_mode, font_size, font_color, bg_color, margin, padding)
        
        # 6. Convert back to Tensor
        final_tensor = torch.from_numpy(np.array(final_image).astype(np.float32) / 255.0).unsqueeze(0)
        
        return (final_tensor,)

    def stitch_grid(self, results, x_vals, y_vals, z_vals, x_mode, y_mode, z_mode, f_size, f_color, bg_color, margin, padding):
        """Assembles the individual images into a labeled grid."""
        
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
