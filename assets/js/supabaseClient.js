/* ============================================================
   supabaseClient.js — one shared Supabase client for all pages.
   Requires config.js and the supabase-js UMD bundle to be loaded first.
   ============================================================ */
(function () {
  if (!window.supabase || !window.APP_CONFIG) {
    console.error("[supabaseClient] supabase-js or APP_CONFIG not loaded");
    return;
  }
  window.sb = window.supabase.createClient(
    window.APP_CONFIG.SUPABASE_URL,
    window.APP_CONFIG.SUPABASE_ANON_KEY,
    { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
  );
})();
