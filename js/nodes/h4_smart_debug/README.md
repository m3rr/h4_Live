# h4_smart_debug / H4_SmartConsole (The Inspector)

## What it is
A handy little terminal node if you need to see exactly what's flowing through your wires. Think of it like a digital multimeter for your data—you plug it in, and it tells you everything from simple text outputs to the math behind your images and tensors.

## Expanded Description
Debugging in ComfyUI is usually a lot of guessing. You wonder why an image is pitch black or why a prompt isn't swapping words correctly. 

The **Smart Console** gives you a "live" readout right on the node. You don't have to look at your terminal window; you can see it right there on the canvas. 
- **Normal Mode**: Gives you the basics (type, shape, etc.).
- **+ULTRA Mode**: Gives you the "Nuclear" view. It digs deep into the object to show you every hidden setting and mathematical statistic. Use this when something is seriously broken.

## Options
- **mode**: Toggle between Normal and +ULTRA intensity.
- **label**: Give it a name so you know which debugger you're looking at in your logs.
- **anything_in**: Plug anything into this. It doesn't care if it's an image, a string, or a model.

## Use Case Scenarios
**Scenario 1: Hunting for "Exploding" Samplers**
If your images are coming out as static or pitch black, you can plug your latent into this. If the console says the value is "NaN" (Not a Number), you know your sampler settings are pushy too hard.

**Scenario 2: Checking your Prompts**
If you're using something like `H4_Switcheroo` and want to make sure the words actually changed before you hit the sampler, just wire the text through this console. It'll show you the final prompt in real-time.

## Quick Start
1. Drop `H4_SmartConsole` between two nodes.
2. Wire your data into `anything_in`.
3. Read the text box on the node.

---

## Dev Corner (Jargon & Logic)
- **Object Introspection**: Uses `dir()` and `vars()` to map the object's structure.
- **Tensor Forensics**: Uses `torch.min/max/mean` to detect mathematical errors like NaNs or Infs.
- **Canvas Rendering**: Uses custom Javascript to draw the log directly on the node's foreground for better visibility.
