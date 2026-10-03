import assert from 'node:assert/strict';
import {LESSONS} from './site-src/journeys/catalog.js';
import {defaults,poseAt} from './site-src/journeys/common.js';
import * as THREE from './node_modules/three/build/three.module.js';
// Exercise the real scene builder and geometries, without a WebGL context or browser.
globalThis.document={createElement:()=>{
 const canvas={textLines:[],writes:[]};let width=300,height=150;
 Object.defineProperties(canvas,{width:{get:()=>width,set:value=>{width=value;canvas.writes.push(['width',value]);}},height:{get:()=>height,set:value=>{height=value;canvas.writes.push(['height',value]);}}});
 const context={measureText:s=>({width:s.length*24}),fillText(s){canvas.textLines.push(String(s));canvas.writes.push(['text',String(s)]);},clearRect(){canvas.textLines.length=0;canvas.writes.push(['clear']);},fillRect(){canvas.writes.push(['background']);}};canvas.getContext=()=>context;return canvas;
}};
function captionObserver(scene,resources){
 const uploadedImages=new Map();return ()=>{
  const textures=resources.filter(resource=>resource.isCanvasTexture);assert.equal(new Set(textures).size,textures.length,'each owned caption texture is registered once');
  scene.traverse(object=>{if(object.isSprite&&object.material.map?.isCanvasTexture)assert.equal(textures.filter(texture=>texture===object.material.map).length,1,'every displayed caption texture belongs to the disposal list');});
  for(const texture of textures){const image=texture.image,snapshot={width:image.width,height:image.height,text:[...image.textLines],writes:image.writes.length};if(uploadedImages.has(image))assert.deepEqual(snapshot,uploadedImages.get(image),'a previously uploaded caption canvas keeps its dimensions and painted text');else uploadedImages.set(image,snapshot);}
 };
}
const {createLessonScene}=await import('./dist/journeys/world.js');
const {microchipFraming}=await import('./dist/journeys/microchip-world.js');
const {cellFraming}=await import('./dist/journeys/cell-world.js');
const {nuclearFraming}=await import('./dist/journeys/nuclear-world.js');
let sceneBuilds=0,nuclearBuilds=0;
for(const es of [true,false])for(const lesson of Object.values(LESSONS)){
 const built=createLessonScene(lesson,es);const {scene,resources,targets,update}=built;
 sceneBuilds++;
 if(lesson.id==='nuclear'){
  nuclearBuilds++;
  const near=(a,b,message)=>assert(Math.abs(a-b)<1e-8,message),visible=object=>{for(let o=object;o;o=o.parent)if(!o.visible)return false;return true;},position=object=>object.getWorldPosition(new THREE.Vector3());
  const model=lesson.evaluate(defaults(lesson),0),{reactor,steamGenerator:sg,condenser,circuits,pumps,turbine,generator,heatExchanger}=built,{primary,secondary,cooling}=circuits,{normalSteam,bypassSteam}=secondary.branches;
  const packets=route=>route.packets.filter(packet=>visible(packet)),curveSamples=new Map(),samples=path=>{if(!curveSamples.has(path))curveSamples.set(path,Array.from({length:4001},(_,i)=>path.getPoint(i/4000)));return curveSamples.get(path);};
  const nearest=(path,p)=>samples(path).reduce((best,q)=>Math.min(best,p.distanceTo(q)),Infinity),touches=(path,p,message)=>assert(nearest(path,p)<.02,message);
  const endpoints=(path,a,b,message)=>{assert(path.getPoint(0).distanceTo(a)<1e-8,message+' inlet');assert(path.getPoint(1).distanceTo(b)<1e-8,message+' outlet');};
  assert.equal(built.stands.length,4);assert.deepEqual(built.stands.map(button=>button.userData.action),[0,1,2,3]);assert(built.stands.every(button=>targets.includes(button)),'every Nuclear stand has a working listening target');
  built.update(model,0,0,false,true);assert(built.standsGroup.visible);built.update(model,0,0,false,false);assert(!built.standsGroup.visible);
  for(const shell of [reactor.vessel,sg.secondaryShell,sg.secondaryFluid,turbine.casing,generator.stator,condenser.secondaryShell])assert.equal(shell.material.side,THREE.DoubleSide,'an open cutaway remains visible when the camera sees its inner surface');
  assert.equal(new Set([primary.color,secondary.color,cooling.color]).size,3,'three separate water circuits have distinct colors');
  for(const circuit of [primary,secondary.normal,secondary.bypass,cooling]){assert(circuit.closed);assert(circuit.curve.getPoint(0).distanceTo(circuit.curve.getPoint(1))<1e-8,'each water route returns to its own beginning');}
  assert.equal(secondary.normal.pipe,null);assert.equal(secondary.bypass.pipe,null);assert([...secondary.normal.packets,...secondary.bypass.packets].every(packet=>!packet.visible),'closed-loop helpers do not duplicate visible fluid or energy packets');
  endpoints(sg.primaryTube.curve,sg.ports.primaryIn,sg.ports.primaryOut,'the primary U-tube connects the actual SG ports');
  endpoints(condenser.coolingTube.curve,condenser.ports.coolingIn,condenser.ports.coolingOut,'the cooling tube connects the actual condenser ports');
  assert.equal(sg.transferWall.curve,sg.primaryTube.curve);assert.equal(condenser.transferWall.curve,condenser.coolingTube.curve);
  assert(sg.transferWall.mesh.geometry.parameters.radius>sg.primaryTube.mesh.geometry.parameters.radius,'metal surrounds the primary fluid without mixing it into secondary water');
  assert(condenser.transferWall.mesh.geometry.parameters.radius>condenser.coolingTube.mesh.geometry.parameters.radius,'a separate condenser wall contains the cooling water');
  assert(primary.segments.includes(sg.primaryTube.curve),'the global primary pipe follows the actual isolated U-tube, rather than a separately smoothed curve that exits its wall');
  assert(cooling.segments.includes(condenser.coolingTube.curve));assert(cooling.segments.includes(heatExchanger.tube.curve),'the cooling loop really passes through both heat exchangers');
  for(const [route,tube,wall] of [[primary,sg.primaryTube,sg.transferWall],[cooling,condenser.coolingTube,condenser.transferWall]]){
   const clearance=wall.mesh.geometry.parameters.radius-Math.max(route.pipe.geometry.parameters.radius,tube.mesh.geometry.parameters.radius);assert(clearance>0);
   for(const p of tube.curve.getPoints(80))assert(nearest(route.curve,p)<Math.min(clearance,.01),'the visible fluid path stays inside its actual separating wall');
  }
  endpoints(primary.curve,reactor.ports.hot,reactor.ports.hot,'the primary loop closes through its own reactor');
  for(const p of [sg.ports.primaryIn,sg.ports.primaryOut,reactor.ports.cold,pumps.primary.group.position])touches(primary.curve,p,'the primary water physically reaches the SG, return inlet and primary pump');
  endpoints(secondary.commonOut.curve,sg.ports.steam,normalSteam.curve.getPoint(0),'secondary steam reaches the branch junction');
  assert(normalSteam.curve.getPoint(0).distanceTo(bypassSteam.curve.getPoint(0))<1e-8,'the normal and bypass branches share a real upstream junction');
  for(const branch of [normalSteam,bypassSteam])endpoints(branch.curve,secondary.commonOut.curve.getPoint(1),condenser.ports.steam,'both steam branches reach the secondary condenser inlet');
  endpoints(secondary.commonReturn.curve,condenser.ports.steam,sg.ports.steam,'condensate returns to its own steam generator');
  for(const p of [condenser.ports.feed,pumps.feed.group.position,sg.ports.feed])touches(secondary.commonReturn.curve,p,'secondary condensate passes through its feed pump and SG feed inlet');
  for(const p of [condenser.ports.coolingIn,condenser.ports.coolingOut,pumps.cooling.group.position,heatExchanger.ports.inlet,heatExchanger.ports.outlet])touches(cooling.curve,p,'the cooling water reaches the condenser, external heat sink and its own pump');
  assert(sg.ports.primaryIn.distanceTo(sg.ports.feed)>.3&&sg.ports.primaryOut.distanceTo(sg.ports.steam)>.3);assert(condenser.ports.coolingIn.distanceTo(condenser.ports.feed)>.3&&condenser.ports.coolingOut.distanceTo(condenser.ports.steam)>.3,'different water circuits have separate physical ports');
  scene.updateMatrixWorld(true);
  const waterBounds=new THREE.Box3().setFromObject(heatExchanger.water),coilRadius=heatExchanger.tube.mesh.geometry.parameters.radius;
  for(const p of heatExchanger.tube.curve.getPoints(80))for(const axis of ['x','y','z'])assert(p[axis]-coilRadius>=waterBounds.min[axis]-1e-8&&p[axis]+coilRadius<=waterBounds.max[axis]+1e-8,'the external exchange coil is actually surrounded by the available water volume');
  const reactorInverse=reactor.group.matrixWorld.clone().invert(),primaryRadius=primary.pipe.geometry.parameters.radius;
  for(const p of reactor.coolantChannel.getPoints(160)){const local=p.clone().applyMatrix4(reactorInverse);for(const fuel of built.fuel){const g=fuel.geometry.parameters,radial=Math.max(0,Math.hypot(local.x-fuel.position.x,local.z-fuel.position.z)-g.radiusTop),vertical=Math.max(0,Math.abs(local.y-fuel.position.y)-g.height/2);assert(Math.hypot(radial,vertical)>primaryRadius,'reactor coolant travels between or below the solid fuel rods');}}
  const shaftDirection=new THREE.Vector3(0,1,0).applyQuaternion(turbine.shaft.getWorldQuaternion(new THREE.Quaternion())),generatorCenter=position(generator.rotor),shaftCenter=position(turbine.shaft);assert(Math.abs(shaftDirection.x)>1-1e-10);assert(generatorCenter.clone().sub(shaftCenter).cross(shaftDirection).length()<1e-8,'turbine and generator have a common physical shaft axis');assert.equal(generator.shaft,turbine.shaft);assert(turbine.blades.length>20&&generator.coils.length>0);
  const turbineBounds=new THREE.Box3().setFromObject(turbine.casing);for(const p of bypassSteam.curve.getPoints(160))assert(!turbineBounds.containsPoint(p),'the residual-heat bypass does not silently send steam through the stopped turbine');
  for(const pump of Object.values(pumps))assert(pump.housing&&pump.rotor&&pump.motor,'each circuit has a physical pump and motor');
  const fuelDimensions=built.fuel.map(part=>[part.geometry.uuid,...part.scale]),decayDimensions=built.decayMarkers.map(part=>[part.geometry.uuid,...part.scale]);
  const assertBars=(bars,values)=>{assert.equal(bars.commonScale,100);bars.items.forEach((item,i)=>{near(item.value,values[i]);near(item.bar.scale.x,values[i]/100);assert.equal(item.bar.visible,values[i]>0);});};
  for(const [params,times] of [[defaults(lesson),[0,2,4.9,5,5.4,12,24]],[{power:20,efficiency:20,stop:true},[0,5,12,24]],[{power:80,efficiency:40,stop:false},[0,5,12,24]]]){
   const m=lesson.evaluate(params,0);for(const time of times){
    built.update(m,time,3,false,true);scene.updateMatrixWorld(true);const s=built.state;near(s.time,time);
    near(primary.flow,s.heat);near(secondary.commonOut.flow,s.heat);near(secondary.commonReturn.flow,s.heat);near(cooling.flow,s.rejected);near(built.electricity.flow,s.electric);
    near(normalSteam.flow,s.stopped?0:s.heat);near(bypassSteam.flow,s.stopped?s.heat:0);near(secondary.normal.flow,normalSteam.flow);near(secondary.bypass.flow,bypassSteam.flow);
    assert(packets(primary).length>0&&packets(secondary.commonReturn).length>0&&packets(cooling).length>0,'cooling and condensate return remain represented after fission stops');
    assert.equal(packets(normalSteam).length>0,!s.stopped);assert.equal(packets(bypassSteam).length>0,s.stopped);assert.equal(packets(built.electricity).length>0,!s.stopped);
    for(const route of built.routes)for(const packet of packets(route)){const deviation=nearest(route.curve,packet.position);assert(deviation<.02,`moving ${route.id} marker remains on its physical route at ${time}; nearest sample ${deviation}`);}
    built.controlRods.forEach(rod=>near(rod.position.y,s.stopped?rod.userData.insertedY:rod.userData.withdrawnY));assertBars(built.powerBars,[s.heat,s.electric,s.rejected]);assertBars(built.coreBars,[s.fission,s.decay,s.heat]);
    assert(built.decayMarkers.every(part=>part.visible&&part.material.emissiveIntensity>0),'radioactive decay is visible during operation as well as after shutdown');
    assert.deepEqual(built.fuel.map(part=>[part.geometry.uuid,...part.scale]),fuelDimensions);assert.deepEqual(built.decayMarkers.map(part=>[part.geometry.uuid,...part.scale]),decayDimensions,'decay changes the energy rate without enlarging its radioactive products');
    near(turbine.angle,s.operatingTime*2.2);near(generator.angle,turbine.angle);near(turbine.rotor.rotation.x,generator.rotor.rotation.x);for(const pump of Object.values(pumps))near(pump.angle,time*2);
    scene.traverse(object=>assert(object.matrixWorld.elements.every(Number.isFinite),'Nuclear operating/shutdown/fractional/end transforms remain finite'));
   }
  }
  built.update(model,4.9,0);const beforeRods=built.controlRods.map(rod=>rod.position.y),beforeDecay=built.decayMarkers[0].material.emissiveIntensity;built.update(model,5,0);assert(built.controlRods.every((rod,i)=>rod.position.y<beforeRods[i]));const stoppedAngle=turbine.angle;built.update(model,12,0);near(turbine.angle,stoppedAngle);assert(built.decayMarkers[0].material.emissiveIntensity<beforeDecay);assert(built.fuel.every(part=>part.material.emissiveIntensity===0));
  built.update(model,5-1e-7,0);const justBefore=turbine.angle;built.update(model,5,0);assert(Math.abs(turbine.angle-justBefore)<1e-6,'the rotating shaft reaches STOP continuously rather than jumping back to angle zero');
  built.update(model,.2,0);assert(built.fissionInset.incoming.visible&&built.fissionInset.nucleus.visible);assert(built.fissionInset.fragments.every(part=>!part.visible));built.update(model,1.2,0);assert(built.fissionInset.fragments.every(part=>part.visible));assert(built.fissionInset.neutrons.every(part=>part.visible));const destinations=Object.values(built.fissionInset.destinations);assert.equal(destinations.length,3);built.fissionInset.neutrons.forEach((neutron,i)=>assert(neutron.position.clone().normalize().dot(destinations[i].clone().normalize())>.999,'outgoing neutrons illustrate distinct absorption, leakage and new-fission paths'));built.update(model,5,0);assert(!built.fissionInset.active&&!built.fissionInset.incoming.visible&&built.fissionInset.neutrons.every(part=>!part.visible),'shutdown stops the prompt chain-reaction animation');
  built.update(model,.1,1);const route=primary,startProgress=route.progress,startPacket=route.packets[0].position.clone();built.update(model,.11,1);assert(route.progress>startProgress&&route.packets[0].position.distanceTo(startPacket)>0);assert(route.packets[0].position.distanceTo(route.curve.getPoint(route.progress))<1e-8,'circulation follows the positive physical route direction');
  const assertImmutableCaptions=captionObserver(scene,resources);assertImmutableCaptions();built.update(model,4.9,0);assertImmutableCaptions();let coreSprite;scene.traverse(object=>{if(object.isSprite&&object.material.map?.image.textLines.some(line=>/Reacción controlada|Controlled reaction/.test(line)))coreSprite=object;});assert(coreSprite,'the core explanation actually paints the operating state');const operatingTexture=coreSprite.material.map;built.update(model,5,0);assertImmutableCaptions();const shutdownTexture=coreSprite.material.map;assert.notEqual(shutdownTexture,operatingTexture);assert(shutdownTexture.image.textLines.some(line=>/Fisión detenida|Fission stopped/.test(line)));built.update(model,1,0);assertImmutableCaptions();assert.equal(coreSprite.material.map,operatingTexture,'rewinding restores the uploaded operating caption without overwriting its image');const resourceCount=resources.length;for(const time of [4.9,5,1,5,4.9]){built.update(model,time,0);assertImmutableCaptions();assert.equal(resources.length,resourceCount,'replaying known Nuclear states reuses their caption textures');}
  const snapshot=()=>{scene.updateMatrixWorld(true);const values=[];scene.traverse(object=>values.push([object.uuid,object.visible,...object.matrixWorld.elements,object.material?.color?.getHex(),object.material?.emissiveIntensity,object.material?.map?.uuid]));return values;};
  for(const time of [4.9,5.4]){built.update(model,time,3,false,true);const partial=snapshot();built.update(model,time,3,false,true);assert.deepEqual(snapshot(),partial,'pausing freezes every Nuclear actor at its fractional position');built.update(model,24,3,false,true);built.update(model,time,3,false,true);assert.deepEqual(snapshot(),partial,'rewinding reconstructs the same core, circuits and shaft without future state');}
  built.update(model,24,3);const end=snapshot();built.update(model,999,3);assert.deepEqual(snapshot(),end,'the finite journey freezes its final snapshot rather than animating beyond step 24');near(built.state.time,24);
  const visibleBounds=object=>{const box=new THREE.Box3();object.traverse(part=>{if((part.isMesh||part.isSprite)&&visible(part)){part.geometry.computeBoundingBox();box.union(part.geometry.boundingBox.clone().applyMatrix4(part.matrixWorld));}});return box;};
  for(const [aspect,fov] of [[.55,65],[1.8,46]])for(const phase of [0,1,2,3,4]){
   built.update(model,[1.2,2.2,3.6,12,12][phase],Math.min(phase,3),phase===4);scene.updateMatrixWorld(true);const frame=nuclearFraming(Math.min(phase,3),{...lesson.overview,whole:phase===4},aspect,fov),camera=new THREE.PerspectiveCamera(fov,aspect,.1,150);camera.position.copy(frame.center).addScaledVector(frame.direction,frame.distance);camera.lookAt(frame.center);camera.updateMatrixWorld(true);
   const objects=phase===0?[reactor.group,built.fissionInset.group]:phase===1?[sg.group,sg.primaryTube.mesh,sg.transferWall.mesh]:phase===2?[turbine.group,generator.group,condenser.group,condenser.coolingTube.mesh,built.powerBars.group]:phase===3?[reactor.group,built.coreBars.group]:[reactor.group,built.pressurizer.group,sg.group,sg.primaryTube.mesh,sg.transferWall.mesh,turbine.group,generator.group,condenser.group,condenser.coolingTube.mesh,heatExchanger.group,heatExchanger.tube.mesh,...Object.values(pumps).map(pump=>pump.group),...built.routes.map(route=>route.pipe).filter(Boolean)];
   for(const object of objects){const box=visibleBounds(object);if(box.isEmpty())continue;for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const p=new THREE.Vector3(x,y,z).project(camera);assert(Math.abs(p.x)<=1+1e-6&&Math.abs(p.y)<=1+1e-6&&p.z>=-1&&p.z<=1,`real Nuclear teaching geometry fits phase ${phase} at aspect ${aspect}`);}}
  }
  assertImmutableCaptions();built.update(model,24,3);
 }
 if(lesson.id==='ideas'){assert.equal(built.people.length,64);assert.equal(built.stands.length,4);assert.equal(new Set(built.people.map(p=>p.g.uuid)).size,64);const s=lesson.evaluate(defaults(lesson),0);built.update(s,.5,0);assert.equal(built.state.known.size,1);assert.equal(built.packets.filter(p=>p.visible).length,4);assert.equal(built.links.filter(l=>l.m.visible).length,s.edges.length);built.update(s,1,0);assert.equal(built.state.known.size,5);assert.equal(built.people.filter(p=>p.halo.visible).length,4);}
 if(lesson.id==='carbon'){
  const params=defaults(lesson),model=lesson.evaluate(params,0);assert.equal(built.routes.length,5);assert.equal(built.stands.length,4);assert.equal(Object.keys(built.reservoirs).length,4);
  built.update(model,9.5,3);assert(built.routes.find(r=>r.id==='emitted').packets.some(m=>m.visible));assert(Math.abs(built.state.total-100)<1e-8);
  built.update(model,10.5,3);assert.equal(built.routes.find(r=>r.id==='emitted').packets.some(m=>m.visible),false);assert(built.routes.filter(r=>r.id!=='emitted').every(r=>r.packets.some(m=>m.visible)),'stopping fossils must leave natural exchanges visible');
  assert.equal(built.state.reason,'stopped');built.update(model,.5,0);assert.equal(built.state.reason,'active','rewinding reopens the source');
  for(const id of ['air','land','ocean','fossil'])assert(Math.abs(built.reservoirs[id].fill.scale.x-built.state[id]/100)<1e-8,'all reservoir rails have the same mass scale');
 }
 if(lesson.id==='cell'){
  const actuallyVisible=object=>{for(let o=object;o;o=o.parent)if(!o.visible)return false;return true;},position=object=>object.getWorldPosition(new THREE.Vector3()),near=(a,b)=>assert(Math.abs(a-b)<1e-8);
  const dnaId=built.dna.group.uuid,rnaId=built.mrna.group.uuid,dnaTransforms=()=>{scene.updateMatrixWorld(true);const transforms=[];built.dna.group.traverse(object=>transforms.push([...object.matrixWorld.elements]));return transforms;},originalDNA=dnaTransforms();
  assert.notEqual(dnaId,rnaId,'the messenger is a separate copy, not the DNA object transformed into RNA');assert.equal(built.dna.strands.length,2);assert.equal(built.dna.pairs.length,15);assert.equal(built.mrna.bases.length,15);assert.equal(built.mrna.codons.length,5);
  assert.equal(built.stands.length,4);assert.deepEqual(built.stands.map(button=>button.userData.action),[0,1,2,3]);assert(built.stands.every(button=>targets.includes(button)),'all four physical listening buttons are actionable');
  assert.equal(built.pore.rings.length,2);assert.equal(built.pore.lobes.length,8);assert(built.pore.holeRadius>.085);scene.updateMatrixWorld(true);
  const poreAxis=new THREE.Vector3(0,0,1).applyQuaternion(built.pore.group.getWorldQuaternion(new THREE.Quaternion()));assert(poreAxis.dot(built.pore.normal)>.999,'the pore opening is normal to its nuclear-envelope location');
  const ray=new THREE.Raycaster(built.pore.center.clone().addScaledVector(built.pore.normal,.7),built.pore.normal.clone().negate(),0,1.2);assert.equal(ray.intersectObjects([built.nucleus.outer,built.nucleus.inner]).length,0,'both envelope layers have an actual opening, rather than RNA passing through a solid sphere');
  const model=lesson.evaluate(defaults(lesson),0),signed=p=>p.clone().sub(built.pore.center).dot(built.pore.normal);
  // A canvas uploaded to a GPU texture must not be resized and overwritten
  // during seek. Observe the text that would actually be drawn, not metadata
  // claiming that a caption changed.
  const assertImmutableCaptions=captionObserver(scene,resources);
  assertImmutableCaptions();built.update(model,1.9,0);assertImmutableCaptions();
  const copySprite=built.zoneAnnotations[0].children.find(object=>object.isSprite&&object.material.map.image.textLines.some(line=>/7 \/ 15/.test(line)&&/bases copiadas|bases copied/.test(line)));assert(copySprite,'the copied-base caption actually paints the current molecular count');
  const copyTexture7=copySprite.material.map;built.update(model,0,0);assertImmutableCaptions();const copyTexture0=copySprite.material.map;assert.notEqual(copyTexture0,copyTexture7,'rewinding selects an immutable texture for zero copied bases');assert(copyTexture0.image.textLines.some(line=>line.includes('0 / 15')));assert(copyTexture7.image.textLines.some(line=>line.includes('7 / 15')),'the original seven-base image is not overwritten during rewind');
  built.update(model,1,0);assertImmutableCaptions();const copyTexture3=copySprite.material.map;assert.notEqual(copyTexture3,copyTexture0);assert.notEqual(copyTexture3,copyTexture7);assert(copyTexture3.image.textLines.some(line=>line.includes('3 / 15')));
  built.update(model,1.9,0);assertImmutableCaptions();assert.equal(copySprite.material.map,copyTexture7,'returning to a copied-base count reuses the texture already uploaded for that text');
  const cachedResourceCount=resources.length;for(const [time,texture] of [[0,copyTexture0],[1,copyTexture3],[1.9,copyTexture7]]){built.update(model,time,0);assertImmutableCaptions();assert.equal(copySprite.material.map,texture);assert.equal(resources.length,cachedResourceCount,'repeating caption states does not allocate more GPU resources');}
  built.update(model,5,1);let previous=built.mrna.bases.map(base=>position(base.mesh)),crossed=previous.map(()=>false);assert(previous.every(p=>signed(p)<0),'the completed copy starts on the nuclear side');
  for(let step=1;step<=80;step++){
   built.update(model,5+step/40,1);scene.updateMatrixWorld(true);
   built.mrna.bases.forEach((base,i)=>{const current=position(base.mesh),a=signed(previous[i]),b=signed(current);if(a<=0&&b>=0){const crossing=previous[i].clone().lerp(current,-a/(b-a));assert(crossing.distanceTo(built.pore.center)<built.pore.holeRadius-.085,'each visible RNA base crosses through the pore aperture');crossed[i]=true;}previous[i]=current;});
  }
  assert(crossed.every(Boolean));assert(previous.every(p=>signed(p)>0),'the same copy finishes on the cytosolic side');assert.equal(built.mrna.group.uuid,rnaId);assert.deepEqual(dnaTransforms(),originalDNA,'exporting the copy neither removes nor moves the DNA');
  const snapshots=groups=>{scene.updateMatrixWorld(true);return groups.flatMap(group=>{const values=[];group.traverse(object=>{const visible=actuallyVisible(object);values.push([object.uuid,visible,...(visible?[...object.matrixWorld.elements,object.material?.color?.getHex(),object.material?.opacity]:[])]);});return values;});};
  const actors=[built.dna.group,built.polymerase.group,built.mrna.group,built.ribosome.group,built.chain.group];
  for(const variant of [0,1,2]){
   const m=lesson.evaluate({variant},0),expected=variant===2?['Met','Ala']:['Met','Ala','Phe','Glu'],release=variant===2?15:21,recycle=release+1;
   for(const time of [0,2,4,5,6,7,8,9,10,11,12,14,15,16,18,20,21,22,24]){
    built.update(m,time,2,false,true);scene.updateMatrixWorld(true);
    assert.equal(built.dna.group.uuid,dnaId);assert.equal(built.mrna.group.uuid,rnaId);assert.deepEqual(dnaTransforms(),originalDNA,'DNA remains in the nucleus throughout transcription, translation and release');
    const s=built.state;assert.equal(built.mrna.bases.filter(base=>actuallyVisible(base.mesh)).length,s.transcription.fragmentBasesCompleted);assert.equal(built.chain.residues.filter(record=>actuallyVisible(record.mesh)).length,s.chain.length);assert.deepEqual(built.chain.residues.filter(record=>actuallyVisible(record.mesh)).map(record=>record.aminoAcid),expected.slice(0,s.chain.length));
    assert.equal(built.chain.bonds.filter(bond=>actuallyVisible(bond)).length,Math.max(0,s.chain.length-1),'one connection is visible for each completed peptide link');
    for(let i=0;i<s.chain.length-1;i++){const bond=built.chain.bonds[i],a=new THREE.Vector3(0,-.5,0).applyMatrix4(bond.matrixWorld),b=new THREE.Vector3(0,.5,0).applyMatrix4(bond.matrixWorld);assert(a.distanceTo(position(built.chain.residues[i].mesh))<1e-8&&b.distanceTo(position(built.chain.residues[i+1].mesh))<1e-8,'peptide bonds connect the actual visible residues');}
    if(time<7){assert(!actuallyVisible(built.ribosome.group));assert.equal(s.chain.length,0);assert(Object.values(built.trnas).every(record=>!actuallyVisible(record.group)));assert(!actuallyVisible(built.releaseFactor.group),'translation actors are not active before nuclear export');}
    if(s.translation.trna?.bound){const trna=built.trnas[s.translation.trna.kind],codon=built.mrna.codons[s.translation.codonIndex];assert(actuallyVisible(trna.group));assert.equal(trna.site,s.translation.codonIndex===0?'P':'A');assert.equal(trna.codonIndex,s.translation.codonIndex);assert.equal(trna.value,expected[s.translation.codonIndex]);if(time<s.translation.window.commit)assert(position(trna.group).distanceTo(codon.anchor)<.06,'bound incoming tRNA is positioned over its actual codon');assert.equal(trna.aminoAcid.visible,s.translation.trna.carryingAminoAcid,'the amino acid leaves its carrier when incorporated');}
    if(s.translation.releaseFactor?.bound){assert(actuallyVisible(built.releaseFactor.group));assert.equal(built.releaseFactor.site,'A');assert.equal(s.translation.trna,null);assert(!actuallyVisible(built.trnas.elongation.group),'STOP has a release factor rather than a fictitious tRNA');assert(position(built.releaseFactor.group).distanceTo(built.mrna.codons[s.expected.stopIndex].anchor)<.06);}
    if(time>=recycle){assert.equal(s.translation.readCodons,variant===2?3:5);assert.equal(built.chain.length,expected.length);assert.equal(built.chain.attached,false);assert.equal(built.chain.released,true);assert(Object.values(built.trnas).every(record=>!actuallyVisible(record.group)));assert(!actuallyVisible(built.releaseFactor.group));assert(built.mrna.bases.every(base=>actuallyVisible(base.mesh)),'translation leaves the original RNA copy present');assert(built.mrna.codons.every(codon=>!codon.highlight.visible),'a recycled ribosome does not keep reading');}
    if(variant===2&&time>=14)assert(built.mrna.codons.slice(3).every(codon=>codon.status==='skipped'&&!codon.highlight.visible&&codon.caption.m.material.opacity<.5),'the first STOP visibly prevents the later GAA and STOP from being read');
    scene.traverse(object=>assert(object.matrixWorld.elements.every(Number.isFinite),'Cell fractional/causal/terminal transforms are finite'));assertImmutableCaptions();
   }
   assert.equal(built.chain.group.parent,scene,'the peptide can leave the ribosome independently');built.update(m,release-1e-7,2);const attachedPosition=position(built.chain.group);built.update(m,recycle,2);assert(position(built.chain.group).distanceTo(attachedPosition)>.5,'release actually separates the peptide from its previous attachment');
   const final=snapshots(actors);built.update(m,24,2);assert.deepEqual(snapshots(actors),final,'the completed molecular process is quiet after recycling');
   for(const organelle of Object.values(built.organelles))assert(!new THREE.Box3().setFromObject(organelle.group).containsPoint(position(built.chain.group)),'this cytosolic example is not automatically sent through ER, Golgi or mitochondria');
   for(const boundary of (variant===2?[10,13]:[10,13,16,19])){built.update(m,boundary-1e-7,2);const before=position(built.ribosome.group);built.update(m,boundary,2);assert(position(built.ribosome.group).distanceTo(before)<1e-5,'the physical ribosome does not teleport between completed codons');}
   built.update(m,8.4,2);const partial=snapshots(actors);built.update(m,8.4,2);assert.deepEqual(snapshots(actors),partial,'pausing at a fractional codon position freezes all visible actors');built.update(m,24,2);built.update(m,8.4,2);assert.deepEqual(snapshots(actors),partial,'rewinding reconstructs the same visible molecular state without residual future geometry');
   assert.equal(built.chain.length,0);assert(!built.releaseFactor.active);assert(built.mrna.codons.slice(1).every(codon=>!codon.highlight.visible));built.update(m,0,0);assert.equal(built.mrna.bases.filter(base=>actuallyVisible(base.mesh)).length,0);assert.equal(built.chain.length,0);assert.equal(built.polymerase.group.visible,true);assert.deepEqual(dnaTransforms(),originalDNA);
  }
  const visibleBounds=object=>{const box=new THREE.Box3();object.traverse(part=>{if((part.isMesh||part.isSprite)&&actuallyVisible(part)){part.geometry.computeBoundingBox();box.union(part.geometry.boundingBox.clone().applyMatrix4(part.matrixWorld));}});return box;};
  for(const [aspect,fov] of [[.55,65],[1.8,46]])for(const phase of [0,1,2,3,4]){
   const time=[3,6,14,24,24][phase];built.update(model,time,Math.min(phase,3),phase===4);scene.updateMatrixWorld(true);const framing=cellFraming(Math.min(phase,3),{...lesson.overview,whole:phase===4},aspect,fov),camera=new THREE.PerspectiveCamera(fov,aspect,.1,150);camera.position.copy(framing.center).addScaledVector(framing.direction,framing.distance);camera.lookAt(framing.center);camera.updateMatrixWorld(true);
   const objects=phase===0?[built.dna.group,built.polymerase.group,built.nucleus.outer,built.nucleus.inner]:phase===1?[built.pore.group,built.mrna.group]:phase===2?[built.mrna.group,built.ribosome.group,built.chain.group]:phase===3?[built.mrna.group,built.ribosome.group,built.chain.group,...Object.values(built.organelles).map(record=>record.group)]:[built.membrane.outer,built.membrane.inner,built.nucleus.outer,built.dna.group,built.mrna.group,built.ribosome.group,built.chain.group,...Object.values(built.organelles).map(record=>record.group)];
   for(const object of objects){const box=visibleBounds(object);if(box.isEmpty())continue;for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const p=new THREE.Vector3(x,y,z).project(camera);assert(Math.abs(p.x)<=1+1e-6&&Math.abs(p.y)<=1+1e-6&&p.z>=-1&&p.z<=1,`real Cell teaching geometry fits phase ${phase} at aspect ${aspect}`);}}
  }
  built.update(model,24,3);assert.equal(built.chain.length,4);near(built.state.time,24);assertImmutableCaptions();
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
 if(lesson.id==='microchip'){
  const colors={zero:0x5eafff,one:0x86e7b3,pending:0x526b7b},color=bit=>bit===null?colors.pending:bit===0?colors.zero:colors.one,near=(a,b)=>assert(Math.abs(a-b)<1e-8);
  const expectedEdges=[['a','xor1'],['b','xor1'],['a','and1'],['b','and1'],['xor1','xor2'],['cin','xor2'],['xor1','and2'],['cin','and2'],['and1','or'],['and2','or'],['xor2','sum'],['or','cout']];
  assert.deepEqual(built.routes.map(r=>[r.from,r.to]).sort(),expectedEdges.toSorted());assert.equal(built.routes.length,12);
  assert.equal(built.gates.filter(g=>g.operation==='XOR').length,2);assert.equal(built.gates.filter(g=>g.operation==='AND').length,2);assert.equal(built.gates.filter(g=>g.operation==='OR').length,1);
  assert(built.gates.every(g=>g.body.geometry.type==='ExtrudeGeometry'),'logical operations use three-dimensional gate symbols');
  for(const g of built.gates.filter(g=>g.operation==='XOR'))assert(g.group.children.some(m=>m.geometry?.type==='TubeGeometry'),'XOR has its distinguishing extra input arc');
  for(const route of built.routes){
   const sourceTerminal=built.gateRecords[route.from]?`${route.from}.out`:route.from,targetTerminal=route.port?`${route.to}.${route.port}`:route.to;
   const start=built.terminals[sourceTerminal],end=built.terminals[targetTerminal];
   assert(start&&end,'every wire has a defined physical source and destination');assert.equal(route.sourceTerminal,sourceTerminal);assert.equal(route.targetTerminal,targetTerminal);
   const semanticPin=['sum','cout'].includes(route.to)?route.to:({xor1:'x',and1:'ab',and2:'cx'}[route.from]||route.from);assert.equal(route.pin,semanticPin,'semantic input names stay distinct from physical in1/in2 ports');
   const semanticTarget=built.terminals[built.gateRecords[route.to]?`${route.to}.${semanticPin}`:route.to];assert(semanticTarget&&semanticTarget.distanceTo(end)<1e-8,'the semantic signal reaches its corresponding physical pin');
   assert(route.curve.getPoint(0).distanceTo(start)<1e-8,'wire starts at the actual source terminal');assert(route.curve.getPoint(1).distanceTo(end)<1e-8,'wire reaches its actual destination pin');
  }
  for(const gate of built.gates){const incoming=built.routes.filter(r=>r.to===gate.id);assert.equal(incoming.length,2);assert.notEqual(incoming[0].pin,incoming[1].pin);assert.deepEqual(incoming.map(r=>r.port).sort(),['in1','in2'],'every gate receives two distinct physical input pins');}
  assert.equal(built.stands.length,4);assert.deepEqual(built.stands.map(b=>b.userData.action),[0,1,2,3]);assert(built.stands.every(b=>targets.includes(b)));
  scene.updateMatrixWorld(true);const bounds=object=>new THREE.Box3().setFromObject(object),mos=built.mos;
  const dielectric=bounds(mos.oxide),gate=bounds(mos.gate),channel=bounds(mos.channel),source=bounds(mos.source),drain=bounds(mos.drain);
  assert(gate.min.y>=dielectric.max.y-1e-6&&dielectric.min.y>channel.max.y,'a separate dielectric lies between gate and conducting channel');
  assert(!gate.intersectsBox(source)&&!gate.intersectsBox(drain),'the gate is not a metallic source-drain bridge');assert(!source.intersectsBox(drain));
  assert(Math.abs(channel.min.x-source.max.x)<1e-6&&Math.abs(channel.max.x-drain.min.x)<1e-6,'the schematic channel actually reaches both doped regions');
  for(const transistor of [built.inverter.pm,built.inverter.nm])assert(!bounds(transistor.gate).intersectsBox(bounds(transistor.channel)),'CMOS gates remain insulated from their conduction channels');
  assert(built.inverter.gateWires.every(wire=>built.inverter.powerRails.every(rail=>!bounds(wire).intersectsBox(bounds(rail)))),'input wiring cannot short to the VDD/GND rails');
  for(let a=0;a<=1;a++)for(let b=0;b<=1;b++)for(let cin=0;cin<=1;cin++){
   const model=lesson.evaluate({a:!!a,b:!!b,carry:!!cin},0);built.update(model,1,2);
   assert.equal(built.inverter.pm.on,!a);assert.equal(built.inverter.nm.on,!!a);assert.notEqual(built.inverter.paths.pullup.mesh.visible,built.inverter.paths.pulldown.mesh.visible,'exactly one static CMOS path conducts');
   assert.equal(built.inverter.output.material.color.getHex(),color(1-a));assert.equal(built.inputs.a.value,a);assert.equal(built.inputs.a.pad.material.color.getHex(),color(a));
   for(const input of ['a','b','cin'])for(const route of built.routes.filter(r=>r.from===input)){assert(route.packet.visible,'both zero and one propagate along active input wires');assert.equal(route.packet.material.color.getHex(),color({a,b,cin}[input]));}
   assert(built.gates.every(g=>g.value===null));assert.equal(built.outputs.sum.value,null);assert.equal(built.outputs.sum.pad.material.color.getHex(),colors.pending,'pending is not blue logic zero');
   built.update(model,4,2);assert.equal(built.gateRecords.xor1.value,a^b);assert.equal(built.gateRecords.and1.value,a&b);assert.equal(built.logicalNodes.xor1.material.color.getHex(),color(a^b));assert.equal(built.gateRecords.xor2.value,null);
   built.update(model,8,3);assert.equal(built.gateRecords.xor2.value,(a+b+cin)%2);assert.equal(built.gateRecords.and2.value,cin&(a^b));assert.equal(built.outputs.sum.value,null);
   built.update(model,10,3);assert.equal(built.gateRecords.or.value,Math.floor((a+b+cin)/2));assert.equal(built.outputs.cout.value,null);
   built.update(model,12-1e-8,3);assert.equal(built.state.result.ready,false);assert.equal(built.outputs.sum.pad.material.color.getHex(),colors.pending);assert.equal(built.outputs.cout.pad.material.color.getHex(),colors.pending);
   built.update(model,12,3);const sum=(a+b+cin)%2,cout=Math.floor((a+b+cin)/2);assert.equal(built.outputs.sum.value,sum);assert.equal(built.outputs.cout.value,cout);assert.equal(built.outputs.sum.pad.material.color.getHex(),color(sum));assert.equal(built.outputs.cout.pad.material.color.getHex(),color(cout));assert(built.routes.every(r=>!r.packet.visible),'completed propagation has no endless travelling pulses');
   built.update(model,1,2);assert(built.gates.every(g=>g.value===null));assert.equal(built.outputs.sum.value,null);assert.equal(built.outputs.cout.value,null);assert(built.routes.filter(r=>!['a','b','cin'].includes(r.from)).every(r=>!r.packet.visible&&r.segments.every(s=>!s.visible)),'rewinding clears future wire illumination');
  }
  const model=lesson.evaluate(defaults(lesson),0);built.update(model,5.4,2);const positions=built.routes.map(r=>r.packet.position.clone());built.update(model,5.4,2);built.routes.forEach((r,i)=>assert(r.packet.position.equals(positions[i]),'paused fractional propagation is stationary'));
  scene.updateMatrixWorld(true);
  for(const [aspect,fov] of [[.55,65],[1.8,46]])for(const phase of [0,1,2,3,4]){
   const framing=microchipFraming(Math.min(3,phase),{...lesson.overview,whole:phase===4},aspect,fov),camera=new THREE.PerspectiveCamera(fov,aspect,.1,150);
   camera.position.copy(framing.center).addScaledVector(framing.direction,framing.distance);camera.lookAt(framing.center);camera.updateMatrixWorld(true);
   const objects=phase===0?[mos.group]:phase===1?[built.inverter.group]:phase===2?[built.adder.group]:phase===3?[built.outputs.sum.group,built.outputs.cout.group]:[mos.group,built.inverter.group,built.adder.group];
   for(const object of objects){const box=bounds(object);for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const p=new THREE.Vector3(x,y,z).project(camera);assert(Math.abs(p.x)<=1+1e-6&&Math.abs(p.y)<=1+1e-6&&p.z>=-1&&p.z<=1,'real teaching geometry fits the desktop/mobile frustum');}}
  }
  for(const time of [0,1,4,5.4,8,10,11.999,12]){built.update(model,time,2);scene.updateMatrixWorld(true);scene.traverse(object=>assert(object.matrixWorld.elements.every(Number.isFinite),'Microchip causal/fractional/end transforms are finite'));}
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
 for(const state of states){update(state,lesson.continuous?(typeof state.time==='number'?state.time:typeof state.continuous==='number'?state.continuous:state.t??state.interval):5,3);scene.updateMatrixWorld(true);let meshes=0;scene.traverse(o=>{assert([...o.matrixWorld.elements].every(Number.isFinite),lesson.id+' invalid transform');if(o.isMesh){meshes++;const positions=o.geometry.attributes.position;assert([...positions.array].every(Number.isFinite),lesson.id+' invalid geometry');}});assert(meshes>40,lesson.id+' needs a built scene');}
 for(let stop=0;stop<4;stop++){const p=(lesson.poseAt||poseAt)(stop),camera=new THREE.PerspectiveCamera(60,1,.08,150);camera.position.set(p.x,1.65,p.z);camera.rotation.set(p.pitch,p.yaw,0,'YXZ');camera.updateMatrixWorld(true);const direction=new THREE.Vector3();camera.getWorldDirection(direction);const to=new THREE.Vector3(...(['evolution','electricity','microchip','cell','nuclear'].includes(lesson.id)?built.focus[stop]:lesson.id==='carbon'?[[-7,4.6,0],[-4,1.5,0],[5,0,0],[-1,1.5,1]][stop]:[0,lesson.id==='ideas'?1.2:1.9,lesson.id==='ideas'?0:-stop*16])).sub(camera.position).normalize();assert(direction.dot(to)>.97,'arrival faces the actual exhibit');}
 if(['cell','nuclear'].includes(lesson.id)){const counts=new Map(resources.filter(resource=>resource.isCanvasTexture).map(texture=>[texture,0]));for(const texture of counts.keys())texture.addEventListener('dispose',()=>counts.set(texture,counts.get(texture)+1));resources.forEach(resource=>resource.dispose());assert([...counts.values()].every(count=>count===1),'all cached caption textures are disposed exactly once');}
 else resources.forEach(r=>r.dispose());
}
assert.equal(nuclearBuilds,2,'the real Nuclear scene is tested in both languages');
console.log(`${sceneBuilds} bilingual scene builds (${nuclearBuilds} Nuclear): Nuclear isolated closed circuits/shared exchange tubes/cutaway faces/STOP bypass and shaft/decay/cached captions/mobile frusta, Cell retained DNA/same RNA through real pore/codon tRNA/first STOP/release/mobile frusta/immutable cached captions, causal Microchip fanout/zero signals/insulated MOS+CMOS, Electricity cores/routes/storage/curtailment, finite geometry, Evolution genealogy, no rounded deterministic bodies, four actionable stands and camera poses: OK (no pixel rendering)`);
