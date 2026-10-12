/* ============================================================
   config.js — shared runtime config (loaded first on every page)
   The anon key is public by design; Row Level Security protects data.
   ============================================================ */
window.APP_CONFIG = {
  SUPABASE_URL:      "https://oblugkacwssddaibbvvx.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ibHVna2Fjd3NzZGRhaWJidnZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MzUyMjUsImV4cCI6MjA5NDExMTIyNX0.WUWDsydW3fIQzMRU8ZJAiszaflmoKbgKvQbD7NBC0kE",
  OWNER_EMAIL:       "ngocdat2006@gmail.com",
  STORAGE_BUCKET:    "materials",

  // Cloudflare Turnstile site key (public). Leave "" to disable the widget
  // for now — auth still works with Supabase email confirmation + rate limits.
  TURNSTILE_SITE_KEY: "0x4AAAAAAFU3R9-jhWGso78h",

  // Public contact shown on the landing page. Fill CONTACT_PHONE (e.g. "0912 345 678");
  // while it is empty the "Want to enrol?" button falls back to email.
  CONTACT_PHONE: "",
  CONTACT_EMAIL: "ngocdat2006@gmail.com",

  // where to send students after login, and admins
  ROUTES: { home: "index.html", login: "login.html", app: "hoc.html", admin: "admin.html" },
};
