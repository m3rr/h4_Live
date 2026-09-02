import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

const EXTENSION_NAME = "h4.ImageCompressor.SmartSkin";

const TARGETS = new Set([
    "h4_imagecompressor",
    "h4 image compressor",
    "h4 // image compressor",
    "h4_image_compressor",
    "h4imagecompressor",
    "h4_imagecompressor",
    "h4 // image compressor - save mode",
    "h4 // image compressor - preview mode",
]);

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
};

const MIN_SIZE = [750, 500];
const DRAWER_W = 340;
const DRAWER_GAP = 15;
const RAIL_H = 150;
const HISTORY_LIMIT_VISIBLE = 5;
const SCRUB_BTN_W = 28;

const activeNodes = new Set();
let globalLoopStarted = false;

const VALID_IMG_EXTS = new Set(["png", "jpg", "jpeg", "webp", "gif", "avif", "bmp", "tiff"]);

function lower(v) {
    return String(v || "").trim().toLowerCase();
}

function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
}

function safeText(v) {
    if (v === null || v === undefined) return "";
    if (typeof v === "object") {
        try {
            return JSON.stringify(v);
        } catch {
            return String(v);
        }
    }
    return String(v);
}

function isImageFile(filename) {
    if (!filename || typeof filename !== "string") return false;
    const clean = filename.replace(/\s*\[(?:output|input|temp)\]\s*/gi, "").trim();
    const ext = clean.split(".").pop().toLowerCase();
    return VALID_IMG_EXTS.has(ext);
}

function cleanFilename(filename) {
    if (!filename) return filename;
    return String(filename).replace(/\s*\[(?:output|input|temp)\]\s*/gi, "").trim();
}

function formatBytes(bytes) {
    const n = Number(bytes || 0);
    if (!Number.isFinite(n) || n <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    let size = n;
    let i = 0;
    while (size >= 1024 && i < units.length - 1) {
        size /= 1024;
        i += 1;
    }
    return `${size >= 10 || i === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[i]}`;
}

function isModalOpen() {
    const check = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        const style = window.getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity) < 0.1) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 50 && rect.height > 50;
    };

    return (
        check(".comfy-modal") ||
        check(".comfy-dialog") ||
        check("dialog[open]") ||
        check("#comfy-settings-dialog") ||
        check(".comfy-settings-dialog") ||
        check(".p3-modal") ||
        check(".comfy-logging-logs") ||
        check(".comfy-menu-panel") ||
        check("[data-floating-panel]") ||
        check(".dialog-container") ||
        app?.ui?.settings?.visible === true
    );
}

function isTargetNode(nodeType, nodeDef) {
    const name = lower(nodeDef?.name);
    const display = lower(nodeDef?.displayName);
    const className = lower(nodeType?.name);
    const category = lower(nodeDef?.category);

    if (TARGETS.has(name) || TARGETS.has(display) || TARGETS.has(className)) return true;
    if (category === "h4" && (name.includes("compressor") || display.includes("compressor") || className.includes("compressor"))) return true;
    return className.includes("compressor") && className.includes("h4");
}

function getCanvas() {
    return app?.canvas?.canvas || document.querySelector("canvas");
}

function getDS() {
    return app?.canvas?.ds || null;
}

function getCanvasRect() {
    const canvas = getCanvas();
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (!Number.isFinite(rect.left) || !Number.isFinite(rect.top)) return null;
    return rect;
}

function projectToScreen(x, y) {
    const ds = getDS();
    const rect = getCanvasRect();
    if (!ds || !rect) return null;
    return {
        x: (x + ds.offset[0]) * ds.scale + rect.left,
        y: (y + ds.offset[1]) * ds.scale + rect.top,
        scale: ds.scale,
    };
}

function getWidget(node, name) {
    return node?.widgets?.find((w) => w?.name === name) || null;
}

function setWidgetValue(node, name, value) {
    const w = getWidget(node, name);
    if (!w) return false;

    let finalVal = value;
    const origType = typeof w.value;

    if (origType === "number") {
        finalVal = Number(value);
        if (!Number.isFinite(finalVal)) finalVal = Number(w.value || 0);
    } else if (origType === "boolean") {
        finalVal = !!value;
    } else if (origType === "string") {
        finalVal = String(value);
    }

    w.value = finalVal;

    try {
        if (typeof w.callback === "function") {
            w.callback.call(w, finalVal);
        }
    } catch (err) {
        console.warn("[h4 compressor] widget callback fault", name, err);
    }

    try {
        if (typeof node.onWidgetChanged === "function") {
            node.onWidgetChanged(w.name, finalVal, w);
        }
    } catch (err) {
        console.warn("[h4 compressor] onWidgetChanged fault", name, err);
    }

    try {
        app?.graph?.setDirtyCanvas?.(true, true);
        app?.canvas?.setDirty?.(true, true);
        node?.setDirtyCanvas?.(true, true);
    } catch {
    }

    return true;
}

function getWidgetValue(node, name, fallback = null) {
    const w = getWidget(node, name);
    if (!w) return fallback;
    return w.value;
}

function ensureNodeSize(node) {
    const w = Math.max(MIN_SIZE[0], Number(node.size?.[0] || 0));
    const h = Math.max(MIN_SIZE[1], Number(node.size?.[1] || 0));
    if (typeof node.setSize === "function") {
        node.setSize([w, h]);
    } else {
        node.size = [w, h];
    }
}

