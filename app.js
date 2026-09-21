/* ============================================================
   Eichhörnchenklasse — Digitale Klassen-Pinnwand
   Vanilla JS, kein Build-Schritt. Backend: Supabase (REST + RPC).
   Alle Schreibzugriffe laufen über die RPC-Funktionen aus
   supabase/schema.sql — dort liegen Validierung und Limits.
   ============================================================ */

(() => {
"use strict";

/* ---------- Konfiguration ---------- */

const cfg = window.PINNWAND_CONFIG || {};
const configured =
  /^https:\/\/.+/.test(cfg.SUPABASE_URL || "") &&
  (cfg.SUPABASE_ANON_KEY || "").length > 20 &&
  !String(cfg.SUPABASE_URL).includes("HIER_") &&
  !String(cfg.SUPABASE_ANON_KEY).includes("HIER_");

const REST = () => `${cfg.SUPABASE_URL}/rest/v1`;
const AUTH = () => ({
  apikey: cfg.SUPABASE_ANON_KEY,
  Authorization: `Bearer ${cfg.SUPABASE_ANON_KEY}`,
});

const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const TRASH_DAYS = 30;

const TYPE_LABELS = {
  hinweis: "Hinweis",
  termin: "Termin",
  liste: "Liste",
  tabelle: "Tabelle",
  umfrage: "Umfrage",
  datei: "Datei",
};


// Kleines, einheitliches Icon-Set (ersetzt Emojis für ein ruhigeres Bild).
const ICONS = {
  arrowUp: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="10" y1="15.5" x2="10" y2="4.5"/><polyline points="5,9.5 10,4.5 15,9.5"/></svg>`,
  hinweis: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="10" cy="10" r="7.25"/><line x1="10" y1="9" x2="10" y2="14"/><circle cx="10" cy="6.3" r="0.9" fill="currentColor" stroke="none"/></svg>`,
  termin: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4.2" width="14" height="12" rx="2"/><line x1="3" y1="8" x2="17" y2="8"/><line x1="6.5" y1="2.5" x2="6.5" y2="5.5"/><line x1="13.5" y1="2.5" x2="13.5" y2="5.5"/></svg>`,
  datei: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 2.8h6l3 3v10.4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3.8a1 1 0 0 1 1-1z"/><path d="M12 2.8v3h3"/></svg>`,
  image: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3.5" width="14" height="13" rx="1.8"/><circle cx="7.3" cy="8" r="1.4"/><path d="M3.8 14.5l4-4.3 2.6 2.6 2.4-3 3.4 4.7"/></svg>`,
  link: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M8.3 11.7a3 3 0 0 0 4.5.3l1.8-1.8a3 3 0 0 0-4.3-4.3l-1 1"/><path d="M11.7 8.3a3 3 0 0 0-4.5-.3L5.4 9.8a3 3 0 0 0 4.3 4.3l1-1"/></svg>`,
  menu: `<svg viewBox="0 0 20 20" fill="currentColor"><circle cx="4.5" cy="10" r="1.6"/><circle cx="10" cy="10" r="1.6"/><circle cx="15.5" cy="10" r="1.6"/></svg>`,
  pin: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M10 17.5s6-5.6 6-10a6 6 0 1 0-12 0c0 4.4 6 10 6 10z"/><circle cx="10" cy="7.4" r="2.1"/></svg>`,
  chevron: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 4.5l6 5.5-6 5.5"/></svg>`,
  bell: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8a5 5 0 0 1 10 0c0 3.2 1 4.3 1.4 4.8H3.6C4 12.3 5 11.2 5 8z"/><path d="M8.2 15.5a1.8 1.8 0 0 0 3.5 0"/></svg>`,
  arrowLeft: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="12,4.5 6,10 12,15.5"/></svg>`,
  folder: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M2.8 5.3a1 1 0 0 1 1-1h3.6l1.4 1.7h6.4a1 1 0 0 1 1 1v7.3a1 1 0 0 1-1 1H3.8a1 1 0 0 1-1-1z"/></svg>`,
  beteiligung: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="7.25"/><path d="M6.6 10.2l2.2 2.2 4.6-4.8"/></svg>`,
  warning: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3.2l8 14H2z"/><line x1="10" y1="8.3" x2="10" y2="12.3"/><circle cx="10" cy="14.6" r=".9" fill="currentColor" stroke="none"/></svg>`,
  check: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="4.5,10.5 8,14 15.5,6"/></svg>`,
  home: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3.2 9.2L10 3.5l6.8 5.7"/><path d="M4.8 8v7.5a1 1 0 0 0 1 1h8.4a1 1 0 0 0 1-1V8"/></svg>`,
  kalender: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4.2" width="14" height="12" rx="2"/><line x1="3" y1="8" x2="17" y2="8"/><line x1="6.5" y1="2.5" x2="6.5" y2="5.5"/><line x1="13.5" y1="2.5" x2="13.5" y2="5.5"/><circle cx="7.3" cy="11.3" r=".9" fill="currentColor" stroke="none"/></svg>`,
  // Wie das "Teilen"-Symbol in Safari auf dem iPhone (Installations-Hinweis).
  iosShare: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7H5.5a1 1 0 0 0-1 1v8.5a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1H13"/><line x1="10" y1="2.5" x2="10" y2="12"/><polyline points="6.8,5.6 10,2.5 13.2,5.6"/></svg>`,
  install: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5.5" y="2.5" width="9" height="15" rx="1.8"/><line x1="10" y1="6.5" x2="10" y2="12.5"/><polyline points="7.6,10.2 10,12.6 12.4,10.2"/></svg>`,
};

/* ---------- Versionshinweise ---------- */

// Neueste zuerst. Für jedes Update ein Eintrag mit Datum und kurzen,
// elternfreundlichen Stichpunkten — öffnet sich nicht von selbst, ein
// Punkt am "Mehr"-Knopf zeigt, dass es Neues gibt (siehe checkForNewVersion).
const VERSIONS = [
  {
    version: "21.09.2026",
    items: [
      "Termine können jetzt eine Endzeit haben: „18:30–20:00 Uhr“. Auch im Kalender und im Kalender-Abo endet der Termin dann zur richtigen Zeit.",
      "Bei wiederkehrenden Terminen gibt es ebenfalls eine Endzeit. Ein Tipp auf den Kalendertag zeigt jetzt auch die Uhrzeit.",
      "Angepinnte Termine (auch wiederkehrende) stehen auf der Startseite unter dem Stundenplan, je Termin in einer Zeile.",
      "Fehler im Kalender behoben: Bei manchen Monaten fehlten die letzten Tage (z. B. 28.–30. September).",
      "Wiederkehrende Ereignisse und Ferien stehen jetzt als eigene Zeilen unter dem Kalender. Admins können sie dort bearbeiten, anpinnen (wiederkehrende) und löschen. Außerdem behoben: Ferien ließen sich in der App nicht speichern.",
      "Karten verknüpfen: Jede Karte (Termin, Umfrage, Liste, Tabelle, Hinweis, Datei) lässt sich mit einer anderen verbinden — über „Verknüpfen …“ im Menü der Karte oder schon beim Anlegen. Verknüpfte Karten erscheinen unten als „Verknüpft mit …“ und lassen sich antippen.",
      "Neue Symbole: Jede Klasse hat ihr Tier (Eichhörnchen, Schmetterling), auf dem Startbildschirm und in Benachrichtigungen. Auf dem iPhone erscheint das neue Symbol, wenn die App einmal vom Startbildschirm gelöscht und neu hinzugefügt wird.",
    ],
  },
  {
    version: "19.09.2026",
    items: [
      "Neu: Anmeldung mit einem Passwort. Gib einmal den Namen deiner Klasse ein und du landest direkt in deinem Bereich. Zum Wechseln: „Mehr“ → „Abmelden / Klasse wechseln“.",
      "Die Kopfzeile mit Titel und Suche bleibt beim Scrollen oben stehen.",
      "Feedback geben geht jetzt über den runden Knopf oben neben der Suche.",
      "Alle Termine automatisch im eigenen Kalender: unter dem Monatskalender einmal abonnieren, neue und geänderte Termine kommen dann von selbst.",
      "Tipp auf der Startseite, wie du die Pinnwand als App speicherst — lässt sich wegklicken.",
      "Ältere Hinweise sind eingeklappt, damit das Aktuelle oben bleibt.",
      "„Sprache · Language“ im Mehr-Menü erklärt, wie der Browser die Pinnwand übersetzt.",
    ],
  },
  {
    version: "18.09.2026",
    items: [
      "Neue Startseite: oben steht, was als Nächstes ansteht und was auf dich wartet, darunter alle Hinweise als Liste zum Aufklappen — kein Durchwischen mehr.",
      "Neu seit deinem letzten Besuch: neue Einträge haben einen Punkt, die Fußleiste zeigt, in welchem Bereich es Neues gibt.",
      "Aufgaben haken sich jetzt von selbst ab, sobald du abgestimmt oder dich eingetragen hast. Hinweis-Aufgaben hakst du mit dem Kreis ab, ein zweiter Tipp macht es rückgängig.",
      "Beteiligung ist aufgeteilt in „Noch offen für dich“ und „Schon mitgemacht“.",
      "Termine zeigen jetzt Wochentag, Uhrzeit und Ort auf einen Blick. „Zum Kalender hinzufügen“ ist ein einziger Knopf.",
      "Bei Umfragen mit nur einer Antwort reicht ein Tipp zum Abstimmen.",
      "Foto-Ordner zeigen die Bilder als Vorschau-Raster, der Kalender markiert Termintage mit Punkten.",
      "Kein Begrüßungsfenster mehr beim Öffnen.",
      "Neu im Mehr-Menü: „Große Schrift“ und „Feedback“.",
      "Listen, Tabellen und Umfragen können auf Wunsch eine feste Platzzahl haben — wer danach dazukommt, steht als „Springer“ bereit.",
    ],
  },
  {
    version: "24.08.2026",
    items: [
      "Neu: Begrüßungstext oben auf der Startseite — nennt automatisch die Klasse und zeigt den nächsten Elternabend an, sobald ein Termin mit diesem Namen ansteht.",
      "Der aktuelle Hinweis ist jetzt wie ein angepinnter Zettel gestaltet, deutlich abgesetzt vom Rest der Startseite.",
      "Nächster Termin und Aufgaben stehen jetzt als zwei schlanke Kacheln nebeneinander statt untereinander — mehr passt auf einen Blick.",
      "Das Dashboard passt sich jetzt der Bildschirmgröße an, damit möglichst alles ohne Scrollen sichtbar ist.",
      "Der „Nach oben\"-Pfeil erscheint jetzt erst nach längerem Scrollen und überdeckt nicht mehr die drei Bubbles.",
      "Neu: gemeinsame Ordner in der Datei-Rubrik (🏫) — Ordner lassen sich jetzt auch für beide Klassen zusammen anlegen, nicht mehr nur für eine einzelne.",
    ],
  },
  {
    version: "22.08.2026",
    items: [
      "Neu: Ordner in der Datei-Rubrik — Dateien lassen sich jetzt in Ordnern sammeln.",
      "Neu: jede Karte zeigt jetzt auch, wann und von wem sie zuletzt bearbeitet wurde.",
      "Neu: dieses Versions-Fenster — zeigt nach einem Update kurz, was sich geändert hat.",
      "Feste Leiste unten (Pinnwand/Archiv/Papierkorb/Version) statt Menü oben rechts — mit dem Daumen leichter erreichbar.",
      "Push-Benachrichtigungen öffnen jetzt zuverlässiger die App beim Antippen.",
      "Neu: Dateien lassen sich per „In Ordner verschieben\" direkt umsortieren.",
      "Neu: Kurznachrichten — Hinweise lassen sich als kompakter Chat-Feed oben in der Hinweis-Rubrik anzeigen.",
      "Umfrage, Liste und Tabelle laufen jetzt zusammen unter der neuen Rubrik „Beteiligung\".",
      "Neu: Einträge jeder Art lassen sich jetzt manuell ins Archiv verschieben und wieder zurückholen.",
      "Neu: eigenes, zartblaues Design für alle, die über den Schmetterlingsklasse-Link kommen.",
      "Neu: Startseite als Dashboard — Hinweise zum Durchwischen, der nächste Termin und offene Aufgaben auf einen Blick, darunter drei Blasen zu Termin, Beteiligung und Datei.",
      "Neu: Aufgaben — bei Hinweisen, Umfragen, Listen und Tabellen lässt sich „Als Aufgabe markieren\" ankreuzen; jede*r kann sie für sich selbst auf „erledigt\" setzen.",
      "Neu: die Termin-Rubrik zeigt jetzt schlanke Streifen mit Zeitstrahl (Diese Woche/In 2 Wochen/…) — antippen klappt die Details auf.",
      "Die drei Bubbles schweben jetzt fest über der Fußleiste, statt mit dem Feed mitzuscrollen.",
      "Der aktuelle Hinweis auf der Startseite ist jetzt als angepinnter Zettel gestaltet, klar abgesetzt vom Rest.",
      "Die Aufgaben-Übersicht auf der Startseite bleibt jetzt dauerhaft sichtbar, auch ohne offene Aufgabe.",
      "Neu: das Archiv zeigt alle Einträge erst eingeklappt als Streifen — antippen klappt die Details auf, bessere Übersicht bei vielen Einträgen.",
    ],
  },
  {
    version: "19.08.2026",
    items: [
      "Wer über einen Klassen-Link kommt, kann jetzt nur noch bei Umfragen, Listen und Tabellen mitmachen — neue Karten anlegen bleibt der Lehrkraft bzw. dem Hauptlink vorbehalten.",
      "Jede Karte zeigt jetzt an, von wem sie erstellt wurde.",
      "Beim Scrollen verschwinden die Rubriken-Kacheln, ein Pfeil-Button bringt wieder nach oben.",
    ],
  },
];

/* ---------- Zustand ---------- */

let cards = [];
let view = "feed";        // dashboard | feed | archiv | papierkorb | dateien
let loaded = false;
let classesList = [];     // aus DB geladen: [{id, slug, name}, ...]
let foldersList = [];     // aus DB geladen: [{id, class_id, name, created_by}, ...]
let scheduleSlots = [];   // Stundenplan: [{id, class_id, weekday, period, start_time, end_time, subject, room}, ...]
let cardLinks = [];       // allgemeine Verknüpfungen (Migration 033): [{card_a, card_b}, ...]
let recurringEvents = []; // wiederkehrende Termine: [{id, class_id, weekday, start_time, title, body}, ...]
let schoolHolidays = [];  // Ferien/freie Tage: [{id, label, start_date, end_date}, ...]
// Kalender-Ansicht (siehe renderKalenderView): Monat, der gerade angezeigt
// wird (immer der 1. des Monats).
let calendarMonth = null;
// Ordner-Unterseite (Rubrik "Datei", siehe renderFolderView): undefined =
// Ordner-Raster, "" = Inhalt von "Ohne Ordner", sonst eine Ordner-Id.
let openFolderId;
// Welcher Termin-Streifen gerade aufgeklappt ist (siehe renderMonatsTermine)
// — null/undefined = keiner.
let openTerminId;
// Dasselbe fürs Archiv (siehe renderArchivView) — eigener Zustand, weil
// beide Ansichten unabhängig voneinander offen/zu sein können.
let openArchivId;
// Und für die Hinweis-Liste auf der Startseite (siehe renderHinweisList).
let openHinweisId;

// Karten-Id aus einem "#karte-<id>"-Link (Push-Klick, Teilen-Link), die
// erst aufgelöst werden kann, sobald die Karten geladen sind — siehe
// applyInitialHash()/openCardById() und den Aufruf in reload().
let pendingCardId = null;
// Verhindert, dass render() während eines popstate (Zurück/Vorwärts) einen
// neuen Verlaufseintrag erzeugt — siehe syncHistory()/popstate-Listener.
let suppressHistoryPush = false;
// Erster Aufruf von syncHistory() ersetzt den Verlaufseintrag statt einen
// neuen anzulegen (kanonisiert z. B. einen "#karte-…"-Link zur passenden
// Ansicht, ohne die Zurück-Taste mit einem Zwischenschritt zu belasten).
let firstHistorySyncDone = false;
// Richtung für die Übergangsanimation (ideen-backlog.md #5): "forward" bei
// jeder normalen Navigation (Standard), "back" nur direkt nach einem
// popstate (Zurück/Vorwärts-Taste/-Geste) — siehe render()/popstate-Listener.
let navDirection = "forward";

// Welche Klasse gerade "meine" ist — rein clientseitiger Anzeigefilter,
// kein echter Zugriffsschutz (der kommt später mit Einmal-Codes, siehe
// plan-mehrklassen-dashboard.md). "" = beide Klassen anzeigen.
const CLASS_KEY = "pinnwand_meine_klasse";
let activeClassId = localStorage.getItem(CLASS_KEY) || "";
// Per Klassen-Link (?klasse=eichhoernchen / ?klasse=schmetterling) einmal
// geöffnet, sperrt dieses Gerät dauerhaft auf die jeweilige Klasse (siehe
// applyClassLink) — bewusst nur eine bequeme Voreinstellung, kein
// Datenbankschutz. Wer den Link ohne "?klasse=" öffnet (z. B. Geschwister
// in beiden Klassen, oder die Lehrkraft), behält die volle Auswahl.
const CLASS_LOCK_KEY = "pinnwand_klasse_gesperrt";
// Schalter "Anmeldung für alle" (Nutzerwunsch 21.09.2026, migration-029): liegt
// in der Datenbank, damit er ohne neue Veröffentlichung umgelegt werden kann.
// AUS (Standard) = Verhalten wie die bisherige Live-Version (Klassen-Link
// sperrt das Gerät, Admin-Zugang freiwillig über "Mehr"). AN = Anmeldefenster.
// Der zuletzt bekannte Wert wird gemerkt, falls der Abruf mal scheitert.
const LOGIN_PFLICHT_KEY = "pinnwand_login_pflicht";
let loginPflicht = localStorage.getItem(LOGIN_PFLICHT_KEY) === "1";
let classLocked = localStorage.getItem(CLASS_LOCK_KEY) === "1";
// Merkt sich, über welchen Klassen-Link gesperrt wurde, damit das
// zartblaue Schmetterlings-Design (siehe applyClassTheme) schon beim
// Laden gesetzt werden kann, ohne auf die asynchron geladene Klassenliste
// warten zu müssen (sonst kurzes Aufblitzen der falschen Farbe).
const CLASS_SLUG_KEY = "pinnwand_klasse_slug";
function applyClassTheme(slug) {
  const isSchmetterling = slug === "schmetterling";
  document.documentElement.classList.toggle("theme-schmetterling", isSchmetterling);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = isSchmetterling ? "#4d80ad" : "#b1552a";
}
if (classLocked && localStorage.getItem(CLASS_SLUG_KEY) === "schmetterling") {
  applyClassTheme("schmetterling");
}

// ideen-backlog.md #19: Admin-Rechte am Hauptlink brauchen jetzt zusätzlich
// ein gemeinsames Passwort (serverseitig geprüft, siehe migration-021) —
// der Hauptlink allein reicht nicht mehr. Auf einem Klassen-Link
// (classLocked) gibt es ohnehin nie Admin-Rechte, dort bleibt der Wert
// bewusst leer. Das eingegebene Passwort wird geräteseitig gemerkt, damit
// nicht bei jedem Besuch neu gefragt wird (gleiches Prinzip wie
// CLASS_LOCK_KEY oben) — echten Schutz bietet die Datenbank, nicht dieses
// Merken.
const ADMIN_CODE_KEY = "pinnwand_admin_code";
let adminCode = classLocked ? "" : (localStorage.getItem(ADMIN_CODE_KEY) || "");
function isAdmin() { return !classLocked && !!adminCode; }
// Merkt sich den zuletzt eingetragenen Ersteller-Namen als Vorschlag für die
// nächste neue Karte (Lehrkraft/Elternsprecher legen meist mehrere Karten
// hintereinander an und müssten sonst jedes Mal neu tippen).
const CREATOR_NAME_KEY = "pinnwand_ersteller_name";
// Merkt sich den zuletzt beim Abstimmen einer namentlichen Umfrage
// eingegebenen Namen — eigener Schlüssel statt CREATOR_NAME_KEY, weil
// hier meist Eltern/Kinder abstimmen, nicht Lehrkraft/Elternsprecher.
const VOTER_NAME_KEY = "pinnwand_waehler_name";
const CLASS_ICON = { eichhoernchen: "🐿️", schmetterling: "🦋" };

// Wer eine Aufgabe (siehe is_aufgabe) für sich selbst erledigt hat, merkt
// das rein geräteseitig — wie die Doppelstimmen-Sperre bei Umfragen. Keine
// Rückmeldung an die Klasse, kein Konten-System.
const AUFGABEN_ERLEDIGT_KEY = "pinnwand_aufgaben_erledigt";
function loadAufgabenErledigt() {
  try { return JSON.parse(localStorage.getItem(AUFGABEN_ERLEDIGT_KEY)) || {}; }
  catch { return {}; }
}
function isAufgabeErledigt(id) {
  return !!loadAufgabenErledigt()[id];
}
function setAufgabeErledigt(id, done) {
  const map = loadAufgabenErledigt();
  if (done) map[id] = true; else delete map[id];
  localStorage.setItem(AUFGABEN_ERLEDIGT_KEY, JSON.stringify(map));
}

// Design-Review 18.09.2026: Wer bei einer Liste oder Tabelle mitgemacht hat
// (eingetragen, abgehakt, Zeile ergänzt), merkt sich das Gerät — Einträge
// tragen keine Geräte-Kennung, anders als Umfrage-Stimmen (device_token).
// Grundlage für "Noch offen für dich"/"Schon mitgemacht" und dafür, dass
// eine als Aufgabe markierte Beteiligung sich mit dem Mitmachen selbst abhakt.
const MITGEMACHT_KEY = "pinnwand_mitgemacht";
function loadMitgemacht() {
  try { return JSON.parse(localStorage.getItem(MITGEMACHT_KEY)) || {}; }
  catch { return {}; }
}
function markMitgemacht(cardId) {
  if (!cardId) return;
  const map = loadMitgemacht();
  map[cardId] = true;
  localStorage.setItem(MITGEMACHT_KEY, JSON.stringify(map));
}
function hatMitgemacht(c) {
  if (c.type === "umfrage") {
    return (c.poll_options || []).some((o) => (o.poll_votes || []).some((v) => v.device_token === deviceToken));
  }
  return !!loadMitgemacht()[c.id];
}
const BETEILIGUNG_TYPES = ["umfrage", "liste", "tabelle"];
function aufgabeErledigt(c) {
  return isAufgabeErledigt(c.id) || (BETEILIGUNG_TYPES.includes(c.type) && hatMitgemacht(c));
}
// Was auf dieses Gerät wartet: offene Aufgaben plus Umfragen ohne eigene
// Stimme (Abstimmen ist anders als Eintragen in eine Liste der Normalfall).
function wartetAufDich(list) {
  return list.filter((c) => (c.is_aufgabe && !aufgabeErledigt(c)) ||
    (c.type === "umfrage" && !hatMitgemacht(c)));
}

// Design-Review 18.09.2026: "Neu seit deinem letzten Besuch", rein
// geräteseitig wie die Ordner-Markierung. Maßstab (threshold) ist der
// Zeitpunkt, an dem dieses Gerät zuletzt aktiv war, bevor der jetzige
// Besuch begann. Ein Besuch endet erst nach mindestens 5 Minuten ohne
// Aktivität — Neuladen (auch das automatische nach einem App-Update) oder
// ein kurzer App-Wechsel gehören zum selben Besuch, sonst wären die
// Neu-Punkte weg, bevor man sie angesehen hat. Beim allerersten Besuch ist
// nichts "neu" (sonst wäre alles markiert).
const VISIT_KEY = "pinnwand_besuch";
const NEW_VISIT_AFTER_MS = 5 * 60 * 1000;
let newSince = null;
let seenTabsThisVisit = new Set();
function loadVisit() {
  try { return JSON.parse(localStorage.getItem(VISIT_KEY)); }
  catch { return null; }
}
function saveVisit(v) {
  localStorage.setItem(VISIT_KEY, JSON.stringify(v));
}
function rememberVisitEnd() {
  const v = loadVisit();
  if (!v) return;
  v.lastActive = new Date().toISOString();
  saveVisit(v);
}
// true, wenn gerade ein neuer Besuch begonnen hat.
function beginVisit() {
  const v = loadVisit();
  const now = new Date().toISOString();
  if (v && v.lastActive && Date.now() - new Date(v.lastActive).getTime() < NEW_VISIT_AFTER_MS) {
    newSince = v.threshold ? new Date(v.threshold) : null;
    seenTabsThisVisit = new Set(v.seenTabs || []);
    v.lastActive = now;
    saveVisit(v);
    return false;
  }
  const threshold = v && v.lastActive ? v.lastActive : null;
  newSince = threshold ? new Date(threshold) : null;
  seenTabsThisVisit = new Set();
  saveVisit({ threshold, lastActive: now, seenTabs: [] });
  return true;
}
function markTabSeen(tab) {
  if (seenTabsThisVisit.has(tab)) return;
  seenTabsThisVisit.add(tab);
  const v = loadVisit();
  if (!v) return;
  v.seenTabs = [...seenTabsThisVisit];
  saveVisit(v);
}
function isNew(c) {
  return !!newSince && !c.trashed_at && new Date(c.created_at) > newSince;
}
const NEU_DOT = `<span class="neu-dot" role="img" aria-label="neu"></span>`;
const NEU_BADGE = `<span class="neu-badge">Neu</span>`;

const pollEditing = new Set();   // Karten-IDs, bei denen gerade Optionen gewählt werden
let editorState = null;          // { mode: 'create'|'edit', type, card, items }
let pendingLinkId = null;        // Karte, mit der die nächste neu angelegte Karte verknüpft wird (allgemeine Verknüpfung)
let pendingParentId = null;      // Termin-Id, mit der die nächste neu angelegte Karte verknüpft wird

// Geräte-Kennung für die Doppelstimmen-Sperre (zufällig, nicht personenbezogen)
const deviceToken = (() => {
  const KEY = "pinnwand_geraet";
  let t = localStorage.getItem(KEY);
  if (!t) {
    t = crypto.randomUUID();
    localStorage.setItem(KEY, t);
  }
  return t;
})();

// Zuletzt gesehene Version (siehe VERSIONS oben und checkForNewVersion).
const VERSION_SEEN_KEY = "pinnwand_version_gesehen";

/* ---------- DOM-Kurzgriffe ---------- */

const $ = (id) => document.getElementById(id);
const elFeed = $("feed");
const elEmpty = $("empty");
const elNotice = $("notice");
const elOfflineBanner = $("offlineBanner");
const elFab = $("fab");
const elMain = document.querySelector("main");
const elScrollTopBtn = $("scrollTopBtn");
const elClassSelect = $("classSelect");
const elClassLockedLabel = $("classLockedLabel");
const elBrandTitle = $("brandTitle");
const elViewTabs = $("viewTabs");
const dlgType = $("dlgType");
const dlgEditor = $("dlgEditor");
const dlgConfirm = $("dlgConfirm");
const dlgPrompt = $("dlgPrompt");
const dlgVersion = $("dlgVersion");
const dlgTranslate = $("dlgTranslate");
const dlgLogin = $("dlgLogin");
const dlgLink = $("dlgLink");
const elVersionBtn = $("moreVersionBtn");
const dlgMore = $("dlgMore");
const elMoreBtn = $("moreBtn");
const elFeedbackBadge = $("feedbackBadge");
const elFeedbackBtn = $("feedbackBtn");
const elAdminBtn = $("moreAdminBtn");
const elAdminBtnLabel = $("moreAdminBtnLabel");
const elArchivBtn = $("moreArchivBtn");
const elPapierkorbBtn = $("morePapierkorbBtn");
const dlgKalenderAdmin = $("dlgKalenderAdmin");
const elKalAdminBody = $("kalAdminBody");
const dlgSearch = $("dlgSearch");
const elSearchBtn = $("searchBtn");
const elSearchInput = $("searchInput");
const elSearchResults = $("searchResults");

/* ---------- Hilfsfunktionen ---------- */

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

// Text escapen und http(s)-Links anklickbar machen
function bodyHtml(s) {
  return esc(s).replace(/https?:\/\/[^\s<]+/g,
    (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
}

/* ---------- Rich-Text (nur Kartentyp "Hinweis") ----------
   WICHTIG: Der anon-Key liegt clientseitig offen — jede*r kann die RPCs
   direkt aufrufen und Bereinigung beim Speichern umgehen. Deshalb wird hier
   NICHT beim Speichern gefiltert, sondern bei JEDER Anzeige neu (auch beim
   erneuten Öffnen zum Bearbeiten) — nur so ist es wirklich sicher. */

const RTE_ALLOWED_TAGS = ["b", "strong", "i", "em", "u", "a", "br", "p", "div", "span", "img", "ul", "ol", "li"];
const RTE_ALLOWED_ATTR = ["href", "src", "alt"];

if (window.DOMPurify) {
  // Links aus Hinweis-Texten immer sicher öffnen, unabhängig davon, was
  // beim Erzeugen des Links im Editor gesetzt wurde.
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A") {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
  });
}

function sanitizeRich(html) {
  if (!window.DOMPurify) {
    // DOMPurify (CDN) ausnahmsweise nicht geladen: lieber nur Klartext
    // zeigen als ungefiltertes HTML durchzulassen.
    return esc(String(html ?? ""));
  }
  return DOMPurify.sanitize(String(html ?? ""),
    { ALLOWED_TAGS: RTE_ALLOWED_TAGS, ALLOWED_ATTR: RTE_ALLOWED_ATTR });
}

function parseISODate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function todayStart() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

function isPastTermin(c) {
  return c.type === "termin" && !!c.event_date && parseISODate(c.event_date) < todayStart();
}

// Enddatum (falls gesetzt) zählt für alle Kartentypen zusätzlich als
// Ablaufdatum — eine Karte gilt als abgelaufen, sobald der Termin selbst
// vorbei ist ODER das gesetzte Enddatum überschritten wurde.
function isExpired(c) {
  if (isPastTermin(c)) return true;
  return !!c.end_date && parseISODate(c.end_date) < todayStart();
}

// Manuelles Übersteuern der Archiv-Zugehörigkeit (siehe Migration 015) —
// "In Archiv verschieben"/"Aus Archiv zurückholen" im Kartenmenü setzt
// archived_override fest auf true/false, unabhängig vom Datum. null (noch
// nie manuell verschoben) heißt: automatisch nach Datum (isExpired).
function isArchived(c) {
  if (c.archived_override === true) return true;
  if (c.archived_override === false) return false;
  return isExpired(c);
}

// Das für die Archiv-Sortierung relevante "abgelaufen am"-Datum.
function expiryDate(c) {
  if (c.type === "termin" && c.event_date) return c.event_date;
  return c.end_date || null;
}

// ideen-backlog.md #43 (Council-Feature-Idee): dezenter Hinweis, wenn ein
// Termin oder eine Frist (end_date) innerhalb der nächsten 48 Std. endet —
// hilft, knapp befristete Umfragen/Termine nicht zwischen anderen Karten zu
// übersehen. Reine Anzeigelogik anhand vorhandener Datumsfelder, keine
// Datenbank-Änderung nötig.
function endsSoonBadge(c) {
  const dateStr = expiryDate(c);
  if (!dateStr) return "";
  const target = parseISODate(dateStr);
  const now = todayStart();
  const hoursLeft = (target - now) / 36e5;
  if (hoursLeft < 0 || hoursLeft > 48) return "";
  const label = hoursLeft < 24 ? "endet heute" : "endet morgen";
  return `<span class="ends-soon-badge">${esc(label)}</span>`;
}

// Sortierschlüssel fürs Dashboard: Wichtig zuerst, danach nach Datum
// (Termin-Datum bzw. Enddatum) aufsteigend, Karten ohne Datum ans Ende.
function dashboardSortDate(c) {
  return (c.type === "termin" && c.event_date) ? c.event_date : (c.end_date || null);
}
function dashboardSort(a, b) {
  const ai = a.important ? 1 : 0, bi = b.important ? 1 : 0;
  if (ai !== bi) return bi - ai;
  const ad = dashboardSortDate(a), bd = dashboardSortDate(b);
  if (ad && bd) return ad.localeCompare(bd);
  if (ad && !bd) return -1;
  if (!ad && bd) return 1;
  return String(a.created_at).localeCompare(String(b.created_at));
}

function fmtDateLong(s) {
  return parseISODate(s).toLocaleDateString("de-DE",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function fmtTimestamp(ts) {
  const d = new Date(ts);
  const datum = d.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
  const zeit = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  return `${datum}, ${zeit} Uhr`;
}

// Design-Review 18.09.2026: Eltern brauchen "wann ungefähr", keine Minute
// — Admins sehen weiterhin den genauen Zeitpunkt (siehe fmtCreated).
function fmtRelative(ts) {
  const d = new Date(ts);
  const days = Math.round((todayStart() - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
  if (days <= 0) return "heute";
  if (days === 1) return "gestern";
  if (days < 7) return `vor ${days} Tagen`;
  return `${d.getDate()}. ${MONTH_SHORT[d.getMonth()]}`;
}
function fmtCreated(ts) {
  return isAdmin() ? `Erstellt am ${fmtTimestamp(ts)}` : fmtRelative(ts);
}

function fmtTime(t) {
  return t ? `${t.slice(0, 5)} Uhr` : "";
}

// Termin-Zeit mit optionaler Endzeit (migration-030): "18:30–20:00 Uhr",
// ohne Endzeit wie bisher "18:30 Uhr", ohne Startzeit leer.
function fmtTimeRange(start, end) {
  if (!start) return "";
  return end ? `${start.slice(0, 5)}–${end.slice(0, 5)} Uhr` : `${start.slice(0, 5)} Uhr`;
}

function fmtSize(b) {
  return b >= 1048576
    ? `${(b / 1048576).toFixed(1).replace(".", ",")} MB`
    : `${Math.max(1, Math.round(b / 1024))} KB`;
}

function purgeDate(c) {
  const d = new Date(c.trashed_at);
  d.setDate(d.getDate() + TRASH_DAYS);
  return d;
}

function fileUrl(path) {
  const p = path.split("/").map(encodeURIComponent).join("/");
  return `${cfg.SUPABASE_URL}/storage/v1/object/public/dateien/${p}`;
}

// "heute" / "morgen" / "in 3 Tagen" — leichter zu erfassen als nur das Datum.
// Leerer String, wenn der Termin weiter als 6 Tage entfernt liegt (dann zählt
// nur das ausgeschriebene Datum).
function relativeDay(dateStr) {
  const d = Math.round((parseISODate(dateStr) - todayStart()) / 86400000);
  if (d === 0) return "heute";
  if (d === 1) return "morgen";
  if (d > 1 && d <= 6) return `in ${d} Tagen`;
  return "";
}

/* ---------- Kalender-Export (.ics + Google Kalender) ---------- */

function pad2(n) { return String(n).padStart(2, "0"); }

function icsLocal(d) {
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}T${pad2(d.getHours())}${pad2(d.getMinutes())}00`;
}

function icsEscape(s) {
  return String(s ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

// Liefert Start/Ende passend fürs .ics- bzw. Google-Format. Ohne Uhrzeit:
// ganztägig (Ende exklusiv, also der Folgetag). Mit Uhrzeit: bis zur Endzeit
// (migration-030), ohne Endzeit 1 Stunde Dauer.
function eventRange(c) {
  const [y, m, d] = c.event_date.split("-").map(Number);
  if (c.event_time) {
    const [hh, mm] = c.event_time.slice(0, 5).split(":").map(Number);
    const start = new Date(y, m - 1, d, hh, mm);
    let end = new Date(start.getTime() + 60 * 60 * 1000);
    if (c.event_end_time) {
      const [eh, em] = c.event_end_time.slice(0, 5).split(":").map(Number);
      const gewuenscht = new Date(y, m - 1, d, eh, em);
      if (gewuenscht > start) end = gewuenscht;
    }
    return { startLocal: icsLocal(start), endLocal: icsLocal(end), allDay: false };
  }
  const endD = new Date(y, m - 1, d + 1);
  return {
    startDay: `${y}${pad2(m)}${pad2(d)}`,
    endDay: `${endD.getFullYear()}${pad2(endD.getMonth() + 1)}${pad2(endD.getDate())}`,
    allDay: true,
  };
}

function downloadIcs(c) {
  const r = eventRange(c);
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Eichhoernchenklasse//Pinnwand//DE", "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${c.id}@eichhoernchenklasse-pinnwand`,
    `DTSTAMP:${icsLocal(new Date())}Z`,
    r.allDay ? `DTSTART;VALUE=DATE:${r.startDay}` : `DTSTART:${r.startLocal}`,
    r.allDay ? `DTEND;VALUE=DATE:${r.endDay}` : `DTEND:${r.endLocal}`,
    `SUMMARY:${icsEscape(c.title)}`,
    c.event_location ? `LOCATION:${icsEscape(c.event_location)}` : "",
    c.body ? `DESCRIPTION:${icsEscape(c.body)}` : "",
    "END:VEVENT", "END:VCALENDAR",
  ].filter(Boolean);
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(c.title || "termin").replace(/[^\w\-]+/g, "_").slice(0, 60) || "termin"}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function googleCalUrl(c) {
  const r = eventRange(c);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: c.title || "",
    dates: r.allDay ? `${r.startDay}/${r.endDay}` : `${r.startLocal}/${r.endLocal}`,
    ctz: "Europe/Berlin",
  });
  if (c.event_location) params.set("location", c.event_location);
  if (c.body) params.set("details", c.body);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

let toastTimer = null;
// ideen-backlog.md #43 (Council-Finding): einheitlicher Fallback zentral
// hier statt an jeder Aufrufstelle einzeln — sonst zeigt ein Fehler ohne
// .message (z. B. ein TypeError) buchstäblich "undefined" im Toast.
// ms: Anzeigedauer, falls längere Erklärungen mehr Lesezeit brauchen.
function toast(msg, isError = false, ms = 0) {
  const el = $("toast");
  el.textContent = msg || (isError ? "Etwas ist schiefgelaufen." : "");
  el.classList.toggle("error", isError);
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, ms || (isError ? 6000 : 3000));
}

function anyDialogOpen() {
  return [dlgType, dlgEditor, dlgConfirm, dlgPrompt, dlgVersion, dlgMore, dlgKalenderAdmin, dlgSearch, dlgTranslate, dlgLogin].some((d) => d && d.open);
}

/* ---------- API ---------- */

async function apiError(res) {
  let msg = `Fehler ${res.status}`;
  try {
    const j = await res.json();
    if (j && j.message) msg = j.message;
  } catch { /* Antwort war kein JSON */ }
  return new Error(msg);
}

async function fetchCards() {
  const params =
    "select=*,list_items(*),poll_options(*,poll_votes(*)),files(*),table_rows(*)" +
    "&order=pinned.desc,created_at.desc";
  const res = await fetch(`${REST()}/cards?${params}`, { headers: AUTH() });
  if (!res.ok) throw await apiError(res);
  const data = await res.json();
  for (const c of data) {
    (c.list_items || []).sort((a, b) =>
      a.position - b.position || String(a.created_at).localeCompare(String(b.created_at)));
    (c.poll_options || []).sort((a, b) => a.position - b.position);
    (c.table_rows || []).sort((a, b) =>
      a.position - b.position || String(a.created_at).localeCompare(String(b.created_at)));
  }
  return data;
}

async function fetchClasses() {
  const res = await fetch(`${REST()}/classes?select=*&order=name.asc`, { headers: AUTH() });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

async function fetchFolders() {
  const res = await fetch(`${REST()}/folders?select=*&order=name.asc`, { headers: AUTH() });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

async function fetchScheduleSlots() {
  const res = await fetch(`${REST()}/schedule_slots?select=*&order=weekday.asc,period.asc`, { headers: AUTH() });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

async function fetchRecurringEvents() {
  const res = await fetch(`${REST()}/recurring_events?select=*&order=weekday.asc,start_time.asc`, { headers: AUTH() });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

async function fetchCardLinks() {
  const res = await fetch(`${REST()}/card_links?select=card_a,card_b`, { headers: AUTH() });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

async function fetchSchoolHolidays() {
  const res = await fetch(`${REST()}/school_holidays?select=*&order=start_date.asc`, { headers: AUTH() });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

async function refreshLoginPflicht() {
  try {
    loginPflicht = (await rpc("get_login_pflicht")) === true;
    localStorage.setItem(LOGIN_PFLICHT_KEY, loginPflicht ? "1" : "0");
  } catch {
    // Funktion fehlt (Migration 029 nicht eingespielt) oder offline:
    // beim zuletzt bekannten Wert bleiben, sonst AUS.
  }
}

async function loadClasses() {
  try {
    classesList = await fetchClasses();
  } catch {
    classesList = [];
  }
  applyClassLink();
  renderClassSelect();
}

// Klassen-Link auswerten: "?klasse=<slug>" setzt die passende Klasse fest
// und sperrt sie für dieses Gerät (siehe Kommentar bei CLASS_LOCK_KEY oben).
//
// UX-Forschung 19.09.2026: Der Parameter bleibt jetzt in der Adresszeile
// (siehe syncClassInUrl), statt entfernt zu werden. Grund: Safari auf dem
// iPhone löscht den Gerätespeicher einer Seite, wenn man sie eine Weile
// nicht öffnet, und eine installierte Web-App hat dort einen eigenen
// Speicher. Mit der Klasse in Lesezeichen/App-Symbol stellt sie sich dann
// von selbst wieder her, statt auf "Beide Klassen" zu fallen.
//
// Nutzerwunsch 20.09.2026: Ein Klassen-Link sperrt das Gerät nicht mehr von
// selbst. Die Klasse legt allein die Anmeldung fest (askLogin) — so landet
// jeder mit seinem Passwort in seinem Bereich, egal welchen Link er hat, und
// ein weitergeleiteter Link stellt keine Klasse um. Der Link bringt nur noch
// das Klassen-Symbol/-Manifest mit (syncClassInUrl), sobald angemeldet.
//
// Nutzerwunsch 21.09.2026: Nur bei eingeschalteter Anmeldung (loginPflicht).
// Solange der Schalter AUS ist, gilt das frühere Verhalten: Ein Klassen-Link
// sperrt das Gerät auf die Klasse (ein weitergeleiteter Karten-Link einer
// anderen Klasse stellt eine schon festgelegte Klasse nicht um).
function applyClassLink() {
  const slug = new URLSearchParams(location.search).get("klasse");
  if (!loginPflicht && slug) {
    const cls = classesList.find((c) => c.slug === slug);
    const lockedSlug = classLocked ? localStorage.getItem(CLASS_SLUG_KEY) : null;
    const fremderTeilenLink = location.hash.startsWith("#karte-") && lockedSlug && lockedSlug !== slug;
    if (cls && !fremderTeilenLink) {
      activeClassId = cls.id;
      classLocked = true;
      localStorage.setItem(CLASS_KEY, activeClassId);
      localStorage.setItem(CLASS_LOCK_KEY, "1");
      localStorage.setItem(CLASS_SLUG_KEY, slug);
      applyClassTheme(slug);
    }
  }
  syncClassInUrl();
}

// Hält "?klasse=<slug>" in der Adresse passend zur festgelegten Klasse (oder
// entfernt ihn am Hauptlink) und wählt das passende App-Manifest, damit ein
// installiertes App-Symbol mit der richtigen Klasse startet.
function syncClassInUrl() {
  const slug = classLocked ? localStorage.getItem(CLASS_SLUG_KEY) : null;
  const params = new URLSearchParams(location.search);
  if (slug) params.set("klasse", slug); else params.delete("klasse");
  const qs = params.toString();
  const url = location.pathname + (qs ? `?${qs}` : "") + location.hash;
  if (url !== location.pathname + location.search + location.hash) {
    history.replaceState(history.state, "", url);
  }
  const link = document.querySelector('link[rel="manifest"]');
  const href = KLASSEN_MANIFESTE.has(slug) ? `manifest-${slug}.webmanifest` : "manifest.webmanifest";
  if (link && link.getAttribute("href") !== href) link.setAttribute("href", href);
  // Nutzerwunsch 21.09.2026: Reiter- und iPhone-Symbol passend zur Klasse
  // (Eichhörnchen, Schmetterling; ohne feste Klasse beide Tiere zusammen).
  // iOS liest das Symbol beim "Zum Home-Bildschirm"-Hinzufügen aus dieser Seite.
  const variante = KLASSEN_MANIFESTE.has(slug) ? slug : "beide";
  for (const [sel, datei] of [['link[rel="apple-touch-icon"]', `icons/apple-touch-icon-${variante}.png`],
                              ['link[rel="icon"]', `icons/favicon-${variante}.png`]]) {
    const el = document.querySelector(sel);
    if (el && el.getAttribute("href") !== datei) el.setAttribute("href", datei);
  }
}
const KLASSEN_MANIFESTE = new Set(["eichhoernchen", "schmetterling"]);

// Kachel-/Kartenfilter je nach gewählter Klasse: eigene Klasse + "Gemeinsam"
// (class_id null) sind sichtbar, die jeweils andere Klasse wird ausgeblendet.
// Bei "Beide Klassen" (activeClassId === "") ist alles sichtbar.
function inActiveClass(c) {
  return !activeClassId || c.class_id === activeClassId || !c.class_id;
}

function renderClassSelect() {
  if (!elClassSelect) return;
  if (classLocked) {
    // Nutzerwunsch 12.09.2026: kein <select> mehr, auch nicht deaktiviert —
    // ein Dropdown-Symbol würde weiterhin einen möglichen Wechsel
    // suggerieren. Stattdessen reiner, nicht anklickbarer Text.
    const cls = classesList.find((c) => c.id === activeClassId);
    elClassSelect.hidden = true;
    if (elClassLockedLabel) {
      // Design-Review 18.09.2026: Die Klasse steht schon als Seitentitel da
      // (updateBrandTitle) — die zweite, gleichlautende Zeile kostete nur
      // Platz. Sichtbar bleibt sie nur, falls die Klasse nicht auflösbar ist.
      elClassLockedLabel.hidden = !!cls;
      elClassLockedLabel.textContent = cls
        ? `${CLASS_ICON[cls.slug] || ""} ${cls.name}`
        : "Beide Klassen";
      elClassLockedLabel.title = "Über einen eigenen Link für diese Klasse geöffnet.";
    }
    updateBrandTitle();
    return;
  }
  elClassSelect.hidden = false;
  if (elClassLockedLabel) elClassLockedLabel.hidden = true;
  const opts = [`<option value="">Beide Klassen</option>`].concat(
    classesList.map((cl) =>
      `<option value="${cl.id}">${CLASS_ICON[cl.slug] || ""} ${esc(cl.name)}</option>`));
  elClassSelect.innerHTML = opts.join("");
  elClassSelect.value = activeClassId;
  updateBrandTitle();
}

function updateBrandTitle() {
  if (!elBrandTitle) return;
  const cls = classesList.find((c) => c.id === activeClassId);
  elBrandTitle.textContent = cls ? `${CLASS_ICON[cls.slug] || ""} ${cls.name}` : "🐿️🦋 Klassen-Pinnwand";
}

// ideen-backlog.md #19: Admin-Funktionen verlangen serverseitig (siehe
// migration-021) zusätzlich das gemeinsame Admin-Passwort. Statt an jeder
// einzelnen Aufrufstelle p_admin_code mitzugeben, wird es hier für die
// bekannten Admin-RPCs automatisch ergänzt — Aufrufstellen bleiben
// unverändert, und neue Admin-Funktionen müssen nur in dieses eine Set
// eingetragen werden.
const ADMIN_CODE_RPCS = new Set([
  "create_card", "update_card", "trash_card", "restore_card",
  "delete_card_forever", "empty_trash", "create_folder", "rename_folder",
  "delete_folder", "set_schedule", "create_recurring_event",
  "update_recurring_event", "delete_recurring_event", "set_school_holidays",
  "add_poll_option", "update_poll_option", "delete_poll_option",
  "list_feedback", "comment_feedback", "delete_feedback", "set_login_pflicht",
  "link_cards", "unlink_cards",
]);

async function rpc(name, args = {}) {
  const body = ADMIN_CODE_RPCS.has(name) ? { ...args, p_admin_code: adminCode } : args;
  const res = await fetch(`${REST()}/rpc/${name}`, {
    method: "POST",
    headers: { ...AUTH(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await apiError(res);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function uploadFile(file) {
  if (!ALLOWED_MIME.includes(file.type)) {
    throw new Error("Nur PDF, JPG, PNG oder WebP sind erlaubt.");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("Die Datei ist größer als 10 MB.");
  }
  const safeName = (file.name || "datei")
    .replace(/[^\w.\-]+/g, "_")
    .slice(-80) || "datei";
  const path = `${crypto.randomUUID()}/${safeName}`;
  const res = await fetch(
    `${cfg.SUPABASE_URL}/storage/v1/object/dateien/${path}`,
    {
      method: "POST",
      headers: { ...AUTH(), "Content-Type": file.type, "x-upsert": "false" },
      body: file,
    });
  if (!res.ok) throw await apiError(res);
  return { storage_path: path, filename: file.name, mime_type: file.type, size_bytes: file.size };
}

// ideen-backlog.md #43 (Council-Performance-Finding): der stille 60-Sekunden-
// Auto-Reload hat bisher bei JEDEM Tick komplett neu gerendert, auch wenn
// sich nichts geändert hat — riss aufgeklappte Hinweis-Karten zu und ließ
// die Scrollposition springen. Ein einfacher Signatur-Vergleich der frisch
// geladenen Daten entscheidet jetzt, ob ein Rerender überhaupt nötig ist.
// Bewusst kein `updated_at`-Vergleich (wäre günstiger), weil Stimmen/Zeilen/
// Listeneinträge das `updated_at` der Karte selbst nicht anheben — ein
// JSON.stringify-Vergleich ist immer noch um Größenordnungen billiger als
// das komplette Neu-Rendern. Ein erzwungener Render alle 10 Minuten fängt
// rein zeitabhängige Anzeigen ab (z. B. "endet heute"/"endet morgen",
// Tageswechsel), die sich ohne Datenänderung sonst nie aktualisieren würden.
let lastReloadSignature = null;
let lastForcedRenderAt = 0;
const FORCE_RENDER_INTERVAL_MS = 10 * 60 * 1000;

async function reload({ silent = false } = {}) {
  try {
    // Scheitert das Laden von Ordnern/Stundenplan/Ferien (z. B. Migration
    // noch nicht eingespielt), soll das die Karten selbst nicht blockieren.
    const [cardsData, foldersData, slotsData, recurringData, holidaysData, linksData] = await Promise.all([
      fetchCards(), fetchFolders().catch(() => foldersList),
      fetchScheduleSlots().catch(() => scheduleSlots),
      fetchRecurringEvents().catch(() => recurringEvents),
      fetchSchoolHolidays().catch(() => schoolHolidays),
      fetchCardLinks().catch(() => cardLinks),   // Migration 033 evtl. noch nicht eingespielt
    ]);
    const signature = JSON.stringify([cardsData, foldersData, slotsData, recurringData, holidaysData, linksData]);
    const now = Date.now();
    const mustForceRender = now - lastForcedRenderAt > FORCE_RENDER_INTERVAL_MS;
    const unchanged = silent && loaded && !pendingCardId && signature === lastReloadSignature && !mustForceRender;

    cards = cardsData;
    foldersList = foldersData;
    scheduleSlots = slotsData;
    recurringEvents = recurringData;
    schoolHolidays = holidaysData;
    cardLinks = linksData;
    loaded = true;
    elNotice.hidden = true;
    lastReloadSignature = signature;

    if (unchanged) return;
    lastForcedRenderAt = now;
    // Nur beim allerersten erfolgreichen Laden relevant — danach ist
    // pendingCardId schon geleert. openCardById() ruft render() selbst auf.
    if (pendingCardId) {
      const id = pendingCardId;
      pendingCardId = null;
      openCardById(id);
    } else {
      render();
    }
  } catch (err) {
    if (!silent) {
      elNotice.innerHTML =
        `<b>Verbindung fehlgeschlagen.</b><br>${esc(err.message)}<br>` +
        `<button class="btn small" style="margin-top:8px" data-action="retry">Nochmal versuchen</button>`;
      elNotice.hidden = false;
    }
  }
}

/* ---------- Sichtbare Karten je Ansicht ---------- */

function visibleCards() {
  if (view === "papierkorb") {
    return cards
      .filter((c) => c.trashed_at && purgeDate(c) > new Date() && inActiveClass(c))
      .sort((a, b) => String(b.trashed_at).localeCompare(String(a.trashed_at)));
  }
  if (view === "archiv") {
    return cards
      .filter((c) => !c.trashed_at && isArchived(c) && inActiveClass(c))
      .sort((a, b) => String(expiryDate(b) || b.created_at).localeCompare(String(expiryDate(a) || a.created_at)));
  }
  if (view === "dashboard") {
    return cards
      .filter((c) => !c.trashed_at && !isArchived(c) && inActiveClass(c))
      .sort(dashboardSort);
  }
  return cards.filter((c) => !c.trashed_at && !isArchived(c) && inActiveClass(c));
}

/* ---------- Rendering ---------- */

const MONTH_SHORT = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

function renderTermin(c, inTrash) {
  const d = parseISODate(c.event_date);
  const sub = [fmtTimeRange(c.event_time, c.event_end_time), c.event_location ? esc(c.event_location) : ""]
    .filter(Boolean).join(" · ");
  const rel = inTrash ? "" : relativeDay(c.event_date);
  // Design-Review 18.09.2026: ein Knopf mit Auswahl statt zwei gleichrangiger
  // Knöpfe — man muss nur wissen, welchen Kalender man selbst benutzt.
  const calActions = inTrash ? "" : `
    <details class="cal-add">
      <summary class="btn small ghost">${ICONS.termin}<span>Zum Kalender hinzufügen</span></summary>
      <div class="cal-add-menu">
        <button type="button" class="btn small ghost" data-action="ics-download" data-card="${c.id}">Apple-, Outlook- oder Handy-Kalender</button>
        <a class="btn small ghost" href="${googleCalUrl(c)}" target="_blank" rel="noopener noreferrer">Google Kalender</a>
      </div>
    </details>`;
  return `
    <div class="event-row">
      <div class="event-date-box"><b>${d.getDate()}</b><span>${MONTH_SHORT[d.getMonth()]}</span></div>
      <div class="event-info">
        <b>${esc(fmtDateLong(c.event_date))}</b>
        ${rel ? `<span class="event-relative">${rel}</span>` : ""}
        ${sub ? `<span>${sub}</span>` : ""}
      </div>
    </div>${calActions}`;
}

// Nutzerwunsch 14.09.2026: Kontingent/Springer bei Umfrage-Option, Liste
// (Modus "eintragen") und Tabelle — rein aus der Reihenfolge abgeleitet,
// keine eigene Datenbank-Spalte pro Eintrag/Stimme/Zeile. "index" ist die
// nullbasierte Position innerhalb der Anmeldungen (0 = zuerst).
function isSpringer(index, capacity) {
  return capacity != null && index >= capacity;
}
// Nutzerwunsch 18.09.2026 (Alltagstauglichkeits-Review): "title" allein
// zeigt die Erklärung nur bei Hover mit der Maus — auf dem Handy (also für
// die meisten Eltern) gibt es kein Hover, das Wort "Springer" stünde ohne
// jede Erklärung da. Jetzt ein antippbarer Button, der die Erklärung als
// Toast zeigt; title bleibt als Bonus für Maus-Nutzer erhalten.
const SPRINGER_BADGE = `<button type="button" class="springer-badge" data-action="explain-springer" title="Kontingent voll — zusätzlicher Springer">Springer</button>`;

function renderListe(c) {
  const items = c.list_items || [];
  let rows = "";
  if (c.list_mode === "abhaken") {
    for (const it of items) {
      rows += `
        <li>
          <label class="check-row">
            <input type="checkbox" data-action="item-check" data-item="${it.id}" ${it.checked ? "checked" : ""}>
            <span class="grow ${it.checked ? "done" : ""}">${esc(it.text)}</span>
          </label>
          <input type="text" class="who-input" data-action="item-who" data-item="${it.id}"
                 placeholder="Name (wer?)" maxlength="80" value="${esc(it.filled_by || "")}">
        </li>`;
    }
    const done = items.filter((i) => i.checked).length;
    const note = items.length
      ? `<div class="progress-note">${done} von ${items.length} erledigt</div>`
      : `<div class="progress-note">Noch keine Einträge.</div>`;
    return `<ul class="items abhaken">${rows}</ul>${note}`;
  }

  // Modus "eintragen" — jede Zeile hat dieselbe Spaltenstruktur
  // (Beschreibung / Name-oder-Aktion / X), egal ob vorgegeben oder frei
  // hinzugefügt. Kontingent (Nutzerwunsch 14.09.2026) zählt nur die frei
  // hinzugefügten Einträge, in der Reihenfolge, in der sie angelegt
  // wurden (items ist schon nach position/created_at sortiert) — ab
  // c.capacity gilt ein weiterer freier Eintrag als "Springer".
  let freeIdx = 0;
  let springerCount = 0;
  for (const it of items) {
    if (it.preset && !it.filled_by) {
      rows += `
        <li>
          <span class="grow">${esc(it.text)}</span>
          <button class="btn small" data-action="item-fill" data-item="${it.id}" data-text="${esc(it.text)}">Eintragen</button>
        </li>`;
    } else if (it.preset) {
      rows += `
        <li>
          <span class="grow">${esc(it.text)}</span>
          <span class="who">${esc(it.filled_by)}</span>
          <button class="icon-btn" data-action="item-unfill" data-item="${it.id}" data-who="${esc(it.filled_by)}" title="Eintrag entfernen">✕</button>
        </li>`;
    } else {
      const springer = isSpringer(freeIdx, c.capacity);
      if (springer) springerCount++;
      freeIdx++;
      rows += `
        <li>
          <span class="grow">${esc(it.text)}</span>
          <span class="who-wrap"><span class="who">${esc(it.filled_by || "")}</span>${springer ? SPRINGER_BADGE : ""}</span>
          <button class="icon-btn" data-action="item-delete" data-item="${it.id}" title="Eintrag löschen">✕</button>
        </li>`;
    }
  }
  const open = items.filter((i) => i.preset && !i.filled_by).length;
  const noteParts = [];
  if (open) noteParts.push(`${open} ${open === 1 ? "Platz" : "Plätze"} noch frei`);
  if (c.capacity != null) noteParts.push(`${Math.min(freeIdx, c.capacity)}/${c.capacity} Plätze belegt${springerCount ? ` · ${springerCount} Springer` : ""}`);
  const note = noteParts.length ? `<div class="progress-note">${noteParts.join(" · ")}</div>` : "";
  return `
    <ul class="items eintragen">${rows}</ul>${note}
    <button class="btn link" data-action="entry-add" data-card="${c.id}">+ Eintrag hinzufügen</button>`;
}

function renderTabelle(c) {
  const cols = c.table_columns || [];
  const rows = c.table_rows || [];
  const thead = `<tr>${cols.map((col) => `<th>${esc(col)}</th>`).join("")}<th class="col-del"></th></tr>`;
  let springerCount = 0;
  const tbody = rows.map((r, idx) => {
    const vals = r.cell_values || [];
    const springer = isSpringer(idx, c.capacity);
    if (springer) springerCount++;
    const cells = cols.map((_, i) => `
      <td><input type="text" maxlength="200" data-action="cell-edit" data-row="${r.id}" data-col="${i}" value="${esc(vals[i] ?? "")}"></td>`).join("");
    return `<tr class="${springer ? "is-springer" : ""}">${cells}<td class="col-del">${springer ? SPRINGER_BADGE : ""}<button class="icon-btn" data-action="row-delete" data-row="${r.id}" title="Zeile löschen">✕</button></td></tr>`;
  }).join("");
  const empty = rows.length ? "" : `<p class="progress-note">Noch keine Zeilen.</p>`;
  const note = c.capacity != null && rows.length
    ? `<div class="progress-note">${Math.min(rows.length, c.capacity)}/${c.capacity} Plätze belegt${springerCount ? ` · ${springerCount} Springer` : ""}</div>` : "";
  return `
    <div class="table-wrap">
      <table class="data-table">
        <thead>${thead}</thead>
        <tbody>${tbody}</tbody>
      </table>
    </div>
    ${empty}${note}
    <button class="btn link" data-action="row-add" data-card="${c.id}">+ Zeile hinzufügen</button>`;
}

function renderUmfrage(c) {
  const opts = c.poll_options || [];
  const votes = opts.flatMap((o) => (o.poll_votes || []).map((v) => ({ opt: o.id, token: v.device_token })));
  const myVotes = new Set(votes.filter((v) => v.token === deviceToken).map((v) => v.opt));
  const voters = new Set(votes.map((v) => v.token)).size;
  // Anteil je Option relativ zu allen abgegebenen Stimmen (nicht zur Anzahl
  // Abstimmender) — bei Mehrfachauswahl gibt eine Person mehrere Stimmen ab,
  // sonst würden mehrere gewählte Optionen alle fälschlich 100 % zeigen.
  const totalVotes = votes.length;
  const choosing = pollEditing.has(c.id) || myVotes.size === 0;

  let html = `<div class="poll">`;
  if (choosing && !c.trashed_at) {
    const inputType = c.multi_select ? "checkbox" : "radio";
    for (const o of opts) {
      html += `
        <div class="poll-opt">
          <div class="row">
            <label class="grow">
              <input type="${inputType}" name="poll-${c.id}" value="${o.id}" ${myVotes.has(o.id) ? "checked" : ""}
                ${c.multi_select || c.poll_named ? "" : `data-action="vote-submit-radio" data-card="${c.id}"`}>
              <span class="grow">${esc(o.label)}</span>
            </label>
          </div>
        </div>`;
    }
    // ideen-backlog.md: bei namentlicher Umfrage ist der Name Pflicht,
    // damit für alle sichtbar wird, wer wie abgestimmt hat — geräteseitig
    // gemerkt, damit man ihn nicht bei jeder Umfrage neu eintippen muss.
    const nameField = c.poll_named ? `
      <input type="text" class="poll-name-input" id="pollNameInput-${c.id}" placeholder="Dein Name *"
             maxlength="80" value="${esc(localStorage.getItem(VOTER_NAME_KEY) || "")}">` : "";
    html += `</div>
      ${nameField}
      <div class="poll-foot">
        ${c.multi_select || c.poll_named
          ? `<button class="btn small primary" data-action="vote-submit" data-card="${c.id}">Abstimmen</button>`
          : ""}
        ${myVotes.size ? `<button class="btn link" data-action="vote-retract" data-card="${c.id}">Stimme zurückziehen</button>` : ""}
        <span>${c.multi_select ? "Mehrfachauswahl möglich" : "Eine Option wählbar"} · ${voters} ${voters === 1 ? "Stimme" : "Stimmen"}</span>
      </div>`;
    return html;
  }

  for (const o of opts) {
    // Kontingent/Springer (Nutzerwunsch 14.09.2026): Reihenfolge der
    // Stimmen für diese Option nach Zeitpunkt, ab o.capacity gilt eine
    // weitere Stimme als "Springer" — rein informativ, unbeschränkt.
    const optVotes = [...(o.poll_votes || [])]
      .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    const n = optVotes.length;
    const pct = totalVotes ? Math.round((n / totalVotes) * 100) : 0;
    const springerCount = o.capacity != null ? Math.max(0, n - o.capacity) : 0;
    const capacityNote = o.capacity != null
      ? `<span class="capacity-note">${Math.min(n, o.capacity)}/${o.capacity} Plätze${springerCount ? ` · ${springerCount} Springer` : ""}</span>` : "";
    // Namentliche Umfrage: wer für diese Option gestimmt hat, steht direkt
    // darunter (für alle sichtbar, mit dem Nutzer so abgestimmt).
    const namesLine = c.poll_named && optVotes.length
      ? `<div class="poll-voters">${optVotes.map((v, i) => v.voter_name
          ? esc(v.voter_name) + (isSpringer(i, o.capacity) ? ` ${SPRINGER_BADGE}` : "")
          : "").filter(Boolean).join(", ")}</div>` : "";
    html += `
      <div class="poll-opt">
        <div class="bar" style="width:${pct}%"></div>
        <div class="row">
          <span class="grow">${esc(o.label)}${myVotes.has(o.id) ? ` <span class="mine">✓</span>` : ""}</span>
          <span class="count">${n} · ${pct} %</span>
        </div>
        ${capacityNote}
        ${namesLine}
      </div>`;
  }
  html += `</div>
    <div class="poll-foot">
      <button class="btn link" data-action="vote-edit" data-card="${c.id}">Stimme ändern</button>
      <span>${voters} ${voters === 1 ? "Stimme" : "Stimmen"} abgegeben</span>
    </div>`;
  return html;
}

// ideen-backlog.md #43 (Council-Finding): gemeinsamer Baustein für eine
// Datei-Zeile (Icon + Name + Größe) statt derselben Markup-Zeile zweimal
// gepflegt in renderDatei() und renderHinweisAttachments().
function fileRowHtml(f) {
  const url = fileUrl(f.storage_path);
  return `
    <a class="file-row" href="${url}" target="_blank" rel="noopener noreferrer">
      <span class="file-icon">${f.mime_type === "application/pdf" ? ICONS.datei : ICONS.image}</span>
      <span><b>${esc(f.filename)}</b><span>${fmtSize(f.size_bytes)}</span></span>
    </a>`;
}

function renderDatei(c) {
  let html = "";
  for (const f of c.files || []) {
    const url = fileUrl(f.storage_path);
    if (f.mime_type.startsWith("image/")) {
      html += `
        <a class="file-thumb-link" href="${url}" target="_blank" rel="noopener noreferrer">
          <img class="file-thumb" src="${url}" alt="${esc(f.filename)}" loading="lazy">
        </a>`;
    }
    html += fileRowHtml(f);
  }
  return html || `<p class="progress-note">Keine Datei vorhanden.</p>`;
}

// Anhänge einer Hinweis-Karte, die NICHT schon inline im Text eingebettet
// sind (die sieht man ja schon im Text selbst — kein doppeltes Anzeigen).
function renderHinweisAttachments(c) {
  const body = c.body || "";
  const extra = (c.files || []).filter((f) => !body.includes(f.storage_path));
  if (!extra.length) return "";
  let html = `<div class="hinweis-attachments">`;
  for (const f of extra) html += fileRowHtml(f);
  return html + `</div>`;
}

// Kennzeichen + Erledigt-Knopf für eine als Aufgabe markierte Karte
// (Hinweis/Umfrage/Liste/Tabelle, siehe is_aufgabe) — erscheint überall,
// wo die Karte gerendert wird, nicht nur im Dashboard.
// Design-Review 18.09.2026: runder Abhak-Kreis statt Warndreieck plus
// separatem "Erledigt"-Knopf (ein Dreieck liest sich als Warnung), ein
// zweiter Tipp nimmt das Abhaken zurück. Bei Umfrage/Liste/Tabelle hakt
// das Mitmachen selbst die Aufgabe ab (siehe aufgabeErledigt) — dann gibt
// es nichts mehr zurückzunehmen.
function aufgabeBlockHtml(c) {
  if (!c.is_aufgabe) return "";
  const done = aufgabeErledigt(c);
  const auto = done && !isAufgabeErledigt(c.id);
  if (auto) {
    return `
      <div class="card-aufgabe done">
        <span class="aufgabe-check is-done" aria-hidden="true">${ICONS.check}</span>
        <span>Erledigt — du hast mitgemacht</span>
      </div>`;
  }
  // Bei Umfrage/Liste/Tabelle ist das Mitmachen selbst das Abhaken — ein
  // zusätzlicher Kreis ließe "abhaken ohne abzustimmen" zu und würde die
  // Frage aufwerfen, was man denn nun tun soll.
  if (BETEILIGUNG_TYPES.includes(c.type) && !done) {
    return `
      <div class="card-aufgabe">
        <span class="aufgabe-check" aria-hidden="true"></span>
        <span>Aufgabe — hakt sich ab, sobald du mitmachst</span>
      </div>`;
  }
  return `
    <div class="card-aufgabe ${done ? "done" : ""}">
      <button type="button" class="aufgabe-check ${done ? "is-done" : ""}" data-action="${done ? "aufgabe-undo" : "aufgabe-done"}"
              data-card="${c.id}" aria-pressed="${done}" aria-label="${done ? "Abhaken zurücknehmen" : "Als erledigt abhaken"}">${done ? ICONS.check : ""}</button>
      <span>${done ? "Für dich erledigt" : "Aufgabe — abhaken, wenn erledigt"}</span>
    </div>`;
}

function renderCard(c, opts) {
  const inTrash = !!c.trashed_at;
  let menu;
  if (inTrash) {
    menu = `
      <button data-action="restore" data-card="${c.id}">Wiederherstellen</button>
      <button class="danger" data-action="delete-forever" data-card="${c.id}">Endgültig löschen</button>`;
  } else {
    // ideen-backlog.md #3: früher nur bei Datei-Karten mit eigener Klasse
    // sichtbar — der Kommentar dazu war seit Migration 017 veraltet,
    // gemeinsame Dateien können sehr wohl in (gemeinsamen oder
    // klassenspezifischen) Ordnern liegen. Der Ordner bestimmt jetzt die
    // Sichtbarkeit mit (siehe migration-019), also darf jede Datei
    // verschoben werden.
    const moveBtn = c.type === "datei"
      ? `<button data-action="move-file" data-card="${c.id}">In Ordner verschieben</button>` : "";
    // Manuelles Übersteuern der Archiv-Zugehörigkeit (siehe isArchived,
    // Migration 015) — unabhängig vom Kartentyp und vom Datum.
    const archiveBtn = isArchived(c)
      ? `<button data-action="unarchive-card" data-card="${c.id}">Aus Archiv zurückholen</button>`
      : `<button data-action="archive-card" data-card="${c.id}">In Archiv verschieben</button>`;
    const duplicateBtn = c.type === "datei"
      ? "" : `<button data-action="duplicate" data-card="${c.id}">Als Vorlage kopieren</button>`;
    menu = `
      <button data-action="edit" data-card="${c.id}">Bearbeiten</button>
      ${duplicateBtn}
      ${moveBtn}
      <button data-action="pin" data-card="${c.id}">${pinLabel(c)}</button>
      <button data-action="link-card" data-card="${c.id}">Verknüpfen …</button>
      ${archiveBtn}
      <button class="danger" data-action="trash" data-card="${c.id}">Löschen</button>`;
  }

  let body = "";
  if (c.type === "termin") body += renderTermin(c, inTrash);
  // Hinweis UND Termin nutzen denselben Rich-Text-Textkörper samt Anhängen
  // (z. B. die Zusammenfassung eines Elternabends direkt im Termin).
  if (c.type === "hinweis" || c.type === "termin") {
    if (c.body) body += `<div class="card-body rich">${sanitizeRich(c.body)}</div>`;
    body += renderHinweisAttachments(c);
  } else if (c.body) {
    body += `<p class="card-body">${bodyHtml(c.body)}</p>`;
  }
  if (c.type === "liste") body += renderListe(c);
  if (c.type === "tabelle") body += renderTabelle(c);
  if (c.type === "umfrage") body += renderUmfrage(c);
  if (c.type === "datei") body += renderDatei(c);
  // Verknüpfte Karten nur eine Ebene tief anzeigen (siehe renderLinkedSection).
  if (!(opts && opts.nested)) body += renderLinkedSection(c, inTrash);
  if (!(opts && opts.nested) && !inTrash) body += renderLinksSection(c);

  const trashNote = inTrash
    ? `<p class="trash-note">Wird am ${purgeDate(c).toLocaleDateString("de-DE",
        { day: "numeric", month: "long", year: "numeric" })} endgültig gelöscht.</p>`
    : "";

  // Design-Review 18.09.2026: Bei Terminen ist end_date nur das interne
  // Archivdatum (meist der Folgetag) — für Eltern las sich "Endet am" wie
  // die Dauer des Termins. Bei Umfragen/Listen bleibt es die Frist.
  const endNote = (c.end_date && !inTrash && (isAdmin() || c.type !== "termin"))
    ? ` · Endet am ${esc(fmtDateLong(c.end_date))}` : "";
  const creatorNote = c.creator_name ? ` · von ${esc(c.creator_name)}` : "";
  // Nur wenn seit dem Anlegen tatsächlich einmal etwas bearbeitet wurde
  // (siehe update_card in migration-013) — keine rückwirkenden Angaben bei
  // unveränderten Karten. Seit dem Design-Review nur noch für Admins.
  const editedNote = c.updated_at && isAdmin()
    ? `<div class="card-meta">Zuletzt geändert: ${fmtTimestamp(c.updated_at)}${c.last_edited_by ? ` · von ${esc(c.last_edited_by)}` : ""}</div>`
    : "";

  return `
    <article class="card ${c.pinned && !inTrash ? "pinned" : ""} ${inTrash ? "trashed" : ""} ${opts && opts.nested ? "nested" : ""}" data-card="${c.id}">
      <div class="card-top">
        <span class="type-badge ${c.type}">${TYPE_LABELS[c.type]}</span>
        ${isNew(c) && !(opts && opts.nested) ? NEU_BADGE : ""}
        ${!inTrash ? endsSoonBadge(c) : ""}
        ${c.pinned && !inTrash ? `<span class="pin-flag">${ICONS.pin}Angepinnt</span>` : ""}
        ${!inTrash ? classChipHtml(c) : ""}
        <span class="spacer"></span>
        ${!isAdmin() ? "" : `
        <details class="menu">
          <summary title="Aktionen">${ICONS.menu}</summary>
          <div class="menu-list">${menu}</div>
        </details>`}
      </div>
      <div class="card-clip">
        <h3>${esc(c.title)}</h3>
        ${c.parent_id ? linkedBackChipHtml(c) : ""}
        ${trashNote}
        ${body}
        <div class="card-meta">${fmtCreated(c.created_at)}${creatorNote}${endNote}</div>
        ${editedNote}
        ${aufgabeBlockHtml(c)}
        ${shareButtonHtml(c)}
      </div>
    </article>`;
}

// Teilen-Button für Umfrage/Liste — bewusst NICHT an classLocked gekoppelt
// (anders als das "..."-Aktionsmenü), jede*r soll eine Umfrage/Liste
// verschicken können, z. B. in die Signal-Elterngruppe. Öffnet der/die
// Empfänger*in den Link, springt die App direkt zu genau dieser Karte
// (siehe openCardById in render()).
function shareButtonHtml(c) {
  if (!["umfrage", "liste"].includes(c.type) || c.trashed_at) return "";
  return `
    <button type="button" class="btn small ghost card-share-btn" data-action="share-card" data-card="${c.id}">
      ${ICONS.link}Teilen
    </button>`;
}

// Kleiner Verweis-Chip auf einer verknüpften Karte, zurück zum Termin, an
// den sie angehängt wurde. Klick springt zur Termin-Karte (klappt deren
// Abschnitt in der Übersicht bei Bedarf zuerst auf).
// Kleiner Hinweis-Chip, welcher Klasse eine Karte gehört bzw. ob sie
// gemeinsam ist — nur relevant, wenn gerade "Beide Klassen" gewählt ist,
// bei gefiltertem Blick auf eine Klasse ist er überflüssig.
function classChipHtml(c) {
  // "Gemeinsam" gilt für beide Klassen und soll deshalb immer erkennbar sein
  // — auch im gefilterten Blick auf eine einzelne Klasse, wo man sonst nicht
  // sehen könnte, dass ein Eintrag auch die jeweils andere Klasse betrifft.
  if (!c.class_id) return `<span class="class-chip shared">🏫 Gemeinsam</span>`;
  // Die eigene Klasse ist im gefilterten Blick durch den Filter selbst schon
  // klar — der Chip wäre dort überflüssig, nur bei "Beide Klassen" hilfreich.
  if (activeClassId) return "";
  const cls = classesList.find((x) => x.id === c.class_id);
  if (!cls) return "";
  return `<span class="class-chip">${CLASS_ICON[cls.slug] || ""} ${esc(cls.name)}</span>`;
}

function linkedBackChipHtml(c) {
  const parent = cardById(c.parent_id);
  if (!parent) return "";
  return `<button type="button" class="back-chip" data-action="jump-to-card" data-card="${parent.id}">
    ${ICONS.link}<span>verknüpft mit „${esc(parent.title)}“</span></button>`;
}

// Aufklappbarer Bereich mit den verknüpften Karten (z. B. Liste/Umfrage/
// Hinweis zu einem Elternabend-Termin, oder eine Datei an einem Hinweis,
// siehe ideen-backlog.md #10 — z. B. eine Packliste an einen Wandertag).
// Verknüpfte Karten werden bewusst nur eine Ebene tief gerendert (siehe
// Aufruf oben mit opts.nested), damit eine versehentliche Ringverknüpfung
// nicht zu endloser Verschachtelung führt.
function renderLinkedSection(c, inTrash) {
  if (!["termin", "hinweis"].includes(c.type) || inTrash) return "";
  const linked = cards.filter((x) => x.parent_id === c.id && !x.trashed_at);
  const addBtn = !isAdmin() ? "" :
    `<button type="button" class="btn small link" data-action="add-linked" data-card="${c.id}">+ Element hier verknüpfen</button>`;
  const items = linked.map((x) => renderCard(x, { nested: true })).join("");

  return `
    <details class="linked-section" ${linked.length ? "" : "open"}>
      <summary>Verknüpfte Einträge${linked.length ? ` <span class="chip-count">${linked.length}</span>` : ""}</summary>
      <div class="linked-body">
        ${items || `<p class="linked-empty">Noch keine verknüpften Einträge.</p>`}
        ${addBtn}
      </div>
    </details>`;
}

// Nutzerwunsch 21.09.2026 (Migration 033): allgemeine Verknüpfungen beliebig
// nach beliebig. Gegenstück zu renderLinkedSection (das zeigt die alten
// "hängt unter Termin/Hinweis"-Karten). Zeigt nur Partner, die nicht im
// Papierkorb liegen und zur gewählten Klasse passen.
function linkPartners(c) {
  const out = [];
  for (const l of cardLinks) {
    const otherId = l.card_a === c.id ? l.card_b : l.card_b === c.id ? l.card_a : null;
    if (!otherId) continue;
    const o = cardById(otherId);
    if (o && !o.trashed_at && inActiveClass(o)) out.push(o);
  }
  return out;
}

function linkLabel(x) {
  return `${TYPE_LABELS[x.type] || x.type} · ${x.title || "(ohne Titel)"}`;
}

function renderLinksSection(c) {
  const partners = linkPartners(c);
  if (!partners.length) return "";
  const chips = partners.map((x) => `
    <span class="link-chip-wrap">
      <button type="button" class="back-chip" data-action="jump-to-card" data-card="${x.id}">
        ${ICONS.link}<span>${esc(linkLabel(x))}</span></button>${!isAdmin() ? "" : `
      <button type="button" class="link-x" data-action="unlink-cards" data-card="${c.id}" data-other="${x.id}"
        title="Verknüpfung lösen" aria-label="Verknüpfung mit ${esc(x.title)} lösen">×</button>`}
    </span>`).join("");
  return `<div class="links-section"><span class="links-label">Verknüpft mit</span>${chips}</div>`;
}

// Auswahlfenster "Mit bestehender Karte verknüpfen". ctx: {exclude:Set,
// classId (Klasse der Ziel-Karte oder ""), onPick(id), onNew() optional}.
let linkPickerCtx = null;
function openLinkPicker(ctx) {
  linkPickerCtx = ctx;
  $("linkSearch").value = "";
  $("linkNew").hidden = !ctx.onNew;
  renderLinkPicker();
  dlgLink.showModal();
}

function renderLinkPicker() {
  const ctx = linkPickerCtx;
  if (!ctx) return;
  const q = $("linkSearch").value.trim().toLowerCase();
  const list = cards.filter((x) =>
    !x.trashed_at && !ctx.exclude.has(x.id) &&
    inActiveClass(x) &&
    (!ctx.classId || !x.class_id || x.class_id === ctx.classId) &&
    (!q || linkLabel(x).toLowerCase().includes(q)));
  const rows = list.slice(0, 60).map((x) => {
    const datum = x.type === "termin" && x.event_date ? ` · ${esc(fmtDateShortSafe(x.event_date))}` : "";
    return `<button type="button" class="link-pick" data-pick="${x.id}">
      <b>${esc(x.title || "(ohne Titel)")}</b><small>${esc(TYPE_LABELS[x.type] || x.type)}${datum}</small></button>`;
  }).join("");
  $("linkList").innerHTML = rows ||
    `<p class="linked-empty">Keine passende Karte gefunden.</p>`;
}

function fmtDateShortSafe(s) {
  try { return parseISODate(s).toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return s; }
}

// Editor (Neuanlegen): Liste der vorgemerkten Verknüpfungen samt Knopf.
function renderEditLinks() {
  const box = $("editLinks");
  if (!box) return;
  const ids = editorState.links || [];
  box.innerHTML = ids.map((id) => {
    const x = cardById(id);
    return x ? `<span class="link-chip-wrap"><span class="back-chip">${ICONS.link}<span>${esc(linkLabel(x))}</span></span>
      <button type="button" class="link-x" data-unpick="${id}" title="Entfernen" aria-label="Verknüpfung entfernen">×</button></span>` : "";
  }).join("");
}

function setupEditorLinks() {
  const add = $("editLinkAdd");
  if (!add) return;
  renderEditLinks();
  add.addEventListener("click", () => {
    const classSel = $("editorClassSelect") || document.querySelector('#editorForm [name="class_id"]');
    openLinkPicker({
      exclude: new Set(editorState.links || []),
      classId: classSel ? classSel.value : (activeClassId || ""),
      onPick: (id) => { editorState.links.push(id); renderEditLinks(); },
    });
  });
  $("editLinks").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-unpick]");
    if (!b) return;
    editorState.links = editorState.links.filter((id) => id !== b.dataset.unpick);
    renderEditLinks();
  });
}

/* ---------- Gruppierte Übersicht (Pinnwand) ---------- */

// Kompakte Chat-Bubble für eine Kurznachricht (Hinweis mit is_kurznachricht)
// — bewusst ohne "Anpinnen" (in einem kleinen Chat-Feed ohne klare
// Bedeutung) und ohne die große Kartenumrandung normaler Hinweise.
function renderKurznachricht(c) {
  const menu = `
    <button data-action="edit" data-card="${c.id}">Bearbeiten</button>
    <button data-action="duplicate" data-card="${c.id}">Als Vorlage kopieren</button>
    <button class="danger" data-action="trash" data-card="${c.id}">Löschen</button>`;
  const creatorNote = c.creator_name ? ` · ${esc(c.creator_name)}` : "";
  return `
    <article class="kurz-bubble" data-card="${c.id}">
      <div class="kurz-bubble-head">
        <b>${esc(c.title)}</b>
        <span class="spacer"></span>
        ${!isAdmin() ? "" : `
        <details class="menu">
          <summary title="Aktionen">${ICONS.menu}</summary>
          <div class="menu-list">${menu}</div>
        </details>`}
      </div>
      ${c.body ? `<div class="kurz-bubble-body rich">${sanitizeRich(c.body)}</div>` : ""}
      ${renderHinweisAttachments(c)}
      <div class="kurz-bubble-meta">${isAdmin() ? fmtTimestamp(c.created_at) : fmtRelative(c.created_at)}${creatorNote}</div>
      ${aufgabeBlockHtml(c)}
    </article>`;
}

/* ---------- Startseite (Dashboard) ---------- */

// list: alle sichtbaren, nicht archivierten Karten der aktiven Klasse.
// Design-Review 18.09.2026: Die Startseite beantwortet zuerst "Was steht
// an, und muss ich etwas tun?" (Als Nächstes), darunter alle Hinweise als
// senkrechte Liste zum Aufklappen. Vorher füllte ein einzelner Hinweis im
// Karussell den ersten Bildschirm, die übrigen sah nur, wer wischte, und
// der nächste Termin lag unterhalb des sichtbaren Bereichs.
// Beschriftung des Anpinn-Knopfs: Termine erscheinen angepinnt auch auf der
// Startseite (Nutzerwunsch 21.09.2026), das steht deshalb im Knopf.
function pinLabel(c) {
  if (c.pinned) return "Nicht mehr anpinnen";
  return c.type === "termin" ? "Auf der Startseite anpinnen" : "Oben anpinnen";
}

// ---- Angepinnte Termine auf der Startseite (Nutzerwunsch 21.09.2026) ----
// Unter "Zum Stundenplan" steht je angepinntem Termin eine schmale Zeile.
// Einzeltermine nutzen cards.pinned (dasselbe "Anpinnen" wie bisher, es
// sortiert weiter auch oben in der Termin-Liste), wiederkehrende Termine
// recurring_events.pinned (Migration 032). Nach dem nächsten Vorkommen
// sortiert, höchstens PIN_ZEILEN_MAX Zeilen, der Rest als "+N weitere".
// Vergangene Termine fehlen von selbst: list enthält nur nicht archivierte
// Karten der aktiven Klasse (inActiveClass), wiederkehrende werden nach
// inActiveClassGeneric gefiltert — Eichhörnchen- und Schmetterlings-Termine
// bleiben getrennt, gemeinsame (class_id leer) erscheinen bei beiden.
const PIN_ZEILEN_MAX = 4;
const MONAT_KURZ = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sept.", "Okt.", "Nov.", "Dez."];

function naechstesVorkommen(weekday) {
  const heute = todayStart();
  const tage = (weekday - isoWeekday(heute) + 7) % 7;
  return toISODate(new Date(heute.getFullYear(), heute.getMonth(), heute.getDate() + tage));
}

function angepinnteTermine(termine) {
  const einzel = termine.filter((c) => c.pinned && c.event_date)
    .map((c) => ({ art: "einzel", datum: c.event_date, zeit: c.event_time || "", c }));
  const wiederkehrend = recurringEvents
    .filter((r) => r.pinned && inActiveClassGeneric(r.class_id))
    .map((r) => ({ art: "wiederkehrend", datum: naechstesVorkommen(r.weekday), zeit: r.start_time || "", r }));
  return einzel.concat(wiederkehrend)
    .sort((a, b) => `${a.datum} ${a.zeit || "99:99"}`.localeCompare(`${b.datum} ${b.zeit || "99:99"}`));
}

function renderAngepinnteTermine(termine) {
  const alle = angepinnteTermine(termine);
  if (!alle.length) return "";
  const sichtbar = alle.slice(0, PIN_ZEILEN_MAX);
  const rest = alle.length - sichtbar.length;
  const zeilen = sichtbar.map((e) => {
    if (e.art === "einzel") {
      const d = parseISODate(e.c.event_date);
      const zeit = fmtTimeRange(e.c.event_time, e.c.event_end_time).replace(/ Uhr$/, "");
      return `
        <button type="button" class="pin-row" data-action="open-rubrik" data-type="termin" data-card="${e.c.id}">
          <span class="pin-row-icon" aria-hidden="true">${ICONS.pin}</span>
          <span class="pin-row-tag">${WEEKDAY_SHORT[isoWeekday(d)]} ${d.getDate()}. ${MONAT_KURZ[d.getMonth()]}</span>
          <span class="pin-row-title">${esc(e.c.title)}</span>
          <span class="pin-row-zeit">${esc(zeit)}</span>
        </button>`;
    }
    const zeit = fmtTimeRange(e.r.start_time, e.r.end_time).replace(/ Uhr$/, "");
    return `
        <button type="button" class="pin-row" data-action="pin-wiederkehrend" data-id="${e.r.id}">
          <span class="pin-row-icon" aria-hidden="true">${ICONS.pin}</span>
          <span class="pin-row-tag">Jeden ${WEEKDAY_SHORT[e.r.weekday]}</span>
          <span class="pin-row-title">${esc(e.r.title)}</span>
          <span class="pin-row-zeit">${esc(zeit)}</span>
        </button>`;
  }).join("");
  const mehr = rest > 0
    ? `<button type="button" class="pin-row pin-row-mehr" data-action="open-rubrik" data-type="termin">+ ${rest} weitere angepinnte Termine</button>`
    : "";
  return `<div class="pin-rows" role="group" aria-label="Angepinnte Termine">${zeilen}${mehr}</div>`;
}

function renderStart(list) {
  // Bewusst nicht die Fetch-Reihenfolge (pinned zuerst) übernehmen — der
  // zeitlich neuste Hinweis steht oben, auch wenn ein älterer angepinnt ist
  // (die Anpinn-Kennzeichnung bleibt sichtbar, bestimmt aber nicht die
  // Reihenfolge, Nutzerwunsch aus der Karussell-Zeit).
  const hinweise = list.filter((c) => c.type === "hinweis")
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const termine = list.filter((c) => c.type === "termin");
  const neu = hinweise.filter(isNew).length;

  return installHintHtml()
    + `<h2 class="dash-section-label">Als Nächstes</h2>`
    + renderNextRow(termine, list)
    + renderStundenplanStrip()
    + renderAngepinnteTermine(termine)
    + `<h2 class="dash-section-label">Hinweise${neu ? ` <span class="neu-count">${neu} neu</span>` : ""}</h2>`
    + renderHinweisList(hinweise);
}

// UX-Forschung 19.09.2026: Hinweise älter als 14 Tage rutschen unter
// "Ältere Hinweise", damit die Liste kurz bleibt und Aktuelles nicht
// versickert. Immer sichtbar bleiben: angepinnte, neue und noch offene
// Aufgaben. Ein Sprung zu einem älteren Hinweis (Push, Link, Suche) klappt
// die älteren auf, siehe openCardById.
const HINWEIS_AKTUELL_TAGE = 14;
let showOlderHinweise = false;

function istAeltererHinweis(c) {
  return new Date(c.created_at).getTime() < Date.now() - HINWEIS_AKTUELL_TAGE * 86400000
    && !c.pinned && !isNew(c) && !(c.is_aufgabe && !aufgabeErledigt(c));
}

function renderHinweisList(hinweise) {
  if (!hinweise.length) {
    return `<p class="rubrik-panel-empty">Gerade gibt es keine Hinweise. Neue Mitteilungen der Klasse erscheinen hier.</p>`;
  }
  const istAelter = istAeltererHinweis;
  const aktuell = hinweise.filter((c) => !istAelter(c));
  const aelter = hinweise.filter(istAelter);

  let html = aktuell.length
    ? `<div class="hinweis-list">${aktuell.map(renderHinweisStrip).join("")}</div>`
    : `<p class="rubrik-panel-empty">In den letzten ${HINWEIS_AKTUELL_TAGE} Tagen gab es keine neuen Hinweise.</p>`;
  if (aelter.length) {
    html += `
      <button type="button" class="btn link older-toggle" data-action="toggle-older-hinweise" aria-expanded="${showOlderHinweise}">
        ${showOlderHinweise ? "Ältere Hinweise ausblenden" : `Ältere Hinweise anzeigen (${aelter.length})`}
      </button>`;
    if (showOlderHinweise) html += `<div class="hinweis-list">${aelter.map(renderHinweisStrip).join("")}</div>`;
  }
  return html;
}

// Zugeklappt: Titel, zwei Zeilen Vorschau, wie lange her. Aufgeklappt: die
// volle Karte bzw. Kurznachricht wie bisher (inkl. Anhängen, Aufgabe, Menü).
function renderHinweisStrip(c) {
  const isOpen = c.id === openHinweisId;
  const preview = stripTags(c.body).slice(0, 180);
  const sub = [c.pinned ? "Angepinnt" : "", isOpen ? "" : preview].filter(Boolean).join(" · ");
  return renderAccordionStrip(c, {
    isOpen,
    action: "toggle-hinweis-strip",
    dateLabel: fmtRelative(c.created_at),
    sub,
    isNew: isNew(c),
    body: (x) => (x.is_kurznachricht ? renderKurznachricht(x) : renderCard(x)),
  });
}

// Nutzerwunsch 07.09.2026, angepasst 07.09.2026: Begrüßungstext und
// Elternabend-Hinweis sind auf der Startseite weg (Termin steht ohnehin
// schon in der "Nächster Termin"-Kachel) — stattdessen ein schmaler
// Reiter. Klappt sich nicht mehr auf, sondern führt wie die anderen
// Rubriken (Kalender, Termine, …) in eine eigene Ansicht.
function renderStundenplanStrip() {
  return `
    <button type="button" class="willkommen willkommen-nav willkommen-stundenplan" data-action="open-rubrik" data-type="stundenplan">
      <span class="willkommen-title">${ICONS.kalender}Zum Stundenplan</span>
      <span class="willkommen-chevron">${ICONS.chevron}</span>
    </button>`;
}

// ideen-backlog.md #19: Einmalige Passwort-Abfrage für Admin-Rechte am
// Hauptlink (kein Klassen-Link) — die eigentliche Prüfung läuft über
// verify_admin_code() in der Datenbank (migration-021), nicht nur
// clientseitig. Bei falschem Passwort erneut fragen; "Abbrechen" lässt
// ohne Admin-Rechte weiter (z. B. falls doch mal jemand ohne Absicht den
// Hauptlink öffnet) — kein Zwang, sich einzuloggen, um die Pinnwand zu
// lesen.
//
// Nutzerwunsch 20.09.2026: Statt der freiwilligen Admin-Abfrage gibt es jetzt
// eine Anmeldung für alle (askLogin), ein Feld:
//   - Klassenpasswort (Name der Klasse) -> fester Bereich dieser Klasse
//   - Admin-Passwort                    -> Admin-Bereich mit beiden Klassen
// Die Klassenpasswörter sind bewusst nur eine Ordnungshilfe, kein Schutz vor
// Fremden (stehen im Klartext hier) — das Admin-Passwort dagegen prüft die
// Datenbank (verify_admin_code).
const KLASSEN_PASSWOERTER = {
  eichhoernchen: ["eichhoernchen", "eichhoernchenklasse"],
  schmetterling: ["schmetterlinge", "schmetterling", "schmetterlingsklasse"],
};

// Groß-/Kleinschreibung, Umlaute und Leerzeichen sollen keine Rolle spielen:
// "Eichhörnchen", "eichhoernchen" und " EICHHÖRNCHEN " sind dasselbe.
function normPw(s) {
  return String(s || "").toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]/g, "");
}

function isLoggedIn() { return classLocked || !!adminCode; }

// Prüft ein eingegebenes Passwort und richtet das Gerät danach ein.
// Gibt "klasse" oder "admin" zurück, bei falschem Passwort null.
async function tryLogin(pw) {
  const raw = String(pw || "").trim();
  if (!raw) return null;
  const n = normPw(raw);
  const slug = Object.keys(KLASSEN_PASSWOERTER).find((s) => KLASSEN_PASSWOERTER[s].includes(n));
  if (slug) {
    const cls = classesList.find((c) => c.slug === slug);
    if (!cls) throw new Error("Die Klasse konnte gerade nicht geladen werden. Bitte gleich noch einmal versuchen.");
    activeClassId = cls.id;
    classLocked = true;
    adminCode = "";
    localStorage.setItem(CLASS_KEY, cls.id);
    localStorage.setItem(CLASS_LOCK_KEY, "1");
    localStorage.setItem(CLASS_SLUG_KEY, slug);
    localStorage.removeItem(ADMIN_CODE_KEY);
    applyClassTheme(slug);
    return "klasse";
  }
  let ok = false;
  try {
    ok = await rpc("verify_admin_code", { p_admin_code: raw });
  } catch {
    throw new Error("Keine Verbindung — bitte gleich noch einmal versuchen.");
  }
  if (!ok) return null;
  adminCode = raw;
  classLocked = false;
  activeClassId = "";
  localStorage.setItem(ADMIN_CODE_KEY, raw);
  localStorage.removeItem(CLASS_LOCK_KEY);
  localStorage.removeItem(CLASS_SLUG_KEY);
  localStorage.removeItem(CLASS_KEY);
  applyClassTheme(null);
  return "admin";
}

// Zeigt die Anmeldung. optional = false: nicht wegklickbar, kehrt erst zurück,
// wenn sie geklappt hat (Anmeldung AN). optional = true: mit "Abbrechen"
// (Admin-Zugang bei ausgeschalteter Anmeldung), Ergebnis dann null.
let loginResolve = null;
let loginOptional = false;
let loginWired = false;

function wireLogin() {
  if (loginWired) return;
  loginWired = true;
  const input = $("loginInput");
  const errEl = $("loginError");
  const btn = $("loginSubmit");
  // Ohne Anmeldung gibt es keinen Inhalt: Esc schließt nur den freiwilligen Dialog.
  dlgLogin.addEventListener("cancel", (ev) => { if (!loginOptional) ev.preventDefault(); });
  dlgLogin.addEventListener("close", () => {
    const r = loginResolve; loginResolve = null;
    if (r) r(null);
  });
  $("loginCancel").addEventListener("click", () => dlgLogin.close());
  $("loginShow").addEventListener("change", (ev) => {
    input.type = ev.target.checked ? "text" : "password";
  });
  $("loginForm").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    errEl.hidden = true;
    btn.disabled = true;
    try {
      const result = await tryLogin(input.value);
      if (!result) {
        errEl.textContent = "Das Passwort stimmt nicht. Tipp: Es ist der Name deiner Klasse.";
        errEl.hidden = false;
        input.select();
        return;
      }
      const r = loginResolve; loginResolve = null;
      dlgLogin.close();
      if (r) r(result);
    } catch (err) {
      errEl.textContent = err.message;
      errEl.hidden = false;
    } finally {
      btn.disabled = false;
    }
  });
}

function askLogin(optional = false) {
  wireLogin();
  return new Promise((resolve) => {
    loginResolve = resolve;
    loginOptional = optional;
    const input = $("loginInput");
    input.value = "";
    input.type = "password";
    $("loginShow").checked = false;
    $("loginError").hidden = true;
    $("loginCancel").hidden = !optional;
    dlgLogin.showModal();
    input.focus();
  });
}

// "Abmelden": Gerät vergisst Klasse bzw. Admin-Rechte, danach erscheint
// wieder die Anmeldung — z. B. für Familien mit Kindern in beiden Klassen
// oder falls jemand versehentlich im falschen Bereich gelandet ist.
function logout() {
  for (const k of [CLASS_KEY, CLASS_LOCK_KEY, CLASS_SLUG_KEY, ADMIN_CODE_KEY]) localStorage.removeItem(k);
  location.href = location.pathname;
}

// "Als Nächstes" auf der Startseite: der nächste Termin und was auf dieses
// Gerät wartet (siehe wartetAufDich). Design-Review 18.09.2026: Die frühere
// Umfragen-Kachel zählte alle Umfragen als "offen", auch die, bei denen man
// längst abgestimmt hatte — jetzt eine gemeinsame "Wartet auf dich"-Kachel,
// die nur zählt, was wirklich noch zu tun ist.
function renderNextRow(termine, list) {
  const next = [...termine].sort((a, b) => String(a.event_date).localeCompare(String(b.event_date))
    || String(a.event_time || "").localeCompare(String(b.event_time || "")))[0];
  const waiting = wartetAufDich(list).length;

  let terminTile = "";
  if (next) {
    const d = parseISODate(next.event_date);
    const when = [relativeDay(next.event_date), fmtTimeRange(next.event_time, next.event_end_time)].filter(Boolean).join(" · ");
    terminTile = `
      <button class="dash-tile dash-tile-termin" data-action="open-rubrik" data-type="termin" data-card="${next.id}">
        <span class="dash-tile-termin-label">Nächster Termin</span>
        <span class="dash-tile-termin-date">${WEEKDAY_SHORT[isoWeekday(d)]} ${d.getDate()}. ${MONTH_SHORT[d.getMonth()]}</span>
        <span class="dash-tile-termin-title">${esc(next.title)}</span>
        ${when ? `<span class="dash-tile-termin-time">${esc(when)}</span>` : ""}
      </button>`;
  }

  const waitingTile = `
    <button class="dash-tile dash-tile-aufgaben ${waiting ? "is-lead" : "empty"}" data-action="open-rubrik" data-type="aufgaben">
      <span class="dash-tile-aufgaben-label">Wartet auf dich</span>
      <span class="dash-tile-aufgaben-count">${waiting
        ? (waiting === 1 ? "1 Sache zu erledigen" : `${waiting} Sachen zu erledigen`)
        : "Alles erledigt"}</span>
    </button>`;

  // UX-Forschung 19.09.2026: Wartet etwas, steht diese Kachel vorn und ist
  // die kräftigste — "Muss ich etwas tun?" ist die Hauptfrage beim Öffnen.
  // Der Termin tritt dann optisch zurück (siehe .has-waiting in style.css).
  const tiles = (waiting ? [waitingTile, terminTile] : [terminTile, waitingTile]).filter(Boolean);
  return `<div class="dash-tile-row count-${tiles.length} ${waiting ? "has-waiting" : ""}">${tiles.join("")}</div>`;
}

/* ---------- Termin/Kalender (gemeinsame Rubrik, siehe renderKalenderView) ---------- */

// Wiederverwendbarer Akkordeon-Streifen: Kopfzeile mit Titel/Untertitel/
// Datum, antippen klappt die volle Karte darunter auf. Genutzt von der
// Termin-Rubrik (renderTerminStrip) und vom Archiv (renderArchivStrip).
// isNew: Neu-Punkt vor dem Titel (siehe isNew). body: eigene Darstellung
// des aufgeklappten Inhalts (Standard: renderCard).
function renderAccordionStrip(c, { isOpen, action, dateLabel, sub, isNew = false, body = renderCard }) {
  return `
    <div class="acc-strip ${esc(c.type)} ${isOpen ? "open" : ""}">
      <button class="acc-strip-head" data-action="${action}" data-card="${c.id}" aria-expanded="${isOpen}">
        <span class="acc-strip-title-wrap">
          <span class="acc-strip-title">${isNew ? NEU_DOT : ""}${esc(c.title)}</span>
          ${sub ? `<span class="acc-strip-sub">${esc(sub)}</span>` : ""}
        </span>
        <span class="acc-strip-date">
          <span>${esc(dateLabel)}</span>
          ${ICONS.chevron}
        </span>
      </button>
      ${isOpen ? `<div class="acc-strip-body">${body(c)}</div>` : ""}
    </div>`;
}

// Design-Review 18.09.2026: Unter dem Titel steht jetzt, was Eltern
// brauchen — wann (relativ) und wo, statt wer den Termin eingetragen hat.
// Der Wochentag steht direkt am Datum.
function renderTerminStrip(c) {
  const d = parseISODate(c.event_date);
  const sub = [relativeDay(c.event_date), fmtTimeRange(c.event_time, c.event_end_time), c.event_location || ""]
    .filter(Boolean).join(" · ");
  return renderAccordionStrip(c, {
    isOpen: c.id === openTerminId,
    action: "toggle-termin-strip",
    dateLabel: `${WEEKDAY_SHORT[isoWeekday(d)]} ${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.`,
    sub,
    isNew: isNew(c),
  });
}

/* ---------- Archiv: alle Typen, erst eingeklappt für bessere Übersicht ---------- */

function renderArchivView(list) {
  return list.map(renderArchivStrip).join("");
}

function renderArchivStrip(c) {
  const d = new Date(c.created_at);
  return renderAccordionStrip(c, {
    isOpen: c.id === openArchivId,
    action: "toggle-archiv-strip",
    dateLabel: `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.`,
    sub: TYPE_LABELS[c.type] + (c.creator_name ? " · " + c.creator_name : ""),
  });
}

/* ---------- Beteiligung-Rubrik (Umfrage/Liste/Tabelle) ---------- */

const sortByNeu = (a, b) => String(b.created_at).localeCompare(String(a.created_at));
// Offene Dinge mit Frist zuerst (früheste zuerst), dann die neusten.
function sortByFrist(a, b) {
  if (a.end_date && b.end_date) return a.end_date.localeCompare(b.end_date) || sortByNeu(a, b);
  if (a.end_date) return -1;
  if (b.end_date) return 1;
  return sortByNeu(a, b);
}

// Design-Review 18.09.2026: aufgeteilt in "Noch offen für dich" und "Schon
// mitgemacht" (siehe hatMitgemacht) — vorher stand alles unsortiert
// untereinander, und man musste selbst prüfen, wo man schon dabei war.
function renderBeteiligungView(items) {
  if (!items.length) {
    return `<p class="rubrik-panel-empty">Gerade gibt es nichts zum Mitmachen. Neue Umfragen, Listen und Tabellen erscheinen hier.</p>`;
  }
  const offen = items.filter((c) => !hatMitgemacht(c)).sort(sortByFrist);
  const dabei = items.filter(hatMitgemacht).sort(sortByNeu);
  let html = `<h2 class="group-label">Noch offen für dich</h2>`;
  html += offen.length
    ? `<div class="group-body">${offen.map((c) => renderCard(c)).join("")}</div>`
    : `<p class="rubrik-panel-empty">Du hast überall mitgemacht — danke!</p>`;
  if (dabei.length) {
    html += `
      <h2 class="group-label group-label-spaced">Schon mitgemacht</h2>
      <div class="group-body">${dabei.map((c) => renderCard(c)).join("")}</div>`;
  }
  return html;
}

/* ---------- "Wartet auf dich" (Klick auf die Kachel der Startseite) ---------- */

// Offene Aufgaben und Umfragen ohne eigene Stimme (siehe wartetAufDich),
// darunter, was davon schon erledigt ist.
function renderAufgabenView(list) {
  const open = wartetAufDich(list).sort(sortByFrist);
  const done = list.filter((c) => (c.is_aufgabe && aufgabeErledigt(c)) ||
    (c.type === "umfrage" && hatMitgemacht(c))).sort(sortByNeu);

  let body = `<h2 class="group-label">Wartet auf dich</h2>`;
  body += open.length
    ? `<div class="group-body">${open.map((c) => renderCard(c)).join("")}</div>`
    : `<p class="rubrik-panel-empty">Alles erledigt — gerade wartet nichts auf dich.</p>`;
  if (done.length) {
    body += `
      <h2 class="group-label group-label-spaced">Schon erledigt</h2>
      <div class="group-body">${done.map((c) => renderCard(c)).join("")}</div>`;
  }
  return body;
}

/* ---------- Ordner-Unterseite (Rubrik "Datei") ---------- */

// "Neu"-Markierung pro Ordner, rein geräteseitig (localStorage) — Schlüssel
// ist die Ordner-Id, "" steht für "Ohne Ordner".
const FOLDER_SEEN_KEY = "pinnwand_ordner_gesehen";
function loadFolderSeen() {
  try { return JSON.parse(localStorage.getItem(FOLDER_SEEN_KEY)) || {}; }
  catch { return {}; }
}
function markFolderSeen(key) {
  const seen = loadFolderSeen();
  seen[key] = Date.now();
  localStorage.setItem(FOLDER_SEEN_KEY, JSON.stringify(seen));
}

// Ordner-Farben: jeder Ordner bekommt automatisch eine eigene, pastellige
// Farbe zur besseren Übersicht (ganze Kachel eingefärbt, nicht nur das
// Icon) — deterministisch aus der Ordner-Id abgeleitet (djb2-Hash →
// Farbton), kein Datenbank-Feld nötig. Gleicher Ordner ergibt bei jedem
// Aufruf dieselbe Farbe, das gilt automatisch auch für alle bereits
// bestehenden Ordner. "Ohne Ordner" bleibt neutral. Sättigung/Helligkeit
// bewusst mittig gewählt: erkennbar pastellig, aber weder blass noch
// grell (kein zu starker Kontrast).
function folderColorStyle(id) {
  if (!id) return "";
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return ` style="--folder-bg:hsl(${hue} 58% 84%);--folder-line:hsl(${hue} 40% 68%);--folder-fg:hsl(${hue} 45% 26%)"`;
}

// dateiCards: bereits auf Typ "datei" und die aktive Klasse gefilterte Liste.
function renderFolderView(dateiCards) {
  const backHead = (label, action, extra = "") => `
    <div class="dateien-head">
      <button class="btn ghost back-btn" data-action="${action}">${ICONS.arrowLeft}${esc(label)}</button>
      <span class="spacer"></span>
      ${extra}
    </div>`;

  if (openFolderId === undefined) {
    const groups = new Map();
    for (const c of dateiCards) {
      const key = c.folder_id || "";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(c);
    }
    const seen = loadFolderSeen();
    const folderTile = (key, name) => {
      const items = groups.get(key) || [];
      const newCount = items.filter((c) => new Date(c.created_at).getTime() > (seen[key] || 0)).length;
      return `
        <button class="folder-tile" data-action="open-folder" data-folder="${esc(key)}"${folderColorStyle(key)}>
          ${newCount ? `<span class="count-badge">${newCount}</span>` : ""}
          <span class="folder-tile-icon">${ICONS.folder}</span>
          <span class="folder-tile-label">${esc(name)}</span>
          <span class="folder-tile-count">${items.length} ${items.length === 1 ? "Datei" : "Dateien"}</span>
        </button>`;
    };
    // Gemeinsame Ordner (class_id null) sind in jeder Klassenansicht
    // sichtbar — gleiches Prinzip wie inActiveClass() bei Karten.
    // ideen-backlog.md #43 (Council-Feature-Idee): alphabetisch statt nach
    // Erstellungsreihenfolge — erleichtert das Wiederfinden bei vielen
    // Ordnern (Klassenlisten, Elternbriefe, Fotos, Formulare …).
    const foldersHere = foldersList
      .filter((f) => !activeClassId || !f.class_id || f.class_id === activeClassId)
      .sort((a, b) => a.name.localeCompare(b.name, "de"));
    const tiles = foldersHere.map((f) => folderTile(f.id, f.class_id ? f.name : `🏫 ${f.name}`)).join("")
      + folderTile("", "Ohne Ordner")
      + (!isAdmin() ? "" : `
        <button class="folder-tile folder-tile-new" data-action="create-folder">
          <span class="folder-tile-icon">+</span>
          <span class="folder-tile-label">Neuer Ordner</span>
        </button>`);
    return `<div class="folder-grid">${tiles}</div>`;
  }

  const items = dateiCards.filter((c) => (c.folder_id || "") === openFolderId);
  const folder = foldersList.find((f) => f.id === openFolderId);
  markFolderSeen(openFolderId);
  const manage = (isAdmin() && folder) ? `
    <button class="btn small" data-action="rename-folder" data-folder="${folder.id}">Umbenennen</button>
    <button class="btn small danger" data-action="delete-folder" data-folder="${folder.id}">Löschen</button>` : "";
  const dot = folder ? `<span class="folder-color-dot"${folderColorStyle(folder.id)}></span>` : "";
  // Nutzerwunsch 18.09.2026 (Design-Review): reine Foto-Karten (alle
  // angehängten Dateien sind Bilder) als kompaktes Vorschau-Raster statt
  // als einzelne volle Karten — vorher musste man für z. B. 9 Fotos durch
  // 9 fast bildschirmfüllende Karten scrollen, jede mit einer redundanten
  // Dateiname/Größe-Box unter dem großen Bild. Karten mit PDFs oder
  // gemischten Anhängen bleiben unverändert als Liste (dort ist die
  // Karten-Darstellung mit Titel/Beschreibung sinnvoll).
  const isPhotoCard = (c) => {
    const files = c.files || [];
    return files.length > 0 && files.every((f) => f.mime_type.startsWith("image/"));
  };
  const photoCards = items.filter(isPhotoCard);
  const otherCards = items.filter((c) => !isPhotoCard(c));
  const photoGrid = photoCards.length
    ? `<div class="photo-grid">${photoCards.map(renderPhotoGridTile).join("")}</div>` : "";
  const otherList = otherCards.map(renderCard).join("");

  return backHead("Ordner", "open-folder-grid", manage)
    + `<h2 class="group-label" style="margin:4px 2px 12px">${dot}${esc(folder ? folder.name : "Ohne Ordner")}</h2>`
    + `<div class="group-body">${items.length
        ? photoGrid + otherList
        : `<p class="rubrik-panel-empty">Noch keine Datei in diesem Ordner.</p>`}</div>`;
}

// Eine Foto-Kachel im Vorschau-Raster (siehe renderFolderView) — zeigt das
// erste angehängte Bild, "+N" bei mehreren, und dieselben Admin-Aktionen
// wie renderCard() (Bearbeiten/Verschieben/Anpinnen/Archiv/Löschen), nur
// kompakter über ein "..."-Menü in der Ecke statt im card-top-Streifen.
function renderPhotoGridTile(c) {
  const files = c.files || [];
  const first = files[0];
  const url = fileUrl(first.storage_path);
  const extra = files.length - 1;
  const inTrash = !!c.trashed_at;
  let menu;
  if (inTrash) {
    menu = `
      <button data-action="restore" data-card="${c.id}">Wiederherstellen</button>
      <button class="danger" data-action="delete-forever" data-card="${c.id}">Endgültig löschen</button>`;
  } else {
    const archiveBtn = isArchived(c)
      ? `<button data-action="unarchive-card" data-card="${c.id}">Aus Archiv zurückholen</button>`
      : `<button data-action="archive-card" data-card="${c.id}">In Archiv verschieben</button>`;
    menu = `
      <button data-action="edit" data-card="${c.id}">Bearbeiten</button>
      <button data-action="move-file" data-card="${c.id}">In Ordner verschieben</button>
      <button data-action="pin" data-card="${c.id}">${c.pinned ? "Nicht mehr anpinnen" : "Oben anpinnen"}</button>
      ${archiveBtn}
      <button class="danger" data-action="trash" data-card="${c.id}">Löschen</button>`;
  }
  return `
    <div class="photo-tile ${c.pinned && !inTrash ? "pinned" : ""}">
      <a class="photo-tile-link" href="${url}" target="_blank" rel="noopener noreferrer">
        <img class="photo-tile-img" src="${url}" alt="${esc(c.title)}" loading="lazy">
        ${extra > 0 ? `<span class="photo-tile-more">+${extra}</span>` : ""}
      </a>
      ${!isAdmin() ? "" : `
      <details class="menu photo-tile-menu">
        <summary title="Aktionen">${ICONS.menu}</summary>
        <div class="menu-list">${menu}</div>
      </details>`}
      ${c.title ? `<div class="photo-tile-caption">${isNew(c) ? NEU_DOT : ""}${esc(c.title)}</div>` : ""}
    </div>`;
}

/* ---------- Kalender & Stundenplan (ideen-backlog.md #11) ---------- */

const WEEKDAY_LABEL = ["", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const WEEKDAY_SHORT = ["", "Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

// JS: 0=Sonntag…6=Samstag. Wir zählen wie in der Datenbank 1=Montag…7=Sonntag.
function isoWeekday(date) {
  const d = date.getDay();
  return d === 0 ? 7 : d;
}

function toISODate(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

// Ferienzeitraum, in dem das Datum liegt (oder null) — an diesen Tagen
// blenden Stundenplan und wiederkehrende Termine aus (siehe Migration 018).
function holidayForDate(dateStr) {
  return schoolHolidays.find((h) => dateStr >= h.start_date && dateStr <= h.end_date) || null;
}

// Wie inActiveClass() bei Karten, nur allgemein für class_id-Felder anderer
// Tabellen (recurring_events) — eigene Klasse + "Gemeinsam" sind sichtbar.
function inActiveClassGeneric(classId) {
  return !activeClassId || classId === activeClassId || !classId;
}

function scheduleForDate(dateStr, weekday) {
  if (holidayForDate(dateStr)) return [];
  if (!activeClassId) return []; // Stundenplan ist pro Klasse — bei "Beide Klassen" nicht eindeutig
  return scheduleSlots
    .filter((s) => s.weekday === weekday && s.class_id === activeClassId)
    .sort((a, b) => a.period - b.period);
}

function recurringForDate(dateStr, weekday) {
  if (holidayForDate(dateStr)) return [];
  return recurringEvents
    .filter((r) => r.weekday === weekday && inActiveClassGeneric(r.class_id))
    .sort((a, b) => String(a.start_time || "").localeCompare(String(b.start_time || "")));
}

function termineForDate(dateStr) {
  return cards.filter((c) =>
    c.type === "termin" && !c.trashed_at && c.event_date === dateStr && inActiveClass(c));
}

// ISO-8601-Kalenderwoche (Woche 1 enthält den ersten Donnerstag des Jahres)
// — reine Berechnung, kein Datenbankzugriff nötig. Nutzerwunsch 12.09.2026:
// Wochennummer links neben jeder Kalenderzeile.
function isoWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function renderKalenderMonth() {
  const month = calendarMonth || (calendarMonth = (() => { const t = todayStart(); t.setDate(1); return t; })());
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const startOffset = isoWeekday(first) - 1; // Raster beginnt am Montag
  const gridStart = new Date(first);
  gridStart.setDate(gridStart.getDate() - startOffset);
  const today = toISODate(todayStart());

  // Nutzerwunsch 12.09.2026: statt eines einzigen durchgehenden Rasters
  // jetzt eine eigene Zeile pro Kalenderwoche — dadurch kann jede Zeile
  // einen abwechselnden Hintergrund (bessere Lesbarkeit) und eine eigene
  // Wochennummer bekommen, und ein zusammenhängender Ferienzeitraum lässt
  // sich als durchgehender Balken über die Zeile zeichnen statt einzelner
  // ausgegrauter Kästchen mit Lücken.
  let weekRows = "";
  let dayCount = 0;
  for (let week = 0; week < 6; week++) {
    let weekCells = "";
    let weekNum = null;
    for (let wd = 0; wd < 7; wd++) {
      const i = week * 7 + wd;
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      const dateStr = toISODate(d);
      const weekday = isoWeekday(d);
      if (weekNum === null) weekNum = isoWeekNumber(d);
      const inMonth = d.getMonth() === month.getMonth();
      const holiday = holidayForDate(dateStr);
      // Für den durchgehenden Ferienbalken: gehört der Vortag/Folgetag
      // (innerhalb derselben Woche) ebenfalls zum selben Ferienzeitraum?
      const holidayPrev = wd > 0 && holiday
        ? holidayForDate(toISODate(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1))) === holiday
        : false;
      const holidayNext = wd < 6 && holiday
        ? holidayForDate(toISODate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1))) === holiday
        : false;
      const cls = [
        "cal-day",
        inMonth ? "" : "outside",
        dateStr === today ? "is-today" : "",
        holiday ? "is-holiday" : "",
        holiday && !holidayPrev ? "is-holiday-start" : "",
        holiday && !holidayNext ? "is-holiday-end" : "",
      ].filter(Boolean).join(" ");
      // Nutzerwunsch 11.09.2026: statt nur eines Punkts steht ein kurzer
      // Titel-Ausschnitt direkt in der Tageszelle ("Schlagwort"), damit auf
      // einen Blick erkennbar ist, WAS an dem Tag ansteht, nicht nur DASS
      // etwas ansteht — dichter am Google-Kalender-Gefühl. Wiederkehrende
      // Ereignisse bleiben ein schlanker Punkt (kein festes Datum, jede
      // Woche gleich, bräuchten sonst zu viel Platz in jeder Zelle).
      const dayTermine = holiday ? [] : termineForDate(dateStr);
      const recurring = holiday ? [] : recurringForDate(dateStr, weekday);
      // Nutzerwunsch 18.09.2026 (Design-Review): abgeschnittener Titel-Text
      // ("3. Elt…") war in der kleinen Kalenderzelle nicht lesbar UND stand
      // direkt darüber der ausführlichen Liste doppelt — jetzt wie in
      // praktisch jedem Kalender (Google, Apple, Outlook) nur ein kleiner
      // Punkt pro Termin an diesem Tag, maximal 3 + "+N". Die Liste
      // darunter bleibt die eigentliche, lesbare Quelle.
      const dotCount = Math.min(dayTermine.length, 3);
      const dots = dayTermine.slice(0, dotCount).map(() => `<span class="cal-day-termin-dot"></span>`).join("");
      const moreDot = dayTermine.length > 3 ? `<span class="cal-day-termin-more">+${dayTermine.length - 3}</span>` : "";
      weekCells += `
        <button type="button" class="${cls}" data-action="cal-day" data-date="${dateStr}" title="${holiday ? esc(holiday.label) : dayTermine.map((t) => t.title).join(", ")}">
          <span class="cal-day-num">${d.getDate()}</span>
          ${dots || moreDot ? `<span class="cal-day-termin-dots">${dots}${moreDot}</span>` : ""}
          ${recurring.length ? `<span class="cal-day-dot cal-day-dot-recurring" title="Wiederkehrendes Ereignis"></span>` : ""}
        </button>`;
      dayCount++;
    }
    weekRows += `
      <div class="cal-week-row ${week % 2 === 0 ? "cal-week-dark" : "cal-week-light"}">
        <span class="cal-week-num">${weekNum}</span>
        <div class="cal-week-days">${weekCells}</div>
      </div>`;
    // Nach der Woche, in der der Monat endet, aufhören — nicht unnötig eine
    // ganze weitere, leere Woche anhängen. (Bugfix 21.09.2026: Vorher wurde
    // schon VOR dem Eintragen dieser letzten Woche abgebrochen, dadurch
    // fehlten z. B. im September 2026 der 28.–30. und im Oktober der
    // 26.–31. im Kalender.)
    const wocheEnde = new Date(gridStart);
    wocheEnde.setDate(gridStart.getDate() + week * 7 + 6);
    if (wocheEnde >= new Date(month.getFullYear(), month.getMonth() + 1, 0)) break;
  }

  return `
    <div class="cal-head">
      <button type="button" class="icon-btn" data-action="cal-prev" aria-label="Vorheriger Monat">${ICONS.chevron.replace("<svg", `<svg style="transform:scaleX(-1)"`)}</button>
      <b>${month.toLocaleDateString("de-DE", { month: "long", year: "numeric" })}</b>
      <button type="button" class="icon-btn" data-action="cal-next" aria-label="Nächster Monat">${ICONS.chevron}</button>
    </div>
    <div class="cal-weekdays"><span class="cal-week-num-spacer"></span><div class="cal-week-days">${WEEKDAY_SHORT.slice(1).map((w) => `<span>${w}</span>`).join("")}</div></div>
    <div class="cal-grid" id="calGrid">${weekRows}</div>`;
}

// Nutzerwunsch 11.09.2026: Kalender und Termin-Rubrik gehören zusammen —
// unter der Monatsübersicht steht direkt die Liste aller Termine dieses
// Monats (nicht mehr nur eines angetippten Tages), chronologisch
// sortiert, als dieselben einklappbaren Streifen wie zuvor in der
// separaten Termin-Rubrik (renderTerminStrip — antippen öffnet die volle
// Karte). Wiederkehrende Ereignisse haben kein festes Datum und stehen
// deshalb weiterhin nur im Kalender selbst (Punkt am Wochentag), nicht in
// dieser Liste.
function renderMonatsTermine(termine) {
  const month = calendarMonth;
  const monthTermine = termine
    .filter((c) => {
      const d = parseISODate(c.event_date);
      return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth();
    })
    .sort((a, b) => String(a.event_date).localeCompare(String(b.event_date))
      || String(a.event_time || "").localeCompare(String(b.event_time || "")));

  const extras = renderMonatsExtras();
  if (!monthTermine.length) {
    return `<p class="rubrik-panel-empty">Keine Termine in diesem Monat.</p>${extras}`;
  }
  return `<div id="calMonthTermine">${monthTermine.map(renderTerminStrip).join("")}</div>${extras}`;
}

// Nutzerwunsch 21.09.2026: Wiederkehrende Ereignisse und Ferien/freie Tage
// standen bisher nur als Markierung im Kalender — als eigene Zeile fehlten
// sie, also ließen sie sich nachträglich nicht bearbeiten oder anpinnen.
// Jetzt je Eintrag eine schmale Zeile unter den Terminen des Monats.
// Wiederkehrende nur, wenn sie in diesem Monat wenigstens einmal wirklich
// stattfinden (nicht komplett in den Ferien).
function fmtDatumBereich(start, end) {
  const a = parseISODate(start), b = parseISODate(end);
  if (start === end) return `${a.getDate()}. ${MONAT_KURZ[a.getMonth()]}`;
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
    return `${a.getDate()}.–${b.getDate()}. ${MONAT_KURZ[a.getMonth()]}`;
  }
  return `${a.getDate()}. ${MONAT_KURZ[a.getMonth()]} – ${b.getDate()}. ${MONAT_KURZ[b.getMonth()]}`;
}

function renderMonatsExtras() {
  const y = calendarMonth.getFullYear(), m = calendarMonth.getMonth();
  const tageImMonat = new Date(y, m + 1, 0).getDate();
  const iso = (tag) => `${y}-${pad2(m + 1)}-${pad2(tag)}`;
  const ersterTag = iso(1), letzterTag = iso(tageImMonat);

  const findetStatt = (r) => {
    for (let t = 1; t <= tageImMonat; t++) {
      if (isoWeekday(new Date(y, m, t)) === r.weekday && !holidayForDate(iso(t))) return true;
    }
    return false;
  };
  const wiederkehrend = recurringEvents
    .filter((r) => inActiveClassGeneric(r.class_id) && findetStatt(r))
    .sort((a, b) => a.weekday - b.weekday || String(a.start_time || "").localeCompare(String(b.start_time || "")));
  const ferien = schoolHolidays
    .filter((h) => h.start_date <= letzterTag && h.end_date >= ersterTag)
    .sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)));
  if (!wiederkehrend.length && !ferien.length) return "";

  const menu = (items) => !isAdmin() ? "" : `
    <details class="menu cal-extra-menu">
      <summary title="Aktionen">${ICONS.menu}</summary>
      <div class="menu-list">${items}</div>
    </details>`;

  const zeilenW = wiederkehrend.map((r) => {
    const klasse = r.class_id ? (CLASS_ICON[classesList.find((c) => c.id === r.class_id)?.slug] || "") : "";
    const zeit = r.start_time ? fmtTimeRange(r.start_time, r.end_time).replace(/ Uhr$/, "") : "";
    return `
      <div class="cal-extra-row ${r.pinned ? "is-pinned" : ""}">
        <span class="cal-extra-tag">Jeden ${WEEKDAY_SHORT[r.weekday]}</span>
        <span class="cal-extra-title">${esc(r.title)}${klasse ? ` <span class="who">${klasse}</span>` : ""}</span>
        <span class="cal-extra-zeit">${esc(zeit)}</span>
        ${r.pinned ? `<span class="cal-extra-pin" title="Auf der Startseite angepinnt" aria-label="Auf der Startseite angepinnt">${ICONS.pin}</span>` : ""}
        ${menu(`
          <button data-action="recurring-edit-row" data-id="${r.id}">Bearbeiten</button>
          <button data-action="recurring-pin-row" data-id="${r.id}" data-pinned="${r.pinned ? "1" : "0"}">${r.pinned ? "Nicht mehr anpinnen" : "Auf der Startseite anpinnen"}</button>
          <button class="danger" data-action="recurring-delete-row" data-id="${r.id}">Löschen</button>`)}
      </div>`;
  }).join("");

  const zeilenF = ferien.map((h) => `
      <div class="cal-extra-row">
        <span class="cal-extra-tag">${esc(fmtDatumBereich(h.start_date, h.end_date))}</span>
        <span class="cal-extra-title">${esc(h.label)}</span>
        <span class="cal-extra-zeit">kein Unterricht</span>
        ${menu(`
          <button data-action="holiday-edit-row" data-id="${h.id}">Bearbeiten</button>
          <button class="danger" data-action="holiday-delete-row" data-id="${h.id}">Löschen</button>`)}
      </div>`).join("");

  return `<div class="cal-extras">
    ${zeilenW ? `<h3 class="cal-extra-label">Wiederkehrend</h3>${zeilenW}` : ""}
    ${zeilenF ? `<h3 class="cal-extra-label">Ferien &amp; freie Tage</h3>${zeilenF}` : ""}
  </div>`;
}

// Bearbeiten eines wiederkehrenden Ereignisses / eines Ferienblocks — von der
// Zeile in der Monatsübersicht und aus der Verwaltungsliste genutzt.
// Liefert true, wenn gespeichert wurde.
async function editRecurring(id) {
  const r = recurringEvents.find((x) => x.id === id);
  if (!r) return false;
  const vals = await promptDlg("Wiederkehrendes Ereignis bearbeiten", [
    { name: "title", label: "Titel", value: r.title, maxlength: 120 },
    { name: "weekday", label: "Wochentag", value: String(r.weekday), options: WOCHENTAG_OPTIONS },
    { name: "start_time", label: "Uhrzeit von (optional)", type: "time", optional: true,
      value: r.start_time ? r.start_time.slice(0, 5) : "" },
    { name: "end_time", label: "Uhrzeit bis (optional)", type: "time", optional: true,
      value: r.end_time ? r.end_time.slice(0, 5) : "" },
    { name: "class_id", label: "Gilt für", value: r.class_id || "",
      options: [{ value: "", label: "Beide Klassen" }].concat(
        classesList.map((cl) => ({ value: cl.id, label: `${CLASS_ICON[cl.slug] || ""} ${cl.name}` }))) },
  ]);
  if (!vals) return false;
  const start = vals.start_time || null;
  const end = start ? (vals.end_time || null) : null;
  if (end && end <= start) { toast("Die Endzeit muss nach der Startzeit liegen.", true); return false; }
  try {
    await rpc("update_recurring_event", {
      p_id: id,
      p: { title: vals.title, weekday: Number(vals.weekday), start_time: start, end_time: end,
           class_id: vals.class_id || null },
    });
    toast("Änderungen gespeichert.");
    await reload({ silent: true });
    return true;
  } catch (err) {
    toast(err.message, true);
    return false;
  }
}

async function editHoliday(id) {
  const h = schoolHolidays.find((x) => x.id === id);
  if (!h) return false;
  const vals = await promptDlg("Ferien / freien Tag bearbeiten", [
    { name: "label", label: "Bezeichnung", value: h.label, maxlength: 80 },
    { name: "start_date", label: "Von", type: "date", value: h.start_date },
    { name: "end_date", label: "Bis", type: "date", value: h.end_date },
  ]);
  if (!vals) return false;
  if (vals.end_date < vals.start_date) { toast("„Bis“ darf nicht vor „Von“ liegen.", true); return false; }
  const next = schoolHolidays.map((x) => x.id === id
    ? { label: vals.label, start_date: vals.start_date, end_date: vals.end_date }
    : { label: x.label, start_date: x.start_date, end_date: x.end_date });
  try {
    await rpc("set_school_holidays", { p_holidays: next });
    toast("Änderungen gespeichert.");
    await reload({ silent: true });
    return true;
  } catch (err) {
    toast(err.message, true);
    return false;
  }
}

// ideen-backlog.md #22: die Verwaltungspunkte stehen als eigene Kacheln
// direkt unter dem Kalender, statt hinter einem "Verwalten"-Knopf in
// einem Zwischenmenü versteckt zu sein — ein Klick weniger für
// Hauptlink-Nutzer.
// ideen-backlog.md #17: "Stundenplan bearbeiten" gehört nicht hierher —
// die eigenständige Stundenplan-Ansicht (renderStundenplanView()) hat
// bereits ihren eigenen "Bearbeiten"-Knopf, ein zweiter Zugang über den
// Kalender war redundant und irreführend (Kalender != Stundenplan).
// Hier bleiben nur die tatsächlich kalenderbezogenen Verwaltungspunkte.
function renderKalenderView(termine) {
  const adminRow = !isAdmin() ? "" : `
    <div class="cal-admin-row">
      <button type="button" class="btn small ghost" data-action="open-kalender-admin" data-screen="recurring">${ICONS.kalender}Wiederkehrende Ereignisse</button>
      <button type="button" class="btn small ghost" data-action="open-kalender-admin" data-screen="holidays">${ICONS.kalender}Ferien &amp; freie Tage</button>
    </div>`;
  return `<div class="cal-wrap">${renderKalenderMonth()}</div>${renderKalenderAbo()}${renderMonatsTermine(termine)}${adminRow}`;
}

// Kalender-Abo (UX-Forschung 19.09.2026): einmal abonnieren, danach
// erscheinen alle Termine der Klasse von selbst im eigenen Kalender. Der
// Feed kommt aus der Edge Function "kalender" (supabase/functions/kalender).
// Bei "Beide Klassen" ohne ?klasse= — dann alle Termine.
function kalenderAboUrl() {
  const slug = classesList.find((c) => c.id === activeClassId)?.slug || "";
  return `${cfg.SUPABASE_URL}/functions/v1/kalender${slug ? `?klasse=${encodeURIComponent(slug)}` : ""}`;
}
function renderKalenderAbo() {
  const feed = kalenderAboUrl();
  const webcal = feed.replace(/^https?:/, "webcal:");
  const google = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`;
  return `
    <details class="cal-add cal-abo">
      <summary class="btn small ghost">${ICONS.kalender}<span>Alle Termine automatisch in deinen Kalender</span></summary>
      <div class="cal-add-menu">
        <p class="field-hint">Einmal abonnieren — neue und geänderte Termine erscheinen dann von selbst in deinem Kalender (kann ein paar Stunden dauern).</p>
        <a class="btn small ghost" href="${esc(webcal)}">iPhone, Apple- oder Outlook-Kalender</a>
        <a class="btn small ghost" href="${esc(google)}" target="_blank" rel="noopener noreferrer">Google Kalender</a>
        <button type="button" class="btn small ghost" data-action="copy-kalender-abo">Abo-Link kopieren</button>
      </div>
    </details>`;
}

// Antippen eines Kalendertags springt direkt zum passenden Termin in der
// Liste darunter (öffnet ihn gleich, wie ein Klick auf den Streifen
// selbst) statt wie zuvor ein eigenes Tages-Panel aufzuklappen — näher am
// Google-Kalender-Gefühl. Tage ohne Termin, aber mit Ferien/wieder-
// kehrendem Ereignis, zeigen das kurz als Hinweis statt gar nichts zu tun.
function wireKalender() {
  elFeed.querySelectorAll("[data-action='cal-day']").forEach((btn) => btn.addEventListener("click", () => {
    const date = btn.dataset.date;
    const dayTermine = termineForDate(date);
    if (dayTermine.length) {
      openTerminId = dayTermine[0].id;
      render();
      requestAnimationFrame(() => {
        elFeed.querySelector(`[data-card="${dayTermine[0].id}"]`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }
    const holiday = holidayForDate(date);
    if (holiday) { toast(`${holiday.label} — kein Unterricht`); return; }
    const recurring = recurringForDate(date, isoWeekday(parseISODate(date)));
    if (recurring.length) {
      toast(recurring.map((r) => r.start_time
        ? `${r.title} (${fmtTimeRange(r.start_time, r.end_time)})` : r.title).join(", "), false, 6000);
      return;
    }
    toast("Nichts los an diesem Tag.");
  }));
  elFeed.querySelector("[data-action='cal-prev']")?.addEventListener("click", () => {
    calendarMonth.setMonth(calendarMonth.getMonth() - 1);
    render();
  });
  elFeed.querySelector("[data-action='cal-next']")?.addEventListener("click", () => {
    calendarMonth.setMonth(calendarMonth.getMonth() + 1);
    render();
  });

  // Nutzerwunsch 12.09.2026: Monat auch per Wisch-Geste wechseln, nicht nur
  // über die Pfeil-Knöpfe — Schwellenwert 40px waagerecht und deutlich mehr
  // waagerecht als senkrecht, damit normales Scrollen der Seite nicht
  // versehentlich als Wisch gewertet wird.
  const calGrid = elFeed.querySelector("#calGrid");
  if (calGrid) {
    let startX = 0, startY = 0, tracking = false;
    calGrid.addEventListener("touchstart", (ev) => {
      const t = ev.touches[0];
      startX = t.clientX; startY = t.clientY; tracking = true;
    }, { passive: true });
    calGrid.addEventListener("touchend", (ev) => {
      if (!tracking) return;
      tracking = false;
      const t = ev.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      calendarMonth.setMonth(calendarMonth.getMonth() + (dx < 0 ? 1 : -1));
      render();
    }, { passive: true });
  }
}

/* ---------- Stundenplan-Ansicht (eigenständige Rubrik) ------------------ */
// Reine Lese-Tabelle, 5 Spalten (Mo–Fr) — die Bearbeitung läuft weiterhin
// über die Verwaltung (renderKalAdminSchedule), der "Bearbeiten"-Button
// hier ist das Sprungbrett dahin. Erreichbar wie jede andere Rubrik über
// den Stundenplan-Reiter auf der Startseite (renderStundenplanStrip()).
function renderStundenplanTable() {
  if (!activeClassId) {
    return `<p class="rubrik-panel-empty">Bitte oben eine Klasse wählen, um den Stundenplan zu sehen.</p>`;
  }

  const byPeriod = new Map();
  for (const s of scheduleSlots.filter((s) => s.class_id === activeClassId)) {
    if (!byPeriod.has(s.period)) byPeriod.set(s.period, {});
    byPeriod.get(s.period)[s.weekday] = s;
  }
  const periods = [...byPeriod.keys()].sort((a, b) => a - b);

  if (!periods.length) {
    return `<p class="rubrik-panel-empty">Für diese Klasse ist noch kein Stundenplan hinterlegt.</p>`;
  }

  const rows = periods.map((p) => {
    const cells = byPeriod.get(p);
    const first = Object.values(cells)[0];
    return `
      <tr>
        <td class="stundenplan-time">${esc(fmtTime(first?.start_time))}<br>${esc(fmtTime(first?.end_time))}</td>
        ${[1, 2, 3, 4, 5].map((wd) => cells[wd]
          ? `<td>${esc(cells[wd].subject)}${cells[wd].room ? `<br><span class="stundenplan-room">${esc(cells[wd].room)}</span>` : ""}</td>`
          : `<td class="stundenplan-empty">–</td>`).join("")}
      </tr>`;
  }).join("");

  return `
    <table class="stundenplan-table">
      <thead><tr><th></th>${WEEKDAY_SHORT.slice(1, 6).map((w) => `<th>${w}</th>`).join("")}</tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderStundenplanView() {
  const head = !isAdmin() ? "" : `
    <div class="dateien-head">
      <span class="spacer"></span>
      <button class="btn small ghost" data-action="edit-stundenplan">Bearbeiten</button>
    </div>`;
  return head + renderStundenplanTable();
}

/* ---------- Verwaltung: Stundenplan/Ereignisse/Ferien (nur Hauptlink) --- */
// Eigener, kleiner "Screen"-Mechanismus innerhalb von dlgKalenderAdmin:
// renderKalAdminHome/-Schedule/-Recurring/-Holidays füllen jeweils
// elKalAdminBody komplett neu und verdrahten sich selbst — kein
// zusätzlicher globaler Klick-Handler nötig, wie bei promptDlg/confirmDlg.

const WOCHENTAG_OPTIONS = [1, 2, 3, 4, 5, 6, 7].map((n) => ({ value: String(n), label: WEEKDAY_LABEL[n] }));

function klassenOptionsMitGemeinsam(selected) {
  const opts = [{ value: "", label: "Beide Klassen" }].concat(
    classesList.map((cl) => ({ value: cl.id, label: `${CLASS_ICON[cl.slug] || ""} ${cl.name}` })));
  return opts.map((o) => `<option value="${esc(o.value)}" ${o.value === (selected || "") ? "selected" : ""}>${esc(o.label)}</option>`).join("");
}

function openKalenderAdmin(startScreen) {
  if (startScreen === "schedule") renderKalAdminSchedule();
  else if (startScreen === "recurring") renderKalAdminRecurring();
  else if (startScreen === "holidays") renderKalAdminHolidays();
  else renderKalAdminHome();
  dlgKalenderAdmin.showModal();
}

function renderKalAdminHome() {
  elKalAdminBody.innerHTML = `
    <h2>Kalender verwalten</h2>
    <div class="more-list">
      <button type="button" class="more-item" data-admin="schedule">${ICONS.kalender}Stundenplan bearbeiten</button>
      <button type="button" class="more-item" data-admin="recurring">${ICONS.kalender}Wiederkehrende Ereignisse</button>
      <button type="button" class="more-item" data-admin="holidays">${ICONS.kalender}Ferien &amp; freie Tage</button>
    </div>
    <div class="dlg-actions">
      <button type="button" class="btn ghost" data-close>Schließen</button>
    </div>`;
  elKalAdminBody.querySelectorAll("[data-admin]").forEach((btn) => btn.addEventListener("click", () => {
    if (btn.dataset.admin === "schedule") renderKalAdminSchedule();
    else if (btn.dataset.admin === "recurring") renderKalAdminRecurring();
    else renderKalAdminHolidays();
  }));
}

/* ---------- Feedback (Nutzerwunsch 12.09.2026, migration-023/024) -------
   Rein technisches Feedback (Bugs, Verbesserungsvorschläge) von Nutzern an
   die Admins — eigene Rubrik statt Dialog, erreichbar über "Mehr" ->
   "Feedback" für alle. Nutzer sehen ein Sende-Formular (Name + Text),
   Admins statt dessen die Liste aller Nachrichten mit einem Feld für einen
   internen Kommentar (keine Antwort an den Absender — Feedback ist
   anonym, es gibt keinen Rückkanal). */

let feedbackEntries = null; // null = noch nicht geladen

async function loadFeedbackEntries() {
  try {
    feedbackEntries = await rpc("list_feedback", {});
  } catch (err) {
    feedbackEntries = { error: err.message || "Laden fehlgeschlagen." };
  }
  if (Array.isArray(feedbackEntries)) setFeedbackBadge(feedbackEntries);
  if (view === "feedback") render();
}

function setFeedbackBadge(entries) {
  if (!elFeedbackBadge) return;
  const unread = isAdmin() ? entries.filter((f) => !f.read_at).length : 0;
  elFeedbackBadge.textContent = String(unread);
  elFeedbackBadge.hidden = unread === 0;
  if (elFeedbackBtn) {
    elFeedbackBtn.setAttribute("aria-label",
      unread ? `Feedback, ${unread} ungelesen` : (isAdmin() ? "Feedback lesen" : "Feedback geben"));
  }
}

// ideen-backlog.md #43 (Council-Feature-Idee): kleiner Zähler am
// "Feedback"-Menüpunkt, solange ungelesene Elternnachrichten vorliegen —
// nur beim Öffnen des "Mehr"-Menüs abgefragt (kein zusätzliches Polling),
// nur für Admins relevant.
async function refreshFeedbackBadge() {
  if (!elFeedbackBadge || !isAdmin()) {
    if (elFeedbackBadge) elFeedbackBadge.hidden = true;
    return;
  }
  try {
    const entries = await rpc("list_feedback", {});
    setFeedbackBadge(Array.isArray(entries) ? entries : []);
  } catch {
    elFeedbackBadge.hidden = true;
  }
}

function renderFeedbackView() {
  if (!isAdmin()) {
    return `
      <div class="feedback-form">
        <p class="rubrik-panel-hint">Technisches Problem gefunden oder eine Idee für die App? Kurz beschreiben — landet direkt bei den Admins.</p>
        <label class="field"><span>Dein Name</span>
          <input type="text" id="feedbackName" maxlength="80" placeholder="Name">
        </label>
        <label class="field"><span>Nachricht</span>
          <textarea id="feedbackMessage" maxlength="2000" rows="5" placeholder="Was ist los?"></textarea>
        </label>
        <button type="button" class="btn primary" data-action="feedback-submit">Absenden</button>
      </div>`;
  }

  if (feedbackEntries === null) {
    loadFeedbackEntries();
    return `<p class="rubrik-panel-empty">Lädt…</p>`;
  }
  if (feedbackEntries.error) {
    return `<p class="rubrik-panel-empty">${esc(feedbackEntries.error)}</p>`;
  }
  if (!feedbackEntries.length) {
    return `<p class="rubrik-panel-empty">Noch kein Feedback eingegangen.</p>`;
  }
  return `<div class="feedback-list">` + feedbackEntries.map((f) => {
    const cls = classesList.find((c) => c.id === f.class_id);
    return `
      <div class="feedback-item ${f.read_at ? "" : "is-unread"}" data-id="${f.id}">
        <div class="feedback-item-head">
          <b>${esc(f.sender_name)}</b>
          ${cls ? `<span class="class-chip">${CLASS_ICON[cls.slug] || ""} ${esc(cls.name)}</span>` : ""}
          ${!f.read_at ? `<span class="feedback-dot" title="Neu"></span>` : ""}
        </div>
        <p class="feedback-item-message">${esc(f.message)}</p>
        <span class="feedback-item-date">${fmtTimestamp(f.created_at)}</span>
        <label class="field feedback-comment-field"><span>Interner Kommentar</span>
          <textarea maxlength="2000" rows="2" placeholder="Notiz für die Admins, z. B. „erledigt“…">${esc(f.admin_comment || "")}</textarea>
        </label>
        <div class="feedback-item-actions">
          <button type="button" class="btn small ghost" data-action="feedback-comment-save" data-id="${f.id}">Kommentar speichern</button>
          <button type="button" class="btn small ghost danger" data-action="feedback-delete" data-id="${f.id}">Löschen</button>
        </div>
      </div>`;
  }).join("") + `</div>`;
}

// ---- Stundenplan ----

// ideen-backlog.md #22: eine Stundenplan-Zeile gilt als "Nachmittag", wenn
// ihre Startzeit ab 12:00 liegt (String-Vergleich reicht bei "HH:MM").
// Rein editor-seitige Anzeigehilfe, keine eigene Datenbank-Spalte nötig —
// die Werte bleiben beim Ausblenden erhalten, nur die Zelle wird versteckt.
function isAfternoonTime(hhmm) {
  return !!hhmm && hhmm >= "12:00";
}

function renderKalAdminSchedule(classId) {
  classId = classId || activeClassId || classesList[0]?.id || "";
  const periods = [1, 2, 3, 4, 5, 6];
  const byPeriod = new Map();
  for (const s of scheduleSlots.filter((s) => s.class_id === classId)) {
    if (!byPeriod.has(s.period)) byPeriod.set(s.period, {});
    byPeriod.get(s.period)[s.weekday] = s;
  }
  const usedPeriods = periods.filter((p) => byPeriod.has(p));
  const rows = (usedPeriods.length ? usedPeriods : [1]).map((p) => {
    const cells = byPeriod.get(p) || {};
    const first = Object.values(cells)[0];
    const start = first?.start_time?.slice(0, 5) || "";
    return `
      <tr data-period="${p}" data-afternoon="${isAfternoonTime(start) ? "1" : ""}">
        <td><input type="text" class="sched-time" data-role="start" value="${esc(start)}" placeholder="08:10" size="5"></td>
        <td><input type="text" class="sched-time" data-role="end" value="${esc(first?.end_time?.slice(0, 5) || "")}" placeholder="09:45" size="5"></td>
        ${[1, 2, 3, 4, 5].map((wd) => `<td><input type="text" class="sched-subject" data-weekday="${wd}" value="${esc(cells[wd]?.subject || "")}" placeholder="—"></td>`).join("")}
        <td><button type="button" class="icon-btn" data-action="sched-remove-row" title="Zeile entfernen">✕</button></td>
      </tr>`;
  }).join("");

  elKalAdminBody.innerHTML = `
    <h2>Stundenplan</h2>
    <label class="field">
      <span>Klasse</span>
      <select id="schedClassSelect">${classesList.map((cl) =>
        `<option value="${esc(cl.id)}" ${cl.id === classId ? "selected" : ""}>${CLASS_ICON[cl.slug] || ""} ${esc(cl.name)}</option>`).join("")}</select>
    </label>
    <div class="sched-nachmittag-row">
      <span class="sched-nachmittag-label">Nachmittag an:</span>
      ${[1, 2, 3, 4, 5].map((wd) => `
        <label class="sched-nachmittag-toggle">
          <input type="checkbox" data-weekday-toggle="${wd}" checked>
          <span>${WEEKDAY_SHORT[wd]}</span>
        </label>`).join("")}
    </div>
    <div class="table-scroll">
      <table class="sched-table">
        <thead><tr><th>von</th><th>bis</th>${WEEKDAY_SHORT.slice(1, 6).map((w) => `<th>${w}</th>`).join("")}<th></th></tr></thead>
        <tbody id="schedRows">${rows}</tbody>
      </table>
    </div>
    <button type="button" class="btn link" data-action="sched-add-row">+ Stunde hinzufügen</button>
    <p class="field-hint">Leere Felder bei einem Fach lassen die Stunde an dem Tag einfach weg.
      Mit "Nachmittag an" oben blendest du die Nachmittagsstunden (ab 12:00)
      für einzelne Tage aus — die Einträge bleiben dabei erhalten.</p>
    <div class="dlg-actions">
      <button type="button" class="btn ghost" data-action="admin-back">Zurück</button>
      <button type="button" class="btn primary" data-action="sched-save">Speichern</button>
    </div>`;

  $("schedClassSelect").addEventListener("change", (ev) => renderKalAdminSchedule(ev.target.value));
  elKalAdminBody.querySelector("[data-action='admin-back']").addEventListener("click", renderKalAdminHome);
  elKalAdminBody.querySelector("[data-action='sched-add-row']").addEventListener("click", () => {
    const nextPeriod = Math.max(0, ...[...elKalAdminBody.querySelectorAll("#schedRows tr")].map((tr) => Number(tr.dataset.period))) + 1;
    $("schedRows").insertAdjacentHTML("beforeend", `
      <tr data-period="${nextPeriod}">
        <td><input type="text" class="sched-time" data-role="start" placeholder="08:10" size="5"></td>
        <td><input type="text" class="sched-time" data-role="end" placeholder="09:45" size="5"></td>
        ${[1, 2, 3, 4, 5].map((wd) => `<td><input type="text" class="sched-subject" data-weekday="${wd}" placeholder="—"></td>`).join("")}
        <td><button type="button" class="icon-btn" data-action="sched-remove-row" title="Zeile entfernen">✕</button></td>
      </tr>`);
    wireScheduleRemoveButtons();
    wireAfternoonTimeInputs();
  });
  wireScheduleRemoveButtons();
  wireAfternoonTimeInputs();
  wireNachmittagToggles();

  function wireScheduleRemoveButtons() {
    elKalAdminBody.querySelectorAll("[data-action='sched-remove-row']").forEach((btn) => {
      btn.onclick = () => btn.closest("tr").remove();
    });
  }

  // Zeile live als "Nachmittag" markieren, sobald die Startzeit ab 12:00
  // eingegeben wird — auch für neu hinzugefügte Zeilen, nicht nur beim
  // ersten Rendern aus bestehenden Daten.
  function wireAfternoonTimeInputs() {
    elKalAdminBody.querySelectorAll("[data-role='start']").forEach((inp) => {
      inp.oninput = () => {
        inp.closest("tr").dataset.afternoon = isAfternoonTime(inp.value.trim()) ? "1" : "";
      };
    });
  }

  function wireNachmittagToggles() {
    elKalAdminBody.querySelectorAll("[data-weekday-toggle]").forEach((cb) => {
      cb.addEventListener("change", () => {
        const wd = cb.dataset.weekdayToggle;
        elKalAdminBody.querySelectorAll(`#schedRows tr[data-afternoon="1"] [data-weekday="${wd}"]`).forEach((inp) => {
          inp.closest("td").hidden = !cb.checked;
        });
      });
    });
  }

  elKalAdminBody.querySelector("[data-action='sched-save']").addEventListener("click", async () => {
    const slots = [];
    // Bug (ideen-backlog.md #19): eine Zeile mit Fach, aber ohne Uhrzeit
    // wurde bisher stillschweigend verworfen — "gespeichert" erschien
    // trotzdem, die Zeile war beim nächsten Öffnen einfach weg. Jetzt wird
    // das vor dem Speichern abgefangen und dem Nutzer angezeigt.
    for (const tr of elKalAdminBody.querySelectorAll("#schedRows tr")) {
      const period = Number(tr.dataset.period);
      const start = tr.querySelector("[data-role='start']").value.trim();
      const end = tr.querySelector("[data-role='end']").value.trim();
      const rowSubjects = [...tr.querySelectorAll(".sched-subject")].filter((inp) => inp.value.trim());
      if (!start || !end) {
        if (rowSubjects.length) {
          toast("Bei einer Zeile mit Fach fehlt die Uhrzeit (von/bis) — bitte ergänzen, sonst geht die Zeile beim Speichern verloren.", true);
          return;
        }
        continue;
      }
      for (const inp of rowSubjects) {
        slots.push({ weekday: Number(inp.dataset.weekday), period, start_time: start, end_time: end, subject: inp.value.trim() });
      }
    }
    try {
      await rpc("set_schedule", { p_class_id: classId, p_slots: slots });
      toast("Stundenplan gespeichert.");
      await reload({ silent: true });
      renderKalAdminSchedule(classId);
    } catch (err) {
      toast(err.message, true);
    }
  });
}

// ---- Wiederkehrende Ereignisse ----

function renderKalAdminRecurring() {
  const rows = recurringEvents.length
    ? recurringEvents.map((r) => `
        <li>
          <span class="grow">
            <b>${WEEKDAY_LABEL[r.weekday]}${r.start_time ? `, ${fmtTimeRange(r.start_time, r.end_time)}` : ""}</b> — ${esc(r.title)}
            ${r.class_id ? `<span class="who">${CLASS_ICON[classesList.find((c) => c.id === r.class_id)?.slug] || ""}</span>` : ""}
          </span>
          <button type="button" class="icon-btn recurring-pin ${r.pinned ? "is-on" : ""}" data-action="recurring-pin" data-id="${r.id}"
                  aria-pressed="${r.pinned ? "true" : "false"}"
                  title="${r.pinned ? "Nicht mehr auf der Startseite anpinnen" : "Auf der Startseite anpinnen"}">${ICONS.pin}</button>
          <button type="button" class="icon-btn" data-action="recurring-edit" data-id="${r.id}" title="Bearbeiten" aria-label="Bearbeiten">✎</button>
          <button type="button" class="icon-btn" data-action="recurring-delete" data-id="${r.id}" title="Löschen">✕</button>
        </li>`).join("")
    : `<p class="rubrik-panel-empty">Noch keine wiederkehrenden Ereignisse.</p>`;

  elKalAdminBody.innerHTML = `
    <h2>Wiederkehrende Ereignisse</h2>
    <ul class="items">${rows}</ul>
    <div class="dlg-actions">
      <button type="button" class="btn ghost" data-action="admin-back">Zurück</button>
      <button type="button" class="btn primary" data-action="recurring-add">+ Neu</button>
    </div>`;

  elKalAdminBody.querySelector("[data-action='admin-back']").addEventListener("click", renderKalAdminHome);
  elKalAdminBody.querySelectorAll("[data-action='recurring-pin']").forEach((btn) => btn.addEventListener("click", async () => {
    const angepinnt = btn.getAttribute("aria-pressed") === "true";
    try {
      await rpc("update_recurring_event", { p_id: btn.dataset.id, p: { pinned: !angepinnt } });
      toast(angepinnt ? "Nicht mehr angepinnt." : "Angepinnt — erscheint auf der Startseite.");
      await reload({ silent: true });
      renderKalAdminRecurring();
    } catch (err) {
      toast(err.message, true);
    }
  }));
  elKalAdminBody.querySelectorAll("[data-action='recurring-edit']").forEach((btn) => btn.addEventListener("click", async () => {
    if (await editRecurring(btn.dataset.id)) renderKalAdminRecurring();
  }));
  elKalAdminBody.querySelectorAll("[data-action='recurring-delete']").forEach((btn) => btn.addEventListener("click", async () => {
    const ok = await confirmDlg("Dieses wiederkehrende Ereignis löschen?", "Löschen");
    if (!ok) return;
    try {
      await rpc("delete_recurring_event", { p_id: btn.dataset.id });
      toast("Gelöscht.");
      await reload({ silent: true });
      renderKalAdminRecurring();
    } catch (err) {
      toast(err.message, true);
    }
  }));
  elKalAdminBody.querySelector("[data-action='recurring-add']").addEventListener("click", async () => {
    const vals = await promptDlg("Neues wiederkehrendes Ereignis", [
      { name: "title", label: "Titel", placeholder: "z. B. Gemeinsames Frühstück", maxlength: 120 },
      { name: "weekday", label: "Wochentag", value: "3", options: WOCHENTAG_OPTIONS },
      { name: "start_time", label: "Uhrzeit von (optional)", type: "time", optional: true },
      { name: "end_time", label: "Uhrzeit bis (optional)", type: "time", optional: true },
      { name: "class_id", label: "Gilt für", value: activeClassId || "",
        options: [{ value: "", label: "Beide Klassen" }].concat(
          classesList.map((cl) => ({ value: cl.id, label: `${CLASS_ICON[cl.slug] || ""} ${cl.name}` }))) },
      { name: "creator_name", label: "Dein Name bzw. deine Funktion",
        placeholder: "z. B. Frau Müller, Lehrkraft", maxlength: 80, value: localStorage.getItem(CREATOR_NAME_KEY) || "" },
    ]);
    if (!vals) return;
    // Endzeit nur zusammen mit Startzeit und danach (Prüfung auch in der Datenbank).
    const endTime = vals.start_time ? (vals.end_time || null) : null;
    if (endTime && endTime <= vals.start_time) {
      toast("Die Endzeit muss nach der Startzeit liegen.", true);
      return;
    }
    localStorage.setItem(CREATOR_NAME_KEY, vals.creator_name);
    try {
      await rpc("create_recurring_event", {
        p: {
          title: vals.title, weekday: Number(vals.weekday),
          start_time: vals.start_time || null, end_time: endTime,
          class_id: vals.class_id || null,
          created_by: vals.creator_name,
        },
      });
      toast("Angelegt.");
      await reload({ silent: true });
      renderKalAdminRecurring();
    } catch (err) {
      toast(err.message, true);
    }
  });
}

// ---- Ferien ----

function renderKalAdminHolidays() {
  const rows = schoolHolidays.length
    ? schoolHolidays.map((h) => `
        <li>
          <span class="grow"><b>${esc(h.label)}</b> — ${fmtDateLong(h.start_date)} bis ${fmtDateLong(h.end_date)}</span>
          <button type="button" class="icon-btn" data-action="holiday-edit" data-id="${h.id}" title="Bearbeiten" aria-label="Bearbeiten">✎</button>
          <button type="button" class="icon-btn" data-action="holiday-delete" data-id="${h.id}" title="Löschen">✕</button>
        </li>`).join("")
    : `<p class="rubrik-panel-empty">Noch keine Ferien eingetragen.</p>`;

  elKalAdminBody.innerHTML = `
    <h2>Ferien &amp; freie Tage</h2>
    <ul class="items">${rows}</ul>
    <div class="dlg-actions">
      <button type="button" class="btn ghost" data-action="admin-back">Zurück</button>
      <button type="button" class="btn primary" data-action="holiday-add">+ Neu</button>
    </div>`;

  elKalAdminBody.querySelector("[data-action='admin-back']").addEventListener("click", renderKalAdminHome);
  elKalAdminBody.querySelectorAll("[data-action='holiday-edit']").forEach((btn) => btn.addEventListener("click", async () => {
    if (await editHoliday(btn.dataset.id)) renderKalAdminHolidays();
  }));
  elKalAdminBody.querySelectorAll("[data-action='holiday-delete']").forEach((btn) => btn.addEventListener("click", async () => {
    const ok = await confirmDlg("Diesen Ferien-/freien Tag löschen?", "Löschen");
    if (!ok) return;
    const rest = schoolHolidays.filter((h) => h.id !== btn.dataset.id)
      .map((h) => ({ label: h.label, start_date: h.start_date, end_date: h.end_date }));
    try {
      await rpc("set_school_holidays", { p_holidays: rest });
      toast("Gelöscht.");
      await reload({ silent: true });
      renderKalAdminHolidays();
    } catch (err) {
      toast(err.message, true);
    }
  }));
  elKalAdminBody.querySelector("[data-action='holiday-add']").addEventListener("click", async () => {
    const vals = await promptDlg("Neuer Ferien-/freier Tag", [
      { name: "label", label: "Bezeichnung", placeholder: "z. B. Herbstferien 2026", maxlength: 80 },
      { name: "start_date", label: "Von (JJJJ-MM-TT)", placeholder: "2026-10-05", maxlength: 10 },
      { name: "end_date", label: "Bis (JJJJ-MM-TT)", placeholder: "2026-10-18", maxlength: 10 },
    ]);
    if (!vals) return;
    const next = schoolHolidays.map((h) => ({ label: h.label, start_date: h.start_date, end_date: h.end_date }))
      .concat([{ label: vals.label, start_date: vals.start_date, end_date: vals.end_date }]);
    try {
      await rpc("set_school_holidays", { p_holidays: next });
      toast("Angelegt.");
      await reload({ silent: true });
      renderKalAdminHolidays();
    } catch (err) {
      toast(err.message, true);
    }
  });
}

const EMPTY_TEXT = {
  archiv: "Noch nichts im Archiv.",
  papierkorb: "Der Papierkorb ist leer.",
};

// Zahl an Termin/Beteiligung/Datei in der Fußleiste: wie viele Einträge
// dort seit dem letzten Besuch neu sind (siehe isNew). Verschwindet, sobald
// man den Bereich in diesem Besuch einmal geöffnet hat — die Einträge selbst
// behalten ihren Neu-Punkt bis zum nächsten Besuch.
const NAV_BADGE_VIEWS = { termine: "termine", kalender: "termine", beteiligung: "beteiligung", dateien: "dateien" };
function updateNavBadges() {
  const all = cards.filter((c) => !c.trashed_at && !isArchived(c) && inActiveClass(c) && isNew(c));
  const counts = {
    termine: all.filter((c) => c.type === "termin").length,
    beteiligung: all.filter((c) => BETEILIGUNG_TYPES.includes(c.type)).length,
    dateien: all.filter((c) => c.type === "datei").length,
  };
  for (const [tab, n] of Object.entries(counts)) {
    const btn = document.querySelector(`#viewTabs [data-view="${tab}"]`);
    if (!btn) continue;
    let badge = btn.querySelector(".bn-badge");
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "bn-badge";
      btn.appendChild(badge);
    }
    badge.textContent = String(n);
    badge.hidden = !n || seenTabsThisVisit.has(tab);
    btn.setAttribute("aria-label", badge.hidden ? btn.title : `${btn.title}, ${n} neu`);
  }
}

// Views mit eigener Leer-Anzeige (Liste/Kacheln zeigen ihren
// Leer-Zustand selbst) — der generische Hinweistext ist dort überflüssig.
const EIGENE_LEER_ANZEIGE = new Set(["feed", "dateien", "termine", "beteiligung", "kalender", "aufgaben", "stundenplan", "feedback"]);

// Ab wie viel Scroll-Distanz der "Nach oben"-Button erscheint — bewusst
// höher als eine Bildschirmhöhe, damit er nicht schon nach kurzem Scrollen
// auftaucht, sondern nur wenn man wirklich weiter unten ist.
const SCROLL_TOP_THRESHOLD = 600;

function updateScrollTopButton() {
  if (!elScrollTopBtn) return;
  const show = EIGENE_LEER_ANZEIGE.has(view) && window.scrollY > SCROLL_TOP_THRESHOLD;
  elScrollTopBtn.hidden = !show;
}

/* ---------- Adressleiste / Verlauf ---------- */
// Jede Ansicht (inkl. aufgeklappter Termin-/Archiv-Streifen und Ordner)
// bekommt einen eigenen URL-Anker, damit die Zurück-Taste des Geräts
// zwischen Ansichten statt aus der App springt, und damit sich einzelne
// Karten direkt verlinken lassen (Push-Klick, Teilen-Button).

// Baut aus dem aktuellen Navigations-Zustand den passenden URL-Anker.
function hashFromState() {
  if (view === "termine") return openTerminId ? `#termine-${openTerminId}` : "#termine";
  if (view === "beteiligung") return "#beteiligung";
  if (view === "dateien") return openFolderId === undefined ? "#dateien" : `#dateien-${openFolderId}`;
  if (view === "archiv") return openArchivId ? `#archiv-${openArchivId}` : "#archiv";
  if (view === "papierkorb") return "#papierkorb";
  if (view === "kalender") return "#kalender";
  if (view === "aufgaben") return "#aufgaben";
  if (view === "stundenplan") return "#stundenplan";
  if (view === "feedback") return "#feedback";
  return "";
}

// Kehrt hashFromState() um: setzt view/openXId anhand eines Ankers aus der
// Adressleiste. "#karte-…"-Links werden hier bewusst NICHT behandelt (die
// brauchen erst geladene Karten, siehe applyInitialHash/openCardById).
function applyHash(hash) {
  const h = (hash || "").replace(/^#/, "");
  if (h.startsWith("termine-")) { view = "termine"; openTerminId = h.slice(8); }
  else if (h === "termine") { view = "termine"; openTerminId = null; }
  else if (h === "beteiligung") { view = "beteiligung"; }
  else if (h.startsWith("dateien-")) { view = "dateien"; openFolderId = h.slice(8); }
  else if (h === "dateien") { view = "dateien"; openFolderId = undefined; }
  else if (h.startsWith("archiv-")) { view = "archiv"; openArchivId = h.slice(7); }
  else if (h === "archiv") { view = "archiv"; openArchivId = null; }
  else if (h === "papierkorb") { view = "papierkorb"; }
  else if (h.startsWith("kalender-")) {
    // Legacy-Link auf einen bestimmten Tag — es gibt kein eigenes
    // Tages-Panel mehr, aber der Monat wird trotzdem passend angezeigt.
    view = "kalender";
    calendarMonth = parseISODate(h.slice(9));
    calendarMonth.setDate(1);
  } else if (h === "kalender") {
    view = "kalender"; calendarMonth = null;
  } else if (h === "aufgaben") { view = "aufgaben"; }
  else if (h === "stundenplan") { view = "stundenplan"; }
  else if (h === "feedback") { view = "feedback"; }
  else if (!h.startsWith("karte-")) { view = "feed"; }
}

// Einmalig beim App-Start: "#karte-<id>" wird gemerkt (siehe pendingCardId),
// alles andere kann sofort angewendet werden — render() zeigt vor dem Laden
// ohnehin noch nichts an.
function applyInitialHash() {
  const h = (location.hash || "").replace(/^#/, "");
  if (h.startsWith("karte-")) { pendingCardId = h.slice(6); return; }
  applyHash(location.hash);
}

// Am Ende von render() aufgerufen: gleicht die Adressleiste mit dem
// aktuellen Zustand ab. Unverändert (z. B. bei der stillen 60-Sekunden-
// Aktualisierung) → nichts tun. Erster Aufruf überhaupt → ersetzen statt
// einen neuen Verlaufseintrag anzulegen. Ein echter Navigationsschritt →
// neuer Verlaufseintrag, damit die Zurück-Taste greift. Rückgabewert
// (wirklich navigiert?) steuert die Übergangsanimation in render(), siehe
// dort — eine unveränderte Aktualisierung soll nicht jedes Mal "wackeln".
function syncHistory() {
  if (suppressHistoryPush) return false;
  const hash = hashFromState();
  const changed = hash !== (location.hash || "");
  if (!changed && firstHistorySyncDone) return false;
  const url = location.pathname + location.search + hash;
  if (!firstHistorySyncDone) {
    history.replaceState({ hash }, "", url);
    firstHistorySyncDone = true;
    return false;
  }
  history.pushState({ hash }, "", url);
  return true;
}

// ideen-backlog.md #24: App-weite Suche. Durchsucht Titel und (von HTML
// befreiten) Text aller sichtbaren Karten der aktuell gewählten Klasse,
// gruppiert die Treffer nach Rubrik. Bewusst rein clientseitig — die
// Kartenliste liegt (wie überall sonst in der App) schon vollständig im
// Speicher, ein eigener Server-Endpunkt wäre hier unnötig.
const elEntityDecoder = document.createElement("textarea");
function stripTags(html) {
  const noTags = String(html ?? "").replace(/<[^>]*>/g, " ");
  // Entitäten wie "&nbsp;"/"&amp;" blieben bisher als Rohtext stehen (z. B.
  // in den Suchergebnissen sichtbar) — ein <textarea> dekodiert sie, ohne
  // (anders als bei innerHTML auf einem normalen Element) den Text erneut
  // als HTML zu interpretieren.
  elEntityDecoder.innerHTML = noTags;
  return elEntityDecoder.value.replace(/\s+/g, " ").trim();
}

function renderSearchResults(query) {
  const q = query.trim().toLowerCase();
  if (!q) {
    elSearchResults.innerHTML = `<p class="rubrik-panel-empty">Stichwort eingeben, um Hinweise, Termine, Beteiligungen und Dateien zu durchsuchen.</p>`;
    return;
  }
  const matches = visibleCards().filter((c) => !c.trashed_at &&
    (c.title.toLowerCase().includes(q) || stripTags(c.body).toLowerCase().includes(q)));
  if (!matches.length) {
    elSearchResults.innerHTML = `<p class="rubrik-panel-empty">Keine Treffer für „${esc(query.trim())}".</p>`;
    return;
  }
  const groups = new Map();
  for (const c of matches) {
    if (!groups.has(c.type)) groups.set(c.type, []);
    groups.get(c.type).push(c);
  }
  elSearchResults.innerHTML = [...groups.entries()].map(([type, list]) => `
    <div class="search-group">
      <div class="search-group-label">${TYPE_LABELS[type]}</div>
      ${list.map((c) => `
        <button type="button" class="search-result" data-action="search-jump" data-card="${c.id}">
          <span class="search-result-title">${esc(c.title)}</span>
          ${c.body ? `<span class="search-result-snippet">${esc(stripTags(c.body)).slice(0, 90)}</span>` : ""}
        </button>`).join("")}
    </div>`).join("");
}

// Springt direkt zu einer Karte: bestimmt die passende Ansicht (inkl.
// Papierkorb/Archiv, falls die Karte dort liegt), wechselt dahin und hebt
// die Karte kurz hervor. Quelle für Push-Klick (service-worker.js) und den
// Teilen-Button (siehe shareButtonHtml) — beide verlinken auf "#karte-<id>".
function openCardById(id) {
  const c = cardById(id);
  if (!c) return;
  if (c.trashed_at) {
    view = "papierkorb";
  } else if (isArchived(c)) {
    view = "archiv";
    openArchivId = id;
  } else if (c.type === "termin") {
    view = "termine";
    openTerminId = id;
    // Damit die Monatsübersicht direkt den richtigen Monat zeigt (Liste
    // darunter ist jetzt monatsbezogen, siehe renderMonatsTermine).
    if (c.event_date) {
      calendarMonth = parseISODate(c.event_date);
      calendarMonth.setDate(1);
    }
  } else if (["umfrage", "liste", "tabelle"].includes(c.type)) {
    view = "beteiligung";
  } else if (c.type === "datei") {
    view = "dateien";
    openFolderId = c.folder_id || "";
  } else {
    view = "feed";
    openHinweisId = id;
    if (c.type === "hinweis" && istAeltererHinweis(c)) showOlderHinweise = true;
  }
  render();
  requestAnimationFrame(() => {
    const sel = `.card[data-card="${CSS.escape(id)}"], .kurz-bubble[data-card="${CSS.escape(id)}"]`;
    const el = elFeed.querySelector(sel);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("flash");
    setTimeout(() => el.classList.remove("flash"), 1600);
  });
}

function render() {
  // Archiv/Papierkorb sind Admin-Sache — dieser Schutz greift unabhängig
  // vom Zugangsweg (Hash-Link, "Mehr"-Menü, Zustand von vor einer
  // Abmeldung), Nutzerwunsch 11.09.2026.
  if ((view === "archiv" || view === "papierkorb") && !isAdmin()) view = "feed";

  document.querySelectorAll("#viewTabs button").forEach((b) =>
    b.classList.toggle("active", b.dataset.view === view));
  // Sitzt seit ideen-backlog.md #17 fest oben in der Kopfzeile statt nur
  // auf der Startseite über der Fußleiste — deshalb jetzt ansichtsunabhängig.
  elFab.style.display = configured && isAdmin() ? "" : "none";
  updateScrollTopButton();

  if (!loaded) return;
  const list = visibleCards();

  if (view === "feed") {
    elFeed.innerHTML = renderStart(list);
  } else if (view === "termine" || view === "kalender") {
    elFeed.innerHTML = renderKalenderView(list.filter((c) => c.type === "termin"));
    wireKalender();
  } else if (view === "beteiligung") {
    elFeed.innerHTML = renderBeteiligungView(
      list.filter((c) => c.type === "umfrage" || c.type === "liste" || c.type === "tabelle"));
  } else if (view === "dateien") {
    elFeed.innerHTML = renderFolderView(list.filter((c) => c.type === "datei"));
  } else if (view === "papierkorb") {
    const toolbar = list.length && isAdmin()
      ? `<div class="feed-toolbar">
           <button class="btn link danger" data-action="empty-trash">Papierkorb jetzt leeren</button>
         </div>`
      : "";
    elFeed.innerHTML = toolbar + list.map(renderCard).join("");
  } else if (view === "aufgaben") {
    elFeed.innerHTML = renderAufgabenView(list);
  } else if (view === "stundenplan") {
    elFeed.innerHTML = renderStundenplanView();
  } else if (view === "feedback") {
    elFeed.innerHTML = renderFeedbackView();
  } else {
    elFeed.innerHTML = renderArchivView(list);
  }

  elEmpty.textContent = EMPTY_TEXT[view] || "";
  elEmpty.hidden = EIGENE_LEER_ANZEIGE.has(view) ? true : list.length > 0;

  if (NAV_BADGE_VIEWS[view]) markTabSeen(NAV_BADGE_VIEWS[view]);
  updateNavBadges();

  // Bestätigungs-Animation für die Karte, bei der gerade etwas erledigt
  // wurde (siehe celebrate) — genau einmal, nach dem neuen Zeichnen.
  if (celebrateCardId) {
    const id = CSS.escape(celebrateCardId);
    celebrateCardId = null;
    requestAnimationFrame(() => {
      elFeed.querySelectorAll(`.card[data-card="${id}"], .kurz-bubble[data-card="${id}"]`).forEach((el) => {
        el.classList.add("just-done");
        el.addEventListener("animationend", () => el.classList.remove("just-done"), { once: true });
      });
    });
  }

  // Dezente Übergangsanimation nur bei echter Navigation (ideen-backlog.md
  // #5) — eine unveränderte stille Aktualisierung (60-Sekunden-Timer) soll
  // den Feed nicht bei jedem Mal neu einwischen lassen.
  const navigated = syncHistory();
  if (navigated) {
    elFeed.classList.remove("nav-forward", "nav-back");
    void elFeed.offsetWidth; // Reflow erzwingen, damit die Animation bei jedem Aufruf neu startet
    elFeed.classList.add(navDirection === "back" ? "nav-back" : "nav-forward");
  }
  navDirection = "forward";
}

/* ---------- Dialoge: Bestätigen und Nachfragen ---------- */

function confirmDlg(text, okLabel = "Löschen") {
  return new Promise((resolve) => {
    $("confirmText").textContent = text;
    $("confirmOk").textContent = okLabel;
    const onClick = (ev) => {
      const btn = ev.target.closest("[data-answer]");
      if (!btn) return;
      dlgConfirm.removeEventListener("click", onClick);
      dlgConfirm.close();
      resolve(btn.dataset.answer === "ja");
    };
    dlgConfirm.addEventListener("click", onClick);
    dlgConfirm.addEventListener("close", () => resolve(false), { once: true });
    dlgConfirm.showModal();
  });
}

// title: Überschrift des Dialogs.
// fields: Array von { name, label?, placeholder?, maxlength?, value?, optional? }
//         oder, für eine Auswahlliste statt Textfeld: { name, label?, value?,
//         options: [{ value, label }, ...] }.
// hint: optionaler erklärender Satz zwischen Titel und Feldern (Nutzerwunsch
// 18.09.2026, Alltagstauglichkeits-Review — z. B. beim Admin-Zugang, damit
// ein neugierig klickendes Elternteil nicht auf ein unerklärtes
// Passwortfeld trifft).
// Löst mit einem Objekt { [name]: getrimmter Wert } auf, oder null bei Abbruch.
function promptDlg(title, fields, hint) {
  return new Promise((resolve) => {
    $("promptTitle").textContent = title;
    const hintEl = $("promptHint");
    hintEl.textContent = hint || "";
    hintEl.hidden = !hint;
    const wrap = $("promptFields");
    wrap.innerHTML = fields.map((f, i) => fieldHtml(f.label || "", f.options
      ? `<select name="${esc(f.name)}" ${i === 0 ? "autofocus" : ""}>${f.options
          .map((o) => `<option value="${esc(o.value)}" ${o.value === f.value ? "selected" : ""}>${esc(o.label)}</option>`)
          .join("")}</select>`
      : f.type === "textarea"
      ? `<textarea name="${esc(f.name)}" placeholder="${esc(f.placeholder || "")}"
              maxlength="${f.maxlength || 2000}" rows="4"
              ${f.optional ? "" : "required"} ${i === 0 ? "autofocus" : ""}>${esc(f.value || "")}</textarea>`
      : `<input type="${f.type || "text"}" name="${esc(f.name)}" placeholder="${esc(f.placeholder || "")}"
              maxlength="${f.maxlength || 200}" value="${esc(f.value || "")}"
              ${f.optional ? "" : "required"} ${i === 0 ? "autofocus" : ""}>`)).join("");
    const form = $("promptForm");
    const onSubmit = (ev) => {
      ev.preventDefault();
      const fd = new FormData(form);
      const result = {};
      for (const f of fields) result[f.name] = String(fd.get(f.name) || "").trim();
      cleanup();
      dlgPrompt.close();
      resolve(result);
    };
    const onClose = () => { cleanup(); resolve(null); };
    const cleanup = () => {
      form.removeEventListener("submit", onSubmit);
      dlgPrompt.removeEventListener("close", onClose);
    };
    form.addEventListener("submit", onSubmit);
    dlgPrompt.addEventListener("close", onClose);
    dlgPrompt.showModal();
    wrap.querySelector("input")?.focus();
  });
}

/* ---------- Editor (Anlegen und Bearbeiten) ---------- */

function fieldHtml(label, inner) {
  return `<label class="field"><span>${label}</span>${inner}</label>`;
}

// E-Mail-artiges Feld mit Formatierungsleiste, Bild-/Datei-Upload (Button
// und Drag & Drop) statt der einfachen Textarea — für Hinweis (Nachricht)
// und Termin (z. B. Zusammenfassung eines Elternabends) gleichermaßen.
function richEditorFieldHtml(card, label) {
  const initial = card ? sanitizeRich(card.body || "") : "";
  return `
    <div class="field">
      <span>${label || "Text"}</span>
      <div class="rte" id="rteWrap">
        <div class="rte-toolbar" role="toolbar" aria-label="Textformatierung">
          <button type="button" class="rte-btn" data-cmd="bold" title="Fett" aria-label="Fett"><b>F</b></button>
          <button type="button" class="rte-btn" data-cmd="underline" title="Unterstrichen" aria-label="Unterstrichen"><u>U</u></button>
          <button type="button" class="rte-btn" data-cmd="link" title="Link einfügen" aria-label="Link einfügen">${ICONS.link}</button>
          <span class="rte-sep"></span>
          <button type="button" class="rte-btn" data-cmd="image" title="Bild einfügen" aria-label="Bild einfügen">${ICONS.image}</button>
          <button type="button" class="rte-btn" data-cmd="attach" title="Datei anhängen" aria-label="Datei anhängen">${ICONS.datei}</button>
        </div>
        <div class="rte-editor" id="rteEditor" contenteditable="true" data-placeholder="Text schreiben …">${initial}</div>
        <div class="rte-drop-hint">Bild oder Datei hier ablegen</div>
      </div>
      <input type="file" id="rteImageInput" accept="image/jpeg,image/png,image/webp" hidden>
      <input type="file" id="rteFileInput" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" multiple hidden>
      <div class="rte-attachments" id="rteAttachments"></div>
      <p class="field-hint">Bilder und Dateien auch per Drag &amp; Drop möglich · max. 6 Anhänge, je bis 10 MB.</p>
    </div>`;
}

// Ordner-Optionen für eine Datei-Karte, gefiltert auf die gewählte Klasse.
// Gemeinsame Ordner (class_id null, seit Migration 017) passen zu jeder
// Klasse; für eine gemeinsame Datei (classId "") bleiben nur sie übrig.
// Auch für den change-Listener auf dem Klasse-Feld in openEditor() genutzt,
// wenn die Klasse umgestellt wird.
function folderOptionsHtml(classId, selectedId) {
  const opts = foldersList
    .filter((f) => !f.class_id || f.class_id === classId)
    .map((f) => `<option value="${f.id}" ${f.id === selectedId ? "selected" : ""}>${f.class_id ? esc(f.name) : `🏫 ${esc(f.name)}`}</option>`);
  return `<option value="">Ohne Ordner</option>${opts.join("")}`;
}

function editorFieldsHtml(type, card) {
  const v = (name) => esc(card ? card[name] ?? "" : "");
  const creatorDefault = card
    ? (card.creator_name || "")
    : (localStorage.getItem(CREATOR_NAME_KEY) || "");
  let html = fieldHtml("Titel *",
    `<input type="text" name="title" maxlength="120" required value="${v("title")}">`);
  html += fieldHtml("Dein Name bzw. deine Funktion * (z. B. „Frau Müller, Lehrkraft“)",
    `<input type="text" name="creator_name" maxlength="80" required value="${esc(creatorDefault)}">`);

  if (type === "termin") {
    html += fieldHtml("Datum *",
      `<input type="date" name="event_date" required value="${v("event_date")}">`);
    html += fieldHtml("Uhrzeit",
      `<input type="time" name="event_time" value="${card && card.event_time ? esc(card.event_time.slice(0, 5)) : ""}">`);
    html += fieldHtml("Uhrzeit bis (freiwillig)",
      `<input type="time" name="event_end_time" value="${card && card.event_end_time ? esc(card.event_end_time.slice(0, 5)) : ""}">`);
    html += fieldHtml("Ort",
      `<input type="text" name="event_location" maxlength="120" value="${v("event_location")}">`);
  }

  if (type === "hinweis") {
    html += `
      <label class="field-check">
        <input type="checkbox" name="is_kurznachricht" ${card && card.is_kurznachricht ? "checked" : ""}>
        <span>Als Kurznachricht zeigen (kompakt, oben in der Hinweis-Rubrik — für kurze, schnelle Infos)</span>
      </label>`;
    html += richEditorFieldHtml(card);
  } else if (type === "termin") {
    html += richEditorFieldHtml(card, "Zusammenfassung (optional)");
  } else {
    html += fieldHtml("Text",
      `<textarea name="body" maxlength="4000">${v("body")}</textarea>`);
  }

  if (type === "liste" && !card) {
    html += `
      <div class="radio-row">
        <label>
          <input type="radio" name="list_mode" value="abhaken" checked>
          <span><b>Vorgeben und abhaken</b><small>Du gibst Einträge vor, alle können abhaken (z. B. Packliste).</small></span>
        </label>
        <label>
          <input type="radio" name="list_mode" value="eintragen">
          <span><b>Selbst eintragen</b><small>Alle tragen sich selbst ein (z. B. Kuchenliste, Ausflugsanmeldung).</small></span>
        </label>
      </div>`;
    html += fieldHtml("Einträge (einer pro Zeile)",
      `<textarea name="items" placeholder="Turnbeutel&#10;Trinkflasche&#10;…"></textarea>`);
    html += `<p class="field-hint">Bei „Selbst eintragen“ sind das die Plätze, die übernommen werden können — das Feld darf auch leer bleiben. Bei „Vorgeben und abhaken“ kann zusätzlich eingetragen werden, wer den Punkt erledigt hat.</p>`;
    html += fieldHtml("Kontingent — nur bei „Selbst eintragen“ (Plätze für frei hinzugefügte Einträge, leer = kein Limit)",
      `<input type="number" name="capacity" min="1" max="500">`);
    html += `<p class="field-hint">Wer sich frei einträgt, nachdem das Kontingent voll ist, bekommt trotzdem einen Platz — nur als „Springer“ gekennzeichnet (z. B. falls doch noch jemand gebraucht wird).</p>`;
  }

  if (type === "liste" && card) {
    html += `<span class="field" style="margin-bottom:4px"><span style="font-size:.85rem;font-weight:600;color:var(--muted)">Einträge</span></span>
      <div class="edit-items" id="editItems"></div>
      <button type="button" class="btn small" id="editItemAdd">+ Eintrag hinzufügen</button>
      <p class="field-hint" style="margin-top:8px">Achtung: Häkchen bzw. Namen bleiben beim Umbenennen erhalten, beim Löschen eines Eintrags gehen sie verloren.</p>`;
    if (card.list_mode === "eintragen") {
      html += fieldHtml("Kontingent (Plätze für frei hinzugefügte Einträge, leer = kein Limit)",
        `<input type="number" name="capacity" min="1" max="500" value="${card.capacity ?? ""}">`);
    }
  }

  if (type === "tabelle" && !card) {
    html += fieldHtml("Spalten (eine pro Zeile, z. B. Name, Bringt mit) * — max. 6",
      `<textarea name="table_columns" required placeholder="Name&#10;Bringt mit&#10;Uhrzeit"></textarea>`);
    html += `<p class="field-hint">Nach dem Anlegen tragen alle direkt in die Tabelle ein — die Spalten selbst lassen sich danach nicht mehr ändern.</p>`;
    html += fieldHtml("Kontingent (Plätze — leer = kein Limit)",
      `<input type="number" name="capacity" min="1" max="500">`);
    html += `<p class="field-hint">Wer eine Zeile hinzufügt, nachdem das Kontingent voll ist, bekommt trotzdem eine Zeile — nur als „Springer“ gekennzeichnet.</p>`;
  }

  if (type === "umfrage" && !card) {
    html += fieldHtml("Optionen (eine pro Zeile, mindestens 2) *",
      `<textarea name="options" required placeholder="Montag&#10;Dienstag&#10;…"></textarea>`);
    html += `<p class="field-hint">Optional ein Kontingent pro Option: Zahl in Klammern ans Zeilenende, z. B. „Kuchen backen (3)“ — die ersten 3 Stimmen sind reguläre Plätze, weitere sind weiterhin möglich, gelten aber als „Springer“.</p>`;
    html += `
      <label class="field-check">
        <input type="checkbox" name="multi_select">
        <span>Mehrfachauswahl erlauben</span>
      </label>
      <label class="field-check">
        <input type="checkbox" name="poll_named">
        <span>Namentliche Abstimmung (Namen der Abstimmenden sind für alle sichtbar) — sonst anonym</span>
      </label>
      <p class="field-hint">Gilt nur beim Anlegen, lässt sich danach nicht mehr ändern (verhindert nachträgliches An-/Deanonymisieren bereits abgegebener Stimmen).</p>`;
  }
  if (type === "umfrage" && card) {
    html += `<span class="field" style="margin-bottom:4px"><span style="font-size:.85rem;font-weight:600;color:var(--muted)">Optionen</span></span>
      <div class="edit-items" id="editOptions"></div>
      <button type="button" class="btn small" id="editOptionAdd">+ Option hinzufügen</button>
      <p class="field-hint" style="margin-top:8px">Achtung: Beim Umbenennen bleiben abgegebene Stimmen erhalten, beim Löschen einer Option gehen ihre Stimmen verloren. Es müssen mindestens 2 Optionen übrig bleiben.</p>`;
  }

  if (type === "datei" && !card) {
    html += fieldHtml("Datei * (PDF, JPG, PNG oder WebP — max. 10 MB)",
      `<input type="file" name="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" required>`);
  }

  let currentClassId = card ? (card.class_id || "") : activeClassId;
  if (classesList.length) {
    const opts = [`<option value="">Gemeinsam (beide Klassen)</option>`].concat(
      classesList.map((cl) =>
        `<option value="${cl.id}" ${cl.id === currentClassId ? "selected" : ""}>${CLASS_ICON[cl.slug] || ""} ${esc(cl.name)}</option>`));
    html += fieldHtml("Klasse", `<select name="class_id" id="editorClassSelect">${opts.join("")}</select>`);
  }

  if (type === "datei") {
    const currentFolderId = card ? (card.folder_id || "") : "";
    html += fieldHtml("Ordner", `<select name="folder_id" id="editorFolderSelect">${folderOptionsHtml(currentClassId, currentFolderId)}</select>`);
    html += `<p class="field-hint">Ordner mit 🏫 sind gemeinsam (beide Klassen).</p>`;
  }

  if (["hinweis", "umfrage", "liste", "tabelle"].includes(type)) {
    html += `
      <label class="field-check">
        <input type="checkbox" name="is_aufgabe" ${card && card.is_aufgabe ? "checked" : ""}>
        <span>Als Aufgabe markieren (erscheint auf der Startseite, jede*r hakt für sich selbst ab)</span>
      </label>`;
  }

  html += fieldHtml("Endet am (optional)",
    `<input type="date" name="end_date" value="${card && card.end_date ? esc(card.end_date) : ""}">`);

  html += `
    <label class="field-check">
      <input type="checkbox" name="pinned" ${card && card.pinned ? "checked" : ""}>
      <span>Oben anpinnen</span>
    </label>`;

  // UX-Forschung 19.09.2026 / migration-028: Push nur beim Anlegen wählbar
  // (verschickt wird beim Anlegen, nicht beim Bearbeiten). Bei Dateien
  // standardmäßig aus — Fotoserien lösten sonst eine Nachricht pro Bild aus.
  if (!card) {
    html += `
      <label class="field-check">
        <input type="checkbox" name="notify" ${type === "datei" ? "" : "checked"}>
        <span>Eltern per Push benachrichtigen</span>
      </label>
      <p class="field-hint">Ohne Häkchen erscheint der Eintrag nur als „Neu“ in der App.${type === "datei"
        ? " Bei mehreren Fotos hintereinander am besten nur beim letzten anhaken." : ""}</p>`;
  }

  return html;
}

// Formular im Editor vorbefüllen — für "Als Vorlage kopieren" und für einen
// wiederhergestellten Entwurf. values: { feldname: Wert }, "body" geht bei
// Hinweis/Termin in das Textfeld mit Formatierung.
function fillEditorForm(values) {
  const form = $("editorForm");
  for (const [name, value] of Object.entries(values || {})) {
    if (name === "body" && $("rteEditor")) {
      $("rteEditor").innerHTML = sanitizeRich(value || "");
      continue;
    }
    form.querySelectorAll(`[name="${CSS.escape(name)}"]`).forEach((el) => {
      if (el.type === "file") return;
      if (el.type === "checkbox") el.checked = !!value;
      else if (el.type === "radio") el.checked = el.value === value;
      else if (value !== undefined && value !== null) el.value = value;
    });
  }
}

// Gegenstück zu fillEditorForm: aktueller Formularinhalt als Werte-Objekt.
function readEditorValues() {
  const values = {};
  for (const el of $("editorForm").elements) {
    if (!el.name || el.type === "file") continue;
    if (el.type === "checkbox") values[el.name] = el.checked;
    else if (el.type === "radio") { if (el.checked) values[el.name] = el.value; }
    else values[el.name] = el.value;
  }
  if ($("rteEditor")) values.body = $("rteEditor").innerHTML;
  return values;
}

// "Als Vorlage kopieren" (UX-Forschung 19.09.2026): Inhalt einer Karte als
// Startpunkt für eine neue. Datum, Frist und Anpinnen bleiben leer — die
// gehören zum neuen Anlass. Bilder/Anhänge werden nicht mitkopiert (die
// Dateien gehören zur alten Karte und werden mit ihr irgendwann gelöscht).
function templateFromCard(c) {
  const presetItems = (c.list_items || [])
    .filter((it) => c.list_mode !== "eintragen" || it.preset)
    .map((it) => it.text);
  return {
    title: c.title,
    body: (c.type === "hinweis" || c.type === "termin")
      ? String(c.body || "").replace(/<img\b[^>]*>/gi, "")
      : (c.body || ""),
    event_time: c.event_time ? c.event_time.slice(0, 5) : "",
    event_end_time: c.event_end_time ? c.event_end_time.slice(0, 5) : "",
    event_location: c.event_location || "",
    is_kurznachricht: !!c.is_kurznachricht,
    is_aufgabe: !!c.is_aufgabe,
    class_id: c.class_id || "",
    list_mode: c.list_mode || "abhaken",
    items: presetItems.join("\n"),
    capacity: c.capacity ?? "",
    table_columns: (c.table_columns || []).join("\n"),
    options: (c.poll_options || [])
      .map((o) => o.label + (o.capacity ? ` (${o.capacity})` : "")).join("\n"),
    multi_select: !!c.multi_select,
    poll_named: !!c.poll_named,
  };
}

// Entwürfe beim Anlegen (UX-Forschung 19.09.2026): der Editor sichert sich
// beim Tippen auf dem Gerät, damit nichts verloren geht, wenn man mitten
// im Schreiben unterbrochen wird. Einer je Kartentyp, 14 Tage lang.
const DRAFT_PREFIX = "pinnwand_entwurf_";
const DRAFT_MAX_AGE_MS = 14 * 86400000;
function loadDraft(type) {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_PREFIX + type));
    if (!d || Date.now() - d.savedAt > DRAFT_MAX_AGE_MS) return null;
    return d;
  } catch { return null; }
}
function clearDraft(type) {
  localStorage.removeItem(DRAFT_PREFIX + type);
}
function draftHasContent(values) {
  const body = String(values.body || "").replace(/<[^>]*>/g, "").trim();
  return !!(String(values.title || "").trim() || body || String(values.items || "").trim()
    || String(values.options || "").trim() || String(values.table_columns || "").trim());
}

function renderEditItems() {
  const wrap = $("editItems");
  if (!wrap) return;
  wrap.innerHTML = editorState.items
    .map((it, idx) => it.deleted ? "" : `
      <div class="edit-item">
        <input type="text" maxlength="300" data-idx="${idx}" value="${esc(it.text)}">
        <button type="button" class="icon-btn" data-remove="${idx}" title="Eintrag löschen">✕</button>
      </div>`)
    .join("");
}

function renderEditOptions() {
  const wrap = $("editOptions");
  if (!wrap) return;
  wrap.innerHTML = editorState.options
    .map((op, idx) => op.deleted ? "" : `
      <div class="edit-item">
        <input type="text" maxlength="200" data-idx="${idx}" value="${esc(op.label)}">
        <input type="number" class="edit-item-capacity" min="1" max="500" data-cap-idx="${idx}"
               value="${op.capacity ?? ""}" placeholder="Kontingent" title="Kontingent (leer = kein Limit)">
        <button type="button" class="icon-btn" data-remove="${idx}" title="Option löschen">✕</button>
      </div>`)
    .join("");
}

// template: { title, values } aus "Als Vorlage kopieren" (nur beim Anlegen).
function openEditor(type, card = null, parentId = null, template = null) {
  editorState = {
    mode: card ? "edit" : "create",
    type,
    card,
    parentId,   // nur beim Anlegen gesetzt: Termin, mit dem verknüpft wird
    items: card && type === "liste"
      ? (card.list_items || []).map((it) => ({ id: it.id, text: it.text, orig: it.text, deleted: false }))
      : [],
    options: card && type === "umfrage"
      ? (card.poll_options || []).map((o) => ({
          id: o.id, label: o.label, orig: o.label,
          capacity: o.capacity ?? null, origCapacity: o.capacity ?? null,
          deleted: false,
        }))
      : [],
    attachments: [],   // neu hochgeladene Anhänge dieser Sitzung (Hinweis/Termin)
    links: [],         // nur beim Anlegen: Ids bestehender Karten, mit denen verknüpft wird (Migration 033)
  };
  const parent = parentId ? cardById(parentId) : null;
  $("editorTitle").textContent =
    (card ? "Bearbeiten: " : "Neu: ") + TYPE_LABELS[type] +
    (parent ? ` (verknüpft mit „${parent.title}“)` : "");
  $("editorFields").innerHTML = editorFieldsHtml(type, card);
  if (!card && isAdmin()) {
    $("editorFields").insertAdjacentHTML("beforeend", `
      <div class="field editor-links">
        <span>Verknüpfen (freiwillig)</span>
        <div id="editLinks" class="editor-links-list"></div>
        <button type="button" class="btn small link" id="editLinkAdd">+ Mit bestehender Karte verknüpfen</button>
      </div>`);
    setupEditorLinks();
  }
  $("editorError").hidden = true;
  $("editorSubmit").disabled = false;
  $("editorSubmit").textContent = "Speichern";

  renderEditItems();
  const addBtn = $("editItemAdd");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      editorState.items.push({ id: null, text: "", orig: null, deleted: false });
      renderEditItems();
      const inputs = $("editItems").querySelectorAll("input");
      if (inputs.length) inputs[inputs.length - 1].focus();
    });
    $("editItems").addEventListener("input", (ev) => {
      const idx = ev.target.dataset.idx;
      if (idx !== undefined) editorState.items[idx].text = ev.target.value;
    });
    $("editItems").addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-remove]");
      if (!btn) return;
      editorState.items[btn.dataset.remove].deleted = true;
      renderEditItems();
    });
  }

  renderEditOptions();
  const addOptBtn = $("editOptionAdd");
  if (addOptBtn) {
    addOptBtn.addEventListener("click", () => {
      editorState.options.push({ id: null, label: "", orig: null, deleted: false });
      renderEditOptions();
      const inputs = $("editOptions").querySelectorAll("input");
      if (inputs.length) inputs[inputs.length - 1].focus();
    });
    $("editOptions").addEventListener("input", (ev) => {
      const idx = ev.target.dataset.idx;
      if (idx !== undefined) editorState.options[idx].label = ev.target.value;
      const capIdx = ev.target.dataset.capIdx;
      if (capIdx !== undefined) editorState.options[capIdx].capacity = ev.target.value ? Number(ev.target.value) : null;
    });
    $("editOptions").addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-remove]");
      if (!btn) return;
      editorState.options[btn.dataset.remove].deleted = true;
      renderEditOptions();
    });
  }

  if (type === "hinweis" || type === "termin") setupRichEditor();

  // Ordner-Auswahl hängt von der gewählten Klasse ab — bei Wechsel der
  // Klasse die Optionen neu aufbauen (siehe folderOptionsHtml).
  if (type === "datei") {
    const classSel = $("editorClassSelect");
    const folderSel = $("editorFolderSelect");
    if (classSel && folderSel) {
      classSel.addEventListener("change", () => {
        folderSel.innerHTML = folderOptionsHtml(classSel.value, "");
      });
    }
  }

  // Vorlage bzw. Entwurf (UX-Forschung 19.09.2026). Die Formular-Handler
  // werden als Eigenschaft gesetzt statt per addEventListener, weil das
  // Formular über alle Editor-Öffnungen hinweg dasselbe Element bleibt —
  // sonst sammelten sich pro Öffnung weitere Speicher-Handler an.
  const form = $("editorForm");
  const note = $("editorNote");
  note.hidden = true;
  note.innerHTML = "";
  form.oninput = null;
  form.onchange = null;
  if (!card && type !== "datei") {
    if (template) {
      fillEditorForm(template.values);
      note.textContent = `Kopie von „${template.title}“ — Datum und Frist bitte neu setzen. Bilder und Anhänge werden nicht mitkopiert.`;
      note.hidden = false;
    } else {
      const draft = loadDraft(type);
      if (draft && draftHasContent(draft.values)) {
        fillEditorForm(draft.values);
        note.innerHTML = `Dein Entwurf vom ${esc(fmtTimestamp(draft.savedAt))} ist wiederhergestellt.
          <button type="button" class="btn link" data-action="draft-discard">Verwerfen</button>`;
        note.hidden = false;
      }
    }
    let saveTimer = null;
    const saveDraft = () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        const values = readEditorValues();
        if (draftHasContent(values)) {
          localStorage.setItem(DRAFT_PREFIX + type, JSON.stringify({ savedAt: Date.now(), values }));
        }
      }, 500);
    };
    form.oninput = saveDraft;
    form.onchange = saveDraft;
    // Nach erfolgreichem Speichern aufgerufen — eine noch ausstehende,
    // verzögerte Sicherung würde sonst den gerade gelöschten Entwurf
    // wieder anlegen.
    editorState.stopDraft = () => {
      clearTimeout(saveTimer);
      form.oninput = null;
      form.onchange = null;
      clearDraft(type);
    };
  }

  dlgEditor.showModal();
}

