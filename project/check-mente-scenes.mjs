import assert from 'node:assert/strict';
import * as THREE from './node_modules/three/build/three.module.js';
import * as model from './site-src/mente/model.js';
import {readFileSync} from 'node:fs';

// Inspect real meshes and caption textures without a WebGL context. Browser
// QA remains responsible for lighting, readable text and frame rate.
globalThis.document={createElement:()=>{
 const canvas={textLines:[],writes:[],fills:[]};let width=300,height=150;
 Object.defineProperties(canvas,{width:{get:()=>width,set:value=>{width=value;canvas.writes.push(['width',value]);}},height:{get:()=>height,set:value=>{height=value;canvas.writes.push(['height',value]);}}});
 const gradient=()=>({addColorStop(){}}),context=new Proxy({font:'10px sans-serif',measureText:text=>({width:String(text).length*24}),createLinearGradient:gradient,createRadialGradient:gradient,fillRect(){canvas.fills.push(this.fillStyle);},fillText(text){canvas.textLines.push(String(text));canvas.writes.push(['text',String(text)]);},clearRect(){canvas.textLines=[];canvas.writes.push(['clear']);}}, {get:(target,name)=>name in target?target[name]:()=>{}});
 canvas.getContext=()=>context;return canvas;
}};
const sourceCheck=process.argv.includes('--source');
const mindModule=sourceCheck?await import('data:text/javascript,'+encodeURIComponent(readFileSync('site-src/mente/world.js','utf8').replace("'../vendor/three.module.js'",JSON.stringify(new URL('./node_modules/three/build/three.module.js',import.meta.url).href)).replace("'./model.js'",JSON.stringify(new URL('./site-src/mente/model.js',import.meta.url).href)))):await import('./dist/mente/world.js');
const near=(a,b,message,epsilon=1e-8)=>assert(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<epsilon,message||`${a} != ${b}`);
function captionObserver(scene,resources){
 const images=new Map();return ()=>{
  const textures=resources.filter(resource=>resource.isCanvasTexture),textureSet=new Set(textures);assert.equal(textureSet.size,textures.length,'each caption texture has one owner');
  scene.traverse(object=>{const materials=Array.isArray(object.material)?object.material:[object.material];for(const material of materials)if(material?.map?.isCanvasTexture)assert(textureSet.has(material.map),'every displayed caption belongs to the GPU disposal list');});
  for(const texture of textures){const image=texture.image,current={width:image.width,height:image.height,text:[...image.textLines],writes:image.writes.length};if(images.has(image))assert.deepEqual(current,images.get(image),'uploaded canvas dimensions and text never mutate during seek');else images.set(image,current);}
 };
}
function snapshot(scene){
 scene.updateMatrixWorld(true);const result=[],geometries=new Set();
 scene.traverse(object=>{
  assert(object.matrixWorld.elements.every(Number.isFinite),'every visible or hidden transform remains finite');
  const geometry=object.geometry;if(geometry&&!geometries.has(geometry)){geometries.add(geometry);for(const attribute of Object.values(geometry.attributes))assert(attribute.array.every(Number.isFinite),'mesh positions and tensor attributes remain finite');}
  if(object.isInstancedMesh)assert([...object.instanceMatrix.array].every(Number.isFinite),'all tensor instances have finite matrices');
  const materials=(Array.isArray(object.material)?object.material:[object.material]).filter(Boolean);
  result.push([object.uuid,object.visible,...object.matrixWorld.elements,materials.map(material=>[material.uuid,material.color?.getHex(),material.opacity,material.emissiveIntensity,material.map?.uuid]),object.isInstancedMesh?[...object.instanceMatrix.array]:null,object.instanceColor?[...object.instanceColor.array]:null]);
 });
 return result;
}
const visible=object=>{for(let part=object;part;part=part.parent)if(!part.visible)return false;return true;};
function assertVisibleVerticesFit(roots,camera,message){
 const checked=new Set();for(const root of roots)if(root)root.traverse(part=>{
  if(checked.has(part)||!visible(part))return;checked.add(part);
  const points=[];
  if(part.isSprite){const center=part.getWorldPosition(new THREE.Vector3()).applyMatrix4(camera.matrixWorldInverse),scale=part.getWorldScale(new THREE.Vector3());for(const x of [-.5,.5])for(const y of [-.5,.5])points.push(new THREE.Vector3(center.x+x*scale.x,center.y+y*scale.y,center.z).applyMatrix4(camera.matrixWorld));}
  else if(part.isMesh){const vertices=part.geometry.attributes.position;for(let instance=0;instance<(part.isInstancedMesh?part.count:1);instance++){const matrix=part.matrixWorld.clone();if(part.isInstancedMesh){const local=new THREE.Matrix4();part.getMatrixAt(instance,local);matrix.multiply(local);}for(let i=0;i<vertices.count;i++)points.push(new THREE.Vector3().fromBufferAttribute(vertices,i).applyMatrix4(matrix));}}
  for(const point of points){const p=point.project(camera);assert(Math.abs(p.x)<=1+1e-6&&Math.abs(p.y)<=1+1e-6&&p.z>=-1&&p.z<=1,`${message}: real ${part.type} vertex projects to ${p.toArray()}`);}
 });
}
function spriteRect(sprite,camera){
 const center=sprite.getWorldPosition(new THREE.Vector3()).applyMatrix4(camera.matrixWorldInverse),scale=sprite.getWorldScale(new THREE.Vector3()),points=[];
 for(const x of [-.5,.5])for(const y of [-.5,.5])points.push(new THREE.Vector3(center.x+x*scale.x,center.y+y*scale.y,center.z).applyMatrix4(camera.matrixWorld).project(camera));
 return [Math.min(...points.map(p=>p.x)),Math.min(...points.map(p=>p.y)),Math.max(...points.map(p=>p.x)),Math.max(...points.map(p=>p.y))];
}
function assertSeparateCaptions(captions,camera,message){
 const shown=captions.filter(caption=>visible(caption.m));
 for(let i=0;i<shown.length;i++)for(let j=i+1;j<shown.length;j++){const a=spriteRect(shown[i].m,camera),b=spriteRect(shown[j].m,camera);assert(a[2]<=b[0]||b[2]<=a[0]||a[3]<=b[1]||b[3]<=a[1],`${message}: ${shown[i].m.material.map.image.textLines.join(' ')} overlaps ${shown[j].m.material.map.image.textLines.join(' ')}`);}
}
function assertCaptionClearOfCensus(caption,clouds,camera,message){
 const rect=spriteRect(caption.m,camera),instance=new THREE.Matrix4(),world=new THREE.Matrix4(),point=new THREE.Vector3();let checked=0;
 for(const cloud of clouds)for(let i=0;i<cloud.count;i++){cloud.getMatrixAt(i,instance);world.multiplyMatrices(cloud.matrixWorld,instance);point.setFromMatrixPosition(world).project(camera);assert(point.x<rect[0]||point.x>rect[2]||point.y<rect[1]||point.y>rect[3],`${message}: grouping label covers census sample ${i}`);checked++;}
 assert.equal(checked,350,'both complete census clouds are checked');
}
function disposeOnce(resources){
 assert.equal(new Set(resources).size,resources.length,'geometries, materials and textures are registered once');
 const counts=new Map(resources.map(resource=>[resource,0]));for(const resource of resources){assert.equal(typeof resource.dispose,'function');const original=resource.dispose;resource.dispose=function(){counts.set(resource,counts.get(resource)+1);return original.call(this);};}for(const resource of resources)resource.dispose();assert([...counts.values()].every(count=>count===1),'every owned GPU resource is disposed exactly once');
}

