import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

// ------------------------------------------------------------------------------
// H4 Comparinator -> INSPECTINATOR
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
    transition: border-color 0.3s;
}

/* MODES */
.h4-comparinator-container.mode-inspect {
    border-color: #0ff; /* Cyan for Inspect */
}

/* MAIN DISPLAY AREA */
.h4-main-stage {
    flex: 1; 
    display: flex;
    flex-direction: row;
    position: relative;
    overflow: hidden;
    border-bottom: 2px solid #555;
}

/* VIEWPORT (Left/Right) */
.h4-viewport {
    position: relative;
    height: 100%;
    overflow: hidden;
    background: #000;
    flex-shrink: 0;
    transition: width 0.3s ease;
}

/* LEFT PANE (Current/Live) - Always Visible */
.h4-viewport.pane-left {
    width: 50%; 
    border-right: 2px solid #333;
    z-index: 10;
}

/* RIGHT PANE (History OR Zoom) */
.h4-viewport.pane-right {
    width: 50%;
    border-left: 0;
    z-index: 5;
}

/* FULL MODE (When not splitted) */
.h4-main-stage.full-mode .h4-viewport.pane-left { width: 100%; border-right: none; }
.h4-main-stage.full-mode .h4-viewport.pane-right { width: 0%; }

/* IMAGES */
.h4-img-layer {
    width: 100%;
    height: 100%;
    object-fit: contain;
    user-select: none;
    pointer-events: none;
    display: block;
}

/* CANVAS FOR ZOOM (Right Pane) */
.h4-zoom-canvas {
    width: 100%;
    height: 100%;
    background-color: #000;
    background-repeat: no-repeat;
    /* Background image set via JS */
    cursor: crosshair;
}

/* RETICLE (On Left Pane) */
.h4-reticle {
    position: absolute;
    border: 1px solid #0ff;
    box-shadow: 0 0 5px #0ff;
    pointer-events: none;
    display: none; /* Hidden by default */
    z-index: 50;
    background: rgba(0, 255, 255, 0.1);
}

