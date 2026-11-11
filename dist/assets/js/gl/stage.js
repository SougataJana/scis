/* Stage — the page-wide background. Scenes sit along -Z; scrolling flies the camera through them. */
import { THREE, makeRenderer, makeComposer, addRig, updatePointScale, clamp, lerp, sstep, reduce, LOW } from './common.js';
import * as bio from './bio.js';

export function createStage(canvas) {
  const renderer = makeRenderer(canvas);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x02080d);
  scene.fog = new THREE.FogExp2(0x02080d, .016);
  const camera = new THREE.PerspectiveCamera(42, 1, .05, 400);
  addRig(scene);
  const { composer, bloom } = makeComposer(renderer, scene, camera, { strength: LOW ? .55 : .8, radius: .7, threshold: .2 });
  const D = 36;

  // scene definitions: [builder result, scale, y offset, tilt]
  const defs = [
    { m: bio.makeCell(), s: 2.45, y: 0, tilt: 0 },
    { m: bio.makeDNA({ pairs: 38 }), s: .92, y: -.1, tilt: -.3 },
    { m: bio.makeProtein(), s: 2.5, y: 0, tilt: 0 },
    { m: bio.makeNetwork(), s: 3.0, y: 0, tilt: 0 },
    { m: bio.makeField(), s: 1, y: 0, tilt: 0, center: true },
    { m: bio.makeBurst(), s: 1.35, y: 0, tilt: 0 },
  ];
  const pivots = defs.map((d, k) => {
    const p = new THREE.Group(); p.add(d.m.group); p.scale.setScalar(d.s); p.rotation.z = d.tilt; p.position.z = -k * D; scene.add(p); return p;
  });

  /* ---------- warp streaks: stars stretch with scroll velocity ---------- */
  const NST = LOW ? 260 : 620, SPAN = 80, stX = new Float32Array(NST), stY = new Float32Array(NST), stZ = new Float32Array(NST), stP = new Float32Array(NST * 6), stC = new Float32Array(NST * 6);
  for (let i = 0; i < NST; i++) { const a = Math.random() * 6.2832, r = 1.6 + Math.pow(Math.random(), .6) * 11; stX[i] = Math.cos(a) * r; stY[i] = Math.sin(a) * r * .62; stZ[i] = Math.random() * SPAN; }
  const stG = new THREE.BufferGeometry(); stG.setAttribute('position', new THREE.BufferAttribute(stP, 3)); stG.setAttribute('color', new THREE.BufferAttribute(stC, 3));
  const streaks = new THREE.LineSegments(stG, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); streaks.frustumCulled = false; streaks.visible = false; scene.add(streaks);
  let warp = 0, lastY = scrollY, svs = 0;

  /* ---------- scroll → scene index ---------- */
  let anchors = [], f = 0, fT = 0, W = 0, H = 0;
  function measure() {
    anchors = [];
    document.querySelectorAll('[data-scene]').forEach((el) => {
      const list = el.dataset.scene.split(',').map(Number), r = el.getBoundingClientRect(), top = r.top + scrollY, h = r.height;
      list.forEach((s, j) => anchors.push({ y: top + h * (j + .5) / list.length, s }));
    });
    anchors.sort((a, b) => a.y - b.y);
  }
  function target(y0) {
    const y = y0 + H * .5;
    if (!anchors.length) return 0;
    if (y <= anchors[0].y) return anchors[0].s;
    for (let i = 0; i < anchors.length - 1; i++) {
      const a = anchors[i], b = anchors[i + 1];
      if (y <= b.y) return a.s + (b.s - a.s) * sstep(((y - a.y) / (b.y - a.y) - .12) / .76);
    }
    return anchors[anchors.length - 1].s;
  }

  let lastW = 0, lastH = 0;
  function resize() {
    const newW = innerWidth, newH = innerHeight;
    // Mobile browsers (Android Chrome in particular) hide/show their address
    // bar while the page is scrolled, which fires a 'resize' event and changes
    // innerHeight by the bar's height without changing innerWidth. Rebuilding
    // the renderer/composer framebuffers on every one of those events is what
    // produced the visible "blink" on phones — a real resize (orientation
    // change, actual window resize) always changes the width too, so treat a
    // width-unchanged, modest height-only change as browser-chrome noise and
    // skip the GL resize for it.
    const chromeToggle = lastW > 0 && newW === lastW && Math.abs(newH - lastH) < 160;
    lastW = newW; lastH = newH;
    W = newW; H = newH;
    if (chromeToggle) { measure(); return; }
    // on some hosts the very first layout pass can momentarily report a 0 (or stale)
    // viewport size before the browser has finished its first paint; sizing the
    // renderer/composer to that leaves their framebuffers permanently zero-sized
    // (silent GL errors, canvas never recovers on its own) until another resize
    // happens to fire. Skip the GL resize when that happens — a follow-up call
    // below retries shortly after, once layout has definitely settled.
    if (W > 0 && H > 0) {
      renderer.setSize(W, H, false);
      composer.setSize(W, H); bloom.resolution.set(W, H);
      camera.aspect = W / H; camera.updateProjectionMatrix(); updatePointScale(renderer, camera);
    }
    measure();
  }

  /* ---------- state ---------- */
  let t = 0, last = performance.now(), mx = 0, my = 0, smx = 0, smy = 0, xCur = null, scrollNow = scrollY;
  const intro = { active: false, t: 0, onFlash: null, done: null, flashed: false };
  let frames = 0, acc = 0, degraded = false, paused = false;

  function layout(xOff, yOff, k) {
    const d = defs[k]; pivots[k].position.x = d.center ? 0 : xOff; pivots[k].position.y = d.y + (d.center ? 0 : yOff);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden || paused) { last = now; return; }
    let dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now;
    if (reduce) dt *= .2;
    t += dt;
    const wide = W > 900, xTarget = 0, yTarget = wide ? 0 : 1.2, sc = wide ? 1.3 : .85;

    let camZ, fov = 42, roll = 0;
    if (intro.active) {
      intro.t += dt; const T = 7.0, p = clamp(intro.t / T), s = p * p * p * (p * (6 * p - 15) + 10);
      camZ = 15 - 79 * s; fov = 42 + 18 * sstep((intro.t - 4.8) / 2.2); roll = Math.sin(intro.t * .7) * .06 * (1 - p);
      xCur = 0; bloom.strength = lerp(.8, 1.9, sstep((intro.t - 5.8) / 1.1));
      for (let k = 0; k < defs.length; k++) layout(0, 0, k);
      if (!intro.flashed && intro.t >= T - .15) { intro.flashed = true; intro.onFlash && intro.onFlash(); }
      if (intro.t >= T) { intro.active = false; f = fT = 0; xCur = 0; bloom.strength = LOW ? .55 : .8; intro.done && intro.done(); }
      camera.position.set(0, 0, camZ); camera.rotation.set(0, 0, roll);
    } else {
      scrollNow = scrollY; fT = target(scrollNow); f += (fT - f) * Math.min(1, dt * 2.6);
      if (xCur === null) xCur = xTarget; xCur += (xTarget - xCur) * Math.min(1, dt * 2.2);
      smx += (mx - smx) * Math.min(1, dt * 3); smy += (my - smy) * Math.min(1, dt * 3);
      camZ = 9.5 - f * D + (wide ? 0 : 1.5);
      const vy = (scrollNow - lastY) / Math.max(dt, .001) / H; lastY = scrollNow; svs += (vy - svs) * Math.min(1, dt * 6);
      // bridge: a gentle light-trail carries the camera across every scene-to-scene handoff, even on a slow, careful scroll —
      // not just a flash of streaks when scrolling fast. Peaks exactly mid-flight between two scenes, settles to 0 once arrived.
      const fr = ((f % 1) + 1) % 1, bridge = Math.sin(fr * Math.PI); const bridgeWarp = bridge * bridge * .24;
      const velWarp = clamp(Math.abs(svs) * .26 - .04);
      warp += (Math.max(velWarp, bridgeWarp) - warp) * Math.min(1, dt * 5); fov = 42 + warp * 9; roll = clamp(svs * .008, -.02, .02);
      for (let k = 0; k < defs.length; k++) { layout(xCur, yTarget, k); }
      camera.position.set(smx * .6, -smy * .4, camZ); camera.rotation.set(0, 0, 0); camera.lookAt(smx * .3 + (xCur * .08), -smy * .2, camZ - 10); camera.rotateZ(roll);
      bloom.strength = (LOW ? .55 : .8) + warp * .35;
    }
    if (Math.abs(camera.fov - fov) > .01) { camera.fov = fov; camera.updateProjectionMatrix(); updatePointScale(renderer, camera); }
    for (let k = 0; k < defs.length; k++) {
      const z = -k * D, vis = Math.abs(camZ - z) < (k === 5 ? 27 : 40); pivots[k].visible = vis;
      if (vis) { defs[k].m.update(t, dt); pivots[k].scale.setScalar(defs[k].s * sc); }
    }
    streaks.visible = warp > .015 && !intro.active;
    if (streaks.visible) {
      const len = warp * 16, cz = camera.position.z;
      for (let i = 0; i < NST; i++) {
        const zr = (((stZ[i] - cz) % SPAN) + SPAN) % SPAN, z = cz + 4 - zr, o = i * 6, fadeIn = Math.min(1, zr / 10) * Math.min(1, (SPAN - zr) / 14), k = warp * fadeIn * (.35 + .65 * ((i * 7) % 5) / 4);
        stP[o] = stX[i]; stP[o + 1] = stY[i]; stP[o + 2] = z; stP[o + 3] = stX[i]; stP[o + 4] = stY[i]; stP[o + 5] = z + len * (.4 + .6 * ((i * 13) % 7) / 6) * Math.sign(svs || 1);
        stC[o] = .55 * k; stC[o + 1] = .9 * k; stC[o + 2] = 1.0 * k; stC[o + 3] = 0; stC[o + 4] = 0; stC[o + 5] = 0;
      }
      stG.attributes.position.needsUpdate = true; stG.attributes.color.needsUpdate = true;
    }
    updatePointScale(renderer, camera); composer.render();

    // adaptive quality — desktop only. On phones/low-core devices this already
    // starts at a conservative pixelRatio (see makeRenderer), and forcing a
    // mid-session framebuffer reallocation (setPixelRatio + full resize) here
    // is what produced a visible flash shortly after the page loaded, while
    // the visitor is sitting on the landing page and the first ~90 frames are
    // still averaging out. Desktops rarely hit this path in the first place,
    // so skipping it for LOW removes the flash without losing the recovery
    // this was built for (heavy multi-tab/dual-GPU desktop sessions).
    if (!LOW) {
      acc += dt; frames++;
      if (frames === 90) {
        const avg = acc / frames; frames = 0; acc = 0;
        if (avg > .036 && !degraded) { degraded = true; renderer.setPixelRatio(1); resize(); bloom.strength *= .8; }
      }
    }
  }

  addEventListener('resize', resize);
  addEventListener('load', resize);
  // extra safety net for the zero-size race described above: retry shortly after
  // first paint even if no 'resize'/'load' event fires, so a bad initial reading
  // can never leave the canvas permanently mis-sized.
  setTimeout(resize, 300);
  new ResizeObserver(measure).observe(document.body);
  addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }, { passive: true });

  /* GPU context loss recovery — on a dual-GPU laptop switching graphics, or with several
     heavy WebGL tabs open at once, the context can drop for a moment; without handling this
     the canvas just goes black or flashes stale frames until reload. Pause cleanly and pick
     the render loop back up once the browser hands the context back. */
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); paused = true; console.warn('[stage] WebGL context lost'); }, false);
  canvas.addEventListener('webglcontextrestored', () => { degraded = false; frames = 0; acc = 0; resize(); paused = false; console.warn('[stage] WebGL context restored'); }, false);

  resize();
  renderer.compile(scene, camera);
  requestAnimationFrame(frame);

  return {
    renderer,
    playIntro({ onFlash } = {}) {
      return new Promise((res) => { intro.active = true; intro.t = 0; intro.flashed = false; intro.onFlash = onFlash; intro.done = res; });
    },
    get introTime() { return intro.t; },
    get introActive() { return intro.active; },
    debug() { return { f, fT, anchors: anchors.map((a) => [Math.round(a.y), a.s]), scrollNow, H, warp, streaksVisible: streaks.visible }; },
    setPaused(v) { paused = !!v; },
    skipIntro() { if (intro.active) intro.t = 7.0; },
  };
}
