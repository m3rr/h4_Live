import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

// ------------------------------------------------------------------------------
// H4 Comparinator -> INSPECTINATOR
// ------------------------------------------------------------------------------

const STYLE = `
.h4-comparinator-container {
    background: transparent; /* Transparent to show node color */
    display: flex;
    flex-direction: column;
    border: 2px solid #333;
    font-family: monospace;
    color: #0f0;
    overflow: hidden;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    transition: border-color 0.3s;
    pointer-events: auto; /* [FIX] Enable mouse interaction for Blink check */
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
    min-height: 0; /* [FIX] Flexbox overflow fix */
}

/* VIEWPORT (Left/Right) */
.h4-viewport {
    position: relative;
    height: 100%;
    overflow: hidden;
    background: transparent; /* Show Node Color */
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

/* CURSOR LOGIC for Inspect Mode */
/* CURSOR LOGIC for Inspect Mode */
.h4-comparinator-container.mode-inspect .pane-left {
    cursor: crosshair; /* [FIX] Keep system cursor visible inside target */
}
/* Ensure controls inside pane-left (if any) restore cursor */
.h4-comparinator-container.mode-inspect .pane-left .h4-viewport-tag {
    cursor: default;
}

/* IMAGES */
.h4-img-layer {
    width: 100%;
    height: 100%;
    object-fit: contain; /* [FIX] Dynamic Fit: Ensure image scales without crop */
    user-select: none;
    pointer-events: none;
    display: block;
    position: absolute; /* Fix for Stacking */
    top: 0;
    left: 0;
    background: transparent;
}

/* CANVAS FOR ZOOM (Right Pane) */
.h4-zoom-canvas {
    width: 100%;
    height: 100%;
    background-color: transparent; /* Show Node Color */
    background-repeat: no-repeat;
    /* Background image set via JS */
    cursor: crosshair;
    position: absolute;
    top: 0;
    left: 0;
    z-index: 20; /* Ensure on top of history if enabled */
}

/* RETICLE (On Left Pane) */
/* RETICLE (Target Cursor) */
.h4-reticle {
    position: absolute;
    width: 75px;
    height: 75px;
    border: 2px solid #0ff;
    border-radius: 50%; /* Circle */
    box-shadow: 0 0 5px #0ff, inset 0 0 5px #0ff;
    pointer-events: none;
    display: none;
    z-index: 50;
    background: transparent;
    /* Crosshair Center Dot */
    background-image: radial-gradient(circle, #0ff 2px, transparent 2.5px);
    background-position: center;
    background-repeat: no-repeat;
    /* Optional: Cross lines? */
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
    background: rgba(0,0,0,0.5); /* Semi Transparent */
    pointer-events: none;
    border: 1px solid #555;
}
.tag-current { color: #f00; border-color: #f00; }
.tag-history { color: #0f0; border-color: #0f0; }
.tag-inspect { color: #0ff; border-color: #0ff; }

/* HISTORY STRIP */
.h4-history-strip {
    height: 100px;
    background: rgba(17,17,17, 0.8);
    border-top: 2px solid #555;
    display: flex;
    flex-direction: row;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 5px;
    gap: 5px;
    box-sizing: border-box;
    transition: height 0.3s;
    /* Hide scrollbar but allow scroll */
    scrollbar-width: thin;
    scrollbar-color: #555 #222;
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
    background-color: #000;
}
.h4-history-thumb:hover { opacity: 1.0; border-color: #fff; }
.h4-history-thumb.active { border-color: #0f0; opacity: 1.0; box-shadow: 0 0 10px #0f0; }

.h4-history-thumb.locked-ref {
    border: 2px solid #fd0 !important; /* Gold */
    box-shadow: 0 0 10px #fd0;
    opacity: 1.0;
}
.h4-history-thumb.locked-ref::after {
    content: "🔒";
    position: absolute;
    top: 2px;
    right: 2px;
    font-size: 12px;
    text-shadow: 0 0 3px #000;
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
    display: flex;
    flex-direction: column;
}
.h4-meta-drawer.open { height: 350px; } /* Increased height for settings */

.h4-drawer-content {
    display: flex;
    flex-direction: row;
    height: 100%;
    overflow: hidden;
}
.h4-drawer-col {
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    box-sizing: border-box;
    overflow-y: auto; /* Scroll if needed */
}
.h4-drawer-col.meta { width: 50%; border-right: 1px solid #333; }
.h4-drawer-col.settings { width: 50%; }

.h4-meta-input {
    width: 100%;
    height: 100%;
    background: #000;
    color: #0f0;
    font-family: monospace;
    border: 1px solid #333;
    padding: 5px;
    resize: none;
    font-size: 11px;
    box-sizing: border-box;
}
.h4-meta-input:focus { outline: none; border-color: #0f0; }

.h4-drawer-row {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 11px;
    color: #ccc;
}
.h4-drawer-input {
    background: #222;
    border: 1px solid #444;
    color: #fff;
    padding: 2px 5px;
    font-family: monospace;
    width: 100px;
}

.h4-action-btn {
    margin-top: auto;
    background: #004400;
    color: #0f0;
    border: 1px solid #0f0;
    padding: 8px;
    text-align: center;
    cursor: pointer;
    font-weight: bold;
    text-transform: uppercase;
    transition: background 0.2s;
}
.h4-action-btn:hover { background: #006600; color: #fff; }
.h4-action-btn:active { background: #0f0; color: #000; }

/* LIGHTBOX OVERLAY */
/* LIGHTBOX OVERLAY */
.h4-slider-handle {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px; /* Thin */
    background: #f00; /* Red LED */
    box-shadow: 0 0 5px #f00, 0 0 10px #f00; /* Glow */
    cursor: col-resize;
    z-index: 100; /* [FIX] Ensure above everything */
    left: 50%;
    transform: translateX(-50%); /* Center strictly on the line */
    pointer-events: none; /* Let mouse pass through to container listener? No, we drag via container */
}

/* Knob in the middle for gripping */
.h4-slider-handle::after {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 8px;
    height: 30px;
    background: #f00;
    border: 1px solid #000;
    box-shadow: 0 0 10px #f00;
    left: 100%;
}

/* TOGGLE SWITCH STYLE (For Top Bar) */
.h4-switch-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    user-select: none;
    font-size: 11px;
    font-weight: bold;
    color: #ccc;
    text-transform: uppercase;
}
.h4-switch {
    width: 36px;
    height: 18px;
    background: #333;
    border-radius: 20px;
    position: relative;
    transition: background 0.3s;
    border: 1px solid #555;
}
.h4-switch::after {
    content: "";
    position: absolute;
    top: 2px; left: 2px;
    width: 12px; height: 12px;
    background: #fff;
    border-radius: 50%;
    transition: transform 0.3s;
}
.h4-switch.active {
    background: #0f0;
    border-color: #0f0;
}
.h4-switch.active::after {
    transform: translateX(18px);
    background: #000;
}
.h4-switch-wrap:hover .h4-switch {
    border-color: #fff;
}

/* CYBERPUNK ACTION BUTTON (Updated) */
.h4-action-btn {
    margin-top: auto;
    background: linear-gradient(180deg, #003300, #005500);
    color: #0f0;
    border: 1px solid #0f0;
    padding: 12px;
    text-align: center;
    cursor: pointer;
    font-weight: bold;
    text-transform: uppercase;
    transition: all 0.2s;
    letter-spacing: 3px;
    text-shadow: 0 0 5px #0f0;
    box-shadow: 0 0 10px rgba(0, 255, 0, 0.2), inset 0 0 20px rgba(0,0,0,0.5);
    font-family: monospace;
    position: relative;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
}
.h4-action-btn:hover {
    background: #0f0;
    color: #000;
    box-shadow: 0 0 20px #0f0;
    text-shadow: none;
}
.h4-action-btn::before {
    content: "";
    position: absolute;
    top: 0; left: -100%;
    width: 100%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
    transition: left 0.5s;
}
.h4-action-btn:hover::before {
    left: 100%;
}

.h4-lightbox-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0,0,0,0.95);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    backdrop-filter: blur(5px);
}
.h4-lightbox-img {
    max-width: 90%;
    max-height: 90%;
    object-fit: contain;
    transition: transform 0.1s ease-out; /* Smooth drag */
    cursor: zoom-in;
    transform-origin: center center;
}
.h4-lightbox-close {
    position: absolute;
    top: 30px;
    right: 40px;
    font-size: 50px;
    color: #fff;
    cursor: pointer;
    z-index: 10001;
    font-weight: bold;
    text-shadow: 0 0 10px #000;
    line-height: 1;
}
.h4-lightbox-close:hover { color: #f00; text-shadow: 0 0 20px #f00; }

.h4-lightbox-info {
    position: absolute;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    color: #888;
    font-size: 14px;
    pointer-events: none;
    font-family: monospace;
}
/* PARAMETER DRAWER */
.h4-param-drawer {
    position: absolute;
    top: 0;
    right: 0;
    width: 0;
    height: 100%;
    background: #1a1a1a;
    border-left: 1px solid #444;
    overflow-y: auto;
    overflow-x: hidden;
    transition: width 0.3s ease;
    z-index: 50;
    font-family: monospace;
    font-size: 11px;
    color: #ccc;
    box-shadow: -5px 0 15px rgba(0,0,0,0.5);
}
.h4-param-drawer.open { width: 300px; border-left: 1px solid #0f0; }

.h4-param-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
}
.h4-param-table th {
    text-align: left;
    color: #0f0;
    border-bottom: 1px solid #333;
    padding: 5px;
    font-size: 10px;
    text-transform: uppercase;
}
.h4-param-table td {
    padding: 4px 5px;
    border-bottom: 1px solid #222;
    word-break: break-all;
    vertical-align: top;
}
.h4-param-key { color: #888; width: 80px; font-weight: bold; }
.h4-param-val { color: #eee; }

.h4-param-section {
    padding: 10px;
    border-bottom: 1px solid #333;
}
.h4-param-title {
    color: #0ff;
    font-weight: bold;
    margin-bottom: 5px;
    display: block;
    text-transform: uppercase;
    font-size: 10px;
    letter-spacing: 1px;
}
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
        // Don't cache ID yet, it might be -1
        this.inspectMode = false;
        this.zoomLevel = 2.0;

        console.log(`[H4 Comparinator] Init for Node. Current ID: ${this.node.id}`);

        // Cache for images
        this.currentImageUrl = "";
        this.historyImageUrl = "";
        this.liveNodeData = null;

        // State Flags
        this.zoomLocked = false;
        this.metadataCache = {};
        this.blinkMode = false;
        this.lockedReferenceItem = null;
        this.currentHistoryList = [];

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

        // Parameter Drawer (Right Side)
        this.buildParamDrawer();

        // Settings Drawer (Metadata + Save Options)
        this.buildDrawer();

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

        // [NEW] History Strip Horizontal Scroll
        this.historyStrip.addEventListener("wheel", (e) => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                this.historyStrip.scrollLeft += e.deltaY;
            }
        });

        // [NEW] Keyboard Shortcuts
        // Store bind so we can remove listener if needed (though node usually persists)
        this.boundHandleKey = this.handleKey.bind(this);
        window.addEventListener("keydown", this.boundHandleKey);
        window.addEventListener("keyup", this.boundHandleKey);

        // Fetch Initial History
        setTimeout(() => {
            const historyUrl = `/h4/history?node_id=${this.node.id}`;
            console.log(`[H4 Comparinator] Fetching history from: ${historyUrl}`);

            api.fetchApi(historyUrl)
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    return response.json();
                })
                .then(data => {
                    console.log("[H4 Comparinator] History data received:", data);
                    if (data.history && data.history.length > 0) {
                        this.renderStrip(data.history);
                        // [FIX] Initialize Live Node Data from latest history item
                        // This ensures that even after reload, "Live" (A) compares against the last known generation.
                        this.liveNodeData = data.history[0];
                        // Convert first history item to "current" if no current exists?
                        // Or just wait for update. 
                        // If we have history, let's at least populate the strip.
                    } else {
                        console.warn("[H4 Comparinator] No history found for this node.");
                    }
                })
                .catch(err => console.error("[H4 Comparinator] Error fetching history:", err));
        }, 500);
    }

    // --------------------------------------------------------------------------
    // Pane Creation
    // --------------------------------------------------------------------------

    createLeftPane() {
        const el = document.createElement("div");
        el.className = "h4-viewport pane-left";

        // IMAGE A (Live / Current) - Bottom Layer
        const imgA = document.createElement("img");
        imgA.className = "h4-img-layer h4-img-a";
        imgA.draggable = false;
        imgA.style.zIndex = "1";

        // IMAGE B (History / Compare) - Top Layer (Clipped)
        const imgB = document.createElement("img");
        imgB.className = "h4-img-layer h4-img-b";
        imgB.draggable = false;
        imgB.style.zIndex = "2";
        // Start fully visible or hidden? 
        // Standard compare: Slider at 50%.
        imgB.style.clipPath = "inset(0 0 0 50%)"; // Clip left 50%

        // Slider Handle
        const handle = document.createElement("div");
        handle.className = "h4-slider-handle";
        handle.style.left = "50%";

        const tag = document.createElement("div");
        tag.className = "h4-viewport-tag tag-current";
        tag.textContent = "COMPARE: LIVE VS HISTORY";

        // Reticle for Inspect Mode
        const reticle = document.createElement("div");
        reticle.className = "h4-reticle";
        reticle.style.pointerEvents = "none"; // [FIX] Prevent event blocking

        el.appendChild(imgA);
        el.appendChild(imgB); // B on top
        el.appendChild(handle);
        el.appendChild(tag);
        el.appendChild(reticle);

        // Interaction Logic
        el.addEventListener("mousemove", (e) => {
            if (this.inspectMode) {
                // INSPECT MODE: Move Reticle
                requestAnimationFrame(() => this.handleMouseMoveInspect(e, el, reticle));
            } else {
                // COMPARE MODE: Move Slider
                this.handleMouseMoveCompare(e, el, imgB, handle);
            }
        });

        // [NEW] Zoom Lock Trigger (Mouse3 / Middle Click)
        el.addEventListener("mousedown", (e) => {
            if (this.inspectMode && e.button === 1) { // Middle Click
                e.preventDefault();
                this.toggleZoomLock();
            }
        });

        // Toggle Reticle / Handle visibility based on mode
        el.addEventListener("mouseenter", (e) => {
            if (this.inspectMode) {
                reticle.style.display = "block";
                // [FIX] Immediate Snap: Teleport reticle to mouse on entry
                this.handleMouseMoveInspect(e, el, reticle);
            }
        });
        el.addEventListener("mouseleave", () => {
            reticle.style.display = "none";
        });

        return { el, imgA, imgB, handle, reticle, tag };
    }

    createRightPane() {
        const el = document.createElement("div");
        el.className = "h4-viewport pane-right";

        // Container for History Image Reference
        const imgHistoryDisplay = document.createElement("img");
        imgHistoryDisplay.className = "h4-img-layer";
        imgHistoryDisplay.style.display = "block";

        // Container for Zoom Canvas
        const zoomCanvas = document.createElement("div");
        zoomCanvas.className = "h4-zoom-canvas";
        zoomCanvas.style.display = "none";

        const tag = document.createElement("div");
        tag.className = "h4-viewport-tag tag-history";
        tag.textContent = "HISTORY REFERENCE";

        el.appendChild(imgHistoryDisplay);
        el.appendChild(zoomCanvas);
        el.appendChild(tag);

        return { el, imgHistoryDisplay, zoomCanvas, tag };
    }

    handleKey(e) {
        // Ignore if user is typing in metadata drawer
        if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;

        // Blink Mode (Spacebar)
        if (e.code === "Space") {
            // Only active if mouse is hovering container
            if (!this.container.matches(':hover')) return;

            e.preventDefault();
            if (e.type === "keydown" && !this.blinkMode) {
                this.toggleBlinkMode(true);
            } else if (e.type === "keyup") {
                this.toggleBlinkMode(false);
            }
            return;
        }

        // Shortcuts (Shift + Number)
        if (e.shiftKey && e.type === "keydown") {
            switch (e.key) {
                case "1": this.setSliderMode("A"); break;
                case "2": this.setSliderMode("B"); break;
                case "3": this.setSliderMode("Split"); break;
            }
        }
    }

    buildControls() {
        // [FIX] Restore Top Controls as SWITCH TOGGLES
        this.controlPanel.innerHTML = "";

        // Helper to create switch
        const createSwitch = (label, onChange, isActive = false) => {
            const wrap = document.createElement("div");
            wrap.className = "h4-switch-wrap";

            const switchEl = document.createElement("div");
            switchEl.className = "h4-switch" + (isActive ? " active" : "");

            const text = document.createElement("span");
            text.textContent = label;

            wrap.onclick = () => {
                const newState = !switchEl.classList.contains("active");
                switchEl.classList.toggle("active", newState);
                onChange(newState);
            };

            wrap.appendChild(switchEl);
            wrap.appendChild(text);
            return { wrap, switchEl };
        };

        // 1. SAVE OUTPUT / SETTINGS
        const toggleSettings = createSwitch("SAVE OUTPUT / SETTINGS", (active) => {
            this.toggleDrawer(active);
        });
        this.controlPanel.appendChild(toggleSettings.wrap);
        this.toggleSettingsSwitch = toggleSettings.switchEl;

        // [NEW] PARAMETERS TOGGLE
        const toggleParams = createSwitch("PARAMETERS", (active) => {
            this.toggleParamDrawer(active);
        });
        this.controlPanel.appendChild(toggleParams.wrap);

        // 2. INSPECTINATOR MODE
        const toggleInspect = createSwitch("INSPECTINATOR", (active) => {
            this.toggleInspectMode(active);
        });
        this.controlPanel.appendChild(toggleInspect.wrap);
        this.toggleInspectSwitch = toggleInspect.switchEl;

        // Zoom Slider (Only visible in Inspect)
        this.zoomControl = document.createElement("div");
        this.zoomControl.className = "h4-slider-wrap hidden";
        this.zoomControl.style.marginLeft = "auto";
        this.zoomControl.innerHTML = `<span>ZM: 200%</span><input type="range" min="100" max="1000" value="200">`;
        const range = this.zoomControl.querySelector("input");
        const label = this.zoomControl.querySelector("span");

        range.oninput = (e) => {
            this.zoomLevel = e.target.value / 100;
            label.textContent = `ZM: ${e.target.value}%`;
            if (this.lastMouseX !== undefined) this.updateReticle(this.lastMouseX, this.lastMouseY);
        };
        this.controlPanel.appendChild(this.zoomControl);

        // Global Wheel Listener (Attached to Container)
        this.container.addEventListener("wheel", (e) => {
            if (!this.inspectMode) return;
            e.preventDefault();
            e.stopPropagation();
            const delta = Math.sign(e.deltaY) * -0.5;
            let newZoom = this.zoomLevel + delta;
            newZoom = Math.max(1.0, Math.min(5.0, newZoom));
            this.zoomLevel = newZoom;
            this.paneRight.tag.textContent = `ZOOM VIEW ${Math.round(this.zoomLevel * 100)}%`;
            if (range) range.value = Math.round(newZoom * 100);
            if (label) label.textContent = `ZM: ${Math.round(newZoom * 100)}%`;
            if (this.lastMouseX !== undefined) this.updateReticle(this.lastMouseX, this.lastMouseY);
        }, { passive: false });
    }




    buildDrawer() {
        this.drawer = document.createElement("div");
        this.drawer.className = "h4-meta-drawer";

        const content = document.createElement("div");
        content.className = "h4-drawer-content";

        // Col 1: Metadata
        const colMeta = document.createElement("div");
        colMeta.className = "h4-drawer-col meta";
        this.metaInput = document.createElement("textarea");
        this.metaInput.className = "h4-meta-input";
        this.metaInput.placeholder = "Enter custom metadata here... (Attached to saved files)";
        this.metaInput.addEventListener("input", (e) => this.syncMetadata(e.target.value));
        colMeta.appendChild(this.metaInput);

        // Col 2: Settings
        const colSettings = document.createElement("div");
        colSettings.className = "h4-drawer-col settings";

        const createCheck = (label, key, def) => {
            const row = document.createElement("div");
            row.className = "h4-drawer-row";
            const cb = document.createElement("input");
            cb.type = "checkbox";
            cb.checked = def;
            cb.id = `h4_chk_${key}`;
            cb.addEventListener("change", () => this.updateSaveSettings());
            const lb = document.createElement("label");
            lb.textContent = label;
            lb.htmlFor = `h4_chk_${key}`;
            row.appendChild(cb);
            row.appendChild(lb);
            colSettings.appendChild(row);
            return cb;
        };

        const createInput = (label, key, def, placeholder) => {
            const row = document.createElement("div");
            row.className = "h4-drawer-row";
            const lb = document.createElement("label");
            lb.textContent = label;
            const inp = document.createElement("input");
            inp.type = "text";
            inp.className = "h4-drawer-input";
            inp.value = def;
            inp.placeholder = placeholder || "";
            inp.addEventListener("input", () => this.updateSaveSettings());
            row.appendChild(lb);
            row.appendChild(inp);
            colSettings.appendChild(row);
            return inp;
        };

        // Auto-Save
        const wSaveMode = this.node.widgets.find(w => w.name === "save_mode");
        const initAutoSave = wSaveMode ? wSaveMode.value : false;
        this.chkAutoSave = createCheck("Auto-Save on Workflow Run", "auto_save", initAutoSave);
        this.chkAutoSave.addEventListener("change", (e) => this.toggleSaveMode(e.target.checked));

        // Options
        this.chkSaveA = createCheck("Save A (Live)", "save_a", false);
        this.chkSaveB = createCheck("Save B (History)", "save_b", false);
        this.chkSaveComp = createCheck("Save Comparison (Side-by-Side)", "save_comp", false);
        this.chkSaveWF = createCheck("Save with Workflow", "save_wf", false);
        this.chkSaveMeta = createCheck("Save with Metadata", "save_meta", false);
        this.chkSavePrompt = createCheck("Save with Prompt", "save_prompt", false);

        // Toggle All
        const rowAll = document.createElement("div");
        rowAll.className = "h4-drawer-row";
        const btnAll = document.createElement("button");
        btnAll.textContent = "Toggle All Extras";
        btnAll.className = "h4-btn";
        btnAll.style.fontSize = "9px";
        btnAll.onclick = () => {
            const val = !this.chkSaveWF.checked;
            this.chkSaveWF.checked = val;
            this.chkSaveMeta.checked = val;
            this.chkSavePrompt.checked = val;
            this.updateSaveSettings();
        };
        rowAll.appendChild(btnAll);
        colSettings.appendChild(rowAll);

        // Paths
        this.inpPrefix = createInput("Prefix:", "prefix", "h4_");
        this.inpPath = createInput("Subfolder:", "path", "comparisons");

        // Save Button (Centered, No Emoji)
        this.btnSaveNow = document.createElement("div");
        this.btnSaveNow.className = "h4-action-btn";
        this.btnSaveNow.textContent = "SAVE NOW";
        this.btnSaveNow.onclick = () => this.triggerManualSave();
        colSettings.appendChild(this.btnSaveNow);

        content.appendChild(colMeta);
        content.appendChild(colSettings);
        this.drawer.appendChild(content);

        if (this.node.widgets) setTimeout(() => this.updateSaveSettings(), 1000);
    }

    updateSaveSettings() {
        const settings = {
            save_a: this.chkSaveA.checked,
            save_b: this.chkSaveB.checked,
            save_comp: this.chkSaveComp.checked,
            save_wf: this.chkSaveWF.checked,
            save_meta: this.chkSaveMeta.checked,
            save_prompt: this.chkSavePrompt.checked,
            prefix: this.inpPrefix.value,
            path: this.inpPath.value
        };
        const json = JSON.stringify(settings);
        if (this.node.widgets) {
            const w = this.node.widgets.find(w => w.name === "save_settings");
            if (w) w.value = json;
        }
    }

    // --------------------------------------------------------------------------
    // Parameter Panel Logic
    // --------------------------------------------------------------------------

    buildParamDrawer() {
        this.paramDrawer = document.createElement("div");
        this.paramDrawer.className = "h4-param-drawer";
        this.container.appendChild(this.paramDrawer);
    }

    toggleParamDrawer(active) {
        if (active) {
            // Expand Node
            const currentW = this.node.size[0];
            const currentH = this.node.size[1];
            this.node.setSize([currentW + 300, currentH]);

            this.paramDrawer.classList.add("open");

            // Populate Data
            this.updateParams(this.liveNodeData);
        } else {
            // Shrink Node
            const currentW = this.node.size[0];
            const currentH = this.node.size[1];
            // Ensure we don't shrink below min width
            this.node.setSize([Math.max(400, currentW - 300), currentH]);

            this.paramDrawer.classList.remove("open");
        }
    }

    // ----------------------------------------------------------------------
    // GRAPH TRAVERSAL: Helper Methods (Class Level)
    // ----------------------------------------------------------------------

    findUpstreamSamplers(node, found = [], visited = new Set(), depth = 10) {
        if (!node || depth <= 0 || visited.has(node.id)) return found;
        visited.add(node.id);

        // Check if this is a Sampler
        if (node.type === "KSampler" || node.type === "KSamplerAdvanced" || (node.type && node.type.includes("Sampler"))) {
            if (!found.find(n => n.id === node.id)) {
                found.push(node);
            }
        }

        // Walk Inputs
        if (node.inputs) {
            for (const input of node.inputs) {
                const linkId = input.link;
                if (linkId !== null) {
                    const link = app.graph.links[linkId];
                    if (link) {
                        const originNode = app.graph.getNodeById(link.origin_id);
                        if (originNode) {
                            this.findUpstreamSamplers(originNode, found, visited, depth - 1);
                        }
                    }
                }
            }
        }
        return found;
    }

    extractWidgetValue(node, widgetName) {
        if (!node.widgets) return null;
        const w = node.widgets.find(w => w.name === widgetName);
        return w ? w.value : null;
    }

    findPromptText(node, inputName, visited = new Set()) {
        if (!node || !node.inputs) return null;

        const input = node.inputs.find(i => i.name === inputName);
        if (!input || !input.link) return null;

        const link = app.graph.links[input.link];
        if (!link) return null;

        const originNode = app.graph.getNodeById(link.origin_id);
        if (!originNode || visited.has(originNode.id)) return null;
        visited.add(originNode.id);

        // check if this is the text node
        if (originNode.widgets) {
            const textWidget = originNode.widgets.find(w => w.name === "text" || w.name === "string" || w.name === "prompt");
            if (textWidget) {
                return textWidget.value;
            }
            // Fallback for Primitive Node (value is in widgets[0])
            if (originNode.type === "PrimitiveNode" && originNode.widgets[0]) {
                return originNode.widgets[0].value;
            }
        }

        // Handle Reroute / Pass-through
        // Only recurse if it's explicitly a routing node to avoid infinite loops
        if (originNode.type === "Reroute" || originNode.type === "Note") {
            if (originNode.inputs && originNode.inputs.length > 0) {
                return this.findPromptText(originNode, originNode.inputs[0].name, visited);
            }
        }

        return null;
    }

    extractSamplerData(samplerNode) {
        const data = [];
        data.push({ k: "Type", v: samplerNode.type });

        // Common Widgets
        const seed = this.extractWidgetValue(samplerNode, "seed");
        if (seed !== null) data.push({ k: "Seed", v: seed });

        const steps = this.extractWidgetValue(samplerNode, "steps");
        if (steps !== null) data.push({ k: "Steps", v: steps });

        const cfg = this.extractWidgetValue(samplerNode, "cfg");
        if (cfg !== null) data.push({ k: "CFG", v: cfg });

        const sampler = this.extractWidgetValue(samplerNode, "sampler_name");
        if (sampler !== null) data.push({ k: "Sampler", v: sampler });

        const scheduler = this.extractWidgetValue(samplerNode, "scheduler");
        if (scheduler !== null) data.push({ k: "Scheduler", v: scheduler });

        const denoise = this.extractWidgetValue(samplerNode, "denoise");
        if (denoise !== null) data.push({ k: "Denoise", v: denoise });

        // [NEW] Extract Prompts
        const posPrompt = this.findPromptText(samplerNode, "positive");
        if (posPrompt) data.push({ k: "Positive Prompt", v: posPrompt });

        const negPrompt = this.findPromptText(samplerNode, "negative");
        if (negPrompt) data.push({ k: "Negative Prompt", v: negPrompt });

        return data;
    }

    captureGraphMetadata() {
        const result = { A: [], B: [] };

        // Find Inputs
        const inputA = this.node.inputs.find(i => i.name === "image_a");
        const inputB = this.node.inputs.find(i => i.name === "image_b");

        // Scan A
        if (inputA && inputA.link) {
            const linkA = app.graph.links[inputA.link];
            if (linkA) {
                const originA = app.graph.getNodeById(linkA.origin_id);
                const nodesA = this.findUpstreamSamplers(originA);
                result.A = nodesA.map(n => this.extractSamplerData(n));
            }
        }

        // Scan B
        if (inputB && inputB.link) {
            const linkB = app.graph.links[inputB.link];
            if (linkB) {
                const originB = app.graph.getNodeById(linkB.origin_id);
                const nodesB = this.findUpstreamSamplers(originB);
                result.B = nodesB.map(n => this.extractSamplerData(n));
            }
        }
        return result;
    }

    updateParams(data) {
        this.paramDrawer.innerHTML = "";

        if (!data) {
            this.paramDrawer.innerHTML = "<div style='padding:20px; color:#666;'>No Generation Data Found.<br>Connect an image generation flow.</div>";
            return;
        }

        const prompt = data.prompt;
        const info = data.extra_pnginfo;

        // Helper to build table
        const createTable = (title, rows) => {
            const sect = document.createElement("div");
            sect.className = "h4-param-section";

            const head = document.createElement("span");
            head.className = "h4-param-title";
            head.textContent = title;
            sect.appendChild(head);

            const tbl = document.createElement("table");
            tbl.className = "h4-param-table";
            // Ensure table layout fixed for long text wrapping
            tbl.style.tableLayout = "fixed";
            tbl.style.width = "100%";

            rows.forEach(r => {
                const tr = document.createElement("tr");

                if (r.k.includes("Prompt")) {
                    // Full-Width Prompt Display
                    const td = document.createElement("td");
                    td.colSpan = 2;
                    td.className = "h4-param-prompt-cell";
                    td.style.padding = "6px 2px";
                    td.style.borderTop = "1px solid rgba(255,255,255,0.1)";

                    const label = document.createElement("div");
                    label.textContent = r.k;
                    label.style.fontWeight = "bold";
                    label.style.color = r.k.includes("Negative") ? "#ff6b6b" : "#4dabf7";
                    label.style.fontSize = "10px";
                    label.style.marginBottom = "3px";
                    label.style.textTransform = "uppercase";
                    label.style.letterSpacing = "0.5px";

                    const val = document.createElement("div");
                    val.textContent = r.v;
                    val.style.whiteSpace = "pre-wrap";
                    val.style.fontSize = "11px";
                    val.style.color = "#eee";
                    val.style.lineHeight = "1.4";
                    val.style.maxHeight = "150px";
                    val.style.overflowY = "auto";
                    val.style.background = "rgba(0,0,0,0.25)";
                    val.style.padding = "6px";
                    val.style.borderRadius = "4px";
                    val.style.fontFamily = "monospace";
                    val.title = r.v; // Tooltip for full text if needed

                    td.appendChild(label);
                    td.appendChild(val);
                    tr.appendChild(td);
                } else {
                    // Standard Key-Value Row
                    const tdK = document.createElement("td");
                    tdK.className = "h4-param-key";
                    tdK.textContent = r.k;

                    const tdV = document.createElement("td");
                    tdV.className = "h4-param-val";
                    tdV.textContent = r.v;

                    tr.appendChild(tdK);
                    tr.appendChild(tdV);
                }
                tbl.appendChild(tr);
            });
            sect.appendChild(tbl);
            this.paramDrawer.appendChild(sect);
        };

        // 1. Resolve Metadata Sources
        let metaA = null;
        let metaB = null;

        // Priority 1: Data passed directly (Live)
        if (data.metaA) metaA = data.metaA;
        if (data.metaB) metaB = data.metaB;

        // Priority 2: Cache Lookup (History)
        if (!metaA && data.filename_a && this.metadataCache[data.filename_a]) {
            metaA = this.metadataCache[data.filename_a].A;
        }
        if (!metaB && data.filename_b && this.metadataCache[data.filename_b]) {
            metaB = this.metadataCache[data.filename_b].B;
        }

        // Priority 3: Scan Live Graph (Last Resort fallback)
        if (!metaA && !metaB) {
            const captured = this.captureGraphMetadata();
            metaA = captured.A;
            metaB = captured.B;
        }

        // 2. Context Awareness UI
        if (!this.metaViewContext) this.metaViewContext = "B";

        const ctxDiv = document.createElement("div");
        ctxDiv.className = "h4-param-section";
        ctxDiv.style.textAlign = "center";
        ctxDiv.style.marginBottom = "10px";

        const btnA = document.createElement("button");
        btnA.className = `h4-btn ${this.metaViewContext === "A" ? "active" : ""}`;
        btnA.textContent = "IMAGE A (Input)";
        btnA.style.width = "48%";
        btnA.onclick = () => { this.metaViewContext = "A"; this.updateParams(data); };

        const btnB = document.createElement("button");
        btnB.className = `h4-btn ${this.metaViewContext === "B" ? "active" : ""}`;
        btnB.textContent = "IMAGE B (Result)";
        btnB.style.width = "48%";
        btnB.style.marginLeft = "4%";
        btnB.onclick = () => { this.metaViewContext = "B"; this.updateParams(data); };

        ctxDiv.appendChild(btnA);
        ctxDiv.appendChild(btnB);
        this.paramDrawer.appendChild(ctxDiv);

        // 3. Select Active Params
        let activeParams = [];
        let activeLabel = "";

        if (this.metaViewContext === "A") {
            activeParams = metaA || [];
            activeLabel = "IMAGE A CHAIN";
        } else {
            activeParams = metaB || [];
            activeLabel = "IMAGE B CHAIN";
        }

        // 4. Render Tables
        if (activeParams.length > 0) {
            activeParams.forEach((params, i) => {
                const title = activeParams.length > 1 ? `${activeLabel} - SAMPLER ${i + 1}` : activeLabel;
                createTable(title, params);
            });
        } else {
            this.paramDrawer.innerHTML += `<div style='padding:20px; color:#888; text-align:center;'>No Sampler Parameters Found for ${activeLabel}.<br><span style='font-size:10px opacity:0.7'>(Graph traversal returned no KSamplers)</span></div>`;
        }

        // Raw Fallback
        if (activeParams.length === 0 && info && info.workflow) {
            this.paramDrawer.innerHTML += "<div style='padding:10px; font-size:10px; color:#666;'>No KSampler found in direct ancestry. However, raw workflow data is available in the output file.</div>";
        }
    }



    handleMouseMoveCompare(e, container, imgB, handle) {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;

        let percent = (x / rect.width) * 100;
        percent = Math.max(0, Math.min(100, percent));

        handle.style.left = `${percent}%`;
        imgB.style.clipPath = `inset(0 0 0 ${percent}%)`;
    }

    handleMouseMoveInspect(e, container, reticle) {
        // [NEW] Zoom Lock Check
        if (this.zoomLocked) return;

        // Just store position and call updater
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.updateReticle(e.clientX, e.clientY);
    }

    updateReticle(clientX, clientY) {
        if (!this.currentImageUrl || !this.inspectMode) return;

        const container = this.paneLeft.el; // Or this.container? paneLeft.el contains the image
        const reticle = this.paneLeft.reticle;

        // 1. Get Container Dimensions (Screen Space)
        const rect = container.getBoundingClientRect();

        // [FIX] Use Client Dimensions (Content Box) for math to match CSS object-fit
        // boundingClientRect includes border, which shifts calculations.
        const contW = container.clientWidth;
        const contH = container.clientHeight;

        // 2. Calculate "Displayed Image" Rect
        // Wait for load if needed
        let natW = this.paneLeft.imgA.naturalWidth;
        let natH = this.paneLeft.imgA.naturalHeight;

        // If not loaded, default to fill container to keep reticle visible (Cursor Mode)
        if (!natW || natW === 0) {
            natW = contW;
            natH = contH;
        }

        const imgRatio = natW / natH;
        const rectRatio = contW / contH;

        let renderW, renderH, renderTop, renderLeft;

        if (imgRatio > rectRatio) {
            renderW = 1.0;
            renderH = rectRatio / imgRatio;
            renderLeft = 0;
            renderTop = (1.0 - renderH) / 2;
        } else {
            renderH = 1.0;
            renderW = imgRatio / rectRatio;
            renderTop = 0;
            renderLeft = (1.0 - renderW) / 2;
        }

        // Add range variables needed for later (Normalized)
        const rangeX = renderW;
        const rangeY = renderH;

        // 3. Map Mouse Coordinates relative to the CONTAINER (Viewport)
        // [FIX] Use Screen Space Percentage to avoid scale transforms lag
        // normX_vp = 0.0 (Left) to 1.0 (Right)

        const normX_vp = (clientX - rect.left) / rect.width;
        const normY_vp = (clientY - rect.top) / rect.height;

        // --- RETICLE LOGIC (Visual Target) ---
        // User wants a fixed "Target Cursor" centered on the mouse.
        // It does NOT scale with zoom. It just marks the spot.
        const targetSize = 75; // Must match CSS width/height
        const halfSize = targetSize / 2;

        // Apply to DOM (Visual) - [FIX] Use calc() with percentage for perfect scaling
        reticle.style.width = `${targetSize}px`;
        reticle.style.height = `${targetSize}px`;
        reticle.style.left = `calc(${normX_vp * 100}% - ${halfSize}px)`;
        reticle.style.top = `calc(${normY_vp * 100}% - ${halfSize}px)`;
        reticle.style.display = "block";


        // --- ZOOM LOGIC (Logical) ---
        // For the Zoom View, we MUST clamp to the image area.

        // Mouse relative to Image Top-Left (Normalized)
        const imgMouseX = normX_vp - renderLeft;
        const imgMouseY = normY_vp - renderTop;

        // Clamp to Image Bounds (0 to renderW/H)
        const clampedX = Math.max(0, Math.min(renderW, imgMouseX));
        const clampedY = Math.max(0, Math.min(renderH, imgMouseY));

        // Normalize Mouse Position (0.0 to 1.0) relative to image content
        const normX = rangeX > 0 ? clampedX / rangeX : 0.5;
        const normY = rangeY > 0 ? clampedY / rangeY : 0.5;

        // --- EFFECTIVE ZOOM CALCULATION ---
        // We need to know the effective Zoom Factor for Width and Height 
        // to correctly center the background-position.
        // background-size is set to (zoomLevel * 100)%.
        // This is relative to the CONTAINER width.

        const zoomCanvas = this.paneRight.zoomCanvas;
        // If zoomCanvas isn't visible/layouted yet, these might be 0, but usually we are in Inspect Mode.
        const zRect = zoomCanvas.getBoundingClientRect();

        // Effective Zoom Factors (Ratio of Scaled Image Dimension to Container Dimension)
        // Zoom Image Width = Container Width * zoomLevel
        const Zw = this.zoomLevel;

        // Zoom Image Height = Zoom Image Width / Image Aspect Ratio
        // Container Height = zRect.height
        // Zh = ZoomImgH / zRect.height
        //    = (zRect.width * Zw / imgRatio) / zRect.height
        //    = (zRect.width / zRect.height) * (Zw / imgRatio)

        // [FIX] Use clientWidth/Height for zoom canvas too
        const zContW = zoomCanvas.clientWidth;
        const zContH = zoomCanvas.clientHeight;
        const zRectRatio = (zContH > 0) ? (zContW / zContH) : 1.0;
        const Zh = zRectRatio * (Zw / imgRatio);

        // --- CENTERING (TARGET-LOCK) FORMULA ---
        // The pixel under the reticle (P_norm) is centered in the Zoom View.

        const calculateCenterPercent = (P_norm, Z) => {
            if (Z <= 1.0) return 50; // Fits? Just center.

            // Formula derived:
            let P = 100 * (P_norm * Z - 0.5) / (Z - 1);

            // Allow panning to edges (0% to 100%)
            return Math.max(0, Math.min(100, P));
        };

        // Mouse Relative Position in Zoom Container (0..1)
        // We use clientX/Y relative to zoomCanvas bounding box
        // But wait, mouseX/Y are relative to global container.
        // zoomCanvas is the right pane.
        // It's safer to recalculate mouse relative to zoomCanvas just in case of offsets?
        // Actually, in typical split, right pane is adjacent.
        // Let's use reliable zRect logic.

        const percentX = calculateCenterPercent(normX, Zw);
        const percentY = calculateCenterPercent(normY, Zh);

        this.updateInspectView(percentX, percentY);
    }


    updateInspectView(xPercent, yPercent) {
        if (!this.inspectMode) return;
        this.paneRight.zoomCanvas.style.backgroundPosition = `${xPercent}% ${yPercent}%`;
        this.paneRight.zoomCanvas.style.backgroundSize = `${this.zoomLevel * 100}%`;
    }

    // -------------------------------------------------------------------
    // BLINK MODE: Hold Spacebar to swap between Image A and Image B
    // -------------------------------------------------------------------
    toggleBlinkMode(isOn) {
        this.blinkMode = isOn;

        if (!this.paneLeft.imgA || !this.paneLeft.imgB) return;

        if (isOn) {
            // Show ONLY Image A (hide B entirely by removing clip and hiding)
            this.paneLeft.imgB.style.opacity = "0";
            this.paneLeft.handle.style.opacity = "0";
            this.paneLeft.tag.textContent = "BLINK: IMAGE A";
        } else {
            // Restore normal slider view (B visible, clipped)
            this.paneLeft.imgB.style.opacity = "1";
            this.paneLeft.handle.style.opacity = "1";
            this.paneLeft.tag.textContent = "COMPARE: LIVE VS HISTORY";
        }
    }

    // -------------------------------------------------------------------
    // SLIDER MODE: Shift+1 = A only, Shift+2 = B only, Shift+3 = Split
    // -------------------------------------------------------------------
    setSliderMode(mode) {
        if (!this.paneLeft.imgB || !this.paneLeft.handle) return;

        switch (mode) {
            case "A":
                // Show only A: clip B entirely
                this.paneLeft.imgB.style.clipPath = "inset(0 0 0 100%)";
                this.paneLeft.handle.style.left = "100%";
                this.paneLeft.tag.textContent = "VIEW: IMAGE A";
                break;
            case "B":
                // Show only B: no clip on B
                this.paneLeft.imgB.style.clipPath = "inset(0 0 0 0%)";
                this.paneLeft.handle.style.left = "0%";
                this.paneLeft.tag.textContent = "VIEW: IMAGE B";
                break;
            case "Split":
            default:
                // Standard 50/50 slider
                this.paneLeft.imgB.style.clipPath = "inset(0 0 0 50%)";
                this.paneLeft.handle.style.left = "50%";
                this.paneLeft.imgB.style.display = "block";
                this.paneLeft.handle.style.display = "block";
                this.paneLeft.tag.textContent = "COMPARE: LIVE VS HISTORY";
                break;
        }
    }

    toggleInspectMode(isOn) {
        this.inspectMode = isOn;

        // 1. Title Glitch
        this.triggerTitleGlitch(isOn);

        // 2. UI Updates
        this.container.classList.toggle("mode-inspect", isOn);

        // Toggle Zoom Slider
        this.zoomControl.classList.toggle("hidden", !isOn);

        // Toggle History Strip (Keep visible in Inspect mode now!)
        // Force remove hidden class just in case interaction added it
        this.historyStrip.classList.remove("hidden");

        // 3. Pane Logic
        if (isOn) {
            // INSPECT MODE
            this.stage.classList.remove("full-mode");
            this.paneRight.tag.textContent = `ZOOM VIEW ${Math.round(this.zoomLevel * 100)}%`;
            this.paneRight.tag.className = "h4-viewport-tag tag-inspect";

            // Left Pane: Hide Slider Elements
            if (this.paneLeft.imgB) this.paneLeft.imgB.style.display = "none";
            if (this.paneLeft.handle) this.paneLeft.handle.style.display = "none";
            this.paneLeft.tag.textContent = "INSPECT SOURCE";

            // Show Zoom Canvas, Hide History Img
            this.paneRight.zoomCanvas.style.display = "block";
            this.paneRight.imgHistoryDisplay.style.display = "none";

            // [FIX] Ensure imgA (Left Pane) shows the image we are inspecting!
            // If currentImageUrl is set, use it. If not, fallback to imgA.src.
            if (this.currentImageUrl) {
                this.paneLeft.imgA.src = this.currentImageUrl;
            } else if (this.paneLeft.imgA.src) {
                this.currentImageUrl = this.paneLeft.imgA.src;
            }

            this.paneRight.zoomCanvas.style.backgroundImage = `url("${this.currentImageUrl}")`;

            // [FIX] Force update once image loads (fixes aspect ratio math)
            this.paneLeft.imgA.onload = () => {
                if (this.inspectMode && this.lastMouseX !== undefined) {
                    this.updateReticle(this.lastMouseX, this.lastMouseY);
                }
            };

            // Note: Wheel listener is now in buildControls()

        } else {
            // COMPARE MODE (Default)
            // Restore History View
            this.paneRight.tag.textContent = "HISTORY";
            this.paneRight.tag.className = "h4-viewport-tag tag-history";

            // Show History Img, Hide Zoom
            this.paneRight.zoomCanvas.style.display = "none";
            this.paneRight.imgHistoryDisplay.style.display = "block";

            // Hide reticle
            this.paneLeft.reticle.style.display = "none";

            // [FIX] Always restore slider visibility when both images have sources
            if (this.paneLeft.imgA.src && this.paneLeft.imgB.src) {
                this.paneLeft.imgB.style.display = "block";
                this.paneLeft.handle.style.display = "block";
            }

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

        if (data.current) {
            this.liveNodeData = data.current;
            const t = data.current.timestamp || new Date().getTime();

            // [NEW] Capture and Cache Metadata IMMEDIATELY
            const captured = this.captureGraphMetadata();
            // Cache per filename
            if (data.current.filename_a) {
                this.metadataCache[data.current.filename_a] = { A: captured.A };
            }
            if (data.current.filename_b) {
                // For B, usually "result".
                this.metadataCache[data.current.filename_b] = { B: captured.B };
            }
            // Also attach to live data for immediate use
            data.current.metaA = captured.A;
            data.current.metaB = captured.B;

            // --------------------------------------------------------
            // SLIDER LOGIC Check
            // If we have distinct A and B images in the current payload,
            // we should set them up for comparison immediately!
            // --------------------------------------------------------
            if (data.current.filename_a && data.current.filename_b && data.current.filename_a !== data.current.filename_b) {
                let urlA = `/view?filename=${data.current.filename_a}&type=temp&t=${t}`;
                const urlB = `/view?filename=${data.current.filename_b}&type=temp&t=${t}`;

                // [NEW] History Lock Logic
                // If we have a locked reference, IT becomes the 'Before' image (A)
                // regardless of what the backend sent as 'A'.
                if (this.lockedReferenceItem) {
                    const refT = this.lockedReferenceItem.timestamp;
                    // Use filename_b of the reference (the result of that past gen) as our new A
                    urlA = `/view?filename=${this.lockedReferenceItem.filename_b}&type=temp&t=${refT}`;
                    console.log("[Comparinator] Using Locked Reference as Image A:", urlA);
                }

                // Set Background (A)
                this.paneLeft.imgA.src = urlA;
                this.paneLeft.imgA.onerror = () => console.error("[Comparinator] Failed load A:", urlA);

                // Set Foreground (B) and enable Slider
                this.paneLeft.imgB.src = urlB;
                this.paneLeft.imgB.style.display = "block";
                this.paneLeft.handle.style.display = "block";

                // For Inspect Mode, we default to the "Result" (B)
                this.currentImageUrl = urlB;

                // Ensure we are NOT in full mode (Slider active)
                this.stage.classList.remove("full-mode");

                // [FIX] If we are viewing history, and a new live generation comes in,
                // we should probably reset to show the new live generation?
                // "live view needs to not change , it needs to stay the same."
                // "The only view that changes is the second one"
                // This implies the slider is typically comparing Live (A) vs History (B).
                // Currently updateData sets A and B based on the payload.
                // If data.current HAS distinct A/B (e.g. from node input), we show that.

                // If we have a lockedReferenceItem, we already handle that in updateData logic (lines 1000+)

            } else {
                // FALLBACK logic...
                // FALLBACK: Single Image (Standard Preview behavior)
                // Use 'filename_b' as the primary result usually
                this.currentImageUrl = `/view?filename=${data.current.filename_b}&type=temp&t=${t}`;
                this.paneLeft.imgA.src = this.currentImageUrl;
                this.paneLeft.imgA.onerror = () => console.error("[Comparinator] Failed load A:", this.currentImageUrl);

                // Hide Slider components
                if (this.paneLeft.imgB) this.paneLeft.imgB.style.display = "none";
                if (this.paneLeft.handle) this.paneLeft.handle.style.display = "none";

                // Default to Full Mode
                this.stage.classList.add("full-mode");
            }

            // Update Zoom Canvas if in Inspect Mode
            if (this.inspectMode) {
                this.paneRight.zoomCanvas.style.backgroundImage = `url("${this.currentImageUrl}")`;
            }
        }

        // Update History Strip
        if (data.history) {
            this.renderStrip(data.history);

            // Auto-select first history item if we don't have one valid comparison yet
            // AND if we have history to show.
            // This ensures the slider appears immediately.
            if (!this.historyImageUrl && data.history.length > 0) {
                // Default to the *second* item if current matches first? 
                // Usually backend returns [Current, Past1, Past2...] logic or similar?
                // Let's just pick the first one from history for now.
                const item = data.history[0];
                this.selectHistoryItem(item);

                // Visually mark active
                const thumb = this.historyStrip.children[0];
                if (thumb) thumb.classList.add("active");

                // Exit full mode to show slider
                this.stage.classList.remove("full-mode");
            }
        }
    }

    selectHistoryItem(item) {
        if (!item || !item.filename_a || !item.filename_b) return;

        const t = item.timestamp;
        const urlA = `/view?filename=${item.filename_a}&type=temp&t=${t}`;
        const urlB = `/view?filename=${item.filename_b}&type=temp&t=${t}`;

        // [NEW] Logic: Compare Live (Left) vs History Result (Right)

        // 1. Determine Image A (Left Pane)
        // Default to the LIVE image if available
        let finalUrlA = urlA; // Default to history's A if no live data?

        if (this.liveNodeData && this.liveNodeData.filename_b) {
            // User wants to compare "Live" vs "Past".
            // "Live" usually means the latest Result (B of the live pair).
            const liveT = this.liveNodeData.timestamp;
            finalUrlA = `/view?filename=${this.liveNodeData.filename_b}&type=temp&t=${liveT}`;
        }

        // 2. Determine Image B (Right Pane)
        // This is the History item's Result
        const finalUrlB = urlB;

        // Update Images
        this.paneLeft.imgA.src = finalUrlA;
        this.paneLeft.imgB.src = finalUrlB;

        // Update Right Pane Reference (for standard view usage)
        this.historyImageUrl = finalUrlB;
        this.paneRight.imgHistoryDisplay.src = finalUrlB;

        // [FIX] Inspect Mode
        if (this.inspectMode) {
            this.currentImageUrl = finalUrlB;
            this.paneLeft.imgA.src = finalUrlB; // Show B in main if inspecting
            this.paneRight.zoomCanvas.style.backgroundImage = `url("${finalUrlB}")`;

            this.paneLeft.imgA.onload = () => {
                if (this.inspectMode && this.lastMouseX !== undefined) {
                    this.updateReticle(this.lastMouseX, this.lastMouseY);
                }
            };
        }

        // Ensure Slider is Visible (Split Mode)
        this.setSliderMode("Split");
        this.stage.classList.remove("full-mode");
    }

    renderStrip(historyList) {
        this.currentHistoryList = historyList; // [NEW] Store for re-rendering
        this.historyStrip.innerHTML = "";

        historyList.forEach((item, index) => {
            const thumb = document.createElement("div");
            thumb.className = "h4-history-thumb";
            const t = item.timestamp;
            const url = `/view?filename=${item.filename_b}&type=temp&t=${t}`;
            thumb.style.backgroundImage = `url("${url}")`;

            const num = index + 1;

            // Check if this item is the locked reference
            if (this.lockedReferenceItem && item.timestamp === this.lockedReferenceItem.timestamp) {
                thumb.classList.add("locked-ref");
            }

            thumb.onclick = () => {
                const isSelected = thumb.classList.contains("active");
                Array.from(this.historyStrip.children).forEach(c => c.classList.remove("active"));
                thumb.classList.add("active");

                // INSPECT MODE LOGIC
                if (this.inspectMode) {
                    this.currentImageUrl = url;
                    this.paneRight.zoomCanvas.style.backgroundImage = `url("${url}")`;
                    this.paneLeft.imgA.src = url;
                    return;
                }

                // COMPARE MODE LOGIC
                if (isSelected && !this.lockedReferenceItem) {
                    // Deselect: go full-mode but keep slider if both images loaded
                    this.stage.classList.add("full-mode");
                    thumb.classList.remove("active");
                    // [FIX] Restore slider in full-mode so user can still compare A vs B
                    if (this.paneLeft.imgA.src && this.paneLeft.imgB.src) {
                        this.paneLeft.imgB.style.display = "block";
                        this.paneLeft.handle.style.display = "block";
                    }
                } else {
                    this.stage.classList.remove("full-mode");
                    this.selectHistoryItem(item);
                }
            };

            // [NEW] Right-Click to Lock Reference
            thumb.oncontextmenu = (e) => {
                e.preventDefault();
                this.toggleReferenceLock(item);
                // Re-render to show lock icon? Or just toggle class here manually for speed
                this.renderStrip(this.currentHistoryList || historyList);
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

    // --- UX HANDLERS ---

    handleKey(e) {
        // Ignore if user is typing in metadata drawer
        if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;

        // Blink Mode (Spacebar)
        if (e.code === "Space") {
            // Only active if mouse is hovering container
            if (!this.container.matches(':hover')) return;

            e.preventDefault();
            if (e.type === "keydown" && !this.blinkMode) {
                this.toggleBlinkMode(true);
            } else if (e.type === "keyup") {
                this.toggleBlinkMode(false);
            }
            return;
        }

        // Shortcuts (Shift + Number)
        if (e.shiftKey && e.type === "keydown") {
            switch (e.key) {
                case "1": this.setSliderMode("A"); break;
                case "2": this.setSliderMode("B"); break;
                case "3": this.setSliderMode("Split"); break;
                case "4": /* Reserved for Blink Toggle if needed */ break;
            }
        }
    }

    toggleZoomLock() {
        this.zoomLocked = !this.zoomLocked;
        // Visual Feedback?
        this.paneRight.el.style.borderColor = this.zoomLocked ? "#f00" : ""; // Red border when locked
        // Also fix reticle color?
        this.paneLeft.reticle.style.borderColor = this.zoomLocked ? "#f00" : "#0ff";
        this.paneLeft.reticle.style.boxShadow = this.zoomLocked ? "0 0 5px #f00" : "0 0 5px #0ff";
    }

    toggleBlinkMode(active) {
        this.blinkMode = active;
        // Logic: Keep A visible, Toggle B visibility
        // If Active: Hide B (Show A). Validate with user "Blink" usually means "Show Ref"?
        // Actually, if we are looking at B (Slider > 50%), Space should show A.
        // If we are looking at A, Space should show B.
        // Simplest: Force B opacity to 0 when active.

        if (this.paneLeft.imgB) {
            this.paneLeft.imgB.style.opacity = active ? "0" : "1";
        }
    }

    setSliderMode(mode) {
        if (!this.paneLeft.handle || !this.paneLeft.imgB) return;

        // Disable Inspect Mode if active?
        if (this.inspectMode) this.toggleInspectMode(false);

        if (mode === "A") {
            this.paneLeft.handle.style.left = "100%";
            this.paneLeft.imgB.style.clipPath = "inset(0 0 0 100%)"; // Hide B
        } else if (mode === "B") {
            this.paneLeft.handle.style.left = "0%";
            this.paneLeft.imgB.style.clipPath = "inset(0 0 0 0%)"; // Show B
        } else if (mode === "Split") {
            this.paneLeft.handle.style.left = "50%";
            this.paneLeft.imgB.style.clipPath = "inset(0 0 0 50%)"; // Split
        }
    }


    toggleReferenceLock(item) {
        if (this.lockedReferenceItem && this.lockedReferenceItem.timestamp === item.timestamp) {
            // Unlock
            this.lockedReferenceItem = null;
            console.log("[Comparinator] Reference Unlocked");
        } else {
            // Lock New
            this.lockedReferenceItem = item;
            console.log("[Comparinator] Reference Locked:", item);
        }
        // Force Re-render to update UI
        if (this.currentHistoryList) this.renderStrip(this.currentHistoryList);
    }

    openLightbox(item) {
        const t = item.timestamp;
        const url = `/view?filename=${item.filename_b}&type=temp&t=${t}`;

        const overlay = document.createElement("div");
        overlay.className = "h4-lightbox-overlay";

        const img = document.createElement("img");
        img.src = url;
        img.className = "h4-lightbox-img";

        // --- Drag & Zoom State ---
        let isDragging = false;
        let startX, startY, translateX = 0, translateY = 0;
        let scale = 1;

        // ZOOM (Click)
        img.onclick = (e) => {
            if (scale === 1) {
                scale = 3;
                img.style.cursor = "grab";
                img.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
            } else {
                // Reset
                scale = 1;
                translateX = 0;
                translateY = 0;
                img.style.cursor = "zoom-in";
                img.style.transform = `scale(1) translate(0,0)`;
            }
            e.stopPropagation();
        };

        // DRAG (Mouse Events)
        img.onmousedown = (e) => {
            if (scale > 1) {
                isDragging = true;
                startX = e.clientX - translateX;
                startY = e.clientY - translateY;
                img.style.cursor = "grabbing";
                e.preventDefault(); // Prevent default drag behavior
            }
        };

        window.addEventListener("mousemove", (e) => {
            if (isDragging && scale > 1) {
                e.preventDefault();
                translateX = e.clientX - startX;
                translateY = e.clientY - startY;
                img.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
            }
        });

        window.addEventListener("mouseup", () => {
            if (isDragging) {
                isDragging = false;
                img.style.cursor = "grab";
            }
        });

        // Close Button
        const closeBtn = document.createElement("div");
        closeBtn.className = "h4-lightbox-close";
        closeBtn.innerHTML = "&times;";
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            document.body.removeChild(overlay);
        };

        // Info
        const info = document.createElement("div");
        info.className = "h4-lightbox-info";
        info.innerHTML = `<span>History #${item.timestamp}</span>`;

        overlay.appendChild(img);
        overlay.appendChild(closeBtn);
        overlay.appendChild(info);

        // Close on background click
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
            }
        };

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
                try {
                    if (onNodeCreated) onNodeCreated.apply(this, arguments);
                    const ui = new ComparinatorUI(this);
                    this.comparinatorUI = ui;
                    if (this.addDOMWidget) {
                        this.addDOMWidget("h4_comparinator_ui", "custom", ui.container, { serialize: false, hideOnZoom: false });
                    }
                    this.setSize([640, 580]);

                    const hideWidget = (wName) => {
                        if (!this.widgets) return;
                        const w = this.widgets.find(w => w.name === wName);
                        if (w) {
                            w.type = "converted-widget";
                            w.computeSize = () => [0, -4];
                            w.visible = false;
                            w.disabled = true;
                            w.draw = () => { };
                            if (w.inputEl) { w.inputEl.style.display = "none"; w.inputEl.style.visibility = "hidden"; }
                            if (w.element) { w.element.style.display = "none"; w.element.style.visibility = "hidden"; }
                        }
                    };

                    let attempts = 0;
                    const hider = () => {
                        try {
                            hideWidget("save_mode");
                            hideWidget("metadata_text");
                            hideWidget("save_settings");
                            hideWidget("filename_prefix");

                            if (this.onResize && this.size) this.onResize(this.size);
                            if (app.graph) app.graph.setDirtyCanvas(true, true);

                            attempts++;
                            if (attempts < 5) setTimeout(hider, 200);
                        } catch (e) { console.error("[H4 Comparinator] Hider Error:", e); }
                    };
                    setTimeout(hider, 100);
                } catch (e) {
                    console.error("[H4 Comparinator] onNodeCreated Crit Fail:", e);
                }
            };

            // [NEW] Hook onConfigure for graph loading
            const onConfigure = nodeType.prototype.onConfigure;
            nodeType.prototype.onConfigure = function () {
                try {
                    if (onConfigure) onConfigure.apply(this, arguments);
                    if (this.comparinatorUI) {
                        const hider = () => {
                            try {
                                const hide = (wName) => {
                                    if (!this.widgets) return;
                                    const w = this.widgets.find(w => w.name === wName);
                                    if (w) {
                                        w.type = "converted-widget";
                                        w.computeSize = () => [0, -4];
                                        w.visible = false;
                                        w.disabled = true;
                                        w.draw = () => { };
                                        if (w.inputEl) { w.inputEl.style.display = "none"; w.inputEl.style.visibility = "hidden"; }
                                        if (w.element) { w.element.style.display = "none"; w.element.style.visibility = "hidden"; }
                                    }
                                };
                                hide("save_mode");
                                hide("metadata_text");
                                hide("save_settings");
                                hide("filename_prefix");
                                if (this.onResize && this.size) this.onResize(this.size);
                            } catch (e) { console.error("[H4 Comparinator] Configure Hider Error:", e); }
                        };
                        setTimeout(hider, 100);
                    }
                } catch (e) { console.error("[H4 Comparinator] onConfigure Error:", e); }
            };
        }
    }
});
