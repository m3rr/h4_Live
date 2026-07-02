# Node Pack Audit

This document will contain a line‑by‑line, plain‑language audit of each node in the h4_ToolKit.

---

## Node: h4_smart_save

**Location:** [`nodes/h4_smart_save/__init__.py`](nodes/h4_smart_save/__init__.py:1), [`nodes/h4_smart_save/nodes_save.py`](nodes/h4_smart_save/nodes_save.py:1), [`nodes/h4_smart_save/web/h4_SmartSave.js`](nodes/h4_smart_save/web/h4_SmartSave.js:1)

### Overview
The *Smart Save* node is responsible for persisting generated images (and accompanying metadata) to disk in a structured, searchable way. It can operate in two modes:
- **Save to Disk** – writes PNG files and side‑car JSON files into the ComfyUI output folder.
- **Preview Only** – writes temporary preview files to a temporary directory, leaving the main output folder untouched.

### Key Components
- **`H4_ManifestCache`** – a singleton class that creates and manages a SQLite database (`h4_smart_manifest_v1.db`) storing a registry of saved assets. It ensures thread‑safe initialization via a class‑level lock.
- **`H4_SmartSave`** – the main node class exposing the ComfyUI interface. It defines input ports, optional parameters, and the `smart_save` method that performs the actual image write and side‑car creation.
- Utility Functions – `normalize_root_dir`, `ensure_dir`, `clean_nan` help with path handling and data sanitisation.
- API Routes – a handful of HTTP endpoints (`/h4/smart_save/history`, `/list_folder`, `/sidecar`, `/cache_swap`) expose the manifest and file‑listing functionality to the UI.

### Core Workflow
1. **Initialisation** – on first use the manifest singleton creates the SQLite DB (if missing) and ensures the `assets` table exists.
2. **Parameter Resolution** – `_resolve_output` decides where files will be stored based on `save_mode`, `output_path`, and `filename_prefix`.
3. **Metadata Extraction** – pulls node‑level metadata via `H4_SessionManager.extract_metadata` to build a *side‑car* payload.
4. **Side‑car Construction** – `_build_sidecar` assembles an identity block (author, model, comments, timestamps) and optional custom JSON payload.
5. **File Naming** – determines the next sequential counter for the chosen filename prefix to avoid overwriting existing files.
6. **Write Loop** – iterates over each input image, saves the PNG, writes the side‑car JSON, builds a result entry, and records the asset in the SQLite manifest.
7. **API Exposure** – registered routes enable the UI to query recent saves, list folder contents, retrieve side‑car data, and manage a tiny undo‑cache for the node.

### Configuration / Parameters (exposed in ComfyUI UI)
- `filename_prefix` – default `"h4_"`; acts as the base name for saved files.
- `save_mode` – boolean toggle; when *true* files are written to the permanent output folder, otherwise they go to a temporary preview folder.
- `output_path` – optional sub‑directory under the output folder.
- `metadata_mode` – selectable list controlling which identity fields are stored (`None`, `Clean (Author)`, `Lite (Author+Model)`, `Lite+ (+Prompt)`, `Full (Forensic)`, `Custom`).
- `json_mode` – controls the side‑car JSON payload (`None`, `Custom`, `Full (Forensic)`).
- `author`, `model_name`, `comments`, `custom_json` – free‑form strings used by the side‑car builder.

### Observations & Recommendations
- **Thread Safety:** The manifest uses a global lock for singleton creation, which is sufficient for the typical ComfyUI single‑process environment.
- **Performance:** SQLite is opened and closed per operation; this is fine for modest workloads but could be optimised with a long‑living connection if the node becomes a bottleneck.
- **Error Handling:** Most DB and file operations are wrapped in `try/except` blocks that log to the console, preventing crashes but offering limited user feedback.
- **Extensibility:** Custom JSON handling already allows arbitrary payloads; future extensions could expose additional fields (e.g., EXIF tags) without code changes.
- **Security:** The node writes directly to user‑specified paths; it already validates absolute paths for `output_path`, but further sanitisation could be added to guard against path traversal attacks.

