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

// Die drei Bubbles über der Fußleiste auf der Startseite (siehe
// renderBubbles) — "Beteiligung" bündelt Umfrage/Liste/Tabelle, weil bei
// allen dreien Eltern aktiv etwas eintragen/ankreuzen statt nur zu lesen.
// Jede Karte behält ihren echten Typ für Badge/Farbe/Erstellen-Dialog
// (siehe TYPE_LABELS). Hinweis hat keine Bubble — läuft übers Karussell.
const BUBBLE_ORDER = ["termin", "beteiligung", "datei"];
const RUBRIK_LABEL = { termin: "Termin", beteiligung: "Beteiligung", datei: "Datei" };
const RUBRIK_LABEL_PLURAL = { termin: "Termine", beteiligung: "Beteiligungen", datei: "Dateien" };

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
};

// Icons je Bubble (siehe BUBBLE_ORDER) — "Beteiligung" bündelt drei echte
// Kartentypen (Umfrage/Liste/Tabelle) unter einem gemeinsamen Icon.
const RUBRIK_ICON = { termin: ICONS.termin, beteiligung: ICONS.beteiligung, datei: ICONS.datei };

/* ---------- Versionshinweise ---------- */

// Neueste zuerst. Für jedes Update ein Eintrag mit Datum und kurzen,
// elternfreundlichen Stichpunkten — erscheint einmalig automatisch, wenn
// sich seit dem letzten Besuch etwas geändert hat (siehe checkForNewVersion).
const VERSIONS = [
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
// Ordner-Unterseite (Rubrik "Datei", siehe renderFolderView): undefined =
// Ordner-Raster, "" = Inhalt von "Ohne Ordner", sonst eine Ordner-Id.
let openFolderId;
// Welcher Termin-Streifen gerade aufgeklappt ist (siehe renderTermineView)
// — null/undefined = keiner.
let openTerminId;
// Dasselbe fürs Archiv (siehe renderArchivView) — eigener Zustand, weil
// beide Ansichten unabhängig voneinander offen/zu sein können.
let openArchivId;

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
// Merkt sich den zuletzt eingetragenen Ersteller-Namen als Vorschlag für die
// nächste neue Karte (Lehrkraft/Elternsprecher legen meist mehrere Karten
// hintereinander an und müssten sonst jedes Mal neu tippen).
const CREATOR_NAME_KEY = "pinnwand_ersteller_name";
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

const pollEditing = new Set();   // Karten-IDs, bei denen gerade Optionen gewählt werden
let editorState = null;          // { mode: 'create'|'edit', type, card, items }
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
const elFab = $("fab");
const elDashBubbles = $("dashBubbles");
const elMain = document.querySelector("main");
const elScrollTopBtn = $("scrollTopBtn");
const elClassSelect = $("classSelect");
const elBrandTitle = $("brandTitle");
const elViewTabs = $("viewTabs");
const dlgType = $("dlgType");
const dlgEditor = $("dlgEditor");
const dlgConfirm = $("dlgConfirm");
const dlgPrompt = $("dlgPrompt");
const dlgVersion = $("dlgVersion");
const elVersionBtn = $("versionBtn");

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

function fmtTime(t) {
  return t ? `${t.slice(0, 5)} Uhr` : "";
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
// ganztägig (Ende exklusiv, also der Folgetag). Mit Uhrzeit: 1 Stunde Dauer.
function eventRange(c) {
  const [y, m, d] = c.event_date.split("-").map(Number);
  if (c.event_time) {
    const [hh, mm] = c.event_time.slice(0, 5).split(":").map(Number);
    const start = new Date(y, m - 1, d, hh, mm);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
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
function toast(msg, isError = false) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.toggle("error", isError);
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, isError ? 6000 : 3000);
}

function anyDialogOpen() {
  return [dlgType, dlgEditor, dlgConfirm, dlgPrompt, dlgVersion].some((d) => d.open);
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

async function loadClasses() {
  try {
    classesList = await fetchClasses();
  } catch {
    classesList = [];
  }
  applyClassLink();
  renderClassSelect();
}

// Klassen-Link auswerten: "?klasse=<slug>" setzt einmalig die passende
// Klasse fest und sperrt sie dauerhaft für dieses Gerät (siehe Kommentar
// bei CLASS_LOCK_KEY oben). Der Parameter wird danach aus der Adresszeile
// entfernt, die Sperre bleibt trotzdem bestehen (per localStorage).
function applyClassLink() {
  const slug = new URLSearchParams(location.search).get("klasse");
  if (slug) {
    const cls = classesList.find((c) => c.slug === slug);
    if (cls) {
      activeClassId = cls.id;
      classLocked = true;
      localStorage.setItem(CLASS_KEY, activeClassId);
      localStorage.setItem(CLASS_LOCK_KEY, "1");
      localStorage.setItem(CLASS_SLUG_KEY, slug);
      applyClassTheme(slug);
    }
    history.replaceState(null, "", location.pathname + location.hash);
  }
}

// Kachel-/Kartenfilter je nach gewählter Klasse: eigene Klasse + "Gemeinsam"
// (class_id null) sind sichtbar, die jeweils andere Klasse wird ausgeblendet.
// Bei "Beide Klassen" (activeClassId === "") ist alles sichtbar.
function inActiveClass(c) {
  return !activeClassId || c.class_id === activeClassId || !c.class_id;
}

function renderClassSelect() {
  if (!elClassSelect) return;
  if (classLocked) {
    const cls = classesList.find((c) => c.id === activeClassId);
    elClassSelect.innerHTML = cls
      ? `<option value="${cls.id}">${CLASS_ICON[cls.slug] || ""} ${esc(cls.name)}</option>`
      : `<option value="">Beide Klassen</option>`;
    elClassSelect.value = activeClassId;
    elClassSelect.disabled = true;
    elClassSelect.title = "Über einen eigenen Link für diese Klasse geöffnet.";
    updateBrandTitle();
    return;
  }
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

async function rpc(name, args = {}) {
  const res = await fetch(`${REST()}/rpc/${name}`, {
    method: "POST",
    headers: { ...AUTH(), "Content-Type": "application/json" },
    body: JSON.stringify(args),
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

async function reload({ silent = false } = {}) {
  try {
    // Scheitert das Ordner-Laden (z. B. Migration noch nicht eingespielt),
    // soll das die Karten selbst nicht mit blockieren.
    const [cardsData, foldersData] = await Promise.all([
      fetchCards(), fetchFolders().catch(() => foldersList),
    ]);
    cards = cardsData;
    foldersList = foldersData;
    loaded = true;
    elNotice.hidden = true;
    render();
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
  const sub = [fmtTime(c.event_time), c.event_location ? esc(c.event_location) : ""]
    .filter(Boolean).join(" · ");
  const rel = inTrash ? "" : relativeDay(c.event_date);
  const calActions = inTrash ? "" : `
    <div class="cal-actions">
      <button class="btn small ghost" data-action="ics-download" data-card="${c.id}">${ICONS.termin}<span>In Kalender speichern</span></button>
      <a class="btn small link" href="${googleCalUrl(c)}" target="_blank" rel="noopener noreferrer">Google Kalender</a>
    </div>`;
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
  // (Beschreibung / Name-oder-Aktion / X), egal ob vorgegeben oder frei hinzugefügt.
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
      rows += `
        <li>
          <span class="grow">${esc(it.text)}</span>
          <span class="who">${esc(it.filled_by || "")}</span>
          <button class="icon-btn" data-action="item-delete" data-item="${it.id}" title="Eintrag löschen">✕</button>
        </li>`;
    }
  }
  const open = items.filter((i) => i.preset && !i.filled_by).length;
  const note = open ? `<div class="progress-note">${open} ${open === 1 ? "Platz" : "Plätze"} noch frei</div>` : "";
  return `
    <ul class="items eintragen">${rows}</ul>${note}
    <button class="btn link" data-action="entry-add" data-card="${c.id}">+ Eintrag hinzufügen</button>`;
}

function renderTabelle(c) {
  const cols = c.table_columns || [];
  const rows = c.table_rows || [];
  const thead = `<tr>${cols.map((col) => `<th>${esc(col)}</th>`).join("")}<th class="col-del"></th></tr>`;
  const tbody = rows.map((r) => {
    const vals = r.cell_values || [];
    const cells = cols.map((_, i) => `
      <td><input type="text" maxlength="200" data-action="cell-edit" data-row="${r.id}" data-col="${i}" value="${esc(vals[i] ?? "")}"></td>`).join("");
    return `<tr>${cells}<td class="col-del"><button class="icon-btn" data-action="row-delete" data-row="${r.id}" title="Zeile löschen">✕</button></td></tr>`;
  }).join("");
  const empty = rows.length ? "" : `<p class="progress-note">Noch keine Zeilen.</p>`;
  return `
    <div class="table-wrap">
      <table class="data-table">
        <thead>${thead}</thead>
        <tbody>${tbody}</tbody>
      </table>
    </div>
    ${empty}
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
              <input type="${inputType}" name="poll-${c.id}" value="${o.id}" ${myVotes.has(o.id) ? "checked" : ""}>
              <span class="grow">${esc(o.label)}</span>
            </label>
          </div>
        </div>`;
    }
    html += `</div>
      <div class="poll-foot">
        <button class="btn small primary" data-action="vote-submit" data-card="${c.id}">Abstimmen</button>
        ${myVotes.size ? `<button class="btn link" data-action="vote-retract" data-card="${c.id}">Stimme zurückziehen</button>` : ""}
        <span>${c.multi_select ? "Mehrfachauswahl möglich" : "Eine Option wählbar"} · ${voters} ${voters === 1 ? "Stimme" : "Stimmen"}</span>
      </div>`;
    return html;
  }

  for (const o of opts) {
    const n = (o.poll_votes || []).length;
    const pct = totalVotes ? Math.round((n / totalVotes) * 100) : 0;
    html += `
      <div class="poll-opt">
        <div class="bar" style="width:${pct}%"></div>
        <div class="row">
          <span class="grow">${esc(o.label)}${myVotes.has(o.id) ? ` <span class="mine">✓</span>` : ""}</span>
          <span class="count">${n} · ${pct} %</span>
        </div>
      </div>`;
  }
  html += `</div>
    <div class="poll-foot">
      <button class="btn link" data-action="vote-edit" data-card="${c.id}">Stimme ändern</button>
      <span>${voters} ${voters === 1 ? "Stimme" : "Stimmen"} abgegeben</span>
    </div>`;
  return html;
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
    html += `
      <a class="file-row" href="${url}" target="_blank" rel="noopener noreferrer">
        <span class="file-icon">${f.mime_type === "application/pdf" ? ICONS.datei : ICONS.image}</span>
        <span><b>${esc(f.filename)}</b><span>${fmtSize(f.size_bytes)}</span></span>
      </a>`;
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
  for (const f of extra) {
    const url = fileUrl(f.storage_path);
    html += `
      <a class="file-row" href="${url}" target="_blank" rel="noopener noreferrer">
        <span class="file-icon">${f.mime_type === "application/pdf" ? ICONS.datei : ICONS.image}</span>
        <span><b>${esc(f.filename)}</b><span>${fmtSize(f.size_bytes)}</span></span>
      </a>`;
  }
  return html + `</div>`;
}

// Kennzeichen + Erledigt-Knopf für eine als Aufgabe markierte Karte
// (Hinweis/Umfrage/Liste/Tabelle, siehe is_aufgabe) — erscheint überall,
// wo die Karte gerendert wird, nicht nur im Dashboard.
function aufgabeBlockHtml(c) {
  if (!c.is_aufgabe) return "";
  const done = isAufgabeErledigt(c.id);
  return `
    <div class="card-aufgabe ${done ? "done" : ""}">
      ${done ? ICONS.check : ICONS.warning}
      <span>${done ? "Für dich erledigt" : "Aufgabe"}</span>
      ${done ? "" : `<button type="button" class="btn small" data-action="aufgabe-done" data-card="${c.id}">Erledigt</button>`}
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
    // "Verschieben" nur bei Datei-Karten mit Klassenbezug — gemeinsame
    // Dateien (beide Klassen) können ohnehin keinem Ordner zugeordnet
    // werden (siehe update_card).
    const moveBtn = (c.type === "datei" && c.class_id)
      ? `<button data-action="move-file" data-card="${c.id}">In Ordner verschieben</button>` : "";
    // Manuelles Übersteuern der Archiv-Zugehörigkeit (siehe isArchived,
    // Migration 015) — unabhängig vom Kartentyp und vom Datum.
    const archiveBtn = isArchived(c)
      ? `<button data-action="unarchive-card" data-card="${c.id}">Aus Archiv zurückholen</button>`
      : `<button data-action="archive-card" data-card="${c.id}">In Archiv verschieben</button>`;
    menu = `
      <button data-action="edit" data-card="${c.id}">Bearbeiten</button>
      ${moveBtn}
      <button data-action="pin" data-card="${c.id}">${c.pinned ? "Nicht mehr anpinnen" : "Oben anpinnen"}</button>
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

  const trashNote = inTrash
    ? `<p class="trash-note">Wird am ${purgeDate(c).toLocaleDateString("de-DE",
        { day: "numeric", month: "long", year: "numeric" })} endgültig gelöscht.</p>`
    : "";

  const endNote = (c.end_date && !inTrash)
    ? ` · Endet am ${esc(fmtDateLong(c.end_date))}` : "";
  const creatorNote = c.creator_name ? ` · von ${esc(c.creator_name)}` : "";
  // Nur wenn seit dem Anlegen tatsächlich einmal etwas bearbeitet wurde
  // (siehe update_card in migration-013) — keine rückwirkenden Angaben bei
  // unveränderten Karten.
  const editedNote = c.updated_at
    ? `<div class="card-meta">Zuletzt geändert: ${fmtTimestamp(c.updated_at)}${c.last_edited_by ? ` · von ${esc(c.last_edited_by)}` : ""}</div>`
    : "";

  return `
    <article class="card ${c.pinned && !inTrash ? "pinned" : ""} ${inTrash ? "trashed" : ""} ${opts && opts.nested ? "nested" : ""}" data-card="${c.id}">
      <div class="card-top">
        <span class="type-badge ${c.type}">${TYPE_LABELS[c.type]}</span>
        ${c.pinned && !inTrash ? `<span class="pin-flag">${ICONS.pin}Angepinnt</span>` : ""}
        ${!inTrash ? classChipHtml(c) : ""}
        <span class="spacer"></span>
        ${classLocked ? "" : `
        <details class="menu">
          <summary title="Aktionen">${ICONS.menu}</summary>
          <div class="menu-list">${menu}</div>
        </details>`}
      </div>
      <h3>${esc(c.title)}</h3>
      ${c.parent_id ? linkedBackChipHtml(c) : ""}
      ${trashNote}
      ${body}
      <div class="card-meta">Erstellt am ${fmtTimestamp(c.created_at)}${creatorNote}${endNote}</div>
      ${editedNote}
      ${aufgabeBlockHtml(c)}
    </article>`;
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

// Aufklappbarer Bereich mit den an einen Termin verknüpften Karten (z. B.
// Liste/Umfrage/Hinweis zu einem Elternabend). Nur für Termine relevant.
// Verknüpfte Karten werden bewusst nur eine Ebene tief gerendert (siehe
// Aufruf oben mit opts.nested), damit eine versehentliche Ringverknüpfung
// (Termin A ↔ Termin B) nicht zu endloser Verschachtelung führt.
function renderLinkedSection(c, inTrash) {
  if (c.type !== "termin" || inTrash) return "";
  const linked = cards.filter((x) => x.parent_id === c.id && !x.trashed_at);
  const addBtn = classLocked ? "" :
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

/* ---------- Gruppierte Übersicht (Pinnwand) ---------- */

// Kurze Kennzahlen-Zeile über den Kategorien, nur wenn es etwas zu zeigen gibt.
function statsLineHtml(list) {
  const from = todayStart();
  const to = new Date(from);
  to.setDate(to.getDate() + 7);
  const upcoming = list.filter((c) => c.type === "termin" && c.event_date
    && parseISODate(c.event_date) >= from && parseISODate(c.event_date) <= to).length;
  const openLists = list.filter((c) => c.type === "liste"
    && (c.list_items || []).some((i) => i.preset && !i.filled_by)).length;

  const parts = [];
  if (upcoming) parts.push(`${upcoming} ${upcoming === 1 ? "Termin" : "Termine"} in den nächsten 7 Tagen`);
  if (openLists) parts.push(`${openLists} ${openLists === 1 ? "Liste" : "Listen"} mit offenen Plätzen`);
  return parts.length ? `<p class="stats-line">${parts.join(" · ")}</p>` : "";
}

// Kompakte Chat-Bubble für eine Kurznachricht (Hinweis mit is_kurznachricht)
// — bewusst ohne "Anpinnen" (in einem kleinen Chat-Feed ohne klare
// Bedeutung) und ohne die große Kartenumrandung normaler Hinweise.
function renderKurznachricht(c) {
  const menu = `
    <button data-action="edit" data-card="${c.id}">Bearbeiten</button>
    <button class="danger" data-action="trash" data-card="${c.id}">Löschen</button>`;
  const creatorNote = c.creator_name ? ` · ${esc(c.creator_name)}` : "";
  return `
    <article class="kurz-bubble" data-card="${c.id}">
      <div class="kurz-bubble-head">
        <b>${esc(c.title)}</b>
        <span class="spacer"></span>
        ${classLocked ? "" : `
        <details class="menu">
          <summary title="Aktionen">${ICONS.menu}</summary>
          <div class="menu-list">${menu}</div>
        </details>`}
      </div>
      ${c.body ? `<div class="kurz-bubble-body rich">${sanitizeRich(c.body)}</div>` : ""}
      ${renderHinweisAttachments(c)}
      <div class="kurz-bubble-meta">${fmtTimestamp(c.created_at)}${creatorNote}</div>
      ${aufgabeBlockHtml(c)}
    </article>`;
}

/* ---------- Startseite (Dashboard) ---------- */

// list: alle sichtbaren, nicht archivierten Karten der aktiven Klasse.
// Die drei Bubbles laufen NICHT hier mit rein — die sitzen fest in
// #dashBubbles über der Fußleiste, siehe render().
function renderStart(list) {
  const hinweise = list.filter((c) => c.type === "hinweis");
  const termine = list.filter((c) => c.type === "termin");

  return statsLineHtml(list)
    + renderHinweisCarousel(hinweise)
    + renderNaechsterTermin(termine)
    + renderOffeneAufgaben(list);
}

// Wischbares Karussell: eine Hinweis-Karte je Bildschirmbreite, Punkte
// darunter zeigen Position/Anzahl. Kurznachrichten laufen kompakt (siehe
// renderKurznachricht), normale Hinweise als volle Karte.
function renderHinweisCarousel(hinweise) {
  if (!hinweise.length) {
    return `<p class="rubrik-panel-empty">Noch keine Hinweise.</p>`;
  }
  const slides = hinweise.map((c) =>
    `<div class="hinweis-slide">${c.is_kurznachricht ? renderKurznachricht(c) : renderCard(c)}</div>`).join("");
  const dots = hinweise.length > 1
    ? `<div class="hinweis-dots">${hinweise.map((_, i) =>
        `<span class="hinweis-dot ${i === 0 ? "active" : ""}"></span>`).join("")}</div>`
    : "";
  return `<div class="hinweis-carousel" id="hinweisCarousel">${slides}</div>${dots}`;
}

// Farbig hervorgehobene Zeile für den zeitlich nächsten Termin — Antippen
// führt zur Termin-Rubrik mit genau diesem Termin aufgeklappt.
function renderNaechsterTermin(termine) {
  if (!termine.length) return "";
  const next = [...termine].sort((a, b) => String(a.event_date).localeCompare(String(b.event_date)))[0];
  const d = parseISODate(next.event_date);
  return `
    <div class="dash-section-label">Nächster Termin</div>
    <button class="naechster-termin" data-action="open-rubrik" data-type="termin" data-card="${next.id}">
      <span class="naechster-termin-date"><b>${d.getDate()}</b><span>${MONTH_SHORT[d.getMonth()]}</span></span>
      <span class="naechster-termin-text">
        <span class="naechster-termin-title">${esc(next.title)}</span>
        <span class="naechster-termin-time">${next.event_time ? esc(fmtTime(next.event_time)) + " Uhr" : ""}</span>
      </span>
    </button>`;
}

// Karten mit is_aufgabe, die auf diesem Gerät noch nicht erledigt sind
// (siehe AUFGABEN_ERLEDIGT_KEY). Bleibt bewusst dauerhaft auf dem
// Dashboard sichtbar, auch ohne offene Aufgabe — mit ruhigem Leerzustand
// statt ganz zu verschwinden, damit die Rubrik als fester Anlaufpunkt
// erkennbar bleibt.
function renderOffeneAufgaben(list) {
  const open = list.filter((c) => c.is_aufgabe && !isAufgabeErledigt(c.id));
  if (!open.length) {
    return `
      <div class="dash-section-label">Aufgaben</div>
      <div class="aufgaben-list-empty">${ICONS.check} Keine offenen Aufgaben</div>`;
  }
  const cardsHtml = open.map((c) => `
    <div class="aufgabe-card">
      <div class="aufgabe-card-title">${esc(c.title)}</div>
      <div class="aufgabe-card-sub">${TYPE_LABELS[c.type]}${c.creator_name ? " · " + esc(c.creator_name) : ""}</div>
      <button type="button" class="btn small" data-action="aufgabe-done" data-card="${c.id}">Für mich erledigt</button>
    </div>`).join("");
  return `
    <div class="dash-section-label warn">${open.length === 1 ? "Offene Aufgabe" : "Offene Aufgaben"} ${ICONS.warning}</div>
    <div class="aufgaben-list">${cardsHtml}</div>`;
}

// Drei Bubbles, Zugang zu den vollen Rubrik-Ansichten (Termin/Beteiligung/
// Datei). Hinweis hat keine eigene, die läuft ja schon oben als Karussell.
// Wird in #dashBubbles gerendert (fest über der Fußleiste), nicht in den
// scrollbaren Feed — siehe render().
function renderBubbles(groups) {
  const bubbles = BUBBLE_ORDER.map((r) => {
    const items = groups[r] || [];
    return `
      <button class="dash-bubble" data-action="open-rubrik" data-type="${r}">
        <span class="dash-bubble-icon type-${r}">
          ${items.length ? `<span class="count-badge">${items.length}</span>` : ""}
          ${RUBRIK_ICON[r]}
        </span>
        <span class="dash-bubble-label">${RUBRIK_LABEL[r]}</span>
      </button>`;
  }).join("");
  return `<div class="dash-bubbles">${bubbles}</div>`;
}

/* ---------- Termin-Rubrik (Akkordeon-Streifen + Zeitstrahl) ---------- */

const TERMIN_ZEITSTRAHL = [
  { label: "Diese Woche", max: 6 },
  { label: "In 2 Wochen", max: 13 },
  { label: "In 3 Wochen", max: 20 },
  { label: "Später", max: Infinity },
];

function renderTermineView(termine) {
  const head = `
    <div class="dateien-head">
      <button class="btn ghost back-btn" data-action="start-back">${ICONS.arrowLeft}Start</button>
    </div>`;
  if (!termine.length) {
    return head + `<p class="rubrik-panel-empty">Noch keine Termine.</p>`;
  }

  const from = todayStart();
  const buckets = TERMIN_ZEITSTRAHL.map((b) => ({ ...b, items: [] }));
  for (const c of termine) {
    const days = Math.round((parseISODate(c.event_date) - from) / 86400000);
    (buckets.find((b) => days <= b.max) || buckets[buckets.length - 1]).items.push(c);
  }

  const groupsHtml = buckets.filter((b) => b.items.length).map((b) => `
    <div class="termine-timeline-group">
      <div class="termine-timeline-col"><span>${esc(b.label)}</span></div>
      <div class="termine-timeline-strips">${b.items.map(renderTerminStrip).join("")}</div>
    </div>`).join("");

  return head + groupsHtml;
}

// Wiederverwendbarer Akkordeon-Streifen: Kopfzeile mit Titel/Untertitel/
// Datum, antippen klappt die volle Karte darunter auf. Genutzt von der
// Termin-Rubrik (renderTerminStrip) und vom Archiv (renderArchivStrip).
function renderAccordionStrip(c, { isOpen, action, dateLabel, sub }) {
  return `
    <div class="acc-strip ${esc(c.type)} ${isOpen ? "open" : ""}">
      <button class="acc-strip-head" data-action="${action}" data-card="${c.id}">
        <span class="acc-strip-title-wrap">
          <span class="acc-strip-title">${esc(c.title)}</span>
          <span class="acc-strip-sub">${esc(sub)}</span>
        </span>
        <span class="acc-strip-date">
          <span>${esc(dateLabel)}</span>
          ${ICONS.chevron}
        </span>
      </button>
      ${isOpen ? `<div class="acc-strip-body">${renderCard(c)}</div>` : ""}
    </div>`;
}

function renderTerminStrip(c) {
  const d = parseISODate(c.event_date);
  return renderAccordionStrip(c, {
    isOpen: c.id === openTerminId,
    action: "toggle-termin-strip",
    dateLabel: `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.`,
    sub: c.creator_name || "",
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

function renderBeteiligungView(items) {
  const head = `
    <div class="dateien-head">
      <button class="btn ghost back-btn" data-action="start-back">${ICONS.arrowLeft}Start</button>
    </div>`;
  return head + `<div class="group-body">${items.length
    ? items.map(renderCard).join("")
    : `<p class="rubrik-panel-empty">Noch keine Beteiligung.</p>`}</div>`;
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
        <button class="folder-tile" data-action="open-folder" data-folder="${esc(key)}">
          ${newCount ? `<span class="count-badge">${newCount}</span>` : ""}
          <span class="folder-tile-icon">${ICONS.folder}</span>
          <span class="folder-tile-label">${esc(name)}</span>
          <span class="folder-tile-count">${items.length} ${items.length === 1 ? "Datei" : "Dateien"}</span>
        </button>`;
    };
    const foldersHere = foldersList.filter((f) => !activeClassId || f.class_id === activeClassId);
    const tiles = foldersHere.map((f) => folderTile(f.id, f.name)).join("")
      + folderTile("", "Ohne Ordner")
      + (classLocked ? "" : `
        <button class="folder-tile folder-tile-new" data-action="create-folder">
          <span class="folder-tile-icon">+</span>
          <span class="folder-tile-label">Neuer Ordner</span>
        </button>`);
    return backHead("Start", "dateien-back") + `<div class="folder-grid">${tiles}</div>`;
  }

  const items = dateiCards.filter((c) => (c.folder_id || "") === openFolderId);
  const folder = foldersList.find((f) => f.id === openFolderId);
  markFolderSeen(openFolderId);
  const manage = (!classLocked && folder) ? `
    <button class="btn small" data-action="rename-folder" data-folder="${folder.id}">Umbenennen</button>
    <button class="btn small danger" data-action="delete-folder" data-folder="${folder.id}">Löschen</button>` : "";
  return backHead("Ordner", "open-folder-grid", manage)
    + `<h2 class="group-label" style="margin:4px 2px 12px">${esc(folder ? folder.name : "Ohne Ordner")}</h2>`
    + `<div class="group-body">${items.length
        ? items.map(renderCard).join("")
        : `<p class="rubrik-panel-empty">Noch keine Datei in diesem Ordner.</p>`}</div>`;
}

const EMPTY_TEXT = {
  feed: "Noch nichts an der Pinnwand. Mit dem +-Knopf unten geht's los.",
  archiv: "Noch nichts im Archiv.",
  papierkorb: "Der Papierkorb ist leer.",
};

// Views mit eigener Leer-Anzeige (Karussell/Kacheln zeigen ihren
// Leer-Zustand selbst) — der generische Hinweistext ist dort überflüssig.
const EIGENE_LEER_ANZEIGE = new Set(["feed", "dateien", "termine", "beteiligung"]);

// Ab wie viel Scroll-Distanz der "Nach oben"-Button erscheint — bewusst
// höher als eine Bildschirmhöhe, damit er nicht schon nach kurzem Scrollen
// auftaucht, sondern nur wenn man wirklich weiter unten ist.
const SCROLL_TOP_THRESHOLD = 600;

function updateScrollTopButton() {
  if (!elScrollTopBtn) return;
  const show = EIGENE_LEER_ANZEIGE.has(view) && window.scrollY > SCROLL_TOP_THRESHOLD;
  elScrollTopBtn.hidden = !show;
}

// Merkt sich beim Neu-Rendern (z. B. stille 60-Sekunden-Aktualisierung),
// welche Hinweis-Karte im Karussell gerade zu sehen war, damit es nicht
// unter den Fingern zu Slide 1 zurückspringt.
let hinweisCarouselIndex = 0;

function wireHinweisCarousel() {
  const el = $("hinweisCarousel");
  if (!el) return;
  const slideCount = el.children.length;
  if (hinweisCarouselIndex >= slideCount) hinweisCarouselIndex = 0;
  el.scrollLeft = hinweisCarouselIndex * el.clientWidth;
  const dots = elFeed.querySelectorAll(".hinweis-dot");
  let ticking = false;
  el.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const w = el.clientWidth || 1;
      hinweisCarouselIndex = Math.round(el.scrollLeft / w);
      dots.forEach((d, i) => d.classList.toggle("active", i === hinweisCarouselIndex));
      ticking = false;
    });
  }, { passive: true });
}

function render() {
  document.querySelectorAll("#viewTabs button").forEach((b) =>
    b.classList.toggle("active", b.dataset.view === view));
  elFab.style.display = view === "feed" && configured && !classLocked ? "" : "none";
  updateScrollTopButton();

  if (!loaded) return;
  const list = visibleCards();

  elMain.classList.toggle("has-dash-bubbles", view === "feed");
  elDashBubbles.hidden = view !== "feed";

  if (view === "feed") {
    elFeed.innerHTML = renderStart(list);
    wireHinweisCarousel();
    elDashBubbles.innerHTML = renderBubbles({
      termin: list.filter((c) => c.type === "termin"),
      beteiligung: list.filter((c) => c.type === "umfrage" || c.type === "liste" || c.type === "tabelle"),
      datei: list.filter((c) => c.type === "datei"),
    });
  } else if (view === "termine") {
    elFeed.innerHTML = renderTermineView(list.filter((c) => c.type === "termin"));
  } else if (view === "beteiligung") {
    elFeed.innerHTML = renderBeteiligungView(
      list.filter((c) => c.type === "umfrage" || c.type === "liste" || c.type === "tabelle"));
  } else if (view === "dateien") {
    elFeed.innerHTML = renderFolderView(list.filter((c) => c.type === "datei"));
  } else if (view === "papierkorb") {
    const toolbar = list.length && !classLocked
      ? `<div class="feed-toolbar">
           <button class="btn link danger" data-action="empty-trash">Papierkorb jetzt leeren</button>
         </div>`
      : "";
    elFeed.innerHTML = toolbar + list.map(renderCard).join("");
  } else {
    elFeed.innerHTML = renderArchivView(list);
  }

  elEmpty.textContent = EMPTY_TEXT[view] || "";
  elEmpty.hidden = EIGENE_LEER_ANZEIGE.has(view) ? true : list.length > 0;
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
// Löst mit einem Objekt { [name]: getrimmter Wert } auf, oder null bei Abbruch.
function promptDlg(title, fields) {
  return new Promise((resolve) => {
    $("promptTitle").textContent = title;
    const wrap = $("promptFields");
    wrap.innerHTML = fields.map((f, i) => fieldHtml(f.label || "", f.options
      ? `<select name="${esc(f.name)}" ${i === 0 ? "autofocus" : ""}>${f.options
          .map((o) => `<option value="${esc(o.value)}" ${o.value === f.value ? "selected" : ""}>${esc(o.label)}</option>`)
          .join("")}</select>`
      : `<input type="text" name="${esc(f.name)}" placeholder="${esc(f.placeholder || "")}"
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

// Ordner-Optionen für eine Datei-Karte, gefiltert auf die gewählte Klasse
// (Ordner gehören zu genau einer Klasse) — auch für den change-Listener auf
// dem Klasse-Feld in openEditor() genutzt, wenn die Klasse umgestellt wird.
function folderOptionsHtml(classId, selectedId) {
  const opts = foldersList
    .filter((f) => f.class_id === classId)
    .map((f) => `<option value="${f.id}" ${f.id === selectedId ? "selected" : ""}>${esc(f.name)}</option>`);
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
  }

  if (type === "liste" && card) {
    html += `<span class="field" style="margin-bottom:4px"><span style="font-size:.85rem;font-weight:600;color:var(--muted)">Einträge</span></span>
      <div class="edit-items" id="editItems"></div>
      <button type="button" class="btn small" id="editItemAdd">+ Eintrag hinzufügen</button>
      <p class="field-hint" style="margin-top:8px">Achtung: Häkchen bzw. Namen bleiben beim Umbenennen erhalten, beim Löschen eines Eintrags gehen sie verloren.</p>`;
  }

  if (type === "tabelle" && !card) {
    html += fieldHtml("Spalten (eine pro Zeile, z. B. Name, Bringt mit) * — max. 6",
      `<textarea name="table_columns" required placeholder="Name&#10;Bringt mit&#10;Uhrzeit"></textarea>`);
    html += `<p class="field-hint">Nach dem Anlegen tragen alle direkt in die Tabelle ein — die Spalten selbst lassen sich danach nicht mehr ändern.</p>`;
  }

  if (type === "umfrage" && !card) {
    html += fieldHtml("Optionen (eine pro Zeile, mindestens 2) *",
      `<textarea name="options" required placeholder="Montag&#10;Dienstag&#10;…"></textarea>`);
    html += `
      <label class="field-check">
        <input type="checkbox" name="multi_select">
        <span>Mehrfachauswahl erlauben</span>
      </label>`;
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
    if (!currentClassId) {
      html += `<p class="field-hint">Gemeinsame Dateien (beide Klassen) können aktuell keinem Ordner zugeordnet werden.</p>`;
    }
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

  return html;
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
        <button type="button" class="icon-btn" data-remove="${idx}" title="Option löschen">✕</button>
      </div>`)
    .join("");
}

function openEditor(type, card = null, parentId = null) {
  editorState = {
    mode: card ? "edit" : "create",
    type,
    card,
    parentId,   // nur beim Anlegen gesetzt: Termin, mit dem verknüpft wird
    items: card && type === "liste"
      ? (card.list_items || []).map((it) => ({ id: it.id, text: it.text, orig: it.text, deleted: false }))
      : [],
    options: card && type === "umfrage"
      ? (card.poll_options || []).map((o) => ({ id: o.id, label: o.label, orig: o.label, deleted: false }))
      : [],
    attachments: [],   // neu hochgeladene Anhänge dieser Sitzung (Hinweis/Termin)
  };
  const parent = parentId ? cardById(parentId) : null;
  $("editorTitle").textContent =
    (card ? "Bearbeiten: " : "Neu: ") + TYPE_LABELS[type] +
    (parent ? ` (verknüpft mit „${parent.title}“)` : "");
  $("editorFields").innerHTML = editorFieldsHtml(type, card);
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
  el.textContent = msg;
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
        p.event_location = String(fd.get("event_location") || "").trim();
      }

      if (st.type === "liste") {
        p.list_mode = String(fd.get("list_mode") || "abhaken");
        p.items = String(fd.get("items") || "")
          .split("\n").map((s) => s.trim()).filter(Boolean)
          .map((text) => ({ text }));
      }

      if (st.type === "tabelle") {
        p.table_columns = String(fd.get("table_columns") || "")
          .split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 6);
        if (p.table_columns.length < 1) return editorFail("Bitte mindestens eine Spalte angeben.");
      }

      if (st.type === "umfrage") {
        p.multi_select = fd.get("multi_select") === "on";
        p.options = String(fd.get("options") || "")
          .split("\n").map((s) => s.trim()).filter(Boolean)
          .map((label) => ({ label }));
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

      await rpc("create_card", { p });
      toast("Karte erstellt.");
    } else {
      const p = { ...common };
      if (st.type === "termin") {
        p.event_date = String(fd.get("event_date") || "");
        if (!p.event_date) return editorFail("Bitte ein Datum wählen.");
        p.event_time = String(fd.get("event_time") || "");
        p.event_location = String(fd.get("event_location") || "").trim();
      }
      if ((st.type === "hinweis" || st.type === "termin") && st.attachments.length) {
        p.attachments = st.attachments;
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
            await rpc("add_poll_option", { p_card_id: st.card.id, p_label: label });
          }
        }
        for (const op of st.options) {
          const label = op.label.trim();
          if (op.id && !op.deleted && label && label !== op.orig) {
            await rpc("update_poll_option", { p_option_id: op.id, p_label: label });
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

async function doAction(fn, successMsg) {
  try {
    await fn();
    if (successMsg) toast(successMsg);
    await reload({ silent: true });
  } catch (err) {
    toast(err.message, true);
    await reload({ silent: true });
  }
}

// Aktionen, die nur über den Hauptlink (nicht per Klassen-Link) verfügbar
// sind — Karten anlegen/bearbeiten/löschen/anpinnen sowie Papierkorb-
// Aktionen. Zusätzlich zur Oberfläche (die diese Buttons bei classLocked
// gar nicht erst rendert) hier nochmal geprüft, falls doch mal ein Klick
// durchkommt (z. B. nach einem Reload mit veraltetem DOM-Zustand).
const ADMIN_NUR_HAUPTLINK = new Set([
  "edit", "pin", "trash", "restore", "delete-forever", "add-linked", "empty-trash",
  "create-folder", "rename-folder", "delete-folder", "move-file",
  "archive-card", "unarchive-card",
]);

async function handleFeedClick(ev) {
  const btn = ev.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  if (classLocked && ADMIN_NUR_HAUPTLINK.has(action)) return;
  const menu = btn.closest("details.menu");
  if (menu) menu.removeAttribute("open");

  if (action === "retry") return reload();

  const cardId = btn.dataset.card;
  const itemId = btn.dataset.item;

  switch (action) {
    case "edit": {
      const c = cardById(cardId);
      if (c) openEditor(c.type, c);
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
    case "move-file": {
      const c = cardById(cardId);
      if (!c) break;
      const opts = [{ value: "", label: "Ohne Ordner" }].concat(
        foldersList.filter((f) => f.class_id === c.class_id)
          .map((f) => ({ value: f.id, label: f.name })));
      const vals = await promptDlg("Datei verschieben",
        [{ name: "folder_id", label: "Ordner", value: c.folder_id || "", options: opts }]);
      if (!vals) break;
      // Reine Umsortierung, keine inhaltliche Bearbeitung — zählt bewusst
      // nicht als "Zuletzt geändert" (kein creator_name im Payload, siehe
      // update_card).
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
    case "add-linked": {
      pendingParentId = cardId;   // cardId zeigt hier auf den Termin
      dlgType.showModal();
      break;
    }
    case "jump-to-card": {
      // Kommt vom "zurück zum Termin"-Chip auf einer verknüpften Karte —
      // Ziel ist immer ein Termin (siehe linkedBackChipHtml).
      const target = cardById(cardId);
      if (!target) break;
      if (target.type === "termin") {
        view = "termine";
        openTerminId = target.id;
        render();
      }
      requestAnimationFrame(() => {
        const el = elFeed.querySelector(`.card[data-card="${CSS.escape(cardId)}"]`);
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("flash");
        setTimeout(() => el.classList.remove("flash"), 1600);
      });
      break;
    }
    // Die drei Bubbles auf der Startseite (Termin/Beteiligung/Datei) sowie
    // die "Nächster Termin"-Zeile (data-card mitgegeben, um genau diesen
    // Termin gleich aufgeklappt zu zeigen).
    case "open-rubrik": {
      const type = btn.dataset.type;
      if (type === "datei") {
        view = "dateien";
        openFolderId = undefined;
      } else if (type === "termin") {
        view = "termine";
        openTerminId = btn.dataset.card || null;
      } else if (type === "beteiligung") {
        view = "beteiligung";
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
    case "start-back": {
      view = "feed";
      render();
      break;
    }
    case "aufgabe-done": {
      setAufgabeErledigt(btn.dataset.card, true);
      render();
      break;
    }
    case "dateien-back": {
      view = "feed";
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
      if (!activeClassId) {
        toast("Bitte zuerst oben eine Klasse auswählen, für die der Ordner gilt.", true);
        break;
      }
      const vals = await promptDlg("Neuer Ordner", [
        { name: "name", label: "Ordnername", placeholder: "z. B. Elternabend Fotos", maxlength: 60 },
        { name: "creator_name", label: "Dein Name bzw. deine Funktion", placeholder: "z. B. Frau Müller, Lehrkraft",
          maxlength: 80, value: localStorage.getItem(CREATOR_NAME_KEY) || "" },
      ]);
      if (!vals) break;
      localStorage.setItem(CREATOR_NAME_KEY, vals.creator_name);
      await doAction(() => rpc("create_folder",
        { p_class_id: activeClassId, p_name: vals.name, p_creator_name: vals.creator_name }), "Ordner angelegt.");
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
      if (vals) await doAction(() => rpc("set_item_filled", { p_item_id: itemId, p_name: vals.name }), "Eingetragen — danke!");
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
        { p_card_id: cardId, p_text: vals.text, p_filled_by: vals.name }), "Eingetragen — danke!");
      break;
    }
    case "row-add": {
      try {
        await rpc("add_table_row", { p_card_id: cardId });
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
    case "vote-submit": {
      const chosen = [...elFeed.querySelectorAll(`input[name="poll-${CSS.escape(cardId)}"]:checked`)]
        .map((i) => i.value);
      if (!chosen.length) { toast("Bitte zuerst eine Option auswählen.", true); break; }
      pollEditing.delete(cardId);
      await doAction(() => rpc("cast_vote",
        { p_card_id: cardId, p_option_ids: chosen, p_device_token: deviceToken }), "Stimme gespeichert.");
      break;
    }
  }
}

async function handleFeedChange(ev) {
  const box = ev.target.closest('input[data-action="item-check"]');
  if (box) {
    const wanted = box.checked;
    box.disabled = true;
    try {
      await rpc("set_item_checked", { p_item_id: box.dataset.item, p_checked: wanted });
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
}

// Beim Start prüfen, ob es seit dem letzten Besuch dieses Geräts eine neue
// Version gibt — falls ja, Punkt am Button und einmalig automatisch öffnen.
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
  openVersionDialog();
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
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      toast("Ohne Erlaubnis können keine Benachrichtigungen geschickt werden.", true);
      return;
    }
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(cfg.VAPID_PUBLIC_KEY),
    });
    await rpc("save_push_subscription", { p: sub.toJSON() });
    setBellState(true);
    toast("Benachrichtigungen aktiviert.");
  } catch (err) {
    toast(err.message || "Benachrichtigungen konnten nicht aktiviert werden.", true);
  } finally {
    elPushBell.disabled = false;
  }
}

/* ---------- Initialisierung ---------- */

async function init() {
  // Ansichten und Filter (feste Fußleiste, siehe .bottom-nav)
  elViewTabs.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-view]");
    if (!btn) return;
    view = btn.dataset.view;
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
  elDashBubbles.addEventListener("click", handleFeedClick);
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
  elFab.addEventListener("click", () => { pendingParentId = null; dlgType.showModal(); });

  if (elScrollTopBtn) {
    elScrollTopBtn.innerHTML = ICONS.arrowUp;
    elScrollTopBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    window.addEventListener("scroll", updateScrollTopButton, { passive: true });
  }
  dlgType.addEventListener("click", (ev) => {
    if (ev.target.closest("[data-close]")) { pendingParentId = null; return dlgType.close(); }
    const btn = ev.target.closest("[data-type]");
    if (!btn) return;
    const parentId = pendingParentId;
    pendingParentId = null;
    dlgType.close();
    openEditor(btn.dataset.type, null, parentId);
  });

  // Editor
  $("editorForm").addEventListener("submit", (ev) => {
    ev.preventDefault();
    submitEditor();
  });
  dlgEditor.addEventListener("click", (ev) => {
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
  }

  if (elVersionBtn) {
    renderVersionDialog();
    elVersionBtn.addEventListener("click", openVersionDialog);
    dlgVersion.addEventListener("click", (ev) => {
      if (ev.target.closest("[data-close]")) dlgVersion.close();
    });
    checkForNewVersion();
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

  await loadClasses();
  reload();

  // Alle 60 s still aktualisieren (nur wenn sichtbar und kein Dialog offen)
  setInterval(() => {
    if (document.visibilityState === "visible" && !anyDialogOpen() && pollEditing.size === 0) {
      reload({ silent: true });
    }
  }, 60000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && loaded && !anyDialogOpen()) {
      reload({ silent: true });
    }
  });
}

init();

})();