function hit(pt, rect) {
    const [x, y] = pt;
    return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function viewUrl(item) {
    const filename = encodeURIComponent(cleanFilename(item.filename || ""));
    const subfolder = encodeURIComponent(item.subfolder || "");
    const type = encodeURIComponent(item.type || "output");
    if (api?.apiURL) {
        return api.apiURL(`/view?filename=${filename}&subfolder=${subfolder}&type=${type}`);
    }
    return `/view?filename=${filename}&subfolder=${subfolder}&type=${type}`;
}

function getGrid(node) {
    const baseW = Math.max(MIN_SIZE[0], Number(node.size?.[0] || MIN_SIZE[0]));
    const baseH = Math.max(MIN_SIZE[1], Number(node.size?.[1] || MIN_SIZE[1]));
    const cx = baseW / 2;
    const previewArea = { x: 74, y: 108, w: baseW - 148, h: baseH - 188 };
    const thumbW = 110;
    const thumbGap = 12;
    const railNavW = 80;
    const railPad = 30;
    const histLen = node?.h4ui?.history?.length ?? 0;
    const maxFitByWidth = Math.floor((baseW - railNavW - railPad - thumbGap) / (thumbW + thumbGap));
    const thumbCount = Math.min(HISTORY_LIMIT_VISIBLE, Math.max(1, histLen || 1), Math.max(1, maxFitByWidth || 1));
    const railW = railNavW + railPad + thumbCount * (thumbW + thumbGap) - thumbGap;
    const railX = baseW / 2 - railW / 2;

    return {
        w: baseW,
        h: baseH,
        pts: {
            mode: { x: 18, y: 44, w: 240, h: 28 },
            historyBtn: { x: 18, y: baseH - 54, w: 110, h: 28 },
            refreshBtn: { x: 136, y: baseH - 54, w: 28, h: 28 },
            previewArea,
            drawerCore: { x: baseW + DRAWER_GAP, y: 10, w: DRAWER_W, h: baseH - 20 },
            historyRail: { x: railX, y: baseH + 10, w: railW, h: RAIL_H },
            scrubPrev: { x: previewArea.x - SCRUB_BTN_W - 8, y: previewArea.y + previewArea.h / 2 - 20, w: SCRUB_BTN_W, h: 40 },
            scrubNext: { x: previewArea.x + previewArea.w + 8, y: previewArea.y + previewArea.h / 2 - 20, w: SCRUB_BTN_W, h: 40 },
            title: { x: cx, y: 32 },
        },
    };
}

const tooltip = document.createElement("div");
tooltip.style.cssText = [
    "position:fixed",
    "z-index:11000",
    "background:rgba(5,5,5,0.98)",
    `border:1px solid ${COLORS.accent}`,
    `color:${COLORS.accent}`,
    "padding:10px 14px",
    "font-size:12px",
    "font-family:monospace",
    "pointer-events:none",
    "border-radius:6px",
    "display:none",
    "max-width:280px",
    "box-shadow:0 0 20px rgba(0,0,0,0.8)",
    "line-height:1.5",
    "font-weight:bold",
].join(";");
document.body.appendChild(tooltip);

let tooltipTimer = null;
let currentTooltip = null;

function showTip(text, e) {
    if (!text) {
        hideTip();
        return;
    }
    if (text === currentTooltip) {
        updateTipPos(e);
        return;
    }
    hideTip();
    currentTooltip = text;
    const x = e.clientX;
    const y = e.clientY;
    tooltipTimer = setTimeout(() => {
        tooltip.innerHTML = safeText(text).replaceAll("//", "<br><span style='color:#666;font-size:10px;font-style:italic;'>");
        tooltip.style.display = "block";
        tooltip.style.left = `${x + 18}px`;
        tooltip.style.top = `${y + 18}px`;
    }, 850);
}

function updateTipPos(e) {
    if (tooltip.style.display === "block") {
        tooltip.style.left = `${e.clientX + 18}px`;
        tooltip.style.top = `${e.clientY + 18}px`;
    }
}

function hideTip() {
    if (tooltipTimer) clearTimeout(tooltipTimer);
    tooltipTimer = null;
    currentTooltip = null;
    tooltip.style.display = "none";
}

document.addEventListener("mouseover", (e) => {
    const target = e.target.closest("[data-h4-tip]");
    if (target) showTip(target.getAttribute("data-h4-tip"), e);
});
document.addEventListener("mousemove", (e) => updateTipPos(e));
document.addEventListener("mouseout", (e) => {
    const target = e.target.closest("[data-h4-tip]");
    if (target) hideTip();
});

const styleId = "h4-img-compressor-smart-skin-styles";
if (!document.getElementById(styleId)) {
    const s = document.createElement("style");
    s.id = styleId;
    s.innerHTML = `
        .h4-hud-el {
            user-select: none !important;
            -webkit-user-drag: none !important;
            -webkit-touch-callout: none;
            box-sizing: border-box;
        }
        .h4-hud-el img {
            -webkit-user-drag: none !important;
            pointer-events: none !important;
        }
        .h4-hud-el input,
        .h4-hud-el textarea,
        .h4-hud-el select {
            user-select: text !important;
            -webkit-user-drag: auto !important;
        }
        .h4gridscroll::-webkit-scrollbar {
            width: 4px;
            height: 4px;
        }
        .h4gridscroll::-webkit-scrollbar-track {
            background: transparent;
        }
        .h4gridscroll::-webkit-scrollbar-thumb {
            background: #333;
            border-radius: 4px;
        }
        .h4gridscroll::-webkit-scrollbar-thumb:hover {
            background: #00f2ff;
        }
        .h4-panel {
            position: fixed;
            z-index: 100;
            display: none;
            background: rgba(10,10,10,0.98);
            border: 1.5px solid #222;
            color: #00f2ff;
            font-family: monospace;
            box-sizing: border-box;
            overflow-y: auto;
            overflow-x: hidden;
            border-radius: 8px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.45);
        }
        .h4-panel[data-pinned="true"] {
            border-right: 1.5px solid #00f2ff !important;
            box-shadow: 4px 0 24px rgba(0,242,255,0.08);
            border-radius: 0 !important;
        }
        .h4-panel-header {
            margin: 12px;
            font-weight: 900;
            border-bottom: 1.5px solid #333;
            padding-bottom: 6px;
            font-size: 14px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 8px;
        }
        .h4-panel-body {
            padding: 0 0 12px 0;
        }
        .h4-btn {
            background: rgba(255,255,255,0.04);
            border: 1px solid #444;
            color: #666;
            border-radius: 4px;
            padding: 4px 8px;
            font-size: 10px;
            cursor: pointer;
            font-family: monospace;
            font-weight: bold;
            transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease;
        }
        .h4-btn:hover {
            border-color: #00f2ff;
            color: #00f2ff;
        }
        .h4-btn.active {
            background: rgba(0, 242, 255, 0.12);
            border-color: #00f2ff;
            color: #00f2ff;
        }
        .h4-btn.save-mode.active {
            background: rgba(0, 255, 138, 0.14);
            border-color: #00ff8a;
            color: #00ff8a;
        }
        .h4-btn.preview-mode.active {
            background: rgba(255, 215, 0, 0.14);
            border-color: #ffd700;
            color: #ffd700;
        }
        .h4-input-group {
            margin-bottom: 10px;
            padding: 0 15px;
        }
        .h4-input-label {
            font-size: 9px;
            color: #aaa;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 8px;
        }
        .h4-input-note {
            color: #555;
            font-size: 9px;
            text-transform: none;
            letter-spacing: 0;
        }
        .h4-input,
        .h4-range,
        .h4-select {
            width: 100%;
            background: #111;
            border: 1px solid #333;
            color: #fff;
            padding: 7px 8px;
            box-sizing: border-box;
            border-radius: 4px;
            font-family: monospace;
        }
        .h4-input:focus,
        .h4-range:focus,
        .h4-select:focus {
            outline: none;
            border-color: #00f2ff;
            box-shadow: 0 0 0 1px rgba(0,242,255,0.24);
        }
        .h4-select {
            color: #00f2ff;
        }
        .h4-toggle-row {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 8px;
            align-items: center;
        }
        .h4-toggle {
            display: inline-flex;
            gap: 6px;
            padding: 4px;
            background: rgba(255,255,255,0.03);
            border: 1px solid #2a2a2a;
            border-radius: 6px;
        }
        .h4-flag {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 72px;
            height: 26px;
            padding: 0 10px;
            border-radius: 4px;
            border: 1px solid #333;
            font-size: 10px;
            font-weight: 900;
            letter-spacing: 0.6px;
            cursor: pointer;
            background: rgba(255,255,255,0.03);
            color: #777;
        }
        .h4-flag.active {
            color: #fff;
            text-shadow: 0 0 8px rgba(255,255,255,0.18);
        }
        .h4-flag.save.active {
            background: rgba(0,255,138,0.12);
            border-color: #00ff8a;
            color: #00ff8a;
        }
        .h4-flag.preview.active {
            background: rgba(255,215,0,0.12);
            border-color: #ffd700;
            color: #ffd700;
        }
        .h4-card {
            margin: 0 12px 12px 12px;
            background: rgba(20,20,20,0.55);
            border: 1px solid #222;
            border-radius: 6px;
            overflow: hidden;
            position: relative;
        }
        .h4-card-header {
            background: #222;
            color: #aaa;
            font-size: 10px;
            padding: 4px 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .h4-card-body {
            padding: 8px;
        }
        .h4-card-row {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            margin-bottom: 4px;
            font-size: 10px;
            white-space: nowrap;
            overflow: hidden;
        }
        .h4-card-label {
            color: #555;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .h4-card-value {
            color: #00f2ff;
            text-align: right;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .h4-preview-pane {
            position: fixed;
            z-index: 96;
            display: none;
            background: linear-gradient(180deg, rgba(16,16,16,0.98), rgba(8,8,8,0.98));
            border: 1.5px solid #222;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: inset 0 0 0 1px rgba(255,255,255,0.02), 0 8px 28px rgba(0,0,0,0.35);
        }
        .h4-preview-inner {
            position: absolute;
            inset: 0;
            display: grid;
            place-items: center;
            overflow: hidden;
            background:
                linear-gradient(rgba(255,255,255,0.02), rgba(255,255,255,0.01)),
                radial-gradient(circle at 20% 20%, rgba(0,242,255,0.08), transparent 45%),
                radial-gradient(circle at 80% 80%, rgba(0,242,255,0.05), transparent 35%);
        }
        .h4-preview-inner img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            pointer-events: none;
        }
        .h4-preview-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 10px;
            padding: 20px;
            text-align: center;
            color: #666;
            font-family: monospace;
        }
        .h4-preview-empty .main {
            color: #00f2ff;
            font-weight: 900;
            font-size: 12px;
            letter-spacing: 1px;
        }
        .h4-preview-empty .sub {
            color: #666;
            font-size: 10px;
            max-width: 260px;
            line-height: 1.5;
        }
        .h4-rail {
            position: fixed;
            z-index: 101;
            display: none;
            background: rgba(10,10,10,0.98);
            border: 1.5px solid #222;
            border-radius: 6px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.45);
        }
        .h4-rail .h4-rail-nav {
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255,255,255,0.02);
            color: #00f2ff;
            font-size: 20px;
            cursor: pointer;
            user-select: none;
        }
        .h4-rail .h4-rail-nav:hover {
            background: rgba(0,242,255,0.08);
            color: #fff;
            text-shadow: 0 0 10px #00f2ff;
        }
        .h4-hist-item {
            min-width: 110px;
            height: 110px;
            background: #000;
            border: 2px solid #333;
            position: relative;
            cursor: pointer;
            border-radius: 4px;
            overflow: hidden;
            animation: h4-thumb-in 0.25s ease both;
        }
        .h4-hist-item.active {
            border-color: #00f2ff;
            box-shadow: 0 0 12px rgba(0,242,255,0.53);
        }
        .h4-hist-item img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .h4-lightbox {
            position: fixed;
            inset: 0;
            z-index: 12000;
            background: rgba(0,0,0,0.94);
            display: none;
            align-items: center;
            justify-content: center;
        }
        .h4-lightbox img {
            max-width: 92vw;
            max-height: 92vh;
            object-fit: contain;
            box-shadow: 0 0 40px rgba(0,0,0,0.8);
        }
        .h4-lightbox-close {
            position: fixed;
            top: 18px;
            right: 18px;
            background: rgba(255,255,255,0.05);
            border: 1px solid #333;
            color: #00f2ff;
            border-radius: 6px;
            padding: 8px 12px;
            font: bold 12px monospace;
            cursor: pointer;
        }
        .h4-lightbox-close:hover {
            border-color: #00f2ff;
            color: #fff;
        }
        @keyframes h4-thumb-in {
            from { opacity: 0; transform: translateY(8px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .h4-subhud {
            color: #555;
            font-size: 10px;
            font-family: monospace;
        }
    `;
    document.head.appendChild(s);
}

class H4ImageCompressorUI {
    constructor(node) {
        this.node = node;
        this.history = [];
        this.selectedIdx = -1;
        this.scrollIdx = 0;
        this.showHistory = false;
        this.showLightbox = false;
        this.panelMode = "docked";
        this.pinnedPos = { x: 0, y: 0, w: DRAWER_W, h: window.innerHeight };
        this.historyInflight = false;
        this._historyForcePending = false;
        this._lastHistorySignature = "";
        this.pollTimer = null;
        this.backgroundPollTimer = null;
        this.lastPreviewUrl = "";
        this.domCreated = false;

        this.ensureDefaults();
        this.createDOM();
        this.updateNodeTitle();
        this.fetchHistory(false);
        this.startBackgroundPolling();
    }

    ensureDefaults() {
        ensureNodeSize(this.node);
        if (!String(getWidgetValue(this.node, "save_path", "") || "").trim()) {
            setWidgetValue(this.node, "save_path", "H4_Compressor/");
        }
        const format = String(getWidgetValue(this.node, "format", "JPEG") || "JPEG").toUpperCase();
        if (!["JPEG", "PNG", "WEBP", "BMP", "TIFF", "GIF"].includes(format)) {
            setWidgetValue(this.node, "format", "JPEG");
        }
        if (getWidgetValue(this.node, "save_mode", null) === null) {
            setWidgetValue(this.node, "save_mode", true);
        }
        if (getWidgetValue(this.node, "preview_only", null) === null) {
            setWidgetValue(this.node, "preview_only", false);
        }
        if (getWidgetValue(this.node, "show_preview", null) === null) {
            setWidgetValue(this.node, "show_preview", true);
        }
    }

    createDOM() {
        if (this.domCreated) return;
        this.domCreated = true;

        this.coreDrawer = document.createElement("div");
        this.coreDrawer.className = "h4-panel h4-hud-el h4gridscroll";
        this.coreDrawer.style.pointerEvents = "auto";
        document.body.appendChild(this.coreDrawer);

        this.previewPane = document.createElement("div");
        this.previewPane.className = "h4-preview-pane h4-hud-el";
        this.previewPane.innerHTML = `<div class="h4-preview-inner"></div>`;
        document.body.appendChild(this.previewPane);

        this.historyRail = document.createElement("div");
        this.historyRail.className = "h4-rail h4-hud-el";
        document.body.appendChild(this.historyRail);

        this.lightbox = document.createElement("div");
        this.lightbox.className = "h4-lightbox h4-hud-el";
        this.lightbox.innerHTML = `
            <button class="h4-lightbox-close">CLOSE</button>
            <img alt="Compressed image preview">
        `;
        document.body.appendChild(this.lightbox);

        this.lightbox.addEventListener("mousedown", (e) => {
            e.stopPropagation();
        });

        this.lightbox.addEventListener("click", (e) => {
            if (e.target === this.lightbox || e.target.classList.contains("h4-lightbox-close")) {
                this.closeLightbox();
            }
        });

        this.renderCoreDrawer();
        this.updatePreviewPane();
        this.updateHistoryRail();
    }

    destroy() {
        this.stopPolling();
        this.stopBackgroundPolling();
        [this.coreDrawer, this.previewPane, this.historyRail, this.lightbox].forEach((el) => {
            if (el && el.parentNode) el.parentNode.removeChild(el);
        });
    }

    getMode() {
        const saveMode = !!getWidgetValue(this.node, "save_mode", true);
        return saveMode ? "save" : "preview";
    }

    applyMode(mode) {
        const saveMode = mode === "save";
        setWidgetValue(this.node, "save_mode", saveMode);
        setWidgetValue(this.node, "preview_only", !saveMode);
        if (saveMode) {
            setWidgetValue(this.node, "show_preview", true);
            const sp = String(getWidgetValue(this.node, "save_path", "") || "").trim();
            if (!sp) {
                setWidgetValue(this.node, "save_path", "H4_Compressor/");
            }
        }
        this.updateNodeTitle();
        this.renderCoreDrawer();
        this.node.setDirtyCanvas?.(true, true);
    }

    updateNodeTitle() {
        const mode = this.getMode();
        this.node.title = mode === "save"
            ? "h4 // Image Compressor - Save Mode"
            : "h4 // Image Compressor - Preview Mode";
    }

    setPanelMode(mode) {
        this.panelMode = mode === "pinned" ? "pinned" : "docked";
        if (this.panelMode === "pinned") {
            this.pinnedPos = { x: 0, y: 0, w: DRAWER_W, h: window.innerHeight };
            this.coreDrawer.setAttribute("data-pinned", "true");
        } else {
            this.coreDrawer.removeAttribute("data-pinned");
        }
        this.syncDOM();
    }

    toggleHistory() {
        this.showHistory = !this.showHistory;
        if (this.showHistory) {
            this.fetchHistory(false);
            this.startPolling();
        } else {
            this.stopPolling();
        }
        this.updateHistoryRail();
    }

    openLightbox(idx = this.selectedIdx) {
        const item = this.history[idx];
        if (!item) return;
        this.selectedIdx = idx;
        const img = this.lightbox.querySelector("img");
        img.src = viewUrl(item);
        this.lightbox.style.display = "flex";
        this.showLightbox = true;
    }

    closeLightbox() {
        this.showLightbox = false;
        this.lightbox.style.display = "none";
        const img = this.lightbox.querySelector("img");
        img.removeAttribute("src");
    }

    startPolling() {
        if (this.pollTimer) return;
        this.pollTimer = setInterval(() => {
            if (!this.showHistory) {
                this.stopPolling();
                return;
            }
            this.fetchHistory(false);
        }, 3000);
    }

    stopPolling() {
        if (this.pollTimer) clearInterval(this.pollTimer);
        this.pollTimer = null;
    }

    startBackgroundPolling() {
        if (this.backgroundPollTimer) return;
        this.backgroundPollTimer = setInterval(() => {
            if (!this.pollTimer) this.fetchHistory(false);
        }, 30000);
    }

    stopBackgroundPolling() {
        if (this.backgroundPollTimer) clearInterval(this.backgroundPollTimer);
        this.backgroundPollTimer = null;
    }

    async fetchHistory(force = false) {
        if (this.historyInflight) {
            if (force && !this._historyForcePending) this._historyForcePending = true;
            return;
        }

        this.historyInflight = true;
        this._historyForcePending = false;

        try {
            const res = await api.fetchApi("/h4/image_compressor/history");
            if (!res.ok) return;
            let data = await res.json();
            if (!Array.isArray(data)) data = [];

            data = data.filter((x) => isImageFile(x?.filename || ""));

            const sig = JSON.stringify(
                data.map((x) => [x.filename, x.subfolder, x.type, x.timestamp, x.size_bytes, x.format])
            );

            if (sig !== this._lastHistorySignature) {
                this._lastHistorySignature = sig;
                this.history = data.slice(0, 50);

                if (this.selectedIdx >= this.history.length) {
                    this.selectedIdx = this.history.length ? 0 : -1;
                }

                if (this.selectedIdx < 0 && this.history.length) {
                    this.selectedIdx = 0;
                }

                const activeVisibleCount = this.getVisibleThumbCount();
                const maxScroll = Math.max(0, this.history.length - activeVisibleCount);
                this.scrollIdx = clamp(this.scrollIdx, 0, maxScroll);

                this.updateHistoryRail();
                this.updatePreviewPane();
                this.node.setDirtyCanvas?.(true, true);
            }
        } catch (err) {
            console.error("[h4 compressor] history fetch fault", err);
        } finally {
            this.historyInflight = false;
            if (this._historyForcePending) {
                this._historyForcePending = false;
                setTimeout(() => this.fetchHistory(true), 150);
            }
        }
    }

    getVisibleThumbCount() {
        const baseW = Math.max(MIN_SIZE[0], Number(this.node.size?.[0] || MIN_SIZE[0]));
        const maxFitByWidth = Math.floor((baseW - 80 - 30 - 12) / (110 + 12));
        return Math.min(HISTORY_LIMIT_VISIBLE, Math.max(1, maxFitByWidth || 1));
    }

    renderCoreDrawer() {
        const mode = this.getMode();
        const quality = Number(getWidgetValue(this.node, "quality", 85) || 85);
        const format = String(getWidgetValue(this.node, "format", "JPEG") || "JPEG").toUpperCase();
        const showPreview = !!getWidgetValue(this.node, "show_preview", true);
        const savePath = safeText(getWidgetValue(this.node, "save_path", "H4_Compressor/") || "H4_Compressor/");
        const background = safeText(getWidgetValue(this.node, "background_color", "255,255,255") || "255,255,255");
        const previewOnly = !!getWidgetValue(this.node, "preview_only", !getWidgetValue(this.node, "save_mode", true));

        this.coreDrawer.innerHTML = `
            <div class="h4-panel-header">
                <span>h4 // IMAGE COMPRESSOR</span>
                <div style="display:flex; gap:6px; align-items:center;">
                    <button class="h4-btn ${this.panelMode === "pinned" ? "active" : ""}" data-action="pin">${this.panelMode === "pinned" ? "PINNED" : "PIN"}</button>
                    <button class="h4-btn" data-action="refresh">SYNC</button>
                </div>
            </div>

            <div class="h4-panel-body">
                <div class="h4-input-group">
                    <div class="h4-input-label">
                        <span>PRIMARY MODE</span>
                        <span class="h4-input-note">${mode === "save" ? "Compression + save pipeline armed" : "Compression preview pipeline armed"}</span>
                    </div>
                    <div class="h4-toggle">
                        <button class="h4-flag save ${mode === "save" ? "active" : ""}" data-action="mode-save">SAVE MODE</button>
                        <button class="h4-flag preview ${mode === "preview" ? "active" : ""}" data-action="mode-preview">PREVIEW MODE</button>
                    </div>
                </div>

                <div class="h4-card">
                    <div class="h4-card-header">
                        <span>LIVE STATUS</span>
                        <span>${mode === "save" ? "SAVE" : "PREVIEW"}</span>
                    </div>
                    <div class="h4-card-body">
                        <div class="h4-card-row"><span class="h4-card-label">show_preview</span><span class="h4-card-value">${showPreview ? "true" : "false"}</span></div>
                        <div class="h4-card-row"><span class="h4-card-label">preview_only</span><span class="h4-card-value">${previewOnly ? "true" : "false"}</span></div>
                        <div class="h4-card-row"><span class="h4-card-label">history folder</span><span class="h4-card-value">H4_Compressor</span></div>
                    </div>
                </div>

                <div class="h4-input-group">
                    <div class="h4-input-label">
                        <span>SAVE PATH</span>
                        <span class="h4-input-note">Default should point into H4_Compressor</span>
                    </div>
                    <input class="h4-input" data-field="save_path" value="${savePath.replace(/"/g, "&quot;")}" spellcheck="false" />
                </div>

                <div class="h4-input-group">
                    <div class="h4-input-label">
                        <span>FORMAT</span>
                        <span class="h4-input-note">Output encoder</span>
                    </div>
                    <select class="h4-select" data-field="format">
                        ${["JPEG", "PNG", "WEBP", "BMP", "TIFF", "GIF"].map((f) => `<option value="${f}" ${f === format ? "selected" : ""}>${f}</option>`).join("")}
                    </select>
                </div>

                <div class="h4-input-group">
                    <div class="h4-input-label">
                        <span>QUALITY</span>
                        <span class="h4-input-note"><span data-quality-live>${quality}</span></span>
                    </div>
                    <div style="display:grid; grid-template-columns: 1fr 72px; gap:8px;">
                        <input class="h4-range" data-field="quality-range" type="range" min="1" max="100" step="1" value="${quality}" />
                        <input class="h4-input" data-field="quality-input" type="number" min="1" max="100" step="1" value="${quality}" />
                    </div>
                </div>

                <div class="h4-input-group">
                    <div class="h4-input-label">
                        <span>SHOW PREVIEW</span>
                        <span class="h4-input-note">Controls IMAGE preview output behavior</span>
                    </div>
                    <div class="h4-toggle-row">
                        <div class="h4-subhud">Live preview output can remain enabled in both modes.</div>
                        <button class="h4-btn ${showPreview ? "active" : ""}" data-action="toggle-preview">${showPreview ? "ON" : "OFF"}</button>
                    </div>
                </div>

                <div class="h4-input-group">
                    <div class="h4-input-label">
                        <span>BACKGROUND COLOR</span>
                        <span class="h4-input-note">Used when alpha has to flatten</span>
                    </div>
                    <input class="h4-input" data-field="background_color" value="${background.replace(/"/g, "&quot;")}" spellcheck="false" />
                </div>

                <div class="h4-input-group">
                    <div class="h4-input-label">
                        <span>HISTORY</span>
                        <span class="h4-input-note">Latest compressed images from H4_Compressor</span>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button class="h4-btn ${this.showHistory ? "active" : ""}" data-action="history">${this.showHistory ? "HIDE HISTORY" : "SHOW HISTORY"}</button>
                        <button class="h4-btn" data-action="select-latest">SELECT LATEST</button>
                    </div>
                </div>
            </div>
        `;

        this.bindCoreDrawer();
    }

    bindCoreDrawer() {
        this.coreDrawer.querySelectorAll("[data-action]").forEach((el) => {
            el.addEventListener("mousedown", (e) => e.stopPropagation());
            el.addEventListener("click", (e) => {
                e.stopPropagation();
                const action = el.getAttribute("data-action");

                if (action === "pin") {
                    this.setPanelMode(this.panelMode === "pinned" ? "docked" : "pinned");
                    this.renderCoreDrawer();
                    return;
                }

                if (action === "refresh") {
                    this.fetchHistory(true);
                    return;
                }

                if (action === "mode-save") {
                    this.applyMode("save");
                    return;
                }

                if (action === "mode-preview") {
                    this.applyMode("preview");
                    return;
                }

                if (action === "toggle-preview") {
                    const next = !getWidgetValue(this.node, "show_preview", true);
                    setWidgetValue(this.node, "show_preview", next);
                    this.renderCoreDrawer();
                    return;
                }

                if (action === "history") {
                    this.toggleHistory();
                    this.renderCoreDrawer();
                    return;
                }

                if (action === "select-latest") {
                    if (this.history.length) {
                        this.selectedIdx = 0;
                        this.updatePreviewPane();
                        this.updateHistoryRail();
                    }
                }
            });
        });

        const savePathInput = this.coreDrawer.querySelector('[data-field="save_path"]');
        if (savePathInput) {
            savePathInput.addEventListener("mousedown", (e) => e.stopPropagation());
            savePathInput.addEventListener("change", (e) => {
                setWidgetValue(this.node, "save_path", e.target.value);
            });
        }

        const formatSelect = this.coreDrawer.querySelector('[data-field="format"]');
        if (formatSelect) {
            formatSelect.addEventListener("mousedown", (e) => e.stopPropagation());
            formatSelect.addEventListener("change", (e) => {
                setWidgetValue(this.node, "format", e.target.value);
                this.renderCoreDrawer();
            });
        }

        const backgroundInput = this.coreDrawer.querySelector('[data-field="background_color"]');
        if (backgroundInput) {
            backgroundInput.addEventListener("mousedown", (e) => e.stopPropagation());
            backgroundInput.addEventListener("change", (e) => {
                setWidgetValue(this.node, "background_color", e.target.value);
            });
        }

        const range = this.coreDrawer.querySelector('[data-field="quality-range"]');
        const number = this.coreDrawer.querySelector('[data-field="quality-input"]');
        const live = this.coreDrawer.querySelector("[data-quality-live]");

        const syncQuality = (val) => {
            const q = clamp(parseInt(val, 10) || 85, 1, 100);
            if (range) range.value = q;
            if (number) number.value = q;
            if (live) live.textContent = q;
            setWidgetValue(this.node, "quality", q);
        };

        if (range) {
            range.addEventListener("mousedown", (e) => e.stopPropagation());
            range.addEventListener("input", (e) => syncQuality(e.target.value));
            range.addEventListener("change", (e) => syncQuality(e.target.value));
        }

        if (number) {
            number.addEventListener("mousedown", (e) => e.stopPropagation());
            number.addEventListener("input", (e) => syncQuality(e.target.value));
            number.addEventListener("change", (e) => syncQuality(e.target.value));
        }
    }

    updatePreviewPane() {
        const inner = this.previewPane.querySelector(".h4-preview-inner");
        const item = this.history[this.selectedIdx] || this.history[0] || null;
        const mode = this.getMode();

        if (item) {
            const url = viewUrl(item);
            this.lastPreviewUrl = url;
            inner.innerHTML = `<img src="${url}" alt="${safeText(item.filename).replace(/"/g, "&quot;")}">`;
            return;
        }

        inner.innerHTML = `
            <div class="h4-preview-empty">
                <div class="main">${mode === "save" ? "SAVE MODE ARMED" : "PREVIEW MODE ARMED"}</div>
                <div class="sub">${mode === "save" ? "Compressed outputs saved into H4_Compressor will appear here and in the history rail." : "Run the node to preview compression behavior. Saved output history is empty right now."}</div>
            </div>
        `;
    }

    updateHistoryRail() {
        if (!this.historyRail) return;

        if (!this.showHistory) {
            this.historyRail.style.display = "none";
            return;
        }

        const visibleCount = this.getVisibleThumbCount();
        const maxScroll = Math.max(0, this.history.length - visibleCount);
        this.scrollIdx = clamp(this.scrollIdx, 0, maxScroll);
        const visibleItems = this.history.slice(this.scrollIdx, this.scrollIdx + visibleCount);

        let html = `
            <div style="height:100%;display:grid;grid-template-columns:40px 1fr 40px;align-items:center;padding:0;background:${COLORS.panel};border-radius:6px;overflow:hidden;pointer-events:none;">
                <div class="h4-rail-nav" data-dir="-1" title="Scroll Left" style="pointer-events:auto;">‹</div>
                <div style="display:flex;gap:12px;overflow:hidden;justify-content:flex-start;padding:10px 15px;pointer-events:none;">
        `;

        if (!visibleItems.length) {
            html += `
                <div style="height:110px;display:grid;place-items:center;color:#555;font-family:monospace;font-size:11px;pointer-events:auto;">
                    No compressed images found in H4_Compressor.
                </div>
            `;
        } else {
            visibleItems.forEach((item, i) => {
                const idx = i + this.scrollIdx;
                const active = idx === this.selectedIdx;
                const filename = safeText(item.filename).replace(/"/g, "&quot;");
                const url = viewUrl(item);
                const meta = [
                    item.format || "",
                    formatBytes(item.size_bytes || 0),
                    item.width && item.height ? `${item.width}x${item.height}` : "",
                ].filter(Boolean).join(" // ");

                html += `
                    <div class="h4-hist-item ${active ? "active" : ""}" data-idx="${idx}" data-h4-tip="${filename} // ${safeText(meta).replace(/"/g, "&quot;")}" style="pointer-events:auto;">
                        <img src="${url}" alt="${filename}">
                        <div style="position:absolute;bottom:0;width:100%;background:rgba(0,0,0,0.7);color:#888;font-size:9px;padding:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none;">${filename}</div>
                    </div>
                `;
            });
        }

        html += `
                </div>
                <div class="h4-rail-nav" data-dir="1" title="Scroll Right" style="pointer-events:auto;">›</div>
            </div>
        `;

        this.historyRail.innerHTML = html;
        this.historyRail.style.display = "block";

        this.historyRail.querySelectorAll(".h4-rail-nav").forEach((btn) => {
            btn.addEventListener("mousedown", (e) => e.stopPropagation());
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const dir = parseInt(btn.getAttribute("data-dir"), 10) || 0;
                this.scrollIdx = clamp(this.scrollIdx + dir * 3, 0, maxScroll);
                this.updateHistoryRail();
            });
        });

        this.historyRail.querySelectorAll(".h4-hist-item").forEach((el) => {
            const idx = parseInt(el.getAttribute("data-idx"), 10);
            el.addEventListener("mousedown", (e) => e.stopPropagation());
            el.addEventListener("click", (e) => {
                e.stopPropagation();
                this.selectedIdx = idx;
                this.updatePreviewPane();
                this.updateHistoryRail();
            });
            el.addEventListener("dblclick", (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.selectedIdx = idx;
                this.openLightbox(idx);
            });
        });
    }

    scrub(dir) {
        if (!this.history.length) return;
        if (this.selectedIdx < 0) this.selectedIdx = 0;
        this.selectedIdx = clamp(this.selectedIdx + dir, 0, this.history.length - 1);
        this.updatePreviewPane();
        this.updateHistoryRail();
    }

    cloakWidgets() {
        for (const w of this.node.widgets || []) {
            const elements = [];
            if (w?.inputEl) elements.push(w.inputEl, w.inputEl.closest?.(".dom-widget"));
            if (w?.element) elements.push(w.element, w.element.closest?.(".dom-widget"));

            elements.filter(Boolean).forEach((el) => {
                el.dataset.h4CompressorOwned = "1";
                Object.assign(el.style, {
                    display: "none",
                    visibility: "hidden",
                    opacity: "0",
                    pointerEvents: "none",
                    position: "fixed",
                    left: "-20000px",
                    top: "-20000px",
                    width: "0px",
                    height: "0px",
                    transform: "none",
                });
            });
        }
    }

    syncDOM() {
        this.cloakWidgets();

        if (isModalOpen()) {
            this.coreDrawer.style.display = "none";
            this.previewPane.style.display = "none";
            this.historyRail.style.display = "none";
            return;
        }

        const rect = getCanvasRect();
        const ds = getDS();
        if (!rect || !ds || !this.node?.graph) return;

        const grid = getGrid(this.node);
        const origin = projectToScreen(this.node.pos[0], this.node.pos[1]);
        if (!origin) return;

        const preview = grid.pts.previewArea;
        const previewX = origin.x + preview.x * origin.scale;
        const previewY = origin.y + preview.y * origin.scale;
        const previewW = preview.w * origin.scale;
        const previewH = preview.h * origin.scale;

        this.previewPane.style.display = "block";
        this.previewPane.style.left = "0px";
        this.previewPane.style.top = "0px";
        this.previewPane.style.width = `${previewW}px`;
        this.previewPane.style.height = `${previewH}px`;
        this.previewPane.style.transform = `translate(${Math.round(previewX)}px, ${Math.round(previewY)}px)`;

        if (this.panelMode === "pinned") {
            this.coreDrawer.style.display = "block";
            Object.assign(this.coreDrawer.style, {
                position: "fixed",
                left: "0px",
                top: "0px",
                width: `${DRAWER_W}px`,
                height: "100vh",
                transform: "none",
                zIndex: "9000",
                overflowY: "auto",
            });
        } else {
            const drawer = grid.pts.drawerCore;
            const drawerX = origin.x + drawer.x * origin.scale;
            const drawerY = origin.y + drawer.y * origin.scale;
            const drawerW = drawer.w * origin.scale;
            const drawerH = drawer.h * origin.scale;

            this.coreDrawer.style.display = "block";
            this.coreDrawer.style.position = "fixed";
            this.coreDrawer.style.left = "0px";
            this.coreDrawer.style.top = "0px";
            this.coreDrawer.style.width = `${drawerW}px`;
            this.coreDrawer.style.height = `${drawerH}px`;
            this.coreDrawer.style.transform = `translate(${Math.round(drawerX)}px, ${Math.round(drawerY)}px)`;
            this.coreDrawer.style.zIndex = "100";
        }

        if (this.showHistory) {
            const rail = grid.pts.historyRail;
            const railX = origin.x + rail.x * origin.scale;
            const railY = origin.y + rail.y * origin.scale;
            const railW = rail.w * origin.scale;
            const railH = rail.h * origin.scale;

            this.historyRail.style.display = "block";
            this.historyRail.style.left = "0px";
            this.historyRail.style.top = "0px";
            this.historyRail.style.width = `${railW}px`;
            this.historyRail.style.height = `${railH}px`;
            this.historyRail.style.transform = `translate(${Math.round(railX)}px, ${Math.round(railY)}px)`;
        } else {
            this.historyRail.style.display = "none";
        }
    }

    draw(ctx) {
        const grid = getGrid(this.node);
        const modeRect = grid.pts.mode;
        const historyRect = grid.pts.historyBtn;
        const refreshRect = grid.pts.refreshBtn;
        const previewRect = grid.pts.previewArea;
        const mode = this.getMode();

        ctx.save();

        ctx.strokeStyle = COLORS.border;
        ctx.lineWidth = 1.5;
        roundRect(ctx, previewRect.x, previewRect.y, previewRect.w, previewRect.h, 10);
        ctx.stroke();

        const headerGlow = ctx.createLinearGradient(previewRect.x, previewRect.y, previewRect.x, previewRect.y + 40);
        headerGlow.addColorStop(0, "rgba(0,242,255,0.12)");
        headerGlow.addColorStop(1, "rgba(0,242,255,0.00)");
        ctx.fillStyle = headerGlow;
        roundRect(ctx, previewRect.x, previewRect.y, previewRect.w, 36, 10);
        ctx.fill();

        drawSegmentedMode(ctx, modeRect, mode);
        drawActionButton(ctx, historyRect, this.showHistory ? "HISTORY OPEN" : "HISTORY", this.showHistory ? COLORS.accent : COLORS.dim);
        drawSquareButton(ctx, refreshRect, "↻", COLORS.accent);

        if (this.history.length > 1) {
            drawScrubButton(ctx, grid.pts.scrubPrev, "‹");
            drawScrubButton(ctx, grid.pts.scrubNext, "›");
        }

        ctx.fillStyle = COLORS.dim2;
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "left";
        ctx.fillText("COMPRESSED OUTPUT PREVIEW", previewRect.x + 14, previewRect.y + 24);

        const item = this.history[this.selectedIdx] || this.history[0];
        if (item) {
            ctx.fillStyle = COLORS.dim;
            ctx.font = "10px monospace";
            const meta = [
                safeText(item.format || ""),
                formatBytes(item.size_bytes || 0),
                item.width && item.height ? `${item.width}x${item.height}` : "",
            ].filter(Boolean).join(" // ");
            ctx.fillText(meta.slice(0, 90), previewRect.x + 14, previewRect.y + previewRect.h - 14);
        } else {
            ctx.fillStyle = mode === "save" ? COLORS.save : COLORS.preview;
            ctx.font = "bold 11px monospace";
            ctx.textAlign = "center";
            ctx.fillText(mode === "save" ? "SAVE MODE READY" : "PREVIEW MODE READY", grid.w / 2, previewRect.y + previewRect.h / 2);
        }

        ctx.restore();
    }

    onMouseDown(localPos) {
        const grid = getGrid(this.node);

        if (hit(localPos, grid.pts.mode)) {
            const x = localPos[0];
            const leftHalf = x < grid.pts.mode.x + grid.pts.mode.w / 2;
            this.applyMode(leftHalf ? "save" : "preview");
            return true;
        }

        if (hit(localPos, grid.pts.historyBtn)) {
            this.toggleHistory();
            this.renderCoreDrawer();
            return true;
        }

        if (hit(localPos, grid.pts.refreshBtn)) {
            this.fetchHistory(true);
            return true;
        }

        if (this.history.length > 1 && hit(localPos, grid.pts.scrubPrev)) {
            this.scrub(-1);
            return true;
        }

        if (this.history.length > 1 && hit(localPos, grid.pts.scrubNext)) {
            this.scrub(1);
            return true;
        }

        return false;
    }

    onExecuted() {
        this.updateNodeTitle();
        this.fetchHistory(true);
        setTimeout(() => this.fetchHistory(true), 350);
        this.renderCoreDrawer();
        this.node.setDirtyCanvas?.(true, true);
    }
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function drawSegmentedMode(ctx, rect, mode) {
    ctx.save();

    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.strokeStyle = "#2a2a2a";
    ctx.lineWidth = 1.2;
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 6);
    ctx.fill();
    ctx.stroke();

    const mid = rect.x + rect.w / 2;
    const pad = 4;
    const segW = rect.w / 2 - pad * 1.5;
    const segH = rect.h - pad * 2;

    ctx.fillStyle = mode === "save" ? "rgba(0,255,138,0.14)" : "rgba(255,215,0,0.14)";
    ctx.strokeStyle = mode === "save" ? COLORS.save : COLORS.preview;
    roundRect(ctx, mode === "save" ? rect.x + pad : mid + pad / 2, rect.y + pad, segW, segH, 4);
    ctx.fill();
    ctx.stroke();

    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = mode === "save" ? COLORS.save : COLORS.dim;
    ctx.fillText("SAVE", rect.x + rect.w * 0.25, rect.y + rect.h / 2);

    ctx.fillStyle = mode === "preview" ? COLORS.preview : COLORS.dim;
    ctx.fillText("PREVIEW", rect.x + rect.w * 0.75, rect.y + rect.h / 2);

    ctx.restore();
}

