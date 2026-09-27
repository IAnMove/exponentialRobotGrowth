import * as THREE from '../../vendor/three.module.js';
import {buildMission} from './mission-world.js';
import {deliveriesAt,missionPose} from './mission.js';
import {visualKit} from './visuals.js';
import {RoomEnvironment} from '../../vendor/RoomEnvironment.js';
const V=p=>new THREE.Vector3(...p),GOLD=0xffbc6b,MINT=0x87e3c3;
export function buildLunarScene(es,{textures=true}={}){
 const scene=new THREE.Scene(),resources=[],own=x=>(resources.push(x),x),mats=new Map(),targets=[];
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
 const em=own(new THREE.MeshStandardMaterial({color:0x6896b9,roughness:.9,fog:false,envMapIntensity:0}));
 if(textures)new THREE.TextureLoader().load('../kardashev/earth-blue-marble.jpg',tx=>{own(tx);tx.colorSpace=THREE.SRGBColorSpace;em.map=tx;em.emissiveMap=tx;em.emissive.set(0xffffff);em.emissiveIntensity=.1;em.color.set(0xffffff);em.needsUpdate=true;});
 const earth=new THREE.Mesh(sphere,em);earth.position.set(-13,2,-2);earth.scale.setScalar(4.6);earth.rotation.y=-.9;route.add(earth);kit.atmosphere(route,earth,4.6);
 const moon=new THREE.Mesh(kit.craterSphere(),kit.moonMaterial());moon.position.set(13,0,0);moon.scale.setScalar(5.3);moon.rotation.set(.3,-.8,0);moon.castShadow=moon.receiveShadow=true;route.add(moon);
 label(route,es?'TIERRA · equipos y componentes':'EARTH · equipment and components',[-13,8,0],10);label(route,es?'LUNA · fabricar y reinvertir':'MOON · manufacture and reinvest',[13,7.4,0],9);
 const trajectory=pipe(route,[[-10,3,2],[-7,7,6],[1,9,6],[8,7,5],[12,3,5]],0x7794ad,.025);
 function freighter(g,p,scale){const ship=kit.ship(g,{scale});ship.group.position.set(...p);ship.burn.visible=false;return ship.group;}
 const ships=Array.from({length:12},()=>freighter(route,[0,0,0],.13));
 // A lunar worksite, not an engineering blueprint or a to-scale map.
 kit.terrain(base,150,140,24);
 const earthrise=new THREE.Mesh(sphere,em);earthrise.position.set(-33,20,-60);earthrise.scale.setScalar(8);base.add(earthrise);kit.atmosphere(base,earthrise,8);
 // Fixed seed infrastructure: landing pad, mine, processor and imported component store.
 cyl(base,[-17,0,11],4,.08,0x7a7c82);const padRing=new THREE.Mesh(own(new THREE.TorusGeometry(3.5,.035,5,64)),mat(GOLD,.7));padRing.rotation.x=Math.PI/2;padRing.position.set(-17,.07,11);base.add(padRing);freighter(base,[-17,.1,11],.45);
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
 for(let i=0;i<8;i++){panel(base,[-21+i*2.8,1,-20],.8);cyl(base,[-21+i*2.8,.5,-20],.07,1,0xb0b9c5);}
 label(base,es?'ENERGÍA + ALMACENAMIENTO':'POWER + STORAGE',[-10,3,-20],8);
 for(const x of [-5,-2,1])box(base,[x,1,-20],[1,2,1.4],0x91a4b7);
 // Each repeated complex aggregates productive equipment, including power hardware.
 const bodyInstances=new THREE.InstancedMesh(cube,mat(0xbfc5c9),256),roofInstances=new THREE.InstancedMesh(cube,mat(0xc4a779),256),solarInstances=new THREE.InstancedMesh(cube,mat(0x174475),256),doorInstances=new THREE.InstancedMesh(cube,mat(MINT,.3),256);
 const mini=new THREE.Group();mini.position.set(12.5,0,5.2);mini.scale.setScalar(.065);route.add(mini);
 const instances=[bodyInstances,roofInstances,solarInstances,doorInstances];instances.forEach(i=>{i.castShadow=true;i.receiveShadow=true;base.add(i);});
 const miniInstances=instances.map(i=>{const a=new THREE.InstancedMesh(i.geometry,i.material,256);mini.add(a);return a;});
 // Repeated detail stays instanced as the industrial district expands.
 const detailParts=[[[0,1.86,0],[1.7,.09,2.1],0x183b57],[[.88,1.88,0],[.12,.12,2.1],0xa7b9c2],[[-.88,1.88,0],[.12,.12,2.1],0xa7b9c2],[[0,.95,1.35],[1.8,.17,.05],0x254453],[[1.28,.55,0],[.1,.8,1.8],0x849bab],[[0,.07,0],[2.9,.12,3],0x525d67]];
 for(const part of detailParts){const a=new THREE.InstancedMesh(cube,mat(part[2]),256);a.castShadow=true;a.receiveShadow=true;instances.push(a);base.add(a);const b=new THREE.InstancedMesh(cube,a.material,256);miniInstances.push(b);mini.add(b);}
 const transform=new THREE.Object3D();let representation=100,lastCapital=-1;
 function updateCapacity(capital){
  if(capital===lastCapital)return;lastCapital=capital;
  representation=Math.max(100,capital/256);const count=Math.min(256,Math.ceil(capital/representation)),cols=Math.ceil(Math.sqrt(count));
  instances.forEach(i=>i.count=count);miniInstances.forEach(i=>i.count=count);
  for(let i=0;i<count;i++){
   const x=4+(i%cols)*3.2,z=-10+Math.floor(i/cols)*3.8,f=Math.min(1,(capital-i*representation)/representation),s=.5+.5*f;
   const parts=[[[x,.85*s,z],[2.55*s,1.7*s,2.6*s]],[[x,1.76*s,z],[2.65*s,.12,2.7*s]],[[x+1.5,.85,z+1.6],[1.1,.08,2]],[[x,.6*s,z+1.32*s],[.8*s,1.1*s,.035]]];
   detailParts.forEach(([p,size])=>parts.push([[x+p[0]*s,p[1]*s,z+p[2]*s],size.map(v=>v*s)]));
   parts.forEach(([p,size],j)=>{transform.position.set(...p);transform.scale.set(...size);transform.rotation.set(0,0,0);transform.updateMatrix();instances[j].setMatrixAt(i,transform.matrix);miniInstances[j].setMatrixAt(i,transform.matrix);});
  }
  [...instances,...miniInstances].forEach(i=>{i.instanceMatrix.needsUpdate=true;i.computeBoundingSphere();});
 }
 label(base,es?'04 · FABRICAR → AMPLIAR':'04 · MANUFACTURE → EXPAND',[12,4,-7],8);
 const cargoPath=pipe(base,[[-17,1,11],[-12,1,11],[-7,1,10],[0,.6,6],[5,1,0]],GOLD,.035),materialPath=pipe(base,[[-18,.8,-11],[-7,1,-12],[0,1,-10],[5,1,0]],MINT,.045);
 const cargo=Array.from({length:8},()=>box(base,[0,0,0],[.25,.25,.4],GOLD,.4)),ore=Array.from({length:12},()=>box(base,[0,0,0],[.27,.27,.27],MINT,.4));
 const focusRing=new THREE.Mesh(own(new THREE.TorusGeometry(3.6,.065,6,70)),mat(GOLD,.5));focusRing.rotation.x=Math.PI/2;focusRing.position.y=.1;base.add(focusRing);
 let view='route',row=null;
 function setView(v){view=v;route.visible=v==='route';base.visible=v==='base'||v==='growth';mission.group.visible=v==='mission';}
 function update(state,time,stage){const onEarth=view==='mission'&&['liftoff','booster'].includes(stage);scene.background.set(onEarth?0x3a5265:0x070d18);scene.fog=onEarth?launchFog:view==='base'||view==='growth'||view==='mission'&&['descent','unload','return'].includes(stage)?lunarFog:null;starfield.visible=!onEarth;row=state;updateCapacity(state.capital);const active=deliveriesAt(state.deliveryEvents||[],state.exactMonth??state.month);ships.forEach((s,i)=>{s.visible=i<active.length;if(active[i]){s.position.copy(trajectory.getPointAt(active[i].progress));s.quaternion.setFromUnitVectors(V([0,1,0]),trajectory.getTangentAt(active[i].progress));}});if(view==='mission')mission.update(stage,state.narrativeProgress||0);cargo.forEach((m,i)=>{m.visible=state.stock>0||state.build>0;m.position.copy(cargoPath.getPointAt((time*.07+i/8)%1));});ore.forEach((m,i)=>{m.visible=state.build>0;m.position.copy(materialPath.getPointAt((time*.1+i/12)%1));});rover.position.x=Math.sin(time*.5)*.35;rover.rotation.y=Math.sin(time*.18)*.1;const locations={power:[-10,-20],mine:[-18,-11],factory:[6,0],seed:[-17,11],launch:[-17,11],replicate:[12,0],limits:[12,0]};const p=locations[stage]||[12,0];focusRing.position.set(p[0],.14,p[1]);}
 setView('route');return {scene,resources,lunarFog,missionPose,groups:{route,base,mission:mission.group},instances,update,setView,get representation(){return representation;},dispose(){mission.dispose();resources.forEach(r=>r.dispose());}};
}
export function createWorld(host,es){
 const w=buildLunarScene(es),renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;host.append(renderer.domElement);
 const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),envMap=pmrem.fromScene(room,.04).texture;room.traverse(o=>o.geometry?.dispose());pmrem.dispose();w.scene.environment=envMap;w.scene.environmentIntensity=.22;
 const camera=new THREE.PerspectiveCamera(46,1,.1,220);let view='route',yaw=.6,pitch=.65,distance=45,drag=null;
 function resize(){renderer.setSize(host.clientWidth,host.clientHeight,false);camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();}const observer=new ResizeObserver(resize);observer.observe(host);resize();
 const down=e=>{drag={x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);},move=e=>{if(!drag)return;yaw-=(e.clientX-drag.x)*.006;pitch=THREE.MathUtils.clamp(pitch+(e.clientY-drag.y)*.006,.18,1.3);drag={x:e.clientX,y:e.clientY};},up=()=>drag=null,wheel=e=>{e.preventDefault();distance=THREE.MathUtils.clamp(distance+e.deltaY*.025,18,100);};
 renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',up);renderer.domElement.addEventListener('wheel',wheel,{passive:false});
 function setView(v){view=v;w.setView(v);yaw=v==='route'?0:.6;pitch=v==='route'?.24:.68;distance=v==='growth'?65:v==='base'?47:43;}
 // Haze starts just beyond the subject, whatever the zoom, and hides the ground's far rim.
 function draw(target){const d=camera.position.distanceTo(target);w.lunarFog.near=d*1.1;w.lunarFog.far=d*2.4;renderer.render(w.scene,camera);}
 function render(row,time,stage){w.update(row,time,stage);if(view==='mission'){const pose=w.missionPose(stage,row.narrativeProgress||0);const target=V(pose.target),offset=V(pose.camera).sub(target);offset.applyAxisAngle(V([0,1,0]),yaw-.6);offset.y+=(pitch-.68)*distance;offset.multiplyScalar(distance/43*(camera.aspect<1?1.35:1));camera.position.copy(target).add(offset);camera.lookAt(target);draw(target);return;}const target=new THREE.Vector3(view==='route'?0:0,view==='route'?2:0,view==='route'?0:-2);const fit=camera.aspect<1?1.5:1;camera.position.set(Math.sin(yaw)*Math.cos(pitch)*distance*fit,Math.sin(pitch)*distance*fit,Math.cos(yaw)*Math.cos(pitch)*distance*fit).add(target);camera.lookAt(target);draw(target);}
 setView('route');return {setView,render,canvas:renderer.domElement,get representation(){return w.representation;},dispose(){observer.disconnect();w.dispose();envMap.dispose();renderer.dispose();}};
}
