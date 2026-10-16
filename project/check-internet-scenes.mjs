import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {STAGES,PLACES,geoPoint} from './site-src/journeys/internet-route.js';
import {internetFrameAt} from './site-src/journeys/internet-model.js';
import {navigationFor,collides,safePosition,moveInScene,orbitPosition} from './site-src/journeys/internet-walk.js';

// Source imports point to the browser vendor copy. Map only that import to the
// installed identical Three library; every scene/camera/navigation method is real.
const source=readFileSync('site-src/journeys/internet-world.js','utf8');
const local=name=>new URL('site-src/journeys/'+name,import.meta.url).href;
const three=new URL('node_modules/three/build/three.module.js',import.meta.url).href;
const mapped=source.replace("'../fx/perf.js'",JSON.stringify(new URL('./dist/fx/perf.js',import.meta.url).href)).replace("'../vendor/three.module.js'",JSON.stringify(three)).replace(/'\.\/((?:internet-(?:route|model|walk)|label-layout)\.js)'/g,(_,name)=>JSON.stringify(local(name)));
const module=await import('data:text/javascript;base64,'+Buffer.from(mapped).toString('base64'));
const close=(a,b,tolerance=1e-8)=>assert(Math.abs(a-b)<tolerance,`${a} must equal ${b}`);
// Annotations use a screen-space packing problem, independent of Three/GPU.
// Check conservation of text, viewport bounds, separation and input ownership.
const measure=text=>text.length;
for(const text of ['Optical access network','Petición recibida · procesando','Virginia Beach']){
 const lines=module.wrapVoyageLabel(text,12,measure);
 assert.equal(lines.join(' '),text);assert(lines.every(line=>measure(line)<=12));
}
const labelInputs=Object.freeze([0,1,2].map(id=>Object.freeze({id,x:100,y:60,width:72,height:24})));
const obstacles=Object.freeze([Object.freeze({x:0,y:0,width:200,height:15}),Object.freeze({x:0,y:105,width:200,height:15})]);
const layout=module.layoutVoyageLabels(labelInputs,{width:200,height:120,margin:10,gap:4,obstacles});assert.equal(layout.length,3);
const separated=(a,b)=>a.x+a.width+3.99<=b.x||b.x+b.width+3.99<=a.x||a.y+a.height+3.99<=b.y||b.y+b.height+3.99<=a.y;
for(const box of layout){assert(box.x>=10&&box.y>=10&&box.x+box.width<=190&&box.y+box.height<=110);for(const other of [...layout,...obstacles])if(other!==box)assert(separated(box,other),'annotations must not cover one another or the HUD');}
assert.deepEqual(module.layoutVoyageLabels([...labelInputs].reverse(),{width:200,height:120,margin:10,gap:4,obstacles}),layout,'input order does not change the deterministic result');
assert.deepEqual(module.layoutVoyageLabels([{id:1,x:100,y:60,width:72,height:24}],{width:200,height:120}),[{id:1,x:64,y:48,width:72,height:24}],'unobstructed text stays on its anchor');
assert.deepEqual(module.layoutVoyageLabels(labelInputs,{width:50,height:40}),[],'a tiny viewport does not silently shrink the text');
// Measured 320 px phone cutaway: nearest-anchor placement can leave a hole
// too small for the attenuated-input label. All six annotations fit at 13 px
// when repacked, without covering the actual scene HUD or hiding that label.
const phoneLabels=[[14,125.59,233.49,147],[15,125.73,242.21,185.34],[16,102,183,110],[17,190.99,182.4,118.67],[18,149.04,159.17,249],[19,148.9,201.71,256.67]].map(([id,x,y,width])=>({id,x,y,width,height:26}));
const phoneHud=[{x:10,y:11,width:270,height:87},{x:10,y:280.67,width:177,height:21},{x:10,y:348.67,width:270,height:36}],phoneLayout=module.layoutVoyageLabels(phoneLabels,{width:290,height:394.67,obstacles:phoneHud});
assert.equal(phoneLayout.length,6);for(const box of phoneLayout)for(const other of [...phoneLayout,...phoneHud])if(other!==box)assert(separated(box,other));
for(const es of [true,false]){
 const world=module.createVoyageScene(es,{textures:false});
 for(let stage=0;stage<9;stage++)for(const fraction of [0,.01,.29,.3,.48,.649,.65,.99,1]){
  const frame=internetFrameAt(stage,fraction);world.update(frame);world.scene.updateMatrixWorld(true);
  assert.equal(Object.values(world.groups).filter(g=>g.visible).length,1);assert(world.groups[STAGES[stage].scene].visible);
  const directions=new Set();
  for(const path of world.paths){const segment=frame.activeSegments.find(s=>s.id===path.id),active=path.stages.includes(stage)&&!!segment;
   assert.equal(path.particles[0].visible,active,`leading marker follows ${path.id}'s causal state`);
   for(const marker of path.particles)if(marker.visible){assert(active);assert(marker.userData.signalLocal>=0&&marker.userData.signalLocal<=1);assert(marker.position.toArray().every(Number.isFinite));directions.add(segment.direction);}
  }
  assert(directions.size<=1,'one representative request precedes its response');
  assert.equal(world.parts.service.requestArrived,frame.requestArrived);assert.equal(world.parts.service.responseReady,frame.responseReady);
  if(stage===6&&fraction>=.3&&fraction<.65)assert(world.paths.every(p=>p.particles.every(m=>!m.visible)),'server processes only after arrival');
  if(stage===8&&fraction<.45)assert(world.parts.screen.tiles.every(m=>!m.visible),'the page cannot render before response arrival');
  if(stage===8&&fraction===1)assert(world.parts.screen.tiles.every(m=>m.visible));
 }
 const cable=world.parts.cable;assert(cable.jacket.material.transparent);assert(cable.jacket.material.opacity<.4);assert(cable.fiberRadius<cable.jacketRadius);
 for(let i=0;i<=100;i++){const fraction=i/100;world.update(internetFrameAt(4,fraction));const marker=cable.path.particles[0],inside=cable.curve.getPointAt(fraction);assert(marker.position.distanceTo(inside)<1e-10,'pulse travels inside the fiber, not over the jacket');}
 for(const repeater of cable.repeaters){
  world.update(internetFrameAt(4,repeater.fraction));assert(cable.path.particles[0].position.distanceTo(new THREE.Vector3(...repeater.position))<1e-10,'fiber contacts the amplifier bore');
  assert(repeater.mesh.material.transparent);const length=cable.curve.getLength(),axis=new THREE.Vector3(...repeater.axis),center=new THREE.Vector3(...repeater.position);
  for(const sign of [-1,1]){const contact=cable.curve.getPointAt(repeater.fraction+sign*repeater.length/(2*length)),delta=contact.sub(center),radial=delta.clone().addScaledVector(axis,-delta.dot(axis));assert(radial.length()+cable.fiberRadius<repeater.radius,'both fiber entry and exit remain inside the repeater');}
 }
 world.update(internetFrameAt(4,.25));const inputPower=world.parts.amplifier.path.particles[0].userData.opticalPower;
 world.update(internetFrameAt(4,.75));assert(world.parts.amplifier.path.particles[0].userData.opticalPower>inputPower,'the local comparison visibly restores optical power');
 for(const aspect of [1.29,.85,.52]){
  world.setAspect(aspect);close(world.parts.amplifier.group.scale.x,aspect<1.05?2:1);
  const pose=module.voyageCameraAt(4,aspect),camera=new THREE.PerspectiveCamera(pose.fov,aspect,.05,240);camera.position.set(...pose.position);camera.lookAt(new THREE.Vector3(...pose.target));camera.updateMatrixWorld(true);
  world.scene.updateMatrixWorld(true);const inset=new THREE.Box3().setFromObject(world.parts.amplifier.group);
  for(const x of [inset.min.x,inset.max.x])for(const y of [inset.min.y,inset.max.y])for(const z of [inset.min.z,inset.max.z]){const point=new THREE.Vector3(x,y,z).project(camera);assert(Math.abs(point.x)<.9&&Math.abs(point.y)<.9,'enlarged mobile amplification inset fits while preserving full cable context');}
  for(const annotation of cable.annotations){
   const center=new THREE.Vector3(...annotation.position).project(camera),view=new THREE.Vector3(...annotation.position).applyMatrix4(camera.matrixWorldInverse),height=annotation.width*70/(annotation.text.length*15+36),tan=Math.tan(pose.fov*Math.PI/360),halfWidth=annotation.width/(2*-view.z*tan*aspect),halfHeight=height/(2*-view.z*tan);
   for(let i=0;i<=100;i++){const point=cable.curve.getPointAt(i/100).project(camera);assert(Math.abs(point.x-center.x)>halfWidth||Math.abs(point.y-center.y)>halfHeight+.012,`cable annotation clears the fiber and repeater contacts: ${annotation.text}, aspect ${aspect}, position ${i}`);}
  }
 }
 const returning=world.paths.find(p=>p.id==='return');for(const [fraction,place] of [[0,PLACES.ashburn],[1,PLACES.madrid]])returning.curve.getPoint(fraction).toArray().forEach((value,i)=>close(value,geoPoint(place,10.05)[i]));
 world.scene.traverse(object=>{assert(object.matrixWorld.elements.every(Number.isFinite));if(object.geometry?.attributes.position)assert([...object.geometry.attributes.position.array].every(Number.isFinite));});
 world.dispose();
}
for(const aspect of [1.8,1.25,1,.72,.52])for(let stage=0;stage<9;stage++){
 const pose=module.voyageCameraAt(stage,aspect),camera=new THREE.PerspectiveCamera(pose.fov,aspect,pose.near,pose.far);camera.position.set(...pose.position);camera.lookAt(new THREE.Vector3(...pose.target));camera.updateMatrixWorld(true);
 for(const point of module.voyageFramingAt(stage,aspect)){const ndc=new THREE.Vector3(...point).project(camera);assert(Math.abs(ndc.x)<.9&&Math.abs(ndc.y)<.9&&ndc.z>-1&&ndc.z<1,`chapter ${stage} fits at aspect ${aspect}`);}
}
for(const scene of ['city','landing','server']){
 const spec=navigationFor(scene);assert(spec.grounded);assert(!collides(spec.start,spec));let position=spec.start.slice();
 for(let i=0;i<2000;i++){position=moveInScene(scene,position,{yaw:i*.071,pitch:1.2,forward:1,side:(i%3)-1,vertical:1,dt:.1});close(position[1],spec.eyeHeight);assert(!collides(position,spec));for(const axis of [0,2])assert(position[axis]>=spec.bounds.min[axis]&&position[axis]<=spec.bounds.max[axis]);}
 for(const equipment of spec.obstacles){const x=(equipment.min[0]+equipment.max[0])/2,z=(equipment.min[1]+equipment.max[1])/2;assert(!collides(safePosition(scene,[x,100,z]),spec),'restored invalid equipment poses recover safely');}
}
assert.equal(navigationFor('earth').mode,'orbit');assert.equal(navigationFor('ocean').mode,'observe');
for(const radius of [-10,0,2,12,50,100]){const point=orbitPosition({azimuth:2,elevation:3,radius});assert(Math.hypot(...point)>=12-1e-8&&Math.hypot(...point)<=42+1e-8);}
assert(Math.hypot(...safePosition('earth',[0,0,0]))>=12);

