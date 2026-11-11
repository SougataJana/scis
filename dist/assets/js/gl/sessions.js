/* Session scenes — one bespoke scientific visualisation per session theme. */
import {
  THREE, TAU, LOW, rng, gauss, lerp, clamp, sstep, hsl, GLSL_NOISE, makeRenderer, makeComposer, addRig, updatePointScale,
  makePoints, pointsMaterial, glowSprite, setSegment, disposeTree,
} from './common.js';
import { makeDNA, makeProtein } from './bio.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

/* ------------------------------------------------------------------ 1 · OMICS */
function omics(hue) {
  const group = new THREE.Group(), R = rng(2);
  const dna = makeDNA({ pairs: 36, radius: .42 }); dna.group.scale.setScalar(.82); dna.group.rotation.z = .45; group.add(dna.group);
  const N = LOW ? 1800 : 3600, K = 9, centers = [];
  for (let k = 0; k < K; k++) { const y = 1 - (k + .5) / K * 2, r = Math.sqrt(1 - y * y), a = k * 2.399; centers.push(V3(Math.cos(a) * r, y, Math.sin(a) * r).multiplyScalar(2.15)); }
  const start = new Float32Array(N * 3), targ = new Float32Array(N * 3), pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const k = i % K, c = centers[k], s = V3(gauss(R), gauss(R), gauss(R)).multiplyScalar(1.1);
    start.set([s.x, s.y, s.z], i * 3);
    // elongated "trajectory" clusters
    const ax = c.clone().normalize(), tangent = V3(-ax.z, 0, ax.x).normalize(), u = gauss(R);
    const tg = c.clone().addScaledVector(tangent, u * .45).add(V3(gauss(R), gauss(R), gauss(R)).multiplyScalar(.16));
    targ.set([tg.x, tg.y, tg.z], i * 3);
    const cc = hsl(hue - 60 + k * 26, .75, .6); col.set([cc.r, cc.g, cc.b], i * 3); size[i] = .5 + R() * 1.1;
  }
  const cloud = makePoints(pos, col, size, pointsMaterial({ size: .05, opacity: .95 })); group.add(cloud);
  group.add(glowSprite(hsl(hue, .8, .35), 7, .07));
  function update(t, dt) {
    const m = sstep((t - .4) / 3.4), a = cloud.geometry.attributes.position.array;
    for (let i = 0; i < N * 3; i++) a[i] = lerp(start[i], targ[i], m) * (1 + Math.sin(t * .6 + i * .0007) * .012);
    cloud.geometry.attributes.position.needsUpdate = true;
    cloud.rotation.y = t * .08; dna.update(t, dt); group.rotation.y = Math.sin(t * .15) * .25;
  }
  return { group, update, bloom: .5 };
}

/* ------------------------------------------------------------------ 2 · STRUCTURAL BIOLOGY */
function structural(hue) {
  const group = new THREE.Group(), R = rng(8), p = makeProtein({ seed: 5, rainbow: true }); p.group.scale.setScalar(2.5); group.add(p.group);
  const N = LOW ? 300 : 700, pp = new Float32Array(N * 3), pc = new Float32Array(N * 3), ps = new Float32Array(N), base = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { const v = V3(gauss(R), gauss(R), gauss(R)).normalize().multiplyScalar(2.2 + R() * 2.2); base.set([v.x, v.y, v.z], i * 3); const c = new THREE.Color(0x7fe0ff); pc.set([c.r, c.g, c.b], i * 3); ps[i] = .5 + R() * .9; }
  const water = makePoints(pp, pc, ps, pointsMaterial({ size: .05, opacity: .5 })); group.add(water);
  group.add(glowSprite(hsl(hue, .9, .35), 7, .08));
  function update(t, dt) {
    p.update(t, dt); const a = water.geometry.attributes.position.array;
    for (let i = 0; i < N; i++) { const k = i * 3; a[k] = base[k] + Math.sin(t * .6 + i) * .12; a[k + 1] = base[k + 1] + Math.cos(t * .5 + i * 1.3) * .12; a[k + 2] = base[k + 2] + Math.sin(t * .4 + i * .7) * .12; }
    water.geometry.attributes.position.needsUpdate = true;
  }
  return { group, update, bloom: .4 };
}

