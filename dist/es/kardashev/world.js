import * as THREE from '../../vendor/three.module.js';
import {GLTFLoader} from '../../vendor/GLTFLoader.js';
import {RoomEnvironment} from '../../vendor/RoomEnvironment.js';

// NASA geometry is used for MarCO; the Dyson assemblies are illustrative.
export function createWorld(host,{onAsset=()=>{}}={}) {
  const renderer=new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setClearColor(0x040810);
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;host.append(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.05,240);
  const room=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer),env=pmrem.fromScene(room,.04);
  scene.environment=env.texture;scene.environmentIntensity=.45;room.dispose();pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xb9d6ff,0x10101d,.7));
  const key=new THREE.DirectionalLight(0xffead5,3.1);key.position.set(-5,3,5);scene.add(key);
  const rim=new THREE.DirectionalLight(0x86b7ff,1.3);rim.position.set(4,2,-3);scene.add(rim);
  const sunlight=new THREE.PointLight(0xffbb68,14,20,1.4);scene.add(sunlight);
  const planet=new THREE.Group(),star=new THREE.Group(),galaxy=new THREE.Group(),detail=new THREE.Group();scene.add(planet,star,galaxy,detail);
  const sphereGeo=new THREE.SphereGeometry(1,96,64);
  const earthMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.8,metalness:0,envMapIntensity:.08});
  const globe=new THREE.Mesh(sphereGeo,earthMat);globe.scale.setScalar(2.25);planet.add(globe);
  new THREE.TextureLoader().load(new URL('./earth-blue-marble.jpg',import.meta.url).href,t=>{
    t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());earthMat.map=t;earthMat.needsUpdate=true;onAsset('earth',true);
  },undefined,()=>onAsset('earth',false));
  const atmosphere=new THREE.Mesh(sphereGeo,new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:'varying vec3 n; varying vec3 v; void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',
    fragmentShader:'varying vec3 n; varying vec3 v; void main(){float f=pow(1.-max(dot(normalize(n),normalize(v)),0.),4.);gl_FragColor=vec4(.18,.48,1.,f*.65);}'
  }));atmosphere.scale.setScalar(2.3);planet.add(atmosphere);
  const orbitMaterial=new THREE.LineBasicMaterial({color:0x668eaa,transparent:true,opacity:.24});
  function orbit(parent,r,tilt=0){const g=new THREE.Group();g.rotation.z=tilt;parent.add(g);
    const pts=Array.from({length:192},(_,i)=>new THREE.Vector3(Math.cos(i/192*Math.PI*2)*r,0,Math.sin(i/192*Math.PI*2)*r));
    g.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts),orbitMaterial));return g;}
  orbit(planet,3.05,.4);orbit(planet,3.5,-.65);
  const spacecraft=[],inspection=new THREE.Group();detail.add(inspection);let loaded=false,selectedPart='all';const parts=[];
  new GLTFLoader().load(new URL('./marco.glb',import.meta.url).href,gltf=>{
    const model=gltf.scene,box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
    const normalized=new THREE.Group();model.position.sub(center);normalized.add(model);normalized.scale.setScalar(5/Math.max(size.x,size.y,size.z));
    model.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.envMapIntensity=.9;const name=o.name.toLowerCase();
      o.userData.part=name.includes('reflectarray')||name==='antenna'||name.includes('spring')?'antenna':name.includes('array')?'panels':'body';
      o.userData.baseEmissive=o.material.emissive?.clone();o.userData.baseIntensity=o.material.emissiveIntensity;parts.push(o);
    }});
    inspection.add(normalized);inspection.rotation.set(.2,.6,-.2);
    for(let i=0;i<3;i++){const sat=normalized.clone(true);sat.scale.multiplyScalar(i===0?.22:.1);planet.add(sat);spacecraft.push(sat);}
    loaded=true;highlight(selectedPart);onAsset('satellite',true);
  },undefined,()=>onAsset('satellite',false));
  function highlight(part){selectedPart=part;for(const mesh of parts){if(!mesh.material.emissive)continue;const active=part!=='all'&&mesh.userData.part===part;
    mesh.material.emissive.copy(active?new THREE.Color(0x339ccc):mesh.userData.baseEmissive??new THREE.Color(0));mesh.material.emissiveIntensity=active?.65:mesh.userData.baseIntensity;
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
  halo(star,0xffac53,6,.7);
  // Instancing keeps hundreds of multipart collectors affordable on mobile.
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#b1bfce';ctx.fillRect(0,0,256,128);
  for(let x=0;x<8;x++)for(let y=0;y<4;y++){ctx.fillStyle=(x+y)%2?'#173361':'#224379';ctx.fillRect(x*32+2,y*32+2,28,28);ctx.fillStyle='#7693ac';ctx.fillRect(x*32+4,y*32+15,24,1);}
  const cells=new THREE.CanvasTexture(canvas);cells.colorSpace=THREE.SRGBColorSpace;cells.anisotropy=4;
  const panelMat=new THREE.MeshStandardMaterial({map:cells,metalness:.6,roughness:.32,side:THREE.DoubleSide});
  const busMat=new THREE.MeshStandardMaterial({color:0xc8aa65,metalness:.65,roughness:.4});
  const radiatorMat=new THREE.MeshStandardMaterial({color:0xe4edf1,metalness:.35,roughness:.5});
  const count=288,components=[
    [new THREE.BoxGeometry(.10,.065,.08),busMat,0,0,0],
    [new THREE.BoxGeometry(.19,.009,.18),panelMat,-.155,0,0],
    [new THREE.BoxGeometry(.19,.009,.18),panelMat,.155,0,0],
    [new THREE.BoxGeometry(.07,.012,.14),radiatorMat,0,-.065,0]
  ].map(([g,m,x,y,z])=>({mesh:new THREE.InstancedMesh(g,m,count),offset:new THREE.Vector3(x,y,z)}));
  components.forEach(c=>{star.add(c.mesh);c.mesh.frustumCulled=false;});
  const dummy=new THREE.Object3D(),orient=new THREE.Quaternion();
  for(let ring=0;ring<8;ring++){
    const r=2.5+ring*.14,plane=orbit(star,r,(ring-3.5)*.23);plane.rotation.y=ring*.63;plane.updateMatrixWorld();
    for(let i=0;i<36;i++){
      const a=(i/36+ring*.013)*Math.PI*2,pos=new THREE.Vector3(Math.cos(a)*r,0,Math.sin(a)*r).applyMatrix4(plane.matrixWorld);
      orient.setFromUnitVectors(new THREE.Vector3(0,1,0),pos.clone().normalize().negate());
      for(const c of components){dummy.position.copy(c.offset).applyQuaternion(orient).add(pos);dummy.quaternion.copy(orient);dummy.updateMatrix();c.mesh.setMatrixAt(ring*36+i,dummy.matrix);}
    }
  }
  let seed=1729;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  function points(parent,positions,colors,size,opacity=1){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    const p=new THREE.Points(g,new THREE.PointsMaterial({map:glowMap,vertexColors:true,size,transparent:true,opacity,depthWrite:false,blending:THREE.AdditiveBlending}));parent.add(p);return p;}
  const positions=[],colors=[],expansion=[];
  for(let i=0;i<20000;i++){
    const r=Math.pow(random(),.85)*5,arm=i%4,a=i%5===0?random()*Math.PI*2:arm*Math.PI/2+r*1.03+(random()-.5)*(.6+1/(r+.25)),h=(random()-.5)*(.18+.7*Math.exp(-r));
    positions.push(Math.cos(a)*r,h,Math.sin(a)*r);const c=new THREE.Color().lerpColors(new THREE.Color(0xffd2a1),new THREE.Color(0x76a6f4),Math.min(1,r/3));c.multiplyScalar(.9+random()*.8);colors.push(c.r,c.g,c.b);expansion.push(1,.65,.24);
  }
  points(galaxy,positions,colors,.09,.95);points(galaxy,positions.slice(0,9000),colors.slice(0,9000),.26,.14);
  const active=points(galaxy,positions,expansion,.10,.28);halo(galaxy,0xffd2a5,3.1,.75);
  const bg=[],bgColor=[];for(let i=0;i<1100;i++){const p=new THREE.Vector3(random()-.5,random()-.5,random()-.5).normalize().multiplyScalar(65+random()*35);bg.push(p.x,p.y,p.z);bgColor.push(.6+random()*.4,.65+random()*.35,1);}points(scene,bg,bgColor,.14,.6);
  let yaw=.35,pitch=.24,distance=13,lastView='planet';const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function resize(){const w=host.clientWidth,h=Math.max(1,host.clientHeight);renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}new ResizeObserver(resize).observe(host);resize();
  function fit(){yaw=lastView==='satellite'?.3:.35;pitch=lastView==='galaxy'?.7:.24;distance=lastView==='galaxy'?18:lastView==='satellite'?10:13;}
  let down=null;host.addEventListener('pointerdown',e=>{if(e.button!==0||e.target!==renderer.domElement)return;down={id:e.pointerId,x:e.clientX,y:e.clientY};host.setPointerCapture(e.pointerId);});
  host.addEventListener('pointermove',e=>{if(!down||down.id!==e.pointerId)return;yaw-=(e.clientX-down.x)*.006;pitch=Math.max(-1.2,Math.min(1.3,pitch+(e.clientY-down.y)*.005));down.x=e.clientX;down.y=e.clientY;});
  host.addEventListener('pointerup',()=>down=null);host.addEventListener('pointercancel',()=>down=null);
  function zoomBy(f){distance=Math.max(lastView==='satellite'?4:7,Math.min(32,distance/f));}
  host.addEventListener('wheel',e=>{e.preventDefault();zoomBy(Math.exp(-e.deltaY*.001));},{passive:false});
  host.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','+','-'].includes(e.key))return;e.preventDefault();if(e.key==='Home')fit();if(e.key==='ArrowLeft')yaw-=.1;if(e.key==='ArrowRight')yaw+=.1;if(e.key==='ArrowUp')pitch=Math.min(1.3,pitch+.1);if(e.key==='ArrowDown')pitch=Math.max(-1.2,pitch-.1);if(e.key==='+')zoomBy(1.15);if(e.key==='-')zoomBy(1/1.15);});
  function render(state,v,inspect=false){const view=inspect?'satellite':v.view;if(view!==lastView){lastView=view;fit();}
    planet.visible=view==='planet';star.visible=view==='star';galaxy.visible=view==='galaxy';detail.visible=view==='satellite';sunlight.visible=star.visible;key.intensity=star.visible?1:3.1;
    const spin=reduced?0:state.motion*.045;globe.rotation.y=spin-.4;
    spacecraft.forEach((s,i)=>{const a=.6+i*2.1+spin*(.7+i*.2),r=i===0?3.4:3.05;s.position.set(Math.cos(a)*r,Math.sin(a*.7)*.8,Math.sin(a)*r);s.rotation.set(.4,a,-.3);});
    star.rotation.y=spin*.35;sunMat.uniforms.time.value=state.motion;galaxy.rotation.y=spin*.12;
    const visible=Math.max(8,Math.round(count*Math.min(1,Math.max(0,(v.k-1.35)/.65))));components.forEach(c=>c.mesh.count=visible);
    active.geometry.setDrawRange(0,Math.round(20000*Math.min(1,Math.max(0,(v.k-2.35)/.65))));
    const d=distance*Math.max(1,Math.min(1.75,1/camera.aspect));camera.position.set(Math.sin(yaw)*Math.cos(pitch)*d,Math.sin(pitch)*d,Math.cos(yaw)*Math.cos(pitch)*d);camera.lookAt(0,0,0);renderer.render(scene,camera);
  }
  return {render,fit,zoomBy,highlight,isLoaded:()=>loaded};
}
