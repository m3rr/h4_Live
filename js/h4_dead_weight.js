import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";


/**
 * 🧹 h4 Dead Weight Detector (D.W.D) v1.0.0
 * -----------------------------------------------------------------------------
 * Sovereign Graph Hygiene Engine. Performs real-time static analysis to 
 * classify nodes by connectivity health and visualises them via canvas overlays.
 * 
 * DESIGN DOCTRINE:
 * 1. Non-destructive: Highlights only, never modifies graph without action.
 * 2. Education First: Verbose tooltips explain the "Why" and "How to fix".
 * 3. H4 Aesthetic: Monospace, Off-Black, Tactical Cyan.
 */


// ============================================================================
// 1. STATE MANAGEMENT
// ============================================================================
const h4DW = {
    active: false,               // Is the scan overlay currently displayed?
    classifications: new Map(),  // nodeId -> colour hex string
    errorNodes: new Set(),       // nodeIds that have thrown errors this session
    legendVisible: false,        // Is the legend panel open?
    scanCount: 0,                // How many nodes are currently flagged?


    config: {
        qolMasterOverride: true,
        deadWeightEnabled: true
    },


    updateVisibility() {
        const btn = document.getElementById("h4-dwd-toggle");
        if (btn) {
            const visible = this.config.qolMasterOverride && this.config.deadWeightEnabled;
            btn.style.display = visible ? "flex" : "none";
        }
    },


    // Aesthetic Tokens
    palette: {
        red: "#FF3333",          // Total Isolation
        orange: "#FF8C00",       // Terminal Dead End
        yellow: "#FFD700",       // Broken Input Chain
        fuchsia: "#FF00FF",      // Dead Chain Member
        blue: "#00AAFF",         // Intentionally Bypassed
        pink: "#FF69B4",         // Active Console Error
        cyan: "#00f2ff",         // UI Accent
        offBlack: "#0c0c0c"      // UI Background
    }
};


// ============================================================================
// 2. UI INJECTION — TOOLBAR & LEGEND
// ============================================================================


/**
 * Injects the h4-styled Kirby button into the fixed top-right toolbar.
 */
function injectToolbarButton() {
    const btn = document.createElement("div");
    btn.id = "h4-dwd-toggle";


    // Base Toolbar Style
    Object.assign(btn.style, {
        position: "fixed",
        top: "5px",
        right: "300px",
        zIndex: "9999",
        color: "#eee",
        fontFamily: "monospace",
        fontWeight: "bold",
        fontSize: "15px",
        cursor: "pointer",
        padding: "2px 10px",
        background: "rgba(0,0,0,0.6)",
        borderRadius: "4px",
        border: "1px solid #444",
        userSelect: "none",
        transition: "all 0.1s",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "26px"
    });


    // Legend Reveal Icon (?) — MOVED TO THE LEFT
    const legendBtn = document.createElement("span");
    legendBtn.textContent = "?";
    legendBtn.title = "Explain Classifications";
    Object.assign(legendBtn.style, {
        marginRight: "10px",
        fontSize: "12px",
        color: "#aaa",
        borderRight: "1px solid #444",
        paddingRight: "8px",
        transition: "color 0.2s"
    });
    btn.appendChild(legendBtn);


    // Icon and Label
    const content = document.createElement("div");
    content.innerHTML = `<span id="h4-dwd-icon" style="margin-right:8px;">(v_v)</span><span style="font-size:11px; letter-spacing:1px; opacity: 0.9;">MANUAL</span>`;
    btn.appendChild(content);


    btn.title = "RUN MANUAL DEAD WEIGHT SCAN (h4 D.W.D)";


    // Add Count Badge (Cyan)
    const badge = document.createElement("span");
    badge.id = "h4-dwd-badge";
    Object.assign(badge.style, {
        position: "absolute",
        top: "-10px",
        right: "-10px",
        background: h4DW.palette.cyan,
        color: "#000",
        fontSize: "11px",
        padding: "2px 6px",
        borderRadius: "12px",
        display: "none",
        fontWeight: "900",
        boxShadow: `0 0 8px ${h4DW.palette.cyan}`,
        pointerEvents: "none"
    });
    btn.appendChild(badge);


    // Interaction handlers
    btn.onmouseenter = () => {
        btn.style.borderColor = h4DW.palette.cyan;
        btn.style.color = h4DW.palette.cyan;
        legendBtn.style.color = h4DW.palette.cyan;
    };
    btn.onmouseleave = () => {
        if (!h4DW.active) {
            btn.style.borderColor = "#444";
            btn.style.color = "#eee";
            legendBtn.style.color = "#aaa";
        }
    };


    btn.onclick = (e) => {
        e.stopPropagation();
        if (e.target === legendBtn) {
            toggleLegend();
            return;
        }
        toggleScan();
    };


    document.body.appendChild(btn);
}


