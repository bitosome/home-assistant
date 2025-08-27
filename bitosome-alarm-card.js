class AlarmCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._alarmTimeout = null;
  }

  setConfig(config) {
    if (!config) throw new Error("Invalid configuration");
    this.config = config;
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    this.updateCard();
  }

  getCardSize() { return 2; }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; font-family: var(--ha-card-font-family, inherit); }
        ha-card {
          padding: 14px;
          border-radius: var(--ha-card-border-radius, 14px);
        }

        /* 2x2 grid: 
           row1: [icon] [workday row]
           row2: [Next text] [weekend row]
        */
        .grid {
          display: grid;
          grid-template-columns: 1fr auto;
          grid-template-rows: auto auto;
          grid-template-areas:
            "icon workday"
            "next weekend";
          column-gap: 12px;
          row-gap: 8px;
          align-items: start;
        }

        /* Top-left icon (x2 size, no border/background) */
        .icon {
          grid-area: icon;
          display: flex;
          align-items: flex-start;
          justify-content: flex-start;
        }
        ha-icon {
          width: 40px;
          height: 40px;
          color: var(--primary-text-color);
        }

        /* Right-side rows (aligned to top-right with same padding as icon thanks to card padding) */
        .row {
          display: grid;
          grid-auto-flow: column;
          grid-template-columns: auto auto auto; /* label, switch, time */
          align-items: center;
          justify-content: end;
          column-gap: 6px; /* label close to switch, switch close to time */
        }
        .row.workday { grid-area: workday; }
        .row.weekend { grid-area: weekend; }

        .tiny-label {
          font-size: 10px;
          text-transform: lowercase;
          color: var(--secondary-text-color);
          letter-spacing: .02em;
        }

        ha-switch {
          --mdc-switch-unchecked-track-color: var(--switch-unchecked-color, rgba(0,0,0,0.20));
        }

        .time-input {
          appearance: none;
          border: none;
          outline: none;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 14px;
          width: 88px;            /* narrower, fits HH:MM */
          text-align: center;
          background: var(--control-card-background, rgba(0,0,0,0.06));
          color: var(--primary-text-color);
        }
        input[type="time"]::-webkit-datetime-edit-ampm-field { display:none; }
        input[type="time"]::-webkit-calendar-picker-indicator { opacity:.7; cursor:pointer; }
        input[type="time"]::-webkit-datetime-edit { padding:0; }

        /* Next text on same line as weekend row (left cell of row 2) */
        .next {
          grid-area: next;
          align-self: center;
          font-size: 13px;
          color: var(--secondary-text-color);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .next.active { color: var(--primary-color); font-weight: 600; }
      </style>

      <ha-card>
        <div class="grid">
          <div class="icon">
            <ha-icon icon="mdi:alarm-note" aria-hidden="true"></ha-icon>
          </div>

          <div class="row workday">
            <span class="tiny-label">workday</span>
            <ha-switch id="workday-switch" aria-label="Workday alarm"></ha-switch>
            <input type="time" class="time-input" id="workday-time" value="07:00">
          </div>

          <div id="next-alarm" class="next">Disabled</div>

          <div class="row weekend">
            <span class="tiny-label">weekend</span>
            <ha-switch id="weekend-switch" aria-label="Weekend alarm"></ha-switch>
            <input type="time" class="time-input" id="weekend-time" value="09:00">
          </div>
        </div>
      </ha-card>
    `;
    this.setupEventListeners();
    this.loadState();
  }

  setupEventListeners() {
    var ws = this.shadowRoot.getElementById("workday-switch");
    var we = this.shadowRoot.getElementById("weekend-switch");
    var wt = this.shadowRoot.getElementById("workday-time");
    var et = this.shadowRoot.getElementById("weekend-time");

    ws.addEventListener("change", (e) => this.toggleAlarm("workday", e.target.checked));
    we.addEventListener("change", (e) => this.toggleAlarm("weekend", e.target.checked));
    wt.addEventListener("change", (e) => this.updateTime("workday", e.target.value));
    et.addEventListener("change", (e) => this.updateTime("weekend", e.target.value));
  }

  toggleAlarm(type, enabled) {
    this.shadowRoot.getElementById(type + "-switch").checked = enabled;
    this.saveState();
    this.updateNextAlarm();
    this.scheduleNextTrigger();

    var automationId = type === "workday"
      ? (this.config && this.config.automations && this.config.automations.workday)
      : (this.config && this.config.automations && this.config.automations.weekend);

    if (automationId && this._hass) {
      this._hass.callService("automation", enabled ? "turn_on" : "turn_off", { entity_id: automationId });
    }
  }

  updateTime() {
    this.saveState();
    this.updateNextAlarm();
    this.scheduleNextTrigger();
  }

  saveState() {
    var state = {
      workdayEnabled: !!this.shadowRoot.getElementById("workday-switch").checked,
      weekendEnabled: !!this.shadowRoot.getElementById("weekend-switch").checked,
      workdayTime: this.shadowRoot.getElementById("workday-time").value || "07:00",
      weekendTime: this.shadowRoot.getElementById("weekend-time").value || "09:00"
    };
    localStorage.setItem("alarm-card-state", JSON.stringify(state));
  }

  loadState() {
    var saved = localStorage.getItem("alarm-card-state");
    var state = saved ? JSON.parse(saved) : {
      workdayEnabled: false, weekendEnabled: false, workdayTime: "07:00", weekendTime: "09:00"
    };

    this.shadowRoot.getElementById("workday-switch").checked = !!state.workdayEnabled;
    this.shadowRoot.getElementById("weekend-switch").checked = !!state.weekendEnabled;
    this.shadowRoot.getElementById("workday-time").value = state.workdayTime || "07:00";
    this.shadowRoot.getElementById("weekend-time").value = state.weekendTime || "09:00";

    this.updateNextAlarm();
    this.scheduleNextTrigger();
  }

  computeNextAlarm(now, workdayEnabled, weekendEnabled, workdayTime, weekendTime) {
    // returns {date, type} or null; looks up to 7 days ahead
    for (var offset = 0; offset < 7; offset++) {
      var d = new Date(now);
      d.setDate(now.getDate() + offset);
      var day = d.getDay();
      var isWeekend = (day === 0 || day === 6);
      var enabled = isWeekend ? weekendEnabled : workdayEnabled;
      if (!enabled) continue;

      var parts = (isWeekend ? weekendTime : workdayTime).split(":");
      var h = parseInt(parts[0], 10);
      var m = parseInt(parts[1], 10);
      d.setHours(h, m, 0, 0);

      if (offset === 0 && d <= now) continue;
      return { date: d, type: isWeekend ? "weekend" : "workday" };
    }
    return null;
  }

  formatDateTime(d) {
    var datePart = d.toLocaleDateString(undefined, {
      weekday: "short", day: "2-digit", month: "short"
    });
    var timePart = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    return datePart + " " + timePart;
  }

  updateNextAlarm() {
    var now = new Date();
    var workdayEnabled = !!this.shadowRoot.getElementById("workday-switch").checked;
    var weekendEnabled = !!this.shadowRoot.getElementById("weekend-switch").checked;
    var workdayTime = this.shadowRoot.getElementById("workday-time").value || "07:00";
    var weekendTime = this.shadowRoot.getElementById("weekend-time").value || "09:00";

    var next = this.computeNextAlarm(now, workdayEnabled, weekendEnabled, workdayTime, weekendTime);
    var el = this.shadowRoot.getElementById("next-alarm");

    if (!next) {
      el.textContent = "Disabled";
      el.classList.remove("active");
      return;
    }
    el.textContent = "Next: " + this.formatDateTime(next.date);
    el.classList.add("active");
  }

  scheduleNextTrigger() {
    if (this._alarmTimeout) {
      clearTimeout(this._alarmTimeout);
      this._alarmTimeout = null;
    }
    if (!this._hass || !this.config || !this.config.automations) return;

    var now = new Date();
    var workdayEnabled = !!this.shadowRoot.getElementById("workday-switch").checked;
    var weekendEnabled = !!this.shadowRoot.getElementById("weekend-switch").checked;
    var workdayTime = this.shadowRoot.getElementById("workday-time").value || "07:00";
    var weekendTime = this.shadowRoot.getElementById("weekend-time").value || "09:00";

    var next = this.computeNextAlarm(now, workdayEnabled, weekendEnabled, workdayTime, weekendTime);
    if (!next) return;

    var delay = next.date.getTime() - now.getTime();
    if (delay <= 0 || delay > 8 * 24 * 60 * 60 * 1000) return;

    this._alarmTimeout = setTimeout(() => {
      var stillOn = next.type === "weekend"
        ? !!this.shadowRoot.getElementById("weekend-switch").checked
        : !!this.shadowRoot.getElementById("workday-switch").checked;

      var automationId = next.type === "weekend"
        ? (this.config.automations.weekend || null)
        : (this.config.automations.workday || null);

      if (stillOn && automationId && this._hass) {
        this._hass.callService("automation", "trigger", { entity_id: automationId });
      }
      this.updateNextAlarm();
      this.scheduleNextTrigger();
    }, delay);
  }

  updateCard() {
    if (!this._hass) return;
    this.updateNextAlarm();
  }

  static getConfigElement() { return document.createElement("alarm-card-editor"); }
  static getStubConfig() {
    return { automations: { workday: "automation.workday_alarm", weekend: "automation.weekend_alarm" } };
  }
}

/* ----- Editor ----- */
class AlarmCardEditor extends HTMLElement {
  setConfig(config) { this.config = config; this.render(); }
  render() {
    var work = (this.config && this.config.automations && this.config.automations.workday) || "";
    var week = (this.config && this.config.automations && this.config.automations.weekend) || "";
    this.innerHTML = `
      <div style="padding:16px;">
        <h3 style="margin:0 0 12px;">Alarm Card Configuration</h3>
        <div style="margin-bottom:12px;">
          <label style="display:block;margin-bottom:6px;">Workday Automation Entity</label>
          <input type="text" id="workday-automation" value="${work}"
            placeholder="automation.workday_alarm"
            style="width:100%;padding:8px;border:1px solid var(--divider-color,#ccc);border-radius:8px;">
        </div>
        <div style="margin-bottom:12px;">
          <label style="display:block;margin-bottom:6px;">Weekend Automation Entity</label>
          <input type="text" id="weekend-automation" value="${week}"
            placeholder="automation.weekend_alarm"
            style="width:100%;padding:8px;border:1px solid var(--divider-color,#ccc);border-radius:8px;">
        </div>
        <small style="color: var(--secondary-text-color);">
          These automations are triggered at the next alarm time.
        </small>
      </div>
    `;
    var w = this.querySelector("#workday-automation");
    var e = this.querySelector("#weekend-automation");
    [w, e].forEach((input) => input.addEventListener("input", () => this.configChanged()));
  }
  configChanged() {
    var workdayAutomation = this.querySelector("#workday-automation").value;
    var weekendAutomation = this.querySelector("#weekend-automation").value;
    this.config = { automations: { workday: workdayAutomation, weekend: weekendAutomation } };
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this.config }, bubbles: true, composed: true }));
  }
}

/* Safe (re)registration for fast iteration */
if (!customElements.get("alarm-card")) customElements.define("alarm-card", AlarmCard);
if (!customElements.get("alarm-card-editor")) customElements.define("alarm-card-editor", AlarmCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "alarm-card",
  name: "Alarm Card",
  description: "Modern, compact card for managing workday/weekend alarms"
});