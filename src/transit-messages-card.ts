
// src/transit-messages-card.ts
// Transit Messages Card (TypeScript)
// Autor: Oliver + Copilot (TS-Port)
// Version: 1.0.1-ts

type Primitive = string | number | boolean | null | undefined;

export interface MessageEntry {
  timestamp?: string | number | Date;
  text?: Primitive;
}

export interface Departure {
  train?: string;
  trainNumber?: string;
  destination?: string;

  scheduledDeparture?: string;  // "HH:MM" oder beliebig formatiert vom Sensor
  departure_current?: string;   // "—" wenn unbekannt

  scheduledPlatform?: string;
  platform?: string;

  delayDeparture?: number;      // Minuten

  scheduledArrival?: string;
  arrival_current?: string;

  isCancelled?: number | boolean;

  messages?: {
    delay?: MessageEntry[];
    qos?: MessageEntry[];
  };

  route?: Array<{ name?: string }>;
}

export interface HassEntity {
  entity_id?: string;
  state: string;
  attributes: Record<string, any>;
  last_changed?: string;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  // In HA gesetzt, hier optional fürs Mocking
  callService?: (domain: string, service: string, data?: any) => void | Promise<void>;
  formatEntityState?: (entity: HassEntity) => string;
  locale?: { language?: string };
}

type Mode = 'list' | 'selected';

export interface TransitMessagesCardConfig {
  type: 'custom:transit-messages-card';
  title?: string;
  entity: string;
  departures_attribute?: string;          // default: 'next_departures'
  mode?: Mode;                            // 'list' | 'selected'
  count?: number;                         // für 'list'
  index_entity?: string | null;           // für 'selected'
  show_qos?: boolean;
  show_platform?: boolean;
  show_arrival?: boolean;
  compact?: boolean;
  hide_when_empty?: boolean;
  show_cancelled_section?: boolean;
  include_cancelled_in_filter?: boolean;
  contains?: string | null;               // EINZIGER Filter-String (case-insensitive) gegen Destination ODER Route
}

interface ItemHtmlOptions {
  cancelled: boolean;
  compact: boolean;
  show_platform: boolean;
  show_qos: boolean;
  show_arrival: boolean;
}

class TransitMessagesCard extends HTMLElement {
  static get version(): string { return '1.0.1'; }

  private _hass?: HomeAssistant;
  private _config?: TransitMessagesCardConfig;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  setConfig(config: TransitMessagesCardConfig): void {
    if (!config || !config.entity) {
      throw new Error("Konfiguration benötigt: 'entity' (z. B. sensor.<station>_departures)");
    }
    this._config = {
      // Defaults
      title: 'Abfahrten',
      departures_attribute: 'next_departures',
      mode: 'list',
      count: 5,
      index_entity: null,
      show_qos: true,
      show_platform: true,
      show_arrival: false,
      compact: false,
      hide_when_empty: false,
      show_cancelled_section: true,
      include_cancelled_in_filter: true,
      contains: null,
      // User-Config überschreibt Defaults
      ...config,
      type: 'custom:transit-messages-card',
    };
    // Erste Render-Möglichkeit
    this._render();
  }

  set hass(hass: HomeAssistant | undefined) {
    this._hass = hass;
    this._render();
  }

  get hass(): HomeAssistant | undefined {
    return this._hass;
  }

  getCardSize(): number { return 6; }