/**
 * Toggles the analysis engine and visual overlay.
 * Features the (╯°□°)╯︵ ┻━┻ "Table Flip" animation on activation.
 */
function toggleScan() {
    const btn = document.getElementById("h4-dwd-toggle");
    const icon = document.getElementById("h4-dwd-icon");
    const badge = document.getElementById("h4-dwd-badge");


    // 1. Flip State
    const wasActive = h4DW.active;
    h4DW.active = !wasActive;


    if (h4DW.active) {
        // TRIGGER ANIMATION: Table Flip
        icon.textContent = "(╯°□°)╯︵ ┻━┻";
        btn.style.borderColor = h4DW.palette.cyan;
        btn.style.color = h4DW.palette.cyan;
        btn.style.background = "rgba(0, 242, 255, 0.15)";
        btn.style.boxShadow = `0 0 10px rgba(0, 242, 255, 0.2)`;


        // Run analysis
        runAnalysis();


        if (h4DW.scanCount > 0) {
            badge.textContent = h4DW.scanCount;
            badge.style.display = "block";
        }


        // 2. REVERT ICON: Wait for the "Complete" moment
        setTimeout(() => {
            if (h4DW.active) {
                icon.textContent = "(v_v)";
            }
        }, 1500);


    } else {
        // RESET
        icon.textContent = "(v_v)";
        btn.style.borderColor = "#333";
        btn.style.color = "#888";
        btn.style.background = "rgba(0,0,0,0.5)";
        btn.style.boxShadow = "none";
        badge.style.display = "none";


        h4DW.classifications.clear();
        h4DW.scanCount = 0;
    }


    if (app.canvas) app.canvas.setDirty(true, true);
}


/**
 * Toggles the HUD Legend UI.
 */
function toggleLegend() {
    h4DW.legendVisible = !h4DW.legendVisible;
    let panel = document.getElementById("h4-dwd-legend");
    if (!panel) panel = createLegendPanel();
    panel.style.display = h4DW.legendVisible ? "block" : "none";
}


