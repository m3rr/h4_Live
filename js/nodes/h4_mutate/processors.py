# H4_Mutate - Processing Engines
# [LANDMARK] File: h4_mutate/processors.py
# [LANDMARK] Purpose: All pixel-level image processing routines (color grade,
#            sharpness, upscale, vignette, film emulation, effects).
# [LANDMARK] Dependencies: PIL, numpy, torch
# ==============================================================================

import torch
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageDraw
import colorsys
import gc

try:
    from ...core.h4_core import _log
except ImportError:
    def _log(msg): print(f"[Mutate Processors] {msg}")


# ==============================================================================
# SECTION 1: IMAGE CONVERSION UTILITIES
# ==============================================================================

def tensor_to_pil(tensor):
    """
    Converts a single ComfyUI image tensor (H, W, C) with values in [0, 1]
    into a standard PIL Image in RGB mode.
    """
    img_np = (tensor.cpu().numpy() * 255.0).clip(0, 255).astype(np.uint8)
    return Image.fromarray(img_np, "RGB")


def pil_to_tensor(pil_img):
    """
    Converts a PIL Image (RGB) back into a ComfyUI-compatible (H, W, C)
    float32 tensor with values in [0, 1].
    """
    img_np = np.array(pil_img).astype(np.float32) / 255.0
    return torch.from_numpy(img_np)


# ==============================================================================
# SECTION 2: COLOR GRADE ENGINE
# ==============================================================================

def apply_color_grade(pil_img, hue_shift, saturation, brightness, contrast,
                      gamma, color_temperature, tint):
    """
    Full color grading pipeline operating in RGB and HSV color spaces.
    Each parameter is independent and applied sequentially.

    hue_shift:          -180 to 180, rotates the hue wheel in degrees
    saturation:         0.0 to 3.0, multiplicative saturation (1.0 = no change)
    brightness:         0.0 to 3.0, multiplicative brightness (1.0 = no change)
    contrast:           0.0 to 3.0, contrast enhancer (1.0 = no change)
    gamma:              0.1 to 3.0, midtone adjustment curve power
    color_temperature:  -1.0 to 1.0, warm (positive) vs cool (negative) shift
    tint:               -1.0 to 1.0, green (negative) vs magenta (positive) shift
    """
    img_array = np.array(pil_img, dtype=np.float32)

    # --- HUE SHIFT ---
    # Convert each pixel from RGB to HSV, rotate hue, convert back
    if abs(hue_shift) > 0.01:
        img_hsv = np.array(pil_img.convert("HSV"), dtype=np.float32)
        # Hue channel is 0-255 in PIL HSV, representing 0-360 degrees
        img_hsv[:, :, 0] = (img_hsv[:, :, 0] + (hue_shift / 360.0 * 255.0)) % 255.0
        hue_pil = Image.fromarray(img_hsv.astype(np.uint8), "HSV")
        pil_img = hue_pil.convert("RGB")
        img_array = np.array(pil_img, dtype=np.float32)

    # --- SATURATION ---
    if abs(saturation - 1.0) > 0.01:
        enhancer = ImageEnhance.Color(pil_img)
        pil_img = enhancer.enhance(saturation)
        img_array = np.array(pil_img, dtype=np.float32)

    # --- BRIGHTNESS ---
    if abs(brightness - 1.0) > 0.01:
        enhancer = ImageEnhance.Brightness(pil_img)
        pil_img = enhancer.enhance(brightness)
        img_array = np.array(pil_img, dtype=np.float32)

    # --- CONTRAST ---
    if abs(contrast - 1.0) > 0.01:
        enhancer = ImageEnhance.Contrast(pil_img)
        pil_img = enhancer.enhance(contrast)
        img_array = np.array(pil_img, dtype=np.float32)

    # --- GAMMA ---
    # Gamma correction: output = input^(1/gamma)
    # Below 1.0 = darken midtones, above 1.0 = brighten midtones
    if abs(gamma - 1.0) > 0.01:
        inv_gamma = 1.0 / max(gamma, 0.01)
        lut = np.array([((i / 255.0) ** inv_gamma) * 255.0
                        for i in range(256)], dtype=np.uint8)
        img_array = np.array(pil_img, dtype=np.uint8)
        img_array = np.stack([lut[img_array[:, :, c]] for c in range(3)], axis=-1)
        pil_img = Image.fromarray(img_array, "RGB")
        img_array = img_array.astype(np.float32)

    # --- COLOR TEMPERATURE ---
    # Warm shifts: boost red, slightly reduce blue
    # Cool shifts: boost blue, slightly reduce red
    if abs(color_temperature) > 0.01:
        img_array = np.array(pil_img, dtype=np.float32)
        # Scale factor: up to +/- 30 units at full temperature
        temp_shift = color_temperature * 30.0
        img_array[:, :, 0] = np.clip(img_array[:, :, 0] + temp_shift, 0, 255)      # Red
        img_array[:, :, 2] = np.clip(img_array[:, :, 2] - temp_shift, 0, 255)      # Blue
        pil_img = Image.fromarray(img_array.astype(np.uint8), "RGB")

    # --- TINT ---
    # Green-to-magenta axis: affects green channel inversely
    if abs(tint) > 0.01:
        img_array = np.array(pil_img, dtype=np.float32)
        tint_shift = tint * 20.0
        img_array[:, :, 1] = np.clip(img_array[:, :, 1] - tint_shift, 0, 255)      # Green
        pil_img = Image.fromarray(img_array.astype(np.uint8), "RGB")

    return pil_img


