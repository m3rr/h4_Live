import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

/**
 * 🗿 H4 FaceForge - Frontend Logic
 * Enhances FaceForge nodes with custom UI elements.
 */

app.registerExtension({
    name: "h4.FaceForge",

    async beforeRegisterNodeDef(nodeType, nodeData, app) {

        // ---------------------------------------------------------------------
        // H4_BuildFaceModel - Add Folder Browser
        // ---------------------------------------------------------------------
        if (nodeData.name === "H4_BuildFaceModel") {

            // Extend onNodeCreated to inject our widget
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
                const node = this;

                // Create the Browse Button Widget
                if (!this.browseButton) {
                    this.browseButton = {
                        name: "browse_btn",
                        type: "button",
                        label: "📁 Browse Folder...",
                        callback: async () => {
                            try {
                                // Call the existing h4/browse API (from DataStream)
                                const response = await fetch("/h4/browse");
                                const data = await response.json();

                                if (data.path) {
                                    // Find the 'folder_path' widget and update it
                                    const pathWidget = node.widgets.find(w => w.name === "folder_path");
                                    if (pathWidget) {
                                        pathWidget.value = data.path;
                                        // Mark canvas dirty to ensure UI updates and saving works
                                        app.graph.setDirtyCanvas(true, true);
                                    } else {
                                        alert("Error: 'folder_path' widget not found on node!");
                                    }
                                } else if (data.error) {
                                    alert("Browser Error: " + data.error);
                                }
                            } catch (e) {
                                alert("Failed to open browser. Ensure you are running locally.");
                                console.error("[h4 FaceForge] Browser check failed:", e);
                            }
                        }
                    };

                    // Insert the button right after the 'folder_path' widget
                    // or at the end if not found (though it should be there)
                    const pathIdx = this.widgets.findIndex(w => w.name === "folder_path");
                    if (pathIdx >= 0) {
                        this.widgets.splice(pathIdx + 1, 0, this.browseButton);
                    } else {
                        this.addCustomWidget(this.browseButton);
                    }
                }

                return r;
            };
        }
    }
});