function createLegendPanel() {
    const el = document.createElement("div");
    el.id = "h4-dwd-legend";


    Object.assign(el.style, {
        position: "fixed",
        top: "40px",
        right: "60px",
        width: "360px",
        background: h4DW.palette.offBlack,
        border: "1px solid #333",
        borderRadius: "4px",
        padding: "20px",
        zIndex: "10000",
        fontFamily: "monospace",
        boxShadow: "0 10px 50px rgba(0,0,0,0.95)",
        display: "none",
        userSelect: "none"
    });


    el.innerHTML = `
        <div style="color: ${h4DW.palette.cyan}; font-weight: bold; margin-bottom: 20px; border-bottom: 1px solid #333; padding-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
            <span style="letter-spacing: 1px; font-size: 14px;">h4 // D.W.D LEGEND</span>
            <span style="cursor: pointer; color: #666; font-size: 11px;" onclick="window.dispatchEvent(new CustomEvent('h4_dwd_close_legend'))">[ CLOSE ]</span>
        </div>
        <div id="h4-dwd-items"></div>
        <div id="h4-dwd-nuke-zone" style="margin-top: 25px; text-align: center; display: none;">
            <button id="h4-dwd-nuke" style="background: rgba(255,0,0,0.1); border: 1px solid #600; color: #f55; font-family: monospace; font-size: 11px; padding: 6px 15px; cursor: pointer; border-radius: 2px;">
                ☢️ PURGE ISOLATED NODES
            </button>
        </div>
        <div style="margin-top: 20px; font-size: 11px; color: #666; border-top: 1px solid #222; padding-top: 12px; text-transform: uppercase;">
            * HOVER FOR VERBOSE FORENSIC ANALYSIS
        </div>
    `;


    window.addEventListener('h4_dwd_close_legend', () => {
        el.style.display = 'none';
        h4DW.legendVisible = false;
    });


    const items = [
        { color: h4DW.palette.pink, name: "HOT PINK", label: "Active Console Error", desc: "A node currently contributing to JavaScript console errors or backend execution failures. This is highly disruptive and should be resolved before continuing your work." },
        { color: h4DW.palette.yellow, name: "YELLOW", label: "Runtime Path Warning", desc: "One or more REQUIRED inputs are missing wire connections. This node is in the logic path and will cause an execution error if the graph is queued." },
        { color: h4DW.palette.blue, name: "BLUE", label: "Intentionally Bypassed", desc: "User-muted node (Mode: 4). This node is ignored by the execution engine. Useful for keeping reference configurations without compute cost." },
        { color: h4DW.palette.fuchsia, name: "FUCHSIA", label: "Dead Chain Member", desc: "Part of a floating cluster that never reaches a terminal output. The node is busy with wires, but none of those wires contribute to your results." },
        { color: h4DW.palette.orange, name: "ORANGE", label: "Terminal Dead End", desc: "The end of a disconnected chain. Connected downstream, but the path eventually terminates at a non-output node. Wasted compute cycles." },
        { color: h4DW.palette.red, name: "RED", label: "Total Isolation", desc: "Zero connections. A standalone island on your canvas. Safe to delete immediately without affecting your workflow in any way." }
    ];


    const container = el.querySelector("#h4-dwd-items");
    items.forEach(item => {
        const row = document.createElement("div");
        row.className = "h4-dwd-row";


        row.innerHTML = `
            <div style="width: 12px; height: 12px; border-radius: 2px; background: ${item.color}; margin-right: 15px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 0 8px ${item.color}44;"></div>
            <div style="flex: 1;">
                <div style="color: #fff; font-size: 13px; font-weight: bold;">${item.name}</div>
                <div style="color: #aaa; font-size: 10px; margin-top: 3px;">${item.label}</div>
            </div>
            <div class="h4-dwd-tooltip" style="
                position: absolute; right: 380px; top: 0; width: 300px; 
                background: ${h4DW.palette.offBlack}; border: 1px solid #444; 
                padding: 18px; color: #ccc; font-size: 12px; line-height: 1.6;
                opacity: 0; pointer-events: none; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                transition-delay: 0.8s; box-shadow: 0 15px 40px rgba(0,0,0,0.85);
                border-radius: 4px;
            ">
                <span style="color:${item.color}; font-weight: bold; display:block; margin-bottom: 8px; border-bottom: 1px solid #333; padding-bottom: 6px; font-size: 13px;">SYSTEM ANALYSIS:</span>
                ${item.desc}
            </div>
        `;
        container.appendChild(row);
    });


    // Nuke Button Logic
    const nukeBtn = el.querySelector("#h4-dwd-nuke");
    nukeBtn.onclick = () => {
        const redNodes = Array.from(h4DW.classifications.entries())
            .filter(([id, color]) => color === h4DW.palette.red)
            .map(([id]) => app.graph.getNodeById(id));


        if (redNodes.length === 0) return;


        if (confirm(`SYSTEM PROTOCOL: Delete ${redNodes.length} isolated nodes?`)) {
            redNodes.forEach(node => app.graph.remove(node));
            h4DW.legendVisible = false;
            el.style.display = "none";
            toggleScan(); // Refresh
        }
    };


    document.body.appendChild(el);
    return el;
}


