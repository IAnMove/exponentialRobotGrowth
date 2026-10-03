import * as THREE from '../vendor/three.module.js';
import {STAGES,PLACES,geoPoint,greatCircle} from './internet-route.js';
import {internetFrameAt} from './internet-model.js';
import {navigationFor,safePosition,moveInScene,orbitFromPosition,orbitPosition} from './internet-walk.js';
const GOLD=0xffc66c,MINT=0x76f6c4,CYAN=0x6ccfff;
const V=p=>new THREE.Vector3(...p);

export function createVoyageScene(es=true,{textures=true}={}){
 const scene=new THREE.Scene(),resources=[],groups={},paths=[],labels=[],animated=[],materials=new Map(),parts={};
 const own=r=>(resources.push(r),r),t=(a,b)=>es?a:b;
 scene.background=new THREE.Color(0x030c17);
 scene.add(new THREE.HemisphereLight(0xbbe7ff,0x17202f,2));
 const sun=new THREE.DirectionalLight(0xffe5c3,3.5);sun.position.set(12,18,14);scene.add(sun);
 const rim=new THREE.DirectionalLight(0x43a6ff,2);rim.position.set(-10,8,-12);scene.add(rim);
 const mat=(color,glow=0,roughness=.45)=>{const key=[color,glow,roughness].join();if(!materials.has(key))materials.set(key,own(new THREE.MeshStandardMaterial({color,roughness,metalness:.35,emissive:color,emissiveIntensity:glow})));return materials.get(key);};
 const boxGeo=own(new THREE.BoxGeometry(1,1,1)),ballGeo=own(new THREE.SphereGeometry(1,20,12));
 const cylinderGeo=own(new THREE.CylinderGeometry(1,1,1,32));
 function box(g,p,s,c,glow=0){const m=new THREE.Mesh(boxGeo,mat(c,glow));m.position.set(...p);m.scale.set(...s);g.add(m);return m;}
 function ball(g,p,r,c,glow=0){const m=new THREE.Mesh(ballGeo,mat(c,glow));m.position.set(...p);m.scale.setScalar(r);g.add(m);return m;}
 function cylinder(g,p,r,h,c){const m=new THREE.Mesh(cylinderGeo,mat(c));m.position.set(...p);m.scale.set(r,h,r);g.add(m);return m;}
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
 function surface(color,kind){
  const material=mat(color);if(!textures)return material;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,256,256);
  for(let i=0;i<160;i++){const x=(i*83)%256,y=(i*137)%256;ctx.strokeStyle=`rgba(20,35,44,${.018+(i%5)*.006})`;ctx.lineWidth=kind==='wood'?1:.6;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(kind==='wood'?256:x+10,y+(kind==='wood'?Math.sin(i)*2:8));ctx.stroke();}
  if(kind==='tile'){ctx.strokeStyle='rgba(0,18,30,.22)';ctx.lineWidth=2;ctx.strokeRect(1,1,254,254);}
  const texture=own(new THREE.CanvasTexture(canvas));texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(kind==='tile'?14:3,kind==='tile'?14:1);material.map=texture;return material;
 }
 surface(0xbda27b,'wood');surface(0x203341,'tile');surface(0x142b38,'sediment');
 function stream(g,points,{id,color=GOLD,radius=.06,count=5,reverse=false,stages=[],trail=.018,physical=true}={}){
  const curve=line(g,points,0x46627a,radius*.35),mesh=line(g,points,color,radius*.22); // Visible physical/carto corridor beneath pulses.
  const particles=Array.from({length:count},()=>{const b=ball(g,[0,0,0],radius,color);b.material=own(new THREE.MeshBasicMaterial({color,toneMapped:false}));glow(b,[0,0,0],color,5);return b;});
  mesh.material=own(new THREE.MeshBasicMaterial({color,transparent:true,opacity:.28,toneMapped:false}));
  const path={id,group:g,curve,mesh,particles,reverse,stages,trail,physical,color:new THREE.Color(color),radius};paths.push(path);return path;
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
 // Familiar room scale makes the later city pull-back a change of scale.
 box(city,[0,.48,2.1],[1.3,.16,1.05],0x465e6b);box(city,[0,1.05,2.5],[1.3,1.15,.14],0x465e6b);
 for(const x of [-.5,.5])for(const z of [1.7,2.5])box(city,[x,.23,z],[.065,.46,.065],0x253a48);
 box(city,[-1.15,1.13,.35],[.48,.05,.55],0x8ca3ac);box(city,[-1.15,1.165,.35],[.41,.012,.47],0xd7d9c8);
 cylinder(city,[1.15,1.23,.33],.13,.26,0xe7ddc4);cylinder(city,[-2.7,.3,-1.9],.26,.55,0x8e7464);
 for(let i=0;i<6;i++){const leaf=ball(city,[-2.7+Math.sin(i*1.8)*.24,.78+i*.09,-1.9+Math.cos(i*1.8)*.2],.2,0x5b9982);leaf.scale.y=1.8;}
 const roomLight=new THREE.PointLight(0xffd4a4,13,8,2);roomLight.position.set(-2,2.7,1.6);city.add(roomLight);
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
 stream(city,[[0,1.6,-.3],[1.1,1.9,.1],[2.4,1.65,-.2]],{id:'home-wifi',stages:[0],radius:.055,count:4});
 stream(city,[[2.4,1.65,-.2],[3,.15,0],[6,.15,-3],[6,.6,-5],[6,.15,-8],[-8,.15,-8],[-8,1,-10]],{id:'access',stages:[1],radius:.07,count:5});
 stream(city,[[-8,1,-10],[-8,.15,-8],[6,.15,-8],[6,.6,-5],[6,.15,-3],[3,.15,0],[2.4,1.65,-.2],[1.1,1.9,.1],[0,1.6,-.3]],{id:'home-return',stages:[8],color:MINT,count:5});
 // True Earth texture + geographically anchored endpoints; displayed curves are corridors.
 const earth=group('earth');const earthMaterial=own(new THREE.MeshStandardMaterial({color:0x99bed9,roughness:1,metalness:0}));
 if(textures)new THREE.TextureLoader().load('../kardashev/earth-blue-marble.jpg',texture=>{own(texture);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;earthMaterial.map=texture;earthMaterial.color.set(0xffffff);earthMaterial.needsUpdate=true;},undefined,()=>{earthMaterial.color.set(0x143a61);});
 const globe=new THREE.Mesh(own(new THREE.SphereGeometry(10,96,64)),earthMaterial);globe.rotation.y=-Math.PI/2;earth.add(globe);
 const atmosphere=new THREE.Mesh(own(new THREE.SphereGeometry(10.15,64,40)),own(new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.BackSide,blending:THREE.AdditiveBlending,vertexShader:'varying vec3 n; varying vec3 v; void main(){vec4 p=modelViewMatrix*vec4(position,1.); n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',fragmentShader:'varying vec3 n; varying vec3 v; void main(){float a=pow(1.0-abs(dot(normalize(n),normalize(v))),3.0); gl_FragColor=vec4(.16,.55,1.,a*.6);}'})));earth.add(atmosphere);
 const starPositions=[];for(let i=0;i<1000;i++){const a=i*2.39996,y=1-2*(i+.5)/1000,r=Math.sqrt(1-y*y);starPositions.push(100*r*Math.cos(a),100*y,100*r*Math.sin(a));}
 const starGeo=own(new THREE.BufferGeometry());starGeo.setAttribute('position',new THREE.Float32BufferAttribute(starPositions,3));scene.add(new THREE.Points(starGeo,own(new THREE.PointsMaterial({color:0xa8c9e3,size:.12,sizeAttenuation:true}))));
 const pins={};for(const [key,place] of Object.entries(PLACES)){const p=geoPoint(place,10.1);pins[key]=ball(earth,p,.055,MINT,2);glow(earth,p,MINT,.8);}
 // Keep nearby endpoint labels legible by using leader lines to separated nameplates.
 const nameplates={madrid:[-1,6.4,10],sopelana:[1.25,8,8.4],virginia:[-11,5.9,2.9],ashburn:[-9.5,8.5,1.2]};
 const geoLabels={};
 for(const [key,p] of Object.entries(nameplates)){const g=new THREE.Group();earth.add(g);geoLabels[key]=g;line(g,[geoPoint(PLACES[key],10.1),p],0x7fabbc,.015);label(g,PLACES[key].name,p,key==='virginia'?3.8:2.7);}
 const spain=greatCircle(PLACES.madrid,PLACES.sopelana),ocean=greatCircle(PLACES.sopelana,PLACES.virginia),usa=greatCircle(PLACES.virginia,PLACES.ashburn);
 stream(earth,spain,{id:'spain',radius:.047,count:4,stages:[2]});
 stream(earth,ocean,{id:'ocean',radius:.055,count:5,stages:[4]});
 stream(earth,usa,{id:'america',radius:.047,count:4,stages:[5]});
 stream(earth,[...usa.slice().reverse(),...ocean.slice().reverse().slice(1),...spain.slice().reverse().slice(1)],{id:'return',radius:.075,count:5,color:MINT,stages:[7]});
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
 stream(landing,[[-8,1,1],[-7,.15,2],[-3,.1,2],[0,-.01,2],[4,-.08,2],[11,-.08,2]],{id:'landing',stages:[3],radius:.09,count:5});
 const cutaway=new THREE.Group();landing.add(cutaway);cutaway.position.set(3,2,0);
 // Telescoped sections expose protective layers and fiber channels.
 for(let i=0;i<3;i++){const shell=cylinder(cutaway,[-2+i*1.1,0,0],.65-i*.14,2.8-i*.45,[0x364a5c,0xb8a57b,0x4eacc2][i]);shell.rotation.z=Math.PI/2;shell.material=own(new THREE.MeshStandardMaterial({color:[0x58728a,0xb8a57b,0x4eacc2][i],roughness:.45,transparent:true,opacity:.24,depthWrite:false,side:THREE.DoubleSide}));}
 for(let i=0;i<6;i++){const y=Math.sin(i*Math.PI/3)*.24,z=Math.cos(i*Math.PI/3)*.24;line(cutaway,[[-3.5,y,z],[.3,y,z],[3.6,y*2,z*2]],i%2?CYAN:GOLD,.028);}
 const landingFiber=stream(cutaway,[[-3.5,0,.24],[.3,0,.24],[3.6,0,.48]],{id:'landing',stages:[3],radius:.055,count:4,physical:false});
 parts.landingCutaway={group:cutaway,path:landingFiber};
 label(landing,t('Corte ampliado · construcción genérica','Enlarged cutaway · generic construction'),[3,4,0],6);
 label(landing,t('Protección','Protection'),[.2,2.95,1.1],2);label(landing,t('Fibras ópticas','Optical fibers'),[6.4,2.8,.8],2.7,'#ffcf86');
 // Undersea corridor: cable on the seafloor, optical amplification, suspended particles.
 const deep=group('ocean');const terrain=own(new THREE.PlaneGeometry(64,45,70,40));terrain.rotateX(-Math.PI/2);
 const pos=terrain.attributes.position;for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);pos.setY(i,-2+Math.sin(x*.2)*.15+Math.cos(z*.4)*.3+Math.sin(x*.8+z*.6)*.08);}terrain.computeVertexNormals();deep.add(new THREE.Mesh(terrain,mat(0x142b38)));
 const cablePoints=Array.from({length:17},(_,i)=>[-12+i*1.5,-1.2+Math.sin(i*.7)*.12,Math.sin(i*.5)*.38]);
 const jacketCurve=new THREE.CatmullRomCurve3(cablePoints.map(V));
 const jacket=new THREE.Mesh(own(new THREE.TubeGeometry(jacketCurve,160,.22,16,false)),own(new THREE.MeshStandardMaterial({color:0x879fae,roughness:.45,metalness:.25,transparent:true,opacity:.23,depthWrite:false,side:THREE.DoubleSide})));deep.add(jacket);
 // The active pulse runs on the central fiber, including the amplifier bore.
 const cablePath=stream(deep,cablePoints,{id:'ocean',stages:[4],radius:.07,count:5,trail:.019});
 for(const [y,z,color] of [[.085,.035,CYAN],[-.085,-.035,MINT]])line(deep,cablePoints.map(p=>[p[0],p[1]+y,p[2]+z]),color,.017);
 const repeaters=[];
 for(const fraction of [.22,.5,.78]){
  const p=cablePath.curve.getPointAt(fraction),tangent=cablePath.curve.getTangentAt(fraction),r=cylinder(deep,p.toArray(),.37,1.4,0x9da9a9);
  r.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),tangent);r.material=own(new THREE.MeshStandardMaterial({color:0x9bb0bd,roughness:.32,metalness:.4,transparent:true,opacity:.3,depthWrite:false,side:THREE.DoubleSide}));
  for(const side of [-1,1]){const end=p.clone().addScaledVector(tangent,side*.7),ring=cylinder(deep,end.toArray(),.4,.07,0x3ca4bc);ring.quaternion.copy(r.quaternion);}
  repeaters.push({fraction,position:p.toArray(),axis:tangent.toArray(),length:1.4,radius:.37,mesh:r});
 }
 parts.cable={curve:cablePath.curve,path:cablePath,jacket,fiberRadius:.07,jacketRadius:.22,repeaters};
 const cableAnnotations=[
  {text:t('Cubierta transparente · fibras dentro','Transparent jacket · fibers inside'),position:[0,-1.55,3.7],width:8,color:'#cfe8f3'},
  {text:t('Colores simbólicos · luz infrarroja','Symbolic colors · infrared light'),position:[0,-2.2,3.7],width:6.5,color:'#8bb8cb'}
 ];
 const mobileCableAnnotations=[
  {text:t('Fibras dentro del cable','Fibers inside the cable'),position:[0,-2.05,3.7],width:9,color:'#cfe8f3'},
  {text:t('Infrarrojo · colores simbólicos','Infrared · symbolic colors'),position:[0,-3.05,3.7],width:9,color:'#8bb8cb'}
 ];
 const annotationSet=specs=>specs.map(a=>{const sprite=label(deep,a.text,a.position,a.width,a.color);if(sprite){sprite.material.depthTest=false;sprite.renderOrder=10;}return {...a,sprite};});
 const desktopAnnotations=annotationSet(cableAnnotations),mobileAnnotations=annotationSet(mobileCableAnnotations);parts.cable.annotations=desktopAnnotations;
 line(deep,[cablePath.curve.getPointAt(.36).toArray(),[-3.2,-1.3,1.8],[-2.4,-1.35,3.1]],0x5b8598,.011);
 // A local enlarged comparison shows optical power increasing, not a new packet.
 const amplifier=new THREE.Group();amplifier.position.set(0,2.5,-.8);deep.add(amplifier);
 const amp=cylinder(amplifier,[0,0,0],.52,1.4,0xa6b5bc);amp.rotation.z=Math.PI/2;amp.material=own(new THREE.MeshStandardMaterial({color:0x91afbe,transparent:true,opacity:.3,depthWrite:false,roughness:.35,side:THREE.DoubleSide}));
 const amplificationPath=stream(amplifier,[[-4,0,0],[-.7,0,0],[.7,0,0],[4,0,0]],{id:'ocean',stages:[4],radius:.09,count:4,trail:.06,physical:false});
 for(const [start,end,amplitude] of [[-4,-.8,.06],[.8,4,.2]])line(amplifier,Array.from({length:70},(_,i)=>{const x=start+(end-start)*i/69;return [x,Math.sin(x*11)*amplitude,.015];}),GOLD,.015);
 label(amplifier,t('Entrada atenuada','Attenuated input'),[-2.5,.7,0],3.6,'#e0bb83');
 label(amplifier,t('Salida amplificada','Amplified output'),[2.6,.7,0],3.6,'#ffcf86');
 label(amplifier,t('Amplificación óptica · comparación local','Optical amplification · local comparison'),[0,1.65,0],8);
 label(amplifier,t('Misma información · aumenta la potencia','Same information · increased optical power'),[0,-.8,0],7,'#9ebcca');
 parts.amplifier={group:amplifier,path:amplificationPath,housing:amp};
 const sediment=[];for(let i=0;i<900;i++)sediment.push(Math.sin(i*23.3)*27,Math.sin(i*7.12)*6+3,Math.cos(i*17.7)*18);
 const dustGeo=own(new THREE.BufferGeometry());dustGeo.setAttribute('position',new THREE.Float32BufferAttribute(sediment,3));const dust=new THREE.Points(dustGeo,own(new THREE.PointsMaterial({color:0x6da4b2,size:.035,transparent:true,opacity:.48})));deep.add(dust);animated.push(time=>dust.position.x=Math.sin(time*.07)*.3);
 const deepLight=new THREE.PointLight(0x43b4e9,45,28,2);deepLight.position.set(1,5,2);deep.add(deepLight);
 // Data center: racks, floor tiles, overhead network trays and an explicit endpoint.
 const server=group('server');floor(server,24,25,0x203341);
 for(const x of [-7,-3,3,7])for(let z=-9;z<=3;z+=4)rack(server,[x,0,z]);
 for(const x of [-7,-3,3,7]){box(server,[x,5,-3],[.7,.16,19],0x445a6a);box(server,[x,5.1,-3],[.45,.025,18],0x398a9f,.3);}
 for(const z of [-10,-3,4]){box(server,[0,5.8,z],[19,.14,.28],0x7d8f9c);box(server,[0,5.7,z],[18,.035,.16],0xd8efff,2);}
 for(const x of [-1.25,1.25])box(server,[x,.018,-3],[.055,.025,21],CYAN,1);
 label(server,t('ASHBURN · centro de datos ilustrativo','ASHBURN · illustrative data center'),[0,6.6,-9],10);
 label(server,t('Servicio de destino','Destination service'),[3,4.2,4.1],4,'#ffcf86');
 stream(server,[[-11,4.8,-9],[0,4.8,-9],[0,4.8,3],[3,4.8,3],[3,1.8,3.87]],{id:'server-in',stages:[6],count:5,radius:.075});
 stream(server,[[3,1.8,3.87],[3,4.5,3],[0,4.5,3],[0,4.5,-9],[-11,4.5,-9]],{id:'server-out',stages:[6],count:5,radius:.065,color:MINT});
 const serviceIndicator=box(server,[3,1.8,3.82],[1.32,.26,.07],0x496372);serviceIndicator.material=own(new THREE.MeshStandardMaterial({color:0x496372,emissive:0x496372,emissiveIntensity:.1,roughness:.4}));
 const processingBar=box(server,[2.4,2.2,3.85],[1.2,.05,.06],GOLD,1);processingBar.geometry=own(new THREE.BoxGeometry(1,1,1).translate(.5,0,0));
 const serviceLabels=[label(server,t('Esperando la petición','Waiting for the request'),[3,3.25,4.2],4.4),label(server,t('Petición recibida · procesando','Request received · processing'),[3,3.25,4.2],4.9,'#ffcf86'),label(server,t('200 OK · respuesta preparada','200 OK · response prepared'),[3,3.25,4.2],4.9,'#9dfbd7')];
 parts.service={indicator:serviceIndicator,processingBar,labels:serviceLabels,requestArrived:false,responseReady:false,processingProgress:0};parts.screen={tiles:responseTiles,progress:0};
 let stage=-1;
 function setStage(index){if(!STAGES[index])throw new RangeError('Unknown Internet chapter');stage=index;Object.entries(groups).forEach(([key,g])=>g.visible=key===STAGES[index].scene);for(const [key,g] of Object.entries(geoLabels))g.visible=index===7||(index===2?['madrid','sopelana']:['virginia','ashburn']).includes(key);scene.fog=index===4?new THREE.FogExp2(0x031624,.014):null;scene.background.set(index===4?0x031624:0x030c17);sun.intensity=index===4?.55:3.5;rim.intensity=index===4?.9:2;}
 function update(input,progress=0){
  const frame=typeof input==='number'?internetFrameAt(Math.max(0,stage),progress):input||internetFrameAt(Math.max(0,stage),0);
  if(frame.index!==stage)setStage(frame.index);
  paths.forEach(p=>{const segment=frame.activeSegments.find(s=>s.id===p.id),active=p.stages.includes(stage)&&!!segment;p.mesh.visible=active;
   p.particles.forEach((b,i)=>{const f=active?segment.local-i*p.trail:-1;b.visible=active&&f>=0&&f<=1;if(!b.visible)return;b.position.copy(p.curve.getPointAt(p.reverse?1-f:f));
    let power=1;if(p===amplificationPath)power=f<.5?.3:1;else if(p===cablePath){const previous=[0,...repeaters.map(r=>r.fraction)].filter(n=>n<=f).at(-1);power=Math.max(.28,1-(f-previous)*1.8);}
    b.material.color.copy(p.color).multiplyScalar(power);b.scale.setScalar(p.radius*(.7+.3*power));b.userData.signalLocal=f;b.userData.opticalPower=power;
   });
  });
  responseTiles.forEach((m,i)=>m.visible=frame.responseArrived&&frame.screenProgress>=(i+1)/5);parts.screen.progress=frame.screenProgress;
  const state=frame.responseReady?2:frame.requestArrived?1:0;serviceLabels.forEach((m,i)=>{if(m)m.visible=state===i;});
  const serviceColor=state===2?MINT:state===1?GOLD:0x496372;serviceIndicator.material.color.set(serviceColor);serviceIndicator.material.emissive.set(serviceColor);serviceIndicator.material.emissiveIntensity=state?.75:.1;
  processingBar.visible=frame.requestArrived;processingBar.scale.x=1.2*frame.processingProgress;
  Object.assign(parts.service,{requestArrived:frame.requestArrived,responseReady:frame.responseReady,processingProgress:frame.processingProgress});
  animated.forEach(fn=>fn(frame.visualTime));parts.frame=frame;
 }
 function setAspect(aspect=1.5){
  const mobile=aspect<1.05;amplifier.scale.setScalar(mobile?2:1);amplifier.position.y=mobile?1.9:2.5;
  desktopAnnotations.forEach(a=>{if(a.sprite)a.sprite.visible=!mobile;});mobileAnnotations.forEach(a=>{if(a.sprite)a.sprite.visible=mobile;});parts.cable.annotations=mobile?mobileAnnotations:desktopAnnotations;parts.amplifier.mobile=mobile;
 }
 setAspect();setStage(0);update(internetFrameAt(0,0));
 return {scene,groups,paths,parts,resources,setStage,setAspect,update,dispose(){resources.forEach(r=>r.dispose());}};
}

