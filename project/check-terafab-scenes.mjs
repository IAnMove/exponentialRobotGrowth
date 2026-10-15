import assert from 'node:assert/strict';
import * as THREE from './node_modules/three/build/three.module.js';
import * as model from './site-src/terafab/factory-model.js';
import {readFileSync} from 'node:fs';

// Inspect real meshes and caption textures without a WebGL context. Browser
// QA remains responsible for lighting, readable text and frame rate.
globalThis.document={createElement:()=>{
 const canvas={textLines:[],writes:[],fills:[]};let width=300,height=150;
 Object.defineProperties(canvas,{width:{get:()=>width,set:value=>{width=value;canvas.writes.push(['width',value]);}},height:{get:()=>height,set:value=>{height=value;canvas.writes.push(['height',value]);}}});
 const gradient=()=>({addColorStop(){}}),context=new Proxy({font:'10px sans-serif',measureText:text=>({width:String(text).length*24}),createLinearGradient:gradient,createRadialGradient:gradient,fillRect(){canvas.fills.push(this.fillStyle);},fillText(text){canvas.textLines.push(String(text));canvas.writes.push(['text',String(text)]);},clearRect(){canvas.textLines=[];canvas.writes.push(['clear']);}}, {get:(target,name)=>name in target?target[name]:()=>{}});
 canvas.getContext=()=>context;return canvas;
}};
const sourceCheck=process.argv.includes('--source');
const fabModule=sourceCheck?await import('data:text/javascript,'+encodeURIComponent(readFileSync('site-src/terafab/lab-world.js','utf8').replace("'../vendor/three.module.js'",JSON.stringify(new URL('./node_modules/three/build/three.module.js',import.meta.url).href)).replace("'./factory-model.js'",JSON.stringify(new URL('./site-src/terafab/factory-model.js',import.meta.url).href)).replace("'./walk.js'",JSON.stringify(new URL('./site-src/terafab/walk.js',import.meta.url).href)))):await import('./dist/terafab/lab-world.js');
const walkModule=await import('./site-src/terafab/walk.js');
const near=(a,b,message,epsilon=1e-8)=>assert(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<epsilon,message||`${a} != ${b}`);
function captionObserver(scene,resources){
 const images=new Map();return ()=>{
  const textures=resources.filter(resource=>resource.isCanvasTexture),textureSet=new Set(textures);assert.equal(textureSet.size,textures.length,'each caption texture has one owner');
  scene.traverse(object=>{const materials=Array.isArray(object.material)?object.material:[object.material];for(const material of materials)if(material?.map?.isCanvasTexture)assert(textureSet.has(material.map),'every displayed caption belongs to the GPU disposal list');});
  for(const texture of textures){const image=texture.image,current={width:image.width,height:image.height,text:[...image.textLines],writes:image.writes.length};if(images.has(image))assert.deepEqual(current,images.get(image),'uploaded canvas dimensions and text never mutate during seek');else images.set(image,current);}
 };
}
function snapshot(scene){
 scene.updateMatrixWorld(true);const result=[],geometries=new Set();
 scene.traverse(object=>{
  assert(object.matrixWorld.elements.every(Number.isFinite),'every visible or hidden transform remains finite');
  const geometry=object.geometry;if(geometry&&!geometries.has(geometry)){geometries.add(geometry);for(const attribute of Object.values(geometry.attributes))assert(attribute.array.every(Number.isFinite),'mesh positions and tensor attributes remain finite');}
  if(object.isInstancedMesh)assert([...object.instanceMatrix.array].every(Number.isFinite),'all tensor instances have finite matrices');
  const materials=(Array.isArray(object.material)?object.material:[object.material]).filter(Boolean);
  result.push([object.uuid,object.visible,...object.matrixWorld.elements,materials.map(material=>[material.uuid,material.color?.getHex(),material.opacity,material.emissiveIntensity,material.map?.uuid]),object.isInstancedMesh?[...object.instanceMatrix.array]:null,object.instanceColor?[...object.instanceColor.array]:null]);
 });
 return result;
}
const visible=object=>{for(let part=object;part;part=part.parent)if(!part.visible)return false;return true;};
function assertVisibleVerticesFit(roots,camera,message){
 const checked=new Set();for(const root of roots)if(root)root.traverse(part=>{
  if(checked.has(part)||!visible(part))return;checked.add(part);
  const points=[];
  if(part.isSprite){const center=part.getWorldPosition(new THREE.Vector3()).applyMatrix4(camera.matrixWorldInverse),scale=part.getWorldScale(new THREE.Vector3());for(const x of [-.5,.5])for(const y of [-.5,.5])points.push(new THREE.Vector3(center.x+x*scale.x,center.y+y*scale.y,center.z).applyMatrix4(camera.matrixWorld));}
  else if(part.isMesh){const vertices=part.geometry.attributes.position;for(let instance=0;instance<(part.isInstancedMesh?part.count:1);instance++){const matrix=part.matrixWorld.clone();if(part.isInstancedMesh){const local=new THREE.Matrix4();part.getMatrixAt(instance,local);matrix.multiply(local);}for(let i=0;i<vertices.count;i++)points.push(new THREE.Vector3().fromBufferAttribute(vertices,i).applyMatrix4(matrix));}}
  for(const point of points){const p=point.project(camera);assert(Math.abs(p.x)<=1+1e-6&&Math.abs(p.y)<=1+1e-6&&p.z>=-1&&p.z<=1,`${message}: real ${part.type} vertex projects to ${p.toArray()}`);}
 });
}
function spriteRect(sprite,camera){
 const center=sprite.getWorldPosition(new THREE.Vector3()).applyMatrix4(camera.matrixWorldInverse),scale=sprite.getWorldScale(new THREE.Vector3()),points=[];
 for(const x of [-.5,.5])for(const y of [-.5,.5])points.push(new THREE.Vector3(center.x+x*scale.x,center.y+y*scale.y,center.z).applyMatrix4(camera.matrixWorld).project(camera));
 return [Math.min(...points.map(p=>p.x)),Math.min(...points.map(p=>p.y)),Math.max(...points.map(p=>p.x)),Math.max(...points.map(p=>p.y))];
}
function assertSeparateCaptions(captions,camera,message){
 const shown=captions.filter(caption=>visible(caption.m));
 for(let i=0;i<shown.length;i++)for(let j=i+1;j<shown.length;j++){const a=spriteRect(shown[i].m,camera),b=spriteRect(shown[j].m,camera);assert(a[2]<=b[0]||b[2]<=a[0]||a[3]<=b[1]||b[3]<=a[1],`${message}: ${shown[i].m.material.map.image.textLines.join(' ')} overlaps ${shown[j].m.material.map.image.textLines.join(' ')}`);}
}
function disposeOnce(built){
 const resources=[...built.resources];assert.equal(new Set(resources).size,resources.length,'geometries, materials and textures are registered once');
 const counts=new Map(resources.map(resource=>[resource,0]));for(const resource of resources){assert.equal(typeof resource.dispose,'function');const original=resource.dispose;resource.dispose=function(){counts.set(resource,counts.get(resource)+1);return original.call(this);};}
 built.dispose();built.dispose();assert([...counts.values()].every(count=>count===1),'idempotent scene disposal releases each owned GPU resource once');
}