// ============================================================================
// 3. ANALYSIS ENGINE
// ============================================================================


/**
 * Detects if a node is semantically a terminal node (output node).
 */
function isTerminalNode(node) {
    // 1. Check official ComfyUI metadata
    const typeDef = LiteGraph.registered_node_types[node.type];
    if (typeDef?.node_data?.output_node) return true;


    // 2. Fallback: Internal flagging used by some extensions
    if (node.is_output_node || node.output_node) return true;


    // 3. Semantic keyword check
    const type = (node.comfyClass || node.type || "").toLowerCase();
    const terminalKeywords = ["save", "preview", "export", "write", "display", "visualize", "output"];


    return terminalKeywords.some(kw => type.includes(kw));
}


function buildLiveSet(graph) {
    const live = new Set();
    const terminals = graph._nodes.filter(isTerminalNode);
    const queue = [...terminals];


    while (queue.length > 0) {
        const node = queue.shift();
        if (!node || live.has(node.id)) continue;


        live.add(node.id);


        if (node.inputs) {
            for (const input of node.inputs) {
                if (input.link != null) {
                    const link = graph.links[input.link];
                    if (link) {
                        const upstream = graph.getNodeById(link.origin_id);
                        if (upstream && !live.has(upstream.id)) queue.push(upstream);
                    }
                }
            }
        }
    }
    return live;
}


/**
 * Main analysis pass. Classifies every node into one of the 6 states.
 */
function runAnalysis() {
    if (!app.graph) return;


    const graph = app.graph;
    const nodes = graph._nodes || [];
    h4DW.classifications.clear();
    h4DW.scanCount = 0;


    // Phase 1: Build the Live Set
    const liveSet = buildLiveSet(graph);


    // Phase 2: Classification Loop
    for (const node of nodes) {
        let state = null;


        // Priority Cascade
        if (h4DW.errorNodes.has(node.id)) {
            state = h4DW.palette.pink;
        }
        else if (liveSet.has(node.id) && isMissingRequiredInput(node)) {
            state = h4DW.palette.yellow;
        }
        else if (node.mode === 4) {
            state = h4DW.palette.blue;
        }
        else if (!liveSet.has(node.id)) {
            const hasInput = node.inputs?.some(i => i.link !== null);
            const hasOutput = node.outputs?.some(o => o.links?.length > 0);


            if (!hasInput && !hasOutput) state = h4DW.palette.red;
            else if (!hasOutput) state = h4DW.palette.orange;
            else state = h4DW.palette.fuchsia;
        }


        if (state) {
            h4DW.classifications.set(node.id, state);
            h4DW.scanCount++;
        }
    }


    // Phase 3: Toggle Nuke Visibility if red nodes exist
    const panel = document.getElementById("h4-dwd-legend");
    if (panel) {
        const hasRed = Array.from(h4DW.classifications.values()).includes(h4DW.palette.red);
        panel.querySelector("#h4-dwd-nuke-zone").style.display = hasRed ? "block" : "none";
    }
}


/**
 * Advanced validation: Checks if a node is missing one or more REQUIRED inputs.
 * Ignores optional inputs, widgets, and converted widget slots.
 */
function isMissingRequiredInput(node) {
    if (!node.inputs || node.inputs.length === 0) return false;


    // 1. Get the official definition from ComfyUI/LiteGraph registry
    const typeDef = LiteGraph.registered_node_types[node.type];
    if (!typeDef || !typeDef.node_data) {
        // Fallback: If we can't find metadata, don't flag unless ALL inputs are missing
        return node.inputs.every(i => i.link === null);
    }


    const requiredConfig = typeDef.node_data.input?.required || {};


    // 2. Check every input slot on the node instance
    for (const input of node.inputs) {
        if (input.link === null) {
            // Skip converted widgets — they are optional by nature
            if (input.widget) continue;
            // Is this specific input name in the "required" config?
            if (requiredConfig[input.name]) return true;
        }
    }


    return false;
}


