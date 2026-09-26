import assert from 'node:assert/strict';
import {LESSONS} from './site-src/journeys/catalog.js';
import {defaults,poseAt} from './site-src/journeys/common.js';
import * as THREE from './node_modules/three/build/three.module.js';
// Exercise the real scene builder and geometries, without a WebGL context or browser.
globalThis.document={createElement:()=>({getContext:()=>({measureText:s=>({width:s.length*24}),fillText(){}})})};
const {createLessonScene}=await import('./dist/journeys/world.js');
for(const es of [true,false])for(const lesson of Object.values(LESSONS)){
 const {scene,resources,targets,update}=createLessonScene(lesson,es);
 assert(targets.length>0,lesson.id+' needs inspectable teaching objects');
 const states=[lesson.evaluate(defaults(lesson),0),lesson.evaluate(defaults(lesson),lesson.horizon)];
 for(const state of states){update(state,5,3);scene.updateMatrixWorld(true);let meshes=0;scene.traverse(o=>{assert([...o.matrixWorld.elements].every(Number.isFinite),lesson.id+' invalid transform');if(o.isMesh){meshes++;const positions=o.geometry.attributes.position;assert([...positions.array].every(Number.isFinite),lesson.id+' invalid geometry');}});assert(meshes>40,lesson.id+' needs a built scene');}
 for(let stop=0;stop<4;stop++){const p=poseAt(stop),camera=new THREE.PerspectiveCamera(60,1,.08,150);camera.position.set(p.x,1.65,p.z);camera.rotation.set(p.pitch,p.yaw,0,'YXZ');camera.updateMatrixWorld(true);const direction=new THREE.Vector3();camera.getWorldDirection(direction);const to=new THREE.Vector3(0,1.9,-stop*16).sub(camera.position).normalize();assert(direction.dot(to)>.97,'arrival faces the actual exhibit');}
 resources.forEach(r=>r.dispose());
}
console.log('16 bilingual scene builds: actual Three.js meshes, finite geometry/transforms, inspectors and camera poses: OK (no pixel rendering)');
