import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

// ------------------------------------------------------------------------------
// H4 Comparinator - The Ultimate A/B Test Widget
// ------------------------------------------------------------------------------

const STYLE = `
.h4-comparinator-container {
    background: #1a1a1a;
    display: flex;
    flex-direction: column;
    border: 2px solid #333;
    font-family: monospace;
    color: #0f0;
    overflow: hidden;
    width: 600px;
    height: 500px;
    box-sizing: border-box;
}

/* MAIN DISPLAY AREA (Yellow Box) */
.h4-main-stage {
    flex: 1; /* Takes remaining height */
    display: flex;
    flex-direction: row;
    position: relative;
    overflow: hidden;
    border-bottom: 2px solid #0f0;
}

/* VIEWPORT (Red/Green Boxes) */
.h4-viewport {
    position: relative;
    height: 100%;
    overflow: hidden;
    background: #000;
    cursor: col-resize; /* Indicate sliding */
    flex-shrink: 0;
}

.h4-viewport.current-run {
    width: 100%; /* Default full width */
    border-right: 2px solid #f00; /* Red Box Border */
    transition: width 0.3s ease;
}

.h4-viewport.history-run {
    width: 0%; /* Hidden by default */
    border-left: 2px solid #0f0; /* Green Box Border */
    transition: width 0.3s ease;
    opacity: 0;
}

/* SPLIT MODE ACTIVE */
.h4-main-stage.split-mode .h4-viewport.current-run {
    width: 50%;
}
.h4-main-stage.split-mode .h4-viewport.history-run {
    width: 50%;
    opacity: 1;
}

/* IMAGES & SLIDER */
.h4-img-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    user-select: none;
    pointer-events: none;
    background: #000;
}

.h4-img-b {
    z-index: 10;
    /* Clip path will be set via JS */
}

/* SLIDER HANDLE */
.h4-slider-handle {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: #fff;
    left: 50%;
    z-index: 20;
    box-shadow: 0 0 10px #fff;
    pointer-events: none;
}

.h4-label {
    position: absolute;
    top: 5px;
    padding: 2px 5px;
    background: rgba(0,0,0,0.7);
    font-size: 10px;
    z-index: 30;
    pointer-events: none;
}
.h4-label-a { left: 5px; color: #888; }
.h4-label-b { right: 5px; color: #fff; }

.h4-viewport-tag {
    position: absolute;
    bottom: 5px;
    right: 5px;
    font-size: 14px;
    font-weight: bold;
    z-index: 30;
    padding: 2px 8px;
    background: #000;
    pointer-events: none;
}
.tag-current { color: #f00; border: 1px solid #f00; }
.tag-history { color: #0f0; border: 1px solid #0f0; }


/* HISTORY STRIP (Blue Box) */
.h4-history-strip {
    height: 100px;
    background: #111;
    border-top: 2px solid #00f; /* Blue Box Border */
    display: flex;
    flex-direction: row;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 5px;
    gap: 5px;
    box-sizing: border-box;
}

.h4-history-thumb {
    height: 100%;
    aspect-ratio: 1/1;
    border: 1px solid #444;
    cursor: pointer;
    position: relative;
    opacity: 0.6;
    transition: all 0.2s;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    flex-shrink: 0;
}

.h4-history-thumb:hover {
    opacity: 1.0;
    border-color: #fff;
}

.h4-history-thumb.active {
    border-color: #0f0;
    opacity: 1.0;
    box-shadow: 0 0 10px #0f0;
}

.h4-history-timestamp {
    position: absolute;
    bottom: 0;
    width: 100%;
    background: rgba(0,0,0,0.8);
    font-size: 9px;
    text-align: center;
    color: #ccc;
    pointer-events: none;
}

/* Custom Scrollbar for strip */
.h4-history-strip::-webkit-scrollbar {
    height: 8px;
}
.h4-history-strip::-webkit-scrollbar-track {
    background: #111;
}
.h4-history-strip::-webkit-scrollbar-thumb {
    background: #00f;
    border-radius: 4px;
}
/* Lightbox Overlay */
.h4-lightbox-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0,0,0,0.9);
    z-index: 10000;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    pointer-events: auto;
}

.h4-lightbox-img {
    max-width: 95vw;
    max-height: 85vh;
    border: 2px solid #0f0;
    box-shadow: 0 0 50px rgba(0,255,0,0.2);
}

.h4-lightbox-caption {
    margin-top: 20px;
    font-size: 20px;
    color: #fff;
    font-family: monospace;
}
.h4-lightbox-close {
    position: absolute;
    top: 20px;
    right: 30px;
    color: #fff;
    font-size: 40px;
    cursor: pointer;
    font-weight: bold;
}
.h4-lightbox-close:hover { color: #f00; }

/* CONTROL PANEL (Grey Bar) */
.h4-control-panel {
    background: #333;
    padding: 5px 10px;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 15px;
    border-top: 1px solid #555;
    height: 30px;
}

.h4-control-item {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    color: #ccc;
    cursor: pointer;
}

.h4-toggle-switch {
    width: 30px;
    height: 16px;
    background: #555;
    border-radius: 10px;
    position: relative;
    transition: background 0.3s;
}
.h4-toggle-switch.on { background: #0f0; }
.h4-toggle-knob {
    width: 12px;
    height: 12px;
    background: #fff;
    border-radius: 50%;
    position: absolute;
    top: 2px;
    left: 2px;
    transition: left 0.3s;
}
.h4-toggle-switch.on .h4-toggle-knob { left: 16px; }

.h4-btn {
    background: #444;
    border: 1px solid #666;
    color: #eee;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 10px;
    cursor: pointer;
}
.h4-btn:hover { background: #666; }
.h4-btn.active { background: #0f0; color: #000; font-weight: bold; }

/* METADATA DRAWER */
.h4-meta-drawer {
    background: #111;
    overflow: hidden;
    height: 0;
    transition: height 0.3s ease;
    border-top: 1px solid #444;
}
.h4-meta-drawer.open { height: 100px; }
.h4-meta-input {
    width: 100%;
    height: 100%;
    background: #000;
    color: #0f0;
    font-family: monospace;
    border: none;
    padding: 5px;
    resize: none;
    font-size: 11px;
    box-sizing: border-box;
}
.h4-meta-input:focus { outline: none; border-left: 2px solid #0f0; }
`;

