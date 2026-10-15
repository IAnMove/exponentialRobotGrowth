import assert from 'node:assert/strict';
import * as THREE from './node_modules/three/build/three.module.js';
import {EYE, RADIUS, SPEED, WALL_H, PAINTING, walls, exhibits, spawn, yawLookingAt, standAt, collide, stepVisitor, lookDelta, nearestExhibit, insideWall, roomName,rooms,routeTo,portalPose,roomAt,paintingPlane,focusHit,focusedExhibit,portalCrossing,isSafePose,restorePose} from './site-src/museo/model.js';
import {immersiveHref} from './site-src/immersive/catalog.js';

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

// Compare the mathematical selection with real Three intersection tests. This
// oracle uses camera matrices, finite planes and solid wall meshes, rather than
// repeating the model's dot products or ray/box algorithm.
const oracleResources=[],wallMaterial=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),canvasMaterial=new THREE.MeshBasicMaterial({side:THREE.FrontSide});oracleResources.push(wallMaterial,canvasMaterial);
const wallMeshes=walls.map(box=>{const geometry=new THREE.BoxGeometry(box.maxX-box.minX,WALL_H,box.maxZ-box.minZ),mesh=new THREE.Mesh(geometry,wallMaterial);mesh.position.set((box.minX+box.maxX)/2,WALL_H/2,(box.minZ+box.maxZ)/2);mesh.updateMatrixWorld(true);oracleResources.push(geometry);return mesh;});
const canvasMeshes=exhibits.map(exhibit=>{const plane=paintingPlane(exhibit),geometry=new THREE.PlaneGeometry(plane.width,plane.height),mesh=new THREE.Mesh(geometry,canvasMaterial);mesh.position.set(plane.center.x,plane.center.y,plane.center.z);mesh.rotation.y=Math.atan2(exhibit.nx,exhibit.nz);mesh.userData.exhibit=exhibit;mesh.updateMatrixWorld(true);oracleResources.push(geometry);assert.deepEqual(plane.normal,{x:exhibit.nx,y:0,z:exhibit.nz});assert.deepEqual(plane.right,{x:exhibit.nz,y:0,z:-exhibit.nx});return mesh;});
function oracleFocus(pose,maxDistance=5.5){const camera=new THREE.PerspectiveCamera(68,1,.01,90);camera.position.set(pose.x,EYE,pose.z);camera.rotation.set(pose.pitch,pose.yaw,0,'YXZ');camera.updateMatrixWorld(true);const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(0,0),camera);ray.far=maxDistance;const canvas=ray.intersectObjects(canvasMeshes)[0],wall=ray.intersectObjects(wallMeshes)[0];return canvas&&(!wall||canvas.distance<wall.distance)?canvas:null;}
let focusCases=0,portalCases=0;
const compareFocus=(pose,maxDistance=5.5)=>{const expected=oracleFocus(pose,maxDistance),actual=focusHit(pose,maxDistance);assert.equal(actual?.exhibit.id,expected?.object.userData.exhibit.id,'camera selection agrees with the central ray and real wall occlusion');assert.equal(focusedExhibit(pose,maxDistance)?.id,actual?.exhibit.id);if(actual){assert(Math.abs(actual.distance-expected.distance)<1e-7);assert(new THREE.Vector3(actual.point.x,actual.point.y,actual.point.z).distanceTo(expected.point)<1e-7);}focusCases++;return actual;};
for(const exhibit of exhibits){const stand=standAt(exhibit);assert(isSafePose(stand));for(const turn of [-Math.PI,-.65,-.25,0,.25,.65,Math.PI/2])for(const pitch of [-1.05,-.4,0,.12,.4,1.05])compareFocus({...stand,yaw:stand.yaw+turn,pitch});const hit=compareFocus(stand);assert.equal(hit?.exhibit.id,exhibit.id);assert.equal(compareFocus(stand,hit.distance-1e-5),null,'a frame beyond the interaction distance is not selected');assert.equal(compareFocus(stand,hit.distance+1e-5)?.exhibit.id,exhibit.id);assert.equal(compareFocus({...stand,yaw:stand.yaw+Math.PI}),null,'a nearby painting behind the camera is not selected');assert.equal(compareFocus({...stand,pitch:1.05}),null,'looking above a nearby frame removes its card');assert.equal(compareFocus(entryPose(exhibit,-.1,0,stand.yaw+Math.PI)),null,'the back of a nearby canvas is not an actionable painting');}
const electricity=exhibits.find(exhibit=>exhibit.id==='electricity'),occludedPose={x:-4.8,z:-4.7,yaw:yawLookingAt(electricity.x+electricity.nx*PAINTING.canvasOffset+4.8,electricity.z+electricity.nz*PAINTING.canvasOffset+4.7),pitch:0};assert(isSafePose(occludedPose));assert.equal(compareFocus(occludedPose),null,'a painting less than five metres away is still blocked by the separating gallery wall');
for(const bad of [{...spawn,yaw:NaN},{...spawn,pitch:Infinity},null])assert.equal(focusHit(bad),null);for(const distance of [0,-1,NaN,Infinity])assert.equal(focusHit(spawn,distance),null);

