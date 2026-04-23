import torch
import inspect
import datetime

# ==============================================================================
# H4_Oxidine - The Sentient Conduit (Hardened Backend)
# ==============================================================================

class H4_Oxidine:
    """
    Oxidine backend: a single-output router that can carry multiple payload types safely.

    Hard rules for robustness:
    - Proxy never subclasses list/dict/ModelPatcher/VAE/CLIP. This prevents ComfyUI's executor from
      treating it as a list and mapping over it (which causes type chaos like CLIP being fed as VAE).
    - Proxy implements enough dict + sequence behavior for ComfyUI core nodes to treat it naturally.
    - Attribute routing is deterministic (decode => VAE, tokenize/encode_from_tokens => CLIP, patch_model => MODEL).
    """

    @classmethod
    def INPUT_TYPES(cls):
        # Match the JS that can create many sockets.
        optional = {f"input_{i}": ("*",) for i in range(1, 51)}
        return {
            "required": {},
            "optional": optional,
            "hidden": {
                "node_id": "UNIQUE_ID",
                "prompt": "PROMPT",
                "extra_pnginfo": "EXTRA_PNGINFO",
            },
        }

    RETURN_TYPES = ("*",)
    RETURN_NAMES = ("output",)
    FUNCTION = "route_traffic"
    CATEGORY = "h4/logic"

    @staticmethod
    def identify_type(obj):
        if obj is None:
            return "UNKNOWN"

        # Already a proxy
        if hasattr(obj, "_h4_is_proxy") and getattr(obj, "_h4_is_proxy", False):
            return "OMNIPROXY"

        c_name = obj.__class__.__name__.upper()

        # MODEL (ModelPatcher)
        if hasattr(obj, "patch_model") or hasattr(obj, "get_model_object") or "MODELPATCHER" in c_name:
            return "MODEL"

        # VAE
        if hasattr(obj, "decode") and hasattr(obj, "encode") and hasattr(obj, "first_stage_model"):
            return "VAE"

        # CLIP
        if hasattr(obj, "tokenize") and hasattr(obj, "encode_from_tokens"):
            return "CLIP"

        # LATENT is a dict with "samples": Tensor
        if isinstance(obj, dict):
            if "samples" in obj and isinstance(obj.get("samples", None), torch.Tensor):
                return "LATENT"
            return "DICT"

        # Tensor categories (ComfyUI images are typically NHWC float 0..1, latents are NCHW)
        if isinstance(obj, torch.Tensor):
            if obj.ndim == 4 and obj.shape[-1] in (3, 4):
                return "IMAGE"
            if obj.ndim >= 2:
                return "MASK"
            return "TENSOR"

        # Conditioning is list of (tensor, dict)
        if isinstance(obj, list):
            if (
                len(obj) > 0
                and isinstance(obj[0], (list, tuple))
                and len(obj[0]) == 2
                and isinstance(obj[0][0], torch.Tensor)
                and isinstance(obj[0][1], dict)
            ):
                return "CONDITIONING"
            return "LIST"

        if isinstance(obj, str):
            return "STRING"
        if isinstance(obj, int):
            return "INT"
        if isinstance(obj, float):
            return "FLOAT"
        return "UNKNOWN"

    def route_traffic(self, node_id=None, prompt=None, extra_pnginfo=None, **kwargs):
        # Collect payloads in socket order.
        raw = []
        # Sort input_1, input_2, etc. naturally
        for k in sorted(kwargs.keys(), key=lambda x: int(x.split("_")[1]) if "_" in x and x.split("_")[1].isdigit() else 9999):
            v = kwargs.get(k, None)
            if v is None:
                continue
            raw.append(v)

        # Flatten non-conditioning lists to keep routing flexible.
        flattened = []
        for v in raw:
            t = self.identify_type(v)
            if isinstance(v, list) and t != "CONDITIONING":
                flattened.extend(v)
            else:
                flattened.append(v)

        if not flattened:
            return (None,)

        # Build registry.
        reg = {
            "MODEL": [],
            "VAE": [],
            "CLIP": [],
            "LATENT": [],
            "IMAGE": [],
            "MASK": [],
            "CONDITIONING": [],
            "DICT": [],
            "LIST": [],
            "STRING": [],
            "INT": [],
            "FLOAT": [],
            "TENSOR": [],
            "UNKNOWN": [],
        }

        # Preserve latent dict and image tensor references as-is.
        for v in flattened:
            vt = self.identify_type(v)
            if vt == "OMNIPROXY":
                # Merge in.
                for kk, vv in getattr(v, "_h4_registry", {}).items():
                    if kk in reg:
                        reg[kk].extend(vv if isinstance(vv, list) else [vv])
                # Keep best-of references
                continue
            if vt not in reg:
                vt = "UNKNOWN"
            reg[vt].append(v)

            # Deep-unpack dict bundles if someone passes a mega-cluster dict.
            if isinstance(v, dict) and vt != "LATENT":
                for dk, dv in v.items():
                    kU = str(dk).upper()
                    if kU in ("MODEL", "MODEL_PATCHER"):
                        reg["MODEL"].append(dv)
                    elif kU in ("VAE", "VAE_PATCHER"):
                        reg["VAE"].append(dv)
                    elif kU in ("CLIP", "CLIP_PATCHER"):
                        reg["CLIP"].append(dv)
                    elif kU in ("LATENT", "SAMPLES"):
                        reg["LATENT"].append(v)

        # Conditioning pairing: first conditioning seen is positive, second is negative.
        cond_pos = reg["CONDITIONING"][0] if len(reg["CONDITIONING"]) >= 1 else None
        cond_neg = reg["CONDITIONING"][1] if len(reg["CONDITIONING"]) >= 2 else None

        model = reg["MODEL"][0] if reg["MODEL"] else None
        vae = reg["VAE"][0] if reg["VAE"] else None
        clip = reg["CLIP"][0] if reg["CLIP"] else None

        latent = reg["LATENT"][0] if reg["LATENT"] else None
        image = reg["IMAGE"][0] if reg["IMAGE"] else None
        mask = reg["MASK"][0] if reg["MASK"] else None

        proxy = H4_SovereignProxy(
            registry=reg,
            model=model,
            vae=vae,
            clip=clip,
            latent=latent,
            image=image,
            mask=mask,
            cond_pos=cond_pos,
            cond_neg=cond_neg,
        )
        return (proxy,)


