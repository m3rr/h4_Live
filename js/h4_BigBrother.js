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

    // Console Log Buffer (captures ALL output since launch)
    _logBuffer: [],
    _logBufferMaxSize: 50000, // Reduced from 1M to 50k for stability and performance
    _originalConsole: null, // Store original console methods
    _networkInterceptorInstalled: false, // Flag for network interceptor
    _isHandlingError: false, // Recursion protection for handleError

    // --- Discombobulator Easter Egg State ---
    _glitchState: {
        lastGlitchTime: 0,
        isGlitching: false,
        glitchDuration: 0,
        glitchType: 0 // 0: chromatic, 1: macro, 2: static
    },

    async setup() {
        // 0. FIRST: Install console interceptor to capture ALL logs from launch
        this.installConsoleInterceptor();
        // 0.1 Install network interceptor to capture fetch/XHR/WebSocket activity
        this.installNetworkInterceptor();
        // 0.2 Global error handling to capture uncaught errors and promise rejections
        // Wrapped with safety check to prevent infinite loops during early crashes
        window.addEventListener('error', (event) => {
            if (this._isHandlingError) return;
            const { message, filename, lineno, colno, error } = event;
            const errMsg = `${message} at ${filename}:${lineno}:${colno}`;
            this.handleError({ error: errMsg, traceback: error ? error.stack : '' });
        });
        window.addEventListener('unhandledrejection', (event) => {
            if (this._isHandlingError) return;
            const reason = event.reason instanceof Error ? event.reason.stack : String(event.reason);
            this.handleError({ error: 'Unhandled Promise Rejection', traceback: reason });
        });

        // [VERSION CHECK] If you see this timestamp in console, the NEW code is running
        const BUILD_TIMESTAMP = "2026-01-08T09:45:00_LOG_CAPTURE";
        console.log(`%c👁️ h4 Big Brother v12 [BUILD: ${BUILD_TIMESTAMP}] Initializing...`, "color: #00FF00; background: #000; font-size: 14px; padding: 4px;");

        // 1. Hydrate State
        this._state = { ...this._config };

        // 2. Initialize Settings
        this.registerSettings();

        // 3. Spawn the Ghost Layer
        this.createGhostLayer();

        // 4. Inject CSS for Modals
        this.injectCSS();

        // 5. Start the Surveillance Loop
        this.startLoop();

        // 6. Register Event Listeners (The Snitch)
        api.addEventListener("execution_error", (e) => this.handleError(e));
        api.addEventListener("execution_start", () => this.resetState());

        // Mark start time for animation
        this.animStart = performance.now();

        // 7. Hide Debug Error Generator node if debug mode is off
        this.updateDebugNodeVisibility();

        // 8. Stealth: Start the Queue UI Watcher for The Discombobulator
        this.startQueueWatcher();

        // 9. Easter Egg: The Boobies Switch (SFW Toggle)
        this.setupSfwToggle_v2();
    },

    // ==============================================================================
    // SFW Toggle (The Boobies Switch) - Steganographic Mode
    // ==============================================================================

    _sfwState: {
        KEY: "h4_sfw_mode"
    },

    getSfwMode() {
        const stored = localStorage.getItem(this._sfwState.KEY);
        return stored === "off" ? "off" : "on";
    },

    setSfwMode(mode) {
        localStorage.setItem(this._sfwState.KEY, mode);
        // Sync with Python backend
        fetch(`/h4/sfw_status?mode=${mode}`).catch(() => { });

        const prefix = "[ h4_Live {FaceForge} ]";
        if (mode === "off") {
            console.log(`%c${prefix} : Boobies Enabled`, "color: #ff69b4; font-weight: bold;");
        } else {
            console.log(`%c${prefix} : Boobies Disabled`, "color: #888; font-style: italic;");
        }
    },

    toggleSfwMode() {
        const newMode = this.getSfwMode() === "on" ? "off" : "on";
        this.setSfwMode(newMode);
        return newMode;
    },

    setupSfwToggle() {
        // We piggyback on the Settings Modal observer to find our target label
        // Target: "👁️ h4 Big Brother: Enable Overlay"
        const targetText = "👁️ h4 Big Brother: Enable Overlay";

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                // Check added nodes for the settings table rows
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === 1) {
                        // Check if this node CONTAINS our target label (it might be the modal or the table)
                        if (node.textContent && node.textContent.includes(targetText)) {
                            // Find the specific label element
                            // ComfyUI settings are usually tables or lists
                            const labels = node.querySelectorAll ? node.querySelectorAll("tr, label, .comfy-table-row") : [];
                            for (const row of labels) {
                                if (row.textContent.includes(targetText)) {
                                    this.attachSecretListener(row);
                                }
                            }
                        }
                    }
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        // Also try to find it immediately (if settings were already open?)
        setTimeout(() => {
            const rows = document.querySelectorAll("tr");
            for (const row of rows) {
                if (row.textContent.includes(targetText)) this.attachSecretListener(row);
            }
        }, 1000);
    },

    hookTheEye(element) {
        if (element.dataset.h4EyeHooked) return;
        element.dataset.h4EyeHooked = "true";

        // Wrap the Eye in a spicy span
        const html = element.innerHTML;
        if (html.includes("👁️")) {
            // Replace first occurrence only
            element.innerHTML = html.replace("👁️", "<span id='h4-secret-eye' style='cursor:pointer; display:inline-block; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);'>👁️</span>");

            const eye = element.querySelector("#h4-secret-eye");
            if (eye) {
                eye.title = "Reviewing Surveillance Footage... (Double-click for SFW Toggle)";

                eye.addEventListener("dblclick", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const newMode = this.toggleSfwMode();

                    // Animation: Spin and Pulse
                    eye.style.transform = "scale(1.8) rotate(360deg)";
                    eye.style.filter = newMode === "off" ? "drop-shadow(0 0 5px #ff69b4)" : "none";

                    setTimeout(() => {
                        eye.style.transform = "scale(1) rotate(0deg)";
                    }, 500);
                });

                console.log("[h4_FaceForge] Secret Eye Armed. Aim for the pupil.");
            }
        }
    },

    setupSfwToggle_v2() {
        // Target: "👁️ h4 Big Brother: Enable Overlay"
        const searchStr = "👁️ h4 Big Brother: Enable Overlay";

        const scanForEye = (root) => {
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
            let textNode;
            while (textNode = walker.nextNode()) {
                if (textNode.nodeValue.includes(searchStr) && !textNode.parentNode.dataset.h4EyeHooked) {
                    this.hookTheEye(textNode.parentNode);
                }
            }
        };

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === 1) {
                        scanForEye(node);
                    }
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        // Initial scan with delay
        setTimeout(() => scanForEye(document.body), 1000);
    },

    /**
     * Install console interceptor to capture ALL console output since launch.
     * This allows the error popup to show the last 500 entries and
     * the Full Report to show EVERYTHING from launch to present.
     */
    installConsoleInterceptor() {
        if (this._originalConsole) return; // Already installed

        const self = this;
        this._originalConsole = {
            log: console.log.bind(console),
            warn: console.warn.bind(console),
            error: console.error.bind(console),
            info: console.info.bind(console),
            debug: console.debug.bind(console)
        };

        const captureLog = (level, args) => {
            const timestamp = new Date().toISOString();
            const message = args.map(arg => {
                if (arg === null) return 'null';
                if (arg === undefined) return 'undefined';
                if (typeof arg === 'string') return arg;

                // PERFORMANCE FIX: Avoid deep stringify on large objects (like the graph)
                // Use a shallow representative string instead
                try {
                    if (typeof arg === 'object') {
                        // Check if it's a DOM element or a very complex object
                        if (arg instanceof HTMLElement) return `<${arg.tagName.toLowerCase()} ...>`;
                        if (Array.isArray(arg)) return `Array(${arg.length})`;

                        // Limit JSON.stringify for small objects only
                        const str = JSON.stringify(arg);
                        return str.length > 500 ? str.slice(0, 500) + '... (truncated)' : str;
                    }
                    return String(arg);
                } catch (e) {
                    return `[Complex ${typeof arg}]`;
                }
            }).join(' ');

            self._logBuffer.push({
                timestamp,
                level,
                message: (message.length > 2000 ? message.slice(0, 2000) + '... [LOG TRUNCATED]' : message).replace(/%c/g, '')
            });

            // Trim buffer if it exceeds max size
            if (self._logBuffer.length > self._logBufferMaxSize) {
                self._logBuffer.shift();
            }
        };

        console.log = (...args) => {
            captureLog('LOG', args);
            self._originalConsole.log(...args);
        };
        console.warn = (...args) => {
            captureLog('WARN', args);
            self._originalConsole.warn(...args);
        };
        console.error = (...args) => {
            captureLog('ERROR', args);
            self._originalConsole.error(...args);
        };
        console.info = (...args) => {
            captureLog('INFO', args);
            self._originalConsole.info(...args);
        };
        console.debug = (...args) => {
            captureLog('DEBUG', args);
            self._originalConsole.debug(...args);
        };
    },

    /**
     * Install network interceptor to capture fetch, XHR, and WebSocket activity.
     * All requests and responses are logged with timestamps.
     */
    installNetworkInterceptor() {
        if (this._networkInterceptorInstalled) return;
        this._networkInterceptorInstalled = true;
        const self = this;

        // Fetch interception
        const originalFetch = window.fetch.bind(window);
        window.fetch = async (...args) => {
            const [resource, config] = args;
            const start = Date.now();
            try {
                const response = await originalFetch(...args);
                const cloned = response.clone();
                const contentType = cloned.headers.get('content-type') || '';
                let body = '[binary data/stream]';

                if (contentType.includes('text') || contentType.includes('json')) {
                    try {
                        const text = await cloned.text();
                        body = text.length > 500 ? text.slice(0, 500) + '... (truncated)' : text;
                    } catch (e) {
                        body = '[body read failed]';
                    }
                }

                const duration = Date.now() - start;
                self._logBuffer.push({
                    timestamp: new Date().toISOString(),
                    level: 'NETWORK',
                    message: `FETCH ${resource} ${config?.method || 'GET'} ${duration}ms Response: ${body}`
                });
                return response;
            } catch (err) {
                const duration = Date.now() - start;
                self._logBuffer.push({
                    timestamp: new Date().toISOString(),
                    level: 'NETWORK',
                    message: `FETCH ${resource} FAILED after ${duration}ms Error: ${err}`
                });
                throw err;
            }
        };

        // XHR interception
        const OriginalXHR = window.XMLHttpRequest;
        function XHRInterceptor() {
            const xhr = new OriginalXHR();
            let method, url;
            const open = xhr.open;
            const send = xhr.send;
            xhr.open = function (m, u) {
                method = m;
                url = u;
                return open.apply(this, arguments);
            };
            xhr.send = function (body) {
                const start = Date.now();
                this.addEventListener('load', function () {
                    const duration = Date.now() - start;
                    const ct = this.getResponseHeader('content-type') || '';
                    let resp = '[binary data]';
                    if (ct.includes('text') || ct.includes('json')) {
                        resp = this.responseText.length > 500 ? this.responseText.slice(0, 500) + '... (truncated)' : this.responseText;
                    }
                    self._logBuffer.push({
                        timestamp: new Date().toISOString(),
                        level: 'NETWORK',
                        message: `XHR ${method} ${url} ${duration}ms Status: ${this.status} Response: ${resp}`
                    });
                });
                this.addEventListener('error', function () {
                    const duration = Date.now() - start;
                    self._logBuffer.push({
                        timestamp: new Date().toISOString(),
                        level: 'NETWORK',
                        message: `XHR ${method} ${url} FAILED after ${duration}ms`
                    });
                });
                return send.apply(this, arguments);
            };
            return xhr;
        }
        window.XMLHttpRequest = XHRInterceptor;

        // WebSocket interception
        const OriginalWebSocket = window.WebSocket;
        window.WebSocket = function (url, protocols) {
            const ws = new OriginalWebSocket(url, protocols);
            ws.addEventListener('open', () => {
                self._logBuffer.push({ timestamp: new Date().toISOString(), level: 'NETWORK', message: `WebSocket CONNECT ${url}` });
            });
            ws.addEventListener('message', (event) => {
                const dat = typeof event.data === 'string' ? (event.data.length > 500 ? event.data.slice(0, 500) + '...' : event.data) : '[binary]';
                self._logBuffer.push({ timestamp: new Date().toISOString(), level: 'NETWORK', message: `WebSocket MSG from ${url}: ${dat}` });
            });
            ws.addEventListener('close', (event) => {
                self._logBuffer.push({ timestamp: new Date().toISOString(), level: 'NETWORK', message: `WebSocket CLOSE ${url} Code:${event.code}` });
            });
            ws.addEventListener('error', () => {
                self._logBuffer.push({ timestamp: new Date().toISOString(), level: 'NETWORK', message: `WebSocket ERROR ${url}` });
            });
            return ws;
        };
    },

    /**
     * Get the last N log entries for display in error popup.
     * @param {number} count - Number of entries to retrieve
     * @returns {string} Formatted log entries
     */
    getRecentLogs(count = 5000) {
        const entries = this._logBuffer.slice(-count);
        return entries.map(e => `[${e.timestamp}] [${e.level}] ${e.message}`).join('\\n');
    },

    /**
     * Get ALL log entries since launch for full report.
     * @returns {string} Complete formatted log
     */
    getFullLog() {
        return this._logBuffer.map(e => `[${e.timestamp}] [${e.level}] ${e.message}`).join('\n');
    },

    /**
     * Hide or show the H4_DebugErrorGenerator node based on debug mode.
     * When debug mode is OFF, the node is removed from the menu.
     * When debug mode is ON, the node is visible in h4/debug category.
     */
    updateDebugNodeVisibility() {
        const debugNodeType = "H4_DebugErrorGenerator";

        // Store reference to original node type if we haven't already
        if (!this._debugNodeBackup && LiteGraph.registered_node_types[debugNodeType]) {
            this._debugNodeBackup = LiteGraph.registered_node_types[debugNodeType];
        }

        if (this._state.debugMode) {
            // Debug mode ON: Restore the node if it was hidden
            if (this._debugNodeBackup && !LiteGraph.registered_node_types[debugNodeType]) {
                LiteGraph.registerNodeType(debugNodeType, this._debugNodeBackup);
                console.log("[h4-DEBUG] Debug Error Generator node VISIBLE");
            }
        } else {
            // Debug mode OFF: Hide the node
            if (LiteGraph.registered_node_types[debugNodeType]) {
                delete LiteGraph.registered_node_types[debugNodeType];
                console.log("[h4] Debug Error Generator node HIDDEN (enable Debug Mode to show)");
            }
        }
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
            tooltip: "Enable NUCLEAR-level debug logging. Outputs wire positions, slot calculations, and all internal state to console. Also shows the Debug Error Generator node for testing. For troubleshooting only.",
            onChange: (v) => {
                this._state.debugMode = v;
                this.updateDebugNodeVisibility();
            }
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

    /**
     * Stealth: Watch the Queue side-panel and discombobulate job entries in real-time.
     * Non-invasive: only touches the Queue UI, not system-critical popups.
     */
    startQueueWatcher() {
        const self = this;
        const observer = new MutationObserver((mutations) => {
            // Check if discombobulator is on graph first (Nuclear Lean)
            const discombobulator = app.graph?.findNodesByType("H4_Discombobulator")[0];
            if (!discombobulator) return;

            const mode = discombobulator.widgets?.[0]?.value || "1337";

            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element
                        this.discombobulateElement(node, mode);
                    }
                });
            });

            // Occasional scan of existing items if they update via textContent change
            // This handles the "In queue..." -> "Running..." -> "Finished" transitions
            const queueItems = document.querySelectorAll(".comfy-queue-item, .comfy-history-item, .side-bar-panel-container .comfy-list-item");
            queueItems.forEach(item => this.discombobulateElement(item, mode));
        });

        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    },

    discombobulateElement(el, mode) {
        // Find text nodes recursively and translate them
        const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while (node = walk.nextNode()) {
            const text = node.textContent.trim();
            if (text.length > 2 && !node._h4_discombobulated) {
                // Ignore technical strings like timestamps or percentages if they look like numbers
                if (/^\d+(\.\d+)?%?$/.test(text)) continue;

                node.textContent = this.translateText(text, mode);
                node._h4_discombobulated = true;

                // Add a little visual flair if it's the V01D mode
                if (mode === "V 0 1 D" && node.parentElement) {
                    node.parentElement.style.textShadow = "0 0 5px rgba(255,0,0,0.5)";
                }
            }
        }
    },

    translateText(text, mode) {
        if (!text) return "";
        // Don't translate if already discombobulated (prevents double binary etc)
        if (text.includes("010") && mode === "b1n4ry") return text;

        switch (mode) {
            case "1337":
                return text.toUpperCase()
                    .replace(/A/g, "4").replace(/E/g, "3").replace(/G/g, "6")
                    .replace(/I/g, "1").replace(/O/g, "0").replace(/S/g, "5")
                    .replace(/T/g, "7").replace(/B/g, "|3").replace(/R/g, "|2");
            case "b1n4ry":
                return text.split('').map(char => char.charCodeAt(0).toString(2).padStart(8, '0')).join(' ').slice(0, 30) + "...";
            case "B64":
                try { return btoa(text).slice(0, 30) + "..."; } catch (e) { return text; }
            case "V 0 1 D":
                const zalgo = ["̷", "̵", "̶", "̷", "̸", "̡", "̢", "̧", "̨", "̛", "̛", "̛"];
                return text.split('').map(char => char + zalgo[Math.floor(Math.random() * zalgo.length)] + zalgo[Math.floor(Math.random() * zalgo.length)]).join('');
            default:
                return text;
        }
    },

    // Stealth: Add summon option to Context Hub
    getExtraMenuOptions(node, options) {
        if (node.type === "H4_ContextHub" || node.comfyClass === "H4_ContextHub") {
            const self = this;
            options.push({
                content: "✨ Summon The Discombobulator",
                callback: () => {
                    const newNode = LiteGraph.createNode("H4_Discombobulator");
                    if (newNode) {
                        newNode.pos = [node.pos[0] + node.size[0] + 40, node.pos[1]];
                        app.graph.add(newNode);
                    }
                }
            });
        }
    },

    // Extra robustness for menu
    nodeCreated(node) {
        if (node.comfyClass === "H4_ContextHub") {
            // Force it if needed, but getExtraMenuOptions should handle it
        }
    },

    // Stealth: Hide from search and inject summon logic
    beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name === "H4_Discombobulator") {
            nodeData.hide = true;
        }

        if (nodeData.name === "H4_ContextHub") {
            const orig = nodeType.prototype.getExtraMenuOptions;
            nodeType.prototype.getExtraMenuOptions = function (canvas, options) {
                if (orig) orig.apply(this, arguments);

                // Add separator if there are already options
                if (options.length > 0 && options[options.length - 1] !== null) {
                    options.push(null);
                }

                options.push({
                    content: "✨ Summon The Discombobulator",
                    callback: () => {
                        const newNode = LiteGraph.createNode("H4_Discombobulator");
                        if (newNode) {
                            newNode.pos = [this.pos[0] + this.size[0] + 40, this.pos[1]];
                            app.graph.add(newNode);
                        }
                    }
                });
            };
        }
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
                flex-wrap: wrap;
                gap: 12px;
                margin-top: 10px;
            }
            .h4-death-modal button {
                background: #222;
                color: #fff;
                border: 1px solid #555;
                padding: 10px 20px;
                cursor: pointer;
                font-family: inherit;
                text-transform: uppercase;
                font-weight: bold;
                font-size: 0.85em;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .h4-death-modal button:hover {
                background: ${this._state.wireColorError};
                border-color: ${this._state.wireColorError};
                color: #000;
            }
            .h4-death-modal button.h4-btn-secondary {
                border-color: #00bcd4;
                color: #00bcd4;
            }
            .h4-death-modal button.h4-btn-secondary:hover {
                background: #00bcd4;
                border-color: #00bcd4;
                color: #000;
            }
            .h4-death-modal button.h4-btn-github {
                border-color: #8b949e;
                color: #8b949e;
                padding: 10px 16px;
            }
            .h4-death-modal button.h4-btn-github:hover {
                background: #238636;
                border-color: #238636;
                color: #fff;
            }
            .h4-death-modal button .h4-icon-github {
                width: 16px;
                height: 16px;
                fill: currentColor;
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

        // 1.1 Secret Ghost Logic: The Discombobulator Glitch
        // Call this before coordinate transformation for simple screen-space check, 
        // but we'll pass the transform anyway.
        this.renderDiscombobulator(timestamp);

        // Only proceed if tracking is relevant for wires
        const hasSelection = (app.canvas.selected_nodes && Object.keys(app.canvas.selected_nodes).length > 0);
        const hasInfection = (this.infectedLinks.size > 0);

        if (!hasSelection && !hasInfection) return;

        // 2. Sync Coordinate System
        this.ctx.save();

        // 2a. High-DPI Scaling (Base System)
        // This makes 1 logical unit = 1 physical pixel
        // 1. Setup Context
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
        if (!this._state.enabled || this._isHandlingError) return;
        this._isHandlingError = true;

        try {
            // event can be from api listener (detail) or window listener (object)
            const error = event.detail || event;
            const nodeId = error.node_id || null;
            const errorMsg = error.exception_message || error.error || error.message || "Unknown Execution Error";
            const traceback = error.traceback || error.exception_type || "No traceback available.";

            if (this._state.monitorEnabled) {
                console.error(`👁️ [h4-BB] EXECUTION ERROR on Node ${nodeId || 'GLOBAL'}:`, errorMsg);
            }

            // Log to buffer
            this._logBuffer.push({
                timestamp: new Date().toISOString(),
                level: 'CRITICAL',
                message: `ERROR: ${errorMsg} \n TRACE: ${traceback}`
            });

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
        } finally {
            // Safety release
            setTimeout(() => { this._isHandlingError = false; }, 1000);
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

        // Sanitize the log content for privacy before any display or action
        const sanitizedError = this.sanitizeLog(errorMsg);
        const sanitizedTrace = this.sanitizeLog(traceback);

        // Get the recent console logs (default count)
        const recentLogs = this.sanitizeLog(this.getRecentLogs());

        const modal = document.createElement("div");
        modal.className = "h4-death-modal";
        // Inline override for dynamic color
        modal.style.borderColor = styleColor;
        modal.style.boxShadow = `0 0 50px ${styleColor}aa`;

        // GitHub icon SVG inline (from Octicons)
        const githubIconSVG = `<svg class="h4-icon-github" viewBox="0 0 16 16"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path></svg>`;

        modal.innerHTML = `
            <h2 style="color: ${styleColor}; border-bottom-color: ${styleColor};">💀 EXECUTION FAILURE 💀</h2>
            <div style="font-weight: bold; color: #fff; margin-bottom: 10px;">${sanitizedError}</div>
            <div style="color: #888; font-size: 0.85em; margin-bottom: 5px;">Stack Trace:</div>
            <pre style="max-height: 150px; overflow-y: auto; margin-bottom: 10px; border-color: #ff4444;">${sanitizedTrace}</pre>
            <div style="color: #888; font-size: 0.85em; margin-bottom: 5px;">Recent Console Log (Last entries):</div>
            <pre style="max-height: 400px; overflow-y: auto; font-size: 0.75em; color: #aaffaa;">${recentLogs || '(No console logs captured)'}</pre>
            <div class="h4-controls">
                <button class="h4-btn-secondary" data-action="show-report">SHOW FULL REPORT</button>
                <button class="h4-btn-secondary" data-action="help-fix">HELP FIX THIS</button>
                <button class="h4-btn-github" data-action="find-issues">${githubIconSVG} FIND ISSUES</button>
                <button data-action="copy">COPY TRACE</button>
                <button data-action="dismiss">DISMISS</button>
            </div>
        `;

        // Attach event listeners via delegation for cleaner code
        modal.querySelector('.h4-controls').addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;

            const action = btn.dataset.action;
            switch (action) {
                case 'show-report':
                    this.showFullReport(sanitizedError, sanitizedTrace);
                    break;
                case 'help-fix':
                    this.openHelpSearch(sanitizedError);
                    break;
                case 'find-issues':
                    this.openGitHubIssues(sanitizedError);
                    break;
                case 'copy':
                    navigator.clipboard.writeText(sanitizedTrace);
                    btn.textContent = 'COPIED!';
                    setTimeout(() => btn.textContent = 'COPY TRACE', 1000);
                    break;
                case 'dismiss':
                    modal.remove();
                    break;
            }
        });

        document.body.appendChild(modal);
    },

    /**
     * Sanitize log content to remove personal/sensitive information.
     * Replaces paths with Windows environment variable placeholders.
     * @param {string} text - Raw log text
     * @returns {string} Sanitized text safe for public sharing
     */
    sanitizeLog(text) {
        if (!text || typeof text !== 'string') return text || '';

        let sanitized = text;

        // 1. Windows user profile paths: C:\Users\{username}\ -> %USERPROFILE%\
        sanitized = sanitized.replace(/[A-Za-z]:\\Users\\[^\\]+\\/gi, '%USERPROFILE%\\');

        // 2. Also handle forward slashes: C:/Users/{username}/ -> %USERPROFILE%/
        sanitized = sanitized.replace(/[A-Za-z]:\/Users\/[^\/]+\//gi, '%USERPROFILE%/');

        // 3. Linux/Mac home paths: /home/{username}/ or /Users/{username}/ -> $HOME/
        sanitized = sanitized.replace(/\/(home|Users)\/[^\/]+\//g, '$HOME/');

        // 4. UNC paths (network shares): \\servername\share -> %NETWORKSHARE%
        sanitized = sanitized.replace(/\\\\[^\\]+\\[^\\]+/g, '%NETWORKSHARE%');

        // 5. Email addresses -> [EMAIL REDACTED]
        sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL REDACTED]');

        // 6. IPv4 addresses (but not localhost) -> [IP REDACTED]
        sanitized = sanitized.replace(/\b(?!127\.0\.0\.1)(?!0\.0\.0\.0)\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP REDACTED]');

        return sanitized;
    },

    /**
     * Open a new window displaying the full sanitized error report.
     * Styled to match the Death Modal aesthetic.
     * @param {string} errorMsg - Sanitized error message
     * @param {string} traceback - Sanitized stack trace
     */
    showFullReport(errorMsg, traceback) {
        const reportWindow = window.open('', '_blank', 'width=1200,height=900,scrollbars=yes');
        if (!reportWindow) {
            alert('Popup blocked! Please allow popups for this site.');
            return;
        }

        const timestamp = new Date().toISOString();

        // Get the COMPLETE log from launch to present
        const fullLog = this.sanitizeLog(this.getFullLog());
        const logEntryCount = this._logBuffer.length;

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>h4 FULL Error Report - ${timestamp}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            background: #0a0a0f;
            color: #fff;
            font-family: 'Consolas', 'Monaco', monospace;
            padding: 20px;
            line-height: 1.6;
        }
        h1 {
            color: #ff4444;
            border-bottom: 2px solid #ff4444;
            padding-bottom: 10px;
            margin-bottom: 20px;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        h2 {
            color: #00bcd4;
            font-size: 1em;
            text-transform: uppercase;
            margin: 20px 0 10px 0;
            cursor: pointer;
            user-select: none;
        }
        h2:hover { color: #00ffff; }
        h2::before { content: "▼ "; font-size: 0.8em; }
        h2.collapsed::before { content: "▶ "; }
        .section {
            margin-bottom: 20px;
        }
        .section-title {
            color: #00bcd4;
            font-size: 0.9em;
            text-transform: uppercase;
            margin-bottom: 8px;
        }
        .error-message {
            background: #1a1a25;
            border: 1px solid #ff4444;
            padding: 15px;
            border-radius: 4px;
            color: #ff8888;
            font-weight: bold;
        }
        pre {
            background: #000;
            border: 1px solid #333;
            padding: 15px;
            overflow-x: auto;
            color: #00ff99;
            white-space: pre-wrap;
            word-wrap: break-word;
            font-size: 0.85em;
            border-radius: 4px;
            max-height: 400px;
            overflow-y: auto;
        }
        pre.traceback {
            border-color: #ff4444;
            color: #ff8888;
            max-height: 200px;
        }
        pre.full-log {
            font-size: 0.75em;
            color: #aaffaa;
            max-height: none;
        }
        .meta {
            color: #666;
            font-size: 0.8em;
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #333;
        }
        .controls {
            margin-top: 20px;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        button {
            background: #222;
            color: #fff;
            border: 1px solid #00bcd4;
            padding: 10px 20px;
            cursor: pointer;
            font-family: inherit;
            text-transform: uppercase;
            font-weight: bold;
            transition: all 0.2s;
        }
        button:hover {
            background: #00bcd4;
            color: #000;
        }
        .stats {
            background: #111;
            border: 1px solid #333;
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 15px;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            font-size: 0.85em;
        }
        .stat-item { text-align: center; }
        .stat-value { color: #00bcd4; font-size: 1.2em; font-weight: bold; }
        .stat-label { color: #666; font-size: 0.8em; }
        .collapsible { display: block; }
        .collapsible.hidden { display: none; }
    </style>
</head>
<body>
    <h1>💀 h4 FULL Error Report</h1>
    
    <div class="stats">
        <div class="stat-item">
            <div class="stat-value">${logEntryCount}</div>
            <div class="stat-label">Total Log Entries</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${timestamp.split('T')[1].split('.')[0]}</div>
            <div class="stat-label">Report Time</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">v12</div>
            <div class="stat-label">Big Brother Version</div>
        </div>
    </div>
    
    <div class="section">
        <div class="section-title">Error Message</div>
        <div class="error-message">${errorMsg}</div>
    </div>
    
    <h2 onclick="toggleSection(this, 'traceback-section')">Stack Trace</h2>
    <div id="traceback-section" class="collapsible">
        <pre class="traceback" id="traceback">${traceback}</pre>
    </div>
    
    <h2 onclick="toggleSection(this, 'full-log-section')">Complete Console Log (Launch → Present)</h2>
    <div id="full-log-section" class="collapsible">
        <pre class="full-log" id="full-log">${fullLog || '(No console logs captured)'}</pre>
    </div>
    
    <div class="meta">
        <div>Generated: ${timestamp}</div>
        <div>Extension: h4 Live ToolKit (Big Brother v12)</div>
        <div>Log Buffer Size: ${logEntryCount} entries (max: 10,000)</div>
        <div>Note: Personal paths, emails, and IPs have been sanitized for privacy.</div>
    </div>
    
    <div class="controls">
        <button onclick="copySection('traceback')">COPY TRACE</button>
        <button onclick="copySection('full-log')">COPY FULL LOG</button>
        <button onclick="copyAll()">COPY EVERYTHING</button>
        <button onclick="window.close();">CLOSE</button>
    </div>
    
    <script>
        function toggleSection(header, sectionId) {
            const section = document.getElementById(sectionId);
            section.classList.toggle('hidden');
            header.classList.toggle('collapsed');
        }
        
        function copySection(id) {
            const el = document.getElementById(id);
            navigator.clipboard.writeText(el.innerText);
            event.target.textContent = 'COPIED!';
            setTimeout(() => event.target.textContent = event.target.textContent.replace('COPIED!', 'COPY ' + (id === 'traceback' ? 'TRACE' : 'FULL LOG')), 1000);
        }
        
        function copyAll() {
            const errorMsg = document.querySelector('.error-message').innerText;
            const trace = document.getElementById('traceback').innerText;
            const fullLog = document.getElementById('full-log').innerText;
            const all = '=== ERROR MESSAGE ===\\n' + errorMsg + '\\n\\n=== STACK TRACE ===\\n' + trace + '\\n\\n=== FULL CONSOLE LOG ===\\n' + fullLog;
            navigator.clipboard.writeText(all);
            event.target.textContent = 'COPIED!';
            setTimeout(() => event.target.textContent = 'COPY EVERYTHING', 1000);
        }
    </script>
</body>
</html>`;

        reportWindow.document.write(htmlContent);
        reportWindow.document.close();
    },

    /**
     * Open ComfyUI GitHub issues search for help with the error.
     * Searches the main ComfyUI repository.
     * @param {string} errorMsg - Sanitized error message
     */
    openHelpSearch(errorMsg) {
        // Extract key terms from the error (first 100 chars, cleaned)
        const searchTerms = errorMsg.substring(0, 100).replace(/[^\w\s]/g, ' ').trim();
        const query = encodeURIComponent(searchTerms + ' is:issue');
        const url = `https://github.com/comfyanonymous/ComfyUI/issues?q=${query}`;
        window.open(url, '_blank');
    },

    /**
     * Open h4_Live GitHub issues search to find related issues.
     * @param {string} errorMsg - Sanitized error message
     */
    openGitHubIssues(errorMsg) {
        // Extract key terms from the error (first 100 chars, cleaned)
        const searchTerms = errorMsg.substring(0, 100).replace(/[^\w\s]/g, ' ').trim();
        const query = encodeURIComponent(searchTerms + ' is:issue');
        const url = `https://github.com/m3rr/h4_Live/issues?q=${query}`;
        window.open(url, '_blank');
    },

    /**
     * Render Discombobulator Glitch: Identifies the node and triggers glitch effects
     * strictly localized to its title bar area on a random interval.
     */
    renderDiscombobulator(timestamp) {
        if (!app.graph) return;
        const discombobulator = app.graph.findNodesByType("H4_Discombobulator")[0];
        if (!discombobulator) return;

        const now = Date.now();
        // Transformation state from LiteGraph
        const scale = app.canvas.ds.scale;
        const tx = app.canvas.ds.offset[0];
        const ty = app.canvas.ds.offset[1];

        // Ensure the node is actually on screen before rendering effects
        if (!app.canvas.visible_nodes || app.canvas.visible_nodes.indexOf(discombobulator) === -1) return;

        // Glitch Trigger Logic
        if (!this._glitchState.isGlitching) {
            // Check cooldown (60s)
            if (now - this._glitchState.lastGlitchTime > 60000) {
                // 5% chance per frame once cooldown is over
                if (Math.random() < 0.05) {
                    this._glitchState.isGlitching = true;
                    this._glitchState.glitchDuration = Math.floor(10 + Math.random() * 20); // 10-30 frames
                    this._glitchState.glitchType = Math.floor(Math.random() * 3);
                    this._glitchState.lastGlitchTime = now;
                }
            }
        }

        if (this._glitchState.isGlitching) {
            this._glitchState.glitchDuration--;
            if (this._glitchState.glitchDuration <= 0) {
                this._glitchState.isGlitching = false;
            }

            // Calculate screen space position of node title
            const x = (discombobulator.pos[0] + tx) * scale;
            const y = (discombobulator.pos[1] + ty) * scale;
            const w = discombobulator.size[0] * scale;
            const h = (typeof LiteGraph !== "undefined" ? LiteGraph.NODE_TITLE_HEIGHT : 30) * scale;

            this.applyGlitchEffect(x, y, w, h);
        }
    },

    /**
     * applyGlitchEffect: Paints noisy, colorful, and separated visual elements 
     * on the Ghost Layer to simulate a cyberpunk glitch.
     */
    applyGlitchEffect(x, y, w, h) {
        const ctx = this.ctx;
        if (!ctx) return;
        const type = this._glitchState.glitchType;

        ctx.save();

        if (type === 0) { // Chromatic Aberration / RGB Separation
            ctx.fillStyle = "rgba(255, 0, 255, 0.4)";
            ctx.fillRect(x - 5, y + 2, w, h);
            ctx.fillStyle = "rgba(0, 255, 255, 0.4)";
            ctx.fillRect(x + 5, y - 2, w, h);
        }
        else if (type === 1) { // Macro-blocking / Data Corruption
            for (let i = 0; i < 6; i++) {
                const colors = ["#00FF00", "#FF00FF", "#FFFF00", "#00FFFF", "#FFFFFF"];
                ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
                const blockW = Math.random() * (w * 0.4);
                const blockH = Math.random() * (h * 0.8);
                ctx.fillRect(x + Math.random() * w, y + Math.random() * h, blockW, blockH);
            }
        }
        else { // Digital Static / Noise
            for (let i = 0; i < 80; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.8)";
                ctx.fillRect(x + Math.random() * w, y + Math.random() * h, 2, 2);
            }
            // Occasional full-line static
            if (Math.random() > 0.7) {
                ctx.fillStyle = "rgba(255,255,255,0.2)";
                ctx.fillRect(x, y + Math.random() * h, w, 1);
            }
        }

        ctx.restore();
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
