import { api } from '../api'
import { h, clear } from '../dom'
import { daysLeft, fmtDate, fmtDay, fmtEur, fmtNum, fmtPerM2, fmtPrice, OWNER_WORD, TYPE_LABEL } from '../format'
import { navigate, type Route } from '../router'
import type { ContactInfo, Listing, ReportReason } from '../types'
import { badges, errMsg, field, listingCard, openModal, session, setTitle, statusChip, toast } from '../ui'

const REASONS: [ReportReason, string][] = [
  ['betrug', 'Betrugsverdacht (z. B. Vorkasse-Forderung, gestohlene Fotos)'],
  ['falsche_angaben', 'Falsche oder irreführende Angaben'],
  ['urheberrecht', 'Foto oder Text verletzt Urheberrechte'],
  ['makler', 'Anbieter ist Makler/gewerblich'],
  ['unzulaessig', 'Rechtswidriger oder unzulässiger Inhalt'],
  ['sonstiges', 'Sonstiges'],
]

export async function renderListing(r: Route): Promise<HTMLElement> {
  const l = await api.get(r.params.id)
  if (!l) {
    setTitle('Inserat nicht gefunden')
    return h('div', { class: 'wrap section' }, h('h1', null, 'Dieses Inserat gibt es nicht (mehr)'), h('p', null, 'Es wurde vielleicht beendet, verkauft, vermietet oder gesperrt. ', h('a', { href: '/suche' }, 'Weitere Inserate ansehen →')))
  }
  setTitle(`${l.title}`, `${TYPE_LABEL[l.type]} ${l.offer === 'miete' ? 'zur Miete' : 'zum Kauf'} in ${l.postalCode} ${l.city}, ${fmtPrice(l)} – direkt vom Eigentümer, ohne Provision.`)
  const preview = l.status !== 'published'

  // ---------- Galerie
  const main = h('img', { class: 'gal-main', src: l.photos[0]?.url ?? '', alt: l.photos[0]?.alt ?? `Foto 1 von ${l.title}`, width: 800, height: 500 })
  const thumbs = h('div', { class: 'gal-thumbs', role: 'list' }, l.photos.map((p, i) =>
    h('button', { type: 'button', class: 'gal-thumb', role: 'listitem', 'aria-label': `Foto ${i + 1} anzeigen`, onClick: () => { main.src = p.url; main.alt = p.alt ?? `Foto ${i + 1} von ${l.title}` } },
      h('img', { src: p.url, alt: '', loading: 'lazy', width: 120, height: 80 }))))
  const gallery = l.photos.length ? h('div', { class: 'gallery' }, main, l.photos.length > 1 ? thumbs : null) : h('div', { class: 'noimg big' }, 'Kein Foto')

  // ---------- Merken
  const saveBtn = h('button', { class: 'btn btn-ghost', type: 'button', 'aria-pressed': 'false' }, '♡ Merken')
  saveBtn.addEventListener('click', async () => {
    if (!session.user) { navigate(`/anmelden?weiter=${encodeURIComponent(`/inserat/${l.id}`)}`); return }
    try {
      const on = await api.toggleSaved(l.id)
      saveBtn.textContent = on ? '♥ Gemerkt' : '♡ Merken'
      saveBtn.setAttribute('aria-pressed', String(on))
    } catch (e) { toast(errMsg(e), 'fehler') }
  })
  if (session.user) void api.isSaved(l.id).then((on) => { if (on) { saveBtn.textContent = '♥ Gemerkt'; saveBtn.setAttribute('aria-pressed', 'true') } }).catch(() => {})

  // ---------- Melden
  const reportBtn = h('button', { class: 'btn btn-ghost', type: 'button', onClick: () => openReport(l) }, '⚑ Inserat melden')

  const energy = energyBlock(l)
  const left = h('div', { class: 'detail-main' },
    preview ? h('div', { class: 'notice' }, statusChip(l.status, l.offer), ' Vorschau – dieses Inserat ist für andere noch nicht sichtbar.') : null,
    gallery,
    h('div', { class: 'detail-head' },
      badges(l),
      h('h1', null, l.title),
      h('p', { class: 'loc' }, `${l.street ? `${l.street}, ` : ''}${l.postalCode} ${l.city}${l.district ? `-${l.district}` : ''}`)),
    h('dl', { class: 'facts' }, factRows(l)),
    h('h2', null, 'Beschreibung'),
    h('div', { class: 'desc' }, l.description.split(/\n{2,}/).map((p) => h('p', null, p))),
    energy,
    h('p', { class: 'meta' }, l.publishedAt ? `Online seit ${fmtDate(l.publishedAt)}` : '', l.expiresAt && daysLeft(l.expiresAt) != null ? ` · läuft in ${daysLeft(l.expiresAt)} Tagen ab` : ''),
    h('div', { class: 'row-actions' }, saveBtn, reportBtn))

  const side = h('aside', { class: 'detail-side' },
    h('div', { class: 'price-box' },
      h('div', { class: 'price' }, fmtPrice(l), l.offer === 'miete' ? h('span', { class: 'per' }, ' / Monat') : null),
      l.livingAreaM2 ? h('div', { class: 'per' }, fmtPerM2(l.priceEur, l.livingAreaM2, l.offer)) : null,
      l.offer === 'miete' && l.serviceCostsEur != null ? h('div', { class: 'per' }, `+ ${fmtEur(l.serviceCostsEur)} Nebenkosten (Vorauszahlung)`) : null,
      h('p', { class: 'free' }, l.offer === 'miete' ? '0 € Provision – Sie mieten direkt vom Eigentümer.' : '0 € Provision – Sie kaufen direkt vom Eigentümer.')),
    contactBox(l, preview),
    safetyBox(l))

  const similar = h('section', { class: 'similar' })
  void api.search({ q: l.postalCode.slice(0, 3), offer: l.offer, sort: 'neu' }).then((all) => {
    const others = all.filter((x) => x.id !== l.id).slice(0, 3)
    if (others.length) similar.append(h('h2', null, 'Ähnliche Inserate in der Nähe'), h('div', { class: 'grid' }, others.map((l) => listingCard(l))))
  }).catch(() => {})

  return h('div', { class: 'wrap section' },
    h('nav', { 'aria-label': 'Brotkrumen', class: 'crumbs' }, h('a', { href: '/' }, 'Start'), ' › ', h('a', { href: '/suche' }, 'Suche'), ' › ', l.city),
    h('div', { class: 'detail' }, left, side), similar)
}

