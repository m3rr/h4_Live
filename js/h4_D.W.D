h4 Dead Weight Detector
Implementation Plan, Architecture Outline & Onboarding Document
Sovereign Graph Hygiene Engine v1.0.0
SECTION 1 — Project Brief & Philosophy
What This Is
The Dead Weight Detector is a pure JavaScript ComfyUI extension that performs a real-time static analysis pass over the entire active graph, classifying every node by its connectivity health, then visually communicates that classification using a precise colour coding system. It adds a single button to the h4 toolbar — sitting alongside your existing Kirby buttons — that triggers the analysis on demand. A companion legend panel explains every colour state with verbose, detailed tooltip descriptions so users actually understand why a node is flagged, not just that it is.

This is a zero-backend tool. No Python. No server round-trips. It lives entirely in the LiteGraph canvas layer and the DOM toolbar. It reads app.graph directly.

Why It Matters
ComfyUI workflows grow fast and they grow messy. A user builds a prototype, experiments, adds nodes, removes some, forgets others. Over time, a workflow that's actually 12 nodes of real logic gets buried under 30+ nodes of accumulated junk — abandoned experiment chains, forgotten test branches, nodes that error on every queue but whose output nobody receives. The Dead Weight Detector exposes all of this in one glance, with enough detail that even a new user knows exactly what to do about it.

The "holy fuck" moment happens when someone runs it for the first time on an old workflow and immediately sees six nodes light up in three different colours they didn't know were wrong. That's the product.

Design Principles
Non-destructive by default. The analysis only highlights. It never deletes, moves, or modifies anything without explicit user action.

Colour as meaning, not decoration. Every colour maps to a precise, unambiguous graph state. The legend exists so users build literacy over time, not dependency.

Verbose by design. Tooltips are not brief. They explain the technical reason, the practical consequence, and the recommended action. Users who hover deserve to learn.

h4 aesthetic compliance. Off-Black #0c0c0c backgrounds, Tactical Cyan #00f2ff accents, monospace typography. This sits next to Oxidine and the Pythonipulator and should feel like it belongs to the same toolkit family.

SECTION 2 — Colour Classification System
The Six States
Each state represents a distinct graph condition detected by the analysis pass. The colours were chosen for maximum perceptual separation — no two adjacent states should be confusable even at a glance on a busy canvas.

🔴 RED — Total Isolation
Hex: #FF3333

A node in this state has absolutely zero connections. No inputs wired. No outputs wired. It exists on the canvas as a completely standalone island with no relationship to any other node in the graph whatsoever. It contributes nothing to any execution path and will never be reached by the ComfyUI queue scheduler under any configuration. This is the most common type of dead weight — nodes that were dropped on the canvas, experimented with, and then simply abandoned when the user moved on. They consume no compute during a queue run, but they consume mental space every time you look at the canvas. Red means: this node is inert. It is doing nothing and going nowhere. Safe to delete without affecting any part of your workflow.

🟠 ORANGE — Connected But Terminal Dead End
Hex: #FF8C00

A node in this state has at least one wire connection — it's genuinely part of a chain — but following that chain forward in every possible direction never reaches a terminal output node. The path simply ends somewhere in the middle of the graph at a node whose outputs connect to nothing. This is subtler than total isolation because the node looks busy. It has wires. It appears to be part of something. But that something goes nowhere. The most common cause is a user who built an experimental branch off the main workflow, decided against it, disconnected the end of the branch from the output, but left the rest of the chain dangling. Every node in that dangling chain gets orange. They'll all execute harmlessly if queued individually, but they contribute zero to the final output. Orange means: you're doing work that nobody sees.

🟡 YELLOW — Broken Input Chain (Will Error On Queue)
Hex: #FFD700

