import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant, LovelaceCardEditor } from 'custom-card-helpers';
import type { LivingRoomCardConfig } from './living-room-card';

const fireEvent = (node: HTMLElement, type: string, detail?: any): Event => {
  const event = new Event(type, { bubbles: true, composed: true });
  (event as any).detail = detail || {};
  node.dispatchEvent(event);
  return event;
};

@customElement('living-room-card-editor')
export class LivingRoomCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: LivingRoomCardConfig;

  public setConfig(config: LivingRoomCardConfig): void {
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

  protected render() {
    if (!this.hass) {
      return html``;
    }
    const schema = [
      { name: 'main_entity', selector: { entity: {} } },
      { name: 'temperature_sensor', selector: { entity: { domain: 'sensor' } } },
      { name: 'humidity_sensor', selector: { entity: { domain: 'sensor' } } },
      { name: 'ac_entity', selector: { entity: { domain: 'climate' } } },
      { name: 'thermostat_entity', selector: { entity: { domain: 'climate' } } },
      this._switchSchema,
    ];
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config || {}}
        .schema=${schema}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    this._config = ev.detail.value as LivingRoomCardConfig;
    fireEvent(this, 'config-changed', { config: this._config });
  }
}

export default LivingRoomCardEditor;
