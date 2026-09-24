import * as THREE from '../../vendor/three.module.js';
import {EYE, WALL_H, walls, exhibits, standAt} from './model.js';
import {createPost, adaptiveScale, pointScaleFor, pointMaterial} from '../fx/fx.js';

const UP = new THREE.Vector3(0, 1, 0);

function labelTexture(exhibit, spanish) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 288;
  const g = canvas.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 512, 288);
  bg.addColorStop(0, '#1d1812');
  bg.addColorStop(1, '#0c0a07');
  g.fillStyle = bg;
  g.fillRect(0, 0, 512, 288);
  const glow = g.createRadialGradient(420, 60, 0, 420, 60, 260);
  glow.addColorStop(0, exhibit.color + '55');
  glow.addColorStop(1, exhibit.color + '00');
  g.fillStyle = glow;
  g.fillRect(0, 0, 512, 288);
  g.fillStyle = exhibit.color;
  g.fillRect(0, 0, 512, 8);
  g.font = '600 22px sans-serif';
  g.fillText(exhibit.num, 28, 48);
  g.font = '600 42px sans-serif';
  g.fillStyle = '#f6efe4';
  const title = spanish ? exhibit.es : exhibit.en;
  g.fillText(title, 28, 120, 460);
  g.font = '24px sans-serif';
  g.fillStyle = '#e4d5bf';
  g.fillText(spanish ? 'En la pantalla de la sala' : 'On the gallery screen', 28, 180);
  g.fillText(spanish ? 'Entra para la experiencia' : 'Step in for the experience', 28, 214);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createMuseum(host, spanish) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  let dpr = Math.min(devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(dpr);
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050403);
  scene.fog = new THREE.FogExp2(0x050403, 0.03);
  const pointScale = { value: 400 };
  scene.add(new THREE.HemisphereLight(0xfff0d4, 0x1a120c, 0.45));
  const lamp = new THREE.PointLight(0xffe2b0, 9, 28, 1.6);
  lamp.position.set(0, 3, 8);
  scene.add(lamp);
  const lamp2 = lamp.clone();
  lamp2.position.set(0, 3, -12);
  scene.add(lamp2);

  // DoubleSide: a closed box is invisible from inside, and the visitor is inside.
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x2e2822, roughness: 0.88, side: THREE.DoubleSide });
  // LED coves run along the foot and head of every wall.
  const cove = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc98a).multiplyScalar(1.15) });
  for (const box of walls) {
    const w = box.maxX - box.minX, d = box.maxZ - box.minZ;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, WALL_H, d), wallMat);
    mesh.position.set((box.minX + box.maxX) / 2, WALL_H / 2, (box.minZ + box.maxZ) / 2);
    scene.add(mesh);
    for (const y of [0.03, WALL_H - 0.04]) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.025, d + 0.04), cove);
      strip.position.set(mesh.position.x, y, mesh.position.z);
      scene.add(strip);
    }
  }
  function floor(w, d, x, z, color) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color, roughness: 0.38, metalness: 0.2 }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0, z);
    scene.add(mesh);
  }
  floor(8.6, 26, 0, 9, 0x241c16);
  floor(16.6, 14, 0, -11, 0x1c1814);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(18, 42), new THREE.MeshStandardMaterial({ color: 0x100e0c, side: THREE.DoubleSide }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, WALL_H, 2);
  scene.add(ceiling);

  const screens = exhibits.map(exhibit => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.7, 0.96),
      new THREE.MeshBasicMaterial({ map: labelTexture(exhibit, spanish), toneMapped: false })
    );
    mesh.position.set(exhibit.x, 1.58, exhibit.z);
    mesh.lookAt(exhibit.x + exhibit.nx, 1.58, exhibit.z + exhibit.nz);
    scene.add(mesh);
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(1.86, 1.12, 0.06),
      new THREE.MeshStandardMaterial({ color: exhibit.color, emissive: exhibit.color, emissiveIntensity: 0.15, roughness: 0.5 })
    );
    frame.position.copy(mesh.position);
    frame.quaternion.copy(mesh.quaternion);
    frame.translateZ(-0.05);
    scene.add(frame);
    // A ceiling spot lights each screen through a soft volumetric cone.
    const from = new THREE.Vector3(exhibit.x + exhibit.nx * 1.3, WALL_H - 0.06, exhibit.z + exhibit.nz * 1.3), to = mesh.position.clone();
    const fixture = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.08, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff0d8).multiplyScalar(3) }));
    fixture.position.copy(from);
    scene.add(fixture);
    const length = from.distanceTo(to);
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.95, length, 32, 1, true), new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(exhibit.color).lerp(new THREE.Color(0xfff0d8), 0.6) }, uPower: { value: 0.18 } },
      vertexShader: 'varying float vY;varying vec3 vN;varying vec3 vV;void main(){vY=uv.y;vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
      fragmentShader: 'uniform vec3 uColor;uniform float uPower;varying float vY;varying vec3 vN;varying vec3 vV;void main(){float edge=pow(abs(dot(vN,vV)),1.5);float a=edge*uPower*(.35+.65*vY);gl_FragColor=vec4(uColor*a,a);}',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
    }));
    cone.position.copy(from).lerp(to, 0.5);
    cone.lookAt(to);
    cone.rotateX(-Math.PI / 2);
    scene.add(cone);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1.2, 40), new THREE.ShaderMaterial({ uniforms: { uColor: { value: new THREE.Color(exhibit.color).multiplyScalar(0.5) }, uOpacity: { value: 0.3 } }, vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: 'uniform vec3 uColor;uniform float uOpacity;varying vec2 vUv;void main(){float d=length(vUv-.5)*2.;float a=pow(max(0.,1.-d),2.)*uOpacity;gl_FragColor=vec4(uColor*a,a);}', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(exhibit.x + exhibit.nx * 0.9, 0.012, exhibit.z + exhibit.nz * 0.9);
    scene.add(pool);
    return { exhibit, mesh, frame, cone, pool };
  });
  // Dust drifting through the light.
  const DUST = 420, dustSeed = Array.from({ length: DUST }, (_, i) => { const r = Math.sin(i * 12.9898) * 43758.5453; return r - Math.floor(r); });
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DUST * 3), 3));
  dustGeo.setAttribute('aSize', new THREE.BufferAttribute(Float32Array.from(dustSeed, s => 0.012 + s * 0.02), 1));
  dustGeo.setAttribute('aAlpha', new THREE.BufferAttribute(Float32Array.from(dustSeed, s => 0.2 + (1 - s) * 0.5), 1));
  const dust = new THREE.Points(dustGeo, pointMaterial(pointScale, 0xffe2b8, 1.4));
  dust.frustumCulled = false;
  scene.add(dust);
  let time = 0, last = performance.now();

  const camera = new THREE.PerspectiveCamera(68, 1, 0.08, 80);
  camera.rotation.order = 'YXZ';
  const post = createPost(renderer, scene, camera, { strength: 0.7, radius: 0.6, threshold: 0.95 });
  scene.environmentIntensity = 0.35;
  const quality = adaptiveScale(dpr, { min: 0.6, apply(s) { dpr = s; renderer.setPixelRatio(dpr); resize(); } });
  const fwd = new THREE.Vector3();
  const flat = new THREE.Vector3();
  const right = new THREE.Vector3();

  function resize() {
    const w = host.clientWidth || innerWidth, h = Math.max(1, host.clientHeight || innerHeight);
    renderer.setSize(w, h, false);
    post.setSize(w, h, dpr);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    pointScale.value = pointScaleFor(h, dpr, camera.fov);
  }
  new ResizeObserver(resize).observe(host);
  resize();
  renderer.domElement.addEventListener('webglcontextlost', e => e.preventDefault());

  function render(player, nearId) {
    camera.position.set(player.x, EYE, player.z);
    camera.rotation.y = player.yaw;
    camera.rotation.x = player.pitch;
    camera.updateMatrixWorld(true);
    camera.getWorldDirection(fwd);
    flat.set(fwd.x, 0, fwd.z);
    if (flat.lengthSq() > 1e-10) flat.normalize();
    right.crossVectors(flat, UP);
    const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    time += dt;
    for (const screen of screens) {
      const hot = screen.exhibit.id === nearId;
      screen.frame.material.emissiveIntensity = hot ? 1.4 + 0.2 * Math.sin(time * 3) : 0.2;
      screen.cone.material.uniforms.uPower.value = hot ? 0.32 : 0.16;
      screen.pool.material.uniforms.uOpacity.value = hot ? 0.8 : 0.3;
    }
    const pos = dustGeo.attributes.position;
    for (let i = 0; i < DUST; i++) {
      const s = dustSeed[i];
      pos.setXYZ(i, player.x + ((s * 37) % 1 - 0.5) * 9 + Math.sin(time * 0.2 + i) * 0.2, ((s * 71 + time * 0.02 * (0.3 + s)) % 1) * WALL_H, player.z + ((s * 53) % 1 - 0.5) * 12);
    }
    pos.needsUpdate = true;
    post.render(dt);
    quality.frame(dt);
    return { x: flat.x, z: flat.z, rx: right.x, rz: right.z };
  }
  function lookLock() { renderer.domElement.requestPointerLock?.(); }
  return { render, lookLock, dom: renderer.domElement };
}

export function placeInFront(exhibit) {
  return standAt(exhibit);
}
