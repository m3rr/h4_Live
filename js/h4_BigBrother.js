import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

/**
 * 👁️ h4 Big Brother v11 (Ghost in the Shell)
 * -----------------------------------------------------------------------------
 * A passive monitoring and visualization layer for ComfyUI.
 * 
 * CORE DOCTRINE:
 * 1. NO HARM: Do not patch or override ComfyUI rendering methods. 
 *             Passively observe and render on a separate layer.
 * 2. GHOST LAYER: Use a pointer-events:none canvas overlay for all visuals.
 * 3. BIG BROTHER: Monitor execution and logs passively.
 * 4. USER CONTROL: Fully integrated into ComfyUI Settings.
 */

app.registerExtension({
    name: "h4.BigBrother",

    // State Configuration
    _config: {
        enabled: true,
        monitorEnabled: true,
        debugMode: false, // [h4 DEBUG PROTOCOL] NUCLEAR debug logging toggle
        showErrorPopup: true, // Show the Death Modal on execution errors
        showGrid: true,
        wireColorSelect: "#00FF00",
        wireColorError: "#FF0000",
        gridColor: "rgba(255, 200, 0, 0.15)",
        wireStyle: "Circuit",
        showWires: true,
        wireSpacing: 1.0,
        offsetX: 0,
        offsetY: 0,
        wireOffsetY: 0
    },

    // Internal State
    _state: {}, // Will be populated from _config in setup (renamed from 'settings' to avoid ComfyUI collision)
    canvas: null,
    ctx: null,
    infectedNodes: new Set(),
    infectedLinks: new Set(),
    rafId: null,

    // Animation State
    animStart: 0,
    gridDelay: 500, // ms to wait before grid starts
    gridDuration: 1500, // ms for the wipe to complete

    async setup() {
        // [VERSION CHECK] If you see this timestamp in console, the NEW code is running
        const BUILD_TIMESTAMP = "2026-01-07T11:56:00_FIX_v3";
        console.log(`%c👁️ h4 Big Brother v11 [BUILD: ${BUILD_TIMESTAMP}] Initializing...`, "color: #00FF00; background: #000; font-size: 14px; padding: 4px;");

        // 0. Hydrate State
        this._state = { ...this._config };

        // 1. Initialize Settings
        this.registerSettings();

        // 2. Spawn the Ghost Layer
        this.createGhostLayer();

        // 3. Inject CSS for Modals
        this.injectCSS();

        // 4. Start the Surveillance Loop
        this.startLoop();

        // 5. Register Event Listeners (The Snitch)
        api.addEventListener("execution_error", (e) => this.handleError(e));
        api.addEventListener("execution_start", () => this.resetState());

        // Mark start time for animation
        this.animStart = performance.now();
    },

    registerSettings() {
        const id = "h4.ToolKit";

        app.ui.settings.addSetting({
            id: `${id}.BigBrother.Enabled`,
            name: "👁️ h4 Big Brother: Enable Overlay",
            type: "boolean",
            defaultValue: this._state.enabled,
            tooltip: "Enable the h4 Ghost Layer overlay (wires & effects).",
            onChange: (v) => { this._state.enabled = v; }
        });

        app.ui.settings.addSetting({
            id: `${id}.BigBrother.Monitor`,
            name: "👁️ h4 Big Brother: Console Monitor",
            type: "boolean",
            defaultValue: this._state.monitorEnabled,
            tooltip: "Enable verbose console logging of node execution.",
            onChange: (v) => { this._state.monitorEnabled = v; }
        });

        // [h4 DEBUG PROTOCOL] NUCLEAR debug mode toggle
        app.ui.settings.addSetting({
            id: `${id}.BigBrother.DebugMode`,
            name: "🔬 h4 DEBUG PROTOCOL: NUCLEAR Mode",
            type: "boolean",
            defaultValue: this._state.debugMode,
            tooltip: "Enable NUCLEAR-level debug logging. Outputs wire positions, slot calculations, and all internal state to console. For troubleshooting only.",
            onChange: (v) => { this._state.debugMode = v; }
        });

        // Error popup toggle
        app.ui.settings.addSetting({
            id: `${id}.BigBrother.ShowErrorPopup`,
            name: "💀 h4 Big Brother: Show Error Popup",
            type: "boolean",
            defaultValue: this._state.showErrorPopup,
            tooltip: "Show the dramatic Death Modal popup when an execution error occurs. Disable if you find it annoying - errors will still be tracked and wires will still glow red.",
            onChange: (v) => { this._state.showErrorPopup = v; }
        });

        app.ui.settings.addSetting({
            id: `${id}.WireColor.Select`,
            name: "🎨 h4 Wire: Selection Color",
            type: "text",
            defaultValue: this._state.wireColorSelect,
            tooltip: "Hex code or color name for selected wires.",
            onChange: (v) => { this._state.wireColorSelect = v; }
        });

        app.ui.settings.addSetting({
            id: `${id}.WireColor.Error`,
            name: "🎨 h4 Wire: Error Color",
            type: "text",
            defaultValue: this._state.wireColorError,
            tooltip: "Hex code or color name for error wires.",
            onChange: (v) => { this._state.wireColorError = v; }
        });

        app.ui.settings.addSetting({
            id: `${id}.Grid.Color`,
            name: "🎨 h4 Grid: Color",
            type: "text",
            defaultValue: this._state.gridColor,
            tooltip: "Start up Grid Color",
            onChange: (v) => { this._state.gridColor = v; }
        });

        // Manual Calibration for "Way Off" scenarios
        app.ui.settings.addSetting({
            id: `${id}.Calibration.X`,
            name: "🔧 h4 Calibrate: Offset X",
            type: "number",
            defaultValue: 0,
            step: 1,
            tooltip: "Manually shift the overlay horizontally (pixels).",
            onChange: (v) => { this._state.offsetX = v; }
        });

        app.ui.settings.addSetting({
            id: `${id}.Calibration.Y`,
            name: "🔧 h4 Calibrate: Global Y",
            type: "number",
            defaultValue: 0,
            step: 1,
            tooltip: "Shift the entire overlay vertically (screen pixels).",
            onChange: (v) => { this._state.offsetY = v; }
        });

        // [BB-v11] NEW: Wire Slot Offset
        app.ui.settings.addSetting({
            id: `${id}.WireOffset.Y`,
            name: "🔧 h4 Wire: Slot Offset Y",
            type: "number",
            defaultValue: 0,
            step: 1,
            tooltip: "Fine-tune wire endpoints vertically (graph units). Helpful for themes.",
            onChange: (v) => { this._state.wireOffsetY = v; }
        });

        // [BB-v11] NEW: Wire Spacing Scale (Fan Fix)
        // [BB-v11] NEW: Wire Spacing Scale (Fan Fix)
        // Changed to "text" because "number" inputs were auto-rounding to integers in some UI versions.
        app.ui.settings.addSetting({
            id: `${id}.WireSpacing`,
            name: "🔧 h4 Wire: Spacing Scale",
            type: "text",
            defaultValue: "1.00",
            tooltip: "Scale vertical distance between slots (e.g. '1.05', '1.2'). Fixes fanning/drift.",
            onChange: (v) => {
                let val = parseFloat(v);
                if (isNaN(val)) val = 1.0;
                this._state.wireSpacing = val;
            }
        });

        // [BB-v11] NEW: Wire Style Selection
        app.ui.settings.addSetting({
            id: `${id}.WireStyle`,
            name: "👁️ BB: Wire Style",
            type: "combo",
            options: [
                { value: "Match", text: "Match ComfyUI" },
                { value: "Spline", text: "Spline (Bezier)" },
                { value: "Linear", text: "Linear (Straight)" },
                { value: "Circuit", text: "Circuit Board (Manhattan)" }
            ],
            defaultValue: "Circuit",
            onChange: (v) => { this._state.wireStyle = v; }
        });

        // [BB-v11] NEW: Toggle Wires
        app.ui.settings.addSetting({
            id: `${id}.ShowWires`,
            name: "👁️ BB: Show Wires",
            type: "boolean",
            defaultValue: true,
            onChange: (v) => { this._state.showWires = v; }
        });
    },

    createGhostLayer() {
        // Remove existing if any (reloads)
        const existing = document.getElementById("h4-ghost-layer");
        if (existing) existing.remove();

        this.canvas = document.createElement("canvas");
        this.canvas.id = "h4-ghost-layer";

        // [BB-v11] ALIGNMENT STRATEGY: PARENT COUPLING (REDUX)
        // We attach to the canvas container to get automatic clipping and position.
        const parent = app.canvas.canvas.parentNode;
        parent.style.position = "relative"; // Ensure parent is a positioning context
        parent.appendChild(this.canvas);

        this.canvas.style.position = "absolute";
        this.canvas.style.top = "0";
        this.canvas.style.left = "0";
        this.canvas.style.width = "100%";
        this.canvas.style.height = "100%";
        this.canvas.style.pointerEvents = "none";
        this.canvas.style.zIndex = "10"; // [BB-v11] Lower Z (was 9000) to be under UI

        this.ctx = this.canvas.getContext("2d");

        // High-DPI Handling
        const handleResize = () => {
            const dpr = window.devicePixelRatio || 1;
            const rect = parent.getBoundingClientRect();
            this.canvas.width = rect.width * dpr;
            this.canvas.height = rect.height * dpr;
        };

        const resizeObserver = new ResizeObserver(() => handleResize());
        resizeObserver.observe(parent);

        // Initial size
        handleResize();
    },

    // NOTE: getNodeOutputPos and getNodeInputPos are defined at the end of this extension object

    injectCSS() {
        const style = document.createElement("style");
        style.type = "text/css";
        style.innerHTML = `
            .h4-death-modal {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(10, 10, 15, 0.98);
                border: 2px solid ${this._state.wireColorError};
                box-shadow: 0 0 50px ${this._state.wireColorError}aa;
                color: #fff;
                font-family: 'Consolas', 'Monaco', monospace;
                z-index: 99999;
                padding: 20px;
                max-width: 800px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                border-radius: 8px;
                display: flex;
                flex-direction: column;
                gap: 15px;
                animation: h4-fadein 0.2s ease-out;
            }
            @keyframes h4-fadein { from { opacity: 0; transform: translate(-50%, -45%); } to { opacity: 1; transform: translate(-50%, -50%); } }
            
            .h4-death-modal h2 {
                color: ${this._state.wireColorError};
                margin: 0;
                text-transform: uppercase;
                border-bottom: 1px solid ${this._state.wireColorError};
                padding-bottom: 10px;
                font-size: 1.5em;
                text-align: center;
                letter-spacing: 2px;
            }
            .h4-death-modal pre {
                background: #000;
                padding: 15px;
                border: 1px solid #333;
                overflow-x: auto;
                color: #00ff99;
                white-space: pre-wrap;
                font-size: 0.9em;
            }
            .h4-death-modal .h4-controls {
                display: flex;
                justify-content: center;
                gap: 20px;
                margin-top: 10px;
            }
            .h4-death-modal button {
                background: #222;
                color: #fff;
                border: 1px solid #555;
                padding: 10px 24px;
                cursor: pointer;
                font-family: inherit;
                text-transform: uppercase;
                font-weight: bold;
                transition: all 0.2s;
            }
            .h4-death-modal button:hover {
                background: ${this._state.wireColorError};
                border-color: ${this._state.wireColorError};
                color: #000;
            }
        `;
        document.head.appendChild(style);
    },

    startLoop() {
        if (this.rafId) cancelAnimationFrame(this.rafId);

        const loop = (timestamp) => {
            this.render(timestamp);
            this.rafId = requestAnimationFrame(loop);
        };
        this.rafId = requestAnimationFrame(loop);
    },

    render(timestamp) {
        if (!this._state.enabled || !this.ctx || !app.canvas) return;

        // Clean Canvas (using physical pixels)
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 1. Draw Cyber Grid (Startup Effect)
        this.drawCyberGrid(timestamp);

        // Only proceed if tracking is relevant
        const hasSelection = (app.canvas.selected_nodes && Object.keys(app.canvas.selected_nodes).length > 0);
        const hasInfection = (this.infectedLinks.size > 0);

        if (!hasSelection && !hasInfection) return;

        // 2. Sync Coordinate System
        this.ctx.save();

        // 2a. High-DPI Scaling (Base System)
        // This makes 1 logical unit = 1 physical pixel
        // 1. Setup Context
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const dpr = window.devicePixelRatio || 1;

        // 2. Get Transformation State (Source of Truth)
        let t = 1;
        let tx = 0;
        let ty = 0;

        if (app.canvas && typeof app.canvas.scale === "number") {
            t = app.canvas.scale;
            tx = app.canvas.tx;
            ty = app.canvas.ty;
        } else {
            const ds = app.canvas ? app.canvas.ds : null;
            if (ds) {
                if (typeof ds.scale === 'number') t = ds.scale;
                if (Array.isArray(ds.offset)) {
                    tx = ds.offset[0];
                    ty = ds.offset[1];
                }
            }
        }

        if (!isFinite(t)) t = 1;
        if (!isFinite(tx)) tx = 0;
        if (!isFinite(ty)) ty = 0;

        // 3. Calculate Screen Offset (Header/Sidebar Alignment)
        // We find the canvas element and get its bounding rect relative to viewport.
        // This handles cases where the canvas is pushed down by headers/menus.
        let screenDx = 0;
        let screenDy = 0;
        if (app.canvas && app.canvas.canvas) {
            // [BB-v11] PARENT COUPLING: Ignore DOM Rect (handled by parent structure)
            const rect = app.canvas.canvas.getBoundingClientRect();
            // screenDx = rect.left; 
            // screenDy = rect.top;
            screenDx = 0;
            screenDy = 0;
        }

        // Manual Calibration (User Override)
        if (this._state.offsetX) screenDx += this._state.offsetX;
        if (this._state.offsetY) screenDy += this._state.offsetY;

        // 4. Final Matrix Application (The "Projector" Formula)
        // [BB-v11] MATRIX REVERT: User reported "Floating" when (* t) was removed.
        // Empirical Evidence: "Locked in" results require tx * t.
        // It implies tx refers to Pre-Scale Graph Units in the LiteGraph state we are reading.

        const finalScale = t * dpr;
        // screenDx/Dy is effectively manual offset now
        const finalTx = (tx * t + screenDx) * dpr;
        const finalTy = (ty * t + screenDy) * dpr;

        this.ctx.setTransform(finalScale, 0, 0, finalScale, finalTx, finalTy);

        // [h4 DEBUG PROTOCOL] Render frame debug output
        if (this._state.debugMode && hasSelection && !window.h4_render_logged) {
            console.log(`[h4-DEBUG] Render Frame: t=${t.toFixed(3)}, tx=${tx.toFixed(1)}, ty=${ty.toFixed(1)}, sDx=${screenDx}, sDy=${screenDy}`);
            window.h4_render_logged = true;
        }

        // [BB-v11] DEBUG DIAGNOSTIC: Draw a cyan box around the first selected node
        // [BB-v11] Debug Diagnostic removed (Cyan box)

        // [BB-v11] SELECTION HIGHLIGHT (Glowing Border)
        if (hasSelection) {
            this.ctx.save();
            const color = this._state.wireColorSelect || "#00FF00";
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 2 / t; // Constant screen width
            this.ctx.shadowColor = color;
            this.ctx.shadowBlur = 15; // Nice glow

            const selectedIds = Object.keys(app.canvas.selected_nodes || {});

            for (const nodeId of selectedIds) {
                const node = app.graph.getNodeById(nodeId);
                if (!node || !node.pos || !node.size) continue;

                const titleHeight = (typeof LiteGraph !== "undefined" && LiteGraph.NODE_TITLE_HEIGHT) ? LiteGraph.NODE_TITLE_HEIGHT : 30;

                let x = node.pos[0];
                let y = node.pos[1] - titleHeight; // Include Header
                let w = node.size[0];
                let h = node.size[1] + titleHeight;

                const r = 10; // Radius

                this.ctx.beginPath();
                if (this.ctx.roundRect) {
                    this.ctx.roundRect(x, y, w, h, r);
                } else {
                    this.ctx.rect(x, y, w, h);
                }
                this.ctx.stroke();
            }
            this.ctx.restore();
        }

        // [BB-v11] INFECTION HIGHLIGHT (Red Error Box)
        // Updated to match Selection Glow style (Universal Neon)
        if (hasInfection) {
            this.ctx.save();
            const color = this._state.wireColorError || "#FF0000";
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 2 / t; // Constant screen width
            this.ctx.shadowColor = color;
            this.ctx.shadowBlur = 15; // Universal Glow

            for (const nodeId of this.infectedNodes) {
                const node = app.graph.getNodeById(nodeId);
                if (!node || !node.pos || !node.size) continue;

                const titleHeight = (typeof LiteGraph !== "undefined" && LiteGraph.NODE_TITLE_HEIGHT) ? LiteGraph.NODE_TITLE_HEIGHT : 30;

                let x = node.pos[0];
                let y = node.pos[1] - titleHeight; // Include Header
                let w = node.size[0];
                let h = node.size[1] + titleHeight;

                const r = 10; // Radius

                this.ctx.beginPath();
                if (this.ctx.roundRect) {
                    this.ctx.roundRect(x, y, w, h, r);
                } else {
                    this.ctx.rect(x, y, w, h);
                }
                this.ctx.stroke();
            }
            this.ctx.restore();
        }

        // 3. Draw Wires (Now in correct Graph Space)
        this.drawWires(t);

        this.ctx.restore();
    },

    drawCyberGrid(timestamp) {
        // Animation State Logic
        const elapsed = timestamp - this.animStart;
        if (elapsed < this.gridDelay) return; // Delayed start

        // Normalized progress 0.0 -> 1.0
        const progress = Math.min((elapsed - this.gridDelay) / this.gridDuration, 1.0);
        if (progress >= 1.0) return; // Animation finished

        // ----------------------------------------------------
        // RIGHT-TO-LEFT Wipe Logic
        // ----------------------------------------------------
        // We want the grid to appear from Right Edge and move Left.
        // Or we want the mask to reveal it from Right to Left.

        // Let's interpret "Roll out from Right":
        // It enters screen from right side and moves left? 
        // Or it is static, but opacity reveals from Right?
        // Let's do a Reveal Mask (Right -> Left).

        const w = this.canvas.width;
        const h = this.canvas.height;
        const spacing = 50;

        // Calculate the "leading edge" X position.
        // Starts at W, moves to 0. 
        // Pixels to the right of this X are "visible" (or fading in).
        // Pixels to the left are invalid.

        // Actually, let's have it sweep across.
        // Start: x = w (Right edge)
        // End: x = 0 (Left edge)
        const wipeX = w - (w * progress);

        this.ctx.save();
        this.ctx.strokeStyle = this._state.gridColor;
        this.ctx.lineWidth = 1;

        // Clip region: Everything to the Right of wipeX
        // Allows drawing from wipeX to Width.
        // We add a gradient alpha mask for smoothness at the leading edge.

        this.ctx.beginPath();
        // Rect from wipeX to W
        this.ctx.rect(0, 0, w, h);
        // Actually, drawing the whole grid is cheap, let's just mask it with a gradient fill? 
        // No, we need stroke alpha.

        // Let's use a loop optimization.
        // Draw Vertical lines
        for (let x = 0; x < w; x += spacing) {
            // Alpha based on distance from wipeX
            // If x < wipeX: invisible (0)
            // If x > wipeX: fade in

            let alpha = 0;
            if (x >= wipeX) {
                // Fully visible if far behind the wipe
                // Fade in range of 300px
                const dist = x - wipeX;
                alpha = Math.min(dist / 300, 1.0);

                // Also fade out overall as time passes? 
                // "fades into nothingness" -> User said "vanish as if merging"
                // So at the end of animation, it should be gone.
                // Wait, if progress is 1.0, wipeX is 0. Grid is fully visible?
                // Then prompt said "fades into nothingness".
                // So: Wipe In -> Full Grid -> Fade Out?
                // Or: The wipe itself fades out the grid BEHIND it? 

                // Let's do: Wipe IN (Right to Left).
                // Then entire grid fades out.
                // But that requires 2 stages.

                // Optimization: "Roll out... then fades into nothingness"
                // Let's have the "Leading Edge" be bright, and the "Trailing Edge" (right side) fade out?
                // Like a scanner beam.

                // Re-reading: "loads first then the overlay efficiently... rolls out from right to left... then fades into nothingness"

                // Interpretation: 
                // A scanner bar moves Right->Left.
                // It leaves a grid behind it? Or the grid is only IN the scanner bar?
                // "illusion the grid is being laid overtop and then vanishing"

                // Let's do:
                // Grid opacity is 1.0 at wipeX.
                // Grid opacity fades to 0 as you go Right (Trailing).
                // Grid opacity is 0 at Left (Ahead).

                // So it's a moving band of grid from Right to Left.
                // Band width = ~800px?

                // Let's try to keep the grid "laid overtop" (persistent) then fade?
                // Let's stick to a Reveal Wipe, then global fade.
                // But simple is best.

                // Refined Logic:
                // Global Opacity = (1.0 - progress) * 2; // Hack to fade out at end?
                // Let's just do the Wipe Reveal for now to satisfy "Roll out".

                // Fade out the TAIL (Right Side) as the HEAD (Left Side) advances?
                // No, "fades into nothingness" implies the whole thing goes away.
                // Let's make it a Reveal (0->100%) then a global Fade (100%->0%).

                // If progress < 0.8: Reveal Phase.
                // If progress > 0.8: Fade Out Phase.
            }

            // Simple approach for "Roll Out and Vanish":
            // A gradient mask moving Right -> Left.
            // Visible area is [wipeX, w].
            // But we also want it to fade out.
            // Let's modulate global alpha by (1 - progress).
            // So as it wipes left, the stuff on the right is already fading.

            const globalFade = 1.0 - Math.pow(progress, 3); // accelerate fade at end

            if (x < wipeX) alpha = 0;
            else {
                // Fade in edge
                alpha = Math.min((x - wipeX) / 100, 1.0);
            }
            alpha *= globalFade;

            if (alpha < 0.01) continue;

            this.ctx.globalAlpha = alpha;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, h);
            this.ctx.stroke();
        }

        // Draw Horizontal lines
        // They need to be masked by the X wipe too!
        for (let y = 0; y < h; y += spacing) {
            // Line from wipeX to W?
            // We can just draw the full line and clip, or draw segment.
            if (wipeX < w) {
                // Calculate alpha for this horizontal line? 
                // It's a gradient along the line.
                // Creating a gradient for every line is expensive.
                // Let's just draw the segment [wipeX, w] with a global alpha average?
                // No, looks bad. 

                // Better: Draw lines, apply Global Composite Operation "destination-in" with a gradient rect?
                // YES. This is the Canvas way.
            }
        }
        this.ctx.restore();

        // CANVAS COMPOSITE APPROACH (Faster & Prettier)
        // 1. Draw Full Grid (off-screen or just draw it)
        // 2. Clear Rect logic?

        // Actually, let's keep it simple for V1. The vertical lines loop above is fine.
        // For horizontal lines, let's just fade them in based on the WipeX position generally.
        // (It won't look like a perfect scanline, but close enough).

        this.ctx.save();
        const globalFade = 1.0 - Math.pow(progress, 3);
        this.ctx.globalAlpha = globalFade;
        this.ctx.strokeStyle = this._state.gridColor;
        this.ctx.lineWidth = 1;

        // Clip to right of wipeX
        this.ctx.beginPath();
        this.ctx.rect(wipeX, 0, w - wipeX, h);
        this.ctx.clip();

        for (let y = 0; y < h; y += spacing) {
            this.ctx.beginPath();
            this.ctx.moveTo(wipeX, y); // Start at wipe
            this.ctx.lineTo(w, y);
            this.ctx.stroke();
        }
        this.ctx.restore();
    },

    drawWires(t = 1.0) {
        if (!app.graph || !app.graph.links || !this._state.showWires) return;

        // [h4 DEBUG PROTOCOL] Wire draw loop debug
        if (this._state.debugMode && !window.h4_wire_debug) {
            const selCount = Object.keys(app.canvas.selected_nodes || {}).length;
            console.log(`[h4-DEBUG] drawWires Loop: Selection=${selCount}, Infection=${this.infectedLinks.size}, Links=${Object.keys(app.graph.links).length}`);
            window.h4_wire_debug = true;
        }

        // Get selected node IDs as numbers for correct comparison
        const selected_nodes = app.canvas.selected_nodes || {};
        const selected_ids = new Set(Object.keys(selected_nodes).map(Number));

        let wiresDrawn = 0;

        // Iterate graph links
        for (const linkId in app.graph.links) {
            const link = app.graph.links[linkId];
            if (!link) continue;

            const isInfected = this.infectedLinks.has(link.id);
            const isSelected = selected_ids.has(Number(link.origin_id)) || selected_ids.has(Number(link.target_id));

            if (!isInfected && !isSelected) continue;

            const nodeOrg = app.graph.getNodeById(link.origin_id);
            const nodeTgt = app.graph.getNodeById(link.target_id);
            if (!nodeOrg || !nodeTgt) continue;

            // [BB-v11] Safety: Ensure visible coordinates
            const posA = this.getNodeOutputPos(nodeOrg, link.origin_slot);
            const posB = this.getNodeInputPos(nodeTgt, link.target_slot);

            // [h4 DEBUG PROTOCOL] Log KSampler wire positions
            if (this._state.debugMode) {
                if (!window.h4_wire_pos_dbg) window.h4_wire_pos_dbg = new Set();
                const tgtInput = nodeTgt.inputs ? nodeTgt.inputs[link.target_slot] : null;
                const tgtName = tgtInput ? tgtInput.name : 'unknown';
                if (nodeTgt.type === 'KSampler' && !window.h4_wire_pos_dbg.has(tgtName)) {
                    console.log(`[h4-DEBUG] KSampler input '${tgtName}' slot=${link.target_slot}: posB=[${posB ? posB[0].toFixed(1) : 'null'}, ${posB ? posB[1].toFixed(1) : 'null'}]`);
                    window.h4_wire_pos_dbg.add(tgtName);
                }
            }

            if (!posA || !posB) continue;
            // Double check for NaN
            if (isNaN(posA[0]) || isNaN(posA[1]) || isNaN(posB[0]) || isNaN(posB[1])) continue;

            wiresDrawn++;

            // Style from Settings
            let color = this._state.wireColorSelect || "#00ff00";
            let width = 3;
            let blur = 15;

            if (isInfected) {
                color = this._state.wireColorError || "#ff0000";
                width = 5;
                blur = 20;
            }

            // [BB-v11] Line Width Logic
            // Wires get a slightly thicker base + strong glow (Universal Neon)
            this.ctx.lineWidth = width / t;

            this.ctx.strokeStyle = color;
            this.ctx.shadowColor = color;
            this.ctx.shadowBlur = blur;
            this.ctx.lineCap = "round";
            this.ctx.lineJoin = "round";

            // [BB-v11.6 DIRECT FIX] Apply +45px to converted widget slots (>= 4) for visual alignment
            // This compensates for LiteGraph's internal slot positioning which reports coordinates
            // slightly above the visual center of the input circle for converted widgets.
            let finalPosB = posB;
            if (link.target_slot >= 4) {
                finalPosB = [posB[0], posB[1] + 45];
                // [h4 DEBUG PROTOCOL] Log slot correction when debug mode is active
                if (this._state.debugMode && !window._h4_direct_fix_log) {
                    console.log(`[h4-DEBUG] Applying +45px to slot ${link.target_slot}: original=${posB[1].toFixed(1)}, corrected=${finalPosB[1].toFixed(1)}`);
                    window._h4_direct_fix_log = true;
                }
            }

            this.ctx.beginPath();

            // Draw matching wire style
            if (this._state.wireStyle === "Spline" || this._state.wireStyle === "Match") {
                this.drawSpline(this.ctx, posA, finalPosB);
            } else if (this._state.wireStyle === "Linear") {
                this.ctx.moveTo(posA[0], posA[1]);
                this.ctx.lineTo(finalPosB[0], finalPosB[1]);
            } else {
                // Circuit / Default
                this.drawCircuit(this.ctx, posA, finalPosB);
            }
            this.ctx.stroke();
        }
    },

    drawSpline(ctx, posA, posB) {
        const x1 = posA[0];
        const y1 = posA[1];
        const x2 = posB[0];
        const y2 = posB[1];
        ctx.moveTo(x1, y1);

        let dist = Math.abs(x2 - x1);
        if (dist < 20) dist = 20; // Minimum curvature

        const cp1x = x1 + (dist * 0.25);
        const cp1y = y1;
        const cp2x = x2 - (dist * 0.25);
        const cp2y = y2;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
    },

    drawCircuit(ctx, posA, posB) {
        const x1 = posA[0];
        const y1 = posA[1];
        const x2 = posB[0];
        const y2 = posB[1];
        ctx.moveTo(x1, y1);

        let midX = x1 + (x2 - x1) * 0.5;

        ctx.lineTo(midX, y1);
        ctx.lineTo(midX, y2);
        ctx.lineTo(x2, y2);
    },

    handleError(event) {
        if (!this._state.enabled) return;

        const error = event.detail;
        if (!error) return;
        const nodeId = error.node_id;
        const errorMsg = error.exception_message || "Unknown Error";
        const traceback = error.traceback || error.exception_type || "No traceback available.";

        if (this._state.monitorEnabled) {
            console.error(`👁️ [BB-v11] EXECUTION ERROR on Node ${nodeId}:`, errorMsg);
        }

        if (nodeId) {
            this.infectedNodes.add(nodeId);
            if (app.graph) {
                const node = app.graph.getNodeById(nodeId);
                if (node && node.inputs) {
                    for (const input of node.inputs) {
                        if (input.link) {
                            this.infectedLinks.add(input.link);
                        }
                    }
                }
            }
        }

        // Only show popup if setting is enabled
        if (this._state.showErrorPopup) {
            this.showDeathModal(errorMsg, traceback);
        }
    },

    resetState() {
        this.infectedNodes.clear();
        this.infectedLinks.clear();
        const modal = document.querySelector(".h4-death-modal");
        if (modal) modal.remove();

        // Optional: Re-trigger grid on run?
        // this.animStart = performance.now(); 
    },

    showDeathModal(errorMsg, traceback) {
        // Use setting color for border
        const styleColor = this._state.wireColorError;

        const existing = document.querySelector(".h4-death-modal");
        if (existing) existing.remove();

        const modal = document.createElement("div");
        modal.className = "h4-death-modal";
        // Inline override for dynamic color
        modal.style.borderColor = styleColor;
        modal.style.boxShadow = `0 0 50px ${styleColor}aa`;

        modal.innerHTML = `
            <h2 style="color: ${styleColor}; border-bottom-color: ${styleColor};">💀 EXECUTION FAILURE 💀</h2>
            <div style="font-weight: bold; color: #fff;">${errorMsg}</div>
            <pre>${traceback}</pre>
            <div class="h4-controls">
                <button class="h4-copy" onclick="
                    const pre = this.parentElement.previousElementSibling;
                    navigator.clipboard.writeText(pre.innerText);
                    this.innerText = 'COPIED!';
                    setTimeout(() => this.innerText = 'COPY TRACE', 1000);
                ">COPY TRACE</button>
                <button onclick="this.parentElement.parentElement.remove()">DISMISS</button>
            </div>
        `;

        document.body.appendChild(modal);
    },

    /**
     * Helper to get output position with fallback
     */
    getNodeOutputPos(node, slotIndex) {
        const offset = this._state.wireOffsetY || 0;

        const titleHeight = (typeof LiteGraph !== "undefined" && LiteGraph.NODE_TITLE_HEIGHT) ? LiteGraph.NODE_TITLE_HEIGHT : 30;
        const slotHeight = (typeof LiteGraph !== "undefined" && LiteGraph.NODE_SLOT_HEIGHT) ? LiteGraph.NODE_SLOT_HEIGHT : 20;

        // [BB-v11 FIX] Collapsed node handling
        if (node.flags && node.flags.collapsed) {
            const defaultCollapsedW = (typeof LiteGraph !== "undefined" && LiteGraph.NODE_COLLAPSED_WIDTH) ? LiteGraph.NODE_COLLAPSED_WIDTH : 140;
            const w = node._collapsed_width || defaultCollapsedW;
            return [node.pos[0] + w, node.pos[1] + (titleHeight * 0.5) + offset];
        }

        // [BB-v11 FIX] PRIORITY: Trust LiteGraph's native position calculation
        if (node.getConnectionOutputPos) {
            const lpos = node.getConnectionOutputPos(slotIndex);
            if (lpos && !isNaN(lpos[0]) && !isNaN(lpos[1])) {
                return [lpos[0], lpos[1] + offset];
            }
        }

        // [BB-v11 FIX] FALLBACK: Manual calculation only if LiteGraph fails
        if (node.pos && node.size) {
            return [
                node.pos[0] + node.size[0],
                node.pos[1] + titleHeight + (slotIndex * slotHeight) + (slotHeight * 0.5) + offset
            ];
        }
        return undefined;
    },

    getNodeInputPos(node, slotIndex) {
        // [h4 DEBUG PROTOCOL] Log when loading for first time if debug mode is on
        if (this._state.debugMode && !window._h4_input_pos_loaded) {
            console.log('%c[h4-DEBUG] getNodeInputPos function loaded', 'background: #333; color: #0f0; font-size: 12px;');
            window._h4_input_pos_loaded = true;
        }
        const offset = this._state.wireOffsetY || 0;

        const titleHeight = (typeof LiteGraph !== "undefined" && LiteGraph.NODE_TITLE_HEIGHT) ? LiteGraph.NODE_TITLE_HEIGHT : 30;
        const slotHeight = (typeof LiteGraph !== "undefined" && LiteGraph.NODE_SLOT_HEIGHT) ? LiteGraph.NODE_SLOT_HEIGHT : 20;

        // [BB-v11 FIX] Collapsed node handling
        if (node.flags && node.flags.collapsed) {
            return [node.pos[0], node.pos[1] + (titleHeight * 0.5) + offset];
        }

        // [BB-v11 FIX] Trust LiteGraph's native position calculation
        // NOTE: The +45px slot correction for converted widgets is applied in drawWires(),
        // not here. This keeps the base position calculation clean.
        if (node.getConnectionInputPos) {
            const lpos = node.getConnectionInputPos(slotIndex);
            if (lpos && !isNaN(lpos[0]) && !isNaN(lpos[1])) {
                // [h4 DEBUG PROTOCOL] Detailed slot position logging
                if (this._state.debugMode) {
                    const input = node.inputs ? node.inputs[slotIndex] : null;
                    const inputName = input ? input.name : 'unknown';
                    if (node.type && node.type.includes('Sampler')) {
                        console.log(`[h4-DEBUG] getNodeInputPos: ${node.type} slot=${slotIndex} '${inputName}': lpos=[${lpos[0].toFixed(1)}, ${lpos[1].toFixed(1)}]`);
                    }
                }
                return [lpos[0], lpos[1] + offset];
            }
        }

        // [BB-v11 FIX] FALLBACK: Manual calculation only if LiteGraph fails
        return [
            node.pos[0],
            node.pos[1] + titleHeight + (slotIndex * slotHeight) + (slotHeight * 0.5) + offset
        ];
    },
});
