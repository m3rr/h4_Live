# h4_mission_control & h4_seed_sequencer / H4_MissionControl, H4_LinearScheduler, H4_SeedGenerator (The Dashboard)

## What it is
The cockpit for handling automated iterative feedback loops and complex math orchestration inside ComfyUI. These nodes control loop counting, parameter ramping, and randomized number sequence timing.

## Included Nodes
1. **H4_MissionControl**: The Master Dashboard. Tracks current loop progress, handles loop resets, and drives logic iteration variables across the system.
2. **H4_LinearScheduler**: Calculates mathematical interpolation ramps across loop boundaries (e.g., smoothly shifting a value from 1.0 to 0.1 over 10 iterations).
3. **H4_SeedGenerator**: Signal Generator orchestrating base randomization states.

## Expanded Description
When automating ComfyUI workflows (like multi-pass refinement systems), nodes need to know what "Iteration" they are currently executing. Because ComfyUI natively has no concept of a "For Loop", `h4_Live` introduces global Python persistence memory. 

**H4_MissionControl** interfaces directly with this hidden memory. It increments the `loop_count` metric with every queue execution if set to *Active* mode, or simply reads the current value if set to *Passive*. This ensures every other module on the canvas functionally synchronizes its logic to a unified iteration index.

## Mission Control Modes
- **Passive (Default):** It sits there and reads values. It passes signals but does NOT increment the loop count. Use this if you have a separate `LoopIncrementer` (like `H4_LoopIncrementer`) elsewhere on your canvas or don't want to skip numbers by accident.
- **Active (Master Base):** This Node is CAPTAIN. It increments the global loop count every time it evaluates. **WARNING:** Do not have two Active master nodes in one workflow or your loop count will jump unexpectedly.
- **wireless_reset (Bool):** If ON, it listens for the `WirelessResetButton` distress signals to snap the loop count back to `0` mid-execution.

## Linear Scheduler Logic
The ramp math behaves exactly like a timeline keyframe interpolator:
`Start + (End - Start) * (Current_Loop / Max_Loops)`

## Use Case Scenarios
**Scenario 1: Dynamic Denoise Refinement**
You have set up an Image Buffer feedback loop. You want the first image to generate with 1.0 Denoise, but over the next 15 iterations of the loop, you want the Denoise to drop proportionally to 0.25 to prevent destroying the established details. 
1. Add `H4_LinearScheduler`.
2. Set `start_val` to `1.0`. Set `end_val` to `0.25`. Set `max_loops` to `15`.
3. The Scheduler automatically reads the current loop value from the memory.
4. You wire the `float` output directly into the KSampler's denoise widget. The math is handled for you automatically.

**Scenario 2: Seed Animation (Deterministic Chaos)**
You want to generate a 30-frame character turnaround, but you want slight interpolation drift in their facial features across the animation. You set the `H4_SeedGenerator` to "Incremental". Each time the loop triggers, the Generator outputs `Seed + 1`, giving you deterministic variation that doesn't jitter like a strobe light the way "Random" Mode would.
