/* SC&IS Silver Jubilee — page orchestration (ES module). */
import Lenis from './vendor/lenis.mjs';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const TAU = Math.PI * 2;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const root = document.documentElement;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let stage = null, lenis = null, specimens = null;

/* =============================================================== smooth scroll */
if (!reduce) {
  lenis = new Lenis({ lerp: .075, wheelMultiplier: .9, smoothWheel: true });
  const tick = (t) => { lenis.raf(t); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}
const pxVal = (v) => parseFloat(v) || 0;
function headerClearance() { return pxVal(getComputedStyle(root).getPropertyValue('--hdr-h')) + 16; }
function scrollToEl(el, hops = 0) {
  if (!lenis) { el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); return; }
  lenis.scrollTo(el, {
    offset: 0, duration: hops === 0 ? 1.5 : .4, easing: (t) => 1 - Math.pow(1 - t, 4),
    onComplete: () => {
      // scroll-linked parallax/reveal effects on sections above `el` can nudge its
      // final rendered position after lenis's one-shot target was computed; correct
      // once more (snapping, no animation) if we landed off by more than a few px.
      const drift = el.getBoundingClientRect().top - headerClearance();
      if (hops < 3 && Math.abs(drift) > 4) scrollToEl(el, hops + 1);
    },
  });
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]'); if (!a) return;
  const id = a.getAttribute('href'); if (id.length < 2) return;
  const el = $(id); if (!el) return; e.preventDefault(); scrollToEl(el);
});

let finished = false;
function finishIntro() {
  if (finished) return; finished = true;
  root.classList.add('intro-done', 'ready');
  startReveals(); onScroll();
}

/* =============================================================== reveals */
$$('[data-split]').forEach((el) => {
  const words = el.textContent.trim().split(/\s+/);
  el.setAttribute('aria-label', el.textContent.trim());
  el.innerHTML = words.map((w, i) => `<span class="w" aria-hidden="true"><span style="--i:${i}">${esc(w)}</span></span>`).join(' ');
});
function startReveals() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold: .15, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal],[data-split]:not(h2),.eyebrow').forEach((el) => io.observe(el));
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return; countIO.unobserve(en.target);
      const to = +en.target.dataset.count, t0 = performance.now(), dur = 1500;
      const tick = (now) => { const k = clamp((now - t0) / dur); en.target.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
  }, { threshold: .6 });
  $$('[data-count]').forEach((el) => countIO.observe(el));
}

/* =============================================================== HUD: scale read-out + section rail */
const SECTIONS = {
  hero: ['Intro', '10⁻⁵ m', 'Cell'], about: ['About', '2 nm', 'DNA'], glance: ['Details', '10⁻⁸ m', 'Protein'],
  programme: ['Programme', '10⁻⁶ m', 'Network'], contact: ['Contact', '1 m', 'People'], register: ['Register', '25 years', 'Join us'],
};
const rail = $('#rail');
rail.innerHTML = Object.keys(SECTIONS).filter((id) => $('#' + id)).map((id) => `<a href="#${id}" data-r="${id}" aria-label="${SECTIONS[id][0]}"><span>${SECTIONS[id][0]}</span></a>`).join('');
const links = $$('.links a'), railLinks = $$('#rail a');
const secIO = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return; const id = en.target.id;
    links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + id));
    railLinks.forEach((a) => a.classList.toggle('on', a.dataset.r === id));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
$$('section[id]').forEach((s) => secIO.observe(s));

/* =============================================================== scroll-linked */
const scrubs = $$('h2[data-split]').map((el) => ({ el, w: $$('.w > span', el) })); scrubs.forEach((it) => it.w.forEach((sp) => { sp.style.transition = 'none'; }));
const bar = $('.scrollbar i'), nav = $('#nav'), px = $$('[data-px]');

/* Measure the real height of the fixed header row so the hero (and every section's
   scroll position) never sits underneath it — holds at any logo size, any viewport,
   any breakpoint, instead of guessing a fixed pixel offset. */
function syncHeaderMetrics() {
  if (nav) root.style.setProperty('--hdr-h', nav.offsetHeight + 'px');
}
syncHeaderMetrics();
if (document.fonts) document.fonts.ready.then(syncHeaderMetrics);

