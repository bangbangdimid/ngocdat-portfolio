/* ============================================================
   chatbot.js - online advisor widget for the home page
   Rule-based, runs fully in the browser: no server, no API key, no cost,
   and it cannot make facts up. Answers live in chat-kb.js.
   Requires: config.js, chat-kb.js (typo.js optional)
   ============================================================ */
(function () {
  const KB = window.CHAT_KB;
  if (!KB) return;
  const CFG = window.APP_CONFIG || {};
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const phoneDigits = (CFG.CONTACT_PHONE || "").replace(/[^\d+]/g, "");
  const phoneShown = phoneDigits.replace(/^(\d{4})(\d{3})(\d{3})$/, "$1 $2 $3");
  const MAX_INPUT = 200;
  const TEASER_KEY = "chat-teaser-seen";
  const byId = Object.fromEntries(KB.intents.map((i) => [i.id, i]));

  /* ---------- understanding a question ---------- */
  // lower case, no accents, only letters and digits: "Học phí lớp 9?" -> "hoc phi lop 9"
  const normalize = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, " ").trim();

  function score(padded, kw) {
    let s = 0;
    for (const k of kw) {
      const [phrase, weight] = Array.isArray(k) ? k : [k, k.split(" ").length];
      if (padded.includes(" " + phrase + " ")) s += weight;
    }
    return s;
  }

  // "lớp 9", "toán 7", "hsg 9" -> 9
  function gradeIn(padded) {
    const m = padded.match(/ (?:lop|toan|hsg|khoi) (\d{1,2}) /);
    const g = m ? +m[1] : 0;
    return g >= 6 && g <= 12 ? g : 0;
  }

  function gradeIntent(padded, g) {
    const hsg = / (?:hsg|hoc sinh gioi|gioi) /.test(padded);
    if (g === 9) return hsg ? "hsg9" : / (?:tuyen sinh|thi vao|vao 10|on thi) /.test(padded) ? "lop9" : "grade9";
    if (g === 7) return hsg ? "hsg7" : / co ban /.test(padded) ? "co_ban7" : "grade7";
    return g === 6 || g === 8 ? "grade_mid" : "grade_high";
  }

  function route(text) {
    const padded = " " + normalize(text) + " ";
    const words = padded.trim().split(" ").filter(Boolean);
    const scores = new Map();
    KB.intents.forEach((it) => { const s = score(padded, it.kw); if (s > 0) scores.set(it.id, s); });
    const g = gradeIn(padded);
    if (g) { const gi = gradeIntent(padded, g); scores.set(gi, (scores.get(gi) || 0) + 2.5); }
    // a short greeting wins; inside a longer question it is only noise
    if (scores.has("hello") && words.length > 3) scores.delete("hello");
    let best = null, top = 0;
    for (const it of KB.intents) { // declared order breaks ties
      const s = scores.get(it.id) || 0;
      if (s > top) { top = s; best = it; }
    }
    return { intent: best, ctx: { grade: g } };
  }

  /* ---------- building the widget ---------- */
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const fill = (s) => String(s).replace("{phone}", phoneShown).replace("{email}", CFG.CONTACT_EMAIL || CFG.OWNER_EMAIL || "");
  const ICON_CHAT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z"/><path d="M8.5 11h7M8.5 14h4"/></svg>';

  const fab = el("button", "qc-btn chat");
  fab.type = "button"; fab.setAttribute("aria-label", "Mở chat tư vấn"); fab.setAttribute("aria-expanded", "false"); fab.setAttribute("aria-controls", "chatPanel");
  fab.innerHTML = ICON_CHAT + '<span class="tip">Chat tư vấn</span>';

  const panel = el("section", "chat-panel");
  panel.id = "chatPanel"; panel.hidden = true; panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "Chat tư vấn Lớp Toán anh Đạt");
  panel.innerHTML = `
    <header class="chat-head">
      <img src="assets/ocean/svg/whale-mascot.svg" alt="" width="44" height="30" />
      <div class="chat-title"><strong>Trợ lý Lớp Toán anh Đạt</strong><span><i class="chat-dot" aria-hidden="true"></i>Trả lời tự động, hỏi gì cũng được</span></div>
      <button class="chat-close" type="button" aria-label="Đóng chat">×</button>
    </header>
    <div class="chat-log" role="log" aria-live="polite" aria-relevant="additions" tabindex="0"></div>
    <div class="chat-chips" aria-label="Gợi ý câu hỏi"></div>
    <form class="chat-form" autocomplete="off">
      <input class="chat-input" type="text" maxlength="${MAX_INPUT}" placeholder="Nhập câu hỏi của bạn..." aria-label="Câu hỏi của bạn" enterkeyhint="send" />
      <button class="btn primary sm chat-send" type="submit">Gửi</button>
    </form>
    <p class="chat-foot"></p>`;
  const log = panel.querySelector(".chat-log"), chips = panel.querySelector(".chat-chips");
  const form = panel.querySelector(".chat-form"), input = panel.querySelector(".chat-input");
  panel.querySelector(".chat-foot").textContent = KB.footnote;

  const teaser = el("div", "chat-teaser");
  teaser.hidden = true;
  teaser.innerHTML = '<button type="button" class="chat-teaser-go">Cần tư vấn về lớp học? <b>Hỏi mình nhé!</b></button><button type="button" class="chat-teaser-x" aria-label="Ẩn gợi ý">×</button>';

  /* ---------- messages ---------- */
  function addUser(text) {
    const m = el("div", "msg user");
    m.append(el("span", "sr-only", "Bạn: "), el("p", null, text));
    log.appendChild(m); scrollDown();
  }

  function actionNode(a) {
    const link = el("a", "btn sm", fill(a.label));
    if (a.act === "zalo") { link.classList.add("zalo"); link.href = CFG.ZALO_URL || "#"; link.target = "_blank"; link.rel = "noopener"; }
    else if (a.act === "call") { link.href = "tel:" + phoneDigits; }
    else if (a.act === "go") { link.href = a.sel; link.addEventListener("click", () => closeChat(false)); }
    else { link.href = a.href; }
    return link;
  }

  function addBot(blocks) {
    const m = el("div", "msg bot");
    m.appendChild(el("span", "sr-only", "Trợ lý: "));
    const body = el("div", "bubble");
    blocks.forEach((b) => {
      if (b.p) body.appendChild(el("p", null, fill(b.p)));
      else if (b.ul) { const ul = el("ul"); b.ul.forEach((t) => ul.appendChild(el("li", null, fill(t)))); body.appendChild(ul); }
      else if (b.acts) { const row = el("div", "msg-acts"); b.acts.forEach((a) => row.appendChild(actionNode(a))); body.appendChild(row); }
    });
    m.appendChild(body); log.appendChild(m);
    window.Typo?.apply(body);
    scrollDown();
  }

  function scrollDown() { log.scrollTop = log.scrollHeight; }

  function showChips(ids) {
    chips.replaceChildren();
    ids.filter((id) => byId[id]).forEach((id) => {
      const b = el("button", "chip", byId[id].label);
      b.type = "button"; b.dataset.id = id;
      chips.appendChild(b);
    });
  }

  /* ---------- conversation ---------- */
  let busy = false, lastSent = 0;
  function answer(intent, ctx) {
    const it = intent || KB.fallback;
    const blocks = typeof it.say === "function" ? it.say(ctx || {}) : it.say;
    const typing = el("div", "msg bot typing"); typing.append(el("div", "bubble", "..."));
    typing.setAttribute("aria-label", "Trợ lý đang trả lời");
    log.appendChild(typing); scrollDown(); busy = true;
    setTimeout(() => {
      typing.remove(); addBot(blocks);
      showChips(it.next || KB.menu); busy = false;
    }, reduceMotion ? 120 : 520);
  }

  function ask(text, forcedId) {
    const clean = String(text).trim().slice(0, MAX_INPUT);
    const now = Date.now();
    if (!clean || busy || now - lastSent < 300) return;
    lastSent = now;
    addUser(clean);
    if (forcedId) return answer(byId[forcedId], {});
    const r = route(clean);
    answer(r.intent, r.ctx);
  }

  form.addEventListener("submit", (e) => { e.preventDefault(); const v = input.value; input.value = ""; ask(v); });
  chips.addEventListener("click", (e) => { const b = e.target.closest(".chip"); if (b) ask(b.textContent, b.dataset.id); });

  /* ---------- open / close ---------- */
  let opened = false, lastFocus = null;
  const narrow = () => matchMedia("(max-width: 560px)").matches;

  function openChat() {
    hideTeaser(true);
    lastFocus = document.activeElement;
    panel.hidden = false; fab.setAttribute("aria-expanded", "true"); document.body.classList.add("chat-open");
    if (narrow()) document.body.style.overflow = "hidden";
    if (!opened) {
      opened = true;
      addBot([{ p: KB.greeting }]); showChips(KB.menu);
    }
    scrollDown();
    // a phone keyboard popping up on open would cover the answers
    if (!narrow() && matchMedia("(pointer: fine)").matches) input.focus(); else panel.querySelector(".chat-close").focus();
  }
  function closeChat(restoreFocus) {
    if (panel.hidden) return;
    panel.hidden = true; fab.setAttribute("aria-expanded", "false"); document.body.classList.remove("chat-open");
    document.body.style.overflow = "";
    if (restoreFocus !== false) (lastFocus && lastFocus.focus ? lastFocus : fab).focus();
  }
  fab.addEventListener("click", () => (panel.hidden ? openChat() : closeChat()));
  panel.querySelector(".chat-close").addEventListener("click", () => closeChat());
  addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden && !document.querySelector(".modal.on")) closeChat();
  });

  /* ---------- one-time nudge ---------- */
  function seen() { try { return sessionStorage.getItem(TEASER_KEY) === "1"; } catch { return false; } }
  function hideTeaser(remember) {
    teaser.hidden = true;
    if (remember) { try { sessionStorage.setItem(TEASER_KEY, "1"); } catch { /* private mode: just skip */ } }
  }
  teaser.querySelector(".chat-teaser-go").addEventListener("click", openChat);
  teaser.querySelector(".chat-teaser-x").addEventListener("click", () => hideTeaser(true));
  if (!seen()) {
    setTimeout(() => { if (panel.hidden && !document.querySelector(".modal.on")) { teaser.hidden = false; setTimeout(() => hideTeaser(true), 9000); } }, 7000);
  }

  /* ---------- mount ---------- */
  const stack = document.querySelector(".quick-contact");
  if (stack) stack.prepend(fab); else { const s = el("div", "quick-contact"); s.appendChild(fab); document.body.appendChild(s); }
  document.body.append(teaser, panel);
})();
