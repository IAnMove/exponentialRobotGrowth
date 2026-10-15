import * as THREE from '../vendor/three.module.js';
import {sampleCarbon,FLUXES,RESERVOIRS} from './carbon-model.js';

const NAMES={air:['AIRE','AIR'],land:['TIERRA Y SERES VIVOS','LAND AND LIVING THINGS'],ocean:['OCÉANO','OCEAN'],fossil:['RESERVA FÓSIL','FOSSIL STOCK']};
export function createCarbonScene(lesson,es){
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x112332);scene.fog=new THREE.Fog(0x112332,46,95);
 scene.add(new THREE.HemisphereLight(0xd4efff,0x344333,1.8));
 const sun=new THREE.DirectionalLight(0xffe3bf,3.4);sun.position.set(-6,16,9);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-15,right:15,top:14,bottom:-14,near:.1,far:45});sun.shadow.normalBias=.05;scene.add(sun);
 const resources=[sun.shadow],targets=[],stands=[],routes=[],reservoirs={},own=x=>(resources.push(x),x),mat=(c,extra={})=>own(new THREE.MeshStandardMaterial({color:c,roughness:.72,metalness:.05,...extra}));
 const t=(a,b)=>es?a:b,fmt=n=>new Intl.NumberFormat(es?'es':'en',{maximumFractionDigits:2,minimumFractionDigits:2}).format(n);
 const sphereGeo=own(new THREE.SphereGeometry(1,14,10)),carbonMaterial=mat(0xabc8d3,{emissive:0x497785,emissiveIntensity:.4}),oxygenMaterial=mat(0xe87970);
 function mesh(g,geo,material,p=[0,0,0]){const m=new THREE.Mesh(geo,material);m.position.set(...p);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
 function box(g,p,size,color,extra){return mesh(g,own(new THREE.BoxGeometry(...size)),mat(color,extra),p);}
 function ball(g,p,r,material=carbonMaterial){const m=mesh(g,sphereGeo,material,p);m.scale.setScalar(r);return m;}
 function tube(g,curve,r,material){return mesh(g,own(new THREE.TubeGeometry(curve,36,r,5,false)),material);}
 function cylinder(g,p,r,h,color){return mesh(g,own(new THREE.CylinderGeometry(r,r,h,12)),mat(color),p);}
 function label(g,words,p,width=3,{height=128,bg=true}={}){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=height;const ctx=canvas.getContext('2d');
  const texture=own(new THREE.CanvasTexture(canvas));texture.colorSpace=THREE.SRGBColorSpace;
  const m=new THREE.Sprite(own(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false})));m.scale.set(width,width*height/768,1);m.position.set(...p);g.add(m);let previous;
  const set=text=>{if(text===previous)return;previous=text;ctx.clearRect(0,0,768,height);if(bg){ctx.fillStyle='#102633e8';ctx.fillRect(0,0,768,height);}ctx.fillStyle='#e3f5f2';ctx.font='600 70px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';const lines=text.split('\n');lines.forEach((line,i)=>ctx.fillText(line,384,height*(i+.5)/lines.length,736));texture.needsUpdate=true;};set(words);return {m,set};
 }
 const island=new THREE.Group();scene.add(island);
 // A cutaway connects living land to a geological store; neither is a separate scene.
 box(island,[-4.75,-1.10,0],[10,2.3,10],0x58483d);
 const strata=[[-1.9,0x766351],[-1.5,0x94816a],[-1.13,0x373a37],[-.75,0x7c6650],[-.38,0x9b7859]];
 for(const [y,c] of strata)box(island,[-4.75,y,0],[10,.25,10.03],c);
 box(island,[-4.75,.18,0],[10,.45,10],0x537456);box(island,[-4.75,.39,0],[10,.04,10],0x709565);
 const rockMat=mat(0x708178),leafMats=[mat(0x6da575),mat(0x477f5b),mat(0x89ae76)],leafGeo=own(new THREE.ConeGeometry(.7,1.8,9)),trunkGeo=own(new THREE.CylinderGeometry(.10,.16,1.35,9)),trunkMat=mat(0x8c6543);
 for(let i=0;i<20;i++){
  const x=-8.9+(i%5)*1.8,z=-3.8+Math.floor(i/5)*2.05,scale=.7+(i*13%7)*.065;
  mesh(island,trunkGeo,trunkMat,[x,1.03,z]);
  if(i%3===0){for(let j=0;j<3;j++){const crown=ball(island,[x+(j-1)*.37,1.7+(j===1?.6:.18),z+(j%2)*.23],.57*scale,leafMats[i%3]);crown.scale.y*=1.1;}}else for(let j=0;j<2;j++){const crown=mesh(island,leafGeo,leafMats[i%3],[x,1.65+j*.65,z]);crown.scale.set(scale*(1-j*.18),scale,scale*(1-j*.18));}
 }
 for(let i=0;i<11;i++){const rock=ball(island,[-8.8+i*.8,.45,4.1],.25,rockMat);rock.scale.set(.3,.16,.22);}
 // Ocean is a transparent water volume over a visible seabed. Its physical size is illustrative.
 box(scene,[5,-1.55,0],[9.4,.7,10],0xb49e77);
 const water=box(scene,[5,-.37,0],[9.4,2,10],0x387997,{transparent:true,opacity:.24,depthWrite:false,metalness:.25,roughness:.3});
 box(scene,[5,.635,0],[9.4,.045,10],0x4998b0,{transparent:true,opacity:.45,depthWrite:false,roughness:.22});
 water.castShadow=false;const waves=[];for(let z=-4.5;z<=4.5;z+=.65){const points=[];for(let x=.35;x<9.65;x+=.32)points.push(new THREE.Vector3(x,.68+Math.sin(x*1.8+z)*.04,z));waves.push(tube(scene,new THREE.CatmullRomCurve3(points),.018,mat(0x9cdfe3,{transparent:true,opacity:.5})));}
 const dissolved=[];for(let i=0;i<36;i++)dissolved.push(ball(scene,[.7+(i%9)*1.02,-1.1+Math.floor(i/9)*.4,4.5],.06,carbonMaterial));
 label(scene,t('C · formas disueltas','C · dissolved forms'),[6,-.75,5.1],3.2,{height:72});
 // A chimney visibly receives carbon from the geological seam, then releases it to the air.
 const factory=new THREE.Group();factory.position.set(-.95,.4,2.1);scene.add(factory);
 box(factory,[0,.4,0],[1.7,.8,1.6],0x93a4a3);box(factory,[0,.88,0],[1.8,.12,1.7],0x657c86);
 const chimney=cylinder(factory,[.35,1.18,-.3],.17,1.8,0xc1b7a8);cylinder(factory,[.35,2.09,-.3],.22,.12,0x55717e);
 for(let i=0;i<3;i++)box(factory,[-.48+i*.45,.45,.81],[.2,.25,.025],0xa9d9da,{emissive:0x72b9ba,emissiveIntensity:.3});
 const coal=[];for(let i=0;i<24;i++){const m=box(island,[-8.8+i%8*1.05,-1.13,4.94],[.68,.20,.15],0x263138);coal.push(m);}
 const positions={air:[.4,5.7,-1],land:[-5,3.25,-1.3],ocean:[5.4,2.2,-2.8],fossil:[-5,-2.75,4.9]};
 const colors={air:0x9cd8e6,land:0x94e2b5,ocean:0x89caeb,fossil:0xf4b5a0};
 for(const id of RESERVOIRS){const p=positions[id],badge=label(scene,'',p,id==='land'?4.3:3.4),rail=new THREE.Group();rail.position.set(p[0],p[1]-.48,p[2]);scene.add(rail);box(rail,[0,0,0],[3,.07,.07],0x3c5869);const fill=box(rail,[-1.5,0,.045],[3,.075,.08],colors[id],{emissive:colors[id],emissiveIntensity:.2});reservoirs[id]={badge,fill,rail};}
 // C particles denote carbon transfer, not whole CO2 molecules travelling unchanged.
 const routePoints={
 photosynthesis:[[-5.9,4.8,-.6],[-9,4,-1],[-7.7,2.4,0],[-5.8,.5,1]],
 respiration:[[-3.6,.8,-1.4],[-2.8,2.7,-2],[-2,4.9,-1.6]],
 intoOcean:[[3,4.7,.2],[6.5,3.5,1],[7.3,.2,2],[6,-.6,3]],
 outOfOcean:[[3,-.6,-.6],[2.2,1.5,-2],[1.5,4.7,-1.8]],
 emitted:[[-4.2,-1.13,4.6],[-1.1,-.8,3],[-.6,2.55,1.8],[-.5,4.5,1.1]]
 };
 const arrowGeo=own(new THREE.ConeGeometry(.115,.35,10)),particleGeo=own(new THREE.SphereGeometry(.075,10,8));
 for(const flow of FLUXES){const curve=new THREE.CatmullRomCurve3(routePoints[flow.id].map(p=>new THREE.Vector3(...p))),material=mat(flow.color,{emissive:flow.color,emissiveIntensity:.16,transparent:true,opacity:.9}),path=tube(scene,curve,.035,material);
  path.userData.info=[flow.name[0]+': carbono de '+NAMES[flow.from][0].toLowerCase()+' a '+NAMES[flow.to][0].toLowerCase()+'.',flow.name[1]+': carbon from '+NAMES[flow.from][1].toLowerCase()+' to '+NAMES[flow.to][1].toLowerCase()+'.'];targets.push(path);
  const arrows=[];for(const u of [.28,.68]){const a=mesh(scene,arrowGeo,material,curve.getPoint(u).toArray());a.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),curve.getTangent(u));arrows.push(a);}
  const packets=[];for(let i=0;i<20;i++){const packet=mesh(scene,particleGeo,mat(flow.color,{emissive:flow.color,emissiveIntensity:.6}));packet.visible=false;packets.push(packet);}
  routes.push({...flow,curve,path,arrows,packets});
 }
 // CO2 close-up: absorption, molecular vibration and one re-emitted IR ray.
 // There is no atmosphere wall, specular reflection or conversion of energy into matter.
 const molecule=new THREE.Group();molecule.position.set(-7,5.3,0);scene.add(molecule);
 const atom=ball(molecule,[0,0,0],.40,carbonMaterial),oxygens=[-1.1,1.1].map(x=>ball(molecule,[x,0,0],.3,oxygenMaterial));
 for(const side of [-1,1])for(const y of [-.085,.085]){const curve=new THREE.LineCurve3(new THREE.Vector3(side*.2,y,0),new THREE.Vector3(side*.88,y,0));tube(molecule,curve,.033,mat(0xc4e2e6));}
 label(molecule,'O = C = O',[0,.8,0],2.8,{height:72});
 label(molecule,t('CO₂ · molécula ampliada','CO₂ · enlarged molecule'),[0,1.25,0],3.8,{height:72});
 const radiation=new THREE.Group();molecule.add(radiation);
 function wave(a,b){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),dir=end.clone().sub(start),perp=new THREE.Vector3(0,0,1),points=[];for(let i=0;i<=60;i++){const u=i/60;points.push(start.clone().addScaledVector(dir,u).addScaledVector(perp,Math.sin(u*10*Math.PI)*.08));}const curve=new THREE.CatmullRomCurve3(points);return {curve,path:tube(radiation,curve,.028,mat(0xffd074,{emissive:0xffc456,emissiveIntensity:.8})),pulse:ball(radiation,[...a],.095,mat(0xffe6a9,{emissive:0xffd16a,emissiveIntensity:1}))};}
 const incoming=wave([-3,-.8,0],[-.45,0,0]),outgoing=[wave([.4,0,0],[2,1,.8]),wave([.4,0,0],[2,-1.2,1.1]),wave([.2,0,.35],[.5,.8,2.3])];
 const heatLabel=label(molecule,t('IR · absorción → vibración → reemisión','IR · absorption → vibration → re-emission'),[0,-1.5,0],5.7,{height:72});
 const standsGroup=new THREE.Group();scene.add(standsGroup);
 for(let i=0;i<4;i++){const x=[-9,-4,4,9][i],z=8;box(standsGroup,[x,.53,z],[1.6,1.05,.75],0x294553);box(standsGroup,[x,1.1,z],[1.8,.08,.95],0x668394);const b=box(standsGroup,[x,1.22,z+.1],[.8,.2,.5],0xa6e9cd,{emissive:0x7fccb2,emissiveIntensity:.5});b.userData.action=i;targets.push(b);stands.push(b);label(standsGroup,`${i+1} · ${(es?['CO₂ / IR','BOSQUE','OCÉANO','FÓSIL']:['CO₂ / IR','FOREST','OCEAN','FOSSIL'])[i]}`,[x,2.2,z],2.4,{height:72});label(standsGroup,t('▶ ESCUCHAR','▶ LISTEN'),[x,1.55,z+.2],1.2,{height:72});}
 let lastState;
 function update(model,time=0,phase=0){
  const s=sampleCarbon(model.trace,time);lastState=s;
  for(const id of RESERVOIRS){const r=reservoirs[id];r.badge.set(`${id==='land'?t('TIERRA','LAND'):NAMES[id][es?0:1]}\n${fmt(s[id])} ${t('u. C','C units')}`);r.fill.scale.x=s[id]/100;r.fill.position.x=-1.5+1.5*s[id]/100;r.badge.m.userData.info=[`${NAMES[id][0]}: ${s[id].toFixed(2)} unidades de carbono almacenado.`,`${NAMES[id][1]}: ${s[id].toFixed(2)} units of stored carbon.`];}
  coal.forEach((m,i)=>{m.scale.x=Math.max(.01,s.fossil/30);m.material.opacity=.4+.6*s.fossil/30;});
  routes.forEach(r=>{const flow=s.flows[r.id],highlight=phase===0?false:phase===1?['photosynthesis','respiration'].includes(r.id):phase===2?['intoOcean','outOfOcean'].includes(r.id):r.id==='emitted';r.path.material.opacity=flow>0?(highlight?1:.58):.16;r.path.material.emissiveIntensity=highlight?.65:.12;r.arrows.forEach(a=>a.visible=flow>0);const count=flow>0?Math.min(20,Math.max(2,Math.ceil(flow*14))):0;r.packets.forEach((m,i)=>{m.visible=i<count;if(m.visible)m.position.copy(r.curve.getPoint((i/count+s.continuous*Math.max(.3,Math.min(1.2,flow)))%1));});});
  chimney.material.emissive.setHex(s.flows.emitted>0?0x59291f:0x000000);
  radiation.visible=phase===0;heatLabel.m.visible=phase===0;const u=s.continuous%1,incomingActive=u<.43;
  incoming.path.visible=incoming.pulse.visible=incomingActive;if(incomingActive)incoming.pulse.position.copy(incoming.curve.getPoint(u/.43));
  const vibrating=u>=.43&&u<.66,vibration=vibrating?Math.sin(u*100)*.12:0;oxygens.forEach((o,i)=>{o.position.y=(i===0?1:-1)*vibration;});atom.position.y=-vibration*.3;
  outgoing.forEach((r,i)=>{r.path.visible=r.pulse.visible=u>=.66&&i===Math.floor(s.continuous)%3;if(r.pulse.visible)r.pulse.position.copy(r.curve.getPoint((u-.66)/.34));});
  stands.forEach((b,i)=>b.material.emissiveIntensity=i===phase?1:.2);
 }
 for(const id of RESERVOIRS)targets.push(reservoirs[id].badge.m);
 atom.userData.info=["CO₂: un átomo de carbono y dos de oxígeno. La radiación infrarroja puede excitar vibraciones moleculares; el esquema es cualitativo.","CO₂: one carbon atom and two oxygen atoms. Infrared radiation can excite molecular vibrations; this is a qualitative diagram."];targets.push(atom,...oxygens);oxygens.forEach(o=>o.userData.info=atom.userData.info);
 return {scene,resources,targets,routes,reservoirs,stands,standsGroup,coal,water,dissolved,molecule,radiation,outlines:[],update,get state(){return lastState;}};
}
export function createCarbonWorld(host,lesson,es,onInspect){
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;host.append(renderer.domElement);renderer.domElement.tabIndex=0;
 const built=createCarbonScene(lesson,es),camera=new THREE.PerspectiveCamera(46,1,.1,110),ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let model,phase=0;
 function resize(){renderer.setSize(host.clientWidth,host.clientHeight,false);camera.aspect=host.clientWidth/Math.max(1,host.clientHeight);camera.fov=camera.aspect<1?65:46;camera.updateProjectionMatrix();}const observer=new ResizeObserver(resize);observer.observe(host);resize();
 const visible=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};
 function nearest(player){let best=null,distance=5.8;built.stands.forEach((b,i)=>{const d=Math.hypot(player.x-b.position.x,player.z-b.position.z);if(d<distance){best=i;distance=d;}});return best;}
 function hit(x,y){const r=renderer.domElement.getBoundingClientRect();pointer.set((x-r.left)/r.width*2-1,1-(y-r.top)/r.height*2);ray.setFromCamera(pointer,camera);return ray.intersectObjects(built.targets.filter(visible))[0];}
 return {canvas:renderer.domElement,update(s,i){model=s;phase=i;},render(player,dt,animation,orbit,mode,time){
  if(model)built.update(model,time,phase);built.standsGroup.visible=mode==='immersive';
  if(mode==='immersive'){camera.position.set(player.x,1.65,player.z);camera.rotation.set(player.pitch,player.yaw,0,'YXZ');}
  else{const focus=orbit.whole||phase===3?[0,1.7,0]:[[-7,4.9,0],[-4.2,2.2,0],[5,.8,0]][phase],center=new THREE.Vector3(...focus),base=lesson.overview.distance*(orbit.whole||phase===3?2:phase===0?1.1:1.6),tan=Math.tan(camera.fov*Math.PI/360),width=orbit.whole||phase===3?24:phase===0?8:14,height=orbit.whole||phase===3?11:phase===0?6:10,d=Math.max(base,width/(2*tan*camera.aspect),height/(2*tan))*orbit.distance/lesson.overview.distance;camera.position.set(center.x+Math.sin(orbit.yaw)*Math.cos(orbit.pitch)*d,center.y+Math.sin(orbit.pitch)*d,center.z+Math.cos(orbit.yaw)*Math.cos(orbit.pitch)*d);camera.lookAt(center);}
  renderer.render(built.scene,camera);
 },inspect(x,y){const h=hit(x,y);if(h)onInspect(h.object.userData.action===undefined?h.object.userData.info:{chapter:h.object.userData.action});},nearest,activate(){const r=renderer.domElement.getBoundingClientRect(),h=hit(r.left+r.width/2,r.top+r.height/2),chapter=h?.object.userData.action!==undefined&&h.distance<8?h.object.userData.action:nearest({x:camera.position.x,z:camera.position.z});if(chapter!==null)onInspect({chapter});},dispose(){observer.disconnect();built.resources.forEach(r=>r.dispose());renderer.dispose();},poseAt:lesson.poseAt};
}
