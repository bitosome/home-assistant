import { LitElement, html, css } from "lit";

/**
 * Fire a custom event. Same helper as used by Mushroom in `src/ha/common/dom/fire_event.ts`.
 */
const fireEvent = (node, type, detail, options = {}) => {
  detail = detail === null || detail === undefined ? {} : detail;
  const event = new Event(type, {
    bubbles: options.bubbles === undefined ? true : options.bubbles,
    cancelable: Boolean(options.cancelable),
    composed: options.composed === undefined ? true : options.composed,
  });
  event.detail = detail;
  node.dispatchEvent(event);
  return event;
};

/**
 * Bitosome Alarm Card rewritten following the pattern of Mushroom's helpers in
 * `src/ha/common`. It manages two alarm schedules (workday/weekend) and triggers
 * provided automations when the next alarm fires.
 */
class AlarmCard extends LitElement {
  static properties = {
    hass: {},
    _config: {},
    _workday: {},
    _weekend: {},
    _next: {},
  };

  constructor() {
    super();
    this._workday = { enabled: false, time: "07:00" };
    this._weekend = { enabled: false, time: "09:00" };
    this._next = null;
    this._timeout = null;
  }

  setConfig(config) {
    if (!config || !config.automations) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
    this._workday = {
      enabled: Boolean(config.workday?.enabled),
      time: config.workday?.time || "07:00",
    };
    this._weekend = {
      enabled: Boolean(config.weekend?.enabled),
      time: config.weekend?.time || "09:00",
    };
    this._updateNext();
  }

  getCardSize() {
    return 2;
  }

  connectedCallback() {
    super.connectedCallback();
    this._scheduleTrigger();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._timeout) {
      clearTimeout(this._timeout);
      this._timeout = null;
    }
  }

  // ---------- Rendering ----------
  render() {
    if (!this.hass || !this._config) return html``;
    return html`
      <ha-card>
        <div class="grid">
          <ha-icon class="icon" icon="mdi:alarm-note"></ha-icon>
          <div class="row">
            <span class="label">Workday</span>
            <ha-switch
              .checked=${this._workday.enabled}
              @change=${(e) => this._setWorkdayEnabled(e.target.checked)}
            ></ha-switch>
            <input
              type="time"
              .value=${this._workday.time}
              @change=${(e) => this._setWorkdayTime(e.target.value)}
            />
          </div>
          <div class="row">
            <span class="label">Weekend</span>
            <ha-switch
              .checked=${this._weekend.enabled}
              @change=${(e) => this._setWeekendEnabled(e.target.checked)}
            ></ha-switch>
            <input
              type="time"
              .value=${this._weekend.time}
              @change=${(e) => this._setWeekendTime(e.target.value)}
            />
          </div>
          <div class="next">${this._renderNext()}</div>
        </div>
      </ha-card>
    `;
  }

  _renderNext() {
    if (!this._next) return "Disabled";
    return `Next: ${this._formatDate(this._next.date)}`;
  }

  // ---------- State handlers ----------
  _setWorkdayEnabled(enabled) {
    this._workday = { ...this._workday, enabled };
    this._updateNext();
  }
  _setWeekendEnabled(enabled) {
    this._weekend = { ...this._weekend, enabled };
    this._updateNext();
  }
  _setWorkdayTime(time) {
    this._workday = { ...this._workday, time };
    this._updateNext();
  }
  _setWeekendTime(time) {
    this._weekend = { ...this._weekend, time };
    this._updateNext();
  }

  // ---------- Alarm computation ----------
  _updateNext() {
    const now = new Date();
    this._next = this._computeNextAlarm(
      now,
      this._workday.enabled,
      this._weekend.enabled,
      this._workday.time,
      this._weekend.time
    );
    this._scheduleTrigger();
  }

  _computeNextAlarm(now, workEnabled, weekendEnabled, workTime, weekendTime) {
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const d = new Date(now);
      d.setDate(d.getDate() + dayOffset);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      if (isWeekend && !weekendEnabled) continue;
      if (!isWeekend && !workEnabled) continue;
      const [h, m] = (isWeekend ? weekendTime : workTime).split(":");
      d.setHours(Number(h), Number(m), 0, 0);
      if (d <= now) continue;
      return { date: d, type: isWeekend ? "weekend" : "workday" };
    }
    return null;
  }

  _scheduleTrigger() {
    if (this._timeout) {
      clearTimeout(this._timeout);
      this._timeout = null;
    }
    if (!this._next || !this.hass || !this._config?.automations) return;
    const delay = this._next.date.getTime() - Date.now();
    if (delay <= 0 || delay > 7 * 24 * 60 * 60 * 1000) return;
    this._timeout = setTimeout(() => {
      const id =
        this._next.type === "weekend"
          ? this._config.automations.weekend
          : this._config.automations.workday;
      if (id) {
        this.hass.callService("automation", "trigger", { entity_id: id });
      }
      this._updateNext();
    }, delay);
  }

  // ---------- Utils ----------
  _formatDate(d) {
    const datePart = d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "2-digit",
    });
    const timePart = d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return `${datePart} ${timePart}`;
  }

  static styles = css`
    ha-card {
      padding: 14px;
      border-radius: var(--ha-card-border-radius, 14px);
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr auto;
      grid-auto-rows: auto;
      row-gap: 8px;
      column-gap: 12px;
      align-items: center;
    }
    .icon {
      grid-row: span 2;
      width: 40px;
      height: 40px;
      color: var(--primary-text-color);
    }
    .row {
      display: contents;
    }
    .label {
      font-size: 12px;
      text-transform: lowercase;
      color: var(--secondary-text-color);
    }
    ha-switch {
      --mdc-switch-unchecked-track-color: var(
        --switch-unchecked-color,
        rgba(0, 0, 0, 0.2)
      );
    }
    input[type="time"] {
      appearance: none;
      border: none;
      outline: none;
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 14px;
      width: 88px;
      text-align: center;
      background: var(--control-card-background, rgba(0, 0, 0, 0.06));
      color: var(--primary-text-color);
    }
    .next {
      grid-column: 1 / -1;
      font-size: 13px;
      color: var(--secondary-text-color);
    }
  `;
}

