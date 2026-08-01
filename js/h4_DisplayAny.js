
import { app } from "../../scripts/app.js";

/**
 * 📺 h4 DisplayAny+ - Dynamic Visualizer
 * Features:
 * - Dynamic Input Spawning (1 -> 10)
 * - Adaptive Grid Layout
 * - Lightbox Overlay (Left Click Image)
 * - Text Inspector (Left Click Text)
 * - Navigation Jump (Left Click Header/Label)
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
            const margin_left = 85;  // Safe harbor for input dots/labels
            const margin_right = 15;
            const margin_bottom = 15;
            const top_padding = 40;  // Space for node header/title

            const h = this.size[1] - top_padding - margin_bottom;
            const w = this.size[0] - margin_left - margin_right;

            let cols = 1;
            let rows = 1;
            if (count > 1) { cols = 2; rows = 2; }
            if (count > 4) { cols = 3; rows = 2; } // 6
            if (count > 6) { cols = 3; rows = 3; } // 9
            if (count > 9) { cols = 4; rows = 3; } // 12

            const slot_w = w / cols;
            const slot_h = h / rows;
            const start_x = margin_left;
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

            // ... [Rest of MouseDown Logic remains the same] ...

            // --- RIGHT CLICK (Context Menu substitute) ---
            if (event.button === 2) {
                // Open Image in New Tab
                if ((data.type === "image" || data.type === "image_list") && data.content) {
                    const src = Array.isArray(data.content) ? data.content[0] : data.content;
                    if (src.startsWith("data:image")) {
                        const win = window.open();
                        if (win) {
                            win.document.write(`<img src="${src}" style="max-width:100%"/>`);
                            win.document.title = "H4 Component Image";
                        }
                    }
                }
                return false; // Allow default menu for other things?
            }

            // --- LEFT CLICK ---
            if (event.button === 0) {
                // Action 1: Lightbox (Images)
                if (data.type === "image" || data.type === "image_list") {
                    createLightbox(data.content);
                    return true; // Capture event
                }

                // Action 2: Text Inspector (Data/Strings)
                if (data.type !== "image" && data.type !== "image_list" && data.type !== "empty") {
                    createTextLightbox(data.content, data.type);
                    return true;
                }

                // Fallback: Jump to Node (if empty or other)
                if (this.inputs[clickedIndex] && this.inputs[clickedIndex].link !== null) {
                    const linkId = this.inputs[clickedIndex].link;
                    const link = app.graph.links[linkId];
                    if (link) {
                        const originNode = app.graph.getNodeById(link.origin_id);
                        if (originNode) {
                            app.canvas.centerOnNode(originNode);
                            app.canvas.selectNode(originNode);
                            return true;
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

            // Margin & Padding Safety Zone
            const margin_left = 85;   // Critical: Push content right to avoid input labels
            const margin_right = 15;
            const margin_bottom = 15;
            const top_padding = 40;   // space for header

            const h = this.size[1] - top_padding - margin_bottom;
            const w = this.size[0] - margin_left - margin_right;

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
            const start_x = margin_left;
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

                // Default Background
                ctx.fillStyle = "#111";

                // Style specific backgrounds
                if (data.type !== "image" && data.type !== "image_list" && data.type !== "empty") {
                    // Text Data: Code Editor Look
                    ctx.fillStyle = "#0d1117"; // GitHub Dark Dimmedish
                }

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
                    // Terminal Style Text
                    ctx.fillStyle = "#00ff00"; // Hacker Green title? No, subtle

                    // Body Text
                    ctx.fillStyle = "#e6e6e6";
                    ctx.font = "11px Consolas, monospace";
                    ctx.textAlign = "left";

                    // Dynamic Header Buffer: Don't let header take more than 30% of slot
                    const headerHeight = Math.min(16, slot_h * 0.3);
                    const bodyPadding = headerHeight + 5;
                    const maxBodyHeight = slot_h - bodyPadding - 5;

                    const text = String(data.content);
                    if (maxBodyHeight > 5) {
                        wrapText(ctx, text, x + 10, y + bodyPadding, slot_w - 20, 14, maxBodyHeight);
                    }

                    // Draw Border
                    ctx.strokeStyle = "#444";
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x + 2, y + 2, slot_w - 4, slot_h - 4);

                    // Draw Label / Index (Bottom overlay)
                    if (data.type === "image" || data.type === "image_list" || data.type === "empty") {
                        ctx.fillStyle = "rgba(0,0,0,0.5)";
                        ctx.fillRect(x + 2, y + slot_h - 18, 30, 16);
                        ctx.fillStyle = "#ddd";
                        ctx.font = "10px Arial";
                        ctx.textAlign = "left";
                        ctx.fillText(`#${i + 1}`, x + 5, y + slot_h - 6);
                    }
                }
            };
        }
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

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxHeight) {
    // Advanced wrap logic: Fit as much as possible, break words if needed
    // Split by newlines first to respect formatting
    const paragraphs = text.split("\n");
    let cursorY = y;
    const endY = y + maxHeight; // Clip limit

    ctx.textBaseline = "top";

    for (let p of paragraphs) {
        const words = p.split(" ");
        let line = "";

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + " ";
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;

            if (testWidth > maxWidth && n > 0) {
                // Line full, print it
                ctx.fillText(line, x, cursorY);
                line = words[n] + " ";
                cursorY += lineHeight;

                if (cursorY > endY) return; // Vertical Clip
            } else {
                line = testLine;
            }
        }
        // Print remaining line
        ctx.fillText(line, x, cursorY);
        cursorY += lineHeight;
        if (cursorY > endY) return;
    }
}

// --- LIGHTBOX OVERLAY (IMAGES) ---
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
        flexDirection: "column", userSelect: "none"
    });

    // Image Element
    const imgEl = document.createElement("img");
    Object.assign(imgEl.style, {
        maxWidth: "90%", maxHeight: "85%", borderRadius: "4px", boxShadow: "0 0 20px #000"
    });

    // Prevent drag ghost
    imgEl.ondragstart = () => false;

    // Update Logic
    const updateImage = () => {
        imgEl.src = images[currentIndex];
        infoEl.innerText = `${currentIndex + 1} / ${images.length}`;
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
        if (e.key === "ArrowLeft" && images.length > 1) prevBtn.click();
        if (e.key === "ArrowRight" && images.length > 1) nextBtn.click();
    };
    window.addEventListener("keydown", keyHandler);

    document.body.appendChild(overlay);
    updateImage();
}

// --- TEXT LIGHTBOX (INSPECTOR) ---
function createTextLightbox(content, type) {
    const textContent = typeof content === 'object' ? JSON.stringify(content, null, 2) : String(content);

    const id = "h4-text-inspector";
    let overlay = document.getElementById(id);
    if (overlay) document.body.removeChild(overlay);

    overlay = document.createElement("div");
    overlay.id = id;
    Object.assign(overlay.style, {
        position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
        backgroundColor: "rgba(0,0,0,0.85)", zIndex: 10000,
        display: "flex", justifyContent: "center", alignItems: "center",
        flexDirection: "column", backdropFilter: "blur(5px)"
    });

    // Main Window
    const windowDiv = document.createElement("div");
    Object.assign(windowDiv.style, {
        width: "80%", height: "80%",
        backgroundColor: "#1e1e1e",
        color: "#d4d4d4",
        borderRadius: "8px",
        boxShadow: "0 0 30px rgba(0,0,0,0.8)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
        border: "1px solid #444",
        fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace"
    });

    // Header
    const header = document.createElement("div");
    Object.assign(header.style, {
        padding: "10px 20px",
        backgroundColor: "#2d2d2d",
        borderBottom: "1px solid #444",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexShrink: 0
    });

    const title = document.createElement("span");
    title.innerHTML = `📝 Data Inspector <span style="color:#666; font-size:12px; margin-left:10px">Type: ${type}</span>`;
    title.style.fontWeight = "bold";

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "CLOSE (ESC)";
    Object.assign(closeBtn.style, {
        background: "transparent", border: "1px solid #555", color: "#888",
        padding: "4px 10px", borderRadius: "4px", cursor: "pointer"
    });
    closeBtn.onclick = () => document.body.removeChild(overlay);
    closeBtn.onmouseover = () => { closeBtn.style.borderColor = "#fff"; closeBtn.style.color = "#fff"; };
    closeBtn.onmouseout = () => { closeBtn.style.borderColor = "#555"; closeBtn.style.color = "#888"; };

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Content Area (Scrollable)
    const contentArea = document.createElement("pre");
    contentArea.textContent = textContent;
    Object.assign(contentArea.style, {
        flexGrow: 1,
        padding: "20px",
        margin: 0,
        overflow: "auto",
        whiteSpace: "pre-wrap", // or 'pre' for scrolling horizontal? Let's use pre-wrap for reading
        wordBreak: "break-all",
        fontSize: "14px",
        lineHeight: "1.5"
    });

    // Copy to Clipboard Footer
    const footer = document.createElement("div");
    Object.assign(footer.style, {
        padding: "10px", backgroundColor: "#252526",
        borderTop: "1px solid #333", display: "flex", justifyContent: "flex-end"
    });

    const copyBtn = document.createElement("button");
    copyBtn.textContent = "📋 Copy to Clipboard";
    Object.assign(copyBtn.style, {
        backgroundColor: "#0e639c", color: "white", border: "none",
        padding: "6px 12px", borderRadius: "2px", cursor: "pointer", fontWeight: "bold"
    });

    copyBtn.onclick = () => {
        navigator.clipboard.writeText(textContent).then(() => {
            copyBtn.textContent = "✅ Copied!";
            setTimeout(() => copyBtn.textContent = "📋 Copy to Clipboard", 2000);
        });
    };

    footer.appendChild(copyBtn);

    windowDiv.appendChild(header);
    windowDiv.appendChild(contentArea);
    windowDiv.appendChild(footer);
    overlay.appendChild(windowDiv);

    // Close on click outside
    overlay.onclick = (e) => {
        if (e.target === overlay) document.body.removeChild(overlay);
    };

    // ESC to close
    const keyHandler = (e) => {
        if (!document.getElementById(id)) {
            window.removeEventListener("keydown", keyHandler);
            return;
        }
        if (e.key === "Escape") document.body.removeChild(overlay);
    };
    window.addEventListener("keydown", keyHandler);

    document.body.appendChild(overlay);
}
