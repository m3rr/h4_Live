# h4_axis / H4_AxisDriver (The Sidekick)

## What it is
A helper node for the Gridinator. It allows you to build complex axis configurations (Preset lists) and feed them into the Gridinator as a JSON blob.

## Expanded Description
Typically, managing multiple axes for an X/Y/Z grid in ComfyUI requires a convoluted web of lists and string concatenations. The `H4_AxisDriver` solves this by acting as a dedicated configuration manager for the `H4_Gridinator`. It translates your custom lists, prompt variations, and numerical sweeps into a standardized JSON payload that the Gridinator can ingest natively.

You likely won't touch this manually unless you are creating a "Preset Bank" of grids, such as a "Standard Render Test" that you reuse across multiple workflows.

## Use Case Scenarios
**Scenario 1: The Model Evaluation Suite**
You want to evaluate 5 newly downloaded checkpoints against your standard prompts at 3 different CFG levels. 
Instead of typing this out every time, you connect an `H4_AxisDriver` pre-configured with your favorite test prompts and CFG steps (e.g., 4.0, 5.5, 7.0), saving it in your template workflow. When testing a model, you just wire the driver to the Gridinator and hit queue.

**Scenario 2: Sampler vs. Scheduler Shootout**
You want to explore which combination of Sampler and Scheduler produces the best realism. You use the AxisDriver to define Axis X as a list of Samplers (`euler_a, dpmpp_sde, uni_pc`) and Axis Y as a list of Schedulers (`normal, karras, exponential`). The Driver formats these axes safely, ensuring the Gridinator iterates through every possible combination perfectly.

## Examples
- **Basic Usage Profile**:
  1. Add `H4_AxisDriver` to the canvas.
  2. In the text box for Axis X, input `10, 20, 30` (for testing steps).
  3. In the text box for Axis Y, input `3.0, 5.0, 7.0` (for testing CFG).
  4. Connect the output of the Driver into the `Axis_Input` of the `H4_Gridinator`.
  5. The Gridinator will now generate a 3x3 grid (9 images total) covering the matrix.
