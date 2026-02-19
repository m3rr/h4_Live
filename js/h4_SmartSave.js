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
    overflow: visible;
}

/* --- BOTTOM BAR (Comparinator Style) --- */
.h4-smart-bar {
    height: 32px;
    min-height: 32px;
    background: rgba(0,0,0,0.2);
    display: flex;
    align-items: center;
    padding: 0 10px;
    gap: 16px;
    border-top: 1px solid rgba(0, 170, 68, 0.2);
}

/* --- TOGGLE BUTTON (Comparinator Style) --- */
.h4-toggle-wrap {
    display: flex; align-items: center; gap: 8px; cursor: pointer;
    transition: 0.3s;
}
.h4-toggle-wrap:hover .h4-toggle-label { color: #fff; text-shadow: 0 0 8px #fff; }

.h4-toggle-pill {
    width: 32px; height: 14px;
    background: #111;
    border-radius: 2px;
    position: relative;
    border: 1px solid #333;
    overflow: hidden;
}
.h4-toggle-knob {
    width: 50%; height: 100%;
    background: #222;
    position: absolute;
    top: 0; left: 0;
    transition: all 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
}
.h4-toggle-wrap.active .h4-toggle-knob { 
    left: 50%; background: #006622; 
    box-shadow: inset 0 0 10px rgba(255,255,255,0.5); 
}
.h4-toggle-wrap.active .h4-toggle-pill { border-color: #006622; box-shadow: 0 0 10px rgba(0,102,34,0.3); }

.h4-toggle-label { 
    font-size: 10px; color: #555; font-weight: 800;
    letter-spacing: 1px; transition: 0.3s;
}
.h4-toggle-wrap.active .h4-toggle-label { color: #eee; text-shadow: 0 0 8px rgba(0,102,34,0.5); }


/* --- HISTORY DRAWER --- */
.h4-smart-history-drawer {
    background: #050505;
    border-bottom: 2px solid rgba(0, 102, 34, 0.3);
    overflow: hidden;
    /* No CSS transition - height is controlled directly by JS animation */
}
.h4-smart-history-drawer.open {
    border-bottom-color: #006622;
}

/* --- FILMSTRIP --- */
.h4-smart-strip {
    height: 110px;
    display: flex;
    overflow-x: auto;
    padding: 10px;
    gap: 10px;
    box-sizing: border-box;
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

/* --- PARAM PANEL (Fixed position, right side of node) --- */
.h4-smart-drawer {
    position: fixed;
    z-index: 99998;
    width: 320px;
    background: rgba(10, 10, 10, 0.95);
    border: 1px solid rgba(0, 102, 34, 0.4);
    border-left: 3px solid #006622;
    padding: 15px;
    color: #ddd;
    font-family: 'Segoe UI', 'Roboto', monospace;
    font-size: 11px;
    max-height: 500px;
    overflow-y: auto;
    display: none;
    border-radius: 0 6px 6px 0;
    box-shadow: 5px 5px 20px rgba(0,0,0,0.6);
    backdrop-filter: blur(8px);
    pointer-events: auto;
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

// Height constants for state-driven computeSize
const BAR_HEIGHT = 38;     // Toggle bar (32px) + 6px visual buffer to prevent clipping
const DRAWER_HEIGHT = 130; // Film strip drawer when open
const META_HEIGHT = 90;    // Custom metadata textarea when visible

class SmartSaveUI {
    constructor(node) {
        this.node = node;
        this.history = [];
        this.selected = null;
        this.liveParams = null;
        this.historyOpen = false;
        this.metaOpen = false;
        this.paramsOpen = false;
        // Tracks the CURRENT widget height for computeSize, updated during animations
        this._currentWidgetHeight = BAR_HEIGHT;

        // CSS Injection (once per page)
        let style = document.getElementById("h4-smart-save-style");
        if (!style) {
            style = document.createElement("style");
            style.id = "h4-smart-save-style";
            style.textContent = STYLE;
            document.head.appendChild(style);
        }

        this.initDOM();

        // Initial Fetch after a short delay to ensure ComfyUI is ready
        setTimeout(() => this.fetchHistory(), 1000);
    }

    cleanup() {
        if (this.drawer && this.drawer.parentNode) {
            this.drawer.parentNode.removeChild(this.drawer);
        }
    }

    /**
     * Returns the CURRENT height the DOM widget needs.
     * This is updated progressively during animations so ComfyUI
     * allocates the correct container size (preventing clipping).
     */
    getDesiredHeight() {
        return this._currentWidgetHeight;
    }

    // -------------------------------------------------------------------------
    // DOM CONSTRUCTION
    // -------------------------------------------------------------------------
    initDOM() {
        this.root = document.createElement("div");
        this.root.className = "h4-smart-root";

        // 1. History Drawer Container (starts at height 0, JS controls expansion)
        this.histDrawer = document.createElement("div");
        this.histDrawer.className = "h4-smart-history-drawer";
        this.histDrawer.style.height = "0px";

        // Film Strip inside Drawer
        this.strip = document.createElement("div");
        this.strip.className = "h4-smart-strip";
        this.strip.innerHTML = "<div style='color:#444; font-size:10px; padding:10px;'>LOADING HISTORY...</div>";
        this.histDrawer.appendChild(this.strip);
        this.root.appendChild(this.histDrawer);

        // 2. Control Bar with TWO toggles
        const bar = document.createElement("div");
        bar.className = "h4-smart-bar";

        // Toggle 1: IMAGE HISTORY
        const histToggle = this._createToggle("IMAGE HISTORY", (active) => {
            this.historyOpen = active;
            this.histDrawer.classList.toggle("open", active);
            // Animate the drawer height from 0 -> DRAWER_HEIGHT or vice versa
            this._animateDrawer(active);
        });

        // Toggle 2: CUSTOM META
        const metaToggle = this._createToggle("CUSTOM META", (active) => {
            this.metaOpen = active;
            this._toggleMetaWidget(active);
        });

        // Toggle 3: PARAMS (opens a right-side floating panel)
        const paramsToggle = this._createToggle("PARAMS", (active) => {
            this.paramsOpen = active;
            this.drawer.classList.toggle("open", active);
            if (active) this.updateDrawerPosition();
        });
        this._paramsToggleEl = paramsToggle;

        // NEW: Manual Refresh Button
        const refreshBtn = document.createElement("div");
        refreshBtn.className = "h4-smart-toggle"; // Reuse toggle style base
        refreshBtn.style.padding = "2px 8px";
        refreshBtn.style.minWidth = "24px";
        refreshBtn.style.textAlign = "center";
        refreshBtn.textContent = "↻"; // Unicode Refresh Icon
        refreshBtn.title = "Push Me to rescan for images";
        refreshBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Visual feedback
            const old = refreshBtn.textContent;
            refreshBtn.textContent = "...";
            this.fetchHistory().then(() => {
                refreshBtn.textContent = old;
            });
        };

        bar.appendChild(histToggle);
        bar.appendChild(metaToggle);
        bar.appendChild(paramsToggle);
        bar.appendChild(refreshBtn);
        this.root.appendChild(bar);

        // 3. Param Panel (Fixed position on document.body, appears to the right of the node)
        this.drawer = document.createElement("div");
        this.drawer.className = "h4-smart-drawer";
        document.body.appendChild(this.drawer);

        // 4. Lightbox (Fullscreen image viewer)
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

        // Zoom Controls Container
        const controls = document.createElement("div");
        controls.className = "h4-smart-lb-controls";
        controls.style.position = "absolute";
        controls.style.bottom = "20px";
        controls.style.left = "50%";
        controls.style.transform = "translateX(-50%)";
        controls.style.display = "flex";
        controls.style.gap = "10px";
        controls.style.alignItems = "center";
        controls.style.background = "rgba(0,0,0,0.5)";
        controls.style.padding = "5px 15px";
        controls.style.borderRadius = "20px";
        controls.style.zIndex = "1001";

        // Slider
        const slider = document.createElement("input");
        slider.type = "range";
        slider.min = "10";
        slider.max = "500"; // 500%
        slider.value = "100";
        slider.step = "10";
        slider.style.width = "200px";
        slider.style.cursor = "pointer";

        // Label
        const label = document.createElement("span");
        label.textContent = "100%";
        label.style.color = "#fff";
        label.style.minWidth = "40px";
        label.style.textAlign = "right";
        label.style.fontFamily = "monospace";

        // Slider Logic
        slider.oninput = (e) => {
            const val = parseInt(e.target.value);
            this.lbState.scale = val / 100;
            label.textContent = `${val}%`;
            this.updateTransform();
        };

        controls.appendChild(slider);
        controls.appendChild(label);
        this.lb.appendChild(controls);

        this.zoomSlider = slider;
        this.zoomLabel = label;

        // Zoom/Pan State for Lightbox
        this.lbState = { scale: 1, x: 0, y: 0, dragging: false };

        this.lb.onwheel = (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            let newScale = this.lbState.scale * delta;

            // Clamp to slider bounds (10% - 500%)
            newScale = Math.max(0.1, Math.min(5.0, newScale));

            this.lbState.scale = newScale;
            this.zoomSlider.value = Math.round(newScale * 100);
            this.zoomLabel.textContent = `${Math.round(newScale * 100)}%`;

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

    /**
     * Updates the fixed-position parameter panel to sit to the RIGHT of the node.
     * Converts node graph coordinates to screen coordinates using the canvas transform.
     * Called every draw frame so the panel tracks the node during pan/zoom.
     */
    updateDrawerPosition() {
        if (!this.drawer || !this.drawer.classList.contains("open")) return;
        if (!app.canvas || !app.canvas.ds) return;

        // Get the node's position and size in graph space
        const nodeX = this.node.pos[0];
        const nodeY = this.node.pos[1];
        const nodeW = this.node.size[0];

        // Convert graph coords to screen coords using the canvas DataStore transform
        // screen_pos = (graph_pos + offset) * scale
        const scale = app.canvas.ds.scale;
        const offsetX = app.canvas.ds.offset[0];
        const offsetY = app.canvas.ds.offset[1];

        // The canvas element may have its own offset from the page
        const canvasRect = app.canvas.canvas.getBoundingClientRect();

        // Right edge of node in screen space
        const screenRight = (nodeX + nodeW + offsetX) * scale + canvasRect.left;
        const screenTop = (nodeY + offsetY) * scale + canvasRect.top;

        // Position the drawer panel to the right, with a small gap
        this.drawer.style.left = `${screenRight + 8}px`;
        this.drawer.style.top = `${screenTop}px`;
    }

    // -------------------------------------------------------------------------
    // HELPERS
    // -------------------------------------------------------------------------

    /**
     * Creates a Comparinator-style toggle button element.
     * @param {string} label - The text label for the toggle.
     * @param {function} onToggle - Callback invoked with (boolean) when toggled.
     * @returns {HTMLElement} The toggle wrapper element.
     */
    _createToggle(label, onToggle) {
        const wrap = document.createElement("div");
        wrap.className = "h4-toggle-wrap";
        wrap.innerHTML = `
            <div class="h4-toggle-pill"><div class="h4-toggle-knob"></div></div>
            <div class="h4-toggle-label">${label}</div>
        `;
        let active = false;
        wrap.onclick = () => {
            active = !active;
            wrap.classList.toggle("active", active);
            onToggle(active);
        };
        return wrap;
    }

    /**
     * Animates the history drawer open/close AND the node height simultaneously.
     * The drawer height is set directly via JS (no CSS transition) to stay
     * perfectly in sync with the node's setSize() calls.
     * @param {boolean} opening - Whether the drawer is opening or closing.
     */
    _animateDrawer(opening) {
        const startDrawerH = opening ? 0 : DRAWER_HEIGHT;
        const targetDrawerH = opening ? DRAWER_HEIGHT : 0;
        const startTime = performance.now();
        const duration = 400;

        const animate = (time) => {
            const progress = Math.min((time - startTime) / duration, 1);
            // Easing curve approximately matching cubic-bezier(0.19, 1, 0.22, 1)
            const eased = 1 - Math.pow(1 - progress, 4);

            // Update drawer CSS height
            const currentDrawerH = startDrawerH + (targetDrawerH - startDrawerH) * eased;
            this.histDrawer.style.height = `${currentDrawerH}px`;

            // Update _currentWidgetHeight so computeSize reports the correct value
            // This prevents ComfyUI from clipping the DOM widget container
            this._currentWidgetHeight = BAR_HEIGHT + currentDrawerH;

            // Force node to match its computed minimum (title + inputs + widgets)
            // This works for both expanding (open) and shrinking (close)
            const sz = this.node.computeSize();
            this.node.setSize([this.node.size[0], sz[1]]);
            app.graph.setDirtyCanvas(true, true);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Final snap to exact target values
                this.histDrawer.style.height = `${targetDrawerH}px`;
                this._currentWidgetHeight = BAR_HEIGHT + targetDrawerH;
                const finalSz = this.node.computeSize();
                this.node.setSize([this.node.size[0], finalSz[1]]);
            }
        };
        requestAnimationFrame(animate);
    }

    /**
     * Shows or hides the custom_metadata widget on the node.
     * When shown, it re-enables the widget as a normal STRING input.
     * When hidden, it collapses the widget to zero height.
     * @param {boolean} show - Whether to show the widget.
     */
    _toggleMetaWidget(show) {
        if (!this.node.widgets) return;
        const w = this.node.widgets.find(w => w.name === "custom_metadata");
        if (!w) return;

        const startNodeH = this.node.size[1];

        if (show) {
            // Restore as a visible multiline string input
            w.type = "customtext";
            w.computeSize = () => [this.node.size[0], META_HEIGHT];
            w.hidden = false;
            // Expand node to fit the textarea
            this.node.setSize([this.node.size[0], startNodeH + META_HEIGHT]);
        } else {
            // Collapse widget to zero height
            w.type = "converted-widget";
            w.computeSize = () => [0, -4];
            w.hidden = true;
            // Shrink node
            this.node.setSize([this.node.size[0], startNodeH - META_HEIGHT]);
        }
        app.graph.setDirtyCanvas(true, true);
    }

    updateTransform() {
        this.lbImg.style.transform = `translate(${this.lbState.x}px, ${this.lbState.y}px) scale(${this.lbState.scale})`;
    }

    // -------------------------------------------------------------------------
    // DATA FETCHING
    // -------------------------------------------------------------------------
    async fetchHistory() {
        try {
            // detailed logging for debugging
            // console.log("[SmartSave] Fetching history..."); 
            const res = await api.fetchApi("/h4/smart_save/history");
            if (res.ok) {
                const data = await res.json();
                // console.log(`[SmartSave] History fetched: ${data.length} items`, data[0]);

                // Simple diff check to avoid unnecessary re-renders
                const currentSig = this.history[0]?.timestamp;
                const newSig = data[0]?.timestamp;

                if (currentSig !== newSig || this.history.length !== data.length) {
                    console.log(`[SmartSave] Updating history strip. New: ${data.length}, Old: ${this.history.length}`);
                    this.history = data;
                    this.renderStrip();
                }
            } else {
                console.error("[SmartSave] History fetch failed:", res.status, res.statusText);
            }
        } catch (e) {
            console.error("[SmartSave] History fetch error:", e);
        }
    }

    // -------------------------------------------------------------------------
    // FILM STRIP RENDERING
    // -------------------------------------------------------------------------
    renderStrip() {
        this.strip.innerHTML = "";
        if (this.history.length === 0) {
            this.strip.style.display = "flex";
            this.strip.style.flexDirection = "column";
            this.strip.style.alignItems = "center";
            this.strip.style.justifyContent = "center";

            this.strip.innerHTML = `
                <div style='color:#666; font-size:11px; margin-bottom: 5px;'>NO HISTORY FOUND</div>
                <button id="h4-smart-refresh-btn" style='
                    background: #333; color: #ccc; border: 1px solid #444; 
                    padding: 2px 8px; border-radius: 4px; cursor: pointer; font-size: 10px;
                '>REFRESH</button>
            `;

            const btn = this.strip.querySelector("#h4-smart-refresh-btn");
            if (btn) btn.onclick = (e) => {
                e.stopPropagation();
                btn.textContent = "SCANNING...";
                this.fetchHistory();
            };
            return;
        }

        // Reset styles for grid mode
        this.strip.style.display = "flex";
        this.strip.style.flexDirection = "row";
        this.strip.style.alignItems = "flex-start";
        this.strip.style.justifyContent = "flex-start";

        this.history.forEach((item) => {
            const thumb = document.createElement("div");
            thumb.className = "h4-smart-thumb";
            if (this.selected && this.selected.filename === item.filename) thumb.classList.add("active");

            // Image URL via ComfyUI's view API
            const url = api.apiURL(`/view?filename=${encodeURIComponent(item.filename)}&subfolder=${encodeURIComponent(item.subfolder)}&type=${item.type}`);
            thumb.style.backgroundImage = `url("${url}")`;

            // Single click: select, auto-open params panel, and show parameters
            thumb.onclick = () => {
                this.selected = item;
                this.renderStrip();

                this.renderStrip();
                this.renderDrawer(item);
            };

            // Double click: open lightbox
            thumb.ondblclick = () => {
                this.lbImg.src = url;
                this.lbState = { scale: 1, x: 0, y: 0, dragging: false };
                this.updateTransform();
                this.lb.classList.add("open");
                if (this.zoomSlider) this.zoomSlider.value = 100;
            };

            this.strip.appendChild(thumb);
        });
    }

    // -------------------------------------------------------------------------
    // PARAMETER DISPLAY
    // -------------------------------------------------------------------------

    /** Crawl live graph for params on execution */
    async crawlLive() {
        const selfParams = this.crawlUpstreamVariables(this.node);
        this.liveParams = selfParams;
        if (!this.selected) {
            this.renderDrawer(null, true);
        }
    }

    /** Render the parameter drawer with either live or historical data */
    renderDrawer(item, isLive = false) {
        this.drawer.innerHTML = "";

        // Only update position if open
        if (this.paramsOpen) this.updateDrawerPosition();

        const header = document.createElement("div");
        header.style.cssText = "color:#00ff55; font-weight:bold; margin-bottom:10px; border-bottom:1px solid #333; padding-bottom:5px;";
        header.textContent = isLive ? "LIVE PARAMETERS (ACTIVE)" : "HISTORY PARAMETERS";
        this.drawer.appendChild(header);

        let data = {};

        if (isLive && this.liveParams) {
            data = this.liveParams;
        } else if (item) {
            if (item.prompt) {
                data = this.parsePromptJSON(item.prompt);
            }
            if (item.user_meta?.prompt) data.prompt_pos = item.user_meta.prompt;
            if (item.user_meta) {
                Object.assign(data, item.user_meta);
            }
        }

        if (Object.keys(data).length === 0) {
            this.drawer.innerHTML += "<div style='color:#444; font-style:italic;'>No parameter data available.</div>";
            return;
        }

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

        addRow("CHECKPOINT", data.ckpt_name);
        addRow("VAE", data.vae_name);
        addRow("SAMPLER", data.sampler_name);
        addRow("SCHEDULER", data.scheduler);
        addRow("STEPS", data.steps);
        addRow("CFG", data.cfg);
        addRow("SEED", data.seed);

        addBlock("POSITIVE PROMPT", data.positive || data.prompt_pos);
        addBlock("NEGATIVE PROMPT", data.negative || data.prompt_neg);

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

    // -------------------------------------------------------------------------
    // GRAPH CRAWLING (Live Parameter Extraction)
    // -------------------------------------------------------------------------
    crawlUpstreamVariables(node, visited = new Set(), results = {}) {
        if (!node || visited.has(node.id)) return results;
        visited.add(node.id);

        const type = node.comfyClass || node.type || "";

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
            }
        }

        if (node.inputs) {
            for (const inp of node.inputs) {
                if (inp.link) {
                    const link = app.graph.links[inp.link];
                    if (link) {
                        const upstream = app.graph.getNodeById(link.origin_id);
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
        const w = node.widgets?.find(w => w.name === "text" || w.name === "string");
        if (w) {
            results[type] = w.value;
        } else {
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

    // -------------------------------------------------------------------------
    // PNG METADATA PARSER (History)
    // -------------------------------------------------------------------------
    parsePromptJSON(promptInfo) {
        const res = {};
        for (const [id, node] of Object.entries(promptInfo)) {
            const inputs = node.inputs;
            const type = node.class_type;

            if (type.includes("KSampler")) {
                if (inputs.seed) res.seed = inputs.seed;
                if (inputs.steps) res.steps = inputs.steps;
                if (inputs.cfg) res.cfg = inputs.cfg;
                if (inputs.sampler_name) res.sampler_name = inputs.sampler_name;
                if (inputs.scheduler) res.scheduler = inputs.scheduler;

                if (inputs.positive && Array.isArray(inputs.positive)) {
                    res.positive = this.findTextInJson(promptInfo, inputs.positive[0]);
                }
                if (inputs.negative && Array.isArray(inputs.negative)) {
                    res.negative = this.findTextInJson(promptInfo, inputs.negative[0]);
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
        return null;
    }
}

// =============================================================================
// EXTENSION REGISTRATION
// =============================================================================
app.registerExtension({
    name: "h4.SmartSave",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "H4_SmartSave") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                if (onNodeCreated) onNodeCreated.apply(this, arguments);

                // Instantiate UI and attach as DOM widget
                const ui = new SmartSaveUI(this);
                const widget = this.addDOMWidget("h4_smart_ui", "custom", ui.root, { serialize: false });

                // WIDGET MANAGEMENT (Same pattern as h4_Comparinator)
                // Hide the custom_metadata widget initially.
                // It will be toggled visible via the "CUSTOM META" button.
                const hideWidgets = () => {
                    if (!this.widgets) return;
                    this.widgets.forEach(w => {
                        if (w.name === "custom_metadata" && !ui.metaOpen) {
                            w.type = "converted-widget";
                            w.computeSize = () => [0, -4];
                            w.hidden = true;
                        }
                    });

                    // Ensure the DOM widget renders last (after filename_prefix and save_mode)
                    const idx = this.widgets.findIndex(w => w.name === "h4_smart_ui");
                    if (idx >= 0 && idx < this.widgets.length - 1) {
                        const [uiWidget] = this.widgets.splice(idx, 1);
                        this.widgets.push(uiWidget);
                    }
                };
                hideWidgets();
                setTimeout(hideWidgets, 100);
                setTimeout(hideWidgets, 500);

                // FORCE SNAP: After widgets are hidden, snap node to exact minimum size.
                // ComfyUI never auto-shrinks, so we must explicitly set it.
                // This eliminates the extra padding at the bottom.
                setTimeout(() => {
                    hideWidgets();
                    const sz = this.computeSize();
                    this.setSize([this.size[0], sz[1]]);
                    app.graph.setDirtyCanvas(true, true);
                }, 600);

                // STATE-DRIVEN computeSize:
                // Returns the DESIRED height based on toggle states, not the rendered DOM height.
                // This avoids the chicken-and-egg problem where ComfyUI constrains the DOM widget
                // container, preventing offsetHeight from reflecting the true desired height.
                widget.computeSize = (w) => {
                    return [w, ui.getDesiredHeight()];
                };

                // Enforce widget hiding on every draw frame
                // Also update the param panel position so it tracks the node during pan/zoom
                const onDrawForeground = this.onDrawForeground;
                this.onDrawForeground = function (ctx) {
                    hideWidgets();
                    ui.updateDrawerPosition();
                    if (onDrawForeground) onDrawForeground.apply(this, arguments);
                };

                // Hook execution to crawl live parameters and refresh history
                const onExecuted = this.onExecuted;
                this.onExecuted = function () {
                    if (onExecuted) onExecuted.apply(this, arguments);
                    hideWidgets();
                    ui.crawlLive();
                    setTimeout(() => ui.fetchHistory(), 500);
                };

                // Cleanup on node removal
                const onRemoved = this.onRemoved;
                this.onRemoved = function () {
                    if (onRemoved) onRemoved.apply(this, arguments);
                    ui.cleanup();
                };
            };
        }
    }
});
