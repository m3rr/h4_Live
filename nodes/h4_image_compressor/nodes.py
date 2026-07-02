from PIL import Image, UnidentifiedImageError
import io
import os
import tempfile
import time
import traceback
import uuid

try:
    import numpy as np
except Exception:
    np = None

try:
    import torch
except Exception:
    torch = None

try:
    import folderpaths
except Exception:
    folderpaths = None


class _CallableSequence(list):
    def __call__(self):
        return tuple(self)


try:
    _RESAMPLING_LANCZOS = Image.Resampling.LANCZOS
except Exception:
    _RESAMPLING_LANCZOS = Image.LANCZOS


_PREVIEW_FULL_SUBFOLDER = "h4_compressor_preview_full"
_PREVIEW_THUMB_SUBFOLDER = "h4_compressor_preview_thumb"
_PREVIEW_THUMB_MAX_SIDE = 512
_PREVIEW_THUMB_QUALITY = 72


def _get_temp_root():
    if folderpaths is not None:
        for attr in ("get_temp_directory", "gettempdirectory"):
            fn = getattr(folderpaths, attr, None)
            if callable(fn):
                try:
                    return os.path.abspath(fn())
                except Exception:
                    pass
    return os.path.abspath(tempfile.gettempdir())


def _ensure_dir(path):
    os.makedirs(path, exist_ok=True)
    return path


def _sanitize_ext(fmt):
    ext = str(fmt or "jpeg").strip().lower()
    if ext == "jpeg":
        ext = "jpg"
    return ext


def _clamp_quality(q):
    try:
        q = int(q)
    except Exception:
        raise ValueError("Quality must be an integer")
    return max(1, min(100, q))


def _parse_background(bg_str):
    try:
        parts = [int(p.strip()) for p in str(bg_str).split(",") if p.strip() != ""]
        if len(parts) >= 3:
            return (parts[0] % 256, parts[1] % 256, parts[2] % 256)
    except Exception:
        pass
    return (255, 255, 255)


def _flatten_alpha_to_rgb(img, background=(255, 255, 255)):
    if img.mode in ("RGBA", "LA"):
        background_img = Image.new("RGB", img.size, background)
        background_img.paste(img, mask=img.split()[-1])
        return background_img
    return img.convert("RGB")


def _save_image_to_bytes(img, target_format, quality=85, background=(255, 255, 255)):
    buf = io.BytesIO()
    save_kwargs = {}

    exif = img.info.get("exif") if hasattr(img, "info") else None
    if exif:
        save_kwargs["exif"] = exif

    fmt = (target_format or "").upper().strip() or "JPEG"
    working_img = img

    if fmt in ("JPG", "JPEG"):
        img_to_save = _flatten_alpha_to_rgb(working_img, background=background)
        save_kwargs.update({"format": "JPEG", "quality": quality, "optimize": True})
    elif fmt == "PNG":
        img_to_save = working_img
        save_kwargs.update({"format": "PNG", "optimize": True, "compress_level": 9})
    elif fmt == "WEBP":
        img_to_save = working_img
        save_kwargs.update({"format": "WEBP", "quality": quality, "method": 6})
    elif fmt in ("BMP", "TIFF", "GIF"):
        img_to_save = working_img
        save_kwargs.update({"format": fmt})
    else:
        img_to_save = _flatten_alpha_to_rgb(working_img, background=background)
        save_kwargs.update({"format": "JPEG", "quality": quality, "optimize": True})
        fmt = "JPEG"

    img_to_save.save(buf, **save_kwargs)
    data = buf.getvalue()
    buf.close()
    return data, save_kwargs.get("format", fmt)


def _safe_write_bytes_to_path(bts: bytes, path: str):
    directory = os.path.dirname(path)
    if directory:
        _ensure_dir(directory)
    tmp = f"{path}.tmp-{int(time.time() * 1000)}-{uuid.uuid4().hex[:8]}"
    with open(tmp, "wb") as f:
        f.write(bts)
    os.replace(tmp, path)
    return path


