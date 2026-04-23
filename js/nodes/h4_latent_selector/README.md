# h4_latent_selector / H4_LatentSelector (The Resolution Picker)

## What it is
A simple tool for picking the right image size for your models. Instead of typing in numbers like `1024x1024` or `1216x832`, you just pick an aspect ratio (like 16:9 or 3:2) and the model you're using (like SDXL or Flux), and it handles the math for you.

## Expanded Description
Picking the wrong size for your image can lead to "double heads" or weird, blurry results. Different models (like SD1.5, SDXL, and Flux) have "sweet spots" where they work best.

The **Latent Selector** makes this easy. 
- You pick your **Model Type** (so the node knows the pixel "budget").
- You pick your **Aspect Ratio** (16:9 for movies, 9:16 for TikTok, 3:2 for photos).
- The node calculates the exact width and height that will make the AI happy while staying as close to your chosen shape as possible. 

No more calculator math needed!

## Options
- **base_model**: Tell the node if you're using SD1.5, SDXL, or Flux.
- **aspect_ratio**: Pick your shape (Square, Cinematic, Story, etc.).
- **batch_size**: How many images you want to make at once.

## Use Case Scenarios
**Scenario 1: Making a Cinematic Wallpaper**
If you want to make a wide desktop wallpaper, just set the mode to **SDXL** and the aspect ratio to **21:9 Ultrawide**. The node will give you a perfect sized latent for that shape.

**Scenario 2: Avoiding "Double Heads"**
If you're using Flux and try to make an image that's too small, the AI can act up. This node ensures those numbers are always within the "safe zone" for the model you're using.

## Quick Start
1. Add `H4_LatentSelector`.
2. Pick your model and shape.
3. Plug the `LATENT` output into your KSampler's `samples` input.

---

## Dev Corner (Jargon & Logic)
- **Pixel Budgeting**: It calculates the total number of pixels (~1MP for SDXL) and adjusts the width/height to keep that area consistent regardless of the shape.
- **Modulo 16 Snapping**: It ensures the width and height are divisible by 8 or 16 so the AI math doesn't crash your computer.
