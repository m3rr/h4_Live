import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";


function openLightbox(images, startIndex) {
    let overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.backgroundColor = "rgba(0,0,0,0.9)";
    overlay.style.zIndex = "10000";
    overlay.style.display = "flex";
    overlay.style.flexDirection = "column";
    overlay.style.justifyContent = "center";
    overlay.style.alignItems = "center";

    let imgDisplay = document.createElement("img");
    imgDisplay.style.maxWidth = "90%";
    imgDisplay.style.maxHeight = "80%";
    imgDisplay.style.objectFit = "contain";
    imgDisplay.style.borderRadius = "8px";
    imgDisplay.style.boxShadow = "0 8px 32px rgba(0,0,0,0.5)";
    imgDisplay.src = images[startIndex].src;

    let currentIndex = startIndex;

    let strip = document.createElement("div");
    strip.style.display = "flex";
    strip.style.marginTop = "20px";
    strip.style.gap = "10px";
    strip.style.padding = "10px";
    strip.style.background = "rgba(0,0,0,0.5)";
    strip.style.borderRadius = "10px";

    images.forEach((img, i) => {
        let thumb = document.createElement("img");
        thumb.src = img.src;
        thumb.style.height = "80px";
        thumb.style.cursor = "pointer";
        thumb.style.borderRadius = "4px";
        thumb.style.border = i === currentIndex ? "2px solid #fbc02d" : "2px solid transparent";
        thumb.style.transition = "border 0.2s";

        thumb.onclick = (e) => {
            e.stopPropagation();
            currentIndex = i;
            imgDisplay.src = images[currentIndex].src;
            Array.from(strip.children).forEach((c, idx) => {
                c.style.border = idx === currentIndex ? "2px solid #fbc02d" : "2px solid transparent";
            });
        };
        strip.appendChild(thumb);
    });

    overlay.appendChild(imgDisplay);
    if (images.length > 1) overlay.appendChild(strip);

    overlay.onclick = () => document.body.removeChild(overlay);

    const escListener = (e) => {
        if (e.key === "Escape") {
            try { document.body.removeChild(overlay); } catch (x) { }
            window.removeEventListener("keydown", escListener);
        }
    };
    window.addEventListener("keydown", escListener);
    document.body.appendChild(overlay);
}


function setWidgetVisible(w, visible) {
    if (visible) {
        if (w.h4_orig_type) {
            Object.defineProperty(w, "type", { get: () => w.h4_orig_type, set: (v) => { w.h4_orig_type = v; }, configurable: true });
        }
        w.hidden = false;
        w.computeSize = () => [200, 20];
        delete w.draw;
        if (w.element) w.element.style.display = "";
        if (w.inputEl) w.inputEl.style.display = "";
    } else {
        if (!w.h4_orig_type) w.h4_orig_type = w.type;
        Object.defineProperty(w, "type", { get: () => "customtext", set: () => { }, configurable: true });
        w.hidden = true;
        w.computeSize = () => [0, -4];
        w.draw = () => { };
        if (w.element) w.element.style.display = "none";
        if (w.inputEl) w.inputEl.style.display = "none";
    }
}


