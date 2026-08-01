// h4_LinkQoL.js - Civitai Bridge & Model Manager Frontend UI
// ==============================================================================
import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

app.registerExtension({
    name: "h4.LinkQoL",
    
    async setup() {
        console.log("🔗 h4_Link_QoL: Initializing Civitai Bridge UI...");
        this.createDrawerDOM();

        window.addEventListener("h4_config_update", (e) => {
            const { key, val } = e.detail || {};
            if (key === "qolMasterOverride" || key === "civitaiBridgeEnabled") {
                this.updateButtonVisibility();
            }
        });
    },

    createDrawerDOM() {
        if (document.getElementById("h4-link-drawer-panel")) return;

        // Styles
        const style = document.createElement("style");
        style.id = "h4-link-style";
        style.textContent = `
            #h4-link-drawer-panel {
                position: fixed;
                top: 0;
                right: -420px;
                width: 400px;
                height: 100vh;
                background: rgba(18, 18, 24, 0.95);
                backdrop-filter: blur(12px);
                border-left: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow: -10px 0 30px rgba(0, 0, 0, 0.5);
                z-index: 100005;
                transition: right 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                display: flex;
                flex-direction: column;
                color: #e0e0e0;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            #h4-link-drawer-panel.open {
                right: 0;
            }
            .h4-drawer-header {
                padding: 16px;
                background: rgba(255, 255, 255, 0.03);
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            .h4-drawer-title {
                font-size: 16px;
                font-weight: 700;
                color: #61afef;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .h4-drawer-close {
                cursor: pointer;
                background: none;
                border: none;
                color: #888;
                font-size: 20px;
            }
            .h4-drawer-close:hover { color: #fff; }
            .h4-drawer-search {
                padding: 12px 16px;
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .h4-drawer-input {
                width: 100%;
                padding: 8px 12px;
                background: rgba(0, 0, 0, 0.4);
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 6px;
                color: #fff;
                font-size: 13px;
                box-sizing: border-box;
            }
            .h4-drawer-tags {
                display: flex;
                gap: 6px;
                flex-wrap: wrap;
            }
            .h4-tag-pill {
                font-size: 11px;
                padding: 3px 8px;
                border-radius: 12px;
                background: rgba(255, 255, 255, 0.08);
                cursor: pointer;
                user-select: none;
            }
            .h4-tag-pill.active {
                background: #61afef;
                color: #121218;
                font-weight: 600;
            }
            .h4-drawer-body {
                flex: 1;
                overflow-y: auto;
                padding: 12px 16px;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .h4-model-card {
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.06);
                border-radius: 8px;
                padding: 10px;
                display: flex;
                gap: 10px;
                align-items: flex-start;
            }
            .h4-model-thumb {
                width: 70px;
                height: 70px;
                object-fit: cover;
                border-radius: 6px;
                background: #1e1e24;
            }
            .h4-model-info {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            .h4-model-name {
                font-size: 13px;
                font-weight: 600;
                color: #fff;
                line-clamp: 1;
                overflow: hidden;
            }
            .h4-model-type {
                font-size: 10px;
                color: #98c379;
                text-transform: uppercase;
            }
            .h4-btn-group {
                display: flex;
                gap: 6px;
                margin-top: 4px;
            }
            .h4-btn {
                font-size: 11px;
                padding: 4px 8px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-weight: 600;
            }
            .h4-btn-dl { background: #98c379; color: #121218; }
            .h4-btn-inject { background: #61afef; color: #121218; }
            #h4-civitai-toggle-btn {
                position: fixed;
                top: 5px;
                right: 460px;
                z-index: 100000;
                color: #61afef;
                font-family: monospace;
                font-weight: bold;
                font-size: 13px;
                cursor: pointer;
                padding: 2px 10px;
                background: rgba(0, 0, 0, 0.7);
                border-radius: 4px;
                border: 1px solid #61afef;
                user-select: none;
                transition: all 0.1s;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 26px;
                box-sizing: border-box;
                box-shadow: 0 0 10px rgba(97, 175, 239, 0.3);
            }
            #h4-civitai-toggle-btn:hover {
                border-color: #00f2ff;
                background: rgba(97, 175, 239, 0.25);
                box-shadow: 0 0 14px rgba(0, 242, 255, 0.5);
            }
        `;
        document.head.appendChild(style);

        // Toggle Button
        const toggleBtn = document.createElement("div");
        toggleBtn.id = "h4-civitai-toggle-btn";
        toggleBtn.innerHTML = "🔗 Civitai";
        toggleBtn.title = "Open Civitai Model Bridge";
        toggleBtn.onclick = () => this.toggleDrawer();
        document.body.appendChild(toggleBtn);

        // Panel DOM
        const panel = document.createElement("div");
        panel.id = "h4-link-drawer-panel";
        panel.innerHTML = `
            <div class="h4-drawer-header">
                <div class="h4-drawer-title">🔗 Civitai Bridge</div>
                <button class="h4-drawer-close" id="h4-drawer-close-btn">&times;</button>
            </div>
            <div class="h4-drawer-search">
                <input type="text" class="h4-drawer-input" id="h4-drawer-query" placeholder="Search models (e.g. Cyberpunk, Anime, Detailer)...">
                <div class="h4-drawer-tags" id="h4-drawer-tags">
                    <span class="h4-tag-pill active" data-type="All">All</span>
                    <span class="h4-tag-pill" data-type="LORA">LoRA</span>
                    <span class="h4-tag-pill" data-type="Checkpoint">Checkpoint</span>
                    <span class="h4-tag-pill" data-type="VAE">VAE</span>
                </div>
            </div>
            <div class="h4-drawer-body" id="h4-drawer-results">
                <div style="color: #666; font-size: 12px; text-align: center; margin-top: 20px;">Type a query above to search Civitai...</div>
            </div>
        `;
        document.body.appendChild(panel);

        document.getElementById("h4-drawer-close-btn").onclick = () => this.toggleDrawer(false);

        // Event listeners
        const queryInput = document.getElementById("h4-drawer-query");
        queryInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") this.performSearch();
        });

        const tags = document.querySelectorAll(".h4-tag-pill");
        tags.forEach(t => {
            t.onclick = () => {
                tags.forEach(x => x.classList.remove("active"));
                t.classList.add("active");
                this.performSearch();
            };
        });

        // Position & Visibility Loops
        this.positionButton();
        window.addEventListener("resize", () => this.positionButton());
        setInterval(() => {
            this.positionButton();
            this.updateButtonVisibility();
        }, 500);
    },

    positionButton() {
        const btn = document.getElementById("h4-civitai-toggle-btn");
        if (!btn) return;
        
        // Priority 1: Position to left of Dead Weight Detector (#h4-dwd-toggle)
        const dwdBtn = document.getElementById("h4-dwd-toggle");
        if (dwdBtn && getComputedStyle(dwdBtn).display !== "none") {
            const rect = dwdBtn.getBoundingClientRect();
            if (rect.left > 0) {
                const rightOffset = window.innerWidth - rect.left + 12;
                btn.style.right = `${Math.max(rightOffset, 440)}px`;
                return;
            }
        }
        
        // Priority 2: Position to left of Kick-The-Grid button if DWD is hidden
        btn.style.right = "285px";
    },

    updateButtonVisibility() {
        const btn = document.getElementById("h4-civitai-toggle-btn");
        if (!btn) return;
        let enabled = true;
        if (window.h4_Dashboard && window.h4_Dashboard.config) {
            const master = window.h4_Dashboard.config.qolMasterOverride !== false;
            const bridge = window.h4_Dashboard.config.civitaiBridgeEnabled !== false;
            enabled = master && bridge;
        }
        btn.style.display = enabled ? "flex" : "none";
    },

    toggleDrawer(open) {
        const panel = document.getElementById("h4-link-drawer-panel");
        if (!panel) return;
        if (open === undefined) {
            panel.classList.toggle("open");
        } else if (open) {
            panel.classList.add("open");
        } else {
            panel.classList.remove("open");
        }
    },

    async performSearch() {
        const query = document.getElementById("h4-drawer-query").value;
        const activeTag = document.querySelector(".h4-tag-pill.active");
        const type = activeTag ? activeTag.dataset.type : "All";
        const resultsContainer = document.getElementById("h4-drawer-results");

        resultsContainer.innerHTML = `<div style="color: #888; font-size: 12px; text-align: center; margin-top: 20px;">Searching Civitai API...</div>`;

        try {
            const resp = await fetch(`/h4/link/search?query=${encodeURIComponent(query)}&type=${encodeURIComponent(type)}`);
            const data = await resp.json();

            if (data.success && data.items.length > 0) {
                resultsContainer.innerHTML = "";
                data.items.forEach(item => {
                    const card = document.createElement("div");
                    card.className = "h4-model-card";
                    
                    const thumbUrl = (item.modelVersions && item.modelVersions[0]?.images[0]?.url) || "";
                    const latestVer = (item.modelVersions && item.modelVersions[0]) || {};
                    const fileObj = (latestVer.files && latestVer.files[0]) || {};
                    const downloadUrl = fileObj.downloadUrl || "";
                    const filename = fileObj.name || `${item.name}.safetensors`;

                    card.innerHTML = `
                        <img class="h4-model-thumb" src="${thumbUrl}" alt="thumb">
                        <div class="h4-model-info">
                            <div class="h4-model-name">${item.name}</div>
                            <div class="h4-model-type">${item.type} • ${latestVer.baseModel || 'SD'}</div>
                            <div class="h4-btn-group">
                                <button class="h4-btn h4-btn-dl" data-dl="${downloadUrl}" data-file="${filename}" data-type="${item.type}">Download</button>
                                <button class="h4-btn h4-btn-inject" data-file="${filename}">Load into Node</button>
                            </div>
                        </div>
                    `;

                    // Attach handlers
                    const dlBtn = card.querySelector(".h4-btn-dl");
                    dlBtn.onclick = () => this.downloadModel(downloadUrl, filename, item.type, item.name, latestVer.trainedWords);

                    const injectBtn = card.querySelector(".h4-btn-inject");
                    injectBtn.onclick = () => this.injectIntoNode(filename);

                    resultsContainer.appendChild(card);
                });
            } else {
                resultsContainer.innerHTML = `<div style="color: #e06c75; font-size: 12px; text-align: center; margin-top: 20px;">No models found.</div>`;
            }
        } catch (e) {
            resultsContainer.innerHTML = `<div style="color: #e06c75; font-size: 12px; text-align: center; margin-top: 20px;">API Error: ${e.message}</div>`;
        }
    },

    async downloadModel(url, filename, type, modelName, words) {
        try {
            await fetch('/h4/link/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    download_url: url,
                    filename: filename,
                    model_type: type,
                    model_name: modelName,
                    trigger_words: words || []
                })
            });
            alert(`Started download for '${filename}'`);
        } catch (e) {
            console.error("Download error:", e);
        }
    },

    injectIntoNode(filename) {
        const selectedNodes = app.canvas.selected_nodes;
        if (selectedNodes && Object.keys(selectedNodes).length > 0) {
            for (const id in selectedNodes) {
                const node = selectedNodes[id];
                if (node.widgets) {
                    const loraWidget = node.widgets.find(w => w.name === "lora_name" || w.name === "model_name" || w.name === "active_model_name");
                    if (loraWidget) {
                        loraWidget.value = filename;
                        app.canvas.setDirty(true, true);
                        alert(`Injected '${filename}' into node '${node.title || node.type}'!`);
                        return;
                    }
                }
            }
        }
        alert(`Model '${filename}' selected! Select a LoRA/Loader node on the canvas and click 'Load into Node' again.`);
    }
});