// Verkabelt Formatierungsleiste, Bild-/Datei-Upload (Button + Drag & Drop)
// und Einfügen aus der Zwischenablage für den Hinweis-Editor.
function setupRichEditor() {
  const editor = $("rteEditor");
  const wrap = $("rteWrap");
  const imgInput = $("rteImageInput");
  const fileInput = $("rteFileInput");
  if (!editor || !wrap) return;

  renderRteAttachmentChips();

  const toolbar = wrap.querySelector(".rte-toolbar");

  // Ohne das hier würde der Browser beim Klick auf einen Knopf die
  // Textauswahl im Editor verwerfen (Fokuswechsel schon bei mousedown,
  // bevor click überhaupt feuert) — fett/unterstrichen hätte dann nichts
  // mehr zum Anwenden. preventDefault auf mousedown verhindert genau das.
  toolbar.addEventListener("mousedown", (ev) => {
    if (ev.target.closest("[data-cmd]")) ev.preventDefault();
  });

  toolbar.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-cmd]");
    if (!btn) return;
    const cmd = btn.dataset.cmd;
    if (cmd === "bold" || cmd === "underline") {
      editor.focus();
      document.execCommand(cmd, false, null);
    } else if (cmd === "link") {
      rteInsertLink(editor);
    } else if (cmd === "image") {
      imgInput.click();
    } else if (cmd === "attach") {
      fileInput.click();
    }
  });

  imgInput.addEventListener("change", async () => {
    if (imgInput.files.length) await handleRteFiles(imgInput.files, true);
    imgInput.value = "";
  });
  fileInput.addEventListener("change", async () => {
    if (fileInput.files.length) await handleRteFiles(fileInput.files, false);
    fileInput.value = "";
  });

  editor.addEventListener("input", () => {
    if (editor.innerHTML === "<br>") editor.innerHTML = "";
    renderRteAttachmentChips();
  });

  editor.addEventListener("paste", (ev) => {
    ev.preventDefault();
    const items = [...(ev.clipboardData?.items || [])];
    const imgItem = items.find((it) => it.kind === "file" && it.type.startsWith("image/"));
    const imgFile = imgItem?.getAsFile();
    if (imgFile) {
      handleRteFiles([imgFile], true);
      return;
    }
    const text = ev.clipboardData?.getData("text/plain") || "";
    document.execCommand("insertText", false, text);
  });

  ["dragover", "dragenter"].forEach((evt) => wrap.addEventListener(evt, (ev) => {
    ev.preventDefault();
    wrap.classList.add("drag-over");
  }));
  wrap.addEventListener("dragleave", (ev) => {
    if (wrap.contains(ev.relatedTarget)) return;
    wrap.classList.remove("drag-over");
  });
  wrap.addEventListener("drop", (ev) => {
    ev.preventDefault();
    wrap.classList.remove("drag-over");
    const files = ev.dataTransfer?.files;
    if (files && files.length) handleRteFiles(files, "auto");
  });

  $("rteAttachments").addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-remove-attachment]");
    if (!btn) return;
    editorState.attachments.splice(Number(btn.dataset.removeAttachment), 1);
    renderRteAttachmentChips();
  });
}

