import { api } from '../api'
import { h, clear } from '../dom'
import { fmtNum } from '../format'
import { navigate, type Route } from '../router'
import type { PropertyType, SearchFilter } from '../types'
import { errMsg, listingCard, setTitle, spinner } from '../ui'

function readFilter(q: URLSearchParams): SearchFilter {
  const num = (k: string) => { const v = Number(q.get(k)); return Number.isFinite(v) && v > 0 ? v : undefined }
  const sort = q.get('sort')
  return {
    q: q.get('q') ?? '', type: (['haus', 'wohnung', 'grundstueck'].includes(q.get('type') ?? '') ? q.get('type') : '') as PropertyType | '',
    priceMax: num('preis'), areaMin: num('flaeche'), roomsMin: num('zimmer'),
    sort: sort === 'preis_auf' || sort === 'preis_ab' ? sort : 'neu',
  }
}

export async function renderSearch(r: Route): Promise<HTMLElement> {
  const f = readFilter(r.query)
  setTitle(f.q ? `Immobilien in ${f.q}` : 'Immobilien kaufen', 'Häuser, Wohnungen und Grundstücke direkt vom Eigentümer – ohne Provision.')

  const input = (name: string, label: string, type: string, value: string, extra: Record<string, unknown> = {}) =>
    h('label', { class: 'f' }, h('span', null, label), h('input', { name, type, value, ...extra }))
  const select = (name: string, label: string, opts: [string, string][], value: string) =>
    h('label', { class: 'f' }, h('span', null, label),
      h('select', { name }, opts.map(([v, t]) => h('option', { value: v, selected: v === value }, t))))

  const form = h('form', { class: 'filters', role: 'search', 'aria-label': 'Suche eingrenzen', onSubmit: (e: Event) => { e.preventDefault(); apply() } },
    input('q', 'Ort oder PLZ', 'search', f.q ?? '', { placeholder: 'z. B. Leipzig oder 04155', autocomplete: 'off' }),
    select('type', 'Art', [['', 'Alle'], ['haus', 'Haus'], ['wohnung', 'Wohnung'], ['grundstueck', 'Grundstück']], f.type ?? ''),
    input('preis', 'Preis bis (€)', 'number', f.priceMax ? String(f.priceMax) : '', { min: 0, step: 10000, inputmode: 'numeric' }),
    input('flaeche', 'Fläche ab (m²)', 'number', f.areaMin ? String(f.areaMin) : '', { min: 0, inputmode: 'numeric' }),
    input('zimmer', 'Zimmer ab', 'number', f.roomsMin ? String(f.roomsMin) : '', { min: 0, step: 0.5, inputmode: 'decimal' }),
    select('sort', 'Sortierung', [['neu', 'Neueste zuerst'], ['preis_auf', 'Preis aufsteigend'], ['preis_ab', 'Preis absteigend']], f.sort ?? 'neu'),
    h('button', { class: 'btn btn-primary', type: 'submit' }, 'Anzeigen'))

  function apply(): void {
    const d = new FormData(form)
    const p = new URLSearchParams()
    for (const k of ['q', 'type', 'preis', 'flaeche', 'zimmer', 'sort']) { const v = String(d.get(k) ?? '').trim(); if (v && !(k === 'sort' && v === 'neu')) p.set(k, v) }
    navigate(`/suche${p.toString() ? `?${p}` : ''}`)
  }

  const results = h('div', { 'aria-live': 'polite' }, spinner())
  void (async () => {
    try {
      const list = await api.search(f)
      clear(results)
      results.append(
        h('p', { class: 'count' }, `${fmtNum(list.length)} ${list.length === 1 ? 'Inserat' : 'Inserate'}${f.q ? ` für „${f.q}“` : ''}`),
        list.length
          ? h('div', { class: 'grid' }, list.map(listingCard))
          : h('div', { class: 'empty' },
            h('p', null, h('strong', null, 'Keine Treffer.'), ' Versuchen Sie es mit weniger Filtern oder einem größeren Umkreis (nur die ersten Ziffern der Postleitzahl).'),
            h('p', null, 'Bald können Sie hier einen Suchauftrag anlegen und per E-Mail benachrichtigt werden, sobald etwas Passendes erscheint.')))
    } catch (e) { clear(results); results.append(h('p', { class: 'err' }, errMsg(e))) }
  })()

  return h('div', { class: 'wrap section' }, h('h1', null, 'Immobilien kaufen'), form, results)
}
