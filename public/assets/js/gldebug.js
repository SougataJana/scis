/* On-device WebGL diagnostic overlay. Opt-in only: add ?debug=gl to the URL.
   Exists because the landing-page "blink" reproduces on real budget Android GPUs
   but not in any desktop browser or headless harness available here — so the
   instrument has to run on the affected phone and report what it sees.
   Reports whichever of these is actually happening:
     - WebGL context lost/restored cycling  → "CTX LOST" climbs
     - main-thread/GPU stalls               → "worst" and "janks" climb
     - steady low frame rate                → "fps" stays low with few janks
   Nothing here loads unless the flag is present. */

export function start(canvas) {
  const counters = { draws: 0 };
  for (const Ctx of [self.WebGLRenderingContext, self.WebGL2RenderingContext].filter(Boolean)) {
    const p = Ctx.prototype;
    if (p.__glDbgPatched) continue;
    p.__glDbgPatched = true;
    const de = p.drawElements, da = p.drawArrays;
    p.drawElements = function (m, c, t, o) { counters.draws++; return de.call(this, m, c, t, o); };
    p.drawArrays = function (m, f, c) { counters.draws++; return da.call(this, m, f, c); };
  }

  let lost = 0, restored = 0;
  if (canvas) {
    canvas.addEventListener('webglcontextlost', () => { lost++; }, false);
    canvas.addEventListener('webglcontextrestored', () => { restored++; }, false);
  }

  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;top:0;left:0;z-index:99999;background:rgba(0,0,0,.86);color:#6cf;' +
    'font:12px/1.45 ui-monospace,Menlo,monospace;padding:8px 10px;max-width:100vw;white-space:pre;' +
    'pointer-events:none;border-bottom-right-radius:8px;text-shadow:0 0 2px #000';
  document.body.appendChild(box);

  // Device facts are read LAZILY, only once the renderer has drawn a frame.
  // Calling getContext() before three.js does would hand three.js *our* context
  // with default attributes (antialias: true) instead of the one it asked for —
  // the instrument would silently change the settings it is meant to measure.
  // Once draws > 0 the context exists, so getContext returns that same one.
  let gpu = '…', aa = '…', factsRead = false;
  function readFacts() {
    try {
      const gl = canvas && (canvas.getContext('webgl2') || canvas.getContext('webgl'));
      if (!gl) return;
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      if (dbg) gpu = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL));
      aa = String(gl.getContextAttributes().antialias);
      factsRead = true;
    } catch (e) { /* diagnostic only — never break the page */ }
  }

  let frames = 0, janks = 0, worst = 0, worstWin = 0, fps = 0;
  let last = performance.now(), winStart = last, winFrames = 0;

  function tick(now) {
    requestAnimationFrame(tick);
    const gap = now - last; last = now;
    if (frames > 3) {                    // ignore first frames (startup noise)
      if (gap > worst) worst = gap;
      if (gap > worstWin) worstWin = gap;
      if (gap > 100) janks++;            // a >100ms gap is a visible hitch
    }
    frames++; winFrames++;

    if (now - winStart >= 1000) {
      fps = Math.round(winFrames * 1000 / (now - winStart));
      const dpf = Math.round(counters.draws / Math.max(1, winFrames));
      if (!factsRead && counters.draws > 0) readFacts();
      counters.draws = 0; winFrames = 0; winStart = now;
      // backing size is read live — the renderer resizes it after startup
      const backing = canvas ? canvas.width + 'x' + canvas.height : 'n/a';
      box.textContent =
        'fps ' + fps + '   draws/f ' + dpf + '   scroll ' + Math.round(scrollY) + '\n' +
        'worst ' + Math.round(worst) + 'ms  (last1s ' + Math.round(worstWin) + 'ms)\n' +
        'janks>100ms ' + janks + '   CTX LOST ' + lost + ' / restored ' + restored + '\n' +
        'dpr ' + (devicePixelRatio || 1) + '  backing ' + backing + '  aa ' + aa + '\n' +
        'gpu ' + gpu;
      worstWin = 0;
    }
  }
  requestAnimationFrame(tick);
}