/* ------------------------------------------------------------------ 3 · MATHEMATICAL BIOLOGY — Lorenz attractor + ensemble */
function maths(hue) {
  const group = new THREE.Group(), R = rng(4), s = 10, r = 28, b = 8 / 3, SC = .17, OFF = 25;
  const f = (p, o) => { o[0] = s * (p[1] - p[0]); o[1] = p[0] * (r - p[2]) - p[1]; o[2] = p[0] * p[1] - b * p[2]; };
  const k1 = [0, 0, 0], k2 = [0, 0, 0], k3 = [0, 0, 0], k4 = [0, 0, 0], tmp = [0, 0, 0];
  function rk4(p, h) {
    f(p, k1); for (let i = 0; i < 3; i++) tmp[i] = p[i] + k1[i] * h / 2; f(tmp, k2); for (let i = 0; i < 3; i++) tmp[i] = p[i] + k2[i] * h / 2; f(tmp, k3);
    for (let i = 0; i < 3; i++) tmp[i] = p[i] + k3[i] * h; f(tmp, k4); for (let i = 0; i < 3; i++) p[i] += (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) * h / 6;
  }
  const L = LOW ? 500 : 900, trails = [];
  [0, 40, -45].forEach((dh, ti) => {
    const state = [1 + ti * .03, 1, 1 + ti * .05], arr = new Float32Array(L * 3), colA = new Float32Array(L * 3), sizeA = new Float32Array(L), c = hsl(hue + dh, .85, .62);
    for (let i = 0; i < L; i++) { const u = i / L; colA.set([c.r * Math.pow(u, 1.4), c.g * Math.pow(u, 1.4), c.b * Math.pow(u, 1.4)], i * 3); sizeA[i] = .25 + u * 1.2; arr.set([0, 0, 0], i * 3); }
    for (let i = 0; i < 600; i++) rk4(state, .01);
    const posAttr = new THREE.BufferAttribute(arr, 3), lg = new THREE.BufferGeometry(); lg.setAttribute('position', posAttr); lg.setAttribute('color', new THREE.BufferAttribute(colA, 3));
    const line = new THREE.Line(lg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: .55 }));
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', posAttr); pg.setAttribute('aColor', new THREE.BufferAttribute(colA.map((v) => v * 1.3), 3)); pg.setAttribute('aSize', new THREE.BufferAttribute(sizeA, 1));
    const pts = new THREE.Points(pg, pointsMaterial({ size: .05, opacity: .6 })); pts.frustumCulled = false; line.frustumCulled = false;
    group.add(line, pts);
    const head = glowSprite(c, .45, .7); group.add(head); const tr = { state, arr, posAttr, head }; trails.push(tr);
    for (let i = 0; i < L * 2; i++) { rk4(state, .006); arr.copyWithin(0, 3); arr[(L - 1) * 3] = state[0] * SC; arr[(L - 1) * 3 + 1] = (state[2] - OFF) * SC; arr[(L - 1) * 3 + 2] = state[1] * SC; }
  });
  // ensemble: tiny differences in initial conditions diverge
  const NE = LOW ? 120 : 260, ens = [], ep = new Float32Array(NE * 3), ec = new Float32Array(NE * 3), es = new Float32Array(NE).fill(1);
  const reset = () => { for (let i = 0; i < NE; i++) ens[i] = [1 + gauss(R) * .03, 1 + gauss(R) * .03, 1 + gauss(R) * .03]; for (let k = 0; k < 400; k++) ens.forEach((p) => rk4(p, .01)); };
  reset(); const ensCol = hsl(hue + 150, .6, .75); for (let i = 0; i < NE; i++) ec.set([ensCol.r, ensCol.g, ensCol.b], i * 3);
  const ensPts = makePoints(ep, ec, es, pointsMaterial({ size: .04, opacity: .7 })); group.add(ensPts);
  // axes / grid
  const grid = new THREE.GridHelper(7, 28, 0x335566, 0x1b3040); grid.position.y = -3.6; grid.material.transparent = true; grid.material.opacity = .35; group.add(grid);
  let ensT = 0;
  function update(t, dt) {
    for (const tr of trails) {
      for (let s2 = 0; s2 < 3; s2++) {
        rk4(tr.state, .006); tr.arr.copyWithin(0, 3);
        tr.arr[(L - 1) * 3] = tr.state[0] * SC; tr.arr[(L - 1) * 3 + 1] = (tr.state[2] - OFF) * SC; tr.arr[(L - 1) * 3 + 2] = tr.state[1] * SC;
      }
      tr.posAttr.needsUpdate = true; tr.head.position.set(tr.arr[(L - 1) * 3], tr.arr[(L - 1) * 3 + 1], tr.arr[(L - 1) * 3 + 2]);
    }
    ensT += dt; if (ensT > 16) { ensT = 0; reset(); }
    const a = ensPts.geometry.attributes.position.array;
    for (let i = 0; i < NE; i++) { rk4(ens[i], .006); a[i * 3] = ens[i][0] * SC; a[i * 3 + 1] = (ens[i][2] - OFF) * SC; a[i * 3 + 2] = ens[i][1] * SC; }
    ensPts.geometry.attributes.position.needsUpdate = true;
    group.rotation.y = t * .12; group.rotation.x = .2;
  }
  group.scale.setScalar(.9);
  return { group, update, bloom: .55 };
}

