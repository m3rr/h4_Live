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
h4Tooltip.style.cssText = `position:fixed;z-index:11000;background:rgba(5,5,5,0.98);border:1px solid ${COLORS.accent};color:${COLORS.accent};padding:10px 14px;font-size:12px;font-family:monospace;pointer-events:none;border-radius:6px;display:none;max-width:280px;box-shadow:0 0 20px rgba(0,0,0,0.8);line-height:1.5;font-weight:bold;`;
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
        let content = text.replace("//", "<br/><span style='color:#666;font-size:10px;font-style:italic;'>") + (text.includes("//") ? "</span>" : "");
        // GHOST_RADAR DISABLED BY USER COMMAND
        h4Tooltip.innerHTML = content;
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
    if (target) {
        showTip(target.getAttribute("data-h4-tip"), e);
    } else {
        hideTip();
    }
});
document.addEventListener("mousemove", (e) => {
    const target = e.target.closest("[data-h4-tip]");
    if (!target) {
        hideTip();
    } else {
        updateTipPos(e);
    }
});
document.addEventListener("mouseout", (e) => {
    const target = e.target.closest("[data-h4-tip]");
    if (!target) {
        hideTip();
    }
});
window.addEventListener("keyup", (e) => {
    if (e.key === "Alt" || e.key === "Control" || e.key === "Meta" || e.key === "Escape") {
        hideTip();
    }
});
window.addEventListener("blur", () => hideTip());

// --- FORENSIC AESTHETIC HARDENING ---
const styleId = "h4-hud-global-styles";
if (!document.getElementById(styleId)) {
    const s = document.createElement("style");
    s.id = styleId;
    s.innerHTML = `
            .h4-hud-el { user-select: none !important; -webkit-user-drag: none !important; -webkit-touch-callout: none; }
            .h4-hud-el img { -webkit-user-drag: none !important; pointer-events: none !important; }
            .h4-hud-el input, .h4-hud-el textarea { user-select: text !important; -webkit-user-drag: auto !important; }
            .h4gridscroll::-webkit-scrollbar { width:4px; height:4px; }
            .h4gridscroll::-webkit-scrollbar-track { background:transparent; }
            .h4gridscroll::-webkit-scrollbar-thumb { background:#333; border-radius:4px; }
            .h4gridscroll::-webkit-scrollbar-thumb:hover { background:#00f2ff; }
            .VHS_floatinghelp { pointer-events: none !important; }

            /* Pinned panel border glow */
            .h4-grid-drawer[data-pinned="true"] {
                border-right: 1.5px solid #00f2ff !important;
                box-shadow: 4px 0 24px rgba(0,242,255,0.08);
            }

            /* Popout window scroll */
            .h4gridscroll {
                scrollbar-width: thin;
                scrollbar-color: #333 transparent;
            }

            /* Prevent text selection in panel headers */
            .h4-panel-pin-btn,
            .h4-panel-popout-btn {
                user-select: none;
                -webkit-user-select: none;
            }

            @keyframes h4-thumb-in {
                from { opacity: 0; transform: translateY(8px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }

            @keyframes h4-glitch-flicker {
                0% { opacity: 0.1; transform: scale(1); }
                5% { opacity: 0.8; transform: skewX(10deg); }
                10% { opacity: 0.2; transform: skewX(-5deg); }
                15% { opacity: 0.9; }
                20% { opacity: 0.1; }
                50% { opacity: 1; transform: scale(1.05); }
                51% { opacity: 0.2; }
                100% { opacity: 0.1; }
            }

            @keyframes h4-scanline {
                0% { top: -10%; }
                100% { top: 110%; }
            }

            .h4-loading-scanline {
                position: absolute;
                left: 0;
                width: 100%;
                height: 2px;
                background: #00f2ff;
                box-shadow: 0 0 8px #00f2ff;
                animation: h4-scanline 1.5s linear infinite;
                z-index: 5;
            }

            .h4-loading-text {
                position: absolute;
                inset: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #00f2ff;
                font-family: monospace;
                font-size: 9px;
                font-weight: 900;
                letter-spacing: 1px;
                animation: h4-glitch-flicker 1.5s infinite;
                z-index: 4;
                text-shadow: 0 0 5px rgba(0,242,255,0.5);
            }

            /* --- SEMANTIC PANEL STYLES --- */
            .h4-panel {
                position: fixed; z-index: 100; display: none;
                background: rgba(10,10,10,0.98); border: 1.5px solid #222; color: #00f2ff;
                font-family: monospace; box-sizing: border-box;
                overflow-y: auto; overflow-x: hidden;
            }
            .h4-panel-header {
                margin: 12px; font-weight: 900; 
                border-bottom: 1.5px solid #333; padding-bottom: 6px; font-size: 14px;
                display: flex; justify-content: space-between; align-items: center;
            }
            .h4-panel-body {
                padding: 0;
            }
            .h4-btn {
                background: rgba(255,255,255,0.04); border: 1px solid #444; color: #666;
                border-radius: 4px; padding: 3px 7px; font-size: 10px; cursor: pointer;
                font-family: monospace; font-weight: bold;
            }
            .h4-btn.active {
                background: rgba(0, 242, 255, 0.12); border-color: #00f2ff; color: #00f2ff;
            }
            .h4-input-group {
                margin-bottom: 10px;
                padding: 0 15px;
            }
            .h4-input-label {
                font-size: 9px; color: #aaa; margin-bottom: 2px;
            }
            .h4-input {
                width: 100%; background: #111; border: 1px solid #333; color: #fff;
                padding: 6px; box-sizing: border-box;
            }
            .h4-input.h4-select {
                color: #00f2ff;
            }
            .h4-card {
                margin: 0 12px 12px 12px; background: rgba(20,20,20,0.55); border: 1px solid #222;
                border-radius: 6px; overflow: hidden; cursor: pointer; position: relative;
            }
            .h4-card.h4-forensic {
                background: rgba(36,28,8,0.45); border-color: #4a3a16;
            }
            .h4-card.h4-danger {
                border-color: #ff3333;
            }
            .h4-card-header {
                background: #222; color: #aaa; font-size: 10px; padding: 4px 8px;
                display: flex; justify-content: space-between;
            }
            .h4-forensic .h4-card-header {
                background: #2a220f; color: #ffd700;
            }
            .h4-danger .h4-card-header {
                background: #2d1212; color: #ff3333;
            }
            .h4-card-id {
                color: #555;
            }
            .h4-forensic .h4-card-id {
                color: #6c5730;
            }
            .h4-card-body {
                padding: 8px; max-height: 80px; overflow: hidden;
            }
            .h4-card-row {
                display: flex; justify-content: space-between; gap: 10px; margin-bottom: 2px;
                font-size: 10px; white-space: nowrap; overflow: hidden;
            }
            .h4-card-label {
                color: #555; overflow: hidden; text-overflow: ellipsis;
            }
            .h4-forensic .h4-card-label {
                color: #8e7a4f;
            }
            .h4-card-value {
                color: #00f2ff; text-align: right; overflow: hidden; text-overflow: ellipsis;
            }
            .h4-forensic .h4-card-value {
                color: #ffd700;
            }
            .h4-btn-swap {
                width: 100%; padding: 4px; border: none; background: rgba(255,255,255,0.03);
                color: #555; font-size: 9px; font-weight: bold; cursor: pointer; border-top: 1px solid #222;
            }
            .h4-forensic .h4-btn-swap {
                color: #7c6838; border-color: #333;
            }
            .h4-btn-swap.active {
                background: rgba(0, 242, 255, 0.12); color: #00f2ff;
            }
            .h4-forensic .h4-btn-swap.active {
                background: rgba(255, 215, 0, 0.15); color: #ffd700;
            }
        `;
    document.head.appendChild(s);
}

// --- NUCLEAR CLICK INVESTIGATOR REDACTED ---

// --- FORENSIC VISIBILITY DEBUGGER ---
window.addEventListener("keydown", (e) => {
    if (e.shiftKey && e.altKey) {
        document.querySelectorAll(".h4-hud-el").forEach(el => {
            el.style.outline = "2px solid red"; el.style.background = "rgba(255,0,0,0.1)"; el.style.pointerEvents = "auto";
        });
    }
});
window.addEventListener("keyup", (e) => {
    if (!e.shiftKey || !e.altKey) {
        document.querySelectorAll(".h4-hud-el").forEach(el => {
            el.style.outline = "none"; el.style.background = (el.className.includes("lightbox") ? "rgba(0,0,0,0.95)" : COLORS.panel);
            // Restore correct pointer events will be handled by next syncDOM loop
        });
    }
});

const MIN_SIZE = [850, 520];
const RAIL_H = 150;
const DRAWER_W = 340;
const DRAWER_GAP = 15;
const DETAIL_GAP = 8;
const ANIM_SPEED = 0.22;
const HISTORY_LIMIT_VISIBLE = 5;
const HISTORY_VISIBLE_MIN = 1;
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

// --- IMAGE FILE VALIDATION: Prevents non-image files from hitting the /view endpoint ---
const VALID_IMG_EXTS = new Set(["png", "jpg", "jpeg", "webp", "gif", "avif", "bmp", "tiff"]);
function isImageFile(filename) {
    if (!filename || typeof filename !== "string") return false;
    // Strip accidental " [output]" / " [input]" / " [temp]" suffix from concatenation artifacts
    const clean = filename.replace(/\s*\[(?:output|input|temp)\]\s*/gi, "").trim();
    const ext = clean.split(".").pop().toLowerCase();
    return VALID_IMG_EXTS.has(ext);
}
function cleanFilename(filename) {
    if (!filename) return filename;
    return filename.replace(/\s*\[(?:output|input|temp)\]\s*/gi, "").trim();
}

function isModalOpen() {
    // Detect standard ComfyUI modals, settings menus, and high-level overlays
    const check = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        const style = window.getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity) < 0.1) return false;
        // Verify it actually has dimensions to avoid stale empty shells
        const rect = el.getBoundingClientRect();
        return rect.width > 50 && rect.height > 50;
    };

    const isOpen = check(".comfy-modal") ||
        check(".comfy-dialog") ||             // <-- FIX: Catches standard ComfyUI dialogs (like logs)
        check("dialog[open]") ||              // <-- FIX: Catches native HTML5 dialogs used in newer ComfyUI updates
        check("#comfy-settings-dialog") ||    // <-- FIX: Catches settings ID specifically
        check(".comfy-settings-dialog") ||
        check(".p3-modal") ||
        check(".comfy-logging-logs") ||
        check(".comfy-menu-panel") ||
        check("[data-floating-panel]") ||
        check(".dialog-container") ||
        (app.ui?.settings?.visible === true);

    return isOpen;
}

function getGrid(node) {
    const baseW = Math.max(MIN_SIZE[0], node.size[0]);
    const baseH = Math.max(MIN_SIZE[1], node.size[1]);
    const cx = baseW / 2;
    const hudY = 72;
    const previewArea = { x: 74, y: 110, w: baseW - 148, h: baseH - 180 };

    // --- DYNAMIC FILMSTRIP: grows with node, caps at 10 thumbs ---
    const THUMB_W = 110;
    const THUMB_GAP = 12;
    const RAIL_NAV_W = 80;   // 40px nav arrow each side
    const RAIL_PAD = 30;     // 15px padding each side

    const histLen = node.h4_ui?.history?.length ?? 0;
    // How many full thumbs fit in the current node width?
    const maxFitByWidth = Math.floor(
        (baseW - RAIL_NAV_W - RAIL_PAD - THUMB_GAP) / (THUMB_W + THUMB_GAP)
    );
    const thumbCount = Math.min(
        HISTORY_LIMIT_VISIBLE,          // hard cap: never more than 10
        Math.max(1, histLen),         // never less than 1
        Math.max(1, maxFitByWidth)    // never more than node width allows
    );
    const railW = RAIL_NAV_W + RAIL_PAD + thumbCount * (THUMB_W + THUMB_GAP) - THUMB_GAP;
    const railX = baseW / 2 - railW / 2;

    return {
        w: baseW, h: baseH, baseH,
        pts: {
            title: { x: cx, y: 32 },
            lod_badge: { x: cx, y: baseH - 45, w: 100, h: 24 },
            prefix_box: { x: cx - 390, y: hudY - 12, w: 130, h: 24 },
            toggle_box: { x: cx - 226, y: hudY - 10, w: 46, h: 20 },
            mode: { x: cx - 92.5, y: 72, w: 145, h: 24 },
            queue_toggle_box: { x: cx + 20, y: hudY - 10, w: 46, h: 20 },
            queue_mode: { x: cx + 153.5, y: 72, w: 145, h: 24 },
            path_box: { x: cx + 275, y: hudY - 12, w: 130, h: 24 },
            btn_p: { x: baseW - 55, y: 150, w: BTN_SIZE, h: BTN_SIZE },
            btn_m: { x: 20, y: 150, w: BTN_SIZE, h: BTN_SIZE },
            btn_h: { x: 20, y: baseH - 55, w: BTN_SIZE, h: BTN_SIZE },
            preview_area: previewArea,
            drawer_p: { x: baseW + DRAWER_GAP, y: 10, w: DRAWER_W, h: baseH - 20 },
            drawer_m: { x: -DRAWER_W - DRAWER_GAP, y: 10, w: DRAWER_W, h: baseH - 20 },
            drawer_detail: { x: baseW + DRAWER_GAP + DRAWER_W + DETAIL_GAP, y: 10, w: DRAWER_W, h: baseH - 20 },
            drawer_custom: { x: -(DRAWER_W * 2 + DRAWER_GAP + DETAIL_GAP), y: 10, w: DRAWER_W, h: baseH - 20 },
            drawer_viewer: previewArea,
            history_rail: { x: railX, y: baseH + 10, w: railW, h: RAIL_H },
        },
    };
}