function rteRemainingSlots() {
  const existing = (editorState.card?.files || []).length;
  return 6 - existing - editorState.attachments.length;
}

function attachmentChipHtml(f, removeIdx) {
  const icon = f.mime_type === "application/pdf" ? ICONS.datei : ICONS.image;
  const removeBtn = removeIdx === undefined ? "" : `
    <button type="button" class="chip-remove" data-remove-attachment="${removeIdx}" title="Entfernen" aria-label="Entfernen">✕</button>`;
  return `<span class="attachment-chip">${icon}<span>${esc(f.filename)}</span>${removeBtn}</span>`;
}

// Zeigt Anhänge, die (noch) nicht inline im Text zu sehen sind — inline
// eingefügte Bilder tauchen ja schon im Text selbst auf. Bereits gespeicherte
// Anhänge (beim Bearbeiten) sind rein informativ, nur neue lassen sich vor
// dem Speichern wieder entfernen. Aktualisiert nebenbei den Upload-Knöpfen
// ihren aktiviert/deaktiviert-Zustand (Limit erreicht?).
function renderRteAttachmentChips() {
  const wrap = $("rteAttachments");
  const editor = $("rteEditor");
  if (!wrap || !editor) return;
  const bodyNow = editor.innerHTML;

  const existingChips = (editorState.card?.files || [])
    .filter((f) => !bodyNow.includes(f.storage_path))
    .map((f) => attachmentChipHtml(f));

  const freshChips = editorState.attachments
    .map((f, i) => ({ f, i }))
    .filter(({ f }) => !bodyNow.includes(f.storage_path))
    .map(({ f, i }) => attachmentChipHtml(f, i));

  wrap.innerHTML = existingChips.join("") + freshChips.join("");

  const full = rteRemainingSlots() <= 0;
  $("rteWrap")?.querySelectorAll('[data-cmd="image"], [data-cmd="attach"]')
    .forEach((b) => { b.disabled = full; });
}

