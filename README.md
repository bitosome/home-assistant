# Home Assistant Custom Cards

This repository provides a custom Lovelace card named `living-room-card` that recreates the complex living room layout using only native Home Assistant resources (no `card-mod`).

## Development

Install dependencies and run the linter to verify the card:

```bash
npm install
npm run lint
```

## Usage

Add the compiled card to your Home Assistant resources and configure it in the dashboard:

```yaml
type: custom:living-room-card
main_entity: switch.living_room_light_group
temperature_sensor: sensor.kitchen_living_room_temparature_average
humidity_sensor: sensor.kitchen_living_room_humidity_average
ac_entity: climate.living_room_ac
thermostat_entity: climate.thermostat_5_7_group
switches:
  - entity: switch.kitchen_tabletop_light_switch_button_a_state
    name: Tabletop
    icon: mdi:countertop-outline
  - entity: switch.kitchen_light_switch_button_a_state
    name: Sink
    icon: mdi:faucet-variant
  - entity: switch.kitchen_light_switch_button_b_state
    name: Table
    icon: mdi:table-furniture
  - entity: switch.sofa_light_switch_group
    name: Sofa light
    icon: mdi:wall-sconce-flat-outline
  - entity: switch.ikea_tradfri_control_outlet_2
    name: Ambient light
    icon: mdi:globe-light-outline
  - entity: switch.terrace_light_switch_button_a_state
    name: Terrace
    icon: mdi:awning-outline
```

The header row can include the main card alone or together with AC and thermostat cards. Switch entries are arranged in rows of up to three cards.