/* ------------------------------------------------------------------ 4 · AI IN COMPUTATIONAL BIOLOGY */
function ai(hue) {
  const group = new THREE.Group(), R = rng(12), layers = LOW ? [8, 10, 12, 10, 8] : [10, 14, 16, 14, 10], X0 = -1.8, DX = .8, nodes = [];
  const total = layers.reduce((a, b) => a + b, 0), inst = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 18, 14), new THREE.MeshPhysicalMaterial({ roughness: .2, clearcoat: 1, emissive: 0x112233, emissiveIntensity: .8 }), total), m4 = new THREE.Matrix4(), c = new THREE.Color();
  let idx = 0; const layerOf = [];
  layers.forEach((n, li) => { for (let i = 0; i < n; i++) { const a = i / n * TAU + li * .5, rad = 1.25 + .4 * Math.sin(li * 1.1); nodes.push(V3(X0 + li * DX, Math.sin(a) * rad, Math.cos(a) * rad)); layerOf.push(li); inst.setColorAt(idx++, c.setHSL(((hue + li * 14) % 360) / 360, .8, .6)); } });
  group.add(inst);
  const lp = [], lc = [], edges = []; let off = 0; const starts = [];
  layers.forEach((n, li) => { starts.push(off); off += n; });
  for (let li = 0; li < layers.length - 1; li++) for (let i = 0; i < layers[li]; i++) for (let k = 0; k < 4; k++) {
    const j = Math.floor(R() * layers[li + 1]), a = nodes[starts[li] + i], b = nodes[starts[li + 1] + j]; edges.push([a, b, li]);
    lp.push(a.x, a.y, a.z, b.x, b.y, b.z); const c1 = hsl(hue + li * 14, .8, .5), c2 = hsl(hue + (li + 1) * 14, .8, .5); lc.push(c1.r, c1.g, c1.b, c2.r, c2.g, c2.b);
  }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3)); lg.setAttribute('color', new THREE.Float32BufferAttribute(lc, 3));
  group.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .22, blending: THREE.AdditiveBlending, depthWrite: false })));
  // input tokens (amino-acid column) → feeds layer 0
  const NT = 16, tokens = new THREE.InstancedMesh(new THREE.BoxGeometry(.16, .12, .12), new THREE.MeshStandardMaterial({ roughness: .35, emissive: 0x111111 }), NT);
  const tokPos = [];
  for (let i = 0; i < NT; i++) { const y = (i / (NT - 1) - .5) * 3.0; tokPos.push(V3(X0 - 1.0, y, 0)); m4.compose(tokPos[i], new THREE.Quaternion(), V3(1, 1, 1)); tokens.setMatrixAt(i, m4); tokens.setColorAt(i, c.setHSL(((hue + Math.floor(R() * 5) * 55) % 360) / 360, .75, .6)); }
  group.add(tokens);
  const tl = [], tcol = []; for (let i = 0; i < NT; i++) for (let k = 0; k < 2; k++) { const b = nodes[Math.floor(R() * layers[0])]; tl.push(tokPos[i].x, tokPos[i].y, tokPos[i].z, b.x, b.y, b.z); tcol.push(.6, .8, 1, .1, .2, .3); }
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(tl, 3)); tg.setAttribute('color', new THREE.Float32BufferAttribute(tcol, 3));
  group.add(new THREE.LineSegments(tg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .25, blending: THREE.AdditiveBlending, depthWrite: false })));
  // output: AlphaFold-style predicted structure, coloured by per-residue confidence (pLDDT), assembled by the forward pass
  const SX = X0 + (layers.length - 1) * DX + 2.1, prot = makeProtein({ seed: 9, plddt: true, ligand: false }); prot.group.scale.setScalar(1.75); prot.group.position.set(SX, 0, 0);
  const outer = new THREE.Group(); outer.add(prot.group); group.add(outer);
  const lastStart = starts[layers.length - 1], lastN = layers[layers.length - 1];
  const fanP = [], fanC = []; for (let i = 0; i < lastN; i++) { const a = nodes[lastStart + i]; fanP.push(a.x, a.y, a.z, SX - 1.3, a.y * .35, a.z * .3); fanC.push(.4, .7, 1, .05, .15, .35); }
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(fanP, 3)); fg.setAttribute('color', new THREE.Float32BufferAttribute(fanC, 3));
  group.add(new THREE.LineSegments(fg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .22, blending: THREE.AdditiveBlending, depthWrite: false })));
  // self-attention: arcs between sequence positions whose weights breathe over time
  const NA = LOW ? 22 : 40, AS = 14, att = [], ap = [], acol = new Float32Array(NA * AS * 6);
  for (let k = 0; k < NA; k++) { const i = Math.floor(R() * NT), j = Math.min(NT - 1, Math.max(0, i + (R() < .5 ? -1 : 1) * (2 + Math.floor(R() * 8)))); if (i === j) { k--; continue; }
    const A = tokPos[i], B = tokPos[j], h = Math.abs(A.y - B.y) * .55 + .25, zdir = R() < .5 ? 1 : -1; att.push({ ph: R() * TAU, sp: .6 + R() * 1.2, col: hsl(hue + R() * 60, .8, .62) });
    let prev = A; for (let sI = 1; sI <= AS; sI++) { const u = sI / AS, q = V3(lerp(A.x, B.x, u) - Math.sin(u * Math.PI) * h * .9, lerp(A.y, B.y, u), zdir * Math.sin(u * Math.PI) * h); ap.push(prev.x, prev.y, prev.z, q.x, q.y, q.z); prev = q; } }
  const ag = new THREE.BufferGeometry(); ag.setAttribute('position', new THREE.Float32BufferAttribute(ap, 3)); ag.setAttribute('color', new THREE.BufferAttribute(acol, 3));
  group.add(new THREE.LineSegments(ag, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false })));
  // residues streaming from the last layer into the fold
  const NR = LOW ? 70 : 140, rp = new Float32Array(NR * 3), rc = new Float32Array(NR * 3), rs = new Float32Array(NR).fill(1.4), res = [];
  for (let i = 0; i < NR; i++) res.push({ n: lastStart + Math.floor(R() * lastN), u: R(), v: .22 + R() * .25, h: R() });
  const resPts = makePoints(rp, rc, rs, pointsMaterial({ size: .05, opacity: 1 })); group.add(resPts);
  const pL = [new THREE.Color(0xff7d45), new THREE.Color(0xffdb13), new THREE.Color(0x65cbf3), new THREE.Color(0x0053d6)];
  // pulses
  const NP = LOW ? 90 : 190, pp = new Float32Array(NP * 3), pc = new Float32Array(NP * 3).fill(1), ps = new Float32Array(NP).fill(1.5), pulses = [];
  for (let i = 0; i < NP; i++) pulses.push({ e: Math.floor(R() * edges.length), u: R(), v: .35 + R() * .35 });
  const pts = makePoints(pp, pc, ps, pointsMaterial({ size: .05, opacity: 1 })); group.add(pts);
  const ones = new THREE.Quaternion(), s1 = V3(1, 1, 1);
  function update(t, dt) {
    { const ac = ag.attributes.color.array; let q = 0; att.forEach((e) => { const w = .5 + .5 * Math.sin(t * e.sp + e.ph), w2 = w * w; for (let sI = 0; sI < AS; sI++) { const f = (.15 + w2) * Math.sin((sI + .5) / AS * Math.PI) * 1.5; for (let v = 0; v < 2; v++) { ac[q++] = e.col.r * f; ac[q++] = e.col.g * f; ac[q++] = e.col.b * f; } } }); ag.attributes.color.needsUpdate = true; }
    const pa = pts.geometry.attributes.position;
    pulses.forEach((p, i) => { p.u += p.v * dt; if (p.u > 1) { p.u = 0; p.e = Math.floor(R() * edges.length); } const [a, b] = edges[p.e]; pa.setXYZ(i, lerp(a.x, b.x, p.u), lerp(a.y, b.y, p.u), lerp(a.z, b.z, p.u)); });
    pa.needsUpdate = true;
    for (let i = 0; i < total; i++) { const s2 = .05 + .03 * (.5 + .5 * Math.sin(t * 2.4 - layerOf[i] * 1.1)); m4.compose(nodes[i], ones, s1.set(s2, s2, s2)); inst.setMatrixAt(i, m4); }
    inst.instanceMatrix.needsUpdate = true;
    const cyc = (t % 14) / 14, build = sstep((cyc - .04) / .4) * (1 - sstep((cyc - .94) / .06));
    prot.update(t); prot.group.rotation.y = t * .22; outer.scale.setScalar(.2 + .8 * build); outer.position.x = SX * (1 - outer.scale.x) * 1.0;
    outer.children[0].visible = build > .01;
    const ra = resPts.geometry.attributes.position, rcA = resPts.geometry.attributes.aColor;
    res.forEach((r, i) => { r.u += r.v * dt; if (r.u > 1) { r.u = 0; r.n = lastStart + Math.floor(R() * lastN); r.h = R(); } const a = nodes[r.n], k = r.u, tx = SX - 1.3 + Math.sin(r.h * 40) * .5, ty = Math.sin(r.h * 17) * .7, tz = Math.cos(r.h * 29) * .5;
      ra.setXYZ(i, lerp(a.x, tx, k), lerp(a.y, ty, k) + Math.sin(k * Math.PI) * .12, lerp(a.z, tz, k)); const cc = pL[Math.min(3, Math.floor(k * 4 + r.h * .8))]; const f = Math.sin(k * Math.PI); rcA.setXYZ(i, cc.r * f, cc.g * f, cc.b * f); });
    ra.needsUpdate = true; rcA.needsUpdate = true; group.rotation.y = Math.sin(t * .2) * .12;
  }
  group.position.x = -1.0;
  return { group, update, bloom: .6, fitW: 8.3 };
}

