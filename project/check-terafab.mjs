import assert from 'node:assert/strict';
import * as THREE from './node_modules/three/build/three.module.js';
import {readFileSync} from 'node:fs';
import * as factory from './site-src/terafab/factory-model.js';
const sourceCheck=process.argv.includes('--source');
const campusModule=sourceCheck?await import('data:text/javascript,'+encodeURIComponent(readFileSync('site-src/terafab/world.js','utf8').replace("'../vendor/three.module.js'",JSON.stringify(new URL('./node_modules/three/build/three.module.js',import.meta.url).href)))):await import('./dist/terafab/world.js');
const {buildCampus,carrierPosition,HALLS}=campusModule,spanishWorld=sourceCheck?campusModule:await import('./dist/es/terafab/world.js');
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
globalThis.document={documentElement:{lang:'en'}};const en=await import(sourceCheck?'./site-src/terafab/places.js?test=en':'./dist/terafab/places.js');globalThis.document.documentElement.lang='es';const es=await import(sourceCheck?'./site-src/terafab/places.js?test=es':'./dist/es/terafab/places.js');
assert.equal(en.places.length,16);assert.deepEqual(en.places.map(p=>[p.id,p.position,p.view]),es.places.map(p=>[p.id,p.position,p.view]));for(const p of es.places)assert(p.body&&p.equipment&&p.evidence&&es.sources[p.source]);
console.log(`Terafab: ${instances} static instances, ${meshes} meshes; roof/layer views, carrier continuity and stops, camera framing, 16 bilingual areas OK`);

