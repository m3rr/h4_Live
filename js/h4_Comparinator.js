import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

// ------------------------------------------------------------------------------
// H4 Comparinator -> THE HOLY GRAIL [Ver 3.0 - MULTI-LAYER & CRAWLER]
// ------------------------------------------------------------------------------

/**
 * [RULE 2] Detailed Comment:
 * The HOLY GRAIL STYLE block defines the 4-layer stacking order:
 * - Base (Z:10): Live Image A.
 * - Live B (Z:15): Clipped by Horiz Slider.
 * - Locked A (Z:20): Inside the Locked Group, Clipped by Vert Slider.
 * - Locked B (Z:25): Inside the Locked Group, Clipped by both Vert and Horiz sliders.
 * 
 * Sliders:
 * - Red (X): Horizontal comparison (A/B).
 * - Yellow (Y): Vertical comparison (Live/History).
 */
const STYLE = `
.h4-comparinator-root {
    width: 100%; height: 100%;
    position: absolute;
    top: 0; left: 0;
    pointer-events: none;
    box-sizing: border-box;
    z-index: 1000;
    /* --- BOUNDARY ENFORCEMENT: Prevent 'stretching' below the node --- */
    overflow: visible; 
}

/* --- CLIPPED GRID UTILS (For Inspectinator) --- */
.h4-inspect-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    width: 100%; height: 100%;
    position: absolute;
    top: 0; left: 0;
    visibility: hidden;
}
.h4-inspect-grid.active { visibility: visible; }
.h4-cell { position: relative; overflow: hidden; border: 1px solid rgba(0,255,136,0.1); }
.h4-cell img { width: 100%; height: 100%; object-fit: contain; }

.h4-comp-frame {
    width: 100%; height: 100%;
    background: transparent;
    border: 1px solid rgba(0, 170, 68, 0.2);
    display: flex;
    flex-direction: column;
    pointer-events: auto;
    border-radius: 2px;
    /* [H4] Overflow visible to allow drawers to slide OUT of the node boundaries */
    overflow: visible;
    font-family: 'Segoe UI', 'Roboto', monospace;
    position: relative;
}

/* --- SCANLINES / NOISE --- */
.h4-scanlines {
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    pointer-events: none;
    z-index: 999;
    background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.1) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03));
    background-size: 100% 4px, 3px 100%;
    opacity: 0; display: none;
}

/* --- STAGE --- */
.h4-stage {
    flex: 1;
    position: relative;
    overflow: hidden;
    background: transparent;
    border-bottom: 2px solid rgba(0, 170, 68, 0.1);
}

.h4-img-layer {
    position: absolute;
    width: 100%; height: 100%;
    object-fit: contain;
    user-select: none;
}

/* --- SLIDERS --- */
.h4-slider-x {
    position: absolute;
    top: 0; bottom: 0; width: 2px;
    background: #006622;
    z-index: 500;
    cursor: col-resize;
    box-shadow: 0 0 15px #006622, 0 0 5px #fff;
}
.h4-slider-y {
    position: absolute;
    left: 0; right: 0; height: 2px;
    background: #006622;
    z-index: 501;
    cursor: row-resize;
    box-shadow: 0 0 15px #006622, 0 0 5px #fff;
    display: none;
}

/* --- LABELS --- */
.h4-pane-label {
    position: absolute;
    font-size: 9px;
    font-weight: 900;
    padding: 3px 6px;
    background: rgba(0,0,0,0.85);
    border: 1px solid rgba(255,255,255,0.1);
    z-index: 600;
    pointer-events: none;
    color: #fff;
    letter-spacing: 2px;
    text-shadow: 0 0 5px #006622;
}

/* --- CONTROLS --- */
.h4-bottom-bar {
    height: 44px;
    background: transparent;
    display: flex;
    align-items: center;
    padding: 0 15px;
    gap: 20px;
    z-index: 700;
    border-top: 1px solid rgba(0, 170, 68, 0.1);
}
.h4-toggle-wrap {
    display: flex; align-items: center; gap: 10px; cursor: pointer;
    transition: 0.3s;
}
.h4-toggle-wrap:hover .h4-toggle-label { color: #fff; text-shadow: 0 0 8px #fff; }

.h4-toggle-pill {
    width: 40px; height: 18px;
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

/* --- CYAN / INSPECT OVERRIDE --- */
.inspecting-mode .h4-comp-frame { border-color: rgba(0, 255, 255, 0.4) !important; box-shadow: 0 0 25px rgba(0, 255, 255, 0.2) !important; }
.inspecting-mode .h4-toggle-wrap.active .h4-toggle-label { color: #0ff !important; text-shadow: 0 0 10px #0ff !important; }
.inspecting-mode .h4-toggle-wrap.active .h4-toggle-pill { border-color: #008888 !important; box-shadow: 0 0 15px rgba(0,255,255,0.4) !important; }
.inspecting-mode .h4-toggle-wrap.active .h4-toggle-knob { background: #008888 !important; }

.h4-channel-toggle {
    display: none; align-items: center; gap: 8px; background: rgba(0,20,20,0.8);
    padding: 2px 10px; border: 1px solid #004444; border-radius: 2px;
    margin-right: 15px;
}
.h4-channel-toggle.visible { display: flex; }
.h4-channel-btn {
    font-size: 10px; color: #004444; cursor: pointer; font-weight: 900;
    transition: 0.2s; padding: 2px 4px;
}
.h4-channel-btn.active { color: #0ff; text-shadow: 0 0 8px #0ff; }
.h4-channel-slash { font-size: 10px; color: #004444; pointer-events: none; }
.inspecting-mode .h4-slider-x, .inspecting-mode .h4-slider-y { background: #008888; box-shadow: 0 0 15px #008888, 0 0 5px #fff; }

.h4-channel-toggle {
    display: none; align-items: center; gap: 5px; background: rgba(0,0,0,0.5);
    padding: 2px 8px; border: 1px solid #004444; border-radius: 2px;
}
.h4-channel-toggle.visible { display: flex; }
.h4-channel-btn {
    font-size: 9px; color: #333; cursor: pointer; font-weight: 900;
    transition: 0.2s;
}
.h4-channel-btn.active { color: #0ff; text-shadow: 0 0 8px #0ff; }

/* --- STRIP --- */
.h4-filmstrip {
    height: 100px;
    background: #030303;
    display: flex;
    overflow-x: auto;
    padding: 12px;
    gap: 12px;
}
.h4-thumb {
    height: 100%; aspect-ratio: 1;
    background: #111;
    border: 1px solid #222;
    position: relative;
    cursor: pointer;
    flex-shrink: 0;
    transition: transform 0.2s, border-color 0.2s;
    display: flex;
    overflow: hidden;
}
.h4-thumb:hover { transform: scale(1.05); border-color: #444; }
.h4-thumb.sel-green { border-color: #00ff55; box-shadow: 0 0 15px rgba(0,255,85,0.6); }
.h4-thumb.sel-green::after {
    content: 'GREEN'; position: absolute; bottom: 0; width: 100%;
    background: #00ff55; color: #000; font-size: 7px; text-align: center; font-weight: 900;
    z-index: 10;
}
.h4-thumb.sel-red { border-color: #ff3300; box-shadow: 0 0 15px rgba(255,51,0,0.6); }
.h4-thumb.sel-red::after {
    content: 'RED'; position: absolute; bottom: 0; width: 100%;
    background: #ff3300; color: #000; font-size: 7px; text-align: center; font-weight: 900;
    z-index: 10;
}
.h4-thumb.sel-yellow { border-color: #ffff00; box-shadow: 0 0 15px rgba(255,255,0,0.6); }
.h4-thumb.sel-yellow::after {
    content: 'YELLOW'; position: absolute; bottom: 0; width: 100%;
    background: #ffff00; color: #000; font-size: 7px; text-align: center; font-weight: 900;
    z-index: 10;
}
.h4-thumb.is-locked { border-color: #00ffff; box-shadow: 0 0 15px rgba(0,255,255,0.4); }
.h4-thumb.is-locked::before {
    content: '🔒'; position: absolute; top: 2px; right: 2px; font-size: 10px; z-index: 10;
}

.h4-thumb-side {
    flex: 1;
    height: 100%;
    background-size: cover;
    background-position: center;
    pointer-events: none;
}
.h4-thumb-a { border-right: 1px solid rgba(0,255,85,0.2); }

/* --- EXTERNAL PARAMETERS DRAWER (Slide Right) --- */
.h4-drawer {
    position: absolute;
    top: 0; bottom: 0; left: 100%;
    width: 440px;
    background: rgba(10, 10, 10, 0.95);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(0, 102, 34, 0.3);
    border-left: 2px solid #00ff44;
    transition: transform 0.5s cubic-bezier(0.19, 1, 0.22, 1), opacity 0.4s ease;
    z-index: 2000;
    visibility: hidden;
    pointer-events: auto;
    box-shadow: 20px 0 60px rgba(0,0,0,0.9);
    transform: scaleX(0);
    transform-origin: left;
    opacity: 0;
}
.h4-drawer.open { visibility: visible; transform: scaleX(1); opacity: 1; }
.h4-drawer-content { padding: 30px; color: #ddd; font-size: 11px; overflow-y: auto; height: 100%; }

.h4-param-block {
    background: rgba(20, 20, 20, 0.4);
    border: 1px solid rgba(0, 255, 68, 0.1);
    margin-bottom: 25px;
    position: relative;
    border-radius: 4px;
}
.h4-param-header {
    background: rgba(0, 255, 68, 0.05);
    padding: 12px 15px;
    font-weight: 900;
    cursor: pointer;
    border-bottom: 1px solid rgba(0, 255, 68, 0.1);
    color: #00ff44;
    text-transform: uppercase;
    letter-spacing: 2px;
}
.h4-param-list { padding: 15px; }
.h4-param-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #1a1a1a; }
.h4-param-key { color: #888; }
.h4-param-val { color: #fff; font-family: 'JetBrains Mono', 'Courier New', monospace; }
.h4-param-prompt { 
    background: rgba(0,0,0,0.6); border: 1px solid rgba(0, 255, 68, 0.15); padding: 15px; 
    white-space: pre-wrap; margin-top: 10px; font-size: 10px; color: #00ff88;
    line-height: 1.4;
}

/* --- OVERLAY SAVE DRAWER (Hacker Console) --- */
.h4-save-drawer {
    position: absolute;
    top: 100%; /* Slide OUT of the bottom */
    left: 0; width: 100%;
    height: 0; /* Dynamic height for smoothness */
    background: rgba(12, 12, 12, 0.96);
    backdrop-filter: blur(15px);
    border: 1px solid rgba(0, 242, 255, 0.3);
    border-top: none;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    z-index: 1500;
    transition: height 0.45s cubic-bezier(0.19, 1, 0.22, 1);
    pointer-events: auto;
    box-shadow: 0 20px 50px rgba(0,0,0,0.8);
}
.h4-save-drawer.open { height: 260px; border-color: #00f2ff; }
.h4-save-drawer::before {
    content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    background: repeating-linear-gradient(0deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0.3) 1px, rgba(0,0,0,0) 2px);
    pointer-events: none;
}

.h4-save-content { 
    padding: 15px; 
    display: grid; 
    grid-template-columns: 1fr 1fr 1fr; 
    gap: 15px;
    position: relative;
    z-index: 2;
}

.h4-save-field { margin-bottom: 10px; }
.h4-save-label { font-size: 8px; color: #00ff44; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; display: block; opacity: 0.9; font-weight: bold; }
.h4-save-input { 
    width: 100%; background: rgba(0,0,0,0.5); border: 1px solid #006622; color: #00ff44; 
    padding: 6px; font-size: 10px; outline: none; font-family: 'Courier New', monospace; font-weight: bold;
}
.h4-save-input:focus { border-color: #00ff55; box-shadow: 0 0 10px rgba(0,255,85,0.3); }

.h4-save-btn {
    grid-column: span 3;
    background: #006622; color: #fff; border: none; padding: 10px;
    font-weight: 900; cursor: pointer;
    text-transform: uppercase; letter-spacing: 1px;
    transition: 0.3s;
    margin-top: 5px;
    clip-path: polygon(3% 0, 100% 0, 97% 100%, 0 100%);
    font-size: 10px;
}
.h4-save-btn:hover { background: rgba(0,0,0,0.9) !important; color: #fff !important; box-shadow: 0 0 20px #006622; }

.h4-save-check-wrap { 
    display: flex; align-items: center; gap: 10px; font-size: 10px; 
    cursor: pointer; color: #888; margin-bottom: 8px;
    transition: 0.2s;
}
.h4-save-check-wrap:hover { color: #eee; }
.h4-save-check { width: 12px; height: 12px; border: 1px solid #333; transition: 0.3s; }
.h4-save-check.active { background: #006622; border-color: #fff; box-shadow: 0 0 8px #006622; }

/* FLICKER ANIMATION */
@keyframes h4-flicker {
    0% { opacity: 1; }
    5% { opacity: 0.7; }
    10% { opacity: 1; }
    45% { opacity: 1; }
    /* random drop */
    46% { opacity: 0.4; }
    47% { opacity: 1; }
    100% { opacity: 1; }
}
.h4-save-btn { animation: h4-flicker 5s infinite; }

/* --- RETICLE (Sniper Scope) --- */
.h4-reticle { display: none; position: absolute; width: 60px; height: 60px; pointer-events: none; z-index: 600; transform: translate(-50%, -50%); }
.h4-reticle svg { width: 100%; height: 100%; filter: drop-shadow(0 0 5px rgba(0,242,255,0.8)); transition: filter 0.2s; }
.h4-reticle.locked svg { filter: drop-shadow(0 0 5px rgba(255,0,0,0.8)); }
.h4-reticle-hud { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #00f2ff; font-family: monospace; font-weight: 900; display: flex; flex-direction: column; align-items: center; justify-content: space-between; height: 110px; width: 140px; text-shadow: 0 0 5px #00f2ff; pointer-events: none; }
.h4-reticle-zoom { font-size: 14px; position: absolute; top: -20px; letter-spacing: 2px;}
.h4-reticle-coords { font-size: 10px; opacity: 0.9; position: absolute; bottom: -20px; letter-spacing: 1px;}

/* --- HUD BUTTONS --- */
.h4-hud-btn { display: none; }

/* LIGHTBOX */
.h4-lightbox {
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0,0,0,0.95); z-index: 10000;
    display: none; flex-direction: column; align-items: center; justify-content: center;
}
.h4-lightbox.open { display: flex; }
.h4-lightbox-img {
    max-width: 95vw; max-height: 95vh;
    width: auto; height: auto;
    object-fit: contain; 
    transition: transform 0.1s linear;
    user-select: none; pointer-events: none;
    transform-origin: center center;
    position: relative;
    box-shadow: 0 0 50px rgba(0,0,0,0.5);
}
.h4-lightbox-controls {
    position: absolute; bottom: 30px; right: 30px;
    display: flex; gap: 15px; align-items: center; z-index: 10001;
}
.h4-lb-btn {
    background: rgba(0,0,0,0.8); border: 1px solid #006622; color: #00ff55;
    padding: 8px 15px; font-size: 10px; font-weight: 900; cursor: pointer;
    text-transform: uppercase; letter-spacing: 1px; transition: 0.2s;
}
.h4-lb-btn:hover { background: #006622; color: #fff; }
.h4-lb-btn.active { background: #00ff55; color: #000; border-color: #00ff55; box-shadow: 0 0 10px #00ff55; }

.h4-lb-zoom-slider {
    -webkit-appearance: none; width: 200px; height: 4px; background: #111; 
    outline: none; border-radius: 2px; cursor: pointer;
}
.h4-lb-zoom-slider::-webkit-slider-thumb {
    -webkit-appearance: none; appearance: none;
    width: 12px; height: 12px; background: #00ff55; cursor: pointer; border-radius: 50%;
    box-shadow: 0 0 10px #00ff55;
}

.h4-lb-close {
    position: absolute; top: 30px; right: 30px; font-size: 24px; color: #555;
    cursor: pointer; transition: 0.2s; z-index: 10002;
}
.h4-lb-close:hover { color: #fff; }

.h4-lb-hint {
    position: absolute; top: 30px; left: 30px; font-size: 9px; color: #444;
    text-transform: uppercase; letter-spacing: 1px; pointer-events: none;
}
`;