function drawActionButton(ctx, rect, label, color) {
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.strokeStyle = "#2a2a2a";
    ctx.lineWidth = 1.2;
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 0.5);
    ctx.restore();
}

function drawSquareButton(ctx, rect, label, color) {
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.strokeStyle = "#2a2a2a";
    ctx.lineWidth = 1.2;
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.font = "bold 15px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 0.5);
    ctx.restore();
}

function drawScrubButton(ctx, rect, label) {
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.strokeStyle = "#2a2a2a";
    ctx.lineWidth = 1.2;
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = COLORS.accent;
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
    ctx.restore();
}

function installNode(node) {
    if (!node || node.__h4CompressorSmartSkinInstalled) return;
    node.__h4CompressorSmartSkinInstalled = true;

    ensureNodeSize(node);

    node.h4ui = new H4ImageCompressorUI(node);
    activeNodes.add(node);

    const origOnDrawForeground = node.onDrawForeground?.bind(node);
    node.onDrawForeground = function (ctx) {
        if (origOnDrawForeground) origOnDrawForeground(ctx);
        node.h4ui?.syncDOM();
        node.h4ui?.draw(ctx);
    };

    const origOnMouseDown = node.onMouseDown?.bind(node);
    node.onMouseDown = function (event, localPos, graphCanvas) {
        if (node.h4ui?.onMouseDown(localPos, event, graphCanvas)) return true;
        if (origOnMouseDown) return origOnMouseDown(event, localPos, graphCanvas);
        return false;
    };

    const origOnExecuted = node.onExecuted?.bind(node);
    node.onExecuted = function (message) {
        const result = origOnExecuted ? origOnExecuted(message) : undefined;
        node.h4ui?.onExecuted(message);
        return result;
    };

    const origOnResize = node.onResize?.bind(node);
    node.onResize = function (size) {
        const result = origOnResize ? origOnResize(size) : size;
        ensureNodeSize(node);
        node.h4ui?.syncDOM();
        return result;
    };

    const origOnRemoved = node.onRemoved?.bind(node);
    node.onRemoved = function () {
        activeNodes.delete(node);
        node.h4ui?.destroy();
        if (origOnRemoved) return origOnRemoved();
    };

    node.setDirtyCanvas?.(true, true);
}

