import assert from 'node:assert/strict';
import * as THREE from './node_modules/three/build/three.module.js';
import {cell,cellReading} from './site-src/journeys/cell.js';
import {sampleCell} from './site-src/journeys/cell-model.js';
import {createCellScene,cellTranslationFraming} from './dist/journeys/cell-world.js';
globalThis.document={createElement:()=>{const canvas={width:0,height:0};canvas.getContext=()=>({measureText:s=>({width:s.length*24}),clearRect(){},fillRect(){},fillText(){}});return canvas;}};
const visible=m=>{for(let o=m;o;o=o.parent)if(!o.visible)return false;return true;};let states=0,frames=0;
for(const es of [true,false])for(const variant of [0,1,2]){
 const model=cell.evaluate({variant},0),source=JSON.stringify(model.trace),built=createCellScene(cell,es),last=variant===2?2:4;
 for(const t of [0,4,5,6.99999]){const r=cellReading(sampleCell(model.trace,t),es);assert.equal(r.stage,'waiting');assert.equal(r.codon,null);assert.equal(r.aminoAcid,null);assert(Object.isFrozen(r));}
 for(let i=0;i<=last;i++){
  const start=7+3*i,termination=i===last;
  for(const [time,stage,length] of [[start,termination?'stop-approach':'approaching',i],[start+1-1e-6,termination?'stop-approach':'approaching',i],[start+1,termination?'stop-recognized':'recognized',i],[start+2-1e-6,termination?'stop-recognized':'recognized',i],[start+2,termination?'released':'incorporated',termination?i:i+1]]){
   const s=sampleCell(model.trace,time),r=cellReading(s,es);assert.equal(r.stage,stage);assert.equal(r.chainLength,length);assert.equal(r.index,i);assert.equal(r.codon,s.sequence[i]);assert(r.title.includes(`${i+1}/5`));assert.equal(r.site,termination&&stage==='released'?'A':i===0?'P':'A');assert(Object.isFrozen(r));
   if(termination){assert.equal(r.aminoAcid,null);assert(r.title.endsWith('→ STOP'));assert(!/tRNA|ARNt/.test(r.detail));}else{assert.equal(r.aminoAcid,['Met','Ala','Phe','Glu'][i]);if(stage==='recognized'||stage==='approaching')assert(r.detail.includes(es?'sin incorporar':'not yet incorporated'));}
   states++;
  }
 }
 const recycled=cellReading(sampleCell(model.trace,10+last*3),es);assert.equal(recycled.stage,'recycled');assert.equal(recycled.chainLength,last);assert(recycled.detail.includes(es?'ARN conservado':'RNA retained'));
 for(let time=7;time<=24;time+=.125){
  built.update(model,time,2);built.scene.updateMatrixWorld(true);const position=built.ribosome.group.position.clone(),r=cellReading(built.state,es),codon=built.state.translation.codonIndex;
  for(const [aspect,fov] of [[.75,65],[1.15,46],[2.1,46]]){
   const frame=cellTranslationFraming(position,cell.overview,aspect,fov),camera=new THREE.PerspectiveCamera(fov,aspect,.1,150);camera.position.copy(frame.center).addScaledVector(frame.direction,frame.distance);camera.lookAt(frame.center);camera.updateMatrixWorld(true);
   const objects=[built.ribosome.group,built.chain.group,...built.mrna.bases.slice(3*codon,3*codon+3).map(r=>r.mesh),built.mrna.codons[codon].highlight];let inspected=0;
   for(const object of objects)object.traverse(m=>{if(!m.isMesh||!visible(m))return;m.geometry.computeBoundingBox();const b=m.geometry.boundingBox;for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){const p=new THREE.Vector3(x,y,z).applyMatrix4(m.matrixWorld).project(camera);assert(Math.abs(p.x)<1&&Math.abs(p.y)<1&&p.z>=-1&&p.z<=1,`active ${m.type} fits ${variant}/${time}/${aspect}`);}inspected++;});assert(inspected>2);assert.deepEqual(built.ribosome.group.position.toArray(),position.toArray());frames++;
  }
  if(time===14&&variant===2){assert.equal(r.stage,'stop-recognized');assert.equal(built.chain.length,2);assert(!built.trnas.elongation.group.visible,'STOP has no incoming aminoacyl tRNA');assert(built.trnas.peptidyl.group.visible&&built.trnas.peptidyl.site==='P','the existing chain remains on its P-site carrier until release');assert(built.releaseFactor.bound&&built.releaseFactor.site==='A');}
 }
 const snapshot=time=>{built.update(model,time,2);return cellReading(built.state,es);};const before=snapshot(11);snapshot(24);assert.deepEqual(snapshot(11),before,'rewind reconstructs recognized-but-unincorporated state');assert.equal(JSON.stringify(model.trace),source);built.resources.forEach(r=>r.dispose());
}
console.log(`Cell reading: ${states} explicit event states and ${frames} real active-mechanism frames; P/A, recognition before incorporation, first STOP without tRNA, release/recycle, frozen data and rewind: OK`);
