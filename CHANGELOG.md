# 📜 h4_Live Node Pack — Living Changelog & Audit Ledger

> [!IMPORTANT]
> **LIVING DOCUMENT POLICY**: This changelog is a permanent, cumulative ledger of all architectural overhauls, security updates, bug fixes, and feature additions made to the `comfyui_h4_live` ecosystem. This document is **NEVER RE-WRITTEN OR TRUNCATED**—it is continuously appended to after every major milestone, release, or system patch to provide 100% transparent provenance of the codebase.

---

## [v11.2.9] — 2026-08-08
### 🚀 Patch Release v11.2.9
- **`ml_dtypes` Environment Polyfill**:
  - Implemented automatic environment polyfill for `ml_dtypes.float4_e2m1fn` in `__init__.py` and `nodes/h4_faceforge/__init__.py` to eliminate `AttributeError: module 'ml_dtypes' has no attribute 'float4_e2m1fn'` crashes caused by legacy `ml_dtypes` packages in python environments.
- **`h4_display_any` Decoupling**:
  - Decoupled `h4_display_any` from `h4_faceforge.utils`, making its `tensor_to_pil` implementation local and self-contained so loading errors in external face dependencies never cascade into logic nodes.

---

## [v11.2.8] — 2026-08-08
### 🚀 Major Feature & Audit Release v11.2.8
- **Civitai Bridge Overhaul & SSL Fix (`h4_Link_QoL`)**:
  - Implemented `_safe_urlopen` helper with automatic SSL certificate verification fallback context to resolve Windows SSL handshake failures on Civitai API queries.
  - Added session persistence for Civitai Bridge drawer state (`localStorage`), auto-restoring open state and executing model search on load.
  - Built interactive Mouse-Tracking Model Hover Tooltip Overlay (`#h4-link-hover-tooltip`) with smart viewport boundary clamping, high-res previews, base model badges, rating/download metrics, trigger words, and descriptions.
  - Non-blocking server architecture offloading Civitai API requests to background executor thread pools.
  - Live Download Manager panel with real-time percentage, transfer size, speed, and download cancellation controls.
  - API Key token support for accessing restricted/NSFW models.
- **Sticky Cyberpunk Tooltip Bug Fix**:
  - Resolved sticky `DRAG_IDENTIFYING` HUD tooltip in `h4_SmartSave.js` by removing global ALT key trigger and enforcing strict hover bounds listeners and Escape/keyup dismiss triggers across `h4_SmartSave.js` and `h4_img_compress.js`.

---

## [v11.2.7] — 2026-08-06
### 🚀 Release v11.2.7
- **Version Bump & Registry Sync**: Synchronized system-wide version identifiers to `11.2.7` across `pyproject.toml`, `version.py`, `__init__.py`, and module API headers for ComfyUI Registry publish.

---

## [v10.2.0] — 2026-08-01
### 🚀 Major Feature Release: `h4_Link_QoL` (The Civitai Bridge) & System Overhaul

#### 1. Civitai Bridge & Model Manager (`h4_Link_QoL`)
- **What Was Changed:** Integrated a native, browser-free model search, preview, and download engine (`nodes/h4_link_qol/`). Added a top-bar toggle button (`🔗 Civitai`), a primary slide-out search drawer (`#h4-link-drawer-panel`), and a secondary model specifications drawer (`#h4-link-details-panel`) featuring an interactive high-resolution showcase image carousel gallery, model metadata readouts, trigger word extraction, and direct canvas node parameter injection.
- **Why It Was Made:** ComfyUI creators previously had to switch between external web browsers and filesystem model folders to find, download, check trigger words, and type model names into loader nodes. This QoL module unifies searching, image inspection, background downloading, sidecar generation, and node injection into a single seamless canvas workflow.
- **How It Was Implemented:**
  - **Backend API Gateway (`civitai_api.py`):** Asynchronous REST service querying `https://civitai.com/api/v1/models` with filter tags (`LORA`, `Checkpoint`, `VAE`). Integrated with ComfyUI's native `folder_paths` API to resolve target directories (`models/loras`, `models/checkpoints`, `models/vae`, `models/controlnet`).
  - **Background Downloader & Sidecars:** Built a non-blocking chunked streaming downloader (`1048576` byte buffer chunks) running on background executor threads with real-time byte counter telemetry (`/h4/link/status`). Automatically serializes `.txt` trigger word arrays and `.json` version manifests adjacent to downloaded models.
  - **Dual-Drawer Glassmorphism UI (`js/h4_LinkQoL.js` & `nodes/h4_link_qol/web/h4_LinkQoL.js`):** Built slide-out DOM panels with `backdrop-filter: blur(12px)` and ultra-high `z-index: 100006`. Added dynamic real-time viewport positioning (`positionButton()`) to place the button strictly to the left of the Dead Weight Detector without overlap. Built an interactive carousel image gallery with thumbnail pagination, direct `/h4/link/details` REST API integration for deep showcase image fetching, HTML description sanitization, and a one-click **Copy Trigger Words** button.
  - **Secondary Drawer Close Fix:** Fixed inline CSS property override on `#h4-link-details-panel` where `style.right = "400px"` prevented closing. Added explicit `style.right = "-440px"` off-screen retraction on close events.
  - **Dynamic Aspect-Ratio Fitting Container & Large 100px Thumbnails (`#h4-link-lightbox`):** Expanded details drawer width to `480px` and thumbnail strip elements to `100px x 100px` with active glow highlights. Implemented an automatic aspect-ratio layout engine (`onload` event calculating `naturalWidth / naturalHeight`) that dynamically scales container height between `290px` (wide landscape), `380px` (square), and `500px` (tall portrait) to wrap tightly around showcase images without cropping or pillarboxing.
  - **Canvas Node Parameter Injection:** Graph AST walker parsing `app.canvas.selected_nodes`, locating target widgets (`lora_name`, `model_name`, `active_model_name`), and mutating widget values in-place with `app.canvas.setDirty(true, true)`.
  - **Default Configuration:** Configured all `h4_Link_QoL` options (`civitaiBridgeEnabled`, `civitaiAutoInject`, `civitaiSidecars`) to default as **ENABLED** (`true`).

