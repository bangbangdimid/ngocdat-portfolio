/* ============================================================
   app.js — bilingual (VI/EN) + Supabase archive (upload system)
   The Supabase auth/CRUD layer is preserved from the original build;
   the ocean/watercolour cosmetics were removed for the academic theme.
   ============================================================ */

/* ═══════════ CONFIG ═══════════ (anon key is public by design; RLS protects writes) */
const CONFIG = {
  SUPABASE_URL:      "https://oblugkacwssddaibbvvx.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ibHVna2Fjd3NzZGRhaWJidnZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MzUyMjUsImV4cCI6MjA5NDExMTIyNX0.WUWDsydW3fIQzMRU8ZJAiszaflmoKbgKvQbD7NBC0kE",
  OWNER_EMAIL:       "ngocdat2006@gmail.com",
  STORAGE_BUCKET:    "portfolio",
};

/* ═══════════ i18n ═══════════ */
let lang = localStorage.getItem("lang") || "vi";

const T = {
  count: (n) => lang === "vi"
    ? `${n} mục · mới nhất trước`
    : `${n} item${n === 1 ? "" : "s"} · newest first`,
  countIn: (n, f) => lang === "vi" ? `${n} mục trong “${f}”` : `${n} in “${f}”`,
  addPiece:  () => lang === "vi" ? "Thêm tài liệu mới" : "Add new material",
  newPiece:  () => lang === "vi" ? `Tài liệu <span class="ital">mới</span>` : `<span class="ital">New</span> material`,
  editPiece: () => lang === "vi" ? `<span class="ital">Sửa</span> tài liệu` : `<span class="ital">Edit</span> material`,
  saving:    () => lang === "vi" ? "Đang lưu…" : "Saving…",
  save:      () => lang === "vi" ? "Lưu tài liệu" : "Save material",
  sending:   () => lang === "vi" ? "Đang gửi…" : "Sending…",
  sendLink:  () => lang === "vi" ? "Gửi magic link" : "Send magic link",
  files:     (n) => lang === "vi" ? `Tệp đính kèm (${n})` : `Files (${n})`,
  download:  () => lang === "vi" ? "Tải về" : "Download",
  noFiles:   () => lang === "vi" ? "Chưa có tệp đính kèm." : "No files attached.",
  noDesc:    () => lang === "vi" ? "<em>Chưa có mô tả.</em>" : "<em>No description.</em>",
  confirmDel:() => lang === "vi" ? "Xoá tài liệu này?" : "Delete this material?",
  deleted:   () => lang === "vi" ? "Đã xoá" : "Deleted",
  updated:   () => lang === "vi" ? "Đã cập nhật" : "Updated",
  added:     () => lang === "vi" ? "Đã thêm" : "Added",
  ownerOnly: () => lang === "vi" ? "Chỉ chủ trang mới upload được" : "Owner only",
  loadErr:   () => lang === "vi" ? "Lỗi tải dữ liệu" : "Failed to load",
  sent:      () => lang === "vi" ? "Đã gửi magic link — kiểm tra email" : "Magic link sent — check email",
  signedOut: () => lang === "vi" ? "Đã đăng xuất" : "Signed out",
  notOwner:  () => lang === "vi" ? "Email không phải chủ trang" : "Not the owner email",
  demoOwner: () => lang === "vi" ? "Demo owner mode BẬT" : "Demo owner mode ON",
  toAttach:  (n) => lang === "vi" ? `${n} tệp không phải ảnh → chuyển sang Đính kèm` : `${n} non-image file(s) → moved to Attachments`,
  emptyTitle:() => lang === "vi" ? "Kho tài liệu đang được cập nhật" : "The archive is being updated",
  emptyBody: () => lang === "vi" ? "Bài giảng, đề luyện và tài liệu sẽ sớm xuất hiện tại đây." : "Lectures, problem sets and materials will appear here soon.",
  loading:   () => lang === "vi" ? "Đang tải tài liệu…" : "Loading materials…",
};

