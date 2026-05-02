import { app } from "../../scripts/app.js";

export const h4_Sidebar = {
    button: null,

    init() {
        console.log("[h4] Sidebar Init — Native Anchor Mode v7");
        this._tryInsert();
    },

    _tryInsert() {
        const anchor =
            document.querySelector(".bg-comfy-menu-bg") ||
            document.querySelector(".side-tool-bar-end");

        if (anchor) {
            if (this.button) this.button.remove();
            const btn = this._buildButton();
            anchor.appendChild(btn);
            this.button = btn;
            this._tryPositionNearCaffeine(anchor);
            console.log("[h4] Dashboard button inserted ?");
            return;
        }
        setTimeout(() => this._tryInsert(), 300);
    },

	_tryPositionNearCaffeine(anchor) {
		let attempts = 0;
		const interval = setInterval(() => {
			attempts++;
			const caf = document.getElementById("h4-caffeine-toggle");
			if (caf) {
				const cafRect = caf.getBoundingClientRect();
				// Position our button as fixed, right beside caffeine
				this.button.style.position = "fixed";
				this.button.style.left = (cafRect.right + 4) + "px";
				this.button.style.top = cafRect.top + "px";
				this.button.style.height = cafRect.height + "px";
				this.button.style.zIndex = "9000";
				// Remove from toolbar, attach to body
				this.button.remove();
				document.body.appendChild(this.button);
				console.log("[h4] Dashboard button: fixed beside Caffeine ?");
				clearInterval(interval);
				return;
			}
			if (attempts > 40) {
				console.log("[h4] Dashboard button: settled in toolbar ?");
				clearInterval(interval);
			}
		}, 250);
	},

    _buildButton() {
        const btn = document.createElement("div");
        btn.id = "h4-sidebar-button";
        btn.title = "Open h4 Live Dashboard";

        Object.assign(btn.style, {
            cursor: "pointer",
            width: "36px",       // was 30px, +20%
            height: "26px",      // was 22px, +20%
            background: "rgba(0,0,0,0.5)",
            borderRadius: "4px",
            border: "1px solid #333",
            userSelect: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.1s",
            flexShrink: "0",
            margin: "0 2px",
        });

        const img = document.createElement("img");
        img.src = new URL("./assets/h4_logo.png", import.meta.url).href;
        Object.assign(img.style, {
            width: "22px",       // was 18px, +20%
            height: "22px",
            objectFit: "contain",
            opacity: "0.9",
        });
        img.onerror = () => {
            img.style.display = "none";
            btn.textContent = "h4";
            Object.assign(btn.style, {
                color: "#00f2ff",
                fontFamily: "monospace",
                fontWeight: "bold",
                fontSize: "13px",  // was 11px, +20%
                padding: "0 4px",
                width: "auto",
            });
        };
        btn.appendChild(img);

        btn.onclick = (e) => {
            e.stopPropagation();
            const dash = window.h4_Dashboard;
            if (!dash?.modal) return;
            const isOpen = dash.modal.classList.contains("open");
            if (isOpen) {
                dash.modal.classList.remove("open");
                setTimeout(() => {
                    if (!dash.modal.classList.contains("open"))
                        dash.modal.style.display = "none";
                }, 300);
            } else {
                dash.modal.style.display = "flex";
                requestAnimationFrame(() => dash.modal.classList.add("open"));
                if (!dash._renderedTabs?.has(dash.activeTab)) {
                    dash.renderTab?.(dash.activeTab);
                    dash._renderedTabs?.add(dash.activeTab);
                }
            }
        };

        btn.onmouseenter = () => {
            btn.style.borderColor = "#00f2ff";
            btn.style.boxShadow = "0 0 5px #00f2ff";
        };
        btn.onmouseleave = () => {
            btn.style.borderColor = "#333";
            btn.style.boxShadow = "none";
        };

        return btn;
    },
};

app.registerExtension({
    name: "h4.Sidebar",
    setup() { h4_Sidebar.init(); },
});