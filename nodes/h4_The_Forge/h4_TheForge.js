const TheForge = {
  // State
  node: null,
  _renderedTabs: new Set(),
  activeTab: "generate",
  activeModules: new Set(),
  previewOpen: false,

  // Config (persisted)
  config: {
    theme: {
      accent:       "#00ffdc",
      fontPrimary:  "#e8e8e8",
      fontMuted:    "#888888",
      bgBase:       "#1a1a1a",
      bgPanel:      "#242424",
      bgNode:       "#2a2a2a",
      glowColor:    "#00ffdc",
      glowIntensity: 0.6,
    },
    sampler:  { steps: 20, cfg: 7, sampler_name: "euler", scheduler: "normal", seed: -1, denoise: 1.0 },
    load:     { ckpt_name: "", vae_name: "Baked VAE", clip_skip: -1 },
    save:     { output_path: "output/", filename_prefix: "%date%_%seed%", format: "PNG", write_meta: true },
    modules:  { mask: false, mutate: false, switch: false, tokens: false, identity: false },
    pixelpress: { enabled: false, format: "PNG", quality: 90, hdr: false },
    doubleSampler:  { enabled: false, refiner_steps: 10, refiner_denoise: 0.5 },
    latentSelector: { enabled: false, width: 512, height: 512, batch: 1 },
  },

  // --- INIT ---
  init(node) {
    this.node = node;
    this.injectCSS();
    this.loadConfig();
    // Restore active modules from saved config
    Object.entries(this.config.modules).forEach(([key, val]) => {
      if (val) this.activeModules.add(key);
    });
    return this.buildShell();
  },

  // --- CONFIG ---
  setConfig(path, val) {
    // path like "theme.accent" or "sampler.steps"
    const [section, key] = path.split(".");
    if (this.config[section]) this.config[section][key] = val;
    this.saveConfig();
    window.dispatchEvent(new CustomEvent("forge:config-update", { detail: { path, val } }));
  },

  loadConfig() {
    try {
      const saved = localStorage.getItem("h4_forge_config");
      if (saved) {
        const parsed = JSON.parse(saved);
        // Deep merge — don't wipe defaults for missing keys
        Object.keys(this.config).forEach(section => {
          if (parsed[section]) this.config[section] = { ...this.config[section], ...parsed[section] };
        });
      }
    } catch(e) { console.warn("[TheForge] Config load failed:", e); }
  },

  saveConfig() {
    localStorage.setItem("h4_forge_config", JSON.stringify(this.config));
  },

  // --- CSS INJECTION (guarded) ---
  injectCSS() {
    if (document.getElementById("forge-styles")) return;
    const style = document.createElement("style");
    style.id = "forge-styles";
    style.textContent = `/* all forge-* styles here */`;
    document.head.appendChild(style);
  },

  // --- LAZY TAB RENDERER ---
  switchTab(key) {
    if (this.activeTab === key && this._renderedTabs.has(key)) return;
    this.activeTab = key;
    this.refreshTabBar();

    const panel = this.node._forgeContent;
    if (!panel) return;

    // Show only the active panel
    panel.querySelectorAll(".forge-tab-panel").forEach(p => p.style.display = "none");

    let pane = panel.querySelector(`[data-tab-pane="${key}"]`);
    if (!pane) {
      pane = document.createElement("div");
      pane.className = "forge-tab-panel";
      pane.dataset.tabPane = key;
      panel.appendChild(pane);
    }

    // Only build DOM if not already rendered
    if (!this._renderedTabs.has(key)) {
      const builders = {
        generate: () => this.buildGenerateTab(pane),
        load:     () => this.buildLoadTab(pane),
        save:     () => this.buildSaveTab(pane),
        gallery:  () => this.buildGalleryTab(pane),
        mask:     () => this.buildMaskTab(pane),
        mutate:   () => this.buildMutateTab(pane),
        switch:   () => this.buildSwitchTab(pane),
        tokens:   () => this.buildTokensTab(pane),
        identity: () => this.buildIdentityTab(pane),
      };
      builders[key]?.();
      this._renderedTabs.add(key);
    }

    pane.style.display = "block";

    // Auto-open preview on Generate tab
    if (key === "generate") this.setPreview(true);
  },

  // Force re-render a tab (call when node data changes)
  invalidateTab(key) {
    this._renderedTabs.delete(key);
    const panel = this.node._forgeContent;
    panel?.querySelector(`[data-tab-pane="${key}"]`)?.remove();
  },

  // --- HELPER BUILDERS (stolen from Dashboard, renamed) ---
  forgeToggle(container, configPath, label, tooltip = "") {
    const [section, key] = configPath.split(".");
    const row = document.createElement("div");
    row.className = "forge-row";
    row.title = tooltip;
    row.innerHTML = `
      <label class="forge-label">${label}</label>
      <label class="forge-toggle-wrap">
        <input type="checkbox" ${this.config[section]?.[key] ? "checked" : ""}/>
        <span class="forge-slider"></span>
      </label>
    `;
    row.querySelector("input").onchange = (e) => this.setConfig(configPath, e.target.checked);
    container.appendChild(row);
    return row;
  },

  forgeSlider(container, configPath, label, min, max, step, tooltip = "") {
    const [section, key] = configPath.split(".");
    const val = this.config[section]?.[key] ?? min;
    const row = document.createElement("div");
    row.className = "forge-row";
    row.title = tooltip;
    row.innerHTML = `
      <label class="forge-label">${label}</label>
      <input type="range" min="${min}" max="${max}" step="${step}" value="${val}" style="flex:1"/>
      <span class="forge-val">${val}</span>
    `;
    const input = row.querySelector("input");
    const display = row.querySelector(".forge-val");
    input.oninput = (e) => {
      display.textContent = parseFloat(e.target.value).toFixed(step < 1 ? 2 : 0);
      this.setConfig(configPath, parseFloat(e.target.value));
    };
    container.appendChild(row);
    return row;
  },

  forgeSelect(container, configPath, label, options, tooltip = "") {
    const [section, key] = configPath.split(".");
    const current = this.config[section]?.[key];
    const row = document.createElement("div");
    row.className = "forge-row";
    row.title = tooltip;
    row.innerHTML = `
      <label class="forge-label">${label}</label>
      <select class="forge-select">
        ${options.map(o => `<option ${o === current ? "selected" : ""}>${o}</option>`).join("")}
      </select>
    `;
    row.querySelector("select").onchange = (e) => this.setConfig(configPath, e.target.value);
    container.appendChild(row);
    return row;
  },
};