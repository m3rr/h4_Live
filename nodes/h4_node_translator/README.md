# h4_node_translator / H4_NodeTranslator (The Babel Fish)

## What it is
A real-time UI localization tool. A frontend-only node that translates the titles, inputs, and widgets of standard ComfyUI modules into your native language.

## Expanded Description
ComfyUI is notoriously un-localized. This alienates massive segments of the global design community who are forced to memorize complex English technical terms (`conditioning`, `denoise`, `latent constraint`) rather than natively understanding the logic mechanisms they are interacting with.

The `H4_NodeTranslator` bridges this gap. It acts as an anchor node—essentially a transparent backend structural point—that injects custom JS routines (`h4_node_translator.js`) into the browser's DOM upon load. These scripts instantly rewrite the visual labels displayed to the user without touching the internal Python execution mechanics. Because it is strictly a UI layer interaction, the node preserves execution stability entirely and won't crash your prompt parameters by accidentally misnaming a critical tensor pathway.

## Features
- **Supported Languages:** Spanish, Mandarin, German, etc.
- **Non-Destructive Overlays:** It only changes what you *see*. Python error logs, backend parameter passing, and JSON serialization are still in standard functional English to retain compatibility with other custom nodes.
- **Zero-Footprint:** Returns a structural `noop` (No Operation) backend stub when queued.

## Use Case Scenarios
**Scenario 1: Educational Outreach**
You are trying to teach a class of Spanish-speaking graphic design students the intricacies of multi-tensor diffusion graphs. Instead of spending two hours forcing them to use Google Translate on basic operations, you drop the Translation node onto the canvas and select Spanish. The entire UI repaints. `KSampler` becomes `Muestreador K`, `Steps` becomes `Pasos`. They are able to intuitively manipulate the interface based on literal comprehension rather than rote mechanical memorization.

**Scenario 2: Rapid Localization Control**
You are a bilingual user. You can toggle between translations on the fly or disable the node entirely to instantly revert the canvas back to the standard English state so you can communicate bugs accurately to GitHub repositories without having to uninstall the translation package.

## Examples
- **Basic Usage**:
  1. Add the `H4_NodeTranslator` node anywhere on your canvas.
  2. Select your desired target language from the node's dropdown widget.
  3. The Javascript event fires, crawling `app.graph._nodes` and rewriting text nodes locally in your browser. (Note: Marked as WIP, localization files must be correctly updated).