app.registerExtension({
    name: "h4_Live.Loaders",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "H4_CompleteLoader" || nodeData.name === "H4_MultiImgUpload") {
            function initNode(node) {
                if (node.h4_initialized) return;
                node.h4_initialized = true;

                let refreshTimer = null;

                const uploadWidget = node.addWidget("button", "📤 Smart Upload Image(s)", null, () => {
                    let input = document.createElement("input");
                    input.type = "file";
                    input.multiple = true;
                    input.accept = "image/jpeg,image/png,image/webp,image/bmp";
                    input.onchange = async (e) => {
                        const files = Array.from(e.target.files);
                        const currentImageWidgets = node.widgets.filter(w => w.name && w.name.startsWith("image_"));
                        const availableSlots = currentImageWidgets.filter(w => !w.value || w.value === "none" || w.value === "");

                        if (files.length > availableSlots.length) {
                            alert(`Only ${availableSlots.length} slot(s) available. ${files.length - availableSlots.length} file(s) will be skipped.`);
                        }

                        const filesToUpload = files.slice(0, availableSlots.length);

                        const results = await Promise.all(filesToUpload.map(async (file) => {
                            try {
                                const body = new FormData();
                                body.append("image", file);
                                body.append("type", "input");
                                const resp = await api.fetchApi("/upload/image", { method: "POST", body });
                                if (resp.status === 200) return await resp.json();
                            } catch (error) {
                                console.error("[h4_Live] Image upload failed", error);
                            }
                            return null;
                        }));

                        results.forEach((data, i) => {
                            if (!data) return;
                            const slot = availableSlots[i];
                            if (!slot.options.values.includes(data.name)) {
                                slot.options.values.push(data.name);
                            }
                            slot.value = data.name;
                            if (slot.callback) slot.callback(data.name);
                        });

                        refreshLayout();
                    };
                    input.click();
                });

                node.widgets.forEach(w => {
                    if (w.type === "button" &&
                        w.name !== "📤 Smart Upload Image(s)" &&
                        (!w.name || w.name.includes("choose file to upload") || w.name === "image")) {
                        setWidgetVisible(w, false);
                    }
                });

                function enforceSequentialSlots() {
                    const currentImageWidgets = node.widgets.filter(w => w.name && w.name.startsWith("image_"));
                    let values = currentImageWidgets.map(w => w.value).filter(v => v && v !== "none");
                    for (let i = 0; i < currentImageWidgets.length; i++) {
                        currentImageWidgets[i].value = i < values.length ? values[i] : "none";
                    }

                    let currentNames = (node.h4_images || []).map(img => img.dataset.filename);
                    if (JSON.stringify(currentNames) === JSON.stringify(values)) return;

                    node.h4_images = values.map((val) => {
                        const existing = (node.h4_images || []).find(img => img.dataset.filename === val);
                        if (existing) return existing;

                        let img = new Image();
                        img.dataset.filename = val;
                        img.onload = () => { app.graph?.setDirtyCanvas(true, true); };
                        img.onerror = () => {
                            img.__h4_error = true;
                            app.graph?.setDirtyCanvas(true, true);
                        };
                        img.src = api.apiURL(`/view?filename=${encodeURIComponent(val)}&type=input&subfolder=`);
                        return img;
                    });
                    node.h4_active_preview_index = 0;
                }

                function _doRefresh() {
                    enforceSequentialSlots();

                    let usedCount = (node.h4_images || []).length;

                    const loadModeWidget = node.widgets.find(w => w.name === "load_mode");
                    if (loadModeWidget) {
                        const isCheckpointMode = loadModeWidget.value === "Checkpoint (Standard)";
                        node.widgets.forEach(w => {
                            if (w.name === "ckpt_name") setWidgetVisible(w, isCheckpointMode);
                            if (["unet_name", "vae_name", "clip_name"].includes(w.name)) setWidgetVisible(w, !isCheckpointMode);
                        });
                    }

                    const currentImageWidgets = node.widgets.filter(w => w.name && w.name.startsWith("image_"));
                    for (let i = 0; i < currentImageWidgets.length; i++) {
                        setWidgetVisible(currentImageWidgets[i], i < usedCount);
                    }

                    const baseOutputs = nodeData.name === "H4_CompleteLoader" ? 3 : 0;
                    const requiredOutputCount = baseOutputs + (usedCount * 2);

                    if (node.outputs) {
                        let changed = false;
                        while (node.outputs.length > requiredOutputCount) {
                            node.removeOutput(node.outputs.length - 1);
                            changed = true;
                        }
                        while (node.outputs.length < requiredOutputCount) {
                            const idx = node.outputs.length - baseOutputs;
                            const imgNum = Math.floor(idx / 2) + 1;
                            const isMask = idx % 2 === 1;
                            node.addOutput(isMask ? `MASK_${imgNum}` : `IMAGE_${imgNum}`, isMask ? "MASK" : "IMAGE");
                            changed = true;
                        }
                        if (changed) app.graph?.setDirtyCanvas(true, true);
                    }

                    const newSize = node.computeSize([node.size[0], 0]);
                    node.setSize([Math.max(node.size[0], newSize[0]), newSize[1]]);
                }

                function refreshLayout() {
                    clearTimeout(refreshTimer);
                    refreshTimer = setTimeout(_doRefresh, 50);
                }

                const originalComputeSize = node.computeSize;
                node.computeSize = function (out) {
                    let res = originalComputeSize ? originalComputeSize.apply(this, arguments) : [200, 100];
                    if (Array.isArray(res)) {
                        if (this.h4_images && this.h4_images.length > 0) res[1] += 230;
                    }
                    return res;
                };

                node.onDrawBackground = function (ctx) {
                    if (!this.flags.collapsed && this.h4_images && this.h4_images.length > 0) {
                        const stripHeight = 50;
                        const padding = 15;

                        const naturalHeight = originalComputeSize
                            ? originalComputeSize.call(this, [this.size[0], 0])
                            : [this.size[0], 100];
                        const widgetAreaHeight = Array.isArray(naturalHeight) ? naturalHeight[1] : 100;

                        const previewHeight = Math.max(120, this.size[1] - widgetAreaHeight - stripHeight - padding * 2);

                        if (!this.h4_images[0]) return;

                        const cx = padding;
                        const cy = widgetAreaHeight + padding;
                        const cw = this.size[0] - padding * 2;

                        const activeImg = this.h4_images[this.h4_active_preview_index || 0];
                        if (activeImg) {
                            ctx.save();
                            ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
                            ctx.beginPath();
                            ctx.roundRect(cx, cy, cw, previewHeight, 5);
                            ctx.fill();
                            ctx.clip();

                            if (activeImg.complete && activeImg.naturalWidth > 0) {
                                const rx = cw / activeImg.naturalWidth;
                                const ry = previewHeight / activeImg.naturalHeight;
                                const ratio = Math.min(rx, ry);
                                const dw = activeImg.naturalWidth * ratio;
                                const dh = activeImg.naturalHeight * ratio;
                                const dx = cx + (cw - dw) / 2;
                                const dy = cy + (previewHeight - dh) / 2;
                                ctx.drawImage(activeImg, dx, dy, dw, dh);
                            } else {
                                ctx.fillStyle = activeImg.__h4_error ? "#ff3333" : "#888";
                                ctx.font = "14px monospace";
                                ctx.textAlign = "center";
                                ctx.fillText(activeImg.__h4_error ? "⚠ FAILED" : "LOADING...", cx + cw / 2, cy + previewHeight / 2);
                            }
                            ctx.restore();

                            ctx.strokeStyle = "rgba(255,255,255,0.1)";
                            ctx.lineWidth = 1;
                            ctx.beginPath();
                            ctx.roundRect(cx, cy, cw, previewHeight, 5);
                            ctx.stroke();

                            this.h4_preview_rect = [cx, cy, cw, previewHeight];
                        }

                        const stripY = cy + previewHeight + padding * 0.8;
                        this.h4_strip_rects = [];
                        this.h4_arrow_rects = {};

                        const arrowSize = 16;
                        const arrowPad = 4;
                        const arrowW = arrowSize + arrowPad * 2;

                        const stripCx = this.h4_images.length > 1 ? cx + arrowW : cx;
                        const stripCw = this.h4_images.length > 1 ? cw - arrowW * 2 : cw;

                        const thumbW = stripHeight;
                        const gap = 8;
                        const totalW = (thumbW * this.h4_images.length) + (gap * (this.h4_images.length - 1));
                        let startX = stripCx + (stripCw - totalW) / 2;
                        if (startX < stripCx) startX = stripCx;

                        for (let i = 0; i < this.h4_images.length; i++) {
                            const img = this.h4_images[i];
                            const tx = startX + i * (thumbW + gap);
                            if (tx + thumbW > stripCx + stripCw) break;

                            if (img.complete && img.naturalWidth > 0) {
                                const srcRatio = img.naturalWidth / img.naturalHeight;
                                let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
                                if (srcRatio > 1) { sw = img.naturalHeight; sx = (img.naturalWidth - sw) / 2; }
                                else { sh = img.naturalWidth; sy = (img.naturalHeight - sh) / 2; }

                                ctx.save();
                                ctx.beginPath();
                                ctx.roundRect(tx, stripY, thumbW, thumbW, 4);
                                ctx.clip();
                                ctx.drawImage(img, sx, sy, sw, sh, tx, stripY, thumbW, thumbW);
                                ctx.restore();
                            }

                            const isActive = i === (this.h4_active_preview_index || 0);
                            ctx.strokeStyle = isActive ? "#fbc02d" : "rgba(255,255,255,0.2)";
                            ctx.lineWidth = isActive ? 2 : 1;
                            ctx.beginPath();
                            ctx.roundRect(tx, stripY, thumbW, thumbW, 4);
                            ctx.stroke();

                            this.h4_strip_rects.push([tx, stripY, thumbW, thumbW]);
                        }

                        if (this.h4_images.length > 1) {
                            const arrowMidY = stripY + thumbW / 2;

                            ctx.save();
                            ctx.fillStyle = this.h4_active_preview_index > 0 ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.2)";
                            ctx.font = `${arrowSize}px monospace`;
                            ctx.textAlign = "center";
                            ctx.textBaseline = "middle";
                            ctx.fillText("◀", cx + arrowW / 2, arrowMidY);
                            ctx.restore();
                            this.h4_arrow_rects.left = [cx, stripY, arrowW, thumbW];

                            const rax = cx + cw - arrowW;
                            ctx.save();
                            ctx.fillStyle = this.h4_active_preview_index < this.h4_images.length - 1 ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.2)";
                            ctx.font = `${arrowSize}px monospace`;
                            ctx.textAlign = "center";
                            ctx.textBaseline = "middle";
                            ctx.fillText("▶", rax + arrowW / 2, arrowMidY);
                            ctx.restore();
                            this.h4_arrow_rects.right = [rax, stripY, arrowW, thumbW];
                        }
                    }
                };

                const originalMouseDown = node.onMouseDown;
                node.onMouseDown = function (e, localPos, canvas) {
                    if (this.h4_arrow_rects) {
                        const l = this.h4_arrow_rects.left;
                        const r = this.h4_arrow_rects.right;
                        if (l && localPos[0] > l[0] && localPos[0] < l[0] + l[2] &&
                            localPos[1] > l[1] && localPos[1] < l[1] + l[3]) {
                            if (this.h4_active_preview_index > 0) {
                                this.h4_active_preview_index--;
                                app.graph?.setDirtyCanvas(true, true);
                            }
                            return true;
                        }
                        if (r && localPos[0] > r[0] && localPos[0] < r[0] + r[2] &&
                            localPos[1] > r[1] && localPos[1] < r[1] + r[3]) {
                            if (this.h4_active_preview_index < this.h4_images.length - 1) {
                                this.h4_active_preview_index++;
                                app.graph?.setDirtyCanvas(true, true);
                            }
                            return true;
                        }
                    }

                    if (this.h4_strip_rects) {
                        for (let i = 0; i < this.h4_strip_rects.length; i++) {
                            const r = this.h4_strip_rects[i];
                            if (localPos[0] > r[0] && localPos[0] < r[0] + r[2] &&
                                localPos[1] > r[1] && localPos[1] < r[1] + r[3]) {
                                this.h4_active_preview_index = i;
                                app.graph?.setDirtyCanvas(true, true);
                                return true;
                            }
                        }
                    }

                    if (originalMouseDown) return originalMouseDown.apply(this, arguments);
                    return false;
                };

                const originalDblClick = node.onDblClick;
                node.onDblClick = function (e, localPos, canvas) {
                    if (this.h4_preview_rect) {
                        const r = this.h4_preview_rect;
                        if (localPos[0] > r[0] && localPos[0] < r[0] + r[2] &&
                            localPos[1] > r[1] && localPos[1] < r[1] + r[3]) {
                            if (this.h4_images && this.h4_images.length > 0) {
                                openLightbox(this.h4_images, this.h4_active_preview_index || 0);
                                return true;
                            }
                        }
                    }
                    if (originalDblClick) return originalDblClick.apply(this, arguments);
                };

                const originalOnResize = node.onResize;
                node.onResize = function () {
                    if (originalOnResize) originalOnResize.apply(this, arguments);
                    this.properties = this.properties || {};
                    this.properties._user_resized = true;
                };

                const imageWidgetsFinal = node.widgets.filter(w => w.name && w.name.startsWith("image_"));
                imageWidgetsFinal.forEach(w => {
                    const origCb = w.callback;
                    w.callback = function () {
                        if (origCb) origCb.apply(this, arguments);
                        refreshLayout();
                    };
                });

                const loadModeWidgetFinal = node.widgets.find(w => w.name === "load_mode");
                if (loadModeWidgetFinal) {
                    const origModeCb = loadModeWidgetFinal.callback;
                    loadModeWidgetFinal.callback = function () {
                        if (origModeCb) origModeCb.apply(this, arguments);
                        refreshLayout();
                    };
                }

                refreshLayout();
            }

            const origOnConfigure = nodeType.prototype.onConfigure;
            nodeType.prototype.onConfigure = function (info) {
                if (origOnConfigure) origOnConfigure.apply(this, arguments);
                initNode(this);
            };

            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                if (onNodeCreated) onNodeCreated.apply(this, arguments);
                const node = this;
                node.is_h4_loader = true;
                node.size[0] = 440;
                node.size[1] = node.computeSize()[1] + 100;
                requestAnimationFrame(() => initNode(node));
            };
        }
    }
});