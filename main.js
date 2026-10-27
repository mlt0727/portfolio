// Neural journey: one continuous scroll-driven camera flight through
//   input field → core → projects → hidden layers (skills) → training curve
//   (experience) → output layer (education), rendered with three.js (WebGL).
// Overlay HTML elements carry data-layer="…"; their 3D anchor positions are
// laid out here, drawn as neurons/edges, and the HTML is projected onto them.
import * as THREE from 'three';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

const dive = $('[data-dive]');
const canvas = $('[data-canvas]');
const outro = $('[data-outro]');
const hud = { phase: $('[data-phase]'), depth: $('[data-depth]'), nodes: $('[data-nodes]'), loss: $('[data-loss]') };

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = matchMedia('(max-width: 720px)').matches;

// ---------- tunables ----------
const CORE = new THREE.Vector3(0, 0, -245);
const CFG = {
  nodes: reduced || small ? 3000 : 7000,
  zNear: 60, zFar: -720, rHole: 7, rMax: 42,
  linkDist: 13, linksPerNode: 2,
};
// Each overlay layer: where it sits on the z axis and how its items are arranged.
// ring: items on an ellipse (rx, ry) facing the camera. path: items along the loss curve.
const LAYERS = {
  p: { z: -228, kind: 'ring', rx: 17, ry: 9, size: 9, color: '#ffb45c', link: 'core' },
  1: { z: -330, kind: 'ring', rx: 18, ry: 10, size: 5, color: '#4fe3ff', link: 'core' },   // skills
  2: { z: -400, kind: 'ring', rx: 18, ry: 10, size: 5, color: '#4fe3ff', link: '1' },      // skills
  t: { z0: -470, z1: -620, kind: 'path', size: 7, color: '#8b5cf6', link: 'chain' },       // education = training
  e: { z: -690, kind: 'ring', rx: 17, ry: 9, size: 8, color: '#ffb45c', link: 't' },       // experience = output
};
const curveY = (u) => 14 - 24 * (1 - Math.exp(-2.6 * u)); // "training loss" shape, y over 0..1
// Camera keyframes [p, z, y]; equal z in neighbours = hold still so cards can be read.
const KEYS = [
  [0.00, 45, 0],
  [0.18, -193, 0], [0.25, -193, 0],      // projects
  [0.31, -295, 0], [0.35, -295, 0],      // hidden layer 1
  [0.40, -365, 0], [0.44, -365, 0],      // hidden layer 2
  [0.50, -435, 14], [0.60, -545, curveY(0.45) + 8], [0.70, -620, curveY(1) + 8], // training curve
  [0.80, -655, 0], [1.00, -655, 0],      // output layer: read until 0.90, veil 0.90–1.0 (style.css)
];
const PHASES = [[0.12, '00 · diving in'], [0.29, '01 Input layer · education'], [0.47, '02–03 Hidden layers · skills'], [0.74, '04 Training · experience'], [1.01, '05 Output layer · projects']];

// ---------- renderer / scene ----------
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
} catch (e) {
  console.warn('WebGL unavailable, skipping 3D intro', e);
  canvas.remove();
}

