import assert from 'node:assert/strict';
import * as THREE from './node_modules/three/build/three.module.js';
import {evolution,evolutionPose} from './site-src/journeys/evolution.js';
import {defaults} from './site-src/journeys/common.js';
import {layoutSceneLabels} from './site-src/journeys/label-layout.js';
import {createEvolutionScene,evolutionFraming} from './dist/journeys/evolution-world.js';

// Use real scene/camera transforms with a deterministic canvas text measure.
globalThis.document={createElement:()=>{const c={width:0,height:0,textLines:[],writes:0};c.getContext=()=>({measureText:t=>({width:t.length*21}),clearRect(){c.textLines=[];c.writes++;},fillRect(){},fillText(t){c.textLines.push(t);}});return c;}};
const priorityInputs=Object.freeze([Object.freeze({id:1,x:80,y:25,width:100,height:26,priority:1}),Object.freeze({id:2,x:80,y:25,width:50,height:26,priority:2})]);
assert.deepEqual(layoutSceneLabels(priorityInputs,{width:160,height:50}).map(x=>x.id),[2],'when only one annotation fits, retain the higher priority without shrinking it');
assert.deepEqual(layoutSceneLabels([...priorityInputs].reverse(),{width:160,height:50}),layoutSceneLabels(priorityInputs,{width:160,height:50}),'priority is deterministic across input order');
const clear=(a,b,g=4.99)=>a.x+a.width+g<=b.x||b.x+b.width+g<=a.x||a.y+a.height+g<=b.y||b.y+b.height+g<=a.y;
let layouts=0,labels=0;
for(const es of [true,false]){
 const built=createEvolutionScene(evolution,es),model=evolution.evaluate({...defaults(evolution),mutation:.05},0),resourceCount=built.resources.length;
 const signs=[];built.scene.traverse(o=>{if(o.isMesh&&o.geometry.type==='PlaneGeometry'&&o.material.map)signs.push(o);});
 assert.equal(signs.length,8);assert(signs.every(o=>o.material.depthTest&&o.material.side===THREE.FrontSide),'stand signs belong to their physical front face');
 for(const [width,height] of [[320,412],[390,412],[1110,620]])for(const mode of ['web','immersive'])for(const phase of [0,1,2,3])for(const time of [0,.68,.72,.8,1,7.8,79.999,80]){
  const whole=mode==='web'&&phase===3;built.update(model,time,phase,whole,mode==='immersive');built.standsGroup.visible=mode==='immersive';
  const camera=new THREE.PerspectiveCamera(width/height<1?65:46,width/height,.1,120);
  if(mode==='immersive'){const p=evolutionPose(phase);camera.position.set(p.x,1.65,p.z);camera.rotation.set(p.pitch,p.yaw,0,'YXZ');}
  else{const f=evolutionFraming(phase,{...evolution.overview,whole},width/height,camera.fov);camera.position.copy(f.center).addScaledVector(f.direction,f.distance);camera.lookAt(f.center);}
  const obstacles=mode==='immersive'?[{x:width-198,y:199,width:182,height:35},{x:width-136,y:246,width:120,height:132}]:[{x:width-198,y:108,width:182,height:35}];
  built.layoutLabels(camera,{width,height,obstacles});built.scene.updateMatrixWorld(true);layouts++;
  const shown=built.annotations.filter(e=>e.m.userData.evolutionLabel.layout);
  for(const [i,e] of shown.entries()){
   labels++;const info=e.m.userData.evolutionLabel,b=info.layout;
   assert.equal(info.fontPixels,13);assert.equal(info.lines.join(' ').replace(/\s+/g,' ').trim(),e.words.replace(/\s+/g,' ').trim(),'wrapping retains all explanation words');
   assert(info.lines.every(s=>s.length*7<=e.width-11.9),'glyphs fit without fillText compression');assert(e.height*3<=384&&e.width*3<=768);
   assert.equal(e.canvas.width,768);assert.equal(e.canvas.height,384);assert(e.texture.offset.y>=0&&e.texture.repeat.y<=1,'texture crop stays within the fixed canvas');
   assert(b.x>=12&&b.y>=12&&b.x+b.width<=width-12+1e-8&&b.y+b.height<=height-12+1e-8);
   for(const other of shown.slice(i+1))assert(clear(b,other.m.userData.evolutionLabel.layout),'annotations stay apart');for(const o of obstacles)assert(clear(b,o),'annotations preserve control input/visibility');
   const p=e.m.getWorldPosition(new THREE.Vector3()),depth=-p.clone().applyMatrix4(camera.matrixWorldInverse).z,pixels=height/(2*depth*Math.tan(camera.fov*Math.PI/360)),scale=e.m.getWorldScale(new THREE.Vector3());
   assert(Math.abs(scale.x*pixels-b.width)<1e-7&&Math.abs(scale.y*pixels-b.height)<1e-7,'actual projected size remains in CSS pixels');
  }
  const writes=built.annotations.map(e=>e.canvas.writes),versions=built.annotations.map(e=>e.leader.geometry.attributes.position.version);
  built.layoutLabels(camera,{width,height,obstacles});assert.deepEqual(built.annotations.map(e=>e.canvas.writes),writes,'a held frame does not repaint text');assert.deepEqual(built.annotations.map(e=>e.leader.geometry.attributes.position.version),versions,'a held frame does not upload leader geometry');assert.equal(built.resources.length,resourceCount,'seeking and resizing do not allocate more GPU resources');
 }
 built.update(model,.68,2);assert(built.offspringCaption.m.userData.evolutionLabel.text.includes(es?'Copias antes de mutación':'Copies before mutation'),'pending offspring count does not reveal a mutation outcome');
 const wholeCamera=new THREE.PerspectiveCamera(65,320/412,.1,120),wholeObstacles=[{x:122,y:108,width:182,height:35},{x:208,y:149,width:80,height:38}];let required;
 for(const whole of [false,true]){built.update(model,.68,2,whole);const f=evolutionFraming(2,{...evolution.overview,whole},320/412,65);wholeCamera.position.copy(f.center).addScaledVector(f.direction,f.distance);wholeCamera.lookAt(f.center);built.layoutLabels(wholeCamera,{width:320,height:412,obstacles:wholeObstacles});layouts++;const words=built.annotations.filter(e=>e.m.userData.evolutionLabel.layout).map(e=>e.words);if(!whole)required=words;else assert(required.every(t=>words.includes(t)),'the whole view retains the active mutation-stage explanations when context labels compete for space');}
 const camera=new THREE.PerspectiveCamera(65,1,.1,120);camera.position.set(0,10,-15);camera.lookAt(0,10,-30);built.layoutLabels(camera,{width:390,height:412});assert(built.annotations.every(e=>e.m.material.opacity===0&&!e.leader.visible),'annotations behind the camera disappear');
 assert.equal(new Set(built.resources).size,resourceCount);for(const e of built.annotations)for(const r of [e.texture,e.m.material,e.leader.geometry,e.leader.material])assert(built.resources.includes(r),'each annotation owns its GPU resources');
 const tracked=built.resources.filter(r=>typeof r.addEventListener==='function'),counts=new Map(tracked.map(r=>[r,0]));for(const r of tracked)r.addEventListener('dispose',()=>counts.set(r,counts.get(r)+1));built.resources.forEach(r=>r.dispose());assert([...counts.values()].every(n=>n===1),'all tracked annotation and physical-sign GPU resources are disposed exactly once');
}
console.log(`Evolution annotations: ${layouts} real-camera layouts, ${labels} projected labels, preserved text/13 px/controls/priority/causality/stable textures/disposal: OK`);
