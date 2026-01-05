# 🔄 The Simple Wireless Loop
### *Featured Nodes: H4_TrafficMerge, H4_ImageBuffer*

Welcome to the **Standard Wireless Loop**.
This is the foundational logic of the H4 ToolKit. If you master this, you master looping in ComfyUI.

The goal of this workflow is to generate an image, and then feed that image (or its latent representation) *back* into the start of the next generation cycle, allowing for evolution, animation, and iterative refinement.

---

## 🧠 The Concept: The Zipper & The Bucket
ComfyUI graphs are usually linear (Start -> Finish). Loops break this rule. To make a loop safe and robust, we separate the "Traffic Control" from the "Data Storage".

### 1. H4_TrafficMerge (The Zipper) 🤐
This node is the **Entrance Gate**. It sits right before your main processing block (usually a KSampler).
*   **Role**: It decides *which* data gets to pass through.
*   **Run 0 (Start)**: It opens the **Top Input** (`run_once_input`). This lets your initial command (like an Empty Latent) enter the system.
*   **Run 1+ (Loop)**: It zips the Top Input shut and opens the **Bottom Input** (`loop_input`). This lets the feedback data enter.

### 2. H4_ImageBuffer (The Magic Bucket) 📦
This node is the **Data Warehouse**. It sits at the very end of your processing block.
*   **Role**: It catches the result of the generation and holds it safe.
*   **Anti-Lag**: Standard loops in ComfyUI often have a "1-frame lag" where data takes a cycle to travel back. The Buffer fixes this by acting as a persistent storage container that exists *outside* of the standard execution flow.
*   **Wireless**: The `TrafficMerge` node knows how to "phone" this buffer wirelessly. This means you don't need to drag a giant ugly wire from the end of your graph back to the start.

---

## 🗺️ Logic Flow Chart (ASCII)

```ascii
     [ RUN 0: START ]                    [ RUN 1+: PREVIOUS FRAME ]
            |                                       |
    (Empty Latent)                            (From Buffer)
            |                                       |
            v                                       v
   +-----------------------------------------------------------+
   |                 H4_TRAFFIC_MERGE (Zipper)                 |
   |                                                           |
   |   IF Run == 0:  PASS (run_once_input) --+                 |
   |   IF Run >= 1:  PASS (loop_input) ------+                 |
   |                                         |                 |
   +-----------------------------------------+-----------------+
                                             |
                                     (Selected Latent)
                                             |
                                             v
                                     [ K-SAMPLER ] <-------+
                                             |             |
                                             v             |
                                     [ VAE DECODE ]        | (Loop Logic)
                                             |             |
                                             v             |
                                     [ IMAGE SAVE ]        |
                                             |             |
   +-----------------------------------------+-------------+
   |            H4_IMAGE_BUFFER (Bucket)                   |
   |                                                       |
   |  <-- (Captures Output for NEXT Frame)                 |
   +-------------------------------------------------------+
```

---

## 🛠️ Detailed Wiring Guide

### Step 1: The Setup (Run 0)
1.  Create an **EmptyLatentImage** node (for Txt2Img) or a **LoadImage** (for Img2Img).
2.  Connect it to `H4_TrafficMerge` -> `run_once_input`.
3.  Set `first_denoise` to **1.00** (Full generation) or lower if doing Img2Img.

### Step 2: The Core
1.  Connect `H4_TrafficMerge` -> `Selected_Output` to your **KSampler** -> `latent_image`.
2.  Connect `H4_TrafficMerge` -> `Denoise_Val` to your **KSampler** -> `denoise`.
    *   *Note: This allows the node to automatically lower the denoise for loop frames!*

### Step 3: The Result & Buffer
1.  Let your KSampler run.
2.  **CRITICAL:** Take the **OUTPUT** of the KSampler (the `LATENT` output) and connect it to `H4_ImageBuffer`.
    *   *Why?* Because `TrafficMerge` is feeding Latents into the Sampler. Therefore, the Buffer must hold Latents.
    *   *Rule:* **"The Loop must eat what it spits out."**

### Step 4: The Wireless Link
1.  Leave the `loop_input` on `H4_TrafficMerge` **DISCONNECTED**.
2.  When the node runs in Loop Mode (Run 1+), it will automatically scan your workflow for an `H4_ImageBuffer` and grab the data from it.

---

## ⚠️ Troubleshooting & Type Safety
The #1 cause of crashes is **Type Mismatch**.
*   **Scenario:** You start with a **Latent**.
*   **Mistake:** You connect the **Pixel Image** (from VAE Decode) into the Buffer.
*   **Crash:** The Loop tries to shove a Pixel Image into the KSampler's Latent port. `IndexError`.
*   **Solution:** The Buffer must be connected to the **SAME DATA TYPE** as the `run_once_input`. Latent in, Latent out.

---
<div align="right">
  (b'.')b - h4 - { Be Your Best }
</div>
