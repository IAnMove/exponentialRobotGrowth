import * as THREE from '../vendor/three.module.js';
import {STAGES,PLACES,geoPoint,greatCircle} from './internet-route.js';
const GOLD=0xffc66c,MINT=0x76f6c4,CYAN=0x6ccfff;
const V=p=>new THREE.Vector3(...p);

export function createVoyageScene(es=true,{textures=true}={}){
 const scene=new THREE.Scene(),resources=[],groups={},paths=[],labels=[],animated=[],materials=new Map();
 const own=r=>(resources.push(r),r),t=(a,b)=>es?a:b;
 scene.background=new THREE.Color(0x030c17);
 scene.add(new THREE.HemisphereLight(0xbbe7ff,0x17202f,2));
 const sun=new THREE.DirectionalLight(0xffe5c3,3.5);sun.position.set(12,18,14);scene.add(sun);
 const rim=new THREE.DirectionalLight(0x43a6ff,2);rim.position.set(-10,8,-12);scene.add(rim);
 const mat=(color,glow=0,roughness=.45)=>{const key=[color,glow,roughness].join();if(!materials.has(key))materials.set(key,own(new THREE.MeshStandardMaterial({color,roughness,metalness:.35,emissive:color,emissiveIntensity:glow})));return materials.get(key);};
 const boxGeo=own(new THREE.BoxGeometry(1,1,1)),ballGeo=own(new THREE.SphereGeometry(1,20,12));
 function box(g,p,s,c,glow=0){const m=new THREE.Mesh(boxGeo,mat(c,glow));m.position.set(...p);m.scale.set(...s);g.add(m);return m;}
 function ball(g,p,r,c,glow=0){const m=new THREE.Mesh(ballGeo,mat(c,glow));m.position.set(...p);m.scale.setScalar(r);g.add(m);return m;}
 function cylinder(g,p,r,h,c){const m=new THREE.Mesh(own(new THREE.CylinderGeometry(r,r,h,24)),mat(c));m.position.set(...p);g.add(m);return m;}
 function group(name){const g=new THREE.Group();g.name=name;scene.add(g);groups[name]=g;return g;}
 function line(g,points,color=0x365468,width=.024){const curve=new THREE.CatmullRomCurve3(points.map(V));const m=new THREE.Mesh(own(new THREE.TubeGeometry(curve,Math.max(32,points.length*2),width,6,false)),mat(color,.5));g.add(m);return curve;}
 let glowTexture;
 if(textures){const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d'),gradient=ctx.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'#fff');gradient.addColorStop(.2,'#ffffffa0');gradient.addColorStop(1,'#ffffff00');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);glowTexture=own(new THREE.CanvasTexture(c));}
 function glow(g,p,color,size){if(!glowTexture)return;const m=new THREE.Sprite(own(new THREE.SpriteMaterial({map:glowTexture,color,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false})));m.position.set(...p);m.scale.set(size,size,1);g.add(m);return m;}
 function label(g,words,p,w=3,color='#cfe8f3'){
  if(!textures)return;
  const c=document.createElement('canvas'),ctx=c.getContext('2d');ctx.font='600 36px system-ui';c.width=Math.ceil(ctx.measureText(words).width+36);c.height=70;ctx.font='600 36px system-ui';ctx.fillStyle='rgba(3,12,23,.8)';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(words,c.width/2,35);
  const tex=own(new THREE.CanvasTexture(c));tex.colorSpace=THREE.SRGBColorSpace;
  const m=new THREE.Sprite(own(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false})));m.position.set(...p);m.scale.set(w,w*70/c.width,1);g.add(m);labels.push(m);return m;
 }
 function stream(g,points,{color=GOLD,radius=.06,count=6,speed=.14,reverse=false,stages=[]}={}){
  const curve=line(g,points,0x46627a,radius*.35),mesh=line(g,points,color,radius*.22); // Visible physical/carto corridor beneath pulses.
  const signalMaterial=own(new THREE.MeshBasicMaterial({color,toneMapped:false}));
  const particles=Array.from({length:count},()=>{const b=ball(g,[0,0,0],radius,color);b.material=signalMaterial;glow(b,[0,0,0],color,5);return b;});
  const path={group:g,curve,mesh,particles,speed,reverse,stages};paths.push(path);return path;
 }
 function floor(g,w,d,color=0x152837){box(g,[0,-.19,0],[w,.3,d],color);const grid=new THREE.GridHelper(w,Math.round(w/2),0x294353,0x1c3544);grid.position.y=-.029;g.add(grid);own(grid.geometry);own(grid.material);}
 function rack(g,p,{selected=false,height=3.8}={}){
  const r=new THREE.Group();r.position.set(...p);g.add(r);
  box(r,[0,height/2,0],[1.45,height,1.45],0x0a1721);
  for(const x of [-.72,.72])box(r,[x,height/2,.76],[.06,height,.05],0x557384);
  for(let i=0;i<11;i++){const y=.25+i*(height-.5)/11;box(r,[0,y,.765],[1.28,.20,.07],0x243745);for(let n=0;n<3;n++)box(r,[-.5+n*.16,y,.813],[.045,.035,.016],(i+n)%3===0?MINT:CYAN,.9);for(let n=0;n<4;n++)box(r,[.13+n*.115,y,.81],[.07,.015,.014],0x82949b);}
  if(selected){box(r,[0,1.8,.85],[1.33,.26,.09],GOLD,.5);glow(r,[0,1.8,1],GOLD,2.4);}
  return r;
 }
 // Home and access network: one continuous scene, with a pull-back from the desk.
 const city=group('city');floor(city,46,46,0x102331);
 box(city,[0,.04,0],[7,.14,6],0x38505d);
 box(city,[-3.4,1.6,-1],[.12,3.2,4],0x436170);
 box(city,[0,1.6,-2.95],[7,3.2,.12],0x314b61);
 box(city,[.6,1.8,-2.85],[3,1.3,.06],0x09213a);box(city,[.6,1.8,-2.79],[.045,1.3,.04],0x5c859b);
 box(city,[0,1,0],[3.6,.15,1.7],0xbda27b);for(const x of [-1.6,1.6])for(const z of [-.65,.65])box(city,[x,.45,z],[.1,.9,.1],0x34404c);
 box(city,[0,1.13,.05],[1.5,.08,1.06],0x879aa9);
 const lid=box(city,[0,1.71,-.44],[1.55,1.1,.065],0x374e61);lid.rotation.x=-.12;
 const screen=box(city,[0,1.72,-.38],[1.39,.92,.02],0x132537,.5);screen.rotation.x=-.12;
 // Screen content is constructed in 3D so receiving the response visibly changes it.
 const browser=new THREE.Group();browser.position.set(0,1.72,-.35);browser.rotation.x=-.12;city.add(browser);
 box(browser,[0,.35,0],[1.28,.08,.013],0x57758a);
 label(city,'atlas.example',[0,2.55,-.1],2.5);
 const responseTiles=[];
 for(let i=0;i<4;i++){const b=box(browser,[-.34+(i%2)*.68,.1-Math.floor(i/2)*.3,.018],[.55,.23,.014],i===0?MINT:0x4693b4,.5);responseTiles.push(b);}
 for(let i=0;i<9;i++)for(let j=0;j<3;j++)box(city,[-.61+i*.15,1.181,-.05+j*.15],[.1,.008,.09],0x273f51);
 box(city,[2.4,.75,-.2],[.9,1.5,.8],0x273e50);box(city,[2.4,1.55,-.2],[.8,.12,.58],0xc6d4d8);
 for(const x of [2.1,2.7]){const a=cylinder(city,[x,1.84,-.4],.025,.5,0xaac7dc);a.rotation.z=x<2.4?-.18:.18;}
 for(let j=0;j<3;j++)ball(city,[2.2+j*.15,1.57,.10],.024,MINT,2);
 label(city,t('Router + ONT','Router + ONT'),[2.7,2.45,-.4],2.1);
 // Street plan: stylised miniatures, deliberately not a survey of Madrid.
 box(city,[0,-.015,-8],[40,.012,3],0x273e4d);box(city,[8,-.01,-4],[3,.012,30],0x273e4d);
 for(let x=-18;x<20;x+=3)box(city,[x,.003,-8],[1,.007,.05],0xc2b893);
 const buildings=[];
 for(let row=0;row<2;row++)for(let i=0;i<9;i++){
  const x=-17+i*4,z=-13-row*6,h=1.4+((i*7+row*3)%6)*.7;
  box(city,[x,h/2,z],[2.7,h,3],i%2?0x365169:0x283f54);box(city,[x,h+.07,z],[2.85,.12,3.1],0x4b6375);
  for(let f=0;f<Math.floor(h/.6);f++)for(let w=0;w<3;w++)box(city,[x-.8+w*.8,.5+f*.6,z+1.51],[.3,.28,.01],(i+f+w)%3?0x4d8eab:0xefcb84,.6);
  buildings.push([x,z]);
 }
 box(city,[6,.85,-5],[1.2,1.7,.65],0x66828b);label(city,t('Acceso óptico','Optical access'),[6,2.4,-5],3);
 box(city,[-8,1.1,-10],[5,2.2,3],0x294354);box(city,[-8,2.25,-10],[5.15,.12,3.15],0x5b7183);label(city,t('Red del operador','Operator network'),[-8,3,-10],4);
 stream(city,[[0,1.6,-.3],[1.1,1.9,.1],[2.4,1.65,-.2],[3,.15,0],[6,.15,-3],[6,.6,-5],[6,.15,-8],[-8,.15,-8],[-8,1,-10]],{stages:[0,1],radius:.06,count:8,speed:.12});
 stream(city,[[-8,1,-10],[-8,.15,-8],[6,.15,-8],[6,.6,-5],[6,.15,-3],[3,.15,0],[2.4,1.65,-.2],[1.1,1.9,.1],[0,1.6,-.3]],{stages:[8],color:MINT,count:10});
 // True Earth texture + geographically anchored endpoints; displayed curves are corridors.
 const earth=group('earth');const earthMaterial=own(new THREE.MeshStandardMaterial({color:0x99bed9,roughness:1,metalness:0}));
 if(textures)new THREE.TextureLoader().load('../kardashev/earth-blue-marble.jpg',texture=>{own(texture);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;earthMaterial.map=texture;earthMaterial.color.set(0xffffff);earthMaterial.needsUpdate=true;},undefined,()=>{earthMaterial.color.set(0x143a61);});
 const globe=new THREE.Mesh(own(new THREE.SphereGeometry(10,96,64)),earthMaterial);globe.rotation.y=-Math.PI/2;earth.add(globe);
 const atmosphere=new THREE.Mesh(own(new THREE.SphereGeometry(10.15,64,40)),own(new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.BackSide,blending:THREE.AdditiveBlending,vertexShader:'varying vec3 n; varying vec3 v; void main(){vec4 p=modelViewMatrix*vec4(position,1.); n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',fragmentShader:'varying vec3 n; varying vec3 v; void main(){float a=pow(1.0-abs(dot(normalize(n),normalize(v))),3.0); gl_FragColor=vec4(.16,.55,1.,a*.6);}'})));earth.add(atmosphere);
 const starPositions=[];for(let i=0;i<1000;i++){const a=i*2.39996,y=1-2*(i+.5)/1000,r=Math.sqrt(1-y*y);starPositions.push(100*r*Math.cos(a),100*y,100*r*Math.sin(a));}
 const starGeo=own(new THREE.BufferGeometry());starGeo.setAttribute('position',new THREE.Float32BufferAttribute(starPositions,3));scene.add(new THREE.Points(starGeo,own(new THREE.PointsMaterial({color:0xa8c9e3,size:.12,sizeAttenuation:true}))));
 const pins={};for(const [key,place] of Object.entries(PLACES)){const p=geoPoint(place,10.1);pins[key]=ball(earth,p,.055,MINT,2);glow(earth,p,MINT,.8);}
 // Keep nearby endpoint labels legible by using leader lines to separated nameplates.
 const nameplates={madrid:[-1,5.65,10],sopelana:[1.25,8,8.4],virginia:[-11,4.8,2.9],ashburn:[-9.5,8.5,1.2]};
 const geoLabels={};
 for(const [key,p] of Object.entries(nameplates)){const g=new THREE.Group();earth.add(g);geoLabels[key]=g;line(g,[geoPoint(PLACES[key],10.1),p],0x7fabbc,.015);label(g,PLACES[key].name,p,key==='virginia'?3.8:2.7);}
 const spain=greatCircle(PLACES.madrid,PLACES.sopelana),ocean=greatCircle(PLACES.sopelana,PLACES.virginia),usa=greatCircle(PLACES.virginia,PLACES.ashburn);
 stream(earth,spain,{radius:.047,count:4,stages:[2],speed:.13});
 stream(earth,ocean,{radius:.065,count:12,stages:[2,5],speed:.08});
 stream(earth,usa,{radius:.047,count:4,stages:[5],speed:.14});
 stream(earth,[...usa.slice().reverse(),...ocean.slice().reverse().slice(1),...spain.slice().reverse().slice(1)],{radius:.075,count:16,color:MINT,stages:[7],speed:.09});
 // Landing station and exploded cross-section. Dimensions are deliberately enlarged.
 const landing=group('landing');box(landing,[0,-.3,0],[30,.3,24],0x062b45);
 box(landing,[-9,0,0],[12,.15,24],0x29483c);
 const water=box(landing,[5,.01,0],[16,.08,24],0x086790);water.material=own(new THREE.MeshStandardMaterial({color:0x086790,roughness:.23,metalness:.3,transparent:true,opacity:.72,depthWrite:false}));
 box(landing,[-3.5,.09,0],[1.5,.12,24],0xaba68a);
 for(let i=0;i<13;i++)line(landing,Array.from({length:12},(_,j)=>[-2+j*1.3,.063,-11+i*1.8+Math.sin(j*.7+i)*.12]),0x2e8cb0,.015);
 box(landing,[-8,.15,0],[7,.3,7],0x566977);
 box(landing,[-8,1.6,-2],[7,2.7,.14],0x648697);box(landing,[-11.45,1.6,0],[.14,2.7,4],0x436274);
 for(let i=0;i<3;i++)rack(landing,[-10+i*1.8,.3,-1],{height:2.4});
 label(landing,t('Estación óptica · ilustración','Optical station · illustration'),[-7,4,-1],6);
 stream(landing,[[-8,1,1],[-7,.15,2],[-3,.1,2],[0,-.01,2],[4,-.08,2],[11,-.08,2]],{stages:[3],radius:.09,count:8});
 const cutaway=new THREE.Group();landing.add(cutaway);cutaway.position.set(3,2,0);
 // Telescoped sections expose protective layers and fiber channels.
 for(let i=0;i<3;i++){const shell=cylinder(cutaway,[-2+i*1.1,0,0],.65-i*.14,2.8-i*.45,[0x364a5c,0xb8a57b,0x4eacc2][i]);shell.rotation.z=Math.PI/2;}
 for(let i=0;i<6;i++){const y=Math.sin(i*Math.PI/3)*.24,z=Math.cos(i*Math.PI/3)*.24;line(cutaway,[[.3,y,z],[3.6,y*2,z*2]],i%2?MINT:GOLD,.04);glow(cutaway,[3.6,y*2,z*2],i%2?MINT:GOLD,.5);}
 label(landing,t('Corte ampliado · fibras ópticas','Enlarged cutaway · optical fibers'),[3,4,0],6);
 // Undersea corridor: cable on the seafloor, optical amplification, suspended particles.
 const deep=group('ocean');const terrain=own(new THREE.PlaneGeometry(64,45,70,40));terrain.rotateX(-Math.PI/2);
 const pos=terrain.attributes.position;for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);pos.setY(i,-2+Math.sin(x*.2)*.15+Math.cos(z*.4)*.3+Math.sin(x*.8+z*.6)*.08);}terrain.computeVertexNormals();deep.add(new THREE.Mesh(terrain,mat(0x142b38)));
 const cablePoints=Array.from({length:17},(_,i)=>[-24+i*3,-1.2+Math.sin(i*.7)*.15,Math.sin(i*.5)*.6]);
 line(deep,cablePoints,0x57778a,.17);line(deep,cablePoints.map(p=>[p[0],p[1]+.16,p[2]]),0x63aeae,.025);
 stream(deep,cablePoints.map(p=>[p[0],p[1]+.22,p[2]]),{stages:[4],radius:.095,count:16,speed:.085});
 for(const i of [3,8,13]){const p=cablePoints[i],r=cylinder(deep,p,.35,1.65,0x9da9a9);r.rotation.z=Math.PI/2;for(const x of [-.7,.7]){const ring=cylinder(deep,[p[0]+x,p[1],p[2]],.39,.12,0x3ca4bc);ring.rotation.z=Math.PI/2;}glow(deep,[p[0],p[1]+.5,p[2]],CYAN,3);}
 label(deep,t('Repetidor óptico','Optical repeater'),[0,1.15,0],4);
 label(deep,t('Luz →','Light →'),[-8,.3,.5],2,'#ffcf86');
 const sediment=[];for(let i=0;i<900;i++)sediment.push(Math.sin(i*23.3)*27,Math.sin(i*7.12)*6+3,Math.cos(i*17.7)*18);
 const dustGeo=own(new THREE.BufferGeometry());dustGeo.setAttribute('position',new THREE.Float32BufferAttribute(sediment,3));const dust=new THREE.Points(dustGeo,own(new THREE.PointsMaterial({color:0x6da4b2,size:.035,transparent:true,opacity:.48})));deep.add(dust);animated.push(time=>dust.position.x=Math.sin(time*.07)*.3);
 const deepLight=new THREE.PointLight(0x43b4e9,45,28,2);deepLight.position.set(1,5,2);deep.add(deepLight);
 // Data center: racks, floor tiles, overhead network trays and an explicit endpoint.
 const server=group('server');floor(server,24,25,0x203341);
 for(const x of [-7,-3,3,7])for(let z=-9;z<=3;z+=4)rack(server,[x,0,z],{selected:x===3&&z===3});
 for(const x of [-7,-3,3,7]){box(server,[x,5,-3],[.7,.16,19],0x445a6a);box(server,[x,5.1,-3],[.45,.025,18],0x398a9f,.3);}
 for(const z of [-10,-3,4]){box(server,[0,5.8,z],[19,.14,.28],0x7d8f9c);box(server,[0,5.7,z],[18,.035,.16],0xd8efff,2);}
 for(const x of [-1.25,1.25])box(server,[x,.018,-3],[.055,.025,21],CYAN,1);
 label(server,t('ASHBURN · centro de datos ilustrativo','ASHBURN · illustrative data center'),[0,6.6,-9],10);
 label(server,t('Servicio de destino','Destination service'),[3,4.2,4.1],4,'#ffcf86');
 stream(server,[[-11,4.8,-9],[0,4.8,-9],[0,4.8,3],[3,4.8,3],[3,1.8,3.87]],{stages:[6],count:6,radius:.075});
 stream(server,[[3,1.8,3.87],[3,4.5,3],[0,4.5,3],[0,4.5,-9],[-11,4.5,-9]],{stages:[6],count:10,radius:.065,color:MINT});
 let stage=-1;
 function setStage(index){stage=index;Object.entries(groups).forEach(([key,g])=>g.visible=key===STAGES[index].scene);for(const [key,g] of Object.entries(geoLabels))g.visible=index===7||(index===2?['madrid','sopelana']:['virginia','ashburn']).includes(key);scene.fog=index===4?new THREE.FogExp2(0x031624,.026):null;scene.background.set(index===4?0x031624:0x030c17);sun.intensity=index===4?.35:3.5;rim.intensity=index===4?.6:2;}
 function update(time,progress=0){
  paths.forEach(p=>{const active=p.stages.includes(stage);p.mesh.visible=active;p.particles.forEach((b,i)=>{b.visible=active;if(active){let f=(time*p.speed+i/p.particles.length)%1;if(p.reverse)f=1-f;b.position.copy(p.curve.getPointAt(f));}});});
  responseTiles.forEach((m,i)=>m.visible=stage===8&&progress>=(i+1)/5);
  animated.forEach(fn=>fn(time));
 }
 setStage(0);update(0);
 return {scene,groups,paths,resources,setStage,update,dispose(){resources.forEach(r=>r.dispose());}};
}

