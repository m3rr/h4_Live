import { app } from "/scripts/app.js";

/*
    h4 - Switcheroo (Sovereign Interface v6.3.1)
    -------------------------------------------
    - NESTED TERMINAL: The mutation result terminal is now collapsible (Drawer-Style).
    - PASS-THROUGH SUPPORT: Swap Count '0' is now a valid state for raw data routing.
    - COUNTER PERSISTENCE: Synchronized state-locking for the HTML swap counter.
    - SOVEREIGN UI: 100% Canvas toggles/hits for zero-overlap hygiene.
*/

const COLORS = {
    bg: "#0c0c0c",
    accent: "#00f2ff",
    text: "#fff",
    dim: "#444",
    border: "#1a1a1a",
    slot_active: "rgba(0, 242, 255, 0.05)",
    toggle_on: "#00ff77",
    toggle_off: "#333",
    term_bg: "#010101"
};

const banishElement = (el) => {
    if (!el) return;
    el.style.position = "fixed"; el.style.top = "-9999px"; el.style.left = "-9999px";
    el.style.width = "0"; el.style.height = "0"; el.style.opacity = "0";
    el.style.pointerEvents = "none"; el.style.overflow = "hidden"; el.style.zIndex = "-1";
    if (el.parentNode) el.remove();
};

const cloakWidget = (w) => {
    if (!w) return;
    w.hidden = true; w.type = "converted-widget";
    w.draw = () => { }; w.computeSize = () => [0, -4];
    banishElement(w.inputEl); banishElement(w.textareaEl); if (w.element) banishElement(w.element);
};

class SwitcherooUI {
    constructor(node) {
        this.node = node;
        this.inputs = {};
        document.querySelectorAll(".h4-switch-terminal").forEach(el => el.remove());

        this.counter = document.createElement("input");
        this.counter.type = "number";
        this.counter.min = "0"; // [FIX] Allow 0
        this.counter.max = "10";
        Object.assign(this.counter.style, {
            position: "fixed", zIndex: "500",
            background: "#080808", border: "1px solid " + COLORS.accent,
            color: COLORS.accent, fontFamily: "monospace", fontSize: "14px",
            padding: "2px 5px", outline: "none", display: "none",
            boxSizing: "border-box", textAlign: "center", borderRadius: "3px"
        });
        document.body.appendChild(this.counter);

        this.counter.oninput = () => {
            const w = this.node.widgets.find(x => x.name === "swap_count");
            if (w) {
                let val = parseInt(this.counter.value);
                if (isNaN(val)) val = 0; if (val < 0) val = 0; if (val > 10) val = 10;
                w.value = val;
                if (w.callback) w.callback(val);
                this.node.setDirtyCanvas(true);
            }
        };
    }

    cleanup() {
        if (this.counter && this.counter.parentNode) this.counter.remove();
        Object.values(this.inputs).forEach(slot => {
            if (slot.find && slot.find.parentNode) slot.find.remove();
            if (slot.replace && slot.replace.parentNode) slot.replace.remove();
        });
        this.inputs = {};
    }

    updateSlots(count) {
        this.cleanup();
        for (let i = 1; i <= count; i++) { this.createSlot(i); }
    }

    createSlot(i) {
        const createInp = (type, isFind) => {
            const el = document.createElement(type === "text" ? "input" : "textarea");
            if (type === "text") el.type = "text";
            Object.assign(el.style, {
                position: "fixed", zIndex: "500",
                background: isFind ? "rgba(10, 10, 10, 0.7)" : "rgba(5, 5, 5, 0.7)",
                border: "1px solid rgba(0, 242, 255, 0.2)",
                color: isFind ? COLORS.accent : "#ccc",
                fontFamily: "monospace", fontSize: "11px",
                padding: "3px 8px", outline: "none",
                display: "none", boxSizing: "border-box",
                resize: "none", backdropFilter: "blur(4px)"
            });
            const wName = (isFind ? "find_" : "replace_") + i;
            const w = this.node.widgets.find(x => x.name === wName);
            if (w) { el.value = w.value || ""; el.oninput = () => { w.value = el.value; }; }
            return el;
        };
        this.inputs[i] = { find: createInp("text", true), replace: createInp("area", false) };
    }

    sync(ctx, scale, ds, rb) {
        const countW = this.node.widgets.find(w => w.name === "swap_count");
        const count = countW ? countW.value : 0;

        const syncGrid = (el, valX, valY, valW, valH) => {
            if (!el) return;
            if (scale < 0.45 || this.node.flags.collapsed) { if (el.parentNode) el.remove(); return; }
            const screenX = (valX + ds.offset[0]) * scale + rb.left;
            const screenY = (valY + ds.offset[1]) * scale + rb.top;
            if (!el.parentNode) document.body.appendChild(el);
            el.style.left = screenX + "px"; el.style.top = screenY + "px";
            el.style.width = (valW * scale) + "px"; el.style.height = (valH * scale) + "px";
            if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
                el.style.fontSize = el.classList.contains("h4-switch-counter") ? (14 * scale) + "px" : (10 * scale) + "px";
            }
            el.style.display = "block";
        };

