import * as THREE from '../vendor/three.module.js';
import {swarmLayout,COLLECTOR_MAX} from './model.js';

export const AU_UNITS=20;

export function createDysonWorld(host){
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
 renderer.setClearColor(0x06080e);host.append(renderer.domElement);
 const scene=new THREE.Scene();
 const camera=new THREE.PerspectiveCamera(44,1,.12,520);
 scene.fog=new THREE.FogExp2(0x06080e,.0035);
 scene.add(new THREE.HemisphereLight(0x8eabff,0x1a140c,.7));
 const sunLight=new THREE.PointLight(0xffe6b8,7,220,1.05);scene.add(sunLight);

 const sun=new THREE.Mesh(new THREE.SphereGeometry(1,48,32),new THREE.MeshBasicMaterial({color:0xfff3c4}));
 sun.scale.setScalar(2.15);scene.add(sun);
 const makeGlow=(color,scale,opacity)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(1,32,24),new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,blending:THREE.AdditiveBlending}));m.scale.setScalar(scale);scene.add(m);return m;};
 const corona=makeGlow(0xffc46a,3.4,.22),halo=makeGlow(0xff7a3a,5.4,.07);

 const starGeo=new THREE.BufferGeometry(),starCount=900,starPos=new Float32Array(starCount*3),starCol=new Float32Array(starCount*3);
 for(let i=0;i<starCount;i++){
  const r=90+Math.random()*140,u=Math.random(),v=Math.random(),th=2*Math.PI*u,ph=Math.acos(2*v-1);
  starPos[i*3]=r*Math.sin(ph)*Math.cos(th);starPos[i*3+1]=r*Math.cos(ph);starPos[i*3+2]=r*Math.sin(ph)*Math.sin(th);
  const c=.55+Math.random()*.45;starCol[i*3]=c;starCol[i*3+1]=.85*c+Math.random()*.15;starCol[i*3+2]=1;
 }
 starGeo.setAttribute('position',new THREE.BufferAttribute(starPos,3));
 starGeo.setAttribute('color',new THREE.BufferAttribute(starCol,3));
 scene.add(new THREE.Points(starGeo,new THREE.PointsMaterial({vertexColors:true,size:.42,sizeAttenuation:true})));

 const earth=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),new THREE.MeshStandardMaterial({color:0x6faad1,emissive:0x16324a,emissiveIntensity:.35,roughness:.62}));
 earth.scale.setScalar(.2);scene.add(earth);
 const earthOrbit=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({length:96},(_,i)=>{const a=i/96*Math.PI*2;return new THREE.Vector3(Math.cos(a)*AU_UNITS,0,Math.sin(a)*AU_UNITS);})),new THREE.LineBasicMaterial({color:0x6faad1,transparent:true,opacity:.35}));
 scene.add(earthOrbit);

 const jupiter=new THREE.Mesh(new THREE.SphereGeometry(1,20,14),new THREE.MeshStandardMaterial({color:0xc4a070,roughness:.8}));
 jupiter.scale.setScalar(.55);scene.add(jupiter);
 const jupR=5.2*AU_UNITS;
 scene.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({length:72},(_,i)=>{const a=i/72*Math.PI*2;return new THREE.Vector3(Math.cos(a)*jupR,0,Math.sin(a)*jupR);})),new THREE.LineBasicMaterial({color:0xc4a070,transparent:true,opacity:.14})));

 const rayPos=[];
 for(let i=0;i<20;i++){const a=i/20*Math.PI*2,el=(i%4-1.5)*.12,x=Math.cos(a)*Math.cos(el),y=Math.sin(el),z=Math.sin(a)*Math.cos(el);rayPos.push(0,0,0,x*90,y*90,z*90);}
 const rays=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(rayPos,3)),new THREE.LineBasicMaterial({color:0xffe29a,transparent:true,opacity:.11,blending:THREE.AdditiveBlending,depthWrite:false}));
 scene.add(rays);

 const swarmOrbit=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({length:128},(_,i)=>{const a=i/128*Math.PI*2;return new THREE.Vector3(Math.cos(a),0,Math.sin(a));})),new THREE.LineBasicMaterial({color:0xf0c075,transparent:true,opacity:.28}));
 scene.add(swarmOrbit);
 const shellGeo=new THREE.SphereGeometry(1,72,52);
 const shellIndex=shellGeo.index.count;
 const shell=new THREE.Mesh(shellGeo,new THREE.MeshStandardMaterial({color:0xf0c075,transparent:true,opacity:.17,roughness:.38,metalness:.28,emissive:0x8a4318,emissiveIntensity:.18,side:THREE.DoubleSide,depthWrite:false}));
 scene.add(shell);
 const heat=new THREE.Mesh(new THREE.SphereGeometry(1,32,24),new THREE.MeshBasicMaterial({color:0xff5a30,transparent:true,opacity:0,depthWrite:false,side:THREE.BackSide,blending:THREE.AdditiveBlending}));
 scene.add(heat);

 const pts=swarmLayout(),dummy=new THREE.Object3D();
 const panels=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:0xd5f3e6,metalness:.55,roughness:.28,emissive:0x1c4a3c,emissiveIntensity:.4}),COLLECTOR_MAX);
 panels.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(panels);
 for(let i=0;i<pts.length;i++){
  dummy.position.set(pts[i].x,pts[i].y,pts[i].z);
  dummy.lookAt(0,0,0);dummy.rotateX(Math.PI/2);
  dummy.scale.set(.62+pts[i].ring%3*.08,.028,.38);
  dummy.updateMatrix();panels.setMatrixAt(i,dummy.matrix);
 }
 panels.instanceMatrix.needsUpdate=true;panels.frustumCulled=false;

 let theta=.7,phi=.42,dist=52,dragging=false,lastX=0,lastY=0,userZoom=false,clock=0,pinch=0;
 function intendedDist(radiusAu){return 22+radiusAu*24;}
 function placeCamera(){
  phi=Math.min(1.25,Math.max(-1.15,phi));dist=Math.min(160,Math.max(16,dist));
  const cp=Math.cos(phi),sp=Math.sin(phi);
  camera.position.set(dist*Math.sin(theta)*cp,dist*sp,dist*Math.cos(theta)*cp);
  camera.lookAt(0,.15,0);
 }
 function resize(){
  const w=host.clientWidth,h=Math.max(1,host.clientHeight);
  renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();placeCamera();
 }
 new ResizeObserver(resize).observe(host);resize();
 host.addEventListener('pointerdown',e=>{if(e.target!==renderer.domElement)return;dragging=true;lastX=e.clientX;lastY=e.clientY;host.setPointerCapture(e.pointerId);});
 host.addEventListener('pointerup',()=>dragging=false);
 host.addEventListener('pointermove',e=>{if(!dragging)return;theta-=(e.clientX-lastX)*0.005;phi+=(e.clientY-lastY)*0.0045;lastX=e.clientX;lastY=e.clientY;placeCamera();});
 host.addEventListener('wheel',e=>{e.preventDefault();userZoom=true;dist*=e.deltaY>0?1.07:.93;placeCamera();},{passive:false});
 host.addEventListener('touchstart',e=>{if(e.touches.length===2)pinch=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);},{passive:true});
 host.addEventListener('touchmove',e=>{if(e.touches.length!==2)return;const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);if(pinch){userZoom=true;dist*=pinch/d;placeCamera();}pinch=d;},{passive:true});
 host.addEventListener('keydown',e=>{const step=.12;if(e.key==='ArrowLeft')theta-=step;else if(e.key==='ArrowRight')theta+=step;else if(e.key==='ArrowUp')phi-=step;else if(e.key==='ArrowDown')phi+=step;else if(e.key==='+'||e.key==='='){userZoom=true;dist/=1.12;}else if(e.key==='-'){userZoom=true;dist*=1.12;}else return;e.preventDefault();placeCamera();});
 host.tabIndex=0;
 renderer.domElement.addEventListener('webglcontextlost',e=>e.preventDefault());

 function render(s,dt){
  const R=s.radiusAu*AU_UNITS,cover=Math.min(1,Math.max(0,s.coverage)),swarm=s.form==='swarm';
  if(Number.isFinite(dt)&&dt>0)clock+=dt;
  if(!userZoom)dist+=(intendedDist(s.radiusAu)-dist)*.08;
  panels.scale.setScalar(R);swarmOrbit.scale.setScalar(R);shell.scale.setScalar(R);heat.scale.setScalar(R*1.05);
  const earthA=clock*.07;earth.position.set(Math.cos(earthA)*AU_UNITS,0,Math.sin(earthA)*AU_UNITS);earth.rotation.y=clock*.5;
  jupiter.position.set(Math.cos(clock*.012)*jupR,.2,Math.sin(clock*.012)*jupR);
  panels.visible=swarm&&cover>0.002;
  panels.count=Math.max(1,Math.floor(cover*COLLECTOR_MAX));
  shell.visible=!swarm&&cover>0.01;
  shell.geometry.setDrawRange(0,Math.max(3,Math.floor(cover*shellIndex/3)*3));
  shell.material.opacity=.08+cover*.26;
  heat.material.opacity=cover*(swarm?.12:.2);
  corona.material.opacity=.22-.1*cover;halo.material.opacity=.07-.03*cover;
  rays.material.opacity=.11*(1-cover);sunLight.intensity=7-2.4*cover;
  const spin=!matchMedia('(prefers-reduced-motion: reduce)').matches&&Number.isFinite(dt)&&dt>0;
  if(spin){if(swarm)panels.rotation.y+=dt*.03;else shell.rotation.y+=dt*.012;}
  placeCamera();
  renderer.render(scene,camera);
 }
 return {
  render,
  zoomBy(f){userZoom=true;dist/=f;placeCamera();},
  fit(){userZoom=false;theta=.7;phi=.42;dist=intendedDist(1);placeCamera();}
 };
}
