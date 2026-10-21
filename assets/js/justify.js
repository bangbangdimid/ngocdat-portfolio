/* ============================================================
   justify.js - body text flush on both sides, without ugly gaps (window.Justify)

   Plain CSS justification (text-align: justify) in a narrow column stretches the
   gaps between words to 2-3 times their normal size (up to 6-8 times on bad lines)
   because the browser only fills lines first-fit and cannot hyphenate Vietnamese.
   This keeps the flush edges and removes most of that, per block of text:

     1. Letter-spacing and word-spacing of the block are tuned by a tiny amount
        (at most 0.03em, about 0.4px: invisible) so that every line fills its width
        with the least stretch. Wrapping is simulated in plain JS from the measured
        width of every word, so the search costs almost nothing.
     2. Compound words ("toàn quốc", "bản chất", "TP. Hồ Chí Minh") are NOT glued
        with no-break spaces in advance (every glued word removes a place where a
        line can break and makes the gaps worse). Only the ones that the best layout
        would split across two lines are glued afterwards, and only if that does not
        make the gaps clearly worse.

   The result is checked against the real layout (same number of lines as predicted)
   and dropped for that block if it does not match, leaving plain justification.
   Runs from balance.js (same triggers: width change, scrollbar, font load, new
   content). Opt out for one element with data-nojustify.
   ============================================================ */
