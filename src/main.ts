import '@fontsource-variable/inter'
import '@fontsource-variable/fraunces'
import './style.css'
import { api } from './api'
import { add, clear, h, svg } from './dom'
import { installLinkHandler, resolve, route, setNotFound } from './router'
import { session } from './ui'
import { renderAccount } from './pages/account'
import { renderAdmin } from './pages/admin'
import { renderHome } from './pages/home'
import { renderKontakt } from './pages/kontakt'
import { renderA11y, renderAbout, renderImprint, renderMod, renderNotFound, renderPrivacy, renderSafety, renderTerms, renderTransparency } from './pages/info'
import { renderListing } from './pages/listing'
import { renderLogin } from './pages/login'
import { renderSearch } from './pages/search'
import { renderSell } from './pages/sell'
import type { Route } from './router'

const app = document.getElementById('app')!
const header = h('header', { class: 'site-header' })
const main = h('main', { id: 'main', tabindex: '-1' })
const footer = h('footer', { class: 'site-footer' })

function drawHeader(): void {
  clear(header)
  const u = session.user
  add(header,
    h('a', { class: 'skip', href: '#main' }, 'Zum Inhalt springen'),
    h('div', { class: 'free-strip' }, h('span', { 'aria-hidden': 'true' }, '✔ '), '100 % kostenlos · keine Provision · nur von privat'),
    api.mode === 'demo' ? h('div', { class: 'demo-strip', role: 'note' }, 'Demo-Modus: Beispieldaten, nichts wird gespeichert oder verschickt.') : null,
    h('div', { class: 'wrap bar' },
      h('a', { class: 'logo', href: '/', 'aria-label': 'FreiHaus – zur Startseite' }, svg(LOGO), h('span', { class: 'logo-t' }, 'Frei', h('span', null, 'Haus'))),
      h('nav', { class: 'nav', 'aria-label': 'Hauptmenü' },
        h('a', { href: '/suche' }, 'Kaufen'),
        h('a', { href: '/suche?angebot=miete' }, 'Mieten'),
        h('a', { href: '/verkaufen' }, 'Inserieren'),
        h('a', { href: '/sicherheit' }, 'Sicherheit'),
        u?.isAdmin ? h('a', { href: '/admin' }, 'Moderation') : null,
        u ? h('a', { class: 'nav-user', href: '/konto' }, 'Mein Konto') : h('a', { class: 'btn btn-secondary nav-login', href: '/anmelden' }, 'Anmelden'))))
}

/** Logo-Symbol: feste Grafik, keine Nutzerdaten. */
const LOGO = '<svg viewBox="0 0 32 32" width="30" height="30"><path d="M3 15 16 4l13 11" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 13v14h18V13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M13 27v-8h6v8z" fill="#F2A33A" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>'

function drawFooter(): void {
  clear(footer)
  footer.append(h('div', { class: 'wrap foot' },
    h('div', null, h('strong', null, 'FreiHaus'), h('p', null, 'Häuser und Wohnungen direkt vom Eigentümer. Kostenlos, ohne Provision.')),
    h('nav', { 'aria-label': 'Informationen' },
      h('a', { href: '/ueber' }, 'Über uns'), h('a', { href: '/transparenz' }, 'Wer finanziert uns?'), h('a', { href: '/sicherheit' }, 'Betrug erkennen'), h('a', { href: '/moderation' }, 'So moderieren wir'), h('a', { href: '/kontakt' }, 'Kontakt')),
    h('nav', { 'aria-label': 'Rechtliches' },
      h('a', { href: '/impressum' }, 'Impressum'), h('a', { href: '/datenschutz' }, 'Datenschutz'), h('a', { href: '/nutzungsbedingungen' }, 'Nutzungsbedingungen'), h('a', { href: '/barrierefreiheit' }, 'Barrierefreiheit'))))
}

type Page = (r: Route) => Promise<HTMLElement>
function mount(page: Page) {
  return async (r: Route): Promise<void> => {
    try {
      const el = await page(r)
      clear(main)
      main.append(el)
    } catch (e) {
      clear(main)
      main.append(h('div', { class: 'wrap section' }, h('h1', null, 'Das hat leider nicht geklappt'), h('p', { class: 'err' }, e instanceof Error ? e.message : String(e)), h('p', null, h('a', { href: '/' }, '← Zur Startseite'))))
    }
    window.scrollTo({ top: 0 })
    main.focus({ preventScroll: true })
  }
}

async function start(): Promise<void> {
  session.user = await api.getUser().catch(() => null)
  api.onAuthChange((u) => { session.user = u; drawHeader() })

  // Die Demo mit Beispieldaten soll nicht in Suchmaschinen auftauchen.
  if (api.mode === 'demo') document.head.append(h('meta', { name: 'robots', content: 'noindex, nofollow' }))
  app.append(header, main, footer)
  drawHeader(); drawFooter(); installLinkHandler()

  route('/', mount(renderHome))
  route('/suche', mount(renderSearch))
  route('/inserat/:id', mount(renderListing))
  route('/verkaufen', mount(renderSell))
  route('/verkaufen/:id', mount(renderSell))
  route('/konto', mount(renderAccount))
  route('/admin', mount(renderAdmin))
  route('/anmelden', mount(renderLogin))
  route('/sicherheit', mount(renderSafety))
  route('/transparenz', mount(renderTransparency))
  route('/ueber', mount(renderAbout))
  route('/moderation', mount(renderMod))
  route('/nutzungsbedingungen', mount(renderTerms))
  route('/datenschutz', mount(renderPrivacy))
  route('/kontakt', mount(renderKontakt))
  route('/impressum', mount(renderImprint))
  route('/barrierefreiheit', mount(renderA11y))
  setNotFound(mount(renderNotFound))

  // Nach der Anmeldung per E-Mail-Link kommt man auf /konto zurück.
  await resolve()
}

void start()
