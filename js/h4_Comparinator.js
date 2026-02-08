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
    object-fit: contain;
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

/* LIGHTBOX OVERLAY */
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
                // Ensure we don't process if blocked? No, mousemove is fine.
                requestAnimationFrame(() => this.handleMouseMoveInspect(e, el, reticle));
            } else {
                // COMPARE MODE: Move Slider
                this.handleMouseMoveCompare(e, el, imgB, handle);
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

    buildControls() {
        // Save Toggle
        const saveToggle = this.createToggle("Save Output", (isOn) => this.toggleSaveMode(isOn));

        // Inspect Toggle
        const inspectToggle = this.createToggle("INSPECT DETAILS", (isOn) => this.toggleInspectMode(isOn), "inspect-on");

        // Zoom Slider (Hidden initially)
        this.zoomControl = document.createElement("div");
        this.zoomControl.className = "h4-slider-wrap hidden";
        this.zoomControl.innerHTML = `<span>ZM: 200%</span><input type="range" min="100" max="400" value="200">`;
        const range = this.zoomControl.querySelector("input");
        const label = this.zoomControl.querySelector("span");

        range.oninput = (e) => {
            this.zoomLevel = e.target.value / 100;
            label.textContent = `ZM: ${e.target.value}%`;
            // Force update if we have a valid reticle position, 
            // otherwise just wait for mouse move.
            // Better yet, dispatch a fake mousemove or store last position?
            // For now, let's just let the next interaction handle it or use the wheel.
        };

        // Wheel Zoom Support for global container (or just right pane?)
        // Let's add it to the paneRight element in createRightPane


        // Metadata Button
        this.metaBtn = document.createElement("button");
        this.metaBtn.className = "h4-btn";
        this.metaBtn.textContent = "METADATA";
        this.metaBtn.onclick = () => this.toggleDrawer();

        this.controlPanel.appendChild(saveToggle);
        this.controlPanel.appendChild(inspectToggle);
        this.controlPanel.appendChild(this.zoomControl); // Insert Slider
        this.controlPanel.appendChild(this.metaBtn);

        // [FIX] Add Wheel Listener HERE (Global for this instance)
        // We attach it to the zoomCanvas (Right Pane) but need to ensure it works
        // even if we haven't hovered yet? No, zoomCanvas is the target.
        // [FIX] Attach Wheel Listener to the MAIN CONTAINER
        // This ensures it works whether we hover the Source (Left) or Result (Right).
        this.container.addEventListener("wheel", (e) => {
            if (!this.inspectMode) return;
            e.preventDefault();
            e.stopPropagation();

            const delta = Math.sign(e.deltaY) * -0.5; // Up = Zoom In
            let newZoom = this.zoomLevel + delta;
            newZoom = Math.max(1.0, Math.min(5.0, newZoom)); // Clamp 1x to 5x

            this.zoomLevel = newZoom;

            // Update UI
            this.paneRight.tag.textContent = `ZOOM VIEW ${Math.round(this.zoomLevel * 100)}%`;
            const range = this.zoomControl.querySelector("input");
            const label = this.zoomControl.querySelector("span");
            if (range) range.value = Math.round(newZoom * 100);
            if (label) label.textContent = `ZM: ${Math.round(newZoom * 100)}%`;

            // Trigger update
            if (this.lastMouseX !== undefined && this.lastMouseY !== undefined) {
                this.updateReticle(this.lastMouseX, this.lastMouseY);
            }
        }, { passive: false });
    }

    // --------------------------------------------------------------------------
    // Core Logic
    // --------------------------------------------------------------------------

    handleMouseMoveCompare(e, container, imgB, handle) {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;

        let percent = (x / rect.width) * 100;
        percent = Math.max(0, Math.min(100, percent));

        handle.style.left = `${percent}%`;
        imgB.style.clipPath = `inset(0 0 0 ${percent}%)`;
    }

    handleMouseMoveInspect(e, container, reticle) {
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
        // Update Current Image (Left Pane)
        if (data.current) {
            const t = data.current.timestamp || new Date().getTime();

            // --------------------------------------------------------
            // SLIDER LOGIC Check
            // If we have distinct A and B images in the current payload,
            // we should set them up for comparison immediately!
            // --------------------------------------------------------
            if (data.current.filename_a && data.current.filename_b && data.current.filename_a !== data.current.filename_b) {
                const urlA = `/view?filename=${data.current.filename_a}&type=temp&t=${t}`;
                const urlB = `/view?filename=${data.current.filename_b}&type=temp&t=${t}`;

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

            } else {
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

        // Update both images to recreate the full historic comparison
        this.paneLeft.imgA.src = urlA;
        this.paneLeft.imgB.src = urlB;

        // Update Right Pane Reference (for standard view usage)
        this.historyImageUrl = urlB;
        this.paneRight.imgHistoryDisplay.src = urlB;

        // [FIX] If in Inspect Mode, we usually stick to one image (B or A).
        // Let's default to B (Result) for the Zoom View.
        if (this.inspectMode) {
            this.currentImageUrl = urlB;
            // In Inspect Mode, imgA is the only visible image (Source Map).
            // We set it to urlB so the reticle tracks the Result image.
            this.paneLeft.imgA.src = urlB;
            this.paneRight.zoomCanvas.style.backgroundImage = `url("${urlB}")`;

            this.paneLeft.imgA.onload = () => {
                if (this.inspectMode && this.lastMouseX !== undefined) {
                    this.updateReticle(this.lastMouseX, this.lastMouseY);
                }
            };
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
                const isSelected = thumb.classList.contains("active");
                Array.from(this.historyStrip.children).forEach(c => c.classList.remove("active"));

                thumb.classList.add("active");

                // INSPECT MODE LOGIC
                if (this.inspectMode) {
                    // Update EVERYTHING to reflect this new image
                    this.currentImageUrl = url;

                    // 1. Update Zoom Background
                    this.paneRight.zoomCanvas.style.backgroundImage = `url("${url}")`;

                    // 2. Update Source Map (Left Pane) so reticle works on correct image
                    this.paneLeft.imgA.src = url;

                    // Optional: Visual feedback that this is the "Inspected" image?
                    return;
                }

                // COMPARE MODE LOGIC
                if (isSelected) {
                    this.stage.classList.add("full-mode");
                    thumb.classList.remove("active"); // Toggle off
                } else {
                    this.stage.classList.remove("full-mode");
                    this.selectHistoryItem(item);
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
