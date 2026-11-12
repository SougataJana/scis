/* Scientific model builders. Each returns { group, update(t, dt) } in local units (≈1 = object radius). */
import {
  THREE, TAU, LOW, rng, gauss, lerp, clamp, sstep, GLSL_NOISE, makePoints, pointsMaterial, glowSprite, setSegment, hsl,
} from './common.js';

/* =========================================================================
   CELL — fresnel membrane, nucleus with chromatin, mitochondria with cristae,
   ER, Golgi, ribosomes, vesicles
   ========================================================================= */
/* Temporary on-device bisection for the mobile "only the cell blinks" report:
   ?cellhide=<groups> leaves the named sub-systems out of the cell, so the
   affected phone can narrow the flicker to one of them. Comma-separated:
     mem  membrane shells + haze      nuc  nucleus, nucleolus, chromatin
     org  ER, mitochondria, Golgi     pts  ribosome points + vesicles
   Inert unless passed. Remove once the culprit is known. */
const _twrap = /[?&]twrap=1\b/.test(location.search);
const _hide = new Set((new URLSearchParams(location.search).get('cellhide') || '').split(',').filter(Boolean));

export function makeCell() {
  const group = new THREE.Group(), R = rng(7), parts = {};
  const uTime = { value: 0 };
  const show = (k) => !_hide.has(k);

  // outer membrane (additive fresnel glass) + faint inner wall
  const memVS = /* glsl */`${GLSL_NOISE}
    uniform float uTime; varying vec3 vN; varying vec3 vV; varying vec3 vP;
    void main(){
      vec3 p = position;
      float n = snoise(p*1.5 + vec3(0.,uTime*.22,0.))*.05 + snoise(p*3.2 - uTime*.35)*.018;
      p += normal*n; vP = p;
      vec4 mv = modelViewMatrix*vec4(p,1.);
      vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz);
      gl_Position = projectionMatrix*mv;
    }`;
  const memFS = /* glsl */`${GLSL_NOISE}
    uniform vec3 uA; uniform vec3 uB; uniform float uBase; uniform float uTime; varying vec3 vN; varying vec3 vV; varying vec3 vP;
    void main(){
      float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
      float rim = pow(f, 2.0);
      float sp = snoise(vP*9. + uTime*.15)*.5+.5;           // receptor speckle
      vec3 c = mix(uA, uB, rim) + vec3(.35,.55,.75)*pow(f,5.) + vec3(.9,.95,1.)*pow(sp,6.)*.18*rim;
      gl_FragColor = vec4(c*.8, clamp(uBase + rim*.42, 0., 1.));
    }`;
  /* Temporary on-device tests for the membrane flicker:
       ?memhp=1      force highp on this material
       ?nospeckle=1  drop the pow(snoise(...),6.) term from the fragment shader
     The noise's permute() computes ((x*34)+1)*x with x up to 289 (~2.84e6),
     far past mediump's 65504 ceiling, so on a driver that gives fragment
     shaders mediump it overflows and returns garbage that differs per frame.
     The membrane raises that sample to the 6th power, which amplifies the
     instability into a visible flicker; the nucleus only squares it, which is
     why it looks stable. Remove both switches once the fix is settled. */
  /* Candidate fixes for the per-pixel cost of the speckle term. The device
     reports full highp (fragHigh 23) and forcing highp changes nothing, but
     dropping the snoise call clears the flicker, so the problem is how
     expensive that call is per fragment, not its precision: full 3D simplex
     noise over a near-fullscreen translucent sphere, twice (two shells).
       ?vertspeckle=1  same noise, evaluated per vertex and interpolated
                       (~21k vertices instead of ~670k fragments x2)
       ?cheapnoise=1   per-pixel still, but a hash-based value noise costing
                       a fraction of simplex
     Both keep the rim sparkle; nospeckle removes it outright. */
  const _q2 = new URLSearchParams(location.search);
  const SPECKLE_SRC = 'float sp = snoise(vP*9. + uTime*.15)*.5+.5;';
  const CHEAP_NOISE = `
    float hash31(vec3 p){ p=fract(p*.1031); p+=dot(p,p.yzx+33.33); return fract((p.x+p.y)*p.z); }
    float vnoise(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
      return mix(mix(mix(hash31(i),hash31(i+vec3(1,0,0)),f.x),mix(hash31(i+vec3(0,1,0)),hash31(i+vec3(1,1,0)),f.x),f.y),
                 mix(mix(hash31(i+vec3(0,0,1)),hash31(i+vec3(1,0,1)),f.x),mix(hash31(i+vec3(0,1,1)),hash31(i+vec3(1,1,1)),f.x),f.y),f.z); }`;
  let _memFS = memFS, _memVS = memVS;
  if (_q2.get('nospeckle') === '1') {
    _memFS = memFS.replace(SPECKLE_SRC, 'float sp = 0.0;');
  } else if (_q2.get('vertspeckle') === '1') {
    _memVS = memVS.replace('varying vec3 vP;', 'varying vec3 vP; varying float vSp;')
      .replace('p += normal*n; vP = p;', 'p += normal*n; vP = p; vSp = snoise(p*9. + uTime*.15)*.5+.5;');
    _memFS = memFS.replace('varying vec3 vP;', 'varying vec3 vP; varying float vSp;')
      .replace(SPECKLE_SRC, 'float sp = vSp;');
  } else if (_q2.get('cheapnoise') === '1') {
    // helpers must go ABOVE main(); GLSL has no nested function definitions
    _memFS = memFS.replace('void main(){', CHEAP_NOISE + '\n    void main(){')
      .replace(SPECKLE_SRC, 'float sp = vnoise(vP*9. + uTime*.15);');
  }
  const _memHP = /[?&]memhp=1\b/.test(location.search);
  const mkMem = (side, base, a, b) => new THREE.ShaderMaterial({
    vertexShader: _memVS, fragmentShader: _memFS, transparent: true, depthWrite: false, side, blending: THREE.AdditiveBlending,
    ...(_memHP ? { precision: 'highp' } : {}),
    uniforms: { uTime, uBase: { value: base }, uA: { value: new THREE.Color(a) }, uB: { value: new THREE.Color(b) } },
  });
  const memGeo = new THREE.IcosahedronGeometry(1, LOW ? 18 : 30);
  parts.memOuter = new THREE.Mesh(memGeo, mkMem(THREE.FrontSide, .03, 0x0a3a48, 0x5fd0e0));
  parts.memInner = new THREE.Mesh(memGeo, mkMem(THREE.BackSide, .02, 0x062a34, 0x2a9fb4));
  parts.memOuter.renderOrder = 5;
  if (show('mem') && show('shell') && show('shellin')) group.add(parts.memInner);
  if (show('mem') && show('shell') && show('shellout')) group.add(parts.memOuter);

  // cytoplasm haze
  const haze = glowSprite(0x2fb4c8, 3.2, .05); if (show('mem') && show('haze')) group.add(haze);

  // nucleus
  const nucVS = /* glsl */`${GLSL_NOISE}
    uniform float uTime; varying vec3 vN; varying vec3 vV; varying vec3 vP;
    void main(){ vec3 p=position; float n=snoise(p*2.4+uTime*.12)*.06; p+=normal*n; vP=p;
      vec4 mv=modelViewMatrix*vec4(p,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`;
  const nucFS = /* glsl */`${GLSL_NOISE}
    uniform float uTime; varying vec3 vN; varying vec3 vV; varying vec3 vP;
    void main(){
      float f=1.-abs(dot(normalize(vN),normalize(vV)));
      float c1=snoise(vP*7.+uTime*.08)*.5+.5, c2=snoise(vP*18.-uTime*.05)*.5+.5;   // chromatin mottling
      vec3 deep=vec3(.62,.2,.05), mid=vec3(1.,.55,.16), hi=vec3(1.,.9,.62);
      vec3 col=mix(deep,mid,c1); col=mix(col,hi,c2*c2*.55+pow(f,2.5)*.6);
      float pores=smoothstep(.78,.84,snoise(vP*26.)*.5+.5)*.5; col-=pores*.25;       // nuclear pores
      gl_FragColor=vec4(col*.62, .96);
    }`;
  parts.nucleus = new THREE.Mesh(new THREE.IcosahedronGeometry(.36, LOW ? 12 : 22), new THREE.ShaderMaterial({
    vertexShader: nucVS, fragmentShader: nucFS, transparent: true, uniforms: { uTime },
  }));
  if (show('nuc')) group.add(parts.nucleus);
  const nucleolus = new THREE.Mesh(new THREE.SphereGeometry(.09, 24, 16), new THREE.MeshStandardMaterial({ color: 0xffdca0, emissive: 0xff9a3c, emissiveIntensity: .8, roughness: .4 }));
  nucleolus.position.set(.06, .04, .1); if (show('nuc')) group.add(nucleolus);
  // chromatin fibres around the nucleus
  const chrom = new THREE.Group();
  for (let k = 0; k < 7; k++) {
    const pts = []; const s = R() * 10;
    for (let i = 0; i < 26; i++) { const a = i / 26 * TAU; pts.push(new THREE.Vector3(Math.cos(a * 2 + s) * .5 + Math.sin(a * 3 + s * 2) * .3, Math.sin(a + s) * .55, Math.cos(a * 3 - s) * .5 + Math.sin(a * 2) * .25).normalize().multiplyScalar(.415 + R() * .06)); }
    const t = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 120, .006, 5, true), new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(.07 + R() * .04, 1, .62), transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false }));
    chrom.add(t);
  }
  if (show('nuc')) group.add(chrom); parts.chrom = chrom;

  // endoplasmic reticulum — displaced wireframe shells
  const er = new THREE.Group();
  for (let k = 0; k < 3; k++) {
    const g = new THREE.IcosahedronGeometry(.5 + k * .1, 3), pa = g.attributes.position;
    for (let i = 0; i < pa.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(pa, i), n = Math.sin(v.x * 7 + k) * Math.cos(v.y * 6 - k) * .05 + Math.sin(v.z * 9 + k * 2) * .03; v.multiplyScalar(1 + n); pa.setXYZ(i, v.x, v.y, v.z); }
    const m = new THREE.LineSegments(new THREE.WireframeGeometry(g), new THREE.LineBasicMaterial({ color: k % 2 ? 0x56e0ff : 0x7fe9c8, transparent: true, opacity: .2, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.rotation.set(R() * 3, R() * 3, 0); er.add(m);
  }
  if (show('org')) group.add(er); parts.er = er;

  // mitochondria (capsule + cristae)
  const mito = [];
  const capGeo = new THREE.CapsuleGeometry(.055, .15, 8, 18);
  const outerMat = new THREE.MeshPhysicalMaterial({ color: 0xff6f86, roughness: .3, clearcoat: 1, transparent: true, opacity: .55, emissive: 0x4a0f1c, emissiveIntensity: .8, depthWrite: false });
  const cristaMat = new THREE.MeshStandardMaterial({ color: 0xffb3c1, emissive: 0xff6f86, emissiveIntensity: .5, roughness: .5 });
  for (let i = 0; i < 8; i++) {
    const g = new THREE.Group(), body = new THREE.Mesh(capGeo, outerMat); g.add(body);
    for (let k = -3; k <= 3; k++) { const c = new THREE.Mesh(new THREE.TorusGeometry(.038, .006, 6, 18, Math.PI * 1.5), cristaMat); c.position.y = k * .03; c.rotation.set(Math.PI / 2, 0, k * 1.3); g.add(c); }
    g.userData = { a: i / 8 * TAU, d: .6 + R() * .16, sp: (.05 + R() * .06) * (i % 2 ? 1 : -1), y: (R() - .5) * .5, ph: R() * 6 };
    mito.push(g); if (show('org')) group.add(g);
  }
  // Golgi
  const golgi = new THREE.Group(), gMat = new THREE.MeshPhysicalMaterial({ color: 0xa88bff, roughness: .35, clearcoat: .8, emissive: 0x2c1a6a, emissiveIntensity: .7 });
  for (let k = 0; k < 5; k++) { const arc = new THREE.Mesh(new THREE.TorusGeometry(.15 - k * .012, .016, 8, 32, Math.PI * 1.25), gMat); arc.position.y = k * .045 - .09; arc.rotation.x = Math.PI / 2; golgi.add(arc); }
  golgi.position.set(.42, -.22, .3); golgi.rotation.set(.4, .6, 0); if (show('org')) group.add(golgi);

  // ribosomes / vesicles
  const nR = LOW ? 260 : 520, rp = new Float32Array(nR * 3), rc = new Float32Array(nR * 3), rs = new Float32Array(nR), rbase = new Float32Array(nR * 3);
  for (let i = 0; i < nR; i++) {
    const v = new THREE.Vector3(R() - .5, R() - .5, R() - .5).normalize().multiplyScalar(.45 + Math.cbrt(R()) * .46);
    rbase.set([v.x, v.y, v.z], i * 3); rp.set([v.x, v.y, v.z], i * 3);
    const c = hsl(180 + R() * 50, .7, .75); rc.set([c.r, c.g, c.b], i * 3); rs[i] = .5 + R() * 1.3;
  }
  const ribo = makePoints(rp, rc, rs, pointsMaterial({ size: .028, opacity: .95 })); if (show('pts')) group.add(ribo);
  const vesMat = new THREE.MeshPhysicalMaterial({ color: 0x86b6ff, roughness: .1, clearcoat: 1, transparent: true, opacity: .55, emissive: 0x1a3a7a, emissiveIntensity: .6 });
  const ves = [];
  for (let i = 0; i < 12; i++) { const v = new THREE.Mesh(new THREE.SphereGeometry(.022 + R() * .03, 18, 14), vesMat); v.userData = { a: R() * TAU, b: R() * TAU, d: .5 + R() * .38, sp: .05 + R() * .12 }; ves.push(v); if (show('pts')) group.add(v); }

  const tmp = new THREE.Vector3();
  function update(t, dt) {
    uTime.value = _twrap ? t % 60 : t;
    parts.nucleus.rotation.y = t * .04; chrom.rotation.set(t * .03, t * .05, 0); er.rotation.y = t * .02; er.rotation.x = t * .015;
    mito.forEach((m) => {
      const u = m.userData; u.a += u.sp * dt;
      m.position.set(Math.cos(u.a) * u.d, u.y + Math.sin(t * .4 + u.ph) * .05, Math.sin(u.a) * u.d);
      m.rotation.set(t * .2 + u.ph, u.a, t * .15);
    });
    ves.forEach((v) => { const u = v.userData; u.a += u.sp * dt; v.position.set(Math.cos(u.a) * Math.sin(u.b) * u.d, Math.cos(u.b) * u.d, Math.sin(u.a) * Math.sin(u.b) * u.d); });
    const a = ribo.geometry.attributes.position;
    for (let i = 0; i < nR; i += 1) {
      const k = i * 3, s = Math.sin(t * .8 + i), c = Math.cos(t * .7 + i * 1.7);
      a.array[k] = rbase[k] + s * .012; a.array[k + 1] = rbase[k + 1] + c * .012; a.array[k + 2] = rbase[k + 2] + s * c * .012;
    }
    a.needsUpdate = true; group.rotation.y = t * .06;
  }
  return { group, update, parts };
}

/* =========================================================================
   DNA — instanced backbone, ribbons, colour-coded base pairs (A·T, G·C)
   ========================================================================= */
export function makeDNA({ pairs = 52, rise = .2, radius = .5, twist = .52 } = {}) {
  const group = new THREE.Group(), n = pairs, len = n * rise, A = [], B = [];
  for (let i = 0; i < n; i++) {
    const th = i * twist, x = (i - n / 2) * rise, y = Math.cos(th) * radius, z = Math.sin(th) * radius;
    A.push(new THREE.Vector3(x, y, z)); B.push(new THREE.Vector3(x, -y, -z));
  }
  const sph = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 18, 14), new THREE.MeshPhysicalMaterial({ color: 0xbdf3ff, roughness: .22, clearcoat: 1, emissive: 0x0d4656, emissiveIntensity: .8 }), n * 2);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < n; i++) {
    m4.compose(A[i], new THREE.Quaternion(), new THREE.Vector3(.085, .085, .085)); sph.setMatrixAt(i, m4);
    m4.compose(B[i], new THREE.Quaternion(), new THREE.Vector3(.085, .085, .085)); sph.setMatrixAt(n + i, m4);
  }
  group.add(sph);
  const tubeMat = new THREE.MeshPhysicalMaterial({ color: 0x7fe0f0, roughness: .3, clearcoat: .8, emissive: 0x0a3a48, emissiveIntensity: .7 });
  [A, B].forEach((S) => group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(S), n * 4, .032, 8, false), tubeMat)));
  // base pairs: 4 chemistries (A:T, T:A, G:C, C:G)
  const pal = [[0xff9f43, 0x54a0ff], [0x54a0ff, 0xff9f43], [0x2ed573, 0xfeca57], [0xfeca57, 0x2ed573]];
  const rr = rng(3), cyl = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 12), new THREE.MeshStandardMaterial({ roughness: .35, metalness: .05, emissive: 0x222222 }), n * 2);
  const nb = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshStandardMaterial({ roughness: .3 }), n * 2);
  const col = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const p = pal[Math.floor(rr() * 4)], mid = new THREE.Vector3().addVectors(A[i], B[i]).multiplyScalar(.5);
    const a1 = new THREE.Vector3().lerpVectors(A[i], mid, .86), b1 = new THREE.Vector3().lerpVectors(B[i], mid, .86);
    setSegment(cyl, i * 2, A[i], a1, .028); setSegment(cyl, i * 2 + 1, B[i], b1, .028);
    cyl.setColorAt(i * 2, col.set(p[0])); cyl.setColorAt(i * 2 + 1, col.set(p[1]));
    m4.compose(a1.clone().lerp(mid, .32), new THREE.Quaternion(), new THREE.Vector3(.07, .07, .07)); nb.setMatrixAt(i * 2, m4); nb.setColorAt(i * 2, col.set(p[0]));
    m4.compose(b1.clone().lerp(mid, .32), new THREE.Quaternion(), new THREE.Vector3(.07, .07, .07)); nb.setMatrixAt(i * 2 + 1, m4); nb.setColorAt(i * 2 + 1, col.set(p[1]));
  }
  group.add(cyl, nb);
  const hot = glowSprite(0xffc27a, 1.6, .9); group.add(hot);
  const hot2 = glowSprite(0x7fe9ff, 3.5, .18); group.add(hot2);
  function update(t) {
    group.rotation.x = t * .32;
    hot.position.set(Math.sin(t * .45) * len * .38, 0, 0); hot2.position.copy(hot.position);
    hot.material.opacity = .6 + Math.sin(t * 3) * .25;
  }
  return { group, update, length: len };
}