# ==============================================================================
# SECTION 3: SHARPNESS ENGINE
# ==============================================================================

def apply_sharpness(pil_img, amount, radius):
    """
    Applies an Unsharp Mask filter for edge enhancement.

    amount:   0.0 to 5.0, sharpening intensity (percent = amount * 100)
    radius:   1 to 7, pixel radius of the sharpening kernel
    """
    if amount < 0.01:
        return pil_img

    percent = int(amount * 100)
    pil_img = pil_img.filter(
        ImageFilter.UnsharpMask(radius=radius, percent=percent, threshold=3)
    )
    return pil_img


# ==============================================================================
# SECTION 4: UPSCALE ENGINE
# ==============================================================================

# Mapping from user-facing method names to PIL resampling constants
UPSCALE_METHODS = {
    "lanczos":  Image.Resampling.LANCZOS,
    "bicubic":  Image.Resampling.BICUBIC,
    "bilinear": Image.Resampling.BILINEAR,
    "nearest":  Image.Resampling.NEAREST,
    "area":     Image.Resampling.BOX,
    "mitchell":  Image.Resampling.HAMMING,
}


def apply_upscale(pil_img, scale_factor, method_name):
    """
    Resizes the image by the specified scale factor using the chosen
    resampling algorithm.

    scale_factor:  0.25 to 4.0 (below 1.0 for downscaling)
    method_name:   one of the keys in UPSCALE_METHODS
    """
    if abs(scale_factor - 1.0) < 0.01:
        return pil_img

    w, h = pil_img.size
    new_w = max(1, int(w * scale_factor))
    new_h = max(1, int(h * scale_factor))

    resample = UPSCALE_METHODS.get(method_name, Image.Resampling.LANCZOS)
    return pil_img.resize((new_w, new_h), resample)


# ==============================================================================
# SECTION 5: VIGNETTE ENGINE
# ==============================================================================

def apply_vignette(pil_img, intensity, radius, softness, color_hex):
    """
    Draws a radial gradient overlay from center (transparent) to edges
    (colored) to simulate optical vignetting.

    intensity:   0.0 to 1.0, opacity of the vignette at full darkness
    radius:      0.1 to 1.0, how far the clear center extends (normalized)
    softness:    0.0 to 1.0, gradient falloff smoothness
    color_hex:   hex color string for the vignette tint (default black)
    """
    if intensity < 0.01:
        return pil_img

    w, h = pil_img.size
    cx, cy = w / 2.0, h / 2.0
    max_dist = (cx ** 2 + cy ** 2) ** 0.5

    # Parse the hex color into RGB tuple
    color_hex = color_hex.lstrip("#")
    try:
        r_c = int(color_hex[0:2], 16)
        g_c = int(color_hex[2:4], 16)
        b_c = int(color_hex[4:6], 16)
    except (ValueError, IndexError):
        r_c, g_c, b_c = 0, 0, 0

    # Build distance map from center for every pixel
    y_coords, x_coords = np.ogrid[:h, :w]
    dist = np.sqrt((x_coords - cx) ** 2 + (y_coords - cy) ** 2) / max_dist

    # Threshold: pixels inside 'radius' are fully clear
    # Pixels outside 'radius' fade to full vignette based on 'softness'
    safe_softness = max(softness, 0.001)
    alpha = np.clip((dist - radius) / safe_softness, 0.0, 1.0) * intensity

    # Composite the vignette color onto the original image
    img_array = np.array(pil_img, dtype=np.float32)
    vignette_color = np.array([r_c, g_c, b_c], dtype=np.float32)

    # Per-pixel blend: result = original * (1 - alpha) + vignette_color * alpha
    alpha_3d = alpha[:, :, np.newaxis]
    img_array = img_array * (1.0 - alpha_3d) + vignette_color * alpha_3d

    return Image.fromarray(img_array.clip(0, 255).astype(np.uint8), "RGB")


