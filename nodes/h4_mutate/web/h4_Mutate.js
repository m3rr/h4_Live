import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

/**
 * H4_Mutate - Drawer Toggle System
 * Controls visibility of widget sections based on toggle states.
 * Handles dynamic style image input manifestation (up to 4 slots).
 * Uses the proven converted-widget + computeSize snapshot pattern.
 */

app.registerExtension({
    name: "h4.Mutate",
    async beforeRegisterNodeDef(nodeType, nodeData, appRef) {
        if (nodeData.name !== "H4_Mutate") return;

        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            if (onNodeCreated) onNodeCreated.apply(this, arguments);

            const node = this;
            node.serialize_widgets = true;

            // --- BOOLEAN TRUTHINESS HELPER ---
            const isTruthy = (v) => v === true || v === "ON" || String(v).toLowerCase() === "true" || String(v) === "1";

            // --- DRAWER GROUP MEMBERSHIP ---
            // Maps each toggle to the widget names it controls
            const GROUPS = {
                color: ["hue_shift", "saturation", "brightness", "contrast", "gamma", "color_temperature", "tint"],
                sharpen: ["sharpen_amount", "sharpen_radius"],
                upscale: ["scale_factor", "upscale_method"],
                style: ["style_method", "style_attention_mode", "style_strength",
                    "style_blend_mode", "style_weight_1", "style_weight_2",
                    "style_weight_3", "style_weight_4"],
                film: ["film_preset", "grain_amount", "grain_size", "grain_type"],
                vignette: ["vignette_intensity", "vignette_radius", "vignette_softness", "vignette_color"],
                effects: ["bloom_intensity", "bloom_radius", "bloom_threshold", "chromatic_aberration", "posterize_levels"],
                custom: ["priority_style", "priority_color", "priority_film",
                    "priority_sharpen", "priority_effects", "priority_vignette", "priority_upscale"],
                mask: ["mask_feather"],
            };

            // Flat list of all drawer-managed widget names
            const ALL_DRAWER = Object.values(GROUPS).flat();

            // Style image input names (managed by dynamic manifestation logic)
            const STYLE_INPUTS = ["style_image_1", "style_image_2", "style_image_3", "style_image_4"];

            // --- HIDE / SHOW WIDGET HELPERS ---
            // Each widget gets a permanent snapshot taken once on first hide,
            // storing everything needed to fully restore it later.
            const hideWidget = (w) => {
                if (!w) return;
                if (!w.h4_snapshot) {
                    w.h4_snapshot = {
                        type: w.type,
                        computeSize: w.computeSize,
                        hidden: w.hidden
                    };
                }
                w.type = "converted-widget";
                w.computeSize = () => [0, -4];
                w.hidden = true;
                if (w.inputEl) w.inputEl.style.display = "none";
                w.h4_visible = false;
            };

            const showWidget = (w) => {
                if (!w || !w.h4_snapshot) return;
                w.type = w.h4_snapshot.type;
                if (w.h4_snapshot.computeSize) {
                    w.computeSize = w.h4_snapshot.computeSize;
                } else {
                    delete w.computeSize;
                }
                w.hidden = false;
                if (w.inputEl) w.inputEl.style.display = "";
                w.h4_visible = true;
            };

            // --- INPUT SLOT VISIBILITY ---
            // Hides or shows an input connection slot on the node
            const setInputVisible = (inputName, visible) => {
                if (!node.inputs) return;
                const input = node.inputs.find(inp => inp.name === inputName);
                if (input) {
                    input.hidden = !visible;
                }
            };

            // --- MASTER REFRESH ---
            // Evaluates all toggle states and sets visibility for every
            // managed widget and input slot accordingly.
            const refreshDrawers = () => {
                if (!node.widgets || node.widgets.length < 5) return;

                // Read current toggle states
                const val = (name) => {
                    const w = node.widgets.find(x => x.name === name);
                    return isTruthy(w?.value);
                };

                const colorOn = val("enable_color");
                const sharpenOn = val("enable_sharpen");
                const upscaleOn = val("enable_upscale");
                const styleOn = val("enable_style");
                const filmOn = val("enable_film");
                const vignetteOn = val("enable_vignette");
                const effectsOn = val("enable_effects");

                // Pipeline order mode
                const orderWidget = node.widgets.find(w => w.name === "pipeline_order");
                const isCustom = orderWidget?.value === "custom";

                // Style blend mode (controls weight slider visibility)
                const blendWidget = node.widgets.find(w => w.name === "style_blend_mode");
                const isWeighted = blendWidget?.value === "weighted";

                // Attention mode visibility (only for neural methods)
                const methodWidget = node.widgets.find(w => w.name === "style_method");
                const isNeural = methodWidget?.value === "adain" || methodWidget?.value === "wct";

                // Mask connection state
                const maskConnected = node.inputs?.some(inp => inp.name === "mask" && inp.link != null);

                // --- WIDGET VISIBILITY ---
                node.widgets.forEach(w => {
                    const n = w.name;
                    if (!ALL_DRAWER.includes(n)) return;

                    let shouldShow = false;

                    // Color Grade section
                    if (GROUPS.color.includes(n)) shouldShow = colorOn;

                    // Sharpness section
                    if (GROUPS.sharpen.includes(n)) shouldShow = sharpenOn;

                    // Upscale section
                    if (GROUPS.upscale.includes(n)) shouldShow = upscaleOn;

                    // Style Transfer section
                    if (GROUPS.style.includes(n)) {
                        if (n === "style_attention_mode") {
                            // Only show attention mode for neural methods (AdaIN, WCT)
                            shouldShow = styleOn && isNeural;
                        } else if (["style_weight_1", "style_weight_2", "style_weight_3", "style_weight_4"].includes(n)) {
                            // Weight sliders only when blend mode is 'weighted'
                            shouldShow = styleOn && isWeighted;
                        } else {
                            shouldShow = styleOn;
                        }
                    }

                    // Film & Grain section
                    if (GROUPS.film.includes(n)) shouldShow = filmOn;

                    // Vignette section
                    if (GROUPS.vignette.includes(n)) shouldShow = vignetteOn;

                    // Effects section
                    if (GROUPS.effects.includes(n)) shouldShow = effectsOn;

                    // Custom priority section (only when pipeline_order is 'custom')
                    if (GROUPS.custom.includes(n)) shouldShow = isCustom;

                    // Mask feather (only when mask is connected)
                    if (GROUPS.mask.includes(n)) shouldShow = maskConnected;

                    if (shouldShow) {
                        showWidget(w);
                    } else {
                        hideWidget(w);
                    }
                });

                // --- STYLE IMAGE INPUT SLOT VISIBILITY ---
                // style_image_1: visible when style toggle is ON
                // style_image_2: visible when style_image_1 has a connection
                // style_image_3: visible when style_image_2 has a connection
                // style_image_4: visible when style_image_3 has a connection
                const getConnected = (name) => {
                    if (!node.inputs) return false;
                    const inp = node.inputs.find(i => i.name === name);
                    return inp && inp.link != null;
                };

                setInputVisible("style_image_1", styleOn);
                setInputVisible("style_image_2", styleOn && getConnected("style_image_1"));
                setInputVisible("style_image_3", styleOn && getConnected("style_image_2"));
                setInputVisible("style_image_4", styleOn && getConnected("style_image_3"));

                // --- DYNAMIC TITLE ---
                const activeCount = [colorOn, sharpenOn, upscaleOn, styleOn, filmOn, vignetteOn, effectsOn].filter(Boolean).length;
                if (activeCount === 0) {
                    node.title = "h4_Mutate";
                } else if (styleOn && activeCount === 1) {
                    node.title = "h4_Mutate [Style]";
                } else if (activeCount >= 5) {
                    node.title = "h4_Mutate [FULL SEND]";
                } else {
                    node.title = `h4_Mutate [${activeCount} Active]`;
                }

                // --- FORCE GEOMETRY RECALC ---
                const consoleOn = val("display_console");
                const sz = node.computeSize();
                let finalHeight = sz[1];
                if (consoleOn) finalHeight += 90; // Add room for the console drawer
                node.setSize([Math.max(node.size[0], 300), finalHeight]);
                appRef.graph.setDirtyCanvas(true, true);
            };

            // --- INITIAL HIDE ---
            // On spawn, all drawer widgets start hidden (toggles default to OFF)
            const initialHide = () => {
                if (!node.widgets || node.widgets.length < 5) return;
                node.widgets.forEach(w => {
                    if (ALL_DRAWER.includes(w.name)) hideWidget(w);
                });

                // Hide all style image inputs by default
                STYLE_INPUTS.forEach(name => setInputVisible(name, false));

                const sz = node.computeSize();
                node.setSize([Math.max(node.size[0], 300), sz[1]]);
            };

            initialHide();
            setTimeout(initialHide, 50);
            setTimeout(initialHide, 200);

            // --- BIND TOGGLE CALLBACKS ---
            // Every toggle, dropdown, and connection change triggers a full refresh
            const bindToggles = () => {
                if (!node.widgets) return;

                const watchedWidgets = [
                    "enable_color", "enable_sharpen", "enable_upscale",
                    "enable_style", "enable_film", "enable_vignette", "enable_effects",
                    "pipeline_order", "style_blend_mode", "style_method", "display_console"
                ];

                node.widgets.forEach(w => {
                    if (watchedWidgets.includes(w.name) && !w.h4_bound) {
                        const origCB = w.callback;
                        w.callback = function (value) {
                            if (origCB) origCB.apply(this, arguments);
                            setTimeout(refreshDrawers, 10);
                        };
                        w.h4_bound = true;
                    }
                });

                refreshDrawers();
            };

            setTimeout(bindToggles, 100);
            setTimeout(bindToggles, 500);
            setTimeout(bindToggles, 1500);

            // --- CONNECTION CHANGE HOOK ---
            // Re-evaluate drawer state when inputs are connected/disconnected
            // (for dynamic style image manifestation and mask detection)
            const origConnChange = node.onConnectionsChange;
            node.onConnectionsChange = function (type, slotIndex, isConnected, link, ioSlot) {
                if (origConnChange) origConnChange.apply(this, arguments);
                setTimeout(refreshDrawers, 50);
            };

            // --- CONFIGURE HOOK (Workflow Load) ---
            const origConfigure = node.onConfigure;
            node.onConfigure = function (data) {
                if (origConfigure) origConfigure.apply(this, arguments);
                setTimeout(refreshDrawers, 100);
                setTimeout(refreshDrawers, 500);
            };

            // --- CONSOLE BAR LOGIC ---
            node.h4_statusLines = ["[ System Ready ]"];
            const statusHandler = (event) => {
                const data = event.detail;
                if (data.node_id === String(node.id)) {
                    node.h4_statusLines.push(data.status);
                    if (node.h4_statusLines.length > 5) node.h4_statusLines.shift();
                    app.graph.setDirtyCanvas(true, true);
                }
            };
            api.addEventListener("h4_mutate_status", statusHandler);

            const origOnRemoved = node.onRemoved;
            node.onRemoved = function () {
                if (origOnRemoved) origOnRemoved.apply(this, arguments);
                api.removeEventListener("h4_mutate_status", statusHandler);
            };

            const origDraw = node.onDrawForeground;
            node.onDrawForeground = function (ctx) {
                if (origDraw) origDraw.apply(this, arguments);

                const w = node.widgets?.find(x => x.name === "display_console");
                const consoleOn = isTruthy(w?.value);

                if (consoleOn) {
                    ctx.save();
                    const drawerHeight = 85;
                    const y = node.size[1] - drawerHeight - 5;

                    // Draw outer box
                    ctx.fillStyle = "rgba(10, 10, 15, 0.9)";
                    ctx.beginPath();
                    ctx.roundRect(8, y, node.size[0] - 16, drawerHeight, 6);
                    ctx.fill();

                    // Draw border
                    ctx.strokeStyle = "#333";
                    ctx.lineWidth = 1;
                    ctx.stroke();

                    // Draw text
                    ctx.fillStyle = "#A8EB12"; // h4 green/yellow theme
                    ctx.font = "11px monospace";
                    ctx.textAlign = "left";
                    for (let i = 0; i < node.h4_statusLines.length; i++) {
                        ctx.fillText(node.h4_statusLines[i], 16, y + 18 + (i * 14));
                    }
                    ctx.restore();
                }
            };
        };
    }
});
