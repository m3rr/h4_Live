# 🐍 h4_Pythonipulator-inator (The image Kernel)

## What it is
Welcome to the absolute Swiss Army knife of image manipulation. The **Pythonipulator-inator** (v9.5.1) is a high-performance, multi-threaded image processing kernel designed to replace about 10 different nodes in your workflow. Instead of chaining together "Crop", "Flip", "Rotate", "Brightness", "Blur", and "Edges" nodes like a frantic digital plumber, you just drop this monster into your graph and let the 🐍 Python power do the heavy lifting.

It combines the precision of **Pillow**, the industrial strength of **OpenCV**, and the scientific accuracy of **scikit-image** and **NumPy** into one sleek, drawer-based HUD.

> [!TIP]
> **THE HYBRID KERNEL**: By leveraging both PyTorch tensors and NumPy arrays, the Pythonipulator-inator avoids the performance bottlenecks found in many standard nodes. It performs zero-copy transformations where possible, ensuring that 12-stage image mutations happen in milliseconds, not seconds.


## Expanded Description
Most image nodes in ComfyUI do one thing and one thing only. That's fine if you like spaghetti, but if you want clean workflows and high performance, you need a tactical kernel.

The **Pythonipulator-inator** processes your images in a deterministic pipeline, category by category. You only see the sliders for what you actually enable, keeping your canvas surgically clean while hiding a massive battery of forensic and aesthetic tools under the hood.

## The Effect Categories (The Arsenal)

### 🔵 Cyberpunk Subsystem
For when the future isn't glitchy enough.
- **Chromatic Aberration**: Mimics real-world lens distortion by shifting color channels. Essential for that "captured through a camera" look.
- **Glitch**: Randomly offsets pixel rows to create digital artifacts and transmission errors.
- **Scanlines**: Adds those classic CRT horizontal lines. Perfect for UI overlays or retro-futurist renders.

### 📐 Geometric Toolbox
Standard canvas manipulation without the extra nodes.
- **Flip**: Mirror your image horizontally or vertically (great for checking composition balance).
- **Rotate**: Turn the world upside down (or just by 90 degrees).
- **Resize**: Scale by a factor (e.g., 2.0x) or force it into specific pixel dimensions with high-quality interpolation.

### 🎨 Color Grading Lab
Fix your lighting and mood in real-time.
- **Brightness & Contrast**: The bread and butter of image finishing.
- **Saturation**: From bleak monochrome to neon fever dreams.
- **Sharpness**: A software pass to make those fine details pop.
- **Invert**: Flips the bits. Good for quick mask checks or negative art.
- **Gamma**: Fixes the mid-tone exposure without crushing your blacks.

### 🌫️ Blur & Focus control
Control the depth and feel of your render.
- **Gaussian Blur**: Smooth, natural softness.
- **Box Blur**: Fast, linear average blur.
- **Median Blur**: Great for removing noise while preserving edges—gives a subtle "oil painting" texture.
- **Sharpen**: An OpenCV kernel pass for extreme edge definition.

### 🎭 Stylistic Filters
- **Pixelate**: Retrofy your images into 8-bit or 16-bit sprites instantly.
- **Vignette**: Darken the corners to draw the eye to the center (the most overused but effective trick in the book).

### 🎲 Entropy (Noise)
- **Gaussian Noise**: Adds a fine layer of grain. Essential for "AI De-smoothing" to make generations look like physical photographs.

### 🖋️ Edge Detection (Vision)
- **Canny Edge**: Uses the Canny algorithm to find the skeletons of your images.
- **Standalone Mode**: Outputs just the white-on-black lines.
- **Overlay Mode**: Glows the edges directly over your color image for a "Sketch" or "Holo" look.

---

## The Workflow Modes
- **🟢 Passthrough**: The node applies the effects and sends the pixels to whatever is wired next.
- **💾 Save to Disk**: Use this as your final output. It skips the preview and writes highly-organized files to your output directory.
- **✨ Both**: The best of both worlds.

---

## Use Case Scenarios
**Scenario 1: The Character Artist**
You've got a great render but the lighting is a bit flat. Toggle `Color` to bump the contrast, add a `Vignette` to frame the hero, and a tiny amount of `Chromatic Aberration` to make the armor look grounded and real.

**Scenario 2: The UI/UX Designer**
Take a background render, enable `Cyberpunk` scanlines and `Edge` detection in "Overlay" mode. Boom—instant holographic terminal interface.

**Scenario 3: The Forensic Auditor**
Use `Geometric` flip to check if your character's anatomy holds up when mirrored, and `Median Blur` to smooth out any weird AI noise before sending it to a high-res upscale.

---

## Quick Start
1. Wire any `IMAGE` into the node.
2. Toggle an effect category (e.g., `cb_enabled`).
3. Tweak the sliders that just appeared.
4. Set `operation_mode` to "Both" if you want a copy on your hard drive.

---

## Dev Corner (Jargon & Logic)
- **Order of Operations**: The internal pipeline is: `CB -> Geo -> Color -> Blur -> Noise -> Style -> Edge`. This ensures that resizing doesn't break coordinate-sensitive effects like chromatic aberration.
- **Dependency Sentinel**: The node uses a lazy-loading logic- it won't crash if you don't have CV2 installed. Instead, it will try to "Tactically Deploy" (pip install) the missing libraries on first run.
- **SVD & FFT Safety**: Color space transforms use normalized matrices to prevent "Pink Square" artifacts during extreme gamma shifts.
- **Tiled Execution**: (Planned) Large-scale resizing uses an overlapping tiled kernel to prevent OOM errors on lower VRAM cards.

---
**🐍 (b'.')b** - Keep it Pythonic.
*Part of the h4_Live Toolkit. High performance. No compromise.*
