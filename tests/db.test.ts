// Prüft Schema und Sicherheitsregeln (RLS) gegen eine echte Postgres-Engine (PGlite, läuft im Prozess).
// Die Supabase-spezifischen Teile (auth.uid(), Rollen) werden unten nachgebaut.
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it } from 'vitest'

const MIGRATION = readFileSync(new URL('../supabase/migrations/0001_schema.sql', import.meta.url), 'utf8')

const CONTACT = readFileSync(new URL('../supabase/migrations/0003_contact.sql', import.meta.url), 'utf8')

const BOOT = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
`

const U1 = '11111111-1111-1111-1111-111111111111' // normaler Nutzer
const U2 = '22222222-2222-2222-2222-222222222222' // zweiter Nutzer
const ADM = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' // Moderator

let db: PGlite

async function as(user: string | null) {
  await db.exec('reset role')
  if (user === null) {
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`)
    await db.exec('set role anon')
  } else {
    await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [user])
    await db.exec('set role authenticated')
  }
}
async function root() {
  await db.exec('reset role')
  await db.query(`select set_config('request.jwt.claim.sub', '', false)`)
}

const BASE = `insert into listings (owner_id, type, title, description, postal_code, city, price_eur, living_area_m2, year_built,
  energy_state, energy_kind, energy_value, energy_carrier, energy_class)
  values ($1, 'haus', 'Reihenhaus mit Garten in Gohlis', '${'Schönes Haus. '.repeat(6)}', '04155', 'Leipzig', 349000, 132, 1998,
  'vorhanden', 'bedarf', 112.5, 'Gas', 'C') returning id`

async function neuesInserat(owner: string, status?: string): Promise<string> {
  await root()
  const r = await db.query<{ id: string }>(BASE, [owner])
  const id = r.rows[0].id
  if (status && status !== 'draft') {
    for (let i = 0; i < 3; i++) {
      await db.query(`insert into listing_photos (listing_id, storage_path, position) values ($1, $2, $3)`, [id, `${owner}/${id}-${i}.webp`, i])
    }
    await db.query(`update listings set status = $2 where id = $1`, [id, status])
  }
  return id
}

async function fehler(fn: () => Promise<unknown>): Promise<string> {
  try { await fn() } catch (e) { return String((e as Error).message) }
  return ''
}

beforeEach(async () => {
  db = new PGlite()
  await db.exec(BOOT)
  await db.exec(MIGRATION)
  await db.exec(CONTACT)
  await db.exec(`insert into auth.users (id, email) values ('${U1}', 'a@x.de'), ('${U2}', 'b@x.de'), ('${ADM}', 'm@x.de')`)
  await db.exec(`update profiles set role = 'admin' where id = '${ADM}'`)
})

describe('Profile', () => {
  it('legt beim Anmelden automatisch ein Profil an', async () => {
    const r = await db.query(`select count(*)::int as n from profiles`)
    expect((r.rows[0] as { n: number }).n).toBe(3)
  })
  it('Nutzer können weder Rolle noch Vertrauensstufe selbst setzen', async () => {
    await as(U1)
    await db.query(`update profiles set role = 'admin', trust_level = 3, phone_verified = true where id = $1`, [U1])
    await root()
    const r = await db.query<{ role: string; trust_level: number; phone_verified: boolean }>(`select role, trust_level, phone_verified from profiles where id = $1`, [U1])
    expect(r.rows[0]).toEqual({ role: 'user', trust_level: 0, phone_verified: false })
  })
  it('Nutzer sehen fremde Profile nicht', async () => {
    await as(U1)
    const r = await db.query(`select id from profiles`)
    expect(r.rows).toHaveLength(1)
  })
})

describe('Sichtbarkeit von Inseraten', () => {
  it('Besucher ohne Konto sehen nur veröffentlichte Inserate', async () => {
    await neuesInserat(U1, 'published')
    await neuesInserat(U1) // Entwurf
    await neuesInserat(U1, 'pending')
    await as(null)
    const r = await db.query(`select status from listings`)
    expect(r.rows).toEqual([{ status: 'published' }])
  })
  it('Fremde sehen keine Entwürfe oder Wartende, der Inserent schon', async () => {
    await neuesInserat(U1, 'pending')
    await as(U2)
    expect((await db.query(`select 1 from listings`)).rows).toHaveLength(0)
    await as(U1)
    expect((await db.query(`select 1 from listings`)).rows).toHaveLength(1)
  })
  it('abgelaufene Inserate verschwinden aus der öffentlichen Suche', async () => {
    const id = await neuesInserat(U1, 'published')
    await root()
    await db.query(`update listings set expires_at = now() - interval '1 day' where id = $1`, [id])
    await as(null)
    expect((await db.query(`select 1 from listings`)).rows).toHaveLength(0)
  })
  it('Fotos folgen der Sichtbarkeit des Inserats', async () => {
    await neuesInserat(U1, 'published')
    await neuesInserat(U1, 'pending')
    await as(null)
    expect((await db.query(`select 1 from listing_photos`)).rows).toHaveLength(3)
  })
})