/* ------------------------------------------------------------------ 5 · PLANT BIOINFORMATICS — a genome that grows into a tree: helix trunk, branching canopy of gene nodes, signals rising from the roots */
function plant(hue) {
  const group = new THREE.Group(), tree = new THREE.Group(), R = rng(73); group.add(tree); tree.position.y = .25;
  const BASE = -2.1, TOP = -.5, MAXD = LOW ? 4 : 5, c = new THREE.Color();
  const perp = (d) => { const u = Math.abs(d.y) < .9 ? V3(0, 1, 0) : V3(1, 0, 0); u.cross(d).normalize(); return [u, d.clone().cross(u).normalize()]; };
  function build(start, dir, len, maxD, up) {
    const segs = [], tips = [], paths = [];
    (function grow(p, d0, L, depth, g, trail) {
      const steps = 4, d = d0.clone(), tr = trail.slice(); let cur = p.clone(); if (depth === 0) L *= .35;
      for (let s = 0; s < steps; s++) {
        d.add(V3((R() - .5) * .34, (R() - .25) * .24 * up, (R() - .5) * .34)).normalize();
        const nx = cur.clone().addScaledVector(d, L / steps); segs.push({ a: cur, b: nx, g: g + (s / steps) * L, depth }); cur = nx; tr.push(cur);
      }
      const g2 = g + L;
      if (depth >= maxD) { tips.push({ p: cur, g: g2, flash: 0 }); paths.push(tr); return; }
      const n = depth < 2 ? 3 : 2 + (R() < .35 ? 1 : 0), off = R() * TAU, [u, w] = perp(d);
      for (let k = 0; k < n; k++) {
        const a = off + k * TAU / n + (R() - .5) * .6, sp = .55 + R() * .45;
        const nd = d.clone().multiplyScalar(Math.cos(sp)).addScaledVector(u, Math.sin(sp) * Math.cos(a)).addScaledVector(w, Math.sin(sp) * Math.sin(a)); nd.y += .08 * up; nd.normalize();
        grow(cur, nd, depth === 0 ? len * (.9 + R() * .15) : L * (.68 + R() * .12), depth + 1, g2, tr);
      }
    })(start, dir, len, 0, 0, [start.clone()]);
    const gm = Math.max(...tips.map((x) => x.g)); segs.forEach((s) => { s.g /= gm; }); tips.forEach((x) => { x.g /= gm; });
    return { segs, tips, paths };
  }
  const crown = build(V3(0, TOP, 0), V3(0, 1, 0), .92, MAXD, 1), root = build(V3(0, BASE, 0), V3(0, -1, 0), .46, 3, -1);

  // branches: lines + beads so they read as thick, glowing limbs
  function limbs(set, h0, h1, l0, l1, maxD) {
    const n = set.segs.length, lp = new Float32Array(n * 6), lc = new Float32Array(n * 6), base = new Float32Array(n * 3), bp = new Float32Array(n * 6), bc = new Float32Array(n * 6), bs = new Float32Array(n * 2);
    set.segs.forEach((s, i) => {
      lp.set([s.a.x, s.a.y, s.a.z, s.b.x, s.b.y, s.b.z], i * 6); const k = s.depth / maxD; c.copy(hsl(lerp(h0, h1, k), .85, lerp(l0, l1, k)));
      base.set([c.r, c.g, c.b], i * 3); bp.set([s.b.x, s.b.y, s.b.z, (s.a.x + s.b.x) / 2, (s.a.y + s.b.y) / 2, (s.a.z + s.b.z) / 2], i * 6); bs[i * 2] = bs[i * 2 + 1] = lerp(2.3, .6, k);
    });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(lp, 3)); g.setAttribute('color', new THREE.BufferAttribute(lc, 3));
    const lines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    const beads = makePoints(bp, bc, bs, pointsMaterial({ size: .05, opacity: .9 })); tree.add(lines, beads);
    return { set, n, lc, base, bc, lines, beads, done: false };
  }
  const LC = limbs(crown, 168, 96, .42, .62, MAXD), LR = limbs(root, 40, 28, .4, .3, 3);
  function paint(L, G) {
    if (L.done) return; let all = true;
    for (let i = 0; i < L.n; i++) {
      const k = sstep((G - L.set.segs[i].g) * 9); if (k < 1) all = false;
      const r = L.base[i * 3] * k, g = L.base[i * 3 + 1] * k, b = L.base[i * 3 + 2] * k;
      L.lc.set([r * 1.5, g * 1.5, b * 1.5, r * 1.5, g * 1.5, b * 1.5], i * 6); L.bc.set([r * .8, g * .8, b * .8, r * .8, g * .8, b * .8], i * 6);
    }
    L.lines.geometry.attributes.color.needsUpdate = true; L.beads.geometry.attributes.aColor.needsUpdate = true; L.done = all;
  }

  // trunk: a double helix with coloured base pairs
  const HN = 90, RUNG = 30, hp = new Float32Array(HN * 6), hc = new Float32Array(HN * 6), hs = new Float32Array(HN * 2), hb = new Float32Array(HN * 6);
  const BASES = [hsl(140, .8, .6), hsl(38, .95, .62), hsl(185, .85, .62), hsl(330, .8, .68)];
  const helixAt = (f, ph) => { const a = f * TAU * 3.2 + ph, r = lerp(.2, .1, f); return V3(Math.cos(a) * r, lerp(BASE, TOP, f), Math.sin(a) * r); };
  for (let i = 0; i < HN; i++) for (let s = 0; s < 2; s++) { const p = helixAt(i / (HN - 1), s * Math.PI), o = (i * 2 + s) * 3; hp.set([p.x, p.y, p.z], o); c.copy(hsl(s ? 150 : 178, .85, .62)); hb.set([c.r, c.g, c.b], o); hs[i * 2 + s] = 1.25; }
  const helix = makePoints(hp, hc, hs, pointsMaterial({ size: .055, opacity: 1 })); tree.add(helix);
  const rp = new Float32Array(RUNG * 6), rc = new Float32Array(RUNG * 6), rb = new Float32Array(RUNG * 3);
  for (let i = 0; i < RUNG; i++) { const f = (i + .5) / RUNG, a = helixAt(f, 0), b = helixAt(f, Math.PI); rp.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6); const k = BASES[Math.floor(R() * 4)]; rb.set([k.r, k.g, k.b], i * 3); }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3)); rg.setAttribute('color', new THREE.BufferAttribute(rc, 3));
  const rungs = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); tree.add(rungs);

  // canopy: clusters of gene nodes at every branch tip
  const K = LOW ? 5 : 9, CN = crown.tips.length * K, cp = new Float32Array(CN * 3), cc = new Float32Array(CN * 3), cs = new Float32Array(CN), cb = new Float32Array(CN * 3), cph = new Float32Array(CN), cs0 = new Float32Array(CN);
  crown.tips.forEach((tp, i) => { for (let k = 0; k < K; k++) { const j = i * K + k, r = k ? .2 : 0; cp.set([tp.p.x + gauss(R) * r, tp.p.y + gauss(R) * r * .8, tp.p.z + gauss(R) * r], j * 3); const hot = R() < .1; c.copy(hot ? hsl(R() < .5 ? 42 : 325, .95, .66) : hsl(92 + R() * 62, .85, .5 + R() * .16)); cb.set([c.r, c.g, c.b], j * 3); cph[j] = R() * TAU; cs0[j] = k ? .55 + R() * .9 : 1.7; } });
  const canopy = makePoints(cp, cc, cs, pointsMaterial({ size: .06, opacity: 1 })); tree.add(canopy);

  // signals rising from the roots through the trunk and out to the tips
  const NP = LOW ? 36 : 70, pp = new Float32Array(NP * 3), pc = new Float32Array(NP * 3), ps = new Float32Array(NP), pulses = [];
  const routes = crown.paths.map((tr, i) => { const pts = [root.paths[Math.floor(R() * root.paths.length)].slice().reverse(), [V3(0, BASE, 0), V3(0, TOP, 0)], tr].flat(), cum = [0]; for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + pts[k].distanceTo(pts[k - 1])); return { pts, cum, len: cum[cum.length - 1], tip: i }; });
  const spawn = (p, u0) => { p.r = routes[Math.floor(R() * routes.length)]; p.u = u0; p.v = .5 + R() * .5; p.k = 0; };
  for (let i = 0; i < NP; i++) { const p = {}; spawn(p, -R() * 6); pulses.push(p); ps[i] = 1.5; }
  const pulsePts = makePoints(pp, pc, ps, pointsMaterial({ size: .075, opacity: 1 })); tree.add(pulsePts);
  const tmp = V3(0, 0, 0);

  // drifting motes + soft glows
  const MN = LOW ? 110 : 240, mp = new Float32Array(MN * 3), mc = new Float32Array(MN * 3), ms = new Float32Array(MN), mv = new Float32Array(MN);
  for (let i = 0; i < MN; i++) { const a = R() * TAU, r = .4 + R() * 2.6; mp.set([Math.cos(a) * r, -2.6 + R() * 5.4, Math.sin(a) * r], i * 3); c.copy(hsl(110 + R() * 70, .7, .55)).multiplyScalar(.35 + R() * .4); mc.set([c.r, c.g, c.b], i * 3); ms[i] = .35 + R() * .6; mv[i] = .05 + R() * .12; }
  const motes = makePoints(mp, mc, ms, pointsMaterial({ size: .04, opacity: .8 })); group.add(motes);
  const halo = glowSprite(0x2fd68a, 6.2, .1), seed = glowSprite(0xfff1c2, .9, .55); halo.position.set(0, 1.1, -.6); seed.position.set(0, BASE, 0); tree.add(halo, seed);

  function update(t, dt) {
    const G = clamp(t / 7), Gt = clamp(G / .22), Gc = clamp((G - .2) / .8), Gr = clamp(G / .35);
    tree.rotation.y = t * .11; tree.rotation.z = Math.sin(t * .45) * .025;
    if (Gt < 1 || !update.h) {
      for (let i = 0; i < HN * 2; i++) { const k = sstep((Gt - Math.floor(i / 2) / HN) * 8), o = i * 3; hc[o] = hb[o] * k; hc[o + 1] = hb[o + 1] * k; hc[o + 2] = hb[o + 2] * k; }
      helix.geometry.attributes.aColor.needsUpdate = true; update.h = Gt >= 1;
    }
    for (let i = 0; i < RUNG; i++) { const k = sstep((Gt - i / RUNG) * 8) * (.55 + .45 * Math.sin(t * 2.2 - i * .55)), o = i * 6; rc[o] = rc[o + 3] = rb[i * 3] * k; rc[o + 1] = rc[o + 4] = rb[i * 3 + 1] * k; rc[o + 2] = rc[o + 5] = rb[i * 3 + 2] * k; }
    rungs.geometry.attributes.color.needsUpdate = true;
    paint(LC, Gc); paint(LR, Gr);
    for (let i = 0; i < crown.tips.length; i++) {
      const tp = crown.tips[i], born = sstep((Gc - tp.g) * 7 + .2); tp.flash = Math.max(0, tp.flash - dt * 1.6);
      for (let k = 0; k < K; k++) { const j = i * K + k, tw = .62 + .38 * Math.sin(t * 1.7 + cph[j]), b = born * (tw + tp.flash * 1.6), o = j * 3; cc[o] = cb[o] * b; cc[o + 1] = cb[o + 1] * b; cc[o + 2] = cb[o + 2] * b; cs[j] = cs0[j] * (.8 + .2 * tw + tp.flash * .9); }
    }
    canopy.geometry.attributes.aColor.needsUpdate = true; canopy.geometry.attributes.aSize.needsUpdate = true;
    for (let i = 0; i < NP; i++) {
      const p = pulses[i]; p.u += dt * p.v; const o = i * 3;
      if (p.u >= p.r.len) { if (G >= 1) crown.tips[p.r.tip].flash = 1; spawn(p, -R() * 3); }
      if (p.u < 0 || G < 1) { pc[o] = pc[o + 1] = pc[o + 2] = 0; continue; }
      const cum = p.r.cum; while (p.k < cum.length - 2 && cum[p.k + 1] < p.u) p.k++;
      tmp.lerpVectors(p.r.pts[p.k], p.r.pts[p.k + 1], clamp((p.u - cum[p.k]) / Math.max(1e-4, cum[p.k + 1] - cum[p.k])));
      pp[o] = tmp.x; pp[o + 1] = tmp.y; pp[o + 2] = tmp.z; const e = Math.min(1, p.u * 3, (p.r.len - p.u) * 4); pc[o] = .8 * e; pc[o + 1] = 1 * e; pc[o + 2] = .7 * e;
    }
    pulsePts.geometry.attributes.position.needsUpdate = true; pulsePts.geometry.attributes.aColor.needsUpdate = true;
    for (let i = 0; i < MN; i++) { let y = mp[i * 3 + 1] + mv[i] * dt; if (y > 2.8) y = -2.6; mp[i * 3 + 1] = y; }
    motes.geometry.attributes.position.needsUpdate = true; motes.rotation.y = -t * .03;
    halo.material.opacity = .1 * Gc; seed.scale.setScalar(.9 + .12 * Math.sin(t * 2.4));
  }
  return { group, update, bloom: .55, fitW: 5.8, bg: 0x020d0a };
}