const corners=(min,max)=>[0,1].flatMap(x=>[0,1].flatMap(y=>[0,1].map(z=>[x?max[0]:min[0],y?max[1]:min[1],z?max[2]:min[2]])));
// Framing encloses the teaching subject; terrain and the city continue beyond it.
export const VOYAGE_FRAMING=[
 corners([-3.3,0,-3],[4,3.05,2.9]),corners([-11.5,0,-12],[8,5.3,4]),
 corners([-2.5,5.3,7.1],[2.8,8.5,10.2]),corners([-12,0,-3],[11,4.6,3.8]),
 corners([-12.8,-2.75,-1.2],[12.8,4.6,3.8]),corners([-13.2,4.3,.8],[-6.8,9.1,3.6]),
 corners([-8,0,-10],[8,6.9,5.4]),corners([-13.2,-10.4,-10.4],[10.4,10.4,10.4]),
 corners([-2.1,.8,-1],[4,3,2.8])
];
export function voyageFramingAt(index,aspect=1.5){return index===4&&aspect<1.05?corners([-12.8,-3.75,-1.2],[12.8,6.1,3.8]):VOYAGE_FRAMING[index];}
export function voyageCameraAt(index,aspect=1){
 const stage=STAGES[index],target=V(stage.target);if(index===4)target.set(0,1,0);
 const fov=aspect<.8?58:47,outward=V(stage.camera).sub(V(stage.target)).normalize();
 const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),outward).normalize(),up=new THREE.Vector3().crossVectors(outward,right).normalize();
 const vtan=Math.tan(fov*Math.PI/360),htan=vtan*Math.max(.25,aspect);let distance=V(stage.camera).distanceTo(V(stage.target));
 for(const p of voyageFramingAt(index,aspect)){const delta=V(p).sub(target);distance=Math.max(distance,delta.dot(outward)+Math.max(Math.abs(delta.dot(right))/(htan*.86),Math.abs(delta.dot(up))/(vtan*.86))+.1);}
 return {position:target.clone().addScaledVector(outward,distance).toArray(),target:target.toArray(),fov,near:.05,far:240};
}

