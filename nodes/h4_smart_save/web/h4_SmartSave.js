import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

/*
    h4 - SmartSave (Sovereign Kinetic Kernel v24.14.63)
    ---------------------------------------------------
    - VIEWPORT SOVEREIGNTY: Enforced strict clipping on all drawers to prevent text bleed.
    - DYNAMIC HEIGHT CLAMP: Drawers now scale to the node's full height with tactical baselines.
    - THEMED SCROLL ENGINE: Custom cyan scrollbars implemented for high-density forensic data.
    - GEOMETRY SYNCHRONIZATION: Fixed detail drawer height mismatch.
*/

const COLORS = {
    bg: "#151515",
    panel: "rgba(10,10,10,0.98)",
    panelSoft: "rgba(20,20,20,0.92)",
    accent: "#00f2ff",
    accentSoft: "rgba(0,242,255,0.12)",
    text: "#ffffff",
    dim: "#a8a8a8",
    dim2: "#666666",
    border: "#2a2a2a",
    save: "#00ff8a",
    preview: "#ffd700",
    danger: "#ff3333",
    forensic: "#ffd700",
};

// --- GLOBAL TOOLTIP KERNEL ---
const h4Tooltip = document.createElement("div");
h4Tooltip.style.cssText = `position:fixed;z-index:9999;background:rgba(5,5,5,0.98);border:1px solid ${COLORS.accent};color:${COLORS.accent};padding:10px 14px;font-size:12px;font-family:monospace;pointer-events:none;border-radius:6px;display:none;max-width:280px;box-shadow:0 0 20px rgba(0,0,0,0.8);line-height:1.5;font-weight:bold;`;
document.body.appendChild(h4Tooltip);

let tipDelay = null;
let currentTipText = null;
function showTip(text, e) {
    if (!text) { hideTip(); return; }
    if (text === currentTipText) { updateTipPos(e); return; }
    hideTip();
    currentTipText = text;
    const x = e.clientX; const y = e.clientY;
    tipDelay = setTimeout(() => {
        h4Tooltip.innerHTML = text.replace("//", "<br/><span style='color:#666;font-size:10px;font-style:italic;'>") + (text.includes("//") ? "</span>" : "");
        h4Tooltip.style.display = "block";
        h4Tooltip.style.left = (x + 18) + "px"; h4Tooltip.style.top = (y + 18) + "px";
    }, 850);
}
function updateTipPos(e) {
    if (h4Tooltip.style.display === "block") {
        h4Tooltip.style.left = (e.clientX + 18) + "px"; h4Tooltip.style.top = (e.clientY + 18) + "px";
    }
}
function hideTip() { if (tipDelay) clearTimeout(tipDelay); tipDelay = null; currentTipText = null; h4Tooltip.style.display = "none"; }

document.addEventListener("mouseover", (e) => {
    const target = e.target.closest("[data-h4-tip]");
    if (target) showTip(target.getAttribute("data-h4-tip"), e);
});
document.addEventListener("mousemove", (e) => updateTipPos(e));
document.addEventListener("mouseout", (e) => {
    const target = e.target.closest("[data-h4-tip]");
    if (target) hideTip();
});

const MIN_SIZE = [750, 500];
const RAIL_H = 150;
const DRAWER_W = 340;
const DRAWER_GAP = 15;
const DETAIL_GAP = 8;
const ANIM_SPEED = 0.22;
const HISTORY_LIMIT_VISIBLE = 8;
const BTN_SIZE = 34;
const SCRUB_BTN_W = 28;

const activeNodes = new Set();

