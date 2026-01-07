# 👁️ H4_LIVE TOOLKIT: THE BIBLICAL ONBOARDING MANIFESTO (v2.2.4-BETA)

Welcome to the inner workings of the **h4_Live ToolKit**. This document provides an obscenely detailed, line-by-line architectural breakdown of the most advanced logic and visualization suite ever conceived for ComfyUI. 

---

## 🏗️ CORE ARCHITECTURE: THE GHOST IN THE MACHINE

The toolkit is divided into two sovereign but interconnected domains: the **Python Backend (The Brain)** and the **JavaScript Frontend (The Ghost Layer)**.

### 1. The Python Nerve Center (`h4_core.py`)
This is the single source of truth. Unlike standard ComfyUI nodes which are stateless, h4_Live maintains a **Persistent Global State**.

*   **`_H4_GLOBAL_STATE`**: A dictionary residing in memory that survives as long as the ComfyUI process handles. It tracks the `loop_count` and `last_run_time`. 
    *   *Technical Detail*: This is a singleton-like pattern. It is imported by nodes and modified in-place. Because Python modules are only executed once in the lifetime of the process, this state remains accessible and consistent across all node instances.
*   **`_H4_ORBIT_STORAGE`**: A wireless feedback registry. 
    *   *Technical Detail*: It allows nodes to communicate across the graph without physical wires. For example, the **H4_WirelessResetButton** sets a key in Orbit. On the next execution, the **H4_MissionControl** hub checks Orbit, detects the flag, and triggers a `reset_state()`. This bypasses ComfyUI's standard execution order.
*   **`_H4_IMAGE_BUFFER`**: A RAM-resident payload container. 
    *   *Technical Detail*: It holds the "last known good" data (Images, Latents, even Strings) to eliminate the 1-cycle feedback lag inherent in LiteGraph execution. When you loop in ComfyUI, normally you'd need to wait for a file to save and load. The Buffer keeps the tensor in GPU/RAM for instant "Anti-Lag" access.

### 2. The Universal Socket (`h4_utils.py` -> `ANY_TYPE`)
The `AnyType` class is a masterstroke of engineering designed to trick ComfyUI's strict type-matching system.
*   By overriding `__eq__` to always return `True` and `__ne__` to return `False`, this object acts as a "Universal Key." It allows a single output to plug into *any* input (MODEL, VAE, IMAGE, etc.) without the user needing to convert types.
*   *Implementation*: 
    ```python
    class AnyType(str):
        def __ne__(self, __value: object) -> bool: return False
        def __eq__(self, __value: object) -> bool: return True
    ```
    This works because ComfyUI uses the `==` operator to check if two slots can connect. `AnyType` simply lies to the system, claiming it is equal to everything.

---

## 🚦 TRAFFIC CONTROL: THE LOGIC SUPREMACY (`h4_traffic.py`)

The Traffic nodes are the gatekeepers of your workflow. They manage the flow of data based on the `loop_count`.

### H4_TrafficRouter (The Nexus)
The current gold standard for looping logic.
*   **Lazy Loading (`check_lazy_status`)**: This node uses ComfyUI's "lazy" evaluation. If it's Run 0, it *only* requests data from the `first_run_in` path. This prevents the GPU from wasting memory on loop paths that aren't yet active.
*   **Smart Denoise**: It automatically outputs a `first_denoise` (usually 1.0) and then switches to `loop_denoise` (e.g., 0.45) for all subsequent runs. 

### H4_TrafficMerge (The Zipper)
The veteran logic gate. 
*   **Wireless Mode**: If the `loop_input` is left empty, it automatically reaches into the `_H4_IMAGE_BUFFER` (The RAM Storage) to pull the previous run's data. This is the **only** way to loop in ComfyUI without creating a "Cycle Error" (LiteGraph's equivalent of a fatal paradox).
*   **Type Safety Enforcement**: It memorizes the data type of Run 0. If Run 1 returns an incompatible type (e.g., you started with a Latent but tried to loop an Image), it triggers a **Nuclear Error** to prevent the GPU from crashing.

---

## 🛰️ CONTEXT & DATA FLOW: THE MOTHERSHIP (`h4_context.py`)

