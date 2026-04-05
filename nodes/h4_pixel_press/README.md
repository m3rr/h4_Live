# h4_pixel_press / H4_PixelPress (The God of Crispness)

## What it is
The ultimate "Retina Engine" Image Processing Node. Provides True Supersampling Anti-Aliasing (SSAA) and High Dynamic Range (HDR) tonemapping enhancements mathematically constrained within the CIELAB color-space framework.

## Expanded Description
Base generation natively produces images scaled around 1024px. Attempting to blow these directly up using naive nearest-neighbor scaling causes blocky, pixelated output. Upscaling via 4x Upscalers can make them overly slick and waxy. 

The `H4_PixelPress` mimics high-end video game rendering to forge "impossible details". It scales the original image by 2x, 3x, or 4x size in a massive memory buffer, then sharpens and applies dynamic range illumination enhancements (crushing shallow shadows, limiting blown-out light highlights) at this newly massive resolution, before employing Lanczos interpolation metrics to squash the image back down to its initial native scale. 

The output is an intensely dense, micro-detailed 1024px image devoid of jagged edges or pixel aliasing.

## Key Technical Functionality
- **CIELAB Transformation:** Instead of adjusting generic RGB lighting, it converts the massive tile arrays into `LAB` space (`Luminance`, `A-Color`, `B-Color`) using `ImageCms.profileToProfile`. This safely changes the intensity gradients of shadows (`1/(1+shadow)`) and highlights without distorting the actual chromaticity of the image.
- **Tiled Neural Inference:** Toggles built-in overlap masking arrays allowing an 8GB VRAM card to process a massive 64-megapixel intermediate buffer grid without throwing a terrifying Memory Allocation Crash.

## Inputs and Settings
- **supersample_scale**: `2.0` is generally optimal. `4.0` forces absolute density precision but increases processing time linearly.
- **sharpness**: The degree of fine Unsharp Mask intensity post-processing.
- **enable_hdr**: Activating tonemapping.
  - **hdr_intensity**: Pushes the depth disparity between light and shadow ranges.
  - **shadow_intensity**: Opens up crushed black gradients in the image natively.

## Use Case Scenarios
**Scenario 1: Refining Macro Photography Generations**
You prompt a tight close-up macro shot of a metallic watch face. The output is strong, but the sharp edges of the metal look slightly jagged, and the dark space beneath the gears is a flat, unreadable black patch. You run the image through `H4_PixelPress`. It scales it up 3x, uses `shadow_intensity` to bring out structural details in the dark spaces, sharpens the bevels, and shrinks it back. The gears now possess absolutely seamless micro-aliasing curves, and the lighting pops out of the darkness correctly.

## Examples
- **Basic Post-Processing Execution**:
  1. Add `H4_PixelPress` right before the end of your workflow (Before Save Image).
  2. Set `supersample_scale` to 2.
  3. Turn `enable_hdr` True, `hdr_intensity` 0.5, `shadow_intensity` 0.8.
  4. Your image will be transformed into an ultra-high definition frame structure with HDR coloring and pure smooth borders on all geometric shapes.
