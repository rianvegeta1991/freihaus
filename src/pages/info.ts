import { h } from '../dom'
import type { Route } from '../router'
import { setTitle } from '../ui'

// Betreiber: nur Name und E-Mail werden genannt. Die Privatanschrift wird bewusst NICHT veröffentlicht.
const NAME = 'Bastian Badde'
const MAIL = 'kontakt.freihaus@proton.me'
const mail = () => h('a', { href: `mailto:${MAIL}` }, MAIL)

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
    h('p', null, `FreiHaus wird von ${NAME} privat finanziert. Es gibt keine Werbung, keine Provision und keinen Datenverkauf.`),
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
    h('h2', null, 'Wer dahintersteht'),
    h('p', null, `FreiHaus wird von ${NAME} betrieben. Fragen, Anregungen oder Hinweise schicken Sie gern per E-Mail an `, mail(), '.'))
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
    h('p', null, 'An jedem Inserat gibt es den Knopf „Inserat melden“. Für Behörden und Rückfragen erreichen Sie uns unter ', mail(), '.'))
}

export async function renderTerms(_r: Route): Promise<HTMLElement> {
  return page('Nutzungsbedingungen',
    draft('Inhaltlicher Rahmen für die anwaltliche Ausarbeitung.'),
    h('h2', null, '1. Wer wir sind'), h('p', null, `FreiHaus wird betrieben von ${NAME} (Kontakt: `, mail(), '). Die Nutzung ist kostenlos.'),
    h('h2', null, '2. Was FreiHaus ist – und was nicht'),
    h('p', null, 'FreiHaus ist ein Anzeigenmedium. Wir vermitteln keine Verträge, weisen keine Interessenten nach, wählen keine Interessenten aus, organisieren keine Besichtigungen und erhalten keine Vergütung, die vom Abschluss eines Vertrages abhängt. Verträge kommen ausschließlich zwischen Verkäufer und Käufer zustande.'),
    h('h2', null, '3. Wer inserieren darf'), h('p', null, 'Nur Privatpersonen, die Eigentümer sind oder zum Verkauf berechtigt. Makler und gewerbliche Anbieter dürfen nicht inserieren.'),
    h('h2', null, '4. Pflichten der Inserenten'),
    h('ul', null, h('li', null, 'Wahrheitsgemäße, vollständige Angaben – insbesondere die Pflichtangaben zum Energieausweis.'), h('li', null, 'Nur Fotos und Texte, an denen Sie alle Rechte besitzen.'), h('li', null, 'Keine Forderung von Vorauszahlungen.')),
    h('h2', null, '5. Rechteeinräumung'), h('p', null, 'Sie räumen FreiHaus ein einfaches, unentgeltliches, auf die Dauer des Inserats beschränktes Recht ein, Fotos und Texte anzuzeigen, zu verkleinern und für Suchmaschinen verfügbar zu machen.'),
    h('h2', null, '6. Moderation'), h('p', null, 'Es gelten die Regeln unter „So moderieren wir“. Wir dürfen Inhalte entfernen und Konten sperren, wenn gegen diese Bedingungen oder geltendes Recht verstoßen wird.'),
    h('h2', null, '7. Laufzeit der Inserate'), h('p', null, 'Inserate laufen 90 Tage und können verlängert werden. Abgelaufene Inserate werden nach 30 Tagen gelöscht.'))
}

