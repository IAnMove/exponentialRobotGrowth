import * as THREE from '../../vendor/three.module.js';
import {GLTFLoader} from '../../vendor/GLTFLoader.js';
import {RoomEnvironment} from '../../vendor/RoomEnvironment.js';
import {SCENE_SAMPLES,createState} from './model.js';
import {kardashevFrameAt} from './presentation.js';

export const COLLECTOR_COUNT=SCENE_SAMPLES.collectors;
const VIEWS=['planet','star','galaxy','satellite'],clamp=THREE.MathUtils.clamp;
const defaults=view=>({yaw:view==='satellite'?.3:.35,pitch:view==='galaxy'?.7:.24,zoom:1});
const corners=box=>[0,1].flatMap(x=>[0,1].flatMap(y=>[0,1].map(z=>new THREE.Vector3(x?box.max.x:box.min.x,y?box.max.y:box.min.y,z?box.max.z:box.min.z))));
export function kardashevCameraAt(bounds,{aspect=1,view='planet',yaw=defaults(view).yaw,pitch=defaults(view).pitch,zoom=1,radius=null}={}){
  const target=bounds.getCenter(new THREE.Vector3()),out=new THREE.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)),right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),out).normalize(),up=new THREE.Vector3().crossVectors(out,right).normalize(),fov=38,tan=Math.tan(fov*Math.PI/360),safeAspect=Math.max(.05,aspect);let distance=1;
  if(radius>0){const angle=Math.atan(tan*Math.min(safeAspect*.88,.76));distance=radius/Math.sin(angle);}
  else for(const point of corners(bounds)){const p=point.sub(target);distance=Math.max(distance,p.dot(out)+Math.max(Math.abs(p.dot(right))/(tan*safeAspect*.88),Math.abs(p.dot(up))/(tan*.76))+.1);}
  distance*=clamp(zoom,.5,2.2);return {position:target.clone().addScaledVector(out,distance).toArray(),target:target.toArray(),fov,near:.05,far:Math.max(240,distance+120),distance};
}
function resourcesOf(root){const result=new Set();root.traverse(o=>{if(o.geometry)result.add(o.geometry);for(const material of Array.isArray(o.material)?o.material:o.material?[o.material]:[]){result.add(material);for(const value of Object.values(material))if(value?.isTexture)result.add(value);for(const uniform of Object.values(material.uniforms||{}))if(uniform.value?.isTexture)result.add(uniform.value);}});return result;}

