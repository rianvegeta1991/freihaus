# FreiHaus

Kostenloses Immobilienportal „von privat“ (Verkauf, ohne Makler, ohne Provision). Neuntes Projekt.
**Deutsch ist die Quellsprache** (Code-Kommentare, Texte, Commits). Konzept und Rechtslage stehen in
`../Immobilienportal-Konzept.md` – **dort zuerst nachlesen**, bevor Funktionen ergänzt werden.

## Stand (7.11.2026)

- Läuft **im Demo-Modus** (Beispieldaten im Arbeitsspeicher). Mit gesetzten `VITE_SUPABASE_URL` und
  `VITE_SUPABASE_ANON_KEY` (siehe `.env.example`) spricht die Seite stattdessen Supabase an (`src/api/live.ts`).
- **Demo live:** https://rianvegeta1991.github.io/freihaus/ (GitHub Pages, Workflow `.github/workflows/pages.yml`, Unterpfad
  `/freihaus/` über `VITE_BASE`; `noindex`). Repo `rianvegeta1991/freihaus` ist **öffentlich** (Pages geht im Free-Tarif nur so) –
  deshalb nie Schlüssel oder echte Personendaten einchecken. Tiefe Links liefert `404.html` (Status 404, App läuft trotzdem; für SEO ungeeignet).
- **Es gibt noch kein Supabase-Projekt und keine eigene Domain.**
- Rechtstexte (`src/pages/info.ts`) sind **Entwürfe mit Platzhaltern in [eckigen Klammern]** – nicht live schalten,
  bevor ein Anwalt sie geprüft hat und die echten Angaben drinstehen.

## Betreiberangaben

Auf der Seite und im Repo stehen **nur Name (Bastian Badde) und die Portal-Adresse kontakt.freihaus@proton.me** – zentral in `src/pages/info.ts`
(`NAME`, `MAIL`). **Die Privatanschrift des Betreibers wird nie veröffentlicht** und gehört auch nicht ins (öffentliche) Repo.
Das Impressum braucht vor dem echten Start trotzdem eine ladungsfähige Anschrift – dafür eine Geschäftsadresse (c/o) besorgen.

## Entwicklung

- Node liegt portabel unter `C:\Users\Bastian\tools\node` (in Shells erst `$env:PATH` bzw. `export PATH` setzen).
- Dev-Server: `preview_start` mit `freihaus` (Port **8802**), Eintrag in `../.claude/launch.json`.
- `npm test` (Vitest), `npm run typecheck`, `npm run build`.
- **Tests:** `tests/db.test.ts` spielt `supabase/migrations/0001_schema.sql` in **PGlite** (Postgres im Prozess) ein
  und prüft RLS, Statuswechsel, Rate-Limits, Moderation. `auth.uid()` und die Rollen werden dort nachgebaut.
  `0002_storage.sql` (Bildspeicher) ist **nicht** getestet (kein Storage-Schema in PGlite).
- Kein Docker, keine Supabase-CLI auf diesem Rechner.

## Aufbau

- Vanilla TypeScript + Vite, kein Framework. `src/dom.ts` (`h()`) setzt Inhalte nur über `textContent` –
  **nie Nutzereingaben per `innerHTML` einfügen** (nur feste SVG-Symbole über `svg()`).
- `src/api/` – ein `Api`-Interface (`types.ts`), zwei Umsetzungen: `demo.ts`, `live.ts`. Seiten kennen nur das Interface.
- `src/pages/` – Start, Suche, Inserat, Verkaufen-Assistent (6 Schritte), Konto, Moderation, Info/Rechtliches.
- `src/validation.ts` spiegelt die Datenbank-Prüfungen (Pflichtfelder, Energieausweis), damit Fehler vor dem Absenden verständlich sind.
- Schriften (Inter, Fraunces) liegen über `@fontsource` im Build – **keine Google-Fonts-Einbindung** (DSGVO).

## Sicherheitsmodell (Datenbank)

- Alles per RLS. Hausnummer und Kontaktdaten liegen in `listing_private`; Kontaktdaten gibt nur `reveal_contact()`
  heraus (Login, 30/Tag), **die Hausnummer nie**.
- Neue Konten (`trust_level 0`): Erst-Inserat geht über `pending` und wird von Hand freigegeben
  (`moderate_listing`, hebt die Vertrauensstufe auf 1); max. 3 Inserate/Tag, 10 Nachrichten/Tag.
- Sperren/Zurückweisen **verlangen eine Begründung** (DSA Art. 17); sie landet in `moderation_log` und ist für den Inserenten lesbar.
- Bekannte Lücke: Ein vertrauenswürdiges Konto kann nach der Freigabe den Inhalt ändern, ohne neu geprüft zu werden.

## Offene Punkte (Reihenfolge ungefähr nach Wichtigkeit)

1. Supabase-Projekt (Region Frankfurt), Migrationen einspielen, `live.ts` erstmals gegen echtes Backend testen.
2. Anmeldung: Supabase-Auth-E-Mail-Vorlagen (Deutsch), Redirect-URLs; **SMS-Bestätigung** (Telefon) und Turnstile fehlen.
3. E-Mail-Benachrichtigung bei neuen Nachrichten (Edge Function) – bisher nur Posteingang im Konto.
4. Auto-Ablauf nach 90 Tagen (`pg_cron`: `published` → `expired`, 30 Tage später löschen), Verlängerungsmail.
5. Karte (OpenStreetMap/MapLibre), Suchaufträge, Briefcode „Adresse bestätigt“.
6. SEO: Die Seite ist eine reine Client-App. Für Regionalseiten/Ratgeber braucht es Vorab-Rendern (Prerender) und `sitemap.xml`.
7. Energieausweis-Pflichtfelder gegen den **aktuellen** Gesetzestext prüfen (GEG vs. Gebäudemodernisierungsgesetz, Endenergie vs. Primärenergie).
8. Hosting: Cloudflare Pages (`public/_redirects` liegt bereit); Domain steht aus (freihaus.de ist vergeben).
9. Bildkomprimierung (`src/image.ts`) und Foto-Upload sind nur im Demo-Modus im Browser getestet, **nicht** gegen echten Speicher.
