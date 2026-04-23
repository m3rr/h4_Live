import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

/*
    h4 - Pythonipulator-inator (Sovereign Pixel Kernel v1.0.0)
    ---------------------------------------------------------
    - SLEEK MINIMALISM: Ultra-thin node footprint with vertical tactical toggles.
    - DYNAMIC DISCOVERY: Auto-maps effect modules to kinetic switch controls.
    - INVISIBLE VITALITY: Backend widgets are fully suppressed but structurally active.
    - H4 SIGNATURE: Hex-accurate Off-Black (#0c0c0c) and Tactical Cyan (#00f2ff).
*/

const COLORS = {
    bg: "#0c0c0c",
    panel: "rgba(12, 12, 12, 0.95)",
    accent: "#00f2ff",
    accentSoft: "rgba(0, 242, 255, 0.15)",
    text: "#ffffff",
    dim: "#666666",
    border: "#222222",
    toggleOn: "#00f2ff",
    toggleOff: "#333333"
};

const NODE_WIDTH = 240;
const MODULE_H = 34;
const ANIM_SPEED = 0.2;

// --- UTILS ---
function cloakWidget(w) {
    if (!w) return;
    if (!w._h4_name) w._h4_name = w.name;
    w.name = ""; // Purge name to stop native label drawing
    w.hidden = true;
    w.type = "converted-widget";
    w.draw = () => { };
    w.computeSize = () => [0, -10];
    if (w.inputEl) w.inputEl.style.display = "none";
}

const activeNodes = new Set();

class PythonipulatorUI {
    constructor(node) {
        this.node = node;
        this.modules = [
            { id: "cb", label: "CYBERPUNK" },
            { id: "geo", label: "GEOMETRIC" },
            { id: "clr", label: "COLOR" },
            { id: "blur", label: "BLUR" },
            { id: "sty", label: "STYLISTIC" },
            { id: "noise", label: "NOISE" },
            { id: "edge", label: "EDGE" }
        ];
        // Expanded states
        this.expanded = {};
    }

    toggleModule(id) {
        const w = this.node.widgets.find(x => x._h4_name === `${id}_enabled`);
        if (w) {
            w.value = !w.value;
            this.node.setDirtyCanvas(true);
        }
    }

    isModuleEnabled(id) {
        const w = this.node.widgets.find(x => x._h4_name === `${id}_enabled`);
        return w ? !!w.value : false;
    }
}

// Global Animation Loop for DOM Sync
function kineticLoop() {
    activeNodes.forEach(ui => {
    });
    requestAnimationFrame(kineticLoop);
}
requestAnimationFrame(kineticLoop);

