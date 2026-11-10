/* FX — per-button scientific click effects drawn on a full-screen overlay. */
(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const cv = document.getElementById('fx'); if (!cv) return;
  const ctx = cv.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, DPR = 1, running = false, last = 0;
  const live = [];
  const rand = (a, b) => a + Math.random() * (b - a);
  const easeOut = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

  function resize() {
    DPR = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight;
    cv.width = W * DPR; cv.height = H * DPR; cv.style.width = W + 'px'; cv.style.height = H + 'px';
  }
  addEventListener('resize', resize); resize();

  function add(fn) {
    live.push(fn);
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
  }
  function loop(now) {
    const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = live.length - 1; i >= 0; i--) { let r; try { r = live[i](dt); } catch (e) { r = false; } if (r === false) live.splice(i, 1); }
    ctx.globalCompositeOperation = 'source-over';
    if (live.length) requestAnimationFrame(loop); else { running = false; ctx.clearRect(0, 0, W, H); }
  }
  function flash(x, y, r, hue, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `hsla(${hue},100%,85%,${a})`); g.addColorStop(.4, `hsla(${hue},100%,60%,${a * .35})`); g.addColorStop(1, `hsla(${hue},100%,50%,0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }

  /* 1. burst — radial light rays + sparks (the "firework" from the reference film) */
  function burst(x, y, hue = 40) {
    let age = 0;
    const rays = Array.from({ length: 120 }, () => ({ a: rand(0, TAU), v: rand(500, 1500), len: rand(.2, .8), life: rand(.6, 1.2), h: hue + rand(-25, 25) }));
    const sparks = Array.from({ length: 50 }, () => ({ a: rand(0, TAU), v: rand(80, 420), s: rand(1, 2.6) }));
    add((dt) => {
      age += dt; if (age > 1.35) return false;
      flash(x, y, 220 * (1 - Math.exp(-9 * age)), hue, Math.max(0, 1 - age / .55));
      ctx.lineCap = 'round';
      for (const r of rays) {
        const k = age / r.life; if (k >= 1) continue;
        const d = r.v * (1 - Math.exp(-5 * age)) / 5, d0 = d * (1 - r.len * (1 - k));
        ctx.strokeStyle = `hsla(${r.h},100%,${70 + 20 * (1 - k)}%,${1 - k})`; ctx.lineWidth = 1.6 * (1 - k) + .4;
        ctx.beginPath(); ctx.moveTo(x + Math.cos(r.a) * d0, y + Math.sin(r.a) * d0); ctx.lineTo(x + Math.cos(r.a) * d, y + Math.sin(r.a) * d); ctx.stroke();
      }
      for (const s of sparks) {
        const d = s.v * (1 - Math.exp(-3 * age)) / 3, a = Math.max(0, 1 - age / 1.3);
        ctx.fillStyle = `hsla(${hue},100%,85%,${a})`; ctx.beginPath(); ctx.arc(x + Math.cos(s.a) * d, y + Math.sin(s.a) * d + age * age * 30, s.s, 0, TAU); ctx.fill();
      }
    });
  }

  /* 2. ring — expanding concentric rings with rotating tick marks (clock / scale) */
  function ring(x, y, hue = 185) {
    let age = 0;
    add((dt) => {
      age += dt; if (age > 1.5) return false;
      for (let k = 0; k < 3; k++) {
        const u = (age - k * .13) / 1.1; if (u <= 0 || u >= 1) continue;
        const r = 260 * easeOut(u), a = 1 - u;
        ctx.strokeStyle = `hsla(${hue},95%,70%,${a * .9})`; ctx.lineWidth = 2.2 * a + .4;
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
        if (k === 0) {
          ctx.lineWidth = 1.4;
          for (let i = 0; i < 48; i++) {
            const an = i / 48 * TAU + age * 1.4, l = i % 4 ? 7 : 15;
            ctx.beginPath(); ctx.moveTo(x + Math.cos(an) * (r - 4), y + Math.sin(an) * (r - 4)); ctx.lineTo(x + Math.cos(an) * (r + l), y + Math.sin(an) * (r + l)); ctx.stroke();
          }
        }
      }
      flash(x, y, 80, hue, Math.max(0, .6 - age));
    });
  }

  /* 3. radar — sweeping scan with blips (location / "where") */
  function radar(x, y, hue = 160) {
    let age = 0;
    const blips = Array.from({ length: 7 }, () => ({ a: rand(0, TAU), r: rand(35, 165) }));
    add((dt) => {
      age += dt; const dur = 1.7; if (age > dur) return false;
      const fade = age > dur - .4 ? (dur - age) / .4 : 1, sweep = age / dur * TAU * 1.6;
      ctx.strokeStyle = `hsla(${hue},95%,65%,${.55 * fade})`; ctx.lineWidth = 1.2;
      for (const r of [55, 110, 170]) { ctx.beginPath(); ctx.arc(x, y, r * easeOut(age / .35), 0, TAU); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(x - 180, y); ctx.lineTo(x + 180, y); ctx.moveTo(x, y - 180); ctx.lineTo(x, y + 180); ctx.globalAlpha = .35 * fade; ctx.stroke(); ctx.globalAlpha = 1;
      if (ctx.createConicGradient) {
        const g = ctx.createConicGradient(sweep - 1.1, x, y);
        g.addColorStop(0, `hsla(${hue},100%,60%,0)`); g.addColorStop(.17, `hsla(${hue},100%,65%,${.55 * fade})`); g.addColorStop(.1751, `hsla(${hue},100%,60%,0)`); g.addColorStop(1, `hsla(${hue},100%,60%,0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 170, 0, TAU); ctx.fill();
      }
      ctx.strokeStyle = `hsla(${hue},100%,80%,${fade})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(sweep) * 170, y + Math.sin(sweep) * 170); ctx.stroke();
      for (const b of blips) {
        const diff = ((sweep - b.a) % TAU + TAU) % TAU, a = Math.max(0, 1 - diff / 3) * fade; if (a <= 0 || sweep < b.a) continue;
        flash(x + Math.cos(b.a) * b.r, y + Math.sin(b.a) * b.r, 14, hue + 20, a);
      }
    });
  }

  /* 4. helix — a DNA double helix grows upward out of the click point */
  function helix(x, y, hue = 185) {
    let age = 0;
    add((dt) => {
      age += dt; if (age > 1.6) return false;
      const p = easeOut(age / .9), fade = age > 1.1 ? Math.max(0, 1 - (age - 1.1) / .5) : 1, n = 70, Hh = 300;
      ctx.lineCap = 'round';
      for (let k = 0; k < n * p; k++) {
        const u = k / n, yy = y - u * Hh, ph = k * .42 + age * 6, sx = Math.sin(ph) * 30, z = Math.cos(ph);
        const hh = hue + u * 90;
        if (k % 2 === 0) { ctx.strokeStyle = `hsla(${hh},90%,70%,${.5 * fade})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + sx, yy); ctx.lineTo(x - sx, yy); ctx.stroke(); }
        for (const sgn of [1, -1]) {
          const zz = z * sgn, r = 2.6 + zz * 1.4;
          ctx.fillStyle = `hsla(${hh},95%,${72 + zz * 10}%,${(.8 + zz * .2) * fade})`; ctx.beginPath(); ctx.arc(x + sx * sgn, yy, Math.max(1, r), 0, TAU); ctx.fill();
        }
      }
      flash(x, y, 70, hue, .5 * fade);
    });
  }

  /* 5. fold — a peptide chain spirals in from far away and folds into a bright knot */
  function fold(x, y, hue = 270) {
    let age = 0, popped = false;
    const n = 42, beads = Array.from({ length: n }, (_, i) => ({ a0: rand(0, TAU), r0: rand(220, 520), i, spin: rand(3, 5.5) }));
    add((dt) => {
      age += dt; if (age > 1.3) return false;
      const u = easeOut(age / .95), pts = [];
      for (const b of beads) {
        const lag = Math.min(1, Math.max(0, u * 1.15 - b.i / n * .15)), rr = b.r0 * Math.pow(1 - lag, 1.6) + 6 * lag, an = b.a0 + lag * b.spin;
        pts.push([x + Math.cos(an) * rr, y + Math.sin(an) * rr * .8]);
      }
      const fade = age > .95 ? Math.max(0, 1 - (age - .95) / .35) : 1;
      ctx.strokeStyle = `hsla(${hue},90%,70%,${.45 * fade})`; ctx.lineWidth = 2; ctx.beginPath();
      pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
      pts.forEach((p, i) => { ctx.fillStyle = `hsla(${(hue + i * 6) % 360},95%,72%,${fade})`; ctx.beginPath(); ctx.arc(p[0], p[1], 3.2, 0, TAU); ctx.fill(); });
      flash(x, y, 40 + 70 * u, hue, .45 * u * fade);
      if (!popped && age > .85) { popped = true; burst(x, y, hue); }
    });
  }

  const FX = { burst, ring, radar, helix, fold };
  window.FX = FX;
  document.addEventListener('click', (e) => {
    if (reduce) return;
    const el = e.target.closest('[data-fx]'); if (!el) return;
    const fn = FX[el.dataset.fx]; if (!fn) return;
    let x = e.clientX, y = e.clientY;
    if (!e.detail && !x) { const r = el.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; }
    fn(x, y, el.dataset.hue ? +el.dataset.hue : undefined);
  });
})();
