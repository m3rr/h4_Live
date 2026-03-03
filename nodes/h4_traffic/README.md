# h4_traffic / H4_Traffic Suite (The Router Architecture)

## What it is
The absolute core backbone of `h4_Live`. A collection of multiplexers, conditional data routers, pass-through state observers, and acyclic loop execution nodes that safely circumvent ComfyUI's native structural restriction against "Graph Feedback Cycles".

## Included Nodes
1. **H4_TrafficRouter (The Nexus):** Determines whether to accept data from the start of an execution or mid-stream of an execution.
2. **H4_TrafficMerge (The Zipper):** The modernized, acyclic-safe Router equipped with type discipline to prevent Type-Mismatch crashes during recursive generation blocks.
3. **H4_TrafficCop (Legacy Splitter):** Branches data safely based on conditional triggers without outputting volatile `NoneType` blocks.
4. **H4_StateMonitor (The Scoreboard):** A visible readout display representing the current underlying increment status globally running in the persistence Python memory.
5. **H4_LoopIncrementer (The Clicker):** The executor pushing deterministic `+1` addition formulas into state memory strings per-run.
6. **H4_WirelessResetButton (The Red Button):** Broadcasts global interrupt commands out of structural order to rapidly break running loops without manual iteration tracking.
7. **H4_ImageBuffer (The Teleporter):** A silent memory reservoir intercepting payload states at the end of a graph execution matrix and projecting them invisibly back to the beginning of the subsequent iteration.

## Expanded Description
ComfyUI is modeled as a Directed Acyclic Graph (DAG). If you connect a line from output Z backwards into input A, the software determines this to be a "Cycle Hazard", permanently crashes the execution sequence before even trying to run it, and throws massive pink errors. 
This means iterative logic (doing something over and over to refine a single image) natively requires building 10 KSamplers horizontally resulting in a massive screen.

The *Traffic Suite* breaks the cycle hazard.
Utilizing python caching strategies, **H4_ImageBuffer** intercepts output variables (like latent spaces or arrays), breaking the visual wire. When the sequence runs again, the **H4_TrafficMerge** reads the data stored in the ether caching, processing it flawlessly. You iterate the image repeatedly using only 1 Sampler, fundamentally restructuring workflow architecture design limits.

## The Router Settings (TrafficRouter & TrafficMerge)
- **first_run_in**: The wire from your initial data (Creation Pass).
- **loop_run_in**: The wire from your processed data (Refinement Pass). 
  - *Note: Leave loop_run_in EMPTY if utilizing `H4_TrafficMerge` & `H4_ImageBuffer` combined to circumvent wire errors automatically.*
- **first_denoise**: The variable passed back to your Sampler during Run 0 (usually 1.0 Denoise for complete hallucination processing).
- **loop_denoise**: The variable passed back to your Sampler during Run >0 (usually 0.45 Denoise for strict structural retention and minor variance refinement).
- **restart (Bool)**: Global configuration breaking the continuous iteration tracker.

## Use Case Scenarios
**Scenario 1: Refining Artifact Detail using Acyclic Renders**
You want to run a Prompt at 1.0 Strength, pass the image back to the exact same Sampler, lower strength to 0.45, pass it back, lower it to 0.30, and pass it back. 
You wire `H4_TrafficMerge` to the KSampler. Ensure `LoopIncrementer` counts iterations. At the end of the KSampler's VAE output block, you plug into an `H4_ImageBuffer`. 
During Run 0, the Router determines loop iteration == 0. It accepts input from the main Image pipeline. During Run 1+, it checks the Buffer independently, pulls the image back into the sequence start, lowers the output denoise configurations successfully, and processes a refined cycle with zero cycle topology hazards.

**Scenario 2: Mid-Render Reset Aborts**
You are executing a 40-step iteration workflow utilizing the `Traffic Suite`. At step 6, you see the structure is generating absolute aesthetic garbage. Instead of resetting the Router's restart boolean manually or re-queuing the massive execution, you possess an `H4_WirelessResetButton` completely disconnected from any logic sequences. You flip it to TRUE. The sequence instantly intercepts the command, drops the cached payload, rewrites the global index to zero, and begins the workflow again completely natively.