export async function renderPrivacy(_r: Route): Promise<HTMLElement> {
  return page('Datenschutzerklärung',
    draft('Gerüst mit den vorgesehenen Verarbeitungen – kein fertiger Text.'),
    h('h2', null, 'Verantwortlicher'), h('p', null, `${NAME}, E-Mail: `, mail(), ', Kontaktformular: ', h('a', { href: '/kontakt' }, 'Kontakt')),
    h('h2', null, 'Welche Daten wir verarbeiten und warum'),
    h('ul', null,
      h('li', null, h('strong', null, 'Konto: '), 'E-Mail-Adresse, optional Name und Telefonnummer – zur Anmeldung und Nutzung (Vertragserfüllung, Art. 6 Abs. 1 lit. b DSGVO).'),
      h('li', null, h('strong', null, 'Inserate: '), 'Angaben zum Objekt, Fotos (ohne Standortdaten), Hausnummer nur für den Inserenten, Kontaktdaten nur nach Auswahl und nur für angemeldete Nutzer. Die Fotos liegen im Bildspeicher und sind unter ihrer Bild-Adresse für jeden abrufbar, der diese Adresse kennt – auch vor der Freigabe eines Inserats und nach einer Sperre. Löschen Sie ein Inserat, löschen wir auch seine Fotos.'),
      h('li', null, h('strong', null, 'Nachrichten: '), 'Inhalt und Zeitpunkt, zur Weiterleitung an den Inserenten.'),
      h('li', null, h('strong', null, 'Meldungen: '), 'Inhalt, ggf. Name und E-Mail des Meldenden (rechtliche Verpflichtung nach dem Digital Services Act).'),
      h('li', null, h('strong', null, 'Sicherheit: '), 'Zugriffsprotokolle, Zähler für Kontaktaufrufe und Nachrichten (berechtigtes Interesse, Betrugs- und Spam-Abwehr).'),
      h('li', null, h('strong', null, 'Kontaktformular: '), 'Name, E-Mail-Adresse und Nachricht, nur um Ihnen zu antworten (Art. 6 Abs. 1 lit. b bzw. f DSGVO). Zur Spam-Abwehr zählen wir die Nachrichten je Adresse; eine IP-Adresse speichern wir dafür nicht.'),
      h('li', null, h('strong', null, 'Reichweitenmessung: '), 'Keine. Wir messen keine Besucherzahlen und setzen keine Statistik- oder Tracking-Dienste ein.')),
    h('h2', null, 'Empfänger / Auftragsverarbeiter'), h('ul', null,
      h('li', null, h('strong', null, 'Supabase '), '(Datenbank, Anmeldung samt Versand der Anmelde-E-Mails, Bildspeicher; Rechenzentrum in Frankfurt am Main).'),
      h('li', null, h('strong', null, 'Cloudflare '), '(Auslieferung der Seiten und Schutz vor Missbrauch).'),
      h('li', null, h('strong', null, 'Proton '), '(E-Mail-Postfach, über das wir Ihre Nachrichten an kontakt.freihaus@proton.me empfangen).')),
    h('p', null, 'Mit den Dienstleistern schließen wir Auftragsverarbeitungsverträge. Darüber hinaus geben wir Daten nicht weiter.'),
    h('h2', null, 'Ihre Rechte'), h('p', null, 'Auskunft, Berichtigung, Löschung, Einschränkung, Übertragbarkeit, Widerspruch und Beschwerde bei der Aufsichtsbehörde. Wenden Sie sich dafür an ', mail(), '.'),
    h('h2', null, 'Cookies'), h('p', null, 'FreiHaus setzt nur technisch notwendige Speicherungen (z. B. Anmeldung). Es gibt keine Werbe- oder Tracking-Cookies, deshalb keinen Cookie-Banner. Schriften liegen auf unserem Server.'))
}

export async function renderImprint(_r: Route): Promise<HTMLElement> {
  return page('Impressum',
    draft('Pflichtangaben nach § 5 DDG. Eine ladungsfähige Anschrift ist hier bewusst nicht angegeben; für einen echten Betrieb schreibt das Gesetz sie vor, ohne sie ist das Impressum nicht vollständig.'),
    h('p', null, NAME),
    h('p', null, 'E-Mail: ', mail(), h('br'), 'Zweiter Kontaktweg: ', h('a', { href: '/kontakt' }, 'Kontaktformular')),
    h('p', null, 'Kontaktstelle für Behörden und Nutzer nach Digital Services Act (Art. 11, 12): ', mail(), ', Sprache: Deutsch.'))
}

export async function renderA11y(_r: Route): Promise<HTMLElement> {
  return page('Barrierefreiheit',
    draft('Bitte mit dem tatsächlichen Prüfstand ergänzen.'),
    h('p', null, 'Wir möchten, dass alle FreiHaus nutzen können, und richten uns nach den Web Content Accessibility Guidelines (WCAG 2.1, Stufe AA). Dazu gehören gut lesbare Schrift, ausreichende Kontraste, Bedienung per Tastatur und Zuordnung aller Formularfelder. Status werden nie allein über Farbe angezeigt.'),
    h('h2', null, 'Stand der Prüfung (8. November 2026)'),
    h('p', null, 'Wir haben alle Seiten selbst automatisch geprüft, am Rechner und in Handybreite (375 Pixel). Geprüft wurden: Seitensprache und Seitentitel, Überschriftenstruktur, Seitenbereiche (Kopf, Navigation, Inhalt, Fuß), Beschriftung aller Formularfelder, Namen von Knöpfen und Links, Textalternativen für Bilder, Farbkontraste (mindestens 4,5:1 für Text, 3:1 für große Schrift), Mindestgröße der Klickflächen (24 Pixel) und seitliches Scrollen. Ergebnis: keine Abweichungen.'),
    h('p', null, 'Nicht geprüft sind die Bedienung mit einem Screenreader, die vollständige Tastaturbedienung von Hand, 200 % Vergrößerung und die Bildinhalte der Inserate. Das Ergebnis ist deshalb keine Konformitätserklärung. Barrieren melden Sie uns bitte per ', h('a', { href: '/kontakt' }, 'Kontaktformular'), ' oder an ', mail(), '.'))
}

export async function renderNotFound(_r: Route): Promise<HTMLElement> {
  setTitle('Seite nicht gefunden')
  return h('div', { class: 'wrap section' }, h('h1', null, 'Diese Seite gibt es nicht'), h('p', null, h('a', { href: '/' }, '← Zur Startseite')))
}
