import { app } from "../../scripts/app.js";
import { ComfyWidgets } from "../../scripts/widgets.js";

app.registerExtension({
    name: "h4.Live.SmartConsole",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "H4_SmartConsole") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;

                // Create the widget to display logs
                // We use "log" as the internal name, but value is separate
                // Options: multiline
                this.log_widget = ComfyWidgets["STRING"](this, "log", ["STRING", { multiline: true }], app).widget;

                // Make it read-only and style it
                this.log_widget.inputEl.readOnly = true;
                this.log_widget.inputEl.style.opacity = 0.8;
                this.log_widget.inputEl.style.fontSize = "11px";
                this.log_widget.inputEl.style.fontFamily = "monospace";
                this.log_widget.inputEl.style.color = "#0f0"; // Matrix Green Text
                this.log_widget.inputEl.style.backgroundColor = "#000"; // Black Background

                // Initialize with clear status
                this.log_widget.value = "WAITING FOR DATA...";

                // Resize node to fit the console
                this.setSize([400, 250]);

                return r;
            };

            // Handle the message from Python
            const onExecuted = nodeType.prototype.onExecuted;
            nodeType.prototype.onExecuted = function (message) {
                onExecuted?.apply(this, arguments);

                if (message && message.text) {
                    const joined_text = message.text.join("\n"); // Join with newlines
                    this.log_widget.value = joined_text;

                    // Visual Flash/Feedback could go here
                }
            };
        }
    }
});