let ticking = false, navSolid = false;
function onScroll() {
  ticking = false;
  const y = scrollY, H = innerHeight, max = document.documentElement.scrollHeight - H;
  bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
  root.style.setProperty('--hp', clamp(y / (H * .85)).toFixed(3));
  // hysteresis (on past 48px, off only below 20px) so rubber-band/momentum scroll right at
  // the threshold can't flicker the nav's blurred background on and off every frame
  if (!navSolid && y > 48) navSolid = true; else if (navSolid && y < 20) navSolid = false;
  nav.classList.toggle('solid', navSolid);
  $$('.day.on .timeline').forEach((tl) => { const r = tl.getBoundingClientRect(); tl.style.setProperty('--tp', clamp((H * .6 - r.top) / r.height).toFixed(3)); });
  scrubs.forEach((it) => {
    const r = it.el.getBoundingClientRect(), P = clamp((H * .96 - r.top) / (H * .34)), n = it.w.length;
    it.w.forEach((sp, i) => { const p = reduce ? 1 : clamp(P * (n + 4) - i * .9, 0, 4) / 4; sp.style.opacity = (.1 + .9 * p).toFixed(3); sp.style.transform = `translateY(${((1 - p) * 55).toFixed(1)}%) rotate(${((1 - p) * 3).toFixed(2)}deg)`; });
  });
  if (!reduce) px.forEach((el) => { const r = el.getBoundingClientRect(), c = (r.top + r.height / 2 - H / 2) / H; el.style.translate = `0 ${(-c * (+el.dataset.px || .06) * 160).toFixed(1)}px`; });
}
let lastSY = scrollY, svT = 0, svV = 0;
(function svLoop() { const y = scrollY; svT += ((y - lastSY) / innerHeight * 6 - svT) * .25; lastSY = y; svV += (svT - svV) * .2; if (Math.abs(svV) < .001) svV = 0; root.style.setProperty('--sva', Math.min(1, Math.abs(svV)).toFixed(3)); requestAnimationFrame(svLoop); })();
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
addEventListener('resize', () => { syncHeaderMetrics(); onScroll(); });

/* =============================================================== countdowns */
const pad = (n) => String(n).padStart(2, '0'), cd = $('#countdown');
function tickCd() {
  const ms = Math.max(0, new Date(SCIS.start) - Date.now()), s = Math.floor(ms / 1000);
  const v = { d: Math.floor(s / 86400), h: Math.floor(s % 86400 / 3600), m: Math.floor(s % 3600 / 60), s: s % 60 };
  for (const k in v) { const b = $(`[data-u="${k}"]`, cd), txt = pad(v[k]); if (b && b.textContent !== txt) { b.textContent = txt; if (!reduce) { b.classList.remove('flip'); void b.offsetWidth; b.classList.add('flip'); } } }
}
if (cd) { tickCd(); setInterval(tickCd, 1000); }
$$('[data-deadline]').forEach((el) => {
  const end = new Date(SCIS[el.dataset.deadline]), total = 30 * 86400000, left = Math.max(0, end - Date.now());
  const days = Math.floor(left / 86400000), bar_ = $('.bar', el);
  $('[data-days]', el).textContent = left > 0 ? (days || '<1') : '0';
  if (left <= 0) $('small', el).textContent = 'closed';
  const C = 2 * Math.PI * 44; bar_.style.strokeDasharray = C; bar_.style.strokeDashoffset = C;
  new IntersectionObserver((e, o) => { if (e[0].isIntersecting) { bar_.style.strokeDashoffset = C * (1 - clamp(left / total)); o.disconnect(); } }, { threshold: .4 }).observe(el);
});

/* =============================================================== helpers */
const pointOf = (e, el) => (e.clientX || e.clientY) ? [e.clientX, e.clientY] : (() => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })();