export function createVoyageWorld(host,es){
 const world=createVoyageScene(es),renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
 renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label',es?'Escena de Internet. Explora con el teclado y el ratón.':'Internet scene. Explore with keyboard and mouse.');
 renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,1.7));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;host.append(renderer.domElement);
 const camera=new THREE.PerspectiveCamera(47,1,.05,240),savedViews=new Map();
 let index=0,elapsed=2,free=false,yaw=0,pitch=0,orbit=orbitFromPosition(STAGES[0].camera),currentFrame=internetFrameAt(0,0),disposed=false;
 const initial=voyageCameraAt(0,1),target=V(initial.target),fromPos=V(initial.position),fromTarget=target.clone();camera.position.copy(fromPos);camera.lookAt(target);
 const sceneName=()=>STAGES[index].scene,getNavigationMode=()=>navigationFor(sceneName()).mode;
 function guidedPose(){return voyageCameraAt(index,camera.aspect);}
 function orient(){if(getNavigationMode()==='orbit'){camera.position.copy(V(orbitPosition(orbit)));target.set(0,0,0);camera.lookAt(target);}else{camera.rotation.set(pitch,yaw,0,'YXZ');target.copy(camera.position).add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(6));}}
 function getViewState(){return {version:1,index,scene:sceneName(),exploring:free,mode:getNavigationMode(),position:camera.position.toArray(),target:target.toArray(),yaw,pitch,orbit:{...orbit}};}
 function restoreViewState(state){
  if(!state||state.scene!==sceneName()||!Array.isArray(state.position)||state.position.length!==3||!state.position.every(Number.isFinite))return false;
  yaw=Number.isFinite(state.yaw)?state.yaw:0;pitch=THREE.MathUtils.clamp(Number.isFinite(state.pitch)?state.pitch:0,-1.25,1.25);
  if(free){camera.position.copy(V(safePosition(sceneName(),state.position)));orbit=orbitFromPosition(camera.position.toArray());orient();}
  else{camera.position.copy(V(state.position));if(Array.isArray(state.target)&&state.target.length===3&&state.target.every(Number.isFinite))target.copy(V(state.target));camera.lookAt(target);fromPos.copy(camera.position);fromTarget.copy(target);elapsed=2;}
  return true;
 }
 function savePose(){if(free)savedViews.set(sceneName(),getViewState());}
 function enterScene(){const name=sceneName(),spec=navigationFor(name),saved=savedViews.get(name);if(saved&&restoreViewState(saved))return;
  if(spec.mode==='orbit'){orbit=orbitFromPosition(guidedPose().position);orient();}
  else{camera.position.copy(V(spec.start));yaw=spec.yaw;pitch=spec.mode==='walk'?0:-.12;orient();}
 }
 function go(i,instant=false,{preserveView=false}={}){
  if(!STAGES[i])throw new RangeError('Unknown Internet chapter');const previous=sceneName(),wasFree=free;savePose();index=i;world.setStage(i);currentFrame=internetFrameAt(i,0);
  free=wasFree&&preserveView;if(free){if(sceneName()!==previous)enterScene();return;}
  const pose=guidedPose();fromPos.copy(camera.position);fromTarget.copy(target);elapsed=instant?2:0;if(instant){camera.position.copy(V(pose.position));target.copy(V(pose.target));camera.lookAt(target);}
 }
 function explore(value){const desired=!!value;if(desired===free)return;if(!desired){savePose();free=false;fromPos.copy(camera.position);fromTarget.copy(target);elapsed=0;}else{free=true;enterScene();}}
 function look(dx,dy){if(!free||!Number.isFinite(dx)||!Number.isFinite(dy))return;if(getNavigationMode()==='orbit'){orbit.azimuth-=dx*.004;orbit.elevation=THREE.MathUtils.clamp(orbit.elevation+dy*.003,-.95,1.25);}else{yaw-=dx*.0022;pitch=THREE.MathUtils.clamp(pitch-dy*.0022,-1.25,1.25);}orient();}
 function move(forward,side,vertical,dt){if(!free)return;
  if(getNavigationMode()==='orbit'){orbit.radius=THREE.MathUtils.clamp(orbit.radius-(forward+vertical)*Math.min(.1,dt)*8,12,42);orbit.azimuth-=side*Math.min(.1,dt)*.55;}
  else camera.position.copy(V(moveInScene(sceneName(),camera.position.toArray(),{yaw,pitch,forward,side,vertical,dt})));orient();
 }
 const resize=()=>{if(disposed)return;const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;world.setAspect(camera.aspect);camera.fov=guidedPose().fov;camera.updateProjectionMatrix();if(!free){const pose=guidedPose();camera.position.copy(V(pose.position));target.copy(V(pose.target));fromPos.copy(camera.position);fromTarget.copy(target);elapsed=2;camera.lookAt(target);}};
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 function render(frame,options={}){
  // Older consumers can render a fraction while migrating to immutable frames.
  if(typeof frame==='number'){const progress=arguments[2]||0;options={dt:frame,reduced:!!arguments[3]};frame=internetFrameAt(index,progress);}
  frame=frame||currentFrame;if(frame.index!==index)go(frame.index,true,{preserveView:!!options.preserveView});currentFrame=frame;
  if(!free){elapsed+=Math.max(0,options.dt||0);const q=Math.min(1,elapsed/1.2),s=q*q*(3-2*q),pose=guidedPose();camera.position.lerpVectors(fromPos,V(pose.position),s);target.lerpVectors(fromTarget,V(pose.target),s);camera.lookAt(target);}
  world.update(frame);renderer.render(world.scene,camera);
 }
 function inspect(){return {stage:index,scene:sceneName(),navigation:navigationFor(sceneName()),camera:{position:camera.position.toArray(),target:target.toArray(),aspect:camera.aspect,fov:camera.fov},exploring:free,frame:currentFrame};}
 return {canvas:renderer.domElement,scene:world.scene,parts:world.parts,go,explore,look,move,render,getViewState,restoreViewState,getNavigationMode,inspect,dispose(){disposed=true;observer.disconnect();world.dispose();renderer.dispose();renderer.domElement.remove();}};
}
