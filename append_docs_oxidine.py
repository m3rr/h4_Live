import re

docs = """
### H4_Oxidine (The Sentient Conduit)
**What it is:** The ultimate node-wire declutter tool. An "omniproxy" that bundles all your node connections into a single cable.

**How to use it:**
- Plug your Model, CLIP, VAE, Positive Prompt, Negative Prompt, and Latent all into one Oxidine node.
- Take the single output noodle from Oxidine and drag it across your massive workflow.
- Plug that single noodle directly into the KSampler's `model`, `positive`, `negative`, and `latent_image` inputs.
- Plug it into VAEDecode's `vae` and `samples` inputs.

**How it works:**
- It automatically shape-shifts. When KSampler asks for a Model, Oxidine hands it the Model. When it asks for Positive conditioning, Oxidine hands it the Positive conditioning. 
- You no longer need 6 different wires crossing your screen like a plate of spaghetti. 
"""

with open("d:/PROJECTS/COMFYUI_Custom_Node/h4_ToolKit_v2/comfyui_h4_live/README.md", "r", encoding="utf-8") as f:
    readme = f.read()

target_str = "### H4_TrafficRouter (The Nexus)"

if target_str in readme:
    readme = readme.replace(target_str, docs.strip() + "\n\n---\n\n" + target_str)
    with open("d:/PROJECTS/COMFYUI_Custom_Node/h4_ToolKit_v2/comfyui_h4_live/README.md", "w", encoding="utf-8") as f:
        f.write(readme)
    print("Successfully injected Oxidine casual docs.")
else:
    print("Could not find insertion point!")
