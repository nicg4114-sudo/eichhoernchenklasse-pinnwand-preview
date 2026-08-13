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

// Pluralform für die Kachel-Unterzeile ("3 Termine", "1 Liste", ...).
const TYPE_LABELS_PLURAL = {
  hinweis: "Hinweise",
  termin: "Termine",
  liste: "Listen",
  tabelle: "Tabellen",
  umfrage: "Umfragen",
  datei: "Dateien",
};

// Reihenfolge der Abschnitte in der gruppierten Übersicht.
const TYPE_ORDER = ["hinweis", "termin", "liste", "tabelle", "umfrage", "datei"];

// Kleines, einheitliches Icon-Set (ersetzt Emojis für ein ruhigeres Bild).
const ICONS = {
  hinweis: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="10" cy="10" r="7.25"/><line x1="10" y1="9" x2="10" y2="14"/><circle cx="10" cy="6.3" r="0.9" fill="currentColor" stroke="none"/></svg>`,
  termin: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4.2" width="14" height="12" rx="2"/><line x1="3" y1="8" x2="17" y2="8"/><line x1="6.5" y1="2.5" x2="6.5" y2="5.5"/><line x1="13.5" y1="2.5" x2="13.5" y2="5.5"/></svg>`,
  liste: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3.2 5.5l1.3 1.3 2-2.3"/><line x1="8.5" y1="5.5" x2="17" y2="5.5"/><line x1="3.2" y1="10" x2="17" y2="10"/><line x1="3.2" y1="14.5" x2="17" y2="14.5"/></svg>`,
  tabelle: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3.5" width="14" height="13" rx="1.5"/><line x1="3" y1="8" x2="17" y2="8"/><line x1="3" y1="12.3" x2="17" y2="12.3"/><line x1="9.7" y1="3.5" x2="9.7" y2="16.5"/></svg>`,
  umfrage: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><line x1="5" y1="15.5" x2="5" y2="11"/><line x1="10" y1="15.5" x2="10" y2="6.5"/><line x1="15" y1="15.5" x2="15" y2="9"/></svg>`,
  datei: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 2.8h6l3 3v10.4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3.8a1 1 0 0 1 1-1z"/><path d="M12 2.8v3h3"/></svg>`,
  image: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3.5" width="14" height="13" rx="1.8"/><circle cx="7.3" cy="8" r="1.4"/><path d="M3.8 14.5l4-4.3 2.6 2.6 2.4-3 3.4 4.7"/></svg>`,
  link: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M8.3 11.7a3 3 0 0 0 4.5.3l1.8-1.8a3 3 0 0 0-4.3-4.3l-1 1"/><path d="M11.7 8.3a3 3 0 0 0-4.5-.3L5.4 9.8a3 3 0 0 0 4.3 4.3l1-1"/></svg>`,
  menu: `<svg viewBox="0 0 20 20" fill="currentColor"><circle cx="4.5" cy="10" r="1.6"/><circle cx="10" cy="10" r="1.6"/><circle cx="15.5" cy="10" r="1.6"/></svg>`,
  pin: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M10 17.5s6-5.6 6-10a6 6 0 1 0-12 0c0 4.4 6 10 6 10z"/><circle cx="10" cy="7.4" r="2.1"/></svg>`,
  chevron: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 4.5l6 5.5-6 5.5"/></svg>`,
  bell: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8a5 5 0 0 1 10 0c0 3.2 1 4.3 1.4 4.8H3.6C4 12.3 5 11.2 5 8z"/><path d="M8.2 15.5a1.8 1.8 0 0 0 3.5 0"/></svg>`,
};

/* ---------- Zustand ---------- */

let cards = [];
let view = "feed";        // dashboard | feed | archiv | papierkorb
let loaded = false;
let classesList = [];     // aus DB geladen: [{id, slug, name}, ...]

// Welche Klasse gerade "meine" ist — rein clientseitiger Anzeigefilter,
// kein echter Zugriffsschutz (der kommt später mit Einmal-Codes, siehe
// plan-mehrklassen-dashboard.md). "" = beide Klassen anzeigen.
const CLASS_KEY = "pinnwand_meine_klasse";
let activeClassId = localStorage.getItem(CLASS_KEY) || "";
const CLASS_ICON = { eichhoernchen: "🐿️", schmetterling: "🦋" };
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

// "Neu"-Markierungen und aufgeklappte Kategorien — rein geräteseitig
// (localStorage), keine Anmeldung nötig, genau wie deviceToken oben.
const SEEN_KEY = "pinnwand_gesehen";
const OPEN_KEY = "pinnwand_offene_kategorien";