class ComparinatorUI {
    constructor(node) {
        this.node = node;
        this.state = {
            live: null,
            history: [],
            locked: null,
            otherB: null,
            selected: null,
            historyMode: false,
            params: true,
            sliderX: 50,
            sliderX2: 50,
            sliderY: 50,
            inspect: false,
            inspect_channel: 'B',
            inspectZoom: 1.0,
            _inspectZoomTarget: 1.0,
            _zoomAnimId: null,
            _lastPctX: 50,
            _lastPctY: 50,
            lbZoom: 1,
            lbPair: 'A',
            blink: false,
            inspect_set: [],
            reticle_shape: 'circle',
            parameters: { A: [], B: [] },
            selYellow: null
        };

        // --- PERSISTENT STYLE ATTACHMENT ---
        // Ensure CSS is only injected once per document session to avoid memory bloat
        if (!document.getElementById("h4-comparinator-styles")) {
            const styleEl = document.createElement("style");
            styleEl.id = "h4-comparinator-styles";
            styleEl.textContent = STYLE;
            document.head.appendChild(styleEl);
        }

        // --- BOUND LISTENERS (For Lifecycle Cleanup) ---
        this._windowListeners = {
            mousemove: (e) => {
                if (this.lbPan?.dragging) {
                    this.lbPan.x = e.clientX - this.lbPan.ox;
                    this.lbPan.y = e.clientY - this.lbPan.oy;
                    this.updateLightboxZoom();
                }
            },
            mouseup: () => {
                if (this.lbPan) this.lbPan.dragging = false;
                if (this.lb) this.lb.style.cursor = "crosshair";
            },
            keydown: (e) => this.handleKey(e),
            keyup: (e) => this.handleKey(e)
        };

        this.initDOM();
        this.bindEvents();

        // DIM HACKER GREEN GLOW
        if (this.el && this.el.root) {
            this.el.root.style.boxShadow = "0 0 20px rgba(0, 255, 68, 0.15)";
            this.el.root.style.border = "1px solid rgba(0, 102, 34, 0.3)";
            this.el.root.style.transition = "filter 0.1s ease-out, opacity 0.1s ease-out";
        }

        // FLICKER ENGINE
        this.flickerTimer = -1;
        const runFlickerLoop = () => {
            if (this._destroyed) return; // [H4] Stop zombie loop

            if (this.flickerTimer > 0) {
                this.flickerTimer -= 10;
                if (this.flickerTimer <= 0) {
                    this.triggerFlicker();
                }
            } else if (this.flickerTimer <= 0) {
                // Poll every 10s as requested
                const roll = Math.floor(Math.random() * 11); // 0-10
                if (roll > 0) {
                    // 10 = 5 mins (300s). So roll * 30.
                    this.flickerTimer = roll * 30;
                    // console.log(`[H4 Flicker] Roll: ${roll} -> Delay: ${this.flickerTimer}s`);
                }
            }
            setTimeout(runFlickerLoop, 10000);
        };
        runFlickerLoop();

        setTimeout(() => this.fetchHistory(), 500);

        this._setupExecutionListener();
    }

    _setupExecutionListener() {
        this._onExecuted = () => {
            // Wait for file system flush before fetching
            // Throttled to prevent spamming if rapid executions occur
            if (this._fetchTimeout) clearTimeout(this._fetchTimeout);
            this._fetchTimeout = setTimeout(() => this.fetchHistory(), 1000);
        };
        api.addEventListener("executed", this._onExecuted);

        // ATTACH WINDOW LISTENERS
        Object.entries(this._windowListeners).forEach(([evt, cb]) => {
            window.addEventListener(evt, cb);
        });
    }

    onRemoved() {
        this._destroyed = true;

        // Remove DOM
        if (this.el && this.el.root && this.el.root.parentNode) {
            this.el.root.parentNode.removeChild(this.el.root);
        }
        if (this.drawer && this.drawer.parentNode) {
            this.drawer.parentNode.removeChild(this.drawer);
        }

        // Remove Listeners (CRITICAL: Prevents Memory Leaks & Ghost Hotkeys)
        if (this._onExecuted) api.removeEventListener("executed", this._onExecuted);
        if (this._windowListeners) {
            Object.entries(this._windowListeners).forEach(([evt, cb]) => {
                window.removeEventListener(evt, cb);
            });
        }
        if (this._fetchTimeout) clearTimeout(this._fetchTimeout);
        if (this._glitchTitleInterval) clearInterval(this._glitchTitleInterval);
        if (this.state._zoomAnimId) cancelAnimationFrame(this.state._zoomAnimId);
    }