def _generate_default_filename(fmt: str, index=None):
    ts = time.strftime("%Y%m%d-%H%M%S")
    ext = _sanitize_ext(fmt)
    if index is None:
        return f"h4_compressed_{ts}.{ext}"
    return f"h4_compressed_{ts}_{index:04d}.{ext}"


def _pil_to_tensor(img):
    if torch is None or np is None:
        return None
    arr = np.array(img.convert("RGB"), copy=True).astype(np.float32) / 255.0
    return torch.from_numpy(arr)


def _pil_list_to_batched_tensor(images):
    if torch is None or np is None or not images:
        return None
    tensors = []
    for img in images:
        t = _pil_to_tensor(img)
        if t is not None:
            tensors.append(t)
    if not tensors:
        return None
    return torch.stack(tensors, dim=0)


def _open_pil_from_input(image_input):
    if image_input is None:
        raise ValueError("No image input provided")

    if isinstance(image_input, Image.Image):
        orig_fmt = getattr(image_input, "format", None)
        img = image_input.convert("RGBA")
        if orig_fmt:
            img.info["_orig_format"] = orig_fmt
        return img

    if isinstance(image_input, (bytes, bytearray)):
        try:
            img = Image.open(io.BytesIO(image_input))
            orig_fmt = getattr(img, "format", None)
            img = img.convert("RGBA")
            if orig_fmt:
                img.info["_orig_format"] = orig_fmt
            return img
        except UnidentifiedImageError as e:
            raise ValueError(f"Could not identify image from bytes: {e}")
        except Exception as e:
            raise ValueError(f"Could not open image from bytes: {e}")

    if np is not None and isinstance(image_input, np.ndarray):
        arr = image_input
        if arr.dtype != np.uint8:
            if arr.dtype in (np.float16, np.float32, np.float64):
                arr = (np.clip(arr, 0, 1) * 255).astype(np.uint8)
            else:
                arr = arr.astype(np.uint8)

        if arr.ndim == 2:
            return Image.fromarray(arr, mode="L").convert("RGBA")

        if arr.ndim == 3 and arr.shape[2] in (3, 4):
            mode = "RGBA" if arr.shape[2] == 4 else "RGB"
            return Image.fromarray(arr, mode=mode).convert("RGBA")

        if arr.ndim == 3 and arr.shape[0] in (1, 3, 4):
            arr = np.transpose(arr, (1, 2, 0))
            mode = "RGBA" if arr.shape[2] == 4 else "RGB"
            return Image.fromarray(arr, mode=mode).convert("RGBA")

        raise ValueError(f"Unsupported numpy array shape: {arr.shape}")

    raise TypeError(f"Unsupported image input type: {type(image_input)}")


def _image_input_to_pil_batch(image_input):
    if torch is not None and isinstance(image_input, torch.Tensor):
        t = image_input.detach().cpu()
        if t.dim() == 3:
            t = t.unsqueeze(0)
        if t.dim() != 4:
            raise ValueError(f"Unsupported IMAGE tensor rank: {t.dim()}")
        if t.shape[-1] not in (3, 4):
            raise ValueError(f"Unsupported IMAGE tensor shape: {tuple(t.shape)}")

        if t.dtype in (torch.float16, torch.float32, torch.float64, torch.bfloat16):
            t = t.clamp(0.0, 1.0).mul(255.0)
        if t.dtype != torch.uint8:
            t = t.to(torch.uint8)

        pil_images = []
        for i in range(t.shape[0]):
            arr = t[i].numpy()
            mode = "RGBA" if arr.shape[2] == 4 else "RGB"
            img = Image.fromarray(arr, mode=mode).convert("RGBA")
            img.info["_orig_format"] = "PNG"
            pil_images.append(img)
        return pil_images

    return [_open_pil_from_input(image_input)]


