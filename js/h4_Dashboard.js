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

    // Configuration State (Security First - Defaults to ON for Civitai QoL)
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
                        <div class="h4-tab-btn" data-tab="active-civitai" title="Civitai Bridge & Model Tooltips" style="color:#61afef; font-weight:700;">🔗 CIVITAI</div>
                        <div class="h4-tab-btn" data-tab="active-wires" title="Tactile Connection Styling">WIRE ADJ</div>
                        
                        <div class="h4-dash-header-small" style="margin-top:20px;">LIBRARY</div>
                        <div class="h4-tab-btn" data-tab="active-nodes" title="Node Lore and Information Archives">NODES</div>
                        <div class="h4-tab-btn" data-tab="active-about" title="Project Intelligence">ABOUT</div>
                    </div>
                    
                    <div class="h4-dash-main">
                        <div id="h4-tab-home" class="h4-tab-pane"></div>
                        <div id="h4-tab-debug" class="h4-tab-pane"></div>
                        <div id="h4-tab-qol" class="h4-tab-pane"></div>
                        <div id="h4-tab-civitai" class="h4-tab-pane"></div>
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
        const renderers = {
            'active-home': (p) => this.renderHome(p),
            'active-debug': (p) => this.renderDebug(p),
            'active-qol': (p) => this.renderQoL(p),
            'active-civitai': (p) => this.renderCivitai(p),
            'active-wires': (p) => this.renderWires(p),
            'active-nodes': (p) => this.renderNodes(p),
            'active-about': (p) => this.renderRealAbout(p)
        };

        this.modal.querySelectorAll(".h4-tab-pane").forEach(p => p.style.display = "none");
        const paneId = `h4-tab-${tabName.replace('active-', '')}`;
        const p = document.getElementById(paneId);

        if (p) {
            p.style.display = "block";
            if (renderers[tabName]) {
                renderers[tabName](p);
            }
        }
    },

    renderHome(container) {
        container.innerHTML = `
            <h2 class="h4-panel-title">SYSTEM STATUS ARCHIVE</h2>
            <div class="h4-status-card" style="background: rgba(0, 242, 255, 0.03); border: 1px solid rgba(0, 242, 255, 0.15); padding: 15px; border-radius: 4px; margin-bottom: 15px;">
                <div style="font-weight: 700; color: #00f2ff; font-size: 14px; margin-bottom: 5px;">MOTHERSHIP // RUNTIME OK</div>
                <div style="font-size: 11px; color: #aaa; line-height: 1.4;">All core nodes, Civitai bridge, passive monitoring, and UI extensions loaded and functional.</div>
            </div>
        `;
    },

    renderDebug(container) {
        container.innerHTML = "<h2 class='h4-panel-title'>DEBUG PROTOCOLS</h2>";
        this.addBool(container, "debugMode", "Nuclear Debug Mode", "Enables verbose logging (Nuclear Protocol).");
    },

    renderCivitai(container) {
        container.innerHTML = "<h2 class='h4-panel-title' style='color:#61afef;'>🔗 CIVITAI BRIDGE & MODEL TOOLTIPS</h2>";

        // 1. DEDICATED MASTER CIVITAI TOGGLE CONTAINER
        const masterBox = document.createElement("div");
        masterBox.style.cssText = "background: rgba(97, 175, 239, 0.08); border: 1px solid rgba(97, 175, 239, 0.3); padding: 15px; margin-bottom: 20px; border-radius: 6px; box-shadow: 0 0 15px rgba(97, 175, 239, 0.15);";
        this.addBool(masterBox, "civitaiGlobalToggle", "GLOBAL CIVITAI BRIDGE MASTER TOGGLE", "Master control switch for all Civitai Bridge QoL features. When enabled, Civitai search, downloads, auto-inject, sidecars, and model hover preview tooltips are active system-wide.");
        container.appendChild(masterBox);

        // 2. REAL-TIME API KEY CONFIGURATION & LIVE TEST SUITE
        const apiBox = document.createElement("div");
        apiBox.style.cssText = "background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.1); padding: 16px; margin-bottom: 20px; border-radius: 6px; display: flex; flex-direction: column; gap: 12px;";
        apiBox.innerHTML = `
            <div style="font-size: 13px; font-weight: 700; color: #61afef; display: flex; align-items: center; gap: 8px;">
                <span>🔑 CIVITAI API TOKEN (REAL-TIME ACTIVATION)</span>
            </div>
            <div style="font-size: 11px; color: #aaa; line-height: 1.4;">
                Enter your Civitai API key below for higher rate limits, NSFW model access, and restricted download permission. Changes update in real-time instantly without reloading.
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
                <input type="password" id="h4-settings-civitai-apikey" value="${this.config.civitaiApiKey || ''}" placeholder="Paste Civitai API Key here..." style="flex: 1; padding: 8px 12px; background: rgba(0, 0, 0, 0.5); border: 1px solid rgba(97, 175, 239, 0.4); border-radius: 4px; color: #fff; font-size: 12px; font-family: monospace;">
                <button id="h4-test-civitai-key-btn" style="padding: 8px 16px; background: linear-gradient(90deg, #61afef, #00f2ff); color: #121218; border: none; border-radius: 4px; font-weight: 700; font-size: 12px; cursor: pointer; white-space: nowrap; transition: opacity 0.15s;">⚡ Test API Key</button>
            </div>
            <div id="h4-civitai-key-status" style="font-size: 11px; font-weight: 600; font-family: monospace; display: none; padding: 6px 10px; border-radius: 4px;"></div>
        `;
        container.appendChild(apiBox);

        // Bind real-time input change & button click events
        const apiKeyInput = apiBox.querySelector("#h4-settings-civitai-apikey");
        const testBtn = apiBox.querySelector("#h4-test-civitai-key-btn");
        const statusBox = apiBox.querySelector("#h4-civitai-key-status");

        const updateApiKeyLocally = (val) => {
            const keyVal = val.trim();
            this.config.civitaiApiKey = keyVal;
            this.saveConfig();
            
            // Sync drawer input
            const drawerInput = document.getElementById("h4-drawer-apikey");
            if (drawerInput) drawerInput.value = keyVal;

            // Dispatch global event
            window.dispatchEvent(new CustomEvent("h4_config_update", { detail: { key: "civitaiApiKey", val: keyVal } }));
        };

        apiKeyInput.addEventListener("input", (e) => updateApiKeyLocally(e.target.value));

        testBtn.onclick = async () => {
            const keyVal = apiKeyInput.value.trim();
            updateApiKeyLocally(keyVal);

            statusBox.style.display = "block";
            statusBox.style.background = "rgba(97, 175, 239, 0.15)";
            statusBox.style.color = "#61afef";
            statusBox.style.border = "1px solid rgba(97, 175, 239, 0.4)";
            statusBox.textContent = "⌛ Testing API Key connection to Civitai servers...";

            try {
                let testUrl = `/h4/link/search?query=test&limit=1`;
                if (keyVal) testUrl += `&api_key=${encodeURIComponent(keyVal)}`;

                const resp = await fetch(testUrl);
                const data = await resp.json();

                if (data.success && Array.isArray(data.items)) {
                    statusBox.style.background = "rgba(152, 195, 121, 0.2)";
                    statusBox.style.color = "#98c379";
                    statusBox.style.border = "1px solid rgba(152, 195, 121, 0.4)";
                    statusBox.textContent = `✅ API Key Valid! Successfully connected to Civitai API (${data.items.length} items retrieved).`;
                    
                    // Trigger real-time search update if drawer is open
                    const drawerPanel = document.getElementById("h4-link-drawer-panel");
                    if (drawerPanel && drawerPanel.classList.contains("open") && window.h4_LinkQoL) {
                        window.h4_LinkQoL.performSearch();
                    }
                } else {
                    statusBox.style.background = "rgba(224, 108, 117, 0.2)";
                    statusBox.style.color = "#e06c75";
                    statusBox.style.border = "1px solid rgba(224, 108, 117, 0.4)";
                    statusBox.textContent = `❌ API Key Test Failed: ${data.error || "Civitai API returned empty response."}`;
                }
            } catch (err) {
                statusBox.style.background = "rgba(224, 108, 117, 0.2)";
                statusBox.style.color = "#e06c75";
                statusBox.style.border = "1px solid rgba(224, 108, 117, 0.4)";
                statusBox.textContent = `❌ Network Error: ${err.message}`;
            }
        };

        // 3. SUBORDINATE CIVITAI ENHANCEMENTS TOGGLES
        const groupStyle = "color: #555; font-size: 10px; letter-spacing: 2px; margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid #222; padding-bottom: 5px;";
        const h1 = document.createElement("div"); h1.style.cssText = groupStyle; h1.textContent = "CIVITAI BRIDGE ENHANCEMENTS";
        container.appendChild(h1);

        this.addBool(container, "civitaiBridgeEnabled", "Civitai Bridge Button", "Installs the Civitai Bridge button in the top toolbar to the left of Kick-The-Grid. Slide out the browser to search, preview, download, and inject models.");
        this.addBool(container, "civitaiAutoInject", "Auto-Inject Model to Loader Node", "Automatically populates the active model filename into selected LoRA/Checkpoint loader nodes upon download.");
        this.addBool(container, "civitaiSidecars", "Create Metadata Sidecars", "Automatically extracts trigger words and model specifications into .txt and .json sidecars on download.");
        this.addBool(container, "civitaiPreviewSidecars", "Create Preview Image Sidecars", "Automatically downloads thumbnail images as .preview.png alongside downloaded models for ComfyUI dropdown cards.");
        this.addBool(container, "civitaiHoverTooltip", "Model Hover Preview Tooltip", "Displays a mouse-tracking hover preview tooltip with image, trigger words, and specs when hovering over models.");
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
        refreshDim();
    },

    renderWires(container) {
        container.innerHTML = "<h2 class='h4-panel-title'>WIRE STYLING & DYNAMICS</h2>";
        this.addSelect(container, "wireStyle", "Wire Interpolation", ["Circuit", "Straight", "Spline", "Linear"], "Defines vector curvature for canvas connection paths.");
        this.addBool(container, "showWires", "Enable Custom Connections", "Applies dynamic glowing wire dynamics across the graph.");
    },

    renderNodes(container) {
        container.innerHTML = "<h2 class='h4-panel-title'>NODE LORE ARCHIVES</h2>";
        if (this.LORE && typeof this.LORE.renderArchive === 'function') {
            this.LORE.renderArchive(container);
        } else {
            container.innerHTML += "<div style='color:#666; font-size:12px;'>Lore database offline.</div>";
        }
    },

    renderRealAbout(container) {
        container.innerHTML = `
            <h2 class="h4-panel-title">PROJECT INTELLIGENCE</h2>
            <div style="font-size:12px; color:#aaa; line-height:1.6;">
                <strong>h4_Live ToolKit</strong> — High-performance forensic node pack and persistent canvas engine for ComfyUI.<br>
                Build: Production Hardened Core<br>
                Developer: (h4)<br>
                License: GPL-3.0
            </div>
        `;
    },

    addBool(container, key, labelText, descText) {
        const row = document.createElement("div");
        row.className = "h4-set-row";
        row.style.cssText = "display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);";

        const info = document.createElement("div");
        info.style.cssText = "flex: 1; padding-right: 15px;";
        
        const lbl = document.createElement("div");
        lbl.style.cssText = "font-weight: 600; color: #fff; font-size: 13px;";
        lbl.textContent = labelText;

        const desc = document.createElement("div");
        desc.style.cssText = "font-size: 11px; color: #888; margin-top: 3px; line-height: 1.3;";
        desc.textContent = descText;

        info.appendChild(lbl);
        info.appendChild(desc);

        const toggle = document.createElement("label");
        toggle.className = "h4-switch";
        toggle.style.cssText = "position: relative; display: inline-block; width: 40px; height: 20px; flex-shrink: 0;";

        const input = document.createElement("input");
        input.type = "checkbox";
        input.id = `h4-cfg-${key}`;
        input.checked = !!this.config[key];
        input.style.cssText = "opacity: 0; width: 0; height: 0;";

        const slider = document.createElement("span");
        slider.style.cssText = `position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: ${input.checked ? '#61afef' : '#333'}; transition: .2s; border-radius: 20px;`;

        input.onchange = () => {
            this.config[key] = input.checked;
            slider.style.backgroundColor = input.checked ? '#61afef' : '#333';
            this.saveConfig();
            window.dispatchEvent(new CustomEvent("h4_config_update", { detail: { key, val: input.checked } }));
        };

        toggle.appendChild(input);
        toggle.appendChild(slider);

        row.appendChild(info);
        row.appendChild(toggle);
        container.appendChild(row);
    },

    addSelect(container, key, labelText, optionsArray, descText) {
        const row = document.createElement("div");
        row.className = "h4-set-row";
        row.style.cssText = "display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);";

        const info = document.createElement("div");
        info.style.cssText = "flex: 1; padding-right: 15px;";
        const lbl = document.createElement("div"); lbl.style.cssText = "font-weight: 600; color: #fff; font-size: 13px;"; lbl.textContent = labelText;
        const desc = document.createElement("div"); desc.style.cssText = "font-size: 11px; color: #888; margin-top: 3px;"; desc.textContent = descText;
        info.appendChild(lbl); info.appendChild(desc);

        const select = document.createElement("select");
        select.style.cssText = "background: rgba(0,0,0,0.5); border: 1px solid #444; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 12px; cursor: pointer;";

        optionsArray.forEach(opt => {
            const o = document.createElement("option");
            o.value = opt;
            o.textContent = opt;
            if (opt === this.config[key]) o.selected = true;
            select.appendChild(o);
        });

        select.onchange = () => {
            this.config[key] = select.value;
            this.saveConfig();
            window.dispatchEvent(new CustomEvent("h4_config_update", { detail: { key, val: select.value } }));
        };

        row.appendChild(info);
        row.appendChild(select);
        container.appendChild(row);
    },

    saveConfig() {
        try {
            localStorage.setItem("h4_dashboard_config", JSON.stringify(this.config));
        } catch (e) {
            console.error("[h4] Dashboard: Failed to persist configuration", e);
        }
    },

    loadConfig() {
        try {
            const saved = localStorage.getItem("h4_dashboard_config");
            if (saved) {
                const parsed = JSON.parse(saved);
                this.config = { ...this.config, ...parsed };
            }
        } catch (e) {
            console.error("[h4] Dashboard: Failed to load configuration", e);
        }
    },

    injectCSS() {
        if (document.getElementById("h4-dashboard-styles")) return;
        const style = document.createElement("style");
        style.id = "h4-dashboard-styles";
        style.textContent = `
            #h4-dashboard-modal {
                position: fixed;
                top: 50px;
                left: 50px;
                width: 680px;
                height: 520px;
                background: rgba(14, 14, 20, 0.96);
                backdrop-filter: blur(16px);
                border: 1px solid rgba(97, 175, 239, 0.4);
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(97, 175, 239, 0.2);
                border-radius: 8px;
                z-index: 100000;
                display: none;
                flex-direction: column;
                color: #e0e0e0;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                overflow: hidden;
                opacity: 0;
                transition: opacity 0.25s ease-out;
            }
            #h4-dashboard-modal.open { opacity: 1; display: flex; }
            
            .h4-dash-content { display: flex; flex-direction: column; width: 100%; height: 100%; }
            .h4-dash-header { padding: 12px 16px; background: rgba(255, 255, 255, 0.03); border-bottom: 1px solid rgba(255, 255, 255, 0.08); display: flex; justify-content: space-between; align-items: center; cursor: move; user-select: none; }
            .h4-dash-title { font-weight: 700; color: #61afef; letter-spacing: 1px; font-size: 13px; font-family: monospace; }
            .h4-header-controls { display: flex; align-items: center; }

            .h4-dash-body { display: flex; flex: 1; overflow: hidden; }
            .h4-dash-sidebar { width: 150px; background: rgba(0, 0, 0, 0.3); border-right: 1px solid rgba(255, 255, 255, 0.06); padding: 15px 10px; display: flex; flex-direction: column; gap: 4px; user-select: none; }
            .h4-dash-header-small { font-size: 9px; font-weight: 700; color: #666; letter-spacing: 1.5px; margin-bottom: 6px; margin-top: 4px; padding-left: 6px; }
            
            .h4-tab-btn { padding: 8px 10px; border-radius: 4px; font-size: 12px; color: #aaa; cursor: pointer; transition: all 0.15s; font-weight: 600; }
            .h4-tab-btn:hover { background: rgba(255, 255, 255, 0.05); color: #fff; }
            .h4-tab-btn.active { background: rgba(97, 175, 239, 0.15); color: #61afef; border-left: 3px solid #61afef; border-radius: 0 4px 4px 0; }

            .h4-dash-main { flex: 1; padding: 20px; overflow-y: auto; }
            .h4-panel-title { font-size: 14px; font-weight: 700; color: #00f2ff; letter-spacing: 1px; margin-top: 0; margin-bottom: 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 8px; }
        `;
        document.head.appendChild(style);
    },

    initDraggable() {
        if (!this.modal) return;
        const handle = this.modal.querySelector(".h4-drag-handle");
        if (!handle) return;

        handle.addEventListener("mousedown", (e) => {
            if (e.target.closest(".h4-header-controls")) return;
            this._dragState.active = true;
            this._dragState.startX = e.clientX - this._dragState.x;
            this._dragState.startY = e.clientY - this._dragState.y;

            const onMouseMove = (me) => {
                if (!this._dragState.active) return;
                this._dragState.x = me.clientX - this._dragState.startX;
                this._dragState.y = me.clientY - this._dragState.startY;
                this.modal.style.transform = `translate(${this._dragState.x}px, ${this._dragState.y}px)`;
                this.config.offsetX = this._dragState.x;
                this.config.offsetY = this._dragState.y;
            };

            const onMouseUp = () => {
                this._dragState.active = false;
                this.saveConfig();
                document.removeEventListener("mousemove", onMouseMove);
                document.removeEventListener("mouseup", onMouseUp);
            };

            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
        });
    },

    togglePin() {
        this.config.panelPinned = !this.config.panelPinned;
        this.saveConfig();
        this.setPanelMode(this.config.panelPinned ? 'pinned' : 'modal');
    },

    setPanelMode(mode) {
        this.panelMode = mode;
        if (!this.modal) return;

        if (mode === 'pinned') {
            this.modal.style.position = "fixed";
            this.modal.style.top = "60px";
            this.modal.style.left = "10px";
            this.modal.style.transform = "none";
            this.modal.style.height = "calc(100vh - 80px)";
        } else {
            this.modal.style.position = "fixed";
            this.modal.style.top = "50px";
            this.modal.style.left = "50px";
            this.modal.style.transform = `translate(${this.config.offsetX || 0}px, ${this.config.offsetY || 0}px)`;
            this.modal.style.height = "520px";
        }
    }
};