const TYPE_LABELS = {
  vi: { lecture: "Bài giảng · Video", paper: "Đề & Lời giải · PDF", doc: "Ghi chú", sheet: "Bảng tính", code: "Code", folder: "Bộ sưu tập" },
  en: { lecture: "Lecture · Video", paper: "Problems · PDF", doc: "Notes", sheet: "Sheet", code: "Code", folder: "Folder" },
};
const typeLabel = (type) => (TYPE_LABELS[lang][type] || TYPE_LABELS[lang].doc);

function applyLang() {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-vi]").forEach((el) => {
    const val = el.dataset[lang];
    if (val != null) el.innerHTML = val;
  });
  document.querySelectorAll("[data-vi-ph]").forEach((el) => {
    const val = el.dataset[lang + "Ph"];
    if (val != null) el.setAttribute("placeholder", val);
  });
  document.querySelectorAll(".lang-toggle button").forEach((b) =>
    b.classList.toggle("active", b.dataset.lang === lang));
}
function setLang(next) {
  lang = next; localStorage.setItem("lang", lang);
  applyLang();
  if (typeof applyFilter === "function") applyFilter(); // repaint dynamic strings
}

/* ═══════════ Icons ═══════════ */
const ICON = {
  video:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="5 3 19 12 5 21" fill="currentColor" stroke="none"/></svg>',
  image:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="1.5" fill="currentColor"/><path d="M21 16l-5-5-9 9"/></svg>',
  pdf:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5"/></svg>',
  doc:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6M9 9h2"/></svg>',
  sheet:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>',
  code:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
  folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>',
  play:   '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20"/></svg>',
  file:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5"/></svg>',
};
const iconFor = (type) =>
  ICON[type === "paper" ? "pdf" : type === "lecture" ? "video" : type] || ICON.file;

/* ═══════════ Demo data (only used if Supabase keys are removed) ═══════════ */
const DEMO_PROJECTS = [
  { title: "Chuyên đề: <span class='ital'>Bất đẳng thức</span> & cực trị", desc: "Chuỗi bài giảng luyện HSG Toán — kỹ thuật AM-GM, Cauchy-Schwarz.", type: "lecture", meta: "8 buổi", tags: "HSG · Đại số", thumb: { kind: "lectureph", title: "Bất đẳng thức" }, featured: true },
  { title: "Bộ đề <span class='ital'>ôn thi chuyên Tin</span> PTNK", desc: "Tuyển tập đề & lời giải chi tiết, phân dạng theo chủ đề.", type: "paper", meta: "v2.1", tags: "Ôn thi · Chuyên", thumb: { kind: "pdf", title: "Đề ôn thi chuyên Tin" } },
  { title: "Ghi chú: <span class='ital'>Số học</span> đồng dư", desc: "Notes ngắn về đồng dư, định lý Fermat nhỏ, ứng dụng.", type: "doc", meta: "12 tr.", tags: "Số học", thumb: { kind: "doc" } },
  { title: "Bảng theo dõi <span class='ital'>tiến độ</span> học sinh", desc: "Điểm danh, điểm kiểm tra, mục tiêu từng tuần.", type: "sheet", meta: "live", tags: "Giảng dạy", thumb: { kind: "sheet" } },
  { title: "<span class='ital'>Monte-Carlo</span> định giá quyền chọn", desc: "Mô phỏng giá quyền chọn châu Âu bằng Python.", type: "code", meta: "Python", tags: "Tài chính định lượng", thumb: { kind: "code" } },
  { title: "Kho <span class='ital'>tài liệu</span> Olympiad", desc: "Tổng hợp đề IKMC, AMC, AMO các năm.", type: "folder", meta: "64 tệp", tags: "Archive", thumb: { kind: "folder" } },
];

