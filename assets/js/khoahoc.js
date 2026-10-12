/* ============================================================
   khoahoc.js — student course viewer for khoahoc.html
   Access is enforced by RLS: a non-enrolled user simply receives
   no enrolled rows. We also check enrollment for a clear message.
   Requires: config.js, i18n.js, supabaseClient.js, auth.js
   ============================================================ */
(function () {
  const CFG = window.APP_CONFIG;
  const BUCKET = CFG.STORAGE_BUCKET;
  const t = window.I18N.t;
  const $ = (id) => document.getElementById(id);
  const state = { course: null, materials: [], activeIdx: 0 };

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
  const courseId = new URLSearchParams(location.search).get("course");

  function showDenied() { $("loader").style.display = "none"; $("denied").style.display = ""; }

  function renderLessons() {
    const el = $("lessonList");
    el.innerHTML = state.materials.map((m, i) => `
      <div class="lesson ${i === state.activeIdx ? "active" : ""}" data-idx="${i}">
        <div class="lic">${m.kind === "video"
          ? '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>'
          : '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5"/></svg>'}</div>
        <div class="lt">${esc(m.title)}<span class="s">${m.kind === "video" ? t("Video", "Video") : t("Tài liệu", "Document")}${m.visibility === "sample" ? " · " + t("mẫu", "sample") : ""}</span></div>
      </div>`).join("");
    el.querySelectorAll(".lesson").forEach((l) => l.addEventListener("click", () => { state.activeIdx = +l.dataset.idx; renderLessons(); renderMain(); }));
  }

  async function renderMain() {
    const m = state.materials[state.activeIdx];
    const main = $("vMain");
    if (!m) { main.innerHTML = `<div class="v-empty"><p>${t("Khoá học chưa có nội dung.", "No content yet.")}</p></div>`; return; }
    if (m.kind === "video") {
      main.innerHTML = `
        <div class="v-video">
          <iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(m.youtube_id)}?rel=0&modestbranding=1"
                  title="${esc(m.title)}" loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowfullscreen></iframe>
        </div>
        <h1 class="v-title">${esc(m.title)}</h1>
        <p class="v-desc">${esc(m.description)}</p>`;
    } else {
      main.innerHTML = `
        <div class="v-doc">
          <svg class="dic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5"/></svg>
          <h1 class="v-title">${esc(m.title)}</h1>
          <p class="v-desc">${esc(m.description)}</p>
          <button class="btn primary" id="openDoc" style="margin-top:1.2rem">${t("Mở / Tải tài liệu", "Open / Download")}</button>
        </div>`;
      $("openDoc").addEventListener("click", async () => {
        const btn = $("openDoc"); btn.disabled = true; const old = btn.textContent; btn.textContent = t("Đang mở…", "Opening…");
        try {
          const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(m.storage_path, 3600);
          if (error || !data?.signedUrl) throw error || new Error("no url");
          window.open(data.signedUrl, "_blank", "noopener");
        } catch (e) {
          btn.textContent = t("Không mở được tài liệu", "Could not open");
          setTimeout(() => { btn.textContent = old; btn.disabled = false; }, 1800);
          return;
        }
        btn.textContent = old; btn.disabled = false;
      });
    }
  }

  (async function () {
    const user = await window.Auth.requireAuth();
    if (!user) return;
    if (!courseId) { showDenied(); return; }

    const admin = await window.Auth.isAdmin();
    if (!admin) {
      const { data: enr } = await sb.from("enrollments").select("id").eq("course_id", courseId).maybeSingle();
      if (!enr) { showDenied(); return; }
    }

    const { data: course } = await sb.from("courses").select("*").eq("id", courseId).maybeSingle();
    if (!course) { showDenied(); return; }
    state.course = course;

    const { data: mats } = await sb.from("materials").select("*").eq("course_id", courseId).order("sort_order").order("created_at");
    state.materials = mats || [];

    $("loader").style.display = "none";
    $("viewer").style.display = "";
    $("courseTitle").textContent = course.title;
    $("courseDesc").textContent = course.description || "";
    renderLessons();
    renderMain();

    $("signOutBtn").addEventListener("click", async () => { await window.Auth.signOut(); location.replace(CFG.ROUTES.home); });
    document.addEventListener("langchange", () => { renderLessons(); renderMain(); });
  })();
})();
