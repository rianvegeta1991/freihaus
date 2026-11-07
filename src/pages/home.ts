import { api } from '../api'
import { h } from '../dom'
import { navigate, type Route } from '../router'
import { listingCard, setTitle } from '../ui'

export async function renderHome(_r: Route): Promise<HTMLElement> {
  setTitle('', 'FreiHaus: Häuser und Wohnungen direkt vom Eigentümer kaufen und verkaufen. Kostenlos, ohne Provision, nur von privat.')
  const [latest, stats] = await Promise.all([api.search({ sort: 'neu' }), api.stats()])

  const q = h('input', { type: 'search', name: 'q', placeholder: 'Ort oder Postleitzahl', 'aria-label': 'Ort oder Postleitzahl', autocomplete: 'off', enterkeyhint: 'search' })
  const form = h('form', { class: 'hero-search', role: 'search', onSubmit: (e: Event) => { e.preventDefault(); navigate(`/suche?q=${encodeURIComponent(q.value.trim())}`) } },
    q, h('button', { class: 'btn btn-primary', type: 'submit' }, 'Suchen'))

  return h('div', null,
    h('section', { class: 'hero' },
      h('div', { class: 'wrap' },
        h('h1', null, 'Häuser und Wohnungen direkt vom Eigentümer'),
        h('p', { class: 'lead' }, 'Kostenlos inserieren, kostenlos suchen. Kein Makler, keine Provision, keine versteckten Gebühren.'),
        form,
        h('p', { class: 'hero-sell' }, 'Sie möchten verkaufen? ', h('a', { href: '/verkaufen' }, 'Jetzt kostenlos inserieren →')))),

    h('section', { class: 'wrap section' },
      h('div', { class: 'section-head' }, h('h2', null, 'Neu inseriert'), h('a', { href: '/suche' }, 'Alle ansehen →')),
      latest.length
        ? h('div', { class: 'grid' }, latest.slice(0, 6).map(listingCard))
        : h('p', { class: 'empty' }, 'Noch keine Inserate. Seien Sie die oder der Erste – ', h('a', { href: '/verkaufen' }, 'jetzt inserieren'), '.')),

    h('section', { class: 'band' },
      h('div', { class: 'wrap' },
        h('h2', null, 'So einfach geht das'),
        h('ol', { class: 'steps' },
          h('li', null, h('strong', null, 'Inserat anlegen'), h('span', null, 'In etwa 10 Minuten: Angaben, Energieausweis, mindestens 3 Fotos. Wir führen Sie Schritt für Schritt.')),
          h('li', null, h('strong', null, 'Kurze Prüfung'), h('span', null, 'Neue Inserate schauen wir uns von Hand an, damit Betrüger draußen bleiben.')),
          h('li', null, h('strong', null, 'Direkt in Kontakt'), h('span', null, 'Interessenten schreiben Ihnen. Besichtigung, Preis und Vertrag klären Sie selbst – den Kaufvertrag beurkundet der Notar.'))))),

    h('section', { class: 'wrap section' },
      h('h2', null, 'Warum FreiHaus?'),
      h('div', { class: 'trust' },
        trust('✔', 'Wirklich kostenlos', 'Keine Provision, keine Gebühr fürs Inserieren oder Suchen. Wer uns unterstützen möchte, kann das freiwillig tun – nie zur Bedingung.'),
        trust('⌂', 'Nur von privat', 'Keine Makler-Inserate. Sie sprechen mit den Menschen, denen das Haus gehört.'),
        trust('⚑', 'Sicherheit zuerst', 'Geprüfte Erst-Inserate, Melde-Knopf an jedem Inserat und klare Warnhinweise vor Betrug.'),
        trust('☰', 'Vollständige Angaben', 'Energieausweis-Pflichtangaben sind bei jedem Inserat dabei. So wissen Sie, worauf Sie sich einlassen.')),
      h('p', { class: 'counter' }, stats.published ? `Aktuell ${stats.published} ${stats.published === 1 ? 'Inserat' : 'Inserate'} online.` : '')),

    h('section', { class: 'band band-warn' },
      h('div', { class: 'wrap' },
        h('h2', null, 'Wichtig beim Immobilienkauf'),
        h('p', null, 'Ein Kaufvertrag über eine Immobilie muss immer notariell beurkundet werden. ', h('strong', null, 'Überweisen Sie niemals Geld an Privatpersonen, bevor der Notartermin stattgefunden hat'), ' – auch nicht als „Reservierung“ oder „Kaution“. '),
        h('p', null, h('a', { href: '/sicherheit' }, 'Betrug erkennen: unsere Sicherheitstipps →')))))
}

function trust(icon: string, title: string, text: string): HTMLElement {
  return h('div', { class: 'trust-item' }, h('div', { class: 'trust-icon', 'aria-hidden': 'true' }, icon), h('h3', null, title), h('p', null, text))
}
