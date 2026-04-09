# H4_Mutate v1.0.0 - Image Mutation Engine
# [LANDMARK] File: h4_mutate/nodes.py
# [LANDMARK] Purpose: Standalone post-generation image processor with toggleable
#            sections for color grading, sharpness, upscale, style transfer,
#            film emulation, vignette, and visual effects.
# [LANDMARK] Dependencies: processors.py, style_transfer.py, PIL, torch
# ==============================================================================

import torch
import numpy as np
from PIL import Image
import gc

try:
    from ...core.h4_core import _log
except ImportError:
    def _log(msg): print(f"[Mutate] {msg}")
from .processors import (
    tensor_to_pil, pil_to_tensor,
    apply_color_grade, apply_sharpness, apply_upscale,
    apply_vignette, apply_film_grain, apply_effects,
    apply_mask_composite, UPSCALE_METHODS, FILM_PRESETS,
)
from .style_transfer import execute_style_transfer


# ==============================================================================
# PIPELINE ORDER PRESETS
# ==============================================================================
# Each preset defines the execution sequence for the 7 processing sections.
# Sections are identified by their string key; the pipeline runs them in order.

PIPELINE_PRESETS = {
    "default":         ["style", "color", "film", "sharpen", "effects", "vignette", "upscale"],
    "grade_first":     ["color", "style", "film", "sharpen", "effects", "vignette", "upscale"],
    "style_last":      ["color", "film", "sharpen", "effects", "vignette", "style", "upscale"],
    "maximum_detail":  ["upscale", "sharpen", "style", "color", "film", "effects", "vignette"],
    "film_pipeline":   ["color", "film", "vignette", "sharpen", "effects", "style", "upscale"],
    "quick_enhance":   ["sharpen", "color", "upscale", "film", "vignette", "effects", "style"],
    "effects_forward": ["effects", "style", "color", "film", "sharpen", "vignette", "upscale"],
    "custom":          [],  # Populated at runtime from priority widgets
}

# Available style transfer methods for the dropdown
STYLE_METHODS_LIST = ["reinhard_color", "histogram_match", "adain", "wct", "fft_texture", "optimal_transport"]

# Attention injection modes for neural style methods
ATTENTION_MODES_LIST = ["full_kv", "value_only", "key_only", "color_only", "texture_only"]

# Multi-image blend strategies
STYLE_BLEND_MODES = ["weighted", "sequential", "concatenate", "combine_add",
                     "multiply", "max", "min", "median", "screen", "overlay"]

# Upscale method options
UPSCALE_METHOD_LIST = list(UPSCALE_METHODS.keys())

# Film preset options
FILM_PRESET_LIST = list(FILM_PRESETS.keys())


