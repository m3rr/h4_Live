# 🚦 The Nexus: H4_TrafficRouter
### *Feature Node: H4_TrafficRouter*

Welcome to **The Nexus**.
While `H4_TrafficMerge` is a simple gate, the **H4_TrafficRouter** is a full-blown Highway Interchange.

This node was built to solve the single most annoying problem in ComfyUI Looping: **Parameter Management**.
When you loop, you usually want the *first* frame to behave differently than the *next* frames (e.g., High Denoise to create, Low Denoise to refine). The Router handles this automatically.

---

## 🧠 The Concept: Timeline Branching
Imagine your workflow has two timelines.
1.  **Timeline A (Creation)**: Where you need strong settings (Denoise 1.0) to hallucinate an image from empty noise.
2.  **Timeline B (Evolution)**: Where you need gentle settings (Denoise 0.5) to morph that image slightly.

The Router takes two inputs (Start Data & Loop Data) and two settings (Start Denoise & Loop Denoise/Settings), and it outputs a single, consistent stream to your KSampler.

---

## 🗺️ Logic Flow Chart (ASCII)

```ascii
     [ RUN 0: CREATION ]                 [ RUN 1+: EVOLUTION ]
             |                                   |
    (Empty Latent + Denoise 1.0)    (Buffer Latent + Denoise 0.45)
             |                                   |
             +-----------------+-----------------+
                               |
                    [ 🚦 H4_TRAFFIC_ROUTER ]
                               |
          +--------------------+--------------------+
          |    (Internal Logic: Check Loop Count)   |
          +--------------------+--------------------+
                               |
                  [ SELECTED STREAM (Context) ]
                               |
                               v
                       [ K-SAMPLER ]
                       | Input:   <-- [Context_Out] (The Data)
                       | Denoise: <-- [Denoise_Val] (The Float)
```

---

## �️ Detailed Walkthrough of Inputs

### 1. The Controls (Left Side)
*   **first_denoise** (`FLOAT`): The strength of the AI for the very first frame.
    *   *Recommendation:* **1.00** (Full Creation).
*   **loop_denoise** (`FLOAT`): The strength for every subsequent frame.
    *   *Recommendation:* **0.40 - 0.60**.
    *   *0.1*: Barely changes content (good for denoising/upscaling).
    *   *0.5*: Fluid animation/morphing.
    *   *0.9*: Rapid, chaotic shifting.
*   **restart** (`BOOLEAN`): **The Kill Switch.**
    *   If set to `True`, the internal counter snaps back to 0 immediately.
    *   *Usage:* Connect this to a Toggle Switch or `H4_WirelessResetButton` logic.

### 2. The Data (Inputs)
*   **first_run_in** (`ANY`): Connect your "Start" data here. (e.g., `EmptyLatentImage`).
*   **loop_run_in** (`ANY`): Connect your "Feedback" data here. (e.g., `H4_ImageBuffer`).
    *   *Note:* Unlike the simpler Merge node, the Router requires you to **Physically Connect** the loop input wire in this version.

### 3. The Outputs (Right Side)
*   **Context_Out**: This is the selected data. Connect it to the "latent_image" input of your Sampler.
*   **Denoise_Val**: This is the selected number. Connect it to the "denoise" input of your Sampler.

---

## ⚡ Pro Tip: The "Restart" Trap
A common frustration: You create a cool loop, stop it, and try to run it again... but it starts at Frame 15!
**Why?** The node has persistent state. It remembers where it left off.
**Fix:**
1.  Flip `restart` to True.
2.  Run one frame (it rests to 0).
3.  Flip `restart` back to False.
4.  OR: Use the **H4_MissionControl** module to manage runs automatically.

---
<div align="right">
  (b'.')b - h4 - { Be Your Best }
</div>