if (renderer) {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0x05070f, 1);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x05070f, 60, 230);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.5, 700);

  const C_CYAN = new THREE.Color('#4fe3ff'), C_VIO = new THREE.Color('#8b5cf6'), C_ORA = new THREE.Color('#ffb45c'), C_WHITE = new THREE.Color('#dff7ff');
  const pick = () => { const r = Math.random(); return r < 0.74 ? C_CYAN : r < 0.92 ? C_VIO : C_ORA; };

  const pointsMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uTwinkle: { value: reduced ? 0 : 1 }, uAlpha: { value: 1 } },
    vertexShader: `
      attribute float aSize; varying vec3 vColor; varying float vTw;
      uniform float uTime, uTwinkle, uAlpha;
      void main() {
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vTw = uAlpha * (1.0 - uTwinkle * 0.3 * (0.5 + 0.5 * sin(uTime * 2.0 + position.x * 0.9 + position.y * 1.3 + position.z * 0.4)));
        gl_PointSize = clamp(aSize * vTw * (260.0 / -mv.z), 0.0, 40.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying vec3 vColor; varying float vTw;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float halo = smoothstep(0.5, 0.08, d);
        float core = smoothstep(0.16, 0.0, d);
        gl_FragColor = vec4(vColor * (0.55 + core * 0.9), halo * vTw);
      }`,
    vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const coreMat = pointsMat.clone(); // own uAlpha so the core can fade as the camera flies through it
  const mkPoints = (p, c, s, mat = pointsMat) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(s, 1));
    const m = new THREE.Points(g, mat); m.frustumCulled = false; scene.add(m); return m;
  };
  const mkLines = (p, c, opacity) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    const m = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.frustumCulled = false; scene.add(m); return m;
  };

  // ---------- background node field (denser near the start, thinner deep in) ----------
  const N = CFG.nodes;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = CFG.rHole + (CFG.rMax - CFG.rHole) * Math.sqrt(Math.random());
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = Math.sin(a) * r * 0.75;
    pos[i * 3 + 2] = Math.random() < 0.55 ? lerp(-300, CFG.zNear, Math.random()) : lerp(CFG.zFar, -300, Math.random());
    const c = pick(); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    size[i] = 1.2 + Math.random() * 2.2;
  }
  mkPoints(pos, col, size);
  // core cluster
  const NC = 320;
  const cpos = new Float32Array(NC * 3), ccol = new Float32Array(NC * 3), csize = new Float32Array(NC);
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 2;
  for (let i = 0; i < NC; i++) {
    cpos.set([CORE.x + gauss() * 5, CORE.y + gauss() * 5, CORE.z + gauss() * 5], i * 3);
    const c = Math.random() < 0.5 ? C_WHITE : C_CYAN; ccol.set([c.r, c.g, c.b], i * 3);
    csize[i] = 0.9 + Math.random() * 1.5;
  }
  mkPoints(cpos, ccol, csize, coreMat);

  // field links: grid hash, each node links to its nearest few
  const cell = CFG.linkDist, grid = new Map();
  const key = (x, y, z) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
  for (let i = 0; i < N; i++) { const k = key(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]); (grid.get(k) || grid.set(k, []).get(k)).push(i); }
  const seg = [], segCol = [], d2max = CFG.linkDist * CFG.linkDist;
  for (let i = 0; i < N; i++) {
    const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
    const cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell), near = [];
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const b = grid.get(`${cx + dx},${cy + dy},${cz + dz}`); if (!b) continue;
      for (const j of b) {
        if (j <= i) continue;
        const d2 = (pos[j * 3] - x) ** 2 + (pos[j * 3 + 1] - y) ** 2 + (pos[j * 3 + 2] - z) ** 2;
        if (d2 < d2max) near.push([d2, j]);
      }
    }
    near.sort((a, b) => a[0] - b[0]);
    for (const [, j] of near.slice(0, CFG.linksPerNode)) {
      seg.push(x, y, z, pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]);
      segCol.push(col[i * 3], col[i * 3 + 1], col[i * 3 + 2], col[j * 3], col[j * 3 + 1], col[j * 3 + 2]);
    }
  }
  const fieldLines = mkLines(new Float32Array(seg), new Float32Array(segCol), 0);

  // core glow sprite
  const gc = document.createElement('canvas'); gc.width = gc.height = 128;
  const g2 = gc.getContext('2d'), grd = g2.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(230,250,255,1)'); grd.addColorStop(0.25, 'rgba(79,227,255,0.55)'); grd.addColorStop(1, 'rgba(79,227,255,0)');
  g2.fillStyle = grd; g2.fillRect(0, 0, 128, 128);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gc), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.6 }));
  glow.position.copy(CORE); glow.scale.setScalar(30); scene.add(glow);

  // training loss curves (education chapter): glowing tubes, "train" orange / "val" violet,
  // a floor grid with one tick per epoch, and a spark running down the train curve
  const T = LAYERS.t, NL = 160, FLOOR = -15, CX = -7; // curve runs left of centre, cards on the right
  const mkCurve = (color, dy, wobble, radius, opacity) => {
    const pts = [];
    for (let i = 0; i < NL; i++) {
      const u = i / (NL - 1);
      pts.push(new THREE.Vector3(CX, curveY(u) + dy + wobble * Math.sin(u * 40) * (0.3 + u), lerp(T.z0 - 25, T.z1 + 25, u)));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, NL, radius, 6, false),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
    mesh.frustumCulled = false; scene.add(mesh);
    return curve;
  };
  const trainCurve = mkCurve(C_ORA, 0, 0.35, 0.2, 0.75);
  mkCurve(C_VIO, 1.6, 0.9, 0.12, 0.4);
  { // beads of light along the train curve so it reads from far away
    const NB = 70, bp = new Float32Array(NB * 3), bc = new Float32Array(NB * 3).map((_, i) => [C_ORA.r, C_ORA.g, C_ORA.b][i % 3]);
    for (let i = 0; i < NB; i++) trainCurve.getPoint((i + 0.5) / NB).toArray(bp, i * 3);
    mkPoints(bp, bc, new Float32Array(NB).fill(2.6));
  }
  { // floor grid: baseline, cross rungs every 40 units, a tick up to the curve at each epoch
    const g = [], gcol = [], nEp = $$('[data-layer="t"]').length;
    const push = (a, b) => { g.push(...a, ...b); gcol.push(C_CYAN.r, C_CYAN.g, C_CYAN.b, C_CYAN.r, C_CYAN.g, C_CYAN.b); };
    for (const x of [CX - 14, CX, CX + 14]) push([x, FLOOR, T.z0 - 25], [x, FLOOR, T.z1 + 25]);
    for (let z = T.z0 - 20; z >= T.z1 + 20; z -= 40) push([CX - 14, FLOOR, z], [CX + 14, FLOOR, z]);
    for (let i = 0; i < nEp; i++) { const u = (i + 0.5) / nEp, z = lerp(T.z0, T.z1, u); push([CX, FLOOR, z], [CX, curveY(u), z]); }
    mkLines(new Float32Array(g), new Float32Array(gcol), 0.28);
  }
  const spark = mkPoints(new Float32Array(3), new Float32Array([C_WHITE.r, C_WHITE.g, C_WHITE.b]), new Float32Array([8]));
  let sparkT = 0;

  // speed streaks: short lines along z around the camera, stretched by camera speed
  const NS = reduced ? 0 : 320, sPos = new Float32Array(NS * 6), sCol = new Float32Array(NS * 6);
  const streak = Array.from({ length: NS }, () => ({ x: 0, y: 0, z: 1e9 }));
  for (let i = 0; i < NS; i++) sCol.set([C_CYAN.r, C_CYAN.g, C_CYAN.b, 0, 0, 0], i * 6); // bright head, dark tail
  const streaks = mkLines(sPos, sCol, 0);
  const respawn = (s, camZ) => { const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 30; s.x = Math.cos(a) * r; s.y = Math.sin(a) * r * 0.7; s.z = camZ - 60 - Math.random() * 160; };

  // ---------- overlay anchors: one neuron per HTML element, edges between layers ----------
  // anchors[0] is the core itself (no element)
  const anchors = [{ el: null, layer: 'core', x: 0, y: 0, z: CORE.z, size: 0 }];
  for (const el of $$('[data-layer]')) anchors.push({ el, layer: el.dataset.layer, x: 0, y: 0, z: 0, size: LAYERS[el.dataset.layer].size, title: false });
  for (const el of $$('[data-title]')) anchors.push({ el, layer: el.dataset.title, x: 0, y: 0, z: 0, size: 0, title: true });
  const byLayer = {};
  anchors.forEach((a, i) => { if (!a.title) (byLayer[a.layer] ||= []).push(i); });

  const edges = []; // [ai, bi, pulses?]
  for (const [L, cfg] of Object.entries(LAYERS)) {
    const mine = byLayer[L] || [];
    if (cfg.link === 'chain') { for (let i = 1; i < mine.length; i++) edges.push([mine[i - 1], mine[i], false]); continue; }
    const from = byLayer[cfg.link] || [];
    for (const a of from) for (const b of mine) edges.push([a, b, L !== 'p']);
  }
  const NA = anchors.length;
  const apos = new Float32Array(NA * 3), acol = new Float32Array(NA * 3), asize = new Float32Array(NA);
  anchors.forEach((a, i) => { const c = new THREE.Color(LAYERS[a.layer]?.color || '#fff'); acol.set([c.r, c.g, c.b], i * 3); asize[i] = a.size; });
  const anchorPts = mkPoints(apos, acol, asize);
  const epos = new Float32Array(edges.length * 6), ecol = new Float32Array(edges.length * 6);
  edges.forEach(([a, b], i) => {
    const ca = a === 0 ? C_WHITE : new THREE.Color(LAYERS[anchors[a].layer].color), cb = new THREE.Color(LAYERS[anchors[b].layer].color);
    ecol.set([ca.r, ca.g, ca.b, cb.r, cb.g, cb.b], i * 6);
  });
  const edgeLines = mkLines(epos, ecol, 0.3);
  hud.nodes.textContent = String(N + NC + NA);

  // signal pulses travelling along network edges
  const pulseEdges = edges.map((e, i) => (e[2] ? i : -1)).filter((i) => i >= 0);
  const NPULSE = reduced ? 0 : 90;
  const pulses = Array.from({ length: NPULSE }, () => ({ e: pulseEdges[Math.floor(Math.random() * pulseEdges.length)], t: Math.random(), v: 0.25 + Math.random() * 0.35 }));
  const ppos = new Float32Array(NPULSE * 3), pcol = new Float32Array(NPULSE * 3).map((_, i) => [C_WHITE.r, C_WHITE.g, C_WHITE.b][i % 3]);
  const pulsePts = mkPoints(ppos, pcol, new Float32Array(NPULSE).fill(3.2));

  // place anchors for the current aspect ratio and refresh neuron/edge buffers
  const layout = (aspect) => {
    const kx = Math.min(1, aspect / 1.5), ky = aspect < 1 ? 1.5 : 1;
    for (const [L, cfg] of Object.entries(LAYERS)) {
      const items = (byLayer[L] || []).map((i) => anchors[i]), n = items.length;
      if (cfg.kind === 'ring') {
        const stack = aspect < 1.3 && n !== 4 && items[0]?.el.classList.contains('card'); // narrow views: big cards go in a column
        items.forEach((a, i) => {
          let ux, uy;
          if (stack) { ux = (i % 2 ? 1 : -1) * 0.5; uy = 0.75 - 1.85 * i / Math.max(1, n - 1); }
          else if (n === 4) { ux = i % 2 ? 1 : -1; uy = i < 2 ? 1 : -1; }          // 2×2 corners, reading order
          else if (n === 3) { [ux, uy] = [[-1, 0.4], [1, 0.4], [0, -1]][i]; }      // two up, one down; leaves room for the title
          else { const ang = -Math.PI / 2 + (i + 0.5) * Math.PI * 2 / n; ux = Math.cos(ang); uy = -Math.sin(ang); }
          a.x = ux * cfg.rx * kx; a.y = uy * cfg.ry * ky; a.z = cfg.z;
        });
        for (const a of anchors) if (a.title && a.layer === L) { a.x = 0; a.y = cfg.ry * ky + (stack ? 10 : 7); a.z = cfg.z; }
      } else {
        items.forEach((a, i) => {
          const u = (i + 0.5) / n;
          a.x = 9 * kx; a.y = curveY(u) + 1.5; a.z = lerp(cfg.z0, cfg.z1, u);
        });
        for (const a of anchors) if (a.title && a.layer === L) { a.x = 0; a.y = curveY(0) + 9; a.z = cfg.z0 - 10; }
      }
    }
    anchors.forEach((a, i) => apos.set([a.x, a.y, a.z], i * 3));
    edges.forEach(([a, b], i) => epos.set([anchors[a].x, anchors[a].y, anchors[a].z, anchors[b].x, anchors[b].y, anchors[b].z], i * 6));
    anchorPts.geometry.attributes.position.needsUpdate = true;
    edgeLines.geometry.attributes.position.needsUpdate = true;
  };

  // ponytail: no bloom post-processing. UnrealBloom lifted the whole background to grey-blue
  // at every setting tried; glow comes from additive geometry (halos, tubes, beads) instead.

  // ---------- scroll + render loop ----------
  const mouse = { x: 0, y: 0 }, sm = { x: 0, y: 0 };
  addEventListener('mousemove', (e) => { mouse.x = e.clientX / innerWidth - 0.5; mouse.y = e.clientY / innerHeight - 0.5; }, { passive: true });
  const resize = () => {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    layout(w / h);
  };
  addEventListener('resize', resize); resize();

  const camAt = (p) => {
    let i = 0; while (i < KEYS.length - 2 && p > KEYS[i + 1][0]) i++;
    const [p0, z0, y0] = KEYS[i], [p1, z1, y1] = KEYS[i + 1];
    const t = smooth((p - p0) / Math.max(1e-6, p1 - p0));
    return { z: lerp(z0, z1, t), y: lerp(y0, y1, t) };
  };

  const v = new THREE.Vector3(), clock = new THREE.Clock();
  let lastP = -1, lastZ = KEYS[0][1], fov = 60, elapsed = 0, spd = 0;
  const frame = () => {
    requestAnimationFrame(frame);
    const top = dive.offsetTop, h = dive.offsetHeight - innerHeight;
    const p = clamp((scrollY - top) / Math.max(1, h), 0, 1);
    if (scrollY > top + dive.offsetHeight) return; // intro scrolled away: idle
    const dt = Math.min(clock.getDelta(), 0.05); elapsed += dt;
    if (p !== lastP) {
      lastP = p; document.documentElement.style.setProperty('--p', p.toFixed(4));
      outro.classList.toggle('on', p > 0.95); // landing card becomes clickable once it is readable
    }

    // camera: keyframed z/y, mouse parallax, fov widens with speed
    const { z, y } = camAt(p);
    sm.x += (mouse.x - sm.x) * 0.05; sm.y += (mouse.y - sm.y) * 0.05;
    spd = lerp(spd, Math.abs(z - lastZ) / Math.max(dt, 1e-3), 0.12); lastZ = z; // smoothed camera speed
    const speed = spd;
    fov = lerp(fov, 60 + 16 * clamp(speed / 150, 0, 1), 0.1);
    camera.position.set(sm.x * 6, y - sm.y * 4, z);
    camera.lookAt(sm.x * 2, y - sm.y * 2, z - 60);
    camera.rotation.z += 0.06 * Math.sin(p * 9);
    camera.fov = fov; camera.updateProjectionMatrix();

    // ambient animation
    fieldLines.material.opacity = 0.2 * smooth(elapsed / 3);      // act 1: the network "forms" after load
    // core fades out as the camera gets within ~30 units, so flying through it never whites out
    const coreFade = smooth((z - CORE.z - 6) / 26);
    glow.material.opacity = (0.3 + 0.5 * smooth((p - 0.05) / 0.15)) * coreFade;
    coreMat.uniforms.uAlpha.value = coreFade;
    pointsMat.uniforms.uTime.value += dt; coreMat.uniforms.uTime.value += dt;
    for (let i = 0; i < NPULSE; i++) {
      const q = pulses[i]; q.t += q.v * dt;
      if (q.t >= 1) { q.t -= 1; q.e = pulseEdges[Math.floor(Math.random() * pulseEdges.length)]; }
      const [a, b] = edges[q.e], A = anchors[a], B = anchors[b];
      ppos.set([lerp(A.x, B.x, q.t), lerp(A.y, B.y, q.t), lerp(A.z, B.z, q.t)], i * 3);
    }
    if (NPULSE) pulsePts.geometry.attributes.position.needsUpdate = true;
    sparkT = (sparkT + dt * 0.22) % 1;
    trainCurve.getPoint(sparkT).toArray(spark.geometry.attributes.position.array, 0);
    spark.geometry.attributes.position.needsUpdate = true;

    // speed streaks: respawn ahead once passed, stretch with speed, fade in with speed
    const len = clamp(speed * 0.05, 0, 14), sAlpha = clamp((speed - 20) / 120, 0, 0.7);
    streaks.material.opacity = sAlpha;
    if (sAlpha > 0) {
      for (let i = 0; i < NS; i++) {
        const s = streak[i];
        if (s.z > z + 4 || s.z < z - 260) respawn(s, z);
        sPos.set([s.x, s.y, s.z, s.x, s.y, s.z - len], i * 6);
      }
      streaks.geometry.attributes.position.needsUpdate = true;
    }

    // HUD
    hud.depth.textContent = p.toFixed(2);
    const phase = PHASES.find(([end]) => p < end)[1];
    if (hud.phase.textContent !== phase) hud.phase.textContent = phase;
    const u = (T.z0 - z) / (T.z0 - T.z1);
    hud.loss.textContent = u > -0.2 && u < 1.3 ? (0.92 * Math.exp(-2.6 * clamp(u, 0, 1)) + 0.07).toFixed(3) : '—';

    // overlays: show each element while its anchor is 10–85 units ahead of the camera
    for (const a of anchors) {
      if (!a.el) continue;
      const d = z - a.z, vis = smooth((d - 10) / 8) * (1 - smooth((d - 60) / 25));
      if (vis < 0.02) { if (a.on) { a.on = false; a.el.classList.remove('on'); } continue; }
      v.set(a.x, a.y, a.z).project(camera);
      const hw = a.el.offsetWidth / 2 + 8, hh = a.el.offsetHeight / 2 + 8;
      const x = clamp((v.x + 1) / 2 * innerWidth, hw, innerWidth - hw), yy = clamp((1 - v.y) / 2 * innerHeight, hh + 64, innerHeight - hh);
      a.el.style.transform = `translate(-50%,-50%) translate(${x.toFixed(1)}px,${yy.toFixed(1)}px)`;
      a.el.style.opacity = vis.toFixed(2);
      if (!a.on) { a.on = true; a.el.classList.add('on'); }
    }

    renderer.render(scene, camera);
  };
  frame();
}

