# h4_smart_save / H4_SmartSave (The Vault)
**Current Standard:** v24.14.38 (+ULTRA Edition)

## What it is
A sentient image archiving and forensic workstation that acts as your unified "Preview Image" and "Save Image" pipeline. It doesn't just save pixels; it hoards the DNA of your generation process. It features an autonomous **Recursive Parameter Crawler** that extracts parameters from the entire upstream workflow, a **Nested Drawer HUD** for tiered tactical control, and a high-fidelity **Lightbox** for deep pixel inspection.

### **The +ULTRA Edition (v24.14.38) Upgrade:**
This version represents the endgame of ComfyUI UI hardening. We've implemented a series of "Sovereign" protocols to ensure the HUD remains absolute and ghost-free.
- **Recursive Crawler Engine**: Zero-wire telemetry. The node recursively crawls every link in your graph backwards to find prompts, models, seeds, and configurations.
- **Nested Tier-2 Insights**: Clicking a node in the Parameters [P] drawer now slides out a secondary diagnostic HUD for that specific node.
- **Kinetic Rescaling**: The node is fully resizable (Min: 750x500) to allow for customized workspace layouts.
- **Viewport Sovereignty**: Aggressive real-time DOM synchronization kills "ghost" inputs stuck in the top-left or other coordinate artifacts when zoomed out or off-screen.
- **Shadow Banishment Protocol**: Native widgets are kept for backend validation but are permanently cloaked and relocated to -9999px in the DOM.

## Legacy History (Hoarder's Delight)
A dual-mode image handler acting seamlessly as your unified "Preview Image" and "Save Image" pipeline. It features persistent metadata hoarding capabilities, injects graph history into PNG chunks automatically, and integrates a visual thumbnail filmstrip of 50 previous creations complete with embedded generation extraction tracking (seed, models, steps, configs) and lightbox image inspection.

## Expanded Description
The fundamental issue with ComfyUI is the binary paradigm of Output files. If you use a `PreviewImage` node, you can't save it. If you use a `SaveImage` node, it relentlessly fills your primary hard drive with 3GB of trash configurations before you hit a decent generation seed.

The `H4_SmartSave` merges this logic while providing massive QoL inspection tools.
- **PREVIEW ONLY (Default/OFF):** Routes all physical data into the transient `/temp` directory. Prevents polluting your main folder. Useful for testing prompts and seed-hunting parameters.
- **SAVE TO DISK (True):** Flips the data stream into the permanent `/output` directory, saving the final generated image forever.

In addition to routing images, it possesses a massive UI module layer:

### The Film Strip & Lightbox Integration
The `H4_SmartSave` displays a horizontal scrolling filmstrip directly on logic execution. It executes an O(n) API database call searching your unified `\comfyui\output\` arrays to map the last 50 generated image histories without crushing software loading limits. 
- You can Single Click a thumbnail to update the parameters panel and instantly load the generated file into the main node screen as a live preview format. 
- You can Double Click a thumbnail to open an immersive, absolute-resolution pan/zoom lightbox interface allowing massive 500% pixel peeling to ensure detail perfection.

### JSON Metadata Injection
Instead of relying strictly on ComfyUI's standard PNG parameters, you can type raw JSON into the "Custom Metadata" editor, automatically chunking user-facing text, Author names, or inspirational tags straight into the byte-code of the output `.png` files unconditionally.

## Use Case Scenarios
**Scenario 1: Hunting for the Perfect Face**
You execute 30 fast iterations of a single prompt attempting to get a character's face right. The node is set to `PREVIEW ONLY`. Out of 30, execution #12 actually looks perfect, but because you generated 18 more, the seed shifted, and you lost the parameters entirely. You open the `H4_SmartSave` Film Strip context window, find thumbnail #12, click it, expand the built-in Parameter Drawer side-bar, retrieve the precise deterministic seed number alongside your exact CFG/Steps utilized.

**Scenario 2: Professional Export Tagging**
You are a design professional processing graphical frames. Rather than adding metadata later via Lightroom, you pre-configure the Meta dictionary payload before execution with `"Artist": "Your Name"`, `"Project Phase": "Beta Renders"`, `"Client Code": "X892"`. Every saved image comes inherently tagged with searchable strings.

## Examples
- **Using the Inspection Lightbox:**
  1. Add `H4_SmartSave` as the terminal block of your node workflow.
  2. Queue a batch of images.
  3. Double-click any of the small thumbnails appearing in the node's graphical strip.
  4. Use the mouse-wheel or bottom sliders to drastically zoom in on the specific composition boundaries of the high-resolution render.
