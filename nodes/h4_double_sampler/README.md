# h4_double_sampler / H4_DoubleSampler (The Dual-Core Engine)

## What it is
The monster truck of samplers. It combines two-stage generation (Primary block + Refiner block), sentient prompt processing (Stutter & Wildcards), and a sliding CFG scale into a single, unified node that keeps your graph clean and your options open.

## Expanded Description
Normally, if you want to generate an image to 80% completion with an Euler sampler, and then finish the last 20% of denoising with a DPM++ SDE sampler (for extreme photorealistic details), you must wire two massive `KSampler (Advanced)` nodes together, split the steps, match the seeds manually, and wire positive/negative conditioning to both.

The `H4_DoubleSampler` encapsulates that entire pattern. 

Beyond sampling, it features "Sentient Prompting". While standard Comfy nodes wait for a pre-encoded `CONDITIONING` tensor, the DoubleSampler accepts raw text and a `CLIP` model directly. This allows it to manipulate the text *before* encoding it. It can instantly process custom Wildcard dictionaries (`{red|blue|green} hair`), and perform "Prompt Stutters" (`[cat*5]` -> `cat, cat, cat, cat, cat`) for explosive prompt weighting without using confusing internal attention syntax.

## Parameters and Interface
- **Stage 1 Settings:** `steps`, `sampler_name`, `scheduler`. Standard base processing.
- **Stage 2 Settings (Toggleable):** `start_at_step`. When you flip the UI Toggle to "ON", Stage 2 settings unhide themselves. This defines when the Refiner kicks in, using the secondary sampler and scheduler you define.
- **CFG Options:** A dual-slider system to dynamically transition from a loose, low-CFG at the start of generation to a heavily restrictive, high-CFG near the end to "tighten" composition.
- **Inputs:** `model`, `clip`, `vae`, `latent`, `positive_text`, `negative_text`, `wildcard_text`.

## Use Case Scenarios
**Scenario 1: The 'DPM Detail Handoff'**
SDXL works incredibly fast using the `lcm` sampler, but images often look plastic or low-detail. You set Stage 1 to `lcm` or `euler_a` for 20 steps to block out the composition rapidly. You toggle Stage 2 "ON", set it to `dpmpp_3m_sde` starting at Step 21, and let it run for 10 more steps. The image finishes rapidly but gains all the microscopic texture detail of the slower SDE solver.

**Scenario 2: Unlocking Chaos with Stuttering**
You want to force a model to generate a specific aesthetic: an extremely messy grunge room. Standard weights `(messy grunge room:1.5)` aren't working. You type `[messy*5] [grunge*3] room` into the positive text input. The node physically replicates the words under the hood, absolutely flooding the token space and forcing compliance.

## Examples
- **Using a Wildcard Bank**:
  1. In the `wildcard_text` input box, type:
     `hair=[red, blue, green, blonde, black]`
     `clothes=[a suit, a dress, armor, rags]`
  2. In your `positive_text` box, type:
     `a beautiful woman with {hair} hair, wearing {clothes}, standing in a city.`
  3. Connect an `H4_SeedSequencer` set to "Random".
  4. Every time you generate, the node will autonomously parse the bank, select a random combination, encode it, and sample it. You will never get the same image twice.