function loadSeen() {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY)) || {}; }
  catch { return {}; }
}
function markSeen(type) {
  const seen = loadSeen();
  seen[type] = Date.now();
  localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
}

// Akkordeon: höchstens eine Rubrik gleichzeitig offen. undefined = noch nie
// manuell verändert -> Standard "erste Rubrik mit Inhalt offen". null =
// bewusst alles zugeklappt.
function loadOpenType() {
  const raw = localStorage.getItem(OPEN_KEY);
  if (raw === null) return undefined;
  try {
    const v = JSON.parse(raw);
    return typeof v === "string" || v === null ? v : undefined;
  } catch { return undefined; }
}
function saveOpenType(type) {
  localStorage.setItem(OPEN_KEY, JSON.stringify(type ?? null));
}

/* ---------- DOM-Kurzgriffe ---------- */

const $ = (id) => document.getElementById(id);
const elFeed = $("feed");
const elEmpty = $("empty");
const elNotice = $("notice");
const elFab = $("fab");
const elClassSelect = $("classSelect");
const elBrandTitle = $("brandTitle");
const dlgType = $("dlgType");
const dlgEditor = $("dlgEditor");
const dlgConfirm = $("dlgConfirm");
const dlgPrompt = $("dlgPrompt");

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
  return new Date(ts).toLocaleDateString("de-DE",
    { day: "numeric", month: "long", year: "numeric" });
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
  return [dlgType, dlgEditor, dlgConfirm, dlgPrompt].some((d) => d.open);
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

async function loadClasses() {
  try {
    classesList = await fetchClasses();
  } catch {
    classesList = [];
  }
  renderClassSelect();
}

// Kachel-/Kartenfilter je nach gewählter Klasse: eigene Klasse + "Gemeinsam"
// (class_id null) sind sichtbar, die jeweils andere Klasse wird ausgeblendet.
// Bei "Beide Klassen" (activeClassId === "") ist alles sichtbar.
function inActiveClass(c) {
  return !activeClassId || c.class_id === activeClassId || !c.class_id;
}

function renderClassSelect() {
  if (!elClassSelect) return;
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
    cards = await fetchCards();
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
      .filter((c) => !c.trashed_at && isExpired(c) && inActiveClass(c))
      .sort((a, b) => String(expiryDate(b)).localeCompare(String(expiryDate(a))));
  }
  if (view === "dashboard") {
    return cards
      .filter((c) => !c.trashed_at && !isExpired(c) && inActiveClass(c))
      .sort(dashboardSort);
  }
  return cards.filter((c) => !c.trashed_at && !isExpired(c) && inActiveClass(c));
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
    const pct = voters ? Math.round((n / voters) * 100) : 0;
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

