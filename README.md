# h4_Live
A stateful, loop-friendly utility belt for ComfyUI, built to make workflows feel less like “one-shot vending machines” and more like… actual processes. Keep in mind this is a Massive project and is currently **STILL IN DEVELOPMENT**.

> [!WARNING]
> **WIP STATUS ADVISORY**: Some nodes (especially **H4_SmartSave**) are still in a hardening phase. While the core logic is production-stable, certain visual elements like thumbnails in the History Rail may occasionally glitch or desync during heavy backend load. If this happens, a refresh or "Kicking the Grid" usually resolves it.

Join our community for support and updates:
**Discord**: [https://discord.gg/hDCHn4aJe5](https://discord.gg/hDCHn4aJe5)

---

## ⚡ TACTICAL PROGRESS REPORT (v9.5.1)
- **H4_SmartSave**: Upgraded to **+ULTRA Specification**. Full history forensics and DOM sovereignty implemented. (WIP: Thumbnail desync glitches under monitoring).
- **H4_Comparinator**: v3.0 logic finalized. Multi-history deep-diffing and Sniper-Scope magnification active.
- **H4_Pythonipulator-inator**: High-performance image kernel now standard. OpenCV/scikit-image pipeline hardened.
- **Mothership Core**: Dynamic JS harvesting and auto-cleanup active.

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

**How it behaves:**
- While dragging a node, it will gently snap into alignment with nearby nodes.
- It is meant to feel like a helpful nudge, not a cage match.
- If you intentionally place nodes off-grid, it should still let you do that.

**When to disable it:**
- If you do a lot of freeform layout.
- If snapping makes you feel like your mouse is haunted.

#### 2) Dynamic I/O coloring
**What you’ll notice:** sockets become easier to read at a glance.

**What it’s for:** preventing dumb mistakes like “why won’t this latent connect to this image thing” at 2:13 AM.

**How it helps:**
- Inputs and outputs visually signal what kind of data they expect.
- You can detect mismatches before you connect stuff wrong and blame the universe.

**When to disable it:**
- If you prefer the stock ComfyUI look.
- If you find extra color noisy.

#### 3) Auto-context memory
**What you’ll notice:** settings stick around more reliably between sessions, reloads, or node recreations.

**What it’s for:** reducing repeated setup work.

**How it behaves:**
- Remembers certain choices so you do not reconfigure the same stuff constantly.
- Helps when you are iterating fast and your brain is in “keep moving” mode.

**When to disable it:**
- If you do a lot of one-off experiments and want a clean slate every time.
- If you share workflows and want them to open “neutral.”

#### 4) Visual debug overlays
**What you’ll notice:** extra on-canvas visibility into what is happening.

**What it’s for:** debugging without adding five display nodes and praying.

**Typical uses:**
- See what data is flowing.
- Spot obvious “wrong type” or “empty output” problems faster.
- Reduce the “queue, fail, scroll logs, queue again” loop.

**When to disable it:**
- If overlays distract you.
- If you record tutorials and want a clean canvas.

#### 5) Enhanced error reporting (jarring popup warning)
**What you’ll notice:** when something fails, the error dialog might feel… intense.

It can be a little shocking the first time because it’s louder and more informative than stock comfy logging.

**Why we do it anyway:**
- Standard errors often tell you almost nothing useful.
- The enhanced reporting aims to give you the “what, where, why, and what to do next” in one shot.
- It is designed to reduce time-to-fix by a lot.

**What kind of detail it tends to include:**
- Which node failed, and what it was doing.
- What type it expected, and what it got.
- Any relevant state that helps reproduce the bug.

**When to disable it:**
- If you prefer minimal interruption.
- If you are sensitive to aggressive error UI.

#### 6) Caffeine Mode (Wake Lock)
**What you’ll notice:** a UI toggle that helps keep your screen awake during long runs.

**What it’s for:**
- Long batch runs.
- Grids.
- Overnight queues.
- That one time you do 300 steps and forget you live in a world with sleep timers.

**Important notes:**
- It depends on browser support.
- It may turn off if the tab loses focus or the browser decides to be “helpful.”

#### 7) Privacy-aware console sanitization
**What you’ll notice:** logs try to avoid dumping sensitive personal info.

**What it’s for:**
- Screenshots.
- Shared logs.
- Debugging without accidentally leaking your life story.

---

## The BigBrother thing (privacy + what it actually does)
You will see a frontend file named something like `h4_BigBrother.js`. Yes, the name is spicy. No, it is not spying on you.

### What it is
BigBrother is the frontend QoL bundle. It powers things like snapping, overlays, socket coloring, and other UI helpers.

### What it is NOT
- It is NOT silently uploading your workflows.
- It is NOT logging everything you do “in the background” by default.
- It is NOT a telemetry system that phones home.

### The key privacy point
Even if you see BigBrother messages in the console, **it is not actively logging anything sensitive until you explicitly enable the relevant toggles in Settings**.

So:
- Installed does not mean enabled.
- Loaded does not mean “recording.”
- You stay in control.

---

## Core concepts (loops, memory, wireless)
No jargon section, promised.

### Loops
A loop is just: do the workflow, then do it again, using the previous output as the next input.

Why it’s useful:
- First pass creates the idea.
- Later passes refine it.
- You can ramp settings over time.
- You can do controlled experiments without rewiring everything.

### Memory
h4_Live keeps state in a global place so nodes can coordinate.
That means a node can know:
- What loop you are on.
- Whether you “reset.”
- What the last output was.

### Wireless
ComfyUI really does not like cycles in the graph. If you directly wire output back into earlier inputs, it can throw errors because the workflow is supposed to be a DAG, not a snake eating its own tail.

Wireless mode exists to break the physical cycle:
- Store data in memory.
- Retrieve it later.
- Keep the visible graph acyclic.
- Still get true feedback loops.

This is the whole “The Buffer fixes the loop problem” thing. It is not magic, it is just smarter architecture.

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
- [H4_Pythonipulator-inator (The image Kernel)](#h4_pythonipulator-inator-the-image-kernel)
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
- [H4_SmartSave (Preview/Save)](#h4_smartsave-previewsave)

### Masking and inpainting
- [H4_ForgeMask (Surgical Suite)](#h4_forgemask-surgical-suite)

### Display and debugging
- [H4_SmartConsole (X-Ray)](#h4_smartconsole-x-ray)
- [H4_DisplayAny (Universal Monitor)](#h4_displayany-universal-monitor)
- [H4_DocuScribe (Workflow Reporter)](#h4_docuscribe-workflow-reporter)
- [H4_DebugErrorGenerator (Test Only)](#h4_debugerrorgenerator-test-only)
- [H4_Discombobulator (Use with caution)](#h4_discombobulator-use-with-caution)
- [H4_NoteInjector (Visuals)](#h4_noteinjector-visuals)
- [H4_LatentSelector (Resolutions)](#h4_latentselector-resolutions)
- [H4_ModelMerger (Mad Science)](#h4_modelmerger-mad-science)
- [H4_NodeTranslator (The Babel Fish)](#h4_nodetranslator-the-babel-fish)


---

## Nodes (friendly guide, minimal jargon)

### The Book of H4 (In-App Help)
**What it is:** A massive, built-in documentation system inside the node pack itself.

**How to use it:**
- Look at the top-right of **ANY** h4_Live node.
- See that little `?` button? Click it.
- A drawer slides out and explains **everything** about that node. Inputs, outputs, pro-tips, and what the hell "Occlusion Enabled" actually means.

**Why we made it:**
- Because Alt-Tabbing to a wiki sucks.
- Because I (the dev) forget what my own nodes do sometimes.
- It reads from a central "Lore" file that we keep updated with the code.

---

### H4_Oxidine (The Sentient Conduit)
**What it is:** The ultimate node-wire declutter tool. An "omniproxy" that bundles all your node connections into a single cable.

**How to use it:**
- Plug your Model, CLIP, VAE, Positive Prompt, Negative Prompt, and Latent all into one Oxidine node.
- Take the single output noodle from Oxidine and drag it across your massive workflow.
- Plug that single noodle directly into the KSampler's `model`, `positive`, `negative`, and `latent_image` inputs.
- Plug it into VAEDecode's `vae` and `samples` inputs.

**How it works:**
- It automatically shape-shifts. When KSampler asks for a Model, Oxidine hands it the Model. When it asks for Positive conditioning, Oxidine hands it the Positive conditioning. 
- You no longer need 6 different wires crossing your screen like a plate of spaghetti.

---

### H4_DoubleSampler (The Two-Pass Engine)
**What it is:** The monster truck of samplers. It handles two-stage generation (Primary + Refiner), prompt transformation, and CFG sliding all in one node.

**How to use it:**
- **Stage 1 (Primary):** Set your base steps and sampler. This is where the heavy lifting happens.
- **Stage 2 (Refiner):** Toggle this ON to enable a second pass. It uses the output of Stage 1 and refines it with a new sampler, scheduler, and denoise setting. Perfect for that "0.35 denoise finish" without adding another node.
- **Sentient Prompting:** If you plug in a `CLIP` and use the `positive_text` input, you unlock the **Stutter** and **Wildcard** systems.
  - **Prompt Stutter:** Randomly repeats words to put extreme emphasis on them.
  - **Wildcards:** Use `__keyword__` in your text and define them in the `wildcard_text` box (e.g. `blue=red`).

**Advanced Features:**
- **CFG Sliding Scale:** Enable this to transition from one CFG value to another over the course of the steps.
- **Seed Variation:** Adds chaos to your generation by mixing seeds (WIP).
- **Auto-UI:** Stage 2 settings hide themselves when the toggle is OFF, keeping your graph clean.

---

### H4_TrafficRouter (The Nexus)
**What it is:** The Grand Central Station of your workflow. It decides what data goes into your KSampler based on whether you are starting fresh or looping.

**The Knobs:**
- **first_denoise (Default 1.00):** This is for your "Creation" pass. Usually, you want 1.0 to let the model hallucinate freely from noise.
- **loop_denoise (Default 0.45):** This is for your "Refinement" passes. You lower this so the model doesn't destroy what it just built. It tweaks, it doesn't wreck.
- **restart (Bool):** The "Reset the Universe" button. If TRUE, the loop count goes back to 0. If FALSE, we march forward into infinity.
- **first_run_in**: Connect your Latent/Image/Model from the *start* of the workflow here.
- **loop_run_in**: Connect the output from the *end* of your loop here.

**How it works:**
- **Loop 0 (First Run):** It passes `first_run_in` and outputs `first_denoise`.
- **Loop 1+ (The Grind):** It passes `loop_run_in` and outputs `loop_denoise`.
- It handles the switching so you don't have to manually mute/unmute nodes like a caveman.

---

### H4_TrafficMerge (The Zipper)
**What it is:** The Router's slightly smarter, safer cousin. It's designed specifically to avoid ComfyUI's "Cycle Detected" errors which are the bane of my existence.

**The Input Trap (Read this):**
- **first_run_in**: Wire your starting data here.
- **loop_input**: **DO NOT WIRE THIS.** I repeat, do not put a wire here if it comes from later in the graph. That creates a cycle.
  - **The Magic Trick:** Leave `loop_input` EMPTY. The node will automatically check the **H4_ImageBuffer** wirelessly. It teleports data from the end of the graph back to the start without a visible wire. This keeps ComfyUI happy and prevents the red/pink error screen of death.

**The Knobs:**
- Same as Router (`first_denoise`, `loop_denoise`, `restart`).
- **Type Safety:** It memorizes what type of data you passed in Run 0 (e.g., LATENT). If Run 1 tries to send an IMAGE, it screams at you. This prevents those silent failures where your KSampler explodes because you fed it pixels instead of math.

---

### H4_TrafficCop (The Legacy Splitter)
**What it is:** A simple fork in the road.
**Why:** Sometimes you don't need Denoise control. You just want "Input A goes here on start, and Input B goes here later".
**The "Safe Mode":** This node refuses to output `None`. If a path is inactive, it sends duplicate data anyway. This prevents "Missing Input" errors downstream. It's the training wheels of logic gates.

---

### H4_StateMonitor (The Scoreboard)
**What it is:** A text readout of the current Loop Count found in the system memory.
**Why:** Because debugging invisible logic is hell. Connect this to see if you are actually looping or just stuck on "Run 0" forever.
**Daisy Chaining:** It has an optional pass-through input. Connect your Logic node here to force the Monitor to execute *after* the logic decides the count.

---

### H4_LoopIncrementer (The Clicker)
**What it is:** The thing that makes the number go up.
**Why:** A Router routes, but it doesn't always increment. Sometimes you want to increment manually or at a specific point in the chain.
**Wireless Reset Support:** If the "Wireless Reset" toggle is ON, it listens for a distress signal from the **H4_WirelessResetButton**. If it hears one, it resets the count to 0 instantly.

---

### H4_WirelessResetButton (The Red Button)
**What it is:** A toggle to nuke the loop count.
**Why:** You are 50 loops deep into a render and it looks like garbage. You want to restart. You don't want to find the Router and toggle its widget. You just flip this button anywhere on the canvas.
**How:** It sets a global flag in Python memory. The **LoopIncrementer** sees it and executes the restart order.

---

### H4_ImageBuffer (The Teleporter)
**What it is:** The MVP of loop workflows.
**What it does:** It takes any data (Image, Latent, Text, Model) and stores it in your RAM.
**Why this exists:**
- ComfyUI is a Directed Acyclic Graph (DAG). Loops are Cycles. Cycles are illegal.
- **The Cheat:** The Buffer breaks the cycle. It saves data to RAM in "Write Mode". In the next execution, the **TrafficMerge** reads that data from RAM. No wire connection = No cycle error = Happy ComfyUI.
- **Usage:** Place this at the VERY END of your loop. Feed it the final result. Leave the output unconnected (or connect it to a preview). It handles the storage silently.

---

### H4_ContextHub (The Mothership)
**What it is:** The infinite bag of holding for your data.
**The Problem:** You have a Model, VAE, CLIP, Positive, Negative, Latent, and Image. You need to pass them to 5 different KSamplers. That's 35 wires. You are creating a spaghetti monster.
**The Solution:** Wire them ALL into the Hub once. It bundles them into a single `H4_PIPE` cable. Now you route ONE wire to your destination.
**Inputs:**
- **Standard Types:** Model, VAE, CLIP, Positive, Negative, Latent, Image, Mask.
- **Any_A / Any_B:** Two mystery slots for whatever weird custom data you need (ControlNet stack? LoRA stack? A string? Your hopes and dreams?).
- **base_pipe:** Daisy-chain support. Plug an existing pipe here to add to it or override it.

---

### H4_ContextUnpack (The Loot Piñata)
**What it is:** The thing that opens the bag.
**How to use:** Plug the `H4_PIPE` in one side. All your individual data comes out the other side.
**Why:** Use Hub at the start. Use Unpack at the end. Keep the middle clean. If you wire a pipe into a KSampler without unpacking it first, nothing happens because KSamplers don't speak H4.

---

## Mission control and scheduling

### H4_MissionControl (The Dashboard)
**What it is:** The cockpit for your loop workflow.
**Modes:**
- **Passive (Default):** It sits there and looks pretty. It passes signals but does NOT increment the loop count. Use this if you have a separate `LoopIncrementer` elsewhere.
- **Active (Master Base):** This Node is CAPTAIN. It increments the global loop count every time it runs. **WARNING:** Do not have two Active nodes in one workflow or your loop count will jump by 2, 3, 4... and you'll be confused.
- **wireless_reset (Bool):** If ON, it listens for the `WirelessResetButton`.
- **debug_mode (Bool):** If ON, it spams your console with logs. Use only if you are desperate.

**Passthrough Ports:**
- `scheduler_val` and `scheduler_seed` are just inputs that pass through to the output. Why? So you can bundle your control signals into one tidy node before sending them out to the rest of the graph.

---

### H4_LinearScheduler (The Ramp)
**What it is:** A mathematical ramp generator.
**The Math:** `Start + (End - Start) * (Current_Loop / Max_Loops)`
**Why you need it:**
- **Denoise Ramps:** Start at 1.0 (Creation) and ramp down to 0.1 (Refinement) over 10 loops.
- **CFG Ramps:** Start low and ramp high to "tighten" the image as it converges.
- **Inputs:**
  - `start_val`: Value at Loop 0.
  - `end_val`: Value at the final loop.
  - `max_loops`: How long the ramp lasts. If you keep looping past this, it stays at `end_val`.

---

### H4_SeedGenerator (The Chaos Engine)
**What it is:** Controls the sophisticated random number generation for your loops.
**Modes:**
- **Incremental:** (Start Seed + Loop Count). Run 0 uses Seed X. Run 1 uses Seed X+1. This gives you *deterministic variation*. Great for making animations that don't jitter like a strobe light.
- **Fixed:** Always outputs `start_seed`. Boring, but useful for testing logic without the variable changing.
- **Random:** Pure chaos. New seed every time, unrelated to the loop count. Use this when you are just exploring.

---

## Display and debugging

### H4_SmartConsole (The MRI Machine)
**What it is:** A node that looks *inside* your data and prints a report.
**Inputs:**
- **Anything In:** Wire literally anything here.
- **+ULTRA Mode (Bool):**
  - **OFF (False):** Prints basic info like "Tensor Shape [1, 512, 512, 3]" or "String: 'Hello'".
  - **ON (True - Nuclear Mode):** It rips the object apart. It lists attributes, internal methods, min/max values for tensors, mean values, memory addresses, and basically deconstructs the matrix. Use this when you have a `KeyError` and don't know why. It prints to the system console (the black window) AND shows a summary on the node itself.

---

### H4_SeedSequencer (The Chaos Controller)
**What it is:** A smarter, state-aware seed generator.
**Why use it over the basic Generator?**
- **State Memory:** It remembers what it did last time.
- **Random Digits:** You can tell it "Give me a random seed, but only 4 digits long". Why? Because `9352` is easier to read and type than `352859205820582`.
- **Auto-Advance:** It can increment automatically independent of the global loop count. Useful if you want to hold a seed for 3 loops, then switch.

---

## Gridinator and testing suite

### H4_Gridinator (The Grid Maker)
**What it is:** A monolithic node that renders entire X/Y/Z grids in one go.
**Why:** Because wiring up 50 KSamplers to make a 10x10 grid is insane.
**The Feature List:**
- **Fuzzy Loading:** Type "ponym" in `base_model_fuzzy` and it figures out you mean `PonyDiffusion_v6_XL.safetensors`.
- **Prompt Stutter:** Use syntax like `[cat*3]` to repeat a word 3 times for emphasis.
- **Permutations:** Use `{red|blue|green}` to automatically split the batch into 3 variations.
- **The Axes (X/Y/Z):**
  - **Modes:** Model, LoRA, Steps, CFG, Denoise, Sampler, Scheduler, Seed.
  - **Overrides:** The text boxes allow comma-separated values (e.g., `20, 30, 40`).
  - **Fuzzy Overrides:** You can type "juggernaut, pony, animagine" in the Model Override box and it loads them all sequentially.
- **Sliding Scales:** Enable this to auto-generate ranges (e.g., Denoise 0.2 to 0.8 over 10 frames) without typing the numbers.

**The Output:** A nice, labeled grid image with headers, margins, and readable text.

---

### H4_AxisDriver (The Sidekick)
**What it is:** A helper node for the Gridinator.
**Usage:**
- It allows you to build complex axis configurations (Preset lists) and feed them into the Gridinator as a JSON blob.
- Mostly used if you are creating a "Preset Bank" of grids (e.g., "My Standard Render Test").
- You likely won't touch this manually unless you are a cyborg.

### H4_Comparinator v3.0 (The Final Forensic Utility)
**What it is:** The bastard child of a lightbox, a diff viewer, and a forensic lab. It lets you compare two images with a sliding reticle, zoom in to see atomic-level defects, and crawl the graph to see exactly how you messed up your settings. Now nuclearly re-engineered into the **V3.0 specification** for multi-history deep-diffing.

**The Inputs:**
- **image_a**: The "Control" or "Before" image. Usually your latest generation (The Live Slot).
- **image_b**: The "Test" or "After" image. If empty, it automatically pulls from your vault history.
- **frozen_image**: If connected, this overrides Image B. Useful if you want to lock a specific "Gold Standard" while you iterate on new variations.
- **save_mode**: If ON, it commits your captures to disk. If OFF, it’s just for looking pretty.

**The Interface (V3.0 Features):**
- **Compare Mode (Slider):** A red line splits the screen. Drag it. Left is A, Right is B. It's fluid, lag-free, and addictive. Tap **Spacebar** to toggle visibility of Pane 2 instantly for 'Blink' testing.
- **Inspectinator Mode:** Toggle this switch to engage the **Sniper Scope**. Points a reticle on the Navigator (left), shows a magnified view on the Magnifier (right). The reticle itself has internal magnification optics (V3.0) for high-precision diagnostic hunting.
- **Histories Mode:** The dual-pane vault. Compares your latest generation against your Green selection in Pane 1, and your Green selection against your Red selection in Pane 2. Total temporal coverage of your creative process.
- **Telemetry Drawer:** The "How did I make this?" panel. It separates **PROMPT SPECS** (Models, VAEs, CLIPs, LoRAs) from **GENERATION SETTINGS** (Seed, CFG, Denoise) for instant forensic analysis.

**History Strip (Tri-State Workflow):**
- **Left Click**: Selects image as **GREEN (Primary)**. Anchor for A/B testing.
- **Right Click**: Selects image as **RED (Secondary)**. Used in Histories mode.
- **Shift + Right Click**: **LOCK (Yellow)**. Persistent across sessions.
- **Right-Click Background**: Atomic Reset. Clears all selections and returns to single-pane mode.

**Why use it:**
- because "eyeballing it" is for amateurs.
- because you need to track convergence across 50 generations.
- because the Sniper Scope makes you feel like a data-assassin.

---

## Data processing and batch tools

### H4_DataStream (Batch Loader)
**What it is:** folder-based batch loader that auto-queues.

**What it does:**
- Load a folder.
- Hit Queue once.
- It processes files sequentially and keeps queueing for you.

**When to use it:**
- Batch edits.
- Face pipelines.
- Any repetitive folder job where clicking Queue 50 times feels like punishment.

---

### H4_PixelPress (SSAA/HDR)
**What it is:** The "Retina" engine.

**What it does:**
- **Supersampling**: Scales up (2x/3x/4x) -> Sharpens -> Scales down.
- **HDR**: optional dynamic range expansion (Shadows/Highlights).

**When to use it:**
- When you want dense, tailored details without aliasing.
- To fix lighting on bland images.

---

### H4_PixelVisualizer (Diff Inspector)
**What it is:** a pixel-level difference analyzer that shows you exactly what changed between two images.

**What it does:**
- Takes Image A (original) and Image B (processed) and produces four outputs:
  1. **Heatmap**: A black image where identical pixels stay dark, and differing pixels glow. The brighter the glow, the bigger the change. Use `heatmap_scale` to amplify subtle differences.
  2. **Side-by-Side**: A composite image showing A on the left and B on the right, stitched together.
  3. **Image A**: Passthrough of the original.
  4. **Image B**: Passthrough of the processed image.

**Settings:**
- `heatmap_scale`: Default 5.0. Range 0.0 to 100.0. Higher values make even tiny differences visible. At 5.0, you'll see obvious changes. At 50.0+, you'll catch sub-pixel differences that are invisible to the naked eye.

**When to use it:**
- After running H4_PixelPress (SSAA/HDR) to verify the enhancement is actually doing something.
- Comparing two different sampler outputs to see where they diverge.
- Debugging "these images look identical" situations, the heatmap will prove they are not.
- Quality control on face swaps to see exactly where blending occurs.

**How to read the heatmap:**
- Pure black = identical pixels. No change.
- Dim glow = very subtle differences (color grading, slight noise).
- Bright glow = significant changes (sharpening, HDR, face swap regions).
- If the heatmap is completely black at scale 5.0, your processing node genuinely did nothing.

**Resolution mismatch handling:**
- If Image A and Image B have different resolutions, Image B is automatically resized to match A using bilinear interpolation before comparison.

---


### H4_Varianator (The Remix Node)
**What it is:** A jazz musician in node form. It takes a latent image and "riffs" on it to create variations.
**The Problem:** You have a generation you like, but the eyes are weird or you want to see if it looks better with slightly different noise.
**The Solution:** Feed it to the Varianator.
**The Knobs:**
- **variation_count:** How many remixes do you want? (1-16).
- **variation_profile:**
  - **Minimal:** Subtle changes. Good for fixing small defects or shifting expression.
  - **Moderate:** The standard riff. Noticeably different but keeps the soul of the original.
  - **Major:** Heavy improvisation. Might change the composition entirely.
- **seed_mode:**
  - **Fixed:** Riffs the same way every time.
  - **Increment:** Each variation uses a new seed (Start, Start+1, Start+2). **Recommended**.
  - **Random:** Total chaos.
- **denoise:** The strength of the riff. Lower = closer to original. Higher = more drift.

**Output:** A batch of images. Feed this into `H4_Comparinator` or a `Grid` to pick the winner.

---

### H4_Switcheroo (The Universal Swap)
**What it is:** The last find-and-replace node you'll ever need. Drop this into your workflow and swap out any word, phrase, or token in your prompt without touching the original text node.

**How to use it:**
- Wire your raw **STRING** prompt (the gray wire, NOT the orange CONDITIONING wire) into the `subject` input.
- Set `swap_count` to however many find/replace pairs you need (up to 10).
- Type your target words into `find_1`, `find_2`, etc.
- Type your replacements into `replace_1`, `replace_2`, etc.
- Optionally connect a `CLIP` model if you want Switcheroo to re-encode the modified text back into CONDITIONING.

**Features:**
- **Visual Terminal HUD:** See the exact modified prompt right on the node.
- **Case Sensitive toggle:** Match exactly or match any case.
- **Wiring Fault Interceptor:** Detects if you accidentally wired CONDITIONING and warns you.
- **Auto CLIP re-encode:** Wire a CLIP and get CONDITIONING directly — skip the extra CLIPTextEncode node.

**Example:** Prompt is `solo, 1girl, standing, sunset`. Find `1girl`, Replace `1boy` → Output: `solo, 1boy, standing, sunset`.

---

## Image enhancement and visuals

### H4_PixelPress (The Sharpener)
**What it is:** A True Supersampling (SSAA) node.
**How it works:**
1. **Upscale:** It blows your image up (2x, 3x, or 4x) using a model or Lanczos.
2. **Enhance:** It applies High Dynamic Range (HDR) tonemapping, shadow recovery, and sharpening at this massive resolution.
3. **Downscale:** It squashes the image back down to the original size using Lanczos.
**The Result:** Impossible details. Aliasing is destroyed. Lighting pops. It looks like an 8K photo shrunk down.
**The Knobs:**
- **supersample_scale:** 2x is usually enough. 4x is for heavy VRAM users.
- **sharpness:** Post-downscale sharpening. 0.3 is the sweet spot.
- **enable_hdr (Bool):** Turns on the magic sauce.
  - **hdr_intensity:** How much "pop" to add.
  - **shadow_intensity:** Recovers details in the dark areas.
  - **highlight_intensity:** Tames blown-out lights.
  - **gamma/contrast:** Fine-tuning.
- **tiled_processing:** **KEEP THIS ON.** Unless you have 48GB VRAM, processing a 4096x4096x4 (64MP) image in one go will crash your PC. Tiling saves lives.

**Warning:** This node is slow because it does a LOT of math. Use it at the end of your workflow, not during the sketch phase.

---

### H4_Mutate (The Finisher)
**What it is:** The all-in-one post-processing beast. It takes an image in and pushes a mutated image out.
**Why you need it:**
- Because you want to color grade without opening Photoshop.
- Because you generated the perfect composition, but you want to steal the color palette or texture from another image.
- Because you want to add cinematic vignettes, 35mm film grain, or bloom to give it that "finished" look.

**The Drawers (Toggle what you need):**
- **Color Grade:** Hue, saturation, contrast, temperature, and gamma.
- **Sharpness:** Make those pixels punch. Includes radius control.
- **Upscale:** Quick resize (up to 4x or downscale) using proper methods like Lanczos or Mitchell.
- **Style Transfer:** This is the big one. Plug in up to 4 'Style' images and transfer their look onto your main image. Supports dumb color swapping (Reinhard) and actual neural texture cloning (AdaIN, WCT). Includes multi-image blending (e.g., Mix Image A at 50% and Image B at 50%).
- **Film & Grain:** Emulate 11 classic film stocks like Portra 400 or Velvia 50. Add monochrome or color grain.
- **Vignette:** Add moody darkened edges to draw the eye.
- **Effects:** Bloom (glow), chromatic aberration, and posterization.

**Dev Corner:**
* Architecture: Drawer-based, compute-on-demand widget layout. The node spawns strictly with essential connection points. JS listeners dynamically manifest widget arrays and additional `IMAGE` input sockets based on active booleans and existing connections.
* Pipeline Orchestration: An ordered dictionary enforces execution sequencing across `processors.py`, ensuring destructive functions (upscaling/sharpening) respect color-space or FFT-based frequency modifications. A `custom` pipeline order parses priority IDs directly via state management.
* Style Transfer Engines: Fully independent of the `ComfyUI` diffusers execution context. Employs mathematically optimal transport (sliced Wasserstein distance), frequency domain FFT texture swap, and `torchvision` VGG19 feature extraction for AdaIN and Whitening-Coloring Transforms (WCT). SVD functions include a `try/except` guard with an AdaIN failback pattern for degenerate matrices.

---

### H4_Pythonipulator-inator (The image Kernel 🐍)
**What it is:** A high-performance image manipulation kernel that combines OpenCV, Pillow, and scikit-image into a single, tactical node.

**What it does:**
- processes images through a category-based pipeline: **Cyberpunk**, **Geometric**, **Color**, **Blur**, **Stylistic**, **Noise**, and **Edge detection**.
- Features a dynamic cabinet UI—only sliders for the effects you actually enable are visible.
- Includes a built-in **Save Engine** so it can act as your final output node.

**When to use it:**
- To add chromatic aberration or glitch effects.
- To flip, rotate, or resize your canvas without adding extra nodes.
- To sharpen edges or add film grain for that "finished" look.

**Dev Corner:**
* Architecture: Drawer-based widget surfacing. The internal pipeline follows a strict execution order (`CB -> Geo -> Color -> Blur -> Noise -> Style -> Edge`) to ensure mathematical consistency.
* Dependency Sentinel: Lazily initializes library imports. If CV2 or scikit-image is missing, it triggers an automated 'Tactical Deployment' (pip install) to resolve the environment.

---

### H4_NoteInjector (Visuals)
**What it is:** Adds a title bar to your image.
**Why:**
- To label your grid tests.
- To create meme formats.
- To add "Cinematic Black Bars" with text.
**Features:**
- Top or Bottom placement.
- Auto-centering.
- Configurable fonts (Arial, Roboto, or falls back to ugly default if missing).
- Separate resizing for Title and Subtitle.

---

### H4_PixelVisualizer (Pixel Peeper)
**What it is:** A simple node that explodes an image into its raw pixel values.
**Why:** Mostly for debugging or for people who like to look at RGB hex codes instead of art.
**Usage:** Connect an image, see the color data distribution.

---

### H4_VisualTokenizer (The Mind Reader)
**What it is:** A debugging tool that shows you exactly how the prompt is processed and tokenized.
**Why use it:**
- To see why your prompt is being ignored.
- To visualize weights: `(cat:1.2)` shows up as a heavier bar.
- To see the "End of Text" token cutting off your 200-word essay.

---

## Model merging and saving (Mad Science)

### H4_ModelMerger (The Frankenstein Lab)
**What it is:** A granular model merger that lets you blend up to 3 models with surgical precision.
**The Feature List:**
- **Block Merging:** You can merge just the input blocks of Model A with the output blocks of Model B.
- **Granular Weights:** There are 25 knobs per model (IN00-IN11, MID, OUT00-OUT11). You can map the "Soul" (Middle Block) of PonyXL into the "Body" (Output Blocks) of Juggernaut.
- **Interpolation Modes:** Weighted Average, Symmetric Average, Add Difference, etc.
- **Live Testing:** It has a built-in generator. You can test the merge *before* saving it.
- **Safety:** It prevents you from merging SD1.5 with SDXL and creating a black hole.

**Warning:** This node is complex. If you don't know what "IN05" does, leave it at 1.0 or read a guide.

### H4_ModelSave (The Librarian)
**What it is:** Saves your merged monstrosities to disk.
**Why use it over the standard Save Node?**
- **Architecture Aware:** It knows the difference between SD1.5, SDXL, and Flux. It keys the weights correctly so you don't get "Keys missing" errors when loading it back.
- **Float16 Casting:** Automatically casts to fp16 to save space (unless you really want fp32).
- **Metadata:** Injects your prompt and workflow into the checkpoint header.

---
## Latents and Aspect Ratios

### H4_LatentSelector (The Canvas)
**What it is:** A resolution calculator and empty latent generator.
**Why:** Because calculating `1024 * (16/9)` in your head is annoying.
**Features:**
- **Presets:** 16:9 Cinema, 9:16 Story, 1:1 Square, and more.
- **Model Aware:** Adjusts baseline pixels for SD1.5 (512px) vs SDXL (1024px) vs Wan (720p).
- **Batch Size:** Crank it up if you have the VRAM.

---

## Face manipulation suite (h4_faceforge/)

### H4_FaceForge (The Face Swapper)
**What it is:** A robust, all-in-one face swap engine that doesn't look like a 2005 video game.
**The Pipeline:**
1.  **Swap:** Uses InsightFace to map the source face onto the target.
2.  **Restore:** Uses CodeFormer/GFPGAN to fix the "melted wax" look.
3.  **Upscale:** Resizes the face crop for high-res detailing.
4.  **Blend:** Feathers the edges so it doesn't look like a mask sticker.
5.  **Occlusion Handling:** Tries (emphasis on *tries*) to keep hair and glasses in front of the face.

**Pro Tip:** If your face looks like a potato, turn *up* the formatting, but turn *down* the restoration strength.

### H4_IdentityEngine (The Persona Engine)
**What it is:** It extracts the "essence" of a face (embeddings) and saves it for later.
**Why:**
- Stop re-analyzing the same 5 photos of Elon Musk every time you run a generation.
- Build a "Consistent Character" bank.
- Mix face embeddings (50% Dad, 50% Mom) using **H4_BuildFaceModel**.

### H4_FaceDetailer (The Texture Fixer)
**What it is:** A texture hallucinator.
**Why:** Face swaps are smooth. Real skin has pores. This node adds the pores back.
**How:** It runs a second pass (img2img) on just the face area with a low denoise (0.2-0.3) to adding texture noise.

---

## Loaders and utilities

### H4_UniversalLoader (The Skeleton Key)
**What it is:** The only loader you need.
**What it loads:**
- **Checkpoints:** Standard `.safetensors` (SD1.5, SDXL, Flux).
- **Components:** Individual UNETs, CLIPs, and VAEs.
- **GGUF:** Yes, it auto-detects GGUF format and bridges to `ComfyUI-GGUF` internally.
- **Wan/Z-Image:** It has specific heuristics to detect Wan2.1 and Z-Image models and load them correctly (handling the weird 2560 vs 4096 dim mismatch).
**Why use it:** because wiring up 4 different loader nodes for testing is for chumps.

### H4_CompleteLoader (All-In-One)
**What it is:** The Universal Loader on steroids. Everything the standard loader does, plus built-in image upload slots.

**Features:**
- Loads checkpoints, UNETs, CLIPs, VAEs, and LoRAs.
- **Plus** up to 4 image upload slots with individual IMAGE outputs.
- Inherits all UniversalLoader intelligence (GGUF detection, Wan/Z-Image heuristics).

**When to use it:** When you need models AND reference images in one node instead of cluttering your canvas with separate loaders.

---

### H4_MultiImgUpload (The Gallery)
**What it is:** A pure image batch loader with up to 10 dynamic upload slots.

**How to use it:**
- Upload images. New slots appear as you fill them.
- Each slot produces a paired IMAGE and MASK output.

**When to use it:**
- Style transfer workflows needing multiple reference images.
- Batch processing with different input files.
- Any time you need more than 4 images without model-loading overhead.

---

### H4_NodeTranslator (The Babel Fish)
**What it is:** A frontend-only node that translates the UI.
**Usage:**
- Select "Spanish", "Mandarin", or "German".
- It doesn't touch the backend. It just renames the widgets and titles in your browser so you can work in your native tongue.
- *Note:* WIP. Don't expect perfect grammar.

### H4_DisplayAny (The Universal Monitor)
**What it is:** A debug node that accepts *anything* (Images, Latents, Tensors, Text, Lists) and displays it.
**Why:**
- Wiring up a `PreviewImage` node just to check a mask is annoying.
- Wiring up a `TextOutput` node just to check a string is annoying.
- This node takes them all. It adapts. It overcomes.

### H4_DataStream (The Feed)
**What it is:** A sequential image/video loader.
**Usage:**
- Point it at a folder.
- Set index to 0.
- Enable `auto_queue_remaining`.
- Press Queue.
- **Result:** It processes every image in the folder one by one, automatically queuing the next job until the folder is empty.
**Bonus:** It also plays video files frame-by-frame if you point it at an `.mp4`.

---

## Debug and stealth nodes (Use at your own risk)

### H4_DebugErrorGenerator (The Crash Test Dummy)
**What it is:** It crashes ComfyUI on purpose.
**Why:** To test if your error handling / "Death Modal" is working.
**Modes:** Minor, Warning, Critical.

### H4_ForgeMask (The Surgical Suite)
**What it is:** A premium interactive masking tool built directly into your ComfyUI node. Paint, erase, and lasso your masks without leaving the canvas.

**How to use it:**
- Connect an IMAGE to the node.
- Select a tool from the left rail: **Brush (B)**, **Eraser (E)**, **Lasso (L)**, or **Shape (S)**.
- Adjust brush size with the vertical slider.
- Paint directly on the image. White = areas that WILL be changed.
- Click **SEND MASK** to package your mask and auto-queue.

**Settings:**
- `mask_blur`: Edge softness (4-8 recommended for natural blending).
- `mask_strength`: Opacity of the mask (1.0 = full strength).
- `mask_expansion`: Grow/shrink the mask after painting.
- `invert_mask`: Flip the selection (protect painted areas instead).

**Why use it:** Because Alt-Tabbing to Photoshop to make a mask is a workflow killer. This does it inline, in real-time, with zero friction.

---

### H4_Discombobulator (The Glitch)
**What it is:** A UI scrambler.
**Why:** Because I was bored and wanted to see if I could make the interface look like the Matrix.
**Effect:** It intercepts notifications and turns them into leet speak or binary. Does nothing to your images. Just messes with your head.


---

### H4_SmartSave (The Vault — +ULTRA Edition)
**Version:** v24.14.39 (The **+ULTRA Edition**), rebuilt from the ground up to handle high-performance, ghost-free canvas interactions and deep forensic backtracking.

**The +ULTRA Edition Standard (v24.14.39):**
- **Recursive Forensic Crawler**: No wire telemetry. The node autonomously crawls your workflow graph backwards to find every Sampler, Model, CLIP, and VAE.
- **Nested Tier-2 Detail Drawers**: Clicking node cards in the [P] (Parameters) list slides out secondary detail HUDs with raw widget values.
- **Viewport Sovereignty**: Aggressive DOM synchronization ensures UI elements are only rendered when the node is actively in the viewport and at an interactive zoom level (>0.35).
- **Shadow Banishment Protocol**: Native widgets are physically banished to -9999px, granting the H4 Sovereign HUD absolute authority over the visual real estate.
- **LOD Guard (Visibility Floor)**: Collapses into high-visibility "H4" tactical icon when zoomed out, preventing canvas interaction lag.
- **Lightbox Traveler v3**: Full-screen preview with keyboard navigation (Arrows), pan, and 500% high-fidelity zoom.

**HUD Controls:**
- **[H] History Button**: Summon the high-performance filmstrip of your generation journey.
- **[P] Parameters Drawer**: Display the Workflow DNA gathered by the intelligence engine.
- **[M] Metadata Drawer**: Manual overrides for Author, Model, and **Universal JSON** injection.

**Why use it:**
- because "eyeballing it" is for amateurs.
- because you want to audit your past self's decisions without opening the PNG Info tab.
- because you value **interaction authority** and a clean workspace.

> [!CAUTION]
> **DEVELOPMENT NOTICE**: SmartSave history synchronization is currently under heavy optimization. You may experience transient thumbnail flickering or "Blank Frames" in the history rail during rapid multi-batch generations. The forensic metadata itself is preserved accurately; this is a purely visual desync.


---

## Display and debugging

### H4_SmartConsole (X-Ray)
**What it is:** an inline debugger.

**Modes:**
- Normal: basic info.
- ULTRA: nuclear inspection, min/max, attributes, internal structure.

Use ULTRA when you are ready to suffer, but also ready to actually fix the problem.

### H4_DisplayAny (Universal Monitor)

### H4_DocuScribe (The Stenographer)
**What it is:** Generates automatic markdown documentation from your workflow.
**How:** Connect nodes to its 'source' inputs. Run the workflow. It crawls the connections and writes a report to your output folder detailing every connected node, its settings, and its class type.
**Why:** The "help I need to explain this to future me" node. Perfect for generating changelogs or explaining complex graphs to others.

---

### H4_NoteInjector (Visuals)
**What it is:** adds professional title bars to images.

**Features:**
- Top/Bottom bars.
- Auto-centering for Title/Subtitle.
- Custom fonts and colors.

**When to use it:**
- Memes.
- Workflow documentation.
- "Cinematic" subtitles.

---

---

### H4_NodeTranslator (The Babel Fish)
**What it is:** Real-time translation for ComfyUI.

**What it does:**
- Translates **Node Titles** and **Widget Labels** into your language (Spanish, Mandarin, German, etc.).
- Does NOT break the backend (internal variable names stay English).
- Visual-only layer that sits on top of the UI.
- Currently marked as **(WIP)** but functional-ish.

**Why:**
- Because nodes should not be a language test. (or at least I hope not)
- Because comfyui should be accessible to everyone reagardless of language 
- Because Sometimes I dont wanna goto google translate to understand what was on the node

---

### H4_DebugErrorGenerator (Test Only)
Intentionally throws errors to test error handling.

---

### H4_Discombobulator (Use with caution)
Hidden stealth node, purpose redacted from console output.

Yes, it’s weird. Yes, it’s on purpose. No, we are not explaining it in the friendly section. Not today.
Just use it - it has no other purpose than what it does , it does not reflect, act or touch your 
wf , it just discombobulates you ^_^ 
---

### H4_LatentSelector (Resolutions)
**What it is:** Stop memorizing pixel dimensions.

**What it does:**
- You pick "SDXL" and "Portrait".
- It gives you `896 x 1152` (or whatever the optimal latent size is).
- It outputs an empty latent, width/height ints, and an empty image for referencing.

**Why:**
- Because I am tired of looking up "SD 1.5 landscape optimal resolution" on Google.

---

### H4_ModelMerger (Mad Science)
**What it is:** A checkpoint merger that treats models like data, not just weights.

**Features:**
- **Smart Tiling**: If you test a merge, it doesn't generate a crappy 512x512 preview that lies to you. It runs a proper tiled decode so you can see if the eyes are haunted.
- **Fail-Safe Decode**: If the VAE explodes (NaNs, black squares), it catches it, prints a readable error, creates a red "ERROR" image placeholder, and keeps the workflow alive so you can adjust ratios and try again.
- **Visual Ratios**: Sliders for every block.
- **Metadata Inspection**: Actually checks if you are merging SDXL with 1.5 and warns you before you create a monstrosity.

---

## Recipes (copyable patterns)
### 1) First-pass create, then refine loop
Goal: loop over refinement without rewiring.

Basic idea:
- Use **H4_TrafficRouter** to choose starter vs loop input.
- Use **H4_MissionControl** to increment loop count.
- Use **H4_ImageBuffer** to feed results back wirelessly.

Why this works:
- First loop: strong denoise, big changes.
- Later loops: lower denoise, gentle refinement.

### 2) Wireless loop without cycle errors
Goal: true feedback loop, no visible cycle.

Basic idea:
- Store output in **H4_ImageBuffer**.
- On next iteration, retrieve from Buffer instead of wiring output directly backwards.

If your loop is still “one step behind,” you likely built a laggy loop, not a buffered loop. Small difference, massive impact.

### 3) Grid testing without brain damage
Goal: sweep CFG, steps, prompts, models.

Basic idea:
- Use **H4_Gridinator** with **H4_AxisDriver**.
- Keep seeds controlled with **H4_SeedSequencer**.

This gives you structured experiments, not a folder full of mystery images.

---

## FAQ
### Are QoL features enabled by default?
No. They are OFF by default. You must enable them manually, one by one, in settings. There is no h4_Live “enable all QoL” switch.

### Is BigBrother spying on me?
No. It is a frontend QoL bundle. Seeing it in console does not mean it is logging anything sensitive by default.

### Why do I need ImageBuffer?
Because ComfyUI’s graph structure does not like cycles. Buffer breaks the cycle by storing data globally, so you can loop without wiring a visible loop.

### I got a scary error popup, is that normal?
Yes. Enhanced error reporting can be jarring at first, but it is designed to be dramatically more informative than standard comfy errors.

---

## Troubleshooting
### “It says cycle detected” or my loop fails
- Avoid direct output-to-input cycles in the visible graph.
- Use **H4_ImageBuffer** to store and retrieve data wirelessly.
- Verify your loop counter is actually incrementing.

### “Nothing changes across loops”
- Check loop count display using **H4_StateMonitor**.
- Ensure **H4_MissionControl** is in Active mode if it is supposed to drive loops.
- Verify seeds and denoise schedules are changing as intended.

### “Type mismatch” errors
- Use **H4_TrafficMerge** when merging streams, it includes type-safety checks.
- Add **H4_DisplayAny** or **H4_SmartConsole** temporarily to inspect what is actually flowing.

### “The UI toggles don’t show up”
- Confirm frontend extension files are installed where ComfyUI loads extensions.
- Hard refresh the browser.
- Check console for extension load logs.

### Frozen Noodles or Glitched Nodes (KICK THE GRID)
If your canvas becomes unresponsive, wires look disconnected (but should be connected), or nodes are "stuck" in a drag state, use the **KICK THE GRID** button found in your top-right toolbar (icon: `(>_<)!!`).

**What it does:**
- It performs a full, non-destructive **Serialize/Reload cycle**.
- It captures the current graph as a JSON snapshot and force-rehydrates it into the workspace.
- It refreshes the internal `LiteGraph` state without requiring a browser refresh.

**⚠️ Warning for Custom Noodle Users:**
If you are using **Third-Party Noodle/Wire rendering systems** (e.g., extensions that turn your wires into circuit boards or geometric paths), the **KICK THE GRID** function may NOT fix visual noodle artifacts. While the underlying logical connections will be restored, the custom visual rendering layer managed by those third-party extensions often requires a full browser refresh to reset.

---

## Dev Corner (technical deep dive)
This section is for the nerds, the builders, and the people who read stack traces like bedtime stories.

### Architecture philosophy
h4_Live is built around a singleton global state, typically `_H4_GLOBAL_STATE` in the core module, enabling coordinated state across nodes.

Core idea:
- Most ComfyUI graphs are stateless and acyclic.
- h4_Live injects statefulness via a controlled global store and “wireless” data transport patterns.
- This enables iterative workflows, loop counters, restart flags, and data reuse without creating illegal graph cycles.

### Wireless protocol and DAG constraints
ComfyUI expects a DAG evaluation model. Direct cycles violate structural assumptions and can break execution ordering.

h4_Live addresses this by:
- Storing intermediate artifacts in a global buffer (object references where possible).
- Rehydrating the stored object on subsequent executions.
- Preserving an acyclic graph layout while enabling feedback semantics.

### ImageBuffer implementation notes
- Accepts arbitrary payload types (images, latents, text, conditioning, and general Python objects).
- Designed to break cycles without a 1-iteration lag.
- Where possible, uses reference storage for “zero-copy-ish” behavior, minimizing deep copies and VRAM churn.

### Router and Merge control flow
**H4_TrafficRouter**
- Implements loop-aware selection logic: loop index 0 selects starter path, loop index N>0 selects loop path.
- Optionally applies denoise policy selection for creation vs refinement phases.

**H4_TrafficMerge**
- Implements loop-aware multiplexing while maintaining type discipline.
- Adds safeguards for wireless patterns to reduce cycle-related execution faults.
- Performs runtime type checks to prevent Image/Latent mismatches.

**H4_TrafficCop**
- **Architecture Note:** Operates as a legacy splitter, strictly forwarding the `any_input` reference to both output ports simultaneously without explicit dropping, prioritizing acyclic safety over conditional occlusion.
- **Fail-Safe Mechanism:** Injects dummy references into inactive pathways to prevent `NoneType` propagation crashes in downstream ComfyUI execution flows.
- **State Resolution:** Polls `_H4_GLOBAL_STATE` `loop_count` to determine routing without mutating the state counter itself.

**H4_StateMonitor**
- **Instrumentation:** Acts as a transparent telemetry intercept. It reads the `loop_count` directly from Python's global namespace memory (`h4_core.get_state()`).
- **Graph Synchronization:** Implements an `Any_In` pass-through port to force ComfyUI's DAG executor to delay the `report_state` execution until deterministic prerequisite nodes resolve, bypassing race conditions.

**H4_LoopIncrementer**
- **Mutation Vector:** Exclusively handles the `+1` incrementation array logic decoupled from parameter routing, adhering to single-responsibility architecture.
- **Interrupt Listener:** Constantly evaluates the `request_reset` boolean flag within the global `orbit_get()` dictionary cache. If triggered, `reset_state()` forces the loop count integer back to `0` preemptively before pass-through.

**H4_WirelessResetButton**
- **Non-Linear State Injection:** Bypasses conventional DAG topography by writing a `True` flag directly into the `orbit_get` persistence layer (`request_reset`).
- **Orphan Node Execution:** Required to be evaluated. It has `OUTPUT_NODE = True`, forcing ComfyUI to execute its `send_reset()` function even without terminal outputs, enabling out-of-band state mutation.

**H4_ImageBuffer**
- **Storage Subroutine:** Invokes `buffer_image()` to establish a global heap reference for arbitrary Python objects (`ANY_TYPE`). By persisting memory addresses instead of serializing payloads, zero-copy overhead is maintained.
- **Cycle Evasion Strategy:** Circumvents cyclical graph dependency faults by segregating writes (Run N) from reads (Run N+1) through decoupled temporal execution windows. Fallback mechanisms utilize previous states if upstream dependencies fail.

### Context bundling: H4_PIPE
**H4_ContextHub**
- Bundles canonical ComfyUI artifacts into a composite pipe type.
- Provides deterministic packing order and logging hooks for debugging.

**H4_ContextUnpack**
- Performs the inverse mapping, returning unpacked typed outputs.

### Mission control, scheduling, seeds
**H4_MissionControl**
- Active mode mutates global loop state (incrementer).
- Passive mode reads and exposes state for UI display and instrumentation.
- Responds to wireless reset flags.

**H4_LinearScheduler**
- Generates an interpolated scalar across loop domain, enabling parameter ramps.

**H4_SeedGenerator / H4_SeedSequencer**
- SeedGenerator offers fixed, incremental, random strategies based on global loop.
- SeedSequencer adds stateful internal sequencing independent of global loop count, including digit constraints and auto-advance.

### Gridinator and testing utilities
**H4_Gridinator**
- Parameter sweep orchestrator supporting fuzzy checkpoint resolution and prompt stutter expansion.
- Auto-labeling and layout generation for multi-axis grids.

**H4_AxisDriver**
- Axis iteration driver coordinating Gridinator’s sweep dimensions.

**H4_Comparinator**
- Full in-node comparison suite with custom JavaScript frontend.
- **Left Pane**: Hosts Image A and Image B in a stacked layered view with CSS `clipPath` driven by a draggable slider handle for real-time A/B wipe comparison.
- **Right Pane**: Contextual — shows either a history reference image (compare mode) or a zoom canvas (inspect mode) with `background-position`/`background-size` driven magnification.
- **Graph Traversal Engine**: `findUpstreamSamplers()` recursively walks `app.graph.links` backwards from input nodes to locate KSampler nodes. `findPromptText()` traces `positive`/`negative` conditioning inputs through `CLIPTextEncode` and `Reroute` nodes to extract prompt text from widget values.
- **Metadata Cache**: `this.metadataCache` stores extracted parameters keyed by filename, enabling accurate parameter display for historical comparisons even after graph modifications.
- **Blink Mode**: `toggleBlinkMode()` toggles Image B opacity between 0 and 1 on spacebar hold for rapid perceptual comparison.
- **Slider Mode**: `setSliderMode("A"|"B"|"Split")` manipulates `clipPath` CSS on Image B to show full A, full B, or 50/50 split.
- **History System**: Thumbnail strip with single-click select, double-click lightbox, right-click reference lock. Locked references override Image A source in `updateData()` for persistent baseline comparison.
- **Full Mode CSS**: `.full-mode` sets `pane-left` to 100% width and `pane-right` to 0%, while preserving slider and blink functionality within the expanded pane.

**H4_PixelVisualizer**
- Tensor-level pixel difference computation using `torch.abs(A - B)` with configurable amplification scale.
- Resolution mismatch handling via `F.interpolate` with bilinear mode before diff computation.
- Outputs four tensors: amplified heatmap, horizontal concatenated side-by-side, and both input passthroughs.


### Batch and inspection tooling
**H4_DataStream**
- Folder ingest and queue automation to sequentially process multiple inputs.

**H4_SmartConsole / H4_DisplayAny**
- Runtime introspection. ULTRA mode exposes deeper properties including min/max, structure, and debug metadata.

**H4_DocuScribe**
- Emits workflow documentation by analyzing graph structure and node configuration.

### FaceForge subsystem (h4_faceforge/)
**H4_FaceForge**
- Multi-stage pipeline: swap, restore, upscale, blend, occlusion-aware handling, and VRAM mitigation strategies.

**H4_IdentityEngine**
- Separates persistent persona traits (“DNA”) from scene-level prompt context.
- Preset serialization logic avoids overwriting scene text while restoring identity traits.

**H4_FaceDetailer**
- Texture restoration via controlled denoise constraints to add micro-detail while minimizing identity drift.

**H4_BuildFaceModel**
- **Embedding Synthesis:** Iteratively processes batches or directories of imagery through InsightFace (`buffalo_l` / CPU or CUDA Execution Provider). Extracts the 512-dimensional feature vector `embedding` for each detected face.
- **Statistical Blending:** Aggregates multiple vectors into a unified model using Numpy-accelerated mathematical synthesis. 'Mean' calculates the spatial average, 'Median' filters out geometric drift from extreme outliers (glasses/occlusions), and 'Mode' calculates the centroid distance to extract the single most representative template.
- **Unit Normalization:** Strictly enforces 1.0 length unit normalization (`embedding / np.linalg.norm(embedding)`) prior to reconstruction, satisfying InsightFace's internal Cosine Similarity thresholds during the swap phase.

**H4_SaveFaceModel / H4_LoadFaceModel**
- **Safetensors Serialization:** Circumvents Python `pickle` vulnerabilities by mapping the arbitrary `Face` class attributes (embedding, kps, bbox, det_score, 3d/2d landmarks, pose, gender, age) directly into standalone PyTorch tensors.
- **Restoration Pipeline:** `H4_LoadFaceModel` parses the tensors, handles missing legacy keys gracefully, enforces vector re-normalization, and dynamically reconstructs the `Face` object in memory. This bypasses the need for the heavy detection model to run during runtime loading.

### H4_ModelMerger (Backend)
- **Tiled VAE Decode**: Uses a rolling buffer calculation to decode large test images without OOMing 8GB cards.
- **FP32 Fallback**: If standard FP16 decode returns NaNs (black images), it automatically casts the VAE to FP32, retries, and then casts back. This fixes the infamous "black square" issue on 16-series and some 30-series cards.
- **Garbage Collection**: Aggressive `gc.collect()` and `torch.cuda.empty_cache()` calls between merge operations to prevent fragmentation.

### File I/O and Advanced Serialization

**H4_UniversalLoader**
- **Dynamic Bridge Architecture:** Automatically detects `.gguf` extensions and delegates loading to `ComfyUI_GGUF` internally via dynamic module importation (`importlib`).
- **Wan/Lumina Heuristics:** Employs runtime validation before loading the UNET. If a `zimage` or `wan` model is detected alongside a 4096-dim `T5` text encoder (instead of a 2560-dim Gemma), it triggers a preemptive structural exception warning to prevent latent sizing crashes.
- **Fallbacks & Intercepts:** Manually wraps Wan UNETs initializing config properties (`patch_size`, `freq_dim`, `window_size`) bypassing standard layer detectors to enforce deterministic 14B / 1.3B routing.

**H4_ModelSave**
- **Native Pipeline Hook:** Invokes `model.state_dict_for_saving(clip_sd, vae_sd)` to inherit ComfyUI's internal mapping dictionaries. This intrinsically guarantees that SDXL (`conditioner.embedders.`), SD1.5 (`cond_stage_model.`), and Flux components are prefixed accurately without manual regex string-replacements.
- **Post-Hook Casting:** Operates precise `torch.float16`, `bfloat16`, or `float8` casting routines iteratively across the finalized state dict *after* key-mapping, minimizing the memory footprint immediately prior to `safetensors` topological serialization.
- **GC Invocation:** Purges python garbage collection `gc.collect()` and empties CUDA cache pre-save to free consecutive blocks of VRAM needed to assemble monolithic `.safetensors` blobs.

**H4_SmartSave**
- **Dual-Bus IO Logic:** Utilizes conditional branching to direct payload writes to `folder_paths.get_temp_directory()` (transient Preview logic) or `get_output_directory()` (persistent Save logic).
- **Metadata Serialization:** Extracts raw JSON from the `custom_metadata` string schema, dynamically parsing and injecting key-value pairs into the PIL `PngInfo()` header prior to compression.
- **Non-Blocking Telemetry (History API):** Defers metadata chunk parsing from the `/h4/smart_save/history` REST endpoint. Uses `os.scandir` instead of `os.listdir` to generate the filmstrip JSON response in O(n) linear performance constraints.

### Diagnostics, Modifiers, and Visualizers

**H4_PixelPress (SSAA & HDR)**
- **Supersampling Engine:** Operates a true Super Sampling Anti-Aliasing (SSAA) pipeline. It first upscales the latent/image via a tiled neural model inference (`_tiled_upscale`), mitigating VRAM exhaustion via mathematically precise spatial overlap masking.
- **Colorimetric LAB Transforms:** Instead of naive RGB manipulation, it converts tiles into the CIELAB (`LAB`) color space using `ImageCms.profileToProfile`. This allows isolated manipulation of the Luminance channel (`L`), applying non-linear shadow curve (`1/(1+shadow)`) and highlight exponents without distorting chromaticity (`A`/`B`).
- **Lanczos Down-sampling:** Sharpens via `ImageFilter.UnsharpMask`, then compresses the supersampled array back to the original operational matrix using `Image.Resampling.LANCZOS`, resulting in ultra-crisp micro-details.

**H4_Varianator**
- **Sub-Graph Iteration:** Circumvents ComfyUI's acyclic functional paradigm by embedding a captive `nodes.KSampler` instance within its execute function.
- **Latent Riffing:** Iterates `N` times over a cloned input `LATENT`, mutating the base seed (incrementally or purely randomly) and injecting a variable `denoise` strength governed by predefined boundaries (`minimal: 0.3-0.4`, `major: 0.5-0.55`).
- **Memory Safety:** Decodes the final varied latent batch using `nodes.VAEDecode()` internally and stacks the resulting tensor array (`torch.cat`), preventing graph bloat.

**H4_VisualTokenizer**
- **Tokenizer Extraction:** Dynamically traversing the nested abstraction layers of the provided `CLIP` model (probing for `.tokenizer` or `.cond_stage_model.tokenizer`) to isolate the raw `transformers.CLIPTokenizer`.
- **Lexical Mapping:** Uses internal Comfy functions (`comfy.sd1_clip.token_weights`) to preserve prompt weighting (e.g., `(text:1.2)`), then strictly maps `.tokenize()` outputs to `.convert_tokens_to_ids()`.
- **WebSocket Telemetry:** Broadcasts the parsed matrix via `PromptServer.instance.send_sync("h4.visual_tokenizer.update")`, allowing the JS frontend to construct the token-block UI asynchronously.

**H4_LatentSelector**
- **Deterministic Math:** Computes exact `target_area` baselines depending on architecture (`SDXL:` 1,048,576 pixels vs `SD1.5:` 262,144 pixels). Applies square-root derivations to calculate the closest mathematically pure dimensional ratio, finally snapping to hardware-friendly `modulo 16` pixel boundaries before generating the empty `torch.zeros()` tensor.

**H4_NodeTranslator & H4_Discombobulator**
- **Stateless Anchors:** These nodes execute purely as `noop` (No Operation) backend stubs. They return `{"ui": ...}` or `float("NaN")` for `IS_CHANGED`, ensuring they never trigger unwanted graph evaluations. Their primary existence is to act as DOM injection anchors for `h4_node_translator.js` and the glitch engine, which mutate ComfyUI's internal graph representations (`app.graph._nodes`) on the fly.

**H4_NoteInjector**
- **Rasterized Overlays:** Utilizes raw `PIL.ImageDraw` to composite height-constrained color bars onto incoming `[B, H, W, C]` tensors. Attempts to dynamically load system fonts (`arial.ttf`, `Roboto`) before falling back to `ImageFont.load_default()`. Calculates text bounding boxes to guarantee pixel-perfect centering of dual-line (Title/Subtitle) typographical injections.

### Utility & Quality Control

**H4_Oxidine**
- **Sovereign Proxy Routing:** Operates as a stateless multiplexer traversing the Node Graph. It implements Python's `__getattr__`, `__getitem__`, and sequence protocols natively to override standard dictionary representations. Bypasses list-flattening bugs by avoiding standard subclasses, thereby forcing `comfy.execution` to treat it as an autonomous payload until explicitly unpacked or directly queried by downstream modules (e.g., KSampler calling `proxy.patch_model`).
- *Note: For a biblical-level architectural deep-dive into the Sentient Conduit, please refer to the dedicated `OXIDINE-BREAKDOWN.md` file located in the root directory.*

**H4_Switcheroo**
- **String Mutation Pipeline:** Implements a multi-slot find/replace engine operating on raw text. Each active slot performs a `str.replace()` (case-insensitive via `re.sub(flags=re.IGNORECASE)`) in slot order, allowing cascading transformations across up to 10 simultaneous pairs.
- **Recursive CONDITIONING Crawler:** When the `subject` input receives a `list[list[Tensor, dict]]` structure instead of a string, the node recursively traverses the nested conditioning structure probing for embedded text keys (`area`, `pooled_output`, etc.) and logs diagnostic warnings when no replaceable strings are found.
- **Wiring Fault Interceptor:** Pre-execution guard that detects `torch.Tensor` inputs and prevents CLIP tokenization of mathematical data. Emits a visual error through the HUD terminal and aborts the encoding phase to prevent downstream sampler corruption.
- **Optional CLIP Re-encode:** When a CLIP model is connected, the modified string is passed through `nodes.CLIPTextEncode` to produce ready-to-use CONDITIONING output, eliminating the need for a separate encode node in the graph.

**H4_ForgeMask**
- **Interactive Canvas Protocol:** Hosts a full HTML5 Canvas element within the node's DOM footprint. Implements `mousedown/mousemove/mouseup` event delegation for brush painting, erasing, and polygon lasso selection. The mask layer is composited as a semi-transparent overlay using `globalCompositeOperation='source-over'` at alpha 0.45.
- **Serialization Pipeline:** The painted mask is captured via `canvas.toDataURL('image/png')`, encoded to Base64, and injected into the `mask_data` hidden widget. The backend deserializes this via `PIL.Image.open(BytesIO(base64.b64decode()))` and converts to a normalized `torch.Tensor` for ComfyUI's mask pipeline.
- **Post-Processing Stack:** Applies sequential mask operations: Gaussian blur via `torchvision.transforms.GaussianBlur` (kernel derived from `mask_blur`), morphological expansion via `F.max_pool2d` (driven by `mask_expansion`), strength multiplication, and optional inversion via `1.0 - mask`.
- **Auto-Queue Injection:** The `SEND MASK` button invokes `app.queuePrompt()` directly from the frontend, bypassing the standard queue button workflow.

**H4_CompleteLoader**
- **Composite Architecture:** Extends `H4_UniversalLoader` with additional `IMAGE` upload widgets (`image_1` through `image_4`). Each widget uses `node_helpers.uploadFile()` to handle ComfyUI's input directory resolution. Image slots use the shared `_load_image()` helper for `PIL.Image.open()` → EXIF rotation → RGBA separation → `torch.Tensor` conversion.
- **Output Multiplexing:** Returns a 7+ element tuple combining MODEL, CLIP, VAE from the base loader pipeline with individual IMAGE tensors from the upload slots. Missing images return `None` and are handled by downstream `optional` input declarations.

**H4_MultiImgUpload**
- **Dynamic Slot Architecture:** Declares 10 optional `IMAGE` upload widgets at registration time. The JS frontend dynamically shows/hides slots based on connection state, keeping the node footprint compact until slots are needed.
- **Paired Output Mapping:** Each of the 10 slots produces two outputs (IMAGE + MASK) via tuple unpacking of `_load_image()`. Mask is extracted from the alpha channel of RGBA images; RGB images produce a solid white (1.0) mask tensor.

**H4_DebugErrorGenerator**
- **Controlled Chaos:** A dedicated structural testing node explicitly designed to raise raw exceptions (`ValueError`, `RuntimeError`, `TypeError`) into the ComfyUI execution stack. Vital for testing custom popup UI interceptors and the JS notification listener (h4_BigBrother).

### Frontend extensions (js/)
**BigBrother bundle**
- Provides QoL affordances: snapping, socket coloration, overlays, memory helpers, and UI behaviors.
- Explicit opt-in model, QoL toggles are disabled by default and enabled per-feature.
- Console visibility does not imply active sensitive logging, behavior is gated behind explicit settings toggles.

### Error reporting
Enhanced error reporting surfaces expanded diagnostic context beyond stock messages:
- Node identity, execution context, expected vs actual types, and state cues.
- Designed to reduce debug iteration time by providing actionable failure context.

---

## Version History & Changelog

### v9.5.1 - THE KERNEL & HUD HARDENING
*   **H4_Pythonipulator-inator (v9.5.1)**:
    *   **New Master Node**: Introduced the definitive image manipulation kernel. Includes Cyberpunk effects, Geometric transforms, and advanced Color/Blur/Edge detection engines.
    *   **Tactical Metadata**: Integrated local saving with incremental file numbering and prefix support.
*   **H4_SmartSave (v24.14.39 / +ULTRA Edition)**:
    *   **Dimensional Decapitation**: Resolved all canvas interaction occlusions. Fixed the "dead zone" below the node and restored drawer tactile sovereignty.
    *   **Recursive Crawler Hardening**: Optimized parameter extraction logic for complex, multi-reroute graphs.
    *   **Viewport Sovereignty**: Finalized DOM purging logic for 100% ghost-free workspace interaction.
*   **Toolkit Cleanup**:
    *   Removed deprecated nodes (h4_faceforge, h4_gridinator, etc.) to streamline the V2 architecture.
    *   Synchronized versioning to **v9.5.1** across all modules.

### v7.6.6 - THE MUTATION MANIFESTO
*   **H4_DoubleSampler (v7.6.6)**: 
    *   **Chaos Engine Phase 2**: Absolute chaos integration. The engine now operates as a **Branching Second Pass**. Select from 'Pure Chaos', 'Odds', 'Evens', 'Every #nth number', or 'Random Pulse' modes.
    *   **Mutation Strength**: Added `chaos_denoise` to control exactly how much your chaotic prompt overwrites the original composition.
    *   **Legend v3**: Updated the in-image stat tracker with high-visibility color coding for Passes and a "🔥 CHAOS ENGINE ACTIVE" badge for variants.
*   **H4_SmartSave (v7.6.6)**:
    *   **Lightbox Traveler**: Integrated Full Keyboard Control (`ArrowLeft`/ArrowRight`) and UI buttons for deep history traversal directly inside the Lightbox.
    *   **Index Persistence**: History indexing is now synchronized with the film strip, ensuring you never lose your place during a deep dive.
*   **H4_DisplayAny (v7.6.6)**:
    *   **Safety Zone Implementation**: Hardened the UI layout with a permanent 85px left-margin "Safety Zone" to prevent input labels from bleeding into your data visualizer.
*   **Global Version Sync**: All core systems now synchronized to **v7.6.6**.

### v7.0.1
- **Chaos Engine v2 Integration**: The `H4_DoubleSampler` (Logic Stage 4) now hosts the definitive Chaos Engine with mode-aware widget surfacing.
- **Dynamic Node Evolution**: The sampling hub now transforms its title based on active features (`h4_Smart Sampler` -> `Double Sampler` -> `h4_Double_Sampler +` -> `h4_CHAOS ENGINE`).
- **Universal Tooltip Overhaul**: 100% tooltip coverage on the Sampler node with casual explanations and real-world examples.
- **History Traveler**: Implemented full Lightbox navigation (Next/Prev/Keyboard) in `H4_SmartSave` and `H4_Comparinator`.
- **Branding Audit**: Synchronized nomenclature across the pack; Seed Generator now uses the "Pure Entropy" moniker to avoid confusion.
- **Engine Hardening**: Enhanced path resolution for the IdentityEngine and fixed UI drawer collisions in High-DPI modes.

### v7.0.0
- **Atomic Plugin Architecture**: Initial release of the folder-based node shelf.
- **Dynamic Discovery**: Automatic node harvesting and JS asset synchronization.
- **Mission Control**: Introduction of centralized loop management.

---

## License and credits
This is a clean node pack. If you ship it, keep it tidy.
If you remix it, be cool about it.

We build weird tools so people can make cool stuff.
And also because we got mad at the canvas one night and chose violence.

I was trying to explain the new Comparinator logic to a friend yesterday, but I think I lost them at 'Tri-State Selection'. They asked if that was a new type of heavy-metal sandwich. I said, 'No, but it does have some pretty beefy features if you know how to slice the data.' 

... That's a pun, isn't it? My bad. I guess I'm just a bit... *latent* with my humor today.

Anyway, the toolkit is stable, the modes are hardened, and the vault is locked. Have fun breaking the speed limit of creativity.

**Be Your Best**
    **h4** - (b'.')b
---
*Built for the h4_Live Ecosystem. No compromise. No placeholders. Just power.*
