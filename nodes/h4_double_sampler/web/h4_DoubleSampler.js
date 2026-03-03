// ============================================================================
// h4_DoubleSampler.js - The Dual-Core Engine
// Production Ready - Premium H4 UX
// ============================================================================

import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "h4.DoubleSampler",

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name !== "H4_DoubleSampler") return;

        // --- THEME CONSTANTS ---
        const COLORS = {
            STAGE_1: "#00f0ff", // Sentient Cyan
            STAGE_2: "#f000ff", // Latent Pink
            ADVANCED: "#CAFF00", // Radioactive Yellow
            TEXT: "#FFFFFF"
        };

        // --- WIDGET MANAGEMENT ---
        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            if (onNodeCreated) onNodeCreated.apply(this, arguments);

            this.serialize_widgets = true;
            this.properties = this.properties || {};

            // Attach explicit callbacks to the toggles to ensure they fire instantly
            const attachCallback = (wName) => {
                const w = this.widgets.find(x => x.name === wName);
                if (w) {
                    const cb = w.callback;
                    w.callback = (v) => {
                        this.refreshWidgets();
                        if (cb) cb(v);
                    };
                }
            };

            attachCallback("enable_stage_2");
            attachCallback("enable_extra_options");
            attachCallback("cfg_sliding_scale");

            // Initial Widget Refresh
            setTimeout(() => this.refreshWidgets(), 50);
        };

        const onConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function () {
            if (onConfigure) onConfigure.apply(this, arguments);
            setTimeout(() => this.refreshWidgets(), 100);
        };

        nodeType.prototype.refreshWidgets = function () {
            // We implement a 'global' whitelist/blacklist logic.
            // This prevents widget bleeding (like the hidden variation_seed's control_after_generate).
            if (!this.widgets) return;

            const isTruthy = (v) => v === true || v === "ON" || v === "true" || v === 1;

            const enableStage2 = isTruthy(this.widgets.find(w => w.name === "enable_stage_2")?.value);
            const extraOpts = isTruthy(this.widgets.find(w => w.name === "enable_extra_options")?.value);
            const cfgSlide = isTruthy(this.widgets.find(w => w.name === "cfg_sliding_scale")?.value);

            // Define groupings for visibility
            const alwaysVisible = [
                "seed", "steps", "cfg", "sampler_name", "scheduler", "denoise",
                "enable_stage_2", "enable_extra_options"
            ];

            const stage2Widgets = [
                "stage_2_sampler", "stage_2_scheduler", "stage_2_steps", "stage_2_denoise", "stage_2_cfg"
            ];

            const extraWidgets = [
                "cfg_sliding_scale", "prompt_stutter", "seed_variation", "variation_seed",
                "positive_text", "negative_text", "wildcard_text"
            ];

            let hideNextControl = false; // the tracker for bleeding control_after_generates

            for (let i = 0; i < this.widgets.length; i++) {
                const w = this.widgets[i];

                let shouldHide = false;

                // Track random seeds creating extra controls:
                if (w.name === "control_after_generate") {
                    if (hideNextControl) {
                        shouldHide = true; // hide because it belongs to variation_seed which is hidden
                    } else {
                        shouldHide = false; // belongs to main seed!
                    }
                    hideNextControl = false; // reset
                }
                else if (w.name === "variation_seed") {
                    shouldHide = !extraOpts;
                    if (shouldHide) hideNextControl = true; // Tell the loop to hide the NEXT control_after_generate
                }
                else if (w.name === "cfg_end") {
                    shouldHide = !(extraOpts && cfgSlide);
                }
                else if (stage2Widgets.includes(w.name)) {
                    shouldHide = !enableStage2;
                }
                else if (extraWidgets.includes(w.name)) {
                    shouldHide = !extraOpts;
                }
                else if (alwaysVisible.includes(w.name)) {
                    shouldHide = false;
                }

                if (shouldHide) {
                    // WIDGET SHOULD BE HIDDEN
                    if (w.type !== "HIDDEN_BY_H4") {
                        w.h4_origType = w.type;
                        w.h4_origComputeSize = w.computeSize;
                    }
                    w.h4_hidden = true;
                    w.type = "HIDDEN_BY_H4";
                    w.computeSize = () => [0, -4];
                    w.visible = false;
                    w.hidden = true; // LiteGraph native hide flag

                    // ComfyUI DOM elements (Textareas, etc.)
                    if (w.inputEl) { w.inputEl.style.display = "none"; w.inputEl.style.height = "0"; }
                    if (w.element) { w.element.style.display = "none"; w.element.style.height = "0"; }
                } else {
                    // WIDGET SHOULD BE VISIBLE
                    if (w.type === "HIDDEN_BY_H4" || w.h4_hidden) {
                        w.type = w.h4_origType || "number"; // Fallback just in case
                        if (w.h4_origComputeSize) w.computeSize = w.h4_origComputeSize;
                        else w.computeSize = null; // Let LiteGraph recalculate

                        w.visible = true;
                        w.hidden = false;
                        delete w.h4_hidden;
                    }

                    // ComfyUI DOM elements (Textareas, etc.)
                    if (w.inputEl) { w.inputEl.style.display = ""; w.inputEl.style.height = ""; }
                    if (w.element) { w.element.style.display = ""; w.element.style.height = ""; }
                }
            }

            // Force resize to shrink the 'tower' globally
            if (this.computeSize) {
                const targetSize = this.computeSize();
                this.setSize([this.size[0], targetSize[1]]);
                app.graph.setDirtyCanvas(true, true);
            }
        };

        const onWidgetChange = nodeType.prototype.onWidgetChange;
        nodeType.prototype.onWidgetChange = function (name, value) {
            if (onWidgetChange) onWidgetChange.apply(this, arguments);
            // Fallback just in case
            if (name === "enable_stage_2" || name === "enable_extra_options" || name === "cfg_sliding_scale") {
                setTimeout(() => this.refreshWidgets(), 10);
            }
        };

        // --- PREMIUM RENDERING ---
        nodeType.prototype.onDrawForeground = function (ctx) {
            if (this.flags.collapsed) return;

            // Draw Stage Dividers or Headers if desired
            // But for now, let's just use the default widgets and maybe add a glow
            if (this.isSelected) {
                ctx.save();
                ctx.strokeStyle = COLORS.STAGE_1;
                ctx.lineWidth = 2;
                ctx.shadowBlur = 10;
                ctx.shadowColor = COLORS.STAGE_1;
                ctx.strokeRect(0, 0, this.size[0], this.size[1]);
                ctx.restore();
            }
        };

        // --- CONTEXT MENU ENHANCEMENTS ---
        const getExtraMenuOptions = nodeType.prototype.getExtraMenuOptions;
        nodeType.prototype.getExtraMenuOptions = function (canvas, options) {
            if (getExtraMenuOptions) getExtraMenuOptions.apply(this, arguments);

            options.unshift({
                content: "🚀 [ SAMPLER CORE ]",
                has_submenu: true,
                submenu: {
                    options: [
                        {
                            content: "Reset Layout",
                            callback: () => {
                                this.size = this.computeSize();
                                this.setDirtyCanvas(true);
                            }
                        }
                    ]
                }
            });
        };
    }
});