  private _render(): void {
    if (!this.shadowRoot || !this._config || !this._hass) return;

    const {
      entity,
      title = 'Abfahrten',
      departures_attribute = 'next_departures',
      mode = 'list',
      count = 5,
      index_entity = null,
      show_qos = true,
      show_platform = true,
      show_arrival = false,
      compact = false,
      hide_when_empty = false,
      show_cancelled_section = true,
      include_cancelled_in_filter = true,
    } = this._config;

    const style = `
      ha-card { padding: 12px 14px; }
      .header { font-weight: 600; font-size: 1.1rem; margin-bottom: 8px; }
      .section-title { margin: 8px 0 4px 0; font-weight: 600; font-size: 1.0rem; }
      .item { margin: 10px 0 14px 0; padding-bottom: 10px; border-bottom: 1px solid var(--divider-color, #e0e0e0); }
      .row { display: flex; gap: 10px; flex-wrap: wrap; color: var(--secondary-text-color); font-size: 0.95rem; }
      .small { font-size: 0.9rem; }
      .muted { color: var(--disabled-text-color); font-style: italic; }
      ul { margin: 6px 0 0 18px; padding: 0; }
      .pill { background: var(--primary-background-color); border: 1px solid var(--divider-color); border-radius: 8px; padding: 2px 8px; font-size: 0.85rem; }
      .pill.red { border-color: #b00020; color: #b00020; }
      .pill.amber { border-color: #f9a825; color: #f9a825; }
      .pill.green { border-color: #2e7d32; color: #2e7d32; }
      .cancelled { border-left: 4px solid #b00020; padding-left: 8px; }
    `;

    const stateObj = this._hass.states[entity];
    if (!stateObj) {
      this.shadowRoot.innerHTML = `
        <style>${style}</style>
        <ha-card>
          <div class="header">${this._escape(title)}</div>
          <div class="muted">Entität '${this._escape(entity)}' nicht gefunden.</div>
        </ha-card>
      `;
      return;
    }

    const attr = stateObj.attributes ?? {};
    const allRaw = Array.isArray(attr[departures_attribute]) ? (attr[departures_attribute] as Departure[]) : [];
    const all: Departure[] = allRaw ?? [];

    const filtered = all.filter((c) => this._matchesContains(c));
    const notCancelled = filtered.filter((c) => !this._isCancelled(c));
    const cancelledFiltered = filtered.filter((c) => this._isCancelled(c));
    const cancelledAll = all.filter((c) => this._isCancelled(c));

    // Welche Liste rendern?
    let listToShow: Departure[] = [];
    if (mode === 'selected') {
      const idxStr = index_entity ? this._hass.states[index_entity]?.state : '0';
      const idx = Number.parseInt(String(idxStr), 10);
      const safeIdx = Number.isFinite(idx) && idx >= 0 ? idx : 0;
      if (safeIdx < notCancelled.length) listToShow = [notCancelled[safeIdx]];
    } else {
      const n = Number.isFinite(count) ? (count as number) : 5;
      listToShow = notCancelled.slice(0, n);
    }

    const itemsHtml = listToShow
      .map((c) => this._connectionItemHtml(c, {
        cancelled: false, compact, show_platform, show_qos, show_arrival
      }))
      .join('');

    const cancelledSource = include_cancelled_in_filter ? cancelledFiltered : cancelledAll;
    const cancelledHtml = (show_cancelled_section && cancelledSource.length)
      ? `
        <div class="section-title">Stornierte Verbindungen</div>
        ${cancelledSource
          .slice(0, 20)
          .map((c) => this._connectionItemHtml(c, {
            cancelled: true, compact: true, show_platform, show_qos: false, show_arrival
          }))
          .join('')}
      `
      : '';

    if (hide_when_empty && listToShow.length === 0 && cancelledSource.length === 0) {
      this.style.display = 'none';
      return;
    } else {
      this.style.display = '';
    }

    const suffix = this._formatContainsForTitle();
    const composedTitle = `${title ?? 'Abfahrten'}${suffix}`;

    const content = (listToShow.length || cancelledSource.length)
      ? `${itemsHtml}${cancelledHtml}`
      : `<div class="muted">No data</div>`;

    this.shadowRoot.innerHTML = `
      <style>${style}</style>
      <ha-card>
        <div class="header">${this._escape(composedTitle)}</div>
        ${content}
      </ha-card>
    `;
  }

