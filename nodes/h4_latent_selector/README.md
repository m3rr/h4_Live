# h4_latent_selector / H4_LatentSelector (The Canvas)

## What it is
A resolution calculator, aspect ratio manager, and empty latent generator rolled into one. Stop memorizing pixel dimensions.

## Expanded Description
Aspect ratios are incredibly frustrating in latent space because models (like Stable Diffusion 1.5, SDXL, Wan2.1, or Flux) are trained on radically different base pixel dimensions. Calculating `1024 * (16/9)` in your head, tweaking the numbers so they are cleanly divisible by 8 or 16, and manually creating an Empty Latent Image node is tedious and prone to mathematical errors that cause generation artifacts or blurriness.

The `H4_LatentSelector` completely automates this. You select your base architecture and your desired aspect ratio, and it calculates the perfect mathematical area, snaps to the required module boundaries, and outputs everything you need to begin generating.

## Parameters and Outputs
- **Architecture List**: SD1.5 (512x), SDXL (1024x), Wan (720x), Flux (1024x variable), etc.
- **Preset Ratios**: 
  - `16:9` (Cinematic)
  - `9:16` (Story/Phone)
  - `1:1` (Square)
  - `4:3` (Standard)
  - `3:4` (Portrait)
  - `21:9` (Ultrawide)
- **Batch Size**: Crank it up to generate multiple empty latents in a single stack if you have the VRAM.
- **Outputs**:
  - `LATENT` (The empty tensor format ready for the KSampler's noise injection).
  - `width` (int)
  - `height` (int)
  - `IMAGE` (An empty tensor image for logic referencing or pixel-space nodes).

## Use Case Scenarios
**Scenario 1: Cross-Model Prompts**
You are trying to test a prompt designed for SDXL, but you want to see if Juggernaut SD1.5 can handle it. If you feed standard 1024x1024 latents into SD1.5, the model hallucinates horrifying multi-headed creatures because it wasn't trained on that resolution area. You swap the `H4_LatentSelector` architecture dropdown from `SDXL` to `SD1.5`. The node instantly recalculates the pixel area, halving the dimensions but maintaining your precise aspect ratio limit. You run the prompt perfectly.

## Examples
- **Basic Usage**:
  1. Drop the `H4_LatentSelector` onto your canvas.
  2. Select `SDXL` and `16:9`.
  3. The node automatically calculates the ideal coordinates (e.g., `1344 x 768`).
  4. Wire the `LATENT` output into your KSampler.
  5. If you are using a node that physically requires INT sizes (like an image crop or upscale tool), you can wire the `width` and `height` integer outputs directly into that node's inputs.
