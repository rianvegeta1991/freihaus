// Demo-Schicht: alles im Arbeitsspeicher, ohne Server. Damit lässt sich die Seite ausprobieren,
// bevor ein Supabase-Projekt existiert. Verhält sich wie die echte Datenbank (Prüfung, Vertrauensstufe,
// Fotopflicht), ist aber KEIN Ersatz für deren Sicherheitsregeln – die liegen in supabase/migrations.
import type {
  Api, ContactInfo, ContactMessage, Listing, ListingInput, ListingStatus, Message, ModerationAction, ModerationEntry,
  Photo, Report, SearchFilter, User,
} from '../types'
import { hasErrors, validateListing } from '../validation'

interface Row extends Listing { houseNo: string; contactEmail: string; contactPhone: string }
interface MsgRow { id: string; listingId: string; senderId: string; body: string; createdAt: string }

const DAY = 86_400_000
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2))

/** Einfache, selbst gezeichnete Haus-Grafik als Platzhalterfoto (keine fremden Bildrechte). */
function houseSvg(hue: number, variant: number): string {
  const wall = `hsl(${hue} 35% 78%)`, roof = `hsl(${(hue + 200) % 360} 30% 38%)`, sky = `hsl(${(hue + 170) % 360} 45% 90%)`
  const garden = `hsl(${(hue + 90) % 360} 25% 70%)`
  const body = variant % 3 === 0
    ? `<rect x="90" y="120" width="220" height="100" fill="${wall}"/><polygon points="75,122 200,50 325,122" fill="${roof}"/><rect x="180" y="160" width="40" height="60" fill="#5b4636"/><rect x="110" y="140" width="40" height="34" fill="#fff"/><rect x="250" y="140" width="40" height="34" fill="#fff"/>`
    : variant % 3 === 1
      ? `<rect x="60" y="100" width="280" height="120" fill="${wall}"/><rect x="50" y="90" width="300" height="16" fill="${roof}"/><rect x="170" y="150" width="40" height="70" fill="#5b4636"/><rect x="85" y="125" width="60" height="40" fill="#fff"/><rect x="250" y="125" width="60" height="40" fill="#fff"/>`
      : `<rect x="110" y="80" width="180" height="140" fill="${wall}"/><polygon points="100,82 200,30 300,82" fill="${roof}"/><rect x="180" y="165" width="40" height="55" fill="#5b4636"/><rect x="128" y="105" width="36" height="30" fill="#fff"/><rect x="236" y="105" width="36" height="30" fill="#fff"/>`
  const s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250"><rect width="400" height="250" fill="${sky}"/><rect y="215" width="400" height="35" fill="${garden}"/>${body}</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(s)}`
}

