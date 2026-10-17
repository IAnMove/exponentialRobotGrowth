import assert from 'node:assert/strict';
import * as THREE from './node_modules/three/build/three.module.js';
import {microchip} from './site-src/journeys/microchip.js';
import {createMicrochipScene,microchipCircuitView,microchipCircuitFraming,microchipFraming} from './dist/journeys/microchip-world.js';
globalThis.document={createElement:()=>{const c={width:0,height:0,writes:0,textLines:[]};c.getContext=()=>({measureText:t=>({width:t.length*20}),clearRect(){c.writes++;c.textLines=[];},fillRect(){},fillText(t){c.textLines.push(t);}});return c;}};
const clear=(a,b)=>a.x+a.width+4.99<=b.x||b.x+b.width+4.99<=a.x||a.y+a.height+4.99<=b.y||b.y+b.height+4.99<=a.y;
const expressions=['X = A XOR B','AB = A AND B','Sum = X XOR Cin','CX = X AND Cin','Cout = AB OR CX'];
const display=v=>v===null?'…':String(v),visible=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};
let states=0,layouts=0,labels=0,transistorStates=0,transistorLayouts=0;
for(const es of [true,false]){
 const built=createMicrochipScene(microchip,es),resources=built.resources.length,dimensions=built.labels.map(e=>[e.canvas.width,e.canvas.height]);
 assert.equal(built.labels.length,29);
 for(const a of [0,1])for(const time of [0,6,12]){
  const model=microchip.evaluate({a:!!a,b:true,carry:false},0),original=JSON.stringify(model.trace);
  for(const phase of [0,1]){
   built.update(model,time,phase);transistorStates++;
   assert.equal(built.mosReadings.gate.m.userData.chipLabel.text,(es?'puerta':'gate')+` · A = ${a}`);
   assert.equal(built.mosReadings.channel.m.userData.chipLabel.text,(a?(es?'A = 1 · campo → canal habilitado':'A = 1 · field → enabled channel'):(es?'A = 0 · canal bloqueado':'A = 0 · channel off'))+'\n'+(es?'0 V / +VDS: sesgo ilustrativo':'0 V / +VDS: illustrative bias'));
   assert.equal(built.invReadings.input.m.userData.chipLabel.text,`A = ${a}`);
   assert.equal(built.invReadings.output.m.userData.chipLabel.text,`NOT A = ${1-a}\n`+(es?'salida conectada a ':'output connected to ')+(a?'GND':'VDD'));
   for(const [key,name,on]of [['pmos','pMOS',!a],['nmos','nMOS',!!a]])assert.equal(built.invReadings[key].m.userData.chipLabel.text,name+' · '+(on?(es?'habilitado':'enabled'):(es?'bloqueado':'off')));
   assert.equal(built.inverter.paths.pullup.mesh.visible,!a);assert.equal(built.inverter.paths.pulldown.mesh.visible,!!a);assert(built.mos.field.every(g=>g.visible===!!a));assert.equal(built.inverter.output.material.color.getHex(),a?0x5eafff:0x86e7b3);
   built.scene.updateMatrixWorld(true);
   for(const [reading,object]of [[built.mosReadings.source,built.mos.sourceContact],[built.mosReadings.drain,built.mos.drainContact],[built.mosReadings.gate,built.mos.gate],[built.mosReadings.dielectric,built.mos.oxide],[built.mosReadings.substrate,built.mos.substrate],[built.mosReadings.channel,built.mos.channel],[built.invReadings.pmos,built.inverter.pm.channel],[built.invReadings.nmos,built.inverter.nm.channel],[built.invReadings.output,built.inverter.output]])assert(new THREE.Box3().setFromObject(object).expandByScalar(1e-6).containsPoint(reading.m.parent.localToWorld(reading.anchor.clone())),'callouts terminate on their physical part');
   for(const [width,height]of [[320,460],[390,460],[1110,620]])for(const mode of ['web','immersive']){
    built.update(model,time,phase,false,mode==='immersive');const camera=new THREE.PerspectiveCamera(width/height<1?65:46,width/height,.1,150);
    if(mode==='immersive'){const p=microchip.poseAt(phase);camera.position.set(p.x,1.65,p.z);camera.rotation.set(p.pitch,p.yaw,0,'YXZ');}else{const f=microchipFraming(phase,microchip.overview,camera.aspect,camera.fov);camera.position.copy(f.center).addScaledVector(f.direction,f.distance);camera.lookAt(f.center);}
    camera.updateMatrixWorld(true);const viewport={width,height},controls=mode==='immersive'?[{x:width-198,y:7,width:182,height:35},{x:width-130,y:60,width:122,height:132}]:[],obstacles=[...controls,...built.protectedBounds(camera,viewport,phase)];built.layoutLabels(camera,{...viewport,obstacles});transistorLayouts++;
    const shown=built.labels.filter(e=>e.m.userData.chipLabel.layout),roles=shown.map(e=>e.m.userData.chipLabel.role),required=Object.values(phase===0?built.mosReadings:built.invReadings).map(r=>r.m.userData.chipLabel.role).filter(role=>role!=='mos-substrate');for(const role of required)assert(roles.includes(role),JSON.stringify({es,a,phase,mode,width,role,roles}));
    for(const [i,e]of shown.entries()){const info=e.m.userData.chipLabel,r=info.layout;assert.equal(info.fontPixels,13);assert.equal(info.lines.join(' ').replace(/\s+/g,' ').trim(),e.words.replace(/\s+/g,' ').trim());assert(r.x>=12&&r.y>=12&&r.x+r.width<=width-12+1e-7&&r.y+r.height<=height-12+1e-7);for(const o of obstacles)assert(clear(r,o));for(const other of shown.slice(i+1))assert(clear(r,other.m.userData.chipLabel.layout));const depth=-e.m.getWorldPosition(new THREE.Vector3()).applyMatrix4(camera.matrixWorldInverse).z,scale=e.m.getWorldScale(new THREE.Vector3()),factor=height/(2*depth*Math.tan(camera.fov*Math.PI/360));assert(Math.abs(scale.x*factor-r.width)<1e-7&&Math.abs(scale.y*factor-r.height)<1e-7);}
    for(const {object,box}of built.protectedRegions(phase)){assert(visible(object));const g=object.geometry.attributes.position;for(let i=0;i<g.count;i++)assert(box.clone().expandByScalar(1e-7).containsPoint(new THREE.Vector3(g.getX(i),g.getY(i),g.getZ(i)).applyMatrix4(object.matrixWorld)));}
    const versions=built.labels.map(e=>e.texture.version),writes=built.labels.map(e=>e.canvas.writes);built.layoutLabels(camera,{...viewport,obstacles});assert.deepEqual(built.labels.map(e=>e.texture.version),versions);assert.deepEqual(built.labels.map(e=>e.canvas.writes),writes);assert.equal(built.resources.length,resources);assert.deepEqual(built.labels.map(e=>[e.canvas.width,e.canvas.height]),dimensions);
   }
  }assert.equal(JSON.stringify(model.trace),original);
 }
 for(let n=0;n<8;n++){
  const a=n>>2,b=(n>>1)&1,cin=n&1,x=a^b,ab=a&b,sum=x^cin,cx=x&cin,cout=ab|cx,model=microchip.evaluate({a:!!a,b:!!b,carry:!!cin},0),original=JSON.stringify(model.trace);
  for(const t of [0,1.999,2,3.999,4,4.5,5,5.999,6,7.999,8,8.5,9,9.999,10,11.999,12]){
   built.update(model,t,2);states++;
   const args=[[t<2?null:a,t<2?null:b],[t<2?null:a,t<2?null:b],[t<6?null:x,t<6?null:cin],[t<6?null:x,t<6?null:cin],[t<9?null:ab,t<9?null:cx]],answers=[t<4?null:x,t<4?null:ab,t<8?null:sum,t<8?null:cx,t<10?null:cout];
   for(const [i,g]of built.gates.entries())assert.equal(g.valueCaption.m.userData.chipLabel.text,expressions[i]+'\n'+args[i].map(display).join(' '+g.operation+' ')+' → '+display(answers[i]),'the annotation reads received pins and resolved outputs, never expected future bits');
   for(const [id,value]of [['sum',sum],['cout',cout]])assert.equal(built.outputCaptions[id].m.userData.chipLabel.text,`${id==='sum'?'Sum':'Cout'} = ${display(t<12?null:value)}`);
   for(const [width,height]of [[320,460],[390,460],[1110,620]])for(const mode of ['web','immersive'])for(const phase of [2,3]){
    built.update(model,t,phase,false,mode==='immersive');const camera=new THREE.PerspectiveCamera(width/height<1?65:46,width/height,.1,150);
    if(mode==='immersive'){const p=microchip.poseAt(phase);camera.position.set(p.x,1.65,p.z);camera.rotation.set(p.pitch,p.yaw,0,'YXZ');}
    else{const f=phase===2?microchipCircuitFraming(t,microchip.overview,camera.aspect,camera.fov):microchipFraming(phase,microchip.overview,camera.aspect,camera.fov);camera.position.copy(f.center).addScaledVector(f.direction,f.distance);camera.lookAt(f.center);}
    camera.updateMatrixWorld(true);const viewport={width,height},controls=mode==='immersive'?[{x:width-198,y:7,width:182,height:35},{x:width-130,y:60,width:122,height:132}]:[],obstacles=[...controls,...built.protectedBounds(camera,viewport,phase)];built.layoutLabels(camera,{...viewport,obstacles});layouts++;
    const shown=built.labels.filter(e=>e.m.userData.chipLabel.layout),roles=shown.map(e=>e.m.userData.chipLabel.role);
    if(mode==='web'&&phase===2){assert(roles.includes('stage')&&roles.includes('legend'),JSON.stringify({width,t,roles}));if(t<4)for(const role of ['gate-xor1','gate-and1'])assert(roles.includes(role),role);if(t>=5&&t<8)for(const role of ['gate-xor2','gate-and2'])assert(roles.includes(role),role);if(t>=9)for(const role of ['gate-or','output-sum','output-cout'])assert(roles.includes(role),role);}
    if(mode==='web'&&phase===3)for(const role of ['result','result-detail','output-sum','output-cout'])assert(roles.includes(role),JSON.stringify({width,t,roles,role}));
    for(const [i,e]of shown.entries()){
     labels++;const info=e.m.userData.chipLabel,r=info.layout;assert.equal(info.fontPixels,13);assert.equal(info.lines.join(' ').replace(/\s+/g,' ').trim(),e.words.replace(/\s+/g,' ').trim());assert(r.x>=12&&r.y>=12&&r.x+r.width<=width-12+1e-7&&r.y+r.height<=height-12+1e-7);for(const o of obstacles)assert(clear(r,o));for(const other of shown.slice(i+1))assert(clear(r,other.m.userData.chipLabel.layout));
     const p=e.m.getWorldPosition(new THREE.Vector3()),depth=-p.applyMatrix4(camera.matrixWorldInverse).z,scale=e.m.getWorldScale(new THREE.Vector3()),factor=height/(2*depth*Math.tan(camera.fov*Math.PI/360));assert(Math.abs(scale.x*factor-r.width)<1e-7&&Math.abs(scale.y*factor-r.height)<1e-7);
    }
    for(const {object,box}of built.protectedRegions(phase)){assert(visible(object));const g=object.geometry.attributes.position;for(let i=0;i<g.count;i++)assert(box.clone().expandByScalar(1e-7).containsPoint(new THREE.Vector3(g.getX(i),g.getY(i),g.getZ(i)).applyMatrix4(object.matrixWorld)),'protected envelopes include actual gate and terminal geometry');}
    const versions=built.labels.map(e=>e.texture.version),writes=built.labels.map(e=>e.canvas.writes);built.layoutLabels(camera,{...viewport,obstacles});assert.deepEqual(built.labels.map(e=>e.texture.version),versions);assert.deepEqual(built.labels.map(e=>e.canvas.writes),writes);assert.equal(built.resources.length,resources);assert.deepEqual(built.labels.map(e=>[e.canvas.width,e.canvas.height]),dimensions);
   }
  }
  assert.equal(JSON.stringify(model.trace),original);
 }
 const model=microchip.evaluate({a:true,b:true,carry:false},0),camera=new THREE.PerspectiveCamera(65,320/460,.1,150),v={width:320,height:460};
 function paint(t){built.update(model,t,2);const f=microchipCircuitFraming(t,microchip.overview,camera.aspect,camera.fov);camera.position.copy(f.center).addScaledVector(f.direction,f.distance);camera.lookAt(f.center);built.layoutLabels(camera,{...v,obstacles:built.protectedBounds(camera,v,2)});return built.labels.filter(e=>e.m.userData.chipLabel.layout).map(e=>e.canvas.textLines.join(' '));}
 const pixels=paint(7);paint(12);assert.deepEqual(paint(7),pixels,'the actual text repaint restores pending outputs when rewinding');
 built.update(model,7,2,true,false);built.layoutLabels(camera,v);assert(built.labels.every(e=>!e.m.userData.chipLabel.layout),'the whole-circuit view retains its original context policy');
 for(const boundary of [4,5,8,9]){const before=microchipCircuitView(boundary-1e-6),after=microchipCircuitView(boundary+1e-6);assert(new THREE.Vector3(...before.center).distanceTo(new THREE.Vector3(...after.center))<1e-6,'tracking remains continuous at stage boundaries');}
 for(const [t,id]of [[3,'xor1'],[7,'xor2'],[10,'or']]){built.update(model,t,2);built.scene.updateMatrixWorld(true);const g=built.gateRecords[id].body.geometry.attributes.position,projectedWidth=f=>{camera.position.copy(f.center).addScaledVector(f.direction,f.distance);camera.lookAt(f.center);camera.updateMatrixWorld(true);const xs=Array.from({length:g.count},(_,i)=>new THREE.Vector3(g.getX(i),g.getY(i),g.getZ(i)).applyMatrix4(built.gateRecords[id].body.matrixWorld).project(camera).x);return Math.max(...xs)-Math.min(...xs);},full=projectedWidth(microchipFraming(2,microchip.overview,camera.aspect,camera.fov)),focused=projectedWidth(microchipCircuitFraming(t,microchip.overview,camera.aspect,camera.fov));assert(focused/full>2,'the actual focused gate is over twice as wide on a 320px phone as in the original chapter frame');}
 for(const t of [0,4.3,5,8.4,9,12])for(const aspect of [.5,1,1.8]){const f=microchipCircuitFraming(t,microchip.overview,aspect,65),c=new THREE.PerspectiveCamera(65,aspect,.1,150);c.position.copy(f.center).addScaledVector(f.direction,f.distance);c.lookAt(f.center);c.updateMatrixWorld(true);for(const x of [f.bounds[0],f.bounds[3]])for(const y of [f.bounds[1],f.bounds[4]])for(const z of [f.bounds[2],f.bounds[5]]){const p=new THREE.Vector3(x,y,z).project(c);assert(Math.abs(p.x)<=1&&Math.abs(p.y)<=1&&p.z>=-1&&p.z<=1);}}
 assert.equal(new Set(built.resources).size,resources);const tracked=built.resources.filter(r=>r.addEventListener),counts=new Map(tracked.map(r=>[r,0]));tracked.forEach(r=>r.addEventListener('dispose',()=>counts.set(r,counts.get(r)+1)));built.resources.forEach(r=>r.dispose());assert([...counts.values()].every(n=>n===1));
}
console.log(`Microchip readouts: ${states} causal states, ${layouts} layouts, ${labels} labels; ${transistorStates} transistor/inverter states, ${transistorLayouts} additional layouts; all eight input rows, received pins, pending/zero outputs, transistor paths and real anchors, continuous camera, protected geometry, 13px text, rewind and resource ownership: OK`);
