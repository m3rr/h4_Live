import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "h4.LatentSelector",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "H4_LatentSelector") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;

                // Capture initial references to the widgets we want to toggle
                // We do this once on creation so we don't lose them when we remove them from the array
                this._customWidthWidget = this.widgets.find(w => w.name === "custom_width");
                this._customHeightWidget = this.widgets.find(w => w.name === "custom_height");

                // Store standard types to be safe
                if (this._customWidthWidget) this._customWidthWidget.type = "number";
                if (this._customHeightWidget) this._customHeightWidget.type = "number";

                this.updateVisibility = () => {
                    const baseModelWidget = this.widgets.find((w) => w.name === "base_model");
                    const aspectRatioWidget = this.widgets.find((w) => w.name === "aspect_ratio");

                    if (!baseModelWidget || !aspectRatioWidget) return;

                    const isBaseCustom = baseModelWidget.value === "Start From Custom";
                    const isRatioCustom = aspectRatioWidget.value === "Custom Dimensions";
                    const showCustom = isBaseCustom || isRatioCustom;

                    // HARD HIDE: Splice them out of the array completely
                    // This is the only way to guarantee they don't take up space or show ghost UI

                    const widthIndex = this.widgets.findIndex(w => w.name === "custom_width");
                    const heightIndex = this.widgets.findIndex(w => w.name === "custom_height");

                    if (showCustom) {
                        // We want them to exist
                        // If they are missing (-1), put them back
                        // We append them to the end, or after 'batch_size' if we want to be specific

                        if (widthIndex === -1 && this._customWidthWidget) {
                            this.widgets.push(this._customWidthWidget);
                        }

                        // Re-check width index to ensure order or just push height
                        const newWidthIndex = this.widgets.findIndex(w => w.name === "custom_width");
                        const newHeightIndex = this.widgets.findIndex(w => w.name === "custom_height");

                        if (newHeightIndex === -1 && this._customHeightWidget) {
                            this.widgets.push(this._customHeightWidget);
                        }

                    } else {
                        // We want them GONE
                        // Remove from last to first to avoid index shifting issues if they are adjacent

                        if (heightIndex !== -1) {
                            this.widgets.splice(heightIndex, 1);
                        }

                        // Re-calculate width index because splice above might have shifted it
                        const safeWidthIndex = this.widgets.findIndex(w => w.name === "custom_width");
                        if (safeWidthIndex !== -1) {
                            this.widgets.splice(safeWidthIndex, 1);
                        }
                    }

                    // Force Resize
                    setTimeout(() => {
                        const targetSize = this.computeSize();
                        this.setSize([this.size[0], targetSize[1]]);
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

            // Ensure it updates when loading from file/workflow
            const onConfigure = nodeType.prototype.onConfigure;
            nodeType.prototype.onConfigure = function () {
                const r = onConfigure ? onConfigure.apply(this, arguments) : undefined;
                if (this.updateVisibility) {
                    // Re-capture (just in case configure re-created widgets, though usually it doesn't)
                    this._customWidthWidget = this.widgets.find(w => w.name === "custom_width") || this._customWidthWidget;
                    this._customHeightWidget = this.widgets.find(w => w.name === "custom_height") || this._customHeightWidget;

                    setTimeout(() => this.updateVisibility(), 100);
                }
                return r;
            };
        }
    },
});