export function createVoyageWorld(host,es){
 const world=createVoyageScene(es),renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;host.append(renderer.domElement);
 const camera=new THREE.PerspectiveCamera(47,1,.05,240);let index=0,elapsed=0,fromPos=V(STAGES[0].camera),fromTarget=V(STAGES[0].target),target=fromTarget.clone(),free=false,yaw=0,pitch=0;
 camera.position.copy(fromPos);camera.lookAt(target);
 const resize=()=>{const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w/h<.8?62:47;camera.updateProjectionMatrix();};const observer=new ResizeObserver(resize);observer.observe(host);resize();
 function go(i,instant=false){index=i;free=false;fromPos.copy(camera.position);fromTarget.copy(target);elapsed=instant?2:0;world.setStage(i);if(instant){camera.position.copy(V(STAGES[i].camera));target.copy(V(STAGES[i].target));camera.lookAt(target);}}
 function explore(value){free=value;if(free){const e=new THREE.Euler().setFromQuaternion(camera.quaternion,'YXZ');yaw=e.y;pitch=e.x;}else{fromPos.copy(camera.position);fromTarget.copy(target);elapsed=0;}}
 function look(dx,dy){if(!free)return;yaw-=dx*.0022;pitch=THREE.MathUtils.clamp(pitch-dy*.0022,-1.45,1.45);camera.rotation.set(pitch,yaw,0,'YXZ');target.copy(camera.position).add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(6));}
 function move(forward,side,vertical,dt){if(!free)return;const speed=STAGES[index].scene==='earth'?5:4;const d=new THREE.Vector3();camera.getWorldDirection(d);const right=new THREE.Vector3().crossVectors(d,camera.up).normalize();const step=d.multiplyScalar(forward).addScaledVector(right,side).addScaledVector(camera.up,vertical);if(step.lengthSq()>0)step.normalize().multiplyScalar(speed*dt);camera.position.add(step);if(camera.position.length()>70)camera.position.setLength(70);if(STAGES[index].scene==='earth'&&camera.position.length()<10.6)camera.position.setLength(10.6);target.copy(camera.position).add(camera.getWorldDirection(d).multiplyScalar(6));}
 function render(dt,time,progress,reduced=false){if(!free){elapsed+=dt;const q=Math.min(1,elapsed/1.35),s=q*q*(3-2*q);camera.position.lerpVectors(fromPos,V(STAGES[index].camera),s);target.lerpVectors(fromTarget,V(STAGES[index].target),s);if(!reduced&&q===1){camera.position.x+=Math.sin(time*.14)*.13;camera.position.y+=Math.sin(time*.19)*.08;}camera.lookAt(target);}world.update(time,progress);renderer.render(world.scene,camera);}
 return {canvas:renderer.domElement,go,explore,look,move,render,dispose(){observer.disconnect();world.dispose();renderer.dispose();renderer.domElement.remove();}};
}
