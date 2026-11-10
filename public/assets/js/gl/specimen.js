/* Specimens — small, calm 3D models that sit beside the "At a glance" panels.
   One shared WebGL renderer; the canvas moves into whichever panel is showing. */
import {
  THREE, TAU, LOW, reduce, rng, gauss, lerp, clamp, sstep, hsl, makeRenderer, addRig, updatePointScale,
  makePoints, pointsMaterial, glowSprite, disposeTree,
} from './common.js';
import * as bio from './bio.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

/* ---------- helpers ---------- */
const tex2d = (w, h, draw) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'); draw(g, w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return { tex: t, cv, g }; };
const FONT = '"Inter","Helvetica Neue",Arial,sans-serif';
const m4t = new THREE.Matrix4();

/* ---------- WHEN · a skeleton clock: ticking hands over a turning gear train ---------- */
function gearGeo(r, teeth, depth = .06, nHoles = 5) {
  const sh = new THREE.Shape(), s = TAU / teeth, ri = r * .84;
  for (let t = 0; t < teeth; t++) [[0, ri], [.14, r], [.46, r], [.62, ri]].forEach(([k, rad], i) => { const a = (t + k) * s, x = Math.cos(a) * rad, y = Math.sin(a) * rad; (t === 0 && i === 0) ? sh.moveTo(x, y) : sh.lineTo(x, y); });
  sh.closePath();
  const hole = (cx, cy, rr) => { const p = new THREE.Path(); p.absarc(cx, cy, rr, 0, TAU, true); sh.holes.push(p); };
  hole(0, 0, r * .14); if (nHoles) for (let i = 0; i < nHoles; i++) { const a = i / nHoles * TAU; hole(Math.cos(a) * r * .55, Math.sin(a) * r * .55, r * .17); }
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false, curveSegments: 6 }); g.translate(0, 0, -depth / 2); return g;
}
function makeClock() {
  const group = new THREE.Group(), R = rng(5);
  const gold = new THREE.MeshStandardMaterial({ color: 0xe0a64c, emissive: 0x6a3a08, emissiveIntensity: .55, roughness: .34, metalness: .55 });
  const pale = new THREE.MeshStandardMaterial({ color: 0xffe9c4, emissive: 0xffb35c, emissiveIntensity: .3, roughness: .35, metalness: .35 });
  const teal = new THREE.MeshStandardMaterial({ color: 0x6fe3f0, emissive: 0x2fc4d8, emissiveIntensity: .9, roughness: .3 });
  group.add(new THREE.Mesh(new THREE.TorusGeometry(1.0, .04, 14, 160), gold), new THREE.Mesh(new THREE.TorusGeometry(.925, .008, 8, 160), pale));
  // 60 minute ticks
  const ticks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), pale, 60);
  for (let i = 0; i < 60; i++) { const a = i / 60 * TAU, big = i % 5 === 0, L = big ? .1 : .045; m4t.compose(V3(Math.sin(a) * (.85 - (big ? .02 : 0)), Math.cos(a) * (.85 - (big ? .02 : 0)), .02), new THREE.Quaternion().setFromAxisAngle(V3(0, 0, 1), -a), V3(big ? .022 : .009, L, .012)); ticks.setMatrixAt(i, m4t); }
  group.add(ticks);
  // numerals
  const { tex } = tex2d(512, 512, (g) => { g.clearRect(0, 0, 512, 512); g.fillStyle = '#ffe4b8'; g.font = `600 44px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = 'rgba(255,170,70,.8)'; g.shadowBlur = 10;
    for (let h = 1; h <= 12; h++) { const a = h / 12 * TAU; g.fillText(String(h), 256 + Math.sin(a) * 178, 256 - Math.cos(a) * 178); } });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false })); face.position.z = .025; group.add(face);
  // gear train behind the hands
  const mk = (r, teeth, x, y, z, holes) => { const m = new THREE.Mesh(gearGeo(r, teeth, .05, holes), gold); m.position.set(x, y, z); group.add(m); return m; };
  const g1 = mk(.5, 20, 0, 0, -.07, 5), a2 = .62, g2 = mk(.255, 10, Math.cos(a2) * .75, Math.sin(a2) * .75, -.07, 4), a3 = 3.75, g3 = mk(.28, 11, Math.cos(a3) * .78, Math.sin(a3) * .78, -.07, 4);
  const g4 = mk(.17, 8, Math.cos(a2) * .75 + .15, Math.sin(a2) * .75 - .36, -.045, 0); g4.material = pale;
  const back = new THREE.Mesh(new THREE.CircleGeometry(.95, 64), new THREE.MeshBasicMaterial({ color: 0x1a0f05, transparent: true, opacity: .5, depthWrite: false })); back.position.z = -.12; group.add(back);
  // hands
  const hand = (len, w, mat, tail = 0) => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(w, len + tail, .014), mat); b.position.y = (len - tail) / 2; g.add(b); const tp = new THREE.Mesh(new THREE.ConeGeometry(w * .9, w * 3.4, 8), mat); tp.position.y = len + w * 1.6; g.add(tp); g.position.z = .045; group.add(g); return g; };
  const hH = hand(.46, .05, pale), hM = hand(.72, .034, pale); hM.position.z = .06; const hS = hand(.84, .012, teal, .2); hS.position.z = .075;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(.06, 20, 16), gold); cap.position.z = .08; group.add(cap, glowSprite(0xffa040, 1.5, .22));
  // the two days (27, 28) circling the bezel
  const beads = [0, 1].map((k) => { const b = new THREE.Mesh(new THREE.SphereGeometry(.06, 20, 16), new THREE.MeshBasicMaterial({ color: k ? 0xffffff : 0xffd08a })); b.add(glowSprite(0xffb35c, .55, .8)); group.add(b); return b; });
  const N = LOW ? 120 : 260, p = new Float32Array(N * 3), c = new Float32Array(N * 3), s = new Float32Array(N), seed = [];
  for (let i = 0; i < N; i++) { const a = R() * TAU, r = 1.14 + R() * .4, y = gauss(R) * .1; seed.push([a, r, y, (.04 + R() * .1) * (R() < .5 ? 1 : -1)]); const col = hsl(32 + R() * 18, .9, .7); c.set([col.r, col.g, col.b], i * 3); s[i] = .4 + R() * .9; }
  const dust = makePoints(p, c, s, pointsMaterial({ size: .036, opacity: .8 })); group.add(dust);
  const easeOutBack = (x) => 1 + 2.7 * Math.pow(x - 1, 3) + 1.7 * Math.pow(x - 1, 2);
  function update(t) {
    const tk = t * 3.5, sec = Math.floor(tk) + easeOutBack(clamp((tk - Math.floor(tk)) * 3)), sa = -sec * TAU / 60;
    hS.rotation.z = sa; hM.rotation.z = sa / 60 * 5.2 - .5; hH.rotation.z = hM.rotation.z / 12 - 1.0;
    const w = t * .35; g1.rotation.z = w; g2.rotation.z = -w * 2 + .16; g3.rotation.z = -w * 20 / 11 + .14; g4.rotation.z = w * 2 * 10 / 8;
    group.rotation.y = Math.sin(t * .35) * .42; group.rotation.x = .1 + Math.sin(t * .27) * .08;
    beads.forEach((b, k) => { const a = t * .5 + k * .6; b.position.set(Math.cos(a) * 1.13, Math.sin(a) * 1.13, 0); });
    const a = dust.geometry.attributes.position.array;
    seed.forEach(([ang, r, y, v], i) => { const aa = ang + t * v; a[i * 3] = Math.cos(aa) * r; a[i * 3 + 1] = Math.sin(aa) * r; a[i * 3 + 2] = y; });
    dust.geometry.attributes.position.needsUpdate = true;
  }
  return { group, update, scale: .98 };
}

/* ---------- WHO · scientists gathered around the double helix ---------- */
function makeScientist({ skin = 0xe9b894, hair = 0x2a1d17, style = 'short', accent = 0x2fc4d8, tool = 'tablet', ph = 0, coat = 0xf2f7ff }) {
  const g = new THREE.Group(), M = (col, o = {}) => new THREE.MeshStandardMaterial({ color: col, roughness: .55, ...o });
  const coatM = M(coat, { emissive: 0x2a3d52, emissiveIntensity: .4 }), skinM = M(skin, { roughness: .6 }), hairM = M(hair, { roughness: .75 }), pants = M(0x1c2b3b), shirt = M(accent, { emissive: accent, emissiveIntensity: .4 });
  const add = (geo, mat, x, y, z, parent = g) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  [-1, 1].forEach((s) => { add(new THREE.CylinderGeometry(.05, .042, .36, 10), pants, s * .07, .2, 0); add(new THREE.BoxGeometry(.1, .045, .16), M(0x0d1620), s * .07, .025, .02); });
  add(new THREE.CylinderGeometry(.145, .205, .52, 18, 1, true), coatM, 0, .6, 0).material.side = THREE.DoubleSide;
  add(new THREE.CylinderGeometry(.145, .145, .02, 18), coatM, 0, .865, 0);
  add(new THREE.BoxGeometry(.1, .34, .012), shirt, 0, .62, .17).rotation.x = -.06;
  add(new THREE.CylinderGeometry(.038, .042, .07, 10), skinM, 0, .91, 0);
  const head = new THREE.Group(); head.position.set(0, .98, 0); g.add(head);
  add(new THREE.SphereGeometry(.118, 22, 16), skinM, 0, .02, 0, head).scale.set(1, 1.07, 1);
  const hr = add(new THREE.SphereGeometry(.127, 22, 14, 0, TAU, 0, Math.PI * .56), hairM, 0, .045, -.012, head); hr.rotation.x = -.18;
  if (style === 'long') { add(new THREE.CylinderGeometry(.115, .09, .24, 14), hairM, 0, -.06, -.06, head); }
  if (style === 'bun') add(new THREE.SphereGeometry(.052, 12, 10), hairM, 0, .13, -.095, head);
  if (style === 'cap') { add(new THREE.CylinderGeometry(.13, .135, .05, 18), M(accent), 0, .08, 0, head); }
  const gl = M(0x8ff3ff, { emissive: 0x4fd8f0, emissiveIntensity: .9 });
  [-1, 1].forEach((s) => { add(new THREE.TorusGeometry(.032, .005, 8, 20), gl, s * .052, .025, .11, head); add(new THREE.SphereGeometry(.011, 8, 6), M(0x111111), s * .052, .025, .112, head); });
  add(new THREE.CylinderGeometry(.004, .004, .02, 6), gl, 0, .03, .115, head).rotation.z = Math.PI / 2;
  const arm = (s) => {
    const sh = new THREE.Group(); sh.position.set(s * .185, .83, 0); g.add(sh);
    add(new THREE.CylinderGeometry(.036, .033, .27, 10), coatM, 0, -.135, 0, sh);
    const el = new THREE.Group(); el.position.y = -.27; sh.add(el);
    add(new THREE.CylinderGeometry(.031, .027, .25, 10), coatM, 0, -.125, 0, el); add(new THREE.SphereGeometry(.034, 12, 10), skinM, 0, -.265, 0, el);
    return { sh, el, hand: V3(0, -.27, 0) };
  };
  const L = arm(-1), Rr = arm(1); let extra = null, pose = () => {};
  if (tool === 'flask') {
    const fl = new THREE.Group(); const glass = new THREE.MeshPhysicalMaterial({ color: 0xbfefff, transparent: true, opacity: .32, roughness: .05, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false });
    add(new THREE.CylinderGeometry(.018, .068, .15, 18, 1, true), glass, 0, 0, 0, fl); add(new THREE.CylinderGeometry(.018, .02, .06, 12, 1, true), glass, 0, .1, 0, fl);
    const liq = add(new THREE.CylinderGeometry(.04, .064, .075, 18), M(0x6fff9a, { emissive: 0x2fe07a, emissiveIntensity: 1.1, transparent: true, opacity: .85 }), 0, -.035, 0, fl);
    fl.position.set(0, -.3, .03); Rr.el.add(fl); const bub = [0, 1, 2].map((i) => add(new THREE.SphereGeometry(.009, 8, 6), new THREE.MeshBasicMaterial({ color: 0xdfffe9 }), 0, 0, 0, fl));
    extra = (t) => { bub.forEach((b, i) => { const u = (t * .6 + i / 3 + ph) % 1; b.position.set(Math.sin(u * 9 + i) * .02, -.04 + u * .2, 0); b.scale.setScalar(1 - u * .5); }); liq.material.emissiveIntensity = 1 + Math.sin(t * 3 + ph) * .3; };
    pose = (t) => { Rr.sh.rotation.set(-.9 + Math.sin(t * 1.6 + ph) * .05, 0, -.12); Rr.el.rotation.set(-1.15 + Math.sin(t * 2.2 + ph) * .1, 0, 0); L.sh.rotation.set(-.15, 0, .1); L.el.rotation.set(-.2, 0, 0); head.rotation.set(Math.sin(t * .8 + ph) * .06, -.3 + Math.sin(t * .5 + ph) * .12, 0); };
  } else if (tool === 'point') {
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(.004, .004, 1, 6), new THREE.MeshBasicMaterial({ color: 0xff6a6a, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false })); beam.userData.len = .9; g.add(beam);
    const tip = glowSprite(0xff7a7a, .1, 1); g.add(tip);
    extra = (t) => { const hw = V3(0, -.3, 0); Rr.el.localToWorld(hw); g.worldToLocal(hw); const tgt = V3(0, .98, .9); const d = tgt.clone().sub(hw), L2 = d.length(); beam.position.copy(hw).addScaledVector(d, .5); beam.scale.set(1, L2, 1); beam.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize()); tip.position.copy(tgt); tip.scale.setScalar(.09 + Math.sin(t * 6 + ph) * .02); };
    pose = (t) => { Rr.sh.rotation.set(-1.55, 0, -.12); Rr.el.rotation.set(-.25 + Math.sin(t * 1.2 + ph) * .05, 0, 0); L.sh.rotation.set(.05, 0, .35); L.el.rotation.set(-1.2, 0, 0); head.rotation.set(-.2 + Math.sin(t * .7 + ph) * .05, .0, 0); };
  } else if (tool === 'scope') {
    const sc = new THREE.Group(), metal = M(0x9fb0c2, { metalness: .6, roughness: .35, emissive: 0x1a2430, emissiveIntensity: .5 });
    add(new THREE.BoxGeometry(.2, .03, .16), metal, 0, .015, 0, sc); add(new THREE.CylinderGeometry(.02, .02, .3, 10), metal, -.06, .17, 0, sc);
    const tube = add(new THREE.CylinderGeometry(.03, .026, .21, 12), metal, .0, .3, .02, sc); tube.rotation.x = -.35;
    add(new THREE.CylinderGeometry(.045, .045, .012, 16), M(0x1b2a3a), 0, .06, .02, sc); const lens = glowSprite(0x7fe9ff, .13, .9); lens.position.set(0, .066, .02); sc.add(lens);
    sc.position.set(0, .86 - .0, .3); sc.scale.setScalar(1); g.add(sc); sc.position.y = .48;
    pose = (t) => { Rr.sh.rotation.set(-1.0, 0, -.05); Rr.el.rotation.set(-.5, 0, 0); L.sh.rotation.set(-.95, 0, .05); L.el.rotation.set(-.55, 0, 0); head.rotation.set(.35 + Math.sin(t * .6 + ph) * .04, 0, 0); g.rotation.x = .1; };
    extra = (t) => { lens.material.opacity = .6 + Math.sin(t * 3 + ph) * .3; };
  } else {  // tablet + holo
    const tb = new THREE.Group(), scr = tex2d(128, 96, (c, w, h) => { c.fillStyle = '#06222c'; c.fillRect(0, 0, w, h); c.strokeStyle = '#6fe3f0'; c.lineWidth = 3; c.beginPath(); for (let x = 0; x <= w; x += 4) c.lineTo(x, h * .6 - Math.sin(x * .13) * 14 - Math.sin(x * .41) * 5); c.stroke(); c.fillStyle = '#ffb35c'; [20, 44, 68, 92].forEach((x, i) => c.fillRect(x, h - 10 - (i * 7 + 8), 12, i * 7 + 8)); });
    add(new THREE.BoxGeometry(.19, .13, .012), M(0x1b2a3a), 0, 0, 0, tb); add(new THREE.PlaneGeometry(.17, .11), new THREE.MeshBasicMaterial({ map: scr.tex, toneMapped: false }), 0, 0, .0075, tb);
    tb.position.set(0, .56, .26); tb.rotation.x = -.5; g.add(tb);
    const holo = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(.07, 0)), new THREE.LineBasicMaterial({ color: 0x8ff3ff, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false })); holo.position.set(0, .8, .3); g.add(holo);
    const hg = glowSprite(0x6fe3f0, .22, .5); hg.position.copy(holo.position); g.add(hg);
    extra = (t) => { holo.rotation.y = t * 1.4 + ph; holo.rotation.x = t * .9; holo.position.y = .8 + Math.sin(t * 2 + ph) * .015; hg.position.y = holo.position.y; };
    pose = (t) => { Rr.sh.rotation.set(-.95, 0, -.1); Rr.el.rotation.set(-.7, 0, 0); L.sh.rotation.set(-.95, 0, .1); L.el.rotation.set(-.7, 0, 0); head.rotation.set(.18 + Math.sin(t * .6 + ph) * .04, Math.sin(t * .4 + ph) * .2, 0); };
  }
  return { group: g, update(t) { pose(t); if (extra) extra(t); g.position.y = (g.userData.y0 || 0) + Math.sin(t * 1.1 + ph) * .006; } };
}
function makeScientists() {
  const group = new THREE.Group(), stage = new THREE.Group(); group.add(stage);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.46, .05, 72), new THREE.MeshStandardMaterial({ color: 0x0c2230, roughness: .4, metalness: .3, emissive: 0x0a2a38, emissiveIntensity: .6 })); disc.position.y = -.85; stage.add(disc);
  const ringM = new THREE.MeshBasicMaterial({ color: 0x6fe3f0, transparent: true, opacity: .75, blending: THREE.AdditiveBlending, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.44, .012, 8, 120), ringM); ring.rotation.x = Math.PI / 2; ring.position.y = -.825; stage.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.0, .006, 8, 120), ringM.clone()); ring2.rotation.x = Math.PI / 2; ring2.position.y = -.82; ring2.material.opacity = .35; stage.add(ring2);
  const dnaWrap = new THREE.Group(), dna = bio.makeDNA({ pairs: 40, rise: .092, radius: .22, twist: .5 }); dnaWrap.add(dna.group); dnaWrap.rotation.z = Math.PI / 2; dnaWrap.scale.setScalar(.6); dnaWrap.position.y = .28; stage.add(dnaWrap);
  const people = [
    { skin: 0xe6b48f, hair: 0x2b1b14, style: 'short', accent: 0x2fc4d8, tool: 'point', ph: 0 },
    { skin: 0x8a5a3c, hair: 0x120d0a, style: 'bun', accent: 0xff9f43, tool: 'tablet', ph: 1.7 },
    { skin: 0xf0c8a5, hair: 0x8a5a2a, style: 'long', accent: 0x9b7bff, tool: 'flask', ph: 3.1 },
    { skin: 0xc58a62, hair: 0x1b1410, style: 'cap', accent: 0x58d68d, tool: 'scope', ph: 4.6 },
    { skin: 0xf1d0b4, hair: 0xb8b8c0, style: 'short', accent: 0xff6b8b, tool: 'tablet', ph: 5.4 },
  ].map((o, i, arr) => {
    const sc = makeScientist(o), a = i / arr.length * TAU + .4, r = 1.0; sc.group.position.set(Math.sin(a) * r, -.83, Math.cos(a) * r); sc.group.userData.y0 = -.83; sc.group.rotation.y = a + Math.PI; stage.add(sc.group); return sc;
  });
  // ideas drifting up from the helix
  const N = LOW ? 80 : 150, p = new Float32Array(N * 3), c = new Float32Array(N * 3), s = new Float32Array(N), seed = [], R = rng(21);
  for (let i = 0; i < N; i++) { seed.push([R() * TAU, .22 + R() * .9, R(), .1 + R() * .2]); const col = hsl([180, 38, 260, 140, 340][i % 5], .85, .66); c.set([col.r, col.g, col.b], i * 3); s[i] = .5 + R(); }
  const idea = makePoints(p, c, s, pointsMaterial({ size: .035, opacity: .85 })); stage.add(idea);
  function update(t, dt = .016) {
    stage.rotation.y = t * .2; dna.update(t); people.forEach((pp) => pp.update(t));
    ring.material.opacity = .55 + Math.sin(t * 2) * .2;
    const a = idea.geometry.attributes.position.array;
    seed.forEach(([ang, r, u0, v], i) => { const u = (u0 + t * v * .15) % 1, aa = ang + t * .4 + u * 3; a[i * 3] = Math.cos(aa) * (r * (.5 + u * .7)); a[i * 3 + 1] = -.7 + u * 2.4; a[i * 3 + 2] = Math.sin(aa) * (r * (.5 + u * .7)); });
    idea.geometry.attributes.position.needsUpdate = true;
  }
  group.rotation.x = .12;
  return { group, update, scale: .95 };
}

/* ---------- REGISTER · a delegate badge: name typed, QR scanned, check-in stamped ---------- */
function rrShape(w, h, r) { const s = new THREE.Shape(), x = -w / 2, y = -h / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; }
function makeBadge() {
  const group = new THREE.Group(), swing = new THREE.Group(), CW = 1.16, CH = 1.64, R = rng(17); group.add(swing); swing.position.y = CH / 2 + .02;
  const body = new THREE.Group(); body.position.y = -CH / 2 - .02; swing.add(body);
  const sh = rrShape(CW, CH, .1); const slot = new THREE.Path(); slot.moveTo(-.12, CH / 2 - .13); slot.lineTo(.12, CH / 2 - .13); slot.lineTo(.12, CH / 2 - .09); slot.lineTo(-.12, CH / 2 - .09); slot.closePath(); sh.holes.push(slot);
  const card = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: .04, bevelEnabled: true, bevelThickness: .012, bevelSize: .012, bevelSegments: 3, curveSegments: 10 }), new THREE.MeshPhysicalMaterial({ color: 0x0b1c2a, roughness: .35, metalness: .25, clearcoat: 1, clearcoatRoughness: .2, emissive: 0x08202c, emissiveIntensity: .6 })); card.position.z = -.02; body.add(card);
  const PW = 512, PH = Math.round(512 * CH / CW), py = (y) => (.5 - y / PH) * CH, px = (x) => (x / PW - .5) * CW;
  const face = tex2d(PW, PH, (g, w, h) => {
    const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, '#0f2b3b'); bg.addColorStop(1, '#06121c'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(111,227,240,.07)'; g.lineWidth = 1; for (let y = 0; y < h; y += 26) { g.beginPath(); for (let x = 0; x <= w; x += 8) g.lineTo(x, y + Math.sin(x * .03 + y * .05) * 6); g.stroke(); }
    g.strokeStyle = 'rgba(255,190,110,.55)'; g.lineWidth = 3; g.strokeRect(20, 20, w - 40, h - 40);
    g.textAlign = 'center'; g.fillStyle = '#8fb4c8'; g.font = `600 22px ${FONT}`; g.fillText('SCHOOL OF COMPUTATIONAL & INTEGRATIVE SCIENCES · JNU', w / 2, 62, w - 70);
    const gd = g.createLinearGradient(0, 80, 0, 150); gd.addColorStop(0, '#ffe7b8'); gd.addColorStop(1, '#ffb05a'); g.fillStyle = gd; g.font = `700 64px ${FONT}`; g.fillText('SILVER', w / 2, 128); g.font = `700 52px ${FONT}`; g.fillText('JUBILEE', w / 2, 184);
    g.fillStyle = '#dff6ff'; g.font = `500 22px ${FONT}`; g.fillText('SYMPOSIUM 2026 · 27–28 NOVEMBER', w / 2, 222);
    const cx = w / 2, cy = 330; for (let k = 0; k < 2; k++) { g.strokeStyle = k ? '#ffb35c' : '#6fe3f0'; g.lineWidth = 7; g.beginPath(); for (let i = 0; i <= 80; i++) { const u = i / 80, x = cx - 190 + u * 380, y = cy + Math.sin(u * TAU * 1.6 + k * Math.PI) * 48; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
    g.lineWidth = 3; for (let i = 0; i <= 20; i++) { const u = i / 20, x = cx - 190 + u * 380, y1 = cy + Math.sin(u * TAU * 1.6) * 48, y2 = cy - Math.sin(u * TAU * 1.6) * 48; g.strokeStyle = i % 2 ? 'rgba(160,255,200,.55)' : 'rgba(255,255,255,.4)'; g.beginPath(); g.moveTo(x, y1); g.lineTo(x, y2); g.stroke(); }
    g.fillStyle = '#6fe3f0'; g.font = `600 20px ${FONT}`; g.fillText('DELEGATE', w / 2, 438);
    g.strokeStyle = 'rgba(111,227,240,.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(80, 545); g.lineTo(w - 80, 545); g.stroke();
    const qx = w / 2 - 80, qy = 568, q = 160, n = 21, cs = q / n; g.fillStyle = '#e8f6ff'; g.fillRect(qx - 10, qy - 10, q + 20, q + 20); g.fillStyle = '#06121c';
    const fin = (x, y) => { g.fillRect(qx + x * cs, qy + y * cs, 7 * cs, 7 * cs); g.fillStyle = '#e8f6ff'; g.fillRect(qx + (x + 1) * cs, qy + (y + 1) * cs, 5 * cs, 5 * cs); g.fillStyle = '#06121c'; g.fillRect(qx + (x + 2) * cs, qy + (y + 2) * cs, 3 * cs, 3 * cs); };
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { if ((x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12)) continue; if (R() < .5) g.fillRect(qx + x * cs, qy + y * cs, cs, cs); }
    fin(0, 0); fin(14, 0); fin(0, 14);
  });
  const front = new THREE.Mesh(new THREE.PlaneGeometry(CW - .02, CH - .02), new THREE.MeshBasicMaterial({ map: face.tex, toneMapped: false })); front.position.z = .0425; body.add(front);
  // typed name
  const nm = tex2d(512, 80, () => {}); const nameMesh = new THREE.Mesh(new THREE.PlaneGeometry(CW * .86, CW * .86 * 80 / 512), new THREE.MeshBasicMaterial({ map: nm.tex, transparent: true, toneMapped: false, depthWrite: false })); nameMesh.position.set(0, py(492), .046); body.add(nameMesh);
  const NAME = 'Dr. A. Researcher';
  const drawName = (n, cur) => { const g = nm.g; g.clearRect(0, 0, 512, 80); g.fillStyle = '#ffffff'; g.font = `600 44px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle'; const tx = NAME.slice(0, n), w = g.measureText(tx).width, full = g.measureText(NAME).width, x0 = 256 - full / 2; g.fillText(tx, x0, 42); if (cur) { g.fillStyle = '#6fe3f0'; g.fillRect(x0 + w + 4, 14, 4, 54); } nm.tex.needsUpdate = true; };
  // holo-foil over the helix emblem
  const foil = new THREE.Mesh(new THREE.PlaneGeometry(CW * .78, CH * .15), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform float uT; varying vec2 vUv; void main(){ float b=sin(vUv.x*9.+vUv.y*5.-uT*1.8); vec3 c=.5+.5*cos(6.2831*(vec3(0.,.33,.67)+vUv.x*.6+uT*.12)); float a=smoothstep(.65,1.,b)*.38; gl_FragColor=vec4(c*a,a); }' }));
  foil.position.set(0, py(330), .047); body.add(foil);
  // scanning beam
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(CW * 1.04, .05), new THREE.MeshBasicMaterial({ color: 0x6fffd0, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false })); beam.position.z = .06; body.add(beam);
  const beamGlow = new THREE.Mesh(new THREE.PlaneGeometry(CW * 1.04, .34), new THREE.MeshBasicMaterial({ color: 0x35e0b0, transparent: true, opacity: .22, blending: THREE.AdditiveBlending, depthWrite: false })); beamGlow.position.z = .058; body.add(beamGlow);
  // check-in stamp
  const ck = tex2d(256, 256, (g) => { g.fillStyle = 'rgba(24,190,130,.95)'; g.beginPath(); g.arc(128, 128, 112, 0, TAU); g.fill(); g.strokeStyle = '#eafff6'; g.lineWidth = 22; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(74, 132); g.lineTo(112, 170); g.lineTo(184, 88); g.stroke(); });
  const stamp = new THREE.Mesh(new THREE.PlaneGeometry(.6, .6), new THREE.MeshBasicMaterial({ map: ck.tex, transparent: true, toneMapped: false, depthWrite: false })); stamp.position.set(0, py(330), .07); body.add(stamp);
  const shock = new THREE.Mesh(new THREE.RingGeometry(.28, .3, 64), new THREE.MeshBasicMaterial({ color: 0x6fffd0, transparent: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })); shock.position.copy(stamp.position); body.add(shock);
  // lanyard + clip
  const lan = tex2d(64, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#0e5a68'); gr.addColorStop(.5, '#2fc4d8'); gr.addColorStop(1, '#0e5a68'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,230,190,.85)'; g.fillRect(6, 0, 4, h); g.fillRect(w - 10, 0, 4, h); g.save(); g.translate(w / 2, h / 2); g.rotate(-Math.PI / 2); g.fillStyle = 'rgba(6,30,40,.65)'; g.font = `700 22px ${FONT}`; g.textAlign = 'center'; g.fillText('SCIS · JNU · 25 YEARS · SCIS · JNU · 25 YEARS', 0, 8); g.restore(); g.globalCompositeOperation = 'destination-out'; const fd = g.createLinearGradient(0, 0, 0, h * .55); fd.addColorStop(0, 'rgba(0,0,0,1)'); fd.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = fd; g.fillRect(0, 0, w, h * .55); });
  const LL = 1.9, band = new THREE.Mesh(new THREE.PlaneGeometry(.16, LL), new THREE.MeshBasicMaterial({ map: lan.tex, transparent: true, side: THREE.DoubleSide, depthWrite: false, toneMapped: false })); band.position.y = LL / 2 + .02; swing.add(band);
  const gold = new THREE.MeshStandardMaterial({ color: 0xe0a64c, metalness: .7, roughness: .3, emissive: 0x5a3208, emissiveIntensity: .5 });
  const clip = new THREE.Mesh(new THREE.TorusGeometry(.055, .014, 10, 28), gold); clip.position.set(0, -.02, .045); swing.add(clip);
  const clip2 = new THREE.Mesh(new THREE.BoxGeometry(.2, .05, .03), gold); clip2.position.set(0, .04, 0); swing.add(clip2);
  // confetti of cells
  const NC = LOW ? 60 : 110, cp = new Float32Array(NC * 3), cc = new Float32Array(NC * 3), cs = new Float32Array(NC).fill(1.3), cv = [];
  const pal = [hsl(170, .85, .6), hsl(38, .95, .62), hsl(265, .8, .72), hsl(140, .8, .6), hsl(340, .85, .7)];
  for (let i = 0; i < NC; i++) { const a = R() * TAU, sp = .5 + R() * 1.1; cv.push([Math.cos(a) * sp, Math.sin(a) * sp + .5, (R() - .3) * .6, pal[i % 5]]); }
  const conf = makePoints(cp, cc, cs, pointsMaterial({ size: .05, opacity: 1 })); conf.position.copy(stamp.position); body.add(conf);
  const PERIOD = 9.6; let lastN = -1, lastCur = null;
  function update(t) {
    const u = t % PERIOD, n = Math.floor(clamp((u - .5) / 2.2) * NAME.length), cur = u < 3.4 ? Math.floor(t * 2.6) % 2 === 0 : false;
    const nn = u > 8.3 ? Math.floor(NAME.length * (1 - sstep((u - 8.3) / .9))) : n;
    if (nn !== lastN || cur !== lastCur) { drawName(nn, cur); lastN = nn; lastCur = cur; }
    const sc = clamp((u - 3.6) / 1.5), scanning = sc > 0 && sc < 1; beam.visible = beamGlow.visible = scanning;
    const by = lerp(CH / 2 - .1, -CH / 2 + .1, sstep(sc)); beam.position.y = by; beamGlow.position.y = by;
    const st = clamp((u - 5.1) / .6), pop = st > 0 ? 1 + .22 * Math.sin(clamp(st) * Math.PI) * (1 - st * .3) : 0, fade = 1 - sstep((u - 8.5) / .9);
    stamp.scale.setScalar(Math.max(.001, sstep(st) * pop * fade)); stamp.material.opacity = fade;
    const sk = clamp((u - 5.1) / 1.1); shock.scale.setScalar(.4 + sk * 2.2); shock.material.opacity = st > 0 ? (1 - sk) * .85 : 0;
    const ca = u - 5.1, cArr = conf.geometry.attributes.position, cCol = conf.geometry.attributes.aColor;
    for (let i = 0; i < NC; i++) { const [vx, vy, vz, col] = cv[i], k = clamp(ca, 0, 3.2), on = ca > 0 && ca < 3.2 ? 1 - ca / 3.2 : 0; cArr.setXYZ(i, vx * k * .55, vy * k * .55 - .45 * k * k * .5, vz * k * .55 + .06); cCol.setXYZ(i, col.r * on, col.g * on, col.b * on); }
    cArr.needsUpdate = true; cCol.needsUpdate = true; foil.material.uniforms.uT.value = t;
    swing.rotation.z = Math.sin(t * .85) * .09; swing.rotation.y = Math.sin(t * .5) * .5; swing.rotation.x = Math.sin(t * .62 + 1) * .05;
  }
  group.position.y = -.05;
  return { group, update, scale: 1.12 };
}

/* ---------- WHERE · dotted globe, pin on New Delhi, collaboration arcs ---------- */
function makeGlobe() {
  const group = new THREE.Group(), R = rng(11), globe = new THREE.Group();
  const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
  const vn = (x, y, z) => {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
    const L = (a, b, t) => a + (b - a) * t;
    return L(L(L(hash(ix, iy, iz), hash(ix + 1, iy, iz), u), L(hash(ix, iy + 1, iz), hash(ix + 1, iy + 1, iz), u), v), L(L(hash(ix, iy, iz + 1), hash(ix + 1, iy, iz + 1), u), L(hash(ix, iy + 1, iz + 1), hash(ix + 1, iy + 1, iz + 1), u), v), w);
  };
  const fbm = (p) => vn(p.x * 1.9, p.y * 1.9, p.z * 1.9) * .62 + vn(p.x * 4.1 + 9, p.y * 4.1, p.z * 4.1) * .38;
  // ocean body + atmosphere
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(.985, 64, 48), new THREE.MeshBasicMaterial({ color: 0x06222c })));
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(1.12, 48, 32), new THREE.ShaderMaterial({
    transparent: true, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
    fragmentShader: 'varying vec3 vN; varying vec3 vV; void main(){ float f=pow(clamp(-dot(normalize(vN),normalize(vV)),0.,1.),2.2); gl_FragColor=vec4(vec3(.25,.9,.8)*f*.9,f*.8); }',
  }));
  group.add(atmo);
  // land dots (fibonacci sphere masked by noise)
  const NP = LOW ? 2200 : 4200, pos = [], col = [], sz = [], ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < NP; i++) {
    const y = 1 - (i + .5) / NP * 2, r = Math.sqrt(1 - y * y), a = i * ga, p = V3(Math.cos(a) * r, y, Math.sin(a) * r);
    if (fbm(p) < .44) continue;
    pos.push(p.x * 1.002, p.y * 1.002, p.z * 1.002); const c = hsl(165 + (fbm(p) - .5) * 80, .7, .5 + (fbm(p) - .5) * .8); col.push(c.r, c.g, c.b); sz.push(.7 + R() * .6);
  }
  globe.add(makePoints(new Float32Array(pos), new Float32Array(col), new Float32Array(sz), pointsMaterial({ size: .03, opacity: .95 })));
  // graticule
  const gm = new THREE.LineBasicMaterial({ color: 0x5fe3f0, transparent: true, opacity: .13, blending: THREE.AdditiveBlending, depthWrite: false });
  for (let lat = -60; lat <= 60; lat += 30) { const pts = [], r = Math.cos(lat * Math.PI / 180), y = Math.sin(lat * Math.PI / 180); for (let i = 0; i <= 96; i++) { const a = i / 96 * TAU; pts.push(V3(Math.cos(a) * r, y, Math.sin(a) * r).multiplyScalar(1.004)); } globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gm)); }
  for (let lon = 0; lon < 180; lon += 30) { const pts = []; for (let i = 0; i <= 96; i++) { const a = i / 96 * TAU; pts.push(V3(Math.cos(a) * Math.cos(lon * Math.PI / 180), Math.sin(a), Math.cos(a) * Math.sin(lon * Math.PI / 180) * 1).multiplyScalar(1.004)); } globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gm)); }
  const ll = (lat, lon) => { const la = lat * Math.PI / 180, lo = lon * Math.PI / 180; return V3(Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)); };
  const delhi = ll(28.6, 77.2), cities = [[51.5, -0.1], [40.7, -74], [35.7, 139.7], [-33.9, 151.2], [-33.9, 18.4], [-23.5, -46.6], [1.35, 103.8], [52.5, 13.4], [37.8, -122.4]];
  // arcs + travelling pulses
  const arcs = cities.map(([la, lo], k) => {
    const b = ll(la, lo), ang = delhi.angleTo(b), pts = [];
    for (let i = 0; i <= 48; i++) { const u = i / 48, q = new THREE.Quaternion().setFromUnitVectors(delhi, b.clone().normalize()), v = delhi.clone().applyQuaternion(new THREE.Quaternion().slerpQuaternions(new THREE.Quaternion(), q, u)); pts.push(v.multiplyScalar(1 + Math.sin(u * Math.PI) * .22 * (ang / Math.PI + .25))); }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: hsl(40 + k * 6, .95, .65), transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false })); globe.add(line);
    const dot = glowSprite(hsl(170, .8, .6), .09, .9); dot.position.copy(b.clone().multiplyScalar(1.01)); globe.add(dot);
    return { pts, v: .16 + R() * .12, u: R() };
  });
  const pp = new Float32Array(arcs.length * 3), pc = new Float32Array(arcs.length * 3).fill(1), pz = new Float32Array(arcs.length).fill(2.2), pulses = makePoints(pp, pc, pz, pointsMaterial({ size: .045, opacity: 1 })); globe.add(pulses);
  // Delhi pin + sonar rings
  const pin = glowSprite(0xffb35c, .34, 1); pin.position.copy(delhi.clone().multiplyScalar(1.012)); globe.add(pin);
  const core = new THREE.Mesh(new THREE.SphereGeometry(.018, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffffff })); core.position.copy(delhi.clone().multiplyScalar(1.012)); globe.add(core);
  const sonar = [0, 1, 2].map((k) => { const m = new THREE.Mesh(new THREE.RingGeometry(.9, 1, 48), new THREE.MeshBasicMaterial({ color: 0xffb35c, transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })); m.position.copy(delhi.clone().multiplyScalar(1.01)); m.lookAt(delhi.clone().multiplyScalar(3)); globe.add(m); return m; });
  group.add(globe);
  // rotate so Delhi faces the camera (+Z); then sway
  const qFace = new THREE.Quaternion().setFromUnitVectors(delhi, V3(0, 0, 1));
  const tmp = V3(0, 0, 0);
  function update(t) {
    const sw = new THREE.Quaternion().setFromEuler(new THREE.Euler(.22 + Math.sin(t * .3) * .05, Math.sin(t * .22) * .5, 0));
    globe.quaternion.copy(sw).multiply(qFace);
    arcs.forEach((a, i) => { a.u = (a.u + a.v * .016) % 1; const k = Math.floor(a.u * 48), p = a.pts[k]; pulses.geometry.attributes.position.setXYZ(i, p.x, p.y, p.z); });
    pulses.geometry.attributes.position.needsUpdate = true;
    sonar.forEach((m, k) => { const u = ((t * .5 + k / 3) % 1); m.scale.setScalar(.02 + u * .22); m.material.opacity = (1 - u) * .8; });
    pin.scale.setScalar(.34 + Math.sin(t * 3) * .04);
  }
  return { group, update, scale: .98 };
}