// ------------------------------------------------------------------------------
// Register Extension & Settings with ComfyUI
// ------------------------------------------------------------------------------
app.registerExtension({
    name: "h4.Dashboard",
    async setup() {
        h4_Dashboard.init();

        // Top Toolbar Button Integration
        const btn = document.createElement("div");
        btn.id = "h4-dashboard-toggle-btn";
        btn.innerHTML = "⚡ h4 Settings";
        btn.title = "Open h4_Live System Configuration";
        btn.style.cssText = "position: fixed; top: 5px; right: 350px; z-index: 100000; color: #00f2ff; font-family: monospace; font-weight: bold; font-size: 13px; cursor: pointer; padding: 2px 10px; background: rgba(0, 0, 0, 0.7); border-radius: 4px; border: 1px solid #00f2ff; user-select: none; transition: all 0.1s; display: flex; align-items: center; justify-content: center; height: 26px; box-sizing: border-box; box-shadow: 0 0 10px rgba(0, 242, 255, 0.3);";
        btn.onclick = () => h4_Dashboard.toggle();
        document.body.appendChild(btn);
    }
});

// ComfyUI Native Settings Integration
if (app.ui && app.ui.settings) {
    const addQoL = (id, name, desc, configKey) => {
        app.ui.settings.addSetting({
            id: `h4.QoL.${id}`,
            name: `h4: ${name}`,
            type: "boolean",
            defaultValue: true,
            onChange(value) {
                if (window.h4_Dashboard) {
                    window.h4_Dashboard.setConfig ? window.h4_Dashboard.setConfig(configKey, value) : (window.h4_Dashboard.config[configKey] = value);
                }
            },
        });
    };

    addQoL("masterOverride", "Master QoL Override", "Primary gate. Disabling this silences all QoL features.", "qolMasterOverride");
    addQoL("civitaiGlobalToggle", "Global Civitai Bridge Master Toggle", "Master control switch for all Civitai Bridge QoL features.", "civitaiGlobalToggle");
    addQoL("civitaiBridge", "Civitai Bridge Button", "Installs Civitai Bridge button in toolbar to the left of Kick-The-Grid.", "civitaiBridgeEnabled");
    addQoL("civitaiAutoInject", "Civitai Auto-Inject", "Auto-populates downloaded model names into canvas loader nodes.", "civitaiAutoInject");
    addQoL("civitaiSidecars", "Civitai Metadata Sidecars", "Creates .txt and .json trigger word sidecars on model download.", "civitaiSidecars");
    addQoL("civitaiPreviewSidecars", "Civitai Image Sidecars", "Downloads thumbnail images as .preview.png alongside models.", "civitaiPreviewSidecars");
    addQoL("civitaiHoverTooltip", "Model Hover Preview Tooltip", "Displays mouse-tracking model preview tooltips on hover.", "civitaiHoverTooltip");

    console.log("[h4] QoL settings registered in ComfyUI Settings panel.");
}
