import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MIN_K,snapshot as energySnapshot} from './site-src/kardashev/model.js';
import {kardashevFrameAt} from './site-src/kardashev/presentation.js';

const file=path=>new URL(path,import.meta.url).href;
const data=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const close=(a,b,label='finite equal values')=>assert(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<1e-7,`${label}: ${a} != ${b}`);
const views=['planet','star','galaxy','satellite'];
const frameFor=(view,motion=0,extra={})=>kardashevFrameAt({k:view==='planet'?1:view==='star'?2:3,motion,playing:false,...extra},{inspect:view==='satellite',source:'manual'});

// DOM, GPU and asynchronous delivery are the only replacements. Every mesh,
// material, matrix, camera and NASA MarCO vertex below is the actual source.
class EventTarget {
  constructor(){this.events=new Map();this.style={};this.captured=new Set();this.listenersAdded=0;this.listenersRemoved=0;}
  addEventListener(name,listener,options){if(!this.events.has(name))this.events.set(name,new Set());this.events.get(name).add(listener);this.listenersAdded++;if(name==='wheel')this.wheelOptions=options;}
  removeEventListener(name,listener){const set=this.events.get(name);if(set?.delete(listener))this.listenersRemoved++;if(set?.size===0)this.events.delete(name);}
  setAttribute(name,value){this[name]=value;}
  focus(options){this.focused=true;this.focusOptions=options;}
  setPointerCapture(id){this.captured.add(id);}
  hasPointerCapture(id){return this.captured.has(id);}
  releasePointerCapture(id){this.captured.delete(id);}
  getBoundingClientRect(){return {left:0,top:0,width:this.host?.clientWidth||500,height:this.host?.clientHeight||500};}
  emit(name,values={}){const event={target:this,...values,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}};for(const listener of this.events.get(name)||[])listener(event);return event;}
  remove(){this.removed=true;}
}
class Canvas extends EventTarget {
  getContext(){const context={font:'12px sans-serif',measureText:s=>({width:String(s).length*8}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})};return new Proxy(context,{get:(target,key)=>target[key]??(()=>{}),set:(target,key,value)=>(target[key]=value,true)});}
}
class Host extends EventTarget {
  constructor(width,height){super();this.clientWidth=width;this.clientHeight=height;this.children=[];}
  append(canvas){canvas.host=this;this.children.push(canvas);}
  prepend(canvas){canvas.host=this;this.children.unshift(canvas);}
}
class GPU {
  constructor(){this.domElement=new Canvas();this.capabilities={getMaxAnisotropy:()=>8};this.renders=0;this.sizes=[];}
  setPixelRatio(value){this.pixelRatio=value;}
  setClearColor(value){this.clearColor=value;}
  setSize(width,height){this.sizes.push([width,height]);}
  render(scene,camera){this.scene=scene;this.camera=camera;scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);this.renders++;}
  dispose(){this.disposed=true;this.disposeCount=(this.disposeCount||0)+1;}
  forceContextLoss(){this.contextLost=true;}
}
globalThis.document={createElement:()=>new Canvas()};
globalThis.devicePixelRatio=1;
globalThis.matchMedia=()=>({matches:false});

const resources=root=>{
  const result=new Set();
  const materialResources=material=>{if(!material)return;result.add(material);for(const value of Object.values(material))if(value?.isTexture)result.add(value);for(const uniform of Object.values(material.uniforms||{}))if(uniform.value?.isTexture)result.add(uniform.value);};
  root.traverse(object=>{if(object.geometry)result.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material])materialResources(material);});
  return result;
};
const track=(collection,records)=>{for(const resource of collection)if(!records.has(resource)){const record={resource,count:0};resource.addEventListener('dispose',()=>record.count++);records.set(resource,record);}};
const assertDisposed=(records,label)=>{assert(records.size>0,`${label} contains resources`);for(const {resource,count} of records.values())assert(count>0,`${label}: ${resource.type||resource.constructor.name} is disposed`);};

