This is the tighter, more complete build guide for **H4_TheForge**.
It assumes you can edit files, copy code, and follow a sequence, but it still explains the moving parts in normal language.

## What you are building
You are building a single ComfyUI node that behaves like a compact control panel.
Instead of making the user bounce between lots of separate nodes, The Forge keeps the core workflow in one place:
- Generate
- Load
- Save
- Gallery
- Optional tabs like Mask, Mutate, Switch, Tokens, and Identity

The main idea is simple: one shell, one config object, many tabs.
That makes the UI easier to use and easier to maintain.

## File layout
You only need one main JavaScript file for the extension itself:
- `h4_TheForge.js`

If you are packaging it as a ComfyUI extension, you may also have a small Python registration file.
But the actual UI work happens in the JS file, so that is where your attention should stay.

## The architecture
The Forge has four layers:
- **Shell**. The outer node frame, top bar, tab bar, main panel, and drawer.
- **State**. A single JavaScript object that remembers active tab, modules, config, and preview state.
- **Builders**. Small functions that create controls for each tab.
- **Persistence**. localStorage so settings survive refreshes.

That structure matters because it prevents the code from turning into a cursed pile of duplicated DOM nonsense.

## Startup flow
When ComfyUI loads the extension, it registers a node hook.
When the node is created, the extension:
1. Sets the node size.
2. Loads saved config.
3. Reads module toggles.
4. Injects CSS if needed.
5. Builds the shell.
6. Renders the first tab.

That is the entire boot sequence in plain English.

## Config model
The config is split into logical groups:
- `theme` for colors and glow values
- `sampler` for generation controls
- `load` for model and input controls
- `save` for output controls
- `modules` for optional tabs
- `pixelpress` for special output behavior
- `doubleSampler` for a second pass
- `latentSelector` for size and batch settings

That split is clean because each section owns one concern.
If every value lived in one giant blob of chaos, the file would become harder to debug fast.

## Shell layout
The shell is the visual skeleton of the node.
It contains:
- a top bar for module toggles
- a tab bar for navigation
- a main content region for the active tab
- a preview drawer at the bottom

The shell should feel like a mini app inside the node, not like a random pile of HTML.
That is why the code uses fixed sizing and a consistent layout system.

## CSS strategy
Use one CSS block injected once into the page.
Do not inject styles inside every tab render, because that gets messy and can duplicate rules when the extension reloads.

The stylesheet gives you:
- dark panel backgrounds
- neon accent styling
- tab button states
- section boxes
- slider and toggle polish
- preview drawer styling

The visual system is simple on purpose: dark base, muted panels, bright accent.
That makes the controls readable without fighting the eye.

## Tab behavior
The Forge uses lazy rendering.
That means a tab only builds its DOM the first time the user opens it.
After that, the tab can be reused instead of rebuilt from scratch.

This is a really good habit for UI performance.
It also makes debugging easier because each tab has a clear render moment.

The base tabs should always exist:
- Generate
- Load
- Save
- Gallery

The module tabs should appear only when their toggle is active.
That keeps the UI from feeling overstuffed.

## Generate tab
The Generate tab is the heart of the node.
It contains the usual generation controls:
- steps
- CFG
- sampler
- scheduler
- seed
- denoise

It also includes the optional second-pass controls and PixelPress options.
That lets the user tweak generation without leaving the main workflow.

The important part is clarity.
Put the most common controls first, and keep the fancy stuff grouped into its own sections.

## Load tab
The Load tab is where model-related choices live.
That usually means:
- checkpoint selection
- VAE selection
- CLIP skip
- LoRA stack
- any image input selectors

This tab can get busy, so use separate titled sections.
That way the user can visually scan the page instead of hunting through a wall of controls.

## Save tab
The Save tab handles output behavior.
That means:
- output path
- filename prefix
- file format
- metadata writing
- manual save trigger

If Generate is the front half of the workflow, Save is the back half.
It should feel deliberate and final, not buried.

## Gallery tab
The Gallery tab is your quick browser for recent outputs.
A good gallery should let the user:
- refresh the list
- filter by filename
- click a result to preview it

You do not want to load everything all at once if you can avoid it.
So if the gallery grows, keep the render lightweight and only show what matters.

## Preview drawer
The drawer is the lower panel that expands to show images or inspection content.
It should open when the user needs visual feedback and collapse when they do not.

This is a small feature that feels bigger than it is.
It lets the user inspect outputs without changing screens or breaking flow.

## Theme system
The theme lives in the config and maps into CSS variables.
That means changing the accent color or panel color does not require rewriting the whole stylesheet.
You just update the theme values and let CSS do the work.

This is the clean way to do it.
It keeps design changes separated from layout logic.

## Theme editor
In v2, the Theme button should stop being a stub and become a real editor panel.
The editor can expose:
- accent color
- font color
- muted text color
- base background
- panel background
- node background
- glow intensity

When the user changes a value, save it immediately and re-apply the CSS variables.
That gives instant feedback and keeps the UX snappy.

## Scanline preview
The preview drawer can be upgraded with a canvas overlay or CSS animation.
The scanline is cosmetic, but it gives the drawer personality.
Keep it separate from the actual image so it does not interfere with preview content.

A good rule here is: decoration should never break function.
Pretty is fine, but not at the cost of image visibility.

## SmartSave wiring
The Save tab is where SmartSave-style behavior belongs.
If you want it to feel real, let it remember path, filename format, and metadata settings.
You can also add a manual save event so the node can respond to an explicit save action.

This is the sort of thing that makes the node feel like a tool instead of a demo.

## Double sampler
The second-pass controls are for refinement.
They let the user run a later pass with different step and denoise settings.
That is useful when the user wants more detail or cleanup without changing the whole prompt chain.

Keep this feature tucked into its own section so it feels optional, not forced.

## Latent selector
The latent selector is where size and batch settings can live.
That includes width, height, and batch count.
You can keep it hidden or folded away if the node starts getting crowded.

Crowding is the enemy here.
A node can do a lot and still remain readable if you keep the sections disciplined.

## Optional tabs
The extra modules are intentionally simple in v2.
Mask, Mutate, Switch, Tokens, and Identity can begin as placeholders or lightweight stubs.
That lets you ship the frame first and add deeper behavior later.

This is a smart way to build. Big systems are easier to finish when you do not demand perfection on day one.

## What to test first
Build in layers:
1. Node appears.
2. Shell renders.
3. Tabs switch.
4. Controls save config.
5. Theme changes apply.
6. Preview drawer opens.
7. Gallery loads.
8. Manual save action fires.

Testing in that order keeps the debugging sane.
If something fails, you know exactly which layer broke.

## Common bugs
Watch for these first:
- CSS injected more than once
- tab buttons not updating active state
- config changes not persisting
- preview drawer height not matching state
- dropdown population failing because model info is missing

Most of those are state bugs, not design bugs.
That is good news, because state bugs are usually fixable once you find the edge.

## Practical v2 goal
The v2 goal is not “perfect.”
The goal is to make The Forge feel solid enough that you can actually use it without the UI collapsing into spaghetti.

Once this version works, the fancy stuff becomes easy instead of painful.
That is the real win.