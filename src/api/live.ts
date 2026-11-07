// Echte Anbindung an Supabase. ACHTUNG: Diese Datei ist gegen KEIN echtes Supabase-Projekt getestet
// (es gab beim Schreiben noch keines). Die Datenbankregeln selbst sind in tests/db.test.ts geprüft;
// ob die Aufrufe hier sie korrekt ansprechen, zeigt erst der erste Lauf gegen ein Projekt.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { withBase } from '../router'
import type {
  Api, ContactInfo, ContactMessage, Listing, ListingInput, ListingStatus, Message, ModerationEntry, Photo, Report, SearchFilter, User,
} from '../types'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>

const BUCKET = 'listing-photos'

function fail(e: { message: string } | null): void {
  if (e) throw new Error(e.message)
}

export function createLiveApi(url: string, anonKey: string): Api {
  const sb: SupabaseClient = createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } })

  const photoUrl = (path: string) => sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl

  const toPhoto = (p: Row): Photo => ({ id: p.id, path: p.storage_path, url: photoUrl(p.storage_path), position: p.position, alt: p.alt ?? undefined })

  const toListing = (r: Row): Listing => ({
    id: r.id, ownerId: r.owner_id, status: r.status, type: r.type, title: r.title, description: r.description,
    postalCode: r.postal_code, city: r.city, district: r.district ?? undefined, street: r.street ?? undefined,
    priceEur: r.price_eur, livingAreaM2: r.living_area_m2 != null ? Number(r.living_area_m2) : undefined,
    plotAreaM2: r.plot_area_m2 != null ? Number(r.plot_area_m2) : undefined, rooms: r.rooms != null ? Number(r.rooms) : undefined,
    yearBuilt: r.year_built ?? undefined, energyState: r.energy_state ?? undefined, energyKind: r.energy_kind ?? undefined,
    energyValue: r.energy_value != null ? Number(r.energy_value) : undefined, energyCarrier: r.energy_carrier ?? undefined,
    energyClass: r.energy_class ?? undefined, contactMode: r.contact_mode, addressVerified: r.address_verified,
    createdAt: r.created_at, publishedAt: r.published_at ?? undefined, expiresAt: r.expires_at ?? undefined,
    photos: ((r.listing_photos ?? []) as Row[]).map(toPhoto).sort((a, b) => a.position - b.position),
  })

  const SELECT = '*, listing_photos(*)'

  async function currentUser(): Promise<User | null> {
    const { data } = await sb.auth.getSession()
    const s = data.session
    if (!s) return null
    const { data: p } = await sb.from('profiles').select('*').eq('id', s.user.id).maybeSingle()
    return {
      id: s.user.id, email: s.user.email ?? '', displayName: p?.display_name ?? '', phone: p?.phone ?? '',
      phoneVerified: !!p?.phone_verified, isAdmin: p?.role === 'admin', trustLevel: p?.trust_level ?? 0,
    }
  }
  const need = async (): Promise<User> => {
    const u = await currentUser()
    if (!u) throw new Error('login_required: Bitte melden Sie sich an.')
    return u
  }

  const dbFields = (i: ListingInput) => ({
    type: i.type, title: i.title.trim(), description: i.description.trim(), postal_code: i.postalCode.trim(), city: i.city.trim(),
    district: i.district.trim() || null, street: i.street.trim() || null, price_eur: i.priceEur, living_area_m2: i.livingAreaM2,
    plot_area_m2: i.plotAreaM2, rooms: i.rooms, year_built: i.yearBuilt, energy_state: i.energyState || null,
    energy_kind: i.energyKind || null, energy_value: i.energyValue, energy_carrier: i.energyCarrier.trim() || null,
    energy_class: i.energyClass || null, contact_mode: i.contactMode,
  })

  const api: Api = {
    mode: 'live',
    getUser: currentUser,
    onAuthChange(cb) { sb.auth.onAuthStateChange(() => { void currentUser().then(cb) }) },
    async signIn(email) {
      const { error } = await sb.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin + withBase('/konto') } })
      fail(error)
      return { sent: true }
    },
    async signOut() { await sb.auth.signOut() },
    async updateProfile(p) {
      const u = await need()
      const { error } = await sb.from('profiles').update({ display_name: p.displayName.trim(), phone: p.phone.trim() || null }).eq('id', u.id)
      fail(error)
    },

    async search(f: SearchFilter) {
      let q = sb.from('listings').select(SELECT).eq('status', 'published')
      const term = (f.q ?? '').trim().replace(/[,()%*\\]/g, ' ')
      if (term) q = /^\d{1,5}$/.test(term) ? q.like('postal_code', `${term}%`) : q.or(`city.ilike.%${term}%,district.ilike.%${term}%`)
      if (f.type) q = q.eq('type', f.type)
      if (f.priceMax) q = q.lte('price_eur', f.priceMax)
      if (f.areaMin) q = q.gte('living_area_m2', f.areaMin)
      if (f.roomsMin) q = q.gte('rooms', f.roomsMin)
      const sort = f.sort ?? 'neu'
      q = sort === 'preis_auf' ? q.order('price_eur', { ascending: true }) : sort === 'preis_ab' ? q.order('price_eur', { ascending: false }) : q.order('published_at', { ascending: false })
      const { data, error } = await q.limit(60)
      fail(error)
      return (data ?? []).map(toListing)
    },
    async get(id) {
      const { data, error } = await sb.from('listings').select(SELECT).eq('id', id).maybeSingle()
      fail(error)
      if (!data) return null
      const l = toListing(data)
      const { data: op } = await sb.from('public_profiles').select('*').eq('id', l.ownerId).maybeSingle()
      if (op) l.owner = { firstName: op.first_name ?? undefined, memberSince: op.member_since, phoneVerified: !!op.phone_verified }
      return l
    },
    async mine() {
      const u = await need()
      const { data, error } = await sb.from('listings').select(SELECT).eq('owner_id', u.id).order('created_at', { ascending: false })
      fail(error)
      return (data ?? []).map(toListing)
    },
    async getInput(id) {
      const { data, error } = await sb.from('listings').select('*, listing_private(*)').eq('id', id).maybeSingle()
      fail(error)
      if (!data) return null
      const p = (Array.isArray(data.listing_private) ? data.listing_private[0] : data.listing_private) ?? {}
      return {
        type: data.type, title: data.title, description: data.description, postalCode: data.postal_code, city: data.city,
        district: data.district ?? '', street: data.street ?? '', houseNo: p.house_no ?? '', priceEur: data.price_eur,
        livingAreaM2: data.living_area_m2 != null ? Number(data.living_area_m2) : null, plotAreaM2: data.plot_area_m2 != null ? Number(data.plot_area_m2) : null,
        rooms: data.rooms != null ? Number(data.rooms) : null, yearBuilt: data.year_built, energyState: data.energy_state ?? '', energyKind: data.energy_kind ?? '',
        energyValue: data.energy_value != null ? Number(data.energy_value) : null, energyCarrier: data.energy_carrier ?? '', energyClass: data.energy_class ?? '',
        contactMode: data.contact_mode, contactEmail: p.contact_email ?? '', contactPhone: p.contact_phone ?? '',
      }
    },
    async saveDraft(input, id) {
      const u = await need()
      let listingId = id
      if (listingId) {
        const { error } = await sb.from('listings').update(dbFields(input)).eq('id', listingId)
        fail(error)
      } else {
        const { data, error } = await sb.from('listings').insert({ ...dbFields(input), owner_id: u.id }).select('id').single()
        fail(error)
        listingId = data!.id as string
      }
      const { error } = await sb.from('listing_private').upsert({
        listing_id: listingId, house_no: input.houseNo.trim() || null, contact_email: input.contactEmail.trim() || null, contact_phone: input.contactPhone.trim() || null,
      })
      fail(error)
      return listingId!
    },
    async addPhoto(listingId, blob, alt) {
      const u = await need()
      const { data: existing } = await sb.from('listing_photos').select('position').eq('listing_id', listingId)
      const used = new Set((existing ?? []).map((p: Row) => p.position as number))
      let position = 0
      while (used.has(position)) position++
      if (position > 14) throw new Error('Höchstens 15 Fotos.')
      const path = `${u.id}/${listingId}/${crypto.randomUUID()}.webp`
      const up = await sb.storage.from(BUCKET).upload(path, blob, { contentType: blob.type || 'image/webp', cacheControl: '31536000' })
      fail(up.error)
      const { data, error } = await sb.from('listing_photos').insert({ listing_id: listingId, storage_path: path, position, alt: alt ?? null }).select('*').single()
      if (error) { await sb.storage.from(BUCKET).remove([path]); fail(error) }
      return toPhoto(data!)
    },
    async removePhoto(_listingId, photoId) {
      const { data } = await sb.from('listing_photos').select('storage_path').eq('id', photoId).maybeSingle()
      const { error } = await sb.from('listing_photos').delete().eq('id', photoId)
      fail(error)
      if (data?.storage_path) await sb.storage.from(BUCKET).remove([data.storage_path])
    },
    async setStatus(id, status) {
      const { data, error } = await sb.from('listings').update({ status }).eq('id', id).select('status').single()
      fail(error)
      return data!.status as ListingStatus
    },
    async deleteListing(id) {
      const { error } = await sb.from('listings').delete().eq('id', id)
      fail(error)
    },

    async revealContact(id): Promise<ContactInfo> {
      const { data, error } = await sb.rpc('reveal_contact', { p_listing: id })
      fail(error)
      const r = (Array.isArray(data) ? data[0] : data) as Row
      return { mode: r.mode, email: r.email ?? null, phone: r.phone ?? null }
    },
    async sendMessage(listingId, body) {
      const u = await need()
      const { error } = await sb.from('messages').insert({ listing_id: listingId, sender_id: u.id, body: body.trim() })
      fail(error)
    },
    async inbox(): Promise<Message[]> {
      const u = await need()
      const { data, error } = await sb.from('messages').select('*, listings(title)').order('created_at', { ascending: false }).limit(100)
      fail(error)
      return (data ?? []).map((m: Row) => ({
        id: m.id, listingId: m.listing_id, listingTitle: m.listings?.title ?? '', senderId: m.sender_id, body: m.body, createdAt: m.created_at, mine: m.sender_id === u.id,
      }))
    },
    async toggleSaved(listingId) {
      const u = await need()
      const { data } = await sb.from('saved_listings').select('listing_id').eq('listing_id', listingId).eq('user_id', u.id).maybeSingle()
      if (data) { fail((await sb.from('saved_listings').delete().eq('listing_id', listingId).eq('user_id', u.id)).error); return false }
      fail((await sb.from('saved_listings').insert({ listing_id: listingId, user_id: u.id })).error)
      return true
    },
    async isSaved(listingId) {
      const u = await currentUser()
      if (!u) return false
      const { data } = await sb.from('saved_listings').select('listing_id').eq('listing_id', listingId).eq('user_id', u.id).maybeSingle()
      return !!data
    },
    async saved() {
      await need()
      const { data, error } = await sb.from('saved_listings').select(`listing_id, listings(${SELECT})`)
      fail(error)
      return (data ?? []).map((r: Row) => r.listings).filter(Boolean).map(toListing)
    },

    async report(r) {
      const u = await currentUser()
      const { error } = await sb.from('reports').insert({
        listing_id: r.listingId, reporter_id: u?.id ?? null, reporter_name: r.name.trim() || null, reporter_email: r.email.trim() || null, reason: r.reason, details: r.details.trim(),
      })
      fail(error)
    },
    async moderationLog(): Promise<ModerationEntry[]> {
      await need()
      const { data, error } = await sb.from('moderation_log').select('*').order('created_at', { ascending: false })
      fail(error)
      return (data ?? []).map((m: Row) => ({ id: String(m.id), listingId: m.listing_id, action: m.action, reasonText: m.reason_text, createdAt: m.created_at }))
    },

    async adminQueue() {
      const { data: l, error: e1 } = await sb.from('listings').select(SELECT).eq('status', 'pending').order('created_at')
      fail(e1)
      const { data: r, error: e2 } = await sb.from('reports').select('*, listings(title)').eq('state', 'offen').order('created_at')
      fail(e2)
      const reports: Report[] = (r ?? []).map((x: Row) => ({
        id: x.id, listingId: x.listing_id, listingTitle: x.listings?.title ?? '', reason: x.reason, details: x.details, reporterEmail: x.reporter_email ?? undefined, createdAt: x.created_at, state: x.state,
      }))
      const { data: c, error: e3 } = await sb.from('contact_messages').select('*').eq('state', 'offen').order('created_at')
      fail(e3)
      const contacts: ContactMessage[] = (c ?? []).map((x: Row) => ({
        id: x.id, name: x.name, email: x.email, topic: x.topic, body: x.body, createdAt: x.created_at,
      }))
      return { pending: (l ?? []).map(toListing), reports, contacts }
    },
    async sendContact(c) {
      const { error } = await sb.from('contact_messages').insert({ name: c.name.trim(), email: c.email.trim(), topic: c.topic, body: c.body.trim() })
      fail(error)
    },
    async closeContact(id) {
      const u = await currentUser()
      const { error } = await sb.from('contact_messages').update({ state: 'entschieden', decided_at: new Date().toISOString(), decided_by: u?.id ?? null }).eq('id', id)
      fail(error)
    },
    async moderate(p) {
      const { error } = await sb.rpc('moderate_listing', {
        p_listing: p.listingId, p_action: p.action, p_reason_code: p.reasonCode, p_reason_text: p.reasonText, p_report: p.reportId ?? null,
      })
      fail(error)
    },
    async stats() {
      const { count, error } = await sb.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'published')
      fail(error)
      return { published: count ?? 0 }
    },
  }
  return api
}
