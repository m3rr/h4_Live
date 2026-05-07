import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

/**
 * ⚡ H4 Mission Control — Live Batch Dashboard v1.1.0
 * -----------------------------------------------------------------------------
 * A sovereign real-time generation monitor and wireless synchronization engine.
 * 
 * Includes:
 * 1. Live Dashboard HUD (Floating/Docked/Popout)
 * 2. Resource Forensics (VRAM/RAM)
 * 3. Wireless Seed Synchronization Kernel
 */

// ============================================================================
// 1. MODULE STATE (SINGLE SOURCE OF TRUTH)
// ============================================================================
const mcState = {
    initialized: false,
    open: false,
    mode: 'float',        // 'float' | 'docked' | 'badge'
    lastMode: 'float',
    floatPos: { left: null, top: null },
    floatSize: { width: 400, height: 560 },

    // WebSocket
    ws: null,
    wsState: 'disconnected',
    wsClientId: crypto.randomUUID(),
    wsReconnectAttempt: 0,

    // Live job tracking
    currentPromptId: null,
    jobStartTime: null,
    currentStep: 0,
    totalSteps: 0,
    lastProgressTimestamp: null,
    currentNodeId: null,
    previewObjectUrl: null,

    // Data
    queueRunning: [],
    queuePending: [],
    history: [],
    genTimes: [],

    // Popout
    popoutWin: null,
    popoutCheckInterval: null,

    // Polling intervals
    statsInterval: null,
    queueInterval: null,
    heartbeatInterval: null,

    // UI Cache
    canvMarginSet: false
};

// ============================================================================
// 2. CSS & VISUAL IDENTITY
// ============================================================================
function injectStyles() {
    if (document.getElementById("h4mc-styles")) return;
    const style = document.createElement("style");
    style.id = "h4mc-styles";
    style.textContent = `
        :root {
            --h4mc-bg: #0f0f0f;
            --h4mc-surface: #171717;
            --h4mc-border: rgba(255,255,255,0.08);
            --h4mc-text: #e0e0e0;
            --h4mc-text-muted: #888;
            --h4mc-accent: #00f2ff;
            --h4mc-accent-glow: rgba(0, 242, 255, 0.15);
            --h4mc-success: #66bb6a;
            --h4mc-warning: #ffa726;
            --h4mc-error: #ef5350;
            --h4mc-radius: 6px;
            --h4mc-font: 'Segoe UI', 'Inter', system-ui, sans-serif;
            --h4mc-font-mono: 'Consolas', 'Monaco', monospace;
        }

        #h4mc-root {
            position: fixed;
            z-index: 9500;
            font-family: var(--h4mc-font);
            color: var(--h4mc-text);
            pointer-events: none;
        }

        #h4mc-panel {
            position: absolute;
            background: var(--h4mc-bg);
            border: 1px solid var(--h4mc-border);
            border-radius: var(--h4mc-radius);
            box-shadow: 0 10px 50px rgba(0,0,0,0.8);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            pointer-events: auto;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        #h4mc-header {
            height: 36px;
            background: var(--h4mc-surface);
            border-bottom: 1px solid var(--h4mc-border);
            display: flex;
            align-items: center;
            padding: 0 10px;
            cursor: grab;
            user-select: none;
        }

        #h4mc-header:active { cursor: grabbing; }

        .h4mc-header-title {
            font-size: 11px;
            font-weight: 900;
            letter-spacing: 1.5px;
            color: var(--h4mc-accent);
            flex: 1;
            text-transform: uppercase;
        }

        #h4mc-body {
            flex: 1;
            padding: 12px;
            overflow-y: auto;
            scrollbar-width: thin;
            scrollbar-color: var(--h4mc-border) transparent;
        }

        .h4mc-btn {
            background: none; border: none; color: var(--h4mc-text-muted); cursor: pointer;
            width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
            border-radius: 4px; transition: all 0.2s;
        }
        .h4mc-btn:hover { color: var(--h4mc-text); background: rgba(255,255,255,0.05); }
        .h4mc-btn.active { color: var(--h4mc-accent); }

        /* Meters */
        .h4mc-meter { margin-bottom: 12px; }
        .h4mc-meter-label { display:flex; justify-content:space-between; font-size:10px; margin-bottom:4px; color:var(--h4mc-text-muted); }
        .h4mc-meter-track { height:4px; background:#222; border-radius:2px; overflow:hidden; }
        .h4mc-meter-fill { height:100%; width:0; transition:width 0.5s ease; }

        /* Active Job Card */
        #h4mc-active-job {
            background: var(--h4mc-surface);
            border-radius: var(--h4mc-radius);
            padding: 10px;
            margin-bottom: 12px;
            display: flex;
            gap: 12px;
        }

        #h4mc-job-preview {
            width: 96px; height: 96px; background: #111;
            border-radius: 4px; object-fit: cover; border: 1px solid var(--h4mc-border);
        }

        /* Heartbeat Banner */
        #h4mc-heartbeat-banner {
            height: 0; overflow: hidden; transition: height 0.3s;
            font-size: 11px; text-align: center; font-weight: bold;
            display: flex; align-items: center; justify-content: center;
        }
        #h4mc-heartbeat-banner.visible { height: 28px; margin-bottom: 12px; }

        /* Launcher */
        #h4mc-launcher {
            display: flex; align-items: center; gap: 6px; padding: 0 10px;
            cursor: pointer; border-left: 1px solid var(--h4mc-border); transition: all 0.2s;
        }
        #h4mc-launcher:hover { background: rgba(255,255,255,0.05); }
        #h4mc-launcher.active { color: var(--h4mc-accent); }

        .h4mc-badge { font-size: 11px; font-weight: bold; font-family: var(--h4mc-font-mono); }
        .h4mc-live-dot { width: 6px; height: 6px; background: var(--h4mc-success); border-radius: 50%; opacity: 0.8; }

        #h4mc-resize-grip { position: absolute; width: 12px; height: 12px; bottom: 0; right: 0; cursor: nwse-resize; }
    `;
    document.head.appendChild(style);
}