// Inject Styles
const styleEl = document.createElement("style");
styleEl.textContent = STYLE;
document.head.appendChild(styleEl);

// ------------------------------------------------------------------------------
// UI Class
// ------------------------------------------------------------------------------
class ComparinatorUI {
    constructor(node) {
        this.node = node;
        this.node_id = String(node.id);

        // --- DOM Construction ---
        this.container = document.createElement("div");
        this.container.className = "h4-comparinator-container";

        // Main Stage (Yellow)
        this.stage = document.createElement("div");
        this.stage.className = "h4-main-stage";

        // Red Box (Current)
        this.viewCurrent = this.createViewport("current", "LIVE RUN");
        this.stage.appendChild(this.viewCurrent.el);

        // Green Box (History) - Initially Hidden via CSS
        this.viewHistory = this.createViewport("history", "HISTORY");
        this.stage.appendChild(this.viewHistory.el);

        // Blue Box (Strip)
        this.historyStrip = document.createElement("div");
        this.historyStrip.className = "h4-history-strip";

        // Control Panel
        this.controlPanel = document.createElement("div");
        this.controlPanel.className = "h4-control-panel";

        // Save Toggle
        const toggleWrap = this.createToggle("Save Output", (isOn) => {
            this.toggleSaveMode(isOn);
        });

        // Metadata Button
        this.metaBtn = document.createElement("button");
        this.metaBtn.className = "h4-btn";
        this.metaBtn.textContent = "METADATA";
        this.metaBtn.onclick = () => this.toggleDrawer();

        this.controlPanel.appendChild(toggleWrap);
        this.controlPanel.appendChild(this.metaBtn);

        // Metadata Drawer
        this.drawer = document.createElement("div");
        this.drawer.className = "h4-meta-drawer";
        this.metaInput = document.createElement("textarea");
        this.metaInput.className = "h4-meta-input";
        this.metaInput.placeholder = "Enter custom metadata here...";
        // Sync on change
        this.metaInput.addEventListener("input", (e) => {
            this.syncMetadata(e.target.value);
        });
        this.drawer.appendChild(this.metaInput);

        this.container.appendChild(this.stage);
        this.container.appendChild(this.historyStrip);
        this.container.appendChild(this.controlPanel);
        this.container.appendChild(this.drawer);

        // --- Event Listener ---
        // Bound function to store reference for removal if needed (though node lifecycle is usually persistent)
        this.onUpdate = (e) => {
            if (String(e.detail.node_id) === String(this.node.id)) {
                this.updateData(e.detail);
            }
        };
        api.addEventListener("h4.comparinator.update", this.onUpdate);
    }

