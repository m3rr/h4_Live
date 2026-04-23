# h4_discombobulator / H4_Discombobulator (The Interface Glitch)

## What it is
A "just for fun" node that messes with your UI. It's essentially an easter egg that turns your status bar and buttons into "glitchy" text, binary, or leetspeak. It doesn't affect your images or your logic—it's just a visual prank.

## Expanded Description
"Because I was bored and wanted to see if I could make the interface look like a cyberpunk terminal."

The **Discombobulator** is a "stealth" node. It doesn't do anything in the backend (it has zero effect on your Samplers or LoRAs). Instead, it injects some Javascript that "scrambles" the text you see on your screen.

It's a great way to show off how the H4 toolkit can "hijack" part of the ComfyUI interface without actually breaking anything.

### The Emergency Button (KICK THE GRID)
The most useful part of this package is actually a button it adds to your top toolbar: **KICK THE GRID (>_<)!!**. 
- If your nodes get stuck, your wires look "frozen," or you can't click on anything, click this button.
- It refreshes your graph "in place" while keeping your unsaved prompts and seeds. It's a lifesaver when the UI starts acting up.

## Quick Start
1. Drop the `H4_Discombobulator` anywhere on your screen.
2. You don't need to wire it to anything.
3. Your status bar (at the top or bottom) will start showing "glitch" text when you run your workflow.

---

## Dev Corner (Jargon & Logic)
- **DOM Injection**: Uses Javascript to find the status bar elements and replace their `.textContent` with a randomized character array.
- **Leetspeak Transformer**: A simple character-map swap engine (`A` -> `4`, etc.).
- **Backend No-Op**: The Python code is a dummy stub—it tells ComfyUI "I'm always finished and nothing changed" so it never slows down your workflow.
