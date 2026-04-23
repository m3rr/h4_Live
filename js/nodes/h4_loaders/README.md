# h4_loaders / The Loader Suite (Universal, Complete, Multi-Image)

## What it is
A simple set of nodes to help you get your models and images into ComfyUI without a mess of wires. Whether you're loading a standard checkpoint, a quantized `.gguf` file, or a handful of reference photos, these nodes handle the tricky parts in the background so you can stay focused on your art.

## The Nodes
### 1. `H4_UniversalLoader` (The Core Loader)
The basic version. It's smart enough to know if you're trying to load a normal checkpoint or a newer format like GGUF. You just pick your file from the list and it handles the math. It also lets you add a LoRA right there in the same node, saving you an extra wire on your canvas.

### 2. `H4_CompleteLoader` (The All-in-One)
This is for when you want everything in one place. It loads your Model, CLIP, VAE, and LoRA, and it has a "Smart Upload" button that lets you pick a few images at once. Instead of having empty boxes taking up space, the node hides any image slots you aren't using to keep your workflow looking tidy.

### 3. `H4_MultiImgUpload` (Handy for IPAdapters)
This one is just for images. It has the same "Smart Upload" button but can hold up to 10 images at once. It's perfect for when you're using things like IPAdapters and need to feed in a bunch of different reference photos quickly.

## Options
- **model / clip / vae**: Pick your main files from the dropdowns.
- **lora_name / lora_strength**: Add a LoRA to your model in one step.
- **Smart Upload Button**: (Only on Complete/MultiImg nodes) Click this to pick multiple images from your computer at once.

## Use Case Scenarios
**Scenario 1: Testing a new GGUF model**
If you just downloaded a new quantized model, you don't need a special loader. Just pick it from the list in `H4_UniversalLoader` and it will work just like a normal checkpoint.

**Scenario 2: Setting up a Character Sheet**
If you need a specific Model, a LoRA, and 3 reference photos for your character, you can do it all with the `H4_CompleteLoader`. Everything comes out of one node, so your workflow stays clean and easy to read.

## Quick Start
1. Add `H4_Complete_Loader`.
2. Pick your model and a LoRA.
3. Click "Smart Upload" to add some reference photos if you need them.
4. Wire the outputs to the rest of your graph.

---

## Dev Corner (Jargon & Logic)
- **Architectural Validation**: The node checks the tensor layout in the background to prevent "Dimension Mismatch" crashes before the sampling starts.
- **GGUF Bridging**: It interfaces with the `ComfyUI_GGUF` extension automatically if it's installed.
- **Dynamic UI**: Uses Javascript to modify the node's appearance in real-time, removing unused widgets from the drawing loop.