// Independent swept-path oracle samples geometry footprints; it does not call
// the navigator's own segment-clear predicate to decide whether a path is safe.
const distanceToRect=(x,z,b)=>Math.hypot(Math.max(b[0]-x,0,x-b[2]),Math.max(b[1]-z,0,z-b[3]));
let pathSamples=0,walkingSamples=0;
function safePoint(point,r,message){for(const box of walkModule.FAB_SOLIDS)assert(distanceToRect(point.x,point.z,box)>=r-1e-6,`${message}: (${point.x.toFixed(3)},${point.z.toFixed(3)}) enters solid ${box}`);}
for(let from=0;from<6;from++){
 const pose=walkModule.fabPoseAt(from);safePoint(pose,.24,'authored arrival');assert.equal(walkModule.fabNearestStand(pose)?.index,from);assert.equal(walkModule.fabNearestStand({...pose,yaw:pose.yaw+Math.PI}),null,'a stand behind the visitor is not activated with E');assert.equal(walkModule.fabNearestStand({...pose,pitch:1.2}),null,'looking above the physical button is not an activation');
 for(let to=0;to<6;to++){
  const target=walkModule.fabPoseAt(to),path=walkModule.fabGuidePath(pose,target);assert(path.length>=2,'every authored stand pair has a safe guide path');near(path[0].x,pose.x);near(path[0].z,pose.z);near(path.at(-1).x,target.x);near(path.at(-1).z,target.z);
  for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.025));for(let k=0;k<=steps;k++){safePoint({x:a.x+(b.x-a.x)*k/steps,z:a.z+(b.z-a.z)*k/steps},.25,'guide segment');pathSamples++;}}
 }
 for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2]){let walker={...pose,yaw};for(let i=0;i<200;i++){walker=walkModule.fabWalk(walker,{forward:1,strafe:i%3===0?.25:0},.05);safePoint(walker,.24,'walked visitor');walkingSamples++;}}
}
const start=walkModule.fabPoseAt(0),straight=walkModule.fabWalk(start,{forward:1,strafe:0},.05),diagonal=walkModule.fabWalk(start,{forward:1,strafe:1},.05);near(Math.hypot(straight.x-start.x,straight.z-start.z),Math.hypot(diagonal.x-start.x,diagonal.z-start.z),'diagonals do not walk faster');assert.deepEqual(walkModule.fabWalk(start,{forward:1,strafe:1},NaN),start);
const restored={...start,yaw:12.345,pitch:-.456};assert.deepEqual(walkModule.restoreFabPose(restored),restored);assert.notEqual(walkModule.restoreFabPose(restored),restored);assert.deepEqual(walkModule.restoreFabPose({x:0,z:-4,yaw:0,pitch:0}),start,'restoring into real equipment falls back to a safe arrival');