/* =========================================================================
   PROTEIN — α/β fold drawn as true cartoon ribbons (helix bands, β-arrows, loops)
   + side chains + surface haze + a docking ligand
   ========================================================================= */
export function makeProtein({ seed = 5, rainbow = true, ligand = true, plddt = false } = {}) {
  const group = new THREE.Group(), R = rng(seed);
  // AlphaFold-style per-residue confidence colouring (pLDDT): >90 dark blue · 70–90 light blue · 50–70 yellow · <50 orange
  const PL = [[0, 0xff7d45], [.5, 0xffdb13], [.7, 0x65cbf3], [.9, 0x0053d6]].map(([k, h]) => [k, new THREE.Color(h)]);
  const plddtAt = (u, ty) => {
    const conf = u < .04 || u > .97 ? .38 + .1 * Math.sin(u * 90) : ty === 1 ? .95 - .04 * Math.sin(u * 44) : ty === 2 ? .88 + .07 * Math.sin(u * 27) : .6 + .22 * Math.sin(u * 37 + 1.3);
    let col = PL[0][1].clone();
    for (let i = 1; i < PL.length; i++) col.lerp(PL[i][1], sstep((conf - PL[i][0] + .04) / .08));
    return col;
  };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const els = [
    { t: 1, a: V(-.55, .62, -.5), b: V(-.55, .62, .5) },
    { t: 2, a: V(-.42, 0, .5), b: V(-.42, 0, -.5) },
    { t: 2, a: V(-.14, 0, -.5), b: V(-.14, 0, .5) },
    { t: 2, a: V(.14, 0, .5), b: V(.14, 0, -.5) },
    { t: 2, a: V(.42, 0, -.5), b: V(.42, 0, .5) },
    { t: 1, a: V(.55, .62, .5), b: V(.55, .62, -.5) },
    { t: 1, a: V(0, -.66, -.5), b: V(0, -.66, .5) },
  ];
  const pts = [], types = [];
  const push = (p, t) => { pts.push(p); types.push(t); };
  els.forEach((e, i) => {
    const dir = new THREE.Vector3().subVectors(e.b, e.a), L = dir.length(); dir.normalize();
    const side = new THREE.Vector3(1, 0, 0).sub(dir.clone().multiplyScalar(dir.x)).normalize(), up = new THREE.Vector3().crossVectors(dir, side).normalize();
    const N = e.t === 1 ? 14 : 7;
    for (let k = 0; k < N; k++) {
      const u = k / (N - 1), c = e.a.clone().lerp(e.b, u);
      if (e.t === 1) { const ph = k * 1.75 + i; c.addScaledVector(side, Math.cos(ph) * .115).addScaledVector(up, Math.sin(ph) * .115); }
      else { c.addScaledVector(up, (k % 2 ? 1 : -1) * .012).addScaledVector(side, Math.sin(u * 3) * .008); }
      push(c, e.t);
    }
    const nx = els[i + 1]; if (nx) {
      const E = e.b, S = nx.a, mid = E.clone().add(S).multiplyScalar(.5), o = V(0, 0, Math.sign(E.z) || 1);
      push(E.clone().lerp(S, .22).addScaledVector(o, .13), 0); push(mid.clone().addScaledVector(o, .3 + R() * .06), 0); push(S.clone().lerp(E, .22).addScaledVector(o, .13), 0);
    }
  });
  // ribbon geometry
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', .5), SUB = 7, M = (pts.length - 1) * SUB, SEG = 14;
  const P = [], T = [], TY = [];
  for (let i = 0; i <= M; i++) { const u = i / M; P.push(curve.getPointAt(u)); T.push(curve.getTangentAt(u)); TY.push(types[Math.min(pts.length - 1, Math.round(u * (pts.length - 1)))]); }
  // per-sample frame
  const Nrm = [], Bin = [];
  for (let i = 0; i <= M; i++) {
    let n;
    const t = T[i];
    if (TY[i] === 1) { const a = P[Math.max(0, i - SUB * 2)], b = P[Math.min(M, i + SUB * 2)], ax = a.clone().add(b).multiplyScalar(.5); n = P[i].clone().sub(ax); }
    else if (TY[i] === 2) n = V(0, 1, 0);
    else n = i ? Nrm[i - 1].clone() : V(0, 1, 0);
    n.addScaledVector(t, -n.dot(t)); if (n.lengthSq() < 1e-6) n = V(0, 1, 0).addScaledVector(t, -t.y);
    n.normalize();
    if (i && n.dot(Nrm[i - 1]) < 0) n.negate();
    Nrm.push(n);
  }
  for (let pass = 0; pass < 6; pass++) for (let i = 1; i < M; i++) { Nrm[i].add(Nrm[i - 1]).add(Nrm[i + 1]).normalize(); }
  for (let i = 0; i <= M; i++) { Nrm[i].addScaledVector(T[i], -Nrm[i].dot(T[i])).normalize(); Bin.push(new THREE.Vector3().crossVectors(T[i], Nrm[i]).normalize()); }
  const pos = [], col = [], idx = [];
  const strandEnds = []; { let s = -1; for (let i = 0; i <= M; i++) { if (TY[i] === 2 && s < 0) s = i; if ((TY[i] !== 2 || i === M) && s >= 0) { strandEnds.push([s, i]); s = -1; } } }
  const c = new THREE.Color();
  for (let i = 0; i <= M; i++) {
    let W = .018, Th = .018;
    if (TY[i] === 1) { W = .082; Th = .016; } else if (TY[i] === 2) {
      W = .07; Th = .017; const se = strandEnds.find(([a, b]) => i >= a && i <= b);
      if (se) { const u = (i - se[0]) / Math.max(1, se[1] - se[0]); if (u > .78) W = lerp(.13, .0, (u - .78) / .22); }
    }
    if (plddt) c.copy(plddtAt(i / M, TY[i])); else c.setHSL(rainbow ? lerp(.62, 0, i / M) : .5, .78, .56);
    for (let k = 0; k < SEG; k++) {
      const a = k / SEG * TAU, cx = Math.cos(a), sx = Math.sin(a);
      const p = P[i].clone().addScaledVector(Bin[i], cx * W).addScaledVector(Nrm[i], sx * Th);
      pos.push(p.x, p.y, p.z); col.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < M; i++) for (let k = 0; k < SEG; k++) {
    const a = i * SEG + k, b = i * SEG + (k + 1) % SEG, c2 = (i + 1) * SEG + k, d = (i + 1) * SEG + (k + 1) % SEG;
    idx.push(a, c2, b, b, c2, d);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  const ribbon = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: .26, metalness: .02, clearcoat: .9, clearcoatRoughness: .22, side: THREE.DoubleSide, emissive: 0x101820, emissiveIntensity: .6 }));
  group.add(ribbon);

  // side chains
  const NS = LOW ? 160 : 320, sc = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ roughness: .4 }), NS), m4 = new THREE.Matrix4();
  for (let i = 0; i < NS; i++) {
    const j = Math.floor(R() * M), o = Nrm[j].clone().multiplyScalar((R() < .5 ? 1 : -1) * (.05 + R() * .05)).add(Bin[j].clone().multiplyScalar((R() - .5) * .08));
    const p = P[j].clone().add(o); m4.compose(p, new THREE.Quaternion(), new THREE.Vector3(1, 1, 1).multiplyScalar(.012 + R() * .014)); sc.setMatrixAt(i, m4);
    sc.setColorAt(i, plddt ? plddtAt(j / M, TY[j]).lerp(new THREE.Color(0xffffff), .35) : new THREE.Color().setHSL(rainbow ? lerp(.62, 0, j / M) : .5, .5, .72));
  }
  group.add(sc);
  // surface haze
  const NH = LOW ? 900 : 1800, hp = new Float32Array(NH * 3), hc = new Float32Array(NH * 3);
  for (let i = 0; i < NH; i++) { const j = Math.floor(R() * M), p = P[j]; hp.set([p.x + gauss(R) * .12, p.y + gauss(R) * .12, p.z + gauss(R) * .12], i * 3); const cc = plddt ? plddtAt(j / M, TY[j]) : new THREE.Color().setHSL(rainbow ? lerp(.62, 0, j / M) : .5, .7, .6); hc.set([cc.r, cc.g, cc.b], i * 3); }
  const haze = makePoints(hp, hc, 1, pointsMaterial({ size: .045, opacity: .32 })); group.add(haze);
  const centre = new THREE.Vector3(0, .3, 0);
  group.userData.pocket = centre;

  // ligand: aromatic ring + substituents
  let lig = null, ligGlow = null;
  if (ligand) {
    lig = new THREE.Group();
    const elem = { C: [0x8a97a8, .026], O: [0xff5a5a, .026], N: [0x5a8bff, .026], H: [0xf0f4ff, .015] };
    const atoms = [], add = (e, x, y, z) => { atoms.push([e, V(x, y, z)]); const m = new THREE.Mesh(new THREE.SphereGeometry(elem[e][1], 16, 12), new THREE.MeshPhysicalMaterial({ color: elem[e][0], roughness: .2, clearcoat: 1, emissive: elem[e][0], emissiveIntensity: .25 })); m.position.set(x, y, z); lig.add(m); };
    for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; add('C', Math.cos(a) * .05, Math.sin(a) * .05, 0); }
    add('O', .105, .0, .02); add('N', -.09, .09, -.01); add('N', -.09, -.09, .01); add('H', .125, .04, .05);
    const bond = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 8), new THREE.MeshStandardMaterial({ color: 0xc9d4e4, roughness: .4 }), 20); let nbd = 0;
    for (let i = 0; i < atoms.length; i++) for (let j = i + 1; j < atoms.length; j++) { if (atoms[i][1].distanceTo(atoms[j][1]) < .075 && nbd < 20) setSegment(bond, nbd++, atoms[i][1], atoms[j][1], .006); }
    bond.count = nbd; lig.add(bond);
    ligGlow = glowSprite(0xffd27a, .45, .9); lig.add(ligGlow);
    lig.scale.setScalar(1.4); group.add(lig);
  }
  function update(t) {
    group.rotation.y = t * .12; group.rotation.x = Math.sin(t * .2) * .12;
    if (lig) {
      const T = 9, u = (t % T) / T, appr = sstep(u / .42), bound = u > .42 && u < .84, fade = u > .84 ? 1 - (u - .84) / .16 : 1;
      const a = (1 - appr) * 7 + u * 2, r = (1 - appr) * 1.9;
      const tgt = centre.clone().add(V(Math.cos(a) * r, (1 - appr) * .9 + Math.sin(a * .7) * r * .3, Math.sin(a) * r));
      lig.position.copy(tgt); lig.rotation.set(t * 1.2 * (1 - appr), t * .9 * (1 - appr), 0);
      ligGlow.material.opacity = (bound ? .55 + Math.sin(t * 6) * .35 : .45) * fade; lig.scale.setScalar(1.4 * (u < .04 ? u / .04 : fade));
    }
  }
  return { group, update };
}

