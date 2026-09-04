// Zugangsdaten des Supabase-Projekts.
// Beide Werte stehen im Supabase-Dashboard unter:
//   Project Settings → API  (bzw. "API Keys" im neuen Dashboard)
//
// SUPABASE_URL:      die "Project URL", z. B. https://abcdefghijkl.supabase.co
// SUPABASE_ANON_KEY: der öffentliche Schlüssel — heißt je nach Dashboard-Version
//                    "anon public" oder "publishable key" (sb_publishable_...).
//
// WICHTIG: Niemals den "service_role"- bzw. "secret key" hier eintragen!
// Diese Datei ist öffentlich sichtbar. Der anon/publishable Key darf das sein.
//
// HINWEIS: Dies ist die VORSCHAU-Umgebung mit einem EIGENEN, von der
// Produktion getrennten Supabase-Projekt ("pinnwand-vorschau") — Testkarten
// hier landen NICHT bei den echten Eltern. Push-Benachrichtigungen sind in
// dieser Umgebung bewusst nicht eingerichtet (kein VAPID-Key, keine Edge
// Function/Trigger) — dafür bräuchte es ein eigenes Setup, siehe
// docs/push-einrichtung.md.
window.PINNWAND_CONFIG = {
  SUPABASE_URL: "https://ozjvmfuopkwkfabutnvl.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_Ok48BHmWeaQz51eCsAGIDw_qF6K4nlM",
  VAPID_PUBLIC_KEY: "",
};
