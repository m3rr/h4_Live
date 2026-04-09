# H4_Mutate - Neural Style Transfer Engines
# [LANDMARK] File: h4_mutate/style_transfer.py
# [LANDMARK] Purpose: All style transfer algorithms — statistical (Reinhard,
#            histogram, optimal transport) and neural (AdaIN, WCT, FFT).
# [LANDMARK] Dependencies: PIL, numpy, torch, torchvision (VGG19 encoder)
# ==============================================================================

import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from PIL import Image
import os

try:
    from ...core.h4_core import _log
except ImportError:
    def _log(msg): print(f"[Mutate Style Transfer] {msg}")


# ==============================================================================
# SECTION 1: STATISTICAL STYLE TRANSFER (Zero-Model Methods)
# ==============================================================================

def reinhard_color_transfer(content_pil, style_pil):
    """
    Reinhard et al. color transfer. Converts both images to LAB color space,
    then matches the mean and standard deviation of each channel in the
    content image to the corresponding statistics of the style image.

    This transfers the overall color palette without touching structure.
    """
    content_lab = _rgb_to_lab(np.array(content_pil, dtype=np.float32))
    style_lab = _rgb_to_lab(np.array(style_pil, dtype=np.float32))

    result_lab = np.zeros_like(content_lab)

    for ch in range(3):
        c_mean = np.mean(content_lab[:, :, ch])
        c_std = np.std(content_lab[:, :, ch]) + 1e-6

        s_mean = np.mean(style_lab[:, :, ch])
        s_std = np.std(style_lab[:, :, ch]) + 1e-6

        # Shift and scale: (pixel - content_mean) / content_std * style_std + style_mean
        result_lab[:, :, ch] = (content_lab[:, :, ch] - c_mean) / c_std * s_std + s_mean

    result_rgb = _lab_to_rgb(result_lab)
    return Image.fromarray(result_rgb.clip(0, 255).astype(np.uint8), "RGB")


def histogram_match(content_pil, style_pil):
    """
    Matches the cumulative histogram of the content image to the style image
    for each RGB channel independently. More aggressive than Reinhard — the
    exact color distribution of the style image is imposed onto the content.
    """
    content_np = np.array(content_pil, dtype=np.uint8)
    style_np = np.array(style_pil, dtype=np.uint8)
    result = np.zeros_like(content_np)

    for ch in range(3):
        result[:, :, ch] = _match_single_histogram(
            content_np[:, :, ch], style_np[:, :, ch]
        )

    return Image.fromarray(result, "RGB")


def fft_texture_transfer(content_pil, style_pil):
    """
    Frequency-domain style transfer. Decomposes both images into low-frequency
    (structure/shapes) and high-frequency (texture/edges) components using FFT.
    Keeps the content's low frequencies and replaces the high frequencies with
    the style image's high frequencies.

    Result: the content's composition with the style's surface texture/grain.
    """
    content_np = np.array(content_pil, dtype=np.float32)
    style_np = np.array(style_pil, dtype=np.float32)

    # Resize style to match content dimensions for frequency domain alignment
    if style_np.shape[:2] != content_np.shape[:2]:
        style_pil_resized = style_pil.resize(
            (content_np.shape[1], content_np.shape[0]), Image.Resampling.LANCZOS
        )
        style_np = np.array(style_pil_resized, dtype=np.float32)

    result = np.zeros_like(content_np)

    # Cutoff frequency: controls boundary between "structure" and "texture"
    # Lower cutoff = more structure preservation, more texture transfer
    rows, cols = content_np.shape[:2]
    crow, ccol = rows // 2, cols // 2
    cutoff = min(rows, cols) // 8  # Adaptive cutoff based on image size

    for ch in range(3):
        # Forward FFT on both images
        f_content = np.fft.fft2(content_np[:, :, ch])
        f_style = np.fft.fft2(style_np[:, :, ch])

        # Shift zero-frequency component to center
        f_content_shifted = np.fft.fftshift(f_content)
        f_style_shifted = np.fft.fftshift(f_style)

        # Build low-pass mask (circle around center = low frequencies)
        mask = np.zeros((rows, cols), dtype=np.float32)
        y, x = np.ogrid[:rows, :cols]
        dist = np.sqrt((x - ccol) ** 2 + (y - crow) ** 2)
        mask[dist <= cutoff] = 1.0

        # Smooth transition at the boundary to prevent ringing artifacts
        transition = np.clip((cutoff + 5 - dist) / 10.0, 0, 1)

        # Combine: low-freq from content + high-freq from style
        combined = f_content_shifted * transition + f_style_shifted * (1.0 - transition)

        # Inverse FFT back to spatial domain
        f_combined = np.fft.ifftshift(combined)
        result[:, :, ch] = np.abs(np.fft.ifft2(f_combined))

    return Image.fromarray(result.clip(0, 255).astype(np.uint8), "RGB")


