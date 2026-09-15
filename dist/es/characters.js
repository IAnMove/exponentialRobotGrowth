import * as THREE from '../vendor/three.module.js';
import {WORLD,roadRoute,routePoint} from './world.js';

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
  function instances(name,geometry,material,n){const m=new THREE.InstancedMesh(geometry,material,n);m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.castShadow=true;m.frustumCulled=false;group.add(m);meshes[name]=m;return m;}
  for(const type of ['h','r']){
    const n=type==='h'?74:capacity;
    instances(type+'Body',cube,shell,n);instances(type+'Head',sphere,type==='h'?skin:shell,n);
    instances(type+'Face',cube,visor,n);instances(type+'Hips',cube,joint,n);
    instances(type+'Arms',capsule,type==='h'?shell:shell,n*2);instances(type+'Legs',capsule,joint,n*2);instances(type+'Feet',cube,joint,n*2);
    instances(type+'Cargo',cube,new THREE.MeshStandardMaterial({color:0xe7b36a,roughness:.8}),n);
  }
  instances('hHat',sphere,helmet,74);instances('hBrim',cube,helmet,74);
  const dummy=new THREE.Object3D(),base=new THREE.Matrix4(),matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),pos=new THREE.Vector3(),scale=new THREE.Vector3(1.35,1.35,1.35),axis=new THREE.Vector3(0,1,0),color=new THREE.Color();
  const skins=[0xd0a078,0x946448,0xe5be97,0xb07a58,0x704c37],jackets=[0x71a8bd,0x588bad,0x8fbdb0,0x718cba];
  let run,humans=[],exports=[],chargeSlots=new Map(),builderSlots=new Map(),liveRates=[];
  function workPoint(site,slot){const s=industries[site];let x,z;if(slot<18){x=-5.7+(slot%9)*1.42;z=4.1+Math.floor(slot/9)*1.8;}else if(slot<30){const n=slot-18;x=n%2?-7.15:7.15;z=-5+Math.floor(n/2)*2;}else{const n=slot-30;x=-5.7+(n%9)*1.42;z=[-5.8,-.1,2.7][Math.min(2,Math.floor(n/9))];}let facing=Math.PI;if(site===7&&slot<10){x=-4.8+(slot%5)*2.4;z=slot<5?1.4:-2;facing=slot<5?Math.PI:0;}else if(site===2&&slot<6){x=-4+(slot%3)*4;z=slot<3?3.2:-.4;facing=slot<3?Math.PI:0;}else if(site===3&&slot<8){x=-4.8+(slot%4)*3.1;z=slot<4?3.4:-.4;facing=slot<4?Math.PI:0;}else if(site===5&&slot<8){x=-4+(slot%4)*2.5;z=slot<4?3.5:-.2;facing=slot<4?Math.PI:0;}const r=Math.hypot(x+1.4,z+1.2),ground=site===0&&r>=1.4&&r<7.4?.05+Math.floor((r-1.4)/1.2)*.28:0;return {x:s.x+x,z:s.z+z,ground,angle:facing};}
  function homePoint(id){return {x:WORLD.home.x-5+(id%2)*10+(id%5-2)*.6,z:WORLD.home.z-3+(Math.floor(id/2)%2)*6+2.6};}
  function mealPoint(id){const table=Math.floor(id/4),seat=id%4;return {x:WORLD.canteen.x-5.5+(table%4)*3.6+(seat%2?.55:-.55),z:WORLD.canteen.z+2+Math.floor(table/4)*3+(seat<2?-1.1:1.1),angle:seat<2?0:Math.PI,seated:true};}
  function leisurePoint(id,t){const angle=id*2.39996,radius=1.2+Math.sqrt(id/74)*5.9;return {x:WORLD.park.x+Math.cos(angle)*radius+Math.sin(t*.18+id)*.18,z:WORLD.park.z+Math.sin(angle)*radius*.82,angle:angle+.7,walking:id%5===0};}
  function walk(a,b,t){return {...routePoint(roadRoute(a,b),t),walking:true};}
  function taskPose(a,p,motion){
    if(!liveRates[a.site])return {...p,angle:(p.angle??Math.PI)+(a.id%3-1)*.25,working:false};
    // Short return trips connect a workstation to its material pick-up point.
    const carrier=a.id%3===0&&a.slot<18&&p.angle!==0,t=(motion*.13+a.id*.618)%1;
    if(!carrier||t<.42)return {...p,angle:(p.angle??Math.PI)+(a.id%3-1)*.15,working:true};
    const progress=t<.64?(t-.42)/.22:t<.78?1:1-(t-.78)/.22;
    return {...p,x:p.x+progress*.45,z:p.z+progress*1.4,angle:t<.78?.31:Math.PI+.31,walking:t<.64||t>=.78,carrying:t>=.64,working:false};
  }
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
    if(builderSlots.has(a.id)){const s=industries[a.site];return {x:s.x+5.4,z:s.z-4.7+builderSlots.get(a.id)*1.4,angle:Math.PI*.5,working:true,color:0xffb976};}
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
    part(type+'Cargo',id,0,.65,.43,p.carrying?.45:0,p.carrying?.4:0,p.carrying?.35:0);
    tint(type+'Body',id,human?jackets[a.id%jackets.length]:p.color);
    tint(type+'Head',id,human?skins[a.id%skins.length]:p.color);
    if(human){const hat=p.working||p.walking;part('hHat',id,0,1.32,0,hat?.23:0,hat?.12:0,hat?.23:0);part('hBrim',id,0,1.28,.025,hat?.49:0,.04,hat?.47:0);}
    for(let side=0;side<2;side++){const sign=side?1:-1,leg=sit?-1.25:gait*sign,arm=p.carrying?-1.1:p.walking?-leg:sit?-.9:p.working?-.6+Math.sin(motion*3+a.id)*.23:.05;
      part(type+'Legs',id*2+side,sign*.105,.48-Math.cos(leg)*.2,-Math.sin(leg)*.2,1,1,1,leg);
      part(type+'Feet',id*2+side,sign*.105,.48-Math.cos(leg)*.4,-Math.sin(leg)*.4+.06,.14,.1,.24,leg*.25);
      part(type+'Arms',id*2+side,sign*.26,.92-Math.cos(arm)*.19,-Math.sin(arm)*.19,1,1,1,arm,sign*.06);
      tint(type+'Arms',id*2+side,human?jackets[a.id%jackets.length]:p.color);
    }
  }
  function update(frame,phase,motion,rates=frame.flow){liveRates=rates;const time=frame.absHour+phase;let hi=0,ri=0;chargeSlots=new Map();builderSlots=new Map();const crews=Array(9).fill(0);run.deployments.forEach(a=>{if(time<a.ready)return;if(((time+a.id*7)%24)<3)chargeSlots.set(a.id,chargeSlots.size);else if(frame.projects[a.site]&&crews[a.site]<2)builderSlots.set(a.id,crews[a.site]++);});humans.forEach(a=>{const p=humanPosition(a,time,motion);if(p)draw('h',hi++,a,p,motion);});
    run.deployments.forEach(a=>{const p=robotPosition(a,time,motion);if(p)draw('r',ri++,a,p,motion);});
    // Finished robots destined for other uses leave the district, rather than accumulating forever.
    const event=exports.find(e=>e.hour===frame.absHour);if(event)for(let j=0;j<event.outgoing&&ri<capacity;j++){const p=walk({x:WORLD.hub.x+(j%6-2.5)*1.5,z:WORLD.hub.z+2},{x:48,z:44},phase);draw('r',ri++,{id:900+j},{...p,color:0xe9f1ed},motion);}
    Object.entries(meshes).forEach(([key,m])=>{m.count=(key[0]==='h'?hi:ri)*(/Arms|Legs|Feet/.test(key)?2:1);m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;});
    return {visibleHumans:hi,visibleRobots:ri};
  }
  return {rebuild,update};
}

