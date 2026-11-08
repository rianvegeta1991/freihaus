import type { ListingStatus, OfferKind, PropertyType } from './types'

const eur = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const num = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 })
const date = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })

export const fmtEur = (n: number) => eur.format(n)
export const fmtNum = (n: number) => num.format(n)
export const fmtDate = (iso: string) => date.format(new Date(iso))
const eurCent = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Quadratmeterpreis: beim Kauf in ganzen Euro, bei der Miete mit Cent (z. B. 10,12 €/m²). */
export const fmtPerM2 = (price: number, area?: number, offer: OfferKind = 'kauf') =>
  area ? (offer === 'miete' ? `${eurCent.format(price / area)}/m²` : `${eur.format(Math.round(price / area))}/m²`) : ''

/** Preis eines Inserats: „349.000 €“ beim Kauf, „850 € Kaltmiete“ bei der Miete. */
export const fmtPrice = (l: { offer: OfferKind; priceEur: number }) =>
  l.offer === 'miete' ? `${eur.format(l.priceEur)} Kaltmiete` : eur.format(l.priceEur)

export const OFFER_LABEL: Record<OfferKind, string> = { kauf: 'Kaufen', miete: 'Mieten' }

/** Wer inseriert: „Verkäufer“ bzw. „Vermieter“. */
export const OWNER_WORD: Record<OfferKind, string> = { kauf: 'Verkäufer', miete: 'Vermieter' }

/** „2026-12-01“ → „1. Dezember 2026“ (ohne Zeitzonen-Verschiebung). */
export const fmtDay = (isoDay: string) => date.format(new Date(`${isoDay}T12:00:00`))

export const TYPE_LABEL: Record<PropertyType, string> = {
  haus: 'Haus',
  wohnung: 'Wohnung',
  grundstueck: 'Grundstück',
}

/** Status immer mit Symbol UND Text – nie nur über die Farbe. */
export const STATUS_LABEL: Record<ListingStatus, { icon: string; text: string; hint: string }> = {
  draft: { icon: '✎', text: 'Entwurf', hint: 'Noch nicht eingereicht.' },
  pending: { icon: '⧖', text: 'In Prüfung', hint: 'Wir schauen es uns an. Erst-Inserate werden von Hand geprüft.' },
  published: { icon: '●', text: 'Online', hint: 'Für alle sichtbar.' },
  paused: { icon: '❚❚', text: 'Pausiert', hint: 'Nicht sichtbar.' },
  sold: { icon: '✔', text: 'Verkauft', hint: 'Als verkauft gemeldet.' },
  expired: { icon: '◌', text: 'Abgelaufen', hint: 'Nach 90 Tagen automatisch beendet. Sie können es erneut einreichen.' },
  blocked: { icon: '⛔', text: 'Gesperrt', hint: 'Wegen eines Verstoßes gesperrt. Die Begründung finden Sie in Ihrem Konto.' },
}

/** Der Status „sold“ heißt bei Mietinseraten „vermietet“. */
export function statusLabel(s: ListingStatus, offer: OfferKind = 'kauf'): { icon: string; text: string; hint: string } {
  return s === 'sold' && offer === 'miete' ? { icon: '✔', text: 'Vermietet', hint: 'Als vermietet gemeldet.' } : STATUS_LABEL[s]
}

export function daysLeft(iso?: string): number | null {
  if (!iso) return null
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000))
}
