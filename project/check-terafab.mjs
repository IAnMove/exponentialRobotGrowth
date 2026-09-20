import assert from 'node:assert/strict';
import * as THREE from './dist/vendor/three.module.js';
import {buildCampus,carrierPosition,HALLS} from './dist/terafab/world.js';
import * as spanishWorld from './dist/es/terafab/world.js';
const world=buildCampus();
assert.equal(HALLS.length,4);assert.equal(world.hallGroups.length,4);
let instances=0,meshes=0;world.scene.updateMatrixWorld(true);
world.scene.traverse(o=>{assert(o.matrixWorld.elements.every(Number.isFinite));if(o.isMesh)meshes++;if(o.isInstancedMesh){instances+=o.count;assert(Array.from(o.instanceMatrix.array).every(Number.isFinite));}});
assert(instances>2000,'Detailed equipment and building geometry must exist');assert(meshes<300,'Static geometry should remain batched');
world.mode('cleanroom');assert(world.roofs.every(r=>!r.visible));assert(world.hallGroups.every(g=>g.visible));
world.mode('layers');assert.deepEqual(world.hallGroups.map(g=>g.visible),[true,false,false,false]);assert.equal(world.decks[0].position.y,9);assert(world.plenums[0].visible);
world.mode('campus');assert(world.roofs.every(r=>r.visible));assert(world.hallGroups.every(g=>g.visible));assert(world.decks.every(d=>d.position.y===3.5));
for(let time=0;time<100;time+=.1){const p=carrierPosition(time);assert(p[0]>=-3-1e-8&&p[0]<=7+1e-8);assert(p[1]>=-18-1e-8&&p[1]<=18+1e-8);assert(Math.abs(p[0]+3)<1e-8||Math.abs(p[0]-7)<1e-8||Math.abs(Math.abs(p[1])-18)<1e-8);assert.deepEqual(p,spanishWorld.carrierPosition(time));const q=carrierPosition(time+.001);assert(Math.hypot(p[0]-q[0],p[1]-q[1])<.003);}
assert.deepEqual(carrierPosition(4),carrierPosition(5),'Carrier dwells at the lithography station');
assert.deepEqual(carrierPosition(0),carrierPosition(116/2.5),'The closed route must loop continuously');
// Geometry-only camera checks for desktop and narrow portrait screens (no browser/GPU).
for(const [width,height] of [[1200,700],[390,500]]){
 const span=Math.max(83,86/(width/height)),camera=new THREE.OrthographicCamera(-span*width/height,span*width/height,span,-span,.1,500);
 camera.position.set(Math.sin(.62)*160*Math.cos(.65),2+160*Math.sin(.65),Math.cos(.62)*160*Math.cos(.65));camera.lookAt(0,2,0);camera.updateProjectionMatrix();camera.updateMatrixWorld();
 for(const [x,z] of HALLS){const q=new THREE.Vector3(x,6,z).project(camera);assert(Math.abs(q.x)<.95&&Math.abs(q.y)<.95,'Hall must be visible in campus framing');}
}
globalThis.document={documentElement:{lang:'en'}};const en=await import('./dist/terafab/places.js');globalThis.document.documentElement.lang='es';const es=await import('./dist/es/terafab/places.js');
assert.equal(en.places.length,16);assert.deepEqual(en.places.map(p=>[p.id,p.position,p.view]),es.places.map(p=>[p.id,p.position,p.view]));for(const p of es.places)assert(p.body&&p.equipment&&p.evidence&&es.sources[p.source]);
console.log(`Terafab: ${instances} static instances, ${meshes} meshes; roof/layer views, carrier continuity and stops, camera framing, 16 bilingual areas OK`);