# ==============================================================================
# SECTION 6: FILM & GRAIN ENGINE
# ==============================================================================

# Film stock color science presets
# Each preset contains (shadow_tint_rgb, midtone_tint_rgb, highlight_tint_rgb,
#                        contrast_boost, saturation_factor)
FILM_PRESETS = {
    "none": None,
    "kodak_portra_400": {
        "shadow_tint":    (10, 15, 25),
        "midtone_tint":   (5, 3, -2),
        "highlight_tint": (8, 5, -5),
        "contrast":       1.05,
        "saturation":     0.92,
    },
    "kodak_ektar_100": {
        "shadow_tint":    (5, 0, 10),
        "midtone_tint":   (8, 2, -3),
        "highlight_tint": (12, 8, 0),
        "contrast":       1.15,
        "saturation":     1.25,
    },
    "kodak_gold_200": {
        "shadow_tint":    (8, 5, 0),
        "midtone_tint":   (12, 8, -5),
        "highlight_tint": (15, 10, -3),
        "contrast":       1.08,
        "saturation":     1.10,
    },
    "fuji_superia_400": {
        "shadow_tint":    (0, 8, 15),
        "midtone_tint":   (-2, 5, 8),
        "highlight_tint": (0, 3, 5),
        "contrast":       1.10,
        "saturation":     1.05,
    },
    "fuji_pro_400h": {
        "shadow_tint":    (0, 5, 10),
        "midtone_tint":   (-3, 3, 5),
        "highlight_tint": (2, 5, 8),
        "contrast":       1.02,
        "saturation":     0.88,
    },
    "fuji_velvia_50": {
        "shadow_tint":    (5, 0, 15),
        "midtone_tint":   (10, 5, 0),
        "highlight_tint": (5, 2, -5),
        "contrast":       1.25,
        "saturation":     1.40,
    },
    "ilford_hp5_bw": {
        "shadow_tint":    (0, 0, 0),
        "midtone_tint":   (0, 0, 0),
        "highlight_tint": (0, 0, 0),
        "contrast":       1.15,
        "saturation":     0.0,  # Full desaturation for B&W
    },
    "ilford_delta_3200_bw": {
        "shadow_tint":    (3, 3, 5),
        "midtone_tint":   (0, 0, 0),
        "highlight_tint": (0, 0, 0),
        "contrast":       1.30,
        "saturation":     0.0,
    },
    "cinestill_800t": {
        "shadow_tint":    (0, 5, 20),
        "midtone_tint":   (-3, 0, 10),
        "highlight_tint": (15, 5, -5),
        "contrast":       1.08,
        "saturation":     1.05,
    },
    "lomography_purple": {
        "shadow_tint":    (20, 0, 25),
        "midtone_tint":   (15, -5, 20),
        "highlight_tint": (10, 0, 15),
        "contrast":       1.12,
        "saturation":     1.15,
    },
}


