
import { app } from "../../scripts/app.js";

/**
 * 📺 h4 DisplayAny+ - Dynamic Visualizer
 * Features:
 * - Dynamic Input Spawning (1 -> 10)
 * - Adaptive Grid Layout
 * - Lightbox Overlay (Left Click Image)
 * - Navigation Jump (Left Click Node)
 * - Open in New Tab (Right Click Image)
 */

app.registerExtension({
    name: "h4.DisplayAny",
    async nodeCreated(node) {
        if (node.comfyClass !== "H4_DisplayAny") return;

        // Ensure minimum size
        node.setSize([400, 400]);
        node.display_data = []; // Store latest data

        // --- DYNAMIC INPUT SLOT LOGIC ---
        const MIN_INPUTS = 1;
        const MAX_INPUTS = 10;

        node.onConnectionsChange = function (type, index, connected, link_info, slot) {
            if (type !== 1) return; // Only care about Input changes (1 = Input, 2 = Output)

            // Logic:
            // Always ensure there is exactly ONE empty slot at the end (unless MAX reached).
            // If the last slot is connected, add a new one.
            // If the second to last slot is disconnected (and the last is empty), remove the last one.

            // Get current input count
            const count = this.inputs.length;
            const lastIndex = count - 1;

            // Check if last input is connected
            const lastInput = this.inputs[lastIndex];

            // Case 1: Add new slot
            if (lastInput.link !== null && count < MAX_INPUTS) {
                // Add Source_{N+1}
                const nextName = `source_${count + 1}`;
                this.addInput(nextName, "*"); // Wildcard type
            }

            // Case 2: Remove extra empty slots (Cleanup)
            // Iterate backwards from end
            // We want to keep 1 empty slot at the end.
            // So if end is empty AND end-1 is empty -> remove end.

            // Re-calculate after potential add
            const newCount = this.inputs.length;
            if (newCount > MIN_INPUTS) {
                const last = this.inputs[newCount - 1];
                const prev = this.inputs[newCount - 2];

                if (last.link === null && prev.link === null) {
                    this.removeInput(newCount - 1);
                }
            }
        };

        // Hook into onExecuted to receive data
        const onExecuted = node.onExecuted;
        node.onExecuted = function (message) {
            if (onExecuted) onExecuted.apply(this, arguments);

            if (message && message.display_data) {
                this.display_data = message.display_data;
                app.graph.setDirtyCanvas(true, true);
            }
        };

        // --- INTERACTION HANDLING ---
        node.onMouseDown = function (event, pos, graph_canvas) {
            if (!this.display_data || this.display_data.length === 0) return false;

            // Calculate Grid Layout (Same logic as draw)
            const count = this.display_data.length;
            const margin = 10;
            const top_padding = 30;
            const h = this.size[1] - top_padding - margin;
            const w = this.size[0] - (margin * 2);

            let cols = 1;
            let rows = 1;
            if (count > 1) { cols = 2; rows = 2; }
            if (count > 4) { cols = 3; rows = 2; } // 6
            if (count > 6) { cols = 3; rows = 3; } // 9
            if (count > 9) { cols = 4; rows = 3; } // 12

            const slot_w = w / cols;
            const slot_h = h / rows;
            const start_x = margin;
            const start_y = top_padding;

            // Hit Test
            // Local pos is relative to node top-left
            const localX = pos[0];
            const localY = pos[1];

            // Ignore header clicks
            if (localY < top_padding) return false;

            // Find clicked slot index
            let clickedIndex = -1;

            // Iterate slots to find match
            for (let i = 0; i < count; i++) {
                const r = Math.floor(i / cols);
                const c = i % cols;

                const sx = start_x + (c * slot_w);
                const sy = start_y + (r * slot_h);

                // Simple BBox check
                if (localX >= sx && localX <= sx + slot_w &&
                    localY >= sy && localY <= sy + slot_h) {
                    clickedIndex = i;
                    break;
                }
            }

            if (clickedIndex === -1) return false;

            const data = this.display_data[clickedIndex];
            if (!data) return false;

            // --- RIGHT CLICK (Context Menu substitute) ---
            if (event.button === 2) {
                // Open Image in New Tab
                if ((data.type === "image" || data.type === "image_list") && data.content) {
                    // If list, open first? Or cycle?
                    // Just open the main content
                    const src = Array.isArray(data.content) ? data.content[0] : data.content;
                    if (src.startsWith("data:image")) {
                        // Open in new tab
                        const win = window.open();
                        if (win) {
                            win.document.write(`<img src="${src}" style="max-width:100%"/>`);
                            win.document.title = "H4 Component Image";
                        }
                    }
                }
                // Determine source node 
                // We know input index = clickedIndex
                // Find link
                if (this.inputs[clickedIndex] && this.inputs[clickedIndex].link !== null) {
                    const linkId = this.inputs[clickedIndex].link;
                    const link = app.graph.links[linkId];
                    if (link) {
                        const originNode = app.graph.getNodeById(link.origin_id);
                        if (originNode) {
                            // alert(`Source: ${originNode.title}`);
                        }
                    }
                }
                return false; // Let normal context menu happen? Maybe suppress?
            }

            // --- LEFT CLICK ---
            if (event.button === 0) {
                // Action 1: Lightbox (Images)
                if (data.type === "image" || data.type === "image_list") {
                    createLightbox(data.content);
                    return true; // Capture event
                }

                // Action 2: Jump to Node (Data/Text)
                // Trace link back to origin
                if (this.inputs[clickedIndex] && this.inputs[clickedIndex].link !== null) {
                    const linkId = this.inputs[clickedIndex].link;
                    const link = app.graph.links[linkId];
                    if (link) {
                        const originNode = app.graph.getNodeById(link.origin_id);
                        if (originNode) {
                            app.canvas.centerOnNode(originNode);
                            app.canvas.selectNode(originNode);
                            return true; // Capture
                        }
                    }
                }
            }

            return false;
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
            const top_padding = 30; // space for header
            const h = this.size[1] - top_padding - margin;
            const w = this.size[0] - (margin * 2);

            // --- ADAPTIVE LAYOUT ---
            const count = this.display_data.length;
            let cols = 1;
            let rows = 1;

            if (count > 1) { cols = 2; rows = 2; }
            if (count > 4) { cols = 3; rows = 2; } // Up to 6
            if (count > 6) { cols = 3; rows = 3; } // Up to 9
            if (count > 9) { cols = 4; rows = 3; } // Up to 12

            const slot_w = w / cols;
            const slot_h = h / rows;
            const start_x = margin;
            const start_y = top_padding;

            // Loop slots
            for (let i = 0; i < count; i++) {
                const data = this.display_data[i];
                if (!data) continue;

                // Position
                const r = Math.floor(i / cols);
                const c = i % cols;

                const x = start_x + (c * slot_w);
                const y = start_y + (r * slot_h);

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
                        drawImageContain(ctx, img, x + 4, y + 4, slot_w - 8, slot_h - 8);
                    } else {
                        img.onload = () => app.graph.setDirtyCanvas(true, true);
                    }
                }
                else if (data.type === "image_list" && data.content) {
                    // Draw mini grid of images (upto 4 logic is fine, or cycle?)
                    // Let's just draw the first one large for clarity in small slots
                    // Or split quad?
                    // Split quad if we have space, otherwise first.
                    const imgs = data.content;
                    if (imgs.length > 0) {
                        // Draw first image as cover
                        const img = new Image();
                        img.src = imgs[0];
                        if (img.complete) drawImageContain(ctx, img, x + 4, y + 4, slot_w - 8, slot_h - 8);
                        else img.onload = () => app.graph.setDirtyCanvas(true, true);

                        // Draw count badge
                        ctx.fillStyle = "rgba(0,0,0,0.6)";
                        ctx.fillRect(x + slot_w - 25, y + 4, 20, 15);
                        ctx.fillStyle = "#fff";
                        ctx.font = "10px Arial";
                        ctx.textAlign = "center";
                        ctx.fillText(`${imgs.length}`, x + slot_w - 15, y + 15);
                    }
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
                // Shorten labels
                ctx.fillText(`${i + 1}:${data.type.substr(0, 4)}`, x + 5, y + slot_h - 5);
            }
        };
    }
});