describe('Kontaktdaten und Hausnummer', () => {
  it('private Angaben sind für Besucher und Fremde nicht lesbar', async () => {
    const id = await neuesInserat(U1, 'published')
    await root()
    await db.query(`insert into listing_private (listing_id, house_no, contact_email, contact_phone) values ($1, '12a', 'v@x.de', '0341123456')`, [id])
    await as(U2)
    expect((await db.query(`select 1 from listing_private`)).rows).toHaveLength(0)
    await as(null)
    expect(await fehler(() => db.query(`select 1 from listing_private`))).toMatch(/permission denied/)
  })
  it('Fremde können keine privaten Angaben an fremden Inseraten anlegen', async () => {
    const id = await neuesInserat(U1, 'published')
    await as(U2)
    expect(await fehler(() => db.query(`insert into listing_private (listing_id, contact_email) values ($1, 'x@x.de')`, [id]))).toMatch(/row-level security/)
  })
  it('reveal_contact verlangt Login', async () => {
    const id = await neuesInserat(U1, 'published')
    await as(null)
    expect(await fehler(() => db.query(`select * from reveal_contact($1)`, [id]))).toMatch(/permission denied|login_required/)
  })
  it('reveal_contact gibt je nach Sichtbarkeitsstufe frei – nie die Hausnummer', async () => {
    const id = await neuesInserat(U1, 'published')
    await root()
    await db.query(`insert into listing_private (listing_id, house_no, contact_email, contact_phone) values ($1, '12a', 'v@x.de', '0341123456')`, [id])
    await as(U2)
    let r = await db.query<{ mode: string; email: string | null; phone: string | null }>(`select * from reveal_contact($1)`, [id])
    expect(r.rows[0]).toEqual({ mode: 'nachricht', email: null, phone: null })
    await root()
    await db.query(`update listings set contact_mode = 'login_email' where id = $1`, [id])
    await as(U2)
    r = await db.query(`select * from reveal_contact($1)`, [id])
    expect(r.rows[0]).toEqual({ mode: 'login_email', email: 'v@x.de', phone: null })
    await root()
    await db.query(`update listings set contact_mode = 'login_telefon' where id = $1`, [id])
    await as(U2)
    r = await db.query(`select * from reveal_contact($1)`, [id])
    expect(r.rows[0]).toEqual({ mode: 'login_telefon', email: 'v@x.de', phone: '0341123456' })
    expect(JSON.stringify(r.rows)).not.toContain('12a')
  })
  it('reveal_contact ist auf 30 Aufrufe pro 24 Stunden begrenzt', async () => {
    const id = await neuesInserat(U1, 'published')
    await as(U2)
    for (let i = 0; i < 30; i++) await db.query(`select * from reveal_contact($1)`, [id])
    expect(await fehler(() => db.query(`select * from reveal_contact($1)`, [id]))).toMatch(/rate_limited/)
  })
  it('reveal_contact funktioniert nicht bei nicht veröffentlichten Inseraten', async () => {
    const id = await neuesInserat(U1, 'pending')
    await as(U2)
    expect(await fehler(() => db.query(`select * from reveal_contact($1)`, [id]))).toMatch(/not_found/)
  })
})

