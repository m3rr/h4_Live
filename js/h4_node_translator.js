import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

// H4_NodeTranslator
// Scans the graph for "H4_NodeTranslator" nodes.
// If active, fetches translations and applies them to node titles and widgets.

const ID_TRANSLATOR = "H4_NodeTranslator";

app.registerExtension({
    name: "h4.NodeTranslator",

    // State
    _translations: null, // Cache
    _activeLang: null,
    _isActive: false,
    _lastCheck: 0,

    async setup() {
        console.log("🌐 H4 Node Translator Loaded.");

        // Use arrow function in setInterval to preserve 'this'
        setInterval(() => this.checkTranslatorState(), 1000);
    },

    async checkTranslatorState() {
        if (!app.graph) return;

        // Find our control node
        const translatorNode = app.graph.findNodesByType(ID_TRANSLATOR)?.[0];

        if (!translatorNode) {
            if (this._isActive) {
                this.revertTranslations();
            }
            this._isActive = false;
            return;
        }

        // Get settings
        const langWidget = translatorNode.widgets?.find(w => w.name === "language");
        const modeWidget = translatorNode.widgets?.find(w => w.name === "mode");

        if (!langWidget || !modeWidget) return;

        const mode = modeWidget.value;
        if (mode === "Disabled") {
            if (this._isActive) this.revertTranslations();
            this._isActive = false;
            return;
        }

        // Parse Language (e.g., "Spanish (es)" -> "es")
        const langRaw = langWidget.value;
        const match = langRaw.match(/\((.*?)\)/);
        const langCode = match ? match[1] : null;

        if (!langCode) return;

        // If language changed or just activated
        if (langCode !== this._activeLang || !this._isActive) {
            console.log(`🌐 [H4 Translator] Activating Language: ${langCode}`);
            this._activeLang = langCode;
            this._isActive = true;

            if (!this._translations) {
                await this.loadTranslations();
            }
        }

        // Continuously apply for new nodes
        this.applyTranslations();
    },

    async loadTranslations() {
        try {
            const resp = await api.fetchApi("/h4/translations");
            if (resp.ok) {
                this._translations = await resp.json();
                console.log(`🌐 [H4 Translator] Loaded definition data keys: ${Object.keys(this._translations).length}`);
            }
        } catch (e) {
            console.error("🌐 [H4 Translator] Failed to load translations:", e);
        }
    },

    applyTranslations() {
        if (!this._translations || !this._isActive || !app.graph) return;

        const lang = this._activeLang;

        app.graph._nodes.forEach(node => {
            // Skip the translator itself
            if (node.type === ID_TRANSLATOR) return;

            // Look up node type in dictionary
            const def = this._translations[node.type];
            if (!def || !def[lang]) return;

            const target = def[lang];

            // 1. Translate Title
            // Store original title if not stored (and if it matches current title/type to avoid overwriting manual renames)
            // Logic: If node.title == node.type, it's default. If user modified it, do we translate?
            // User Discussion said: "Translating Node Titles is safe".
            // Let's assume we translate whatever matches the standard name? 
            // OR strictly overwrite?
            // Safest: Store original. Overwrite.

            if (!node._h4_original_title) node._h4_original_title = node.title;

            // Only update if target title is defined
            if (target.title && node.title !== target.title) {
                node.title = target.title;
            }

            // 2. Translate Widgets (Visual Label Only)
            if (target.widgets && node.widgets) {
                node.widgets.forEach(w => {
                    const translatedLabel = target.widgets[w.name]; // Match by internal identifier name
                    if (translatedLabel) {
                        // Store original label if not set
                        if (!w._h4_original_label) w._h4_original_label = w.label || w.name;

                        // Set the display label
                        if (w.label !== translatedLabel) {
                            w.label = translatedLabel;
                        }
                    }
                });
            }
        });

        // Force redraw
        app.graph.setDirtyCanvas(true, true);
    },

    revertTranslations() {
        if (!app.graph) return;
        console.log("🌐 [H4 Translator] Reverting translations...");

        app.graph._nodes.forEach(node => {
            // Restore Title
            if (node._h4_original_title) {
                node.title = node._h4_original_title;
                delete node._h4_original_title;
            }

            // Restore Widgets
            if (node.widgets) {
                node.widgets.forEach(w => {
                    if (w._h4_original_label) {
                        w.label = w._h4_original_label;
                        delete w._h4_original_label;
                    }
                });
            }
        });

        app.graph.setDirtyCanvas(true, true);
    }
});
