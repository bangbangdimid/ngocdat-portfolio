/* ============================================================
   khoahoc.js - student course viewer for khoahoc.html
   Access is enforced by RLS: a non-enrolled user simply receives
   no enrolled rows. We also check enrollment for a clear message.
   Requires: config.js, supabaseClient.js, auth.js
   ============================================================ */
(function () {
  const CFG = window.APP_CONFIG;
  const BUCKET = CFG.STORAGE_BUCKET;
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
        <div class="lt">${esc(m.title)}<span class="s">${m.kind === "video" ? "Video" : "Tài liệu"}${m.visibility === "sample" ? " · " + "mẫu" : ""}</span></div>
      </div>`).join("");
    window.Typo?.apply(el);
    el.querySelectorAll(".lesson").forEach((l) => l.addEventListener("click", () => selectLesson(+l.dataset.idx)));
  }

  const DOC_TTL = 3600; // seconds a document link stays valid
  // uploads are stored as "<timestamp>_<name>"; download under the original name
  const fileName = (path) => (path || "").split("/").pop().replace(/^\d+_/, "");
  let viewer = null, renderToken = 0;

  function selectLesson(idx) {
    state.activeIdx = idx;
    const m = state.materials[idx];
    // keep the lesson in the URL so a refresh or a shared link reopens it
    if (m) history.replaceState(null, "", location.pathname + `?course=${encodeURIComponent(courseId)}&bai=${encodeURIComponent(m.id)}`);
    renderLessons(); renderMain();
    if (innerWidth <= 820) $("vMain").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function lessonNav() {
    const i = state.activeIdx, n = state.materials.length;
    if (n < 2) return "";
    return `<nav class="v-nav" aria-label="Chuyển bài">
      <button class="btn sm" type="button" data-go="${i - 1}" ${i === 0 ? "disabled" : ""}>← Bài trước</button>
      <span class="v-pos">${i + 1} / ${n}</span>
      <button class="btn primary sm" type="button" data-go="${i + 1}" ${i === n - 1 ? "disabled" : ""}>Bài tiếp →</button>
    </nav>`;
  }

  async function renderMain() {
    const token = ++renderToken;
    viewer?.destroy(); viewer = null;
    const m = state.materials[state.activeIdx];
    const main = $("vMain");
    if (!m) { main.innerHTML = `<div class="v-empty"><p>Khoá học chưa có nội dung.</p></div>`; return; }
    const head = `<h1 class="v-title">${esc(m.title)}</h1>${m.description ? `<p class="v-desc">${esc(m.description)}</p>` : ""}`;

    if (m.kind === "video") {
      main.innerHTML = `
        <div class="v-video">
          <iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(m.youtube_id)}?rel=0&modestbranding=1"
                  title="${esc(m.title)}" loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowfullscreen></iframe>
        </div>${head}${lessonNav()}`;
      return;
    }

    // documents open inside the page (PDF reader, image, audio/video); others download
    const kind = window.DocPreview.fileKind(m.storage_path);
    main.innerHTML = `<div class="v-docbar"><div class="v-docinfo">${head}</div><span class="v-dl"></span></div>
      <div class="v-docbody"><p class="pdf-note">Đang mở tài liệu…</p></div>${lessonNav()}`;
    const store = sb.storage.from(BUCKET);
    const [view, dl] = await Promise.all([
      store.createSignedUrl(m.storage_path, DOC_TTL),
      store.createSignedUrl(m.storage_path, DOC_TTL, { download: fileName(m.storage_path) || true }),
    ]);
    if (token !== renderToken) return; // the student already moved to another lesson
    const body = main.querySelector(".v-docbody");
    if (view.error || !view.data?.signedUrl) {
      body.innerHTML = `<p class="pdf-note">Không mở được tài liệu. Tải lại trang hoặc báo giáo viên.</p>`;
      return;
    }
    const url = view.data.signedUrl, dlUrl = dl.data?.signedUrl || url;
    main.querySelector(".v-dl").innerHTML = `<a class="btn primary sm" href="${esc(dlUrl)}" target="_blank" rel="noopener">Tải về</a>`;
    if (kind === "pdf") {
      body.innerHTML = "";
      const box = document.createElement("div");
      box.className = "v-pdf";
      body.appendChild(box);
      viewer = window.DocPreview.mount(box, url, { downloadUrl: dlUrl });
    } else if (kind === "image") {
      body.innerHTML = `<div class="v-media"><img src="${esc(url)}" alt="${esc(m.title)}" /></div>`;
    } else if (kind === "video") {
      body.innerHTML = `<div class="v-media"><video src="${esc(url)}" controls playsinline></video></div>`;
    } else if (kind === "audio") {
      body.innerHTML = `<div class="v-media"><audio src="${esc(url)}" controls></audio></div>`;
    } else {
      body.innerHTML = `<p class="pdf-note">Tệp này mở bằng ứng dụng trên máy. Bấm "Tải về" ở trên.</p>`;
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
    const wanted = new URLSearchParams(location.search).get("bai");
    state.activeIdx = Math.max(0, state.materials.findIndex((m) => m.id === wanted));
    renderLessons();
    renderMain();
    $("vMain").addEventListener("click", (e) => {
      const b = e.target.closest("[data-go]");
      if (b && !b.disabled) selectLesson(+b.dataset.go);
    });

    $("signOutBtn").addEventListener("click", async () => { await window.Auth.signOut(); location.replace(CFG.ROUTES.home); });
  })();
})();
