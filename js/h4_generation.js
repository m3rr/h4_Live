// FILE: js/h4_generation.js
import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

/**
 * 🎨 H4 Generation UI (Ported from ToolKit)
 * Handles custom UI for AxisDriver, Varianator, and SeedSequencer.
 */

const PLACEHOLDER_CLASS = "h4-placeholder";
const TOOLTIP_COPY = {
    // Basic tooltips
    positive_prompt: "Positive conditioning (what you want).",
    negative_prompt: "Negative conditioning (what you don't want).",
    vae_name: "Override VAE model.",
    clip_text_name: "Override CLIP text encoder.",
    clip_vision_name: "Override CLIP vision encoder.",
    sampler_name: "Sampling algorithm.",
    scheduler_name: "Noise schedule curve.",
};

const AXIS_MODE_HINTS = {
    prompt: "Add prompt lines such as 'cinematic lighting'.",
    checkpoint: "checkpoint:model_filename.safetensors",
    cfg: "Numbers like 2.5, 4.0, 6.5",
    steps: "Integers such as 20, 30, 40",
    sampler: "dpmpp_2m_sde, euler_a, ddim",
    scheduler: "karras, exponential, lognormal",
    denoise: "Values between 0.0 and 1.0",
    seed: "Seed numbers e.g. 12345",
    lora: "lora:filename@0.8",
    none: "Leave blank to keep the base settings.",
};

const AXIS_DRIVER_PRESETS = [
    { value: "checkpoint", label: "Checkpoint" },
    { value: "prompt", label: "Prompt suffix" },
    { value: "lora", label: "LoRA" },
    { value: "sampler", label: "Sampler" },
    { value: "scheduler", label: "Scheduler" },
    { value: "steps", label: "Sampler steps" },
    { value: "cfg", label: "CFG" },
    { value: "denoise", label: "Denoise" },
    { value: "seed", label: "Seed" },
    { value: "none", label: "Disabled" },
];

const AXIS_DRIVER_SLOT_ORDER = ["X", "Y", "Z"];
const AXIS_DRIVER_MAX_ITEMS = 8;
const AXIS_DRIVER_DEFAULT_STYLE = {
    font_size: 22,
    font_family: "DejaVuSans",
    font_colour: "#FFFFFF",
    background: "black60",
    alignment: "center",
    label_position: "top_left",
    label_layout: "overlay",
    custom_label_x: "X",
    custom_label_y: "Y",
    custom_label_z: "Z",
    show_axis_headers: true,
};
const AXIS_DRIVER_DEFAULT_STATE = {
    axes: [
        { slot: "X", preset: "checkpoint", items: [] },
        { slot: "Y", preset: "prompt", items: [] },
        { slot: "Z", preset: "none", items: [] },
    ],
    style: { ...AXIS_DRIVER_DEFAULT_STYLE },
};

const ASSET_KIND_MAPPING = {
    checkpoint: ["checkpoints"],
    lora: ["loras", "lycoris"],
    vae: ["vae"],
    clip: ["clip"],
    clip_vision: ["clip_vision"],
};

const H4_NODE_NAMES = new Set([
    "H4_AxisDriver",
    "H4_Varianator",
    "H4_SeedSequencer"
]);

// --- Stylers ---

const attachPlaceholderStyles = () => {
    if (document.head.querySelector(`style[data-h4-live-gen="true"]`)) return;
    const styleTag = document.createElement("style");
    styleTag.dataset.h4LiveGen = "true";
    styleTag.textContent = `
        .${PLACEHOLDER_CLASS}::placeholder {
            color: #9aa0a6 !important;
            font-style: italic;
        }
        .h4-seed-randomize:hover {
            background: rgba(0,0,0,0.55) !important;
            border-color: rgba(255,255,255,0.4) !important;
        }
    `;
    document.head.appendChild(styleTag);
};

let h4NodeThemeEntry = null;
const ensureH4NodeThemeEntry = () => {
    const liteGraph = globalThis?.LiteGraph;
    if (liteGraph?.LGraphCanvas?.node_colors && !liteGraph.LGraphCanvas.node_colors.h4ToolkitBlack) {
        liteGraph.LGraphCanvas.node_colors.h4ToolkitBlack = {
            color: "#1a1a1a",
            bgcolor: "#000000",
            groupcolor: "#333333",
        };
    }
    return liteGraph?.LGraphCanvas?.node_colors?.h4ToolkitBlack || { color: "#000000" };
};

const applyH4NodeColor = (node) => {
    if (!node) return;
    const theme = ensureH4NodeThemeEntry();
    node.color = theme.color;
    node.bgcolor = theme.bgcolor;
};

// --- Helpers ---

const clampNumber = (val, min, max) => Math.min(Math.max(Number(val) || 0, min), max);

