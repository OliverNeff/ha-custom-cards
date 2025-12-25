export function makeTransitCardHassMock(filterState: string | number = -1) {
    return {
        states: {
            'sensor.frankfurt_hbf_departures': {
                state: 'ok',
                attributes: {
                    next_departures: [
                        {
                            train: 'RE', trainNumber: '24524', destination: 'Darmstadt Hbf',
                            scheduledDeparture: '14:22', departure_current: '14:27',
                            scheduledPlatform: '7', platform: '7',
                            delayDeparture: 5, scheduledArrival: '14:45', arrival_current: '14:51',
                            isCancelled: 0,
                            messages: {
                                delay: [{ timestamp: '2025-12-25T12:00:00.000Z', text: 'Verspätung wegen Bauarbeiten' }],
                                qos:   [{ timestamp: '2025-12-25T12:05:00.000Z', text: 'Wagenreihung geändert' }]
                            },
                            route: [{ name: 'Frankfurt Hbf' }, { name: 'Darmstadt Hbf' }]
                        },
                        {
                            train: 'RB', trainNumber: '24516', destination: 'Wiesbaden',
                            scheduledDeparture: '14:35', departure_current: '—',
                            scheduledPlatform: '4', platform: '4',
                            delayDeparture: 0, scheduledArrival: '15:05', arrival_current: '—',
                            isCancelled: 1,
                            messages: { delay: [], qos: [] },
                            route: [{ name: 'Frankfurt Hbf' }, { name: 'Wiesbaden' }]
                        }
                    ]
                }
            },
            'input_number.train_number_filter_dieburg': {
                state: String(filterState),
                attributes: { min: -1, max: 99999, step: 1 }
            }
        }
    } as any;
}
