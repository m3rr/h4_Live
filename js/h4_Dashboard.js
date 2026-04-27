import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
// import { H4_ICON_B64 } from "./assets/h4_icon_b64.js"; // Removed to prevent blocking load failure

console.log("[h4] h4_Dashboard.js LOADED (Sanity Check)");

// ------------------------------------------------------------------------------
// H4 Dashboard - The Central Hub
// ------------------------------------------------------------------------------

// --- THE BOOK OF H4 (LORE SYSTEM ACTIVE) ---


export const h4_Dashboard = {
    modal: null,
    isOpen: false,
    activeTab: 'active-home', // DEFAULT: Home Splash

    // Configuration State (The merged settings from BigBrother)
    // ALL DEFAULTS MUST BE OFF/FALSE
    config: {
        // Core
        enabled: true,        // Global Enable
        debugMode: false,
        qolMasterOverride: true, // Master QoL Toggle

        // Monitor (BigBrother)
        monitorEnabled: false,
        showErrorPopup: false,

        // Grid / Visuals
        showGrid: false,
        showWires: false,
        wireStyle: "Circuit",
        wireSpacing: 1.0,
        wireColorSelect: "#00FF00",
        wireColorError: "#FF0000",
        gridColor: "rgba(255, 200, 0, 0.15)",

        // UI Hygiene (QoL)
        deadWeightEnabled: true,   // D.W.D Toolbar
        caffeineEnabled: true,     // Caffeine Mode
        kickItEnabled: true,       // Kick-The-Grid
        smartSnapping: false,      // Node Snapping
        ioColoring: false,         // Dynamic Socket Colors

        // Aesthetic Layer
        sovereignCoreEnabled: true,

        // Offsets
        offsetX: 0,
        offsetY: 0,
        wireOffsetY: 0
    },

    init() {
        console.log("[h4] Dashboard: Initializing...");
        try {
            this.injectCSS();
            this.createModal();
            window.h4_Dashboard = this; // Expose globally for Sidebar
            console.log("[h4] Dashboard: Global Object Set -> window.h4_Dashboard");

            // Load saved settings if any
            this.loadConfig();
        } catch (error) {
            console.error("[h4] Dashboard: Init FAILED", error);
            alert("H4 Dashboard Init Failed: " + error.message);
        }
    },

    toggle() {
        if (this.isOpen) this.close();
        else this.open();
    },

    open() {
        this.modal.style.display = "flex";
        requestAnimationFrame(() => {
            this.modal.classList.add("open");
        });
        this.isOpen = true;
        this.renderTab(this.activeTab); // Will render active-home
    },

    close() {
        this.modal.classList.remove("open");
        setTimeout(() => {
            this.modal.style.display = "none";
        }, 300); // Wait for transition
        this.isOpen = false;
    },

    createModal() {
        const el = document.createElement("div");
        el.id = "h4-dashboard-modal";
        el.className = "h4-glitch-container";

        el.innerHTML = `
            <div class="h4-dash-content">
                <div class="h4-dash-header">
                    <div class="h4-dash-title">h4_LIVE // SYSTEM_CONFIG</div>
                    <div class="h4-dash-close">x</div>
                </div>
                
                
                <div class="h4-dash-body">
                    <div class="h4-dash-sidebar">
                        <div class="h4-dash-header-small">SYSTEM</div>
                        <div class="h4-tab-btn active" data-tab="active-home">HOME</div>
                        <div class="h4-tab-btn" data-tab="active-debug">DEBUG</div>
                        <div class="h4-tab-btn" data-tab="active-qol">QoL</div>
                        <div class="h4-tab-btn" data-tab="active-wires">WIRE ADJ</div>
                        
                        <div class="h4-dash-header-small" style="margin-top:20px;">LIBRARY</div>
                        <div class="h4-tab-btn" data-tab="active-nodes">NODES</div>
                        <div class="h4-tab-btn" data-tab="active-about">ABOUT</div>
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

        // Events
        el.querySelector(".h4-dash-close").onclick = () => this.close();

        const tabs = el.querySelectorAll(".h4-tab-btn");
        tabs.forEach(t => {
            t.onclick = (e) => {
                // UI Toggle
                tabs.forEach(x => x.classList.remove("active"));
                e.target.classList.add("active");

                // Logic
                this.activeTab = e.target.dataset.tab;
                this.renderTab(this.activeTab);
            }
        });
    },

    renderTab(tabName) {
        // Hide all panes
        this.modal.querySelectorAll(".h4-tab-pane").forEach(p => p.style.display = "none");

        if (tabName === "active-home") {
            const p = document.getElementById("h4-tab-home");
            p.style.display = "block";
            this.renderHome(p);
        } else if (tabName === "active-debug") {
            const p = document.getElementById("h4-tab-debug");
            p.style.display = "block";
            this.renderDebug(p);
        } else if (tabName === "active-qol") {
            const p = document.getElementById("h4-tab-qol");
            p.style.display = "block";
            this.renderQoL(p);
        } else if (tabName === "active-wires") {
            const p = document.getElementById("h4-tab-wires");
            p.style.display = "block";
            this.renderWires(p);
        } else if (tabName === "active-nodes") {
            const p = document.getElementById("h4-tab-nodes");
            p.style.display = "block";
            this.renderNodes(p);
        } else if (tabName === "active-about") {
            const p = document.getElementById("h4-tab-about");
            p.style.display = "block";
            // renderAbout is now renderHome, so we need to restore renderAbout content or use a new method
            // Actually I overwrote renderAbout in the previous step to point to renderHome.
            // I should revert that change or create a real renderAbout method.
            this.renderRealAbout(p);
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
        masterBox.style.cssText = "background: rgba(0,242,255,0.05); border: 1px solid rgba(0,242,255,0.2); padding: 15px; margin-bottom: 20px; border-radius: 4px;";
        this.addBool(masterBox, "qolMasterOverride", "MASTER QoL OVERRIDE", "The primary jurisdiction gatekeeper. When disabled, all subordinate QoL enhancements are silenced and detached from the system.");
        container.appendChild(masterBox);

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
        // --- UTILS ---
        function getRandomIcon() {
            const icons = ["{:}", "[+]", "<*>", "//", "#!", "{?}", "[x]", ">>", "**", "&&", "$$", "%%", "@@", "(o)", "[ ]"];
            return icons[Math.floor(Math.random() * icons.length)];
        }

        const h4Nodes = [];
        if (typeof LiteGraph !== "undefined") {
            for (const key in LiteGraph.registered_node_types) {
                if (key.startsWith("H4_") || key.startsWith("h4_") || key.includes("FaceForge")) {
                    h4Nodes.push({
                        type: key,
                        def: LiteGraph.registered_node_types[key]
                    });
                }
            }
        }

        if (h4Nodes.length === 0) {
            grid.innerHTML = "<div style='padding:20px; grid-column: 1/-1;'>No H4 Nodes Found. System Offline?</div>";
            return;
        }

        // 4. Render Loop
        const render = (filter = "") => {
            grid.innerHTML = "";
            h4Nodes.forEach(n => {
                const title = n.def.title || n.type;
                const cleanTitle = title.replace(/^h4\\s*-\\s*/i, "").replace(/^H4\\s*/, "");

                if (filter && !cleanTitle.toLowerCase().includes(filter.toLowerCase())) return;

                const card = document.createElement("div");
                card.className = "h4-node-card";
                card.innerHTML = `
                    <div class="h4-node-icon">${getRandomIcon()}</div>
                    <div class="h4-node-title">${cleanTitle}</div>
                    <div class="h4-node-type">${n.type}</div>
                    <div class="h4-node-actions">
                        <button class="h4-btn-summon">SUMMON</button>
                    </div>
                `;

                // --- EVENTS ---

                // Click Card -> Open Docs ("The Book of H4")
                // card.onclick -> Open Docs
                card.onclick = (e) => {
                    if (e.target.classList.contains("h4-btn-summon")) return;
                    this.openNodeDocs(n);
                };

                // Summon Button
                const btnSummon = card.querySelector(".h4-btn-summon");
                btnSummon.onclick = () => {
                    this.summonNode(n.type);
                };

                grid.appendChild(card);
            });
        };

        // Output initial render
        render();

        // Search Listener
        searchRow.querySelector("input").oninput = (e) => render(e.target.value);

        // Inject Styles if needed
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
    getLore(type) {
        // Mapping internal types to Lore Keys if needed, or direct lookup
        // The JSON keys match the node types directly (e.g. "H4_ModelMerger").
        if (this.LORE && this.LORE[type]) return this.LORE[type];
        return null;
    },

    LORE: {
        // --- LOGIC & TRAFFIC CONTROL ---
        "H4_TrafficRouter": {
            "title": "H4 Traffic Router // THE NEXUS",
            "description": "The definitive command-and-control center for cyclic workflows. In a standard 'vending machine' workflow, data moves once and dies. The Nexus changes that. It acts as a jurisdictional gatekeeper: on the first run (Run 0), it sources data from your 'Start' input. On every subsequent loop (Run 1+), it instantly redirects to the 'Loop' input. This allows for recursive refining, feedback loops, and multi-stage creative evolutions without manually shifting wires.",
            "usage": "The core of your engine. Connect your initial Load Image to 'first_run_in' and the refined result from the end of your chain (likely via an H4_ImageBuffer) to 'loop_run_in'. It coordinates the hand-off between creation and refinement perfectly.",
            "tips": ["Use the 'Smart Denoise' outputs to differentiate between the heavy lifting of the first pass and the surgical refinement of the loops.", "If inputs are missing, the Router defaults to a safe-pass mode to prevent workflow crashes."]
        },
        "H4_TrafficCop": {
            "title": "H4 Traffic Cop // THE FORK",
            "description": "A logic-based bifurcator. While the Router merges, the Cop splits. It detects the current system state and routes a single input signal to either the 'Start' or 'Loop' output path. It is essentially a 'Switch' node that understands time.",
            "usage": "Use this when you want a specific part of your workflow to *only* fire during the first generation, or *only* during the recursive loops (e.g. only adding grain on the final pass).",
            "tips": ["Connect a single data source (like a prompt) and fork it into two different encoders based on loop count."]
        },
        "H4_TrafficMerge": {
            "title": "H4 Traffic Merge // THE ZIPPER",
            "description": "The inverse of the Traffic Cop. It pulls from two separate logic paths and 'Zips' them into a single coherent stream based on the loop phase. It is hardened against cycle errors and features a specialized 'Wireless Buffer' integration to prevent ComfyUI from panicking during feedback loops.",
            "usage": "Perfect for bringing divergent logic chains back together before they hit the KSampler.",
            "tips": ["Enable 'Auto-Loop-Reset' if you want the counter to clear when you disconnect the primary input."]
        },
        "H4_LoopIncrementer": {
            "title": "H4 Loop Incrementer // THE CLICKER",
            "description": "The odometer of your creative process. Every time data passes through this node, it signals the global H4 Kernel that a step is complete. It is the engine that drives the Traffic Router's decision-making process.",
            "usage": "Place this immediately after your primary generation or save node. It passes data through with zero latency while updating the system state.",
            "tips": ["Always place it *after* nodes that could potentially fail. You only want the count to go up if the step actually worked."]
        },
        "H4_WirelessResetButton": {
            "title": "H4 Wireless Reset // THE RED BUTTON",
            "description": "A virtual, wireless kill-switch. When your loop has achieved perfection—or if it's spiralling into chaos—you need a way to clear the deck. This button sends a sub-atomic signal across the entire graph to reset the Mission Control counter to zero instantly.",
            "usage": "Keep it near your 'Play' button. Toggle it whenever you want to start a 'Run 0' from scratch.",
            "tips": ["It is non-destructive. It only resets the internal counter; it never deletes your work."]
        },

        // --- CONTEXT & DATA BUNDLING ---
        "H4_ContextHub": {
            "title": "H4 Context Hub // THE MOTHERSHIP",
            "description": "Cables are the enemy of clarity. The Context Hub is your tactical wiring solution. It accepts every conceivable ComfyUI data type—Models, VAEs, CLIPs, Conds, Latents, Images, and Masks—and bundles them into a single, high-bandwidth 'H4_PIPE'. One purple wire to rule them all.",
            "usage": "Place it at the start of your graph. Feed it your 'Base' components. Then, just drag one single wire across your canvas to the destination.",
            "tips": ["Chaining Hubs allows you to 'Update' a pipe. Connect an old pipe to 'base_pipe' and plug in a new VAE—the Mothership will intelligently swap the component in transit."]
        },
        "H4_ContextUnpack": {
            "title": "H4 Context Unpack // THE DISTRIBUTOR",
            "description": "The destination for your Mothership's signal. It takes the bundled 'H4_PIPE' and decodes it back into its individual components with zero loss and zero latency.",
            "usage": "Place this near your KSamplers or processing nodes. Instead of running 10 wires from the left side of the map, just plug in the Pipe and pull what you need.",
            "tips": ["Unused outputs are 'Safe'. They won't cause errors if left disconnected."]
        },
        "H4_Oxidine": {
            "title": "H4 Oxidine // THE SENTIENT CONDUIT",
            "description": "A paradigm-shifting approach to connectivity. Oxidine is an 'Omni-Proxy'. It is a single node with one input and one output that *automatically shapeshifts* to match whatever is plugged into it. If you plug in a Model, it is a Model. If you plug in a Mask, it is a Mask.",
            "usage": "Use it to pass data through your graph without knowing the type in advance. It prevents 'Type Mismatch' errors by acting as a universal translator.",
            "tips": ["Extremely useful for modular workflow templates where components might be swapped frequently."]
        },

        // --- MISSION CONTROL ---
        "H4_MissionControl": {
            "title": "H4 Mission Control // THE FLIGHT DECK",
            "description": "The administrative heart of the toolkit. While the Router handles the plumbing, Mission Control handles the soul. It tracks the global loop count, provides real-time telemetry on system health, and coordinates all scheduler signals. It is the conductor that ensures every node is playing in the correct key.",
            "usage": "Required for any 'Live' workflow. Set to 'Active' to drive the generation loop, or 'Passive' to simply monitor state. It acts as the anchor point for your creative process.",
            "tips": ["Features a 'Wireless Reset' listener—pair it with the Red Button for tactical control."]
        },
        "H4_LinearScheduler": {
            "title": "H4 Linear Scheduler // THE RAMP",
            "description": "Control change over time with mathematical precision. This node generates a ramping float value based on where you are in your loop. You define the Start, the End, and the Max steps, and it handles the trajectory.",
            "usage": "Perfect for 'Denoise Ramps' (e.g. Start at 0.8 on Run 0, and slowly drop to 0.1 by Run 5) or CFG sweeps.",
            "tips": ["Use 'Loop Mode' to have the ramp automatically reset and restart once it hits the maximum value."]
        },
        "H4_SeedGenerator": {
            "title": "H4 Seed Generator // SIGNAL GEN",
            "description": "The source of controlled randomness. Unlike standard seed nodes that are either 'fixed' or 'randomized' per-queue, this node is 'Sequence Aware'. It can increment, decrement, or scramble seeds based on the H4 loop state.",
            "usage": "Use 'Incremental' to explore the neighbors of a specific seed across multiple runs, or 'Loop Sync' to ensuring a specific seed only changes when the loop resets.",
            "tips": ["Perfect for 'Exploratory Grids' where you want to see how a prompt evolves across 10 different seeds."]
        },

        // --- LOADERS & FILE OPS ---
        "H4_UniversalLoader": {
            "title": "H4 Universal Loader // SKELETON KEY",
            "description": "The only loader you will ever need. It intelligently bridges the gap between 'Checkpoints' (Safetensors), 'Diffusers' (Directory-based), and 'GGUF' (Quantized). It also features built-in LoRA support and 'Architecture Detection'—meaning it automatically configures itself for SDXL, Flux, or the new Wan 2.1 video models without you lifting a finger.",
            "usage": "Simply select your model. The node will probe the file headers, determine the required CLIP/VAE configuration, and 'just work.' It's magic.",
            "tips": ["Features 'GGUF Delegation'—if you select a GGUF file, it automatically routes the processing through the GGUF kernel if installed."]
        },
        "h4_Complete_Loader": {
            "title": "H4 Complete Loader // THE SWISS ARMY",
            "description": "A high-density loader designed for performance. It features a tactical HTML overlay that stays hidden until needed. Click 'Smart Upload' and it expands to handle up to 4 reference images, patching them directly into your workflow alongside the model and LoRA stack. It's designed to have a zero-pixel footprint for any feature you aren't using.",
            "usage": "The ultimate starter node. Load your model, your LoRA, and your reference images in one tiny box.",
            "tips": ["Drag an image *directly* onto the node to 'Smart Upload' it instantly."]
        },
        "h4_Multi_ImgUpload": {
            "title": "H4 Multi-Upload // THE GALLERY",
            "description": "For when one image isn't enough. A dedicated image ingestion engine that supports up to 10 simultaneous uploads via a single tactical button. It uses dynamic socket allocation, meaning it only shows as many outputs as you have images uploaded.",
            "usage": "Perfect for batch processing, IPAdapter reference sets, or building massive image grids.",
            "tips": ["Upload 10 images and watch it scale. Delete half and watch the sockets collapse to keep your canvas clean."]
        },
        "H4_SmartSave": {
            "title": "H4 SmartSave // THE FORENSIC VAULT",
            "description": "The gold standard for image output. It's not just a file saver; it's a metadata forensic lab. It 'Fingerprints' every image by embedding the entire prompt, seed, model hashes, and the workflow graph itself into the PNG chunks. It features a 'History Rail' (The Viewport) that tracks every generation in your session with high-res previews and metadata inspection.",
            "usage": "Replace your standard Save nodes. Toggle 'Save to Disk' to commit files, or leave it OFF for 'Stealth Mode' (RAM-only preview). Click the '?' Icon for the History Rail.",
            "tips": ["Use 'Privacy Mode' to blur the history thumbnails if you're streaming or in public.", "Right-click the History Rail to 'Export DNA' (Save metadata as JSON)."]
        },
        "H4_ModelSave": {
            "title": "H4 Model Save // THE VAULT",
            "description": "Safeguard your fine-tunes or merges. This node handles the complex task of serializing massive model weights to disk without crashing your system. It features 'Nuclear RAM Saver' technology that writes the file in chunks, circumventing the OOM (Out Of Memory) errors common when saving 10GB+ checkpoints.",
            "usage": "Connect your merged Model, CLIP, and VAE. Pick a format (FP16, BF16, or the new E4M3FN Float8). Name it and commit.",
            "tips": ["Always use BF16 for modern architectures (SDXL/Flux) and FP16 for SD1.5 to ensure best precision-to-weight ratio."]
        },

        // --- IMAGE PROCESSING ---
        "H4_Mutate": {
            "title": "H4 Mutate // THE FINISHER",
            "description": "The definitive post-processing monolith. Why chain 10 nodes for sharpness, color grading, and film grain when you can do it in one? Mutate is a 7-stage image manipulation pipeline: Color Grade, Sharpness, Upscale, Style Transfer, Film Emulation, Vignette, and FX. Each section is modular—it only expands and uses compute when you turn it ON.",
            "usage": "Drop it at the end of your workflow. Turn on 'Film' for Portra 400 emulation. Turn on 'Color' to push the shadows. It's the 'Final Polish' node.",
            "tips": ["Change the 'Pipeline Order' to determine if you sharpen *before* or *after* the upscale. It makes a huge difference in the final look."]
        },
        "H4_PixelPress": {
            "title": "H4 Pixel Press // THE DENSITY GOD",
            "description": "A professional-grade HDR and Density engine. It supersamples your image, applies custom tone mapping to recover blown-out highlights and crushed shadows, sharpens at the super-resolution level, and downsamples back to target. The result is an image with 'High Information Density' and zero aliasing.",
            "usage": "Use this for 'High-End' outputs where standard upscaling isn't crisp enough. It mimics the look of high-end camera sensors.",
            "tips": ["Enable 'Tiled' mode for massive 4K+ renders to keep your VRAM happy."]
        },
        "H4_FaceForge": {
            "title": "H4 FaceForge // THE SURGEON",
            "description": "The flagship face manipulation suite. It's not just a face swapper; it's a full reconstructive engine. It combines Swapping (InsightFace), Restoration (CodeFormer/GFPGAN), and 'Boosting' (performing a high-res generation pass on the face) into a single, automated workflow.",
            "usage": "Feed it a source and destination. It handles the alignment, swapping, and blending automatically. Features 'Occlusion Guard' to prevent hair/hands from being 'swapped away.'",
            "tips": ["Enable 'Face Boosting' to 2x the face resolution before restoration for the most realistic skin textures."]
        },
        "h4_pythonipulator_inator": {
            "title": "h4 Pythonipulator-inator // THE IMAGE KERNEL",
            "description": "[ WIP ] A raw, distributed image manipulation kernel that exposes low-level Python primitives (OpenCV/Pillow/Numpy) as tactical blocks. It is designed for 'Degenerate Art'—glitching, geometric scrambling, and extreme bit-level operations that standard nodes can't touch.",
            "usage": "Experimental usage only. Use to add 'Cyberpunk' glitches or mathematical artifacts to your image stream.",
            "tips": ["The 'Glitch-Core' settings can create anything from subtle VHS noise to total digital annihilation."]
        },

        // --- GRID & TESTING ---
        "H4_Gridinator": {
            "title": "H4 Gridinator // THE MONOLITH",
            "description": "An X/Y/Z Plotter without the spaghetti. Gridinator is a self-contained generation environment that handles model switching, LoRA patching, and sampling internally. You define your axes (e.g. X = Prompt, Y = Model, Z = Denoise) and it builds the entire comparison grid in one go.",
            "usage": "Perfect for testing which LoRA at which strength works best with which Checkpoint. Highly efficient—it only reloads models when they actually change on the axis.",
            "tips": ["Use 'Fuzzy Mapping' for model names—no need to type the full '.safetensors' path, just a keyword will find it."]
        },
        "H4_Comparinator": {
            "title": "H4 Comparinator // THE SNIPER",
            "description": "Professional-grade A/B testing. It features a 3-pane viewport with a sliding divider for pixel-accurate comparisons. It saves every generation to a local 'Vault' history, allowing you to drag past images back into the view. Includes a 'Sniper Scope' for inspecting fine details (eyes, hands) at 4x magnification.",
            "usage": "Place it at the end of your workflow. Compare your current run against your 'Gold Standard' reference on the left.",
            "tips": ["Use the 'Telemetry Drawer' to see the exact prompt and seed differences between the two images you are comparing."]
        },

        // --- UTILITIES & DOCS ---
        "H4_DocuScribe": {
            "title": "H4 DocuScribe // THE REPORTER",
            "description": "An automated workflow documenter. Connect nodes to DocuScribe, and it will generate a clean, readable Markdown report detailing every setting, model name, and parameter used in your graph.",
            "usage": "Connect the 'Context' or individual nodes. It writes a file to your /output/ folder every time you generate. Perfect for tracking your experiments.",
            "tips": ["Great for sharing workflows or keeping a 'Logbook' of your best settings."]
        },
        "H4_ModelMerger": {
            "title": "H4 Model Merger // THE LAB",
            "description": "Absolute MAD SCIENCE. This is deep, block-level weight manipulation—injecting the soul of one model into the body of another. Unlike basic mergers that just average everything out, this allows you to surgically target specific layers of the UNet. Want the composition of SDXL but the shading of an anime model? This is your scalpels and lightning bolts.",
            "usage": "For creating custom hybrid models on the fly. The 'Test Image' output lets you verify the merge instantly before committing to a 50GB file.",
            "tips": ["Lower Input blocks usually affect composition/shapes.", "Higher Output blocks affect fine details/textures/lighting."]
        },
        "H4_DoubleSampler": {
            "title": "H4 Double Sampler // THE TWO-PASS ENGINE",
            "description": "The monster truck of samplers. It handles a full two-stage generation pipeline (Base + Refiner) in a single node. Features prompt 'Stutter' (transformation between passes), CFG sliding, and native noise-injection control.",
            "usage": "Use this for 'High-Relief' generations where you need a secondary pass to fix textural hallucinations or add fine-grained detail.",
            "tips": ["Enable 'Stutter Mode' for more stylistic divergence between the base and refiner passes."]
        },
        "H4_Varianator": {
            "title": "H4 Varianator // THE REMIX",
            "description": "A high-speed iteration engine. It takes an image and generates a series of 'Variations' based on a secondary prompt or structural mask. It's essentially a condensed Img2Img workflow optimized for speed.",
            "usage": "Use it find 'The One' when you like the composition but want to explore different lighting or color palettes.",
            "tips": ["Low denoise (0.1 - 0.3) keeps the structure; high denoise (0.6+) allows for total mutation."]
        },
        "H4_NoteInjector": {
            "title": "H4 Note Injector // CANVAS DECAL",
            "description": "Add high-visibility tactical notes directly to your canvas. These aren't just standard ComfyUI notes; they feature the H4 tactical aesthetic, glowing borders, and support for Markdown-style formatting.",
            "usage": "Use them to label sections of your workflow or leave instructions for other users.",
            "tips": ["Double-click to expand/collapse. They stay visible even at far zoom levels (LOD Guard)."]
        },
        "H4_AxisDriver": {
            "title": "H4 Axis Driver // GRID CONTROL",
            "description": "The logic backbone for the Gridinator. This node defines the 'Variable' that changes across your image grid. It can drive Model names, CFG values, Float Ramps, or specialized Prompt keywords.",
            "usage": "Connect multiple Drivers to the Gridinator to create X/Y/Z plots. Each driver handles one axis of variability.",
            "tips": ["Use 'Fuzzy Search' for model paths to keep your drivers clean."]
        },
        "H4_DataStream": {
            "title": "H4 Data Stream // BATCH PIPELINE",
            "description": "A high-performance batch loader. It streams data (Images, JSON, or Text) from a directory and iterates through them per-queue. It is designed for 'Industrial' generation where you are processing hundreds of files.",
            "usage": "Select a path and connect to your encoders. It handles the indexing and looping through the filesystem automatically.",
            "tips": ["Enable 'Skip Existing' to resume a project if your system crashes."]
        },
        "H4_ForgeMask": {
            "title": "H4 Forge Mask // SURGICAL SUITE",
            "description": "A monolithic masking toolkit. It combines Blur, Grow/Shrink, Invert, and specialized 'Edge Softening' kernels for precise inpainting control. It features a custom HUD for visualising the mask fidelity before it hits the sampler.",
            "usage": "Connect a Mask or Image. Use the 'Sovereign HUD' to tweak the mask threshold in real-time.",
            "tips": ["Use 'Soft Feathering' to eliminate hard edges in face swaps and detailer passes."]
        },
        "H4_SmartConsole": {
            "title": "H4 Smart Console // X-RAY",
            "description": "A tactical debugger. It intercepts data in transit and displays a detailed breakdown of tensor shapes, data types, and values directly on top of the node. No more guessing why your latent is the wrong resolution.",
            "usage": "Plug it into any wire to see the 'X-Ray' of what is moving through that connection.",
            "tips": ["Right-click to copy the data dump to your clipboard for analysis."]
        },
        "H4_SeedSequencer": {
            "title": "H4 Seed Sequencer // CHAOS CONTROLLER",
            "description": "Advanced randomness management. Unlike the standard Seed Generator, the Sequencer allows you to define 'Keys' (specific seed lists) and cycle through them. It ensures that your 'Random' generations are actually predictable and repeatable experiments.",
            "usage": "Define a list of seeds and a movement mode (Linear, Ping-Pong, Random). Perfect for testing a prompt against a broad but controlled set of seeds.",
            "tips": ["Use 'Ping-Pong' mode to iterate back and forth through a sequence of 5 seeds."]
        },
        "H4_PixelVisualizer": {
            "title": "H4 Pixel Visualizer // DIFF INSPECTOR",
            "description": "See the invisible. This node performs a mathematical 'Subtraction' between two images and displays the difference. It highlights exactly what changed between two generations, making it invaluable for testing LorAs or Denoise settings.",
            "usage": "Connect two images (e.g. before and after a refiner pass). The node will render a heatmap of the pixels that changed.",
            "tips": ["A pure black image means zero change—your settings might be too low!"]
        },
        "H4_Switcheroo": {
            "title": "H4 Switcheroo // UNIVERSAL SWAP",
            "description": "The Swiss Army switch. It is a multi-type selector that can swap between Models, Images, Latents, or VAEs with a single toggle. It features a high-performance terminal interface that logs whenever a swap occurs.",
            "usage": "Use this instead of deleting and re-running wires. Toggle inputs instantly.",
            "tips": ["Pair with h4_DocuScribe to track which 'Switch' state was active for each generation."]
        }
    },

    renderAbout(container) {
        // Renamed to renderHome for default view, but we'll keep renderAbout for the ABOUT tab
        // Let's implement renderHome separately
        this.renderHome(container);
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
            ">
                <!-- Canvas will be injected here -->
            </div>
        `;

        // DRAW NODE PREVIEW
        setTimeout(() => {
            const container = p.querySelector("#h4-preview-canvas-container");
            if (container) {
                // Create offscreen canvas
                const canvas = document.createElement("canvas");
                canvas.width = 220;
                canvas.height = 120;
                const ctx = canvas.getContext("2d");

                // Reset Transform
                ctx.setTransform(1, 0, 0, 1, 0, 0);

                // Clear
                ctx.fillStyle = "#1a1a1a"; // Background
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Instantiate Dummy Node
                // We use LiteGraph to create it, but don't add it to the graph
                if (nodeData.def) {
                    try {
                        const node = new nodeData.def();
                        // Handle LGraphNode initialization if needed
                        if (!node.size) node.size = [140, 60];

                        // Scale context to fit node
                        const scale = Math.min(canvas.width / (node.size[0] + 20), canvas.height / (node.size[1] + 20));

                        ctx.save();
                        ctx.translate(canvas.width / 2 - (node.size[0] * scale) / 2, canvas.height / 2 - (node.size[1] * scale) / 2);
                        ctx.scale(scale, scale);

                        // Mock drawing context if needed, or mostly standard draw
                        // LiteGraph nodes draw themselves usually
                        if (node.onDrawBackground) node.onDrawBackground(ctx, canvas);
                        if (node.onDrawForeground) node.onDrawForeground(ctx, canvas);

                        // Default Draw (Shape)
                        // This is tricky because LiteGraph.LGraphCanvas.drawNode handles the main look.
                        // We will try to simulate a simple box + inputs/outputs if onDraw doesn't do it.

                        // Box
                        ctx.fillStyle = "#222";
                        ctx.strokeStyle = "#00f2ff";
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.roundRect(0, 0, node.size[0], node.size[1], 5);
                        ctx.fill();
                        ctx.stroke();

                        // Title
                        ctx.fillStyle = "#ddd";
                        ctx.font = "bold 14px Arial";
                        ctx.textAlign = "left";
                        ctx.fillText(node.title || node.type, 10, 20);

                        // Inputs (Circles on Left)
                        if (node.inputs) {
                            node.inputs.forEach((inp, i) => {
                                const y = 40 + i * 20;
                                ctx.fillStyle = "#777";
                                ctx.beginPath();
                                ctx.arc(0, y, 5, 0, Math.PI * 2);
                                ctx.fill();
                            });
                        }

                        // Outputs (Circles on Right)
                        if (node.outputs) {
                            node.outputs.forEach((out, i) => {
                                const y = 40 + i * 20;
                                ctx.fillStyle = "#777";
                                ctx.beginPath();
                                ctx.arc(node.size[0], y, 5, 0, Math.PI * 2);
                                ctx.fill();
                            });
                        }

                        ctx.restore();

                    } catch (e) {
                        console.warn("Preview Draw Failed:", e);
                        ctx.fillStyle = "#330000";
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        ctx.fillStyle = "red";
                        ctx.fillText("Render Error", 10, 50);
                    }
                }

                container.appendChild(canvas);
            }
        }, 0);

        // Position Logic (Follow Mouse or Fixed side)
        const updatePos = (mx, my) => {
            // Keep it on screen
            let left = mx + 20;
            let top = my + 20;
            if (left + 260 > window.innerWidth) left = mx - 270;
            if (top + 200 > window.innerHeight) top = mx - 210;

            p.style.left = left + "px";
            p.style.top = top + "px";
        };
        updatePos(e.clientX, e.clientY);
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
        const style = document.createElement("style");
        style.textContent = `
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
        `;
        document.head.appendChild(style);
    }
};

app.registerExtension({
    name: "h4.Dashboard",
    setup() {
        h4_Dashboard.init();
    }
});