A node in this state has its output slot connected onwards — something downstream is depending on it — but one or more of its own required input slots have no wire attached. This is the most dangerous state in terms of actual workflow breakage. When the queue runner reaches this node, it will attempt to execute it, discover that a required input tensor is missing, and throw an execution error. The downstream nodes that were counting on its output will also fail as a cascade. Yellow is the only colour that represents an active threat to a successful queue run rather than just wasted space. Yellow means: I am in the execution path, I am expected to produce output, and I will explode when asked to do so. Fix me before you queue.

🟣 FUCHSIA — Dead Chain Member
Hex: #FF00FF

A node in this state is connected — both its inputs and outputs have wires — but every single node it connects to is itself dead. It is part of a cluster of dead nodes, all wired to each other, forming a self-contained dead subgraph that is entirely disconnected from any live execution path. This requires a two-pass analysis to detect: first identify all nodes that ARE on a live path, then flag anything wired exclusively to non-live nodes. Fuchsia is distinct from orange because the orange node is typically the end of a dead chain, while fuchsia nodes are the interior of one. A fuchsia node has context — it's surrounded by other nodes, its wires look busy — but none of that context leads anywhere useful. Fuchsia means: you and all your friends are lost together.

🔵 BLUE — Intentionally Bypassed
Hex: #00AAFF

A node in this state has been explicitly muted or bypassed by the user via ComfyUI's native bypass mechanism (the node's mode property is set to 4 in LiteGraph, which is the bypass/mute constant). This is the only colour that does NOT indicate a problem. Bypassed nodes are a legitimate workflow technique — users mute nodes to test different configurations, to temporarily skip expensive steps, or to keep reference configurations around without executing them. Blue exists to make bypassed nodes visible as a category distinct from dead weight, so the user can see at a glance "these are intentionally off" versus "these are accidentally orphaned." Blue means: I'm sleeping on purpose. Don't delete me.

🩷 HOT PINK — Active Console Error Source
Hex: #FF69B4

A node in this state is currently registered in the browser's JavaScript error log as a source of console errors. This is detected by intercepting console.error at extension load time and watching for LiteGraph node ID references in error messages, as well as listening to ComfyUI's execution_error API event which fires with a node_id payload when a backend execution fails. Hot pink is the loudest colour in the system and deliberately so. A node throwing errors is not passively useless — it is actively causing problems. It may be producing corrupted output that's quietly poisoning downstream nodes, or it may be crashing the queue mid-run and leaving the user confused about why. Hot pink means: I am on fire. Deal with me first.

SECTION 3 — Graph Analysis Architecture
Overview
The analysis engine is a pure JavaScript graph walk. It reads app.graph._nodes (the full node list) and app.graph.links (the full connection map) and produces a classification map of nodeId → colourState. This classification is then applied as a visual overlay to the canvas via each node's stored _h4dwState property, which the drawing hook reads on every frame repaint.

Phase 1 — Terminal Node Detection
The first thing the engine does is identify which nodes count as "final outputs." Rather than hardcoding a list of node type names (which would break the moment a new save node is added by any custom pack), the engine uses a purely structural definition:

A node is terminal if ALL of the following are true:

It has at least one input connection (it receives data from somewhere)

All of its output slots either have zero outgoing connections, OR it has no output slots at all

This captures SaveImage, PreviewImage, VHS_VideoCombine, and any future save/display/IO node automatically, regardless of what the node author named it. The engine also supplements this with a keyword scan of the node's comfyClass or type string, checking for terms like save, preview, output, export, write, display, combine — this catches edge cases where a node has outputs but semantically terminates the workflow.

Phase 2 — Live Path Backwards Walk (BFS)
From every identified terminal node, the engine performs a backwards breadth-first search through the graph. It follows input connections upstream, collecting every node ID it can reach. Any node reachable by this walk is "live" — it's an ancestor of an output and therefore genuinely contributes to the workflow.

This uses the same visited-set pattern you already have in Oxidine's scoutNeighborThirst function, adapted to walk input links rather than output links:

