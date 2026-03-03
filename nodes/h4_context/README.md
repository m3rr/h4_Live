# h4_context / H4_ContextHub & H4_ContextUnpack (The Mothership & The Distributor)

## What it is
A bundling system for your data. It takes your Model, VAE, CLIP, Positive Prompt, Negative Prompt, Latent, and Image, and packs them into a single `H4_PIPE` wire. The Unpack node rips them back out at their destination.

## Expanded Description
ComfyUI's visual programming paradigm is powerful, but creating complex workflows quickly leads to "spaghetti monsters" where dozens of intersecting lines obscure the logic of your graph. 

The `H4_Context` system acts as a multi-conductor trunk cable. By using the **Hub** at the beginning of your workflow, you bundle up to 10 distinct data types into an indivisible payload. You then route this single, clean wire across your canvas. When you reach your processing nodes (like KSamplers or Face Restorers), you attach the **Unpack** node, which serves as a breakout box, giving you immediate local access to all the bundled variables.

### The Nodes
1. **H4_ContextHub (The Mothership):**
   - Inputs: Model, VAE, CLIP, Positive, Negative, Latent, Image, Mask, Any_A, Any_B, base_pipe.
   - Output: `H4_PIPE`

2. **H4_ContextUnpack (The Loot Piñata):**
   - Input: `H4_PIPE`
   - Outputs: Everything that was packed into the pipe.

## Use Case Scenarios
**Scenario 1: The Multi-Sampler Workflow**
You have a workflow that uses three different KSamplers to generate foregrounds, backgrounds, and character details, all using the same core Model and CLIP text encoders. Instead of dragging 3 wires from the Loaders to each Sampler (9 wires total crossing the screen), you pack them once into a ContextHub. You drag the singular Pipe wire to each Sampler sector, drop an Unpack node, and wire locally. If you ever swap your Base Model, you only touch the origin Hub.

**Scenario 2: Injecting Custom Tracking Data**
You have a complex looping script and need to pass an arbitrary Python string or float list along with your image. You plug it into the `Any_A` port of the Hub. It traverses the entire workflow silently inside the pipe, and you unpack it 50 nodes later exactly when you need to read the data.

## Examples
- **Chaining Context Hubs**:
  You can wire a `H4_PIPE` into the `base_pipe` input of a new Hub. 
  If you provide a *new* Latent to this second Hub, it will output a new pipe containing the updated Latent but will keep the Model, VAE, and Prompts from the original pipe intact. This allows you to "override" specific streams mid-flight without breaking the bundle.
