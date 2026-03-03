# h4_gridinator / H4_Gridinator (IT’S OVER 9000!)

## What it is
A monolithic automated generation node that replaces dozens of individual execution blocks by rendering entire multi-dimensional X/Y/Z matrices (grids) of images in one coherent go.

## Expanded Description
Building grids in vanilla ComfyUI usually involves either third-party scripts that require complex string formatting dictionaries, or manually placing 25 KSamplers on your screen and typing in different combinations of denoise. The `H4_Gridinator` executes complex parameter sweeps inherently. 

It handles fuzzy loading (`"ponym"` automatically finds `PonyDiffusion_v6_XL.safetensors`), evaluates prompt stutters (`[cat*3]`), processes in-line permutations (`{red|blue|green}`), constructs sliding scale transitions, generates the images, tracks progress, and finally concatenates everything into a perfectly labeled grid image complete with structural headers, margins, and legible text formatting.

### Supported Axes (X/Y/Z)
You can configure Gridinator to sweep through any combination of: Model, LoRA, Steps, CFG, Denoise, Sampler, Scheduler, or Seed.

## Use Case Scenarios
**Scenario 1: CFG vs. Step Shootout**
You want to see how CFG scales against the number of steps. You configure the Gridinator's X-axis to "CFG" and input `4.0, 5.5, 7.0, 8.5`. You configure the Y-axis to "Steps" and input `20, 30, 40`. You hit Queue. The node will automatically map the 12 combinations, run the generations independently without crashing your VRAM, stitch the images together into a 4x3 grid, label the columns with the CFG values and rows with the Steps, and output the final composition.

**Scenario 2: "Sliding Scale" Ramping**
Instead of manually typing out a range, you enable "Sliding Scales". You set the X-axis to "Denoise", and input a start of `0.2` and an end of `0.8` over `10` frames. The Gridinator automatically calculates the linear interpolation spacing, generating exactly 10 images with incrementally increasing Denoise strength, rendering a beautifully smooth visual transition of structural changes.

## Examples
- **Model Sweeps via Fuzzy Text**:
  1. Set Axis X mode to "Model".
  2. In the override field, type: `juggernaut, pony, animagine`.
  3. The node evaluates string proximity against your loaded checkpoint directory.
  4. It sequentially loads `Juggernaut_XL_v9...safetensors`, generates the image, unloads it, loads `ponyDiffusion...safetensors`, generates the image, and so on. (Be aware this will take significantly longer due to model swapping).