javascript
function buildLiveSet(graph) {
    const terminals = graph._nodes.filter(isTerminalNode);
    const live = new Set();
    const queue = [...terminals];
    
    while (queue.length) {
        const node = queue.shift();
        if (live.has(node.id)) continue;
        live.add(node.id);
        
        (node.inputs || []).forEach(input => {
            if (input.link == null) return;
            const link = graph.links[input.link];
            if (!link) return;
            const upstream = graph.getNodeById(link.origin_id);
            if (upstream && !live.has(upstream.id)) queue.push(upstream);
        });
    }
    return live;
}
Phase 3 — Dead Chain Detection (Fuchsia Pass)
After the live set is built, any node NOT in the live set is provisionally dead. The fuchsia pass then checks: for each dead node, does it have any connections at all to other nodes, and are ALL of those connected nodes also dead? If yes, it's a fuchsia interior node. If it has connections but they all also lead to dead ends, that's still fuchsia. If it has zero connections, that's red.

Phase 4 — Error Node Detection
At extension load time, the engine wraps console.error to intercept error messages:

javascript
const _origError = console.error;
console.error = function(...args) {
    _origError.apply(console, args);
    // scan args for node ID patterns and mark accordingly
    h4DW.scanErrorArgs(args);
};
It also listens to api.addEventListener("execution_error", ...) — the same event Oxidine uses for its virus detection — to catch backend failures.

Phase 5 — Bypass Detection
This is trivial. LiteGraph stores bypassed node state as node.mode === 4. A simple filter pass picks these up after the other classifications are assigned, since bypass takes visual precedence as an intentional state.

Classification Priority
When multiple conditions are true simultaneously, the engine assigns one colour based on this priority order (highest to lowest):

Hot Pink (active error — most urgent)

Yellow (broken input, will error on queue)

Blue (bypassed — intentional, override everything visual)

Fuchsia (dead chain interior)

Orange (dead chain end / dead end)

Red (total isolation)