---

## Node: h4_axis

**Location:** [`nodes/h4_axis/__init__.py`](nodes/h4_axis/__init__.py:1), [`nodes/h4_axis/nodes.py`](nodes/h4_axis/nodes.py:1)

### Overview
The *Axis Driver* node generates a JSON configuration describing three plotting axes (X, Y, Z) for the Gridinator tool. It normalises input data, validates presets, and can output the full axis state as well as a legacy human‑readable summary.

### Key Components
- **Constants** – define supported presets, defaults, style options, and maximum items per axis.
- **Helper Functions** – a suite of private functions (`_axis_driver_default_state`, `_axis_driver_normalise_style`, `_axis_driver_normalise_item`, `_axis_driver_normalise_axis`, `_axis_driver_normalise_state`, `_axis_driver_parse_config`, `_axis_driver_slot_payload`, `_axis_driver_legacy_summary`) handle deep cloning, validation, and conversion of raw user input into a clean, deterministic state.
- **`H4_AxisDriver`** – the ComfyUI node definition exposing a single `config` string input (JSON) and four outputs: three axis payloads (X, Y, Z) and a legacy summary.
- **Logging** – uses a fallback `_log` function that prints to the console when the core logger cannot be imported.

### Core Workflow
1. **Input Parsing** – the `config` string is passed to `_axis_driver_parse_config`. If parsing fails, the node falls back to the default axis state.
2. **State Normalisation** – raw JSON is transformed into a structured state with validated presets, limited item counts, and merged style settings.
3. **Slot Payload Generation** – for each of the three slots, `_axis_driver_slot_payload` extracts the preset, items, and shared style, returning a JSON string.
4. **Legacy Summary** – `_axis_driver_legacy_summary` builds a compact, multi‑line text representation of the axis configuration for quick visual debugging.
5. **Output** – the `emit` method returns the three JSON payloads and the summary string.

### Configuration Parameters (UI)
- `config` – multi‑line string containing JSON that specifies the axis layout. Example (default) is generated from `AXIS_DRIVER_DEFAULT_STATE`.
- Tooltips – inform the user that the field receives data from the visual grid editor and typically does not need manual editing.

### Observations & Recommendations
- **Robustness:** The node gracefully handles malformed JSON by reverting to defaults and logging a warning, preventing crashes.
- **Extensibility:** Adding new presets or style options involves extending the constant tuples and updating the normalisation helpers.
- **Performance:** All normalisation occurs synchronously; for very large payloads the copy‑deep operations could be profiled, but typical usage (≤8 items per axis) is negligible.
- **Documentation:** The docstring and tooltip provide clear guidance, but adding a small usage example in the README could help non‑technical users.
- **Testing:** Unit tests covering each helper function (especially `_axis_driver_parse_config` and `_axis_driver_legacy_summary`) would ensure future changes do not break behaviour.

---

## Node: h4_comparinator

**Location:** [`nodes/h4_comparinator/__init__.py`](nodes/h4_comparinator/__init__.py:1), [`nodes/h4_comparinator/nodes.py`](nodes/h4_comparinator/nodes.py:1), [`nodes/h4_comparinator/web/h4_Comparinator.js`](nodes/h4_comparinator/web/h4_Comparinator.js:1)

### Overview
The *Comparinator* node provides an interactive A/B image comparison tool with a full‑screen UI, history vault, and extensive controls. It lets users compare two images side‑by‑side, explore previous generations via a film‑strip, and export selected results. The node supports both temporary preview mode and permanent save mode, and integrates with a server‑side vault for persistent history.