class H4_SovereignProxy:
    """
    Multi-type payload proxy.

    Key behavior goals:
    - Behaves like LATENT dict when accessed by key ("samples", "noise_mask", "batch_index", copy(), pop()).
    - Behaves like CONDITIONING sequence when iterated in KSampler positive/negative context.
    - Behaves like IMAGE batch when iterated in SaveImage/PreviewImage context.
    - Attribute routing is deterministic to prevent VAEDecode accidentally using CLIP, etc.
    """

    def __init__(self, registry, model=None, vae=None, clip=None, latent=None, image=None, mask=None, cond_pos=None, cond_neg=None):
        object.__setattr__(self, "_h4_is_proxy", True)
        object.__setattr__(self, "_h4_registry", registry or {})
        object.__setattr__(self, "_model", model)
        object.__setattr__(self, "_vae", vae)
        object.__setattr__(self, "_clip", clip)
        object.__setattr__(self, "_latent", latent if isinstance(latent, dict) else None)
        object.__setattr__(self, "_image", image if isinstance(image, torch.Tensor) else None)
        object.__setattr__(self, "_mask", mask if isinstance(mask, torch.Tensor) else None)
        object.__setattr__(self, "_cond_pos", cond_pos)
        object.__setattr__(self, "_cond_neg", cond_neg)

        object.__setattr__(self, "_last_ctx_ts", 0.0)
        object.__setattr__(self, "_cached_ctx", None)

    # ---- Safety: never allow Tensor truthiness surprises on the proxy itself
    def __bool__(self):
        return True

    # ---- Context detection
    def _context(self):
        now = datetime.datetime.now().timestamp()
        cached = object.__getattribute__(self, "_cached_ctx")
        last = object.__getattribute__(self, "_last_ctx_ts")
        if cached is not None and (now - last) < 0.05:
            return cached

        ctx = None
        try:
            for fr in inspect.stack()[1:12]:
                loc = fr.frame.f_locals

                # Images (PreviewImage/SaveImage commonly uses arg name "images")
                if "images" in loc and loc["images"] is self:
                    ctx = "IMAGES"
                    break
                if "image" in loc and loc["image"] is self:
                    ctx = "IMAGE"
                    break
                if "pixels" in loc and loc["pixels"] is self:
                    ctx = "IMAGES"
                    break

                # Conditioning
                if "negative" in loc and loc["negative"] is self:
                    ctx = "NEG"
                    break
                if "positive" in loc and loc["positive"] is self:
                    ctx = "POS"
                    break
        except Exception:
            ctx = None

        object.__setattr__(self, "_cached_ctx", ctx)
        object.__setattr__(self, "_last_ctx_ts", now)
        return ctx

    def _iterable(self):
        ctx = self._context()

        # Prefer image batch for preview/save contexts
        if ctx in ("IMAGES", "IMAGE"):
            img = object.__getattribute__(self, "_image")
            if isinstance(img, torch.Tensor):
                return img
            m = object.__getattribute__(self, "_mask")
            if isinstance(m, torch.Tensor):
                return m

        # Conditioning contexts
        if ctx == "NEG":
            c = object.__getattribute__(self, "_cond_neg")
            if c is not None:
                return c
        if ctx == "POS":
            c = object.__getattribute__(self, "_cond_pos")
            if c is not None:
                return c

        # Default: prefer conditioning (if present), else image, else latent samples, else any list payload, else [].
        c = object.__getattribute__(self, "_cond_pos")
        if c is not None:
            return c
        img = object.__getattribute__(self, "_image")
        if isinstance(img, torch.Tensor):
            return img
        lat = object.__getattribute__(self, "_latent")
        if isinstance(lat, dict) and "samples" in lat and isinstance(lat.get("samples", None), torch.Tensor):
            return lat["samples"]

        # Fallback list-like
        reg = object.__getattribute__(self, "_h4_registry")
        if reg.get("LIST"):
            return reg["LIST"][0]
        return []

    # ---- Sequence protocol
    def __iter__(self):
        return iter(self._iterable())

    def __len__(self):
        it = self._iterable()
        try:
            return len(it)
        except Exception:
            return 1

    def __getitem__(self, key):
        # Numeric indexing for sequence-like use
        if isinstance(key, (int, slice)):
            it = self._iterable()
            return it[key]

        # Dict-like access for LATENT and bundles
        if isinstance(key, str):
            lat = object.__getattribute__(self, "_latent")
            if isinstance(lat, dict):
                if key in lat:
                    return lat[key]
                if key == "samples" and "samples" in lat:
                    return lat["samples"]

            # Convenience keys for image/mask
            if key in ("image", "images"):
                img = object.__getattribute__(self, "_image")
                if img is not None:
                    return img
            if key in ("mask", "masks"):
                m = object.__getattribute__(self, "_mask")
                if m is not None:
                    return m

        raise KeyError(key)

    def __setitem__(self, key, value):
        # Used by sampler when it does out["samples"] = samples
        if isinstance(key, str):
            lat = object.__getattribute__(self, "_latent")
            if lat is None:
                lat = {}
                object.__setattr__(self, "_latent", lat)
            lat[key] = value
            return
        raise TypeError("Only string keys supported")

    def __contains__(self, key):
        if isinstance(key, str):
            lat = object.__getattribute__(self, "_latent")
            return isinstance(lat, dict) and (key in lat)
        try:
            return key in self._iterable()
        except Exception:
            return False

    # ---- Dict API used by ComfyUI LATENT nodes
    def copy(self):
        lat = object.__getattribute__(self, "_latent")
        return dict(lat) if isinstance(lat, dict) else {}

    def pop(self, key, default=None):
        lat = object.__getattribute__(self, "_latent")
        if isinstance(lat, dict):
            return lat.pop(key, default)
        return default

    def get(self, key, default=None):
        try:
            return self[key]
        except Exception:
            return default

    def keys(self):
        lat = object.__getattribute__(self, "_latent")
        return lat.keys() if isinstance(lat, dict) else {}.keys()

    def items(self):
        lat = object.__getattribute__(self, "_latent")
        return lat.items() if isinstance(lat, dict) else {}.items()

    def values(self):
        lat = object.__getattribute__(self, "_latent")
        return lat.values() if isinstance(lat, dict) else {}.values()

    # ---- Deterministic attribute routing
    def __getattr__(self, name):
        model = object.__getattribute__(self, "_model")
        vae = object.__getattribute__(self, "_vae")
        clip = object.__getattribute__(self, "_clip")
        img = object.__getattribute__(self, "_image")
        mask = object.__getattribute__(self, "_mask")
        lat = object.__getattribute__(self, "_latent")

        # VAE intent
        if name in ("decode", "decode_tiled", "encode", "encode_tiled"):
            if vae is not None and hasattr(vae, name):
                return getattr(vae, name)
            raise AttributeError(f"[h4_Oxidine] Requested VAE.{name} but no VAE is present in this bundle.")

        # CLIP intent
        if name in ("tokenize", "encode_from_tokens", "clip_layer", "set_clip_skip"):
            if clip is not None and hasattr(clip, name):
                return getattr(clip, name)
            raise AttributeError(f"[h4_Oxidine] Requested CLIP.{name} but no CLIP is present in this bundle.")

        # MODEL intent
        if name in ("patch_model", "get_model_object", "clone", "add_patches", "set_model_sampler_cfg_function"):
            if model is not None and hasattr(model, name):
                return getattr(model, name)
            raise AttributeError(f"[h4_Oxidine] Requested MODEL.{name} but no MODEL is present in this bundle.")

        # Tensor-like intent
        if name in ("shape", "dtype", "device", "size", "ndim", "cpu", "to", "numpy", "permute", "contiguous", "clone", "detach"):
            if isinstance(img, torch.Tensor) and hasattr(img, name):
                return getattr(img, name)
            if isinstance(mask, torch.Tensor) and hasattr(mask, name):
                return getattr(mask, name)
            if isinstance(lat, dict) and "samples" in lat and isinstance(lat["samples"], torch.Tensor) and hasattr(lat["samples"], name):
                return getattr(lat["samples"], name)

        # Generic search order with guardrails
        for obj in (model, vae, clip, img, mask):
            if obj is not None and hasattr(obj, name):
                return getattr(obj, name)

        if isinstance(lat, dict) and hasattr(lat, name):
            return getattr(lat, name)

        reg = object.__getattribute__(self, "_h4_registry")
        for k in ("MODEL", "VAE", "CLIP", "LATENT", "IMAGE", "MASK", "DICT", "LIST", "TENSOR"):
            arr = reg.get(k, [])
            if arr:
                obj = arr[0]
                if obj is not None and hasattr(obj, name):
                    return getattr(obj, name)

        raise AttributeError(f"[h4_Oxidine] Attribute '{name}' not found in bundle.")

    def __repr__(self):
        reg = object.__getattribute__(self, "_h4_registry")
        present = [k for k, v in reg.items() if v]
        return f"<H4_SovereignProxy types={present}>"

# Registration