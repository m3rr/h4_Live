import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

// ------------------------------------------------------------------------------
// H4 SmartSave UI - Film Strip, Lightbox & Parameter Drawer
// ------------------------------------------------------------------------------

const STYLE = `
.h4-smart-root {
    width: 100%;
    background: transparent;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    position: relative;
    margin-top: 10px;
}

/* --- FILMSTRIP --- */
.h4-smart-strip {
    height: 100px;
    background: #080808;
    display: flex;
    overflow-x: auto;
    padding: 10px;
    gap: 10px;
    border: 1px solid rgba(0, 170, 68, 0.2);
    border-radius: 4px;
    margin-bottom: 10px;
}

.h4-smart-thumb {
    height: 100%; aspect-ratio: 1;
    background: #111;
    border: 1px solid #333;
    position: relative;
    cursor: pointer;
    flex-shrink: 0;
    transition: transform 0.2s, border-color 0.2s;
    background-size: cover;
    background-position: center;
    border-radius: 2px;
}
.h4-smart-thumb:hover { transform: scale(1.05); border-color: #666; }
.h4-smart-thumb.active { border-color: #00ff55; box-shadow: 0 0 10px rgba(0,255,85,0.4); }

/* --- DRAWER (Parameters) --- */
.h4-smart-drawer {
    background: #0a0a0a;
    border: 1px solid rgba(0, 102, 34, 0.3);
    border-left: 3px solid #006622;
    padding: 15px;
    color: #ddd;
    font-family: 'Segoe UI', 'Roboto', monospace;
    font-size: 11px;
    max-height: 400px;
    overflow-y: auto;
    display: none; /* Hidden by default until selected */
    border-radius: 4px;
}
.h4-smart-drawer.open { display: block; }

.h4-smart-param-block { margin-bottom: 15px; border-bottom: 1px dashed #222; padding-bottom: 10px; }
.h4-smart-param-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
.h4-smart-label { color: #666; text-transform: uppercase; font-size: 9px; letter-spacing: 1px; }
.h4-smart-val { color: #00ff55; font-family: monospace; text-align: right; }
.h4-smart-prompt { 
    background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px; 
    color: #ccc; font-size: 10px; line-height: 1.4; margin-top: 5px; white-space: pre-wrap;
}

/* --- LIGHTBOX --- */
.h4-smart-lightbox {
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0,0,0,0.95); z-index: 99999;
    display: none; flex-direction: column; align-items: center; justify-content: center;
}
.h4-smart-lightbox.open { display: flex; }
.h4-smart-lb-img {
    max-width: 95vw; max-height: 95vh;
    object-fit: contain;
    box-shadow: 0 0 50px rgba(0,0,0,0.8);
    transition: transform 0.1s;
    transform-origin: center;
}
.h4-smart-lb-close {
    position: absolute; top: 30px; right: 30px; color: #555; font-size: 30px; cursor: pointer;
}
.h4-smart-lb-close:hover { color: #fff; }
`;

class SmartSaveUI {
    constructor(node) {
        this.node = node;
        this.history = [];
        this.selected = null;
        this.liveParams = null; // Params for the current execution

        // CSS
        let style = document.getElementById("h4-smart-save-style");
        if (!style) {
            style = document.createElement("style");
            style.id = "h4-smart-save-style";
            style.textContent = STYLE;
            document.head.appendChild(style);
        }

        this.initDOM();

        // Initial Fetch
        setTimeout(() => this.fetchHistory(), 1000);

        // Polling (Every 10s is enough for file system)
        setInterval(() => this.fetchHistory(), 10000);
    }

    initDOM() {
        this.root = document.createElement("div");
        this.root.className = "h4-smart-root";

        // Film Strip
        this.strip = document.createElement("div");
        this.strip.className = "h4-smart-strip";
        this.strip.innerHTML = "<div style='color:#444; font-size:10px; padding:10px;'>LOADING HISTORY...</div>";
        this.root.appendChild(this.strip);

        // Param Drawer
        this.drawer = document.createElement("div");
        this.drawer.className = "h4-smart-drawer";
        this.root.appendChild(this.drawer);

        // Lightbox
        this.lb = document.createElement("div");
        this.lb.className = "h4-smart-lightbox";
        this.lbImg = document.createElement("img");
        this.lbImg.className = "h4-smart-lb-img";
        this.lb.appendChild(this.lbImg);

        const close = document.createElement("div");
        close.className = "h4-smart-lb-close";
        close.innerHTML = "&times;";
        close.onclick = () => this.lb.classList.remove("open");
        this.lb.appendChild(close);

        // Zoom/Pan State
        this.lbState = { scale: 1, x: 0, y: 0, dragging: false };

        this.lb.onwheel = (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            this.lbState.scale = Math.max(0.5, Math.min(20, this.lbState.scale * delta));
            this.updateTransform();
        };
        this.lbImg.onmousedown = (e) => {
            e.preventDefault();
            this.lbState.dragging = true;
            this.lbState.lx = e.clientX;
            this.lbState.ly = e.clientY;
        };
        window.addEventListener("mousemove", (e) => {
            if (this.lbState.dragging) {
                const dx = e.clientX - this.lbState.lx;
                const dy = e.clientY - this.lbState.ly;
                this.lbState.x += dx;
                this.lbState.y += dy;
                this.lbState.lx = e.clientX;
                this.lbState.ly = e.clientY;
                this.updateTransform();
            }
        });
        window.addEventListener("mouseup", () => { this.lbState.dragging = false; });

        document.body.appendChild(this.lb);
    }

