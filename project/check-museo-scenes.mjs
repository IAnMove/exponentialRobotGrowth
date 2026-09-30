import assert from 'node:assert/strict';
import * as THREE from './node_modules/three/build/three.module.js';
import {EYE,WALL_H,PAINTING,walls,rooms,exhibits,standAt,paintingPlane,focusHit,yawLookingAt,spawn} from './site-src/museo/model.js';
import {immersiveHref} from './site-src/immersive/catalog.js';

// Inspect real Three meshes and shader displacement, without pretending that
// this replaces the browser's lighting, text-legibility or frame-rate QA.
globalThis.document={createElement:()=>{
 const canvas={textLines:[],writes:[]};let width=300,height=150;
 Object.defineProperties(canvas,{width:{get:()=>width,set:value=>{width=value;canvas.writes.push(['width',value]);}},height:{get:()=>height,set:value=>{height=value;canvas.writes.push(['height',value]);}}});
 const gradient=()=>({addColorStop(){}}),context=new Proxy({font:'10px sans-serif',measureText:text=>({width:String(text).length*24}),createLinearGradient:gradient,createRadialGradient:gradient,fillText(text){canvas.textLines.push(String(text));canvas.writes.push(['text',String(text)]);},clearRect(){canvas.textLines=[];canvas.writes.push(['clear']);}}, {get:(target,name)=>name in target?target[name]:()=>{}});
 canvas.getContext=()=>context;return canvas;
}};
const {createMuseumScene}=await import('./dist/museo/world.js');
const vector=point=>new THREE.Vector3(point.x,point.y,point.z),near=(a,b,message,epsilon=1e-7)=>assert(Math.abs(a-b)<epsilon,message||`${a} != ${b}`);
function rayFor(pose,max=24){const camera=new THREE.PerspectiveCamera(68,1,.06,100);camera.position.set(pose.x,EYE,pose.z);camera.rotation.set(pose.pitch,pose.yaw,0,'YXZ');camera.updateMatrixWorld(true);const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(0,0),camera);ray.far=max;return ray;}
const smoothstep=(low,high,value)=>{const x=Math.max(0,Math.min(1,(value-low)/(high-low)));return x*x*(3-2*x);};
function shaderDisplacement(shader){
 const displacement=shader.match(/\bp\.z\s*\+=\s*([^;]+);/),declarations=[...shader.matchAll(/\bfloat\s+(\w+)\s*=\s*([^;]+);/g)].filter(match=>match[1]!=='d');assert(displacement,'the canvas wave exposes a scalar displacement to inspect');
 // Evaluate the shader's own scalar expression. Coefficients and envelopes
 // are not repeated in the test; a negative GLSL wave would fail the actual
 // backing clearance below even if descriptive waveBounds claimed otherwise.
 const body=declarations.map(match=>`const ${match[1]}=${match[2]};`).join('')+`return ${displacement[1]};`;
 return new Function('d','time','hover','enter','sin','smoothstep',body);
}
let builds=0,raycasts=0,waveSamples=0;const desktopVertices=new Map();
for(const es of [true,false])for(const mobile of [false,true]){
 const built=createMuseumScene(es,{mobile,maxAnisotropy:4}),{scene,resources,paintings,wallMeshes,lights,update}=built;builds++;
 assert.equal(paintings.length,exhibits.length);assert.equal(built.screens,paintings);assert.equal(built.solids,wallMeshes);assert.equal(wallMeshes.length,walls.length);assert.equal(Object.keys(built.roomGroups).length,5);assert.equal(built.roomRecords.length,5);assert.equal(built.portals.length,4);
 assert.equal(lights.filter(light=>light.isPointLight).length,5,'lighting is bounded by galleries instead of adding a point light for each painting');assert.equal(scene.children.filter(object=>object.isLight).length,7);assert(lights.every(light=>light.intensity>0));
 scene.updateMatrixWorld(true);
 for(const [i,mesh] of wallMeshes.entries()){const box=new THREE.Box3().setFromObject(mesh),expected=walls[i];for(const [actual,value] of [[box.min.x,expected.minX],[box.max.x,expected.maxX],[box.min.z,expected.minZ],[box.max.z,expected.maxZ],[box.min.y,0],[box.max.y,WALL_H]])near(actual,value,'real Float32 wall vertices retain the shared collision bounds',1e-6);}
 for(const record of built.roomRecords){assert.equal(record.group,built.roomGroups[record.room.id]);assert.equal(record.light.userData.roomId,record.room.id);assert.equal(record.floor.parent,record.group);assert.equal(record.ceiling.parent,record.group);}
 for(const portal of built.portals){assert.equal(portal.room.gate.x,portal.group.position.x);assert.equal(portal.room.gate.z,portal.group.position.z);near(new THREE.Vector3(0,0,1).applyQuaternion(portal.front.quaternion).dot(new THREE.Vector3(0,0,1).applyQuaternion(portal.back.quaternion)),-1,'gallery signs face both travel directions');}
 const canvasImages=new Map();
 for(const painting of paintings){
  const {e,mesh,group,backing,frameParts,reveal,caption}=painting,plane=paintingPlane(e),center=mesh.getWorldPosition(new THREE.Vector3()),normal=new THREE.Vector3(0,0,1).applyQuaternion(mesh.getWorldQuaternion(new THREE.Quaternion()));
  assert(center.distanceTo(vector(plane.center))<1e-8,'the rendered canvas and model rectangle share the exact plane');assert(normal.distanceTo(vector(plane.normal))<1e-8);near(mesh.geometry.parameters.width,plane.width);near(mesh.geometry.parameters.height,plane.height);assert.equal(painting.live,!!immersiveHref(e.id));assert.equal(mesh.material.uniforms.available.value,painting.live?1:0);
  assert.equal(frameParts.length,3);assert(frameParts.every(part=>part.isInstancedMesh&&part.count===4));assert(reveal.isInstancedMesh&&reveal.count===4);assert(painting.fixture&&painting.lightBar);
  assert(caption.material[4].map?.isCanvasTexture&&!caption.material[5].map,'a plaque has readable front text and a plain back rather than mirrored words');
  const canvas=mesh.material.uniforms.map.value.image;canvasImages.set(canvas,{width:canvas.width,height:canvas.height,text:[...canvas.textLines],writes:canvas.writes.length});assert(canvas.textLines.length>0,'each topic has code-drawn artwork');
  const ray=rayFor(standAt(e));assert.equal(built.raycast(ray)?.exhibit.id,e.id,'the real canvas can be picked from its visitor stand');const hit=ray.intersectObject(mesh)[0];assert(hit);assert(ray.intersectObjects([...frameParts,reveal]).every(border=>border.distance>hit.distance),'the frame has an actual open centre in front of the painting');
  const vertices=mesh.geometry.attributes.position.count;if(mobile)assert(vertices<desktopVertices.get(es+':'+e.id),'mobile canvases reduce geometry while retaining the same rectangle');else desktopVertices.set(es+':'+e.id,vertices);
  backing.updateMatrix();backing.geometry.computeBoundingBox();const backingFront=backing.geometry.boundingBox.clone().applyMatrix4(backing.matrix).max.z,displace=shaderDisplacement(mesh.material.vertexShader);
  for(const time of [0,.35,1,2.7,8,21,60])for(const hover of [0,1])for(const enter of [0,.25,.6,1])for(let u=0;u<=10;u++)for(let v=0;v<=10;v++){const dz=displace(Math.hypot(u/10-.5,v/10-.5),time,hover,enter,Math.sin,smoothstep);assert(Number.isFinite(dz));assert(mesh.position.z+dz>backingFront+1e-6,'the animated canvas stays in front of its real backing instead of showing a dark self-intersection ring');waveSamples++;}
  for(const turn of [-.5,0,.5])for(const pitch of [-.8,0,.12,.8]){const pose={...standAt(e),yaw:standAt(e).yaw+turn,pitch},real=built.raycast(rayFor(pose)),expected=focusHit(pose,24);assert.equal(real?.exhibit?.id,expected?.exhibit.id,'the rendered painting/wall raycast agrees with camera focus');raycasts++;}
  for(const aspect of [.55,1.8]){const fov=Math.min(110,2*Math.atan(Math.tan(34*Math.PI/180)/Math.min(1,aspect/1.3))*180/Math.PI),pose=standAt(e),camera=new THREE.PerspectiveCamera(fov,aspect,.06,100);camera.position.set(pose.x,EYE,pose.z);camera.rotation.set(pose.pitch,pose.yaw,0,'YXZ');camera.updateMatrixWorld(true);group.traverse(part=>{if(!part.isMesh)return;const vertices=part.geometry.attributes.position;for(let instance=0;instance<(part.isInstancedMesh?part.count:1);instance++){const matrix=part.matrixWorld.clone();if(part.isInstancedMesh){const local=new THREE.Matrix4();part.getMatrixAt(instance,local);matrix.multiply(local);}for(let i=0;i<vertices.count;i++){const p=new THREE.Vector3().fromBufferAttribute(vertices,i).applyMatrix4(matrix).project(camera);assert(Math.abs(p.x)<=1+1e-6&&Math.abs(p.y)<=1+1e-6&&p.z>=-1&&p.z<=1,`${e.id} actual painting/frame/plaque/fixture vertex fits stand aspect ${aspect}, projected ${p.toArray()}`);}}});}
 }
 const electricity=exhibits.find(exhibit=>exhibit.id==='electricity'),blocked={x:-4.8,z:-4.7,yaw:yawLookingAt(electricity.x+4.8,electricity.z+4.7),pitch:0};assert.equal(built.raycast(rayFor(blocked))?.exhibit,undefined,'the actual separating wall occludes Electricidad');
 const groundRay=new THREE.Raycaster(new THREE.Vector3(spawn.x,EYE,spawn.z),new THREE.Vector3(0,-EYE,-5).normalize()),point=built.raycast(groundRay)?.point;assert(point);near(point.x,0);near(point.z,0);const blockedFloor=new THREE.Raycaster(new THREE.Vector3(-4.8,EYE,-4.7),new THREE.Vector3(-5.2,-EYE,-.3).normalize());assert.equal(built.raycast(blockedFloor),null,'click-to-walk does not pick a ground point through a wall');
 for(const detail of built.animatedDetails)assert(new THREE.Box3().setFromObject(detail.object).min.y>EYE+.32,'theme sculptures remain overhead and do not add invisible floor obstacles');
 const snapshots=()=>{scene.updateMatrixWorld(true);const result=[];scene.traverse(object=>{result.push([object.uuid,object.visible,...object.matrixWorld.elements,object.material?.emissiveIntensity]);if(object.isMesh){assert(object.matrixWorld.elements.every(Number.isFinite));assert([...object.geometry.attributes.position.array].every(Number.isFinite));}});return result;};
 const active={time:8.4,nearId:'llms',portal:{exhibit:exhibits.find(e=>e.id==='llms'),progress:.4},destination:{x:0,z:-17.65},roomId:'mind'};update(active);const state=snapshots(),count=resources.length;assert.equal(built.marker.visible,true);near(built.marker.position.x,active.destination.x);near(built.marker.position.z,active.destination.z);assert.equal(paintings.find(p=>p.e.id==='llms').mesh.material.uniforms.enter.value,.4);assert(paintings.filter(p=>p.e.id!=='llms').every(p=>p.mesh.material.uniforms.enter.value===0));update(active);assert.deepEqual(snapshots(),state,'pausing at a portal progress freezes geometry and decoration');update({time:22,nearId:'cell',roomId:'life'});update({...active,roomId:'cosmos'});assert.deepEqual(snapshots(),state,'seeking back reconstructs the same scene without another gallery retaining its old animation');assert.equal(resources.length,count);
 update({time:0});assert.equal(built.marker.visible,false);assert(paintings.every(p=>p.mesh.material.uniforms.enter.value===0&&p.mesh.material.uniforms.hover.value===0));
 for(const [canvas,initial] of canvasImages)assert.deepEqual({width:canvas.width,height:canvas.height,text:[...canvas.textLines],writes:canvas.writes.length},initial,'seeking does not mutate an already uploaded painting image');
 assert.equal(new Set(resources).size,resources.length,'shared geometries/materials/textures are owned once');const disposeCount=new Map(resources.map(resource=>[resource,0]));for(const resource of resources)resource.addEventListener('dispose',()=>disposeCount.set(resource,disposeCount.get(resource)+1));resources.forEach(resource=>resource.dispose());assert([...disposeCount.values()].every(count=>count===1),'every owned GPU resource is disposed exactly once');
}
console.log(`Museum scenes: ${builds} ES/EN desktop/mobile builds, ${raycasts} real canvas/wall raycasts, ${waveSamples} shader/backing clearance samples, matching rectangular planes, 5 gallery lights, open frames, truthful availability, finite/reversible geometry and unique resource disposal: OK (no pixel rendering)`);
