// Renderer smoke test with real Three geometry/math and no browser or GPU.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from './dist/vendor/three.module.js';
import {createTerritory,advanceTerritory} from './dist/territory-model.js';
import {createCity,advanceCity,SECTORS} from './dist/city-model.js';
class Renderer {
 constructor(){this.domElement={};this.shadowMap={};}
 setPixelRatio(){}setClearColor(){}setSize(){}
 render(scene,camera){scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);scene.traverse(o=>{
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
 for(const time of [0,20,80,120,0]){
  const s=regional?advanceTerritory(createTerritory(),time):advanceCity(createCity(),time);
  const input=regional?s:{time:s.industry.time,cityTasks:SECTORS.map(t=>t.tasks),cityAssigned:s.assigned,pending:s.pending};
  world.render(input,time);world.select(regional?38:30);world.render(input,time+.5);world.select(-1,false);world.fit();world.zoomBy(1.2);world.pan(5,-10);
  const p=regional?world.projectTown(2):world.project(5);assert(Number.isFinite(p.x)&&Number.isFinite(p.y));
 }
}
console.log('City and multi-city world: finite geometry, instance capacity, focus, reset and projection at 390px / 1200px OK (no browser/GPU visual QA).');