function factRows(l: Listing): HTMLElement[] {
  const rows: [string, string][] = [['Art', l.offer === 'miete' ? `${TYPE_LABEL[l.type]} zur Miete` : TYPE_LABEL[l.type]]]
  if (l.offer === 'miete') {
    rows.push(['Kaltmiete', `${fmtEur(l.priceEur)} / Monat`])
    if (l.serviceCostsEur != null) {
      rows.push(['Nebenkosten (Vorauszahlung)', `${fmtEur(l.serviceCostsEur)} / Monat`])
      rows.push(['Gesamtmiete', `${fmtEur(l.priceEur + l.serviceCostsEur)} / Monat`])
    }
    if (l.depositEur != null) rows.push(['Kaution', fmtEur(l.depositEur)])
    rows.push(['Frei ab', l.availableFrom ? fmtDay(l.availableFrom) : 'nach Absprache'])
    rows.push(['Möbliert', l.furnished ? 'Ja' : 'Nein'])
  }
  if (l.livingAreaM2) rows.push(['Wohnfläche', `${fmtNum(l.livingAreaM2)} m²`])
  if (l.plotAreaM2) rows.push(['Grundstück', `${fmtNum(l.plotAreaM2)} m²`])
  if (l.rooms) rows.push(['Zimmer', fmtNum(l.rooms)])
  if (l.yearBuilt) rows.push(['Baujahr', String(l.yearBuilt)])
  return rows.map(([k, v]) => h('div', { class: 'fact' }, h('dt', null, k), h('dd', null, v)))
}

