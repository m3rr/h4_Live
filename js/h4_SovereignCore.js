import { app } from "/scripts/app.js";
console.log("H4_SYSTEM: SovereignCore - BOOTING...");

/*
    h4_SovereignCore.js — The Global Aesthetic Engine
    ==================================================
    This file is the single source of truth for the H4 visual identity.
    It runs on startup, intercepts every node with an H4_ prefix, and
    applies the baseline aesthetic automatically.

    Nodes that ALREADY have a custom onDrawForeground (SmartSave, ForgeMask,
    Switcheroo, etc.) are detected and skipped — their draw loops are
    considered "sovereign" and are never overwritten.

    BEHAVIOUR:
    1. Sets node.color and node.bgcolor to the H4 Off-Black palette.
    2. Overrides onDrawForeground to render the 0.35x LOD Guard badge
       ("H4 <NodeName>") when the canvas is zoomed out below the
       interaction threshold.
    3. At normal zoom, falls through to the original draw logic (if any)
       to preserve all existing widget rendering.
    4. If an optional h4_theme_overrides.json is found in the /js/ folder,
       per-node colour overrides are applied on top of the defaults.

    SETTINGS INTEGRATION:
    This engine respects the "sovereignCoreEnabled" key in h4_Dashboard.
    Users can toggle the theme ON/OFF from QoL settings. When disabled,
    non-sovereign nodes revert to ComfyUI default colours and the LOD
    badge draw wrapper is removed. Sovereign HUD nodes (SmartSave,
    ForgeMask, etc.) are NEVER touched by the toggle — they manage
    their own rendering.

    DELETION SAFETY: Removing this file does NOT break any node. They simply
                     revert to default ComfyUI appearance.
*/

// ============================================================================
// 1. THE H4 PALETTE (Single Source of Truth)
// ============================================================================
const H4_PALETTE = {
    offBlack: "#0c0c0c",     // Primary background, Header, Drawers
    titleBg: "#0c0c0c",     // Node title bar background
    accent: "#00f2ff",     // HUD borders, text highlights, glow effects
    saveActive: "#00ff00",     // LED Active, "Save" text shadows
    previewActive: "#ffd700",     // LED Idle, "Preview" text shadows
    textPrimary: "#e0e0e0",     // Standard label text
    textDim: "#666666",     // De-emphasised text
    badgeBg: "rgba(12, 12, 12, 0.92)",  // LOD badge background
    badgeGlow: "rgba(0, 242, 255, 0.35)", // LOD badge glow ring
};

// ComfyUI's default node colours — used when reverting the theme
const COMFY_DEFAULTS = {
    color: "#353535",
    bgcolor: "#353535",
};

// ============================================================================
// 2. ZOOM THRESHOLD — Below this, the node collapses to the tactical badge
// ============================================================================
const LOD_ZOOM_FLOOR = 0.35;

// ============================================================================
// 3. NODES WITH SOVEREIGN HUDS — These already own their draw loop.
//    The core will ONLY apply base colours to these, never touch their draw.
//    These nodes are NOT affected by the user toggle — they stay as-is.
// ============================================================================
const SOVEREIGN_HUD_NODES = new Set([
    "H4_SmartSave",
    "H4_ForgeMask",
    "H4_Switcheroo",
    "H4_Oxidine",
    "H4_Mutate",
    "H4_ModelSave",
    "H4_ModelMerger",
    "H4_DisplayAny",
    "H4_Comparinator",
    "H4_ComparinatorVault",
    "H4_Complete_Loader",
    "H4_Multi_ImgUpload",
]);

// ============================================================================
// 4. ENGINE STATE — Tracks enabled state and all themed node references
// ============================================================================
let _engineEnabled = true; // Will be hydrated from localStorage on boot
let themeOverrides = {};

// Registry of all non-sovereign nodes the engine has themed.
// Each entry: { node, originalDraw, originalColor, originalBgcolor }
// This allows clean revert when the user disables the setting.
const _themedNodes = [];

/**
 * Reads the "sovereignCoreEnabled" key from h4_Dashboard localStorage config.
 * Falls back to true (enabled) if the key doesn't exist or localStorage is inaccessible.
 */