assert.equal(typeof mindModule.createMindScene,'function','the built site contains the current pure Mente scene builder');
let builds=0,frames=0,frusta=0,buttonRays=0,captionProjections=0,notebookCaptionProjections=0;
const debug=message=>{if(process.argv.includes('--trace'))console.log(message);};
for(const es of [true,false]){
 const built=mindModule.createMindScene(es),{scene,resources,targets,stands,parts,update}=built;builds++;
 const {brain,attention,router,output,weights,energy,marker,groupingTray}=parts,observeCaptions=captionObserver(scene,resources),initial=MFrame({},0);
 function MFrame(params,time){return model.frameAt(model.makeTrace(params),time);}
 assert.equal(stands.length,4);assert.deepEqual(stands.map(button=>button.userData.action),[0,1,2,3]);assert(stands.every(button=>targets.includes(button)));
 assert.equal(brain.hemispheres.length,2);assert.equal(brain.gyri.length,14);assert(brain.stem&&brain.cerebellum);assert.equal(brain.corticalPoints.count,70);assert.equal(brain.cerebellarPoints.count,280);assert.equal(brain.activity,false,'census points are not invented neuronal firing events');
 assert(brain.cerebellum.scale.x*brain.cerebellum.scale.y*brain.cerebellum.scale.z<brain.hemispheres.reduce((volume,part)=>volume+part.scale.x*part.scale.y*part.scale.z,0),'the majority census sample does not turn the cerebellum into the larger anatomical volume');
 const censusMatrices=[...brain.corticalPoints.instanceMatrix.array,...brain.cerebellarPoints.instanceMatrix.array];
 assert.equal(attention.rows.length,12);assert.equal(attention.query.length,3);assert.equal(attention.mix.length,3);assert(attention.rows.every(row=>row.key.length===3&&row.value.length===3&&[...row.key,...row.value].every(cell=>cell.isMesh)),'each rendered K/V row has three actual components');assert.equal(router.blocks.length,8);assert.equal(output.probabilityBars.length,6);assert.equal(parts.card.illustration,true);assert(energy.server&&energy.unknownCaption);assert(!('modelJoules' in energy),'unpublished model energy is not assigned a zero-valued or invented bar');
 assert.match(attention.readyCaption.m.material.map.image.textLines.join(' '),es?/EJEMPLO CALCULADO.*1 CABEZA.*3/:/COMPUTED TOY.*1 HEAD.*3/,'the rendered toy states its reduced layer/head/dimension scope');assert.match(energy.unknownCaption.m.material.map.image.textLines.join(' '),es?/JULIOS NO PUBLICADOS/:/JOULES NOT PUBLISHED/);
 assert(groupingTray,'the human grouping analogy is physically visible, not just a hidden DOM control');assert.equal(groupingTray.tiles.length,8);assert.deepEqual(groupingTray.tiles.map(tile=>tile.label),['A','B','C','D','E','F','G','H']);assert.equal(groupingTray.scope,'illustrative-grouping-not-memory-performance');
 for(const text of ['Q','K','score','softmax','V','Σ aᵢVᵢ']){const heading=attention.labels.children.find(sprite=>sprite.material.map.image.textLines[0]===text);assert(heading,`actual attention heading ${text} exists`);assert(heading.material.map.image.fills.includes('#273d49ed'),'light text gets a contrasting physical plaque');assert(heading.scale.y<=.24+1e-8,'headings have a bounded height');}
 observeCaptions();
 debug('scene '+es+' inventory');
 for(const params of [{},{humanGrouping:true},{promptTokens:0},{promptTokens:13},{promptTokens:8190},{promptTokens:8192},{promptTokens:12000},{mode:'learn',weight:-1.2,label:1},{mode:'learn',weight:2,label:0},{mode:'learn',weight:-8,label:1},{mode:'learn',weight:8,label:0}])for(const time of [0,.4,1,1.9,2,2.4,3,3.9,4,4.9,5,5.8,6,6.4,7,8,12,24,36,47.9,48]){
  const frame=MFrame(params,time);update(frame,1,false,true);frames++;snapshot(scene);observeCaptions();assert.equal(built.state,frame);assert.equal(built.standsGroup.visible,true);assert.deepEqual(groupingTray.groups,frame.brain.human.groups);assert.equal(groupingTray.frames.filter(record=>record.left.visible).length,frame.brain.human.illustratedChunks);groupingTray.frames.forEach((record,i)=>{assert.deepEqual(record.items,frame.brain.human.groups[i]||[]);for(const edge of [record.left,record.right,record.top,record.bottom])assert.equal(edge.visible,i<frame.brain.human.illustratedChunks);});
  const a=frame.attention,n=a?.displayCount||0;assert.equal(attention.rows.filter(row=>row.group.visible).length,n);assert.deepEqual(attention.rowIndices,a?.keyPositions||[]);
  attention.query.forEach((cell,d)=>{assert.equal(cell.visible,!!a?.ready.query);assert.equal(cell.userData.value,a?.ready.query?a.query[d]:null);});attention.mix.forEach((cell,d)=>{assert.equal(cell.visible,!!a?.ready.mixed);assert.equal(cell.userData.value,a?.ready.mixed?a.mixed[d]:null);});
  for(const [i,row] of attention.rows.entries())if(i<n){assert.equal(row.sourceIndex,a.keyPositions[i]);assert.equal(row.token.m.material.map.image.textLines[0],frame.prefix[i].label);assert.equal(row.score,a.ready.scores?a.scores[i]:null);assert.equal(row.weight,a.ready.weights?a.weights[i]:null);assert.equal(row.scoreBar.visible,a.ready.scores);assert.equal(row.weightBar.visible,a.ready.weights);for(const caption of [row.token,row.scoreText,row.weightText])assert(caption.m.scale.y<=.18+1e-8,'visible token/score/probability captions cannot overlap their 0.20-high row');row.key.forEach((cell,d)=>assert.equal(cell.userData.value,a.ready.keys?a.keys[i][d]:null));row.value.forEach((cell,d)=>assert.equal(cell.userData.value,a.ready.values?a.values[i][d]:null));}
  assert.deepEqual(router.selected,frame.router?.ready?frame.router.selected:[]);assert.equal(router.blocks.filter(block=>block.selected).length,frame.router?.ready?2:0);router.blocks.forEach((block,i)=>{assert.equal(block.score,frame.router?.ready?frame.router.scores[i]:null);assert.equal(block.selected,!!frame.router?.ready&&frame.router.selected.includes(i));assert.equal(block.mesh.material.emissiveIntensity>0,block.selected);});
  assert.deepEqual(router.outputs,frame.router?.ready?frame.router.outputs:null);assert.deepEqual(router.mixed,frame.router?.ready?frame.router.mixed:null);assert.equal(output.ready,frame.output.ready);assert.equal(output.value,frame.output.ready?frame.output.label:null);assert.deepEqual(output.emitted,frame.emitted);
  const ranking=frame.probabilities.map((probability,tokenId)=>({probability,tokenId})).sort((a,b)=>b.probability-a.probability||a.tokenId-b.tokenId).slice(0,6);output.probabilityBars.forEach((bar,i)=>{const candidate=ranking[i];assert.equal(bar.index,candidate?.tokenId);assert.equal(bar.value,frame.logitsReady?candidate?.probability:null);assert.equal(bar.mesh.visible,frame.logitsReady&&!!candidate);});if(frame.logitsReady)assert(output.probabilityBars.some(bar=>bar.index===frame.expectedOutput.tokenId),'the actual argmax is among the six explicitly ranked visible candidates');
  assert.equal(marker.visible,frame.mode==='reply'&&frame.inferenceActive);if(marker.visible){assert.equal(marker.userData.phase,frame.phase);near(marker.userData.progress,frame.stageProgress);assert.deepEqual(marker.userData.value,frame.packets.find(packet=>packet.active).value);}
  assert.equal(weights.value,frame.mode==='learn'&&frame.training.after!==null?frame.training.after:frame.training.before);const currentProbability=frame.training.ready.update?frame.training.afterProbability:frame.training.expected.probability;near(weights.probability,currentProbability,'the chart probability comes from the current model weight, before/after as appropriate');near(weights.weightPoint.userData.probability,currentProbability);assert.equal(weights.probabilityCaption.m.material.map.image.textLines[0],'p = '+currentProbability.toFixed(2));near(weights.probabilityCaption.m.position.y,weights.weightPoint.position.y);near(weights.weightPoint.position.y,1.72+currentProbability*1.55);assert.equal(weights.probabilityAxis.m.material.map.image.textLines[0],'p = σ(w)');assert(weights.probabilityCaption.m.scale.y<=.20+1e-8);assert(weights.probabilityAxis.m.scale.y<=.16+1e-8);assert.equal(weights.after.visible,frame.mode==='learn'&&frame.training.after!==null);assert.equal(weights.lock.visible,frame.mode==='reply');assert.equal(energy.joules,frame.brain.energyJoules);assert.equal(energy.seconds,frame.brain.elapsedSeconds);assert.equal(energy.watts,20);near(energy.fill.scale.y,Math.max(.015,2.64*frame.brain.energyJoules/1200));
  assert.deepEqual([...brain.corticalPoints.instanceMatrix.array,...brain.cerebellarPoints.instanceMatrix.array],censusMatrices,'inference and logistic training never fabricate changes to the brain census');
 }
 debug('scene '+es+' causal frames');
 for(const time of [1.9,5.8,13.4,47.9]){
  const frame=MFrame({},time);update(frame,1,false,true);observeCaptions();const partial=snapshot(scene),count=resources.length;update(frame,1,false,true);assert.deepEqual(snapshot(scene),partial,'pause freezes tensors and the active travelling value');assert.equal(resources.length,count);update(MFrame({},48),1,false,true);observeCaptions();update(frame,1,false,true);observeCaptions();assert.deepEqual(snapshot(scene),partial,'rewind restores the exact tensors, marker and emitted prefix');
 }
 update(MFrame({},1.9),3);observeCaptions();const partialEnergyTexture=energy.caption.m.material.map;update(MFrame({},0),3);observeCaptions();const initialEnergyTexture=energy.caption.m.material.map;assert.notEqual(initialEnergyTexture,partialEnergyTexture,'the energy caption changes by switching immutable uploads');update(MFrame({},1.9),3);observeCaptions();assert.equal(energy.caption.m.material.map,partialEnergyTexture,'revisiting a caption reuses its texture rather than repainting it');
 debug('scene '+es+' caption/rewind');
 update(initial,0,false,false);assert(!built.standsGroup.visible);update(initial,0,false,true);scene.updateMatrixWorld(true);
 for(let chapter=0;chapter<4;chapter++){
  debug('scene '+es+' frame chapter '+chapter);
  update(initial,chapter,false,true);scene.updateMatrixWorld(true);assert.equal(built.standsGroup.visible,true,'each FPS raycast restores its actual view after notebook framing');
  const pose=mindModule.mindPoseAt(chapter),camera=new THREE.PerspectiveCamera(64,1,.08,120);camera.position.set(pose.x,1.65,pose.z);camera.rotation.set(pose.pitch,pose.yaw,0,'YXZ');camera.updateMatrixWorld(true);const direction=new THREE.Vector3();camera.getWorldDirection(direction);const focus=new THREE.Vector3(...built.focus[chapter]).sub(camera.position).normalize();assert(direction.dot(focus)>.999999,'the FPS arrival faces its actual physical exhibit');assert(!built.solids.some(box=>pose.x>box[0]&&pose.x<box[2]&&pose.z>box[1]&&pose.z<box[3]));
  const button=stands[chapter],position=button.getWorldPosition(new THREE.Vector3());assert(Math.hypot(pose.x-position.x,pose.z-position.z)<3.8,'the listening pedestal is reachable from its visitor pose');const ray=new THREE.Raycaster(camera.position,position.clone().sub(camera.position).normalize());const firstHit=ray.intersectObjects(targets.filter(visible))[0]?.object;assert.equal(firstHit?.uuid,button.uuid,`a physical stand has a real exposed clicking surface (actual action ${firstHit?.userData?.action??'none'}, expected ${chapter})`);buttonRays++;
  // Project the actual camera-facing quads at the visitor arrival, rather
  // than inferring readability only from their centers or declared bounds.
  for(const params of [{},{promptTokens:48},{mode:'learn',weight:2,label:0},{mode:'learn',weight:-8,label:1},{mode:'learn',weight:8,label:0}])for(const time of [0,8,48])for(const aspect of [.55,1.8]){
   const view=camera.clone();view.aspect=aspect;view.updateProjectionMatrix();view.updateMatrixWorld(true);update(MFrame(params,time),chapter,false,true);scene.updateMatrixWorld(true);
   if(chapter===1)assertSeparateCaptions([attention.readyCaption,attention.contextCaption,output.tapeLabel],view,'FPS attention scope/prefix/output remain separate');
   if(chapter===2)assertSeparateCaptions([weights.trainingCaption,weights.beforeCaption,weights.afterCaption,weights.probabilityCaption,weights.weightAxis,weights.probabilityAxis],view,'FPS probability/update/weight/axis captions remain separate, including extreme weights');
   if(chapter===0){const census=built.annotations[0].children.filter(sprite=>sprite.isSprite&&sprite.material.map.image.textLines.some(line=>/70 \+ 280|314 ×/.test(line))).map(m=>({m}));assertSeparateCaptions([...census,groupingTray.caption],view,'FPS grouping analogy remains separate from census labels');assertCaptionClearOfCensus(groupingTray.caption,[brain.corticalPoints,brain.cerebellarPoints],view,'FPS grouping label');}
   captionProjections++;
  }
  for(const aspect of [.55,1.8])for(const whole of [false,true]){
   const fov=aspect<1?64:46,framing=mindModule.mindFraming(chapter,{whole,distance:10,zoneOverview:!whole},aspect,fov,initial),view=new THREE.PerspectiveCamera(fov,aspect,.08,120);view.position.copy(framing.center).addScaledVector(framing.direction,framing.distance);view.lookAt(framing.center);view.updateMatrixWorld(true);const bounds=framing.bounds;for(const x of [bounds[0],bounds[3]])for(const y of [bounds[1],bounds[4]])for(const z of [bounds[2],bounds[5]]){const p=new THREE.Vector3(x,y,z).project(view);assert(Math.abs(p.x)<=1&&Math.abs(p.y)<=1&&p.z>=-1&&p.z<=1,'the declared exhibit/whole-scene framing fits desktop and narrow portrait views');}
   update(MFrame({},5.4),chapter,whole,false);scene.updateMatrixWorld(true);const chapterParts=[[brain.group,parts.card.group,groupingTray.group],[attention.group,router.group,output.group],[weights.group],[energy.group]][chapter],hardware=whole?[brain.group,parts.card.group,groupingTray.group,attention.group,router.group,output.group,weights.group,energy.group,built.overviewLabelsGroup]:[...chapterParts,built.annotations[chapter]];assertVisibleVerticesFit(hardware,view,`chapter ${chapter}, whole ${whole}, aspect ${aspect}`);if(chapter===0&&!whole){for(const humanGrouping of [false,true]){update(MFrame({humanGrouping},5.4),chapter,false,false);scene.updateMatrixWorld(true);const census=built.annotations[0].children.filter(sprite=>sprite.isSprite&&sprite.material.map.image.textLines.some(line=>/70 \+ 280|314 ×/.test(line))).map(m=>({m}));assert.equal(census.length,2,'both lower census/reference labels are included in the notebook projection check');assertSeparateCaptions([...census,groupingTray.caption],view,'notebook grouping analogy remains separate from census/reference labels in the actual inclined camera');assertCaptionClearOfCensus(groupingTray.caption,[brain.corticalPoints,brain.cerebellarPoints],view,'notebook grouping label');notebookCaptionProjections++;}}frusta++;
  }
 }
 for(const time of [.4,1.4,2.4,3.4,4.4,5.4])for(const aspect of [.55,1.8]){const frame=MFrame({},time),fov=aspect<1?64:46,framing=mindModule.mindFraming(1,{distance:10},aspect,fov,frame),view=new THREE.PerspectiveCamera(fov,aspect,.08,120);view.position.copy(framing.center).addScaledVector(framing.direction,framing.distance);view.lookAt(framing.center);view.updateMatrixWorld(true);const bounds=framing.bounds;for(const x of [bounds[0],bounds[3]])for(const y of [bounds[1],bounds[4]])for(const z of [bounds[2],bounds[5]]){const p=new THREE.Vector3(x,y,z).project(view);assert(Math.abs(p.x)<=1&&Math.abs(p.y)<=1&&p.z>=-1&&p.z<=1,'guided camera framing contains the active operation at every stage');}frusta++;}
 update(MFrame({},48),3,true,false);observeCaptions();const final=snapshot(scene);update(MFrame({},48),3,true,false);assert.deepEqual(snapshot(scene),final,'the final scene remains quiet');assert(!marker.visible);assert(built.overviewLabelsGroup.visible);assert(built.annotations.every(group=>!group.visible));
 disposeOnce(resources);
}
console.log(`Mind scenes: ${builds} bilingual real Three builds (${sourceCheck?'source':'dist'}), ${frames} causal/fractional states, ${frusta} desktop/mobile stage/whole frusta and ${buttonRays} physical stand raycasts, ${captionProjections} actual FPS and ${notebookCaptionProjections} inclined notebook census/grouping caption projections, current logistic probability including ±8 weights, grouping tray and tensor/census counts, frozen brain sample, immutable caption reuse, reversible/final geometry and unique resource disposal: OK (no pixel rendering)`);
