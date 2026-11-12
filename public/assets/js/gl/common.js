/* Shared WebGL foundation: renderer + bloom, glow points, noise, helpers. */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export { THREE };
export const TAU = Math.PI * 2;
export const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const CORES = navigator.hardwareConcurrency || 8;
/* Two separate questions, previously conflated into one flag.

   LOW asks "can this machine push the detail" — it gates geometry subdivision,
   particle counts, bloom strength and pixel ratio across every scene. It is now
   keyed on cores alone: a phone is not short of GPU power merely for having a
   narrow screen, and keying it on width meant phones lost detail everywhere,
   in scenes that were never the problem.

   FRAGILE_FX asks a different question: "is this effect known to break here".
   It stays keyed on viewport too, because the one effect it gates — the
   membrane speckle — flickered on a phone that was holding 61fps at the time.
   That was never about speed, so a fast phone must still be excluded. */
export const LOW = CORES <= 4;
export const FRAGILE_FX = innerWidth < 760 || CORES <= 4;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const sstep = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
export const easeInOut = (x) => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export function rng(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
export const gauss = (r) => { let u = 0; for (let i = 0; i < 4; i++) u += r(); return (u - 2) * 1.2; };

/* shared uniform: converts world size to pixels for point sprites */
export const POINT_SCALE = { value: 600 };
export function updatePointScale(renderer, camera) {
  const h = renderer.domElement.height; // device pixels
  POINT_SCALE.value = h / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
}

export function makeRenderer(canvas, { alpha = false, antialias = true } = {}) {
  const r = new THREE.WebGLRenderer({ canvas, antialias, alpha, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(devicePixelRatio || 1, LOW ? 1.25 : 1.75));
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = .95;
  return r;
}

export function makeComposer(renderer, scene, camera, { strength = .8, radius = .65, threshold = .2 } = {}) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), strength, radius, threshold);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  return { composer, bloom };
}

/* ---------- soft additive points ---------- */
const POINT_VS = /* glsl */`
attribute vec3 aColor; attribute float aSize;
uniform float uScale; uniform float uSize;
varying vec3 vC;
void main(){
  vC = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = max(1.0, uSize * aSize * uScale / -mv.z);
}`;
const POINT_FS = /* glsl */`
uniform float uOpacity; varying vec3 vC;
void main(){
  vec2 d = gl_PointCoord - 0.5; float r = length(d) * 2.0;
  float a = exp(-r * r * 3.2) * (1.0 - smoothstep(0.85, 1.0, r));
  if (a < 0.004) discard;
  gl_FragColor = vec4(vC * a * uOpacity, a * uOpacity);
}`;
export function pointsMaterial({ size = 0.05, opacity = 1 } = {}) {
  return new THREE.ShaderMaterial({
    vertexShader: POINT_VS, fragmentShader: POINT_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uScale: POINT_SCALE, uSize: { value: size }, uOpacity: { value: opacity } },
  });
}
/** positions: Float32Array(3n); colors: Float32Array(3n) | THREE.Color; sizes: Float32Array(n) | number */
export function makePoints(positions, colors, sizes, mat) {
  const n = positions.length / 3, g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  let c = colors;
  if (!(colors instanceof Float32Array)) { c = new Float32Array(n * 3); for (let i = 0; i < n; i++) { c[i * 3] = colors.r; c[i * 3 + 1] = colors.g; c[i * 3 + 2] = colors.b; } }
  g.setAttribute('aColor', new THREE.BufferAttribute(c, 3));
  let s = sizes;
  if (typeof sizes === 'number') { s = new Float32Array(n).fill(sizes); }
  g.setAttribute('aSize', new THREE.BufferAttribute(s, 1));
  const p = new THREE.Points(g, mat || pointsMaterial());
  p.frustumCulled = false;
  return p;
}

/* ---------- glow sprite ---------- */
let _glowTex;
export function glowTexture() {
  if (_glowTex) return _glowTex;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.18, 'rgba(255,255,255,.55)'); gr.addColorStop(.5, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return (_glowTex = new THREE.CanvasTexture(c));
}
export function glowSprite(color = 0xffffff, scale = 1, opacity = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.setScalar(scale); return s;
}

/* ---------- GLSL simplex noise ---------- */
export const GLSL_NOISE = /* glsl */`
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.); const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.; vec4 s1=floor(b1)*2.+1.; vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.); m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

/* ---------- misc helpers ---------- */
const _up = new THREE.Vector3(0, 1, 0), _d = new THREE.Vector3(), _m = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _mat = new THREE.Matrix4();
/** Place instance i of an InstancedMesh (unit cylinder h=1,r=1 along Y) between points a and b. */
export function setSegment(mesh, i, a, b, radius) {
  _d.subVectors(b, a); const len = _d.length() || 1e-4; _d.divideScalar(len);
  _m.addVectors(a, b).multiplyScalar(.5);
  _q.setFromUnitVectors(_up, _d); _s.set(radius, len, radius);
  _mat.compose(_m, _q, _s); mesh.setMatrixAt(i, _mat);
}
export function disposeTree(root) {
  root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { for (const k in m) { if (m[k] && m[k].isTexture) m[k].dispose(); } m.dispose(); });
  });
}
export function hsl(h, s = .8, l = .6) { return new THREE.Color().setHSL(((h % 360) + 360) % 360 / 360, s, l); }

/* standard lighting rig for a scene */
export function addRig(scene, { key = 0xbff4ff, rim = 0xffb070, fill = 0x203a4a } = {}) {
  scene.add(new THREE.HemisphereLight(0x9fdcff, 0x0a1620, .55));
  const k = new THREE.DirectionalLight(key, 2.2); k.position.set(3, 4, 5); scene.add(k);
  const r = new THREE.DirectionalLight(rim, 2.0); r.position.set(-4, -1.5, -3); scene.add(r);
  const f = new THREE.PointLight(fill, 6, 12); f.position.set(0, -2, 3); scene.add(f);
}
