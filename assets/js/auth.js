/* ============================================================
   auth.js - authentication + role helpers (window.Auth)
   Thin wrapper over Supabase Auth. All authorization is enforced
   server-side by RLS; these helpers are for UX/flow only.
   Requires: config.js, supabaseClient.js
   ============================================================ */
(function () {
  const sb = window.sb;
  const CFG = window.APP_CONFIG;
  let _profile = null;

  async function getUser() {
    const { data } = await sb.auth.getUser();
    return data?.user || null;
  }

  async function getProfile(force) {
    if (_profile && !force) return _profile;
    const user = await getUser();
    if (!user) return null;
    const { data, error } = await sb.from("profiles").select("*").eq("id", user.id).single();
    if (error) { console.error(error); return null; }
    _profile = data;
    return data;
  }

  async function isAdmin() {
    const p = await getProfile();
    return !!p && p.role === "admin";
  }

  function captchaOpts(token) {
    return token ? { captchaToken: token } : {};
  }

  function pageUrl(route, query) {
    const base = window.location.origin + window.location.pathname.replace(/[^/]*$/, "");
    return base + route + (query || "");
  }

  async function signUp({ email, password, fullName, phone, captchaToken }) {
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        // phone travels in metadata; the DB trigger copies it to profiles
        data: { full_name: fullName || "", phone: phone || "" },
        emailRedirectTo: pageUrl(CFG.ROUTES.login),
        ...captchaOpts(captchaToken),
      },
    });
    if (error) return { ok: false, error };
    const needsConfirm = !data.session; // email confirmation is on
    return { ok: true, needsConfirm, user: data.user };
  }

  // Send a password-reset email that lands back on login.html in reset mode.
  async function requestPasswordReset(email, captchaToken) {
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: pageUrl(CFG.ROUTES.login, "?mode=reset"),
      ...captchaOpts(captchaToken),
    });
    return error ? { ok: false, error } : { ok: true };
  }

  async function updatePassword(password) {
    const { error } = await sb.auth.updateUser({ password });
    return error ? { ok: false, error } : { ok: true };
  }

  // Copy phone/name from signup metadata into the profile if the trigger
  // ran before they were available (older accounts). Safe: own row only.
  async function syncProfileFromMetadata() {
    const user = await getUser();
    const p = await getProfile();
    if (!user || !p) return p;
    const meta = user.user_metadata || {};
    const patch = {};
    if (!p.phone && meta.phone) patch.phone = meta.phone;
    if (!p.full_name && meta.full_name) patch.full_name = meta.full_name;
    if (!Object.keys(patch).length) return p;
    const { data, error } = await sb.from("profiles").update(patch).eq("id", user.id).select().single();
    if (error) { console.error(error); return p; }
    _profile = data;
    return data;
  }

  async function signIn({ email, password, captchaToken }) {
    const { data, error } = await sb.auth.signInWithPassword({
      email, password, options: captchaOpts(captchaToken),
    });
    if (error) return { ok: false, error };
    _profile = null;
    return { ok: true, user: data.user };
  }

  async function signOut() {
    _profile = null;
    await sb.auth.signOut();
  }

  // Enroll by redeeming an access code (validated server-side by RPC).
  async function redeemCode(code) {
    const { data, error } = await sb.rpc("redeem_access_code", { p_code: (code || "").trim() });
    if (error) return { ok: false, error: error.message };
    return data; // { ok, course_id } | { ok:false, error:'invalid_code'|... }
  }

  // Courses the current user is enrolled in (RLS returns only their own rows).
  async function myCourses() {
    const { data, error } = await sb
      .from("enrollments")
      .select("course_id, created_at, courses(*)")
      .order("created_at", { ascending: false });
    if (error) { console.error(error); return []; }
    return (data || []).map((r) => r.courses).filter(Boolean);
  }

  // Redirect to login if not authenticated. Returns the user (or null after redirecting).
  async function requireAuth() {
    const user = await getUser();
    if (!user) {
      const next = encodeURIComponent(location.pathname.split("/").pop() || "");
      location.replace(CFG.ROUTES.login + "?next=" + next);
      return null;
    }
    return user;
  }

  async function requireAdmin() {
    const user = await requireAuth();
    if (!user) return null;
    if (!(await isAdmin())) { location.replace(CFG.ROUTES.app); return null; }
    return user;
  }

  window.Auth = {
    getUser, getProfile, isAdmin, syncProfileFromMetadata,
    signUp, signIn, signOut, requestPasswordReset, updatePassword,
    redeemCode, myCourses, requireAuth, requireAdmin,
  };
})();