    initDOM() {
        this.el = { root: document.createElement("div") };
        this.el.root.className = "h4-comparinator-root";

        this.frame = document.createElement("div");
        this.frame.className = "h4-comp-frame";
        this.el.root.appendChild(this.frame);

        // Scanlines Overlay
        const scan = document.createElement("div");
        scan.className = "h4-scanlines";
        this.frame.appendChild(scan);

        // STAGE
        this.stage = document.createElement("div");
        this.stage.className = "h4-stage";
        this.frame.appendChild(this.stage);

        /**
         * 4-LAYER STACK CONSTRUCTION (Z-Order Alignment)
         * Z:10 - Live A (Base Master)
         * Z:15 - Hist A (Temporal X-Offset)
         * Z:20 - Live B (Spatial Y-Offset)
         * Z:25 - Hist B (Dual-Axis Offset)
         */
        this.layers = {
            liveA: this.createImageLayer(10),
            histA: this.createImageLayer(15),
            liveB: this.createImageLayer(20),
            histB: this.createImageLayer(25),
            histC: this.createImageLayer(30),
            histD: this.createImageLayer(35)
        };
        this._lastUrls = { liveA: "", histA: "", liveB: "", histB: "", histC: "" };
        Object.values(this.layers).forEach(img => this.stage.appendChild(img));

        // Sliders
        this.sliderX = document.createElement("div");
        this.sliderX.className = "h4-slider-x";
        this.sliderX2 = document.createElement("div"); // INDEPENDENT SLIDER FOR PANE 2
        this.sliderX2.className = "h4-slider-x";
        this.sliderY = document.createElement("div");
        this.sliderY.className = "h4-slider-y";
        this.stage.appendChild(this.sliderX);
        this.stage.appendChild(this.sliderX2);
        this.stage.appendChild(this.sliderY);

        // Labels
        this.labels = {
            liveA: this.createLabel("LIVE A", "5px", "5px"),
            liveB: this.createLabel("LIVE B", "5px", "auto", "5px"),
            histA: this.createLabel("YELLOW", "auto", "5px", "auto", "5px"),
            histB: this.createLabel("RED", "auto", "auto", "5px", "5px"),
            histC: this.createLabel("GREEN", "auto", "50%", "auto", "5px"),
            histD: this.createLabel("LOCKED", "auto", "auto", "5px", "5px")
        };
        this.labels.histD.style.textShadow = "0 0 5px #00f2ff"; // Cyan glow for locked image
        this.labels.histC.style.transform = "translateX(-50%)"; // Inspectinator Centering
        this.labels.histC.style.transition = "all 0.3s ease";  // Smooth docking for grid mode
        Object.values(this.labels).forEach(l => this.stage.appendChild(l));

        // [H4] Pre-Init Forensic Wrappers (Stable DOM approach)
        this.pane1Wrap = document.createElement("div");
        this.pane2Wrap = document.createElement("div");
        this.pane1Wrap.style.cssText = "position:absolute; top:0; left:0; width:50%; height:100%; overflow:hidden; display:none; z-index:45;";
        this.pane2Wrap.style.cssText = "position:absolute; top:0; left:50%; width:50%; height:100%; overflow:hidden; display:none; z-index:45; border-left:1px solid rgba(0,242,255,0.2);";
        this.stage.appendChild(this.pane1Wrap);
        this.stage.appendChild(this.pane2Wrap);

        // Interaction Reticle (Sniper Scope)
        this.reticle = document.createElement("div");
        this.reticle.className = "h4-reticle";
        this.reticle.innerHTML = `
            <svg viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="48" fill="none" stroke="#00f2ff" stroke-width="1" stroke-dasharray="2 4" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#00f2ff" stroke-width="0.5" />
                <line x1="50" y1="0" x2="50" y2="35" stroke="#00f2ff" stroke-width="1.5" />
                <line x1="50" y1="65" x2="50" y2="100" stroke="#00f2ff" stroke-width="1.5" />
                <line x1="0" y1="50" x2="35" y2="50" stroke="#00f2ff" stroke-width="1.5" />
                <line x1="65" y1="50" x2="100" y2="50" stroke="#00f2ff" stroke-width="1.5" />
                <circle cx="50" cy="50" r="3" fill="#00f2ff" />
            </svg>
            <div class="h4-reticle-hud">
                <span class="h4-reticle-zoom">1.0x</span>
            </div>
        `;
        this.reticleZoomLabel = this.reticle.querySelector(".h4-reticle-zoom");
        this.reticleCoordsLabel = this.reticle.querySelector(".h4-reticle-coords");
        this.stage.appendChild(this.reticle);

        // --- GRID STORAGE (For Multi-Inspectinator) ---
        this.grids = {
            nav: document.createElement("div"),
            mag: document.createElement("div")
        };
        this.grids.nav.className = "h4-inspect-grid grid-nav";
        this.grids.mag.className = "h4-inspect-grid grid-mag";
        this.stage.appendChild(this.grids.nav);
        this.stage.appendChild(this.grids.mag);

        // Bottom Bar
        this.bar = document.createElement("div");
        this.bar.className = "h4-bottom-bar";
        this.frame.appendChild(this.bar);

        this.toggles = {
            inspect: this.createToggle("INSPECT", (v) => this.setInspect(v), "inspect"),
            history: this.createToggle("HISTORIES", (v) => this.setHistoryMode(v), "history"),
            params: this.createToggle("PARAMETERS", (v) => this.setDrawer(v), "params"),
            save: this.createToggle("SAVE FUNCTIONS", (v) => this.setSave(v), "save")
        };

        // Explicit Order for Bottom Bar
        this.bar.appendChild(this.toggles.inspect);
        this.bar.appendChild(this.toggles.history);
        this.bar.appendChild(this.toggles.params);
        this.bar.appendChild(this.toggles.save);

        // HUD: Shape Buttons (Only visible in Inspect)
        this.hudWrap = document.createElement("div");
        this.hudWrap.style.display = "none";
        this.hudWrap.style.gap = "4px";
        ['circle', 'square', 'triangle', 'rectangle'].forEach(s => {
            const b = document.createElement("div");
            b.className = `h4-hud-btn shape-${s}`;
            b.innerHTML = s.charAt(0).toUpperCase();
            b.onclick = () => {
                this.state.reticle_shape = s;
                this.setReticleShape(s);
            };
            this.hudWrap.appendChild(b);
        });
        this.bar.appendChild(this.hudWrap);

        // ZOOM CONTROLS (Only visible in Inspect Mode)
        this.zoomControls = document.createElement("div");
        this.zoomControls.className = "h4-zoom-controls";
        this.zoomControls.style.display = "none";
        this.zoomControls.style.alignItems = "center";
        this.zoomControls.style.gap = "10px";
        this.zoomControls.style.marginLeft = "10px";
        this.zoomControls.style.marginRight = "10px";

        // Zoom Slider
        const zLabel = document.createElement("div");
        zLabel.textContent = "ZOOM";
        zLabel.style.color = "#00ffff"; zLabel.style.fontSize = "9px"; zLabel.style.fontWeight = "900";
        this.zoomControls.appendChild(zLabel);

        this.inspectSlider = document.createElement("input");
        this.inspectSlider.type = "range";
        this.inspectSlider.min = "1"; this.inspectSlider.max = "50"; this.inspectSlider.step = "0.1"; this.inspectSlider.value = "1";
        this.inspectSlider.style.width = "80px";
        this.inspectSlider.style.height = "2px";
        this.inspectSlider.style.accentColor = "#00ffff";
        this.inspectSlider.oninput = (e) => {
            const val = parseFloat(e.target.value);
            this.state._inspectZoomTarget = val;
            this.state.inspectZoom = val; // Slider drags are direct (no interpolation)
            // Update zoom label inside the reticle HUD on slider drag
            this.reticleZoomLabel.textContent = val < 10 ? `${val.toFixed(1)}x` : `${Math.round(val)}x`;
            // Apply zoom directly — bypass updateReticle() which can crash
            // if layers aren't initialized yet
            this._applyZoomDirect(val);
        };
        this.zoomControls.appendChild(this.inspectSlider);

        // CHANNEL TOGGLE (A / B)
        this.chanToggle = document.createElement("div");
        this.chanToggle.className = "h4-channel-toggle";
        const btnA = document.createElement("div");
        btnA.className = "h4-channel-btn"; btnA.textContent = "CHAN_A";
        const slash = document.createElement("div");
        slash.className = "h4-channel-slash"; slash.textContent = "/";
        const btnB = document.createElement("div");
        btnB.className = "h4-channel-btn active"; btnB.textContent = "CHAN_B";

        btnA.onclick = () => {
            this.state.inspect_channel = 'A';
            btnA.classList.add("active");
            btnB.classList.remove("active");
            this.updateDisplay();
        };
        btnB.onclick = () => {
            this.state.inspect_channel = 'B';
            btnB.classList.add("active");
            btnA.classList.remove("active");
            this.updateDisplay();
        };

        this.chanToggle.appendChild(btnA);
        this.chanToggle.appendChild(slash);
        this.chanToggle.appendChild(btnB);

        this.bar.appendChild(this.hudWrap);
        this.bar.appendChild(this.zoomControls);
        this.bar.appendChild(this.chanToggle);

        // MOUSE WHEEL ZOOM (Stage Level) — smooth animated zoom
        this.stage.addEventListener("wheel", (e) => {
            if (this.state.inspect) {
                e.preventDefault();
                // Exponential zoom: 20% per tick for responsive feel
                const delta = e.deltaY > 0 ? -1 : 1;
                const rate = 0.20;
                let newTarget = this.state._inspectZoomTarget * (1 + (delta * rate));

                // Clamp: Wheel zoom range 1x to 50x
                newTarget = Math.max(1, Math.min(50, newTarget));

                this.state._inspectZoomTarget = newTarget;
                this.inspectSlider.value = newTarget; // Sync slider knob

                // Update zoom HUD label inside the reticle immediately
                this.reticleZoomLabel.textContent = newTarget < 10 ? `${newTarget.toFixed(1)}x` : `${Math.round(newTarget)}x`;

                // Start smooth zoom animation loop (if not already running)
                this._startZoomAnim();
            }
        }, { passive: false });

        // MIDDLE CLICK LOCK
        this.stage.addEventListener("auxclick", (e) => {
            if (e.button === 1) { // Middle Button
                e.preventDefault();

                if (this.state.inspect) {
                    // INSPECT: Lock Reticle Position
                    this.state.reticleLocked = !this.state.reticleLocked;
                    if (this.state.reticleLocked) {
                        const rect = this.stage.getBoundingClientRect();
                        this.state.lockedX = (e.clientX - rect.left) / rect.width;
                        this.state.lockedY = (e.clientY - rect.top) / rect.height;
                        this.reticle.classList.add("locked");
                    } else {
                        this.reticle.classList.remove("locked");
                    }
                } else {
                    // SLIDER LOCK (Split/Full Mode)
                    this.state.sliderLocked = !this.state.sliderLocked;
                    const color = this.state.sliderLocked ? "#ff0000" : "#006622";
                    const glow = this.state.sliderLocked ? "0 0 15px #ff0000" : "0 0 15px #006622";

                    if (this.sliderX) {
                        this.sliderX.style.background = color;
                        this.sliderX.style.boxShadow = glow;
                    }
                    if (this.sliderX2) {
                        this.sliderX2.style.background = color;
                        this.sliderX2.style.boxShadow = glow;
                    }
                    if (this.sliderY) {
                        this.sliderY.style.background = color;
                        this.sliderY.style.boxShadow = glow;
                    }
                }
            }
        });

        // Filmstrip (Event Delegation Mode)
        this.strip = document.createElement("div");
        this.strip.className = "h4-filmstrip";

        this.strip.onclick = (e) => {
            const t = e.target.closest(".h4-thumb");
            if (!t) return;
            const item = this.state.history.find(h => String(h.timestamp) === String(t.dataset.ts));
            if (!item) return;

            if (this.state.inspect) {
                // LOGIC: Multi-Select for Inspectinator (Max 4)
                const idx = this.state.inspect_set.findIndex(i => String(i.timestamp) === String(item.timestamp));
                if (idx !== -1) {
                    this.state.inspect_set.splice(idx, 1);
                } else if (this.state.inspect_set.length < 4) {
                    this.state.inspect_set.push(item);
                }
            } else {
                // LOGIC: Toggled Selection (Standard Mode)
                if (this.state.selected && String(this.state.selected.timestamp) === String(item.timestamp)) {
                    this.state.selected = null; // Unselect -> Return to Default (Prev Gen)
                } else {
                    this.state.selected = item;
                }
            }
            this.renderStrip(false);
            this.updateDisplay();
            if (this.toggles.params?.classList.contains("active")) this.renderDrawer();
        };

        this.strip.ondblclick = (e) => {
            const t = e.target.closest(".h4-thumb");
            if (!t) return;
            const item = this.state.history.find(h => String(h.timestamp) === String(t.dataset.ts));
            if (item) this.openLightbox(item);
        };

        this.strip.oncontextmenu = (e) => {
            const t = e.target.closest(".h4-thumb");
            if (!t) return;
            e.preventDefault();
            const item = this.state.history.find(h => String(h.timestamp) === String(t.dataset.ts));
            if (item) {
                // LOCK LOGIC: Allow locked item to coexist with Full View for 4-Way Compare
                this.state.locked = (this.state.locked && String(this.state.locked.timestamp) === String(item.timestamp)) ? null : item;
                this.renderStrip(false);
                this.updateDisplay();
            }
        };
        this.strip.style.display = "none";
        this.frame.appendChild(this.strip);

        /**
         * SAVE DRAWER (Holy Grail Ver)
         * Beneath the filmstrip, expands node downwards.
         */
        this.saveDrawer = document.createElement("div");
        this.saveDrawer.className = "h4-save-drawer";
        this.saveContent = document.createElement("div");
        this.saveContent.className = "h4-save-content";
        this.saveDrawer.appendChild(this.saveContent);
        this.frame.appendChild(this.saveDrawer);

        this.drawer = document.createElement("div");
        this.drawer.className = "h4-drawer";
        this.drawerContent = document.createElement("div");
        this.drawerContent.className = "h4-drawer-content";
        this.drawer.appendChild(this.drawerContent);
        this.el.root.appendChild(this.drawer);

        this.renderSaveDrawer();
        this.initLightbox();
    }