        if (this.counter) {
            const cx = this.node.pos[0] + this.node.size[0] - 65;
            const cy = this.node.pos[1] + 100;
            // [SYNC] Value Persistence
            if (document.activeElement !== this.counter && this.counter.value !== String(count)) {
                this.counter.value = count;
            }
            syncGrid(this.counter, cx, cy, 50, 25);
        }

        for (let i = 1; i <= 10; i++) {
            const slot = this.inputs[i];
            if (!slot) continue;
            if (i <= count && scale >= 0.45 && !this.node.flags.collapsed) {
                const ty = 145 + (i - 1) * 70;
                const sx = 75;
                const slotW = this.node.size[0] - sx - 40;
                syncGrid(slot.find, this.node.pos[0] + sx, this.node.pos[1] + ty, slotW, 20);
                syncGrid(slot.replace, this.node.pos[0] + sx, this.node.pos[1] + ty + 24, slotW, 28);
            } else {
                if (slot.find.parentNode) slot.find.remove(); if (slot.replace.parentNode) slot.replace.remove();
            }
        }
    }
}

const H4_Switcheroo_Extension = {
    name: "h4.Switcheroo.Nodes2",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== "H4_Switcheroo") return;

        const onExecuted = nodeType.prototype.onExecuted;
        nodeType.prototype.onExecuted = function (message) {
            if (onExecuted) onExecuted.apply(this, arguments);
            if (message && message.segments) {
                this.mutationSegments = message.segments;
                this._h4_cacheTerminalHeight();
                this.size = this.computeSize();
                this.setDirtyCanvas(true);
            }
        };

        nodeType.prototype._h4_cacheTerminalHeight = function () {
            if (!this.mutationSegments) { this._h4_cachedTermHeight = 0; return; }
            const w = this.size[0]; const fs = 11;
            const tempCtx = document.createElement("canvas").getContext("2d");
            tempCtx.font = `${fs}px monospace`;
            this._h4_terminalLines = []; let curL = []; let curX = 0; const maxW = w - 80;
            this.mutationSegments.forEach(seg => {
                const words = seg.t.replace(/\n/g, " ").split(/(\s+)/);
                words.forEach(word => {
                    const wordW = tempCtx.measureText(word).width;
                    if (curX + wordW > maxW && curL.length > 0) {
                        this._h4_terminalLines.push(curL); curL = []; curX = 0;
                    }
                    curL.push({ text: word, changed: seg.c }); curX += wordW;
                });
            });
            if (curL.length > 0) this._h4_terminalLines.push(curL);
            this._h4_cachedTermHeight = (this._h4_terminalLines.length * (fs * 1.4)) + 50;
        };

        nodeType.prototype.computeSize = function () {
            const countW = this.widgets?.find(w => w.name === "swap_count");
            const count = countW ? countW.value : 0;
            const w = 530;
            const h_slots = 145 + (count * 70) + 10;

            let h_term = 30;
            if (this._h4_termOpen) {
                h_term = this._h4_cachedTermHeight || 0;
                if (h_term > 400) h_term = 400;
                if (h_term < 80) h_term = 80;
            }

            return [w, h_slots + h_term + 20];
        };

        nodeType.prototype.onMouseDown = function (e, pos) {
            const px = pos[0], py = pos[1];
            const checkHit = (x, y, w, h) => px >= x && px <= x + w && py >= y && py <= y + h;

            const toggles = [
                { name: "case_sensitive", x: 140, y: 70 },
                { name: "regex_mode", x: 250, y: 70 },
                { name: "strip_whitespace", x: 340, y: 70 }
            ];
            for (const t of toggles) {
                if (checkHit(t.x, t.y, 80, 15)) {
                    const w = this.widgets.find(x => x.name === t.name);
                    if (w) { w.value = !w.value; this.setDirtyCanvas(true); return true; }
                }
            }

            const countW = this.widgets?.find(x => x.name === "swap_count");
            const count = countW ? countW.value : 0;
            const termY = 145 + (count * 70) + 10;
            if (checkHit(15, termY, this.size[0] - 30, 30)) {
                this._h4_termOpen = !this._h4_termOpen;
                this.size = this.computeSize();
                this.setDirtyCanvas(true);
                return true;
            }
        };

        nodeType.prototype.onNodeCreated = function () {
            this.ui = new SwitcherooUI(this);
            this._h4_termOpen = false;
            const refresh = () => {
                if (!this.widgets) return;
                this.widgets.forEach(cloakWidget);
                const countW = this.widgets.find(w => w.name === "swap_count");
                // [SYNC] HTML Counter Value Lock
                if (countW && this.ui.counter) {
                    this.ui.counter.value = countW.value;
                }
                if (countW && countW.callback !== refresh) {
                    const b = countW.callback;
                    countW.callback = function () { if (b) b.apply(this, arguments); refresh(); };
                }
                const count = countW ? countW.value : 0;
                this.ui.updateSlots(count);
                this.size = this.computeSize();
                this.setDirtyCanvas(true);
            };
            setTimeout(refresh, 50);
        };

        nodeType.prototype.onDrawForeground = function (ctx) {
            if (this.flags.collapsed) return;
            const w = this.size[0], h = this.size[1];
            const ds = app.canvas.ds;
            const rb = app.canvas.canvas.getBoundingClientRect();
            const scale = ds.scale || ds || 1.0;

            if (this.ui) this.ui.sync(ctx, scale, ds, rb);

            ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, w, h);

            ctx.textAlign = "left"; ctx.textBaseline = "top";
            ctx.fillStyle = COLORS.accent; ctx.font = "900 13px monospace";
            ctx.fillText("H4 // SWITCHEROO // ONLINE", 140, 20);
            ctx.fillStyle = COLORS.dim; ctx.font = "10px monospace";
            ctx.fillText("UNIVERSAL DATA PIPELINE", 140, 35);

            const drawToggle = (x, y, label, name) => {
                const widget = this.widgets?.find(v => v.name === name);
                const val = widget ? widget.value : false;
                ctx.fillStyle = val ? COLORS.toggle_on : COLORS.toggle_off;
                ctx.beginPath(); ctx.roundRect(x, y, 10, 10, 2); ctx.fill();
                ctx.fillStyle = val ? COLORS.text : COLORS.dim;
                ctx.font = "9px monospace";
                ctx.fillText(label, x + 15, y);
            };
            drawToggle(140, 70, "CASE", "case_sensitive");
            drawToggle(240, 70, "REGEX", "regex_mode");
            drawToggle(340, 70, "STRIP", "strip_whitespace");

            ctx.fillStyle = COLORS.slot_active; ctx.beginPath(); ctx.roundRect(15, 100, w - 30, 25, 4); ctx.fill();
            ctx.strokeStyle = "rgba(0, 242, 255, 0.1)"; ctx.stroke();
            ctx.fillStyle = COLORS.dim; ctx.font = "bold 10px monospace"; ctx.fillText("SWAP_INSTANCES:", 25, 107);

            const countW = this.widgets?.find(x => x.name === "swap_count");
            const count = countW ? countW.value : 0;
            for (let i = 0; i < count; i++) {
                const ty = 145 + (i * 70);
                ctx.fillStyle = COLORS.slot_active; ctx.beginPath(); ctx.roundRect(15, ty - 5, w - 30, 64, 4); ctx.fill();
                ctx.strokeStyle = "rgba(0, 242, 255, 0.1)"; ctx.stroke();
                ctx.fillStyle = COLORS.accent; ctx.font = "900 9px monospace"; ctx.fillText(`P_0${i + 1}`, 30, ty + 10);
            }

            const termY = 145 + (count * 70) + 10;
            const termH = this._h4_termOpen ? Math.max(80, h - termY - 15) : 30;

            ctx.fillStyle = COLORS.term_bg; ctx.beginPath(); ctx.roundRect(15, termY, w - 30, termH, 4); ctx.fill();
            ctx.strokeStyle = "rgba(0, 242, 255, 0.25)"; ctx.stroke();

            ctx.fillStyle = COLORS.accent; ctx.font = "900 9px monospace";
            ctx.fillText(this._h4_termOpen ? "▼ MUTATED_RESULT:" : "► MUTATED_RESULT (CLICK TO EXPAND)", 30, termY + 11);

            if (this._h4_termOpen && this.mutationSegments && this._h4_terminalLines) {
                ctx.save();
                ctx.beginPath(); ctx.rect(15, termY + 25, w - 30, termH - 30); ctx.clip();
                let drawY = termY + 35;
                ctx.font = `11px monospace`;
                this._h4_terminalLines.forEach(line => {
                    let drawX = 30;
                    line.forEach(chunk => {
                        ctx.fillStyle = chunk.changed ? "#00ff77" : "#ccc";
                        if (chunk.changed) {
                            ctx.shadowBlur = 4;
                            ctx.shadowColor = "rgba(0,255,119,0.5)";
                        } else {
                            ctx.shadowBlur = 0;
                            ctx.shadowColor = "transparent";
                        }
                        ctx.fillText(chunk.text, drawX, drawY);
                        // [CLEANUP] Force reset after every chunk
                        ctx.shadowBlur = 0;
                        ctx.shadowColor = "transparent";
                        drawX += ctx.measureText(chunk.text).width;
                    });
                    drawY += 15.4;
                });
                ctx.restore();
            }
        };

        nodeType.prototype.onRemoved = function () { if (this.ui) this.ui.cleanup(); };
    }
};

app.registerExtension(H4_Switcheroo_Extension);
export default H4_Switcheroo_Extension;