function cloneAsset(source){
  const model=source.clone(true),geometries=new Map(),materials=new Map(),textures=new Map();
  const textureClone=texture=>{if(!textures.has(texture))textures.set(texture,texture.clone());return textures.get(texture);};
  const materialClone=material=>{if(!materials.has(material)){const cloned=material.clone();for(const [key,value] of Object.entries(material))if(value?.isTexture)cloned[key]=textureClone(value);materials.set(material,cloned);}return materials.get(material);};
  model.traverse(object=>{if(object.geometry){if(!geometries.has(object.geometry))geometries.set(object.geometry,object.geometry.clone());object.geometry=geometries.get(object.geometry);}if(object.material)object.material=Array.isArray(object.material)?object.material.map(materialClone):materialClone(object.material);});
  return model;
}
const transformSnapshot=scene=>{
  const result=[];
  scene.traverse(object=>{
    result.push({id:object.uuid,visible:object.visible,position:object.position.toArray(),rotation:object.rotation.toArray(),scale:object.scale.toArray()});
    if(object.isInstancedMesh)result.push({count:object.count,matrices:[...object.instanceMatrix.array]});
    if(object.geometry)result.push({draw:{...object.geometry.drawRange}});
    for(const material of Array.isArray(object.material)?object.material:[object.material])if(material?.uniforms?.time)result.push({time:material.uniforms.time.value});
  });
  return result;
};
const corners=box=>[0,1].flatMap(x=>[0,1].flatMap(y=>[0,1].map(z=>new THREE.Vector3(x?box.max.x:box.min.x,y?box.max.y:box.min.y,z?box.max.z:box.min.z))));
const isVisible=object=>{for(let parent=object;parent;parent=parent.parent)if(!parent.visible)return false;return true;};
function geometryFits(gpu,label){
  const group=gpu.scene.children.filter(object=>object.isGroup).find(object=>object.visible);
  assert(group,`${label}: a complete view is visible`);
  let geometryCount=0;
  const check=(point,object)=>{point.project(gpu.camera);assert(Math.abs(point.x)<.96&&Math.abs(point.y)<.96&&point.z>-1&&point.z<1,`${label}: ${object.name||object.type} geometry fits the real camera (${point.x.toFixed(3)}, ${point.y.toFixed(3)}, ${point.z.toFixed(3)})`);};
  group.traverse(object=>{
    if(!isVisible(object)||!object.geometry)return;
    if(object.isInstancedMesh&&object.count===0)return;
    if(object.geometry.drawRange.count===0)return;
    // Project the real vertices. Aggregate instance-box corners can lie well
    // outside an orbit's enclosing sphere and are not part of the geometry.
    if(object.isSprite){const position=object.getWorldPosition(new THREE.Vector3()),scale=object.getWorldScale(new THREE.Vector3()),right=new THREE.Vector3().setFromMatrixColumn(gpu.camera.matrixWorld,0),up=new THREE.Vector3().setFromMatrixColumn(gpu.camera.matrixWorld,1);for(const x of [-object.center.x,1-object.center.x])for(const y of [-object.center.y,1-object.center.y])check(position.clone().addScaledVector(right,x*scale.x).addScaledVector(up,y*scale.y),object);}
    else {const attribute=object.geometry.attributes.position,index=object.geometry.index,start=object.geometry.drawRange.start,end=Math.min(index?.count||attribute.count,start+object.geometry.drawRange.count),point=new THREE.Vector3(),instance=new THREE.Matrix4(),matrix=new THREE.Matrix4();for(let i=0;i<(object.isInstancedMesh?object.count:1);i++){if(object.isInstancedMesh){object.getMatrixAt(i,instance);matrix.multiplyMatrices(object.matrixWorld,instance);}else matrix.copy(object.matrixWorld);for(let vertex=start;vertex<end;vertex++)check(point.fromBufferAttribute(attribute,index?index.getX(vertex):vertex).applyMatrix4(matrix),object);}}
    geometryCount++;
  });
  assert(geometryCount>0,`${label}: fit checked actual geometry`);
  return geometryCount;
}
function scalarJSON(value,label){
  assert.doesNotThrow(()=>JSON.stringify(value),`${label}: serializable inspection`);
  const visit=item=>{if(item===null||typeof item==='string'||typeof item==='boolean')return;if(typeof item==='number'){assert(Number.isFinite(item),`${label}: finite scalar`);return;}assert(typeof item==='object',`${label}: no callback or undefined value`);assert(Array.isArray(item)||Object.getPrototypeOf(item)===Object.prototype,`${label}: no live Three objects`);for(const child of Object.values(item))visit(child);};
  visit(value);
}

