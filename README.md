# h4_Live: The Logic & Loop Controller

![Version](https://img.shields.io/badge/version-2.5.1--beta-blueviolet) ![Status](https://img.shields.io/badge/status-Nuclear-red) ![ComfyUI](https://img.shields.io/badge/platform-ComfyUI-succes)

> **"The Railway Switch for your Workflow."**

---

### 🤔 What is "Live"?

Hi there! Welcome to `h4_Live`. 

If you're new to ComfyUI, you might have noticed it has the memory of a goldfish. It runs a workflow once, generates an image, and then... nothing. It forgets everything.

**h4_Live gives your robot a brain.** 🧠

It allows your workflow to be **Organic**. It allows it to **Count**. It allows it to **Remember**.
Instead of just making one image, you can tell ComfyUI:
*"Hey, make an image. Now, take that image, and fix it. Now take that fixed image, and upscale it. Do this 5 times, but on the 3rd time, change the settings."*

We hide the scary math and the complex logic behind friendly, easy-to-use nodes so you can focus on being an Artist, not a Programmer.

---

# 📚 THE CASUAL GUIDE (For Humans)

Here is everything you need to know about the tools in this kit. No jargon. No math. just how to use them.

## 1. H4 Traffic Router (The Nexus) 🚦
**"The Brain"**

This is the most important node in the pack. It combines a "Splitter" (deciding where to go) and a "Merger" (combining things) into one smart box.

*   **What it does:** It takes two inputs: a "Starter" (e.g., an empty canvas) and a "Looper" (e.g., the finished painting). On the very first run (Run 0), it picks the Starter. On every run after that (Run 1, 2, 3...), it picks the Looper.
*   **Why use it?** It automates the "Feedback Loop". You don't need to manually switch wires.
*   **Bonus:** It also switches your "Denoise" setting automatically! (High denoise for the start, low denoise for the polishing loops).

**Workflow:**
```ascii
[Run 0 Input] ----> +----------------+
                    | TRAFFIC ROUTER | ----> [ To KSampler ]
[Run 1+ Input] ---> +----------------+
```

**Scenario:**
You want to paint a picture from scratch, and then spend 10 loops adding tiny details to it. 
1. Connect your Empty Latent to `Run 0`.
2. Connect your KSampler Output back to `Run 1`.
3. Set `First Denoise` to 1.0 (Create).
4. Set `Loop Denoise` to 0.2 (Polishing).
5. Hit "Queue" and watch it evolve!

---

## 2. H4 Traffic Merge (The Zipper) 🤐
**"The Safe Connector"**

This is the "Little Brother" of the Router. It only does one thing: It merges two customized streams into one.

*   **What it does:** It listens to the Loop Counter. If it's Run 0, it opens Gate A. If it's Run 1+, it opens Gate B.
*   **Why is it "Safe"?** ComfyUI hates empty wires. If you unplug something, it crashes. The Zipper ensures that *something* is always connected, so your workflow never explodes.

**Workflow:**
```ascii
[ Start Data ] ---> +---------+
                    | ZIPPER  | ----> [ Output ]
[ Loop Data ] ----> +---------+
```

---

## 3. H4 Traffic Cop (Legacy Splitter) 👮
**"The Old Reliable"**

*Note: This is an older node. We recommend the **Router**, but the Cop is still on duty.*

*   **What it does:** It takes ONE input and sends it to TWO places. 
*   **Feature:** It uses "Safe Passthrough". Even if a road is closed, it sends "Ghost Data" down it so your nodes don't turn red and cry.

---

## 4. H4 Image Buffer (The Anti-Lag) 📦
**"The Wireless Warehouse"**

Understanding this node is the key to preventing headaches.

*   **The Problem:** When you make a loop in ComfyUI, data has to travel physically through wires. Sometimes, the data takes too long to get back to the start, and you get a "Cycle Error" (The Ouroboros Snake biting its own tail).
*   **The Solution:** The Image Buffer catches the data and stores it in RAM (Memory). It effectively "Snips" the wire, allowing you to send data wirelessly from the end of your workflow back to the start without confusing ComfyUI.

**Scenario:**
You want to send your finished image back to the start, but ComfyUI keeps giving you errors.
1. Place an `Image Buffer` at the end of your workflow.
2. Connect your image to `image_in`.
3. Place a SECOND `Image Buffer` at the start.
4. Leave `image_in` EMPTY.
5. It will magically teleport the data from the first buffer to the second one!

---

## 5. H4 State Monitor (The Scoreboard) 🔢
**"The Counter"**

*   **What it does:** It just tells you what loop number you are on.
*   **Use:** Connect it to a Text Display node to see "Run: 5" on your screen. Useful for knowing when to stop.

---

## 6. H4 Loop Incrementer (The Clicker) ➕
**"The Engine"**

Usually, the **Router** handles counting for you. But sometimes, you want manual control.
*   **What it does:** Every time this node runs, it adds +1 to the global counter.
*   **Feature:** It has a "Wireless Reset" port. If you press the Red Button (see below), this node catches the signal and resets the count to 0.

---

## 7. H4 Wireless Reset (The Red Button) 🔴
**"The Eject Seat"**

*   **The Problem:** You are on Loop 50, but you want to start over.
*   **The Solution:** Toggle this switch to `True`. The next time your workflow runs, it sends a wireless signal to the **Incrementer** or **Router** screaming "RESET!". The counter drops to 0, and you start fresh.
*   **Tip:** Don't forget to turn it off after you reset!

---

## 8. H4 Context Hub (The Mothership) 🛸
**"The One Wire to Rule Them All"**

Tired of spaghetti workflows? Do you have 50 wires crossing over each other?

*   **What it does:** It takes all your standard stuff (Model, VAE, CLIP, Positive Prompt, Negative Prompt, Latent, Image) and bundles them into ONE single blue wire called a `PIPE`.
*   **Bonus:** It prints a detailed report in your console telling you exactly what is inside (Shapes, Types, etc).

---

## 9. H4 Context Unpack (The Distributor) 📤
**"The Unpacker"**

*   **What it does:** It takes the single `PIPE` wire from the Mothership and unpacks it back into all the individual connections.
*   **Use:** Put the Hub at the start of your workflow and the Unpack at the end. Now you have a clean, wire-free workspace in the middle!

---

## 10. H4 Smart Console (The X-Ray) 🧠
**"The Truth Teller"**

*   **What it does:** It sits between any two nodes and shows you what is flowing through the wire.
*   **Modes:**
    *   **Normal**: Shows basic info (Type, Shape).
    *   **🔥 +ULTRA**: Goes nuclear. Inspects inside the object, shows gradients, min/max values, attributes. Use this when you are debugging complex crashes.

---

## 11. H4 Mission Control (The Dashboard) 🎛️
**"The Flight Deck"**

A central place to see everything happening in your loop.
*   **Active Mode**: It acts like an engine, driving the loop forward.
*   **Passive Mode**: It just sits there and watches.
*   **Outputs**: It creates a text report ("Run 5/10, Seed: 12345") that you can display on your screen.

---

## 12. H4 Linear Scheduler (The Ramp) 📈
**"The Smooth Operator"**

*   **What it does:** It creates a number that changes smoothly over time.
*   **Example:** "Start at 1.0, End at 0.0, over 10 steps."
    *   Run 0: Output 1.0
    *   Run 5: Output 0.5
    *   Run 10: Output 0.0
*   **Use Case:** Slowly lowering the `Denoise` value so your image gets sharper and sharper with every loop.

---

## 13. H4 Seed Generator (The Chaos Controller) 🎲
**"The Dice Roller"**

*   **What it does:** Controls the random seed for your KSampler.
*   **Modes:**
    *   **Fixed**: Keeps the seed the same (Scientific Control).
    *   **Incremental**: Adds +1 every loop (Scanning for cool seeds).
    *   **Random**: Pure chaos.

---

## 14. H4 Gridinator 9001 (The Beast) 📊
**"IT'S OVER 9000!?!?"**

This is the ultimate testing tool. It takes your workflow and multiplies it into a giant grid.

*   **What it does:** Want to see what your prompt looks like with `CFG` set to 5, 6, 7, and 8? Want to see it across 3 different Models at the same time? The Gridinator does this in one click.
*   **Powers:**
    *   **Fuzzy Match**: Type "pony" and it finds your PonyV6 checkpoint.
    *   **Stutter**: Type a prompt like "A {cat|dog|fish}" and it makes a grid for each animal.
    *   **Sliding Scale**: Auto-generates the numbers for you.
    *   **Dynamic Layout**: Automatic label sizing with configurable `Margin` and `Padding` for perfect grids every time.

---

## 15. H4 Big Brother (Ghost Layer) 👁️
**"The Eye in the Sky"**

This isn't a node you drop onto your workflow - it's a **Global Visual Enhancement Layer** that works silently in the background. Think of it like putting on X-Ray goggles for your entire ComfyUI canvas.

*   **What it does:** It draws a glowing overlay on top of ComfyUI's native visualization. When you select a node, Big Brother draws neon wires tracing all the connections flowing into and out of that node. It's like a highlighter pen for your workflow.

*   **Why it exists:** Sometimes ComfyUI's native wire rendering can be hard to see, especially in complex "spaghetti" workflows where 50 wires are crossing over each other. Big Brother makes your selected connections GLOW so you can trace them across the canvas without squinting.

*   **The Ghost Layer:** The overlay is drawn on a special invisible layer that sits on top of ComfyUI but doesn't interfere with clicking or dragging. You can still interact with your nodes normally - the Ghost Layer is purely visual. It's like a transparent sheet of glass with glowing lines painted on it.

### Big Brother Settings (Settings Panel)

Open **Settings** (the cogwheel icon) and scroll down to find the Big Brother options. Here's what each one does:

#### 1. 👁️ h4 Big Brother: Enable Overlay
*   **Type:** Toggle (On/Off)
*   **Default:** On
*   **What it does:** Turns the entire Ghost Layer on or off. If you find it distracting, flip this off and the overlay disappears completely.

#### 2. 👁️ h4 Big Brother: Console Monitor
*   **Type:** Toggle (On/Off)
*   **Default:** On
*   **What it does:** When enabled, Big Brother prints messages to your browser's Developer Console (Press F12 to see it) during workflow execution. Useful for seeing what's happening "under the hood".

#### 3. 🔬 h4 DEBUG PROTOCOL: NUCLEAR Mode
*   **Type:** Toggle (On/Off)
*   **Default:** Off
*   **What it does:** This is the master switch for **NUCLEAR-level debugging**. When you turn this on, Big Brother becomes EXTREMELY chatty in the console. It logs:
    *   Every wire position calculation
    *   Slot index corrections for converted widgets
    *   Render frame transformations
    *   Canvas matrix values
*   **When to use it:** Only turn this on if something looks wrong and you need to troubleshoot. It generates a LOT of console output, whcih can slow things down.

#### 4. 🎨 h4 Wire: Selection Color
*   **Type:** Text (Color Code)
*   **Default:** `#00FF00` (Neon Green)
*   **What it does:** Changes the color of the glowing wires when you select a node. Try `#FF00FF` for pink, `#00FFFF` for cyan, or `#FFA500` for orange. You can use any valid CSS color code.

#### 5. 🎨 h4 Wire: Error Color
*   **Type:** Text (Color Code)
*   **Default:** `#FF0000` (Red)
*   **What it does:** If a node is part of an "Infected" chain (an execution error occurred), its wires glow this color instead. Default is angry red because errors are bad!

#### 6. 🎨 h4 Grid: Color
*   **Type:** Text (Color Code)
*   **Default:** `rgba(255, 200, 0, 0.15)`
*   **What it does:** When Big Brother first initializes, it draws a subtle grid pattern across the canvas as a startup animation. This setting controls that grid's color. The `0.15` at the end is the opacity (transparency).

#### 7. 🔧 h4 Calibrate: Offset X
*   **Type:** Number (Pixels)
*   **Default:** 0
*   **What it does:** If the Ghost Layer seems misaligned horizontally (the glow is shifted left or right from the actual wires), tweak this number to nudge it back into place. Positive = Right, Negative = Left.

#### 8. 🔧 h4 Calibrate: Global Y
*   **Type:** Number (Pixels)
*   **Default:** 0
*   **What it does:** Same as above, but for vertical misalignment. Positive = Down, Negtive = Up.

#### 9. 🔧 h4 Wire: Slot Offset Y
*   **Type:** Number (Graph Units)
*   **Default:** 0
*   **What it does:** Fine-tunes where the wire endpoints land vertically on each slot. If wires seem to be landing above or below the input/output circles, adjust this. This is measured in "grapf units" (the internal coordinate system), not screen pixels.

#### 10. 🔧 h4 Wire: Spacing Scale
*   **Type:** Text (Decimal Number)
*   **Default:** `1.00`
*   **What it does:** Scales the vertical spacing between slots. If your wires are "fanning out" as they travel down a tall node, try `1.05` or `1.10`. If they're squishing together, try `0.95`.

#### 11. 👁️ BB: Wire Style
*   **Type:** Dropdown
*   **Options:**
    *   `Match ComfyUI` - Uses splines that look similar to native wires
    *   `Spline (Bezier)` - Smooth curvy wires
    *   `Linear (Straight)` - Direct diagonal lines
    *   `Circuit Board (Manhattan)` - Right-angle turns only, like traces on a circuit board
*   **Default:** `Circuit Board`
*   **What it does:** Changes the artistic style of the Ghost Layer wires. Circuit Board is the most visually distinct from native wires, which helps you see the difference.

#### 12. 👁️ BB: Show Wires
*   **Type:** Toggle (On/Off)
*   **Default:** On
*   **What it does:** Turns just the wire rendering on or off, while keeping the rest of Big Brother active. Useful if you want the error monitoring without the visual overlay.

---

### Wire Alignment Technical Note

If you've noticed that some wires land slightly above or below their target input, that's a known LiteGraph quirk! ComfyUI uses LiteGraph as its canvas engine, and LiteGraph's internal position calculator sometimes returns coordinates that don't quite match the visual center of a slot - especially for "converted widgets" (inputs that were originally dropdown menus but got converted into wire connections).

Big Brother automatically applies a **+45 pixel correction** for any slot at index 4 or higher (which covers most converted widgets like `denoise`, `cfg`, `steps`, etc.) This correction is applied automatically and silently - you don't need to do anything.

If the alignment is still off for your specific setup (different themes, zoom levels, or display scaling can affect this), you can fien-tune it using the **Wire Slot Offset Y** setting mentioned above.

---

<br>
<br>
<br>

# ⚙️ THE DEV CORNER (Technical Specifications)

*> "Show me the code."*

Welcome to the backend. Here is the architectural breakdown of the `h4_Live` toolkit.

## Core Philosophy: Global State & Lazy Evaluation
The toolkit relies on a singleton pattern dictionary `_H4_GLOBAL_STATE` residing in `h4_core.py`. This state persists across ComfyUI's execution graph re-evaluations. Each node uses `check_lazy_status` (where applicable) to inform the ComfyUI backend about dependency requirements based on the current state tick.

### 1. H4_TrafficRouter
*   **Class**: `H4_TrafficRouter`
*   **Logic**: Implements a conditional return tuple based on `_H4_GLOBAL_STATE["loop_count"]`.
*   **Validation**: Uses `VALIDATE_INPUTS` returning `True` to bypass `NoneType` checks during inactive graph paths.
*   **Type Safety**: Utilizes `ANY_TYPE` wildcard class (`__eq__` always True) to accept potentially unbound inputs from upstream nodes during initialization.

### 2. H4_TrafficMerge
*   **Class**: `H4_TrafficMerge`
*   **Logic**: A robust selector switch.
*   **Wireless Protocol**: If `loop_input` is None, it queries `h4_core.get_buffered_image()`. This implements a "Look-Behind" mechanism that effectively breaks the Directed Acyclic Graph (DAG) cycle restriction of ComfyUI by utilizing external heap storage.

### 3. H4_TrafficCop [LEGACY]
*   **Class**: `H4_TrafficCop`
*   **Logic**: Returns `(Data, Data)` regardless of state.
    *   Active path represents logical flow.
    *   Inactive path represents "Safe Fallback" (preventing downstream `IndexError`).
*   **Status**: Maintained for backward compatibility. Recommend `TrafficRouter` for atomic operations.

### 4. H4_ImageBuffer
*   **Class**: `H4_ImageBuffer`
*   **Storage**: `_H4_IMAGE_BUFFER` (Global Variable).
*   **Behavior**:
    *   **Write Mode** (Input Connected): Writes object reference to global variable.
    *   **Read Mode** (Input Disconnected): Returns object reference from global variable.
*   **Optimization**: Stores references, not deep copies (zero-copy overhead), unless specific mutation safety is required (not currently implemented for perf reasons).

### 5. H4_StateMonitor
*   **Class**: `H4_StateMonitor`
*   **Function**: Read-Only access to `_H4_GLOBAL_STATE["loop_count"]`.
*   **Execution**: Does not trigger side effects. Pure observer.

### 6. H4_LoopIncrementer
*   **Class**: `H4_LoopIncrementer`
*   **Side Effect**: `increment_loop()` -> `count += 1`.
*   **Wireless Interact**: Polls `_H4_ORBIT_STORAGE` for `request_reset` flag. If True, executes `reset_state()` instead of increment.

### 7. H4_WirelessResetButton
*   **Class**: `H4_WirelessResetButton`
*   **Side Effect**: `orbit_set("request_reset", True)`.
*   **Scope**: Sets a flag that is consumed by the next execution of an Active Logic Node (Router or Incrementer).

### 8. H4_ContextHub
*   **Class**: `H4_ContextHub`
*   **Structure**: `H4_PIPE` is a standard Python `dict` containing keys: `model, vae, clip, positive, negative, latent, image, mask`.
*   **Extensibility**: Includes `any_A`, `any_B` slots for arbitrary custom types (e.g., ControlNet stacks).

### 9. H4_ContextUnpack
*   **Class**: `H4_ContextUnpack`
*   **Logic**: Dictionary lookup `.get(key, None)`. returns tuple structure matching standard ComfyUI types.

### 10. H4_SmartConsole
*   **Class**: `H4_SmartConsole`
*   **Introspection**:
    *   **Tensor**: `.shape`, `.dtype`, `.device`, `.grad`.
    *   **Dict**: Keys inspection.
    *   **Object**: `dir()` attribute scanning (in +ULTRA mode).
*   **Frontend**: Pushes text payload to `ui.text` for JS widget rendering.

### 11. H4_MissionControl
*   **Class**: `H4_MissionControl`
*   **Role**: Aggregator.
*   **Modes**:
    *   **Active**: Calls `increment_loop()`.
    *   **Passive**: Read-only.
*   **Dashboard**: Formats a formatted string for UI consumption.

### 12. H4_LinearScheduler
*   **Class**: `H4_LinearScheduler`
*   **Math**: `LERP(start, end, current / max)`.
*   **Clamping**: Clamps to `end` value if `current > max`.

### 13. H4_SeedGenerator
*   **Class**: `H4_SeedGenerator`
*   **Modes**:
    *   **Incremental**: `seed + loop_count`.
    *   **Fixed**: `return seed`.
    *   **Random**: `random.randint(0, 0xffffffffffffffff)`. Note: Explicitly breaks determinism.

### 14. H4_Gridinator
*   **Class**: `H4_Gridinator`
*   **Architecture**: Monolithic KSampler Encapsulation.
*   **Dependencies**: Imports `comfy.sd`, `comfy.samplers`, `nodes`.
*   **Pipeline**:
    1.  Parse Axes (X/Y/Z) -> Vector Lists.
    2.  Iterate `z in Z`: `y in Y`: `x in X`.
    3.  `fuzzy_load_checkpoint(name)`: On-demand loading. Cache efficient.
    4.  `common_ksampler(...)`: Execute diffusion.
    5.  `VAE Decode`: Latent -> Pixel.
    6.  `PIL.Draw`: Stitch into canvas with Dynamic Label Sizing (Auto-fit).
    7.  `ToTensor`: Return final grid.

### 15. H4_BigBrother (Ghost Layer Extension)
*   **Module**: `js/h4_BigBrother.js`
*   **Type**: ComfyUI Frontend Extension (Client-Side JavaScript)
*   **Architecture**: `app.registerExtension({...})` pattern with singleton state.

#### Internal State Structure
*   **`_config`**: Immutable default values.
*   **`_state`**: Mutable runtime state, hydrated from `_config` on `setup()`. Note: Renamed from `settings` to avoid collision with ComfyUI's `extensionService.registerExtension()` schema validation which iterates `_.settings?.forEach()`.

#### Ghost Layer Implementation
*   **Canvas**: Creates a dedicated `<canvas id="h4-ghost-layer">` element with `pointer-events: none` and `position: absolute`.
*   **Synchronization**: On each `requestAnimationFrame` tick, reads `app.canvas.ds` (DragAndScale) for `scale`, `offset[0]`, `offset[1]`.
*   **Matrix Transform**: Applies `ctx.setTransform(scale * dpr, 0, 0, scale * dpr, tx * scale * dpr, ty * scale * dpr)` to align Ghost Layer with LiteGraph's internal coordinate system.

#### Wire Rendering
*   **Selection Detection**: Queries `app.canvas.selected_nodes` and iterates `app.graph.links`.
*   **Position Calculation**:
    *   `getNodeOutputPos(node, slotIndex)`: Delegates to `node.getConnectionOutputPos()`.
    *   `getNodeInputPos(node, slotIndex)`: Delegates to `node.getConnectionInputPos()`.
*   **Converted Widget Correction**: LiteGraph's `getConnectionInputPos()` returns coordinates slightly above the visual slot center for converted widgets. A **+45px Y correction** is applied directly in `drawWires()` for `target_slot >= 4` to compensate.

#### Debug Protocol
*   **Toggle**: `this._state.debugMode` (exposed via Settings UI as "NUCLEAR Mode").
*   **Implementation**: All `console.log` statements are wrapped in `if (this._state.debugMode)` conditionals.
*   **Log Prefix**: `[h4-DEBUG]` for consistent filtering in browser DevTools.

#### Wire Styles
*   **Spline**: `ctx.bezierCurveTo()` with horizontal tangents.
*   **Linear**: Direct `ctx.lineTo()`.
*   **Circuit (Manhattan)**: Step function with `midX = (posA[0] + posB[0]) / 2`, then vertical-horizontal-vertical segments.

#### Error Tracking (Infection System)
*   **Trigger**: Listens to `api.addEventListener("execution_error", ...)`.
*   **Behavior**: Parses error payload for `node_id`, traces upstream links, and populates `this.infectedLinks` Set.
*   **Visual**: Infected wires render using `wireColorError` instead of `wireColorSelect`.

---
<div align="right">

(b'.')b - h4 - { Be Your Best }

</div>
