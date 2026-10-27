// Data-universe dive: node field + links rendered with three.js (WebGL),
// camera driven by scroll progress p in [0,1] through the pinned section.
import * as THREE from 'three';

const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const dive = $('[data-dive]');
const canvas = $('[data-canvas]');
const cards = [...document.querySelectorAll('[data-card]')];
const hud = { depth: $('[data-depth]'), nodes: $('[data-nodes]'), vel: $('[data-vel]') };

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = matchMedia('(max-width: 720px)').matches;

// ---------- tunables ----------
const CFG = {
  nodes: reduced || small ? 1800 : 4200,
  zNear: 60, zFar: -270,            // field extent along the travel axis
  rHole: 7, rMax: 42,               // hollow corridor so the camera never hits a node
  linkDist: 13, linksPerNode: 2,
  core: new THREE.Vector3(0, 0, -245),
  camStart: 45, camEnd: -193,       // camera z at p=0 and at arrival (52 units from the core)
  arriveAt: 0.78,                   // p where the camera stops; cards take over after
  projectZ: -228, projectX: 17, projectY: 9, // base spread; squeezed per aspect in layoutProjects()
  projectPts: [],
};

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

  // palette: mostly cyan, some violet, a few orange
  const C_CYAN = new THREE.Color('#4fe3ff'), C_VIO = new THREE.Color('#8b5cf6'), C_ORA = new THREE.Color('#ffb45c'), C_WHITE = new THREE.Color('#dff7ff');
  const pick = () => { const r = Math.random(); return r < 0.74 ? C_CYAN : r < 0.92 ? C_VIO : C_ORA; };

  // ---------- node field ----------
  const N = CFG.nodes;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = CFG.rHole + (CFG.rMax - CFG.rHole) * Math.sqrt(Math.random());
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = Math.sin(a) * r * 0.75;
    pos[i * 3 + 2] = lerp(CFG.zFar, CFG.zNear, Math.random());
    const c = pick(); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    size[i] = 1.2 + Math.random() * 2.2;
  }
  // core cluster: dense gaussian ball at the end of the tunnel
  const NC = 320;
  const cpos = new Float32Array(NC * 3), ccol = new Float32Array(NC * 3), csize = new Float32Array(NC);
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 2;
  for (let i = 0; i < NC; i++) {
    cpos[i * 3] = CFG.core.x + gauss() * 5;
    cpos[i * 3 + 1] = CFG.core.y + gauss() * 5;
    cpos[i * 3 + 2] = CFG.core.z + gauss() * 5;
    const c = Math.random() < 0.5 ? C_WHITE : C_CYAN; ccol[i * 3] = c.r; ccol[i * 3 + 1] = c.g; ccol[i * 3 + 2] = c.b;
    csize[i] = 0.9 + Math.random() * 1.5;
  }

  const pointsMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uTwinkle: { value: reduced ? 0 : 1 } },
    vertexShader: `
      attribute float aSize; varying vec3 vColor; varying float vTw;
      uniform float uTime, uTwinkle;
      void main() {
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vTw = 1.0 - uTwinkle * 0.3 * (0.5 + 0.5 * sin(uTime * 2.0 + position.x * 0.9 + position.y * 1.3 + position.z * 0.4));
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
  const mkPoints = (p, c, s) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(s, 1));
    const m = new THREE.Points(g, pointsMat); m.frustumCulled = false; scene.add(m); return m;
  };
  mkPoints(pos, col, size);
  mkPoints(cpos, ccol, csize);

  // ---------- links: grid hash, each node links to its nearest few ----------
  const cell = CFG.linkDist, grid = new Map();
  const key = (x, y, z) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
  for (let i = 0; i < N; i++) { const k = key(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]); (grid.get(k) || grid.set(k, []).get(k)).push(i); }
  const seg = [], segCol = [];
  const d2max = CFG.linkDist * CFG.linkDist;
  for (let i = 0; i < N; i++) {
    const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
    const cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell);
    const near = [];
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
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
  lg.setAttribute('color', new THREE.Float32BufferAttribute(segCol, 3));
  const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
  lines.frustumCulled = false; scene.add(lines);
  hud.nodes.textContent = String(N + NC);

  // project nodes: big orange points + bright spokes from the core. Positions depend on
  // the viewport aspect so they stay inside the 60° frustum seen from camEnd.
  const NP = cards.length;
  const pp = new Float32Array(NP * 3), pc = new Float32Array(NP * 3).map((_, i) => [C_ORA.r, C_ORA.g, C_ORA.b][i % 3]);
  const projMesh = mkPoints(pp, pc, new Float32Array(NP).fill(9));
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NP * 6), 3));
  sg.setAttribute('color', new THREE.Float32BufferAttribute(Array.from({ length: NP }, () => [C_WHITE.r, C_WHITE.g, C_WHITE.b, C_ORA.r, C_ORA.g, C_ORA.b]).flat(), 3));
  const spokes = new THREE.LineSegments(sg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
  spokes.frustumCulled = false; scene.add(spokes);
  const layoutProjects = (aspect) => {
    const sx = CFG.projectX * Math.min(1, aspect / 1.5), sy = CFG.projectY * (aspect < 1 ? 1.6 : 1);
    CFG.projectPts = [[-sx, sy], [sx, sy], [-sx, -sy], [sx, -sy]].map(([x, y]) => [x, y, CFG.projectZ]);
    CFG.projectPts.forEach((p, i) => { pp.set(p, i * 3); sg.attributes.position.array.set([CFG.core.x, CFG.core.y, CFG.core.z, ...p], i * 6); });
    projMesh.geometry.attributes.position.needsUpdate = true;
    sg.attributes.position.needsUpdate = true;
  };

  // core glow sprite
  const gc = document.createElement('canvas'); gc.width = gc.height = 128;
  const g2 = gc.getContext('2d'), grd = g2.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(230,250,255,1)'); grd.addColorStop(0.25, 'rgba(79,227,255,0.55)'); grd.addColorStop(1, 'rgba(79,227,255,0)');
  g2.fillStyle = grd; g2.fillRect(0, 0, 128, 128);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gc), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.6 }));
  glow.position.copy(CFG.core); glow.scale.setScalar(30); scene.add(glow);

  // ---------- scroll + render loop ----------
  const mouse = { x: 0, y: 0 }, sm = { x: 0, y: 0 };
  addEventListener('mousemove', (e) => { mouse.x = e.clientX / innerWidth - 0.5; mouse.y = e.clientY / innerHeight - 0.5; }, { passive: true });

  const resize = () => {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    layoutProjects(w / h);
  };
  addEventListener('resize', resize); resize();

  const v = new THREE.Vector3();
  const clock = new THREE.Clock();
  let lastP = -1, lastZ = CFG.camStart;
  const frame = () => {
    requestAnimationFrame(frame);
    const top = dive.offsetTop, h = dive.offsetHeight - innerHeight;
    const p = clamp((scrollY - top) / Math.max(1, h), 0, 1);
    if (scrollY > top + dive.offsetHeight) return; // intro scrolled away: idle
    const dt = Math.min(clock.getDelta(), 0.05);

    if (p !== lastP) { lastP = p; document.documentElement.style.setProperty('--p', p.toFixed(4)); }
    const t = easeInOut(clamp(p / CFG.arriveAt, 0, 1));
    sm.x += (mouse.x - sm.x) * 0.05; sm.y += (mouse.y - sm.y) * 0.05;
    const z = lerp(CFG.camStart, CFG.camEnd, t);
    camera.position.set(sm.x * 6, -sm.y * 4, z);
    camera.lookAt(CFG.core.x + sm.x * 2, CFG.core.y - sm.y * 2, CFG.core.z);
    camera.fov = 60 + 18 * Math.sin(t * Math.PI); // widen mid-flight for a speed feel
    camera.rotation.z += 0.22 * t;
    camera.updateProjectionMatrix();
    glow.material.opacity = 0.3 + 0.45 * t;
    lines.material.opacity = 0.18 + 0.25 * t;
    pointsMat.uniforms.uTime.value += dt;

    // HUD readouts
    const vel = Math.abs(z - lastZ) / Math.max(dt, 1e-3); lastZ = z;
    hud.depth.textContent = t.toFixed(2);
    hud.vel.textContent = Math.min(9.99, vel / 100).toFixed(2);

    // cards: tethered to their 3D node, shown once the camera has arrived
    const show = p >= CFG.arriveAt - 0.04;
    cards.forEach((el, i) => {
      v.set(...CFG.projectPts[i]).project(camera);
      // keep the whole card on screen; on phones the node sits near the edge
      const hw = el.offsetWidth / 2 + 8, hh = el.offsetHeight / 2 + 8;
      const x = clamp((v.x + 1) / 2 * innerWidth, hw, innerWidth - hw), y = clamp((1 - v.y) / 2 * innerHeight, hh + 48, innerHeight - hh);
      el.style.transform = `translate(-50%,-50%) translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
      el.classList.toggle('on', show && v.z < 1);
    });

    renderer.render(scene, camera);
  };
  frame();
}

// "Skip intro" should land below the pinned section even with smooth scroll
$('[data-skip]').addEventListener('click', (e) => {
  e.preventDefault();
  scrollTo({ top: dive.offsetTop + dive.offsetHeight, behavior: 'smooth' });
});
