import { app } from "/scripts/app.js";

/**
 * h4_LatentSelector.js - Intelligent Resolution Management
 * -----------------------------------------------------------------------------
 * Dynamic widget visibility for resolution presets.
 */

app.registerExtension({
    name: "h4.LatentSelector",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "H4_LatentSelector") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;

                this.updateVisibility = () => {
                    const baseModelWidget = this.widgets.find((w) => w.name === "base_model");
                    const aspectRatioWidget = this.widgets.find((w) => w.name === "aspect_ratio");

                    if (!baseModelWidget || !aspectRatioWidget) return;

                    const isBaseCustom = baseModelWidget.value === "Start From Custom";
                    const isRatioCustom = aspectRatioWidget.value === "Custom Dimensions";
                    const showCustom = isBaseCustom || isRatioCustom;

                    // 🛠️ NON-DESTRUCTIVE VISIBILITY
                    // Instead of splicing (which breaks data/validation), we use the hidden type.
                    this.widgets.forEach(w => {
                        if (w.name === "custom_width" || w.name === "custom_height") {
                            if (!showCustom) {
                                if (w.type !== "hidden") {
                                    w._oldType = w.type;
                                    w.type = "hidden";
                                }
                            } else {
                                w.type = w._oldType || "number";
                            }
                        }
                    });

                    // Force Resize
                    setTimeout(() => {
                        const targetSize = this.computeSize();
                        this.setSize([this.size[0], Math.max(targetSize[1], 120)]);
                        app.graph.setDirtyCanvas(true, true);
                    }, 50);
                };

                // Add callbacks
                const baseModelWidget = this.widgets.find((w) => w.name === "base_model");
                const aspectRatioWidget = this.widgets.find((w) => w.name === "aspect_ratio");

                if (baseModelWidget) {
                    const cb = baseModelWidget.callback;
                    baseModelWidget.callback = (v) => {
                        this.updateVisibility();
                        if (cb) cb(v);
                    };
                }
                if (aspectRatioWidget) {
                    const cb = aspectRatioWidget.callback;
                    aspectRatioWidget.callback = (v) => {
                        this.updateVisibility();
                        if (cb) cb(v);
                    };
                }

                // Initial check
                setTimeout(() => this.updateVisibility(), 100);

                return r;
            };

            const onConfigure = nodeType.prototype.onConfigure;
            nodeType.prototype.onConfigure = function () {
                const r = onConfigure ? onConfigure.apply(this, arguments) : undefined;
                if (this.updateVisibility) {
                    setTimeout(() => this.updateVisibility(), 100);
                }
                return r;
            };
        }
    },
});