async function main(){
  // Preserve the binary's geometry and material topology; the official loader
  // plugin changes only browser image decoding into empty Texture instances.
  const bytes=readFileSync(new URL('./site-src/kardashev/marco.glb',import.meta.url));
  const actualLoader=new GLTFLoader().register(()=>({name:'CHECK_TEXTURE_PIXELS',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
  const parsed=await actualLoader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  let triangles=0,meshes=0;parsed.scene.traverse(object=>{if(object.isMesh){meshes++;triangles+=(object.geometry.index?.count||object.geometry.attributes.position.count)/3;}});
  assert(meshes>10&&triangles===3992,'the real NASA MarCO GLB is parsed, including all 3,992 triangles');

  const paths={"'../vendor/three.module.js'":file('node_modules/three/build/three.module.js'),"'../vendor/GLTFLoader.js'":file('node_modules/three/examples/jsm/loaders/GLTFLoader.js'),"'../vendor/RoomEnvironment.js'":file('node_modules/three/examples/jsm/environments/RoomEnvironment.js'),"'./presentation.js'":file('site-src/kardashev/presentation.js'),"'./model.js'":file('site-src/kardashev/model.js')};
  let source=readFileSync(new URL('./site-src/kardashev/world.js',import.meta.url),'utf8');
  for(const [specifier,url] of Object.entries(paths))source=source.replaceAll(specifier,JSON.stringify(url));
  source=source.replaceAll('import.meta.url',JSON.stringify(file('site-src/kardashev/world.js')));
  const {createWorld,kardashevCameraAt}=await import(data(source));
  assert.equal(typeof kardashevCameraAt,'function','source exports its deterministic camera fit helper');

  function harness(aspect=1.8){
    const host=new Host(Math.round(aspect*360),360),gpu=new GPU(),textureRequests=[],modelRequests=[],observers=[],assets=[],records=new Map();
    class TextureLoaderClass {load(url,success,progress,failure){const request={url,success,failure};textureRequests.push(request);return new THREE.Texture();}}
    class GLTFLoaderClass {load(url,success,progress,failure){modelRequests.push({url,success,failure});}}
    class ResizeObserverClass {constructor(callback){this.callback=callback;observers.push(this);}observe(target){this.target=target;}disconnect(){this.disconnected=true;}resize(){this.callback([{target:this.target}]);}}
    const world=createWorld(host,{environment:false,rendererFactory:()=>gpu,TextureLoaderClass,GLTFLoaderClass,ResizeObserverClass,onAsset:(...args)=>assets.push(args)});
    assert.equal(textureRequests.length,1,'Earth delivery is controllable');assert.equal(modelRequests.length,1,'MarCO delivery is controllable');assert.equal(observers.length,1,'one resize observer owns the host');assert.equal(observers[0].target,host);
    function deliver(){const earth=new THREE.Texture();track([earth],records);textureRequests[0].success(earth);const model=cloneAsset(parsed.scene);track(resources(model),records);modelRequests[0].success({scene:model});return {earth,model};}
    function dispose(){if(gpu.scene)track(resources(gpu.scene),records);world.dispose();world.dispose();assert.equal(gpu.disposeCount,1,'disposal is idempotent');assert.equal(world.canvas.events.size,0,'all canvas handlers removed');assert.equal(host.events.size,0,'all host handlers removed');assert.equal(world.canvas.listenersAdded,world.canvas.listenersRemoved,'listener cleanup uses the registered callbacks');assert(observers[0].disconnected,'resize observer disconnected');assert(world.canvas.removed&&gpu.disposed,'canvas and GPU released');assertDisposed(records,'scene and delivered assets');}
    return {host,gpu,world,textureRequests,modelRequests,observers,assets,records,deliver,dispose};
  }

  let frozenStates=0,frusta=0,geometryChecks=0;
  for(const aspect of [1.8,359/360,290/360,.5,.4]){
    const h=harness(aspect),{world,gpu}=h;h.deliver();assert(world.isLoaded());assert.deepEqual(h.assets,[['earth',true],['satellite',true]]);
    assert.equal(world.canvas.tabIndex,0,'canvas is keyboard focusable');assert(world.canvas['aria-label'],'canvas has an accessible interaction label');
    for(const view of views){
      for(const motion of [0,.35,17.25,99,.35,0]){
        const frame=frameFor(view,motion);world.renderFrame(frame);assert.equal(world.inspect().view,view);close(world.inspect().motion,motion,'inspection exposes frame motion');
        assert.deepEqual(world.inspect().samples,{...frame.samples,displayedCollectors:frame.samples.collectors,displayedSystems:frame.samples.systems},'exact illustrative counts come from the frozen frame');
        assert(gpu.scene.children.filter(object=>object.isGroup).filter(object=>object.visible).length===1,'exactly one of four views is visible');
        const matrices=transformSnapshot(gpu.scene);
        for(const [dt,playing,source] of [[0,false,'manual'],[1/60,true,'growth'],[12,false,'narration'],[.05,true,'manual']]){
          const same=kardashevFrameAt({k:frame.k,motion,playing},{inspect:view==='satellite',source});world.renderFrame(same,{dt,rafTime:123456});assert.deepEqual(transformSnapshot(gpu.scene),matrices,'same frozen motion is identical across RAF, playback, pause and source changes');frozenStates++;
        }
        const group=gpu.scene.children.filter(object=>object.isGroup)[view==='planet'?0:view==='star'?1:view==='galaxy'?2:3];assert(group.visible,'the requested actual scene group is visible');
      }
      world.fit();world.renderFrame(frameFor(view,0));geometryChecks+=geometryFits(gpu,`${view}, aspect ${aspect}`);frusta++;
      close(gpu.camera.aspect,h.host.clientWidth/h.host.clientHeight,'actual camera aspect');assert(gpu.camera.far>gpu.camera.position.length(),'fit updates the clipping range for portrait distance');
      scalarJSON(world.inspect(),`${view} inspection`);
    }
    // A return to zero is a complete rewind, including shader time and hidden
    // views that will become visible again later.
    const zero=new Map();for(const view of views){world.renderFrame(frameFor(view,0));zero.set(view,transformSnapshot(gpu.scene));}for(const view of views)world.renderFrame(frameFor(view,41));for(const view of views){world.renderFrame(frameFor(view,0));assert.deepEqual(transformSnapshot(gpu.scene),zero.get(view),'all four views rewind to motion zero');}
    for(const k of [MIN_K,1.35,1.675,2,2.35,2.675,3]){
      const frame=kardashevFrameAt({k,motion:2});world.renderFrame(frame);const actual=gpu.scene.children.filter(object=>object.isGroup)[1].children.filter(object=>object.isInstancedMesh);assert.equal(actual.length,4,'a sample contains all four collector components');assert(actual.every(mesh=>mesh.count===frame.samples.collectors),'every actual collector component has the exact frame count');const galactic=gpu.scene.children.filter(object=>object.isGroup)[2].children.filter(object=>object.isPoints);assert(galactic.some(points=>points.geometry.drawRange.count===frame.samples.systems),'the actual active galactic points use the exact frame count');
      world.render({k,motion:2,playing:false},energySnapshot({k}),false);assert.equal(world.inspect().view,frame.view,'legacy render uses the same presentation view');assert.equal(world.inspect().samples.displayedCollectors,frame.samples.collectors);assert.equal(world.inspect().samples.displayedSystems,frame.samples.systems);
    }
    world.render({k:1,motion:2},energySnapshot({k:1}),true);assert.equal(world.inspect().view,'satellite','legacy inspection selects the real satellite view');
    h.dispose();assert.equal(gpu.disposeCount,1);assert.equal(world.inspect().disposed,true);scalarJSON(world.inspect(),'disposed inspection');
  }

  const h=harness(),{world,gpu}=h;h.deliver();world.renderFrame(frameFor('satellite',3));
  const partMaterials=[];gpu.scene.children.find(group=>group.name==='satellite').traverse(object=>{if(object.isMesh)for(const material of Array.isArray(object.material)?object.material:[object.material])if(material.emissive)partMaterials.push({part:object.userData.part,material,base:material.emissive.toArray(),intensity:material.emissiveIntensity});});
  for(const part of ['body','panels','antenna','all']){world.highlight(part);assert.equal(world.inspect().highlight,part,'highlight API exposes the selected actual part');assert(part==='all'||partMaterials.some(record=>record.part===part),`NASA geometry contains ${part}`);for(const record of partMaterials){const changed=JSON.stringify(record.material.emissive.toArray())!==JSON.stringify(record.base)||record.material.emissiveIntensity!==record.intensity;assert.equal(changed,part!=='all'&&record.part===part,'only the requested NASA parts have highlighted materials');}}
  world.renderFrame(kardashevFrameAt({k:1,motion:3},{inspect:true,highlight:'antenna'}));assert.equal(world.inspect().highlight,'antenna','frozen frame owns the visible part highlight');
  world.renderFrame(frameFor('planet',3));world.fit();world.renderFrame(frameFor('planet',3));
  const initial=world.getViewState();world.canvas.emit('pointerdown',{pointerId:1,clientX:30,clientY:30,button:0});assert(world.canvas.focused,'pointer action focuses the canvas');assert(world.canvas.hasPointerCapture(1),'pointer action captures its own pointer');world.canvas.emit('pointermove',{pointerId:1,clientX:130,clientY:70});world.canvas.emit('pointerup',{pointerId:1,clientX:130,clientY:70});assert(!world.canvas.hasPointerCapture(1),'pointer release clears capture');
  const orbited=world.getViewState();assert.notEqual(orbited.yaw,initial.yaw,'drag orbits horizontally');assert.notEqual(orbited.pitch,initial.pitch,'drag orbits vertically');world.zoomBy(1.4);const planet=world.getViewState();assert.notEqual(planet.zoom,orbited.zoom,'zoomBy updates the per-view zoom');
  world.renderFrame(frameFor('star',3));world.canvas.emit('keydown',{key:'ArrowRight'});world.canvas.emit('keydown',{key:'ArrowUp'});const star=world.getViewState();world.renderFrame(frameFor('planet',99));assert.deepEqual(world.getViewState().views.planet,planet.views.planet,'planet → star → planet retains the orbit');world.renderFrame(frameFor('star',0));assert.deepEqual(world.getViewState().views.star,star.views.star,'each view retains its own orbit');
  const allViews=world.getViewState();for(const view of views){world.renderFrame(frameFor(view));world.canvas.emit('keydown',{key:'Home'});}assert(world.restoreViewState(allViews),'valid per-view state restores');assert.deepEqual(world.getViewState().views,allViews.views,'restoration preserves all four stored views');assert.equal(world.getViewState().view,'satellite','frame stays authoritative over the active view during restore');assert.equal(world.restoreViewState(null),false,'invalid restoration is rejected');
  world.renderFrame(frameFor('planet'));world.fit();const beforePinch=world.getViewState();world.canvas.emit('pointerdown',{pointerId:2,clientX:100,clientY:100});world.canvas.emit('pointerdown',{pointerId:3,clientX:200,clientY:100});world.canvas.emit('pointermove',{pointerId:3,clientX:270,clientY:100});const pinched=world.getViewState();assert.notEqual(pinched.zoom,beforePinch.zoom,'two pointers pinch to zoom');close(pinched.yaw,beforePinch.yaw,'pinch keeps yaw');close(pinched.pitch,beforePinch.pitch,'pinch keeps pitch');world.canvas.emit('pointercancel',{pointerId:2});world.canvas.emit('lostpointercapture',{pointerId:3});const cancelled=world.getViewState();world.canvas.emit('pointermove',{pointerId:2,clientX:700,clientY:700});assert.deepEqual(world.getViewState().views,cancelled.views,'cancelled pointers cannot drag');
  const wheel=world.canvas.emit('wheel',{deltaY:90});assert(wheel.defaultPrevented,'wheel is handled');assert.equal(world.canvas.wheelOptions?.passive,false,'wheel handler can prevent page scroll');const beforeKey=world.getViewState();for(const key of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-'])assert(world.canvas.emit('keydown',{key}).defaultPrevented,`${key} is keyboard controlled`);assert(!world.canvas.emit('keydown',{key:'a'}).defaultPrevented,'unrelated key remains available');world.canvas.emit('keydown',{key:'Home'});world.renderFrame(frameFor('planet'));assert.deepEqual(world.getViewState().views.planet,initial.views.planet,'Home fits and resets the active view');
  assert(beforeKey.zoom!==beforePinch.zoom,'wheel changed zoom after pinch');
  h.host.clientWidth=144;h.host.clientHeight=360;h.observers[0].resize();world.renderFrame(frameFor('planet'));close(gpu.camera.aspect,.4,'observer updates actual camera aspect');assert.deepEqual(gpu.sizes.at(-1),[144,360],'observer resizes actual renderer');geometryChecks+=geometryFits(gpu,'planet after resize to aspect .4');frusta++;
  const saved=world.getViewState();saved.views.planet.yaw=100;assert.notEqual(world.getViewState().views.planet.yaw,100,'view-state snapshots cannot mutate live orbit');
  for(const view of views){const info=world.inspect(),box=new THREE.Box3(new THREE.Vector3(...info.bounds.min),new THREE.Vector3(...info.bounds.max));const wide=kardashevCameraAt(box,{aspect:1.8,view}),narrow=kardashevCameraAt(box,{aspect:.4,view});assert(narrow.distance>wide.distance*1.7,'portrait fit keeps growing rather than hitting an aspect correction cap');for(const aspect of [.4,.5,290/360,359/360,1.8]){const pose=kardashevCameraAt(box,{aspect,view});const camera=new THREE.PerspectiveCamera(pose.fov,aspect,pose.near,pose.far);camera.position.set(...pose.position);camera.lookAt(new THREE.Vector3(...pose.target));camera.updateMatrixWorld(true);for(const point of corners(box)){point.project(camera);assert(Math.abs(point.x)<.96&&Math.abs(point.y)<.96&&point.z>-1&&point.z<1,'the deterministic helper fits every bounds corner');}}}
  h.dispose();

  // Loaded assets and responses that arrive after teardown must release their
  // own resources without touching the detached scene or notifying the UI.
  const late=harness();late.world.renderFrame(frameFor('satellite'));late.world.dispose();const calls=late.assets.length,renders=late.gpu.renders;
  const lateTexture=new THREE.Texture(),lateModel=cloneAsset(parsed.scene),lateRecords=new Map();track([lateTexture,...resources(lateModel)],lateRecords);late.textureRequests[0].success(lateTexture);late.modelRequests[0].success({scene:lateModel});late.textureRequests[0].failure(new Error('late Earth failure'));late.modelRequests[0].failure(new Error('late MarCO failure'));assertDisposed(lateRecords,'late assets');assert.equal(late.assets.length,calls,'late success/failure cannot emit onAsset');late.observers[0].resize();late.world.renderFrame(frameFor('planet',100));late.world.fit();late.world.zoomBy(2);late.world.highlight('panels');assert.equal(late.gpu.renders,renders,'disposed world does not draw again');assert(late.observers[0].disconnected);assert.equal(late.world.canvas.events.size,0);assert(late.world.canvas.removed&&late.gpu.disposed);
  const failed=harness();failed.textureRequests[0].failure(new Error('Earth unavailable'));failed.modelRequests[0].failure(new Error('MarCO unavailable'));assert.deepEqual(failed.assets,[['earth',false],['satellite',false]],'live asset failures notify accurately');failed.world.renderFrame(frameFor('planet'));track(resources(failed.gpu.scene),failed.records);failed.dispose();
  console.log(`Kardashev source scenes: ${frozenStates} frozen scene comparisons, ${frusta} desktop/mobile frusta, ${geometryChecks} real geometry bounds; NASA MarCO, exact samples, four-view rewind/orbits, input, resize and disposal passed.`);
}
main().catch(error=>{console.error((error.stack||String(error)).replace(/data:text\/javascript;base64,[A-Za-z0-9+/=]+/g,'[Kardashev world source]'));process.exitCode=1;});
