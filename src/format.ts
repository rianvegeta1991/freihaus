import type { ListingStatus, PropertyType } from './types'

const eur = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const num = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 })
const date = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })

export const fmtEur = (n: number) => eur.format(n)
export const fmtNum = (n: number) => num.format(n)
export const fmtDate = (iso: string) => date.format(new Date(iso))
export const fmtPerM2 = (price: number, area?: number) => (area ? `${eur.format(Math.round(price / area))}/m²` : '')

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

export function daysLeft(iso?: string): number | null {
  if (!iso) return null
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000))
}
