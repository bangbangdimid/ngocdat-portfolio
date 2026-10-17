/* ============================================================
   typo.js - line-break hygiene for Vietnamese text (window.Typo)

   Vietnamese is written in single syllables separated by spaces, so a browser
   happily breaks "TP. Hồ Chí / Minh" or leaves one syllable alone on the last
   line. This joins the pieces that must stay together with a no-break space:
     1. names and set phrases (TP. Hồ Chí Minh, Đại học Ngoại thương ...)
     2. numbers with the word they belong to (lớp 10, Toán 9, 25 trang)
     3. the last two words of every paragraph / heading (no one-word last line)
   It only rewrites text nodes, so markup, links and events are untouched.
   Typo.apply(root) can be called again after content is rendered dynamically.
   ============================================================ */
(function () {
  const NB = "\u00a0";
  const WJ = String.fromCharCode(0x2060); // word joiner: forbids a break and renders nothing

  // names and compound phrases that must never be split across two lines
  const KEEP = [
    "TP. Hồ Chí Minh", "Hồ Chí Minh", "Đại học Ngoại thương", "Phổ thông Năng khiếu", "Tài chính - Ngân hàng",
    "Lê Hồng Phong", "THPT chuyên", "Olympic Toán học", "Sinh viên", "Giải Nhất", "Giải Ba",
    "Huy chương Bạc", "Huy chương Đồng", "Huy chương Vàng", "Máy tính cầm tay", "máy tính cầm tay",
    "Ngày Nhà giáo", "Việt Nam", "Toán học", "Toán cơ bản", "HSG Toán", "ôn thi", "Ôn thi",
    "chuyên Tin", "chuyên Toán", "Chuyên Tin", "Chuyên Toán", "chuyên đề", "Chuyên đề", "học sinh", "Học sinh",
    "tuyển sinh", "lời giải", "Lớp Toán", "anh Đạt", "Ngọc Đạt", "Cloudflare", "AMC, AMO, IKMC", "AMC, AMO", "AMC và AMO", "PiiSE - PTNK",
  ].map((p) => ({ re: new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, " +"), "g"),
    // a hyphen allows a break right after it even before a no-break space, so add a word joiner
    to: p.replace(/ - /g, NB + "-" + WJ + NB).replace(/ /g, NB) }));

  // block-level elements whose last two words are kept together
  const BLOCKS = "p, li, dd, dt, h1, h2, h3, h4, figcaption, blockquote, label, .badge, .tag, .for, .sub, .lede, .hint, .muted, .name, .level, .hand";
  const SKIP = "script, style, textarea, pre, code, [data-notypo], .pdf-pages";

  function textNodes(root) {
    const list = [];
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.nodeValue.trim() && !(n.parentElement && n.parentElement.closest(SKIP))) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
    });
    while (w.nextNode()) list.push(w.currentNode);
    return list;
  }

  function bind(text) {
    let s = text;
    for (const k of KEEP) s = s.replace(k.re, k.to);
    s = s.replace(/(\d)-(?=\d)/g, "$1-" + WJ);                // 6-12, 1-2 phút: no break after the hyphen
    s = s.replace(/(\p{L}|\.) (?=\d)/gu, "$1" + NB);          // lớp 10, Toán 9, thứ 31, TP. 3
    s = s.replace(/(\d) (?=\p{L}{1,8}(?![\p{L}\d]))/gu, "$1" + NB); // 25 trang, 17 chuyên
    return s;
  }

  function apply(root) {
    const scope = root || document.body;
    textNodes(scope).forEach((n) => { const t = bind(n.nodeValue); if (t !== n.nodeValue) n.nodeValue = t; });
    // the italic part of a heading ("lặn sâu", "lớp học") is one phrase: never split it
    scope.querySelectorAll("h1 em, h2 em, h3 em").forEach((em) =>
      textNodes(em).forEach((n) => { n.nodeValue = n.nodeValue.replace(/ /g, NB); }));
    const blocks = scope.matches && scope.matches(BLOCKS) ? [scope] : [];
    blocks.push(...scope.querySelectorAll(BLOCKS));
    blocks.forEach((el) => {
      if (el.closest(SKIP)) return;
      const nodes = textNodes(el);
      const last = nodes[nodes.length - 1];
      if (!last) return;
      // needs at least three words so the head of the sentence is not glued together
      const t = last.nodeValue.replace(/ (\S+)(\s*)$/, (m, w, tail) => NB + w + tail);
      if (t !== last.nodeValue && /\S+[ \u00a0]+\S+[ \u00a0]+\S+/.test(el.textContent)) last.nodeValue = t;
    });
  }

  window.Typo = { apply };
  apply();
})();