    initLightbox() {
        this.lb = document.createElement("div");
        this.lb.className = "h4-lightbox";
        this.lbImg = document.createElement("img");
        this.lbImg.className = "h4-lightbox-img";
        this.lb.appendChild(this.lbImg);

        const hint = document.createElement("div");
        hint.className = "h4-lb-hint";
        hint.innerHTML = "[CTRL+CLICK]: ZOOM IN // [ALT+CLICK]: ZOOM OUT // [DRAG]: PAN";
        this.lb.appendChild(hint);

        const close = document.createElement("div");
        close.className = "h4-lb-close";
        close.textContent = "×";
        close.onclick = () => this.closeLightbox();
        this.lb.appendChild(close);

        const ctrls = document.createElement("div");
        ctrls.className = "h4-lightbox-controls";

        // View Side A/B
        this.lbBtnA = document.createElement("button");
        this.lbBtnA.className = "h4-lb-btn";
        this.lbBtnA.textContent = "VIEW A";
        this.lbBtnA.onclick = (e) => { e.stopPropagation(); this.state.lbPair = 'A'; this.updateLightboxImg(); };
        ctrls.appendChild(this.lbBtnA);

        this.lbBtnB = document.createElement("button");
        this.lbBtnB.className = "h4-lb-btn";
        this.lbBtnB.textContent = "VIEW B";
        this.lbBtnB.onclick = (e) => { e.stopPropagation(); this.state.lbPair = 'B'; this.updateLightboxImg(); };
        ctrls.appendChild(this.lbBtnB);

        // Zoom Slider
        const zoomWrap = document.createElement("div");
        zoomWrap.style.display = "flex"; zoomWrap.style.flexDirection = "column"; zoomWrap.style.alignItems = "center";

        const zoomLabel = document.createElement("div");
        zoomLabel.style.color = "#006622"; zoomLabel.style.fontSize = "8px"; zoomLabel.style.marginBottom = "5px"; zoomLabel.textContent = "MAGNIFICATION";
        zoomWrap.appendChild(zoomLabel);

        this.lbZoomSlider = document.createElement("input");
        this.lbZoomSlider.type = "range";
        this.lbZoomSlider.className = "h4-lb-zoom-slider";
        // Use logarithmic-style range for 1000x
        this.lbZoomSlider.min = "0"; this.lbZoomSlider.max = "100"; this.lbZoomSlider.step = "0.1";
        this.lbZoomSlider.value = "0";
        this.lbZoomSlider.oninput = () => {
            // Map 0-100 to 1-1000 exponentially
            const val = parseFloat(this.lbZoomSlider.value);
            this.state.lbZoom = Math.pow(1.0715, val); // ~1000 at 100
            this.updateLightboxZoom();
        };
        zoomWrap.appendChild(this.lbZoomSlider);
        ctrls.appendChild(zoomWrap);

        this.lb.appendChild(ctrls);
        document.body.appendChild(this.lb);

        // Zoom Wheel Support
        this.lb.onwheel = (e) => {
            e.preventDefault();
            const factor = e.deltaY > 0 ? 0.9 : 1.1;
            this.state.lbZoom = Math.max(1, Math.min(1000, this.state.lbZoom * factor));
            this.updateLightboxZoom();
        };

        this.lbPan = { x: 0, y: 0, ox: 0, oy: 0, dragging: false };

        this.lb.onmousedown = (e) => {
            if (e.button !== 0) return;

            // MODIFIER GATING: CTRL+Click (Zoom In), ALT+Click (Zoom Out)
            if (e.ctrlKey) {
                this.state.lbZoom = Math.min(1000, this.state.lbZoom * 1.5);
                this.updateLightboxZoom();
                return;
            }
            if (e.altKey) {
                this.state.lbZoom = Math.max(1, this.state.lbZoom / 1.5);
                this.updateLightboxZoom();
                return;
            }

            // Normal Pan (Only if zoomed in)
            if (this.state.lbZoom > 1 && !e.ctrlKey && !e.altKey) {
                this.lbPan.dragging = true;
                this.lbPan.ox = e.clientX - this.lbPan.x;
                this.lbPan.oy = e.clientY - this.lbPan.y;
                this.lb.style.cursor = "grabbing";
            }
        };

        // [H4] Unified Window Listeners managed by _setupExecutionListener and onRemoved
    }

    openLightbox(item) {
        this.activeLBItem = item;
        if (!item) return;
        // FORCE FULL RESOLUTION (No thumb flag)
        const url = this.resolveImageUrl(item, 'b', false);
        this.lbImg.src = url;
        this.state.lbZoom = 1;
        this.state.lbPair = 'A';
        this.lbPan = { x: 0, y: 0, ox: 0, oy: 0, dragging: false };
        this.updateLightboxImg();
        this.updateLightboxZoom();
        this.lb.classList.add("open");
    }

    closeLightbox() {
        this.lb.classList.remove("open");
        // [H4] Force VRAM Flush
        this.lbImg.src = "";
        this.lbImg.removeAttribute("src");
    }

    updateLightboxImg() {
        if (!this.activeLBItem) return;
        this.lbImg.src = this.resolveImageUrl(this.activeLBItem, this.state.lbPair.toLowerCase());
        this.lbBtnA.classList.toggle("active", this.state.lbPair === 'A');
        this.lbBtnB.classList.toggle("active", this.state.lbPair === 'B');
    }

    updateLightboxZoom() {
        if (this.state.lbZoom <= 1.01) {
            this.lbPan.x = 0; this.lbPan.y = 0;
            this.state.lbZoom = 1;
        }
        this.lbImg.style.transform = `translate(${this.lbPan.x}px, ${this.lbPan.y}px) scale(${this.state.lbZoom})`;
        if (this.lbZoomSlider) {
            const sliderVal = Math.log(this.state.lbZoom) / Math.log(1.0715);
            this.lbZoomSlider.value = sliderVal;
        }
    }


    createImageLayer(z) {
        const img = document.createElement("img");
        img.className = "h4-img-layer";
        img.style.zIndex = z;
        return img;
    }

    createLabel(txt, t, l, r = "auto", b = "auto") {
        const d = document.createElement("div");
        d.className = "h4-pane-label";
        d.textContent = txt;
        d.style.top = t; d.style.left = l; d.style.right = r; d.style.bottom = b;
        return d;
    }

    createToggle(label, callback, cls = "") {
        const w = document.createElement("div");
        w.className = `h4-toggle-wrap ${cls}`;
        const p = document.createElement("div"); p.className = "h4-toggle-pill";
        const k = document.createElement("div"); k.className = "h4-toggle-knob";
        p.appendChild(k);
        const l = document.createElement("div"); l.className = "h4-toggle-label";
        l.textContent = label;
        w.appendChild(p); w.appendChild(l);
        w.onclick = (e) => {
            e.stopPropagation();
            const active = !w.classList.contains("active");
            w.classList.toggle("active", active);
            callback(active);
        };
        return w;
    }

    resolveImageUrl(item, channel = 'b', thumb = false) {
        if (!item) return "";
        const fn = (channel === 'a') ? (item.filename_a || item.filename_b) : item.filename_b;
        if (!fn) return "";

        if (item.source === "vault" || item.vault_folder) {
            let rel = (channel === 'a') ? (item.relative_path_a || item.relative_path_b) : item.relative_path_b;
            if (!rel) return "";
            rel = rel.replace(/\\/g, '/');
            // Vault images are already small/optimized WebP files. Load them directly to prevent 404s on the thumbnail API.
            return `/h4/comparinator/image?filename=${encodeURIComponent(rel)}`;
        }

        const t = item.timestamp || Date.now();
        const sub = item.subfolder || "";
        const type = item.type || (item.source === "temp_recovery" ? "temp" : "output");

        if (thumb) {
            return api.apiURL(`/h4/thumbnail?filename=${encodeURIComponent(fn)}&subfolder=${encodeURIComponent(sub)}&type=${type}`);
        }

        return `/view?filename=${encodeURIComponent(fn)}&type=${type}&subfolder=${encodeURIComponent(sub)}&t=${t}`;
    }

    bindEvents() {
        // [H4] Sync with server-side vault updates
        api.addEventListener("h4.comparinator.update", (e) => {
            if (String(e.detail.node_id) === String(this.node.id)) this.updatePayload(e.detail);
        });

        // STAGE INTERACTION: Sliders & Reticle
        this.stage.addEventListener("mousemove", (e) => this.handleMouseMove(e));

        // MOUSE DOWN: Start manipulation (standard Comfy pattern)
        this.stage.onmousedown = (e) => {
            if (e.button !== 0) return;
            this.handleMouseMove(e);
        };
    }

    handleKey(e) {
        if (!this.node) return;
        if (e.key === "b" || e.key === "B") {
            const isDown = (e.type === 'keydown');
            if (this.state.blink !== isDown) {
                this.state.blink = isDown;
                this.updateDisplay();
            }
        }
    }

    triggerFlicker() {
        if (!this.el?.root) return;
        const root = this.el.root;
        root.style.filter = "brightness(1.5) contrast(1.2) hue-rotate(10deg)";
        root.style.opacity = "0.7";
        setTimeout(() => {
            if (root) {
                root.style.filter = "none";
                root.style.opacity = "1";
            }
        }, 80);
    }


