/* ============================================================
   typo.js - Vietnamese line-break hygiene (window.Typo)

   Vietnamese is written in single syllables separated by spaces, so a browser
   happily breaks "toàn / quốc" or "TP. Hồ Chí / Minh". This joins the syllables
   of a word with a no-break space so a line breaks BETWEEN words where it can:
     1. words of 2-3 syllables from vi-words.js (tools/build-words.js; longest first)
     2. short names and set phrases (TP. Hồ Chí Minh, Huy chương Vàng ...)
     3. numbers with the word they belong to (lớp 10, Toán 9, 6-12, 25 trang)

   Even right edges matter more than keeping every long phrase on one line, so
   chunks are capped (MAX_SYLLABLES, MAX_CHUNK): a chunk that cannot fit at the
   end of a line pushes the whole chunk down and leaves a short line behind.
   Long names ("Đại học Ngoại thương") are therefore bound word by word, not whole.
   After binding, balance.js evens out the line lengths of every block.

   It only rewrites text nodes, so markup, links and events are untouched.
   Typo.apply(root) can be called again after content is rendered dynamically.
   ============================================================ */
(function () {
  const NB = "\u00a0";
  const WJ = String.fromCharCode(0x2060); // word joiner: forbids a break and renders nothing
  const MAX_SYLLABLES = 3;
  const MAX_CHUNK = 16; // characters: longer set phrases are left to the word list

  // multi-syllable words: "toàn quốc", "bản chất", "bài kiểm tra" ...
  const WORDS = new Set((window.VI_WORDS || "").split("|").filter(Boolean));

  // short names and phrases the word list cannot express (capitalised, with hyphens or commas)
  const KEEP = [
    "TP. Hồ Chí Minh", "Hồ Chí Minh", "Lê Hồng Phong", "Sinh viên", "Giải Nhất", "Giải Ba", "Ngày Nhà giáo", "Việt Nam",
    "Toán học", "Ngọc Đạt", "Quang Khôi", "Đông Nghi", "Hải Đăng", "Cloudflare", "PiiSE - PTNK",
  ].filter((p) => p.length <= MAX_CHUNK).map((p) => ({
    re: new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, " +"), "g"),
    // a hyphen allows a break right after it even before a no-break space, so add a word joiner
    to: p.replace(/ - /g, NB + "-" + WJ + NB).replace(/ /g, NB),
  }));

  const SKIP = "script, style, textarea, pre, code, [data-notypo], .pdf-pages";

  // Body text is justified (flush on both sides). In justified text every possible line break matters,
  // so compound words are NOT glued here: justify.js glues only the ones that would really be split.
  // Keep this list in step with the justified-text rule in base.css.
  const JUSTIFY_SEL = ".sec p, .sec dd, .sec li > span:not(.tick), .contact-card p, .hero-sub, .lesson-meta p";

  function textNodes(root) {
    const list = [];
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.nodeValue.trim() && !(n.parentElement && n.parentElement.closest(SKIP))) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
    });
    while (w.nextNode()) list.push(w.currentNode);
    return list;
  }

  // "Cực hạn, bất biến" -> binds "cực hạn" and "bất biến": longest dictionary word first
  function bindWords(text) {
    if (!WORDS.size) return text;
    return text.replace(/\p{L}+(?: \p{L}+)+/gu, (run) => {
      const syl = run.split(" "), low = syl.map((s) => s.toLowerCase());
      const out = [];
      for (let i = 0; i < syl.length;) {
        let n = Math.min(MAX_SYLLABLES, syl.length - i);
        while (n > 1 && !WORDS.has(low.slice(i, i + n).join(" "))) n--;
        out.push(syl.slice(i, i + n).join(NB));
        i += n;
      }
      return out.join(" ");
    });
  }

  function bind(text, soft) {
    let s = text;
    if (!soft) { for (const k of KEEP) s = s.replace(k.re, k.to); s = bindWords(s); } // soft: justified text, see above
    s = s.replace(/(\d{4}) (\d{3}) (\d{3})/g, "$1" + NB + "$2" + NB + "$3");      // 0775 118 240 is one unit
    s = s.replace(/(\d)-(?=\d)/g, "$1-" + WJ);                       // 6-12, 1-2 phút: no break after the hyphen
    s = s.replace(/(\p{L}|\.) (?=\d+(?![\d/]))/gu, "$1" + NB);       // lớp 10, Toán 9, thứ 31 (not a date such as 20/11)
    s = s.replace(/(\d) (?=(?:trang|phút|giây|giờ|tiết|bài|buổi|lượt|điểm|năm|tháng|ngày|tuần)(?![\p{L}\d]))/gu, "$1" + NB); // 25 trang, 5 phút
    return s;
  }

  function apply(root) {
    const scope = root || document.body;
    textNodes(scope).forEach((n) => { const t = bind(n.nodeValue, !!n.parentElement.closest(JUSTIFY_SEL)); if (t !== n.nodeValue) n.nodeValue = t; });
    // the italic part of a heading ("lặn sâu", "lớp học") is one phrase: never split it
    scope.querySelectorAll("h1 em, h2 em, h3 em").forEach((em) =>
      textNodes(em).forEach((n) => { if (n.nodeValue.length <= MAX_CHUNK) n.nodeValue = n.nodeValue.replace(/ /g, NB); }));
    if (window.Balance) window.Balance.apply(scope);
  }

  // words of 2-4 syllables found in a run of tokens: [[from, to), ...] (dictionary words and the names above)
  const NAMES = new Set([
    "tp hồ chí minh", "hồ chí minh", "lê hồng phong", "sinh viên", "giải nhất", "giải ba", "ngày nhà giáo", "việt nam",
    "toán học", "ngọc đạt", "quang khôi", "đông nghi", "hải đăng", "chuyên tin", "chuyên toán", "toán cơ bản",
    "đại học ngoại thương", "phổ thông năng khiếu", "huy chương", "olympic toán học",
  ]);
  const core = (t) => t.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
  function segment(tokens) {
    const groups = [];
    for (let i = 0; i < tokens.length;) {
      let hit = 0;
      for (let n = Math.min(4, tokens.length - i); n >= 2; n--) {
        const part = tokens.slice(i, i + n);
        // punctuation inside a group (a comma, a dash) is a natural place to break
        if (part.slice(0, -1).some((t) => /[^\p{L}\p{N}.]$/u.test(t)) || part.slice(1).some((t) => /^[^\p{L}\p{N}]/u.test(t))) continue;
        const key = part.map(core).join(" ");
        if (WORDS.has(key) || NAMES.has(key)) { hit = n; break; }
      }
      if (hit) { groups.push([i, i + hit]); i += hit; } else i++;
    }
    return groups;
  }

  window.Typo = { apply, segment, JUSTIFY_SEL };
  apply();
})();
