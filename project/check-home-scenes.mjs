import assert from 'node:assert/strict';
import * as THREE from './node_modules/three/build/three.module.js';
import * as model from './site-src/home/model.js';
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
const homeModule=sourceCheck?await import('data:text/javascript,'+encodeURIComponent(readFileSync('site-src/home/world.js','utf8').replace("'../vendor/three.module.js'",JSON.stringify(new URL('./node_modules/three/build/three.module.js',import.meta.url).href)).replace("'./model.js'",JSON.stringify(new URL('./site-src/home/model.js',import.meta.url).href)))):await import('./dist/home/world.js');
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
function disposeOnce(resources){
 assert.equal(new Set(resources).size,resources.length,'geometries, materials and textures are registered once');
 const counts=new Map(resources.map(resource=>[resource,0]));for(const resource of resources){assert.equal(typeof resource.dispose,'function');const original=resource.dispose;resource.dispose=function(){counts.set(resource,counts.get(resource)+1);return original.call(this);};}for(const resource of resources)resource.dispose();assert([...counts.values()].every(count=>count===1),'every owned GPU resource is disposed exactly once');
}


const sourceFrame=(params,time)=>model.homeFrameAt(model.makeHomeTrace(params),time),IDS=['floor','dishes','cook','laundry','bed','bath','plan'];
const distanceToRect=(x,z,b)=>Math.hypot(Math.max(b[0]-x,0,x-b[2]),Math.max(b[1]-z,0,z-b[3]));
const collisionSolids=homeModule.HOME_SOLIDS.filter(b=>!homeModule.HOME_STAND_SOLIDS.includes(b));
// Independent swept-segment oracle: densely sample each polyline, rather than
// using the navigation implementation's own segmentClear/A* predicate.
let pathSamples=0;
function checkSegment(a,b,r,solids,message){const length=Math.hypot(b.x-a.x,b.z-a.z),n=Math.max(1,Math.ceil(length/.025));for(let i=0;i<=n;i++){const x=a.x+(b.x-a.x)*i/n,z=a.z+(b.z-a.z)*i/n;for(const box of solids)assert(distanceToRect(x,z,box)>=r-1e-6,`${message}: (${x.toFixed(3)},${z.toFixed(3)}) enters solid ${box}`);pathSamples++;}}
for(let start=0;start<7;start++)for(let end=0;end<7;end++){
 const a=homeModule.homePoseAt(start),b=homeModule.homePoseAt(end),route=homeModule.homeGuidePath(a,b);assert(route.length>0,`guided path ${start}→${end} exists`);near(route[0].x,a.x);near(route[0].z,a.z);near(route.at(-1).x,b.x);near(route.at(-1).z,b.z);for(let i=1;i<route.length;i++)checkSegment(route[i-1],route[i],.25,homeModule.HOME_SOLIDS,`guided path ${start}→${end}`);
}
// Body trajectories use the actual scene's wall and furniture footprints.
// Hands may reach a surface, but the standing/crouching body cannot pass
// through it. Listening pedestals are excluded from operator trajectories.
let actorSamples=0;
for(const capacity of ['human','robots']){
 const trace=model.makeHomeTrace({capacity,overhead:20});
 for(let i=0;i<=2800;i++){
  const frame=model.homeFrameAt(trace,i*.025);
  for(const [name,actor] of Object.entries(frame.actors))if(actor.active){const [x,y,z]=actor.position,r=name==='vacuum'?.30:.18;for(const box of collisionSolids)assert(distanceToRect(x,z,box)>=r-1e-6,`${capacity} ${name} body at ${frame.time.toFixed(3)} (${x.toFixed(3)},${z.toFixed(3)}) enters actual wall/furniture ${box}`);actorSamples++;}
 }
}
let builds=0,frames=0,frusta=0,rays=0,captionViews=0,handEndpoints=0,maxReach=0,maxBones=0,maxReachCase,contactViews=0,postureViews=0;const projectionFailures=[];function projectionCheck(fn){try{fn();}catch(error){if(error.code!=='ERR_ASSERTION')throw error;projectionFailures.push(error.message);}}
for(const es of [true,false]){
 const built=homeModule.createHomeScene(es),{scene,parts,resources,targets,stands,update}=built,observe=captionObserver(scene,resources);builds++;
 assert(parts.props===parts.propById,'prop aliases share one stable Map');assert.equal(parts.props.size,49);assert.equal(stands.length,7);assert.deepEqual(stands.map(button=>button.userData.action),[0,1,2,3,4,5,6]);assert(stands.every(button=>targets.includes(button)));const identities=new Map([...parts.props].map(([id,record])=>[id,[record.group.uuid,record.body.uuid]])),foldIdentities=new Map([...parts.props].filter(([,record])=>record.foldFlaps).map(([id,record])=>[id,record.foldFlaps.map(flap=>flap.group.uuid)]));
 const initial=sourceFrame({},0);update(initial,0,false,true);observe();
 for(const capacity of ['human','robots'])for(const overhead of [0,20])for(let chapter=0;chapter<7;chapter++)for(const local of [0,.5,1.7,2.7,4.35,5.5,6.5,7.6,8.9,9.999,10]){
  const frame=sourceFrame({capacity,overhead},chapter*10+local);update(frame,chapter,false,true);frames++;assert.equal(visible(parts.simulationCaptions[chapter].m),false,'FPS uses the readable DOM state header without a duplicate world caption');assert.equal(built.state,frame);observe();snapshot(scene);
  for(const object of frame.objects){const record=parts.props.get(object.id);assert(record);assert.deepEqual([record.group.uuid,record.body.uuid],identities.get(object.id),'objects are moved, never replaced by success tokens');assert.equal(record.state,object);assert.equal(record.group.visible,object.visible);assert.equal(record.body.userData.status,object.status);assert.equal(record.body.userData.holder,object.holder);assert.equal(record.body.userData.ready,object.ready);record.group.getWorldPosition(new THREE.Vector3()).toArray().forEach((v,i)=>near(v,object.position[i]));['x','y','z'].forEach((axis,i)=>near(record.group.rotation[axis],object.rotation[i]));if(record.foldFlaps){assert.deepEqual(record.foldFlaps.map(flap=>flap.group.uuid),foldIdentities.get(object.id));const progress=object.foldProgress??(object.status==='folded'?1:0);record.foldFlaps.forEach(flap=>near(flap.group.rotation.z,-flap.sign*Math.PI*progress,'the same garment flaps fold continuously'));near(record.group.scale.z,1-.10*progress);}}
  for(const name of ['human','robot']){const record=parts.actors[name],actor=frame.actors[name];assert(record.group.visible);assert.equal(record.active,actor.active);assert.deepEqual(record.heldIds,actor.heldIds);near(record.neck.position.y,1.38-.46*actor.crouch);near(record.head.position.y,1.57-.46*actor.crouch);record.group.getWorldPosition(new THREE.Vector3()).toArray().forEach((v,i)=>near(v,actor.position[i]));for(const side of ['left','right']){const arm=record.arms[side];if(arm.reach>maxReach){maxReach=arm.reach;maxReachCase={time:frame.time,name,side,capacity,position:actor.position,hand:actor.hands[side],crouch:actor.crouch};}maxBones=Math.max(maxBones,arm.upper.scale.y+arm.lower.scale.y);assert(arm.reach<=.85+1e-8,`bounded shoulder-to-hand reach at ${frame.time}: ${arm.reach}`);assert(arm.upper.scale.y+arm.lower.scale.y<=.87+1e-8,'arms cannot stretch arbitrarily to reach props');const hand=arm.hand.getWorldPosition(new THREE.Vector3()).toArray();hand.forEach((v,i)=>near(v,actor.hands[side][i],'rendered hands reach the model world contact, not decorative waving'));handEndpoints++;}}
  parts.actors.vacuum.group.getWorldPosition(new THREE.Vector3()).toArray().forEach((v,i)=>near(v,frame.actors.vacuum.position[i]));assert.equal(parts.dishwasher.state,frame.appliances.dishwasher);assert.equal(parts.washerDryer.state,frame.appliances.washerDryer);assert.equal(parts.hob.userData.state,frame.appliances.hob);assert.equal(parts.planningPanel.state,frame.planning);if(chapter===6){const scope=parts.simulationCaptions[6].m.material.map.image.textLines.join(' ');assert.match(scope,capacity==='human'?(es?/Trabajo humano/:/Human work/):overhead>0?(es?/IA · ejemplo ficticio/:/AI · fictional example/):(es?/delegación completa supuesta/:/assumed full delegation/));if(frame.planning.reviewReady&&!frame.planning.approved)assert.match(parts.planningPanel.review.m.material.map.image.textLines.join(' '),frame.planning.reviewRequired?(es?/humana/:/human/):(es?/delegada.*supuesto/:/delegated.*assumed/));}
  const last=frame.contacts.at(-1),current=last&&Math.abs(frame.time-last.time)<=.22;assert.equal(parts.contactMarker.visible,!!current);assert.equal(parts.contactLine.visible,!!current);if(current){assert.equal(parts.contactMarker.userData.contact,last);parts.contactMarker.position.toArray().forEach((v,i)=>near(v,last.point[i]));}
 }
 for(const capacity of ['human','robots']){
  const trace=model.makeHomeTrace({capacity,overhead:20});
  for(const contact of trace.contacts){const frame=model.homeFrameAt(trace,contact.time),chapter=Math.min(6,Math.floor(contact.time/10));update(frame,chapter,false,true);const effector=contact.tool==='vacuum'?parts.actors.vacuum.group.getWorldPosition(new THREE.Vector3()):contact.tool==='cloth-tool'?parts.props.get('cloth-tool').group.getWorldPosition(new THREE.Vector3()):parts.actors[contact.actor].arms[contact.tool==='leftHand'?'left':'right'].hand.getWorldPosition(new THREE.Vector3());assert(effector.distanceTo(new THREE.Vector3(...contact.point))<=contact.radius+1e-8,'rendered tool reaches each contact at its causal timestamp');const last=frame.contacts.at(-1);assert(parts.contactMarker.visible);parts.contactMarker.getWorldPosition(new THREE.Vector3()).toArray().forEach((v,i)=>near(v,last.point[i]));contactViews++;}
  for(const edge of [14.38,14.5,16.4,16.52,31.88,32,32.96,33.08,34,34.69,37.5,37.915,42.5,44,45.3,47.9,55,59.7]){const a=model.homeFrameAt(trace,edge-1e-6),b=model.homeFrameAt(trace,edge+1e-6),record=parts.actors[capacity==='human'?'human':'robot'];update(a,Math.min(6,Math.floor(edge/10)),false,true);const before=record.neck.getWorldPosition(new THREE.Vector3());update(b,Math.min(6,Math.floor(edge/10)),false,true);assert(before.distanceTo(record.neck.getWorldPosition(new THREE.Vector3()))<.001,'a crouch transition does not teleport the head or neck');postureViews++;}
 }
 for(const time of [2.35,12.75,23.28,36.55,47.35,56.95,66.8]){
  const chapter=Math.min(6,Math.floor(time/10)),frame=sourceFrame({overhead:20},time);update(frame,chapter,false,true);observe();const partial=snapshot(scene),count=resources.length;update(frame,chapter,false,true);assert.deepEqual(snapshot(scene),partial);assert.equal(resources.length,count);update(sourceFrame({overhead:20},70),chapter,false,true);observe();update(frame,chapter,false,true);observe();assert.deepEqual(snapshot(scene),partial,'rewind restores every body/prop/appliance/contact pose exactly');
 }
 update(sourceFrame({},11.7),1,false,false);observe();const caption=parts.simulationCaptions[1],original=caption.m.material.map;update(sourceFrame({},17.5),1,false,false);observe();assert.notEqual(caption.m.material.map,original);update(sourceFrame({},11.7),1,false,false);observe();assert.equal(caption.m.material.map,original,'returning to the same phrase reuses an immutable GPU caption');
 for(let chapter=0;chapter<7;chapter++){
  // Restore the actual FPS mode before each ray, then compare bounded UUIDs.
  // A missing ray hit must never make assert recursively diff a whole scene.
  update(initial,chapter,false,true);scene.updateMatrixWorld(true);const pose=homeModule.homePoseAt(chapter),camera=new THREE.PerspectiveCamera(64,1,.055,120);camera.position.set(pose.x,1.65,pose.z);camera.rotation.set(pose.pitch,pose.yaw,0,'YXZ');camera.updateMatrixWorld(true);const button=stands[chapter],position=button.getWorldPosition(new THREE.Vector3()),ray=new THREE.Raycaster(camera.position,position.clone().sub(camera.position).normalize());
  // This mirrors the real world obstruction rule: opaque architecture/furniture
  // can block a stand even if they are not registered interaction targets.
  ray.camera=camera;const hits=ray.intersectObjects(scene.children,true).filter(h=>visible(h.object)&&!h.object.isSprite),hit=hits.find(h=>h.object.userData.action!==undefined||h.object.userData.info||h.object.material?.opacity>.6)?.object;
  projectionCheck(()=>assert.equal(hit?.uuid,button.uuid,`stand ${chapter} physical click has an exposed button (actual ${hit?.userData?.action??hit?.userData?.objectId??hit?.type??'none'})`));rays++;
  projectionCheck(()=>assert.equal(homeModule.homeNearestStand(pose)?.index,chapter,`E selects the visible stand ${chapter} from its authored arrival`));
  const roomCaptions=[[],[parts.applianceCaptions.dishwasher,parts.applianceCaptions.hob],[parts.applianceCaptions.dishwasher,parts.applianceCaptions.hob],[parts.applianceCaptions.washerDryer,parts.applianceCaptions.foldboard],[],[],[parts.planningPanel.input,parts.planningPanel.draft,parts.planningPanel.review]];const captions=[parts.simulationCaptions[chapter],...roomCaptions[chapter]].filter(Boolean);
  for(const aspect of [.55,1.8]){
   const fps=camera.clone();fps.aspect=aspect;fps.updateProjectionMatrix();fps.updateMatrixWorld(true);for(const params of chapter===6?[{capacity:'robots',overhead:0},{capacity:'robots',overhead:20},{capacity:'human',overhead:0},{capacity:'human',overhead:20}]:[{}])for(const time of [chapter*10,chapter*10+5.5,chapter*10+8.9,chapter*10+9.9]){update(sourceFrame(params,time),chapter,false,true);scene.updateMatrixWorld(true);projectionCheck(()=>assertSeparateCaptions(captions,fps,`FPS chapter ${chapter} aspect ${aspect}`));captionViews++;}
   for(const params of chapter===6?[{capacity:'robots',overhead:0},{capacity:'robots',overhead:20},{capacity:'human',overhead:0},{capacity:'human',overhead:20}]:[{}])for(const whole of [false,true])for(const local of [0,2.75,5.5,8.9,10]){
    const frame=sourceFrame(params,chapter*10+local),fov=aspect<1?64:46,framing=homeModule.homeFraming(chapter,{whole,distance:10},aspect,fov,frame),view=new THREE.PerspectiveCamera(fov,aspect,.055,120);view.position.copy(framing.center).addScaledVector(framing.direction,framing.distance);view.lookAt(framing.center);view.updateMatrixWorld(true);update(frame,chapter,whole,false);scene.updateMatrixWorld(true);assert.equal(visible(parts.simulationCaptions[chapter].m),!whole,'focused notebook retains its physical operation caption');
    const b=framing.bounds;for(const x of [b[0],b[3]])for(const y of [b[1],b[4]])for(const z of [b[2],b[5]]){const p=new THREE.Vector3(x,y,z).project(view);assert(Math.abs(p.x)<=1&&Math.abs(p.y)<=1&&p.z>=-1&&p.z<=1,'declared camera bounds fit');}
    const taskProps=[...parts.props.values()].filter(record=>record.spec.taskId===IDS[chapter]).map(record=>record.group),machines=[[],[parts.dishwasher.group],[parts.board,parts.pot],[parts.basket,parts.washerDryer.group,parts.foldboard],[parts.bedBase,parts.mattress],[parts.basin],[parts.planningPanel.screen]],operator=frame.actors[frame.capacity==='human'?'human':'robot'],activeActor=operator.active&&homeModule.homeRoomAt({x:operator.position[0],z:operator.position[2]})?.id===homeModule.HOME_ROOMS[homeModule.HOME_CHAPTER_ROOMS[chapter]].id?[parts.actors[frame.capacity==='human'?'human':'robot'].group]:[],hardware=whole?[parts.architecture,...parts.roomGroups,...parts.props.values()].map(p=>p.group||p):[...taskProps,...machines[chapter],...activeActor,stands[chapter]];
    projectionCheck(()=>assertVisibleVerticesFit(hardware,view,`notebook ${chapter} whole${whole} aspect${aspect} time${frame.time}`));if(!whole){projectionCheck(()=>assertVisibleVerticesFit([built.annotations[chapter]],view,`notebook captions ${chapter}`));projectionCheck(()=>assertSeparateCaptions(captions,view,`notebook chapter ${chapter} aspect ${aspect}`));captionViews++;}frusta++;
   }
  }
 }
 update(sourceFrame({},70),6,true,false);observe();const final=snapshot(scene);update(sourceFrame({},70),6,true,false);assert.deepEqual(snapshot(scene),final);assert.equal(parts.contactMarker.visible,false);assert(parts.actors.human.group.visible,'the person remains in their home after delegation');assert(parts.roomGroups.every(group=>group.visible),'furniture does not vanish when tasks are done');disposeOnce(resources);
}
assert.equal(projectionFailures.length,0,'Camera/stand/caption failures:\n'+[...new Set(projectionFailures)].join('\n'));
console.log(`Home scenes: ${builds} bilingual real Three builds (${sourceCheck?'source':'dist'}), ${frames} physical states, ${handEndpoints} real hand endpoints, ${contactViews} exact tool contacts, ${postureViews} continuous posture boundaries, ${frusta} mobile/desktop stage/whole frusta, ${rays} occlusion-aware physical stand rays, ${captionViews} notebook/FPS caption projections, ${actorSamples} actor/vacuum collision samples and ${pathSamples} independent guide segment samples; stable props, reversible poses, immutable captions and unique GPU disposal: OK (no pixel rendering)`);