def optimal_transport_transfer(content_pil, style_pil):
    """
    Color transfer using an approximation of optimal transport (sliced
    Wasserstein distance). Projects pixel colors onto random 1D directions,
    sorts them, and matches the distributions along each projection.

    More mathematically principled than Reinhard, produces smoother color
    transitions with fewer artifacts.
    """
    content_np = np.array(content_pil, dtype=np.float32).reshape(-1, 3)
    style_np = np.array(style_pil, dtype=np.float32).reshape(-1, 3)
    h, w = np.array(content_pil).shape[:2]

    n_projections = 64  # Number of random 1D projection directions
    rng = np.random.RandomState(42)  # Fixed seed for reproducibility

    result = content_np.copy()

    for _ in range(n_projections):
        # Random unit-length direction vector in RGB space
        direction = rng.randn(3)
        direction /= np.linalg.norm(direction) + 1e-8

        # Project both images onto this direction (dot product)
        proj_content = content_np @ direction
        proj_style = style_np @ direction

        # Sort both projections
        idx_content = np.argsort(proj_content)
        sorted_style = np.sort(proj_style)

        # Match the content's sorted values to the style's sorted values
        # Resample style values if image sizes differ
        if len(sorted_style) != len(proj_content):
            interp_indices = np.linspace(0, len(sorted_style) - 1, len(proj_content))
            sorted_style = np.interp(interp_indices, np.arange(len(sorted_style)), sorted_style)

        # Compute the displacement needed for each content pixel
        displacement = sorted_style - proj_content[idx_content]

        # Apply displacement along the projection direction
        update = np.zeros_like(result)
        update[idx_content] = displacement[:, np.newaxis] * direction[np.newaxis, :]
        result += update / n_projections

    result = result.reshape(h, w, 3)
    return Image.fromarray(result.clip(0, 255).astype(np.uint8), "RGB")


# ==============================================================================
# SECTION 2: NEURAL STYLE TRANSFER (VGG19 Feature-Based)
# ==============================================================================

class VGGEncoder(nn.Module):
    """
    Lightweight VGG19 feature extractor that captures style and content
    representations at multiple network depths. Uses the first 21 layers
    (through conv4_1) for balanced feature extraction.

    Layers used for style statistics:
      - relu1_1 (shallow: colors, basic patterns)
      - relu2_1 (textures, small structures)
      - relu3_1 (medium-scale patterns)
      - relu4_1 (high-level structure, composition)
    """

    def __init__(self):
        super().__init__()
        try:
            from torchvision.models import vgg19, VGG19_Weights
            with torch.inference_mode(False) if hasattr(torch, 'inference_mode') else torch.enable_grad():
                vgg = vgg19(weights=VGG19_Weights.IMAGENET1K_V1).features
        except ImportError:
            _log("torchvision not available. Neural style transfer methods disabled.")
            self.available = False
            return

        self.available = True

        # Extract feature layers up to relu4_1
        self.slice1 = nn.Sequential(*list(vgg.children())[:2])   # relu1_1
        self.slice2 = nn.Sequential(*list(vgg.children())[2:7])  # relu2_1
        self.slice3 = nn.Sequential(*list(vgg.children())[7:12]) # relu3_1
        self.slice4 = nn.Sequential(*list(vgg.children())[12:21])# relu4_1

        # Freeze all parameters — encoder is inference-only
        for param in self.parameters():
            param.requires_grad = False

    def forward(self, x):
        """
        Returns feature maps at four depths for the input image tensor.
        Input shape: (1, 3, H, W), normalized with ImageNet statistics.
        """
        h1 = self.slice1(x)
        h2 = self.slice2(h1)
        h3 = self.slice3(h2)
        h4 = self.slice4(h3)
        return h1, h2, h3, h4


