# 👮 H4_TrafficCop (Legacy Logic)
### *Feature Node: H4_TrafficCop*

**Status: CLASSIC / LEGACY**
*This node is like a vintage muscle car. The new generic `TrafficRouter` is more advanced, but the TrafficCop is simple, reliable, and unbreakable.*

---

## 🚦 What is it?
The **H4_TrafficCop** is a **Logic Splitter**.
Unlike the Merge nodes (which combine 2 streams into 1), the Cop takes 1 stream and sends it to 2 potential destinations.

### The Logic
It checks the Global Loop Counter.
*   **Run 0 (Start)**: The cop waves traffic towards the **Left Path** (`Run_Once_(Start)`).
*   **Run 1+ (Loop)**: The cop waves traffic towards the **Right Path** (`Loop_(Continue)`).

---

## 🛡️ The "Safe Mode" Guarantee
Standard ComfyUI switches are dangerous. If you switch a path "Off", they often output `None` or nothing at all. This causes downstream nodes (like Samplers) to turn Red and crash the graph.

**The Traffic Cop is different.**
It uses **Safe Passthrough**.
*   It sends the *Real Data* to the active path.
*   It sends *Copy Data* (or the same data) to the inactive path.
*   **Result:** Your graph never breaks. The inactive branch just processes "Ghost Data" safely until it hits a merge point.

---

## 🔌 Wiring Guide (Classic Layout)

```ascii
             [ DATA SOURCE ]
                    |
                    v
            [ 👮 TRAFFIC COP ]
            |               |
   +--------+               +--------+
   | (Start)                (Loop)   |
   v                                 v
[ PROCESS A ]                   [ PROCESS B ]
```

**Use Case:**
You want to use `Checkpoint A` for the first generation, but switch to `Checkpoint B` for all subsequent loops.
1. Connect Checkpoint A to Start.
2. Connect Checkpoint B to Loop.
(Wait, that's a Merge logic. For a Splitter:)
1. Connect Latent to Cop.
2. Start Path: Goes to a Sampler with "High Denoise".
3. Loop Path: Goes to a Sampler with "Low Denoise".

---
<div align="right">
  (b'.')b - h4 - { Be Your Best }
</div>