/* ---------------- Editor ---------------- */
class AlarmCardEditor extends LitElement {
  static properties = {
    hass: {},
    _config: {},
  };

  setConfig(config) {
    this._config = { ...config };
  }

  render() {
    if (!this._config) return html``;
    return html`
      <div class="editor">
        <p>Automation entities triggered when alarm fires:</p>
        <label>
          Workday
          <input
            type="text"
            .value=${this._config.automations?.workday || ""}
            @input=${(e) => this._setAutomation("workday", e.target.value)}
          />
        </label>
        <label>
          Weekend
          <input
            type="text"
            .value=${this._config.automations?.weekend || ""}
            @input=${(e) => this._setAutomation("weekend", e.target.value)}
          />
        </label>
      </div>
    `;
  }

  _setAutomation(key, value) {
    this._config = {
      ...this._config,
      automations: { ...this._config.automations, [key]: value },
    };
    fireEvent(this, "config-changed", { config: this._config });
  }

  static styles = css`
    .editor {
      padding: 16px;
    }
    label {
      display: block;
      margin-bottom: 12px;
    }
    input[type="text"] {
      width: 100%;
      padding: 8px;
      border: 1px solid var(--divider-color, #ccc);
      border-radius: 8px;
    }
  `;
}

if (!customElements.get("alarm-card")) {
  customElements.define("alarm-card", AlarmCard);
}
if (!customElements.get("alarm-card-editor")) {
  customElements.define("alarm-card-editor", AlarmCardEditor);
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: "alarm-card",
  name: "Alarm Card",
  description: "Modern card for managing workday/weekend alarms",
});

