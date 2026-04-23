# h4_model_merger / H4_ModelMerger (The Model Mixer)

## What it is
A specialized tool for blending different AI models together. It lets you mix up to 3 models at once and gives you "Live" previews so you can see if the blend looks good *before* you save it to your hard drive.

## Expanded Description
Mixing models (like an "Anime" model and a "Realistic" model) is usually a blind guess. You mix them, save a 6GB file, test it, hate it, and delete it. 

The **Model Mixer** makes this way faster. 
1. It lets you blend the models in your RAM so you can test them instantly.
2. It gives you "Granular" control. You don't have to just mix everything at 50/50. You can tell it to keep the "lighting" of Model A but the "face shapes" of Model B.
3. It has a **Fail-Safe**. If you pick settings that would normally crash ComfyUI, this node catches the error and just tells you "Invalid Merge" instead of crashing your whole session.

## Options
- **base_ratio**: The main blend strength (0.0 means all Model A, 1.0 means all Model B).
- **Block Sliders (IN/MID/OUT)**: Advanced sliders for when you want to get specific about which parts of the models to mix.
- **precision**: Stick to **FP16** unless you're a developer—it saves space and works perfectly.

## Use Case Scenarios
**Scenario 1: Dialing in a Style**
You want a model that looks like "CineStill" film but keeps the anime vibes of your favorite checkpoint. Mix them at 50/50, hit queue, and look at the preview. If the faces look too realistic, slide it more toward the anime model and hit queue again. You'll see the change instantly.

**Scenario 2: Making a custom "Private" model**
Once you find a blend you love, you can wire the output to an `H4_ModelSave` node to give it a name and save it forever.

## Quick Start
1. Add `H4_ModelMerger` and wire up your models.
2. Drag the `MODEL` output into a KSampler to test it.
3. Move the `base_ratio` slider and hit queue to see how the image changes.

---

## Dev Corner (Jargon & Logic)
- **State Dictionary Math**: It performs a weighted sum of the model tensors directly in memory.
- **Fail-Safe HUD**: It monitors the mathematical health of the weights to prevent NaNs or INF errors from reaching the sampler.
- **Block Mapping**: It maps the different parts of the UNET architecture (Input, Middle, Output blocks) to those sliders so you can target specific "concepts" in the model.