/* ═══════════ Thumbnails ═══════════ */
function renderThumb(p) {
  const t = p.thumb;
  if (t.kind === "video") {
    return `<video autoplay muted loop playsinline poster="${t.poster || ""}"><source src="${t.src}" type="video/mp4" /></video><div class="play">${ICON.play}</div>`;
  }
  if (t.kind === "image") {
    const showPlay = p.type === "lecture";
    const safeType = (p.type || "doc").replace(/[^a-z]/gi, "");
    const safeTitle = (p.title || "").replace(/<[^>]+>/g, "").replace(/'/g, "&apos;");
    return `<img src="${t.src}" alt="" data-fallback-type="${safeType}" data-fallback-title="${safeTitle}" onerror="window.__thumbFallback&&window.__thumbFallback(this)"/>${showPlay ? `<div class="play">${ICON.play}</div>` : ""}`;
  }
  if (t.kind === "lectureph") {
    const title = (t.title || "Bài giảng").replace(/<[^>]+>/g, "");
    return `<div class="stack lectureph"><div class="play-big">${ICON.play}</div><div class="title">${title}</div></div>`;
  }
  if (t.kind === "doc") {
    return `<div class="stack doc"><div class="ln tall"></div><div class="ln med"></div><div class="ln"></div><div class="ln short"></div><div class="ln gap"></div><div class="ln med"></div><div class="ln"></div><div class="ln short"></div><div class="ln gap"></div><div class="ln med"></div><div class="ln short"></div></div>`;
  }
  if (t.kind === "pdf") {
    return `<div class="stack pdf"><div class="pdf-page"><h4>${t.title || "Tài liệu"}</h4><div class="ln m"></div><div class="ln s"></div><div class="ln m"></div><div class="ln m"></div><div class="ln s"></div><div style="height:8px"></div><div class="ln m"></div><div class="ln m"></div><div class="ln s"></div><div class="ln m"></div><div class="ln s"></div><div class="pageno">— 1 —</div></div></div>`;
  }
  if (t.kind === "sheet") {
    const cells = [`<div class="h"></div>`];
    ["A", "B", "C", "D"].forEach((c) => cells.push(`<div class="h">${c}</div>`));
    const data = [["1","HS","9.5","A","✓"],["2","HS","8.0","B","✓"],["3","HS","9.0","A","—"],["4","HS","7.5","B","✓"],["5","HS","10","A","✓"],["6","HS","8.5","A","—"],["7","HS","9.0","A","✓"],["8","HS","8.0","B","✓"]];
    data.forEach((row) => { cells.push(`<div class="row">${row[0]}</div>`); for (let i = 1; i < row.length; i++) cells.push(`<div>${row[i]}</div>`); });
    return `<div class="stack sheet"><div class="sheet-grid">${cells.join("")}</div></div>`;
  }
  if (t.kind === "code") {
    const py = `<span class="tok-c"># monte_carlo_option.py</span>
<span class="tok-k">import</span> numpy <span class="tok-k">as</span> np

<span class="tok-k">def</span> <span class="tok-f">price_call</span>(S, K, r, sig, T, n=<span class="tok-s">100_000</span>):
    z = np.random.standard_normal(n)
    ST = S * np.exp((r - <span class="tok-s">0.5</span>*sig**<span class="tok-s">2</span>)*T
                    + sig*np.sqrt(T)*z)
    payoff = np.maximum(ST - K, <span class="tok-s">0</span>)
    <span class="tok-k">return</span> np.exp(-r*T) * payoff.mean()`;
    return `<div class="stack code"><pre>${py}</pre></div>`;
  }
  if (t.kind === "folder") {
    const fileSvg = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5"/></svg>';
    const folderSvg = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>';
    const rows = [[folderSvg, "ikmc/"], [folderSvg, "amc-amo/"], [fileSvg, "de-2024.pdf"], [fileSvg, "loi-giai.pdf"], [fileSvg, "cong-thuc.md"], [fileSvg, "bang-diem.xlsx"]];
    return `<div class="stack folder">${rows.map((r) => `<div class="row">${r[0]}<span>${r[1]}</span></div>`).join("")}</div>`;
  }
  return "";
}
function defaultThumb(type, title) {
  if (type === "lecture") return { kind: "lectureph", title: title || "" };
  if (type === "paper")   return { kind: "pdf", title: (title || "").replace(/<[^>]+>/g, "").slice(0, 40) };
  if (["doc", "sheet", "code", "folder"].includes(type)) return { kind: type };
  return { kind: "doc" };
}

/* ═══════════ Cards & grid ═══════════ */
function renderCard(p, i, total) {
  const featured = (p.featured || (i === 0 && total > 4)) ? " featured" : "";
  const num = String(i + 1).padStart(2, "0");
  const thumb = p.thumb || defaultThumb(p.type, p.title);
  const pieceForThumb = { ...p, thumb };
  return `
    <article class="card${featured} reveal" data-type="${p.type}" data-id="${p.id || ""}" data-idx="${i}" style="transition-delay:${(i % 3) * 0.06}s">
      <div class="card-ctrls">
        <button class="edit-btn" aria-label="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4 12.5-12.5z"/></svg></button>
        <button class="del-btn" aria-label="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg></button>
      </div>
      <div class="thumb">
        <span class="typebadge">${iconFor(p.type)}${typeLabel(p.type)}</span>
        <span class="meta-tl">${p.meta || ""}</span>
        ${renderThumb(pieceForThumb)}
      </div>
      <div class="info">
        <h3>${p.title}</h3>
        <p class="desc" style="grid-column:1/-1;">${p.desc || ""}</p>
        <span class="tags">${p.tags || ""}</span>
        <span class="num">№ ${num}</span>
      </div>
    </article>`;
}

const grid = document.getElementById("grid");
const countEl = document.getElementById("count");

function paintGrid(items, label) {
  const cards = items.map((p, i) => renderCard(p, i, items.length)).join("");
  const empty = (items.length === 0 && state.loaded)
    ? `<div class="archive-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg><h3>${T.emptyTitle()}</h3><p>${T.emptyBody()}</p></div>`
    : "";
  grid.innerHTML = cards + empty + `
    <article class="card add-tile" id="addTile" role="button" tabindex="0">
      <div class="add-inner"><span class="plus">+</span>${T.addPiece()}</div>
    </article>`;
  countEl.textContent = label || T.count(items.length);
  document.querySelectorAll(".grid .reveal:not(.in)").forEach((el) => io.observe(el));
  grid.querySelectorAll(".card").forEach((card) => {
    if (card.classList.contains("add-tile")) return;
    const idx = parseInt(card.dataset.idx, 10);
    const piece = items[idx];
    const editBtn = card.querySelector(".edit-btn");
    const delBtn = card.querySelector(".del-btn");
    if (editBtn) editBtn.addEventListener("click", (e) => { e.stopPropagation(); openEditor(piece); });
    if (delBtn) delBtn.addEventListener("click", async (e) => { e.stopPropagation(); if (!confirm(T.confirmDel())) return; await deleteProject(piece); });
    card.addEventListener("click", () => openDetail(piece));
    card.style.cursor = "pointer";
  });
  const addTile = document.getElementById("addTile");
  if (addTile) {
    addTile.addEventListener("click", () => openEditor(null));
    addTile.addEventListener("keypress", (e) => { if (e.key === "Enter") openEditor(null); });
  }
}

/* ═══════════ Filters ═══════════ */
let activeFilter = "all";
function applyFilter() {
  const items = activeFilter === "all" ? state.projects : state.projects.filter((p) => p.type === activeFilter);
  let label;
  if (!state.loaded) label = T.loading();
  else label = activeFilter === "all" ? T.count(state.projects.length) : T.countIn(items.length, typeLabel(activeFilter));
  paintGrid(items, label);
}

/* ═══════════ Reveal on scroll ═══════════ */
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
}, { threshold: 0.12 });

