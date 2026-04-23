# h4_pixel_visualizer / H4_PixelVisualizer (The Diff Checker)

## What it is
A handy tool to see exactly what changed between two images. It subtracts one image from the other and shows you a "heatmap" of the differences. It's great for seeing if an upscale or a filter actually did anything to your pixels.

## Expanded Description
Sometimes it's hard to tell if a setting actually changed anything. You squint at the screen trying to see if that extra 0.1 on the "Sharpness" slider helped. 

The **Pixel Visualizer** shows you the math.
1. It takes Image A and Image B.
2. it subtracts them.
3. If they are exactly the same, you get a black screen.
4. If they are different, it shows a "glow" where the pixels shifted. 

You can use the **Heatmap Scale** to "boost" the glow. This is helpful if the changes are tiny (like subtle noise) and you want to see if the "details" were actually improved or just blurred away.

## Options
- **heatmap_scale**: Boost the intensity of the "glow" so you can see microscopic changes. 

## Use Case Scenarios
**Scenario 1: Testing "Lossless" claim**
If a node claims it's "lossless" but you suspect it's blurring things, plug the original and the output into this. If the heatmap isn't pure black, you know something changed.

**Scenario 2: Checking Edge Detail**
When upscaling, you want to see if you're actually adding detail to the edges of things like hair or eyes. The heatmap will show a sharp glow around the lines if the upscaler is working correctly.

## Quick Start
1. Add `H4_PixelVisualizer`.
2. Connect your original image to `image_a` and your edited image to `image_b`.
3. Check the `Heatmap` output to see the "ghost" of the changes.

---

## Dev Corner (Jargon & Logic)
- **Absolute Difference**: Uses `torch.abs(a - b)` so that regardless of whether a pixel got brighter or darker, we see it as a "change".
- **LAB Tonemapping**: It can optionally use CIELAB math to ensure color shifts are tracked accurately even in dark areas.
