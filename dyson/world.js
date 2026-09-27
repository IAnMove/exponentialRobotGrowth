import * as THREE from '../vendor/three.module.js';
import {swarmLayout,COLLECTOR_MAX,RING_COUNT,PER_RING} from './model.js';
import {createPost,adaptiveScale,pointScaleFor,pointMaterial} from '../fx/fx.js';

export const AU_UNITS=20;
const SUN_RADIUS=2.15;
const hash=i=>{const x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x);};

// Sun surface: layered moving noise, hotter at the centre, limb-darkened. HDR output feeds the bloom.
const SUN_VERTEX='varying vec3 vN;varying vec3 vP;void main(){vN=normalize(normalMatrix*normal);vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const SUN_FRAGMENT=`uniform float uTime;uniform float uDim;varying vec3 vN;varying vec3 vP;
float n3(vec3 p){return sin(p.x*1.7+uTime*.6)*sin(p.y*1.9-uTime*.4)*sin(p.z*1.6+uTime*.5);}
void main(){vec3 p=normalize(vP)*3.;float g=n3(p*2.)*.5+n3(p*4.3+1.7)*.3+n3(p*9.1-2.1)*.2;
float limb=pow(max(0.,dot(vN,vec3(0.,0.,1.))),.45);vec3 hot=vec3(1.,.93,.72),cool=vec3(1.,.55,.18);
vec3 c=mix(cool,hot,.55+.45*g)*mix(.55,1.,limb);gl_FragColor=vec4(c*(3.2-uDim*1.4),1.);}`;
// Rigid shell: fills from the north pole, so the covered area fraction is exactly (1 - y) / 2.
const SHELL_VERTEX='varying vec3 vP;varying vec3 vW;void main(){vP=normalize(position);vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}';
const SHELL_FRAGMENT=`uniform float uCover;uniform float uTime;uniform float uHeat;uniform float uInner;uniform vec3 uCam;varying vec3 vP;varying vec3 vW;
void main(){float f=(1.-vP.y)*.5;if(f>uCover)discard;
float lon=atan(vP.z,vP.x)/6.2831853+.5,lat=acos(clamp(vP.y,-1.,1.))/3.14159265;
vec2 q=vec2(lon*64.,lat*32.);vec2 g=abs(fract(q)-.5);float seam=smoothstep(.44,.5,max(g.x,g.y));
float cell=fract(sin(dot(floor(q),vec2(12.9898,78.233)))*43758.5453);
float front=smoothstep(.018,0.,uCover-f)*step(uCover,.999);
vec3 c;
if(uInner<.5){c=mix(vec3(.022,.018,.016),vec3(.05,.04,.032),cell)*(1.-seam*.7)+vec3(.32,.07,.02)*uHeat*(.1+.08*cell)+vec3(.9,.3,.08)*seam*uHeat*.05;}
else{c=mix(vec3(.95,.72,.38),vec3(1.,.82,.5),cell)*(.55+.45*(1.-seam))*1.2;}
c+=vec3(3.,1.3,.4)*front*(.7+.3*sin(uTime*6.+lon*80.));
float edge=pow(1.-abs(dot(normalize(uCam-vW),normalize(vW))),3.);c+=vec3(.9,.35,.12)*edge*uHeat*.5*(1.-uInner);
gl_FragColor=vec4(c,1.);}`;
const ATMO_FRAGMENT='uniform vec3 uColor;varying vec3 vN;void main(){float r=pow(1.-abs(vN.z),2.6);gl_FragColor=vec4(uColor*r,r);}';
const JUPITER_FRAGMENT=`varying vec3 vN;varying vec3 vP;void main(){float y=normalize(vP).y;float b=sin(y*22.+sin(y*7.)*1.5)*.5+.5;
vec3 c=mix(vec3(.62,.47,.32),vec3(.88,.78,.62),b);float light=max(.08,dot(vN,normalize(vec3(-1.,.2,.4))));gl_FragColor=vec4(c*light,1.);}`;
const STAR_VERTEX='attribute float aSize;attribute vec3 aColor;attribute float aPhase;varying vec3 vC;uniform float uTime;uniform float uScale;void main(){vC=aColor*(.75+.25*sin(uTime*1.3+aPhase));vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=aSize*uScale/max(1.,-mv.z);gl_Position=projectionMatrix*mv;}';
const STAR_FRAGMENT='varying vec3 vC;void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d);gl_FragColor=vec4(vC*a*a,a);}';

export function createDysonWorld(host){
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'});
 let dpr=Math.min(devicePixelRatio||1,1.75);renderer.setPixelRatio(dpr);host.append(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(44,1,.12,700);
 scene.background=new THREE.Color(0x020308);
 const post=createPost(renderer,scene,camera,{strength:.95,radius:.72,threshold:.95});scene.environmentIntensity=.15;
 const quality=adaptiveScale(dpr,{min:.7,apply(s){dpr=s;renderer.setPixelRatio(dpr);resize();}});
 const pointScale={value:400};
 scene.add(new THREE.HemisphereLight(0x8eabff,0x1a140c,.25));
 const sunLight=new THREE.PointLight(0xffe0b0,900,0,1.7);scene.add(sunLight);

 const sunUniforms={uTime:{value:0},uDim:{value:0}};
 const sun=new THREE.Mesh(new THREE.SphereGeometry(1,64,48),new THREE.ShaderMaterial({uniforms:sunUniforms,vertexShader:SUN_VERTEX,fragmentShader:SUN_FRAGMENT}));
 sun.scale.setScalar(SUN_RADIUS);scene.add(sun);
 const glow=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute([0,0,0],3)).setAttribute('aSize',new THREE.Float32BufferAttribute([15],1)).setAttribute('aAlpha',new THREE.Float32BufferAttribute([1],1)),pointMaterial(pointScale,0xffa850,.6));
 glow.frustumCulled=false;scene.add(glow);

 // Stars with colour temperature and a slow twinkle.
 const starCount=2600,sp=[],ss=[],sc=[],ph=[];
 for(let i=0;i<starCount;i++){const r=260+hash(i)*300,u=hash(i+.3),v=hash(i+.7),th=2*Math.PI*u,p=Math.acos(2*v-1);
  const band=Math.abs(Math.cos(p))<.18&&hash(i+.9)<.6;const pp=band?Math.PI/2+(hash(i+1.1)-.5)*.36:p;
  sp.push(r*Math.sin(pp)*Math.cos(th),r*Math.cos(pp),r*Math.sin(pp)*Math.sin(th));const k=hash(i+2.3);
  const c=k<.15?[1,.72,.5]:k<.35?[1,.92,.8]:k<.8?[.85,.9,1]:[.65,.78,1];const b=.5+hash(i+3.1)*.9;sc.push(c[0]*b,c[1]*b,c[2]*b);ss.push(1.2+Math.pow(hash(i+4.7),6)*5);ph.push(hash(i+5.9)*6.28);}
 const starGeo=new THREE.BufferGeometry();starGeo.setAttribute('position',new THREE.Float32BufferAttribute(sp,3));starGeo.setAttribute('aSize',new THREE.Float32BufferAttribute(ss,1));starGeo.setAttribute('aColor',new THREE.Float32BufferAttribute(sc,3));starGeo.setAttribute('aPhase',new THREE.Float32BufferAttribute(ph,1));
 const starUniforms={uTime:{value:0},uScale:pointScale};
 const stars=new THREE.Points(starGeo,new THREE.ShaderMaterial({uniforms:starUniforms,vertexShader:STAR_VERTEX,fragmentShader:STAR_FRAGMENT,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));stars.frustumCulled=false;scene.add(stars);

 // Earth marks 1 au: textured, with an atmospheric rim. Jupiter is the mass reserve.
 const earth=new THREE.Mesh(new THREE.SphereGeometry(1,48,32),new THREE.MeshStandardMaterial({color:0x6faad1,roughness:.7,metalness:0}));
 new THREE.TextureLoader().load('../kardashev/earth-blue-marble.jpg',tex=>{tex.colorSpace=THREE.SRGBColorSpace;earth.material.map=tex;earth.material.color.set(0xffffff);earth.material.needsUpdate=true;});
 earth.scale.setScalar(.5);scene.add(earth);
 const atmo=new THREE.Mesh(new THREE.SphereGeometry(1,48,32),new THREE.ShaderMaterial({uniforms:{uColor:{value:new THREE.Color(.2,.45,1.05)}},vertexShader:'varying vec3 vN;void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:ATMO_FRAGMENT,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
 atmo.scale.setScalar(1.12);earth.add(atmo);
 const orbitLine=(r,color,opacity,n=192)=>new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2;return new THREE.Vector3(Math.cos(a)*r,0,Math.sin(a)*r);})),new THREE.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false}));
 scene.add(orbitLine(AU_UNITS,0x6faad1,.3));
 const jupiter=new THREE.Mesh(new THREE.SphereGeometry(1,40,28),new THREE.ShaderMaterial({vertexShader:SUN_VERTEX,fragmentShader:JUPITER_FRAGMENT}));
 jupiter.scale.setScalar(1.1);scene.add(jupiter);
 const jupR=5.2*AU_UNITS;scene.add(orbitLine(jupR,0xc4a070,.14,256));

 // Collectors: 12 independent inclined rings. Panels are small plates facing the Sun.
 const pts=swarmLayout(),rings=[];
 const swarm=new THREE.Group();scene.add(swarm);
 const panelGeometry=new THREE.BoxGeometry(1,1,1);
 const panelMaterial=new THREE.MeshStandardMaterial({color:0x3b5bb0,metalness:.7,roughness:.25,emissive:0x2c4a9a,emissiveIntensity:.35});
 const panels=new THREE.InstancedMesh(panelGeometry,panelMaterial,COLLECTOR_MAX);panels.instanceMatrix.setUsage(THREE.DynamicDrawUsage);panels.frustumCulled=false;swarm.add(panels);
 for(let r=0;r<RING_COUNT;r++){
  const first=pts[r*PER_RING],inc=Math.atan2(-first.y,Math.hypot(first.z,first.x))||0;
  const ringPts=pts.slice(r*PER_RING,(r+1)*PER_RING).map(p=>new THREE.Vector3(p.x,p.y,p.z));
  const line=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(ringPts),new THREE.LineBasicMaterial({color:0xf0c075,transparent:true,opacity:.1,depthWrite:false,blending:THREE.AdditiveBlending}));
  // Each ring's plane normal, for spinning its panels along their own orbit.
  const a=new THREE.Vector3().copy(ringPts[0]),b=new THREE.Vector3().copy(ringPts[Math.floor(PER_RING/4)]);
  rings.push({line,axis:new THREE.Vector3().crossVectors(a,b).normalize(),speed:(.035+.012*(r%4))*(r%2?1:-1),inc});swarm.add(line);
 }
 const dummy=new THREE.Object3D(),q=new THREE.Quaternion(),tmp=new THREE.Vector3();
 function placePanels(count,t){
  for(let i=0;i<count;i++){const p=pts[i],ring=rings[p.ring];
   tmp.set(p.x,p.y,p.z);q.setFromAxisAngle(ring.axis,t*ring.speed);tmp.applyQuaternion(q);
   dummy.position.copy(tmp);dummy.lookAt(0,0,0);dummy.scale.set(.05,.034,.0035);dummy.updateMatrix();panels.setMatrixAt(i,dummy.matrix);}
  panels.count=Math.max(1,count);panels.instanceMatrix.needsUpdate=true;
 }

 const shellUniforms={uCover:{value:0},uTime:{value:0},uHeat:{value:0},uInner:{value:0},uCam:{value:new THREE.Vector3()}};
 const shellGeometry=new THREE.SphereGeometry(1,128,96),shell=new THREE.Group();
 const outerShell=new THREE.Mesh(shellGeometry,new THREE.ShaderMaterial({uniforms:shellUniforms,vertexShader:SHELL_VERTEX,fragmentShader:SHELL_FRAGMENT,side:THREE.FrontSide}));
 const innerShell=new THREE.Mesh(shellGeometry,new THREE.ShaderMaterial({uniforms:{...shellUniforms,uInner:{value:1}},vertexShader:SHELL_VERTEX,fragmentShader:SHELL_FRAGMENT,side:THREE.BackSide}));
 shell.add(outerShell,innerShell);scene.add(shell);
 const heat=new THREE.Mesh(new THREE.SphereGeometry(1,48,32),new THREE.ShaderMaterial({uniforms:{uColor:{value:new THREE.Color(1.2,.3,.1)}},vertexShader:'varying vec3 vN;void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:ATMO_FRAGMENT,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.FrontSide}));
 scene.add(heat);

 // Photons leave the Sun. At the collector radius a share equal to the coverage is absorbed (flash);
 // the rest escape to space. In shell mode, absorption follows the built area exactly.
 const PHOTONS=900,photonGeo=new THREE.BufferGeometry(),pPos=new Float32Array(PHOTONS*3),pSize=new Float32Array(PHOTONS),pAlpha=new Float32Array(PHOTONS);
 photonGeo.setAttribute('position',new THREE.BufferAttribute(pPos,3));photonGeo.setAttribute('aSize',new THREE.BufferAttribute(pSize,1));photonGeo.setAttribute('aAlpha',new THREE.BufferAttribute(pAlpha,1));
 const photons=new THREE.Points(photonGeo,pointMaterial(pointScale,0xffd38a,2.4));photons.frustumCulled=false;scene.add(photons);
 const hits=new THREE.Points(new THREE.BufferGeometry(),pointMaterial(pointScale,0xff8a3a,3.2));hits.frustumCulled=false;scene.add(hits);
 const hPos=new Float32Array(PHOTONS*3),hSize=new Float32Array(PHOTONS),hAlpha=new Float32Array(PHOTONS);
 hits.geometry.setAttribute('position',new THREE.BufferAttribute(hPos,3));hits.geometry.setAttribute('aSize',new THREE.BufferAttribute(hSize,1));hits.geometry.setAttribute('aAlpha',new THREE.BufferAttribute(hAlpha,1));
 const photon=Array.from({length:PHOTONS},(_,i)=>({dir:new THREE.Vector3(),r:0,gen:0,roll:0,flash:0,i}));
 function spawn(p,spread=true){const u=hash(p.i*3.1+p.gen*7.7),v=hash(p.i*5.3+p.gen*1.9),th=u*Math.PI*2,c=2*v-1,s=Math.sqrt(1-c*c);p.dir.set(s*Math.cos(th),c,s*Math.sin(th));p.r=SUN_RADIUS+(spread?hash(p.i+p.gen*.37)*90:0);p.roll=hash(p.i*9.7+p.gen*3.3);p.gen++;}
 photon.forEach(p=>spawn(p));

 let theta=.7,phi=.42,dist=52,goalTheta=.7,goalPhi=.42,goalDist=52,dragging=false,lastX=0,lastY=0,userZoom=false,clock=0,pinch=0,idle=0;
 function intendedDist(radiusAu){return 26+radiusAu*30;}
 function clampGoals(){goalPhi=Math.min(1.25,Math.max(-1.15,goalPhi));goalDist=Math.min(220,Math.max(12,goalDist));}
 function placeCamera(dt=1){const k=dt>=1?1:1-Math.exp(-dt*(reduce?30:4));theta+=(goalTheta-theta)*k;phi+=(goalPhi-phi)*k;dist+=(goalDist-dist)*k;
  const drift=reduce||idle<4?0:Math.min(1,(idle-4)/5)*clock*.008;
  const cp=Math.cos(phi),sn=Math.sin(phi);camera.position.set(dist*Math.sin(theta+drift)*cp,dist*sn,dist*Math.cos(theta+drift)*cp);camera.lookAt(0,.15,0);}
 function resize(){const w=host.clientWidth,h=Math.max(1,host.clientHeight);renderer.setSize(w,h);post.setSize(w,h,dpr);camera.aspect=w/h;camera.updateProjectionMatrix();pointScale.value=pointScaleFor(h,dpr,camera.fov);}
 new ResizeObserver(resize).observe(host);resize();
 host.addEventListener('pointerdown',e=>{if(e.target!==renderer.domElement)return;dragging=true;idle=0;lastX=e.clientX;lastY=e.clientY;host.setPointerCapture(e.pointerId);});
 host.addEventListener('pointerup',()=>dragging=false);
 host.addEventListener('pointermove',e=>{if(!dragging)return;idle=0;goalTheta-=(e.clientX-lastX)*0.005;goalPhi+=(e.clientY-lastY)*0.0045;lastX=e.clientX;lastY=e.clientY;clampGoals();});
 host.addEventListener('wheel',e=>{e.preventDefault();idle=0;userZoom=true;goalDist*=e.deltaY>0?1.07:.93;clampGoals();},{passive:false});
 host.addEventListener('touchstart',e=>{if(e.touches.length===2)pinch=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);},{passive:true});
 host.addEventListener('touchmove',e=>{if(e.touches.length!==2)return;const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);if(pinch){userZoom=true;goalDist*=pinch/d;clampGoals();}pinch=d;idle=0;},{passive:true});
 host.addEventListener('keydown',e=>{const step=.12;if(e.key==='ArrowLeft')goalTheta-=step;else if(e.key==='ArrowRight')goalTheta+=step;else if(e.key==='ArrowUp')goalPhi-=step;else if(e.key==='ArrowDown')goalPhi+=step;else if(e.key==='+'||e.key==='='){userZoom=true;goalDist/=1.12;}else if(e.key==='-'){userZoom=true;goalDist*=1.12;}else return;e.preventDefault();idle=0;clampGoals();});
 host.tabIndex=0;
 renderer.domElement.addEventListener('webglcontextlost',e=>e.preventDefault());

 const tv=new THREE.Vector3();
 function render(s,dt){
  const R=s.radiusAu*AU_UNITS,cover=Math.min(1,Math.max(0,s.coverage)),isSwarm=s.form==='swarm',step=Number.isFinite(dt)&&dt>0?dt:0;
  clock+=step;idle+=step;
  if(!userZoom)goalDist=intendedDist(s.radiusAu);
  sunUniforms.uTime.value=clock;starUniforms.uTime.value=clock;shellUniforms.uTime.value=clock;
  const count=Math.floor(cover*COLLECTOR_MAX);
  swarm.visible=isSwarm;swarm.scale.setScalar(R);
  if(isSwarm){placePanels(count,reduce?0:clock);rings.forEach((ring,i)=>{ring.line.material.opacity=count>i*PER_RING?.16:.04;});}
  panelMaterial.emissiveIntensity=.35;panelMaterial.emissive.setRGB(.17+.22*cover,.29-.06*cover,.6-.22*cover);
  shell.visible=!isSwarm&&cover>0.002;shell.scale.setScalar(R);shellUniforms.uCover.value=cover;shellUniforms.uHeat.value=.25+cover*.75;shellUniforms.uCam.value.copy(camera.position);
  heat.scale.setScalar(R*1.06);heat.material.uniforms.uColor.value.setRGB(1.2*cover*(isSwarm?.35:.8),.3*cover*(isSwarm?.35:.8),.1*cover);
  sunUniforms.uDim.value=0;sunLight.intensity=900;
  glow.material.uniforms.uOpacity.value=1-.55*cover*(isSwarm?1:.2);
  const ea=clock*.07;earth.position.set(Math.cos(ea)*AU_UNITS,0,Math.sin(ea)*AU_UNITS);earth.rotation.y=clock*.4;
  jupiter.position.set(Math.cos(clock*.012)*jupR,.2,Math.sin(clock*.012)*jupR);jupiter.rotation.y=clock*.3;
  // Photons: speed scales with the scene so the trip to the collectors stays readable.
  const speed=(reduce?0:1)*(8+R*.9),maxR=Math.max(R*2.4,70);let hc=0;
  for(const p of photon){
   const before=p.r;p.r+=speed*step;
   if(before<R&&p.r>=R){const absorbed=isSwarm?p.roll<cover:(1-p.dir.y)*.5<cover;if(absorbed){p.flash=.45;tv.copy(p.dir).multiplyScalar(isSwarm?R:R*.97);p.hit=tv.clone();spawn(p,false);}}
   if(p.r>maxR)spawn(p,false);
   const k=p.i*3;pPos[k]=p.dir.x*p.r;pPos[k+1]=p.dir.y*p.r;pPos[k+2]=p.dir.z*p.r;pSize[p.i]=.55;pAlpha[p.i]=Math.min(1,(p.r-SUN_RADIUS)/3)*(p.r>R?.55*(1-(p.r-R)/(maxR-R)):.8);
   if(p.flash>0){p.flash-=step;hPos[hc*3]=p.hit.x;hPos[hc*3+1]=p.hit.y;hPos[hc*3+2]=p.hit.z;hSize[hc]=1.6*(p.flash/.45)+.3;hAlpha[hc]=p.flash/.45;hc++;}
  }
  photonGeo.attributes.position.needsUpdate=photonGeo.attributes.aAlpha.needsUpdate=photonGeo.attributes.aSize.needsUpdate=true;
  hits.geometry.setDrawRange(0,hc);for(const a of ['position','aSize','aAlpha'])hits.geometry.attributes[a].needsUpdate=true;
  placeCamera(step||1);
  post.render(step);quality.frame(step);
 }
 return {
  render,
  zoomBy(f){userZoom=true;goalDist/=f;clampGoals();},
  fit(){userZoom=false;goalTheta=.7;goalPhi=.42;goalDist=intendedDist(1);idle=0;}
 };
}
