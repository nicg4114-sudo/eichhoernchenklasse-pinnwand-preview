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
// VAPID_PUBLIC_KEY gehört zu den Push-Benachrichtigungen (Browser braucht ihn
// zum Abonnieren). Auch dieser Schlüssel ist bewusst öffentlich — das
// Gegenstück, der private Schlüssel, liegt ausschließlich als Secret bei der
// Edge Function und wird niemals ausgeliefert.
window.PINNWAND_CONFIG = {
  SUPABASE_URL: "https://zproqvwybbhsvlpyfowg.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_84_Pm_IGOKbknEXXKP6IgQ_YtPdxNHa",
  VAPID_PUBLIC_KEY: "BBaVziOX6RTQDuRR7XXp8bJ62sLppVCotJiC3kvH9yCFO-aUgB71rVQGdRFBS91hkpgZB6Z-7Xnv4D7gw9mbyuw",
};