function renderCard(c, opts) {
  const inTrash = !!c.trashed_at;
  let menu;
  if (inTrash) {
    menu = `
      <button data-action="restore" data-card="${c.id}">Wiederherstellen</button>
      <button class="danger" data-action="delete-forever" data-card="${c.id}">Endgültig löschen</button>`;
  } else {
    menu = `
      <button data-action="edit" data-card="${c.id}">Bearbeiten</button>
      <button data-action="pin" data-card="${c.id}">${c.pinned ? "Nicht mehr anpinnen" : "Oben anpinnen"}</button>
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

  return `
    <article class="card ${c.pinned && !inTrash ? "pinned" : ""} ${inTrash ? "trashed" : ""} ${opts && opts.nested ? "nested" : ""}" data-card="${c.id}">
      <div class="card-top">
        <span class="type-badge ${c.type}">${TYPE_LABELS[c.type]}</span>
        ${c.important && !inTrash ? `<span class="important-flag">★ Wichtig</span>` : ""}
        ${c.pinned && !inTrash ? `<span class="pin-flag">${ICONS.pin}Angepinnt</span>` : ""}
        ${!inTrash ? classChipHtml(c) : ""}
        <span class="spacer"></span>
        <details class="menu">
          <summary title="Aktionen">${ICONS.menu}</summary>
          <div class="menu-list">${menu}</div>
        </details>
      </div>
      <h3>${esc(c.title)}</h3>
      ${c.parent_id ? linkedBackChipHtml(c) : ""}
      ${trashNote}
      ${body}
      <div class="card-meta">Erstellt am ${fmtTimestamp(c.created_at)}${endNote}</div>
    </article>`;
}

// Kleiner Verweis-Chip auf einer verknüpften Karte, zurück zum Termin, an
// den sie angehängt wurde. Klick springt zur Termin-Karte (klappt deren
// Abschnitt in der Übersicht bei Bedarf zuerst auf).
// Kleiner Hinweis-Chip, welcher Klasse eine Karte gehört bzw. ob sie
// gemeinsam ist — nur relevant, wenn gerade "Beide Klassen" gewählt ist,
// bei gefiltertem Blick auf eine Klasse ist er überflüssig.
function classChipHtml(c) {
  if (activeClassId) return "";
  if (!c.class_id) return `<span class="class-chip shared">🏫 Gemeinsam</span>`;
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
  const addBtn = `<button type="button" class="btn small link" data-action="add-linked" data-card="${c.id}">+ Element hier verknüpfen</button>`;
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

// Baut die nach Kartentyp gruppierte, auf-/zuklappbare Übersicht. Abschnitte
// ohne "gesehen"-Eintrag für diesen Typ starten aufgeklappt (neue Geräte
// sehen also erstmal alles, wie bisher) — sobald jemand manuell ein-/
// ausklappt, wird das gerätespezifisch gemerkt.
function renderGroupedFeed(list) {
  const groups = new Map();
  for (const c of list) {
    if (!groups.has(c.type)) groups.set(c.type, []);
    groups.get(c.type).push(c);
  }
  // Termine chronologisch (der nächste zuerst) statt nach Erstelldatum.
  if (groups.has("termin")) {
    groups.get("termin").sort((a, b) => String(a.event_date).localeCompare(String(b.event_date)));
  }

  const seen = loadSeen();
  const typesWithItems = TYPE_ORDER.filter((t) => groups.has(t));
  let openType = loadOpenType();
  if (openType === undefined) openType = typesWithItems[0] ?? null;

  // Alle sechs Rubriken stehen immer oben als feste Auswahl — auch wenn
  // eine gerade leer ist. Antippen öffnet darunter, unter dem ganzen
  // Raster, den Inhalt der gewählten Rubrik (nur eine gleichzeitig).
  const tiles = TYPE_ORDER.map((type) => {
    const items = groups.get(type) || [];
    const isOpen = type === openType;
    const newCount = items.filter((c) => new Date(c.created_at).getTime() > (seen[type] || 0)).length;

    return `
      <button class="rubrik-tile type-${type} ${isOpen ? "active" : ""}" data-action="toggle-group" data-type="${type}">
        ${newCount ? `<span class="rubrik-tile-new">${newCount}</span>` : ""}
        <span class="rubrik-tile-icon">${ICONS[type]}</span>
        <span class="rubrik-tile-text">
          <span class="rubrik-tile-label">${TYPE_LABELS[type]}</span>
          <span class="rubrik-tile-count">${items.length} ${items.length === 1 ? TYPE_LABELS[type] : TYPE_LABELS_PLURAL[type]}</span>
        </span>
      </button>`;
  }).join("");

  let panel = "";
  if (openType) {
    const items = groups.get(openType) || [];
    markSeen(openType);
    panel = `
      <section class="rubrik-panel" data-type="${openType}">
        <div class="rubrik-panel-head type-${openType}">
          <span class="rubrik-tile-icon">${ICONS[openType]}</span>
          <span class="group-label">${TYPE_LABELS[openType]}</span>
          <span class="group-count">${items.length}</span>
        </div>
        <div class="group-body">${items.length
          ? items.map(renderCard).join("")
          : `<p class="rubrik-panel-empty">Noch nichts in dieser Rubrik.</p>`}</div>
      </section>`;
  }

  return statsLineHtml(list) + `<div class="rubrik-grid">${tiles}</div>` + panel;
}

const EMPTY_TEXT = {
  dashboard: "Nichts Aktuelles im Dashboard.",
  feed: "Noch nichts an der Pinnwand. Mit dem +-Knopf unten rechts geht's los.",
  archiv: "Keine vergangenen Termine.",
  papierkorb: "Der Papierkorb ist leer.",
};

function render() {
  document.querySelectorAll("#viewTabs button").forEach((b) =>
    b.classList.toggle("active", b.dataset.view === view));
  elFab.style.display = view === "feed" && configured ? "" : "none";

  if (!loaded) return;
  const list = visibleCards();

  if (view === "feed") {
    elFeed.innerHTML = renderGroupedFeed(list);
  } else if (view === "papierkorb") {
    const toolbar = list.length
      ? `<div class="feed-toolbar">
           <button class="btn link danger" data-action="empty-trash">Papierkorb jetzt leeren</button>
         </div>`
      : "";
    elFeed.innerHTML = toolbar + list.map(renderCard).join("");
  } else {
    elFeed.innerHTML = list.map(renderCard).join("");
  }

  // Im Feed übernimmt das Kachel-Raster selbst die Leer-Anzeige (jede
  // Rubrik zeigt "0 ..."), der generische Hinweistext ist dort überflüssig.
  elEmpty.textContent = EMPTY_TEXT[view];
  elEmpty.hidden = view === "feed" ? true : list.length > 0;
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
// fields: Array von { name, label?, placeholder?, maxlength?, value?, optional? }.
// Löst mit einem Objekt { [name]: getrimmter Wert } auf, oder null bei Abbruch.
function promptDlg(title, fields) {
  return new Promise((resolve) => {
    $("promptTitle").textContent = title;
    const wrap = $("promptFields");
    wrap.innerHTML = fields.map((f, i) => fieldHtml(f.label || "",
      `<input type="text" name="${esc(f.name)}" placeholder="${esc(f.placeholder || "")}"
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

function editorFieldsHtml(type, card) {
  const v = (name) => esc(card ? card[name] ?? "" : "");
  let html = fieldHtml("Titel *",
    `<input type="text" name="title" maxlength="120" required value="${v("title")}">`);

  if (type === "termin") {
    html += fieldHtml("Datum *",
      `<input type="date" name="event_date" required value="${v("event_date")}">`);
    html += fieldHtml("Uhrzeit",
      `<input type="time" name="event_time" value="${card && card.event_time ? esc(card.event_time.slice(0, 5)) : ""}">`);
    html += fieldHtml("Ort",
      `<input type="text" name="event_location" maxlength="120" value="${v("event_location")}">`);
  }

  if (type === "hinweis") {
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
    html += `<p class="field-hint">Die Optionen einer laufenden Umfrage können nicht mehr geändert werden, damit keine Stimmen verfälscht werden.</p>`;
  }

  if (type === "datei" && !card) {
    html += fieldHtml("Datei * (PDF, JPG, PNG oder WebP — max. 10 MB)",
      `<input type="file" name="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" required>`);
  }

  if (classesList.length) {
    const currentClassId = card ? (card.class_id || "") : activeClassId;
    const opts = [`<option value="">Gemeinsam (beide Klassen)</option>`].concat(
      classesList.map((cl) =>
        `<option value="${cl.id}" ${cl.id === currentClassId ? "selected" : ""}>${CLASS_ICON[cl.slug] || ""} ${esc(cl.name)}</option>`));
    html += fieldHtml("Klasse", `<select name="class_id">${opts.join("")}</select>`);
  }

  html += fieldHtml("Endet am (optional)",
    `<input type="date" name="end_date" value="${card && card.end_date ? esc(card.end_date) : ""}">`);

  html += `
    <label class="field-check">
      <input type="checkbox" name="important" ${card && card.important ? "checked" : ""}>
      <span>★ Wichtig (erscheint oben im Dashboard)</span>
    </label>`;

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

function openEditor(type, card = null, parentId = null) {
  editorState = {
    mode: card ? "edit" : "create",
    type,
    card,
    parentId,   // nur beim Anlegen gesetzt: Termin, mit dem verknüpft wird
    items: card && type === "liste"
      ? (card.list_items || []).map((it) => ({ id: it.id, text: it.text, orig: it.text, deleted: false }))
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

  if (type === "hinweis" || type === "termin") setupRichEditor();

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

  const common = {
    title,
    body: String(fd.get("body") || "").trim(),
    pinned: fd.get("pinned") === "on",
    important: fd.get("important") === "on",
    end_date: String(fd.get("end_date") || ""),
  };
  if (fd.has("class_id")) common.class_id = String(fd.get("class_id") || "");

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

async function handleFeedClick(ev) {
  const btn = ev.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
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
      const target = cardById(cardId);
      if (!target) break;
      if (view === "feed") {
        const panelEl = elFeed.querySelector(`.rubrik-panel[data-type="${CSS.escape(target.type)}"]`);
        if (!panelEl) {
          saveOpenType(target.type);
          render();
        }
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
    case "toggle-group": {
      const type = btn.dataset.type;
      const isOpen = btn.classList.contains("active");
      saveOpenType(isOpen ? null : type);
      render();
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
  // Ansichten und Filter
  $("viewTabs").addEventListener("click", (ev) => {
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