function clamp01(v) { return Math.max(0, Math.min(1, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

function safeText(v) {
    if (v === null || v === undefined) return "";
    if (typeof v === "object") { try { return JSON.stringify(v); } catch { return String(v); } }
    return String(v);
}

function getGrid(node) {
    const baseW = Math.max(MIN_SIZE[0], node.size[0]);
    const baseH = Math.max(MIN_SIZE[1], node.size[1]);
    const cx = baseW / 2;
    const hudY = 72;
    const previewArea = { x: 74, y: 110, w: baseW - 148, h: baseH - 180 };

    return {
        w: baseW, h: baseH, baseH,
        pts: {
            title: { x: cx, y: 32 },
            lod_badge: { x: cx, y: baseH - 45, w: 100, h: 24 },
            mode: { x: cx, y: 72, w: 170, h: 24 },
            prefix_box: { x: cx - 335, y: hudY - 12, w: 160, h: 24 },
            toggle_box: { x: cx - 165, y: hudY - 10, w: 60, h: 20 },
            path_box: { x: cx + 110, y: hudY - 12, w: 160, h: 24 },
            btn_p: { x: baseW - 55, y: 150, w: BTN_SIZE, h: BTN_SIZE },
            btn_m: { x: 20, y: 150, w: BTN_SIZE, h: BTN_SIZE },
            btn_h: { x: 20, y: baseH - 55, w: BTN_SIZE, h: BTN_SIZE },
            btn_s: { x: baseW - 55, y: baseH - 55, w: BTN_SIZE, h: BTN_SIZE },
            preview_area: previewArea,
            drawer_p: { x: baseW + DRAWER_GAP, y: 10, w: DRAWER_W, h: baseH - 20 },
            drawer_m: { x: -DRAWER_W - DRAWER_GAP, y: 10, w: DRAWER_W, h: baseH - 20 },
            drawer_detail: { x: baseW + DRAWER_GAP + DRAWER_W + DETAIL_GAP, y: 10, w: DRAWER_W, h: baseH - 20 },
            drawer_custom: { x: -(DRAWER_W * 2 + DRAWER_GAP + DETAIL_GAP), y: 10, w: DRAWER_W, h: baseH - 20 },
            drawer_viewer: previewArea,
            history_rail: { x: 0, y: baseH + 10, w: baseW, h: RAIL_H },
            scrub_prev: { x: previewArea.x - SCRUB_BTN_W - 8, y: previewArea.y + previewArea.h / 2 - 20, w: SCRUB_BTN_W, h: 40 },
            scrub_next: { x: previewArea.x + previewArea.w + 8, y: previewArea.y + previewArea.h / 2 - 20, w: SCRUB_BTN_W, h: 40 },
        },
    };
}

class SmartSaveUI {
    constructor(node) {
        this.node = node; this.history = []; this.thumb_imgs = {}; this.full_imgs = {}; this.selected_idx = -1; this.current_sidecar = null;
        this.footer_anim = 0; this.params_anim = 0; this.meta_anim = 0; this.detail_anim = 0; this.custom_meta_anim = 0; this.viewer_anim = 0;
        this.show_params = false; this.show_meta = false; this.show_history = false; this.show_custom_meta = false; this.show_viewer = false;
        this.scroll_idx = 0; this._dirty_params = true; this._dirty_viewer = true; this._redrawTimer = null;
        this.show_lightbox = false; this.swapped_ids = new Set();
        this._historyInflight = false; this._sidecarInflight = false;
        this._lastHistorySignature = ""; this._lastSidecarSignature = "";
        this.fetchHistory(false);
    }

    scheduleDraw() { if (this._redrawTimer) return; this._redrawTimer = setTimeout(() => { this._redrawTimer = null; this.node.setDirtyCanvas(true, true); }, 1); }
    markParamsDirty() { this._dirty_params = true; this.scheduleDraw(); }
    markViewerDirty() { this._dirty_viewer = true; this.scheduleDraw(); }
    setHistoryOpen(open) { this.show_history = !!open; if (this.show_history) { this.fetchHistory(false); this.updateHistoryRail(); } this.scheduleDraw(); }

    async fetchHistory(force = false) {
        if (this._historyInflight) return; this._historyInflight = true;
        try {
            const res = await api.fetchApi("/h4/smart_save/history"); if (!res.ok) return;
            const data = await res.json();
            const sig = JSON.stringify(data.map((x) => [x.filename, x.subfolder, x.type, x.timestamp]));
            if (sig !== this._lastHistorySignature) { this._lastHistorySignature = sig; this.history = data; this.updateHistoryRail(); this.scheduleDraw(); }
        } catch (e) { } finally { this._historyInflight = false; }
    }

    async fetchSidecar(idx) {
        if (idx < 0 || idx >= this.history.length) { this.current_sidecar = null; this.discovered_forensics = null; this._lastSidecarSignature = ""; this.selected_idx = -1; this.markParamsDirty(); return; }
        const item = this.history[idx]; const sig = `${item.filename}|${item.subfolder}|${item.type}|${item.timestamp}`;
        if (item.sidecar) {
            this.current_sidecar = item.sidecar;
            this._lastSidecarSignature = sig;
            if (this._last_detailed_id) this.showNodeDetails(this._last_detailed_id, true, true);
            this.markParamsDirty();
            return;
        }
        if (this._sidecarInflight) return; this._sidecarInflight = true;
        try {
            const url = api.apiURL(`/h4/smart_save/sidecar?filename=${encodeURIComponent(item.filename)}&subfolder=${encodeURIComponent(item.subfolder)}&type=${encodeURIComponent(item.type)}`);
            const res = await api.fetchApi(url);
            if (res.ok) {
                this.current_sidecar = await res.json();
                this._lastSidecarSignature = sig;
                item.sidecar = this.current_sidecar;
                if (this._last_detailed_id) this.showNodeDetails(this._last_detailed_id, true, true);
            }
        } catch (e) { console.error("[h4] DNA Fetch Fault:", e); } finally { this._sidecarInflight = false; this.markParamsDirty(); }
    }


    async performSwap(nodeId, newValues) {
        if (!nodeId) { console.error("[h4] Swap Aborted: Missing Node ID"); return; }
        const liveNode = app.graph.getNodeById(parseInt(nodeId, 10));
        if (!liveNode) { console.error(`[h4] Swap Aborted: Node ID ${nodeId} not found in graph.`); return; }

        console.log(`[h4] Executing Type-Rigid Swap for Node ${nodeId}...`, newValues);
        const currentVals = {};
        (liveNode.widgets || []).forEach(w => { if (w.name) currentVals[w.name] = w.value; });

        try {
            this.markParamsDirty();
            const res = await api.fetchApi("/h4/smart_save/cache_swap", {
                method: "POST",
                body: JSON.stringify({ node_id: String(nodeId), values: currentVals })
            });
            if (!res.ok) throw new Error(`Backend Cache Failed: ${res.status}`);

            Object.entries(newValues).forEach(([k, v]) => {
                const w = liveNode.widgets?.find(x => x.name === k);
                if (w) {
                    let finalVal = v;
                    // --- RIGID POLARITY: DNA -> WIDGET ---
                    const origType = typeof w.value;
                    if (origType === "number") {
                        finalVal = Number(v);
                        if (isNaN(finalVal)) finalVal = w.value; // Protection
                    }
                    else if (origType === "boolean") finalVal = (v === "true" || v === true);

                    console.log(`[h4] DNA Injection [${origType}]: ${k} -> ${finalVal}`);
                    w.value = finalVal;
                    if (w.callback) {
                        try { w.callback.call(w, finalVal); } catch (cbErr) { console.warn("[h4] Widget Callback Fault:", cbErr); }
                    }
                }
            });

            try {
                if (liveNode.onWidgetChanged) liveNode.onWidgetChanged();
            } catch (err) {
                console.warn(`[h4] V2 Widget Metadata Collision (Non-Critical):`, err);
                app.graph.setDirtyCanvas(true, true); // Fallback serialization
            }
            this.swapped_ids.add(String(nodeId));

            // --- KINETIC FEEDBACK ENGINE ---
            liveNode.boxcolor = COLORS.save;
            this.node.boxcolor = COLORS.save; // Feedback on local HUD node
            app.canvas.setDirty(true);

            setTimeout(() => {
                liveNode.boxcolor = null;
                this.node.boxcolor = null;
                this.node.setDirtyCanvas(true);
            }, 1000);

            this.markParamsDirty();
            this.scheduleDraw();
            console.log(`[h4] Node ${nodeId} DNA injection and graph serialization complete.`);
        } catch (e) {
            this.node.boxcolor = COLORS.danger;
            setTimeout(() => { this.node.boxcolor = null; this.node.setDirtyCanvas(true); }, 1000);
            console.error(`[h4] Swap Failure [Node:${nodeId}]:`, e);
        }
    }

    async performUndo(nodeId) {
        if (!nodeId) return;
        console.log(`[h4] Executing Type-Rigid Undo for Node ${nodeId}...`);
        try {
            const res = await api.fetchApi(`/h4/smart_save/cache_swap?node_id=${nodeId}`);
            if (!res.ok) throw new Error(`Backend Retrieve Failed: ${res.status}`);

            const data = await res.json();
            const liveNode = app.graph.getNodeById(parseInt(nodeId, 10));
            if (liveNode && data.values) {
                Object.entries(data.values).forEach(([k, v]) => {
                    const w = liveNode.widgets?.find(x => x.name === k);
                    if (w) {
                        let finalVal = v;
                        const origType = typeof w.value;
                        if (origType === "number") finalVal = Number(v);
                        else if (origType === "boolean") finalVal = (v === "true" || v === true);
                        w.value = finalVal;
                        if (w.callback) w.callback.call(w, finalVal);
                    }
                });
                try {
                    if (liveNode.onWidgetChanged) liveNode.onWidgetChanged();
                } catch (err) {
                    console.warn(`[h4] V2 Widget Metadata Collision (Non-Critical):`, err);
                    app.graph.setDirtyCanvas(true, true);
                }
                this.swapped_ids.delete(String(nodeId));

                // --- KINETIC FEEDBACK ENGINE ---
                liveNode.boxcolor = COLORS.accent;
                this.node.boxcolor = COLORS.accent;
                setTimeout(() => {
                    liveNode.boxcolor = null;
                    this.node.boxcolor = null;
                    this.node.setDirtyCanvas(true);
                }, 1000);
                this.markParamsDirty();
                this.scheduleDraw();
                console.log(`[h4] Node ${nodeId} restored and serialized.`);
            }
        } catch (e) {
            this.node.boxcolor = COLORS.danger;
            setTimeout(() => { this.node.boxcolor = null; this.node.setDirtyCanvas(true); }, 1000);
            console.error(`[h4] Undo Failure [Node:${nodeId}]:`, e);
        }
    }

    crawlWorkflow() {
        if (!this._dirty_params) return; this._dirty_params = false;
        const params = []; const visited = new Set(); const queue = [this.node];
        while (queue.length > 0) {
            const n = queue.shift(); if (!n || visited.has(n.id)) continue; visited.add(n.id);
            const isForensic = !!n.widgets && (n.type.includes("Sampler") || n.type.includes("Loader") || n.type.includes("Lora") || n.type.includes("VAE") || n.type.includes("CLIP") || n.type.includes("Checkpoint"));
            if (isForensic && n.id !== this.node.id) {
                const nodeParams = [];
                (n.widgets || []).forEach((w) => { if (w?.name && !w.name.startsWith("_") && w.type !== "button") { let val = w.value; if (typeof val === "number") val = Number.isInteger(val) ? val : Number(val).toFixed(3); nodeParams.push({ name: w.name, val: safeText(val) }); } });
                if (nodeParams.length > 0) params.push({ title: n.title || n.type || "Untitled Node", id: n.id, items: nodeParams });
            }
            (n.inputs || []).forEach((input) => { if (input.link != null) { const link = app.graph.links[input.link]; if (link) { const originNode = app.graph.getNodeById(link.origin_id); if (originNode) queue.push(originNode); } } });
        }
        const dr = this.node.__h4_core_drawer; if (!dr) return;
        let html = `<div style="color:${COLORS.accent};margin:15px;font-weight:900;border-bottom:1px solid #333;padding-bottom:8px;font-size:14px;">h4 // LIVE PARAMETERS</div>`;
        if (params.length === 0) html += `<div style="color:#555;margin:40px 20px;font-style:italic;">No upstream parameters found.</div>`;
        else params.forEach((p) => {
            const isSwapped = this.swapped_ids.has(String(p.id));
            const cardTip = `Click to see all the detailed settings for this ${safeText(p.title)} node.`;
            const swapTip = `Sync Settings - Force the nodes in your current workflow to match these exact settings.`;

            html += `<div class="h4-param-card" data-node-id="${p.id}" data-hist="0" data-h4-tip="${cardTip.replace(/"/g, "&quot;")}" style="margin:0 12px 12px 12px;background:rgba(20,20,20,0.55);border:1px solid #222;border-radius:6px;overflow:hidden;cursor:pointer;position:relative;"><div style="background:#222;color:#aaa;font-size:10px;padding:4px 8px;display:flex;justify-content:space-between;"><span>${safeText(p.title)}</span><span style="color:#555;">ID ${p.id}</span></div><div style="padding:8px;max-height:80px;overflow:hidden;">${p.items.slice(0, 3).map((it) => `<div style="display:flex;justify-content:space-between;gap:10px;margin-bottom:2px;font-size:10px;white-space:nowrap;overflow:hidden;"><span style="color:#555;overflow:hidden;text-overflow:ellipsis;">${safeText(it.name)}</span><span style="color:${COLORS.accent};text-align:right;overflow:hidden;text-overflow:ellipsis;">${safeText(it.val)}</span></div>`).join("")}</div><button class="h4-swap-btn" data-node-id="${p.id}" data-h4-tip="${swapTip.replace(/"/g, "&quot;")}" style="width:100%;padding:4px;border:none;background:${isSwapped ? COLORS.accentSoft : "rgba(255,255,255,0.03)"};color:${isSwapped ? COLORS.accent : "#555"};font-size:9px;font-weight:bold;cursor:pointer;border-top:1px solid #222;">${isSwapped ? "SWAP BACK" : "SWAP"}</button></div>`;
        });
        dr.innerHTML = html; this.bindParamCards(false);
    }

    updateParamsFromSidecar(sidecar) {
        if (!this._dirty_params) return; this._dirty_params = false;
        const dr = this.node.__h4_core_drawer; if (!dr) return;

        // --- NUCLEAR RECURSIVE DISCOVERY ---
        let forensics = {};
        const findNodes = (obj) => {
            if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
            let foundAny = false;
            // Check if THIS level looks like a node map
            Object.entries(obj).forEach(([k, v]) => {
                if (!isNaN(k) && typeof v === "object" && (v.values || v.inputs || v.widgets)) {
                    forensics[k] = v;
                    foundAny = true;
                }
            });
            // If not found at this level, crawl deeper
            if (!foundAny) {
                Object.values(obj).forEach(v => {
                    if (typeof v === "object" && v !== null && !Array.isArray(v)) findNodes(v);
                });
            }
        };
        findNodes(sidecar);

        console.log(`[h4] Deep Discovery Result:`, { ids: Object.keys(forensics), totalKeys: Object.keys(sidecar || {}).length });
        this.discovered_forensics = forensics; // Store for binding coherency

        let html = `<div style="color:${COLORS.forensic};margin:15px;font-weight:900;border-bottom:1.5px solid #333;padding-bottom:8px;font-size:14px;display:flex;justify-content:space-between;align-items:center;"><span>h4 // FORENSICS</span><span style="font-size:9px;color:#6c5730;font-weight:normal;opacity:0.8;">[DNA: ${safeText(this._lastSidecarSignature?.split("|")[0] || "BAKED")}]</span></div>`;
        const ids = Object.keys(forensics || {});

        if (ids.length === 0) {
            html += `<div style="color:#555;margin:40px 20px;font-style:italic;">No forensic DNA identified in baked archive.<br/><br/><span style="font-size:8px; color:#333;">TOP-LEVEL KEYS: ${Object.keys(sidecar || {}).join(", ") || "EMPTY"}</span></div>`;
        } else {
            ids.forEach((id) => {
                const data = forensics[id] || {};
                // --- IDENTITY RESTORATION: Match class/class_type/title ---
                const title = data.title || data.class || data.class_type || data.type || "Historical Node";
                const values = data.values || data.inputs || data.widgets || {};
                const isGhost = !app.graph.getNodeById(parseInt(id, 10));
                const isSwapped = this.swapped_ids.has(String(id));
                const cardTip = `Click to see the historical settings for this ${safeText(title)} node.`;
                const swapTip = `Sync Settings - Re-apply these exact historical settings to your current workflow.`;

                html += `<div class="h4-param-card" data-node-id="${id}" data-hist="1" data-h4-tip="${cardTip.replace(/"/g, "&quot;")}" style="margin:0 12px 12px 12px;background:rgba(36,28,8,0.45);border:1px solid ${isGhost ? COLORS.danger : "#4a3a16"};border-radius:6px;overflow:hidden;cursor:pointer;position:relative;"><div style="background:${isGhost ? "#2d1212" : "#2a220f"};color:${isGhost ? COLORS.danger : COLORS.forensic};font-size:10px;padding:4px 8px;display:flex;justify-content:space-between;"><span>${safeText(title)} ${isGhost ? "!! MISSING" : ""}</span><span style="color:#6c5730;">ID ${id}</span></div><div style="padding:8px;max-height:80px;overflow:hidden;">${Object.entries(values).slice(0, 3).map(([k, v]) => `<div style="display:flex;justify-content:space-between;gap:10px;margin-bottom:2px;font-size:10px;white-space:nowrap;overflow:hidden;"><span style="color:#8e7a4f;overflow:hidden;text-overflow:ellipsis;">${safeText(k)}</span><span style="color:${COLORS.forensic};text-align:right;overflow:hidden;text-overflow:ellipsis;">${safeText(v)}</span></div>`).join("")}</div>${!isGhost ? `<button class="h4-swap-btn" data-node-id="${id}" data-hist="1" data-h4-tip="${swapTip.replace(/"/g, "&quot;")}" style="width:100%;padding:4px;border:none;background:${isSwapped ? "rgba(255,215,0,0.15)" : "rgba(255,255,255,0.03)"};color:${isSwapped ? COLORS.forensic : "#7c6838"};font-size:9px;font-weight:bold;cursor:pointer;border-top:1px solid #333;">${isSwapped ? "SWAP BACK" : "SWAP"}</button>` : ""}</div>`;
            });
        }
        dr.innerHTML = html; this.bindParamCards(true);
    }

    bindParamCards(isHist) {
        const dr = this.node.__h4_core_drawer; if (!dr) return;
        dr.querySelectorAll(".h4-param-card").forEach((c) => {
            const id = c.getAttribute("data-node-id"); const hist = c.getAttribute("data-hist") === "1";
            c.onclick = (e) => { e.stopPropagation(); this.show_params = true; this.showNodeDetails(id, hist); this.scheduleDraw(); };
            const btn = c.querySelector(".h4-swap-btn");
            if (btn) btn.onclick = (e) => {
                e.stopPropagation(); const isBack = this.swapped_ids.has(String(id));
                btn.textContent = isBack ? "REVERTING..." : "SWAPPING...";
                btn.style.color = "#fff";
                if (isBack) this.performUndo(id);
                else {
                    let vals = {};
                    if (hist && this.discovered_forensics) {
                        const d = this.discovered_forensics[id] || this.discovered_forensics[String(id)];
                        if (d) vals = d.values || d.inputs || d.widgets || {};
                    }
                    else { const n = app.graph.getNodeById(parseInt(id)); if (n) n.widgets?.forEach(w => { if (w.name) vals[w.name] = w.value; }); }
                    this.performSwap(id, vals);
                }
            };
        });
    }

    showNodeDetails(nodeId, isHist = false, forceRefresh = false) {
        const det = this.node.__h4_detaildrawer; if (!det) return;

        // --- SELECTION TOGGLE: Click already active node to close (unless force refreshing) ---
        if (!forceRefresh && this._last_detailed_id === String(nodeId)) {
            this._last_detailed_id = null;
            this.scheduleDraw(); return;
        }

        this._last_detailed_id = String(nodeId);
        let title = "UNKNOWN"; const items = [];
        if (isHist && this.current_sidecar) {
            // Re-discover forensics from the specific image's sidecar
            const forensics = {};
            const find = (o) => {
                if (!o || typeof o !== "object" || Array.isArray(o)) return;
                let h = false;
                Object.entries(o).forEach(([k, v]) => { if (!isNaN(k) && typeof v === "object" && (v.values || v.inputs || v.widgets)) { forensics[k] = v; h = true; } });
                if (!h) Object.values(o).forEach(v => { if (typeof v === "object" && v !== null && !Array.isArray(v)) find(v); });
            };
            find(this.current_sidecar);

            const d = forensics[nodeId] || forensics[String(nodeId)];
            if (d) {
                title = d.title || d.class || d.class_type || d.type || "Historical Node";
                const values = d.values || d.inputs || d.widgets || {};
                Object.entries(values).forEach(([k, v]) => items.push({ name: k, value: safeText(v) }));
            }
        }
        else { const n = app.graph.getNodeById(nodeId); if (n) { title = n.title || n.type || "LIVE NODE"; (n.widgets || []).forEach((w) => { if (w?.name && !w.name.startsWith("_") && w.type !== "button") items.push({ name: w.name, value: safeText(w.value) }); }); } }
        let html = `<div style="color:${isHist ? COLORS.forensic : COLORS.accent};margin:15px;font-weight:900;border-bottom:1px solid #333;padding-bottom:8px;font-size:14px;">h4 // ${isHist ? "FORENSIC" : "DETAIL"} // ${nodeId}</div><div style="padding:0 15px 15px 15px;"><div style="color:#aaa;margin-bottom:12px;font-size:12px;">${safeText(title)}</div>`;
        if (!items.length) html += `<div style="color:#555;font-style:italic;">No values available for this selection.</div>`;
        else items.forEach((it) => { html += `<div style="margin-bottom:8px;border-left:2px solid #333;padding-left:10px;"><div style="font-size:9px;color:#aaa;text-transform:uppercase;">${safeText(it.name)}</div><div style="color:${isHist ? COLORS.forensic : COLORS.accent};font-size:11px;word-break:break-word;">${safeText(it.value)}</div></div>`; });
        html += `</div>`; det.innerHTML = html; if (!forceRefresh) this.detail_anim = 0; this.scheduleDraw();
    }

    updateHistoryRail() {
        const rail = this.node.__h4_history_rail; if (!rail || !this.show_history) return;
        let html = `<div style="height:100%;display:grid;grid-template-columns:40px 1fr 40px;align-items:center;padding:0;background:${COLORS.panel};border-radius:6px;overflow:hidden;"><div class="h4-hist-nav" data-dir="-1" title="Scroll Left" style="height:100%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.02);color:${COLORS.accent};font-size:20px;cursor:pointer;user-select:none;">‹</div><div style="display:flex;gap:12px;overflow:hidden;justify-content:flex-start;padding:10px 15px;">`;
        const visibleItems = this.history.slice(this.scroll_idx, this.scroll_idx + 8);
        visibleItems.forEach((item, i) => {
            const idx = i + this.scroll_idx; const url = api.apiURL(`/h4/thumbnail?filename=${encodeURIComponent(item.filename)}&subfolder=${encodeURIComponent(item.subfolder)}&type=${encodeURIComponent(item.type)}`);
            const isSel = idx === this.selected_idx;
            const isTemp = item.type === "temp";
            const bCol = isSel ? (isTemp ? COLORS.forensic : COLORS.accent) : "#333";
            const glow = (isSel && isTemp) ? `box-shadow: 0 0 12px ${COLORS.forensic}88;` : "";
            const hTip = `${safeText(item.filename)}: Click once to see the settings, or double-click to blow it up in the high-res Lightbox.`;

            html += `<div class="h4-hist-item ${isSel ? "active" : ""}" data-idx="${idx}" data-h4-tip="${hTip.replace(/"/g, "&quot;")}" style="min-width:110px;height:110px;background:#000;border:2px solid ${bCol};${glow}position:relative;cursor:pointer;border-radius:4px;"><img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:2px;" /><div style="position:absolute;bottom:0;width:100%;background:rgba(0,0,0,0.7);color:#888;font-size:9px;padding:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${safeText(item.filename)}</div></div>`;
        });
        html += `</div><div class="h4-hist-nav" data-dir="1" title="Scroll Right" style="height:100%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.02);color:${COLORS.accent};font-size:20px;cursor:pointer;user-select:none;">›</div></div><style> .h4-hist-nav:hover { background:rgba(0,242,255,0.08) !important; color:#fff !important; text-shadow:0 0 10px ${COLORS.accent}; } </style>`;
        rail.innerHTML = html;
        rail.querySelectorAll(".h4-hist-nav").forEach(b => { b.onclick = (e) => { e.stopPropagation(); this.scroll_idx = Math.max(0, Math.min(Math.max(0, this.history.length - 8), this.scroll_idx + (parseInt(b.getAttribute("data-dir")) * 4))); this.updateHistoryRail(); }; });
        rail.querySelectorAll(".h4-hist-item").forEach(b => {
            b.onclick = (e) => { e.stopPropagation(); this.selected_idx = parseInt(b.getAttribute("data-idx")); this.fetchSidecar(this.selected_idx); this.updateHistoryRail(); this.scheduleDraw(); };
            b.ondblclick = (e) => { e.stopPropagation(); this.selected_idx = parseInt(b.getAttribute("data-idx")); this.show_lightbox = true; this.updateLightbox(); this.scheduleDraw(); };
        });
    }

    showForensicViewer() {
        if (!this._dirty_viewer) return; this._dirty_viewer = false;
        const viewer = this.node.__h4_viewerdrawer; if (!viewer) return;
        const dna = this.current_sidecar || {};
        const liveMode = !this.current_sidecar;
        const titleColor = liveMode ? COLORS.accent : COLORS.forensic;
        const forensics = dna.h4_forensics || dna.nodes || dna.metadata || {};
        const telemetry = dna.h4_telemetry || dna.A || dna.B || {};

        let html = `<div style="color:${titleColor};margin:20px;font-weight:900;border-bottom:1.5px solid #333;padding-bottom:10px;display:flex;justify-content:space-between;align-items:center;"><span>h4 // FORENSIC DNA COMMAND</span><span style="color:#666;cursor:pointer;font-size:18px;" class="h4-viewer-close" title="Close Viewer">×</span></div>`;
        html += `<div style="padding:0 25px 25px 25px;overflow-y:auto;height:calc(100% - 70px);" class="h4gridscroll">`;

        // --- SECTION: PIPELINE CORE ---
        html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:25px;">
            <div style="background:rgba(255,255,255,0.02);border:1px solid #333;border-radius:10px;padding:18px;border-left:4px solid ${titleColor};">
                <div style="font-size:9px;color:#666;margin-bottom:6px;letter-spacing:1.5px;font-weight:bold;">AUTHOR IDENTITY</div>
                <div style="font-size:20px;color:#fff;font-weight:900;letter-spacing:-0.5px;">${safeText(dna.author || "Anonymous Source")}</div>
            </div>
            <div style="background:rgba(255,255,255,0.02);border:1px solid #333;border-radius:10px;padding:18px;">
                <div style="font-size:9px;color:#666;margin-bottom:6px;letter-spacing:1.5px;font-weight:bold;">GENERATION ENGINE</div>
                <div style="font-size:13px;color:${titleColor};font-weight:bold;word-break:break-word;line-height:1.2;">${safeText(dna.model_assigned || "Unlinked Workflow Engine")}</div>
            </div>
        </div>`;

        // --- SECTION: INSTRUMENTATION (CORE METRICS) ---
        if (Object.keys(telemetry).length > 0) {
            html += `<div style="font-size:10px;color:${titleColor};font-weight:bold;margin-bottom:10px;display:flex;align-items:center;gap:8px;"><span style="width:12px;height:2px;background:${titleColor}"></span>SYNTHESIS INSTRUMENTATION</div>`;
            html += `<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(100px, 1fr));gap:10px;margin-bottom:25px;background:rgba(0,0,0,0.3);padding:15px;border-radius:8px;border:1px solid #222;">`;
            const coreKeys = ["seed", "cfg", "steps", "sampler_name", "scheduler", "denoise", "ckpt_name", "vae_name", "base_model"];
            coreKeys.forEach(k => {
                const val = telemetry[k];
                if (val !== undefined) {
                    html += `<div style="background:rgba(255,255,255,0.02);padding:10px;border-radius:5px;border:1px solid #1a1a1a;">
                        <div style="font-size:8px;color:#555;margin-bottom:3px;text-transform:uppercase;font-weight:bold;">${k.replace("_", " ")}</div>
                        <div style="font-size:11px;color:#ddd;font-weight:bold;font-family:monospace;overflow:hidden;text-overflow:ellipsis;">${safeText(val)}</div>
                    </div>`;
                }
            });
            html += `</div>`;
        }

        // --- SECTION: MANIFESTS (PROMPTS) ---
        if (dna.positive || telemetry.positive) {
            html += `<div style="background:rgba(0,255,136,0.02);border:1px solid rgba(0,255,136,0.1);border-radius:8px;padding:15px;margin-bottom:15px;position:relative;">
                <div style="font-size:9px;color:#00ff88;margin-bottom:8px;font-weight:900;letter-spacing:1px;display:flex;align-items:center;gap:6px;">
                    <span style="width:6px;height:6px;background:#00ff88;border-radius:50%;"></span> POSITIVE MANIFEST
                </div>
                <div style="color:#eee;font-size:12px;line-height:1.5;white-space:pre-wrap;font-family:serif;font-style:italic;">${safeText(dna.positive || telemetry.positive)}</div>
            </div>`;
        }
        if (dna.negative || telemetry.negative) {
            html += `<div style="background:rgba(255,51,51,0.02);border:1px solid rgba(255,51,51,0.1);border-radius:8px;padding:15px;margin-bottom:25px;position:relative;">
                <div style="font-size:9px;color:#ff3333;margin-bottom:8px;font-weight:900;letter-spacing:1px;display:flex;align-items:center;gap:6px;">
                    <span style="width:6px;height:6px;background:#ff3333;border-radius:50%;"></span> NEGATIVE MANIFEST
                </div>
                <div style="color:#bbb;font-size:11px;line-height:1.5;white-space:pre-wrap;font-family:serif;font-style:italic;">${safeText(dna.negative || telemetry.negative)}</div>
            </div>`;
        }

        // --- SECTION: NODE INTELLIGENCE REGISTRY (RICH CARDS) ---
        const nodeIds = Object.keys(forensics);
        if (nodeIds.length > 0) {
            html += `<div style="font-size:10px;color:${titleColor};font-weight:bold;margin-bottom:12px;display:flex;align-items:center;gap:8px;"><span style="width:12px;height:2px;background:${titleColor}"></span>UNIFIED NODE INTELLIGENCE</div>`;
            html += `<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:15px;margin-bottom:30px;">`;

            nodeIds.forEach(id => {
                const node = forensics[id];
                const title = node.title || node.class || "Unknown Instance";
                const values = node.values || node.inputs || {};

                html += `<div style="background:rgba(0,0,0,0.25);border:1px solid #222;border-radius:8px;overflow:hidden;display:flex;flex-direction:column;">
                    <div style="background:rgba(255,255,255,0.03);padding:10px 15px;border-bottom:1px solid #222;display:flex;justify-content:space-between;align-items:center;">
                        <div style="display:flex;flex-direction:column;">
                            <span style="font-size:11px;color:${titleColor};font-weight:bold;letter-spacing:0.5px;">${safeText(title)}</span>
                            <span style="font-size:8px;color:#555;font-family:monospace;">ID: ${id}</span>
                        </div>
                        <div style="font-size:8px;padding:3px 6px;background:rgba(255,255,255,0.05);border-radius:4px;color:#666;border:1px solid #333;">${node.class || "STATIC"}</div>
                    </div>
                    <div style="padding:12px;display:grid;grid-template-columns:1fr;gap:6px;flex:1;">`;

                Object.entries(values).forEach(([k, v]) => {
                    html += `<div style="background:rgba(255,255,255,0.01);padding:6px 10px;border-radius:4px;display:flex;justify-content:space-between;align-items:center;border:1px solid rgba(255,255,255,0.02);">
                        <span style="font-size:9px;color:#666;text-transform:uppercase;font-weight:bold;">${k}</span>
                        <span style="font-size:10px;color:#aaa;text-align:right;word-break:break-all;padding-left:15px;">${safeText(v)}</span>
                    </div>`;
                });

                html += `</div></div>`;
            });

            html += `</div>`;
        }

        // --- SECTION: DEEP TELEMETRY (VERBOSE) ---
        const skip = ["author", "model_assigned", "h4_forensics", "nodes", "metadata", "h4_telemetry", "A", "B", "positive", "negative", "comments", "workflow_graph", "h4_timestamp"];
        const otherKeys = Object.keys(dna).filter(k => !skip.includes(k));
        if (otherKeys.length > 0) {
            html += `<div style="font-size:10px;color:#555;font-weight:bold;margin-bottom:10px;text-transform:uppercase;">🛰️ MISC LOGISTICS</div>`;
            html += `<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:10px;margin-bottom:30px;">`;
            otherKeys.forEach(k => {
                let val = dna[k];
                if (typeof val === "object") val = JSON.stringify(val);
                html += `<div style="background:rgba(0,0,0,0.15);border:1px solid #1a1a1a;padding:12px;border-radius:6px;">
                    <div style="font-size:8px;color:#444;margin-bottom:4px;font-weight:bold;">${k.toUpperCase()}</div>
                    <div style="font-size:11px;color:#888;word-break:break-all;line-height:1.3;">${safeText(val)}</div>
                </div>`;
            });
            html += `</div>`;
        }

        if (dna.comments) {
            html += `<div style="font-size:10px;color:#666;font-weight:bold;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">🛡️ FORENSIC ANNOTATIONS</div>`;
            html += `<div style="background:#080808;border-left:4px solid ${titleColor};padding:18px;color:#999;font-style:italic;font-size:12px;margin-bottom:30px;white-space:pre-wrap;line-height:1.5;">${safeText(dna.comments)}</div>`;
        }

        // --- SECTION: RAW DNA AUDIT ---
        html += `<div style="font-size:10px;color:${titleColor};margin-bottom:10px;font-weight:900;letter-spacing:1px;">📡 RAW DNA AUDIT (JSON)</div>`;
        html += `<div style="background:#030303;border:1px solid #1a1a1a;border-radius:8px;padding:20px;color:#00ff88;font-family:monospace;font-size:11px;overflow-x:auto;white-space:pre-wrap;word-break:break-word;box-shadow:inset 0 0 20px rgba(0,0,0,0.5);line-height:1.4;">${safeText(JSON.stringify(dna, null, 2))}</div>`;

        html += `</div>`;
        viewer.innerHTML = html;
        const closeBtn = viewer.querySelector(".h4-viewer-close");
        if (closeBtn) closeBtn.onclick = () => { this.show_viewer = false; this.scheduleDraw(); };
    }

    updateLightbox() {
        const lb = this.node.__h4_lightbox; if (!lb || !this.show_lightbox) return;
        const curIdx = Math.max(0, this.selected_idx); const item = this.history[curIdx]; if (!item) return;
        const url = api.apiURL(`/h4/thumbnail?filename=${encodeURIComponent(item.filename)}&subfolder=${encodeURIComponent(item.subfolder)}&type=${encodeURIComponent(item.type)}&full=true`);
        lb.innerHTML = `<div class="h4-lb-bg" style="position:absolute;inset:0;background:rgba(0,0,0,0.92);cursor:zoom-out;"></div><div class="h4-lb-nav h4-lb-prev" title="Previous Image" style="position:absolute;left:20px;top:50%;transform:translateY(-50%);font-size:60px;color:${COLORS.accent};cursor:pointer;z-index:10;user-select:none;">‹</div><div class="h4-lb-nav h4-lb-next" title="Next Image" style="position:absolute;right:20px;top:50%;transform:translateY(-50%);font-size:60px;color:${COLORS.accent};cursor:pointer;z-index:10;user-select:none;">›</div><div style="position:absolute;inset:40px 100px;display:flex;align-items:center;justify-content:center;pointer-events:none;"><img src="${url}" style="max-width:100%;max-height:100%;object-fit:contain;box-shadow:0 0 40px rgba(0,0,0,0.8);border:1px solid #333;" /></div><div class="h4-lb-close" title="Close Lightbox" style="position:absolute;top:20px;right:30px;font-size:40px;color:#666;cursor:pointer;z-index:20;">×</div><div style="position:absolute;bottom:20px;left:50%;transform:translateX(-50%);color:#aaa;font-size:12px;background:rgba(0,0,0,0.6);padding:8px 20px;border-radius:20px;border:1px solid #333;">${safeText(item.filename)} • ${curIdx + 1} / ${this.history.length}</div><style>.h4-lb-nav:hover { color:#fff !important; text-shadow:0 0 15px ${COLORS.accent}; } .h4-lb-close:hover { color:${COLORS.danger} !important; }</style>`;
        lb.querySelector(".h4-lb-bg").onclick = () => { this.show_lightbox = false; this.scheduleDraw(); };
        lb.querySelector(".h4-lb-close").onclick = () => { this.show_lightbox = false; this.scheduleDraw(); };
        lb.querySelector(".h4-lb-prev").onclick = (e) => { e.stopPropagation(); this.selected_idx = Math.max(0, this.selected_idx - 1); this.fetchSidecar(this.selected_idx); this.updateLightbox(); this.scheduleDraw(); };
        lb.querySelector(".h4-lb-next").onclick = (e) => { e.stopPropagation(); this.selected_idx = Math.min(this.history.length - 1, this.selected_idx + 1); this.fetchSidecar(this.selected_idx); this.updateLightbox(); this.scheduleDraw(); };
    }

    syncDOM() {
        const node = this.node; if (!node || !node.graph) { activeNodes.delete(this); return; }
        const mesh = getGrid(node); const pts = mesh.pts; const scale = app.canvas.ds.scale; const ds = app.canvas.ds; const rect = app.canvas.canvas.getBoundingClientRect();
        const sync = (el, pt, visible, opacity = 1) => { if (!el) return; if (!visible || scale < 0.3) { if (el.parentNode) el.remove(); return; } if (!el.parentNode) document.body.appendChild(el); const sx = node.pos[0] * scale + pt.x * scale + ds.offset[0] * scale + rect.left; const sy = node.pos[1] * scale + pt.y * scale + ds.offset[1] * scale + rect.top; el.style.transform = `translate3d(${sx}px, ${sy}px, 0) scale(${scale})`; el.style.transformOrigin = "top left"; el.style.width = `${pt.w}px`; el.style.height = `${pt.h}px`; el.style.opacity = `${opacity}`; el.style.display = "block"; };
        sync(node.__h4_prefix, pts.prefix_box, true); sync(node.__h4_path, pts.path_box, true);

        if (this.params_anim > 0.005) {
            const t = easeOutCubic(clamp01(this.params_anim));
            sync(node.__h4_core_drawer, pts.drawer_p, true, t);
            if (this.detail_anim > 0.005 && node.__h4_detaildrawer?.innerHTML) {
                const t2 = easeOutCubic(clamp01(this.detail_anim));
                sync(node.__h4_detaildrawer, pts.drawer_detail, true, t2);
            }
        } else if (node.__h4_core_drawer?.parentNode) {
            node.__h4_core_drawer.remove(); node.__h4_detaildrawer.remove();
        }
        if (!this._last_detailed_id && this.detail_anim < 0.005 && node.__h4_detaildrawer?.parentNode) node.__h4_detaildrawer.remove();
        if (this.meta_anim > 0.005) { const t = easeOutCubic(clamp01(this.meta_anim)); sync(node.__h4_metadrawer, pts.drawer_m, true, t); } else if (node.__h4_metadrawer?.parentNode) node.__h4_metadrawer.remove();
        if (this.custom_meta_anim > 0.005) { const t = easeOutCubic(clamp01(this.custom_meta_anim)); sync(node.__h4_customdrawer, pts.drawer_custom, true, t); } else if (node.__h4_customdrawer?.parentNode) node.__h4_customdrawer.remove();
        if (this.footer_anim > 0.005) { const t = easeOutCubic(clamp01(this.footer_anim)); sync(node.__h4_history_rail, { ...pts.history_rail, y: mesh.baseH + 10 + (1 - t) * 40 }, true, t); } else if (node.__h4_history_rail?.parentNode) node.__h4_history_rail.remove();
        if (this.viewer_anim > 0.005) { const t = easeOutCubic(clamp01(this.viewer_anim)); sync(node.__h4_viewerdrawer, pts.drawer_viewer, true, Math.max(0, t)); } else if (node.__h4_viewerdrawer?.parentNode) node.__h4_viewerdrawer.remove();
        if (this.show_lightbox) { if (!node.__h4_lightbox.parentNode) document.body.appendChild(node.__h4_lightbox); node.__h4_lightbox.style.display = "block"; } else if (node.__h4_lightbox.parentNode) node.__h4_lightbox.remove();
    }
}

