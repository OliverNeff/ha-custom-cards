import {beforeEach, describe, expect, it} from 'vitest';
import {TransitMessagesCard} from "../transit-messages-card.ts";
import {registerCardOnce} from "./test-utils.ts";
import {makeTransitCardHassMock} from "./mocks.ts";

describe('TransitMessagesCard – trainNumber-Filter', () => {
    let el: any;

    beforeEach(() => {

        registerCardOnce('transit-messages-card', TransitMessagesCard as any);

        el = document.createElement('transit-messages-card') as any;
        el.setConfig({
            type: 'custom:transit-messages-card',
            title: 'Abfahrten',
            entity: 'sensor.frankfurt_hbf_departures',
            mode: 'list',
            count: 5,
            show_platform: true,
            show_qos: true,
            show_arrival: true,
            contains: '',
            train_number_filter_entity: 'input_number.train_number_filter_dieburg'
        });
        document.body.innerHTML = '';
        document.body.appendChild(el);
    });

    it('hide_when_empty hides the card when no match is found',  () => {
        el.setConfig({ ...el._config, hide_when_empty: true, contains: 'nicht-vorhanden' });
        el.hass = makeTransitCardHassMock(-1);
        expect(el.style.display).toBe('none');
    });

    it('without filter (-1) shows non-cancelled items and cancelled section',  () => {
        el.hass = makeTransitCardHassMock(-1);
        const root = el.shadowRoot!;
        expect(root.innerHTML).toContain('RE');
        expect(root.innerHTML).toContain('Stornierte Verbindungen'); // wenn aktiviert
    });

    it('filter 24524 shows only this trainNumber', () => {
        el.hass = makeTransitCardHassMock(24524);
        const root = el.shadowRoot!;
        expect(root.innerHTML).toContain('RE');
        expect(root.innerHTML).not.toContain('Wiesbaden'); // storniert, nicht im Hauptbereich
    });

    it('non-numeric trainNumber filter ("abc") behaves like no filter',  () => {
        el.hass = makeTransitCardHassMock('abc');
        expect(el.shadowRoot!.innerHTML).toContain('RE');
    });

    it('trainNumber as string with leading zeros matches numeric filter', () => {
        const hass = makeTransitCardHassMock(24524);
        hass.states['sensor.frankfurt_hbf_departures'].attributes.next_departures[0].trainNumber = '024524';
        el.hass = hass;
        expect(el.shadowRoot!.innerHTML).toContain('RE');
    });
});
