import * as T from '../vendor/three.module.js';
import {missionPose} from './mission.js';
const V=a=>new T.Vector3(...a),GOLD=0xffbd73;
export function buildMission(es,{textures=true}={}){
 const group=new T.Group(),resources=[],own=x=>(resources.push(x),x),materials=new Map();
 const mat=(color,emissive=0)=>{const key=color+':'+emissive;if(!materials.has(key))materials.set(key,own(new T.MeshStandardMaterial({color,metalness:.55,roughness:.38,emissive:color,emissiveIntensity:emissive})));return materials.get(key);};
 const boxGeo=own(new T.BoxGeometry(1,1,1));
 function box(g,p,s,c,e=0){const m=new T.Mesh(boxGeo,mat(c,e));m.position.set(...p);m.scale.set(...s);g.add(m);return m;}
 function cylinder(g,p,r,h,c,top=r){const m=new T.Mesh(own(new T.CylinderGeometry(top,r,h,32)),mat(c));m.position.set(...p);g.add(m);return m;}
 function label(g,text,p,w){if(!textures)return;const c=document.createElement('canvas'),x=c.getContext('2d');c.width=1024;c.height=100;x.fillStyle='#07131bd9';x.fillRect(0,0,1024,100);x.font='500 40px system-ui';x.textAlign='center';x.textBaseline='middle';x.fillStyle='#d9ecf4';x.fillText(text,512,50,990);const tx=own(new T.CanvasTexture(c));tx.colorSpace=T.SRGBColorSpace;const s=new T.Sprite(own(new T.SpriteMaterial({map:tx,depthWrite:false})));s.position.set(...p);s.scale.set(w,w*100/1024,1);g.add(s);}
 function flame(g,r=1){const f=new T.Group();g.add(f);const outer=new T.Mesh(own(new T.ConeGeometry(r,7,22)),own(new T.MeshBasicMaterial({color:0xff9d50,transparent:true,opacity:.65,depthWrite:false})));outer.rotation.z=Math.PI;outer.position.y=-3.5;f.add(outer);const inner=new T.Mesh(own(new T.ConeGeometry(r*.45,5,18)),own(new T.MeshBasicMaterial({color:0xd9edff})));inner.rotation.z=Math.PI;inner.position.y=-2.5;f.add(inner);return f;}
 function ship(g,{booster=false,depot=false}={}){const a=new T.Group();g.add(a);const h=booster?13:10,r=1.1;cylinder(a,[0,h/2,0],r,h,depot?0x8a9aaa:booster?0xb7c0c7:0xe2e7e7);for(let y=1;y<h;y+=.65){const seam=new T.Mesh(own(new T.TorusGeometry(r+.006,.012,4,40)),mat(0x6a7c87));seam.rotation.x=Math.PI/2;seam.position.y=y;a.add(seam);}
  if(!booster)cylinder(a,[0,h+1.2,0],r,2.4,0xe2e7e7,.04);
  for(let i=0;i<(booster?7:3);i++){const angle=i/(booster?7:3)*Math.PI*2;cylinder(a,[Math.cos(angle)*.55,-.28,Math.sin(angle)*.55],.28,.65,0x283b4a,.14);}
  if(booster){for(let i=0;i<4;i++){const fin=box(a,[Math.cos(i*Math.PI/2)*1.4,h-1,Math.sin(i*Math.PI/2)*1.4],[1.2,.13,.9],0x405464);fin.rotation.y=-i*Math.PI/2;}}
  else if(!depot){for(let i=0;i<6;i++){const ang=i*Math.PI/3;const leg=box(a,[Math.cos(ang)*1.4,.7,Math.sin(ang)*1.4],[.13,2.1,.13],0xacb7bd);leg.rotation.z=-Math.cos(ang)*.4;leg.rotation.x=Math.sin(ang)*.4;box(a,[Math.cos(ang)*1.8,-.2,Math.sin(ang)*1.8],[.7,.12,.6],0xabb8c0);}box(a,[0,8,1.12],[1.1,1.8,.04],0x263b47);for(const x of [-1,1]){box(a,[x*2,5,0],[1.8,.055,1.3],0x164773);}}
  if(depot)for(const x of [-1,1])box(a,[x*3,5,0],[4,.055,2],0x164773);
  const burn=flame(a,booster?1.6:.8);burn.position.y=-.55;return {group:a,burn};
 }
 const earthmat=own(new T.MeshStandardMaterial({color:0x427e9b,roughness:1,metalness:0}));if(textures)new T.TextureLoader().load('../kardashev/earth-blue-marble.jpg',tx=>{own(tx);tx.colorSpace=T.SRGBColorSpace;earthmat.map=tx;earthmat.color.set(0xffffff);earthmat.needsUpdate=true;});
 const sphere=own(new T.SphereGeometry(1,48,32));function planet(g,p,r,m){const a=new T.Mesh(sphere,m);a.position.set(...p);a.scale.setScalar(r);g.add(a);return a;}
 const launch=new T.Group(),orbit=new T.Group(),crossing=new T.Group(),surface=new T.Group();group.add(launch,orbit,crossing,surface);
 box(launch,[0,-.6,0],[150,1,130],0x314c48);box(launch,[38,-.04,-20],[70,.15,160],0x15506a);box(launch,[0,.04,0],[13,.3,13],0x67787e);cylinder(launch,[0,1.3,0],2.8,2.4,0x727d7c);
 for(const x of [-7,-5])for(const z of [-2,0])box(launch,[x,12,z],[.35,24,.35],0x87969b);for(let y=2;y<24;y+=2){box(launch,[-6,y,-1],[2.2,.2,2.2],0x758a92);const brace=box(launch,[-6,y,-1],[.13,2.8,.13],0xa7b3b8);brace.rotation.z=.7;}box(launch,[-3.5,15,-1],[6,.45,.45],0xb3b5ac);
 for(let i=0;i<5;i++){cylinder(launch,[-20+i*3,2.5,-10],1.1,5,0xc3cecf);box(launch,[-20+i*3,.2,-4],[.18,.25,12],0x6c8c93);}
 const booster=ship(launch,{booster:true}),upper=ship(launch);
 const smokeGeo=own(new T.SphereGeometry(1,10,8)),smokeMat=own(new T.MeshStandardMaterial({color:0xbac2c6,transparent:true,opacity:.25,depthWrite:false}));const smoke=Array.from({length:24},()=>{const a=new T.Mesh(smokeGeo,smokeMat);launch.add(a);return a;});
 planet(orbit,[0,-70,-20],58,earthmat);const lunarOrbiter=ship(orbit),depot=ship(orbit,{depot:true}),tanker=ship(orbit,{depot:true});lunarOrbiter.group.rotation.z=Math.PI/2;lunarOrbiter.group.position.set(-2,5,0);depot.group.rotation.z=-Math.PI/2;depot.group.position.set(2,5,0);tanker.group.scale.setScalar(.5);tanker.group.rotation.z=Math.PI/2;tanker.group.position.set(14,0,-8);[lunarOrbiter,depot,tanker].forEach(s=>s.burn.visible=false);

 const fuel=Array.from({length:20},()=>planet(orbit,[0,0,0],.10,mat(0x87e3c3,2)));
 planet(crossing,[-17,0,-4],6,earthmat);planet(crossing,[18,0,0],3.4,mat(0x999ca6));const curve=new T.CatmullRomCurve3([V([-16,5,-2]),V([-10,12,1]),V([7,11,4]),V([17,3,3])]);const line=new T.Mesh(own(new T.TubeGeometry(curve,100,.035,6,false)),mat(0x4c829f,.2));crossing.add(line);const transit=ship(crossing);transit.group.scale.setScalar(.3);transit.burn.visible=false;

 const ground=new T.Mesh(own(new T.PlaneGeometry(130,130,60,60)),mat(0x666c76));ground.rotation.x=-Math.PI/2;surface.add(ground);for(let i=0;i<65;i++){const angle=i*2.4,r=10+i%18*2;const rock=planet(surface,[Math.cos(angle)*r,.2,Math.sin(angle)*r],.3+i%4*.2,mat(0x535965));rock.scale.y*=.45;}
 planet(surface,[-32,25,-55],7,earthmat);const landed=ship(surface);const elevator=new T.Group();landed.group.add(elevator);box(elevator,[2.4,0,0],[2.4,.13,2.4],0x859aa4);const pallet=box(elevator,[2.4,.5,0],[1.6,.9,1.3],GOLD);const cable=box(landed.group,[2.1,5,0],[.04,8,.04],0xd2dedf);box(landed.group,[1.6,9,0],[2,.15,.15],0xa7b8c4);
 const rover=new T.Group();surface.add(rover);box(rover,[0,.55,0],[2.2,.45,1.8],0x97a6b2);for(const x of [-.75,.75])for(const z of [-1,1]){const w=cylinder(rover,[x,.35,z],.32,.3,0x223342);w.rotation.x=Math.PI/2;}const hauled=box(rover,[0,1.2,0],[1.6,.9,1.3],GOLD);
 function update(id,progress){const p=missionPose(id,progress),launching=['liftoff','booster'].includes(id);launch.visible=launching;orbit.visible=id==='refuel';crossing.visible=id==='transfer';surface.visible=['descent','unload','return'].includes(id);booster.group.position.set(0,2.6+(p.height||0),0);upper.group.position.set(id==='booster'?p.separation:0,id==='booster'?p.upper:15.7+(p.height||0),0);booster.burn.visible=!!p.flame;upper.burn.visible=id==='booster';
  smoke.forEach((m,i)=>{m.visible=id==='liftoff'&&p.u<.55;const q=p.u*18+i*.3;m.position.set(Math.sin(i*2.4)*q,.5+i%3*.4,Math.cos(i*2.4)*q);m.scale.setScalar(.2+Math.min(2.8,q*.4));});
  fuel.forEach((m,i)=>{m.position.set(2-((p.u*3+i/20)%1)*4,5,0);});tanker.group.position.x=16-4*Math.sin(p.u*Math.PI);const q=curve.getPointAt(p.u);transit.group.position.copy(q);transit.group.quaternion.setFromUnitVectors(V([0,1,0]),curve.getTangentAt(p.u));
  landed.group.position.y=.3+(p.height||0);landed.burn.visible=!!p.flame;elevator.position.y=id==='unload'?.6+7.4*p.lift:8;cable.visible=id==='unload';elevator.visible=id!=='return';pallet.visible=id!=='unload'||p.u<.6;rover.visible=id==='unload';rover.position.set(2.4+10*(p.cargo||0),0,0);hauled.visible=id==='unload'&&p.u>=.6;
  [booster,upper,landed].forEach(s=>s.burn.scale.set(1,.9+.1*Math.sin(p.u*120),1));return p;
 }
 return {group,update,dispose(){resources.forEach(r=>r.dispose());}};
}
