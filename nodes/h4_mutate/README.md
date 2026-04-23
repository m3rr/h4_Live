# h4_mutate / H4_Mutate (The Image Darkroom)

## What it is
A "Swiss Army Knife" for fixing and styling your images. It's one big node that holds a bunch of smaller tools like Color Grading, Film Grain, Sharpening, and Vignette. It's basically a mini-Photoshop that works right inside your workflow.

## Expanded Description
Straight-out-of-the-box AI images can sometimes look a bit "flat" or "digital." 

The **Mutate** node helps you give them some character:
- **Color Grade**: Adjust the brightness, contrast, and tints.
- **Sharpness**: Make blurry images look "crunchy" and high-res.
- **Film Grain**: Add that "old movie" or "film" texture to your shots.
- **Vignette**: Darken the corners to pull the focus to the center.
- **Effects**: Add fun stuff like Bloom (glowy lights) or Chromatic Aberration (3D glasses look).

It's modular—you only turn on the sections you want to use, and the node'll stay small and clean until you need them.

## Options
- **Section Toggles**: Click the checkbox next to "Color" or "Grain" to see the sliders.
- **pipeline_order**: You can choose if you want to Sharpen *before* you change the color or *after*. It makes a difference!
- **mask (Optional)**: If you connect a mask, the changes will only happen inside the area you painted. 

## Use Case Scenarios
**Scenario 1: Adding a "Cinematic" Look**
Turn on **Color**, drop the Gamma a little for mood, and turn on **Film**. Pick `CineStill 800T` and add a tiny bit of grain. Your generation will go from a "render" to a "movie frame" instantly.

**Scenario 2: Fixing a soft upscale**
If you upscale an image and it looks a bit waxy, turn on **Sharpness** and slide it up. It'll pull the detail back from the edges of things like hair and clothing.

## Quick Start
1. Place a `H4_Mutate` node right before you save your image.
2. Check the box for whichever section you want to use.
3. Fiddle with the sliders until you like what you see.

---

## Dev Corner (Jargon & Logic)
- **Modular UI**: The node uses a dynamic Javascript frontend to hide or show widgets based on the toggle states.
- **Internal Pipeline**: Each effect is applied in sequence in a single Python execution block to avoid unnecessary data copies.
- **WCT2 Style Transfer**: (Advanced) The style module align the color and texture statistics between two images without needing a separate model.