def apply_film_grain(pil_img, film_preset, grain_amount, grain_size, grain_type):
    """
    Applies film stock color science emulation and photographic grain.

    film_preset:   key from FILM_PRESETS dict
    grain_amount:  0.0 to 1.0, intensity of the grain overlay
    grain_size:    0.5 to 3.0, scale of grain particles (1.0 = native pixel size)
    grain_type:    'mono' for luminance noise, 'color' for per-channel noise
    """
    preset_data = FILM_PRESETS.get(film_preset, None)

    img_array = np.array(pil_img, dtype=np.float32)

    # --- FILM STOCK COLOR SCIENCE ---
    if preset_data is not None:
        # Luminance mask for zone-based tinting (0 = shadow, 1 = highlight)
        luminance = (0.299 * img_array[:, :, 0] +
                     0.587 * img_array[:, :, 1] +
                     0.114 * img_array[:, :, 2]) / 255.0

        shadow_mask = np.clip(1.0 - luminance * 3.0, 0, 1)[:, :, np.newaxis]
        midtone_mask = np.clip(1.0 - np.abs(luminance - 0.5) * 4.0, 0, 1)[:, :, np.newaxis]
        highlight_mask = np.clip(luminance * 3.0 - 2.0, 0, 1)[:, :, np.newaxis]

        # Apply zone-targeted tints
        s_tint = np.array(preset_data["shadow_tint"], dtype=np.float32)
        m_tint = np.array(preset_data["midtone_tint"], dtype=np.float32)
        h_tint = np.array(preset_data["highlight_tint"], dtype=np.float32)

        img_array += shadow_mask * s_tint
        img_array += midtone_mask * m_tint
        img_array += highlight_mask * h_tint
        img_array = np.clip(img_array, 0, 255)

        # Contrast
        contrast_factor = preset_data["contrast"]
        mean_val = np.mean(img_array)
        img_array = np.clip((img_array - mean_val) * contrast_factor + mean_val, 0, 255)

        # Saturation
        sat_factor = preset_data["saturation"]
        if sat_factor < 0.01:
            # Full B&W conversion
            gray = (0.299 * img_array[:, :, 0] +
                    0.587 * img_array[:, :, 1] +
                    0.114 * img_array[:, :, 2])
            img_array[:, :, 0] = gray
            img_array[:, :, 1] = gray
            img_array[:, :, 2] = gray
        elif abs(sat_factor - 1.0) > 0.01:
            gray = (0.299 * img_array[:, :, 0] +
                    0.587 * img_array[:, :, 1] +
                    0.114 * img_array[:, :, 2])[:, :, np.newaxis]
            img_array = gray + (img_array - gray) * sat_factor
            img_array = np.clip(img_array, 0, 255)

    # --- GRAIN ---
    if grain_amount > 0.01:
        h, w = img_array.shape[:2]

        # If grain_size > 1.0, generate at reduced resolution then upscale
        # This creates chunkier, more visible grain particles
        grain_h = max(1, int(h / grain_size))
        grain_w = max(1, int(w / grain_size))

        if grain_type == "color":
            # Per-channel noise: R, G, B each get independent noise patterns
            noise = np.random.randn(grain_h, grain_w, 3).astype(np.float32)
        else:
            # Monochrome noise: same noise value across all three channels
            mono = np.random.randn(grain_h, grain_w, 1).astype(np.float32)
            noise = np.repeat(mono, 3, axis=2)

        # Upscale noise to match the image dimensions if grain_size != 1.0
        if grain_h != h or grain_w != w:
            noise_pil = Image.fromarray(
                ((noise + 2.0) * 63.75).clip(0, 255).astype(np.uint8).squeeze()
                if grain_type == "mono" else
                ((noise + 2.0) * 63.75).clip(0, 255).astype(np.uint8)
            )
            noise_pil = noise_pil.resize((w, h), Image.Resampling.NEAREST)
            noise_array = np.array(noise_pil, dtype=np.float32)
            # Re-normalize back to centered noise range
            noise = (noise_array - 127.5) / 63.75
            if grain_type == "mono" and noise.ndim == 2:
                noise = noise[:, :, np.newaxis].repeat(3, axis=2)

        # Scale noise intensity: grain_amount controls the amplitude
        # Max amplitude of ~50 pixel values at grain_amount=1.0
        noise_strength = grain_amount * 50.0
        img_array = img_array + noise * noise_strength
        img_array = np.clip(img_array, 0, 255)

    pil_img = Image.fromarray(img_array.astype(np.uint8), "RGB")
    return pil_img


# ==============================================================================
# SECTION 7: EFFECTS ENGINE (BLOOM, CHROMATIC ABERRATION, POSTERIZE)
# ==============================================================================

