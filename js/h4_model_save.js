import { app } from "/scripts/app.js";

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
                // ComfyUI multiline STRING widgets create a real DOM <textarea> (inputEl)
                // that floats over the canvas. We must hide THAT element, not just the widget slot.
                // IMPORTANT: We keep the widget in node.widgets so ComfyUI serializes its value
                // automatically. We only hide it visually.
                const metaWidget = getWidget("custom_metadata");
                if (metaWidget) {
                    // A) Allocate zero space in the node layout
                    metaWidget.computeSize = () => [0, -4];
                    metaWidget.type = "converted-widget"; // Standard ComfyUI convention for hidden widgets

                    // B) Override draw to prevent canvas-level rendering AND lazily hide DOM textarea
                    // The inputEl may not exist at onNodeCreated time (ComfyUI creates it lazily),
                    // so we check and hide it on the first draw call where it exists.
                    metaWidget.draw = function (ctx, node, widgetWidth, y, widgetHeight) {
                        // Hide the floating DOM textarea whenever it becomes available
                        if (this.inputEl) {
                            this.inputEl.style.display = "none";
                            this.inputEl.style.opacity = "0";
                            this.inputEl.style.height = "0px";
                            this.inputEl.style.overflow = "hidden";
                            this.inputEl.style.pointerEvents = "none";
                        }
                        // Draw nothing on canvas
                    };
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
                        zIndex: "100", // Above node, below console
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

                    // Get the canvas DOM element's bounding rect for accurate screen-space conversion
                    const canvasEl = app.canvas.canvas;
                    const canvasRect = canvasEl.getBoundingClientRect();
                    const scale = app.canvas.ds.scale;
                    const offset = app.canvas.ds.offset;

                    // Node bounding returns [x, y, width, height] in graph space
                    const nRect = node.getBounding();
                    const nodeGraphX = node.pos[0];
                    const nodeGraphY = node.pos[1];
                    const nodeW = node.size[0];
                    const nodeH = node.size[1];

                    // Convert graph-space coordinates to screen-space (pixels on DOM)
                    const screenX = canvasRect.left + (nodeGraphX + offset[0]) * scale;
                    const screenY = canvasRect.top + (nodeGraphY + offset[1]) * scale;
                    const screenW = nodeW * scale;
                    const screenH = nodeH * scale;

                    // Position drawer below the node with a 5px gap
                    const drawerW = Math.max(screenW, 300 * scale);
                    const drawerH = 200 * scale;

                    // Center horizontally under the node
                    const x = screenX + (screenW / 2) - (drawerW / 2);
                    const y = screenY + screenH + 5; // 5px below node bottom edge

                    drawer.style.left = `${x}px`;
                    drawer.style.top = `${y}px`;
                    drawer.style.width = `${drawerW}px`;
                    drawer.style.height = `${drawerH}px`;
                    drawer.style.transformOrigin = "top center";
                    drawer.style.transform = isDrawerOpen ? "translateY(0)" : "translateY(20px)";
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
