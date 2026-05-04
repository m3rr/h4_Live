# h4_smart_save / H4_SmartSave (The Vault — +ULTRA Edition)

## What it is
The **SmartSave** node is the definitive image archiving and forensic workstation for ComfyUI. Gone are the days of simple file saving that disconnects your pixels from the data that birthed them. When you save an image with SmartSave, you aren't just saving a PNG; you're creating a sentient vault that contains the entire DNA of your creative process.

This is the **+ULTRA Edition (v24.14.39)**, rebuilt from the ground up to handle high-performance, ghost-free canvas interactions and deep forensic backtracking.

> [!WARNING]
> **DEVELOPER ADVISORY**: Apologies for the lag that's currently an active bug with the Smart Save. The node operates perfectly, except the load time for the thumbnails and the initial preview isn't the greatest... sometimes it can take a long time to load. I'm confident this is an issue on my end of the machine. However, in the event I am wrong and you come across this issue yourself—I'm working on it. lol. All the best, h4.


## Expanded Description
The **SmartSave** node acts as your tactical mission control during long generation sessions:
- **Recursive Forensic Parameter Crawler**: The HUD [P] drawer contains every single setting from your workflow. It doesn't need extra wires; it autonomously crawls backwards through your graph to hunt down every Sampler, Model, CLIP, and VAE to present you with a clean, searchable list of the exact ingredients used for your art.
- **Visual History Strip**: A high-performance horizontal gallery at the bottom of the node shows your latest generations. It's virtualized, meaning it can handle hundreds of images without slowing down your browser.
- **The Lightbox Traveler**: Click any thumbnail to expand it into a full-screen Lightbox. Use arrow keys to navigate your history, or use the high-fidelity zoom (up to 500%) to hunt for atomic-level defects in your renders.
- **Nested Insight Drawers**: Clicking any node in the parameter list slides out a secondary details HUD, showing you the raw widget values and underlying logic of that specific node. 
- **The Three-Mode Panel System (The Book of H4)**: 
    - **Docked**: Panels remain node-locked.
    - **Pinned (📌)**: Detaches panels and pins them to the viewport edge. The canvas automatically nudges to the right to prevent node occlusion.
    - **Popout (↗)**: Mirrors the entire forensic interface into a separate browser window. Ideal for dedicated monitoring screens.
- **Universal JSON Injection**: Use the [M] drawer to manually inject custom JSON into your PNG headers. Perfect for adding experiment IDs, credits, or hidden messages for tools to read later.

---

## Tactical HUD Features (v24.14.39 Specification)

### 🧩 [P] Parameters Drawer
The brain of the node. This is where the **Recursive Crawler** displays the Workflow DNA. 
- **Zero-Wire Efficiency**: No need to clutter your canvas with telemetry inputs.
- **Breadcrumb Navigation**: Clicking a node in the list highlights it on your canvas so you can find the source of your settings instantly.
- **Tactical Scaling (📌 / ↗)**: Use the header buttons to **Pin** the panel to your screen or **Pop Out** to a new window. The Pinned mode includes viewport-aware margins to keep your node in focus.

### 📜 [M] Metadata Drawer
The manual override for your archive.
- **Author Branding**: Burn your name into the file permanently.
- **Model Indexing**: Document the exact checkpoint name even if your loader node has a generic name.
- **JSON Payload**: A dedicated field for structured data injection.

### 🏛️ Viewport Sovereignty
To keep your workspace clean, the SmartSave HUD employs aggressive **Shadow Banishment** and **LOD Guards**. 
- **Ghost-Free UI**: The drawers and inputs are physically purged from the DOM when the node is off-screen or zoomed out past 0.35x.
- **Tactical Icon Mode**: When you zoom out far, the node collapses into a simple, high-visibility "H4" icon, saving you massive amounts of CPU/GPU rendering power.

---

## Use Case Scenarios

**Scenario 1: The Iterative Scout**
You're doing 50 different runs of a character. Instead of opening your output folder, just scroll through the **History Strip** directly on the node. Found a "winner" from 20 minutes ago? Double-click it, check the [P] drawer to see the exact seed and CFG, and you're back in business.

**Scenario 2: The Workflow Doctor**
You dragged a year-old image back into ComfyUI and the graph is a mess. Use the **Forensic Crawler** to see exactly which Lora was used at what strength, even if that node is now red or disconnected. The metadata vault remembers everything.

**Scenario 3: The Organized Pro**
Set your `filename_prefix` to `Projects/Logo_Design/V1`. SmartSave will create the folders, index the images, and automatically use its **FIFO Digital Janitor** to prune old, failed tests, keeping your "Final" folder clean and professional.

---

## Quick Start
1. Replace your standard `Save Image` node with `H4_SmartSave`.
2. Connect your `IMAGE` pipe.
3. Look for the **🟢 Green LED** on the HUD—that means you're in "Save" mode. If it's **🟡 Yellow**, you're just previewing.
4. Use the `[H]` button (Bottom Left) to summon your history.
5. Use the `[P]` and `[M]` buttons to dive into the data.

---

## Dev Corner (Jargon & Logic)
- **Dimensional Decapitation**: We've mastered the war against "dom-widget.size-full" occlusion. The HUD now maintains absolute authority over its interaction maps by enforcing strict clipping on the native Comfy layers.
- **O(n) History Resolution**: The history endpoint uses `os.scandir` for linear performance, ensuring the filmstrip loads in milliseconds even with massive directories.
- **PNG Chunking**: Metadata is written using standard PIL `PngInfo` blocks (tEXt chunks) for 100% compatibility with other AI tools.
- **HUD Anchor Priority**: The tactical buttons use `z-index` layering to ensure they always respond to clicks first, before the canvas-dragging logic can intercept them.

---
**Vault Status: LOCKED & HARDENED**
*h4 - (b'.')b*