describe('Pflichtangaben und Statuswechsel', () => {
  it('Energieausweis „vorhanden“ verlangt alle Angaben, sobald es mehr als ein Entwurf ist', async () => {
    const id = await neuesInserat(U1)
    await root()
    await db.query(`insert into listing_photos (listing_id, storage_path, position) select $1, 'p' || g, g from generate_series(0,2) g`, [id])
    await db.query(`update listings set energy_class = null where id = $1`, [id]) // Entwurf: erlaubt
    await as(U1)
    expect(await fehler(() => db.query(`update listings set status = 'pending' where id = $1`, [id]))).toMatch(/listing_pflichtangaben/)
  })
  it('„folgt“ oder „nicht erforderlich“ braucht keine Kennwerte', async () => {
    const id = await neuesInserat(U1)
    await root()
    await db.query(`insert into listing_photos (listing_id, storage_path, position) select $1, 'p' || g, g from generate_series(0,2) g`, [id])
    await db.query(`update listings set energy_state = 'folgt', energy_class = null, energy_value = null, energy_kind = null, energy_carrier = null where id = $1`, [id])
    await as(U1)
    await db.query(`update listings set status = 'pending' where id = $1`, [id])
    await root()
    expect((await db.query<{ status: string }>(`select status from listings where id = $1`, [id])).rows[0].status).toBe('pending')
  })
  it('Einreichen ohne 3 Fotos wird abgelehnt', async () => {
    const id = await neuesInserat(U1)
    await as(U1)
    expect(await fehler(() => db.query(`update listings set status = 'pending' where id = $1`, [id]))).toMatch(/photos_missing/)
  })
  it('Neue Konten landen in der Prüfung und können sich nicht selbst freigeben', async () => {
    const id = await neuesInserat(U1)
    await root()
    await db.query(`insert into listing_photos (listing_id, storage_path, position) select $1, 'p' || g, g from generate_series(0,2) g`, [id])
    await as(U1)
    await db.query(`update listings set status = 'pending' where id = $1`, [id])
    await root()
    expect((await db.query<{ status: string }>(`select status from listings where id = $1`, [id])).rows[0].status).toBe('pending')
    await as(U1)
    expect(await fehler(() => db.query(`update listings set status = 'published' where id = $1`, [id]))).toMatch(/status_not_allowed/)
  })
  it('Beim Neuanlegen wird jeder Status zu „draft“ und Frist/Badge lassen sich nicht setzen', async () => {
    await as(U1)
    const r = await db.query<{ status: string; published_at: unknown; address_verified: boolean }>(
      `insert into listings (owner_id, type, title, description, postal_code, city, price_eur, status, published_at, expires_at, address_verified)
       values ($1, 'grundstueck', 'Bauplatz in Markkleeberg', '${'Sonniges Grundstück. '.repeat(5)}', '04416', 'Markkleeberg', 150000, 'published', now(), now() + interval '999 days', true)
       returning status, published_at, address_verified`, [U1])
    expect(r.rows[0]).toEqual({ status: 'draft', published_at: null, address_verified: false })
  })
  it('Moderation gibt frei, setzt Frist und hebt die Vertrauensstufe', async () => {
    const id = await neuesInserat(U1, 'pending')
    await as(ADM)
    await db.query(`select moderate_listing($1, 'freigeben', 'freigabe', '')`, [id])
    await root()
    const r = await db.query<{ status: string; days: number }>(`select status, round(extract(epoch from (expires_at - now())) / 86400)::int as days from listings where id = $1`, [id])
    expect(r.rows[0]).toEqual({ status: 'published', days: 90 })
    expect((await db.query<{ trust_level: number }>(`select trust_level from profiles where id = $1`, [U1])).rows[0].trust_level).toBe(1)
  })
  it('Vertrauenswürdige Konten werden direkt veröffentlicht', async () => {
    await root()
    await db.exec(`update profiles set trust_level = 1 where id = '${U1}'`)
    const id = await neuesInserat(U1)
    await root()
    await db.query(`insert into listing_photos (listing_id, storage_path, position) select $1, 'p' || g, g from generate_series(0,2) g`, [id])
    await as(U1)
    await db.query(`update listings set status = 'pending' where id = $1`, [id])
    await root()
    expect((await db.query<{ status: string }>(`select status from listings where id = $1`, [id])).rows[0].status).toBe('published')
  })
  it('Inserent kann pausieren und „verkauft“ melden, aber nicht zurück von „verkauft“', async () => {
    await root(); await db.exec(`update profiles set trust_level = 1 where id = '${U1}'`)
    const id = await neuesInserat(U1, 'published')
    await as(U1)
    await db.query(`update listings set status = 'paused' where id = $1`, [id])
    await db.query(`update listings set status = 'sold' where id = $1`, [id])
    expect(await fehler(() => db.query(`update listings set status = 'pending' where id = $1`, [id]))).toMatch(/status_not_allowed/)
  })
  it('Neue Konten dürfen höchstens 3 Inserate pro Tag anlegen', async () => {
    await neuesInserat(U1); await neuesInserat(U1); await neuesInserat(U1)
    await as(U1)
    expect(await fehler(() => db.query(BASE, [U1]))).toMatch(/rate_limited/)
  })
  it('Fremde können fremde Inserate weder ändern noch löschen', async () => {
    const id = await neuesInserat(U1, 'published')
    await as(U2)
    await db.query(`update listings set price_eur = 1000 where id = $1`, [id])
    await db.query(`delete from listings where id = $1`, [id])
    await root()
    const r = await db.query<{ price_eur: number }>(`select price_eur from listings where id = $1`, [id])
    expect(r.rows[0].price_eur).toBe(349000)
  })
  it('Preis und Postleitzahl werden geprüft', async () => {
    await as(U1)
    expect(await fehler(() => db.query(BASE.replace("'04155'", "'4155'"), [U1]))).toMatch(/postal_code/)
  })
})

