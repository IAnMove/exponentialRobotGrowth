import assert from 'node:assert/strict';
import * as THREE from './node_modules/three/build/three.module.js';
import {ideas} from './site-src/journeys/ideas.js';
import {defaults} from './site-src/journeys/common.js';
import {createIdeasScene,ideasFieldOfView} from './dist/journeys/ideas-world.js';
globalThis.document={createElement:()=>{const canvas={width:0,height:0,textLines:[],writes:0};canvas.getContext=()=>({measureText:text=>({width:text.length*20}),clearRect(){canvas.textLines=[];canvas.writes++;},fillRect(){},fillText(text){canvas.textLines.push(text);}});return canvas;}};
const clear=(a,b)=>a.x+a.width+4.99<=b.x||b.x+b.width+4.99<=a.x||a.y+a.height+4.99<=b.y||b.y+b.height+4.99<=a.y;
let states=0,layouts=0,labels=0;
for(const width of [320,390])assert(Math.abs(Math.tan(ideasFieldOfView(width,450)*Math.PI/360)*width/450-Math.tan(ideasFieldOfView(width,650)*Math.PI/360)*width/650)<1e-12,'additional phone height retains the previous horizontal field of view');
for(const es of [true,false]){
 const built=createIdeasScene(ideas,es),resourceCount=built.resources.length;
 assert.equal(built.communities.length,4,'each physical community has its own live reading');
 for(const probability of [0,55,85,100])for(const bridges of [false,true]){
  const model=ideas.evaluate({...defaults(ideas),probability,bridges},0),snapshot=JSON.stringify(model.trace.snapshots.map(s=>[[...s.known],s.active]));
  const bridge=model.trace.eventsByRound.findIndex(events=>events.some(e=>e.bridge&&e.newReach));
  for(const time of [...new Set([0,.5,.999,1,1.5,4.999,5,10,64,Math.max(0,bridge-.001),Math.max(0,bridge)])]){
   built.update(model,time,0);const completed=Math.floor(time),s=model.trace.snapshots[completed];states++;
   let total=0,activeTotal=0;
   for(const [i,c]of built.communities.entries()){
    const ids=Array.from({length:16},(_,j)=>i*16+j),reached=ids.filter(id=>s.known.has(id)).length,active=ids.filter(id=>s.active.includes(id)).length;
    assert.equal(c.reached,reached);assert.equal(c.active,active);assert(active<=reached&&reached<=16);total+=reached;activeTotal+=active;
    assert.equal(c.caption.m.userData.ideasLabel.text,`${'ABCD'[i]} · ${reached}/16 ${es?'alcanzadas':'reached'}\n${active} ${es?'emisores activos':'active senders'}`);
    assert(built.targets.includes(c.disk)&&c.disk.userData.info.every(text=>text.includes(String(reached))&&text.includes(String(active))));
    const actualReached=ids.filter(id=>built.people[id].body.material.color.getHex()!==0x668398).length,actualActive=ids.filter(id=>built.people[id].halo.visible).length;
    assert.equal(actualReached,reached,'the reading counts the actual reached bodies');assert.equal(actualActive,active,'the reading counts the actual active halos');
    if(!bridges&&i>0)assert.equal(reached,0,'without bridges unreached communities never acquire readers');
   }
   assert.equal(total,s.known.size);assert.equal(activeTotal,s.active.length);
   for(const [width,height]of [[320,650],[390,650],[1110,600]])for(const mode of ['web','immersive']){
    built.standsGroup.visible=mode==='immersive';
    const camera=new THREE.PerspectiveCamera(ideasFieldOfView(width,height),width/height,.1,100);
    if(mode==='immersive'){const p=ideas.poseAt(2);camera.position.set(p.x,1.65,p.z);camera.rotation.set(p.pitch,p.yaw,0,'YXZ');}
    else{const o=ideas.overview,d=o.distance*2;camera.position.set(Math.sin(o.yaw)*Math.cos(o.pitch)*d,.6+Math.sin(o.pitch)*d,1+Math.cos(o.yaw)*Math.cos(o.pitch)*d);camera.lookAt(0,.6,1);}
    const obstacles=[{x:16,y:14,width:width-32,height:55},{x:width-198,y:108,width:182,height:35},{x:10,y:height-100,width:width-20,height:80},...built.protectedBounds(camera,{width,height})];
    built.layoutLabels(camera,{width,height,obstacles});layouts++;const shown=built.annotations.filter(e=>e.m.userData.ideasLabel.layout);
    if(mode==='web')assert.equal(shown.length,4,'the default overview retains all four community readings');
    for(const [i,e]of shown.entries()){
     labels++;const info=e.m.userData.ideasLabel,b=info.layout;
     assert.equal(info.fontPixels,13);assert.equal(info.lines.join(' ').replace(/\s+/g,' ').trim(),e.words.replace(/\s+/g,' ').trim());
     assert(b.x>=12&&b.y>=12&&b.x+b.width<=width-12+1e-8&&b.y+b.height<=height-12+1e-8);
     for(const other of shown.slice(i+1))assert(clear(b,other.m.userData.ideasLabel.layout));for(const o of obstacles)assert(clear(b,o));
     const p=e.m.getWorldPosition(new THREE.Vector3()),depth=-p.applyMatrix4(camera.matrixWorldInverse).z,pixels=height/(2*depth*Math.tan(camera.fov*Math.PI/360)),scale=e.m.getWorldScale(new THREE.Vector3());assert(Math.abs(scale.x*pixels-b.width)<1e-7&&Math.abs(scale.y*pixels-b.height)<1e-7);
     assert.equal(e.canvas.width,768);assert.equal(e.canvas.height,384);
    }
    const versions=built.annotations.map(e=>e.texture.version);built.layoutLabels(camera,{width,height,obstacles});assert.deepEqual(built.annotations.map(e=>e.texture.version),versions,'paused labels do not upload again');assert.equal(built.resources.length,resourceCount);
   }
  }
  assert.equal(JSON.stringify(model.trace.snapshots.map(s=>[[...s.known],s.active])),snapshot,'readings never mutate the cascade');
 }
 const model=ideas.evaluate(defaults(ideas),0);built.update(model,1.5);const before=built.communities.map(c=>c.caption.m.userData.ideasLabel.text);built.update(model,64);built.update(model,1.5);assert.deepEqual(built.communities.map(c=>c.caption.m.userData.ideasLabel.text),before,'rewinding restores every count and caption');
 const away=new THREE.PerspectiveCamera(65,1,.1,100);away.position.set(0,8,-20);away.lookAt(0,8,-40);built.layoutLabels(away,{width:390,height:650});assert(built.annotations.every(e=>e.m.material.opacity===0&&!e.leader.visible),'labels behind the visitor disappear');
 assert.equal(new Set(built.resources).size,resourceCount);const tracked=built.resources.filter(r=>r.addEventListener),counts=new Map(tracked.map(r=>[r,0]));tracked.forEach(r=>r.addEventListener('dispose',()=>counts.set(r,counts.get(r)+1)));built.resources.forEach(r=>r.dispose());assert([...counts.values()].every(n=>n===1));
}
console.log(`Ideas: ${states} causal community readings, ${layouts} real-camera layouts, ${labels} labels; completed rounds, active/reached totals, bridges, 13px text, held textures, rewind and disposal: OK`);