### H4_ContextHub (Mothership)
Bundles your entire workflow into a single dictionary (`H4_PIPE`).
*   **Introspection Engine (`log_input`)**: When data passes through the Hub, it performs a deep scan. It identifies Tensors, Latents, and Classes, printing their shapes, devices (CPU/CUDA), and dtypes to your console in a clean blue-cyan format.

---

## 🛸 MISSION CONTROL: THE DASHBOARD (`h4_mission_control.py`)

### H4_MissionControl
The driver of the toolkit.
*   **Active Mode**: When set to "Master Base", this node becomes the heartbeat of the graph. It is the one responsible for incrementing the global `loop_count`.
*   **Scheduler & Seed Generators**: These nodes hook into the `loop_count` to create dynamic ramps (e.g., Denoise going from 0.8 down to 0.2 over 16 runs) or predictable seed sweeps.

---

## 👁️ BIG BROTHER: THE VISUAL LAYER (`js/h4_BigBrother.js`)

This is the "Ghost in the Shell" layer—a 1000-line masterpiece of JavaScript that renders overtop of ComfyUI.

### 1. The Ghost Layer Canvas
Big Brother creates a `pointer-events: none` canvas that perfectly overlays the ComfyUI workspace. It tracks the `app.canvas` transformation matrix (Scale, TX, TY) in real-time.

### 2. Universal Neon Glow
*   When a node is selected, Big Brother doesn't just draw a box; it calculates the High-DPI physical pixels and renders a **Neon Green Glow** with a 15px `shadowBlur`.
*   **Error Detection**: It listens for `execution_error` events. If a node fails, it "infects" that node with a **Nuclear Red Glow** and highlights the specific wire path that carried the bad data.

### 3. Progressive Wire Alignment (The Calibration)
The most complex math in the toolkit lies in `getNodeInputPos` and `getNodeOutputPos`.
*   **Widget-Aware Spacing**: It accounts for the vertical gap created when widgets are converted to inputs (like the KSampler `denoise`).
*   **Bottom-Stacking**: Converted inputs are anchored to the physical bottom of the node (`node.size[1]`), ensuring wires hit the center of the input circle even at extreme zoom levels.

---

## 🏗️ THE GRIDINATOR 9001 (`h4_gridinator.py` & `js/h4_gridinator.js`)

A monolithic node that is effectively a "Mini-ComfyUI" inside a single node.

*   **Dynamic UI**: The JS side swaps widgets in real-time. Choose "Model" as an axis, and the text box instantly transforms into a Checkpoint Dropdown.
*   **Infinite Permutations**: It uses `itertools.product` to calculate every possible combination of X, Y, and Z axes.
*   **Label Engine**: It uses `PIL` (Pillow) to stitch generated images into a massive sheet, dynamically calculating margin, padding, and font sizes based on the largest label across all axes.

---

## ☢️ THE WAR OF THE WIRES: THE K-SAMPLER DENOISE DILEMMA

For multiple development cycles, we have waged a "Nuclear War" against a single pixel misalignment: the `denoise` input wire on the KSampler node.

### The Problem Definition
When a widget (like a slider) is converted into an input slot in ComfyUI, it is typically rendered *below* the standard inputs and *above* the widgets. ComfyUI's internal rendering doesn't always expose the exact Y-coordinate of these "Converted Inputs" to the Ghost Layer. This results in wires that "overshoot" or "undershoot" the input circle, breaking the illusion of a perfect neon circuit.

### The Historical Chronicle of Attempts

#### PHASE 1: THE OFFSET ERA (Standard Offsets)
*   **Hypothesis**: We can calculate the position by adding a fixed `widgetHeight` to the base input list.
*   **Failure**: Brittle. Each theme (Dark, Light, Cyberpunk) has different padding. Zooming caused the wire to "drift" because the scale was applied incorrectly to the additive offset.

#### PHASE 2: THE NUCLEAR IDENTIFICATION (Name-Matching)
*   **Hypothesis**: If we detect an input named `denoise`, we multiply the number of widgets by a constant height.
*   **Implementation**: `const y = base + (numWidgets * 20)`.
*   **Failure**: Overshot by 20-30 pixels. ComfyUI hides some widgets (like the "control" widgets) which still occupy "phantom space" in the layout math but aren't in the active widget list.

