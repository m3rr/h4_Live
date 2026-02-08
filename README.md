# h4_Live
A stateful, loop-friendly utility belt for ComfyUI, built to make workflows feel less like “one-shot vending machines” and more like… actual processes.
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
- [H4_Gridinator (IT’S OVER 9000!)](#h4_gridinator-its-over-9000)
- [H4_AxisDriver (Grid Tools)](#h4_axisdriver-grid-tools)
- [H4_Comparinator (A/B Test)](#h4_comparinator-ab-test)

### Data processing and batch tools
- [H4_DataStream (Batch Loader)](#h4_datastream-batch-loader)
- [H4_PixelPress (Density)](#h4_pixelpress-density)
- [H4_Varianator (Latent Riffler)](#h4_varianator-latent-riffler)
- [H4_VisualTokenizer (Weights)](#h4_visualtokenizer-weights)

### Face manipulation suite (h4_faceforge/)
- [H4_FaceForge (AIO Face Swap Engine)](#h4_faceforge-aio-face-swap-engine)
- [H4_IdentityEngine (Persona Engine)](#h4_identityengine-persona-engine)
- [H4_FaceDetailer (Pore Restorer)](#h4_facedetailer-pore-restorer)
- [H4_BuildFaceModel](#h4_buildfacemodel)
- [H4_LoadFaceModel](#h4_loadfacemodel)
- [H4_SaveFaceModel](#h4_savefacemodel)

### Loaders and file operations
- [H4_UniversalLoader (Skeleton Key)](#h4_universalloader-skeleton-key)
- [H4_SmartSave (Preview/Save)](#h4_smartsave-previewsave)

### Display and debugging
- [H4_SmartConsole (X-Ray)](#h4_smartconsole-x-ray)
- [H4_DisplayAny (Universal Monitor)](#h4_displayany-universal-monitor)
- [H4_DocuScribe (Workflow Reporter)](#h4_docuscribe-workflow-reporter)
- [H4_DebugErrorGenerator (Test Only)](#h4_debugerrorgenerator-test-only)
- [H4_Discombobulator (Use with caution)](#h4_discombobulator-use-with-caution)

---

## Nodes (friendly guide, minimal jargon)

### H4_TrafficRouter (The Nexus)
**What it is:** the main “brain switch” for loop workflows.

**What it does:**
- On loop 0 (first run), it uses your “Starter” input.
- On loop 1+ (refinement loops), it uses your “Looper” input.
- It can also manage denoise behavior automatically, higher for creation, lower for refinement.

**Why you care:**
- You stop rewiring.
- You stop forgetting to swap inputs.
- You stop doing that thing where your “refine” pass accidentally uses the wrong source and you waste 15 minutes.

**When to use it:**
- Any workflow where you want a first-pass create, then iterative refine.
- Any time you want a single node to decide which path is active.

**Common gotchas:**
- If your loop count never increments, it will keep acting like it is first run forever. That is not a Router problem, that is a “who is incrementing the loop?” problem.

---

### H4_TrafficMerge (The Zipper)
**What it is:** the safer Router cousin.

**What it does:** merges two streams into one output based on loop count, but in a way designed to behave nicely with wireless mode and avoid ComfyUI cycle errors.

**Why you care:**
- It is built to reduce “cycle detected” problems.
- It includes type-safety checks to prevent Image and Latent mismatches from silently ruining your day.

**When to use it:**
- You want merging logic, but you are doing wireless loop designs.
- You want guardrails, not chaos.

---

### H4_TrafficCop (Legacy Splitter)
**What it is:** the OG splitter.

**What it does:** takes one input and splits it into two outputs based on a restart flag.

**Safe Passthrough:**
- Designed to prevent red-node crashes when something is missing.
- Good when you are prototyping and your graph is half-connected.

**When to use it:**
- Legacy workflows.
- Simple split logic where Router would be overkill.

---

### H4_StateMonitor (The Scoreboard)
**What it is:** loop counter display node.

**What it does:**
- Shows current loop iteration.
- Can optionally daisy-chain input for timing control.

**When to use it:**
- When you want visibility. Simple as that.
- When debugging “why is my loop stuck at 0.”

---

### H4_LoopIncrementer (The Clicker)
**What it is:** manual loop counter control.

**What it does:**
- Bumps global loop count on demand.
- Supports wireless reset signals.

**When to use it:**
- Manual stepping.
- Debugging.
- “I want to advance exactly once and inspect outputs.”

---

### H4_WirelessResetButton (The Red Button)
**What it is:** an emergency reset trigger with no wires.

**What it does:**
- Sets a global reset flag that other nodes can detect.

**When to use it:**
- When your workflow is stuck in a bad state.
- When you want a clean restart without rewiring anything.

---

### H4_ImageBuffer (The Anti-Lag)
**What it is:** the thing that makes real feedback loops possible in ComfyUI without a direct cycle.

**What it does:**
- Stores ANY data type in RAM, images, latents, text, whatever.
- Acts like a wireless transmitter/receiver.
- Breaks the visible DAG cycle by storing data globally.

**Why it’s important:**
- ComfyUI hates cycles.
- You still want iterative loops.
- The Buffer is how you do it without 1-cycle lag and without “cycle detected” errors.

**When to use it:**
- Any workflow that loops back.
- Any workflow where you want to pass state forward without wires.

---

## Context and bundling nodes

### H4_ContextHub (The Mothership)
**What it is:** one wire to rule them all.

**What it does:**
- Takes standard ComfyUI types (Model, VAE, CLIP, Conditioning, Latent, Image, Mask), plus two “any” slots.
- Bundles them into one pipe type (H4_PIPE).
- Logs what passes through so you can debug spaghetti.

**Why you care:**
- Cleaner canvas.
- Easier to share workflows.
- Less time hunting for where the VAE went.

---

### H4_ContextUnpack (The Distributor)
**What it is:** reverses the Hub.

**What it does:**
- Takes H4_PIPE and gives you back the individual connections.

**How to think about it:**
- Hub at the start, Unpack at the end.
- Everything in the middle stays clean.

---

## Mission control and scheduling

### H4_MissionControl (The Dashboard)
**What it is:** the command hub.

**Modes:**
- Active mode: drives loops and increments count.
- Passive mode: monitoring only.

**Wireless reset:** supported.

**When to use it:**
- Anything loop-based where you want a single “control panel” node.

---

### H4_LinearScheduler (The Ramp)
**What it is:** smoothly changes a number over loops.

**What it does:**
- Generates interpolated float values over time.
- Great for denoise ramps and CFG sweeps.

**Why you care:**
- You can start strong and then refine gently.
- You can do experiments that actually make sense, not random knob twisting.

---

### H4_SeedGenerator (Signal Gen)
**What it is:** basic seed control.

**Modes:**
- Fixed: always same.
- Incremental: seed + loop count.
- Random: chaos.

**When to use it:**
- You just need seed behavior and do not want a whole control system.

---

### H4_SeedSequencer (Chaos Controller)
**What it is:** advanced seed management with stateful memory.

**Why it’s different:**
- It can run its own internal sequencing independent of global loop.
- Can constrain random digits, like “only 4-digit seeds” for controlled chaos.
- Auto-advance and keep state between runs.

**When to use it:**
- Grid testing.
- Iterative refinement where you want reproducible randomness.
- When you’re doing science, not vibes.

---

## Gridinator and testing suite

### H4_Gridinator (IT’S OVER 9000!)
**What it is:** matrix testing tool, parameter sweeps, and variation grids.

**Features:**
- Fuzzy checkpoint matching, like typing “pony” and it finds your Pony model.
- Stutter syntax, like `{cat|dog|fish}` for prompt variations.
- Auto labels and dynamic layout.
- Configurable margins and padding.

**When to use it:**
- Tuning workflows.
- Comparing prompts and settings.
- Building a baseline you can trust.

---

### H4_AxisDriver (Grid Tools)
**What it is:** helper for Gridinator.

**What it does:**
- Drives parameter sweeps cleanly so Gridinator can focus on layout and orchestration.

---

### H4_Comparinator (A/B Test)
**What it is:** side-by-side comparison tool with custom UI.

**What it’s for:**
- “Which one is better?” without guessing.
- Visual diff analysis so your eyes do less lying.

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

### H4_PixelPress (Density)
**What it is:** resolution and density controller.

**When to use it:**
- Normalizing inputs.
- Keeping output sizes consistent across batches.

---

### H4_Varianator (Latent Riffler)
**What it is:** generates 1 to 16 latent variations from one latent.

**Profiles:**
- Minimal: subtle variation.
- Moderate: noticeable.
- Major: identity shift, the “new person” knob.

**Why it’s good:**
- Uses isolated random state for reproducibility.
- Lets you explore variation without wrecking your entire pipeline.

---

### H4_VisualTokenizer (Weights)
**What it is:** prompt token weight visualization.

**What it’s for:**
- Understanding how your prompt is actually being parsed.
- Debugging “why does this token do nothing” moments.

---

## Face manipulation suite (h4_faceforge/)

### H4_FaceForge (AIO Face Swap Engine)
**What it is:** full-stack face pipeline, swap to final output.

**Pipeline concept:**
- Swap
- Restore
- Upscale
- Blend
- Preserve occlusions like glasses and hair (when possible)
- Manage VRAM aggressively for smaller GPUs

**When to use it:**
- Face swaps that do not look like plastic dolls.
- Consistent results across batches.

---

### H4_IdentityEngine (Persona Engine)
**What it is:** character consistency manager.

**Core idea:**
- DNA is the permanent traits.
- Scene is the temporary context.
- Presets save the DNA without stomping your scene text.

**Why you care:**
- You stop overwriting your prompt every time you load a character.
- You can reuse personas across different scenes.

---

### H4_FaceDetailer (Pore Restorer)
**What it is:** texture hallucination tool to fix waxy faces.

**What it’s for:**
- Adding pores and skin texture back after swaps.
- Keeping identity stable while improving realism.

**Note on denoise:**
- Too high and you change the face.
- Too low and nothing happens.
- There is a sweet spot and yes, it matters.

---

### H4_BuildFaceModel
Builds a blended face embedding from multiple photos, like a “super-embedding” for better accuracy.

### H4_LoadFaceModel
Loads previously built face models.

### H4_SaveFaceModel
Saves face models you built.

---

## Loaders and file operations

### H4_UniversalLoader (Skeleton Key)
**What it is:** a universal checkpoint loader that tries to “just work.”

**What it does:**
- Auto-detects format, safetensors, ckpt, diffusers folders, GGUF via bridge where supported.
- Performs validation checks to catch mismatches earlier.
- Uses aggressive cleanup to avoid memory issues.

**When to use it:**
- You have multiple model formats and want one loader.
- You want earlier failure instead of mid-run explosions.

---

### H4_SmartSave (Preview/Save)
**What it is:** preview plus save utility.

**When to use it:**
- When you want consistent naming, previewing, and saving without extra clutter.

---

## Display and debugging

### H4_SmartConsole (X-Ray)
**What it is:** an inline debugger.

**Modes:**
- Normal: basic info.
- ULTRA: nuclear inspection, min/max, attributes, internal structure.

Use ULTRA when you are ready to suffer, but also ready to actually fix the problem.

---

### H4_DisplayAny (Universal Monitor)
Displays anything, type-agnostic.

---

### H4_DocuScribe (Workflow Reporter)
Generates documentation from your workflow structure.

This is the “help I need to explain this to future me” node.

---

### H4_DebugErrorGenerator (Test Only)
Intentionally throws errors to test error handling.

---

### H4_Discombobulator (Use with caution)
Hidden stealth node, purpose redacted from console output.

Yes, it’s weird. Yes, it’s on purpose. No, we are not explaining it in the friendly section. Not today.

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
- UI-oriented comparison and diff tooling for A/B evaluation.

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

## License and credits
This is a clean node pack. If you ship it, keep it tidy.
If you remix it, be cool about it.

We build weird tools so people can make cool stuff.
And also because we got mad at the canvas one night and chose violence.

(Yes, there might be one typo in here. As a treat. Probably.)
