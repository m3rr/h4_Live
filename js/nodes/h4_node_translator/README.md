# h4_node_translator / H4_NodeTranslator (WIP)

## What it is
A simple tool to help make ComfyUI easier to use if English isn't your first language. It's a visual-only layer that swaps out terms on your screen for your native tongue in real-time. 

**NOTE: This is very much a Work In Progress (WIP).** Some nodes might not translate perfectly, but it covers the basics.

## Expanded Description
Most custom nodes are made in English, which can be a pain if you're trying to figure out what a "Sampler" or "Latent" is in another language. 

The **Node Translator** doesn't mess with the backend or your workflow logic. It just sits on your canvas and tries to rename the labels, buttons, and tooltips as they appear. It's safe to use—if you send your workflow to someone who doesn't have this node, it'll just show up in English for them like normal.

## Options
- **language**: Pick your language (Spanish, Mandarin, German, French, etc.).
- **translate_titles**: Rename the nodes themselves.
- **translate_widgets**: Rename the sliders and text boxes.
- **translate_tooltips**: Translate the little help messages that pop up.

## Use Case Scenarios
**Scenario 1: Learning the ropes**
If you're new to AI art and prefer working in Spanish, this makes all the technical sliders (like CFG and Steps) way more approachable while you're still learning the jargon.

**Scenario 2: Sharing with international teams**
If you're working with people in different countries, you can all use the same workflow but see it in your own language.

## Quick Start
1. Drop the `H4_NodeTranslator` node anywhere on your screen.
2. Pick your language from the list.
3. Watch the nodes update their labels. 

---

## Dev Corner (Jargon & Logic)
- **DOM Hijacking**: The Javascript frontend monitors the drawing loop and performs text-replacements before the final draw.
- **Safety Bypass**: We explicitly ignore internal property names so we don't accidentally break the communication between the browser and the server.