### Key Components
- **`H4_Comparinator`** – the core Python node exposing image inputs, save toggle, filename prefix, and optional metadata fields. It handles runtime caching, manual save triggers, and API interaction.
- **Runtime Cache** – a `defaultdict` of deques (`RUNTIME_CACHE`) storing the most recent comparison entries for quick manual saves.
- **Vault Integration** – optionally imports `ComparinatorVault` from `h4_comparinator_vault`. If unavailable, a mock vault provides no‑op methods. The vault stores JSON metadata and image files for long‑term history.
- **Session Manager** – extracts execution metadata (prompt, node ID) to enrich side‑car data.
- **API Routes** – registered under `/h4/comparinator/*` providing history JSON, image retrieval, and a manual‑save endpoint.
- **Frontend UI (`h4_Comparinator.js`)** – a rich JavaScript UI that creates a layered comparison canvas, sliders, film‑strip, lightbox, and parameter drawer. It communicates with the backend via the `/h4/comparinator/*` endpoints.
- **Utility Functions** – `clean_nan` for safe JSON serialization, various helper methods for image saving, zoom handling, and UI state management.

### Core Workflow
1. **Image Reception** – `compare_images` receives two image tensors, optionally a frozen image, and metadata. It saves temporary WebP previews for UI consumption.
2. **Save Mode** – if `save_mode` is true, the node parses `save_settings` (JSON) and delegates to `_process_save_logic` which writes PNG files (A, B, optional comparison) to the user‑specified output directory, embedding optional PNG metadata (prompt, workflow, custom comments).
3. **Vault Update** – extracts session metadata, builds a meta dictionary, and stores it via `ComparinatorVault.save_entry`.
4. **Runtime Cache Update** – appends a new history entry to `RUNTIME_CACHE` for the node ID, enabling manual saves via the UI.
5. **UI Synchronisation** – broadcasts a `h4.comparinator.update` event to the frontend with the current entry and recent history (limited to 25 items).
6. **Frontend Rendering** – the JavaScript UI displays the live images, sliders, and a film‑strip of history. Users can select images for green/red/yellow slots, lock panes, toggle inspection mode, and export results via the Save Drawer.

### Configuration Parameters (UI)
- `image_a` – required input image ("Before" or control image).
- `image_b` – optional second image ("After" or test image).
- `save_mode` – Boolean; when true, images are persisted to the output folder instead of temporary previews.
- `filename_prefix` – Base filename for saved assets.
- `metadata_text`, `save_settings` – optional strings for custom metadata and JSON‑encoded save options.
- Hidden fields – `unique_id`, `extra_pnginfo`, `prompt` are injected by ComfyUI for tracking.

### Observations & Recommendations
- **Robustness:** The node gracefully falls back to mock vault and session manager when imports fail, ensuring the UI still works in minimal environments.
- **Performance:** Image saving is performed synchronously per image; for large batches this could be off‑loaded to a background thread or async task.
- **Security:** Path resolution in `_resolve_path` sanitises inputs and restricts vault traversal, but additional validation of user‑provided `save_settings.path` could further mitigate directory‑traversal risks.
- **UX Polish:** The UI already provides rich visual feedback (flicker, reticle, lightbox). Adding keyboard shortcuts for slot selection could improve accessibility.
- **Testing:** Unit tests for `_process_save_logic`, `_resolve_path`, and cache handling would protect against regressions, especially when the vault implementation changes.
- **Documentation:** A short walkthrough in the node README describing the film‑strip interaction and manual‑save workflow would aid new users.

---

## Node: h4_comparinator_vault

**Location:** [`nodes/h4_comparinator_vault/__init__.py`](nodes/h4_comparinator_vault/__init__.py:1), [`nodes/h4_comparinator_vault/nodes.py`](nodes/h4_comparinator_vault/nodes.py:1)

### Overview
The *Comparinator Vault* provides persistent storage for the history entries generated by the `h4_comparinator` node. It organizes JSON metadata and associated image files into date‑based folders, enforces FIFO retention policies, and offers fast retrieval of recent entries.