    handleMouseMove(e) {
        if (!this.node) return;
        const rect = this.stage.getBoundingClientRect();
        const canvasScale = app.canvas?.ds?.scale || 1;
        const stageW = rect.width / canvasScale;
        const stageH = rect.height / canvasScale;

        // Stage-relative unscaled coordinates
        const x = (e.clientX - rect.left) / canvasScale;
        const y = (e.clientY - rect.top) / canvasScale;

        if (this.state.inspect) {
            const paneW = stageW / 2;
            let rx = x;
            let ry = y;

            // Target Pane 1 (Navigator)
            if (this.state.reticleLocked) {
                rx = parseFloat(this.reticle.style.left) || paneW / 2;
                ry = parseFloat(this.reticle.style.top) || stageH / 2;
                this.updateReticle();
            } else {
                rx = Math.max(0, Math.min(paneW, x));
                ry = Math.max(0, Math.min(stageH, y));
                if (!this.state._reticleAnimId) {
                    this.state._reticleAnimId = requestAnimationFrame(() => {
                        this.reticle.style.left = `${rx}px`;
                        this.reticle.style.top = `${ry}px`;
                        this.updateReticle();
                        this.state._reticleAnimId = null;
                    });
                }
            }

            return;
        }

        if (this.state.sliderLocked) return;

        // --- MODE: HISTORIES (Dual Pane Sliders) ---
        if (this.state.historyMode) {
            const halfW = stageW / 2;
            if (x <= halfW) {
                const val = (x / halfW) * 100;
                this.state.sliderX = Math.max(0, Math.min(100, val));
            } else {
                const relativeX = x - halfW;
                const valX = (relativeX / halfW) * 100;
                this.state.sliderX2 = Math.max(0, Math.min(100, valX));

                // Vert Slider for Pane 2
                const valY = (y / stageH) * 100;
                this.state.sliderY = Math.max(0, Math.min(100, valY));
            }
            this.updateDisplay();
            return;
        }

        // --- MODE: DEFAULT (One Pane Slider - Full Width) ---
        const val = (x / stageW) * 100;
        this.state.sliderX = Math.max(0, Math.min(100, val));
        this.updateDisplay();
    }

    updateReticle() {
        if (!this.state.inspect) return;

        // Safety guard
        const lB = this.layers?.liveB;
        if (!lB) return;
        const z = this.state.inspectZoom || 1;

        // Reticle's CSS left/top is the source of truth for position
        const rect = this.stage.getBoundingClientRect();
        const canvasScale = app.canvas?.ds?.scale || 1;
        const paneW = (rect.width / canvasScale) / 2;
        const paneH = rect.height / canvasScale;

        let rx = parseFloat(this.reticle.style.left);
        let ry = parseFloat(this.reticle.style.top);

        if (isNaN(rx)) rx = paneW / 2;
        if (isNaN(ry)) ry = paneH / 2;

        const pctX = (rx / paneW) * 100;
        const pctY = (ry / paneH) * 100;

        // --- SMART COORDINATES & CENTERING MAGNIFIER ---
        // 1. Calculate Pane Dimensions
        const cx = paneW / 2;
        const cy = paneH / 2;

        let coordStr = `REL: ${Math.round(pctX)}% ${Math.round(pctY)}%`;

        if (lB.naturalWidth && lB.naturalHeight) {
            const nw = lB.naturalWidth;
            const nh = lB.naturalHeight;
            const aspect = nw / nh;
            const stageAspect = paneW / paneH;

            let dw, dh, ox = 0, oy = 0;
            if (aspect > stageAspect) {
                dw = paneW;
                dh = paneW / aspect;
                oy = (paneH - dh) / 2;
            } else {
                dh = paneH;
                dw = paneH * aspect;
                ox = (paneW - dw) / 2;
            }

            // Image-Space Mapping
            const imgX = Math.max(0, Math.min(nw, (rx - ox) / dw * nw));
            const imgY = Math.max(0, Math.min(nh, (ry - oy) / dh * nh));
            coordStr = `PX [ ${Math.round(imgX)}, ${Math.round(imgY)} ]`;
        }

        // 2. INVARIANT ZOOM TRANSFORM (Forensic Stability Lock)
        // [H4] We use a centering weight to prevent the image from 'sliding' around at 
        // 1x zoom (which feels slippery). As z increases, we smoothly ramp up to 
        // full reticle targeting.
        const stabilityWeight = Math.min(1, Math.max(0, (z - 1) * 2)); // Full lock reached by 1.5x
        const tx = (cx / z - rx) * stabilityWeight;
        const ty = (cy / z - ry) * stabilityWeight;

        lB.style.width = "100%";
        lB.style.height = "100%";
        lB.style.left = "0";
        lB.style.top = "0";
        lB.style.transformOrigin = "0 0";
        lB.style.transform = `scale(${z}) translate(${tx}px, ${ty}px)`;

        // 3. Sync HUD
        if (this.reticleZoomLabel) this.reticleZoomLabel.textContent = (z < 10) ? `${z.toFixed(1)}x` : `${Math.round(z)}x`;
        if (this.inspectSlider) this.inspectSlider.value = String(z);
    }

    /**
     * Smooth zoom animation loop using requestAnimationFrame.
     * Lerps inspectZoom toward _inspectZoomTarget at 60fps.
     * DIRECTLY applies transform to liveB instead of going through
     * updateReticle() — which fails because updateDisplay() resets
     * liveB.style.display to 'none' during its reset loop.
     */
    _startZoomAnim() {
        if (this.state._zoomAnimId) return; // Already running

        const tick = () => {
            if (!this.state.inspect) {
                this.state._zoomAnimId = null;
                return; // Bail if inspect mode was turned off
            }

            const target = this.state._inspectZoomTarget;
            const current = this.state.inspectZoom;
            const diff = Math.abs(target - current);

            // Lerp factor: 25% per frame for snappy but smooth convergence
            const lerpFactor = 0.25;

            if (diff < 0.01) {
                // Close enough — snap to target and stop animating
                this.state.inspectZoom = target;
                this._applyZoomDirect(target);
                this.state._zoomAnimId = null;
                return;
            }

            // Interpolate toward target
            const newZoom = current + (target - current) * lerpFactor;
            this.state.inspectZoom = newZoom;
            this._applyZoomDirect(newZoom);

            // Continue animation
            this.state._zoomAnimId = requestAnimationFrame(tick);
        };

        this.state._zoomAnimId = requestAnimationFrame(tick);
    }

    /**
     * Directly apply a zoom level to liveB without going through updateReticle().
     * Uses stored _lastPctX/_lastPctY for transform origin so it works
     * even when the mouse isn't moving.
     */
    _applyZoomDirect(z) {
        // [H4] Unified Zoom Logic: Delegate to the high-precision matrix transform kernel
        this.updateReticle();

        // Sync HUD Slider
        if (this.inspectSlider) this.inspectSlider.value = String(z);
    }

    updatePayload(data) {
        if (data.current) {
            // [H4] New Generation: Revert to Live Monitoring
            this.state.live = data.current;
            this.state.selected = null;
            this.state.otherB = null;
            this.state.selYellow = null;

            this.crawlParameters();
        }
        if (data.history) {
            this.state.history = data.history;
            this.renderStrip(true);
        }
        this.updateDisplay();
    }

    updateDisplay() {
        if (!this.node) return;

        /**
         * [H4 - AUDIT - Phase FINAL]
         * V3.0 RENDER ENGINE
         * Pane Logic:
         * 1. One Pane (Default): liveA vs liveB @ 100% Width
         * 2. Dual Pane (Histories/Inspect): Pane 1 (Left) vs Pane 2 (Right) @ 50/50
         */

        // 1. ATOMIC RESET
        Object.values(this.layers).forEach(l => {
            l.style.display = "none";
            l.style.clipPath = "none";
            l.style.width = "100%"; l.style.height = "100%";
            l.style.left = "0%"; l.style.top = "0%";
            if (!this.state.inspect) l.style.transform = "none";
        });
        Object.values(this.labels).forEach(l => l.style.display = "none");
        this.sliderX.style.display = "none";
        this.sliderX2.style.display = "none";
        this.sliderY.style.display = "none";
        this.hudWrap.style.display = "none";
        this.reticle.style.display = "none";
        this.stage.style.cursor = "default";
        this.grids.nav.classList.remove("active");
        this.grids.mag.classList.remove("active");

        if (this.state.inspect) {
            this.stage.style.cursor = "none";
            this.hudWrap.style.display = "flex";
            this.reticle.style.display = "block";

            const current = this.state.selected || this.state.live || (this.state.history && this.state.history[0]);
            if (current) {
                const url = this.resolveImageUrl(current, (this.state.inspect_channel || "A").toLowerCase());

                this.pane1Wrap.style.display = "block";
                this.pane2Wrap.style.display = "block";

                // Anchor images to forensic wrappers
                if (this.layers.liveA.parentNode !== this.pane1Wrap) this.pane1Wrap.appendChild(this.layers.liveA);
                if (this.layers.liveB.parentNode !== this.pane2Wrap) this.pane2Wrap.appendChild(this.layers.liveB);

                this.layers.liveA.style.display = "block";
                this.layers.liveA.src = url;
                this.layers.liveA.style.width = "100%";
                this.layers.liveA.style.left = "0%";

                this.layers.liveB.style.display = "block";
                this.layers.liveB.src = url;

                this.updateReticle();
            }
            return;
        }

        // Return targets to stage if leaving Inspectinator
        if (this.pane1Wrap && this.pane1Wrap.style.display !== "none") {
            this.pane1Wrap.style.display = "none";
            this.pane2Wrap.style.display = "none";
            this.stage.appendChild(this.layers.liveA);
            this.stage.appendChild(this.layers.liveB);

            // Reset base positioning
            this.layers.liveA.style.width = "100%";
            this.layers.liveA.style.height = "100%";
            this.layers.liveB.style.width = "100%";
            this.layers.liveB.style.height = "100%";
        }

        // --- MODE B: HISTORIES (Comparison Split) ---
        if (this.state.historyMode) {
            const h = this.state.history || [];
            const liveA = this.state.live;
            const liveB = this.state.locked || (h[0] && h[0] !== liveA ? h[0] : h[1]);

            // [H4] Lane Assignments
            const g = this.state.selected;     // GREEN
            const r = this.state.otherB;       // RED
            const y = this.state.selYellow;    // YELLOW
            const l = this.state.locked;       // BLUE (Locked)

            // Default: Show prior gen in Pane 2 if no manual selection
            const prior = (h[0] === liveA ? h[1] : h[0]) || null;
            const activeG = g || prior;

            const x1 = this.state.sliderX;
            const x2 = this.state.sliderX2;
            const y1 = this.state.sliderY;

            // 1. PANE 1: Navigator (Live Compare)
            if (liveA) {
                this.layers.liveA.style.display = "block";
                this.layers.liveA.src = this.resolveImageUrl(liveA, 'a');
                this.layers.liveA.style.width = "50%";
                this.layers.liveA.style.clipPath = `inset(0% ${100 - x1}% 0% 0%)`;

                this.layers.liveB.style.display = "block";
                this.layers.liveB.src = this.resolveImageUrl(liveB, 'b');
                this.layers.liveB.style.width = "50%";
                this.layers.liveB.style.clipPath = `inset(0% 0% 0% ${x1}%)`;

                this.sliderX.style.display = "block";
                this.sliderX.style.left = `${x1 / 2}%`;
                this.labels.liveA.style.display = "block";
                this.labels.liveB.style.display = "block";
                this.labels.liveA.style.left = "5px";
                this.labels.liveB.style.right = "calc(50% + 5px)";
            }

            // 2. PANE 2: Historian (4-Way Matrix)
            const activeCount = [activeG, r, y, l].filter(Boolean).length;

            if (activeCount === 1) {
                const target = activeG || r || y || l;
                this.layers.histC.style.display = "block";
                this.layers.histC.src = this.resolveImageUrl(target, 'b');
                this.layers.histC.style.width = "50%";
                this.layers.histC.style.left = "50%";
                this.layers.histC.style.clipPath = "none";
                this.labels.histC.style.display = "block";
                this.labels.histC.style.left = "calc(50% + 5px)";
                this.labels.histC.style.top = "5px";
            } else {
                // Adaptive Tiling
                if (activeG) {
                    this.layers.histC.style.display = "block";
                    this.layers.histC.src = this.resolveImageUrl(activeG, 'b');
                    this.layers.histC.style.width = "50%";
                    this.layers.histC.style.left = "50%";
                    this.layers.histC.style.clipPath = (r || y || l) ? `inset(0% ${100 - x2}% ${100 - y1}% 0%)` : "none";

                    this.labels.histC.style.display = "block";
                    this.labels.histC.style.left = "calc(50% + 5px)";
                    this.labels.histC.style.top = "5px";
                    this.labels.histC.style.bottom = "auto";
                    this.labels.histC.style.transform = "none";
                }
                if (r) {
                    this.layers.histB.style.display = "block";
                    this.layers.histB.src = this.resolveImageUrl(r, 'b');
                    this.layers.histB.style.width = "50%";
                    this.layers.histB.style.left = "50%";
                    this.layers.histB.style.clipPath = `inset(0% 0% ${100 - y1}% ${x2}%)`;
                    this.labels.histB.style.display = "block";
                    this.labels.histB.style.right = "5px";
                    this.labels.histB.style.top = "5px";
                    this.labels.histB.style.bottom = "auto";
                }
                if (y) {
                    this.layers.histA.style.display = "block";
                    this.layers.histA.src = this.resolveImageUrl(y, 'b');
                    this.layers.histA.style.width = "50%";
                    this.layers.histA.style.left = "50%";
                    this.layers.histA.style.clipPath = l ? `inset(${y1}% ${100 - x2}% 0% 0%)` : `inset(${y1}% 0% 0% 0%)`;
                    this.labels.histA.style.display = "block";
                    this.labels.histA.style.left = "calc(50% + 5px)";
                    this.labels.histA.style.top = "auto";
                    this.labels.histA.style.bottom = "5px";
                }
                if (l) {
                    this.layers.histD.style.display = "block";
                    this.layers.histD.src = this.resolveImageUrl(l, 'b');
                    this.layers.histD.style.width = "50%";
                    this.layers.histD.style.left = "50%";
                    this.layers.histD.style.zIndex = 25;
                    this.layers.histD.style.clipPath = `inset(${y1}% 0% 0% ${x2}%)`;

                    this.labels.histD.style.display = "block";
                    this.labels.histD.style.right = "5px";
                    this.labels.histD.style.top = "auto";
                    this.labels.histD.style.bottom = "5px";
                    this.sliderY.style.display = "block";
                    this.sliderY.style.left = "50%";
                    this.sliderY.style.width = "50%";
                    this.sliderY.style.top = `${y1}%`;
                    this.sliderX2.style.display = "block";
                    this.sliderX2.style.left = `${50 + (x2 / 2)}%`;
                }
            }
            return;
        }

        // --- MODE C: DEFAULT (Navigator Compare) ---
        const main = this.state.selected || this.state.live || (this.state.history && this.state.history[0]);
        if (!main) return;
        const ref = this.state.locked || this.state.selected;
        const x = this.state.blink ? 100 : this.state.sliderX;

        this.layers.liveA.style.display = "block";
        this.layers.liveA.src = this.resolveImageUrl(main, 'a');
        this.layers.liveA.style.width = "100%";
        this.layers.liveA.style.height = "100%";
        this.layers.liveA.style.left = "0%";
        this.layers.liveA.style.top = "0%";
        this.layers.liveA.style.clipPath = `inset(0% ${100 - x}% 0% 0%)`;

        this.layers.liveB.style.display = "block";
        this.layers.liveB.src = ref ? this.resolveImageUrl(ref, 'b') : this.resolveImageUrl(main, 'b');
        this.layers.liveB.style.width = "100%";
        this.layers.liveB.style.height = "100%";
        this.layers.liveB.style.left = "0%";
        this.layers.liveB.style.top = "0%";
        this.layers.liveB.style.clipPath = `inset(0% 0% 0% ${x}%)`;

        this.sliderX.style.display = "block";
        this.sliderX.style.left = `${x}%`;

        this.labels.liveA.style.display = "block";
        this.labels.liveB.style.display = "block";
        this.labels.liveA.style.left = "5px";
        this.labels.liveB.style.right = "5px";
        this.labels.liveA.style.top = "5px";
        this.labels.liveA.style.bottom = "auto";
        this.labels.liveB.style.top = "5px";
        this.labels.liveB.style.bottom = "auto";
    }

