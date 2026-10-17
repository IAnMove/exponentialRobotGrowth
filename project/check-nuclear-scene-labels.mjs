import assert from 'node:assert/strict';
import * as THREE from './node_modules/three/build/three.module.js';
import {nuclear,nuclearPoseAt} from './site-src/journeys/nuclear.js';
import {createNuclearScene,nuclearFraming,nuclearPoseAt as scenePose} from './dist/journeys/nuclear-world.js';
globalThis.document={createElement:()=>{const c={width:0,height:0,text:[],writes:0};c.getContext=()=>({measureText:s=>({width:s.length*21}),clearRect(){c.text=[];c.writes++;},fillRect(){},fillText(s){c.text.push(s);}});return c;}};
const clear=(a,b)=>a.x+a.width+4.99<=b.x||b.x+b.width+4.99<=a.x||a.y+a.height+4.99<=b.y||b.y+b.height+4.99<=a.y,near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);
let layouts=0,count=0;
for(const es of [true,false]){
 const built=createNuclearScene(nuclear,es),resources=built.resources.length;
 const signs=[];built.scene.traverse(m=>{if(Number.isInteger(m.userData.nuclearListenSign))signs.push(m);});assert.equal(signs.length,4);for(const sign of signs){const button=built.stands[sign.userData.nuclearListenSign],box=new THREE.Box3().setFromObject(button);assert(sign.isMesh&&sign.material.depthTest,'listening words are physical printing rather than a through-wall sprite');assert(sign.position.z>box.max.z&&Math.abs(sign.position.y-button.position.y)<1e-8,'printing is on the actual front face, outside the solid button');}
 for(let i=0;i<4;i++)assert.deepEqual(scenePose(i),nuclearPoseAt(i),'renderer and actual controller share the same arrival pose');
 for(const params of [{power:100,efficiency:33,stop:true},{power:20,efficiency:20,stop:true},{power:80,efficiency:40,stop:false}]){
  const model=nuclear.evaluate(params,0),source=JSON.stringify(model.trace);
  for(const time of [.2,1.2,4.99999,5,12,24])for(const phase of [0,1,2,3,4])for(const mode of (phase===4?['whole']:['web','immersive']))for(const [width,height] of [[320,480],[390,480],[1090,520]]){
   const whole=mode==='whole',index=Math.min(3,phase);built.update(model,time,index,whole,mode==='immersive');built.scene.updateMatrixWorld(true);
   const camera=new THREE.PerspectiveCamera(width/height<1?65:46,width/height,.1,150);
   if(mode==='immersive'){const p=nuclearPoseAt(index);camera.position.set(p.x,1.65,p.z);camera.rotation.set(p.pitch,p.yaw,0,'YXZ');}else{const f=nuclearFraming(index,{...nuclear.overview,whole},width/height,camera.fov);camera.position.copy(f.center).addScaledVector(f.direction,f.distance);camera.lookAt(f.center);}
   const obstacles=[{x:width-214,y:0,width:198,height:35},...(mode==='immersive'&&width<851?[{x:width-136,y:200,width:120,height:132}]:[])];obstacles.push(...built.protectedBounds(camera,{width,height},index,whole));built.layoutLabels(camera,{width,height,obstacles});built.scene.updateMatrixWorld(true);layouts++;
   for(const region of built.protectedRegions[index])for(const object of region.objects){const box=new THREE.Box3().setFromObject(object);for(const axis of ['x','y','z'])assert(box.min[axis]>=region.box.min[axis]-1e-7&&box.max[axis]<=region.box.max[axis]+1e-7,'exclusion encloses the real fuel/rods, event particles, separating tube, rotor or gauge tracks at every sampled time');}
   const labels=built.annotations.filter(e=>e.m.userData.nuclearLabel.layout);
   for(const e of built.annotations){const role=e.m.userData.nuclearLabel.role,object=role==='core'?built.fuel[4]:role==='shutdown'?built.controlRods[0]:role==='exchange'?built.steamGenerator.transfer[1]:role==='turbine'?built.turbine.shaft:role==='condenser'?built.condenser.secondaryShell:null;if(object)assert(new THREE.Box3().setFromObject(object).containsPoint(e.m.parent.localToWorld(e.anchor.clone())),'callout leader terminates on its named physical mechanism');const destination={absorbed:'absorb',leakage:'leak','next-fission':'fission'}[role];if(destination)assert(e.anchor.distanceTo(built.fissionInset.destinations[destination])<1e-10,'an outcome label points at its actual neutron destination');}
   if(!whole){assert(labels.some(e=>e.m.userData.nuclearLabel.role===['core','exchange','turbine','shutdown'][index]),`main explanation retained in ${mode}/${phase}/${width}`);if(index>=2){assert.equal(labels.filter(e=>e.m.userData.nuclearLabel.role==='bar').length,3,'all three common-scale bar names remain legible');assert(labels.some(e=>e.m.userData.nuclearLabel.role==='scale'),'the numerical common scale stays explicit');}}
   for(const [i,e] of labels.entries()){
    count++;const a=e.m.userData.nuclearLabel,r=a.layout;assert.equal(a.fontPixels,13);assert.equal(a.lines.join(' ').replace(/\s+/g,' ').trim(),e.words.replace(/\s+/g,' ').trim());assert(e.height*3<=384&&e.width*3<=768);assert(r.x>=12&&r.y>=12&&r.x+r.width<=width-12+1e-8&&r.y+r.height<=height-12+1e-8);for(const other of labels.slice(i+1))assert(clear(r,other.m.userData.nuclearLabel.layout));for(const o of obstacles)assert(clear(r,o));
    const p=e.m.getWorldPosition(new THREE.Vector3()),depth=-p.clone().applyMatrix4(camera.matrixWorldInverse).z,pixels=height/(2*depth*Math.tan(camera.fov*Math.PI/360)),scale=e.m.getWorldScale(new THREE.Vector3());near(scale.x*pixels,r.width);near(scale.y*pixels,r.height);
   }
   const writes=built.annotations.map(e=>e.canvas.writes);built.layoutLabels(camera,{width,height,obstacles});assert.deepEqual(built.annotations.map(e=>e.canvas.writes),writes,'held views do not repaint the GPU images');assert.equal(built.resources.length,resources);
   const s=built.state;for(const e of built.annotations){const {role,text}=e.m.userData.nuclearLabel;if(role==='core')assert(text.includes(s.stopped?(es?'Fisión detenida':'Fission stopped'):(es?'Reacción controlada':'Controlled reaction')));if(role==='turbine')assert.equal(/ELECTRICIDAD 0|ELECTRICITY 0/.test(text),s.stopped);}
  }
  assert.equal(JSON.stringify(model.trace),source,'annotation layout leaves the energy model unchanged');
 }
 assert.equal(new Set(built.resources).size,resources);for(const e of built.annotations)for(const r of [e.texture,e.m.material,e.leader.geometry,e.leader.material])assert(built.resources.includes(r));built.resources.forEach(r=>r.dispose());
}
console.log(`Nuclear scene: ${layouts} layouts, ${count} labels; 13 px words, common-scale names, actual mechanisms protected, STOP/rewind state, shared arrival, fixed GPU storage: OK`);
