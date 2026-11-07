import { h } from './dom'
import { fmtEur, fmtNum, fmtPerM2, STATUS_LABEL, TYPE_LABEL } from './format'
import type { Listing, ListingStatus, User } from './types'

/** Aktueller Nutzer – wird von main.ts gesetzt und bei Anmeldung/Abmeldung aktualisiert. */
export const session: { user: User | null } = { user: null }

/** Fehlertexte der Datenbank in verständliche Sätze übersetzen. */
export function errMsg(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e)
  const m = /^[a-z_]+: (.+)$/s.exec(raw)
  if (m) return m[1]
  if (raw.includes('listing_pflichtangaben')) return 'Die Pflichtangaben sind noch nicht vollständig (Energieausweis, Wohnfläche).'
  if (raw.includes('row-level security')) return 'Dazu fehlt die Berechtigung.'
  if (raw.includes('duplicate key')) return 'Das gibt es schon.'
  if (/Failed to fetch|NetworkError|Load failed/i.test(raw)) return 'Keine Verbindung zum Server. Bitte Internetverbindung prüfen und noch einmal versuchen.'
  return raw
}

let toastBox: HTMLElement | null = null
export function toast(text: string, kind: 'ok' | 'fehler' = 'ok'): void {
  if (!toastBox) {
    toastBox = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' })
    document.body.appendChild(toastBox)
  }
  const t = h('div', { class: `toast toast-${kind}` }, h('span', { 'aria-hidden': 'true' }, kind === 'ok' ? '✔' : '⚠'), ' ', text)
  toastBox.appendChild(t)
  setTimeout(() => t.remove(), kind === 'fehler' ? 7000 : 3500)
}

export function field(label: string, control: HTMLElement, opts: { error?: string; hint?: string; id?: string; required?: boolean } = {}): HTMLElement {
  const id = opts.id ?? `f-${Math.random().toString(36).slice(2, 8)}`
  control.id = id
  if (opts.hint) control.setAttribute('aria-describedby', `${id}-hint`)
  if (opts.error) { control.setAttribute('aria-invalid', 'true'); control.setAttribute('aria-describedby', `${id}-err`) }
  return h('div', { class: `field${opts.error ? ' has-error' : ''}` },
    h('label', { for: id }, label, opts.required ? h('span', { class: 'req', 'aria-hidden': 'true' }, ' *') : null),
    control,
    opts.hint ? h('p', { class: 'hint', id: `${id}-hint` }, opts.hint) : null,
    opts.error ? h('p', { class: 'err', id: `${id}-err`, role: 'alert' }, h('span', { 'aria-hidden': 'true' }, '⚠ '), opts.error) : null)
}

export function statusChip(s: ListingStatus): HTMLElement {
  const l = STATUS_LABEL[s]
  return h('span', { class: `chip chip-${s}`, title: l.hint }, h('span', { 'aria-hidden': 'true' }, l.icon), ' ', l.text)
}

export function badges(l: Listing): HTMLElement {
  return h('div', { class: 'badges' },
    h('span', { class: 'badge badge-main' }, h('span', { 'aria-hidden': 'true' }, '⌂ '), 'Von privat'),
    l.addressVerified ? h('span', { class: 'badge' }, h('span', { 'aria-hidden': 'true' }, '✔ '), 'Adresse bestätigt') : null,
    l.owner?.phoneVerified ? h('span', { class: 'badge' }, h('span', { 'aria-hidden': 'true' }, '✔ '), 'Telefon bestätigt') : null)
}

export function facts(l: Listing): string[] {
  const out: string[] = [TYPE_LABEL[l.type]]
  if (l.rooms) out.push(`${fmtNum(l.rooms)} Zi.`)
  if (l.livingAreaM2) out.push(`${fmtNum(l.livingAreaM2)} m²`)
  if (l.plotAreaM2) out.push(l.type === 'grundstueck' ? `${fmtNum(l.plotAreaM2)} m²` : `${fmtNum(l.plotAreaM2)} m² Grundstück`)
  if (l.yearBuilt) out.push(`Bj. ${l.yearBuilt}`)
  return out
}

/** `level`: Überschriftenebene des Titels – direkt unter einer h1 (Suche) ist es h2, sonst h3. */
export function listingCard(l: Listing, level: 2 | 3 = 3): HTMLElement {
  const p = l.photos[0]
  return h('a', { class: 'card', href: `/inserat/${l.id}` },
    h('div', { class: 'card-img' },
      p ? h('img', { src: p.url, alt: p.alt ?? `Foto von ${l.title}`, loading: 'lazy', width: 400, height: 250 }) : h('div', { class: 'noimg' }, 'Kein Foto'),
      h('span', { class: 'badge badge-main card-badge' }, 'Von privat')),
    h('div', { class: 'card-body' },
      h('div', { class: 'card-price' }, fmtEur(l.priceEur), l.livingAreaM2 ? h('span', { class: 'per' }, ` · ${fmtPerM2(l.priceEur, l.livingAreaM2)}`) : null),
      h(`h${level}`, { class: 'card-title' }, l.title),
      h('p', { class: 'card-facts' }, facts(l).join(' · ')),
      h('p', { class: 'card-loc' }, `${l.postalCode} ${l.city}${l.district ? `-${l.district}` : ''}`,
        l.energyClass ? h('span', { class: 'energy' }, `  ·  Energieklasse ${l.energyClass}`) : null)))
}

export function openModal(title: string, content: HTMLElement, onClose?: () => void): { close: () => void } {
  const dlg = h('dialog', { class: 'modal', 'aria-labelledby': 'modal-title' }) as HTMLDialogElement
  const close = () => { dlg.close(); dlg.remove(); onClose?.() }
  dlg.append(
    h('div', { class: 'modal-head' }, h('h2', { id: 'modal-title' }, title), h('button', { class: 'btn-icon', type: 'button', 'aria-label': 'Schließen', onClick: close }, '✕')),
    content)
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); close() })
  document.body.appendChild(dlg)
  dlg.showModal()
  return { close }
}

export function spinner(text = 'Lädt …'): HTMLElement {
  return h('p', { class: 'loading', role: 'status' }, text)
}

export function setTitle(title: string, description?: string): void {
  document.title = title ? `${title} – FreiHaus` : 'FreiHaus – Immobilien direkt von privat, kostenlos'
  if (description) document.querySelector('meta[name="description"]')?.setAttribute('content', description)
}
