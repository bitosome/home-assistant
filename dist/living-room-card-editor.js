var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
const fireEvent = (node, type, detail) => {
    const event = new Event(type, { bubbles: true, composed: true });
    event.detail = detail || {};
    node.dispatchEvent(event);
    return event;
};
let LivingRoomCardEditor = class LivingRoomCardEditor extends LitElement {
    setConfig(config) {
        this._config = config;
    }
    get _switchSchema() {
        return {
            type: 'array',
            name: 'switches',
            schema: [
                { name: 'entity', selector: { entity: {} } },
                { name: 'name', selector: { text: {} } },
                { name: 'icon', selector: { icon: {} } },
            ],
        };
    }
    render() {
        if (!this.hass) {
            return html ``;
        }
        const schema = [
            { name: 'main_entity', selector: { entity: {} } },
            { name: 'temperature_sensor', selector: { entity: { domain: 'sensor' } } },
            { name: 'humidity_sensor', selector: { entity: { domain: 'sensor' } } },
            { name: 'ac_entity', selector: { entity: { domain: 'climate' } } },
            { name: 'thermostat_entity', selector: { entity: { domain: 'climate' } } },
            this._switchSchema,
        ];
        return html `
      <ha-form
        .hass=${this.hass}
        .data=${this._config || {}}
        .schema=${schema}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
    }
    _valueChanged(ev) {
        ev.stopPropagation();
        this._config = ev.detail.value;
        fireEvent(this, 'config-changed', { config: this._config });
    }
};
__decorate([
    property({ attribute: false })
], LivingRoomCardEditor.prototype, "hass", void 0);
__decorate([
    state()
], LivingRoomCardEditor.prototype, "_config", void 0);
LivingRoomCardEditor = __decorate([
    customElement('living-room-card-editor')
], LivingRoomCardEditor);
export { LivingRoomCardEditor };
export default LivingRoomCardEditor;
//# sourceMappingURL=living-room-card-editor.js.map