class SmartSaveUI {
    constructor(node) {
        this.node = node; this.history = []; this.bitmap_cache = {}; this._bitmap_pending = new Set(); this.selected_idx = -1; this.current_sidecar = null;
        this.footer_anim = 0; this.params_anim = 0; this.meta_anim = 0; this.detail_anim = 0; this.custom_meta_anim = 0; this.viewer_anim = 0;
        this.show_params = false; this.show_meta = false; this.show_history = false; this.show_custom_meta = false; this.show_viewer = false;
        this.scroll_idx = 0; this._dirty_params = true; this._dirty_viewer = true; this._redrawTimer = null;
        this.show_lightbox = false; this.swapped_ids = new Set();
        this._historyInflight = false; this._sidecarInflight = false;
        this._dom_dirty = true;  // Start dirty so first syncDOM runs
        this._lastHistorySignature = ""; this._lastSidecarSignature = "";
        this.pollTimer = null;
        this.backgroundPollTimer = null;
        this.queue_sessions = [];
        this.queue_memory_enabled = true; // Default to true so batches are organized automatically
        this.queue_deck_expanded = false;
        this.queue_deck_idx = 0;
        this.queue_deck_img_idx = 0;

        // --- OUTPUT TRAVERSAL STATE ---
        this.output_traversal_enabled = false;
        this._outputTraversalFiles = [];
        this._outputTraversalLoading = false;
        this._outputTraversalIdx = 0;

        // Restore persisted queue sessions from localStorage across page reloads
        try {
            const savedQ = localStorage.getItem('h4_queue_sessions_' + this.node.id);
            if (savedQ) {
                const parsed = JSON.parse(savedQ);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    this.queue_sessions = parsed;
                }
            }
        } catch (e) {
            console.warn("[h4] Failed to load persisted queue sessions:", e);
        }

        // --- NEW: PANNEL MODE STATE ---
        this.panelMode = 'docked';   // 'docked' | 'pinned' | 'popout'
        this.pinnedPos = { x: 0, y: 0, w: 340, h: window.innerHeight };
        this.popoutWin = null;        // reference to the window.open() object
        this.popoutReady = false;     // true once the popout window has loaded and is ready for postMessage
        this._popoutMessageHandler = null;

        this.fetchHistory(false);
        this.startBackgroundPolling();
    }

    saveQueueSessions() {
        try {
            if (this.node && this.node.id) {
                localStorage.setItem('h4_queue_sessions_' + this.node.id, JSON.stringify(this.queue_sessions.slice(0, 20)));
            }
        } catch (e) {
            console.warn("[h4] Failed to persist queue sessions:", e);
        }
    }

    async fetchOutputTraversal() {
        if (this._outputTraversalLoading) return;
        this._outputTraversalLoading = true;
        this.updateHistoryRail();
        try {
            const url = api.apiURL(`/h4/smart_save/list_folder?subfolder=&type=output&recursive=true`);
            const res = await api.fetchApi(url);
            if (res.ok) {
                const data = await res.json();
                this._outputTraversalFiles = (data.files || []).filter(f => isImageFile(f.filename));
                this._outputTraversalIdx = 0;
            }
        } catch (e) {
            console.warn("[h4] Output traversal fetch fault:", e);
        } finally {
            this._outputTraversalLoading = false;
            this.updateHistoryRail();
            this.scheduleDraw();
        }
    }

    scheduleDraw() { if (this._redrawTimer) return; this._redrawTimer = setTimeout(() => { this._redrawTimer = null; this.node.setDirtyCanvas(true, true); }, 1); }
    markParamsDirty() { this._dirty_params = true; this.scheduleDraw(); }
    markViewerDirty() { this._dirty_viewer = true; this.scheduleDraw(); }
    markDOMDirty() { this._dom_dirty = true; }

    // --- HISTORY RAIL LIFECYCLE: Open/close with automatic polling ---
    setHistoryOpen(open) {
        this.show_history = !!open;
        if (this.show_history) {
            this._histOpening = true; // Trigger animation
            this.fetchHistory(false);
            this.startPolling();
        } else {
            this.stopPolling();
        }
        this.updateHistoryRail();
        this.scheduleDraw();
    }

    // --- FILMSTRIP POLLING ENGINE: Runs only while the history rail is open ---
    startPolling() {
        if (this.pollTimer) return;
        this.pollTimer = setInterval(() => {
            if (!this.show_history) return this.stopPolling();
            this.fetchHistory(false);
        }, 3000); // Poll every 3 seconds while the rail is visible
    }

    stopPolling() {
        if (this.pollTimer) clearInterval(this.pollTimer);
        this.pollTimer = null;
    }

    // --- BACKGROUND SYNC: Always running at low frequency (30s) ---
    startBackgroundPolling() {
        if (this.backgroundPollTimer) return;
        this.backgroundPollTimer = setInterval(() => {
            // Only poll if the aggressive foreground poll isn't already active
            if (!this.pollTimer) this.fetchHistory(false);
        }, 30000);
    }

    stopBackgroundPolling() {
        if (this.backgroundPollTimer) clearInterval(this.backgroundPollTimer);
        this.backgroundPollTimer = null;
        this.queue_sessions = [];
        this.queue_memory_enabled = false;
        this.queue_deck_expanded = false;
        this.queue_deck_idx = 0;
        this.queue_deck_img_idx = 0;
    }

    async fetchHistory(force = false) {
        // NUCLEAR SERIALIZATION: Queue at most ONE pending force-fetch.
        // Discard subsequent calls while one is already queued/inflight.
        if (this._historyInflight) {
            if (force && !this._historyForcePending) {
                this._historyForcePending = true; // Absorb into a single pending flag
            }
            return;
        }

        this._historyInflight = true;
        this._historyForcePending = false; // Consumed

        try {
            const res = await api.fetchApi("/h4/smart_save/history");
            if (!res.ok) return;
            let data = await res.json();
            const sig = JSON.stringify(data.map((x) => [x.filename, x.subfolder, x.type, x.timestamp]));

            if (sig !== this._lastHistorySignature) {
                this._lastHistorySignature = sig;

                // Purge non-image entries from server response (e.g. .json sidecars leaked into the DB)
                data = data.filter(x => isImageFile(x.filename));

                // Merge optimistic items that haven't been confirmed yet
                const serverKeys = new Map(data.map(x => [`${x.filename}::${x.subfolder}::${x.type}`, x]));
                const survivingPending = [];

                for (const p of (this._pendingInjections || [])) {
                    const key = `${p.filename}::${p.subfolder}::${p.type}`;
                    if (!serverKeys.has(key)) {
                        survivingPending.push(p);
                    }
                }

                // Strict 5-image FIFO
                this.history = [...survivingPending, ...data].slice(0, 5);
                this._pendingInjections = survivingPending;

                if (this.show_history) {
                    this.updateHistoryRail();
                    this.scheduleDraw();
                }
            }
        } catch (e) {
            console.error("[h4] fetchHistory fault", e);
        } finally {
            this._historyInflight = false;

            // Drain the single pending force-fetch if one was queued while we were inflight
            if (this._historyForcePending) {
                this._historyForcePending = false;
                setTimeout(() => this.fetchHistory(true), 150); // Single deferred drain
            }
        }
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

    setPanelMode(mode) {
        const prev = this.panelMode;
        this.panelMode = mode;
        this.markDOMDirty();

        // --- LEAVING PINNED ---
        if (prev === 'pinned' && mode !== 'pinned') {
            this._unpinPanel();
        }

        // --- LEAVING POPOUT ---
        if (prev === 'popout' && mode !== 'popout') {
            this._closePopout();
        }

        // --- ENTERING PINNED ---
        if (mode === 'pinned') {
            this._pinPanel();
        }

        // --- ENTERING POPOUT ---
        if (mode === 'popout') {
            this._openPopout();
        }

        // Redraw header buttons to reflect new state
        this._dirty_params = true;
        this.scheduleDraw();
    }

    _pinPanel() {
        const el = this.node.__h4_core_drawer;
        if (!el) return;

        // Snap to left edge of viewport
        this.pinnedPos = { x: 0, y: 0, w: 340, h: window.innerHeight };

        // Apply pinned styles directly — bypass project() for this element
        Object.assign(el.style, {
            position: 'fixed',
            left: '0px',
            top: '0px',
            width: '340px',
            height: '100vh',
            transform: 'none',       // CRITICAL: remove the canvas-space transform
            zIndex: '9000',
            borderRight: `1px solid ${COLORS.accent}`,
            borderRadius: '0',
            overflowY: 'auto',
            display: 'block',
            visibility: 'visible',
            opacity: '1',
            pointerEvents: 'auto',
        });
        el.setAttribute('data-pinned', 'true');

        // Nudge the canvas so nodes aren't hidden under the pinned panel
        this._applyCanvasMargin(340);
    }

    _unpinPanel() {
        const el = this.node.__h4_core_drawer;
        if (!el) return;
        el.removeAttribute('data-pinned');

        // Return element to the normal project() flow
        // project() will re-apply position/transform on the next frame
        // We only need to clear the pinned overrides
        el.style.transform = '';
        el.style.left = '0px';
        el.style.top = '0px';
        el.style.width = '';
        el.style.height = '';
        el.style.borderRight = '';
        el.style.borderRadius = '';

        // Remove the canvas margin nudge
        this._applyCanvasMargin(0);
    }

    _applyCanvasMargin(px) {
        // ComfyUI canvas container — try several selectors
        const container = document.querySelector('.graph-canvas-container') ||
            document.querySelector('#graph-canvas')?.parentElement ||
            app.canvas?.canvas?.parentElement;

        if (!container) return;

        container.style.transition = 'padding-left 0.22s cubic-bezier(0.16, 1, 0.3, 1)';
        container.style.paddingLeft = px > 0 ? `${px}px` : '';
    }

    _openPopout() {
        // Don't open a second window if one is already open
        if (this.popoutWin && !this.popoutWin.closed) {
            this.popoutWin.focus();
            return;
        }

        this.popoutWin = window.open(
            'about:blank',
            'h4SmartSavePanel',
            'width=380,height=800,resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,status=no'
        );

        if (!this.popoutWin) {
            // Popup was blocked
            console.warn('h4: Popout window was blocked by the browser. Falling back to pinned.');
            this.panelMode = 'pinned';
            this._pinPanel();
            return;
        }

        this.popoutReady = false;

        // Write the shell HTML — the content will be injected via postMessage
        const doc = this.popoutWin.document;
        doc.open();
        doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>h4 SmartSave — Panel</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #111;
      color: #fff;
      font-family: monospace;
      font-size: 12px;
      overflow-x: hidden;
    }
    #panel-root {
      width: 100%;
      min-height: 100vh;
      overflow-y: auto;
    }
    /* Custom scrollbar — matches COLORS */
    #panel-root::-webkit-scrollbar { width: 4px; }
    #panel-root::-webkit-scrollbar-track { background: transparent; }
    #panel-root::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
    #panel-root::-webkit-scrollbar-thumb:hover { background: #00f2ff; }

    .popout-header {
      position: sticky;
      top: 0;
      background: #0a0a0a;
      border-bottom: 1px solid #00f2ff;
      padding: 10px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 10;
    }
    .popout-header span {
      color: #00f2ff;
      font-weight: 900;
      font-size: 13px;
    }
    .popout-return-btn {
      background: rgba(0,242,255,0.08);
      border: 1px solid #00f2ff;
      color: #00f2ff;
      border-radius: 4px;
      padding: 4px 10px;
      font-size: 10px;
      cursor: pointer;
      font-family: monospace;
      font-weight: bold;
    }
    .popout-return-btn:hover { background: rgba(0,242,255,0.18); }
  </style>
</head>
<body>
  <div class="popout-header">
    <span>h4 SmartSave</span>
    <button class="popout-return-btn" id="return-btn">↩ RETURN TO DOCK</button>
  </div>
  <div id="panel-root">
    <div style="color:#555;padding:40px 20px;text-align:center;font-style:italic;">
      Waiting for data...
    </div>
  </div>
  <script>
    // Listen for content updates from the parent window
    window.addEventListener('message', (evt) => {
      if (evt.data && evt.data.type === 'h4-panel-update') {
        const root = document.getElementById('panel-root')
        if (root) root.innerHTML = evt.data.html
      }
    })

    // Notify parent that we're ready
    if (window.opener) {
      window.opener.postMessage({ type: 'h4-popout-ready' }, '*')
    }

    // Return to dock button
    document.getElementById('return-btn').addEventListener('click', () => {
      if (window.opener) {
        window.opener.postMessage({ type: 'h4-popout-return' }, '*')
      }
      window.close()
    })

    // Notify parent when window is closed
    window.addEventListener('beforeunload', () => {
      if (window.opener) {
        window.opener.postMessage({ type: 'h4-popout-closed' }, '*')
      }
    })
  </script>
