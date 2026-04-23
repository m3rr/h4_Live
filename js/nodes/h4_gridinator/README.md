# h4_gridinator / H4_Gridinator (The Grid Maker)

## What it is
A simple tool for making "What if?" grids. Instead of changing one setting and hitting queue 10 times, this node lets you pick two or three things (like CFG and Steps) and see every combination all once in a single image.

## Expanded Description
Making grids in ComfyUI is normally a pain—you either need a bunch of separate nodes or you have to type in weird lists. 

The **Gridinator** makes it easy. 
- You pick an **X-Axis** (like CFG).
- You pick a **Y-Axis** (like Steps).
- You type in the values you want to test (like `4, 7, 10`).
- The node runs all the versions, labels them, and sticks them into one final grid image so you can compare them side-by-side.

## Options
- **Axis X / Y / Z Mode**: Choose what to test (Model, LoRA, CFG, Steps, Denoise, etc.).
- **Axis X / Y / Z Values**: Enter your settings separated by commas.
- **sliding_scales**: Instead of typing `0.1, 0.2, 0.3...` you can just say `0.1 -> 0.9` and it'll figure it out.

## Use Case Scenarios
**Scenario 1: Finding the "Sweet Spot"**
You aren't sure if your prompt looks better with 7.0 CFG or 10.0 CFG. Set your X-Axis to CFG, type `6, 7, 8, 9, 10`, and hit queue. You'll get one image showing all 5 versions.

**Scenario 2: Testing Samplers**
Set X-Axis to **Sampler**, type `euler, euler_a, dpmpp_2m` and see which math makes your image look the most "realistic" without changing anything else.

## Quick Start
1. Add `H4_Gridinator`.
2. Pick your X and Y axes.
3. Enter your values and hit Queue Prompt once.
4. Wait for the node to finish all the "mini-runs" to make the final grid.

---

## Dev Corner (Jargon & Logic)
- **Fuzzy Matching**: It searches your model folder to find the right file even if you only type half the name.
- **Tiled Stitching**: Combines the images on the GPU where possible, or Falls back to the CPU for massive grids to avoid crashing.
- **Internal Queueing**: It intercepts the standard sampling logic to run the sequence in a loop.