function insertImageAtCursor(editor, url, filename) {
  editor.focus();
  document.execCommand("insertHTML", false, `<img src="${esc(url)}" alt="${esc(filename)}">`);
}

// inline: true = immer als <img> in den Text einfügen, false = immer nur
// als Anhang, "auto" = nach Dateityp entscheiden (für Drag & Drop).
async function handleRteFiles(fileList, inline) {
  for (const file of [...fileList]) {
    if (rteRemainingSlots() <= 0) {
      toast("Maximal 6 Anhänge pro Hinweis erreicht.", true);
      break;
    }
    const asInline = inline === "auto" ? file.type.startsWith("image/") : inline;
    try {
      const meta = await uploadFile(file);
      editorState.attachments.push(meta);
      if (asInline) insertImageAtCursor($("rteEditor"), fileUrl(meta.storage_path), meta.filename);
      renderRteAttachmentChips();
    } catch (err) {
      toast(err.message, true);
    }
  }
}

function rteInsertLink(editor) {
  editor.focus();
  const url = window.prompt("Link-Adresse (URL):", "https://");
  if (!url) return;
  const safe = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  editor.focus();
  document.execCommand("createLink", false, safe);
}

function editorFail(msg) {
  const el = $("editorError");
  el.textContent = msg || "Speichern fehlgeschlagen.";
  el.hidden = false;
  $("editorSubmit").disabled = false;
  $("editorSubmit").textContent = "Speichern";
}

