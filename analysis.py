import json
import re

with open("d:/PROJECTS/COMFYUI_Custom_Node/h4_ToolKit_v2/comfyui_h4_live/__init__.py", "r", encoding="utf-8") as f:
    init_content = f.read()

matches = re.findall(r'"(H4_[A-Za-z0-9_]+)"\s*:', init_content)
matches.extend(["H4_FaceForge", "H4_LoadFaceModel", "H4_BuildFaceModel", "H4_SaveFaceModel", "H4_IdentityEngine", "H4_FaceDetailer"])
nodes = sorted(list(set(matches)))

with open("d:/PROJECTS/COMFYUI_Custom_Node/h4_ToolKit_v2/comfyui_h4_live/README.md", "r", encoding="utf-8") as f:
    readme_content = f.read()

dev_corner_start = readme_content.find("## Dev Corner (technical deep dive)")
if dev_corner_start == -1:
    dev_corner_start = len(readme_content)

casual_content = readme_content[:dev_corner_start]
dev_content = readme_content[dev_corner_start:]

missing_casual = []
missing_dev = []

for node in nodes:
    if node not in casual_content:
        missing_casual.append(node)
    if node not in dev_content:
        missing_dev.append(node)

with open("d:/PROJECTS/COMFYUI_Custom_Node/h4_ToolKit_v2/comfyui_h4_live/missing_docs.json", "w", encoding="utf-8") as f:
    json.dump({
        "total_nodes": len(nodes),
        "missing_casual": missing_casual,
        "missing_dev": missing_dev
    }, f, indent=2)
