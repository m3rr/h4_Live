# h4_faceforge / H4_FaceForge Suite (The Plastic Surgeon)

## What it is
A robust, modular, all-in-one face swap and identity consistency engine built directly into the toolkit. It handles swapping, high-resolution pore restoration, upscaling, feather-blending, identity extraction, and safe tensor serialization without looking like a "melted wax" 2005 video game character.

## Included Nodes
1. **H4_FaceForge**: The master orchestrator node. Operates the swap + upscale + blend pipeline.
2. **H4_BuildFaceModel**: The DNA Extractor. Processes batches of images, extracts the 512-dimensional facial feature vectors via InsightFace, normalizes them, and performs statistical blending (Mean, Median, Mode) to create a single "perfect" identity template.
3. **H4_IdentityEngine**: The abstract persona controller. Feeds specific DNA profiles into the forge pipeline.
4. **H4_FaceDetailer**: The Dermatologist. An img2img pass restricted explicitly to the facial bounding box with low denoise, designed to hallucinate microscopic skin texture (pores, blemishes) back onto a smooth swap.
5. **H4_DualCLIPTextEncode**: Helper node for specialized face prompting.
6. **H4_SaveFaceModel / H4_LoadFaceModel**: Circumvents Python's vulnerable `.pickle` system to serialize pure, clean `.safetensors` representations of your custom-extracted identity DNA for the Face library.

## Expanded Description
Face swapping in ComfyUI conceptually usually involves patching ReActor or FaceID together manually. The result is almost always a smooth, plastic-looking face that doesn't match the lighting or grain of the source image, and has hard lines where the generic bounding box cut off jawlines manually.

The `H4_FaceForge` suite addresses this through a multi-stage approach. The Forge upscales the source crop aggressively before attempting to inject the InsightFace embedding, performing the swap at a high resolution. It then applies CodeFormer/GFPGAN algorithms to restore structural facial integrity. Finally, it uses occlusion-aware alpha blending to drop the high-res restored face back into the main image, attempting to preserve hair and glasses that cross over the face.

## Use Case Scenarios
**Scenario 1: Building a "Consistent Character" Actor Model**
You want to generate a comic book featuring a specific individual. You collect 10 photos of that person from different angles. You run all 10 through `H4_BuildFaceModel` using "Median" blending modes to isolate their core bone structure and ignore lighting extremes. You save the output using `H4_SaveFaceModel` named `my_character.safetensors`. In your main comic workflow, you use `H4_LoadFaceModel` to plug `my_character` directly into the `H4_FaceForge` node, automatically swapping their face perfectly onto every generation you create.

**Scenario 2: Curing the "Plastic Face" Effect**
You perform a face swap using standard tools, but the subject looks unsettlingly smooth and flawless compared to the noisy 35mm film grain of your background image. You take the output of the FaceForge and wire it into the `H4_FaceDetailer`. You set Denoise to `0.2`. The Detailer isolates the face, runs the KSampler again against your positive prompt, and introduces noise and texture—literally hallucinating pores and life back into the plastic swap.

## Examples
- **The Ideal Pipeline Construction**:
  1. Generate your base image using any standard checkpoint setup.
  2. Wire the image output into `H4_FaceForge`. Provide a reference image or loaded Identity Model.
  3. Set `restore` toggle to ON (0.8 strength). Set `feather` to a middle value (e.g., 20).
  4. Wire the Forge output into `H4_FaceDetailer`. Pass in your base model, VAE, and CLIP text describing "detailed skin, messy, realistic pores".
  5. Set Detailer denoise to 0.25.
  6. Review output via `H4_Comparinator` to verify perfect architectural integration.