// Nine visual cross-section cells and nine die samples are not wafer output.
const near=(a,b,message)=>assert(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<1e-8,message||`${a} != ${b}`);
const stageIds=['wafer','deposit','coat','expose','develop','etch','strip','inspect','repeat','probe','dice','package','final'];
assert.deepEqual(factory.STAGES,stageIds);assert.equal(factory.DURATION,130);
const expectedTotals=[[0,0],[9,0],[9,9],[9,9],[9,6],[6,6],[6,0],[6,0],[6,0],[6,0],[6,0],[6,0],[6,0]];
function deepFrozen(value,seen=new Set()){if(!value||typeof value!=='object'||seen.has(value))return;seen.add(value);assert(Object.isFrozen(value),'trace and frames are deeply immutable');for(const child of Object.values(value))deepFrozen(child,seen);}
function independentContinuity(circuit){
 // Connectivity follows rendered metal endpoints, including the literal open
 // gap. The oracle never uses the edge's broken flag to decide the result.
 const key=point=>point.map(value=>Math.round(value*1e9)).join(','),links=new Map(),node=id=>circuit.nodes.find(node=>node.id===id).position;
 const connect=(a,b)=>{if(!links.has(a))links.set(a,new Set());links.get(a).add(b);};
 for(const edge of circuit.edges)for(const [a,b] of edge.segments){const progress=edge.progress??1;if(progress<=0)continue;const end=a.map((value,i)=>value+(b[i]-value)*progress),from=key(a),to=key(end);connect(from,to);connect(to,from);}
 const target=key(node(circuit.output)),seen=new Set(),queue=[key(node(circuit.input))];while(queue.length){const point=queue.pop();if(point===target)return true;if(seen.has(point))continue;seen.add(point);queue.push(...(links.get(point)||[]));}return false;
}
const ids=['wafer-1','foup-1',...Array.from({length:9},(_,i)=>'die-'+i),'package-1'];
let materialFrames=0,contactFrames=0,boundaryFrames=0;
for(const fault of ['none','illustrative-open']){
 const trace=factory.makeFabTrace({fault});deepFrozen(trace);assert.equal(trace.horizon,130);assert.equal(trace.operations.length,13);assert.equal(trace.params.fault,fault);const immutable=JSON.stringify(trace);
 assert.deepEqual(trace.operations.map(operation=>operation.id),stageIds);assert.equal(new Set(trace.events.map(event=>event.id)).size,trace.events.length);
 for(let operation=0;operation<13;operation++){
  const end=factory.fabFrameAt(trace,operation*10+9.99),[film,resist]=expectedTotals[operation];near(end.ledger.film.remaining,film,'independent end-stage film amount');near(end.ledger.resist.remaining,resist,'independent end-stage temporary mask amount');
  for(let i=0;i<9;i++){near(end.section.film[i],operation===0?0:operation<5||![1,4,7].includes(i)?1:0);near(end.section.resist[i],operation<2||operation>=6?0:operation<4||![1,4,7].includes(i)?1:0);near(end.section.exposed[i],operation>=3&&[1,4,7].includes(i)?1:0);}
  for(const local of [0,.37,2.75,3.5,4.4,5.19,5.2,6.37,7.8,8.55,9.99]){
   const time=operation*10+local,frame=factory.fabFrameAt(trace,time);deepFrozen(frame);assert.equal(frame.time,time);assert.equal(frame.index,operation);assert.equal(frame.stageId,stageIds[operation]);assert.equal(frame.continuous,true);assert.deepEqual(frame.objects.map(object=>object.id),ids);assert.equal(new Set(frame.objects.map(object=>object.id)).size,12);assert(frame.objects.every(object=>object.visible));
   for(const object of frame.objects){assert.equal(frame.objectById[object.id],object);assert(object.position.every(Number.isFinite));assert(object.rotation.every(Number.isFinite));near(Math.hypot(...object.quaternion),1);}
   for(const values of [frame.section.film,frame.section.resist,frame.section.exposed]){assert.equal(values.length,9);assert(values.every(value=>value>=0&&value<=1));}
   near(frame.ledger.film.added,frame.ledger.film.remaining+frame.ledger.film.etched,'film is conserved while moving and etching');near(frame.ledger.resist.applied,frame.ledger.resist.remaining+frame.ledger.resist.developed+frame.ledger.resist.stripped,'temporary resist is conserved in both removal steps');
   const inventory=frame.ledger.dies;assert.equal(inventory.total,9);assert.equal(inventory.onWafer+inventory.rack+inventory.inTransfer+inventory.inPackage,9);assert(inventory.rejectedInRack<=inventory.rack);assert.equal(frame.wafer.remainingDieIds.length,inventory.onWafer);
   assert.equal(frame.ledger.probe.pending+frame.ledger.probe.continuous+frame.ledger.probe.open,9);assert.equal(frame.quality.probe.completed,9-frame.ledger.probe.pending);assert.equal(frame.quality.probe.results.length,9);
   for(const [i,result] of frame.quality.probe.results.entries()){const measuredAt=95.2+2.6*(i+1)/9,expected=time>=measuredAt?!(fault==='illustrative-open'&&i===0):null;assert.equal(result.valid,expected,'a die remains pending until its own measurement ends');assert.equal(frame.dies[i].valid,expected);assert.equal(result.measuredAt,expected===null?null:measuredAt);if(expected!==null)assert.equal(result.valid,independentContinuity(frame.dies[i].circuit),'measured validity comes from network reachability');}
   assert.equal(frame.quality.inspection.valid,time>=77.8?true:null);assert.equal(frame.quality.final.valid,time>=127.8?true:null,'final result requires the measured valid die, both bonds and final socket');
   assert.equal(frame.selectedDieId,time>=111?'die-'+(fault==='none'?0:1):null);assert.equal(frame.package.dieId,time>=115?'die-'+(fault==='none'?0:1):null);assert.equal(frame.package.assembled,time>=117.8);assert.equal(frame.package.connections.length,2);assert.equal(frame.package.connections.every(bond=>bond.connected),time>=116.5);
   assert(frame.events.every(event=>event.time<=time));assert(frame.contacts.every(event=>event.type==='contact'&&event.time<=time));assert.deepEqual(frame.events.map(event=>event.id),trace.events.filter(event=>event.time<=time).map(event=>event.id));
   if(time<105.2){assert.equal(inventory.onWafer,9);assert.equal(inventory.rack,0);assert.equal(inventory.inPackage,0);}if(time>=108&&time<111){assert.equal(inventory.rack,9);assert.equal(inventory.inPackage,0);}if(time>=115){assert.equal(inventory.inPackage,1);assert.equal(inventory.rack,8);assert.equal(inventory.rejectedInRack,fault==='none'?0:1);}
   if(frame.wafer.holder==='foup-1')assert.deepEqual(frame.wafer.position,frame.foup.position);if(frame.wafer.holder.startsWith('arm:')){const arm=frame.machines[frame.wafer.holder.slice(4)].arm;frame.wafer.position.forEach((value,i)=>near(arm.end[i],value+(i===1?-.04:0),'the blade remains in contact with the held wafer'));assert(frame.foup.doorOpen>.99);assert(frame.machines[frame.stationId].chamberOpen>.99);}
   if(frame.handler.holdingId){const held=frame.objectById[frame.handler.holdingId],offset=held.type==='package'?.25:.015;held.position.forEach((value,i)=>near(frame.handler.end[i],value+(i===1?offset:0),'the pick head touches the object it actually holds'));}
   assert.equal(JSON.stringify(factory.fabFrameAt(trace,time)),JSON.stringify(frame));materialFrames++;
  }
 }
 for(let operation=0;operation<10;operation++){const held=factory.fabFrameAt(trace,operation*10+9.99),transport=factory.fabFrameAt(trace,(operation+1)*10+4.95);assert.deepEqual(transport.section.film,held.section.film,'transport never transforms film');assert.deepEqual(transport.section.resist,held.section.resist,'transport never transforms resist');}
 for(let i=0;i<9;i++){const end=95.2+2.6*(i+1)/9,before=factory.fabFrameAt(trace,end-1e-6),after=factory.fabFrameAt(trace,end);assert.equal(before.quality.probe.completed,i);assert.equal(after.quality.probe.completed,i+1);assert.equal(before.quality.probe.results[i].valid,null);assert.equal(after.quality.probe.results[i].valid,!(fault==='illustrative-open'&&i===0));}
 for(const event of trace.events.filter(event=>event.type==='measurement'&&event.dieId)){
  const frame=factory.fabFrameAt(trace,event.time),index=Number(event.dieId.slice(4)),die=frame.dies[index];assert.equal(frame.probe.contactDieId,event.dieId);assert.equal(frame.probe.contact,true);
  for(let needle=0;needle<2;needle++){const expected=[die.position[0]+(needle?.075:-.075),die.position[1]+.02,die.position[2]];expected.forEach((value,i)=>{near(frame.probe.needles[needle].tip[i],value,'electrical measurement requires contact with the literal input/output pad');near(event.contactPoints[needle][i],value);});}
 }
 const probeBoundaries=[94.8,95.2,97.8,98];for(let i=1;i<9;i++){probeBoundaries.push(95.2+i*2.6/9,95.2+(i+.4)*2.6/9);}for(const time of probeBoundaries){const before=factory.fabFrameAt(trace,time-1e-6).probe,after=factory.fabFrameAt(trace,time+1e-6).probe;for(const key of ['base','tip'])for(let i=0;i<2;i++)assert(Math.hypot(...before.needles[i][key].map((value,k)=>value-after.needles[i][key][k]))<.001,'the same probe needle cannot teleport across a measurement boundary');assert(Math.hypot(...before.head.position.map((value,k)=>value-after.head.position[k]))<.001);}
 assert(factory.fabFrameAt(trace,98).probe.needles.every(needle=>needle.tip[1]>2),'both needles retract before wafer return');
 for(const event of trace.events.filter(event=>event.type==='contact')){const frame=factory.fabFrameAt(trace,event.time),object=frame.objectById[event.objectId],tool=event.toolId==='handler-1'?frame.handler:frame.machines[event.toolId.slice(4)].arm;object.position.forEach((value,i)=>{near(value,event.objectPosition[i],'contact targets the current material pose');near(value+event.localPoint[i],event.point[i]);near(tool.end[i],event.point[i],'real end-effector reaches the announced contact');});assert.equal(frame.contacts.at(-1).id,event.id);contactFrames++;}
 const edges=new Set([0,130,105.2,105.8,106,108,110,111,115,115.2,116.5,117.8,120,121,125,125.2,127.8,...trace.events.map(event=>event.time)]);for(let i=0;i<11;i++)for(const local of [0,1,2.5,3.25,3.75,4,5,5.2,7.8,8,9,9.6,10])edges.add(i*10+local);
 for(const edge of edges){if(edge<=0||edge>=130)continue;const a=factory.fabFrameAt(trace,edge-1e-6),b=factory.fabFrameAt(trace,edge+1e-6);for(const id of ids){const x=a.objectById[id],y=b.objectById[id];assert(Math.hypot(...x.position.map((value,i)=>value-y.position[i]))<.001,`${id} cannot teleport at ${edge}`);}for(const id of Object.keys(a.machines))assert(Math.hypot(...a.machines[id].arm.end.map((value,i)=>value-b.machines[id].arm.end[i]))<.001,`the same machine arm cannot teleport at ${edge}`);assert(Math.hypot(...a.handler.end.map((value,i)=>value-b.handler.end[i]))<.001,`handler cannot teleport at ${edge}`);boundaryFrames++;}
 const partial=factory.fabFrameAt(trace,46.37);factory.fabFrameAt(trace,130);assert.deepEqual(factory.fabFrameAt(trace,46.37),partial,'rewind exactly reconstructs held objects, materials and results');assert.equal(JSON.stringify(trace),immutable);deepFrozen(factory.fabFrameAt(trace,130));assert.equal(factory.fabFrameAt(trace,130).active,false);for(const invalid of [-1,NaN,Infinity])assert.equal(factory.fabFrameAt(trace,invalid).time,0);assert.equal(factory.fabFrameAt(trace,999).time,130);
 const graph=trace.dieTemplates[1].circuit;assert.equal(factory.circuitContinuity(graph),true);assert.equal(factory.circuitContinuity({...graph,edges:[]}),false);assert.equal(factory.circuitContinuity({...graph,edges:graph.edges.map((edge,i)=>({...edge,progress:i===1?.99:1}))}),false);assert.equal(factory.circuitContinuity({...graph,edges:[...graph.edges].reverse().map(edge=>({...edge,from:edge.to,to:edge.from}))}),true,'continuity cannot depend on edge ordering or direction');
}
console.log(`Terafab sample (${sourceCheck?'source':'dist'} campus): ${materialFrames} immutable fractional states, ${contactFrames} exact material/end-effector contacts, ${boundaryFrames} continuous object/arm boundaries; independent nine-cell material and nine-die inventories, causal individual continuity/probe/package tests, explicit fault and exact rewind: OK`);
