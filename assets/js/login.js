/* ============================================================
   login.js — sign in / sign up flow for login.html
   Requires: config.js, i18n.js, supabaseClient.js, auth.js
   ============================================================ */
(function () {
  const CFG = window.APP_CONFIG;
  const t = window.I18N.t;
  const $ = (id) => document.getElementById(id);
  const msgEl = $("msg");

  const SAFE_NEXT = new Set([CFG.ROUTES.app, CFG.ROUTES.admin]);
  function nextTarget() {
    const n = new URLSearchParams(location.search).get("next") || "";
    return SAFE_NEXT.has(n) ? n : CFG.ROUTES.app;
  }

  function showMsg(kind, vi, en) {
    msgEl.className = "msg show " + kind;
    msgEl.textContent = t(vi, en);
  }
  function clearMsg() { msgEl.className = "msg"; msgEl.textContent = ""; }

  // ---- tabs ----
  const tabLogin = $("tabLogin"), tabSignup = $("tabSignup");
  const paneLogin = $("paneLogin"), paneSignup = $("paneSignup");
  function selectTab(which) {
    const login = which === "login";
    tabLogin.classList.toggle("active", login);
    tabSignup.classList.toggle("active", !login);
    paneLogin.classList.toggle("active", login);
    paneSignup.classList.toggle("active", !login);
    clearMsg();
  }
  tabLogin.addEventListener("click", () => selectTab("login"));
  tabSignup.addEventListener("click", () => selectTab("signup"));
  if (new URLSearchParams(location.search).get("tab") === "signup") selectTab("signup");

  // ---- optional Cloudflare Turnstile ----
  const captchaTokens = new WeakMap();
  function initTurnstile() {
    if (!CFG.TURNSTILE_SITE_KEY) return; // disabled for now
    const boxes = document.querySelectorAll("[data-turnstile]");
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true; s.defer = true;
    s.onload = () => boxes.forEach((box) => {
      window.turnstile.render(box, {
        sitekey: CFG.TURNSTILE_SITE_KEY,
        callback: (token) => captchaTokens.set(box, token),
        "expired-callback": () => captchaTokens.delete(box),
      });
    });
    document.head.appendChild(s);
  }
  function tokenFor(form) {
    const box = form.querySelector("[data-turnstile]");
    return box ? captchaTokens.get(box) || null : null;
  }

  function friendly(error) {
    const m = (error?.message || "").toLowerCase();
    if (m.includes("invalid login")) return t("Email hoặc mật khẩu không đúng.", "Invalid email or password.");
    if (m.includes("email not confirmed")) return t("Email chưa được xác nhận — kiểm tra hộp thư.", "Email not confirmed — check your inbox.");
    if (m.includes("already registered") || m.includes("already been registered")) return t("Email này đã có tài khoản. Hãy đăng nhập.", "This email already has an account. Please sign in.");
    if (m.includes("password")) return t("Mật khẩu chưa đạt yêu cầu (tối thiểu 8 ký tự).", "Password too weak (min 8 characters).");
    if (m.includes("rate") || m.includes("too many")) return t("Thử lại sau ít phút.", "Too many attempts — try again later.");
    if (m.includes("captcha")) return t("Vui lòng xác minh bạn không phải robot.", "Please complete the bot check.");
    return error?.message || t("Có lỗi xảy ra.", "Something went wrong.");
  }

  // ---- sign in ----
  $("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMsg();
    const btn = $("liBtn"); btn.disabled = true;
    const label = t("Đang đăng nhập…", "Signing in…"); const old = btn.textContent; btn.textContent = label;
    try {
      const res = await window.Auth.signIn({
        email: $("liEmail").value.trim(),
        password: $("liPass").value,
        captchaToken: tokenFor($("loginForm")),
      });
      if (!res.ok) { showMsg("err", friendly(res.error), friendly(res.error)); return; }
      const dest = (await window.Auth.isAdmin()) ? CFG.ROUTES.admin : nextTarget();
      location.replace(dest);
    } finally { btn.disabled = false; btn.textContent = old; }
  });

  // ---- sign up ----
  $("signupForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMsg();
    const btn = $("suBtn"); btn.disabled = true;
    const old = btn.textContent; btn.textContent = t("Đang tạo…", "Creating…");
    try {
      const res = await window.Auth.signUp({
        fullName: $("suName").value.trim(),
        email: $("suEmail").value.trim(),
        phone: $("suPhone").value.trim(),
        password: $("suPass").value,
        captchaToken: tokenFor($("signupForm")),
      });
      if (!res.ok) { showMsg("err", friendly(res.error), friendly(res.error)); return; }
      if (res.needsConfirm) {
        showMsg("ok",
          "Đã gửi email xác nhận. Mở email, bấm vào link rồi quay lại đăng nhập.",
          "Confirmation email sent. Open it, click the link, then sign in.");
        selectTabKeepMsg("login");
      } else {
        location.replace(CFG.ROUTES.app);
      }
    } finally { btn.disabled = false; btn.textContent = old; }
  });

  function selectTabKeepMsg(which) {
    const keep = { cls: msgEl.className, txt: msgEl.textContent };
    selectTab(which);
    msgEl.className = keep.cls; msgEl.textContent = keep.txt;
  }

  // ---- if already signed in, skip the form ----
  (async function () {
    initTurnstile();
    const user = await window.Auth.getUser();
    if (user) {
      const dest = (await window.Auth.isAdmin()) ? CFG.ROUTES.admin : nextTarget();
      location.replace(dest);
    }
  })();
})();
