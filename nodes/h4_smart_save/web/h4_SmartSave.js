import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

/*
    h4 - SmartSave (Unified Interaction Kernel v24.14.38)
    ---------------------------------------------------
    - NESTED DRAWER SYSTEM: Parameters drawer (P) now spawns a secondary "Node Detail" drawer.
    - DYNAMIC PORTAL LINKING: Clicking a node in the P-list slides out a dedicated detail HUD.
    - PARAMETER CRAWLER: Recursive graph traversal with deep inspection support.
    - VIEWPORT SOVEREIGNTY: Aggressive DOM cleanup for off-screen/zoomed-out nodes.
    - KINETIC RESCALE: Node is resizable (Min: 750x500).
    - SHADOW BANISHMENT: Widget DOM elements relocated to -9999px.
    - LOCKED PINEAPPLE STATE.
*/

const COLORS = {
    bg: "#151515", accent: "#00f2ff", text: "#fff",
    dim: "#666", border: "#252525", danger: "#ff3333",
    btn_bg: "rgba(28, 28, 28, 0.8)",
    cyan_glow: "rgba(0, 242, 255, 0.4)",
    save: "#00ff00", preview: "#ffd700"
};

const MIN_SIZE = [750, 500];

const getGrid = (node) => {
    const w = Math.max(MIN_SIZE[0], node.size[0]);
    const h = Math.max(MIN_SIZE[1], node.size[1]);
    const cx = w / 2;
    const HUD_Y = 70;

    return {
        w, h,
        pts: {
            prefix_box: { x: cx - 335, y: HUD_Y - 12, w: 160, h: 24 },
            toggle_box: { x: cx - 165, y: HUD_Y - 10, w: 50, h: 20 },
            label_text: { x: cx - 100, y: HUD_Y },
            path_box: { x: cx + 110, y: HUD_Y - 12, w: 160, h: 24 },

            btn_p: { x: w - 70, y: 150, w: 45, h: 45 },
            btn_m: { x: 25, y: 150, w: 45, h: 45 },
            btn_h: { x: 25, y: h - 70, w: 45, h: 45 },

            btn_prev: { x: 80, y: 0, w: 35, h: 70 },
            btn_next: { x: w - 120, y: 0, w: 35, h: 70 },

            preview_area: { x: 15, y: 120, w: w - 100, h: h - 180 },
            drawer_p: { x: w + 15, y: 80, w: 340, h: h - 100 },
            drawer_m: { x: -355, y: 80, w: 340, h: h - 100 },
            drawer_detail: { x: w + 15 + 348, y: 80, w: 340, h: h - 100 }
        }
    };
};

class SmartSaveUI {
    constructor(node) {
        this.node = node; this.history = []; this.active_tab = "NONE";
        this.thumb_imgs = {}; this.selected_idx = -1;
        this.footer_anim = 0; this.params_anim = 0; this.meta_anim = 0; this.detail_anim = 0;
        this.scroll_idx = 0; this.hover_id = null; this.active_click_id = null;
        this.last_click_time = 0; this.last_click_idx = -1;
        this.is_lightbox = false;
        this.last_crawl_time = 0;
        this.selected_node_id = null;
        this.fetchHistory();
    }
    async fetchHistory() {
        try {
            const res = await api.fetchApi("/h4/smart_save/history");
            if (res.ok) { this.history = await res.json(); this.node.setDirtyCanvas(true); }
        } catch (e) { }
    }