// ============================================================================
// 4. VISUAL OVERLAY LAYER
// ============================================================================


/**
 * Global override for all node rendering.
 */
function setupCanvasOverlay() {
    const originalDrawNode = LGraphCanvas.prototype.drawNode;


    LGraphCanvas.prototype.drawNode = function (node, ctx) {
        originalDrawNode.apply(this, arguments);


        if (h4DW.active && h4DW.classifications.has(node.id)) {
            const color = h4DW.classifications.get(node.id);
            const [w, h] = node.size;


            ctx.save();


            // 1. TACTICAL TINT
            ctx.fillStyle = color + "1a"; // ~10% opacity
            ctx.fillRect(0, 0, w, h);


            // 2. HIGHLIGHT BORDER
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;


            if (color === h4DW.palette.pink || color === h4DW.palette.yellow) {
                ctx.shadowColor = color;
                ctx.shadowBlur = 10;
                ctx.lineWidth = 3;
            }


            ctx.strokeRect(0, 0, w, h);


            // 3. FORENSIC DNA DOT (Top Right Corner)
            ctx.shadowBlur = 0;
            ctx.fillStyle = "#000";
            ctx.beginPath();
            ctx.arc(w - 10, 10, 5, 0, Math.PI * 2);
            ctx.fill();


            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(w - 10, 10, 3, 0, Math.PI * 2);
            ctx.fill();


            ctx.restore();
        }
    };
}


// ============================================================================
// 5. EVENT HOOKS
// ============================================================================


function installErrorInterceptor() {
    const _origError = console.error;
    console.error = function (...args) {
        _origError.apply(console, args);
        const str = args.map(a => String(a)).join(" ");
        const m = str.match(/node\s+(\d+)/i);
        if (m && m[1]) {
            h4DW.errorNodes.add(parseInt(m[1]));
            if (h4DW.active) runAnalysis();
        }
    };


    api.addEventListener("execution_error", (e) => {
        if (e.detail?.node_id) {
            h4DW.errorNodes.add(parseInt(e.detail.node_id));
            if (h4DW.active) runAnalysis();
        }
    });


    api.addEventListener("execution_start", () => {
        h4DW.errorNodes.clear();
        if (h4DW.active) runAnalysis();
    });
}


function injectStyles() {
    if (document.getElementById("h4-dwd-css")) return;
    const style = document.createElement("style");
    style.id = "h4-dwd-css";
    style.textContent = `
        .h4-dwd-row {
            display: flex; align-items: center; padding: 8px; 
            cursor: help; position: relative; transition: background 0.2s;
            border-radius: 4px;
        }
        .h4-dwd-row:hover { background: rgba(255,255,255,0.05); }
        .h4-dwd-row:hover .h4-dwd-tooltip { opacity: 1 !important; transform: translateX(0) !important; }
    `;
    document.head.appendChild(style);
}


// ============================================================================
// 6. INITIALISATION
// ============================================================================


app.registerExtension({
    name: "h4.DeadWeightDetector",
    async setup() {
        injectStyles();
        injectToolbarButton();
        setupCanvasOverlay();
        installErrorInterceptor();


        // Hydrate from dashboard
        if (window.h4_Dashboard && window.h4_Dashboard.config) {
            h4DW.config.qolMasterOverride = window.h4_Dashboard.config.qolMasterOverride;
            h4DW.config.deadWeightEnabled = window.h4_Dashboard.config.deadWeightEnabled;
            h4DW.updateVisibility();
        }


        window.addEventListener("h4_config_update", (e) => {
            const { key, val } = e.detail;
            if (key === "qolMasterOverride" || key === "deadWeightEnabled") {
                h4DW.config[key] = val;
                h4DW.updateVisibility();
            }
        });


        console.log("%c🧹 h4 Dead Weight Detector v1.0 ONLINE", "color: #00f2ff; font-weight: bold;");
    }
});