---

#### 2. Core Infrastructure Overhaul & Audit Fixes
- **Windows UTF-8 Console Safety:**
  - *What:* Overhauled `_log()` in `core/h4_core.py` and `__init__.py` with non-UTF-8 stream encoding fallbacks.
  - *Why:* Printing emojis or non-encodable characters to standard Windows console streams (`cp1252`) threw fatal `UnicodeEncodeError` exceptions.
  - *How:* Implemented try-except UTF-8 encoding fallbacks that sanitize or replace non-encodable glyphs automatically.
- **Server API Route Security & Integrity:**
  - *What:* Corrected relative import and `RUNTIME_CACHE` bindings for `/h4/history` in `core/h4_server.py`. Applied strict path sanitization across `/h4/preset` and `/h4/comparinator/image` endpoints.
  - *Why:* Prevents server crashes on history lookups and eliminates directory traversal vulnerability risks (`../`).
  - *How:* Used `os.path.basename` and `os.path.abspath` boundary checks to enforce strict root directory containment.
- **JS Asset Harvester Preservation:**
  - *What:* Overhauled `harvest_js_assets()` in `__init__.py` with dynamic protected script checks.
  - *Why:* Previous harvester logic accidentally pruned root extension scripts from `./js/` on startup.
  - *How:* Expanded `PROTECTED_JS` patterns and dynamically scanned existing root extension scripts before executing cleanup cycles.
- **Non-Blocking Python Kernel Dependencies:**
  - *What:* Removed blocking `subprocess.check_call([sys.executable, "-m", "pip", "install", ...])` during module load in `pythonipulator_inator.py`.
  - *Why:* Executing synchronous `pip` commands on module import blocked ComfyUI startup and caused server launch timeouts.
  - *How:* Replaced blocking pip calls with non-blocking import checks and lazy warning indicators.
- **ComfyUI Version Compatibility (`count_blocks`):**
  - *What:* Added defensive `count_blocks` fallback helper in `nodes/h4_loaders/nodes.py`.
  - *Why:* Modern ComfyUI releases refactored `comfy.model_detection`, breaking imports on older/newer releases.
  - *How:* Wrapped module import in try-except block and provided an internal UNet block counting fallback.
- **SQLite Concurrency & Locking Hardening:**
  - *What:* Configured 30.0s connection timeout and WAL (Write-Ahead Logging) mode in `nodes/h4_smart_save/nodes_save.py`.
  - *Why:* Multi-threaded execution in ComfyUI triggered `sqlite3.OperationalError: database is locked` during parallel image saves.
  - *How:* Added `timeout=30.0` to `sqlite3.connect()` and set `PRAGMA journal_mode=WAL;`.
- **VRAM & Memory Leak Fixes:**
  - *What:* Added `comfy.model_management.soft_empty_cache()` and explicit `gc.collect()` calls to `nodes/h4_model_merger/nodes.py`.
  - *Why:* Model merging leaves unreferenced tensors in VRAM, degrading performance in subsequent generation passes.
  - *How:* Explicitly flushed torch CUDA cache and ran garbage collection prior to returning merged model tuples.
- **Empty Folder Ingestion Safeguards:**
  - *What:* Added zero-file checks in `nodes/h4_datastream/nodes.py`.
  - *Why:* Reading an empty folder threw unhandled array indexing errors and crashed execution loops.
  - *How:* Added empty directory checks returning a safe blank tensor `[1, 64, 64, 3]` with warning log.

---

## [v10.1.0] — 2026-07-20
### 🧹 The Hygiene Protocol & Dead Weight Detector

- **H4_DeadWeightDetector (D.W.D)**: Officially released static graph hygiene engine (`js/h4_dead_weight.js`). BFS backward-crawling identifies unlinked, isolated, or compute-wasting nodes in real time.
- **H4_SmartSave**: Promoted to STABLE. Hardened history rail concurrency and resolved final viewport occlusion bugs.
- **Repository Optimization**: Purged redundant archive binaries and scratch files to streamline clone size.

---

## [v9.5.1] — 2026-06-15
### ⚙️ Kernel Hardening & SmartSave Refinement

- **H4_Pythonipulator-inator**: Introduced OpenCV, Pillow, and scikit-image image processing kernel.
- **H4_SmartSave**: Added Lightbox visual inspection and metadata PNG chunk parsing.