    updateTransform() {
        this.lbImg.style.transform = `translate(${this.lbState.x}px, ${this.lbState.y}px) scale(${this.lbState.scale})`;
    }

    async fetchHistory() {
        try {
            const res = await api.fetchApi("/h4/smart_save/history");
            if (res.ok) {
                const data = await res.json();
                // Simple diff check to avoid flickering
                const currentSig = this.history[0]?.timestamp;
                const newSig = data[0]?.timestamp;

                if (currentSig !== newSig || this.history.length !== data.length) {
                    this.history = data;
                    this.renderStrip();
                }
            }
        } catch (e) {
            console.error("SmartSave History Error", e);
        }
    }

    renderStrip() {
        this.strip.innerHTML = "";
        if (this.history.length === 0) {
            this.strip.innerHTML = "<div style='color:#444; font-size:10px; padding:10px;'>NO HISTORY FOUND</div>";
            return;
        }

        this.history.forEach((item) => {
            const thumb = document.createElement("div");
            thumb.className = "h4-smart-thumb";
            if (this.selected && this.selected.filename === item.filename) thumb.classList.add("active");

            // Image URL
            const url = api.apiURL(`/view?filename=${encodeURIComponent(item.filename)}&subfolder=${encodeURIComponent(item.subfolder)}&type=${item.type}`);
            thumb.style.backgroundImage = `url("${url}")`;

            thumb.onclick = () => {
                this.selected = item;
                this.renderStrip(); // Update active state
                this.renderDrawer(item);
            };

            thumb.ondblclick = () => {
                this.lbImg.src = url;
                this.lbState = { scale: 1, x: 0, y: 0, dragging: false };
                this.updateTransform();
                this.lb.classList.add("open");
            };

            this.strip.appendChild(thumb);
        });
    }

    // Crawl live graph for params
    async crawlLive() {
        // Find self in graph
        const selfParams = this.crawlUpstreamVariables(this.node);
        this.liveParams = selfParams;
        // If we just executed, and haven't selected anything, show live params
        if (!this.selected) {
            this.renderDrawer(null, true);
        }
    }

    renderDrawer(item, isLive = false) {
        this.drawer.innerHTML = "";
        this.drawer.classList.add("open");

        const header = document.createElement("div");
        header.style.cssText = "color:#00ff55; font-weight:bold; margin-bottom:10px; border-bottom:1px solid #333; padding-bottom:5px;";
        header.textContent = isLive ? "LIVE PARAMETERS (ACTIVE)" : "HISTORY PARAMETERS";
        this.drawer.appendChild(header);

        let data = {};

        if (isLive && this.liveParams) {
            data = this.liveParams;
        } else if (item) {
            // Extract from item metadata
            // 1. Check user_meta (highest priority for custom stuff)
            // 2. Check prompt (ComfyUI execution info)

            // Try to resolve "Prompt" JSON to readable widgets
            if (item.prompt) {
                data = this.parsePromptJSON(item.prompt);
            }

            // Overlay explicit prompt text if available
            if (item.user_meta?.prompt) data.prompt_pos = item.user_meta.prompt;

            // Fallback: If node saved custom metadata from input
            if (item.user_meta) {
                Object.assign(data, item.user_meta);
            }
        }

        if (Object.keys(data).length === 0) {
            this.drawer.innerHTML += "<div style='color:#444; font-style:italic;'>No parameter data available.</div>";
            return;
        }

        // Helper to render rows
        const addRow = (label, val) => {
            if (!val) return;
            const r = document.createElement("div");
            r.className = "h4-smart-param-row";
            r.innerHTML = `<span class="h4-smart-label">${label}</span><span class="h4-smart-val">${val}</span>`;
            this.drawer.appendChild(r);
        };

        const addBlock = (label, text) => {
            if (!text) return;
            const l = document.createElement("div");
            l.className = "h4-smart-label";
            l.style.marginTop = "8px";
            l.textContent = label;
            const b = document.createElement("div");
            b.className = "h4-smart-prompt";
            b.textContent = text;
            this.drawer.appendChild(l);
            this.drawer.appendChild(b);
        };

        // Render Specific Fields in Order
        addRow("CHECKPOINT", data.ckpt_name);
        addRow("VAE", data.vae_name);
        addRow("SAMPLER", data.sampler_name);
        addRow("SCHEDULER", data.scheduler);
        addRow("STEPS", data.steps);
        addRow("CFG", data.cfg);
        addRow("SEED", data.seed);

        addBlock("POSITIVE PROMPT", data.positive || data.prompt_pos);
        addBlock("NEGATIVE PROMPT", data.negative || data.prompt_neg);

        // Loras
        if (data.loras && data.loras.length) {
            const l = document.createElement("div");
            l.className = "h4-smart-label";
            l.style.marginTop = "8px";
            l.textContent = "LORAS";
            this.drawer.appendChild(l);
            data.loras.forEach(lora => {
                const d = document.createElement("div");
                d.style.display = "flex"; d.style.justifyContent = "space-between";
                d.innerHTML = `<span style='color:#ccc'>${lora.name}</span><span style='color:#888'>${lora.strength}</span>`;
                this.drawer.appendChild(d);
            });
        }
    }