    renderStrip(forceFull = false) {
        if (!this.strip) return;

        const historyItems = this.state.history || [];

        // 1. Structural Check
        if (historyItems.length === 0) {
            this.strip.innerHTML = "<div style='color:#444; font-size:10px; padding:10px; font-style:italic;'>[ VAULT EMPTY / WAITING FOR GENERATION ]</div>";
            return;
        }

        // Clear empty state message if it exists
        if (this.strip.querySelector("div[style*='italic']")) {
            this.strip.innerHTML = "";
        }

        // Map existing elements for delta-rendering
        const existingThumbs = Array.from(this.strip.querySelectorAll('.h4-thumb'));
        const existingMap = new Map();
        existingThumbs.forEach(t => existingMap.set(String(t.dataset.ts), t));

        // Create new fragments needed and order them
        const newOrder = [];

        historyItems.forEach((item) => {
            const ts = String(item.timestamp);
            if (existingMap.has(ts)) {
                newOrder.push(existingMap.get(ts));
                existingMap.delete(ts);
            } else {
                const t = document.createElement("div");
                t.className = "h4-thumb";
                t.dataset.ts = item.timestamp;

                const sideA = document.createElement("div");
                sideA.className = "h4-thumb-side h4-thumb-a";
                sideA.style.backgroundImage = `url("${this.resolveImageUrl(item, 'a', true)}")`;

                const sideB = document.createElement("div");
                sideB.className = "h4-thumb-side h4-thumb-b";
                sideB.style.backgroundImage = `url("${this.resolveImageUrl(item, 'b', true)}")`;

                t.appendChild(sideA);
                t.appendChild(sideB);

                t.draggable = true;
                t.ondragstart = (e) => {
                    const url = this.resolveImageUrl(item, 'b', false);
                    e.dataTransfer.setData("text/plain", url);
                };

                // --- INTERACTION ENGINE: TRI-STATE SELECTION ---
                t.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.shiftKey) {
                        // SHIFT+LEFT CLICK: Toggle PANE 1 LOCK (Static Image B)
                        const isLocked = this.state.locked && String(this.state.locked.timestamp) === String(item.timestamp);
                        this.state.locked = isLocked ? null : item;
                    } else {
                        // LEFT CLICK CYCLE: GREEN -> RED -> YELLOW -> OFF
                        // [H4] Forward Cycle for initial selection, Backwards for replacement
                        const isG = (this.state.selected && String(this.state.selected.timestamp) === String(item.timestamp));
                        const isR = (this.state.otherB && String(this.state.otherB.timestamp) === String(item.timestamp));
                        const isY = (this.state.selYellow && String(this.state.selYellow.timestamp) === String(item.timestamp));

                        if (isG) {
                            this.state.selected = null;
                            this.state.otherB = item;
                        } else if (isR) {
                            this.state.otherB = null;
                            this.state.selYellow = item;
                        } else if (isY) {
                            this.state.selYellow = null;
                        } else {
                            // Set next available color
                            if (!this.state.selected) this.state.selected = item;
                            else if (!this.state.otherB) this.state.otherB = item;
                            else if (!this.state.selYellow) this.state.selYellow = item;
                        }
                    }
                    this.renderStrip(true);
                    this.updateDisplay();
                    if (this.toggles.params?.classList.contains("active")) this.renderDrawer();
                };

                t.oncontextmenu = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    // Global Clear Selections
                    this.state.selected = null;
                    this.state.otherB = null;
                    this.state.selYellow = null;
                    this.state.locked = null;
                    this.renderStrip(true);
                    this.updateDisplay();
                    return false;
                };
                newOrder.push(t);
            }
        });

        // Prune DOM elements removed from history
        existingMap.forEach(t => t.remove());

        // Ensure DOM ordering without flicker
        newOrder.forEach((node, idx) => {
            if (this.strip.children[idx] !== node) {
                this.strip.insertBefore(node, this.strip.children[idx]);
            }
        });

        // 2. TRI-STATE HIGHLIGHTS
        const thumbs = this.strip.querySelectorAll('.h4-thumb');
        thumbs.forEach((t) => {
            const ts = String(t.dataset.ts);

            const isG = (this.state.selected && String(this.state.selected.timestamp) === ts);
            const isR = (this.state.otherB && String(this.state.otherB.timestamp) === ts);
            const isY = (this.state.selYellow && String(this.state.selYellow.timestamp) === ts);
            const isL = (this.state.locked && String(this.state.locked.timestamp) === ts);

            t.classList.toggle("sel-green", !!isG);
            t.classList.toggle("sel-red", !!isR);
            t.classList.toggle("sel-yellow", !!isY);
            t.classList.toggle("is-locked", !!isL);
        });
    }

    async fetchHistory() {
        try {
            const resp = await api.fetchApi("/h4/comparinator/history");
            if (!resp.ok) throw new Error(`HTTP Error: ${resp.status} `);
            const history = await resp.json();

            if (!Array.isArray(history)) return;

            // SMART SYNC: Only re-render if count or latest timestamp changed
            const latestNew = history[0] ? String(history[0].timestamp) : null;
            const latestOld = (this.state.history && this.state.history[0]) ? String(this.state.history[0].timestamp) : null;
            const changed = history.length !== (this.state.history?.length || 0) || latestNew !== latestOld;

            this.state.history = history.slice(0, 25); // [H4] Sync with Vault 25-limit
            if (changed) {
                console.log(`[H4 Comparinator] History sync: ${history.length} items detected.`);
                this.renderStrip(true);
                // FORCE UPDATE on startup to populate panes even if live is null
                this.updateDisplay();
            }
        } catch (e) {
            console.error("[H4 Comparinator] Nuclear Sync Failure:", e);
        }
    }

    /**
     * RECURSIVE CRAWLER
     * Start at current node, crawl Image A, then Image B.
     */
    async crawlParameters() {
        this.state.parameters = { A: [], B: [] };

        const traceInput = (name) => {
            const input = this.node.inputs.find(i => i.name === name);
            if (!input || input.link === null) return [];
            const startNode = app.graph.getNodeById(app.graph.links[input.link].origin_id);
            return this.traceUpstream(startNode);
        };

        this.state.parameters.A = traceInput("image_a");
        this.state.parameters.B = traceInput("image_b");

        if (this.toggles.params.classList.contains("active")) this.renderDrawer();
    }

    traceUpstream(node, visited = new Set(), found = []) {
        if (!node || visited.has(node.id)) return found;
        visited.add(node.id);

        const whitelist = [
            "seed", "steps", "cfg", "sampler_name", "scheduler", "denoise",
            "ckpt_name", "model_name", "clip_skip", "vae_name", "lora_name",
            "text", "width", "height", "upscale_by",
            "strength_model", "strength_clip", "stop_at_clip_layer"
        ];

        // DATA CAPTURE: Check ANY node for whitelisted widgets
        // This is robust against custom node types (UniversalLoader, Pipe nodes, etc.)
        if (node.widgets) {
            const data = { type: node.type, name: node.title || node.type, widgets: {} };
            let hasData = false;

            node.widgets.forEach(w => {
                const k = w.name.toLowerCase();
                const matched = whitelist.find(key => k.includes(key));
                if (matched) {
                    let val = w.value;
                    // Normalize filenames
                    if (typeof val === "string" && (val.includes("\\") || val.includes("/"))) {
                        val = val.split(/[\\/]/).pop();
                    }

                    // Key Normalization
                    let safeKey = w.name;
                    if (k.includes("stop_at_clip_layer")) safeKey = "clip_skip";

                    data.widgets[safeKey] = val;
                    hasData = true;
                }
            });

            if (hasData) found.push(data);
        }

        // RECURSE
        node.inputs?.forEach(inp => {
            if (inp.link !== null) {
                const link = app.graph.links[inp.link];
                if (link) {
                    const origin = app.graph.getNodeById(link.origin_id);
                    this.traceUpstream(origin, visited, found);
                }
            }
        });

        return found;
    }

    renderDrawer() {
        const content = this.drawerContent;
        content.innerHTML = `<h2 style='color:#00ff44; margin-bottom:20px; border-bottom:1px solid #333; padding-bottom:10px; font-size:14px; letter-spacing:2px;'>PARAMETERS</h2>`;

        // ── DISPLAY ORDER & CONFIG ──
        // Keys match vault constraints. 'type' controls rendering style.
        const PARAM_CONFIG = [
            // MODEL SECTION
            { key: "ckpt_name", label: "CHECKPOINT", type: "string" },
            { key: "vae_name", label: "VAE", type: "string" },
            { key: "lora_name", label: "LORA", type: "string" },
            { key: "clip_skip", label: "CLIP SKIP", type: "number" },

            // GENERATION SECTION
            { key: "seed", label: "SEED", type: "number" },
            { key: "steps", label: "STEPS", type: "number" },
            { key: "cfg", label: "CFG", type: "number" },
            { key: "sampler_name", label: "SAMPLER", type: "string" },
            { key: "scheduler", label: "SCHEDULER", type: "string" },
            { key: "denoise", label: "DENOISE", type: "number" },

            // PROMPT SECTION (Full Width)
            { key: "positive", label: "POSITIVE", type: "text_block", color: "#00ff88" },
            { key: "negative", label: "NEGATIVE", type: "text_block", color: "#ff4444" }
        ];

        // ── Convert Vault meta (flat object) into a display-friendly block array ──
        const vaultMetaToBlocks = (metaObj) => {
            if (!metaObj || typeof metaObj !== "object") return [];
            const widgets = {};

            // 1. Text/Num Fields
            PARAM_CONFIG.forEach(p => {
                if (metaObj[p.key] !== undefined && metaObj[p.key] !== null) {
                    let val = metaObj[p.key];
                    // Clean up filenames
                    if (typeof val === "string" && (val.includes("\\") || val.includes("/"))) {
                        val = val.split(/[\\/]/).pop();
                    }
                    widgets[p.key] = val;
                }
            });

            // 2. LoRAs (Array handling)
            if (Array.isArray(metaObj.loras) && metaObj.loras.length > 0) {
                widgets["lora_name"] = metaObj.loras.map(l => {
                    const name = (l.name || l).toString().split(/[\\/]/).pop();
                    const str = l.strength !== undefined ? l.strength : (l.model_strength || "?");
                    return `<span style='color:#ccc'>${name}</span> <span style='color:#aaa; font-size:9px'>(${str})</span>`;
                }).join("<br>"); // Stack LoRAs vertically
            }

            if (Object.keys(widgets).length === 0) return [];
            return [{ name: "Generation Parameters", widgets }];
        };

        // ── Determine data source ──
        const selectedItem = this.state.selected;
        // Check for metadata in two places: meta.A (Runtime) or root.A (Vault)
        const metaSource = selectedItem?.meta || selectedItem;
        const hasStoredParams = metaSource && (metaSource.A || metaSource.B);

        let dataA, dataB;

        if (hasStoredParams) {
            // SOURCE: Vault JSON
            dataA = vaultMetaToBlocks(metaSource.A);
            dataB = vaultMetaToBlocks(metaSource.B);
        } else {
            // SOURCE: Graph Crawl (Live)
            // Filter graph-crawl blocks to only include the required params
            const filterBlock = (block) => {
                const filtered = {};

                // 1. Handle LoRA specifically (Merging Strength)
                const loraKey = Object.keys(block.widgets).find(k => k.toLowerCase().includes("lora_name"));
                if (loraKey) {
                    const name = block.widgets[loraKey];
                    // Find strength in same block
                    const strKey = Object.keys(block.widgets).find(k => k.toLowerCase().includes("strength_model"));
                    const strength = strKey ? block.widgets[strKey] : "?";

                    filtered["lora_name"] = `<span style='color:#ccc'>${name}</span> <span style='color:#aaa; font-size:9px'>(${strength})</span>`;
                }

                // 2. Handle others
                PARAM_CONFIG.forEach(p => {
                    if (p.key === "lora_name") return; // Handled above

                    // Fuzzy match widget keys
                    const match = Object.keys(block.widgets).find(k => k.toLowerCase().includes(p.key));
                    if (match && block.widgets[match] !== undefined) {
                        filtered[p.key] = block.widgets[match];
                    }
                });

                if (Object.keys(filtered).length === 0) return null;
                return { name: block.name, widgets: filtered };
            };
            dataA = (this.state.parameters.A || []).map(filterBlock).filter(Boolean);
            dataB = (this.state.parameters.B || []).map(filterBlock).filter(Boolean);
        }

        // ── Render Function ──
        const renderSet = (title, data) => {
            const section = document.createElement("div");
            section.style.marginBottom = "30px";
            section.innerHTML = `<div style='text-transform:uppercase; font-size:9px; color:#555; margin-bottom:12px; letter-spacing:1px;'>// ${title}</div>`;

            if (!data || data.length === 0) {
                section.innerHTML += `<div style='color:#333; font-style:italic; font-size:10px;'>[ NO PARAMETERS FOUND ]</div>`;
            }

            data.forEach((block) => {
                const div = document.createElement("div");
                div.className = "h4-param-block";

                // Header
                const hdr = document.createElement("div");
                hdr.className = "h4-param-header";
                hdr.style.cursor = "pointer";
                hdr.innerHTML = `<span style='color:#00ff88'>${block.name}</span> <span style='float:right;'>+</span>`;

                const list = document.createElement("div");
                list.className = "h4-param-list";
                list.style.display = "none";
                list.style.padding = "10px";
                list.style.borderTop = "1px solid rgba(0,255,136,0.1)";

                // Render Loop
                PARAM_CONFIG.forEach(p => {
                    let val = block.widgets[p.key];
                    if (val === undefined) {
                        // Value fallback: try to find key in widgets
                        const fuzzy = Object.keys(block.widgets).find(k => k.toLowerCase().includes(p.key));
                        if (fuzzy) val = block.widgets[fuzzy];
                    }
                    if (val === undefined || val === null || val === "" || val === "unknown") return;

                    // STYLE: Text Block (Prompts)
                    if (p.type === "text_block") {
                        const row = document.createElement("div");
                        row.style.marginTop = "8px";
                        row.style.marginBottom = "12px";
                        row.innerHTML = `
                             <div style='font-size:8px; color:${p.color}; text-transform:uppercase; margin-bottom:4px;'>${p.label}</div>
                             <div style='font-size:10px; color:#ccc; line-height:1.4; background:rgba(0,0,0,0.2); padding:6px; border-radius:4px; white-space:pre-wrap;'>${val}</div>
                         `;
                        list.appendChild(row);
                    }
                    // STYLE: Key-Value Row
                    else {
                        const row = document.createElement("div");
                        row.style.display = "flex";
                        row.style.justifyContent = "space-between";
                        row.style.fontSize = "10px";
                        row.style.margin = "4px 0";
                        row.style.paddingBottom = "4px";
                        row.style.borderBottom = "1px dashed #222";

                        // Handle LoRA HTML
                        const valHtml = p.key === "lora_name" ? val : `<span style='color:#00ff44; font-family:monospace;'>${val}</span>`;

                        row.innerHTML = `<span style='color:#666; text-transform:uppercase; font-size:8px;'>${p.label}</span> 
                                         <div style='text-align:right'>${valHtml}</div>`;
                        list.appendChild(row);
                    }
                });

                hdr.onclick = () => {
                    const isOpen = list.style.display === "block";
                    list.style.display = isOpen ? "none" : "block";
                    hdr.querySelector("span:last-child").textContent = isOpen ? "+" : "-";
                };

                div.appendChild(hdr);
                div.appendChild(list);
                section.appendChild(div);
            });
            content.appendChild(section);
        };

        renderSet("IMAGE A PARAMETERS", dataA);
        renderSet("IMAGE B PARAMETERS", dataB);
    }

    renderSaveDrawer() {
        const root = this.saveContent;
        root.innerHTML = "";

        const settings = this.node.widgets.find(w => w.name === "save_settings");
        const saveModeWidget = this.node.widgets.find(w => w.name === "save_mode");
        let current = {};

        try {
            current = JSON.parse(settings.value || "{}");
        } catch (e) { }

        // SYNC: Ensure auto_save matches the actual widget state
        if (saveModeWidget) {
            current.auto_save = saveModeWidget.value;
        }

        // INITIALIZE DEFAULTS if empty
        if (Object.keys(current).length === 0) {
            current = {
                save_a: true, save_b: true, save_comp: false,
                auto_save: saveModeWidget ? saveModeWidget.value : false,
                path: "output", prefix: "h4", subpath: ""
            };
            settings.value = JSON.stringify(current);
        }

        const update = (k, v) => {
            current[k] = v;
            settings.value = JSON.stringify(current);
            this.node.setDirtyCanvas(true);

            // SYNC AUTO-SAVE WIDGET
            if (k === "auto_save" && saveModeWidget) {
                saveModeWidget.value = v;
            }
        };

        const createCheck = (label, key) => {
            const w = document.createElement("div");
            w.className = "h4-save-check-wrap";
            const c = document.createElement("div");
            c.className = "h4-save-check" + (current[key] ? " active" : "");
            const l = document.createElement("div");
            l.textContent = label;
            w.appendChild(c); w.appendChild(l);
            w.onclick = () => {
                const active = !c.classList.contains("active");
                c.classList.toggle("active", active);
                update(key, active);
                if (key === "auto_save") this.toggles.save.classList.toggle("active", active);
            };
            return w;
        };

        const createField = (label, key, placeholder) => {
            const w = document.createElement("div");
            w.className = "h4-save-field";
            const l = document.createElement("span"); l.className = "h4-save-label"; l.textContent = label;
            const i = document.createElement("input");
            i.className = "h4-save-input";
            i.value = current[key] || "";
            i.placeholder = placeholder;
            i.onchange = () => update(key, i.value);
            w.appendChild(l); w.appendChild(i);
            return w;
        };

        const left = document.createElement("div");
        left.innerHTML = `<div style='font-size:11px; color:#fff; font-weight:900; margin-bottom:15px; border-bottom:1px solid #006622;'>// SAVE TARGETS</div>`;
        left.appendChild(createCheck("Save Image A", "save_a"));
        left.appendChild(createCheck("Save Image B", "save_b"));
        left.appendChild(createCheck("Save Comparison (A/B)", "save_comp"));
        left.appendChild(createCheck("Auto-Save on Finish", "auto_save"));

        const mid = document.createElement("div");
        mid.innerHTML = `<div style='font-size:11px; color:#fff; font-weight:900; margin-bottom:15px; border-bottom:1px solid #006622;'>// METADATA OPTIONS</div>`;
        mid.appendChild(createCheck("Include Metadata", "save_meta"));
        mid.appendChild(createCheck("Include Workflow", "save_wf"));
        mid.appendChild(createCheck("Include Prompt", "save_prompt"));

        const allBtn = document.createElement("button");
        allBtn.className = "h4-save-btn";
        allBtn.style.padding = "6px";
        allBtn.style.fontSize = "9px";
        allBtn.style.background = "transparent";
        allBtn.style.border = "1px solid #006622";
        allBtn.style.clipPath = "none";
        allBtn.textContent = "[ ENABLE ALL EXTRAS ]";
        allBtn.onclick = () => {
            update("save_meta", true);
            update("save_wf", true);
            update("save_prompt", true);
            this.renderSaveDrawer();
        };
        mid.appendChild(allBtn);

        const right = document.createElement("div");
        right.innerHTML = `<div style='font-size:11px; color:#fff; font-weight:900; margin-bottom:15px; border-bottom:1px solid #006622;'>// PATH CONFIG</div>`;
        right.appendChild(createField("Filename Prefix", "prefix", "h4"));
        right.appendChild(createField("Output Folder", "path", "output"));
        right.appendChild(createField("Sub-Folder", "subpath", ""));

        const btn = document.createElement("button");
        btn.className = "h4-save-btn";
        btn.style.gridColumn = "span 3";
        btn.textContent = "SAVE CURRENT VIEW NOW";
        btn.onclick = async () => {
            btn.textContent = "SAVING...";

            // RESOLVE TARGET ITEM (The one actually being viewed/selected)
            // Priority: Selected -> Locked -> First in History -> Live
            const target = this.state.selected || this.state.locked || (this.state.history && this.state.history[0]) || this.state.live;

            const payload_target = target ? {
                filename_a: target.filename_a,
                filename_b: target.filename_b,
                source: target.source || "temp",
                relative_path_a: target.relative_path_a,
                relative_path_b: target.relative_path_b,
                extra_pnginfo: target.extra_pnginfo,
                prompt: target.prompt,
                metadata_text: target.metadata_text
            } : null;

            const res = await api.fetchApi("/h4/comparinator/save_now", {
                method: "POST",
                body: JSON.stringify({
                    node_id: this.node.id,
                    settings: current,
                    target_item: payload_target
                })
            });
            const out = await res.json();
            btn.textContent = out.success ? "✅ SAVED SUCCESSFULLY" : "❌ SAVE FAILED";
            setTimeout(() => { btn.textContent = "SAVE CURRENT VIEW NOW"; }, 2000);
        };

        root.appendChild(left);
        root.appendChild(mid);
        root.appendChild(right);
        root.appendChild(btn);
    }

    // UX SETTERS
    setInspect(v) {
        this.state.inspect = v;
        this.toggles.inspect.classList.toggle("active", v);
        this.el.root.classList.toggle("inspecting-mode", v);

        if (v) {
            // Mutual Exclusivity
            if (this.state.historyMode) {
                this.setHistoryMode(false);
            }
            this.reticle.style.display = "block";
            this.stage.style.cursor = "none";
            this.frame.classList.add("inspecting-mode");
            this.chanToggle.classList.add("visible");
            this.glitchTitle("the inspectinator");

            // Shrink labels
            this._glitchText(this.toggles.save, "SAVE");
            this._glitchText(this.toggles.history, "HIST");
            this._glitchText(this.toggles.params, "PARAMS");

            // Show Zoom Controls
            if (this.zoomControls) this.zoomControls.style.display = "flex";

            // Reset Zoom
            this.state.inspectZoom = 1.0;
            this.state._inspectZoomTarget = 1.0;
            if (this.inspectSlider) this.inspectSlider.value = "1";
            this.state.reticleLocked = false;
        } else {
            this.reticle.style.display = "none";
            this.stage.style.cursor = "default";
            this.frame.classList.remove("inspecting-mode");
            this.chanToggle.classList.remove("visible");
            this.glitchTitle("The Comparinator");

            // Restore labels
            this._glitchText(this.toggles.save, "SAVE FUNCTIONS");
            this._glitchText(this.toggles.history, "HISTORIES");
            this._glitchText(this.toggles.params, "PARAMETERS");

            if (this.zoomControls) this.zoomControls.style.display = "none";
        }

        // --- DYNAMIC GEOMETRY ---
        // Forensic mode requires extra vertical clearance for high-density HUD
        const targetH = v ? 820 : 680;
        this.smoothNodeResize(targetH);

        this.updateDisplay();
    }

    setHistoryMode(v) {
        this.state.historyMode = v;
        if (this.strip) this.strip.style.display = v ? "flex" : "none";

        if (v) {
            if (this.state.inspect) this.setInspect(false);
            this.glitchTitle("The Histories");
        } else {
            this.glitchTitle("The Comparinator");
        }
        this.updateDisplay();
    }

    glitchTitle(target) {
        // Cancel any in-flight glitch animation to prevent overlap confusion
        if (this._glitchTitleInterval) clearInterval(this._glitchTitleInterval);

        let iteration = 0;
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#$@&*^%";
        this._glitchTitleInterval = setInterval(() => {
            if (!this.node) { clearInterval(this._glitchTitleInterval); this._glitchTitleInterval = null; return; }
            this.node.title = target
                .split("")
                .map((char, index) => {
                    if (index < iteration) return target[index];
                    return chars[Math.floor(Math.random() * chars.length)];
                })
                .join("");

            if (iteration >= target.length) {
                clearInterval(this._glitchTitleInterval);
                this._glitchTitleInterval = null;
                this.node.title = target;
            }
            iteration += 1; // One character per tick for smooth reveal
            app.canvas.setDirty(true); // Repaint canvas each tick for smooth animation
        }, 20);
    }

    /**
     * Glitch-scramble a toggle button's text to a new label.
     * Same visual effect as glitchTitle() but targets an element's textContent.
     */
    _glitchText(el, target) {
        if (!el) return;
        // Target the label child inside the toggle, not the wrapper itself
        // (the wrapper contains the pill/knob DOM that must not be destroyed)
        const label = el.querySelector?.(".h4-toggle-label") || el;
        let iteration = 0;
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#$@&*^%";
        const interval = setInterval(() => {
            label.textContent = target
                .split("")
                .map((char, index) => {
                    if (index < iteration) return target[index];
                    return chars[Math.floor(Math.random() * chars.length)];
                })
                .join("");

            if (iteration >= target.length) {
                clearInterval(interval);
                label.textContent = target;
            }
            iteration += 1 / 3;
        }, 30);
    }
    setDrawer(v) {
        this.drawer.classList.toggle("open", v);
        if (v) {
            this.renderDrawer();
        }
    }
    setSave(v) {
        this.saveDrawer.classList.toggle("open", v);
        const w = this.node.widgets.find(w => w.name === "save_mode");
        if (w) w.value = v;

        // [H4] Unified Layout Preservation: The node size is now sacred.
        // The save drawer is an absolute overlay, preventing clunky expansion.
        this.node.setDirtyCanvas(true);
    }

    smoothNodeResize(targetH) {
        const startH = this.node.size[1];
        const duration = 400; // Matches CSS transition
        const startTime = performance.now();

        const animate = (time) => {
            const progress = Math.min((time - startTime) / duration, 1);
            // Matches cubic-bezier(0.19, 1, 0.22, 1) more closely for sync
            const eased = 1 - Math.pow(1 - progress, 4);
            const currentH = startH + (targetH - startH) * eased;
            this.node.setSize([this.node.size[0], currentH]);
            if (progress < 1) requestAnimationFrame(animate);
            else this.node.setSize([this.node.size[0], targetH]);
        };
        requestAnimationFrame(animate);
    }

    setReticleShape(shape) {
        this.reticle.className = `h4-reticle active shape-${shape}`;
        const btns = this.hudWrap.querySelectorAll(".h4-hud-btn");
        btns.forEach(b => b.classList.toggle("active", b.classList.contains(`shape-${shape}`)));
    }
}