/* ---------- registry ---------- */
export const BUILDERS = {
  what: () => { const m = bio.makeCell(); return { ...m, scale: 1.22 }; },
  when: makeClock,
  where: makeGlobe,
  who: makeScientists,
  fees: makeBadge,
};

export function createSpecimens() {
  const renderer = makeRenderer(document.createElement('canvas'), { alpha: true });
  renderer.setClearColor(0x000000, 0); renderer.toneMappingExposure = 1.2; renderer.domElement.className = 'specimen-canvas';
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(36, 1, .1, 50); camera.position.set(0, 0, 4.4);
  addRig(scene); const pivot = new THREE.Group(); scene.add(pivot);
  const cache = {}; let cur = null, slot = null, running = false, enter = 0, last = 0, t = 0, mx = 0, my = 0, sx = 0, sy = 0, visible = true;
  const io = new IntersectionObserver((e) => { visible = e[0].isIntersecting; }, { threshold: 0 });

  function size() {
    if (!slot) return; const w = slot.clientWidth || 200, h = slot.clientHeight || 200;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); updatePointScale(renderer, camera);
  }
  function loop(now) {
    if (!running) return; requestAnimationFrame(loop);
    const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now;
    if (document.hidden || !visible || !cur) return;
    t += reduce ? dt * .25 : dt; enter = Math.min(1, enter + dt / .9);
    sx += (mx - sx) * Math.min(1, dt * 4); sy += (my - sy) * Math.min(1, dt * 4);
    cur.update(t, dt);
    const e = sstep(enter), s = (cur.scale || 1) * (.7 + .3 * e);
    pivot.scale.setScalar(s); pivot.rotation.set((cur.tilt || 0) + sy * .35, sx * .5, 0);
    renderer.domElement.style.opacity = e; updatePointScale(renderer, camera); renderer.render(scene, camera);
  }
  addEventListener('pointermove', (e) => { if (!slot) return; const r = slot.getBoundingClientRect(); mx = clamp((e.clientX - (r.left + r.width / 2)) / innerWidth * 2, -1, 1); my = clamp((e.clientY - (r.top + r.height / 2)) / innerHeight * 2, -1, 1); }, { passive: true });
  addEventListener('resize', size);

  return {
    show(kind, el) {
      if (!BUILDERS[kind] || !el) return;
      if (cur) pivot.remove(cur.group);
      cache[kind] = cache[kind] || BUILDERS[kind](); cur = cache[kind]; pivot.add(cur.group);
      if (slot) io.unobserve(slot);
      slot = el; el.appendChild(renderer.domElement); io.observe(el); size(); enter = 0; renderer.domElement.style.opacity = 0;
      if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
    },
    stop() { running = false; },
    dispose() { running = false; Object.values(cache).forEach((m) => disposeTree(m.group)); renderer.dispose(); },
  };
}
