/* ============================================================
   balance.js - even right edges for every block of text (window.Balance)

   Left-aligned text is always ragged, and on a phone (30-35 characters per
   line) one long word is enough to leave a line half empty. For every block
   of text that wraps onto 2+ lines this finds the width at which the SAME
   number of lines looks most even, and sets it as max-width.

   How: the width of every word is measured once; wrapping at any trial
   width is then simulated in plain JavaScript (greedy fill, like the browser),
   which costs almost nothing, and the width with the smallest raggedness wins
   (line lengths vs the longest line; a short last line is penalised, a
   one-word last line even more). The winner is checked against the real
   layout (still the same number of lines, really more even) before it stays.

   Browsers only balance short blocks natively (about 6 lines in Chrome) and
   differently from each other; this works for any length and gives every
   browser the same result. It re-runs when the window width changes and when
   web fonts finish loading. Content added later: Balance.apply(root).
   Opt out for one element with data-nobalance.
   ============================================================ */
(function () {
  "use strict";
  const ATTR = "data-bal";
  const MIN_WIDTH = 110;        // px: narrower blocks are left alone
  const MIN_FILL = 0.55;        // never narrower than this share of the available width ...
  const MIN_FILL_SHORT = 0.4;   // ... except blocks of only two lines, which may shrink further to split evenly
  const STEP = 1.5;             // px between trial widths
  const TRIES = 3;              // best simulated widths checked against the real layout
  const MODEL_TOLERANCE = 0.03; // how much worse than predicted the real layout may be
  const TOLERANCES = [0.3, 0, -0.3, 0.8, -0.8, 1.5, -1.5]; // px a line may overshoot (or must undershoot) in the model
  const LAST_LINE_WEIGHT = 0.6; // how much a short last line matters next to a short middle line
  const WS = "[ \\t\\r\\n\\f]"; // wrapping whitespace: NOT the no-break space
  const SKIP = "script, style, svg, video, canvas, input, textarea, select, option, button, .btn, .nav, .chat-panel, .chat-teaser, .quick-contact, " +
    ".modal, .cursor-ring, .pdf-pages, [hidden], [data-nobalance], pre, code, .chip, .badge-pill, .tip, .dur, .pages, .play, .tick, .tld, " +
    ".user-chip, .msg, .topics, .hotline, .name-tag";

  const balanced = new Set();
  const isWs = new RegExp("^" + WS);
  const tokenRe = () => new RegExp("[^ \\t\\r\\n\\f]+", "g");
  let canvas = null;

  // display lookups are repeated for the same ancestors: cache them for one pass
  let blockCache = new Map();
  function isBlock(el) {
    let v = blockCache.get(el);
    if (v === undefined) { const d = getComputedStyle(el).display; v = d !== "inline" && d !== "contents"; blockCache.set(el, v); }
    return v;
  }
  const nearestBlock = (node) => { let p = node.parentElement; while (p && !isBlock(p)) p = p.parentElement; return p; };

  // text nodes whose nearest block-level ancestor is el itself (inline children such as <b> belong to it)
  function ownTextNodes(el) {
    const list = [];
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.nodeValue.trim() && nearestBlock(n) === el) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
    });
    while (w.nextNode()) list.push(w.currentNode);
    return list;
  }

  // widths of the visual lines of the real layout
  function lineWidths(nodes) {
    const rects = [];
    for (const n of nodes) {
      const r = document.createRange();
      r.selectNodeContents(n);
      for (const rc of r.getClientRects()) if (rc.width > 1 && rc.height > 1) rects.push(rc);
    }
    rects.sort((a, b) => (a.top + a.height / 2) - (b.top + b.height / 2) || a.left - b.left);
    const lines = [];
    for (const rc of rects) {
      const cy = rc.top + rc.height / 2, last = lines[lines.length - 1];
      if (last && Math.abs(cy - last.cy) < last.h * 0.6) { last.l = Math.min(last.l, rc.left); last.r = Math.max(last.r, rc.right); }
      else lines.push({ cy, h: rc.height, l: rc.left, r: rc.right });
    }
    return lines.map((b) => b.r - b.l);
  }

  // lower is better: how far each line falls short of the longest one, plus last-line penalties
  function raggedness(w) {
    const max = Math.max(...w), n = w.length;
    let c = 0;
    for (let i = 0; i < n - 1; i++) { const d = (max - w[i]) / max; c += d * d; }
    const last = w[n - 1] / max, dl = 1 - last;
    c += LAST_LINE_WEIGHT * dl * dl; // the last line counts too, a little less than the others
    if (last < 0.2) c += 3;          // a single short word on its own line
    return c;
  }

  // words (runs without wrapping whitespace) with their rendered width; text split over inline
  // elements without a space between ("hàng</b>, Trường") stays one word
  function measureWords(nodes) {
    const words = [];
    let cur = null;
    const flush = () => { if (cur) { words.push(cur); cur = null; } };
    const range = document.createRange();
    for (const n of nodes) {
      const s = n.nodeValue;
      if (isWs.test(s)) flush();
      const re = tokenRe();
      let m;
      while ((m = re.exec(s))) {
        if (m.index > 0 && isWs.test(s[m.index - 1])) flush();
        range.setStart(n, m.index);
        range.setEnd(n, m.index + m[0].length);
        const w = range.getBoundingClientRect().width;
        const end = m.index + m[0].length;
        if (cur) { cur.w += w; cur.n += m[0].length; cur.text += m[0]; cur.node = null; } // split over inline elements: one word, but no single text node
        else cur = { w, n: m[0].length, text: m[0], node: n, start: m.index, end };
        if (end < s.length && isWs.test(s[end])) flush();
      }
    }
    flush();
    return words;
  }

  function spaceWidth(cs) {
    canvas = canvas || document.createElement("canvas").getContext("2d");
    canvas.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    return canvas.measureText(" ").width + (parseFloat(cs.wordSpacing) || 0) + (parseFloat(cs.letterSpacing) || 0);
  }

  // greedy line filling, as the browser does it
  function simulate(words, space, avail, eps) {
    const lines = [];
    let x = 0;
    for (const t of words) {
      if (x === 0) x = t.w;
      else if (x + space + t.w <= avail + eps) x += space + t.w;
      else { lines.push(x); x = t.w; }
    }
    lines.push(x);
    return lines;
  }

  function release(el) {
    el.style.removeProperty("max-width");
    if (el.hasAttribute("data-bal-m")) { el.style.removeProperty("margin-left"); el.style.removeProperty("margin-right"); el.removeAttribute("data-bal-m"); }
  }

  function balanceElement(el) {
    release(el);
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.display === "-webkit-box" || cs.whiteSpace === "nowrap" || cs.visibility === "hidden") return;
    if (el.querySelector("br")) return; // deliberate line breaks
    const nodes = ownTextNodes(el);
    if (!nodes.length) return;
    el.setAttribute(ATTR, "");            // CSS: plain text-wrap, so the real breaks are the greedy ones
    const full = el.getBoundingClientRect().width;
    if (full < MIN_WIDTH) return;
    const baseW = lineWidths(nodes), count = baseW.length;
    if (count < 2) return;                // single line: nothing to balance (the common case, and free)

    const extra = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0) + (parseFloat(cs.borderLeftWidth) || 0) + (parseFloat(cs.borderRightWidth) || 0);
    const availFull = full - extra;
    const words = measureWords(nodes), space = spaceWidth(cs);
    if (words.length < 2) return;
    // The model and the browser can disagree by a fraction of a pixel when a line fits almost exactly:
    // find the tolerance that reproduces the real wrapping of this block, then use it for every trial width.
    const eps = TOLERANCES.find((e) => simulate(words, space, availFull, e).length === count);
    if (eps === undefined) return; // the model does not match this block: leave it

    const baseCost = raggedness(baseW);
    // many widths give the very same line breaks: group them into plateaus (runs of equal cost)
    const plateaus = [];
    for (let a = availFull * (count === 2 ? MIN_FILL_SHORT : MIN_FILL); a < availFull - 0.5; a += STEP) {
      const lines = simulate(words, space, a, eps);
      if (lines.length !== count) continue;
      const c = raggedness(lines), last = plateaus[plateaus.length - 1];
      if (last && Math.abs(last.c - c) < 1e-4 && a - last.end <= STEP * 1.5) last.end = a;
      else plateaus.push({ c, start: a, end: a });
    }
    plateaus.sort((p, q) => p.c - q.c || (q.end - q.start) - (p.end - p.start)); // best first, then the widest plateau
    for (const pl of plateaus.slice(0, TRIES)) {
      if (pl.c >= baseCost - 1e-6) break;
      // the middle of the plateau survives a pixel or two of error in the model; its edge would not
      el.style.maxWidth = ((pl.start + pl.end) / 2 + extra) + "px";
      const real = lineWidths(nodes), realCost = real.length === count ? raggedness(real) : Infinity;
      if (realCost <= pl.c + MODEL_TOLERANCE && realCost < baseCost - 1e-6) {
        if (cs.textAlign === "center" && cs.display === "block") { el.style.marginLeft = el.style.marginRight = "auto"; el.setAttribute("data-bal-m", ""); }
        balanced.add(el);
        return;
      }
    }
    release(el); // nothing better than the natural wrapping
  }

  function apply(root) {
    const scope = root || document.body;
    blockCache = new Map();
    const els = new Set();
    const w = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) {
      if (!w.currentNode.nodeValue.trim()) continue;
      const b = nearestBlock(w.currentNode);
      if (b) els.add(b);
    }
    const justified = window.Typo && window.Typo.JUSTIFY_SEL;
    els.forEach((el) => {
      if (!scope.contains(el) || el.closest(SKIP)) return;
      if (justified && el.matches(justified)) { if (window.Justify) window.Justify.element(el); } // even edges by spacing, not by width
      else balanceElement(el);
    });
  }

  function refresh() {
    if (window.Justify) window.Justify.releaseAll();
    balanced.forEach((el) => { release(el); if (!el.isConnected) balanced.delete(el); });
    apply(document.body);
  }

  const later = (fn, ms) => { let t; return () => { clearTimeout(t); t = setTimeout(fn, ms); }; };
  // The usable width changes with the window, with a scrollbar appearing after load, and with page zoom;
  // the height changes with the mobile URL bar, which must not trigger a re-run.
  const root = document.documentElement;
  let width = root.clientWidth;
  const check = later(() => { if (root.clientWidth !== width) { width = root.clientWidth; refresh(); } }, 120);
  if (window.ResizeObserver) new ResizeObserver(check).observe(root);
  addEventListener("resize", check);
  addEventListener("orientationchange", later(refresh, 250));
  if (document.fonts) {
    document.fonts.ready.then(refresh);
    document.fonts.addEventListener("loadingdone", later(refresh, 80));
  }

  // why a block was or was not balanced (for maintenance: Balance.explain(document.querySelector("..."))). Leaves the page as it was.
  function explain(el) {
    const had = el.style.maxWidth;
    release(el);
    const cs = getComputedStyle(el), nodes = ownTextNodes(el);
    const full = el.getBoundingClientRect().width, baseW = lineWidths(nodes);
    const extra = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0) + (parseFloat(cs.borderLeftWidth) || 0) + (parseFloat(cs.borderRightWidth) || 0);
    const words = measureWords(nodes), space = spaceWidth(cs);
    const sim = simulate(words, space, full - extra, 0.3);
    if (had) el.style.maxWidth = had;
    return { full, extra, realLines: baseW.map(Math.round), simLines: sim.map(Math.round), space, words: words.map((w) => Math.round(w.w)), font: cs.font };
  }

  // measuring helpers shared with justify.js
  const util = { ownTextNodes, lineWidths, measureWords, spaceWidth, SKIP };
  window.Balance = { apply, refresh, explain, util };
})();
