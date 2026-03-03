# h4_discombobulator / H4_Discombobulator (The Glitch)

## What it is
A UI scrambler. Purpose largely redacted from the main readable console output.

## Expanded Description
"Because I was bored and wanted to see if I could make the interface look like the Matrix."

The `H4_Discombobulator` is an easter egg, a stealth node operating entirely as a frontend DOM-mutator. It intercepts ComfyUI system notifications, status bars, and UI elements, translating them into leetspeak, binary drops, or glitch-text formatting. 

It does **not** alter your workflow graph. It does **not** touch your images, latents, prompts, or weights. It executes purely as a no-operation (noop) backend stub, returning `float("NaN")` to ensure it never triggers an unwanted functional evaluation within the DAG.

## Why it exists
It showcases the capability of the `h4_Live` module system to intercept and rewrite core ComfyUI frontend web components on the fly (via Javascript injection), without relying exclusively on backend python overrides.

## Use Case Scenarios
**Scenario 1: Pranking yourself or your friends**
You place this node somewhere deep in a massive, nested workflow and forget about it. When you click queue, the familiar "Executing..." status bar instead reads "10110001_Executing" and drops glitch characters randomly. You question your sanity. You remember the Discombobulator.

## Examples
- **Activation**:
  1. Add the `H4_Discombobulator` to your canvas.
  2. You do not need to wire any inputs or outputs.
  3. Queue a prompt. Watch the status text at the top of the ComfyUI window begin to artifact.
