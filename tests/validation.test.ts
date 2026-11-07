import { describe, expect, it } from 'vitest'
import { emptyInput, energyClassFor, energyHint, hasErrors, validateListing } from '../src/validation'
import type { ListingInput } from '../src/types'

function gut(): ListingInput {
  return {
    ...emptyInput(),
    title: 'Reihenhaus mit Garten in Gohlis',
    description: 'Ein gepflegtes Reihenhaus mit Südgarten, ruhig gelegen, nahe Park und Straßenbahn. '.repeat(1),
    postalCode: '04155', city: 'Leipzig', priceEur: 349000, livingAreaM2: 132, rooms: 5, yearBuilt: 1998,
    energyState: 'vorhanden', energyKind: 'bedarf', energyValue: 112.5, energyCarrier: 'Gas', energyClass: 'D',
  }
}

describe('validateListing', () => {
  it('akzeptiert ein vollständiges Inserat', () => {
    expect(hasErrors(validateListing(gut(), 3))).toBe(false)
  })
  it('verlangt mindestens drei Fotos', () => {
    expect(validateListing(gut(), 2).photos).toMatch(/mindestens 3/)
  })
  it('verlangt bei vorhandenem Energieausweis alle fünf Pflichtangaben', () => {
    for (const feld of ['energyKind', 'energyValue', 'energyCarrier', 'energyClass', 'yearBuilt'] as const) {
      const i = gut()
      ;(i as unknown as Record<string, unknown>)[feld] = feld === 'energyValue' || feld === 'yearBuilt' ? null : ''
      expect(validateListing(i, 3)[feld], feld).toBeTruthy()
    }
  })
  it('„folgt“ und „nicht erforderlich“ brauchen keine Kennwerte', () => {
    for (const s of ['folgt', 'nicht_erforderlich'] as const) {
      const i = { ...gut(), energyState: s, energyKind: '' as const, energyValue: null, energyCarrier: '', energyClass: '', yearBuilt: null }
      expect(hasErrors(validateListing(i, 3))).toBe(false)
    }
  })
  it('verlangt die Angabe zum Energieausweis bei Häusern und Wohnungen, nicht bei Grundstücken', () => {
    expect(validateListing({ ...gut(), energyState: '' }, 3).energyState).toBeTruthy()
    const g = { ...gut(), type: 'grundstueck' as const, energyState: '' as const, livingAreaM2: null }
    expect(hasErrors(validateListing(g, 3))).toBe(false)
  })
  it('prüft Postleitzahl, Preis und Titel', () => {
    const e = validateListing({ ...gut(), postalCode: '4155', priceEur: 500, title: 'kurz' }, 3)
    expect(e.postalCode).toBeTruthy()
    expect(e.priceEur).toBeTruthy()
    expect(e.title).toBeTruthy()
  })
  it('verlangt E-Mail bzw. Telefon passend zur Sichtbarkeit', () => {
    expect(validateListing({ ...gut(), contactMode: 'login_email', contactEmail: 'kein-mail' }, 3).contactEmail).toBeTruthy()
    expect(validateListing({ ...gut(), contactMode: 'login_telefon', contactEmail: 'a@b.de', contactPhone: '' }, 3).contactPhone).toBeTruthy()
    expect(hasErrors(validateListing({ ...gut(), contactMode: 'nachricht' }, 3))).toBe(false)
  })
})

describe('Energieeffizienzklasse', () => {
  it('ordnet Kennwerte der Skala zu', () => {
    expect(energyClassFor(20)).toBe('A+')
    expect(energyClassFor(45)).toBe('A')
    expect(energyClassFor(74.9)).toBe('B')
    expect(energyClassFor(75)).toBe('C')
    expect(energyClassFor(112.5)).toBe('D')
    expect(energyClassFor(249)).toBe('G')
    expect(energyClassFor(300)).toBe('H')
  })
  it('gibt nur einen weichen Hinweis bei Abweichung', () => {
    expect(energyHint({ energyValue: 112.5, energyClass: 'D' })).toBeNull()
    expect(energyHint({ energyValue: 112.5, energyClass: 'A' })).toMatch(/Klasse D/)
    expect(energyHint({ energyValue: null, energyClass: 'A' })).toBeNull()
  })
})
