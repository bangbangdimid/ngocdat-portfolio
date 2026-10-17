/* ============================================================
   login.js - sign in / sign up / forgot / reset password
   Requires: config.js, supabaseClient.js, auth.js
   ============================================================ */
(function () {
  const CFG = window.APP_CONFIG;
  const $ = (id) => document.getElementById(id);
  const msgEl = $("msg");

  const params = new URLSearchParams(location.search);
  // recovery links land here with ?mode=reset (and a token in the hash)
  const isRecovery = params.get("mode") === "reset" || /type=recovery/.test(location.hash);

  const SAFE_NEXT = new Set([CFG.ROUTES.app, CFG.ROUTES.admin]);
  function nextTarget() {
    const n = params.get("next") || "";
    return SAFE_NEXT.has(n) ? n : CFG.ROUTES.app;
  }
  async function goHome() {
    location.replace((await window.Auth.isAdmin()) ? CFG.ROUTES.admin : nextTarget());
  }

  function showMsg(kind, text) { msgEl.className = "msg show " + kind; msgEl.textContent = text; }
  function clearMsg() { msgEl.className = "msg"; msgEl.textContent = ""; }

  // ---------- panes ----------
  const PANES = { login: "paneLogin", signup: "paneSignup", forgot: "paneForgot", reset: "paneReset" };
  // each pane gets its own heading: a new visitor on Đăng ký must not read "welcome back"
  const COPY = {
    login:  { title: "Chào mừng trở lại", sub: "Đăng nhập để vào lớp học.", tab: "Đăng nhập" },
    signup: { title: "Tạo tài khoản mới", sub: "Chỉ mất 1 phút. Đăng ký xong, nhập mã lớp anh Đạt gửi để vào học.", tab: "Đăng ký" },
    forgot: { title: "Quên mật khẩu?", sub: "Nhập email của tài khoản. Mình sẽ gửi link để đặt mật khẩu mới.", tab: "Quên mật khẩu" },
    reset:  { title: "Đặt mật khẩu mới", sub: "Chọn mật khẩu mới cho tài khoản của bạn.", tab: "Đặt mật khẩu mới" },
  };
  function selectPane(name, keepMsg) {
    Object.entries(PANES).forEach(([k, id]) => $(id).classList.toggle("active", k === name));
    $("tabLogin").classList.toggle("active", name === "login");
    $("tabSignup").classList.toggle("active", name === "signup");
    document.querySelector(".auth-tabs").style.display = name === "reset" ? "none" : "";
    $("authTitle").textContent = COPY[name].title;
    $("authSub").textContent = COPY[name].sub;
    document.title = COPY[name].tab + " - Ara đang dạy toán";
    window.Typo?.apply($("authSub"));
    if (!keepMsg) clearMsg();
    ensureWidget(PANES[name]);
  }
  $("tabLogin").addEventListener("click", () => selectPane("login"));
  $("tabSignup").addEventListener("click", () => selectPane("signup"));
  $("forgotLink").addEventListener("click", (e) => { e.preventDefault(); $("fgEmail").value = $("liEmail").value; selectPane("forgot"); });
  $("backToLogin").addEventListener("click", (e) => { e.preventDefault(); selectPane("login"); });

  // ---------- optional Cloudflare Turnstile ----------
  // Widgets are rendered lazily, only in the pane the user is looking at:
  // a challenge inside a display:none pane may never complete.
  const CAPTCHA_ON = !!CFG.TURNSTILE_SITE_KEY;
  const captchaTokens = new WeakMap();
  const widgetIds = new WeakMap();
  function ensureWidget(paneId) {
    if (!CAPTCHA_ON || !window.turnstile) return;
    const box = $(paneId)?.querySelector("[data-turnstile]");
    if (!box || widgetIds.has(box)) return;
    const id = window.turnstile.render(box, {
      sitekey: CFG.TURNSTILE_SITE_KEY,
      language: "vi",
      theme: "light",
      callback: (token) => captchaTokens.set(box, token),
      "expired-callback": () => captchaTokens.delete(box),
      "error-callback": () => { captchaTokens.delete(box); },
    });
    widgetIds.set(box, id);
  }
  function initTurnstile() {
    if (!CAPTCHA_ON) return;
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true; s.defer = true;
    s.onload = () => { const active = document.querySelector(".auth-pane.active"); if (active) ensureWidget(active.id); };
    document.head.appendChild(s);
  }
  function tokenFor(form) {
    const box = form.querySelector("[data-turnstile]");
    return box ? captchaTokens.get(box) || null : null;
  }
  // true if we may submit; otherwise tells the user to finish the bot check
  function captchaReady(form) {
    if (!CAPTCHA_ON || tokenFor(form)) return true;
    showMsg("err", "Vui lòng đợi ô xác minh chống robot (Cloudflare) hoàn tất rồi bấm lại.");
    return false;
  }
  // a Turnstile token is single-use: reset after every attempt
  function resetCaptcha(form) {
    const box = form.querySelector("[data-turnstile]");
    if (box && window.turnstile && widgetIds.has(box)) { window.turnstile.reset(widgetIds.get(box)); captchaTokens.delete(box); }
  }

  function friendly(error) {
    const m = (error?.message || "").toLowerCase();
    if (m.includes("invalid login")) return "Email hoặc mật khẩu không đúng.";
    if (m.includes("email not confirmed")) return "Email chưa được xác nhận - kiểm tra hộp thư (cả mục Spam).";
    if (m.includes("already registered") || m.includes("already been registered")) return "Email này đã có tài khoản. Hãy đăng nhập.";
    if (m.includes("same") && m.includes("password")) return "Mật khẩu mới phải khác mật khẩu cũ.";
    if (m.includes("password")) return "Mật khẩu chưa đạt yêu cầu (tối thiểu 8 ký tự).";
    if (m.includes("rate") || m.includes("too many") || m.includes("security purposes")) return "Bạn thao tác quá nhanh. Thử lại sau ít phút.";
    if (m.includes("captcha")) return "Vui lòng xác minh bạn không phải robot.";
    if (m.includes("fetch") || m.includes("network")) return "Không kết nối được máy chủ. Kiểm tra mạng và thử lại.";
    return "Có lỗi xảy ra. Vui lòng thử lại.";
  }

  // run an async form action with a busy button and error handling
  async function withBusy(btn, busyText, fn) {
    const old = btn.textContent; btn.disabled = true; btn.textContent = busyText;
    try { await fn(); }
    catch (err) { console.error(err); showMsg("err", friendly(err)); }
    finally { btn.disabled = false; btn.textContent = old; }
  }
  const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

  // ---------- sign in ----------
  $("loginForm").addEventListener("submit", (e) => {
    e.preventDefault(); clearMsg();
    const form = e.currentTarget;
    const email = $("liEmail").value.trim(), password = $("liPass").value;
    if (!validEmail(email) || !password) return showMsg("err", "Nhập email và mật khẩu hợp lệ.");
    if (!captchaReady(form)) return;
    withBusy($("liBtn"), "Đang đăng nhập…", async () => {
      const res = await window.Auth.signIn({ email, password, captchaToken: tokenFor(form) });
      resetCaptcha(form);
      if (!res.ok) return showMsg("err", friendly(res.error));
      await goHome();
    });
  });

  // ---------- sign up ----------
  $("signupForm").addEventListener("submit", (e) => {
    e.preventDefault(); clearMsg();
    const form = e.currentTarget;
    const fullName = $("suName").value.trim(), email = $("suEmail").value.trim();
    const phone = $("suPhone").value.trim(), password = $("suPass").value;
    if (fullName.length < 2) return showMsg("err", "Vui lòng nhập họ và tên.");
    if (!validEmail(email)) return showMsg("err", "Email không hợp lệ.");
    if (phone && !/^[+\d][\d\s.-]{7,18}$/.test(phone)) return showMsg("err", "Số điện thoại không hợp lệ.");
    if (password.length < 8) return showMsg("err", "Mật khẩu tối thiểu 8 ký tự.");
    if (!captchaReady(form)) return;
    withBusy($("suBtn"), "Đang tạo…", async () => {
      const res = await window.Auth.signUp({ fullName, email, phone, password, captchaToken: tokenFor(form) });
      resetCaptcha(form);
      if (!res.ok) return showMsg("err", friendly(res.error));
      if (res.needsConfirm) {
        selectPane("login", true);
        $("liEmail").value = email;
        showMsg("ok", "Đã gửi email xác nhận. Mở email, bấm vào link rồi quay lại đăng nhập.");
      } else {
        await goHome();
      }
    });
  });

  // ---------- forgot password ----------
  $("forgotForm").addEventListener("submit", (e) => {
    e.preventDefault(); clearMsg();
    const form = e.currentTarget;
    const email = $("fgEmail").value.trim();
    if (!validEmail(email)) return showMsg("err", "Email không hợp lệ.");
    if (!captchaReady(form)) return;
    withBusy($("fgBtn"), "Đang gửi…", async () => {
      const res = await window.Auth.requestPasswordReset(email, tokenFor(form));
      resetCaptcha(form);
      if (!res.ok) return showMsg("err", friendly(res.error));
      // same message whether or not the email exists (no account enumeration)
      showMsg("ok", "Nếu email có tài khoản, link đặt lại mật khẩu đã được gửi. Kiểm tra hộp thư.");
    });
  });

  // ---------- set new password ----------
  $("resetForm").addEventListener("submit", (e) => {
    e.preventDefault(); clearMsg();
    const p1 = $("rsPass").value, p2 = $("rsPass2").value;
    if (p1.length < 8) return showMsg("err", "Mật khẩu tối thiểu 8 ký tự.");
    if (p1 !== p2) return showMsg("err", "Hai mật khẩu không khớp.");
    withBusy($("rsBtn"), "Đang lưu…", async () => {
      const user = await window.Auth.getUser();
      if (!user) return showMsg("err", "Link đã hết hạn. Hãy yêu cầu link mới.");
      const res = await window.Auth.updatePassword(p1);
      if (!res.ok) return showMsg("err", friendly(res.error));
      showMsg("ok", "Đã đổi mật khẩu. Đang chuyển vào lớp học…");
      history.replaceState(null, "", location.pathname);
      setTimeout(goHome, 1200);
    });
  });

  // ---------- boot ----------
  if (params.get("tab") === "signup") selectPane("signup");
  initTurnstile();
  window.sb.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") selectPane("reset");
  });
  (async function () {
    if (isRecovery) { selectPane("reset"); return; } // never auto-redirect mid-recovery
    const user = await window.Auth.getUser();
    if (user) await goHome();
  })();
})();
