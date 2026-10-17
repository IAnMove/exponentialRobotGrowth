import assert from 'node:assert/strict';
import * as THREE from './dist/vendor/three.module.js';
import {createHomeScene,homePlanningReading,homeFraming,homePoseAt,restoreHomePose,homeRoomAt} from './dist/home/world.js';
import {makeHomeTrace,homeFrameAt} from './site-src/home/model.js';
globalThis.document={createElement:()=>{const c={width:0,height:0,words:[]},x={measureText:s=>({width:String(s).length*24}),fillText:s=>c.words.push(String(s)),clearRect:()=>c.words=[],createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})};c.getContext=()=>new Proxy(x,{get:(o,k)=>o[k]??(()=>{})});return c;}};
const times=[60,61.999,62,62.5,62.999,63,65.999,66,67.999,68,69.499,69.5,69.999,70],bounds=[[62,63],[63,66],[66,68],[68,69.5]],roles=['input','draft','review','approval'];
const visible=m=>{for(let q=m;q;q=q.parent)if(!q.visible)return false;return true;};let readings=0,rays=0;
for(const es of[true,false]){const built=createHomeScene(es),panel=built.parts.planningPanel,resources=built.resources.length,images=panel.digits.map(d=>d.m.material.map.image),snapshots=images.map(i=>JSON.stringify(i));assert.equal(panel.tiles.length,4);
 for(const [capacity,overhead]of[['robots',0],['robots',20],['human',0]]){const trace=makeHomeTrace({capacity,overhead});
  for(const time of times){const frame=homeFrameAt(trace,time),before=JSON.stringify(frame),r=homePlanningReading(frame,es);built.update(frame,6,false,false);assert.deepEqual(panel.reading,r);assert.equal(panel.state,frame.planning);assert.equal(JSON.stringify(frame),before);
   assert.deepEqual(r.steps.map(s=>s.role),roles);assert.match(r.scope,es?/Sin IA real.*supuesta/:/No real AI.*assumed/);
   assert.match(r.review,capacity==='human'?(es?/referencia humana/:/human baseline/):overhead?(es?/apoyo humano supuesto/:/assumed human assistance/):(es?/delegación supuesta/:/assumed delegation/));
   r.steps.forEach((s,i)=>{const status=time<bounds[i][0]?'pending':time<bounds[i][1]?'processing':'ready';assert.equal(s.status,status);assert.equal(s.number,i+1);assert.equal(panel.tiles[i].userData.planningRole,roles[i]);assert.equal(panel.tiles[i].userData.status,status);assert.equal(panel.tiles[i].material.color.getHex(),status==='ready'?0x8dc6b5:status==='processing'?0xebc180:0xdce3e1);assert(s.title&&s.text);});
   assert.equal(frame.ledger.pendingBaseline,time<70?15:0);const heldResources=built.resources.length;built.update(frame,6,false,false);assert.equal(built.resources.length,heldResources,'a held frame allocates no further resources');images.forEach((image,i)=>{assert.equal(panel.digits[i].m.material.map.image,image);assert.equal(JSON.stringify(image),snapshots[i],'the physical digits never repaint during a seek');assert(built.resources.includes(panel.digits[i].m.material.map));});readings++;
  }
  const frame=homeFrameAt(trace,69.6);
  for(const immersive of[false,true])for(const aspect of[294/280,364/280,1060/500]){built.update(frame,6,false,immersive);const fov=aspect<1?64:46,camera=new THREE.PerspectiveCamera(fov,aspect,.055,120);if(immersive){const p=homePoseAt(6);assert.equal(homeRoomAt(p).id,'study');assert.deepEqual(restoreHomePose(p),p);camera.position.set(p.x,1.65,p.z);camera.rotation.set(p.pitch,p.yaw,0,'YXZ');}else{const f=homeFraming(6,{distance:10},aspect,fov,frame);camera.position.copy(f.center).addScaledVector(f.direction,f.distance);camera.lookAt(f.center);}camera.updateMatrixWorld(true);built.scene.updateMatrixWorld(true);
   const solid=[];built.scene.traverse(m=>{if(m.isMesh&&visible(m)&&!Array.isArray(m.material)&&m.material.opacity>.6)solid.push(m);});
   for(const tile of panel.tiles){const target=tile.getWorldPosition(new THREE.Vector3()),direction=target.clone().sub(camera.position),distance=direction.length(),ray=new THREE.Raycaster(camera.position,direction.normalize(),0,distance+.01),hit=ray.intersectObjects(solid,false)[0];assert.equal(hit?.object,tile,`${es}/${capacity}/${immersive}/${aspect}: default view must reach each actual screen tile`);rays++;}
  }
 }
 const restore=homePlanningReading(homeFrameAt(makeHomeTrace({capacity:'robots',overhead:20}),62.5),es);built.update(homeFrameAt(makeHomeTrace({capacity:'robots',overhead:20}),70),6,false,false);built.update(homeFrameAt(makeHomeTrace({capacity:'robots',overhead:20}),62.5),6,false,false);assert.deepEqual(panel.reading,restore);for(const resource of built.resources)resource.dispose();
}
console.log(`Home planning: ${readings} bilingual causal document states, ${rays} unobscured real screen-tile rays, three reviewer scenarios, no early accounting, fixed physical digit textures and rewind OK`);