async function submitEditor() {
  const form = $("editorForm");
  const fd = new FormData(form);
  const st = editorState;
  const title = String(fd.get("title") || "").trim();
  if (!title) return editorFail("Bitte einen Titel eingeben.");
  const creatorName = String(fd.get("creator_name") || "").trim();
  if (!creatorName) return editorFail("Bitte deinen Namen bzw. deine Funktion angeben.");
  localStorage.setItem(CREATOR_NAME_KEY, creatorName);

  const common = {
    title,
    creator_name: creatorName,
    body: String(fd.get("body") || "").trim(),
    pinned: fd.get("pinned") === "on",
    important: fd.get("important") === "on",
    is_kurznachricht: fd.get("is_kurznachricht") === "on",
    is_aufgabe: fd.get("is_aufgabe") === "on",
    end_date: String(fd.get("end_date") || ""),
  };
  if (fd.has("class_id")) common.class_id = String(fd.get("class_id") || "");
  if (fd.has("folder_id")) common.folder_id = String(fd.get("folder_id") || "");

  if (st.type === "hinweis" || st.type === "termin") {
    // Hinweis und Termin haben keine <textarea name="body"> mehr, sondern
    // das contenteditable-Feld — dort lesen und (nochmal) sanitisieren,
    // statt der Formulardaten. Ein einzelnes übrig gebliebenes <br> zählt
    // als leer.
    const editorEl = $("rteEditor");
    let raw = editorEl ? editorEl.innerHTML : "";
    if (raw === "<br>") raw = "";
    common.body = sanitizeRich(raw).trim();
  }

  $("editorSubmit").disabled = true;
  $("editorSubmit").textContent = "Wird gespeichert…";

  try {
    if (st.mode === "create") {
      const p = { type: st.type, ...common };
      if (st.parentId) p.parent_id = st.parentId;

      if (st.type === "termin") {
        p.event_date = String(fd.get("event_date") || "");
        if (!p.event_date) return editorFail("Bitte ein Datum wählen.");
        p.event_time = String(fd.get("event_time") || "");
        // Endzeit nur zusammen mit Startzeit und danach (Prüfung auch in der Datenbank).
        p.event_end_time = p.event_time ? String(fd.get("event_end_time") || "") : "";
        if (p.event_end_time && p.event_end_time <= p.event_time) {
          return editorFail("Die Endzeit muss nach der Startzeit liegen.");
        }
        p.event_location = String(fd.get("event_location") || "").trim();
      }

      if (st.type === "liste") {
        p.list_mode = String(fd.get("list_mode") || "abhaken");
        p.items = String(fd.get("items") || "")
          .split("\n").map((s) => s.trim()).filter(Boolean)
          .map((text) => ({ text }));
        p.capacity = fd.get("capacity") ? Number(fd.get("capacity")) : null;
      }

      if (st.type === "tabelle") {
        p.table_columns = String(fd.get("table_columns") || "")
          .split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 6);
        if (p.table_columns.length < 1) return editorFail("Bitte mindestens eine Spalte angeben.");
        p.capacity = fd.get("capacity") ? Number(fd.get("capacity")) : null;
      }

      if (st.type === "umfrage") {
        p.multi_select = fd.get("multi_select") === "on";
        p.poll_named = fd.get("poll_named") === "on";
        // Nutzerwunsch 14.09.2026: optionales Kontingent pro Option per
        // Zahl in Klammern am Zeilenende, z. B. "Kuchen backen (3)".
        p.options = String(fd.get("options") || "")
          .split("\n").map((s) => s.trim()).filter(Boolean)
          .map((line) => {
            const m = line.match(/^(.*\S)\s*\((\d+)\)$/);
            return m ? { label: m[1].trim(), capacity: Number(m[2]) } : { label: line };
          });
        if (p.options.length < 2) return editorFail("Bitte mindestens 2 Optionen angeben.");
      }

      if (st.type === "datei") {
        const file = fd.get("file");
        if (!file || !file.size) return editorFail("Bitte eine Datei auswählen.");
        $("editorSubmit").textContent = "Wird hochgeladen…";
        Object.assign(p, await uploadFile(file));
      }

      if ((st.type === "hinweis" || st.type === "termin") && st.attachments.length) {
        p.attachments = st.attachments;
      }
      // migration-028: ältere Datenbanken ignorieren das Feld einfach.
      p.notify = fd.get("notify") === "on";

      const newId = await rpc("create_card", { p });
      if (st.stopDraft) st.stopDraft();
      let linkFehler = "";
      for (const otherId of (st.links || [])) {
        try { await rpc("link_cards", { p_a: newId, p_b: otherId }); }
        catch (e) { linkFehler = e.message; }
      }
      if (linkFehler) {
        toast(`Karte erstellt, aber die Verknüpfung ist nicht gelungen: ${linkFehler}`, true, 7000);
      } else {
        toast(p.notify ? "Karte erstellt." : "Karte erstellt — ohne Push-Benachrichtigung.");
      }
    } else {
      const p = { ...common };
      if (st.type === "termin") {
        p.event_date = String(fd.get("event_date") || "");
        if (!p.event_date) return editorFail("Bitte ein Datum wählen.");
        p.event_time = String(fd.get("event_time") || "");
        // Endzeit nur zusammen mit Startzeit und danach (Prüfung auch in der Datenbank).
        p.event_end_time = p.event_time ? String(fd.get("event_end_time") || "") : "";
        if (p.event_end_time && p.event_end_time <= p.event_time) {
          return editorFail("Die Endzeit muss nach der Startzeit liegen.");
        }
        p.event_location = String(fd.get("event_location") || "").trim();
      }
      if ((st.type === "hinweis" || st.type === "termin") && st.attachments.length) {
        p.attachments = st.attachments;
      }
      if (st.type === "liste" && st.card.list_mode === "eintragen") {
        p.capacity = fd.get("capacity") ? Number(fd.get("capacity")) : null;
      }
      if (st.type === "umfrage") {
        // So viele Optionen blieben nach dem Speichern übrig: bestehende
        // (nicht gelöschte) zählen immer, auch wenn ihr Text geleert wurde
        // (das bleibt dann unverändert, wie beim Umbenennen von Listen-
        // Einträgen) — neue Zeilen nur, wenn sie tatsächlich beschriftet sind.
        const remaining = st.options.filter((o) => !o.deleted && (o.id || o.label.trim())).length;
        if (remaining < 2) return editorFail("Eine Umfrage braucht mindestens 2 Optionen.");
      }
      await rpc("update_card", { p_id: st.card.id, p });

      if (st.type === "liste") {
        for (const it of st.items) {
          const text = it.text.trim();
          if (it.id && it.deleted) {
            await rpc("delete_list_item", { p_item_id: it.id });
          } else if (it.id && text && text !== it.orig) {
            await rpc("update_list_item", { p_item_id: it.id, p_text: text });
          } else if (!it.id && !it.deleted && text) {
            await rpc("add_list_item", { p_card_id: st.card.id, p_text: text, p_preset: true });
          }
        }
      }

      if (st.type === "umfrage") {
        // Erst neue Optionen anlegen, dann umbenennen, zuletzt löschen —
        // in dieser Reihenfolge unterschreitet die Anzahl Optionen in der
        // Datenbank nie kurzzeitig die Mindestgrenze von 2 (die jede
        // einzelne delete_poll_option-Aufruf serverseitig prüft), selbst
        // wenn z. B. eine Option ersetzt statt nur umbenannt wird.
        for (const op of st.options) {
          const label = op.label.trim();
          if (!op.id && !op.deleted && label) {
            await rpc("add_poll_option", { p_card_id: st.card.id, p_label: label, p_capacity: op.capacity });
          }
        }
        for (const op of st.options) {
          const label = op.label.trim();
          if (op.id && !op.deleted && label && (label !== op.orig || op.capacity !== op.origCapacity)) {
            await rpc("update_poll_option", { p_option_id: op.id, p_label: label, p_capacity: op.capacity });
          }
        }
        for (const op of st.options) {
          if (op.id && op.deleted) {
            await rpc("delete_poll_option", { p_option_id: op.id });
          }
        }
      }
      toast("Änderungen gespeichert.");
    }

    dlgEditor.close();
    await reload({ silent: true });
  } catch (err) {
    editorFail(err.message);
  }
}

