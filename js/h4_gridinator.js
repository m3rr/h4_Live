// FILE: js/h4_gridinator.js
import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "h4.Gridinator9001",
    async nodeCreated(node, app) {
        if (node.comfyClass === "H4_Gridinator") {

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
                    };
                }
            });

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