  private _connectionItemHtml(c: Departure, opts: ItemHtmlOptions): string {
    const { cancelled, compact, show_platform, show_qos, show_arrival } = opts;

    const train = c?.train ?? '';
    const trainNumber = c?.trainNumber ?? '';
    const dest = c?.destination ?? '';

    const schedDep = c?.scheduledDeparture ?? '';
    const depCur = c?.departure_current ?? '—';

    const schedPlat = c?.scheduledPlatform ?? '';
    const plat = c?.platform ?? schedPlat;

    const delayDep = Number.isFinite(c?.delayDeparture) ? (c?.delayDeparture as number) : 0;

    const delays: MessageEntry[] = Array.isArray(c?.messages?.delay) ? (c!.messages!.delay as MessageEntry[]) : [];
    const qos: MessageEntry[] = Array.isArray(c?.messages?.qos) ? (c!.messages!.qos as MessageEntry[]) : [];

    const arrSched = c?.scheduledArrival ?? '';
    const arrCur = c?.arrival_current ?? '—';

    const delayBadge = (() => {
      if (!Number.isFinite(delayDep) || delayDep <= 0) return '';
      const colorClass = delayDep >= 10 ? 'red' : delayDep >= 5 ? 'amber' : 'green';
      return `<span class="pill ${colorClass}">+${delayDep} min</span>`;
    })();

    const pills: string[] = [
      `<span class="pill">${this._escape(train)}</span>`,
      `→ <strong>${this._escape(dest)}</strong>`
    ];
    if (show_platform && !!plat) pills.push(`<span class="pill">Gleis ${this._escape(plat)}</span>`);
    if (delayBadge) pills.push(delayBadge);
    if (cancelled) pills.push(`<span class="pill red">Storniert</span>`);

    const headerLine = trainNumber
      ? `<div class="small muted">#<strong>${this._escape(trainNumber)}</strong></div>`
      : '';

    const timesHtml = `
      <div class="small" style="margin-top:4px;">
        Geplante Abfahrt: <strong>${this._escape(schedDep)}</strong>
        ·
        Aktuelle Abfahrt: <strong>${this._escape(depCur)}</strong>
        ${show_arrival ? `
          <br/>Geplante Ankunft: <strong>${this._escape(arrSched)}</strong>
          ·
          Aktuelle Ankunft: <strong>${this._escape(arrCur)}</strong>
        ` : ''}
      </div>
    `;

    let detailsHtml = '';
    if (!compact && !cancelled) {
      const delayLines = delays.length
        ? `<div><strong>Verspätungs‑Meldungen:</strong></div>
           <ul>${delays.map((m) => `<li>${this._fmtTime(m?.timestamp)} — ${this._escape(String(m?.text ?? ''))}</li>`).join('')}</ul>`
        : `<div class="muted small">(Keine Verspätungsmeldungen)</div>`;

      const qosLines = (show_qos && qos.length)
        ? `<div style="margin-top:6px;"><strong>Qualitätsmeldungen:</strong></div>
           <ul>${qos.map((q) => `<li>${this._fmtTime(q?.timestamp)} ${this._escape(String(q?.text ?? ''))}</li>`).join('')}</ul>`
        : '';

      detailsHtml = `<div style="margin-top:8px;">${delayLines}${qosLines}</div>`;
    }

    const cancelledClass = cancelled ? ' cancelled' : '';
    return `
      <div class="item${cancelledClass}">
        ${headerLine}
        <div class="row">${pills.join(' ')}</div>
        ${timesHtml}
        ${detailsHtml}
      </div>
    `;
  }

  private _matchesContains(c: Departure): boolean {
    const needle = (this._config?.contains ?? '').trim().toLowerCase();
    if (!needle) return true;

    const dest = String(c?.destination ?? '').toLowerCase();
    const routeNames = Array.isArray(c?.route)
      ? (c!.route!)
          .map((r) => String(r?.name ?? ''))
          .filter(Boolean)
      : [];
    const routeJoined = routeNames.join(' → ').toLowerCase();

    return dest.includes(needle) || routeJoined.includes(needle);
  }

  private _formatContainsForTitle(): string {
    const val = (this._config?.contains ?? '').trim();
    return val ? ` (${this._escape(val)})` : '';
  }

  private _fmtTime(ts: unknown): string {
    if (!ts) return '';
    try {
      const d = ts instanceof Date ? ts : new Date(ts as any);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  private _escape(s: unknown): string {
    const str = String(s);
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private _isCancelled(c: Departure | undefined): boolean {
    const v = c?.isCancelled;
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0;
    return false;
    }

  static getConfigElement(): HTMLElement | null {
    // Separater Config-Editor ist optional – hier (wie im Original) keiner.
    return null;
  }
}

// Registrierung als Custom Element (so wie im Original)
if (!customElements.get('transit-messages-card')) {
  customElements.define('transit-messages-card', TransitMessagesCard);
}

// Export optional, damit Vite's lib build einen Namen hat
export { TransitMessagesCard };
