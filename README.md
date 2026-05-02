# h4_Live
A stateful, loop-friendly utility belt for ComfyUI, built to make workflows feel less like “one-shot vending machines” and more like… actual processes. Keep in mind this is a Massive project and is currently **STILL IN DEVELOPMENT**.

> [!IMPORTANT]
> **STABILITY STATUS**: The core engine and high-impact nodes (especially **H4_SmartSave**) have been transitioned to **STABLE**. While the toolkit is now production-hardened, you may experience occasional lag in external HUD interfaces (History Rail, Comparinator) during heavy backend processing. Current development focus (**WIP**) is centered on the `H4_NodeTranslator` and the `H4_Pythonipulator-inator` kernel extension.

Join our community for support and updates:
**Discord**: [https://discord.gg/hDCHn4aJe5](https://discord.gg/hDCHn4aJe5)

---

## ⚡ TACTICAL PROGRESS REPORT (v10.1.0)
- **H4_SmartSave**: Promoted to **STABLE**. Optimized for surgical canvas sovereignty. Resolved thumbnail desync issues (Lag monitoring ongoing).
- **H4_DeadWeightDetector (D.W.D)**: **NEW RELEASE**. Static graph hygiene engine active. Identify and purge unreachable nodes in real-time.
- **H4_NodeTranslator**: Current **WIP**. Multilingual prompt synthesis and graph-level node type mapping.
- **H4_Pythonipulator-inator**: Current **WIP hardening**. Transitioning to a distributed image kernel with enhanced glitch and geometric primitives.

> [!IMPORTANT]
> **CDE COMPATIBILITY**: This node pack is optimized for the standard ComfyUI web interface. While it functions in **ComfyUI Desktop Edition (CDE)**, the tactical flair, HUD overlays, and advanced terminal visualizers may be degraded or disabled by CDE's sandboxed rendering engine. 
 
---

## Quick links
- [What this is](#what-this-is)
- [Read this first: QoL features (OFF by default)](#read-this-first-qol-features-off-by-default)
- [The “BigBrother” thing (privacy + what it actually does)](#the-bigbrother-thing-privacy--what-it-actually-does)
- [Core concepts (loops, memory, wireless)](#core-concepts-loops-memory-wireless)
- [Node index (jump to any node)](#node-index-jump-to-any-node)
- [Recipes (copyable patterns)](#recipes-copyable-patterns)
- [FAQ](#faq)
- [Troubleshooting](#troubleshooting)
- [Dev Corner (technical deep dive)](#dev-corner-technical-deep-dive)
- [The Book of H4 (In-App Help)](#the-book-of-h4-in-app-help)

---

## What this is
h4_Live is a ComfyUI node pack that adds memory, loop control, traffic routing, context bundling, and a pile of “why the hell doesn’t Comfy already do this?” utilities.

ComfyUI is amazing, but most workflows are basically: generate, forget, done.  
h4_Live makes workflows capable of doing stuff like:
- “First pass, do the heavy work.”
- “Then loop, refine, and improve it a few times.”
- “Change settings each loop.”
- “Compare results.”
- “Run test grids without losing your mind.”

This started as a simple switch node. Then we blinked. Now it’s an ecosystem.

---

## Read this first: QoL features (OFF by default)
### Important reality check
All QoL features ship **OFF by default** now.

There is **no global QoL master toggle** for h4_Live. If you want QoL features, you must enable them **individually** inside ComfyUI’s settings.

Why we do it this way:
- Some people want a clean canvas with zero UI behavior changes.
- Some people are sensitive to extra overlays, snap behavior, or louder errors.
- And honestly, consent matters. Your UI should not get possessed without permission.

### Where to enable them
In ComfyUI Settings, find the h4_Live-related toggles and enable only what you actually want. You will typically need to refresh the page after enabling UI features.

If you cannot find the toggles:
- Make sure the node pack is installed correctly.
- Make sure the frontend extensions are actually loading.
- Check the browser console for extension load messages.

### What you get (when enabled)
Below is the “in painful detail” breakdown of every QoL enhancement. This section is long on purpose, because people deserve to know what they are turning on.

#### 1) Smart node snapping
**What you’ll notice:** nodes “want” to line up when you drag them.
**What it’s for:** clean graphs, less time fiddling, fewer cursed spaghetti canvases.

#### 2) Dynamic I/O coloring
**What you’ll notice:** sockets become easier to read at a glance.
**What it’s for:** preventing dumb mistakes like “why won’t this latent connect to this image thing” at 2:13 AM.

#### 3) Auto-context memory
**What you’ll notice:** settings stick around more reliably between sessions, reloads, or node recreations.
**What it’s for:** reducing repeated setup work.

#### 4) Visual debug overlays
**What you’ll notice:** extra on-canvas visibility into what is happening.
**What it’s for:** debugging without adding five display nodes and praying.

#### 5) Enhanced error reporting (jarring popup warning)
**What you’ll notice:** when something fails, the error dialog might feel… intense. It can be a little shocking the first time because it’s louder and more informative than stock comfy logging.

#### 6) Caffeine Mode (Wake Lock)
**What you’ll notice:** a UI toggle that helps keep your screen awake during long runs. Perfect for long batch runs or overnight grids.

#### 7) Dead Weight Detector (D.W.D)
**What you’ll notice:** a tactical Kirby `(v_v)` button in the toolbar.
**What it’s for:** real-time graph hygiene. Identifies isolated, broken, or bypassed nodes that are wasting canvas space or compute cycles.

---

## Node index (jump to any node)

### Core logic and traffic control
- [H4_TrafficRouter (The Nexus)](#h4_trafficrouter-the-nexus)
- [H4_TrafficMerge (The Zipper)](#h4_trafficmerge-the-zipper)
- [H4_TrafficCop (Legacy Splitter)](#h4_trafficcop-legacy-splitter)
- [H4_StateMonitor (The Scoreboard)](#h4_statemonitor-the-scoreboard)
- [H4_LoopIncrementer (The Clicker)](#h4_loopincrementer-the-clicker)
- [H4_WirelessResetButton (The Red Button)](#h4_wirelessresetbutton-the-red-button)
- [H4_ImageBuffer (The Anti-Lag)](#h4_imagebuffer-the-anti-lag)

### Context and data bundling
- [H4_ContextHub (The Mothership)](#h4_contexthub-the-mothership)
- [H4_ContextUnpack (The Distributor)](#h4_contextunpack-the-distributor)
- [H4_Oxidine (The Sentient Conduit)](#h4_oxidine-the-sentient-conduit)

### Mission control and scheduling
- [H4_MissionControl (The Dashboard)](#h4_missioncontrol-the-dashboard)
- [H4_LinearScheduler (The Ramp)](#h4_linearscheduler-the-ramp)
- [H4_SeedGenerator (Signal Gen)](#h4_seedgenerator-signal-gen)
- [H4_SeedSequencer (Chaos Controller)](#h4_seedsequencer-chaos-controller)

### Gridinator and testing suite
- [H4_Gridinator (The Grid Maker)](#h4_gridinator-the-grid-maker)
- [H4_AxisDriver (Grid Tools)](#h4_axisdriver-grid-tools)
- [H4_Comparinator (A/B Test)](#h4_comparinator-ab-test)

### Data processing and batch tools
- [H4_DataStream (Batch Loader)](#h4_datastream-batch-loader)
- [H4_PixelPress (The Sharpener)](#h4_pixelpress-the-sharpener)
- [H4_Mutate (The Finisher)](#h4_mutate-the-finisher)
- [H4_PixelVisualizer (Diff Inspector)](#h4_pixelvisualizer-diff-inspector)
- [H4_Varianator (The Remix Node)](#h4_varianator-the-remix-node)
- [H4_Switcheroo (Universal Swap)](#h4_switcheroo-universal-swap)
- [H4_VisualTokenizer (Weights)](#h4_visualtokenizer-weights)
- [H4_Pythonipulator-inator (Image Kernel - WIP)](#h4_pythonipulator-inator-the-image-kernel)
- [H4_DoubleSampler (The Two-Pass Engine)](#h4_doublesampler-the-two-pass-engine)

### Face manipulation suite (h4_faceforge/)
- [H4_FaceForge (The Face Swapper)](#h4_faceforge-the-face-swapper)
- [H4_IdentityEngine (The Persona Engine)](#h4_identityengine-the-persona-engine)
- [H4_FaceDetailer (The Texture Fixer)](#h4_facedetailer-the-texture-fixer)
- [H4_BuildFaceModel](#h4_buildfacemodel)
- [H4_LoadFaceModel](#h4_loadfacemodel)
- [H4_SaveFaceModel](#h4_savefacemodel)

### Loaders and file operations
- [H4_UniversalLoader (Skeleton Key)](#h4_universalloader-skeleton-key)
- [H4_CompleteLoader (All-In-One)](#h4_completeloader-all-in-one)
- [H4_MultiImgUpload (The Gallery)](#h4_multiimgupload-the-gallery)
- [H4_SmartSave (STABLE Preview/Save)](#h4_smartsave-previewsave)

### Masking and inpainting
- [H4_ForgeMask (Surgical Suite)](#h4_forgemask-surgical-suite)

### Display and debugging
- [H4_DeadWeightDetector (The Scavenger)](#h4_deadweightdetector-the-scavenger)
- [H4_SmartConsole (X-Ray)](#h4_smartconsole-x-ray)
- [H4_DisplayAny (Universal Monitor)](#h4_displayany-universal-monitor)
- [H4_DocuScribe (Workflow Reporter)](#h4_docuscribe-workflow-reporter)
- [H4_DebugErrorGenerator (Test Only)](#h4_debugerrorgenerator-test-only)
- [H4_Discombobulator (Use with caution)](#h4_discombobulator-use-with-caution)
- [H4_NoteInjector (Visuals)](#h4_noteinjector-visuals)
- [H4_LatentSelector (Resolutions)](#h4_latentselector-resolutions)
- [H4_ModelMerger (Mad Science)](#h4_modelmerger-mad-science)
- [H4_NodeTranslator (Babel Fish - WIP)](#h4_nodetranslator-the-babel-fish)

---

## Nodes (friendly guide, minimal jargon)

### The Book of H4 (In-App Help)
**What it is:** A massive, built-in documentation system inside the node pack itself.
**How to use it:** Look at the top-right of **ANY** h4_Live node. See that little `?` button? Click it. A drawer slides out and explains **everything** about that node.
- **Lore Injection**: The system parses `The_Book_of_H4.json` to provide consistent, narrative-driven documentation.
- **Wireless Access**: The documentation is synchronized across the toolkit, ensuring that any logic change in the backend is instantly reflected in the UI.
- **Viewport Sovereignty**: For advanced nodes like `H4_SmartSave`, the help system integrates with the **Three-Mode Panel System**, allowing help drawers and forensic panels to be **Pinned** or **Popped Out** for persistent reference.

---

### H4_SmartSave (The Forensic Vault)
**Status:** **STABLE**.
**What it is:** The definitive preview and save infrastructure for the h4 toolkit.
**Features:**
- **Three-Mode Panel System (The Book of H4 Edition):**
    - **Mode A: Docked**: Standard behavior. The forensic drawers anchor to the node and move with the canvas.
    - **Mode B: Pinned / Locked**: The drawers detach and lock to the screen edge (left). Includes a "Canvas Margin Nudge" to keep your graph visible.
    - **Mode C: Popout**: The drawers are mirrored into a standalone browser window. Perfect for dual-monitor setups or focusing purely on the canvas while tracking settings.
- **Viewport Sovereignty:** Operates a high-performance visual overlay that does not interfere with canvas interaction.
- **DNA Extraction:** Automatically parses workflow parameters and injects them as forensic metadata into your PNG files.
- **The History Rail:** A non-blocking, infinite scroll sidebar that monitors every generation in real-time. Supports **Pinned Mode** for persistent visibility.
- **Lightbox Sovereignty:** High-resolution image inspection with keyboard traversal (`ArrowKeys`) and telemetry readouts.
*Note: Large history states may cause occasional UI lag during metadata parsing passes.*

---

### H4_DeadWeightDetector (The Graph Scavenger)
**What it is:** A static graph hygiene engine that "Crawls" your workflow to find logical abandoned components.
**How to use it:** Toggle the `(v_v)` button in the toolbar.
**Color Matrix:**
- 🩷 **Hot Pink**: Active Session Error (Intercepted via console).
- 🟡 **Yellow**: Critical logic break (Missing required inputs).
- 🔵 **Blue**: Intentionally Bypassed (Mode 4).
- 🟣 **Fuchsia**: Dead Chain Member (Compute waste leading nowhere).
- 🟠 **Orange**: Terminal Dead End (Disconnected from Save/Preview results).
- 🔴 **Red**: Total Isolation (Floating node, safely deletable).
**Tactical Action:** Use the legend panel to execute a **NUCLEAR PURGE** of all red nodes.

---

### H4_NodeTranslator (The Babel Fish - WIP)
**Status:** **IN DEVELOPMENT**.
**What it is:** An on-the-fly graph transformation engine. It maps unknown node types to H4 equivalents and provides multi-language prompt synthesis for international workflows.

---

### H4_Pythonipulator-inator (The Image Kernel - WIP)
**Status:** **HARDENING PHASE**.
**What it is:** A high-performance image manipulation kernel that combines OpenCV, Pillow, and scikit-image into a single, tactical node.
**Currently Tuning:** Distributed edge detection and the Cyberpunk glitch-engine primitives.

---

### H4_Oxidine (The Sentient Conduit)
**What it is:** The ultimate node-wire declutter tool. An "omniproxy" that bundles all your node connections into a single cable.
**How it works:** It automatically shape-shifts. When KSampler asks for a Model, Oxidine hands it the Model. No more spaghetti.

---

### H4_DoubleSampler (The Two-Pass Engine)
**What it is:** The monster truck of samplers. Handles two-stage generation (Primary + Refiner), prompt transformation (Stutter/Wildcards), and CFG sliding all in one node.

---

### H4_Gridinator (The Grid Maker)
**What it is:** A monolithic node that renders entire X/Y/Z grids in one go. Supports fuzzy model loading and automated ramp scales.

---

### H4_Comparinator (The Final Forensic Utility)
**What it is:** A 3-pane forensic lab for A/B testing and pixel-diffing. Features a sliding reticle, Sniper-Scope magnification, and a telemetry drawer for comparing settings across generations.

---

### Face manipulation suite (h4_faceforge/)
**H4_FaceForge**: Robust all-in-one face swap engine with occlusion-aware handling and micro-detail restoration.

**H4_IdentityEngine**: Extracts and serializes face "DNA" (embeddings) for consistent character creation across sessions.

---

### Frontend extensions (js/)
**H4_BigBrother**: The QoL backbone. Provides node snapping, socket colorization, and enhanced error reporting.
**H4_SovereignCore**: The aesthetic governor. Enforces the H4 visual identity across all custom UI elements.

---

## Version History & Changelog

### v10.1.0 - THE HYGIENE PROTOCOL
*   **Infrastructure Cleanup**: Executed the **'Clean House'** protocol, purging redundant binaries (node.zip) and scratch logic to optimize repository weight.
*   **H4_DeadWeightDetector (v1.0.0)**: Officially released the **D.W.D** graph scavenger. Features BFS backward-crawling for live-set detection and tactical overlay viz.
*   **H4_SmartSave**: Promoted to **STABLE**. Hardened history rail concurrency and resolved final viewport occlusion bugs.
*   **Version Synchronization**: Aligned all modules to the v10.1.0 specification.
*   **Status Update**: Marked NodeTranslator and Pythonipulator-inator as the current active WIP frontiers.

### v9.5.1 - THE KERNEL & HUD HARDENING
*   **H4_Pythonipulator-inator**: Introduced the definitive image manipulation kernel.
*   **H4_SmartSave**: Resolved canvas interaction occlusions and optimized parameter extraction for complex graphs.

---

## License and credits
This is a clean node pack. If you ship it, keep it tidy. If you remix it, be cool about it.

We build weird tools so people can make cool stuff. And also because we got mad at the canvas one night and chose violence.

**Be Your Best**
**h4** - (b^_^)b
---
*Built for the h4_Live Ecosystem. No compromise. No placeholders. Just power.*
