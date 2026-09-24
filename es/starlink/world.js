import * as THREE from '../../vendor/three.module.js';
import {createPost,adaptiveScale,pointScaleFor,pointMaterial} from '../fx/fx.js';
import {R_EARTH,SHELLS,GATEWAYS,geodetic,eci,buildConstellation,positionsAt,routePacket,coverageGrid} from './model.js';

const SCALE=2.35/R_EARTH;
// Proper rotation (not a mirror): geo z → up, geo y → −z, so east appears to the right of north.
function v3(p){return new THREE.Vector3(p.x*SCALE,p.z*SCALE,-p.y*SCALE);}

function makeEarth(){
 const geo=new THREE.SphereGeometry(2.35,96,64),pos=geo.attributes.position,col=new Float32Array(pos.count*3);
 const land=[[15,20,32],[48,45,38],[42,-100,28],[-12,-58,20],[-24,134,16],[8,80,14],[60,90,16]];
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),lat=Math.asin(y/2.35)*180/Math.PI,lon=Math.atan2(-z,x)*180/Math.PI;
  let g=.18,b=.42,r=.07;
  if(Math.abs(lat)>72){r=.86;g=.9;b=.94;}
  else{
   for(const [la,lo,rad] of land){const d=Math.hypot(lat-la,(lon-lo)*Math.cos(lat*Math.PI/180));if(d<rad){r=.18+.04*(lat+30)/60;g=.38+.08*(lon+40)/80;b=.16;}}
  }
  col[i*3]=r;col[i*3+1]=g;col[i*3+2]=b;
 }
 geo.setAttribute('color',new THREE.BufferAttribute(col,3));
 const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.7,metalness:.04}));
 // Blue Marble when available; the vertex-coloured continents remain the fallback.
 new THREE.TextureLoader().load('../kardashev/earth-blue-marble.jpg',tex=>{tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=8;mesh.material.map=tex;mesh.material.vertexColors=false;mesh.material.needsUpdate=true;});
 return mesh;
}

