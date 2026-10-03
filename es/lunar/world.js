import * as THREE from '../../vendor/three.module.js';
import {buildMission} from './mission-world.js';
import {deliveriesAt,missionPose} from './mission.js';
import {visualKit} from './visuals.js';
import {RoomEnvironment} from '../../vendor/RoomEnvironment.js';
const V=p=>new THREE.Vector3(...p),GOLD=0xffbc6b,MINT=0x87e3c3;
const BASE_DETAILS={power:{min:[-24,-.25,-24],max:[4,4,-16],scope:'power-detail',samples:0},mine:{min:[-24,-.45,-16],max:[-3,5,-7],scope:'extraction-processing-detail',samples:0},factory:{min:[-1,-.25,-8],max:[25,5,10],scope:'assembly-detail',samples:16}};
export function buildLunarScene(es,{textures=true}={}){
 const scene=new THREE.Scene(),resources=[],own=x=>(resources.push(x),x),mats=new Map(),parts={};
 scene.background=new THREE.Color(0x070d18);
 scene.add(new THREE.HemisphereLight(0xc9e3ff,0x34313b,.95));
 const sun=new THREE.DirectionalLight(0xffecd3,3.6);sun.position.set(-12,23,8);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-55,right:55,top:100,bottom:-50,near:.1,far:200});sun.shadow.bias=-.0003;sun.shadow.normalBias=.08;sun.position.set(-35,65,24);scene.add(sun);
 const fill=new THREE.DirectionalLight(0x6da1dd,.75);fill.position.set(10,9,-12);scene.add(fill);
 const kit=visualKit(own,{textures});
 const mat=(c,e=0)=>{const k=c+':'+e;if(!mats.has(k))mats.set(k,own(new THREE.MeshStandardMaterial({color:c,roughness:.6,metalness:.25,emissive:c,emissiveIntensity:e})));return mats.get(k);};
 const cube=own(new THREE.BoxGeometry(1,1,1)),sphere=own(new THREE.SphereGeometry(1,32,20));
 const box=(g,p,s,c,e=0)=>{const m=new THREE.Mesh(cube,mat(c,e));m.position.set(...p);m.scale.set(...s);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;};
 function cyl(g,p,r,h,c){const m=new THREE.Mesh(own(new THREE.CylinderGeometry(r,r,h,24)),mat(c));m.position.set(...p);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
 function pipe(g,pts,c=GOLD,r=.035){const curve=new THREE.CatmullRomCurve3(pts.map(V));const m=new THREE.Mesh(own(new THREE.TubeGeometry(curve,64,r,6,false)),mat(c,.25));g.add(m);return curve;}
 function label(g,text,p,width=4){if(!textures)return;const c=document.createElement('canvas'),ctx=c.getContext('2d');ctx.font='500 32px system-ui';c.width=Math.ceil(ctx.measureText(text).width+32);c.height=60;ctx.font='500 32px system-ui';ctx.fillStyle='#091322d9';ctx.fillRect(0,0,c.width,60);ctx.fillStyle='#edf3fa';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,c.width/2,30);const tex=own(new THREE.CanvasTexture(c));tex.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(own(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,depthTest:false,fog:false})));s.renderOrder=10;s.position.set(...p);s.scale.set(width,width*60/c.width,1);g.add(s);return s;}
 function panel(g,p,scale=1){const a=kit.solar(g,p,2.9*scale,1.7*scale);a.rotation.x=.27;return a;}
 function lander(g,p,scale=1){const a=new THREE.Group();a.position.set(...p);a.scale.setScalar(scale);g.add(a);cyl(a,[0,1.2,0],.65,1.2,0xbebcb1);cyl(a,[0,.43,0],.3,.45,0x525a65);box(a,[0,2,0],[1,.3,1],0xc8ad77);for(let i=0;i<4;i++){const angle=i*Math.PI/2,x=Math.cos(angle),z=Math.sin(angle);pipe(a,[[x*.5,1,z*.5],[x*1.15,.15,z*1.15]],0xc7bea4,.04);box(a,[x*1.15,.05,z*1.15],[.45,.08,.45],0x8b8e94);}panel(a,[-1.5,1.6,0],.6);panel(a,[1.5,1.6,0],.6);return a;}
 const stars=[];for(let i=0;i<700;i++){const a=i*2.399963,y=1-2*(i+.5)/700,r=Math.sqrt(1-y*y);stars.push(100*Math.cos(a)*r,100*y,100*Math.sin(a)*r);}const sg=own(new THREE.BufferGeometry());sg.setAttribute('position',new THREE.Float32BufferAttribute(stars,3));const starfield=new THREE.Points(sg,own(new THREE.PointsMaterial({size:.11,color:0x94aac9,fog:false})));scene.add(starfield);const launchFog=new THREE.Fog(0x9fc0d4,70,190),lunarFog=new THREE.Fog(0x070d18,60,130);
 const route=new THREE.Group(),base=new THREE.Group();scene.add(route,base);
 const mission=buildMission(es,{textures});scene.add(mission.group);
 const em=own(new THREE.MeshStandardMaterial({color:0x0d2238,roughness:.9,fog:false,envMapIntensity:0}));
 if(textures)new THREE.TextureLoader().load('../kardashev/earth-blue-marble.jpg',tx=>{own(tx);tx.colorSpace=THREE.SRGBColorSpace;em.map=tx;em.emissiveMap=tx;em.emissive.set(0xffffff);em.emissiveIntensity=.1;em.color.set(0xffffff);em.needsUpdate=true;});
 const earth=new THREE.Mesh(sphere,em);earth.position.set(-13,2,-2);earth.scale.setScalar(4.6);earth.rotation.y=-.9;route.add(earth);kit.atmosphere(route,earth,4.6);
 const moon=new THREE.Mesh(kit.craterSphere(),kit.moonMaterial());moon.position.set(13,0,0);moon.scale.setScalar(5.3);moon.rotation.set(.3,-.8,0);moon.castShadow=moon.receiveShadow=true;route.add(moon);
 label(route,es?'TIERRA · equipos y componentes':'EARTH · equipment and components',[-13,8,0],10);label(route,es?'LUNA · fabricar y reinvertir':'MOON · manufacture and reinvest',[13,7.4,0],9);
 const trajectory=pipe(route,[[-10,3,2],[-7,7,6],[1,9,6],[8,7,5],[12,3,5]],0x7794ad,.025);
 function freighter(g,p,scale){const ship=kit.ship(g,{scale});ship.group.position.set(...p);ship.burn.visible=false;return ship.group;}
 const ships=Array.from({length:12},()=>freighter(route,[0,0,0],.13));parts.deliveries={ships,batches:[],inFlightCount:0};
 // A lunar worksite, not an engineering blueprint or a to-scale map.
 kit.terrain(base,360,360,100);
 box(base,[24,-.13,16],[100,.25,100],0x424b55);
 const earthrise=new THREE.Mesh(sphere,em);earthrise.position.set(-33,20,-60);earthrise.scale.setScalar(8);base.add(earthrise);kit.atmosphere(base,earthrise,8);
 // Fixed seed infrastructure: landing pad, mine, processor and imported component store.
 cyl(base,[-17,0,11],4,.08,0x7a7c82);const padRing=new THREE.Mesh(own(new THREE.TorusGeometry(3.5,.035,5,64)),mat(GOLD,.7));padRing.rotation.x=Math.PI/2;padRing.position.set(-17,.07,11);base.add(padRing);freighter(base,[-17,.04+.81*.45,11],.45);
 label(base,es?'01 · ENTREGAS':'01 · DELIVERIES',[-17,4.5,11],6);
 const mine=new THREE.Group();mine.position.set(-18,0,-11);base.add(mine);cyl(mine,[0,-.25,0],3.6,.3,0x353b45);
 const rover=new THREE.Group();mine.add(rover);box(rover,[0,.8,0],[2.6,.7,1.6],0xbfb6a4);box(rover,[.3,1.4,0],[1.1,.6,1.1],GOLD);for(const x of [-.9,.9])for(const z of [-.9,.9]){const w=cyl(rover,[x,.4,z],.4,.22,0x222d3a);w.rotation.x=Math.PI/2;}pipe(rover,[[.9,1,0],[2,2.4,0],[3,.3,0]],0xd3ac72,.13);box(rover,[3,.22,0],[.7,.4,1.4],0x858c96);
 label(base,es?'02 · REGOLITO':'02 · REGOLITH',[-18,4,-11],5.5);
 const processor=new THREE.Group();processor.position.set(-7,0,-12);base.add(processor);box(processor,[0,.5,0],[5,1,4],0x687b8f);for(let x=-1.5;x<=1.5;x+=1.5){cyl(processor,[x,2,0],.65,2.3,0xbbc9cb);cyl(processor,[x,3.2,0],.75,.15,0xe9c28a);}pipe(base,[[-16,.3,-10],[-12,.3,-10],[-8,.9,-12]],GOLD,.13);label(base,es?'03 · PROCESAR':'03 · PROCESS',[-7,5,-12],5.5);
 // Process-vessel bands, ladder, radiator and protected service trench.
 for(const x of [-1.5,0,1.5]){kit.ring(processor,[x,2.9,0],.67,.04,0x778992);kit.ring(processor,[x,1.3,0],.67,.04,0x778992);kit.rod(processor,[x,1,.7],[x,3,.7],.035);}
 for(let i=0;i<6;i++)box(processor,[-2.55,.5+i*.35,1],[.04,.04,.7],0xcbd5d5);
 kit.solar(processor,[0,1,-3.3],5,1.2);
 for(let i=0;i<7;i++)box(base,[-13+i*3,.025,-17],[2.95,.06,.35],0x43535e);
 for(let i=0;i<10;i++){const a=i*Math.PI/5;kit.cyl(base,[-17+Math.cos(a)*3.8,.18,11+Math.sin(a)*3.8],.065,.25,0xd9c299);}
 for(let i=0;i<5;i++)for(const z of [10.2,11.8])box(base,[-13+i,.02,z],[.3,.025,.2],0x45464e);
 const stores=new THREE.Group();stores.position.set(-7,0,10);base.add(stores);for(let i=0;i<6;i++)kit.crate(stores,[-2+(i%3)*1.5,.1+Math.floor(i/3)*1.05,0],.87);label(base,es?'COMPONENTES DE LA TIERRA':'COMPONENTS FROM EARTH',[-7,4,10],7);
 const power=new THREE.Group();base.add(power);for(let i=0;i<8;i++){panel(power,[-21+i*2.8,1,-20],.8);cyl(power,[-21+i*2.8,.5,-20],.07,1,0xb0b9c5);}
 label(base,es?'ENERGÍA + ALMACENAMIENTO':'POWER + STORAGE',[-10,3,-20],8);
 for(const x of [-5,-2,1])box(power,[x,1,-20],[1,2,1.4],0x91a4b7);
 // Each repeated complex aggregates productive equipment, including power hardware.
 const bodyInstances=new THREE.InstancedMesh(cube,mat(0xbfc5c9),256),roofInstances=new THREE.InstancedMesh(cube,mat(0xc4a779),256),solarInstances=new THREE.InstancedMesh(cube,mat(0x174475),256),doorInstances=new THREE.InstancedMesh(cube,mat(MINT,.3),256);
 const mini=new THREE.Group();mini.position.set(12.5,0,5.2);mini.scale.setScalar(.065);route.add(mini);
 const instances=[bodyInstances,roofInstances,solarInstances,doorInstances];instances.forEach(i=>{i.castShadow=true;i.receiveShadow=true;base.add(i);});
 const miniInstances=instances.map(i=>{const a=new THREE.InstancedMesh(i.geometry,i.material,256);mini.add(a);return a;});
 // Repeated detail stays instanced as the industrial district expands.
 const detailParts=[[[0,1.86,0],[1.7,.09,2.1],0x183b57],[[.88,1.88,0],[.12,.12,2.1],0xa7b9c2],[[-.88,1.88,0],[.12,.12,2.1],0xa7b9c2],[[0,.95,1.35],[1.8,.17,.05],0x254453],[[1.28,.55,0],[.1,.8,1.8],0x849bab],[[0,.07,0],[2.9,.12,3],0x525d67]];
 for(const part of detailParts){const a=new THREE.InstancedMesh(cube,mat(part[2]),256);a.castShadow=true;a.receiveShadow=true;instances.push(a);base.add(a);const b=new THREE.InstancedMesh(cube,a.material,256);miniInstances.push(b);mini.add(b);}
 const transform=new THREE.Object3D();let representation=100,lastCapital=-1;
 const slots=[];for(let ring=0;ring<16;ring++){for(let x=0;x<=ring;x++)slots.push([10+x*4,-6+ring*4.4]);for(let z=0;z<ring;z++)slots.push([10+ring*4,-6+z*4.4]);}
 const campus={kind:'fixed-position-capacity-samples',slots,samples:[],displayedCount:0,logicalCount:0,tonnesPerSample:100,aggregate:false,bounds:new THREE.Box3()};parts.campus=campus;
 function updateCapacity(capital){
  if(capital===lastCapital)return;lastCapital=capital;
  representation=Math.max(100,capital/256);const count=Math.min(256,Math.ceil(capital/100));campus.displayedCount=count;campus.logicalCount=Math.ceil(capital/100);campus.tonnesPerSample=representation;campus.aggregate=capital>25600;campus.samples=[];
  instances.forEach(i=>i.count=count);miniInstances.forEach(i=>i.count=count);
  for(let i=0;i<count;i++){
   const [x,z]=slots[i],fraction=Math.min(1,(capital-i*representation)/representation),cellParts=[[[x,.85,z],[2.55,1.7,2.6]],[[x,1.76,z],[2.65,.12,2.7]],[[x+1.5,.85,z+1.6],[1.1,.08,2]],[[x,.6,z+1.32],[.8,1.1,.035]]];
   detailParts.forEach(([p,size])=>cellParts.push([[x+p[0],p[1],z+p[2]],size]));
   const tint=new THREE.Color().setScalar(.4+.6*fraction);cellParts.forEach(([p,size],j)=>{transform.position.set(...p);transform.scale.set(...size);transform.rotation.set(0,0,0);transform.updateMatrix();instances[j].setMatrixAt(i,transform.matrix);miniInstances[j].setMatrixAt(i,transform.matrix);instances[j].setColorAt(i,tint);miniInstances[j].setColorAt(i,tint);});
   campus.samples.push({id:'capacity-'+String(i+1).padStart(3,'0'),position:[x,0,z],fraction,fromTonnes:i*representation,toTonnes:Math.min(capital,(i+1)*representation)});
  }
  [...instances,...miniInstances].forEach(i=>{i.instanceMatrix.needsUpdate=true;i.instanceColor.needsUpdate=true;i.computeBoundingSphere();});campus.bounds.makeEmpty();for(const sample of campus.samples){const [x,,z]=sample.position;campus.bounds.expandByPoint(V([x-1.5,0,z-1.5]));campus.bounds.expandByPoint(V([x+2.1,2.1,z+2.65]));}
 }
 label(base,es?'04 · FABRICAR → AMPLIAR':'04 · MANUFACTURE → EXPAND',[12,4,-7],8);
 const cargoPath=pipe(base,[[-17,1,11],[-12,1,11],[-7,1,10],[0,.6,6],[5,1,0]],GOLD,.035),materialPath=pipe(base,[[-18,.8,-11],[-7,1,-12],[0,1,-10],[5,1,0]],MINT,.045);
 const cargo=Array.from({length:8},()=>box(base,[0,0,0],[.25,.25,.4],GOLD,.4)),ore=Array.from({length:12},()=>box(base,[0,0,0],[.27,.27,.27],MINT,.4));
 parts.operation={cargo,ore,cargoPath,materialPath,active:false,month:0,kind:'completed-month-example'};parts.mission=mission.parts;
 const assembly=new THREE.Group();base.add(assembly);box(assembly,[5,.7,0],[3.5,1.4,3],0x6f8998);box(assembly,[5,1.43,0],[3.7,.08,3.2],0x233b4d);for(const x of [4.2,5.8]){cyl(assembly,[x,1.85,0],.18,.8,0xb5c9cb);pipe(assembly,[[x,2.2,0],[x,2.2,.8],[5,1.6,.8]],GOLD,.065);}label(base,es?'ENSAMBLAR → ACTIVAR':'ASSEMBLE → ACTIVATE',[5,3.1,0],6);parts.process={power,mine,processor,assembly};
 const focusRing=new THREE.Mesh(own(new THREE.TorusGeometry(3.6,.065,6,70)),mat(GOLD,.5));focusRing.rotation.x=Math.PI/2;focusRing.position.y=.1;base.add(focusRing);
 let view='route',row=null;
 function setView(v){view=v;route.visible=v==='route';base.visible=v==='base'||v==='growth';mission.group.visible=v==='mission';}
 function updateFrame(frame){
  if(frame.view&&frame.view!==view)setView(frame.view);const state=frame.row,stage=frame.stage,onEarth=view==='mission'&&['liftoff','booster'].includes(stage);scene.background.set(onEarth?0x3a5265:0x070d18);scene.fog=onEarth?launchFog:view==='base'||view==='growth'||view==='mission'&&['descent','unload','return'].includes(stage)?lunarFog:null;starfield.visible=!onEarth;row=state;updateCapacity(state.capital);
  const active=frame.deliveries||[];ships.forEach((s,i)=>{s.visible=i<active.length;if(active[i]){s.position.copy(trajectory.getPointAt(active[i].progress));s.quaternion.setFromUnitVectors(V([0,1,0]),trajectory.getTangentAt(active[i].progress));s.userData.delivery={...active[i]};}});parts.deliveries.batches=active;parts.deliveries.inFlightCount=frame.inFlightCount??active.reduce((n,b)=>n+(b.count||1),0);
  if(view==='mission'){const id=frame.mission?stage:'liftoff';mission.update(id,frame.mission?.u||0,frame.mission||missionPose(id,0));}
  const operation=frame.operation||{active:false,progress:0,month:state.month},flow=(markers,path,enabled)=>markers.forEach((m,i)=>{const f=operation.progress-i*.035;m.visible=operation.active&&enabled&&f>=0&&f<=1;if(m.visible)m.position.copy(path.getPointAt(f));});flow(cargo,cargoPath,operation.imported>0);flow(ore,materialPath,operation.local>0);Object.assign(parts.operation,{active:operation.active,month:operation.month,kind:operation.kind,build:operation.build,imported:operation.imported,local:operation.local});rover.position.x=operation.active?.35*operation.progress:0;rover.rotation.y=0;
  const locations={power:[-10,-20],mine:[-18,-11],factory:[6,0],seed:[-17,11],launch:[-17,11],replicate:[12,0],limits:[12,0]},p=locations[stage]||[12,0];focusRing.position.set(p[0],.14,p[1]);parts.frame=frame;
 }
 function update(state,time,stage){const month=state.exactMonth??state.month,operation={active:state.month>0&&state.build>0,progress:month%1,month:state.month,kind:'completed-month-example',build:state.build,local:state.localMade,imported:state.build-state.localMade},deliveries=deliveriesAt(state.deliveryEvents||[],month);updateFrame({view,row:state,stage,mission:['liftoff','booster','refuel','transfer','descent','unload','return'].includes(stage)?missionPose(stage,state.narrativeProgress||0):null,operation,deliveries});}
 function capacityScope(){const detail=view==='base'?BASE_DETAILS[parts.frame?.stage]:null;return {focusCount:view==='base'?Math.min(detail?.samples??16,campus.displayedCount):campus.displayedCount,viewScope:view==='base'?detail?.scope??'processes-and-first-16-samples':'complete-campus'};}
 function subjectBounds(){if(view==='mission'){const box=new THREE.Box3(),add=object=>{if(!object.visible)return;if(object.geometry){object.geometry.computeBoundingBox();box.union(object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld));}for(const child of object.children)add(child);};for(const object of mission.subjectObjects(parts.frame?.mission?parts.frame.stage:'liftoff'))add(object);return box;}if(view==='route')return new THREE.Box3(V([-19,-6,-7]),V([20,11,9]));if(view==='base'){const detail=BASE_DETAILS[parts.frame?.stage];return detail?new THREE.Box3(V(detail.min),V(detail.max)):new THREE.Box3(V([-23,-.25,-23]),V([25,6,16]));}return new THREE.Box3(V([-23,-.25,-23]),V([4,6,16])).union(campus.bounds);}
 setView('route');return {scene,resources,parts,lunarFog,missionPose,groups:{route,base,mission:mission.group},instances,update,updateFrame,subjectBounds,capacityScope,setView,get representation(){return representation;},dispose(){mission.dispose();resources.forEach(r=>r.dispose());}};
}
const boxCorners=box=>[0,1].flatMap(x=>[0,1].flatMap(y=>[0,1].map(z=>[x?box.max.x:box.min.x,y?box.max.y:box.min.y,z?box.max.z:box.min.z])));
const viewDefaults=view=>view==='mission'?{yaw:0,pitch:0,zoom:1}:view==='route'?{yaw:0,pitch:.25,zoom:1}:{yaw:.6,pitch:.72,zoom:1};
export function lunarCameraAt(bounds,{aspect=1,view='route',pose=null,yaw=0,pitch=.25,zoom=1}={}){
 const target=bounds.getCenter(new THREE.Vector3()),fov=aspect<.9?58:46;
 let outward;if(view==='mission'&&pose){outward=V(pose.camera).sub(V(pose.target)).normalize();outward.applyAxisAngle(V([0,1,0]),yaw);const azimuth=Math.atan2(outward.x,outward.z),elevation=THREE.MathUtils.clamp(Math.asin(outward.y)+pitch,.08,1.35);outward.set(Math.sin(azimuth)*Math.cos(elevation),Math.sin(elevation),Math.cos(azimuth)*Math.cos(elevation));}
 else outward=V([Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)]);
 const right=new THREE.Vector3().crossVectors(V([0,1,0]),outward).normalize(),up=new THREE.Vector3().crossVectors(outward,right).normalize(),vtan=Math.tan(fov*Math.PI/360),htan=vtan*Math.max(.25,aspect);let distance=12;
 for(const corner of boxCorners(bounds)){const delta=V(corner).sub(target);distance=Math.max(distance,delta.dot(outward)+Math.max(Math.abs(delta.dot(right))/(htan*.79),Math.abs(delta.dot(up))/(vtan*.72))+.5);}
 distance*=THREE.MathUtils.clamp(zoom,.55,2.5);return {position:target.clone().addScaledVector(outward,distance).toArray(),target:target.toArray(),fov,near:.1,far:Math.max(600,distance*3),distance};
}
export function createWorld(host,es,{onViewChange=()=>{},textures=true,environment=true,rendererFactory=()=>new THREE.WebGLRenderer({antialias:true}),ResizeObserverClass=globalThis.ResizeObserver}={}){
 const w=buildLunarScene(es,{textures}),renderer=rendererFactory();renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,1.7));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label',es?'Maqueta lunar. Arrastra para orbitar; usa la rueda o pellizca para acercarte.':'Lunar model. Drag to orbit; scroll or pinch to zoom.');host.append(renderer.domElement);
 let envMap;if(environment){const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();envMap=pmrem.fromScene(room,.04).texture;room.traverse(o=>{o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose();});pmrem.dispose();w.scene.environment=envMap;w.scene.environmentIntensity=.22;}
 const camera=new THREE.PerspectiveCamera(46,1,.1,600),views=Object.fromEntries(['mission','route','base','growth'].map(v=>[v,viewDefaults(v)])),pointers=new Map();let view='route',frame=null,disposed=false,pinch=0;
 function getViewState(){return {version:1,view,views:Object.fromEntries(Object.entries(views).map(([key,value])=>[key,{...value}])),...views[view],position:camera.position.toArray(),target:frame?w.subjectBounds().getCenter(new THREE.Vector3()).toArray():[0,0,0]};}
 const changed=()=>onViewChange(getViewState());
 function setView(v,{reset=false}={}){if(!views[v])throw new RangeError('Unknown lunar view');view=v;w.setView(v);if(reset)views[v]=viewDefaults(v);pointers.clear();pinch=0;}
 function resetView(){views[view]=viewDefaults(view);changed();}
 function restoreViewState(state){if(!state||!views[state.view])return false;
  for(const key of Object.keys(views)){const value=state.views?.[key]||(key===state.view?state:null);if(!value)continue;const fallback=viewDefaults(key);views[key]={yaw:Number.isFinite(value.yaw)?value.yaw:fallback.yaw,pitch:THREE.MathUtils.clamp(Number.isFinite(value.pitch)?value.pitch:fallback.pitch,key==='mission'?-.8:.08,key==='mission'?.8:1.35),zoom:THREE.MathUtils.clamp(Number.isFinite(value.zoom)?value.zoom:fallback.zoom,.55,2.5)};}
  setView(state.view);return true;
 }
 function resize(){if(disposed)return;renderer.setSize(Math.max(1,host.clientWidth),Math.max(1,host.clientHeight),false);camera.aspect=Math.max(1,host.clientWidth)/Math.max(1,host.clientHeight);camera.updateProjectionMatrix();}const observer=new ResizeObserverClass(resize);observer.observe(host);resize();
 const down=e=>{if(e.button!==undefined&&e.button!==0)return;renderer.domElement.focus({preventScroll:true});pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});renderer.domElement.setPointerCapture(e.pointerId);if(pointers.size===2){const [a,b]=[...pointers.values()];pinch=Math.hypot(a.x-b.x,a.y-b.y);}};
 const move=e=>{const previous=pointers.get(e.pointerId);if(!previous)return;const pref=views[view];pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1){pref.yaw-=(e.clientX-previous.x)*.005;pref.pitch=THREE.MathUtils.clamp(pref.pitch+(e.clientY-previous.y)*.005,view==='mission'?-.8:.08,view==='mission'?.8:1.35);}else{const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);if(pinch>0&&distance>0)pref.zoom=THREE.MathUtils.clamp(pref.zoom*pinch/distance,.55,2.5);pinch=distance;}changed();};
 const up=e=>{pointers.delete(e.pointerId);pinch=0;if(renderer.domElement.hasPointerCapture?.(e.pointerId))renderer.domElement.releasePointerCapture(e.pointerId);};
 const wheel=e=>{e.preventDefault();views[view].zoom=THREE.MathUtils.clamp(views[view].zoom*Math.exp(e.deltaY*.001),.55,2.5);changed();};
 const key=e=>{const pref=views[view];if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Equal','Minus','Home'].includes(e.code)){e.preventDefault();if(e.code==='Home'){resetView();return;}if(e.code==='ArrowLeft')pref.yaw+=.08;if(e.code==='ArrowRight')pref.yaw-=.08;if(e.code==='ArrowUp')pref.pitch=Math.max(view==='mission'?-.8:.08,pref.pitch-.06);if(e.code==='ArrowDown')pref.pitch=Math.min(view==='mission'?.8:1.35,pref.pitch+.06);if(e.code==='Equal')pref.zoom=Math.max(.55,pref.zoom*.9);if(e.code==='Minus')pref.zoom=Math.min(2.5,pref.zoom/ .9);changed();}};
 const events={pointerdown:down,pointermove:move,pointerup:up,pointercancel:up,lostpointercapture:up,wheel,keydown:key};for(const [name,callback] of Object.entries(events))renderer.domElement.addEventListener(name,callback,name==='wheel'?{passive:false}:undefined);
 function draw(){if(!frame)return;w.scene.updateMatrixWorld(true);const pose=lunarCameraAt(w.subjectBounds(),{aspect:camera.aspect,view,pose:frame.mission,...views[view]});camera.position.copy(V(pose.position));camera.fov=pose.fov;camera.far=pose.far;camera.updateProjectionMatrix();camera.lookAt(V(pose.target));w.lunarFog.near=pose.distance*1.3;w.lunarFog.far=pose.distance*3;renderer.render(w.scene,camera);}
 function updateFrame(next,options={}){if(disposed)return;if(next.view&&next.view!==view)setView(next.view);frame=next;w.updateFrame({...next,view});draw();}
 function render(row,time,stage){if(row?.row){updateFrame(row,time||{});return;}w.update(row,time,stage);frame=w.parts.frame;draw();}
 function inspect(){const p=w.parts.mission;return {view,navigation:{mode:view==='mission'?'follow-orbit':'orbit',walking:false,zoomRange:[.55,2.5]},camera:{position:camera.position.toArray(),aspect:camera.aspect,fov:camera.fov},capacity:{...w.parts.campus,...w.capacityScope(),bounds:{min:w.parts.campus.bounds.min.toArray(),max:w.parts.campus.bounds.max.toArray()}},operation:{active:w.parts.operation.active,month:w.parts.operation.month,kind:w.parts.operation.kind,build:w.parts.operation.build,imported:w.parts.operation.imported,local:w.parts.operation.local},deliveries:{batches:w.parts.deliveries.batches,inFlightCount:w.parts.deliveries.inFlightCount,visibleMarkers:w.parts.deliveries.ships.filter(s=>s.visible).length},mission:{pose:p.pose,payload:{id:p.payload.id,location:p.payload.location,worldBottom:p.payload.worldBottom,position:p.payload.mesh.getWorldPosition(new THREE.Vector3()).toArray()},refuel:{state:p.refuel.state,quantity:p.refuel.quantity,visibleMarkers:p.refuel.markers.filter(m=>m.visible).length},vehicles:Object.fromEntries(Object.entries(p.vehicles).map(([key,s])=>[key,{id:s.group?.userData.vehicleId,variant:s.variant,position:(s.group||s).getWorldPosition(new THREE.Vector3()).toArray(),burn:!!s.burn?.visible}]))},frame};}
 setView('route');return {setView,resetView,getViewState,restoreViewState,inspect,updateFrame,render,canvas:renderer.domElement,get representation(){return w.representation;},dispose(){disposed=true;observer.disconnect();for(const [name,callback] of Object.entries(events))renderer.domElement.removeEventListener(name,callback);pointers.clear();w.dispose();envMap?.dispose();renderer.dispose();renderer.domElement.remove();}};
}