/** Die Energieausweis-Pflichtangaben stehen sichtbar im Inserat, nicht versteckt. */
function energyBlock(l: Listing): HTMLElement | null {
  if (l.type === 'grundstueck') return null
  const box = h('section', { class: 'energy-box', 'aria-labelledby': 'energy-h' }, h('h2', { id: 'energy-h' }, 'Energieausweis'))
  if (l.energyState === 'vorhanden') {
    box.append(h('dl', { class: 'facts' },
      row('Art des Ausweises', l.energyKind === 'bedarf' ? 'Bedarfsausweis' : 'Verbrauchsausweis'),
      row('Energiekennwert', `${fmtNum(l.energyValue ?? 0)} kWh/(m²·a)`),
      row('Wesentlicher Energieträger', l.energyCarrier ?? '–'),
      row('Baujahr', l.yearBuilt ? String(l.yearBuilt) : '–'),
      row('Energieeffizienzklasse', l.energyClass ?? '–')))
  } else if (l.energyState === 'folgt') {
    box.append(h('p', null, h('strong', null, 'Der Energieausweis liegt noch nicht vor.'), ` Der ${OWNER_WORD[l.offer]} legt ihn spätestens zur Besichtigung vor.`))
  } else {
    box.append(h('p', null, `Für dieses Objekt ist nach Angabe des ${l.offer === 'miete' ? 'Vermieters' : 'Verkäufers'} kein Energieausweis erforderlich.`))
  }
  return box
}
const row = (k: string, v: string) => h('div', { class: 'fact' }, h('dt', null, k), h('dd', null, v))

function safetyBox(l: Listing): HTMLElement {
  const miete = l.offer === 'miete'
  return h('div', { class: 'safety' },
    h('h3', null, h('span', { 'aria-hidden': 'true' }, '⚠ '), 'Vor jeder Zahlung'),
    h('ul', null,
      miete
        ? h('li', null, h('strong', null, 'Keine Miete, Kaution oder „Reservierung“ vor der Besichtigung'), ' und vor dem unterschriebenen Mietvertrag überweisen.')
        : h('li', null, 'Kaufverträge werden nur beim Notar geschlossen.'),
      miete
        ? h('li', null, 'Die Wohnung muss vor Ort besichtigt werden. Schlüssel gibt es nur persönlich, nie per Post oder „Treuhand“.')
        : h('li', null, h('strong', null, 'Nie Geld vorab überweisen'), ' – weder Anzahlung, Reservierung noch Kaution.'),
      h('li', null, 'Besichtigen Sie das Objekt, bevor Sie sich festlegen.'),
      h('li', null, 'Misstrauisch bei „ich bin im Ausland“ oder Druck zur Eile.')),
    h('a', { href: '/sicherheit' }, 'Mehr Sicherheitstipps →'))
}