#### PHASE 3: THE SURGICAL TUG-UP (Manual Calibration)
*   **Hypothesis**: Hardcode a "Correction Factor" specifically for KSamplers.
*   **Adjustment**: `if (node.type === "KSampler") y -= 6;`.
*   **Failure**: Still failed when the user added or removed other inputs (like 'model' or 'latent'). The slot index would shift, but the correction was static.

#### PHASE 4: THE BOTTOM-STACKING REVOLUTION
*   **Hypothesis**: Stop guessing from the TOP. Anchor from the BOTTOM.
*   **Logic**: ComfyUI renders converted inputs from the bottom up. We calculate the node's physical height (`node.size[1]`) and subtract the reverse index of the converted slot.
*   **Result**: Partial success. Worked for some nodes but LiteGraph's `getConnectionInputPos()` was still returning coordinates that didn't match the visual slot center.

#### PHASE 5: THE REFERENCE ERROR PURGE
*   **Incident**: During the Bottom-Stacking implementation, we encountered: `ReferenceError: pos is not defined`.
*   **Solution**: Re-onboarded the logic to ensure the `pos` array (base graph coordinates) is initialized *before* the conditional routing. Every path now has a guaranteed coordinate fallback.

#### PHASE 6: THE DIRECT DRAW FIX (The Definitive Solution) ✅
*   **Discovery**: LiteGraph's native `getConnectionInputPos()` returns Y-coordinates that are consistently higher than the visual center for converted widget slots (slots at index 4 or greater).
*   **Root Cause**: LiteGraph's internal math doesn't account for the exact rendering offset of converted widgets vs native inputs.
*   **Solution**: Instead of trying to fix `getNodeInputPos()`, we apply the correction **directly in `drawWires()`** right before the wire is drawn. This is cleaner and more reliable.
*   **Implementation**:
    ```javascript
    // In drawWires(), before drawing:
    let finalPosB = posB;
    if (link.target_slot >= 4) {
        finalPosB = [posB[0], posB[1] + 45];
    }
    ```
*   **Result**: Success. The +45px correction puts the wire endpoint exactly at the visual center of the input slot for all tested nodes (KSampler, KSamplerAdvanced, etc.)

---

## 🔬 DEBUG PROTOCOL: NUCLEAR MODE

When troubleshooting wire alignment or visualization issues, Big Brother includes a built-in debug system.

### Enabling Debug Mode
1. Open **Settings** (cogwheel icon)
2. Search for "DEBUG PROTOCOL"
3. Toggle **🔬 h4 DEBUG PROTOCOL: NUCLEAR Mode** to ON

### What It Logs
When NUCLEAR Mode is active, the following information is printed to the browser console (F12):

*   **Render Frame**: Canvas transformation matrix values (`scale`, `tx`, `ty`)
*   **drawWires Loop**: Number of selected nodes, infected links, and total links
*   **Wire Positions**: For KSampler nodes, logs each input slot's calculated position
*   **Slot Corrections**: When a +45px correction is applied, logs the original and corrected Y values

### Console Log Format
All debug logs are prefixed with `[h4-DEBUG]` for easy filtering in DevTools.

---

## 📝 SURVIVAL RULES FOR DEVELOPERS (RULESET)

1.  **NEVER ASSUME PATHS**: Always check `folder_paths.get_filename_list`.
2.  **NUCLEAR LOGGING**: Every critical function MUST use `_log` with a timestamp.
3.  **TYPE PARADOX**: Always use `ANY_TYPE` for passthrough nodes.
4.  **SAFETY FIRST**: The `H4_SmartConsole` with `+ULTRA` mode is the only way to see what's actually happening inside a Torch Tensor during live execution.
5.  **DEBUG PROTOCOL**: When Big Brother visualization seems off, enable NUCLEAR Mode before investigating. The console logs are your first line of defense.
6.  **SLOT CORRECTION**: Remember that converted widgets (slot index >= 4) need a +45px Y correction. This is handled automatically in `drawWires()`.

---
<div align="right">

(b'.')b - h4 - { Be Your Best }

</div>
