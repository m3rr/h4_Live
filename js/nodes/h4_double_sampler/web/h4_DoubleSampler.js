import { app } from "../../scripts/app.js";

/**
 * 🎨 H4 Double Sampler - Proven Pattern V16 (Toggle Fix)
 * Uses the converted-widget + computeSize pattern from SmartSave.
 * Fixed: Widget restoration now properly tracks original state per-widget.
 */

app.registerExtension({
    name: "h4.DoubleSampler",
    async beforeRegisterNodeDef(nodeType, nodeData, appRef) {
        if (nodeData.name !== "H4_DoubleSampler") return;

        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            if (onNodeCreated) onNodeCreated.apply(this, arguments);

            const node = this;
            node.serialize_widgets = true;

            const isTruthy = (v) => v === true || v === "ON" || String(v).toLowerCase() === "true" || v === 1;

            // Drawer group membership
            const GROUPS = {
                s2: ["stage_2_sampler", "stage_2_scheduler", "stage_2_steps", "stage_2_denoise", "stage_2_cfg"],
                chaos: ["chaos_mode", "chaos_every", "chaos_range", "chaos_batch", "chaos_denoise", "show_legend", "label_seed"],
                extra: ["positive_text", "negative_text", "wildcard_text", "cfg_sliding_scale", "cfg_end",
                    "prompt_stutter", "seed_variation", "variation_seed"]
            };
            const ALL_DRAWER = [...GROUPS.s2, ...GROUPS.chaos, ...GROUPS.extra];

            // --- HIDE / SHOW ---
            // Each widget gets a permanent snapshot taken ONCE (first hide).
            // The snapshot stores everything needed to fully restore the widget.
            const hideWidget = (w) => {
                if (!w) return;

                // Take snapshot only once per widget lifetime
                if (!w.h4_snapshot) {
                    w.h4_snapshot = {
                        type: w.type,
                        computeSize: w.computeSize,
                        hidden: w.hidden
                    };
                }

                w.type = "converted-widget";
                w.computeSize = () => [0, -4];
                w.hidden = true;
                if (w.inputEl) w.inputEl.style.display = "none";
                w.h4_visible = false;
            };

            const showWidget = (w) => {
                if (!w || !w.h4_snapshot) return;

                w.type = w.h4_snapshot.type;

                // Restore computeSize: if the original had one, put it back.
                // If it didn't (undefined), remove the override so prototype takes over.
                if (w.h4_snapshot.computeSize) {
                    w.computeSize = w.h4_snapshot.computeSize;
                } else {
                    delete w.computeSize;
                }

                w.hidden = false;
                if (w.inputEl) w.inputEl.style.display = "";
                w.h4_visible = true;
            };

            // --- MASTER REFRESH ---
            const refreshDrawers = () => {
                if (!node.widgets || node.widgets.length < 5) return;

                const val = (n) => {
                    const w = node.widgets.find(x => x.name === n);
                    return isTruthy(w?.value);
                };

                const s2 = val("enable_stage_2");
                const chaos = val("enable_chaos_engine");
                const extra = val("enable_extra_options");
                const chaosMode = node.widgets.find(w => w.name === "chaos_mode")?.value || "OFF";
                const cfgSlide = val("cfg_sliding_scale");

                // Title branding
                if (chaos) node.title = "h4_CHAOS ENGINE";
                else if (extra) node.title = "h4_Double_Sampler +";
                else if (s2) node.title = "Double Sampler";
                else node.title = "h4_Smart Sampler";

                // Determine visibility for each widget
                node.widgets.forEach(w => {
                    const n = w.name;
                    if (!ALL_DRAWER.includes(n)) return; // Skip base widgets

                    let shouldShow = false;

                    if (GROUPS.s2.includes(n)) {
                        shouldShow = s2;
                    } else if (GROUPS.chaos.includes(n)) {
                        shouldShow = chaos && (n === "chaos_every" ? chaosMode === "Every #nth number" : true);
                    } else if (GROUPS.extra.includes(n)) {
                        shouldShow = extra && (n === "cfg_end" ? cfgSlide : true);
                    }

                    if (shouldShow) {
                        showWidget(w);
                    } else {
                        hideWidget(w);
                    }
                });

                // Output pin visibility (extra pins for chaos diagnostics)
                for (let i = 3; i < node.outputs.length; i++) {
                    if (node.outputs[i]) {
                        node.outputs[i].hidden = !chaos;
                    }
                }

                // Force geometry recalculation
                const sz = node.computeSize();
                node.setSize([Math.max(node.size[0], 285), sz[1]]);
                app.graph.setDirtyCanvas(true, true);
            };

            // --- INITIAL HIDE ON SPAWN ---
            const initialHide = () => {
                if (!node.widgets || node.widgets.length < 5) return;
                node.widgets.forEach(w => {
                    if (ALL_DRAWER.includes(w.name)) hideWidget(w);
                });
                const sz = node.computeSize();
                node.setSize([Math.max(node.size[0], 285), sz[1]]);
            };

            initialHide();
            setTimeout(initialHide, 50);
            setTimeout(initialHide, 200);

            // --- BIND TOGGLE CALLBACKS ---
            const bindToggles = () => {
                if (!node.widgets) return;
                node.widgets.forEach(w => {
                    if (["enable_stage_2", "enable_chaos_engine", "enable_extra_options",
                        "chaos_mode", "cfg_sliding_scale"].includes(w.name) && !w.h4_bound) {
                        const origCB = w.callback;
                        w.callback = function (value) {
                            if (origCB) origCB.apply(this, arguments);
                            // Small delay to ensure ComfyUI has updated w.value
                            setTimeout(refreshDrawers, 10);
                        };
                        w.h4_bound = true;
                    }
                });
                refreshDrawers();
            };

            setTimeout(bindToggles, 100);
            setTimeout(bindToggles, 500);
            setTimeout(bindToggles, 1500);

            // --- CONFIGURE HOOK (Workflow Load) ---
            const origConfigure = node.onConfigure;
            node.onConfigure = function (data) {
                if (origConfigure) origConfigure.apply(this, arguments);
                setTimeout(refreshDrawers, 100);
                setTimeout(refreshDrawers, 500);
            };


        };
    }
});