/* TAGS */
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
    border: 1px solid #555;
}
.tag-current { color: #f00; border-color: #f00; }
.tag-history { color: #0f0; border-color: #0f0; }
.tag-inspect { color: #0ff; border-color: #0ff; }

/* HISTORY STRIP */
.h4-history-strip {
    height: 100px;
    background: #111;
    border-top: 2px solid #555;
    display: flex;
    flex-direction: row;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 5px;
    gap: 5px;
    box-sizing: border-box;
    transition: height 0.3s;
}
.h4-history-strip.hidden { height: 0; padding: 0; border: none; }

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
.h4-history-thumb:hover { opacity: 1.0; border-color: #fff; }
.h4-history-thumb.active { border-color: #0f0; opacity: 1.0; box-shadow: 0 0 10px #0f0; }

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

/* CONTROL PANEL */
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
.h4-toggle-switch.on.inspect-on { background: #0ff; } /* Cyan for Inspect */

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
.h4-toggle-switch.on.inspect-on .h4-toggle-knob { left: 16px; box-shadow: 0 0 5px #0ff; }

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

/* SLIDER (ZOOM) */
.h4-slider-wrap {
    display: flex;
    align-items: center;
    gap: 5px;
    color: #0ff;
    font-size: 10px;
    width: 150px;
}
.h4-slider-wrap input { flex: 1; }
.h4-slider-wrap.hidden { display: none; }

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
// Helper: Discombobulator Glitch Logic
// ------------------------------------------------------------------------------
function glitchText(text, mode = "1337") {
    if (!text) return "";
    const zalgo = ["̷", "̵", "̶", "̷", "̸", "̡", "̢", "̧", "̨", "̛", "̛", "̛"];
    switch (mode) {
        case "1337":
            return text.toUpperCase()
                .replace(/A/g, "4").replace(/E/g, "3").replace(/G/g, "6")
                .replace(/I/g, "1").replace(/O/g, "0").replace(/S/g, "5")
                .replace(/T/g, "7").replace(/B/g, "|3").replace(/R/g, "|2");
        case "void":
            return text.split('').map(char => char + zalgo[Math.floor(Math.random() * zalgo.length)] + zalgo[Math.floor(Math.random() * zalgo.length)]).join('');
        case "binary":
            return text.split('').map(c => Math.random() > 0.5 ? "1" : "0").join('').slice(0, text.length * 2);
        default: return text;
    }
}


// ------------------------------------------------------------------------------
// UI Class
// ------------------------------------------------------------------------------
class ComparinatorUI {
    constructor(node) {
        this.node = node;
        this.node_id = String(node.id);
        this.inspectMode = false;
        this.zoomLevel = 2.0; // 2x default

        // Cache for images
        this.currentImageUrl = "";
        this.historyImageUrl = "";

        // --- DOM Construction ---
        this.container = document.createElement("div");
        this.container.className = "h4-comparinator-container";

        // Main Stage
        this.stage = document.createElement("div");
        this.stage.className = "h4-main-stage full-mode"; // Start full mode (Left only)

        // LEFT PANE (Current/Live)
        this.paneLeft = this.createLeftPane();
        this.stage.appendChild(this.paneLeft.el);

        // RIGHT PANE (History OR Zoom)
        this.paneRight = this.createRightPane();
        this.stage.appendChild(this.paneRight.el);

        // History Strip
        this.historyStrip = document.createElement("div");
        this.historyStrip.className = "h4-history-strip";

        // Control Panel
        this.controlPanel = document.createElement("div");
        this.controlPanel.className = "h4-control-panel";

        this.buildControls();

        // Metadata Drawer
        this.drawer = document.createElement("div");
        this.drawer.className = "h4-meta-drawer";
        this.metaInput = document.createElement("textarea");
        this.metaInput.className = "h4-meta-input";
        this.metaInput.placeholder = "Enter custom metadata here...";
        this.metaInput.addEventListener("input", (e) => this.syncMetadata(e.target.value));
        this.drawer.appendChild(this.metaInput);

        this.container.appendChild(this.stage);
        this.container.appendChild(this.historyStrip);
        this.container.appendChild(this.controlPanel);
        this.container.appendChild(this.drawer);

        // --- Event Listener ---
        this.onUpdate = (e) => {
            if (String(e.detail.node_id) === String(this.node.id)) {
                this.updateData(e.detail);
            }
        };
        api.addEventListener("h4.comparinator.update", this.onUpdate);
    }

    // --------------------------------------------------------------------------
    // Pane Creation
    // --------------------------------------------------------------------------

    createLeftPane() {
        const el = document.createElement("div");
        el.className = "h4-viewport pane-left";

        const img = document.createElement("img");
        img.className = "h4-img-layer";
        img.draggable = false;

        const tag = document.createElement("div");
        tag.className = "h4-viewport-tag tag-current";
        tag.textContent = "LIVE FEED";

        // Reticle for Inspect Mode
        const reticle = document.createElement("div");
        reticle.className = "h4-reticle";

        el.appendChild(img);
        el.appendChild(tag);
        el.appendChild(reticle);

        // Mouse Tracker for Zoom
        el.addEventListener("mousemove", (e) => this.handleMouseMove(e, el, reticle));
        el.addEventListener("mouseenter", () => {
            if (this.inspectMode) reticle.style.display = "block";
        });
        el.addEventListener("mouseleave", () => {
            reticle.style.display = "none";
        });

        return { el, img, reticle, tag };
    }

    createRightPane() {
        const el = document.createElement("div");
        el.className = "h4-viewport pane-right";

        // Container for History Image
        const imgHistory = document.createElement("img");
        imgHistory.className = "h4-img-layer";
        imgHistory.style.display = "none"; // Hidden by default

        // Container for Zoom Canvas (Background Image approach)
        const zoomCanvas = document.createElement("div");
        zoomCanvas.className = "h4-zoom-canvas";
        zoomCanvas.style.display = "none";

        const tag = document.createElement("div");
        tag.className = "h4-viewport-tag tag-history";
        tag.textContent = "HISTORY";

        el.appendChild(imgHistory);
        el.appendChild(zoomCanvas);
        el.appendChild(tag);

        return { el, imgHistory, zoomCanvas, tag };
    }

    buildControls() {
        // Save Toggle
        const saveToggle = this.createToggle("Save Output", (isOn) => this.toggleSaveMode(isOn));

        // Inspect Toggle
        const inspectToggle = this.createToggle("INSPECT DETAILS", (isOn) => this.toggleInspectMode(isOn), "inspect-on");

        // Zoom Slider (Hidden initially)
        this.zoomControl = document.createElement("div");
        this.zoomControl.className = "h4-slider-wrap hidden";
        this.zoomControl.innerHTML = `<span>ZM: 200%</span><input type="range" min="100" max="300" value="200">`;
        const range = this.zoomControl.querySelector("input");
        const label = this.zoomControl.querySelector("span");

        range.oninput = (e) => {
            this.zoomLevel = e.target.value / 100;
            label.textContent = `ZM: ${e.target.value}%`;
            // Trigger update of zoom view immediately if mouse isn't moving
            // We need coordinates... let's just wait for move.
            // Or force a re-render if we stored last coords.
        };

        // Metadata Button
        this.metaBtn = document.createElement("button");
        this.metaBtn.className = "h4-btn";
        this.metaBtn.textContent = "METADATA";
        this.metaBtn.onclick = () => this.toggleDrawer();

        this.controlPanel.appendChild(saveToggle);
        this.controlPanel.appendChild(inspectToggle);
        this.controlPanel.appendChild(this.zoomControl); // Insert Slider
        this.controlPanel.appendChild(this.metaBtn);
    }

    // --------------------------------------------------------------------------
    // Core Logic
    // --------------------------------------------------------------------------

    handleMouseMove(e, container, reticle) {
        if (!this.inspectMode) return;
        if (!this.currentImageUrl) return;

        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Calculate percentage
        const xPerc = (x / rect.width) * 100;
        const yPerc = (y / rect.height) * 100;

        // Update Reticle
        // Reticle size depends on Zoom Level.
        // If View is 100% width, and Zoom is 200% (2x), then Reticle covers 50% (1/2) of view?
        // Actually, Right Pane shows a crop.
        // Left Pane is Source. Right Pane is 1x Viewport size. 
        // If Zoom is 2x, right pane shows 1/2 the area of Left Pane.

        // Let's simplify: Reticle shows the area being projected.
        const rW = rect.width / this.zoomLevel;
        const rH = rect.height / this.zoomLevel;

        reticle.style.width = `${rW}px`;
        reticle.style.height = `${rH}px`;

        // Center reticle on mouse, clamped
        const rLeft = Math.max(0, Math.min(rect.width - rW, x - rW / 2));
        const rTop = Math.max(0, Math.min(rect.height - rH, y - rH / 2));

        reticle.style.left = `${rLeft}px`;
        reticle.style.top = `${rTop}px`;

        // Update Right Pane Zoom
        // We use background-position percentages
        // But CSS background-position uses (0% -> Left edge, 100% -> Right edge)
        // Center point calculation:
        const bpX = (rLeft / (rect.width - rW)) * 100;
        const bpY = (rTop / (rect.height - rH)) * 100;

        // Sanity check for NaNs if Div is 0
        const finalX = isNaN(bpX) ? 0 : bpX;
        const finalY = isNaN(bpY) ? 0 : bpY;

        this.paneRight.zoomCanvas.style.backgroundPosition = `${finalX}% ${finalY}%`;
        this.paneRight.zoomCanvas.style.backgroundSize = `${this.zoomLevel * 100}%`;
    }

    toggleInspectMode(isOn) {
        this.inspectMode = isOn;

        // 1. Title Glitch
        this.triggerTitleGlitch(isOn);

        // 2. UI Updates
        this.container.classList.toggle("mode-inspect", isOn);

        // Toggle Zoom Slider
        this.zoomControl.classList.toggle("hidden", !isOn);

        // Toggle History Strip (Hide in Inspect mode to save space/focus?)
        // User didn't specify, but "Focus" implies removing clutter.
        this.historyStrip.classList.toggle("hidden", isOn);

        // 3. Pane Logic
        if (isOn) {
            // INSPECT MODE
            this.stage.classList.remove("full-mode"); // Split View
            this.paneRight.tag.textContent = "ZOOM VIEW 200%";
            this.paneRight.tag.className = "h4-viewport-tag tag-inspect";

            // Show Zoom Canvas, Hide History Img
            this.paneRight.zoomCanvas.style.display = "block";
            this.paneRight.imgHistory.style.display = "none";

            // Set Zoom Source
            this.paneRight.zoomCanvas.style.backgroundImage = `url("${this.currentImageUrl}")`;

        } else {
            // COMPARE MODE (Default)
            // Restore History View
            this.paneRight.tag.textContent = "HISTORY";
            this.paneRight.tag.className = "h4-viewport-tag tag-history";

            // Show History Img, Hide Zoom
            this.paneRight.zoomCanvas.style.display = "none";
            this.paneRight.imgHistory.style.display = "block";

            // Hide reticle
            this.paneLeft.reticle.style.display = "none";

            // If we have a selected history active, stay split. If not, go full.
            const hasActiveHistory = this.historyStrip.querySelector(".active");
            if (!hasActiveHistory) {
                this.stage.classList.add("full-mode");
            }
        }
    }

    triggerTitleGlitch(isInspect) {
        const originalTitle = "H4 COMPARINATOR";
        const newTitle = "INSPECTINATOR";
        const target = isInspect ? newTitle : originalTitle;

        let i = 0;
        const duration = 20; // steps

        const interval = setInterval(() => {
            i++;
            // Random glitch text
            const mode = Math.random() > 0.5 ? "1337" : "void";
            const gText = glitchText("SYSTEM DETECT", mode).substring(0, 15);
            this.node.title = gText;

            if (i >= duration) {
                clearInterval(interval);
                this.node.title = target;
            }
            this.node.setDirtyCanvas(true);
        }, 50);
    }

    updateData(data) {
        // Update Current Image (Left Pane)
        if (data.current) {
            const t = data.current.timestamp || new Date().getTime();
            this.currentImageUrl = `/view?filename=${data.current.filename_b}&type=temp&t=${t}`; // B is result
            this.paneLeft.img.src = this.currentImageUrl;

            // Update Zoom Canvas if in Inspect Mode
            if (this.inspectMode) {
                this.paneRight.zoomCanvas.style.backgroundImage = `url("${this.currentImageUrl}")`;
            }
        }

        // Update History Strip
        if (data.history) {
            this.renderStrip(data.history);
        }
    }

    renderStrip(historyList) {
        this.historyStrip.innerHTML = "";

        historyList.forEach((item, index) => {
            const thumb = document.createElement("div");
            thumb.className = "h4-history-thumb";
            const t = item.timestamp;
            const url = `/view?filename=${item.filename_b}&type=temp&t=${t}`;
            thumb.style.backgroundImage = `url("${url}")`;

            const num = index + 1;

            thumb.onclick = () => {
                if (this.inspectMode) return; // Disable history select in Inspect Mode

                const isSelected = thumb.classList.contains("active");
                Array.from(this.historyStrip.children).forEach(c => c.classList.remove("active"));

                if (isSelected) {
                    // Turn OFF Split
                    this.stage.classList.add("full-mode");
                } else {
                    // Turn ON Split (History)
                    thumb.classList.add("active");
                    this.stage.classList.remove("full-mode");
                    this.historyImageUrl = url;
                    this.paneRight.imgHistory.src = url;
                }
            };

            thumb.ondblclick = (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.openLightbox(item);
            };

            const stamp = document.createElement("div");
            stamp.className = "h4-history-timestamp";
            stamp.textContent = `#${num}`;
            thumb.appendChild(stamp);

            this.historyStrip.appendChild(thumb);
        });
    }

    setImages(viewport, item) {
        // Legacy adapter if needed, mostly handled in updateData now
    }

    // --- Standard Helper Methods (Lightbox, Toggles) ---

    createToggle(label, callback, extraClass = "") {
        const wrap = document.createElement("div");
        wrap.className = "h4-control-item";
        const txt = document.createElement("span");
        txt.textContent = label;
        const sw = document.createElement("div");
        sw.className = `h4-toggle-switch ${extraClass}`;
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
        return wrap;
    }

    openLightbox(item) {
        const overlay = document.createElement("div");
        overlay.className = "h4-lightbox-overlay";
        const closeBtn = document.createElement("div");
        closeBtn.className = "h4-lightbox-close";
        closeBtn.innerHTML = "&times;";
        closeBtn.onclick = () => document.body.removeChild(overlay);

        const img = document.createElement("img");
        img.className = "h4-lightbox-img";
        img.src = `/view?filename=${item.filename_b}&type=temp&t=${item.timestamp}`;

        const caption = document.createElement("div");
        caption.className = "h4-lightbox-caption";
        caption.innerText = `Run ID: ${item.id}`;

        overlay.appendChild(closeBtn);
        overlay.appendChild(img);
        overlay.appendChild(caption);
        overlay.onclick = (e) => { if (e.target === overlay) document.body.removeChild(overlay); };
        document.body.appendChild(overlay);
    }

    toggleSaveMode(isOn) {
        const w = this.node.widgets.find(w => w.name === "save_mode");
        if (w) { w.value = isOn; this.node.setDirtyCanvas(true); }
        if (isOn) { this.drawer.classList.add("open"); this.metaBtn.classList.add("active"); }
        else { this.drawer.classList.remove("open"); this.metaBtn.classList.remove("active"); }
    }

    toggleDrawer() {
        this.drawer.classList.toggle("open");
        this.metaBtn.classList.toggle("active");
    }

    syncMetadata(text) {
        const w = this.node.widgets.find(w => w.name === "metadata_text");
        if (w) { w.value = text; }
    }
}


app.registerExtension({
    name: "h4.Comparinator",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "H4_Comparinator") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                if (onNodeCreated) onNodeCreated.apply(this, arguments);
                const ui = new ComparinatorUI(this);
                this.comparinatorUI = ui;
                if (this.addDOMWidget) {
                    this.addDOMWidget("h4_comparinator_ui", "custom", ui.container, { serialize: false, hideOnZoom: false });
                }
                this.setSize([640, 580]);
                const hideWidget = (wName) => {
                    const w = this.widgets.find(w => w.name === wName);
                    if (w) { w.type = "hidden"; w.computeSize = () => [0, -4]; w.visible = false; }
                };
                setTimeout(() => {
                    hideWidget("save_mode");
                    hideWidget("metadata_text");
                    this.onResize && this.onResize(this.size);
                    app.graph.setDirtyCanvas(true, true);
                }, 100);
            };
        }
    }
});
