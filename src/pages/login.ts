import { api } from '../api'
import { add, h, clear } from '../dom'
import { navigate, type Route } from '../router'
import { errMsg, field, setTitle } from '../ui'

export async function renderLogin(r: Route): Promise<HTMLElement> {
  setTitle('Anmelden')
  const weiter = r.query.get('weiter')
  const target = weiter && weiter.startsWith('/') && !weiter.startsWith('//') ? weiter : '/konto'
  const email = h('input', { type: 'email', autocomplete: 'email', required: true, placeholder: 'ihre@adresse.de', inputmode: 'email' }) as HTMLInputElement
  const btn = h('button', { class: 'btn btn-primary btn-lg', type: 'submit' }, 'Weiter')
  const msg = h('div', { 'aria-live': 'polite' })
  const box = h('div', { class: 'wrap section narrow' })

  const form = h('form', { onSubmit: async (e: Event) => {
    e.preventDefault()
    btn.setAttribute('disabled', '')
    clear(msg)
    try {
      const res = await api.signIn(email.value)
      if (!res.sent) { navigate(target, true); return }
      clear(box)
      box.append(h('h1', null, 'Schauen Sie in Ihr Postfach'),
        h('p', { class: 'lead' }, `Wir haben einen Anmelde-Link an ${email.value.trim()} geschickt. Er gilt kurz und nur einmal.`),
        h('p', null, 'Keine E-Mail da? Schauen Sie im Spam-Ordner nach oder versuchen Sie es in einer Minute erneut.'))
    } catch (er) { msg.append(h('p', { class: 'err', role: 'alert' }, errMsg(er))); btn.removeAttribute('disabled') }
  } },
  field('E-Mail-Adresse', email, { required: true, hint: 'Ohne Passwort: Wir schicken Ihnen einen Link zum Anmelden. Ein Konto wird automatisch angelegt.' }),
  btn, msg)

  add(box, h('h1', null, 'Anmelden oder registrieren'),
    api.mode === 'demo' ? h('div', { class: 'notice' }, h('strong', null, 'Demo-Modus: '), 'Jede E-Mail-Adresse funktioniert, es wird nichts verschickt. Mit „admin@beispiel.de“ sehen Sie den Moderationsbereich.') : null,
    form,
    h('p', { class: 'hint' }, 'Mit der Anmeldung stimmen Sie unseren ', h('a', { href: '/nutzungsbedingungen' }, 'Nutzungsbedingungen'), ' zu. Informationen zum Datenschutz finden Sie in der ', h('a', { href: '/datenschutz' }, 'Datenschutzerklärung'), '.'))
  return box
}
