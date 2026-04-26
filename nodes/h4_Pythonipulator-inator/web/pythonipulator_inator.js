import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

/*
    h4 - Pythonipulator-inator (Sovereign Pixel Kernel v1.2.2)
    ---------------------------------------------------------
    - FIXED: Node name mapping synchronization for absolute registry alignment.
    - REFACTORED: Interaction kernel corrected to prevent reference collisions.
    - MODULARITY: Decoupled web assets for standalone shelf deployment.
    - TACTILE HUD: 3D beveled buttons and recessed slider channels.
*/

const COLORS = {
    bg: "#0c0c0c",
    accent: "#00f2ff",
    accentSoft: "rgba(0, 242, 255, 0.12)",
    dim: "#555555",
    border: "#222222",
    btnBg: "#121212",
    btnLit: "rgba(0, 242, 255, 0.25)"
};

const NODE_WIDTH = 220;
const MODULE_H = 36;

function cloakWidget(w) {
    if (!w) return;
    if (w.hidden === true && w.computeSize?.() && w.computeSize()[1] <= -4) return;

    w.hidden = true;
    w.draw = () => { };
    w.computeSize = () => [0, -4];
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
        this.expanded = {};
    }

    toggleModule(id) {
        const w = this.node.widgets.find(x => x.name === `${id}_enabled`);
        if (w) {
            w.value = !w.value;
            this.node.setDirtyCanvas(true);
        }
    }

    isModuleEnabled(id) {
        const w = this.node.widgets.find(x => x.name === `${id}_enabled`);
        return w ? !!w.value : false;
    }
}

