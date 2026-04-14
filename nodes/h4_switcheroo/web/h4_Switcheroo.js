import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

/*
    h4 - Switcheroo (v4.7.0) - ZERO DRIFT
    -------------------------------------------
    - VISUALS: Polished Ghost Mode manifesting for high-zoom clarity.
    - SYNC: Matches SmartSave 4.7 architecture for coordinate safety.
*/

const COLORS = {
    bg: "#151515", accent: "#00f2ff", text: "#fff",
    dim: "#555", border: "#2a2a2a",
    btn_bg: "rgba(30, 30, 30, 0.9)"
};

app.registerExtension({
    name: "h4.ZeroDrift.Switcheroo",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== "H4_Switcheroo") return;
        const oCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            if (oCreated) oCreated.apply(this, arguments);
            const node = this;
            node.setSize([520, 580]);

            const exorcize = () => {
                node.widgets?.forEach(w => {
                    if (w.name !== "swap_count") {
                        if (w.inputEl) w.inputEl.remove();
                        w.type = "converted-widget"; w.computeSize = () => [0, -4]; w.draw = () => false;
                    }
                });
            };
            setTimeout(exorcize, 500);

            const getRects = () => {
                const w = node.size[0], h = node.size[1];
                return {
                    rail: { x: 0, y: 40, w: 75, h: h - 40 },
                    bar_track: { x: 22, y: 70, w: 25, h: Math.max(10, h - 120) },
                    slot_area: { x: 95, y: 60, w: Math.max(0, w - 120), h: h - 80 }
                };
            };

            node.onMouseDown = function (e, pos) {
                const r = getRects();
                if (pos[0] > r.rail.x && pos[0] < r.rail.x + r.rail.w) {
                    const countW = this.widgets.find(x => x.name === "swap_count");
                    if (countW) {
                        const t = 1.0 - Math.max(0, Math.min(1, (pos[1] - r.bar_track.y) / r.bar_track.h));
                        countW.value = Math.round(t * 10);
                        this.setDirtyCanvas(true); return true;
                    }
                }
                return false;
            };

            node.onDrawForeground = function (ctx) {
                if (this.flags.collapsed) return;
                try {
                    const r = getRects(); const w = this.size[0], h = this.size[1];
                    const ds = app.canvas?.ds; const scale = ds ? ds.scale : 1.0;

                    if (scale < 0.35) {
                        ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, w, h);
                        ctx.fillStyle = COLORS.accent; ctx.font = "900 60px monospace"; ctx.textAlign = "center";
                        ctx.fillText("H4", w / 2, h / 2 + 10);
                        ctx.font = "900 14px monospace"; ctx.fillText("SWITCHEROO", w / 2, h / 2 + 50);
                        return;
                    }
                    ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, w, h);
                    const countWidget = this.widgets.find(x => x.name === "swap_count");
                    const count = countWidget ? countWidget.value : 0;
                    for (let i = 0; i < 10; i++) {
                        const active = i < count;
                        const ty = r.slot_area.y + (i * 48);
                        const tx = r.slot_area.x; const tw = r.slot_area.w; const th = 40;
                        if (ty + th > h) continue;
                        ctx.save(); ctx.fillStyle = active ? "rgba(0, 242, 255, 0.04)" : "#0c0c0c";
                        ctx.beginPath(); ctx.roundRect(tx, ty, tw, th, 4); ctx.fill();
                        ctx.strokeStyle = active ? COLORS.accent : COLORS.border; ctx.stroke(); ctx.restore();
                        ctx.fillStyle = active ? COLORS.accent : COLORS.dim; ctx.font = "bold 11px monospace";
                        ctx.textAlign = "left"; ctx.fillText(`SLOT ${i + 1}`, tx + 15, ty + th / 2 + 5);
                        if (active) {
                            const fW = this.widgets.find(x => x.name === `find_${i + 1}`);
                            const rW = this.widgets.find(x => x.name === `replace_${i + 1}`);
                            ctx.fillStyle = "#aaa"; ctx.font = "10px monospace"; ctx.textAlign = "right";
                            ctx.fillText(`${fW?.value || "-"} → ${rW?.value || "-"}`, tx + tw - 15, ty + th / 2 + 5);
                        }
                    }
                    ctx.fillStyle = "#0c0c0c"; ctx.fillRect(0, 0, r.rail.w, h);
                    ctx.fillStyle = COLORS.accent; ctx.fillRect(0, 0, 4, h);
                    ctx.fillStyle = COLORS.accent; ctx.font = "900 13px monospace"; ctx.fillText("H4 // SWITCHEROO", 95, 25);
                    ctx.fillStyle = "#000"; ctx.fillRect(r.bar_track.x, r.bar_track.y, r.bar_track.w, r.bar_track.h);
                    const fh = r.bar_track.h * (count / 10);
                    ctx.fillStyle = COLORS.accent; ctx.fillRect(r.bar_track.x, r.bar_track.y + r.bar_track.h - fh, r.bar_track.w, fh);
                } catch (err) { console.error("H4_SWITCH_ERR", err); }
            };
        };
    }
});
