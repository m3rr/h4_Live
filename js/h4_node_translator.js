import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

/**
 * 🌐 H4 Node Translator (Atomic Hijack v5.0)
 * -----------------------------------------------------------------------------
 * CORE DOCTRINE: SATURATION.
 * This version uses the EXACT Discombobulator methodology to mutate the entire
 * ComfyUI ecosystem: DOM, Canvas (Nodes), and Console.
 */

const ID_TRANSLATOR = "H4_NodeTranslator";

app.registerExtension({
    name: "h4.NodeTranslator",

    _translations: null,
    _activeLang: null,
    _isActive: false,
    _hijackStyle: null,
    _uiObserver: null,
    _debounceTimer: null,
    _originalConsole: null,

    async setup() {
        console.log("%c🌐 [H4-TRANS] ATOMIC HIJACK v5.0 READY. (Saturation Pass Active)", "color: #00FF55; font-weight: bold; background: #000; padding: 2px;");

        // Monitoring loop (1s heartbeat)
        setInterval(() => this.checkTranslatorState().catch(e => console.error("[H4 Translator] Heartbeat Error:", e)), 1000);

        await this.loadTranslations();
    },

    async loadTranslations() {
        try {
            const resp = await api.fetchApi("/h4/translations");
            if (resp.ok) {
                this._translations = await resp.json();
            }
        } catch (e) {
            console.error("🌐 [H4 Translator] Dictionary Sync Failed:", e);
        }
    },

    async checkTranslatorState() {
        if (!app.graph) return;

        const translatorNode = app.graph.findNodesByType(ID_TRANSLATOR)?.[0];

        // 1. Check if Node Exists & is Enabled
        if (!translatorNode) {
            if (this._isActive) this.deactivateHijack();
            return;
        }

        const langWidget = translatorNode.widgets?.find(w => w.name === "language");
        const modeWidget = translatorNode.widgets?.find(w => w.name === "mode");

        if (!langWidget || !modeWidget || modeWidget.value === "Disabled") {
            if (this._isActive) this.deactivateHijack();
            return;
        }

        // 2. Parse Target Language
        const match = langWidget.value.match(/\((.*?)\)/);
        const langCode = match ? match[1] : null;
        if (!langCode) return;

        // 3. Activation / Re-Saturation
        if (langCode !== this._activeLang || !this._isActive) {
            if (this._isActive) this.revertEverything();

            this._activeLang = langCode;
            this._isActive = true;
            this.activateHijack();
        }

        // 4. Force Graph Polling (Canvas Saturation)
        this.applyGraphSaturation();
    },

    activateHijack() {
        this.injectHijackStyle();
        this.hijackConsole();
        this.startGlobalObserver();
    },

    deactivateHijack() {
        this._isActive = false;
        this.revertEverything();
        if (this._hijackStyle) { this._hijackStyle.remove(); this._hijackStyle = null; }
        if (this._originalConsole) {
            console.log = this._originalConsole.log;
            console.warn = this._originalConsole.warn;
            console.error = this._originalConsole.error;
            this._originalConsole = null;
        }
        if (this._uiObserver) { this._uiObserver.disconnect(); this._uiObserver = null; }
    },

    injectHijackStyle() {
        if (this._hijackStyle) return;
        this._hijackStyle = document.createElement("style");
        this._hijackStyle.id = "h4-hijack-font-css";
        this._hijackStyle.textContent = `
            /* Universal UI Font Override (The 'Hackerman' Aesthetic) */
            .comfy-menu, .comfy-side-bar, .dialog, .litegraph .context-menu, 
            .lite-searchbox, .comfy-modal, .h4-dashboard, button, select, input,
            .comfyui-button, .comfyui-menu button, .pixel-font,
            .side-bar-panel-container, .workflow-tab, .workspace-tab {
                font-family: 'Courier New', Courier, monospace !important;
                letter-spacing: -0.2px;
            }
            .comfy-queue-btn::after, .comfyui-queue-button::after {
                content: ' [H4_ATOMIC]';
                font-size: 8px;
                color: #00FF55;
                font-weight: bold;
            }
        `;
        document.head.appendChild(this._hijackStyle);
    },

    hijackConsole() {
        if (this._originalConsole) return;
        this._originalConsole = { log: console.log.bind(console), warn: console.warn.bind(console), error: console.error.bind(console) };
        const self = this;

        const interceptTranslate = (msg) => {
            if (typeof msg === 'string' && msg.length > 2) return self.translateText(msg);
            if (typeof msg === 'object' && msg !== null) {
                // Heuristic: attempt to translate object keys/values if they look like UI identifiers
                return msg;
            }
            return msg;
        };

        console.log = (...args) => self._originalConsole.log(...args.map(interceptTranslate));
        console.warn = (...args) => self._originalConsole.warn(...args.map(interceptTranslate));
        console.error = (...args) => self._originalConsole.error(...args.map(interceptTranslate));
    },

    startGlobalObserver() {
        if (this._uiObserver) return;
        this._uiObserver = new MutationObserver((mutations) => {
            if (!this._isActive) return;
            if (this._debounceTimer) clearTimeout(this._debounceTimer);
            this._debounceTimer = setTimeout(() => this.sweepDOM(document.body), 150);
        });

        this._uiObserver.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
        this.sweepDOM(document.body);
    },

    sweepDOM(root) {
        if (!this._isActive || !this._activeLang || !this._translations) return;

        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while (node = walker.nextNode()) {
            const raw = node.textContent;
            const text = raw.trim();
            if (text.length < 2 || /^\d+(\.\d+)?%?$/.test(text)) continue;

            // State check: Skip if already at latest translated value
            if (node._h4_current_val === raw) continue;

            const translated = this.translateText(text);
            if (translated !== text) {
                if (!node._h4_origin) node._h4_origin = raw;
                const final = raw.replace(text, translated);
                node.textContent = final;
                node._h4_current_val = final; // Track saturation
            }
        }
    },

    translateText(text) {
        if (!this._isActive || !this._activeLang || !this._translations) return text;
        const dict = this._translations["Global_UI"]?.[this._activeLang];
        if (!dict) return text;

        const lowerInput = text.trim().toLowerCase();

        // 1. Direct High-Priority Match
        for (const [key, val] of Object.entries(dict)) {
            if (key.toLowerCase() === lowerInput) return val;
        }

        // 2. Aggressive Phrase Substitution (Ordered by length descending)
        let result = text;
        let changed = false;
        const sortedKeys = Object.keys(dict).sort((a, b) => b.length - a.length);

        for (const key of sortedKeys) {
            const val = dict[key];
            // Mixed boundary logic for character-based languages (zh) vs alpha (en/fr)
            const isAlpha = /^[A-Za-z0-9\s]+$/.test(key);
            const pattern = isAlpha ? `\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b` : key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(pattern, "gi");

            if (regex.test(result)) {
                result = result.replace(regex, val);
                changed = true;
            }
        }

        return changed ? result : text;
    },

    /**
     * Aggressive Graph Saturation
     * Unlike previous versions, this ignores node.type and attempts to translate 
     * ALL titles and labels based on the Global_UI dictionary.
     */
    applyGraphSaturation() {
        if (!this._isActive || !app.graph) return;
        let changed = false;

        app.graph._nodes.forEach(node => {
            if (node.type === ID_TRANSLATOR) return;

            // 1. Translate Title
            const translatedTitle = this.translateText(node.title);
            if (translatedTitle !== node.title) {
                if (!node._h4_origin_title) node._h4_origin_title = node.title;
                node.title = translatedTitle;
                changed = true;
            }

            // 2. Translate Widgets
            if (node.widgets) {
                node.widgets.forEach(w => {
                    const currentLabel = w.label || w.name;
                    const translatedLabel = this.translateText(currentLabel);
                    if (translatedLabel !== currentLabel) {
                        if (!w._h4_origin_label) w._h4_origin_label = currentLabel;
                        w.label = translatedLabel;
                        changed = true;
                    }
                });
            }
        });

        if (changed) app.canvas.setDirty(true, true);
    },

    revertEverything() {
        console.log("🌐 [H4-TRANS] PURGING SATURATION...");

        // DOM Revert
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while (node = walker.nextNode()) {
            if (node._h4_origin) {
                node.textContent = node._h4_origin;
                delete node._h4_origin;
            }
            delete node._h4_current_val;
        }

        // Graph Revert
        if (app.graph) {
            app.graph._nodes.forEach(n => {
                if (n._h4_origin_title) { n.title = n._h4_origin_title; delete n._h4_origin_title; }
                if (n.widgets) {
                    n.widgets.forEach(w => {
                        if (w._h4_origin_label) { w.label = w._h4_origin_label; delete w._h4_origin_label; }
                    });
                }
            });
            app.canvas.setDirty(true, true);
        }
    }
});