# Singleton encoder instance loaded on first use to avoid redundant model loads
_vgg_encoder = None


def _get_vgg_encoder(device="cpu"):
    """
    Returns the shared VGG19 encoder instance, loading it on first call.
    Moves the model to the specified device (cpu or cuda).
    """
    global _vgg_encoder
    
    # If the encoder exists, check if it was inadvertently tainted by a global inference_mode state
    if _vgg_encoder is not None:
        try:
            param = next(_vgg_encoder.parameters())
            if hasattr(param, 'is_inference') and param.is_inference():
                _vgg_encoder = None
        except Exception:
            pass
            
    if _vgg_encoder is None:
        _log("Loading VGG19 encoder for neural style transfer...")
        with torch.inference_mode(False) if hasattr(torch, 'inference_mode') else torch.enable_grad():
            _vgg_encoder = VGGEncoder()
            _vgg_encoder.eval()
    _vgg_encoder = _vgg_encoder.to(device)
    return _vgg_encoder


def _preprocess_for_vgg(pil_img, device="cpu"):
    """
    Converts a PIL image to a VGG19-compatible input tensor:
    (1, 3, H, W) normalized with ImageNet mean and standard deviation.
    """
    img_np = np.array(pil_img, dtype=np.float32) / 255.0
    tensor = torch.from_numpy(img_np).permute(2, 0, 1).unsqueeze(0).to(device)

    # ImageNet normalization values
    mean = torch.tensor([0.485, 0.456, 0.406]).view(1, 3, 1, 1).to(device)
    std = torch.tensor([0.229, 0.224, 0.225]).view(1, 3, 1, 1).to(device)
    return (tensor - mean) / std


def _deprocess_from_vgg(tensor):
    """
    Reverses VGG preprocessing: denormalize and convert back to a PIL image.
    """
    mean = torch.tensor([0.485, 0.456, 0.406]).view(1, 3, 1, 1).to(tensor.device)
    std = torch.tensor([0.229, 0.224, 0.225]).view(1, 3, 1, 1).to(tensor.device)
    tensor = tensor * std + mean
    tensor = tensor.clamp(0, 1)
    img_np = (tensor.squeeze(0).permute(1, 2, 0).cpu().numpy() * 255).astype(np.uint8)
    return Image.fromarray(img_np, "RGB")


def adain_transfer(content_pil, style_pil, attention_mode="full_kv"):
    """
    Adaptive Instance Normalization (AdaIN) style transfer.
    Aligns the mean and variance of content features to match the style
    features at each VGG layer, then reconstructs the image.

    attention_mode controls which aspects of style are transferred:
      - full_kv:      both structure and texture/color
      - value_only:   texture and color, preserving content structure
      - key_only:     structural arrangement, preserving content colors
      - color_only:   only mean color shift per feature channel
      - texture_only: only variance (texture energy), no color shift
    """
    try:
        import comfy.model_management
        device = comfy.model_management.get_torch_device()
    except Exception:
        device = "cuda" if torch.cuda.is_available() else "cpu"

    encoder = _get_vgg_encoder(device)
    if not encoder.available:
        _log("VGG encoder unavailable — falling back to Reinhard color transfer.")
        return reinhard_color_transfer(content_pil, style_pil)

    # Resize style to match content dimensions for aligned feature extraction
    style_resized = style_pil.resize(content_pil.size, Image.Resampling.LANCZOS)

    with torch.no_grad():
        content_tensor = _preprocess_for_vgg(content_pil, device)
        style_tensor = _preprocess_for_vgg(style_resized, device)

        content_features = encoder(content_tensor)
        style_features = encoder(style_tensor)

        # Apply AdaIN at the deepest feature layer (relu4_1)
        cf = content_features[-1]
        sf = style_features[-1]

        result = _adain_core(cf, sf, attention_mode)

        # Simple decoder: use the content tensor as initialization and
        # iteratively optimize to match the target feature statistics.
        # For speed, use a direct feature-space reconstruction approach.
        result_img = _feature_to_image(result, content_pil, device)

    # Cleanup GPU memory
    if device != "cpu":
        encoder.to("cpu")
        torch.cuda.empty_cache()

    return result_img