function cloakWidget(w) { if (!w) return; w.type = "converted-widget"; w.label = ""; w.computeSize = () => [0, -4]; w.draw = () => { }; if (w.inputEl) w.inputEl.style.display = "none"; if (w.element) w.element.style.display = "none"; }
function makeFloatingEl(tag, cls = "") { const el = document.createElement(tag); el.className = cls; el.style.position = "fixed"; el.style.zIndex = "100"; el.style.display = "none"; el.style.background = COLORS.panel; el.style.border = "1.5px solid #222"; el.style.color = COLORS.accent; el.style.padding = "0"; el.style.fontFamily = "monospace"; el.style.boxSizing = "border-box"; el.style.willChange = "transform, opacity"; el.style.overflowY = "auto"; el.style.overflowX = "hidden"; return el; }

function kineticLoop() { activeNodes.forEach(ui => ui.syncDOM()); requestAnimationFrame(kineticLoop); }
requestAnimationFrame(kineticLoop);

app.registerExtension({
    name: "h4.SmartSave.Core.Fixed",
    async beforeRegisterNodeDef(nodeType, nodeDef) {
        if (nodeDef.name !== "H4_SmartSave") return;
        nodeType.prototype.onNodeCreated = function () {
            this.h4_ui = new SmartSaveUI(this); activeNodes.add(this.h4_ui);
            const styleId = "h4-smartsave-kinetic-styles"; if (!document.getElementById(styleId)) { const s = document.createElement("style"); s.id = styleId; s.innerHTML = `.h4gridscroll::-webkit-scrollbar { width:4px; height:4px; } .h4gridscroll::-webkit-scrollbar-track { background:transparent; } .h4gridscroll::-webkit-scrollbar-thumb { background:#333; border-radius:4px; } .h4gridscroll::-webkit-scrollbar-thumb:hover { background:#00f2ff; }`; document.head.appendChild(s); }
            this.__h4_prefix = makeFloatingEl("input", "h4-grid-prefix");
            this.__h4_prefix.setAttribute("data-h4-tip", "Type your name here to save it into the image file.");

            this.__h4_path = makeFloatingEl("input", "h4-grid-path");
            this.__h4_path.setAttribute("data-h4-tip", "Choose where on your computer you want to save your images.");

            this.__h4_core_drawer = makeFloatingEl("div", "h4gridscroll h4-grid-drawer");
            this.__h4_detaildrawer = makeFloatingEl("div", "h4gridscroll h4-grid-details");
            this.__h4_metadrawer = makeFloatingEl("div", "h4gridscroll h4-grid-meta"); this.__h4_customdrawer = makeFloatingEl("div", "h4gridscroll h4-grid-custom");
            this.__h4_viewerdrawer = makeFloatingEl("div", "h4gridscroll h4-grid-viewer"); this.__h4_history_rail = makeFloatingEl("div", "h4-grid-history");
            this.__h4_lightbox = makeFloatingEl("div", "h4-grid-lightbox"); Object.assign(this.__h4_lightbox.style, { inset: "0", width: "100%", height: "100%", zIndex: "5000", background: "rgba(0,0,0,0.95)" });
            const bindWidgets = () => {
                if (!this.widgets) return false;
                this.widgets.forEach(w => {
                    if (!w) return;
                    if (w.name === "filename_prefix") { this.__h4_prefix.value = w.value ?? ""; this.__h4_prefix.oninput = () => { w.value = this.__h4_prefix.value; }; }
                    else if (w.name === "output_path") { this.__h4_path.value = w.value ?? ""; this.__h4_path.oninput = () => { w.value = this.__h4_path.value; }; }
                    else if (w.name === "author") { const inp = this.__h4_metadrawer.querySelector(".h4-meta-author"); if (inp) { inp.value = w.value ?? ""; inp.oninput = () => { w.value = inp.value; }; } }
                    else if (w.name === "comments") { const tx = this.__h4_metadrawer.querySelector(".h4-meta-comments"); if (tx) { tx.value = w.value ?? ""; tx.oninput = () => { w.value = tx.value; }; } }
                    else if (w.name === "save_mode") this.__h4_save_mode_widget = w;
                    else if (w.name === "metadata_mode" || w.name === "json_mode") {
                        const sel = this.__h4_metadrawer.querySelector(w.name === "metadata_mode" ? ".h4-meta-mode" : ".h4-json-mode");
                        if (sel) { sel.innerHTML = ""; (w.options?.values || []).forEach(v => { const o = document.createElement("option"); o.value = v; o.text = v; sel.add(o); }); sel.value = w.value; sel.onchange = () => { w.value = sel.value; this.h4_ui.show_custom_meta = this.__h4_metadrawer.querySelector(".h4-meta-mode")?.value === "Custom" || this.__h4_metadrawer.querySelector(".h4-json-mode")?.value === "Custom"; this.setDirtyCanvas(true); }; }
                    } else if (w.name === "custom_json") { const raw = this.__h4_customdrawer.querySelector(".h4-meta-raw"); if (raw) { raw.value = w.value || raw.value; raw.oninput = () => { w.value = raw.value; }; } }
                    cloakWidget(w);
                }); return true;
            };
            this.__h4_metadrawer.innerHTML = `<div style="color:${COLORS.accent};margin:12px;font-weight:900;border-bottom:1.5px solid #333;padding-bottom:6px;font-size:14px;">h4 // META ENGINE</div><div style="padding:0 15px 15px 15px;"><div style="font-size:9px;color:#aaa;margin-bottom:2px;">AUTHOR</div><input class="h4-meta-author" type="text" placeholder="h4" style="width:100%;background:#111;border:1px solid #333;color:#fff;padding:6px;margin-bottom:10px;box-sizing:border-box;" /><div style="font-size:9px;color:#aaa;margin-bottom:2px;">EMBED MODE</div><select class="h4-meta-mode" style="width:100%;background:#111;border:1px solid #333;color:${COLORS.accent};padding:6px;margin-bottom:10px;"></select><div style="font-size:9px;color:#aaa;margin-bottom:2px;">JSON MODE</div><select class="h4-json-mode" style="width:100%;background:#111;border:1px solid #333;color:${COLORS.accent};padding:6px;margin-bottom:10px;"></select><div style="font-size:9px;color:#aaa;margin-bottom:2px;">COMMENTS</div><textarea class="h4-meta-comments" style="width:100%;height:52px;background:#111;border:1px solid #333;color:#eee;font-family:monospace;font-size:11px;padding:6px;margin-bottom:15px;resize:none;box-sizing:border-box;" placeholder="h4 - [ Approved ] - (b'.')b"></textarea><button class="h4-viewer-btn" title="Preview the metadata that will be embedded in your output images." style="width:100%;padding:8px;background:rgba(0,242,255,0.05);border:1px solid ${COLORS.accent};color:${COLORS.accent};cursor:pointer;font-weight:bold;border-radius:4px;font-size:11px;">🔍 PREVIEW EMBEDDED METADATA</button></div>`;
            this.__h4_customdrawer.innerHTML = `<div style="color:${COLORS.forensic};margin:12px;font-weight:900;border-bottom:1.5px solid #333;padding-bottom:6px;font-size:14px;">h4 // CUSTOM DNA</div><div style="padding:0 15px 15px 15px;"><div style="font-size:10px;color:${COLORS.forensic};margin-bottom:6px;font-style:italic;">Raw JSON Blueprint</div><textarea class="h4-meta-raw" style="width:100%;height:240px;background:#0a0a0a;border:1.5px solid ${COLORS.forensic};color:#fff;font-family:monospace;font-size:11px;padding:10px;resize:none;box-sizing:border-box;">{
  "author": "h4",
  "model_assigned": "Awesome Model of Awesomeness",
  "comments": "h4 - [ Approved ] - (b'.')b"
}</textarea></div>`;
            const previewBtn = this.__h4_metadrawer.querySelector(".h4-viewer-btn"); if (previewBtn) previewBtn.onclick = () => { this.h4_ui.markViewerDirty(); this.h4_ui.show_viewer = !this.h4_ui.show_viewer; this.setDirtyCanvas(true); };
            bindWidgets(); setTimeout(bindWidgets, 300); setTimeout(bindWidgets, 900);
            return this;
        };
        nodeType.prototype.onRemoved = function () { if (this.h4_ui) activeNodes.delete(this.h4_ui);[this.__h4_prefix, this.__h4_path, this.__h4_core_drawer, this.__h4_detaildrawer, this.__h4_metadrawer, this.__h4_customdrawer, this.__h4_viewerdrawer, this.__h4_history_rail, this.__h4_lightbox].forEach(el => el?.remove()); };
        nodeType.prototype.onExecuted = function (message) {
            if (this.h4_ui) {
                console.log("[h4] Execution Complete. Anchoring DNA to History Rail...");
                if (message.images && message.images.length > 0) {
                    // --- BATCH AWARE INJECTION ---
                    [...message.images].reverse().forEach(img => {
                        this.h4_ui.history.unshift({ ...img, timestamp: Date.now() });
                    });
                    this.h4_ui.history = this.h4_ui.history.slice(0, 50);
                    this.h4_ui.selected_idx = 0;
                    this.h4_ui.scroll_idx = 0;
                    this.h4_ui.current_sidecar = message.images[0].sidecar || null;
                    this.h4_ui.updateHistoryRail();
                }
                this.h4_ui.markParamsDirty();
                this.h4_ui.fetchHistory(true);
            }
            if (message.images) { this.__h4_live_imgs = message.images.map(i => { const img = new Image(); img.onload = () => this.setDirtyCanvas(true, true); img.src = api.apiURL(`/view?filename=${encodeURIComponent(i.filename)}&subfolder=${encodeURIComponent(i.subfolder)}&type=${encodeURIComponent(i.type)}`); return img; }); }
            this.imgs = null; this.images = null; this.widgets = []; // --- PREVENT AUTO-WIDGET INJECTION ---
            this.setDirtyCanvas(true, true);
        };
        nodeType.prototype.onResize = function (size) { if (size[0] < MIN_SIZE[0]) size[0] = MIN_SIZE[0]; if (size[1] < MIN_SIZE[1]) size[1] = MIN_SIZE[1]; return size; };
        const origMouseDown = nodeType.prototype.onMouseDown;
        nodeType.prototype.onMouseDown = function (e, pos) {
            if (!this.h4_ui) return origMouseDown ? origMouseDown.apply(this, arguments) : false;
            try {
                const mesh = getGrid(this); const pts = mesh.pts; const px = pos[0]; const py = pos[1];
                const hit = r => r && px >= r.x - 4 && px <= r.x + r.w + 4 && py >= r.y - 4 && py <= r.y + r.h + 4;
                if (hit(pts.preview_area)) {
                    const now = Date.now();
                    if (this._last_clk && (now - this._last_clk < 300)) { this.h4_ui.show_lightbox = true; this.h4_ui.updateLightbox(); this.h4_ui.scheduleDraw(); return true; }
                    this._last_clk = now; return true; // CAPTURE: Stop drag on image click
                }
                if (hit(pts.btn_p)) { this.h4_ui.show_params = !this.h4_ui.show_params; this.h4_ui.markParamsDirty(); return true; }
                if (hit(pts.btn_m)) { this.h4_ui.show_meta = !this.h4_ui.show_meta; this.setDirtyCanvas(true); return true; }
                if (hit(pts.btn_h)) { this.h4_ui.setHistoryOpen(!this.h4_ui.show_history); return true; }
                if (hit(pts.toggle_box)) { if (this.__h4_save_mode_widget) { this.__h4_save_mode_widget.value = !this.__h4_save_mode_widget.value; this.setDirtyCanvas(true); } return true; }
                if (hit(pts.scrub_prev)) { this.h4_ui.selected_idx = this.h4_ui.selected_idx <= 0 ? 0 : this.h4_ui.selected_idx - 1; this.h4_ui.fetchSidecar(this.h4_ui.selected_idx); return true; }
                if (hit(pts.scrub_next)) { if (this.h4_ui.selected_idx === -1) this.h4_ui.selected_idx = 0; else this.h4_ui.selected_idx = Math.min(this.h4_ui.history.length - 1, this.h4_ui.selected_idx + 1); this.h4_ui.fetchSidecar(this.h4_ui.selected_idx); return true; }
                // CAPTURE: Stop drag on HUD background click
                if (px >= 0 && px <= mesh.w && py >= 0 && py <= mesh.baseH) return true;
                return origMouseDown ? origMouseDown.apply(this, arguments) : false;
            } catch (err) {
                console.error("[h4] Interaction Fault:", err);
                return true; // Emergency capture
            }
        };
        nodeType.prototype.onMouseMove = function (e, pos) {
            if (!this.h4_ui) return;
            const pts = getGrid(this).pts; const px = pos[0]; const py = pos[1];
            const hit = r => r && px >= r.x - 4 && px <= r.x + r.w + 4 && py >= r.y - 4 && py <= r.y + r.h + 4;
            if (hit(pts.btn_p)) showTip("Parameters - Settings for everything in the workflow that makes the image the image", e);
            else if (hit(pts.btn_m)) showTip("Metadata - Image DNA Thumbprint. Modify, edit, view, and otherwise control the meta of your image - Your image , Your data, Your business", e);
            else if (hit(pts.btn_h)) showTip("Histories - A Film Strip Styled thumbnailed history of your output folder // [now with colour coding]", e);
            else if (hit(pts.prefix_box) || hit(pts.path_box) || hit(pts.toggle_box)) { /* handled by DOM tips */ }
            else hideTip();
        };
        nodeType.prototype.onMouseLeave = function () { hideTip(); };
        nodeType.prototype.onDrawForeground = function (ctx) {
            if (!this.h4_ui) return;
            ctx.save();
            try {
                const ui = this.h4_ui; const mesh = getGrid(this); const pts = mesh.pts;
                ui.params_anim = lerp(ui.params_anim, ui.show_params ? 1 : 0, ANIM_SPEED); ui.meta_anim = lerp(ui.meta_anim, ui.show_meta ? 1 : 0, ANIM_SPEED);
                ui.custom_meta_anim = lerp(ui.custom_meta_anim, ui.show_custom_meta ? 1 : 0, ANIM_SPEED); ui.footer_anim = lerp(ui.footer_anim, ui.show_history ? 1 : 0, ANIM_SPEED);
                ui.viewer_anim = lerp(ui.viewer_anim, ui.show_viewer ? 1 : 0, ANIM_SPEED);
                ui.detail_anim = lerp(ui.detail_anim, ui._last_detailed_id ? 1 : 0, ANIM_SPEED);
                const animStillMoving = Math.abs(ui.params_anim - (ui.show_params ? 1 : 0)) > 0.005 || Math.abs(ui.meta_anim - (ui.show_meta ? 1 : 0)) > 0.005 || Math.abs(ui.footer_anim - (ui.show_history ? 1 : 0)) > 0.005 || Math.abs(ui.viewer_anim - (ui.show_viewer ? 1 : 0)) > 0.005 || Math.abs(ui.detail_anim - (ui._last_detailed_id ? 1 : 0)) > 0.005;
                if (animStillMoving) ui.scheduleDraw();
                if (ui.show_params) { if (ui.current_sidecar) ui.updateParamsFromSidecar(ui.current_sidecar); else ui.crawlWorkflow(); }
                if (ui.show_viewer) ui.showForensicViewer();

                // --- NUCLEAR BLOAT REMOVAL ---
                this.widgets = []; this.imgs = null; this.images = null;
                if (this.outputs) this.outputs.forEach(o => { o.label = ""; o.name = ""; });

                ui.syncDOM();
                this.size[0] = mesh.w; this.size[1] = mesh.h; // --- GEOMETRY ENFORCEMENT ---
                ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, mesh.w, mesh.baseH); ctx.strokeStyle = COLORS.border; ctx.lineWidth = 1; ctx.strokeRect(0, 0, mesh.w, mesh.baseH);
                let activeImg = null; if (ui.selected_idx >= 0 && ui.history[ui.selected_idx]) { const item = ui.history[ui.selected_idx]; const url = api.apiURL(`/h4/thumbnail?filename=${encodeURIComponent(item.filename)}&subfolder=${encodeURIComponent(item.subfolder)}&type=${encodeURIComponent(item.type)}&full=true`); activeImg = ui.full_imgs[url]; if (!activeImg) { const img = new Image(); img.onload = () => { ui.full_imgs[url] = img; this.setDirtyCanvas(true); }; img.src = url; } } else if (this.__h4_live_imgs?.length) activeImg = this.__h4_live_imgs[0];
                if (activeImg && activeImg.width > 0 && ui.viewer_anim < 0.98) {
                    const area = pts.preview_area; ctx.save(); ctx.beginPath(); ctx.rect(area.x, area.y, area.w, area.h); ctx.clip(); ctx.fillStyle = "#000"; ctx.fillRect(area.x, area.y, area.w, area.h);
                    const gr = Math.max(0.01, Math.min(area.w / activeImg.width, area.h / activeImg.height)); const dw = activeImg.width * gr; const dh = activeImg.height * gr; const dx = area.x + (area.w - dw) / 2; const dy = area.y + (area.h - dh) / 2;
                    if (ui.viewer_anim > 0.05 && ui.viewer_anim < 0.9) { const time = Date.now() * 0.001; for (let i = 0; i < 4; i++) { const sy = Math.random() * activeImg.height; const sh = Math.random() * (activeImg.height * 0.1); const ox = (Math.random() - 0.5) * 30 * Math.sin(time * 20); ctx.save(); ctx.beginPath(); ctx.rect(dx, dy + (sy / activeImg.height) * dh, dw, (sh / activeImg.height) * dh); ctx.clip(); ctx.drawImage(activeImg, dx + ox, dy, dw, dh); ctx.restore(); } } else ctx.drawImage(activeImg, dx, dy, dw, dh); ctx.restore();
                }
                ctx.fillStyle = COLORS.dim; ctx.font = "10px monospace"; ctx.textAlign = "center"; ctx.fillText("IDENTITY ANCHOR", pts.prefix_box.x + pts.prefix_box.w / 2, pts.prefix_box.y - 8); ctx.fillText("OUTPUT PATH", pts.path_box.x + pts.path_box.w / 2, pts.path_box.y - 8);
                ctx.textAlign = "center"; ctx.font = "bold 16px monospace"; ctx.fillStyle = COLORS.accent; ctx.fillText("h4 // SmartSave v2.0", pts.title.x, pts.title.y);
                const isSave = !!this.__h4_save_mode_widget?.value;
                ctx.save(); ctx.translate(pts.mode.x - pts.mode.w / 2, pts.mode.y - 12);
                ctx.fillStyle = isSave ? "rgba(0,255,138,0.08)" : "rgba(255,215,0,0.08)"; ctx.strokeStyle = isSave ? COLORS.save : COLORS.preview; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.roundRect(0, 0, pts.mode.w, pts.mode.h, 12); ctx.fill(); ctx.stroke();
                ctx.font = "bold 10px monospace"; ctx.fillStyle = isSave ? COLORS.save : COLORS.preview;
                ctx.textAlign = "center"; ctx.fillText(isSave ? "● SAVE TO DISK" : "● PREVIEW ONLY", pts.mode.w / 2, 16);
                ctx.restore();

                ctx.save(); ctx.translate(pts.toggle_box.x, pts.toggle_box.y);
                const tW = pts.toggle_box.w; const tH = pts.toggle_box.h; const tR = tH / 2;
                // --- FULL PILL STEALTH TRACK ---
                ctx.beginPath(); ctx.roundRect(0, 0, tW, tH, tR);
                ctx.fillStyle = "#050505"; ctx.fill(); ctx.strokeStyle = "#222"; ctx.lineWidth = 1; ctx.stroke();
                // Active Pill Glow
                if (isSave) {
                    ctx.shadowBlur = 8; ctx.shadowColor = COLORS.save; ctx.fillStyle = COLORS.save + "44";
                    ctx.beginPath(); ctx.roundRect(tW / 2 + 1, 2, tW / 2 - 3, tH - 4, tR - 2); ctx.fill();
                } else {
                    ctx.shadowBlur = 8; ctx.shadowColor = COLORS.preview; ctx.fillStyle = COLORS.preview + "44";
                    ctx.beginPath(); ctx.roundRect(2, 2, tW / 2 - 3, tH - 4, tR - 2); ctx.fill();
                }
                // Tactile Knob
                const knobX = isSave ? tW - 18 : 2;
                ctx.shadowBlur = 12; ctx.shadowColor = "#000";
                ctx.fillStyle = "#333"; ctx.beginPath(); ctx.roundRect(knobX, 2, 16, 16, 8); ctx.fill();
                ctx.strokeStyle = "#444"; ctx.lineWidth = 1; ctx.stroke();
                // Knob Polish
                ctx.shadowBlur = 0; ctx.fillStyle = "rgba(255,255,255,0.05)";
                ctx.beginPath(); ctx.arc(knobX + 8, 2 + 8, 4, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
                const drawButton = (r, label, active = false, fg = COLORS.dim, glow = false) => { ctx.save(); if (glow) { ctx.shadowBlur = 10; ctx.shadowColor = COLORS.accent; } ctx.fillStyle = active ? "#111" : "rgba(28,28,28,0.9)"; ctx.strokeStyle = active ? COLORS.accent : (glow ? COLORS.accent : COLORS.border); ctx.lineWidth = active || glow ? 1.5 : 1; ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 5); ctx.fill(); ctx.stroke(); ctx.fillStyle = active || glow ? COLORS.accent : fg; ctx.font = `bold ${Math.round(r.w * 0.45)}px monospace`; ctx.textAlign = "center"; ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + (r.h * 0.15)); ctx.restore(); };
                drawButton(pts.btn_p, "P", ui.show_params); drawButton(pts.btn_m, "M", ui.show_meta); drawButton(pts.btn_h, "H", ui.show_history);
                if (ui.history.length > 0) { drawButton(pts.scrub_prev, "⟨", false, COLORS.accent, true); drawButton(pts.scrub_next, "⟩", false, COLORS.accent, true); }
                if (activeImg && activeImg.width > 0) { ctx.font = "11px monospace"; ctx.fillStyle = COLORS.accent; ctx.textAlign = "center"; ctx.fillText(`${activeImg.width} x ${activeImg.height}`, pts.lod_badge.x, pts.lod_badge.y); }
                this.imgs = null; this.images = null; // --- SECURE TERMINAL PURGE ---
            } catch (e) { } finally { ctx.restore(); }
        };
    },
});