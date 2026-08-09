# 🤝 h4_Live ToolKit — System Handoff & Technical Architecture Ledger
> **Current Version**: `11.2.13`  
> **Status**: Production Hardened - Forensic Core  
> **Repository**: [https://github.com/m3rr/h4_Live](https://github.com/m3rr/h4_Live)

---

## 🎯 Executive Overview & Handoff Summary

The **h4_Live ToolKit** (`comfyui_h4_live`) is a production-grade custom node suite for ComfyUI. It introduces persistent canvas state management, real-time forensic parameters tracking, non-blocking Civitai API model search & download management, dynamic model preview tooltips, image compression, and face-swapping capabilities.

All features, bug fixes, and environment compatibility shims requested up to version `11.2.12` have been fully implemented, verified, git-committed, and published to the ComfyUI Registry (`api.comfy.org`).

---

## 🏗️ Architectural Component Map

```
comfyui_h4_live/
├── __init__.py                     # Mothership Dynamic Discovery Engine & ml_dtypes Polyfill
├── version.py                      # System-wide version identifier (11.2.12)
├── pyproject.toml                  # ComfyRegistry metadata & dependencies
├── CHANGELOG.md                    # Permanent cumulative release ledger
├── HANDOFF.md                      # Complete system architectural handoff document
├── core/
│   ├── h4_core.py                  # Holy Grail global state & UTF-8 console logger
│   ├── h4_server.py                # Non-blocking AsyncIO server routes & Civitai API gateway
│   └── h4_session_manager.py       # Session database & parameter tracking persistence
├── js/
│   ├── h4_LinkQoL.js               # Civitai Bridge UI v2.0, Download Manager & Model Tooltips
│   ├── h4_Dashboard.js             # Central Settings Modal & Master QoL matrix
│   ├── h4_SmartSave.js             # Forensic Image Saver, HUD & Tooltip Kernel
│   ├── h4_img_compress.js          # Client-side Image Compression Engine
│   └── [other extension modules]
└── nodes/
    ├── h4_link_qol/                # Civitai Bridge Node & API Backend
    │   ├── civitai_api.py          # Asynchronous urllib wrapper with SSL cert fallback & sidecars
    │   ├── nodes.py                # H4_LinkQoL Node definition & RETURN_TYPES
    │   └── web/h4_LinkQoL.js       # Synced JS web extension asset
    ├── h4_display_any/             # Decoupled Universal Display Node
    ├── h4_faceforge/               # Face Swap & Identity Engine with ml_dtypes polyfill
    └── [other node shelves]
```

---

## ⚡ Key Technical Features & Subsystems

### 1. Civitai Bridge & Model Manager (`h4_Link_QoL`)
- **Non-Blocking Architecture**: Synchronous `urllib.request` calls are offloaded to background thread pools via `await loop.run_in_executor(None, ...)` in [core/h4_server.py](file:///d:/PROJECTS/COMFYUI_Custom_Node/h4_ToolKit_v2/comfyui_h4_live-dev/core/h4_server.py) to prevent event-loop thread blocking.
- **SSL Certificate Fallback**: `_safe_urlopen` in [nodes/h4_link_qol/civitai_api.py](file:///d:/PROJECTS/COMFYUI_Custom_Node/h4_ToolKit_v2/comfyui_h4_live-dev/nodes/h4_link_qol/civitai_api.py) applies `ssl._create_unverified_context()` by default to handle Windows/Cloudflare SSL certificate verification failures cleanly.
- **Live Download Manager**: Embedded progress drawer polling `/h4/link/status` at 1s intervals with animated progress bars, downloaded MB counters, and cancellation routes (`/h4/link/cancel_download`).
- **Preview Sidecars**: Downloads `<model_name>.preview.png`, `.txt` (trigger words), and `.json` (version payload) sidecars alongside `.safetensors` files, and automatically invalidates `folder_paths.filename_list_cache`.

### 2. Multi-Context Model Hover Tooltip Overlay (`#h4-link-hover-tooltip`)
- **Civitai Drawer Cards**: Hovering over search result cards displays high-res showcase thumbnails, badges, ratings, download metrics, trigger words, and descriptions.
- **Open Dropdown Lists (`.litecontextmenu`)**: Hovering over any model filename in open LiteGraph dropdown menus queries local sidecars or Civitai API (`/h4/link/info?name=...`) and displays the hover preview overlay.
- **Canvas Selected Model Widgets**: Hovering over selected checkpoint / LoRA / VAE widgets on canvas nodes (without opening the menu) displays the rich model hover preview overlay.
- **Client Caching**: Caches model info lookups in `_modelInfoCache` to eliminate latency on repeated hovers.

### 3. Environment Compatibility Shims
- **`ml_dtypes` Dynamic Interception**: Implemented dynamic `__getattr__` module polyfilling in `__init__.py` and `nodes/h4_faceforge/__init__.py`. If legacy `ml_dtypes` packages are installed in the user's Python environment, missing attributes (`float4_e2m1fn`, `float8_e8m0fnu`, etc.) dynamically return a safe fallback type instead of raising `AttributeError`.
- **`h4_display_any` Decoupling**: Decoupled `H4_DisplayAny` from `h4_faceforge.utils`, making its `tensor_to_pil` implementation local and isolated.

---

## 🛠️ Developer Verification & Deployment Workflow

When making future updates to the repository:
1. **Compile & Syntax Check**:
   ```powershell
   python -m py_compile __init__.py version.py core/h4_server.py nodes/h4_link_qol/civitai_api.py
   ```
2. **Version Synchronization**: Update `version.py`, `pyproject.toml`, and append notes to `CHANGELOG.md`.
3. **Git Deployment**:
   ```powershell
   git add .
   git commit -m "vX.Y.Z: Description of changes"
   git push origin main
   ```
4. **ComfyUI Registry Publication**:
   ```powershell
   $env:PYTHONIOENCODING="utf-8"
   comfy node publish --token <PUBLISH_SECRET>
   ```

---

## 🏁 Hand-off Status

- **Git Branch**: `main` (clean working tree, fully pushed to `origin/main`).
- **Registry Version**: Published up to **`11.2.12`**.
- **Known Issues**: None. All requested features, fixes, and edge cases are resolved and production hardened.
