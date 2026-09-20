import * as THREE from '../vendor/three.module.js';

const M=.095;
function mat(c,extra={}){return new THREE.MeshStandardMaterial({color:c,roughness:.55,metalness:.25,...extra});}
function cyl(r,h,c,seg=20){return new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,seg),mat(c));}
function cone(r1,r2,h,c){return new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,16),mat(c));}

function buildFalcon(){
 const white=0xe8e4d8,black=0x1a1c1f,booster=new THREE.Group(),upper=new THREE.Group();
 const s1=cyl(1.83*M,42*M,white);s1.position.y=21*M;booster.add(s1);
 const stripe=cyl(1.86*M,7.5*M,black);stripe.position.y=11*M;booster.add(stripe);
 const octa=cyl(1.7*M,1.2*M,black);octa.position.y=1.05*M;booster.add(octa);
 for(let i=0;i<9;i++){
  const a=i===0?0:i*2*Math.PI/8,r=i===0?0:1.05*M;
  const e=cone(.22*M,.38*M,1.4*M,0x4a4e55);e.position.set(Math.cos(a)*r,.35*M,Math.sin(a)*r);booster.add(e);
 }
 const legs=[],fins=[];
 for(let i=0;i<4;i++){
  const a=i*Math.PI/2+.45;
  const boom=cyl(.07*M,7.2*M,white);boom.position.set(Math.cos(a)*1.15*M,3.8*M,Math.sin(a)*1.15*M);
  const foot=cyl(.32*M,.1*M,0xc9c4b6);foot.position.set(Math.cos(a)*3.6*M,.12*M,Math.sin(a)*3.6*M);
  const fin=new THREE.Mesh(new THREE.BoxGeometry(.12*M,1.7*M,1.15*M),mat(0x5c6168));
  fin.position.set(Math.cos(a)*1.95*M,37.5*M,Math.sin(a)*1.95*M);
  booster.add(boom,foot,fin);legs.push({boom,foot,a});fins.push(fin);
 }
 const inter=cyl(1.83*M,4.2*M,0xb7c0c4);inter.position.y=44*M;booster.add(inter);
 const s2=cyl(1.83*M,13.8*M,white);s2.position.y=8*M;upper.add(s2);
 const vac=cone(.28*M,.7*M,2.8*M,0x4a4e55);vac.position.y=.4*M;upper.add(vac);
 const fairL=cone(.2*M,1.83*M,13*M,white),fairR=cone(.2*M,1.83*M,13*M,white);
 fairL.position.set(-.015,16.5*M,0);fairR.position.set(.015,16.5*M,0);upper.add(fairL,fairR);
 return {booster,upper,legs,fins,fairL,fairR};
}

function buildStarship(){
 const steel=0xc5c1b6,booster=new THREE.Group(),ship=new THREE.Group();
 const boost=cyl(4.5*M,69*M,steel,28);boost.position.y=34.5*M;booster.add(boost);
 for(let i=0;i<33;i++){
  const ring=i<13?0:i<26?1:2,k=i<13?i:i<26?i-13:i-26,n=ring<2?13:7,a=k*2*Math.PI/n,r=ring===2?0:(ring===0?3.3*M:1.7*M);
  const e=cone(.28*M,.42*M,1.6*M,0x3d4148);e.position.set(Math.cos(a)*r,.5*M,Math.sin(a)*r);booster.add(e);
 }
 const body=cyl(4.5*M,48*M,steel,28);body.position.y=24*M;ship.add(body);
 const nose=cone(.15*M,4.5*M,12*M,steel);nose.position.y=54*M;ship.add(nose);
 for(const side of [-1,1]){
  const flap=new THREE.Mesh(new THREE.BoxGeometry(1.2*M,8*M,3.2*M),mat(steel));flap.position.set(side*5.2*M,32*M,0);ship.add(flap);
 }
 const tiles=new THREE.Mesh(new THREE.CylinderGeometry(4.52*M,4.52*M,40*M,28),new THREE.MeshStandardMaterial({color:0x2a2420,roughness:.9,metalness:.05}));
 tiles.position.y=22*M;ship.add(tiles);
 return {booster,ship};
}

function tower(){
 const g=new THREE.Group();
 const mast=new THREE.Mesh(new THREE.BoxGeometry(1.8,16,1.8),mat(0x6a7380));mast.position.set(-4.2,8,0);g.add(mast);
 for(let y=2;y<15;y+=1.6){const b=new THREE.Mesh(new THREE.BoxGeometry(2.2,.12,2.2),mat(0x8a94a0));b.position.set(-4.2,y,0);g.add(b);}
 const armL=new THREE.Mesh(new THREE.BoxGeometry(5,.4,.4),mat(0xd4a24a));armL.position.set(-1.6,12.2,-1.15);
 const armR=new THREE.Mesh(new THREE.BoxGeometry(5,.4,.4),mat(0xd4a24a));armR.position.set(-1.6,12.2,1.15);
 g.add(armL,armR);g.userData={armL,armR};
 return g;
}

