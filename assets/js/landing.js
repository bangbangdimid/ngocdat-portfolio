/* ============================================================
   landing.js - home page behaviour (index.html)
   Motion follows the ocean-kit starter: fish cursor + bubble trail,
   click ripples, scroll-driven dive (frame sequence on canvas),
   gentle parallax. Everything degrades for touch / reduced motion.
   Requires: config.js
   ============================================================ */
(function () {
  const CFG = window.APP_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(pointer: fine)").matches;
  const isNarrow = () => innerWidth <= 680;

  /* ---------- contact links: config is the single source of truth ---------- */
  const phone = (CFG.CONTACT_PHONE || "").replace(/[^\d+]/g, "");
  if (phone) document.querySelectorAll("[data-call]").forEach((a) => (a.href = "tel:" + phone));
  if (CFG.ZALO_URL) document.querySelectorAll("[data-zalo]").forEach((a) => (a.href = CFG.ZALO_URL));

  /* ---------- navigation: burger + scroll-spy ---------- */
  const links = $("navLinks"), burger = $("navBurger");
  burger.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    burger.setAttribute("aria-expanded", String(open));
  });
  links.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => {
    links.classList.remove("open"); burger.setAttribute("aria-expanded", "false");
  }));
  const navMap = new Map([...links.querySelectorAll('a[href^="#"]')].map((a) => [a.getAttribute("href").slice(1), a]));
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      navMap.forEach((a) => a.removeAttribute("aria-current"));
      navMap.get(e.target.id)?.setAttribute("aria-current", "true");
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  navMap.forEach((_, id) => { const s = $(id); if (s) spy.observe(s); });

  /* ---------- reveal on scroll ---------- */
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); revealIO.unobserve(e.target); } });
  }, { threshold: 0.12 });
  const observeReveals = (root) => (root || document).querySelectorAll(".reveal:not(.in)").forEach((el) => revealIO.observe(el));
  observeReveals();

  /* ---------- parallax for decorative sea creatures ---------- */
  // uses the individual `translate` property so it composes with CSS bob animations
  const parallaxEls = reduceMotion ? [] : [...document.querySelectorAll("[data-parallax]")];
  let parallaxQueued = false;
  function updateParallax() {
    parallaxQueued = false;
    const mid = innerHeight / 2;
    parallaxEls.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > innerHeight + 200) return;
      el.style.translate = `0 ${((r.top + r.height / 2 - mid) * parseFloat(el.dataset.parallax)).toFixed(1)}px`;
    });
  }
  if (parallaxEls.length) {
    addEventListener("scroll", () => { if (!parallaxQueued) { parallaxQueued = true; requestAnimationFrame(updateParallax); } }, { passive: true });
    updateParallax();
  }

  /* ---------- background videos: play only while visible ---------- */
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const videoIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const v = e.target;
      if (e.isIntersecting) {
        if (v.dataset.lazyVideo !== undefined && v.preload === "none") { v.preload = "auto"; v.load(); }
        v.play().catch(() => {});
      } else v.pause();
    });
  }, { rootMargin: "200px 0px" });
  if (!reduceMotion) {
    document.querySelectorAll(".hero-video, [data-lazy-video]").forEach((v) => {
      if (v.dataset.alpha !== undefined && isSafari) { v.remove(); return; } // Safari: no alpha WebM
      videoIO.observe(v);
    });
  }

  /* ---------- fish cursor: bubble ring, trail, click ripple ---------- */
  if (finePointer && !reduceMotion) {
    const ring = $("cursorRing");
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, lastTrail = 0, active = false;
    addEventListener("mousemove", (e) => {
      mx = e.clientX; my = e.clientY;
      const now = performance.now();
      if (now - lastTrail > 70) {
        lastTrail = now;
        const b = document.createElement("div");
        b.className = "cursor-trail"; b.style.left = mx + 10 + "px"; b.style.top = my + 12 + "px";
        document.body.appendChild(b); setTimeout(() => b.remove(), 900);
      }
      if (!active) { active = true; requestAnimationFrame(loop); }
    }, { passive: true });
    addEventListener("click", (e) => {
      const r = document.createElement("div");
      r.className = "cursor-ripple"; r.style.left = e.clientX + "px"; r.style.top = e.clientY + "px";
      document.body.appendChild(r); setTimeout(() => r.remove(), 700);
    });
    document.addEventListener("mouseover", (e) => ring.classList.toggle("big", !!e.target.closest("a, button, [role='button']")));
    function loop() { // lerp gives a "floating in water" lag
      rx += (mx - rx) * 0.15; ry += (my - ry) * 0.15;
      const s = ring.offsetWidth / 2;
      ring.style.transform = `translate(${rx - s}px, ${ry - s}px)`;
      if (Math.abs(mx - rx) + Math.abs(my - ry) > 0.5) requestAnimationFrame(loop); else active = false;
    }
  } else {
    document.body.classList.remove("ocean-cursor");
    $("cursorRing")?.remove();
  }

  /* ---------- scroll dive: 180 frames drawn on a sticky canvas ---------- */
  (function dive() {
    const section = $("dive"), canvas = $("diveCanvas");
    const captions = [...section.querySelectorAll(".dive-caption")];
    if (reduceMotion || isNarrow()) return; // CSS shows the static image + stacked captions
    const ctx = canvas.getContext("2d");
    const N = 180, frames = new Array(N);
    let loaded = false, current = -1, queued = false;
    const src = (i) => `assets/ocean/frames/dive_${String(i).padStart(3, "0")}.webp`;
    function load() {
      if (loaded) return; loaded = true;
      for (let i = 0; i < N; i++) { const img = new Image(); img.decoding = "async"; img.src = src(i); frames[i] = img; }
      frames[0].onload = () => draw(0);
    }
    function draw(i) {
      const img = frames[i];
      if (!img || !img.complete || !img.naturalWidth) return false;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height); current = i; return true;
    }
    function update() {
      queued = false;
      const r = section.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)));
      const i = Math.round(p * (N - 1));
      if (i !== current && !draw(i)) { for (let k = i; k >= 0; k--) if (draw(k)) break; } // nearest decoded frame
      const step = p < 0.04 || p > 0.97 ? -1 : Math.min(2, Math.floor(p * 3));
      captions.forEach((c, k) => c.classList.toggle("on", k === step));
    }
    new IntersectionObserver((es) => { if (es[0].isIntersecting) load(); }, { rootMargin: "100% 0px" }).observe(section);
    addEventListener("scroll", () => { if (loaded && !queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
  })();

  /* ---------- modals ---------- */
  let lastFocus = null;
  function openModal(m) { lastFocus = document.activeElement; m.classList.add("on"); m.querySelector("[data-close]")?.focus(); document.body.style.overflow = "hidden"; }
  function closeModal(m) {
    m.classList.remove("on"); document.body.style.overflow = "";
    if (m.id === "videoModal") { const v = $("videoPlayer"); v.pause(); v.removeAttribute("src"); v.load(); m.querySelector("iframe")?.remove(); v.hidden = false; }
    if (m.id === "docModal") $("docFrame").removeAttribute("src");
    lastFocus?.focus?.();
  }
  document.querySelectorAll(".modal").forEach((m) => {
    m.addEventListener("click", (e) => { if (e.target === m) closeModal(m); });
    m.querySelector("[data-close]").addEventListener("click", () => closeModal(m));
  });
  addEventListener("keydown", (e) => { if (e.key === "Escape") document.querySelectorAll(".modal.on").forEach(closeModal); });

  // document preview: phones and tablets handle PDFs better in their own viewer
  function openDoc(url, title) {
    if (!finePointer || innerWidth < 900) { window.open(url, "_blank", "noopener"); return; }
    $("docTitle").textContent = title;
    $("docDownload").href = url;
    $("docFrame").src = url + "#view=FitH";
    openModal($("docModal"));
  }
  function openVideo(src, title) {
    $("videoTitle").textContent = title;
    const v = $("videoPlayer"); v.src = src;
    openModal($("videoModal")); v.play().catch(() => {});
  }
  function openYouTube(id, title) {
    const m = $("videoModal"), v = $("videoPlayer");
    $("videoTitle").textContent = title; v.hidden = true;
    const f = document.createElement("iframe");
    f.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0&modestbranding=1&autoplay=1`;
    f.title = title; f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen"; f.allowFullscreen = true;
    f.style.cssText = "width:100%;aspect-ratio:16/9;border:0";
    m.querySelector(".modal-box").appendChild(f);
    openModal(m);
  }
  document.addEventListener("click", (e) => {
    const d = e.target.closest("[data-doc]");
    if (d) { e.preventDefault(); openDoc(d.dataset.doc, d.dataset.title || ""); return; }
    const v = e.target.closest("[data-video]");
    if (v) { e.preventDefault(); openVideo(v.dataset.video, v.dataset.title || ""); return; }
    const y = e.target.closest("[data-youtube]");
    if (y) { e.preventDefault(); openYouTube(y.dataset.youtube, y.dataset.title || ""); }
  });

  /* ---------- testimonials (only real quotes from config) ---------- */
  (function testimonials() {
    const list = (CFG.TESTIMONIALS || []).filter((t) => t && t.name && t.quote && t.quote.trim());
    if (!list.length) return;
    $("quotes").innerHTML = list.map((t, i) => `
      <figure class="quote-card reveal d${i % 3}">
        <blockquote class="quote-bubble sketch-card"><span class="mark" aria-hidden="true">“</span><p>${esc(t.quote)}</p></blockquote>
        <figcaption class="quote-who">
          <span class="avatar" aria-hidden="true">${esc(t.name.trim().split(/\s+/).pop().charAt(0))}</span>
          <span><span class="name">${esc(t.name)}</span><br />${t.badge ? `<span class="badge">${esc(t.badge)}</span>` : ""}</span>
        </figcaption>
      </figure>`).join("");
    $("cam-nhan").hidden = false;
    $("navQuotes").hidden = false;
    navMap.set("cam-nhan", $("navQuotes").querySelector("a")); spy.observe($("cam-nhan"));
    observeReveals($("cam-nhan"));
  })();

  /* ---------- extra samples published by the admin (lazy Supabase) ---------- */
  // Free samples the teacher marks "Công khai (mẫu)" in the admin panel are appended
  // here. Supabase is loaded only when the visitor scrolls near this section.
  (function classroomSamples() {
    const section = $("mau");
    if (!section || !CFG.SUPABASE_URL) return;
    const io = new IntersectionObserver(async (es) => {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      try {
        await loadScript("assets/vendor/supabase-js-2.117.2.js");
        const sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, { auth: { persistSession: false } });
        const { data, error } = await sb.from("materials")
          .select("id,kind,title,description,youtube_id,storage_path,sort_order,courses(title,is_published)")
          .eq("visibility", "sample").order("sort_order").order("created_at");
        if (error) throw error;
        const items = (data || []).filter((m) => m.courses && m.courses.is_published);
        renderExtraSamples(items, sb);
      } catch (err) { console.error("classroom samples:", err); }
    }, { rootMargin: "600px 0px" });
    io.observe(section);
  })();

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (window.supabase) return resolve();
      const s = document.createElement("script"); s.src = src; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function renderExtraSamples(items, sb) {
    const videos = items.filter((m) => m.kind === "video" && m.youtube_id);
    const docs = items.filter((m) => m.kind === "doc" && m.storage_path);
    const lessons = $("lessons");
    videos.forEach((m) => lessons.insertAdjacentHTML("beforeend", `
      <button class="lesson-card reveal" type="button" data-youtube="${esc(m.youtube_id)}" data-title="${esc(m.title)}">
        <div class="phone" style="aspect-ratio:16/10"><img src="https://i.ytimg.com/vi/${encodeURIComponent(m.youtube_id)}/hqdefault.jpg" alt="" loading="lazy" referrerpolicy="no-referrer" /><span class="play"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg></span></div>
        <div class="lesson-meta"><span class="for">${esc(m.courses.title)}</span><h4>${esc(m.title)}</h4>${m.description ? `<p>${esc(m.description)}</p>` : ""}</div>
      </button>`));
    const docsGrid = document.querySelector(".docs");
    docs.forEach((m) => {
      docsGrid.insertAdjacentHTML("beforeend", `
        <article class="doc sketch-card reveal">
          <div class="doc-body">
            <span class="for">${esc(m.courses.title)}</span>
            <h4>${esc(m.title)}</h4>${m.description ? `<p>${esc(m.description)}</p>` : "<p></p>"}
            <div class="doc-actions"><button class="btn primary sm" type="button" data-storage="${esc(m.storage_path)}" data-title="${esc(m.title)}">Mở tài liệu</button></div>
          </div>
        </article>`);
    });
    docsGrid.addEventListener("click", async (e) => {
      const b = e.target.closest("[data-storage]");
      if (!b) return;
      b.disabled = true;
      const { data, error } = await sb.storage.from(CFG.STORAGE_BUCKET).createSignedUrl(b.dataset.storage, 600);
      b.disabled = false;
      if (error || !data?.signedUrl) { alert("Không mở được tài liệu. Vui lòng thử lại."); return; }
      window.open(data.signedUrl, "_blank", "noopener");
    });
    observeReveals($("mau"));
  }
})();
