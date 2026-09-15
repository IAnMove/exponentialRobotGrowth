import * as THREE from '../vendor/three.module.js';
import {TYPES,WORK,SLOTS,metrics} from './region-model.js';
export const CENTERS=[[-28,-18],[0,-18],[28,-18],[28,15],[-28,15],[0,15]];
export const PLOTS=CENTERS.flatMap(([x,z])=>Array.from({length:SLOTS},(_,slot)=>({x:x+(slot%3-1)*8,z:z+(Math.floor(slot/3)-.5)*10})));
export function createRegionWorld(container){
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;container.append(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-60,60,45,-45,.1,400);scene.add(new THREE.HemisphereLight(0xc8e8ed,0x586d59,2.65));
  const sun=new THREE.DirectionalLight(0xffe4bc,3);sun.position.set(-50,85,35);sun.castShadow=true;sun.shadow.mapSize.set(1536,1536);Object.assign(sun.shadow.camera,{left:-75,right:75,top:70,bottom:-65,near:1,far:200});sun.shadow.normalBias=.12;scene.add(sun);
  const root=new THREE.Group(),staticRoot=new THREE.Group();const cube=new THREE.BoxGeometry(1,1,1),cone=new THREE.ConeGeometry(1,1,6),cylinder=new THREE.CylinderGeometry(1,1,1,10),materials=new Map();
  const mat=color=>{if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.8,metalness:.04}));return materials.get(color);};
  function piece(parent,x,y,z,w,h,d,color,geometry=cube){const o=new THREE.Mesh(geometry,mat(color));o.position.set(x,y,z);o.scale.set(w,h,d);parent.add(o);return o;}
  const box=piece;
  box(staticRoot,0,-1,0,98,2,84,0x203b45);box(staticRoot,0,.06,0,97,.16,83,0x6f9286);
  // A river and its bridges make the map read as a region rather than one factory.
  box(staticRoot,-44,.2,0,5,.1,80,0x5ba4b0);for(let z=-38;z<39;z+=4)box(staticRoot,-44,.27,z,2,.025,.12,0x8cc5c5);
  for(const z of [-33,-2,31]){box(staticRoot,0,.22,z,96,.11,2.8,0x385b64);for(let x=-46;x<46;x+=3)box(staticRoot,x,.285,z,1.15,.01,.09,0xb3c6b4);box(staticRoot,-44,.35,z,6,.22,3.4,0x94b5ad);}
  for(const x of [-14,14]){box(staticRoot,x,.23,-1,2.6,.12,65,0x385b64);for(let z=-31;z<31;z+=3)box(staticRoot,x,.295,z,.09,.01,1.15,0xb3c6b4);}
  for(const [cx,cz] of CENTERS){box(staticRoot,cx,.28,cz,24,.08,1.2,0xabc0ab);for(const x of [cx-8,cx,cx+8])box(staticRoot,x,.28,cz,1.1,.08,13,0xabc0ab);}
  // Small settlement, dispatch square and trees provide scale.
  for(let i=0;i<9;i++){const x=-33+i*5;box(staticRoot,x,1.6,37,3.2,2.7,3.1,0xc2ccb6);box(staticRoot,x,3.2,37,3.5,.55,3.4,i%2?0xa48771:0x628d92);box(staticRoot,x,1.6,38.58,.9,1.4,.06,0x4d727f);box(staticRoot,x+1,2.3,38.6,.45,.45,.04,0xdce6c3);}
  box(staticRoot,29,.32,37,20,.12,8,0x4c7477);for(let i=0;i<15;i++){box(staticRoot,20+i*1.25,.46,40,.85,.15,1.1,0xa0cdb6);box(staticRoot,20+i*1.25,.95,40.6,.3,1,.3,0xd6ded0);}
  for(let i=0;i<62;i++){const x=i<31?-39+i*2.6:-39+(i-31)*2.6,z=i<31?-38:27;if((i>38&&i<45)||i%9===0)continue;piece(staticRoot,x,1.1,z,.18,1.8,.18,0x756f53);piece(staticRoot,x,2.4,z,1.05,2.6,1.05,[0x567f67,0x628d72,0x7aa079][i%3],cone);}
  const buildings=[],scaffolds=[],cranes=[],selection=[];
  PLOTS.forEach(({x,z},index)=>{
    const type=Math.floor(index/SLOTS),slot=index%SLOTS,color=TYPES[type].color;
    box(staticRoot,x,.3,z,7,.12,8,slot===0?0x97b2a2:0x81a190);
    for(const sx of [-3.25,3.25])for(const sz of [-3.7,3.7])box(staticRoot,x+sx,.4,z+sz,.35,.09,.35,0xc3d3b7);
    const g=new THREE.Group();g.position.set(x,.4,z);root.add(g);buildings.push(g);
    if(type===0){for(let k=0;k<3;k++)box(g,.2,-.05+k*.18,0,5.8-k*1.2,.25,6.8-k*1.4,[0x827662,0x9c8a6a,0xb59c76][k]);for(let k=0;k<5;k++){const rock=piece(g,-1.5+(k%3)*1.5,.55,Math.floor(k/3)*1.8-1,1.1,.9,1,0xb4a082,cone);rock.rotation.z=.25*k;}box(g,2,1.1,-2.5,1.4,1.3,1.3,color);const arm=box(g,.5,2,-2.5,3.7,.24,.35,0xd1b078);arm.rotation.z=.35;box(g,-1.15,1.45,-2.5,.3,1,.9,0x43616a);}
    else if(type===4){for(let k=0;k<6;k++){const panel=box(g,(k%2)*2.8-1.4,.85,Math.floor(k/2)*2.15-2.2,2.5,.14,1.65,0x345976);panel.rotation.x=-.32;box(g,(k%2)*2.8-1.4,.4,Math.floor(k/2)*2.15-2.2,.13,.8,1.1,0xc5d6c6);for(let j=0;j<3;j++)box(g,(k%2)*2.8-2.2+j*.7,1,Math.floor(k/2)*2.15-2.2,.035,.04,1.5,0x92b8c6);}box(g,0,.8,3,1.5,1.4,.65,color);}
    else{box(g,0,1.65,-.6,5.5,3.2,4.8,0xc8d8c5);box(g,0,3.35,-.6,5.9,.25,5.2,color);box(g,0,1,1.83,2.5,1.8,.09,0x365967);box(g,0,2.65,1.86,4.8,.42,.06,color);for(const xx of [-2,2])box(g,xx,1.85,1.9,.7,.9,.07,0x8abac6);box(g,-1.4,3.65,-1,1.6,.4,1.5,0x557783);
      if(type===1){for(const xx of [-1.7,1.7]){piece(g,xx,3.2,-2,.55,4.7,.55,0x7c8f88,cylinder);piece(g,xx,5.6,-2,.63,.2,.63,color,cylinder);}piece(g,-2,1.3,2.8,.72,2.1,.72,0xc2c9b0,cylinder);}
      if(type===2){box(g,1,3.7,-1,1.8,.6,1.8,0x4b7f83);for(let a=0;a<3;a++)box(g,-1.6+a*1.4,.6,3,1,.65,.8,color);}
      if(type===3){box(g,0,4.05,-.5,.9,1.1,.6,0xe4eee1);box(g,0,4.75,-.5,.65,.55,.6,0xe4eee1);box(g,0,4.8,-.16,.5,.17,.04,0x375d70);for(const xx of [-.65,.65])box(g,xx,4,-.5,.22,.9,.3,0xe4eee1);}
      if(type===5){for(let a=0;a<5;a++)box(g,-2+a,.6,3, .8,.75,.9,a%2?color:0xb4a285);box(g,0,3.6,-.5,3,.25,1.1,0x738ba3);}}
    const sc=new THREE.Group();sc.position.set(x,.4,z);root.add(sc);scaffolds.push(sc);
    for(const xx of [-3,3])for(const zz of [-3.5,3.5]){box(sc,xx,2.3,zz,.11,4.6,.11,0xd9ba80);box(sc,xx,2.3,0,.1,.1,7,0xd9ba80);}for(const y of [1,3.8])for(const zz of [-3.5,3.5])box(sc,0,y,zz,6.1,.11,.11,0xd9ba80);
    box(sc,2.8,3,2.8,.25,6,.25,0xe0af68);const crane=new THREE.Group();crane.position.set(2.8,6,2.8);sc.add(crane);box(crane,-1.7,0,0,6.7,.23,.23,0xe6bb79);box(crane,1.1,-.35,0,.8,.65,.6,0x415d69);box(crane,-4.6,-1.4,0,.04,2.8,.04,0x496978);box(crane,-4.6,-2.9,0,.6,.35,.55,0xc7b394);cranes.push(crane);
    const ring=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(7.2,.09,8.2)),new THREE.LineBasicMaterial({color:0xffcb8f}));ring.position.set(x,.45,z);ring.visible=false;scene.add(ring);selection.push(ring);
  });
  function batch(group,dynamic){group.updateMatrixWorld(true);const buckets=new Map();group.traverse(o=>{if(!o.isMesh)return;const key=o.geometry.uuid+o.material.uuid;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(o);});const result=[];for(const parts of buckets.values()){const mesh=new THREE.InstancedMesh(parts[0].geometry,parts[0].material,parts.length);mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;if(dynamic)mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);result.push({mesh,parts});}return result;}
  const zero=new THREE.Matrix4().makeScale(0,0,0),staticBatches=batch(staticRoot,false),dynamicBatches=batch(root,true);
  for(const {mesh,parts} of staticBatches){parts.forEach((p,i)=>mesh.setMatrixAt(i,p.matrixWorld));mesh.instanceMatrix.needsUpdate=true;}
  const actorMesh=new THREE.InstancedMesh(cube,mat(0xffffff),192*8);actorMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);actorMesh.castShadow=true;actorMesh.frustumCulled=false;scene.add(actorMesh);const transform=new THREE.Object3D(),tint=new THREE.Color();
  const vehicles=new THREE.InstancedMesh(cube,mat(0xffffff),24*3);vehicles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);vehicles.frustumCulled=false;scene.add(vehicles);
  let zoom=1,targetZoom=1,look=new THREE.Vector3(0,0,0),target=new THREE.Vector3(0,0,0),selected=-1;
  function updateCamera(){zoom+=(targetZoom-zoom)*.15;look.lerp(target,.15);const aspect=container.clientWidth/Math.max(1,container.clientHeight),half=Math.max(35,54/aspect)/zoom;camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.position.set(look.x+85,look.y+105,look.z+110);camera.lookAt(look);camera.updateProjectionMatrix();}
  const ray=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),hit=new THREE.Vector3();
  function resize(){renderer.setSize(container.clientWidth,container.clientHeight,false);updateCamera();}new ResizeObserver(resize).observe(container);resize();
  function instance(mesh,index,x,y,z,w,h,d,color,angle=0){transform.position.set(x,y,z);transform.scale.set(w,h,d);transform.rotation.set(0,angle,0);transform.updateMatrix();mesh.setMatrixAt(index,transform.matrix);mesh.setColorAt(index,tint.set(color));}
  return {
    select(i,focus=true){selected=i;selection.forEach((r,j)=>r.visible=j===i);if(focus){target.set(PLOTS[i].x,0,PLOTS[i].z);targetZoom=container.clientWidth<700?2.8:2.1;}},
    fit(){target.set(0,0,0);targetZoom=1;},zoomBy(f){targetZoom=THREE.MathUtils.clamp(targetZoom*f,.75,4);},
    pan(dx,dy){const u=(camera.top-camera.bottom)/container.clientHeight;target.x=THREE.MathUtils.clamp(target.x-dx*u*.79-dy*u*.8,-48,48);target.z=THREE.MathUtils.clamp(target.z+dx*u*.61-dy*u*1.04,-40,42);},
    pick(x,y){const rect=container.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1),camera);if(!ray.ray.intersectPlane(plane,hit))return -1;return PLOTS.findIndex(p=>Math.abs(p.x-hit.x)<3.8&&Math.abs(p.z-hit.z)<4.3);},
    project(type){const [x,z]=CENTERS[type],p=new THREE.Vector3(x,2,z-9).project(camera);return {x:(p.x+1)*container.clientWidth/2,y:(1-p.y)*container.clientHeight/2};},
    render(s,motion){
      updateCamera();s.sites.forEach((p,i)=>{buildings[i].visible=p.status!=='empty';buildings[i].scale.y=p.status==='building'?.08+.92*p.progress/WORK:1;scaffolds[i].visible=p.status==='building';cranes[i].rotation.y=Math.sin(motion*.45+i)*.65;});root.updateMatrixWorld(true);
      for(const {mesh,parts} of dynamicBatches){parts.forEach((p,i)=>{let visible=true;for(let a=p;a;a=a.parent)if(!a.visible){visible=false;break;}mesh.setMatrixAt(i,visible?p.matrixWorld:zero);});mesh.instanceMatrix.needsUpdate=true;}
      const live=metrics(s),group=Math.max(1,Math.ceil(s.fleet/192)),number=Math.ceil(s.fleet/group),builders=Math.round(live.builders/group),workers=Math.round(live.working/group),projects=s.sites.map((p,i)=>({...p,index:i})).filter(p=>p.status==='building'),open=s.sites.map((p,i)=>({...p,index:i})).filter(p=>p.status==='open');
      for(let i=0;i<number;i++){
        const building=i<builders&&projects.length,working=i>=builders&&i<builders+workers;let x,z,angle=0;
        if(building||working){const list=building?projects:open,p=list[(building?i:i-builders)%list.length],at=PLOTS[p.index],phase=motion*(building?.7:.4)+i*2.4;x=at.x+Math.sin(phase)*2.6;z=at.z+3.2+Math.cos(phase)*.5;angle=Math.cos(phase)>0?Math.PI/2:-Math.PI/2;}
        else{x=20+(i%14)*1.25;z=34+Math.floor(Math.max(0,i-builders-workers)/14)*.46;}
        const color=building?0xf2bc7e:working?0xe6efe1:0x8eafba,y=.4,gait=(building||working)?Math.sin(motion*5+i)*.15:0;
        const parts=[[0,.85,0,.38,.5,.28,color],[0,1.32,0,.36,.34,.32,color],[0,1.34,.18,.27,.095,.04,0x285667],[-.26,.8,gait,.12,.48,.14,color],[.26,.8,-gait,.12,.48,.14,color],[-.11,.3,gait,.14,.5,.18,0x355260],[.11,.3,-gait,.14,.5,.18,0x355260],[0,.56,0,.3,.14,.26,0x355260]];
        parts.forEach(([px,py,pz,w,h,d,c],j)=>{const xx=px*Math.cos(angle)+pz*Math.sin(angle),zz=-px*Math.sin(angle)+pz*Math.cos(angle);instance(actorMesh,i*8+j,x+xx,y+py,z+zz,w,h,d,c,angle);});
      }
      actorMesh.count=number*8;actorMesh.instanceMatrix.needsUpdate=true;actorMesh.instanceColor.needsUpdate=true;
      const moving=s.flow.slice(0,4).some(x=>x>0),vehicleCount=moving?Math.min(24,Math.ceil(s.flow[5]/4)):0;
      for(let i=0;i<vehicleCount;i++){const z=[-33,-2,31][i%3],x=((motion*2.8+i*13)%86)-43;instance(vehicles,i*3,x,.55,z,1.9,.6,.9,0x335762);instance(vehicles,i*3+1,x+.6,1,z,.65,.55,.86,0xd8dfca);instance(vehicles,i*3+2,x-.45,.95,z,.95,.48,.8,[0xddb180,0x9cc8b5,0x9dbadb][i%3]);}vehicles.count=vehicleCount*3;vehicles.instanceMatrix.needsUpdate=true;if(vehicles.instanceColor)vehicles.instanceColor.needsUpdate=true;
      renderer.render(scene,camera);return group;
    }
  };
}
