import assert from 'node:assert/strict';
import * as THREE from './node_modules/three/build/three.module.js';
import * as model from './site-src/spacex/model.js';
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
const spaceModule=sourceCheck?await import('data:text/javascript,'+encodeURIComponent(readFileSync('site-src/spacex/world.js','utf8').replace("'../vendor/three.module.js'",JSON.stringify(new URL('./node_modules/three/build/three.module.js',import.meta.url).href)).replace("'./model.js'",JSON.stringify(new URL('./site-src/spacex/model.js',import.meta.url).href)))):await import('./dist/spacex/world.js');
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



const cases=[{vehicle:'falcon',recovery:'droneship'},{vehicle:'falcon',recovery:'rtls'},{vehicle:'falcon',recovery:'expendable'},{vehicle:'starship',recovery:'droneship'}],TIMES=[0,7.49,7.5,8,20,27,28,29.99,30,31,32,34,38,43,44,50,55,58,65,70,72,74,78,81.99,82,83.99,84,85,90,92,93,96,98,98.99,99,100];
const frameAt=(params,time)=>model.flightFrameAt(model.makeFlightTrace(params),time),vectorNear=(a,b,message)=>{assert.equal(a.length,b.length);a.forEach((v,i)=>near(v,b[i],message));};
const projectionFailures=[];function projectionCheck(fn){try{fn();}catch(error){if(error.code!=='ERR_ASSERTION')throw error;projectionFailures.push(error.message);}}
function physicalBounds(root){const bounds=new THREE.Box3();root.traverse(part=>{if(!part.isMesh||!visible(part))return;const vertices=part.geometry.attributes.position;for(let i=0;i<vertices.count;i++)bounds.expandByPoint(new THREE.Vector3().fromBufferAttribute(vertices,i).applyMatrix4(part.matrixWorld));});return bounds;}
function fullSnapshot(built){return [...snapshot(built.scene),['smoke',...built.parts.smoke.positions,...built.parts.smoke.sizes,...built.parts.smoke.alpha,...built.parts.smoke.colors],['plumes',built.engineRecords.map(record=>record.uniforms.map(u=>[u.uTime.value,u.uPower.value]))],['terrain',built.parts.ground.material.uniforms.uTime.value]];}
let builds=0,states=0,nozzleOracles=0,frusta=0,contacts=0;
for(const es of [true,false]){
 const built=spaceModule.createSpaceScene(es),{scene,parts,resources,update}=built;builds++;const observe=captionObserver(scene,resources),falcon=parts.vehicles.falcon,starship=parts.vehicles.starship;
 assert.equal(falcon.engines.length,9);assert.equal(falcon.upperEngines.length,1);assert.equal(starship.engines.length,33);assert.equal(starship.upperEngines.length,6);assert.equal(built.engineRecords.length,49);assert.equal(falcon.legs.length,4);assert.equal(falcon.fins.length,4);assert.equal(falcon.fairings.length,2);assert.equal(starship.fins.length,3,'the declared V3 configuration has three grid fins');assert.equal(starship.pins.length,2);assert.equal(starship.flaps.length,4);assert(starship.tiles.isInstancedMesh);assert.equal(starship.upperEngines.filter(record=>record.type==='vacuum').length,3);assert.equal(starship.upperEngines.filter(record=>record.type==='sea').length,3);
 const engineUUIDs=built.engineRecords.map(record=>[record.id,record.group.uuid,record.exit.uuid,record.plume.uuid,record.bell.uuid]),hardwareUUIDs=[falcon.booster.uuid,falcon.upper.uuid,falcon.payload.uuid,...falcon.fairings.map(p=>p.group.uuid),...falcon.legs.map(p=>p.foot.uuid),starship.booster.uuid,starship.upper.uuid,starship.payload.uuid,...starship.pins.map(p=>p.mesh.uuid)],resourceCount=resources.length;
 assert.notEqual(falcon.fairings[0].group.uuid,falcon.fairings[1].group.uuid);for(const fairing of falcon.fairings){assert(fairing.shell.geometry.type==='LatheGeometry');near(fairing.shell.geometry.parameters.phiLength,Math.PI,'two actual half shells enclose the payload');}
 for(const params of cases)for(const time of TIMES){
  const frame=frameAt(params,time),vehicle=params.vehicle==='falcon'?falcon:starship,inactive=params.vehicle==='falcon'?starship:falcon;update(frame);states++;observe();fullSnapshot(built);assert(built.state===frame);assert.equal(vehicle.group.visible,true);assert.equal(inactive.group.visible,false);assert.equal(resources.length,resourceCount,'seek does not create new resources');assert.deepEqual(built.engineRecords.map(record=>[record.id,record.group.uuid,record.exit.uuid,record.plume.uuid,record.bell.uuid]),engineUUIDs);assert.deepEqual([falcon.booster.uuid,falcon.upper.uuid,falcon.payload.uuid,...falcon.fairings.map(p=>p.group.uuid),...falcon.legs.map(p=>p.foot.uuid),starship.booster.uuid,starship.upper.uuid,starship.payload.uuid,...starship.pins.map(p=>p.mesh.uuid)],hardwareUUIDs);
  const hardware={booster:vehicle.booster,upper:vehicle.upper,payload:vehicle.payload,...(params.vehicle==='falcon'?{fairingLeft:falcon.fairings[0].group,fairingRight:falcon.fairings[1].group}:{})};
  for(const [id,group] of Object.entries(hardware)){const expected=frame.parts[id];assert.equal(group.visible,expected.visible);vectorNear(group.getWorldPosition(new THREE.Vector3()).toArray(),expected.position,`rendered ${id} world position follows the causal model`);vectorNear(group.getWorldQuaternion(new THREE.Quaternion()).toArray(),expected.quaternion,`rendered ${id} rotation follows the world quaternion`);}
  for(const id of ['booster','upper']){
   const records=id==='booster'?vehicle.engines:vehicle.upperEngines,engine=frame.engines[id],root=id==='booster'?vehicle.booster:vehicle.upper,position=frame.parts[id].position,quaternion=new THREE.Quaternion(...frame.parts[id].quaternion);
   for(const [i,record] of records.entries()){
    const expected=engine.firing&&engine.representativeIndices.includes(i);assert.equal(record.on,expected);assert.equal(record.plume.visible,expected);assert(record.plume.parent===record.exit,'each flame is actually parented to its own nozzle exit');vectorNear(record.plume.getWorldPosition(new THREE.Vector3()).toArray(),record.exit.getWorldPosition(new THREE.Vector3()).toArray(),'flame throat cannot float detached from an engine');const exhaust=new THREE.Vector3(0,-1,0).applyQuaternion(record.plume.getWorldQuaternion(new THREE.Quaternion())),axis=new THREE.Vector3(0,-1,0).applyQuaternion(quaternion);near(exhaust.dot(axis),1,'plume travels away from the rotated engine rather than always down the screen');for(const uniform of record.uniforms){near(uniform.uTime.value,time);near(uniform.uPower.value,expected?engine.throttle:0);}if(expected)assert(record.plume.scale.y>0);nozzleOracles++;
   }
  }
  assert([...inactive.engines,...inactive.upperEngines].every(engine=>!engine.on&&!engine.plume.visible),'the hidden architecture cannot leave old engine flames alive');assert.equal(parts.flameLight.intensity>0,frame.engines.booster.firing||frame.engines.upper.firing);assert.equal(parts.smoke.points.userData.modelTime,time);assert(parts.smoke.alpha.every(value=>Number.isFinite(value)&&value>=0&&value<=1));assert(parts.smoke.sizes.every(value=>Number.isFinite(value)&&value>=0));assert(frame.effects.smokeSamples.every(sample=>sample.emitted<time),'smoke comes from past emission, never a future burn');
  if(params.vehicle==='falcon')falcon.payloadWings.forEach(wing=>near(wing.hinge.rotation.z,wing.side*Math.PI/2*(1-frame.payloadDeploy),'the existing payload panels unfold after deployment, without new hardware'));
 }
 for(const params of cases)for(const time of [7.75,29.99,37.35,61.5,80.4,93.6,99.5]){
  const frame=frameAt(params,time);update(frame);const paused=fullSnapshot(built);update(frame);assert.deepEqual(fullSnapshot(built),paused,'pause freezes smoke geometry, plumes and every hardware pose');update(frameAt(params,100));update(frame);assert.deepEqual(fullSnapshot(built),paused,'rewind reconstructs particles and hardware exactly');
 }
 for(const recovery of ['droneship','rtls']){
  const target=recovery==='rtls'?[-6.5,.15,0]:[16,.25,0],frame=frameAt({vehicle:'falcon',recovery},84);update(frame);assert.equal(frame.legsDeploy,1);for(const leg of falcon.legs){const contact=falcon.booster.localToWorld(leg.contactLocal.clone()),footBounds=physicalBounds(leg.foot);near(contact.y,target[1],'deployed foot point reaches the real pad/deck plane');near(footBounds.min.y,target[1],'the physical foot underside meets the plane');near(Math.hypot(contact.x-target[0],contact.z-target[2]),.65,'four spread feet support the booster');}const pad=recovery==='rtls'?parts.pads.RTLS:parts.pads.ASDS,top=physicalBounds(pad);assert(target[0]>=top.min.x&&target[0]<=top.max.x&&target[2]>=top.min.z&&target[2]<=top.max.z);
  if(recovery==='droneship'){
   const deckSurfaces=[];pad.traverse(mesh=>{if(!mesh.isMesh||!visible(mesh))return;const bounds=physicalBounds(mesh),size=bounds.getSize(new THREE.Vector3());if(size.x>2&&size.z>4)deckSurfaces.push(bounds);});
   const support=deckSurfaces.filter(bounds=>Math.abs(bounds.max.y-target[1])<1e-6);assert.equal(support.length,1,'one real painted deck surface supports the legs; the hull top must not be coplanar and fight for pixels');
   for(const leg of falcon.legs){const point=falcon.booster.localToWorld(leg.contactLocal.clone());assert(point.x>=support[0].min.x&&point.x<=support[0].max.x&&point.z>=support[0].min.z&&point.z<=support[0].max.z,'each deployed foot lies above the actual painted support surface');}
  }
  assert(falcon.engines.every(engine=>!engine.on));contacts+=4;
 }
 update(frameAt({vehicle:'starship'},82));for(const pin of starship.pins){const point=pin.point.getWorldPosition(new THREE.Vector3()),bottom=physicalBounds(pin.mesh).min.y,arm=parts.tower.arms.find(arm=>arm.sign===pin.sign),armPoint=arm.group.localToWorld(arm.contactLocal.clone()),armBounds=physicalBounds(arm.beam);near(point.y,11,'the approved capture height is independent of the launch mount');near(bottom,11,'pin underside physically touches the arm');near(armBounds.max.y,11,'the beam top is the support surface');vectorNear(point.toArray(),armPoint.toArray(),'both separated pins meet their actual catch arms');contacts++;}
 const caughtBounds=physicalBounds(starship.booster),mountBounds=physicalBounds(parts.pads.starMount);assert(caughtBounds.min.y>mountBounds.max.y+.5,'the captured booster is suspended clear of the launch mount, not also standing on it');near(frameAt({vehicle:'starship'},82).parts.booster.position[1]-frameAt({vehicle:'starship'},0).parts.booster.position[1],3,'caught booster is three scene units above its launch root');
 update(frameAt({vehicle:'starship'},99));for(const engine of starship.upperEngines){near(engine.exit.getWorldPosition(new THREE.Vector3()).y,0,'the bottom nozzle exit meets the ocean at first splash contact');near(physicalBounds(engine.bell).min.y,0,'a physical engine bell first touches the water');assert.equal(engine.on,false);contacts++;}assert.equal(built.state.result.upperRecovered,false);
 for(const params of cases)for(const time of [0,7.75,8,27,29.99,30,38,43,50,61.5,72,74,80,82,84,85,93,96,98,99,100])for(const view of ['follow','booster','upper','overview'])for(const aspect of [.55,1.8]){
  const frame=frameAt(params,time),vehicle=params.vehicle==='falcon'?falcon:starship,fov=aspect<1?62:46,framing=spaceModule.spaceFraming(frame,view,{},aspect,fov),camera=new THREE.PerspectiveCamera(fov,aspect,.045,600);camera.position.copy(framing.center).addScaledVector(framing.direction,framing.distance);camera.position.y=Math.max(.15,camera.position.y);camera.lookAt(framing.center);camera.updateMatrixWorld(true);update(frame);scene.updateMatrixWorld(true);
  // The expected subject policy is an independent user-facing contract:
  // follow the stack/ascent, then returning booster, then upper-stage outcome.
  const subject=view==='follow'?(time<50?'stack':time<85?'booster':'upper'):view,booster=subject==='stack'||subject==='booster'||subject==='overview',upper=subject==='stack'||subject==='upper'||subject==='overview',roots=[];
  if(booster)roots.push(vehicle.booster);if(upper){roots.push(vehicle.upper,vehicle.payload);if(params.vehicle==='falcon')roots.push(...falcon.fairings.map(record=>record.group));}if(subject==='overview'||subject==='booster'&&time>=70){if(params.vehicle==='starship')roots.push(parts.pads.tower,parts.pads.starMount);else if(params.recovery!=='expendable')roots.push(params.recovery==='rtls'?parts.pads.RTLS:parts.pads.ASDS);}if(subject==='overview'&&params.vehicle==='falcon')roots.push(parts.pads.launchMount);
  projectionCheck(()=>assertVisibleVerticesFit(roots,camera,`${params.vehicle}/${params.recovery} time${time} view${view} aspect${aspect}`));frusta++;
 }
 observe();disposeOnce(resources);
}
assert.equal(projectionFailures.length,0,'Actual hardware framing failures:\n'+[...new Set(projectionFailures)].join('\n'));
console.log(`SpaceX scenes: ${builds} bilingual real Three builds (${sourceCheck?'source':'dist'}), ${states} causal states, ${nozzleOracles} nozzle/plume/rotation oracles, ${contacts} physical foot/pin/nozzle contacts, caught booster clear of mount, ${frusta} desktop/mobile four-view frusta, stable installed hardware and GPU ownership, deterministic smoke/plume pause/reverse: OK (no pixel rendering)`);
