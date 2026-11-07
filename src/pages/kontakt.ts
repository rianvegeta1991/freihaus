import { api } from '../api'
import { add, clear, h } from '../dom'
import type { Route } from '../router'
import type { ContactTopic } from '../types'
import { errMsg, field, session, setTitle } from '../ui'

export const TOPICS: [ContactTopic, string][] = [
  ['frage', 'Allgemeine Frage'],
  ['hinweis', 'Hinweis auf ein Problem'],
  ['datenschutz', 'Datenschutz / Auskunft / Löschung'],
  ['sonstiges', 'Sonstiges'],
]

/** Kontaktformular: zweiter Kontaktweg neben der E-Mail. Meldungen zu einem Inserat gehören zum „Melden“-Knopf am Inserat. */
export async function renderKontakt(r: Route): Promise<HTMLElement> {
  setTitle('Kontakt')
  const topicParam = r.query.get('thema')
  const name = h('input', { type: 'text', autocomplete: 'name', required: true, maxlength: 100, value: session.user?.displayName ?? '' }) as HTMLInputElement
  const email = h('input', { type: 'email', autocomplete: 'email', required: true, maxlength: 200, inputmode: 'email', value: session.user?.email ?? '' }) as HTMLInputElement
  const topic = h('select', null, TOPICS.map(([v, t]) => h('option', { value: v, selected: v === topicParam }, t))) as HTMLSelectElement
  const body = h('textarea', { rows: 7, required: true, minlength: 10, maxlength: 3000 }) as HTMLTextAreaElement
  // Falle für automatische Ausfüller: für Menschen unsichtbar und nicht erreichbar, Bots füllen sie aus.
  const falle = h('input', { type: 'text', name: 'website', tabindex: -1, autocomplete: 'off' }) as HTMLInputElement
  const falleBox = h('div', { class: 'falle', 'aria-hidden': 'true' }, h('label', null, 'Website nicht ausfüllen', falle))
  const geoeffnet = Date.now()
  const btn = h('button', { class: 'btn btn-primary btn-lg', type: 'submit' }, 'Nachricht senden')
  const msg = h('div', { 'aria-live': 'polite' })
  const box = h('div', { class: 'wrap section narrow' })

  const danke = (): void => {
    clear(box)
    add(box, h('h1', null, 'Danke, Ihre Nachricht ist angekommen'),
      h('p', { class: 'lead' }, 'Wir antworten per E-Mail an die angegebene Adresse – in der Regel innerhalb weniger Tage.'),
      h('p', null, h('a', { href: '/' }, '← Zur Startseite')))
  }

  const form = h('form', { onSubmit: async (e: Event) => {
    e.preventDefault()
    clear(msg)
    // Bot-Verdacht (Falle gefüllt oder in unter 3 Sekunden abgeschickt): so tun, als sei es angekommen.
    if (falle.value || Date.now() - geoeffnet < 3000) { danke(); return }
    btn.setAttribute('disabled', '')
    try {
      await api.sendContact({ name: name.value, email: email.value, topic: topic.value as ContactTopic, body: body.value })
      danke()
    } catch (er) { msg.append(h('p', { class: 'err', role: 'alert' }, h('span', { 'aria-hidden': 'true' }, '⚠ '), errMsg(er))); btn.removeAttribute('disabled') }
  } },
  field('Ihr Name', name, { required: true }),
  field('Ihre E-Mail-Adresse', email, { required: true, hint: 'Nur für die Antwort an Sie.' }),
  field('Worum geht es?', topic),
  field('Ihre Nachricht', body, { required: true, hint: 'Mindestens 10 Zeichen. Bitte keine Passwörter oder Bankdaten schreiben.' }),
  falleBox, btn, msg)

  add(box, h('h1', null, 'Kontakt'),
    h('p', { class: 'lead' }, 'Fragen, Hinweise oder Anliegen zum Datenschutz? Schreiben Sie uns.'),
    api.mode === 'demo' ? h('div', { class: 'notice' }, h('strong', null, 'Demo-Modus: '), 'Nachrichten werden nicht verschickt. In der echten Version landen sie in der Moderation.') : null,
    form,
    h('p', { class: 'hint' }, 'Ein bestimmtes Inserat melden? Nutzen Sie dort bitte den Knopf „Inserat melden“ – das geht schneller. Ihre Angaben verwenden wir nur, um Ihnen zu antworten (siehe ', h('a', { href: '/datenschutz' }, 'Datenschutzerklärung'), ').'))
  return box
}
