// Winziger DOM-Helfer. Alles läuft über textContent/Attribute – nutzergenerierte Inhalte
// werden NIE als HTML eingefügt (Schutz vor Skript-Einschleusung).
import { withBase } from './router'

type Child =Node | string | number | null | undefined | false
type Attrs = Record<string, unknown> | null

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Attrs,
  ...children: (Child | Child[])[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v == null || v === false) continue
    if (k === 'class') el.className = String(v)
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener)
    else if (k === 'value') (el as unknown as HTMLInputElement).value = String(v)
    else if (k === 'checked') (el as unknown as HTMLInputElement).checked = !!v
    else if (k === 'selected') (el as unknown as HTMLOptionElement).selected = !!v
    else if (k === 'href' && typeof v === 'string') el.setAttribute(k, withBase(v))
    else if (v === true) el.setAttribute(k, '')
    else el.setAttribute(k, String(v))
  }
  append(el, children)
  return el
}

/** Wie Element.append, aber null/false werden übersprungen. */
export function add(el: Node, ...children: (Child | Child[])[]): void { append(el, children) }

function append(el: Node, children: (Child | Child[])[]): void {
  for (const c of children) {
    if (Array.isArray(c)) append(el, c)
    else if (c === null || c === undefined || c === false) continue
    else el.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)))
  }
}

/** Nur für feste, selbst geschriebene SVG-Symbole – nie für Nutzereingaben. */
export function svg(markup: string): HTMLElement {
  const t = document.createElement('span')
  t.className = 'icon'
  t.setAttribute('aria-hidden', 'true')
  t.innerHTML = markup
  return t
}

export function clear(el: Element): void {
  while (el.firstChild) el.removeChild(el.firstChild)
}

export function qs<T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T {
  const el = root.querySelector<T>(sel)
  if (!el) throw new Error(`Element nicht gefunden: ${sel}`)
  return el
}