function startGlobalLoop() {
    if (globalLoopStarted) return;
    globalLoopStarted = true;

    const tick = () => {
        requestAnimationFrame(tick);
        for (const node of [...activeNodes]) {
            if (!node?.graph) {
                activeNodes.delete(node);
                continue;
            }
            node.h4ui?.syncDOM();
        }
    };

    requestAnimationFrame(tick);
}

window.addEventListener("resize", () => {
    for (const node of activeNodes) {
        node.h4ui?.syncDOM();
    }
});

window.addEventListener("orientationchange", () => {
    for (const node of activeNodes) {
        node.h4ui?.syncDOM();
    }
});

document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        for (const node of activeNodes) {
            node.h4ui?.syncDOM();
            node.h4ui?.fetchHistory(false);
        }
    }
});

app.registerExtension({
    name: EXTENSION_NAME,

    beforeRegisterNodeDef(nodeType, nodeDef) {
        if (!isTargetNode(nodeType, nodeDef)) return;

        startGlobalLoop();

        if (nodeType.prototype.__h4CompressorWrapped) return;
        nodeType.prototype.__h4CompressorWrapped = true;

        const origOnNodeCreated = nodeType.prototype.onNodeCreated;

        nodeType.prototype.onNodeCreated = function () {
            const result = origOnNodeCreated ? origOnNodeCreated.apply(this, arguments) : undefined;
            installNode(this);
            setTimeout(() => installNode(this), 0);
            setTimeout(() => this.h4ui?.syncDOM(), 50);
            setTimeout(() => this.h4ui?.fetchHistory(false), 150);
            return result;
        };
    },
});