/* ═══════════ State ═══════════ */
const state = { projects: [], loaded: false, isOwner: false, isDemo: false, sb: null, editing: null, pendingFiles: [], pendingCover: null, keepFiles: [], keepCover: null };

function showToast(msg, err) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.toggle("err", !!err);
  t.classList.add("on");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.remove("on"), 2600);
}
function bytes(n) {
  if (!n) return "";
  if (n < 1024) return n + " B";
  if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
  if (n < 1073741824) return (n / 1048576).toFixed(1) + " MB";
  return (n / 1073741824).toFixed(2) + " GB";
}

/* ═══════════ Storage layer (Supabase or localStorage demo) ═══════════ */
async function loadProjects() {
  if (state.sb) {
    const { data: projects, error } = await state.sb
      .from("projects").select("*, project_files(*)").order("created_at", { ascending: false });
    if (error) { console.error(error); showToast(T.loadErr(), true); return []; }
    return projects.map((p) => ({
      id: p.id, title: p.title, desc: p.description || "",
      type: p.tags && p.tags[0] ? p.tags[0] : "doc",
      tags: (p.tags || []).slice(1).join(" · "), meta: p.date || "",
      cover_url: p.cover_url || null,
      thumb: p.cover_url
        ? (/(mp4|webm|mov)$/i.test(p.cover_url) ? { kind: "video", src: p.cover_url, poster: "" } : { kind: "image", src: p.cover_url })
        : defaultThumb(p.tags && p.tags[0] ? p.tags[0] : "doc", p.title),
      files: p.project_files || [],
    }));
  }
  const raw = localStorage.getItem("demo_projects");
  if (!raw) return DEMO_PROJECTS.map((p, i) => ({ ...p, id: "demo-" + i, files: [] }));
  try { return JSON.parse(raw); } catch { return []; }
}
function saveDemoProjects() { localStorage.setItem("demo_projects", JSON.stringify(state.projects)); }