/* =========================================================================
   NETWORK — communities, glossy nodes, signal pulses
   ========================================================================= */
export function makeNetwork({ n = LOW ? 50 : 84, communities = 5, hue = 190 } = {}) {
  const group = new THREE.Group(), R = rng(21), nodes = [], com = [];
  const centers = Array.from({ length: communities }, (_, i) => { const a = i / communities * TAU; return new THREE.Vector3(Math.cos(a) * .6, (R() - .5) * .8, Math.sin(a) * .6); });
  for (let i = 0; i < n; i++) { const c = i % communities; com.push(c); nodes.push(centers[c].clone().add(new THREE.Vector3(gauss(R), gauss(R), gauss(R)).multiplyScalar(.27))); }
  const inst = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 20, 16), new THREE.MeshPhysicalMaterial({ roughness: .2, clearcoat: 1, emissive: 0x112233, emissiveIntensity: .7 }), n), m4 = new THREE.Matrix4(), col = new THREE.Color();
  const sizes = [];
  for (let i = 0; i < n; i++) { const hub = R() < .14, s = hub ? .075 + R() * .03 : .026 + R() * .02; sizes.push(s); m4.compose(nodes[i], new THREE.Quaternion(), new THREE.Vector3(s, s, s)); inst.setMatrixAt(i, m4); inst.setColorAt(i, col.setHSL(((hue + com[i] * 38) % 360) / 360, .75, hub ? .7 : .58)); }
  group.add(inst);
  const edges = [], lp = [], lc = [];
  for (let i = 0; i < n; i++) {
    const ds = nodes.map((p, j) => [j, p.distanceTo(nodes[i])]).filter(([j]) => j !== i).sort((a, b) => a[1] - b[1]).slice(0, 3);
    ds.forEach(([j]) => { edges.push([i, j]); }); if (R() < .12) edges.push([i, Math.floor(R() * n)]);
  }
  edges.forEach(([i, j]) => { lp.push(nodes[i].x, nodes[i].y, nodes[i].z, nodes[j].x, nodes[j].y, nodes[j].z); const c1 = col.setHSL(((hue + com[i] * 38) % 360) / 360, .8, .55).clone(), c2 = col.setHSL(((hue + com[j] * 38) % 360) / 360, .8, .55); lc.push(c1.r, c1.g, c1.b, c2.r, c2.g, c2.b); });
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3)); lg.setAttribute('color', new THREE.Float32BufferAttribute(lc, 3));
  group.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .4, blending: THREE.AdditiveBlending, depthWrite: false })));
  const NP = LOW ? 60 : 130, pp = new Float32Array(NP * 3), pc = new Float32Array(NP * 3).fill(1), ps = new Float32Array(NP).fill(1.6), pulses = [];
  for (let i = 0; i < NP; i++) pulses.push({ e: Math.floor(R() * edges.length), u: R(), v: .25 + R() * .5 });
  const pts = makePoints(pp, pc, ps, pointsMaterial({ size: .05, opacity: 1 })); group.add(pts);
  const halo = glowSprite(0x3fd0e8, 3.2, .1); group.add(halo);
  function update(t, dt) {
    const a = pts.geometry.attributes.position;
    pulses.forEach((p, i) => {
      p.u += p.v * dt; if (p.u > 1) { p.u = 0; p.e = Math.floor(R() * edges.length); }
      const [x, y] = edges[p.e], A = nodes[x], B = nodes[y];
      a.setXYZ(i, lerp(A.x, B.x, p.u), lerp(A.y, B.y, p.u), lerp(A.z, B.z, p.u));
    });
    a.needsUpdate = true; group.rotation.y = t * .1;
  }
  return { group, update };
}

