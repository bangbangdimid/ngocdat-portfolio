/* ============================================================
   orphan.js - no last line with just one or two words
   text-wrap: pretty (Chrome, Edge, Safari 26+) only rescues a single lone word,
   and older iPhones and Android WebViews ignore it. Vietnamese counts every
   syllable as a word, so this joins the last three words of a paragraph with
   no-break spaces: the last line always holds at least three. Nothing else is glued.
   Orphan.apply(root) can be called again after content is rendered dynamically.
   ============================================================ */
(function () {
  "use strict";
  const NB = "\u00a0";
  const SEL = ".sec p, .sec dd, .sec li > span:not(.tick), .contact-card p, .hero-sub, .lesson-meta p, .quote-bubble p, .chat-log p";
  const MIN_CHARS = 12;   // below this there is nothing to rescue
  const TAIL_WORDS = 3;

  function lastTextNode(el) {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let last = null;
    while (w.nextNode()) if (w.currentNode.nodeValue.trim()) last = w.currentNode;
    return last;
  }

  function glueTail(el) {
    if (el.textContent.length < MIN_CHARS) return;
    const node = lastTextNode(el);
    if (!node) return;
    const text = node.nodeValue, end = text.trimEnd().length;
    let s = text.slice(0, end), glued = 0;
    for (let i = s.length - 1; i > 0 && glued < TAIL_WORDS - 1; i--) {
      if (s[i] === NB) glued++;                                     // joined by an earlier run: count it, do not extend
      else if (s[i] === " " && s[i - 1] !== " ") { s = s.slice(0, i) + NB + s.slice(i + 1); glued++; }
    }
    if (glued) node.nodeValue = s + text.slice(end);
  }

  function apply(root) { (root || document).querySelectorAll(SEL).forEach(glueTail); }

  let timer = 0;
  new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(() => apply(), 150); })
    .observe(document.body, { childList: true, subtree: true });
  apply();
  window.Orphan = { apply };
})();
