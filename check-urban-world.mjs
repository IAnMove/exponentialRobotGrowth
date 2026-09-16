// Renderer smoke test with real Three geometry/math and no browser or GPU.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from './dist/vendor/three.module.js';
import {createTerritory,advanceTerritory} from './dist/territory-model.js';
import {createCity,advanceCity,SECTORS} from './dist/city-model.js';
import {createFactory,tick,advance} from './dist/factory-model.js';
class Renderer {
 constructor(){this.domElement={};this.shadowMap={};}
 setPixelRatio(){}setClearColor(){}setSize(){}
 render(scene,camera){Renderer.lastScene=scene;scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);scene.traverse(o=>{
  assert(o.matrixWorld.elements.every(Number.isFinite));
  if(o.isInstancedMesh){assert(o.count<=o.instanceMatrix.count);assert([...o.instanceMatrix.array].every(Number.isFinite));}
 });}
}
globalThis.testTHREE={...THREE,WebGLRenderer:Renderer};
globalThis.devicePixelRatio=1.5;
globalThis.ResizeObserver=class {constructor(fn){this.fn=fn;}observe(){this.fn();}};
const code=fs.readFileSync('dist/urban-world.js','utf8')
 .replace("import * as THREE from './vendor/three.module.js';",'const THREE=globalThis.testTHREE;')
 .replace("'./region-model.js'",JSON.stringify(new URL('./dist/region-model.js',import.meta.url).href));
const {createUrbanWorld}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
for(const width of [390,1200])for(const regional of [false,true]){
 const container={clientWidth:width,clientHeight:600,append(){},getBoundingClientRect(){return {left:0,top:0,width,height:600};}};
 const world=createUrbanWorld(container,{regional});
 const mirror=createUrbanWorld(container,{regional});
 world.select(regional?38:30);world.zoomBy(1.2);world.pan(5,-10);
 mirror.setView(world.getView());assert.deepEqual(mirror.getView(),world.getView());
 for(const time of [0,20,80,120,0]){
  const s=regional?advanceTerritory(createTerritory(),time):advanceCity(createCity(),time);
  const input=regional?s:{time:s.industry.time,cityTasks:SECTORS.map(t=>t.tasks),cityAssigned:s.assigned,pending:s.pending};
  world.render(input,time);world.select(regional?38:30);world.render(input,time+.5);world.select(-1,false);world.fit();world.zoomBy(1.2);world.pan(5,-10);
  mirror.setView(world.getView());mirror.render(input,time);assert.deepEqual(mirror.getView(),world.getView());
  const p=regional?world.projectTown(2):world.project(5);assert(Number.isFinite(p.x)&&Number.isFinite(p.y));
 }
}
const hidden=createUrbanWorld({clientWidth:0,clientHeight:0,append(){},getBoundingClientRect(){return {left:0,top:0,width:0,height:0};}},{regional:true});
assert.equal(hidden.render(createTerritory(),0),6);
globalThis.document={createElement(){return {getContext(){return {fillText(){}};}};}};
const factoryCode=fs.readFileSync('dist/factory-world.js','utf8')
 .replace("import * as THREE from './vendor/three.module.js';",'const THREE=globalThis.testTHREE;')
 .replace("'./factory-model.js'",JSON.stringify(new URL('./dist/factory-model.js',import.meta.url).href));
const {createFactoryWorld,POSITIONS}=await import('data:text/javascript;base64,'+Buffer.from(factoryCode).toString('base64'));
for(const width of [390,1200]){
 const world=createFactoryWorld({clientWidth:width,clientHeight:600,parentElement:{style:{}},append(){}});
 const s=createFactory(undefined,true);while(!s.firstReturn)tick(s);
 world.render(s,0,3,true);
 let ring;Renderer.lastScene.traverse(o=>{if(o.geometry?.type==='TorusGeometry')ring=o;});
 assert(ring?.visible);assert.equal(ring.position.x,-12);
 advance(s,.25);world.render(s,.1,3,true);
 assert(Math.abs(ring.position.x-POSITIONS[s.firstReturn.station][0]+1)<1e-6,'Visible arrival must match the deployment clock, even when skipping');
 advance(s,3);world.render(s,.2,3,true);assert(!ring.visible);
 const reset=createFactory(undefined,true);world.render(reset,0,3,true);while(!reset.firstReturn)tick(reset);world.render(reset,.1,3,true);
 assert.equal(ring.position.x,-12,'A reset must restart the first journey at the output');
}
console.log('Factory first journey, time skips and reset: finite geometry and synchronized arrival at 390px / 1200px OK.');
console.log('City and multi-city world: finite geometry, instance capacity, focus, reset and projection at 390px / 1200px OK (no browser/GPU visual QA).');