export function createStarlinkWorld(host){
 const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'});let dpr=Math.min(devicePixelRatio||1,1.7);renderer.setPixelRatio(dpr);host.append(renderer.domElement);
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x020409);
 const camera=new THREE.PerspectiveCamera(46,1,.08,80);
 const post=createPost(renderer,scene,camera,{strength:.75,radius:.55,threshold:.95});scene.environmentIntensity=.12;
 const quality=adaptiveScale(dpr,{min:.7,apply(s){dpr=s;renderer.setPixelRatio(dpr);resize();}}),pointScale={value:400};
 scene.add(new THREE.HemisphereLight(0x9ec5ff,0x0a1218,.35));
 const sun=new THREE.DirectionalLight(0xfff1d6,3.2);sun.position.set(-6,3,4);scene.add(sun);
 const stars=new THREE.BufferGeometry(),n=700,sp=new Float32Array(n*3);
 for(let i=0;i<n;i++){const r=18+Math.random()*22,u=Math.random(),v=Math.random(),th=2*Math.PI*u,ph=Math.acos(2*v-1);sp[i*3]=r*Math.sin(ph)*Math.cos(th);sp[i*3+1]=r*Math.cos(ph);sp[i*3+2]=r*Math.sin(ph)*Math.sin(th);}
 stars.setAttribute('position',new THREE.BufferAttribute(sp,3));
 stars.setAttribute('aSize',new THREE.BufferAttribute(Float32Array.from({length:n},()=>.05+Math.pow(Math.random(),5)*.2),1));stars.setAttribute('aAlpha',new THREE.BufferAttribute(Float32Array.from({length:n},()=>.3+Math.random()*.7),1));
 const starPoints=new THREE.Points(stars,pointMaterial(pointScale,0xd7e6f5,1.3));starPoints.frustumCulled=false;scene.add(starPoints);

 const earth=makeEarth();scene.add(earth);
 const rimShader={uniforms:{uColor:{value:new THREE.Color(.25,.55,1.3)},uSun:{value:new THREE.Vector3(-6,3,4).normalize()}},vertexShader:'varying vec3 vN;varying vec3 vW;void main(){vN=normalize(normalMatrix*normal);vW=normalize((modelMatrix*vec4(position,0.)).xyz);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'uniform vec3 uColor;uniform vec3 uSun;varying vec3 vN;varying vec3 vW;void main(){float r=pow(1.-abs(vN.z),2.4);float day=.25+.75*smoothstep(-.3,.4,dot(vW,uSun));gl_FragColor=vec4(uColor*r*day,r*day);}',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending};
 scene.add(new THREE.Mesh(new THREE.SphereGeometry(2.46,64,48),new THREE.ShaderMaterial(rimShader)));

 const atmo=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({length:96},(_,i)=>{const a=i/96*Math.PI*2;return new THREE.Vector3(Math.cos(a)*2.35,0,Math.sin(a)*2.35);})),new THREE.LineBasicMaterial({color:0x6ee7c5,transparent:true,opacity:.18}));
 scene.add(atmo);

 let sats=buildConstellation(new Set(SHELLS.map(s=>s.id))),dummy=new THREE.Object3D(),tint=new THREE.Color();
 const MAX=600;
 const inst=new THREE.InstancedMesh(new THREE.BoxGeometry(.05,.016,.028),new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xffffff,emissiveIntensity:.55,metalness:.3,roughness:.4}),MAX);
 inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(inst);
 const wing=new THREE.InstancedMesh(new THREE.BoxGeometry(.12,.003,.036),new THREE.MeshStandardMaterial({color:0x2a4f86,metalness:.6,roughness:.3,emissive:0x0c2244,emissiveIntensity:.6}),MAX*2);
 wing.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(wing);

 const orbits=new THREE.Group();scene.add(orbits);
 function drawOrbits(enabled){
  while(orbits.children.length)orbits.remove(orbits.children[0]);
  for(const sh of SHELLS){
   if(enabled&&!enabled.has(sh.id))continue;
   const r=(R_EARTH+sh.alt)*SCALE;
   for(let p=0;p<Math.min(6,sh.planes);p++){
    const raan=p*2*Math.PI/sh.planes,pts=[];
    for(let k=0;k<=80;k++){
     const u=k/80*2*Math.PI;pts.push(v3(eci(sh.alt,sh.inc,raan,u)));
    }
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:sh.color,transparent:true,opacity:.22}));
    orbits.add(line);
   }
  }
 }
 const userMark=new THREE.Mesh(new THREE.SphereGeometry(.045,12,10),new THREE.MeshBasicMaterial({color:new THREE.Color(0xffc46a).multiplyScalar(2.5)}));scene.add(userMark);
 const dish=new THREE.Mesh(new THREE.ConeGeometry(.05,.07,8),new THREE.MeshStandardMaterial({color:0xf2f2ea,metalness:.4}));dish.rotation.x=Math.PI;scene.add(dish);
 const gates=GATEWAYS.map(g=>{const m=new THREE.Mesh(new THREE.BoxGeometry(.06,.08,.06),new THREE.MeshStandardMaterial({color:0x9ad0ff,emissive:0x3a7aad,emissiveIntensity:.5}));scene.add(m);return {g,m};});
 const pathLine=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:new THREE.Color(0xffe29a).multiplyScalar(2.2),transparent:true,opacity:.95}));scene.add(pathLine);
 const packet=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute([0,0,0],3)).setAttribute('aSize',new THREE.Float32BufferAttribute([.22],1)).setAttribute('aAlpha',new THREE.Float32BufferAttribute([1],1)),pointMaterial(pointScale,0xfff0c8,4));packet.frustumCulled=false;scene.add(packet);
 const satGlowGeo=new THREE.BufferGeometry(),satGlowPos=new Float32Array(MAX*3);satGlowGeo.setAttribute('position',new THREE.BufferAttribute(satGlowPos,3));satGlowGeo.setAttribute('aSize',new THREE.BufferAttribute(new Float32Array(MAX).fill(.07),1));satGlowGeo.setAttribute('aAlpha',new THREE.BufferAttribute(new Float32Array(MAX).fill(.7),1));
 const satGlow=new THREE.Points(satGlowGeo,pointMaterial(pointScale,0xcfe8ff,1.6));satGlow.frustumCulled=false;scene.add(satGlow);
 const footprint=new THREE.Mesh(new THREE.CircleGeometry(1,48),new THREE.MeshBasicMaterial({color:0x6ee7c5,transparent:true,opacity:.16,side:THREE.DoubleSide,depthWrite:false}));
 footprint.rotation.x=-Math.PI/2;scene.add(footprint);
 const coverDots=new THREE.InstancedMesh(new THREE.SphereGeometry(.018,6,6),new THREE.MeshBasicMaterial({color:0x6ee7c5,transparent:true,opacity:.55}),800);
 coverDots.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(coverDots);
 const beam=new THREE.Mesh(new THREE.CylinderGeometry(.004,.12,1,8,1,true),new THREE.MeshBasicMaterial({color:new THREE.Color(0xffe29a).multiplyScalar(1.6),transparent:true,opacity:.3,depthWrite:false,blending:THREE.AdditiveBlending}));scene.add(beam);

 let theta=1.05,phi=.28,dist=7.2,dragging=false,moved=0,lx=0,ly=0,clock=0,coverAt=-10,coverCache=null,onPlace=null;
 const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();
 function placeCam(){phi=Math.min(1.2,Math.max(-1.2,phi));dist=Math.min(16,Math.max(3.6,dist));camera.position.set(dist*Math.sin(theta)*Math.cos(phi),dist*Math.sin(phi),dist*Math.cos(theta)*Math.cos(phi));camera.lookAt(0,0,0);}
 function resize(){const w=host.clientWidth,h=Math.max(1,host.clientHeight);renderer.setSize(w,h);post.setSize(w,h,dpr);camera.aspect=w/h;camera.updateProjectionMatrix();pointScale.value=pointScaleFor(h,dpr,camera.fov);placeCam();}
 new ResizeObserver(resize).observe(host);resize();
 host.addEventListener('pointerdown',e=>{if(e.target!==renderer.domElement)return;dragging=true;moved=0;lx=e.clientX;ly=e.clientY;host.setPointerCapture(e.pointerId);});
 host.addEventListener('pointerup',e=>{
  if(dragging&&moved<6){
   const r=host.getBoundingClientRect();
   mouse.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);
   ray.setFromCamera(mouse,camera);
   const hit=ray.intersectObject(earth)[0];
   if(hit&&onPlace){
    const p=hit.point,lat=Math.asin(Math.min(1,Math.max(-1,p.y/2.35)))*180/Math.PI,lon=Math.atan2(-p.z,p.x)*180/Math.PI;
    onPlace(lat,lon);
   }
  }
  dragging=false;
 });
 host.addEventListener('pointermove',e=>{if(!dragging)return;moved+=Math.abs(e.clientX-lx)+Math.abs(e.clientY-ly);theta-=(e.clientX-lx)*0.005;phi+=(e.clientY-ly)*0.004;lx=e.clientX;ly=e.clientY;placeCam();});
 host.addEventListener('wheel',e=>{e.preventDefault();dist*=e.deltaY>0?1.08:.92;placeCam();},{passive:false});
 host.tabIndex=0;

 function setConstellation(enabled){sats=buildConstellation(enabled);drawOrbits(enabled);}
 drawOrbits(new Set(SHELLS.map(s=>s.id)));

 function render(state,dt){
  if(Number.isFinite(dt)&&dt>0&&state.playing)clock+=dt*state.speed;
  const pos=positionsAt(sats,clock);
  inst.count=Math.max(1,sats.length);wing.count=Math.max(1,sats.length*2);
  for(let i=0;i<sats.length;i++){
   const p=v3(pos[i]);dummy.position.copy(p);dummy.lookAt(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix);
   inst.setColorAt(i,tint.setHex(sats[i].color));
   dummy.position.copy(p);dummy.lookAt(0,0,0);dummy.rotateZ(.1);dummy.updateMatrix();wing.setMatrixAt(i*2,dummy.matrix);
   dummy.rotateZ(-.2);dummy.updateMatrix();wing.setMatrixAt(i*2+1,dummy.matrix);
   if(i<MAX){satGlowPos[i*3]=p.x;satGlowPos[i*3+1]=p.y;satGlowPos[i*3+2]=p.z;}
  }
  satGlowGeo.setDrawRange(0,Math.min(MAX,sats.length));satGlowGeo.attributes.position.needsUpdate=true;
  inst.instanceMatrix.needsUpdate=true;if(inst.instanceColor)inst.instanceColor.needsUpdate=true;wing.instanceMatrix.needsUpdate=true;
  const user=geodetic(state.lat,state.lon);userMark.position.copy(v3(user)).setLength(2.36);
  dish.position.copy(userMark.position);
  gates.forEach(({g,m})=>m.position.copy(v3(geodetic(g.lat,g.lon))).multiplyScalar(1.02));
  const route=routePacket(user,sats,pos,state.lasers);
  if(route.hops.length>1){
   pathLine.geometry.setFromPoints(route.hops.map(h=>v3(h.p)));
   pathLine.visible=true;
   const u=(clock*0.15)%1,a=Math.floor(u*(route.hops.length-1)),f=u*(route.hops.length-1)-a,h0=v3(route.hops[a].p),h1=v3(route.hops[Math.min(a+1,route.hops.length-1)].p);
   packet.position.lerpVectors(h0,h1,f);packet.visible=true;
   if(route.serve!=null){
    const sat=v3(pos[route.serve]),ground=userMark.position,mid=sat.clone().add(ground).multiplyScalar(.5),len=sat.distanceTo(ground);
    beam.position.copy(mid);beam.scale.set(1,len,1);beam.lookAt(sat);beam.rotateX(Math.PI/2);beam.visible=true;
    dish.lookAt(sat);
    footprint.position.copy(ground);footprint.lookAt(0,0,0);footprint.scale.setScalar(.45);footprint.visible=true;
   }
  }else{pathLine.visible=false;packet.visible=false;beam.visible=false;footprint.visible=false;}
  if(state.showCoverage){
   if(clock-coverAt>.45||!coverCache){coverCache=coverageGrid(sats,pos,18);coverAt=clock;}
   const grid=coverCache;coverDots.visible=true;coverDots.count=Math.max(1,grid.cells.length);
   grid.cells.forEach((c,i)=>{const p=v3(geodetic(c.lat,c.lon));dummy.position.copy(p).setLength(2.37);dummy.scale.setScalar(c.n?1+Math.min(3,c.n)*.15:.4);dummy.updateMatrix();coverDots.setMatrixAt(i,dummy.matrix);});
   coverDots.instanceMatrix.needsUpdate=true;
  }else coverDots.visible=false;
  earth.rotation.y=state.spin?clock*0.02:0;
  placeCam();post.render(dt||0);quality.frame(dt||0);
  return {route,count:sats.length,pos};
 }
 return {render,setConstellation,setOnPlace(fn){onPlace=fn;},zoomBy(f){dist/=f;placeCam();},fit(){theta=1.05;phi=.28;dist=7.2;placeCam();}};
}
