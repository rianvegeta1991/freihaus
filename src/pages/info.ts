import { h } from '../dom'
import type { Route } from '../router'
import { setTitle } from '../ui'

const draft = (what: string) => h('div', { class: 'notice notice-warn', role: 'note' },
  h('strong', null, 'ENTWURF – noch nicht rechtsgeprüft. '), `${what} Diese Seite darf erst nach Prüfung durch eine Fachanwältin oder einen Fachanwalt für IT-Recht und mit den echten Angaben veröffentlicht werden. Mit [ECKIGEN KLAMMERN] markierte Stellen sind Platzhalter.`)

function page(title: string, ...children: (HTMLElement | null)[]): HTMLElement {
  setTitle(title)
  return h('div', { class: 'wrap section prose' }, h('h1', null, title), ...children)
}

export async function renderSafety(_r: Route): Promise<HTMLElement> {
  return page('Betrug erkennen – so schützen Sie sich',
    h('p', { class: 'lead' }, 'Die meisten Inserate auf FreiHaus sind ehrlich. Trotzdem versuchen Betrüger es überall. Diese Regeln schützen Sie.'),
    h('h2', null, 'Die goldenen Regeln für Käufer'),
    h('ol', null,
      h('li', null, h('strong', null, 'Kein Geld vor dem Notartermin.'), ' Kein Cent als Anzahlung, Reservierung, Kaution oder „Bearbeitungsgebühr“. Ein Kaufvertrag über eine Immobilie ist nur mit notarieller Beurkundung gültig. Der Notar sorgt dafür, dass das Geld erst fließt, wenn alles geklärt ist.'),
      h('li', null, h('strong', null, 'Besichtigen Sie das Objekt.'), ' Wer nur über Fotos verkaufen will, hat etwas zu verbergen. Gehen Sie zur Besichtigung nicht allein, wenn Ihnen etwas komisch vorkommt.'),
      h('li', null, h('strong', null, 'Lassen Sie sich nicht drängen.'), ' „Es gibt schon viele Interessenten, entscheiden Sie heute“ ist ein Warnsignal.'),
      h('li', null, h('strong', null, 'Zu schön, um wahr zu sein?'), ' Ein Preis weit unter dem Üblichen ist fast immer ein Lockvogel.'),
      h('li', null, h('strong', null, 'Prüfen Sie Eigentum und Unterlagen.'), ' Fragen Sie nach Grundbuchauszug, Energieausweis und Ausweis des Verkäufers. Ihr Notar prüft das Grundbuch ohnehin.'),
      h('li', null, h('strong', null, 'Bleiben Sie auf FreiHaus.'), ' Wenn jemand das Gespräch dringend zu einem Messenger oder per Link in eine andere Seite verlegen will: Vorsicht.')),
    h('h2', null, 'Für Verkäufer'),
    h('ul', null,
      h('li', null, 'Veröffentlichen Sie Ihre Hausnummer nicht. Wir zeigen sie Interessenten nicht an.'),
      h('li', null, 'Laden Sie Interessenten erst zur Besichtigung ein, wenn Sie sich ein Bild gemacht haben. Lassen Sie bei Besichtigungen nicht jemanden allein im Haus.'),
      h('li', null, 'Geben Sie niemals Ihre Bank-, Karten- oder Ausweisdaten an Interessenten. Käufer müssen Ihnen kein Geld „vorab“ schicken – und Sie müssen nichts zurücküberweisen.'),
      h('li', null, 'Misstrauen Sie Käufern, die ohne Besichtigung kaufen wollen und Schecks, Überzahlungen oder Zahlungsdienste vorschlagen.')),
    h('h2', null, 'Etwas gesehen? Melden Sie es.'),
    h('p', null, 'An jedem Inserat gibt es den Knopf „Inserat melden“. Wir prüfen jede Meldung, sperren Betrüger und teilen Ihnen das Ergebnis mit. Bei konkretem Schaden erstatten Sie bitte zusätzlich Anzeige bei der Polizei (online über die Internetwache Ihres Bundeslands).'))
}