export function createSpaceWorld(host){
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setClearColor(0x140c08);host.append(renderer.domElement);
 const scene=new THREE.Scene();scene.fog=new THREE.Fog(0x140c08,48,150);
 const camera=new THREE.PerspectiveCamera(48,1,.2,220);
 scene.add(new THREE.HemisphereLight(0xc9e4ff,0x3a2414,1.15));
 const sun=new THREE.DirectionalLight(0xffe0b8,2.6);sun.position.set(-12,18,8);scene.add(sun);

 const ground=new THREE.Mesh(new THREE.CircleGeometry(90,48),mat(0x1a3340,{roughness:.95}));ground.rotation.x=-Math.PI/2;scene.add(ground);
 const pad=new THREE.Mesh(new THREE.CylinderGeometry(4.8,4.8,.1,32),mat(0x5c6168));pad.position.y=.05;scene.add(pad);
 const water=new THREE.Mesh(new THREE.CircleGeometry(80,40),new THREE.MeshStandardMaterial({color:0x12303c,roughness:.7,metalness:.2}));water.rotation.x=-Math.PI/2;water.position.set(0,-.03,40);scene.add(water);
 const barge=new THREE.Mesh(new THREE.BoxGeometry(7,.7,14),mat(0x8a9098));barge.position.set(0,.45,44);scene.add(barge);
 const deck=new THREE.Mesh(new THREE.CylinderGeometry(2.4,2.4,.12,20),mat(0x6a7078));deck.position.set(0,.85,44);scene.add(deck);
 const strong=new THREE.Mesh(new THREE.BoxGeometry(1.1,8,.8),mat(0x6a7380));strong.position.set(-2.4,4,0);scene.add(strong);

 const twr=tower();scene.add(twr);
 const f9=buildFalcon(),ss=buildStarship();
 scene.add(f9.booster,f9.upper,ss.booster,ss.ship);
 const plume=new THREE.Mesh(new THREE.ConeGeometry(.85,5,12),new THREE.MeshBasicMaterial({color:0xffb14a,transparent:true,opacity:.8,depthWrite:false}));plume.rotation.x=Math.PI;scene.add(plume);
 const plume2=new THREE.Mesh(new THREE.ConeGeometry(.45,3.2,10),new THREE.MeshBasicMaterial({color:0xffe29a,transparent:true,opacity:.55,depthWrite:false}));plume2.rotation.x=Math.PI;scene.add(plume2);
 const stars=new THREE.BufferGeometry(),n=500,sp=new Float32Array(n*3);
 for(let i=0;i<n;i++){sp[i*3]=(Math.random()-.5)*90;sp[i*3+1]=18+Math.random()*80;sp[i*3+2]=(Math.random()-.5)*90;}
 stars.setAttribute('position',new THREE.BufferAttribute(sp,3));
 scene.add(new THREE.Points(stars,new THREE.PointsMaterial({color:0xf2e6d0,size:.11})));

 let theta=.55,phi=.32,dist=22,dragging=false,lx=0,ly=0;
 function placeCam(target){
  phi=Math.min(1.1,Math.max(.08,phi));dist=Math.min(80,Math.max(8,dist));
  const t=target||new THREE.Vector3(0,6,0);
  camera.position.set(t.x+dist*Math.sin(theta)*Math.cos(phi),t.y+dist*Math.sin(phi)+2,t.z+dist*Math.cos(theta)*Math.cos(phi));
  camera.lookAt(t);
 }
 function resize(){const w=host.clientWidth,h=Math.max(1,host.clientHeight);renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}
 new ResizeObserver(resize).observe(host);resize();
 host.addEventListener('pointerdown',e=>{if(e.target!==renderer.domElement)return;dragging=true;lx=e.clientX;ly=e.clientY;host.setPointerCapture(e.pointerId);});
 host.addEventListener('pointerup',()=>dragging=false);
 host.addEventListener('pointermove',e=>{if(!dragging)return;theta-=(e.clientX-lx)*0.006;phi+=(e.clientY-ly)*0.004;lx=e.clientX;ly=e.clientY;});
 host.addEventListener('wheel',e=>{e.preventDefault();dist*=e.deltaY>0?1.08:.92;},{passive:false});

 function lerp(a,b,u){return a+(b-a)*Math.min(1,Math.max(0,u));}
 function poseFalcon(s){
  const t=s.time,reuse=s.reuse,sep=t>=150,landed=reuse&&t>=480;
  let y=3.5,z=0,bY=3.5,bZ=0;
  if(t<8){y=3.5+t*.18;}
  else if(t<150){const u=(t-8)/142;y=5+u*u*40;z=u*18;}
  else {const u=Math.min(1,(t-150)/490);y=45+u*58;z=18+u*78;}
  if(!sep){bY=y;bZ=z;}
  else if(!reuse){bY=y-6;bZ=z+5;}
  else if(t<260){const u=(t-150)/110;bY=y-u*12;bZ=z-u*8;}
  else if(t<480){const u=(t-260)/220;bY=lerp(y-12,1.15,u*u);bZ=lerp(z-8,44,u);}
  else {bY=1.15;bZ=44;}
  f9.booster.position.set(0,bY,bZ);
  f9.booster.rotation.x=sep&&reuse&&!landed?lerp(.05,.55,(t-150)/200):landed?0:.1*Math.min(1,t/70);
  f9.upper.position.set(0,(sep?y:bY)+46*M,sep?z:bZ);
  f9.upper.rotation.x=sep?.08:.1*Math.min(1,t/70);
  const fair=Math.max(0,t-195);
  f9.fairL.position.x=-.015-fair*.04;f9.fairR.position.x=.015+fair*.04;
  f9.fairL.rotation.z=-Math.min(.8,fair*.015);f9.fairR.rotation.z=Math.min(.8,fair*.015);
  const finU=sep?Math.min(1,(t-150)/8):0;
  f9.fins.forEach(fin=>{fin.rotation.x=finU*.6;});
  const legU=landed?1:sep&&reuse?Math.min(1,Math.max(0,(t-400)/50)):0;
  f9.legs.forEach(({boom,foot,a})=>{
   boom.rotation.z=.15+legU*.55;
   boom.position.set(Math.cos(a)*(1.15+legU)*M,(3.8-legU*.4)*M,Math.sin(a)*(1.15+legU)*M);
   foot.position.set(Math.cos(a)*(2.2+legU*2.2)*M,.12*M,Math.sin(a)*(2.2+legU*2.2)*M);
   foot.visible=legU>.05;
  });
  const fire=t>8&&!(landed&&sep);
  plume.visible=fire;plume2.visible=fire&&t<160;
  plume.position.set(0,bY-2.6,bZ);plume.scale.set(1,t<20?1.3:t<150?2.4:.9,1);
  plume2.position.set(0,(sep?y:bY)-1.8,sep?z:bZ);
  twr.visible=false;barge.visible=true;deck.visible=true;strong.visible=true;
  return new THREE.Vector3(0,sep?Math.max(bY,y*.35):y,sep?bZ*.35+z*.4:z);
 }
 function poseStarship(s){
  const t=s.time,reuse=s.reuse,sep=t>=160,caught=reuse&&t>=420;
  let y=6.4,z=0,bY=6.4,bZ=0;
  if(t<10)y=6.4+t*.12;
  else if(t<160){const u=(t-10)/150;y=7.6+u*u*44;z=u*11;}
  else {const u=Math.min(1,(t-160)/480);y=52+u*58;z=11+u*42;}
  if(!sep){bY=y;bZ=z;}
  else if(!reuse){bY=y-14;bZ=z+6;}
  else if(t<250){const u=(t-160)/90;bY=y-u*10;bZ=z-u*5;}
  else if(t<420){const u=(t-250)/170;bY=lerp(y-10,12.1,u);bZ=lerp(z-5,0,u);}
  else {bY=12.1;bZ=0;}
  ss.booster.position.set(0,bY,bZ);
  ss.booster.rotation.x=sep&&reuse&&!caught?.12:0;
  ss.ship.position.set(0,(sep?y:bY)+70*M,sep?z:bZ);
  ss.ship.rotation.x=sep?.06:0;
  const close=caught?1:Math.max(0,(t-390)/30);
  twr.userData.armL.position.z=lerp(-1.15,-.4,close);twr.userData.armR.position.z=lerp(1.15,.4,close);
  twr.visible=true;barge.visible=false;deck.visible=false;strong.visible=false;
  const fire=t>10&&!caught;
  plume.visible=fire;plume2.visible=fire&&sep;
  plume.position.set(0,bY-3.4,bZ);plume.scale.set(1.8,2.6,1.8);
  plume2.position.set(0,y-2.2,z);plume2.scale.set(1.2,1.8,1.2);
  return new THREE.Vector3(0,sep?Math.max(bY,10):y,sep?bZ:z);
 }

 function render(s){
  const star=s.vehicle==='starship';
  f9.booster.visible=f9.upper.visible=!star;
  ss.booster.visible=ss.ship.visible=star;
  const target=star?poseStarship(s):poseFalcon(s);
  placeCam(target);renderer.render(scene,camera);
 }
 return {render,zoomBy(f){dist/=f;},fit(){theta=.55;phi=.32;dist=22;}};
}
