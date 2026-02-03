import { app } from "../../scripts/app.js";

/**
 * 📺 h4 DisplayAny+ - Frontend Visualizer
 * Renders a 2x2 Grid or Stacks based on input.
 */

app.registerExtension({
    name: "h4.DisplayAny",
    async nodeCreated(node) {
        if (node.comfyClass !== "H4_DisplayAny") return;

        // Ensure minimum size
        node.setSize([400, 400]);
        node.display_data = []; // Store latest data

        // Hook into onExecuted to receive data
        const onExecuted = node.onExecuted;
        node.onExecuted = function (message) {
            if (onExecuted) onExecuted.apply(this, arguments);

            if (message && message.display_data) {
                this.display_data = message.display_data;
                app.graph.setDirtyCanvas(true, true);
            }
        };

        // Custom Draw Function
        node.onDrawForeground = function (ctx) {
            if (!this.display_data || this.display_data.length === 0) {
                // Draw Placeholder Text
                ctx.fillStyle = "#666";
                ctx.font = "20px Arial";
                ctx.textAlign = "center";
                ctx.fillText("Waiting for Signal...", this.size[0] / 2, this.size[1] / 2);
                return;
            }

            // Margin
            const margin = 10;
            const top_padding = 30; // space for header if needed
            const h = this.size[1] - top_padding - margin;
            const w = this.size[0] - (margin * 2);

            // Calculate Layout
            // 4 inputs -> 2x2 Grid
            // Slot size
            const slot_w = w / 2;
            const slot_h = h / 2;

            const start_x = margin;
            const start_y = top_padding;

            // Loop 4 slots
            for (let i = 0; i < 4; i++) {
                const data = this.display_data[i];
                if (!data) continue;

                // Position
                const row = Math.floor(i / 2);
                const col = i % 2;

                const x = start_x + (col * slot_w);
                const y = start_y + (row * slot_h);

                // Draw Box Background
                ctx.fillStyle = "#111";
                ctx.fillRect(x + 2, y + 2, slot_w - 4, slot_h - 4);

                // Content Rendering
                if (data.type === "empty") {
                    ctx.fillStyle = "#333";
                    ctx.font = "12px Arial";
                    ctx.textAlign = "center";
                    ctx.fillText("No Input", x + slot_w / 2, y + slot_h / 2);
                }
                else if (data.type === "image" && data.content) {
                    // Draw Image
                    const img = new Image();
                    img.src = data.content;
                    if (img.complete) {
                        // Fit Image to slot
                        drawImageContain(ctx, img, x + 4, y + 4, slot_w - 8, slot_h - 8);
                    } else {
                        img.onload = () => app.graph.setDirtyCanvas(true, true);
                    }
                }
                else if (data.type === "image_list" && data.content) {
                    // Draw mini grid of images (upto 4)
                    const imgs = data.content;
                    const sub_w = (slot_w - 8) / 2;
                    const sub_h = (slot_h - 8) / 2;

                    imgs.forEach((src, idx) => {
                        if (idx > 3) return;
                        const rr = Math.floor(idx / 2);
                        const cc = idx % 2;
                        const img = new Image();
                        img.src = src;
                        if (img.complete) {
                            drawImageContain(ctx, img, x + 4 + (cc * sub_w), y + 4 + (rr * sub_h), sub_w - 2, sub_h - 2);
                        } else {
                            img.onload = () => app.graph.setDirtyCanvas(true, true);
                        }
                    });
                }
                else {
                    // Text / List / JSON
                    ctx.fillStyle = "#ccc";
                    ctx.font = "12px Consolas, monospace";
                    ctx.textAlign = "left";

                    // Word wrap primitive
                    const text = String(data.content);
                    wrapText(ctx, text, x + 10, y + 10, slot_w - 20, 14);
                }

                // Draw Border
                ctx.strokeStyle = "#444";
                ctx.lineWidth = 1;
                ctx.strokeRect(x + 2, y + 2, slot_w - 4, slot_h - 4);

                // Draw Label
                ctx.fillStyle = "#888";
                ctx.font = "10px Arial";
                ctx.textAlign = "left";
                ctx.fillText(`Input ${i + 1} (${data.type})`, x + 5, y + slot_h - 5);
            }
        };
    }
});

function drawImageContain(ctx, img, x, y, w, h) {
    const ratio = Math.min(w / img.width, h / img.height);
    const flow_w = img.width * ratio;
    const flow_h = img.height * ratio;
    const offset_x = (w - flow_w) / 2;
    const offset_y = (h - flow_h) / 2;
    ctx.drawImage(img, x + offset_x, y + offset_y, flow_w, flow_h);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(" "); // Simple split, could be better
    let line = "";
    let cursorY = y + lineHeight;

    // Check for newlines first
    const lines = text.split("\n");
    if (lines.length > 1) {
        for (const l of lines) {
            ctx.fillText(l.substring(0, 40), x, cursorY); // Clip long lines
            cursorY += lineHeight;
            if (cursorY > y + 150) break; // Overflow protection
        }
        return;
    }

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + " ";
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line, x, cursorY);
            line = words[n] + " ";
            cursorY += lineHeight;
        } else {
            line = testLine;
        }
        if (cursorY > y + 150) break; // Overflow protection
    }
    ctx.fillText(line, x, cursorY);
}