def _make_thumbnail_from_bytes(image_bytes, background=(255, 255, 255), max_side=_PREVIEW_THUMB_MAX_SIDE):
    with Image.open(io.BytesIO(image_bytes)) as img:
        img.load()
        img = img.convert("RGBA")
        thumb = img.copy()

    thumb.thumbnail((max_side, max_side), _RESAMPLING_LANCZOS)
    thumb_to_save = _flatten_alpha_to_rgb(thumb, background=background)

    buf = io.BytesIO()
    thumb_to_save.save(
        buf,
        format="WEBP",
        quality=_PREVIEW_THUMB_QUALITY,
        method=6,
        optimize=True,
    )
    thumb_bytes = buf.getvalue()
    buf.close()
    return thumb_bytes, thumb.size[0], thumb.size[1]


def _write_temp_asset(image_bytes, subfolder, extension):
    root = _ensure_dir(os.path.join(_get_temp_root(), subfolder))
    filename = f"h4_preview_{int(time.time() * 1000)}_{uuid.uuid4().hex[:10]}.{extension}"
    path = os.path.join(root, filename)
    _safe_write_bytes_to_path(image_bytes, path)
    return filename, path


def _build_preview_entry(compressed_bytes, used_format, background, saved_path=None, batch_index=0):
    full_filename, full_abs_path = _write_temp_asset(compressed_bytes, _PREVIEW_FULL_SUBFOLDER, _sanitize_ext(used_format))
    thumb_bytes, thumb_w, thumb_h = _make_thumbnail_from_bytes(compressed_bytes, background=background)
    thumb_filename, thumb_abs_path = _write_temp_asset(thumb_bytes, _PREVIEW_THUMB_SUBFOLDER, "webp")

    with Image.open(io.BytesIO(compressed_bytes)) as img:
        full_w, full_h = img.size

    return {
        "index": int(batch_index),
        "filename": full_filename,
        "subfolder": _PREVIEW_FULL_SUBFOLDER,
        "type": "temp",
        "thumb_filename": thumb_filename,
        "thumb_subfolder": _PREVIEW_THUMB_SUBFOLDER,
        "thumb_type": "temp",
        "saved_path": saved_path,
        "full_path": full_abs_path,
        "thumb_path": thumb_abs_path,
        "format": _sanitize_ext(used_format),
        "width": int(full_w),
        "height": int(full_h),
        "thumb_width": int(thumb_w),
        "thumb_height": int(thumb_h),
    }


def _resolve_save_targets(save_path, fmt, batch_count):
    ext = _sanitize_ext(fmt)
    raw = str(save_path or "").strip()

    if not raw:
        base_dir = _get_temp_root()
        if batch_count == 1:
            return [os.path.join(base_dir, _generate_default_filename(fmt))]
        stamp = time.strftime("%Y%m%d-%H%M%S")
        return [
            os.path.join(base_dir, f"h4_compressed_{stamp}_{i + 1:04d}.{ext}")
            for i in range(batch_count)
        ]

    if raw.endswith(os.sep) or os.path.isdir(raw):
        base_dir = raw.rstrip(os.sep)
        if batch_count == 1:
            return [os.path.join(base_dir, _generate_default_filename(fmt))]
        stamp = time.strftime("%Y%m%d-%H%M%S")
        return [
            os.path.join(base_dir, f"h4_compressed_{stamp}_{i + 1:04d}.{ext}")
            for i in range(batch_count)
        ]

    base, existing_ext = os.path.splitext(raw)
    stem = base if existing_ext else raw
    use_ext = existing_ext.lstrip(".") if existing_ext else ext

    if batch_count == 1:
        return [f"{stem}.{use_ext}"]

    return [f"{stem}_{i + 1:04d}.{use_ext}" for i in range(batch_count)]


