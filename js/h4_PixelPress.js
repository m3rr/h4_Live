
import { app } from "/scripts/app.js";

app.registerExtension({
    name: "h4.PixelPress",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name !== "H4_PixelPress") return;

        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            onNodeCreated?.apply(this, arguments);

            const hdrWidgets = [
                "hdr_intensity",
                "shadow_intensity",
                "highlight_intensity",
                "gamma_intensity",
                "contrast",
                "enhance_color"
            ];

            const toggleHDR = (enabled) => {
                const widgets = this.widgets;
                if (!widgets) return;

                for (const w of widgets) {
                    if (hdrWidgets.includes(w.name)) {
                        w.type = enabled ? "number" : "hidden";
                        w.computeSize = enabled ? undefined : () => [0, -4];
                        w.visible = enabled;
                        // Use existing hide logic if present, or just standard LiteGraph hide
                        // In ComfyUI, setting type to hidden usually works if done early.
                        // But for dynamic updates, we might need to trigger resize.
                    }
                }
                this.setSize(this.computeSize());
                app.graph.setDirtyCanvas(true, true);
            };

            // Find the toggle
            const enableWidget = this.widgets.find(w => w.name === "enable_hdr");
            if (enableWidget) {
                // Initial State
                setTimeout(() => toggleHDR(enableWidget.value), 100);

                // Callback
                const origCallback = enableWidget.callback;
                enableWidget.callback = (val) => {
                    toggleHDR(val);
                    origCallback?.(val);
                };
            }
        };
    }
});
