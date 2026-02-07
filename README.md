# h4_Live: The Logic & Loop Controller v3.0 { Now with DNA! }
![Version](https://img.shields.io/badge/version-3.7.0-blueviolet) ![Status](https://img.shields.io/badge/status-Nuclear-red) ![ComfyUI](https://img.shields.io/badge/platform-ComfyUI-succes)

> **"A Railway Switch for your Workflow."**

---

### 🤔 What is "Live"?

So... this started simply enough. Honestly, I just wanted a switch node. You know, something basic to swap between two inputs without rewiring the whole board.

But then I fell down a rabbit hole. A deep, heavily caffeinated rabbit hole. ☕🐇

I started adding features. Then I added more features. Then I realized, "Hey, I need a better way to test this," so I built testing tools. Then I got bored and wanted to verify face swaps, so I built a face swap engine. It became a labor of love, hate, and the occasional pot break.

It is no longer just a switch. It is a full utility belt. It is a suite of tools that has taken on a life of its own. h4_Live gives your robot a brain. 🧠

It allows your workflow to be Organic. It allows it to Count. It allows it to Remember. Most workflows just make an image and forget it ever happened. This doesn't. With this, you can tell ComfyUI: "Hey, make an image. Now, take that image and fix it. Now take that fixed image and upscale it. Do this 5 times, but on the 3rd time, change the settings to something weird."

### The Quality of Life (QoL) Enhancements
To make the experience even smoother, I’ve baked in several UI and workflow enhancements that trigger automatically:

*   **Smart Node Snapping**: Keeps your graph tidy by automatically aligning nodes as you move them.
*   **Dynamic Input/Output Coloring**: Instantly identifies data types at a glance to prevent mismatched connections.
*   **Auto-Context Memory**: Remembers your last-used settings and paths across sessions so you don't have to re-enter the same directory for the 100th time.
*   **Visual Debug Overlays**: Real-time data peeking that shows you exactly what’s flowing through your wires without needing a separate Preview node.

### How to Disable Them
I know some of you are purists or just want to see the world burn. If the "help" is getting in your way, you can shut it all down:
1.  Navigate to the ComfyUI Settings (the gear icon).
2.  Look for the `h4_Live Config` section.
3.  Toggle the "Enable QoL Features" switch to **Off**.
4.  Alternatively, you can edit the `config.yaml` file inside the `h4_live` folder and set `enable_qol: false`.

I hide the scary math and the complex logic behind friendly, easy-to-use nodes so you can focus on being an Artist, not a Programmer. This is probably the most fun you're going to have debugging. Dig in. Break things. Make cool shit.

*(P.S. I have rewritten this README about 20 times now. If I have to write it again, I am going to scream into a pillow until the neighbors call the police. Please enjoy it.)*

---

# 📚 THE CASUAL GUIDE (For Humans)

Here is everything you need to know about the tools in this kit. No jargon. No math. Just how to use them.

## 1. H4 Traffic Router (The Nexus) 🚦
**"The Brain"**

This is the most important node in the pack. It combines a "Splitter" (deciding where to go) and a "Merger" (combining things) into one smart box.

*   **What it does:** It takes two inputs: a "Starter" (e.g., an empty canvas) and a "Looper" (e.g., the finished painting). On the very first run (Run 0), it picks the Starter. On every run after that (Run 1, 2, 3...), it picks the Looper.
*   **Why use it?** It automates the "Feedback Loop". You don't need to manually switch wires.
*   **Bonus:** It also switches your "Denoise" setting automatically! (High denoise for the start, low denoise for the polishing loops).

**Settings Explained:**
*   `first_denoise`: The denoise strength (0.0 to 1.0) to use for the **creation** phase. Usually you want this high (1.0) so the AI creates something from nothing.
*   `loop_denoise`: The denoise strength to use for the **refinement** phase. Usually you want this lower (0.3 - 0.5) so it modifies the image without destroying it.
*   `restart`: A simple True/False switch. If set to **True**, the counter resets to 0 immediately. Useful if you want to force a fresh start without restarting ComfyUI.
*   `first_run_in` (Input): Connect your **Starting Item** here (e.g., Empty Latent). This is used ONLY once.
*   `loop_run_in` (Input): Connect your **Looping Item** here (e.g., the output of your sampler). This is used for every run after the first.

## 2. H4 Traffic Merge (The Zipper) 🤐
**"The Safe Connector"**

This is the "Little Brother" of the Router. It only does one thing: It merges two customized streams into one.

*   **What it does:** It listens to the Loop Counter. If it's Run 0, it opens Gate A. If it's Run 1+, it opens Gate B.
*   **Why is it "Safe"?** ComfyUI hates empty wires. If you unplug something, it crashes. The Zipper ensures that *something* is always connected, so your workflow never explodes.

**Settings Explained:**
*   `first_denoise` / `loop_denoise`: Same as the Router. It manages the denoise value for you.
*   `run_once_input` (Input): The item to use on Run 0.
*   `loop_input` (Input): **LEAVE THIS EMPTY.**
    *   *Wait, what?* Yes. If you wire a loop directly here, ComfyUI panics because it sees a circle. Instead, use the **H4 Image Buffer** in "Wireless Mode" (see below), and this node will just magically find the data.

## 3. H4 Traffic Cop (Legacy Splitter) 👮
**"The Old Reliable"**

*Note: This is an older node. We recommend the **Router**, but the Cop is still on duty.*

*   **What it does:** It takes ONE input and sends it to TWO places.
*   **Feature:** It uses "Safe Passthrough". Even if a road is closed, it sends "Ghost Data" down it so your nodes dont turn red and cry.

**Settings Explained:**
*   `any_input`: Connect whatever you want to control here.
*   `restart_on_true`: If **True**, traffic goes to the "Run Once" output. If **False**, traffic goes to the "Loop" output.

## 4. H4 Image Buffer (The Anti-Lag) 📦
**"The Wireless Warehouse"**

Understanding this node is the key to preventing headaches.

*   **The Problem:** When you make a loop in ComfyUI, data has to travel physically through wires. Sometimes, the data takes too long to get back to the start, and you get a "Cycle Error" (The Ouroboros Snake biting its own tail).
*   **The Solution:** The Image Buffer catches the data and stores it in RAM (Memory). It effectively "Snips" the wire, allowing you to send data wirelessly from the end of your workflow back to the start without confusing ComfyUI.

**Settings Explained:**
*   `image_in`:
    *   **If Connected**: It acts as a **Writer**. It takes whatever you send it and saves it to memory.
    *   **If Empty**: It acts as a **Reader**. It effectively becomes a wireless receiver, outputting whatever was last saved.

## 5. H4 State Monitor (The Scoreboard) 🔢
**"The Counter"**

*   **What it does:** It just tells you what loop number you are on.
*   **Use:** Connect it to a Text Display node to see "Run: 5" on your screen. Useful for knowing when to stop.

**Settings Explained:**
*   `Any_In` (Optional): If you connect something here, the Monitor will wait for that item to finish before updating the score. This is useful for timing (daisy-chaining).

## 6. H4 Loop Incrementer (The Clicker) ➕
**"The Engine"**

Usually, the **Router** handles counting for you. But sometimes, you want manual control.
*   **What it does:** Every time this node runs, it adds +1 to the global counter.
*   **Feature:** It has a "Wireless Reset" port. If you press the Red Button (see below), this node catches the signal and resets the count to 0.

**Settings Explained:**
*   `pulse`: Connect any wire here. When data flows through this wire, the count goes up.
*   `wireless_reset`: If **True**, it listens for the Wireless Reset Button.

## 7. Caffeine Mode (Wake Lock) ☕
**"The Insomniac"**

*   **What it does:** It keeps your computer awake while you work.
*   **The Problem:** You start a 300-step batch run and walk away. Windows decides to go to sleep. Your workflow stops.
*   **The Solution:** Click the little Kirby face in the top right corner: `(-_-)zzz` -> `(bO_O)b`.
*   **Effect:** Uses the Browser Wake Lock API to prevent the screen from turning off and the system from throttling deeply.
*   **Persistence:** If you switch tabs, he will momentarily lose focus, but he is programed to aggressively re-acquire the lock as soon as you come back.

## 8. H4 Wireless Reset (The Red Button) 🔴
**"The Eject Seat"**

*   **The Problem:** You are on Loop 50, but you want to start over.
*   **The Solution:** Toggle this switch to `True`. The next time your workflow runs, it sends a wireless signal to the **Incrementer** or **Router** screaming "RESET!". The counter drops to 0, and you start fresh.
*   **Tip:** Don't forget to turn it off after you reset!

**Settings Explained:**
*   `trigger_reset`: **True** = BOOM (Reset). **False** = Safe.

## 8. H4 Context Hub (The Mothership) 🛸
**"The One Wire to Rule Them All"**

Tired of spaghetti workflows? Do you have 50 wires crossing over each other?

*   **What it does:** It takes all your standard stuff (Model, VAE, CLIP, Positive Prompt, Negative Prompt, Latent, Image) and bundles them into ONE single blue wire called a `PIPE`.
*   **Bonus:** It prints a detailed report in your console telling you exactly what is inside (Shapes, Types, etc).

**Settings Explained:**
*   `base_pipe`: (Optional) Existing pipe to add to.
*   `model`, `vae`, `clip`, `latent`, `image`: Standard ComfyUI types.
*   `any_A`: A slot for literally anything else you want to pack (ControlNet, Mask, Lunch).
*   `any_B`: Another slot for anything.

## 9. H4 Context Unpack (The Distributor) 📤
**"The Unpacker"**

*   **What it does:** It takes the single `PIPE` wire from the Mothership and unpacks it back into all the individual connections.
*   **Use:** Put the Hub at the start of your workflow and the Unpack at the end. Now you have a clean, wire-free workspace in the middle!

**Inputs**:
*   `h4_pipe`: The bundled blue wire from the Hub.

## 10. H4 Smart Console (The X-Ray) 🧠
**"The Truth Teller"**

*   **What it does:** It sits between any two nodes and shows you what is flowing through the wire.
*   **Modes:**
    *   **Normal**: Shows basic info (Type, Shape).
    *   **🔥 +ULTRA**: Goes nuclear. Inspects inside the object, shows gradients, min/max values, attributes. Use this when you are debugging complex crashes.

## 11. H4 Mission Control (The Dashboard) 🎛️
**"The Flight Deck"**

A central place to see everything happening in your loop.
*   **Active Mode**: It acts like an engine, driving the loop forward.
*   **Passive Mode**: It just sits there and watches.
*   **Outputs**: It creates a text report ("Run 5/10, Seed: 12345") that you can display on your screen.

## 12. H4 Linear Scheduler (The Ramp) 📈
**"The Smooth Operator"**

*   **What it does:** It creates a number that changes smoothly over time.
*   **Example:** "Start at 1.0, End at 0.0, over 10 steps."
    *   Run 0: Output 1.0
    *   Run 5: Output 0.5
    *   Run 10: Output 0.0
*   **Use Case:** Slowly lowering the `Denoise` value so your image gets sharper and sharper with every loop.

## 13. H4 Seed Sequencer (The Chaos Controller) 🎲
**"The Dice Roller"**

Previously known as the "Broadcaster", this node handles your randomness.

**Settings Explained:**
*   `mode`:
    *   `fixed`: Keeps the seed the same forever.
    *   `increment`: Adds +1 every time.
    *   `random`: Pure chaos.
*   `random_digits`: Want to generate a seed like "1999" but not "123456789"? Set this to 4. Good for hunting specific "vibes" in models that react to seed length.

## 14. H4 Varianator (The Riff Machine) 🎸
**"Play it again, Sam... but different."**

This node takes an image (latent) and remixes it. It's like asking a jazz musician to play a specific song, but add their own flair.

**Settings Explained:**
*   `variation_count`: How many versions do you want? (1-16).
*   `variation_profile`:
    *   `minimal`: Subtle changes. Same person, different expression.
    *   `moderate`: Noticeable changes. Same person, different haircut.
    *   `major`: Identity shift. Cousin of the person.
*   `seed_mode`: Should the variations follow a pattern or be totally random?

## 15. H4 Gridinator 9001 (The Beast) 📊
**"IT'S OVER 9000!?!?"**

This is the ultimate testing tool. It takes your workflow and multiplies it into a giant grid.

**What it does:** Want to see what your prompt looks like with `CFG` set to 5, 6, 7, and 8? Want to see it across 3 different Models at the same time? The Gridinator does this in one click.

**Powers Explained:**
*   **Fuzzy Match**: Type "pony" into the Model box, and it will find your "PonyV6_XL.safetensors" checkpoint automatically.
*   **Stutter Syntax**: Use `{cat|dog|fish}` in your prompt. The Gridinator will create a row for Cat, a row for Dog, and a row for Fish.
*   **Sliding Scale**: Auto-generates the numbers for you.
*   **Dynamic Layout**: Automatic label sizing with configurable `Margin` and `Padding` for perfect grids every time.

## 16. H4 DataStream (The Batch Loader) 📡
**"Stream the feed. One frame at a time."**

*   **What it does:** It helps you batch process an entire folder of images, one by one.
*   **The Problem:** Normally, to process 50 images, you have to click Queue 50 times.
*   **The Solution:**
    1.  Click **Queue Prompt** *once*.
    2.  DataStream loads Image #1.
    3.  DataStream sees there are 49 more images.
    4.  It immediately presses the "Queue" button 49 more times for you.

## 17. h4 FaceForge (The Shapeshifter) 🎭
**"The AIO Face Swap Engine"**

This is not just a face swapper. It is a **Face Re-Engineering Engine**. It consolidates swapping, restoring, boosting, upscaling, and occlusion handling into a single, unified pipeline.

**Settings Explained:**
*   `input_image`: The target (The Body/Scene).
*   `source_image`: The source (The Donor Face).
*   `face_model`: (Optional) A pre-built face model.
*   `swap_enabled`: **True** to swap. **False** to pass through (useful for testing restoration only).
*   `face_selection_mode`:
    *   `index`: Pick by number (0=First face).
    *   `center`: Pick the face in the middle.
    *   `largest`: Pick the biggest face.
*   `target_face_index`: "0" is first face. "0,1" swaps the first two faces.
*   `source_face_index`: Usually "0".
*   `restore_enabled`: **True** to run GFPGAN/CodeFormer.
*   `restore_model`: Select the model type.
*   `restore_visibility`: (0.0-1.0) How much of the original face to keep. 0.5 is a nice blend.
*   `upscale_enabled`: **True** to upscale the result.
*   `upscale_face_only`: **True** = Fast (Face only). **False** = Slow (Whole image).
*   `occlusion_enabled`: **True** uses AI (SAM) to find things blocking the face (glasses, hair, hands).
*   `preserve_glasses`: Finds glasses on the original face and pastes them *over* the new face.
*   `preserve_hair`: Keeps original bangs/fringes.

## 18. h4 Identity Engine 3.0 (The Persona Engine) 🧬
**"The Character Studio"**

This node is designed to manage complex characters. It separates "Who they are" from "What they are doing".

**The DNA System:**
*   **`positive_dna`**: This is where you describe the PERSON. (e.g., "blonde, scar on left cheek, cybernetic eye"). These traits should stay constant.
*   **`positive` (Widget)**: This is where you describe the SCENE. (e.g., "sitting in a cafe, drinking coffee"). This changes every shot.
*   **`positive_text` (Input)**: *New in v3.1!* You can now connect a wire here (e.g., from **Dual CLIP Encode** or **Primitive**) to override the widget. This connects the Scene description.
*   **`negative_text` (Input)**: Connect your negative prompt wire here to override the negative widget.
*   **The Magic**: When you hit Queue, the node combines `DNA + Scene` automatically.

**The Preset System:**
*   **Preset Widget**: A drop-down menu of saved characters.
*   **Save Preset**: Saves your current settings (DNA, Face Model, etc.) to a file.
*   **Smart Saving**: When you save, it explicitly **IGNORES** the Scene Prompt. This means you can load a character preset mid-workflow without overwriting your current scene description.

## 19. h4 Face Detailer (The Pore Restorer) 🔍
**"Option B: The Texture King"**

Face Swapping (even with FaceForge) has a limit: The swapper model often creates a 128x128 pixel face. Even when upscaled, it can look "smooth" or "waxy".

**The Face Detailer fixes this by hallucinating pores back into existence.**

**Settings Explained:**
*   `image`: The upscaled image.
*   `model/clip/vae`: Your main checkpoint (SDXL/Pony/SD1.5).
*   `guide_size`: The resolution to process the face at (e.g., 512). Higher = More pores.
*   `steps`: How many sampling steps to take (20 is standard).
*   `denoise`: **CRITICAL SETTING**.
    *   **0.0 - 0.2**: Nothing happens.
    *   **0.25 - 0.35**: The Sweet Spot. Adds texture/pores without changing the face.
    *   **0.4+**: The face starts to change (plastic surgery).
*   `feather_mask`: Softens the edges of the paste so you don't see a visible line.

## 20. h4 Build/Load/Save Face Model 💾
**"The Clone Vats"**

Stop loading the same "face.png" every time. Do it the pro way.

*   **H4 Build Face Model**:
    *   Takes a **BATCH** of images (e.g., 10 photos of the same person).
    *   Blends their math together.
    *   **Result**: A "Super-Embedding" that looks more like the person than any single photo.
    *   **Browse Button**: Yeah, we added a folder browser here too. Just point it at a directory of selfies.

## 21. h4 Dual CLIP Text Encode 🔀
**"The Bridge"**

*   **Problem:** Before v3.1, if you wanted to send your prompt to the Sampler (as Conditioning) AND to the Identity Engine (as Text), you needed two nodes and manual copy-pasting.
*   **Solution:** This node does both.
*   **Inputs:** `text` (String), `clip` (CLIP Model).
*   **Outputs:** `CONDITIONING` (Vector Soup) + `TEXT_OUT` (Raw String).
*   **Use:** Connect `TEXT_OUT` -> `Identity Engine (positive_text)`. Connect `CONDITIONING` -> `KSampler (positive)`. Done.

## 22. H4 Universal Loader (The Skeleton Key) 🗝️
**"One Node to Rule Them All"**

Stop guessing which loader to use. Standard? Diffusers? UNET? GGUF?
This node creates a "Universal Socket" that accepts **ANY** format.

*   **Intelligent Auto-Switching:**
    *   **Safetensors/Ckpt**: Loads as standard Checkpoint.
    *   **Diffusers (Folders)**: Loads as Diffusers Pipeline.
    *   **GGUF**: Uses the "Bridge" to load quantized models (e.g., FLUX, Wan) without needing extra nodes.
*   **Safety Net (Crash Guard)**:
    *   Ever try to load a Lumina model (2560-dim) with a T5-XXL Clip (4096-dim)? Normally, this silently crashes ComfyUI 5 minutes into generation.
    *   **Not anymore.** The Universal Loader scans the model DNA before loading. If it detects a mismatch, it screams at you in the console *before* you waste your time.
*   **Aggressive Memory Management**: It aggressively forces Python Garbage Collection (`gc.collect()`) after large file loads to prevent OOM errors on 8GB cards.

---

# ⚙️ THE DEV CORNER (Technical Specifications)

*> "Show me the code."*

Welcome to the backend. Here is the architectural breakdown of the `h4_Live` toolkit.

## Core Philosophy: Global State & Lazy Evaluation
The toolkit relies on a singleton pattern dictionary `_H4_GLOBAL_STATE` residing in `h4_core.py`. Each node uses `check_lazy_status` to inform the ComfyUI backend about dependency requirements based on the current state tick.

### 1. H4_TrafficRouter / Merge
*   **Class**: `H4_TrafficRouter` / `H4_TrafficMerge`
*   **Logic**: Implements conditional return tuples based on `loop_count`.
*   **Wireless Protocol**: Uses a "Look-Behind" mechanism via `h4_core.get_buffered_image()` to break the Directed Acyclic Graph (DAG) cycle restriction imposed by ComfyUI's execution engine.
*   **Denoise Management**: Denoise is passed as a float and switched atomically with the logic flow, ensuring the sampler always receives the correct noise level for the current loop iteration.

### 2. H4_ImageBuffer
*   **Storage**: `_H4_IMAGE_BUFFER` (Global Variable in `h4_core.py`).
*   **Optimization**: Stores Python object references, not deep copies. This means zero-copy overhead for large tensors.
*   **Validation**: It is "Type Agnostic" (`ANY_TYPE`). It relies on runtime introspection (`type(obj).__name__`) to wrap and log the payload without deserialization.

### 3. H4_FaceForge (AIO Module)
*   **Class**: `H4_FaceForge`
*   **Architecture**: Sequential Pipeline (Swap -> Restore -> Upscale -> Blend).
*   **Dependencies**: `insightface` (swapping), `onnxruntime-gpu` (inference), `segment_anything` (SAM for occlusion), `torch` (tensors).
*   **Memory Safety**: Implements an aggressive `soft_empty_cache()` protocol. Models are moved to CPU or garbage collected between pipeline stages to ensure 8GB VRAM compatibility.
*   **Normalization**: Explicitly normalizes embedding vectors (`L2 Norm`) before `Face` object reconstruction to prevent `AttributeError` in InsightFace when dealing with custom-built models.

### 4. H4_IdentityEngine (Preset System)
*   **Frontend**: `js/h4_IdentityEngine.js`.
*   **Preset Logic**: Uses a custom `getSettings()` function that filters out `positive` (Scene) text widgets before serializing to JSON.
*   **Validation**: Implements a `remove/create/replace` widget strategy to force `COMBO` widget rendering on browsers that cache the legacy `TEXT` widget definition.
*   **Backend Validation**: Implements permissive list checking (accepts both `"None"` and `"none"`) to prevent case-sensitivity validation errors during graph execution.

### 5. H4_FaceDetailer (Integration)
*   **Class**: `H4_FaceDetailer`
*   **Pipeline**: Detect (InsightFace) -> Crop (Pillow) -> Resize (Lanczos) -> KSampler (Comfy Standard) -> Mask (Soft Ellipse with Feathering) -> Paste (Alpha Blend).
*   **Safety**: Seed generation is explicitly capped at `2^63 - 1` (Signed INT64 Max) to prevent `OverflowError` during C++ unpacking in the KSampler backend (C++ `long long` limit).
*   **Preview**: Enforces `512x512` resize on debug crops (`torch.cat`) to ensure the preview tensor stack has uniform dimensions, preventing batch crashes.

### 6. H4_Varianator
*   **Class**: `H4_Varianator`
*   **Logic**: Wraps `nodes.KSampler` in a `for` loop, generating a new seed for each iteration.
*   **Profiles**: `minimal` (0.3-0.4 denoise), `moderate` (0.4-0.5), `major` (0.5+).
*   **Randomness**: Uses a seeded `random.Random` instance separate from the global Torch seed. This ensures that variations are reproducible if the input seed is fixed, even if the global torch state changes.

### 7. H4_BigBrother (Frontend)
*   **Type**: ComfyUI Frontend Extension (`litegraph` hook).
*   **Canvas**: Uses a `pointer-events: none` overlay canvas aligned via `ctx.setTransform` on every `requestAnimationFrame` to draw neon bezier curves over the existing connections.
*   **Privacy**: Log sanitization uses regex to strip `%USERPROFILE%`, IPs, and Emails before display.
*   **Note**: There is a hidden toggle in the settings. If you click it, it toggles a specific filter in the FaceForge backend. We won't say what it does, but if the console says "Boobies Activated", you know what time it is.
*   **Caffeine Integration**: Injects a fixed-position DOM element (`#h4-caffeine-toggle`) that calls `navigator.wakeLock.request('screen')`. It maintains a `_wakeLockSentinel` reference and listens for `visibilitychange` events to re-acquire the lock if the user minimizes or tabs away from the browser.

### 8. H4_DualCLIPTextEncode
*   **Class**: `H4_DualCLIPTextEncode`
*   **Purpose**: Topological bridge for simultaneous Sampler/Identity connectivity.
### 8. H4_DualCLIPTextEncode
*   **Class**: `H4_DualCLIPTextEncode`
*   **Purpose**: Topological bridge for simultaneous Sampler/Identity connectivity.
*   **Logic**: Performs standard CLIP encoding (`clip.tokenize` -> `clip.encode_from_tokens`), but creates a return tuple that includes the unmodified input string as a secondary output. This bypasses the need for primitive node synchronization when driving both generation and character logic from a single source.

### 9. H4_UniversalLoader (GGUF Bridge & Validations)
*   **Class**: `H4_UniversalLoader`
*   **Architecture**: Facade Pattern for `comfy.sd.load_checkpoint`, `comfy.diffusers_load`, and `ComfyUI-GGUF`.
*   **GGUF Bridge**: Uses `importlib` and `sys.modules` introspection to dynamically detect and utilize the `ComfyUI-GGUF` custom node if specific GGUF models are detected.
*   **Runtime Guard**: Implements `_validate_model_clip(model, clip)`. This method performs a structural analysis of the Model Config object. If it detects a `Lumina` or `NextDiT` architecture (which expects 2560 context dim) paired with a `T5` XXl Text Encoder (which outputs 4096 context dim), it warns the user via `print()` instead of allowing the `torch.matmul` operation to fail during sampling.
*   **Repair Clinic**: Includes a self-contained dependency module (`h4_repair_clinic.py`) that executes via sub-shell to forcefully resolve version conflicts between `diffusers` (which pushes bleeding edge) and `unknown-peft` (which demands legacy versions), ensuring compatibility.

---

<div align="right">

(b'.')b - h4 - {Be Your Best}

</div>
