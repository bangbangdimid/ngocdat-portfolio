/* ============================================================
   doc-preview.js - shared in-page document reader (window.DocPreview)
   Used by the home page, the admin panel and the course viewer.

   PDFs are drawn on canvases with the self-hosted pdf.js: the browser's
   built-in viewer cannot be framed reliably (Chrome blocks it under strict
   headers, phones download instead). Pages render as they scroll near and
   release their bitmap when far away, so long documents keep memory flat.

   DocPreview.mount(box, url, { downloadUrl })  -> { destroy() }
   DocPreview.fileKind("path/file.pdf")        -> "pdf" | "image" | "video" | "audio" | "other"
   ============================================================ */
(function () {
  const PDFJS_DIR = new URL("assets/vendor/pdfjs-6.3.289/", document.baseURI).href;
  const MAX_DPR = 2;
  let libPromise = null;

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function loadLib() {
    if (!libPromise) {
      libPromise = import(PDFJS_DIR + "pdf.min.mjs")
        .then((lib) => { lib.GlobalWorkerOptions.workerSrc = PDFJS_DIR + "pdf.worker.min.mjs"; return lib; })
        .catch((err) => { libPromise = null; throw err; }); // allow a retry after a network hiccup
    }
    return libPromise;
  }

  function fileKind(path) {
    const ext = (String(path || "").split("?")[0].match(/\.([a-z0-9]+)$/i) || [])[1]?.toLowerCase();
    if (ext === "pdf") return "pdf";
    if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "image";
    if (ext === "mp4") return "video";
    if (ext === "mp3") return "audio";
    return "other";
  }

  function note(box, text, downloadUrl) {
    box.innerHTML = `<p class="pdf-note">${esc(text)}${downloadUrl
      ? ` <a class="btn primary sm" href="${esc(downloadUrl)}" target="_blank" rel="noopener" download>Tải về</a>` : ""}</p>`;
  }

  function release(slot) {
    const c = slot.querySelector("canvas");
    if (c) { c.width = c.height = 0; c.remove(); }
  }

  async function renderPage(s, slot) {
    if (slot.querySelector("canvas") || slot.dataset.busy || !slot.clientWidth) return;
    slot.dataset.busy = "1";
    try {
      const page = await s.doc.getPage(+slot.dataset.page);
      if (s.closed) return;
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const viewport = page.getViewport({ scale: (slot.clientWidth * dpr) / page.getViewport({ scale: 1 }).width });
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width); canvas.height = Math.floor(viewport.height);
      await page.render({ canvas, viewport }).promise;
      if (!s.closed && slot.isConnected) slot.prepend(canvas);
    } catch (err) {
      if (!s.closed) console.error("pdf page:", err);
    } finally { delete slot.dataset.busy; }
  }

  async function layout(box, s) {
    const first = await s.doc.getPage(1);
    const base = first.getViewport({ scale: 1 });
    box.innerHTML = "";
    for (let n = 1; n <= s.doc.numPages; n++) { // placeholders keep the scrollbar honest before rendering
      const slot = document.createElement("div");
      slot.className = "pdf-page"; slot.dataset.page = n;
      slot.style.aspectRatio = `${base.width} / ${base.height}`;
      slot.innerHTML = `<span class="pdf-num">${n} / ${s.doc.numPages}</span>`;
      box.appendChild(slot);
    }
    box.scrollTop = 0;
    s.io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) renderPage(s, e.target); else release(e.target);
    }), { root: box, rootMargin: "120% 0px" });
    box.querySelectorAll(".pdf-page").forEach((slot) => s.io.observe(slot));
  }

  function mount(box, url, opts) {
    const o = opts || {};
    const s = { closed: false, task: null, doc: null, io: null };
    box.classList.add("pdf-pages");
    if (!box.hasAttribute("tabindex")) box.tabIndex = 0;
    note(box, "Đang mở tài liệu…");
    (async () => {
      try {
        const lib = await loadLib();
        if (s.closed) return;
        s.task = lib.getDocument({ url, enableXfa: false });
        const doc = await s.task.promise;
        if (s.closed) { doc.destroy(); return; }
        s.doc = doc;
        await layout(box, s);
      } catch (err) {
        if (s.closed) return;
        console.error("pdf preview:", err);
        note(box, "Không xem trước được tài liệu này trên trình duyệt.", o.downloadUrl || url);
      }
    })();
    return {
      destroy() {
        if (s.closed) return;
        s.closed = true;
        s.io?.disconnect();
        s.task?.destroy();
        box.querySelectorAll(".pdf-page").forEach(release);
        box.innerHTML = "";
      },
    };
  }

  window.DocPreview = { mount, fileKind };
})();
