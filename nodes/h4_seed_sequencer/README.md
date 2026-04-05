# h4_seed_sequencer / H4_SeedSequencer (The Chaos Controller)

## What it is
A state-aware, sophisticated random number generator and controller designed for advanced loop variation, sequence timing, and length-constrained number emission.

## Expanded Description
Vanilla ComfyUI seeds are massive integers (`352859205820582`) randomized blindly at initialization. When building animations, generating permutations, or attempting to memorize a specific generation configuration, working with these ungainly integers is a nightmare. Furthermore, traditional string-value "Random" nodes change their variable on every single UI graph update, frustrating continuous iteration.

The `H4_SeedSequencer` has an internal state memory track allowing independent progression disconnected from the primary workflow loop incrementer. It can automatically advance numbers predictably, clamp random digits for legibility, and maintain constants for specific periods before mutating.

## Key Features
- **State Memory:** Saves its previous execution logic, letting you branch conditionals based on "What seed did I just use?".
- **Digit Constraints:** Generates specific, manageable block numbers (e.g., 4-digit seeds: `9352`). Easily typed, easily remembered.
- **Auto-Advance Mechanisms:** Automatically steps integer cycles up or down completely independent of the global loop count. This allows you to intentionally "hold" a single seed stationary for exactly 3 workflow cycles (to render 3 denoise passes over the same structural frame) before autonomously stepping forward to the next seed to render the next frame.

## Use Case Scenarios
**Scenario 1: Controlling Video Generation Coherence**
You are trying to output frames for an animation sequence. A completely random seed per frame creates a strobing, terrible video. A fixed seed lacks required geometric variance across the 500 frames. You set the Sequencer to `Incremental`. The node outputs Seed `7000`, processes the frame, then updates its state to `7001`, then `7002`. This produces smooth, deterministically evolving generation states free of aggressive chaos.

**Scenario 2: Creating a Shareable Format Code**
You want to share your prompt formula on Reddit and allow users to reproduce your specific output. Using a 16-digit random number leads to frequent copy/paste errors. You set the Sequencer to constrain numeric emission to 6 digits, resulting in `642819`. It guarantees perfectly reproducible UI data sharing.

## Examples
- **Usage via Node Hook**:
  1. Add `H4_SeedSequencer` to the canvas.
  2. Connect the `Seed` integer output to the matching integer hook of your target `KSampler`.
  3. Adjust length constraints to your operational preference.
  4. Specify `Fixed`, `Incremental`, or `Random` depending on if you want static reproduction, animated transitions, or total conceptual chaos.