app.registerExtension({
    name: "h4.Pythonipulator_Inator",
    async beforeRegisterNodeDef(nodeType, nodeDef) {
        if (nodeDef.name !== "H4_Pythonipulator-inator") return;

        nodeType.prototype.onNodeCreated = function () {
            this.h4_ui = new PythonipulatorUI(this);
            activeNodes.add(this.h4_ui);
            this.size = [NODE_WIDTH, 360];

            // Initial widget purge
            setTimeout(() => {
                if (this.widgets) this.widgets.forEach(w => cloakWidget(w));
            }, 50);

            return this;
        };

        nodeType.prototype.onRemoved = function () {
            activeNodes.delete(this.h4_ui);
        };

        nodeType.prototype.onMouseDown = function (e, pos) {
            if (!this.h4_ui) return;
            const px = Math.floor(pos[0]); const py = Math.floor(pos[1]);

            let currentY = 120;
            for (const mod of this.h4_ui.modules) {
                // Category Row Hit
                if (px > 10 && px < NODE_WIDTH - 10 && py >= currentY && py < currentY + MODULE_H) {
                    if (px < 45) {
                        this.h4_ui.toggleModule(mod.id);
                    } else {
                        this.h4_ui.expanded[mod.id] = !this.h4_ui.expanded[mod.id];
                    }
                    this.setDirtyCanvas(true);
                    return true;
                }

                currentY += MODULE_H;
                if (this.h4_ui.expanded[mod.id]) {
                    const params = this.widgets.filter(w => w.name && w.name.startsWith(mod.id) && !w.name.endsWith("_enabled"));
                    for (const w of params) {
                        if (px > 20 && px < NODE_WIDTH - 20 && py >= currentY && py < currentY + 28) {
                            if (typeof w.value === "boolean") {
                                w.value = !w.value;
                            } else {
                                this._h4_active_w = w;
                                this._h4_is_dragging = true;
                                this._h4_update_val(w, px);
                            }
                            this.setDirtyCanvas(true);
                            return true;
                        }
                        currentY += 28;
                    }
                    currentY += 10;
                }
            }

            if (py > 70 && py < 115) {
                const w = this.widgets.find(x => x.name === "operation_mode");
                if (w) {
                    const idx = (w.options.values.indexOf(w.value) + 1) % w.options.values.length;
                    w.value = w.options.values[idx];
                    this.setDirtyCanvas(true); return true;
                }
            }
            return false;
        };

        nodeType.prototype._h4_update_val = function (w, px) {
            if (!w) return;
            const barWidth = NODE_WIDTH - 50;
            const relX = Math.max(0, Math.min(1, (px - 25) / barWidth));
            if (typeof w.value === "number") {
                let min = w.options?.min ?? 0;
                let max = w.options?.max ?? 100;
                let step = w.options?.step ?? 0.01;
                w.value = Math.round((min + (max - min) * relX) / step) * step;
            } else if (w.options?.values) {
                const idx = Math.floor(relX * (w.options.values.length - 0.001));
                w.value = w.options.values[idx];
            }
        };

        nodeType.prototype.onMouseMove = function (e, pos) {
            if (this._h4_is_dragging && this._h4_active_w) {
                if (e.buttons !== 1) {
                    this._h4_is_dragging = false; this._h4_active_w = null;
                    return false;
                }
                this._h4_update_val(this._h4_active_w, pos[0]);
                this.setDirtyCanvas(true);
                return true;
            }
        };

        nodeType.prototype.onMouseUp = function () {
            this._h4_is_dragging = false; this._h4_active_w = null;
        };

        nodeType.prototype.onDrawForeground = function (ctx) {
            if (!this.h4_ui) return;
            const ui = this.h4_ui;

            // --- DEEP SOVEREIGN PURGE ---
            this.widgets?.forEach(w => {
                if (!w.__h4_cloaked) {
                    cloakWidget(w);
                    w.__h4_cloaked = true;
                }
            });

            // Dynamic Height
            let targetH = 120;
            ui.modules.forEach(m => {
                targetH += MODULE_H;
                if (ui.expanded[m.id]) {
                    const count = this.widgets.filter(w => w.name && w.name.startsWith(m.id) && !w.name.endsWith("_enabled")).length;
                    targetH += count * 28 + 10;
                }
            });
            this.size[1] = targetH + 20;

            ctx.save();
            ctx.shadowBlur = 0; ctx.globalAlpha = 1.0;

            // 1. Solid Canvas Block
            ctx.fillStyle = COLORS.bg;
            ctx.fillRect(0, 0, this.size[0], this.size[1]);
            ctx.strokeStyle = COLORS.border;
            ctx.strokeRect(0, 0, this.size[0], this.size[1]);

            // 2. Header
            ctx.fillStyle = COLORS.accent;
            ctx.font = "bold 12px monospace";
            ctx.textAlign = "left";
            ctx.fillText("PYTHONIPULATOR-INATOR", 15, 80);

            const modeW = this.widgets.find(x => x.name === "operation_mode");
            if (modeW) {
                ctx.fillStyle = COLORS.dim;
                ctx.font = "9px monospace";
                ctx.fillText(`MODE: ${modeW.value.toUpperCase()}`, 15, 100);
            }

            // 3. Category Stack
            let currentY = 120;
            ui.modules.forEach(mod => {
                const enabled = ui.isModuleEnabled(mod.id);
                const expanded = ui.expanded[mod.id];

                // BG Box
                ctx.fillStyle = enabled ? COLORS.accentSoft : "#111";
                ctx.fillRect(10, currentY, this.size[0] - 20, MODULE_H - 4);

                // LED Toggle
                ctx.strokeStyle = enabled ? COLORS.accent : COLORS.dim;
                ctx.lineWidth = 1.5;
                ctx.strokeRect(18, currentY + 10, 12, 12);
                if (enabled) {
                    ctx.save();
                    ctx.fillStyle = COLORS.accent;
                    ctx.shadowBlur = 8; ctx.shadowColor = COLORS.accent;
                    ctx.fillRect(20, currentY + 12, 8, 8);
                    ctx.restore();
                }

                // Label
                ctx.fillStyle = enabled ? "#fff" : COLORS.dim;
                ctx.font = "bold 11px monospace";
                ctx.textAlign = "left";
                ctx.fillText(mod.label, 45, Math.floor(currentY + 22));

                // Expansion Chevron
                ctx.fillStyle = COLORS.dim;
                ctx.textAlign = "right";
                ctx.fillText(expanded ? "▼" : "▶", this.size[0] - 25, Math.floor(currentY + 22));

                currentY += MODULE_H;

                if (expanded) {
                    const params = this.widgets.filter(w => w.name && w.name.startsWith(mod.id) && !w.name.endsWith("_enabled"));
                    params.forEach(w => {
                        // Label
                        ctx.fillStyle = enabled ? "#999" : COLORS.dim;
                        ctx.font = "9px monospace";
                        ctx.textAlign = "left";
                        let shortName = w.name.split("_").slice(1).join("_").toUpperCase();
                        ctx.fillText(shortName, 25, Math.floor(currentY + 10));

                        const vWidth = this.size[0] - 50;

                        if (typeof w.value === "boolean") {
                            // --- TACTILE BUTTON ---
                            ctx.fillStyle = w.value ? COLORS.btnLit : "#080808";
                            ctx.fillRect(25, Math.floor(currentY + 14), vWidth, 14);
                            ctx.strokeStyle = w.value ? COLORS.accent : "#222";
                            ctx.lineWidth = 1;
                            ctx.strokeRect(25, Math.floor(currentY + 14), vWidth, 14);

                            ctx.fillStyle = w.value ? COLORS.accent : COLORS.dim;
                            ctx.font = "bold 8px monospace";
                            ctx.textAlign = "center";
                            ctx.fillText(w.value ? "ON" : "OFF", 25 + vWidth / 2, Math.floor(currentY + 24));
                        } else {
                            // --- RECESSED SLIDER CHANNEL ---
                            ctx.fillStyle = "#050505";
                            ctx.fillRect(25, Math.floor(currentY + 14), vWidth, 10);
                            ctx.strokeStyle = "#1a1a1a";
                            ctx.strokeRect(25, Math.floor(currentY + 14), vWidth, 10);

                            if (typeof w.value === "number") {
                                let min = w.options?.min ?? 0;
                                let max = w.options?.max ?? 100;
                                let perc = (w.value - min) / (max - min);
                                ctx.fillStyle = enabled ? COLORS.accent : COLORS.dim;
                                ctx.fillRect(25, Math.floor(currentY + 14), Math.floor(vWidth * Math.max(0, Math.min(1, perc))), 10);

                                ctx.fillStyle = "#fff";
                                ctx.textAlign = "right";
                                ctx.font = "8px monospace";
                                ctx.fillText(String(w.value), this.size[0] - 25, Math.floor(currentY + 10));
                            } else {
                                ctx.fillStyle = enabled ? COLORS.accent : COLORS.dim;
                                ctx.textAlign = "right";
                                ctx.fillText(String(w.value), this.size[0] - 25, Math.floor(currentY + 10));
                            }
                        }
                        currentY += 28;
                    });
                    currentY += 10;
                }
            });
            ctx.restore();
        };
    }
});
