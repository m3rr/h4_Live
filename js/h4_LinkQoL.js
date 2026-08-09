// h4_LinkQoL.js - Civitai Bridge & Model Manager Frontend UI
// ==============================================================================
import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

app.registerExtension({
    name: "h4.LinkQoL",
    
    // Internal State
    _currentPage: 1,
    _activeType: "All",
    _activeBaseModel: "All",
    _activeSort: "Highest Rated",
    _activeNSFW: false,
    _apiKey: "",
    _activeDownloads: {},
    _pollTimer: null,
    _lightboxImages: [],
    _lightboxIndex: 0,
    _modelInfoCache: {},
    _lastMouseEvent: null,

    async setup() {
        console.log("🔗 h4_Link_QoL: Initializing Civitai Bridge Engine v2.0...");
        this.createDrawerDOM();

        window.addEventListener("h4_config_update", (e) => {
            const { key, val } = e.detail || {};
            if (key === "qolMasterOverride" || key === "civitaiBridgeEnabled") {
                this.updateButtonVisibility();
            }
            if (key === "civitaiApiKey") {
                this._apiKey = val || "";
                const keyInput = document.getElementById("h4-drawer-apikey");
                if (keyInput) keyInput.value = this._apiKey;
            }
        });

        // Universal CTRL Trigger & Cyberpunk CIVITAI_SCANNER + Requirement 7 ALT Pin Handler
        window.addEventListener("keydown", (e) => {
            if (e.key === "Control" || e.ctrlKey) {
                this.startCtrlHoldTimer(e);
            }
            if ((e.key === "Alt" || e.altKey) && (this._scannerActive || (this._lastItem && document.getElementById("h4-link-hover-tooltip")?.classList.contains("active")))) {
                this.pinTooltip();
            }
        });

        window.addEventListener("keyup", (e) => {
            if (e.key === "Alt") {
                this.unpinTooltip();
                if (!e.ctrlKey) {
                    this.stopCtrlHoldTimer();
                }
            }
            if (e.key === "Control" || e.key === "Ctrl" || e.key === "Escape") {
                if (!this._altPinned) {
                    this.stopCtrlHoldTimer();
                } else if (e.key === "Escape") {
                    this.unpinTooltip();
                    this.stopCtrlHoldTimer();
                }
            }
        });

        window.addEventListener("blur", () => {
            this.unpinTooltip();
            this.stopCtrlHoldTimer();
        });

        document.addEventListener("mousemove", (e) => {
            this._lastMouseEvent = e;

            if (e.ctrlKey) {
                this.startCtrlHoldTimer(e);
                if (this._scannerActive && !this._altPinned) {
                    this.checkHoverScanner(e);
                }
            } else if (!this._altPinned) {
                this.stopCtrlHoldTimer();
            }
        });

        const setupCanvasHover = () => {
            if (app.canvas && app.canvas.canvas) {
                app.canvas.canvas.addEventListener("mousemove", (e) => {
                    this._lastMouseEvent = e;

                    if (e.ctrlKey) {
                        this.startCtrlHoldTimer(e);
                        if (this._scannerActive && !this._altPinned) {
                            this.checkHoverScanner(e);
                        }
                    } else if (!this._altPinned) {
                        this.stopCtrlHoldTimer();
                    }
                });
            } else {
                setTimeout(setupCanvasHover, 500);
            }
        };

        setupCanvasHover();
    },

    createDrawerDOM() {
        if (document.getElementById("h4-link-drawer-panel")) return;

        // Load saved API Key from Dashboard config if available
        if (window.h4_Dashboard && window.h4_Dashboard.config) {
            this._apiKey = window.h4_Dashboard.config.civitaiApiKey || "";
        }

        // Styles
        const style = document.createElement("style");
        style.id = "h4-link-style";
        style.textContent = `
            /* Main Search Drawer */
            #h4-link-drawer-panel {
                position: fixed;
                top: 0;
                right: -440px;
                width: 420px;
                height: 100vh;
                background: rgba(18, 18, 24, 0.97);
                backdrop-filter: blur(14px);
                border-left: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow: -10px 0 30px rgba(0, 0, 0, 0.6);
                z-index: 100005;
                transition: right 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                display: flex;
                flex-direction: column;
                color: #e0e0e0;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            #h4-link-drawer-panel.open { right: 0; }

            /* Secondary Model Details Drawer */
            #h4-link-details-panel {
                position: fixed;
                top: 0;
                right: -500px;
                width: 480px;
                height: 100vh;
                background: rgba(14, 14, 20, 0.98);
                backdrop-filter: blur(16px);
                border-left: 1px solid rgba(97, 175, 239, 0.3);
                box-shadow: -15px 0 40px rgba(0, 0, 0, 0.7);
                z-index: 100006;
                transition: right 0.35s cubic-bezier(0.16, 1, 0.3, 1);
                display: flex;
                flex-direction: column;
                color: #e0e0e0;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            #h4-link-details-panel.open { right: 420px; }

            /* Cyberpunk Floating Civitai Scanner Badge */
            #h4-civitai-scanner-badge {
                position: fixed;
                top: 0;
                left: 0;
                z-index: 100030;
                display: none;
                pointer-events: none;
                align-items: center;
                gap: 8px;
                padding: 6px 12px;
                background: rgba(10, 14, 23, 0.94);
                backdrop-filter: blur(12px);
                border: 1px solid rgba(0, 240, 255, 0.8);
                border-radius: 6px;
                box-shadow: 0 0 20px rgba(0, 240, 255, 0.45), inset 0 0 12px rgba(255, 0, 128, 0.35);
                font-family: 'Consolas', 'Courier New', monospace;
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 1.5px;
                color: #00f0ff;
                text-transform: uppercase;
                user-select: none;
                transition: opacity 0.15s ease-out;
            }
            #h4-civitai-scanner-badge.active {
                display: flex;
            }
            #h4-civitai-scanner-badge .h4-scanner-pulse {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #ff007f;
                box-shadow: 0 0 8px #ff007f, 0 0 14px #ff007f;
                animation: h4-scanner-ping 1.2s infinite ease-in-out;
            }
            @keyframes h4-scanner-ping {
                0% { transform: scale(0.8); opacity: 0.7; box-shadow: 0 0 4px #ff007f; }
                50% { transform: scale(1.3); opacity: 1.0; box-shadow: 0 0 12px #ff007f, 0 0 20px #00f0ff; }
                100% { transform: scale(0.8); opacity: 0.7; box-shadow: 0 0 4px #ff007f; }
            }

            /* Mouse-Tracking Model Hover Tooltip / Dynamic Card Overlay */
            #h4-link-hover-tooltip {
                position: fixed;
                top: 0;
                left: 0;
                z-index: 100020;
                pointer-events: none;
                display: none;
                width: 360px;
                max-width: 90vw;
                max-height: 85vh;
                overflow-y: auto;
                background: rgba(12, 14, 22, 0.96);
                backdrop-filter: blur(18px);
                border: 1px solid rgba(0, 240, 255, 0.5);
                box-shadow: 0 12px 35px rgba(0, 0, 0, 0.85), 0 0 20px rgba(0, 240, 255, 0.25);
                border-radius: 10px;
                padding: 14px;
                color: #e0e0e0;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                font-size: 12px;
                box-sizing: border-box;
                opacity: 0;
                transition: opacity 0.15s ease-out;
            }
            #h4-link-hover-tooltip.active {
                display: flex;
                flex-direction: column;
                gap: 10px;
                opacity: 1;
            }
            #h4-link-hover-tooltip.pinned {
                pointer-events: auto !important;
                border: 1px solid #e5c07b !important;
                box-shadow: 0 0 35px rgba(229, 192, 123, 0.5), inset 0 0 15px rgba(0, 240, 255, 0.3) !important;
            }
            .h4-tooltip-thumb {
                width: 100%;
                max-height: 240px;
                object-fit: cover;
                border-radius: 8px;
                background: #0d0d12;
                border: 1px solid rgba(255, 255, 255, 0.12);
                box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            }
            .h4-tooltip-thumb-missing {
                width: 100%;
                height: 70px;
                border-radius: 8px;
                background: rgba(255, 255, 255, 0.03);
                border: 1px dashed rgba(220, 90, 90, 0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                color: #e06c75;
                font-size: 11px;
                font-weight: 600;
            }
            .h4-val-missing {
                color: #e06c75 !important;
                font-style: italic !important;
                font-weight: 500 !important;
            }
            .h4-val-highlight {
                color: #98c379 !important;
                font-weight: 700 !important;
            }
            .h4-tooltip-meta {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            .h4-tooltip-title {
                font-weight: 700;
                color: #61afef;
                font-size: 13px;
                line-height: 1.2;
            }
            .h4-tooltip-badges {
                display: flex;
                gap: 6px;
                align-items: center;
                flex-wrap: wrap;
                font-size: 10px;
            }
            .h4-badge {
                padding: 2px 6px;
                border-radius: 4px;
                background: rgba(255, 255, 255, 0.08);
                font-weight: 600;
            }
            .h4-badge-type { background: rgba(152, 195, 121, 0.2); color: #98c379; }
            .h4-badge-base { background: rgba(97, 175, 239, 0.2); color: #61afef; }
            .h4-tooltip-triggers {
                background: rgba(0, 242, 255, 0.05);
                border: 1px solid rgba(0, 242, 255, 0.2);
                border-radius: 4px;
                padding: 6px 8px;
                font-size: 11px;
                color: #00f2ff;
                font-family: monospace;
                word-break: break-word;
                max-height: 60px;
                overflow-y: auto;
            }

            .h4-drawer-header {
                padding: 14px 16px;
                background: rgba(255, 255, 255, 0.04);
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
            }
            .h4-drawer-title {
                font-size: 15px;
                font-weight: 700;
                color: #61afef;
                display: flex;
                align-items: center;
                gap: 8px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 260px;
            }
            .h4-drawer-close {
                cursor: pointer;
                background: none;
                border: none;
                color: #888;
                font-size: 24px;
                line-height: 1;
                padding: 0 4px;
            }
            .h4-drawer-close:hover { color: #fff; }

            .h4-drawer-search {
                padding: 12px 16px;
                display: flex;
                flex-direction: column;
                gap: 8px;
                background: rgba(0, 0, 0, 0.2);
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
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
            .h4-drawer-input:focus {
                border-color: #61afef;
                outline: none;
            }

            .h4-drawer-filter-bar {
                display: flex;
                gap: 6px;
                align-items: center;
            }
            .h4-drawer-select {
                flex: 1;
                background: rgba(0, 0, 0, 0.5);
                border: 1px solid rgba(255, 255, 255, 0.15);
                color: #e0e0e0;
                font-size: 11px;
                padding: 4px 6px;
                border-radius: 4px;
                cursor: pointer;
            }

            .h4-drawer-tags {
                display: flex;
                gap: 6px;
                flex-wrap: wrap;
            }
            .h4-tag-pill {
                font-size: 10px;
                padding: 3px 8px;
                border-radius: 12px;
                background: rgba(255, 255, 255, 0.08);
                cursor: pointer;
                user-select: none;
                transition: all 0.15s;
            }
            .h4-tag-pill.active {
                background: #61afef;
                color: #121218;
                font-weight: 600;
            }
            .h4-tag-pill.nsfw {
                background: rgba(224, 108, 117, 0.2);
                color: #e06c75;
                border: 1px solid rgba(224, 108, 117, 0.4);
            }
            .h4-tag-pill.nsfw.active {
                background: #e06c75;
                color: #fff;
                font-weight: 700;
            }

            .h4-drawer-body {
                flex: 1;
                overflow-y: auto;
                padding: 14px 16px;
                display: flex;
                flex-direction: column;
                gap: 14px;
            }

            .h4-model-card {
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.06);
                border-radius: 8px;
                padding: 10px;
                display: flex;
                gap: 12px;
                align-items: flex-start;
                transition: all 0.2s;
            }
            .h4-model-card:hover {
                border-color: rgba(97, 175, 239, 0.4);
                background: rgba(255, 255, 255, 0.05);
            }
            .h4-model-thumb {
                width: 90px;
                height: 90px;
                object-fit: cover;
                border-radius: 6px;
                background: #1e1e24;
                cursor: pointer;
                transition: transform 0.2s, border-color 0.2s;
                border: 2px solid transparent;
                flex-shrink: 0;
            }
            .h4-model-thumb:hover {
                transform: scale(1.05);
                border-color: #61afef;
            }
            .h4-model-info {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 4px;
                min-width: 0;
            }
            .h4-model-name {
                font-size: 13px;
                font-weight: 600;
                color: #fff;
                cursor: pointer;
                transition: color 0.15s;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .h4-model-name:hover { color: #61afef; }
            .h4-model-type {
                font-size: 10px;
                color: #98c379;
                text-transform: uppercase;
                letter-spacing: 0.5px;
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
                transition: opacity 0.15s;
            }
            .h4-btn:hover { opacity: 0.85; }
            .h4-btn-dl { background: #98c379; color: #121218; }
            .h4-btn-inject { background: #61afef; color: #121218; }
            .h4-btn-secondary { background: rgba(255, 255, 255, 0.1); color: #fff; }

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

            /* Live Download Manager Footer Drawer */
            #h4-dl-manager-panel {
                background: rgba(10, 10, 14, 0.95);
                border-top: 1px solid rgba(97, 175, 239, 0.3);
                padding: 10px 14px;
                max-height: 180px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .h4-dl-header {
                font-size: 11px;
                font-weight: 700;
                color: #00f2ff;
                display: flex;
                justify-content: space-between;
                align-items: center;
                letter-spacing: 0.5px;
            }
            .h4-dl-item {
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 6px;
                padding: 8px 10px;
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            .h4-dl-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-size: 11px;
            }
            .h4-dl-name {
                font-weight: 600;
                color: #fff;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 250px;
            }
            .h4-dl-bar-bg {
                width: 100%;
                height: 6px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
                overflow: hidden;
            }
            .h4-dl-bar-fill {
                height: 100%;
                background: linear-gradient(90deg, #61afef, #00f2ff);
                width: 0%;
                transition: width 0.3s;
            }
            .h4-dl-status-badge {
                font-size: 9px;
                padding: 1px 5px;
                border-radius: 3px;
                font-weight: 700;
            }
            .h4-dl-status-badge.DOWNLOADING { background: rgba(0, 242, 255, 0.2); color: #00f2ff; }
            .h4-dl-status-badge.COMPLETE { background: rgba(152, 195, 121, 0.2); color: #98c379; }
            .h4-dl-status-badge.FAILED { background: rgba(224, 108, 117, 0.2); color: #e06c75; }
            .h4-dl-status-badge.CANCELLED { background: rgba(229, 192, 123, 0.2); color: #e5c07b; }

            /* Showcase Gallery Carousel & Lightbox */
            .h4-carousel-container {
                position: relative;
                width: 100%;
                min-height: 280px;
                max-height: 520px;
                height: 380px;
                background: #060608;
                border-radius: 10px;
                overflow: hidden;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 1px solid rgba(255, 255, 255, 0.12);
                transition: height 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .h4-carousel-img {
                max-width: 100%;
                max-height: 100%;
                width: auto;
                height: auto;
                object-fit: contain;
                cursor: zoom-in;
            }
            .h4-carousel-btn {
                position: absolute;
                top: 50%;
                transform: translateY(-50%);
                background: rgba(0, 0, 0, 0.75);
                color: #fff;
                border: 1px solid rgba(255, 255, 255, 0.3);
                width: 38px;
                height: 38px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 22px;
                font-weight: bold;
                user-select: none;
                z-index: 3;
                transition: all 0.2s;
            }
            .h4-carousel-btn:hover { background: #61afef; color: #121218; border-color: #61afef; }
            .h4-carousel-btn.prev { left: 10px; }
            .h4-carousel-btn.next { right: 10px; }

            .h4-thumb-strip {
                display: flex;
                gap: 10px;
                overflow-x: auto;
                padding: 6px 0;
            }
            .h4-strip-thumb {
                width: 100px;
                height: 100px;
                object-fit: cover;
                border-radius: 8px;
                cursor: pointer;
                opacity: 0.6;
                border: 2px solid transparent;
                transition: all 0.2s;
                flex-shrink: 0;
            }
            .h4-strip-thumb.active, .h4-strip-thumb:hover {
                opacity: 1;
                border-color: #61afef;
                transform: scale(1.05);
                box-shadow: 0 4px 12px rgba(97, 175, 239, 0.3);
            }

            .h4-info-meta {
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.06);
                border-radius: 6px;
                padding: 12px;
                font-size: 12px;
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            .h4-triggers-box {
                background: rgba(0, 242, 255, 0.05);
                border: 1px solid rgba(0, 242, 255, 0.2);
                border-radius: 6px;
                padding: 8px;
                font-size: 12px;
                color: #00f2ff;
                font-family: monospace;
                word-break: break-word;
            }

            #h4-link-lightbox {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.94);
                backdrop-filter: blur(20px);
                z-index: 100010;
                display: none;
                flex-direction: column;
                color: #fff;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                user-select: none;
            }
            #h4-link-lightbox.open { display: flex; }
            .h4-lightbox-header {
                padding: 16px 24px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: rgba(255, 255, 255, 0.04);
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            .h4-lightbox-counter { font-size: 14px; font-weight: 600; color: #61afef; font-family: monospace; }
            .h4-lightbox-close { background: none; border: none; color: #aaa; font-size: 28px; cursor: pointer; line-height: 1; }
            .h4-lightbox-close:hover { color: #fff; }
            .h4-lightbox-body { flex: 1; display: flex; align-items: center; justify-content: space-between; padding: 20px; position: relative; }
            #h4-lightbox-img { max-width: 88vw; max-height: 82vh; object-fit: contain; border-radius: 8px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8); }
            .h4-lightbox-nav {
                background: rgba(0, 0, 0, 0.6);
                border: 1px solid rgba(255, 255, 255, 0.3);
                color: #fff;
                width: 48px;
                height: 48px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 24px;
                font-weight: bold;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
                z-index: 2;
            }
            .h4-lightbox-nav:hover { background: #61afef; color: #121218; border-color: #61afef; }
        `;
        document.head.appendChild(style);

        // Toggle Button
        const toggleBtn = document.createElement("div");
        toggleBtn.id = "h4-civitai-toggle-btn";
        toggleBtn.innerHTML = "🔗 Civitai";
        toggleBtn.title = "Open Civitai Model Bridge";
        toggleBtn.onclick = () => this.toggleDrawer();
        document.body.appendChild(toggleBtn);

        // Mouse-Tracking Hover Tooltip DOM
        const tooltip = document.createElement("div");
        tooltip.id = "h4-link-hover-tooltip";
        document.body.appendChild(tooltip);

        // Main Search Panel DOM
        const panel = document.createElement("div");
        panel.id = "h4-link-drawer-panel";
        panel.innerHTML = `
            <div class="h4-drawer-header">
                <div class="h4-drawer-title">🔗 Civitai Bridge</div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <input type="password" id="h4-drawer-apikey" class="h4-drawer-input" style="width: 110px; font-size: 10px; padding: 3px 6px;" placeholder="API Token..." value="${this._apiKey}" title="Civitai API Key for restricted models & higher rate limits">
                    <button class="h4-drawer-close" id="h4-drawer-close-btn">&times;</button>
                </div>
            </div>
            <div class="h4-drawer-search">
                <input type="text" class="h4-drawer-input" id="h4-drawer-query" placeholder="Search models (e.g. Cyberpunk, Anime, Detailer)...">
                
                <div class="h4-drawer-filter-bar">
                    <select id="h4-filter-basemodel" class="h4-drawer-select" title="Filter by Base Model">
                        <option value="All">All Base Models</option>
                        <option value="SD 1.5">SD 1.5</option>
                        <option value="SDXL 1.0">SDXL 1.0</option>
                        <option value="Pony">Pony</option>
                        <option value="FLUX.1">FLUX.1</option>
                        <option value="SD 3">SD 3</option>
                        <option value="Illustrious">Illustrious</option>
                    </select>

                    <select id="h4-filter-sort" class="h4-drawer-select" title="Sort Order">
                        <option value="Highest Rated">Highest Rated</option>
                        <option value="Most Downloaded">Most Downloaded</option>
                        <option value="Newest">Newest</option>
                    </select>
                </div>

                <div class="h4-drawer-tags" id="h4-drawer-tags">
                    <span class="h4-tag-pill active" data-type="All">All</span>
                    <span class="h4-tag-pill" data-type="LORA">LoRA</span>
                    <span class="h4-tag-pill" data-type="Checkpoint">Checkpoint</span>
                    <span class="h4-tag-pill" data-type="VAE">VAE</span>
                    <span class="h4-tag-pill" data-type="TextualInversion">Embeddings</span>
                    <span class="h4-tag-pill" data-type="Controlnet">ControlNet</span>
                    <span class="h4-tag-pill" data-type="UNet">UNet</span>
                    <span class="h4-tag-pill nsfw" id="h4-tag-nsfw">🔞 NSFW: OFF</span>
                </div>
            </div>

            <div class="h4-drawer-body" id="h4-drawer-results">
                <div style="color: #666; font-size: 12px; text-align: center; margin-top: 20px;">Type a query above to search Civitai...</div>
            </div>

            <!-- Live Download Manager Panel Footer -->
            <div id="h4-dl-manager-panel" style="display: none;">
                <div class="h4-dl-header">
                    <span>⚡ ACTIVE DOWNLOADS</span>
                    <span id="h4-dl-count" style="color: #61afef;">0</span>
                </div>
                <div id="h4-dl-list" style="display: flex; flex-direction: column; gap: 6px;"></div>
            </div>
        `;
        document.body.appendChild(panel);

        // Secondary Model Details Panel DOM
        const detailsPanel = document.createElement("div");
        detailsPanel.id = "h4-link-details-panel";
        detailsPanel.innerHTML = `
            <div class="h4-drawer-header">
                <div class="h4-drawer-title" id="h4-details-title">🔗 Model Specifications</div>
                <button class="h4-drawer-close" id="h4-details-close-btn">&times;</button>
            </div>
            <div class="h4-drawer-body" id="h4-details-body">
                <div style="color: #666; font-size: 12px; text-align: center; margin-top: 20px;">Click a model thumbnail to inspect details...</div>
            </div>
        `;
        document.body.appendChild(detailsPanel);

        // Fullscreen Lightbox Modal DOM
        const lightbox = document.createElement("div");
        lightbox.id = "h4-link-lightbox";
        lightbox.innerHTML = `
            <div class="h4-lightbox-header">
                <div class="h4-lightbox-counter" id="h4-lightbox-counter">1 / 1</div>
                <button class="h4-lightbox-close" id="h4-lightbox-close-btn">&times;</button>
            </div>
            <div class="h4-lightbox-body">
                <button class="h4-lightbox-nav prev" id="h4-lightbox-prev">&lsaquo;</button>
                <img id="h4-lightbox-img" src="" alt="preview" referrerpolicy="no-referrer">
                <button class="h4-lightbox-nav next" id="h4-lightbox-next">&rsaquo;</button>
            </div>
        `;
        document.body.appendChild(lightbox);

        // Close handlers
        document.getElementById("h4-drawer-close-btn").onclick = () => this.toggleDrawer(false);
        document.getElementById("h4-details-close-btn").onclick = () => this.toggleDetailsDrawer(false);
        document.getElementById("h4-lightbox-close-btn").onclick = () => this.closeLightbox();
        lightbox.onclick = (e) => {
            if (e.target.id === "h4-link-lightbox" || e.target.className === "h4-lightbox-body") {
                this.closeLightbox();
            }
        };

        // API Key Listener
        const apiKeyInput = document.getElementById("h4-drawer-apikey");
        apiKeyInput.addEventListener("change", () => {
            this._apiKey = apiKeyInput.value.trim ? apiKeyInput.value.trim() : apiKeyInput.value;
            if (window.h4_Dashboard && window.h4_Dashboard.config) {
                window.h4_Dashboard.config.civitaiApiKey = this._apiKey;
                if (typeof window.h4_Dashboard.saveConfig === "function") {
                    window.h4_Dashboard.saveConfig();
                }
            }
        });

        // Search listeners
        const queryInput = document.getElementById("h4-drawer-query");
        queryInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                this._currentPage = 1;
                this.performSearch();
            }
        });

        const baseModelSelect = document.getElementById("h4-filter-basemodel");
        baseModelSelect.onchange = () => {
            this._activeBaseModel = baseModelSelect.value;
            this._currentPage = 1;
            this.performSearch();
        };

        const sortSelect = document.getElementById("h4-filter-sort");
        sortSelect.onchange = () => {
            this._activeSort = sortSelect.value;
            this._currentPage = 1;
            this.performSearch();
        };

        const nsfwBtn = document.getElementById("h4-tag-nsfw");
        nsfwBtn.onclick = () => {
            this._activeNSFW = !this._activeNSFW;
            nsfwBtn.classList.toggle("active", this._activeNSFW);
            nsfwBtn.textContent = this._activeNSFW ? "🔞 NSFW: ON" : "🔞 NSFW: OFF";
            this._currentPage = 1;
            this.performSearch();
        };

        const tags = document.querySelectorAll(".h4-tag-pill:not(.nsfw)");
        tags.forEach(t => {
            t.onclick = () => {
                tags.forEach(x => x.classList.remove("active"));
                t.classList.add("active");
                this._activeType = t.dataset.type || "All";
                this._currentPage = 1;
                this.performSearch();
            };
        });

        // Global Keyboard Handler for Lightbox
        window.addEventListener("keydown", (e) => {
            const lb = document.getElementById("h4-link-lightbox");
            if (lb && lb.classList.contains("open")) {
                if (e.key === "Escape") this.closeLightbox();
                if (e.key === "ArrowLeft") this.stepLightbox(-1);
                if (e.key === "ArrowRight") this.stepLightbox(1);
            }
        });

        // Dynamic layout loops
        this.positionButton();
        window.addEventListener("resize", () => this.positionButton());
        setInterval(() => {
            this.positionButton();
            this.updateButtonVisibility();
        }, 500);

        // Initial download status check
        this.pollDownloadStatus();

        // Restore drawer open state if persisted from previous session
        try {
            const savedOpen = localStorage.getItem("h4_civitai_drawer_open");
            if (savedOpen === "true") {
                this.toggleDrawer(true);
                this.performSearch();
            }
        } catch (err) {
            console.error("[h4_LinkQoL] Error restoring drawer state:", err);
        }
    },

    positionButton() {
        const btn = document.getElementById("h4-civitai-toggle-btn");
        if (!btn) return;
        
        const dwdBtn = document.getElementById("h4-dwd-toggle");
        if (dwdBtn && getComputedStyle(dwdBtn).display !== "none") {
            const rect = dwdBtn.getBoundingClientRect();
            if (rect.left > 0) {
                const rightOffset = window.innerWidth - rect.left + 12;
                btn.style.right = `${Math.max(rightOffset, 460)}px`;
                return;
            }
        }
        btn.style.right = "285px";
    },

    updateButtonVisibility() {
        const btn = document.getElementById("h4-civitai-toggle-btn");
        if (!btn) return;
        let enabled = true;
        if (window.h4_Dashboard && window.h4_Dashboard.config) {
            const master = window.h4_Dashboard.config.qolMasterOverride !== false;
            const globalToggle = window.h4_Dashboard.config.civitaiGlobalToggle !== false;
            const bridge = window.h4_Dashboard.config.civitaiBridgeEnabled !== false;
            enabled = master && globalToggle && bridge;
        }
        btn.style.display = enabled ? "flex" : "none";
        if (!enabled) {
            this.hideHoverTooltip();
        }
    },

    toggleDrawer(open) {
        const panel = document.getElementById("h4-link-drawer-panel");
        if (!panel) return;

        let isOpen = false;
        if (open === undefined) {
            isOpen = panel.classList.toggle("open");
        } else if (open) {
            panel.classList.add("open");
            isOpen = true;
        } else {
            panel.classList.remove("open");
            isOpen = false;
        }

        if (!isOpen) {
            this.toggleDetailsDrawer(false);
            this.hideHoverTooltip();
        } else {
            // Trigger search if drawer body is unpopulated or has default placeholder
            const results = document.getElementById("h4-drawer-results");
            if (results && results.children.length <= 1) {
                this.performSearch();
            }
        }

        try {
            localStorage.setItem("h4_civitai_drawer_open", isOpen ? "true" : "false");
        } catch (e) {}
    },

    toggleDetailsDrawer(open) {
        const detailsPanel = document.getElementById("h4-link-details-panel");
        if (!detailsPanel) return;
        
        if (open === undefined) {
            open = !detailsPanel.classList.contains("open");
        }
        
        if (open) {
            detailsPanel.classList.add("open");
            detailsPanel.style.right = (window.innerWidth <= 920) ? "0px" : "420px";
        } else {
            detailsPanel.classList.remove("open");
            detailsPanel.style.right = "-500px";
        }
    },

    _ctrlHoldTimer: null,
    _scannerActive: false,
    _hoverTimer: null,
    _currentHoverName: null,
    _altPinned: false,
    _lastItem: null,
    _lastVersion: null,

    pinTooltip() {
        if (!this._lastItem) return;
        this._altPinned = true;
        const tooltip = document.getElementById("h4-link-hover-tooltip");
        if (tooltip) {
            tooltip.classList.add("pinned");
            tooltip.style.pointerEvents = "auto";
        }
        if (this._lastItem && this._lastVersion) {
            this.showHoverTooltip(this._lastItem, this._lastVersion, this._lastMouseEvent);
        }
    },

    unpinTooltip() {
        this._altPinned = false;
        const tooltip = document.getElementById("h4-link-hover-tooltip");
        if (tooltip) {
            tooltip.classList.remove("pinned");
            tooltip.style.pointerEvents = "none";
        }
    },

    showScannerBadge(e) {
        let badge = document.getElementById("h4-civitai-scanner-badge");
        if (!badge) {
            badge = document.createElement("div");
            badge.id = "h4-civitai-scanner-badge";
            badge.innerHTML = `
                <span class="h4-scanner-pulse"></span>
                <span class="h4-scanner-text">⚡ CIVITAI_SCANNER</span>
            `;
            document.body.appendChild(badge);
        }
        badge.classList.add("active");
        this.updateScannerBadgePosition(e);
    },

    updateScannerBadgePosition(e) {
        const badge = document.getElementById("h4-civitai-scanner-badge");
        if (!badge || !badge.classList.contains("active")) return;
        const evt = e || this._lastMouseEvent;
        if (!evt) return;

        const offsetX = 18;
        const offsetY = 18;
        let x = evt.clientX + offsetX;
        let y = evt.clientY + offsetY;

        const rect = badge.getBoundingClientRect();
        const winW = window.innerWidth;
        const winH = window.innerHeight;

        if (x + rect.width > winW - 10) x = evt.clientX - rect.width - 10;
        if (y + rect.height > winH - 10) y = evt.clientY - rect.height - 10;

        badge.style.left = `${Math.max(5, x)}px`;
        badge.style.top = `${Math.max(5, y)}px`;
    },

    hideScannerBadge() {
        const badge = document.getElementById("h4-civitai-scanner-badge");
        if (badge) badge.classList.remove("active");
    },

    startCtrlHoldTimer(e) {
        if (this._ctrlHoldTimer || this._scannerActive) return;
        this._ctrlHoldTimer = setTimeout(() => {
            this._scannerActive = true;
            this.showScannerBadge(this._lastMouseEvent || e);
            this.checkHoverScanner(this._lastMouseEvent || e);
        }, 500); // 0.5s hold time
    },

    stopCtrlHoldTimer() {
        if (this._altPinned) return;
        if (this._ctrlHoldTimer) {
            clearTimeout(this._ctrlHoldTimer);
            this._ctrlHoldTimer = null;
        }
        this._scannerActive = false;
        this.hideScannerBadge();
        this.hideHoverTooltip();
    },

    checkHoverScanner(e) {
        const evt = e || this._lastMouseEvent;
        if (!evt || !this._scannerActive || this._altPinned) return;

        this.updateScannerBadgePosition(evt);

        // Exclude Civitai Bridge drawer
        if (evt.target && evt.target.closest("#h4-link-drawer-panel, #h4-link-details-panel, .h4-model-card, #h4-civitai-toggle-btn")) {
            this.hideHoverTooltip();
            return;
        }

        // 1. Check open context menu list entries
        const menuEntry = evt.target.closest(".litemenu-entry, .litecontextmenu div, .contextmenu-entry, .litegraph .litemenu-entry, .comfy-menu-item, .comfy-context-menu div, .comfy-list-item");
        if (menuEntry) {
            let rawTxt = menuEntry.textContent ? menuEntry.textContent.trim() : "";
            rawTxt = rawTxt.replace(/^[^\w\d\.\-\_\/\\]+/, "").trim();
            if (rawTxt && rawTxt !== "None" && !rawTxt.startsWith("---") && (rawTxt.includes(".") || rawTxt.includes("/") || rawTxt.includes("\\") || rawTxt.length >= 2)) {
                this.showHoverTooltipForModelName(rawTxt, evt, true);
                return;
            }
        }

        // 2. Check canvas node combo widgets
        if (!document.querySelector(".litecontextmenu, .litemenu, .comfy-context-menu")) {
            const canvas = app.canvas;
            if (canvas && canvas.graph && canvas.graph_mouse) {
                const gMouse = canvas.graph_mouse;
                const node = canvas.graph.getNodeOnPos(gMouse[0], gMouse[1]);
                if (node && node.widgets && node.widgets.length > 0) {
                    const nodeX = node.pos[0];
                    const nodeY = node.pos[1];
                    const mouseX = gMouse[0] - nodeX;
                    const mouseY = gMouse[1] - nodeY;

                    let currentY = node.widgets_start_y || 30;

                    for (const w of node.widgets) {
                        const wHeight = w.computeSize ? w.computeSize(node.size[0])[1] : (w.height || 24);
                        const widgetY = w.last_y !== undefined ? w.last_y : currentY;

                        if (mouseX >= 0 && mouseX <= node.size[0] && mouseY >= widgetY && mouseY <= widgetY + wHeight) {
                            const wName = (w.name || "").toLowerCase();
                            const isModelWidget = (
                                wName.includes("ckpt") || 
                                wName.includes("lora") || 
                                wName.includes("model") || 
                                wName.includes("vae") || 
                                wName.includes("control") || 
                                wName.includes("unet") || 
                                wName.includes("clip") || 
                                wName.includes("embedding") ||
                                (w.type === "combo" && w.value && typeof w.value === "string" && (w.value.endsWith(".safetensors") || w.value.endsWith(".ckpt") || w.value.endsWith(".pt")))
                            );

                            if (isModelWidget && w.value && typeof w.value === "string") {
                                this.showHoverTooltipForModelName(w.value, evt, true);
                                return;
                            }
                        }
                        currentY += wHeight + 4;
                    }
                }
            }
        }

        this.hideHoverTooltip();
    },

    // Lookup model details by string/filename with client caching
    showHoverTooltipForModelName(modelName, e, instant = false) {
        if (this._altPinned) return;
        if (!modelName || typeof modelName !== "string") {
            this.hideHoverTooltip();
            return;
        }

        const evt = e || this._lastMouseEvent;

        if (!evt || !evt.ctrlKey) {
            this.hideHoverTooltip();
            return;
        }

        if (evt && evt.target && evt.target.closest("#h4-link-drawer-panel, #h4-link-details-panel, .h4-model-card, #h4-civitai-toggle-btn")) {
            this.hideHoverTooltip();
            return;
        }

        let cleanName = modelName.trim().replace(/^['"]|['"]$/g, "");
        cleanName = cleanName.replace(/^[^\w\d\.\-\_\/\\]+/, "").trim();

        if (cleanName.includes("/") || cleanName.includes("\\")) {
            const parts = cleanName.split(/[/\\]/);
            cleanName = parts[parts.length - 1].trim();
        }

        if (!cleanName || cleanName === "None" || cleanName.startsWith("---")) {
            this.hideHoverTooltip();
            return;
        }

        if (window.h4_Dashboard && window.h4_Dashboard.config && window.h4_Dashboard.config.civitaiHoverTooltip === false) {
            this.hideHoverTooltip();
            return;
        }

        if (this._currentHoverName === cleanName && (this._hoverTimer || instant)) {
            this.updateHoverTooltipPosition(evt);
            return;
        }

        this.hideHoverTooltip();
        this._currentHoverName = cleanName;

        const loadAndShow = async () => {
            if (this._currentHoverName !== cleanName) return;
            if (this._lastMouseEvent && !this._lastMouseEvent.ctrlKey && !this._altPinned) return;

            let cached = this._modelInfoCache[cleanName];
            if (!cached) {
                this._modelInfoCache[cleanName] = (async () => {
                    try {
                        let url = `/h4/link/info?name=${encodeURIComponent(cleanName)}`;
                        if (this._apiKey) url += `&api_key=${encodeURIComponent(this._apiKey)}`;
                        const resp = await fetch(url);
                        const data = await resp.json();
                        return data.success ? data.info : null;
                    } catch (err) {
                        return null;
                    }
                })();
            }

            const info = await this._modelInfoCache[cleanName];
            if (!info || this._currentHoverName !== cleanName) return;

            const ratingVal = info.rating ? String(info.rating).replace(/[^0-9.]/g, "") : "5.0";

            const mockItem = {
                modelId: info.modelId,
                name: info.name || cleanName,
                type: info.type || "MODEL",
                stats: {
                    rating: parseFloat(ratingVal) || 5.0,
                    downloadCount: info.downloadCount || "N/A"
                },
                description: info.description || "",
                filename: info.filename || cleanName,
                fileSize: info.fileSize,
                versionsAvailable: info.versionsAvailable,
                previewUrl: info.previewUrl
            };

            const mockVersion = {
                modelId: info.modelId,
                versionName: info.versionName || "",
                baseModel: info.baseModel || "SD",
                trainedWords: info.triggerWords || [],
                images: info.previewUrl ? [{ url: info.previewUrl }] : [],
                previewUrl: info.previewUrl,
                fileSize: info.fileSize,
                versionsAvailable: info.versionsAvailable,
                filename: info.filename || cleanName
            };

            this.showHoverTooltip(mockItem, mockVersion, this._lastMouseEvent || evt);
        };

        if (instant || this._scannerActive) {
            loadAndShow();
        } else {
            this._hoverTimer = setTimeout(loadAndShow, 500);
        }
    },

    // Mouse-Tracking Hover Tooltip Overlay Methods
    showHoverTooltip(item, version, e) {
        if (window.h4_Dashboard && window.h4_Dashboard.config && window.h4_Dashboard.config.civitaiHoverTooltip === false) {
            return;
        }

        const evt = e || this._lastMouseEvent;

        if (evt && evt.target && evt.target.closest("#h4-link-drawer-panel, #h4-link-details-panel, .h4-model-card, #h4-civitai-toggle-btn") && !this._altPinned) {
            this.hideHoverTooltip();
            return;
        }

        let tooltip = document.getElementById("h4-link-hover-tooltip");
        if (!tooltip) {
            tooltip = document.createElement("div");
            tooltip.id = "h4-link-hover-tooltip";
            document.body.appendChild(tooltip);
        }

        this._lastItem = item;
        this._lastVersion = version;

        const modelId = item.modelId || version.modelId;
        const nameVal = item.name || version.name || "Missing";
        const thumbUrl = version.previewUrl || item.previewUrl || (version.images && version.images[0]?.url) || (item.images && item.images[0]?.url) || "";
        const trainedWords = (version.trainedWords && version.trainedWords.length > 0) ? version.trainedWords : (item.triggerWords || []);
        const baseModel = version.baseModel || "SD";
        const verName = version.versionName || version.name || "";
        const type = item.type || "MODEL";
        const rating = (item.stats && item.stats.rating) ? String(item.stats.rating) : "5.0";
        const downloads = (item.stats && item.stats.downloadCount) || "N/A";
        const filename = version.filename || item.filename || "";
        const fileSize = version.fileSize || item.fileSize || "";
        const versionsAvailable = (version.versionsAvailable && version.versionsAvailable.length > 0) ? version.versionsAvailable : (item.versionsAvailable || []);
        const rawDesc = (item.description || "").replace(/<[^>]*>?/gm, "").trim();
        const safeDesc = rawDesc.length > 220 ? rawDesc.substring(0, 220) + "..." : rawDesc;
        const civitaiUrl = modelId ? `https://civitai.com/models/${modelId}` : null;

        tooltip.innerHTML = `
            ${this._altPinned ? `
                <div class="h4-tooltip-pinned-badge">
                    <span>📌 PINNED [ ALT HELD ]</span>
                    <span style="font-size:10px; color:#aaa; cursor:pointer;" onclick="window.h4_LinkQoL.unpinTooltip(); window.h4_LinkQoL.hideHoverTooltip();">&times; UNPIN</span>
                </div>
            ` : ''}

            <!-- 1) Cover Image -->
            ${thumbUrl ? `
                <img class="h4-tooltip-thumb" src="${thumbUrl}" alt="cover image" referrerpolicy="no-referrer" onerror="this.onerror=null; this.replaceWith(Object.assign(document.createElement('div'), {className:'h4-tooltip-thumb-missing', innerHTML:'<span>🖼️ Cover Image: <em class=\\'h4-val-missing\\'>Missing</em></span>'}));">
            ` : `
                <div class="h4-tooltip-thumb-missing">
                    <span>🖼️ Cover Image: <em class="h4-val-missing">Missing</em></span>
                </div>
            `}
            
            <div class="h4-tooltip-meta">
                <!-- 2) Name -->
                <div class="h4-tooltip-title">
                    ${civitaiUrl ? `<a href="${civitaiUrl}" target="_blank" class="h4-model-link" title="Click to open model page on Civitai">${nameVal} ↗</a>` : `<span>${nameVal}</span>`}
                    ${verName ? `<span style="font-size:11px; font-weight:400; color:#61afef; margin-left:4px;">[${verName}]</span>` : ''}
                </div>

                <div class="h4-tooltip-badges">
                    <span class="h4-badge h4-badge-type">${type}</span>
                    <span class="h4-badge h4-badge-base">${baseModel}</span>
                    <span class="h4-badge">${rating.includes('⭐') ? rating : '⭐ ' + rating}</span>
                    <span class="h4-badge">📥 ${downloads}</span>
                </div>

                <!-- 3) Weights / File Size & Filename -->
                <div style="font-size: 11px; color: #abb2bf; margin-top: 4px; display: flex; align-items: center; justify-content: space-between; gap: 6px; flex-wrap: wrap;">
                    <span>⚖️ Weight / Size: ${fileSize && fileSize !== "N/A" ? `<strong class="h4-val-highlight">${fileSize}</strong>` : `<em class="h4-val-missing">Missing</em>`}</span>
                    ${filename ? `<span style="font-family: monospace; color: #888;">📄 ${filename}</span>` : ''}
                </div>

                <!-- 4) Versions Available -->
                <div style="font-size: 11px; color: #d19a66; margin-top: 4px; display: flex; gap: 4px; align-items: center; flex-wrap: wrap;">
                    <span>📦 Versions Available:</span>
                    ${versionsAvailable.length > 0 ? `
                        ${versionsAvailable.slice(0, 5).map(v => `<span style="background: rgba(209, 154, 102, 0.15); border: 1px solid rgba(209, 154, 102, 0.3); border-radius: 3px; padding: 1px 4px; font-size: 10px;">${v}</span>`).join('')}
                        ${versionsAvailable.length > 5 ? `<span style="font-size:9px; color:#888;">+${versionsAvailable.length - 5} more</span>` : ''}
                    ` : `<em class="h4-val-missing">Missing</em>`}
                </div>
            </div>

            <!-- 5) Trigger Words -->
            <div style="margin-top: 4px;">
                <div style="font-size: 10px; font-weight: 700; color: #00f0ff; letter-spacing: 0.5px; margin-bottom: 2px;">🔑 TRIGGER WORDS</div>
                ${trainedWords.length > 0 ? `
                    <div class="h4-tooltip-triggers">${trainedWords.join(', ')}</div>
                ` : `<div style="font-size: 11px;"><em class="h4-val-missing">Missing</em></div>`}
            </div>

            <!-- 6) Opening Portion of Description -->
            <div style="margin-top: 4px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 4px;">
                <div style="font-size: 10px; font-weight: 700; color: #aaa; letter-spacing: 0.5px; margin-bottom: 2px;">📝 DESCRIPTION</div>
                ${safeDesc ? `
                    <div style="font-size: 11px; color: #bbb; line-height: 1.35; max-height: 70px; overflow: hidden; text-overflow: ellipsis;">${safeDesc}</div>
                ` : `<div style="font-size: 11px;"><em class="h4-val-missing">Missing</em></div>`}
            </div>

            <!-- 7) Pin & Browser Link Hint -->
            <div style="font-size: 9px; color: #666; text-align: right; margin-top: 4px;">
                ${this._altPinned ? '📌 PINNED - Click model name to open page' : '[ Hold ALT to Pin & Open Civitai Page ↗ ]'}
            </div>
        `;

        tooltip.classList.add("active");
        if (this._altPinned) {
            tooltip.classList.add("pinned");
            tooltip.style.pointerEvents = "auto";
        } else {
            tooltip.classList.remove("pinned");
            tooltip.style.pointerEvents = "none";
        }
        this.updateHoverTooltipPosition(evt);
    },

    updateHoverTooltipPosition(e) {
        const tooltip = document.getElementById("h4-link-hover-tooltip");
        if (!tooltip || !tooltip.classList.contains("active")) return;
        if (this._altPinned) return; // Freeze position when pinned!

        const evt = e || this._lastMouseEvent;
        if (!evt) return;

        const tooltipWidth = 340;
        const tooltipHeight = tooltip.offsetHeight || 220;
        const padding = 15;

        let posX = evt.clientX + padding;
        let posY = evt.clientY + padding;

        if (posX + tooltipWidth > window.innerWidth - 10) {
            posX = evt.clientX - tooltipWidth - padding;
        }

        if (posY + tooltipHeight > window.innerHeight - 10) {
            posY = evt.clientY - tooltipHeight - padding;
        }

        posX = Math.max(10, Math.min(posX, window.innerWidth - tooltipWidth - 10));
        posY = Math.max(10, Math.min(posY, window.innerHeight - tooltipHeight - 10));

        tooltip.style.left = `${posX}px`;
        tooltip.style.top = `${posY}px`;
    },

    hideHoverTooltip() {
        if (this._altPinned) return; // Keep pinned card open!
        if (this._hoverTimer) {
            clearTimeout(this._hoverTimer);
            this._hoverTimer = null;
        }
        this._currentHoverName = null;
        this._lastItem = null;
        this._lastVersion = null;
        const tooltip = document.getElementById("h4-link-hover-tooltip");
        if (tooltip) {
            tooltip.classList.remove("active");
            tooltip.classList.remove("pinned");
        }
    },

    openLightbox(images, startIndex = 0) {
        if (!images || images.length === 0) return;
        this._lightboxImages = images;
        this._lightboxIndex = startIndex;

        const lb = document.getElementById("h4-link-lightbox");
        if (!lb) return;

        this.updateLightboxContent();
        lb.classList.add("open");

        const prevBtn = document.getElementById("h4-lightbox-prev");
        if (prevBtn) prevBtn.onclick = (e) => { e.stopPropagation(); this.stepLightbox(-1); };

        const nextBtn = document.getElementById("h4-lightbox-next");
        if (nextBtn) nextBtn.onclick = (e) => { e.stopPropagation(); this.stepLightbox(1); };
    },

    stepLightbox(delta) {
        if (this._lightboxImages.length === 0) return;
        this._lightboxIndex = (this._lightboxIndex + delta + this._lightboxImages.length) % this._lightboxImages.length;
        this.updateLightboxContent();
    },

    updateLightboxContent() {
        const imgEl = document.getElementById("h4-lightbox-img");
        const counterEl = document.getElementById("h4-lightbox-counter");
        if (imgEl && this._lightboxImages[this._lightboxIndex]) {
            imgEl.src = this._lightboxImages[this._lightboxIndex].url;
        }
        if (counterEl) {
            counterEl.textContent = `${this._lightboxIndex + 1} / ${this._lightboxImages.length}`;
        }
    },

    closeLightbox() {
        const lb = document.getElementById("h4-link-lightbox");
        if (lb) lb.classList.remove("open");
    },

    openDetailsDrawer(item, version) {
        try {
            this.hideHoverTooltip();
            const detailsBody = document.getElementById("h4-details-body");
            const detailsTitle = document.getElementById("h4-details-title");
            if (!detailsBody || !detailsTitle) return;

            detailsTitle.innerHTML = `🔗 ${item.name || 'Model Specs'}`;

            let images = [];
            if (version && version.images && version.images.length > 0) {
                images = version.images;
            } else if (item.modelVersions) {
                item.modelVersions.forEach(v => {
                    if (v.images) images.push(...v.images);
                });
            }

            let currentIndex = 0;
            const fileObj = (version && version.files && version.files[0]) || {};
            const downloadUrl = fileObj.downloadUrl || "";
            const filename = fileObj.name || `${item.name}.safetensors`;
            const trainedWords = (version && version.trainedWords) ? version.trainedWords : [];
            const previewUrl = images[0]?.url || "";
            const safeDesc = (item.description || "No detailed description provided.").replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

            // Build HTML
            detailsBody.innerHTML = `
                <div class="h4-carousel-container" title="Click image to open Fullscreen Lightbox">
                    ${images.length > 1 ? `<button class="h4-carousel-btn prev" id="h4-carousel-prev">&lsaquo;</button>` : ''}
                    <img class="h4-carousel-img" id="h4-carousel-main" src="${images[0]?.url || ''}" alt="preview" referrerpolicy="no-referrer">
                    ${images.length > 1 ? `<button class="h4-carousel-btn next" id="h4-carousel-next">&rsaquo;</button>` : ''}
                </div>

                ${images.length > 1 ? `
                    <div style="font-size: 11px; font-weight: 600; color: #888; margin-top: 4px;">SHOWCASE GALLERY (${images.length} IMAGES)</div>
                    <div class="h4-thumb-strip" id="h4-carousel-strip">
                        ${images.map((img, i) => `<img class="h4-strip-thumb ${i===0?'active':''}" data-idx="${i}" src="${img.url}" alt="thumb" referrerpolicy="no-referrer" title="Click to view in Fullscreen Lightbox">`).join('')}
                    </div>
                ` : ''}

                <div class="h4-info-meta">
                    <div><strong>Base Model:</strong> ${version?.baseModel || 'SD'}</div>
                    <div><strong>Type:</strong> ${item.type || 'LoRA'}</div>
                    <div><strong>Downloads:</strong> ${(item.stats && item.stats.downloadCount) || 0}</div>
                    <div><strong>Rating:</strong> ⭐ ${(item.stats && item.stats.rating) ? item.stats.rating.toFixed(1) : 'N/A'}</div>
                    <div><strong>Filename:</strong> <code style="color: #98c379;">${filename}</code></div>
                </div>

                ${trainedWords.length > 0 ? `
                    <div>
                        <div style="font-size: 11px; font-weight: 600; color: #888; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center;">
                            <span>TRIGGER WORDS</span>
                            <button class="h4-btn" id="h4-copy-triggers" style="background: rgba(255,255,255,0.1); color: #fff; font-size: 10px; padding: 2px 6px;">Copy</button>
                        </div>
                        <div class="h4-triggers-box" id="h4-triggers-text">${trainedWords.join(', ')}</div>
                    </div>
                ` : ''}

                <div class="h4-btn-group" style="margin-top: 8px;">
                    <button class="h4-btn h4-btn-dl" id="h4-details-dl-btn" style="flex: 1; padding: 10px; font-size: 12px;">Download Model</button>
                    <button class="h4-btn h4-btn-inject" id="h4-details-inject-btn" style="flex: 1; padding: 10px; font-size: 12px;">Load into Node</button>
                </div>

                <div style="margin-top: 10px;">
                    <div style="font-size: 11px; font-weight: 600; color: #888; margin-bottom: 4px;">DESCRIPTION</div>
                    <div style="font-size: 12px; color: #aaa; line-height: 1.4; max-height: 180px; overflow-y: auto; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.05);">
                        ${safeDesc}
                    </div>
                </div>
            `;

            // Dynamic Aspect-Ratio Fitting Carousel
            const updateCarousel = (newIdx) => {
                if (images.length === 0) return;
                currentIndex = (newIdx + images.length) % images.length;
                const mainImg = document.getElementById("h4-carousel-main");
                const carouselBox = document.querySelector(".h4-carousel-container");

                if (mainImg) {
                    mainImg.src = images[currentIndex].url;
                    mainImg.onload = () => {
                        const nw = mainImg.naturalWidth || 1;
                        const nh = mainImg.naturalHeight || 1;
                        const ratio = nw / nh;
                        if (carouselBox) {
                            if (ratio < 0.85) {
                                carouselBox.style.height = "500px";
                            } else if (ratio > 1.25) {
                                carouselBox.style.height = "290px";
                            } else {
                                carouselBox.style.height = "380px";
                            }
                        }
                    };
                }

                const stripThumbs = document.querySelectorAll(".h4-strip-thumb");
                stripThumbs.forEach((t, i) => {
                    if (i === currentIndex) {
                        t.classList.add("active");
                        t.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                    } else {
                        t.classList.remove("active");
                    }
                });
            };

            updateCarousel(0);

            const prevBtn = document.getElementById("h4-carousel-prev");
            if (prevBtn) prevBtn.onclick = (e) => { e.stopPropagation(); updateCarousel(currentIndex - 1); };

            const nextBtn = document.getElementById("h4-carousel-next");
            if (nextBtn) nextBtn.onclick = (e) => { e.stopPropagation(); updateCarousel(currentIndex + 1); };

            const mainImg = document.getElementById("h4-carousel-main");
            if (mainImg) {
                mainImg.onclick = (e) => {
                    e.stopPropagation();
                    this.openLightbox(images, currentIndex);
                };
            }

            const stripThumbs = document.querySelectorAll(".h4-strip-thumb");
            stripThumbs.forEach(t => {
                t.onclick = (e) => {
                    e.stopPropagation();
                    const idx = parseInt(t.dataset.idx);
                    updateCarousel(idx);
                    this.openLightbox(images, idx);
                };
            });

            const copyBtn = document.getElementById("h4-copy-triggers");
            if (copyBtn) {
                copyBtn.onclick = () => {
                    navigator.clipboard.writeText(trainedWords.join(', '));
                    copyBtn.textContent = "Copied!";
                    setTimeout(() => { copyBtn.textContent = "Copy"; }, 1500);
                };
            }

            const dlBtn = document.getElementById("h4-details-dl-btn");
            if (dlBtn) dlBtn.onclick = () => this.downloadModel(downloadUrl, filename, item.type, item.name, trainedWords, previewUrl);

            const injectBtn = document.getElementById("h4-details-inject-btn");
            if (injectBtn) injectBtn.onclick = () => this.injectIntoNode(filename, trainedWords);

            this.toggleDetailsDrawer(true);

            // Fetch full details via API if needed
            if (item.id) {
                let detailsUrl = `/h4/link/details?id=${item.id}`;
                if (this._apiKey) detailsUrl += `&api_key=${encodeURIComponent(this._apiKey)}`;
                fetch(detailsUrl)
                    .then(r => r.json())
                    .then(data => {
                        if (data.success && data.model && data.model.modelVersions) {
                            const fullImages = [];
                            data.model.modelVersions.forEach(v => {
                                if (v.images) fullImages.push(...v.images);
                            });
                            if (fullImages.length > images.length) {
                                images = fullImages;
                                const strip = document.getElementById("h4-carousel-strip");
                                if (strip) {
                                    strip.innerHTML = images.map((img, i) => `<img class="h4-strip-thumb ${i===currentIndex?'active':''}" data-idx="${i}" src="${img.url}" alt="thumb" referrerpolicy="no-referrer">`).join('');
                                    document.querySelectorAll(".h4-strip-thumb").forEach(t => {
                                        t.onclick = (e) => {
                                            e.stopPropagation();
                                            const idx = parseInt(t.dataset.idx);
                                            updateCarousel(idx);
                                            this.openLightbox(images, idx);
                                        };
                                    });
                                }
                            }
                        }
                    })
                    .catch(e => console.log("Details fetch status:", e));
            }
        } catch (e) {
            console.error("Error opening details drawer:", e);
        }
    },

    async performSearch(append = false) {
        const queryInput = document.getElementById("h4-drawer-query");
        const query = queryInput ? queryInput.value : "";
        const resultsContainer = document.getElementById("h4-drawer-results");

        if (!resultsContainer) return;

        if (!append) {
            this._currentPage = 1;
            resultsContainer.innerHTML = `<div style="color: #888; font-size: 12px; text-align: center; margin-top: 20px;">Searching Civitai API...</div>`;
        }

        let url = `/h4/link/search?query=${encodeURIComponent(query)}&type=${encodeURIComponent(this._activeType)}&baseModel=${encodeURIComponent(this._activeBaseModel)}&sort=${encodeURIComponent(this._activeSort)}&page=${this._currentPage}&nsfw=${this._activeNSFW}`;
        if (this._apiKey) {
            url += `&api_key=${encodeURIComponent(this._apiKey)}`;
        }

        console.log(`[h4_LinkQoL] Requesting Civitai Search: ${url}`);

        try {
            const resp = await fetch(url);
            const data = await resp.json();
            console.log(`[h4_LinkQoL] Civitai Search Result:`, data);

            if (data.success && Array.isArray(data.items) && data.items.length > 0) {
                if (!append) resultsContainer.innerHTML = "";

                const oldMoreBtn = document.getElementById("h4-load-more-btn");
                if (oldMoreBtn) oldMoreBtn.remove();

                data.items.forEach(item => {
                    const card = document.createElement("div");
                    card.className = "h4-model-card";
                    
                    const latestVer = (item.modelVersions && item.modelVersions[0]) || {};
                    const thumbUrl = (latestVer.images && latestVer.images[0]?.url) || "";
                    const fileObj = (latestVer.files && latestVer.files[0]) || {};
                    const downloadUrl = fileObj.downloadUrl || "";
                    const filename = fileObj.name || `${item.name}.safetensors`;

                    card.innerHTML = `
                        <img class="h4-model-thumb" src="${thumbUrl}" alt="thumb" referrerpolicy="no-referrer" title="Click to view full details & example gallery">
                        <div class="h4-model-info">
                            <div class="h4-model-name" title="${item.name}">${item.name}</div>
                            <div class="h4-model-type">${item.type} • ${latestVer.baseModel || 'SD'}</div>
                            <div class="h4-btn-group">
                                <button class="h4-btn h4-btn-dl" data-dl="${downloadUrl}" data-file="${filename}">Download</button>
                                <button class="h4-btn h4-btn-inject" data-file="${filename}">Load into Node</button>
                            </div>
                        </div>
                    `;



                    const thumbImg = card.querySelector(".h4-model-thumb");
                    if (thumbImg) thumbImg.onclick = (e) => { e.stopPropagation(); this.openDetailsDrawer(item, latestVer); };

                    const titleEl = card.querySelector(".h4-model-name");
                    if (titleEl) titleEl.onclick = (e) => { e.stopPropagation(); this.openDetailsDrawer(item, latestVer); };

                    const dlBtn = card.querySelector(".h4-btn-dl");
                    if (dlBtn) dlBtn.onclick = (e) => { e.stopPropagation(); this.downloadModel(downloadUrl, filename, item.type, item.name, latestVer.trainedWords, thumbUrl); };

                    const injectBtn = card.querySelector(".h4-btn-inject");
                    if (injectBtn) injectBtn.onclick = (e) => { e.stopPropagation(); this.injectIntoNode(filename, latestVer.trainedWords); };

                    resultsContainer.appendChild(card);
                });

                if (data.metadata && data.metadata.nextPage) {
                    const moreBtn = document.createElement("button");
                    moreBtn.id = "h4-load-more-btn";
                    moreBtn.className = "h4-btn h4-btn-secondary";
                    moreBtn.style.cssText = "width: 100%; padding: 10px; margin-top: 10px; font-size: 12px; font-weight: 600;";
                    moreBtn.textContent = `Load More Results (Page ${this._currentPage + 1})...`;
                    moreBtn.onclick = () => {
                        this._currentPage += 1;
                        this.performSearch(true);
                    };
                    resultsContainer.appendChild(moreBtn);
                }
            } else {
                if (!append) {
                    const errMsg = (data && data.error) ? `Error: ${data.error}` : `No models found for Type: ${this._activeType}, Base: ${this._activeBaseModel}`;
                    resultsContainer.innerHTML = `
                        <div style="color: #e06c75; font-size: 12px; text-align: center; margin-top: 20px; display: flex; flex-direction: column; align-items: center; gap: 10px;">
                            <span>${errMsg}</span>
                            <button class="h4-btn h4-btn-secondary" id="h4-search-retry-btn" style="padding: 6px 14px;">🔄 Retry Search</button>
                        </div>
                    `;
                    const retryBtn = document.getElementById("h4-search-retry-btn");
                    if (retryBtn) retryBtn.onclick = () => this.performSearch();
                }
            }
        } catch (e) {
            console.error("[h4_LinkQoL] Perform search exception:", e);
            if (!append) {
                resultsContainer.innerHTML = `
                    <div style="color: #e06c75; font-size: 12px; text-align: center; margin-top: 20px; display: flex; flex-direction: column; align-items: center; gap: 10px;">
                        <span>API Request Error: ${e.message}</span>
                        <button class="h4-btn h4-btn-secondary" id="h4-search-retry-btn" style="padding: 6px 14px;">🔄 Retry Search</button>
                    </div>
                `;
                const retryBtn = document.getElementById("h4-search-retry-btn");
                if (retryBtn) retryBtn.onclick = () => this.performSearch();
            }
        }
    },

    async downloadModel(url, filename, type, modelName, words, previewUrl) {
        let savePreview = true;
        if (window.h4_Dashboard && window.h4_Dashboard.config) {
            savePreview = window.h4_Dashboard.config.civitaiPreviewSidecars !== false;
        }

        try {
            const resp = await fetch('/h4/link/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    download_url: url,
                    filename: filename,
                    model_type: type,
                    model_name: modelName,
                    trigger_words: words || [],
                    preview_image_url: previewUrl || null,
                    save_preview: savePreview,
                    api_key: this._apiKey || null
                })
            });
            const res = await resp.json();
            if (res.success && res.download_id) {
                this.startStatusPolling();
            } else if (res.error) {
                alert(`Download error: ${res.error}`);
            }
        } catch (e) {
            console.error("Download trigger error:", e);
        }
    },

    async cancelDownload(downloadId) {
        try {
            await fetch('/h4/link/cancel_download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ download_id: downloadId })
            });
            this.pollDownloadStatus();
        } catch (e) {
            console.error("Cancel download error:", e);
        }
    },

    startStatusPolling() {
        if (!this._pollTimer) {
            this.pollDownloadStatus();
            this._pollTimer = setInterval(() => this.pollDownloadStatus(), 1000);
        }
    },

    async pollDownloadStatus() {
        try {
            const resp = await fetch('/h4/link/status');
            const downloads = await resp.json();

            const managerPanel = document.getElementById("h4-dl-manager-panel");
            const dlList = document.getElementById("h4-dl-list");
            const countEl = document.getElementById("h4-dl-count");

            if (!managerPanel || !dlList) return;

            if (!Array.isArray(downloads) || downloads.length === 0) {
                managerPanel.style.display = "none";
                if (this._pollTimer) {
                    clearInterval(this._pollTimer);
                    this._pollTimer = null;
                }
                return;
            }

            managerPanel.style.display = "flex";
            if (countEl) countEl.textContent = downloads.length;

            let activeCount = 0;
            dlList.innerHTML = "";

            downloads.forEach(dl => {
                if (dl.status === "DOWNLOADING") activeCount++;

                const sizeMb = (dl.bytes_downloaded / (1024 * 1024)).toFixed(1);
                const totalMb = (dl.total_bytes / (1024 * 1024)).toFixed(1);
                const sizeText = dl.total_bytes > 0 ? `${sizeMb} MB / ${totalMb} MB` : `${sizeMb} MB`;
                const pct = dl.progress_percent || 0.0;

                const item = document.createElement("div");
                item.className = "h4-dl-item";
                item.innerHTML = `
                    <div class="h4-dl-row">
                        <span class="h4-dl-name" title="${dl.filename}">${dl.filename}</span>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span class="h4-dl-status-badge ${dl.status}">${dl.status}</span>
                            ${dl.status === "DOWNLOADING" ? `<button class="h4-drawer-close" style="font-size: 14px;" data-cancel="${dl.id}">&times;</button>` : ''}
                        </div>
                    </div>
                    <div class="h4-dl-bar-bg">
                        <div class="h4-dl-bar-fill" style="width: ${pct}%;"></div>
                    </div>
                    <div class="h4-dl-row" style="font-size: 10px; color: #888;">
                        <span>${pct.toFixed(1)}%</span>
                        <span>${sizeText}</span>
                    </div>
                `;

                const cancelBtn = item.querySelector("[data-cancel]");
                if (cancelBtn) {
                    cancelBtn.onclick = () => this.cancelDownload(dl.id);
                }

                dlList.appendChild(item);

                // Auto-Inject on Download Complete if enabled
                if (dl.status === "COMPLETE" && !dl._autoInjected) {
                    dl._autoInjected = true;
                    if (window.h4_Dashboard && window.h4_Dashboard.config && window.h4_Dashboard.config.civitaiAutoInject !== false) {
                        this.injectIntoNode(dl.filename);
                    }
                }
            });

            if (activeCount === 0 && this._pollTimer) {
                setTimeout(() => {
                    if (this._pollTimer) {
                        clearInterval(this._pollTimer);
                        this._pollTimer = null;
                    }
                }, 5000);
            }
        } catch (e) {
            console.error("Poll status error:", e);
        }
    },

    injectIntoNode(filename, triggerWords) {
        const selectedNodes = app.canvas.selected_nodes;

        if (selectedNodes && Object.keys(selectedNodes).length > 0) {
            for (const id in selectedNodes) {
                const node = selectedNodes[id];
                
                // 1. Check if node is H4_LinkQoL node
                if (node.type === "H4_LinkQoL" || (node.title && node.title.includes("Civitai Bridge"))) {
                    const modelWidget = node.widgets?.find(w => w.name === "active_model_name");
                    const triggerWidget = node.widgets?.find(w => w.name === "trigger_words");

                    if (modelWidget) {
                        modelWidget.value = filename;
                    }
                    if (triggerWidget && triggerWords && triggerWords.length > 0) {
                        triggerWidget.value = Array.isArray(triggerWords) ? triggerWords.join(", ") : triggerWords;
                    }
                    app.canvas.setDirty(true, true);
                    alert(`Injected '${filename}' into H4 Link QoL node!`);
                    return;
                }

                // 2. Standard ComfyUI model loader nodes
                if (node.widgets) {
                    const loraWidget = node.widgets.find(w => 
                        w.name === "lora_name" || 
                        w.name === "ckpt_name" || 
                        w.name === "model_name" || 
                        w.name === "vae_name" || 
                        w.name === "control_net_name" || 
                        w.name === "active_model_name"
                    );
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
