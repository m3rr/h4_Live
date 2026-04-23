
import { app } from "../../scripts/app.js";

/**
 * 📜 H4 DocuScribe - Frontend
 * Logic:
 * - Dynamic Input Spawning (same as DisplayAny)
 * - Visual Feedback when Report is ready.
 */

app.registerExtension({
    name: "h4.DocuScribe",
    async nodeCreated(node) {
        if (node.comfyClass !== "H4_DocuScribe") return;

        // Ensure minimum size
        node.setSize([300, 100]);

        // --- DYNAMIC INPUT SLOT LOGIC (Copy of DisplayAny) ---
        const MIN_INPUTS = 1;
        const MAX_INPUTS = 10;

        node.onConnectionsChange = function (type, index, connected, link_info, slot) {
            if (type !== 1) return; // Only Input changes

            const count = this.inputs.length;
            const lastIndex = count - 1;
            const lastInput = this.inputs[lastIndex];

            // Add new if last connected
            if (lastInput.link !== null && count < MAX_INPUTS) {
                const nextName = `source_${count + 1}`;
                this.addInput(nextName, "*");
            }

            // Cleanup
            const newCount = this.inputs.length;
            if (newCount > MIN_INPUTS) {
                const last = this.inputs[newCount - 1];
                const prev = this.inputs[newCount - 2];
                if (last.link === null && prev.link === null) {
                    this.removeInput(newCount - 1);
                }
            }
        };

        // --- VISUALIZATION ---
        node.onExecuted = function (message) {
            if (message && message.text) {
                // Flash success/content?
                // Just force update
                this.report_text = message.text[0]; // Markdown content
            }
        }

    }
});
