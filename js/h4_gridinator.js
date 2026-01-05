// FILE: js/h4_gridinator.js
import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "h4.Gridinator9001",
    async nodeCreated(node, app) {
        if (node.comfyClass === "H4_Gridinator") {

            // 1. THE TOOLTIP
            node.getTooltip = function () {
                return "ITS OVER 9000!?!?\n" +
                    "The Ultimate X/Y/Z Grid Generator.\n" +
                    "Loads Models, Draws Grids, Stutters Prompts.";
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
            // These widgets are hidden until sliding_scale_enable is toggled ON
            // Note: Overrides are NOT in this list - they stay visible always
            const ADVANCED_WIDGETS = [
                "denoise_min", "denoise_max", "steps_min", "steps_max", "range_count"
            ];
            function toggleAdvanced(enabled) {
                for (const wName of ADVANCED_WIDGETS) {
                    const w = node.widgets.find(x => x.name === wName);
                    if (w) {
                        // For numbers/floats, use their proper type when shown
                        if (wName.includes("override")) {
                            w.type = enabled ? "text" : "hidden";
                        } else {
                            w.type = enabled ? "number" : "hidden";
                        }
                    }
                }
            }

            const toggleWidget = node.widgets.find(w => w.name === "sliding_scale_enable");
            if (toggleWidget) {
                setTimeout(() => toggleAdvanced(toggleWidget.value), 100);
                toggleWidget.callback = (val) => toggleAdvanced(val);
            }
        }
    }
});