</body>
</html>`);
        doc.close();

        // Listen for messages back from the popout
        this._popoutMessageHandler = (evt) => {
            if (!evt.data || typeof evt.data !== 'object') return;

            if (evt.data.type === 'h4-popout-ready') {
                this.popoutReady = true;
                // Push current content immediately
                this._pushToPopout();
            }

            if (evt.data.type === 'h4-popout-return' || evt.data.type === 'h4-popout-closed') {
                this.panelMode = 'docked';
                this.popoutWin = null;
                this.popoutReady = false;
                window.removeEventListener('message', this._popoutMessageHandler);
                this._popoutMessageHandler = null;
                this._dirty_params = true;
                this.scheduleDraw();
            }
        }

        window.addEventListener('message', this._popoutMessageHandler);
    }

    _closePopout() {
        if (this._popoutMessageHandler) {
            window.removeEventListener('message', this._popoutMessageHandler);
            this._popoutMessageHandler = null;
        }
        if (this.popoutWin && !this.popoutWin.closed) {
            try { this.popoutWin.close(); } catch (e) { }
        }
        this.popoutWin = null;
        this.popoutReady = false;
    }

    _pushToPopout() {
        if (!this.popoutWin || this.popoutWin.closed || !this.popoutReady) return;
        const dr = this.node.__h4_core_drawer;
        if (!dr) return;
        // Send the drawer content
        const content = dr.innerHTML;
        this.popoutWin.postMessage({ type: 'h4-panel-update', html: content }, '*');
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

        if (dr.setTitle) dr.setTitle("h4 LIVE PARAMETERS", COLORS.accent);

        const pinBtn = dr.querySelector('.h4-panel-pin-btn');
        if (pinBtn) {
            if (this.panelMode === 'pinned') {
                pinBtn.classList.add('active');
                pinBtn.textContent = '📌 PINNED';
            } else {
                pinBtn.classList.remove('active');
                pinBtn.textContent = '📌 PIN';
            }
        }

        let html = "";
        if (params.length === 0) html += `<div style="color:#555;margin:40px 20px;font-style:italic;">No upstream parameters found.</div>`;
        else params.forEach((p) => {
            const isSwapped = this.swapped_ids.has(String(p.id));
            const cardTip = `Click to see all the detailed settings for this ${safeText(p.title)} node.`;
            const swapTip = `Sync Settings - Force the nodes in your current workflow to match these exact settings.`;

            html += `
            <div class="h4-card" data-node-id="${p.id}" data-hist="0" data-h4-tip="${cardTip.replace(/"/g, "&quot;")}">
                <div class="h4-card-header">
                    <span class="h4-card-title">${safeText(p.title)}</span>
                    <span class="h4-card-id">ID ${p.id}</span>
                </div>
                <div class="h4-card-body">
                    ${p.items.slice(0, 3).map((it) => `
                    <div class="h4-card-row">
                        <span class="h4-card-label">${safeText(it.name)}</span>
                        <span class="h4-card-value">${safeText(it.val)}</span>
                    </div>`).join("")}
                </div>
                <button class="h4-btn-swap ${isSwapped ? "active" : ""}" data-node-id="${p.id}" data-h4-tip="${swapTip.replace(/"/g, "&quot;")}">
                    ${isSwapped ? "SWAP BACK" : "SWAP"}
                </button>
            </div>`;
        });
        dr._body.innerHTML = html;

        this.bindParamCards(false);
        if (this.panelMode === 'popout') this._pushToPopout();
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

        if (dr.setTitle) dr.setTitle("h4 // FORENSICS", COLORS.forensic);

        const pinBtn = dr.querySelector('.h4-panel-pin-btn');
        if (pinBtn) {
            if (this.panelMode === 'pinned') {
                pinBtn.classList.add('active');
                pinBtn.textContent = '📌 PINNED';
            } else {
                pinBtn.classList.remove('active');
                pinBtn.textContent = '📌 PIN';
            }
        }

        let html = "";
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

                html += `
                <div class="h4-card h4-forensic ${isGhost ? "h4-danger" : ""}" data-node-id="${id}" data-hist="1" data-h4-tip="${cardTip.replace(/"/g, "&quot;")}">
                    <div class="h4-card-header">
                        <span class="h4-card-title">${safeText(title)} ${isGhost ? "!! MISSING" : ""}</span>
                        <span class="h4-card-id">ID ${id}</span>
                    </div>
                    <div class="h4-card-body">
                        ${Object.entries(values).slice(0, 3).map(([k, v]) => `
                        <div class="h4-card-row">
                            <span class="h4-card-label">${safeText(k)}</span>
                            <span class="h4-card-value">${safeText(v)}</span>
                        </div>`).join("")}
                    </div>
                    ${!isGhost ? `
                    <button class="h4-btn-swap ${isSwapped ? "active" : ""}" data-node-id="${id}" data-hist="1" data-h4-tip="${swapTip.replace(/"/g, "&quot;")}">
                        ${isSwapped ? "SWAP BACK" : "SWAP"}
                    </button>` : ""}
                </div>`;
            });
        }
        dr._body.innerHTML = html;

        this.bindParamCards(true);
        if (this.panelMode === 'popout') this._pushToPopout();
    }

    bindParamCards(isHist) {
        const dr = this.node.__h4_core_drawer; if (!dr) return;
        dr.querySelectorAll(".h4-card").forEach((c) => {
            const id = c.getAttribute("data-node-id"); const hist = c.getAttribute("data-hist") === "1";
            c.onclick = (e) => { e.stopPropagation(); this.show_params = true; this.showNodeDetails(id, hist); this.scheduleDraw(); };
            const btn = c.querySelector(".h4-btn-swap");
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
            this.markDOMDirty();
            this.scheduleDraw(); return;
        }

        this._last_detailed_id = String(nodeId);
        this.markDOMDirty();
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
        if (det.setTitle) det.setTitle(`h4 // ${isHist ? "FORENSIC" : "DETAIL"} // ${nodeId}`, isHist ? COLORS.forensic : COLORS.accent);
        let html = `<div style="color:#aaa;margin-bottom:12px;font-size:12px;">${safeText(title)}</div>`;
        if (!items.length) html += `<div style="color:#555;font-style:italic;">No values available for this selection.</div>`;
        else items.forEach((it) => { html += `<div style="margin-bottom:8px;border-left:2px solid #333;padding-left:10px;"><div style="font-size:9px;color:#aaa;text-transform:uppercase;">${safeText(it.name)}</div><div style="color:${isHist ? COLORS.forensic : COLORS.accent};font-size:11px;word-break:break-word;">${safeText(it.value)}</div></div>`; });
        det._body.innerHTML = html; if (!forceRefresh) this.detail_anim = 0; this.scheduleDraw();
    }

    updateHistoryRail() {
        const rail = this.node.__h4_history_rail; if (!rail || !this.show_history) return;

        // --- GEOMETRY SYNC: Calculate exact fit based on physical node width ---
        const baseW = Math.max(MIN_SIZE[0], this.node.size[0]);
        const maxFitByWidth = Math.floor((baseW - 80 - 30 - 12) / (110 + 12));

        const isOutputTraversal = !!this.output_traversal_enabled;
        const isQueueMode = !isOutputTraversal && (this.queue_memory_enabled && this.queue_sessions && this.queue_sessions.length > 0);
        let sourceArray = [];
        let isExpandedQueue = false;
        
        if (isOutputTraversal) {
            sourceArray = this._outputTraversalFiles || [];
        } else if (isQueueMode) {
            if (this.queue_deck_expanded) {
                const qs = this.queue_sessions[this.queue_deck_idx || 0];
                if (qs && qs.images && qs.images.length > 0) {
                    isExpandedQueue = true;
                    sourceArray = [{ _is_back_btn: true }, ...qs.images];
                } else {
                    sourceArray = this.queue_sessions;
                    this.queue_deck_expanded = false;
                }
            } else {
                sourceArray = this.queue_sessions;
            }
        } else {
            sourceArray = this.history.slice(0, 5);
        }
        
        let headerTitle = "FILM STRIP // TOP 5 RECENT";
        if (isOutputTraversal) {
            headerTitle = `OUTPUT TRAVERSAL // FULL ARCHIVE (${sourceArray.length} IMAGES)`;
        } else if (isExpandedQueue) {
            headerTitle = `QUEUE BATCH #${(this.queue_deck_idx || 0) + 1} // (${sourceArray.length - 1} IMAGES)`;
        } else if (isQueueMode) {
            headerTitle = `QUEUE FIFO // (${this.queue_sessions.length} BATCHES)`;
        }

        const activeVisibleCount = (isExpandedQueue || isOutputTraversal) ? Math.max(1, maxFitByWidth) : Math.min(HISTORY_LIMIT_VISIBLE, Math.max(1, maxFitByWidth));
        const visibleItems = sourceArray.slice(this.scroll_idx, this.scroll_idx + activeVisibleCount);

        let html = `
        <div style="height:100%;display:flex;flex-direction:column;background:${COLORS.panel};border-radius:6px;overflow:hidden;pointer-events:none;padding:4px 6px;">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:2px 8px;height:24px;border-bottom:1px solid #1a1a1a;margin-bottom:4px;pointer-events:none;">
                <div style="font-family:monospace;font-size:10px;color:${COLORS.dim};font-weight:bold;letter-spacing:0.5px;">${headerTitle}</div>
                <div class="h4-hist-traversal-toggle" style="
                    background:${isOutputTraversal ? "rgba(0,242,255,0.18)" : "rgba(255,255,255,0.05)"};
                    border:1px solid ${isOutputTraversal ? COLORS.accent : "#555"};
                    color:${isOutputTraversal ? COLORS.accent : "#aaa"};
                    padding:3px 10px;
                    border-radius:4px;
                    cursor:pointer;
                    font-size:10px;
                    font-family:monospace;
                    font-weight:bold;
                    pointer-events:auto;
                    user-select:none;
                    box-shadow:${isOutputTraversal ? "0 0 10px rgba(0,242,255,0.25)" : "none"};
                ">📂 OUTPUT TRAVERSAL: ${isOutputTraversal ? "ON" : "OFF"}</div>
            </div>
            <div style="flex:1;display:grid;grid-template-columns:36px 1fr 36px;align-items:center;overflow:hidden;pointer-events:none;">
                <div class="h4-hist-nav" data-dir="-1" title="Scroll Left" style="height:100%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.02);color:${COLORS.accent};font-size:20px;cursor:pointer;user-select:none;pointer-events:auto;">‹</div>
                <div style="display:flex;gap:12px;overflow:hidden;justify-content:flex-start;padding:4px 8px;pointer-events:none;">
        `;

        visibleItems.forEach((item, i) => {
            const idx = i + this.scroll_idx;
            const animStyle = this._histOpening ? `opacity:0; animation: h4-thumb-in 0.25s ease forwards; animation-delay: ${i * 0.04}s;` : "";

            if (item._is_back_btn) {
                html += `<div class="h4-hist-item" data-back-btn="true" draggable="false" style="min-width:110px;height:110px;background:rgba(255,255,255,0.05);border:2px dashed #555;position:relative;cursor:pointer;border-radius:4px;pointer-events:auto; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#ccc; font-weight:bold; ${animStyle}">
                    <div style="font-size:24px; margin-bottom:5px;">‹</div>
                    <div style="font-size:10px;">BACK TO</div>
                    <div style="font-size:10px;">BATCHES</div>
                </div>`;
            } else if (isQueueMode && !isExpandedQueue && !isOutputTraversal) {
                const sImgs = item.images || [];
                if (sImgs.length === 0) return;
                
                // Directly match the selected queue session index for absolute certainty
                const isSel = (idx === (this.queue_deck_idx || 0));
                
                const bCol = isSel ? COLORS.accent : "#333";
                const hTip = `QUEUE SESSION: ${item.batch_count || sImgs.length} IMAGES. Click to load batch.`;

                html += `<div class="h4-hist-item ${isSel ? "active" : ""}" data-qidx="${idx}" data-h4-tip="${hTip.replace(/"/g, "&quot;")}" draggable="false" style="min-width:110px;height:110px;background:#000;border:2px solid ${bCol};position:relative;cursor:pointer;border-radius:4px;pointer-events:auto; ${animStyle}">`;
                
                const stack = sImgs.slice(0, 3).reverse();
                stack.forEach((stackImg, sIdx) => {
                    const sUrl = api.apiURL(`/view?filename=${encodeURIComponent(cleanFilename(stackImg.filename))}&subfolder=${encodeURIComponent(stackImg.subfolder)}&type=${encodeURIComponent(stackImg.type)}`);
                    const offX = sIdx * 5;
                    const offY = sIdx * -5;
                    const scale = 1 - (sIdx * 0.08);
                    const z = stack.length - sIdx;
                    html += `<img src="${sUrl}" style="position:absolute; width:85%; height:85%; left:5%; top:10%; object-fit:cover; border-radius:3px; transform:translate(${offX}px, ${offY}px) scale(${scale}); z-index:${z}; box-shadow: -2px 2px 6px rgba(0,0,0,0.9); pointer-events:none;" />`;
                });
                
                html += `<div style="position:absolute;bottom:0;width:100%;background:rgba(0,0,0,0.8);color:${COLORS.accent};font-size:9px;padding:2px;text-align:center;font-weight:bold;z-index:99;pointer-events:none;border-top:1px solid #333;">BATCH: ${item.batch_count || sImgs.length}</div>`;
                html += `</div>`;
            } else {
                if (!isImageFile(item.filename)) return; // Skip non-image entries
                const url = api.apiURL(`/view?filename=${encodeURIComponent(cleanFilename(item.filename))}&subfolder=${encodeURIComponent(item.subfolder)}&type=${encodeURIComponent(item.type)}`);
                
                let isSel = false;
                let bCol = "#333";
                let glow = "";
                let itemIdx = idx;
                
                if (isOutputTraversal) {
                    itemIdx = idx;
                    isSel = (itemIdx === (this._outputTraversalIdx || 0));
                    bCol = isSel ? COLORS.accent : "#333";
                } else if (isExpandedQueue) {
                    itemIdx = idx - 1; // Because index 0 is the back button
                    isSel = (itemIdx === (this.queue_deck_img_idx || 0));
                    bCol = isSel ? COLORS.accent : "#333";
                } else {
                    itemIdx = idx;
                    isSel = (idx === this.selected_idx);
                    const isTemp = item.type === "temp";
                    bCol = isSel ? (isTemp ? COLORS.forensic : COLORS.accent) : "#333";
                    glow = (isSel && isTemp) ? `box-shadow: 0 0 12px ${COLORS.forensic}88;` : "";
                }
                
                const hTip = `${safeText(item.filename)}: Click once to see settings, double-click for Lightbox.`;

                html += `<div class="h4-hist-item ${isSel ? "active" : ""}" data-idx="${itemIdx}" ${isOutputTraversal ? 'data-traversal-img="true"' : ''} ${isExpandedQueue ? 'data-expanded-img="true"' : ''} data-h4-tip="${hTip.replace(/"/g, "&quot;")}" draggable="false" style="min-width:110px;height:110px;background:#000;border:2px solid ${bCol};${glow}position:relative;cursor:pointer;border-radius:4px;pointer-events:auto; ${animStyle}">
                    <img src="${url}" draggable="false" style="width:100%;height:100%;object-fit:cover;border-radius:2px;pointer-events:none;" />
                    <div style="position:absolute;bottom:0;width:100%;background:rgba(0,0,0,0.7);color:#888;font-size:9px;padding:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none;">${safeText(item.filename)}</div>
                </div>`;
            }
        });
        this._histOpening = false;
        html += `</div><div class="h4-hist-nav" data-dir="1" title="Scroll Right" style="height:100%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.02);color:${COLORS.accent};font-size:20px;cursor:pointer;user-select:none;pointer-events:auto;">›</div></div></div><style> .h4-hist-nav:hover { background:rgba(0,242,255,0.08) !important; color:#fff !important; text-shadow:0 0 10px ${COLORS.accent}; } </style>`;

        rail.innerHTML = html;

        rail.querySelector(".h4-hist-traversal-toggle")?.addEventListener("mousedown", (e) => {
            e.stopPropagation();
            this.output_traversal_enabled = !this.output_traversal_enabled;
            this.scroll_idx = 0;
            if (this.output_traversal_enabled) {
                if (!this._outputTraversalFiles || this._outputTraversalFiles.length === 0) {
                    this.fetchOutputTraversal();
                } else {
                    this.updateHistoryRail();
                    this.scheduleDraw();
                }
            } else {
                this.updateHistoryRail();
                this.scheduleDraw();
            }
        }, true);

        rail.querySelectorAll(".h4-hist-nav").forEach(b => {
            b.addEventListener("mousedown", (e) => {
                e.stopPropagation();
                const dir = parseInt(b.getAttribute("data-dir"));
                const currentBaseW = Math.max(MIN_SIZE[0], this.node.size[0]);
                const currentMaxFit = Math.floor((currentBaseW - 80 - 30 - 12) / (110 + 12));
                const activeVisibleCount = (isExpandedQueue || isOutputTraversal) ? Math.max(1, currentMaxFit) : Math.min(HISTORY_LIMIT_VISIBLE, Math.max(1, currentMaxFit));
                
                const srcArrLen = sourceArray.length;
                const maxScroll = Math.max(0, srcArrLen - activeVisibleCount);
                this.scroll_idx = Math.max(0, Math.min(maxScroll, this.scroll_idx + (dir * 3))); // Scroll 3 thumbs
                this.updateHistoryRail();
            }, true);
        });

        rail.querySelectorAll(".h4-hist-item").forEach(b => {
            b.addEventListener("mousedown", (e) => {
                try {
                    e.stopPropagation();
                    if (b.hasAttribute("data-back-btn")) {
                        this.queue_deck_expanded = false;
                        this.scroll_idx = 0; // Reset scroll so they see the decks
                    } else if (b.hasAttribute("data-traversal-img")) {
                        const imgIdx = parseInt(b.getAttribute("data-idx"));
                        this._outputTraversalIdx = imgIdx;
                        const activeImg = this._outputTraversalFiles[imgIdx];
                        if (activeImg) {
                            const hIdx = this.history.findIndex(h => h.filename === activeImg.filename && h.subfolder === activeImg.subfolder);
                            if (hIdx !== -1) {
                                this.selected_idx = hIdx;
                            } else {
                                this.history.unshift(activeImg);
                                this.selected_idx = 0;
                            }
                        }
                    } else if (b.hasAttribute("data-expanded-img")) {
                        const imgIdx = parseInt(b.getAttribute("data-idx"));
                        this.queue_deck_img_idx = imgIdx;
                        const qs = this.queue_sessions[this.queue_deck_idx || 0];
                        if (qs && qs.images && qs.images[imgIdx]) {
                            const activeImg = qs.images[imgIdx];
                            const hIdx = this.history.findIndex(h => h.filename === activeImg.filename && h.subfolder === activeImg.subfolder && h.type === activeImg.type);
                            if (hIdx !== -1) {
                                this.selected_idx = hIdx;
                            } else {
                                this.history.unshift(activeImg);
                                this.selected_idx = 0;
                            }
                        }
                    } else if (b.hasAttribute("data-qidx")) {
                        const qidx = parseInt(b.getAttribute("data-qidx"));
                        this.queue_deck_idx = qidx; // Absolute selection track for Queue Mode
                        this.queue_deck_img_idx = 0; // Reset image cycle for new batch
                        this.queue_deck_expanded = true; // Expand immediately
                        this.scroll_idx = 0; // Reset scroll for the expanded view
                        
                        const qs = this.queue_sessions[qidx];
                        if (qs && qs.images && qs.images.length > 0) {
                            const firstImg = qs.images[0];
                            const hIdx = this.history.findIndex(h => h.filename === firstImg.filename && h.subfolder === firstImg.subfolder && h.type === firstImg.type);
                            if (hIdx !== -1) {
                                this.selected_idx = hIdx;
                            } else {
                                this.history.unshift(firstImg);
                                this.selected_idx = 0;
                            }
                        }
                    } else {
                        this.selected_idx = parseInt(b.getAttribute("data-idx"));
                    }
                    this.markDOMDirty();
                    this.fetchSidecar(this.selected_idx);
                    this.updateHistoryRail(); 
                    this.scheduleDraw();
                    if (this.node) this.node.setDirtyCanvas(true, true);
                    if (window.app && app.canvas) app.canvas.setDirty(true, true);
                } catch (err) {
                    console.error("[h4] Error in thumbnail click handler:", err);
                }
            }, true);
            
            b.addEventListener("dblclick", (e) => {
                try {
                    e.stopPropagation(); e.preventDefault();
                    if (b.hasAttribute("data-back-btn")) {
                        this.queue_deck_expanded = false;
                        this.scroll_idx = 0;
                        this.updateHistoryRail();
                        return;
                    }
                    if (b.hasAttribute("data-traversal-img")) {
                        this._lightbox_full_folder = true;
                        this._lightboxFolderItems = this._outputTraversalFiles;
                        this._lightboxFolderIdx = this._outputTraversalIdx || 0;
                        this.lightbox_custom_items = null;
                    } else if (b.hasAttribute("data-expanded-img")) {
                        const qs = this.queue_sessions[this.queue_deck_idx || 0];
                        if (qs && qs.images) {
                            this.lightbox_custom_items = qs.images;
                            this.lightbox_custom_idx = this.queue_deck_img_idx || 0;
                        }
                    } else if (b.hasAttribute("data-qidx")) {
                        const qidx = parseInt(b.getAttribute("data-qidx"));
                        this.queue_deck_idx = qidx;
                        const qs = this.queue_sessions[qidx];
                        if (qs && qs.images && qs.images.length > 0) {
                            this.lightbox_custom_items = qs.images;
                            this.lightbox_custom_idx = 0;
                        }
                    } else {
                        this.selected_idx = parseInt(b.getAttribute("data-idx"));
                        this.lightbox_custom_items = null;
                    }
                    this.show_lightbox = true;
                    this.markDOMDirty();
                    this.updateLightbox();
                    this.scheduleDraw();
                } catch (err) {
                    console.error("[h4] Error in thumbnail dblclick handler:", err);
                }
            }, true);
            
            b.addEventListener("mouseenter", () => {
                if (b.hasAttribute("data-traversal-img")) {
                    const imgIdx = parseInt(b.getAttribute("data-idx"));
                    const hItem = this._outputTraversalFiles[imgIdx];
                    if (hItem && isImageFile(hItem.filename)) {
                        const fullUrl = api.apiURL(`/view?filename=${encodeURIComponent(cleanFilename(hItem.filename))}&subfolder=${encodeURIComponent(hItem.subfolder)}&type=${encodeURIComponent(hItem.type)}`);
                        this.getBitmap(fullUrl);
                    }
                } else if (b.hasAttribute("data-qidx")) {
                    const qidx = parseInt(b.getAttribute("data-qidx"));
                    const qs = this.queue_sessions[qidx];
                    if (qs && qs.images && qs.images.length > 0) {
                        const hItem = qs.images[0];
                        const fullUrl = api.apiURL(`/view?filename=${encodeURIComponent(cleanFilename(hItem.filename))}&subfolder=${encodeURIComponent(hItem.subfolder)}&type=${encodeURIComponent(hItem.type)}`);
                        this.getBitmap(fullUrl);
                    }
                } else {
                    const itemIdx = parseInt(b.getAttribute("data-idx"));
                    const hItem = this.history[itemIdx]; if (!hItem || !isImageFile(hItem.filename)) return;
                    const fullUrl = api.apiURL(`/view?filename=${encodeURIComponent(cleanFilename(hItem.filename))}&subfolder=${encodeURIComponent(hItem.subfolder)}&type=${encodeURIComponent(hItem.type)}`);
                    this.getBitmap(fullUrl);
                }
            });
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

        if (viewer.setTitle) viewer.setTitle("h4 // FORENSIC DNA COMMAND", titleColor);
        let html = `<div style="display:flex;justify-content:flex-end;margin-bottom:10px;"><span style="color:#666;cursor:pointer;font-size:18px;" class="h4-viewer-close" title="Close Viewer">×</span></div>`;
        html += `<div style="padding:0 10px 10px 10px;">`;

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
        viewer._body.innerHTML = html;
        const closeBtn = viewer.querySelector(".h4-viewer-close");
        if (closeBtn) closeBtn.onclick = () => { this.show_viewer = false; this.markDOMDirty(); this.scheduleDraw(); };
    }
    async fetchOutputFolder(subfolder, type, recursive = false) {
        if (this._lightboxFolderLoading) return;
        this._lightboxFolderLoading = true;
        this.updateLightbox(); // re-render to show loading banner
        
        try {
            const url = api.apiURL(
                `/h4/smart_save/list_folder?subfolder=${encodeURIComponent(subfolder)}&type=${encodeURIComponent(type)}&recursive=${recursive}`
            );
            const res = await api.fetchApi(url);
            if (!res.ok) throw new Error(`Folder fetch failed: ${res.status}`);

            const data = await res.json();
            this._lightboxFolderItems = (data.files || [])
                .filter(f => isImageFile(f.filename))
                .sort((a, b) => b.filename.localeCompare(a.filename));
            
            this._lightboxFolderItems._recursive = recursive;

            const current = this.history[this.selected_idx];
            if (current) {
                const idx = this._lightboxFolderItems.findIndex(
                    f => f.filename === current.filename
                );
                this._lightboxFolderIdx = idx >= 0 ? idx : 0;
            } else {
                this._lightboxFolderIdx = 0;
            }

        } catch (e) {
            console.warn("[h4] Folder fetch fault — falling back to history items", e);
            this._lightboxFolderItems = this.history.filter(h => isImageFile(h.filename));
            this._lightboxFolderItems._recursive = false;
            const current = this.history[this.selected_idx];
            this._lightboxFolderIdx = current
                ? this._lightboxFolderItems.findIndex(f => f.filename === current.filename)
                : 0;
            if (this._lightboxFolderIdx < 0) this._lightboxFolderIdx = 0;
        } finally {
            this._lightboxFolderLoading = false;
            this.updateLightbox(); 
        }
    }

    updateLightbox() {
        const lb = this.node.__h4_lightbox; if (!lb) return;
        
        if (!this.show_lightbox) {
            lb.style.display = "none";
            lb.innerHTML = "";
            return;
        }

        lb.style.display = "block";
        const current = (this.lightbox_custom_items && this.lightbox_custom_items[this.lightbox_custom_idx ?? 0])
            || (this._lightboxFolderItems && this._lightboxFolderItems[this._lightboxFolderIdx ?? 0])
            || (this.selected_idx >= 0 ? this.history[this.selected_idx] : null)
            || (this.history.length ? this.history[0] : null);
        
        if (!current && !this._lightbox_full_folder) {
            lb.innerHTML = `
                <div class="h4-lb-close" style="
                    position:absolute;
                    top:14px;
                    right:18px;
                    color:${COLORS.accent};
                    font-size:22px;
                    cursor:pointer;
                    z-index:10001;
                    line-height:1;
                    font-weight:bold;
                    pointer-events:auto !important;
                ">✕</div>
                <div class="h4-lb-mode-toggle" style="
                    position:absolute;
                    top:14px;
                    right:60px;
                    background:rgba(0,242,255,0.18);
                    border:1.5px solid ${COLORS.accent};
                    color:${COLORS.accent};
                    padding:6px 12px;
                    border-radius:6px;
                    cursor:pointer;
                    font-size:11px;
                    font-family:monospace;
                    font-weight:bold;
                    pointer-events:auto !important;
                    z-index:10001;
                ">📂 OUTPUT TRAVERSAL: LOAD FOLDER</div>
                <div style="
                    color:${COLORS.dim};
                    font-family:monospace;
                    font-size:12px;
                    pointer-events:none;
                    text-align:center;
                    padding-top:100px;
                ">No preview image in active selection. Click button above to load output folder.</div>
            `;
            lb.querySelector(".h4-lb-close")?.addEventListener("mousedown", (e) => {
                e.stopPropagation();
                this.show_lightbox = false;
                this._lightboxFolderItems = null;
                this._lightboxFolderLoading = false;
                this._lightboxFolderIdx = 0;
                this._lightbox_full_folder = false;
                this.markDOMDirty();
                this.updateLightbox();
            }, true);
            lb.querySelector(".h4-lb-mode-toggle")?.addEventListener("mousedown", (e) => {
                e.stopPropagation();
                this._lightbox_full_folder = true;
                this.fetchOutputFolder("", "output", true);
            }, true);
            return;
        }

        const isFullFolder = !!this._lightbox_full_folder;
        const isCustom = !isFullFolder && !!this.lightbox_custom_items;
        const needsFolderLoad = !isCustom && (!this._lightboxFolderItems || this._lightboxFolderItems._recursive !== isFullFolder) && !this._lightboxFolderLoading;
        
        if (needsFolderLoad) {
            if (isFullFolder) {
                this.fetchOutputFolder("", "output", true);
            } else if (current) {
                this.fetchOutputFolder(current.subfolder, current.type, false);
            }
        }

        let displayItem = current || { filename: "loading.png", subfolder: "", type: "output" };
        let folderIdx = this._lightboxFolderIdx ?? 0;
        let folderTotal = null;

        if (isCustom) {
            displayItem = this.lightbox_custom_items[this.lightbox_custom_idx ?? 0] || current;
        } else if (this._lightboxFolderItems?.length) {
            folderTotal = this._lightboxFolderItems.length;
            displayItem = this._lightboxFolderItems[folderIdx] ?? current;
        }

        const imgUrl = api.apiURL(
            `/view?filename=${encodeURIComponent(cleanFilename(displayItem.filename))}&subfolder=${encodeURIComponent(displayItem.subfolder)}&type=${encodeURIComponent(displayItem.type)}`
        );

        let counterStr = "";
        if (isCustom) {
            const qidx = this.queue_deck_idx || 0;
            counterStr = `BATCH ${qidx + 1}: ${(this.lightbox_custom_idx ?? 0) + 1} / ${this.lightbox_custom_items.length}`;
        } else if (isFullFolder) {
            counterStr = `FULL OUTPUT: ${folderIdx + 1} / ${folderTotal || "?"}`;
        } else {
            counterStr = (folderTotal != null) ? `${folderIdx + 1} / ${folderTotal} in /${displayItem.subfolder || "output"}` : `${this.selected_idx + 1} / ${this.history.length}`;
        }

        const loadingBanner = this._lightboxFolderLoading
            ? `<div style="
                position:absolute;
                top:14px;
                left:50%;
                transform:translateX(-50%);
                background:rgba(0,0,0,0.85);
                border:1px solid ${COLORS.accent};
                color:${COLORS.accent};
                font-family:monospace;
                font-size:11px;
                font-weight:bold;
                padding:6px 16px;
                border-radius:20px;
                letter-spacing:1px;
                pointer-events:none;
                z-index:10000;
                white-space:nowrap;
                box-shadow:0 0 16px rgba(0,242,255,0.2);
              ">Loading output folder...</div>`
            : "";

        lb.innerHTML = `
            ${loadingBanner}

            <div class="h4-lb-close" style="
                position:absolute;
                top:14px;
                right:18px;
                color:${COLORS.accent};
                font-size:22px;
                cursor:pointer;
                z-index:10001;
                font-weight:bold;
                line-height:1;
                text-shadow:0 0 10px rgba(0,242,255,0.5);
                pointer-events:auto !important;
            ">✕</div>
            
            <div class="h4-lb-mode-toggle" style="
                position:absolute;
                top:14px;
                right:60px;
                background:${isFullFolder ? "rgba(0,242,255,0.18)" : "rgba(255,255,255,0.06)"};
                border:1.5px solid ${isFullFolder ? COLORS.accent : "#666"};
                color:${isFullFolder ? COLORS.accent : "#ddd"};
                padding:6px 12px;
                border-radius:6px;
                cursor:pointer;
                font-size:11px;
                font-family:monospace;
                font-weight:bold;
                letter-spacing:0.5px;
                pointer-events:auto !important;
                z-index:10001;
                box-shadow:${isFullFolder ? "0 0 12px rgba(0,242,255,0.3)" : "none"};
                user-select:none;
            ">📂 OUTPUT TRAVERSAL: ${isFullFolder ? "ON (FULL ARCHIVE)" : (isCustom ? "OFF (BATCH ONLY)" : "OFF (TOP 5)")}</div>

            <div style="
                position:absolute;
                top:14px;
                left:18px;
                color:${COLORS.dim};
                font-family:monospace;
                font-size:11px;
                z-index:10000;
                letter-spacing:0.5px;
                pointer-events:none;
            ">${safeText(counterStr)}</div>

            <div style="
                position:absolute;
                bottom:18px;
                left:50%;
                transform:translateX(-50%);
                color:#555;
                font-family:monospace;
                font-size:10px;
                white-space:nowrap;
                overflow:hidden;
                text-overflow:ellipsis;
                max-width:80%;
                z-index:10000;
                pointer-events:none;
            ">${safeText(displayItem.filename)}</div>

            <div class="h4-lb-prev" style="
                position:absolute;
                left:18px;
                top:50%;
                transform:translateY(-50%);
                color:${COLORS.accent};
                font-size:36px;
                cursor:pointer;
                user-select:none;
                z-index:10001;
                opacity:0.7;
                text-shadow:0 0 14px rgba(0,242,255,0.4);
                transition:opacity 0.15s;
                pointer-events:auto !important;
            ">‹</div>

            <div class="h4-lb-next" style="
                position:absolute;
                right:18px;
                top:50%;
                transform:translateY(-50%);
                color:${COLORS.accent};
                font-size:36px;
                cursor:pointer;
                user-select:none;
                z-index:10001;
                opacity:0.7;
                text-shadow:0 0 14px rgba(0,242,255,0.4);
                transition:opacity 0.15s;
                pointer-events:auto !important;
            ">›</div>

            <img src="${imgUrl}"
                draggable="false"
                style="
                    max-width:90%;
                    max-height:90%;
                    object-fit:contain;
                    border-radius:4px;
                    pointer-events:none;
                    box-shadow:0 0 40px rgba(0,0,0,0.8);
                "
            />
            <div style="
                position:absolute;
                bottom:18px;
                left:18px;
                width:80px;
                height:80px;
                background:rgba(255,255,255,0.05);
                backdrop-filter:blur(5px);
                border-radius:12px;
                pointer-events:none;
                z-index:10002;
            "></div>
        `;

        lb.querySelector(".h4-lb-close")?.addEventListener("mousedown", (e) => {
            e.stopPropagation();
            this.show_lightbox = false;
            this.lightbox_custom_items = null;
            this._lightboxFolderItems = null;
            this._lightboxFolderLoading = false;
            this._lightboxFolderIdx = 0;
            this._lightbox_full_folder = false;
            this.markDOMDirty();
            this.updateLightbox();
        }, true);
        
        lb.querySelector(".h4-lb-mode-toggle")?.addEventListener("mousedown", (e) => {
            e.stopPropagation();
            this._lightbox_full_folder = !this._lightbox_full_folder;
            this.updateLightbox();
        }, true);

        lb.querySelector(".h4-lb-prev")?.addEventListener("mousedown", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const isFullFolder = !!this._lightbox_full_folder;
            if (!isFullFolder && this.lightbox_custom_items && this.lightbox_custom_items.length > 1) {
                const total = this.lightbox_custom_items.length;
                this.lightbox_custom_idx = ((this.lightbox_custom_idx ?? 0) - 1 + total) % total;
                this.queue_deck_img_idx = this.lightbox_custom_idx;
            } else {
                const list = this._lightboxFolderItems;
                if (list && list.length > 1) {
                    this._lightboxFolderIdx = (this._lightboxFolderIdx - 1 + list.length) % list.length;
                } else {
                    this.selected_idx = Math.max(0, this.selected_idx - 1);
                }
            }
            if (!isFullFolder && this.lightbox_custom_items && this.lightbox_custom_items.length > 1) {
                const activeImg = this.lightbox_custom_items[this.queue_deck_img_idx];
                const hIdx = this.history.findIndex(h => h.filename === activeImg.filename && h.subfolder === activeImg.subfolder && h.type === activeImg.type);
                if (hIdx !== -1) {
                    this.selected_idx = hIdx;
                    this.fetchSidecar(hIdx);
                }
                this.updateHistoryRail();
                if (this.node) this.node.setDirtyCanvas(true, true);
                if (window.app && app.canvas) app.canvas.setDirty(true, true);
            }
            this.updateLightbox();
        }, true);

        lb.querySelector(".h4-lb-next")?.addEventListener("mousedown", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const isFullFolder = !!this._lightbox_full_folder;
            if (!isFullFolder && this.lightbox_custom_items && this.lightbox_custom_items.length > 1) {
                const total = this.lightbox_custom_items.length;
                this.lightbox_custom_idx = ((this.lightbox_custom_idx ?? 0) + 1) % total;
                this.queue_deck_img_idx = this.lightbox_custom_idx;
            } else {
                const list = this._lightboxFolderItems;
                if (list && list.length > 1) {
                    this._lightboxFolderIdx = ((this._lightboxFolderIdx ?? 0) + 1) % list.length;
                } else {
                    this.selected_idx = Math.min(this.history.length - 1, this.selected_idx + 1);
                }
            }
            if (!isFullFolder && this.lightbox_custom_items && this.lightbox_custom_items.length > 1) {
                const activeImg = this.lightbox_custom_items[this.queue_deck_img_idx];
                const hIdx = this.history.findIndex(h => h.filename === activeImg.filename && h.subfolder === activeImg.subfolder && h.type === activeImg.type);
                if (hIdx !== -1) {
                    this.selected_idx = hIdx;
                    this.fetchSidecar(hIdx);
                }
                this.updateHistoryRail();
                if (this.node) this.node.setDirtyCanvas(true, true);
                if (window.app && app.canvas) app.canvas.setDirty(true, true);
            }
            this.updateLightbox();
        }, true);

        lb.onmousedown = (e) => {
            if (e.target.closest('.h4-lb-prev') || e.target.closest('.h4-lb-next') || e.target.closest('.h4-lb-close')) {
                return;
            }
            if (e.target === lb || e.target.tagName === 'IMG') {
                e.stopPropagation();
                this.show_lightbox = false;
                this.lightbox_custom_items = null;
                this._lightboxFolderItems = null;
                this._lightboxFolderLoading = false;
                this._lightboxFolderIdx = 0;
                this.markDOMDirty();
                this.updateLightbox();
            }
        };
    }

    // --- GPU BITMAP PIPELINE: Decode images off the main thread for instant canvas draws ---
    getBitmap(url) {
        if (this.bitmap_cache[url]) return this.bitmap_cache[url]; // GPU hit — zero cost
        if (this._bitmap_pending.has(url)) return null;            // Already decoding

        this._bitmap_pending.add(url);
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            createImageBitmap(img).then(bitmap => {
                if (this.bitmap_cache[url]) this.bitmap_cache[url].close(); // Safety cleanup of stale bitmap
                this.bitmap_cache[url] = bitmap;
                this._bitmap_pending.delete(url);
                if (this.node) this.node.setDirtyCanvas(true); // Single redraw when decode completes
            }).catch(() => this._bitmap_pending.delete(url));
        };
        img.onerror = () => this._bitmap_pending.delete(url);
        img.src = url;
        return null; // Not ready yet — triggers redraw on load completion
    }

    clearBitmapCache() {
        Object.values(this.bitmap_cache).forEach(b => { try { b?.close(); } catch (e) { } });
        this.bitmap_cache = {};
        this._bitmap_pending.clear();
    }

    syncDOM() {
        const node = this.node; if (!node || !node.graph) { activeNodes.delete(this); return; }

        // --- ANIMATION STATE MACHINE: Runs FIRST so the gate can evaluate animation progress ---
        // This is the single source of truth for animation progression.
        this.params_anim = lerp(this.params_anim, this.show_params ? 1 : 0, ANIM_SPEED);
        if (this.params_anim < 0.01) this.params_anim = 0;
        this.meta_anim = lerp(this.meta_anim, this.show_meta ? 1 : 0, ANIM_SPEED);
        if (this.meta_anim < 0.01) this.meta_anim = 0;
        this.custom_meta_anim = lerp(this.custom_meta_anim, (this.show_meta && this.show_custom_meta) ? 1 : 0, ANIM_SPEED);
        if (this.custom_meta_anim < 0.01) this.custom_meta_anim = 0;
        this.footer_anim = lerp(this.footer_anim, this.show_history ? 1 : 0, ANIM_SPEED);
        if (this.footer_anim < 0.01) this.footer_anim = 0;
        this.viewer_anim = lerp(this.viewer_anim, this.show_viewer ? 1 : 0, ANIM_SPEED);
        if (this.viewer_anim < 0.01) this.viewer_anim = 0;
        this.detail_anim = lerp(this.detail_anim, this._last_detailed_id ? 1 : 0, ANIM_SPEED);
        if (this.detail_anim < 0.01) this.detail_anim = 0;

        // --- ANIMATION KERNEL: Keep drawing if transitions are active ---
        const animStillMoving =
            Math.abs(this.params_anim - (this.show_params ? 1 : 0)) > 0.005 ||
            Math.abs(this.meta_anim - (this.show_meta ? 1 : 0)) > 0.005 ||
            Math.abs(this.footer_anim - (this.show_history ? 1 : 0)) > 0.005 ||
            Math.abs(this.viewer_anim - (this.show_viewer ? 1 : 0)) > 0.005 ||
            Math.abs(this.detail_anim - (this._last_detailed_id ? 1 : 0)) > 0.005;

        if (animStillMoving) this.scheduleDraw();

        // --- NUCLEAR BLOAT REMOVAL ---
        node.imgs = null;
        node.images = null;

        const mesh = getGrid(node); const pts = mesh.pts; const scale = app.canvas.ds.scale; const ds = app.canvas.ds;

        // --- WIDGET DOM NEUTRALIZATION: ComfyUI's DOMWidget system re-creates/re-positions widget elements ---
        // These invisible DOM elements capture mouse events and create dead zones over and below the node.
        // Neutralize them every frame to prevent blocking canvas interaction.
        // --- WIDGET NEUTRALIZATION: Paralyze ComfyUI's V2 DOM layer to prevent interaction hijacking ---
        // We only exile the direct widget elements and their closest dom-widget wrapper.
        // Walking the parent tree any further risks squashing the entire system UI.
        if (node.widgets) {
            node.widgets.forEach(w => {
                if (!w.__h4_cloaked) {
                    cloakWidget(w);
                    w.__h4_cloaked = true;
                }
                if (w.inputEl) {
                    Object.assign(w.inputEl.style, { display: "none", pointerEvents: "none", position: "fixed", left: "-9999px", width: "0", height: "0" });
                }
                if (w.element) {
                    Object.assign(w.element.style, { display: "none", pointerEvents: "none", position: "fixed", left: "-9999px", width: "0", height: "0" });
                    const master = w.element.closest?.(".dom-widget");
                    if (master && !master.className.includes("h4")) {
                        Object.assign(master.style, { pointerEvents: "none", zIndex: "-1", overflow: "hidden", width: "0", height: "0" });
                    }
                }
            });
        }

        // --- DRAWER CONTENT POPULATION: Triggered here to stay synchronized with animation ---
        if (this.show_params) { if (this.current_sidecar) this.updateParamsFromSidecar(this.current_sidecar); else this.crawlWorkflow(); }
        if (this.show_viewer) this.showForensicViewer();

        // --- PROJECTION KERNEL: Position a DOM element over its canvas counterpart ---
        const project = (el, pt, isShown, animVal = 1, passthrough = false) => {
            if (!el) return;

            // --- PINNED MODE GUARD ---
            if (el === this.node.__h4_core_drawer && this.panelMode === 'pinned') {
                if (!isShown) {
                    el.style.display = 'none';
                    el.style.visibility = 'hidden';
                } else {
                    el.style.display = 'block';
                    el.style.visibility = 'visible';
                    el.style.opacity = String(animVal);
                }
                return;
            }

            // --- PINNED DETAIL GUARD ---
            if (el === this.node.__h4_detaildrawer && this.panelMode === 'pinned') {
                if (!isShown || !this._last_detailed_id) {
                    el.style.display = 'none';
                    el.style.visibility = 'hidden';
                    return;
                }
                Object.assign(el.style, {
                    position: 'fixed',
                    left: `${this.pinnedPos.w + DETAIL_GAP}px`,
                    top: '0px',
                    width: `${DRAWER_W}px`,
                    height: '100vh',
                    transform: 'none',
                    zIndex: '9000',
                    overflowY: 'auto',
                    display: 'block',
                    visibility: 'visible',
                    opacity: String(animVal),
                    pointerEvents: 'auto',
                    borderRight: `1px solid #222`,
                    borderRadius: '0',
                });
                return;
            }

            // --- POPOUT MODE GUARD ---
            if (el === this.node.__h4_core_drawer && this.panelMode === 'popout') {
                el.style.display = 'none';
                el.style.visibility = 'hidden';
                el.style.width = '0';
                el.style.height = '0';
                if (el.parentNode) el.remove();
                return;
            }

            const finalOpacity = isShown ? animVal : 0;
            // --- LIFECYCLE VIGILANCE: Hard-purge from DOM and Render-Tree when inactive ---
            if (finalOpacity < 0.01 || !node.graph || scale < 0.2) {
                if (el.parentNode) {
                    el.style.display = "none";
                    el.style.visibility = "hidden";
                    el.style.width = "0"; el.style.height = "0";
                    el.remove();
                }
                return;
            }
            if (!el.parentNode) { document.body.appendChild(el); }

            let screenX = 0, screenY = 0;
            const ds = app.canvas.ds;
            if (!ds || isNaN(node.pos[0])) return; // --- COORD VALIDATION: Prevent 0,0 snaps ---

            try {
                const canvasElement = app.canvas.canvas;
                const rect = canvasElement ? canvasElement.getBoundingClientRect() : { left: 0, top: 0 };
                screenX = (node.pos[0] + pt.x + ds.offset[0]) * ds.scale + rect.left;
                screenY = (node.pos[1] + pt.y + ds.offset[1]) * ds.scale + rect.top;
            } catch (err) { return; }

            el.style.position = "fixed"; el.style.left = "0"; el.style.top = "0"; el.style.zIndex = "100";
            el.style.transform = `translate3d(${screenX}px, ${screenY}px, 0) scale(${ds.scale})`;
            el.style.transformOrigin = "top left";
            el.style.width = `${pt.w}px`; el.style.height = `${pt.h}px`;
            el.style.opacity = `${finalOpacity}`; el.style.display = "block"; el.style.visibility = "visible";

            // --- TACTILE SOVEREIGNTY: Interactive elements block canvas immediately upon visibility ---
            if (passthrough) el.style.pointerEvents = "none";
            else el.style.pointerEvents = "auto";
        };

        // --- LIGHTBOX SUPPRESSION: Hide all HUD elements when in full-screen mode ---
        // --- MODAL AWARENESS: Hide HUD when system dialogs or settings menus are active ---
        const hudVisible = !this.show_lightbox && !isModalOpen();

        project(node.__h4_prefix, pts.prefix_box, hudVisible);
        project(node.__h4_path, pts.path_box, hudVisible);

        project(node.__h4_core_drawer, pts.drawer_p, this.show_params && hudVisible, this.params_anim, false);
        project(node.__h4_detaildrawer, pts.drawer_detail, (this.show_params && this._last_detailed_id && hudVisible), this.detail_anim, false);
        project(node.__h4_metadrawer, pts.drawer_m, this.show_meta && hudVisible, this.meta_anim, false);
        project(node.__h4_customdrawer, pts.drawer_custom, this.show_custom_meta && hudVisible, this.custom_meta_anim, false);

        const rY = mesh.baseH + 10 + (1 - easeOutCubic(clamp01(this.footer_anim))) * 40;
        project(node.__h4_history_rail, { ...pts.history_rail, y: rY }, this.show_history && hudVisible, this.footer_anim, true);
        project(node.__h4_viewerdrawer, pts.drawer_viewer, this.show_viewer && hudVisible, this.viewer_anim, (this.viewer_anim < 0.5));

        // --- LIGHTBOX CONTAINMENT: Full-screen overlay only when explicitly activated ---
        if (this.node.__h4_lightbox && !this.node.__h4_lightbox.parentNode) {
            this.node.__h4_lightbox.className = "h4-lightbox h4-hud-el";
            this.node.__h4_lightbox.style.cssText = `
                position:fixed;
                inset:0;
                background:rgba(0,0,0,0.6);
                display:none;
                align-items:center;
                justify-content:center;
                z-index:9999;
                pointer-events:none;
            `;
            document.body.appendChild(this.node.__h4_lightbox);
        }
        this.node.__h4_lightbox.style.display = this.show_lightbox ? "flex" : "none";
        this.node.__h4_lightbox.style.pointerEvents = this.show_lightbox ? "auto" : "none";
    }
}

