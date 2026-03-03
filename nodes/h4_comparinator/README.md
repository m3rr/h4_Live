# h4_comparinator / H4_Comparinator (The A/B Test God)

## What it is
The bastard child of a lightbox, a diff viewer, and a forensic lab. It lets you compare two images with a sliding reticle, zoom in to see atomic-level defects, and crawl the graph to see exactly how you messed up your settings.

## Expanded Description
"Eyeballing it" is for amateurs. The `H4_Comparinator` is built for pixel peepers and prompt scientists. When you need to prove whether a specific scheduler or a 0.05 tweak in denoise actually changed the result, this node acts as your absolute source of truth.

It parses images directly in the browser using custom CSS `clipPath` transformations, allowing buttery-smooth sliding wipes between Image A (Control) and Image B (Test). It possesses a built-in History Strip that caches your last 50 runs, allowing you to seamlessly pull older generations back into the viewer to compare against your live canvas outputs.

## Parameters and Inputs
- **image_a**: The "Control" or "Before" image.
- **image_b**: The "Test" or "After" image.
- **frozen_image**: An override for Image B, allowing you to lock a specific state while continuing to experiment on Image A.
- **metadata_text**: JSON metadata injection port.
- **save_mode**: Toggle to save the comparisons to disk or just keep them as temporary previews.

## Interface Magic
- **Compare Mode (Slider):** Drag the red line to aggressively wipe between A and B.
- **Blink Mode (Spacebar):** Hold Spacebar to make Image B vanish. Release to bring it back. Because sometimes dragging a slider isn't fast enough.
- **Inspectinator Mode:** Turns the right pane into a localized microscope with up to 500% zoom.
- **Parameter Drawer:** Crawls your workflow backwards (yes, backwards) to extract KSampler, Seed, Steps, and Prompts that created the image.

## Use Case Scenarios
**Scenario 1: Refining Face Restoration**
You are trying to determine if setting CodeFormer's fidelity to 0.6 is better than 0.8. You generate both. You pipe them into Comparinator. Using the slider, you wipe across the eyes to see which setting preserved the original pupil shape better while still eliminating the JPEG artifacts.

**Scenario 2: The "Beat My Best" Session**
You generate an image you really like. You right-click it in the Comparinator's History Strip to lock it as the Gold Reference. Now, every new generation you attempt is automatically compared against this locked image. You tweak your prompts and seeds, constantly fighting to "beat" the baseline you set.

## Examples
- **Basic Setup**:
  1. Connect your original image to `image_a`.
  2. Connect your processed/refined image to `image_b`.
  3. The UI will render them overlaid. Drag the slider handle horizontally to reveal the before/after effect.
  4. Hold the spacebar to rapidly strobe between the two versions.