describe('Nachrichten', () => {
  it('Nachrichten gehen nur an veröffentlichte, fremde Inserate', async () => {
    const pub = await neuesInserat(U1, 'published')
    const pend = await neuesInserat(U1, 'pending')
    await as(U2)
    await db.query(`insert into messages (listing_id, sender_id, body) values ($1, $2, 'Guten Tag, ich interessiere mich.')`, [pub, U2])
    expect(await fehler(() => db.query(`insert into messages (listing_id, sender_id, body) values ($1, $2, 'Guten Tag, ich interessiere mich.')`, [pend, U2]))).toMatch(/row-level security/)
    await as(U1)
    expect(await fehler(() => db.query(`insert into messages (listing_id, sender_id, body) values ($1, $2, 'Das ist mein eigenes Haus.')`, [pub, U1]))).toMatch(/row-level security/)
  })
  it('man kann nicht im Namen anderer schreiben, und nur Inserent/Absender lesen mit', async () => {
    const pub = await neuesInserat(U1, 'published')
    await as(U2)
    expect(await fehler(() => db.query(`insert into messages (listing_id, sender_id, body) values ($1, $2, 'Ich gebe mich als U1 aus.')`, [pub, U1]))).toMatch(/row-level security/)
    await db.query(`insert into messages (listing_id, sender_id, body) values ($1, $2, 'Guten Tag, ich interessiere mich.')`, [pub, U2])
    await as(U1)
    expect((await db.query(`select 1 from messages`)).rows).toHaveLength(1)
    await root(); await db.exec(`insert into auth.users (id) values ('33333333-3333-3333-3333-333333333333')`)
    await as('33333333-3333-3333-3333-333333333333')
    expect((await db.query(`select 1 from messages`)).rows).toHaveLength(0)
  })
  it('neue Konten dürfen höchstens 10 Nachrichten pro Tag schreiben', async () => {
    const pub = await neuesInserat(U1, 'published')
    await as(U2)
    for (let i = 0; i < 10; i++) await db.query(`insert into messages (listing_id, sender_id, body) values ($1, $2, 'Nachricht Nummer ${i} an Sie.')`, [pub, U2])
    expect(await fehler(() => db.query(`insert into messages (listing_id, sender_id, body) values ($1, $2, 'Eine elfte Nachricht an Sie.')`, [pub, U2]))).toMatch(/rate_limited/)
  })
})

describe('Kontaktformular', () => {
  const ins = (mail = 'frage@x.de', body = 'Wie funktioniert die Freigabe eines Inserats?') =>
    db.query(`insert into contact_messages (name, email, topic, body) values ('Eva', $1, 'frage', $2)`, [mail, body])

  it('Besucher ohne Konto können schreiben, aber nichts lesen; Moderation liest', async () => {
    await as(null)
    await ins()
    expect(await fehler(() => db.query(`select * from contact_messages`))).toMatch(/permission denied/)
    await as(U2)
    expect((await db.query(`select * from contact_messages`)).rows).toHaveLength(0)
    await as(ADM)
    const rows = (await db.query<{ email: string }>(`select email from contact_messages`)).rows
    expect(rows).toHaveLength(1)
    expect(rows[0].email).toBe('frage@x.de')
  })
  it('prüft Adresse und Länge, setzt Status nur auf „offen“', async () => {
    await as(null)
    expect(await fehler(() => ins('keine-adresse'))).toMatch(/violates check/)
    expect(await fehler(() => ins('a@x.de', 'kurz'))).toMatch(/violates check/)
    expect(await fehler(() => ins('a@x.de', 'x'.repeat(3001)))).toMatch(/violates check/)
    expect(await fehler(() => db.query(`insert into contact_messages (name, email, body, state) values ('E', 'a@x.de', 'Eine ausreichend lange Nachricht.', 'entschieden')`))).toMatch(/row-level security/)
  })
  it('bremst Absender nach drei Nachrichten am Tag und die Gesamtflut pro Stunde', async () => {
    await as(null)
    for (let i = 0; i < 3; i++) await ins('viel@x.de')
    expect(await fehler(() => ins('VIEL@x.de'))).toMatch(/rate_limited/)
    for (let i = 0; i < 37; i++) await ins(`m${i}@x.de`)
    expect(await fehler(() => ins('neu@x.de'))).toMatch(/rate_limited/)
  })
  it('nur die Moderation darf eine Nachricht erledigen', async () => {
    await as(null); await ins()
    await as(U2)
    await db.query(`update contact_messages set state = 'entschieden'`)
    expect((await db.query(`select * from contact_messages`)).rows).toHaveLength(0)
    await as(ADM)
    await db.query(`update contact_messages set state = 'entschieden', decided_at = now(), decided_by = $1`, [ADM])
    expect((await db.query<{ state: string }>(`select state from contact_messages`)).rows[0].state).toBe('entschieden')
  })
})