function cloakWidget(w) {
    if (!w) return;
    // Replace the widget's rendering pipeline to prevent ComfyUI from allocating visual space
    w.computeSize = () => [0, -4];
    w.draw = () => { };
    // Aggressively exile DOM elements to prevent invisible overlays from blocking canvas interaction
    if (w.inputEl) { w.inputEl.style.display = "none"; w.inputEl.style.pointerEvents = "none"; w.inputEl.style.position = "fixed"; w.inputEl.style.left = "-9999px"; w.inputEl.style.width = "0"; w.inputEl.style.height = "0"; }
    if (w.element) { w.element.style.display = "none"; w.element.style.pointerEvents = "none"; w.element.style.position = "fixed"; w.element.style.left = "-9999px"; w.element.style.width = "0"; w.element.style.height = "0"; }
}
function makeFloatingEl(tag, cls = "") {
    const el = document.createElement(tag);
    el.className = cls + " h4-hud-el";
    el.style.position = "fixed"; el.style.zIndex = "100"; el.style.display = "none";
    el.style.background = COLORS.panel; el.style.border = "1.5px solid #222"; el.style.color = COLORS.accent; el.style.padding = "0";
    el.style.fontFamily = "monospace"; el.style.boxSizing = "border-box";
    el.style.overflowY = "auto"; el.style.overflowX = "hidden";
    el.style.pointerEvents = "none"; // --- INTERCEPTION PROTECTION: PASSIVE BY DEFAULT ---
    el.__h4_interactive = true; // Activating manual node clicks
    el.setAttribute("draggable", "false");

    // --- TACTILE SOVEREIGNTY: Native 'pointer-events: auto' handles canvas click blocking now.
    // Removed JS stopPropagation traps to restore native DOM focus, hover, and button clicks inside the drawers.

    return el;
}

