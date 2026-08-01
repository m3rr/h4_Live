// h4_LinkQoL.js - Civitai Bridge & Model Manager Frontend UI with Dynamic Aspect-Ratio Fitting & Large Thumbnails
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
            /* Main Search Drawer */
            #h4-link-drawer-panel {
                position: fixed;
                top: 0;
                right: -420px;
                width: 400px;
                height: 100vh;
                background: rgba(18, 18, 24, 0.96);
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

            /* Secondary Model Details Drawer (Wider for Large Images & Fitting Layouts) */
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
            #h4-link-details-panel.open {
                right: 400px;
            }

            .h4-drawer-header {
                padding: 16px;
                background: rgba(255, 255, 255, 0.04);
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                display: flex;
                align-items: center;
                justify-content: space-between;
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
                max-width: 390px;
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
            }
            .h4-model-name {
                font-size: 13px;
                font-weight: 600;
                color: #fff;
                cursor: pointer;
                transition: color 0.15s;
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

            /* Dynamic Aspect-Ratio Fitting Carousel & Large Thumbnails */
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

            /* Large Thumbnail Gallery Strip */
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

            /* Fullscreen Lightbox Modal */
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
            #h4-link-lightbox.open {
                display: flex;
            }
            .h4-lightbox-header {
                padding: 16px 24px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: rgba(255, 255, 255, 0.04);
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            .h4-lightbox-counter {
                font-size: 14px;
                font-weight: 600;
                color: #61afef;
                font-family: monospace;
            }
            .h4-lightbox-close {
                background: none;
                border: none;
                color: #aaa;
                font-size: 28px;
                cursor: pointer;
                line-height: 1;
            }
            .h4-lightbox-close:hover { color: #fff; }
            .h4-lightbox-body {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 20px;
                position: relative;
            }
            #h4-lightbox-img {
                max-width: 88vw;
                max-height: 82vh;
                object-fit: contain;
                border-radius: 8px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
            }
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

        // Main Search Panel DOM
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
                <img id="h4-lightbox-img" src="" alt="preview">
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

        // Search listeners
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
    },

    positionButton() {
        const btn = document.getElementById("h4-civitai-toggle-btn");
        if (!btn) return;
        
        const dwdBtn = document.getElementById("h4-dwd-toggle");
        if (dwdBtn && getComputedStyle(dwdBtn).display !== "none") {
            const rect = dwdBtn.getBoundingClientRect();
            if (rect.left > 0) {
                const rightOffset = window.innerWidth - rect.left + 12;
                btn.style.right = `${Math.max(rightOffset, 440)}px`;
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
            const bridge = window.h4_Dashboard.config.civitaiBridgeEnabled !== false;
            enabled = master && bridge;
        }
        btn.style.display = enabled ? "flex" : "none";
    },

    toggleDrawer(open) {
        const panel = document.getElementById("h4-link-drawer-panel");
        if (!panel) return;
        if (open === undefined) {
            const isOpen = panel.classList.toggle("open");
            if (!isOpen) this.toggleDetailsDrawer(false);
        } else if (open) {
            panel.classList.add("open");
        } else {
            panel.classList.remove("open");
            this.toggleDetailsDrawer(false);
        }
    },

    toggleDetailsDrawer(open) {
        const detailsPanel = document.getElementById("h4-link-details-panel");
        if (!detailsPanel) return;
        
        if (open === undefined) {
            open = !detailsPanel.classList.contains("open");
        }
        
        if (open) {
            detailsPanel.classList.add("open");
            detailsPanel.style.right = (window.innerWidth <= 920) ? "0px" : "400px";
        } else {
            detailsPanel.classList.remove("open");
            detailsPanel.style.right = "-500px"; // Completely hides panel off-screen
        }
    },

    // Lightbox State
    _lightboxImages: [],
    _lightboxIndex: 0,

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
            const safeDesc = (item.description || "No detailed description provided.").replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

            // Build HTML
            detailsBody.innerHTML = `
                <div class="h4-carousel-container" title="Click image to open Fullscreen Lightbox">
                    ${images.length > 1 ? `<button class="h4-carousel-btn prev" id="h4-carousel-prev">&lsaquo;</button>` : ''}
                    <img class="h4-carousel-img" id="h4-carousel-main" src="${images[0]?.url || ''}" alt="preview">
                    ${images.length > 1 ? `<button class="h4-carousel-btn next" id="h4-carousel-next">&rsaquo;</button>` : ''}
                </div>

                ${images.length > 1 ? `
                    <div style="font-size: 11px; font-weight: 600; color: #888; margin-top: 4px;">SHOWCASE GALLERY (${images.length} IMAGES)</div>
                    <div class="h4-thumb-strip" id="h4-carousel-strip">
                        ${images.map((img, i) => `<img class="h4-strip-thumb ${i===0?'active':''}" data-idx="${i}" src="${img.url}" alt="thumb" title="Click to view in Fullscreen Lightbox">`).join('')}
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
                                // Tall Portrait image (e.g. 512x768, 832x1216) -> grows tall
                                carouselBox.style.height = "500px";
                            } else if (ratio > 1.25) {
                                // Wide Landscape image (e.g. 1216x832, 1024x576) -> fits wide frame
                                carouselBox.style.height = "290px";
                            } else {
                                // Square or Standard image (e.g. 1024x1024) -> standard height
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

            // Trigger initial image aspect-ratio sizing
            updateCarousel(0);

            const prevBtn = document.getElementById("h4-carousel-prev");
            if (prevBtn) prevBtn.onclick = (e) => { e.stopPropagation(); updateCarousel(currentIndex - 1); };

            const nextBtn = document.getElementById("h4-carousel-next");
            if (nextBtn) nextBtn.onclick = (e) => { e.stopPropagation(); updateCarousel(currentIndex + 1); };

            // Clicking main preview image opens Fullscreen Lightbox!
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

            // Trigger words copy handler
            const copyBtn = document.getElementById("h4-copy-triggers");
            if (copyBtn) {
                copyBtn.onclick = () => {
                    navigator.clipboard.writeText(trainedWords.join(', '));
                    copyBtn.textContent = "Copied!";
                    setTimeout(() => { copyBtn.textContent = "Copy"; }, 1500);
                };
            }

            // Action handlers
            const dlBtn = document.getElementById("h4-details-dl-btn");
            if (dlBtn) dlBtn.onclick = () => this.downloadModel(downloadUrl, filename, item.type, item.name, trainedWords);

            const injectBtn = document.getElementById("h4-details-inject-btn");
            if (injectBtn) injectBtn.onclick = () => this.injectIntoNode(filename);

            this.toggleDetailsDrawer(true);

            // Fetch full model details via API for extra showcase images
            if (item.id) {
                fetch(`/h4/link/details?id=${item.id}`)
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
                                    strip.innerHTML = images.map((img, i) => `<img class="h4-strip-thumb ${i===currentIndex?'active':''}" data-idx="${i}" src="${img.url}" alt="thumb">`).join('');
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
                    
                    const latestVer = (item.modelVersions && item.modelVersions[0]) || {};
                    const thumbUrl = (latestVer.images && latestVer.images[0]?.url) || "";
                    const fileObj = (latestVer.files && latestVer.files[0]) || {};
                    const downloadUrl = fileObj.downloadUrl || "";
                    const filename = fileObj.name || `${item.name}.safetensors`;

                    card.innerHTML = `
                        <img class="h4-model-thumb" src="${thumbUrl}" alt="thumb" title="Click to view full details & example gallery">
                        <div class="h4-model-info">
                            <div class="h4-model-name">${item.name}</div>
                            <div class="h4-model-type">${item.type} • ${latestVer.baseModel || 'SD'}</div>
                            <div class="h4-btn-group">
                                <button class="h4-btn h4-btn-dl" data-dl="${downloadUrl}" data-file="${filename}" data-type="${item.type}">Download</button>
                                <button class="h4-btn h4-btn-inject" data-file="${filename}">Load into Node</button>
                            </div>
                        </div>
                    `;

                    // Click listeners for details drawer
                    const thumbImg = card.querySelector(".h4-model-thumb");
                    if (thumbImg) thumbImg.onclick = (e) => { e.stopPropagation(); this.openDetailsDrawer(item, latestVer); };

                    const titleEl = card.querySelector(".h4-model-name");
                    if (titleEl) titleEl.onclick = (e) => { e.stopPropagation(); this.openDetailsDrawer(item, latestVer); };

                    // Button handlers
                    const dlBtn = card.querySelector(".h4-btn-dl");
                    if (dlBtn) dlBtn.onclick = (e) => { e.stopPropagation(); this.downloadModel(downloadUrl, filename, item.type, item.name, latestVer.trainedWords); };

                    const injectBtn = card.querySelector(".h4-btn-inject");
                    if (injectBtn) injectBtn.onclick = (e) => { e.stopPropagation(); this.injectIntoNode(filename); };

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