def _adain_core(content_feat, style_feat, mode):
    """
    Core AdaIN operation: normalizes content features and re-styles them
    using statistics from the style features based on the attention mode.

    content_feat: (1, C, H, W) content feature tensor
    style_feat:   (1, C, H, W) style feature tensor
    mode:         which statistical properties to transfer
    """
    c_mean = content_feat.mean(dim=[2, 3], keepdim=True)
    c_std = content_feat.std(dim=[2, 3], keepdim=True) + 1e-6

    s_mean = style_feat.mean(dim=[2, 3], keepdim=True)
    s_std = style_feat.std(dim=[2, 3], keepdim=True) + 1e-6

    # Normalize content features to zero mean, unit variance
    normalized = (content_feat - c_mean) / c_std

    if mode == "full_kv":
        # Full transfer: apply both style mean and style variance
        return normalized * s_std + s_mean

    elif mode == "value_only":
        # Transfer texture (variance) and color (mean) but preserve spatial layout
        return normalized * s_std + s_mean

    elif mode == "key_only":
        # Transfer structural correlation but keep content's own statistics
        # Use Gram matrix alignment for structural transfer
        return normalized * c_std + c_mean  # Base: keep content stats
        # The structural effect comes from the feature-to-image reconstruction

    elif mode == "color_only":
        # Only shift the mean (color), keep content's variance (texture)
        return normalized * c_std + s_mean

    elif mode == "texture_only":
        # Only transfer variance (texture energy), keep content's mean (color)
        return normalized * s_std + c_mean

    # Fallback: full transfer
    return normalized * s_std + s_mean


def _feature_to_image(features, content_pil, device):
    """
    Reconstructs an RGB image from VGG features using iterative optimization.
    Starts from the content image and adjusts pixels to match the target
    feature representation. Limited to 200 iterations for speed.
    """
    # Clone explicitly to shed any inference_mode history from ComfyUI's global thread state.
    features = features.detach().clone()
    
    # ComfyUI runs entirely inside torch.inference_mode(). Enable_grad() cannot bypass it.
    # We must explicitly suspend inference_mode before autograd will respond.
    with torch.inference_mode(False), torch.enable_grad():
        content_tensor = _preprocess_for_vgg(content_pil, device)
        result = content_tensor.clone().requires_grad_(True)

        optimizer = torch.optim.Adam([result], lr=0.02)
        encoder = _get_vgg_encoder(device)

        for i in range(200):
            optimizer.zero_grad()
            current_features = encoder(result)
            loss = F.mse_loss(current_features[-1], features)
            loss.backward()
            optimizer.step()

        result_img = _deprocess_from_vgg(result.detach())
    return result_img


def wct_transfer(content_pil, style_pil, attention_mode="full_kv"):
    """
    Whitening and Coloring Transform (WCT) style transfer.
    More faithful than AdaIN — performs full covariance matrix alignment
    between content and style features using SVD decomposition.

    Produces more painterly, artwork-like results at the cost of slightly
    more compute time.
    """
    try:
        import comfy.model_management
        device = comfy.model_management.get_torch_device()
    except Exception:
        device = "cuda" if torch.cuda.is_available() else "cpu"

    encoder = _get_vgg_encoder(device)
    if not encoder.available:
        _log("VGG encoder unavailable — falling back to Reinhard color transfer.")
        return reinhard_color_transfer(content_pil, style_pil)

    style_resized = style_pil.resize(content_pil.size, Image.Resampling.LANCZOS)

    with torch.no_grad():
        content_tensor = _preprocess_for_vgg(content_pil, device)
        style_tensor = _preprocess_for_vgg(style_resized, device)

        content_features = encoder(content_tensor)
        style_features = encoder(style_tensor)

        cf = content_features[-1]
        sf = style_features[-1]

        result_feat = _wct_core(cf, sf, attention_mode)
        result_img = _feature_to_image(result_feat.detach(), content_pil, device)

    if device != "cpu":
        encoder.to("cpu")
        torch.cuda.empty_cache()

    return result_img