function createPanelShell(className, titleText, titleColor = COLORS.accent, hasActions = false) {
    const root = makeFloatingEl("div", `h4-panel ${className}`);
    root.style.padding = "0";

    const header = document.createElement("div");
    header.className = "h4-panel-header";
    header.style.color = titleColor;

    let actionsHtml = "";
    if (hasActions) {
        actionsHtml = `
            <div class="h4-panel-actions" style="display:flex;gap:6px;align-items:center;">
                <button class="h4-panel-pin-btn h4-btn" title="Pin to screen edge (locks panel in place)">📌 PIN</button>
                <button class="h4-panel-popout-btn h4-btn" title="Pop out into its own window">↗ POP OUT</button>
            </div>
        `;
    }

    header.innerHTML = `<span class="h4-panel-title">${titleText}</span>${actionsHtml}`;

    const body = document.createElement("div");
    body.className = "h4-panel-body";

    root.appendChild(header);
    root.appendChild(body);

    root._header = header;
    root._body = body;
    root.setTitle = (text, color = COLORS.accent) => {
        const titleEl = header.querySelector(".h4-panel-title");
        if (titleEl) titleEl.textContent = text;
        header.style.color = color;
    };

    return root;
}

let _kineticLastTime = 0;
const KINETIC_INTERVAL = 1000 / 30; // 30fps DOM sync — imperceptible to the eye, major CPU relief

