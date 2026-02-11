import { app } from "../../scripts/app.js";

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
                    const customWidthWidget = this.widgets.find((w) => w.name === "custom_width");
                    const customHeightWidget = this.widgets.find((w) => w.name === "custom_height");

                    if (!baseModelWidget || !aspectRatioWidget || !customWidthWidget || !customHeightWidget) return;

                    const isBaseCustom = baseModelWidget.value === "Start From Custom";
                    const isRatioCustom = aspectRatioWidget.value === "Custom Dimensions";
                    const showCustom = isBaseCustom || isRatioCustom;

                    // Helper to toggle visibility
                    const toggle = (w, visible) => {
                        w.type = visible ? "INT" : "hidden";
                        // Some UIs need this to recalculate height
                        w.computeSize = visible ? () => [64, 20] : () => [0, -4];
                    };

                    toggle(customWidthWidget, showCustom);
                    toggle(customHeightWidget, showCustom);

                    // Resize node to fit
                    this.onResize?.(this.size);
                    app.graph.setDirtyCanvas(true, true);
                };

                // Add callbacks
                const baseModelWidget = this.widgets.find((w) => w.name === "base_model");
                const aspectRatioWidget = this.widgets.find((w) => w.name === "aspect_ratio");

                if (baseModelWidget) baseModelWidget.callback = this.updateVisibility;
                if (aspectRatioWidget) aspectRatioWidget.callback = this.updateVisibility;

                // Initial check
                setTimeout(() => this.updateVisibility(), 100);

                return r;
            };

            // Ensure it updates when loading from file/workflow
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
