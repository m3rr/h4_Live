# h4_loaders / The Loader Suite (Universal, Complete, Multi-Image)

## What it is
Loading assets in ComfyUI shouldn't require a Ph.D. in node wiring. 
The `h4_loaders` module delivers three massive powerhouse nodes that handle models, components, LoRAs, and images all from beautifully stripped-down interfaces. Whether you just want a clean checkpoint loader or you need to drag 4 different ref images, a LoRA, a custom UNET, and a baked VAE into a single block without losing your sanity, this suite does it all. It automatically detects and properly loads `.safetensors`, individual pieces (UNETs, CLIPs, VAEs), and complex `.gguf` architecture setups without demanding five distinct nodes crossing your screen.

They fetch the data. You fetch the coffee. Don't worry, fetching isn't a *tall order*... (I'll see myself out).

## The Nodes
### 1. `H4_UniversalLoader` (The Skeleton Key)
The purest form. Brilliantly bridges ComfyUI's internal model detection heuristics with advanced architectural validation protocols (e.g., verifying `patch_size`, `freq_dim`, `window_size`). It intercepts `.gguf` extensions dynamically to pass them to `ComfyUI_GGUF`, and ensures that whatever file format you requested is instantiated cleanly. It also natively handles LoRA injection — you pick a LoRA, dial the strength, and it patches it into the model right at the source.

### 2. `H4_CompleteLoader` (The Swiss Army Knife)
The Universal Loader on steroids. It inherits all the insane automated architecture routing of the Universal Loader, but it features a custom HTML-overlay interface that hides all the image uploading bloat. 
You click the "Smart Upload Image(s)" button. You grab 4 images. It magically spawns the inputs and loads them right out into the graph alongside your Checkpoint/UNET, VAE, CLIP, and LoRA. The interface is mathematically bound to have a zero-pixel footprint for any features you *aren't* currently using.

### 3. `H4_MultiImgUpload` (The Bulk Handler)
Stripped of the models, stripped of the LoRAs, this is just for raw image ingestion. Same magic smart-upload button, but it scales up to 10 images at once. Unused slots are fully collapsed so it never takes up ungodly amounts of canvas real estate.

## Key Features
- **File Agnostic:** Simply select your file from the dropdown. The loader parses the extension and internal tensor tree to figure out what it is.
- **GGUF Bridging:** Inherently respects and parses `.gguf` quantized models effortlessly.
- **Wan/Z-Image Heuristics:** Employs runtime validation before loading the UNET. If a `zimage` or `wan` model is detected, it prevents latent sizing crashes that affect generic loading methods by literally preventing you from making catastrophic dimensional errors.
- **Partial Loading Support:** You can load pure UNET models or separated VAEs through the same unified interface.
- **Dynamic DOM Detachment UI:** Instead of dealing with massive multi-image nodes with empty slots, the Javascript engine literally vaporizes the DOM overlays of unused slots. 

## Use Case Scenarios
**Scenario 1: Testing Quantizations against Full FP16**
You are trying to determine if deploying an 8-bit `.gguf` model loses too much prompt adherence compared to your standard `.safetensors` 16-bit checkpoint. Instead of physically rewiring two entirely different node trees (UNETLoader for GGUF vs CheckpointLoader for normal), you merely use the dropdown to switch from `model.safetensors` to `model.gguf`. The node handles the complex background routing transparently.

**Scenario 2: The Character Sheet Workflow**
You're trying to pass 3 reference images into an IPAdapter alongside a custom UNET and a specific LoRA. Normally, this takes 6 nodes. With `H4_CompleteLoader`, you select your UNET, select your LoRA, click the Smart Upload button, select all 3 images, and boom. Everything routes out of a single monolithic block.

## Examples
- **Basic Integration**:
  1. Add `H4_Complete_Loader`.
  2. Browse your unified model directory via the dropdown.
  3. Select your checkpoint or UNET component. Apply a LoRA if desired.
  4. Drag the `MODEL`, `CLIP`, and `VAE` output wires directly into an `H4_ContextHub` or natively into your graph downstream.
  5. Hit the Smart Upload button if you need image refs. Drag `IMAGE_1` and `IMAGE_2` out directly to your IPAdapters.

Well fuck me sideways, slap my ass and call me grandma.