function kineticLoop(timestamp) {
    requestAnimationFrame(kineticLoop); // Always re-queue at 60fps to maintain timing accuracy

    if (timestamp - _kineticLastTime < KINETIC_INTERVAL) return; // Throttle DOM sync to 30fps
    _kineticLastTime = timestamp;

    try {
        // Popout closed detection — fallback for when beforeunload message doesn't arrive
        activeNodes.forEach(ui => {
            if (ui.panelMode === 'popout' && ui.popoutWin?.closed) {
                ui.panelMode = 'docked';
                ui.popoutWin = null;
                ui.popoutReady = false;
                if (ui._popoutMessageHandler) {
                    window.removeEventListener('message', ui._popoutMessageHandler);
                    ui._popoutMessageHandler = null;
                }
                ui._dirty_params = true;
                ui.markDOMDirty();
                ui.scheduleDraw();
            }
        });

        activeNodes.forEach(ui => {
            if (ui.node?.graph) ui.syncDOM();
            else activeNodes.delete(ui);
        });
    } catch (e) {
        console.error("[h4] Kinetic Loop Fault:", e);
    }
}
requestAnimationFrame(kineticLoop);

// --- SOVEREIGN CLICK INTERCEPTOR INTEGRATED INTO onMouseDown ---

app.registerExtension({
    name: "h4.SmartSave.Core.Fixed",
    async beforeRegisterNodeDef(nodeType, nodeDef) {
        if (nodeDef.name !== "H4_SmartSave") return;
        nodeType.prototype.onNodeCreated = function () {
            this.h4_ui = new SmartSaveUI(this); activeNodes.add(this.h4_ui);
            if (!this.size || this.size[0] < 850) this.size = [850, 520];
            // --- ELEMENT CREATION: __h4_interactive flag controls which elements capture clicks ---
            // Only input fields and open drawers should intercept mouse events.
            // Buttons M/H/P/toggle/scrub are canvas-drawn and need the click to reach the canvas.
            this.__h4_prefix = makeFloatingEl("input", "h4-grid-prefix");
            this.__h4_prefix.__h4_interactive = true; // Text input requires direct DOM interaction
            this.__h4_prefix.setAttribute("data-h4-tip", "Type your name here to save it into the image file.");

            this.__h4_path = makeFloatingEl("input", "h4-grid-path");
            this.__h4_path.__h4_interactive = true; // Text input requires direct DOM interaction
            this.__h4_path.setAttribute("data-h4-tip", "Choose where on your computer you want to save your images.");

            this.__h4_core_drawer = createPanelShell("h4gridscroll h4-grid-drawer", "h4 LIVE PARAMETERS", COLORS.accent, true);
            this.__h4_core_drawer.__h4_interactive = true; // Contains clickable param cards

            // Set up static listeners for pin/popout on core drawer
            const pinBtn = this.__h4_core_drawer.querySelector('.h4-panel-pin-btn');
            const popBtn = this.__h4_core_drawer.querySelector('.h4-panel-popout-btn');
            if (pinBtn) {
                pinBtn.addEventListener('mousedown', (e) => {
                    e.stopPropagation();
                    if (this.h4_ui.panelMode === 'pinned') this.h4_ui.setPanelMode('docked');
                    else this.h4_ui.setPanelMode('pinned');
                });
            }
            if (popBtn) {
                popBtn.addEventListener('mousedown', (e) => {
                    e.stopPropagation();
                    this.h4_ui.setPanelMode('popout');
                });
            }

            this.__h4_detaildrawer = createPanelShell("h4gridscroll h4-grid-details", "h4 // DETAIL");
            this.__h4_detaildrawer.__h4_interactive = true; // Contains scrollable detail view
            this.__h4_metadrawer = createPanelShell("h4gridscroll h4-grid-meta", "h4 // META ENGINE");
            this.__h4_metadrawer.__h4_interactive = true; // Contains input fields and selects
            this.__h4_customdrawer = createPanelShell("h4gridscroll h4-grid-custom", "h4 // CUSTOM DNA", COLORS.forensic);
            this.__h4_customdrawer.__h4_interactive = true; // Contains textarea for custom JSON
            this.__h4_viewerdrawer = createPanelShell("h4gridscroll h4-grid-viewer", "h4 // FORENSICS");
            this.__h4_viewerdrawer.__h4_interactive = true; // Contains close button and scrollable content

            this.__h4_history_rail = makeFloatingEl("div", "h4-grid-history");
            this.__h4_history_rail.__h4_interactive = true; // Contains clickable thumbnails
            this.__h4_lightbox = makeFloatingEl("div", "h4-grid-lightbox");
            this.__h4_lightbox.__h4_interactive = true; // Full overlay with nav buttons
            Object.assign(this.__h4_lightbox.style, { width: "0", height: "0", zIndex: "10001", background: "rgba(0,0,0,0.95)" });
            const bindWidgets = () => {
                if (!this.widgets) return false;
                this.widgets.forEach(w => {
                    if (!w) return;
                    const n = w.name;
                    if (n === "filename_prefix") { this.__h4_prefix.value = w.value ?? ""; this.__h4_prefix.oninput = () => { w.value = this.__h4_prefix.value; }; }
                    else if (n === "output_path") { this.__h4_path.value = w.value ?? ""; this.__h4_path.oninput = () => { w.value = this.__h4_path.value; }; }
                    else if (n === "author") { const inp = this.__h4_metadrawer.querySelector(".h4-meta-author"); if (inp) { inp.value = w.value ?? ""; inp.oninput = () => { w.value = inp.value; }; } }
                    else if (n === "comments") { const tx = this.__h4_metadrawer.querySelector(".h4-meta-comments"); if (tx) { tx.value = w.value ?? ""; tx.oninput = () => { w.value = tx.value; }; } }
                    else if (n === "save_mode") this.__h4_save_mode_widget = w;
                    else if (n === "queue_memory") {
                        this.__h4_queue_memory_widget = w;
                        this.h4_ui.queue_memory_enabled = !!w.value;
                    }
                    else if (n === "metadata_mode" || n === "json_mode") {
                        if (n === "metadata_mode") this.__h4_metadata_mode_widget = w;
                        else this.__h4_json_mode_widget = w;

                        const sel = this.__h4_metadrawer.querySelector(n === "metadata_mode" ? ".h4-meta-mode" : ".h4-json-mode");
                        if (sel) {
                            sel.innerHTML = "";
                            (w.options?.values || []).forEach(v => {
                                const o = document.createElement("option"); o.value = v; o.text = v;
                                sel.add(o);
                            });
                            sel.value = w.value;
                            sel.onchange = () => {
                                w.value = sel.value;
                                // --- DUAL-TRIGGER VISIBILITY: Show Custom drawer if EITHER mode is set to Custom ---
                                const metaMode = this.__h4_metadata_mode_widget?.value;
                                const jsonMode = this.__h4_json_mode_widget?.value;
                                this.h4_ui.show_custom_meta = (metaMode === "Custom" || jsonMode === "Custom");
                                this.setDirtyCanvas(true);
                            };
                        }
                    } else if (n === "custom_json") { const raw = this.__h4_customdrawer.querySelector(".h4-meta-raw"); if (raw) { raw.value = w.value || raw.value; raw.oninput = () => { w.value = raw.value; }; } }
                    cloakWidget(w);
                }); return true;
            };

            this.__h4_metadrawer._body.innerHTML = `
                <div class="h4-input-group">
                    <div class="h4-input-label">AUTHOR</div>
                    <input class="h4-meta-author h4-input" type="text" placeholder="h4" />
                </div>
                <div class="h4-input-group">
                    <div class="h4-input-label">EMBED MODE</div>
                    <select class="h4-meta-mode h4-input h4-select"></select>
                </div>
                <div class="h4-input-group">
                    <div class="h4-input-label">JSON MODE</div>
                    <select class="h4-json-mode h4-input h4-select"></select>
                </div>
                <div class="h4-input-group">
                    <div class="h4-input-label">COMMENTS</div>
                    <textarea class="h4-meta-comments h4-input" style="height:52px;resize:none;" placeholder="h4 - [ Approved ] - (b'.')b"></textarea>
                </div>
                <div class="h4-input-group">
                    <button class="h4-viewer-btn" title="Preview the metadata that will be embedded in your output images." style="width:100%;padding:8px;background:rgba(0,242,255,0.05);border:1px solid ${COLORS.accent};color:${COLORS.accent};cursor:pointer;font-weight:bold;border-radius:4px;font-size:11px;">🔍 PREVIEW EMBEDDED METADATA</button>
                </div>
            `;
            this.__h4_customdrawer._body.innerHTML = `
                <div class="h4-input-group">
                    <div class="h4-input-label" style="color:${COLORS.forensic};font-style:italic;">Raw JSON Blueprint</div>
                    <textarea class="h4-meta-raw h4-input" style="height:240px;border-color:${COLORS.forensic};resize:none;">{\n  "author": "h4",\n  "model_assigned": "Awesome Model of Awesomeness",\n  "comments": "h4 - [ Approved ] - (b'.')b"\n}</textarea>
                </div>
            `;
            const previewBtn = this.__h4_metadrawer.querySelector(".h4-viewer-btn"); if (previewBtn) previewBtn.onclick = () => { this.h4_ui.markViewerDirty(); this.h4_ui.show_viewer = !this.h4_ui.show_viewer; this.setDirtyCanvas(true); };
            bindWidgets(); setTimeout(bindWidgets, 300); setTimeout(bindWidgets, 900);

            // --- EXECUTION EVENT HOOK REDACTED: Handled by onExecuted to prevent duplicate fetches ---

            return this;
        };
        nodeType.prototype.onRemoved = function () {
            if (this.h4_ui) {
                this.h4_ui.stopPolling();
                this.h4_ui.stopBackgroundPolling();
                this.h4_ui.clearBitmapCache(); // Release GPU-decoded bitmaps to prevent VRAM leaks
                if (this.h4_ui.panelMode === 'popout') this.h4_ui._closePopout();
                if (this.h4_ui.panelMode === 'pinned') this.h4_ui._applyCanvasMargin(0);
                activeNodes.delete(this.h4_ui);
            }
            [this.__h4_prefix, this.__h4_path, this.__h4_core_drawer, this.__h4_detaildrawer,
            this.__h4_metadrawer, this.__h4_customdrawer, this.__h4_viewerdrawer,
            this.__h4_history_rail, this.__h4_lightbox].forEach(el => el?.remove());
        };
        nodeType.prototype.onExecuted = function (message) {
            if (this.h4_ui) {
                console.log("[h4] Execution Complete. Anchoring DNA to History Rail...");

                // TIER 1 — immediate, lightweight (let backend know we're ready)
                this.h4_ui.markParamsDirty();
                this.setDirtyCanvas(true, true);

                if (message.h4_history && message.h4_history.length > 0) {
                    const allImages = message.h4_history;

                    // --- QUEUE ACCUMULATION KERNEL (FIFO max 20) ---
                    const validBatch = allImages.filter(img => isImageFile(img.filename)).map(img => ({ ...img, filename: cleanFilename(img.filename) }));
                    if (validBatch.length > 0) {
                        const rawQId = Array.isArray(message.queue_id) ? message.queue_id[0] : message.queue_id;
                        const rawBCount = Array.isArray(message.batch_count) ? message.batch_count[0] : message.batch_count;
                        this.h4_ui.queue_sessions.unshift({
                            id: 'q_' + Date.now(),
                            node_queue_id: rawQId,
                            timestamp: Date.now(),
                            images: validBatch,
                            batch_count: rawBCount || validBatch.length
                        });
                        if (this.h4_ui.queue_sessions.length > 20) {
                            this.h4_ui.queue_sessions = this.h4_ui.queue_sessions.slice(0, 20);
                        }
                        this.h4_ui.saveQueueSessions();
                    }

                    // TIER 2 — deferred, medium weight (History Rail Injection)
                    requestIdleCallback(() => {
                        // NUCLEAR: Per-execution session seed. Unique per generation,
                        // immune to browser cache collision across runs.
                        const sessionSeed = Date.now();

                        [...allImages].reverse().forEach(img => {
                            // Guard: Reject non-image filenames from ever entering the history array
                            if (!isImageFile(img.filename)) {
                                console.warn(`[h4] Rejected non-image file from execution output: ${img.filename}`);
                                return;
                            }
                            // Sanitize: Strip accidental type-suffix artifacts from filename
                            img.filename = cleanFilename(img.filename);

                            const key = `${img.filename}::${img.subfolder}::${img.type}`;
                            const exists = this.h4_ui.history.some(h =>
                                `${h.filename}::${h.subfolder}::${h.type}` === key
                            );

                            if (!exists) {
                                const histItem = { ...img };

                                if (!this.h4_ui._pendingInjections) this.h4_ui._pendingInjections = [];
                                this.h4_ui._pendingInjections.unshift(histItem);
                                this.h4_ui.history.unshift(histItem);
                            }
                        });

                        this.h4_ui.history = this.h4_ui.history.slice(0, 5);
                        this.h4_ui.selected_idx = 0;
                        this.h4_ui.scroll_idx = 0;
                        this.h4_ui.current_sidecar = allImages[0].sidecar || null;
                        this.h4_ui.markDOMDirty();
                        this.h4_ui.updateHistoryRail();
                        this.h4_ui.scheduleDraw();
                    }, { timeout: 1000 });

                    // TIER 3 — lazy, heavy (Server sync and thumbnail decoding)
                    requestIdleCallback(() => {
                        this.h4_ui.fetchHistory(true);

                        // Pre-fetch the latest image directly into the GPU bitmap cache
                        const topImg = allImages[0];
                        if (topImg && isImageFile(topImg.filename)) {
                            const fullUrl = api.apiURL(`/view?filename=${encodeURIComponent(cleanFilename(topImg.filename))}&subfolder=${encodeURIComponent(topImg.subfolder)}&type=${encodeURIComponent(topImg.type)}`);
                            this.h4_ui.getBitmap(fullUrl);
                        }
                    }, { timeout: 3000 });
                }
            }
        };
        nodeType.prototype.onResize = function (size) { if (size[0] < MIN_SIZE[0]) size[0] = MIN_SIZE[0]; if (size[1] < MIN_SIZE[1]) size[1] = MIN_SIZE[1]; return size; };
        if (nodeType.prototype.onMouseDown && nodeType.prototype.onMouseDown.isH4) return;
        const origMouseDown = nodeType.prototype.onMouseDown;
        nodeType.prototype.onMouseDown = function (e, pos) {
            if (!this.h4_ui) return origMouseDown ? origMouseDown.apply(this, arguments) : false;
            try {
                let px = pos[0]; let py = pos[1];
                if (px === undefined || Math.abs(px) > 10000) {
                    const canvasPos = app.canvas.convertEventToCanvasOffset(e);
                    px = canvasPos[0] - this.pos[0];
                    py = canvasPos[1] - this.pos[1];
                }
                const mesh = getGrid(this);
                // --- TITLE BAR SOVEREIGNTY: Allow ComfyUI to handle node dragging/title clicks ---
                if (py < 30) return origMouseDown ? origMouseDown.apply(this, arguments) : false;
                // --- PREVIEW AREA: Capture clicks to prevent node drag and handle double-click for lightbox ---
                const pts = mesh.pts;
                const hit = r => r && px >= r.x - 4 && px <= r.x + r.w + 4 && py >= r.y - 4 && py <= r.y + r.h + 4;

                // --- SOVEREIGN BUTTON INTERCEPTOR ---
                // Handle HUD buttons directly in the node's capture phase to prevent LiteGraph consumption.
                // --- SOVEREIGN BUTTON INTERCEPTOR ---
                // Handle HUD buttons directly in the node's capture phase to prevent LiteGraph consumption.
                if (hit(pts.btn_p)) {
                    if (this.h4_ui.panelMode === 'pinned' || this.h4_ui.panelMode === 'popout') {
                        // Clicking P while pinned or popped out returns to docked
                        this.h4_ui.setPanelMode('docked');
                    } else {
                        this.h4_ui.show_params = !this.h4_ui.show_params;
                        this.h4_ui.markDOMDirty();
                    }
                    this.setDirtyCanvas(true);
                    return true;
                }
                if (hit(pts.btn_m)) { this.h4_ui.show_meta = !this.h4_ui.show_meta; this.h4_ui.markDOMDirty(); this.setDirtyCanvas(true); return true; }
                if (hit(pts.btn_h)) { this.h4_ui.markDOMDirty(); this.h4_ui.setHistoryOpen(!this.h4_ui.show_history); return true; }

                if (hit(pts.toggle_box)) {
                    if (this.__h4_save_mode_widget) {
                        this.__h4_save_mode_widget.value = !this.__h4_save_mode_widget.value;
                        if (this.__h4_save_mode_widget.callback) {
                            try { this.__h4_save_mode_widget.callback(this.__h4_save_mode_widget.value); }
                            catch (e) { console.warn("[h4] Widget callback error:", e); }
                        }
                        this.setDirtyCanvas(true);
                        app.graph.setDirtyCanvas(true, true);
                    }
                    return true;
                }

                if (hit(pts.queue_toggle_box)) {
                    if (this.__h4_queue_memory_widget) {
                        this.__h4_queue_memory_widget.value = !this.__h4_queue_memory_widget.value;
                        this.h4_ui.queue_memory_enabled = !!this.__h4_queue_memory_widget.value;
                        if (this.__h4_queue_memory_widget.callback) {
                            try { this.__h4_queue_memory_widget.callback(this.__h4_queue_memory_widget.value); }
                            catch (e) { console.warn("[h4] Widget callback error:", e); }
                        }
                    } else {
                        this.h4_ui.queue_memory_enabled = !this.h4_ui.queue_memory_enabled;
                    }
                    if (this.h4_ui) this.h4_ui.updateHistoryRail();
                    this.setDirtyCanvas(true);
                    app.graph.setDirtyCanvas(true, true);
                    return true;
                }


                if (hit(pts.preview_area)) {
                    const now = Date.now();
                    // Handle Double Click -> Lightbox
                    if (this._last_clk && (now - this._last_clk < 300)) {
                        this.h4_ui.lightbox_custom_items = null;
                        
                        if (this.h4_ui.output_traversal_enabled && this.h4_ui._outputTraversalFiles && this.h4_ui._outputTraversalFiles.length > 0) {
                            this.h4_ui._lightbox_full_folder = true;
                            this.h4_ui._lightboxFolderItems = this.h4_ui._outputTraversalFiles;
                            this.h4_ui._lightboxFolderIdx = this.h4_ui._outputTraversalIdx || 0;
                        } else if (this.h4_ui.queue_memory_enabled && this.h4_ui.queue_sessions && this.h4_ui.queue_sessions.length > 0) {
                            const qidx = this.h4_ui.queue_deck_idx || 0;
                            const qs = this.h4_ui.queue_sessions[qidx];
                            if (qs && qs.images && qs.images.length > 0) {
                                this.h4_ui.lightbox_custom_items = qs.images;
                                this.h4_ui.lightbox_custom_idx = this.h4_ui.queue_deck_img_idx || 0;
                            }
                        }
                        
                        this.h4_ui.show_lightbox = true;
                        this.h4_ui.updateLightbox();
                        this.h4_ui.scheduleDraw();
                    } else {
                        // Handle Single Click -> Cycle Images
                        if (this.h4_ui.output_traversal_enabled && this.h4_ui._outputTraversalFiles && this.h4_ui._outputTraversalFiles.length > 1) {
                            const total = this.h4_ui._outputTraversalFiles.length;
                            if (px < pts.preview_area.x + 40) {
                                this.h4_ui._outputTraversalIdx = ((this.h4_ui._outputTraversalIdx || 0) - 1 + total) % total;
                            } else {
                                this.h4_ui._outputTraversalIdx = ((this.h4_ui._outputTraversalIdx || 0) + 1) % total;
                            }
                            const activeItem = this.h4_ui._outputTraversalFiles[this.h4_ui._outputTraversalIdx];
                            if (activeItem) {
                                const hIdx = this.h4_ui.history.findIndex(h => h.filename === activeItem.filename && h.subfolder === activeItem.subfolder);
                                if (hIdx !== -1) {
                                    this.h4_ui.selected_idx = hIdx;
                                    this.h4_ui.fetchSidecar(hIdx);
                                }
                            }
                            this.h4_ui.updateHistoryRail();
                            this.setDirtyCanvas(true);
                            this.h4_ui.scheduleDraw();
                        } else if (this.h4_ui.queue_memory_enabled && this.h4_ui.queue_sessions && this.h4_ui.queue_sessions.length > 0) {
                            const qidx = this.h4_ui.queue_deck_idx || 0;
                            const qs = this.h4_ui.queue_sessions[qidx];
                            if (qs && qs.images && qs.images.length > 1) {
                                // Check if left arrow area was clicked
                                if (px < pts.preview_area.x + 40) {
                                    this.h4_ui.queue_deck_img_idx = ((this.h4_ui.queue_deck_img_idx || 0) - 1 + qs.images.length) % qs.images.length;
                                } else {
                                    this.h4_ui.queue_deck_img_idx = ((this.h4_ui.queue_deck_img_idx || 0) + 1) % qs.images.length;
                                }
                                
                                // Sync the selected history index so metadata/sidecar updates!
                                const activeItem = qs.images[this.h4_ui.queue_deck_img_idx];
                                const hIdx = this.h4_ui.history.findIndex(h => h.filename === activeItem.filename);
                                if (hIdx !== -1) {
                                    this.h4_ui.selected_idx = hIdx;
                                    this.h4_ui.fetchSidecar(hIdx);
                                }
                                
                                this.h4_ui.updateHistoryRail();
                                this.setDirtyCanvas(true);
                                this.h4_ui.scheduleDraw();
                            }
                        }
                    }
                    this._last_clk = now;
                    return true;
                }
                // --- ALL OTHER CLICKS: Handle via original LiteGraph chain ---
                return origMouseDown ? origMouseDown.apply(this, arguments) : false;
            } catch (err) {
                console.error("[h4] onMouseDown Fault:", err);
                return false; // On error, do NOT block the event — let the canvas handle it
            }
        };
        nodeType.prototype.onMouseDown.isH4 = true;
        nodeType.prototype.onMouseMove = function (e, pos) {
            if (!this.h4_ui) return;
            const pts = getGrid(this).pts;
            const canvasPos = app.canvas.convertEventToCanvasOffset(e);
            const px = canvasPos[0] - this.pos[0];
            const py = canvasPos[1] - this.pos[1];
            const hit = r => r && px >= r.x - 4 && px <= r.x + r.w + 4 && py >= r.y - 4 && py <= r.y + r.h + 4;
            if (hit(pts.btn_p)) showTip("Parameters - Settings for everything in the workflow that makes the image the image", e);
            else if (hit(pts.btn_m)) showTip("Metadata - Image DNA Thumbprint. Modify, edit, view, and otherwise control the meta of your image - Your image , Your data, Your business", e);
            else if (hit(pts.btn_h)) showTip("Histories - A Film Strip Styled thumbnailed history of your output folder // [now with colour coding]", e);
            else if (hit(pts.queue_toggle_box) || hit(pts.queue_mode)) showTip("Queue Memory - Toggle FIFO accumulation of queued run batches (Max 10). Displays a 3D cascading preview deck.", e);
            else if (hit(pts.prefix_box) || hit(pts.path_box) || hit(pts.toggle_box)) { /* handled by DOM tips */ }
            else hideTip();
        };
        nodeType.prototype.onMouseLeave = function () { hideTip(); };
        nodeType.prototype.onDrawForeground = function (ctx) {
            if (!this.h4_ui) return;
            ctx.save();
            try {
                const ui = this.h4_ui; const mesh = getGrid(this); const pts = mesh.pts;
                // Animation state and syncDOM now live inside syncDOM() itself.
                // onDrawForeground only handles canvas-rendered visuals.

                // --- NUCLEAR BLOAT REMOVAL (VISUAL ONLY) ---
                this.imgs = null; this.images = null;
                if (this.outputs) this.outputs.forEach(o => { o.label = ""; o.name = ""; });

                ui.syncDOM();
                this.size[0] = mesh.w; this.size[1] = mesh.h; // --- GEOMETRY ENFORCEMENT ---
                ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, mesh.w, mesh.baseH); ctx.strokeStyle = COLORS.border; ctx.lineWidth = 1; ctx.strokeRect(0, 0, mesh.w, mesh.baseH);
                
                let activeItem = null;
                const isOutputTraversal = ui.output_traversal_enabled && ui._outputTraversalFiles && ui._outputTraversalFiles.length > 0;
                const isQueueMode = !isOutputTraversal && (ui.queue_memory_enabled && ui.queue_sessions && ui.queue_sessions.length > 0);
                
                if (isOutputTraversal) {
                    const otIdx = (ui._outputTraversalIdx || 0) % ui._outputTraversalFiles.length;
                    activeItem = ui._outputTraversalFiles[otIdx];
                } else if (isQueueMode) {
                    const qidx = ui.queue_deck_idx || 0;
                    const imgIdx = ui.queue_deck_img_idx || 0;
                    if (ui.queue_sessions[qidx] && ui.queue_sessions[qidx].images.length > 0) {
                        // Ensure imgIdx doesn't go out of bounds if they click a smaller batch
                        const safeImgIdx = imgIdx % ui.queue_sessions[qidx].images.length;
                        activeItem = ui.queue_sessions[qidx].images[safeImgIdx];
                    }
                }
                
                if (!activeItem) {
                    if (ui.selected_idx >= 0 && ui.history[ui.selected_idx]) {
                        activeItem = ui.history[ui.selected_idx];
                    } else if (ui.history.length > 0) {
                        ui.selected_idx = 0;
                        activeItem = ui.history[0];
                    }
                }

                let activeImg = null;
                if (activeItem) {
                    if (isImageFile(activeItem.filename)) {
                        const fullUrl = api.apiURL(
                            `/view?filename=${encodeURIComponent(cleanFilename(activeItem.filename))}` +
                            `&subfolder=${encodeURIComponent(activeItem.subfolder)}` +
                            `&type=${encodeURIComponent(activeItem.type)}`
                        );
                        activeImg = ui.getBitmap(fullUrl);
                    }
                } else if (this.__h4_live_imgs?.length) {
                    activeImg = this.__h4_live_imgs[0];
                }

                const area = pts.preview_area;

                if (activeImg && activeImg.width > 0 && ui.viewer_anim < 0.98) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(area.x, area.y, area.w, area.h);
                    ctx.clip();
                    ctx.fillStyle = "#000";
                    ctx.fillRect(area.x, area.y, area.w, area.h);
                    const gr = Math.max(0.01, Math.min(area.w / activeImg.width, area.h / activeImg.height));
                    const dw = activeImg.width * gr;
                    const dh = activeImg.height * gr;
                    const dx = area.x + (area.w - dw) / 2;
                    const dy = area.y + (area.h - dh) / 2;
                    if (ui.viewer_anim > 0.05 && ui.viewer_anim < 0.9) {
                        const time = Date.now() * 0.001;
                        for (let i = 0; i < 4; i++) {
                            const sy = Math.random() * activeImg.height;
                            const sh = Math.random() * (activeImg.height * 0.1);
                            const ox = (Math.random() - 0.5) * 30 * Math.sin(time * 20);
                            ctx.save();
                            ctx.beginPath();
                            ctx.rect(dx, dy + (sy / activeImg.height) * dh, dw, (sh / activeImg.height) * dh);
                            ctx.clip();
                            ctx.drawImage(activeImg, dx + ox, dy, dw, dh);
                            ctx.restore();
                        }
                    } else {
                        ctx.drawImage(activeImg, dx, dy, dw, dh);
                    }
                    ctx.restore();
                    
                    const hasMultiImages = (isOutputTraversal && ui._outputTraversalFiles.length > 1) ||
                        (isQueueMode && ui.queue_sessions[ui.queue_deck_idx || 0]?.images?.length > 1);
                    if (hasMultiImages) {
                        ctx.save();
                        ctx.fillStyle = "rgba(0,0,0,0.3)";
                        ctx.fillRect(area.x, area.y, 30, area.h);
                        ctx.fillRect(area.x + area.w - 30, area.y, 30, area.h);
                        ctx.fillStyle = "rgba(0, 242, 255, 0.7)";
                        ctx.font = "bold 24px monospace";
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText("‹", area.x + 15, area.y + area.h/2);
                        ctx.fillText("›", area.x + area.w - 15, area.y + area.h/2);
                        ctx.restore();
                    }
                }

                // HUD Headers
                ctx.fillStyle = COLORS.dim;
                ctx.font = "10px monospace";
                ctx.textAlign = "center";
                ctx.fillText("IDENTITY ANCHOR", pts.prefix_box.x + pts.prefix_box.w / 2, pts.prefix_box.y - 8);
                ctx.fillText("OUTPUT PATH", pts.path_box.x + pts.path_box.w / 2, pts.path_box.y - 8);

                // REBRANDED HEADER TITLE
                ctx.textAlign = "center";
                ctx.font = "bold 16px monospace";
                ctx.fillStyle = COLORS.accent;
                ctx.fillText("h4 // Smart_Save_+Ultra edition", pts.title.x, pts.title.y);

                // 1. SAVE MODE PILL
                const isSave = !!this.__h4_save_mode_widget?.value;
                ctx.save();
                ctx.translate(pts.mode.x - pts.mode.w / 2, pts.mode.y - 12);
                ctx.fillStyle = isSave ? "rgba(0,255,138,0.08)" : "rgba(255,215,0,0.08)";
                ctx.strokeStyle = isSave ? COLORS.save : COLORS.preview;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.roundRect(0, 0, pts.mode.w, pts.mode.h, 12);
                ctx.fill();
                ctx.stroke();
                ctx.font = "bold 10px monospace";
                ctx.fillStyle = isSave ? COLORS.save : COLORS.preview;
                ctx.textAlign = "center";
                ctx.fillText(isSave ? "● SAVE TO DISK" : "● PREVIEW ONLY", pts.mode.w / 2, 16);
                ctx.restore();

                // SAVE MODE TACTILE SWITCH
                ctx.save();
                ctx.translate(pts.toggle_box.x, pts.toggle_box.y);
                const tW = pts.toggle_box.w;
                const tH = pts.toggle_box.h;
                const tR = tH / 2;
                ctx.beginPath();
                ctx.roundRect(0, 0, tW, tH, tR);
                ctx.fillStyle = "#050505";
                ctx.fill();
                ctx.strokeStyle = "#222";
                ctx.lineWidth = 1;
                ctx.stroke();
                if (isSave) {
                    ctx.shadowBlur = 8; ctx.shadowColor = COLORS.save; ctx.fillStyle = COLORS.save + "44";
                    ctx.beginPath(); ctx.roundRect(tW / 2 + 1, 2, tW / 2 - 3, tH - 4, tR - 2); ctx.fill();
                } else {
                    ctx.shadowBlur = 8; ctx.shadowColor = COLORS.preview; ctx.fillStyle = COLORS.preview + "44";
                    ctx.beginPath(); ctx.roundRect(2, 2, tW / 2 - 3, tH - 4, tR - 2); ctx.fill();
                }
                const knobX = isSave ? tW - 18 : 2;
                ctx.shadowBlur = 12; ctx.shadowColor = "#000";
                ctx.fillStyle = "#333"; ctx.beginPath(); ctx.roundRect(knobX, 2, 16, 16, 8); ctx.fill();
                ctx.strokeStyle = "#444"; ctx.lineWidth = 1; ctx.stroke();
                ctx.shadowBlur = 0; ctx.fillStyle = "rgba(255,255,255,0.05)";
                ctx.beginPath(); ctx.arc(knobX + 8, 2 + 8, 4, 0, Math.PI * 2); ctx.fill();
                ctx.restore();

                // 2. QUEUE MEMORY PILL
                const isQMem = !!(this.__h4_queue_memory_widget?.value ?? ui.queue_memory_enabled);
                ctx.save();
                ctx.translate(pts.queue_mode.x - pts.queue_mode.w / 2, pts.queue_mode.y - 12);
                ctx.fillStyle = isQMem ? "rgba(0,242,255,0.08)" : "rgba(100,100,100,0.08)";
                ctx.strokeStyle = isQMem ? COLORS.accent : COLORS.dim2;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.roundRect(0, 0, pts.queue_mode.w, pts.queue_mode.h, 12);
                ctx.fill();
                ctx.stroke();
                ctx.font = "bold 10px monospace";
                ctx.fillStyle = isQMem ? COLORS.accent : COLORS.dim2;
                ctx.textAlign = "center";
                ctx.fillText(isQMem ? "● QUEUE FIFO: ON" : "○ QUEUE FIFO: OFF", pts.queue_mode.w / 2, 16);
                ctx.restore();

                // QUEUE MEMORY TACTILE SWITCH
                ctx.save();
                ctx.translate(pts.queue_toggle_box.x, pts.queue_toggle_box.y);
                const qtW = pts.queue_toggle_box.w;
                const qtH = pts.queue_toggle_box.h;
                const qtR = qtH / 2;
                ctx.beginPath();
                ctx.roundRect(0, 0, qtW, qtH, qtR);
                ctx.fillStyle = "#050505";
                ctx.fill();
                ctx.strokeStyle = "#222";
                ctx.lineWidth = 1;
                ctx.stroke();
                if (isQMem) {
                    ctx.shadowBlur = 8; ctx.shadowColor = COLORS.accent; ctx.fillStyle = COLORS.accent + "44";
                    ctx.beginPath(); ctx.roundRect(qtW / 2 + 1, 2, qtW / 2 - 3, qtH - 4, qtR - 2); ctx.fill();
                } else {
                    ctx.shadowBlur = 4; ctx.shadowColor = "#333"; ctx.fillStyle = "rgba(255,255,255,0.05)";
                    ctx.beginPath(); ctx.roundRect(2, 2, qtW / 2 - 3, qtH - 4, qtR - 2); ctx.fill();
                }
                const qKnobX = isQMem ? qtW - 18 : 2;
                ctx.shadowBlur = 12; ctx.shadowColor = "#000";
                ctx.fillStyle = "#333"; ctx.beginPath(); ctx.roundRect(qKnobX, 2, 16, 16, 8); ctx.fill();
                ctx.strokeStyle = "#444"; ctx.lineWidth = 1; ctx.stroke();
                ctx.shadowBlur = 0; ctx.fillStyle = "rgba(255,255,255,0.05)";
                ctx.beginPath(); ctx.arc(qKnobX + 8, 2 + 8, 4, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
                const drawButton = (r, label, active = false, fg = COLORS.dim, glow = false) => { ctx.save(); if (glow) { ctx.shadowBlur = 10; ctx.shadowColor = COLORS.accent; } ctx.fillStyle = active ? "#111" : "rgba(28,28,28,0.9)"; ctx.strokeStyle = active ? COLORS.accent : (glow ? COLORS.accent : COLORS.border); ctx.lineWidth = active || glow ? 1.5 : 1; ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 5); ctx.fill(); ctx.stroke(); ctx.fillStyle = active || glow ? COLORS.accent : fg; ctx.font = `bold ${Math.round(r.w * 0.45)}px monospace`; ctx.textAlign = "center"; ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + (r.h * 0.15)); ctx.restore(); };

                const isPinned = ui.panelMode === 'pinned';
                const isPopout = ui.panelMode === 'popout';
                const pActive = ui.show_params || isPinned || isPopout;
                const pGlow = isPinned || isPopout;
                const pLabel = isPopout ? '↗' : isPinned ? '📌' : 'P';
                drawButton(pts.btn_p, pLabel, pActive, isPinned ? COLORS.accent : COLORS.dim, pGlow);

                drawButton(pts.btn_m, "M", ui.show_meta); drawButton(pts.btn_h, "H", ui.show_history);
                if (activeImg && activeImg.width > 0) { ctx.font = "11px monospace"; ctx.fillStyle = COLORS.accent; ctx.textAlign = "center"; ctx.fillText(`${activeImg.width} x ${activeImg.height}`, pts.lod_badge.x, pts.lod_badge.y); }

                // Cache verification
                if (!this._logged_layout_v2) {
                    console.log("✅ h4_SmartSave: New Symmetric Layout Loaded (Cache Busted!)");
                    this._logged_layout_v2 = true;
                }

                // --- SECURE TERMINAL PURGE ---
                this.imgs = null; this.images = null;
            } catch (e) { console.error("[h4] onDrawForeground Fault:", e); } finally { ctx.restore(); }
        };
    },
});