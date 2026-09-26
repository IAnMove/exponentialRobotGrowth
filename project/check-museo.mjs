import assert from 'node:assert/strict';
import * as THREE from './node_modules/three/build/three.module.js';
import {EYE, RADIUS, SPEED, walls, exhibits, spawn, yawLookingAt, standAt, collide, stepVisitor, lookDelta, nearestExhibit, insideWall, roomName,rooms,routeTo,portalPose,roomAt} from './site-src/museo/model.js';

function close(v, x, y, z, eps = 1e-6) {
  assert(Math.abs(v.x - x) < eps && Math.abs(v.y - y) < eps && Math.abs(v.z - z) < eps, `${v.x},${v.y},${v.z} != ${x},${y},${z}`);
}
function basis(yaw, pitch = 0) {
  const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 80);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;
  camera.updateMatrixWorld(true);
  const fwd = new THREE.Vector3();
  camera.getWorldDirection(fwd);
  const flat = fwd.clone();
  flat.y = 0;
  if (flat.lengthSq() > 1e-10) flat.normalize();
  const right = new THREE.Vector3().crossVectors(flat, new THREE.Vector3(0, 1, 0));
  return { fwd, flat, right };
}

const level = basis(0, 0);
close(level.flat, 0, 0, -1);
close(level.right, 1, 0, 0);
const leftLook = basis(yawLookingAt(-1, 0));
assert(leftLook.flat.x < -0.98 && Math.abs(leftLook.flat.z) < 1e-6);
const rightLook = basis(yawLookingAt(1, 0));
assert(rightLook.flat.x > 0.98);
const backLook = basis(yawLookingAt(0, 1));
assert(backLook.flat.z > 0.98);
const raised = basis(0, 0.4);
assert(raised.fwd.y > 0.2, 'positive camera rotation.x looks up');

const ahead = stepVisitor({ x: 0, z: 0 }, { x: 0, z: -1 }, { x: 1, z: 0 }, { forward: 1, strafe: 0 }, 1, []);
assert(Math.abs(ahead.z - (-SPEED * 0.2)) < 1e-9);
assert.equal(ahead.x, 0);
const side = stepVisitor({ x: 0, z: 0 }, { x: 0, z: -1 }, { x: 1, z: 0 }, { forward: 0, strafe: 1 }, 1, []);
assert(Math.abs(side.x - SPEED * 0.2) < 1e-9);
const turned = basis(yawLookingAt(-1, 0));
const toTheLeft = stepVisitor({ x: 0, z: 0 }, { x: turned.flat.x, z: turned.flat.z }, { x: turned.right.x, z: turned.right.z }, { forward: 1, strafe: 0 }, 1, []);
assert(toTheLeft.x < -0.5 && Math.abs(toTheLeft.z) < 1e-6);

const barrier = [{ minX: -1, maxX: 1, minZ: -2, maxZ: -1.5 }];
let blocked = { x: 0, z: 0 };
for (let i = 0; i < 40; i++) blocked = stepVisitor(blocked, { x: 0, z: -1 }, { x: 1, z: 0 }, { forward: 1, strafe: 0 }, 0.2, barrier);
assert(blocked.z > -1.5);
assert(blocked.z < -1.5 + RADIUS + 0.05);
assert.equal(insideWall(blocked.x, blocked.z, barrier), false);

assert.equal(insideWall(spawn.x, spawn.z), false);
let walker = { x: spawn.x, z: spawn.z };
for (let i = 0; i < 220; i++) walker = stepVisitor(walker, { x: 0, z: -1 }, { x: 1, z: 0 }, { forward: 1, strafe: 0 }, 0.2);
assert(walker.z < -10, 'forward reaches the mind room');
assert(walker.z > -21.84, 'the back wall stops the visitor');
assert(Math.abs(walker.x) < 1);
assert.equal(insideWall(walker.x, walker.z), false);
assert.equal(roomName(spawn.z), 'hall');
assert.equal(roomName(walker.z), 'mind');

const seen = new Set();
for (const exhibit of exhibits) {
  assert(!seen.has(exhibit.id));
  seen.add(exhibit.id);
  const stand = standAt(exhibit);
  assert.equal(insideWall(stand.x, stand.z), false);
  assert.equal(insideWall(exhibit.x, exhibit.z), false);
  const pushed = collide(stand.x, stand.z, RADIUS);
  assert(Math.abs(pushed.x - stand.x) < 1e-9 && Math.abs(pushed.z - stand.z) < 1e-9);
  const dx = exhibit.x - stand.x, dz = exhibit.z - stand.z;
  assert.equal(nearestExhibit(stand.x, stand.z, dx, dz)?.id, exhibit.id);
  const look = basis(stand.yaw);
  const towardX = exhibit.x - stand.x;
  const towardZ = exhibit.z - stand.z;
  const len = Math.hypot(towardX, towardZ);
  assert(look.flat.x * towardX / len + look.flat.z * towardZ / len > 0.98);
}
for (const id of ['robots', 'terafab', 'dyson', 'home', 'starlink', 'spacex', 'kardashev', 'growth', 'llms', 'mente', 'modelos']) {
  assert(seen.has(id), id);
}
assert.equal(exhibits.find(e => e.id === 'robots').href, '../robots/index.html');
assert(Math.abs(lookDelta(1, 0, 10, 0).yaw - (1 - 10 * 0.0022)) < 1e-12);
assert(lookDelta(0, 0, 0, 100).pitch < 0);
assert.equal(lookDelta(0, 0, 0, 1000).pitch, -1.05);
assert.equal(EYE > 1.4, true);

const diagonal=stepVisitor({x:0,z:0},{x:0,z:-1},{x:1,z:0},{forward:1,strafe:1},.1,[]);
assert(Math.abs(Math.hypot(diagonal.x,diagonal.z)-SPEED*.1)<1e-10,'no diagonal speed boost');
assert.equal(rooms.length,5);
for(const from of [spawn,...exhibits.map(standAt)])for(const to of exhibits.map(standAt)){
  let prev=from;
  for(const waypoint of routeTo(from,to)){
    const steps=Math.ceil(Math.hypot(waypoint.x-prev.x,waypoint.z-prev.z)/.1);
    for(let i=0;i<=steps;i++){const a=i/Math.max(1,steps),x=prev.x+(waypoint.x-prev.x)*a,z=prev.z+(waypoint.z-prev.z)*a;assert(roomAt(x,z),'route stays on museum floor');const safe=collide(x,z,RADIUS);assert(Math.hypot(safe.x-x,safe.z-z)<1e-6,'route clears wall and doorway');}
    prev=waypoint;
  }
}
const e=exhibits.find(e=>e.id==='llms'),end=portalPose(standAt(e),e,1);assert((end.z-e.z)*e.nz<0,'portal camera actually crosses the canvas');
const edge=routeTo(spawn,{x:23,z:8}).at(-1);assert(!insideWall(edge.x,edge.z));
console.log('Museum: camera basis, normalized walking, themed rooms, all gallery-to-painting routes, wall clearance and crossing the canvas: OK');