// A minimal GPU boundary permits testing the actual world camera API in Node.
// Real-browser rendering is separately checked by the UI audit.
const stub=`class GPU { constructor(){this.domElement={remove(){},setAttribute(k,v){this[k]=v;}};}setPixelRatio(){}setSize(){}render(){}dispose(){} }`;
const cameraSource=mapped.replace(/import \* as THREE from (.*);/,`import * as REAL_THREE from $1;${stub};const THREE={...REAL_THREE,WebGLRenderer:GPU};`).replace('createVoyageScene(es),renderer=','createVoyageScene(es,{textures:false}),renderer=');
const cameraModule=await import('data:text/javascript;base64,'+Buffer.from(cameraSource).toString('base64'));
const originalObserver=globalThis.ResizeObserver;globalThis.ResizeObserver=class {observe(){}disconnect(){}};
try{
 const world=cameraModule.createVoyageWorld({clientWidth:1000,clientHeight:650,append(){}},true);
 assert.equal(world.canvas.tabIndex,0,'Explore can focus the canvas so WASD targets the scene');assert.match(world.canvas['aria-label'],/Internet/);
 world.explore(true);world.look(100,45);world.move(1,0,0,.1);const view=world.getViewState();world.go(0,true,{preserveView:true});world.render(internetFrameAt(0,.8),{dt:.05,preserveView:true});assert.deepEqual(world.getViewState().position,view.position,'same-stage seek preserves a walking pose');
 world.go(1,true,{preserveView:true});assert.deepEqual(world.getViewState().position,view.position,'same physical scene retains a walking pose');
 world.go(4,true,{preserveView:true});assert.equal(world.getNavigationMode(),'observe');world.move(1,1,1,.1);const ocean=world.getViewState();world.go(6,true,{preserveView:true});assert.equal(world.getNavigationMode(),'walk');world.go(4,true,{preserveView:true});assert.deepEqual(world.getViewState().position,ocean.position,'returning restores an observed scene pose');
 world.go(7,true,{preserveView:true});assert.equal(world.getNavigationMode(),'orbit');world.look(80,40);world.move(1,1,1,.1);const orbit=world.getViewState();assert(Math.hypot(...orbit.position)>=12);world.render(internetFrameAt(7,.65),{dt:.1,preserveView:true});assert.deepEqual(world.getViewState().position,orbit.position);assert(world.restoreViewState(orbit));
 world.explore(false);world.go(7,true);assert.equal(world.inspect().exploring,false,'guided camera is an explicit reversible action');world.dispose();
 // Return to the guided pose must work even when the caller deliberately sends
 // zero animation time. Reduced motion snaps; ordinary motion still interpolates.
 const samePose=(a,b,message)=>{for(const key of ['position','target'])a[key].forEach((value,i)=>{assert(Math.abs(value-b[key][i])<1e-8,message+': '+key);});};
 for(let stage=0;stage<9;stage++){
  const sizes=[[1000,650],[390,430],[290,395]][stage%3],instance=cameraModule.createVoyageWorld({clientWidth:sizes[0],clientHeight:sizes[1],append(){}},true),frame=internetFrameAt(stage,.48);
  instance.go(stage,true);instance.render(frame,{dt:0});const guided=instance.getViewState();
  instance.explore(true);instance.look(120,45);instance.move(1,.4,0,.1);const free=instance.getViewState();
  assert(Math.hypot(...free.position.map((v,i)=>v-guided.position[i]),...free.target.map((v,i)=>v-guided.target[i]))>.1);
  instance.render(frame,{dt:0,reduced:true,preserveView:true});samePose(instance.getViewState(),free,'reduced motion preserves intentional exploration');
  instance.explore(false);instance.render(frame,{dt:0,reduced:true});
  samePose(instance.getViewState(),guided,'returning with reduced motion must reach the guided pose without advancing time');assert.equal(instance.inspect().exploring,false);assert.equal(instance.inspect().frame,frame);
  instance.explore(true);samePose(instance.getViewState(),free,'returning to exploration restores its saved pose');instance.explore(false);
  instance.render(frame,{dt:0,reduced:false});samePose(instance.getViewState(),free,'ordinary transitions start at the free pose');
  instance.render(frame,{dt:.6,reduced:false});const midway=instance.getViewState();assert.notDeepEqual(midway.position,guided.position);assert.notDeepEqual(midway.position,free.position);
  instance.render(frame,{dt:.6,reduced:false});samePose(instance.getViewState(),guided,'ordinary transitions complete at the guided pose');assert.equal(instance.inspect().frame,frame);instance.dispose();
 }
}finally{globalThis.ResizeObserver=originalObserver;}
console.log('Internet scenes: causal markers, continuous interior fibers/repeaters, optical power, browser arrival, desktop/mobile frusta, grounded equipment collision, orbit bounds and pose restoration: OK');
