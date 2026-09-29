import * as THREE from '../vendor/three.module.js';
import {personPosition,atRound} from './ideas-model.js';

const C={idle:0x668398,active:0xffd47a,known:0x89e7be,fail:0xff8a88,bridge:0xdba5ef};
export function createIdeasScene(lesson,es){
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x101c2b);scene.fog=new THREE.Fog(0x101c2b,35,70);
 scene.add(new THREE.HemisphereLight(0xdfefff,0x34445b,2.2));const sun=new THREE.DirectionalLight(0xffe5c6,3.2);sun.position.set(4,18,9);scene.add(sun);
 const resources=[],targets=[],people=[],links=[],packets=[],stands=[],own=x=>(resources.push(x),x),mat=(color,extra={})=>own(new THREE.MeshStandardMaterial({color,roughness:.55,metalness:.15,...extra}));
 const bodyGeo=own(new THREE.CylinderGeometry(.17,.23,.5,10)),headGeo=own(new THREE.SphereGeometry(.15,12,8)),limbGeo=own(new THREE.CylinderGeometry(.055,.055,.3,8)),phoneGeo=own(new THREE.BoxGeometry(.11,.18,.025)),haloGeo=own(new THREE.TorusGeometry(.38,.018,6,28)),packetGeo=own(new THREE.SphereGeometry(.075,10,8));
 const shoes=mat(0x183244),screen=mat(0xccefff,{emissive:0x90dbff,emissiveIntensity:.4});
 function mesh(g,geometry,material,p=[0,0,0]){const m=new THREE.Mesh(geometry,material);m.position.set(...p);g.add(m);return m;}
 function box(g,p,size,color,extra){return mesh(g,own(new THREE.BoxGeometry(...size)),mat(color,extra),p);}
 function label(g,words,p,width=3){const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');ctx.font='600 48px system-ui';canvas.width=Math.ceil(ctx.measureText(words).width+48);canvas.height=96;ctx.font='600 48px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#deeff6';ctx.fillText(words,canvas.width/2,48);const tex=own(new THREE.CanvasTexture(canvas));tex.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Sprite(own(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false})));m.scale.set(width,width*96/canvas.width,1);m.position.set(...p);g.add(m);return m;}
 box(scene,[0,-.2,0],[29,.3,29],0x172a3b);
 const grid=new THREE.GridHelper(28,28,0x355265,0x243e51);resources.push(grid.geometry,grid.material);scene.add(grid);
 const accents=[0x3b7b90,0x726298,0x45877c,0x957752];
 for(let c=0;c<4;c++){const x=(c%2)*8-4,z=Math.floor(c/2)*8-4;
  const disk=mesh(scene,own(new THREE.CylinderGeometry(3.35,3.35,.12,64)),mat(accents[c]),[x,.025,z]);disk.material.roughness=.9;
  const border=mesh(scene,own(new THREE.TorusGeometry(3.35,.025,6,80)),mat(accents[c],{emissive:accents[c],emissiveIntensity:.7}),[x,.1,z]);border.rotation.x=Math.PI/2;
  label(scene,`${es?'COMUNIDAD':'COMMUNITY'} ${'ABCD'[c]} · 16`,[x,2.35,z-2.8],4.2);
 }
 for(let i=0;i<64;i++){
  const [x,,z]=personPosition(i),g=new THREE.Group();g.position.set(x,.13,z);g.rotation.y=-i%16/16*Math.PI*2;scene.add(g);
  const body=mesh(g,bodyGeo,mat(C.idle),[0,.57,0]);const head=mesh(g,headGeo,mat([0xe7b897,0xc18f73,0x8a604d,0xf1cfb2][i%4]),[0,.99,0]);
  for(const side of [-1,1]){mesh(g,limbGeo,shoes,[side*.1,.2,0]);const arm=mesh(g,limbGeo,body.material,[side*.23,.6,0]);arm.rotation.z=side*.35;}
  mesh(g,phoneGeo,screen,[.22,.66,.1]);const halo=mesh(g,haloGeo,mat(C.active,{emissive:C.active,emissiveIntensity:1.2}),[0,.02,0]);halo.rotation.x=Math.PI/2;
  const idLabel=label(g,String(i+1).padStart(2,'0'),[0,1.33,0],.36);idLabel.visible=false;
  const info=L(`${es?'Persona':'Person'} ${i+1}`,`${es?'Persona':'Person'} ${i+1}`);head.userData.info=info;head.userData.person=i;body.userData.person=i;body.userData.info=info;targets.push(head,body);people.push({g,body,halo,idLabel,head});
 }
 // Every contact exists once. Visibility is selected by the same graph as the cascade.
 for(let a=0;a<64;a++)for(let b=a+1;b<64;b++){
  const same=Math.floor(a/16)===Math.floor(b/16),distance=Math.min((b-a)%16,16-(b-a)%16),bridge=b===a+8&&a%16===8;
  if(!(same&&distance<=4)&&!bridge)continue;
  const p=personPosition(a),q=personPosition(b),curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(p[0],.18,p[2]),new THREE.Vector3((p[0]+q[0])/2,bridge?.65:.21,(p[2]+q[2])/2),new THREE.Vector3(q[0],.18,q[2]));
  const m=mesh(scene,own(new THREE.TubeGeometry(curve,12,bridge?.045:.023,4,false)),mat(bridge?C.bridge:0x7b9ca9,{transparent:true,opacity:bridge?.85:.22}));links.push({a,b,m,bridge,curve});
 }
 for(let i=0;i<512;i++){const m=mesh(scene,packetGeo,mat(C.active,{emissive:C.active,emissiveIntensity:.6,transparent:true}));m.visible=false;packets.push(m);}
 const standsGroup=new THREE.Group();scene.add(standsGroup);
 for(let i=0;i<4;i++){
  const x=[-8,-2,4,10][i],z=9;box(standsGroup,[x,.52,z],[1.8,1.05,.8],0x263f53);box(standsGroup,[x,1.1,z],[2,.08,1],0x526479);
  const b=box(standsGroup,[x,1.25,z+.08],[.85,.25,.55],0x8ee7be,{emissive:0x56b991,emissiveIntensity:.35});b.userData.action=i;b.userData.info=L('Escuchar esta etapa','Listen to this chapter');targets.push(b);stands.push(b);
  label(standsGroup,`${i+1} · ${(es?['SEMILLA','RAMAS','PUENTES','LÍMITE']:['SEED','BRANCHES','BRIDGES','LIMIT'])[i]}`,[x,2.6,z],2.2);
  label(standsGroup,es?'▶ ESCUCHAR':'▶ LISTEN',[x,1.55,z+.25],1.1);
 }
 let lastState;
 function update(s,time=s.t,phase=0){
  const state=s.trace?atRound(s.trace,Number.isFinite(time)?time:s.t):s;lastState=state;
  const active=new Set(state.active),set=new Set(state.edges.map(([a,b])=>[Math.min(a,b),Math.max(a,b)].join(':')));
  people.forEach((p,i)=>{const color=active.has(i)?C.active:state.known.has(i)?C.known:C.idle;p.body.material.color.setHex(color);p.halo.visible=active.has(i);p.idLabel.visible=active.has(i)||i===0;p.head.userData.info=p.body.userData.info=L(`Persona ${i+1} · comunidad ${'ABCD'[Math.floor(i/16)]}. ${state.known.has(i)?`Recibió la idea en la ronda ${state.first[i]}. ${active.has(i)?'Puede transmitir en la siguiente ronda.':'Ya terminó su oportunidad.'}`:'Todavía no recibió la idea.'}`,`Person ${i+1} · community ${'ABCD'[Math.floor(i/16)]}. ${state.known.has(i)?`Reached in round ${state.first[i]}. ${active.has(i)?'Can transmit in the next round.':'Its opportunity has ended.'}`:'Has not received the idea yet.'}`);});
  links.forEach(l=>{l.m.visible=set.has(`${l.a}:${l.b}`);const outgoing=(active.has(l.a)&&!state.known.has(l.b))||(active.has(l.b)&&!state.known.has(l.a));l.m.material.color.setHex(outgoing?C.active:l.bridge?C.bridge:0x244354);l.m.material.emissive.setHex(outgoing?0x55411b:0x000000);l.m.material.opacity=outgoing?.9:l.bridge?.85:.75;});
  const progress=state.progress??0,events=state.events.filter(e=>e.attempted);packets.forEach((m,i)=>{const e=events[i];m.visible=!!e&&progress>.015;if(!m.visible)return;const p=personPosition(e.from),q=personPosition(e.to),u=Math.min(1,progress/.9);m.position.set(p[0]+(q[0]-p[0])*u,1.25+Math.sin(u*Math.PI)*(e.bridge?.65:.3),p[2]+(q[2]-p[2])*u);const color=progress<.65?C.active:e.success?C.known:C.fail;m.material.color.setHex(color);m.material.emissive.setHex(color);m.material.opacity=!e.success&&progress>.9?(1-progress)*10:1;});
  stands.forEach((b,i)=>b.material.emissiveIntensity=i===phase?1:.12);
 }
 return {scene,resources,targets,people,links,stands,standsGroup,packets,outlines:[],update,get state(){return lastState;}};
}
const L=(es,en)=>[es,en];
export function createIdeasWorld(host,lesson,es,onInspect){
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.toneMapping=THREE.ACESFilmicToneMapping;host.append(renderer.domElement);renderer.domElement.tabIndex=0;
 const built=createIdeasScene(lesson,es),camera=new THREE.PerspectiveCamera(48,1,.1,100),ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let model,phase=0;
 function resize(){renderer.setSize(host.clientWidth,host.clientHeight,false);camera.aspect=host.clientWidth/Math.max(1,host.clientHeight);camera.fov=camera.aspect<1?65:48;camera.updateProjectionMatrix();}const observer=new ResizeObserver(resize);observer.observe(host);resize();
 function nearest(player){let best=null,distance=5.8;built.stands.forEach((b,i)=>{const d=Math.hypot(player.x-b.position.x,player.z-b.position.z);if(d<distance){best=i;distance=d;}});return best;}
 function hit(x,y){const r=renderer.domElement.getBoundingClientRect();pointer.set((x-r.left)/r.width*2-1,1-(y-r.top)/r.height*2);ray.setFromCamera(pointer,camera);return ray.intersectObjects(built.targets.filter(o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;}))[0];}
 return {canvas:renderer.domElement,update(s,i){model=s;phase=i;},render(player,dt,animation,orbit,mode,time){
  if(model)built.update(model,time,phase);built.standsGroup.visible=mode==='immersive';
  if(mode==='immersive'){camera.position.set(player.x,1.65,player.z);camera.rotation.set(player.pitch,player.yaw,0,'YXZ');}
  else{const center=new THREE.Vector3(0,.6,1),d=orbit.distance*2;camera.position.set(Math.sin(orbit.yaw)*Math.cos(orbit.pitch)*d,.6+Math.sin(orbit.pitch)*d,center.z+Math.cos(orbit.yaw)*Math.cos(orbit.pitch)*d);camera.lookAt(center);}
  renderer.render(built.scene,camera);
 },inspect(x,y){const h=hit(x,y);if(h)onInspect(h.object.userData.action===undefined?h.object.userData.info:{chapter:h.object.userData.action});},nearest,activate(){const r=renderer.domElement.getBoundingClientRect(),h=hit(r.left+r.width/2,r.top+r.height/2),chapter=h?.object.userData.action!==undefined&&h.distance<8?h.object.userData.action:nearest({x:camera.position.x,z:camera.position.z});if(chapter!==null)onInspect({chapter});},dispose(){observer.disconnect();built.resources.forEach(r=>r.dispose());renderer.dispose();},poseAt:lesson.poseAt};
}
