/* ============================================================
   textfit.js - even edges and no lonely last line (window.TextFit)

   1. Last line: the last three words of a paragraph are joined with no-break
      spaces, so the last line never holds just one or two words (Vietnamese counts
      every syllable as a word; text-wrap: pretty alone only rescues a single one).
   2. Flush edges: a paragraph is justified (text-align: justify) only when the
      gaps between its words stay small. Wrapping is simulated from the measured
      width of every word; letter-spacing (at most 0.04em, about half a pixel)
      and word-spacing are tuned per paragraph so every line fills its width
      with the least stretch. If any line would still need gaps wider than
      MAX_STRETCH times the normal space, the paragraph stays left-aligned.
      Nothing is glued apart from the three last words.

   Centred text (hero, section heads, cards) is not justified: text-wrap: balance
   in base.css keeps its lines even. Opt out for one element with data-noeven.
   Runs on load, on font load, when the width changes and when content is added.
   ============================================================ */
(function () {
  "use strict";
  const NB = "\u00a0";
  const SEL = ".sec p, .sec dd, .sec li > span:not(.tick), .contact-card p, .hero-sub, .lesson-meta p, .quote-bubble p, .chat-log p";
  const EVEN_SEL = ".sec p, .sec dd, .sec li > span:not(.tick), .lesson-meta p, .quote-bubble p";
  const MIN_CHARS = 12;       // below this there is nothing to rescue
  const TAIL_WORDS = 3;
  const MAX_STRETCH = 1.8;    // widest allowed gap, relative to the normal one (1 = untouched)
  const MIN_STRETCH = 0.92;   // narrowest allowed gap
  const MIN_WORDS = 6;
  const MIN_WIDTH = 120;
  const EVEN = "is-even";

  /* ---------- last line ---------- */
  // joins the last TAIL_WORDS words with no-break spaces, also across inline elements ("<b>AMO</b> lớp 12.")
  function glueTail(el) {
    if (el.textContent.length < MIN_CHARS) return;
    const nodes = [];
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) nodes.push(w.currentNode);
    const edits = new Map();                        // node -> array of characters
    const chars = (n) => { if (!edits.has(n)) edits.set(n, [...n.nodeValue]); return edits.get(n); };
    let seenWord = false, inGap = false, joined = 0;
    scan: for (let k = nodes.length - 1; k >= 0; k--) {
      const text = nodes[k].nodeValue;
      for (let i = text.length - 1; i >= 0; i--) {
        const c = text[i], space = " \t\r\n\f".includes(c);
        if (!space && c !== NB) { seenWord = true; inGap = false; continue; }
        if (!seenWord) continue;                       // trailing whitespace
        if (!inGap) {                                  // a gap between two words (an earlier run may have joined it already)
          inGap = true; joined++;
          if (space) chars(nodes[k])[i] = NB;
          if (joined >= TAIL_WORDS - 1) break scan;
        } else if (space) chars(nodes[k])[i] = "";     // one gap, however many whitespace characters it had
      }
    }
    edits.forEach((arr, n) => { const v = arr.join(""); if (v !== n.nodeValue) n.nodeValue = v; });
  }

  /* ---------- flush edges ---------- */
  const LS_GRID = [-0.02, -0.01, 0, 0.01, 0.02, 0.03, 0.04];      // letter-spacing tweaks, em (at most about 0.5px)
  const WS_GRID = [-0.1, -0.05, 0, 0.05, 0.1];                              // word-spacing tweaks, em
  const LS_WIDE = [-0.02, -0.01, 0, 0.01, 0.02, 0.03, 0.04, 0.05]; // for the few blocks that stay too stretched
  const WS_WIDE = [-0.1, -0.05, 0, 0.05, 0.1, 0.15];
  const TWEAK_WEIGHT = 0.2;                                                 // price of the largest tweak (a stretch of 2 costs 1)
  const TOLERANCES = [0.3, 0, -0.3, 0.8, -0.8, 1.5, -1.5];                  // px a line may overshoot in the model, matched to the real wrapping
  const WS = /[ \t\r\n\f]/;                                                 // wrapping whitespace: NOT the no-break space
  let canvas = null;

  // the text nodes whose nearest block-level ancestor is el itself
  function ownTextNodes(el) {
    const isBlock = (e) => { const d = getComputedStyle(e).display; return d !== "inline" && d !== "contents"; };
    const list = [];
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: (n) => {
      if (!n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      let p = n.parentElement; while (p && p !== el && !isBlock(p)) p = p.parentElement;
      return p === el ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    } });
    while (w.nextNode()) list.push(w.currentNode);
    return list;
  }

  // number of visual lines of the real layout
  function lineCount(nodes) {
    const rects = [];
    for (const n of nodes) {
      const r = document.createRange(); r.selectNodeContents(n);
      for (const rc of r.getClientRects()) if (rc.width > 1 && rc.height > 1) rects.push(rc);
    }
    rects.sort((a, b) => (a.top + a.height / 2) - (b.top + b.height / 2) || a.left - b.left);
    let count = 0, cy = -1e9, h = 0;
    for (const rc of rects) {
      const y = rc.top + rc.height / 2;
      if (count && Math.abs(y - cy) < h * 0.6) continue;
      count++; cy = y; h = rc.height;
    }
    return count;
  }

  // words (runs without wrapping whitespace) with their rendered width; a word split over inline elements stays one word
  function measureWords(nodes) {
    const words = []; let cur = null;
    const flush = () => { if (cur) { words.push(cur); cur = null; } };
    const range = document.createRange();
    for (const n of nodes) {
      const text = n.nodeValue;
      if (WS.test(text[0])) flush();
      const re = /[^ \t\r\n\f]+/g; let m;
      while ((m = re.exec(text))) {
        if (m.index > 0 && WS.test(text[m.index - 1])) flush();
        range.setStart(n, m.index); range.setEnd(n, m.index + m[0].length);
        if (range.getClientRects().length > 1) return null;   // a word broken over two lines: leave the block alone
        const wd = range.getBoundingClientRect().width;
        if (cur) { cur.w += wd; cur.n += m[0].length; } else cur = { w: wd, n: m[0].length };
        const end = m.index + m[0].length;
        if (end < text.length && WS.test(text[end])) flush();
      }
    }
    flush();
    return words;
  }

  function spaceWidth(cs) {
    canvas = canvas || document.createElement("canvas").getContext("2d");
    canvas.font = cs.fontStyle + " " + cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
    return canvas.measureText(" ").width;
  }

  // first-fit wrapping as the browser does it, at a given letter / word spacing; stretch is measured against the NORMAL space
  function simulate(words, W, space, fs, ls, wsp, eps) {
    const sp = space + (ls + wsp) * fs;
    const wd = words.map((t) => t.w + ls * fs * t.n);
    const lines = [];
    let start = 0, x = 0;
    const close = (a, b) => {
      let sum = 0; for (let k = a; k < b; k++) sum += wd[k];
      const gaps = b - a - 1;
      lines.push({ stretch: gaps > 0 && sum + gaps * sp <= W + eps ? (W - sum) / (gaps * space) : 1, single: gaps === 0 });
    };
    for (let k = 0; k < words.length; k++) {
      if (k === start) { x = wd[k]; continue; }
      if (x + sp + wd[k] <= W + eps) x += sp + wd[k];
      else { close(start, k); start = k; x = wd[k]; }
    }
    close(start, words.length);
    return lines;
  }

  // lower is better: squared extra stretch of every line but the last (cramped gaps cost more), plus penalties
  function score(lines, count, ls, wsp) {
    let c = 0, worst = 1;
    for (let i = 0; i < lines.length - 1; i++) {
      const st = lines[i].single ? 3 : lines[i].stretch;
      c += (st < 1 ? 4 : 1) * (st - 1) * (st - 1);
      if (st < MIN_STRETCH) c += 10;                    // never cramp the gaps: that reads worse than a ragged edge
      if (st < MIN_STRETCH) worst = Infinity;
      if (st > worst) worst = st;
    }
    if (lines.length > 1 && lines[lines.length - 1].single) c += 1.5;
    if (lines.length > count) c += 8; else if (lines.length < count) c += 0.25 * (count - lines.length);
    c += TWEAK_WEIGHT * ((ls / 0.02) ** 2 + 0.5 * (wsp / 0.1) ** 2);
    return { c, worst };
  }

  function solve(ctx, wide) {
    let best = null;
    for (const ls of wide ? LS_WIDE : LS_GRID) for (const wsp of wide ? WS_WIDE : WS_GRID) {
      const lines = simulate(ctx.words, ctx.W, ctx.space, ctx.fs, ls, wsp, ctx.eps);
      const r = score(lines, ctx.count, ls, wsp);
      if (!best || r.c < best.c) best = { c: r.c, worst: r.worst, ls, wsp, lines };
    }
    return best;
  }

  function release(el) {
    el.classList.remove(EVEN);
    el.style.removeProperty("letter-spacing");
    el.style.removeProperty("word-spacing");
  }

  function fitElement(el) {
    release(el);
    if (el.matches("[data-noeven]") || el.closest("[hidden], .chat-panel, .modal:not(.on)") || el.querySelector("br")) return;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || (cs.textAlign !== "start" && cs.textAlign !== "left")) return;
    const nodes = ownTextNodes(el);
    if (!nodes.length) return;
    el.classList.add(EVEN);                                  // plain first-fit wrapping + justify: the breaks match the simulation
    const box = el.getBoundingClientRect();
    const W = box.width - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0) - (parseFloat(cs.borderLeftWidth) || 0) - (parseFloat(cs.borderRightWidth) || 0);
    const count = lineCount(nodes);
    const words = W >= MIN_WIDTH && count >= 2 ? measureWords(nodes) : null;
    if (!words || words.length < MIN_WORDS) { release(el); return; }
    const ctx = { words, count, W, space: spaceWidth(cs), fs: parseFloat(cs.fontSize), eps: 0 };
    const eps = TOLERANCES.find((e) => simulate(words, W, ctx.space, ctx.fs, 0, 0, e).length === count);
    if (eps === undefined) { release(el); return; }
    ctx.eps = eps;
    let best = solve(ctx);
    if (best.worst > MAX_STRETCH) { const w = solve(ctx, true); if (w.worst < best.worst) best = w; }
    if (best.worst > MAX_STRETCH) { release(el); return; }
    if (best.ls) el.style.letterSpacing = best.ls + "em";
    if (best.wsp) el.style.wordSpacing = best.wsp + "em";
    if (lineCount(nodes) !== best.lines.length) release(el); // the browser wraps differently from the model: stay left-aligned
  }

  function evenOut(root) { (root || document).querySelectorAll(EVEN_SEL).forEach(fitElement); }

  function apply(root) {
    (root || document).querySelectorAll(SEL).forEach(glueTail);
    evenOut(root);
  }

  /* ---------- when to run ---------- */
  let timer = 0;
  const later = (ms) => { clearTimeout(timer); timer = setTimeout(() => apply(), ms); };
  new MutationObserver(() => later(150)).observe(document.body, { childList: true, subtree: true });
  let lastWidth = document.documentElement.clientWidth;
  new ResizeObserver(() => {
    const w = document.documentElement.clientWidth;
    if (w !== lastWidth) { lastWidth = w; later(120); }
  }).observe(document.documentElement);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => later(0));
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener("loadingdone", () => later(0));
  apply();
  window.TextFit = { apply };
})();
