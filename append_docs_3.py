import re

docs = """
### File I/O and Advanced Serialization

**H4_UniversalLoader**
- **Dynamic Bridge Architecture:** Automatically detects `.gguf` extensions and delegates loading to `ComfyUI_GGUF` internally via dynamic module importation (`importlib`).
- **Wan/Lumina Heuristics:** Employs runtime validation before loading the UNET. If a `zimage` or `wan` model is detected alongside a 4096-dim `T5` text encoder (instead of a 2560-dim Gemma), it triggers a preemptive structural exception warning to prevent latent sizing crashes.
- **Fallbacks & Intercepts:** Manually wraps Wan UNETs initializing config properties (`patch_size`, `freq_dim`, `window_size`) bypassing standard layer detectors to enforce deterministic 14B / 1.3B routing.

**H4_ModelSave**
- **Native Pipeline Hook:** Invokes `model.state_dict_for_saving(clip_sd, vae_sd)` to inherit ComfyUI's internal mapping dictionaries. This intrinsically guarantees that SDXL (`conditioner.embedders.`), SD1.5 (`cond_stage_model.`), and Flux components are prefixed accurately without manual regex string-replacements.
- **Post-Hook Casting:** Operates precise `torch.float16`, `bfloat16`, or `float8` casting routines iteratively across the finalized state dict *after* key-mapping, minimizing the memory footprint immediately prior to `safetensors` topological serialization.
- **GC Invocation:** Purges python garbage collection `gc.collect()` and empties CUDA cache pre-save to free consecutive blocks of VRAM needed to assemble monolithic `.safetensors` blobs.

**H4_SmartSave**
- **Dual-Bus IO Logic:** Utilizes conditional branching to direct payload writes to `folder_paths.get_temp_directory()` (transient Preview logic) or `get_output_directory()` (persistent Save logic).
- **Metadata Serialization:** Extracts raw JSON from the `custom_metadata` string schema, dynamically parsing and injecting key-value pairs into the PIL `PngInfo()` header prior to compression.
- **Non-Blocking Telemetry (History API):** Defers metadata chunk parsing from the `/h4/smart_save/history` REST endpoint. Uses `os.scandir` instead of `os.listdir` to generate the filmstrip JSON response in O(n) linear performance constraints.

"""

with open("d:/PROJECTS/COMFYUI_Custom_Node/h4_ToolKit_v2/comfyui_h4_live/README.md", "r", encoding="utf-8") as f:
    readme = f.read()

target_str = "### Frontend extensions (js/)"

if target_str in readme:
    readme = readme.replace(target_str, docs.strip() + "\n\n" + target_str)
    with open("d:/PROJECTS/COMFYUI_Custom_Node/h4_ToolKit_v2/comfyui_h4_live/README.md", "w", encoding="utf-8") as f:
        f.write(readme)
    print("Successfully injected Batch 3 docs.")
else:
    print("Could not find insertion point!")