function contactBox(l: Listing, preview: boolean): HTMLElement {
  const box = h('div', { class: 'contact-box' }, h('h2', null, l.offer === 'miete' ? 'Kontakt zum Vermieter' : 'Kontakt zum Eigentümer'))
  if (l.owner) box.append(h('p', { class: 'owner' }, `${l.owner.firstName ?? OWNER_WORD[l.offer]} · Mitglied seit ${fmtDate(l.owner.memberSince)}`))
  if (preview) { box.append(h('p', null, 'Nach der Veröffentlichung können Interessenten hier Kontakt aufnehmen.')); return box }
  if (session.user && session.user.id === l.ownerId) { box.append(h('p', null, 'Das ist Ihr eigenes Inserat. Nachrichten von Interessenten finden Sie in Ihrem Konto.'), h('a', { class: 'btn btn-secondary', href: '/konto' }, 'Zum Konto')); return box }
  if (!session.user) {
    box.append(h('p', null, (l.offer === 'miete' ? 'Damit Vermieter vor Spam und Betrug geschützt sind, sehen Sie die Kontaktmöglichkeiten nach kostenloser Anmeldung.' : 'Damit Verkäufer vor Spam und Betrug geschützt sind, sehen Sie die Kontaktmöglichkeiten nach kostenloser Anmeldung.')),
      h('a', { class: 'btn btn-primary', href: `/anmelden?weiter=${encodeURIComponent(`/inserat/${l.id}`)}` }, 'Anmelden und Kontakt anzeigen'))
    return box
  }

  const out = h('div', { class: 'contact-out' })
  const showBtn = h('button', { class: 'btn btn-secondary', type: 'button' }, 'Kontaktdaten anzeigen')
  showBtn.addEventListener('click', async () => {
    showBtn.setAttribute('disabled', '')
    try { renderContact(out, await api.revealContact(l.id)); showBtn.remove() } catch (e) { toast(errMsg(e), 'fehler'); showBtn.removeAttribute('disabled') }
  })

  const ta = h('textarea', { rows: 4, maxlength: 2000, placeholder: l.offer === 'miete' ? 'Guten Tag, ich interessiere mich für Ihre Wohnung. Wann wäre eine Besichtigung möglich?' : 'Guten Tag, ich interessiere mich für Ihr Haus. Wann wäre eine Besichtigung möglich?' }) as HTMLTextAreaElement
  const send = h('button', { class: 'btn btn-primary', type: 'submit' }, 'Nachricht senden')
  const form = h('form', { class: 'msg-form', onSubmit: async (e: Event) => {
    e.preventDefault()
    send.setAttribute('disabled', '')
    try { await api.sendMessage(l.id, ta.value); ta.value = ''; toast(`Nachricht gesendet. Der ${OWNER_WORD[l.offer]} meldet sich bei Ihnen.`) } catch (er) { toast(errMsg(er), 'fehler') }
    send.removeAttribute('disabled')
  } }, field('Ihre Nachricht', ta, { hint: 'Geben Sie hier keine Bank- oder Kartendaten ein.' }), send)

  box.append(form, h('p', { class: 'or' }, 'oder'), showBtn, out)
  return box
}

function renderContact(out: HTMLElement, c: ContactInfo): void {
  clear(out)
  if (c.mode === 'nachricht') { out.append(h('p', null, 'Der Eigentümer möchte über das Nachrichtenformular erreicht werden.')); return }
  // E-Mail/Telefon als Links, ohne HTML-Einfügung
  const dl = h('dl', { class: 'facts contact-data' })
  if (c.email) dl.append(h('div', { class: 'fact' }, h('dt', null, 'E-Mail'), h('dd', null, h('a', { href: `mailto:${c.email}` }, c.email))))
  if (c.phone) dl.append(h('div', { class: 'fact' }, h('dt', null, 'Telefon'), h('dd', null, h('a', { href: `tel:${c.phone.replace(/[^+\d]/g, '')}` }, c.phone))))
  out.append(dl)
}

function openReport(l: Listing): void {
  const reason = h('select', null, REASONS.map(([v, t]) => h('option', { value: v }, t))) as HTMLSelectElement
  const details = h('textarea', { rows: 5, maxlength: 2000, required: true, placeholder: 'Bitte beschreiben Sie, was Ihnen aufgefallen ist.' }) as HTMLTextAreaElement
  const name = h('input', { type: 'text', autocomplete: 'name', maxlength: 100 }) as HTMLInputElement
  const email = h('input', { type: 'email', autocomplete: 'email', value: session.user?.email ?? '' }) as HTMLInputElement
  const submit = h('button', { class: 'btn btn-primary', type: 'submit' }, 'Meldung absenden')
  let modal: { close: () => void }
  const form = h('form', { onSubmit: async (e: Event) => {
    e.preventDefault()
    submit.setAttribute('disabled', '')
    try {
      await api.report({ listingId: l.id, reason: reason.value as ReportReason, details: details.value, name: name.value, email: email.value })
      toast('Danke für Ihre Meldung. Wir prüfen sie und geben Ihnen Bescheid.')
      modal.close()
    } catch (er) { toast(errMsg(er), 'fehler'); submit.removeAttribute('disabled') }
  } },
  h('p', null, `Inserat: ${l.title}`),
  field('Grund', reason),
  field('Was ist das Problem?', details, { required: true }),
  field('Ihr Name', name, { hint: 'Freiwillig. Wir brauchen Name und E-Mail nur, um Ihnen das Ergebnis mitzuteilen.' }),
  field('Ihre E-Mail-Adresse', email, { hint: 'Freiwillig.' }),
  h('div', { class: 'row-actions' }, submit))
  modal = openModal('Inserat melden', form)
}