SECTION 4 — Visual Implementation
Canvas Overlay Approach
Rather than modifying node colours directly (which would conflict with user-set colours and Oxidine's type colouring system), the Dead Weight Detector draws its highlights as a secondary canvas overlay layer using app.canvas.onDrawBackground or by injecting into the post-draw pipeline. Each flagged node gets:

A coloured border stroke drawn around its bounding box (2px, colour-coded)

A subtle fill tint (rgba of the flag colour at 8-12% opacity) over the node body

A small coloured dot indicator in the top-right corner of the node — visible even when zoomed out far enough that the border becomes a single pixel

Optionally: a soft glow (shadowBlur) on the border for the hot pink and yellow states, since those represent active problems that deserve attention

The overlay is drawn on top of everything else, so it remains visible regardless of node colour, background, or custom rendering like Oxidine's blob shapes.

The Toolbar Button
The button follows the exact same injection pattern as your existing Kirby buttons. It mounts into the ComfyUI toolbar DOM after the app is ready, styled with the h4 aesthetic: #0c0c0c background, #00f2ff accent colour, monospace font. The button label is a small icon — a skull or a 🧹 broom emoji works well — with a hover state that shows DEAD WEIGHT SCAN as a label.

Clicking the button triggers the full analysis pass and applies the overlay. A second click clears all highlights and resets the canvas to normal. The button itself shows a small count badge when highlights are active: "6" nodes flagged, rendered as a small cyan number superimposed on the button icon.

The Legend Panel
The legend is a floating DOM panel that appears when the user clicks the ? sub-button on the Dead Weight button (or a small ℹ️ icon adjacent to it). It renders as a fixed-position panel, styled like a terminal readout — #0c0c0c background, thin #222222 border, monospace text, h4 aesthetic throughout.

Each colour entry in the legend is a row: the colour swatch on the left, the state name in the centre, and a brief one-liner. The verbose tooltip appears when hovering a row for 1 second — this is a CSS transition-delay: 1s on a :hover pseudo-state that reveals the full description block. The tooltip text is the full verbose explanation from Section 2 of this document, truncated to nothing in the compact row and expanded fully on hover.

SECTION 5 — File Structure & Integration
File
This is a single file extension:

text
ComfyUI/custom_nodes/h4_live/
└── js/
    └── h4_dead_weight.js
It registers as h4.DeadWeightDetector and has zero dependencies beyond app and api from ComfyUI core.

Extension Registration
javascript
import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

app.registerExtension({
    name: "h4.DeadWeightDetector",
    async setup() {
        injectToolbarButton();
        installErrorInterceptor();
        installApiListeners();
    }
});
State Management
All state lives in a single module-level object:

javascript
const h4DW = {
    active: false,               // Is the scan overlay currently displayed?
    classifications: new Map(),  // nodeId -> colour hex string
    errorNodes: new Set(),       // nodeIds that have thrown errors this session
    legendVisible: false,        // Is the legend panel open?
    scanCount: 0                 // How many nodes are currently flagged?
};
No localStorage. No sessionStorage. State resets on page reload, which is correct behaviour — error states especially should be fresh each session.

SECTION 6 — Phased Build Plan
Phase 1 — Skeleton & Button (Day 1)
Get the toolbar button injected and toggling a boolean. Get the legend panel rendering with placeholder colour rows. Confirm the h4 aesthetic is correct and the button sits properly next to the Kirby buttons. No actual graph analysis yet.

Phase 2 — Live Set Walker (Day 1-2)
Implement buildLiveSet(). Log the result to console. Verify it correctly identifies live vs dead nodes on a known test workflow. This is the hardest part of the whole project — get it right before adding UI.

Phase 3 — Classification Engine (Day 2)
Run all six classification passes. Build the h4DW.classifications map. Still just logging — no canvas changes yet. Test edge cases: completely empty graph, single node, fully connected graph with no dead nodes.

Phase 4 — Canvas Overlay (Day 2-3)
Draw the border highlights and tint overlays. Hook into the canvas draw pipeline. Implement the count badge on the toolbar button. This is where it starts to feel real.

Phase 5 — Legend Tooltips (Day 3)
Write the full verbose tooltip text for each colour. Implement the 1-second hover delay reveal. Style the panel. This is polish but it's IMPORTANT polish — it's the thing that makes this educational rather than just decorative.

Phase 6 — Error Detection (Day 3-4)
Wire up the console.error interceptor and the execution_error API event listener. Test hot pink state. This is the most speculative part technically — error message formats can be unpredictable — so it gets its own phase.

Phase 7 — Nuke Button (Optional, Day 4)
A secondary button inside the legend or on the toolbar that deletes all red-classified nodes (total isolation only — the safe-to-delete ones) in one action, with a confirmation prompt. This is the "oh god yes" cherry on top but it's genuinely optional for v1.

SECTION 7 — Known Edge Cases & Gotchas
Reroute nodes — ComfyUI's native Reroute node passes data through transparently. The graph walker needs to treat it as transparent (walk through it, not terminate at it), the same way Oxidine's scoutNeighborThirst already handles this case.

Group nodes — If a user has grouped nodes, the group itself isn't a graph node — only its children are. The analysis runs on the children normally; groups don't need special handling.

Dynamic output nodes — Some custom nodes generate outputs dynamically and may not have outputs populated at analysis time. The terminal detection needs defensive null checks throughout.

Performance on huge graphs — BFS on a 200-node graph is still microseconds. This is not a performance concern. But the canvas overlay redraw should be careful not to trigger on every requestAnimationFrame — only redraw when the classification map changes.

Oxidine node classification — The Oxidine node passes data through like a Reroute, so it should also be treated as transparent in the live path walk rather than as a terminal node, even though it has no outputs consumed downstream in some configurations