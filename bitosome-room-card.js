class bitosomeRoomCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
  }

  static getStubConfig() {
    return {
      title: "Living room",          // ha-card header
      tile_height: 80,               // height of every tile (main, AC, Thermo, switches)
      badge_size: 22,                // badge circle size (px)
      badge_icon_size: 14,           // badge icon size (px)
      card_shadow_color: "#000000",  // outer card shadow color
      card_shadow_intensity: 0.5,    // 0..1 (alpha)
      header: {
        layout: "all", // all | main_ac | main_thermo | main_only
        main_entity: "switch.living_room_light_group",
        main_name: "Living room", // text on main tile (bottom-left)
        main_icon: "mdi:sofa-outline",
        temp_sensor: "sensor.kitchen_living_room_temparature_average",
        humidity_sensor: "sensor.kitchen_living_room_humidity_average",
        ac_entity: "climate.living_room_ac",
        thermo_entity: "climate.thermostat_5_7_group",
        // Additional badges for the main tile (bottom-right)
        // { type: "lock" | "gate", entity: "...", tap_entity?: "...", hold_entity?: "..." }
        badges: []
      },
      // Explicit switch rows only (no legacy). Each item:
      // { tap_entity, hold_entity, name, icon, type } where type in ["switch","smart_plug"]
      switch_rows: []
    };
  }

  setConfig(config) {
    // No migration/back-compat: accept only the new structure
    this._config = JSON.parse(JSON.stringify(config || bitosomeRoomCard.getStubConfig()));
    if (!this._config.header) this._config.header = {};
    if (!Array.isArray(this._config.header.badges)) this._config.header.badges = [];
    if (!Array.isArray(this._config.switch_rows)) this._config.switch_rows = [];
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this.isConnected && this.shadowRoot.querySelector(".root")) {
      this._updateDynamic();
    } else {
      this._render();
    }
  }

  getCardSize() { return 6; }

  // ---------- RENDER ----------
  _render() {
    if (!this._config) return;

    const c = { ...bitosomeRoomCard.getStubConfig(), ...this._config };
    const h = { ...bitosomeRoomCard.getStubConfig().header, ...(c.header || {}) };

    // effective metrics
    const tileH = Number(c.tile_height) || 80;
    const badgeSize = Number(c.badge_size) || 22;
    const badgeIcon = Number(c.badge_icon_size) || 14;

    // card shadow rgba
    const panelShadowColor = this._rgbaFromColor(c.card_shadow_color, c.card_shadow_intensity);

    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; }
        .metrics, .metrics * { box-sizing: border-box; }

        .metrics {
          --tile-h:${tileH}px;
          --badge:${badgeSize}px;
          --badge-icon:${badgeIcon}px;
          --ac-therm-icon: 50px; /* fixed icon size */
        }

        ha-card {
          border-radius: 16px;
          background: linear-gradient(
            180deg,
            rgba(var(--rgb-card-background-color, 255,255,255), 0.92),
            rgba(var(--rgb-card-background-color, 250,250,250), 0.85)
          );
          box-shadow: 0 10px 30px var(--panel-shadow-color);
          padding: 12px;
          color: var(--primary-text-color);
        }

        .root { display: grid; gap: 12px; }

        /* Header row */
        .header-row {
          display: grid;
          grid-template-columns: 1fr auto auto;
          gap: 12px;
          align-items: stretch;
        }
        .header-row.only-main { grid-template-columns: 1fr; }
        .header-row.main-plus-one { grid-template-columns: 1fr auto; }
        .header-row > * { height: var(--tile-h); }

        /* MAIN tile */
        .main-tile {
          position: relative;
          height: var(--tile-h);
          border-radius: 12px;
          box-shadow: 0 6px 18px rgba(0,0,0,0.10);
          background: var(--ha-card-background, var(--card-background-color));
          padding-left: 16px;
          overflow: hidden;
        }
        .main-icon {
          position: absolute; left: 12px; top: 8px;
          width: 48px; height: 48px; line-height: 0;
          color: var(--primary-text-color);
        }
        .chip-tr {
          position: absolute; right: 8px; top: 8px; z-index: 3;
          display: inline-flex; align-items: center; gap: 2px;
          padding: 2px 6px; border-radius: 999px;
          background: rgba(0,0,0,0.06);
          font-size: 11px; color: var(--secondary-text-color); line-height: 1; white-space: nowrap;
        }
        .chip-tr ha-icon { width: 10px; height: 10px; line-height:0; --mdc-icon-size:10px; }

        /* badge basics (bulb/lock/gate) */
        .badge {
          width: var(--badge); height: var(--badge);
          border-radius: 999px;
          display:flex; align-items:center; justify-content:center;
          line-height:0;
          background: rgba(0,0,0,0.06);
        }
        .badge ha-icon {
          --mdc-icon-size: var(--badge-icon);
          width: var(--badge-icon); height: var(--badge-icon);
          display:block; margin:0; padding:0; line-height:0;
          pointer-events:none;
          color: var(--secondary-text-color);
        }
        .main-badges-br {
          position: absolute; right: 8px; bottom: 8px; z-index: 3;
          display: inline-flex; align-items: center; justify-content: flex-end;
          gap: 6px; flex-wrap: wrap; max-width: calc(100% - 16px);
        }
        .main-name {
          position: absolute; left: 12px; bottom: 8px;
          font-weight: 500; font-size: 14px; color: var(--primary-text-color);
        }

        /* AC & THERMOSTAT squares — width == height == --tile-h */
        .square {
          position: relative;
          width: var(--tile-h); height: var(--tile-h);
          aspect-ratio: 1 / 1;
          border-radius: 12px;
          background: var(--card-background-color);
          backdrop-filter: blur(10px);
          transition: transform 0.18s ease, box-shadow 0.28s ease, filter 0.12s ease;
          box-shadow: 0 6px 18px rgba(0,0,0,0.10);
          overflow: hidden;
          /* Perfect centering */
          display: grid;
          place-items: center;
        }

        .center-xy {
          position: static;
          transform: none;
          display: flex; align-items: center; justify-content: center;
          pointer-events: none; user-select: none; line-height: 0;
        }

        .ac-fan, .thermo-icon {
          width: var(--ac-therm-icon);
          height: var(--ac-therm-icon);
          --mdc-icon-size: var(--ac-therm-icon);
          display: block;
          margin: 0; padding: 0; line-height: 0;
          transform-origin: 50% 50%;
          pointer-events: none;
        }

        /* AC mode badge (top-right) */
        .badge-tr { position: absolute; right: 8px; top: 8px; z-index: 3; }

        /* Thermostat temp chip (top-right) */
        .temp-chip-tr { position: absolute; right: 8px; top: 8px; z-index: 3; display:inline-flex; align-items:center; }
        .temp-pill {
          display:inline-flex; align-items:center; justify-content:center;
          padding: 2px 6px; border-radius: 999px;
          background:#ff7043; font-size:11px; color:#fff; line-height:1;
          white-space:nowrap; font-weight:700;
          max-width: calc(var(--tile-h) - 16px);
        }

        /* Animations */
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes activePulse {
          0%   { box-shadow: 0 10px 20px var(--pulse-weak); transform: translateY(0) scale(1); }
          45%  { box-shadow: 0 28px 56px var(--pulse-strong); transform: translateY(-1px) scale(1.02); }
          100% { box-shadow: 0 10px 20px var(--pulse-weak); transform: translateY(0) scale(1); }
        }
        @keyframes heatingGlow {
          0%   { box-shadow: 0 6px 18px rgba(0,0,0,0.10); }
          50%  { box-shadow: 0 0 30px rgba(255,112,67,0.32); }
          100% { box-shadow: 0 6px 18px rgba(0,0,0,0.10); }
        }

        /* Switch rows */
        .switch-row { display:grid; grid-template-columns: repeat(var(--cols,3), 1fr); gap: 12px; }
        .switch-tile {
          position: relative;
          height: var(--tile-h);
          border-radius: 12px;
          background: var(--card-background-color);
          box-shadow: 0 6px 18px rgba(0,0,0,0.10);
          transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s ease;
          display: grid; place-items: center;
          color: var(--secondary-text-color);
        }
        .tile-inner { display:grid; gap:4px; place-items:center; justify-items:center; text-align:center; }
        .switch-tile .name { font-weight: 600; font-size: 12px; }
        .switch-icon { width: 28px; height: 28px; color: var(--secondary-text-color); line-height:0; }

        /* ON base style */
        .switch-tile.on {
          background: var(--primary-color);
          color: var(--primary-background-color);
          transform: translateY(2px);
          box-shadow:
            inset 0 6px 14px rgba(0,0,0,0.20),
            0 18px 40px rgba(255,193,7,0.30),
            0 6px 18px rgba(255,193,7,0.16);
          filter: drop-shadow(0 18px 32px rgba(255,193,7,0.22));
          z-index: 2;
        }
        .switch-tile.on .switch-icon { color: var(--primary-background-color); }

        /* Smart plug: animated band + GREEN glow (not yellow) */
        @keyframes chase {
          0%   { background-position: -150% 0, 0 0; }
          50%  { background-position: 50% 0, 0 0; }
          100% { background-position: 250% 0, 0 0; }
        }
        .switch-tile.smart.on {
          background:
            linear-gradient(90deg, rgba(0,200,83,0.00) 0%, rgba(0,200,83,0.45) 50%, rgba(0,200,83,0.00) 100%),
            var(--primary-color);
          background-size: 30% 100%, 100% 100%;
          background-repeat: no-repeat;
          animation: chase 2s linear infinite;

          /* Override the yellow base glow with GREEN */
          box-shadow:
            inset 0 6px 14px rgba(0,0,0,0.20),
            0 18px 40px rgba(0,200,83,0.30),
            0 6px 18px rgba(0,200,83,0.16);
          filter: drop-shadow(0 18px 32px rgba(0,200,83,0.22));
        }

        .clickable { cursor: pointer; }
      </style>

      <ha-card style="--panel-shadow-color:${panelShadowColor}" ${c.title ? `header="${c.title}"` : ""}>
        <div class="metrics">
          <div class="root">
            ${this._renderHeaderRow(h)}
            ${this._renderSwitchRows(c.switch_rows)}
          </div>
        </div>
      </ha-card>
    `;

    this._wireHeaderEvents(h);
    this._wireSwitchEvents();
    this._updateDynamic();
  }

  // ---------- HEADER ----------
  _renderHeaderRow(h) {
    const cls =
      h.layout === "main_only" ? "header-row only-main" :
      (h.layout === "all" ? "header-row" : "header-row main-plus-one");

    const showAC = (h.layout === "all" || h.layout === "main_ac") && h.ac_entity;
    const showThermo = (h.layout === "all" || h.layout === "main_thermo") && h.thermo_entity;

    return `
      <div class="${cls}">
        ${this._renderMainTile(h)}
        ${showAC ? this._renderACTile(h.ac_entity) : ""}
        ${showThermo ? this._renderThermoTile(h.thermo_entity) : ""}
      </div>
    `;
  }

  _renderMainTile(h) {
    const icon = h.main_icon || "mdi:sofa-outline";
    const name = h.main_name || "";
    return `
      <div class="main-tile clickable" data-entity="${h.main_entity}" data-action="more-info">
        <ha-icon class="main-icon" icon="${icon}"></ha-icon>

        <div class="chip-tr" data-role="chip">
          <ha-icon icon="mdi:thermometer"></ha-icon>
          <span class="tval">—°</span>
          <span style="opacity:.6;">|</span>
          <ha-icon icon="mdi:water-percent"></ha-icon>
          <span class="hval">—%</span>
        </div>

        <div class="main-badges-br" data-role="badges"></div>

        <div class="main-name">${name}</div>
      </div>
    `;
  }

  _renderACTile(entityId) {
    return `
      <div class="square ac-tile clickable" data-entity="${entityId}" data-action="ac-toggle">
        <div class="badge badge-tr" data-role="ac-badge">
          <ha-icon icon="mdi:air-conditioner" style="color:#fff"></ha-icon>
        </div>
        <div class="center-xy">
          <ha-icon class="ac-fan" icon="mdi:fan"></ha-icon>
        </div>
      </div>
    `;
  }

  _renderThermoTile(entityId) {
    return `
      <div class="square thermo-tile clickable" data-entity="${entityId}" data-action="thermo-toggle">
        <div class="temp-chip-tr">
          <div class="temp-pill"><span class="thermo-target">—°</span></div>
        </div>
        <div class="center-xy">
          <ha-icon class="thermo-icon" icon="mdi:thermostat"></ha-icon>
        </div>
      </div>
    `;
  }

  _wireHeaderEvents(h) {
    const main = this.shadowRoot.querySelector(".main-tile");
    if (main) {
      this._attachHold(main, () => this._openMoreInfo(h.main_entity));
      main.addEventListener("click", () => this._openMoreInfo(h.main_entity));
    }
    const ac = this.shadowRoot.querySelector(".ac-tile");
    if (ac) {
      const eid = ac.getAttribute("data-entity");
      this._attachHold(ac, () => this._openMoreInfo(eid));
      ac.addEventListener("click", () => this._acToggle(eid));
    }
    const th = this.shadowRoot.querySelector(".thermo-tile");
    if (th) {
      const eid = th.getAttribute("data-entity");
      this._attachHold(th, () => this._openMoreInfo(eid));
      th.addEventListener("click", () => this._thermoToggle(eid));
    }
  }

  // ---------- SWITCH GRID ----------
  _renderSwitchRows(rows) {
    if (!rows || !rows.length) return "";
    return rows.map((row, idx) => `
      <div class="switch-row" data-row="${idx}" style="--cols:${(row || []).length || 1}">
        ${(row || []).map(sw => this._renderSwitchTile(sw)).join("")}
      </div>
    `).join("");
  }

  _renderSwitchTile(sw) {
    const tap = sw.tap_entity || "";
    const hold = sw.hold_entity || tap || "";
    const icon = sw.icon || "";
    const name = sw.name || "";
    const type = (sw.type || "switch").toLowerCase(); // "switch" | "smart_plug"
    const isSmart = type === "smart_plug";
    return `
      <div class="switch-tile clickable ${isSmart ? 'smart' : ''}"
           data-entity="${tap}"
           data-tap="${tap}"
           data-hold="${hold}"
           data-type="${type}"
           data-action="switch-toggle">
        <div class="tile-inner">
          ${icon ? `<ha-icon class="switch-icon" icon="${icon}"></ha-icon>` : ""}
          ${name ? `<div class="name">${name}</div>` : ""}
        </div>
      </div>
    `;
  }

  _wireSwitchEvents() {
    this.shadowRoot.querySelectorAll(".switch-tile").forEach(tile => {
      const tap = tile.getAttribute("data-tap");
      const hold = tile.getAttribute("data-hold") || tap;
      if (!tap && !hold) return;
      this._attachHold(tile, () => this._openMoreInfo(hold));
      tile.addEventListener("click", () => this._toggleGeneric(tap));
    });
  }

  // ---------- DYNAMIC STATE ----------
  _updateDynamic() {
    if (!this._hass || !this._config) return;
    const h = { ...bitosomeRoomCard.getStubConfig().header, ...(this._config.header || {}) };

    // Main chip (temp/hum)
    const tSpan = this.shadowRoot.querySelector(".chip-tr .tval");
    const hSpan = this.shadowRoot.querySelector(".chip-tr .hval");
    if (tSpan) tSpan.textContent = this._fmt2(h.temp_sensor, 2, "°");
    if (hSpan) hSpan.textContent = this._fmt2(h.humidity_sensor, 2, "%");

    // Badges (bulb + extras)
    const badgesWrap = this.shadowRoot.querySelector(".main-badges-br");
    if (badgesWrap) {
      badgesWrap.innerHTML = "";
      // Bulb for main entity
      if (h.main_entity) {
        badgesWrap.appendChild(this._makeBadge({
          kind: "bulb", entity: h.main_entity,
          tap_entity: h.main_entity, hold_entity: h.main_entity, icon: "mdi:lightbulb"
        }));
      }
      // Extra badges
      (Array.isArray(h.badges) ? h.badges : []).forEach(b => {
        if (!b || !b.entity) return;
        badgesWrap.appendChild(this._makeBadge({
          kind: (b.type || "").toLowerCase(),
          entity: b.entity,
          tap_entity: b.tap_entity || b.entity,
          hold_entity: b.hold_entity || b.entity
        }));
      });
    }

    // AC tile dynamics
    const acTile = this.shadowRoot.querySelector(".ac-tile");
    if (acTile && h.ac_entity) {
      const mode = (this._hass.states[h.ac_entity]?.state || "").toLowerCase();
      const active = mode && mode !== "off";
      acTile.style.animation = active ? "activePulse 2.4s ease-in-out infinite" : "none";
      const fan = acTile.querySelector(".ac-fan");
      if (fan) {
        fan.style.animation = active ? "spin 1.5s linear infinite" : "none";
        fan.style.color = this._acModeColor(mode);
      }
      const badge = acTile.querySelector("[data-role='ac-badge']");
      const badgeIcon = badge?.querySelector("ha-icon");
      if (badge && badgeIcon) {
        const { bg, icon } = this._acBadge(mode);
        badge.style.background = bg;
        badgeIcon.setAttribute("icon", icon);
        badgeIcon.style.color = "#ffffff";
      }
      const colors = this._acPulseColors(mode);
      acTile.style.setProperty("--pulse-weak", colors.weak);
      acTile.style.setProperty("--pulse-strong", colors.strong);
    }

    // Thermostat tile
    const thTile = this.shadowRoot.querySelector(".thermo-tile");
    if (thTile && h.thermo_entity) {
      const st = this._hass.states[h.thermo_entity];
      const hvacAction = (st?.attributes?.hvac_action || "").toLowerCase();
      const state = (st?.state || "").toLowerCase();
      const target = st?.attributes?.temperature ?? st?.attributes?.target_temp ?? st?.attributes?.target_temperature ?? st?.attributes?.setpoint ?? st?.attributes?.away_temperature;
      const tSpan2 = thTile.querySelector(".thermo-target");
      if (tSpan2) tSpan2.textContent = this._fmtNumber(target, 1) + "°";

      const ico = thTile.querySelector(".thermo-icon");
      if (ico) {
        if (state === "off") ico.style.color = "gray";
        else if (hvacAction === "heating" || state === "heating") ico.style.color = "#ff7043";
        else ico.style.color = "#66bb6a";
      }
      thTile.style.animation = (hvacAction === "heating" || state === "heating") ? "heatingGlow 2.4s ease-in-out infinite" : "none";
    }

    // Switch tiles on/off
    this.shadowRoot.querySelectorAll(".switch-tile").forEach(tile => {
      const eid = tile.getAttribute("data-tap") || tile.getAttribute("data-entity");
      const on = this._isOn(eid);
      tile.classList.toggle("on", on);
      const icon = tile.querySelector(".switch-icon");
      if (icon) icon.style.color = on ? "var(--primary-background-color)" : "var(--secondary-text-color)";
    });
  }

  // Create badge element
  _makeBadge({ kind, entity, tap_entity, hold_entity, icon }) {
    const el = document.createElement("div");
    el.className = "badge clickable";
    el.setAttribute("data-kind", kind || "badge");
    el.setAttribute("data-entity", entity);
    el.setAttribute("data-tap", tap_entity || entity);
    el.setAttribute("data-hold", hold_entity || entity);
    const ic = document.createElement("ha-icon");
    ic.setAttribute("icon", icon || "mdi:checkbox-blank-circle-outline");
    el.appendChild(ic);

    this._attachHold(el, () => this._openMoreInfo(hold_entity || entity));
    el.addEventListener("click", () => this._toggleGeneric(tap_entity || entity));
    this._paintBadge(el);
    return el;
  }

  _paintBadge(el) {
    const kind = (el.getAttribute("data-kind") || "").toLowerCase();
    const entity = el.getAttribute("data-entity");
    const iconEl = el.querySelector("ha-icon");
    if (!iconEl) return;

    if (kind === "bulb") {
      const on = this._isOn(entity);
      el.style.background = on ? "linear-gradient(135deg,#ffcf57,#ffb200)" : "rgba(0,0,0,0.06)";
      iconEl.style.color = on ? "#ffffff" : "var(--secondary-text-color)";
      iconEl.setAttribute("icon", "mdi:lightbulb");
      return;
    }

    if (kind === "lock") {
      const st = this._hass.states[entity];
      const s = (st?.state || "").toLowerCase();
      const isLocked   = s === "locked";
      const isUnlocked = s === "unlocked";
      const isPending  = s === "locking" || s === "unlocking";
      const isJammed   = s === "jammed";
      const isUnknown  = !s || s === "unknown" || s === "unavailable";

      const lockIcon =
        isLocked   ? "mdi:lock" :
        isPending  ? "mdi:lock-clock" :
        isJammed   ? "mdi:lock-alert" :
        isUnlocked ? "mdi:lock-open-variant" :
                     "mdi:lock";

      const rgbLocked   = "var(--mush-rgb-state-lock-locked, 76,175,80)";
      const rgbUnlocked = "var(--mush-rgb-state-lock-unlocked, 244,67,54)";
      const rgbPending  = "var(--mush-rgb-state-lock-pending, 255,152,0)";

      let bg = "rgba(0,0,0,0.06)";
      let icColor = "var(--secondary-text-color)";
      if (!isUnknown) {
        const rgb = isLocked ? rgbLocked : (isUnlocked ? rgbUnlocked : rgbPending);
        bg = `linear-gradient(135deg, rgba(${rgb},1), rgba(${rgb},0.92))`;
        icColor = "#ffffff";
      }
      el.style.background = bg;
      iconEl.style.color = icColor;
      iconEl.setAttribute("icon", lockIcon);
      return;
    }

    if (kind === "gate") {
      const st = this._hass.states[entity];
      const s = (st?.state || "").toLowerCase();
      const isOpen    = s === "on" || s === "open";
      const isClosed  = s === "off" || s === "closed";
      const isUnknown = !s || s === "unknown" || s === "unavailable";

      const rgbClosed = "var(--mush-rgb-state-lock-locked, 76,175,80)";
      const rgbOpen   = "var(--mush-rgb-state-lock-unlocked, 244,67,54)";
      const rgbPend   = "var(--mush-rgb-state-lock-pending, 255,152,0)";

      let icon = isOpen ? "mdi:gate-open" : "mdi:gate";
      let bg = "rgba(0,0,0,0.06)";
      let icColor = "var(--secondary-text-color)";
      if (!isUnknown) {
        const rgb = isClosed ? rgbClosed : (isOpen ? rgbOpen : rgbPend);
        bg = `linear-gradient(135deg, rgba(${rgb},1), rgba(${rgb},0.92))`;
        icColor = "#ffffff";
      }
      el.style.background = bg;
      iconEl.style.color = icColor;
      iconEl.setAttribute("icon", icon);
      return;
    }

    // default
    el.style.background = "rgba(0,0,0,0.06)";
    iconEl.style.color = "var(--secondary-text-color)";
  }

  // ---------- HELPERS ----------
  _fmt2(entityId, digits, suffix) {
    if (!entityId) return "—" + (suffix || "");
    const st = this._hass.states[entityId];
    if (!st || st.state === "" || st.state === "unknown" || st.state === "unavailable") return "—" + (suffix || "");
    const n = Number(st.state);
    return Number.isFinite(n) ? n.toFixed(digits) + (suffix || "") : String(st.state) + (suffix || "");
  }
  _fmtNumber(v, digits) {
    if (v === undefined || v === null || v === "" || v === "unknown" || v === "unavailable") return "—";
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(digits) : String(v);
  }
  _isOn(entityId) {
    if (!entityId) return false;
    const st = this._hass.states[entityId];
    return (st?.state || "").toLowerCase() === "on";
  }
  _acModeColor(mode) {
    if (!mode || mode === "off") return "gray";
    if (mode.includes("cool")) return "#00aaff";
    if (mode.includes("heat")) return "#ff7043";
    if (mode.includes("dry")) return "#ffca28";
    if (mode.includes("fan")) return "#66bb6a";
    if (mode.includes("auto")) return "#26c6da";
    return "var(--paper-item-icon-color)";
  }
  _acBadge(mode) {
    if (!mode || mode === "off") return { bg: "rgba(158,158,158,0.95)", icon: "mdi:power" };
    if (mode.includes("cool")) return { bg: "#00aaff", icon: "mdi:snowflake" };
    if (mode.includes("heat")) return { bg: "#ff7043", icon: "mdi:fire" };
    if (mode.includes("dry")) return { bg: "#ffca28", icon: "mdi:water-percent" };
    if (mode.includes("fan")) return { bg: "#66bb6a", icon: "mdi:fan" };
    if (mode.includes("auto")) return { bg: "#26c6da", icon: "mdi:autorenew" };
    return { bg: "rgba(0,0,0,0.06)", icon: "mdi:air-conditioner" };
  }
  _acPulseColors(mode) {
    if (mode?.includes("cool")) return { weak: "rgba(0,170,255,0.12)", strong: "rgba(0,170,255,0.26)" };
    if (mode?.includes("heat")) return { weak: "rgba(255,112,67,0.12)", strong: "rgba(255,112,67,0.26)" };
    if (mode?.includes("dry"))  return { weak: "rgba(255,202,40,0.12)", strong: "rgba(255,202,40,0.26)" };
    if (mode?.includes("fan"))  return { weak: "rgba(102,187,106,0.12)", strong: "rgba(102,187,106,0.26)" };
    if (mode?.includes("auto")) return { weak: "rgba(38,198,218,0.12)", strong: "rgba(38,198,218,0.26)" };
    return { weak: "rgba(0,0,0,0.06)", strong: "rgba(0,0,0,0.12)" };
  }
  _attachHold(el, onHold) {
    let t = null;
    const start = () => { clearTimeout(t); t = setTimeout(onHold, 500); };
    const end = () => { clearTimeout(t); t = null; };
    el.addEventListener("pointerdown", start);
    el.addEventListener("pointerup", end);
    el.addEventListener("pointerleave", end);
    el.addEventListener("contextmenu", (e) => { e.preventDefault(); onHold(); });
  }
  _openMoreInfo(entityId) {
    if (!entityId) return;
    this.dispatchEvent(new CustomEvent("hass-more-info", {
      detail: { entityId }, bubbles: true, composed: true
    }));
  }
  _toggleGeneric(entityId) {
    if (!entityId) return;
    const domain = entityId.split(".")[0];
    const svc = (domain === "switch" || domain === "light") ? `${domain}.toggle` : "homeassistant.toggle";
    const [d, s] = svc.split(".");
    this._hass.callService(d, s, { entity_id: entityId });
  }
  _acToggle(entityId) {
    const st = this._hass.states[entityId];
    const mode = (st?.state || "").toLowerCase();
    const on = !!mode && mode !== "off";
    this._hass.callService("climate", on ? "turn_off" : "turn_on", { entity_id: entityId });
  }
  _thermoToggle(entityId) {
    const st = this._hass.states[entityId];
    const mode = (st?.state || "").toLowerCase();
    const next = (mode === "off") ? "heat" : "off";
    this._hass.callService("climate", "set_hvac_mode", { entity_id: entityId, hvac_mode: next });
  }
  _rgbaFromColor(color, alpha = 0.5) {
    const a = Math.max(0, Math.min(1, Number(alpha) || 0));
    if (!color || typeof color !== "string") return `rgba(0,0,0,${a})`;
    const c = color.trim();
    if (c.startsWith("rgba(") || c.startsWith("rgb(") || c.startsWith("hsl(") || c.startsWith("var(")) return c;
    const hex = c.replace("#", "");
    const to255 = (h) => parseInt(h, 16);
    if (hex.length === 3) {
      const r = to255(hex[0] + hex[0]), g = to255(hex[1] + hex[1]), b = to255(hex[2] + hex[2]);
      return `rgba(${r},${g},${b},${a})`;
    }
    if (hex.length >= 6) {
      const r = to255(hex.slice(0,2)), g = to255(hex.slice(2,4)), b = to255(hex.slice(4,6));
      return `rgba(${r},${g},${b},${a})`;
    }
    return `rgba(0,0,0,${a})`;
  }

  static getConfigElement() {
    return document.createElement("bitosome-room-card-editor");
  }
}

/* ----------------- Editor ----------------- */
class bitosomeRoomCardEditor extends HTMLElement {
  setConfig(config) {
    const caret = this._getCaretInfo();
    // No migration/back-compat
    this._config = JSON.parse(JSON.stringify(config || bitosomeRoomCard.getStubConfig()));
    if (!this._config.header) this._config.header = {};
    if (!Array.isArray(this._config.header.badges)) this._config.header.badges = [];
    if (!Array.isArray(this._config.switch_rows)) this._config.switch_rows = [];
    this._render();
    this._restoreCaret(caret);
  }

  _render() {
    const c = this._config || bitosomeRoomCard.getStubConfig();
    const h = c.header || {};
    const switchRows = Array.isArray(c.switch_rows) ? c.switch_rows : [];
    const headerBadges = Array.isArray(h.badges) ? h.badges : [];

    this.innerHTML = `
      <style>
        .row { display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:8px; }
        .row-1 { display:grid; grid-template-columns: 1fr; gap:12px; margin-bottom:8px; }
        .section { border:1px dashed var(--divider-color); border-radius:8px; padding:10px; margin:10px 0; }
        .switch-item { display:grid; grid-template-columns: 1.2fr 1.2fr 1fr 1fr 1fr auto; gap:8px; align-items:center; margin-bottom:6px; }
        .badge-item  { display:grid; grid-template-columns: 1fr 1.2fr 1.2fr 1.2fr auto; gap:8px; align-items:center; margin-bottom:6px; }
        label { font-size:12px; color: var(--secondary-text-color); display:block; margin-bottom:2px; }
        input, select { width:100%; box-sizing:border-box; padding:6px 8px; border:1px solid var(--divider-color); border-radius:8px; background: var(--card-background-color); color: var(--primary-text-color); }
        button { padding:6px 10px; border-radius:8px; border:1px solid var(--divider-color); background: var(--ha-card-background, var(--card-background-color)); cursor:pointer; }
        .muted { color: var(--secondary-text-color); font-size:12px; margin:6px 0; }
        .row-actions { display:flex; gap:8px; margin-top:6px; flex-wrap: wrap; }
      </style>

      <div class="row-1">
        <div>
          <label>Panel title (ha-card header)</label>
          <input id="title" value="${c.title ?? ""}">
        </div>
      </div>

      <div class="row">
        <div>
          <label>Main tile text (bottom-left)</label>
          <input id="main_name" value="${h.main_name ?? ""}" placeholder="Living room">
        </div>
        <div>
          <label>Header layout</label>
          <select id="layout">
            <option value="all" ${h.layout === "all" ? "selected" : ""}>All (Main + AC + Thermostat)</option>
            <option value="main_ac" ${h.layout === "main_ac" ? "selected" : ""}>Main + AC</option>
            <option value="main_thermo" ${h.layout === "main_thermo" ? "selected" : ""}>Main + Thermostat</option>
            <option value="main_only" ${h.layout === "main_only" ? "selected" : ""}>Main only</option>
          </select>
        </div>
      </div>

      <div class="row">
        <div>
          <label>Main entity</label>
          <input id="main_entity" value="${h.main_entity || ""}" placeholder="switch.living_room_light_group">
        </div>
        <div>
          <label>Main icon</label>
          <input id="main_icon" value="${h.main_icon || "mdi:sofa-outline"}" placeholder="mdi:sofa-outline">
        </div>
      </div>

      <div class="row">
        <div>
          <label>Temperature sensor</label>
          <input id="temp_sensor" value="${h.temp_sensor || ""}">
        </div>
        <div>
          <label>Humidity sensor</label>
          <input id="humidity_sensor" value="${h.humidity_sensor || ""}">
        </div>
      </div>

      <div class="row">
        <div>
          <label>AC entity</label>
          <input id="ac_entity" value="${h.ac_entity || ""}" placeholder="climate.living_room_ac">
        </div>
        <div>
          <label>Thermostat entity</label>
          <input id="thermo_entity" value="${h.thermo_entity || ""}" placeholder="climate.thermostat_5_7_group">
        </div>
      </div>

      <div class="row">
        <div>
          <label>Tile height (px)</label>
          <input id="tile_height" type="number" min="60" value="${Number(c.tile_height)||80}">
        </div>
        <div>
          <label>Badge size / icon (px)</label>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
            <input id="badge_size" type="number" min="12" value="${Number(c.badge_size)||22}" placeholder="badge">
            <input id="badge_icon_size" type="number" min="8" value="${Number(c.badge_icon_size)||14}" placeholder="icon">
          </div>
        </div>
      </div>

      <div class="row">
        <div>
          <label>Card shadow color (hex / rgb / var())</label>
          <input id="card_shadow_color" value="${c.card_shadow_color || "#000000"}" placeholder="#000000">
        </div>
        <div>
          <label>Card shadow intensity (0–1)</label>
          <input id="card_shadow_intensity" type="number" min="0" max="1" step="0.05" value="${Number(c.card_shadow_intensity) ?? 0.5}">
        </div>
      </div>

      <div class="section">
        <div class="muted"><b>Main badges</b> — add/remove lock/gate badges on the main tile (bottom-right). Each can have its own Click/Long-press entity.</div>
        <div id="badges"></div>
        <div class="row-actions">
          <button id="add-badge-lock">+ Add lock</button>
          <button id="add-badge-gate">+ Add gate</button>
        </div>
      </div>

      <div class="section">
        <div class="muted"><b>Switch rows</b> — each item has Click, Long-press, Name, Icon and <i>Type</i> (Switch / Smart plug). Smart plug uses the animated GREEN glow when ON.</div>
        <div id="rows"></div>
        <div class="row-actions"><button id="add-row">+ Add row</button></div>
      </div>
    `;

    // Render header badges
    const badgesContainer = this.querySelector("#badges");
    headerBadges.forEach((b, idx) => {
      const row = document.createElement("div");
      row.className = "badge-item";
      row.innerHTML = `
        <div>
          <label>Type</label>
          <select data-idx="${idx}" data-k="type">
            <option value="lock" ${b.type === "lock" ? "selected" : ""}>Lock</option>
            <option value="gate" ${b.type === "gate" ? "selected" : ""}>Gate</option>
          </select>
        </div>
        <div><label>Entity</label><input data-idx="${idx}" data-k="entity" value="${b.entity || ""}" placeholder="lock.front_door / binary_sensor.gate"></div>
        <div><label>Click entity</label><input data-idx="${idx}" data-k="tap_entity" value="${b.tap_entity || ""}" placeholder="optional (defaults to entity)"></div>
        <div><label>Long-press entity</label><input data-idx="${idx}" data-k="hold_entity" value="${b.hold_entity || ""}" placeholder="optional (defaults to entity)"></div>
        <div><button class="remove-badge" data-idx="${idx}">Remove</button></div>
      `;
      badgesContainer.appendChild(row);
    });

    // Quick add badge buttons
    this.querySelector("#add-badge-lock").addEventListener("click", () => {
      if (!Array.isArray(this._config.header.badges)) this._config.header.badges = [];
      this._config.header.badges.push({ type:"lock", entity:"", tap_entity:"", hold_entity:"" });
      this._render(); this._emit();
    });
    this.querySelector("#add-badge-gate").addEventListener("click", () => {
      if (!Array.isArray(this._config.header.badges)) this._config.header.badges = [];
      this._config.header.badges.push({ type:"gate", entity:"", tap_entity:"", hold_entity:"" });
      this._render(); this._emit();
    });

    badgesContainer.addEventListener("click", (e) => {
      const rem = e.target.closest(".remove-badge");
      if (rem) {
        const i = Number(rem.getAttribute("data-idx"));
        this._config.header.badges.splice(i, 1);
        this._render(); this._emit();
      }
    });
    badgesContainer.addEventListener("input", (e) => {
      const el = e.target;
      const i = Number(el.getAttribute("data-idx"));
      const k = el.getAttribute("data-k");
      if (!Number.isInteger(i) || !k) return;
      if (!Array.isArray(this._config.header.badges)) this._config.header.badges = [];
      this._config.header.badges[i] = this._config.header.badges[i] || { type:"lock", entity:"" };
      this._config.header.badges[i][k] = el.value;
      this._emit();
    });

    // Render switch rows
    const rowsContainer = this.querySelector("#rows");
    (switchRows || []).forEach((row, rIdx) => {
      const wrap = document.createElement("div");
      wrap.className = "section";
      wrap.innerHTML = `
        <div class="muted">Row ${rIdx + 1} (${(row||[]).length} item${(row||[]).length===1?"":"s"})</div>
        <div class="items"></div>
        <div class="row-actions">
          <button data-r="${rIdx}" class="add-item">+ Add switch</button>
          <button data-r="${rIdx}" class="remove-row">Remove row</button>
        </div>
      `;
      const items = wrap.querySelector(".items");
      (row || []).forEach((sw, iIdx) => {
        const item = document.createElement("div");
        item.className = "switch-item";
        item.innerHTML = `
          <div><label>Click entity</label><input data-r="${rIdx}" data-i="${iIdx}" data-k="tap_entity" value="${sw.tap_entity || ""}" placeholder="switch.xxx / light.xxx"></div>
          <div><label>Long-press entity</label><input data-r="${rIdx}" data-i="${iIdx}" data-k="hold_entity" value="${sw.hold_entity || ""}" placeholder="any entity"></div>
          <div><label>Name</label><input data-r="${rIdx}" data-i="${iIdx}" data-k="name" value="${sw.name || ""}" placeholder="Display name"></div>
          <div><label>Icon</label><input data-r="${rIdx}" data-i="${iIdx}" data-k="icon" value="${sw.icon || ""}" placeholder="mdi:..."></div>
          <div>
            <label>Type</label>
            <select data-r="${rIdx}" data-i="${iIdx}" data-k="type">
              <option value="switch" ${((sw.type||"switch")==="switch")?"selected":""}>Switch</option>
              <option value="smart_plug" ${((sw.type||"switch")==="smart_plug")?"selected":""}>Smart plug</option>
            </select>
          </div>
          <div><button data-r="${rIdx}" data-i="${iIdx}" class="remove-item">Remove</button></div>
        `;
        items.appendChild(item);
      });
      rowsContainer.appendChild(wrap);
    });

    // Debounced emit
    const debouncedEmit = (() => { let t; return () => { clearTimeout(t); t = setTimeout(() => this._emit(), 120); }; })();

    // Primitive updates
    [
      "title","layout","main_name","main_entity","main_icon",
      "temp_sensor","humidity_sensor","ac_entity","thermo_entity",
      "tile_height","badge_size","badge_icon_size","card_shadow_color","card_shadow_intensity"
    ].forEach(id => {
      const el = this.querySelector("#"+id);
      if (!el) return;
      el.addEventListener("input", () => {
        this._config.header = this._config.header || {};
        if (id === "title") this._config.title = el.value;
        else if (id === "layout") this._config.header.layout = el.value;
        else if (id === "tile_height") this._config.tile_height = Number(el.value);
        else if (id === "badge_size") this._config.badge_size = Number(el.value);
        else if (id === "badge_icon_size") this._config.badge_icon_size = Number(el.value);
        else if (id === "card_shadow_color") this._config.card_shadow_color = el.value;
        else if (id === "card_shadow_intensity") this._config.card_shadow_intensity = Number(el.value);
        else this._config.header[id] = el.value;
        debouncedEmit();
      });
    });

    // Rows actions
    this.querySelector("#add-row").addEventListener("click", () => {
      if (!Array.isArray(this._config.switch_rows)) this._config.switch_rows = [];
      this._config.switch_rows.push([]);
      this._render(); this._emit();
    });

    rowsContainer.addEventListener("click", (e) => {
      const add = e.target.closest(".add-item");
      const remItem = e.target.closest(".remove-item");
      const remRow = e.target.closest(".remove-row");
      if (add) {
        const r = Number(add.getAttribute("data-r"));
        if (!Array.isArray(this._config.switch_rows)) this._config.switch_rows = [];
        this._config.switch_rows[r].push({ tap_entity: "", hold_entity: "", name: "", icon: "", type: "switch" });
        this._render(); this._emit();
      }
      if (remItem) {
        const r = Number(remItem.getAttribute("data-r"));
        const i = Number(remItem.getAttribute("data-i"));
        this._config.switch_rows[r].splice(i, 1);
        this._render(); this._emit();
      }
      if (remRow) {
        const r = Number(remRow.getAttribute("data-r"));
        this._config.switch_rows.splice(r, 1);
        this._render(); this._emit();
      }
    });

    rowsContainer.addEventListener("input", (e) => {
      const el = e.target;
      const r = Number(el.getAttribute("data-r"));
      const i = Number(el.getAttribute("data-i"));
      const k = el.getAttribute("data-k");
      if (!Number.isInteger(r) || !Number.isInteger(i) || !k) return;
      if (!Array.isArray(this._config.switch_rows)) this._config.switch_rows = [];
      if (!this._config.switch_rows[r]) this._config.switch_rows[r] = [];
      if (!this._config.switch_rows[r][i]) this._config.switch_rows[r][i] = { tap_entity:"", hold_entity:"", name:"", icon:"", type:"switch" };
      if (k === "type") {
        this._config.switch_rows[r][i].type = el.value === "smart_plug" ? "smart_plug" : "switch";
      } else {
        this._config.switch_rows[r][i][k] = el.value;
      }
      this._emit();
    });
  }

  _emit() {
    const str = JSON.stringify(this._config);
    this._configStr = str;
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: this._config }, bubbles: true, composed: true
    }));
  }

  // Caret helpers
  _getCaretInfo() {
    const el = this.querySelector("input:focus, textarea:focus, select:focus");
    if (!el) return null;
    return {
      id: el.id || null,
      dataset: {
        r: el.getAttribute("data-r"),
        i: el.getAttribute("data-i"),
        k: el.getAttribute("data-k"),
        idx: el.getAttribute("data-idx")
      },
      start: el.selectionStart, end: el.selectionEnd
    };
  }
  _restoreCaret(ci) {
    if (!ci) return;
    let el = null;
    if (ci.id) el = this.querySelector("#"+ci.id);
    if (!el && ci.dataset) {
      if (ci.dataset.idx !== null && ci.dataset.idx !== undefined) {
        el = this.querySelector(`[data-idx="${ci.dataset.idx}"][data-k="${ci.dataset.k}"]`);
      } else if (ci.dataset.r !== null && ci.dataset.i !== null) {
        el = this.querySelector(`[data-r="${ci.dataset.r}"][data-i="${ci.dataset.i}"][data-k="${ci.dataset.k}"]`);
      }
    }
    if (el && typeof ci.start === "number" && typeof ci.end === "number" && el.setSelectionRange) {
      el.focus();
      try { el.setSelectionRange(ci.start, ci.end); } catch(e) {}
    }
  }
}

/* -------- Register elements (safe re-register) -------- */
if (!customElements.get("bitosome-room-card")) customElements.define("bitosome-room-card", bitosomeRoomCard);
if (!customElements.get("bitosome-room-card-editor")) customElements.define("bitosome-room-card-editor", bitosomeRoomCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "bitosome-room-card",
  name: "Room card",
  description: "Room control card "
});
