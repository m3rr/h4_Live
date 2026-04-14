# 👁️ H4 Forge Mask (The Surgical Suite)

## Overview
The **H4_ForgeMask** is a professional-grade interactive masking tool for ComfyUI, designed to replicate the refined "Surgical" experience of the Forge UI/Automatic1111 inpainting tabs. It moves away from binary masking logic toward a "Layered Constraint System" where you can sculpt gradients and influence filters directly onto your source imagery.

---

## Features

### 🛠️ The Tactical Toolset
*   **Polygon Lasso**: Plot precise geometric vertices. Double-click to close and seal the path.
*   **Multi-Shape Brushes**:
    *   **Shapes**: Circle, Square, Rectangle, Triangle, Diamond, Oval.
    *   **Dynamic Resizing**: Use the **Mouse Wheel** to scale your brush size in real-time.
    *   **Hardness Control**: Adjust the feathering for soft-blending (The "Defibrillator" Effect).
*   **Eraser**: Clean transitions between masked and unmasked zones.

### 🎨 The Off-Black Studio (UI)
*   **Pane 1 (Canvas)**: High-resolution drawing space.
*   **Pane 2 (Controls)**: Tool selectors and sliders centered on a sleek H4 Off-Black theme.
*   **Dual Tracking Filmstrip**: Swap between the raw input and the "Inpaint Red" overlay.
*   **Hover Inspection**: Hover over the canvas to see the mask active over your image.

### 🧠 Modern AI Logic
*   **Resolution Agnostic**: Masks are automatically scaled to match the source image dimensions on execution.
*   **Base64 Serialization**: Masks are stored within the node's state, surviving page refreshes and workflow sharing.
*   **Soft Inpaint Ready**: Built-in Gaussian Blur and influence strength sliders to ensure seamless blending transitions.

---

## Usage
1. Connect an **IMAGE** to the `image` input.
2. Select your tool (Brush or Lasso).
3. Paint/Outline your desired area.
4. Click **"EYE OF THE TIGER"** to apply and trigger the workflow.
5. Plug the **MASK** output into your Sampler or Inpainting node.

**Note**: To close a Polygon Lasso, double-click anywhere on the canvas.

---

*"Restart the heart of the pixels without killing the body of the image."*
**Be Your Best - h4 (b'.')b**
