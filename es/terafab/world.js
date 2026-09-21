import * as THREE from '../../vendor/three.module.js';

export const HALLS=[[-21,26],[21,26],[-21,-26],[21,-26]];
export function carrierPosition(time){
 const phase=((time*2.5)%116+116)%116;
 const d=phase<9?phase:phase<15?9:phase<26?phase-6:phase<32?20:phase<44?phase-12:phase<50?32:phase<80?phase-18:phase<86?62:phase-24;
 if(d<36)return [-3,18-d];if(d<46)return [-3+d-36,-18];if(d<82)return [7,-18+d-46];return [7-d+82,18];
}
// A spatial interpretation of the official exterior; all room assignments are illustrative.
export function buildCampus(){
 const scene=new THREE.Scene(),root=new THREE.Group();scene.add(root);
 const materials=new Map(),cube=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(1,1,1,16),sphere=new THREE.SphereGeometry(1,10,8);
 const mat=(color,glow=0)=>{const key=color+':'+glow;if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness:.64,metalness:.16,emissive:glow?color:0,emissiveIntensity:glow}));return materials.get(key);};
 const batchRoots=[],hallGroups=[],decks=[],roofs=[],plenums=[],carriers=[],actors=[];
 function group(parent=root){const g=new THREE.Group();parent.add(g);batchRoots.push(g);return g;}
 function mesh(parent,geo,x,y,z,sx,sy,sz,color,glow=0){const m=new THREE.Mesh(geo,mat(color,glow));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 const box=(p,x,y,z,w,h,d,c,g=0)=>mesh(p,cube,x,y,z,w,h,d,c,g);
 const cyl=(p,x,y,z,r,h,c)=>mesh(p,cylinder,x,y,z,r,h,r,c);
 function pipe(p,a,b,r,c){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),delta=bv.clone().sub(av),mid=av.clone().add(bv).multiplyScalar(.5);const m=cyl(p,mid.x,mid.y,mid.z,r,delta.length(),c);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;}
 const land=group(),offsite=group();
 box(land,0,-1.4,0,148,2.4,158,0x183640);box(land,0,-.12,0,145,.2,155,0x416861);
 box(land,0,.03,0,91,.15,119,0x7b9391);
 // Perimeter road, service roads, planted edges and parking.
 for(const x of [-62,62])box(land,x,.07,2,7,.12,143,0x2a3f49);
 for(const z of [-67,68])box(land,0,.07,z,130,.12,7,0x2a3f49);
 for(const z of [-67,68])for(let x=-58;x<62;x+=7)box(land,x,.15,z,2,.02,.17,0xd7cf9d);
 for(const x of [-62,62])for(let z=-60;z<65;z+=7)box(land,x,.15,z,.17,.02,2,0xd7cf9d);
 for(let z=-55;z<58;z+=7){for(const x of [-70,70]){cyl(land,x,1.5,z,.28,3,0x776a50);mesh(land,sphere,x,4,z,2.1,2.8,2.1,0x376c56);}}
 for(let i=0;i<18;i++){const x=-42+i*5;box(land,x,.15,75,2,.05,4,0x8fa399);box(land,x,1,75,1.7,1.6,3.5,[0xe1e5df,0x758d9d,0xabc6bc][i%3]);}
 // Central service spine follows the repeated parallel volumes in the render.
 box(land,0,.15,0,11,.25,114,0x304d5b);
 for(const x of [-6,6])for(let z=-50;z<54;z+=8){box(land,x,1.8,z,.18,3.6,.18,0xa4bec4);box(land,x,3.5,z,1.2,.12,.6,0xffdcaa,1);}
 for(const z of [-1,55]){box(land,0,3.1,z,70,5.6,5,0x315167);box(land,0,5.95,z,71,.35,6,0xd3e1df);for(let x=-31;x<35;x+=3)box(land,x,3.2,z+2.55,2.3,3.4,.08,0x90c2cb);}
 // The frontage is simplified from the sweeping connected head buildings.
 for(const x of [-28,28]){const wing=box(land,x,3,59,54,5.7,8,0x29495d);wing.rotation.y=(x<0?1:-1)*.1;const top=box(land,x,6,59,56,.45,10,0xccdcdd);top.rotation.y=wing.rotation.y;for(let y=1;y<6;y+=1.1)box(land,x,y,63.1,48,.08,.08,0xf1c58f,.55);}
 box(land,0,1,65,11,2,5,0x527787);box(land,0,2.2,65,13,.28,7,0xd3e3e0);

 function foup(p,x,y,z,color=0xd9be7e){box(p,x,y,z,.85,.7,.8,color);box(p,x,y+.45,z,.45,.16,.35,0xb4c5c7);box(p,x,y,z+.42,.65,.42,.05,0x657f8b);}
 function scanner(p,x,z){box(p,x,1.9,z,6.4,3.8,4.5,0xe0e9e4);box(p,x,4,z-.45,5.4,.4,3.3,0xf3f4df);box(p,x+1.65,2.1,z+2.3,1.1,1.4,.13,0x375d72);box(p,x+1.65,2.1,z+2.39,.83,1.04,.03,0x83d9d1,.7);box(p,x-1.3,1,z+2.8,2.8,1.5,1,0x839ca6);for(const dx of [-2,-.65])foup(p,x+dx,2.1,z+2.9);for(const dx of [-2.5,2.5])box(p,x+dx,2,z-.4,.12,3.5,4.6,0xa5b8bb);cyl(p,x+2.5,4.45,z-1,.13,.55,0xa2e6c0);}
 function cluster(p,x,z,color=0xadc9c5){box(p,x,1.15,z,3,2.3,4,0xbcced0);for(const [dx,dz] of [[-2.6,-1],[-2.6,1.6],[2.6,-1],[2.6,1.6]]){cyl(p,x+dx,1.7,z+dz,1.22,2.9,0xd5e0df);cyl(p,x+dx,3.22,z+dz,1.08,.18,color);pipe(p,[x,1.6,z],[x+dx,1.6,z+dz],.3,0x7799a4);}box(p,x,.8,z+3.1,4.8,1.6,1.4,0x829dab);for(const dx of [-1.35,0,1.35])foup(p,x+dx,1.9,z+3.15);}
 function instrument(p,x,z){box(p,x,1.5,z,3.4,3,3.8,0xe3e9db);box(p,x,2.1,z+1.95,2.7,1.25,.06,0x456b78);box(p,x+.9,3.1,z,.6,.2,.8,0xe9ba7f);cyl(p,x,1.15,z+2.7,.72,.08,0x83aeca);box(p,x, .65,z+2.65,2.5,1.2,1.2,0xb4c7c6);}
 function person(p,x,z){const g=new THREE.Group();p.add(g);g.position.set(x,0,z);box(g,0,.86,0,.5,.62,.38,0xe8ece4);mesh(g,sphere,0,1.39,0,.3,.33,.3,0xeaf0e7);box(g,0,1.42,.265,.4,.15,.05,0x6da6c1);for(const s of [-1,1]){box(g,s*.17,.33,0,.19,.55,.23,0xdae5e0);box(g,s*.35,.87,0,.15,.61,.2,0xe8ece4);}return g;}
 HALLS.forEach(([x,z],i)=>{
  const hall=new THREE.Group();hall.position.set(x,0,z);root.add(hall);hallGroups.push(hall);
  const base=group(hall),deck=group(hall),roof=group(hall),plenum=group(hall);decks.push(deck);roofs.push(roof);plenums.push(plenum);deck.position.y=3.5;
  box(base,0,.3,0,27,.6,43,0x466774);
  for(const sx of [-13,13])for(const sz of [-20,-8,4,16,21])box(base,sx,4,sz,.38,8,.38,0x647f8a);
  // Auxiliary services under the cleanroom slab.
  for(let a=-9;a<=9;a+=6)for(let b=-17;b<=17;b+=9){box(base,a,1.3,b,2.8,1.8,2,0x7f9faa);cyl(base,a+1.5,1.8,b,.5,2.4,0xaac3c5);pipe(base,[a,2.7,b],[a,3.5,b],.14,0xd9b882);}
  for(const sx of [-10,0,10])pipe(base,[sx,2.8,-20],[sx,2.8,21],.19,sx?0xb6c9c7:0xe3bf7f);
  box(deck,0,0,0,26.6,.3,42.5,0xc4d5d0);
  for(let sx=-12;sx<13;sx+=2)for(let sz=-20;sz<22;sz+=2)box(deck,sx,.17,sz,1.94,.02,1.94,(sx+sz)%4?0xd8e3db:0xd2dfd6);
  // Back and side low walls retain visibility into the miniature.
  box(deck,-13,1.1,0,.25,2.2,42,0xbacfd0);box(deck,0,1.1,-21,26,2.2,.25,0xc6d7d3);
  for(let sx=-11;sx<13;sx+=4)box(deck,sx,2.25,-21,3.3,.95,.1,0x8cbac3);
  box(deck,0,.2,0,2.5,.035,39,0x91bab8);
  for(let sz=-18;sz<20;sz+=4)box(deck,0,.23,sz,.13,.03,1.1,0xf9ebad);
  if(i===0){scanner(deck,-4,9);cluster(deck,-4,-2);cluster(deck,-4,-14,0xd9bf98);for(const zz of [-12,-2,9])instrument(deck,8,zz);for(const xx of [-5,1,7]){box(deck,xx,1.1,20,3.7,2.2,1.1,0xadc8c7);box(deck,xx,2.2,20,2.9,.05,1.2,0xd5e6de);}person(deck,2,17);person(deck,3,-7);person(deck,8,14);}
  if(i===1){for(const zz of [-13,1,13]){cluster(deck,-4,zz);instrument(deck,8,zz);}person(deck,2,-9);person(deck,7,16);}
  if(i===2){for(const xx of [-7,7])for(const zz of [-14,-2,10]){instrument(deck,xx,zz);box(deck,xx,1.5,zz+.5,2,.18,2,0x303f59);for(let j=0;j<3;j++)box(deck,xx-.65+j*.65,1.7,zz+.4,.4,.15,.5,0xd1bb80);pipe(deck,[xx+1,2,zz],[xx+.2,2.7,zz+.5],.12,0xdebd79);}person(deck,0,12);}
  if(i===3){for(const xx of [-8,0,8])for(const zz of [-13,-6,1]){box(deck,xx,1.7,zz,3,3.4,3.5,0x2b465b);for(let yy=.4;yy<3.3;yy+=.42){box(deck,xx,yy,zz+1.8,2.5,.08,.08,0x789aa5);box(deck,xx+1,yy,zz+1.86,.12,.1,.04,0x9be4ba,1);}}for(const xx of [-7,7])instrument(deck,xx,13);person(deck,3,12);}
  // Visible overhead track loops and carriers above the equipment load ports.
  for(const xx of [-3,7])pipe(deck,[xx,5.5,-18],[xx,5.5,18],.11,0x587988);
  for(const zz of [-18,18])pipe(deck,[-3,5.5,zz],[7,5.5,zz],.11,0x587988);
  for(const zz of [-17,0,17]){pipe(deck,[-11,6,zz],[11,6,zz],.11,0x9fb5b8);for(const xx of [-11,11])box(deck,xx,3,zz,.13,6,.13,0x8aa6af);}
  const carrier=new THREE.Group();deck.add(carrier);box(carrier,0,0,0,.9,.32,1.1,0x456a79);box(carrier,0,-.3,0,.1,.6,.1,0xaac2c8);foup(carrier,0,-.88,0,0xe8c887);carriers.push(carrier);
  // Ceiling filters are separate from the exterior weather roof.
  plenum.position.y=10;
  for(const xx of [-8,0,8])for(const zz of [-15,-5,5,15]){box(plenum,xx,0,zz,5,.35,6,0xb4cbcd);for(let k=-2;k<=2;k++)box(plenum,xx+k,.2,zz,.16,.12,5.5,0x6d939f);cyl(plenum,xx,.5,zz,1.2,.5,0x587d8d);}
  for(const xx of [-10,10])pipe(plenum,[xx,.4,-20],[xx,.4,20],.4,0xa7bec3);
  box(roof,0,10.1,0,28,.65,44,0xd1dfe0);
  for(const xx of [-13.8,13.8])box(roof,xx,10,0,.16,.4,44,0xe1bd86,.5);
  for(let zz=-20;zz<22;zz+=4){box(roof,0,10.5,zz,26,.08,.15,0x96b1bc);box(roof,0,10.53,zz,7,.12,2.6,0x7b9da9);}
  for(const xx of [-14.2,14.2])for(let zz=-18;zz<21;zz+=6){box(base,xx,1.1,zz,1.9,2.2,3,0x577786);box(base,xx,2.3,zz,2.3,.2,3.3,0xacc2c6);}
 });
 // Warehouse and loading docks.
 box(offsite,-47,2.3,38,14,4.5,22,0x7897a0);box(offsite,-47,4.65,38,15,.25,23,0xc0d4d2);
 for(const z of [31,39,47]){box(offsite,-54.1,1.8,z,.13,3,4,0x2c4859);box(offsite,-58,1.5,z,5,2.4,2.6,0xe1e4d5);box(offsite,-60.9,1.2,z,1.7,2,2.4,0x81b5be);}
 // Water plant, treatment basins and utility service modules.
 for(const x of [-54,-46])for(const z of [-38,-29]){cyl(offsite,x,2.7,z,3.1,5.4,0xb9ccce);cyl(offsite,x,5.46,z,3.2,.12,0xe3dfbf);}
 for(const z of [-17,-7]){box(offsite,-50,.9,z,16,1.8,7,0x779b9d);box(offsite,-50,1.85,z,14.7,.05,5.7,0x6eb2bc);for(let x=-55;x<-43;x+=3)box(offsite,x,2,z,.16,.15,6.4,0xc8dad4);}
 pipe(offsite,[-42,1,-34],[-36,1,-34],.4,0x9ecad2);
 for(const z of [-42,-30,-18]){box(offsite,48,2,z,13,4,7,0x718d99);box(offsite,48,4.2,z,14,.35,8,0xc1d1cc);for(const x of [44,48,52]){cyl(offsite,x,4.6,z,1.2,.6,0x3b566a);box(offsite,x,4.94,z,2.2,.12,.12,0xb4c9c9);}cyl(offsite,55,5,z, .65,10,0x9bb3b9);}
 for(const x of [43,49,55]){box(offsite,x,1.4,-5,4,2.7,5,0x859da4);for(let k=-1;k<=1;k++)cyl(offsite,x+k,3.7,-5,.17,2,0xd8cdb2);}
 // Merge static pieces within each movable layer, keeping roof/deck transforms independent.
 for(const batchRoot of batchRoots){const bins=new Map();batchRoot.updateMatrixWorld(true);const inverse=new THREE.Matrix4().copy(batchRoot.matrixWorld).invert();batchRoot.traverse(o=>{if(!o.isMesh)return;for(let p=o.parent;p&&p!==batchRoot;p=p.parent)if(carriers.includes(p))return;const key=o.geometry.uuid+o.material.uuid;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(o);});for(const parts of bins.values()){const im=new THREE.InstancedMesh(parts[0].geometry,parts[0].material,parts.length);im.castShadow=true;im.receiveShadow=true;parts.forEach((o,i)=>{im.setMatrixAt(i,new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld));o.removeFromParent();});batchRoot.add(im);}}
 const selection=new THREE.Mesh(new THREE.RingGeometry(3.6,3.85,48),new THREE.MeshBasicMaterial({color:0xffd597,side:THREE.DoubleSide,depthTest:false,transparent:true,opacity:.85}));selection.rotation.x=-Math.PI/2;selection.renderOrder=10;root.add(selection);selection.visible=false;
 function mode(view){hallGroups.forEach((g,i)=>g.visible=view!=='layers'||i===0);offsite.visible=view!=='layers';land.visible=view!=='layers';decks.forEach((g,i)=>g.position.y=view==='layers'&&i===0?9:3.5);roofs.forEach(g=>g.visible=view==='campus');plenums.forEach((g,i)=>{g.visible=view==='layers'&&i===0;g.position.y=18;});}
 function animate(time){carriers.forEach((c,i)=>{const [x,z]=carrierPosition(time+i*7);c.position.set(x,5.5,z);});}
 mode('campus');animate(0);root.updateMatrixWorld(true);
 return {scene,root,hallGroups,decks,roofs,plenums,carriers,selection,mode,animate};
}

