/* ============================================================
   admin.js — admin panel (courses, materials, access codes)
   Admin-only. Requires: config.js, supabaseClient.js, auth.js
   All writes are also guarded server-side by RLS (admin-only).
   ============================================================ */
(function () {
  const CFG = window.APP_CONFIG;
  const BUCKET = CFG.STORAGE_BUCKET;
  const $ = (id) => document.getElementById(id);
  const state = { courses: [], current: null, pendingDoc: null };
  const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
  // files that a browser could execute when opened from storage
  const BLOCKED_EXT = /\.(html?|xhtml|svg|js|mjs|php|exe|bat|cmd|sh|msi|jar|apk)$/i;

  // ---------- utils ----------
  function toast(msg, isErr) {
    const el = $("toast");
    el.textContent = msg; el.classList.toggle("err", !!isErr); el.classList.add("on");
    clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove("on"), 2800);
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
  function bytes(n) { if (!n) return ""; if (n < 1048576) return (n / 1024).toFixed(1) + " KB"; return (n / 1048576).toFixed(1) + " MB"; }
  function parseYouTubeId(input) {
    const s = (input || "").trim();
    const m = s.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
    if (m) return m[1];
    if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
    return null;
  }
  function randCode() {
    const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = ""; for (let i = 0; i < 8; i++) s += a[Math.floor(Math.random() * a.length)];
    return s.slice(0, 4) + "-" + s.slice(4);
  }
  const openModal = (id) => $(id).classList.add("on");
  const closeModal = (id) => $(id).classList.remove("on");
  document.querySelectorAll(".modal").forEach((m) => {
    m.addEventListener("click", (e) => { if (e.target === m) m.classList.remove("on"); });
    m.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => m.classList.remove("on")));
  });

  const ICONS = {
    video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9l5 3-5 3z" fill="currentColor"/></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 113 3L7 19l-4 1 1-4z"/></svg>',
    del: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>',
  };

  // ---------- courses ----------
  async function loadCourses() {
    const { data, error } = await sb.from("courses").select("*").order("sort_order").order("created_at", { ascending: false });
    if (error) { toast("Lỗi tải khoá học", true); return; }
    state.courses = data || [];
    renderCourses();
  }
  function renderCourses() {
    const el = $("coursesList");
    const cards = state.courses.map((c) => `
      <div class="ac-card" data-id="${c.id}">
        <div class="ac-meta">
          <span class="badge ${c.is_published ? "on" : "off"}">${c.is_published ? "Đã xuất bản" : "Nháp"}</span>
        </div>
        <h3>${esc(c.title)}</h3>
        <p>${esc(c.description) || "<span class='muted'>Chưa có mô tả</span>"}</p>
        <div class="ac-meta">Mở để quản lý →</div>
      </div>`).join("");
    el.innerHTML = cards + `<div class="ac-card ac-new" id="newCourseTile">+ Khoá học mới</div>`;
    el.querySelectorAll(".ac-card[data-id]").forEach((card) =>
      card.addEventListener("click", () => openCourse(state.courses.find((c) => c.id === card.dataset.id))));
    $("newCourseTile").addEventListener("click", () => openCourseModal(null));
  }

  function openCourseModal(course) {
    $("courseModalTitle").innerHTML = course ? 'Sửa <span class="ital">khoá học</span>' : 'Khoá học <span class="ital">mới</span>';
    $("ccId").value = course?.id || "";
    $("ccTitle").value = course?.title || "";
    $("ccDesc").value = course?.description || "";
    $("ccPub").checked = !!course?.is_published;
    openModal("courseModal");
  }
  $("courseForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = $("ccId").value;
    const payload = { title: $("ccTitle").value.trim(), description: $("ccDesc").value.trim(), is_published: $("ccPub").checked };
    const btn = $("ccSave"); btn.disabled = true;
    try {
      let res;
      if (id) res = await sb.from("courses").update(payload).eq("id", id);
      else res = await sb.from("courses").insert(payload);
      if (res.error) throw res.error;
      closeModal("courseModal"); toast("Đã lưu khoá học");
      await loadCourses();
      if (state.current && id) { state.current = state.courses.find((c) => c.id === id); renderCourseHeader(); }
    } catch (err) { toast("Lỗi: " + err.message, true); }
    finally { btn.disabled = false; }
  });

  // ---------- single course ----------
  function openCourse(course) {
    if (!course) return;
    state.current = course;
    $("coursesView").style.display = "none";
    $("courseView").style.display = "";
    renderCourseHeader();
    selectTab("materials");
    loadMaterials(); loadCodes(); loadStudents();
    window.scrollTo(0, 0);
  }
  function renderCourseHeader() {
    const c = state.current;
    $("crumbTitle").textContent = c.title;
    $("cvTitle").textContent = c.title;
    $("cvDesc").textContent = c.description || "";
    $("cvPublishBtn").textContent = c.is_published ? "Gỡ xuất bản" : "Xuất bản";
  }
  $("backToCourses").addEventListener("click", (e) => { e.preventDefault(); $("courseView").style.display = "none"; $("coursesView").style.display = ""; state.current = null; });
  $("newCourseBtn").addEventListener("click", () => openCourseModal(null));
  $("cvEditBtn").addEventListener("click", () => openCourseModal(state.current));
  $("cvPublishBtn").addEventListener("click", async () => {
    const c = state.current;
    const { error } = await sb.from("courses").update({ is_published: !c.is_published }).eq("id", c.id);
    if (error) return toast("Lỗi: " + error.message, true);
    c.is_published = !c.is_published; renderCourseHeader(); loadCourses(); toast("Đã cập nhật");
  });
  $("cvDeleteBtn").addEventListener("click", async () => {
    const c = state.current;
    if (!confirm(`Xoá khoá "${c.title}" và toàn bộ nội dung? Không thể hoàn tác.`)) return;
    // best-effort: remove uploaded doc files from storage
    const { data: mats } = await sb.from("materials").select("storage_path").eq("course_id", c.id).eq("kind", "doc");
    const paths = (mats || []).map((m) => m.storage_path).filter(Boolean);
    if (paths.length) { try { await sb.storage.from(BUCKET).remove(paths); } catch {} }
    const { error } = await sb.from("courses").delete().eq("id", c.id);
    if (error) return toast("Lỗi: " + error.message, true);
    toast("Đã xoá khoá"); $("courseView").style.display = "none"; $("coursesView").style.display = ""; state.current = null; loadCourses();
  });

  // tabs
  document.querySelectorAll('.admin-tabs [data-tab]').forEach((b) => b.addEventListener("click", () => selectTab(b.dataset.tab)));
  function selectTab(name) {
    document.querySelectorAll('.admin-tabs [data-tab]').forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
    document.querySelectorAll(".tabpane").forEach((p) => p.classList.toggle("active", p.id === "tab-" + name));
  }
  // material sub-tabs (video/doc)
  document.querySelectorAll('[data-mtype]').forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll('[data-mtype]').forEach((x) => x.classList.toggle("active", x === b));
    document.querySelectorAll('[data-mpane]').forEach((p) => p.style.display = p.dataset.mpane === b.dataset.mtype ? "" : "none");
  }));

  // ---------- materials ----------
  async function loadMaterials() {
    const { data, error } = await sb.from("materials").select("*").eq("course_id", state.current.id).order("sort_order").order("created_at");
    if (error) { toast("Lỗi tải nội dung", true); return; }
    const mats = data || [];
    $("matCount").textContent = mats.length + " mục";
    $("materialsList").innerHTML = mats.length ? mats.map((m) => `
      <div class="item-row" data-id="${m.id}" data-kind="${m.kind}" data-path="${esc(m.storage_path || "")}">
        <div class="ic">${ICONS[m.kind] || ICONS.doc}</div>
        <div class="meta">
          <div class="t">${esc(m.title)}</div>
          <div class="s">${m.kind === "video" ? "Video · " + esc(m.youtube_id || "") : "Tài liệu"} ·
            <span class="vis-tag ${m.visibility}">${m.visibility === "sample" ? "Mẫu công khai" : "Chỉ ghi danh"}</span></div>
        </div>
        <div class="acts"><button class="icon-btn danger" data-del title="Xoá">${ICONS.del}</button></div>
      </div>`).join("") : "<p class='muted'>Chưa có nội dung nào.</p>";
    $("materialsList").querySelectorAll(".item-row").forEach((row) =>
      row.querySelector("[data-del]").addEventListener("click", () => deleteMaterial(row.dataset)));
  }
  async function deleteMaterial(ds) {
    if (!confirm("Xoá mục này?")) return;
    if (ds.kind === "doc" && ds.path) { try { await sb.storage.from(BUCKET).remove([ds.path]); } catch {} }
    const { error } = await sb.from("materials").delete().eq("id", ds.id);
    if (error) return toast("Lỗi: " + error.message, true);
    toast("Đã xoá"); loadMaterials();
  }

  $("videoForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const yt = parseYouTubeId($("vmYt").value);
    if (!yt) return toast("Link/ID YouTube không hợp lệ", true);
    const btn = e.currentTarget.querySelector('[type="submit"]'); btn.disabled = true;
    try {
      const { error } = await sb.from("materials").insert({
        course_id: state.current.id, kind: "video", title: $("vmTitle").value.trim(),
        description: $("vmDesc").value.trim(), youtube_id: yt,
        visibility: $("vmVis").value, sort_order: parseInt($("vmOrder").value) || 0,
      });
      if (error) throw error;
      $("videoForm").reset(); toast("Đã thêm video"); loadMaterials();
    } catch (err) { toast("Lỗi: " + err.message, true); } finally { btn.disabled = false; }
  });

  // doc upload
  function bindDrop() {
    const drop = $("docDrop"), input = $("docInput");
    const setFile = (f) => { state.pendingDoc = f || null; $("docPreview").innerHTML = f ? `<div class="file-row"><span class="fname">${esc(f.name)}</span><span class="fsize">${bytes(f.size)}</span></div>` : ""; };
    drop.addEventListener("click", (e) => { if (e.target.tagName !== "INPUT") input.click(); });
    drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("hover"); });
    drop.addEventListener("dragleave", () => drop.classList.remove("hover"));
    drop.addEventListener("drop", (e) => { e.preventDefault(); drop.classList.remove("hover"); setFile(e.dataTransfer.files[0]); });
    input.addEventListener("change", () => setFile(input.files[0]));
  }
  $("docForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!state.pendingDoc) return toast("Chọn một tệp để tải lên", true);
    const f = state.pendingDoc, vis = $("dmVis").value;
    if (f.size > MAX_UPLOAD_BYTES) return toast("Tệp quá lớn (tối đa 50MB)", true);
    if (BLOCKED_EXT.test(f.name)) return toast("Không cho phép loại tệp này (html/svg/js/exe…)", true);
    const safe = f.name.replace(/[^\w.\-]+/g, "_");
    const folder = vis === "sample" ? "samples" : "course";
    const path = `${folder}/${state.current.id}/${Date.now()}_${safe}`;
    const btn = $("docSubmit"); btn.disabled = true; const old = btn.textContent; btn.textContent = "Đang tải…";
    try {
      const up = await sb.storage.from(BUCKET).upload(path, f, { contentType: f.type, upsert: false });
      if (up.error) throw up.error;
      const { error } = await sb.from("materials").insert({
        course_id: state.current.id, kind: "doc", title: $("dmTitle").value.trim(),
        description: $("dmDesc").value.trim(), storage_path: path,
        visibility: vis, sort_order: parseInt($("dmOrder").value) || 0,
      });
      if (error) throw error;
      $("docForm").reset(); state.pendingDoc = null; $("docPreview").innerHTML = "";
      toast("Đã tải tài liệu lên"); loadMaterials();
    } catch (err) { toast("Lỗi: " + err.message, true); }
    finally { btn.disabled = false; btn.textContent = old; }
  });

  // ---------- access codes ----------
  async function loadCodes() {
    const { data, error } = await sb.from("access_codes").select("*").eq("course_id", state.current.id).order("created_at", { ascending: false });
    if (error) { toast("Lỗi tải mã", true); return; }
    const codes = data || [];
    $("codesList").innerHTML = codes.length ? codes.map((c) => `
      <div class="item-row" data-id="${c.id}">
        <span class="code-pill">${esc(c.code)}</span>
        <div class="meta">
          <div class="s">Đã dùng ${c.used_count}/${c.max_uses}${c.expires_at ? " · hết hạn " + new Date(c.expires_at).toLocaleDateString("vi") : ""}</div>
        </div>
        <span class="badge ${c.active ? "on" : "off"}">${c.active ? "Đang bật" : "Đã tắt"}</span>
        <div class="acts">
          <button class="icon-btn" data-toggle title="Bật/tắt">${c.active ? "⏸" : "▶"}</button>
          <button class="icon-btn danger" data-del title="Xoá">${ICONS.del}</button>
        </div>
      </div>`).join("") : "<p class='muted'>Chưa phát mã nào.</p>";
    $("codesList").querySelectorAll(".item-row").forEach((row) => {
      row.querySelector("[data-toggle]").addEventListener("click", async () => {
        const c = codes.find((x) => x.id === row.dataset.id);
        await sb.from("access_codes").update({ active: !c.active }).eq("id", c.id); loadCodes();
      });
      row.querySelector("[data-del]").addEventListener("click", async () => {
        if (!confirm("Xoá mã này?")) return;
        await sb.from("access_codes").delete().eq("id", row.dataset.id); loadCodes();
      });
    });
  }
  $("codeForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const code = ($("cmCode").value.trim() || randCode()).toUpperCase();
    if (!/^[A-Z0-9-]{4,32}$/.test(code)) return toast("Mã chỉ gồm chữ, số, dấu gạch ngang (4–32 ký tự)", true);
    const payload = { course_id: state.current.id, code, max_uses: parseInt($("cmMax").value) || 1, expires_at: $("cmExp").value || null };
    const { error } = await sb.from("access_codes").insert(payload);
    if (error) return toast(error.message.includes("duplicate") ? "Mã đã tồn tại, chọn mã khác" : "Lỗi: " + error.message, true);
    $("codeForm").reset(); toast("Đã tạo mã: " + code); loadCodes();
  });

  // ---------- students ----------
  async function loadStudents() {
    const { data: enr, error } = await sb.from("enrollments").select("id, user_id, created_at").eq("course_id", state.current.id).order("created_at", { ascending: false });
    if (error) { toast("Lỗi tải học sinh", true); return; }
    const ids = (enr || []).map((e) => e.user_id);
    $("studCount").textContent = ids.length + " học sinh";
    let profiles = {};
    if (ids.length) {
      const { data: profs } = await sb.from("profiles").select("id, full_name, phone").in("id", ids);
      (profs || []).forEach((p) => { profiles[p.id] = p; });
    }
    $("studentsList").innerHTML = ids.length ? enr.map((e) => {
      const p = profiles[e.user_id] || {};
      return `<div class="item-row" data-id="${e.id}" data-name="${esc(p.full_name || "")}">
        <div class="ic">${esc((p.full_name || "?").trim().charAt(0).toUpperCase())}</div>
        <div class="meta"><div class="t">${esc(p.full_name) || "(chưa có tên)"}</div>
          <div class="s">${esc(p.phone) || "—"} · ghi danh ${new Date(e.created_at).toLocaleDateString("vi")}</div></div>
        <div class="acts"><button class="icon-btn danger" data-kick title="Gỡ khỏi lớp">${ICONS.del}</button></div>
      </div>`;
    }).join("") : "<p class='muted'>Chưa có học sinh ghi danh.</p>";
    $("studentsList").querySelectorAll("[data-kick]").forEach((b) => b.addEventListener("click", async () => {
      const row = b.closest(".item-row");
      if (!confirm(`Gỡ "${row.dataset.name || "học sinh này"}" khỏi lớp? Học sinh sẽ mất quyền xem nội dung khoá.`)) return;
      const { error: delErr } = await sb.from("enrollments").delete().eq("id", row.dataset.id);
      if (delErr) return toast("Lỗi: " + delErr.message, true);
      toast("Đã gỡ khỏi lớp"); loadStudents();
    }));
  }

  // ---------- init ----------
  (async function () {
    const user = await window.Auth.requireAdmin();
    if (!user) return; // redirected
    const profile = await window.Auth.getProfile();
    $("userName").textContent = profile?.full_name || user.email;
    $("loader").style.display = "none";
    $("admin").style.display = "";
    bindDrop();
    $("signOutBtn").addEventListener("click", async () => { await window.Auth.signOut(); location.replace(CFG.ROUTES.home); });
    await loadCourses();
  })();
})();
