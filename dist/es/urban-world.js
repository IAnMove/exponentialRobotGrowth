import * as THREE from '../vendor/three.module.js';
import {TYPES,WORK} from './region-model.js';
const DISTRICTS=[[-28,-20],[0,-20],[28,-20],[-28,15],[0,15],[28,15]];
const INDUSTRIES=[[-40,20],[0,20],[40,20],[-40,47],[0,47],[40,47]];
const TOWNS=[[-44,-25],[0,-40],[44,-25]];
const COLORS=[0x67bcec,0xeeb478,0xd7ca8d,0x82cdb4,0xea9baf,0xb3a7e2];

// Shared city/territory renderer. Geometry represents the simulated places and flows.
export function createUrbanWorld(container,{regional=false}={}){
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0x101e32,1);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;container.append(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-70,70,55,-55,.1,500);
 scene.add(new THREE.HemisphereLight(0xccedff,0x283e53,3));const sun=new THREE.DirectionalLight(0xffe8c2,3);sun.position.set(-40,100,60);sun.castShadow=true;sun.shadow.mapSize.set(1536,1536);Object.assign(sun.shadow.camera,{left:-95,right:95,top:95,bottom:-95,near:1,far:250});sun.shadow.normalBias=.15;scene.add(sun);
 const cube=new THREE.BoxGeometry(1,1,1),cone=new THREE.ConeGeometry(1,1,6),cyl=new THREE.CylinderGeometry(1,1,1,12),mats=new Map(),fixed=new THREE.Group();
 function mat(c){if(!mats.has(c))mats.set(c,new THREE.MeshStandardMaterial({color:c,roughness:.7}));return mats.get(c);}
 function box(g,x,y,z,w,h,d,c,geo=cube){const o=new THREE.Mesh(geo,mat(c));o.position.set(x,y,z);o.scale.set(w,h,d);g.add(o);return o;}
 function road(x,z,w,d){box(fixed,x,.16,z,w,.15,d,0x263c51);if(w>d){for(let a=x-w/2+2;a<x+w/2;a+=4)box(fixed,a,.25,z,1.6,.02,.12,0x8ca8b5);}else for(let a=z-d/2+2;a<z+d/2;a+=4)box(fixed,x,.25,a,.12,.02,1.6,0x8ca8b5);}
 function tree(x,z,k){box(fixed,x,.9,z,.22,1.7,.22,0x756b54);box(fixed,x,2.1,z,1,2.1,1,[0x437e70,0x539383,0x6da98e][k%3],cone);}
 const size=regional?142:104,depth=regional?132:96;
 box(fixed,0,-1,0,size,2,depth,0x1b344a);box(fixed,0,.01,0,size-.3,.1,depth-.3,0x4e7774);
 const riverX=regional?-66:-47;box(fixed,riverX,.1,0,5,.1,depth-1,0x328fb0);
 for(let z=-depth/2+3;z<depth/2;z+=4)box(fixed,riverX,.19,z,2,.02,.15,0x7dd9e7);
 const centers=regional?INDUSTRIES:DISTRICTS;
 if(regional){road(0,3,139,5);road(0,-19,4,85);road(-44,-10,3,30);road(44,-10,3,30);road(0,33,112,4);road(-20,32,3,65);road(20,32,3,65);}
 else{for(const z of [-36,-3,33])road(0,z,101,4);for(const x of [-14,14])road(x,-2,3,70);road(-40,0,3,70);road(40,0,3,70);}
 const structures=[],pickPoints=[],highlights=[],zoneMarkers=[];
 function building(g,x,z,w,d,h,type,k){
  box(g,x,h/2+.3,z,w,h,d,[0xb6c8cd,0x8ba8b8,0xd2d9cd][k%3]);box(g,x,h+.4,z,w+.35,.3,d+.35,COLORS[type]);
  for(let y=1.2;y<h;y+=1.4)for(const xx of [-.28,.28])box(g,x+w*xx,y,z+d/2+.025,w*.23,.55,.05,0x375b76);
  box(g,x,.9,z+d/2+.06,.8,1.3,.08,0x243f57);
  if(type===1){box(g,x,1.9,z+d/2+.6,w+.4,.18,1.3,COLORS[type]);}
  if(type===4&&k===0){box(g,x,h+1.15,z,.32,1.25,.3,0xef91a1);box(g,x,h+1.15,z,1.2,.32,.3,0xef91a1);}
  if(type===5&&k===0){box(g,x,h+.9,z,1.8,.7,1,0xdbe5d5);}
 }
 function ring(x,z,w,d){const r=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w,.06,d)),new THREE.LineBasicMaterial({color:0x6deed2}));r.position.set(x,.35,z);r.visible=false;scene.add(r);return r;}
 if(!regional){
  DISTRICTS.forEach(([x,z],type)=>{
   box(fixed,x,.2,z,25,.2,28,0x809b94);road(x,z+10,24,2);road(x,z-1,24,2);
   for(let k=0;k<6;k++){const bx=x+(k%3-1)*7.6,bz=z+(k<3?-7:4),g=new THREE.Group();building(g,bx,bz,5.4,5.3,3.4+((k+type)%3)*1.9,type,k);fixed.add(g);pickPoints.push({x:bx,z:bz,type});}
   const led=new THREE.Mesh(new THREE.BoxGeometry(22,.08,1),mat(0x63edd1));led.position.set(x-11,.34,z+13);scene.add(led);zoneMarkers.push({mesh:led,x,z:z+13,width:22});highlights.push(ring(x,z,25.5,28.5));
   for(let k=0;k<3;k++){tree(x-10+k*9,z+12,k);box(fixed,x-8+k*8,.5,z+9,2,.45,.7,0xb99571);}
   if(type===2){box(fixed,x+8,6,z+4,.3,12,.3,0xf1ba64);box(fixed,x+4,12,z+4,10,.25,.3,0xf1ba64);}
  });
  // Arrival terminal and parked delivery van lie outside the neighbourhoods.
  box(fixed,-43,.3,34,10,.3,11,0x9ab0a3);box(fixed,-43,2,39,9,3,3,0x678ea3);box(fixed,-43,3.7,39,9.4,.3,3.5,0x76cbbd);
 }else{
  INDUSTRIES.forEach(([x,z],type)=>{
   box(fixed,x,.15,z,30,.16,21,0x729386);
   for(let slot=0;slot<6;slot++){const bx=x+(slot%3-1)*9,bz=z+(slot<3?-5:5),g=new THREE.Group();g.position.set(bx,.3,bz);scene.add(g);structures.push(g);pickPoints.push({x:bx,z:bz,type});
    box(fixed,bx,.27,bz,8,.08,8,0x8ea69a);
    if(type===0){for(let k=0;k<3;k++)box(g,0,.2+k*.18,0,7-k*1.6,.3,7-k*1.6,[0x857862,0xaa9170,0xd1b387][k]);box(g,2,1,-2,1.3,1.4,1.5,0xe5b877);}
    else if(type===4){for(let k=0;k<4;k++){const panel=box(g,(k%2)*3-1.5,1,Math.floor(k/2)*3-1.5,2.6,.14,2.2,0x2d5378);panel.rotation.x=-.3;box(g,(k%2)*3-1.5,.5,Math.floor(k/2)*3-1.5,.18,1,.2,0xb6cec5);}}
    else{building(g,0,0,6,5,2.5,type,0);if(type===1){box(g,2,3,-1,.5,5,.5,0x90a6a8,cyl);}if(type===3){box(g,0,3.7,0,.8,1.2,.7,0xe4f4e7);box(g,0,4.6,0,.65,.6,.6,0xe4f4e7);}}
    highlights.push(ring(bx,bz,8.4,8.4));
   }
  });
  TOWNS.forEach(([x,z],i)=>{
   box(fixed,x,.18,z,32,.22,28,0x94aaa0);road(x,z,31,2);road(x,z,2,26);
   for(let k=0;k<12;k++){const bx=x+(k%4-1.5)*7,bz=z+(Math.floor(k/4)-1)*8.5;const g=new THREE.Group();building(g,bx,bz,4.6,4.9,3+(k*3+i)%6,(k+i)%6,k);fixed.add(g);}
   const led=new THREE.Mesh(new THREE.BoxGeometry(29,.09,1),mat(0x63edd1));led.position.set(x-14.5,.35,z+15);scene.add(led);zoneMarkers.push({mesh:led,x,z:z+15,width:29});highlights.push(ring(x,z,33,29));
   for(let k=0;k<4;k++)tree(x-12+k*8,z+13,k);
  });
 }
 for(let k=0;k<45;k++){const x=-size/2+7+(k%15)*(size-14)/15,z=k<15?-depth/2+4:k<30?depth/2-4:3;if(k<30||Math.abs(x)>54)tree(x,z,k);}
 // Batch every static building/window/tree by material and geometry.
 fixed.updateMatrixWorld(true);const buckets=new Map();fixed.traverse(o=>{if(!o.isMesh)return;const key=o.geometry.uuid+o.material.uuid;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(o);});
 for(const parts of buckets.values()){const mesh=new THREE.InstancedMesh(parts[0].geometry,parts[0].material,parts.length);parts.forEach((p,i)=>mesh.setMatrixAt(i,p.matrixWorld));mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);}
 const dynamicRoot=new THREE.Group(),dynamicBuckets=new Map();structures.forEach(g=>{scene.remove(g);dynamicRoot.add(g);});dynamicRoot.updateMatrixWorld(true);dynamicRoot.traverse(o=>{if(!o.isMesh)return;const key=o.geometry.uuid+o.material.uuid;if(!dynamicBuckets.has(key))dynamicBuckets.set(key,[]);dynamicBuckets.get(key).push(o);});const dynamic=[];for(const parts of dynamicBuckets.values()){const mesh=new THREE.InstancedMesh(parts[0].geometry,parts[0].material,parts.length);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;scene.add(mesh);dynamic.push({mesh,parts});}const zero=new THREE.Matrix4().makeScale(0,0,0);
 const actors=new THREE.InstancedMesh(cube,mat(0xffffff),400*7),vehicles=new THREE.InstancedMesh(cube,mat(0xffffff),60*3);actors.instanceMatrix.setUsage(THREE.DynamicDrawUsage);vehicles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);actors.castShadow=vehicles.castShadow=true;actors.frustumCulled=vehicles.frustumCulled=false;scene.add(actors,vehicles);
 const transform=new THREE.Object3D(),tint=new THREE.Color();
 function put(mesh,i,x,y,z,w,h,d,c){transform.position.set(x,y,z);transform.rotation.set(0,0,0);transform.scale.set(w,h,d);transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);mesh.setColorAt(i,tint.set(c));}
 function person(i,x,z,robot,motion,scale=1){const c=robot?0xe1f8f0:0xefad74,gait=Math.sin(motion*5+i)*.16;
  const p=[[0,.95,0,.4,.55,.3,c],[0,1.4,0,.36,.32,.32,robot?c:0xc9946e],[0,1.4,.17,.28,.08,.045,robot?0x1ccbc8:0x583c30],[-.29,.87,gait,.13,.5,.16,c],[.29,.87,-gait,.13,.5,.16,c],[-.13,.36,gait,.16,.6,.2,0x304862],[.13,.36,-gait,.16,.6,.2,0x304862]];
  p.forEach(([dx,y,dz,w,h,d,c],j)=>put(actors,i*7+j,x+dx*scale,.3+y*scale,z+dz*scale,w*scale,h*scale,d*scale,c));
 }
 let previousTime=-1;const priorRobots=[],births=new Map();
 let zoom=1,targetZoom=1,look=new THREE.Vector3(),target=new THREE.Vector3();
 function cameraUpdate(){zoom+=(targetZoom-zoom)*.15;look.lerp(target,.15);const a=container.clientWidth/Math.max(1,container.clientHeight),half=Math.max(regional?58:42,(regional?76:57)/a)/zoom;Object.assign(camera,{left:-half*a,right:half*a,top:half,bottom:-half});camera.position.set(look.x+100,130,look.z+135);camera.lookAt(look);camera.updateProjectionMatrix();}
 new ResizeObserver(()=>{renderer.setSize(container.clientWidth,container.clientHeight,false);cameraUpdate();}).observe(container);renderer.setSize(container.clientWidth,container.clientHeight,false);cameraUpdate();
 const ray=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),hit=new THREE.Vector3();
 function project(x,z){const p=new THREE.Vector3(x,2,z).project(camera);return {x:(p.x+1)*container.clientWidth/2,y:(1-p.y)*container.clientHeight/2};}
 return {
  select(i,focus=true){highlights.forEach((r,k)=>r.visible=k===(regional?i:Math.floor(i/6)));if(i<0)return;const p=regional?(i>=36?{x:TOWNS[i-36][0],z:TOWNS[i-36][1]}:pickPoints[i]):{x:DISTRICTS[Math.floor(i/6)][0],z:DISTRICTS[Math.floor(i/6)][1]};if(focus){target.set(p.x,0,p.z);targetZoom=container.clientWidth<700?2.8:2.1;}},
  fit(){target.set(0,0,0);targetZoom=1;},zoomBy(f){targetZoom=THREE.MathUtils.clamp(targetZoom*f,.7,4);},
  pan(dx,dy){const u=(camera.top-camera.bottom)/container.clientHeight;target.x=THREE.MathUtils.clamp(target.x-dx*u*.8-dy*u*.8,-75,75);target.z=THREE.MathUtils.clamp(target.z+dx*u*.6-dy*u,-65,65);},
  pick(x,y){const r=container.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1),camera);if(!ray.ray.intersectPlane(plane,hit))return -1;if(regional){const town=TOWNS.findIndex(([x,z])=>Math.abs(x-hit.x)<16&&Math.abs(z-hit.z)<14);if(town>=0)return 36+town;}return pickPoints.findIndex(p=>Math.abs(p.x-hit.x)<4&&Math.abs(p.z-hit.z)<4);},
  project(i){return project(centers[i][0],centers[i][1]-(regional?12:15));},projectTown(i){return project(TOWNS[i][0],TOWNS[i][1]-16);},
  render(s,motion){const visualTime=performance.now()/1000;cameraUpdate();if((s.time??0)<previousTime){priorRobots.length=0;births.clear();}previousTime=s.time??0;let actorCount=0,vehicleCount=0;
   if(regional)structures.forEach((g,i)=>{const p=s.sites[i];g.visible=p.status!=='empty';g.scale.y=p.status==='building'?.12+.88*p.progress/WORK:1;});
   dynamicRoot.updateMatrixWorld(true);for(const {mesh,parts} of dynamic){parts.forEach((p,i)=>{let visible=true;for(let a=p;a;a=a.parent)if(!a.visible)visible=false;mesh.setMatrixAt(i,visible?p.matrixWorld:zero);});mesh.instanceMatrix.needsUpdate=true;}
   const groups=regional?s.towns.map(t=>({tasks:t.tasks.reduce((a,b)=>a+b,0),robots:t.assigned.reduce((a,b)=>a+b,0)})):s.cityTasks.map((tasks,i)=>({tasks,robots:s.cityAssigned[i]}));
   const group=regional?6:3;
   groups.forEach((g,i)=>{
    const [x,z]=(regional?TOWNS:DISTRICTS)[i],count=Math.ceil(g.tasks/group),robots=Math.round(g.robots/group),ratio=g.robots/g.tasks,marker=zoneMarkers[i];marker.mesh.scale.x=Math.max(.001,ratio);marker.mesh.position.x=x-marker.width*(1-ratio)/2;
    for(let k=priorRobots[i]??0;k<robots;k++)births.set(i+':'+k,visualTime);priorRobots[i]=robots;
    for(let k=0;k<count;k++){const robot=k<robots,phase=motion*.35+k*1.73;let px=x+(k%4-1.5)*(regional?6.4:5.6)+Math.sin(phase)*1.1,pz=z+(regional?(Math.floor(k/4)%3-1)*8.5+3.6:[-2,8,12.5][Math.floor(k/4)%3])+Math.cos(phase)*.35;
     const birth=births.get(i+':'+k);if(robot&&birth!==undefined){const u=Math.min(1,(visualTime-birth)/2.5);if(u<1){const startX=regional?x:-40,startZ=regional?z+14:33;px=startX+(px-startX)*u;pz=startZ+(pz-startZ)*u;}else births.delete(i+':'+k);}
     person(actorCount++,px,pz,robot,motion,regional?.82:1.1);
    }
   });
   if(regional){const open=s.sites.map((p,i)=>({...p,i})).filter(p=>p.status!=='empty'),n=Math.min(72,s.fleet);for(let k=0;k<n;k++){const p=pickPoints[open[k%open.length].i];person(actorCount++,p.x+Math.sin(motion*.6+k)*2.6,p.z+3.3,true,motion,.8);}}
   const shipments=regional?s.shipments:(s.pending??[]).map(p=>({...p,depart:p.ready-1,town:0}));
   // A van represents a delivery batch, not a fabricated extra robot.
   const visible=shipments.slice(-24);
   visible.forEach((p,k)=>{const time=regional?s.time:s.time??0,t=THREE.MathUtils.clamp((time-p.depart)/(p.ready-p.depart),0,1);let x,z;
    if(regional){const [tx,tz]=TOWNS[p.town];if(t<.55){x=-40+(tx+40)*t/.55;z=3;}else{x=tx;z=3+(tz-3)*(t-.55)/.45;}}
    else{x=-43;z=34-t*7;}
    const i=vehicleCount++*3;put(vehicles,i,x,.65,z,2.7,.7,1.25,0x1c5269);put(vehicles,i+1,x+.8,1.2,z,.85,.75,1.2,0x9ae5d8);put(vehicles,i+2,x-.55,1.15,z,1.7,.7,1.2,0xd8efeb);
   });
   actors.count=actorCount*7;actors.instanceMatrix.needsUpdate=true;if(actors.instanceColor)actors.instanceColor.needsUpdate=true;vehicles.count=vehicleCount*3;vehicles.instanceMatrix.needsUpdate=true;if(vehicles.instanceColor)vehicles.instanceColor.needsUpdate=true;renderer.render(scene,camera);return group;
  }
 };
}