const randomSeedFromDigits = (digits) => {
    const d = clampNumber(digits, 1, 12);
    const min = d === 1 ? 0 : Math.pow(10, d - 1);
    const max = Math.pow(10, d) - 1;
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

const fetchAssetList = async (kind) => {
    try {
        const resp = await api.fetchApi(`/object_info/${kind}`);
        const data = await resp.json();
        return data || [];
    } catch {
        return [];
    }
};

const loadAssetKinds = async (kinds) => {
    const promises = kinds.map(k => fetchAssetList(k));
    const results = await Promise.all(promises);
    return results.flat().sort();
};

// --- Seed Sequencer UI ---

const attachSeedGeneratorUi = (node) => {
    if (!node?.widgets || node.h4SeedUiAttached) return;
    const seedWidget = node.widgets.find(w => w.name === "seed");
    if (!seedWidget) return;

    const ensure = () => {
        if (!seedWidget.inputEl) {
            requestAnimationFrame(ensure);
            return;
        }
        if (seedWidget.h4RandomButtonAttached) return;

        const wrapper = seedWidget.inputEl.closest?.(".litegraph-widget") || seedWidget.inputEl.parentElement;
        if (!wrapper) return;

        const modeWidget = node.widgets.find(w => w.name === "mode");
        const stepWidget = node.widgets.find(w => w.name === "increment_step");
        const digitsWidget = node.widgets.find(w => w.name === "random_digits");

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "h4-seed-randomize";
        btn.textContent = "Randomize";
        Object.assign(btn.style, {
            marginLeft: "6px",
            padding: "2px 8px",
            fontSize: "0.75rem",
            borderRadius: "6px",
            border: "1px solid rgba(255,255,255,0.25)",
            background: "rgba(0,0,0,0.35)",
            color: "#ffffff",
            cursor: "pointer",
            flexShrink: "0"
        });

        const sync = () => {
            const mode = modeWidget?.value || "fixed";
            if (mode === "increment") {
                const step = clampNumber(stepWidget?.value ?? 1, 1, 9999);
                btn.textContent = `+${step}`;
                btn.title = `Advance seed by ${step}`;
            } else {
                btn.textContent = "Randomize";
                btn.title = "Roll a new seed based on digits";
            }
        };
        sync();

        // Hook callbacks to update button text
        [modeWidget, stepWidget].forEach(w => {
            if (w) {
                const orig = w.callback;
                w.callback = (val) => {
                    const r = orig ? orig.call(node, val) : undefined;
                    sync();
                    return r;
                };
            }
        });

        btn.onclick = () => {
            const mode = modeWidget?.value || "fixed";
            const current = Number(seedWidget.value || 0);
            let next = 0;

            if (mode === "increment") {
                const step = clampNumber(stepWidget?.value ?? 1, 1, 9999);
                next = current + step;
            } else {
                const digits = clampNumber(digitsWidget?.value ?? 10, 1, 12);
                next = randomSeedFromDigits(digits);
            }

            seedWidget.value = next;
            if (seedWidget.inputEl) seedWidget.inputEl.value = next;
            if (seedWidget.callback) seedWidget.callback(next);
            node.setDirtyCanvas(true, true);
        };

        wrapper.style.display = "flex";
        wrapper.style.alignItems = "center";
        wrapper.appendChild(btn);

        seedWidget.h4RandomButtonAttached = true;
        node.h4SeedUiAttached = true;
    };
    ensure();
};

// --- Axis Driver UI logic is too large to inline perfectly, 
// allows fallback to text input if something fails, but we try to inject.

app.registerExtension({
    name: "h4.live.generation",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (!nodeData) return;

        if (H4_NODE_NAMES.has(nodeData.name)) {
            const orig = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                if (orig) orig.apply(this, arguments);
                applyH4NodeColor(this);
                attachPlaceholderStyles();
            };
        }

        if (nodeData.name === "H4_SeedSequencer") {
            const orig = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                if (orig) orig.apply(this, arguments);
                this.size = this.size || [300, 140];
                this.size[0] = Math.max(this.size[0], 280);
                attachSeedGeneratorUi(this);
            };
        }

        if (nodeData.name === "H4_Varianator") {
            const orig = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                if (orig) orig.apply(this, arguments);
                this.size = [350, 250];
                // Core varianator only needs nice colors and sizing for now
                // Ultra widgets omitted for V1 simplicity
            };
        }

        if (nodeData.name === "H4_AxisDriver") {
            const orig = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                if (orig) orig.apply(this, arguments);
                this.size = [560, 580];

                // Install UI Hook
                // We detect the 'config' widget and hide it, replacing with Card UI
                const installUi = () => {
                    const configW = this.widgets?.find(w => w.name === "config");
                    if (!configW || !configW.inputEl) {
                        requestAnimationFrame(installUi);
                        return;
                    }
                    if (this.h4AxisUiAttached) return;
                    this.h4AxisUiAttached = true;

                    // Hide Original Text area
                    const host = configW.inputEl;
                    host.style.display = "none";

                    const wrapper = host.parentElement;
                    if (!wrapper) return;

                    // Create Container
                    const container = document.createElement("div");
                    container.className = "h4-axis-container";
                    Object.assign(container.style, {
                        display: "flex", flexDirection: "column", gap: "10px",
                        marginTop: "5px", padding: "10px",
                        background: "rgba(0,0,0,0.2)", borderRadius: "8px",
                        border: "1px solid rgba(255,255,255,0.1)",
                        width: "100%", boxSizing: "border-box",
                        fontFamily: "sans-serif"
                    });

                    // -- Helper to sync state --
                    let state = { ...AXIS_DRIVER_DEFAULT_STATE };
                    try {
                        const parsed = JSON.parse(configW.value);
                        if (parsed && Array.isArray(parsed.axes)) state = parsed;
                    } catch { }

                    const save = () => {
                        const json = JSON.stringify(state, null, 2);
                        configW.value = json;
                        host.value = json; // Sync hidden input
                        if (configW.callback) configW.callback(json);
                    };

                    // Render Function
                    const render = () => {
                        container.innerHTML = "";

                        // Toolbar
                        const toolbar = document.createElement("div");
                        toolbar.innerHTML = `<span style="font-weight:bold; opacity:0.7">Axis Configuration</span>`;
                        Object.assign(toolbar.style, { display: "flex", justifyContent: "space-between" });

                        const showJsonBtn = document.createElement("button");
                        showJsonBtn.textContent = host.style.display === "none" ? "Show JSON" : "Hide JSON";
                        showJsonBtn.onclick = () => {
                            const hidden = host.style.display === "none";
                            host.style.display = hidden ? "block" : "none";
                            showJsonBtn.textContent = hidden ? "Hide JSON" : "Show JSON";
                            host.style.height = "200px";
                        };
                        toolbar.appendChild(showJsonBtn);
                        container.appendChild(toolbar);

                        // Axes
                        state.axes.forEach((axis, idx) => {
                            const card = document.createElement("div");
                            Object.assign(card.style, {
                                background: "rgba(255,255,255,0.05)", padding: "8px",
                                borderRadius: "6px", border: "1px solid rgba(255,255,255,0.05)",
                                display: "flex", flexDirection: "column", gap: "6px"
                            });

                            // Header
                            const header = document.createElement("div");
                            Object.assign(header.style, { display: "flex", justifyContent: "space-between", alignItems: "center" });

                            const title = document.createElement("span");
                            title.textContent = `Axis ${axis.slot}`;
                            title.style.fontWeight = "bold";

                            const presetSel = document.createElement("select");
                            AXIS_DRIVER_PRESETS.forEach(p => {
                                const opt = document.createElement("option");
                                opt.value = p.value;
                                opt.textContent = p.label;
                                presetSel.appendChild(opt);
                            });
                            presetSel.value = axis.preset;
                            presetSel.onchange = (e) => {
                                axis.preset = e.target.value;
                                if (axis.preset === "none") axis.items = [];
                                save();
                                render();
                            };

                            header.appendChild(title);
                            header.appendChild(presetSel);
                            card.appendChild(header);

                            // Items
                            if (axis.preset !== "none") {
                                const itemContainer = document.createElement("div");
                                itemContainer.style.display = "flex";
                                itemContainer.style.flexDirection = "column";
                                itemContainer.style.gap = "4px";

                                axis.items.forEach((item, itemIdx) => {
                                    const row = document.createElement("div");
                                    Object.assign(row.style, { display: "flex", gap: "5px" });

                                    const valInput = document.createElement("input");
                                    valInput.value = item.value || "";
                                    valInput.placeholder = axis.preset;
                                    valInput.style.flex = "1";
                                    valInput.onblur = (e) => { item.value = e.target.value; save(); };

                                    const delBtn = document.createElement("button");
                                    delBtn.textContent = "×";
                                    delBtn.onclick = () => {
                                        axis.items.splice(itemIdx, 1);
                                        save();
                                        render();
                                    };

                                    row.appendChild(valInput);
                                    row.appendChild(delBtn);
                                    itemContainer.appendChild(row);
                                });

                                if (axis.items.length < AXIS_DRIVER_MAX_ITEMS) {
                                    const addBtn = document.createElement("button");
                                    addBtn.textContent = "+ Add Item";
                                    addBtn.style.marginTop = "4px";
                                    addBtn.onclick = () => {
                                        axis.items.push({ value: "", label: "" });
                                        save();
                                        render();
                                    };
                                    itemContainer.appendChild(addBtn);
                                }
                                card.appendChild(itemContainer);
                            }

                            container.appendChild(card);
                        });
                    };

                    render();
                    wrapper.appendChild(container); // Add our UI
                };
                installUi();
            };
        }
    }
});