    crawlWorkflow() {
        const now = Date.now();
        if (now - this.last_crawl_time < 500) return;
        this.last_crawl_time = now;

        const params = [];
        const visited = new Set();
        const queue = [this.node];

        while (queue.length > 0) {
            const node = queue.shift();
            if (!node || visited.has(node.id)) continue;
            visited.add(node.id);

            if (node.widgets && node.id !== this.node.id) {
                const node_params = [];
                node.widgets.forEach(w => {
                    if (w.name && !w.name.startsWith("_") && w.type !== "button" && w.type !== "converted-widget") {
                        let val = w.value;
                        if (typeof val === "number") val = Number.isInteger(val) ? val : val.toFixed(3);
                        node_params.push({ name: w.name, val: val });
                    }
                });
                if (node_params.length > 0) {
                    params.push({ title: node.title || node.type || "Untitled Node", id: node.id, items: node_params });
                }
            }
            if (node.inputs) {
                node.inputs.forEach(input => {
                    if (input.link != null) {
                        const link = app.graph.links[input.link];
                        if (link) {
                            const originNode = app.graph.getNodeById(link.origin_id);
                            if (originNode) queue.push(originNode);
                        }
                    }
                });
            }
        }

        const drawer = this.node.__h4_core_drawer;
        if (!drawer) return;

        let html = `<div style="color:#00f2ff; margin:20px; font-weight:900; border-bottom:1px solid #333; padding-bottom:10px; pointer-events:none;">h4 // PARAMETERS</div>`;
        if (params.length === 0) html += `<div style="color:#444; margin:40px 20px; font-family:monospace; font-style:italic;">No upstream parameters found.</div>`;
        else {
            params.forEach(p => {
                html += `
                    <div class="h4-param-card" data-node-id="${p.id}" style="margin:0 15px 15px 15px; background:rgba(20,20,20,0.5); border:1px solid #222; border-radius:4px; overflow:hidden; cursor:pointer; transition:border-color 0.2s;">
                        <div style="background:#222; color:#aaa; font-size:10px; padding:4px 8px; font-family:monospace; border-bottom:1px solid #333; pointer-events:none;">${p.title} <span style="color:#555;float:right;">ID:${p.id}</span></div>
                        <div style="padding:8px; pointer-events:none;">
                            ${p.items.slice(0, 3).map(it => `
                                <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-family:monospace; font-size:11px;">
                                    <span style="color:#444;">${it.name}</span>
                                    <span style="color:#00f2ff; text-align:right; max-width:60%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${it.val}</span>
                                </div>
                            `).join("")}
                            ${p.items.length > 3 ? `<div style="color:#333; font-size:9px; text-align:center;">+ ${p.items.length - 3} MORE</div>` : ""}
                        </div>
                    </div>
                `;
            });
        }
        drawer.innerHTML = html;
        drawer.querySelectorAll(".h4-param-card").forEach(card => {
            card.onmouseenter = () => card.style.borderColor = COLORS.accent;
            card.onmouseleave = () => card.style.borderColor = "#222";
            card.onclick = () => {
                const id = card.getAttribute("data-node-id");
                this.selected_node_id = parseInt(id);
                this.showNodeDetails(this.selected_node_id);
                this.node.setDirtyCanvas(true);
            };
        });
    }

    showNodeDetails(nodeId) {
        const node = app.graph.getNodeById(nodeId);
        const detailDrawer = this.node.__h4_detail_drawer;
        if (!node || !detailDrawer) return;

        let html = `<div style="color:#00f2ff; margin:20px; font-weight:900; border-bottom:1px solid #333; padding-bottom:10px; pointer-events:none;">h4 // DETAIL // ${node.id}</div>`;
        html += `<div style="padding:0 20px 20px 20px;">
                    <div style="color:#aaa; font-size:14px; margin-bottom:20px; font-family:monospace;">${node.title || node.type}</div>`;
        if (node.widgets) {
            node.widgets.forEach(w => {
                if (w.name && !w.name.startsWith("_") && w.type !== "button") {
                    html += `
                        <div style="margin-bottom:15px; border-left:2px solid #333; padding-left:10px;">
                            <div style="font-size:9px; color:#555; margin-bottom:4px; text-transform:uppercase;">${w.name}</div>
                            <div style="color:#00f2ff; font-family:monospace; font-size:12px; word-break:break-all;">${w.value}</div>
                        </div>
                    `;
                }
            });
        }
        html += `</div>`;
        detailDrawer.innerHTML = html;
    }
}

const banishElement = (el) => {
    if (!el) return;
    el.style.position = "fixed"; el.style.top = "-9999px"; el.style.left = "-9999px";
    el.style.width = "0"; el.style.height = "0"; el.style.opacity = "0";
    el.style.pointerEvents = "none"; el.style.overflow = "hidden"; el.style.zIndex = "-1";
    if (el.parentNode) el.remove();
};

