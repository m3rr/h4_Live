import { app } from "/scripts/app.js";

// --- Tooltips Dictionary (The "Casual - Verbose" Guide) ---
const TOOLTIPS = {
    "IN": "Inputs (Input Blocks): These control the initial structure and composition. 0 is the layout, 11 is getting closer to the core details.",
    "MID": "Middle Block: The heart of the model. Defines the core identity and coherence.",
    "OUT": "Outputs (Output Blocks): These control the rendering, textures, and final style. 0 is deep structure, 11 is fine surface details.",
    "w": "Global Weight: The master volume knob for this model.",
    "interp": "Interpolation Mode: The recipe used to blend the models.",
    "mem": "Memory Manager: Smart loading to prevent crashes.",
};

app.registerExtension({
    name: "h4.ModelMerger",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "H4_ModelMerger") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                onNodeCreated?.apply(this, arguments);

                const node = this;

                // --- Helper: Widget Management ---
                const getWidget = (name) => node.widgets ? node.widgets.find((w) => w.name === name) : null;

                const setWidgetVisible = (name, visible) => {
                    const widget = getWidget(name);
                    if (!widget) return;

                    if (visible) {
                        if (widget.h4_hidden) {
                            widget.type = widget.h4_origType;
                            widget.computeSize = widget.h4_origComputeSize;
                            delete widget.h4_hidden;
                        }
                    } else {
                        // Force hide if not hidden, even if we think it is (handling external resets)
                        if (!widget.h4_hidden || widget.type !== "hidden") {
                            if (!widget.h4_hidden) {
                                widget.h4_origType = widget.type;
                                widget.h4_origComputeSize = widget.computeSize;
                                widget.h4_hidden = true;
                            }
                            widget.type = "hidden";
                            widget.computeSize = () => [0, -4];
                        }
                    }
                };

                // --- Drawer Logic ---
                let drawer = null;

                const createDrawer = () => {
                    const existing = document.getElementById(`h4-drawer-${node.id}`);
                    if (existing) existing.remove();

                    drawer = document.createElement("div");
                    drawer.id = `h4-drawer-${node.id}`;

                    // Style: Slide-out from LEFT
                    Object.assign(drawer.style, {
                        position: "absolute",
                        width: "300px",
                        height: "auto",
                        maxHeight: "90vh",
                        overflowY: "auto",
                        backgroundColor: "#1e1e1e",
                        border: "1px solid #444",
                        borderRight: "2px solid #00ff00",
                        borderRadius: "0 10px 10px 0",
                        padding: "10px",
                        paddingBottom: "100px",
                        display: "none",
                        flexDirection: "column",
                        gap: "10px",
                        zIndex: "100",
                        boxShadow: "5px 5px 20px rgba(0,0,0,0.8)",
                        color: "#eee",
                        color: "#eee",
                        fontFamily: "monospace",
                        fontSize: "12px",
                        transition: "opacity 0.2s ease", // No transform transition
                        transform: "translateX(-100%)",
                        opacity: "0",
                        scrollbarWidth: "thin",
                        pointerEvents: "auto",
                    });

                    // --- Header ---
                    const header = document.createElement("div");
                    header.innerHTML = "🧪 <b>MAD SCIENCE LAB</b> <span style='font-size:10px; color:#666'>v.Nuclear</span>";
                    header.style.borderBottom = "1px solid #00ff00";
                    header.style.paddingBottom = "5px";
                    header.style.marginBottom = "5px";
                    header.style.textAlign = "center";
                    header.title = "Welcome to the Lab! Here you can surgically graft model parts together.";
                    drawer.appendChild(header);

                    // --- Section: Global Settings (Mem / Interp) ---
                    const globals = document.createElement("div");
                    globals.style.display = "flex";
                    globals.style.flexDirection = "column";
                    globals.style.gap = "8px";
                    globals.style.backgroundColor = "#2a2a2a";
                    globals.style.padding = "8px";
                    globals.style.borderRadius = "5px";
                    globals.style.flexShrink = "0"; // Prevent crushing

                    // Interpolation
                    const interpWidget = getWidget("interpolation_mode");
                    if (interpWidget) {
                        const row = document.createElement("div");
                        const label = document.createElement("div");
                        label.innerText = "Mode:";
                        label.title = TOOLTIPS["interp"];

                        const select = document.createElement("select");
                        Object.assign(select.style, { width: "100%", background: "#111", color: "#ddd", border: "1px solid #444" });

                        // Populate options safely
                        const opts = interpWidget.options?.values || ["Weighted Average", "Add Difference", "Subtract", "Add"];
                        opts.forEach(opt => {
                            const o = document.createElement("option");
                            o.value = opt;
                            o.text = opt;
                            o.selected = interpWidget.value === opt;
                            select.appendChild(o);
                        });
                        select.onchange = (e) => {
                            interpWidget.value = e.target.value;
                            if (interpWidget.callback) interpWidget.callback(interpWidget.value);
                        };

                        row.appendChild(label);
                        row.appendChild(select);
                        globals.appendChild(row);
                    }

                    // Memory Manager Sync
                    const memWidget = getWidget("memory_manager");
                    if (memWidget) {
                        const row = document.createElement("div");
                        row.style.display = "flex";
                        row.style.justifyContent = "space-between";
                        row.style.alignItems = "center";
                        row.title = TOOLTIPS["mem"];

                        const label = document.createElement("span");
                        label.innerText = "Memory Guard";

                        const chk = document.createElement("input");
                        chk.type = "checkbox";
                        chk.checked = memWidget.value;
                        chk.onchange = (e) => {
                            memWidget.value = e.target.checked;
                            if (memWidget.callback) memWidget.callback(memWidget.value);
                        };

                        row.appendChild(label);
                        row.appendChild(chk);
                        globals.appendChild(row);
                    }

                    drawer.appendChild(globals);

                    // --- Section: Per-Model Weights ---
                    const count = getWidget("model_count")?.value || 3;

                    for (let i = 1; i <= 3; i++) {
                        // We create the DOM elements for ALL 3 models, but only display active ones
                        // This prevents reconstruction lag

                        const modelGroup = document.createElement("div");
                        modelGroup.id = `h4-drawer-m${i}-${node.id}`;
                        Object.assign(modelGroup.style, {
                            border: "1px solid #444",
                            borderRadius: "5px",
                            overflow: "hidden",
                            flexShrink: "0",
                            display: i <= count ? "block" : "none" // Initial Visibility
                        });

                        // Accordion Header
                        const mHead = document.createElement("div");
                        mHead.innerText = `🧬 Model ${i} Structure`;
                        mHead.style.backgroundColor = "#333";
                        mHead.style.padding = "8px";
                        mHead.style.cursor = "pointer";
                        mHead.style.fontWeight = "bold";
                        mHead.style.display = "flex";
                        mHead.style.justifyContent = "space-between";
                        mHead.title = `Click to expand the surgical tools for Model ${i}.`;

                        // Current Global Weight Display in Header
                        const wVal = getWidget(`w_${i}`)?.value || 1.0;
                        const wDisp = document.createElement("span");
                        wDisp.innerText = `[${wVal.toFixed(2)}]`;
                        wDisp.style.color = "#00ff00";
                        mHead.appendChild(wDisp);

                        // Content (Hidden by default)
                        const mContent = document.createElement("div");
                        mContent.style.display = "none";
                        mContent.style.padding = "8px";
                        mContent.style.backgroundColor = "#222";
                        mContent.style.flexDirection = "column";
                        mContent.style.gap = "4px";

                        mHead.onclick = () => {
                            const hidden = mContent.style.display === "none";
                            mContent.style.display = hidden ? "flex" : "none";
                            mHead.style.backgroundColor = hidden ? "#444" : "#333";
                        };

                        // Helper to make a slider row
                        const makeSlider = (id, name, tooltip, isGlobal = false) => {
                            const w = getWidget(id);
                            if (!w) return null;

                            const row = document.createElement("div");
                            row.style.display = "flex";
                            row.style.alignItems = "center";
                            row.style.gap = "5px";
                            row.title = tooltip;

                            const lbl = document.createElement("span");
                            lbl.innerText = name;
                            lbl.style.width = "50px";
                            lbl.style.fontSize = "10px";
                            if (isGlobal) lbl.style.color = "#00ff00";

                            const sl = document.createElement("input");
                            sl.type = "range";
                            sl.min = "0.0";
                            sl.max = "1.0";
                            sl.step = "0.01";
                            sl.value = w.value;
                            sl.style.flex = "1";
                            if (isGlobal) sl.style.height = "5px"; // Thicker?

                            const val = document.createElement("span");
                            val.innerText = w.value.toFixed(2);
                            val.style.width = "30px";
                            val.style.fontSize = "10px";
                            val.style.textAlign = "right";

                            sl.oninput = (e) => {
                                const v = parseFloat(e.target.value);
                                w.value = v;
                                val.innerText = v.toFixed(2);
                                if (isGlobal) wDisp.innerText = `[${v.toFixed(2)}]`;
                                node.setDirtyCanvas(true, true);
                            };

                            row.appendChild(lbl);
                            row.appendChild(sl);
                            row.appendChild(val);
                            return row;
                        };

                        // 1. Global Weight
                        const gRow = makeSlider(`w_${i}`, "MAIN", TOOLTIPS["w"], true);
                        if (gRow) mContent.appendChild(gRow);

                        mContent.appendChild(document.createElement("hr"));

                        // 2. Blocks
                        // Inputs
                        for (let b = 0; b < 12; b++) {
                            const s = makeSlider(`m${i}_in_${b.toString().padStart(2, '0')}`, `IN_${b}`, TOOLTIPS["IN"]);
                            if (s) mContent.appendChild(s);
                        }

                        // Mid
                        const mS = makeSlider(`m${i}_mid`, "MID", TOOLTIPS["MID"]);
                        if (mS) mContent.appendChild(mS);

                        // Outputs
                        for (let b = 0; b < 12; b++) {
                            const s = makeSlider(`m${i}_out_${b.toString().padStart(2, '0')}`, `OUT_${b}`, TOOLTIPS["OUT"]);
                            if (s) mContent.appendChild(s);
                        }

                        modelGroup.appendChild(mHead);
                        modelGroup.appendChild(mContent);
                        drawer.appendChild(modelGroup);
                    }

                    document.body.appendChild(drawer);
                };

                const updateDrawerPos = () => {
                    if (!drawer) return;
                    // Position: Absolute, relative to document body
                    const canvas = app.canvas;
                    const ds = canvas.ds;
                    const graphX = node.pos[0];
                    const graphY = node.pos[1];
                    const screenX = (graphX + ds.offset[0]) * ds.scale;
                    const screenY = (graphY + ds.offset[1]) * ds.scale;
                    // Drawer Width
                    const dW = 300;

                    // Fixed Size UI Calculation
                    // We want the drawer to be 300px wide on the SCREEN, regardless of zoom.
                    // But we want it attached to the LEFT side of the node.
                    // screenX is the left edge of the node in screen pixels.

                    const targetX = screenX - dW - 10;
                    const targetY = screenY;

                    drawer.style.left = `${targetX}px`;
                    drawer.style.top = `${targetY}px`;
                    // Transform handled in onDrawForeground for frame-sync
                    drawer.style.transformOrigin = "top right";
                };

                // --- MAIN VISIBILITY & LAYOUT LOGIC (Grand Unified Loop) ---
                // Runs every frame to enforce state against external interference.
                const onDrawForeground = node.onDrawForeground;
                node.onDrawForeground = function (ctx) {
                    if (onDrawForeground) onDrawForeground.apply(this, arguments);

                    if (!this.widgets) return;

                    try {
                        // 1. Get State
                        const count = getWidget("model_count")?.value || 2;
                        const testing = getWidget("testing_mode")?.value || false;
                        const settings = getWidget("settings")?.value || false;

                        // 2. Define Policies
                        const shouldShow = (w) => {
                            if (w.name === "model_count" || w.name === "settings" || w.name === "testing_mode") return true;

                            // Checkpoints (ckpt_1...4)
                            if (w.name.startsWith("ckpt_")) {
                                const idx = parseInt(w.name.split("_")[1]);
                                return idx <= count;
                            }

                            // Testing (test_...)
                            if (w.name.startsWith("test_")) {
                                return testing;
                            }

                            // Mad Science (mX_..., w_..., memory_manager, interpolation_mode)
                            const msRegex = /^(w_\d|m\d_(in|out|mid)(_\d+)?)$/;
                            const msExtras = ["memory_manager", "interpolation_mode"];
                            if (msRegex.test(w.name) || msExtras.includes(w.name)) {
                                return false;
                            }

                            return true;
                        };

                        // 3. Enforce
                        // Iterate backwards for safety
                        for (let i = this.widgets.length - 1; i >= 0; i--) {
                            const w = this.widgets[i];
                            const show = shouldShow(w);

                            if (show) {
                                // WIDGET SHOULD BE VISIBLE
                                // If currently hidden (by H4), restore it.
                                if (w.type === "HIDDEN_BY_H4" || w.h4_hidden) {
                                    // Use stored type, or fallback to sensible defaults based on name
                                    // (Just in case origType was lost or corrupted)
                                    let restoreType = w.h4_origType;
                                    if (!restoreType || restoreType === "HIDDEN_BY_H4" || restoreType === "hidden") {
                                        // Smart fallback for restoration failure
                                        if (w.name.startsWith("ckpt_")) restoreType = "pysssss.combo"; // Checkpoints are combos?
                                        else if (w.name.startsWith("test_")) {
                                            if (w.name.includes("seed")) restoreType = "number";
                                            else if (w.name.includes("steps")) restoreType = "number";
                                            else if (w.name.includes("cfg")) restoreType = "number";
                                            else if (w.name.includes("prompt")) restoreType = "text";
                                            else restoreType = "combo"; // sampler/scheduler
                                        }
                                        else restoreType = "number"; // Default (sliders)
                                    }

                                    w.type = restoreType;
                                    if (w.h4_origComputeSize) w.computeSize = w.h4_origComputeSize;
                                    else w.computeSize = null; // Let LiteGraph recalculate

                                    w.visible = true;
                                    w.hidden = false;
                                    delete w.h4_hidden;
                                }
                            } else {
                                // WIDGET SHOULD BE HIDDEN
                                // Capture original type ONLY if it's currently valid (not hidden)
                                if (w.type !== "HIDDEN_BY_H4" && w.type !== "hidden") {
                                    w.h4_origType = w.type;
                                    w.h4_origComputeSize = w.computeSize;
                                }

                                // Force hide deeply
                                if (w.type !== "HIDDEN_BY_H4") {
                                    w.h4_hidden = true;
                                    w.type = "HIDDEN_BY_H4";
                                    w.computeSize = () => [0, -4];
                                    w.visible = false;
                                    w.hidden = true;
                                }
                            }
                        }

                        // 4. Drawer Logic (Visuals)
                        if (settings) {
                            if (!drawer) createDrawer();
                            if (drawer.style.display !== "flex") drawer.style.display = "flex";

                            // Dynamic Drawer Content Update
                            for (let i = 1; i <= 3; i++) {
                                const el = document.getElementById(`h4-drawer-m${i}-${node.id}`);
                                if (el) {
                                    el.style.display = i <= count ? "block" : "none";
                                }
                            }

                            updateDrawerPos();
                            drawer.style.opacity = "1";
                            drawer.style.transform = `translateX(0) scale(${app.canvas.ds.scale * 0.75})`;
                        } else {
                            if (drawer && drawer.style.display !== "none") {
                                drawer.style.display = "none";
                            }
                        }

                    } catch (e) {
                        // Log error once to console but suppress crash
                        if (!node.h4_error_logged) {
                            console.error("H4 Merger UI Error:", e);
                            node.h4_error_logged = true;
                        }
                    }
                };

                // Remove old updateLayout logic to prevent conflict
                const updateLayout = () => {
                    // No-op or just pure resizing/input slot logic
                    node.onResize?.(node.size);
                    updateInputSlots();
                };

                // --- Dynamic Input Slot Logic (Progressive Disclosure) ---
                node.h4_input_defs = null;

                const updateInputSlots = () => {
                    if (!node.h4_input_defs) {
                        node.h4_input_defs = node.inputs.map(i => ({ ...i }));
                    }

                    const count = getWidget("model_count")?.value || 2;
                    const newInputs = [];

                    node.h4_input_defs.forEach((def) => {
                        const liveInput = node.inputs.find(i => i.name === def.name);
                        const isConnected = liveInput && liveInput.link !== null;
                        let shouldShow = false;

                        if (def.name.includes("override")) {
                            const parts = def.name.split("_");
                            const type = parts[0];
                            const idx = parseInt(parts[2]);

                            if (idx <= count) {
                                if (type === "model") {
                                    shouldShow = true;
                                } else {
                                    const mName = `model_override_${idx}`;
                                    // Check link status of the model override for this slot
                                    // We need to check the LIVE inputs for this
                                    const mInput = node.inputs.find(i => i.name === mName);
                                    if (mInput && mInput.link !== null) {
                                        shouldShow = true;
                                    } else if (isConnected) {
                                        shouldShow = true; // Don't hide if self is connected
                                    }
                                }
                            } else {
                                if (isConnected) shouldShow = true;
                            }
                        } else {
                            shouldShow = true;
                        }

                        if (shouldShow) {
                            if (liveInput) {
                                newInputs.push(liveInput);
                            } else {
                                newInputs.push({ ...def, link: null });
                            }
                        }
                    });

                    // Only update if changed to avoid graph thrashing
                    if (newInputs.length !== node.inputs.length) {
                        node.inputs = newInputs;
                        node.setDirtyCanvas(true);
                    }
                };

                // --- DEPRECATED: Old updateLayout removed to fix redeclaration error ---
                // onDrawForeground now handles all visibility logic.

                // Cleanup
                const onRemoved = node.onRemoved;
                node.onRemoved = function () {
                    if (onRemoved) onRemoved.apply(this, arguments);
                    if (drawer) drawer.remove();
                }

                // Callbacks
                const triggerWidgets = ["model_count", "testing_mode", "settings"];
                triggerWidgets.forEach(name => {
                    const w = getWidget(name);
                    if (w) w.callback = updateLayout;
                });

                // Connection Change Listener
                const onConnectionsChange = node.onConnectionsChange;
                node.onConnectionsChange = function () {
                    if (onConnectionsChange) onConnectionsChange.apply(this, arguments);
                    setTimeout(updateInputSlots, 20);
                };

                // --- ROBUST INITIALIZATION ---
                // --- ROBUST INITIALIZATION & JANITOR ---
                const enforceLayout = () => {
                    const hasFirst = node.widgets && node.widgets.find(w => w.name === "m1_in_00");
                    const hasLast = node.widgets && node.widgets.find(w => w.name === "m3_out_11");

                    if (hasFirst && hasLast) {
                        // 0. Capture
                        if (!node.h4_input_defs && node.inputs) {
                            node.h4_input_defs = node.inputs.map(i => ({ ...i }));
                        }

                        // 1. Force Hide (Nuclear Regex Option)
                        if (node.widgets) {
                            const regex = /^(w_\d|m\d_(in|out|mid)(_\d+)?)$/;
                            const extras = ["memory_manager", "interpolation_mode"];

                            node.widgets.forEach(w => {
                                if (regex.test(w.name) || extras.includes(w.name)) {
                                    w.type = "hidden";
                                    w.h4_hidden = true;
                                    w.computeSize = () => [0, -4];
                                }
                            });
                        }

                        // 2. Force Size
                        if (!node.size || node.size[1] > 300) {
                            node.setSize([320, 220]);
                        }

                        updateLayout();

                        triggerWidgets.forEach(name => {
                            const w = getWidget(name);
                            if (w && !w.callback) w.callback = updateLayout;
                        });
                        return true;
                    }
                    return false;
                };

                const waitForWidgets = (attempts = 0) => {
                    if (enforceLayout()) {
                        // Success! Now run the Janitor to keep it clean during load/transition
                        let janitorCycles = 0;
                        const janitor = setInterval(() => {
                            enforceLayout();
                            janitorCycles++;
                            if (janitorCycles > 20) clearInterval(janitor);
                        }, 100);
                    } else {
                        if (attempts < 50) {
                            setTimeout(() => waitForWidgets(attempts + 1), 100);
                        }
                    }
                };

                waitForWidgets();

                const onConfigure = node.onConfigure;
                node.onConfigure = function () {
                    if (onConfigure) onConfigure.apply(this, arguments);
                    // Instant hide attempt to prevent flicker
                    if (node.widgets) {
                        const regex = /^(w_\d|m\d_(in|out|mid)(_\d+)?)$/;
                        const extras = ["memory_manager", "interpolation_mode"];
                        node.widgets.forEach(w => {
                            if (regex.test(w.name) || extras.includes(w.name)) {
                                w.type = "HIDDEN_BY_H4";
                                w.computeSize = () => [0, -4];
                                w.visible = false;
                                w.hidden = true;
                            }
                        });
                    }
                    waitForWidgets();
                };
            };
        }
    },
});