app.registerExtension({
    name: "h4.Comparinator",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name === "H4_Comparinator") {
            const onCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                if (onCreated) onCreated.apply(this, arguments);
                const ui = new ComparinatorUI(this);
                this.comparinatorUI = ui;
                this.addDOMWidget("h4_holy_ui", "custom", ui.el.root, { serialize: false });
                this.setSize([720, 680]);

                // HISTORY FETCH: Rely on API events for maximum performance.
                // Manual loop removed to reduce network chatter and I/O load.

                const hider = () => {
                    if (!this.widgets) return;
                    this.widgets.forEach(w => {
                        if (["save_mode", "metadata_text", "save_settings", "timestamp", "filename_prefix", "title_text", "frozen_image"].includes(w.name)) {
                            w.type = "converted-widget";
                            w.computeSize = () => [0, -4];
                            w.hidden = true;
                        }
                    });

                    const idx = this.widgets.findIndex(w => w.name === "h4_holy_ui");
                    if (idx > 0) {
                        const [uiWidget] = this.widgets.splice(idx, 1);
                        this.widgets.unshift(uiWidget);
                    }
                };
                hider();

                const onDrawForeground = this.onDrawForeground;
                this.onDrawForeground = function (ctx) {
                    const canvas = app.canvas || this.graph?.canvas;
                    const scale = (canvas && canvas.ds) ? canvas.ds.scale : (canvas?.scale || 1);

                    if (scale < 0.35) {
                        // Suppress JS UI
                        if (ui.el.root.style.display !== "none") ui.el.root.style.display = "none";

                        const w = this.size[0];
                        const h = this.size[1];
                        const titleH = 32;

                        ctx.save();
                        ctx.globalAlpha = 1.0;
                        ctx.beginPath();
                        ctx.fillStyle = "#0c0c0c";
                        ctx.fillRect(0, -titleH, w, h + titleH);

                        ctx.strokeStyle = "rgba(0, 242, 255, 0.4)";
                        ctx.lineWidth = 4 / scale;
                        ctx.strokeRect(0, -titleH, w, h + titleH);

                        // H4 Insignia (with Glow)
                        ctx.shadowColor = "#00f2ff";
                        ctx.shadowBlur = 15;
                        ctx.fillStyle = "#00f2ff";
                        ctx.font = "900 100px Arial Black"; // Heavier font for impact
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText("H4", w / 2, (h / 2) - 30);

                        // Node Title
                        ctx.shadowBlur = 0;
                        ctx.font = "bold 24px monospace";
                        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
                        ctx.fillText("COMPARINATOR", w / 2, (h / 2) + 60);

                        // Status Line
                        ctx.font = "10px monospace";
                        ctx.fillStyle = "rgba(0, 242, 255, 0.3)";
                        ctx.fillText("TACTICAL LOD ENGINE ACTIVE", w / 2, h - 20);

                        ctx.restore();
                        return;
                    } else {
                        if (ui.el.root.style.display === "none") ui.el.root.style.display = "flex";
                    }

                    if (onDrawForeground) onDrawForeground.apply(this, arguments);
                };

                const onConfigure = this.onConfigure;
                this.onConfigure = function () {
                    if (onConfigure) onConfigure.apply(this, arguments);
                    hider();
                }

                const onExecuted = this.onExecuted;
                this.onExecuted = function () {
                    if (onExecuted) onExecuted.apply(this, arguments);
                    hider();
                };
            };
        }
    }
});