export async function renderTransparency(_r: Route): Promise<HTMLElement> {
  return page('Wer finanziert FreiHaus?',
    h('p', { class: 'lead' }, 'FreiHaus ist kostenlos – für alle, dauerhaft. Hier steht ehrlich, wie das geht.'),
    h('h2', null, 'Heute'),
    h('p', null, 'FreiHaus wird von [NAME DES BETREIBERS] privat finanziert. Die laufenden Kosten (Server, E-Mail, Prüfung) liegen bei rund [BETRAG] € im Monat. Es gibt keine Werbung, keine Provision und keinen Datenverkauf.'),
    h('h2', null, 'Was wir nie tun'),
    h('ul', null,
      h('li', null, 'Provisionen oder Erfolgsgebühren verlangen – weder von Verkäufern noch von Käufern.'),
      h('li', null, 'Ihre Daten oder Kontakte an Makler, Banken oder Werbefirmen weitergeben.'),
      h('li', null, 'Inserate gegen Geld bevorzugen.')),
    h('h2', null, 'Später'),
    h('p', null, 'Wenn es FreiHaus gibt und Menschen es nützlich finden, möchten wir eine freiwillige Unterstützung anbieten, mit der Sie die Kosten mittragen können. Sie ist nie Voraussetzung, bringt keine Vorteile und hat nichts mit einem Verkauf zu tun. Eine Spendenquittung gibt es nicht. Wir veröffentlichen dann hier regelmäßig Einnahmen und Kosten.'),
    h('h2', null, 'Zahlen'),
    h('p', null, 'Nutzerzahl (monatlich aktive Nutzer in der EU): [WIRD VOR DEM START ERHOBEN UND ALLE 6 MONATE AKTUALISIERT].'))
}

export async function renderAbout(_r: Route): Promise<HTMLElement> {
  return page('Über FreiHaus',
    h('p', { class: 'lead' }, 'Eine Immobilie zu verkaufen sollte nicht Tausende Euro Provision kosten. Und ein Haus zu kaufen sollte so einfach sein, wie mit dem Besitzer zu sprechen – über den Gartenzaun.'),
    h('p', null, 'FreiHaus ist ein kostenloses Anzeigenportal. Wir bringen Verkäufer und Käufer zusammen, mehr nicht. Wir vermitteln nicht, wir wählen keine Interessenten aus, wir organisieren keine Besichtigungen und verdienen nicht am Abschluss. Das ist der Unterschied zu einem Makler.'),
    h('p', null, '[HIER STEHT SPÄTER IHRE PERSÖNLICHE VORSTELLUNG MIT FOTO – das schafft Vertrauen.]'))
}

export async function renderMod(_r: Route): Promise<HTMLElement> {
  return page('So moderieren wir',
    draft('Die Regeln müssen in den Nutzungsbedingungen genannt sein (DSA Art. 14).'),
    h('p', null, 'Damit FreiHaus sicher und fair bleibt, gelten diese Regeln. Wir prüfen Inserate nach Meldungen und stichprobenartig, neue Konten vor der ersten Veröffentlichung von Hand. Wir setzen dafür einfache automatische Hilfen ein (z. B. Erkennung typischer Betrugs-Formulierungen und doppelter Fotos); die Entscheidung über Sperren trifft immer ein Mensch.'),
    h('h2', null, 'Nicht erlaubt sind'),
    h('ul', null,
      h('li', null, 'Inserate von Maklern, Bauträgern und anderen gewerblichen Anbietern.'),
      h('li', null, 'Forderungen nach Zahlungen vor dem Notartermin (Vorkasse, Reservierungs- oder Bearbeitungsgebühren, Kautionen).'),
      h('li', null, 'Falsche oder irreführende Angaben, Fotos fremder Objekte oder Fotos ohne Nutzungsrecht.'),
      h('li', null, 'Fehlende Pflichtangaben zum Energieausweis, wenn ein Ausweis vorliegt.'),
      h('li', null, 'Beleidigungen, Diskriminierung, rechtswidrige Inhalte, Werbung für anderes.'),
      h('li', null, 'Mehrfachkonten, Spam und automatisches Auslesen („Scraping“) der Seite.')),
    h('h2', null, 'Was passiert bei einem Verstoß?'),
    h('p', null, 'Wir geben das Inserat zur Überarbeitung zurück oder sperren es – bei Betrug auch das Konto. Sie erhalten immer eine Begründung in Ihrem Konto und per E-Mail und können widersprechen. Meldungen bearbeiten wir in der Regel innerhalb von 24 Stunden.'),
    h('h2', null, 'Inhalte melden'),
    h('p', null, 'An jedem Inserat gibt es den Knopf „Inserat melden“. Für Behörden und Rückfragen erreichen Sie uns unter [KONTAKT-E-MAIL].'))
}

