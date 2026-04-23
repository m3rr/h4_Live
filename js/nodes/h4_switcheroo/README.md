# h4_switcheroo / H4_Switcheroo (The Search & Replace)

## What it is
A simple tool for swapping words in your prompts. It lets you take a prompt and replace up to 10 different words or phrases without having to manually edit your text nodes. 

## Expanded Description
Prompting in ComfyUI can get messy. If you have a big prompt and just want to see what happens if you change "girl" to "boy" or "day" to "night", you usually have to go find the text box and type it in. 

The **Switcheroo** makes this a lot simpler. 
- You provide a **Subject** (your prompt).
- You set up your **Swaps** (Find "word A", Replace with "word B").
- The node handles the rest. 

It even has a "Recursive" mode—if you accidentally plug in a **Conditioning** wire (the orange one) instead of a **String** (the gray one), it'll try to dive inside the conditioning to find the text and swap it there too.

## Options
- **swap_count**: How many pairs you want to swap (1-10).
- **case_sensitive**: OFF means it'll find "Girl" and "girl" equally. ON means it has to be an exact match.
- **clip (Optional)**: If you connect your CLIP model to this node, it'll also "encode" the prompt into conditioning for you, saving you a node later.

## Use Case Scenarios
**Scenario 1: Testing Variations**
If you have a prompt for a "cyberpunk city at sunset" and want to see it at "noon", "midnight", and "dawn", you can use Switcheroo to just swap that one word without re-typing the whole prompt.

**Scenario 2: Cleaning up JSON**
If you're passing data between nodes as a JSON string, you can use this to quickly swap out IDs or titles in the text.

## Quick Start
1. Add `H4_Switcheroo`.
2. Enter your primary text in the `subject` input.
3. Fill in `find_1` and `replace_1`.
4. Use the `string` output for your next node.

---

## Dev Corner (Jargon & Logic)
- **Recursive Extraction**: If the input is a conditioning tensor, it attempts to find the embedded prompt string by traversing the data structure.
- **HUD Synchronization**: The node shows a "Live Terminal" on its face so you can see the final prompt text before it's sent to the AI.
