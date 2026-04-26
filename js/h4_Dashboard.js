import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
// import { H4_ICON_B64 } from "./assets/h4_icon_b64.js"; // Removed to prevent blocking load failure

console.log("[h4] h4_Dashboard.js LOADED (Sanity Check)");

// ------------------------------------------------------------------------------
// H4 Dashboard - The Central Hub
// ------------------------------------------------------------------------------

// --- THE BOOK OF H4 (CONTENT REGISTRY) ---
const NODE_CONTENT = {
    // --- LOGIC / TRAFFIC ---
    "H4_TrafficRouter": {
        title: "Traffic Router (The Nexus)",
        desc: "The ultimate flow control center. Merges 'Start' (Run 0) and 'Loop' (Run 1+) flows into a single stream. Automatically switches Denoise values based on the run count.<br><br><b>Usage:</b><br>1. Connect `Context_Out` to KSampler input.<br>2. Connect `Denoise_Val` to KSampler denoise."
    },
    "H4_TrafficCop": {
        title: "Traffic Cop (Splitter)",
        desc: "The Logic Gate. Splits a workflow into 'Run Once' (Start) and 'Loop' (Continue) paths.<br><b>SAFE MODE:</b> Unlike standard splitters, this node prevents crashes by sending data to BOTH outputs if a path is inactive, ensuring the graph never breaks."
    },
    "H4_TrafficMerge": {
        title: "Traffic Merge (Zipper)",
        desc: "Safely selects between two inputs based on the run count.<br><b>Features:</b><br>- <b>Wireless Loop Mode:</b> Leave `loop_input` empty and use `H4_ImageBuffer` to prevent ComfyUI Cycle Errors.<br>- <b>Smart Denoise:</b> Outputs unique denoise values for Start vs Loop."
    },
    "H4_ContextHub": {
        title: "Context Hub (Mothership)",
        desc: "Bundles all your messy wires into a single `H4_PIPE`.<br>Accepts Models, VAE, CLIP, Conditioning, Latents, Images, Masks, and 2 Generic inputs.<br><b>Debug Feature:</b> Logs detailed tensor shapes and data types to the console."
    },
    "H4_ContextUnpack": {
        title: "Context Unpack (Distributor)",
        desc: "Unpacks the `H4_PIPE` back into individual components. Connect this to your samplers or other workflow parts."
    },

    // --- MISSION CONTROL ---
    "H4_MissionControl": {
        title: "Mission Control",
        desc: "<b>The Flight Deck for your Loop.</b><br>- <b>Active Mode:</b> Drives the loop count. Connect logic flow here.<br>- <b>Passive Mode:</b> Just displays stats.<br>- <b>Wireless Reset:</b> Can receive reset signals from `H4_WirelessResetButton`."
    },
    "H4_LinearScheduler": {
        title: "Linear Scheduler",
        desc: "Generates a ramping float value over time.<br><b>Formula:</b> `Start + (End - Start) * (Current / Max)`<br>Perfect for Denoise Ramps or CFG Ramps."
    },
    "H4_SeedGenerator": {
        title: "Seed Generator",
        desc: "Controls randomness with intent.<br><b>Modes:</b><br>- <b>Incremental:</b> Run 0 = Seed, Run 1 = Seed+1... (Best for sweeping)<br>- <b>Fixed:</b> Reuses same seed.<br>- <b>Random:</b> Pure Chaos."
    },

    // --- VISUALS ---
    "H4_Comparinator": {
        title: "Comparinator (A/B Test)",
        desc: "Dual-Channel Image Comparator with Time-Travel History.<br><b>Inspectinator Mode:</b> Zoom, Pan, and Compare pixels with a sliding reticle.<br><b>Vault:</b> Autosaves history to disk."
    },
    "H4_DisplayAny": {
        title: "Display Any+",
        desc: "Universal Monitor Node.<br>Accepts up to 4 inputs of ANY type (Images, Text, Tensors, Json) and visualizes them."
    },
    "H4_SmartSave": {
        title: "SmartSave",
        desc: "A dual-mode image handler.<br><b>Toggle:</b> Switch between 'Preview Only' (Temp) and 'Save to Disk' (Output).<br><b>Features:</b><br>- Custom Metadata Injection.<br>- Film Strip History.<br>- Privacy Mode (Blur)."
    },

    // --- UTILITIES ---
    "H4_UniversalLoader": {
        title: "Universal Loader",
        desc: "The One Loader to Rule Them All.<br>Switchable between <b>Standard Checkpoints</b> and <b>Component Loading</b> (UNET/CLIP/VAE).<br><b>Auto-Fix:</b> Detects and handles Wan2.1 and Lumina architectures automatically."
    },
    "H4_DocuScribe": {
        title: "DocuScribe",
        desc: "The Workflow Documenter.<br>Connect nodes to this, and it will generate a Markdown report file detailing every setting, class type, and name of the connected nodes."
    },
    "H4_FaceForge": {
        title: "FaceForge (AIO)",
        desc: "<b>All-In-One Face Swap Suite.</b><br>Combines Face Swapping, Restoration (CodeFormer/GFPGAN), Boosting, Upscaling, and SAM-based Occlusion Masking into a single node."
    },

    // --- OBSCURE ---
    "H4_Gridinator": {
        title: "Gridinator 9001",
        desc: "<b>ITS OVER 9000?!?!</b><br>Arranges images into a massive grid.<br>Useful for batch visualizations."
    },
    "H4_Discombobulator": {
        title: "The Discombobulator",
        desc: "<b>⚠️ USE WITH CAUTION</b><br>Randomly disconnects or scrambles wires in your workflow.<br>Why? Because chaos is fair."
    }
};

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
        this.addBool(masterBox, "qolMasterOverride", "MASTER QoL OVERRIDE", "When OFF, all QoL features below are globally silenced.");
        container.appendChild(masterBox);

        const groupStyle = "color: #555; font-size: 10px; letter-spacing: 2px; margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid #222; padding-bottom: 5px;";

        // 2. CANVAS HACKS
        const h1 = document.createElement("div"); h1.style.cssText = groupStyle; h1.textContent = "CANVAS HYGIENE";
        container.appendChild(h1);
        this.addBool(container, "enabled", "Big Brother Overlay", "Master Switch for the passive surveillance grid and wires.");
        this.addBool(container, "showGrid", "Cyberpunk Grid", "Draws the animated background grid wipe.");
        this.addBool(container, "showWires", "Data Flow Wires", "Highlights active/selected node connections.");
        this.addBool(container, "deadWeightEnabled", "Dead Weight Detector", "Enables the D.W.D (Kirby) button in the toolbar.");
        this.addBool(container, "monitorEnabled", "Passive System Monitor", "Log execution and network activity to the console.");

        // 3. UI ENHANCEMENTS
        const h2 = document.createElement("div"); h2.style.cssText = groupStyle; h2.textContent = "UI INTERFACE";
        container.appendChild(h2);
        this.addBool(container, "sovereignCoreEnabled", "H4 Node Aesthetic", "Forces H4 colors on all compatible nodes.");
        this.addBool(container, "caffeineEnabled", "Caffeine Mode Button", "Shows the screen wake-lock button (Kirby Sleep).");
        this.addBool(container, "kickItEnabled", "Kick-The-Grid Button", "Shows the canvas defibrillator button.");
        this.addBool(container, "showErrorPopup", "Red Screen of Death", "Show the forensic error modal on crashes.");

        // 4. EXPERIMENTAL
        const h3 = document.createElement("div"); h3.style.cssText = groupStyle; h3.textContent = "EXPERIMENTAL QoL";
        container.appendChild(h3);
        this.addBool(container, "smartSnapping", "Node Snapping", "Enables pixel-perfect node alignment.");
        this.addBool(container, "ioColoring", "Dynamic Input Coloring", "Colors node sockets based on their data type.");

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
                card.onclick = (e) => {
                    if (e.target.classList.contains("h4-btn-summon")) return;
                    this.openNodeDocs(n);
                };

                // Summon Button
                const btnSummon = card.querySelector(".h4-btn-summon");
                btnSummon.onclick = () => {
                    this.summonNode(n.type);
                };

                // Hover Preview
                card.onmouseenter = (e) => this.showHoverPreview(e, n);
                card.onmouseleave = () => this.hideHoverPreview();

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

    summonNode(type) {
        if (!app.graph) return;

        const node = LiteGraph.createNode(type);
        if (node) {
            node.pos = [
                app.canvas.ds.offset[0] * -1 + (app.canvas.canvas.width / 2 / app.canvas.ds.scale) - 100,
                app.canvas.ds.offset[1] * -1 + (app.canvas.canvas.height / 2 / app.canvas.ds.scale) - 40
            ];
            app.graph.add(node);
            app.canvas.selectNode(node);
            app.canvas.bringToFront(node);

            // Optional: Close modal on summon?
            this.close();

            // Feedback
            this.showToast(`SUMMONED: ${type}`);
        } else {
            console.error("Failed to create node:", type);
        }
    },

    showToast(msg) {
        const t = document.createElement("div");
        t.style.cssText = `
            position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
            background: #00f2ff; color: #000; padding: 10px 20px;
            font-family: monospace; font-weight: bold; z-index: 20000;
            border-radius: 4px; box-shadow: 0 0 10px #00f2ff;
        `;
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 2000);
    },

    // HOVER PREVIEW SYSTEM
    previewEl: null,

    showHoverPreview(e, nodeData) {
        if (!this.previewEl) {
            this.previewEl = document.createElement("div");
            this.previewEl.id = "h4-hover-preview";
            document.body.appendChild(this.previewEl);
        }

        const p = this.previewEl;
        p.style.display = "block";
        p.innerHTML = `
            <div style="color: #00f2ff; font-weight: bold; border-bottom: 1px solid #333; padding-bottom: 5px; margin-bottom: 5px;">
                ${nodeData.def.title}
            </div>
            <div style="font-size: 11px; color: #aaa;">
                ${nodeData.def.desc || "No description available in protocol."}
            </div>
            <!-- Image placeholder -->
            <div style="margin-top: 10px; width: 200px; height: 100px; background: #111; display: flex; align-items: center; justify-content: center; color: #333; font-size: 10px; border: 1px solid #222;">
                [PREVIEW SIGNAL LOST]
            </div>
        `;

        // Position Logic (Follow Mouse or Fixed side)
        // Let's float near the mouse but not under it
        const updatePos = (mx, my) => {
            p.style.left = (mx + 20) + "px";
            p.style.top = (my + 20) + "px";
        };
        updatePos(e.clientX, e.clientY);

        // Attach move listener to card? OR just update once. 
        // Simple fixed offset is safer to avoid flicker.
        // Actually, let's just create a mousemove handler on the card temporarily?
        // Simpler: Just set it once on enter.
    },

    hideHoverPreview() {
        if (this.previewEl) this.previewEl.style.display = "none";
    },

    // DOCUMENTATION (THE BOOK OF H4)
    openNodeDocs(nodeData) {
        // 1. Resolve Content
        // Check our manual registry first, fallback to node definition
        const content = NODE_CONTENT[nodeData.type] || {};

        // Fallbacks
        const title = content.title || nodeData.def.title || nodeData.type;
        const desc = content.desc || nodeData.def.desc || "No comprehensive data available in archives.";
        const category = nodeData.def.category || "Unknown";

        // Create an overlay on top of the dashboard
        const doc = document.createElement("div");
        doc.className = "h4-doc-overlay";
        doc.innerHTML = `
            <div class="h4-doc-content">
                <div class="h4-doc-close">CLOSE FILE</div>
                <h1>${nodeData.def.title}</h1>
                <div class="h4-doc-meta">ID: ${nodeData.type} | CAT: ${nodeData.def.category || "Unknown"}</div>
                
                <hr style="border-color:#333; margin: 20px 0;">
                
                <div class="h4-doc-body">
                    <h3>// SYNOPSIS</h3>
                    <p>${nodeData.def.desc || "No data available in archives."}</p>
                    
                    <h3>// INPUTS</h3>
                    <ul>
                        ${(nodeData.def.input?.required ? Object.keys(nodeData.def.input.required).map(k => `<li>${k}</li>`).join('') : "<li>None</li>")}
                    </ul>
                    
                    <h3>// OUTPUTS</h3>
                    <ul>
                         ${(nodeData.def.output ? nodeData.def.output.map(k => `<li>${k}</li>`).join('') : "<li>None</li>")}
                    </ul>

                    <br><br>
                    <div style="text-align:center; padding: 20px; border: 1px dashed #333; color: #555;">
                        [ ADVANCED USAGE DATA CORRUPTED ]<br>
                        Please consult the Github Repository for advanced field maneuvers.
                    </div>
                </div>
            </div>
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
        "H4_ModelMerger": {
            "title": "H4 Model Merger (The Lab)",
            "description": "Okay, welcome to the Thunderdome. This isn't your average model merger. This is absolute, unadulterated MAD SCIENCE. We're talking deep, block-level weight manipulation—injecting the soul of one model into the body of another. Unlike basic mergers that just average everything out into a muddy mess, this bad boy lets you surgically target specific layers of the UNet. Want the composition of an SDXL base but the shading of that obscure anime checkpoint you found on Civitai at 3 AM? You can do that. Want to fix broken hands by grafting the 'Out' blocks of a better model? You can try. Just be warned: If you push the sliders too far, you're gonna conjure eldritch horrors. But when it hits? It's pure magic.",
            "usage": "Use this node when you're tired of using the same old checkpoints everyone else uses. It's for creating custom hybrid models on the fly, directly in your workflow, without filling your hard drive with 50GB of intermediate files. The 'Test Image' output lets you verify the merge instantly before you commit to a long render.",
            "tips": ["Use 'Weighted Average' unless you have a PhD in math.", "Unlock 'Settings' to experiment. Lower Input blocks usually affect composition/shapes. Higher Output blocks affect fine details/textures/lighting.", "If you seek pure speed, turn 'decode_test_image' OFF and use the 'TEST_LATENT' output."]
        },
        "H4_Comparinator": {
            "title": "H4 Comparinator (The Sniper)",
            "description": "Ever generate two images and squint at them trying to decide which one has better hands? Yeah, we all have. The Comparinator fixes that. It's a professional-grade A/B testing suite with a built-in SNIPER SCOPE. It captures your image stream, saves a history (locally, in 'The Vault'), and lets you compare generations side-by-side with a slick sliding divider. You can lock a 'Gold Standard' image to the left pane and endlessly compare new variations against it on the right. It's the ultimate tool for refining prompts or testing checkpoints.",
            "usage": "Throw this at the very end of your workflow. Instead of a 'Save Image' or 'Preview Image' node, use this. It does both, but better. Trust me, once you start using the slider, you can't go back.",
            "tips": ["Use the 'Auto-Previous' feature to iterate quickly on prompts. It's a game changer.", "Right-click to Lock. Seriously, try it.", "Click the 'Parameters Toggle' to open the Metadata Drawer and see exactly what seed/prompt created that masterpiece."]
        },
        "H4_SmartSave": {
            "title": "H4 SmartSave (The Brain)",
            "description": "Saving images shouldn't be dumb. The default saver just dumps files. This one? This one has an IQ of 200. It embeds every single piece of metadata—prompt, seed, model hash, workflow graph—directly into the PNG chunks. But it also gives you a UI to *inspect* that data before you save. Plus, you can add custom user notes that get burned into the metadata too. Never forget *why* you used that specific LorA again.",
            "usage": "Replace the standard 'Save Image' node. Toggle 'Save to Disk' to actually write files, otherwise it just previews."
        },
        "H4_TrafficCop": {
            "title": "H4 Traffic Cop (Legacy Splitter)",
            "description": "Standard Logic Gates in ComfyUI are kinda... fragile. This node acts as a specific 'Start vs Loop' splitter. It takes one input and sends it to the 'Start' output on Run 0, and the 'Loop' output on Run 1+. It's a legacy version of the Router logic, useful for simpler setups.",
            "usage": "Use this if you want to fork a single input into two different processing chains based on whether it's the first run or a loop."
        },
        "H4_TrafficMerge": {
            "title": "H4 Traffic Merge (The Zipper)",
            "description": "Okay, so you split your workflow into two paths. Now how do you bring them back together? With the Zipper. This node takes two inputs and intelligently selects the one that matches the current Loop Count phase. It also handles Denoise switching just like the Router."
        },
        "H4_TrafficRouter": {
            "title": "H4 Traffic Router (The Big Boss)",
            "description": "This is the big daddy. It combines the Traffic Cop and Traffic Merge into one massive brain. It manages the 'Loop Count' of your workflow. Run 0 (Start)? It routes data from the 'First Run' input. Run 1+ (Loop)? It switches to the 'Loop Run' input. It completely automates multi-stage workflows.",
            "usage": "The core of any 'Live Logic' or 'Feedback Loop' workflow. Connect your 'Load Image' to 'first_run_in' and your 'Refined Image' (from the end of the chain) to 'loop_run_in'."
        },
        "H4_LoopIncrementer": {
            "title": "H4 Loop Incrementer",
            "description": "The engine. This tiny node does one thing: It adds +1 to the global counter. But where you put it matters. Place it *after* your KSampler or Save Node. It ensures that the counter only goes up when a generation performs successfully.",
            "usage": "Connect your image output through this node. It passes the image through unchanged, but triggers the system to say 'Ok, Run 1 is done. Next is Run 2.'"
        },
        "H4_WirelessResetButton": {
            "title": "H4 Wireless Reset Button",
            "description": "It's a big red button. But virtual. And wireless. Sometimes your loop gets stuck or you just want to start fresh without reloading the workflow. Pressing (toggling) this sends a telepathic signal to the Loop Incrementer to reset the counter to 0."
        },
        "H4_ImageBuffer": {
            "title": "H4 Universal Buffer (The black Hole)",
            "description": "Loops in ComfyUI are hard because of 'execution order'. The graph wants to move forward, not backward. The Image Buffer cheats. It creates a pocket dimension (global variable) where it stores the image from the end of the loop. Then, the Traffic Router can teleport that image back to the start for the next run. It eliminates the dreaded '1-Cycle Lag' where your loop is always using old data.",
            "usage": "Put this at the VERY END of your loop chain. It catches the result and holds it for the Router."
        },
        "H4_StateMonitor": {
            "title": "H4 State Monitor",
            "description": "Lost? Confused? Don't know if you're on Run 5 or Run 500? The State Monitor simply displays the current Loop Count as an integer. Wire it up to a display text node to keep track of your sanity."
        },
        "H4_ContextHub": {
            "title": "H4 Context Hub (The Mothership)",
            "description": "Spaghetti wires are the enemy of creativity. The Context Hub is your cable management solution. It takes up to 10 different types of inputs (Model, VAE, CLIP, Positive, Negative, Latent, Images, Masks...) and bundles them into a SINGLE distinct connection called 'H4_PIPE'. You can run this single purple wire across your entire graph.",
            "usage": "Place this at the start of your workflow. Plug everything in. Then just run one wire to where you're going. You can even chain them by connecting an existing pipe to 'base_pipe'."
        },
        "H4_ContextUnpack": {
            "title": "H4 Context Unpack (The Receiver)",
            "description": "The Receiver. It takes the single 'H4_PIPE' connection from the Mothership (Hub) and explodes it back out into its 10 individual components. Place this near your KSampler or Detailer nodes to get access to the models/conditions you bundled up earlier."
        },
        "H4_LatentSelector": {
            "title": "H4 Latent Selector (The Canvas)",
            "description": "Don't guess resolutions. This node provides safe, trained aspect ratios for every major model (SD1.5, SDXL, Flux, and Wan/Z-Image video). It outputs a compliant empty latent and the width/height integers. \n\n **Wan/Z-Image Support:** selects 720p/1080p equivalent resolutions.",
            "usage": "Pick a model type. Pick a shape. Connect to KSampler or VAE Encode."
        },
        "H4_UniversalLoader": {
            "title": "H4 Universal Loader (The Source)",
            "description": "The One Loader to Rule Them All. It handles standard Checkpoints (.safetensors) AND separated Diffusers components (UNET/CLIP/VAE). It also inherently accepts single LoRAs.\n\n **Features:** \n - **Smart Validaton**: Detects if you mix SDXL limits with T5 encoders (crash prevention). \n - **GGUF Support**: Auto-delegates to ComfyUI-GGUF input (if installed) for quantized models. \n - **Wan Support**: Native detection and loading for Wan 2.1 video models (including GGUF).",
            "usage": "Select 'Checkpoint' for normal use. Select 'Diffusers' for advanced mixing."
        },
        "h4_Complete_Loader": {
            "title": "H4 Complete Loader (The Swiss Army Knife)",
            "description": "The Universal Loader on steroids. It inherits all the insane automated architecture routing of the standard Source Loader, but it features a custom HTML-overlay interface that hides all the image uploading bloat until you click 'Smart Upload Image(s)'. You grab 4 images, it magically spawns the inputs and loads them right out into the graph alongside your Checkpoint/UNET, VAE, CLIP, and LoRA. The interface is mathematically bound to have a zero-pixel footprint for any features you aren't currently using.",
            "usage": "Drop it in, choose your model and LoRA, and click the upload button if you need reference inputs. Drag outputs straight to your IPAdapters."
        },
        "h4_Multi_ImgUpload": {
            "title": "H4 Multi Image Upload (The Bulk Handler)",
            "description": "Stripped of the models, stripped of the LoRAs, this is just for raw image ingestion. Same magic smart-upload button as the Complete Loader, but it scales up to 10 images at once. Unused slots are fully collapsed so it never takes up ungodly amounts of canvas real estate.",
            "usage": "Click 'Smart Upload Image(s)' and select up to 10 files. Connect the resulting images wherever needed."
        },
        "H4_ModelSave": {
            "title": "H4 Model Save (The Vault)",
            "description": "Saves your creation properly. Supports standard floating point formats (FP16, BF16, FP32) and the new Float8 formats (e4m3fn) if your torch version supports it. Features 'Nuclear RAM Saver' which writes the file iteratively to disk, preventing memory crashes when saving massive 10GB+ files.",
            "usage": "Connect Model/CLIP/VAE. Pick a filename. Save."
        },
        "H4_PixelPress": {
            "title": "H4 Pixel Press (Density/HDR)",
            "description": "The Density God. Supersample your image (2x-4x), apply HDR tone mapping (Shadows/Highlights), sharpen, and downscale back to original size. This creates 'Super Density' where pixel crispness is unmatched. Supports Tiled processing to save VRAM.",
            "usage": "Connect Image. Select 2x. Enable HDR. Queue."
        },
        "H4_VisualTokenizer": {
            "title": "H4 Visual Tokenizer (The Mind)",
            "description": "Visualize token processing. Displays how your prompt is broken down into tokens and weighted by the CLIP model. Helps debug why 'cat' is being ignored.",
            "usage": "Connect CLIP and write Text. Run. See visualization in the node."
        },
        "H4_MissionControl": {
            "title": "H4 Mission Control (The Flight Deck)",
            "description": "This is the brain of your loop. While the Traffic Router handles the plumbing, Mission Control handles the administrative state. It increments the global Loop Counter, listens for Wireless Reset signals, and provides a central dashboard for your loop's status. It also acts as a pass-through for scheduler signals. \n\n Think of it as the conductor of the orchestra. Without it, the violinists (your schedulers) don't know when to start playing.",
            "usage": "Use this as the start of your 'Control Stack'. Set it to 'Active' to drive the loop. Set to 'Passive' if you just want to watch."
        },
        "H4_Gridinator": {
            "title": "H4 Gridinator 9001 (OVER 9000!!!)",
            "description": "Welcome to the endgame. The Gridinator is an X/Y/Z Plotter on steroids. Unlike other grid nodes that require complex node setups, this is a MONOLITH. It handles Model Loading, LoRA patching, Sampling, Decoding, and Stitching all internally. It supports fuzzy-matching for model names. It features a 'Sliding Scale' generator. It even supports 'Prompt Stutter'.",
            "usage": "Connect a VAE (optional). Set your axes. Click Queue. Wait for the magic."
        },
        "H4_FaceForge": {
            "title": "H4 FaceForge (The Flagship)",
            "description": "The ultimate All-In-One face manipulation node. It handles Swapping, Restoration, Boosting (High-Res Swap), Upscaling, and Occlusion Masking (preventing the face from pasting over hair/hands) all in one go.",
            "usage": "Connect an Image. Turn on features. Queue."
        },
        "H4_IdentityEngine": {
            "title": "H4 Identity Engine (Character Studio)",
            "description": "A standalone powerhouse for creating consistent characters. It combines a Checkpoint Loader, CLIP Text Encode, KSampler, and FaceForge into one massive node. You define the 'DNA' (fixed traits) and the 'Scene' (action), and it generates the image with the face already swapped and restored.",
            "usage": "Load a Preset. Type a scene. Queue."
        },
        "H4_FaceDetailer": {
            "title": "H4 Face Detailer (The Surgeon)",
            "description": "Face Swaps often lose texture (skin pores, wrinkles). The Detailer fixes this by cropping the face, running a high-res Img2Img pass on it with a specialized model/LoRA, and blending it back using a soft-edge mask.",
            "usage": "Connect image. Adjust denoise. Queue."
        },
        "H4_Mutate": {
            "title": "H4 Mutate (The Frankenstein Machine)",
            "description": "Look, generating an image is only half the battle. Once the pixels hit the canvas, you usually stare at it and think: 'Hmm, could be punchier.' Instead of chaining 15 different image processing nodes together, you use H4_Mutate. It is a monolithic, dynamically toggleable post-processing powerhouse giving you 7 distinct sections of image manipulation: Color Grade, Sharpness, Upscale, Style Transfer, Film & Grain, Vignette, and Effects.\n\nThe best part? It's completely modular. The node starts as a clean pass-through. You only turn ON the sections you need, and only those controls expand.",
            "usage": "Drop it after your primary generation. Turn on Color to tweak gamma/tint. Turn on Film to add Portra 400 emulation. Turn on Effects to add bloom. Reorganize the Pipeline Order if you want upscale to happen before sharpening."
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
