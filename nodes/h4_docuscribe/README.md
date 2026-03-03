# h4_docuscribe / H4_DocuScribe (The Stenographer)

## What it is
An automatic workflow documentation generator. It acts as an automated technical writer, analyzing your graph and writing beautiful, legible Markdown files explaining what your workflow actually does.

## Expanded Description
"Help, I need to explain this 140-node monstrosity to Future Me."

ComfyUI workflows are notoriously difficult to share or archive because JSON blobs are unreadable to human eyes, and even a well-organized canvas can look like a wiring schematic for an unexploded bomb to a newcomer. `H4_DocuScribe` solves this by programmatically crawling your execution state and distilling it into a `.md` text report.

By connecting specific "source" nodes to it, the Scribe walks the graph, checks connections, reads internal parameters (seeds, CFG, models loaded, custom texts), and compiles a detailed changelog or architectural blueprint of the generation.

## Inputs and Parameters
- **source_in**: The node you want the Scribe to start reading from. (e.g., your final Output node or Main Sampler).
- **report_name**: The title of the generated markdown file.
- **save_path**: Where the markdown file will be written (relative to your output directory).

## Use Case Scenarios
**Scenario 1: Generating a ReadMe for a Shared Workflow**
You just built a stunning multi-pass upscaler using ControlNets. You want to post it on CivitAI. Instead of trying to remember which LoRA you used at what strength, you wire DocuScribe to the final KSampler. You run the workflow once. You open your output folder, grab the newly generated `Workflow_Report.md`, and copy-paste its beautifully formatted tables into your description field.

**Scenario 2: Lab Notebook Tracking**
You are trying to find the perfect hyper-parameters for a new Flux model training run. You are doing hundreds of generations. You enable the Scribe and set it to append mode. It silently logs the exact configuration matrix of every single generation so that tomorrow morning you can look through the log and figure out what values produced Image #0045 which looked perfect.

## Examples
- **Basic Integration**:
  1. Create a massive, complicated prompt.
  2. Put `H4_DocuScribe` on the corner of the canvas.
  3. Wire the KSampler output directly into the Scribe's input.
  4. Queue the prompt. Inside `ComfyUI/output/`, find your `.md` report detailing the exact prompt, seed, model, and graph hierarchy used to create it.