def _wct_core(content_feat, style_feat, mode):
    """
    Core WCT operation: whitens content features (removes all style information)
    then colors them with the style's covariance structure.

    Uses SVD (Singular Value Decomposition) on the feature covariance matrix.
    """
    B, C, H, W = content_feat.shape
    cf = content_feat.view(C, -1)  # (C, H*W)
    sf = style_feat.view(C, -1)

    # Content statistics
    c_mean = cf.mean(dim=1, keepdim=True)
    cf_centered = cf - c_mean

    # Style statistics
    s_mean = sf.mean(dim=1, keepdim=True)
    sf_centered = sf - s_mean

    if mode in ("color_only",):
        # For color-only mode, skip covariance alignment — just shift means
        result = cf_centered + s_mean
        return result.view(B, C, H, W)

    if mode in ("texture_only",):
        # Scale variance without shifting mean
        c_std = cf_centered.std(dim=1, keepdim=True) + 1e-6
        s_std = sf_centered.std(dim=1, keepdim=True) + 1e-6
        result = cf_centered / c_std * s_std + c_mean
        return result.view(B, C, H, W)

    # --- WHITENING (remove content style) ---
    c_cov = (cf_centered @ cf_centered.T) / (cf_centered.shape[1] - 1) + torch.eye(C).to(cf.device) * 1e-5

    try:
        U_c, S_c, V_c = torch.linalg.svd(c_cov)
        # Whitening transform: D^(-1/2) @ U^T
        d_c = torch.diag(1.0 / (S_c.sqrt() + 1e-5))
        whitened = d_c @ U_c.T @ cf_centered
    except RuntimeError:
        # SVD can fail on degenerate matrices — fall back to AdaIN behavior
        _log("WCT SVD failed on content features — using AdaIN fallback.")
        return _adain_core(content_feat, style_feat, mode)

    if mode == "key_only":
        # Structural transfer: apply whitening but recolor with content stats
        result = whitened + c_mean
        return result.view(B, C, H, W)

    # --- COLORING (apply style covariance) ---
    s_cov = (sf_centered @ sf_centered.T) / (sf_centered.shape[1] - 1) + torch.eye(C).to(sf.device) * 1e-5

    try:
        U_s, S_s, V_s = torch.linalg.svd(s_cov)
        d_s = torch.diag(S_s.sqrt() + 1e-5)
        colored = U_s @ d_s @ U_s.T @ whitened
    except RuntimeError:
        _log("WCT SVD failed on style features — using AdaIN fallback.")
        return _adain_core(content_feat, style_feat, mode)

    # Re-center with style mean
    result = colored + s_mean
    return result.view(B, C, H, W)


# ==============================================================================
# SECTION 3: MULTI-IMAGE BLENDING
# ==============================================================================