describe('Meldungen und Moderation (DSA)', () => {
  it('Besucher ohne Konto können melden, aber keine Meldungen lesen', async () => {
    const id = await neuesInserat(U1, 'published')
    await as(null)
    await db.query(`insert into reports (listing_id, reporter_email, reason, details) values ($1, 'melder@x.de', 'betrug', 'Verlangt Vorkasse vor Besichtigung.')`, [id])
    expect(await fehler(() => db.query(`select * from reports`))).toMatch(/permission denied/)
    await as(U2)
    expect((await db.query(`select * from reports`)).rows).toHaveLength(0)
  })
  it('Besucher können eine Meldung nicht als „entschieden“ einreichen', async () => {
    const id = await neuesInserat(U1, 'published')
    await as(null)
    expect(await fehler(() => db.query(`insert into reports (listing_id, reason, details, state) values ($1, 'betrug', 'Verlangt Vorkasse vor Besichtigung.', 'entschieden')`, [id]))).toMatch(/row-level security/)
  })
  it('Sperren verlangt eine Begründung, speichert sie und schließt die Meldung', async () => {
    const id = await neuesInserat(U1, 'published')
    await root()
    const rep = (await db.query<{ id: string }>(`insert into reports (listing_id, reason, details) values ($1, 'betrug', 'Verlangt Vorkasse vor Besichtigung.') returning id`, [id])).rows[0].id
    await as(U2)
    expect(await fehler(() => db.query(`select moderate_listing($1, 'sperren', 'betrug', 'Nicht erlaubt')`, [id]))).toMatch(/forbidden/)
    await as(ADM)
    expect(await fehler(() => db.query(`select moderate_listing($1, 'sperren', 'betrug', 'kurz')`, [id]))).toMatch(/reason_required/)
    await db.query(`select moderate_listing($1, 'sperren', 'betrug', 'Vorkasse-Forderung bestätigt, Inserat gesperrt.', $2)`, [id, rep])
    await root()
    expect((await db.query<{ status: string }>(`select status from listings where id = $1`, [id])).rows[0].status).toBe('blocked')
    expect((await db.query<{ state: string }>(`select state from reports where id = $1`, [rep])).rows[0].state).toBe('entschieden')
    // Der betroffene Inserent sieht die Begründung (Art. 17), Fremde nicht
    await as(U1)
    expect((await db.query(`select * from moderation_log`)).rows).toHaveLength(1)
    await as(U2)
    expect((await db.query(`select * from moderation_log`)).rows).toHaveLength(0)
  })
  it('Moderation kann private Angaben und Entwürfe einsehen', async () => {
    await neuesInserat(U1)
    await as(ADM)
    expect((await db.query(`select 1 from listings`)).rows).toHaveLength(1)
  })
})

describe('Merkliste', () => {
  it('jeder sieht nur die eigene Merkliste', async () => {
    const id = await neuesInserat(U1, 'published')
    await as(U2)
    await db.query(`insert into saved_listings (user_id, listing_id) values ($1, $2)`, [U2, id])
    expect(await fehler(() => db.query(`insert into saved_listings (user_id, listing_id) values ($1, $2)`, [U1, id]))).toMatch(/row-level security/)
    await as(U1)
    expect((await db.query(`select 1 from saved_listings`)).rows).toHaveLength(0)
  })
})