/* =========================================================================
   FIELD — calm drifting particles for text-heavy sections
   ========================================================================= */
export function makeField() {
  /* a galaxy of voices: one spiral arm per session, nodes are speakers, bridges are the conversations between fields */
  const group = new THREE.Group(), gal = new THREE.Group(), R = rng(99), ARMS = 7, NA = LOW ? 46 : 84, HUES = [172, 28, 268, 198, 132, 330, 48];
  group.add(gal); group.rotation.x = .95; group.rotation.z = .12;
  const N = ARMS * NA, P = [], arm = [], pos = new Float32Array(N * 3), col = new Float32Array(N * 3), siz = new Float32Array(N);
  for (let a = 0; a < ARMS; a++) for (let i = 0; i < NA; i++) {
    const t = i / (NA - 1), r = .7 + t * 5.6, ang = a * Math.PI * 2 / ARMS + t * 3.3 + (R() - .5) * .22 * (.4 + t), k = a * NA + i;
    const v = new THREE.Vector3(Math.cos(ang) * r, (R() - .5) * .45 * (.3 + t), Math.sin(ang) * r); P.push(v); arm.push(a); pos.set([v.x, v.y, v.z], k * 3);
    const c = hsl(HUES[a] + (R() - .5) * 18, .95, .55 + R() * .15); col.set([c.r * 2, c.g * 2, c.b * 2], k * 3); siz[k] = .7 + Math.pow(R(), 3) * 2.4 + (i % 12 === 0 ? 1.2 : 0);
  }
  const pts = makePoints(pos, col, siz, pointsMaterial({ size: .14, opacity: 1 })); gal.add(pts);
  // dust following the arms
  const ND = LOW ? 700 : 1800, dp = new Float32Array(ND * 3), dc = new Float32Array(ND * 3), ds = new Float32Array(ND);
  for (let i = 0; i < ND; i++) {
    const a = Math.floor(R() * ARMS), t = Math.pow(R(), .8), r = .5 + t * 6, ang = a * Math.PI * 2 / ARMS + t * 3.3 + (R() - .5) * .9 * (.3 + t), c = hsl(HUES[a], .5, .4 + R() * .2);
    dp.set([Math.cos(ang) * r, (R() - .5) * .8 * (.3 + t), Math.sin(ang) * r], i * 3); dc.set([c.r * 1.3, c.g * 1.3, c.b * 1.3], i * 3); ds[i] = .3 + R() * .8;
  }
  gal.add(makePoints(dp, dc, ds, pointsMaterial({ size: .08, opacity: 1 })));
  // links: along each arm, plus bridges to the nearest node of another arm
  const L = []; for (let a = 0; a < ARMS; a++) for (let i = 0; i < NA - 1; i++) L.push([a * NA + i, a * NA + i + 1, 0]);
  for (let k = 0; k < N; k += 2) {
    let best = -1, bd = 1.25 * 1.25; for (let j = 0; j < N; j++) { if (arm[j] === arm[k]) continue; const d = P[k].distanceToSquared(P[j]); if (d < bd) { bd = d; best = j; } }
    if (best >= 0) L.push([k, best, 1]);
  }
  const lp = new Float32Array(L.length * 6), lc = new Float32Array(L.length * 6);
  L.forEach(([x, y, bridge], i) => { lp.set([P[x].x, P[x].y, P[x].z, P[y].x, P[y].y, P[y].z], i * 6); const k = bridge ? 1.0 : .6; for (const [q, o] of [[x, 0], [y, 3]]) { lc[i * 6 + o] = col[q * 3] * k * 1.2; lc[i * 6 + o + 1] = col[q * 3 + 1] * k * 1.2; lc[i * 6 + o + 2] = col[q * 3 + 2] * k * 1.2; } });
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(lp, 3)); lg.setAttribute('color', new THREE.BufferAttribute(lc, 3));
  gal.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false })));
  // pulses travelling along links
  const NP = LOW ? 70 : 150, pu = Array.from({ length: NP }, () => ({ l: Math.floor(R() * L.length), u: R(), sp: .25 + R() * .5 })), pp = new Float32Array(NP * 3), pc = new Float32Array(NP * 3), ps = new Float32Array(NP);
  const pulses = makePoints(pp, pc, ps, pointsMaterial({ size: .16, opacity: 1 })); gal.add(pulses);
  const core = glowSprite(0xffc27a, 3.2, .55), halo = glowSprite(0x6fe9ff, 9, .12); group.add(halo, core);
  function update(t, dt = .016) {
    gal.rotation.y = t * .045; group.rotation.x = .95 + Math.sin(t * .13) * .06; core.scale.setScalar(3.2 + Math.sin(t * 1.3) * .25); pts.material.uniforms.uOpacity.value = .85 + .15 * Math.sin(t * 1.7);
    for (let i = 0; i < NP; i++) {
      const q = pu[i]; q.u += dt * q.sp; if (q.u >= 1) { q.u = 0; q.l = Math.floor(R() * L.length); }
      const [x, y] = L[q.l], b = Math.sin(q.u * Math.PI);
      pp[i * 3] = P[x].x + (P[y].x - P[x].x) * q.u; pp[i * 3 + 1] = P[x].y + (P[y].y - P[x].y) * q.u; pp[i * 3 + 2] = P[x].z + (P[y].z - P[x].z) * q.u;
      pc[i * 3] = (col[x * 3] * .5 + .6) * b; pc[i * 3 + 1] = (col[x * 3 + 1] * .5 + .6) * b; pc[i * 3 + 2] = (col[x * 3 + 2] * .5 + .6) * b; ps[i] = 1.2 + b * 1.6;
    }
    const g = pulses.geometry.attributes; g.position.needsUpdate = g.aColor.needsUpdate = g.aSize.needsUpdate = true;
  }
  return { group, update };
}

