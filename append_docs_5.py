import re

docs = """
### Graph Organization

**H4_Oxidine (The Sentient Conduit)**
Ever get tired of dragging five different noodles (Model, CLIP, VAE, Positive, Negative) across your entire ComfyUI canvas just to connect one block to another? 

Enter **Oxidine**. This node acts as a universal adapter. You plug EVERYTHING into it. It bundles all your models, latents, images, and text into a single, specialized payload (the *Sovereign Proxy*). You then drag that *single* noodle across your screen to your destination, and plug it directly into standard nodes. 

Does the KSampler need the Model? Oxidine hands it over. Does VAEDecode need the VAE? Oxidine hands it over. It automatically detects what the receiving node is asking for and provides the correct data transparently. It's the ultimate graph cleaner.
"""

with open("d:/PROJECTS/COMFYUI_Custom_Node/h4_ToolKit_v2/comfyui_h4_live/README.md", "r", encoding="utf-8") as f:
    readme = f.read()

target_str = "### Traffic & Core Logic"

if target_str in readme:
    readme = readme.replace(target_str, docs.strip() + "\n\n" + target_str)
    with open("d:/PROJECTS/COMFYUI_Custom_Node/h4_ToolKit_v2/comfyui_h4_live/README.md", "w", encoding="utf-8") as f:
        f.write(readme)
    print("Successfully injected Batch 5 docs.")
else:
    print("Could not find insertion point!")
