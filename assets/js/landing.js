/* ============================================================
   landing.js — public home page behaviour (index.html)
   - nav scroll state, mobile menu, reveal-on-scroll
   - contact button (phone from config, email fallback)
   - published courses + free sample lessons for parents
   Sample content is readable by anonymous visitors only because RLS
   allows visibility='sample'; everything else stays hidden server-side.
   Requires: config.js, i18n.js (+ supabaseClient.js for the catalogue)
   ============================================================ */
(function () {
  const CFG = window.APP_CONFIG || {};
  const t = window.I18N.t;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- nav / menu / reveal ---------- */
  const nav = $("nav");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 60);
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

  const links = $("navLinks");
  $("navBurger")?.addEventListener("click", () => links.classList.toggle("open"));
  links.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => links.classList.remove("open")));

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  const observeReveals = (root) => (root || document).querySelectorAll(".reveal:not(.in)").forEach((el) => io.observe(el));
  observeReveals();

  /* ---------- contact button ---------- */
  function wireContact() {
    const phone = (CFG.CONTACT_PHONE || "").trim();
    const email = CFG.CONTACT_EMAIL || "";
    document.querySelectorAll("[data-contact]").forEach((a) => {
      if (phone) {
        a.href = "tel:" + phone.replace(/[^\d+]/g, "");
        a.dataset.vi = "Gọi: " + phone;
        a.dataset.en = "Call: " + phone;
      } else {
        a.href = "mailto:" + email + "?subject=" + encodeURIComponent("Đăng ký học Toán");
        a.dataset.vi = "Nhắn email đăng ký";
        a.dataset.en = "Email to enrol";
      }
    });
    window.I18N.apply();
  }
  wireContact();

  /* ---------- catalogue (courses + samples) ---------- */
  const state = { courses: [], samples: [], loaded: false };
  const ICON_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
  const ICON_DOC = '<svg class="doc-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>';

  function renderCourses() {
    const box = $("pubCourses"), wrap = $("coursesBlock");
    if (!state.courses.length) { wrap.style.display = "none"; return; }
    wrap.style.display = "";
    box.innerHTML = state.courses.map((c, i) => `
      <article class="pub-course reveal">
        <span class="no">${String(i + 1).padStart(2, "0")}</span>
        <h4>${esc(c.title)}</h4>
        <p>${esc(c.description) || t("Lộ trình chi tiết sẽ được tư vấn trực tiếp.", "Details are shared during consultation.")}</p>
        <a class="btn ghost go" href="#work">${t("Đăng ký khoá này", "Enrol in this course")}</a>
      </article>`).join("");
    observeReveals(box);
  }

  function renderSamples() {
    const box = $("samplesGrid"), wrap = $("samplesBlock");
    if (!state.samples.length) { wrap.style.display = "none"; return; }
    wrap.style.display = "";
    box.innerHTML = state.samples.map((m, i) => {
      const isVideo = m.kind === "video";
      const thumb = isVideo && m.youtube_id
        ? `<img src="https://i.ytimg.com/vi/${encodeURIComponent(m.youtube_id)}/hqdefault.jpg" alt="" loading="lazy" referrerpolicy="no-referrer" /><span class="play">${ICON_PLAY}</span>`
        : ICON_DOC;
      return `
        <button type="button" class="sample reveal" data-idx="${i}">
          <span class="s-thumb">${thumb}</span>
          <span class="s-body">
            <span class="s-course">${esc(m.courses?.title || "")}</span>
            <span class="s-title" style="display:block">${esc(m.title)}</span>
            <span class="s-kind" style="display:block">${isVideo ? t("Video bài giảng mẫu", "Sample lecture video") : t("Tài liệu mẫu", "Sample document")}</span>
          </span>
        </button>`;
    }).join("");
    box.querySelectorAll(".sample").forEach((b) => b.addEventListener("click", () => openSample(state.samples[+b.dataset.idx], b)));
    observeReveals(box);
  }

  function renderCatalogue() {
    renderCourses();
    renderSamples();
    $("catalogueEmpty").style.display = state.loaded && !state.courses.length && !state.samples.length ? "" : "none";
  }

  /* ---------- sample viewers ---------- */
  const modal = $("videoModal");
  function closeVideo() { modal.classList.remove("on"); $("videoFrame").innerHTML = ""; }
  modal.addEventListener("click", (e) => { if (e.target === modal) closeVideo(); });
  modal.querySelector("[data-close]").addEventListener("click", closeVideo);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && modal.classList.contains("on")) closeVideo(); });

  async function openSample(m, btn) {
    if (m.kind === "video") {
      $("videoFrame").innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(m.youtube_id)}?rel=0&modestbranding=1&autoplay=1"
        title="${esc(m.title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
      $("videoTitle").textContent = m.title;
      modal.classList.add("on");
      return;
    }
    // document: short-lived signed URL (anon is allowed only for samples/)
    btn.disabled = true;
    try {
      const { data, error } = await window.sb.storage.from(CFG.STORAGE_BUCKET).createSignedUrl(m.storage_path, 600);
      if (error || !data?.signedUrl) throw error || new Error("no url");
      window.open(data.signedUrl, "_blank", "noopener");
    } catch (e) {
      console.error(e);
      alert(t("Không mở được tài liệu mẫu. Vui lòng thử lại.", "Could not open the sample. Please try again."));
    } finally { btn.disabled = false; }
  }

  async function loadCatalogue() {
    if (!window.sb) { state.loaded = true; renderCatalogue(); return; }
    try {
      const [cRes, mRes] = await Promise.all([
        window.sb.from("courses").select("id,title,description,sort_order").eq("is_published", true)
          .order("sort_order").order("created_at", { ascending: false }),
        window.sb.from("materials").select("id,kind,title,youtube_id,storage_path,sort_order,courses(title,is_published)")
          .eq("visibility", "sample").order("sort_order").order("created_at"),
      ]);
      state.courses = cRes.error ? [] : (cRes.data || []);
      // hide samples whose course is unpublished (RLS returns courses = null for those)
      state.samples = mRes.error ? [] : (mRes.data || []).filter((m) => m.courses && m.courses.is_published);
      if (cRes.error || mRes.error) console.error(cRes.error || mRes.error);
    } catch (e) {
      console.error(e);
    }
    state.loaded = true;
    renderCatalogue();
  }

  document.addEventListener("langchange", () => { wireContact(); renderCatalogue(); });
  loadCatalogue();
})();