/* ---------- Aktionen aus dem Feed ---------- */

function cardById(id) {
  return cards.find((c) => c.id === id);
}

// UX-Forschung 19.09.2026: eine kurze, ruhige Bestätigung beim Erledigen
// (Abstimmen, Eintragen, Abhaken) statt eines Pop-ups — ausgelöst beim
// nächsten render(), damit sie die neu gezeichnete Karte trifft.
let celebrateCardId = null;
function celebrate(cardId) {
  if (cardId) celebrateCardId = cardId;
}

// onSuccess läuft nur nach erfolgreichem Speichern und noch vor dem
// Neuladen — z. B. um "mitgemacht" zu merken, damit das neue Rendern den
// Stand schon berücksichtigt.
async function doAction(fn, successMsg, onSuccess) {
  try {
    await fn();
    if (onSuccess) onSuccess();
    if (successMsg) toast(successMsg);
    await reload({ silent: true });
  } catch (err) {
    toast(err.message, true);
    await reload({ silent: true });
  }
}

// Aktionen, die Admin-Rechte brauchen (Hauptlink + Admin-Passwort, siehe
// #19) — Karten anlegen/bearbeiten/löschen/anpinnen sowie Papierkorb-
// Aktionen. Zusätzlich zur Oberfläche (die diese Buttons ohne Admin-Rechte
// gar nicht erst rendert) hier nochmal geprüft, falls doch mal ein Klick
// durchkommt (z. B. nach einem Reload mit veraltetem DOM-Zustand). Die
// eigentliche Absicherung liegt in der Datenbank (migration-021,
// p_admin_code) — diese Prüfung hier ist nur für eine saubere Oberfläche.
const ADMIN_NUR_HAUPTLINK = new Set([
  "edit", "duplicate", "pin", "trash", "restore", "delete-forever", "add-linked", "empty-trash", "link-card", "unlink-cards",
  "recurring-edit-row", "recurring-pin-row", "recurring-delete-row", "holiday-edit-row", "holiday-delete-row",
  "create-folder", "rename-folder", "delete-folder", "move-file",
  "archive-card", "unarchive-card", "open-kalender-admin", "edit-stundenplan",
]);

