import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

/*
    h4 - Forge_Mask (v24.6.0) - THE INTELLIGENT SEAL
    -------------------------------------------
    - FIXED: 'SEND MASK' now automatically calls commitLasso() if points are pending.
    - AUTO-CLOSE: Switching tools now automatically seals active lasso paths.
    - FEEDBACK: Increased opacity of confirmed mask pixels for better visual validation.
    - RECOVERY: Maintains v24.5 dynamic slider and stable image pipeline.
*/

const COLORS = {
    bg: "#151515", accent: "#00f2ff", text: "#fff",
    dim: "#444", border: "#252525", danger: "#ff3333",
    btn_bg: "rgba(28, 28, 28, 0.8)",
    cyan_glow: "rgba(0, 242, 255, 0.4)",
    tooltip_bg: "rgba(0,0,0,0.9)", tooltip_text: "#fff"
};

app.registerExtension({
    name: "h4.ForgeMaskV24_6",
    async nodeCreated(node) {
        if (node.comfyClass !== "H4_ForgeMask") return;

        node.setSize([850, 600]);
        node.color = COLORS.bg;
        node.serialize_widgets = true;
        node.drawWidgets = () => false;

        node.h4_state = {
            image: null,
            maskCanvas: document.createElement("canvas"),
            maskCtx: null,
            isDrawing: false, lastX: 0, lastY: 0,
            brushSize: 40, brushShape: "circle", mode: "brush",
            lassoPoints: [],
            mousePos: [0, 0],
            hover_id: null, active_click_id: null, debug_click: null,
            load_error: null,
            isScrubbing: false
        };
        node.h4_state.maskCtx = node.h4_state.maskCanvas.getContext("2d");

        const exorcize = () => {
            node.widgets?.forEach(w => {
                if (w.inputEl) w.inputEl.remove();
                w.type = "converted-widget";
                w.computeSize = () => [0, -4];
                w.draw = () => false;
                w.label = "";
                if (w.name === "mask_blur" && !w.value) w.value = 4;
                if (w.name === "mask_strength" && !w.value) w.value = 1.0;
                if (w.name === "mask_expansion" && !w.value) w.value = 0;
                w.hidden = true;
            });
        };
        exorcize();
        setTimeout(exorcize, 500);

        const setImg = (data) => {
            if (!data) return;
            const name = typeof data === "string" ? data : data.name;
            const sub = (data && data.subfolder) ? `&subfolder=${encodeURIComponent(data.subfolder)}` : "";
            const type = (data && data.type) ? `&type=${data.type}` : "&type=input";
            const img = new Image();
            img.onload = () => {
                node.h4_state.load_error = null;
                node.h4_state.image = img;
                node.h4_state.maskCanvas.width = img.width;
                node.h4_state.maskCanvas.height = img.height;
                node.h4_state.maskCtx = node.h4_state.maskCanvas.getContext("2d");
                node._last = name;
                node.setDirtyCanvas(true);
            };
            img.onerror = () => { node.h4_state.load_error = "LOAD FAILED"; node.setDirtyCanvas(true); };
            img.src = api.apiURL(`/view?filename=${encodeURIComponent(name)}${sub}${type}`);
        };

        const getRects = () => {
            const w = node.size[0], h = node.size[1];
            const header = 40;
            const sliderY = 280;
            const sliderH = h - sliderY - 30;
            return {
                rail: { x: 0, y: header, w: 70, h: h - header },
                hud: { x: w - 210, y: header, w: 210, h: h - header },
                canvas: { x: 80, y: header + 20, w: w - 300, h: h - header - 60 },
                loadBtn: { x: w - 195, y: header + 50, w: 180, h: 32 },
                clearBtn: { x: w - 195, y: header + 95, w: 180, h: 32 },
                sendBtn: { x: w - 195, y: h - 75, w: 180, h: 48 },
                slider: { x: 30, y: sliderY, w: 10, h: Math.max(20, sliderH) }
            };
        };

        const commitLasso = () => {
            if (node.h4_state.lassoPoints.length < 3) { node.h4_state.lassoPoints = []; return; }
            const ctx = node.h4_state.maskCtx;
            ctx.fillStyle = "white"; ctx.globalCompositeOperation = "source-over";
            ctx.beginPath(); ctx.moveTo(node.h4_state.lassoPoints[0].x, node.h4_state.lassoPoints[0].y);
            node.h4_state.lassoPoints.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.closePath(); ctx.fill();
            node.h4_state.lassoPoints = [];
            node.setDirtyCanvas(true);
        };

        node.onMouseWheel = null;
        node.onContextMenu = function (e) {
            if (node.h4_state.mode === "lasso" && node.h4_state.lassoPoints.length > 0) { commitLasso(); return false; }
        };

        node.onMouseDown = function (e, pos) {
            const rects = getRects();
            const hit = (target) => pos[0] > target.x && pos[0] < target.x + target.w && pos[1] > target.y && pos[1] < target.y + target.h;
            let h_id = null;
            if (pos[0] < rects.rail.w && pos[1] > 40) {
                if (pos[1] > rects.slider.y - 5) h_id = "slider";
                else {
                    const idx = Math.floor((pos[1] - 60) / 50);
                    h_id = ["brush", "eraser", "lasso", "shape"][idx];
                }
            } else if (hit(rects.loadBtn)) h_id = "load";
            else if (hit(rects.clearBtn)) h_id = "clear";
            else if (hit(rects.sendBtn)) h_id = "send";
            else if (hit(rects.canvas) && node.h4_state.image) h_id = "canvas";

            if (!h_id) return false;
            node.h4_state.active_click_id = h_id;
            node.h4_state.debug_click = { x: pos[0], y: pos[1], t: Date.now() };

            if (h_id === "slider") {
                node.h4_state.isScrubbing = true;
                const t = Math.max(0, Math.min(1, (pos[1] - rects.slider.y) / rects.slider.h));
                node.h4_state.brushSize = Math.floor(2 + (510 * t));
                node.setDirtyCanvas(true); return true;
            }
            if (h_id === "brush" || h_id === "eraser" || h_id === "lasso") {
                if (node.h4_state.mode === "lasso") commitLasso(); // Auto-seal on tool switch
                node.h4_state.mode = h_id; node.setDirtyCanvas(true); return true;
            }
            if (h_id === "shape") {
                node.h4_state.brushShape = node.h4_state.brushShape === "circle" ? "square" : "circle";
                node.setDirtyCanvas(true); return true;
            }
            if (h_id === "load") {
                const input = document.createElement("input"); input.type = "file"; input.accept = "image/*";
                input.onchange = async (ev) => {
                    const f = ev.target.files[0]; if (!f) return;
                    const fd = new FormData(); fd.append("image", f);
                    const resp = await api.fetchApi("/upload/image", { method: "POST", body: fd });
                    if (resp.ok) { const d = await resp.json(); setImg(d); }
                };
                input.click(); return true;
            }
            if (h_id === "clear") {
                node.h4_state.maskCtx.clearRect(0, 0, node.h4_state.maskCanvas.width, node.h4_state.maskCanvas.height);
                node.h4_state.lassoPoints = [];
                const w = node.widgets.find(x => x.name === "mask_data");
                if (w) w.value = ""; // Explicitly clear the vault
                node.setDirtyCanvas(true); return true;
            }
            if (h_id === "send") {
                if (node.h4_state.lassoPoints.length > 0) commitLasso();
                const w = node.widgets.find(x => x.name === "mask_data");
                if (w) {
                    w.value = node.h4_state.maskCanvas.toDataURL("image/png");
                    // Persistence is key: No more auto-clear here.
                    // Let the user trigger the queue naturally or via app.queuePrompt()
                    app.queuePrompt(); // Trigger a fresh generation immediately
                }
                return true;
            }
            if (h_id === "canvas") {
                const img = node.h4_state.image;
                const ratio = Math.min(rects.canvas.w / img.width, rects.canvas.h / img.height);
                const dw = img.width * ratio, dh = img.height * ratio;
                const dx = rects.canvas.x + (rects.canvas.w - dw) / 2, dy = rects.canvas.y + (rects.canvas.h - dh) / 2;
                const lx = (pos[0] - dx) * (img.width / dw), ly = (pos[1] - dy) * (img.height / dh);
                if (node.h4_state.mode === "lasso") { node.h4_state.lassoPoints.push({ x: lx, y: ly }); node.setDirtyCanvas(true); return true; }
                node.h4_state.isDrawing = true; node.h4_state.lastX = lx; node.h4_state.lastY = ly;
                const ctx = node.h4_state.maskCtx; ctx.fillStyle = node.h4_state.mode === "eraser" ? "black" : "white";
                ctx.globalCompositeOperation = node.h4_state.mode === "eraser" ? "destination-out" : "source-over";
                if (node.h4_state.brushShape === "circle") {
                    ctx.beginPath(); ctx.arc(lx, ly, node.h4_state.brushSize / 2, 0, Math.PI * 2); ctx.fill();
                } else {
                    ctx.fillRect(lx - node.h4_state.brushSize / 2, ly - node.h4_state.brushSize / 2, node.h4_state.brushSize, node.h4_state.brushSize);
                }
                node.setDirtyCanvas(true); return true;
            }
            return true;
        };

        node.onMouseMove = function (e, pos) {
            const rects = getRects();
            const hit = (target) => pos[0] > target.x && pos[0] < target.x + target.w && pos[1] > target.y && pos[1] < target.y + target.h;
            node.h4_state.mousePos = pos;
            if (node.h4_state.isScrubbing) {
                const t = Math.max(0, Math.min(1, (pos[1] - rects.slider.y) / rects.slider.h));
                node.h4_state.brushSize = Math.floor(2 + (510 * t));
                node.setDirtyCanvas(true); return;
            }
            if (node.h4_state.isDrawing && node.h4_state.image) {
                const img = node.h4_state.image;
                const ratio = Math.min(rects.canvas.w / img.width, rects.canvas.h / img.height);
                const dw = img.width * ratio, dh = img.height * ratio;
                const dx = rects.canvas.x + (rects.canvas.w - dw) / 2, dy = rects.canvas.y + (rects.canvas.h - dh) / 2;
                const lx = (pos[0] - dx) * (img.width / dw), ly = (pos[1] - dy) * (img.height / dh);
                const d = Math.hypot(lx - node.h4_state.lastX, ly - node.h4_state.lastY);
                const steps = Math.max(1, Math.ceil(d / (node.h4_state.brushSize / 8)));
                const ctx = node.h4_state.maskCtx; ctx.fillStyle = node.h4_state.mode === "eraser" ? "black" : "white";
                ctx.globalCompositeOperation = node.h4_state.mode === "eraser" ? "destination-out" : "source-over";
                for (let i = 0; i <= steps; i++) {
                    const cx = node.h4_state.lastX + (lx - node.h4_state.lastX) * (i / steps);
                    const cy = node.h4_state.lastY + (ly - node.h4_state.lastY) * (i / steps);
                    if (node.h4_state.brushShape === "circle") {
                        ctx.beginPath(); ctx.arc(cx, cy, node.h4_state.brushSize / 2, 0, Math.PI * 2); ctx.fill();
                    } else {
                        ctx.fillRect(cx - node.h4_state.brushSize / 2, cy - node.h4_state.brushSize / 2, node.h4_state.brushSize, node.h4_state.brushSize);
                    }
                }
                node.h4_state.lastX = lx; node.h4_state.lastY = ly;
                node.setDirtyCanvas(true);
            }
            let h = null;
            if (pos[0] < rects.rail.w && pos[1] > 40) {
                if (pos[1] > rects.slider.y - 10) h = "slider";
                else {
                    const idx = Math.floor((pos[1] - 60) / 50);
                    h = ["brush", "eraser", "lasso", "shape"][idx];
                }
            } else if (hit(rects.loadBtn)) h = "load";
            else if (hit(rects.clearBtn)) h = "clear";
            else if (hit(rects.sendBtn)) h = "send";
            else if (hit(rects.canvas)) h = "draw_area";
            if (h !== node.h4_state.hover_id) { node.h4_state.hover_id = h; node.setDirtyCanvas(true); }
            else if (h === "draw_area") { node.setDirtyCanvas(true); }
        };

        node.onMouseUp = function () { node.h4_state.isDrawing = false; node.h4_state.isScrubbing = false; node.h4_state.active_click_id = null; };

        node.onDrawForeground = function (ctx) {
            if (this.flags.collapsed) return;
            const ds = app.canvas.ds || 1.0;
            const rects = getRects();
            const pos = this.h4_state.mousePos;

            ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, this.size[0], this.size[1]);
            if (ds < 0.35) {
                ctx.fillStyle = COLORS.accent; ctx.font = "900 80px sans-serif"; ctx.textAlign = "center";
                ctx.fillText("H4", this.size[0] / 2, this.size[1] / 2 + 30); return;
            }

            const drawHoloBtn = (r, label, id, is_tool = false) => {
                const hover = this.h4_state.hover_id === id;
                const active = this.h4_state.active_click_id === id;
                const selected = is_tool && (this.h4_state.mode === id);
                const ox = active ? 2 : 0, oy = active ? 2 : 0;
                ctx.save();
                if (active || selected) { ctx.shadowColor = COLORS.accent; ctx.shadowBlur = 10; }
                ctx.fillStyle = active ? "#111" : COLORS.btn_bg;
                ctx.beginPath(); ctx.roundRect(r.x + ox, r.y + oy, r.w, r.h, 4); ctx.fill();
                ctx.strokeStyle = (hover || selected || active) ? COLORS.accent : COLORS.cyan_glow;
                ctx.lineWidth = (selected || active) ? 2 : 1; ctx.stroke();
                ctx.restore();
                ctx.fillStyle = (hover || selected || active) ? COLORS.accent : COLORS.dim;
                ctx.font = is_tool ? "bold 18px sans-serif" : "bold 10px sans-serif";
                ctx.textAlign = "center"; ctx.textBaseline = "middle";
                ctx.fillText(label, r.x + r.w / 2 + ox, r.y + r.h / 2 + oy);
            };

            ["B", "E", "L", "S"].forEach((id, i) => {
                const names = ["brush", "eraser", "lasso", "shape"];
                drawHoloBtn({ x: 19, y: 70 + (i * 50), w: 32, h: 32 }, id, names[i], true);
            });

            ctx.save();
            ctx.fillStyle = "rgba(0, 242, 255, 0.1)"; ctx.beginPath(); ctx.roundRect(rects.slider.x, rects.slider.y, rects.slider.w, rects.slider.h, 5); ctx.fill();
            const tSize = (this.h4_state.brushSize - 2) / 510;
            const handleY = rects.slider.y + (rects.slider.h * tSize);
            ctx.fillStyle = COLORS.accent; ctx.shadowColor = COLORS.accent; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.arc(rects.slider.x + 5, handleY, 6, 0, Math.PI * 2); ctx.fill();
            ctx.restore();

            ctx.save();
            ctx.fillStyle = COLORS.accent; ctx.font = "900 11px monospace"; ctx.textAlign = "center";
            ctx.shadowColor = COLORS.accent; ctx.shadowBlur = 4;
            ctx.fillText(this.h4_state.brushSize + "PX", 35, 60);
            ctx.font = "8px monospace";
            ctx.fillText(this.h4_state.brushShape.toUpperCase(), 35, 265);
            ctx.restore();

            ctx.fillStyle = "#000"; ctx.fillRect(rects.canvas.x, rects.canvas.y, rects.canvas.w, rects.canvas.h);
            ctx.strokeStyle = COLORS.border; ctx.strokeRect(rects.canvas.x, rects.canvas.y, rects.canvas.w, rects.canvas.h);

            if (this.h4_state.load_error) {
                ctx.fillStyle = COLORS.danger; ctx.font = "bold 20px monospace"; ctx.textAlign = "center";
                ctx.fillText(this.h4_state.load_error, rects.canvas.x + rects.canvas.w / 2, rects.canvas.y + rects.canvas.h / 2);
            }

            if (this.h4_state.image) {
                const img = this.h4_state.image;
                const ratio = Math.min(rects.canvas.w / img.width, rects.canvas.h / img.height);
                const dw = img.width * ratio, dh = img.height * ratio;
                const dx = rects.canvas.x + (rects.canvas.w - dw) / 2, dy = rects.canvas.y + (rects.canvas.h - dh) / 2;
                ctx.drawImage(img, dx, dy, dw, dh);
                if (this.h4_state.lassoPoints.length > 0) {
                    ctx.save(); ctx.strokeStyle = COLORS.accent; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath();
                    this.h4_state.lassoPoints.forEach((p, i) => {
                        const px = dx + (p.x * (dw / img.width)), py = dy + (p.y * (dh / img.height));
                        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                    });
                    ctx.stroke(); ctx.restore();
                }
                ctx.save();
                ctx.globalAlpha = 0.65; // High-fidelity visibility
                ctx.drawImage(this.h4_state.maskCanvas, dx, dy, dw, dh);
                ctx.restore();

                if (pos[0] > rects.canvas.x && pos[0] < rects.canvas.x + rects.canvas.w && pos[1] > rects.canvas.y && pos[1] < rects.canvas.y + rects.canvas.h) {
                    ctx.save(); ctx.strokeStyle = COLORS.accent; ctx.lineWidth = 1; ctx.setLineDash([2, 2]);
                    const bR = (this.h4_state.brushSize / 2) * ratio;
                    if (this.h4_state.brushShape === "circle") { ctx.beginPath(); ctx.arc(pos[0], pos[1], bR, 0, Math.PI * 2); ctx.stroke(); }
                    else { ctx.strokeRect(pos[0] - bR, pos[1] - bR, bR * 2, bR * 2); }
                    ctx.restore();
                }
            } else if (!this.h4_state.load_error) {
                ctx.fillStyle = "#333"; ctx.font = "italic 11px sans-serif"; ctx.textAlign = "center";
                ctx.fillText("WAITING FOR IMAGE...", rects.canvas.x + rects.canvas.w / 2, rects.canvas.y + rects.canvas.h / 2);
            }

            ctx.fillStyle = COLORS.dim; ctx.font = "bold 9px sans-serif"; ctx.textAlign = "left";
            ctx.fillText("SETTINGS", rects.hud.x + 20, rects.hud.y + 25);
            drawHoloBtn(rects.loadBtn, "LOAD IMAGE", "load");
            drawHoloBtn(rects.clearBtn, "CLEAR MASK", "clear");
            drawHoloBtn(rects.sendBtn, "SEND MASK", "send");

            if (this.h4_state.debug_click) {
                const elapsed = Date.now() - this.h4_state.debug_click.t;
                if (elapsed < 450) {
                    const t = elapsed / 450;
                    ctx.save(); ctx.strokeStyle = COLORS.accent; ctx.globalAlpha = (1 - t) * 0.4;
                    ctx.beginPath(); ctx.arc(this.h4_state.debug_click.x, this.h4_state.debug_click.y, 3 + (t * 25), 0, Math.PI * 2); ctx.stroke();
                    ctx.restore(); this.setDirtyCanvas(true);
                }
            }
            if (this.h4_state.hover_id) {
                const tips = { brush: "BRUSH: Paint mask.", eraser: "ERASER: Fix mistakes.", lasso: "LASSO: Point-path. (Right-Click or Switch to SEAL)", shape: "SHAPE: Toggle Circle/Square.", load: "LOAD: Manual image input.", clear: "CLEAR: Wipe mask data.", send: "SEND MASK: Auto-seals & Captures.", slider: "SIZE SCRUBBER: Click & Drag to resize tools." };
                const msg = tips[this.h4_state.hover_id];
                if (msg) {
                    ctx.font = "10px sans-serif"; const tw = ctx.measureText(msg).width + 15;
                    ctx.fillStyle = COLORS.tooltip_bg; ctx.fillRect(this.size[0] / 2 - tw / 2, this.size[1] - 35, tw, 20);
                    ctx.fillStyle = COLORS.tooltip_text; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(msg, this.size[0] / 2, this.size[1] - 25);
                }
            }
            if (Date.now() % 1500 < 100) sync();
        };

        const sync = () => {
            if (!node.inputs?.[0]?.link) return;
            const link = app.graph.links[node.inputs[0].link];
            if (!link) return;
            const origin = app.graph.getNodeById(link.origin_id);
            if (origin) {
                const imgData = (origin.imgs ? origin.imgs[link.origin_slot] : null) || (origin.images ? origin.images[link.origin_slot] : null);
                const currentName = typeof imgData === "string" ? imgData : imgData?.name;
                if (currentName && currentName !== node._last) { setImg(imgData); }
            }
        };

        const onExec = (e) => { if (node.inputs?.[0]?.link && app.graph.links[node.inputs[0].link]?.origin_id == e.detail.node) sync(); };
        api.addEventListener("executed", onExec);
        node.onRemoved = () => api.removeEventListener("executed", onExec);
    }
});