// ============================================================================
// 3. API & DATA CORE
// ============================================================================
async function h4mcFetch(path) {
    try {
        const res = await fetch(path);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) { return null; }
}

function handleWSMessage(msg) {
    if (!msg || !msg.type) return;

    switch (msg.type) {
        case "status":
            updateLauncherCount(msg.data.status.exec_info.queue_remaining);
            break;
        case "execution_start":
            mcState.currentPromptId = msg.data.prompt_id;
            mcState.jobStartTime = Date.now();
            mcState.currentStep = 0;
            updateJobUI(true);
            break;
        case "executing":
            mcState.currentNodeId = msg.data.node;
            updateJobUI(msg.data.node !== null);
            break;
        case "progress":
            mcState.currentStep = msg.data.value;
            mcState.totalSteps = msg.data.max;
            mcState.lastProgressTimestamp = Date.now();
            updateJobUI(true);
            break;
        case "execution_complete":
            updateJobUI(false);
            fetchHistory(); fetchQueue();
            break;
        case "execution_error":
            showHeartbeatBanner(`✕ ERROR: ${msg.data.exception_message.slice(0, 80)}...`, 'error');
            updateJobUI(false);
            break;
    }
}

// ============================================================================
// 4. UI CONSTRUCTION
// ============================================================================
function buildPanel() {
    const root = document.createElement("div");
    root.id = "h4mc-root";
    root.style.display = "none";

    const panel = document.createElement("div");
    panel.id = "h4mc-panel";
    panel.style.width = mcState.floatSize.width + "px";
    panel.style.height = mcState.floatSize.height + "px";
    panel.style.right = "20px";
    panel.style.bottom = "20px";

    panel.innerHTML = `
        <div id="h4mc-header">
            <span style="margin-right:12px; opacity:0.5;">≡</span>
            <span class="h4mc-header-title">⚡ MISSION CONTROL</span>
            <button class="h4mc-btn" data-mode="float" title="Float">✥</button>
            <button class="h4mc-btn" data-mode="docked" title="Dock">◫</button>
            <button class="h4mc-btn" data-mode="popout" title="Popout">❐</button>
            <button class="h4mc-btn" id="h4mc-close" title="Close" style="margin-left:5px;">×</button>
        </div>
        <div id="h4mc-body">
            <div id="h4mc-heartbeat-banner"></div>
            
            <div id="h4mc-stats-bar">
                <div class="h4mc-meter" id="h4mc-vram">
                    <div class="h4mc-meter-label"><span>VRAM</span> <span class="val">-- / -- GB</span></div>
                    <div class="h4mc-meter-track"><div class="h4mc-meter-fill"></div></div>
                </div>
                <div class="h4mc-meter" id="h4mc-ram">
                    <div class="h4mc-meter-label"><span>RAM</span> <span class="val">-- / -- GB</span></div>
                    <div class="h4mc-meter-track"><div class="h4mc-meter-fill"></div></div>
                </div>
            </div>

            <div id="h4mc-active-job" style="display:none;">
                <img id="h4mc-job-preview" style="width:96px; height:96px; border-radius:4px; object-fit:cover;" />
                <div style="flex:1;">
                    <div style="display:flex; justify-content:space-between; font-size:10px; margin-bottom:4px;">
                        <span id="h4mc-progress-text">IDLE</span>
                        <span id="h4mc-progress-pct">0%</span>
                    </div>
                    <div class="h4mc-meter-track" style="margin-bottom:8px;">
                        <div id="h4mc-progress-fill" class="h4mc-meter-fill" style="background:var(--h4mc-accent);"></div>
                    </div>
                    <div style="font-size:10px; color:var(--h4mc-text-muted); line-height:1.3;">
                        <div id="h4mc-job-node">--</div>
                        <div id="h4mc-job-time">0:00</div>
                        <div id="h4mc-job-eta">ETA: --</div>
                    </div>
                </div>
            </div>

            <div style="font-size:9px; color:#444; letter-spacing:1px; margin-bottom:8px; font-weight:bold;">PENDING QUEUE</div>
            <div id="h4mc-queue-list" style="margin-bottom:16px;"></div>

            <div style="font-size:9px; color:#444; letter-spacing:1px; margin-bottom:8px; font-weight:bold;">HISTORY</div>
            <div id="h4mc-history-strip" style="display:flex; gap:6px; overflow-x:auto; padding-bottom:10px;"></div>
            
            <div id="h4mc-sparkline-container" style="margin-top:10px;">
                <svg width="100%" height="40" preserveAspectRatio="none" id="h4mc-sparkline">
                    <path d="" fill="rgba(0, 242, 255, 0.05)" stroke="none" id="h4mc-spark-area"></path>
                    <path d="" fill="none" stroke="var(--h4mc-accent)" stroke-width="1.5" id="h4mc-spark-line"></path>
                </svg>
            </div>
        </div>
        <div id="h4mc-resize-grip"></div>
    `;

    root.appendChild(panel);
    document.body.appendChild(root);

    // Wire UI events
    panel.querySelector("#h4mc-close").onclick = () => togglePanel(false);
    panel.querySelectorAll(".h4mc-btn[data-mode]").forEach(btn => {
        btn.onclick = () => setPanelMode(btn.dataset.mode);
    });

    setupDraggable(panel.querySelector("#h4mc-header"), panel);
    setupResizable(panel.querySelector("#h4mc-resize-grip"), panel);
}

