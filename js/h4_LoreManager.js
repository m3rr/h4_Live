import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

// H4 Lore Manager - "The Book of H4"
// Handles the Help Drawer Logic for all H4 Nodes

const LORE_FILE_PATH = "h4_smart_save/Lore/The_Book_of_H4.json";
let LORE_DATA = null;

app.registerExtension({
    name: "h4.LoreManager",

    async setup() {
        // Fetch Lore Data once at startup (or lazy load?)
        // Since we need to know WHICH nodes have lore to add the button, let's fetch first.
        // Actually, we can just check if node starts with "H4_" and fetch on click.
        // But the "white list" approach is safer.
        console.log("[H4_LoreManager] Setup complete.");
    },

    async nodeCreated(node, app) {
        // Check if node is H4 - Skip Oxidine (Nuclear Silence requested)
        if (!node.comfyClass || !node.comfyClass.startsWith("H4_") || node.comfyClass === "H4_Oxidine") return;

        // Custom Help Button Draw Logic
        const originalOnDrawForeground = node.onDrawForeground;

        node.onDrawForeground = function (ctx) {
            if (originalOnDrawForeground) originalOnDrawForeground.apply(this, arguments);

            if (this.flags.collapsed) return;

            // Draw (?) Icon in Title Bar (Top Right)
            // LiteGraph node 0,0 is top-left of body content.
            // Title bar is above, negative Y.
            const titleHeight = LiteGraph.NODE_TITLE_HEIGHT || 30;
            const iconX = this.size[0] - 15;
            const iconY = - (titleHeight / 2); // Center of title bar

            ctx.save();
            ctx.font = "12px sans-serif";
            ctx.fillStyle = "rgba(255, 255, 255, 0.8)"; // Brighter for title bar
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("?", iconX, iconY);

            // Circle
            ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(iconX, iconY, 8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        };

        // Click Handler
        const originalOnMouseDown = node.onMouseDown;

        node.onMouseDown = function (event, pos, graphCanvas) {
            // Check if click is on (?) icon
            const titleHeight = LiteGraph.NODE_TITLE_HEIGHT || 30;
            const iconX = this.size[0] - 15;
            const iconY = - (titleHeight / 2);

            const dist = Math.sqrt(Math.pow(pos[0] - iconX, 2) + Math.pow(pos[1] - iconY, 2));

            if (dist < 10) {
                // Open Lore Drawer
                // Prevent default drag
                event.stopImmediatePropagation(); // Doesn't exist on LiteGraph events?
                // But return true/false handling?

                openLoreDrawer(this.comfyClass);
                return true; // Capture event
            }

            if (originalOnMouseDown) return originalOnMouseDown.apply(this, arguments);
        };
    }
});

async function openLoreDrawer(nodeClass) {
    // 1. Fetch Data if not loaded
    if (!LORE_DATA) {
        try {
            // We can't fetch local files directly via JS in browser easily without an API endpoint.
            // But we can use api.getItems? No.
            // We'll assume the JSON is served or we use a custom API endpoint.
            // Wait, ComfyUI doesn't serve custom node files by default unless in 'js' or via endpoint.
            // 'The_Book_of_H4.json' is in 'h4_smart_save/Lore/'.
            // I might need to make a python endpoint to serve it.
            // OR move it to 'js/' folder?
            // "js/The_Book_of_H4.json" would be accessible via /extensions/comfyui_h4_live/The_Book_of_H4.json

            // For now, let's try fetching via API if I added one? No.
            // I'll move the JSON to the `js` folder or create an endpoint.
            // The file structure shows it in `h4_smart_save/Lore/`.
            // I will create a simple endpoint in `__init__.py` or `h4_server.py` to serve it.
            // OR simpler: Move it to `js/`.
            // User put it in `h4_smart_save/Lore/`. I should respect that.
            // I will implement a fetch in Python via `H4_SmartSave` (it handles IO).

            const response = await api.fetchApi("/h4/lore", { method: "GET" });

            if (response.status !== 200) {
                let errText = `Status ${response.status}`;
                try {
                    const errJson = await response.json();
                    errText = errJson.error || errText;
                } catch (e) {
                    try { errText = await response.text(); } catch (e2) { }
                }
                throw new Error(errText);
            }

            LORE_DATA = await response.json();
        } catch (e) {
            console.error("[H4_Lore] Failed to load Book of H4:", e);
            alert(`The Book of H4 could not be opened.\n\nError: ${e.message}\n\nCheck the console for more details.`);
            return;
        }
    }

    const entry = LORE_DATA[nodeClass];
    if (!entry) {
        alert("This page of The Book of H4 is currently blank. (No documentation found for " + nodeClass + ")");
        return;
    }

    // 2. Create Modal / Drawer
    // Re-use existing drawer style if possible, or create new.
    // Let's create a dedicated overlay.

    const id = "h4-lore-drawer";
    let drawer = document.getElementById(id);
    if (drawer) drawer.remove();

    drawer = document.createElement("div");
    drawer.id = id;
    Object.assign(drawer.style, {
        position: "fixed",
        top: "0",
        right: "0",
        width: "400px",
        height: "100%",
        background: "rgba(20, 20, 30, 0.95)",
        backdropFilter: "blur(10px)",
        borderLeft: "1px solid rgba(255, 255, 255, 0.1)",
        zIndex: "10000",
        display: "flex",
        flexDirection: "column",
        transition: "transform 0.3s ease",
        transform: "translateX(100%)", // Start hidden
        color: "#eee",
        fontFamily: "sans-serif",
        boxShadow: "-10px 0 30px rgba(0,0,0,0.5)"
    });

    // Content
    const content = document.createElement("div");
    Object.assign(content.style, {
        padding: "20px",
        overflowY: "auto",
        height: "100%"
    });

    // Header
    content.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid #444; padding-bottom:10px;">
            <h2 style="margin:0; font-size:1.4em; color:#fff;">${entry.title || nodeClass}</h2>
            <button id="h4-lore-close" style="background:none; border:none; color:#888; font-size:1.5em; cursor:pointer;">&times;</button>
        </div>
        
        <div style="margin-bottom:20px; font-style:italic; color:#aaa;">
            ${entry.description || "No description."}
        </div>

        ${entry.usage ? `
        <div style="margin-bottom:20px; background:rgba(255,255,255,0.05); padding:10px; border-radius:5px;">
            <strong style="color:#8f8;">Usage Scenario:</strong><br>
            ${entry.usage}
        </div>` : ""}

        ${entry.inputs ? renderTable("Inputs", entry.inputs) : ""}
        ${entry.outputs ? renderOutputs(entry.outputs) : ""}
        ${entry.features ? renderFeatures(entry.features) : ""}
        
        ${entry.tips && entry.tips.length > 0 ? `
        <div style="margin-top:20px;">
            <h3 style="color:#fe8; border-bottom:1px solid #554; padding-bottom:5px;">💡 Pro Tips</h3>
            <ul style="padding-left:20px; color:#ddd;">
                ${entry.tips.map(t => `<li>${t}</li>`).join("")}
            </ul>
        </div>` : ""}
    `;

    drawer.appendChild(content);
    document.body.appendChild(drawer);

    // Close logic
    drawer.querySelector("#h4-lore-close").onclick = () => {
        drawer.style.transform = "translateX(100%)";
        setTimeout(() => drawer.remove(), 300);
    };

    // Close on click outside? (Optional)

    // Slides in
    requestAnimationFrame(() => {
        drawer.style.transform = "translateX(0)";
    });
}

function renderTable(title, inputs) {
    let html = `<h3 style="color:#acf; border-bottom:1px solid #554; padding-bottom:5px;">${title}</h3>`;
    html += `<table style="width:100%; border-collapse:collapse; font-size:0.9em;">`;
    html += `<tr style="text-align:left; color:#888;"><th style="padding:5px;">Name</th><th style="padding:5px;">Description</th></tr>`;

    for (const [key, val] of Object.entries(inputs)) {
        html += `
        <tr style="border-bottom:1px solid #333;">
            <td style="padding:8px; vertical-align:top; color:#cdf; font-family:monospace;">${key}</td>
            <td style="padding:8px; vertical-align:top;">
                <div style="color:#ddd;">${val.description}</div>
                ${val.example ? `<div style="color:#666; font-size:0.8em; margin-top:4px;">Ex: ${val.example}</div>` : ""}
            </td>
        </tr>`;
    }

    html += `</table>`;
    return html;
}

function renderOutputs(outputs) {
    let html = `<h3 style="color:#fac; border-bottom:1px solid #554; padding-bottom:5px;">Outputs</h3>`;
    html += `<ul style="padding-left:20px;">`;
    for (const [key, val] of Object.entries(outputs)) {
        html += `<li style="margin-bottom:8px;"><strong style="color:#fac; font-family:monospace;">${key}</strong>: ${val}</li>`;
    }
    html += `</ul>`;
    return html;
}

function renderFeatures(features) {
    let html = `<h3 style="color:#afa; border-bottom:1px solid #554; padding-bottom:5px;">Key Features</h3>`;
    for (const feat of features) {
        html += `
        <div style="margin-bottom:12px;">
            <strong style="color:#afa;">${feat.name}</strong>
            <div style="color:#ccc; padding-left:10px;">${feat.description}</div>
        </div>`;
    }
    return html;
}
