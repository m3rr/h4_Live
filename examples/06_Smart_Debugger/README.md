# 🧠 H4_SmartConsole: The "God Mode" Debugger
### *Feature Node: H4_SmartConsole*

ComfyUI is a black box. You connect wires, but you don't really know what's flowing inside them.
Is that "LATENT" a dictionary? A Tensor? What is its shape? Is it on the GPU or CPU?

**H4_SmartConsole** is your X-Ray machine. It lets you see inside the data.

---

## 🕵️ Modes of Operation

### 1. Standard Scan (Default) 🟢
This is for general sanity checking. It tells you the **Essentials**.
*   **Type**: e.g., `<class 'torch.Tensor'>`
*   **Shape**: e.g., `[1, 4, 64, 64]` (Crucial for debugging dimension errors).
*   **Dtype**: e.g., `torch.float32` vs `torch.float16`.
*   **Device**: e.g., `cuda:0` (GPU) vs `cpu`.

### 2. +ULTRA Mode (God Mode) 🔥
This is for **Nuclear Debugging**. It uses deep Python introspection to rip the object apart.
*   **Attributes**: Lists all internal properties of the object (even private ones starting with `_`).
*   **Statistics**: If input is a Tensor, it calculates `Min`, `Max`, and `Mean`.
    *   *Why?* this detects "Black Images" (Max=0) or "Exploding Gradients" (Max=NaN).
*   **Deep Structure**: It iterates through dictionaries and lists to tell you exactly what is nested inside.

---

## 🖥️ Dual Display Technology
Data is displayed in two places for maximum visibility:

1.  **The Console Window**:
    *   The black CMD/Terminal window where ComfyUI runs.
    *   The logs here are **Color Coded** (Cyan/Green).
    *   They are formatted perfectly for copy-pasting into LLMs (like ChatGPT/Claude) to ask for help with errors.
    
2.  **The Node UI**:
    *   The node itself has a text box that updates live.
    *   Great for quick checks without Alt-Tabbing.

---

## 🛠️ When to use it?
*   **"RuntimeError: Sizes of tensors must match"**: Plug the Console into both inputs. Compare the Shapes. You will instantly see `[1, 64, 64]` vs `[1, 128, 128]`.
*   **"AttributeError: 'list' object has no attribute 'shape'"**: Plug it in. You will realize you are accidentally passing a `List` instead of a `Tensor`.
*   **"Why is my image noisy?"**: Use +ULTRA. Check the `Mean` and `Max`.

---
<div align="right">
  (b'.')b - h4 - { Be Your Best }
</div>