def apply_effects(pil_img, bloom_intensity, bloom_radius, bloom_threshold,
                  chromatic_aberration, posterize_levels):
    """
    Post-processing visual effects applied at the pixel level.

    bloom_intensity:       0.0 to 1.0, glow brightness around highlights
    bloom_radius:          1.0 to 20.0, spread distance of the glow
    bloom_threshold:       0.0 to 1.0, minimum brightness for bloom activation
    chromatic_aberration:  0.0 to 10.0, R/B channel offset in pixels
    posterize_levels:      2 to 256, number of discrete color levels per channel
    """
    img_array = np.array(pil_img, dtype=np.float32)

    # --- BLOOM / GLOW ---
    if bloom_intensity > 0.01:
        # Extract pixels above the brightness threshold
        luminance = (0.299 * img_array[:, :, 0] +
                     0.587 * img_array[:, :, 1] +
                     0.114 * img_array[:, :, 2])

        threshold_val = bloom_threshold * 255.0
        bright_mask = (luminance > threshold_val).astype(np.float32)

        # Isolate bright pixels and blur them to create the glow
        bloom_layer = img_array * bright_mask[:, :, np.newaxis]
        bloom_pil = Image.fromarray(bloom_layer.clip(0, 255).astype(np.uint8), "RGB")
        bloom_pil = bloom_pil.filter(
            ImageFilter.GaussianBlur(radius=bloom_radius)
        )
        bloom_array = np.array(bloom_pil, dtype=np.float32)

        # Additive composite: screen blend the glow onto the original
        img_array = img_array + bloom_array * bloom_intensity
        img_array = np.clip(img_array, 0, 255)

    # --- CHROMATIC ABERRATION ---
    if chromatic_aberration > 0.1:
        offset = int(round(chromatic_aberration))
        h, w = img_array.shape[:2]

        # Shift the red channel left and blue channel right
        # This simulates lateral chromatic aberration from real lenses
        r_channel = img_array[:, :, 0]
        b_channel = img_array[:, :, 2]

        # Roll the channels with boundary padding
        shifted_r = np.zeros_like(r_channel)
        shifted_b = np.zeros_like(b_channel)

        # Red shifts left (toward edges)
        if offset < w:
            shifted_r[:, :w - offset] = r_channel[:, offset:]
            shifted_r[:, w - offset:] = r_channel[:, -1:]

        # Blue shifts right (toward edges)
        if offset < w:
            shifted_b[:, offset:] = b_channel[:, :w - offset]
            shifted_b[:, :offset] = b_channel[:, :1]

        img_array[:, :, 0] = shifted_r
        img_array[:, :, 2] = shifted_b

    # --- POSTERIZE ---
    if posterize_levels < 256:
        levels = max(2, posterize_levels)
        # Quantize each channel to the specified number of discrete levels
        step = 255.0 / (levels - 1)
        img_array = np.round(img_array / step) * step
        img_array = np.clip(img_array, 0, 255)

    return Image.fromarray(img_array.astype(np.uint8), "RGB")


# ==============================================================================
# SECTION 8: MASK COMPOSITING
# ==============================================================================

def apply_mask_composite(original_tensor, processed_tensor, mask_tensor, feather):
    """
    Composites the processed image onto the original using the provided mask.
    Masked regions (white) receive the processed result; unmasked regions
    (black) retain the original pixels.

    original_tensor:   (H, W, C) original image tensor
    processed_tensor:  (H, W, C) processed image tensor
    mask_tensor:       (H, W) or (1, H, W) mask tensor (1 = apply effect, 0 = keep original)
    feather:           0.0 to 1.0, Gaussian blur radius applied to mask edges
    """
    # Normalize mask shape to (H, W)
    if mask_tensor.dim() == 3:
        mask = mask_tensor.squeeze(0)
    else:
        mask = mask_tensor

    h, w = original_tensor.shape[:2]

    # Resize mask to match image dimensions if they differ
    if mask.shape[0] != h or mask.shape[1] != w:
        mask = torch.nn.functional.interpolate(
            mask.unsqueeze(0).unsqueeze(0), size=(h, w), mode="bilinear",
            align_corners=False
        ).squeeze(0).squeeze(0)

    # Feather the mask edges using a Gaussian blur on the mask itself
    if feather > 0.01:
        blur_radius = max(1, int(feather * min(h, w) * 0.05))
        mask_pil = Image.fromarray(
            (mask.cpu().numpy() * 255).clip(0, 255).astype(np.uint8), "L"
        )
        mask_pil = mask_pil.filter(ImageFilter.GaussianBlur(radius=blur_radius))
        mask = torch.from_numpy(
            np.array(mask_pil, dtype=np.float32) / 255.0
        ).to(original_tensor.device)

    # Expand mask to (H, W, C) for broadcasting
    mask_3d = mask.unsqueeze(-1).expand_as(original_tensor)

    # Linear interpolation: result = original * (1 - mask) + processed * mask
    composited = original_tensor * (1.0 - mask_3d) + processed_tensor * mask_3d
    return composited