function readConfigFromStorage() {
    try {
        const raw = localStorage.getItem("h4_live_config");
        if (raw) {
            const parsed = JSON.parse(raw);
            if (typeof parsed.sovereignCoreEnabled === "boolean") {
                return parsed.sovereignCoreEnabled;
            }
        }
    } catch (_) {
        // localStorage unavailable or corrupted — default to enabled
    }
    return true; // Default: ON
}

/**
 * Attempts to fetch the optional override file at startup.
 * If the file doesn't exist, this silently catches and moves on.
 * Expected format:
 * {
 *   "H4_Mutate":        { "accent": "#ff00ff", "offBlack": "#111111" },
 *   "H4_TrafficRouter":  { "accent": "#ff8800" }
 * }
 */
async function loadThemeOverrides() {
    try {
        const resp = await fetch("./extensions/comfyui_h4_live/h4_theme_overrides.json");
        if (resp.ok) {
            themeOverrides = await resp.json();
            console.log("[H4 SovereignCore] Theme overrides loaded:", Object.keys(themeOverrides).length, "entries.");
        }
    } catch (_) {
        // File doesn't exist or isn't valid JSON — perfectly fine, use defaults.
    }
}

// ============================================================================
// 5. PALETTE RESOLVER — Merges defaults with per-node overrides
// ============================================================================
function resolvePalette(comfyClass) {
    const base = { ...H4_PALETTE };
    const overrides = themeOverrides[comfyClass];
    if (overrides) {
        Object.assign(base, overrides);
    }
    return base;
}

// ============================================================================
// 6. DISPLAY NAME FORMATTER — Converts "H4_TrafficRouter" to "Traffic Router"
// ============================================================================
function formatBadgeName(comfyClass) {
    // Strip the "H4_" prefix
    let name = comfyClass.replace(/^H4_/, "");
    // Insert spaces before capital letters (CamelCase to Spaced)
    name = name.replace(/([a-z])([A-Z])/g, "$1 $2");
    // Also split on underscores
    name = name.replace(/_/g, " ");
    return name;
}

// ============================================================================
// 7. THE LOD BADGE RENDERER — The 0.35x zoom-out tactical icon
// ============================================================================
function drawLODBadge(ctx, node, palette) {
    const w = node.size[0];
    const h = node.size[1];
    const badgeName = formatBadgeName(node.comfyClass || node.type || "Node");

    // Fill the entire node body with the Off-Black
    ctx.fillStyle = palette.badgeBg;
    ctx.fillRect(0, 0, w, h);

    // Outer glow ring
    ctx.save();
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 2;
    ctx.shadowColor = palette.badgeGlow;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.roundRect(2, 2, w - 4, h - 4, 6);
    ctx.stroke();
    ctx.restore();

    // "H4" — Large, dominant identifier
    ctx.save();
    ctx.fillStyle = palette.accent;
    ctx.shadowColor = palette.accent;
    ctx.shadowBlur = 8;
    ctx.font = "900 56px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("H4", w / 2, h / 2 - 14);
    ctx.restore();

    // Node name — Smaller, below the H4 mark
    ctx.save();
    ctx.fillStyle = palette.textPrimary;
    ctx.font = "600 13px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(badgeName, w / 2, h / 2 + 24);
    ctx.restore();
}

