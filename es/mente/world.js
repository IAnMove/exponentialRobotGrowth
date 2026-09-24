import * as THREE from '../../vendor/three.module.js';
import {GROK1, VISUAL, TOKEN_INTERVAL, snapshot} from './model.js';
import {createPost, adaptiveScale, pointScaleFor, pointMaterial} from '../fx/fx.js';

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function inBall(rng) {
  const u = rng(), v = rng(), th = 2 * Math.PI * u, ph = Math.acos(2 * v - 1), r = Math.cbrt(rng());
  return [r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)];
}

export function createMindWorld(host) {
  const renderer = new THREE.WebGLRenderer({antialias: false, powerPreference: 'high-performance'});
  let dpr = Math.min(devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(dpr);
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05040a);
  scene.fog = new THREE.FogExp2(0x05040a, 0.022);
  const pointScale = {value: 400};
  scene.add(new THREE.HemisphereLight(0xc9d4ff, 0x1a1020, 0.55));
  const key = new THREE.DirectionalLight(0xfff1e4, 1.15);
  key.position.set(4, 8, 6);
  scene.add(key);

  const rng = mulberry32(20260321);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  function cloud(count, center, spread, seedShift) {
    const local = mulberry32(seedShift);
    const mesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1, 10, 8),
      new THREE.MeshStandardMaterial({color: 0xffffff, roughness: 0.62, metalness: 0.04}),
      count
    );
    const points = [];
    for (let i = 0; i < count; i++) {
      const p = inBall(local);
      const x = center[0] + p[0] * spread[0], y = center[1] + p[1] * spread[1], z = center[2] + p[2] * spread[2];
      const s = 0.055 + rng() * 0.04;
      dummy.position.set(x, y, z);
      dummy.scale.setScalar(s);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      points.push(new THREE.Vector3(x, y, z));
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    scene.add(mesh);
    return {mesh, points};
  }
  const cerebellum = cloud(VISUAL.cerebellar, [-6.15, 0.05, 0], [2.7, 1.45, 2.15], 11);
  const cortex = cloud(VISUAL.cortical, [-5.7, 2.85, 0.15], [1.15, 1.7, 1.15], 29);
  // Spikes: every neuron has a glow sprite whose brightness decays after it fires.
  function spikes(group, color, size) {
    const n = group.points.length, geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3);
    group.points.forEach((p, i) => pos.set([p.x, p.y, p.z], i * 3));
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(n).fill(size), 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(n), 1));
    const pts = new THREE.Points(geo, pointMaterial(pointScale, color, 2.8));
    pts.frustumCulled = false; scene.add(pts);
    return {pts, level: new Float32Array(n), alpha: geo.attributes.aAlpha};
  }
  const cerebellumSpikes = spikes(cerebellum, 0xffa070, .42), cortexSpikes = spikes(cortex, 0xbcd8ff, .5);
  // Cortical neighbours, used to propagate activity as travelling waves.
  const neighbours = cortex.points.map((p, i) => cortex.points.map((q, j) => j).filter(j => j !== i && p.distanceTo(cortex.points[j]) < 0.75).slice(0, 5));

  const linkPos = [];
  cortex.points.forEach((p, i) => {
    for (let j = i + 1; j < cortex.points.length && linkPos.length < 80 * 6; j++) {
      if (p.distanceTo(cortex.points[j]) < 0.72) linkPos.push(p.x, p.y, p.z, cortex.points[j].x, cortex.points[j].y, cortex.points[j].z);
    }
  });
  scene.add(new THREE.LineSegments(
    new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(linkPos, 3)),
    new THREE.LineBasicMaterial({color: new THREE.Color(0x8eb6de).multiplyScalar(1.3), transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false})
  ));

  const dim = {cerebellum: new THREE.Color(0x6a4038), cortex: new THREE.Color(0x314864)};
  const hot = {cerebellum: new THREE.Color(0xffb089), cortex: new THREE.Color(0xd5e8ff)};
  // About one neuron in twelve is active at a time, as before; activity now arrives in spikes that fade.
  function tintCloud(group, name, clock, motion, sp, dt = 0, links = null) {
    const fraction = 12, n = group.points.length;
    for (let i = 0; i < n; i++) {
      const on = motion ? Math.floor(clock * 2.4 + i * 0.37) % fraction === 0 : i % fraction === 0;
      if (on && sp.level[i] < .5) { sp.level[i] = 1; if (links && motion) for (const j of links[i]) sp.level[j] = Math.max(sp.level[j], .55); }
      sp.level[i] = motion ? Math.max(0, sp.level[i] - dt * 2.2) : (on ? 1 : 0);
      sp.alpha.setX(i, sp.level[i]);
      group.mesh.setColorAt(i, color.copy(dim[name]).lerp(hot[name], sp.level[i]));
    }
    sp.alpha.needsUpdate = true;
    group.mesh.instanceColor.needsUpdate = true;
  }

  const layers = [];
  for (let i = 0; i < VISUAL.layers; i++) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(3.15, 0.16, 1.35),
      new THREE.MeshStandardMaterial({color: 0x7f93b8, emissive: 0x243044, roughness: 0.18, metalness: 0.5, transparent: true, opacity: 0.85})
    );
    mesh.position.set(5.55, -1.15 + i * 0.48, 0);
    scene.add(mesh);
    layers.push(mesh);
  }
  const experts = [];
  for (let i = 0; i < VISUAL.experts; i++) {
    const lit = i < VISUAL.activeExperts;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.34, 0.34),
      new THREE.MeshStandardMaterial({
        color: lit ? 0xf0b4c4 : 0x3a4254,
        emissive: lit ? 0x7a3148 : 0x000000,
        emissiveIntensity: lit ? 1.6 : 0,
        roughness: 0.4
      })
    );
    mesh.position.set(8.05, -1.05 + i * 0.46, 0.9);
    scene.add(mesh);
    experts.push(mesh);
  }

  const tokenGeo = new THREE.SphereGeometry(0.13, 16, 12);
  const tokens = [];
  const tokenAt = [];
  for (let i = 0; i < VISUAL.tokens; i++) {
    const mesh = new THREE.Mesh(tokenGeo, new THREE.MeshStandardMaterial({color: 0x2c3344, emissive: 0x000000, roughness: 0.45}));
    mesh.position.set(5.55, -2.15, (i - (VISUAL.tokens - 1) / 2) * 0.42);
    scene.add(mesh);
    tokens.push(mesh);
    tokenAt.push(mesh.position.clone());
  }
  const attnMax = VISUAL.tokens * 2;
  const attnPos = new Float32Array(attnMax * 3);
  const attnGeo = new THREE.BufferGeometry();
  attnGeo.setAttribute('position', new THREE.BufferAttribute(attnPos, 3));
  attnGeo.setDrawRange(0, 0);
  const attn = new THREE.LineSegments(attnGeo, new THREE.LineBasicMaterial({color: new THREE.Color(0xf0b4c4).multiplyScalar(1.8), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false}));
  // A glowing activation climbs the layer stack while a token is computed.
  const climber = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3)).setAttribute('aSize', new THREE.Float32BufferAttribute([.9], 1)).setAttribute('aAlpha', new THREE.Float32BufferAttribute([1], 1)), pointMaterial(pointScale, 0xffc0d2, 3));
  climber.frustumCulled = false; scene.add(climber);
  scene.add(attn);

  const track = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.05, 0.12), new THREE.MeshBasicMaterial({color: 0x3a3344}));
  track.position.set(5.55, -2.62, 0);
  scene.add(track);
  const fill = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.09, 0.16), new THREE.MeshBasicMaterial({color: 0xf0b4c4}));
  fill.position.set(5.55, -2.62, 0);
  scene.add(fill);
  const quiet = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.045, 10, 22), new THREE.MeshBasicMaterial({color: 0xf0b4c4}));
  quiet.position.set(7.35, 2.85, 0);
  scene.add(quiet);
  const grad = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(6.85, 2.35, 0.85), new THREE.Vector3(6.85, -1.2, 0.85)]),
    new THREE.LineBasicMaterial({color: 0xff9a4a})
  );
  scene.add(grad);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
  const post = createPost(renderer, scene, camera, {strength: .85, radius: .6, threshold: .95});
  scene.environmentIntensity = .25;
  const quality = adaptiveScale(dpr, {min: .7, apply(s) { dpr = s; renderer.setPixelRatio(dpr); resize(); }});
  let theta = 0.52, phi = 0.34, dist = 22, dragging = false, lastX = 0, lastY = 0, userZoom = false, pinch = 0, clock = 0;
  const look = new THREE.Vector3(0, 0.45, 0), want = new THREE.Vector3(0, 0.45, 0);
  let wantDist = 22, currentFocus = 'memory';
  const frames = {
    units: {p: [0, 0.7, 0], d: 23},
    memory: {p: [0.4, 0.15, 0], d: 20},
    learn: {p: [6.1, 0.35, 0], d: 12.5},
    energy: {p: [-6, 0.9, 0], d: 12.5}
  };
  function place() {
    phi = Math.min(1.15, Math.max(-0.95, phi));
    dist = Math.min(64, Math.max(6, dist));
    const cp = Math.cos(phi);
    camera.position.set(look.x + dist * Math.sin(theta) * cp, look.y + dist * Math.sin(phi), look.z + dist * Math.cos(theta) * cp);
    camera.lookAt(look);
  }
  function resize() {
    const w = host.clientWidth, h = Math.max(1, host.clientHeight);
    renderer.setSize(w, h);
    post.setSize(w, h, dpr);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    pointScale.value = pointScaleFor(h, dpr, camera.fov);
    place();
  }
  new ResizeObserver(resize).observe(host);
  resize();
  host.addEventListener('pointerdown', e => { if (e.target !== renderer.domElement) return; dragging = true; lastX = e.clientX; lastY = e.clientY; host.setPointerCapture(e.pointerId); });
  host.addEventListener('pointerup', () => { dragging = false; });
  host.addEventListener('pointermove', e => { if (!dragging) return; theta -= (e.clientX - lastX) * 0.005; phi += (e.clientY - lastY) * 0.0045; lastX = e.clientX; lastY = e.clientY; place(); });
  host.addEventListener('wheel', e => { e.preventDefault(); userZoom = true; dist *= e.deltaY > 0 ? 1.07 : 0.93; place(); }, {passive: false});
  host.addEventListener('touchstart', e => { if (e.touches.length === 2) pinch = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); }, {passive: true});
  host.addEventListener('touchmove', e => { if (e.touches.length !== 2) return; const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); if (pinch) { userZoom = true; dist *= pinch / d; place(); } pinch = d; }, {passive: true});
  host.addEventListener('keydown', e => {
    const step = 0.12;
    if (e.key === 'ArrowLeft') theta -= step;
    else if (e.key === 'ArrowRight') theta += step;
    else if (e.key === 'ArrowUp') phi -= step;
    else if (e.key === 'ArrowDown') phi += step;
    else if (e.key === '+' || e.key === '=') { userZoom = true; dist /= 1.12; }
    else if (e.key === '-') { userZoom = true; dist *= 1.12; }
    else return;
    e.preventDefault();
    place();
  });
  host.tabIndex = 0;
  renderer.domElement.addEventListener('webglcontextlost', e => e.preventDefault());

  function render(state, dt) {
    const view = snapshot(state);
    const motion = !matchMedia('(prefers-reduced-motion: reduce)').matches && Number.isFinite(dt) && dt > 0;
    if (motion) clock += dt;
    currentFocus = frames[state.focus] ? state.focus : 'memory';
    const frame = frames[currentFocus];
    want.set(frame.p[0], frame.p[1], frame.p[2]);
    wantDist = frame.d;
    if (!dragging) {
      look.lerp(want, motion ? 0.08 : 1);
      if (!userZoom) dist += (wantDist - dist) * (motion ? 0.08 : 1);
    }
    const step = motion ? dt : 0;
    tintCloud(cerebellum, 'cerebellum', clock, motion, cerebellumSpikes, step);
    tintCloud(cortex, 'cortex', clock, motion, cortexSpikes, step, neighbours);
    const sweep = state.playing ? Math.min(VISUAL.layers - 1, Math.floor(state.time / TOKEN_INTERVAL * VISUAL.layers)) : -1;
    layers.forEach((mesh, i) => {
      const on = sweep === i;
      mesh.material.emissive.set(on ? 0xf0b4c4 : 0x243044);
      mesh.material.emissiveIntensity = on ? 0.9 : 0.25;
    });
    const rise = state.playing ? (state.time / TOKEN_INTERVAL) % 1 : 0;
    climber.visible = state.playing;
    climber.position.set(5.55, -1.15 + rise * (VISUAL.layers - 1) * 0.48, 0.75);
    tokens.forEach((mesh, i) => {
      const on = i < view.generated;
      const active = view.generated > 0 && i === view.generated - 1;
      mesh.material.color.set(on ? 0xf0b4c4 : 0x2c3344);
      mesh.material.emissive.set(active ? 0xffe1ea : on ? 0x5a3040 : 0x000000);
      mesh.material.emissiveIntensity = active ? 2.2 : 1;
    });
    let vertex = 0;
    if (view.generated > 1) {
      const head = tokenAt[view.generated - 1];
      for (let i = 0; i < view.generated - 1; i++) {
        const tail = tokenAt[i];
        const o = vertex * 3;
        attnPos[o] = head.x; attnPos[o + 1] = head.y; attnPos[o + 2] = head.z;
        attnPos[o + 3] = tail.x; attnPos[o + 4] = tail.y; attnPos[o + 5] = tail.z;
        vertex += 2;
      }
    }
    attnGeo.setDrawRange(0, vertex);
    attnGeo.attributes.position.needsUpdate = true;
    const fraction = view.kept / GROK1.context;
    const width = 3.4 * fraction;
    fill.visible = fraction > 0;
    fill.scale.x = Math.max(fraction, 1e-4);
    fill.position.x = 5.55 - 1.7 + width / 2;
    fill.material.color.set(view.dropped > 0 ? 0xff5d5d : 0xf0b4c4);
    quiet.visible = view.mode !== 'learn';
    grad.visible = view.mode === 'learn';
    place();
    post.render(step);
    quality.frame(dt || 0);
  }
  return {
    render,
    zoomBy(f) { userZoom = true; dist /= f; place(); },
    fit() { userZoom = false; theta = 0.52; phi = 0.34; const frame = frames[currentFocus]; want.set(frame.p[0], frame.p[1], frame.p[2]); wantDist = frame.d; look.copy(want); dist = wantDist; place(); }
  };
}
