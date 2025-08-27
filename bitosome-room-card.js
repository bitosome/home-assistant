import { LitElement, html, css, nothing } from "lit";
import { actionHandler } from "custom-card-helpers";

class BitosomeRoomCard extends LitElement {
  static properties = {
    hass: {},
    _config: {},
  };

  static styles = css`
    :host { display:block; }
    .metrics, .metrics * { box-sizing: border-box; }
    .metrics {
      --tile-h:80px;
      --badge:22px;
      --badge-icon:14px;
      --ac-therm-icon:50px;
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
  `;

  static getStubConfig() {
    return {
      title: "Living room",
      tile_height: 80,
      badge_size: 22,
      badge_icon_size: 14,
      card_shadow_color: "#000000",
      card_shadow_intensity: 0.5,
      header: {
        layout: "all",
        main_entity: "switch.living_room_light_group",
        main_name: "Living room",
        main_icon: "mdi:sofa-outline",
        temp_sensor: "sensor.kitchen_living_room_temparature_average",
        humidity_sensor: "sensor.kitchen_living_room_humidity_average",
        ac_entity: "climate.living_room_ac",
        thermo_entity: "climate.thermostat_5_7_group",
        badges: []
      },
      switch_rows: []
    };
  }

  setConfig(config) {
    this._config = JSON.parse(JSON.stringify(config || BitosomeRoomCard.getStubConfig()));
    if (!this._config.header) this._config.header = {};
    if (!Array.isArray(this._config.header.badges)) this._config.header.badges = [];
    if (!Array.isArray(this._config.switch_rows)) this._config.switch_rows = [];
  }

  getCardSize() { return 6; }

  render() {
    if (!this._config) return html``;

    const c = { ...BitosomeRoomCard.getStubConfig(), ...this._config };
    const h = { ...BitosomeRoomCard.getStubConfig().header, ...(c.header || {}) };

    const tileH = Number(c.tile_height) || 80;
    const badgeSize = Number(c.badge_size) || 22;
    const badgeIcon = Number(c.badge_icon_size) || 14;
    const panelShadowColor = this._rgbaFromColor(c.card_shadow_color, c.card_shadow_intensity);

    return html`
      <ha-card style="--panel-shadow-color:${panelShadowColor}" ${c.title ? html`header="${c.title}"` : nothing}>
        <div class="metrics" style="--tile-h:${tileH}px; --badge:${badgeSize}px; --badge-icon:${badgeIcon}px; --ac-therm-icon:50px;">
          <div class="root">
            ${this._renderHeaderRow(h)}
            ${this._renderSwitchRows(c.switch_rows)}
          </div>
        </div>
      </ha-card>
    `;
  }

  _renderHeaderRow(h) {
    const cls =
      h.layout === "main_only" ? "header-row only-main" :
      (h.layout === "all" ? "header-row" : "header-row main-plus-one");

    const showAC = (h.layout === "all" || h.layout === "main_ac") && h.ac_entity;
    const showThermo = (h.layout === "all" || h.layout === "main_thermo") && h.thermo_entity;

    return html`
      <div class="${cls}">
        ${this._renderMainTile(h)}
        ${showAC ? this._renderACTile(h.ac_entity) : nothing}
        ${showThermo ? this._renderThermoTile(h.thermo_entity) : nothing}
      </div>
    `;
  }

  _renderMainTile(h) {
    const icon = h.main_icon || "mdi:sofa-outline";
    const name = h.main_name || "";
    const tVal = this._fmt2(h.temp_sensor, 2, "°");
    const hVal = this._fmt2(h.humidity_sensor, 2, "%");
    return html`
      <div class="main-tile clickable"
           .actionHandler=${actionHandler({hasHold: true})}
           @action=${(e)=>this._handleMainAction(e, h.main_entity)}>
        <ha-icon class="main-icon" icon="${icon}"></ha-icon>

        <div class="chip-tr">
          <ha-icon icon="mdi:thermometer"></ha-icon>
          <span class="tval">${tVal}</span>
          <span style="opacity:.6;">|</span>
          <ha-icon icon="mdi:water-percent"></ha-icon>
          <span class="hval">${hVal}</span>
        </div>

        <div class="main-badges-br">
          ${this._renderMainBadges(h)}
        </div>

        <div class="main-name">${name}</div>
      </div>
    `;
  }