function injectLauncher() {
    const observer = new MutationObserver(() => {
        const bar = document.querySelector('.comfyui-menu') || document.querySelector('#comfy-menu');
        if (bar && !document.getElementById("h4mc-launcher")) {
            const btn = document.createElement("div");
            btn.id = "h4mc-launcher";
            btn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:2px;">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
                <span class="h4mc-badge">0</span>
                <div class="h4mc-live-dot" style="display:none; margin-left:4px;"></div>
            `;
            btn.onclick = () => togglePanel();
            bar.appendChild(btn);
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

// ============================================================================
// 5. DATA SYNC (POLLING & RENDER)
// ============================================================================
async function fetchStats() {
    const data = await h4mcFetch("/system_stats");
    if (!data) return;

    if (data.devices?.[0]) {
        const d = data.devices[0];
        const used = (d.vram_total - d.vram_free) / (1024 ** 3);
        const total = d.vram_total / (1024 ** 3);
        updateMeter("vram", used, total);
    }
    if (data.system) {
        const s = data.system;
        const used = (s.ram_total - s.ram_free) / (1024 ** 3);
        const total = s.ram_total / (1024 ** 3);
        updateMeter("ram", used, total);
    }
}

function updateMeter(id, used, total) {
    const el = document.getElementById(`h4mc-${id}`);
    if (!el) return;
    const pct = (used / total) * 100;
    el.querySelector(".val").textContent = `${used.toFixed(1)} / ${total.toFixed(1)} GB`;
    const fill = el.querySelector(".h4mc-meter-fill");
    fill.style.width = pct + "%";
    fill.style.background = pct > 85 ? "var(--h4mc-error)" : pct > 60 ? "var(--h4mc-warning)" : "var(--h4mc-success)";
}

async function fetchQueue() {
    const data = await h4mcFetch("/queue");
    if (!data) return;
    mcState.queueRunning = data.queue_running || [];
    mcState.queuePending = data.queue_pending || [];
    const total = mcState.queueRunning.length + mcState.queuePending.length;
    updateLauncherCount(total);
    renderQueue();
}

async function fetchHistory() {
    const data = await h4mcFetch("/history?max_items=20");
    if (!data) return;

    const history = Object.keys(data).map(pid => {
        const entry = data[pid];
        let totalTime = 0;
        try {
            const start = entry.status.messages.find(m => m[0] === 'execution_start')[1].timestamp;
            const end = entry.status.messages.find(m => m[0] === 'execution_complete')[1].timestamp;
            totalTime = end - start;
        } catch (e) { }
        return { id: pid, time: totalTime, output: entry.outputs };
    }).sort((a, b) => b.id - a.id);

    mcState.history = history;
    mcState.genTimes = history.map(h => h.time).slice(0, 20).reverse();
    renderHistory();
    renderSparkline();
}

function renderQueue() {
    const list = document.getElementById("h4mc-queue-list");
    if (!list) return;
    if (mcState.queuePending.length === 0) {
        list.innerHTML = `<div style="font-size:10px; color:#333; text-align:center; padding:10px;">EMPTY</div>`;
        return;
    }
    list.innerHTML = mcState.queuePending.slice(0, 6).map((q, idx) => `
        <div style="display:flex; align-items:center; font-size:10px; padding:4px 0; border-bottom:1px solid #222;">
            <span style="color:var(--h4mc-accent); width:18px;">${idx + 1}</span>
            <span style="flex:1; opacity:0.7;">JOB_${q[1].slice(0, 6)}</span>
            <span style="color:var(--h4mc-error); cursor:pointer;" onclick="window.dispatchEvent(new CustomEvent('h4mc_delete', {detail:'${q[1]}'}))">×</span>
        </div>
    `).join("");
}

function renderHistory() {
    const strip = document.getElementById("h4mc-history-strip");
    if (!strip) return;
    strip.innerHTML = mcState.history.map(h => {
        let url = "";
        try {
            const node = Object.keys(h.output)[0];
            const img = h.output[node].images[0];
            url = `/view?filename=${img.filename}&type=${img.type}&subfolder=${img.subfolder}`;
        } catch (e) { }
        return `<img src="${url}" style="width:80px; height:80px; border-radius:4px; object-fit:cover; border:1px solid #333;" />`;
    }).join("");
}

function renderSparkline() {
    const line = document.getElementById("h4mc-spark-line");
    if (!line || !mcState.genTimes.length) return;
    const w = 340, h = 40;
    const max = Math.max(...mcState.genTimes, 1);
    const points = mcState.genTimes.map((v, i) => `${(i / (mcState.genTimes.length - 1)) * w},${h - (v / max) * h}`).join(" ");
    line.setAttribute("d", `M ${points}`);
}

// ============================================================================
// 6. MODE CONTROL & INTERACTIVITY
// ============================================================================
function setPanelMode(targetMode) {
    const panel = document.getElementById("h4mc-panel");
    const root = document.getElementById("h4mc-root");
    if (!panel || !root) return;

    mcState.mode = targetMode;
    if (targetMode !== 'badge') mcState.lastMode = targetMode;

    panel.style.transition = "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)";

    if (targetMode === 'float') {
        updateCanvasMargin(0);
        panel.style.borderRadius = "var(--h4mc-radius)";
        panel.style.width = mcState.floatSize.width + "px"; panel.style.height = mcState.floatSize.height + "px";
        if (mcState.floatPos.left !== null) {
            panel.style.left = mcState.floatPos.left + "px"; panel.style.top = mcState.floatPos.top + "px";
            panel.style.right = "auto"; panel.style.bottom = "auto";
        } else {
            panel.style.right = "20px"; panel.style.bottom = "20px";
            panel.style.left = "auto"; panel.style.top = "auto";
        }
    }
    else if (targetMode === 'docked') {
        updateCanvasMargin(360);
        panel.style.borderRadius = "0";
        panel.style.left = "0"; panel.style.top = "0"; panel.style.width = "360px"; panel.style.height = "100vh";
        panel.style.right = "auto"; panel.style.bottom = "auto";
    }

    document.querySelectorAll(".h4mc-btn[data-mode]").forEach(btn => btn.classList.toggle("active", btn.dataset.mode === targetMode));
}

function updateCanvasMargin(px) {
    const canv = document.querySelector('.graph-canvas-container') || document.querySelector('.comfy-canvas-container');
    if (canv) { canv.style.transition = "margin-left 0.3s ease"; canv.style.marginLeft = px + "px"; }
}

function togglePanel(state) {
    mcState.open = state !== undefined ? state : !mcState.open;
    const root = document.getElementById("h4mc-root");
    const lBtn = document.getElementById("h4mc-launcher");
    if (mcState.open) {
        root.style.display = "block";
        lBtn?.classList.add("active");
        setPanelMode(mcState.lastMode);
    } else {
        root.style.display = "none";
        lBtn?.classList.remove("active");
        updateCanvasMargin(0);
    }
}

function updateJobUI(running) {
    const card = document.getElementById("h4mc-active-job");
    const dot = document.querySelector(".h4mc-live-dot");
    if (!card) return;
    if (running) {
        card.style.display = "flex";
        if (dot) dot.style.display = "block";
        const pct = mcState.totalSteps > 0 ? (mcState.currentStep / mcState.totalSteps) * 100 : 0;
        document.getElementById("h4mc-progress-text").textContent = `STEP ${mcState.currentStep}/${mcState.totalSteps}`;
        document.getElementById("h4mc-progress-pct").textContent = Math.round(pct) + "%";
        document.getElementById("h4mc-progress-fill").style.width = pct + "%";
        const elapsed = Math.floor((Date.now() - mcState.jobStartTime) / 1000);
        document.getElementById("h4mc-job-time").textContent = `${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}`;
        document.getElementById("h4mc-job-node").textContent = mcState.currentNodeId || "--";
    } else {
        card.style.display = "none";
        if (dot) dot.style.display = "none";
    }
}

function showHeartbeatBanner(text, type) {
    const b = document.getElementById("h4mc-heartbeat-banner");
    if (!b) return;
    b.textContent = text; b.classList.add("visible");
    b.style.background = type === 'error' ? "var(--h4mc-error)" : "var(--h4mc-warning)";
    if (type === 'error') setTimeout(() => b.classList.remove("visible"), 5000);
}

function updateLauncherCount(n) {
    const b = document.querySelector(".h4mc-badge");
    if (b) b.textContent = n;
}

// Drag & Resize
function setupDraggable(handle, target) {
    handle.onmousedown = (e) => {
        if (mcState.mode !== 'float' || e.target.closest('button')) return;
        const sX = e.clientX - target.offsetLeft, sY = e.clientY - target.offsetTop;
        const move = (e) => {
            let x = Math.max(0, Math.min(e.clientX - sX, window.innerWidth - target.offsetWidth));
            let y = Math.max(0, Math.min(e.clientY - sY, window.innerHeight - target.offsetHeight));
            target.style.left = x + "px"; target.style.top = y + "px"; target.style.right = "auto"; target.style.bottom = "auto";
            mcState.floatPos = { left: x, top: y };
        };
        const up = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); };
        document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
    };
}
function setupResizable(handle, target) {
    handle.onmousedown = (e) => {
        if (mcState.mode !== 'float') return;
        const sX = e.clientX, sY = e.clientY, sW = target.offsetWidth, sH = target.offsetHeight;
        const move = (e) => {
            const w = Math.max(320, Math.min(800, sW + (e.clientX - sX)));
            const h = Math.max(400, Math.min(window.innerHeight * 0.9, sH + (e.clientY - sY)));
            target.style.width = w + "px"; target.style.height = h + "px";
            mcState.floatSize = { width: w, height: h };
        };
        const up = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); };
        document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
    };
}

// ============================================================================
// 7. INITIALIZATION & SYNC COHESION
// ============================================================================
app.registerExtension({
    name: "h4.MissionControl",
    async setup() {
        if (mcState.initialized) return;

        injectStyles();
        buildPanel();
        injectLauncher();

        // WebSocket Link
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";

        const connectWS = () => {
            const ws = new WebSocket(`${protocol}//${window.location.host}/ws?clientId=${mcState.wsClientId}`);
            ws.onmessage = (e) => {
                if (e.data instanceof Blob) {
                    if (mcState.previewObjectUrl) URL.revokeObjectURL(mcState.previewObjectUrl);
                    const url = URL.createObjectURL(e.data);
                    mcState.previewObjectUrl = url;
                    const img = document.getElementById("h4mc-job-preview");
                    if (img) img.src = url;
                } else {
                    try { handleWSMessage(JSON.parse(e.data)); } catch (err) { }
                }
            };
            ws.onopen = () => { mcState.wsState = 'connected'; fetchQueue(); fetchStats(); };
            ws.onclose = () => {
                mcState.wsState = 'disconnected';
                setTimeout(connectWS, 5000);
            };
        };
        connectWS();

        // Wireless Seed Broadcast Listener (Legacy Support)
        api.addEventListener("h4_broadcast_seed", (event) => {
            const seed = event.detail.seed;
            const source = event.detail.source_id;
            if (seed === undefined || !app.graph) return;
            for (const node of app.graph._nodes) {
                if (!node.widgets) continue;
                const isSource = String(node.id) === String(source);
                for (const w of node.widgets) {
                    const name = w.name?.toLowerCase() || "";
                    if (name.includes("seed") && !name.includes("control") && w.type !== "COMBO") {
                        if (isSource) {
                            const m = node.widgets.find(mw => mw.name === "mode");
                            if (m?.value === "Incremental" || m?.value === "Fixed") continue;
                        }
                        if (w.value !== seed) {
                            w.value = Number(seed);
                            if (w.callback) w.callback(w.value, app.canvas, node, null, event);
                        }
                    }
                }
            }
            app.graph.setDirtyCanvas(true, true);
        });

        // Polling
        setInterval(fetchStats, 1000);
        setInterval(fetchQueue, 2000);

        window.addEventListener('h4mc_delete', async (e) => {
            await fetch("/queue", { method: 'POST', body: JSON.stringify({ delete: [e.detail] }) });
            fetchQueue();
        });

        console.log("%c⚡ h4 Mission Control ONLINE (v1.1.0)", "color: #00f2ff; font-weight: bold;");
        mcState.initialized = true;
    }
});
