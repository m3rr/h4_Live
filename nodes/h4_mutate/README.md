# h4_mutate / H4_Mutate (The Frankenstein Machine)

## What it is
Look, generating an image is only half the battle. Once the pixels hit the canvas, you usually stare at it and think: "Hmm, could be punchier." 
Instead of exporting it to Photoshop, firing up Lightroom, or chaining 15 different image processing nodes together, you use `H4_Mutate`. It is a monolithic, dynamically toggleable post-processing powerhouse. It's basically a whole darkroom stuffed into a single ComfyUI node.

## Expanded Description
The `H4_Mutate` engine gives you 7 distinct sections of image manipulation: **Color Grade**, **Sharpness**, **Upscale**, **Style Transfer**, **Film & Grain**, **Vignette**, and **Effects**. 
The best part? It's completely modular. The node starts as a clean pass-through. You only turn ON the sections you need, and only those controls will expand. 

Because we know that applying Sharpness *before* Upscaling is a completely different vibe than Upscaling *before* Sharpness, it features a **Pipeline Order** routing system. You can rearrange the internal mathematical order of operations on the fly, or set it to 'custom' and dictate the exact priority of each module.

It's essentially mutating your image’s DNA. Just don't push it too far, or you might cause a stack overflow... get it? Because it's a node stack? Okay, I'll see myself out.

## Key Features
- **Toggleable Architecture:** UI stays perfectly clean until you flip a switch.
- **7-Stage Pipeline:** Color (Hue/Sat/Brightness/Gamma/Tint), Film (Emulations like Portra/Ektar/Velvia + Grain), Vignette, Sharpness, Effects (Bloom, Chromatic Aberration, Posterize), Upscale (Lanczos, Bicubic, etc.), and Style Transfer (Neural blending like AdaIN, WCT, etc.).
- **Dynamic Routing:** Change the execution order globally to dramatically alter the outcome.
- **Mask Compositing:** Connect a mask. Only the masked area mutates, leaving the rest of the image pristine. Need to apply color-grade to just the background? Use an inverse mask.
- **Batch Processing:** Survives batch sizes smoothly, executing frame by frame and cleaning memory relentlessly.

## Use Case Scenarios
**Scenario 1: The Cinematic Polish**
You generated a raw masterpiece, but it feels a bit "digital". You route it through `H4_Mutate`. You flip on **Color**, drop the Gamma to 0.9 for mood. You flip on **Film**, select 'CineStill 800T', and add 0.2 Color Grain. You flip on **Vignette** for focus pulling. Boom, instant cinematic masterpiece right inside ComfyUI. No external software needed.

**Scenario 2: The Neural Style Mashup**
You want your generation to look like an oil painting. Flip on **Style**. Feed 3 different Monet paintings into the `style_image` slots. Engage 'Weighted' blend mode. Watch as the node mathematically rips the texture and color from the paintings and forcefully grafts it onto your generation.

## Examples
- **Basic Integration**:
  1. Add `H4_Mutate` right before your final `Save Image` or `H4_SmartSave` node.
  2. Connect your generated `IMAGE` output to it.
  3. Turn on the modules you want to play with.
  4. Tinker with sliders until it looks amazing.

Slap my ass and call me grandma!