function seed(): Row[] {
  const now = Date.now()
  const base = (i: number, o: Partial<Row>): Row => {
    const id = `demo-${i}`
    const photos: Photo[] = [0, 1, 2].map((p) => ({ id: `${id}-p${p}`, path: `${id}/${p}`, url: houseSvg(30 + i * 37 + p * 8, i + p), position: p, alt: 'Platzhalter-Abbildung' }))
    return {
      id, ownerId: 'demo-owner', status: 'published', type: 'haus', title: '', description: '', postalCode: '04155', city: 'Leipzig',
      priceEur: 300000, contactMode: 'nachricht', addressVerified: false, createdAt: new Date(now - i * 3 * DAY).toISOString(),
      publishedAt: new Date(now - i * 3 * DAY).toISOString(), expiresAt: new Date(now + (90 - i * 3) * DAY).toISOString(),
      photos, houseNo: '12', contactEmail: 'beispiel@freihaus.test', contactPhone: '0341 1234567',
      owner: { firstName: 'Beispiel', memberSince: new Date(now - 200 * DAY).toISOString(), phoneVerified: true }, ...o,
    }
  }
  return [
    base(1, { title: 'Reihenhaus mit Südgarten in Gohlis', description: 'Gepflegtes Reihenhaus mit Südgarten, ruhig gelegen, wenige Minuten zu Park und Straßenbahn. Neue Fenster 2018, Dachboden ausgebaut. Der Verkauf erfolgt direkt vom Eigentümer, ohne Makler.', district: 'Gohlis', street: 'Menckestraße', priceEur: 349000, livingAreaM2: 132, plotAreaM2: 280, rooms: 5, yearBuilt: 1998, energyState: 'vorhanden', energyKind: 'bedarf', energyValue: 112.5, energyCarrier: 'Gas', energyClass: 'D', contactMode: 'login_email', addressVerified: true }),
    base(2, { type: 'wohnung', title: 'Helle 3-Zimmer-Wohnung mit Balkon in Connewitz', description: 'Sanierte Altbauwohnung im zweiten Obergeschoss, Dielenboden, Südbalkon, Hausgeld 280 €. Besichtigung nach Terminabsprache möglich. Verkauf privat, keine Provision.', postalCode: '04277', district: 'Connewitz', street: 'Biedermannstraße', priceEur: 239000, livingAreaM2: 84, rooms: 3, yearBuilt: 1905, energyState: 'vorhanden', energyKind: 'verbrauch', energyValue: 98, energyCarrier: 'Fernwärme', energyClass: 'C' }),
    base(3, { title: 'Einfamilienhaus mit großem Grundstück in Markkleeberg', description: 'Freistehendes Einfamilienhaus auf 820 m² Grundstück, Garage, Keller, Kamin. Verkauf aus Altersgründen, gern auch an Familien mit Kindern. Ich beantworte Fragen persönlich.', city: 'Markkleeberg', postalCode: '04416', district: 'Mitte', street: 'Hauptstraße', priceEur: 489000, livingAreaM2: 165, plotAreaM2: 820, rooms: 6, yearBuilt: 1972, energyState: 'folgt', contactMode: 'login_telefon' }),
    base(4, { type: 'grundstueck', title: 'Baugrundstück in ruhiger Lage in Taucha', description: 'Voll erschlossenes Baugrundstück, 640 m², Südausrichtung, Bebauungsplan liegt vor. Direktverkauf durch die Eigentümerin, ohne Makler und ohne Provision.', city: 'Taucha', postalCode: '04425', street: 'Am Anger', priceEur: 158000, plotAreaM2: 640 }),
    base(5, { type: 'wohnung', title: '2-Zimmer-Wohnung als Kapitalanlage in Lindenau', description: 'Vermietete 2-Zimmer-Wohnung, Mieter seit 2019 zuverlässig, Balkon, Aufzug im Haus. Unterlagen (Teilungserklärung, Wirtschaftsplan) liegen vor.', postalCode: '04177', district: 'Lindenau', street: 'Georg-Schwarz-Straße', priceEur: 129000, livingAreaM2: 52, rooms: 2, yearBuilt: 1928, energyState: 'vorhanden', energyKind: 'bedarf', energyValue: 134, energyCarrier: 'Gas', energyClass: 'E' }),
    base(6, { title: 'Doppelhaushälfte in Engelsdorf mit Werkstatt', description: 'Doppelhaushälfte mit Werkstatt im Nebengebäude, Solaranlage, Wärmepumpe seit 2021. Gepflegter Zustand, bezugsfrei nach Vereinbarung. Verkauf direkt vom Eigentümer.', city: 'Leipzig', postalCode: '04319', district: 'Engelsdorf', street: 'Hauptstraße', priceEur: 398000, livingAreaM2: 124, plotAreaM2: 410, rooms: 4.5, yearBuilt: 2004, energyState: 'vorhanden', energyKind: 'bedarf', energyValue: 38, energyCarrier: 'Strom (Wärmepumpe)', energyClass: 'A' }),
  ]
}

