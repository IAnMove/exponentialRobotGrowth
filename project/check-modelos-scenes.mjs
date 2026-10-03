import assert from 'node:assert/strict';
import * as THREE from './node_modules/three/build/three.module.js';
import * as model from './site-src/modelos/model.js';
import {readFileSync} from 'node:fs';

// Inspect real meshes and caption textures without a WebGL context. Browser
// QA remains responsible for lighting, readable text and frame rate.
globalThis.document={createElement:()=>{
 const canvas={textLines:[],writes:[],fills:[]};let width=300,height=150;
 Object.defineProperties(canvas,{width:{get:()=>width,set:value=>{width=value;canvas.writes.push(['width',value]);}},height:{get:()=>height,set:value=>{height=value;canvas.writes.push(['height',value]);}}});
 const gradient=()=>({addColorStop(){}}),context=new Proxy({font:'10px sans-serif',measureText:text=>({width:String(text).length*24}),createLinearGradient:gradient,createRadialGradient:gradient,fillRect(){canvas.fills.push(this.fillStyle);},fillText(text){canvas.textLines.push(String(text));canvas.writes.push(['text',String(text)]);},clearRect(){canvas.textLines=[];canvas.writes.push(['clear']);}}, {get:(target,name)=>name in target?target[name]:()=>{}});
 canvas.getContext=()=>context;return canvas;
}};
const near=(a,b,message,epsilon=1e-8)=>assert(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<epsilon,message||`${a} != ${b}`);
function captionObserver(scene,resources){
 const images=new Map();return ()=>{
  const textures=[...resources].filter(resource=>resource.isCanvasTexture),textureSet=new Set(textures);assert.equal(textureSet.size,textures.length,'each caption texture has one owner');
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
function captionRect(sprite,camera){
 const points=[];if(sprite.isMesh){const vertices=sprite.geometry.attributes.position;for(let i=0;i<vertices.count;i++)points.push(new THREE.Vector3().fromBufferAttribute(vertices,i).applyMatrix4(sprite.matrixWorld).project(camera));}else{const center=sprite.getWorldPosition(new THREE.Vector3()).applyMatrix4(camera.matrixWorldInverse),scale=sprite.getWorldScale(new THREE.Vector3());for(const x of [-.5,.5])for(const y of [-.5,.5])points.push(new THREE.Vector3(center.x+x*scale.x,center.y+y*scale.y,center.z).applyMatrix4(camera.matrixWorld).project(camera));}
 return [Math.min(...points.map(p=>p.x)),Math.min(...points.map(p=>p.y)),Math.max(...points.map(p=>p.x)),Math.max(...points.map(p=>p.y))];
}
function assertSeparateCaptions(captions,camera,message){
 const shown=captions.filter(caption=>visible(caption.m));
 for(let i=0;i<shown.length;i++)for(let j=i+1;j<shown.length;j++){const a=captionRect(shown[i].m,camera),b=captionRect(shown[j].m,camera);assert(a[2]<=b[0]||b[2]<=a[0]||a[3]<=b[1]||b[3]<=a[1],`${message}: ${shown[i].m.material.map.image.textLines.join(' ')} overlaps ${shown[j].m.material.map.image.textLines.join(' ')}`);}
}
function disposeOnce(built){
 const resources=[...built.resources];assert.equal(new Set(resources).size,resources.length,'geometries, materials and textures are registered once');
 const counts=new Map(resources.map(resource=>[resource,0]));for(const resource of resources){assert.equal(typeof resource.dispose,'function');const original=resource.dispose;resource.dispose=function(){counts.set(resource,counts.get(resource)+1);return original.call(this);};}
 built.dispose();built.dispose();assert([...counts.values()].every(count=>count===1),'idempotent scene disposal releases each owned GPU resource once');
}




const walk=await import('./site-src/modelos/walk.js');
// Independent geometric clearance: use distance to the actual authored
// rectangles, rather than the navigator's own segment-clear predicate.
function pathClearPoint(point,radius=.239){
 for(const box of walk.MODELS_SOLIDS){const dx=Math.max(box[0]-point.x,0,point.x-box[2]),dz=Math.max(box[1]-point.z,0,point.z-box[3]);assert(Math.hypot(dx,dz)>=radius,`visitor path intersects physical rectangle ${JSON.stringify(box)} at ${JSON.stringify(point)}`);}
 assert(point.x>=-23.5&&point.x<=23.5&&point.z>=-9.5&&point.z<=9.5);
}
let guideSamples=0,walkingSamples=0;
assert.equal(walk.MODELS_LAYOUT.length,12);assert.equal(walk.MODELS_STANDS.length,12);
for(let i=0;i<12;i++){
 const arrival=walk.modelsPoseAt(i);pathClearPoint(arrival);assert.equal(walk.modelsNearestStand(arrival)?.index,i);
 assert.equal(walk.modelsNearestStand({...arrival,yaw:arrival.yaw+Math.PI}),null,'E cannot play a station behind the visitor');
 assert.equal(walk.modelsNearestStand({...arrival,pitch:1.2}),null,'E cannot select an unseen stand above the view');
 for(let j=0;j<12;j++){
  const destination=walk.modelsPoseAt(j),path=walk.modelsGuidePath(arrival,destination);assert(path.length>=2,`guide connects stations ${i} and ${j}`);near(path[0].x,arrival.x);near(path[0].z,arrival.z);near(path.at(-1).x,destination.x);near(path.at(-1).z,destination.z);
  for(let k=1;k<path.length;k++){const a=path[k-1],b=path[k],samples=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.04);for(let n=0;n<=samples;n++){const t=samples?n/samples:0;pathClearPoint({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});guideSamples++;}}
 }
 for(const direction of [{forward:1,strafe:0},{forward:-1,strafe:0},{forward:1,strafe:1},{forward:0,strafe:-1}]){
  let pose=arrival;for(let step=0;step<120;step++){const next=walk.modelsWalk(pose,direction,.05);for(let n=0;n<=5;n++){const t=n/5;pathClearPoint({x:pose.x+(next.x-pose.x)*t,z:pose.z+(next.z-pose.z)*t},.23);walkingSamples++;}pose=next;}
 }
}
const initial=walk.modelsPoseAt(0),straight=walk.modelsWalk(initial,{forward:1,strafe:0},.05),diagonal=walk.modelsWalk(initial,{forward:1,strafe:1},.05);
near(Math.hypot(straight.x-initial.x,straight.z-initial.z),Math.hypot(diagonal.x-initial.x,diagonal.z-initial.z),'diagonal movement has the same speed');
assert.deepEqual(walk.modelsWalk(initial,{forward:1,strafe:1},NaN),initial);const savedPose={...initial,yaw:12.345,pitch:-.456};assert.deepEqual(walk.restoreModelsPose(savedPose),savedPose);assert.notEqual(walk.restoreModelsPose(savedPose),savedPose);assert.deepEqual(walk.restoreModelsPose({x:-18,z:-7,yaw:0,pitch:0}),initial,'a saved pose inside a physical display resets to a safe arrival');


const sourceCheck=process.argv.includes('--source')||!process.argv.includes('--dist'),worldPath=sourceCheck?'site-src/modelos/world.js':'dist/modelos/world.js';
const modelUrl=new URL('./site-src/modelos/model.js',import.meta.url).href,walkUrl=new URL('./site-src/modelos/walk.js',import.meta.url).href,threeUrl=new URL('./node_modules/three/build/three.module.js',import.meta.url).href;
let worldSource=readFileSync(worldPath,'utf8').replace("'../vendor/three.module.js'",JSON.stringify(threeUrl)).replaceAll("'./model.js'",JSON.stringify(modelUrl)).replaceAll("'./walk.js'",JSON.stringify(walkUrl)).replace(/^import \{createPost\}.*$/m,"const createPost=()=>{throw Error('Native WebGL wrapper is covered by browser QA');};");
const world=await import('data:text/javascript;base64,'+Buffer.from(worldSource).toString('base64'));
const text=caption=>caption.m.userData.text??caption.m.material.map.image.textLines.join(' '),money=n=>'$'+n.toFixed(4),vector=a=>'['+a.map(n=>Math.abs(n)<.0001&&n!==0?n.toExponential(1):n.toFixed(2)).join(', ')+']';
const elements=n=>[n*1966080,n*34560],commonScale=2.55/(32000*1966080),positions=i=>(i-3.5)*.40;
const failures=[];let framesChecked=0,rayChecks=0,frusta=0,visibilityRays=0;
function fit(roots,camera,message){try{assertVisibleVerticesFit(roots,camera,message);}catch(error){if(failures.length<24)failures.push(error.message);}frusta++;}
function notebookCamera(index,aspect,whole=false){const fov=aspect<1?64:46,camera=new THREE.PerspectiveCamera(fov,aspect,.055,180),orbit=whole?{yaw:.38,pitch:.65,distance:10,whole:true}:{distance:10,whole:false},f=world.modelsFraming(index,orbit,aspect,fov);camera.position.copy(f.center).addScaledVector(f.direction,f.distance);camera.lookAt(f.center);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);return camera;}
function fpsCamera(index,aspect){const pose=walk.modelsPoseAt(index),camera=new THREE.PerspectiveCamera(80,aspect,.055,180);camera.position.set(pose.x,1.65,pose.z);camera.rotation.set(pose.pitch,pose.yaw,0,'YXZ');camera.updateProjectionMatrix();camera.updateMatrixWorld(true);return camera;}
function sameRodEnds(mesh,from,to,root,message){const expected=[from,to].map(p=>new THREE.Vector3(...p).applyMatrix4(root.matrixWorld)),actual=[-.5,.5].map(y=>new THREE.Vector3(0,y,0).applyMatrix4(mesh.matrixWorld));assert(Math.min(actual[0].distanceTo(expected[0])+actual[1].distanceTo(expected[1]),actual[0].distanceTo(expected[1])+actual[1].distanceTo(expected[0]))<1e-7,message);}
function dataOracles(built,frame){
 const {parts,stations}=built,{trace,params,chapter,progress:p}=frame,s=stations[chapter];assert.equal(s.group.userData.chapter,chapter);near(s.group.userData.progress,p);
 if(chapter===1||chapter===2){const a=s.attention,row=trace.attention[chapter===1?'causal':'encoder'][params.query];assert.equal(a.queryIndex,params.query);assert.equal(a.outputReady,frame.attention.ready);assert.equal(text(a.output),frame.attention.ready?'Σ aV = '+vector(row.output):chapter>=0?(built.es?'Mezcla pendiente':'Mixture pending'):'');
  for(let i=0;i<8;i++){assert.equal(a.tokens[i].body.userData.activeQuery,i===params.query);assert.equal(a.masks[i].body.userData.allowed,chapter===2||i<=params.query,'permission represents the causal mask, independent of score');near(a.bars[i].body.userData.weight,row.weights[i]);near(a.bars[i].body.scale.y,Math.max(.0001,p>=.5?.60*row.weights[i]:0));for(let d=0;d<2;d++){near(Number(text(a.keyComponents[i][d])),trace.attention.k[i][d],'shown K component is the computed value rounded to two decimals',.006);near(Number(text(a.valueComponents[i][d])),trace.attention.v[i][d],'shown V component is the computed value rounded to two decimals',.006);}assert.equal(a.scores[i].m.visible,frame.attention.readiness.scores,'scores cannot precede their narrated phase');assert.equal(a.links[i].visible,(chapter===2||i<=params.query)&&p>=.5);if(a.links[i].visible)sameRodEnds(a.links[i],[positions(params.query),3.10,.42],[positions(i),2.76,.42],s.content,'attention connection links the chosen query to its allowed key');assert.equal(text(a.masks[i].caption),p>=.5?(row.allowed[i]?'✓':'×'):'—');}
 }
 if(chapter===3){const a=s.encdec,row=trace.attention.cross[params.query];for(let i=0;i<8;i++){assert.equal(a.source[i].body.userData.sourceVisible,true);assert.equal(a.decoder[i].body.userData.allowed,i<=params.query,'decoder mask does not hide encoded source positions');near(a.bars[i].body.scale.y,Math.max(.0001,p>=.5?.70*row.weights[i]:0));assert.equal(a.crossLinks[i].visible,p>=.5);assert.equal(a.decoderLinks[i].visible,i<=params.query);}assert.equal(text(a.output),frame.attention.ready?'Σ aV = '+vector(row.output):built.es?'Atención cruzada pendiente':'Cross attention pending');}
 if(chapter===4){const a=s.moe,rank=trace.moe.logits.map((n,i)=>({n,i})).sort((a,b)=>b.n-a.n||a.i-b.i).slice(0,2).map(x=>x.i);assert.equal(a.outputReady,frame.moe.ready);for(let i=0;i<8;i++){const e=a.experts[i];assert.equal(e.cell.body.userData.active,rank.includes(i));near(e.cell.body.userData.weight,trace.moe.weights[i]);assert.equal(text(e.value),p<.35?'—':!rank.includes(i)?built.es?'Sin ejecutar':'Not executed':p<.55?built.es?'Pendiente':'Pending':vector(trace.moe.expertOutputs[i]),'inactive experts and unfinished expert execution cannot show a future result');assert.equal(e.in.visible,rank.includes(i)&&p>=.35);assert.equal(e.out.visible,e.in.visible);}assert.equal(text(a.output),frame.moe.ready?'Σ aᵢ yᵢ = '+vector(trace.moe.output):built.es?'Mezcla pendiente':'Mixture pending');}
 if(chapter===5){const a=s.ssm;assert.equal(a.bars.length,3,'state width does not append a new vector per token');for(let i=0;i<3;i++){near(a.bars[i].body.userData.value,trace.ssm.states[frame.completed][i]);near(a.bars[i].body.scale.y,Math.max(.0001,Math.abs(trace.ssm.states[frame.completed][i])*.7));}assert.equal(a.completed,Math.floor(p*8));assert.equal(a.jamba.length,8);assert.deepEqual(a.jamba.map(c=>text(c.caption)),['M','M','M','M','M','M','M','A']);assert(text(a.equation).includes('tanh'),'the displayed recurrence matches its nonlinear input transform');}
 if(chapter===6){const a=s.diffusion;assert.equal(a.rounds,params.denoise);assert.equal(a.roundIndex,Math.floor(p*params.denoise));assert.deepEqual(a.tokens.map(c=>c.body.userData.token),[...frame.diffusion.state]);assert.deepEqual(a.ar.map(c=>c.body.userData.token),[...frame.autoregressive.state]);assert.deepEqual(a.tokens.map(c=>text(c.caption)),[...frame.diffusion.state]);assert.deepEqual(a.ar.map(c=>text(c.caption)),[...frame.autoregressive.state]);}
 if(chapter===7){const a=s.jepa;assert.equal(a.patches.filter(p=>p.userData.branch==='context'&&!p.userData.inputVisible).length,4);assert(a.patches.filter(p=>p.userData.branch==='target').every(p=>p.userData.inputVisible),'target encoder sees the complete synthetic input');for(let i=0;i<6;i++){near(a.predicted[i].body.userData.value,trace.jepa.predicted[i]);near(a.target[i].body.userData.value,trace.jepa.target[i]);assert.equal(a.squared[i].m.visible,i<frame.jepa.completedDimensions,'future squared differences are not shown early');}assert.equal(text(a.error).startsWith('MSE'),frame.jepa.ready,'full MSE appears only after all six comparisons');}
 if(chapter===8){const a=s.typed;for(let q=0;q<2;q++){const item=trace.jev[q],record=a.questions[q],revealed=q<frame.typedRevealed;assert.equal(record.revealed,revealed);assert.equal(text(record.choice).includes(built.es?'Pendiente':'Pending'),!revealed);assert.deepEqual(record.options.map(o=>text(o.caption)),built.es?['sí','no']:['yes','no']);for(let i=0;i<2;i++){near(record.bars[i].body.scale.y,Math.max(.0001,revealed?item.probabilities[i]*.73:0));near(record.options[i].body.userData.probability,item.probabilities[i]);}}}
 if(chapter===9){const a=s.cache;assert.equal(a.cold,frame.requestIndex===0);assert.equal(a.output.body.userData.recomputedEveryRequest,true);assert.equal(a.links[2].visible,true,'new output is computed through the final path on cold and cached calls');near(a.store.body.userData.hitTokens,a.cold?0:params.prefix*params.hitFraction);assert(text(a.costs).endsWith(money(trace.bill.first.outputCost)),'new output costs the same on cold and cached requests');assert.equal(a.running.completedRequests,Math.floor(p*params.repeats));}
 if(chapter===10){const a=s.memory,n=Math.floor(params.tokens*p),[mha,mla]=elements(n);near(a.mha.body.userData.elements,mha);near(a.mla.body.userData.elements,mla);near(a.mha.body.userData.height,mha*commonScale);near(a.mla.body.userData.height,mla*commonScale);near(a.inset.body.userData.height,mla*commonScale*16);assert.equal(a.inset.body.userData.countsAsObject,false);assert.equal(a.inset.body.userData.magnification,16);if(n)near(a.mha.body.scale.y/a.mla.body.scale.y,512/9,'the actual common-scale bars represent the 56.89× difference');else{assert.equal(a.mha.body.visible,false);assert.equal(a.mla.body.visible,false);}assert(!/NaN|Infinity/.test(text(a.ratio)));}
 if(chapter===11){const a=s.rule,n=Math.floor(p*params.repeats),r=trace.rule;assert.equal(a.writeRead.geometry.drawRange.count,n+1);assert.equal(a.fresh.geometry.drawRange.count,n+1);assert.equal(a.completedRequests,n);near(a.marker.position.x,-1.55+n/params.repeats*3.1);for(let i=0;i<=n;i++){const cached=params.prefix/1e6*params.baseInput*(i?(params.writeRule==='1h'?2:1.25)+(i-1)*params.readMultiplier:0),fresh=params.prefix/1e6*params.baseInput*i;const max=Math.max(params.prefix/1e6*params.baseInput*params.repeats,params.prefix/1e6*params.baseInput*((params.writeRule==='1h'?2:1.25)+(params.repeats-1)*params.readMultiplier),1e-12);near(a.writeRead.points[i][1],.94+cached/max*1.85);near(a.fresh.points[i][1],.94+fresh/max*1.85);near(a.writeRead.geometry.attributes.position.getY(i),.94+cached/max*1.85,'the visible curve uses the same cost scale',1e-6);near(r.withCache[i],cached);near(r.noCache[i],fresh);}assert.equal(a.writeRead.line.userData.costs,r.withCache);}
 for(const a of [s.attention,s.moe,s.cache])if(a?.travelers)for(const m of a.travelers){assert.equal(m.userData.countsAsObject,false);const from=m.userData.from,to=m.userData.to,u=m.userData.progress;if(from&&to){const expected=new THREE.Vector3(...from).lerp(new THREE.Vector3(...to),u).applyMatrix4(s.content.matrixWorld),actual=m.getWorldPosition(new THREE.Vector3());near(expected.distanceTo(actual),0,'the visible highlight lies on its declared causal connection');}if(s.attention){const scoring=p>=.25&&p<.5,mixing=p>=.5&&p<.8;const i=a.travelers.indexOf(m);assert.equal(m.visible,scoring||mixing&&a.row.allowed[i]&&a.row.weights[i]>0);}if(s.moe){const i=a.travelers.indexOf(m);assert.equal(m.visible,trace.moe.active.includes(i)&&p>=.35&&p<.8);}if(s.cache&&p===1)assert.equal(m.visible,false,'no values continue travelling after the completed request sequence');}
}
function allCaptions(station){const labels=[];station.group.traverse(o=>{if((o.isSprite||o.userData.isLabel)&&o.material.map?.isCanvasTexture)labels.push({m:o});});return labels;}
function visibilityRay(built,camera,target,description){
 const blockers=[];let seen=0;for(const x of [-.25,0,.25]){const point=new THREE.Vector3(x,0,.5).applyMatrix4(target.matrixWorld),direction=point.clone().sub(camera.position),distance=direction.length(),ray=new THREE.Raycaster(camera.position,direction.normalize(),.001,distance+.3);ray.camera=camera;let first;for(const hit of ray.intersectObjects(built.scene.children,true)){if(!visible(hit.object)||hit.object.isSprite||hit.object.userData.isLabel||hit.object.material?.opacity<=.6)continue;first=hit.object;break;}if(first?.uuid===target.uuid)seen++;else blockers.push(first?.type+' '+JSON.stringify(first?.userData));visibilityRays++;}assert(seen>0,description+' has all three surface samples blocked by '+blockers.join('; '));
}
for(const language of ['es','en']){
 const built=world.createModelsScene(language==='es');built.es=language==='es';assert.equal(built.stations.length,12);assert.equal(built.stands.length,12);const identities=built.stations.map(s=>s.group.uuid),captionCheck=captionObserver(built.scene,built.resources);
 for(const params of [{query:0,denoise:1,tokens:1,repeats:1,hitFraction:0},{query:0,denoise:3,tokens:4096,repeats:9,hitFraction:.4},{query:4,denoise:8,tokens:16000,repeats:50,hitFraction:1},{query:7,denoise:16,tokens:32000,repeats:200,hitFraction:0}]){
  const trace=model.makeModelsTrace({...model.createState(),...params});for(let chapter=0;chapter<12;chapter++)for(const progress of [0,.249,.25,.499,.5,.799,.8,.999,1]){const f=model.modelsFrameAt(trace,chapter,progress);built.update(f,chapter,false,false);dataOracles(built,f);captionCheck();assert.deepEqual(built.stations.map(s=>s.group.uuid),identities,'station and tensor identities persist across seeks and parameters');framesChecked++;}
 }
 const trace=model.makeModelsTrace({...model.createState(),tokens:32000,query:4});
 for(let chapter=0;chapter<12;chapter++)for(const aspect of [.55,1.8]){
  const frame=model.modelsFrameAt(trace,chapter,.637);built.update(frame,chapter,false,true);const camera=fpsCamera(chapter,aspect),button=built.stands[chapter],screen=button.getWorldPosition(new THREE.Vector3()).project(camera);assert(Math.abs(screen.x)<1&&Math.abs(screen.y)<1,'physical listening button is visible from its authored FPS arrival');assert.equal(walk.modelsNearestStand(walk.modelsPoseAt(chapter))?.index,chapter);
  const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(screen.x,screen.y),camera);let first;for(const hit of ray.intersectObjects(built.scene.children,true)){if(!visible(hit.object)||hit.object.isSprite||hit.object.userData.isLabel)continue;if(hit.object.userData.action!==undefined||hit.object.userData.info){first=hit.object;break;}if(hit.object.material?.opacity>.6)break;}assert.equal(first?.uuid,button.uuid,`chapter ${chapter} audio ray blocked by ${first?.type} ${JSON.stringify(first?.userData)}`);rayChecks++;fit([built.stations[chapter].content,built.stations[chapter].title.m,built.stations[chapter].scope.m],camera,`${language} FPS data ${chapter}/${aspect}`);try{assertSeparateCaptions(allCaptions(built.stations[chapter]),camera,`${language} FPS chapter ${chapter} aspect ${aspect}`);}catch(error){if(failures.length<24)failures.push(error.message);}
  built.update(frame,chapter,false,false);const notebook=notebookCamera(chapter,aspect);fit([built.stations[chapter].content,built.stations[chapter].title.m,built.stations[chapter].scope.m],notebook,`${language} notebook ${chapter}/${aspect}`);try{assertSeparateCaptions(allCaptions(built.stations[chapter]),notebook,`${language} chapter ${chapter} aspect ${aspect}`);}catch(error){if(failures.length<24)failures.push(error.message);}
 }
 // A direct ray towards a causally relevant solid must hit that solid rather
 // than accepting a missing target as evidence of a clear view.
 for(const chapter of [1,2,3,4,5,6,7,8,9,10]){const f=model.modelsFrameAt(trace,chapter,1);built.update(f,chapter,false,false);const s=built.stations[chapter],target=chapter===1||chapter===2?s.attention.tokens[4].body:chapter===3?s.encdec.source[4].body:chapter===4?s.moe.router.body:chapter===5?s.ssm.bars[0].body:chapter===6?s.diffusion.tokens[4].body:chapter===7?s.jepa.contextEncoder.body:chapter===8?s.typed.questions[0].options[0].body:chapter===9?s.cache.prefix.body:s.memory.mha.body;visibilityRay(built,notebookCamera(chapter,1.8),target,`chapter ${chapter} explanatory data`);}
 for(const aspect of [.55,1.8]){const complete=model.modelsFrameAt(trace,11,1);built.update(complete,11,true,false);fit(built.stations.map(station=>station.group),notebookCamera(0,aspect,true),`${language} whole-room ${aspect}`);}
 const partial=model.modelsFrameAt(trace,6,.637);built.update(partial,6,false,false);captionCheck();const before=snapshot(built.scene),count=built.resources.length;built.update(model.modelsFrameAt(trace,11,1),11,true,true);built.update(partial,6,false,false);captionCheck();assert.deepEqual(snapshot(built.scene),before,'seek backwards restores exact geometry, colors, materials and caption maps');assert.equal(built.resources.length,count,'rewind does not grow retained resources');disposeOnce(built);
}
assert.deepEqual([...new Set(failures)].slice(0,24),[],'causal geometry, captions and physical audio buttons fit desktop/mobile notebook and FPS views');
console.log(`Models scenes (${sourceCheck?'source':'dist'}): ${framesChecked} bilingual reversible fractional states, ${rayChecks} physical audio rays, ${frusta} desktop/mobile frusta, ${visibilityRays} explanatory surface rays, ${guideSamples} guide / ${walkingSamples} walking samples, actual common-scale 56.89× memory, fixed causal tensors and single resource ownership: OK`);