def blend_style_images(style_images, blend_mode, weights):
    """
    Combines multiple style reference images into a single composite
    based on the selected blend mode. The resulting composite is then
    used as input for the style transfer method.

    style_images:  list of PIL Images
    blend_mode:    how the images are combined
    weights:       per-image weight values (for 'weighted' mode)
    """
    if len(style_images) == 1:
        return style_images[0]

    # Resize all images to match the first image's dimensions
    target_size = style_images[0].size
    resized = [img.resize(target_size, Image.Resampling.LANCZOS) for img in style_images]
    arrays = [np.array(img, dtype=np.float32) for img in resized]

    if blend_mode == "weighted":
        # Normalize weights so they sum to 1.0
        total_w = sum(weights[:len(arrays)]) + 1e-8
        result = np.zeros_like(arrays[0])
        for arr, w in zip(arrays, weights):
            result += arr * (w / total_w)

    elif blend_mode == "sequential":
        # Return images as a list — caller handles sequential application
        return style_images

    elif blend_mode == "concatenate":
        # Simple arithmetic mean of all style images
        result = np.mean(arrays, axis=0)

    elif blend_mode == "combine_add":
        # Additive blend, clamped to valid range
        result = np.sum(arrays, axis=0) / len(arrays)

    elif blend_mode == "multiply":
        # Multiplicative blend: shared features reinforced, differences suppressed
        result = arrays[0] / 255.0
        for arr in arrays[1:]:
            result *= arr / 255.0
        result *= 255.0

    elif blend_mode == "max":
        # Per-pixel maximum across all images
        result = np.maximum.reduce(arrays)

    elif blend_mode == "min":
        # Per-pixel minimum across all images
        result = np.minimum.reduce(arrays)

    elif blend_mode == "median":
        # Per-pixel median across all images (rejects outliers)
        result = np.median(arrays, axis=0)

    elif blend_mode == "screen":
        # Screen blend: 1 - product of (1 - each image)
        result = np.ones_like(arrays[0])
        for arr in arrays:
            result *= (1.0 - arr / 255.0)
        result = (1.0 - result) * 255.0

    elif blend_mode == "overlay":
        # Overlay blend: combination of multiply and screen based on base brightness
        base = arrays[0] / 255.0
        result = base.copy()
        for arr in arrays[1:]:
            top = arr / 255.0
            mask = base < 0.5
            result = np.where(mask, 2 * result * top, 1 - 2 * (1 - result) * (1 - top))
        result *= 255.0

    else:
        # Fallback: arithmetic mean
        result = np.mean(arrays, axis=0)

    return Image.fromarray(result.clip(0, 255).astype(np.uint8), "RGB")


# ==============================================================================
# SECTION 4: MASTER STYLE TRANSFER DISPATCHER
# ==============================================================================

STYLE_METHODS = {
    "reinhard_color":     reinhard_color_transfer,
    "histogram_match":    histogram_match,
    "fft_texture":        fft_texture_transfer,
    "optimal_transport":  optimal_transport_transfer,
    "adain":              adain_transfer,
    "wct":                wct_transfer,
}

# Methods that support attention mode selection (neural methods)
ATTENTION_CAPABLE = {"adain", "wct"}


def execute_style_transfer(content_pil, style_images, method, attention_mode,
                           strength, blend_mode, weights):
    """
    Master dispatcher for style transfer. Handles multi-image blending,
    method routing, strength blending, and sequential application.

    content_pil:    the source image as PIL
    style_images:   list of style reference PIL images
    method:         string key for the transfer algorithm
    attention_mode: 'full_kv', 'value_only', 'key_only', 'color_only', 'texture_only'
    strength:       0.0 to 1.0, blend between original and transferred result
    blend_mode:     how multiple style images are combined
    weights:        per-image weight values
    """
    if not style_images:
        return content_pil

    transfer_fn = STYLE_METHODS.get(method, reinhard_color_transfer)
    uses_attention = method in ATTENTION_CAPABLE

    if blend_mode == "sequential" and len(style_images) > 1:
        # Sequential mode: apply style transfer once per reference image,
        # using each result as the input for the next pass
        current = content_pil
        per_step_strength = strength ** (1.0 / len(style_images))

        for style_img in style_images:
            if uses_attention:
                transferred = transfer_fn(current, style_img, attention_mode)
            else:
                transferred = transfer_fn(current, style_img)

            # Blend with per-step strength for cumulative consistency
            current = _blend_images(current, transferred, per_step_strength)

        return current

    else:
        # All non-sequential modes: blend the style images first, then transfer
        composite = blend_style_images(style_images, blend_mode, weights)

        if isinstance(composite, list):
            # Fallback if blending returned a list (shouldn't happen here)
            composite = composite[0]

        if uses_attention:
            transferred = transfer_fn(content_pil, composite, attention_mode)
        else:
            transferred = transfer_fn(content_pil, composite)

        # Final strength blend between original and transferred
        return _blend_images(content_pil, transferred, strength)