app.registerExtension({
    name: "h4.Pythonipulator_Inator",
    async beforeRegisterNodeDef(nodeType, nodeDef) {
        if (nodeDef.name !== "h4_pythonipulator_inator") return;

        nodeType.prototype.onNodeCreated = function () {
            this.h4_ui = new PythonipulatorUI(this);
            activeNodes.add(this.h4_ui);

            // Initial size: Sleek and vertical
            this.size = [NODE_WIDTH, 310];

            // Clean house: Hide all native widgets
            setTimeout(() => {
                if (this.widgets) {
                    this.widgets.forEach(w => cloakWidget(w));
                }
            }, 10);

            return this;
        };

        nodeType.prototype.onRemoved = function () {
            activeNodes.delete(this.h4_ui);
        };

        nodeType.prototype.onMouseDown = function (e, pos) {
            if (!this.h4_ui) return;
            const px = Math.floor(pos[0]); const py = Math.floor(pos[1]);

            // Hit detection for tactical toggles
            let currentY = 120;
            for (const mod of this.h4_ui.modules) {
                // Toggle hit area (Square checkbox area on left)
                if (px > 10 && px < 40 && py >= currentY && py < currentY + MODULE_H) {
                    this.h4_ui.toggleModule(mod.id);
                    return true;
                }
                // Expansion hit area (Label area)
                if (px > 40 && px < NODE_WIDTH - 10 && py >= currentY && py < currentY + MODULE_H) {
                    this.h4_ui.expanded[mod.id] = !this.h4_ui.expanded[mod.id];
                    this.setDirtyCanvas(true);
                    return true;
                }

                currentY += MODULE_H;
                if (this.h4_ui.expanded[mod.id]) {
                    const subWidgets = this.widgets.filter(w => w._h4_name && w._h4_name.startsWith(mod.id) && !w._h4_name.endsWith("_enabled"));
                    for (const w of subWidgets) {
                        // Slider / Interaction area
                        if (px > 20 && px < NODE_WIDTH - 20 && py >= currentY && py < currentY + 28) {
                            if (typeof w.value === "boolean") {
                                w.value = !w.value;
                            } else {
                                this._h4_active_w = w;
                                this._h4_is_dragging = true;
                                updateWidgetValue(w, px, NODE_WIDTH - 50);
                            }
                            this.setDirtyCanvas(true);
                            return true;
                        }
                        currentY += 28;
                    }
                    currentY += 10;
                }
            }

            // Operation Mode Toggle (Shifted to match header)
            if (py > 70 && py < 95) {
                const w = this.widgets.find(x => x._h4_name === "operation_mode");
                if (w) {
                    const idx = (w.options.values.indexOf(w.value) + 1) % w.options.values.length;
                    w.value = w.options.values[idx];
                    this.setDirtyCanvas(true);
                    return true;
                }
            }

            return false;
        };

        const updateWidgetValue = (w, px, barWidth) => {
            if (!w) return;
            const relX = Math.max(0, Math.min(1, (px - 25) / barWidth));
            if (typeof w.value === "number") {
                let min = w.options?.min ?? 0;
                let max = w.options?.max ?? 100;
                let step = w.options?.step ?? 0.01;
                let val = min + (max - min) * relX;
                w.value = Math.round(val / step) * step;
            } else if (w.options?.values) {
                const idx = Math.floor(relX * (w.options.values.length - 0.001));
                w.value = w.options.values[idx];
            }
        };

        nodeType.prototype.onMouseMove = function (e, pos) {
            if (this._h4_is_dragging && this._h4_active_w) {
                // Safe-guard: If mouse button is released, stop dragging
                if (e.buttons !== 1) {
                    this._h4_is_dragging = false;
                    this._h4_active_w = null;
                    return false;
                }
                updateWidgetValue(this._h4_active_w, pos[0], NODE_WIDTH - 50);
                this.setDirtyCanvas(true);
                return true;
            }
        };

        nodeType.prototype.onMouseUp = function () {
            this._h4_is_dragging = false;
            this._h4_active_w = null;
        };

        nodeType.prototype.onDrawForeground = function (ctx) {
            if (!this.h4_ui) return;
            const ui = this.h4_ui;

            // --- BLACK BOX TEST (Total Occlusion) ---
            ctx.save();
            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, this.size[0], this.size[1]);
            ctx.restore();

            // --- FORENSIC PURGE ---
            this.widgets.forEach(w => cloakWidget(w));
            this.imgs = null;
            this.images = null;

            // --- GEOMETRY DYNAMICS ---
            let targetH = 120;
            ui.modules.forEach(m => {
                targetH += MODULE_H;
                if (ui.expanded[m.id]) {
                    const count = this.widgets.filter(w => w._h4_name && w._h4_name.startsWith(m.id) && !w._h4_name.endsWith("_enabled")).length;
                    targetH += count * 28 + 10;
                }
            });
            this.size[1] = targetH + 20;

            ctx.save();
            // Reset context to prevent shadow/alpha leak
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1.0;

            // --- BACKGROUND & FRAME ---
            ctx.fillStyle = COLORS.bg;
            ctx.fillRect(0, 0, this.size[0], this.size[1]);
            ctx.strokeStyle = COLORS.border;
            ctx.lineWidth = 1;
            ctx.strokeRect(0, 0, this.size[0], this.size[1]);

            // --- HEADER ---
            ctx.fillStyle = COLORS.accent;
            ctx.font = "bold 12px monospace";
            ctx.textAlign = "left";
            ctx.fillText("PYTHONIPULATOR-INATOR", 15, 80);

            // --- GLOBAL MODE ---
            const modeW = this.widgets.find(x => x._h4_name === "operation_mode");
            if (modeW) {
                ctx.fillStyle = COLORS.dim;
                ctx.font = "9px monospace";
                ctx.fillText(`MODE: ${modeW.value.toUpperCase()}`, 15, 100);
            }

            // --- MODULE KILLER LIST ---
            let currentY = 120;
            ui.modules.forEach(mod => {
                const enabled = ui.isModuleEnabled(mod.id);
                const expanded = ui.expanded[mod.id];

                // 1. Module Row BG
                ctx.fillStyle = enabled ? COLORS.accentSoft : "rgba(30,30,30,0.2)";
                ctx.fillRect(10, currentY, this.size[0] - 20, MODULE_H - 4);

                // 2. Toggle Switch
                ctx.strokeStyle = enabled ? COLORS.accent : COLORS.dim;
                ctx.lineWidth = 1.5;
                ctx.strokeRect(18, currentY + 8, 14, 14);
                if (enabled) {
                    ctx.save();
                    ctx.fillStyle = COLORS.accent;
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = COLORS.accent;
                    ctx.fillRect(21, currentY + 11, 8, 8);
                    ctx.restore();
                }

                // 3. Module Label (Forensic X shift to 100)
                ctx.fillStyle = enabled ? "#fff" : COLORS.dim;
                ctx.font = "bold 11px monospace";
                ctx.textAlign = "left";
                ctx.fillText(mod.label, 100, Math.floor(currentY + 20));

                // 4. Expansion Chevron
                ctx.fillStyle = COLORS.dim;
                ctx.textAlign = "right";
                ctx.fillText(expanded ? "▼" : "▶", Math.floor(this.size[0] - 20), Math.floor(currentY + 20));

                currentY += MODULE_H;

                // 5. Expanded Parameters
                if (expanded) {
                    const subWidgets = this.widgets.filter(w => w.name.startsWith(mod.id) && !w.name.endsWith("_enabled"));
                    subWidgets.forEach(w => {
                        // Label
                        ctx.fillStyle = "#888";
                        ctx.font = "10px monospace";
                        ctx.textAlign = "left";
                        let shortName = w.name.split("_").slice(1).join("_").toUpperCase();
                        ctx.fillText(shortName, 25, Math.floor(currentY + 10));

                        const valWidth = this.size[0] - 50;

                        if (typeof w.value === "boolean") {
                            // --- BUTTON TOGGLE ---
                            ctx.fillStyle = w.value ? COLORS.accentSoft : "#151515";
                            ctx.fillRect(25, Math.floor(currentY + 14), valWidth, 11);
                            ctx.strokeStyle = w.value ? COLORS.accent : COLORS.dim;
                            ctx.lineWidth = 1;
                            ctx.strokeRect(25, Math.floor(currentY + 14), valWidth, 11);

                            ctx.fillStyle = w.value ? COLORS.accent : COLORS.dim;
                            ctx.font = "bold 9px monospace";
                            ctx.textAlign = "center";
                            ctx.fillText(w.value ? "ON" : "OFF", Math.floor(25 + valWidth / 2), Math.floor(currentY + 23));
                        } else {
                            // --- SLIDER ---
                            ctx.fillStyle = "#151515";
                            ctx.fillRect(25, Math.floor(currentY + 14), valWidth, 8);

                            if (typeof w.value === "number") {
                                let min = w.options?.min ?? 0;
                                let max = w.options?.max ?? 100;
                                let perc = (w.value - min) / (max - min);
                                ctx.fillStyle = enabled ? COLORS.accent : COLORS.dim;
                                ctx.fillRect(25, Math.floor(currentY + 14), Math.floor(valWidth * Math.max(0, Math.min(1, perc))), 8);

                                // Tactile value text
                                ctx.fillStyle = "#fff";
                                ctx.font = "9px monospace";
                                ctx.textAlign = "right";
                                ctx.fillText(String(w.value), Math.floor(this.size[0] - 25), Math.floor(currentY + 10));
                            } else {
                                // Text or Combo
                                ctx.fillStyle = enabled ? COLORS.accent : COLORS.dim;
                                ctx.font = "9px monospace";
                                ctx.textAlign = "right";
                                ctx.fillText(String(w.value), Math.floor(this.size[0] - 25), Math.floor(currentY + 10));
                            }
                        }

                        currentY += 28;
                    });
                    currentY += 10;
                }
            });
            ctx.restore();
        };
    },
});
