import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

/**
 * 👁️ h4 Big Brother v12 (Ghost in the Shell)
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
        enabled: false,
        monitorEnabled: false,
        debugMode: false,          // [h4 DEBUG PROTOCOL] NUCLEAR debug logging toggle
        showErrorPopup: false,     // Show the Death Modal on execution errors
        showGrid: false,           // Default to OFF
        wireColorSelect: "#00FF00",
        wireColorError: "#FF0000",
        gridColor: "rgba(255, 200, 0, 0.15)",
        wireStyle: "Circuit",
        showWires: false,
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
    gridDelay: 500,     // ms to wait before grid starts
    gridDuration: 1500, // ms for the wipe to complete

    // Console Log Buffer (captures ALL output since launch)
    _logBuffer: [],
    _logBufferMaxSize: 50000, // Reduced from 1M to 50k for stability and performance
    _originalConsole: null,   // Store original console methods
    _networkInterceptorInstalled: false, // Flag for network interceptor
    _isHandlingError: false,  // Recursion protection for handleError

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

        // 0.1 Install network interceptor to capture fetch/XHR/WebSocket activity safely
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
            let reason = event.reason;
            if (reason instanceof Error) {
                reason = reason.stack;
            } else if (typeof reason === 'object') {
                try { reason = JSON.stringify(reason); } catch (e) { reason = String(reason); }
            } else {
                reason = String(reason);
            }
            this.handleError({ error: 'Unhandled Promise Rejection', traceback: reason });
        });

        // [VERSION CHECK] If you see this timestamp in console, the NEW code is running
        const BUILD_TIMESTAMP = "2026-02-23T14:23:00_NETWORK_SAFE_O_n2";
        console.log(`%c👁️ h4 Big Brother v12 [BUILD: ${BUILD_TIMESTAMP}] Initializing...`, "color: #00FF00; background: #000; font-size: 14px; padding: 4px;");
        console.log("[h4] 🛡️ Emergency Startup Hardening Active.");

        // 1. Hydrate State from Dashboard if available
        if (window.h4_Dashboard && window.h4_Dashboard.config) {
            this._config = { ...window.h4_Dashboard.config };
            this._state = { ...this._config };
        } else {
            this._state = { ...this._config };
        }

        // 1.1 Listen for Dashboard Updates
        window.addEventListener("h4_config_update", (e) => {
            const { key, val } = e.detail;
            if (key in this._state) {
                this._state[key] = val;
                // Trigger re-render or updates if needed
                if (key === 'debugMode') this.updateDebugNodeVisibility();
            }
        });

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

        // 10. Caffeine Mode: Wake Lock Toggle (User Request)
        this.setupCaffeineButton();
    },

    // ==============================================================================
    // CAFFEINE MODE (Screen Wake Lock)
    // ==============================================================================
    _wakeLockSentinel: null,
    async toggleCaffeineMode(btn) {
        if (!('wakeLock' in navigator)) {
            alert("Your browser does not support Wake Lock API. Please use Chrome/Edge.");
            return;
        }

        if (this._wakeLockSentinel) {
            // TURN OFF (Release Lock)
            try {
                await this._wakeLockSentinel.release();
                this._wakeLockSentinel = null;
                btn.textContent = "(-_-)zzz"; // Sleepy Kirby
                btn.title = "Caffeine Mode: OFF (System can sleep)";
                btn.style.color = "#888"; // Gray
                btn.style.textShadow = "none";
                console.log("[h4] Caffeine Mode: OFF (Releasing Wake Lock)");
            } catch (err) {
                console.error("[h4] Failed to release wake lock:", err);
            }
        } else {
            // TURN ON (Request Lock)
            try {
                this._wakeLockSentinel = await navigator.wakeLock.request('screen');
                btn.textContent = "(bO_O)b"; // Wide Awake Kirby
                btn.title = "Caffeine Mode: ON (Screen kept awake)";
                btn.style.color = "#00FF00"; // Neon Green
                btn.style.textShadow = "0 0 5px #00FF00";

                // Re-acquire on visibility change (tabs)
                this._wakeLockSentinel.addEventListener('release', () => {
                    // System released it?
                    if (this._wakeLockSentinel !== null) {
                        console.log('[h4] Wake Lock released by system.');
                    }
                });
                console.log("[h4] Caffeine Mode: ON (Wake Lock Active)");
            } catch (err) {
                console.error(`[h4] Failed to request wake lock: ${err.name}, ${err.message}`);
                alert("Wake Lock Failed: " + err.message);
            }
        }
    },

    setupCaffeineButton() {
        const btn = document.createElement("div");
        btn.id = "h4-caffeine-toggle";
        btn.textContent = "(-_-)zzz"; // Default: Sleep
        btn.title = "Caffeine Mode: OFF (Click to keep PC awake)";

        // Style: Fixed Top-Right (Toolbar Territory)
        Object.assign(btn.style, {
            position: "fixed",
            top: "5px",
            right: "140px", // Left of the Settings/Menu buttons usually
            zIndex: "9999",
            color: "#888",
            fontFamily: "monospace",
            fontWeight: "bold",
            fontSize: "14px",
            cursor: "pointer",
            padding: "2px 6px",
            background: "rgba(0,0,0,0.5)",
            borderRadius: "4px",
            border: "1px solid #333",
            userSelect: "none"
        });

        btn.addEventListener("click", () => this.toggleCaffeineMode(btn));

        // Re-acquire lock logic when tab comes back into focus
        document.addEventListener('visibilitychange', async () => {
            if (this._wakeLockSentinel !== null && document.visibilityState === 'visible') {
                if (btn.textContent.includes("O_O")) {
                    try {
                        this._wakeLockSentinel = await navigator.wakeLock.request('screen');
                        console.log("[h4] Caffeine Mode: Lock Re-acquired after visibility change.");
                    } catch (e) {
                        console.log("Re-acquire failed", e);
                    }
                }
            }
        });

        document.body.appendChild(btn);

        // --- KICK IT BUTTON (>_<)!! ---
        this.setupKickItButton(btn);
    },

    // ==============================================================================
    // KICK IT BUTTON (>_<)!!... (Canvas Defibrillator)
    // ==============================================================================
    setupKickItButton(caffeineBtn) {
        const btn = document.createElement("div");
        btn.textContent = "(>_<)!!";
        btn.title = "Give the Grid a kick to refresh the canvas (Fixes frozen noodles)";

        // Style: Left of Caffeine Button
        Object.assign(btn.style, {
            position: "fixed",
            top: "5px",
            right: "220px", // 140px (Caffeine) + ~80px
            zIndex: "9999",
            color: "#ffaa00",
            fontFamily: "monospace",
            fontWeight: "bold",
            fontSize: "14px",
            cursor: "pointer",
            padding: "2px 6px",
            background: "rgba(0,0,0,0.5)",
            borderRadius: "4px",
            border: "1px solid #333",
            userSelect: "none",
            transition: "all 0.1s"
        });

        btn.addEventListener("click", async () => {
            // 1. Flash Face — Visual feedback that the kick is happening
            const origText = btn.textContent;
            btn.textContent = "(0_0)!!!";
            btn.style.color = "#ff0000";
            btn.style.borderColor = "#ff0000";
            btn.style.transform = "scale(1.1)";

            // 2. The Kick — Full graph serialize/reload cycle
            console.log("[h4] KICKING THE GRID (Full Serialize/Reload Cycle)...");
            this._isHandlingError = false;

            try {
                // A. Capture the current graph state as a portable JSON snapshot
                const graphData = app.graph.serialize();
                console.log(`[h4] Graph serialized: ${Object.keys(graphData.nodes || {}).length || graphData.nodes?.length || 0} nodes captured.`);

                // B. Reload the graph from the snapshot
                await app.loadGraphData(graphData);
                console.log("[h4] Graph reloaded from snapshot. All connections re-validated.");

                // C. Force canvas refresh after the reload
                if (app.canvas) {
                    app.canvas.setDirty(true, true);
                    window.dispatchEvent(new Event('resize'));
                    if (typeof app.canvas.draw === 'function') {
                        app.canvas.draw(true, true);
                    }
                }

                // D. Visual success indicator
                btn.textContent = "(^_^)b";
                btn.style.color = "#00ff55";
                btn.style.borderColor = "#00ff55";
                console.log("[h4] Grid Kicked Successfully! Wires should be reconnected.");

            } catch (e) {
                // Serialize/reload failed — fall back to basic canvas restart
                console.error("[h4] Full reload failed, falling back to canvas restart:", e);
                if (app.canvas) {
                    app.canvas.setDirty(true, true);
                    window.dispatchEvent(new Event('resize'));
                    try {
                        if (typeof app.canvas.stopMainLoop === 'function') {
                            app.canvas.stopMainLoop();
                        }
                        setTimeout(() => {
                            if (typeof app.canvas.startMainLoop === 'function') {
                                app.canvas.startMainLoop();
                            }
                            if (typeof app.canvas.draw === 'function') {
                                app.canvas.draw(true, true);
                            }
                            console.log("[h4] Canvas restarted (fallback).");
                        }, 10);
                    } catch (fallbackErr) {
                        console.error("[h4] Fallback also failed:", fallbackErr);
                    }
                }
                // Visual fallback indicator
                btn.textContent = "(~_~)?";
                btn.style.color = "#ffaa00";
            }

            // 3. Reset Button after a short delay
            setTimeout(() => {
                btn.textContent = origText;
                btn.style.color = "#ffaa00";
                btn.style.borderColor = "#333";
                btn.style.transform = "scale(1)";
            }, 1500);
        });

        document.body.appendChild(btn);
    },

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

    hookTheEye(element) {
        if (element.dataset.h4EyeHooked) return;
        element.dataset.h4EyeHooked = "true";

        // Wrap the Eye in a spicy span
        const html = element.innerHTML;
        if (html.includes("👁️")) {
            // Replace first occurrence only
            element.innerHTML = html.replace("👁️", "<span id='h4-secret-eye' style='cursor:pointer; display:inline-block; transition:all 0.3s;'>👁️</span>");

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
                    if (typeof arg === 'object' && arg !== null) {
                        // Check if it's a DOM element or a very complex object
                        if (arg instanceof HTMLElement) return `<${arg.tagName.toLowerCase()} ...>`;
                        if (Array.isArray(arg)) return `Array(${arg.length})`;

                        // [H4] NUCLEAR PERFORMANCE FIX: Do NOT stringify the entire app or graph
                        if (arg.constructor && arg.constructor.name === "ComfyApp") return "[ComfyApp Object]";
                        if (arg.constructor && arg.constructor.name === "LGraph") return "[LGraph Object]";

                        // Limit JSON.stringify for small objects only
                        // We check keys count instead of length to avoid the stringify itself being the bottleneck
                        const keys = Object.keys(arg);
                        if (keys.length > 50) return `[Object with ${keys.length} keys]`;

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
            // PERFORMANCE: Using index-based trim if the buffer gets too massive
            if (self._logBuffer.length > self._logBufferMaxSize) {
                // Remove first 1000 items at once if we hit the limit to avoid constant O(n) shifts
                self._logBuffer.splice(0, 1000);
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
     * NUCLEAR FIX: Truly passive async tracking so UI thread never blocks on body parsing.
     */
    installNetworkInterceptor() {
        if (this._networkInterceptorInstalled) return;
        this._networkInterceptorInstalled = true;
        const self = this;

        // Fetch interception (Fully passive, non-blocking)
        const originalFetch = window.fetch;
        window.fetch = function (...args) {
            const [resource, config] = args;
            const start = Date.now();

            const fetchPromise = originalFetch.apply(this, args);

            // Branch off a passive logging promise chain that does NOT block the main return
            fetchPromise.then(response => {
                const duration = Date.now() - start;
                const cloned = response.clone();
                const contentType = cloned.headers.get('content-type') || '';

                if (contentType.includes('text') || contentType.includes('json')) {
                    cloned.text().then(text => {
                        const body = text.length > 500 ? text.slice(0, 500) + '... (truncated)' : text;
                        self._logBuffer.push({
                            timestamp: new Date().toISOString(),
                            level: 'NETWORK',
                            message: `FETCH ${resource} ${config?.method || 'GET'} ${duration}ms Status: ${response.status} Response: ${body}`
                        });
                    }).catch(() => {
                        self._logBuffer.push({
                            timestamp: new Date().toISOString(),
                            level: 'NETWORK',
                            message: `FETCH ${resource} ${config?.method || 'GET'} ${duration}ms Status: ${response.status} Response: [body read failed]`
                        });
                    });
                } else {
                    self._logBuffer.push({
                        timestamp: new Date().toISOString(),
                        level: 'NETWORK',
                        message: `FETCH ${resource} ${config?.method || 'GET'} ${duration}ms Status: ${response.status} Response: [binary data/stream]`
                    });
                }
            }).catch(err => {
                const duration = Date.now() - start;
                self._logBuffer.push({
                    timestamp: new Date().toISOString(),
                    level: 'NETWORK',
                    message: `FETCH ${resource} FAILED after ${duration}ms Error: ${err}`
                });
            });

            // Return the raw promise immediately so the caller isn't held hostage
            return fetchPromise;
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
                self._logBuffer.push({
                    timestamp: new Date().toISOString(),
                    level: 'NETWORK',
                    message: `WebSocket CONNECT ${url}`
                });
            });
            ws.addEventListener('message', (event) => {
                const dat = typeof event.data === 'string' ?
                    (event.data.length > 500 ? event.data.slice(0, 500) + '...' : event.data) :
                    '[binary]';
                self._logBuffer.push({
                    timestamp: new Date().toISOString(),
                    level: 'NETWORK',
                    message: `WebSocket MSG from ${url}: ${dat}`
                });
            });
            ws.addEventListener('close', (event) => {
                self._logBuffer.push({
                    timestamp: new Date().toISOString(),
                    level: 'NETWORK',
                    message: `WebSocket CLOSE ${url} Code:${event.code}`
                });
            });
            ws.addEventListener('error', () => {
                self._logBuffer.push({
                    timestamp: new Date().toISOString(),
                    level: 'NETWORK',
                    message: `WebSocket ERROR ${url}`
                });
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
        return entries.map(e => `[${e.timestamp}] [${e.level}] ${e.message}`).join('\n');
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
        // [MOVED TO H4 DASHBOARD]
        // Settings are now handled by h4_Dashboard.js and h4_Sidebar.js
        console.log("[h4] BigBrother settings are managed by H4 Dashboard.");
    },

    /**
     * Stealth: Watch the Queue side-panel and discombobulate job entries in real-time.
     * Non-invasive: only touches the Queue UI, not system-critical popups.
     */
    _queueTimer: null,
    startQueueWatcher() {
        const self = this;
        const observer = new MutationObserver((mutations) => {
            // [H4] NUCLEAR PERFORMANCE FIX: Prevent O(n^2) logic during startup
            // Only observe if ComfyUI is fully registered and we are not in the middle of a massive redraw
            if (!app.ui || !app.graph) return;

            // Debounce the discombobulation to prevent pinning the UI thread
            if (this._queueTimer) clearTimeout(this._queueTimer);
            this._queueTimer = setTimeout(() => {
                // Check if discombobulator is on graph first (Nuclear Lean)
                const discombobulator = app.graph?.findNodesByType("H4_Discombobulator")[0] || app.graph?.findNodesByType("h4_Discombobulator")[0];
                if (!discombobulator) return;

                const mode = discombobulator.widgets?.[0]?.value || "1337";

                // Added modern ComfyUI V2 selectors for Top Bar, Menu titles, and Side panels.
                const targets = [
                    ".comfy-queue-item", ".comfy-history-item", ".side-bar-panel-container .comfy-list-item",
                    ".comfy-menu-item", ".comfy-modal-content", ".p-menubar-root-list", ".p-menuitem-text",
                    ".top-bar-button", ".side-bar-button", "h2", "h3", ".comfy-list-item-title"
                ];

                const query = targets.join(", ");
                const items = document.querySelectorAll(query);
                items.forEach(item => this.discombobulateElement(item, mode));
            }, 300);
        });

        // Target the side-bar specifically if possible, otherwise body with strict characterData focus
        const target = document.querySelector(".comfy-side-bar") || document.body;
        observer.observe(target, { childList: true, subtree: true });
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
                try {
                    return btoa(text).slice(0, 30) + "...";
                } catch (e) {
                    return text;
                }
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
        if (this.canvas) return;
        this.canvas = document.createElement("canvas");
        this.canvas.id = "h4-big-brother-ghost";

        // GHOST CSS: Pass through ALL clicks to ComfyUI beneath
        Object.assign(this.canvas.style, {
            position: "absolute",
            top: "0",
            left: "0",
            width: "100%",
            height: "100%",
            pointerEvents: "none", // CRITICAL
            zIndex: "9998"         // Just below ComfyUI menus/modals
        });

        // Insert into the main canvas container
        const container = document.querySelector(".comfyui-body-left") || document.body;
        container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext("2d");

        this.resize();
        window.addEventListener("resize", () => this.resize());
    },

    resize() {
        if (!this.canvas) return;
        this.canvas.width = this.canvas.parentElement.clientWidth || window.innerWidth;
        this.canvas.height = this.canvas.parentElement.clientHeight || window.innerHeight;
    },

    startLoop() {
        if (this.rafId) cancelAnimationFrame(this.rafId);
        const loop = () => {
            this.render();
            this.rafId = requestAnimationFrame(loop);
        };
        this.rafId = requestAnimationFrame(loop);
    },

    render() {
        if (!this.canvas || !this.ctx || !app.canvas) return;

        // 1. Clear the Ghost Layer
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Discombobulator Easter Egg Check
        this.handleDiscombobulatorGlitch();

        // Check master switch
        if (!this._state.enabled) return;

        // Sync transforms with ComfyUI's internal camera
        const ds = app.canvas.ds;
        this.ctx.save();
        this.ctx.translate(ds.offset[0], ds.offset[1]);
        this.ctx.scale(ds.scale, ds.scale);

        // 2. Render Background Grid Wipe
        this.drawGridWipe();

        // 3. Render Surveillance Graphics (Wire highlighting)
        this.drawWires();

        this.ctx.restore();
    },

    // -------------------------------------------------------------------------
    // DISCOMBOBULATOR GLITCH EFFECTS (Rendered on Ghost Layer)
    // -------------------------------------------------------------------------
    handleDiscombobulatorGlitch() {
        // Scan graph for the node occasionally (throttled by time)
        const now = performance.now();
        if (now - this._glitchState.lastGlitchTime > 1000) {
            this._glitchState.lastGlitchTime = now;
            // Only search if the UI is ready
            if (app.graph) {
                const disNode = app.graph.findNodesByType("H4_Discombobulator")[0];
                if (disNode) {
                    // Randomly trigger a glitch based on intensity
                    const intensity = disNode.widgets?.[1]?.value || 0.5;
                    // Example: At 1.0 (max), 50% chance per second to glitch
                    if (Math.random() < (intensity * 0.5)) {
                        this._glitchState.isGlitching = true;
                        this._glitchState.glitchDuration = now + 100 + (Math.random() * 300); // 100-400ms
                        this._glitchState.glitchType = Math.floor(Math.random() * 3);
                    }
                }
            }
        }

        if (this._glitchState.isGlitching) {
            if (now > this._glitchState.glitchDuration) {
                this._glitchState.isGlitching = false;
                return;
            }

            // Render glitch on Ghost Layer (un-scaled, raw screen space)
            const w = this.canvas.width;
            const h = this.canvas.height;
            const ctx = this.ctx;

            ctx.save();
            // We do NOT apply the camera transform here because we want the glitch to affect the "lens"

            switch (this._glitchState.glitchType) {
                case 0: // Chromatic Aberration Simulation (Screen slice shift)
                    const sliceY = Math.random() * h;
                    const sliceH = 20 + Math.random() * 100;
                    const shiftX = (Math.random() - 0.5) * 50;

                    // Draw semi-transparent neon rects to simulate RGB split
                    ctx.fillStyle = "rgba(255, 0, 0, 0.1)";
                    ctx.fillRect(shiftX, sliceY, w, sliceH);
                    ctx.fillStyle = "rgba(0, 255, 255, 0.1)";
                    ctx.fillRect(-shiftX, sliceY + (Math.random() * 10 - 5), w, sliceH);
                    break;

                case 1: // Macro Block corruption
                    ctx.fillStyle = "rgba(0, 255, 0, 0.05)";
                    for (let i = 0; i < 5; i++) {
                        ctx.fillRect(
                            Math.random() * w,
                            Math.random() * h,
                            50 + Math.random() * 200,
                            50 + Math.random() * 100
                        );
                    }
                    break;

                case 2: // Static / Noise band
                    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
                    const bandY = Math.random() * h;
                    for (let i = 0; i < 100; i++) {
                        ctx.fillRect(
                            Math.random() * w,
                            bandY + (Math.random() * 50 - 25),
                            Math.random() * 10,
                            Math.random() * 3
                        );
                    }
                    break;
            }
            ctx.restore();
        }
    },


    drawGridWipe() {
        if (!this._state.showGrid) return;

        const now = performance.now();
        const elapsed = now - this.animStart;

        // Wait for delay
        if (elapsed < this.gridDelay) return;

        const progress = Math.min((elapsed - this.gridDelay) / this.gridDuration, 1.0);

        // Easing: easeOutExpo for a fast start and slow finish
        const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

        const ctx = this.ctx;
        const color = this._state.gridColor;

        // Calculate visible bounding box in graph coordinates
        const ds = app.canvas.ds;
        const winW = this.canvas.width / ds.scale;
        const winH = this.canvas.height / ds.scale;
        const startX = -ds.offset[0] / ds.scale;
        const startY = -ds.offset[1] / ds.scale;
        const endX = startX + winW;
        const endY = startY + winH;

        // The wipe scans horizontally across the screen
        const currentX = startX + (winW * ease);

        const spacing = 100;

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;

        // Vertical lines
        const firstX = Math.floor(startX / spacing) * spacing;
        for (let x = firstX; x <= currentX; x += spacing) {
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
        }

        // Horizontal lines (clipped by currentX)
        const firstY = Math.floor(startY / spacing) * spacing;
        for (let y = firstY; y <= endY; y += spacing) {
            ctx.moveTo(startX, y);
            ctx.lineTo(currentX, y);
        }

        ctx.stroke();

        // Draw the glowing scanner line
        if (progress < 1.0) {
            ctx.beginPath();
            ctx.strokeStyle = "rgba(255, 200, 0, 0.8)";
            ctx.lineWidth = 3;
            ctx.shadowColor = "rgba(255, 200, 0, 1)";
            ctx.shadowBlur = 15;

            ctx.moveTo(currentX, startY);
            ctx.lineTo(currentX, endY);
            ctx.stroke();

            // Reset shadow
            ctx.shadowBlur = 0;
        }
    },

    getNodeOutputPos(node, slot) {
        // Uses LiteGraph internal logic to find the exact pin coordinate
        if (!node.outputs || !node.outputs[slot]) return null;
        return node.getConnectionPos(false, slot);
    },

    getNodeInputPos(node, slot) {
        if (!node.inputs || !node.inputs[slot]) return null;
        return node.getConnectionPos(true, slot);
    },

    drawWires() {
        const t = app.canvas.ds.scale;

        // Determine if we should draw normal wires (not just errors)
        if (this.infectedLinks.size === 0 && !this._state.showWires) return;

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
            setTimeout(() => {
                this._isHandlingError = false;
            }, 1000);
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
        const githubIconSVG = `<svg height="16" viewBox="0 0 16 16" width="16" fill="currentColor" style="display:inline-block; vertical-align:middle; margin-right:5px;"><path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path></svg>`;

        modal.innerHTML = `
            <div class="h4-modal-header" style="color: ${styleColor}; border-bottom: 1px solid ${styleColor};">
                <span class="h4-blink">⚠️ SYSTEM FAULT DETECTED ⚠️</span>
                <span class="h4-modal-close">✕</span>
            </div>
            <div class="h4-modal-body">
                <div class="h4-modal-message">${sanitizedError}</div>
                <div class="h4-modal-trace">${sanitizedTrace}</div>
                <div class="h4-modal-log-title" style="color: ${styleColor};">Recent Console Output (Scrubbed)</div>
                <div class="h4-modal-logs" id="h4-recent-logs">${recentLogs || '(No console logs captured)'}</div>
            </div>
            <div class="h4-modal-footer">
                <button class="h4-btn-copy" id="h4-copy-btn">📋 Copy Report for Dev</button>
                <button class="h4-btn-copy" id="h4-issue-btn" style="background:#222; border-color:#555;">${githubIconSVG} Report Issue</button>
                <button class="h4-btn-copy h4-btn-full-log" id="h4-full-log-btn" style="background:#111; border-color:#444; color:#aaa;">📄 Download Full Log</button>
                <div style="flex-grow:1"></div>
                <div style="font-size:10px; color:#555;">(Personal paths scrubbed automatically)</div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector(".h4-modal-close").onclick = () => modal.remove();

        modal.querySelector("#h4-copy-btn").onclick = () => {
            const report = `=== H4 BUG REPORT ===\n\nERROR:\n${sanitizedError}\n\nTRACE:\n${sanitizedTrace}\n\nRECENT LOGS:\n${recentLogs}`;
            navigator.clipboard.writeText(report);
            const btn = modal.querySelector("#h4-copy-btn");
            btn.textContent = "✅ Copied!";
            btn.style.background = "#004400";
            setTimeout(() => {
                btn.textContent = "📋 Copy Report for Dev";
                btn.style.background = "";
            }, 2000);
        };

        modal.querySelector("#h4-issue-btn").onclick = () => {
            // Encode the error title for the URL
            const title = encodeURIComponent(`[Bug]: ${sanitizedError.split('\n')[0].substring(0, 50)}...`);

            // Format the body for GitHub markdown
            const body = encodeURIComponent(
                `### Describe the bug
${sanitizedError}

### Traceback
\`\`\`python
${sanitizedTrace}
\`\`\`

### Recent Logs
\`\`\`log
${recentLogs.substring(0, 2000)}${recentLogs.length > 2000 ? '\n...[truncated]' : ''}
\`\`\`

*(Paste full log file here if downloaded)*
`
            );

            const url = `https://github.com/h4-f/h4_Live/issues/new?title=${title}&body=${body}`;
            window.open(url, '_blank');
        };

        modal.querySelector("#h4-full-log-btn").onclick = () => {
            const fullLog = this.sanitizeLog(this.getFullLog());
            const blob = new Blob([
                `=== H4 FULL DIAGNOSTIC LOG ===\n`,
                `Generated: ${new Date().toISOString()}\n`,
                `Error: ${sanitizedError}\n`,
                `Trace: ${sanitizedTrace}\n\n`,
                `--- FULL LOG STREAM ---\n\n`,
                fullLog
            ], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `h4_diagnostic_${Date.now()}.log`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        };
    },

    /**
     * Sanitizes strings to remove personal user paths (Windows and Linux/Mac).
     * @param {string} str - The string to sanitize
     * @returns {string} The scrubbed string
     */
    sanitizeLog(str) {
        if (!str || typeof str !== 'string') return "";
        let safe = str;

        // Windows: C:\Users\Username\ -> [USER_DIR]\
        safe = safe.replace(/[A-Za-z]:\\Users\\[^\\]+\\/gi, "[USER_DIR]\\");

        // Linux/Mac: /home/username/ -> [USER_DIR]/ or /Users/username/ -> [USER_DIR]/
        safe = safe.replace(/\/home\/[^\/]+\//gi, "[USER_DIR]/");
        safe = safe.replace(/\/Users\/[^\/]+\//gi, "[USER_DIR]/");

        return safe;
    },

    injectCSS() {
        if (document.getElementById("h4-bb-css")) return;
        const style = document.createElement("style");
        style.id = "h4-bb-css";
        style.textContent = `
            .h4-death-modal {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 800px; /* Wider to accommodate logs */
                max-width: 90vw;
                background: #0a0a0a;
                border: 2px solid; /* Color driven by JS */
                color: #ff5555;
                font-family: monospace;
                padding: 0;
                z-index: 10000;
                border-radius: 8px;
                display: flex;
                flex-direction: column;
            }
            .h4-modal-header {
                display: flex;
                justify-content: space-between;
                padding: 10px 15px;
                font-weight: bold;
                background: #111;
            }
            .h4-blink {
                animation: h4-blink 1s infinite;
            }
            @keyframes h4-blink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.2; }
            }
            .h4-modal-close {
                cursor: pointer;
                color: #888;
            }
            .h4-modal-close:hover {
                color: #fff;
            }
            .h4-modal-body {
                padding: 15px;
                display: flex;
                flex-direction: column;
                gap: 10px;
                max-height: 70vh; /* Don't exceed screen height */
            }
            .h4-modal-message {
                font-size: 14px;
                background: rgba(255,0,0,0.1);
                padding: 10px;
                border-left: 4px solid #ff0000;
                word-wrap: break-word;
            }
            .h4-modal-trace {
                background: #000;
                color: #aaa;
                padding: 10px;
                font-size: 11px;
                white-space: pre-wrap;
                overflow-x: auto;
                max-height: 150px;
                border: 1px solid #333;
            }
            .h4-modal-log-title {
                font-size: 12px;
                font-weight: bold;
                margin-top: 5px;
            }
            .h4-modal-logs {
                background: #050505;
                color: #888;
                padding: 10px;
                font-size: 10px;
                white-space: pre-wrap;
                overflow-y: auto;
                flex-grow: 1; /* Take remaining space */
                min-height: 100px;
                border: 1px solid #222;
            }
            .h4-modal-footer {
                padding: 10px 15px;
                background: #111;
                border-top: 1px solid #333;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .h4-btn-copy {
                background: #333;
                color: #fff;
                border: 1px solid #555;
                padding: 5px 15px;
                cursor: pointer;
                border-radius: 4px;
                font-family: monospace;
                font-weight: bold;
                transition: 0.2s;
                display: flex;
                align-items: center;
            }
            .h4-btn-copy:hover {
                background: #555;
            }
            .h4-btn-full-log:hover {
                color: #fff !important;
                border-color: #888 !important;
            }
        `;
        document.head.appendChild(style);
    }
});
