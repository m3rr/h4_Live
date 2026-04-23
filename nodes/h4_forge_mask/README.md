# h4_forge_mask / H4_ForgeMask (The Mask Painter)

## What it is
A simple tool for painting and drawing masks directly on your image. Instead of going into Photoshop or using the clunky built-in mask editor, you can just paint, lasso, or erase your selection right on the node itself.

## Expanded Description
If you want to change just one part of an image (like changing a character's shirt or fixing a weird hand), you need a **Mask**. 

The **ForgeMask** node puts the drawing tools right on your canvas. 
- **Brush**: Paint exactly where you want to change something.
- **Eraser**: Rub out parts of the mask you don't want.
- **Lasso**: Draw a quick circle around an object to select it all at once.
- **Blur**: Soften the edges so your new "edit" blends in perfectly with the rest of the image.

## Options
- **mask_blur**: Make the edges fuzzy so the edit looks natural.
- **mask_expansion**: Make your painted area slightly bigger or smaller automatically.
- **invert_mask**: Swap between "change the inside" and "change the outside".

## Use Case Scenarios
**Scenario 1: Fixing hands**
If a generation has 6 fingers, you can paint a mask over the hand, hit **SEND MASK**, and run a new sampler pass with a "perfect hand" prompt. 

**Scenario 2: Changing clothes**
If you love an image but hate the colors of the shirt, use the **Lasso** to quickly select the shirt. Send the mask, and use a prompt for a "red leather jacket" to swap the clothes in seconds.

## Quick Start
1. Add `H4_ForgeMask`.
2. Connect the image you want to edit.
3. Pick the Brush or Lasso tool and draw on the image.
4. Click **SEND MASK** to update the output wire.

---

## Dev Corner (Jargon & Logic)
- **HTML5 Canvas**: The frontend uses a full canvas overlay to handle the drawing logic.
- **Base64 Transfers**: Your painted mask is turned into a text string and sent to the server where it's turned back into a black-and-white mask tensor.
- **Gaussian Blur**: We apply a mathematical blur to the edges of the mask to prevent "hard lines" during inpainting.
