import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createRun,contextWindow,transformerTrace,advance} from './dist/llms/model.js';
import {poseAt,standPosition} from './dist/immersive/model.js';
import * as THREE from './node_modules/three/build/three.module.js';
globalThis.document={documentElement:{lang:'es'},createElement:()=>({getContext:()=>({measureText:s=>({width:s.length*26}),fillText(){},fillRect(){},createRadialGradient:()=>({addColorStop(){}})})})};
const {createGallery}=await import('./dist/immersive/world.js');
const {VOICES}=await import('./dist/immersive/voices.js');
for(const es of [true,false]){
 const gallery=createGallery(es),run=createRun(es?'es':'en');run.phase=4;gallery.update(run,2);const {tokens,offset}=contextWindow(run),trace=transformerTrace(tokens,offset);
 assert.equal(gallery.targets.filter(o=>o.userData.action==='listen').length,8);
 for(let i=0;i<5;i++){gallery.animate(.016,.5,true,{index:i,progress:.5});assert.equal(gallery.operations.filter(g=>g.visible).length,1);assert(gallery.operations[i].visible);}
 gallery.animate(.1,.5,true,{index:2,progress:.5});const signal=gallery.paths.find(p=>p.phase===4&&p.operation===2).ball;const paused=signal.position.clone();gallery.animate(.1,.5,false,{index:2,progress:.5});assert(signal.position.equals(paused),'pausing narration freezes the activation signal');
 const attention=gallery.targets.filter(o=>o.userData.text?.startsWith('A['));assert.equal(attention.length,8);attention.forEach((o,j)=>assert.equal(o.userData.value,trace.A[2][j]));assert.equal(attention.slice(3).reduce((s,o)=>s+o.userData.value,0),0);
 assert.equal(gallery.paths.filter(p=>p.phase===1).length,0,'no fake retrieval signal without a source');
 gallery.scene.updateMatrixWorld(true);gallery.scene.traverse(o=>{assert([...o.matrixWorld.elements].every(Number.isFinite));if(o.isMesh)assert([...o.geometry.attributes.position.array].every(Number.isFinite));});
 const p=poseAt(4),camera=new THREE.PerspectiveCamera(64,956/580,.08,155);camera.position.set(p.x,1.65,p.z);camera.rotation.set(p.pitch,p.yaw,0,'YXZ');camera.updateMatrixWorld(true);const s=standPosition(4),point=new THREE.Vector3(s.x,s.y+.5,s.z).project(camera);assert(Math.abs(point.x)<.9&&Math.abs(point.y)<.83,'listen button visible from station arrival pose');
 const withSource=createRun(es?'es':'en',{scenario:'museum',retrieval:true});gallery.update(withSource,3);assert.equal(gallery.paths.filter(p=>p.phase===1).length,1);advance(run);gallery.update(run,7);assert.equal(gallery.targets.filter(o=>o.userData.action==='listen').length,8,'rebuilding does not duplicate stands');gallery.dispose();
}
for(const lang of ['es','en']){assert.equal(VOICES[lang].length,13);const clip=VOICES[lang].find(c=>c.id==='layers');assert.equal(clip.segments.length,5);assert.equal(clip.cues.length,5);for(const c of VOICES[lang]){assert(existsSync('dist/audio/'+c.file),c.file);assert(c.duration>0);}clip.cues.forEach((c,i)=>{assert(c.end>c.start);if(i)assert(Math.abs(c.start-clip.cues[i-1].end)<.001);});assert(clip.cues.at(-1).end<=clip.duration+.1);}
const notebook=readFileSync('site-src/llms/voices.js','utf8');assert(notebook.includes('A la izquierda vemos'),'original notebook narration preserved');
console.log('Gallery: bilingual real meshes, 5 exclusive cue scenes, computed attention and causal zeros, retrieval truthfulness, visible stand controls, resource rebuilds and 26 matching voice files: OK');