class H4_ImageCompressor:
    @staticmethod
    def INPUT_TYPES():
        return {
            "required": {
                "image": ("IMAGE",),
            },
            "optional": {
                "quality": ("INT", {"default": 85, "min": 1, "max": 100, "step": 1}),
                "format": (
                    "STRING",
                    {
                        "default": "JPEG",
                        "choices": ["JPEG", "PNG", "WEBP", "BMP", "TIFF", "GIF"],
                    },
                ),
                "show_preview": ("BOOL", {"default": True}),
                "preview_only": ("BOOL", {"default": False}),
                "save_mode": ("BOOL", {"default": True}),
                "save_path": ("STRING", {"default": ""}),
                "background_color": ("STRING", {"default": "255,255,255"}),
            },
        }

    RETURN_TYPES = _CallableSequence(["IMAGE", "BYTES", "STRING"])
    FUNCTION = "process"
    CATEGORY = "h4"

    def process(
        self,
        image,
        quality=85,
        format="JPEG",
        show_preview=True,
        preview_only=False,
        save_mode=True,
        save_path="",
        background_color="255,255,255",
    ):
        try:
            if image is None:
                raise ValueError("No image provided to H4_ImageCompressor.process")

            pil_batch = _image_input_to_pil_batch(image)
            if not pil_batch:
                raise ValueError("No image frames were available for compression")

            q = _clamp_quality(quality)
            bg = _parse_background(background_color)

            if preview_only:
                save_mode = False

            if isinstance(format, dict):
                fmt_val = format.get("value") or format.get("name") or format.get("label") or ""
                format = fmt_val or "JPEG"
            if not isinstance(format, str) or not format:
                format = "JPEG"
            target_fmt = format.upper().strip()

            preview_entries = []
            preview_pils = []
            saved_paths = []
            first_bytes = None
            save_targets = _resolve_save_targets(save_path, target_fmt, len(pil_batch)) if save_mode else []

            for idx, pil_img in enumerate(pil_batch):
                compressed_bytes, used_format = _save_image_to_bytes(
                    pil_img,
                    target_fmt,
                    quality=q,
                    background=bg,
                )

                if first_bytes is None:
                    first_bytes = compressed_bytes

                saved_path_value = None
                if save_mode:
                    saved_path_value = _safe_write_bytes_to_path(compressed_bytes, save_targets[idx])
                    saved_paths.append(saved_path_value)

                preview_entry = _build_preview_entry(
                    compressed_bytes,
                    used_format,
                    background=bg,
                    saved_path=saved_path_value,
                    batch_index=idx,
                )
                preview_entries.append(preview_entry)

                if show_preview:
                    with Image.open(io.BytesIO(compressed_bytes)) as preview_img:
                        preview_img.load()
                        preview_pils.append(preview_img.convert("RGB"))

            out_image = _pil_list_to_batched_tensor(preview_pils) if show_preview else None
            out_bytes = first_bytes if save_mode else None
            out_path = None
            if save_mode:
                out_path = saved_paths[0] if len(saved_paths) == 1 else "\n".join(saved_paths)

            return {
                "ui": {
                    "h4_preview": preview_entries,
                    "h4_batch_count": len(preview_entries),
                    "h4_show_preview": bool(show_preview),
                    "h4_preview_mode": "batch" if len(preview_entries) > 1 else "single",
                    "h4_preview_thumb_max_side": _PREVIEW_THUMB_MAX_SIDE,
                },
                "result": (out_image, out_bytes, out_path),
            }

        except Exception as e:
            tb = traceback.format_exc()
            raise RuntimeError(f"[H4 Image Compressor] Error in process: {e}\n{tb}")


def compress_image_bytes(image_bytes, quality=85, format="JPEG", background_color="255,255,255"):
    img = _open_pil_from_input(image_bytes)
    q = _clamp_quality(quality)
    bg = _parse_background(background_color)
    compressed_bytes, _ = _save_image_to_bytes(
        img,
        format or img.info.get("_orig_format", "JPEG"),
        quality=q,
        background=bg,
    )
    return compressed_bytes
