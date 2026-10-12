/* ============================================================
   i18n.js — shared bilingual (VI/EN) helper used by every page.
   Markup carries data-vi / data-en (innerHTML) and
   data-vi-ph / data-en-ph (placeholders). Choice persists in localStorage.
   ============================================================ */
(function () {
  function getLang() {
    try { return localStorage.getItem("lang") || "vi"; } catch { return "vi"; }
  }
  function setLang(next) {
    try { localStorage.setItem("lang", next); } catch {}
    apply(next);
    document.dispatchEvent(new CustomEvent("langchange", { detail: { lang: next } }));
  }
  function apply(lang) {
    lang = lang || getLang();
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-vi]").forEach((el) => {
      const val = el.dataset[lang];
      if (val != null) el.innerHTML = val;
    });
    document.querySelectorAll("[data-vi-ph]").forEach((el) => {
      const val = el.dataset[lang + "Ph"];
      if (val != null) el.setAttribute("placeholder", val);
    });
    document.querySelectorAll(".lang-toggle button[data-lang]").forEach((b) =>
      b.classList.toggle("active", b.dataset.lang === lang));
  }
  function wire() {
    document.querySelectorAll(".lang-toggle button[data-lang]").forEach((b) =>
      b.addEventListener("click", () => setLang(b.dataset.lang)));
  }
  // pick the right string for the current language
  function t(vi, en) { return getLang() === "vi" ? vi : en; }

  window.I18N = { getLang, setLang, apply, wire, t };

  document.addEventListener("DOMContentLoaded", () => { apply(); wire(); });
})();
