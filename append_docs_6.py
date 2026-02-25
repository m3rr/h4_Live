import re

docs = """
### Utility & Quality Control

**H4_Oxidine**
- **Sovereign Proxy Routing:** Operates as a stateless multiplexer traversing the Node Graph. It implements Python's `__getattr__`, `__getitem__`, and sequence protocols natively to override standard dictionary representations. Bypasses list-flattening bugs by avoiding standard subclasses, thereby forcing `comfy.execution` to treat it as an autonomous payload until explicitly unpacked or directly queried by downstream modules (e.g., KSampler calling `proxy.patch_model`).
- *Note: For a biblical-level architectural deep-dive into the Sentient Conduit, please refer to the dedicated `OXIDINE-BREAKDOWN.md` file located in the root directory.*

**H4_DebugErrorGenerator**
- **Controlled Chaos:** A dedicated structural testing node explicitly designed to raise raw exceptions (`ValueError`, `RuntimeError`, `TypeError`) into the ComfyUI execution stack. Vital for testing custom popup UI interceptors and the JS notification listener (h4_BigBrother).
"""

with open("d:/PROJECTS/COMFYUI_Custom_Node/h4_ToolKit_v2/comfyui_h4_live/README.md", "r", encoding="utf-8") as f:
    readme = f.read()

target_str = "### Frontend extensions (js/)"

if target_str in readme:
    readme = readme.replace(target_str, docs.strip() + "\n\n" + target_str)
    with open("d:/PROJECTS/COMFYUI_Custom_Node/h4_ToolKit_v2/comfyui_h4_live/README.md", "w", encoding="utf-8") as f:
        f.write(readme)
    print("Successfully injected final Batch 6 docs.")
else:
    print("Could not find insertion point!")