(function () {
  "use strict";
  const NB = " ";
  const LS_GRID = [-0.02, -0.015, -0.01, -0.005, 0, 0.005, 0.01, 0.015, 0.02, 0.03]; // letter-spacing, em
  const WS_GRID = [-0.1, -0.05, 0, 0.05, 0.1];                                        // word-spacing, em
  const LS_WIDE = [-0.03, -0.02, -0.01, 0, 0.01, 0.02, 0.03, 0.04, 0.05];             // for the few blocks that stay too stretched
  const WS_WIDE = [-0.15, -0.1, -0.05, 0, 0.05, 0.1, 0.15];
  const WIDE_FROM = 2.0;          // stretch above which the wider tweak range is tried
  const SQUEEZE_WEIGHT = 4;       // a line whose gaps are narrower than normal costs this many times more than a stretched one
  const TWEAK_WEIGHT = 0.2;     // price of using the largest letter-spacing change (a stretch of 2 costs 1)
  const TOLERANCES = [0.3, 0, -0.3, 0.8, -0.8, 1.5, -1.5]; // px a line may overshoot in the model; matched to the real wrapping
  const BIND_SLACK = 0.35;        // how much worse the layout may get to keep a compound word whole
  const MAX_BIND_STRETCH = 2.6;   // ... but never beyond this stretch on any line
  const MIN_WORDS = 6;
  const MIN_WIDTH = 110;

  const touched = new Set();      // elements we changed
  const original = new WeakMap(); // text node -> its text before any glueing
  const report = new WeakMap();   // element -> what was decided (Justify.explain)

  const U = () => window.Balance.util;

  /* ---------- the model ---------- */
  // units: words, or compound words glued together ("bound")
  function makeUnits(tokens, bound) {
    const end = new Map(bound.map(([i, j]) => [i, j]));
    const units = [];
    for (let i = 0; i < tokens.length;) {
      const j = end.get(i) || i + 1;
      let w0 = 0, chars = 0;
      for (let k = i; k < j; k++) { w0 += tokens[k].w; chars += tokens[k].n; }
      units.push({ w0, chars, gaps: j - i - 1, last: j - 1 });
      i = j;
    }
    return units;
  }

  // first-fit wrapping as the browser does it, at a given letter / word spacing
  function simulate(units, W, space, fs, ls, wsp, eps) {
    const sp = space + (ls + wsp) * fs;
    const wd = units.map((u) => u.w0 + ls * fs * u.chars + u.gaps * sp);
    const lines = [];
    let start = 0, x = 0;
    const close = (a, b) => {
      let sum = 0; for (let k = a; k < b; k++) sum += wd[k];
      const gaps = b - a - 1;
      // measured against the NORMAL space, so widening the word-spacing is not free: the reader sees the real gap
      lines.push({ a, b, stretch: gaps > 0 && sum + gaps * sp <= W + eps ? (W - sum) / (gaps * space) : 1, single: gaps === 0 });
    };
    for (let k = 0; k < units.length; k++) {
      if (k === start) { x = wd[k]; continue; }
      if (x + sp + wd[k] <= W + eps) x += sp + wd[k];
      else { close(start, k); start = k; x = wd[k]; }
    }
    close(start, units.length);
    return lines;
  }

  // lower is better: squared extra stretch of every line but the last, plus penalties
  function score(lines, count, ls, wsp) {
    let c = 0, worst = 1;
    for (let i = 0; i < lines.length - 1; i++) {
      const s = lines[i].single ? 3 : lines[i].stretch;
      c += (s < 1 ? SQUEEZE_WEIGHT : 1) * (s - 1) * (s - 1); // cramped gaps read worse than slightly wide ones
      if (s > worst) worst = s;
    }
    if (lines.length > 1 && lines[lines.length - 1].single) c += 1.5;       // one lonely word on the last line
    if (lines.length > count) c += 8;                                        // never more lines than the natural wrapping
    else if (lines.length < count) c += 0.25 * (count - lines.length);
    c += TWEAK_WEIGHT * ((ls / 0.02) ** 2 + 0.5 * (wsp / 0.1) ** 2);
    return { c, worst };
  }

  function solve(ctx, bound, wide) {
    const units = makeUnits(ctx.tokens, bound);
    let best = null;
    for (const ls of wide ? LS_WIDE : LS_GRID) for (const wsp of wide ? WS_WIDE : WS_GRID) {
      const lines = simulate(units, ctx.W, ctx.space, ctx.fs, ls, wsp, ctx.eps);
      const r = score(lines, ctx.count, ls, wsp);
      if (!best || r.c < best.c) best = { c: r.c, worst: r.worst, ls, wsp, lines, units };
    }
    return best;
  }

  // compound words that the layout cuts in two (a line ends inside them)
  function splitGroups(sol, groups, bound) {
    const ends = new Set(sol.lines.slice(0, -1).map((l) => sol.units[l.b - 1].last));
    return groups.filter((g) => !bound.includes(g) && [...ends].some((t) => t >= g[0] && t < g[1] - 1));
  }

  /* ---------- the DOM ---------- */
  function release(el) {
    el.style.removeProperty("letter-spacing");
    el.style.removeProperty("word-spacing");
    el.removeAttribute("data-j");
    for (const n of U().ownTextNodes(el)) if (original.has(n)) { n.nodeValue = original.get(n); original.delete(n); }
  }

  // replace the space between the syllables of each group by a no-break space
  function glue(tokens, groups) {
    for (const [i, j] of groups) {
      for (let k = i; k < j - 1; k++) {
        const t = tokens[k], node = t.node;
        if (!original.has(node)) original.set(node, node.nodeValue);
        node.nodeValue = node.nodeValue.slice(0, t.end) + NB + node.nodeValue.slice(t.end + 1);
      }
    }
  }

  // groups whose syllables sit in one text node, separated by single plain spaces
  function usableGroups(tokens) {
    const raw = window.Typo && window.Typo.segment ? window.Typo.segment(tokens.map((t) => t.text)) : [];
    return raw.filter(([i, j]) => {
      const node = tokens[i].node;
      if (!node) return false;
      for (let k = i; k < j; k++) {
        const t = tokens[k];
        if (t.node !== node) return false;
        if (k > i && (t.start !== tokens[k - 1].end + 1 || node.nodeValue[tokens[k - 1].end] !== " ")) return false;
      }
      return true;
    });
  }

  function justifyElement(el) {
    release(el);
    if (el.matches("[data-nojustify]")) return;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.whiteSpace === "nowrap" || cs.textAlign !== "justify") return;
    if (el.querySelector("br")) return;
    const nodes = U().ownTextNodes(el);
    if (!nodes.length) return;
    el.setAttribute("data-j", ""); // CSS: plain text-wrap, so the real breaks are the first-fit ones we simulate
    const full = el.getBoundingClientRect().width;
    if (full < MIN_WIDTH) return;
    const count = U().lineWidths(nodes).length;
    if (count < 2) return;

    const tokens = U().measureWords(nodes);
    if (tokens.length < MIN_WORDS) return;
    const extra = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0) + (parseFloat(cs.borderLeftWidth) || 0) + (parseFloat(cs.borderRightWidth) || 0);
    const ctx = { tokens, count, W: full - extra, space: U().spaceWidth(cs), fs: parseFloat(cs.fontSize), eps: 0 };
    // the model and the browser can disagree by a fraction of a pixel: use the tolerance that reproduces the real wrapping
    const plain = makeUnits(tokens, []);
    const eps = TOLERANCES.find((e) => simulate(plain, ctx.W, ctx.space, ctx.fs, 0, 0, e).length === count);
    if (eps === undefined) return;
    ctx.eps = eps;

    const groups = usableGroups(tokens);
    let bound = [];
    let best = solve(ctx, bound);
    for (let round = 0; round < 4 && groups.length; round++) {
      const split = splitGroups(best, groups, bound);
      if (!split.length) break;
      const all = solve(ctx, bound.concat(split));
      if (all.c <= best.c + BIND_SLACK && all.worst <= MAX_BIND_STRETCH) { bound = bound.concat(split); best = all; continue; }
      let changed = false;
      for (const g of split) {
        const one = solve(ctx, bound.concat([g]));
        if (one.c <= best.c + BIND_SLACK && one.worst <= MAX_BIND_STRETCH) { bound = bound.concat([g]); best = one; changed = true; }
      }
      if (!changed) break;
    }

    if (best.worst > WIDE_FROM) { const w = solve(ctx, bound, true); if (w.c < best.c - 0.05) best = w; }
    report.set(el, { letterSpacing: best.ls, wordSpacing: best.wsp, predictedWorstStretch: +best.worst.toFixed(2), predictedLines: best.lines.length, glued: bound.length, compounds: groups.length, cost: +best.c.toFixed(2) });
    glue(tokens, bound);
    if (best.ls) el.style.letterSpacing = best.ls + "em";
    if (best.wsp) el.style.wordSpacing = best.wsp + "em";
    touched.add(el);
    if (U().lineWidths(nodes).length !== best.lines.length) release(el); // the browser wraps differently from the model: plain justification
  }

  function releaseAll() { touched.forEach((el) => { release(el); }); touched.clear(); }

  // why a block got the spacing it got (maintenance: Justify.explain(document.querySelector("...")))
  function explain(el) { return { tuned: touched.has(el), ...(report.get(el) || {}) }; }

  window.Justify = { element: justifyElement, releaseAll, explain };
})();
