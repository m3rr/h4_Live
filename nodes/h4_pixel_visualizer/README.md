# h4_pixel_visualizer / H4_PixelVisualizer (Diff Inspector)

## What it is
A pixel-level difference analyzer that shows exactly what changed between two images by computing the tensor difference and rendering a visual heatmap.

## Expanded Description
When debugging image processing pipelines, evaluating subtle changes—like a slight increase in denoise, a minimal color grade, or testing if an upscale pass actually did anything—can be nearly impossible by eye. `H4_PixelVisualizer` solves this mathematically. 

It takes an original image (Image A) and a processed image (Image B), computes `torch.abs(A - B)`, and amplifies the microscopic variances into a glowing heatmap. If an upscale node literally did nothing, the heatmap will be completely black. If it altered sub-pixel edge boundaries, the edges will glow.

## Inputs and Outputs
- **Inputs:** `image_a` (Original), `image_b` (Processed/Test).
- **Settings:** `heatmap_scale`. Default is 5.0. Raising this to 50.0 amplifies invisible changes (e.g., fractional noise shifting) into blinding visible light.
- **Outputs:**
  1. `Heatmap`: The visual mapping of differences.
  2. `Side-by-Side`: A spliced frame showing Image A right next to Image B.
  3. `Image A`: Passthrough signal.
  4. `Image B`: Passthrough signal.

## Use Case Scenarios
**Scenario 1: Face Swap Quality Control**
You are trying to determine how badly a Face Swap node degraded the background. You plug the original image and the swapped image into the Visualizer. The glowing heatmap clearly shows the swap isolated cleanly around the jaw, but also reveals a subtle glow across the entire image background—meaning the swap node performed a global lossy resave and degraded the entire picture quality unintentionally.

**Scenario 2: Sampler Drift Testing**
You generate an image with an Euler sampler and the exact same seed with an Euler_Ancestral sampler. They look functionally identical. You run them through the diff inspector with a `heatmap_scale` of 30.0. The Inspector isolates and highlights exactly where the ancestral noise injection mutated the structural lines of the background.

## Examples
- **Basic Inspection Setup**:
  1. Run an Image through `H4_PixelPress` (SSAA & HDR).
  2. Pipe the original unedited image into `image_a` of the Visualizer.
  3. Pipe the HDR-processed image into `image_b`.
  4. Preview the resulting Heatmap output to see exactly which shadow zones the Tonemapper impacted.
