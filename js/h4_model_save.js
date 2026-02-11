import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "h4.ModelSave",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "H4_ModelSave") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                onNodeCreated?.apply(this, arguments);
                const node = this;

                // Helper to get widget by name
                const getWidget = (name) => node.widgets ? node.widgets.find((w) => w.name === name) : null;

                // 1. Hide the giant text box from the node face
                const metaWidget = getWidget("custom_metadata");
                if (metaWidget) {
                    // Hide aggressively
                    metaWidget.type = "HIDDEN_BY_H4";
                    metaWidget.computeSize = () => [0, -4];
                    metaWidget.visible = false;
                }

                // 2. Add "Metadata" Toggle Button
                // We add it as a button widget
                let isDrawerOpen = false;

                const btn = node.addWidget("button", "Metadata", "Open Metadata", () => {
                    toggleDrawer();
                });

                // 3. Drawer Logic
                let drawer = null;

                const createDrawer = () => {
                    drawer = document.createElement("div");
                    drawer.id = `h4-save-drawer-${node.id}`;

                    // Style: Slide up from bottom
                    Object.assign(drawer.style, {
                        position: "absolute",
                        width: "300px",  // Slightly wider than node usually
                        height: "200px",
                        backgroundColor: "#1e1e1e",
                        border: "1px solid #444",
                        borderTop: "3px solid #00ff00", // Green Line
                        borderRadius: "8px 8px 0 0",
                        padding: "10px",
                        display: "none",
                        flexDirection: "column",
                        gap: "10px",
                        zIndex: "1", // Above node, below console
                        boxShadow: "0 -5px 20px rgba(0,0,0,0.5)",
                        fontFamily: "monospace",
                        color: "#ddd",
                        fontSize: "12px",
                        overflow: "hidden",
                        transition: "all 0.2s ease-out",
                        opacity: "0",
                        transform: "translateY(20px)"
                    });

                    // Header
                    const header = document.createElement("div");
                    header.innerHTML = "📝 <b>METADATA INJECTOR</b>";
                    header.style.textAlign = "center";
                    header.style.color = "#00ff00";
                    header.style.borderBottom = "1px solid #333";
                    header.style.paddingBottom = "5px";
                    drawer.appendChild(header);

                    // Text Area
                    const ta = document.createElement("textarea");
                    ta.placeholder = "// Enter JSON or text here...\n{\n  \"Author\": \"h4\",\n  \"Version\": \"1.0\"\n}";
                    Object.assign(ta.style, {
                        flex: "1",
                        width: "100%",
                        backgroundColor: "#111",
                        color: "#00ff00", // Terminal Green
                        border: "1px solid #333",
                        borderRadius: "4px",
                        padding: "5px",
                        resize: "none",
                        outline: "none",
                        fontFamily: "monospace"
                    });

                    // Sync inputs
                    if (metaWidget) ta.value = metaWidget.value;

                    ta.addEventListener("input", (e) => {
                        if (metaWidget) metaWidget.value = e.target.value;
                    });

                    drawer.appendChild(ta);
                    document.body.appendChild(drawer);
                };

                const updateDrawerPos = () => {
                    if (!drawer) return;
                    if (!isDrawerOpen) return;

                    const rect = node.getBounding();
                    const scale = app.canvas.ds.scale;
                    const offset = app.canvas.ds.offset;

                    // Position at BOTTOM of node, centered
                    const w = 300 * scale;
                    const h = 200 * scale;

                    // Center x relative to node center
                    const nodeCenterX = (rect[0] + rect[2] / 2 + offset[0]) * scale;
                    const x = nodeCenterX - (w / 2);

                    // Y: Bottom of node
                    const y = (rect[1] + rect[3] + offset[1]) * scale;

                    drawer.style.left = `${x}px`;
                    drawer.style.top = `${y}px`;
                    drawer.style.width = `${300 * scale}px`;
                    drawer.style.height = `${200 * scale}px`;

                    // Scale contents internally? No, standard DOM scaling usually messy.
                    // Let's just use transform scale
                    drawer.style.transformOrigin = "top center";
                    drawer.style.transform = `scale(${1})`; // Reset transform, rely on width/height px

                    // Actually, simpler to just use CSS transform scale to match canvas zoom?
                    // But that blurs text. Let's keep px sizing logic if possible.
                    // For now, simple px sizing.
                };

                const toggleDrawer = () => {
                    if (!drawer) createDrawer();

                    isDrawerOpen = !isDrawerOpen;

                    if (isDrawerOpen) {
                        drawer.style.display = "flex";
                        // Animate In
                        requestAnimationFrame(() => {
                            drawer.style.opacity = "1";
                            drawer.style.transform = "translateY(0)";
                            updateDrawerPos();
                        });

                        btn.name = "METADATA (OPEN)";
                        // Force redraw to show "Green" state (handled in onDrawForeground)
                        node.setDirtyCanvas(true, true);

                    } else {
                        // Animate Out
                        drawer.style.opacity = "0";
                        drawer.style.transform = "translateY(20px)";
                        setTimeout(() => {
                            drawer.style.display = "none";
                        }, 200);

                        btn.name = "Metadata";
                        node.setDirtyCanvas(true, true);
                    }
                };

                // Remove drawer on node delete
                const onRemoved = node.onRemoved;
                node.onRemoved = function () {
                    if (drawer) drawer.remove();
                    if (onRemoved) onRemoved.apply(this, arguments);
                }

                // Update Pos on Draw
                const onDrawForeground = node.onDrawForeground;
                node.onDrawForeground = function (ctx) {
                    if (onDrawForeground) onDrawForeground.apply(this, arguments);

                    if (isDrawerOpen) {
                        // Draw GREEN GLOW on bottom edge
                        ctx.save();
                        ctx.shadowColor = "#00ff00";
                        ctx.shadowBlur = 15;
                        ctx.strokeStyle = "#00ff00";
                        ctx.lineWidth = 4;

                        ctx.beginPath();
                        ctx.moveTo(10, node.size[1]);
                        ctx.lineTo(node.size[0] - 10, node.size[1]);
                        ctx.stroke();
                        ctx.restore();

                        updateDrawerPos();
                    }
                };
            };
        }
    }
});