// NASA geometry is used for MarCO; the Dyson assemblies are illustrative.
export function createWorld(host,{onAsset=()=>{},onViewChange=()=>{},language=globalThis.document?.documentElement?.lang||'en',rendererFactory=()=>new THREE.WebGLRenderer({antialias:true}),TextureLoaderClass=THREE.TextureLoader,GLTFLoaderClass=GLTFLoader,ResizeObserverClass=globalThis.ResizeObserver,environment=true}={}) {
  const renderer=rendererFactory();let disposed=false,ready=false,frame=kardashevFrameAt(createState(),{source:'manual'}),view=frame.view,pose=null;
  const resources=new Set(),assets={earth:null,satellite:null},views=Object.fromEntries(VIEWS.map(v=>[v,defaults(v)]));let satelliteRadius=2.8;
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,1.75));renderer.setClearColor(0x040810);
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;host.append(renderer.domElement);
  const canvas=renderer.domElement;canvas.tabIndex=0;canvas.style.touchAction='none';canvas.setAttribute('aria-label',language==='es'?'Kardashev 3D. Arrastra o usa las flechas para orbitar. Rueda, pellizca o usa más y menos para acercar; Inicio centra esta vista.':'Kardashev 3D. Drag or use arrow keys to orbit. Scroll, pinch, plus or minus to zoom; Home centers this view.');
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.05,240);
  let env;if(environment){const room=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);env=pmrem.fromScene(room,.04);scene.environment=env.texture;scene.environmentIntensity=.45;room.dispose();pmrem.dispose();resources.add(env);}
  scene.add(new THREE.HemisphereLight(0xb9d6ff,0x10101d,.7));
  const key=new THREE.DirectionalLight(0xffead5,3.1);key.position.set(-5,3,5);scene.add(key);
  const rim=new THREE.DirectionalLight(0x86b7ff,1.3);rim.position.set(4,2,-3);scene.add(rim);
  const sunlight=new THREE.PointLight(0xffbb68,14,20,1.4);scene.add(sunlight);
  const planet=new THREE.Group(),star=new THREE.Group(),galaxy=new THREE.Group(),detail=new THREE.Group();scene.add(planet,star,galaxy,detail);
  planet.name='planet';star.name='star';galaxy.name='galaxy';detail.name='satellite';
  const sphereGeo=new THREE.SphereGeometry(1,96,64);
  const earthMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.8,metalness:0,envMapIntensity:.08});
  const globe=new THREE.Mesh(sphereGeo,earthMat);globe.scale.setScalar(2.25);planet.add(globe);
  new TextureLoaderClass().load(new URL('./earth-blue-marble.jpg',import.meta.url).href,t=>{
    if(disposed){t.dispose();return;}resources.add(t);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());earthMat.map=t;earthMat.needsUpdate=true;assets.earth=true;onAsset('earth',true);
  },undefined,()=>{if(!disposed){assets.earth=false;onAsset('earth',false);}});
  const atmosphere=new THREE.Mesh(sphereGeo,new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:'varying vec3 n; varying vec3 v; void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',
    fragmentShader:'varying vec3 n; varying vec3 v; void main(){float f=pow(1.-max(dot(normalize(n),normalize(v)),0.),4.);gl_FragColor=vec4(.18,.48,1.,f*.65);}'
  }));atmosphere.scale.setScalar(2.3);planet.add(atmosphere);
  const orbitMaterial=new THREE.LineBasicMaterial({color:0x668eaa,transparent:true,opacity:.24}),stellarOrbitMaterial=new THREE.LineBasicMaterial({color:0x668eaa,transparent:true,opacity:.1});
  function orbit(parent,r,tilt=0){const g=new THREE.Group();g.rotation.z=tilt;parent.add(g);
    const pts=Array.from({length:192},(_,i)=>new THREE.Vector3(Math.cos(i/192*Math.PI*2)*r,0,Math.sin(i/192*Math.PI*2)*r));
    g.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts),parent===star?stellarOrbitMaterial:orbitMaterial));return g;}
  orbit(planet,3.05,.4);orbit(planet,3.5,-.65);
  const spacecraft=[],inspection=new THREE.Group();detail.add(inspection);let loaded=false,selectedPart='all';const parts=[];
  new GLTFLoaderClass().load(new URL('./marco.glb',import.meta.url).href,gltf=>{
    if(disposed){resourcesOf(gltf.scene).forEach(r=>r.dispose());return;}resourcesOf(gltf.scene).forEach(r=>resources.add(r));
    const model=gltf.scene,box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
    const normalized=new THREE.Group();model.position.sub(center);normalized.add(model);normalized.scale.setScalar(5/Math.max(size.x,size.y,size.z));
    satelliteRadius=new THREE.Box3().setFromObject(normalized).getBoundingSphere(new THREE.Sphere()).radius;
    model.traverse(o=>{if(o.isMesh){o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();for(const material of Array.isArray(o.material)?o.material:[o.material]){material.envMapIntensity=.9;material.userData.baseEmissive=material.emissive?.clone();material.userData.baseIntensity=material.emissiveIntensity;}const name=o.name.toLowerCase();
      o.userData.part=name.includes('reflectarray')||name==='antenna'||name.includes('spring')?'antenna':name.includes('array')?'panels':'body';
      parts.push(o);
    }});
    inspection.add(normalized);inspection.rotation.set(.2,.6,-.2);
    for(let i=0;i<3;i++){const sat=normalized.clone(true);sat.scale.multiplyScalar(i===0?.22:.1);planet.add(sat);spacecraft.push(sat);}
    resourcesOf(normalized).forEach(r=>resources.add(r));loaded=true;assets.satellite=true;highlight(selectedPart);onAsset('satellite',true);if(ready)draw();
  },undefined,()=>{if(!disposed){assets.satellite=false;onAsset('satellite',false);}});
  function highlight(part){if(disposed||!['all','body','panels','antenna'].includes(part))return;selectedPart=part;for(const mesh of parts)for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){if(!material.emissive)continue;const active=part!=='all'&&mesh.userData.part===part;
    material.emissive.copy(active?new THREE.Color(0x339ccc):material.userData.baseEmissive??new THREE.Color(0));material.emissiveIntensity=active?.65:material.userData.baseIntensity;
  }}
  const sunMat=new THREE.ShaderMaterial({uniforms:{time:{value:0}},
    vertexShader:'varying vec3 p; varying vec3 n; varying vec3 v; void main(){p=position;n=normalize(normalMatrix*normal);vec4 q=modelViewMatrix*vec4(position,1.);v=normalize(-q.xyz);gl_Position=projectionMatrix*q;}',
    fragmentShader:`varying vec3 p; varying vec3 n; varying vec3 v; uniform float time;
      float noise(vec3 x){return fract(sin(dot(x,vec3(12.9898,78.233,37.719)))*43758.5453);}
      void main(){float g=noise(floor(p*135.));float waves=sin(p.y*34.+sin(p.x*18.)+time*.25)*.5+.5;float limb=pow(max(dot(normalize(n),normalize(v)),0.),.28);
      vec3 c=mix(vec3(1.,.28,.035),vec3(1.,.88,.5),.5+g*.25+waves*.15)*(.55+.45*limb);gl_FragColor=vec4(c*1.6,1.);}`
  });const sun=new THREE.Mesh(sphereGeo,sunMat);sun.scale.setScalar(1.1);star.add(sun);
  function glowTexture(){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(64,64,0,64,64,64);
    g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.12,'rgba(255,235,200,.85)');g.addColorStop(.4,'rgba(255,200,145,.18)');g.addColorStop(1,'rgba(255,160,95,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);}
  const glowMap=glowTexture();
  function halo(parent,color,size,opacity){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glowMap,color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false}));s.scale.set(size,size,1);parent.add(s);return s;}
  halo(star,0xffac53,4.4,.4);
  // Instancing keeps hundreds of multipart collectors affordable on mobile.
  const panelCanvas=document.createElement('canvas');panelCanvas.width=256;panelCanvas.height=128;const ctx=panelCanvas.getContext('2d');ctx.fillStyle='#b1bfce';ctx.fillRect(0,0,256,128);
  for(let x=0;x<8;x++)for(let y=0;y<4;y++){ctx.fillStyle=(x+y)%2?'#173361':'#224379';ctx.fillRect(x*32+2,y*32+2,28,28);ctx.fillStyle='#7693ac';ctx.fillRect(x*32+4,y*32+15,24,1);}
  const cells=new THREE.CanvasTexture(panelCanvas);cells.colorSpace=THREE.SRGBColorSpace;cells.anisotropy=4;
  const panelMat=new THREE.MeshStandardMaterial({map:cells,metalness:.6,roughness:.32,side:THREE.DoubleSide});
  const busMat=new THREE.MeshStandardMaterial({color:0xc8aa65,metalness:.65,roughness:.4});
  const radiatorMat=new THREE.MeshStandardMaterial({color:0xe4edf1,metalness:.35,roughness:.5});
  const count=COLLECTOR_COUNT,components=[
    [new THREE.BoxGeometry(.10,.065,.08),busMat,0,0,0],
    [new THREE.BoxGeometry(.19,.009,.18),panelMat,-.155,0,0],
    [new THREE.BoxGeometry(.19,.009,.18),panelMat,.155,0,0],
    [new THREE.BoxGeometry(.07,.012,.14),radiatorMat,0,-.065,0]
  ].map(([g,m,x,y,z])=>({mesh:new THREE.InstancedMesh(g,m,count),offset:new THREE.Vector3(x,y,z)}));
  components.forEach(c=>{star.add(c.mesh);c.mesh.frustumCulled=false;});
  const dummy=new THREE.Object3D(),orient=new THREE.Quaternion();dummy.scale.setScalar(.65);
  for(let ring=0;ring<24;ring++){
    const r=2.5+ring*.045,plane=orbit(star,r,(ring-11.5)*.085);plane.rotation.y=ring*.63;plane.updateMatrixWorld();
    for(let i=0;i<72;i++){
      const a=(i/72+ring*.013)*Math.PI*2,pos=new THREE.Vector3(Math.cos(a)*r,0,Math.sin(a)*r).applyMatrix4(plane.matrixWorld);
      orient.setFromUnitVectors(new THREE.Vector3(0,1,0),pos.clone().normalize().negate());
      for(const c of components){dummy.position.copy(c.offset).applyQuaternion(orient).add(pos);dummy.quaternion.copy(orient);dummy.updateMatrix();c.mesh.setMatrixAt(ring*72+i,dummy.matrix);}
    }
  }
  let seed=1729;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  function points(parent,positions,colors,size,opacity=1){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    const p=new THREE.Points(g,new THREE.PointsMaterial({map:glowMap,vertexColors:true,size,transparent:true,opacity,depthWrite:false,blending:THREE.AdditiveBlending}));parent.add(p);return p;}
  const positions=[],colors=[],expansion=[];
  for(let i=0;i<SCENE_SAMPLES.systems;i++){
    const r=Math.pow(random(),.85)*5,arm=i%4,a=i%5===0?random()*Math.PI*2:arm*Math.PI/2+r*1.03+(random()-.5)*(.6+1/(r+.25)),h=(random()-.5)*(.18+.7*Math.exp(-r));
    positions.push(Math.cos(a)*r,h,Math.sin(a)*r);const c=new THREE.Color().lerpColors(new THREE.Color(0xffd2a1),new THREE.Color(0x76a6f4),Math.min(1,r/3));c.multiplyScalar(.9+random()*.8);colors.push(c.r,c.g,c.b);expansion.push(1,.65,.24);
  }
  points(galaxy,positions,colors,.09,.95);points(galaxy,positions.slice(0,9000),colors.slice(0,9000),.26,.14);
  const active=points(galaxy,positions,expansion,.12,.58);active.name='illustrative-active-systems';halo(galaxy,0xffd2a5,3.1,.75);
  const bg=[],bgColor=[];for(let i=0;i<1100;i++){const p=new THREE.Vector3(random()-.5,random()-.5,random()-.5).normalize().multiplyScalar(65+random()*35);bg.push(p.x,p.y,p.z);bgColor.push(.6+random()*.4,.65+random()*.35,1);}points(scene,bg,bgColor,.14,.6);
  function subjectBounds(){if(view==='galaxy')return {box:new THREE.Box3(new THREE.Vector3(-5.2,-.75,-5.2),new THREE.Vector3(5.2,.75,5.2)),radius:null};const radius=view==='planet'?Math.max(3.5,Math.hypot(3.4,.8)+satelliteRadius*.22):view==='star'?3.535+.24:satelliteRadius;return {box:new THREE.Box3(new THREE.Vector3(-radius,-radius,-radius),new THREE.Vector3(radius,radius,radius)),radius};}
  function applyCamera(){const bounds=subjectBounds();pose=kardashevCameraAt(bounds.box,{aspect:camera.aspect,view,...views[view],radius:bounds.radius});camera.position.set(...pose.position);camera.fov=pose.fov;camera.far=pose.far;camera.lookAt(new THREE.Vector3(...pose.target));camera.updateProjectionMatrix();camera.updateMatrixWorld(true);}
  function animate(){planet.visible=view==='planet';star.visible=view==='star';galaxy.visible=view==='galaxy';detail.visible=view==='satellite';sunlight.visible=star.visible;key.intensity=star.visible?1:3.1;
    const spin=frame.motion*.12;globe.rotation.y=spin-.4;
    spacecraft.forEach((s,i)=>{const a=.6+i*2.1+spin*(.7+i*.2),r=i===0?3.4:3.05;s.position.set(Math.cos(a)*r,Math.sin(a*.7)*.8,Math.sin(a)*r);s.rotation.set(.4,a,-.3);});
    star.rotation.y=spin*.35;sunMat.uniforms.time.value=frame.motion;galaxy.rotation.y=spin*.6;inspection.rotation.set(.2,.6+spin*.3,-.2);
    components.forEach(c=>c.mesh.count=frame.samples.collectors);active.geometry.setDrawRange(0,frame.samples.systems);
  }
  function draw(){if(disposed||!ready)return;animate();applyCamera();scene.updateMatrixWorld(true);renderer.render(scene,camera);}
  function getViewState(){return {version:1,view,views:Object.fromEntries(VIEWS.map(v=>[v,{...views[v]}])),...views[view]};}
  function restoreViewState(state){if(disposed||!state||!VIEWS.includes(state.view))return false;const restored={};for(const v of VIEWS){const p=state.views?.[v]||(v===state.view?state:null);if(!p)continue;if(![p.yaw,p.pitch,p.zoom].every(Number.isFinite)||p.zoom<=0)return false;restored[v]={yaw:p.yaw,pitch:clamp(p.pitch,-1.2,1.3),zoom:clamp(p.zoom,.5,2.2)};}for(const [v,p] of Object.entries(restored))views[v]=p;draw();return true;}
  function changed(){draw();onViewChange(getViewState());}
  function fit(){if(disposed)return;views[view]=defaults(view);changed();}
  function zoomBy(f){if(disposed||!Number.isFinite(f)||f<=0)return;views[view].zoom=clamp(views[view].zoom/f,.5,2.2);changed();}
  function renderFrame(next){if(disposed)return;frame=next;view=next.view;highlight(next.highlight??selectedPart);draw();}
  function render(state,v,inspect=false){const next=kardashevFrameAt(state,{inspect,source:'manual',highlight:selectedPart});renderFrame(v?.view&&VIEWS.includes(v.view)&&!inspect?{...next,view:v.view}:next);}
  function resize(){if(disposed)return;const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;draw();}const observer=new ResizeObserverClass(resize);observer.observe(host);
  const pointers=new Map();let pinch=0;
  const down=e=>{if(e.button!==undefined&&e.button!==0)return;canvas.focus({preventScroll:true});pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);if(pointers.size===2){const [a,b]=[...pointers.values()];pinch=Math.hypot(a.x-b.x,a.y-b.y);}};
  const move=e=>{const p=pointers.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;if(pointers.size===1){views[view].yaw-=dx*.006;views[view].pitch=clamp(views[view].pitch+dy*.005,-1.2,1.3);changed();}else{const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);if(pinch>0&&distance>0)zoomBy(distance/pinch);pinch=distance;}};
  const up=e=>{pointers.delete(e.pointerId);pinch=0;if(canvas.hasPointerCapture?.(e.pointerId))canvas.releasePointerCapture(e.pointerId);};
  const cancel=e=>{pointers.delete(e.pointerId);pinch=0;},wheel=e=>{e.preventDefault();zoomBy(Math.exp(-e.deltaY*.001));};
  const keydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','+','-','='].includes(e.key))return;e.preventDefault();if(e.key==='Home'){fit();return;}if(e.key==='+'||e.key==='='){zoomBy(1.15);return;}if(e.key==='-'){zoomBy(1/1.15);return;}const p=views[view];if(e.key==='ArrowLeft')p.yaw-=.1;if(e.key==='ArrowRight')p.yaw+=.1;if(e.key==='ArrowUp')p.pitch=clamp(p.pitch+.1,-1.2,1.3);if(e.key==='ArrowDown')p.pitch=clamp(p.pitch-.1,-1.2,1.3);changed();};
  const events={pointerdown:down,pointermove:move,pointerup:up,pointercancel:cancel,lostpointercapture:cancel,wheel,keydown};for(const [name,fn] of Object.entries(events))canvas.addEventListener(name,fn,name==='wheel'?{passive:false}:undefined);
  function inspect(){const bounds=subjectBounds();return {view,motion:frame.motion,frame,samples:{...frame.samples,displayedCollectors:components[0].mesh.count,displayedSystems:active.geometry.drawRange.count},assets:{...assets},highlight:selectedPart,disposed,camera:{...pose,aspect:camera.aspect},bounds:{min:bounds.box.min.toArray(),max:bounds.box.max.toArray(),radius:bounds.radius},viewState:getViewState(),navigation:{mode:'orbit',walking:false}};}
  ready=true;resourcesOf(scene).forEach(r=>resources.add(r));resize();
  return {canvas,render,renderFrame,fit,zoomBy,highlight,isLoaded:()=>loaded,inspect,getViewState,restoreViewState,dispose(){if(disposed)return;disposed=true;observer.disconnect();for(const [name,fn] of Object.entries(events))canvas.removeEventListener(name,fn);for(const id of pointers.keys())if(canvas.hasPointerCapture?.(id))canvas.releasePointerCapture(id);pointers.clear();resources.forEach(r=>r.dispose());resources.clear();renderer.dispose();canvas.remove();}};
}
