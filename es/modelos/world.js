import * as THREE from '../../vendor/three.module.js';
import {contextMemory, attentionMask} from './model.js';

export function createModelsWorld(host) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x100d08);
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x100d08, 0.045);
  scene.add(new THREE.HemisphereLight(0xfff1d2, 0x1a120c, 0.9));
  const key = new THREE.DirectionalLight(0xfff6e8, 1.2);
  key.position.set(-4, 8, 6);
  scene.add(key);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(9, 48),
    new THREE.MeshStandardMaterial({ color: 0x221c16, roughness: 0.9 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  function bar(color, x) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1, 0.7),
      new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.08, emissive: color, emissiveIntensity: 0.08 })
    );
    mesh.position.set(x, 0.5, 0);
    scene.add(mesh);
    return mesh;
  }
  const mha = bar(0xc4b6a2, -2.2);
  const mla = bar(0xf3d39a, 0);
  const ssm = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 24, 16),
    new THREE.MeshStandardMaterial({ color: 0x9fd7c8, emissive: 0x1d4a40, emissiveIntensity: 0.4, roughness: 0.4 })
  );
  ssm.position.set(2.2, 0.55, 0);
  scene.add(ssm);

  const tokenGeo = new THREE.SphereGeometry(0.13, 16, 12);
  const tokens = Array.from({ length: 8 }, (_, i) => {
    const mesh = new THREE.Mesh(tokenGeo, new THREE.MeshStandardMaterial({ color: 0x4a4036, roughness: 0.4 }));
    mesh.position.set(-1.6 + i * 0.46, 0.2, 2.3);
    scene.add(mesh);
    return mesh;
  });
  const experts = Array.from({ length: 8 }, (_, i) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.28, 0.28),
      new THREE.MeshStandardMaterial({ color: 0x3a332c, roughness: 0.5 })
    );
    mesh.position.set(-1.3 + (i % 4) * 0.46, 0.25 + Math.floor(i / 4) * 0.46, -2.1);
    scene.add(mesh);
    return mesh;
  });
  const linkPos = new Float32Array(8 * 8 * 2 * 3);
  const linkGeo = new THREE.BufferGeometry();
  linkGeo.setAttribute('position', new THREE.BufferAttribute(linkPos, 3));
  linkGeo.setDrawRange(0, 0);
  const links = new THREE.LineSegments(linkGeo, new THREE.LineBasicMaterial({ color: 0xf3d39a, transparent: true, opacity: 0.8 }));
  scene.add(links);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
  let theta = 0.5, phi = 0.42, dist = 9, dragging = false, lx = 0, ly = 0, userZoom = false, pinch = 0;
  const look = new THREE.Vector3(0, 1.1, 0);
  function place() {
    phi = Math.min(1.15, Math.max(0.15, phi));
    dist = Math.min(18, Math.max(4.5, dist));
    const cp = Math.cos(phi);
    camera.position.set(look.x + dist * Math.sin(theta) * cp, look.y + dist * Math.sin(phi), look.z + dist * Math.cos(theta) * cp);
    camera.lookAt(look);
  }
  function resize() {
    const w = host.clientWidth, h = Math.max(1, host.clientHeight);
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    place();
  }
  new ResizeObserver(resize).observe(host);
  resize();
  host.addEventListener('pointerdown', e => { if (e.target !== renderer.domElement) return; dragging = true; lx = e.clientX; ly = e.clientY; host.setPointerCapture(e.pointerId); });
  host.addEventListener('pointerup', () => { dragging = false; });
  host.addEventListener('pointermove', e => { if (!dragging) return; theta -= (e.clientX - lx) * 0.005; phi += (e.clientY - ly) * 0.004; lx = e.clientX; ly = e.clientY; place(); });
  host.addEventListener('wheel', e => { e.preventDefault(); userZoom = true; dist *= e.deltaY > 0 ? 1.06 : 0.94; place(); }, { passive: false });
  host.addEventListener('touchstart', e => { if (e.touches.length === 2) pinch = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); }, { passive: true });
  host.addEventListener('touchmove', e => { if (e.touches.length !== 2) return; const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); if (pinch) { userZoom = true; dist *= pinch / d; place(); } pinch = d; }, { passive: true });
  host.tabIndex = 0;
  renderer.domElement.addEventListener('webglcontextlost', e => e.preventDefault());

  function render(state) {
    const mem = contextMemory(state.tokens);
    const mhaH = 3.4;
    const mlaH = Math.max(0.08, mhaH * mem.mla / mem.mha);
    mha.scale.y = mhaH;
    mha.position.y = mhaH / 2;
    mla.scale.y = mlaH;
    mla.position.y = mlaH / 2;
    ssm.position.y = 0.55;
    const showMask = state.family === 'causal' || state.family === 'encoder' || state.family === 'encdec';
    const weights = state.family === 'encoder' || state.family === 'encdec'
      ? attentionMask('bidirectional', 0, 8)
      : attentionMask('causal', 0, 8);
    let vertex = 0;
    tokens.forEach((mesh, i) => {
      mesh.visible = showMask || state.family === 'diffusion' || state.family === 'cache' || state.family === 'jev' || state.family === 'jepa';
      const hot = showMask ? weights[i] > 0 : state.family === 'cache' ? i < 5 : state.family === 'jev' ? i === 0 : state.family === 'jepa' ? i < 2 : true;
      mesh.material.color.set(hot ? 0xf3d39a : 0x3a332c);
      mesh.material.emissive.set(hot ? 0x6a4a20 : 0x000000);
      if (showMask && i > 0 && weights[i] > 0) {
        const a = tokens[0].position, b = mesh.position, o = vertex * 3;
        linkPos[o] = a.x; linkPos[o + 1] = a.y; linkPos[o + 2] = a.z;
        linkPos[o + 3] = b.x; linkPos[o + 4] = b.y; linkPos[o + 5] = b.z;
        vertex += 2;
      }
    });
    links.visible = showMask;
    linkGeo.setDrawRange(0, vertex);
    linkGeo.attributes.position.needsUpdate = true;
    experts.forEach((mesh, i) => {
      mesh.visible = state.family === 'moe';
      const lit = i < 2;
      mesh.material.color.set(lit ? 0xf3d39a : 0x3a332c);
      mesh.material.emissive.set(lit ? 0x8a5a18 : 0x000000);
    });
    mha.visible = state.family === 'cache' || state.family === 'ssm';
    mla.visible = mha.visible;
    ssm.visible = state.family === 'ssm' || state.family === 'cache';
    place();
    renderer.render(scene, camera);
  }
  return {
    render,
    zoomBy(f) { userZoom = true; dist /= f; place(); },
    fit() { userZoom = false; theta = 0.5; phi = 0.42; dist = 9; place(); }
  };
}
