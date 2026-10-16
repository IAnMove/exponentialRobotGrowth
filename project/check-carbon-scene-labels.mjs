import assert from 'node:assert/strict';
import * as THREE from './node_modules/three/build/three.module.js';
import {carbon,carbonPose} from './site-src/journeys/carbon.js';
import {sampleCarbon,RESERVOIRS,FLUXES} from './site-src/journeys/carbon-model.js';
import {createCarbonScene} from './dist/journeys/carbon-world.js';

globalThis.document={createElement:()=>{const c={width:0,height:0,text:[],writes:0};c.getContext=()=>({measureText:s=>({width:s.length*21}),clearRect(){c.text=[];c.writes++;},fillRect(){},fillText(s){c.text.push(s);}});return c;}};
const cases=[{emissions:.5,uptake:1,stop:true},{emissions:2,uptake:2,stop:false},{emissions:0,uptake:.5,stop:true},{emissions:.1,uptake:2,stop:false},{emissions:2,uptake:1,stop:true},{emissions:.1,uptake:.5,stop:false}];
const times=[0,.2,.429999,.43,.659999,.66,.8,1,9.999,10,10.5,14.999,15,60],selected=[[],['photosynthesis','respiration'],['intoOcean','outOfOcean'],['emitted']];
const clear=(a,b)=>a.x+a.width+4.99<=b.x||b.x+b.width+4.99<=a.x||a.y+a.height+4.99<=b.y||b.y+b.height+4.99<=a.y;
let layouts=0,shown=0;
for(const es of [true,false]){
 const built=createCarbonScene(carbon,es),resourceCount=built.resources.length,fmt=n=>new Intl.NumberFormat(es?'es':'en',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
 assert.equal(built.routes.length,5);assert.deepEqual(built.stands.map(b=>b.userData.action),[0,1,2,3]);assert(built.stands.every(b=>built.targets.includes(b)));
 assert([built.incoming,...built.outgoing].every(r=>r.pulse.geometry.type==='OctahedronGeometry'),'energy markers have a distinct shape from carbon spheres');
 for(const params of cases){
  const model=carbon.evaluate(params,0),original=JSON.stringify(model.trace);
  for(const time of times)for(const phase of [0,1,2,3])for(const whole of [false,true])for(const [width,height] of [[320,435],[390,435],[1110,620]]){
   built.update(model,time,phase,whole);const expected=sampleCarbon(model.trace,time);assert(Math.abs(built.state.total-100)<1e-9);
   for(const id of RESERVOIRS){assert.equal(built.state[id],expected[id]);const r=built.reservoirs[id];assert(r.badge.m.userData.carbonLabel.text.includes(fmt(expected[id])));assert.equal(r.badge.m.visible,whole||phase===3||['air',phase===1?'land':phase===2?'ocean':phase===3?'fossil':'air'].includes(id));assert(Math.abs(r.fill.scale.x-expected[id]/100)<1e-10);}
   for(const r of built.routes){const f=FLUXES.find(f=>f.id===r.id),caption=r.caption.m.userData.carbonLabel;assert.equal(caption.flow,r.id);assert(caption.text.startsWith(es?'MATERIA':'MATTER'));assert(caption.text.includes(fmt(expected.flows[r.id])));assert(caption.text.includes('→')&&caption.text.includes(es?'u. C / intervalo':'C units / interval'));assert.equal(r.caption.m.visible,whole||selected[phase].includes(r.id));assert.equal(r.caption.m.material.color.getHex(),0xffffff);assert.equal(r.from,f.from);assert.equal(r.to,f.to);if(expected.flows[r.id]===0)assert(r.packets.every(p=>!p.visible)&&r.arrows.every(p=>!p.visible),'zero flow stops its moving matter and arrows');}
   const camera=new THREE.PerspectiveCamera(width/height<1?65:46,width/height,.1,110);
   if(whole){camera.position.set(0,12,25);camera.lookAt(0,2,0);}else{const p=carbonPose(phase);camera.position.set(p.x,1.65,p.z);camera.rotation.set(p.pitch,p.yaw,0,'YXZ');}
   const obstacles=[{x:width-198,y:187,width:182,height:35},{x:width-136,y:234,width:120,height:132}],core=phase===0?built.moleculeBounds(camera,{width,height}):null;if(core)obstacles.push(core);built.layoutLabels(camera,{width,height,obstacles});built.scene.updateMatrixWorld(true);layouts++;
   const labels=built.annotations.filter(e=>e.m.userData.carbonLabel.layout);
   for(const [i,e] of labels.entries()){
    shown++;const info=e.m.userData.carbonLabel,r=info.layout;assert.equal(info.fontPixels,13);assert.equal(info.lines.join(' ').replace(/\s+/g,' ').trim(),e.words.replace(/\s+/g,' ').trim());assert(e.height*3<=384&&e.width*3<=768,'all painted text fits the fixed texture');assert(info.lines.every(s=>s.length*7<=e.width-11.9),'text is wrapped without horizontal compression');assert(r.x>=12&&r.y>=12&&r.x+r.width<=width-12+1e-8&&r.y+r.height<=height-12+1e-8);
    for(const other of labels.slice(i+1))assert(clear(r,other.m.userData.carbonLabel.layout));for(const o of obstacles)assert(clear(r,o));
    const p=e.m.getWorldPosition(new THREE.Vector3()),d=-p.clone().applyMatrix4(camera.matrixWorldInverse).z,scale=e.m.getWorldScale(new THREE.Vector3()),px=height/(2*d*Math.tan(camera.fov*Math.PI/360));assert(Math.abs(scale.x*px-r.width)<1e-7&&Math.abs(scale.y*px-r.height)<1e-7);
   }
   const writes=built.annotations.map(e=>e.canvas.writes);built.layoutLabels(camera,{width,height,obstacles});assert.deepEqual(built.annotations.map(e=>e.canvas.writes),writes,'a held caption is not repainted');assert.equal(built.resources.length,resourceCount,'seeking and wrapping retain fixed GPU resources');
  }
  assert.equal(JSON.stringify(model.trace),original,'presentation does not mutate carbon accounting');
 }
 const model=carbon.evaluate(cases[0],0);
 const eye=carbonPose(0),view=new THREE.PerspectiveCamera(65,320/495,.1,110);view.position.set(eye.x,1.65,eye.z);view.rotation.set(eye.pitch,eye.yaw,0,'YXZ');view.updateMatrixWorld(true);built.update(model,.8,0);built.scene.updateMatrixWorld(true);
 const controls=[{x:118,y:187,width:186,height:35},{x:225,y:234,width:38,height:42},{x:184,y:279,width:38,height:42},{x:266,y:279,width:38,height:42},{x:225,y:324,width:38,height:42}];
 const protectedCore=built.moleculeBounds(view,{width:320,height:495});
 for(const time of [.43,.5,.52,.65]){built.update(model,time,0);built.scene.updateMatrixWorld(true);assert.deepEqual(built.moleculeBounds(view,{width:320,height:495}),protectedCore,'the protected molecular envelope remains stable through vibration');for(const mesh of built.molecule.children.filter(o=>o.isMesh)){const b=new THREE.Box3().setFromObject(mesh),points=[b.min.x,b.max.x].flatMap(x=>[b.min.y,b.max.y].flatMap(y=>[b.min.z,b.max.z].map(z=>new THREE.Vector3(x,y,z).project(view)))),xs=points.map(p=>(p.x+1)*160),ys=points.map(p=>(1-p.y)*247.5),rect={x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};for(const c of controls)assert(clear(rect,c),'the initial mobile FPS view keeps the actual molecule and bonds clear of the camera and walking controls');assert(rect.x>=protectedCore.x&&rect.y>=protectedCore.y&&rect.x+rect.width<=protectedCore.x+protectedCore.width&&rect.y+rect.height<=protectedCore.y+protectedCore.height,'the annotation exclusion actually encloses all atoms and bonds while they vibrate');}}
 const compactCamera=new THREE.PerspectiveCamera(65,244/160,.1,110),pose=carbonPose(0);compactCamera.position.set(pose.x,1.65,pose.z);compactCamera.rotation.set(pose.pitch,pose.yaw,0,'YXZ');built.update(model,.8,0);built.layoutLabels(compactCamera,{width:244,height:160});layouts++;shown+=built.annotations.filter(e=>e.m.userData.carbonLabel.layout).length;assert(built.heatLabel.m.userData.carbonLabel.layout,'when annotations compete for a tiny view, retain the current IR explanation before molecule/context names');
 for(const [time,stage] of [[.2,'incoming'],[.43,'absorbed'],[.659999,'absorbed'],[.66,'emitted'],[.8,'emitted'],[1,'incoming'],[1.8,'emitted'],[2.8,'emitted']]){
  built.update(model,time,0);assert.equal(built.radiation.userData.stage,stage);assert(built.radiation.visible&&built.heatLabel.m.visible);assert(built.heatLabel.m.userData.carbonLabel.text.startsWith(es?'ENERGÍA':'ENERGY'));assert(built.heatLabel.m.userData.carbonLabel.text.includes(es?'La molécula conserva su carbono':'The molecule keeps its carbon'));assert.equal(built.incoming.pulse.visible,stage==='incoming');assert.equal(built.outgoing.filter(r=>r.pulse.visible).length,stage==='emitted'?1:0);if(stage==='emitted')assert(built.outgoing[Math.floor(time)%3].pulse.visible);
 }
 built.update(model,10.5,3);const emitted=built.routes.find(r=>r.id==='emitted');assert(emitted.caption.m.visible&&emitted.caption.m.userData.carbonLabel.text.includes(fmt(0)));assert(built.routes.filter(r=>r.id!=='emitted').every(r=>r.packets.some(p=>p.visible)),'fossil stop leaves natural carbon exchanges active');assert(!built.radiation.visible&&!built.heatLabel.m.visible);
 assert.equal(new Set(built.resources).size,resourceCount);for(const e of built.annotations)for(const r of [e.texture,e.m.material,e.leader.geometry,e.leader.material])assert(built.resources.includes(r));built.resources.forEach(r=>r.dispose());
}
console.log(`Carbon scene: ${layouts} layouts, ${shown} projected labels; actual stock/flux quantities, matter/energy shapes, IR stages, fossil stop, conserved trace, bounds, fixed textures: OK`);
