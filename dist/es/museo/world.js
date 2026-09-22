import * as THREE from '../../vendor/three.module.js';
import {EYE, WALL_H, walls, exhibits, standAt} from './model.js';

const UP = new THREE.Vector3(0, 1, 0);

function labelTexture(exhibit, spanish) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 288;
  const g = canvas.getContext('2d');
  g.fillStyle = '#16130f';
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
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x070604);
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x070604, 0.028);
  scene.add(new THREE.HemisphereLight(0xfff0d4, 0x1a120c, 0.85));
  const lamp = new THREE.PointLight(0xffe2b0, 18, 28, 1.6);
  lamp.position.set(0, 3, 8);
  scene.add(lamp);
  const lamp2 = lamp.clone();
  lamp2.position.set(0, 3, -12);
  scene.add(lamp2);

  // DoubleSide: a closed box is invisible from inside, and the visitor is inside.
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x3a3128, roughness: 0.92, side: THREE.DoubleSide });
  for (const box of walls) {
    const w = box.maxX - box.minX, d = box.maxZ - box.minZ;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, WALL_H, d), wallMat);
    mesh.position.set((box.minX + box.maxX) / 2, WALL_H / 2, (box.minZ + box.maxZ) / 2);
    scene.add(mesh);
  }
  function floor(w, d, x, z, color) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color, roughness: 1 }));
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
      new THREE.MeshBasicMaterial({ map: labelTexture(exhibit, spanish) })
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
    return { exhibit, mesh, frame };
  });

  const camera = new THREE.PerspectiveCamera(68, 1, 0.08, 80);
  camera.rotation.order = 'YXZ';
  const fwd = new THREE.Vector3();
  const flat = new THREE.Vector3();
  const right = new THREE.Vector3();

  function resize() {
    const w = host.clientWidth || innerWidth, h = Math.max(1, host.clientHeight || innerHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
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
    for (const screen of screens) {
      const hot = screen.exhibit.id === nearId;
      screen.frame.material.emissiveIntensity = hot ? 0.7 : 0.12;
    }
    renderer.render(scene, camera);
    return { x: flat.x, z: flat.z, rx: right.x, rz: right.z };
  }
  function lookLock() { renderer.domElement.requestPointerLock?.(); }
  return { render, lookLock, dom: renderer.domElement };
}

export function placeInFront(exhibit) {
  return standAt(exhibit);
}
