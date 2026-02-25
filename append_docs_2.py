import re

docs = """
**H4_BuildFaceModel**
- **Embedding Synthesis:** Iteratively processes batches or directories of imagery through InsightFace (`buffalo_l` / CPU or CUDA Execution Provider). Extracts the 512-dimensional feature vector `embedding` for each detected face.
- **Statistical Blending:** Aggregates multiple vectors into a unified model using Numpy-accelerated mathematical synthesis. 'Mean' calculates the spatial average, 'Median' filters out geometric drift from extreme outliers (glasses/occlusions), and 'Mode' calculates the centroid distance to extract the single most representative template.
- **Unit Normalization:** Strictly enforces 1.0 length unit normalization (`embedding / np.linalg.norm(embedding)`) prior to reconstruction, satisfying InsightFace's internal Cosine Similarity thresholds during the swap phase.

**H4_SaveFaceModel / H4_LoadFaceModel**
- **Safetensors Serialization:** Circumvents Python `pickle` vulnerabilities by mapping the arbitrary `Face` class attributes (embedding, kps, bbox, det_score, 3d/2d landmarks, pose, gender, age) directly into standalone PyTorch tensors.
- **Restoration Pipeline:** `H4_LoadFaceModel` parses the tensors, handles missing legacy keys gracefully, enforces vector re-normalization, and dynamically reconstructs the `Face` object in memory. This bypasses the need for the heavy detection model to run during runtime loading.
"""

with open("d:/PROJECTS/COMFYUI_Custom_Node/h4_ToolKit_v2/comfyui_h4_live/README.md", "r", encoding="utf-8") as f:
    readme = f.read()

target_str = "- Texture restoration via controlled denoise constraints to add micro-detail while minimizing identity drift."

if target_str in readme:
    readme = readme.replace(target_str, target_str + "\n\n" + docs.strip())
    with open("d:/PROJECTS/COMFYUI_Custom_Node/h4_ToolKit_v2/comfyui_h4_live/README.md", "w", encoding="utf-8") as f:
        f.write(readme)
    print("Successfully injected Batch 2 docs.")
else:
    print("Could not find insertion point!")
