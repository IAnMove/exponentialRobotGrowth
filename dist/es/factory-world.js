import * as THREE from '../vendor/three.module.js';
import {STATIONS,capacity,status,robotDuty,humanWorking} from './factory-model.js';

export const POSITIONS=[[-11,-4],[-2,-4],[7,-4],[7,5],[-2,5]];
export function createFactoryWorld(container){
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;container.append(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-25,25,20,-20,.1,200);
  const hemi=new THREE.HemisphereLight(0xd2ecff,0x647c75,2.7);scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xffe8c6,3.2);sun.position.set(-18,35,18);sun.castShadow=true;sun.shadow.mapSize.set(1536,1536);Object.assign(sun.shadow.camera,{left:-28,right:28,top:24,bottom:-24,near:1,far:90});sun.shadow.normalBias=.05;scene.add(sun);
  const fill=new THREE.DirectionalLight(0x91bce6,.8);fill.position.set(20,20,-15);scene.add(fill);
  const mats=new Map(),cube=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(1,1,1,12),ball=new THREE.SphereGeometry(1,10,8);
  const mat=(color,glow=0)=>{const key=color+':'+glow;if(!mats.has(key))mats.set(key,new THREE.MeshStandardMaterial({color,roughness:.66,metalness:.06,emissive:glow?color:0,emissiveIntensity:glow}));return mats.get(key);};
  function box(parent,x,y,z,w,h,d,color){const m=new THREE.Mesh(cube,typeof color==='number'?mat(color):color);m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function cyl(parent,x,y,z,r,h,color){const m=new THREE.Mesh(cylinder,mat(color));m.position.set(x,y,z);m.scale.set(r,h,r);m.castShadow=true;parent.add(m);return m;}
  function sphere(parent,x,y,z,r,color){const m=new THREE.Mesh(ball,mat(color));m.position.set(x,y,z);m.scale.setScalar(r);m.castShadow=true;parent.add(m);return m;}
  const floor=new THREE.Group();scene.add(floor);
  box(floor,-1,.05,1,36,.9,28,0x1b3545);box(floor,-1,.55,1,35.6,.15,27.6,0x8caeab);
  for(let x=-18;x<17;x+=2)for(let z=-12;z<15;z+=2)box(floor,x+.8,.643,z+.8,1.94,.025,1.94,(x+z)%4?0x9db7af:0x98b3af);
  function floorSign(text,x,z,width){const c=document.createElement('canvas');c.width=768;c.height=96;const ctx=c.getContext('2d');ctx.font='600 40px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#254957';ctx.fillText(text,384,48);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;const sign=new THREE.Mesh(new THREE.PlaneGeometry(width,1.2),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));sign.rotation.x=-Math.PI/2;sign.position.set(x,.685,z);floor.add(sign);}
  floorSign('KITS · ESTRUCTURA + ACTUADORES + CONTROL',-9,-7.6,14);floorSign('ROBOTS TERMINADOS',-11,7.6,8);floorSign('DESCANSO',-10,14.1,5.5);floorSign('RECARGA Y SERVICIO',7,14.1,9);
  // A roofless miniature: back wall, windows, conduit and a loading entrance.
  box(floor,-1,2.25,-12.7,35.7,3.35,.3,0xc7d9d4);box(floor,-1,4,-12.7,36,.2,.5,0x3e6271);
  const windowMat=mat(0xa1d8e1,.2);
  for(let x=-15;x<15;x+=5){box(floor,x,2.65,-12.48,3.6,1.6,.08,0x456778);box(floor,x,2.65,-12.4,3.35,1.37,.08,windowMat);box(floor,x,2.65,-12.31,.08,1.5,.05,0xcbdedc);}
  box(floor,16.6,1.5,-5,.25,1.7,15,0xb5cec8);box(floor,16.6,2.4,-5,.4,.15,15,0x3e6271);
  for(const x of [-17,16]){box(floor,x,3,-12,.35,4.8,.35,0x36546a);box(floor,x,5.4,-12,.7,.2,.7,0xffbd76);}
  for(let x=-17;x<16;x+=1.4){box(floor,x,.68,10.1,.7,.02,.15,0xece4b5);}
  // Rails carry the work through the U-shaped line.
  const route=[[-16,-4],...POSITIONS,[-11,5]],rollers=[];
  for(let k=0;k<route.length-1;k++){
    const [ax,az]=route[k],[bx,bz]=route[k+1],length=Math.hypot(bx-ax,bz-az),g=new THREE.Group();g.position.set((ax+bx)/2,0,(az+bz)/2);g.rotation.y=-Math.atan2(bz-az,bx-ax);floor.add(g);
    box(g,0,1.2,0,length,.34,1.55,0x2e495a);box(g,0,1.4,0,length,.07,1.24,0x506976);
    for(const z of [-.78,.78])box(g,0,1.53,z,length,.1,.09,0xe0e9dc);
    for(let x=-length/2+.2;x<length/2;x+=.42){const r=cyl(g,x,1.47,0,.07,1.23,0x98b5bf);r.rotation.x=Math.PI/2;rollers.push(r);}
    for(const x of [-length*.34,length*.34])for(const z of [-.58,.58])box(g,x,.93,z,.12,.8,.12,0x304e60);
    // Flat arrows communicate direction, without depending on animation.
    const sign=bx<ax||bz<az?-1:1;
    for(let x=-length/2+1.5;x<length/2-1;x+=2.5){for(const d of [-1,1]){const a=box(g,x,.72,1.35,.48,.02,.08,0xe2dfb5);a.rotation.y=d*.6*sign;a.position.z+=d*.13;}}
  }
  const stations=[],selectMeshes=[],phones=[],stockMeshes=[],people=[],robots=[],lamps=[],scanners=[];
  function phone(parent,stage=0){const g=new THREE.Group();parent.add(g);box(g,0,.02,0,.38,.16,.42,stage>0?0xddebdc:0x6d9f9b);box(g,0,.03,-.38,.28,.18,.25,stage>0?0xe5efe0:0x81afa7);if(stage>0)box(g,0,.13,-.39,.19,.025,.12,0x29495b);for(const sign of [-1,1]){box(g,sign*.1,.01,.45,.13,.13,.42,stage>=2?0x385568:0x779b94);if(stage>=1)box(g,sign*.32,.02,.04,.12,.13,.44,0xddebdc);}return g;}

  POSITIONS.forEach(([x,z],i)=>{
    const g=new THREE.Group();g.position.set(x,.66,z);floor.add(g);
    const platform=box(g,0,.015,0,7.5,.03,5.9,0x759b98);platform.userData.station=i;selectMeshes.push(platform);
    const ring=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(7.5,.06,5.9)),new THREE.LineBasicMaterial({color:STATIONS[i].color}));ring.position.y=.05;g.add(ring);
    box(g,0,.65,-.25,4.4,1.1,1.9,0xbfd5cf);box(g,0,1.25,-.25,4.65,.14,2.15,0xe7e9d9);box(g,0,.75,.73,4.35,.5,.04,STATIONS[i].color);
    for(const xx of [-2,2])box(g,xx,.7,-1.15,.13,1.3,.13,0x385565);
    box(g,1.6,1.9,-.9,.95,.7,.12,0x284857);box(g,1.6,1.9,-.81,.77,.5,.04,mat(0x91dbc8,.35));
    cyl(g,2.65,1.5,-1.5,.075,2.7,0x365366);const lamp=cyl(g,2.65,2.85,-1.5,.17,.35,0x9dd7ba);lamp.material=mat(0x9dd7ba,.5);lamps.push(lamp);
    if(i===1){for(const xx of [-.9,.9]){box(g,xx,1.65,-.7,.12,.8,.12,0x41616e);box(g,xx,2.1,-.5,.65,.16,.3,STATIONS[i].color);}}
    if(i===2){for(let a=0;a<3;a++){box(g,-1.2+a*.43,1.4,-.7,.3,.08,.55,0x7ea8c2);box(g,-1.2+a*.43,1.48,-.7,.27,.03,.5,0x294855);}}
    if(i===3){for(const xx of [-1.4,1.4])box(g,xx,2,-.25,.15,1.6,.15,0x365565);box(g,0,2.8,-.25,3,.2,.35,0xe5d99e);const scan=box(g,0,1.44,0,2.5,.02,.045,mat(0x8fffd1,1.5));scanners.push(scan);}
    if(i===4){for(let n=0;n<4;n++)box(g,-1.4+n*.45,1.42,-.65,.4,.14,.65,0xdbc296);}
    const job=phone(g,i);job.position.set(0,1.43,.18);phones.push(job);
    const queue=[];for(let n=0;n<16;n++){const item=phone(g,Math.max(0,i-1));item.position.set(-3+(n%4)*.55,.22+Math.floor(n/8)*.14,-1.5+Math.floor(n%8/4)*.95);queue.push(item);}stockMeshes.push(queue);
    stations.push({g,ring,platform});
  });
  // Supply racks and dispatch boxes make the input and output distinct.
  for(let n=0;n<3;n++){const x=-14+n*3.2;box(floor,x,1.95,-9.3,2.8,2.6,.12,0x36596a);for(const y of [.85,1.8,2.75]){box(floor,x,y,-9.8,2.8,.12,1.7,0x597d87);for(let a=0;a<3;a++)box(floor,x-1+a*.9,y+.34,-9.6,.68,.57,1.05,n===0?0xc3ac85:n===1?0x93b5be:0x88bcae);}}
  box(floor,-12, .8,5,5,.27,3,0x9e8d70);const packages=[];
  for(let n=0;n<20;n++){const b=phone(floor,4);b.rotation.x=Math.PI/2;b.position.set(-14+(n%5)*.85,1.3,3+Math.floor(n/5)*.75);packages.push(b);}
  // Break room and charging bays remain inside the same scene.
  box(floor,-10,.69,12.15,12,.035,4.2,0x7eaaa4);box(floor,-12,1.13,13.3,5,.8,.9,0xe5b17f);box(floor,-12,1.63,13.75,5,.65,.14,0xe5b17f);
  for(let n=0;n<3;n++){const x=-13+n*3.2;cyl(floor,x,1.37,11.5,.8,.12,0xe2dcc5);cyl(floor,x,1,11.5,.1,.7,0x446574);cyl(floor,x+.2,1.53,11.5,.09,.2,0xeaf0dc);}
  box(floor,-5,1.8,13,1.2,2.2,1,0x35576b);box(floor,-5,2.12,13.53,.75,.6,.06,0x9ed0c5);
  box(floor,7,.69,12.15,14,.04,4.2,0x668f97);
  for(let n=0;n<10;n++){const x=1.4+n*1.18;box(floor,x,.73,12.6,.92,.06,1.8,0x8dc9c0);box(floor,x,1.32,13.4,.4,1.25,.25,0xd2e4dd);box(floor,x,1.55,13.56,.2,.35,.04,mat(0x90ead2,.8));}
  for(const [x,z] of [[-17,12],[15,12],[14,-10]]){cyl(floor,x,1.1,z,.5,.85,0xdfcfb3);cyl(floor,x,1.7,z,.1,.8,0x7c8264);sphere(floor,x,2.25,z,.85,0x70a78f);}
  function actor(human,id){
    const g=new THREE.Group();floor.add(g);const jacket=human?[0x7cb0c6,0x6d9caf,0x84b8ad][id%3]:0xe9f3e9,skin=[0xe0b38c,0x9e6c4b,0xc28c60,0x744e39][id%4];
    box(g,0,.89,0,.43,.55,.28,jacket);box(g,0,.58,0,.34,.13,.26,0x284557);
    const head=sphere(g,0,1.39,0,.24,human?skin:0xe9f3e9);if(!human){head.scale.y=.84;box(g,0,1.43,.2,.38,.13,.07,0x23495b);box(g,0,1.43,.24,.22,.035,.03,mat(0x92e2d6,.5));}else{sphere(g,0,1.57,0,.25,0xffce79).scale.y=.42;box(g,0,1.54,.025,.57,.045,.5,0xffce79);}
    const arms=[],legs=[];
    for(const side of [-1,1]){const arm=new THREE.Group();g.add(arm);arm.position.set(side*.31,1.09,0);box(arm,0,-.23,0,.13,.45,.15,jacket);sphere(arm,0,-.47,0,.09,human?skin:0xe6f1e5);arms.push(arm);const leg=new THREE.Group();g.add(leg);leg.position.set(side*.12,.56,0);box(leg,0,-.24,0,.15,.45,.17,0x29475a);box(leg,0,-.48,.055,.2,.12,.32,0x203b4f);legs.push(leg);}
    return {g,arms,legs,id,pos:new THREE.Vector3(),initialized:false};
  }
  for(let i=0;i<10;i++){people.push(actor(true,i));robots.push(actor(false,i));robots[i].g.visible=false;}
  // Reuse geometry on mobile: hundreds of static details and character parts
  // are submitted in material batches instead of separate draw calls.
  const actorBatches=new Map();
  for(const a of [...people,...robots]){
    floor.remove(a.g);
    a.g.traverse(o=>{if(!o.isMesh)return;const key=o.geometry.uuid+o.material.uuid;if(!actorBatches.has(key))actorBatches.set(key,{parts:[],mesh:null});actorBatches.get(key).parts.push({o,a});});
  }
  for(const b of actorBatches.values()){b.mesh=new THREE.InstancedMesh(b.parts[0].o.geometry,b.parts[0].o.material,b.parts.length);b.mesh.castShadow=true;b.mesh.frustumCulled=false;b.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(b.mesh);}
  const animated=new Set([...phones,...stockMeshes.flat(),...packages,...lamps,...scanners]);
  const staticBatches=new Map();floor.updateMatrixWorld(true);
  floor.traverse(o=>{if(!o.isMesh)return;for(let p=o;p&&p!==floor;p=p.parent)if(animated.has(p))return;const key=o.geometry.uuid+o.material.uuid;if(!staticBatches.has(key))staticBatches.set(key,[]);staticBatches.get(key).push(o);});
  for(const parts of staticBatches.values()){const m=new THREE.InstancedMesh(parts[0].geometry,parts[0].material,parts.length);m.castShadow=true;m.receiveShadow=true;parts.forEach((o,i)=>{m.setMatrixAt(i,o.matrixWorld);o.removeFromParent();});m.instanceMatrix.needsUpdate=true;scene.add(m);}
  const productBatches=new Map();
  for(const owner of [...phones,...stockMeshes.flat(),...packages])owner.traverse(o=>{if(!o.isMesh)return;const key=o.geometry.uuid+o.material.uuid;if(!productBatches.has(key))productBatches.set(key,{parts:[],mesh:null});productBatches.get(key).parts.push({o,owner});o.visible=false;});
  for(const b of productBatches.values()){b.mesh=new THREE.InstancedMesh(b.parts[0].o.geometry,b.parts[0].o.material,b.parts.length);b.mesh.castShadow=true;b.mesh.frustumCulled=false;b.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(b.mesh);}
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),look=new THREE.Vector3(-1,0,1),targetLook=look.clone();let zoom=1,targetZoom=1,w=1,h=1,selected=1,lastMotion=0;
  function resize(){w=container.clientWidth;h=container.clientHeight;renderer.setSize(w,h,false);updateCamera();}
  function updateCamera(){const aspect=w/h,size=Math.max(16,24/aspect);camera.left=-size*aspect/zoom;camera.right=size*aspect/zoom;camera.top=size/zoom;camera.bottom=-size/zoom;camera.position.set(look.x+26,37,look.z+43);camera.lookAt(look);camera.updateProjectionMatrix();camera.updateMatrixWorld();}
  function select(i,focus=true){selected=i;if(focus){targetZoom=w<680?2.4:1.8;targetLook.set(POSITIONS[i][0],0,POSITIONS[i][1]);}}
  function fit(){targetZoom=1;targetLook.set(-1,0,1);}
  function zoomBy(factor){targetZoom=THREE.MathUtils.clamp(targetZoom*factor,.7,3.8);}
  function pan(dx,dy){const scale=(camera.right-camera.left)/w;targetLook.x-=dx*scale*.85+dy*scale*.6;targetLook.z+=dx*scale*.51-dy*scale;targetLook.x=THREE.MathUtils.clamp(targetLook.x,-24,24);targetLook.z=THREE.MathUtils.clamp(targetLook.z,-19,22);}
  function pick(x,y){const r=container.getBoundingClientRect();pointer.set((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(selectMeshes)[0]?.object.userData.station;}
  const temp=new THREE.Vector3();function project(i){const [x,z]=POSITIONS[i];temp.set(x,3.7,z-.8).project(camera);return {x:(temp.x+1)*w/2,y:(1-temp.y)*h/2};}
  function pose(a,target,working,motion,delta){
    if(!a.initialized){a.pos.copy(target);a.initialized=true;}
    const distance=a.pos.distanceTo(target),walking=distance>.12;
    if(walking){const d=target.clone().sub(a.pos);a.g.rotation.y=Math.atan2(d.x,d.z);a.pos.addScaledVector(d,Math.min(1,delta*5/distance));}else a.g.rotation.y=Math.PI;
    a.g.position.copy(a.pos);const gait=Math.sin(motion*9+a.id)*.6;
    a.arms.forEach((arm,n)=>arm.rotation.x=walking?(n?gait:-gait):working?-.95+Math.sin(motion*4+a.id+n)*.24:0);
    a.legs.forEach((leg,n)=>leg.rotation.x=walking?(n?-gait:gait):0);
    a.g.position.y+=walking?Math.abs(Math.sin(motion*9))*.035:0;
  }
  function render(s,motion,bottleneck){
    const delta=Math.min(.08,Math.max(0,motion-lastMotion));lastMotion=motion;zoom+=(targetZoom-zoom)*.13;look.lerp(targetLook,.13);updateCamera();
    const hour=(s.time+8)%24,light=THREE.MathUtils.smoothstep(Math.sin((hour-6)/24*Math.PI*2),-.12,.45);
    hemi.intensity=.7+light*2;sun.intensity=.12+light*3.1;fill.intensity=.7+(1-light)*.8;windowMat.emissiveIntensity=.12+(1-light)*1.1;
    container.parentElement.style.background=light>.5?'radial-gradient(ellipse at 45% 50%,#354c60,#1a2c3d 76%)':'radial-gradient(ellipse at 45% 50%,#263956,#122139 76%)';
    stations.forEach((st,i)=>{
      const state=status(s,i),active=state.code==='working';st.ring.material.color.set(i===selected?0xc4ffe9:i===bottleneck?0xe6bc66:0x779b9b);st.ring.position.y=i===selected?.09:.05;
      lamps[i].material=mat(active?0xa7e0bf:state.code==='blocked'?0xf2a35d:0x7492aa,.45);
      phones[i].visible=s.jobs[i]!==null;
      const travel=THREE.MathUtils.clamp((s.jobs[i]??1)/.24,0,1),[px,pz]=i===0?[-16,-4]:POSITIONS[i-1],[x,z]=POSITIONS[i];
      phones[i].position.set((px-x)*(1-travel),1.43,(pz-z)*(1-travel)+.18*travel);
      stockMeshes[i].forEach((p,n)=>{p.visible=n<s.queues[i];});
    });
    scanners.forEach(o=>o.position.z=status(s,3).code==='working'?Math.sin(motion*2)*.5:0);
    packages.forEach((p,n)=>p.visible=n<Math.min(20,s.total-s.deployed));
    people.forEach((a,id)=>{
      const i=Math.floor(id/2),slot=id%2,[x,z]=POSITIONS[i],replaced=slot<s.robots[i].length;
      const atWork=!replaced&&humanWorking(s.time),dest=atWork?new THREE.Vector3(x+(slot?1:-1),.68,z+1.7):new THREE.Vector3(-14+(id%5)*1.9,.68,11+(id<5?0:1.9));
      pose(a,dest,atWork&&status(s,i).code==='working',motion,delta);
    });
    robots.forEach((a,id)=>{
      const i=Math.floor(id/2),slot=id%2,[x,z]=POSITIONS[i];a.g.visible=slot<s.robots[i].length;if(!a.g.visible)return;
      const duty=robotDuty(s,i,slot),ready=s.robots[i][slot],atWork=duty==='working'||duty==='arriving';
      const origin=duty==='arriving'?new THREE.Vector3(-12,.68,5):new THREE.Vector3(1.4+id*1.18,.68,12.6),work=new THREE.Vector3(x+(slot?1:-1),.68,z+1.7);
      const dest=duty==='arriving'?origin.clone().lerp(work,THREE.MathUtils.clamp(1-(ready-s.time)/.25,0,1)):atWork?work:origin;
      if(!a.initialized){a.pos.copy(origin);a.initialized=true;}pose(a,dest,duty==='working'&&status(s,i).code==='working',motion,delta);
    });
    for(const a of [...people,...robots])a.g.updateMatrixWorld(true);
    for(const b of actorBatches.values()){let n=0;for(const {o,a} of b.parts)if(a.g.visible)b.mesh.setMatrixAt(n++,o.matrixWorld);b.mesh.count=n;b.mesh.instanceMatrix.needsUpdate=true;}
    floor.updateMatrixWorld(true);for(const b of productBatches.values()){let n=0;for(const {o,owner} of b.parts)if(owner.visible)b.mesh.setMatrixAt(n++,o.matrixWorld);b.mesh.count=n;b.mesh.instanceMatrix.needsUpdate=true;}
    renderer.render(scene,camera);
  }
  new ResizeObserver(resize).observe(container);resize();
  return {render,select,fit,zoomBy,pan,pick,project,renderer};
}
