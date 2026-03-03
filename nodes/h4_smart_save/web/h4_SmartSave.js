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

        // [User Request] Default to OPEN history strip
        this.historyOpen = true;
        this.metaOpen = false;
        this.paramsOpen = false;

        // Tracks the CURRENT widget height for computeSize, updated during animations
        // Default starts with drawer OPEN height now
        this._currentWidgetHeight = BAR_HEIGHT + DRAWER_HEIGHT;

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

        // [H4] Polling (30s silent)
        this.pollInterval = setInterval(() => this.fetchHistory(true), 30000);

        // [H4] Execution Listeners
        this._onExecuted = (e) => {
            // Wait for file system flush
            setTimeout(() => this.fetchHistory(true), 1000);
        };
        api.addEventListener("executed", this._onExecuted);
    }

    cleanup() {
        if (this.drawer && this.drawer.parentNode) {
            this.drawer.parentNode.removeChild(this.drawer);
        }
        if (this.lb && this.lb.parentNode) {
            this.lb.parentNode.removeChild(this.lb);
        }
        // [H4] ZOMBIE KILLER
        if (this.pollInterval) clearInterval(this.pollInterval);
        if (this._onExecuted) api.removeEventListener("executed", this._onExecuted);
    }

    onRemoved() {
        this.cleanup();
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

        // 1. History Drawer Container (starts at OPEN height now)
        this.histDrawer = document.createElement("div");
        this.histDrawer.className = "h4-smart-history-drawer open"; // Add open class
        this.histDrawer.style.height = `${DRAWER_HEIGHT}px`; // Set explicit height

        // Film Strip inside Drawer
        this.strip = document.createElement("div");
        this.strip.className = "h4-smart-strip";
        this.strip.innerHTML = "<div style='color:#444; font-size:10px; padding:10px;'>LOADING HISTORY...</div>";
        this.histDrawer.appendChild(this.strip);
        this.root.appendChild(this.histDrawer);

        // 2. Control Bar with TWO toggles
        const bar = document.createElement("div");
        bar.className = "h4-smart-bar";

        // Toggle 1: IMAGE HISTORY (Default Active)
        const histToggle = this._createToggle("IMAGE HISTORY", (active) => {
            this.historyOpen = active;
            this.histDrawer.classList.toggle("open", active);
            // Animate the drawer height from 0 -> DRAWER_HEIGHT or vice versa
            this._animateDrawer(active);
        });

        // Set toggle to active state initially
        histToggle.classList.add("active");
        histToggle.isActive = true; // Helper for internal state if needed


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
        this.lb.onclick = () => {
            this.lb.classList.remove("open");
            // [H4] Force VRAM Flush
            this.lbImg.src = "";
            this.lbImg.removeAttribute("src"); // Hint for GC
        };

        this.lbImg = document.createElement("img");
        this.lbImg.className = "h4-smart-lb-img";
        this.lb.appendChild(this.lbImg);

        const close = document.createElement("div");
        close.className = "h4-smart-lb-close";
        close.innerHTML = "&times;";
        this.lb.appendChild(close);

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
        // State is managed externally via classList mostly, but local var for click handler
        // Check if the element has 'active' class assigned immediately after creation for sync
        let active = false;

        wrap.onclick = () => {
            // Check current DOM state to sync (since we might set class externally)
            const isCurrentlyActive = wrap.classList.contains("active");
            active = !isCurrentlyActive; // Toggle

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

    // -------------------------------------------------------------------------
    // DATA FETCHING
    // -------------------------------------------------------------------------
    async fetchHistory(silent = false) {
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
                    // [H4] Silent Poll unless 10 mins passed
                    if (!this._lastLogTime) this._lastLogTime = 0;
                    if (!silent && (Date.now() - this._lastLogTime > 600000)) {
                        console.log(`[SmartSave] Updating history strip. New: ${data.length}, Old: ${this.history.length}`);
                        this._lastLogTime = Date.now();
                    }
                    // EMERGENCY CAP: Limit to 10 items to prevent lag
                    this.history = data.slice(0, 10);
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
            // Image URL via ComfyUI's view API (or H4 Thumbnail API)
            // const url = api.apiURL(`/view?filename=${encodeURIComponent(item.filename)}&subfolder=${encodeURIComponent(item.subfolder)}&type=${item.type}`);

            // THUMBNAIL OPTIMIZATION
            const thumbUrl = api.apiURL(`/h4/thumbnail?filename=${encodeURIComponent(item.filename)}&subfolder=${encodeURIComponent(item.subfolder)}&type=${item.type}`);
            // Keep full URL for lightbox
            const fullUrl = api.apiURL(`/view?filename=${encodeURIComponent(item.filename)}&subfolder=${encodeURIComponent(item.subfolder)}&type=${item.type}`);

            thumb.style.backgroundImage = `url("${thumbUrl}")`;

            // Single click: select, auto-open params panel, and show parameters
            // Single click: select, auto-open params panel, and show parameters
            thumb.onclick = async () => {
                this.selected = item;
                this.renderStrip();

                // [H4] Lazy Loading Metadata Fetch
                if (!item.prompt && !item.user_meta) {
                    const thumbOverlay = document.createElement("div");
                    thumbOverlay.style.cssText = "position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,102,34,0.4); display:flex; align-items:center; justify-content:center; color:#fff; font-size:8px;";
                    thumbOverlay.textContent = "LOADING...";
                    thumb.appendChild(thumbOverlay);

                    try {
                        const mRes = await api.fetchApi(`/h4/metadata?filename=${encodeURIComponent(item.filename)}&subfolder=${encodeURIComponent(item.subfolder)}&type=${item.type}`);
                        if (mRes.ok) {
                            const mData = await mRes.json();
                            item.prompt = mData.prompt;
                            item.workflow = mData.workflow;
                            item.user_meta = mData.user_meta;
                        }
                    } catch (e) {
                        console.error("[SmartSave] Metadata fetch failed", e);
                    } finally {
                        if (thumbOverlay.parentNode) thumbOverlay.parentNode.removeChild(thumbOverlay);
                    }
                }

                this.renderDrawer(item);
            };

            // Double click: open lightbox (Simple)
            thumb.ondblclick = () => {
                this.lbImg.src = fullUrl;
                this.lb.classList.add("open");
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
        header.style.cssText = "color:#00ff55; font-weight:bold; margin-bottom:10px; border-bottom:1px solid #333; padding-bottom:5px; display:flex; justify-content:space-between;";
        header.innerHTML = `<span>${isLive ? "LIVE PARAMETERS (ACTIVE)" : "HISTORY PARAMETERS"}</span><span style='color:#444; font-size:8px;'>v5.7.2</span>`;
        this.drawer.appendChild(header);

        if (!isLive) console.log("[SmartSave] Rendering History Drawer for item:", item);

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

        const addRow = (label, val, skipIfNull = true) => {
            if (skipIfNull && (val === undefined || val === null || val === "")) return;
            const r = document.createElement("div");
            r.className = "h4-smart-param-row";
            r.innerHTML = `<span class="h4-smart-label">${label}</span><span class="h4-smart-val">${val ?? "None"}</span>`;
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

        // ENFORCED ORDER PER USER REQUEST
        addRow("SEED", data.seed);
        addRow("CKPT", data.ckpt_name);

        // LORAS
        if (data.loras && data.loras.length) {
            data.loras.forEach((lora, idx) => {
                addRow(`LORA ${idx + 1}`, lora.name);
                addRow(`LORA ${idx + 1} STR`, lora.strength);
            });
        }

        addRow("CLIP", data.clip_name);
        addRow("VAE", data.vae_name);
        addRow("CLIPSKIP", data.clip_skip);
        addRow("SCHEDULER", data.scheduler);
        addRow("SAMPLER", data.sampler_name);
        addRow("STEPS", data.steps);
        addRow("CFG", data.cfg);
        addRow("DENOISE", data.denoise);

        addBlock("POSITIVE PROMPT", data.positive || data.prompt_pos);
        addBlock("NEGATIVE PROMPT", data.negative || data.prompt_neg);

        // EXTRA / UNSORTED DATA
        const handled = ["seed", "ckpt_name", "loras", "clip_name", "vae_name", "clip_skip", "scheduler", "sampler_name", "steps", "cfg", "denoise", "positive", "negative", "prompt_pos", "prompt_neg"];
        Object.entries(data).forEach(([k, v]) => {
            if (!handled.includes(k) && typeof v !== "object") {
                addRow(k.toUpperCase(), v);
            }
        });
    }

    // -------------------------------------------------------------------------
    // GRAPH CRAWLING (Live Parameter Extraction)
    // -------------------------------------------------------------------------
    crawlUpstreamVariables(node, visited = new Set(), results = {}) {
        if (!node || visited.has(node.id)) return results;
        visited.add(node.id);

        const type = node.comfyClass || node.type || "";

        // Collect widgets from current node
        if (node.widgets) {
            for (const w of node.widgets) {
                const n = w.name.toLowerCase();
                const v = w.value;
                if (v === undefined || v === null) continue;

                if (n === "seed") results.seed = v;
                if (n === "steps") results.steps = v;
                if (n === "cfg") results.cfg = v;
                if (n === "sampler_name") results.sampler_name = v;
                if (n === "scheduler") results.scheduler = v;
                if (n === "denoise") results.denoise = v;
                if (n === "ckpt_name") results.ckpt_name = v;
                if (n === "vae_name") results.vae_name = v;
                if (n === "clip_name") results.clip_name = v;
                if (n === "stop_at_clip_layer") results.clip_skip = v;

                // Lora Capture
                if (type.includes("LoraLoader")) {
                    if (!results.loras) results.loras = [];
                    const lName = node.widgets.find(lw => lw.name === "lora_name")?.value;
                    const lStr = node.widgets.find(lw => lw.name.includes("strength"))?.value;
                    if (lName) {
                        // Check if already captured to avoid duplicates in complex graphs
                        if (!results.loras.find(l => l.name === lName)) {
                            results.loras.push({ name: lName, strength: lStr || 1.0 });
                        }
                    }
                }
            }
        }

        if (node.inputs) {
            for (const inp of node.inputs) {
                if (inp.link) {
                    const link = app.graph.links[inp.link];
                    if (link) {
                        const upstream = app.graph.getNodeById(link.origin_id);
                        if (!upstream) continue;

                        if (type.toLowerCase().includes("ksampler")) {
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
        const res = { loras: [] };
        if (!promptInfo) return res;

        for (const [id, node] of Object.entries(promptInfo)) {
            const inputs = node.inputs;
            const type = node.class_type;
            if (!inputs) continue;

            const t = type.toLowerCase();

            if (t.includes("ksampler")) {
                if (inputs.seed !== undefined) res.seed = inputs.seed;
                if (inputs.steps !== undefined) res.steps = inputs.steps;
                if (inputs.cfg !== undefined) res.cfg = inputs.cfg;
                if (inputs.sampler_name) res.sampler_name = inputs.sampler_name;
                if (inputs.scheduler) res.scheduler = inputs.scheduler;
                if (inputs.denoise !== undefined) res.denoise = inputs.denoise;

                if (inputs.positive && Array.isArray(inputs.positive)) {
                    res.positive = this.findTextInJson(promptInfo, inputs.positive[0]);
                }
                if (inputs.negative && Array.isArray(inputs.negative)) {
                    res.negative = this.findTextInJson(promptInfo, inputs.negative[0]);
                }
            }
            if (t.includes("checkpointloader")) {
                if (inputs.ckpt_name) res.ckpt_name = inputs.ckpt_name;
            }
            if (t.includes("vaeloader")) {
                if (inputs.vae_name) res.vae_name = inputs.vae_name;
            }
            if (t.includes("cliploader")) {
                if (inputs.clip_name) res.clip_name = inputs.clip_name;
            }
            if (t.includes("clipsetlastlayer") || t.includes("clipskip")) {
                if (inputs.stop_at_clip_layer !== undefined) res.clip_skip = inputs.stop_at_clip_layer;
            }
            if (t.includes("loraloader")) {
                if (inputs.lora_name) {
                    const lStr = inputs.strength_model || inputs.strength || 1.0;
                    res.loras.push({ name: inputs.lora_name, strength: lStr });
                }
            }
        }
        console.log("[SmartSave] Parsed Metadata Results:", res);
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

// [User Request] Medium Sized Square on Summon
const DEFAULT_SIZE = [500, 280];

app.registerExtension({
    name: "h4.SmartSave",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "H4_SmartSave") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                if (onNodeCreated) onNodeCreated.apply(this, arguments);

                // Instantiate UI and attach as DOM widget
                const ui = new SmartSaveUI(this);
                this.smartUI = ui;
                const widget = this.addDOMWidget("h4_smart_ui", "custom", ui.root, { serialize: false });

                setTimeout(() => {
                    this.setSize(DEFAULT_SIZE);
                }, 50);

                const hideWidgets = () => {
                    if (!this.widgets) return;
                    this.widgets.forEach(w => {
                        if (w.name === "custom_metadata" && !ui.metaOpen) {
                            w.type = "converted-widget";
                            w.computeSize = () => [0, -4];
                            w.hidden = true;
                        }
                    });

                    const idx = this.widgets.findIndex(w => w.name === "h4_smart_ui");
                    if (idx >= 0 && idx < this.widgets.length - 1) {
                        const [uiWidget] = this.widgets.splice(idx, 1);
                        this.widgets.push(uiWidget);
                    }
                };
                hideWidgets();
                setTimeout(hideWidgets, 100);
                setTimeout(hideWidgets, 500);

                setTimeout(() => {
                    hideWidgets();
                    const sz = this.computeSize();
                    this.setSize([this.size[0], sz[1]]);
                    app.graph.setDirtyCanvas(true, true);
                }, 600);

                widget.computeSize = (w) => {
                    return [w, ui.getDesiredHeight()];
                };

                const onDrawForeground = this.onDrawForeground;
                this.onDrawForeground = function (ctx) {
                    hideWidgets();
                    ui.updateDrawerPosition();
                    if (onDrawForeground) onDrawForeground.apply(this, arguments);
                };

                const onExecuted = this.onExecuted;
                this.onExecuted = function () {
                    if (onExecuted) onExecuted.apply(this, arguments);
                    hideWidgets();
                    ui.crawlLive();
                    setTimeout(() => ui.fetchHistory(), 500);
                };

                const onRemoved = this.onRemoved;
                this.onRemoved = function () {
                    if (onRemoved) onRemoved.apply(this, arguments);
                    ui.cleanup();
                };
            };
        }
    }
});
