import { api } from '../api'
import { h, clear } from '../dom'
import { daysLeft, fmtDate, fmtPrice, statusLabel } from '../format'
import { navigate, type Route } from '../router'
import type { Listing, ListingStatus } from '../types'
import { errMsg, field, listingCard, session, setTitle, spinner, statusChip, toast } from '../ui'

export async function renderAccount(r: Route): Promise<HTMLElement> {
  setTitle('Mein Konto')
  const u = session.user
  if (!u) { navigate(`/anmelden?weiter=${encodeURIComponent(r.path)}`, true); return h('div') }

  const root = h('div', { class: 'wrap section' }, h('h1', null, 'Mein Konto'), h('p', { class: 'meta' }, u.email))
  const listingsBox = h('section', null, h('h2', null, 'Meine Inserate'), spinner())
  const inboxBox = h('section', null, h('h2', null, 'Nachrichten'), spinner())
  const savedBox = h('section', null, h('h2', null, 'Meine Merkliste'), spinner())
  const logBox = h('section', null)

  // ---------- Profil
  const name = h('input', { type: 'text', autocomplete: 'name', maxlength: 60, value: u.displayName }) as HTMLInputElement
  const phone = h('input', { type: 'tel', autocomplete: 'tel', maxlength: 25, value: u.phone }) as HTMLInputElement
  const save = h('button', { class: 'btn btn-secondary', type: 'submit' }, 'Speichern')
  const profile = h('form', { class: 'profile', onSubmit: async (e: Event) => {
    e.preventDefault(); save.setAttribute('disabled', '')
    try { await api.updateProfile({ displayName: name.value, phone: phone.value }); toast('Gespeichert.') } catch (er) { toast(errMsg(er), 'fehler') }
    save.removeAttribute('disabled')
  } },
  h('h2', null, 'Meine Angaben'),
  h('div', { class: 'two' }, field('Name', name, { hint: 'Interessenten sehen nur Ihren Vornamen.' }), field('Telefon', phone, { hint: u.phoneVerified ? '✔ Bestätigt' : 'Die Bestätigung per SMS folgt in einer späteren Version.' })),
  save)

  root.append(listingsBox, inboxBox, savedBox, logBox, profile,
    h('p', null, h('button', { class: 'btn btn-ghost', type: 'button', onClick: async () => { await api.signOut(); navigate('/') } }, 'Abmelden')))

  async function loadListings(): Promise<void> {
    try {
      const list = await api.mine()
      clear(listingsBox)
      listingsBox.append(h('div', { class: 'section-head' }, h('h2', null, 'Meine Inserate'), h('a', { class: 'btn btn-primary', href: '/verkaufen' }, '＋ Neues Inserat')))
      if (!list.length) listingsBox.append(h('p', { class: 'empty' }, 'Sie haben noch kein Inserat. ', h('a', { href: '/verkaufen' }, 'Jetzt kostenlos inserieren →')))
      for (const l of list) listingsBox.append(myRow(l))
    } catch (e) { clear(listingsBox); listingsBox.append(h('p', { class: 'err' }, errMsg(e))) }
  }

  function myRow(l: Listing): HTMLElement {
    const act = (label: string, status: ListingStatus, confirmText?: string, cls = 'btn btn-secondary') =>
      h('button', { class: cls, type: 'button', onClick: async () => {
        if (confirmText && !window.confirm(confirmText)) return
        try {
          const s = await api.setStatus(l.id, status)
          toast(s === 'pending' ? 'Eingereicht. Wir prüfen es.' : `Status: ${statusLabel(s, l.offer).text}`)
          await loadListings()
        } catch (e) { toast(errMsg(e), 'fehler') }
      } }, label)
    const actions: HTMLElement[] = []
    if (l.status === 'draft') actions.push(h('a', { class: 'btn btn-primary', href: `/verkaufen/${l.id}` }, 'Weiter bearbeiten'))
    if (['paused', 'expired'].includes(l.status)) actions.push(act(l.status === 'expired' ? 'Erneut einreichen' : 'Wieder einreichen', 'pending', undefined, 'btn btn-primary'), h('a', { class: 'btn btn-secondary', href: `/verkaufen/${l.id}` }, 'Bearbeiten'))
    const fertig = l.offer === 'miete' ? 'vermietet' : 'verkauft'
    if (l.status === 'published') actions.push(act('Pausieren', 'paused'), act(`Als ${fertig} melden`, 'sold', `Wirklich als ${fertig} melden? Das Inserat wird dann beendet und lässt sich nicht wieder aktivieren.`))
    if (l.status === 'pending') actions.push(act('Zurückziehen', 'draft'))
    if (l.status === 'paused') actions.push(act(`Als ${fertig} melden`, 'sold', `Wirklich als ${fertig} melden?`))
    if (['draft', 'pending'].includes(l.status)) actions.push(h('button', { class: 'btn btn-ghost', type: 'button', onClick: async () => {
      if (!window.confirm('Dieses Inserat endgültig löschen?')) return
      try { await api.deleteListing(l.id); await loadListings() } catch (e) { toast(errMsg(e), 'fehler') }
    } }, 'Löschen'))
    const left = daysLeft(l.expiresAt)
    return h('article', { class: 'my-row' },
      h('div', { class: 'my-img' }, l.photos[0] ? h('img', { src: l.photos[0].url, alt: '', width: 120, height: 80, loading: 'lazy' }) : h('div', { class: 'noimg' }, '–')),
      h('div', { class: 'my-main' },
        h('h3', null, l.status === 'published' || l.status === 'pending' || l.status === 'paused' ? h('a', { href: `/inserat/${l.id}` }, l.title || '(ohne Titel)') : (l.title || '(ohne Titel)')),
        h('p', { class: 'meta' }, statusChip(l.status, l.offer), ` ${fmtPrice(l)} · ${l.city}`, l.status === 'published' && left != null ? ` · noch ${left} Tage online` : ''),
        h('p', { class: 'hint' }, statusLabel(l.status, l.offer).hint)),
      h('div', { class: 'my-actions' }, actions))
  }

  void loadListings()
  void api.inbox().then((m) => {
    clear(inboxBox); inboxBox.append(h('h2', null, 'Nachrichten'))
    if (!m.length) { inboxBox.append(h('p', { class: 'empty' }, 'Noch keine Nachrichten.')); return }
    for (const x of m) inboxBox.append(h('article', { class: `msg${x.mine ? ' mine' : ''}` },
      h('p', { class: 'meta' }, x.mine ? 'Von Ihnen' : 'Von einem Interessenten', ' · ', fmtDate(x.createdAt), ' · ', h('a', { href: `/inserat/${x.listingId}` }, x.listingTitle)),
      h('p', null, x.body)))
    inboxBox.append(h('p', { class: 'hint' }, 'Antworten per E-Mail-Weiterleitung folgen in einer späteren Version. Bis dahin: Wenn der Interessent Ihnen seine Kontaktdaten genannt hat, antworten Sie ihm direkt.'))
  }).catch((e) => { clear(inboxBox); inboxBox.append(h('p', { class: 'err' }, errMsg(e))) })

  void api.saved().then((s) => {
    clear(savedBox); savedBox.append(h('h2', null, 'Meine Merkliste'))
    savedBox.append(s.length ? h('div', { class: 'grid' }, s.map((l) => listingCard(l))) : h('p', { class: 'empty' }, 'Noch nichts gemerkt.'))
  }).catch((e) => { clear(savedBox); savedBox.append(h('p', { class: 'err' }, errMsg(e))) })

  void api.moderationLog().then((entries) => {
    if (!entries.length) return
    logBox.append(h('h2', null, 'Entscheidungen zu Ihren Inseraten'),
      ...entries.map((e) => h('article', { class: 'msg' }, h('p', { class: 'meta' }, fmtDate(e.createdAt), ' · ', e.action === 'sperren' ? 'Inserat gesperrt' : e.action === 'zurueckweisen' ? 'Zur Überarbeitung zurückgegeben' : 'Freigegeben'), h('p', null, e.reasonText || '–'))),
      h('p', { class: 'hint' }, 'Sie sind mit einer Entscheidung nicht einverstanden? Antworten Sie uns einfach per E-Mail an die Kontaktadresse im Impressum.'))
  }).catch(() => {})

  return root
}
