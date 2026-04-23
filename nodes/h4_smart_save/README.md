# h4_smart_save / H4_SmartSave (The Image Gallery)

## What it is
The "Modern" way to save images in ComfyUI. Instead of just saving a file and forgetting it, this node shows you a live "History Strip" of your recent generations and lets you click on them to see a full-screen preview.

## Expanded Description
Normal saving in ComfyUI is a bit primitive. You save an image, and it's gone. If you want to compare your current work to something you made 10 minutes ago, it's a hassle.

The **Smart Save** node acts like a mini gallery on your canvas:
- **Visual History**: It shows the last 100 images you've generated in a scrollable bar.
- **Lightbox**: Click any image to see it full-screen.
- **Embedded Info**: It automatically saves your prompt, seed, and workflow into the image file so you can recreate it later just by dragging the file back into ComfyUI.

## Options
- **filename_prefix**: Organize your images into folders like `Characters/Heroes`.
- **save_mode**: Pick between "Save" (Permanent file) and "Preview" (Just shows up in the gallery temporarily).

## Use Case Scenarios
**Scenario 1: Picking the best version**
If you're doing a bunch of tests, just scroll through the History Strip on the node to see all the versions side-by-side. It makes picking the "winner" way faster.

**Scenario 2: Workflow Recovery**
If you ever lose your workflow, just find any image you saved with this node on your hard drive and drag it into ComfyUI. Everything you did to make that image will be restored instantly.

## Quick Start
1. Replace your standard `Save Image` node with `H4_SmartSave`.
2. Do a few runs.
3. Look at the thumbnails appearing on the node's foreground.
4. Use your mouse scroll wheel to navigate the history.

---

## Dev Corner (Jargon & Logic)
- **Viewport Sovereignty**: The HUD intelligently hides itself when you zoom out or move the node off-screen to save on performance.
- **Metadata Archiving**: It writes the entire graph JSON into a hidden PNG chunk.
- **syncGrid Logic**: The Javascript frontend manages a virtualized list to ensure the gallery stays fast even with hundreds of images.
