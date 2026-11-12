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
  // Sampling has to happen right after a draw to the DEFAULT framebuffer (the
  // screen) and before the frame is composited: with preserveDrawingBuffer
  // false the buffer's contents are undefined once compositing has happened, so
  // reading from a plain rAF callback just returns zeros. The composer's final
  // OutputPass is the one that targets the null framebuffer, so hooking draws
  // and sampling only when FRAMEBUFFER_BINDING is null catches exactly that,
  // at most once per frame.
  let wantSample = false;
  function afterScreenDraw(gl) {
    if (!wantSample) return;
    try { if (gl.getParameter(gl.FRAMEBUFFER_BINDING) !== null) return; } catch (e) { return; }
    wantSample = false;
    sampleLuminance(gl);
  }
  for (const Ctx of [self.WebGLRenderingContext, self.WebGL2RenderingContext].filter(Boolean)) {
    const p = Ctx.prototype;
    if (p.__glDbgPatched) continue;
    p.__glDbgPatched = true;
    const de = p.drawElements, da = p.drawArrays;
    p.drawElements = function (m, c, t, o) { counters.draws++; const r = de.call(this, m, c, t, o); afterScreenDraw(this); return r; };
    p.drawArrays = function (m, f, c) { counters.draws++; const r = da.call(this, m, f, c); afterScreenDraw(this); return r; };
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
  let gpu = '…', aa = '…', prec = '…', factsRead = false;
  function readFacts() {
    try {
      const gl = canvas && (canvas.getContext('webgl2') || canvas.getContext('webgl'));
      if (!gl) return;
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      if (dbg) gpu = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL));
      aa = String(gl.getContextAttributes().antialias);
      // Fragment-shader float precision. The simplex noise in the membrane
      // shader computes ((x*34)+1)*x with x up to 289 — about 2.84e6, which
      // overflows mediump's 65504 ceiling and returns garbage. So a device
      // reporting highp 0 here (or three falling back to mediump) is exactly
      // the device where that noise, and the membrane, will flicker.
      const hp = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
      prec = 'fragHigh ' + (hp ? hp.precision : '?') + ' max~' + (hp ? Math.pow(2, hp.rangeMax).toExponential(1) : '?');
      factsRead = true;
    } catch (e) { /* diagnostic only — never break the page */ }
  }

  let frames = 0, janks = 0, worst = 0, worstWin = 0, fps = 0;
  let last = performance.now(), winStart = last, winFrames = 0;

  // Brightness sampler — the decisive test for where the blink lives.
  // Reads a small block of the canvas's own pixels each frame and tracks how
  // much its mean luminance swings. A large swing means the rendered CONTENT is
  // flickering (shader/bloom/visibility). A flat reading while the eye still
  // sees blinking means the content is steady and the flicker is happening in
  // compositing, outside the canvas — the two need completely different fixes.
  let lumMin = 999, lumMax = -1, lumSwing = 0, lumNow = -1;
  const px = new Uint8Array(16 * 16 * 4);
  function sampleLuminance(gl) {
    try {
      if (!gl || !canvas || !canvas.width) return;
      const x = (gl.drawingBufferWidth >> 1) - 8, y = (gl.drawingBufferHeight >> 1) - 8;
      gl.readPixels(x, y, 16, 16, gl.RGBA, gl.UNSIGNED_BYTE, px);
      let sum = 0;
      for (let i = 0; i < px.length; i += 4) sum += px[i] * .2126 + px[i + 1] * .7152 + px[i + 2] * .0722;
      lumNow = sum / (px.length / 4);
      if (lumNow < lumMin) lumMin = lumNow;
      if (lumNow > lumMax) lumMax = lumNow;
    } catch (e) { /* diagnostic only */ }
  }

  function tick(now) {
    const gap = now - last; last = now;
    if (frames > 3) {                    // ignore first frames (startup noise)
      if (gap > worst) worst = gap;
      if (gap > worstWin) worstWin = gap;
      if (gap > 100) janks++;            // a >100ms gap is a visible hitch
    }
    frames++; winFrames++;

    wantSample = true;   // armed; the draw hook takes the reading mid-frame

    if (now - winStart >= 1000) {
      fps = Math.round(winFrames * 1000 / (now - winStart));
      const dpf = Math.round(counters.draws / Math.max(1, winFrames));
      if (!factsRead && counters.draws > 0) readFacts();
      counters.draws = 0; winFrames = 0; winStart = now;
      // backing size is read live — the renderer resizes it after startup
      const backing = canvas ? canvas.width + 'x' + canvas.height : 'n/a';
      lumSwing = lumMax - lumMin;
      box.textContent =
        'fps ' + fps + '   draws/f ' + dpf + '   scroll ' + Math.round(scrollY) + '\n' +
        'worst ' + Math.round(worst) + 'ms  (last1s ' + Math.round(worstWin) + 'ms)\n' +
        'janks>100ms ' + janks + '   CTX LOST ' + lost + ' / restored ' + restored + '\n' +
        'PIXELS lum ' + lumNow.toFixed(1) + '  SWING ' + lumSwing.toFixed(1) + ' /255\n' +
        'dpr ' + (devicePixelRatio || 1) + '  backing ' + backing + '  aa ' + aa + '\n' +
        prec + '\n' +
        'gpu ' + gpu;
      worstWin = 0; lumMin = 999; lumMax = -1;
    }
    // re-register LAST so this callback runs after the stage's own rAF each
    // frame — otherwise the pixels sampled above are the previous frame's.
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
