# H4_DoubleSampler - The Omni-Hub Upgrade

Welcome to the **H4_DoubleSampler**, the absolute beating heart of your generation workflow. This isn't just a sampler; it's a high-performance orchestration hub designed to take your prompts, smash them into a billion pieces, and reconstruct them into something you actually want to look at. We’ve just finished a massive upgrade that brings the **Chaos Engine Subsystem** directly into the interface.

---

## ⚡ The Big "Hammer" Walkthrough

If you're wondering how to get started, it's simple: plug in your usual suspects (Model, CLIP, VAE, Latents) and start cranking. But if you want to find the real magic, you need to look at the bottom.

### ⚡ ENGAGE CHAOS ENGINE
See that big flashy orange button at the bottom of the node? Click it. This opens the **Chaos Drawer**. We tucked all the "weird" settings inside this sliding panel to keep the node from looking like a giant wall of switches when you just want a standard generation. 

Once inside the drawer, you have access to the **Chaos Engine**. Its whole job is to take your prompt and randomly inject weights (intensities) into words while you aren't looking. This is the ultimate "I'm stuck, show me something cool" button.

### 🧪 Every Knob Explained (The Casual Guide)

#### **The Core Settings**
*   **Seed**: The DNA of your image. This number kicks off the noise. Even a one-digit change creates a whole new world.
*   **Steps**: How many times the model looks at the noise to find an image. More steps = more detail, but don't go too crazy or it gets deep-fried.
*   **CFG**: How hard the model listens to your prompt. 7-9 is the sweet spot. Go higher (15+) for aggressive style; go lower (4-5) for "dreamy" vibes.
*   **Sampler/Scheduler**: The math behind the magic. Just stick with `euler` and `normal` if you’re new, or `dpmpp_2m` and `karras` if you want that crispy modern look.

#### **The Chaos Engine (Hidden in the Drawer)**
*   **Chaos Mode**: This is the pattern-setter. 
    *   `Pure Chaos`: Hammers EVERY word with random weight.
    *   `Odds/Evens`: Only hits every other word. Keeps some structure while getting weird.
    *   `Random Pulse`: Hits words like a heartbeat. Unpredictable and great for discovery.
*   **Chaos Batch**: Set this to 4 or 6. It will run the generation that many times in a row, each one with totally different random prompt weights. It's like a slot machine for art.
*   **Chaos Range**: Defaults to `-1.0 to 1.5`. The `1.5` side makes things super intense and detailed. The `-1.0` side tries to "subtract" the word entirely.
*   **Show Legend**: Toggling this ON burns a little diagnostic board into the top-left of your preview image. It shows the Seed, CFG, and steps so you can recreate it later even if you lose the workflow file.

---

## 🛠️ THE DEV CORNER (Jargon Level: MAXIMUM)

For the technical architects and latent-space navigators, here is the low-level breakdown of the **H4_DoubleSampler's** internal state-machine and execution logic.

### **Asynchronous Batch Orchestration**
The node implements a deterministic batching loop that overrides standard linear execution. When `chaos_batch` is $\mathbb{N} > 1$, the internal function `execute_sampling` initiates a repetitive sampling sequence. For each index $i \in \{0 \dots N-1\}$, the global seed is incremented by $i$ to maintain pseudo-random determinism across the stack.

### **Surgical Token Weighting Injection**
The **Chaos Engine** operates on a pre-tokenization string-level parsing algorithm. It identifies "Protected Tokens" (Regex: `BREAK`, `(`, `)`, `:`, etc.) and excludes them from the randomization pool. Eligible tokens are then encapsulated in weighting tuples `(token:weight)` where $weight \sim \mathcal{U}(min\_w, max\_w)$. This modified string is then passed to the `CLIP` encoder in real-time, bypassing static conditioning caches to ensure every batch iteration has a unique latent-guidance vector.

### **Diagnostic Metadata Pass-Through**
We have implemented 5 dedicated **Output Shuttles** (`SEED_OUT`, `CFG_OUT`, etc.). These pins are dynamically bound to the internal state values post-execution. They enable downstream graph logic to capture the "Truth" of a generation, especially useful when using global randomization or sliding CFG scales.

### **Post-Process Pixel Layering (The Legend)**
The legend rendering is performed via a `PIL.ImageDraw` injection layer. After the `latent_image` is decoded via the `VAE`, the resulting image tensor is cast to a `numpy` array, parsed into a pixel-buffer, and overlaid with a text-shadowed diagnostic board. This ensures that the generated `IMAGE` output carries its own identity manifest without requiring sidecar JSON files.

### **CFG Sliding Scale Dynamics**
When `cfg_sliding_scale` is active, the model undergoes a linear interpolation of the Guidance Scale across the sampling steps. This reduces typical CFG "burn" and allows for high-energy initial structure with a soft, detailed landing in the terminal steps.

---
**[H4_DoubleSampler - Revision 2.5 - Stable Build]**
No trace artifacts detected. Operational opacity confirmed.