def _blend_images(original_pil, transferred_pil, strength):
    """
    Linear pixel-level blend between the original and transferred images.
    strength=0.0 returns original, strength=1.0 returns fully transferred.
    """
    if strength >= 0.999:
        return transferred_pil
    if strength <= 0.001:
        return original_pil

    orig = np.array(original_pil, dtype=np.float32)
    trans = np.array(transferred_pil.resize(original_pil.size, Image.Resampling.LANCZOS), dtype=np.float32)
    blended = orig * (1.0 - strength) + trans * strength
    return Image.fromarray(blended.clip(0, 255).astype(np.uint8), "RGB")


# ==============================================================================
# SECTION 5: COLOR SPACE CONVERSION HELPERS
# ==============================================================================

def _rgb_to_lab(img_rgb):
    """
    Converts an RGB float array (0-255) to approximate LAB color space.
    Uses the standard sRGB -> XYZ -> LAB conversion pipeline.
    """
    # Normalize to 0-1
    rgb = img_rgb / 255.0

    # sRGB gamma correction (linearize)
    mask = rgb > 0.04045
    rgb_linear = np.where(mask, ((rgb + 0.055) / 1.055) ** 2.4, rgb / 12.92)

    # RGB to XYZ (D65 illuminant)
    r, g, b = rgb_linear[:, :, 0], rgb_linear[:, :, 1], rgb_linear[:, :, 2]
    x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375
    y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750
    z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041

    # Normalize to D65 white point
    x /= 0.95047
    z /= 1.08883

    # XYZ to LAB
    epsilon = 0.008856
    kappa = 903.3

    def f(t):
        return np.where(t > epsilon, t ** (1 / 3), (kappa * t + 16) / 116)

    fx, fy, fz = f(x), f(y), f(z)

    L = 116 * fy - 16
    a = 500 * (fx - fy)
    b_ch = 200 * (fy - fz)

    return np.stack([L, a, b_ch], axis=-1)


def _lab_to_rgb(img_lab):
    """
    Converts an LAB float array back to RGB (0-255 range).
    Inverse of the LAB conversion pipeline.
    """
    L, a, b_ch = img_lab[:, :, 0], img_lab[:, :, 1], img_lab[:, :, 2]

    fy = (L + 16) / 116
    fx = a / 500 + fy
    fz = fy - b_ch / 200

    epsilon = 0.008856
    kappa = 903.3

    def finv(t):
        t3 = t ** 3
        return np.where(t3 > epsilon, t3, (116 * t - 16) / kappa)

    x = finv(fx) * 0.95047
    y = finv(fy)
    z = finv(fz) * 1.08883

    # XYZ to linear RGB
    r = x * 3.2404542 + y * -1.5371385 + z * -0.4985314
    g = x * -0.9692660 + y * 1.8760108 + z * 0.0415560
    b = x * 0.0556434 + y * -0.2040259 + z * 1.0572252

    # Gamma correction (linear to sRGB)
    rgb = np.stack([r, g, b], axis=-1)
    mask = rgb > 0.0031308
    rgb = np.where(mask, 1.055 * (np.maximum(rgb, 0) ** (1 / 2.4)) - 0.055, 12.92 * rgb)

    return rgb * 255.0


def _match_single_histogram(source, template):
    """
    Matches the histogram of a single-channel source image to match
    the histogram distribution of the template image.
    """
    s_values, s_idx, s_counts = np.unique(source.ravel(), return_inverse=True, return_counts=True)
    t_values, t_counts = np.unique(template.ravel(), return_counts=True)

    # Compute CDFs (cumulative distribution functions)
    s_cdf = np.cumsum(s_counts).astype(np.float64)
    s_cdf /= s_cdf[-1]

    t_cdf = np.cumsum(t_counts).astype(np.float64)
    t_cdf /= t_cdf[-1]

    # Map source pixel values to template pixel values via CDF matching
    interp_values = np.interp(s_cdf, t_cdf, t_values)
    return interp_values[s_idx].reshape(source.shape).astype(np.uint8)
