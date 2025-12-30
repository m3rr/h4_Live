# h4_Live: The Logic & Loop Controller

![Version](https://img.shields.io/badge/version-1.0.0-blueviolet) ![Status](https://img.shields.io/badge/status-Nuclear-red) ![ComfyUI](https://img.shields.io/badge/platform-ComfyUI-succes)

**"The Railway Switch for your Workflow."**

Hi there! Welcome to `h4_Live`. If you are new to ComfyUI, think of this tool as the "Memory" for your robot. Normally, ComfyUI has the memory of a goldfish—it runs once and forgets everything. This set of nodes gives it a brain that can count.

It allows you to say: *"Do THIS on the first run, but do THAT on the second run."*

---

## ⚡ Installation

1.  **Locate Folder**: Go to your ComfyUI folder.
2.  **Navigate**: Open `ComfyUI/custom_nodes/`.
3.  **Drop**: Copy the entire `comfyui_h4_live` folder into `custom_nodes/`.
4.  **Restart**: Restart ComfyUI completely.
5.  **Verify**: You should see a cool matrix-style table in your console window with green checkmarks ✅.

---

## 🧸 The Nodes (Explained Simply)

We have three main tools for you.

### 1. H4 Traffic Merge (The Zipper) ⭐ **Start Here**
**"The Safe One"**

Imagine you have two conveyor belts.
*   **Belt A (Run Once)** has your "Starter" items (like an empty canvas).
*   **Belt B (Loop)** has your "Finished" items (like a painted picture).

You want to send one of them into your machine, but not both at the same time.
*   **On Run 0 (The Start)**: The Zipper opens gate A. The empty canvas goes in.
*   **On Run 1+ (The Loop)**: The Zipper closes gate A and opens gate B. The painted picture goes in to be painted again!

**Why is it safe?**
Because your machine (KSampler) *always* gets something. It never gets an empty "Ghost" signal, so it never crashes.

### 2. H4 Traffic Cop (The Splitter)
**"The Advanced One"**

This is the opposite of the zipper. It takes one signal and splits it into two paths.
*   **On Run 0**: It sends data to the Top Road. The Bottom Road is dead (Empty).
*   **On Run 1+**: It sends data to the Bottom Road. The Top Road is dead (Empty).

**⚠️ WARNING**: If you connect a node to the "Dead" road, it will crash because it receives "Nothing" (NoneType). Only use this if you know how to handle dead signals!

### 3. H4 State Monitor (The Counter)
**"The Scoreboard"**

This little box just tells you what number loop you are on.
*   Connect it to a "Show Text" node or similar if you just want to see the number.
*   It helps you know if your reset trigger worked.

---

### 4. H4 Context Hub & Unpack (The Mothership) 🛸
**"The One Wire to Rule Them All"**

Tired of spaghetti wires?
*   **Context Hub**: Plug *everything* into this (Model, VAE, CLIP, Image, Latent). It does two things:
    1.  **Bundles** all wires into a single `H4_PIPE`.
    2.  **Logs** a detailed report to the console (shapes, types, devices) for debugging.
*   **Context Unpack**: Takes that single `H4_PIPE` wire and gives you back all your connections on the other side of your workflow.

---

---

### 5. H4 Smart Console (Inline Debugger) 🧠
**"The X-Ray Machine"**

A simple, powerful inline debugger that shows you exactly what is flowing through your wires.

*   **How to use**: Place it **between** any two nodes. (e.g., Checkpoint -> Smart Console -> KSampler).
*   **What it does**: It passes the data through unchanged, but prints detailed stats to your Console and the Node itself.

**Modes:**
1.  **Normal (Default)**: Shows Type, Shape, Device. Good for quick checks.
2.  **🔥 +ULTRA Mode**:
    *   Inspects Tensors deeply (Min, Max, Mean, Gradients).
    *   Inspects Objects (Attributes, Keys).
    *   Use this when you are hunting complex bugs (NaNs, wrong devices).

---

## 🧠 How to Build a Basic Loop

**The Goal**: Create an image, then keep fixing it over and over (Feedback Loop).

1.  **The Box**: Get a `H4 Traffic Merge` node.
2.  **The Setup**: Connect an `Empty Latent Image` to the top slot (`run_once_input`).
3.  **The Loop**: Place a `{h4-DEBUG} Receiver` and connect it to the bottom slot (`loop_input`). Set the key to `loop_signal`.
4.  **The Machine**: Connect the **Output** of the Merge node to your **KSampler**.
5.  **The End**: At the end of your workflow (Image Save), attach a `{h4-DEBUG} Sender` and set key to `loop_signal`.

**The Logic**:
1.  **Sender** beams the finished image to `loop_signal`.
2.  **Receiver** catches it.
3.  **Traffic Merge** grabs it on Run 1+ and feeds it back in.

---

## 🚫 Common Mistakes (Please Read!)

### "The Red Box Explosion" (IndexError / NoneType Error)
**Diagnosis**: You plugged an **Image** into a hole that demands a **Latent**.
**Explanation**: The `Traffic Merge` is a universal pipe—it lets *anything* through. But the node *after* it (usually a KSampler) is picky.
*   KSamplers eat **Latents** (Pink wires).
*   KSamplers explode if you feed them **Images** (Blue wires).
**Fix**: Make sure whatever you plug into `loop_input` matches `run_once_input`. If you are looping images, convert them to Latents with a `VAE Encode` first!

### "The Zombie Counter"
**Diagnosis**: You stopped the workflow, changed some settings, and hit run, but it started at "Loop 6" instead of 0.
**Explanation**: The memory lives in the background. It doesn't know you changed settings.
**Fix**:
1.  Tick the `restart_on_true` box (set to True).
2.  Run once. (This nukes the memory to 0).
3.  Tick it back to False.
4.  Run normally.

---

## 🔌 Compatibility
*   **Standard Nodes**: 100% Compatible.
*   **SDXL**: Yes.
*   **SD1.5**: Yes.
*   **Pony**: Yes.
*   **Does it install viruses?**: No. We follow a "Nuclear Debugging" protocol. We log everything to the console so you can see exactly what is happening.

---

[m3rr/h4_Live](https://github.com/m3rr/h4_Live)

<div align="right">
  (b ' . ' )b - h4 - { Be Your Best }
</div>
