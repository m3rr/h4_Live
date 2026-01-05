# 🛠️ Logic Utilities: Manual Control
### *Feature Nodes: H4_LoopIncrementer, H4_WirelessResetButton, H4_StateMonitor*

The `Traffic` nodes do a lot of magic. They auto-increment counters and handle state for you.
But sometimes, you need **Manual Override**.

You might need to:
1.  Count loops in a workflow that *doesn't* use Traffic nodes.
2.  Reset the system from a different part of the canvas without dragging a wire.
3.  Debug exactly what "Frame" the system thinks it is on.

These are your Power Tools.

---

## 🎛️ Node Deep Dive

### 1. H4_LoopIncrementer (The Clicker) ➕
This node is a manual counter-upper.
*   **How it works**: It acts as a pass-through gate. You feed data (like an image) into `pulse`. When the data passes through, the node internally clicks the Global Loop Counter +1.
*   **Hybrid Mode**: Use this if you are building a custom loop using generic ComfyUI nodes but still want to use H4's Mission Control to track progress.
*   **Wireless Reset Check**: If `wireless_reset` is True, this node also acts as an antenna. It checks if the "Nuke" button has been pressed (see below). If yes, it resets the count to 0 instead of adding 1.

### 2. H4_WirelessResetButton (The Nuke) 🔴
This is a remote detonator for your loop count.
*   **The Problem**: You are deep in a loop (Frame 50). You want to restart. You don't want to find the Traffic Node and toggle a switch.
*   **The Solution**: Place this node anywhere on your canvas (or even in a simpler control group).
*   **Input**: `trigger_reset` (Boolean).
*   **Mechanism**: When triggered, it blasts a signal into the Global "Orbit" State: **"RESET EVERYTHING"**.
*   **Result**: The next time *any* H4 Logic Node runs (TrafficMerge, Router, or Incrementer), it will catch this signal, reset the counter to 0, and start fresh.

### 3. H4_StateMonitor (The Watcher) 👀
This is your window into the machine's soul.
*   **Function**: It reads the current Global Loop Count from memory and outputs it as an Integer.
*   **Use Case**: Debugging desyncs.
    *   Connect this to a "Show Text" node.
    *   Compare what *it* says the frame is vs what *you* think the frame is.
    *   If they disagree, you likely have a graph execution order issue (ComfyUI running nodes in parallel or out of order).
*   **Daisy Chaining**: Use the `Any_In` input to force this node to execute *after* a specific operation (like a Reset), creating a guaranteed execution order.

---

## 📐 Manual Increment Workflow (ASCII)

```ascii
[ PROCESS NODE ] ---> [ H4_LOOP_INCREMENTER ] ---> [ SAVE IMAGE ]
                            |
                     (Internal Logic)
                            |
                            v
                   [ GLOBAL STATE: Count + 1 ]
```

---
<div align="right">
  (b'.')b - h4 - { Be Your Best }
</div>