export function createWorld(container,onPick){
 const world=buildCampus(),{scene}=world,renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.setClearColor(0x172b3d,0);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;container.append(renderer.domElement);
 scene.add(new THREE.HemisphereLight(0xd1eeff,0x577c64,2.6));const sun=new THREE.DirectionalLight(0xffe3b5,3.1);sun.position.set(-55,100,60);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-105,right:105,top:105,bottom:-105,near:1,far:250});sun.shadow.normalBias=.08;scene.add(sun);const fill=new THREE.DirectionalLight(0x8cbee3,.8);fill.position.set(60,35,-50);scene.add(fill);
 const camera=new THREE.OrthographicCamera(-100,100,70,-70,.1,500),look=new THREE.Vector3(0,2,0),target=look.clone();let w=1,h=1,span=85,targetSpan=85,angle=.62,targetAngle=.62,elevation=.65,targetElevation=.65,view='campus',following=false;
 let entries=[];
 function updateCamera(){const aspect=w/h;camera.left=-span*aspect;camera.right=span*aspect;camera.top=span;camera.bottom=-span;camera.position.set(look.x+Math.sin(angle)*160*Math.cos(elevation),look.y+160*Math.sin(elevation),look.z+Math.cos(angle)*160*Math.cos(elevation));camera.lookAt(look);camera.updateProjectionMatrix();camera.updateMatrixWorld();}
 function resize(){w=Math.max(1,container.clientWidth);h=Math.max(1,container.clientHeight);renderer.setSize(w,h,false);if(view==='campus')targetSpan=Math.max(83,86/(w/h));updateCamera();}
 const ro=new ResizeObserver(resize);ro.observe(container);resize();
 function setView(v){view=v;world.mode(v);following=false;world.selection.visible=false;targetAngle=.62;targetElevation=v==='layers'?.38:.65;if(v==='campus'){target.set(0,2,0);targetSpan=Math.max(83,86/(w/h));}else{target.set(-21,v==='layers'?9:5,26);targetSpan=Math.max(v==='layers'?29:27,26/(w/h));}}
 function select(place,focus=true){if(place.id==='campus'){setView('campus');return;}if(place.view!==view)setView(place.view);following=false;const p=place.position;world.selection.position.set(p[0],view==='layers'?(place.id==='air'?18.5:.8):p[1]-.3,p[2]);world.selection.visible=true;if(focus){target.set(p[0],view==='layers'?9:p[1],p[2]);targetSpan=Math.max(view==='layers'?29:place.view==='campus'?23:16,16/(w/h));}}
 function project(position){const p=new THREE.Vector3(...position).project(camera);return {x:(p.x+1)*w/2,y:(1-p.y)*h/2,visible:p.z>=-1&&p.z<=1&&Math.abs(p.x)<.94&&Math.abs(p.y)<.9};}
 function pick(x,y){const r=container.getBoundingClientRect();if(view==='campus'){const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((x-r.left)/r.width*2-1,1-(y-r.top)/r.height*2),camera);const hit=ray.intersectObjects(world.roofs,true)[0];if(hit){let parent=hit.object;while(parent&&!world.roofs.includes(parent))parent=parent.parent;const index=world.roofs.indexOf(parent);if(index>=0){onPick(['lithography','memory','packaging','test'][index]);return;}}}let nearest=null,best=45;for(const p of entries){if(view==='layers'&&!['subfab','air'].includes(p.id))continue;if(view==='campus'&&p.view!=='campus')continue;if(view==='cleanroom'&&p.view==='layers')continue;const screen=project(p.position),d=Math.hypot(x-r.left-screen.x,y-r.top-screen.y);if(screen.visible&&d<best){best=d;nearest=p;}}if(nearest)onPick(nearest.id);}
 const pointers=new Map();let last=null,moved=0;
 const distance=()=>{const a=[...pointers.values()];return a.length===2?Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y):0;};
 const down=e=>{container.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});last={x:e.clientX,y:e.clientY,d:distance()};moved=0;};
 const move=e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(!last){last={x:e.clientX,y:e.clientY,d:distance()};return;}const dx=e.clientX-last.x,dy=e.clientY-last.y;moved+=Math.abs(dx)+Math.abs(dy);following=false;if(pointers.size===2){const d=distance();if(last.d>0&&d>0)targetSpan=THREE.MathUtils.clamp(targetSpan*last.d/d,9,125);last.d=d;}else if(e.shiftKey||e.buttons===2){targetAngle-=dx*.008;targetElevation=THREE.MathUtils.clamp(targetElevation+dy*.005,.22,1.25);}else{const s=span*2/h;target.x-=dx*s*Math.cos(angle)+dy*s*Math.sin(angle);target.z+=dx*s*Math.sin(angle)-dy*s*Math.cos(angle);}last.x=e.clientX;last.y=e.clientY;};
 const up=e=>{if(!pointers.has(e.pointerId))return;if(moved<6&&pointers.size===1)pick(e.clientX,e.clientY);pointers.delete(e.pointerId);last=null;if(pointers.size){const a=[...pointers.values()][0];last={...a,d:0};}};
 container.addEventListener('pointerdown',down);container.addEventListener('pointermove',move);container.addEventListener('pointerup',up);container.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);last=null;});container.addEventListener('contextmenu',e=>e.preventDefault());container.addEventListener('wheel',e=>{e.preventDefault();following=false;targetSpan=THREE.MathUtils.clamp(targetSpan*Math.exp(e.deltaY*.001),9,125);},{passive:false});
 function render(time,dt){world.animate(time);if(following){const pos=world.carriers[0].getWorldPosition(new THREE.Vector3());target.copy(pos);targetSpan=Math.max(15,15/(w/h));}const a=1-Math.exp(-Math.min(dt,.1)*9);look.lerp(target,a);span+=(targetSpan-span)*a;angle+=(targetAngle-angle)*a;elevation+=(targetElevation-elevation)*a;updateCamera();renderer.render(scene,camera);}
 return {...world,renderer,camera,project,render,select,setView,setPlaces:list=>entries=list,zoomBy:f=>{following=false;targetSpan=THREE.MathUtils.clamp(targetSpan/f,9,125);},rotate:d=>{targetAngle+=d;},fit:()=>setView(view),follow:()=>{setView('cleanroom');following=true;},get view(){return view;},get following(){return following;},dispose(){ro.disconnect();renderer.dispose();}};
}