// --- HELPER FUNCTIONS ---

function drawImageContain(ctx, img, x, y, w, h) {
    const ratio = Math.min(w / img.width, h / img.height);
    const flow_w = img.width * ratio;
    const flow_h = img.height * ratio;
    const offset_x = (w - flow_w) / 2;
    const offset_y = (h - flow_h) / 2;
    ctx.drawImage(img, x + offset_x, y + offset_y, flow_w, flow_h);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    // Basic wrap logic
    const lines = text.split("\n");
    let cursorY = y + lineHeight;

    // Safety cap
    const max_lines_allowed = Math.floor(150 / lineHeight);
    let lines_drawn = 0;

    for (let l of lines) {
        if (l.length > 100) { l = l.substring(0, 100) + "..."; }
        ctx.fillText(l, x, cursorY);
        cursorY += lineHeight;
        lines_drawn++;
        if (lines_drawn > max_lines_allowed) break;
    }
}

// --- LIGHTBOX OVERLAY ---
function createLightbox(content) {
    // If multiple images, content is list
    const images = Array.isArray(content) ? content : [content];
    let currentIndex = 0;

    // Create container
    const id = "h4-lightbox-overlay";
    let overlay = document.getElementById(id);
    if (overlay) document.body.removeChild(overlay);

    overlay = document.createElement("div");
    overlay.id = id;
    Object.assign(overlay.style, {
        position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
        backgroundColor: "rgba(0,0,0,0.9)", zIndex: 10000,
        display: "flex", justifyContent: "center", alignItems: "center",
        flexDirection: "column"
    });

    // Image Element
    const imgEl = document.createElement("img");
    Object.assign(imgEl.style, {
        maxWidth: "90%", maxHeight: "85%", borderRadius: "4px", boxShadow: "0 0 20px #000"
    });

    // Update Logic
    const updateImage = () => {
        imgEl.src = images[currentIndex];
        infoEl.innerText = `${currentIndex + 1} / ${images.length}`;
        // Preload next?
    };

    // Close Button
    const closeBtn = document.createElement("div");
    closeBtn.innerText = "×";
    Object.assign(closeBtn.style, {
        position: "absolute", top: "20px", right: "30px",
        color: "#fff", fontSize: "40px", cursor: "pointer", fontWeight: "bold"
    });
    closeBtn.onclick = () => document.body.removeChild(overlay);

    // Controls container
    const controls = document.createElement("div");
    Object.assign(controls.style, {
        marginTop: "10px", display: "flex", gap: "20px", alignItems: "center", color: "#fff", fontFamily: "Arial"
    });

    const prevBtn = document.createElement("button");
    prevBtn.innerText = "◀ Prev";
    prevBtn.onclick = (e) => { e.stopPropagation(); currentIndex = (currentIndex - 1 + images.length) % images.length; updateImage(); };
    Object.assign(prevBtn.style, { padding: "10px 20px", cursor: "pointer", background: "#333", border: "1px solid #555", color: "white" });

    const nextBtn = document.createElement("button");
    nextBtn.innerText = "Next ▶";
    nextBtn.onclick = (e) => { e.stopPropagation(); currentIndex = (currentIndex + 1) % images.length; updateImage(); };
    Object.assign(nextBtn.style, { padding: "10px 20px", cursor: "pointer", background: "#333", border: "1px solid #555", color: "white" });

    const infoEl = document.createElement("span");
    infoEl.innerText = "";

    if (images.length > 1) {
        controls.appendChild(prevBtn);
        controls.appendChild(infoEl);
        controls.appendChild(nextBtn);
    }

    // Assembly
    overlay.appendChild(closeBtn);
    overlay.appendChild(imgEl);
    overlay.appendChild(controls);

    // Click outside to close
    overlay.onclick = (e) => {
        if (e.target === overlay) document.body.removeChild(overlay);
    };

    // Add Key listener
    const keyHandler = (e) => {
        if (!document.getElementById(id)) {
            window.removeEventListener("keydown", keyHandler);
            return;
        }
        if (e.key === "Escape") document.body.removeChild(overlay);
        if (e.key === "ArrowLeft") prevBtn.click();
        if (e.key === "ArrowRight") nextBtn.click();
    };
    window.addEventListener("keydown", keyHandler);

    document.body.appendChild(overlay);
    updateImage();
}