// ============================================================================
// 8. CORE INJECTION — Applies the base aesthetic to a single node
// ============================================================================
function applyH4Aesthetic(node) {
    const comfyClass = node.comfyClass || node.type || "";

    // Resolve the colour palette for this specific node
    const palette = resolvePalette(comfyClass);

    // --- STEP 1: Check if this node has a sovereign HUD ---
    const isSovereign = SOVEREIGN_HUD_NODES.has(comfyClass);

    // Sovereign nodes always get their colours applied (they manage their own draw loops)
    // The user toggle does NOT affect sovereign nodes — they are hardcoded.
    if (isSovereign) {
        node.color = palette.offBlack;
        node.bgcolor = palette.offBlack;
        return;
    }

    // --- STEP 2: If the engine is disabled, skip theming for non-sovereign nodes ---
    if (!_engineEnabled) {
        return;
    }

    // --- STEP 3: Snapshot the node's original colours before applying the theme ---
    // These are saved to allow clean revert on toggle-off
    const originalColor = node.color;
    const originalBgcolor = node.bgcolor;

    // Apply the H4 palette
    node.color = palette.offBlack;
    node.bgcolor = palette.offBlack;

    // --- STEP 4: Wrap onDrawForeground for LOD Guard on non-sovereign nodes ---
    // Preserve the original draw function (if one was set by the node's own JS)
    const originalDraw = node.onDrawForeground;

    node.onDrawForeground = function (ctx) {
        // Guard: if collapsed, skip all custom drawing
        if (this.flags.collapsed) {
            if (originalDraw) originalDraw.apply(this, arguments);
            return;
        }

        // Get the current canvas zoom scale
        const ds = app.canvas.ds?.scale ?? app.canvas.ds ?? 1.0;

        // LOD GUARD: Below the zoom floor, render the tactical badge ONLY
        if (ds < LOD_ZOOM_FLOOR) {
            drawLODBadge(ctx, this, palette);
            return; // Don't render anything else at this zoom level
        }

        // NORMAL ZOOM: Fall through to original draw (widgets, etc.)
        if (originalDraw) {
            originalDraw.apply(this, arguments);
        }
    };

    // --- STEP 5: Register this node for potential revert ---
    _themedNodes.push({
        node,
        originalDraw,
        originalColor: originalColor || COMFY_DEFAULTS.color,
        originalBgcolor: originalBgcolor || COMFY_DEFAULTS.bgcolor,
    });
}

// ============================================================================
// 9. REVERT ENGINE — Strips the theme from all non-sovereign nodes
// ============================================================================
function revertAllThemedNodes() {
    for (const entry of _themedNodes) {
        const { node, originalDraw, originalColor, originalBgcolor } = entry;

        // Restore original colours (or ComfyUI defaults if the node was born themed)
        node.color = originalColor;
        node.bgcolor = originalBgcolor;

        // Restore the original onDrawForeground (null is perfectly valid — removes the wrapper)
        node.onDrawForeground = originalDraw || null;
    }

    // Clear the registry — these nodes are no longer tracked
    _themedNodes.length = 0;

    // Force a full canvas redraw so the colour change is visible immediately
    if (app.canvas) {
        app.canvas.setDirty(true, true);
    }

    console.log("[H4 SovereignCore] Theme reverted — all non-sovereign nodes restored to defaults.");
}

// ============================================================================
// 10. RE-APPLY ENGINE — Themes all existing H4_ nodes on the canvas
// ============================================================================
function applyToAllExistingNodes() {
    if (!app.graph) return;

    const allNodes = app.graph._nodes || [];
    for (const node of allNodes) {
        const comfyClass = node.comfyClass || node.type || "";
        if (comfyClass.startsWith("H4_")) {
            applyH4Aesthetic(node);
        }
    }

    // Force a full canvas redraw so the colour change is visible immediately
    if (app.canvas) {
        app.canvas.setDirty(true, true);
    }

    console.log("[H4 SovereignCore] Theme re-applied to all existing H4 nodes on canvas.");
}

// ============================================================================
// 11. THE EXTENSION REGISTRATION — The Global Interceptor
// ============================================================================
app.registerExtension({
    name: "h4.SovereignCore",

    async setup() {
        // Load optional theme overrides before any nodes are created
        await loadThemeOverrides();

        // Hydrate enabled state from localStorage (before Dashboard may have fully initialised)
        _engineEnabled = readConfigFromStorage();
        console.log(`[H4 SovereignCore] Aesthetic engine online. Enabled: ${_engineEnabled}`);

        // Listen for live toggle changes from the Dashboard's QoL panel
        window.addEventListener("h4_config_update", (e) => {
            const { key, val } = e.detail;
            if (key !== "sovereignCoreEnabled") return;

            const newState = Boolean(val);
            if (newState === _engineEnabled) return; // No change

            _engineEnabled = newState;

            if (_engineEnabled) {
                // User toggled ON — apply the theme to all existing H4_ nodes
                applyToAllExistingNodes();
            } else {
                // User toggled OFF — strip the theme from all non-sovereign nodes
                revertAllThemedNodes();
            }
        });
    },

    async nodeCreated(node) {
        const comfyClass = node.comfyClass || node.type || "";

        // THE GATE: Only intercept nodes that start with "H4_"
        if (!comfyClass.startsWith("H4_")) return;

        // Apply the full aesthetic package (respects _engineEnabled internally)
        applyH4Aesthetic(node);
    }
});
