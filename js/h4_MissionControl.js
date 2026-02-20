import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

// ------------------------------------------------------------------------------
// H4 Mission Control - Frontend Logic
// ------------------------------------------------------------------------------

app.registerExtension({
    name: "h4.MissionControl",

    async setup() {
        // Listen for the "h4_broadcast_seed" event from the backend
        api.addEventListener("h4_broadcast_seed", (event) => {
            const seedValue = event.detail.seed;
            const sourceNodeId = event.detail.source_id;

            // console.log(`[H4 Mission Control] 📡 Wireless Seed Broadcast Received: ${seedValue} from Node ${sourceNodeId}`);

            if (seedValue === undefined || seedValue === null) return;

            const graph = app.graph;
            if (!graph) return;

            let updateCount = 0;
            const pos = app.canvas.graph_mouse; // For callbacks that need mouse pos

            // Iterate over all nodes in the graph
            for (const node of graph._nodes) {
                if (!node.widgets) continue;

                // Check if this is the source node (The Generator itself)
                const isSource = String(node.id) === String(sourceNodeId);

                // Find widgets that look like seed inputs
                // UPDATED: More aggressive "loose" matching for better compatibility
                for (const w of node.widgets) {
                    const name = w.name ? w.name.toLowerCase() : "";
                    const type = w.type ? String(w.type).toUpperCase() : "";

                    // Standard ComfyUI seed widgets: "seed", "noise_seed"
                    // Custom nodes often use: "seed_int", "seed_num", "s"
                    // We check if name contains "seed" AND it's a number-like widget
                    const isSeedName = name.includes("seed") || name === "seed" || name === "noise_seed";
                    // Exclude "seed_control" (usually the randomized/fixed dropdown enum)
                    const isNotControl = !name.includes("control") && type !== "COMBO";

                    if (isSeedName && isNotControl) {
                        // SPECIAL HANDLING FOR SOURCE NODE
                        if (isSource) {
                            // If we are the source, we only update if we are in RANDOM mode.
                            // If we update in INCREMENTAL mode, we create a race condition (runaway values).
                            const modeWidget = node.widgets.find(mw => mw.name === "mode");
                            if (modeWidget && (modeWidget.value === "Incremental" || modeWidget.value === "Fixed")) {
                                // SKIP self-update for Incremental/Fixed Logic Safety
                                continue;
                            }
                        }

                        // Check if widget value is actually different to avoid unnecessary redraws
                        if (w.value !== seedValue) {
                            // Only update if it's a number (safeguard)
                            if (typeof w.value === 'number' || (!isNaN(parseFloat(seedValue)) && isFinite(seedValue))) {
                                // console.log(`[H4 Mission Control] Updating node ${node.id} (${node.title}) widget '${w.name}' to ${seedValue}`);
                                w.value = Number(seedValue);

                                // Call callback if exists (some nodes need this to trigger internal updates)
                                if (w.callback) {
                                    w.callback(w.value, app.canvas, node, pos, event);
                                }
                                updateCount++;
                            }
                        }
                    }
                }
            }

            if (updateCount > 0) {
                console.log(`[H4 Mission Control] 📡 Wireless Seed Update: Synced ${updateCount} widgets to ${seedValue}`);
                // Force a redraw to show the new values immediately
                app.graph.setDirtyCanvas(true, true);
            }
        });
    }
});