async function handleFeedClick(ev) {
  const btn = ev.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  if (!isAdmin() && ADMIN_NUR_HAUPTLINK.has(action)) return;
  const menu = btn.closest("details.menu, details.cal-add");
  if (menu) menu.removeAttribute("open");

  if (action === "retry") return reload();
  // Nutzerwunsch 18.09.2026: Springer-Erklärung antippbar statt nur per
  // Hover-Tooltip (siehe SPRINGER_BADGE) — vor dem cardId/itemId-Setup und
  // ohne Reload, da das Badge keine eigene Karten-/Item-Zuordnung braucht.
  if (action === "explain-springer") {
    toast("Kontingent voll — zusätzlicher Springer: bereit zu helfen, falls doch noch jemand gebraucht wird.");
    return;
  }
  if (action === "copy-kalender-abo") {
    try {
      await navigator.clipboard.writeText(kalenderAboUrl());
      toast("Abo-Link kopiert — in deinem Kalender unter „Kalender abonnieren“ bzw. „Per URL hinzufügen“ einfügen.", false, 6000);
    } catch {
      toast("Link konnte nicht kopiert werden.", true);
    }
    return;
  }
  if (action === "install-hint-close") {
    localStorage.setItem(INSTALL_HINT_KEY, String(Date.now() + INSTALL_HINT_PAUSE_MS));
    render();
    return;
  }
  if (action === "install-app") {
    if (!deferredInstallPrompt) return;
    const promptEvent = deferredInstallPrompt;
    deferredInstallPrompt = null;
    promptEvent.prompt();
    try { await promptEvent.userChoice; } catch { /* abgebrochen */ }
    render();
    return;
  }

  const cardId = btn.dataset.card;
  const itemId = btn.dataset.item;

  switch (action) {
    case "edit": {
      const c = cardById(cardId);
      if (c) openEditor(c.type, c);
      break;
    }
    case "duplicate": {
      const c = cardById(cardId);
      if (c) openEditor(c.type, null, null, { title: c.title, values: templateFromCard(c) });
      break;
    }
    case "pin": {
      const c = cardById(cardId);
      if (!c) break;
      await doAction(() => rpc("update_card", { p_id: c.id, p: { pinned: !c.pinned } }),
        c.pinned ? "Karte gelöst." : "Karte angepinnt.");
      break;
    }
    case "archive-card": {
      await doAction(() => rpc("update_card", { p_id: cardId, p: { archived: true } }),
        "Ins Archiv verschoben.");
      break;
    }
    case "unarchive-card": {
      await doAction(() => rpc("update_card", { p_id: cardId, p: { archived: false } }),
        "Aus dem Archiv zurückgeholt.");
      break;
    }
    case "share-card": {
      const c = cardById(cardId);
      if (!c) break;
      // Klassen-Kontext des teilenden Geräts mitgeben, falls vorhanden —
      // so landet, wer den Link öffnet, gleich in der passenden Klasse.
      const slug = localStorage.getItem(CLASS_SLUG_KEY);
      const url = `${location.origin}${location.pathname}${slug ? `?klasse=${slug}` : ""}#karte-${c.id}`;
      if (navigator.share) {
        try { await navigator.share({ title: c.title, url }); }
        catch { /* abgebrochen — kein Fehler */ }
      } else {
        try {
          await navigator.clipboard.writeText(url);
          toast("Link kopiert.");
        } catch {
          toast("Link konnte nicht kopiert werden.", true);
        }
      }
      break;
    }
    case "move-file": {
      const c = cardById(cardId);
      if (!c) break;
      // ideen-backlog.md #3: alle Ordner anbieten, nicht mehr nur die zur
      // aktuellen Klasse passenden — der gewählte Ordner bestimmt jetzt
      // selbst die Sichtbarkeit der Datei mit (siehe migration-019), ein
      // Wechsel der Klasse per Ordnerwahl ist also ausdrücklich möglich.
      const opts = [{ value: "", label: "Ohne Ordner" }].concat(
        foldersList.map((f) => {
          const cls = f.class_id ? classesList.find((x) => x.id === f.class_id) : null;
          const icon = f.class_id ? (cls ? CLASS_ICON[cls.slug] || "" : "") : "🏫";
          return { value: f.id, label: `${icon} ${f.name}`.trim() };
        }));
      const vals = await promptDlg("Datei verschieben",
        [{ name: "folder_id", label: "Ordner", value: c.folder_id || "", options: opts }]);
      if (!vals) break;
      // Reine Umsortierung, keine inhaltliche Bearbeitung — zählt bewusst
      // nicht als "Zuletzt geändert" (kein creator_name im Payload, siehe
      // update_card). class_id wird bewusst nicht mitgeschickt, damit die
      // RPC sie automatisch vom Ziel-Ordner übernimmt.
      await doAction(() => rpc("update_card", { p_id: c.id, p: { folder_id: vals.folder_id } }),
        "Datei verschoben.");
      break;
    }
    case "trash": {
      const ok = await confirmDlg(
        "Karte in den Papierkorb verschieben? Sie kann dort 30 Tage lang wiederhergestellt werden.",
        "In den Papierkorb");
      if (ok) await doAction(() => rpc("trash_card", { p_id: cardId }), "In den Papierkorb verschoben.");
      break;
    }
    case "restore": {
      await doAction(() => rpc("restore_card", { p_id: cardId }), "Karte wiederhergestellt.");
      break;
    }
    case "delete-forever": {
      const ok = await confirmDlg(
        "Diese Karte jetzt endgültig löschen? Das kann nicht rückgängig gemacht werden.",
        "Endgültig löschen");
      if (ok) await doAction(() => rpc("delete_card_forever", { p_id: cardId }), "Endgültig gelöscht.");
      break;
    }
    case "empty-trash": {
      const n = visibleCards().length;
      const ok = await confirmDlg(
        `Den gesamten Papierkorb jetzt leeren (${n} ${n === 1 ? "Karte" : "Karten"})? Das kann nicht rückgängig gemacht werden.`,
        "Papierkorb leeren");
      if (ok) await doAction(() => rpc("empty_trash", {}), "Papierkorb geleert.");
      break;
    }
    case "ics-download": {
      const c = cardById(cardId);
      if (c) downloadIcs(c);
      break;
    }
    case "recurring-edit-row": { await editRecurring(btn.dataset.id); break; }
    case "holiday-edit-row": { await editHoliday(btn.dataset.id); break; }
    case "recurring-pin-row": {
      const angepinnt = btn.dataset.pinned === "1";
      await doAction(() => rpc("update_recurring_event", { p_id: btn.dataset.id, p: { pinned: !angepinnt } }),
        angepinnt ? "Nicht mehr angepinnt." : "Angepinnt — erscheint auf der Startseite.");
      break;
    }
    case "recurring-delete-row": {
      if (!(await confirmDlg("Dieses wiederkehrende Ereignis löschen?", "Löschen"))) break;
      await doAction(() => rpc("delete_recurring_event", { p_id: btn.dataset.id }), "Gelöscht.");
      break;
    }
    case "holiday-delete-row": {
      if (!(await confirmDlg("Diesen Ferien-/freien Tag löschen?", "Löschen"))) break;
      const rest = schoolHolidays.filter((h) => h.id !== btn.dataset.id)
        .map((h) => ({ label: h.label, start_date: h.start_date, end_date: h.end_date }));
      await doAction(() => rpc("set_school_holidays", { p_holidays: rest }), "Gelöscht.");
      break;
    }
    case "link-card": {
      const c = cardById(cardId);
      if (!c) break;
      const schon = new Set([c.id, ...linkPartners(c).map((x) => x.id)]);
      openLinkPicker({
        exclude: schon,
        classId: c.class_id || "",
        onPick: async (id) => {
          await doAction(() => rpc("link_cards", { p_a: c.id, p_b: id }), "Verknüpft.");
        },
        onNew: () => { pendingLinkId = c.id; pendingParentId = null; dlgType.showModal(); },
      });
      break;
    }
    case "unlink-cards": {
      await doAction(() => rpc("unlink_cards", { p_a: cardId, p_b: btn.dataset.other }),
        "Verknüpfung gelöst.");
      break;
    }
    case "add-linked": {
      // ideen-backlog.md #10: bei einem Hinweis als Ziel ist bewusst nur
      // "Datei" erlaubt (z. B. eine Packliste an einen Wandertag-Hinweis
      // hängen) — der Typ-Auswahldialog wird dafür übersprungen. Bei einem
      // Termin bleibt die volle Auswahl wie bisher bestehen.
      const parent = cardById(cardId);
      if (parent && parent.type === "hinweis") {
        openEditor("datei", null, cardId);
      } else {
        pendingParentId = cardId;
        dlgType.showModal();
      }
      break;
    }
    case "jump-to-card": {
      // Kommt vom "zurück zum Termin/Hinweis"-Chip auf einer verknüpften
      // Karte (ideen-backlog.md #10 erweitert das Ziel von reinem Termin
      // auch auf Hinweis) — openCardById() kennt beide Fälle bereits
      // (Push-Klick, Teilen-Link, Suche nutzen dieselbe Funktion).
      openCardById(cardId);
      break;
    }
    // Die drei Bubbles auf der Startseite (Termin/Beteiligung/Datei) sowie
    // die "Nächster Termin"-Zeile (data-card mitgegeben, um genau diesen
    // Termin gleich aufgeklappt zu zeigen).
    case "pin-wiederkehrend": {
      const r = recurringEvents.find((x) => x.id === btn.dataset.id);
      if (r) {
        const zeit = fmtTimeRange(r.start_time, r.end_time);
        toast(`${r.title} — jeden ${WEEKDAY_LABEL[r.weekday]}${zeit ? `, ${zeit}` : ""}`, false, 6000);
      }
      break;
    }
    case "open-rubrik": {
      const type = btn.dataset.type;
      if (type === "datei") {
        view = "dateien";
        openFolderId = undefined;
      } else if (type === "termin") {
        view = "termine";
        openTerminId = btn.dataset.card || null;
        const jumpTermin = openTerminId && cardById(openTerminId);
        if (jumpTermin && jumpTermin.event_date) {
          calendarMonth = parseISODate(jumpTermin.event_date);
          calendarMonth.setDate(1);
        }
      } else if (type === "beteiligung") {
        view = "beteiligung";
      } else if (type === "stundenplan") {
        view = "stundenplan";
      } else if (type === "aufgaben") {
        view = "aufgaben";
      }
      render();
      break;
    }
    case "toggle-termin-strip": {
      const id = btn.dataset.card;
      openTerminId = openTerminId === id ? null : id;
      render();
      break;
    }
    case "toggle-archiv-strip": {
      const id = btn.dataset.card;
      openArchivId = openArchivId === id ? null : id;
      render();
      break;
    }
    case "toggle-hinweis-strip": {
      const id = btn.dataset.card;
      openHinweisId = openHinweisId === id ? null : id;
      render();
      break;
    }
    case "toggle-older-hinweise": {
      showOlderHinweise = !showOlderHinweise;
      render();
      break;
    }
    case "open-card": {
      openCardById(btn.dataset.card);
      break;
    }
    case "open-kalender-admin": {
      openKalenderAdmin(btn.dataset.screen);
      break;
    }
    case "edit-stundenplan": {
      openKalenderAdmin("schedule");
      break;
    }
    case "aufgabe-done":
    case "aufgabe-undo": {
      setAufgabeErledigt(btn.dataset.card, action === "aufgabe-done");
      if (action === "aufgabe-done") celebrate(btn.dataset.card);
      render();
      break;
    }
    case "open-folder-grid": {
      openFolderId = undefined;
      render();
      break;
    }
    case "open-folder": {
      openFolderId = btn.dataset.folder;
      render();
      break;
    }
    case "create-folder": {
      const classOpts = [{ value: "", label: "🏫 Gemeinsam (beide Klassen)" }].concat(
        classesList.map((cl) => ({ value: cl.id, label: `${CLASS_ICON[cl.slug] || ""} ${cl.name}` })));
      const vals = await promptDlg("Neuer Ordner", [
        { name: "name", label: "Ordnername", placeholder: "z. B. Elternabend Fotos", maxlength: 60 },
        { name: "class_id", label: "Gilt für", value: activeClassId || "", options: classOpts },
        { name: "creator_name", label: "Dein Name bzw. deine Funktion", placeholder: "z. B. Frau Müller, Lehrkraft",
          maxlength: 80, value: localStorage.getItem(CREATOR_NAME_KEY) || "" },
      ]);
      if (!vals) break;
      localStorage.setItem(CREATOR_NAME_KEY, vals.creator_name);
      await doAction(() => rpc("create_folder",
        { p_class_id: vals.class_id || null, p_name: vals.name, p_creator_name: vals.creator_name }), "Ordner angelegt.");
      break;
    }
    case "rename-folder": {
      const folder = foldersList.find((f) => f.id === btn.dataset.folder);
      if (!folder) break;
      const vals = await promptDlg("Ordner umbenennen",
        [{ name: "name", label: "Ordnername", maxlength: 60, value: folder.name }]);
      if (!vals) break;
      await doAction(() => rpc("rename_folder", { p_folder_id: folder.id, p_name: vals.name }), "Ordner umbenannt.");
      break;
    }
    case "delete-folder": {
      const ok = await confirmDlg("Diesen Ordner löschen? Das geht nur, wenn er leer ist.", "Löschen");
      if (!ok) break;
      openFolderId = undefined;
      await doAction(() => rpc("delete_folder", { p_folder_id: btn.dataset.folder }), "Ordner gelöscht.");
      break;
    }
    case "item-fill": {
      const vals = await promptDlg(`Wer übernimmt „${btn.dataset.text}“?`,
        [{ name: "name", label: "Name", placeholder: "z. B. Anna M.", maxlength: 80 }]);
      const ownCard = btn.closest(".card")?.dataset.card;
      if (vals) await doAction(() => rpc("set_item_filled", { p_item_id: itemId, p_name: vals.name }),
        "Eingetragen — danke!", () => { markMitgemacht(ownCard); celebrate(ownCard); });
      break;
    }
    case "item-unfill": {
      const ok = await confirmDlg(`Eintrag von „${btn.dataset.who}“ wieder entfernen?`, "Entfernen");
      if (ok) await doAction(() => rpc("set_item_filled", { p_item_id: itemId, p_name: "" }));
      break;
    }
    case "item-delete": {
      const ok = await confirmDlg("Diesen Eintrag löschen?", "Löschen");
      if (ok) await doAction(() => rpc("delete_list_item", { p_item_id: itemId }));
      break;
    }
    case "entry-add": {
      const vals = await promptDlg("Neuen Eintrag hinzufügen", [
        { name: "text", label: "Was trägst du ein?", placeholder: "z. B. Servietten", maxlength: 300 },
        { name: "name", label: "Dein Name", placeholder: "z. B. Emma K.", maxlength: 80 },
      ]);
      if (vals) await doAction(() => rpc("add_list_item",
        { p_card_id: cardId, p_text: vals.text, p_filled_by: vals.name }), "Eingetragen — danke!",
        () => { markMitgemacht(cardId); celebrate(cardId); });
      break;
    }
    case "row-add": {
      try {
        await rpc("add_table_row", { p_card_id: cardId });
        markMitgemacht(cardId);
        await reload({ silent: true });
        requestAnimationFrame(() => {
          const cardEl = elFeed.querySelector(`.card[data-card="${CSS.escape(cardId)}"]`);
          const firstInput = cardEl?.querySelector(".data-table tbody tr:last-child input");
          if (firstInput) firstInput.focus();
        });
      } catch (err) {
        toast(err.message, true);
      }
      break;
    }
    case "row-delete": {
      const ok = await confirmDlg("Diese Zeile löschen?", "Löschen");
      if (ok) await doAction(() => rpc("delete_table_row", { p_row_id: btn.dataset.row }));
      break;
    }
    case "vote-edit": {
      pollEditing.add(cardId);
      render();
      break;
    }
    case "vote-retract": {
      pollEditing.delete(cardId);
      await doAction(() => rpc("cast_vote",
        { p_card_id: cardId, p_option_ids: [], p_device_token: deviceToken }), "Stimme zurückgezogen.");
      break;
    }
    // Nutzerwunsch 18.09.2026 (Alltagstauglichkeits-Review): bei genau einer
    // wählbaren Option (kein multi_select, keine Namenspflicht) direkt beim
    // Antippen abstimmen — der extra "Abstimmen"-Klick war für eine so
    // triviale Aktion ein unnötiger zweiter Entscheidungsschritt (siehe
    // data-action an der Stelle, wo das Radio-Input gerendert wird).
    case "vote-submit-radio":
    case "vote-submit": {
      const chosen = [...elFeed.querySelectorAll(`input[name="poll-${CSS.escape(cardId)}"]:checked`)]
        .map((i) => i.value);
      if (!chosen.length) { toast("Bitte zuerst eine Option auswählen.", true); break; }
      const pollCard = cards.find((x) => x.id === cardId);
      let voterName;
      if (pollCard && pollCard.poll_named) {
        voterName = $(`pollNameInput-${cardId}`)?.value.trim() || "";
        if (!voterName) { toast("Bitte deinen Namen angeben.", true); break; }
        localStorage.setItem(VOTER_NAME_KEY, voterName);
      }
      pollEditing.delete(cardId);
      await doAction(() => rpc("cast_vote",
        { p_card_id: cardId, p_option_ids: chosen, p_device_token: deviceToken, p_voter_name: voterName }),
        "Stimme gespeichert.", () => celebrate(cardId));
      break;
    }
    case "feedback-submit": {
      const name = $("feedbackName")?.value.trim() || "";
      const message = $("feedbackMessage")?.value.trim() || "";
      if (!name) { toast("Bitte deinen Namen angeben.", true); break; }
      if (!message) { toast("Bitte eine Nachricht angeben.", true); break; }
      try {
        await rpc("send_feedback", { p_class_id: activeClassId || null, p_sender_name: name, p_message: message });
        toast("Danke, deine Nachricht ist angekommen.");
        $("feedbackName").value = "";
        $("feedbackMessage").value = "";
      } catch (err) {
        toast(err.message || "Senden fehlgeschlagen.", true);
      }
      break;
    }
    case "feedback-comment-save": {
      const item = btn.closest(".feedback-item");
      const comment = item?.querySelector("textarea")?.value.trim() || "";
      try {
        await rpc("comment_feedback", { p_id: btn.dataset.id, p_comment: comment });
        toast("Kommentar gespeichert.");
        feedbackEntries = null;
        render();
      } catch (err) {
        toast(err.message || "Speichern fehlgeschlagen.", true);
      }
      break;
    }
    case "feedback-delete": {
      const ok = await confirmDlg("Diese Feedback-Nachricht endgültig löschen?", "Löschen");
      if (!ok) break;
      try {
        await rpc("delete_feedback", { p_id: btn.dataset.id });
        toast("Feedback gelöscht.");
        feedbackEntries = null;
        render();
      } catch (err) {
        toast(err.message || "Löschen fehlgeschlagen.", true);
      }
      break;
    }
  }
}

