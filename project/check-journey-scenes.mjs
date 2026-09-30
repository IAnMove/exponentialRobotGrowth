import assert from 'node:assert/strict';
import {LESSONS} from './site-src/journeys/catalog.js';
import {defaults,poseAt} from './site-src/journeys/common.js';
import * as THREE from './node_modules/three/build/three.module.js';
// Exercise the real scene builder and geometries, without a WebGL context or browser.
globalThis.document={createElement:()=>({getContext:()=>({measureText:s=>({width:s.length*24}),fillText(){},clearRect(){},fillRect(){}})})};
const {createLessonScene}=await import('./dist/journeys/world.js');
for(const es of [true,false])for(const lesson of Object.values(LESSONS)){
 const built=createLessonScene(lesson,es);const {scene,resources,targets,update}=built;
 if(lesson.id==='ideas'){assert.equal(built.people.length,64);assert.equal(built.stands.length,4);assert.equal(new Set(built.people.map(p=>p.g.uuid)).size,64);const s=lesson.evaluate(defaults(lesson),0);built.update(s,.5,0);assert.equal(built.state.known.size,1);assert.equal(built.packets.filter(p=>p.visible).length,4);assert.equal(built.links.filter(l=>l.m.visible).length,s.edges.length);built.update(s,1,0);assert.equal(built.state.known.size,5);assert.equal(built.people.filter(p=>p.halo.visible).length,4);}
 if(lesson.id==='carbon'){
  const params=defaults(lesson),model=lesson.evaluate(params,0);assert.equal(built.routes.length,5);assert.equal(built.stands.length,4);assert.equal(Object.keys(built.reservoirs).length,4);
  built.update(model,9.5,3);assert(built.routes.find(r=>r.id==='emitted').packets.some(m=>m.visible));assert(Math.abs(built.state.total-100)<1e-8);
  built.update(model,10.5,3);assert.equal(built.routes.find(r=>r.id==='emitted').packets.some(m=>m.visible),false);assert(built.routes.filter(r=>r.id!=='emitted').every(r=>r.packets.some(m=>m.visible)),'stopping fossils must leave natural exchanges visible');
  assert.equal(built.state.reason,'stopped');built.update(model,.5,0);assert.equal(built.state.reason,'active','rewinding reopens the source');
  for(const id of ['air','land','ocean','fossil'])assert(Math.abs(built.reservoirs[id].fill.scale.x-built.state[id]/100)<1e-8,'all reservoir rails have the same mass scale');
 }
 if(lesson.id==='electricity'){
  const model=lesson.evaluate(defaults(lesson),0),route=id=>built.routes.find(r=>r.id===id),near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`),visiblePackets=r=>r.packets.filter(p=>p.visible).length;
  assert.equal(built.stands.length,4);assert.deepEqual(built.stands.map(button=>button.userData.action),[0,1,2,3]);assert(built.stands.every(button=>targets.includes(button)),'all listening pedestals are actionable');
  assert.equal(built.panels.length,6);assert(built.panels.every(panel=>panel.cells.length===20),'PV panels contain a visible cell grid');
  assert.equal(built.parts.blades.length,3);assert(built.parts.generator&&built.parts.shaft&&built.parts.city,'wind conversion and community loads are physical parts');
  scene.updateMatrixWorld(true);
  for(const transformer of Object.values(built.transformers)){
   assert.equal(transformer.core.length,4);const boxes=transformer.core.map(part=>new THREE.Box3().setFromObject(part)),center=boxes.reduce((sum,box)=>sum.add(box.getCenter(new THREE.Vector3())),new THREE.Vector3()).multiplyScalar(.25);
   assert(boxes.every(box=>!box.containsPoint(center)),'the closed magnetic core has a central opening');
   for(let i=0;i<4;i++)assert.equal(boxes.filter((box,j)=>i!==j&&boxes[i].clone().expandByScalar(1e-6).intersectsBox(box)).length,2,'four core bars join into a closed loop');
   const primary=new THREE.Box3().setFromObject(transformer.primary.coil),secondary=new THREE.Box3().setFromObject(transformer.secondary.coil);
   assert(!primary.intersectsBox(secondary),'primary and secondary coils are spatially isolated');assert(targets.includes(transformer.primary.coil)&&targets.includes(transformer.secondary.coil));
  }
  built.update(model,0,3,true);near(built.state.stored,10);near(built.battery.fill.scale.x,.5);
  built.update(model,.5,3,true);near(built.state.stored,7);near(built.battery.fill.scale.x,.35);assert.equal(built.state.completed,0);
  for(const id of ['solarDC','solarAC','charge']){assert.equal(route(id).flow,0);assert.equal(visiblePackets(route(id)),0,'zero power never has moving energy packets');}
  near(route('discharge').flow,6);assert(visiblePackets(route('discharge'))>0);near(route('transmission').flow,built.state.generated);near(route('received').flow,built.state.received);near(route('loss').flow,built.state.loss);
  built.update(model,1,3,true);near(built.state.stored,4);near(built.battery.fill.scale.x,.2);
  built.update(model,2,3,true);near(built.state.stored,0);near(built.battery.fill.scale.x,0);assert.equal(route('discharge').flow,0);assert.equal(visiblePackets(route('discharge')),0,'an empty battery stops its outgoing packets');
  const surplus=lesson.evaluate({sun:40,demand:10,voltage:400},0),charging=surplus.trace.hours.find(h=>h.charge>0),curtailed=surplus.trace.hours.find(h=>h.curtailed>0);
  assert(charging&&curtailed,'this scenario must exercise both storage and source curtailment');
  built.update(surplus,charging.hour+.5,3,true);assert(route('charge').flow>0&&visiblePackets(route('charge'))>0);assert.equal(route('discharge').flow,0);assert.equal(visiblePackets(route('discharge')),0);near(built.battery.fill.scale.x,built.state.stored/20);
  const effectiveEnd=(r,end)=>r.curve.getPoint(r.direction===-1?1-end:end),bus=built.parts.distributionBus.position,battery=built.battery.group.position;
  assert(effectiveEnd(route('charge'),0).distanceTo(bus)<.3&&effectiveEnd(route('charge'),1).distanceTo(battery)<1,'charging flows from distribution toward storage');
  assert(effectiveEnd(route('discharge'),0).distanceTo(battery)<1&&effectiveEnd(route('discharge'),1).distanceTo(bus)<.3,'discharging reverses the storage exchange');
  built.update(surplus,curtailed.hour+.5,0,true);assert(built.curtail.power>0&&built.curtail.group.visible);assert(built.curtail.group.position.x<-7,'curtailment is shown in the generating area');
  near(built.state.potential,built.state.generated+built.state.curtailed);near(built.curtail.power,built.state.curtailed);near(route('transmission').flow,built.state.generated);near(route('wind').flow+route('solarAC').flow,built.state.generated);
  assert(!built.routes.some(r=>/curtail/i.test(r.id)),'unused source capacity is not a flow through the electrical line');
  near(built.comparison.power,30);near(built.comparison.low.current,600);near(built.comparison.low.loss,7.2);near(built.comparison.selected.current,75);near(built.comparison.selected.loss,.1125);
  built.update(model,.2,1,true);const arrow=built.transformers.stepUp.flux[0],positive=new THREE.Vector3(0,1,0).applyQuaternion(arrow.arrow.quaternion);
  built.update(model,.6,1,true);const negative=new THREE.Vector3(0,1,0).applyQuaternion(arrow.arrow.quaternion);assert(positive.dot(negative)<-.99,'magnetic flux direction alternates without connecting the isolated windings');
  built.update(model,24,3,true);assert.equal(built.state.active,false);assert.equal(built.state.completed,24);assert.equal(built.state.hour,23);assert(built.routes.every(r=>r.flow===0&&visiblePackets(r)===0),'the completed day does not animate an invented 25th hour');near(built.battery.fill.scale.x,built.state.stored/20);assert.equal(built.curtail.power,0);
  for(const time of [.5,1,2,12.5,24]){built.update(model,time,3,true);scene.updateMatrixWorld(true);scene.traverse(object=>assert(object.matrixWorld.elements.every(Number.isFinite),'Electricity fractional/empty/end transforms are finite'));assert(built.battery.fill.scale.x>=0&&built.battery.fill.scale.x<=1);}
 }
 if(lesson.id==='electricity'){
  const model=lesson.evaluate(defaults(lesson),0);
  for(const time of [0,.5,6.3,12.4]){built.update(model,time,0);scene.updateMatrixWorld(true);const localAxis=new THREE.Vector3(0,1,0),shaftAxis=localAxis.clone().applyQuaternion(built.parts.shaft.getWorldQuaternion(new THREE.Quaternion())),magnetAxis=localAxis.clone().applyQuaternion(built.parts.magnetRotor.getWorldQuaternion(new THREE.Quaternion()));assert(Math.abs(shaftAxis.dot(magnetAxis))>1-1e-10,'generator rotation must remain coaxial with the turbine shaft');}
 }
 if(lesson.id==='evolution'){
  const params={...defaults(lesson),mutation:.05},model=lesson.evaluate(params,0),trace=model.trace;
  const actuallyVisible=object=>{for(let o=object;o;o=o.parent)if(!o.visible)return false;return true;};
  const cellColor={A:0xb7e293,B:0xd9a4d3};
  assert.equal(built.parents.length,50);assert.equal(built.offspring.length,50);assert.equal(built.links.length,50);assert.equal(built.stands.length,4);
  assert.deepEqual(built.stands.map(button=>button.userData.action),[0,1,2,3]);assert(built.stands.every(button=>targets.includes(button)),'all four listening buttons are actionable objects');
  built.update(model,.68,2);
  assert.equal(built.parents.filter(record=>actuallyVisible(record.group)).length,50);assert.equal(built.offspring.filter(record=>actuallyVisible(record.group)).length,50);
  assert.equal(built.parents.filter(record=>record.body.material.color.getHex()===cellColor.A).length,25);
  assert(built.parents.every(record=>record.group.scale.x===1),'selection does not enlarge fitter organisms');
  assert(built.parents.every(record=>record.body.scale.equals(built.parents[0].body.scale)),'variants use the same schematic body size');
  for(let i=0;i<50;i++){
   const link=built.links[i],event=trace.generations[1].events[i],child=built.offspring[i];
   assert.equal(link.event,event);assert.equal(built.parents[link.parentIndex].id,event.parentId,'each line starts at the recorded real parent');
   assert(link.curve.getPoint(0).distanceTo(built.parents[link.parentIndex].group.position)<.11,'line origin lies at its parent');
   assert.equal(child.body.material.color.getHex(),cellColor[event.parentAllele],'copied allele is not changed before the mutation stage');assert.equal(child.halo.visible,false);
  }
  built.update(model,.8,2);
  assert(trace.generations[1].mutations>0,'this test run must exercise an actual mutation');
  built.offspring.forEach((child,i)=>{const event=trace.generations[1].events[i];assert.equal(child.id,event.id);assert.equal(child.body.material.color.getHex(),cellColor[event.allele]);assert.equal(child.halo.visible,event.mutated,'only a recorded mutation gets the mutation halo');});
  built.update(model,1-1e-9,3);assert.equal(built.state.t,0);assert.equal(built.state.countA,25);assert.equal(built.state.frequency,.5,'complete counts stay unchanged until the generation boundary');
  built.update(model,1,3);assert.equal(built.state.t,1);assert.equal(built.state.countA,trace.generations[1].countA);
  assert.deepEqual(built.parents.map(cell=>cell.id),trace.generations[1].cohort.map(cell=>cell.id));assert.equal(built.parents.filter(cell=>cell.body.material.color.getHex()===cellColor.A).length,trace.generations[1].countA);
  assert.equal(built.offspring.filter(cell=>actuallyVisible(cell.group)).length,0,'a fresh next generation has no formed copies yet');
  built.update(model,80,3);assert.equal(built.state.next,null);assert.equal(built.parents.filter(cell=>actuallyVisible(cell.group)).length,50);assert.equal(built.offspring.filter(cell=>actuallyVisible(cell.group)).length,0);assert(built.links.every(link=>!actuallyVisible(link.line)));
  const deterministic=lesson.evaluate({...params,drift:false},7);built.update(deterministic,7.8,3);
  assert.equal(built.state.countA,null);assert.equal(built.parents.filter(cell=>actuallyVisible(cell.group)).length,0);assert.equal(built.offspring.filter(cell=>actuallyVisible(cell.group)).length,0);assert(built.links.every(link=>!actuallyVisible(link.line)),'no synthetic genealogies for the infinite-population reference');
  assert(actuallyVisible(built.expectedGroup));assert(Math.abs(built.expectedBar.a.scale.x-built.state.frequency)<1e-10,'the continuous fraction is displayed without rounding to 50 bodies');
 }
 assert(targets.length>0,lesson.id+' needs inspectable teaching objects');
 const states=[lesson.evaluate(defaults(lesson),0),lesson.evaluate(defaults(lesson),lesson.horizon)];
 for(const state of states){update(state,lesson.continuous?(state.continuous??state.t??state.interval):5,3);scene.updateMatrixWorld(true);let meshes=0;scene.traverse(o=>{assert([...o.matrixWorld.elements].every(Number.isFinite),lesson.id+' invalid transform');if(o.isMesh){meshes++;const positions=o.geometry.attributes.position;assert([...positions.array].every(Number.isFinite),lesson.id+' invalid geometry');}});assert(meshes>40,lesson.id+' needs a built scene');}
 for(let stop=0;stop<4;stop++){const p=(lesson.poseAt||poseAt)(stop),camera=new THREE.PerspectiveCamera(60,1,.08,150);camera.position.set(p.x,1.65,p.z);camera.rotation.set(p.pitch,p.yaw,0,'YXZ');camera.updateMatrixWorld(true);const direction=new THREE.Vector3();camera.getWorldDirection(direction);const to=new THREE.Vector3(...(['evolution','electricity'].includes(lesson.id)?built.focus[stop]:lesson.id==='carbon'?[[-7,4.6,0],[-4,1.5,0],[5,0,0],[-1,1.5,1]][stop]:[0,lesson.id==='ideas'?1.2:1.9,lesson.id==='ideas'?0:-stop*16])).sub(camera.position).normalize();assert(direction.dot(to)>.97,'arrival faces the actual exhibit');}
 resources.forEach(r=>r.dispose());
}
console.log('16 bilingual scene builds: actual Three.js meshes, Electricity closed cores/isolated coils/power routes/storage/curtailment, finite geometry, Evolution genealogy/mutation timing, no rounded deterministic bodies, four actionable stands and camera poses: OK (no pixel rendering)');
