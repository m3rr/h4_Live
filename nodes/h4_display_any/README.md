# h4_display_any / H4_DisplayAny (The Universal Monitor)

## What it is
A debug node that accepts *anything* (Images, Latents, Tensors, Strings, Lists) and displays it directly on the canvas without choking.

## Expanded Description
Native ComfyUI is incredibly strict about data types when it comes to visual inspection. If you want to see an image, you wire a `PreviewImage` node. If you want to read a text string from a prompt generator, you wire a `ShowText` node. If you try to wire a Latent into a Text node, the connection simply snaps back.

The `H4_DisplayAny` node is omnivorous. It utilizes the wildcard `*` input type to accept any incoming connection. During execution, it uses Python reflection and type checking to figure out what you just handed it. 

If it's an Image tensor `[B, H, W, 3]`, it renders it visually. If it's a Latent dictionary, it displays the key structural data (`samples: [B, 4, H, W]`). If it's pure text, it prints the string. It adapts. It overcomes.

## Inputs and Outputs
- **Input (`any`)**: Wire literally anything here.
- **Output (`any`)**: A passthrough port that outputs exactly what came in, unchanged, allowing you to insert this node into the middle of a live wire without breaking the flow.

## Use Case Scenarios
**Scenario 1: Inspecting Mask Tensors**
You are trying to combine three different segmentation masks and they keep turning pure black when generated. Instead of wiring up three different VAE Decoders and three Preview Images just to see what the raw data looks like, you drop `H4_DisplayAny` directly into the mask wire path. It parses the binary `[B, H, W]` mask tensor and displays it.

**Scenario 2: The Quick Text Check**
You are using a complex wildcard prompting script that generates randomized paragraphs, and the KSampler is ignoring your inputs. You wire the string directly into `H4_DisplayAny`. It instantly prints the exact string structure the prompt generator emitted, and you realize it passed a list instead of a string.

## Examples
- **Inline Sniffing**:
  1. Have a connection from your KSampler to a VAE Decode node.
  2. Delete the wire.
  3. Place an `H4_DisplayAny` node between them.
  4. Wire the KSampler's output Latent into the DisplayAny input.
  5. Wire the DisplayAny output to the VAE Decode.
  6. The node will act as a transparent monitor, logging the Latent shape directly on the canvas without disrupting the generation.