async function handleFeedChange(ev) {
  // Karte, zu der das geänderte Feld gehört — fürs Merken von "mitgemacht".
  const ownCard = ev.target.closest(".card")?.dataset.card;
  const box = ev.target.closest('input[data-action="item-check"]');
  if (box) {
    const wanted = box.checked;
    box.disabled = true;
    try {
      await rpc("set_item_checked", { p_item_id: box.dataset.item, p_checked: wanted });
      if (wanted) { markMitgemacht(ownCard); celebrate(ownCard); }
      await reload({ silent: true });
    } catch (err) {
      box.checked = !wanted;
      box.disabled = false;
      toast(err.message, true);
    }
    return;
  }

  const who = ev.target.closest('input[data-action="item-who"]');
  if (who) {
    who.disabled = true;
    try {
      await rpc("set_item_filled", { p_item_id: who.dataset.item, p_name: who.value });
      if (who.value.trim()) markMitgemacht(ownCard);
      await reload({ silent: true });
    } catch (err) {
      who.disabled = false;
      toast(err.message, true);
    }
    return;
  }

  const cell = ev.target.closest('input[data-action="cell-edit"]');
  if (cell) {
    // Jede Zelle speichert für sich (per Spalten-Index) — nicht die ganze
    // Zeile neu schreiben, sonst können sich schnell hintereinander
    // ausgelöste Speicherungen (z. B. Tab durch mehrere Zellen) überholen
    // und frisch eingetragene Werte wieder überschreiben.
    cell.disabled = true;
    try {
      await rpc("update_table_cell",
        { p_row_id: cell.dataset.row, p_col: Number(cell.dataset.col), p_value: cell.value });
      if (cell.value.trim()) markMitgemacht(ownCard);
    } catch (err) {
      toast(err.message, true);
      await reload({ silent: true });
    } finally {
      cell.disabled = false;
    }
  }
}

/* ---------- Versionsfenster ---------- */

function renderVersionDialog() {
  if (!elVersionBtn) return;
  const el = $("versionList");
  if (el) {
    el.innerHTML = VERSIONS.map(
      (v) => `<div class="version-entry"><h3>${esc(v.version)}</h3><ul>${v.items
        .map((item) => `<li>${esc(item)}</li>`)
        .join("")}</ul></div>`
    ).join("");
  }
}

function openVersionDialog() {
  dlgVersion.showModal();
  localStorage.setItem(VERSION_SEEN_KEY, VERSIONS[0].version);
  elVersionBtn.classList.remove("has-update");
  elMoreBtn?.classList.remove("has-update");
}

// Beim Start prüfen, ob es seit dem letzten Besuch dieses Geräts eine neue
// Version gibt — falls ja, nur ein Punkt am "Mehr"-Knopf. Design-Review
// 18.09.2026: nicht mehr automatisch öffnen, das legte sich zusammen mit
// dem (inzwischen entfernten) Willkommensfenster vor den eigentlichen Inhalt.
function checkForNewVersion() {
  if (!elVersionBtn) return;
  const seen = localStorage.getItem(VERSION_SEEN_KEY);
  if (seen === VERSIONS[0].version) return;
  if (seen === null) {
    // Allererster Besuch auf diesem Gerät — kein Popup, einfach als gesehen merken.
    localStorage.setItem(VERSION_SEEN_KEY, VERSIONS[0].version);
    return;
  }
  elVersionBtn.classList.add("has-update");
  // Der Versions-Button steckt jetzt im "Mehr"-Menü (ideen-backlog.md
  // #17) und ist ohne den Punkt hier auf dem sichtbaren "Mehr"-Knopf
  // selbst nicht mehr erkennbar, dass es was Neues gibt.
  elMoreBtn?.classList.add("has-update");
}

/* ---------- Push-Benachrichtigungen ---------- */

const elPushBell = $("pushBell");

// VAPID-Public-Key kommt als base64url-String aus config.js, die Push-API
// will ihn aber als Uint8Array.
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/* ---------- Als App installieren (UX-Forschung 19.09.2026) ---------- */
// Im Browser-Tab löscht Safari auf dem iPhone den Gerätespeicher einer
// Seite, wenn man sie eine Weile nicht öffnet — damit wären "erledigt",
// "mitgemacht", die eigene Abstimmung und die Klassen-Sperre weg. Als
// installierte App passiert das nicht, und nur dort gibt es auf dem iPhone
// Push. Deshalb ein ruhiger, wegklickbarer Streifen auf der Startseite
// (kein Pop-up), solange die App nicht installiert ist.

const INSTALL_HINT_KEY = "pinnwand_installhinweis_bis";
const INSTALL_HINT_PAUSE_MS = 30 * 86400000;
let deferredInstallPrompt = null;

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
}
function isIOS() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function installHintHtml() {
  if (isStandalone()) return "";
  if (Date.now() < Number(localStorage.getItem(INSTALL_HINT_KEY) || 0)) return "";
  const close = `<button type="button" class="install-hint-close" data-action="install-hint-close" aria-label="Hinweis ausblenden">✕</button>`;
  const why = "So bleiben deine Häkchen gespeichert, und du kannst Benachrichtigungen bekommen.";
  if (deferredInstallPrompt) {
    return `
      <div class="install-hint">
        ${ICONS.install}
        <div class="install-hint-text"><b>Pinnwand als App speichern</b><span>${why}</span></div>
        <button type="button" class="btn small primary" data-action="install-app">Installieren</button>
        ${close}
      </div>`;
  }
  if (isIOS()) {
    return `
      <div class="install-hint">
        ${ICONS.install}
        <div class="install-hint-text"><b>Pinnwand als App speichern</b>
          <span>${why} Unten auf <span class="install-hint-icon" aria-label="Teilen">${ICONS.iosShare}</span> tippen, dann „Zum Home-Bildschirm“.</span></div>
        ${close}
      </div>`;
  }
  // Andere Handy-Browser ohne eigene Installations-Abfrage — am Computer
  // bringt der Hinweis nichts, dort bleibt der Speicher erhalten.
  if (window.matchMedia("(pointer: coarse)").matches) {
    return `
      <div class="install-hint">
        ${ICONS.install}
        <div class="install-hint-text"><b>Pinnwand als App speichern</b>
          <span>${why} Im Browser-Menü „Zum Startbildschirm hinzufügen“ wählen.</span></div>
        ${close}
      </div>`;
  }
  return "";
}

function pushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && !!cfg.VAPID_PUBLIC_KEY;
}

function setBellState(active) {
  if (!elPushBell) return;
  elPushBell.classList.toggle("active", active);
  elPushBell.innerHTML = ICONS.bell;
  elPushBell.title = active
    ? "Benachrichtigungen sind aktiv (antippen zum Deaktivieren)"
    : "Benachrichtigungen aktivieren";
}

async function refreshBellState() {
  if (!elPushBell || !pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    setBellState(!!sub);
  } catch {
    setBellState(false);
  }
}

async function togglePush() {
  if (!elPushBell) return;
  elPushBell.disabled = true;
  try {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();

    if (existing) {
      await rpc("delete_push_subscription", { p_endpoint: existing.endpoint });
      await existing.unsubscribe();
      setBellState(false);
      toast("Benachrichtigungen deaktiviert.");
      return;
    }

    if (Notification.permission === "denied") {
      toast("Benachrichtigungen sind im Browser blockiert — das lässt sich nur in den Browser-/Website-Einstellungen wieder ändern.", true);
      return;
    }
    // Nutzerwunsch 18.09.2026 (Alltagstauglichkeits-Review): vor der
    // System-Berechtigungsabfrage erst selbst erklären, wofür sie ist —
    // sonst kommt der native Browser-Dialog "kalt" und wird von vielen
    // reflexhaft abgelehnt, was sich danach nur über die Geräteeinstellungen
    // rückgängig machen lässt (siehe Fehlermeldung oben).
    const einverstanden = await confirmDlg(
      "Über neue Hinweise, Termine und Umfragen benachrichtigt werden? Dein Gerät fragt dich gleich um Erlaubnis — du kannst das jederzeit über dieses Glocken-Symbol wieder ausschalten.",
      "Benachrichtigungen erlauben"
    );
    if (!einverstanden) return;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      toast("Ohne Erlaubnis können keine Benachrichtigungen geschickt werden.", true);
      return;
    }
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(cfg.VAPID_PUBLIC_KEY),
    });
    // Nutzerwunsch 17.09.2026: nur Klassen-Link-Geräte (classLocked) auf
    // ihre feste Klasse einschränken — Hauptlink-Geräte (Lehrkraft/
    // Elternsprecher) bekommen weiterhin alles gemeldet, deshalb hier
    // bewusst kein activeClassId (das wäre nur der gerade gewählte Filter,
    // keine feste Zugehörigkeit).
    const pushClassId = classLocked ? activeClassId : null;
    await rpc("save_push_subscription", { p: { ...sub.toJSON(), class_id: pushClassId } });
    setBellState(true);
    toast("Benachrichtigungen aktiviert.");
  } catch (err) {
    toast(err.message || "Benachrichtigungen konnten nicht aktiviert werden.", true);
  } finally {
    elPushBell.disabled = false;
  }
}

/* ---------- Verbindungsstatus (Council-Feature-Idee #43) ---------- */
// Reiner Hinweis-Banner bei fehlendem Netz — die App selbst funktioniert
// dann nicht mehr (keine Backend-Anbindung ohne Netz), aber ohne Hinweis
// wirkt sie für Eltern nur "leer/eingefroren" statt erklärt.

function updateOfflineBanner() {
  if (elOfflineBanner) elOfflineBanner.hidden = navigator.onLine;
}

/* ---------- Initialisierung ---------- */

async function init() {
  updateOfflineBanner();
  window.addEventListener("online", updateOfflineBanner);
  window.addEventListener("offline", updateOfflineBanner);

  // Anker aus der Adressleiste übernehmen, bevor überhaupt etwas gerendert
  // wird ("#karte-…" wird erst gemerkt, siehe pendingCardId in reload()).
  applyInitialHash();

  // Zurück/Vorwärts im Browser bzw. die Zurück-Geste/-Taste des Geräts —
  // siehe hashFromState()/syncHistory() oben.
  window.addEventListener("popstate", () => {
    suppressHistoryPush = true;
    // Browser unterscheidet Vor/Zurück nicht im Event selbst — beides als
    // "back" behandeln ist die im Alltag weit häufigere Richtung und für
    // eine bewusst dezente Animation genau genug (#5 aus ideen-backlog.md).
    navDirection = "back";
    applyHash(location.hash);
    render();
    suppressHistoryPush = false;
  });

  // Ansichten und Filter (feste Fußleiste, siehe .bottom-nav)
  elViewTabs.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-view]");
    if (!btn) return;
    view = btn.dataset.view;
    // ideen-backlog.md #23: "Datei" soll immer zur Hauptansicht der
    // Ordner springen, nicht in einem zuvor offenen Unterordner
    // "hängenbleiben" — dafür sind ja gerade die On-Screen-Zurück-Knöpfe
    // dort weggefallen.
    if (view === "dateien") openFolderId = undefined;
    render();
  });

  // Klassenwahl (Eichhörnchen/Schmetterling/Beide) — Anzeigefilter
  if (elClassSelect) {
    elClassSelect.addEventListener("change", () => {
      activeClassId = elClassSelect.value;
      if (activeClassId) localStorage.setItem(CLASS_KEY, activeClassId);
      else localStorage.removeItem(CLASS_KEY);
      updateBrandTitle();
      render();
    });
  }
  // Feed-Interaktionen
  elFeed.addEventListener("click", handleFeedClick);
  elFeed.addEventListener("change", handleFeedChange);
  elNotice.addEventListener("click", (ev) => {
    if (ev.target.closest('[data-action="retry"]')) reload();
  });

  // Offene ⋯-Menüs schließen, wenn daneben geklickt wird
  document.addEventListener("click", (ev) => {
    document.querySelectorAll("details.menu[open]").forEach((d) => {
      if (!d.contains(ev.target)) d.removeAttribute("open");
    });
  });

  // Neu erstellen
  elFab.addEventListener("click", () => { pendingParentId = null; pendingLinkId = null; dlgType.showModal(); });

  if (elScrollTopBtn) {
    elScrollTopBtn.innerHTML = ICONS.arrowUp;
    elScrollTopBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    window.addEventListener("scroll", updateScrollTopButton, { passive: true });
  }
  dlgType.addEventListener("click", (ev) => {
    if (ev.target.closest("[data-close]")) { pendingParentId = null; pendingLinkId = null; return dlgType.close(); }
    const btn = ev.target.closest("[data-type]");
    if (!btn) return;
    const parentId = pendingParentId;
    const linkId = pendingLinkId;
    pendingParentId = null;
    pendingLinkId = null;
    dlgType.close();
    openEditor(btn.dataset.type, null, parentId);
    if (linkId && editorState.mode === "create") { editorState.links = [linkId]; renderEditLinks(); }
  });

  // Auswahlfenster für Verknüpfungen
  $("linkSearch").addEventListener("input", renderLinkPicker);
  dlgLink.addEventListener("click", (ev) => {
    if (ev.target.closest("[data-close]")) { linkPickerCtx = null; return dlgLink.close(); }
    if (ev.target.closest("#linkNew")) {
      const ctx = linkPickerCtx;
      linkPickerCtx = null;
      dlgLink.close();
      if (ctx && ctx.onNew) ctx.onNew();
      return;
    }
    const pick = ev.target.closest("[data-pick]");
    if (!pick) return;
    const ctx = linkPickerCtx;
    linkPickerCtx = null;
    dlgLink.close();
    if (ctx) ctx.onPick(pick.dataset.pick);
  });

  // Editor
  $("editorForm").addEventListener("submit", (ev) => {
    ev.preventDefault();
    submitEditor();
  });
  dlgEditor.addEventListener("click", (ev) => {
    if (ev.target.closest("[data-action='draft-discard']")) {
      const { type, parentId } = editorState;
      if (editorState.stopDraft) editorState.stopDraft();
      dlgEditor.close();
      openEditor(type, null, parentId);
      return;
    }
    if (ev.target.closest("[data-close]")) dlgEditor.close();
  });
  dlgPrompt.addEventListener("click", (ev) => {
    if (ev.target.closest("[data-close]")) dlgPrompt.close();
  });

  if (elPushBell && pushSupported()) {
    elPushBell.hidden = false;
    elPushBell.innerHTML = ICONS.bell;
    elPushBell.addEventListener("click", togglePush);
    refreshBellState();
  } else if (elPushBell && isIOS() && !isStandalone()) {
    // UX-Forschung 19.09.2026: Auf dem iPhone gibt es Push nur für die
    // installierte App. Statt die Glocke kommentarlos wegzulassen, erklärt
    // sie beim Antippen, wie man hinkommt.
    elPushBell.hidden = false;
    elPushBell.innerHTML = ICONS.bell;
    elPushBell.classList.add("unavailable");
    elPushBell.title = "Benachrichtigungen gibt es auf dem iPhone nur in der installierten App";
    elPushBell.setAttribute("aria-label", elPushBell.title);
    elPushBell.addEventListener("click", () => toast(
      "Benachrichtigungen gibt es auf dem iPhone nur, wenn die Pinnwand als App installiert ist: unten auf Teilen tippen, dann „Zum Home-Bildschirm“. Danach die App über das neue Symbol öffnen und hier auf die Glocke tippen.",
      false, 9000));
  }

  // Android/Chrome bieten die Installation selbst an — die Abfrage wird
  // gemerkt und erst auf den "Installieren"-Knopf im Hinweis gezeigt.
  window.addEventListener("beforeinstallprompt", (ev) => {
    ev.preventDefault();
    deferredInstallPrompt = ev;
    if (loaded && view === "feed") render();
  });
  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    if (loaded && view === "feed") render();
  });

  if (elVersionBtn) {
    renderVersionDialog();
    elVersionBtn.addEventListener("click", openVersionDialog);
    dlgVersion.addEventListener("click", (ev) => {
      if (ev.target.closest("[data-close]")) dlgVersion.close();
    });
    checkForNewVersion();
  }

  // "Mehr"-Menü (ideen-backlog.md #17): Archiv/Papierkorb wechseln nur die
  // Ansicht, "Version" hat oben schon einen eigenen Listener (elVersionBtn
  // zeigt seit dem Umbau auf denselben Button hier im Dialog) — der
  // schließt hier nur noch das Menü mit, öffnet aber nicht selbst was.
  if (elMoreBtn && dlgMore) {
    elMoreBtn.addEventListener("click", () => {
      // Archiv/Papierkorb sind Admin-Sache — für alle anderen unsichtbar,
      // nicht nur ungeschrieben-lassen (Nutzerwunsch 11.09.2026).
      if (elArchivBtn) elArchivBtn.hidden = !isAdmin();
      if (elPapierkorbBtn) elPapierkorbBtn.hidden = !isAdmin();
      dlgMore.showModal();
    });
    dlgMore.addEventListener("click", (ev) => {
      const item = ev.target.closest(".more-item[data-view]");
      if (item) {
        view = item.dataset.view;
        // Immer frisch laden, nicht die letzte Liste von vorhin zeigen
        // (Nutzerwunsch 12.09.2026: eigene Rubrik statt Dialog).
        if (view === "feedback") feedbackEntries = null;
        render();
      }
      if (ev.target.closest("[data-close]")) dlgMore.close();
    });
  }

  // Feedback-Kreis in der Kopfzeile (Nutzerwunsch 20.09.2026).
  if (elFeedbackBtn) {
    elFeedbackBtn.addEventListener("click", () => {
      view = "feedback";
      feedbackEntries = null; // immer frisch laden
      render();
    });
  }

  if (dlgTranslate && $("moreTranslateBtn")) {
    $("moreTranslateBtn").addEventListener("click", () => {
      $("translateStandaloneNote").hidden = !isStandalone();
      dlgTranslate.showModal();
    });
    dlgTranslate.addEventListener("click", (ev) => {
      if (ev.target.closest("[data-close]")) dlgTranslate.close();
    });
  }

  // ideen-backlog.md #19: Admin-Zugang nachträglich freischalten (falls
  // beim Start abgebrochen) bzw. auf diesem Gerät wieder abmelden — nur
  // am Hauptlink überhaupt sichtbar, nie auf einem Klassen-Link.
  if (elAdminBtn) {
    // Nutzerwunsch 12.09.2026: NICHT hier einmalig setzen — beim allerersten
    // Besuch über einen Klassen-Link ändert applyClassLink() (in
    // loadClasses(), läuft erst in init() NACH der Dialog-Verdrahtung)
    // classLocked noch von false auf true. Eine einmalige Zuweisung hier
    // hätte also mit dem alten, noch falschen Wert gerechnet und den
    // Admin-Button für genau diesen ersten Besuch fälschlich sichtbar
    // gelassen. Stattdessen wie die anderen Mehr-Menü-Punkte bei jedem
    // Öffnen neu bestimmen (siehe elMoreBtn-Listener weiter unten).
    // Nutzerwunsch 20.09.2026: Der Knopf ist jetzt für alle "Abmelden" —
    // Klasse bzw. Admin-Zugang vergessen, danach erscheint die Anmeldung.
    // Anmeldung AN: "Abmelden". AUS: wie früher "Admin-Zugang freischalten/
    // beenden" (auf einem Klassen-Link-Gerät unsichtbar). Der Schalter selbst
    // ist nur für angemeldete Admins sichtbar.
    const elSwitchBtn = $("moreLoginSwitchBtn");
    const elSwitchLabel = $("moreLoginSwitchLabel");
    if (elMoreBtn) {
      elMoreBtn.addEventListener("click", () => {
        if (loginPflicht) {
          elAdminBtn.hidden = false;
          elAdminBtnLabel.textContent = isAdmin() ? "Abmelden (Admin)" : "Abmelden / Klasse wechseln";
        } else {
          elAdminBtn.hidden = classLocked;
          elAdminBtnLabel.textContent = isAdmin() ? "Admin-Zugang beenden" : "Admin-Zugang freischalten";
        }
        if (elSwitchBtn) {
          elSwitchBtn.hidden = !isAdmin();
          elSwitchLabel.textContent = loginPflicht
            ? "Anmeldung für alle: AN — ausschalten"
            : "Anmeldung für alle: AUS — einschalten";
        }
      });
    }
    elAdminBtn.addEventListener("click", async () => {
      if (loginPflicht) { logout(); return; }
      if (isAdmin()) {
        adminCode = "";
        localStorage.removeItem(ADMIN_CODE_KEY);
        render();
        return;
      }
      if (await askLogin(true)) {
        renderClassSelect();
        syncClassInUrl();
        render();
        reload();
      }
    });
    if (elSwitchBtn) {
      elSwitchBtn.addEventListener("click", async () => {
        const an = !loginPflicht;
        const ok = await confirmDlg(an
          ? "Anmeldung für alle EINSCHALTEN? Ab dem nächsten Öffnen der App müssen sich alle, die noch keiner Klasse zugeordnet sind, mit dem Namen ihrer Klasse anmelden."
          : "Anmeldung für alle AUSSCHALTEN? Danach kommt jeder wieder ohne Passwort hinein.",
          an ? "Einschalten" : "Ausschalten");
        if (!ok) return;
        try {
          await rpc("set_login_pflicht", { p_on: an });
          loginPflicht = an;
          localStorage.setItem(LOGIN_PFLICHT_KEY, an ? "1" : "0");
          toast(an ? "Anmeldung ist jetzt eingeschaltet." : "Anmeldung ist jetzt ausgeschaltet.");
        } catch (err) {
          toast(err.message || "Umschalten fehlgeschlagen.", true);
        }
      });
    }
  }

  // Verwaltung Kalender/Stundenplan (nur Hauptlink) — Inhalt wechselt
  // zwischen mehreren "Screens" (renderKalAdminHome/-Schedule/-...), die
  // sich jeweils selbst verdrahten; hier nur das Schließen per data-close.
  if (dlgKalenderAdmin) {
    dlgKalenderAdmin.addEventListener("click", (ev) => {
      if (ev.target.closest("[data-close]")) dlgKalenderAdmin.close();
    });
  }

  // ideen-backlog.md #24: Suche
  if (elSearchBtn && dlgSearch) {
    elSearchBtn.addEventListener("click", () => {
      elSearchInput.value = "";
      renderSearchResults("");
      dlgSearch.showModal();
      elSearchInput.focus();
    });
    elSearchInput.addEventListener("input", () => renderSearchResults(elSearchInput.value));
    elSearchResults.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-action='search-jump']");
      if (!btn) return;
      dlgSearch.close();
      openCardById(btn.dataset.card);
    });
    dlgSearch.addEventListener("click", (ev) => {
      if (ev.target.closest("[data-close]")) dlgSearch.close();
    });
  }

  render();

  if (!configured) {
    elNotice.innerHTML =
      "<b>Die App ist noch nicht mit Supabase verbunden.</b><br>" +
      "In <code>config.js</code> müssen die Projekt-URL und der anon/publishable Key " +
      "eingetragen werden — siehe README bzw. COWORK-AUFTRAG im Projektordner.";
    elNotice.hidden = false;
    return;
  }

  await refreshLoginPflicht();
  await loadClasses();
  adminCode = classLocked ? "" : (localStorage.getItem(ADMIN_CODE_KEY) || "");
  // Nutzerwunsch 20.09.2026 (Schalter 21.09.2026): Bei eingeschalteter
  // Anmeldung kein Inhalt ohne Anmeldung. Geräte, die schon
  // auf eine Klasse festgelegt sind oder Admin-Rechte haben, bleiben
  // angemeldet und sehen die Anmeldung nie. Alle anderen (z. B. wer den
  // Hauptlink bekommen hat) melden sich einmal an und landen in ihrem Bereich.
  if (loginPflicht && !isLoggedIn()) {
    await askLogin();
    renderClassSelect();
    syncClassInUrl();
    render();
  }
  beginVisit();
  reload();
  refreshFeedbackBadge();

  // Alle 60 s still aktualisieren (nur wenn sichtbar und kein Dialog offen)
  setInterval(() => {
    if (document.visibilityState !== "visible") return;
    rememberVisitEnd();
    if (!anyDialogOpen() && pollEditing.size === 0) { reload({ silent: true }); refreshFeedbackBadge(); }
  }, 60000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      rememberVisitEnd();
      return;
    }
    if (beginVisit() && loaded) render();
    if (loaded && !anyDialogOpen()) reload({ silent: true });
  });
  window.addEventListener("pagehide", rememberVisitEnd);
}

init();

})();
