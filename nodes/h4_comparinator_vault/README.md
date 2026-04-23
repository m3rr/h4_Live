# h4_comparinator_vault / H4_ComparinatorVault (The History Saver)

## What it is
The "brain" for the A/B comparison system. It's a silent background node that saves a history of your generations to your hard drive so that if you restart ComfyUI or refresh your browser, your "reference" images aren't lost.

## Expanded Description
The `H4_Comparinator` lets you compare your current image to your past work. But normally, if you turn off your computer, that past work vanishes from the node's memory. 

The **Vault** fixes this. 
It creates a small "registry" file in your output folder. 
- It tracks the **Hashes** (unique fingerprints) of your images.
- It remembers the **Settings** (prompts, seeds) that made them.
- It restores your **History Strip** (those little thumbnails) every time you load your workflow.

## Use Case Scenarios
**Scenario 1: Checking back on Friday's work**
You find a perfect set of colors on Friday but you're too tired to finish the prompt. On Monday, you open ComfyUI and the **Vault** restores that Friday generation to your history strip so you can compare your new work against it instantly.

**Scenario 2: Not losing your "Gold Master"**
You generated a masterpiece and "Locked" it as a reference. You accidentally delete the node or your browser crashes. Re-adding the node pulls the data from the Vault and your locked image is back where it belongs.

## Quick Start
1. Drop `H4_ComparinatorVault` anywhere on your canvas. It doesn't need connections.
2. It will silently save your history as you generate.
3. Your `H4_Comparinator` nodes will now remember their history strips across restarts.

---

## Dev Corner (Jargon & Logic)
- **JSON Registry**: Saves a mapping of image hashes to metadata in a hidden file.
- **Fingerprinting**: Uses SHA-256 to ensure that if an image is renamed on disk, the vault can still identify it by its "pixels" rather than just its filename.
- **Disk Pruning**: It deletes old entries if their physical image files are deleted from the `output/` folder.