/* ------------------------------------------------------------------ 6 · COMPLEX SYSTEMS — a murmuration at dusk (collective behaviour from local rules) */
function skyTexture() {
  const W = 1024, H = 1024, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, H * .9);
  [[0, '#0b0b2a'], [.28, '#2b1856'], [.52, '#7a3470'], [.72, '#d8607a'], [.88, '#f7a06a'], [1, '#ffd08a']].forEach(([o, col]) => sky.addColorStop(o, col)); g.fillStyle = sky; g.fillRect(0, 0, W, H);
  const sun = g.createRadialGradient(W * .74, H * .88, 0, W * .74, H * .88, W * .55); sun.addColorStop(0, 'rgba(255,214,150,.75)'); sun.addColorStop(.35, 'rgba(255,150,110,.25)'); sun.addColorStop(1, 'rgba(255,120,100,0)'); g.fillStyle = sun; g.fillRect(0, 0, W, H);
  const R = rng(5); for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,255,255,${R() * .5})`; const y = R() * H * .45; g.fillRect(R() * W, y, 1.4, 1.4); }
  // thin cloud bands
  for (let i = 0; i < 7; i++) { const y = H * (.45 + R() * .35), x = R() * W, w = 200 + R() * 380; const cg = g.createLinearGradient(x, 0, x + w, 0); cg.addColorStop(0, 'rgba(60,20,70,0)'); cg.addColorStop(.5, 'rgba(60,20,70,.28)'); cg.addColorStop(1, 'rgba(60,20,70,0)'); g.fillStyle = cg; g.fillRect(x, y, w, 5 + R() * 8); }
  // treeline silhouette
  g.fillStyle = '#04050b'; g.beginPath(); g.moveTo(0, H); let y0 = H * .9; g.lineTo(0, y0);
  for (let x = 0; x <= W; x += 6) { const n = Math.sin(x * .013) * 10 + Math.sin(x * .05) * 6 + (R() - .5) * 9; g.lineTo(x, H * .9 + n - (x > 500 && x < 560 ? 28 : 0)); }
  g.lineTo(W, H); g.closePath(); g.fill();
  for (let i = 0; i < 14; i++) { const x = R() * W, h = 30 + R() * 46; g.fillRect(x - 2, H * .9 - h, 4, h + 8); for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(x + (R() - .5) * 34, H * .9 - h - 6 + (R() - .5) * 26, 10 + R() * 14, 0, TAU); g.fill(); } }
  // keep the text column legible: fade the left half towards deep night
  const sh = g.createLinearGradient(0, 0, W * .62, 0); sh.addColorStop(0, 'rgba(2,6,12,.94)'); sh.addColorStop(.7, 'rgba(2,6,12,.55)'); sh.addColorStop(1, 'rgba(2,6,12,0)'); g.fillStyle = sh; g.fillRect(0, 0, W, H);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}
function complex() {
  const group = new THREE.Group(), R = rng(77), N = LOW ? 700 : 1500, SPEED = 1.65, CELL = .5, RN2 = .5 * .5, RS2 = .22 * .22;
  const P = new Float32Array(N * 3), V = new Float32Array(N * 3), A = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const o = i * 3, u = R() * TAU, v = Math.acos(2 * R() - 1), r = Math.cbrt(R()); P[o] = Math.sin(v) * Math.cos(u) * 2 * r; P[o + 1] = Math.cos(v) * .9 * r; P[o + 2] = Math.sin(v) * Math.sin(u) * 1.3 * r;
    const a = R() * TAU; V[o] = Math.cos(a) * SPEED; V[o + 1] = (R() - .5) * .3; V[o + 2] = Math.sin(a) * SPEED;
  }
  // bird: two wings + body, flapping in the vertex shader
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, .5, -1, 0, -.15, 0, 0, -.25, 0, 0, .5, 0, 0, -.25, 1, 0, -.15]), 3));
  const ph = new Float32Array(N); for (let i = 0; i < N; i++) ph[i] = R() * TAU; bg.setAttribute('aPh', new THREE.InstancedBufferAttribute(ph, 1));
  const uT = { value: 0 }, bm = new THREE.MeshBasicMaterial({ color: 0x04050a, side: THREE.DoubleSide, toneMapped: false });
  bm.onBeforeCompile = (sh) => { sh.uniforms.uT = uT; sh.vertexShader = 'uniform float uT; attribute float aPh;\n' + sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = vec3(position); transformed.y += abs(position.x) * sin(uT * 26.0 + aPh) * 0.75;'); };
  const birds = new THREE.InstancedMesh(bg, bm, N); birds.frustumCulled = false; group.add(birds);
  const GX = 19, GY = 13, GZ = 13, ox = 4.6, oy = 3.1, oz = 3.1, head = new Int32Array(GX * GY * GZ), nxt = new Int32Array(N);
  const cx = (x) => clamp(Math.floor((x + ox) / CELL), 0, GX - 1), cy = (y) => clamp(Math.floor((y + oy) / CELL), 0, GY - 1), cz = (z) => clamp(Math.floor((z + oz) / CELL), 0, GZ - 1);
  const hawk = new THREE.Vector3(8, 0, 0), hawkV = new THREE.Vector3(), roost = new THREE.Vector3(), q = new THREE.Quaternion(), fwd = new THREE.Vector3(), z1 = new THREE.Vector3(0, 0, 1), sv = new THREE.Vector3(), pv = new THREE.Vector3(), m = new THREE.Matrix4();
  const hawkAt = (t, out) => { const a = t * .42, rr = 1.2 + 2.6 * (.5 + .5 * Math.cos(t / 15 * TAU)); return out.set(Math.cos(a) * rr * 1.5 + roost.x, Math.sin(a * 1.7) * .8 + roost.y, Math.sin(a) * rr + roost.z); };
  let simT = 0;
  function step(dt, t) {
    roost.set(Math.sin(t * .17) * .8, Math.sin(t * .23) * .35 + .1, Math.sin(t * .13 + 1) * .6);
    const prev = hawk.clone(); hawkAt(t, hawk); hawkV.copy(hawk).sub(prev).divideScalar(Math.max(dt, 1e-3));
    head.fill(-1); for (let i = 0; i < N; i++) { const k = (cx(P[i * 3]) * GY + cy(P[i * 3 + 1])) * GZ + cz(P[i * 3 + 2]); nxt[i] = head[k]; head[k] = i; }
    for (let i = 0; i < N; i++) {
      const o = i * 3, px = P[o], py = P[o + 1], pz = P[o + 2]; let n = 0, ax = 0, ay = 0, az = 0, qx = 0, qy = 0, qz = 0, sx = 0, sy = 0, sz = 0;
      const x0 = cx(px), y0 = cy(py), z0 = cz(pz);
      for (let a = Math.max(0, x0 - 1); a <= Math.min(GX - 1, x0 + 1) && n < 26; a++) for (let b = Math.max(0, y0 - 1); b <= Math.min(GY - 1, y0 + 1); b++) for (let c = Math.max(0, z0 - 1); c <= Math.min(GZ - 1, z0 + 1); c++) {
        for (let j = head[(a * GY + b) * GZ + c]; j !== -1; j = nxt[j]) {
          if (j === i) continue; const jo = j * 3, dx = P[jo] - px, dy = P[jo + 1] - py, dz = P[jo + 2] - pz, d2 = dx * dx + dy * dy + dz * dz;
          if (d2 > RN2) continue; n++; ax += V[jo]; ay += V[jo + 1]; az += V[jo + 2]; qx += dx; qy += dy; qz += dz;
          if (d2 < RS2) { const w = 1 / (d2 + .004); sx -= dx * w; sy -= dy * w; sz -= dz * w; }
        }
      }
      let fx = 0, fy = 0, fz = 0;
      if (n) { fx = (ax / n - V[o]) * 3.2 + qx / n * .5 + sx * .045; fy = (ay / n - V[o + 1]) * 3.2 + qy / n * .5 + sy * .045; fz = (az / n - V[o + 2]) * 3.2 + qz / n * .5 + sz * .045; }
      fx += (roost.x - px) * .75; fy += (roost.y - py) * .6 - (py > 1.6 ? (py - 1.6) * 3 : 0) + (py < -1.4 ? (-1.4 - py) * 3 : 0); fz += (roost.z - pz) * 1.3;
      const hx = px - hawk.x, hy = py - hawk.y, hz = pz - hawk.z, hd = Math.hypot(hx, hy, hz);
      if (hd < 1.5) { const w = (1.5 - hd) / 1.5; fx += hx / hd * w * 14; fy += hy / hd * w * 10; fz += hz / hd * w * 14; }
      A[o] = fx; A[o + 1] = fy; A[o + 2] = fz;
    }
    for (let i = 0; i < N; i++) {
      const o = i * 3; V[o] += A[o] * dt; V[o + 1] += A[o + 1] * dt; V[o + 2] += A[o + 2] * dt;
      let sp = Math.hypot(V[o], V[o + 1], V[o + 2]) || 1; const tgt = clamp(sp, SPEED * .75, SPEED * 1.45) / sp; V[o] *= tgt; V[o + 1] *= tgt * .96; V[o + 2] *= tgt;
      P[o] += V[o] * dt; P[o + 1] += V[o + 1] * dt; P[o + 2] += V[o + 2] * dt;
    }
  }
  const place = (i, o, s) => { fwd.set(V[o], V[o + 1], V[o + 2]).normalize(); q.setFromUnitVectors(z1, fwd); m.compose(pv.set(P[o], P[o + 1], P[o + 2]), q, sv.setScalar(s)); birds.setMatrixAt(i, m); };
  for (let k = 0; k < 70; k++) { simT += .06; step(.06, simT); }       // let the flock find itself before it is first seen
  function update(t, dt) {
    uT.value = t; const h = Math.min(dt, .05); simT += h; step(h, simT);
    for (let i = 0; i < N; i++) place(i, i * 3, .056 + (i % 7) * .003);
    // the falcon: one larger, darker bird drawn on top of the first instance
    P[0] = hawk.x; P[1] = hawk.y; P[2] = hawk.z; V[0] = hawkV.x || 1; V[1] = hawkV.y; V[2] = hawkV.z; place(0, 0, .085);
    birds.instanceMatrix.needsUpdate = true;
  }
  return { group, update, bloom: .3, fitW: 6.4, bg: skyTexture(), cam: { pos: [0, -.3, 8.4] } };
}

/* ------------------------------------------------------------------ 7 · MOLECULAR BIOPHYSICS — folding energy funnel */
function biophysics(hue) {
  const group = new THREE.Group(), R = rng(19), RMAX = 3.3, NR = 90, NA = 180;
  const H = (r, th) => { const base = 1.9 * (1 - Math.exp(-r * r / 3.4)) - 1.15, rough = .2 * r * (Math.sin(3.1 * r * Math.cos(th) + 1.3) * Math.cos(2.7 * r * Math.sin(th)) + .6 * Math.sin(5 * r * Math.cos(th) - 2 * r * Math.sin(th))) * sstep((r - .35) / 2); return base + rough; };
  const pos = [], col = [], idx = [], cLo = hsl(hue + 170, .8, .1), cMid = hsl(hue + 130, .7, .2), cHi = hsl(hue, .9, .36), c = new THREE.Color();
  for (let i = 0; i <= NR; i++) for (let j = 0; j <= NA; j++) {
    const r = i / NR * RMAX, th = j / NA * TAU, y = H(r, th); pos.push(Math.cos(th) * r, y, Math.sin(th) * r);
    const u = clamp((y + 1.2) / 2.5); c.copy(cLo).lerp(cMid, sstep(u * 2)).lerp(cHi, sstep(u * 2 - 1)); col.push(c.r, c.g, c.b);
  }
  for (let i = 0; i < NR; i++) for (let j = 0; j < NA; j++) { const a = i * (NA + 1) + j, b = a + 1, d = a + NA + 1, e = d + 1; idx.push(a, d, b, b, d, e); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  group.add(new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: .5, metalness: .1, clearcoat: .3, side: THREE.DoubleSide, emissive: 0x04080c, emissiveIntensity: .5 })));
  // contour rings + radial lines
  const lines = new THREE.Group();
  for (let i = 4; i <= NR; i += 6) { const p = []; for (let j = 0; j <= NA; j++) { const k = (i * (NA + 1) + j) * 3; p.push(V3(pos[k], pos[k + 1] + .006, pos[k + 2])); } lines.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(p), new THREE.LineBasicMaterial({ color: hsl(hue, .7, .7), transparent: true, opacity: .22, blending: THREE.AdditiveBlending, depthWrite: false }))); }
  group.add(lines);
  // native state (folded protein) at the bottom
  const nat = makeProtein({ seed: 5, rainbow: true, ligand: false }); nat.group.scale.setScalar(.5); nat.group.position.y = -.55; group.add(nat.group);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.4, .012, 8, 64), new THREE.MeshBasicMaterial({ color: hsl(hue + 170, .9, .7), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); ring.rotation.x = Math.PI / 2; ring.position.y = -1.1; group.add(ring);
  group.add(glowSprite(hsl(hue + 170, .9, .5), 2.2, .6)); group.children[group.children.length - 1].position.y = -1.0;
  // conformational trajectories (Langevin-like walks that find the funnel)
  const NT = 6, HL = 160, trajs = [];
  for (let k = 0; k < NT; k++) {
    const arr = new Float32Array(HL * 3), ca = new Float32Array(HL * 3), cs = new Float32Array(HL), cc = hsl(hue - 25 + k * 14, .95, .7);
    for (let i = 0; i < HL; i++) { const u = Math.pow(i / HL, 1.5); ca.set([cc.r * u, cc.g * u, cc.b * u], i * 3); cs[i] = .3 + u * 1.3; }
    const attr = new THREE.BufferAttribute(arr, 3), lg = new THREE.BufferGeometry(); lg.setAttribute('position', attr); lg.setAttribute('color', new THREE.BufferAttribute(ca, 3));
    const ln = new THREE.Line(lg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })), pg = new THREE.BufferGeometry(); pg.setAttribute('position', attr); pg.setAttribute('aColor', new THREE.BufferAttribute(ca.map((v) => v * 1.4), 3)); pg.setAttribute('aSize', new THREE.BufferAttribute(cs, 1));
    const pt = new THREE.Points(pg, pointsMaterial({ size: .07, opacity: 1 })); pt.frustumCulled = false; ln.frustumCulled = false;
    const head = glowSprite(cc, .5, 1); group.add(ln, pt, head);
    trajs.push({ r: 1.6 + R() * 1.6, th: R() * TAU, dir: k % 2 ? 1 : -1, arr, attr, head, hold: 0, id: k });
  }
  function update(t, dt) {
    nat.update(t, dt); ring.scale.setScalar(1 + (t % 2.4) / 2.4 * 1.6); ring.material.opacity = (1 - (t % 2.4) / 2.4) * .8;
    trajs.forEach((p) => {
      if (p.hold > 0) { p.hold -= dt; if (p.hold <= 0) { p.r = RMAX - .1; p.th = R() * TAU; } }
      else {
        const barrier = .25 * Math.sin(5.5 * p.r + p.id * 1.7), drift = .45 + barrier + .12 * p.r;
        p.r += (-drift * dt + gauss(R) * .09 * Math.sqrt(dt) * 6 * dt * 10); p.th += p.dir * dt * (1.4 / (p.r + .5));
        if (p.r < .16) { p.r = .16; p.hold = 1.4; } if (p.r > RMAX) p.r = RMAX;
      }
      p.arr.copyWithin(0, 3); const n = (HL - 1) * 3, y = H(p.r, p.th) + .06;
      p.arr[n] = Math.cos(p.th) * p.r; p.arr[n + 1] = y; p.arr[n + 2] = Math.sin(p.th) * p.r; p.attr.needsUpdate = true; p.head.position.set(p.arr[n], y, p.arr[n + 2]);
    });
    group.rotation.y = t * .1;
  }
  group.rotation.x = .42; group.position.y = -.2; group.scale.setScalar(.78);
  return { group, update, bloom: .5, fitW: 7, cam: { pos: [0, 2.2, 8.2] } };
}

export const SCENES = { s1: omics, s2: structural, s3: maths, s4: ai, s5: plant, s6: complex, s7: biophysics };

/* ------------------------------------------------------------------ viewer */
export class SessionViewer {
  constructor(canvas) {
    this.canvas = canvas; this.running = false; this.cur = null;
    this.renderer = makeRenderer(canvas); this.renderer.toneMappingExposure = .78;
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(0x02080d);
    this.camera = new THREE.PerspectiveCamera(40, 1, .05, 100); this.camera.position.set(0, 0, 8.4);
    addRig(this.scene);
    const { composer, bloom } = makeComposer(this.renderer, this.scene, this.camera, { strength: .5, radius: .55, threshold: .62 });
    this.composer = composer; this.bloom = bloom; this.pivot = new THREE.Group(); this.scene.add(this.pivot);
    this.t = 0; this.last = 0; this._loop = this._loop.bind(this);
    addEventListener('resize', () => this.resize());
  }
  resize() {
    const W = innerWidth, H = innerHeight;
    // guard against a transient 0 (or stale) viewport reading on first layout —
    // see the matching note in gl/stage.js.
    if (W > 0 && H > 0) {
      this.renderer.setSize(W, H, false); this.composer.setSize(W, H); this.bloom.resolution.set(W, H);
      this.camera.aspect = W / H; this.camera.updateProjectionMatrix(); updatePointScale(this.renderer, this.camera);
    }
    this.layout();
  }
  layout() {
    const W = innerWidth, H = innerHeight, wide = W > 900, asp = W / H, fit = (this.cur && this.cur.fitW) || 5.4;
    const hw = 8.4 * Math.tan(20 * Math.PI / 180) * asp, wpp = 2 * hw / W;          // world units per CSS pixel at the focal plane
    if (wide) {                                                                       // model lives in the free area to the right of the talk cards
      const tl = document.querySelector('.sheet-talks'), left = Math.max(W * .45, tl ? tl.getBoundingClientRect().right + 20 : W * .5), right = W - 24, cx = (left + right) / 2;
      this.pivot.position.set((cx - W / 2) * wpp, 0, 0); this.pivot.scale.setScalar(Math.min(1.1, (right - left) / 2 * wpp / (fit / 2)));
    } else { this.pivot.position.set(0, 1.8, 0); this.pivot.scale.setScalar(Math.min(.72, 6.1 * asp * .92 / fit)); }
  }
  open(id, hue) {
    this.clear();
    const build = SCENES[id]; if (!build) return;
    this.scene.background = new THREE.Color().setHSL(((hue % 360) + 360) % 360 / 360, .55, .035);
    this.cur = build(hue); if (this.cur.bg != null) this.scene.background = this.cur.bg.isTexture ? this.cur.bg : new THREE.Color(this.cur.bg); this.pivot.add(this.cur.group); this.bloom.strength = this.cur.bloom || .8;
    const c = this.cur.cam; this.camera.position.set(...(c ? c.pos : [0, 0, 8.4])); this.camera.lookAt(0, 0, 0);
    this.t = 0; this.last = performance.now(); this.resize();
    if (!this.running) { this.running = true; requestAnimationFrame(this._loop); }
  }
  clear() { if (this.cur) { this.pivot.remove(this.cur.group); disposeTree(this.cur.group); this.cur = null; } }
  close() { this.running = false; this.clear(); }
  _loop(now) {
    if (!this.running) return; requestAnimationFrame(this._loop);
    const dt = Math.min(.05, Math.max(0, (now - this.last) / 1000)); this.last = now; this.t += dt;
    if (this.cur) this.cur.update(this.t, dt);
    updatePointScale(this.renderer, this.camera); this.composer.render();
  }
}