const cloakWidget = (w) => {
    w.hidden = true; w.draw = () => { }; w.computeSize = () => [0, -4];
    banishElement(w.inputEl); banishElement(w.textareaEl); if (w.element) banishElement(w.element);
};

app.registerExtension({
    name: "h4.SmartSave.Core",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== "H4_SmartSave") return;

        ["onNodeCreated", "onRemoved", "onMouseDown", "onDrawForeground", "onMouseMove", "onMouseUp", "onResize"].forEach(m => delete nodeType.prototype[m]);

        nodeType.prototype.onNodeCreated = function () {
            this.size = [750, 500]; this.resizable = true;
            this.h4_ui = new SmartSaveUI(this);

            const initEl = (tag, cls) => {
                const el = document.createElement(tag); el.className = cls;
                el.style.position = "fixed"; el.style.zIndex = "10";
                el.style.display = "none";
                el.style.background = "rgba(10,10,10,0.98)"; el.style.border = "1px solid #333";
                el.style.color = "#00f2ff"; el.style.padding = "4px 8px"; el.style.fontFamily = "monospace"; el.style.fontSize = "12px";
                return el;
            };
            this.__h4_core_prefix = initEl("input", "h4-grid-prefix");
            this.__h4_core_path = initEl("input", "h4-grid-path");
            this.__h4_core_drawer = initEl("div", "h4-grid-drawer");
            this.__h4_core_drawer.style.overflowY = "auto";
            this.__h4_detail_drawer = initEl("div", "h4-grid-detail");
            this.__h4_detail_drawer.style.overflowY = "auto";
            this.__h4_meta_drawer = initEl("div", "h4-grid-meta");
            this.__h4_meta_drawer.style.padding = "20px";
            this.__h4_meta_drawer.style.overflowY = "auto";
            this.__h4_meta_drawer.style.overflowX = "hidden";
            this.__h4_meta_drawer.style.boxSizing = "border-box";
            this.__h4_meta_drawer.innerHTML = `
                <div style="color:#00f2ff; margin-bottom:15px; font-weight:900; border-bottom:1px solid #333; padding-bottom:5px; pointer-events:none;">h4 // METADATA</div>
                <div style="font-size:9px; color:#555; margin-bottom:4px; pointer-events:none;">AUTHOR</div>
                <input class="h4-meta-author" style="width:100% !important; background:#111; border:1px solid #333; color:#fff; font-family:monospace; margin-bottom:15px; padding:5px; box-sizing:border-box;"/>
                <div style="font-size:9px; color:#555; margin-bottom:4px; pointer-events:none;">NOTES / RAW JSON</div>
                <textarea class="h4-meta-raw" style="width:100% !important; height:180px; background:#111; border:1px solid #333; color:#aaa; font-family:monospace; font-size:10px; padding:5px; resize:none; box-sizing:border-box;"></textarea>
            `;

            this.__h4_lightbox = document.createElement("div");
            Object.assign(this.__h4_lightbox.style, {
                position: "fixed", top: "0", left: "0", width: "100%", height: "100%",
                background: "rgba(0,0,0,0.95)", zIndex: "9999", display: "none",
                flexDirection: "column", alignItems: "center", justifyContent: "center",
                backdropFilter: "blur(40px)"
            });
            this.__h4_lightbox.innerHTML = `
                <div style="position:absolute; top:20px; right:20px; color:#fff; font-size:30px; cursor:pointer;" class="btn-close">×</div>
                <div style="position:absolute; left:40px; color:#00f2ff; font-size:50px; cursor:pointer;" class="btn-prev">‹</div>
                <div style="position:absolute; right:40px; color:#00f2ff; font-size:50px; cursor:pointer;" class="btn-next">›</div>
                <img style="max-width:90%; max-height:90%; border:1px solid #333; box-shadow:0 0 50px rgba(0,242,255,0.2)"/>
                <div style="color:#555; font-family:monospace; margin-top:20px;" class="info">FILE_INF</div>
            `;
            this.__h4_lightbox.onclick = (e) => {
                const ui = this.h4_ui;
                if (e.target.classList.contains("btn-close")) { this.__h4_lightbox.style.display = "none"; ui.is_lightbox = false; }
                else if (e.target.classList.contains("btn-prev")) { ui.selected_idx = Math.max(0, ui.selected_idx - 1); this.__h4_update_lightbox(); }
                else if (e.target.classList.contains("btn-next")) { ui.selected_idx = Math.min(ui.history.length - 1, ui.selected_idx + 1); this.__h4_update_lightbox(); }
            };
            this.__h4_update_lightbox = () => {
                const item = this.h4_ui.history[this.h4_ui.selected_idx] || { filename: "UNKNOWN" };
                const url = api.apiURL(`/h4/thumbnail?filename=${encodeURIComponent(item.filename)}&subfolder=${encodeURIComponent(item.subfolder)}&type=${item.type}&full=true`);
                this.__h4_lightbox.querySelector("img").src = url;
                this.__h4_lightbox.querySelector(".info").innerText = `${item.filename} // ${item.type.toUpperCase()}`;
            };
            document.body.appendChild(this.__h4_lightbox);

            const bindWidgets = () => {
                if (!this.widgets || this.widgets.length === 0) return false;
                this.widgets.forEach(w => {
                    const name = w.name;
                    if (name === "filename_prefix") {
                        this.__h4_core_prefix.value = w.value || "h4_";
                        this.__h4_core_prefix.oninput = () => w.value = this.__h4_core_prefix.value;
                    }
                    else if (name === "output_path") {
                        this.__h4_core_path.value = w.value || "";
                        this.__h4_core_path.oninput = () => w.value = this.__h4_core_path.value;
                    }
                    else if (name === "save_mode") { this.h4_save_mode_ref = w; }
                    else if (name === "custom_json") {
                        try {
                            const data = JSON.parse(w.value || "{}");
                            const input = this.__h4_meta_drawer.querySelector(".h4-meta-author");
                            const raw = this.__h4_meta_drawer.querySelector(".h4-meta-raw");
                            if (input && !input.matches(":focus")) input.value = data.author || "";
                            if (raw && !raw.matches(":focus")) raw.value = JSON.stringify(data, null, 2);
                            const update = () => {
                                try {
                                    let current;
                                    if (document.activeElement === raw) current = JSON.parse(raw.value);
                                    else { current = JSON.parse(w.value || "{}"); current.author = input.value; }
                                    w.value = JSON.stringify(current);
                                } catch (e) { }
                            };
                            input.oninput = update; raw.oninput = update;
                        } catch (e) { }
                    }
                    cloakWidget(w);
                });
                return true;
            };

            this.drawWidgets = function () { };
            bindWidgets();
            setTimeout(() => bindWidgets(), 100); setTimeout(() => bindWidgets(), 500); setTimeout(() => bindWidgets(), 1500);
            api.addEventListener("executed", (e) => { if (e.detail.node === this.id.toString()) this.h4_ui.fetchHistory(); });
        };

        nodeType.prototype.resizable = true;

        nodeType.prototype.onResize = function (size) {
            if (size[0] < MIN_SIZE[0]) size[0] = MIN_SIZE[0];
            if (size[1] < MIN_SIZE[1]) size[1] = MIN_SIZE[1];
        };

        nodeType.prototype.onRemoved = function () {
            [this.__h4_core_prefix, this.__h4_core_path, this.__h4_core_drawer, this.__h4_detail_drawer, this.__h4_meta_drawer, this.__h4_lightbox].forEach(el => {
                if (el && el.parentNode) el.remove();
            });
        };

        nodeType.prototype.onMouseDown = function (e, pos) {
            const mesh = getGrid(this); const pts = mesh.pts;
            const px = pos[0]; const py = pos[1];
            const checkHit = (id) => {
                const p = pts["btn_" + id] || pts[id + "_box"];
                if (id === "p" || id === "m" || id === "h") {
                    const pb = pts["btn_" + id];
                    return px >= pb.x - 25 && px <= pb.x + pb.w + 25 && py >= pb.y - 25 && py <= pb.y + pb.h + 25;
                }
                if (id === "preview_area") return px >= pts.preview_area.x && px <= pts.preview_area.x + pts.preview_area.w && py >= pts.preview_area.y && py <= pts.preview_area.y + pts.preview_area.h;
                if (!p) return false; return px >= p.x && px <= p.x + p.w && py >= p.y && py <= p.y + p.h;
            };

            if (checkHit("p")) {
                this.h4_ui.active_click_id = "p";
                this.h4_ui.active_tab = this.h4_ui.active_tab === "PARAMETERS" ? "NONE" : "PARAMETERS";
                if (this.h4_ui.active_tab === "PARAMETERS") this.h4_ui.crawlWorkflow();
                else this.h4_ui.selected_node_id = null;
                this.setDirtyCanvas(true); return true;
            }
            if (checkHit("m")) { this.h4_ui.active_click_id = "m"; this.h4_ui.active_tab = this.h4_ui.active_tab === "METADATA" ? "NONE" : "METADATA"; this.setDirtyCanvas(true); return true; }
            if (checkHit("h")) { this.h4_ui.active_click_id = "h"; this.h4_ui.active_tab = this.h4_ui.active_tab === "HISTORY" ? "NONE" : "HISTORY"; this.setDirtyCanvas(true); return true; }
            if (checkHit("toggle")) { this.h4_ui.active_click_id = "toggle"; if (this.h4_save_mode_ref) this.h4_save_mode_ref.value = !(this.h4_save_mode_ref.value); this.setDirtyCanvas(true); return true; }
            if (checkHit("preview_area")) {
                const now = Date.now();
                if (now - this.h4_ui.last_click_time < 350) { this.h4_ui.is_lightbox = true; this.__h4_lightbox.style.display = "flex"; this.__h4_update_lightbox(); }
                this.h4_ui.last_click_time = now; return true;
            }
            if (this.h4_ui.active_tab === "HISTORY") {
                const btn_fy = mesh.h - (110 * this.h4_ui.footer_anim) + 20;
                const checkArrow = (id) => {
                    const p = pts["btn_" + id];
                    return px >= p.x && px <= p.x + p.w && py >= btn_fy && py <= btn_fy + p.h;
                };
                if (checkArrow("prev")) { this.h4_ui.scroll_idx = Math.max(0, this.h4_ui.scroll_idx - 1); this.setDirtyCanvas(true); return true; }
                if (checkArrow("next")) { this.h4_ui.scroll_idx = Math.min(Math.max(0, this.h4_ui.history.length - 5), this.h4_ui.scroll_idx + 1); this.setDirtyCanvas(true); return true; }
                if (py > mesh.h - (110 * this.h4_ui.footer_anim)) {
                    const idx = Math.floor((px - 120) / 105) + this.h4_ui.scroll_idx;
                    if (idx >= 0 && idx < this.h4_ui.history.length) {
                        const now = Date.now();
                        if (now - this.h4_ui.last_click_time < 350 && this.h4_ui.last_click_idx === idx) {
                            this.h4_ui.selected_idx = idx; this.h4_ui.is_lightbox = true;
                            this.__h4_lightbox.style.display = "flex"; this.__h4_update_lightbox();
                        }
                        this.h4_ui.last_click_time = now; this.h4_ui.last_click_idx = idx;
                        this.h4_ui.selected_idx = idx; this.setDirtyCanvas(true); return true;
                    }
                }
            }
            if (px > 0 && px < this.size[0] && py > 0 && py < this.size[1]) return true;
        };

        nodeType.prototype.onMouseMove = function (e, pos) {
            const mesh = getGrid(this); const pts = mesh.pts;
            const px = pos[0]; const py = pos[1];
            const checkHit = (id) => {
                const p = pts["btn_" + id] || pts[id + "_box"];
                if (id === "p" || id === "m" || id === "h") {
                    const pb = pts["btn_" + id];
                    return px >= pb.x - 25 && px <= pb.x + pb.w + 25 && py >= pb.y - 25 && py <= pb.y + pb.h + 25;
                }
                if (!p) return false; return px >= p.x && px <= p.x + p.w && py >= p.y && py <= p.y + p.h;
            };
            let h_id = null;
            if (checkHit("p")) h_id = "p"; else if (checkHit("m")) h_id = "m"; else if (checkHit("h")) h_id = "h"; else if (checkHit("toggle")) h_id = "toggle";
            else if (this.h4_ui.active_tab === "HISTORY") {
                const btn_fy = mesh.h - (110 * this.h4_ui.footer_anim) + 20;
                const checkArrow = (id) => {
                    const p = pts["btn_" + id];
                    return px >= p.x && px <= p.x + p.w && py >= btn_fy && py <= btn_fy + p.h;
                };
                if (checkArrow("prev")) h_id = "prev"; else if (checkArrow("next")) h_id = "next";
            }
            if (h_id !== this.h4_ui.hover_id) { this.h4_ui.hover_id = h_id; this.setDirtyCanvas(true); }
        };

        nodeType.prototype.onMouseUp = function () { this.h4_ui.active_click_id = null; this.setDirtyCanvas(true); };

        nodeType.prototype.onDrawForeground = function (ctx) {
            try {
                this.resizable = true;
                const mesh = getGrid(this); const pts = mesh.pts;
                const scale = app.canvas.ds.scale; const ds = app.canvas.ds;
                const active = this.h4_ui.active_tab; const isSaving = this.h4_save_mode_ref?.value || false;

                if (this.widgets) this.widgets.forEach(cloakWidget);

                const syncGrid = (el, pt, visible) => {
                    if (!el) return;
                    if (!visible || scale < 0.35) { if (el.parentNode) el.remove(); return; }
                    const rb = app.canvas.canvas.getBoundingClientRect();
                    const screenX = (this.pos[0] + pt.x + ds.offset[0]) * scale + rb.left;
                    const screenY = (this.pos[1] + pt.y + ds.offset[1]) * scale + rb.top;
                    const inView = screenX > -1000 && screenX < window.innerWidth + 1000 && screenY > 50 && screenY < window.innerHeight + 1000;
                    if (!inView) { if (el.parentNode) el.remove(); return; }
                    if (!el.parentNode) document.body.appendChild(el);
                    el.style.left = screenX + "px"; el.style.top = screenY + "px";
                    if (el.classList.contains("h4-grid-drawer") || el.classList.contains("h4-grid-meta") || el.classList.contains("h4-grid-detail")) {
                        el.style.width = pt.w + "px"; el.style.height = pt.h + "px";
                        el.style.transform = `scale(${scale})`; el.style.transformOrigin = "top left";
                    } else {
                        el.style.width = (pt.w * scale) + "px"; el.style.height = (pt.h * scale) + "px";
                        el.style.transform = "none";
                    }
                    el.style.display = "block";
                };

                if (scale < 0.35) {
                    [this.__h4_core_prefix, this.__h4_core_path, this.__h4_core_drawer, this.__h4_detail_drawer, this.__h4_meta_drawer].forEach(el => { if (el && el.parentNode) el.remove(); });
                    ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, mesh.w, mesh.h);
                    ctx.fillStyle = COLORS.accent; ctx.font = "900 120px monospace"; ctx.textAlign = "center";
                    ctx.textBaseline = "middle"; ctx.fillText("H4", mesh.w / 2, mesh.h / 2);
                    ctx.font = "20px monospace"; ctx.fillText("SMARTSAVE", mesh.w / 2, mesh.h / 2 + 80);
                    return;
                }

                syncGrid(this.__h4_core_prefix, pts.prefix_box, true);
                syncGrid(this.__h4_core_path, pts.path_box, true);

                this.h4_ui.params_anim += ((active === "PARAMETERS" ? 1 : 0) - this.h4_ui.params_anim) * 0.15;
                this.h4_ui.meta_anim += ((active === "METADATA" ? 1 : 0) - this.h4_ui.meta_anim) * 0.15;
                this.h4_ui.footer_anim += ((active === "HISTORY" ? 1 : 0) - this.h4_ui.footer_anim) * 0.15;
                this.h4_ui.detail_anim += (((active === "PARAMETERS" && this.h4_ui.selected_node_id) ? 1 : 0) - this.h4_ui.detail_anim) * 0.15;

                if (this.h4_ui.params_anim > 0.01) {
                    const slide_pts = { ...pts.drawer_p };
                    slide_pts.x = mesh.w + slide_pts.w * (1 - this.h4_ui.params_anim) + 15;
                    syncGrid(this.__h4_core_drawer, slide_pts, true);
                    this.__h4_core_drawer.style.opacity = this.h4_ui.params_anim;
                } else if (this.__h4_core_drawer.parentNode) this.__h4_core_drawer.remove();

                if (this.h4_ui.detail_anim > 0.01) {
                    const slide_pts = { ...pts.drawer_detail };
                    slide_pts.x = (mesh.w + 15 + 348) + (slide_pts.w * (1 - this.h4_ui.detail_anim));
                    syncGrid(this.__h4_detail_drawer, slide_pts, true);
                    this.__h4_detail_drawer.style.opacity = this.h4_ui.detail_anim;
                } else if (this.__h4_detail_drawer.parentNode) this.__h4_detail_drawer.remove();

                if (this.h4_ui.meta_anim > 0.01) {
                    const slide_pts = { ...pts.drawer_m };
                    slide_pts.x = -(slide_pts.w + 15) * this.h4_ui.meta_anim;
                    syncGrid(this.__h4_meta_drawer, slide_pts, true);
                    this.__h4_meta_drawer.style.opacity = this.h4_ui.meta_anim;
                } else if (this.__h4_meta_drawer.parentNode) this.__h4_meta_drawer.remove();

                if (Math.abs(this.h4_ui.footer_anim - (active === "HISTORY" ? 1 : 0)) > 0.01 || this.h4_ui.params_anim > 0.01 || this.h4_ui.meta_anim > 0.01 || this.h4_ui.detail_anim > 0.01) this.setDirtyCanvas(true);

                ctx.save(); ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, mesh.w, mesh.h);
                this.__h4_cached_imgs = this.imgs; this.imgs = null;
                const activeImg = (this.h4_ui.selected_idx >= 0 && this.h4_ui.active_tab === "HISTORY") ? null : this.__h4_cached_imgs?.[0];
                if (activeImg) {
                    const img = activeImg; const gr = Math.min(pts.preview_area.w / img.width, pts.preview_area.h / img.height);
                    ctx.drawImage(img, pts.preview_area.x + (pts.preview_area.w - img.width * gr) / 2, pts.preview_area.y + (pts.preview_area.h - img.height * gr) / 2, img.width * gr, img.height * gr);
                } else if (this.h4_ui.selected_idx >= 0) {
                    const item = this.h4_ui.history[this.h4_ui.selected_idx];
                    const url = api.apiURL(`/h4/thumbnail?filename=${encodeURIComponent(item.filename)}&subfolder=${encodeURIComponent(item.subfolder)}&type=${item.type}&full=true`);
                    if (this.h4_ui.thumb_imgs[url]) {
                        const img = this.h4_ui.thumb_imgs[url]; const gr = Math.min(pts.preview_area.w / img.width, pts.preview_area.h / img.height);
                        ctx.drawImage(img, pts.preview_area.x + (pts.preview_area.w - img.width * gr) / 2, pts.preview_area.y + (pts.preview_area.h - img.height * gr) / 2, img.width * gr, img.height * gr);
                    } else { const img = new Image(); img.onload = () => { this.h4_ui.thumb_imgs[url] = img; this.setDirtyCanvas(true); }; img.src = url; }
                }
                ctx.save(); ctx.translate(pts.toggle_box.x, pts.toggle_box.y);
                ctx.shadowColor = isSaving ? COLORS.save : COLORS.cyan_glow; ctx.shadowBlur = isSaving ? 10 : 5;
                ctx.fillStyle = "#000"; ctx.fillRect(0, 0, 50, 20); ctx.strokeStyle = isSaving ? COLORS.save : COLORS.cyan_glow; ctx.strokeRect(0, 0, 50, 20);
                ctx.fillStyle = isSaving ? COLORS.save : "#252525"; ctx.fillRect(isSaving ? 25 : 0, 0, 25, 20);
                ctx.restore(); ctx.shadowBlur = 0;
                ctx.font = "900 13px monospace"; ctx.textAlign = "left";
                ctx.fillStyle = COLORS.dim; ctx.fillText("<--- h4 // ", pts.label_text.x, pts.label_text.y + 5);
                let lx = pts.label_text.x + ctx.measureText("<--- h4 // ").width;
                ctx.fillStyle = isSaving ? COLORS.save : COLORS.dim; ctx.fillText("Save", lx, pts.label_text.y + 5); lx += 45;
                ctx.fillStyle = COLORS.dim; ctx.fillText("|", lx, pts.label_text.y + 5); lx += 15;
                ctx.fillStyle = !isSaving ? COLORS.preview : COLORS.dim; ctx.fillText("Preview", lx, pts.label_text.y + 5); lx += 65;
                ctx.fillStyle = isSaving ? COLORS.save : COLORS.preview; ctx.beginPath(); ctx.arc(lx, pts.label_text.y, 5, 0, Math.PI * 2); ctx.fill();
                const drawHoloBtn = (r, label, id, tab_active = false) => {
                    const hover = this.h4_ui.hover_id === id;
                    const active = this.h4_ui.active_click_id === id;
                    const ox = active ? 2 : 0, oy = active ? 2 : 0;
                    ctx.save(); if (active || tab_active) { ctx.shadowColor = COLORS.accent; ctx.shadowBlur = 10; }
                    ctx.fillStyle = active ? "#111" : COLORS.btn_bg; ctx.beginPath(); ctx.roundRect(r.x + ox, r.y + oy, r.w, r.h, 4); ctx.fill();
                    ctx.strokeStyle = (hover || tab_active || active) ? COLORS.accent : COLORS.cyan_glow; ctx.lineWidth = (tab_active || active) ? 2 : 1; ctx.stroke(); ctx.restore();
                    ctx.fillStyle = (hover || tab_active || active) ? COLORS.accent : COLORS.dim; ctx.font = "bold 18px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
                    ctx.fillText(label, r.x + r.w / 2 + ox, r.y + r.h / 2 + oy);
                };
                drawHoloBtn(pts.btn_p, "P", "p", active === "PARAMETERS");
                drawHoloBtn(pts.btn_m, "M", "m", active === "METADATA");
                drawHoloBtn(pts.btn_h, "H", "h", active === "HISTORY");
                if (this.h4_ui.footer_anim > 0.01) {
                    const drawerH = 110 * this.h4_ui.footer_anim; const fy = mesh.h - drawerH;
                    ctx.save(); ctx.fillStyle = COLORS.bg; ctx.fillRect(80, fy, mesh.w - 160, drawerH); ctx.strokeStyle = COLORS.border; ctx.strokeRect(80, fy, mesh.w - 160, drawerH);
                    if (this.h4_ui.footer_anim > 0.8) {
                        const btn_prev = { ...pts.btn_prev, y: fy + 20 };
                        const btn_next = { ...pts.btn_next, y: fy + 20 };
                        drawHoloBtn(btn_prev, "<", "prev"); drawHoloBtn(btn_next, ">", "next");
                        ctx.save(); ctx.beginPath(); ctx.rect(120, fy, mesh.w - 240, drawerH); ctx.clip();
                        const pad = 4; const ts = 101 - pad;
                        this.h4_ui.history.slice(this.h4_ui.scroll_idx, this.h4_ui.scroll_idx + 10).forEach((item, i) => {
                            const tx = 120 + (i * (ts + 10));
                            const url = api.apiURL(`/h4/thumbnail?filename=${encodeURIComponent(item.filename)}&subfolder=${encodeURIComponent(item.subfolder)}&type=${item.type}`);
                            if (this.h4_ui.thumb_imgs[url]) {
                                const img = this.h4_ui.thumb_imgs[url]; const gr = Math.min(ts / img.width, ts / img.height);
                                ctx.drawImage(img, tx + (ts - img.width * gr) / 2, fy + pad + (ts - img.height * gr) / 2, img.width * gr, img.height * gr);
                            } else { const img = new Image(); img.onload = () => { this.h4_ui.thumb_imgs[url] = img; this.setDirtyCanvas(true); }; img.src = url; }
                            const is_sel = this.h4_ui.selected_idx === (i + this.h4_ui.scroll_idx);
                            ctx.strokeStyle = is_sel ? COLORS.accent : (item.type === "output" ? COLORS.save : COLORS.preview);
                            ctx.lineWidth = is_sel ? 3 : 1; ctx.strokeRect(tx, fy + pad, ts, ts);
                        }); ctx.restore();
                    } ctx.restore();
                } ctx.restore();
            } catch (err) { console.error("H4_Grid_Sovereign Failure:", err); }
        };
    }
});