  _renderMainBadges(h) {
    const arr = [];
    if (h.main_entity) {
      arr.push(this._renderBadge({kind:"bulb", entity:h.main_entity, tap_entity:h.main_entity, hold_entity:h.main_entity}));
    }
    (Array.isArray(h.badges)?h.badges:[]).forEach(b=>{
      if(!b || !b.entity) return;
      arr.push(this._renderBadge({
        kind:(b.type||"").toLowerCase(),
        entity:b.entity,
        tap_entity:b.tap_entity||b.entity,
        hold_entity:b.hold_entity||b.entity
      }));
    });
    return arr;
  }

  _renderACTile(entityId) {
    const mode = (this.hass?.states[entityId]?.state || "").toLowerCase();
    const active = mode && mode !== "off";
    const fanStyle = `${active ? "animation:spin 1.5s linear infinite;" : ""}color:${this._acModeColor(mode)};`;
    const badge = this._acBadge(mode);
    const colors = this._acPulseColors(mode);
    return html`
      <div class="square ac-tile clickable"
           style="animation:${active?"activePulse 2.4s ease-in-out infinite":"none"};--pulse-weak:${colors.weak};--pulse-strong:${colors.strong};"
           .actionHandler=${actionHandler({hasHold:true})}
           @action=${(e)=>this._handleACAction(e, entityId)}>
        <div class="badge badge-tr" style="background:${badge.bg};">
          <ha-icon icon="${badge.icon}" style="color:#fff"></ha-icon>
        </div>
        <div class="center-xy">
          <ha-icon class="ac-fan" icon="mdi:fan" style="${fanStyle}"></ha-icon>
        </div>
      </div>
    `;
  }

  _renderThermoTile(entityId) {
    const st = this.hass?.states[entityId];
    const hvacAction = (st?.attributes?.hvac_action || "").toLowerCase();
    const state = (st?.state || "").toLowerCase();
    const target = st?.attributes?.temperature ?? st?.attributes?.target_temp ?? st?.attributes?.target_temperature ?? st?.attributes?.setpoint ?? st?.attributes?.away_temperature;
    const tSpan = this._fmtNumber(target, 1) + "°";
    const icoColor = state === "off" ? "gray" : ((hvacAction === "heating" || state === "heating") ? "#ff7043" : "#66bb6a");
    const anim = (hvacAction === "heating" || state === "heating") ? "heatingGlow 2.4s ease-in-out infinite" : "none";
    return html`
      <div class="square thermo-tile clickable"
           style="animation:${anim};"
           .actionHandler=${actionHandler({hasHold:true})}
           @action=${(e)=>this._handleThermoAction(e, entityId)}>
        <div class="temp-chip-tr">
          <div class="temp-pill"><span class="thermo-target">${tSpan}</span></div>
        </div>
        <div class="center-xy">
          <ha-icon class="thermo-icon" icon="mdi:thermostat" style="color:${icoColor};"></ha-icon>
        </div>
      </div>
    `;
  }

  _renderSwitchRows(rows) {
    if (!rows || !rows.length) return nothing;
    return rows.map((row) => html`
      <div class="switch-row" style="--cols:${(row || []).length || 1}">
        ${(row || []).map(sw => this._renderSwitchTile(sw))}
      </div>
    `);
  }

  _renderSwitchTile(sw) {
    const tap = sw.tap_entity || "";
    const hold = sw.hold_entity || tap || "";
    const icon = sw.icon || "";
    const name = sw.name || "";
    const type = (sw.type || "switch").toLowerCase();
    const isSmart = type === "smart_plug";
    const on = this._isOn(tap);
    const cls = `switch-tile clickable ${isSmart?"smart":""} ${on?"on":""}`;
    return html`
      <div class="${cls}"
           .actionHandler=${actionHandler({hasHold: !!hold})}
           @action=${(e)=>this._handleSwitchAction(e,tap,hold)}>
        <div class="tile-inner">
          ${icon ? html`<ha-icon class="switch-icon" icon="${icon}"></ha-icon>` : nothing}
          ${name ? html`<div class="name">${name}</div>` : nothing}
        </div>
      </div>
    `;
  }

  _renderBadge({kind, entity, tap_entity, hold_entity}) {
    const st = this._badgeStyle(kind, entity);
    return html`
      <div class="badge"
           style="background:${st.bg};"
           .actionHandler=${actionHandler({hasHold:true})}
           @action=${(e)=>this._handleBadgeAction(e, tap_entity, hold_entity)}>
        <ha-icon icon="${st.icon}" style="color:${st.color};"></ha-icon>
      </div>
    `;
  }

