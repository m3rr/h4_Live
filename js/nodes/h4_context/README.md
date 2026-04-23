# h4_context / H4_ContextHub & H4_ContextUnpack (The Cable Bundler)

## What it is
A simple way to clean up your canvas by bundling all your wires into one single "trunk" cable. It takes your Model, VAE, CLIP, Prompts, and Images and packs them into one pipe so you don't have wires crossing everywhere.

## Expanded Description
As your workflows get bigger, you end up with "spaghetti"—wires flying across the screen everywhere. This makes it hard to see what's going on.

The **Context** nodes act like a multi-conductor cable. 
- The **Hub** takes all your outputs and puts them in a bundle.
- The **Unpack** node lets you take them back out wherever you need them.

You only have to drag one wire across your screen instead of 10. If you change your model at the beginning, it updates everywhere naturally through the pipe.

## Options
- **base_pipe**: You can plug one pipe into another. If you have a pipe but want to just swap the "Latent" for a different one, you can do that in a Hub mid-way through your workflow.

## Use Case Scenarios
**Scenario 1: Keeping things tidy**
If you have a workflow with three different samplers, instead of dragging three sets of model/prompt wires across the screen, just bundle them once and "break them out" at each sampler.

**Scenario 2: Making quick swaps**
If you want to use the same model and prompts but test three different images, you can use the `base_pipe` in a Hub to keep the models the same but swap just the image input.

## Quick Start
1. Place a `H4_ContextHub` at the start and plug in your loaders.
2. Drag the `h4_pipe` wire to wherever you want.
3. Place a `H4_ContextUnpack` and plug the pipe in to get your models back.

---

## Dev Corner (Jargon & Logic)
- **Zero-Copy**: It doesn't actually clone the data; it just passes a list of references in memory, so it doesn't take up extra VRAM.
- **Recursive Overrides**: Uses a "if new, use new; else use old" logic for inputs, allowing you to update specific parts of the pipe without breaking the rest.
