import { api } from '../api'
import { h, clear } from '../dom'
import { fmtDate, fmtEur, TYPE_LABEL } from '../format'
import { navigate, type Route } from '../router'
import type { ContactMessage, Listing, ModerationAction, Report } from '../types'
import { TOPICS } from './kontakt'
import { errMsg, field, openModal, session, setTitle, spinner, toast } from '../ui'

const REASON_CODES: [string, string][] = [
  ['betrug', 'Betrug / Vorkasse'], ['falsche_angaben', 'Falsche Angaben'], ['urheberrecht', 'Urheberrecht'],
  ['makler', 'Makler / gewerblich'], ['unzulaessig', 'Unzulässiger Inhalt'], ['sonstiges', 'Sonstiges'],
]

export async function renderAdmin(r: Route): Promise<HTMLElement> {
  setTitle('Moderation')
  const u = session.user
  if (!u) { navigate(`/anmelden?weiter=${encodeURIComponent(r.path)}`, true); return h('div') }
  if (!u.isAdmin) return h('div', { class: 'wrap section' }, h('h1', null, 'Kein Zugriff'), h('p', null, 'Dieser Bereich ist nur für Moderatoren.'))

  const root = h('div', { class: 'wrap section' }, h('h1', null, 'Moderation'), spinner())

  async function load(): Promise<void> {
    try {
      const { pending, reports, contacts } = await api.adminQueue()
      clear(root)
      root.append(h('h1', null, 'Moderation'),
        h('section', null, h('h2', null, `Zur Prüfung (${pending.length})`), pending.length ? pending.map(pendingRow) : h('p', { class: 'empty' }, 'Nichts zu prüfen. 🎉')),
        h('section', null, h('h2', null, `Offene Meldungen (${reports.length})`), reports.length ? reports.map(reportRow) : h('p', { class: 'empty' }, 'Keine offenen Meldungen.')),
        h('section', null, h('h2', null, `Kontaktnachrichten (${contacts.length})`), contacts.length ? contacts.map(contactRow) : h('p', { class: 'empty' }, 'Keine offenen Nachrichten.')),
        h('p', { class: 'hint' }, 'Ziel: Meldungen innerhalb von 24 Stunden entscheiden. Jede Sperre braucht eine Begründung – die sieht der Inserent in seinem Konto (DSA Art. 17).'))
    } catch (e) { clear(root); root.append(h('p', { class: 'err' }, errMsg(e))) }
  }

  function decide(l: Pick<Listing, 'id' | 'title'>, action: ModerationAction, reportId?: string): void {
    const code = h('select', null, REASON_CODES.map(([v, t]) => h('option', { value: v }, t))) as HTMLSelectElement
    const text = h('textarea', { rows: 5, maxlength: 2000, placeholder: 'Begründung in verständlichen Worten – der Inserent liest sie.' }) as HTMLTextAreaElement
    const ok = h('button', { class: 'btn btn-primary', type: 'submit' }, action === 'freigeben' ? 'Freigeben' : action === 'sperren' ? 'Sperren' : 'Zurückgeben')
    let modal: { close: () => void }
    const form = h('form', { onSubmit: async (e: Event) => {
      e.preventDefault(); ok.setAttribute('disabled', '')
      try {
        await api.moderate({ listingId: l.id, action, reasonCode: action === 'freigeben' ? 'freigabe' : code.value, reasonText: text.value, reportId })
        toast('Erledigt.'); modal.close(); await load()
      } catch (er) { toast(errMsg(er), 'fehler'); ok.removeAttribute('disabled') }
    } },
    h('p', null, l.title),
    action !== 'freigeben' ? field('Grund', code) : null,
    field(action === 'freigeben' ? 'Notiz (optional)' : 'Begründung', text, { required: action !== 'freigeben', hint: action !== 'freigeben' ? 'Mindestens 10 Zeichen.' : undefined }),
    h('div', { class: 'row-actions' }, ok))
    modal = openModal(action === 'freigeben' ? 'Inserat freigeben' : action === 'sperren' ? 'Inserat sperren' : 'Zur Überarbeitung zurückgeben', form)
  }

  function pendingRow(l: Listing): HTMLElement {
    return h('article', { class: 'my-row' },
      h('div', { class: 'my-img' }, l.photos[0] ? h('img', { src: l.photos[0].url, alt: '', width: 120, height: 80 }) : null),
      h('div', { class: 'my-main' },
        h('h3', null, h('a', { href: `/inserat/${l.id}`, target: '_blank' }, l.title)),
        h('p', { class: 'meta' }, `${TYPE_LABEL[l.type]} · ${fmtEur(l.priceEur)} · ${l.postalCode} ${l.city} · ${l.photos.length} Fotos · eingereicht ${fmtDate(l.createdAt)}`),
        h('p', null, l.description.slice(0, 220) + (l.description.length > 220 ? ' …' : ''))),
      h('div', { class: 'my-actions' },
        h('button', { class: 'btn btn-primary', type: 'button', onClick: () => decide(l, 'freigeben') }, 'Freigeben'),
        h('button', { class: 'btn btn-secondary', type: 'button', onClick: () => decide(l, 'zurueckweisen') }, 'Zurückgeben'),
        h('button', { class: 'btn btn-ghost', type: 'button', onClick: () => decide(l, 'sperren') }, 'Sperren')))
  }

  function reportRow(x: Report): HTMLElement {
    return h('article', { class: 'my-row' },
      h('div', { class: 'my-main' },
        h('h3', null, h('a', { href: `/inserat/${x.listingId}`, target: '_blank' }, x.listingTitle || x.listingId)),
        h('p', { class: 'meta' }, `${REASON_CODES.find(([v]) => v === x.reason)?.[1] ?? x.reason} · ${fmtDate(x.createdAt)}${x.reporterEmail ? ` · ${x.reporterEmail}` : ''}`),
        h('p', null, x.details)),
      h('div', { class: 'my-actions' },
        h('button', { class: 'btn btn-secondary', type: 'button', onClick: () => decide({ id: x.listingId, title: x.listingTitle }, 'sperren', x.id) }, 'Inserat sperren'),
        h('button', { class: 'btn btn-ghost', type: 'button', onClick: () => decide({ id: x.listingId, title: x.listingTitle }, 'freigeben', x.id) }, 'Unbegründet – abweisen')))
  }

  function contactRow(x: ContactMessage): HTMLElement {
    return h('article', { class: 'my-row' },
      h('div', { class: 'my-main' },
        h('h3', null, `${x.name} – ${TOPICS.find(([v]) => v === x.topic)?.[1] ?? x.topic}`),
        h('p', { class: 'meta' }, h('a', { href: `mailto:${x.email}` }, x.email), ` · ${fmtDate(x.createdAt)}`),
        h('p', { class: 'pre' }, x.body)),
      h('div', { class: 'my-actions' },
        h('button', { class: 'btn btn-secondary', type: 'button', onClick: async () => {
          try { await api.closeContact(x.id); toast('Als erledigt markiert.'); await load() } catch (er) { toast(errMsg(er), 'fehler') }
        } }, 'Erledigt')))
  }

  void load()
  return root
}