export async function renderTerms(_r: Route): Promise<HTMLElement> {
  return page('Nutzungsbedingungen',
    draft('Inhaltlicher Rahmen für die anwaltliche Ausarbeitung.'),
    h('h2', null, '1. Wer wir sind'), h('p', null, 'FreiHaus wird betrieben von [NAME, ANSCHRIFT]. Die Nutzung ist kostenlos.'),
    h('h2', null, '2. Was FreiHaus ist – und was nicht'),
    h('p', null, 'FreiHaus ist ein Anzeigenmedium. Wir vermitteln keine Verträge, weisen keine Interessenten nach, wählen keine Interessenten aus, organisieren keine Besichtigungen und erhalten keine Vergütung, die vom Abschluss eines Vertrages abhängt. Verträge kommen ausschließlich zwischen Verkäufer und Käufer zustande.'),
    h('h2', null, '3. Wer inserieren darf'), h('p', null, 'Nur Privatpersonen, die Eigentümer sind oder zum Verkauf berechtigt. Makler und gewerbliche Anbieter dürfen nicht inserieren.'),
    h('h2', null, '4. Pflichten der Inserenten'),
    h('ul', null, h('li', null, 'Wahrheitsgemäße, vollständige Angaben – insbesondere die Pflichtangaben zum Energieausweis.'), h('li', null, 'Nur Fotos und Texte, an denen Sie alle Rechte besitzen.'), h('li', null, 'Keine Forderung von Vorauszahlungen.')),
    h('h2', null, '5. Rechteeinräumung'), h('p', null, 'Sie räumen FreiHaus ein einfaches, unentgeltliches, auf die Dauer des Inserats beschränktes Recht ein, Fotos und Texte anzuzeigen, zu verkleinern und für Suchmaschinen verfügbar zu machen. [ANWALT PRÜFT UMFANG].'),
    h('h2', null, '6. Moderation'), h('p', null, 'Es gelten die Regeln unter „So moderieren wir“. Wir dürfen Inhalte entfernen und Konten sperren, wenn gegen diese Bedingungen oder geltendes Recht verstoßen wird.'),
    h('h2', null, '7. Laufzeit der Inserate'), h('p', null, 'Inserate laufen 90 Tage und können verlängert werden. Abgelaufene Inserate werden nach 30 Tagen gelöscht.'),
    h('h2', null, '8. Haftung'), h('p', null, '[ANWALT FORMULIERT HAFTUNGSBEGRENZUNG UND HINWEIS: KEINE PRÜFUNG DER OBJEKTE].'))
}

