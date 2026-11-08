import { api } from '../api'
import { h, clear } from '../dom'
import { compressImage } from '../image'
import { navigate, withBase, type Route } from '../router'
import type { ListingInput, Photo } from '../types'
import { emptyInput, ENERGY_CLASSES, energyHint, hasErrors, MAX_PHOTOS, MIN_PHOTOS, validateListing, type Errors } from '../validation'
import { errMsg, field, session, setTitle, spinner, toast } from '../ui'

const STEPS = ['Objekt', 'Lage & Daten', 'Energieausweis', 'Fotos', 'Kontakt', 'Prüfen']
const STEP_KEYS: (keyof Errors)[][] = [
  ['offer', 'type', 'title', 'description'],
  ['postalCode', 'city', 'priceEur', 'serviceCostsEur', 'depositEur', 'availableFrom', 'livingAreaM2', 'rooms'],
  ['energyState', 'energyKind', 'energyValue', 'energyCarrier', 'energyClass', 'yearBuilt'],
  ['photos'],
  ['contactMode', 'contactEmail', 'contactPhone'],
  [],
]

export async function renderSell(r: Route): Promise<HTMLElement> {
  setTitle('Kostenlos inserieren', 'Inserieren Sie Ihr Haus oder Ihre Wohnung kostenlos und ohne Provision.')
  const editId = r.params.id
  const user = session.user
  if (!user) {
    return h('div', { class: 'wrap section narrow' },
      h('h1', null, 'Kostenlos inserieren'),
      h('p', { class: 'lead' }, 'Ihr Inserat ist komplett kostenlos – ohne Provision, ohne Gebühr. Dafür melden wir Sie kurz an: Das schützt alle vor Betrug und Spam.'),
      h('ul', { class: 'ticks' }, h('li', null, 'Dauer: etwa 10 Minuten'), h('li', null, 'Sie brauchen: Angaben zum Objekt, mindestens 3 Fotos, wenn vorhanden den Energieausweis'), h('li', null, 'Neue Inserate werden vor der Veröffentlichung kurz von uns geprüft')),
      h('a', { class: 'btn btn-primary btn-lg', href: `/anmelden?weiter=${encodeURIComponent(r.path)}` }, 'Anmelden und loslegen'))
  }

  const root = h('div', { class: 'wrap section narrow' }, spinner())
  let input = emptyInput()
  let id: string | undefined = editId
  let photos: Photo[] = []
  let step = 0
  let errs: Errors = {}
  let rights = { privat: false, fotos: false, regeln: false }

  if (editId) {
    const [inp, l] = await Promise.all([api.getInput(editId), api.get(editId)])
    if (!inp || !l) return h('div', { class: 'wrap section' }, h('h1', null, 'Inserat nicht gefunden'), h('a', { href: '/konto' }, '← Zum Konto'))
    if (!['draft', 'paused', 'expired', 'pending'].includes(l.status)) return h('div', { class: 'wrap section' }, h('h1', null, 'Dieses Inserat lässt sich nicht mehr bearbeiten'), h('a', { href: '/konto' }, '← Zum Konto'))
    input = inp; photos = l.photos
  } else {
    input.contactEmail = user.email
    input.contactPhone = user.phone
  }

  // ---------- Eingabe-Helfer: schreiben direkt in `input`
  const txt = <K extends keyof ListingInput>(key: K, label: string, o: { type?: string; hint?: string; required?: boolean; rows?: number; max?: number; ph?: string; auto?: string } = {}) => {
    const el = (o.rows
      ? h('textarea', { rows: o.rows, maxlength: o.max, placeholder: o.ph })
      : h('input', { type: o.type ?? 'text', maxlength: o.max, placeholder: o.ph, autocomplete: o.auto ?? 'off' })) as HTMLInputElement
    el.value = String(input[key] ?? '')
    el.addEventListener('input', () => { (input as unknown as Record<string, unknown>)[key] = el.value })
    return field(label, el, { error: errs[key as keyof Errors], hint: o.hint, required: o.required })
  }
  const numF = <K extends keyof ListingInput>(key: K, label: string, o: { hint?: string; required?: boolean; step?: number; unit?: string } = {}) => {
    const el = h('input', { type: 'number', inputmode: 'decimal', min: 0, step: o.step ?? 1 }) as HTMLInputElement
    el.value = input[key] == null ? '' : String(input[key])
    el.addEventListener('input', () => { (input as unknown as Record<string, unknown>)[key] = el.value === '' ? null : Number(el.value) })
    return field(o.unit ? `${label} (${o.unit})` : label, el, { error: errs[key as keyof Errors], hint: o.hint, required: o.required })
  }
  const sel = <K extends keyof ListingInput>(key: K, label: string, opts: [string, string][], o: { hint?: string; required?: boolean; onChange?: () => void } = {}) => {
    const el = h('select', null, opts.map(([v, t]) => h('option', { value: v, selected: String(input[key]) === v }, t))) as HTMLSelectElement
    el.addEventListener('change', () => { (input as unknown as Record<string, unknown>)[key] = el.value; o.onChange?.() })
    return field(label, el, { error: errs[key as keyof Errors], hint: o.hint, required: o.required })
  }

  // ---------- Schritte
  function stepObject(): HTMLElement[] {
    const miete = input.offer === 'miete'
    const types: [string, string][] = [['haus', 'Haus'], ['wohnung', 'Wohnung']]
    if (!miete) types.push(['grundstueck', 'Grundstück'])
    return [
      h('p', { class: 'step-intro' }, 'Beschreiben Sie Ihr Objekt so, wie Sie es einem Bekannten beschreiben würden – ehrlich und konkret.'),
      sel('offer', 'Was möchten Sie tun?', [['kauf', 'Verkaufen'], ['miete', 'Vermieten']], {
        required: true,
        onChange: () => { if (input.offer === 'miete' && input.type === 'grundstueck') input.type = 'wohnung'; errs = {}; draw() },
      }),
      sel('type', 'Art der Immobilie', types, { required: true }),
      txt('title', 'Überschrift', { required: true, max: 100, ph: miete ? 'z. B. Helle 2-Zimmer-Wohnung mit Balkon in Plagwitz' : 'z. B. Reihenhaus mit Südgarten in Gohlis', hint: '10 bis 100 Zeichen. Ohne Telefonnummern und ohne Großbuchstaben-Schreierei.' }),
      txt('description', 'Beschreibung', { required: true, rows: 9, max: 5000, hint: miete
        ? 'Mindestens 50 Zeichen: Zustand, Ausstattung, Lage, Hausregeln, Haustiere. Bitte keine Kontaktdaten in den Text schreiben – dafür gibt es später ein eigenes Feld.'
        : 'Mindestens 50 Zeichen: Zustand, Ausstattung, Lage, Besonderheiten, Gründe für den Verkauf. Bitte keine Kontaktdaten in den Text schreiben – dafür gibt es später ein eigenes Feld.' }),
      miete ? h('div', { class: 'notice' }, h('strong', null, 'Faire Vermietung: '), 'Bitte schreiben Sie keine Ausschlüsse nach Herkunft, Religion, Geschlecht, Alter, Behinderung oder Familienstand in das Inserat. Solche Inserate sperren wir (Allgemeines Gleichbehandlungsgesetz).') : null,
    ].filter(Boolean) as HTMLElement[]
  }
  /** Felder, die nur bei Mietinseraten gebraucht werden. */
  function mietFelder(): HTMLElement[] {
    const furn = h('input', { type: 'checkbox', checked: input.furnished }) as HTMLInputElement
    furn.addEventListener('change', () => { input.furnished = furn.checked })
    return [
      h('div', { class: 'two' },
        numF('serviceCostsEur', 'Nebenkosten pro Monat', { unit: '€', step: 10, hint: 'Vorauszahlung inkl. Heizung, soweit enthalten.' }),
        numF('depositEur', 'Kaution', { unit: '€', step: 50, hint: 'Höchstens drei Monatskaltmieten (§ 551 BGB).' })),
      h('div', { class: 'two' },
        txt('availableFrom', 'Frei ab', { type: 'date', hint: 'Leer lassen für „nach Absprache“.' }),
        h('div', { class: 'field' }, h('label', { class: 'check' }, furn, h('span', null, 'Möbliert')))),
    ]
  }
  function stepData(): HTMLElement[] {
    return [
      h('div', { class: 'two' }, txt('postalCode', 'Postleitzahl', { required: true, max: 5, auto: 'postal-code' }), txt('city', 'Ort', { required: true, max: 80 })),
      h('div', { class: 'two' }, txt('district', 'Ortsteil (optional)', { max: 80 }), txt('street', 'Straße (optional)', { max: 100, hint: 'Wird im Inserat angezeigt – ohne Hausnummer.' })),
      txt('houseNo', 'Hausnummer (nur für Sie)', { max: 10, hint: 'Wird NICHT öffentlich angezeigt. So schützen wir Ihr Zuhause vor ungebetenen Besuchern.' }),
      input.offer === 'miete'
        ? numF('priceEur', 'Kaltmiete pro Monat', { required: true, unit: '€', step: 10, hint: 'Nettokaltmiete ohne Nebenkosten, in ganzen Euro.' })
        : numF('priceEur', 'Kaufpreis', { required: true, unit: '€', step: 1000 }),
      ...(input.offer === 'miete' ? mietFelder() : []),
      input.type !== 'grundstueck' ? h('div', { class: 'two' }, numF('livingAreaM2', 'Wohnfläche', { required: true, unit: 'm²', step: 0.5 }), numF('rooms', 'Zimmer', { step: 0.5 })) : null,
      h('div', { class: 'two' }, numF('plotAreaM2', 'Grundstücksfläche', { unit: 'm²', step: 1 }), input.type !== 'grundstueck' ? numF('yearBuilt', 'Baujahr', { hint: 'Bei vorhandenem Energieausweis Pflicht.' }) : null),
    ].filter(Boolean) as HTMLElement[]
  }
  function stepEnergy(): HTMLElement[] {
    if (input.type === 'grundstueck') return [h('p', null, 'Für Grundstücke ist kein Energieausweis nötig. Weiter geht es mit den Fotos.')]
    const out: HTMLElement[] = [
      h('div', { class: 'notice' }, h('strong', null, 'Pflichtangaben: '), 'Wenn ein Energieausweis vorliegt, müssen bestimmte Werte in der Anzeige stehen – beim Verkauf und bei der Vermietung. Wir fragen sie deshalb einzeln ab. Sie finden sie auf Seite 1 bis 2 des Energieausweises.'),
      sel('energyState', 'Liegt ein Energieausweis vor?', [['', '– bitte wählen –'], ['vorhanden', 'Ja, er liegt vor'], ['folgt', 'Noch nicht – ich lege ihn spätestens zur Besichtigung vor'], ['nicht_erforderlich', 'Nicht erforderlich (z. B. Denkmal, besondere Ausnahme)']], { required: true, onChange: () => { errs = {}; draw() } }),
    ]
    if (input.energyState === 'vorhanden') {
      const hint = energyHint(input)
      out.push(
        sel('energyKind', 'Art des Ausweises', [['', '– bitte wählen –'], ['bedarf', 'Bedarfsausweis'], ['verbrauch', 'Verbrauchsausweis']], { required: true }),
        numF('energyValue', 'Energiekennwert', { required: true, unit: 'kWh/(m²·a)', step: 0.1, hint: 'Endenergiebedarf bzw. -verbrauch laut Ausweis.' }),
        txt('energyCarrier', 'Wesentlicher Energieträger der Heizung', { required: true, max: 60, ph: 'z. B. Gas, Fernwärme, Öl, Wärmepumpe' }),
        sel('energyClass', 'Energieeffizienzklasse', [['', '– bitte wählen –'], ...ENERGY_CLASSES.map((c) => [c, c] as [string, string])], { required: true, onChange: () => draw() }),
        numF('yearBuilt', 'Baujahr des Gebäudes', { required: true }),
      )
      if (hint) out.push(h('p', { class: 'soft-warn', role: 'status' }, h('span', { 'aria-hidden': 'true' }, '⚠ '), hint))
    }
    return out.filter(Boolean) as HTMLElement[]
  }
  function stepPhotos(): HTMLElement[] {
    const grid = h('div', { class: 'photo-grid' })
    const render = () => {
      clear(grid)
      photos.forEach((p, i) => grid.append(h('figure', { class: 'photo' },
        h('img', { src: p.url, alt: `Foto ${i + 1}`, width: 200, height: 130 }),
        i === 0 ? h('figcaption', null, 'Titelbild') : null,
        h('button', { type: 'button', class: 'btn-icon photo-del', 'aria-label': `Foto ${i + 1} entfernen`, onClick: async () => {
          try { await api.removePhoto(id!, p.id); photos = photos.filter((x) => x.id !== p.id); render(); count.textContent = countText() } catch (e) { toast(errMsg(e), 'fehler') }
        } }, '✕'))))
    }
    const countText = () => `${photos.length} von ${MAX_PHOTOS} Fotos (mindestens ${MIN_PHOTOS})`
    const count = h('p', { class: `count${photos.length >= MIN_PHOTOS ? ' ok' : ''}`, 'aria-live': 'polite' }, countText())
    const fileIn = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', multiple: true, class: 'file', 'aria-label': 'Fotos auswählen' }) as HTMLInputElement
    fileIn.addEventListener('change', async () => {
      const files = Array.from(fileIn.files ?? [])
      fileIn.value = ''
      for (const f of files) {
        if (photos.length >= MAX_PHOTOS) { toast(`Höchstens ${MAX_PHOTOS} Fotos.`, 'fehler'); break }
        try {
          const blob = await compressImage(f)
          photos.push(await api.addPhoto(id!, blob, `Foto von ${input.title}`))
          render(); count.textContent = countText()
          count.className = `count${photos.length >= MIN_PHOTOS ? ' ok' : ''}`
        } catch (e) { toast(`${f.name}: ${errMsg(e)}`, 'fehler') }
      }
    })
    render()
    return [
      h('div', { class: 'notice' }, h('strong', null, 'Fotos-Regeln: '), 'Nur eigene Fotos. Keine Personen, keine Autokennzeichen, keine Fotos aus dem Internet. Wir verkleinern die Bilder und entfernen den Aufnahmeort automatisch.'),
      h('label', { class: 'dropzone' }, h('span', { class: 'dz-title' }, '＋ Fotos auswählen'), h('span', null, 'Mehrere gleichzeitig möglich · JPG, PNG oder WebP'), fileIn),
      count, errs.photos ? h('p', { class: 'err', role: 'alert' }, h('span', { 'aria-hidden': 'true' }, '⚠ '), errs.photos) : null, grid,
    ].filter(Boolean) as HTMLElement[]
  }
  function stepContact(): HTMLElement[] {
    return [
      h('p', { class: 'step-intro' }, 'Interessenten melden sich bei Ihnen. Sie bestimmen, wie viel Sie von sich preisgeben – und das ist nur für angemeldete Nutzer sichtbar.'),
      sel('contactMode', 'Wie sollen Interessenten Sie erreichen?', [
        ['nachricht', 'Nur über das Nachrichtenformular (empfohlen, am sichersten)'],
        ['login_email', 'Zusätzlich meine E-Mail-Adresse zeigen'],
        ['login_telefon', 'Zusätzlich E-Mail und Telefonnummer zeigen'],
      ], { required: true, onChange: () => { errs = {}; draw() } }),
      input.contactMode !== 'nachricht' ? txt('contactEmail', 'E-Mail-Adresse für Interessenten', { type: 'email', auto: 'email', required: true }) : null,
      input.contactMode === 'login_telefon' ? txt('contactPhone', 'Telefonnummer für Interessenten', { type: 'tel', auto: 'tel', required: true }) : null,
    ].filter(Boolean) as HTMLElement[]
  }
  function stepReview(): HTMLElement[] {
    const e = validateListing(input, photos.length)
    const cb = (key: keyof typeof rights, text: string | Node) => {
      const el = h('input', { type: 'checkbox', checked: rights[key] }) as HTMLInputElement
      el.addEventListener('change', () => { rights[key] = el.checked })
      return h('label', { class: 'check' }, el, h('span', null, text))
    }
    return [
      h('p', { class: 'step-intro' }, 'Fast geschafft. Bitte prüfen Sie Ihre Angaben noch einmal.'),
      hasErrors(e) ? h('div', { class: 'notice notice-warn', role: 'alert' }, h('strong', null, 'Noch nicht vollständig: '), h('ul', null, Object.values(e).map((m) => h('li', null, m)))) : h('div', { class: 'notice notice-ok' }, h('span', { 'aria-hidden': 'true' }, '✔ '), 'Alle Pflichtangaben sind vollständig.'),
      h('dl', { class: 'facts review' },
        rv('Überschrift', input.title), rv('Ort', `${input.postalCode} ${input.city}`), rv(input.offer === 'miete' ? 'Kaltmiete' : 'Preis', input.priceEur ? `${input.priceEur.toLocaleString('de-DE')} €${input.offer === 'miete' ? ' pro Monat' : ''}` : '–'),
        rv('Fotos', String(photos.length)), rv('Kontakt', input.contactMode === 'nachricht' ? 'Nachrichtenformular' : input.contactMode === 'login_email' ? 'Formular + E-Mail' : 'Formular + E-Mail + Telefon')),
      h('div', { class: 'checks' },
        cb('privat', input.offer === 'miete'
          ? 'Ich biete diese Immobilie als Privatperson an und bin kein Makler und keine Hausverwaltung. Ich bin Eigentümer oder zur Vermietung berechtigt (z. B. mit Erlaubnis des Vermieters zur Untervermietung).'
          : 'Ich biete diese Immobilie als Privatperson an und bin kein Makler. Ich bin Eigentümer oder zum Verkauf berechtigt.'),
        cb('fotos', 'Ich besitze alle Rechte an den hochgeladenen Fotos und Texten und erlaube FreiHaus, sie im Inserat anzuzeigen.'),
        cb('regeln', h('span', null, 'Ich habe die ', h('a', { href: '/nutzungsbedingungen', target: '_blank' }, 'Nutzungsbedingungen'), ' und die ', h('a', { href: '/datenschutz', target: '_blank' }, 'Datenschutzerklärung'), ' gelesen. Ich weiß: Wer Geld im Voraus verlangt, wird gesperrt.'))),
      h('p', { class: 'hint' }, 'Beim ersten Inserat prüfen wir von Hand, bevor es online geht. Das dauert in der Regel höchstens ein bis zwei Werktage.'),
    ]
  }
  const rv = (k: string, v: string) => h('div', { class: 'fact' }, h('dt', null, k), h('dd', null, v || '–'))

  // ---------- Steuerung
  const body = h('div', { class: 'step-body' })
  const stepper = h('ol', { class: 'stepper', 'aria-label': 'Fortschritt' })
  const nav = h('div', { class: 'step-nav' })

  async function persist(): Promise<void> {
    id = await api.saveDraft(input, id)
    // Nur die Adresszeile anpassen (kein Neuaufbau), damit ein Neuladen den Entwurf wiederfindet.
    if (!editId && window.location.pathname === withBase('/verkaufen')) window.history.replaceState({}, '', withBase(`/verkaufen/${id}`))
  }
  function collect(): Errors {
    const all = validateListing(input, photos.length)
    const keys = STEP_KEYS[step]
    const out: Errors = {}
    for (const k of keys) if (all[k]) out[k] = all[k]
    return out
  }

  async function next(): Promise<void> {
    errs = collect()
    // Beim Typ „Grundstück“ gibt es keinen Energieausweis-Schritt.
    if (hasErrors(errs)) { draw(); focusFirstError(); return }
    try {
      if (step >= 1) await persist() // ab Schritt 2 sind alle Pflichtfelder der Datenbank gefüllt
    } catch (e) { toast(errMsg(e), 'fehler'); return }
    step++
    errs = {}
    draw()
    window.scrollTo({ top: 0 })
  }
  async function back(): Promise<void> {
    if (step > 0) { step--; errs = {}; draw(); window.scrollTo({ top: 0 }) }
  }
  async function submit(btn: HTMLButtonElement): Promise<void> {
    const e = validateListing(input, photos.length)
    if (hasErrors(e)) { toast('Bitte zuerst die fehlenden Angaben ergänzen.', 'fehler'); return }
    if (!rights.privat || !rights.fotos || !rights.regeln) { toast('Bitte bestätigen Sie alle drei Punkte.', 'fehler'); return }
    btn.setAttribute('disabled', '')
    try {
      await persist()
      const s = await api.setStatus(id!, 'pending')
      toast(s === 'published' ? 'Ihr Inserat ist online.' : 'Eingereicht. Wir prüfen es und melden uns per E-Mail.')
      navigate('/konto')
    } catch (er) { toast(errMsg(er), 'fehler'); btn.removeAttribute('disabled') }
  }
  function focusFirstError(): void {
    (root.querySelector('[aria-invalid="true"]') as HTMLElement | null)?.focus()
  }

  function draw(): void {
    clear(stepper); clear(body); clear(nav)
    STEPS.forEach((s, i) => stepper.append(h('li', { class: i === step ? 'cur' : i < step ? 'done' : '', 'aria-current': i === step ? 'step' : null }, h('span', { class: 'n' }, i < step ? '✔' : String(i + 1)), h('span', { class: 'l' }, s))))
    const fn = [stepObject, stepData, stepEnergy, stepPhotos, stepContact, stepReview][step]
    body.append(h('h2', { class: 'step-title' }, STEPS[step]), ...fn())
    if (step > 0) nav.append(h('button', { class: 'btn btn-ghost', type: 'button', onClick: () => void back() }, '← Zurück'))
    if (step < STEPS.length - 1) nav.append(h('button', { class: 'btn btn-primary', type: 'button', onClick: () => void next() }, 'Weiter →'))
    else {
      const b = h('button', { class: 'btn btn-primary btn-lg', type: 'button' }, 'Kostenlos einreichen') as HTMLButtonElement
      b.addEventListener('click', () => void submit(b))
      nav.append(b)
    }
  }

  clear(root)
  root.append(h('h1', null, editId ? 'Inserat bearbeiten' : 'Kostenlos inserieren'), stepper, h('form', { class: 'wizard', onSubmit: (e: Event) => e.preventDefault(), noValidate: true }, body, nav))
  draw()
  return root
}
