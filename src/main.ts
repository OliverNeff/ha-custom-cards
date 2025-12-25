
// src/main.ts
// Dev-Bootstrap für die TransitMessagesCard (TS)

import './transit-messages-card';

// HA-Stub-Komponente, weil die Card <ha-card> nutzt
class HaCardStub extends HTMLElement {
    connectedCallback() {
        this.style.display = 'block';
        this.style.padding = '12px 14px';
        this.style.borderRadius = '12px';
        this.style.background = '#fff';
        this.style.boxShadow = '0 1px 3px rgba(0,0,0,.08)';
    }
}
if (!customElements.get('ha-card')) {
    customElements.define('ha-card', HaCardStub);
}

// HA-ähnliche CSS-Variablen
const style = document.createElement('style');
style.textContent = `
  :root {
    --primary-background-color: #fff;
    --divider-color: #e0e0e0;
    --secondary-text-color: #445;
    --disabled-text-color: #8a8a8a;
    --primary-text-color: #111;
    --card-background-color: #fff;
  }
  body { margin: 16px; background: #f6f7f9; font-family: system-ui, Segoe UI, Roboto; }
`;
document.head.appendChild(style);


// Minimaler hass-Mock mit Demo-Entitäten
const hass: any = {
    states: {
        'sensor.frankfurt_hbf_departures': {
            state: 'ok',
            attributes: {
                next_departures: [
                    {
                        train: 'RE', trainNumber: '24524', destination: 'Darmstadt Hbf',
                        scheduledDeparture: '14:22', departure_current: '14:27',
                        scheduledPlatform: '7', platform: '7',
                        delayDeparture: 5,
                        scheduledArrival: '14:45', arrival_current: '14:51',
                        isCancelled: 0,
                        messages: {
                            delay: [{ timestamp: new Date().toISOString(), text: 'Verspätung wegen Bauarbeiten' }],
                            qos:   [{ timestamp: new Date().toISOString(), text: 'Wagenreihung geändert' }]
                        },
                        route: [{ name: 'Frankfurt Hbf' }, { name: 'Darmstadt Hbf' }]
                    },
                    {
                        train: 'RB', trainNumber: '24516', destination: 'Wiesbaden',
                        scheduledDeparture: '14:35', departure_current: '—',
                        scheduledPlatform: '4', platform: '4',
                        delayDeparture: 0, scheduledArrival: '15:05', arrival_current: '—',
                        isCancelled: 1, messages: { delay: [], qos: [] },
                        route: [{ name: 'Frankfurt Hbf' }, { name: 'Wiesbaden' }]
                    }
                ]
            }
        },

        // 👇 NEW: Number-Helper für den Filter
        'input_number.train_number_filter_dieburg': {
            state: '-1', // -1 => kein Filter. Zum Test auf '24524' setzen.
            attributes: {
                min: -1,
                max: 99999,
                step: 1
            }
        }
    }
};


// Card instanziieren
const el = document.createElement('transit-messages-card') as any;
el.setConfig({
    type: 'custom:transit-messages-card',
    title: 'Abfahrten',
    entity: 'sensor.frankfurt_hbf_departures',
    train_number_filter_entity: 'input_number.train_number_filter_dieburg',
    mode: 'list',
    count: 5,
    show_platform: true,
    show_qos: true,
    show_arrival: true,
    contains: '' // optional: 'darmstadt'
});
el.hass = hass;

document.getElementById('app')!.appendChild(el);