export async function renderPrivacy(_r: Route): Promise<HTMLElement> {
  return page('Datenschutzerklärung',
    draft('Gerüst mit den vorgesehenen Verarbeitungen – kein fertiger Text.'),
    h('h2', null, 'Verantwortlicher'), h('p', null, '[NAME, ANSCHRIFT, E-MAIL]'),
    h('h2', null, 'Welche Daten wir verarbeiten und warum'),
    h('ul', null,
      h('li', null, h('strong', null, 'Konto: '), 'E-Mail-Adresse, optional Name und Telefonnummer – zur Anmeldung und Nutzung (Vertragserfüllung, Art. 6 Abs. 1 lit. b DSGVO).'),
      h('li', null, h('strong', null, 'Inserate: '), 'Angaben zum Objekt, Fotos (ohne Standortdaten), Hausnummer nur für den Inserenten, Kontaktdaten nur nach Auswahl und nur für angemeldete Nutzer.'),
      h('li', null, h('strong', null, 'Nachrichten: '), 'Inhalt und Zeitpunkt, zur Weiterleitung an den Inserenten.'),
      h('li', null, h('strong', null, 'Meldungen: '), 'Inhalt, ggf. Name und E-Mail des Meldenden (rechtliche Verpflichtung nach dem Digital Services Act).'),
      h('li', null, h('strong', null, 'Sicherheit: '), 'Zugriffsprotokolle, Zähler für Kontaktaufrufe und Nachrichten (berechtigtes Interesse, Betrugs- und Spam-Abwehr).'),
      h('li', null, h('strong', null, 'Reichweitenmessung: '), '[ANBIETER, z. B. Plausible/Matomo – ohne Cookies, ohne Personenbezug – ANWALT PRÜFT].')),
    h('h2', null, 'Empfänger / Auftragsverarbeiter'), h('p', null, '[Supabase (Hosting/Datenbank, Region Frankfurt), Cloudflare (Auslieferung/Bot-Schutz), E-Mail-Dienstleister – jeweils mit Auftragsverarbeitungsvertrag].'),
    h('h2', null, 'Speicherdauer'), h('p', null, 'Inserate: 90 Tage Laufzeit, danach 30 Tage Verlängerungsfenster, dann Löschung. Konto: bis zur Löschung durch Sie. Meldungen und Begründungen: [3 Jahre]. Zugriffsprotokolle: [7–14 Tage].'),
    h('h2', null, 'Ihre Rechte'), h('p', null, 'Auskunft, Berichtigung, Löschung, Einschränkung, Übertragbarkeit, Widerspruch und Beschwerde bei der Aufsichtsbehörde. [KONTAKT]'),
    h('h2', null, 'Cookies'), h('p', null, 'FreiHaus setzt nur technisch notwendige Speicherungen (z. B. Anmeldung). Es gibt keine Werbe- oder Tracking-Cookies, deshalb keinen Cookie-Banner. Schriften liegen auf unserem Server.'))
}

export async function renderImprint(_r: Route): Promise<HTMLElement> {
  return page('Impressum',
    draft('Pflichtangaben nach § 5 DDG – nur mit echten Daten ausfüllen.'),
    h('p', null, '[VOR- UND NACHNAME]', h('br'), '[LADUNGSFÄHIGE ANSCHRIFT – kein Postfach]'),
    h('p', null, 'E-Mail: [E-MAIL-ADRESSE]', h('br'), 'Zweiter Kontaktweg: [TELEFON ODER KONTAKTFORMULAR]'),
    h('p', null, '[Gewerbe: angemeldet bei … / Umsatzsteuer: Kleinunternehmerregelung § 19 UStG – nur eintragen, wenn zutreffend]'),
    h('p', null, 'Kontaktstelle für Behörden und Nutzer nach Digital Services Act (Art. 11, 12): [E-MAIL-ADRESSE], Sprache: Deutsch.'))
}

export async function renderA11y(_r: Route): Promise<HTMLElement> {
  return page('Barrierefreiheit',
    draft('Bitte mit dem tatsächlichen Prüfstand ergänzen.'),
    h('p', null, 'Wir möchten, dass alle FreiHaus nutzen können, und richten uns nach den Web Content Accessibility Guidelines (WCAG 2.1, Stufe AA). Dazu gehören gut lesbare Schrift, ausreichende Kontraste, Bedienung per Tastatur und Zuordnung aller Formularfelder. Status werden nie allein über Farbe angezeigt.'),
    h('p', null, 'Stand der Prüfung: [DATUM / ERGEBNIS]. Barrieren melden Sie bitte an [E-MAIL-ADRESSE].'))
}

export async function renderNotFound(_r: Route): Promise<HTMLElement> {
  setTitle('Seite nicht gefunden')
  return h('div', { class: 'wrap section' }, h('h1', null, 'Diese Seite gibt es nicht'), h('p', null, h('a', { href: '/' }, '← Zur Startseite')))
}
