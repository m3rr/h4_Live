# h4_smart_debug / H4_SmartConsole (X-Ray)

## What it is
An inline debugger and telemetry analyzer for ComfyUI. A node that looks *inside* any connected data block and prints a human-readable diagnostic report directly to the visual canvas and terminal execution log.

## Expanded Description
When building experimental pipelines, you frequently encounter `TypeError` or `KeyError` crashes completely lacking coherent tracebacks. 

The `H4_SmartConsole` acts as an analytical multi-tool. Utilizing Python reflection API bindings, it deconstructs arbitrary memory variables (Images, Latents, Tensor blocks, Class instances, Text primitives, Dictionaries) passed through it. 

### Diagnostic Modes
- **Normal (Default):** Prints high-level type structures. Example: "Tensor Dimension Shape [1, 512, 512, 3]", "String: 'Hello World'". Excellent for verifying that scaling matrices operated on an image cleanly.
- **+ULTRA Mode (Nuclear Inspection):** Deconstructs the underlying software matrix entirely. Prints extensive, massive lists detailing hidden memory attributes, internal callable methods, statistical `min()`/`max()` intensity limits for rendering tensors, computational mean averages, and underlying Python hex memory addresses.

## Use Case Scenarios
**Scenario 1: Debugging VAE Explodes**
You run a workflow and the result is a massive featureless pitch-black box instead of an image. You insert the `H4_SmartConsole` between the `KSampler` output latent and the `VAEDecode` input. You activate `+ULTRA Mode`. The console telemetry physically measures the array bytes and flags a calculated `NaN` (Not a Number) block value exceeding the upper floating-point variance boundary, diagnosing a structural mathematical failure in the Sampler process instead of a problem with the VAE.

**Scenario 2: Reverse-Engineering Third Party Addons**
You've downloaded a custom UI node from GitHub but have no idea what variable type it's outputting to crash your KSampler. You pipe it into the Smart Console, run it once, and see it's attempting to incorrectly pass an arbitrary Object integer wrapper globally instead of formatted float `CONDITIONING`. You now know exactly how to write a bridge converter.

## Examples
- **Basic Structural Check**:
  1. Have an output string from a Text Processor node that feeds into your `Positive Prompt` KSampler.
  2. Wire the string into an `H4_SmartConsole`.
  3. The `SmartConsole` will accurately echo exactly what characters are executing natively to verify whether random wildcards properly translated.
