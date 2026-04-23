# h4_model_save / H4_ModelSave (The Model Saver)

## What it is
A simple tool for saving your custom model merges. It handles all the technical stuff like compressing the file and making sure it has the right "Internal Info" (metadata) so it works in other apps.

## Expanded Description
Saving a 6GB model file can sometimes crash your computer if you don't have enough RAM. It can also produce files that don't load correctly if the settings are wrong.

The **Model Saver** is built to be safe:
1. **Auto-Compress**: It automatically turns the massive "test" weights into a smaller, standard **FP16** file (about 2GB to 6GB).
2. **Built-in ID**: It "burns" your current workflow and prompt directly into the file's header. This means if you share the file, the next person can see exactly how you used it.
3. **Memory Sweep**: Before it starts writing the file, it tries to "clean up" your VRAM so you don't get an "Out of Memory" error half-way through.

## Options
- **filename_prefix**: Give your model a name. You can use folders like `MyTests/AnimeMix_V1`.
- **save_precision**: Keep this on **FP16** for standard use. Use **FP32** only if you plan on training the model further later.
- **strip_metadata**: Turn this ON if you want to hide your prompt or workflow from the final file.

## Use Case Scenarios
**Scenario 1: Finalizing your own model**
You spent all day mixing models in the `H4_ModelMerger`. You finally found the perfect blend. Wire it into this node, give it a name, and hit queue. Your new model will be in your `models/checkpoints` folder ready to go.

**Scenario 2: Making "Lite" versions**
If you have a massive 12GB checkpoint and want to make it 2.5GB so it's faster to load, you can run it through this node with saving set to **FP16**.

## Quick Start
1. Wire your `MODEL`, `CLIP`, and `VAE` into the node.
2. Give it a name in the text box.
3. Hit Queue Prompt and wait for the progress bar to finish.

---

## Dev Corner (Jargon & Logic)
- **Safetensors**: It saves in the modern `.safetensors` format which is faster and more secure than older `.ckpt` files.
- **Header Injection**: It writes the workspace JSON into the safetensors metadata block.
- **Tensor Casting**: It performs the bit-depth conversion (32-bit to 16-bit) sequentially to save on peak RAM usage.
