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
- **Supabase-Projekt `fzhaozatyraflbwdspgd` (Frankfurt) läuft**, Migrationen 0001–0003 sind eingespielt, `kontakt.freihaus@proton.me` ist `admin`.
  Lokal per `.env.local` (git-ignoriert) angebunden; die **GitHub-Pages-Demo bleibt im Demo-Modus**, bis URL/Key als Actions-Secrets eingetragen sind.
  **Keine eigene Domain.** Der eingebaute Supabase-Mailversand erlaubt nur wenige Anmelde-Mails pro Stunde („email rate limit exceeded") –
  vor dem Start eigenen SMTP-Dienst anbinden und die Auth-Mails eindeutschen.
- **Live-Test gegen echtes Backend (8.11.2026, in Chrome per Erweiterung):** Konto speichern, Inserat anlegen (6 Schritte, 3 Fotos → Speicher
  `<uid>/<inserat>/<id>.webp`, öffentlich lesbar), Moderation freigeben, Suche, Hausnummer nicht öffentlich (`listing_private` für Anon gesperrt, 42501),
  Melden → Moderation, Sperren ohne Begründung abgelehnt / mit Begründung im Konto sichtbar, Kontaktnachricht „Erledigt", Abmelden (`/admin` → `/anmelden`),
  alle sensiblen Tabellen für Anon gesperrt – **alles bestanden**. **Nicht getestet:** erneutes Anmelden (Mail-Limit), Nachricht an Inserenten,
  `reveal_contact`, Merkliste, Zugriff eines zweiten, nicht-admin Kontos, Löschen mit Speicher-Aufräumen (neu, siehe unten).
  Fund: `deleteListing` ließ die Fotodateien im Speicher liegen (nur die Zeilen gingen per Cascade) – seit 8.11. räumt `live.ts` sie mit ab.
  Test-Inserat und Test-Kontaktnachricht sind wieder gelöscht (Datenbank und Speicher geprüft, 8.11.2026). Der Foto-Bucket ist public:
  wer die URL kennt, sieht ein Foto auch bei Entwürfen und gesperrten Inseraten – in der Datenschutzerklärung erwähnen.
- Rechtstexte (`src/pages/info.ts`) sind **Entwürfe mit Platzhaltern in [eckigen Klammern]** – nicht live schalten,
  bevor ein Anwalt sie geprüft hat und die echten Angaben drinstehen.

## Betreiberangaben

Auf der Seite und im Repo stehen **nur Name (Bastian Badde) und die Portal-Adresse kontakt.freihaus@proton.me** – zentral in `src/pages/info.ts`
(`NAME`, `MAIL`). **Die Privatanschrift des Betreibers wird nie veröffentlicht** und gehört auch nicht ins (öffentliche) Repo.
Das Impressum braucht vor dem echten Start trotzdem eine ladungsfähige Anschrift – dafür eine Geschäftsadresse (c/o) besorgen.

**Entscheidung vom 8.11.2026:** Anschrift, Gewerbe und Steuernummer stehen **bewusst nicht** im Impressum (Bastian wollte sie
streichen). § 5 DDG verlangt für ein geschäftsmäßiges Angebot trotzdem eine ladungsfähige Anschrift – das Impressum bleibt
deshalb als **Entwurf** gekennzeichnet; vor einem echten Start mit Anwalt klären (Geschäftsadresse oder anderer Weg).
Reichweitenmessung: **keine** (kein Anbieter, kein Cookie-Banner); die DSA-Nutzerzahl kommt später aus der Datenbank.
Zweiter Kontaktweg ist das **Kontaktformular** `/kontakt` (`src/pages/kontakt.ts`, Migration `0003_contact.sql`):
Honeypot + 3-Sekunden-Sperre im Browser, in der Datenbank max. 3 Nachrichten/Adresse/Tag und 40/Stunde gesamt, keine IP-Speicherung;
Nachrichten erscheinen in der Moderation unter „Kontaktnachrichten“. Es gibt **keine E-Mail-Benachrichtigung** – die Moderation muss
dort nachsehen (Punkt 3 der offenen Punkte).

**Barrierefreiheit (8.11.2026):** Eigene Prüfung per Skript im Browser (Sprache, Titel, Überschriften, Landmarks, Beschriftungen,
Kontraste, Klickflächen ≥ 24 px, Überlauf) über alle Seiten, Desktop und 375 px – keine Abweichungen; Ergebnis steht auf
`/barrierefreiheit`. **Nicht** gemacht: Screenreader, Tastatur von Hand, 200 % Zoom. Ein externes Prüfwerkzeug (axe-core per CDN)
wurde vom System abgelehnt; bei Bedarf axe-core als Entwicklungs-Abhängigkeit installieren statt von einem CDN zu laden.
Neue Seiten müssen die Überschriftenfolge einhalten (`listingCard(l, 2)` direkt unter einer h1).

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

1. ~~Supabase-Projekt einrichten, Migrationen einspielen, `live.ts` testen~~ – erledigt (siehe „Stand"); offen: Test mit zweitem Konto, Anmelde-Wiederholung.
2. Anmeldung: Supabase-Auth-E-Mail-Vorlagen (Deutsch), Redirect-URLs; **SMS-Bestätigung** (Telefon) und Turnstile fehlen.
3. E-Mail-Benachrichtigung bei neuen Nachrichten (Edge Function) – bisher nur Posteingang im Konto.
4. Auto-Ablauf nach 90 Tagen (`pg_cron`: `published` → `expired`, 30 Tage später löschen), Verlängerungsmail.
5. Karte (OpenStreetMap/MapLibre), Suchaufträge, Briefcode „Adresse bestätigt“.
6. SEO: Die Seite ist eine reine Client-App. Für Regionalseiten/Ratgeber braucht es Vorab-Rendern (Prerender) und `sitemap.xml`.
7. Energieausweis-Pflichtfelder gegen den **aktuellen** Gesetzestext prüfen (GEG vs. Gebäudemodernisierungsgesetz, Endenergie vs. Primärenergie).
8. Hosting: Cloudflare Pages (`public/_redirects` liegt bereit); Domain steht aus (freihaus.de ist vergeben).
9. Bildkomprimierung (`src/image.ts`) und Foto-Upload sind nur im Demo-Modus im Browser getestet, **nicht** gegen echten Speicher.
