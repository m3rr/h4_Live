# h4_pixel_press / H4_PixelPress (The Sharpener)

## What it is
A high-quality image enhancer. It uses a "supersampling" trick to make your images look more detailed and clean. It basically blows the image up in its memory, fixes the lighting and sharpness, and then squashes it back down to create a result with zero jagged edges (anti-aliasing).

## Expanded Description
AI images can sometimes have "jagged" lines or look a bit blurry when you zoom in on small details like eyes or metal edges. 

The **PixelPress** node acts like a "Pressure Cooker" for pixels:
1. **Supersample**: It scales the image up by 2x or 4x inside the node's memory.
2. **HDR Lighting**: It adjusts the brightness of the shadows and highlights to bring out hidden details.
3. **Sharpen**: It "pin-cushions" the edges while the image is massive.
4. **Squash**: It shrinks it back down to 1024px.
- **Result**: Because the final pixels were "born" in a high-res environment, they look way more dense and "photorealistic" than a standard render.

## Options
- **supersample_scale**: How hard the node works. 2.0 is great for most people. 4.0 is only if you have a massive GPU and want the ultimate crispiness.
- **enable_hdr**: Turn this on to reveal the brightness sliders.
- **shadow_intensity**: Use this to "lift" the dark parts of your image and see what's hidden in the shadows.

## Use Case Scenarios
**Scenario 1: Fixing "Jaggies"**
If you have an image where the character's hair looks a bit "digital" or has staircase lines, run it through the PixelPress. The lines will become as smooth as a real photograph.

**Scenario 2: Low-Light Restoration**
If your image is too dark and you can't see the detail in a character's costume, turn on **HDR** and increase the **shadow_intensity**. It'll pull the textures out of the black areas without making the image look "washed out".

## Quick Start
1. Place a `H4_PixelPress` right before your Save node.
2. Set `supersample_scale` to 2.
3. Check the results—you'll notice things look "heavier" and more detailed instantly.

---

## Dev Corner (Jargon & Logic)
- **CIELAB Color Space**: We convert the image to the `L*a*b*` space so we can brighten shadows without changing the hue of the color.
- **Lanczos-3 Filtering**: We use a high-end mathematical filter for the final downscale to preserve as much detail as possible.
- **Tiled Processing**: It breaks the massive supersampled image into "tiles" so it doesn't crash your VRAM.
