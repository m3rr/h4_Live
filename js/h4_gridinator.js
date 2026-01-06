// FILE: js/h4_gridinator.js
import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "h4.Gridinator9001",
    async nodeCreated(node, app) {
        if (node.comfyClass === "H4_Gridinator") {

            // 0. CUSTOM UPLOAD WIDGET Logic
            // 0. CUSTOM UPLOAD WIDGET Logic
            setTimeout(() => {
                const uploadWidget = node.widgets.find(w => w.name === "image_upload");
                if (uploadWidget) {
                    // Hide the default combo
                    uploadWidget.type = "hidden";
                    uploadWidget.computeSize = () => [0, -4];
                    uploadWidget.draw = () => { };

                    // Check for existing elements
                    if (node.widgets.find(w => w.name === "Upload Image")) return;

                    // --- PREVIEW WIDGET (Dynamic) ---
                    // Created on demand, but we define the helper here
                    function addPreviewWidget(targetNode, imageUrl) {
                        let prevWidget = targetNode.widgets.find(w => w.name === "img_preview");

                        // Helper to trigger update when image loads
                        const onImgLoad = () => {
                            console.log("[H4 Gridinator] Image Loaded. Triggering Resize.");
                            setTimeout(() => {
                                // Force recalculation
                                const sz = targetNode.computeSize();
                                // Sanity check dimensions (prevent infinity/NaN)
                                const safeW = Number.isFinite(sz[0]) ? sz[0] : 350;
                                const safeH = Number.isFinite(sz[1]) ? sz[1] : 820;

                                console.log("[H4 Gridinator] New Size:", [safeW, safeH]);
                                targetNode.setSize([safeW, safeH]);
                                targetNode.setDirtyCanvas(true, true);
                            }, 50);
                        };

                        if (!prevWidget) {
                            const imgObj = new Image();
                            imgObj.src = imageUrl;
                            imgObj.onload = onImgLoad;

                            prevWidget = {
                                name: "img_preview",
                                type: "custom",
                                value: imageUrl,
                                imgObj: imgObj,
                                draw: function (ctx, node, widget_width, y, widget_height) {
                                    try {
                                        if (this.imgObj && this.imgObj.complete && this.imgObj.naturalWidth > 0) {
                                            const MAX_H = 250;
                                            const imgRatio = this.imgObj.naturalWidth / this.imgObj.naturalHeight;
                                            const w = widget_width || node.size[0];
                                            const widgetRatio = w / MAX_H;

                                            // "Contain" logic
                                            let drawW, drawH;
                                            if (imgRatio > widgetRatio) {
                                                drawW = w;
                                                drawH = drawW / imgRatio;
                                            } else {
                                                drawH = MAX_H;
                                                drawW = drawH * imgRatio;
                                            }

                                            const centerX = (w - drawW) / 2;
                                            ctx.drawImage(this.imgObj, centerX, y, drawW, drawH);
                                        }
                                    } catch (e) { console.error("Gridinator Draw Error", e); }
                                },
                                computeSize: function (width) {
                                    // Robust width handling
                                    const w = width || 250; // Default if undefined
                                    if (this.imgObj && this.imgObj.complete && this.imgObj.naturalWidth > 0) {
                                        const aspect = this.imgObj.naturalHeight / this.imgObj.naturalWidth;
                                        const calcH = w * aspect;
                                        return [w, Math.min(calcH, 250)];
                                    }
                                    return [w, 0];
                                }
                            };

                            // Add to top, shifting button down
                            const btnIdx = targetNode.widgets.findIndex(w => w.name === "Upload Image");
                            if (btnIdx > -1) {
                                targetNode.widgets.splice(btnIdx, 0, prevWidget);
                            } else {
                                targetNode.widgets.unshift(prevWidget);
                            }
                        } else {
                            // Update existing
                            prevWidget.value = imageUrl;
                            prevWidget.imgObj = new Image();
                            prevWidget.imgObj.onload = onImgLoad;
                            prevWidget.imgObj.src = imageUrl;
                        }
                    }

                    // --- UPLOAD BUTTON ---
                    // LABEL: "Upload Image" (Capitalized)
                    const btn = node.addWidget("button", "Upload Image", "Upload", () => {
                        const fileInput = document.createElement("input");
                        Object.assign(fileInput, {
                            type: "file",
                            accept: "image/*",
                            style: "display: none",
                            onchange: async () => {
                                if (fileInput.files.length > 0) {
                                    const file = fileInput.files[0];
                                    const formData = new FormData();
                                    formData.append("image", file);
                                    formData.append("overwrite", "true");

                                    try {
                                        const resp = await fetch("/upload/image", {
                                            method: "POST",
                                            body: formData,
                                        });
                                        if (resp.ok) {
                                            const data = await resp.json();

                                            // 1. Update Combo
                                            if (uploadWidget.options && uploadWidget.options.values) {
                                                if (!uploadWidget.options.values.includes(data.name)) {
                                                    uploadWidget.options.values.push(data.name);
                                                }
                                            }
                                            uploadWidget.value = data.name;

                                            // 2. Trigger Preview
                                            const params = new URLSearchParams({
                                                filename: data.name,
                                                subfolder: data.subfolder || "",
                                                type: data.type || "input"
                                            });
                                            const imgUrl = `/view?${params.toString()}`;
                                            addPreviewWidget(node, imgUrl);

                                            // Force Layout Update (Redundant but safe)
                                            setTimeout(() => {
                                                app.graph.setDirtyCanvas(true, true);
                                            }, 100);

                                            if (uploadWidget.callback) {
                                                uploadWidget.callback(uploadWidget.value);
                                            }
                                            app.graph.setDirtyCanvas(true, true);
                                        } else {
                                            alert("Upload Failed: " + resp.statusText);
                                        }
                                    } catch (err) {
                                        alert("Error uploading file.");
                                    }
                                }
                            }
                        });
                        document.body.appendChild(fileInput);
                        fileInput.click();
                        setTimeout(() => document.body.removeChild(fileInput), 1000);
                    });

                    btn.name = "Upload Image"; // Correct Internal Name now

                    // Move to Top
                    const btnIdx = node.widgets.indexOf(btn);
                    if (btnIdx > -1) {
                        node.widgets.splice(btnIdx, 1);
                        node.widgets.unshift(btn);
                    }

                    node.onResize && node.onResize(node.size);
                    node.setDirtyCanvas(true, true);
                }
            }, 100);

            // 1. THE TOOLTIP
            // 1. THE TOOLTIP
            node.getTooltip = function () {
                return "ITS OVER 9000?!?!";
            };

            // 2. DEFAULT SIZE (Aggressive)
            // We set min size to ensure it doesn't shrink too much
            const DEFAULT_SIZE = [350, 820];
            if (node.size[0] < DEFAULT_SIZE[0] || node.size[1] < DEFAULT_SIZE[1]) {
                node.size = DEFAULT_SIZE;
            }

            // 3. DATA FETCHING
            let checkpoints = [];
            let loras = [];
            let samplers = [];
            let schedulers = [];

            async function fetchData() {
                try {
                    // Fetch Checkpoints
                    const r1 = await fetch("/object_info/CheckpointLoaderSimple");
                    const d1 = await r1.json();
                    checkpoints = d1.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] || ["Error: No Checkpoints"];

                    // Fetch LoRAs
                    const r2 = await fetch("/object_info/LoraLoader");
                    const d2 = await r2.json();
                    loras = d2.LoraLoader?.input?.required?.lora_name?.[0] || ["Error: No LoRAs"];

                    // Fetch Samplers & Schedulers (from KSampler)
                    const r3 = await fetch("/object_info/KSampler");
                    const d3 = await r3.json();
                    samplers = d3.KSampler?.input?.required?.sampler_name?.[0] || ["euler", "dpmpp_2m"];
                    schedulers = d3.KSampler?.input?.required?.scheduler?.[0] || ["normal", "karras"];

                    console.log("[H4 Gridinator] Data Loaded:", {
                        ckpts: checkpoints.length,
                        loras: loras.length,
                        samplers: samplers.length,
                        schedulers: schedulers.length
                    });

                } catch (e) {
                    console.error("[H4 Gridinator] Data Fetch Error:", e);
                }
            }
            fetchData();

            // 4. WIDGET REPLACEMENT
            function replaceWidget(node, widgetName, newType, optionsValues) {
                const index = node.widgets.findIndex(w => w.name === widgetName);
                if (index === -1) return;

                const oldWidget = node.widgets[index];

                // Check redundancy
                // if (newType === "combo" && oldWidget.type === "combo") return; // <--- BUG WAS HERE: This prevented option updates!
                if (newType === "text" && (oldWidget.type === "text" || oldWidget.type === "customtext")) return;

                // Value Logic
                let cleanValue = oldWidget.value;
                if (newType === "combo") {
                    if (Array.isArray(optionsValues) && !optionsValues.includes(cleanValue)) {
                        cleanValue = optionsValues[0] || "";
                    }
                }

                // Remove Old
                node.widgets.splice(index, 1);

                // Create New
                const widgetOptions = (newType === "combo") ? { values: optionsValues } : {};
                const newWidget = node.addWidget(newType, widgetName, cleanValue, null, widgetOptions);

                // Reorder
                node.widgets.pop(); // Remove from end
                node.widgets.splice(index, 0, newWidget); // Insert at index

                // Refresh
                node.setDirtyCanvas(true);
            }

            // 5. EVENT LISTENERS
            const MODES = ["x", "y", "z"];

            function checkLoRAVisibility() {
                const xVal = node.widgets.find(w => w.name === "grid_x_mode")?.value;
                const yVal = node.widgets.find(w => w.name === "grid_y_mode")?.value;
                const zVal = node.widgets.find(w => w.name === "grid_z_mode")?.value;

                const hasLora = (xVal === "LoRA" || yVal === "LoRA" || zVal === "LoRA");

                const loraWidget = node.widgets.find(w => w.name === "lora_strength");
                if (loraWidget) {
                    const targetType = hasLora ? "number" : "hidden";
                    if (loraWidget.type !== targetType) {
                        loraWidget.type = targetType;
                        loraWidget.computeSize = hasLora ? undefined : () => [0, -4];

                        // Resize safely
                        node.onResize && node.onResize(node.size);
                        node.setDirtyCanvas(true, true);
                    }
                }
            }

            MODES.forEach(axis => {
                const modeName = `grid_${axis}_mode`;
                const valName = `grid_${axis}_val`;

                const modeWidget = node.widgets.find(w => w.name === modeName);
                if (modeWidget) {
                    const origCallback = modeWidget.callback;
                    modeWidget.callback = function (val) {
                        if (origCallback) origCallback.apply(this, arguments);

                        // SWAP LOGIC
                        if (val === "Model") {
                            replaceWidget(node, valName, "combo", checkpoints);
                        } else if (val === "LoRA") {
                            replaceWidget(node, valName, "combo", loras);
                        } else if (val === "Sampler") {
                            replaceWidget(node, valName, "combo", samplers);
                        } else if (val === "Scheduler") {
                            replaceWidget(node, valName, "combo", schedulers);
                        } else {
                            replaceWidget(node, valName, "text", []);
                        }

                        // Check Visibility
                        checkLoRAVisibility();
                    };
                }
            });

            // Initial Check
            setTimeout(() => checkLoRAVisibility(), 200);

            // 6. ADVANCED SECTION (Hidden by default)
            const ADVANCED_WIDGETS = [
                "denoise_min", "denoise_max", "steps_min", "steps_max", "range_count"
            ];

            function toggleAdvanced(enabled) {
                let changed = false;
                for (const wName of ADVANCED_WIDGETS) {
                    const w = node.widgets.find(x => x.name === wName);
                    if (w) {
                        const newType = enabled ? "number" : "hidden";
                        if (w.type !== newType) {
                            w.type = newType;
                            // When hidden, we must ensure computeSize runs or we manually shrink
                            // CustomText/Number widgets usually respect "hidden" type if handled by LiteGraph
                            // But usually we need to mess with properties to fully hide them from the computed height
                            w.computeSize = enabled ? undefined : () => [0, -4]; // Hack: Negative height prevents gap
                            changed = true;
                        }
                    }
                }

                if (changed) {
                    // Force a resize calculation
                    node.onResize && node.onResize(node.size);
                    node.setDirtyCanvas(true, true);

                    // Trigger a shape update if possible (LiteGraph specific)
                    if (node.graph) {
                        node.graph.setDirtyCanvas(true, true);
                    }
                }
            }

            const toggleWidget = node.widgets.find(w => w.name === "sliding_scale_enable");
            if (toggleWidget) {
                // Initial State Check (Delay to let widgets settle)
                setTimeout(() => {
                    toggleAdvanced(toggleWidget.value);
                    // Force resize after initial hide
                    if (!toggleWidget.value) {
                        node.setSize([node.size[0], node.computeSize()[1]]);
                    }
                }, 100);

                // Callback
                toggleWidget.callback = (val) => {
                    toggleAdvanced(val);
                    // Force resize on toggle
                    setTimeout(() => {
                        node.setSize([node.size[0], node.computeSize()[1]]);
                    }, 50);
                };
            }
        }
    }
});
