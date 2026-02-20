import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

// ------------------------------------------------------------------------------
// H4 Sidebar - Entry Point for the Dashboard
// ------------------------------------------------------------------------------

export const h4_Sidebar = {
    button: null,

    init() {
        console.log("[h4] Sidebar Init (ANCHOR MODE v2)...");

        // We look for the Caffeine button from h4_BigBrother
        // It usually loads around the same time.
        const check = setInterval(() => {
            const caffeineBtn = document.getElementById("h4-caffeine-toggle");

            if (caffeineBtn) {
                console.log("[h4] Found Caffeine Button! Anchoring...");
                clearInterval(check);
                this.createAnchorButton(caffeineBtn);
            }
        }, 500);

        // Fallback: If BigBrother isn't running or button not found after 5s
        setTimeout(() => {
            if (!this.button) {
                console.warn("[h4] Caffeine button not found. Floating Top-Right.");
                clearInterval(check);
                this.createFloatingButton();
            }
        }, 5000);
    },

    createAnchorButton(anchor) {
        // Caffeine: 140px. 
        // User said 60px was "way too far over".
        // Let's try 100px (40px gap).

        this.createButton(document.body, {
            right: "100px",
            top: "5px"
        });
    },

    createFloatingButton() {
        // Fallback position
        this.createButton(document.body, {
            right: "100px",
            top: "5px"
        });
    },

    createButton(container, pos) {
        if (this.button) this.button.remove();

        const btn = document.createElement("div");
        btn.id = "h4-sidebar-button";
        btn.title = "Open h4 Live Dashboard";

        // Toolbar Style
        Object.assign(btn.style, {
            position: "fixed",
            top: pos.top,
            right: pos.right,
            zIndex: "9999",
            cursor: "pointer",
            width: "30px", // Fixed Dimensions
            height: "22px", // Matching neighboring buttons height
            background: "rgba(0,0,0,0.5)",
            borderRadius: "4px",
            border: "1px solid #333",
            userSelect: "none",
            boxShadow: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.1s"
        });

        // Image Icon
        const img = document.createElement("img");
        // Robust dynamic path:
        img.src = new URL("./assets/h4_icon.png", import.meta.url).href;

        Object.assign(img.style, {
            width: "18px",
            height: "18px",
            objectFit: "contain",
            opacity: "0.9"
        });

        img.onerror = () => {
            console.warn("[h4] Sidebar Icon failed. Fallback to text.");
            img.style.display = "none";
            btn.textContent = "h4";
            btn.style.color = "#00ff55";
            btn.style.fontFamily = "monospace";
            btn.style.fontWeight = "bold";
            btn.style.fontSize = "14px";
            btn.style.padding = "0 4px";
        };

        btn.appendChild(img);

        // Click Event
        btn.onclick = (e) => {
            e.stopPropagation();
            if (window.h4_Dashboard) {
                window.h4_Dashboard.toggle();
            } else {
                console.error("[h4] Sidebar click: h4_Dashboard global is missing!");
                alert("Dashboard not initialized (window.h4_Dashboard missing). Check console for errors.");
            }
        };

        // Hover
        btn.onmouseenter = () => {
            btn.style.borderColor = "#00ff55";
            btn.style.boxShadow = "0 0 5px #00ff55";
            img.style.opacity = "1";
        };
        btn.onmouseleave = () => {
            btn.style.borderColor = "#333";
            btn.style.boxShadow = "none";
            img.style.opacity = "0.9";
        };

        document.body.appendChild(btn);
        this.button = btn;
        console.log("[h4] Button created at:", pos);
    }
};

app.registerExtension({
    name: "h4.Sidebar",
    setup() {
        h4_Sidebar.init();
    }
});