    createViewport(type, tagText) {
        const el = document.createElement("div");
        el.className = `h4-viewport ${type}-run`;

        const imgA = document.createElement("img");
        imgA.className = "h4-img-layer h4-img-a";
        imgA.draggable = false;

        const imgB = document.createElement("img");
        imgB.className = "h4-img-layer h4-img-b";
        imgB.draggable = false;

        const handle = document.createElement("div");
        handle.className = "h4-slider-handle";

        const labelA = document.createElement("div");
        labelA.className = "h4-label h4-label-a";
        labelA.textContent = "A (Old)";

        const labelB = document.createElement("div");
        labelB.className = "h4-label h4-label-b";
        labelB.textContent = "B (New)";

        const tag = document.createElement("div");
        tag.className = `h4-viewport-tag tag-${type}`;
        tag.textContent = tagText;

        el.appendChild(imgA);
        el.appendChild(imgB);
        el.appendChild(handle);
        el.appendChild(labelA);
        el.appendChild(labelB);
        el.appendChild(tag);

        // --- Interaction Logic ---

        const updateSlider = (x) => {
            const rect = el.getBoundingClientRect();
            // normalized 0-1
            let t = x / rect.width;
            t = Math.max(0, Math.min(1, t));
            const percent = t * 100;

            handle.style.left = `${percent}%`;
            // Clip input: inset(top right bottom left)
            // We want to verify logic. 
            // If slider is at 10% (left), we see 10% of A and 90% of B? Or vice versa?
            // "Before / After". Usually A is left, B is right.
            // If slider is at left, we see mostly B.
            // Wait, usually slider reveals.
            // Let's assume A is Bottom Layer, B is Top Layer.
            // Clip B from Left to Reveal A?
            // "inset(0 0 0 50%)" -> Clips 50% from left. So B is only on right half. A is visible on Left half.
            // CORRECT.
            imgB.style.clipPath = `inset(0 0 0 ${percent}%)`;
        };

        el.onmousemove = (e) => {
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left;
            updateSlider(x);
        };

        // Init at 50%
        // We can't use rect yet as it might not be in DOM. setting style directly.
        imgB.style.clipPath = `inset(0 0 0 50%)`;
        handle.style.left = `50%`;

        return { el, imgA, imgB, handle };
    }

    updateData(data) {
        if (data.current) {
            this.setImages(this.viewCurrent, data.current);
        }
        if (data.history) {
            this.renderStrip(data.history);
        }
    }

    setImages(viewport, item) {
        // Cache bust slightly to force reload if name same (unlikely with timestamp)
        // using t param
        const t = item.timestamp || new Date().getTime();
        viewport.imgA.src = `/view?filename=${item.filename_a}&type=temp&t=${t}`;
        viewport.imgB.src = `/view?filename=${item.filename_b}&type=temp&t=${t}`;
    }

    renderStrip(historyList) {
        this.historyStrip.innerHTML = "";

        // Iterate logic
        historyList.forEach((item, index) => {
            const thumb = document.createElement("div");
            thumb.className = "h4-history-thumb";

            // Thumb is Image B (The 'After' result usually interesting)
            const t = item.timestamp;
            const url = `/view?filename=${item.filename_b}&type=temp&t=${t}`;
            thumb.style.backgroundImage = `url("${url}")`;

            const num = index + 1; // 1-based index

            thumb.onclick = () => {
                // Toggle Logic
                const isSelected = thumb.classList.contains("active");

                // Reset all
                Array.from(this.historyStrip.children).forEach(c => c.classList.remove("active"));

                if (isSelected) {
                    // Turn OFF
                    this.stage.classList.remove("split-mode");
                } else {
                    // Turn ON
                    thumb.classList.add("active");
                    this.setImages(this.viewHistory, item);
                    this.stage.classList.add("split-mode");
                }
            };

            // Double Click -> Lightbox (Full Res)
            // Use 'dblclick' standard event.
            thumb.addEventListener("dblclick", (e) => {
                e.stopPropagation();
                e.preventDefault(); // Prevent text selection/zoom
                this.openLightbox(item);
            });

            const stamp = document.createElement("div");
            stamp.className = "h4-history-timestamp";
            stamp.textContent = `#${num}`;
            thumb.appendChild(stamp);

            this.historyStrip.appendChild(thumb);
        });
    }