/* =============================================================== glance tabs + specimens */
async function ensureSpecimens() {
  if (specimens || !stage) return specimens;
  try { const m = await import('./gl/specimen.js'); specimens = m.createSpecimens(); } catch (e) { console.warn('specimens unavailable', e); }
  return specimens;
}
$$('[data-tabs]').forEach((box) => {
  const tabs = $$('[data-tab]', box), panels = $$('[data-panel]', box);
  const show = async (key) => {
    tabs.forEach((t) => { const on = t.dataset.tab === key; t.classList.toggle('on', on); t.setAttribute('aria-selected', on); });
    panels.forEach((p) => p.classList.toggle('on', p.dataset.panel === key));
    const sp = await ensureSpecimens(); if (sp) sp.show(key, $(`[data-panel="${key}"] [data-specimen]`, box));
  };
  tabs.forEach((b) => b.addEventListener('click', () => { if (!b.classList.contains('on')) show(b.dataset.tab); }));
  new IntersectionObserver((e, o) => { if (e[0].isIntersecting) { show($('[data-tab].on', box).dataset.tab); o.disconnect(); } }, { rootMargin: '200px' }).observe(box);
});

/* =============================================================== day tabs */
$$('.daytab').forEach((b) => b.addEventListener('click', () => {
  if (b.classList.contains('on')) return;
  $$('.daytab').forEach((t) => { t.classList.toggle('on', t === b); t.setAttribute('aria-selected', t === b); });
  $$('.day').forEach((d) => d.classList.toggle('on', d.dataset.dayview === b.dataset.day));
  const d = $(`[data-dayview="${b.dataset.day}"]`);
  $$('[data-reveal]', d).forEach((el) => el.classList.add('in'));
  onScroll();
}));

/* =============================================================== pointer: tilt, glow, magnetic buttons, cursor */
document.addEventListener('pointermove', (e) => {
  const el = e.target.closest?.('[data-tilt],.btn,.glass');
  if (!el) return;
  const r = el.getBoundingClientRect(), pxx = (e.clientX - r.left) / r.width, pyy = (e.clientY - r.top) / r.height;
  el.style.setProperty('--mx', (pxx * 100).toFixed(1) + '%'); el.style.setProperty('--my', (pyy * 100).toFixed(1) + '%');
  if (el.hasAttribute('data-tilt') && !reduce && fine) { el.style.setProperty('--rx', ((.5 - pyy) * 8).toFixed(2) + 'deg'); el.style.setProperty('--ry', ((pxx - .5) * 10).toFixed(2) + 'deg'); }
  if (fine && !reduce && el.matches('.btn.primary,[data-mag]')) { el.style.transform = `translate(${((pxx - .5) * 10).toFixed(1)}px, ${((pyy - .5) * 8).toFixed(1)}px)`; }
}, { passive: true });
document.addEventListener('pointerout', (e) => {
  const el = e.target.closest?.('[data-tilt],.btn.primary,[data-mag]');
  if (el && !el.contains(e.relatedTarget)) { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); if (el.matches('.btn.primary,[data-mag]')) el.style.transform = ''; }
});