    // Graph Crawler (Live)
    crawlUpstreamVariables(node, visited = new Set(), results = {}) {
        if (!node || visited.has(node.id)) return results;
        visited.add(node.id);

        const type = node.comfyClass || node.type || "";

        // Heuristics
        if (node.widgets) {
            for (const w of node.widgets) {
                const n = w.name.toLowerCase();
                const v = w.value;
                if (!v) continue;

                if (n === "seed") results.seed = v;
                if (n === "steps") results.steps = v;
                if (n === "cfg") results.cfg = v;
                if (n === "sampler_name") results.sampler_name = v;
                if (n === "scheduler") results.scheduler = v;
                if (n === "ckpt_name") results.ckpt_name = v;
                if (n === "vae_name") results.vae_name = v;
                if (n === "text" || n === "string") {
                    // Try to guess if POS or NEG based on connections
                    // Hard to know without context, let's just store candidates
                    // Or rely on KSampler inputs
                }
            }
        }

        // Recursion
        if (node.inputs) {
            for (const inp of node.inputs) {
                if (inp.link) {
                    const link = app.graph.links[inp.link];
                    if (link) {
                        const upstream = app.graph.getNodeById(link.origin_id);

                        // Context Aware Crawl
                        if (type.includes("KSampler")) {
                            if (inp.name === "positive") this.extractPrompt(upstream, "positive", results);
                            if (inp.name === "negative") this.extractPrompt(upstream, "negative", results);
                        }

                        this.crawlUpstreamVariables(upstream, visited, results);
                    }
                }
            }
        }
        return results;
    }

    extractPrompt(node, type, results) {
        if (!node) return;
        // Find text widget
        const w = node.widgets?.find(w => w.name === "text" || w.name === "string");
        if (w) {
            results[type] = w.value;
        } else {
            // Continue up?
            if (node.inputs) {
                for (const i of node.inputs) {
                    if (i.link) {
                        const l = app.graph.links[i.link];
                        if (l) this.extractPrompt(app.graph.getNodeById(l.origin_id), type, results);
                    }
                }
            }
        }
    }

    // Parser for JSON stored in PNG (History)
    parsePromptJSON(promptInfo) {
        const res = {};
        // promptInfo is { NodeID: { inputs: {...}, class_type: "..." } }

        for (const [id, node] of Object.entries(promptInfo)) {
            const inputs = node.inputs;
            const type = node.class_type;

            if (type.includes("KSampler")) {
                if (inputs.seed) res.seed = inputs.seed;
                if (inputs.steps) res.steps = inputs.steps;
                if (inputs.cfg) res.cfg = inputs.cfg;
                if (inputs.sampler_name) res.sampler_name = inputs.sampler_name;
                if (inputs.scheduler) res.scheduler = inputs.scheduler;

                // For prompts, we need to trace the ID
                if (inputs.positive && Array.isArray(inputs.positive)) {
                    const posID = inputs.positive[0];
                    res.positive = this.findTextInJson(promptInfo, posID);
                }
                if (inputs.negative && Array.isArray(inputs.negative)) {
                    const negID = inputs.negative[0];
                    res.negative = this.findTextInJson(promptInfo, negID);
                }
            }
            if (type.includes("CheckpointLoader")) {
                if (inputs.ckpt_name) res.ckpt_name = inputs.ckpt_name;
            }
            if (type.includes("VAELoader")) {
                if (inputs.vae_name) res.vae_name = inputs.vae_name;
            }
        }
        return res;
    }

    findTextInJson(fullJson, id) {
        const node = fullJson[id];
        if (!node) return null;
        if (node.inputs && (node.inputs.text || node.inputs.string)) return node.inputs.text || node.inputs.string;
        // recurse? inputs often refer to other nodes
        return null;
    }

}

app.registerExtension({
    name: "h4.SmartSave",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "H4_SmartSave") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                if (onNodeCreated) onNodeCreated.apply(this, arguments);

                // Add UI
                const ui = new SmartSaveUI(this);
                this.addDOMWidget("h4_smart_ui", "custom", ui.root, { serialize: false });

                // Expand size
                this.setSize([this.size[0], Math.max(this.size[1], 400)]);

                // Hook execution
                const onExecuted = this.onExecuted;
                this.onExecuted = function () {
                    if (onExecuted) onExecuted.apply(this, arguments);
                    ui.crawlLive();
                    setTimeout(() => ui.fetchHistory(), 500); // Sync new file
                };
            };
        }
    }
});
