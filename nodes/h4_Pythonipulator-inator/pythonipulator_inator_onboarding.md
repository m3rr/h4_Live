# Pythonipulator-inator — Onboarding & Project Reference
> ComfyUI Custom Node | h4 Node Pack
> Created: 2026-04-22 | Status: In Development

---

## 🧠 What Is This?

**Pythonipulator-inator** is the go-to Python image manipulation node for ComfyUI.

A single node that houses every known Python image method in one organized, intuitive UI. It serves dual purpose:

- **Inline effects node** — apply transformations and pass the tensor downstream
- **Terminal save node** — apply effects and save to disk at end of workflow
- **Both simultaneously** — apply, save, AND pass through

No more hunting across 12 different nodes for basic image operations. Everything lives here.

---

## 🏗️ Architecture Overview

### Node Type
`ComfyUI Custom Node — Python backend + JavaScript frontend`

### Libraries
- `PIL / Pillow` — core image operations
- `OpenCV (cv2)` — advanced filtering, edge detection, geometric transforms
- `NumPy` — array manipulation, noise generation
- `scikit-image` — detail enhancement, advanced effects

### UI Philosophy
- Nested, collapsible sections organized by category
- Intuitive labeling — no cryptic parameter names
- Sensible defaults on everything — zero config to get a result
- All effects individually toggleable (checkbox per effect)
- Clean, not overwhelming

---

## 📦 Capabilities

### 🔄 Geometric / Transform
| Effect | Parameters |
|---|---|
| Rotate | Angle (float), expand canvas (bool) |
| Flip | Horizontal / Vertical / Both |
| Crop | Manual coords OR centered crop |
| Pad | Size, fill color OR mirror fill |
| Resize | Width, Height, Resample mode (nearest/bilinear/bicubic/lanczos) |
| Perspective Warp | 4-point control |
| Skew / Shear | X axis, Y axis |
| Barrel / Pincushion Distortion | Strength float |

---

### 🎨 Color / Tone
| Effect | Parameters |
|---|---|
| Brightness | Float multiplier |
| Contrast | Float multiplier |
| Saturation | Float multiplier |
| Hue Shift | Degrees (-180 to 180) |
| Gamma Correction | Gamma float |
| Channel Swap | Mode select (RGB/BGR/RBG etc) |
| Posterize | Bits (1-8) |
| Solarize | Threshold (0-255) |
| White Balance | R/G/B multipliers |
| Color Temperature | Warm/Cool slider |
| Invert / Negative | Toggle |

---

### 🌀 Blur / Sharpen
| Effect | Parameters |
|---|---|
| Gaussian Blur | Radius |
| Box Blur | Radius |
| Motion Blur | Angle, Strength |
| Unsharp Mask | Radius, Percent, Threshold |
| Edge Enhance | Toggle |
| Median Filter | Size (noise reduction) |

---

### 🎭 Stylistic Effects
| Effect | Parameters |
|---|---|
| Emboss / Relief | Toggle |
| Sketch / Pencil | Strength |
| Pixelate | Block size |
| Halftone | Dot size, angle |
| Vignette | Strength, Radius, Color |
| Film Grain | Intensity, Monochrome toggle |
| Chromatic Aberration | R/G/B channel offset (x,y) |

---

### 🔍 Edge / Detail
| Effect | Parameters |
|---|---|
| Edge Detection | Mode (Canny / Sobel) + threshold |
| Contour Extraction | Toggle |
| Detail Enhance | Strength |

---

### 📡 Noise
| Effect | Parameters |
|---|---|
| Gaussian Noise | Mean, Sigma |
| Salt & Pepper | Density float |
| Dithering | Mode select |

---

### 💾 Output / Save Mode
| Mode | Behaviour |
|---|---|
| Pass Through | Apply effects, output tensor inline |
| Save to Disk | PNG / JPG / WEBP, quality, filename, path |
| Both | Save AND pass tensor downstream |

---

## 🔌 Node I/O

```
INPUTS:
  - image (IMAGE tensor) — required
  - [all effect parameters — see sections above]

OUTPUTS:
  - image (IMAGE tensor) — pass-through with effects applied
```

---

## 📁 File Structure

```
h4_pythonipulator_inator/
├── __init__.py
├── pythonipulator_inator.py     # Core node logic
├── effects/
│   ├── geometric.py
│   ├── color.py
│   ├── blur.py
│   ├── stylistic.py
│   ├── edge.py
│   ├── noise.py
│   └── output.py
└── js/
    └── pythonipulator_inator.js  # UI enhancements
```

---

## 🧱 Node Registration

```python
NODE_CLASS_MAPPINGS = {
    "H4_Pythonipulator_Inator": PythonipulatorInator
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "H4_Pythonipulator_Inator": "Pythonipulator-inator 🐍"
}
```

---

## 🗒️ Dev Notes

- Part of h4's ComfyUI node pack — standalone entity, NOT coupled to SmartSave or any other node
- SmartSave handles metadata/JSON sidecar — Pythonipulator-inator handles pixel-level manipulation
- When used as terminal save node, mirrors SmartSave's folder/filename conventions for consistency
- Effects should be non-destructive to original tensor until explicitly committed
- UI collapsible sections are mandatory — full expanded UI will be overwhelming
- Confirm scikit-image is available in ComfyUI's Python env before using — may need fallback

---

## ✅ Status Checklist

- [ ] Core node scaffold
- [ ] Geometric transforms
- [ ] Color / tone controls
- [ ] Blur / sharpen controls
- [ ] Stylistic effects
- [ ] Edge / detail
- [ ] Noise
- [ ] Output / save mode
- [ ] JavaScript UI (collapsible sections)
- [ ] Testing in ComfyUI
- [ ] Push to node pack

---

*h4 Node Pack | Pythonipulator-inator | Built with Python, PIL, OpenCV, NumPy*
