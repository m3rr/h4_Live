# h4_notes / H4_NoteInjector (Visuals)

## What it is
A utility for adding professional, perfectly-centered title bars and subtitles directly onto the resulting image tensor during execution, effectively rendering meme formats, cinematic borders, and integrated test-labeling dynamically.

## Expanded Description
Labeling tests or creating presentation-ready imagery out of ComfyUI historically requires post-processing the output images in Photoshop. The `H4_NoteInjector` rasterizes textual overlays straight onto the structural tensor bytes inside the graph using `PIL.ImageDraw`. 

It supports adding "Cinematic Black Bars" with text positioned on either the top or bottom of the frame. It attempts to load standard system typography vectors (`arial.ttf`, `Roboto`) and calculates dynamic bounding boxes based on the length of your input string to ensure the text is flawlessly centered relative to the horizontal width of the generated image.

## Key Features
- **Dynamic Bounding:** The node measures the tensor width `[B, H, W, C]` and centers your text perfectly regardless if you are generating a 512x512 square or a 1920x1080 ultrawide image.
- **Dual-Line Compositing:** Separate text inputs for large-font "Titles" and smaller-font "Subtitles".
- **Background Generation:** Fills solid black letterboxes to ensure text is legible regardless of the background imagery complexity.

## Use Case Scenarios
**Scenario 1: Presentation Documentation**
You are rendering variations of an architectural floor plan. You set the Title text to `"Design Pass V.3"` and the Subtitle input dynamically connected to the seed variable using a text processor to read `"Seed: 847291"`. When the workflow saves the image, the text is cleanly stamped at the top, allowing you to present a polished deliverable to your art director without opening an external image editor.

**Scenario 2: Automated Grid Titling**
When combined with testing nodes, `H4_NoteInjector` allows you to stamp parameter variables (like Sampler type and CFG score) directly onto the visual frame, ensuring you never open a folder full of 200 identical-looking images completely unable to recall which generation was created using which setting configurations.

## Examples
- **Basic Overlay Execution**:
  1. Add `H4_NoteInjector` between your VAE Decode output and your SaveImage node.
  2. Map the generated `IMAGE` output to the `NoteInjector` input.
  3. Enter `"Project A.I."` into the `title` widget.
  4. Select `Placement: Bottom` to force the black bar rendering to expand from the base.
  5. The output image will possess a flawlessly rendered typographic footer when it writes to disk.