class H4_Mutate:
    """
    Standalone image mutation engine. Takes an image in, pushes a mutated
    image out. Every processing section is independently toggleable — the node
    starts as a clean pass-through and the user opts into whatever
    transformations they need.

    Minimum workflow: Load Image -> H4_Mutate -> Save Image
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE",),

                # ---- SECTION TOGGLES (Always visible, control drawer visibility) ----
                "enable_color": ("BOOLEAN", {
                    "default": False, "label_on": "ON", "label_off": "OFF",
                    "tooltip": "Activates the Color Grade section. When ON, controls for hue, saturation, brightness, contrast, gamma, color temperature, and tint become available."
                }),
                "enable_sharpen": ("BOOLEAN", {
                    "default": False, "label_on": "ON", "label_off": "OFF",
                    "tooltip": "Activates the Sharpness section. When ON, controls for sharpening intensity and kernel radius become available."
                }),
                "enable_upscale": ("BOOLEAN", {
                    "default": False, "label_on": "ON", "label_off": "OFF",
                    "tooltip": "Activates the Upscale section. When ON, controls for scale factor and resampling method become available. Also works as a downscaler if the factor is below 1.0."
                }),
                "enable_style": ("BOOLEAN", {
                    "default": False, "label_on": "ON", "label_off": "OFF",
                    "tooltip": "Activates the Style Transfer section. When ON, connect style reference images and choose a transfer method to mutate the look of your image."
                }),
                "enable_film": ("BOOLEAN", {
                    "default": False, "label_on": "ON", "label_off": "OFF",
                    "tooltip": "Activates the Film & Grain section. When ON, controls for film stock emulation and photographic grain become available."
                }),
                "enable_vignette": ("BOOLEAN", {
                    "default": False, "label_on": "ON", "label_off": "OFF",
                    "tooltip": "Activates the Vignette section. When ON, a radial shadow is drawn from the edges inward to focus attention on the center of the image."
                }),
                "enable_effects": ("BOOLEAN", {
                    "default": False, "label_on": "ON", "label_off": "OFF",
                    "tooltip": "Activates the Effects section. When ON, controls for bloom/glow, chromatic aberration, and posterization become available."
                }),

                # ---- PIPELINE ORDER ----
                "pipeline_order": (list(PIPELINE_PRESETS.keys()), {
                    "default": "default",
                    "tooltip": "Controls the order in which processing sections are applied. 'default' runs Style -> Color -> Film -> Sharpen -> Effects -> Vignette -> Upscale. Different orders produce dramatically different results because each stage transforms the image for the next stage. 'custom' lets you set individual priority numbers for each section."
                }),
            },
            "optional": {
                # ---- COLOR GRADE SECTION ----
                "hue_shift": ("FLOAT", {
                    "default": 0.0, "min": -180.0, "max": 180.0, "step": 1.0,
                    "tooltip": "Rotates the entire color wheel. Positive shifts toward warm tones, negative shifts toward cool tones. 0 = no change. At 180 you've flipped every color to its opposite."
                }),
                "saturation": ("FLOAT", {
                    "default": 1.0, "min": 0.0, "max": 3.0, "step": 0.05,
                    "tooltip": "How vivid the colors are. 0 = full grayscale (black and white). 1 = no change. Crank it up and colors pop. Push it too far and it looks radioactive."
                }),
                "brightness": ("FLOAT", {
                    "default": 1.0, "min": 0.0, "max": 3.0, "step": 0.05,
                    "tooltip": "Overall light intensity. 0 = pitch black. 1 = original brightness. Higher values wash everything out toward white."
                }),
                "contrast": ("FLOAT", {
                    "default": 1.0, "min": 0.0, "max": 3.0, "step": 0.05,
                    "tooltip": "The difference between lights and darks. 0 = totally flat gray. 1 = original contrast. Higher values deepen shadows and brighten highlights."
                }),
                "gamma": ("FLOAT", {
                    "default": 1.0, "min": 0.1, "max": 3.0, "step": 0.05,
                    "tooltip": "Adjusts the midtones without touching pure black or pure white. Below 1.0 = darker midtones (moody). Above 1.0 = brighter midtones (airy). Unlike brightness, this preserves your highlights and shadows."
                }),
                "color_temperature": ("FLOAT", {
                    "default": 0.0, "min": -1.0, "max": 1.0, "step": 0.05,
                    "tooltip": "Shifts the overall warmth. Negative = cooler (blue tint, moonlight feel). Positive = warmer (golden hour, sunset vibes). 0 = neutral."
                }),
                "tint": ("FLOAT", {
                    "default": 0.0, "min": -1.0, "max": 1.0, "step": 0.05,
                    "tooltip": "Green-to-magenta shift. Negative = greenish cast. Positive = magenta/pink cast. Useful for correcting mixed lighting or creating stylized looks."
                }),

                # ---- SHARPNESS SECTION ----
                "sharpen_amount": ("FLOAT", {
                    "default": 1.0, "min": 0.0, "max": 5.0, "step": 0.1,
                    "tooltip": "How aggressively edges are enhanced. 0 = no sharpening. 1 = subtle enhancement. Above 2.0 starts looking crunchy. Above 4.0 is extreme — great for texture work, bad for portraits."
                }),
                "sharpen_radius": ("INT", {
                    "default": 1, "min": 1, "max": 7,
                    "tooltip": "How far the sharpening effect reaches around each edge. 1 = tight, precise edges. Higher values = broader halos around edges. Keep it low (1-2) for natural results."
                }),

                # ---- UPSCALE SECTION ----
                "scale_factor": ("FLOAT", {
                    "default": 2.0, "min": 0.25, "max": 4.0, "step": 0.25,
                    "tooltip": "Multiplier for the output size. 2.0 = double the resolution. 0.5 = half size. 4.0 = quadruple (be aware of VRAM). Also works as a downscaler if you go below 1.0."
                }),
                "upscale_method": (UPSCALE_METHOD_LIST, {
                    "default": "lanczos",
                    "tooltip": "The math used to resize. Lanczos = sharp general purpose. Bicubic = smooth gradients. Bilinear = fast and soft. Nearest = hard pixel edges (pixel art). Area = best for shrinking images. Mitchell = balanced sharpness without ringing artifacts."
                }),

                # ---- STYLE TRANSFER SECTION ----
                "style_method": (STYLE_METHODS_LIST, {
                    "default": "adain",
                    "tooltip": "Which algorithm transfers the style. Reinhard = fast color swap in LAB space. Histogram = exact color distribution clone. AdaIN = neural texture and color transfer using deep features. WCT = painterly neural style with full covariance alignment. FFT = frequency-domain texture swap. Optimal Transport = mathematically precise color redistribution."
                }),
                "style_attention_mode": (ATTENTION_MODES_LIST, {
                    "default": "full_kv",
                    "tooltip": "Controls what gets pulled from the style image (applies to AdaIN and WCT only). Full (K+V) = everything — structure, texture, and color. V Only = colors and textures but keeps your composition intact. K Only = structural flow but keeps your own colors. Color Only = just the palette, nothing else touches. Texture Only = surface grain and texture without any color or structure shift."
                }),
                "style_strength": ("FLOAT", {
                    "default": 0.75, "min": 0.0, "max": 1.0, "step": 0.05,
                    "tooltip": "How strongly the style is applied. 0 = no effect (original image). 0.5 = halfway blend. 1.0 = full style transfer. The sweet spot for most uses is 0.5 to 0.8."
                }),
                "style_blend_mode": (STYLE_BLEND_MODES, {
                    "default": "weighted",
                    "tooltip": "How multiple style images are combined when you connect more than one. Weighted = manual ratios per image. Sequential = applied one after another in order. Concatenate = averaged into one composite. Combine = additive sum. Multiply = shared features reinforced. Max = strongest feature wins. Min = most subtle result. Median = rejects outliers. Screen = light and airy blend. Overlay = dramatic contrast crossover."
                }),
                "style_weight_1": ("FLOAT", {
                    "default": 1.0, "min": 0.0, "max": 1.0, "step": 0.05,
                    "tooltip": "How much influence the first style image has when using Weighted blend mode. 0 = ignored entirely. 1 = full contribution to the composite."
                }),
                "style_weight_2": ("FLOAT", {
                    "default": 1.0, "min": 0.0, "max": 1.0, "step": 0.05,
                    "tooltip": "How much influence the second style image has when using Weighted blend mode. 0 = ignored entirely. 1 = full contribution."
                }),
                "style_weight_3": ("FLOAT", {
                    "default": 1.0, "min": 0.0, "max": 1.0, "step": 0.05,
                    "tooltip": "How much influence the third style image has when using Weighted blend mode. 0 = ignored entirely. 1 = full contribution."
                }),
                "style_weight_4": ("FLOAT", {
                    "default": 1.0, "min": 0.0, "max": 1.0, "step": 0.05,
                    "tooltip": "How much influence the fourth style image has when using Weighted blend mode. 0 = ignored entirely. 1 = full contribution."
                }),

                # ---- FILM & GRAIN SECTION ----
                "film_preset": (FILM_PRESET_LIST, {
                    "default": "none",
                    "tooltip": "Emulates the color science of classic film stocks. Portra 400 = warm skin tones with muted palette. Ektar 100 = punchy, saturated colors. Gold 200 = warm golden cast. Fuji Superia = cool blue-green shadows. Velvia 50 = nuclear saturation for landscapes. HP5/Delta = black and white conversion. CineStill 800T = tungsten cinema look with halation. Lomography Purple = wild purple-shifted experimental."
                }),
                "grain_amount": ("FLOAT", {
                    "default": 0.0, "min": 0.0, "max": 1.0, "step": 0.05,
                    "tooltip": "How much film grain to add. 0 = clean digital. 0.1 to 0.3 = subtle texture that breaks up digital smoothness. 0.5 and up = heavy grain, vintage feel."
                }),
                "grain_size": ("FLOAT", {
                    "default": 1.0, "min": 0.5, "max": 3.0, "step": 0.1,
                    "tooltip": "Size of the grain particles. 0.5 = fine, dense grain like 100 ISO film. 1.0 = standard. 3.0 = chunky, visible grain like pushing 3200 ISO in the dark."
                }),
                "grain_type": (["mono", "color"], {
                    "default": "mono",
                    "tooltip": "Monochrome grain = uniform luminance noise across all channels, like real silver halide film. Color grain = each color channel (red, green, blue) gets independent noise, creating colorful speckles. Color grain is wilder and more experimental."
                }),

                # ---- VIGNETTE SECTION ----
                "vignette_intensity": ("FLOAT", {
                    "default": 0.5, "min": 0.0, "max": 1.0, "step": 0.05,
                    "tooltip": "How dark the edges get. 0 = no vignette. 0.3 = subtle, cinematic. 0.7 = dramatic focus pulling. 1.0 = heavy darkening at the edges."
                }),
                "vignette_radius": ("FLOAT", {
                    "default": 0.7, "min": 0.1, "max": 1.0, "step": 0.05,
                    "tooltip": "How far the clean center extends before the darkening begins. 0.1 = only the very corners stay dark. 0.7 = default oval shape. 1.0 = vignette barely reaches the center."
                }),
                "vignette_softness": ("FLOAT", {
                    "default": 0.5, "min": 0.0, "max": 1.0, "step": 0.05,
                    "tooltip": "How gradual the transition is between the clean center and the dark edges. 0 = hard cutoff with a visible ring. 0.5 = natural gradient. 1.0 = extremely soft, barely noticeable transition."
                }),
                "vignette_color": ("STRING", {
                    "default": "#000000",
                    "tooltip": "The color of the vignette overlay as a hex code. #000000 (black) is classic. Try #0a0a2e for a cold night feel, or #2a1a0a for a vintage sepia-toned photograph."
                }),

                # ---- EFFECTS SECTION ----
                "bloom_intensity": ("FLOAT", {
                    "default": 0.0, "min": 0.0, "max": 1.0, "step": 0.05,
                    "tooltip": "Adds a soft glow around bright areas, like looking through a dreamy lens or a light fog. 0 = off. 0.2 = subtle warmth. 0.5 and up = ethereal. Great for fantasy, portrait, or atmospheric work."
                }),
                "bloom_radius": ("FLOAT", {
                    "default": 5.0, "min": 1.0, "max": 20.0, "step": 0.5,
                    "tooltip": "How far the glow spreads from bright spots. Low values = tight halo hugging the highlight. High values = wide, atmospheric wash that softens the whole image."
                }),
                "bloom_threshold": ("FLOAT", {
                    "default": 0.7, "min": 0.0, "max": 1.0, "step": 0.05,
                    "tooltip": "How bright a pixel needs to be before it starts glowing. 0 = everything glows (heavy fog effect). 0.7 = only highlights bloom (natural). 0.9 = only the absolute brightest pinpoints."
                }),
                "chromatic_aberration": ("FLOAT", {
                    "default": 0.0, "min": 0.0, "max": 10.0, "step": 0.5,
                    "tooltip": "Simulates the color fringing you see in real camera lenses — the red and blue channels get slightly offset from each other. 0 = none. 1 to 3 = subtle lens realism. 5 and up = stylized, intentional distortion for a glitchy or vintage look."
                }),
                "posterize_levels": ("INT", {
                    "default": 256, "min": 2, "max": 256,
                    "tooltip": "Reduces the number of discrete color levels per channel. 256 = no change (full color depth). 64 = subtle banding. 8 = retro poster look. 4 = bold flat colors. 2 = near-duotone. Lower values create more dramatic, graphic-novel-style results."
                }),

                # ---- CUSTOM PIPELINE ORDER PRIORITIES ----
                "priority_style": ("INT", {
                    "default": 1, "min": 1, "max": 7,
                    "tooltip": "When pipeline order is set to 'custom', this sets the processing priority for the Style Transfer section. Lower numbers run first. If two sections share the same number, they run in their default order."
                }),
                "priority_color": ("INT", {
                    "default": 2, "min": 1, "max": 7,
                    "tooltip": "When pipeline order is set to 'custom', this sets the processing priority for the Color Grade section. Lower numbers run first."
                }),
                "priority_film": ("INT", {
                    "default": 3, "min": 1, "max": 7,
                    "tooltip": "When pipeline order is set to 'custom', this sets the processing priority for the Film & Grain section. Lower numbers run first."
                }),
                "priority_sharpen": ("INT", {
                    "default": 4, "min": 1, "max": 7,
                    "tooltip": "When pipeline order is set to 'custom', this sets the processing priority for the Sharpness section. Lower numbers run first."
                }),
                "priority_effects": ("INT", {
                    "default": 5, "min": 1, "max": 7,
                    "tooltip": "When pipeline order is set to 'custom', this sets the processing priority for the Effects section. Lower numbers run first."
                }),
                "priority_vignette": ("INT", {
                    "default": 6, "min": 1, "max": 7,
                    "tooltip": "When pipeline order is set to 'custom', this sets the processing priority for the Vignette section. Lower numbers run first."
                }),
                "priority_upscale": ("INT", {
                    "default": 7, "min": 1, "max": 7,
                    "tooltip": "When pipeline order is set to 'custom', this sets the processing priority for the Upscale section. Lower numbers run first."
                }),

                # ---- MASK ----
                "mask": ("MASK",),
                "mask_feather": ("FLOAT", {
                    "default": 0.0, "min": 0.0, "max": 1.0, "step": 0.05,
                    "tooltip": "Softens the edges of the mask with a Gaussian blur so the processed region blends smoothly into the unprocessed region. 0 = hard cutoff at the mask boundary. 0.5 = moderate feathering. 1.0 = very soft, gradual transition."
                }),

                # ---- STYLE REFERENCE IMAGES ----
                "style_image_1": ("IMAGE",),
                "style_image_2": ("IMAGE",),
                "style_image_3": ("IMAGE",),
                "style_image_4": ("IMAGE",),

                # ---- DISPLAY CONSOLE ----
                "display_console": ("BOOLEAN", {
                    "default": False, "label_on": "ON", "label_off": "OFF",
                    "tooltip": "Opens a live status bar at the bottom of the node to monitor execution progress."
                }),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID",
                "extra_pnginfo": "EXTRA_PNGINFO"
            }
        }

    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("IMAGE",)
    FUNCTION = "execute"
    CATEGORY = "h4_Live/Image"

    def execute(self, image, enable_color, enable_sharpen, enable_upscale,
                enable_style, enable_film, enable_vignette, enable_effects,
                pipeline_order, display_console=False,
                # Color Grade (optional, gated by enable_color)
                hue_shift=0.0, saturation=1.0, brightness=1.0, contrast=1.0,
                gamma=1.0, color_temperature=0.0, tint=0.0,
                # Sharpness (optional, gated by enable_sharpen)
                sharpen_amount=1.0, sharpen_radius=1,
                # Upscale (optional, gated by enable_upscale)
                scale_factor=2.0, upscale_method="lanczos",
                # Style Transfer (optional, gated by enable_style)
                style_method="adain", style_attention_mode="full_kv",
                style_strength=0.75, style_blend_mode="weighted",
                style_weight_1=1.0, style_weight_2=1.0,
                style_weight_3=1.0, style_weight_4=1.0,
                # Film & Grain (optional, gated by enable_film)
                film_preset="none", grain_amount=0.0, grain_size=1.0, grain_type="mono",
                # Vignette (optional, gated by enable_vignette)
                vignette_intensity=0.5, vignette_radius=0.7, vignette_softness=0.5,
                vignette_color="#000000",
                # Effects (optional, gated by enable_effects)
                bloom_intensity=0.0, bloom_radius=5.0, bloom_threshold=0.7,
                chromatic_aberration=0.0, posterize_levels=256,
                # Custom pipeline priorities (optional, gated by pipeline_order == 'custom')
                priority_style=1, priority_color=2, priority_film=3,
                priority_sharpen=4, priority_effects=5, priority_vignette=6,
                priority_upscale=7,
                # Mask (optional)
                mask=None, mask_feather=0.0,
                # Style reference images (optional, dynamic visibility)
                style_image_1=None, style_image_2=None,
                style_image_3=None, style_image_4=None,
                unique_id=None, extra_pnginfo=None):

        batch_size = image.shape[0]
        _log(f"H4_Mutate engaged | Batch: {batch_size} | "
             f"Color: {enable_color} | Sharp: {enable_sharpen} | "
             f"Up: {enable_upscale} | Style: {enable_style} | "
             f"Film: {enable_film} | Vignette: {enable_vignette} | "
             f"FX: {enable_effects} | Order: {pipeline_order}")

        # Web status updater function
        def set_status(text):
            if unique_id is not None:
                try:
                    from server import PromptServer
                    PromptServer.instance.send_sync("h4_mutate_status", {"node_id": unique_id, "status": text})
                except Exception:
                    # Silent failure for status updates if server is unreachable
                    pass

        set_status(f"Booting Mutate Engine... (Batch {batch_size})")

        # --- Determine pipeline execution order ---
        if pipeline_order == "custom":
            # Build order from user-assigned priorities
            sections = [
                (priority_style,    "style"),
                (priority_color,    "color"),
                (priority_film,     "film"),
                (priority_sharpen,  "sharpen"),
                (priority_effects,  "effects"),
                (priority_vignette, "vignette"),
                (priority_upscale,  "upscale"),
            ]
            sections.sort(key=lambda x: x[0])
            execution_order = [s[1] for s in sections]
        else:
            execution_order = PIPELINE_PRESETS.get(pipeline_order, PIPELINE_PRESETS["default"])

        # --- Gather style reference images ---
        style_refs = []
        style_weights = []
        for ref, weight in [(style_image_1, style_weight_1),
                            (style_image_2, style_weight_2),
                            (style_image_3, style_weight_3),
                            (style_image_4, style_weight_4)]:
            if ref is not None:
                # Convert the first frame of any connected IMAGE tensor to PIL
                ref_pil = tensor_to_pil(ref[0])
                style_refs.append(ref_pil)
                style_weights.append(weight)

        # Map section names to their toggle states
        section_enabled = {
            "style":    enable_style and len(style_refs) > 0,
            "color":    enable_color,
            "film":     enable_film,
            "sharpen":  enable_sharpen,
            "effects":  enable_effects,
            "vignette": enable_vignette,
            "upscale":  enable_upscale,
        }

        # --- Process each image in the batch ---
        results = []

        for i in range(batch_size):
            try:
                _log(f"H4_Mutate [Frame {i+1}/{batch_size}] | Initiating pipeline sequence...")
                original_tensor = image[i]  # (H, W, C) float32 [0, 1]
                pil_img = tensor_to_pil(original_tensor)

                # Execute each section in the determined pipeline order
                for section in execution_order:
                    if not section_enabled.get(section, False):
                        continue

                    _log(f"H4_Mutate [Frame {i+1}/{batch_size}] | Executing section: {section.upper()}")
                    set_status(f"Frame {i+1}/{batch_size} : Computing {section.upper()}")

                    if section == "color":
                        pil_img = apply_color_grade(
                            pil_img, hue_shift, saturation, brightness,
                            contrast, gamma, color_temperature, tint
                        )

                    elif section == "sharpen":
                        pil_img = apply_sharpness(pil_img, sharpen_amount, sharpen_radius)

                    elif section == "upscale":
                        pil_img = apply_upscale(pil_img, scale_factor, upscale_method)

                    elif section == "style":
                        pil_img = execute_style_transfer(
                            pil_img, style_refs, style_method,
                            style_attention_mode, style_strength,
                            style_blend_mode, style_weights
                        )

                    elif section == "film":
                        pil_img = apply_film_grain(
                            pil_img, film_preset, grain_amount, grain_size, grain_type
                        )

                    elif section == "vignette":
                        pil_img = apply_vignette(
                            pil_img, vignette_intensity, vignette_radius,
                            vignette_softness, vignette_color
                        )

                    elif section == "effects":
                        pil_img = apply_effects(
                            pil_img, bloom_intensity, bloom_radius,
                            bloom_threshold, chromatic_aberration, posterize_levels
                        )

                # Convert back to tensor
                processed_tensor = pil_to_tensor(pil_img)

                # --- Mask compositing ---
                # If a mask is connected, blend the processed result with the original
                # so that only the masked region receives the mutations
                if mask is not None:
                    _log(f"H4_Mutate [Frame {i+1}/{batch_size}] | Applying mask composite with feather: {mask_feather}")
                    set_status(f"Frame {i+1}/{batch_size} : Applying Feathered Mask")
                    # Get the original at the same resolution as the processed image
                    if processed_tensor.shape != original_tensor.shape:
                        # Upscale changed the resolution — resize original to match
                        orig_pil = tensor_to_pil(original_tensor)
                        orig_pil = orig_pil.resize(
                            (processed_tensor.shape[1], processed_tensor.shape[0]),
                            Image.Resampling.LANCZOS
                        )
                        original_for_mask = pil_to_tensor(orig_pil)
                    else:
                        original_for_mask = original_tensor

                    # Select the correct mask frame for this batch index
                    if mask.dim() == 3 and mask.shape[0] > i:
                        current_mask = mask[i]
                    elif mask.dim() == 3:
                        current_mask = mask[0]
                    else:
                        current_mask = mask

                    processed_tensor = apply_mask_composite(
                        original_for_mask, processed_tensor,
                        current_mask, mask_feather
                    )

                results.append(processed_tensor)

                # Memory cleanup between batch frames
                del pil_img
                gc.collect()

            except Exception as e:
                import traceback
                _log(f"[ERROR] H4_Mutate Critical Failure on Frame {i+1}: {str(e)}")
                _log(f"Traceback Context: {traceback.format_exc()}")
                _log(f"Fallback: Passing original tensor through for Frame {i+1}.")
                set_status(f"! ERROR F{i+1}: GRACEFUL FALLBACK !")
                results.append(image[i])
                gc.collect()

        # Stack results into batch tensor (B, H, W, C)
        output = torch.stack(results, dim=0)
        _log(f"H4_Mutate complete | Output: {list(output.shape)}")
        set_status(f"Complete. Output: {list(output.shape)}")

        return (output,)
