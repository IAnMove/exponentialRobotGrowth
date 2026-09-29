import * as THREE from '../../vendor/three.module.js';
import {createPost,adaptiveScale} from '../fx/fx.js';
import {R_EARTH,SHELLS,GATEWAYS,geodetic,eci,buildConstellation,positionsAt,routePacket,refreshRoute,coverageGrid,footprintHalfAngle} from './model.js';
const SCALE=2.35/R_EARTH;
const v3=p=>new THREE.Vector3(p.x*SCALE,p.z*SCALE,-p.y*SCALE);
const GOLD=0xffcb76,MINT=0x75eed6;
function label(text,color='#d8edf7',width=2.4){
 const c=document.createElement('canvas');c.width=640;c.height=128;const x=c.getContext('2d');
 x.fillStyle='rgba(3,13,25,.85)';x.roundRect(4,4,632,120,22);x.fill();x.fillStyle=color;x.font='500 48px system-ui';x.textAlign='center';x.fillText(text,320,79,580);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
 const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthTest:false,transparent:true}));s.scale.set(width,width*.2,1);return s;
}
function satellite(){
 const g=new THREE.Group(),metal=new THREE.MeshStandardMaterial({color:0xc3cdd5,metalness:.72,roughness:.28}),gold=new THREE.MeshStandardMaterial({color:0xd3a64b,metalness:.65,roughness:.38});
 const box=(w,h,d,m,x=0,y=0,z=0)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);g.add(o);return o;};
 box(1.65,.22,.95,metal);box(1.72,.04,1.02,gold,0,-.12);
 const c=document.createElement('canvas');c.width=512;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#102a54';ctx.fillRect(0,0,512,256);ctx.strokeStyle='#638abe';ctx.lineWidth=3;
 for(let x=0;x<=512;x+=32){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,256);ctx.stroke();}for(let y=0;y<=256;y+=32){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(512,y);ctx.stroke();}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const solar=new THREE.MeshStandardMaterial({map:t,color:0x8cadd8,metalness:.35,roughness:.3,emissive:0x133b69,emissiveIntensity:.25});
 for(const sign of [-1,1]){box(3.1,.035,1.65,solar,sign*2.54,.02);box(.42,.055,.08,metal,sign*.99,.02);for(let z=-.6;z<=.6;z+=.3)box(.11,.06,.1,gold,sign*.76,-.2,z);}
 const face=new THREE.MeshStandardMaterial({color:0xeeeae0,metalness:.12,roughness:.58});for(let x=-.54;x<=.54;x+=.54)box(.43,.045,.62,face,x,-.155);
 for(const x of [-.78,.78])for(const z of [-.39,.39]){const o=new THREE.Mesh(new THREE.CylinderGeometry(.105,.12,.12,20),metal);o.rotation.x=Math.PI/2;o.position.set(x,0,z);g.add(o);const lens=new THREE.Mesh(new THREE.CircleGeometry(.078,20),new THREE.MeshBasicMaterial({color:0x63d6ea}));lens.position.set(x,0,z+(z>0?.067:-.067));lens.rotation.y=z>0?0:Math.PI;g.add(lens);}
 const thruster=new THREE.Mesh(new THREE.ConeGeometry(.09,.17,16,1,true),gold);thruster.rotation.z=Math.PI/2;thruster.position.set(.92,.02,0);g.add(thruster);return g;
}
function cap(radius,angle){
 const geo=new THREE.BufferGeometry(),points=[0,radius,0],indices=[];const rings=10,segments=64;
 for(let r=1;r<=rings;r++){const a=angle*r/rings;for(let j=0;j<segments;j++){const th=j/segments*Math.PI*2;points.push(radius*Math.sin(a)*Math.cos(th),radius*Math.cos(a),radius*Math.sin(a)*Math.sin(th));}}
 for(let j=0;j<segments;j++)indices.push(0,1+j,1+(j+1)%segments);
 for(let r=1;r<rings;r++)for(let j=0;j<segments;j++){const a=1+(r-1)*segments+j,b=1+(r-1)*segments+(j+1)%segments,c=1+r*segments+j,d=1+r*segments+(j+1)%segments;indices.push(a,c,b,b,c,d);}
 geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geo.setIndex(indices);geo.computeVertexNormals();return geo;
}
export function createStarlinkWorld(host){
 const es=document.documentElement.lang==='es',renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'});let dpr=Math.min(devicePixelRatio||1,1.7);renderer.setPixelRatio(dpr);host.append(renderer.domElement);
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x030b16);const camera=new THREE.PerspectiveCamera(43,1,.04,100);
 const post=createPost(renderer,scene,camera,{strength:.34,radius:.45,threshold:1.15});renderer.toneMappingExposure=1.18;scene.environmentIntensity=.25;
 const quality=adaptiveScale(dpr,{min:.75,apply(s){dpr=s;renderer.setPixelRatio(dpr);resize();}});
 scene.add(new THREE.HemisphereLight(0xc5ddff,0x111d2d,1.1));const sun=new THREE.DirectionalLight(0xfff0da,3.4);sun.position.set(8,4,10);scene.add(sun);const fill=new THREE.DirectionalLight(0x5298ee,.6);fill.position.set(-7,2,-5);scene.add(fill);
 const globe=new THREE.Group();scene.add(globe);
 const earth=new THREE.Mesh(new THREE.SphereGeometry(2.35,96,64),new THREE.MeshStandardMaterial({color:0x719bbe,roughness:.86,metalness:0}));globe.add(earth);
 new THREE.TextureLoader().load('../kardashev/earth-blue-marble.jpg',tex=>{tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;earth.material.map=tex;earth.material.color.setHex(0xffffff);earth.material.needsUpdate=true;});
 // Clamp the Fresnel base: negative round-off raised to a fractional power poisons HDR bloom.
 const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(2.4,64,48),new THREE.ShaderMaterial({uniforms:{sun:{value:sun.position.clone().normalize()}},vertexShader:'varying vec3 n;varying vec3 view;varying vec3 world;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);n=normalMatrix*normal;view=-mv.xyz;world=(modelMatrix*vec4(normal,0.)).xyz;gl_Position=projectionMatrix*mv;}',fragmentShader:'uniform vec3 sun;varying vec3 n;varying vec3 view;varying vec3 world;void main(){float rim=pow(clamp(1.-abs(dot(normalize(n),normalize(view))),0.,1.),2.5);float day=.35+.65*smoothstep(-.3,.4,dot(normalize(world),sun));gl_FragColor=vec4(vec3(.10,.45,.9)*rim*day,rim*day*.65);}',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));globe.add(atmosphere);
 const stars=new THREE.BufferGeometry(),sp=new Float32Array(400*3);for(let i=0;i<400;i++){const th=i*2.39996,z=1-2*(i+.5)/400,r=Math.sqrt(1-z*z);sp[i*3]=30*r*Math.cos(th);sp[i*3+1]=30*z;sp[i*3+2]=30*r*Math.sin(th);}stars.setAttribute('position',new THREE.BufferAttribute(sp,3));scene.add(new THREE.Points(stars,new THREE.PointsMaterial({size:.045,color:0x98b5cb,transparent:true,opacity:.65})));
 const MAX=600,bodyGeo=new THREE.BoxGeometry(.05,.011,.027),wingGeo=new THREE.BoxGeometry(.065,.0025,.035),bus=new THREE.InstancedMesh(bodyGeo,new THREE.MeshStandardMaterial({color:0xc7d2df,metalness:.4,roughness:.4}),MAX),wings=new THREE.InstancedMesh(wingGeo,new THREE.MeshStandardMaterial({color:0x265080,metalness:.35,roughness:.4}),MAX*2);globe.add(bus,wings);bus.frustumCulled=wings.frustumCulled=false;bus.instanceMatrix.setUsage(THREE.DynamicDrawUsage);wings.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
 const orbits=new THREE.Group();globe.add(orbits);
 const user=new THREE.Mesh(new THREE.SphereGeometry(.04,16,12),new THREE.MeshBasicMaterial({color:GOLD}));globe.add(user);
 const userLabel=label(es?'TU ANTENA':'YOUR TERMINAL','#ffdb93',1.25);globe.add(userLabel);
 const gateways=GATEWAYS.map(g=>{const m=new THREE.Mesh(new THREE.OctahedronGeometry(.042),new THREE.MeshBasicMaterial({color:0x69b7ff}));m.position.copy(v3(geodetic(g.lat,g.lon))).setLength(2.37);globe.add(m);return {g,m};});
 const gateLabel=label(es?'PASARELA':'GATEWAY','#91c9ff',1.25),satLabel=label(es?'SATÉLITE ACTIVO':'SERVING SATELLITE','#ffdb93',1.55);globe.add(gateLabel,satLabel);
 const paths=new THREE.Group();globe.add(paths);const lines=Array.from({length:20},()=>{const l=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:GOLD,transparent:true,opacity:.9}));paths.add(l);return l;});
 const servingHalo=new THREE.Mesh(new THREE.RingGeometry(.055,.082,32),new THREE.MeshBasicMaterial({color:GOLD,side:THREE.DoubleSide,transparent:true,opacity:.8}));globe.add(servingHalo);
 const packet=new THREE.Mesh(new THREE.SphereGeometry(.027,12,10),new THREE.MeshBasicMaterial({color:GOLD}));globe.add(packet);
 const footprint=new THREE.Mesh(cap(2.362,footprintHalfAngle(480)),new THREE.MeshBasicMaterial({color:0x64ddc0,transparent:true,opacity:.12,side:THREE.DoubleSide,depthWrite:false}));globe.add(footprint);let footprintAlt=480;
 const cover=new THREE.InstancedMesh(new THREE.SphereGeometry(.014,6,6),new THREE.MeshBasicMaterial({color:MINT,transparent:true,opacity:.68}),1000);cover.instanceMatrix.setUsage(THREE.DynamicDrawUsage);cover.frustumCulled=false;globe.add(cover);
 const detail=new THREE.Group();scene.add(detail);detail.add(satellite());const panels=label(es?'PANELES SOLARES · ENERGÍA':'SOLAR ARRAYS · POWER','#95c4ff',2.65);panels.position.set(-2.4,1.1,0);detail.add(panels);const antenna=label(es?'ANTENAS · RADIO CON TIERRA':'ANTENNAS · RADIO TO EARTH','#ffdb93',2.65);antenna.position.set(0,-1.2,0);detail.add(antenna);const optical=label(es?'TERMINALES ÓPTICOS · LÁSER':'OPTICAL TERMINALS · LASER','#80ead5',2.65);optical.position.set(1.6,1.45,0);detail.add(optical);
 const groundScene=new THREE.Group();scene.add(groundScene);
 const floor=new THREE.Mesh(new THREE.BoxGeometry(10,.12,3.2),new THREE.MeshStandardMaterial({color:0x101f31,metalness:.25,roughness:.6}));floor.position.y=-.65;groundScene.add(floor);
 const grid=new THREE.GridHelper(10,25,0x2d5570,0x1b334d);grid.position.y=-.58;groundScene.add(grid);
 const metal=new THREE.MeshStandardMaterial({color:0xd0dbe4,metalness:.55,roughness:.35}),dark=new THREE.MeshStandardMaterial({color:0x263a50,metalness:.55,roughness:.35});
 for(const x of [-4.1,-3.25]){
  const mast=new THREE.Mesh(new THREE.CylinderGeometry(.055,.12,.8,16),metal);mast.position.set(x,-.18,0);groundScene.add(mast);
  const profile=Array.from({length:17},(_,i)=>{const r=i/16*.52;return new THREE.Vector2(r,r*r*.55);});const dish=new THREE.Mesh(new THREE.LatheGeometry(profile,48),metal);dish.material=metal.clone();dish.material.side=THREE.DoubleSide;dish.position.set(x,.24,0);dish.rotation.z=.25;groundScene.add(dish);
  const feeder=new THREE.Mesh(new THREE.CylinderGeometry(.016,.016,.45,8),dark);feeder.position.set(x,.55,0);groundScene.add(feeder);
 }
 function rack(x,z,color){const body=new THREE.Mesh(new THREE.BoxGeometry(.63,1.6,.64),dark);body.position.set(x,.22,z);groundScene.add(body);for(let j=0;j<9;j++){const slot=new THREE.Mesh(new THREE.BoxGeometry(.54,.115,.025),new THREE.MeshStandardMaterial({color:0x43576a,metalness:.4,roughness:.45}));slot.position.set(x,-.38+j*.16,z+.335);groundScene.add(slot);for(let k=0;k<3;k++){const led=new THREE.Mesh(new THREE.BoxGeometry(.019,.018,.02),new THREE.MeshBasicMaterial({color}));led.position.set(x-.18+k*.05,-.38+j*.16,z+.352);groundScene.add(led);}}}
 rack(-.35,0,0x6cdbef);rack(.4,-.2,0x6cdbef);rack(3.3,.03,0x83edc9);rack(4.04,-.2,0x83edc9);
 const groundLabels=[{x:-3.65,txt:es?'PASARELA · RADIO':'GATEWAY · RADIO'},{x:0,txt:es?'PoP · CONEXIÓN A INTERNET':'PoP · INTERNET CONNECTION'},{x:3.65,txt:es?'SERVIDOR · RESPUESTA':'SERVER · REPLY'}];for(const q of groundLabels){const s=label(q.txt,'#c5e0ef',3.1);s.position.set(q.x,1.65,0);groundScene.add(s);}
 const groundCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(-3.65,.65,0),new THREE.Vector3(-1.9,.08,.75),new THREE.Vector3(0,.65,0),new THREE.Vector3(1.85,.08,.75),new THREE.Vector3(3.65,.65,0)]);
 groundScene.add(new THREE.Mesh(new THREE.TubeGeometry(groundCurve,96,.018,8,false),new THREE.MeshBasicMaterial({color:0x458aba})));
 const groundPacket=new THREE.Mesh(new THREE.SphereGeometry(.065,16,12),new THREE.MeshBasicMaterial({color:GOLD}));groundScene.add(groundPacket);
 let sats=buildConstellation(),theta=.3,phi=.3,dist=8.3,dragging=false,moved=0,lx=0,ly=0,clock=0,route=null,routeAt=-100,routeKey='',coverAt=-100,coverCache=null,onPlace=null,view='globe';const dummy=new THREE.Object3D(),up=new THREE.Vector3(0,1,0),ray=new THREE.Raycaster(),mouse=new THREE.Vector2();
 function drawOrbits(enabled){while(orbits.children.length){const o=orbits.children.pop();o.geometry.dispose();o.material.dispose();}for(const sh of SHELLS){if(enabled&&!enabled.has(sh.id))continue;for(let k=0;k<Math.min(3,sh.planes);k++){const p=Math.floor(k*sh.planes/3),pts=Array.from({length:129},(_,i)=>v3(eci(sh.alt,sh.inc,p*2*Math.PI/sh.planes,i/128*2*Math.PI)));orbits.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:sh.color,transparent:true,opacity:.12})));}}}
 function placeCam(){phi=THREE.MathUtils.clamp(phi,-1.3,1.3);dist=THREE.MathUtils.clamp(dist,view==='satellite'?3.8:3.1,20);camera.position.set(dist*Math.sin(theta)*Math.cos(phi),dist*Math.sin(phi),dist*Math.cos(theta)*Math.cos(phi));camera.lookAt(0,0,0);}
 function resize(){const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h);post.setSize(w,h,dpr);camera.aspect=w/h;camera.updateProjectionMatrix();placeCam();}
 const observer=new ResizeObserver(resize);observer.observe(host);resize();drawOrbits();
 host.addEventListener('pointerdown',e=>{if(e.target!==renderer.domElement)return;dragging=true;moved=0;lx=e.clientX;ly=e.clientY;host.setPointerCapture(e.pointerId);});
 host.addEventListener('pointermove',e=>{if(!dragging)return;const dx=e.clientX-lx,dy=e.clientY-ly;moved+=Math.abs(dx)+Math.abs(dy);theta-=dx*.005;phi+=dy*.004;lx=e.clientX;ly=e.clientY;placeCam();});
 host.addEventListener('pointerup',e=>{if(dragging&&moved<6&&view==='globe'){const r=host.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);ray.setFromCamera(mouse,camera);const hit=ray.intersectObject(earth)[0];if(hit&&onPlace)onPlace(Math.asin(hit.point.y/2.35)*180/Math.PI,Math.atan2(-hit.point.z,hit.point.x)*180/Math.PI);}dragging=false;});
 host.addEventListener('pointercancel',()=>dragging=false);host.addEventListener('wheel',e=>{e.preventDefault();dist*=e.deltaY>0?1.06:.94;placeCam();},{passive:false});
 host.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();theta+=(e.key==='ArrowRight'?.09:e.key==='ArrowLeft'?-.09:0);phi+=(e.key==='ArrowUp'?.07:e.key==='ArrowDown'?-.07:0);placeCam();}});host.tabIndex=0;
 function setConstellation(enabled){sats=buildConstellation(enabled);drawOrbits(enabled);routeAt=coverAt=-100;routeKey='';coverCache=null;}
 function focus(lat,lon){const p=v3(geodetic(lat,lon)).normalize();theta=Math.atan2(p.x,p.z);phi=Math.asin(p.y);placeCam();}
 function render(state,dt){
  if(state.time!=null)clock=state.time;else if(Number.isFinite(dt)&&dt>0&&state.playing)clock+=dt*(state.speed||40);
  const nextView=state.view||'globe';if(nextView!==view){view=nextView;theta=view==='satellite'?.5:view==='ground'?.12:.3;phi=view==='satellite'?-.38:view==='ground'?.28:.3;dist=view==='satellite'?8:view==='ground'?10.8:8.3;if(view==='globe')focus(state.lat,state.lon);}
  globe.visible=view==='globe';detail.visible=view==='satellite';groundScene.visible=view==='ground';detail.rotation.y=state.playing&&view==='satellite'?clock*.0002:0;
  const pos=positionsAt(sats,clock);bus.count=sats.length;wings.count=sats.length*2;
  for(let i=0;i<sats.length;i++){const p=v3(pos[i]);dummy.position.copy(p);dummy.quaternion.setFromUnitVectors(up,p.clone().normalize());dummy.scale.setScalar(1);dummy.updateMatrix();bus.setMatrixAt(i,dummy.matrix);for(let k=0;k<2;k++){dummy.position.copy(p).add(new THREE.Vector3((k?1:-1)*.064,0,0).applyQuaternion(dummy.quaternion));dummy.updateMatrix();wings.setMatrixAt(i*2+k,dummy.matrix);}}
  bus.instanceMatrix.needsUpdate=true;wings.instanceMatrix.needsUpdate=true;
  const ground=geodetic(state.lat,state.lon),key=[state.lat,state.lon,state.lasers,sats.length].join(':');
  if(!route||key!==routeKey||Math.abs(clock-routeAt)>=20){route=routePacket(ground,sats,pos,state.lasers);routeKey=key;routeAt=clock;}
  const current=refreshRoute(route,ground,sats,pos);if(!current){route=routePacket(ground,sats,pos,state.lasers);routeAt=clock;}else route=current;
  const hops=route.hops;
  user.position.copy(v3(ground)).setLength(2.375);userLabel.position.copy(user.position).multiplyScalar(1.13);userLabel.visible=[0,5].includes(state.phase)&&user.position.dot(camera.position)>2.35*2.35;
  if(route.serve!=null){satLabel.position.copy(v3(pos[route.serve])).multiplyScalar(1.17);satLabel.visible=[1,2].includes(state.phase)&&satLabel.position.dot(camera.position)>2.35*2.35;}else satLabel.visible=false;
  const gw=hops.find(h=>h.kind==='gateway');gateLabel.visible=!!gw&&state.phase===3;if(gw){gateLabel.position.copy(v3(gw.p)).multiplyScalar(1.16);gateLabel.visible=state.phase===3&&gateLabel.position.dot(camera.position)>2.35*2.35;}
  servingHalo.visible=route.serve!=null;if(servingHalo.visible){servingHalo.position.copy(v3(pos[route.serve]));servingHalo.quaternion.copy(camera.quaternion);}
  const phase=state.phase||0,progress=state.progress==null?(clock%100)/100:state.progress,returning=phase===5;
  let visibleHops=phase===0?Math.min(2,hops.length):hops.length;
  for(let i=0;i<lines.length;i++){const l=lines[i];l.visible=i<visibleHops-1;if(l.visible){l.geometry.setFromPoints([v3(hops[i].p),v3(hops[i+1].p)]);l.material.color.setHex(returning?MINT:hops[i+1].kind==='laser'?GOLD:0x89caff);l.material.opacity=route.ok?.92:.35;}}
  packet.visible=hops.length>1;if(packet.visible){const u=(returning?1-progress:progress)*(visibleHops-1),a=Math.min(visibleHops-2,Math.max(0,Math.floor(u))),f=THREE.MathUtils.clamp(u-a,0,1);packet.position.lerpVectors(v3(hops[a].p),v3(hops[a+1].p),f);packet.material.color.setHex(returning?MINT:GOLD);}
  footprint.visible=route.serve!=null&&state.showFootprint!==false;if(footprint.visible){const alt=sats[route.serve].alt;if(alt!==footprintAlt){footprint.geometry.dispose();footprint.geometry=cap(2.362,footprintHalfAngle(alt));footprintAlt=alt;}footprint.quaternion.setFromUnitVectors(up,v3(pos[route.serve]).normalize());}
  cover.visible=!!state.showCoverage;if(cover.visible){if(!coverCache||Math.abs(clock-coverAt)>45){coverCache=coverageGrid(sats,pos,15);coverAt=clock;}cover.count=coverCache.cells.filter(c=>c.n).length;let i=0;for(const c of coverCache.cells)if(c.n){dummy.position.copy(v3(geodetic(c.lat,c.lon))).setLength(2.365);dummy.scale.setScalar(1);dummy.updateMatrix();cover.setMatrixAt(i++,dummy.matrix);}cover.instanceMatrix.needsUpdate=true;}
  groundPacket.visible=view==='ground'&&route.ok;groundPacket.position.copy(groundCurve.getPoint(THREE.MathUtils.clamp(returning?1-progress:progress,0,1)));groundPacket.material.color.setHex(returning?MINT:GOLD);
  placeCam();post.render(dt||0);quality.frame(dt||0);return {route,count:sats.length,pos,clock};
 }
 return {render,setConstellation,setOnPlace(fn){onPlace=fn;},zoomBy(f){dist/=f;placeCam();},focus,fit(){theta=view==='ground'?.12:.3;phi=view==='satellite'?-.38:view==='ground'?.28:.3;dist=view==='satellite'?8:view==='ground'?10.8:8.3;placeCam();},dispose(){observer.disconnect();renderer.dispose();post.dispose();}};
}