/* =============================================================== mobile menu */
const menuBtn = $('#menuBtn');
if (menuBtn) {
  const setMenu = (on) => { nav.classList.toggle('open', on); menuBtn.setAttribute('aria-expanded', on); };
  menuBtn.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  $$('.links a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  addEventListener('scroll', () => { if (nav.classList.contains('open') && Math.abs(scrollY - (setMenu.y ?? scrollY)) > 80) setMenu(false); }, { passive: true });
  menuBtn.addEventListener('click', () => { setMenu.y = scrollY; });
}

/* =============================================================== session sheet — a bespoke 3D model per session */
const data = JSON.parse($('#programme-data').textContent), byId = Object.fromEntries(data.map((s) => [s.id, s]));
const sheet = $('#sheet'); let viewer = null, sheetOpen = false, lastFocus = null;

async function openSheet(id, x, y, focusIdx = -1) {
  const s = byId[id]; if (!s) return;
  lastFocus = document.activeElement;
  sheet.dataset.sid = id;
  sheet.classList.remove('view-abstract');
  $('#sheetKicker').textContent = `Session ${s.number} · ${s.time}`;
  $('#sheetTitle').textContent = s.title;
  $('#sheetMeta').innerHTML = `<span>${esc(s.blurb)}</span><br><small>Chairs · ${esc(s.chairs)} &nbsp;·&nbsp; ${esc(s.venue)}</small>`;
  $('#sheetTalks').innerHTML = s.talks.map((t, i) => `
    <li class="talk${i === focusIdx ? ' hl' : ''}" data-open="${id}" data-talk="${i}" role="button" tabindex="0" aria-label="${esc(t.speaker)} — open abstract">
      <span class="avatar"><b>${esc(t.initials)}</b><u></u></span>
      <div><strong>${esc(t.speaker)}</strong><small>${esc(t.affiliation)}</small></div>
      <div class="tmeta"><time>${esc(t.time)}</time><em>${t.keynote ? 'Keynote' : 'Short talk'} · ${esc(t.slot)}</em></div>
    </li>`).join('');
  sheet.style.setProperty('--h', s.hue);
  sheet.hidden = false; sheet.classList.remove('closing'); document.body.classList.add('lock'); sheet.scrollTop = 0;
  sheetOpen = true; lenis?.stop(); stage?.setPaused(true);
  setTimeout(() => $('.sheet-close', sheet).focus({ preventScroll: true }), 50);
  try {
    if (!viewer) { const m = await import('./gl/sessions.js'); viewer = new m.SessionViewer($('#sheetCanvas')); }
    if (sheetOpen) viewer.open(id, s.hue);
  } catch (e) { console.warn('session viewer unavailable', e); }
}
function closeSheet() {
  if (!sheetOpen) return; sheetOpen = false; viewer?.close();
  const done = () => { sheet.hidden = true; sheet.classList.remove('view-abstract'); $('#sheetAbstract').hidden = true; document.body.classList.remove('lock'); lenis?.start(); stage?.setPaused(false); lastFocus?.focus?.({ preventScroll: true }); };
  done();
}

/* ---- click a speaker inside a session → their abstract, layered on top of the open sheet ---- */
function fillAbstract(name, aff, meta, title, abstract, hue, initials) {
  sheet.style.setProperty('--h', hue);
  $('#absInitials').textContent = initials;
  $('#absName').textContent = name;
  $('#absAff').textContent = aff;
  $('#absTime').textContent = meta || '';
  $('#absTitle').textContent = title || 'Abstract to follow';
  $('#absBody').innerHTML = abstract
    ? `<p>${esc(abstract)}</p>`
    : `<p class="abs-pending">Full abstract to follow — check back closer to the symposium.</p>`;
}
async function openAbstract(id, idx, x, y) {
  const s = byId[id]; if (!s) return;
  const t = s.talks[idx]; if (!t) return;
  if (!sheetOpen || sheet.dataset.sid !== id) await openSheet(id, x, y);
  fillAbstract(t.speaker, t.affiliation, `${t.time} · ${t.keynote ? 'Keynote' : 'Short talk'}`, t.title, t.abstract, s.hue, t.initials);
  sheet.classList.add('view-abstract');
  $('#sheetAbstract').hidden = false;
}
function backToSession() { sheet.classList.remove('view-abstract'); $('#sheetAbstract').hidden = true; }

document.addEventListener('click', (e) => {
  const spk = e.target.closest('[data-open]');
  const back = e.target.closest('.sheet-back');
  const sess = e.target.closest('[data-session]');
  if (spk) { const [x, y] = pointOf(e, spk); openAbstract(spk.dataset.open, +spk.dataset.talk, x, y); }
  else if (back) backToSession();
  else if (e.target.closest('.sheet-close')) closeSheet();
  else if (sess) { const [x, y] = pointOf(e, sess); openSheet(sess.dataset.session, x, y); }
});

addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (sheet.classList.contains('view-abstract')) backToSession();
    else closeSheet();
    return;
  }
  if (e.key === 'Enter' || e.key === ' ') {
    const el = e.target.closest?.('[role="button"]');
    if (el && (el.matches('[data-session]') || el.matches('[data-open]'))) { e.preventDefault(); el.click(); }
  }
});

/* =============================================================== boot */
async function boot() {
  const t0 = performance.now(), loader = $('#loader');
  const reveal = () => { if (loader && !loader.classList.contains('out')) { loader.classList.add('out'); setTimeout(() => loader.remove(), 900); } finishIntro(); };
  setTimeout(reveal, 8000); // failsafe — never leave the page hidden
  const fonts = Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 1800))]);
  try {
    const m = await import(SCIS.stageUrl || './gl/stage.js');
    stage = m.createStage($('#stage'));
  } catch (e) { console.warn('WebGL stage unavailable', e); root.classList.add('nogl'); }
  await fonts;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); // let the first 3D frame land before lifting the curtain
  setTimeout(reveal, Math.max(0, 500 - (performance.now() - t0)));
}
boot();
