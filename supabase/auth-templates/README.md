# Deutsche Anmelde-Mails

Supabase verschickt die Anmelde-Mails; die Texte stehen nicht im Code, sondern im Dashboard
(**Authentication → Email Templates**). Diese Dateien sind die Vorlagen zum Einfügen:

| Vorlage im Dashboard | Datei | Betreff |
|---|---|---|
| Magic Link | `magic-link.html` | Ihr Anmelde-Link für FreiHaus |
| Confirm signup | `confirm-signup.html` | Willkommen bei FreiHaus – bitte E-Mail bestätigen |

Beim ersten Login einer neuen Adresse geht „Confirm signup“ raus, danach „Magic Link“ – beide eindeutschen.
Die Platzhalter `{{ .ConfirmationURL }}` nicht ändern. Die Vorlagen enthalten kein Tracking und keine Bilder.

## Vor dem Start außerdem

- **Authentication → URL Configuration:** *Site URL* auf die echte Adresse setzen und unter *Redirect URLs* die
  Adresse der Live-Seite (inkl. `/konto`) sowie `http://localhost:8802/**` eintragen.
- **Authentication → SMTP Settings:** eigenen Versanddienst eintragen. Der eingebaute Versand erlaubt nur wenige Mails
  pro Stunde und sendet von einer Supabase-Adresse. Realistisch braucht das eine **eigene Domain** (Absender
  `anmeldung@<domain>` mit SPF/DKIM/DMARC); mit einer `@proton.me`-Adresse als Absender würden die Mails über fremde Server vermutlich als Spam aussortiert.
- **Authentication → Rate Limits:** Nach dem Wechsel auf eigenen Versand das Mail-Limit anheben (das niedrige Standardlimit gilt für den eingebauten Versand).