    openLightbox(item) {
        // Create Overlay
        const overlay = document.createElement("div");
        overlay.className = "h4-lightbox-overlay";

        // Close Button
        const closeBtn = document.createElement("div");
        closeBtn.className = "h4-lightbox-close";
        closeBtn.innerHTML = "&times;";
        closeBtn.onclick = () => document.body.removeChild(overlay);

        // Image (Result / B)
        const img = document.createElement("img");
        img.className = "h4-lightbox-img";
        // Force reload with timestamp
        const t = item.timestamp;
        img.src = `/view?filename=${item.filename_b}&type=temp&t=${t}`;

        // Caption
        const caption = document.createElement("div");
        caption.className = "h4-lightbox-caption";
        caption.innerText = `Run ID: ${item.id} (Result B)`;

        // A/B Toggle logic? For now just show result.

        overlay.appendChild(closeBtn);
        overlay.appendChild(img);
        overlay.appendChild(caption);

        // Close on click outside
        overlay.onclick = (e) => {
            if (e.target === overlay) document.body.removeChild(overlay);
        };

    }

    // --- Control Logic ---

    createToggle(label, callback) {
        const wrap = document.createElement("div");
        wrap.className = "h4-control-item";

        const txt = document.createElement("span");
        txt.textContent = label;

        const sw = document.createElement("div");
        sw.className = "h4-toggle-switch";
        const knob = document.createElement("div");
        knob.className = "h4-toggle-knob";
        sw.appendChild(knob);

        sw.onclick = () => {
            const isOn = !sw.classList.contains("on");
            sw.classList.toggle("on", isOn);
            callback(isOn);
        };

        wrap.appendChild(txt);
        wrap.appendChild(sw);

        // Store for external update if needed
        wrap._toggle = sw;

        return wrap;
    }

    toggleSaveMode(isOn) {
        // Sync with Node Widget 'save_mode'
        // Find widget
        const w = this.node.widgets.find(w => w.name === "save_mode");
        if (w) {
            w.value = isOn;
            this.node.setDirtyCanvas(true);
        }

        // Auto-open drawer if ON?
        if (isOn) {
            this.drawer.classList.add("open");
            this.metaBtn.classList.add("active");
        } else {
            // User requested: "Needs to go away" -> Auto-close when toggle OFF
            this.drawer.classList.remove("open");
            this.metaBtn.classList.remove("active");
        }
    }

    toggleDrawer() {
        const isOpen = this.drawer.classList.contains("open");
        if (isOpen) {
            this.drawer.classList.remove("open");
            this.metaBtn.classList.remove("active");
        } else {
            this.drawer.classList.add("open");
            this.metaBtn.classList.add("active");
        }
    }

    syncMetadata(text) {
        const w = this.node.widgets.find(w => w.name === "metadata_text");
        if (w) {
            w.value = text;
        }
    }
}


app.registerExtension({
    name: "h4.Comparinator",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "H4_Comparinator") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;

            nodeType.prototype.onNodeCreated = function () {
                if (onNodeCreated) onNodeCreated.apply(this, arguments);

                // Initialize UI
                const ui = new ComparinatorUI(this);
                this.comparinatorUI = ui;

                // Add to LiteGraph
                // addDOMWidget(name, type, element, options)
                // Note: 'custom' type with element passed is standard for some mods,
                // but if not supported, we might need a resize hook.
                // Assuming modern ComfyUI environment (ComfyUI-Manager era).

                if (this.addDOMWidget) {
                    this.addDOMWidget("h4_comparinator_ui", "custom", ui.container, {
                        serialize: false,
                        hideOnZoom: false
                    });
                } else {
                    console.error("[H4_Comparinator] Node does not support addDOMWidget!");
                    // Fallback ? 
                    // Usually we attach to document.body and manage position in onDraw.
                    // But let's hope addDOMWidget is there (It is in standard GraphNode).
                }

                // Force size
                this.setSize([640, 580]);

                // HIDE STANDARD WIDGETS (We control them via UI)
                // We do this by finding them and setting their computeSize to basically zero/hidden.
                // or just type = hidden if supported.

                const hideWidget = (wName) => {
                    const w = this.widgets.find(w => w.name === wName);
                    if (w) {
                        w.type = "hidden";
                        w.computeSize = () => [0, -4]; // The classic Comfy hack
                        w.visible = false;
                    }
                };

                // Defer slightly to ensure widgets exist
                setTimeout(() => {
                    hideWidget("save_mode");
                    hideWidget("metadata_text");
                    // Force resize/redraw
                    this.onResize && this.onResize(this.size);
                    app.graph.setDirtyCanvas(true, true);
                }, 100);
            };
        }
    }
});
