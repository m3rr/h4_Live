# h4_model_merger / H4_ModelMerger (The Frankenstein Lab)

## What it is
A granular model merger that lets you interact with and blend up to 3 individual model architectures (like UNET text encoders and weights) simultaneously with surgical mathematical precision, while providing live visual testing *before* saving.

## Expanded Description
Combining models using standard Comfy tools is a blunt-force operation—you apply a scalar multiplier to mix 50% of Model A into 50% of Model B. 

`H4_ModelMerger` treats models like massive multi-layered data arrays. It exposes individual block structures allowing you to blend the 25 sub-layers of a stable diffusion network piece-by-piece. You can map the "Soul" (Middle Block) of one specialized model into the "Body" (Output Blocks) of a general-purpose model, avoiding losing structural consistency for the sake of stylized weight injection.

More importantly, merging is usually a blind shot in the dark. You merge, save to disk (occupying 6GB of SSD space), load it back into a sampler, generate an image, hate it, and delete the file. The `H4_ModelMerger` node has a built-in "Live Testing" capability allowing you to preview the merged weights instantly over an image matrix without saving anything to the drive.

## Key Features
- **Granular Block Merging:** Adjust individual sliders for IN00-IN11 (Input Blocks), MID (Middle Block), and OUT00-OUT11 (Output Blocks).
- **Interpolation Modes:** `Weighted Average`, `Symmetric Average`, `Add Difference`, `Cosine Blending`.
- **Live Testing:** Decodes tests instantly using a rolling memory buffer to visualize the blend effect. Standard models generate previews; bad merges hit the Fail-Safe.
- **Fail-Safe Tiled Decode:** If the VAE structure is destroyed by an incompatible merge, standard decoders throw a NaN execution error or output a black box, crashing the script. This node catches the exception, casts a recovery pass, creates an explicit Red ERROR block, and keeps your system alive so you can adjust the sliders again.

## Use Case Scenarios
**Scenario 1: Refining Stylistic Bleed**
You have an amazing anime model (Model A) and a hyper-realistic photography model (Model B). You want the photography model's lighting and shadow complexity, but you want the anime model's distinctive eye shapes. By isolating the Mid blocks (which handle broader conceptual relationships) and blending them at 0.8 against the opposite input blocks, you surgically combine the lighting architecture of B with the conceptual aesthetics of A.

**Scenario 2: Unstable Architecture Defense**
You attempt to merge a poorly-quantized community model with your favorite baseline. You generate a test. The node's structural checker kicks in, realizes the vector shapes are catastrophically mismatched due to broken LoRA injections in the community model, and halts the operation with a precise log explaining which VAE keys failed, rather than crashing your entire server instance.

## Examples
- **Basic Merge Testing**:
  1. Wire Model A, Model B, and an optional Model C into the node.
  2. Slide the `base_ratio` to `0.5` for a standard average merge.
  3. Expand the Block settings and shift `MID` to `0.9` (Prioritizing Model B specifically for the core conceptual concepts).
  4. Run an image generation through a standard KSampler wired directly to the `MODEL` output *before* you wire any Save nodes.
  5. If the generated preview is perfect, wire the Output to `H4_ModelSave`.