// ---------- backward pass spine: light the node of the section in view ----------
{
  const secs = $$('.portfolio section');
  // active = last section whose top is above the 45% line; at the very bottom it is always the last one,
  // which could otherwise never reach that line
  const pick = () => {
    const line = scrollY + innerHeight * 0.45;
    const atBottom = scrollY + innerHeight >= document.documentElement.scrollHeight - 4;
    let cur = null;
    for (const s of secs) if (s.getBoundingClientRect().top + scrollY <= line) cur = s;
    if (atBottom) cur = secs[secs.length - 1];
    for (const s of secs) s.classList.toggle('active', s === cur);
  };
  addEventListener('scroll', pick, { passive: true }); addEventListener('resize', pick); pick();
  // falling gradient dots: a handful, each on its own period and delay
  const spine = $('.spine');
  const sizeSpine = () => spine && spine.style.setProperty('--spine-h', spine.offsetHeight + 'px'); // dots fall the full height
  sizeSpine(); addEventListener('resize', sizeSpine); addEventListener('load', sizeSpine);
  if (spine && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    for (let i = 0; i < 14; i++) {
      const d = document.createElement('i');
      d.className = 'spine-dot';
      d.style.setProperty('--dur', (7 + Math.random() * 6).toFixed(2) + 's');
      d.style.setProperty('--delay', (-Math.random() * 13).toFixed(2) + 's');
      d.style.setProperty('--size', (2 + Math.random() * 3).toFixed(1) + 'px');
      spine.appendChild(d);
    }
  }
}

// "Skip intro" lands on the name card at the end of the flight (p = 1), not past it
$('[data-skip]').addEventListener('click', (e) => {
  e.preventDefault();
  scrollTo({ top: dive.offsetTop + dive.offsetHeight - innerHeight, behavior: 'smooth' });
});
