# h4_traffic / H4_Traffic Suite (The Looping Tools)

## What it is
The backbone of advanced looping in `h4_Live`. These nodes let you pass data backwards in your workflow so you can refine the same image over and over again without filling your screen with a hundred samplers.

## Included Nodes
- **H4_TrafficRouter**: The main junction. It decides if we're starting fresh (from a loader) or if we're looping back (from a previous sampler run).
- **H4_TrafficMerge**: A safety version of the router that prevents crashes when things get complicated.
- **H4_ImageBuffer / H4_LatentBuffer**: The "Teleporters." They grab an image at the end of your workflow and send it back to the beginning invisibly.
- **H4_WirelessResetButton**: A "Panic Button" to stop a loop and start over at run #0.

## Expanded Description
Normal ComfyUI is like a one-way street—data flows from Left to Right and you can't go backwards. If you try, the app crashes with a "Cycle Error." 

The **Traffic Suite** acts like a bridge over that one-way street. 
1. Your image gets "Teleported" into a hidden storage area at the end of the run.
2. At the start of the next run, the **Router** pulls it out and feeds it back into the sampler.
3. This lets you do things like "Pass 1: Draw face", "Pass 2: Fix skin", "Pass 3: Sharpen eyes" all using the exact same node setup.

## Options
- **first_run_in**: The "cold start" data.
- **loop_run_in**: The data coming back from your previous run.
- **first_denoise / loop_denoise**: You can set these so that the first run is 100% new (1.0 denoise) but the loops are more delicate (0.3 denoise).

## Use Case Scenarios
**Scenario 1: Progressive Refinement**
You want an image to "evolve" over 10 runs. Use the Traffic Suite to send the image back into the sampler repeatedly. You can watch it get more detailed and complex on every loop.

**Scenario 2: Automated Inpainting**
Set up a loop to fix a character's face, then eyes, then hair, one after the other, using only one Sampler and one set of prompts.

## Quick Start
1. Add `H4_TrafficRouter` and `H4_ImageBuffer`.
2. Connect your loaders to the Router.
3. Connect your VAE Decode output to the Buffer.
4. Hit "Queue Prompt" twice to see the loop in action.

---

## Dev Corner (Jargon & Logic)
- **Acyclic Routing**: It bypasses the graph's topological check by using an intermediate Python dictionary to hold the image data.
- **Global State Tracking**: It uses the `H4_MISSION_CONTROL` index to decide which input port to prioritize.
- **Memory Decoupling**: It "breaks" the wire visually to prevent the browser from thinking there's a recursive loop.
