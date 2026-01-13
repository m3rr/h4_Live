// FILE: js/h4_datastream.js
import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { ComfyWidgets } from "../../scripts/widgets.js";

/**
 * 📡 H4 DataStream - Frontend Logic
 * Handles image previews and batch queue generation.
 */

app.registerExtension({
    name: "h4.DataStream",

    async setup() {
        // ---------------------------------------------------------------------
        // LISTENER: Batch Queue Trigger
        // ---------------------------------------------------------------------
        api.addEventListener("h4.datastream.queue_batch", async ({ detail }) => {
            const { node_id, start_index, count } = detail;
            console.log(`[h4 DataStream] 🚀 Batch Trigger Received! Standard Queueing ${count} items...`);

            try {
                // 1. Get current workflow state
                const { output, workflow } = await app.graphToPrompt();

                // 2. Find the target node in the prompt
                // Note: 'output' keys are node_ids
                if (!output[node_id]) {
                    console.error(`[h4 DataStream] ❌ Node ${node_id} not found in graph!`);
                    return;
                }

                // 3. Generate Queue Items
                for (let i = 0; i < count; i++) {
                    const nextIndex = start_index + i;

                    // Clone the prompt object to avoid mutation issues
                    // We need a deep clone of the specific properties we're changing
                    // But for simple index updates, structuredClone is safest for the whole object
                    const promptClone = structuredClone(output);
                    const nodeInputs = promptClone[node_id].inputs;

                    // A. Update Index
                    nodeInputs.current_index = nextIndex;

                    // B. CRITICAL: Disable Auto-Queue for these generated prompts
                    // to prevent infinite recursion
                    nodeInputs.auto_queue_remaining = false;

                    // C. Submit to Queue
                    // We don't need the workflow object for simple execution, just the prompt
                    // But api.queuePrompt signature is (number, {output, workflow})
                    await api.queuePrompt(0, { output: promptClone, workflow: workflow });

                    console.log(`   + Queued Item: Index ${nextIndex}`);
                }

                console.log(`[h4 DataStream] ✅ Batch Queueing Complete!`);

            } catch (e) {
                console.error("[h4 DataStream] Batch Error:", e);
            }
        });

        // ---------------------------------------------------------------------
        // LISTENER: UI Update (Preview)
        // ---------------------------------------------------------------------
        api.addEventListener("h4.datastream.update_ui", ({ detail }) => {
            const { node_id, filename, current, total, preview_url } = detail;

            const node = app.graph.getNodeById(node_id);
            if (!node) return;

            // Update Text Widget (if exists, or custom display)
            // We usually don't have a dedicated text widget, so we'll just update the node title 
            // or the image widget.

            // Trigger the image update
            if (node.updatePreview) {
                node.updatePreview(preview_url, filename, current, total);
            }
        });
    },

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "H4_DataStream") {

            // 1. EXTEND: onNodeCreated
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
                const node = this;

                // --- BROWSE BUTTON WIDGET ---
                // We add a button that hits our API
                if (!this.browseButton) {
                    this.browseButton = {
                        name: "browse_btn",
                        type: "button",
                        label: "📁 Browse Folder...",
                        callback: async () => {
                            try {
                                // Call API
                                const response = await fetch("/h4/browse");
                                const data = await response.json();
                                if (data.path) {
                                    // Find the text widget and update it
                                    // "folder_path" should be the first widget or named
                                    const pathWidget = node.widgets.find(w => w.name === "folder_path");
                                    if (pathWidget) {
                                        pathWidget.value = data.path;
                                        app.graph.setDirtyCanvas(true, true);
                                    }
                                } else if (data.error) {
                                    alert("Browser Error: " + data.error);
                                }
                            } catch (e) {
                                alert("Failed to open browser. Ensure you are on localhost or have access to server.");
                            }
                        }
                    };
                    // Add Button at the top? Or after folder_path?
                    // We'll insert it after folder_path
                    const pathIdx = this.widgets.findIndex(w => w.name === "folder_path");
                    if (pathIdx >= 0) {
                        this.widgets.splice(pathIdx + 1, 0, this.browseButton);
                    } else {
                        this.addCustomWidget(this.browseButton);
                    }
                }

                // --- PREVIEW IMAGE WIDGET ---
                // We create a widget that draws the image
                if (!this.previewWidget) {
                    this.previewWidget = {
                        name: "preview",
                        type: "image",
                        value: null, // Image Object
                        draw: function (ctx, node, widget_width, y, widget_height) {
                            // Draw Image
                            if (this.value) {
                                const img = this.value;
                                const ratio = img.width / img.height;
                                const w = widget_width;
                                const h = w / ratio;
                                // Center vertically if possible, or just top align
                                ctx.drawImage(img, 0, y, w, h);
                            }

                            // Draw Text Overlay (Filename)
                            if (this.label) {
                                ctx.fillStyle = "rgba(0,0,0,0.6)";
                                ctx.fillRect(0, y + widget_height - 20, widget_width, 20);
                                ctx.fillStyle = "#fff";
                                ctx.font = "12px Arial";
                                ctx.fillText(this.label, 5, y + widget_height - 6);
                            }
                        },
                        computeSize: function (width) {
                            if (this.value) {
                                const ratio = this.value.width / this.value.height;
                                return [width, width / ratio + 25]; // +25 for text
                            }
                            return [width, 0];
                        }
                    };

                    // Add it as a custom widget
                    this.addCustomWidget(this.previewWidget);
                }

                this.updatePreview = function (preview_filename, filename, curr, tot) {
                    // We now receive a filename that lives in ComfyUI/temp/
                    // So we can just use type=temp

                    const url = `/view?filename=${encodeURIComponent(preview_filename)}&type=temp&t=${Date.now()}`;

                    const img = new Image();
                    img.onload = () => {
                        this.previewWidget.value = img;
                        this.previewWidget.label = `${filename} (${curr}/${tot})`;
                        this.setSize(this.computeSize());
                        app.graph.setDirtyCanvas(true, true);
                    };
                    img.src = url;
                };

                return r;
            };
        }
    }
});
