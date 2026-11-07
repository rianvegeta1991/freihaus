import type { ListingInput } from './types'

export const ENERGY_CLASSES = ['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const
export const MIN_PHOTOS = 3
export const MAX_PHOTOS = 15

export type Errors = Partial<Record<keyof ListingInput | 'photos', string>>

export function emptyInput(): ListingInput {
  return {
    type: 'haus', title: '', description: '', postalCode: '', city: '', district: '', street: '', houseNo: '',
    priceEur: null, livingAreaM2: null, plotAreaM2: null, rooms: null, yearBuilt: null,
    energyState: '', energyKind: '', energyValue: null, energyCarrier: '', energyClass: '',
    contactMode: 'nachricht', contactEmail: '', contactPhone: '',
  }
}

const len = (s: string, min: number, max: number) => s.trim().length >= min && s.trim().length <= max

/** Spiegelt die Prüfungen der Datenbank, damit Fehler vor dem Absenden verständlich erscheinen. */
export function validateListing(i: ListingInput, photoCount: number): Errors {
  const e: Errors = {}
  if (!len(i.title, 10, 100)) e.title = 'Der Titel braucht 10 bis 100 Zeichen.'
  if (!len(i.description, 50, 5000)) e.description = 'Die Beschreibung braucht mindestens 50 Zeichen (höchstens 5000).'
  if (!/^[0-9]{5}$/.test(i.postalCode.trim())) e.postalCode = 'Bitte eine fünfstellige Postleitzahl eingeben.'
  if (!len(i.city, 2, 80)) e.city = 'Bitte den Ort angeben.'
  if (i.priceEur == null || !Number.isInteger(i.priceEur) || i.priceEur < 1000 || i.priceEur > 100_000_000)
    e.priceEur = 'Bitte einen Kaufpreis zwischen 1.000 € und 100 Mio. € angeben.'

  if (i.type !== 'grundstueck') {
    if (i.livingAreaM2 == null || i.livingAreaM2 <= 0) e.livingAreaM2 = 'Bitte die Wohnfläche angeben.'
    if (i.rooms != null && (i.rooms < 1 || i.rooms > 50)) e.rooms = 'Die Zimmerzahl muss zwischen 1 und 50 liegen.'
    if (!i.energyState) {
      e.energyState = 'Bitte angeben, ob ein Energieausweis vorliegt.'
    } else if (i.energyState === 'vorhanden') {
      if (!i.energyKind) e.energyKind = 'Bitte die Art des Ausweises wählen (Bedarf oder Verbrauch).'
      if (i.energyValue == null || i.energyValue < 0 || i.energyValue > 2000) e.energyValue = 'Bitte den Energiekennwert in kWh/(m²·a) eingeben.'
      if (!len(i.energyCarrier, 2, 60)) e.energyCarrier = 'Bitte den wesentlichen Energieträger der Heizung angeben (z. B. Gas, Fernwärme).'
      if (!(ENERGY_CLASSES as readonly string[]).includes(i.energyClass)) e.energyClass = 'Bitte die Energieeffizienzklasse wählen.'
      if (i.yearBuilt == null) e.yearBuilt = 'Bei vorhandenem Energieausweis ist das Baujahr Pflicht.'
    }
  }
  if (i.yearBuilt != null && (i.yearBuilt < 1000 || i.yearBuilt > 2100)) e.yearBuilt = 'Bitte ein gültiges Baujahr eingeben.'

  if (i.contactMode !== 'nachricht' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(i.contactEmail.trim()))
    e.contactEmail = 'Für diese Sichtbarkeit wird eine gültige E-Mail-Adresse gebraucht.'
  if (i.contactMode === 'login_telefon' && !len(i.contactPhone, 6, 25)) e.contactPhone = 'Bitte eine Telefonnummer angeben.'
  if (photoCount < MIN_PHOTOS) e.photos = `Bitte mindestens ${MIN_PHOTOS} Fotos hochladen (bisher ${photoCount}).`
  return e
}

/** Obergrenzen der Energieeffizienzklassen für Wohngebäude in kWh/(m²·a). */
const CLASS_LIMITS: [string, number][] = [
  ['A+', 30], ['A', 50], ['B', 75], ['C', 100], ['D', 130], ['E', 160], ['F', 200], ['G', 250],
]

export function energyClassFor(value: number): string {
  for (const [c, limit] of CLASS_LIMITS) if (value < limit) return c
  return 'H'
}

/** Weicher Hinweis, kein Fehler: Kennwert und Klasse passen laut Skala nicht zusammen. */
export function energyHint(i: Pick<ListingInput, 'energyValue' | 'energyClass'>): string | null {
  if (i.energyValue == null || !i.energyClass) return null
  const expected = energyClassFor(i.energyValue)
  return expected === i.energyClass
    ? null
    : `Zu ${String(i.energyValue).replace('.', ',')} kWh/(m²·a) gehört üblicherweise die Klasse ${expected}. Bitte noch einmal mit dem Energieausweis vergleichen.`
}

export function hasErrors(e: Errors): boolean {
  return Object.keys(e).length > 0
}
