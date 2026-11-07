export interface Route {
  params: Record<string, string>
  query: URLSearchParams
  path: string
}

/** Unterpfad, unter dem die Seite liegt (z. B. "/freihaus" auf GitHub Pages, sonst leer). */
export const BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
/** Interne Adresse ("/suche") in die echte Adresse (inkl. Unterpfad) verwandeln. */
export const withBase = (p: string): string => (p.startsWith('/') && !p.startsWith('//') ? BASE + p : p)
const stripBase = (p: string): string => (BASE && (p === BASE || p.startsWith(BASE + '/')) ? p.slice(BASE.length) || '/' : p)

type Handler =(r: Route) => void | Promise<void>
const routes: { pattern: RegExp; keys: string[]; handler: Handler }[] = []
let notFound: Handler = () => {}

export function route(pattern: string, handler: Handler): void {
  const keys: string[] = []
  const re = pattern.replace(/:([a-z]+)/g, (_m, k: string) => { keys.push(k); return '([^/]+)' })
  routes.push({ pattern: new RegExp(`^${re}/?$`), keys, handler })
}
export function setNotFound(h: Handler): void { notFound = h }

export async function resolve(): Promise<void> {
  const path = stripBase(window.location.pathname)
  const query = new URLSearchParams(window.location.search)
  for (const r of routes) {
    const m = r.pattern.exec(path)
    if (m) {
      const params: Record<string, string> = {}
      r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]) })
      await r.handler({ params, query, path })
      return
    }
  }
  await notFound({ params: {}, query, path })
}

export function navigate(to: string, replace = false): void {
  if (replace) window.history.replaceState({}, '', withBase(to))
  else window.history.pushState({}, '', withBase(to))
  void resolve()
}

/** Interne Links ohne Seiten-Neuladen. */
export function installLinkHandler(): void {
  document.addEventListener('click', (ev) => {
    if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return
    const a = (ev.target as Element).closest('a')
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return
    const href = a.getAttribute('href')
    if (!href || !href.startsWith('/') || href.startsWith('//')) return
    if (BASE && !(href === BASE || href.startsWith(BASE + '/'))) return
    ev.preventDefault()
    navigate(stripBase(href))
  })
  window.addEventListener('popstate', () => { void resolve() })
}
