import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

// ------------------------------------------------------------------------------
// H4 Visual Tokenizer - Frontend
// ------------------------------------------------------------------------------

const STYLE = `
.h4-tokenizer-container {
    background: #1a1a1a;
    border: 2px solid #333;
    color: #eee;
    font-family: monospace;
    padding: 10px;
    width: 100%;
    min-width: 400px; /* Force some width */
    max-width: 800px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
}

.h4-token-list {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 10px;
    max-height: 400px;
    overflow-y: auto;
    padding: 5px;
    background: #111;
    border-radius: 4px;
}

.h4-token-chip {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 14px;
    cursor: default;
    border: 1px solid rgba(255,255,255,0.1);
    transition: all 0.2s;
    position: relative;
    color: #fff;
    text-shadow: 0 1px 2px rgba(0,0,0,0.8);
}

.h4-token-chip:hover {
    transform: translateY(-2px);
    border-color: #fff;
    z-index: 10;
    box-shadow: 0 4px 8px rgba(0,0,0,0.5);
}

/* Tooltip on hover using pseudo-element or title? 
   Let's use a dedicated details panel instead for robustness. */

.h4-token-stats {
    border-top: 1px solid #444;
    padding-top: 5px;
    font-size: 12px;
    color: #888;
    height: 20px;
    display: flex;
    justify-content: space-between;
}

.h4-token-limit-bar {
    height: 4px;
    background: #333;
    margin-top: 8px;
    border-radius: 2px;
    overflow: hidden;
    position: relative;
}

.h4-token-limit-fill {
    height: 100%;
    background: #0f0;
    width: 0%;
    transition: width 0.5s;
}

.h4-token-chip.special {
    font-style: italic;
    opacity: 0.7;
    border-style: dashed;
}
`;

// Inject Styles
const styleEl = document.createElement("style");
styleEl.textContent = STYLE;
document.head.appendChild(styleEl);

app.registerExtension({
    name: "h4.VisualTokenizer",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "H4_VisualTokenizer") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;

            nodeType.prototype.onNodeCreated = function () {
                if (onNodeCreated) onNodeCreated.apply(this, arguments);

                // Initialize UI
                const ui = new TokenizerUI(this);
                this.tokenizerUI = ui;

                if (this.addDOMWidget) {
                    this.addDOMWidget("h4_tokenizer_ui", "custom", ui.container, {
                        serialize: false,
                        hideOnZoom: false
                    });
                }

                // Set default size
                this.setSize([600, 300]);
            };
        }
    }
});

class TokenizerUI {
    constructor(node) {
        this.node = node;

        // --- DOM Construction ---
        this.container = document.createElement("div");
        this.container.className = "h4-tokenizer-container";

        // Token List Area
        this.list = document.createElement("div");
        this.list.className = "h4-token-list";
        this.list.textContent = "Waiting for run...";

        // Stats Footer
        this.stats = document.createElement("div");
        this.stats.className = "h4-token-stats";
        this.stats.innerHTML = "<span>Token Count: 0/75</span> <span id='hover-info'>Hover a token</span>";

        // Limit Bar
        this.limitBar = document.createElement("div");
        this.limitBar.className = "h4-token-limit-bar";
        this.limitFill = document.createElement("div");
        this.limitFill.className = "h4-token-limit-fill";
        this.limitBar.appendChild(this.limitFill);

        this.container.appendChild(this.list);
        this.container.appendChild(this.limitBar);
        this.container.appendChild(this.stats);

        // --- Event Listener ---
        this.onUpdate = (e) => {
            if (String(e.detail.node_id) === String(this.node.id)) {
                this.render(e.detail);
            }
        };
        api.addEventListener("h4.visual_tokenizer.update", this.onUpdate);
    }

    render(data) {
        // data = { tokens: [{token, id, weight}, ...], count: int }
        this.list.innerHTML = "";

        // Update Count
        const count = data.count || 0;
        const limit = 75; // Standard CLIP-L batch limit usually
        const percentage = Math.min(100, (count / limit) * 100);

        this.limitFill.style.width = `${percentage}%`;
        // Color based on limit
        if (count > limit) {
            this.limitFill.style.background = "#f00";
            this.stats.innerHTML = `<span style='color:#f00'>Token Count: ${count}/${limit} (TRUNCATED)</span> <span id='hover-info'></span>`;
        } else {
            this.limitFill.style.background = "#0f0";
            this.stats.innerHTML = `<span>Token Count: ${count}/${limit}</span> <span id='hover-info'></span>`;
        }

        const infoSpan = this.container.querySelector("#hover-info");

        // Render Chips
        data.tokens.forEach(t => {
            const chip = document.createElement("div");
            chip.className = "h4-token-chip";
            chip.textContent = t.token;

            // Calculate Color based on Weight
            // 1.0 = Grey (#888)
            // > 1.0 = Red
            // < 1.0 = Blue

            const w = t.weight;
            let bgColor = "rgba(80, 80, 80, 0.6)"; // Default (Grey)

            if (w >= 1.35) {
                // RED Heatmap (Hot)
                const intensity = Math.min(1, (w - 1.35) * 2);
                const r = 200 + (55 * intensity);
                bgColor = `rgba(${r}, 40, 40, ${0.4 + (0.6 * intensity)})`;
                chip.style.fontWeight = "bold";

            } else if (w >= 1.05) {
                // GREEN Heatmap (Boosted)
                // 1.05 -> 1.35
                const intensity = Math.min(1, (w - 1.05) * 3);
                // Dark Green to Bright Green
                bgColor = `rgba(40, ${150 + (100 * intensity)}, 40, ${0.4 + (0.4 * intensity)})`;

            } else if (w <= 0.95) {
                // BLUE Heatmap (Cold)
                const intensity = Math.min(1, (1.0 - w) * 2);
                const b = 180 + (75 * intensity);
                bgColor = `rgba(40, 40, ${b}, ${0.4 + (0.4 * intensity)})`;
                chip.style.opacity = 0.8;
            }

            if (t.id < 0) {
                // Error token
                chip.style.borderColor = "red";
                chip.style.textDecoration = "line-through";
            }

            // Special Tokens handling (optional, e.g. start/end)
            if (t.token === "<|startoftext|>" || t.token === "<|endoftext|>") {
                chip.classList.add("special");
            }

            chip.style.backgroundColor = bgColor;

            // Hover logic
            chip.onmouseenter = () => {
                infoSpan.textContent = `Token: "${t.token}" | ID: ${t.id} | Weight: ${t.weight.toFixed(4)}`;
                infoSpan.style.color = "#fff";
            };
            chip.onmouseleave = () => {
                infoSpan.textContent = "";
            };

            this.list.appendChild(chip);
        });
    }
}
