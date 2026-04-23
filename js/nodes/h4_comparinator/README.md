# h4_comparinator / H4_Comparinator (The A/B Tester)

## What it is
A simple tool for comparing two images head-to-head. It puts one on top of the other and lets you drag a slider back and forth to see exactly what changed. It's perfect for checking if an upscale or a prompt change actually made your image look better.

## Expanded Description
"Is this better, or just different?"

We've all asked that. The **Comparinator** gives you the answer.
- **The Slider**: Drag the red line to "wipe" between the old version and the new version.
- **Blink Mode**: Press the **Spacebar** to rapidly switch between them. This is the best way to spot small things that moved or changed.
- **Inspectinator**: A little magnifying glass that follows your cursor and zooms in 500% so you can check things like eyes or skin texture.
- **The Drawer**: It even "crawls" back through your wires to show you the settings (like seed and prompt) for both images side-by-side.

## Options
- **image_a**: Your "Baseline" (Before).
- **image_b**: Your "Test" (After).
- **History Strip**: The thumbnails at the top show your past runs. You can right-click any image to "Lock" it as your permanent reference for the B-side.

## Use Case Scenarios
**Scenario 1: Dialing in your Denoise**
You aren't sure if `0.3` denoise is too high for your face fix. Run it at `0.2` and then at `0.3`. Use the slider to check if `0.3` is too "waxy" compared to the original.

**Scenario 2: Sharpening Check**
When using a sharpening filter, use the **Inspectinator** (zoom) on the eyes to make sure you're adding "clarity" and not just "noise."

## Quick Start
1. Add `H4_Comparinator`.
2. Plug your first image into `image_a` and your second into `image_b`.
3. Use the slider on the node to see the "Before/After" effect.
4. Tap the spacebar to strobe the changes.

---

## Dev Corner (Jargon & Logic)
- **CSS Clip-Path**: The "Slider" effect is created using a dynamic CSS crop that moves with the mouse.
- **Asynchronous Crawling**: It retrieves the node settings for each image after the generation finishes to avoid slowing down the UI thread.
- **Localized Zoom**: The Inspectinator uses a secondary hidden canvas to render a high-res crop of the pointer's location.