export function createDemoApi(): Api {
  let rows: Row[] = seed()
  const msgs: MsgRow[] = []
  const reports: (Report & { listingTitle: string })[] = []
  const contacts: ContactMessage[] = []
  const log: ModerationEntry[] = []
  const savedIds = new Set<string>()
  const contactViews: number[] = []
  const sentTimes: number[] = []
  let user: User | null = null
  const listeners: ((u: User | null) => void)[] = []
  const notify = () => listeners.forEach((l) => l(user))

  const toPublic = ({ houseNo: _h, contactEmail: _e, contactPhone: _p, ...rest }: Row): Listing => rest
  const visible = (r: Row) => r.status === 'published' && (!r.expiresAt || new Date(r.expiresAt).getTime() > Date.now())
  const mineOf = (id: string) => rows.find((r) => r.id === id && r.ownerId === user?.id)
  const need = (): User => { if (!user) throw new Error('login_required: Bitte melden Sie sich an.'); return user }
  const toInput = (r: Row): ListingInput => ({
    type: r.type, title: r.title, description: r.description, postalCode: r.postalCode, city: r.city, district: r.district ?? '',
    street: r.street ?? '', houseNo: r.houseNo, priceEur: r.priceEur, livingAreaM2: r.livingAreaM2 ?? null, plotAreaM2: r.plotAreaM2 ?? null,
    rooms: r.rooms ?? null, yearBuilt: r.yearBuilt ?? null, energyState: r.energyState ?? '', energyKind: r.energyKind ?? '',
    energyValue: r.energyValue ?? null, energyCarrier: r.energyCarrier ?? '', energyClass: r.energyClass ?? '',
    contactMode: r.contactMode, contactEmail: r.contactEmail, contactPhone: r.contactPhone,
  })

  const api: Api = {
    mode: 'demo',
    async getUser() { return user },
    onAuthChange(cb) { listeners.push(cb) },
    async signIn(email) {
      const e = email.trim().toLowerCase()
      user = {
        id: e.startsWith('admin') ? 'demo-admin' : e === 'beispiel@freihaus.test' ? 'demo-owner' : `demo-${e}`,
        email: e, displayName: '', phone: '', phoneVerified: false,
        isAdmin: e.startsWith('admin'), trustLevel: e.startsWith('admin') ? 3 : 0,
      }
      notify()
      return { sent: false }
    },
    async signOut() { user = null; notify() },
    async updateProfile(p) {
      const u = need(); user = { ...u, displayName: p.displayName.trim(), phone: p.phone.trim(), phoneVerified: p.phone === u.phone ? u.phoneVerified : false }; notify()
    },

    async search(f: SearchFilter) {
      const q = (f.q ?? '').trim().toLowerCase()
      let out = rows.filter(visible)
      if (q) out = out.filter((r) => /^\d{1,5}$/.test(q) ? r.postalCode.startsWith(q) : `${r.city} ${r.district ?? ''}`.toLowerCase().includes(q))
      if (f.type) out = out.filter((r) => r.type === f.type)
      if (f.priceMax) out = out.filter((r) => r.priceEur <= f.priceMax!)
      if (f.areaMin) out = out.filter((r) => (r.livingAreaM2 ?? 0) >= f.areaMin!)
      if (f.roomsMin) out = out.filter((r) => (r.rooms ?? 0) >= f.roomsMin!)
      const sort = f.sort ?? 'neu'
      out = [...out].sort((a, b) => sort === 'preis_auf' ? a.priceEur - b.priceEur : sort === 'preis_ab' ? b.priceEur - a.priceEur : (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
      return out.map(toPublic)
    },
    async get(id) {
      const r = rows.find((x) => x.id === id)
      if (!r) return null
      if (!visible(r) && r.ownerId !== user?.id && !user?.isAdmin) return null
      return toPublic(r)
    },
    async mine() { const u = need(); return rows.filter((r) => r.ownerId === u.id).map(toPublic) },
    async getInput(id) { const r = mineOf(id); return r ? toInput(r) : null },
    async saveDraft(input, id) {
      const u = need()
      const fields = {
        type: input.type, title: input.title.trim(), description: input.description.trim(), postalCode: input.postalCode.trim(), city: input.city.trim(),
        district: input.district.trim() || undefined, street: input.street.trim() || undefined, priceEur: input.priceEur ?? 0,
        livingAreaM2: input.livingAreaM2 ?? undefined, plotAreaM2: input.plotAreaM2 ?? undefined, rooms: input.rooms ?? undefined,
        yearBuilt: input.yearBuilt ?? undefined, energyState: input.energyState || undefined, energyKind: input.energyKind || undefined,
        energyValue: input.energyValue ?? undefined, energyCarrier: input.energyCarrier.trim() || undefined, energyClass: input.energyClass || undefined,
        contactMode: input.contactMode, houseNo: input.houseNo.trim(), contactEmail: input.contactEmail.trim(), contactPhone: input.contactPhone.trim(),
      }
      if (id) {
        const r = mineOf(id)
        if (!r) throw new Error('not_found')
        Object.assign(r, fields)
        return id
      }
      const mineToday = rows.filter((r) => r.ownerId === u.id && Date.now() - new Date(r.createdAt).getTime() < DAY).length
      if (u.trustLevel < 1 && mineToday >= 3) throw new Error('rate_limited: Neue Konten dürfen höchstens 3 Inserate pro 24 Stunden anlegen.')
      const nid = uid()
      rows.push({ id: nid, ownerId: u.id, status: 'draft', addressVerified: false, createdAt: new Date().toISOString(), photos: [], ...fields })
      return nid
    },
    async addPhoto(listingId, blob, alt) {
      const r = mineOf(listingId)
      if (!r) throw new Error('not_found')
      if (r.photos.length >= 15) throw new Error('Höchstens 15 Fotos.')
      const url = URL.createObjectURL(blob)
      const p: Photo = { id: uid(), path: `${listingId}/${uid()}`, url, position: r.photos.length, alt }
      r.photos.push(p)
      return p
    },
    async removePhoto(listingId, photoId) {
      const r = mineOf(listingId)
      if (!r) throw new Error('not_found')
      r.photos = r.photos.filter((p) => p.id !== photoId).map((p, i) => ({ ...p, position: i }))
    },
    async setStatus(id, status) {
      const u = need()
      const r = mineOf(id)
      if (!r) throw new Error('not_found')
      const ok = (r.status === 'draft' && status === 'pending') || (r.status === 'pending' && status === 'draft') ||
        (r.status === 'published' && (status === 'paused' || status === 'sold')) || (r.status === 'paused' && (status === 'pending' || status === 'sold')) ||
        (r.status === 'expired' && status === 'pending')
      if (!ok) throw new Error(`status_not_allowed: ${r.status} -> ${status} ist nicht erlaubt.`)
      if (status === 'pending') {
        if (r.photos.length < 3) throw new Error(`photos_missing: Mindestens 3 Fotos sind nötig (vorhanden: ${r.photos.length}).`)
        const errs = validateListing(toInput(r), r.photos.length)
        if (hasErrors(errs)) throw new Error('Pflichtangaben fehlen: ' + Object.values(errs).join(' '))
        if (u.trustLevel >= 1) {
          r.status = 'published'; r.publishedAt = r.publishedAt ?? new Date().toISOString(); r.expiresAt = new Date(Date.now() + 90 * DAY).toISOString()
          return r.status
        }
      }
      r.status = status
      return r.status
    },
    async deleteListing(id) {
      const r = mineOf(id)
      if (!r || !['draft', 'pending'].includes(r.status)) throw new Error('Nur Entwürfe und Inserate in Prüfung lassen sich löschen.')
      rows = rows.filter((x) => x.id !== id)
    },

    async revealContact(id): Promise<ContactInfo> {
      need()
      const now = Date.now()
      while (contactViews.length && now - contactViews[0] > DAY) contactViews.shift()
      if (contactViews.length >= 30) throw new Error('rate_limited: Zu viele Kontaktaufrufe in 24 Stunden.')
      const r = rows.find((x) => x.id === id)
      if (!r || !visible(r)) throw new Error('not_found')
      contactViews.push(now)
      return { mode: r.contactMode, email: r.contactMode !== 'nachricht' ? r.contactEmail : null, phone: r.contactMode === 'login_telefon' ? r.contactPhone : null }
    },
    async sendMessage(listingId, body) {
      const u = need()
      const r = rows.find((x) => x.id === listingId)
      if (!r || !visible(r) || r.ownerId === u.id) throw new Error('Diese Nachricht kann nicht gesendet werden.')
      const now = Date.now()
      const recent = sentTimes.filter((t) => now - t < DAY).length
      if (recent >= (u.trustLevel < 1 ? 10 : 30)) throw new Error('rate_limited: Zu viele Nachrichten in 24 Stunden.')
      if (body.trim().length < 5) throw new Error('Die Nachricht ist zu kurz.')
      sentTimes.push(now)
      msgs.push({ id: uid(), listingId, senderId: u.id, body: body.trim(), createdAt: new Date().toISOString() })
    },
    async inbox(): Promise<Message[]> {
      const u = need()
      return msgs
        .filter((m) => m.senderId === u.id || rows.find((r) => r.id === m.listingId)?.ownerId === u.id)
        .map((m) => ({ id: m.id, listingId: m.listingId, listingTitle: rows.find((r) => r.id === m.listingId)?.title ?? '', senderId: m.senderId, body: m.body, createdAt: m.createdAt, mine: m.senderId === u.id }))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },
    async toggleSaved(id) { need(); if (savedIds.has(id)) { savedIds.delete(id); return false } savedIds.add(id); return true },
    async isSaved(id) { return savedIds.has(id) },
    async saved() { need(); return rows.filter((r) => savedIds.has(r.id) && visible(r)).map(toPublic) },

    async report(r) {
      const l = rows.find((x) => x.id === r.listingId)
      if (!l) throw new Error('not_found')
      if (r.details.trim().length < 10) throw new Error('Bitte beschreiben Sie das Problem in mindestens 10 Zeichen.')
      reports.push({ id: uid(), listingId: r.listingId, listingTitle: l.title, reason: r.reason, details: r.details.trim(), reporterEmail: r.email.trim() || undefined, createdAt: new Date().toISOString(), state: 'offen' })
    },
    async moderationLog() { const u = need(); return log.filter((l) => rows.find((r) => r.id === l.listingId)?.ownerId === u.id) },
    async sendContact(c) {
      const email = c.email.trim().toLowerCase()
      if (!c.name.trim()) throw new Error('Bitte geben Sie Ihren Namen an.')
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Bitte geben Sie eine gültige E-Mail-Adresse an.')
      if (c.body.trim().length < 10) throw new Error('Bitte schreiben Sie mindestens 10 Zeichen.')
      if (contacts.filter((m) => m.email === email).length >= 3) throw new Error('rate_limited: Von dieser Adresse sind heute schon mehrere Nachrichten eingegangen. Bitte versuchen Sie es morgen erneut.')
      contacts.push({ id: uid(), name: c.name.trim(), email, topic: c.topic, body: c.body.trim(), createdAt: new Date().toISOString() })
    },

    async adminQueue() {
      if (!user?.isAdmin) throw new Error('forbidden: Nur für Moderatoren.')
      return { pending: rows.filter((r) => r.status === 'pending').map(toPublic), reports: reports.filter((r) => r.state === 'offen'), contacts: [...contacts] }
    },
    async closeContact(id) {
      if (!user?.isAdmin) throw new Error('forbidden: Nur für Moderatoren.')
      const i = contacts.findIndex((m) => m.id === id)
      if (i >= 0) contacts.splice(i, 1)
    },
    async moderate(p) {
      if (!user?.isAdmin) throw new Error('forbidden: Nur für Moderatoren.')
      const r = rows.find((x) => x.id === p.listingId)
      if (!r) throw new Error('not_found')
      if (p.action !== 'freigeben' && p.reasonText.trim().length < 10) throw new Error('reason_required: Eine Begründung ist Pflicht (DSA Art. 17).')
      const map: Record<ModerationAction, ListingStatus> = { freigeben: 'published', sperren: 'blocked', zurueckweisen: 'draft' }
      r.status = map[p.action]
      if (p.action === 'freigeben') { r.publishedAt = r.publishedAt ?? new Date().toISOString(); r.expiresAt = new Date(Date.now() + 90 * DAY).toISOString() }
      log.push({ id: uid(), listingId: r.id, action: p.action, reasonText: p.reasonText, createdAt: new Date().toISOString() })
      const rep = reports.find((x) => x.id === p.reportId)
      if (rep) rep.state = 'entschieden'
    },
    async stats() { return { published: rows.filter(visible).length } },
  }
  return api
}