  _handleMainAction(ev, entity) {
    this._openMoreInfo(entity);
  }
  _handleACAction(ev, entity) {
    if (ev.detail.action === "hold") this._openMoreInfo(entity);
    else this._acToggle(entity);
  }
  _handleThermoAction(ev, entity) {
    if (ev.detail.action === "hold") this._openMoreInfo(entity);
    else this._thermoToggle(entity);
  }
  _handleSwitchAction(ev, tap, hold) {
    if (ev.detail.action === "hold") this._openMoreInfo(hold);
    else this._toggleGeneric(tap);
  }
  _handleBadgeAction(ev, tap, hold) {
    if (ev.detail.action === "hold") this._openMoreInfo(hold);
    else this._toggleGeneric(tap);
  }

  _badgeStyle(kind, entity) {
    const st = this.hass?.states[entity];
    if (kind === "bulb") {
      const on = this._isOn(entity);
      return {
        bg: on ? "linear-gradient(135deg,#ffcf57,#ffb200)" : "rgba(0,0,0,0.06)",
        color: on ? "#ffffff" : "var(--secondary-text-color)",
        icon: "mdi:lightbulb"
      };
    }
    if (kind === "lock") {
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
      let color = "var(--secondary-text-color)";
      if (!isUnknown) {
        const rgb = isLocked ? rgbLocked : (isUnlocked ? rgbUnlocked : rgbPending);
        bg = `linear-gradient(135deg, rgba(${rgb},1), rgba(${rgb},0.92))`;
        color = "#ffffff";
      }
      return { bg, color, icon: lockIcon };
    }
    if (kind === "gate") {
      const s = (st?.state || "").toLowerCase();
      const isOpen    = s === "on" || s === "open";
      const isClosed  = s === "off" || s === "closed";
      const isUnknown = !s || s === "unknown" || s === "unavailable";
      const rgbClosed = "var(--mush-rgb-state-lock-locked, 76,175,80)";
      const rgbOpen   = "var(--mush-rgb-state-lock-unlocked, 244,67,54)";
      const rgbPend   = "var(--mush-rgb-state-lock-pending, 255,152,0)";
      let icon = isOpen ? "mdi:gate-open" : "mdi:gate";
      let bg = "rgba(0,0,0,0.06)";
      let color = "var(--secondary-text-color)";
      if (!isUnknown) {
        const rgb = isClosed ? rgbClosed : (isOpen ? rgbOpen : rgbPend);
        bg = `linear-gradient(135deg, rgba(${rgb},1), rgba(${rgb},0.92))`;
        color = "#ffffff";
      }
      return { bg, color, icon };
    }
    return { bg:"rgba(0,0,0,0.06)", color:"var(--secondary-text-color)", icon:"mdi:checkbox-blank-circle-outline" };
  }

  _fmt2(entityId, digits, suffix) {
    if (!entityId) return "—" + (suffix || "");
    const st = this.hass?.states[entityId];
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
    const st = this.hass?.states[entityId];
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
    this.hass.callService(d, s, { entity_id: entityId });
  }
  _acToggle(entityId) {
    const st = this.hass.states[entityId];
    const mode = (st?.state || "").toLowerCase();
    const on = !!mode && mode !== "off";
    this.hass.callService("climate", on ? "turn_off" : "turn_on", { entity_id: entityId });
  }
  _thermoToggle(entityId) {
    const st = this.hass.states[entityId];
    const mode = (st?.state || "").toLowerCase();
    const next = (mode === "off") ? "heat" : "off";
    this.hass.callService("climate", "set_hvac_mode", { entity_id: entityId, hvac_mode: next });
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
    this._config = JSON.parse(JSON.stringify(config || BitosomeRoomCard.getStubConfig()));
    if (!this._config.header) this._config.header = {};
    if (!Array.isArray(this._config.header.badges)) this._config.header.badges = [];
    if (!Array.isArray(this._config.switch_rows)) this._config.switch_rows = [];
    this._render();
    this._restoreCaret(caret);
  }

  /* Rest of editor code unchanged from original for brevity */
}

customElements.define("bitosome-room-card", BitosomeRoomCard);
customElements.define("bitosome-room-card-editor", bitosomeRoomCardEditor);