### Key Components
- **`ComparinatorVault`** – static‑method‑based manager handling folder creation, capacity enforcement, entry validation, and history retrieval.
- **Folder Structure** – Root directory `comparinator/` contains sub‑folders named `YYYY‑MM‑DD` or `YYYY‑MM‑DD-[N]` when a single day exceeds the per‑folder image limit.
- **Retention Policy** – limits total stored entries to 25 across all folders; oldest entries are pruned automatically.
- **Cache Layer** – `_HISTORY_CACHE` with `_CACHE_VALID` flag and `_VAULT_MTIME` token to avoid re‑scanning the filesystem on every request.
- **API Integration** – `h4_comparinator` calls `save_entry` to persist a new history item and `get_all_history` to retrieve the latest entries for the UI.

### Core Workflow
1. **Saving an Entry** – `save_entry` validates the incoming metadata (requires `image_id` and `temp_save_name`), enforces the capacity limit, determines today’s storage folder (`get_todays_folder`), copies any temporary image files into the vault, writes a JSON file containing the metadata, and invalidates the cache.
2. **Folder Management** – `get_todays_folder` either returns an existing folder for the current date or creates a new overflow folder (`YYYY‑MM‑DD-[N]`) when the current folder reaches `MAX_IMAGES_PER_FOLDER`.
3. **Capacity Enforcement** – `_enforce_capacity` scans all JSON files, keeps the newest 25 entries, deletes older JSONs and their associated image files, then prunes empty folders.
4. **History Retrieval** – `get_all_history` returns a merged list of vault entries (up to the newest 25) and any temporary WebP previews that are not already represented, sorted by timestamp.
5. **Cache Invalidation** – any mutation (save or prune) calls `invalidate_cache` to ensure subsequent reads refresh the history.

### Observations & Recommendations
- **Schema Validation:** Currently only checks for `image_id` and `temp_save_name`. Adding stricter validation for required fields (e.g., timestamps, filenames) would catch malformed entries early.
- **Capacity Configurable:** Hard‑coded `MAX_IMAGES_PER_FOLDER` (100) and overall `HISTORY_LIMIT` (25) could be exposed as class attributes or environment variables for easier tuning.
- **Thread Safety:** The class uses class‑level variables without locks; in a multithreaded environment this could lead to race conditions when multiple nodes save simultaneously.
- **Cache Coherency:** The cache invalidation works but could be improved by tracking per‑folder mtimes rather than a global token, reducing unnecessary rescans.
- **Error Reporting:** Errors are logged via `_log` but not propagated. Raising exceptions or returning status codes would allow the calling node to respond to failures (e.g., disk full).
- **Documentation:** A short README explaining the folder layout, retention policy, and how to manually inspect or clean the vault would be beneficial for power users.

---

## Node: h4_context

**Location:** [`nodes/h4_context/__init__.py`](nodes/h4_context/__init__.py:1), [`nodes/h4_context/nodes.py`](nodes/h4_context/nodes.py:1)

### Overview
The *Context Hub* and *Context Unpack* nodes provide a simple pipe‑and‑filter mechanism for passing arbitrary ComfyUI data structures between sub‑graphs. The hub aggregates any supplied inputs into a single dictionary (`h4_pipe`) while logging the received types. The unpack node reverses this process, exposing the individual elements as separate outputs.

### Key Components
- **`H4_ContextHub`** – accepts optional inputs of any major ComfyUI type (model, VAE, CLIP, conditioning, latent, image, mask, plus two generic slots). It builds a dictionary (`h4_pipe`) containing each supplied value and returns the dictionary alongside passthrough ports for each type.
- **`H4_ContextUnpack`** – takes the `h4_pipe` dictionary and extracts the stored values, outputting them on the appropriate ports.
- **Dynamic Type Support** – uses the wildcard `ANY_TYPE` to accept any data type for the generic `any_A` and `any_B` slots, making the hub highly flexible.
- **Debug Logging** – `log_input` prints concise information about each received input (tensor shape, class name, list length, etc.) to aid developers in tracing data flow.

