# h4_double_sampler / H4_DoubleSampler (The Two-Pass Engine)

## What it is
A simple way to do "High-Res Fix" style generations in a single node. Instead of having two samplers, an upscaler, and a web of wires, this node does a base generation and then a second "Refine" pass automatically to add extra detail and clean things up.

## Expanded Description
Usually, if you want to make an image look better, you have to run it through one sampler at a low resolution and then another one at a higher resolution. 

The **Double Sampler** makes this way easier. 
- **Pass 1**: It makes the base image.
- **Pass 2**: It upscales that image and runs it through again with a lower "denoise" to add textures and clear up any blurriness.

It's basically a "one-stop-shop" for better looking images without cluttering up your graph with 20 extra wires.

## Options
- **refiner_toggle**: Turn the second pass on or off.
- **refiner_denoise**: How much you want to "change" the image in the second pass. 0.3 is usually plenty for detail.
- **upscale_by**: How much larger you want the final image to be (1.5x, 2.0x, etc.).
- **sampler_1 / sampler_2**: You can even use different math for the two passes if you're feeling adventurous.

## Use Case Scenarios
**Scenario 1: The Quick High-Res Fix**
Set your resolution to 512x512, turn the refiner on at 2.0x upscale, and hit queue. You'll get a sharp 1024x1024 image that keeps the composition of the 512 base.

**Scenario 2: Adding Texture**
If your base image looks a bit "smooth" or "mushy," run it through the refiner with a low denoise (~0.25). It'll "hallucinate" some extra skin pores or fabric textures back in.

## Quick Start
1. Add `H4_DoubleSampler` to your canvas.
2. Wire up your models and prompts.
3. If you want more detail, flip `refiner_toggle` to ON and set `upscale_by` to 2.0.

---

## Dev Corner (Jargon & Logic)
- **Sequential Execution**: It runs two sampling loops back-to-back in memory. 
- **Variable Cloning**: If you don't provide a second model, it just uses the first one automatically.
- **Memory Management**: Clears the cache between passes to keep things from crashing on smaller GPUs.
