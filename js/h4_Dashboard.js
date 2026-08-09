import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { LORE } from "./h4_Lore.js";

console.log("[h4] h4_Dashboard.js LOADED // HARDENED v10.5.0");

// ------------------------------------------------------------------------------
// H4 Dashboard - The Central Hub (Hardened Implementation)
// ------------------------------------------------------------------------------

export const h4_Dashboard = {
    modal: null,
    isOpen: false,
    activeTab: 'active-home',
    panelMode: 'modal', // 'modal' | 'pinned' | 'popout'

    // Internal state for hardening and performance
    _renderedTabs: new Set(),
    _hoverMoveListener: null,
    _popoutWindow: null,
    _dragState: { active: false, x: 0, y: 0, startX: 0, startY: 0 },
    _cssText: null, // Cache for popout injection
    LORE: LORE,

    // Configuration State (Security First - Defaults to OFF)
    config: {
        // Core
        enabled: true,
        debugMode: false,
        qolMasterOverride: true,

        // Monitor
        monitorEnabled: false,
        showErrorPopup: false,

        // Visual Assets
        showGrid: false,
        showWires: false,
        wireStyle: "Circuit",
        wireSpacing: 1.0,
        wireColorSelect: "#00F2FF",
        wireColorError: "#FF3333",
        gridColor: "rgba(0, 242, 255, 0.05)",

        // UI Hygiene (QoL)
        deadWeightEnabled: true,
        caffeineEnabled: false, // Default OFF
        kickItEnabled: false,   // Default OFF
        civitaiGlobalToggle: true,
        civitaiBridgeEnabled: true,
        civitaiAutoInject: true,
        civitaiSidecars: true,
        civitaiPreviewSidecars: true,
        civitaiHoverTooltip: true,
        civitaiApiKey: "",
        smartSnapping: false,
        ioColoring: false,

        // Aesthetic Layer
        sovereignCoreEnabled: true,

        // Viewport Settings
        panelPinned: false,         // Default: Not pinned
        panelWidth: 350,            // Default side-panel width

        // Offsets
        offsetX: 0,
        offsetY: 0,
    },

    init() {
        console.log("[h4] Dashboard: Hardened Deployment Initiated...");
        try {
            this.injectCSS();
            this.createModal();
            this.loadConfig();
            this.initDraggable();

            // Check if we should auto-pin on load
            if (this.config.panelPinned) {
                this.setPanelMode('pinned');
            }
            // Restore drag position from last session
            if (this.config.offsetX || this.config.offsetY) {
                this.modal.style.transform = `translate(${this.config.offsetX}px, ${this.config.offsetY}px)`;
            }
            window.h4_Dashboard = this;
            console.log("[h4] Dashboard: System Ready.");
        } catch (error) {
            console.error("[h4] Dashboard: CRITICAL FAULT", error);
        }
    },

    toggle() {
        if (!this.modal) return;
        const isOpen = this.modal.classList.contains("open");
        if (isOpen) {
            this.close();
        } else {
            this.open();
        }
    },

    open() {
        if (!this.modal) return;
        if (this.panelMode === 'popout' && this._popoutWindow && !this._popoutWindow.closed) {
            this._popoutWindow.focus();
            return;
        }

        this.modal.style.display = "flex";
        requestAnimationFrame(() => {
            this.modal.classList.add("open");
        });

        // Lazy Render Logic: Prevent unnecessary DOM destruction
        if (!this._renderedTabs.has(this.activeTab)) {
            this.renderTab(this.activeTab);
            this._renderedTabs.add(this.activeTab);
        }
    },

    close() {
        if (!this.modal) return;
        this.modal.classList.remove("open");
        setTimeout(() => {
            if (!this.modal.classList.contains("open")) {
                this.modal.style.display = "none";
            }
        }, 300); // matches the CSS opacity transition duration
    },

    createModal() {
        if (document.getElementById("h4-dashboard-modal")) return;

        const el = document.createElement("div");
        el.id = "h4-dashboard-modal";
        el.className = "h4-glitch-container";

        el.innerHTML = `
            <div class="h4-dash-content">
                <div class="h4-dash-header h4-drag-handle">
                    <div class="h4-dash-title">h4_LIVE // SYSTEM_CONFIG</div>
                    <div class="h4-header-controls">
                        <div class="h4-panel-btn h4-btn-dock" title="Dock to Left" style="font-weight:900; font-family:monospace; font-size:13px; padding:0 7px; border-radius:4px; border:1px solid #444; background:rgba(0,180,255,0.08); color:#00b4ff; cursor:pointer; display:flex; align-items:center; height:22px; margin:0 2px;">D</div>
                        <div class="h4-dash-close" title="Close Panel" style="font-weight:900; font-family:monospace; font-size:15px; padding:0 7px; border-radius:4px; border:1px solid #444; background:rgba(255,80,80,0.08); color:#ff5050; cursor:pointer; display:flex; align-items:center; height:22px; margin:0 2px;">✕</div>
                    </div>
                </div>
                
                <div class="h4-dash-body">
                    <div class="h4-dash-sidebar">
                        <div class="h4-dash-header-small">SYSTEM</div>
                        <div class="h4-tab-btn active" data-tab="active-home" title="System Status Overview">HOME</div>
                        <div class="h4-tab-btn" data-tab="active-debug" title="Forensic Debugging Protocols">DEBUG</div>
                        <div class="h4-tab-btn" data-tab="active-qol" title="Quality of Life Enhancements">QoL</div>
                        <div class="h4-tab-btn" data-tab="active-wires" title="Tactile Connection Styling">WIRE ADJ</div>
                        
                        <div class="h4-dash-header-small" style="margin-top:20px;">LIBRARY</div>
                        <div class="h4-tab-btn" data-tab="active-nodes" title="Node Lore and Information Archives">NODES</div>
                        <div class="h4-tab-btn" data-tab="active-about" title="Project Intelligence">ABOUT</div>
                    </div>
                    
                    <div class="h4-dash-main">
                        <div id="h4-tab-home" class="h4-tab-pane"></div>
                        <div id="h4-tab-debug" class="h4-tab-pane"></div>
                        <div id="h4-tab-qol" class="h4-tab-pane"></div>
                        <div id="h4-tab-wires" class="h4-tab-pane"></div>
                        <div id="h4-tab-nodes" class="h4-tab-pane"></div>
                        <div id="h4-tab-about" class="h4-tab-pane"></div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(el);
        this.modal = el;

        // Header Control Events
        el.querySelector(".h4-btn-dock").onclick = (e) => {
            e.stopPropagation();
            this.togglePin();
        };
        el.querySelector(".h4-dash-close").onclick = () => {
            const dash = window.h4_Dashboard;
            dash.modal.classList.remove("open");
            setTimeout(() => {
                if (!dash.modal.classList.contains("open"))
                    dash.modal.style.display = "none";
            }, 300);
        };

        const tabs = el.querySelectorAll(".h4-tab-btn");
        tabs.forEach(t => {
            t.onclick = (e) => {
                const targetTab = e.currentTarget.dataset.tab;
                if (this.activeTab === targetTab && this._renderedTabs.has(targetTab)) return;

                tabs.forEach(x => x.classList.remove("active"));
                e.currentTarget.classList.add("active");

                this.activeTab = targetTab;
                this.renderTab(this.activeTab);
            }
        });
    },

    renderTab(tabName) {
        // Dispatch Table Renderer (Architectural Smell Cleaned)
        const renderers = {
            'active-home': (p) => this.renderHome(p),
            'active-debug': (p) => this.renderDebug(p),
            'active-qol': (p) => this.renderQoL(p),
            'active-wires': (p) => this.renderWires(p),
            'active-nodes': (p) => this.renderNodes(p),
            'active-about': (p) => this.renderRealAbout(p)
        };

        this.modal.querySelectorAll(".h4-tab-pane").forEach(p => p.style.display = "none");
        const paneId = `h4-tab-${tabName.replace('active-', '')}`;
        const p = document.getElementById(paneId);

        if (p && renderers[tabName]) {
            p.style.display = "block";
            renderers[tabName](p);
            this._renderedTabs.add(tabName);
        }
    },

    // START OF ACTUAL ABOUT CONTENT RE-IMPLEMENTATION
    renderRealAbout(container) {
        container.innerHTML = `
            <div class="h4-about-text">
                <h3>About h4_Live</h3>
                <p>
                    Node pack was designed for what I thought Comfyui needed. It's got some QoL improvements and enhancements, new features and a pleathora of nodes. 
                    The Nodes, range from flow control, to pointless to debugging. I use them all, this was a node pack primarily for me and my friends, but given the fact I've had about a dozen people ask for it so far (GREAT For my ego) , I figured, let's over-engineer the fuck outta this and make something really cool. 
                    So I think I did, and I'm adding to it almost daily (for now) and updating it frequently.
                </p>
                <div style="margin-top:20px; font-style:italic; color:#aaa;">
                    Big Thanks to Adam, for being supportive and backing me.<br>
                    KJ, Crystools, EasyUse, Video Helper Suite... lord who else? I dunno.<br><br>
                    Thank you to everyone who helped me with this, and to those of you who inspired me to do this.
                </div>
                <div style="margin-top:20px; text-align:center; font-family:monospace; color:#555;">
                    "You're only at your best, when you've been through your worst"<br>
                    - h4 - { Be Your Best }<br>
                    (b'.')b
                </div>
            </div>
        `;
    },

    // --- HELPERS ---
    addBool(container, key, label, tooltip) {
        const row = document.createElement("div");
        row.className = "h4-set-row";
        row.title = tooltip || "";
        row.innerHTML = `
            <div class="h4-set-label">${label}</div>
            <div class="h4-set-ctrl">
                <label class="h4-toggle">
                    <input type="checkbox" id="h4-cfg-${key}" ${this.config[key] ? "checked" : ""}>
                    <span class="h4-slider"></span>
                </label>
            </div>
        `;
        const chk = row.querySelector("input");
        chk.onchange = (e) => this.setConfig(key, e.target.checked);
        container.appendChild(row);
        this.injectToggleCSS();
    },

    addSlider(container, key, label, min, max, step, tooltip) {
        const row = document.createElement("div");
        row.className = "h4-set-row";
        row.title = tooltip || "";
        // Simple slider UI
        row.innerHTML = `
            <div class="h4-set-label">${label}</div>
            <div class="h4-set-ctrl" style="display:flex; align-items:center; gap:10px;">
                <input type="range" min="${min}" max="${max}" step="${step}" value="${this.config[key] || 0}">
                <span style="font-family:monospace; color:#00f2ff; width:30px; text-align:right;">${this.config[key] || 0}</span>
            </div>
        `;
        const input = row.querySelector("input");
        const valDisp = row.querySelector("span");
        input.oninput = (e) => {
            valDisp.textContent = e.target.value;
            this.setConfig(key, parseFloat(e.target.value));
        };
        container.appendChild(row);
    },

    addColor(container, key, label, tooltip) {
        const row = document.createElement("div");
        row.className = "h4-set-row";
        row.title = tooltip || "";
        row.innerHTML = `
            <div class="h4-set-label">${label}</div>
            <div class="h4-set-ctrl">
                <input type="color" value="${this.config[key] || '#00FF00'}" style="border:none; background:none; cursor:pointer;">
            </div>
        `;
        const input = row.querySelector("input");
        input.oninput = (e) => this.setConfig(key, e.target.value);
        container.appendChild(row);
    },

    // --- RENDERERS ---

    renderDebug(container) {
        container.innerHTML = "<h2 class='h4-panel-title'>DEBUG PROTOCOLS</h2>";
        this.addBool(container, "debugMode", "Nuclear Debug Mode", "Enables verbose logging (Nuclear Protocol).");
    },

    renderQoL(container) {
        container.innerHTML = "<h2 class='h4-panel-title'>QUALITY OF LIFE</h2>";

        // 1. MASTER GATE
        const masterBox = document.createElement("div");
        masterBox.style.cssText = "background: rgba(0,242,255,0.05); border: 1px solid rgba(0,242,255,0.2); padding: 15px; margin-bottom: 12px; border-radius: 4px;";
        this.addBool(masterBox, "qolMasterOverride", "MASTER QoL OVERRIDE", "The primary jurisdiction gatekeeper. When disabled, all subordinate QoL enhancements are silenced and detached from the system.");
        container.appendChild(masterBox);

        // 1B. GLOBAL CIVITAI BRIDGE MASTER TOGGLE
        const civitaiMasterBox = document.createElement("div");
        civitaiMasterBox.style.cssText = "background: rgba(97, 175, 239, 0.08); border: 1px solid rgba(97, 175, 239, 0.3); padding: 15px; margin-bottom: 20px; border-radius: 6px; box-shadow: 0 0 15px rgba(97, 175, 239, 0.15);";
        this.addBool(civitaiMasterBox, "civitaiGlobalToggle", "GLOBAL CIVITAI BRIDGE MASTER TOGGLE", "Master control switch for all Civitai Bridge QoL features. When enabled, Civitai search, downloads, auto-inject, sidecars, and model hover preview tooltips are active system-wide.");
        container.appendChild(civitaiMasterBox);

        const groupStyle = "color: #555; font-size: 10px; letter-spacing: 2px; margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid #222; padding-bottom: 5px;";

        // 2. CANVAS HACKS
        const h1 = document.createElement("div"); h1.style.cssText = groupStyle; h1.textContent = "CANVAS HYGIENE";
        container.appendChild(h1);
        this.addBool(container, "enabled", "Big Brother Overlay", "Engages the global Passive Surveillance Grid. When enabled, a tactical HUD overlay monitors canvas activity, selected nodes, and active data streams in real-time.");
        this.addBool(container, "showGrid", "Cyberpunk Grid", "Renders an animated, high-fidelity background grid. Provides visual depth and alignment anchors for complex tactical workflows.");
        this.addBool(container, "showWires", "Data Flow Wires", "Enables predictive connection highlighting. Active or selected node paths will glow with data-flow energy, making signal tracing intuitive in dense graphs.");
        this.addBool(container, "deadWeightEnabled", "Dead Weight Detector", "Deploys the D.W.D (Kirby) unit to the main toolbar. Scans the active graph for orphaned nodes, broken links, and logical dead-ends.");
        this.addBool(container, "monitorEnabled", "Passive System Monitor", "Exfiltrates system events, execution logs, and network telemetry directly to the console controller for forensic debugging.");

        // 3. UI ENHANCEMENTS
        const h2 = document.createElement("div"); h2.style.cssText = groupStyle; h2.textContent = "UI INTERFACE";
        container.appendChild(h2);
        this.addBool(container, "sovereignCoreEnabled", "H4 Node Aesthetic", "Enforces Sovereign H4 Branding across the canvas. Themes all compatible nodes with the signature cyan-and-black aesthetic for visual consistency.");
        this.addBool(container, "caffeineEnabled", "Caffeine Mode Button", "Adds the wake-lock override (Kirby Sleep) to the toolbar. Prevents the display from entering low-power states during long generation sequences.");
        this.addBool(container, "kickItEnabled", "Kick-The-Grid Button", "Installs the canvas defibrillator in the toolbar. Force-refreshes the LiteGraph rendering pipeline to resolve ghost artifacts or UI stutters.");
        this.addBool(container, "civitaiBridgeEnabled", "Civitai Bridge Button", "Installs the Civitai Bridge button in the top toolbar to the left of Kick-The-Grid. Slide out the browser to search, preview, download, and inject models.");
        this.addBool(container, "civitaiAutoInject", "Auto-Inject Model to Node", "Automatically populates the active model filename into selected LoRA/Checkpoint loader nodes upon download.");
        this.addBool(container, "civitaiSidecars", "Create Metadata Sidecars", "Automatically extracts trigger words and model specifications into .txt and .json sidecars on download.");
        this.addBool(container, "civitaiPreviewSidecars", "Create Preview Image Sidecars", "Automatically downloads thumbnail images as .preview.png alongside downloaded models for ComfyUI dropdown cards.");
        this.addBool(container, "civitaiHoverTooltip", "Hover Model Preview Tooltip", "Displays a mouse-tracking hover preview tooltip with image, trigger words, and specs when hovering over models.");
        this.addBool(container, "showErrorPopup", "Red Screen of Death", "Replaces generic alerts with a high-fidelity forensic error modal. Provides detailed stack traces and system state snapshots upon execution failure.");

        // 4. EXPERIMENTAL
        const h3 = document.createElement("div"); h3.style.cssText = groupStyle; h3.textContent = "EXPERIMENTAL QoL";
        container.appendChild(h3);
        this.addBool(container, "smartSnapping", "Node Snapping", "Engages sub-pixel magnetic alignment. Ensures nodes snap into professional, grid-aligned positions automatically.");
        this.addBool(container, "ioColoring", "Dynamic Input Coloring", "Real-time socket chromatic analyzer. Colors input and output ports based on their data class (Images, Tensors, Flow) for rapid identification.");

        // Visual dimming if master is off
        const refreshDim = () => {
            const isMasterOn = this.config.qolMasterOverride;
            const rows = container.querySelectorAll(".h4-set-row");
            rows.forEach(row => {
                const id = row.querySelector("input")?.id;
                if (id !== "h4-cfg-qolMasterOverride") {
                    row.style.opacity = isMasterOn ? "1" : "0.3";
                    row.style.pointerEvents = isMasterOn ? "auto" : "none";
                }
            });
        };

        // Hook the master toggle to refresh the UI
        setTimeout(() => {
            const masterChk = container.querySelector("#h4-cfg-qolMasterOverride");
            if (masterChk) {
                const origOnChange = masterChk.onchange;
                masterChk.onchange = (e) => {
                    origOnChange(e);
                    refreshDim();
                };
            }
            refreshDim();
        }, 10);
    },

    renderWires(container) {
        container.innerHTML = "<h2 class='h4-panel-title'>WIRE ADJUSTMENTS</h2>";

        // Offsets
        const h1 = document.createElement("div"); h1.className = "h4-set-group"; h1.textContent = "OFFSETS";
        container.appendChild(h1);
        this.addSlider(container, "offsetX", "Global Offset X", -100, 100, 1, "Shift grid X");
        this.addSlider(container, "offsetY", "Global Offset Y", -100, 100, 1, "Shift grid Y");
        this.addSlider(container, "wireOffsetY", "Wire Offset Y", -50, 50, 1, "Shift wires Y");
        this.addSlider(container, "wireSpacing", "Wire Spacing", 0.1, 5.0, 0.1, "Spread between wires");

        // Colors
        const h2 = document.createElement("div"); h2.className = "h4-set-group"; h2.textContent = "COLORS";
        container.appendChild(h2);
        this.addColor(container, "wireColorSelect", "Selected Wire Color");
        this.addColor(container, "wireColorError", "Error Wire Color");
        this.addColor(container, "gridColor", "Grid Color");

        // Style
        const h3 = document.createElement("div"); h3.className = "h4-set-group"; h3.textContent = "STYLE";
        container.appendChild(h3);
        // Simple dropdown for style
        const row = document.createElement("div");
        row.className = "h4-set-row";
        row.innerHTML = `
                <div class="h4-set-label">Wire Style</div>
                <div class="h4-set-ctrl">
                    <select style="background:#222; color:#fff; border:1px solid #444; padding:5px;">
                        <option value="Circuit" ${this.config.wireStyle === "Circuit" ? "selected" : ""}>Circuit</option>
                        <option value="Linear" ${this.config.wireStyle === "Linear" ? "selected" : ""}>Linear</option>
                        <option value="Bezier" ${this.config.wireStyle === "Bezier" ? "selected" : ""}>Bezier</option>
                    </select>
                </div>
            `;
        row.querySelector("select").onchange = (e) => this.setConfig("wireStyle", e.target.value);
        container.appendChild(row);
    },

    injectToggleCSS() {
        if (!document.getElementById("h4-toggle-css")) {
            const style = document.createElement("style");
            style.id = "h4-toggle-css";
            style.textContent = `
                .h4-toggle { position: relative; display: inline-block; width: 40px; height: 20px; }
                .h4-toggle input { opacity: 0; width: 0; height: 0; }
                .h4-slider {
                    position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
                    background-color: #1a1a1a; transition: .4s; border-radius: 20px;
                    border: 1px solid #333;
                }
                .h4-slider:before {
                    position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 2px;
                    background-color: #555; transition: .4s; border-radius: 50%;
                }
                input:checked + .h4-slider { background-color: rgba(0,242,255,0.15); border-color: #00f2ff; }
                input:checked + .h4-slider:before { transform: translateX(20px); background-color: #00f2ff; box-shadow: 0 0 5px #00f2ff; }
            `;
            document.head.appendChild(style);
        }
    },

    renderNodes(container) {
        container.innerHTML = "";

        // 1. Search Bar
        const searchRow = document.createElement("div");
        searchRow.style.cssText = "margin-bottom: 20px; display: flex; gap: 10px;";
        searchRow.innerHTML = `
            <input type="text" placeholder="SEARCH PROTOCOLS..." style="
                flex: 1; background: rgba(0,0,0,0.3); border: 1px solid #333; color: #00f2ff;
                padding: 10px; font-family: monospace; font-size: 16px; outline: none;
            ">
        `;
        container.appendChild(searchRow);

        // 2. Node Grid Container
        const grid = document.createElement("div");
        grid.className = "h4-node-grid";
        container.appendChild(grid);

        // 3. Gather Nodes
        function getRandomIcon() {
            const icons = ["{:}", "[+]", "<*>", "//", "#!", "{?}", "[x]", ">>", "**", "&&", "$$", "%%", "@@", "(o)", "[ ]"];
            return icons[Math.floor(Math.random() * icons.length)];
        }

        const h4Nodes = [];
        const nodes = LiteGraph?.registered_node_types;
        if (nodes) {
            for (const key in nodes) {
                if (key.toLowerCase().startsWith("h4_")) {
                    h4Nodes.push({ type: key, def: nodes[key] });
                }
            }
        }

        if (h4Nodes.length === 0) {
            grid.innerHTML = "<div style='padding:20px; grid-column: 1/-1; color:#444; font-family:monospace;'>[ SYSTEM_OFFLINE ]: NO H4_SIGNALS_DETECTED</div>";
            return;
        }

        // 4. Render Loop
        const render = (filter = "") => {
            grid.innerHTML = "";
            h4Nodes.forEach(n => {
                const title = n.def.title || n.type;
                const cleanTitle = title.replace(/^h4\s*-\s*/i, "").replace(/^H4\s*/, "");

                if (filter && !cleanTitle.toLowerCase().includes(filter.toLowerCase()) && !n.type.toLowerCase().includes(filter.toLowerCase())) return;

                const card = document.createElement("div");
                card.className = "h4-node-card";
                card.innerHTML = `
                    <div class="h4-node-icon">${getRandomIcon()}</div>
                    <div class="h4-node-title">${cleanTitle}</div>
                    <div class="h4-node-type">${n.type}</div>
                    <div class="h4-btn-summon">SUMMON_NODE</div>
                `;

                // --- EVENTS ---
                // Click Card -> Open Docs ("The Book of H4")
                card.onclick = (e) => {
                    if (e.target.classList.contains("h4-btn-summon")) return;
                    this.openNodeDocs(n);
                };

                // Summon Button
                const btnSummon = card.querySelector(".h4-btn-summon");
                btnSummon.onclick = (e) => {
                    e.stopPropagation();
                    this.summonNode(n.type);
                };

                grid.appendChild(card);
            });
        };

        render();
        searchRow.querySelector("input").oninput = (e) => render(e.target.value);
        this.injectNodeGridCSS();
    },

    injectNodeGridCSS() {
        if (!document.getElementById("h4-node-grid-css")) {
            const style = document.createElement("style");
            style.id = "h4-node-grid-css";
            style.textContent = `
                .h4-node-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 15px;
                    padding: 10px;
                    padding-bottom: 50px;
                }
                .h4-node-card {
                    background: rgba(255,255,255,0.03);
                    border: 1px solid #333;
                    border-radius: 4px;
                    padding: 15px;
                    display: flex; flex-direction: column; align-items: center; text-align: center;
                    cursor: pointer; transition: all 0.2s;
                    position: relative;
                    overflow: hidden;
                    
                    /* LIFTED TILE EFFECT */
                    box-shadow: 0 4px 6px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.3);
                    transform: translateY(0);
                }
                .h4-node-card:hover {
                    background: rgba(0,242,255,0.05);
                    border-color: #00f2ff;
                    /* LIFT EFFECT ON HOVER */
                    transform: translateY(-4px);
                    box-shadow: 0 10px 20px rgba(0,0,0,0.6), 0 0 10px rgba(0,242,255,0.1);
                }
                /* ASCII Icons */
                .h4-node-icon { 
                    font-size: 24px; margin-bottom: 10px; opacity: 0.8; 
                    font-family: monospace; color: #00f2ff; text-shadow: 0 0 5px rgba(0,242,255,0.5);
                }
                .h4-node-title { font-weight: bold; color: #eee; margin-bottom: 5px; font-size: 0.9em; text-transform: uppercase; letter-spacing: 1px; }
                .h4-node-type { font-size: 0.6em; color: #666; font-family: monospace; margin-bottom: 15px; }

                /* Summon Button */
                .h4-btn-summon {
                    background: #222; border: 1px solid #444; color: #888;
                    font-family: monospace; font-size: 10px; padding: 4px 10px;
                    cursor: pointer; transition: all 0.2s; width: 100%;
                }
                .h4-btn-summon:hover {
                    background: #00f2ff; color: #000; border-color: #00f2ff;
                    box-shadow: 0 0 10px #00f2ff; font-weight: bold;
                }

                /* Toast */
                .h4-toast { animation: fadeInOut 2s forwards; }

                /* Hover Preview */
                #h4-hover-preview {
                    position: fixed; z-index: 11000;
                    background: rgba(10,10,10,0.95);
                    border: 1px solid #00f2ff;
                    box-shadow: 0 0 20px rgba(0,0,0,0.8);
                    padding: 10px;
                    width: 250px;
                    pointer-events: none;
                    display: none;
                    backdrop-filter: blur(5px);
                    font-family: monospace;
                }

                /* Doc Overlay */
                .h4-doc-overlay {
                    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.8);
                    z-index: 20;
                    display: flex; justify-content: flex-end; /* Slide in from right? */
                    opacity: 0; transition: opacity 0.3s;
                    backdrop-filter: blur(2px);
                }
                .h4-doc-overlay.open { opacity: 1; }
                
                .h4-doc-content {
                    width: 60%; height: 100%;
                    background: #080808;
                    border-left: 1px solid #333;
                    box-shadow: -10px 0 30px rgba(0,0,0,0.5);
                    transform: translateX(100%); transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    padding: 40px;
                    overflow-y: auto;
                    position: relative;
                }
                .h4-doc-overlay.open .h4-doc-content { transform: translateX(0); }

                .h4-doc-close {
                    position: absolute; top: 20px; right: 20px;
                    color: #555; border: 1px solid #333; padding: 5px 10px;
                    font-family: monospace; cursor: pointer; font-size: 10px;
                }
                .h4-doc-close:hover { color: #fff; border-color: #fff; }
                
                .h4-doc-content h1 { color: #00f2ff; margin-top: 0; font-family: monospace; letter-spacing: -1px; }
                .h4-doc-meta { font-family: monospace; color: #444; font-size: 12px; }
                .h4-doc-body { line-height: 1.6; color: #ccc; }
                .h4-doc-body h3 { color: #fff; border-bottom: 1px solid #222; display: inline-block; margin-bottom: 10px; font-size: 14px; font-family: monospace; }
                .h4-doc-body ul { padding-left: 20px; color: #888; font-family: monospace; font-size: 12px; }
                .h4-doc-body li { margin-bottom: 5px; }
            `;
            document.head.appendChild(style);
        }
    },

    // --- LORE ARCHIVES ---

    LORE: {
        // --- LOGIC & TRAFFIC CONTROL ---
        "H4_TrafficRouter": {
            "title": "H4 Traffic Router // THE NEXUS",
            "description": "The ultimate workflow orchestrator. The Nexus merges 'Start' and 'Loop' flows into a single, high-performance execution stream. It features an intelligent denoise controller that automatically shifts values between your setup phase and your refinement loops, ensuring perfectly crisp results without manual intervention.",
            "usage": "Connect your initial data to the 'Start' socket and your recursive feedback to the 'Loop' socket. The node handles the switching logic based on the run count.",
            "tips": ["Use 'Restart' to clear the counter and return to the Setup phase instantly.", "Pair with H4_SmartSave to auto-sort logs by loop depth."]
        },
        "H4_TrafficCop": {
            "title": "H4 Traffic Cop // THE FORK",
            "description": "A surgical logic gate designed for A/B routing. The Cop monitors the system state and directs traffic to different branches of your workflow depending on whether you are in the first run or a subsequent loop. It features 'Safe Passthrough' to prevent workflow crashes by ensuring a valid signal is always sent to both outputs.",
            "usage": "Place this at a decision point where you need different logic for the initialization phase vs the refinement phase.",
            "tips": ["Enable 'Restart on True' to loop back to the start of the logic sequence."]
        },
        "H4_TrafficMerge": {
            "title": "H4 Traffic Merge // THE ZIPPER",
            "description": "The companion to the Traffic Cop. The Zipper seamlessly stitches two divergent data streams back into a single pipeline. It features a built-in wireless receiver that can capture data from an H4_ImageBuffer to eliminate the 'Cycle Error' common in complex ComfyUI loops.",
            "usage": "Use this to recombine parallel logic paths. Leave the 'Loop' input empty to trigger Wireless Mode and bypass wiring constraints.",
            "tips": ["Always check the 'Denoise' output to feed your sampler the correct value for the current run."]
        },
        "H4_StateMonitor": {
            "title": "H4 State Monitor // THE COUNTER",
            "description": "A high-visibility forensic counter that asks the system: 'What run is this?' It extracts the loop iteration directly from the h4 core memory and displays it on the node. Invaluable for debugging complex logic and ensuring your resets are firing correctly.",
            "usage": "Connect the 'Any_In' socket to your logic gate to ensure the monitor waits for the reset signal before reporting.",
            "tips": ["Use the 'loop_count_number' output to drive math nodes or dynamic file naming."]
        },
        "H4_LoopIncrementer": {
            "title": "H4 Loop Incrementer // THE CLICKER",
            "description": "The manual driver for your loops. It explicitly bumps the iteration counter only when it receives a signal. This allows you to separate the 'Logic' of your router from the 'Action' of your workflow, giving you surgical control over exactly when a loop concludes.",
            "usage": "Connect any output from your main processing chain to the 'Pulse' socket to trigger the increment.",
            "tips": ["Enable 'Wireless Reset' to clear the system state via a remote signal from an H4_WirelessResetButton."]
        },
        "H4_WirelessResetButton": {
            "title": "H4 Wireless Reset Button // RED BUTTON",
            "description": "A sovereign UI control that transmits a reset signal across the entire toolkit without a single wire. When toggled, it broadcasts a 'Request Reset' command to all H4 logic nodes, instantly returning the workspace to Run 0.",
            "usage": "Keep this near your output previews to quickly reset and iterate on a new seed or prompt.",
            "tips": ["The status display will confirm 'RESET SENT' once the command is acknowledged by the logic nodes."]
        },
        "H4_ImageBuffer": {
            "title": "H4 Universal Buffer // ANTI-LAG UNIT",
            "description": "The solution to the ComfyUI 'Cycle Lag'. Standard loops often suffer from a 1-cycle delay where data from Run N only arrives at the input during Run N+2. The Universal Buffer intercepts and holds ANY data type—Images, Latents, or Strings—to provide an immediate feedback bridge for the next run.",
            "usage": "Connect your processed data to 'Image_In' to store it, and use the 'Buffered_Data' output at the start of your loop to retrieve it.",
            "tips": ["Leave 'Image_In' empty to run in 'Read-Only' recursion mode."]
        },
        "H4_ContextHub": {
            "title": "H4 Context Hub // THE BUNDLER",
            "description": "A high-density data package. The Hub collects Models, VAEs, CLIPs, and Images into a single sovereign context line. This eliminates 'Spaghetti Wiring' and ensures that all related assets arrive at their destination in perfect synchronization.",
            "usage": "Plug all your core assets into the left side. Run a single thick wire through your logic gates to the Hub Unpacker.",
            "tips": ["Right-click to rename the Hub for better organization in massive workflows."]
        },
        "H4_ContextUnpack": {
            "title": "H4 Context Unpack // THE BREAKER",
            "description": "The extractor for the Context Hub. It cracks open the sovereign context line and releases the individual assets (Models, Images, etc.) for use in samplers or savers. It features 'Zero Lag' extraction with built-in type validation.",
            "usage": "Connect the Context wire from a Hub or Logic gate to the input. Distribute the assets as needed.",
            "tips": ["Any socket not in the original Hub will simply output 'None' safely."]
        },
        "H4_Oxidine": {
            "title": "H4 Oxidine // THE SENTIENT CONDUIT",
            "description": "The absolute pinnacle of data routing. Oxidine creates an 'Omniproxy'—a single wire that behaves like whatever it is connected to. It dynamically inspects the stack to determine if the next node needs a Model, a VAE, or an Image, and presents the correct face of the data automatically.",
            "usage": "Use this when you want a truly wireless-feeling experience. One wire, infinite types.",
            "tips": ["Connect your most important base assets to Oxidine to ensure they are available anywhere on the graph."]
        },
        "H4_MissionControl": {
            "title": "H4 Mission Control // COMMAND CENTER",
            "description": "The central UI override for the h4 toolkit. From here, you can control global aesthetics, toggle forensic HUDs, and manage wireless synchronization. It enforces 'Viewport Sovereignty'—the idea that the UI should work for you, not against you.",
            "usage": "Keep one Mission Control node on your graph to enable the advanced dashboard features.",
            "tips": ["Toggle 'Sovereign HUD' to see detailed resource forensics on every H4 node."]
        },
        "H4_LinearScheduler": {
            "title": "H4 Linear Scheduler // THE METRONOME",
            "description": "Precision timing for long-form generations. Unlike random schedulers, the Metronome allows you to define a start and end value (like CFG or Denoise) and smoothly interpolate between them over a set number of runs. Perfect for 'Power Spirals' or gradual character aging.",
            "usage": "Set your Start, End, and Step count. The node will output the current interpolated value for each loop iteration.",
            "tips": ["Pair with h4_DocuScribe to graph your results over time."]
        },
        "H4_SeedGenerator": {
            "title": "H4 Seed Generator // ENTROPY ENGINE",
            "description": "The definitive source of randomness. The Entropy Engine features advanced synchronization modes, allowing it to 'Wireless Link' with the Mission Control seed. It ensures that every node on your graph is using the same mathematical starting point for consistency.",
            "usage": "Toggle 'Wireless Sync' to follow the global Mission Control seed, or run it independently for local noise variations.",
            "tips": ["Right-click to copy the current seed to the clipboard for external documentation."]
        },
        "H4_UniversalLoader": {
            "title": "H4 Universal Loader // THE PORTER",
            "description": "A high-speed gateway for all model types. The Porter detects if you are trying to load a Checkpoint, a LoRA, or a VAE and presents the correct selection menu. It features 'Tactile Caching'—remembering your favorite models for near-instant swaps.",
            "usage": "Select your model directory and pick your asset. The node handles the internal ComfyUI mapping automatically.",
            "tips": ["Use the 'Refresh' button to scan for newly downloaded assets without restarting ComfyUI."]
        },
        "H4_CompleteLoader": {
            "title": "H4 Complete Loader // THE MASTER KEY",
            "description": "The ultimate initialization unit. The Master Key combines Checkpoint loading, VAE selection, LoRA stacking, and CLIP encoding into a single, compact footprint. It produces a fully prepared Model and Conditioning set, ready for immediate sampling.",
            "usage": "Configure your stack once and use the 'Model' and 'CLIP' outputs to drive your entire workflow.",
            "tips": ["The 'Stack' view allows you to see the combined weight of all active LoRAs at a glance."]
        },
        "H4_MultiImgUpload": {
            "title": "H4 Multi Image Upload // BATCH INGESTER",
            "description": "The high-volume ingestion engine. Stop uploading images one by one. The Ingester allows you to drop entire folders or selections of images into the UI. It processes them into a Batch Tensor, perfect for training sets, slideshows, or 4-way comparisons.",
            "usage": "Drag images into the drop-zone. Use the 'Batch' output to feed batch-aware nodes like the Comparinator.",
            "tips": ["Toggle 'Auto-Sort' to organize your batch by timestamp or filename."]
        },
        "H4_SmartSave": {
            "title": "H4 Smart Save // THE HISTORIAN",
            "description": "Professional-grade asset management. The Historian saves your results with full forensic DNA—embedding the prompt, the workflow, and the hardware metadata directly into the file. It features a sovereign HUD that shows a history rail of your last 100 generations.",
            "usage": "Place this at the end of your workflow. Every generation will be saved with a unique, searchable timestamp and metadata packet.",
            "tips": ["Switch to 'Stealth Mode' to save images with zero UI clutter, but keep the metadata for future audits."]
        },
        "H4_ModelSave": {
            "title": "H4 Model Save // THE ARCHIVIST",
            "description": "Secure storage for your trained assets. Whether you are merging models or fine-tuning, the Archivist saves the current model weights with custom naming and versioning. It automatically includes the 'Merge Map' so you never forget which models created your favorite variant.",
            "usage": "Connect your model output here. Set your prefix and hit Generate to save a permanent .safetensors file.",
            "tips": ["Enable 'Auto-Versioning' to prevent overwriting previous successful merges."]
        },
        "H4_Mutate": {
            "title": "H4 Mutate // THE CHAMELEON",
            "description": "The dynamic prompt engine. The Chameleon takes a base prompt and 'Mutates' it by injecting random tokens or weights from a predefined library. It's the best way to explore 'Concept Drift' and find unexpected aesthetic sweet spots.",
            "usage": "Input your base prompt and select a mutation strength. The node will produce a slightly shifted variation for every run.",
            "tips": ["Use 'Seed Sync' to keep the mutations consistent across multiple samplers."]
        },
        "H4_PixelPress": {
            "title": "H4 Pixel Press // IMAGE COMPACTOR",
            "description": "Efficient image distribution. The Pixel Press applies lossless compression and metadata stripping to prepare your images for the web. It's the professional choice for sharing results without bloated file sizes while maintaining absolute visual fidelity.",
            "usage": "Connect your final image here before saving. Adjust the 'Quality' slider to find the perfect balance between size and detail.",
            "tips": ["Use 'WebP' mode for the smallest file footprint with modern browser compatibility."]
        },
        "H4_FaceForge": {
            "title": "H4 Face Forge // IDENTITY ENGINE",
            "description": "The ultimate face-care suite. Face Forge combines high-fidelity swapping, surgical restoration, and SAM-based occlusion handling into one node. It ensures that your character's identity remains consistent across any lighting or camera angle.",
            "usage": "Connect a source face and a target image. Use the 'Restore' settings to sharpen the new face and the 'SAM' settings to prevent hair/glasses occlusion.",
            "tips": ["Turn on 'Boost' for extra sharpness during the swap phase."]
        },
        "H4_LoadFaceModel": {
            "title": "H4 Load Face Model // THE ARCHIVIST",
            "description": "Instantly recall identities. This node loads a pre-built Face DNA file (.h4f) from your library. It is significantly faster and more reliable than analyzing a raw image every time, ensuring your characters look identical every single time you use them.",
            "usage": "Select a face model from your dropdown list. Plug the 'FACE_MODEL' output into Face Forge.",
            "tips": ["Build your models using H4_BuildFaceModel to capture the best 'average' of a character."]
        },
        "H4_BuildFaceModel": {
            "title": "H4 Build Face Model // DNA EXTRACTOR",
            "description": "The character creator. The DNA Extractor analyzes multiple images of a person and blends them into a single, noise-free Face Model. This 'average' capture is more robust than a single image, making it harder for lighting or angles to break the identity.",
            "usage": "Connect 3-5 images of the same person. The node will output a unique 'FACE_MODEL' that captures their core features.",
            "tips": ["Use clear, front-facing photos for the best extraction results."]
        },
        "H4_SaveFaceModel": {
            "title": "H4 Save Face Model // IDENTITY VAULT",
            "description": "Secure your creations. The Identity Vault takes a detected face or a built model and saves it to your permanent library for future use. Keep your character 'cast' in one place for instant deployment in any future workflow.",
            "usage": "Plug a 'FACE_MODEL' or an image with a detected face into the input. Name your character and save.",
            "tips": ["Build a folder structure in your face library to organize heroes, villains, and NPCs."]
        },
        "H4_IdentityEngine": {
            "title": "H4 Identity Engine // PERSONALITY MATRIX",
            "description": "The character blender. The Matrix allows you to take two or more face models and 'Cross-Pollinate' them. Want a character that is 60% Hero and 40% Villain? This node calculates the mathematical average of their features to create a brand new, stable identity.",
            "usage": "Connect multiple Face Models. Adjust the 'Mix' sliders to blend the features into a new character.",
            "tips": ["Use this to create family members or successors that share similar facial traits."]
        },
        "H4_FaceDetailer": {
            "title": "H4 Face Detailer // THE SURGEON",
            "description": "High-fidelity facial restoration. The Surgeon focuses exclusively on the face, applying multi-pass sharpening (GFPGAN), noise clean-up (CodeFormer), and skin texture enhancement. It's the final touch needed for professional-grade portraits.",
            "usage": "Connect any image where the face looks blurry or 'fried'. The node will automatically find, sharpen, and re-composite the face.",
            "tips": ["Keep 'CodeFormer Weight' around 0.5 to keep the restoration from looking too 'plastic'."]
        },
        "H4_DualCLIPTextEncode": {
            "title": "H4 Dual CLIP Encode // SEΜΑΝTIC BRIDGE",
            "description": "Multi-prompt management. The Semantic Bridge encodes two prompts simultaneously, allowing you to blend between them using a simple slider. This is perfect for complex concept transitions, like changing a character's outfits or shifting from day to night in a single generation.",
            "usage": "Enter your 'Prompt A' and 'Prompt B'. Use the 'Mix' value to control which prompt dominates the latent space.",
            "tips": ["Animate the 'Mix' value using a scheduler for smooth concept-transformation videos."]
        },
        "H4_Pythonipulator-inator": {
            "title": "H4 Pythonipulator // IMAGE KERNEL",
            "description": "The definitive image manipulation kernel. Written in high-performance Python, this node combines OpenCV, Pillow, and Scikit-Image into one tactile interface. It features dedicated modules for Geometric transforms, Cyberpunk glitches, Stylistic filters, and Edge detection.",
            "usage": "Enable the 'CB' module for glitch effects, 'GEO' for rotations, or 'CLR' for brightness/contrast. All modules are sequential.",
            "tips": ["Enable 'Save to Disk' to instantly archive your transformed images to a dedicated folder."]
        },
        "H4_Gridinator": {
            "title": "H4 Gridinator // THE MATRIX",
            "description": "Advanced visualization for batch testing. The Matrix takes a list of images and organizes them into a clean, searchable grid. It's the professional way to compare results across different seeds, prompts, or weights in a single view.",
            "usage": "Plug in a batch of images. Set your 'Columns' and 'Rows'. The node outputs a single 'Contact Sheet' image.",
            "tips": ["Use 'Auto-Labels' to identify which image corresponds to which setting directly on the grid."]
        },
        "H4_Comparinator": {
            "title": "H4 Comparinator // FORENSIC VIEWER",
            "description": "Dual-channel A/B testing. The Comparinator allows for frame-by-frame comparison between two images. It features a high-performance 'Historian' mode that keeps a running rail of previous attempts, letting you 'Time-Travel' back to earlier versions of a generation.",
            "usage": "Connect 'Image A' (Control) and 'Image B' (Test). Use the side-panel to slide between them and inspect the differences.",
            "tips": ["Press the 'Save VS' button to create a side-by-side comparison image for your notes."]
        },
        "H4_DocuScribe": {
            "title": "H4 DocuScribe // THE LOGBOOK",
            "description": "Automated workflow documentation. Every time you generate, DocuScribe writes a markdown entry containing your prompt, your settings, and your result. It's the easiest way to build a professional 'dev log' of your creative process.",
            "usage": "Keep this connected to your final output. It will update the 'h4_log.md' file in your project folder automatically.",
            "tips": ["Review the log in the ComfyUI side-panel for a quick history of your session."]
        },
        "H4_ModelMerger": {
            "title": "H4 Model Merger // WEAVER",
            "description": "Precision weight blending. The Weaver allows for 'Block-Level' merging of two checkponts. Unlike simple 50/50 merges, you can specify exactly which parts of the neural network to prioritize (e.g. Model A's eyes, Model B's lighting).",
            "usage": "Connect two models. Set your 'Ratio' and 'Merge Mode'. Output a new combined model for immediate testing.",
            "tips": ["Use 'Sum Addition' for adding LoRAs directly into the checkpoint weights permanently."]
        },
        "H4_DoubleSampler": {
            "title": "H4 Double Sampler // TWIN TURBO",
            "description": "Multi-pass refinement. The Twin Turbo runs two sampling passes in one node—usually a 'Base' pass followed by a low-denoise 'Refiner' pass. This produces significantly higher detail with zero extra noise.",
            "usage": "Set your base steps and your refiner steps. The node will handle the latent hand-off internally.",
            "tips": ["Use a different sampler for the second pass (e.g. Euler -> DPM++ 2M) for varied texture profiles."]
        },
        "H4_Varianator": {
            "title": "H4 Varianator // THE DIVERGE",
            "description": "The alternative-path engine. The Varianator takes a latent and creates a batch of 'Near-Neighbors'—versions that are slightly different but share the same core structure. It's the fastest way to explore 'Better than Best' without changing your prompt.",
            "usage": "Plug in a latent. Set your 'Variance' amount. It will produce 4-8 variations for you to pick from.",
            "tips": ["Low variance (0.1) is for subtle details; high variance (0.8) is for wild stylistic shifts."]
        },
        "H4_NoteInjector": {
            "title": "H4 Note Injector // THE LABELLER",
            "description": "Embedded organization. This node allows you to attach invisible text 'Notes' to your context wires. These notes travel with your models and images, and can be read by other H4 nodes for dynamic file naming or conditional logic.",
            "usage": "Enter your note text and connect it to a Context Hub or individual wire.",
            "tips": ["Use this to tag images with specific projects or client names wirelessly."]
        },
        "H4_AxisDriver": {
            "title": "H4 Axis Driver // XY CONTROLLER",
            "description": "Grid-based experimentation. The Driver automates the process of changing a single value (like CFG or Steps) over a range of values. It produces an 'XY Grid' that proves exactly how a setting impacts your image.",
            "usage": "Connect the 'Value' output to the target widget. Set your range (Start, End, Steps).",
            "tips": ["Pair with 'H4 Gridinator' to automatically organize the results into a perfect matrix."]
        },
        "H4_DataStream": {
            "title": "H4 Data Stream // THE TELEMETRY",
            "description": "Live data visualization. The Telemetry node captures the 'Heartbeat' of your workflow, displaying real-time VRAM usage, generation speed, and tensor shapes. It's the dashboard for your GPU's soul.",
            "usage": "Connect to any wire to see the data 'In Transit'. No more guessing if your latent is the wrong size.",
            "tips": ["Check the 'Heatmap' view to see which parts of your workflow are consuming the most VRAM."]
        },
        "H4_ForgeMask": {
            "title": "H4 Forge Mask // SURGICAL MASK",
            "description": "Precision region control. Forge Mask allows you to draw or generate masks using mathematical operations (Invert, Dilate, Erode). It features 'Tactile Edge'—a feathering engine that makes composites look seamless.",
            "usage": "Input an image and use the brush to define a region. Output the mask to drive Inpainting or ControlNet.",
            "tips": ["Use 'Dilate' to slightly grow your mask and ensure no hard edges appear during inpainting."]
        },
        "H4_SmartConsole": {
            "title": "H4 Smart Console // THE X-RAY",
            "description": "Deep data inspection. The X-Ray intercepts data in transit and displays a detailed breakdown of tensor shapes, data types, and values directly on top of the node. No more guessing why your latent is the wrong resolution.",
            "usage": "Plug it into any wire to see the 'X-Ray' of what is moving through that connection.",
            "tips": ["Right-click to copy the data dump to your clipboard for analysis."]
        },
        "H4_SeedSequencer": {
            "title": "H4 Seed Sequencer // CHAOS CONTROLLER",
            "description": "Advanced randomness management. Unlike the standard Seed Generator, the Sequencer allows you to define 'Keys' (specific seed lists) and cycle through them. It ensures that your 'Random' generations are actually predictable and repeatable experiments.",
            "usage": "Define a list of seeds and a movement mode (Linear, Ping-Pong, Random). Perfect for testing a prompt against a broad but controlled set of seeds.",
            "tips": ["Use 'Ping-Pong' mode to iterate back and forth through a sequence of 5 seeds."]
        },
        "H4_Switcheroo": {
            "title": "H4 Switcheroo // UNIVERSAL SWAP",
            "description": "The Swiss Army switch. It is a multi-type selector that can swap between Models, Images, Latents, or VAEs with a single toggle. It features a high-performance terminal interface that logs whenever a swap occurs.",
            "usage": "Use this instead of deleting and re-running wires. Toggle inputs instantly.",
            "tips": ["Pair with h4_DocuScribe to track which 'Switch' state was active for each generation."]
        },
        "H4_Discombobulator": {
            "title": "H4 Discombobulator // THE GLITCH",
            "description": "Tactile UI subversion. The Discombobulator is a stealth node that intercepts standard ComfyUI notifications and translates them into various 'glitch' formats. It supports Leet Speak, Binary, Base64, and Spaced-Out 'Void' text. It's the ultimate aesthetic anchor for an h4-themed workspace.",
            "usage": "Place anywhere on the graph. It works silently in the background to 'h4-ify' your workspace feedback.",
            "tips": ["Set to 'b1n4ry' for a truly cryptic, hacker-style experience."]
        },
        "H4_DebugErrorGenerator": {
            "title": "H4 Error Generator // THE SABOTEUR",
            "description": "Stress-test your stability. This node is designed strictly for testing the toolkit's 'Industrial Hardening'. It intentionally triggers a Python-level crash, allowing you to witness how the H4 Core handles critical failures and recovery protocols. DO NOT USE IN PRODUCTION.",
            "usage": "Enter a custom error message and hit generate. The system will crash and attempt a 'Nuclear Recovery'.",
            "tips": ["Use this in a isolated workflow to verify that your 'SmartSave' recovery logic is working."]
        },
        "H4_NodeTranslator": {
            "title": "H4 Node Translator // THE POLYGLOT",
            "description": "Global accessibility. The Polyglot is the master controller for the H4 Live Translation engine. It can translate the entire ComfyUI interface—node titles, widget labels, and descriptions—into multiple languages on the fly without a restart.",
            "usage": "Select your target language (English, French, Spanish, Mandarin, German) and toggle 'Active'.",
            "tips": ["If a node doesn't translate immediately, right-click the graph and select 'Refresh Translation Maps'."]
        },
        "H4_VisualTokenizer": {
            "title": "H4 Visual Tokenizer // THE MIND'S EYE",
            "description": "Demystify CLIP. The Mind's Eye shows you exactly how the AI 'sees' your text. It visualizes the tokenization process, showing which words are broken into sub-tokens and where emphasis (weights) are being concentrated. Essential for prompt-engineering precision.",
            "usage": "Input your prompt and connect a CLIP model. The node will render a visualization of the processed tokens and their mathematical influence.",
            "tips": ["Monitor the 'Token Count' to ensure you don't exceed the 75-token CLIP buffer, which causes trailing words to be ignored."]
        },
        "H4_LatentSelector": {
            "title": "H4 Latent Selector // PRESET MANAGER",
            "description": "Resolution sovereignty. The Selector provides a library of high-performance resolution presets for SD1.5, SDXL, and Flux. It calculates the optimal pixel area for each architecture and ensures your 'Empty Latents' are always multiple-of-16 compatible to prevent VAE distortion.",
            "usage": "Select your model base (e.g. SDXL) and your aspect ratio (e.g. 16:9). The node outputs a perfectly sized Latent batch.",
            "tips": ["Use 'Custom Dimensions' and snap to the nearest 16 pixels automatically even if you don't use a preset."]
        },
        "H4_DisplayAny": {
            "title": "H4 Display Any // THE INSPECTOR",
            "description": "The ultimate data-visualizer. Any type, any time. The Inspector can display Tensors, Lists, Dicts, or Strings directly on the canvas. It's the most powerful tool for ensuring your data streams are carrying the correct values between nodes.",
            "usage": "Connect ANY output to the input. The node will automatically determine the best way to display the data (Text, Table, or Shape Info).",
            "tips": ["Use the multiline view for reading long prompt strings or data dumps from API nodes."]
        },
        "H4_PixelVisualizer": {
            "title": "H4 Pixel Visualizer // DIFF INSPECTOR",
            "description": "See the invisible. This node performs a mathematical 'Subtraction' between two images and displays the difference. It highlights exactly what changed between two generations, making it invaluable for testing LorAs or Denoise settings.",
            "usage": "Connect two images (e.g. before and after a refiner pass). The node will render a heatmap of the pixels that changed.",
            "tips": ["A pure black image means zero change—your settings might be too low!"]
        }
    },


    renderHome(container) {
        // Dynamic path to the H4 logo PNG in the assets folder
        const logoUrl = new URL("./assets/h4_logo.png", import.meta.url).href;

        container.innerHTML = `
            <div style="
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                height: 100%; color: #00f2ff;
            ">
                <img src="${logoUrl}" 
                    onerror="this.style.display='none'; document.getElementById('h4-icon-fallback').style.display='block'; console.warn('H4 Logo PNG Failed:', this.src);"
                    style="
                    width: 180px; height: 180px; object-fit: contain; margin-bottom: 20px;
                    filter: drop-shadow(0 0 25px rgba(0,242,255,0.35));
                    opacity: 0; animation: fadeIn 1s forwards;
                ">
                <!-- Fallback ASCII -->
                <div id="h4-icon-fallback" style="display:none; font-family:monospace; font-size:64px; margin-bottom:20px; color:#00f2ff; text-shadow: 0 0 20px rgba(0,242,255,0.6);">
                    { h4 }
                </div>

                <h1 style="font-family: monospace; letter-spacing: 5px; opacity:0; animation: fadeIn 1s 0.5s forwards;">h4_LIVE</h1>
                <div style="color: #666; font-family: monospace; margin-top: 10px; opacity:0; animation: fadeIn 1s 1s forwards;">SYSTEM_READY</div>
            </div>
            
            <style>
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            </style>
        `;
    },

    // --- UPDATED PREVIEW SYSTEM ---
    showHoverPreview(e, nodeData) {
        if (!this.previewEl) {
            this.previewEl = document.createElement("div");
            this.previewEl.id = "h4-hover-preview";
            document.body.appendChild(this.previewEl);
        }

        const lore = this.getLore(nodeData.type);
        const title = lore ? lore.title : (nodeData.def.title || nodeData.type);
        const desc = lore ? lore.description : (nodeData.def.desc || "No encrypted data found.");

        const p = this.previewEl;
        p.style.display = "block";
        p.innerHTML = `
            <div style="color: #00f2ff; font-weight: bold; border-bottom: 1px solid #333; padding-bottom: 5px; margin-bottom: 5px;">
                ${title}
            </div>
            <div style="font-size: 11px; color: #aaa; margin-bottom: 10px; max-height: 100px; overflow: hidden; text-overflow: ellipsis;">
                ${desc}
            </div>
            <div id="h4-preview-canvas-container" style="
                width: 220px; height: 120px; background: #1a1a1a; 
                display: flex; align-items: center; justify-content: center;
                border: 1px solid #333; overflow: hidden;
            "></div>
        `;

        // Update Position
        const updatePos = (mx, my) => {
            let left = mx + 20;
            let top = my + 20;
            if (left + 260 > window.innerWidth) left = mx - 270;
            if (top + 200 > window.innerHeight) top = my - 210;
            p.style.left = left + "px";
            p.style.top = top + "px";
        };

        // Fix Memory Leak: Remove previous listener if exists
        if (this._hoverMoveListener) {
            document.removeEventListener('mousemove', this._hoverMoveListener);
        }
        this._hoverMoveListener = (me) => updatePos(me.clientX, me.clientY);
        document.addEventListener('mousemove', this._hoverMoveListener, { passive: true });
        updatePos(e.clientX, e.clientY);

        // DRAW NODE PREVIEW
        setTimeout(() => {
            const container = p.querySelector("#h4-preview-canvas-container");
            if (container) {
                const canvas = document.createElement("canvas");
                canvas.width = 220; canvas.height = 120;
                const ctx = canvas.getContext("2d");
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.fillStyle = "#1a1a1a";
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                if (nodeData.def) {
                    try {
                        const node = new nodeData.def();
                        if (!node.size) node.size = [140, 60];
                        const scale = Math.min(canvas.width / (node.size[0] + 20), canvas.height / (node.size[1] + 20));
                        ctx.save();
                        ctx.translate(canvas.width / 2 - (node.size[0] * scale) / 2, canvas.height / 2 - (node.size[1] * scale) / 2);
                        ctx.scale(scale, scale);

                        ctx.fillStyle = "#222";
                        ctx.strokeStyle = "#00f2ff";
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.roundRect(0, 0, node.size[0], node.size[1], 5);
                        ctx.fill();
                        ctx.stroke();

                        ctx.fillStyle = "#ddd";
                        ctx.font = "bold 14px Arial";
                        ctx.textAlign = "left";
                        ctx.fillText(node.title || node.type, 10, 20);
                        ctx.restore();
                    } catch (err) { }
                }
                container.appendChild(canvas);
            }
        }, 1);
    },

    hideHoverPreview() {
        if (this.previewEl) this.previewEl.style.display = 'none';
        if (this._hoverMoveListener) {
            document.removeEventListener('mousemove', this._hoverMoveListener);
            this._hoverMoveListener = null;
        }
    },

    getLore(type) {
        if (!this.LORE) return null;

        // 1. Direct match — most common case
        if (this.LORE[type]) return this.LORE[type];

        // 2. Try with H4 prefix capitalized
        const withH4 = "H4" + type.replace(/^h4[-_]?/i, "");
        if (this.LORE[withH4]) return this.LORE[withH4];

        // 3. Normalize: strip h4 prefix, capitalize first letter, rebuild
        const stripped = type.replace(/^H4|^h4[-_]?/i, "");
        const normalized = "H4" + stripped.charAt(0).toUpperCase() + stripped.slice(1);
        if (this.LORE[normalized]) return this.LORE[normalized];

        return null;
    },

    // --- UPDATED DOCS (BOOK OF H4) ---
    openNodeDocs(nodeData) {
        const lore = this.getLore(nodeData.type);
        const title = lore ? lore.title : (nodeData.def.title || nodeData.type);
        const desc = lore ? lore.description : (nodeData.def.desc || "No data available in archives.");
        const usage = lore && lore.usage ? lore.usage : "No usage data.";
        const tips = lore && lore.tips ? lore.tips : [];

        // Create an overlay on top of the dashboard
        const doc = document.createElement("div");
        doc.className = "h4-doc-overlay";
        doc.innerHTML = `
            <div class="h4-doc-content">
                <div class="h4-doc-close">CLOSE FILE</div>
                <h1>${title}</h1>
                <div class="h4-doc-meta">ID: ${nodeData.type} | CAT: ${nodeData.def.category || "Unknown"}</div>
                
                <hr style="border-color:#333; margin: 20px 0;">
                
                <div class="h4-doc-body">
                    <h3>// SYNOPSIS</h3>
                    <p class="h4-doc-box">${desc}</p>
                    
                    <h3>// USAGE PROTOCOL</h3>
                    <p class="h4-doc-box">${usage}</p>

                    ${tips.length > 0 ? `
                        <h3>// TIPS & TRICKS</h3>
                        <ul class="h4-doc-list">
                            ${tips.map(t => `<li>${t}</li>`).join('')}
                        </ul>
                    ` : ""}
                    
                    <h3>// INPUTS</h3>
                    <ul class="h4-doc-list">
                        ${(nodeData.def.input?.required ? Object.keys(nodeData.def.input.required).map(k => {
            // Check lore for input desc
            let extra = "";
            if (lore && lore.inputs && lore.inputs[k]) {
                extra = ` - <span style="color:#888;">${lore.inputs[k].description}</span>`;
            }
            return `<li><strong style="color:#00f2ff;">${k}</strong>${extra}</li>`;
        }).join('') : "<li>None</li>")}
                    </ul>
                    
                    <h3>// OUTPUTS</h3>
                    <ul class="h4-doc-list">
                         ${(nodeData.def.output ? nodeData.def.output.map((k, i) => {
            // Outputs in Comfy are arrays, hard to map by name without name array
            const outName = nodeData.def.output_name ? nodeData.def.output_name[i] : (typeof k === 'string' ? k : "Output " + i);
            let extra = "";
            // Try to map by name or index
            if (lore && lore.outputs) {
                if (lore.outputs[outName]) extra = ` - <span style="color:#888;">${lore.outputs[outName]}</span>`;
            }
            return `<li><strong style="color:#00aaff;">${outName || k}</strong>${extra}</li>`;
        }).join('') : "<li>None</li>")}
                    </ul>

                </div>
            </div>
            
            <style>
                .h4-doc-box { background: rgba(255,255,255,0.05); padding: 15px; border-left: 2px solid #00f2ff; border-radius: 0 4px 4px 0; }
                .h4-doc-list { list-style: none; padding-left: 0; }
                .h4-doc-list li { margin-bottom: 8px; padding-left: 15px; border-left: 1px solid #333; }
            </style>
        `;

        this.modal.appendChild(doc);

        // Animation
        requestAnimationFrame(() => doc.classList.add("open"));

        doc.querySelector(".h4-doc-close").onclick = () => {
            doc.classList.remove("open");
            setTimeout(() => doc.remove(), 300);
        };

        doc.onclick = (e) => {
            if (e.target === doc) {
                doc.classList.remove("open");
                setTimeout(() => doc.remove(), 300);
            }
        };
    },

    summonNode(type) {
        const node = LiteGraph.createNode(type);
        if (node) {
            // Spawn at mouse or center
            const x = app.canvas.graph_mouse ? app.canvas.graph_mouse[0] : (window.innerWidth / 2);
            const y = app.canvas.graph_mouse ? app.canvas.graph_mouse[1] : (window.innerHeight / 2);
            node.pos = [x, y];
            app.canvas.graph.add(node);

            // Visual feedback
            this.showToast(`SUMMONED: ${type.replace("H4_", "")}`);

            // Auto-close if in modal mode to show the node? 
            // Better to keep it open for multiple summons.
        }
    },

    showToast(msg) {
        const toast = document.createElement("div");
        toast.className = "h4-toast";
        toast.style.cssText = `
            position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
            background: rgba(0,242,255,0.9); color: #000; padding: 12px 24px;
            font-family: monospace; font-size: 14px; font-weight: bold;
            border-radius: 4px; z-index: 20000; pointer-events: none;
            box-shadow: 0 0 20px rgba(0,242,255,0.4);
            letter-spacing: 2px;
        `;
        toast.textContent = `[ ${msg} ]`;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.transition = "opacity 0.5s ease";
            toast.style.opacity = "0";
            setTimeout(() => toast.remove(), 500);
        }, 2000);
    },

    togglePin() {
        if (this.panelMode === 'pinned') this.setPanelMode('modal');
        else this.setPanelMode('pinned');
    },

    togglePopout() {
        if (this.panelMode === 'popout') this.setPanelMode('modal');
        else this.setPanelMode('popout');
    },

    setPanelMode(mode) {
        console.log("[h4] Dashboard switching mode →", mode);
        this.panelMode = mode;
        this.config.panelPinned = (mode === "pinned");
        this.saveConfig();

        // 1. Reset all mode-specific classes and attributes
        document.body.classList.remove("h4-dashboard-pinned", "h4-dashboard-popout");
        this.modal.setAttribute("data-mode", mode);

        // 2. Mode-specific actions
        if (mode === "modal") {
            // Restore default floating modal behavior
            this.modal.style.cssText = "";   // Clear any inline pinned styles
            // Re-apply saved drag offset so panel returns to where user left it
            if (this.config.offsetX || this.config.offsetY) {
                this.modal.style.transform = `translate(${this.config.offsetX}px, ${this.config.offsetY}px)`;
            }
            this.applyCanvasMargin(0);
            // Close popout if open
            if (this._popoutWindow && !this._popoutWindow.closed) {
                this._popoutWindow.close();
                this._popoutWindow = null;
            }
            this.open();

        } else if (mode === "pinned") {
            // Dock to left side
            document.body.classList.add("h4-dashboard-pinned");
            this.modal.style.cssText = "";   // Let CSS [data-mode="pinned"] take over
            this.applyCanvasMargin(this.config.panelWidth);
            this.open();

        } else if (mode === "popout") {
            // Open in new window
            this.applyCanvasMargin(0);
            this.openPopout();
            this.close();  // Close the in-page modal
        }

        // 3. Update Button Labels
        const dockBtn = this.modal?.querySelector(".h4-btn-dock");
        if (dockBtn) {
            dockBtn.textContent = (mode === "pinned") ? "📌" : "[D]";
            dockBtn.title = (mode === "pinned") ? "Undock Panel" : "Dock to Left";
        }

        const popoutBtn = this.modal?.querySelector(".h4-btn-popout");
        if (popoutBtn) {
            popoutBtn.textContent = (mode === "popout") ? "↙" : "[O]";
            popoutBtn.title = (mode === "popout") ? "Return to Canvas" : "Popout Window";
        }
    },

    applyCanvasMargin(margin) {
        // Try multiple selectors — ComfyUI changes class names between versions
        const wrapper =
            document.querySelector(".comfy-app") ||
            document.querySelector("#graph-canvas")?.parentElement ||
            document.querySelector("canvas")?.parentElement ||
            document.body;

        wrapper.style.transition = "padding-left 0.3s ease";
        wrapper.style.paddingLeft = margin + "px";
    },

    openPopout() {
        if (this._popoutWindow && !this._popoutWindow.closed) {
            this._popoutWindow.focus();
            return;
        }

        const width = 450;
        const height = 800;
        const left = (window.screen.width / 2) - (width / 2);
        const top = (window.screen.height / 2) - (height / 2);

        this._popoutWindow = window.open("", "h4-dashboard-popout",
            `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`);

        if (!this._popoutWindow) {
            alert("POPOUT_BLOCKED: Please enable popups for h4_Live surveillance.");
            this.setPanelMode('modal');
            return;
        }

        const doc = this._popoutWindow.document;
        doc.title = "H4_MISSION_CONTROL // SURVEILLANCE_POPOUT";

        const style = doc.createElement("style");
        style.textContent = this._cssText || "";
        doc.head.appendChild(style);

        doc.body.innerHTML = `
            <div id="h4-dashboard-modal" class="open" data-mode="popout" style="display:flex; position:relative; width:100%; height:100vh;">
                ${this.modal.innerHTML}
            </div>
        `;

        this._popoutWindow.addEventListener('unload', () => {
            if (this.panelMode === 'popout') this.setPanelMode('modal');
        });
    },

    initDraggable() {
        const handle = this.modal.querySelector(".h4-drag-handle");
        if (!handle) return;

        handle.addEventListener('mousedown', (e) => {
            if (e.target.closest(".h4-panel-btn, .h4-dash-close")) return;
            if (this.panelMode !== 'modal') return;
            this._dragState.active = true;
            this._dragState.startX = e.clientX - this.config.offsetX;
            this._dragState.startY = e.clientY - this.config.offsetY;
            this.modal.classList.add('dragging');
        });

        window.addEventListener('mousemove', (e) => {
            if (!this._dragState.active) return;
            this.config.offsetX = e.clientX - this._dragState.startX;
            this.config.offsetY = e.clientY - this._dragState.startY;
            this.modal.style.transform = `translate(${this.config.offsetX}px, ${this.config.offsetY}px)`;
        });

        window.addEventListener('mouseup', () => {
            if (this._dragState.active) {
                this._dragState.active = false;
                this.modal.classList.remove('dragging');
                this.saveConfig();
            }
        });
    },

    destroy() {
        console.log("[h4] Dashboard: Executing Cold Shutdown...");
        if (this.modal) this.modal.remove();
        if (this._popoutWindow) this._popoutWindow.close();
        document.head.querySelector("#h4-dashboard-css")?.remove();
        document.head.querySelector("#h4-toggle-css")?.remove();
        document.head.querySelector("#h4-node-grid-css")?.remove();
        this.applyCanvasMargin(0);
        if (this._hoverMoveListener) {
            window.removeEventListener('mousemove', this._hoverMoveListener);
        }
    },

    setConfig(key, val) {
        this.config[key] = val;
        this.saveConfig();
        // Dispatch event for other components to react
        window.dispatchEvent(new CustomEvent("h4_config_update", { detail: { key, val } }));
    },

    loadConfig() {
        try {
            const saved = localStorage.getItem("h4_live_config");
            if (saved) {
                const parsed = JSON.parse(saved);
                this.config = { ...this.config, ...parsed };
            }
        } catch (e) { console.error(e); }
    },

    saveConfig() {
        localStorage.setItem("h4_live_config", JSON.stringify(this.config));
    },

    injectCSS() {
        if (document.getElementById("h4-dashboard-css")) return;
        const cssText = `
            /* Cyberpunk Glass Theme */
            #h4-dashboard-modal {
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(0,0,0,0.8);
                z-index: 10000;
                display: none; align-items: center; justify-content: center;
                backdrop-filter: blur(5px);
                opacity: 0; transition: opacity 0.3s ease;
            }
            #h4-dashboard-modal.open { opacity: 1; }
            
            .h4-dash-content {
                width: 900px; height: 600px;
                background: linear-gradient(135deg, rgba(12,12,12,0.98), rgba(8,8,8,0.99));
                border: 1px solid rgba(0,242,255,0.15);
                box-shadow: 0 0 30px rgba(0,0,0,0.9), 0 0 2px rgba(0,242,255,0.1);
                display: flex; flex-direction: column;
                font-family: 'Segoe UI', sans-serif;
                color: #ddd;
                border-radius: 6px;
                overflow: hidden;
                position: relative;
            }
            
            /* Glitch border effect could go here */
            
            .h4-dash-header {
                height: 40px; background: #0c0c0c; border-bottom: 1px solid rgba(0,242,255,0.08);
                display: flex; justify-content: space-between; align-items: center;
                padding: 0 15px;
            }
            .h4-dash-title { font-family: monospace; color: #00f2ff; font-weight: bold; letter-spacing: 2px; opacity: 0.6; }
            .h4-dash-close { cursor: pointer; color: #888; font-weight: bold; transition: color 0.2s; }
            .h4-dash-close:hover { color: #fff; }
            
            .h4-dash-body { flex: 1; display: flex; overflow: hidden; }
            
            .h4-dash-sidebar {
                width: 150px; background: #0c0c0c; border-right: 1px solid rgba(0,242,255,0.06);
                display: flex; flex-direction: column; padding-top: 20px;
            }
            .h4-tab-btn {
                padding: 15px 20px; cursor: pointer; color: #555; font-family: monospace;
                transition: all 0.2s; border-left: 3px solid transparent;
                font-size: 16px; font-weight: bold; letter-spacing: 1px;
            }
            .h4-tab-btn:hover { color: #aaa; background: rgba(255,255,255,0.05); }
            .h4-tab-btn.active { 
                color: #fff; border-left: 3px solid #00f2ff; background: rgba(0,242,255,0.05);
                text-shadow: 0 0 8px rgba(0,242,255,0.6);
                font-size: 18px;
            }
            
            .h4-dash-main { flex: 1; padding: 20px; overflow-y: auto; position: relative; }
            
            /* Panel Titles (rendered by renderDebug, renderQoL, renderWires) */
            .h4-panel-title {
                color: #00f2ff; font-family: monospace; font-weight: 900; letter-spacing: 3px;
                font-size: 16px; margin: 0 0 15px 0; padding-bottom: 8px;
                border-bottom: 1px solid rgba(0,242,255,0.15);
                text-shadow: 0 0 6px rgba(0,242,255,0.3);
            }
 
            /* Sidebar Section Headers */
            .h4-dash-header-small {
                color: #444; font-family: monospace; font-size: 10px; font-weight: bold;
                letter-spacing: 2px; padding: 5px 20px; text-transform: uppercase;
            }
 
            /* Setting Rows */
            .h4-set-group { 
                color: #00f2ff; font-weight: bold; margin-top: 20px; margin-bottom: 10px; 
                border-bottom: 1px solid #333; padding-bottom: 5px; font-family: monospace;
            }
            .h4-set-row {
                display: flex; justify-content: space-between; align-items: center;
                padding: 8px 10px; background: rgba(255,255,255,0.02); margin-bottom: 2px;
                border: 1px solid transparent; transition: border 0.2s;
            }
            .h4-set-row:hover { border-color: #333; background: rgba(255,255,255,0.04); }
            .h4-set-label { font-size: 13px; color: #ccc; }
            
            /* About Text */
            .h4-about-text { line-height: 1.6; color: #ccc; max-width: 700px; margin: 0 auto; }
            .h4-about-text h3 { color: #fff; border-bottom: 1px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .h4-about-text a { text-decoration: none; font-weight: bold; }
            .h4-about-text a:hover { text-decoration: underline; }
            /* Pinned Mode */
            #h4-dashboard-modal[data-mode="pinned"] {
                position: fixed; top: 0; left: 0; bottom: 0; height: 100vh;
                display: flex; opacity: 1; backdrop-filter: none; background: none;
                justify-content: flex-start; pointer-events: none;
            }
            #h4-dashboard-modal[data-mode="pinned"] .h4-dash-content {
                height: 100vh; border-radius: 0; border-left: none; pointer-events: all;
                box-shadow: 10px 0 30px rgba(0,0,0,0.5);
            }
            
            /* Header controls Styling */
            .h4-header-controls { display: flex; gap: 8px; align-items: center; }
            .h4-panel-btn { cursor: pointer; color: #888; font-family: monospace; font-size: 12px; transition: color 0.2s; }
            .h4-panel-btn:hover { color: #00f2ff; text-shadow: 0 0 5px #00f2ff; }
 
            #h4-dashboard-modal.dragging { user-select: none; pointer-events: none; }
            #h4-dashboard-modal.dragging .h4-dash-content { opacity: 0.8; }
        `;
        this._cssText = cssText;
        const style = document.createElement("style");
        style.id = "h4-dashboard-css";
        style.textContent = cssText;
        document.head.appendChild(style);
    }
};

app.registerExtension({
    name: "h4.Dashboard",

    setup() {
        h4_Dashboard.init();
    },

    // ComfyUI Settings API — adds toggles to the native Settings popup
    // under a "h4 QoL" section
    async getCustomWidgets() { return {}; },

    // Called when ComfyUI builds the settings panel
    addCustomNodeDefs(defs) { },

    // Settings registration — this is the correct ComfyUI hook
    registerCustomNodes() { },
});

window.h4_Dashboard = h4_Dashboard;

// --- Register QoL settings into ComfyUI's native settings panel ---
// This runs after setup() so h4_Dashboard is fully initialized
let _h4SettingsRetries = 0;

function _registerH4Settings() {
    if (!app.ui?.settings) {
        if (_h4SettingsRetries++ > 20) {
            console.warn("[h4] Settings API never mounted after 10s. QoL settings skipped.");
            return;
        }
        // Settings API not ready yet — retry
        setTimeout(_registerH4Settings, 500);
        return;
    }

    const S = app.ui.settings;

    // Helper to register a boolean setting that syncs with h4_Dashboard.config
    function addQoL(id, label, tooltip, configKey) {
        S.addSetting({
            id: `h4.qol.${id}`,
            name: label,
            tooltip: tooltip,
            type: "boolean",
            defaultValue: false,
            category: ["h4 QoL", "h4 QoL", label],
            onChange(value) {
                if (window.h4_Dashboard) {
                    window.h4_Dashboard.setConfig(configKey, value);
                }
            },
        });
    }

    addQoL("masterOverride", "Master QoL Override", "Primary gate. Disabling this silences all QoL features.", "qolMasterOverride");
    addQoL("bigBrother", "Big Brother Overlay", "Tactical HUD overlay monitoring canvas activity.", "enabled");
    addQoL("cyberpunkGrid", "Cyberpunk Grid", "Animated background grid for visual depth.", "showGrid");
    addQoL("dataFlowWires", "Data Flow Wires", "Highlights connection paths on selected nodes.", "showWires");
    addQoL("deadWeight", "Dead Weight Detector", "Deploys the DWD Kirby unit to the toolbar.", "deadWeightEnabled");
    addQoL("caffeine", "Caffeine Mode Button", "Adds wake-lock override button to toolbar.", "caffeineEnabled");
    addQoL("kickIt", "Kick-the-Grid Button", "Canvas defibrillator — force-refreshes LiteGraph renderer.", "kickItEnabled");
    addQoL("civitaiGlobalToggle", "Global Civitai Bridge Master Toggle", "Master control switch for all Civitai Bridge QoL features.", "civitaiGlobalToggle");
    addQoL("civitaiBridge", "Civitai Bridge Button", "Installs Civitai Bridge button in toolbar to the left of Kick-The-Grid.", "civitaiBridgeEnabled");
    addQoL("civitaiAutoInject", "Civitai Auto-Inject", "Auto-populates downloaded model names into canvas loader nodes.", "civitaiAutoInject");
    addQoL("civitaiSidecars", "Civitai Metadata Sidecars", "Creates .txt and .json trigger word sidecars on model download.", "civitaiSidecars");
    addQoL("civitaiPreviewSidecars", "Civitai Image Sidecars", "Downloads thumbnail images as .preview.png alongside models.", "civitaiPreviewSidecars");
    addQoL("civitaiHoverTooltip", "Model Hover Preview Tooltip", "Displays mouse-tracking model preview tooltips on hover.", "civitaiHoverTooltip");
    addQoL("sovereignCore", "H4 Node Aesthetic", "Enforces H4 cyan-black branding on all compatible nodes.", "sovereignCoreEnabled");
    addQoL("errorPopup", "Red Screen of Death", "Replaces alerts with forensic error modal.", "showErrorPopup");
    addQoL("smartSnapping", "Node Snapping", "Sub-pixel magnetic alignment for nodes.", "smartSnapping");
    addQoL("ioColoring", "Dynamic Input Coloring", "Colors sockets by data type for rapid identification.", "ioColoring");
    addQoL("passiveMonitor", "Passive System Monitor", "Logs system events and network telemetry to console.", "monitorEnabled");

    console.log("[h4] QoL settings registered in ComfyUI Settings panel.");
}

// Fire after a short delay to ensure app.ui.settings is mounted
setTimeout(_registerH4Settings, 1000);