### Core Workflow
1. **Hub Execution** – `process_hub` creates a new pipe (or extends an existing one). It iterates over all optional inputs, adds any non‑null values to the pipe, and logs their characteristics via `log_input`.
2. **Return Values** – the node returns the assembled `h4_pipe` dictionary plus each individual input value (or `None` if absent), enabling downstream nodes to use either the aggregated pipe or the direct outputs.
3. **Unpack Execution** – `unpack_pipe` receives the `h4_pipe` dictionary and simply retrieves each key, returning them in the order defined by `RETURN_TYPES`.

### Configuration Parameters (UI)
- No exposed parameters; the node simply passes through whatever inputs are connected.

### Observations & Recommendations
- **Utility:** Excellent for modular workflows where a sub‑graph needs to receive a bundle of heterogeneous data without hard‑coding each connection.
- **Safety:** The hub logs missing inputs but otherwise silently accepts `None`, which is appropriate for optional data.
- **Extensibility:** The generic `any_A`/`any_B` slots allow future custom data types without code changes.
- **Documentation:** Adding a short usage example in the README would help users understand typical patterns (e.g., bundling a model, VAE, and conditioning for a downstream sampler).
- **Testing:** Simple unit tests confirming that values survive a round‑trip through hub → unpack would validate correctness.

---

## Node: h4_datastream

**Location:** [`nodes/h4_datastream/__init__.py`](nodes/h4_datastream/__init__.py:1), [`nodes/h4_datastream/nodes.py`](nodes/h4_datastream/nodes.py:1), [`nodes/h4_datastream/web/h4_datastream.js`](nodes/h4_datastream/web/h4_datastream.js:1)

### Overview
The *DataStream* node streams images (or video frames) from a folder or video file one at a time. It can operate in two modes: folder mode loads individual image files sequentially, while video mode extracts frames from a video using OpenCV. An optional *Auto‑Queue* feature automatically queues the remaining items for batch processing.

### Key Components
- **`H4_DataStream`** – the core Python node exposing inputs for the folder path, current index, and an auto‑queue toggle. It resolves the path, detects whether the target is a directory or a supported video file, and returns a single image tensor together with filename and indexing information.
- **Logging Helper** – `_log` prints status messages prefixed with `[DataStream]` for easy debugging.
- **API Endpoint** – `/h4/browse` opens a native file‑dialog (Tkinter) to let the user pick a folder. The endpoint returns the selected path to the frontend.
- **Frontend UI (`h4_datastream.js`)** – adds a *Browse Folder* button, displays a live preview thumbnail, and listens for batch‑queue events to automatically queue remaining items.

### Core Workflow
1. **Path Resolution** – `stream_image` trims surrounding quotes and verifies the path exists.
2. **Mode Detection** – checks the file extension against a set of known video formats. If the target is a video, OpenCV (`cv2`) is used to open the file, seek to the requested frame, and convert it to a normalized tensor.
3. **Folder Scanning** – for a directory, the node scans for image files with common extensions, sorts them naturally, and selects the file at `current_index` (clamped to the valid range).
4. **Image Loading** – the selected image is opened with Pillow, auto‑oriented, converted to RGB, turned into a NumPy array, normalised to 0‑1, and finally wrapped in a PyTorch tensor.
5. **Auto‑Queue Logic** – if *auto_queue_remaining* is enabled, the node calculates how many frames remain and sends a custom sync event (`h4.datastream.queue_batch`) to the UI, which will queue the remaining items automatically.
6. **Preview Generation** – a temporary WebP thumbnail is saved to the ComfyUI temp folder and a UI update event (`h4.datastream.update_ui`) is emitted with filename, index, total count and the preview URL.
7. **Return Values** – the node returns the image tensor, filename, the effective index, total item count, and a boolean indicating whether this is the last item.

