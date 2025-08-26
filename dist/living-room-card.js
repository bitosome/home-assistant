var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
const fireEvent = (node, type, detail) => {
    const event = new Event(type, {
        bubbles: true,
        composed: true,
    });
    event.detail = detail || {};
    node.dispatchEvent(event);
    return event;
};
let LivingRoomCard = class LivingRoomCard extends LitElement {
    static get styles() {
        return css `
      ha-card.lr-wrapper {
        border-radius: 16px;
        background: linear-gradient(
          180deg,
          rgba(var(--rgb-card-background-color, 255, 255, 255), 0.92),
          rgba(var(--rgb-card-background-color, 250, 250, 250), 0.85)
        );
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        padding: 12px;
        color: var(--primary-text-color);
        margin-bottom: 20px;
      }
      .header {
        display: flex;
        gap: 12px;
      }
      .main-card {
        border-radius: 12px;
        height: 80px;
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.1);
        position: relative;
        padding-left: 16px;
        flex: 1;
        background: var(--ha-card-background, var(--card-background-color));
      }
      .main-card .icon_tl {
        position: absolute;
        left: 12px;
        top: 8px;
      }
      .main-card .temp_tr {
        position: absolute;
        right: 8px;
        top: 8px;
        z-index: 3;
      }
      .main-card .bulb_br {
        position: absolute;
        right: 8px;
        bottom: 8px;
        z-index: 3;
      }
      .main-card .name {
        position: absolute;
        left: 12px;
        bottom: 8px;
        font-weight: 500;
        font-size: 14px;
        color: var(--primary-text-color);
      }
      .temp_tr .chip {
        display: inline-flex;
        align-items: center;
        gap: 1px;
        padding: 2px 6px;
        border-radius: 999px;
        background: rgba(0, 0, 0, 0.06);
        font-size: 11px;
        color: var(--secondary-text-color);
        line-height: 1;
        white-space: nowrap;
        box-sizing: border-box;
      }
      .temp_tr ha-icon {
        width: 11px;
        height: 11px;
        margin: 0;
        padding: 0;
        color: var(--secondary-text-color);
      }
      .temp_tr span {
        font-weight: 700;
        margin: 0;
        padding: 0;
      }
      .temp_tr span.sep {
        opacity: 0.6;
      }
      .ac-card, .thermo-card {
        border-radius: 12px;
        padding: 10px;
        transition: transform 0.18s ease, box-shadow 0.28s ease, filter 0.12s ease;
        background: var(--card-background-color);
        backdrop-filter: blur(10px);
        width: 80px;
        height: 80px;
        position: relative;
      }
      .ac-card .icon_center, .thermo-card .icon_center {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        z-index: 2;
      }
      .ac-card .mode_badge_icon {
        position: absolute;
        right: 8px;
        top: 8px;
        z-index: 3;
      }
      .ac-card .mode_badge_icon .badge {
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        width: 20px;
        height: 20px;
        box-sizing: border-box;
      }
      .thermo-card .temp_tr {
        position: absolute;
        right: 8px;
        top: 8px;
        z-index: 3;
      }
      .thermo-card .temp_tr .badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 2px 0;
        border-radius: 999px;
        background: #ff7043;
        font-size: 11px;
        color: #fff;
        width: auto;
        text-align: center;
        white-space: nowrap;
      }
      .switch-row {
        display: flex;
        gap: 12px;
        margin-top: 12px;
      }
      .switch-card {
        border-radius: 12px;
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.1);
        transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s ease;
        background: var(--card-background-color);
        height: 80px;
        flex: 1;
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }
      .switch-card ha-icon {
        width: 28px;
      }
      .switch-card .name {
        font-weight: 600;
        font-size: 12px;
        margin-top: 4px;
        justify-self: center;
      }
      .switch-card.on {
        background: var(--primary-color);
        color: var(--primary-background-color);
        transform: translateY(2px);
        box-shadow: inset 0 6px 14px rgba(0,0,0,0.20), 0 18px 40px rgba(255,193,7,0.30), 0 6px 18px rgba(255,193,7,0.16);
        filter: drop-shadow(0 18px 32px rgba(255,193,7,0.22));
        z-index: 2;
      }
      .switch-card.on ha-icon {
        color: var(--primary-background-color);
      }
      .switch-card.off {
        background: var(--ha-card-background, var(--card-background-color));
        transform: translateY(0);
        box-shadow: 0 6px 18px rgba(0,0,0,0.10);
        filter: none;
        z-index: 0;
      }
      .switch-card.off ha-icon {
        color: var(--secondary-text-color);
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
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
    `;
    }
    setConfig(config) {
        if (!config.main_entity) {
            throw new Error('main_entity required');
        }
        this._config = config;
    }
    getCardSize() {
        return 5;
    }
    _moreInfo(entity) {
        fireEvent(this, 'hass-more-info', { entityId: entity });
    }
    _toggle(entity) {
        const domain = entity.split('.')[0];
        this.hass.callService(domain, 'toggle', { entity_id: entity });
    }
    _acToggle() {
        const entity = this._config.ac_entity;
        const stateObj = this.hass.states[entity];
        const service = stateObj?.state === 'off' ? 'turn_on' : 'turn_off';
        this.hass.callService('climate', service, { entity_id: entity });
    }
    _thermoToggle() {
        const entity = this._config.thermostat_entity;
        const stateObj = this.hass.states[entity];
        const hvac = stateObj?.state === 'off' ? 'heat' : 'off';
        this.hass.callService('climate', 'set_hvac_mode', { entity_id: entity, hvac_mode: hvac });
    }
    _renderMain() {
        const entity = this._config.main_entity;
        const stateObj = this.hass.states[entity];
        const name = stateObj?.attributes.friendly_name ?? entity;
        const temp = this._config.temperature_sensor ? this.hass.states[this._config.temperature_sensor]?.state : undefined;
        const hum = this._config.humidity_sensor ? this.hass.states[this._config.humidity_sensor]?.state : undefined;
        const tempHum = (temp !== undefined && hum !== undefined)
            ? html `<div class="temp_tr"><div class="chip"><ha-icon icon="mdi:thermometer"></ha-icon><span>${Number(temp).toFixed(2)}°</span><span class="sep">|</span><ha-icon icon="mdi:water-percent"></ha-icon><span>${Number(hum).toFixed(2)}%</span></div></div>`
            : '';
        const isOn = stateObj?.state === 'on';
        const bulbBg = isOn ? 'linear-gradient(135deg,#ffcf57,#ffb200)' : 'rgba(0,0,0,0.06)';
        const bulbIcon = isOn ? '#ffffff' : 'var(--secondary-text-color)';
        return html `
      <div class="main-card" @click=${() => this._moreInfo(entity)}>
        <div class="icon_tl"><ha-icon icon="mdi:sofa-outline" style="width:40px;height:40px;"></ha-icon></div>
        ${tempHum}
        <div class="bulb_br"><div class="badge" style="display:flex;align-items:center;justify-content:center;background:${bulbBg};border-radius:999px;width:20px;height:20px;box-sizing:border-box;"><ha-icon icon="mdi:lightbulb" style="width:12px;height:12px;color:${bulbIcon};display:block;margin:0;padding:0;line-height:0;pointer-events:none;"></ha-icon></div></div>
        <div class="name">${name}</div>
      </div>
    `;
    }
    _renderAC() {
        const entity = this._config.ac_entity;
        const stateObj = this.hass.states[entity];
        const modeRaw = (stateObj?.state || stateObj?.attributes?.hvac_mode || '').toString().toLowerCase();
        let iconColor = 'gray';
        let badgeBg = 'rgba(0,0,0,0.06)';
        let badgeIcon = 'mdi:air-conditioner';
        let pulseWeak = 'rgba(0,0,0,0.06)';
        let pulseStrong = 'rgba(0,0,0,0.12)';
        if (modeRaw === 'off' || modeRaw === '') {
            badgeBg = 'rgba(158,158,158,0.95)';
            badgeIcon = 'mdi:power';
            iconColor = 'gray';
        }
        else if (modeRaw.includes('cool')) {
            iconColor = '#00aaff';
            badgeBg = '#00aaff';
            badgeIcon = 'mdi:snowflake';
            pulseWeak = 'rgba(0,170,255,0.12)';
            pulseStrong = 'rgba(0,170,255,0.26)';
        }
        else if (modeRaw.includes('heat')) {
            iconColor = '#ff7043';
            badgeBg = '#ff7043';
            badgeIcon = 'mdi:fire';
            pulseWeak = 'rgba(255,112,67,0.12)';
            pulseStrong = 'rgba(255,112,67,0.26)';
        }
        else if (modeRaw.includes('dry')) {
            iconColor = '#ffca28';
            badgeBg = '#ffca28';
            badgeIcon = 'mdi:water-percent';
            pulseWeak = 'rgba(255,202,40,0.12)';
            pulseStrong = 'rgba(255,202,40,0.26)';
        }
        else if (modeRaw.includes('fan')) {
            iconColor = '#66bb6a';
            badgeBg = '#66bb6a';
            badgeIcon = 'mdi:fan';
            pulseWeak = 'rgba(102,187,106,0.12)';
            pulseStrong = 'rgba(102,187,106,0.26)';
        }
        else if (modeRaw.includes('auto')) {
            iconColor = '#26c6da';
            badgeBg = '#26c6da';
            badgeIcon = 'mdi:autorenew';
            pulseWeak = 'rgba(38,198,218,0.12)';
            pulseStrong = 'rgba(38,198,218,0.26)';
        }
        const spin = (stateObj?.state === 'off') ? 'none' : 'spin 1.5s linear infinite';
        const animation = (stateObj?.state === 'off') ? 'none' : 'activePulse 2.4s ease-in-out infinite';
        const boxShadow = (stateObj?.state === 'off') ? '0 6px 18px rgba(0,0,0,0.10)' : '0 10px 20px var(--pulse-weak)';
        return html `
      <div class="ac-card" style="--pulse-weak:${pulseWeak}; --pulse-strong:${pulseStrong}; animation:${animation}; box-shadow:${boxShadow};" @click=${this._acToggle}>
        <div class="icon_center"><div style="width:52px;height:52px;display:flex;align-items:center;justify-content:center;border-radius:999px;box-shadow:none;pointer-events:none;user-select:none"><div style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;"><ha-icon icon="mdi:fan" style="width:36px;height:36px;color:${iconColor};animation:${spin};display:block;margin:0;padding:0;line-height:0;pointer-events:none;user-select:none"></ha-icon></div></div></div>
        <div class="mode_badge_icon"><div class="badge" style="background:${badgeBg};"><ha-icon icon="${badgeIcon}" style="width:12px;height:12px;color:#ffffff;display:block;margin:0;padding:0;line-height:0"></ha-icon></div></div>
      </div>
    `;
    }
    _renderThermostat() {
        const entity = this._config.thermostat_entity;
        const stateObj = this.hass.states[entity];
        const hvacAction = (stateObj?.attributes?.hvac_action || '').toString().toLowerCase();
        const state = (stateObj?.state || '').toString().toLowerCase();
        let iconColor = 'var(--paper-item-icon-color)';
        if (state === 'off') {
            iconColor = 'gray';
        }
        else if (hvacAction === 'heating' || state === 'heating') {
            iconColor = '#ff7043';
        }
        else {
            iconColor = '#66bb6a';
        }
        const raw = stateObj?.attributes?.temperature ?? stateObj?.attributes?.target_temp ?? stateObj?.attributes?.target_temperature ?? stateObj?.attributes?.setpoint ?? stateObj?.attributes?.away_temperature;
        const t = raw === undefined || raw === null || raw === '' ? '—' : Number(raw).toFixed(1);
        const animation = hvacAction === 'heating' ? 'heatingGlow 2.4s ease-in-out infinite' : 'none';
        return html `
      <div class="thermo-card" style="animation:${animation}; box-shadow:0 6px 18px rgba(0,0,0,0.10);" @click=${this._thermoToggle}>
        <div class="icon_center"><div style="width:52px;height:52px;display:flex;align-items:center;justify-content:center;border-radius:999px;box-shadow:none;pointer-events:none;user-select:none"><div style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;"><ha-icon icon="mdi:thermostat" style="width:44px;height:44px;color:${iconColor};display:block;margin:0;padding:0;line-height:0;pointer-events:none"></ha-icon></div></div></div>
        <div class="temp_tr"><div class="badge"><span style="font-weight:700;line-height:1;padding:0 2px">${t}°</span></div></div>
      </div>
    `;
    }
    _renderSwitch(entry) {
        const stateObj = this.hass.states[entry.entity];
        const isOn = stateObj?.state === 'on';
        const name = entry.name || stateObj?.attributes?.friendly_name || '';
        const icon = entry.icon || stateObj?.attributes?.icon || 'mdi:toggle-switch';
        const cls = isOn ? 'switch-card on' : 'switch-card off';
        return html `
      <div class="${cls}" @click=${() => this._toggle(entry.entity)} @contextmenu=${(ev) => { ev.preventDefault(); this._moreInfo(entry.entity); }}>
        <ha-icon icon="${icon}"></ha-icon>
        <div class="name">${name}</div>
      </div>
    `;
    }
    render() {
        if (!this._config || !this.hass) {
            return html ``;
        }
        const switches = this._config.switches || [];
        const rows = [];
        for (let i = 0; i < switches.length; i += 3) {
            rows.push(switches.slice(i, i + 3));
        }
        return html `
      <ha-card class="lr-wrapper">
        <div class="header">
          ${this._renderMain()}
          ${this._config.ac_entity ? this._renderAC() : ''}
          ${this._config.thermostat_entity ? this._renderThermostat() : ''}
        </div>
        ${rows.map((row) => html `<div class="switch-row">${row.map((s) => this._renderSwitch(s))}</div>`)}
      </ha-card>
    `;
    }
};
__decorate([
    property({ attribute: false })
], LivingRoomCard.prototype, "hass", void 0);
__decorate([
    state()
], LivingRoomCard.prototype, "_config", void 0);
LivingRoomCard = __decorate([
    customElement('living-room-card')
], LivingRoomCard);
export { LivingRoomCard };
window.customCards = window.customCards || [];
window.customCards.push({
    type: 'living-room-card',
    name: 'Living Room Card',
    description: 'Custom living room control card',
});
export default LivingRoomCard;
//# sourceMappingURL=living-room-card.js.map