const position=(object)=>object.getWorldPosition(new THREE.Vector3()).toArray();
const endpoints=(mesh)=>[-.5,.5].map(y=>new THREE.Vector3(0,y,0).applyMatrix4(mesh.matrixWorld).toArray());
const vectorNear=(a,b,message)=>a.forEach((value,i)=>near(value,b[i],message));
const sameEnds=(mesh,a,b,message)=>{const ends=endpoints(mesh);assert(Math.min(Math.hypot(...ends[0].map((v,i)=>v-a[i]))+Math.hypot(...ends[1].map((v,i)=>v-b[i])),Math.hypot(...ends[1].map((v,i)=>v-a[i]))+Math.hypot(...ends[0].map((v,i)=>v-b[i])))<1e-7,message);};
const chapterFor=op=>op<3?2:op<5?3:op<9?4:5;
const faults=['none','illustrative-open'];let framesChecked=0,rayChecks=0,frusta=0,needleContacts=0,physicalContacts=0,occlusionRays=0,packageDetails=0;
const framingFailures=[];
function materialRay(scene,camera,point,allowed){
 const direction=point.clone().sub(camera.position),distance=direction.length(),ray=new THREE.Raycaster(camera.position,direction.normalize(),.001,distance+1e-5);ray.camera=camera;
 for(const hit of ray.intersectObjects(scene.children,true)){const object=hit.object;if(!visible(object)||object.isSprite||object.material?.opacity<=.6)continue;for(let parent=object;parent;parent=parent.parent)if(allowed.includes(parent))return {clear:true};return {clear:false,object,point:hit.point.toArray()};}return {clear:false,object:{type:'missing target surface',getWorldPosition:()=>point}};
}
function inspectOcclusion(built,frame,chapter,aspect){
 const {scene,parts}=built,camera=notebookCamera(frame,chapter,aspect),operation=frame.index;
 const opaqueBlockers=[];
 if(operation<=10){let seen=0;for(const i of [0,4,8]){const cell=parts.wafer.cells[i],top=operation===10?(visible(parts.dies[i].film)?parts.dies[i].film:parts.dies[i].body):visible(cell.resist)?cell.resist:visible(cell.film)?cell.film:null,point=top?new THREE.Vector3(0,.5,0).applyMatrix4(top.matrixWorld):new THREE.Vector3((i%3-1)*.28,.04,(Math.floor(i/3)-1)*.28).applyMatrix4(parts.wafer.group.matrixWorld),result=materialRay(scene,camera,point,[parts.wafer.group,...parts.dies.map(die=>die.group)]);occlusionRays++;if(result.clear)seen++;else opaqueBlockers.push(result.object);}
  if(!seen)framingFailures.push(`operation ${operation} aspect ${aspect}: all three wafer material rays are blocked by ${opaqueBlockers.map(object=>object.type+' '+object.getWorldPosition(new THREE.Vector3()).toArray()).join('; ')}`);
 }
 if(operation<=8)for(let i=0;i<9;i++){const cell=parts.section.cells[i],top=visible(cell.resist)?cell.resist:visible(cell.film)?cell.film:parts.section.body,point=new THREE.Vector3(top===parts.section.body?(-1.44+i*.36)/3.24:0,0,.5).applyMatrix4(top.matrixWorld),result=materialRay(scene,camera,point,[parts.section.group]);occlusionRays++;if(!result.clear)framingFailures.push(`operation ${operation} aspect ${aspect}: section cell ${i} blocked by ${result.object.type} at ${result.object.getWorldPosition(new THREE.Vector3()).toArray()}`);}
 if(operation>=11){for(const x of [-.35,0,.35]){const point=new THREE.Vector3(x,.5,0).applyMatrix4(parts.packageDetail.body.matrixWorld),result=materialRay(scene,camera,point,[parts.packageDetail.group]);occlusionRays++;if(!result.clear)framingFailures.push(`operation ${operation} aspect ${aspect}: magnified package surface blocked by ${result.object.type}`);}let seen=0;const blockers=[];for(const x of [-.35,0,.35]){const point=new THREE.Vector3(x,.5,0).applyMatrix4(parts.package.body.matrixWorld),result=materialRay(scene,camera,point,[parts.package.group,parts.dies.find(die=>die.id===frame.selectedDieId)?.group]);occlusionRays++;if(result.clear)seen++;else blockers.push(result.object);}if(!seen)framingFailures.push(`operation ${operation} aspect ${aspect}: all package material samples blocked by ${blockers.map(object=>object.type+' '+object.getWorldPosition(new THREE.Vector3()).toArray()).join('; ')}`);}
}
function assertPackageDetail(parts,frame,whole=false,immersive=false){
 const detail=parts.packageDetail;assert(detail,'the package has a reusable magnified view');assert.equal(detail.group.visible,frame.index>=11&&!whole);assert.equal(detail.group.userData.representsId,'package-1');assert.equal(detail.group.userData.countsAsObject,false,'magnification does not add another produced object');if(!detail.group.visible)return;
 assert.equal(detail.state,frame.package,'magnification consumes the identical package state');const station=model.STATIONS[frame.stationId].center,anchor=immersive?[4,1.75,3.55]:[station[0]-2.4,2.6,station[2]+3.2],angle=immersive?Math.PI/2:.72,scale=immersive?1.8:3.8,matrix=new THREE.Matrix4().compose(new THREE.Vector3(...anchor),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),angle),new THREE.Vector3(scale,scale,scale)),world=point=>new THREE.Vector3(...point).applyMatrix4(matrix).toArray();
 vectorNear(position(detail.group),anchor);vectorNear(position(detail.body),world([0,0,0]));near(detail.body.getWorldScale(new THREE.Vector3()).x,.88*scale);near(detail.body.getWorldScale(new THREE.Vector3()).y,.06*scale);near(detail.body.getWorldScale(new THREE.Vector3()).z,.78*scale);
 assert.equal(detail.die.group.visible,!!frame.package.dieId,'the magnified package cannot contain a future die');assert.equal(detail.die.group.userData.representsId,frame.package.dieId);assert.equal(detail.die.group.userData.countsAsObject,false);
 if(frame.package.dieId){const die=frame.objectById[frame.package.dieId];assert.equal(die.valid,true,'the magnified die is the same measured valid die');vectorNear(position(detail.die.body),world([0,.10,0]));for(let j=0;j<6;j++){const edge=die.circuit.edges[Math.floor(j/2)],segment=edge.segments[j%2],wire=detail.die.circuitSegments[j];assert.equal(wire.visible,!!segment&&edge.progress>0);if(wire.visible){const a=segment[0].map((value,k)=>value+(k===1?.10:0)),b=segment[0].map((value,k)=>value+(segment[1][k]-value)*edge.progress+(k===1?.10:0));sameEnds(wire,world(a),world(b),'the magnified network has the same material endpoints and measured continuity');}}}
 detail.connections.forEach((wire,i)=>{const bond=frame.package.connections[i];assert.equal(wire.visible,bond.progress>0);near(wire.userData.progress,bond.progress);assert.equal(wire.userData.connected,bond.connected);if(wire.visible){const pad=[i?.075:-.075,.12,0],terminal=[i?.35:-.35,.035,0],from=i===0?terminal:pad,to=i===0?pad:terminal,end=from.map((value,k)=>value+(to[k]-value)*bond.progress);sameEnds(wire,world(from),world(end),'enlarged bonds preserve actual input/output endpoints and construction progress');}});
 assert.equal(detail.enclosure.visible,frame.package.enclosureProgress>0);if(detail.enclosure.visible){near(detail.enclosure.scale.y,.25*frame.package.enclosureProgress);vectorNear(position(detail.enclosure),world([0,.125*frame.package.enclosureProgress,0]));}
 assert.equal(frame.ledger.dies.total,9);assert.equal(frame.ledger.dies.inPackage,frame.package.dieId?1:0);assert.equal(parts.circuitView.visible,false,'the magnified package replaces the generic duplicated network in assembly chapters');packageDetails++;
}
function notebookCamera(frame,chapter,aspect,whole=false,operation=frame.index){
 const fov=aspect<1?64:46,camera=new THREE.PerspectiveCamera(fov,aspect,.055,140),f=fabModule.fabFraming(chapter,{...fabModule.fabOverview,whole,operation:whole?null:operation},aspect,fov,frame);
 camera.position.copy(f.center).addScaledVector(f.direction,f.distance);camera.lookAt(f.center);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);return camera;
}
function fit(roots,camera,message){try{assertVisibleVerticesFit(roots,camera,message);}catch(error){if(framingFailures.length<24)framingFailures.push(error.message);}frusta++;}
for(const language of ['es','en'])for(const fault of faults){
 const built=fabModule.createFabScene(language==='es'),{scene,parts}=built,trace=model.makeFabTrace({fault}),captionCheck=captionObserver(scene,built.resources);
 assert.equal(built.stands.length,6);assert.equal(parts.dies.length,9);assert.equal(parts.needles.length,2);assert.equal(parts.section.cells.length,9);assert.equal(parts.wafer.cells.length,9);
 const materials=new Map([['wafer-1',parts.wafer.group],['foup-1',parts.foup],...parts.dies.map(die=>[die.id,die.group]),['package-1',parts.package.group]]),uuids=new Map([...materials].map(([id,group])=>[id,group.uuid]));assert.equal(uuids.size,12);
 for(let operation=0;operation<13;operation++)for(const local of [0,.37,2.75,3.5,4.4,5.19,5.2,6.37,7.8,8.55,9.99]){
  const frame=model.fabFrameAt(trace,operation*10+local),chapter=chapterFor(operation);built.update(frame,chapter,false,false);scene.updateMatrixWorld(true);captionCheck();assertPackageDetail(parts,frame);
  for(const object of frame.objects){const group=materials.get(object.id);assert(group);assert.equal(group.uuid,uuids.get(object.id),'the same material has the same rendered identity throughout the process');vectorNear(position(group),object.position,'the rendered object follows its model pose');assert.equal(group.userData.objectId,object.id);assert.equal(group.userData.holder,object.holder);}
  assert.equal(parts.wafer.body.visible,frame.wafer.cutProgress===0);assert.equal(parts.wafer.remnant.visible,frame.wafer.cutProgress>0);
  for(let i=0;i<9;i++)for(const section of [parts.wafer.cells,parts.section.cells]){const cell=section[i],film=frame.section.film[i],resist=frame.section.resist[i],h=section===parts.wafer.cells?.020:.20;near(cell.film.userData.amount,film);near(cell.resist.userData.amount,resist);near(cell.resist.userData.exposed,frame.section.exposed[i]);near(cell.film.scale.y,h*film,'actual thickness represents remaining material');near(cell.resist.scale.y,h*resist);if(section===parts.section.cells){assert.equal(cell.film.visible,film>0);assert.equal(cell.resist.visible,resist>0);}else{const retained=frame.wafer.remainingDieIds.includes('die-'+i);assert.equal(cell.film.visible,film>0&&retained);assert.equal(cell.resist.visible,resist>0&&retained);}}
  for(let i=0;i<9;i++){const die=parts.dies[i],state=frame.dies[i];assert.equal(die.body.userData.valid,state.valid);assert.equal(die.body.visible,state.holder!=='wafer-1'||frame.wafer.cutProgress>0);for(let j=0;j<6;j++){const edge=state.circuit.edges[Math.floor(j/2)],segment=edge.segments[j%2],wire=die.circuitSegments[j];assert.equal(wire.visible,!!segment&&edge.progress>0);if(wire.visible){const a=new THREE.Vector3(...segment[0]).applyMatrix4(die.group.matrixWorld).toArray(),b=new THREE.Vector3(...segment[1]).lerp(new THREE.Vector3(...segment[0]),1-edge.progress).applyMatrix4(die.group.matrixWorld).toArray();sameEnds(wire,a,b,'the physical wire preserves its network endpoints and explicit broken gap');assert.equal(wire.userData.broken,edge.broken);}}}
  for(const [id,station] of Object.entries(parts.stations)){const state=frame.machines[id];vectorNear(position(station.arm.endpoint),state.arm.end,'each tool owns a persistent model-controlled end-effector');if(station.door)near(station.door.position.y,1.65+1.55*state.chamberOpen);if(station.roof&&id===frame.stationId)assert.equal(station.roof.visible,false,'the active tool opens a didactic cutaway');}
  vectorNear(position(parts.handler.endpoint),frame.handler.end,'the handler owns the same contact point as its held object');
  assert.equal(parts.hoist.visible,operation<=10&&local<3.25);if(parts.hoist.visible)sameEnds(parts.hoist,frame.carrier.position,frame.foup.position.map((value,i)=>value+(i===1?.60:0)),'the hoist is physically joined to carrier and FOUP');
  parts.package.connections.forEach((wire,i)=>{const bond=frame.package.connections[i];assert.equal(wire.visible,bond.progress>0);near(wire.userData.progress,bond.progress);assert.equal(wire.userData.connected,bond.connected);if(wire.visible){const die=frame.objectById[frame.package.dieId],chipPad=[die.position[0]+(i?.075:-.075),die.position[1]+.02,die.position[2]],packagePad=new THREE.Vector3(i?.35:-.35,.035,0).applyMatrix4(parts.package.group.matrixWorld).toArray(),from=i===0?packagePad:chipPad,to=i===0?chipPad:packagePad,tip=from.map((value,k)=>value+(to[k]-value)*bond.progress);sameEnds(wire,from,tip,'a growing bond joins the literal input/output terminals only when physically complete');vectorNear(new THREE.Vector3(...wire.userData.from).applyMatrix4(parts.package.group.matrixWorld).toArray(),from);vectorNear(new THREE.Vector3(...wire.userData.to).applyMatrix4(parts.package.group.matrixWorld).toArray(),tip);}});assert.equal(parts.package.enclosure.visible,frame.package.enclosureProgress>0);if(parts.package.enclosure.visible)near(parts.package.enclosure.scale.y,.25*frame.package.enclosureProgress);
  vectorNear(position(parts.probeHead),frame.probe.head.position);parts.needles.forEach((needle,i)=>{vectorNear(position(needle.tip),frame.probe.needles[i].tip);sameEnds(needle.mesh,frame.probe.needles[i].base,frame.probe.needles[i].tip,'rendered needle endpoints match the causal probe');});
  if(frame.quality.probe.completed===0)assert(parts.circuitResult.m.material.map.image.textLines.join(' ').includes(language==='es'?'PENDIENTE':'PENDING'),'future pass/open labels are absent before measurement');
  framesChecked++;
 }
 // Exact contacts inspect the physical surface of each hand, not only metadata.
 for(const event of trace.events.filter(event=>event.type==='contact')){
  const frame=model.fabFrameAt(trace,event.time);built.update(frame,chapterFor(frame.index),false,false);scene.updateMatrixWorld(true);
  const tool=event.toolId==='handler-1'?parts.handler:parts.stations[event.toolId.slice(4)].arm;vectorNear(position(tool.endpoint),event.point);
  const physical=new THREE.Vector3(0,event.toolId==='handler-1'?-.5:.5,0).applyMatrix4(tool.hand.matrixWorld).toArray();vectorNear(physical,event.point,'the actual pick head or wafer blade touches the material');physicalContacts++;
 }
 for(const event of trace.events.filter(event=>event.type==='measurement'&&event.dieId)){
  const frame=model.fabFrameAt(trace,event.time);built.update(frame,5,false,false);scene.updateMatrixWorld(true);const i=Number(event.dieId.slice(4)),die=frame.dies[i];
  assert.equal(frame.probe.contactDieId,event.dieId);for(let j=0;j<2;j++){const expected=[die.position[0]+(j?.075:-.075),die.position[1]+.02,die.position[2]];vectorNear(event.contactPoints[j],expected,'measurement targets the selected die pads');vectorNear(position(parts.needles[j].tip),expected,'the visible tip is in contact with its measured die');const ends=endpoints(parts.needles[j].mesh);assert(Math.min(...ends.map(end=>Math.hypot(...end.map((v,k)=>v-expected[k]))))<1e-8,'a real endpoint of the needle geometry touches the pad');needleContacts++;}
 }
 // All six audio buttons must be the first opaque actionable hit, with a
 // fresh FPS visibility setup for every chapter. Comparing UUIDs avoids
 // recursively diffing a whole Three scene after a failure.
 for(let chapter=0;chapter<6;chapter++){
  const frame=model.fabFrameAt(trace,[0,0,16.37,36.37,66.37,96.37][chapter]);built.update(frame,chapter,false,true);scene.updateMatrixWorld(true);const pose=walkModule.fabPoseAt(chapter),camera=new THREE.PerspectiveCamera(72,.55,.055,140);camera.position.set(pose.x,1.65,pose.z);camera.rotation.set(pose.pitch,pose.yaw,0,'YXZ');camera.updateMatrixWorld(true);const buttonScreen=built.stands[chapter].getWorldPosition(new THREE.Vector3()).project(camera);assert(Math.abs(buttonScreen.x)<1&&Math.abs(buttonScreen.y)<1,'the physical listening button is on screen from its authored arrival');assert.equal(walkModule.fabNearestStand(pose)?.index,chapter,'E and the visible physical button select the same chapter');const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(buttonScreen.x,buttonScreen.y),camera);
  const hits=ray.intersectObjects(scene.children,true).filter(hit=>visible(hit.object)&&!hit.object.isSprite);let first=null;for(const hit of hits){if(hit.object.userData.action!==undefined||hit.object.userData.info){first=hit.object;break;}if(hit.object.material?.opacity>.6)break;}
  assert.equal(first?.uuid,built.stands[chapter].uuid,`chapter ${chapter} physical listening ray is blocked by ${hits[0]?.object.type} ${JSON.stringify(hits[0]?.object.userData)}`);assert.equal(parts.section.caption.m.visible,false);assert.equal(parts.circuitCaption.m.visible,false);assert.equal(parts.circuitResult.m.visible,false);rayChecks++;
 }
 // The enlarged package remains inspectable from the sixth stand through
 // selection, placement, partial bonding, enclosure and final measurement.
 for(const time of [110.37,111,113,115,115.2,116.37,116.5,117.37,117.8,121,123,125,127.79,129.99])for(const aspect of [.55,1.8]){
  const frame=model.fabFrameAt(trace,time);built.update(frame,5,false,true);scene.updateMatrixWorld(true);assertPackageDetail(parts,frame,false,true);const pose=walkModule.fabPoseAt(5),camera=new THREE.PerspectiveCamera(72,aspect,.055,140);camera.position.set(pose.x,1.65,pose.z);camera.rotation.set(pose.pitch,pose.yaw,0,'YXZ');camera.updateProjectionMatrix();camera.updateMatrixWorld(true);fit([parts.packageDetail.group],camera,`${language}/${fault} FPS package ${time} aspect ${aspect}`);
  const buttonScreen=built.stands[5].getWorldPosition(new THREE.Vector3()).project(camera),ray=new THREE.Raycaster();assert(Math.abs(buttonScreen.x)<1&&Math.abs(buttonScreen.y)<1);ray.setFromCamera(new THREE.Vector2(buttonScreen.x,buttonScreen.y),camera);let first=null;for(const hit of ray.intersectObjects(scene.children,true)){if(!visible(hit.object)||hit.object.isSprite)continue;if(hit.object.userData.action!==undefined||hit.object.userData.info){first=hit.object;break;}if(hit.object.material?.opacity>.6)break;}assert.equal(first?.uuid,built.stands[5].uuid,'magnification does not cover the physical audio button');rayChecks++;
  for(const x of [-.35,0,.35]){const point=new THREE.Vector3(x,.5,0).applyMatrix4(parts.packageDetail.body.matrixWorld),result=materialRay(scene,camera,point,[parts.packageDetail.group]);occlusionRays++;assert(result.clear,`the FPS magnified package surface is occluded at ${time} aspect ${aspect}`);}
 }
 for(const aspect of [.55,1.8]){
  for(let operation=0;operation<13;operation++){const frame=model.fabFrameAt(trace,operation*10+6.37),chapter=chapterFor(operation);built.update(frame,chapter,false,false);scene.updateMatrixWorld(true);inspectOcclusion(built,frame,chapter,aspect);}
  const frame=model.fabFrameAt(trace,66.37);built.update(frame,4,true,false);scene.updateMatrixWorld(true);fit([scene],notebookCamera(frame,4,aspect,true),`${language}/${fault} whole ${aspect}`);
  for(let operation=0;operation<13;operation++)for(const local of [.37,6.37,8.55]){
   const frame=model.fabFrameAt(trace,operation*10+local),chapter=chapterFor(operation);built.update(frame,chapter,false,false);scene.updateMatrixWorld(true);const transport=['lift','travel','lower'].includes(frame.phase)&&operation<=10;
   const roots=transport?[parts.wafer.group,parts.foup,parts.carrier,parts.hoist]:[parts.stations[frame.stationId].group,parts.stations[frame.stationId].arm.hand,operation<11?parts.wafer.group:null,parts.section.group];
   if(operation===9&&!transport)roots.push(parts.probeHead,...parts.needles.map(needle=>needle.mesh),parts.circuitView);
   if(operation>=10&&!transport){roots.push(parts.handler.hand,parts.circuitView);if(operation<12)roots.push(parts.rack,...parts.dies.filter(die=>die.body.visible).map(die=>die.group));else roots.push(parts.dies.find(die=>die.id===frame.selectedDieId)?.group);if(operation>=11)roots.push(parts.package.group,parts.packageDetail.group);}
   const camera=notebookCamera(frame,chapter,aspect);fit(roots,camera,`${language}/${fault} operation ${operation} ${local} aspect ${aspect}`);
   if(!transport){try{assertSeparateCaptions([parts.stations[frame.stationId].title,parts.stations[frame.stationId].status,parts.section.caption,parts.condensedCaption,parts.circuitCaption,parts.circuitResult,parts.packageDetail.caption],camera,`${language} operation ${operation} aspect ${aspect}`);}catch(error){if(framingFailures.length<24)framingFailures.push(error.message);}}
  }
 }
 // Warm finite status labels, then reverse to the exact same meshes,
 // transforms, material maps and cached text without allocating a new world.
 const complete=model.fabFrameAt(trace,130);built.update(complete,5,true,false);assertPackageDetail(parts,complete,true,false);const partial=model.fabFrameAt(trace,46.37);built.update(partial,3,false,false);captionCheck();const before=snapshot(scene),count=built.resources.length;built.update(model.fabFrameAt(trace,130),5,false,false);built.update(partial,3,false,false);captionCheck();assert.deepEqual(snapshot(scene),before,'rewind restores exact rendered state');assert.equal(built.resources.length,count,'rewind reuses finite caption and hardware resources');disposeOnce(built);
}
assert.deepEqual([...new Set(framingFailures)].slice(0,24),[],'all causally relevant physical geometry and captions must fit and remain unobstructed in desktop/mobile framing');
console.log(`Terafab scenes (${sourceCheck?'source':'dist'}): ${framesChecked} bilingual fractional material states, ${physicalContacts} real blade/pick contacts, ${needleContacts} actual needle-pad contacts, ${rayChecks} physical audio rays, ${frusta} desktop/mobile frusta and ${occlusionRays} material/section visibility rays and ${packageDetails} exact package magnifications, ${pathSamples} safe guide samples / ${walkingSamples} walking samples, persistent 12-object identity, exact rewind and single GPU ownership/disposal: OK`);
