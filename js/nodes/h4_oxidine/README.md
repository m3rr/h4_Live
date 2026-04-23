# h4_oxidine / H4_Oxidine (The Super-Wire)

## What it is
The "Spaghetti Stopper." It's a special node that lets you hide all your messy wires inside a single line. You plug everything (Models, VAEs, Prompts, Images) into one side, and on the other side, you just have a single "Universal" wire that carries everything at once.

## Expanded Description
Normal ComfyUI requires five wires for every Sampler. If you have a big workflow, those wires cross over each other and make a mess. 

The **Oxidine** wire is "smart." 
- You plug your Model, VAE, CLIP, and Prompts into the host node.
- You get a single wire called `omni_proxy`.
- You drag that one alone wire across your screen.
- You can plug that **ONE** wire into **EVERY** input of your Sampler.

The sampler asks the wire "Do you have a model?" and the wire says "Yep, here you go." It saves a huge amount of space and makes your workflows look clean and professional.

## Options
- **MODEL/VAE/CLIP/etc**: The standard things you want to hide.
- **base_omni**: You can even chain these together to make "sub-pipes." 

## Use Case Scenarios
**Scenario 1: Cleaning up a mess**
Take your messy group of loaders and plug them into an Oxidine node. Now you only have one wire snaking through your entire canvas. 

**Scenario 2: Making "Modular" pieces**
If you have a set of prompts you use for everything, bundle them into an Oxidine wire. Now you can just "drop in" that one wire to any new part of your graph to get all your settings instantly.

## Quick Start
1. Add `H4_Oxidine` near your loaders.
2. Plug everything in.
3. Drag the `omni_proxy` wire to your destination.
4. Plug that same wire into every input of your target node (like a Sampler). It works!

---

## Dev Corner (Jargon & Logic)
- **Attribute Proxying**: The Python object has been modified (`__getattr__`) to act like whatever the calling node needs.
- **Dynamic Type Matching**: Uses the wildcard `*` type to satisfy the browser's wire validation.
- **Zero Overhead**: Since it just passes references, it doesn't slow down your computer or use extra RAM.
