import * as THREE from '../vendor/three.module.js';
import {WORLD,roadRoute,routePoint,districtWorkPoint,districtContactTargets} from './world.js';

// Every figure represents one person or one robot in the simulation.
export function createCharacters(scene,industries){
  const group=new THREE.Group();scene.add(group);
  const skin=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.85});
  const shell=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.48,metalness:.12});
  const joint=new THREE.MeshStandardMaterial({color:0x203547,roughness:.65});
  const visor=new THREE.MeshStandardMaterial({color:0x102735,roughness:.24,metalness:.2});
  const helmet=new THREE.MeshStandardMaterial({color:0xffcf65,roughness:.65});
  const cube=new THREE.BoxGeometry(1,1,1),sphere=new THREE.SphereGeometry(1,8,6);
  const capsule=new THREE.CapsuleGeometry(.08,.25,3,6);
  const meshes={},capacity=620;
  function instances(name,geometry,material,n){const m=new THREE.InstancedMesh(geometry,material,n);m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.castShadow=true;m.frustumCulled=false;m.count=0;m.instanceMatrix.array.fill(0);if(/Body|Head|Arms/.test(name)){m.setColorAt(0,new THREE.Color(0));m.instanceColor.array.fill(0);}group.add(m);meshes[name]=m;return m;}
  for(const type of ['h','r']){
    const n=type==='h'?74:capacity;
    instances(type+'Body',cube,shell,n);instances(type+'Head',sphere,type==='h'?skin:shell,n);
    instances(type+'Face',cube,visor,n);instances(type+'Hips',cube,joint,n);
    instances(type+'Arms',capsule,type==='h'?shell:shell,n*2);instances(type+'Legs',capsule,joint,n*2);instances(type+'Feet',cube,joint,n*2);
    instances(type+'Hands',sphere,joint,n*2);
    instances(type+'Cargo',cube,new THREE.MeshStandardMaterial({color:0xe7b36a,roughness:.8}),n);
  }
  instances('hHat',sphere,helmet,74);instances('hBrim',cube,helmet,74);
  const dummy=new THREE.Object3D(),base=new THREE.Matrix4(),matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),pos=new THREE.Vector3(),scale=new THREE.Vector3(1.35,1.35,1.35),axis=new THREE.Vector3(0,1,0),color=new THREE.Color();
  const skins=[0xd0a078,0x946448,0xe5be97,0xb07a58,0x704c37],jackets=[0x71a8bd,0x588bad,0x8fbdb0,0x718cba];
  let run,humans=[],exports=[],chargeSlots=new Map(),builderSlots=new Map(),liveRates=[],records=[],summary=null,disposed=false;
  const workPoint=(site,slot)=>districtWorkPoint(industries,site,slot);
  function homePoint(id){return {x:WORLD.home.x-5+(id%2)*10+(id%5-2)*.6,z:WORLD.home.z-3+(Math.floor(id/2)%2)*6+2.6};}
  function mealPoint(id){const table=Math.floor(id/4),seat=id%4;return {x:WORLD.canteen.x-5.5+(table%4)*3.6+(seat%2?.55:-.55),z:WORLD.canteen.z+2+Math.floor(table/4)*3+(seat<2?-1.1:1.1),angle:seat<2?0:Math.PI,seated:true};}
  function leisurePoint(id,t){const angle=id*2.39996,radius=1.2+Math.sqrt(id/74)*5.9;return {x:WORLD.park.x+Math.cos(angle)*radius+Math.sin(t*.18+id)*.18,z:WORLD.park.z+Math.sin(angle)*radius*.82,angle:angle+.7,walking:id%5===0};}
  function walk(a,b,t){return {...routePoint(roadRoute(a,b),t),walking:true};}
  function taskPose(a,p,motion){if(!liveRates[a.site])return {...p,working:false};return {...p,working:true,controller:a.site===7||a.slot>=industries[a.site].humans};}

  function rebuild(next){run=next;humans=[];let id=0;industries.forEach((site,i)=>{for(let slot=0;slot<site.humans;slot++){const replaced=run.frames.find(f=>f.robots[i]>slot);humans.push({id:id++,site:i,slot,replacedAt:replaced?.absHour??Infinity});}});exports=run.productionEvents.filter(e=>e.outgoing>0);}
  function humanPosition(a,time,motion){const hour=((time%24)+24)%24,work=workPoint(a.site,a.slot),home=homePoint(a.id),meal=mealPoint(a.id),rest=leisurePoint(a.id,motion);
    if(time>=a.replacedAt){
      if(hour>=22||hour<6)return null;
      if(time<a.replacedAt+.75){const h=a.replacedAt%24,origin=h>=12&&h<14?meal:h>=8&&h<18?work:home;return walk(origin,rest,(time-a.replacedAt)/.75);}
      if(hour>=12&&hour<12.5)return walk(rest,meal,(hour-12)*2);
      if(hour>=12.5&&hour<13.5)return meal;
      if(hour>=13.5&&hour<14)return walk(meal,rest,(hour-13.5)*2);
      if(hour>=21&&hour<22)return walk(rest,home,hour-21);
      if(hour>=6&&hour<7)return walk(home,rest,hour-6);
      return rest;
    }
    if(hour>=22||hour<6)return null;
    if(hour<8)return walk(home,work,(hour-6)/2);
    if(hour>=12&&hour<12.5)return walk(work,meal,(hour-12)*2);
    if(hour>=12.5&&hour<13.5)return meal;
    if(hour>=13.5&&hour<14)return walk(meal,work,(hour-13.5)*2);
    if(hour>=18&&hour<19)return walk(work,rest,hour-18);
    if(hour>=21)return walk(rest,home,hour-21);
    if(hour>=19)return rest;
    return taskPose(a,work,motion);
  }
  function robotPosition(a,time,motion){const dest=workPoint(a.site,a.slot),start={x:WORLD.hub.x+(a.id%6-2.5)*1.5,z:WORLD.hub.z+1};
    if(time<a.born)return null;
    if(time<a.ready)return {...walk(start,dest,(time-a.born)/2),color:0xff9858};
    const duty=((time+a.id*7)%24+24)%24;
    const slot=chargeSlots.get(a.id)??0,charger={x:WORLD.charging.x-7+(slot%12)*1.25,z:WORLD.charging.z-3+Math.floor(slot/12)*1.2,angle:Math.PI};
    if(duty<.35)return {...walk(dest,charger,duty/.35),color:0x80d1d4};
    if(duty<2.7)return {...charger,color:0x80d1d4,service:duty>=2};
    if(duty<3)return {...walk(charger,dest,(duty-2.7)/.3),color:0x80d1d4};
    if(builderSlots.has(a.id)){const s=industries[a.site];return {x:s.x+5.4,z:s.z-4.7+builderSlots.get(a.id)*1.4,angle:Math.PI*.5,working:true,controller:true,builder:true,color:0xffb976};}
    return {...taskPose(a,dest,motion),color:0xe9f1ed};
  }
  function part(name,id,x,y,z,sx,sy,sz,rx=0,rz=0){dummy.position.set(x,y,z);dummy.rotation.set(rx,0,rz);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();matrix.multiplyMatrices(base,dummy.matrix);meshes[name].setMatrixAt(id,matrix);}
  function tint(name,id,hex){color.set(hex);meshes[name].setColorAt(id,color);}
  function draw(type,id,a,p,motion){const human=type==='h',gait=Math.sin(motion*(p.walking?9:4)+a.id)* (p.walking?.58:0),sit=p.seated,bodyY=sit?-.25:0;
    pos.set(p.x,.35+(p.ground??0)+bodyY+(p.walking?Math.abs(gait)*.05:0),p.z);q.setFromAxisAngle(axis,p.angle??Math.PI);base.compose(pos,q,scale);
    part(type+'Hips',id,0,.53,0,.28,.14,.22);
    part(type+'Body',id,0,.79,0,human?.36:.32,.42,.24);
    part(type+'Head',id,0,1.14,0,human?.2:.24,human?.23:.21,.2);
    part(type+'Face',id,0,1.16,.19,human?.12:.34,human?.035:.12,.06);
    const controller=Boolean(p.working&&p.controller);part(type+'Cargo',id,0,controller?.95:.65,.43,controller||p.carrying?.45:0,controller?.18:p.carrying?.4:0,controller?.25:p.carrying?.35:0);
    tint(type+'Body',id,human?jackets[a.id%jackets.length]:p.color);
    tint(type+'Head',id,human?skins[a.id%skins.length]:p.color);
    if(human){const hat=p.working||p.walking;part('hHat',id,0,1.32,0,hat?.23:0,hat?.12:0,hat?.23:0);part('hBrim',id,0,1.28,.025,hat?.49:0,.04,hat?.47:0);}
    const contactPoints=[];for(let side=0;side<2;side++){const sign=side?1:-1,leg=sit?-1.25:gait*sign,arm=p.carrying?-1.1:p.walking?-leg:sit?-.9:.05;
      part(type+'Legs',id*2+side,sign*.105,.48-Math.cos(leg)*.2,-Math.sin(leg)*.2,1,1,1,leg);part(type+'Feet',id*2+side,sign*.105,.48-Math.cos(leg)*.4,-Math.sin(leg)*.4+.06,.14,.1,.24,leg*.25);
      if(p.working){const shoulder=new THREE.Vector3(sign*.26,.92,0).applyMatrix4(base),target=controller?new THREE.Vector3(sign*.17,1.04,.43).applyMatrix4(base):new THREE.Vector3(...districtContactTargets(industries,a.site,a.slot).targets[side]),delta=target.clone().sub(shoulder),length=delta.length();dummy.position.copy(shoulder).add(target).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());dummy.scale.set(1.35,length/.41,1.35);dummy.updateMatrix();meshes[type+'Arms'].setMatrixAt(id*2+side,dummy.matrix);dummy.position.copy(target);dummy.quaternion.identity();dummy.scale.set(.10,.10,.10);dummy.updateMatrix();meshes[type+'Hands'].setMatrixAt(id*2+side,dummy.matrix);contactPoints.push({side,point:target.toArray(),shoulder:shoulder.toArray(),reach:length,kind:controller?'handheld-controller':'representative-task-material',countsAsObject:false});
      }else{part(type+'Arms',id*2+side,sign*.26,.92-Math.cos(arm)*.19,-Math.sin(arm)*.19,1,1,1,arm,sign*.06);part(type+'Hands',id*2+side,sign*.26,.92-Math.cos(arm)*.38,-Math.sin(arm)*.38,.08,.08,.08);}
      tint(type+'Arms',id*2+side,human?jackets[a.id%jackets.length]:p.color);
    }
    records.push({id:type+'-'+a.id,type:human?'human':'robot',site:a.site??null,slot:a.slot??null,instance:id,position:[p.x,.35+(p.ground??0)+bodyY,p.z],working:!!p.working,walking:!!p.walking,controller,contactPoints,representedCount:a.representedCount||1,aggregate:!!a.aggregate,identityRanges:a.identityRanges||null,role:p.builder?'construction':p.service?'maintenance':p.color===0x80d1d4?'charge-or-service':p.working?'task':p.walking?'travel':human?'off-shift':'idle'});
  }

  function update(frame,phase,motion,rates=frame.flow){if(disposed||!run)return {visibleHumans:0,visibleRobots:0};const fraction=Number.isFinite(phase)?THREE.MathUtils.clamp(phase,0,.999999):0,time=Number(frame.absHour)+fraction;motion=time;liveRates=frame.flow.map((rate,i)=>Number(frame.capacity[i])>0?rate:0);let hi=0,ri=0;records=[];for(const mesh of Object.values(meshes)){mesh.instanceMatrix.array.fill(0);mesh.instanceColor?.array.fill(0);}chargeSlots=new Map();builderSlots=new Map();const crews=Array(9).fill(0);
    run.deployments.forEach(a=>{if(time<a.ready)return;if(((time+a.id*7)%24)<3)chargeSlots.set(a.id,chargeSlots.size);else if(frame.projects[a.site]&&crews[a.site]<2)builderSlots.set(a.id,crews[a.site]++);});
    humans.forEach(a=>{const p=humanPosition(a,time,motion);if(p){if(hi>=74)throw new RangeError('Human district figure capacity exceeded');draw('h',hi++,a,p,motion);}});
    const robotFigures=[];run.deployments.forEach(a=>{const p=robotPosition(a,time,motion);if(p)robotFigures.push({a,p});});
    const event=exports.find(e=>e.hour===frame.absHour);if(event){const first=exports.filter(e=>e.hour<event.hour).reduce((n,e)=>n+e.outgoing,0);for(let j=0;j<event.outgoing;j++){const p=walk({x:WORLD.hub.x+(j%6-2.5)*1.5,z:WORLD.hub.z+2},{x:48,z:44},fraction);robotFigures.push({a:{id:900+first+j,representedCount:1,identityRanges:[{prefix:'export-',idStart:first+j,idEnd:first+j+1}]},p:{...p,color:0xe9f1ed}});}}
    if(robotFigures.length>capacity){const tail=robotFigures.splice(capacity-1),ranges=tail.map(({a})=>a.identityRanges||[{prefix:'deployment-',idStart:a.id,idEnd:a.id+1}]).flat();robotFigures.push({a:{id:999999,aggregate:true,representedCount:tail.reduce((n,{a})=>n+(a.representedCount||1),0),identityRanges:ranges},p:{x:WORLD.hub.x,z:WORLD.hub.z+2,angle:0,color:0xe9f1ed}});}
    for(const {a,p}of robotFigures)draw('r',ri++,a,p,motion);
    Object.entries(meshes).forEach(([key,mesh])=>{mesh.count=(key[0]==='h'?hi:ri)*(/Arms|Legs|Feet|Hands/.test(key)?2:1);mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.boundingSphere=null;mesh.boundingBox=null;});group.updateMatrixWorld(true);
    summary={time,visibleHumans:hi,visibleRobots:ri,representedHumans:records.filter(r=>r.type==='human').reduce((n,r)=>n+r.representedCount,0),representedRobots:records.filter(r=>r.type==='robot').reduce((n,r)=>n+r.representedCount,0),contacts:records.flatMap(r=>r.contactPoints),scope:'One figure per visible person or robot; overflow is an explicit aggregate with identity ranges. Handheld devices and task samples are illustrative equipment.'};return summary;
  }
  const resources=[],owned=new Set();group.traverse(o=>{for(const resource of[o.isInstancedMesh?o:null,o.geometry,...(Array.isArray(o.material)?o.material:[o.material])])if(resource&&!owned.has(resource)){owned.add(resource);resources.push(resource);}});
  return {group,parts:{meshes,get records(){return records;}},resources,rebuild,update,getSummary:()=>summary,dispose(){if(disposed)return;disposed=true;for(const resource of resources)resource.dispose?.();group.removeFromParent();}};
}
