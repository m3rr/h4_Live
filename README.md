# h4_Live: The Logic & Loop Controller v3.0 { Now with DNA! }
![Version](https://img.shields.io/badge/version-3.0--Beta-blueviolet) ![Status](https://img.shields.io/badge/status-Nuclear-red) ![ComfyUI](https://img.shields.io/badge/platform-ComfyUI-succes)

> **"A Railway Switch for your Workflow."**

---

### 🤔 What is "Live"?

So... this started simply enough. We just wanted a switch node. You know, something simple to swap between two inputs.

But then we fell down a rabbit hole. A deep, heavily caffeinated rabbit hole. ☕🐇

We started adding features. Then we added more features. Then we realized "Hey, we need a better way to test this." So we built testing tools. Then we got bored and wanted to verify face swaps, so we built a face swap engine. It became a labor of love, hate, and the occasional pot break.

It is no longer just a switch. It is a **full utility belt**. A suite of tools that has taken on a life of its own.

**h4_Live gives your robot a brain.** 🧠

It allows your workflow to be **Organic**. It allows it to **Count**. It allows it to **Remember**.
Instead of just making one image and forgetting it happened, you can tell ComfyUI:
*"Hey, make an image. Now, take that image, and fix it. Now take that fixed image, and upscale it. Do this 5 times, but on the 3rd time, change the settings."*

We hide the scary math and the complex logic behind friendly, easy-to-use nodes so you can focus on being an Artist, not a Programmer.

---

# 📚 THE CASUAL GUIDE (For Humans)

Here is everything you need to know about the tools in this kit. No jargon. No math. Just how to use them.

## 1. H4 Traffic Router (The Nexus) 🚦
**"The Brain"**

This is the most important node in the pack. It combines a "Splitter" (deciding where to go) and a "Merger" (combining things) into one smart box.

*   **What it does:** It takes two inputs: a "Starter" (e.g., an empty canvas) and a "Looper" (e.g., the finished painting). On the very first run (Run 0), it picks the Starter. On every run after that (Run 1, 2, 3...), it picks the Looper.
*   **Why use it?** It automates the "Feedback Loop". You don't need to manually switch wires.
*   **Bonus:** It also switches your "Denoise" setting automatically! (High denoise for the start, low denoise for the polishing loops).

**Settings:**
*   `first_denoise`: The denoise strength for the very first frame (creation).
*   `loop_denoise`: The denoise strength for all subsequent frames (refinement).

## 2. H4 Traffic Merge (The Zipper) 🤐
**"The Safe Connector"**

This is the "Little Brother" of the Router. It only does one thing: It merges two customized streams into one.

*   **What it does:** It listens to the Loop Counter. If it's Run 0, it opens Gate A. If it's Run 1+, it opens Gate B.
*   **Why is it "Safe"?** ComfyUI hates empty wires. If you unplug something, it crashes. The Zipper ensures that *something* is always connected, so your workflow never explodes.

**Settings:**
*   `loop_input`: The data to use on Loop 1+. If not connected, it tries to grab the last image from memory (The Buffer).

## 3. H4 Traffic Cop (Legacy Splitter) 👮
**"The Old Reliable"**

*Note: This is an older node. We recommend the **Router**, but the Cop is still on duty.*

*   **What it does:** It takes ONE input and sends it to TWO places.
*   **Feature:** It uses "Safe Passthrough". Even if a road is closed, it sends "Ghost Data" down it so your nodes dont turn red and cry.

## 4. H4 Image Buffer (The Anti-Lag) 📦
**"The Wireless Warehouse"**

Understanding this node is the key to preventing headaches.

*   **The Problem:** When you make a loop in ComfyUI, data has to travel physically through wires. Sometimes, the data takes too long to get back to the start, and you get a "Cycle Error" (The Ouroboros Snake biting its own tail).
*   **The Solution:** The Image Buffer catches the data and stores it in RAM (Memory). It effectively "Snips" the wire, allowing you to send data wirelessly from the end of your workflow back to the start without confusing ComfyUI.

## 5. H4 State Monitor (The Scoreboard) 🔢
**"The Counter"**

*   **What it does:** It just tells you what loop number you are on.
*   **Use:** Connect it to a Text Display node to see "Run: 5" on your screen. Useful for knowing when to stop.

## 6. H4 Loop Incrementer (The Clicker) ➕
**"The Engine"**

Usually, the **Router** handles counting for you. But sometimes, you want manual control.
*   **What it does:** Every time this node runs, it adds +1 to the global counter.
*   **Feature:** It has a "Wireless Reset" port. If you press the Red Button (see below), this node catches the signal and resets the count to 0.

## 7. H4 Wireless Reset (The Red Button) 🔴
**"The Eject Seat"**

*   **The Problem:** You are on Loop 50, but you want to start over.
*   **The Solution:** Toggle this switch to `True`. The next time your workflow runs, it sends a wireless signal to the **Incrementer** or **Router** screaming "RESET!". The counter drops to 0, and you start fresh.
*   **Tip:** Don't forget to turn it off after you reset!

## 8. H4 Context Hub (The Mothership) 🛸
**"The One Wire to Rule Them All"**

Tired of spaghetti workflows? Do you have 50 wires crossing over each other?

*   **What it does:** It takes all your standard stuff (Model, VAE, CLIP, Positive Prompt, Negative Prompt, Latent, Image) and bundles them into ONE single blue wire called a `PIPE`.
*   **Bonus:** It prints a detailed report in your console telling you exactly what is inside (Shapes, Types, etc).

**Inputs:**
*   `any_A`: A slot for literally anything else you want to pack (ControlNet, Mask, Lunch).
*   `any_B`: Another slot for anything.

## 9. H4 Context Unpack (The Distributor) 📤
**"The Unpacker"**

*   **What it does:** It takes the single `PIPE` wire from the Mothership and unpacks it back into all the individual connections.
*   **Use:** Put the Hub at the start of your workflow and the Unpack at the end. Now you have a clean, wire-free workspace in the middle!

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

*   **Settings:**
    *   `mode`:
        *   `fixed`: Keeps the seed the same forever.
        *   `increment`: Adds +1 every time.
        *   `random`: Pure chaos.
    *   `random_digits`: Want to generate a seed like "1999" but not "123456789"? Set this to 4. Good for hunting specific "vibes" in models that react to seed length.

## 14. H4 Varianator (The Riff Machine) 🎸
**"Play it again, Sam... but different."**

This node takes an image (latent) and remixes it. It's like asking a jazz musician to play a specific song, but add their own flair.

*   **Settings:**
    *   `variation_count`: How many versions do you want? (1-16).
    *   `variation_profile`:
        *   `minimal`: Subtle changes. Same person, different expression.
        *   `moderate`: Noticeable changes. Same person, different haircut.
        *   `major`: Identity shift. Cousin of the person.
    *   `seed_mode`: Should the variations follow a pattern or be totally random?

## 15. H4 Gridinator 9001 (The Beast) 📊
**"IT'S OVER 9000!?!?"**

This is the ultimate testing tool. It takes your workflow and multiplies it into a giant grid.

*   **What it does:** Want to see what your prompt looks like with `CFG` set to 5, 6, 7, and 8? Want to see it across 3 different Models at the same time? The Gridinator does this in one click.
*   **Powers:**
    *   **Fuzzy Match**: Type "pony" and it finds your PonyV6 checkpoint.
    *   **Stutter**: Type a prompt like "A {cat|dog|fish}" and it makes a grid for each animal.
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
*   **Features:**
    *   **📁 Browse Button**: Opens a real Windows folder picker (no more copy-pasting paths!).
    *   **Live Preview**: Shows you exactly which image is processing and how far along you are.

## 17. h4 FaceForge (The Shapeshifter) 🎭
**"The AIO Face Swap Engine"**

This is not just a face swapper. It is a **Face Re-Engineering Engine**. It consolidates swapping, restoring, boosting, upscaling, and occlusion handling into a single, unified pipeline.

*   **Powers:**
    *   **Swap**: Auto-detects InsightFace, ReSwapper, or HyperSwap models.
    *   **Restore**: Integrated face restoration (GFPGAN, CodeFormer) to fix low-res faces.
    *   **Boost**: Enhances face detail *during* the swap process for better blending.
    *   **Upscale**: Built-in 4x/8x upscaling (UltraSharp, NMKD) to make the result crisp.
    *   **Occlusion Handling (SAM)**: Uses Segment Anything Model (SAM) to intelligently handle glasses, hair, and accessories.
    *   **Memory Safe 🛡️**: Includes an aggressive "VRAM Flush" Protocol. It explicitly offloads models to CPU between steps, preventing crashes on 8GB cards.

## 18. h4 Identity Engine 3.0 (The Persona Engine) 🧬
**"The Character Studio"**

This node is designed to manage complex characters. It separates "Who they are" from "What they are doing".

*   **The DNA System**:
    *   **`positive_dna`**: This new box stores persistent character traits (e.g., "blonde, scar on left cheek, cybernetic eye").
    *   **`positive` (Scene)**: This box describes the action (e.g., "riding a motorcycle").
    *   **The Logic**: When you hit Queue, the node combines `DNA + Scene` automatically.
 
*   **The Preset System**:
    *   You can **Save** your character settings as a preset (e.g., "MaLi").
    *   **Smart Saving**: When you save a preset, it remembers the **DNA** but ignores the **Scene**.
    *   **Benefit**: You can load your "MaLi" preset into a "Riding a Motorcycle" scene, and she will appear there instantly without erasing your scene prompt.

## 19. h4 Face Detailer (The Pore Restorer) 🔍
**"Option B: The Texture King"**

Face Swapping (even with FaceForge) has a limit: The swapper model often creates a 128x128 pixel face. Even when upscaled, it can look "smooth" or "waxy".

**The Face Detailer fixes this by hallucinating pores back into existence.**

*   **Workflow**: `FaceForge (Swap)` -> `Pixel Press (Upscale)` -> `Face Detailer`.
*   **How it works**:
    1.  It detects the face in your high-res image.
    2.  It crops it out.
    3.  It runs a standard Stable Diffusion "Img2Img" pass on *just that crop* using your original Model/LoRA.
    4.  It blends the high-texture result back into the image.
*   **Result**: 4K skin texture on a swapped face.

## 20. h4 Build/Load/Save Face Model 💾
**"The Clone Vats"**

Stop loading the same "face.png" every time. Do it the pro way.

*   **H4 Build Face Model**:
    *   Takes a **BATCH** of images (e.g., 10 photos of the same person).
    *   Blends their math together.
    *   **Result**: A "Super-Embedding" that looks more like the person than any single photo.
    *   **Browse Button**: Yeah, we added a folder browser here too. Just point it at a directory of selfies.

*   **H4 Save Face Model**: Saves your built model to disk.
*   **H4 Load Face Model**: Loads it back in.

## 21. H4 Big Brother (Ghost Layer) 👁️
**"The Eye in the Sky"**

This isn't a node. It's a **Visual Layer** for ComfyUI itself.

*   **What it does:** It makes your wires **GLOW**. When you click a node, Big Brother highlights every connection going in and out of it in neon green (or pink, or whatever you want).
*   **Why?** Because spaghetti workflows are hard to read. Big Brother makes them readable.
*   **Death Modal**: If your workflow crashes, Big Brother catches the error and shows you a sanitized report that hides your PC Name and IP so you can screenshot it safely.

---

# ⚙️ THE DEV CORNER (Technical Specifications)

*> "Show me the code."*

Welcome to the backend. Here is the architectural breakdown of the `h4_Live` toolkit.

## Core Philosophy: Global State & Lazy Evaluation
The toolkit relies on a singleton pattern dictionary `_H4_GLOBAL_STATE` residing in `h4_core.py`. Each node uses `check_lazy_status` to inform the ComfyUI backend about dependency requirements based on the current state tick.

### 1. H4_TrafficRouter / Merge
*   **Class**: `H4_TrafficRouter` / `H4_TrafficMerge`
*   **Logic**: Implements conditional return tuples based on `loop_count`.
*   **Wireless Protocol**: Uses a "Look-Behind" mechanism via `h4_core.get_buffered_image()` to break the Directed Acyclic Graph (DAG) cycle restriction.

### 2. H4_ImageBuffer
*   **Storage**: `_H4_IMAGE_BUFFER` (Global Variable).
*   **Optimization**: Stores references, not deep copies (zero-copy overhead).

### 3. H4_FaceForge (AIO Module)
*   **Class**: `H4_FaceForge`
*   **Architecture**: Sequential Pipeline.
*   **Dependencies**: `insightface`, `onnxruntime-gpu`, `segment_anything`, `torch`.
*   **Memory Safety**: Implements an aggressive `soft_empty_cache()` protocol. Models are moved to CPU or garbage collected between pipeline stages (Swap -> Restore -> Upscale) to ensure 8GB VRAM compatibility.
*   **Normalization**: Explicitly normalizes embedding vectors (`L2 Norm`) before `Face` object reconstruction to prevent `AttributeError` in InsightFace.

### 4. H4_IdentityEngine (Preset System)
*   **Frontend**: `js/h4_IdentityEngine.js`.
*   **Preset Logic**: Uses a custom `getSettings()` function that filters out `positive` (Scene) text widgets before serializing to JSON.
*   **Validation**: Implements a `remove/create/replace` widget strategy to force `COMBO` widget rendering on browsers that cache the legacy `TEXT` widget definition. Backend validation implements permissive list checking (`None` vs `none`) to prevent casing crashes.

### 5. H4_FaceDetailer (Integration)
*   **Class**: `H4_FaceDetailer`
*   **Pipeline**: Detect (InsightFace) -> Crop (Pillow) -> Resize (Lanczos) -> KSampler (Comfy Standard) -> Mask (Soft Ellipse with Feathering) -> Paste (Alpha Blend).
*   **Safety**: Seed generation is explicitly capped at `2^63 - 1` (Signed INT64 Max) to prevent `OverflowError` during C++ unpacking in the KSampler backend.
*   **Preview**: Enforces `512x512` resize on debug crops to ensure `torch.cat` valid tensor stacking.

### 6. H4_Varianator
*   **Class**: `H4_Varianator`
*   **Logic**: Wraps `nodes.KSampler` in a loop.
*   **Profiles**: `minimal` (0.3-0.4 denoise), `moderate` (0.4-0.5), `major` (0.5+).
*   **Randomness**: Uses a seeded `random.Random` instance separate from the global Torch seed for reproducibility of detail variations.

### 7. H4_BigBrother (Frontend)
*   **Type**: ComfyUI Frontend Extension.
*   **Canvas**: Uses a `pointer-events: none` overlay canvas aligned via `ctx.setTransform` on every `requestAnimationFrame`.
*   **Privacy**: Log sanitization uses regex to strip `%USERPROFILE%`, IPs, and Emails before display.
*   **Note**: There is a hidden toggle in the settings. If you click it, it toggles a specific filter in the FaceForge backend. We won't say what it does, but if the console says "Boobies Activated", you know what time it is.

---

<div align="right">

(b'.')b - h4 - {Be Your Best}

</div>