function entryPose(exhibit,distance,lateral=0,yaw=standAt(exhibit).yaw){const plane=paintingPlane(exhibit);return {x:plane.center.x+plane.normal.x*distance+plane.right.x*lateral,z:plane.center.z+plane.normal.z*distance+plane.right.z*lateral,yaw,pitch:0};}
const crossing=(from,to,expected,message)=>{assert.equal(portalCrossing(from,to)?.id,expected,message);portalCases++;};
for(const exhibit of exhibits){
 const width=paintingPlane(exhibit).width,live=!!immersiveHref(exhibit.id),d=PAINTING.entryDistance;
 for(const lateral of [0,-width/2+.01,width/2-.01])crossing(entryPose(exhibit,d+.1,lateral),entryPose(exhibit,d-.1,lateral),live?exhibit.id:undefined,'the entire rectangular opening works, but a Web-only canvas never navigates');
 for(const lateral of [-width/2-.01,width/2+.01])crossing(entryPose(exhibit,d+.1,lateral),entryPose(exhibit,d-.1,lateral),undefined,'walking just outside the actual frame width never opens a portal');
 crossing(entryPose(exhibit,d-.1),entryPose(exhibit,d+.1),undefined,'walking out of a frame is not an entry');
 crossing(entryPose(exhibit,d+.1),entryPose(exhibit,d+.1,.15),undefined,'pure strafing beside a painting is not a portal crossing');
 crossing(entryPose(exhibit,d+.1),entryPose(exhibit,d-.1,0,standAt(exhibit).yaw+Math.PI),undefined,'walking backward into a frame cannot open it');
 for(const degrees of [29,31]){const yaw=standAt(exhibit).yaw+degrees*Math.PI/180;crossing(entryPose(exhibit,d+.1,0,yaw),entryPose(exhibit,d-.1,0,yaw),degrees===29&&live?exhibit.id:undefined,'entry requires a forward gaze within thirty degrees');}
 for(const degrees of [29,31]){const strafe=.1*Math.tan(degrees*Math.PI/180);crossing(entryPose(exhibit,d+.1,-strafe),entryPose(exhibit,d-.1,strafe),degrees===29&&live?exhibit.id:undefined,'entry requires actual movement toward the frame within thirty degrees');}
 crossing(entryPose(exhibit,d),entryPose(exhibit,d-.1),live?exhibit.id:undefined,'a forward step from the exact reachable threshold can enter');crossing(entryPose(exhibit,d),entryPose(exhibit,d),undefined,'a stationary visitor at the threshold does not enter');
 crossing(entryPose(exhibit,d-.1),entryPose(exhibit,d-.2),undefined,'continuing inside an already crossed threshold does not retrigger entry');
 const from=standAt(exhibit),plane=paintingPlane(exhibit);let previous=Infinity;for(let i=0;i<=20;i++){const pose=portalPose(from,exhibit,i/20),signed=(pose.x-plane.center.x)*exhibit.nx+(pose.z-plane.center.z)*exhibit.nz;assert(['x','z','yaw','pitch'].every(key=>Number.isFinite(pose[key])));assert(signed<=previous+1e-9,'the transition advances monotonically through the canvas');previous=signed;}assert(previous<0,'the completed transition reaches the other side of the real canvas plane');assert.deepEqual(portalPose(from,exhibit,0),from);assert.deepEqual(portalPose(from,exhibit,-1),from);
}
const outsideWall={x:-1,z:15,yaw:standAt(electricity).yaw,pitch:0},wallLeapTarget=entryPose(electricity,PAINTING.entryDistance-.1),leapDirection=new THREE.Vector3(wallLeapTarget.x-outsideWall.x,0,wallLeapTarget.z-outsideWall.z).normalize();assert(isSafePose(outsideWall));assert(leapDirection.dot(basis(outsideWall.yaw).flat)>Math.cos(Math.PI/6),'the blocked jump satisfies the portal movement alignment, so rejection must come from its wall');crossing(outsideWall,wallLeapTarget,undefined,'an otherwise aligned leap across a gallery wall cannot activate a portal');
crossing({...spawn,yaw:NaN},spawn,undefined,'invalid pose data cannot navigate');
const safeCandidate={...standAt(e),yaw:12.345,pitch:-.456};assert.deepEqual(restorePose(safeCandidate),safeCandidate);assert.notEqual(restorePose(safeCandidate),safeCandidate,'restored poses are independent copies');assert.deepEqual(restorePose({...safeCandidate,pitch:3}),{...safeCandidate,pitch:1.05});assert.equal(isSafePose({...safeCandidate,pitch:3}),false);
for(const bad of [null,{...spawn,x:NaN},{...spawn,z:Infinity},{...spawn,yaw:'0'},{...spawn,pitch:Infinity},{...spawn,x:-6,z:5},{...spawn,x:100,z:100}]){assert.equal(isSafePose(bad),false);assert.deepEqual(restorePose(bad,safeCandidate),safeCandidate);assert.deepEqual(restorePose(bad,{...spawn,x:100}),spawn,'corrupt pose and fallback return to a safe spawn');}
oracleResources.forEach(resource=>resource.dispose());
console.log(`Museum: camera basis, normalized walking, themed rooms, all gallery-to-painting routes, wall clearance, ${focusCases} independent Three focus/occlusion cases, ${portalCases} rectangular portal/direction cases, safe restoration and crossing the canvas: OK`);