async function uploadToBucket(file, prefix) {
  const path = `${prefix}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
  const { error } = await state.sb.storage.from(CONFIG.STORAGE_BUCKET).upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
  if (error) throw error;
  const { data } = state.sb.storage.from(CONFIG.STORAGE_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

async function saveProject(form) {
  const tags = [form.type, ...form.tags.split(/[,·]/).map((s) => s.trim()).filter(Boolean)];
  let cover_url = state.keepCover;
  if (state.pendingCover) {
    cover_url = state.sb ? (await uploadToBucket(state.pendingCover, "covers")).url : await fileToDataURL(state.pendingCover);
  }
  if (state.sb) {
    let projectId = state.editing?.id;
    if (projectId) {
      await state.sb.from("projects").update({ title: form.title, description: form.desc, cover_url, tags, date: form.date }).eq("id", projectId);
      const keepIds = state.keepFiles.map((f) => f.id);
      const toDelete = (state.editing.files || []).filter((f) => !keepIds.includes(f.id));
      for (const f of toDelete) await state.sb.from("project_files").delete().eq("id", f.id);
    } else {
      const { data, error } = await state.sb.from("projects").insert({ title: form.title, description: form.desc, cover_url, tags, date: form.date }).select().single();
      if (error) throw error;
      projectId = data.id;
    }
    for (const f of state.pendingFiles) {
      const up = await uploadToBucket(f, "files");
      await state.sb.from("project_files").insert({ project_id: projectId, name: f.name, file_url: up.url, file_type: f.type, file_size: f.size });
    }
    return;
  }
  // demo
  const id = state.editing?.id || ("demo-" + Date.now());
  const newFiles = [];
  for (const f of state.pendingFiles) newFiles.push({ id: "f-" + Math.random().toString(36).slice(2, 9), name: f.name, file_url: await fileToDataURL(f), file_type: f.type, file_size: f.size });
  const newProj = {
    id, title: form.title, desc: form.desc, type: form.type,
    tags: tags.slice(1).join(" · "), meta: form.date, cover_url,
    thumb: cover_url ? (cover_url.startsWith("data:video") ? { kind: "video", src: cover_url, poster: "" } : { kind: "image", src: cover_url }) : defaultThumb(form.type),
    files: [...state.keepFiles, ...newFiles],
  };
  const idx = state.projects.findIndex((p) => p.id === id);
  if (idx >= 0) state.projects[idx] = newProj; else state.projects.unshift(newProj);
  saveDemoProjects();
}

async function deleteProject(p) {
  if (state.sb) {
    for (const f of (p.files || [])) {
      try {
        const u = new URL(f.file_url);
        const idx = u.pathname.indexOf("/" + CONFIG.STORAGE_BUCKET + "/");
        if (idx >= 0) {
          const path = decodeURIComponent(u.pathname.slice(idx + CONFIG.STORAGE_BUCKET.length + 2));
          await state.sb.storage.from(CONFIG.STORAGE_BUCKET).remove([path]);
        }
      } catch {}
    }
    await state.sb.from("projects").delete().eq("id", p.id);
  } else {
    state.projects = state.projects.filter((x) => x.id !== p.id);
    saveDemoProjects();
  }
  await refreshAndPaint();
  showToast(T.deleted());
}

function fileToDataURL(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
}
function refreshAndPaint() {
  loadProjects()
    .then((p) => { state.projects = p; state.loaded = true; applyFilter(); })
    .catch((e) => { console.error(e); state.loaded = true; applyFilter(); showToast(T.loadErr(), true); });
  // safety net: never leave the grid stuck on the loading state if the network stalls
  setTimeout(() => { if (!state.loaded) { state.loaded = true; applyFilter(); } }, 10000);
}

/* ═══════════ Auth ═══════════ */
async function checkAuth() {
  if (!state.sb) return;
  const { data: { session } } = await state.sb.auth.getSession();
  setOwner(session?.user?.email);
  state.sb.auth.onAuthStateChange((_e, sess) => { setOwner(sess?.user?.email); refreshAndPaint(); });
}
function setOwner(email) {
  state.isOwner = !!email && email.toLowerCase() === CONFIG.OWNER_EMAIL.toLowerCase();
  document.body.classList.toggle("owner-on", state.isOwner);
  document.getElementById("ownerBanner").classList.toggle("on", state.isOwner);
}
async function signIn(email) {
  if (!state.sb) {
    if (email.toLowerCase() === CONFIG.OWNER_EMAIL.toLowerCase()) { setOwner(email); showToast(T.demoOwner()); closeModal("authModal"); }
    else showToast(T.notOwner(), true);
    return;
  }
  const { error } = await state.sb.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + window.location.pathname } });
  if (error) { showToast("Lỗi: " + error.message, true); return; }
  showToast(T.sent()); closeModal("authModal");
}
async function signOut() { if (state.sb) await state.sb.auth.signOut(); setOwner(null); showToast(T.signedOut()); }

/* ═══════════ Modals ═══════════ */
function openModal(id) { document.getElementById(id).classList.add("on"); }
function closeModal(id) { document.getElementById(id).classList.remove("on"); }
document.querySelectorAll(".modal").forEach((m) => {
  m.addEventListener("click", (e) => { if (e.target === m) m.classList.remove("on"); });
  m.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => m.classList.remove("on")));
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape") document.querySelectorAll(".modal.on").forEach((m) => m.classList.remove("on")); });

/* ═══════════ Editor ═══════════ */
function openEditor(p) {
  if (!state.isOwner) { showToast(T.ownerOnly(), true); return; }
  state.editing = p || null;
  state.pendingFiles = []; state.pendingCover = null;
  state.keepFiles = p?.files ? [...p.files] : [];
  state.keepCover = p?.cover_url || null;
  document.getElementById("editorTitle").innerHTML = p ? T.editPiece() : T.newPiece();
  document.getElementById("deleteBtn").style.display = p ? "" : "none";
  document.getElementById("fId").value = p?.id || "";
  document.getElementById("fTitle").value = stripHTML(p?.title || "");
  document.getElementById("fDesc").value = p?.desc || "";
  document.getElementById("fType").value = p?.type || "lecture";
  document.getElementById("fTags").value = p?.tags || "";
  document.getElementById("fMeta").value = p?.meta || "";
  document.getElementById("fDate").value = "";
  renderPending();
  openModal("editorModal");
}
function stripHTML(s) { const d = document.createElement("div"); d.innerHTML = s; return d.textContent; }

function renderPending() {
  const coverEl = document.getElementById("coverPreview");
  if (state.keepCover) {
    coverEl.innerHTML = `<div class="file-row"><span class="fname">${state.keepCover.split("/").pop().slice(0, 60)}</span><button type="button" data-clear-cover>×</button></div>`;
    coverEl.querySelector("[data-clear-cover]").onclick = () => { state.keepCover = null; renderPending(); };
  } else if (state.pendingCover) {
    coverEl.innerHTML = `<div class="file-row"><span class="fname">${state.pendingCover.name}</span><span class="fsize">${bytes(state.pendingCover.size)}</span><button type="button" data-clear-cover>×</button></div>`;
    coverEl.querySelector("[data-clear-cover]").onclick = () => { state.pendingCover = null; renderPending(); };
  } else { coverEl.innerHTML = ""; }
  const fl = document.getElementById("filesPreview");
  const keepRows = state.keepFiles.map((f, i) => `<div class="file-row"><span class="fname">${f.name}</span><span class="fsize">${bytes(f.file_size)}</span><button type="button" data-keep-rm="${i}">×</button></div>`).join("");
  const newRows = state.pendingFiles.map((f, i) => `<div class="file-row"><span class="fname">${f.name} <em style="color:var(--accent);font-style:normal;">new</em></span><span class="fsize">${bytes(f.size)}</span><button type="button" data-pending-rm="${i}">×</button></div>`).join("");
  fl.innerHTML = keepRows + newRows;
  fl.querySelectorAll("[data-keep-rm]").forEach((b) => (b.onclick = () => { state.keepFiles.splice(+b.dataset.keepRm, 1); renderPending(); }));
  fl.querySelectorAll("[data-pending-rm]").forEach((b) => (b.onclick = () => { state.pendingFiles.splice(+b.dataset.pendingRm, 1); renderPending(); }));
}
function bindDrop(dropId, inputId, onFiles) {
  const drop = document.getElementById(dropId), inp = document.getElementById(inputId);
  drop.addEventListener("click", (e) => { if (e.target.tagName !== "INPUT") inp.click(); });
  drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("hover"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("hover"));
  drop.addEventListener("drop", (e) => { e.preventDefault(); drop.classList.remove("hover"); onFiles([...e.dataTransfer.files]); });
  inp.addEventListener("change", () => onFiles([...inp.files]));
}
function isCoverFile(f) { return /^(image|video)\//.test(f.type) || /\.(jpg|jpeg|png|gif|webp|mp4|webm|mov)$/i.test(f.name); }
bindDrop("coverDrop", "coverInput", (files) => {
  const covers = files.filter(isCoverFile), others = files.filter((f) => !isCoverFile(f));
  if (covers[0]) { state.pendingCover = covers[0]; state.keepCover = null; }
  if (others.length) { state.pendingFiles.push(...others); showToast(T.toAttach(others.length)); }
  renderPending();
});
bindDrop("filesDrop", "filesInput", (files) => { state.pendingFiles.push(...files); renderPending(); });

document.getElementById("editorForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const saveBtn = document.getElementById("saveBtn");
  saveBtn.disabled = true; saveBtn.textContent = T.saving();
  try {
    await saveProject({
      title: document.getElementById("fTitle").value.trim(),
      desc: document.getElementById("fDesc").value.trim(),
      type: document.getElementById("fType").value,
      tags: document.getElementById("fTags").value.trim(),
      date: document.getElementById("fMeta").value.trim() || document.getElementById("fDate").value.trim(),
    });
    closeModal("editorModal");
    showToast(state.editing ? T.updated() : T.added());
    await refreshAndPaint();
  } catch (err) { console.error(err); showToast("Lỗi: " + (err.message || "save failed"), true); }
  finally { saveBtn.disabled = false; saveBtn.textContent = T.save(); }
});
document.getElementById("deleteBtn").addEventListener("click", async () => {
  if (!state.editing) return;
  if (!confirm(T.confirmDel())) return;
  await deleteProject(state.editing); closeModal("editorModal");
});

/* ═══════════ Detail modal ═══════════ */
function openDetail(p) {
  if (!p) return;
  const body = document.getElementById("detailBody");
  const isVideo = p.cover_url && (/(mp4|webm|mov)$/i.test(p.cover_url) || p.cover_url.startsWith("data:video"));
  const isImage = p.cover_url && (/\.(jpg|jpeg|png|gif|webp)$/i.test(p.cover_url) || p.cover_url.startsWith("data:image") || /\/storage\/v1\/object\/public\/[^?]+\.(jpg|jpeg|png|gif|webp)/i.test(p.cover_url));
  let cover = "";
  if (isVideo) cover = `<video class="detail-cover" controls src="${p.cover_url}"></video>`;
  else if (isImage) cover = `<img class="detail-cover" src="${p.cover_url}" alt="" onerror="this.style.display='none'"/>`;
  const fileRows = (p.files || []).map((f) => `<div class="file-row"><span class="fname">${f.name}</span><span class="fsize">${bytes(f.file_size)}</span><a href="${f.file_url}" target="_blank" rel="noopener" download>${T.download()}</a></div>`).join("");
  body.innerHTML = `
    ${cover}
    <div class="detail-meta">${typeLabel(p.type)}${p.meta ? " · " + p.meta : ""}${p.tags ? " · " + p.tags : ""}</div>
    <h3>${p.title}</h3>
    <p class="detail-desc">${p.desc || T.noDesc()}</p>
    <div class="detail-files"><h4>${T.files((p.files || []).length)}</h4>${fileRows || `<p style="font-family:var(--serif);font-style:italic;color:var(--muted);">${T.noFiles()}</p>`}</div>`;
  openModal("detailModal");
}

/* ═══════════ Sign-in / out ═══════════ */
document.getElementById("ownerSignin").addEventListener("click", (e) => { e.preventDefault(); document.getElementById("authEmail").value = ""; openModal("authModal"); });
document.getElementById("authForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("authEmail").value.trim();
  if (!email) return;
  const btn = document.getElementById("authSubmit");
  btn.disabled = true; btn.textContent = T.sending();
  try { await signIn(email); } finally { btn.disabled = false; btn.textContent = T.sendLink(); }
});
document.getElementById("signOutBtn").addEventListener("click", signOut);

/* ═══════════ Image fallback → procedural thumb ═══════════ */
window.__thumbFallback = function (imgEl) {
  const type = imgEl.dataset.fallbackType || "doc";
  const title = imgEl.dataset.fallbackTitle || "";
  const html = renderThumb({ type, title, thumb: defaultThumb(type, title) });
  const thumb = imgEl.closest(".thumb") || imgEl.parentElement;
  if (thumb) {
    const overlays = [...thumb.querySelectorAll(".typebadge, .meta-tl, .play")].map((n) => n.outerHTML).join("");
    thumb.innerHTML = overlays + html;
  }
};

/* ═══════════ Nav / burger / language ═══════════ */
const nav = document.getElementById("nav");
window.addEventListener("scroll", () => nav.classList.toggle("scrolled", window.scrollY > 60), { passive: true });
nav.classList.toggle("scrolled", window.scrollY > 60);

document.querySelectorAll(".lang-toggle button").forEach((b) => b.addEventListener("click", () => setLang(b.dataset.lang)));
const burger = document.getElementById("navBurger");
if (burger) burger.addEventListener("click", () => document.getElementById("navLinks").classList.toggle("open"));
document.querySelectorAll("#navLinks a").forEach((a) => a.addEventListener("click", () => document.getElementById("navLinks").classList.remove("open")));

/* ═══════════ Bootstrap ═══════════ */
(async function init() {
  applyLang();
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
  document.querySelectorAll(".filters .chip").forEach((c) =>
    c.addEventListener("click", () => {
      document.querySelectorAll(".filters .chip").forEach((x) => x.classList.remove("active"));
      c.classList.add("active"); activeFilter = c.dataset.f; applyFilter();
    }));
  applyFilter(); // paint immediately (loading state) — UI never blocks on the network
  if (CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY && window.supabase) {
    state.sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    state.isDemo = false;
    checkAuth().catch((e) => console.error(e)); // don't block first paint on auth
  } else { state.isDemo = true; }
  await refreshAndPaint();
})();
