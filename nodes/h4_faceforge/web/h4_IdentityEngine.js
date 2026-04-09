import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

/**
 * 🕵️ h4 IdentityEngine - Frontend Logic
 * Handles Preset Save/Load/Delete and UI interactivity.
 */

const ENDPOINT_LIST = "/h4/presets/list";
const ENDPOINT_SAVE = "/h4/presets/save";
const ENDPOINT_LOAD = "/h4/presets/load";
const ENDPOINT_DELETE = "/h4/presets/delete";

app.registerExtension({
    name: "h4.IdentityEngine",
    async nodeCreated(node) {
        if (node.comfyClass !== "H4_IdentityEngine") return;

        // 1. Setup Preset Widget
        // 1. Setup Preset Widget
        // Problem: Backend sends STRING, so Comfy creates a Text Widget.
        // Changing .type after creation sometimes fails to re-render.
        // Solution: Nuclear option. Delete the widget and replace it with a true Combo widget.

        const widgetIndex = node.widgets.findIndex(w => w.name === "preset");
        if (widgetIndex !== -1) {
            // Remove old widget
            const oldWidget = node.widgets[widgetIndex];
            const originalValue = oldWidget.value;
            node.widgets.splice(widgetIndex, 1);

            // Create new Combo widget
            // addWidget(type, name, value, callback, options)
            const newWidget = node.addWidget("combo", "preset", originalValue, (v) => { }, { values: ["None"] });

            // Move it back to the original position (splice inserts at end usually, so we must resort or splice properly)
            // Actually, addWidget raises it to the end. We need to put it back.
            node.widgets.pop(); // Remove from end
            node.widgets.splice(widgetIndex, 0, newWidget); // Insert at correct index
        }

        const widgetPreset = node.widgets.find(w => w.name === "preset"); // Get reference to new widget

        // 2. Refresh Function
        const refreshPresets = async () => {
            try {
                const resp = await fetch(ENDPOINT_LIST);
                const data = await resp.json();
                if (data.presets) {
                    widgetPreset.options.values = ["None", ...data.presets];
                    // Reset value if not valid
                    if (!widgetPreset.options.values.includes(widgetPreset.value)) {
                        widgetPreset.value = "None";
                    }
                }
            } catch (e) {
                console.error("[h4 IdentityEngine] Failed to list presets", e);
            }
        };

        // Initial load
        await refreshPresets();

        // 3. Add Buttons
        // --------------------------------------------------------------------

        // Refresh Button
        node.addWidget("button", "🔄 Refresh Presets", null, () => {
            refreshPresets();
        });

        // Load Logic (Triggered on change of the combo, but we can also have a force load button)
        // Actually, let's hook the callback of the preset widget
        const originalCallback = widgetPreset.callback;
        widgetPreset.callback = async (value) => {
            if (originalCallback) originalCallback(value);
            if (value && value !== "None") {
                // Load logic
                try {
                    const resp = await fetch(ENDPOINT_LOAD, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name: value })
                    });
                    const data = await resp.json();
                    if (data.settings) {
                        applySettings(node, data.settings);
                    }
                } catch (e) {
                    console.error("Failed to load preset", e);
                    alert("Failed to load preset: " + e.message);
                }
            }
        };

        // Save Button
        node.addWidget("button", "💾 Save Preset", null, () => {
            showSaveModal(node, refreshPresets);
        });

        // Delete Button
        node.addWidget("button", "🗑️ Delete Preset", null, () => {
            const current = widgetPreset.value;
            if (!current || current === "None") {
                alert("Please select a preset to delete.");
                return;
            }
            if (confirm(`Are you sure you want to delete '${current}'?`)) {
                fetch(ENDPOINT_DELETE, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: current })
                }).then(async () => {
                    await refreshPresets();
                    widgetPreset.value = "None";
                });
            }
        });

        // Fix size
        node.onResize?.(node.size);
    }
});

/**
 * Applies settings dictionary to node widgets.
 */
function applySettings(node, settings) {
    if (!node.widgets) return;

    for (const widget of node.widgets) {
        // Skip the preset widget itself to avoid loops
        if (widget.name === "preset") continue;

        // Check if setting exists
        if (settings[widget.name] !== undefined) {
            // Handle "Include Source" logic (Excluded fields)
            // If widget is Source (ckpt, vae, clip) and not in settings, skip.

            widget.value = settings[widget.name];
        }
    }
    app.graph.setDirtyCanvas(true, true);
}

/**
 * Harvests settings from node widgets.
 */
function getSettings(node, includeSource) {
    const settings = {};
    for (const widget of node.widgets) {
        if (widget.type === "button") continue;
        if (widget.name === "preset") continue;

        // Exclude Scene Prompt from Preset Save (DNA Logic)
        if (widget.name === "positive") continue;

        // Filter Source fields if unchecked
        if (!includeSource) {
            if (["ckpt_name", "vae_name", "clip_name", "model_opt"].includes(widget.name)) continue;
        }

        settings[widget.name] = widget.value;
    }
    return settings;
}

/**
 * Shows the Save Preset Modal.
 */
function showSaveModal(node, callback) {
    const name = prompt("Enter Preset Name:");
    if (!name) return;

    // We need a custom modal for the Checkbox. 
    // Since `prompt` doesn't support checkboxes, let's use a standard `confirm` workflow 
    // or build a quick DOM modal. 
    // User requested: "When saved ask the user 'save with model / clip / vae settings?'"

    const includeSource = confirm("Save Source Models?\n\nOK = Yes (Include Checkpoint/VAE/CLIP names)\nCancel = No (Generic/Model Agnostic)");

    const settings = getSettings(node, includeSource);

    fetch(ENDPOINT_SAVE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: name,
            settings: settings,
            save_source: includeSource
        })
    })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                // alert("Saved!");
                if (callback) callback();

                // Auto-select the new preset
                const w = node.widgets.find(x => x.name === "preset");
                if (w) w.value = name;
            } else {
                alert("Error: " + data.error);
            }
        });
}