/* =========================================================================
   BURST — golden radial starburst (finale)
   ========================================================================= */
export function makeBurst() {
  const group = new THREE.Group(), R = rng(47), N = LOW ? 320 : 640, lp = new Float32Array(N * 6), lc = new Float32Array(N * 6), sp = new Float32Array(N * 3), sc = new Float32Array(N * 3), ss = new Float32Array(N);
  const dirs = [];
  for (let i = 0; i < N; i++) {
    const d = new THREE.Vector3(R() - .5, R() - .5, R() - .5).normalize(), L = .35 + Math.pow(R(), 2.4) * 3.6, r0 = .12;
    dirs.push([d, L]); lp.set([d.x * r0, d.y * r0, d.z * r0, d.x * L, d.y * L, d.z * L], i * 6);
    lc.set([1, .93, .78, 0, 0, 0], i * 6); const g = new THREE.Color().setHSL(.08 + R() * .05, 1, .7);
    sp.set([d.x * L, d.y * L, d.z * L], i * 3); sc.set([g.r, g.g, g.b], i * 3); ss[i] = .5 + R() * 1.6;
  }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(lp, 3)); lg.setAttribute('color', new THREE.BufferAttribute(lc, 3));
  const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false }));
  const pts = makePoints(sp, sc, ss, pointsMaterial({ size: .05, opacity: .85 }));
  const core = glowSprite(0xffffff, .8, .7), halo = glowSprite(0xffa850, 4.2, .22);
  group.add(lines, pts, halo, core);
  function update(t) { group.rotation.y = t * .08; group.rotation.x = t * .05; const p = 1 + Math.sin(t * 1.6) * .05; core.scale.setScalar(.8 * p); halo.scale.setScalar(4.2 * p); halo.material.opacity = .2 + Math.sin(t * 1.2) * .05; }
  return { group, update };
}
