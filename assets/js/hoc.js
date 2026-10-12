/* ============================================================
   hoc.js — student dashboard (guarded) for hoc.html
   Requires: config.js, i18n.js, supabaseClient.js, auth.js
   ============================================================ */
(function () {
  const CFG = window.APP_CONFIG;
  const t = window.I18N.t;
  const $ = (id) => document.getElementById(id);

  const state = { profile: null, courses: [] };

  function toast(vi, en, isErr) {
    const el = $("toast");
    el.textContent = t(vi, en);
    el.classList.toggle("err", !!isErr);
    el.classList.add("on");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("on"), 2800);
  }

  function firstName(name) {
    const n = (name || "").trim();
    if (!n) return t("bạn", "there");
    const parts = n.split(/\s+/);
    return parts[parts.length - 1]; // Vietnamese given name comes last
  }

  function renderHeader() {
    const name = state.profile?.full_name || "";
    $("userName").textContent = name || (state.profile ? "—" : "");
    $("hello").innerHTML = t("Chào, ", "Hi, ") + "<span class='ital'>" + escapeHtml(firstName(name)) + "</span>.";
    $("adminLink").style.display = state.profile?.role === "admin" ? "" : "none";
  }

  function renderCourses() {
    const wrap = $("courses");
    if (!state.courses.length) {
      wrap.innerHTML = `
        <div class="dash-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
          <h3>${t("Bạn chưa có khoá học nào", "You have no courses yet")}</h3>
          <p style="max-width:42ch;margin-inline:auto">${t("Nhập mã lớp giáo viên cấp vào ô phía trên để mở khoá học đầu tiên.", "Enter the class code your teacher gave you above to unlock your first course.")}</p>
        </div>`;
      return;
    }
    wrap.className = "course-grid";
    wrap.innerHTML = state.courses.map((c) => `
      <a class="course-card" href="khoahoc.html?course=${encodeURIComponent(c.id)}">
        <div class="cc-top">${escapeHtml(c.title || "")}</div>
        <div class="cc-body">
          <h3>${escapeHtml(c.title || "")}</h3>
          <p>${escapeHtml(c.description || "")}</p>
          <span class="cc-go">${t("Vào học", "Open course")}
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </span>
        </div>
      </a>`).join("");
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  async function loadCourses() {
    state.courses = await window.Auth.myCourses();
    renderCourses();
  }

  function redeemError(code) {
    return {
      invalid_code: t("Mã không đúng hoặc đã hết lượt/hết hạn.", "Code is invalid, used up, or expired."),
      too_many_attempts: t("Bạn thử quá nhiều lần. Đợi ít phút rồi thử lại.", "Too many attempts. Wait a few minutes."),
      not_authenticated: t("Phiên đăng nhập hết hạn. Đăng nhập lại.", "Session expired. Please sign in again."),
    }[code] || t("Không kích hoạt được mã.", "Could not activate code.");
  }

  // ---- init ----
  (async function () {
    const user = await window.Auth.requireAuth();
    if (!user) return; // redirected to login
    state.profile = await window.Auth.syncProfileFromMetadata();
    $("loader").style.display = "none";
    $("dash").style.display = "";
    renderHeader();
    await loadCourses();

    $("redeemForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const code = $("codeInput").value.trim();
      if (!code || code.length > 64) { toast("Nhập mã lớp hợp lệ.", "Enter a valid class code.", true); return; }
      const btn = $("redeemBtn"); const old = btn.textContent;
      btn.disabled = true; btn.textContent = t("Đang kiểm tra…", "Checking…");
      try {
        const res = await window.Auth.redeemCode($("codeInput").value);
        if (res && res.ok && res.already_enrolled) {
          $("codeInput").value = "";
          toast("Bạn đã ở trong lớp này rồi.", "You're already enrolled in this course.");
        } else if (res && res.ok) {
          $("codeInput").value = "";
          toast("Kích hoạt thành công! Đã mở khoá học.", "Activated! Course unlocked.");
          await loadCourses();
        } else {
          toast(redeemError(res && res.error), redeemError(res && res.error), true);
        }
      } finally { btn.disabled = false; btn.textContent = old; }
    });

    $("signOutBtn").addEventListener("click", async () => {
      await window.Auth.signOut();
      location.replace(CFG.ROUTES.home);
    });

    document.addEventListener("langchange", () => { renderHeader(); renderCourses(); });
  })();
})();
