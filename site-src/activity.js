import * as THREE from './vendor/three.module.js';
import {roadRoute,routePoint} from './world.js';

export const INPUTS=[[],[0],[1],[1],[1],[1],[2,3,4,5],[6],[7]];
export const RESOURCES=['Mineral','Metales','Estructuras','Actuadores','Baterías','Electrónica','Kits','Por probar'];
export function processStatus(frame,next,i){
  const rate=next?.flow[i]??frame.flow[i],cap=next?.worked?.cap[i]??Math.floor(frame.capacity[i]);
  if(frame.capacity[i]<=0)return {code:'rest',label:'Sin turno disponible',color:0x7995b4,rate};
  if(rate===0&&cap>0)return {code:'waiting',label:'Esperando materiales',color:0xffaa61,rate};
  if(rate<cap)return {code:'supply',label:'Suministro insuficiente',color:0xffaa61,rate};
  if(frame.projects[i])return {code:'building',label:'Ampliación en marcha',color:0xffc96c,rate};
  if(frame.capacity[i]>=frame.hardware[i])return {code:'full',label:'Maquinaria al máximo',color:0xddbc78,rate};
  return {code:'working',label:'En producción',color:0xa7e3cb,rate};
}

export function createActivity(scene,world,industries){
  const {box,cyl,palette}=world,root=new THREE.Group();scene.add(root);
  const rings=[],beacons=[],stocks=[],scanners=[],assembly=[],sparks=[],testBodies=[];
  const orange=new THREE.MeshBasicMaterial({color:0xffbc6b,transparent:true,opacity:.75,depthWrite:false});
  const cyan=new THREE.MeshBasicMaterial({color:0x76e8e3,transparent:true,opacity:.3,side:THREE.DoubleSide,depthWrite:false});
  industries.forEach((s,i)=>{
    const material=new THREE.MeshBasicMaterial({color:0x99ddc6,transparent:true,opacity:.3,depthWrite:false});
    const ring=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([[-8.2,-7.2],[8.2,-7.2],[8.2,7.2],[-8.2,7.2]].map(([x,z])=>new THREE.Vector3(s.x+x,.36,s.z+z))),material);root.add(ring);rings.push(ring);
    const beaconMat=new THREE.MeshStandardMaterial({color:0xa8e4ca,emissive:0x80dcb7,emissiveIntensity:1.2});
    cyl(root,s.x+7.5,1,s.z+6.1,.09,1.4,palette.dark,8);const lamp=cyl(root,s.x+7.5,1.85,s.z+6.1,.18,.35,beaconMat,8);beacons.push(lamp);
    if(i<8){const g=new THREE.Group();g.position.set(s.x-6.9,0,s.z-3.7);root.add(g);const crates=[];for(let j=0;j<12;j++){const o=box(g,(j%2)*.8,.65+Math.floor(j/4)*.7,Math.floor(j%4/2)*.85,.66,.62,.68,[palette.yellow,palette.wall,palette.blue,palette.orange,palette.mint,palette.mint,palette.orange,palette.white][i]);crates.push(o);}stocks.push(crates);}
  });
  // Unfinished bodies lie on the assembly benches; scanners move across the test bays.
  for(let j=0;j<5;j++){const g=new THREE.Group();g.position.set(industries[7].x-4.8+j*2.4,1.85,industries[7].z-.3);g.rotation.x=Math.PI/2;root.add(g);box(g,0,.25,0,.5,.7,.32,palette.white);cyl(g,0,.84,0,.24,.35,palette.white);box(g,0,.86,.19,.36,.13,.05,palette.dark);for(const side of [-1,1]){box(g,side*.34,.25,0,.13,.65,.16,palette.wall);box(g,side*.15,-.4,0,.17,.6,.18,palette.dark);}assembly.push(g);const spark=new THREE.Mesh(new THREE.IcosahedronGeometry(.14,0),orange);root.add(spark);sparks.push(spark);}
  for(let j=0;j<4;j++){const scan=box(root,industries[8].x-4.5+j*3,2,industries[8].z-1,1.8,.035,4.5,cyan,false);scanners.push(scan);const body=assembly[0].clone(true);body.rotation.set(0,0,0);body.position.set(industries[8].x-4.5+j*3,1.45,industries[8].z-1.5);body.scale.setScalar(.95);root.add(body);testBodies.push(body);}
  const smokeGeo=new THREE.SphereGeometry(1,6,4),smokeMat=new THREE.MeshBasicMaterial({color:0xb8cbd6,transparent:true,opacity:.16,depthWrite:false});
  const smoke=new THREE.InstancedMesh(smokeGeo,smokeMat,10);root.add(smoke);smoke.frustumCulled=false;
  const dust=new THREE.InstancedMesh(smokeGeo,new THREE.MeshBasicMaterial({color:0xdac49b,transparent:true,opacity:.16,depthWrite:false}),8);root.add(dust);dust.frustumCulled=false;
  const temp=new THREE.Object3D();
  // Soft pools of light make working areas legible at night without hundreds of lights.
  const lightCanvas=document.createElement('canvas');lightCanvas.width=64;lightCanvas.height=64;const context=lightCanvas.getContext('2d'),gradient=context.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(255,214,147,.5)');gradient.addColorStop(1,'rgba(255,214,147,0)');context.fillStyle=gradient;context.fillRect(0,0,64,64);
  const lightMaterial=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(lightCanvas),transparent:true,opacity:.5,depthWrite:false,blending:THREE.AdditiveBlending});
  industries.forEach(s=>{const light=new THREE.Mesh(new THREE.PlaneGeometry(15,12),lightMaterial);light.rotation.x=-Math.PI/2;light.position.set(s.x,.355,s.z+1);root.add(light);});
  const links=[[0,1],[1,2],[1,3],[1,4],[1,5],[2,6],[3,6],[4,6],[5,6],[6,7],[7,8]];
  const routes=links.map(([from,to])=>{const a=industries[from],b=industries[to],path=roadRoute({x:a.x+6.6,z:a.z+6.8},{x:b.x-6.6,z:b.z+6.8});const material=new THREE.LineBasicMaterial({color:0x8edccc,transparent:true,opacity:.8,depthWrite:false});const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(path.map(p=>new THREE.Vector3(p.x,.55,p.z))),material);root.add(line);const arrows=[];for(let j=0;j<4;j++){const o=new THREE.Mesh(new THREE.ConeGeometry(.3,.8,3),new THREE.MeshBasicMaterial({color:0x9aefda}));root.add(o);arrows.push(o);}return {from,to,path,line,arrows};});
  let lastStocks='';
  function update(frame,next,time,phase,selected,showRoutes){
    const statuses=industries.map((_,i)=>processStatus(frame,next,i)),h=(frame.hour+phase)%24,night=1-THREE.MathUtils.smoothstep(Math.sin((h-6)/24*Math.PI*2),-.13,.35);lightMaterial.opacity=night*.42;
    rings.forEach((o,i)=>{o.material.color.set(selected===i?0xffffff:statuses[i].color);o.material.opacity=selected===i?.9:statuses[i].code==='waiting'?.35+.1*Math.sin(time*2):.16;beacons[i].material.color.set(statuses[i].color);beacons[i].material.emissive.set(statuses[i].color);});
    const key=frame.inventory.join(',');if(key!==lastStocks){stocks.forEach((crates,i)=>{const n=frame.inventory[i],visible=Math.min(12,n>0?Math.ceil(Math.sqrt(n)):0);crates.forEach((o,j)=>o.visible=j<visible);});lastStocks=key;}
    const assemblyRate=statuses[7].rate;assembly.forEach((g,j)=>{g.visible=assemblyRate>j||frame.inventory[6]>j;const p=(time*.4+j*.21)%1;g.scale.setScalar(.8+p*.2);sparks[j].visible=assemblyRate>j&&p>.55&&p<.7;sparks[j].position.set(g.position.x+.3,2.1,g.position.z+.2);sparks[j].scale.setScalar(1+Math.sin(time*30+j)*.4);});
    scanners.forEach((o,j)=>{o.visible=statuses[8].rate>0&&frame.inventory[7]>j;o.position.y=.9+((time*.4+j*.22)%1)*2.4;testBodies[j].visible=frame.inventory[7]>j;});
    smoke.count=statuses[1].rate>0?10:0;for(let j=0;j<smoke.count;j++){const t=(time*.15+j/10)%1;temp.position.set(industries[1].x+5.4+t*2,6.3+t*6,industries[1].z-2+Math.sin(j)*.3);temp.scale.setScalar(.3+t*.8);temp.updateMatrix();smoke.setMatrixAt(j,temp.matrix);}smoke.instanceMatrix.needsUpdate=true;
    dust.count=statuses[0].rate>0?8:0;for(let j=0;j<dust.count;j++){const t=(time*.3+j/8)%1;temp.position.set(industries[0].x-1+t*2,1+t*1.5,industries[0].z-1+Math.sin(j)*.7);temp.scale.setScalar(.25+t*.55);temp.updateMatrix();dust.setMatrixAt(j,temp.matrix);}dust.instanceMatrix.needsUpdate=true;
    routes.forEach(r=>{const visible=showRoutes||selected===r.from||selected===r.to;r.line.visible=visible;const blocked=statuses[r.to].code==='waiting'||statuses[r.to].code==='supply';r.line.material.color.set(blocked?0xffad67:0x8edccc);r.line.material.opacity=selected===r.from||selected===r.to?.9:.3;r.arrows.forEach((o,j)=>{o.visible=visible&&statuses[r.from].rate>0;const p=routePoint(r.path,(time*.08+j/4)%1);o.position.set(p.x,.65,p.z);o.rotation.set(Math.PI/2,p.angle,0,'YXZ');});});
  }
  return {update};
}
