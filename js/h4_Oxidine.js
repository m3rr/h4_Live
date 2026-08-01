// ============================================================================
// h4_Oxidine.js - The Sentient Conduit
// Production Ready - Vue Title Shield v3 + Multi-Input/Output + Fast Blob
// ============================================================================

import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

// Helper: enforce all anti-display flags on a node instance AFTER Vue hydration
function enforceSilence(node) {
    try {
        Object.defineProperty(node, "title_mode", {
            get: function () { return 2; },
            set: function (v) { },
            configurable: true,
            enumerable: false
        });
    } catch (e) { }

    node.title = " ";
    node.show_title_bar = false;
    node.title_height = 0;
    node.resizable = false;
    node.flags = node.flags || {};
    node.flags.no_titlebar = true;
    node.flags.no_labels = true;

    // Dynamically set based on shape to allow 'Comfy' mode background while keeping others transparent
    const shape = node.properties?.shape || "Blob";
    node.flags.no_background = (shape !== "Comfy");
    node.bgcolor = "#00000000";
    node.color = "#00000000";
    node.boxcolor = "#00000000";
}

app.registerExtension({
    name: "h4.Oxidine",

    async loadedGraphNode(node, app) {
        if (node.type !== "H4_Oxidine") return;
        node._ready = true;

        enforceSilence(node);
        setTimeout(() => {
            enforceSilence(node);
            if (node.updatePruning) node.updatePruning();
            node.setDirtyCanvas(true);
        }, 0);

        if (node.scoutNeighborThirst) node.scoutNeighborThirst();
        if (node.updatePruning) node.updatePruning();
    },

    beforeRegisterNodeDef(nodeType, nodeData, app) {
        try {
            if (nodeData.name !== "H4_Oxidine") return;

            const TYPE_COLORS = {
                MODEL: "#b5a2ff",
                VAE: "#ff3333",
                CLIP: "#ffff33",
                LATENT: "#ff33ff",
                IMAGE: "#33ffff",
                CONDITIONING: "#ffa500",
                MASK: "#996633",
                STRING: "#ffffff",
                INT: "#00ff00",
                FLOAT: "#00ff00",
                NUMBER: "#00ff00",
                CONTEXT: "#888888"
            };

            const MOODS = [
                "(b'.')b", "p(-_-p)", "t('.'t)", "<(^_^)>", "(^_^)",
                "(O_O)", "(O_o)", "(X.X)", "(>_<)",
                "(╯°□°）╯︵ ┻━┻", "¯\\_(ツ)_/¯",
                "(ಥ_ಥ)", "(•_•)", "(T_T)", "(⌐■_■)"
            ];

            const NEON_COLORS = {
                "Neon Green": "#00FF00",
                "Radioactive Yellow": "#CAFF00",
                "Latent Pink": "#FF00FF",
                "Ghost White": "#FFFFFF",
                "Nightmare Red": "#FF0000",
                "Sentient Cyan": "#00f0ff",
                "Void Purple": "#7b00ff",
                "Cyber Orange": "#FF8C00"
            };

            nodeType.prototype.scoutNeighborThirst = function () {
                try {
                    if (this._isScouting || !app.graph || !this.outputs?.length) return;
                    if (this._scoutTimer) clearTimeout(this._scoutTimer);

                    this._scoutTimer = setTimeout(() => {
                        if (!app.graph || this._isScouting) return;
                        this._isScouting = true;
                        try {
                            const thirsts = {};
                            this.outputs.forEach((output, index) => {
                                const foundTypes = new Set();
                                const queue = [];
                                const visited = new Set();

                                (output?.links || []).forEach(lID => {
                                    const lnk = app.graph?.links?.[lID];
                                    if (lnk) queue.push({ nodeID: lnk.target_id, slot: lnk.target_slot, depth: 0 });
                                });

                                while (queue.length > 0 && visited.size < 20) {
                                    const { nodeID, slot, depth } = queue.shift();
                                    const vKey = `${nodeID}_${slot}`;
                                    if (visited.has(vKey)) continue;
                                    visited.add(vKey);

                                    const target = app.graph.getNodeById(nodeID);
                                    if (!target || depth > 4) continue;

                                    const tClass = target.comfyClass || target.type;
                                    if (tClass === "Reroute" || tClass === "H4_Oxidine") {
                                        (target.outputs?.[0]?.links || []).forEach(lID => {
                                            const lnk = app.graph?.links?.[lID];
                                            if (lnk) queue.push({ nodeID: lnk.target_id, slot: lnk.target_slot, depth: depth + 1 });
                                        });
                                    } else if (target.inputs?.[slot]) {
                                        const type = (target.inputs[slot]?.type || "ANY").toUpperCase();
                                        const portName = (target.inputs[slot]?.name || "ANY").toUpperCase();
                                        foundTypes.add(`${type}:${portName}`);
                                    }
                                }

                                thirsts[`out_${index + 1}`] = foundTypes.size > 0
                                    ? Array.from(foundTypes).sort().join(",")
                                    : "ANY";
                            });

                            this.properties.thirst_list = thirsts;
                            if (this._scoutDirtyTimer) clearTimeout(this._scoutDirtyTimer);
                            this._scoutDirtyTimer = setTimeout(() => this.setDirtyCanvas(true), 50);
                        } finally {
                            this._isScouting = false;
                        }
                    }, 500);
                } catch (e) { console.error("[h4] Scout Error:", e); }
            };

            nodeType.prototype.getSentientColor = function () {
                if (this._isVirus) return "#FF0000";
                const thirst = this.properties?.thirst_list?.out_1;

                if (thirst && thirst !== "ANY" && thirst !== "*") {
                    const typeKey = thirst.split(",")[0].split(":")[0].toUpperCase();
                    if (TYPE_COLORS[typeKey]) return TYPE_COLORS[typeKey];
                }
                if (this.inputs?.[0]?.link != null && app.graph) {
                    const lnk = app.graph.links?.[this.inputs[0].link];
                    if (lnk?.type && TYPE_COLORS[lnk.type.toUpperCase()])
                        return TYPE_COLORS[lnk.type.toUpperCase()];
                }
                return this.properties?.color || "#00f0ff";
            };

            // ---- THE CURE FOR THE DISCONNECT BUG ----
            // Hijack the raycast so we don't accidentally overwrite input_1
            const originalGetConnectionSlot = nodeType.prototype.getConnectionSlot;
            nodeType.prototype.getConnectionSlot = function () {
                const res = originalGetConnectionSlot
                    ? originalGetConnectionSlot.apply(this, arguments)
                    : (window.LiteGraph?.LGraphNode?.prototype?.getConnectionSlot
                        || Object.getPrototypeOf(nodeType.prototype)?.getConnectionSlot)?.apply(this, arguments);

                const TYPE_INPUT = window.LiteGraph ? window.LiteGraph.INPUT : 1;

                if (res && res[1] === TYPE_INPUT) {
                    const hitSlot = this.inputs[res[0]];
                    // If dropping a wire onto an already-occupied slot
                    if (app.canvas?.connecting_node && hitSlot && hitSlot.link != null) {
                        const emptyIdx = this.inputs.findIndex(inp => inp.link == null);
                        if (emptyIdx !== -1) {
                            return [emptyIdx, TYPE_INPUT];
                        }
                    }
                }
                return res;
            };

            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                this.properties = this.properties || {};
                this.properties.shape = this.properties.shape || "Blob";
                this.properties.mode = this.properties.mode || "Normal";
                this.properties.mood = this.properties.mood || "(b'.')b";
                this.properties.color = this.properties.color || "#00f0ff";
                this.properties.debug_log = this.properties.debug_log || false;
                this.properties.thirst_list = this.properties.thirst_list || {};

                this._ready = false;
                this._isVirus = false;

                if (onNodeCreated) onNodeCreated.apply(this, arguments);

                this.serialize_widgets = true;

                enforceSilence(this);
                setTimeout(() => {
                    enforceSilence(this);
                    if (this.updatePruning) this.updatePruning();
                }, 0);

                if (!this.outputs || this.outputs.length === 0) {
                    this.addOutput("output", "*");
                }

                this.onConnectionsChange = function (type, index, connected) {
                    if (this._ready && this.scoutNeighborThirst) {
                        this.scoutNeighborThirst();
                    }

                    if (type === 1 && connected) {
                        const isLastSlot = index === (this.inputs.length - 1);
                        if (isLastSlot && this.inputs.length < 50 && !this._isGrowing) {
                            this._isGrowing = true;
                            try {
                                this.addInput("input_" + (this.inputs.length + 1), "*");
                            } finally {
                                this._isGrowing = false;
                            }
                            if (this.updatePruning) this.updatePruning();
                        }
                    }
                };

                this.onCollapse = () => {
                    this.properties.mode = this.properties.mode === "Stealth" ? "Normal" : "Stealth";
                    this.updatePruning();
                    return false;
                };

                this.updatePruning();
            };

            api.addEventListener("execution_start", () => {
                app.graph.findNodesByType("H4_Oxidine").forEach(n => {
                    n._isVirus = false;
                    n.setDirtyCanvas(true);
                });
            });

            api.addEventListener("execution_error", (e) => {
                if (!e.detail?.node_id) return;
                const bad = app.graph.getNodeById(e.detail.node_id);
                if (bad?.type === "H4_Oxidine") {
                    bad._isVirus = true;
                    bad.setDirtyCanvas(true);
                }
            });

            nodeType.prototype.updatePruning = function () {
                try {
                    const mode = this.properties?.mode || "Normal";
                    if (mode === "Large") this.size = [120, 120];
                    else if (mode === "Medium") this.size = [90, 90];
                    else if (mode === "Small") this.size = [40, 40];
                    else if (mode === "Stealth") this.size = [30, 30];
                    else this.size = [60, 60];

                    const cx = this.size[0] / 2;
                    const cy = this.size[1] / 2;

                    (this.inputs || []).forEach(slot => {
                        slot.label = " ";
                        slot.pos = [cx, cy];
                        slot.multiple = true;
                    });
                    (this.outputs || []).forEach(slot => {
                        slot.label = " ";
                        slot.pos = [cx, cy];
                        slot.multiple = true;
                    });

                    if (this._pruneTimer) clearTimeout(this._pruneTimer);
                    this._pruneTimer = setTimeout(() => this.setDirtyCanvas(true), 50);
                } catch (e) { console.error("[h4] Pruning Error:", e); }
            };

            nodeType.prototype.onAdded = function () {
                this._ready = true;
                enforceSilence(this);
                setTimeout(() => {
                    enforceSilence(this);
                    this.updatePruning();
                    this.setDirtyCanvas(true);
                }, 0);
            };

            nodeType.prototype.onDrawBackground = function (ctx) {
                if (this.flags?.collapsed) return;
                enforceSilence(this);

                const shape = this._isVirus ? "Spikey" : (this.properties?.shape || "Blob");
                const mode = this.properties?.mode || "Normal";
                const activeColor = this.getSentientColor();

                const size = this.size[0];
                const center = size / 2;
                const radius = center - (mode === "Ninja" ? 15 : 10);
                const isHovered = app.canvas && (app.canvas.node_over === this || this.isSelected);

                ctx.save();

                if (mode === "Ninja" || mode === "Stealth") {
                    const alpha = mode === "Ninja"
                        ? (isHovered ? "FF" : "15")
                        : (isHovered ? "FF" : "44");

                    const applyAlpha = (slot) => {
                        const ids = slot.links ? slot.links : (slot.link ? [slot.link] : []);
                        ids.forEach(lID => {
                            if (app.graph?.links?.[lID])
                                app.graph.links[lID].color = activeColor + alpha;
                        });
                    };
                    (this.inputs || []).forEach(applyAlpha);
                    (this.outputs || []).forEach(applyAlpha);

                    if (mode === "Ninja" && !isHovered) ctx.globalAlpha = 0.15;
                }

                ctx.lineWidth = 1.5;
                ctx.strokeStyle = activeColor + "AA";
                ctx.beginPath();

                switch (shape) {
                    case "Blob": {
                        const segments = 10;
                        const time = Date.now() * 0.010;
                        const pts = Array.from({ length: segments }, (_, i) => {
                            const angle = (i * Math.PI * 2) / segments;
                            const pulse = Math.sin(angle * 3 + time) * 4;
                            return {
                                x: center + (radius + pulse) * Math.cos(angle),
                                y: center + (radius + pulse) * Math.sin(angle)
                            };
                        });
                        ctx.moveTo(pts[0].x, pts[0].y);
                        pts.forEach((p1, i) => {
                            const p2 = pts[(i + 1) % segments];
                            ctx.quadraticCurveTo(p1.x, p1.y, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
                        });
                        ctx.closePath();
                        break;
                    }
                    case "Spikey": {
                        const segs = 24;
                        const time = Date.now() * 0.01;
                        ctx.moveTo(center + radius, center);
                        for (let i = 0; i <= segs; i++) {
                            const angle = (i * Math.PI * 2) / segs;
                            const pulse = (i % 2 === 0) ? radius * 0.6 : Math.sin(angle * 4 + time) * 4;
                            ctx.lineTo(center + (radius + pulse) * Math.cos(angle),
                                center + (radius + pulse) * Math.sin(angle));
                        }
                        ctx.closePath();
                        ctx.strokeStyle = "#FF0000";
                        ctx.shadowBlur = 15;
                        ctx.shadowColor = "#FF0000";
                        break;
                    }
                    case "Circle":
                        ctx.arc(center, center, radius, 0, Math.PI * 2);
                        break;
                    case "Triangle":
                        for (let i = 0; i < 3; i++) {
                            const a = (i * Math.PI * 2) / 3 - Math.PI / 2;
                            ctx.lineTo(center + radius * Math.cos(a), center + radius * Math.sin(a));
                        }
                        ctx.closePath();
                        break;
                    case "Square":
                        ctx.rect(center - radius, center - radius, radius * 2, radius * 2);
                        break;
                    case "Hexagon":
                        for (let i = 0; i < 6; i++) {
                            const a = (i * Math.PI) / 3;
                            ctx.lineTo(center + radius * Math.cos(a), center + radius * Math.sin(a));
                        }
                        ctx.closePath();
                        break;
                    case "Octagon":
                        for (let i = 0; i < 8; i++) {
                            const a = (i * Math.PI) / 4 + Math.PI / 8;
                            ctx.lineTo(center + radius * Math.cos(a), center + radius * Math.sin(a));
                        }
                        ctx.closePath();
                        break;
                    case "Dodecahedron":
                        for (let i = 0; i < 12; i++) {
                            const a = (i * Math.PI * 2) / 12;
                            ctx.lineTo(center + radius * Math.cos(a), center + radius * Math.sin(a));
                        }
                        ctx.closePath();
                        break;
                    case "Comfy":
                        ctx.fillStyle = "rgba(18,18,18,0.95)";
                        ctx.roundRect(0, 0, size, size, 12);
                        ctx.fill();
                        break;
                }

                if (shape !== "h4" && shape !== "Comfy") ctx.stroke();

                ctx.fillStyle = activeColor;
                ctx.beginPath();
                ctx.arc(center, center, (mode === "Stealth" || mode === "Small") ? 3 : 5, 0, Math.PI * 2);
                ctx.fill();

                if (shape === "h4") {
                    ctx.fillStyle = activeColor;
                    ctx.font = `bold ${Math.floor(size / 3.5)}px monospace`;
                    ctx.textAlign = "center";
                    ctx.fillText(this.properties.mood || "(b'.')b", center, center - size * 0.35);
                }

                if (isHovered) {
                    ctx.beginPath();
                    ctx.arc(center, center, mode === "Stealth" ? 5 : 12, 0, Math.PI * 2);
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = activeColor;
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = activeColor;
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                }

                if (shape === "Blob" && !this._animating) {
                    this._animating = true;
                    setTimeout(() => {
                        this._animating = false;
                        this.setDirtyCanvas(true, false);
                    }, 33);
                }

                ctx.restore();
            };

            nodeType.prototype.onDrawTitleBar = function () { return true; };
            nodeType.prototype.onDrawForeground = function () { return true; };
            nodeType.prototype.drawTitleBar = function () { };

            const getExtraMenuOptions = nodeType.prototype.getExtraMenuOptions;
            nodeType.prototype.getExtraMenuOptions = function (canvas, options) {
                if (getExtraMenuOptions) getExtraMenuOptions.apply(this, arguments);

                options.unshift({
                    content: "🧪 [ OXIDINE ]",
                    has_submenu: true,
                    submenu: {
                        options: [
                            {
                                content: "Colour",
                                has_submenu: true,
                                submenu: {
                                    options: Object.entries(NEON_COLORS).map(([name, code]) => ({
                                        content: name,
                                        callback: () => { this.properties.color = code; this.setDirtyCanvas(true); }
                                    }))
                                }
                            },
                            {
                                content: "Shape",
                                has_submenu: true,
                                submenu: {
                                    options: ["Blob", "Circle", "Triangle", "Square", "Hexagon", "Octagon", "Dodecahedron", "h4", "Comfy"].map(s => ({
                                        content: s,
                                        callback: () => { this.properties.shape = s; this.updatePruning(); }
                                    }))
                                }
                            },
                            {
                                content: "Mood",
                                has_submenu: true,
                                submenu: {
                                    options: MOODS.map(m => ({
                                        content: m,
                                        callback: () => { this.properties.mood = m; this.setDirtyCanvas(true); }
                                    }))
                                }
                            },
                            {
                                content: "Mode",
                                has_submenu: true,
                                submenu: {
                                    options: ["Large", "Medium", "Normal", "Small", "Stealth", "Ninja"].map(m => ({
                                        content: m,
                                        callback: () => { this.properties.mode = m; this.updatePruning(); }
                                    }))
                                }
                            },
                            {
                                content: this.properties.debug_log ? "⬛ Disable Debug Log" : "🟩 Enable Debug Log",
                                callback: () => { this.properties.debug_log = !this.properties.debug_log; }
                            }
                        ]
                    }
                }, null);
            };

        } catch (err) {
            console.error("[h4] Oxidine Registration Error:", err);
        }
    }
});
