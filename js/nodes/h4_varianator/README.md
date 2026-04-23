# h4_varianator / H4_Varianator (The Remix Node)

## What it is
A simple tool for exploring variations. Once you find an image you like, this node lets you "riff" on it—making 4 or 8 slightly different versions so you can pick the best eyes, hair, or lighting.

## Expanded Description
Finding the perfect generation is usually a game of luck. You find a pose you like, but the background is weird. Instead of manually changing seeds for an hour, the **Varianator** automates the search.

It takes your current "seed" and performs small, calculated tweaks to it. 
- It clones the image multiple times.
- It "resamples" each clone with a tiny bit of new noise.
- It gives you a batch of alternative versions to pick from.

It's essentially a "Variation Mode" for ComfyUI.

## Options
- **variation_count**: How many remixes you want (e.g., 4 or 8).
- **variation_profile**: 
  - **Minimal**: For tiny changes (expressions, eye detail).
  - **Moderate**: For noticeable changes (hair style, background detail).
  - **Major**: For big creative "hallucinations".
- **seed_mode**: How it picks the new numbers (Incrementing `1, 2, 3...` or just Random).

## Use Case Scenarios
**Scenario 1: Eye restoration**
If the eyes on your portrait are slightly wonky, set the count to 8 and the profile to **Minimal**. You'll get 8 versions of the same face, and usually one of them will have perfect eyes.

**Scenario 2: Testing prompts**
If you aren't sure if your prompt for "golden armor" is too shiny, use the Varianator to see a wide range of armor textures all at once.

## Quick Start
1. Add `H4_Varianator` after your main sampler.
2. Set count to 6.
3. Plug the output into a Save or Preview node.
4. You'll get 6 similar but unique variations in one go.

---

## Dev Corner (Jargon & Logic)
- **Latent Batching**: It stacks the variations into a single tensor stack so they can be processed by downstream nodes as a group.
- **Internal Sampling Loop**: It executes a mini-KSampler run inside the node itself to save you from having to build a massive graph.
- **Seed Warping**: It uses a deterministic math formula to move the seed slightly for each variant so the search is consistent.