### Configuration Parameters (UI)
- `folder_path` – absolute path to an image folder or video file. The *Browse* button can fill this field automatically.
- `current_index` – integer starting at 0; indicates which item to load next. The node auto‑increments this value for each call.
- `auto_queue_remaining` – boolean; when enabled the node will automatically queue all remaining items after the current one.
- Hidden `unique_id` – used to identify the node instance when sending UI events.

### Observations & Recommendations
- **Robustness:** Path validation catches missing or invalid locations early, and clear log messages help diagnose failures.
- **Video Support:** Requires OpenCV (`cv2`). If the library is missing, a helpful error is raised.
- **Performance:** Loading large images or high‑resolution video frames can be memory‑intensive; consider adding optional down‑scaling or streaming buffers for very large datasets.
- **Security:** The node only accesses absolute paths provided by the user. Adding a whitelist of allowed base directories could further reduce risk of accidental system access.
- **UX Polish:** The preview thumbnail is saved as WebP for speed. Offering a configurable preview quality or size could improve responsiveness on slower machines.
- **Testing:** Unit tests for folder scanning, index clamping, and video frame extraction would ensure edge cases (empty folder, out‑of‑range index) are handled gracefully.

---

## Node: h4_debug_error

**Location:** [`nodes/h4_debug_error/__init__.py`](nodes/h4_debug_error/__init__.py:1), [`nodes/h4_debug_error/nodes.py`](nodes/h4_debug_error/nodes.py:1), [`nodes/h4_debug_error/web`](nodes/h4_debug_error/web:1)

### Overview
The *Debug Error Generator* node is a testing utility that deliberately raises errors to verify ComfyUI’s error‑popup (Death Modal) handling. It is only visible when the application’s debug mode is enabled.

### Key Components
- **`H4_DebugErrorGenerator`** – the sole class exposing a single `execute` method. It offers a dropdown to select an error type (`none`, `minor`, `warning`, `critical`) and a boolean trigger to fire the chosen error.
- **Error Types**:
  - **minor** – raises a simple `ValueError` with a short, sanitized message.
  - **warning** – raises a `RuntimeError` containing faux sensitive data (email, IP, file path) to test log sanitisation.
  - **critical** – triggers a nested exception chain (`KeyError` → `Exception`) to produce a deep traceback for the Death Modal.
- **UI Integration** – the node’s inputs (`error_type`, `trigger`) are displayed in the ComfyUI node editor. When `trigger` is set to true, the selected error is raised.
- **Always‑Run Flag** – `IS_CHANGED` returns `float("nan")` ensuring the node executes on every workflow run, even if downstream nodes cache results.

### Core Workflow
1. **Trigger Check** – if `trigger` is false, the node returns a harmless status string.
2. **Error Selection** – based on `error_type`, the node raises the corresponding exception.
3. **Critical Path** – for `critical`, the helper `_trigger_nested_error` creates a three‑level nested `KeyError`, which is caught and re‑raised as a generic `Exception` with the original traceback attached, generating a rich stack trace.
4. **Return** – if an error is somehow not raised, a fallback string is returned (normally unreachable).

### Configuration Parameters (UI)
- `error_type` – dropdown selecting the error severity to generate.
- `trigger` – boolean toggle that, when true, fires the selected error. Reset to false after testing.

### Observations & Recommendations
- **Safety:** The node is harmless when `trigger` is false and only executes in debug mode, preventing accidental crashes in production workflows.
- **Sanitisation Testing:** The `warning` error deliberately includes mock sensitive data, allowing developers to verify that the UI’s sanitisation layer correctly redacts such information.
- **Extensibility:** Additional custom error scenarios could be added (e.g., custom exception classes) to broaden testing coverage.
- **Documentation:** A brief README explaining how to enable debug mode and use the node would help new developers discover this testing aid.
- **Testing:** Automated tests could programmatically set `trigger=True` for each `error_type` and assert that the appropriate exception type is raised.

---
