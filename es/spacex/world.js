import * as THREE from '../../vendor/three.module.js';
import {createPost,adaptiveScale,pointScaleFor} from '../fx/fx.js';

const M=.095;
function mat(c,extra={}){return new THREE.MeshStandardMaterial({color:c,roughness:.5,metalness:.2,...extra});}
function cyl(r,h,c,seg=24,extra={}){return new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,seg),mat(c,extra));}
function cone(r1,r2,h,c,extra={}){return new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,20),mat(c,extra));}
const NOZZLE={color:0x2b2d31,metalness:.85,roughness:.35};

function buildFalcon(){
 const white={roughness:.5,metalness:.05},black=0x16181b,booster=new THREE.Group(),upper=new THREE.Group();
 const s1=cyl(1.83*M,42*M,0xc9c6be,32,white);s1.position.y=21*M;booster.add(s1);
 const soot=cyl(1.845*M,14*M,0x9a948a,32,{roughness:.8,transparent:true,opacity:.35});soot.position.y=8*M;booster.add(soot);
 const stripe=cyl(1.86*M,1.2*M,black,32);stripe.position.y=40*M;booster.add(stripe);
 const octa=cyl(1.7*M,1.2*M,black);octa.position.y=1.05*M;booster.add(octa);
 for(let i=0;i<9;i++){
  const a=i===0?0:i*2*Math.PI/8,r=i===0?0:1.05*M;
  const e=cone(.22*M,.38*M,1.4*M,0x3a3d42,NOZZLE);e.position.set(Math.cos(a)*r,.35*M,Math.sin(a)*r);booster.add(e);
 }
 const legs=[],fins=[];
 for(let i=0;i<4;i++){
  const a=i*Math.PI/2+.45;
  const boom=cyl(.07*M,7.2*M,0x2a2c30,8,{metalness:.6,roughness:.4});boom.position.set(Math.cos(a)*1.15*M,3.8*M,Math.sin(a)*1.15*M);
  const foot=cyl(.32*M,.1*M,0xc9c4b6);foot.position.set(Math.cos(a)*3.6*M,.12*M,Math.sin(a)*3.6*M);
  const fin=new THREE.Mesh(new THREE.BoxGeometry(.12*M,1.7*M,1.15*M),mat(0x3c4046,{metalness:.8,roughness:.35}));
  fin.position.set(Math.cos(a)*1.95*M,37.5*M,Math.sin(a)*1.95*M);
  booster.add(boom,foot,fin);legs.push({boom,foot,a});fins.push(fin);
 }
 const inter=cyl(1.83*M,4.2*M,0x1b1d20,32,{roughness:.6});inter.position.y=44*M;booster.add(inter);
 const s2=cyl(1.83*M,13.8*M,0xc9c6be,32,white);s2.position.y=8*M;upper.add(s2);
 const vac=cone(.28*M,.7*M,2.8*M,0x3a3d42,{metalness:.9,roughness:.25,emissive:0x331100,emissiveIntensity:.2});vac.position.y=.4*M;upper.add(vac);
 const fairL=cone(.2*M,1.83*M,13*M,0xcfccc4,white),fairR=cone(.2*M,1.83*M,13*M,0xcfccc4,white);
 fairL.position.set(-.015,16.5*M,0);fairR.position.set(.015,16.5*M,0);upper.add(fairL,fairR);
 return {booster,upper,legs,fins,fairL,fairR};
}

function buildStarship(){
 const steel={metalness:.92,roughness:.28},booster=new THREE.Group(),ship=new THREE.Group();
 const boost=cyl(4.5*M,69*M,0xc9c6bf,40,steel);boost.position.y=34.5*M;booster.add(boost);
 for(let k=0;k<8;k++){const ring=cyl(4.53*M,.25*M,0xa9a59c,40,steel);ring.position.y=(6+k*8)*M;booster.add(ring);}
 for(let i=0;i<4;i++){const a=i*Math.PI/2+.4,fin=new THREE.Mesh(new THREE.BoxGeometry(.3*M,4*M,3*M),mat(0x8d8a83,steel));fin.position.set(Math.cos(a)*5*M,66*M,Math.sin(a)*5*M);fin.rotation.y=-a;booster.add(fin);}
 for(let i=0;i<33;i++){
  const ring=i<13?0:i<26?1:2,k=i<13?i:i<26?i-13:i-26,n=ring<2?13:7,a=k*2*Math.PI/n,r=ring===2?0:(ring===0?3.3*M:1.7*M);
  const e=cone(.28*M,.42*M,1.6*M,0x3d4148,NOZZLE);e.position.set(Math.cos(a)*r,.5*M,Math.sin(a)*r);booster.add(e);
 }
 const body=cyl(4.5*M,48*M,0xcfccc5,40,steel);body.position.y=24*M;ship.add(body);
 const nose=cone(.15*M,4.5*M,12*M,0xcfccc5,steel);nose.position.y=54*M;ship.add(nose);
 for(const side of [-1,1]){
  const flap=new THREE.Mesh(new THREE.BoxGeometry(1.2*M,8*M,3.2*M),mat(0x1f1d1b,{roughness:.9}));flap.position.set(side*5.2*M,32*M,0);ship.add(flap);
  const aft=new THREE.Mesh(new THREE.BoxGeometry(1.2*M,9*M,3.6*M),mat(0x1f1d1b,{roughness:.9}));aft.position.set(side*5.3*M,6*M,0);ship.add(aft);
 }
 // Heat shield tiles cover only the windward half.
 const tiles=new THREE.Mesh(new THREE.CylinderGeometry(4.53*M,4.53*M,52*M,40,1,true,-Math.PI/2,Math.PI),new THREE.MeshStandardMaterial({color:0x151312,roughness:.95,metalness:0,side:THREE.DoubleSide}));
 tiles.position.y=26*M;ship.add(tiles);
 return {booster,ship};
}

function tower(){
 const g=new THREE.Group(),truss=mat(0x3d434b,{metalness:.7,roughness:.45});
 const mast=new THREE.Mesh(new THREE.BoxGeometry(1.8,16,1.8),mat(0x2e343b,{metalness:.6,roughness:.5,transparent:true,opacity:.9}));mast.position.set(-4.2,8,0);g.add(mast);
 for(let y=.8;y<16;y+=.8){const b=new THREE.Mesh(new THREE.BoxGeometry(1.95,.07,1.95),truss);b.position.set(-4.2,y,0);g.add(b);}
 for(const [x,z] of [[-5.1,-.9],[-3.3,-.9],[-5.1,.9],[-3.3,.9]]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.16,16.4,.16),truss);leg.position.set(x,8.2,z);g.add(leg);}
 const armL=new THREE.Mesh(new THREE.BoxGeometry(5,.4,.4),mat(0xd4a24a,{metalness:.5}));armL.position.set(-1.6,12.2,-1.15);
 const armR=new THREE.Mesh(new THREE.BoxGeometry(5,.4,.4),mat(0xd4a24a,{metalness:.5}));armR.position.set(-1.6,12.2,1.15);
 const table=new THREE.Mesh(new THREE.TorusGeometry(.75,.14,10,32),truss);table.rotation.x=Math.PI/2;table.position.y=6.25;g.add(table);
 for(let i=0;i<6;i++){const a=i*Math.PI/3,leg=new THREE.Mesh(new THREE.BoxGeometry(.28,6.2,.28),truss);leg.position.set(Math.cos(a)*.95,3.1,Math.sin(a)*.95);g.add(leg);}
 g.add(armL,armR);g.userData={armL,armR};
 return g;
}

// Engine plume: nested open cones with a flickering, shock-diamond core. HDR output feeds the bloom.
const PLUME_VERTEX='varying vec2 vUv;varying vec3 vN;varying vec3 vV;void main(){vUv=uv;vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}';
const PLUME_FRAGMENT=`uniform vec3 uColor;uniform float uTime;uniform float uDiamonds;uniform float uPower;varying vec2 vUv;varying vec3 vN;varying vec3 vV;
void main(){float v=1.-vUv.y;float core=pow(abs(dot(vN,vV)),1.6);
float flick=.85+.15*sin(uTime*47.+vUv.x*40.)*sin(uTime*31.-v*20.);
float diamonds=mix(1.,.55+.45*pow(abs(sin(v*uDiamonds*3.14159)),6.),step(.5,uDiamonds));
float fade=pow(1.-v,1.4)*smoothstep(0.,.06,v);
float a=core*fade*flick*uPower;gl_FragColor=vec4(uColor*a*diamonds,a);}`;
function makePlume(outer,inner,diamonds){
 const g=new THREE.Group(),uniforms=[];
 for(const [r,h,color,k] of [[.85,5,outer,1],[.38,4.2,inner,1.6]]){
  const u={uColor:{value:new THREE.Color(color).multiplyScalar(k===1?1.4:3.2)},uTime:{value:0},uDiamonds:{value:k===1?0:diamonds},uPower:{value:1}};uniforms.push(u);
  const m=new THREE.Mesh(new THREE.CylinderGeometry(r,.05,h,28,1,true),new THREE.ShaderMaterial({uniforms:u,vertexShader:PLUME_VERTEX,fragmentShader:PLUME_FRAGMENT,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}));
  m.position.y=(5-h)/2;g.add(m);
 }
 g.userData.uniforms=uniforms;return g;
}
const SMOKE_VERTEX='attribute float aSize;attribute float aAlpha;attribute float aHeat;varying float vA;varying float vH;uniform float uScale;void main(){vA=aAlpha;vH=aHeat;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=aSize*uScale/max(.5,-mv.z);gl_Position=projectionMatrix*mv;}';
const SMOKE_FRAGMENT='varying float vA;varying float vH;uniform vec3 uLight;void main(){vec2 p=gl_PointCoord-.5;float d=length(p);if(d>.5)discard;float a=smoothstep(.5,.1,d)*vA;float shade=.72+.28*(-p.y+.5);vec3 c=mix(vec3(.5,.49,.47)*shade*uLight,vec3(1.6,.8,.35),vH);gl_FragColor=vec4(c,a);}';
const SKY_FRAGMENT=`uniform float uAlt;uniform vec3 uSun;varying vec3 vP;
void main(){vec3 d=normalize(vP);float h=max(d.y,0.);vec3 zenith=mix(vec3(.03,.1,.32),vec3(.0,.0,.004),uAlt),horizon=mix(vec3(.3,.38,.5),vec3(.03,.05,.1),uAlt);
vec3 c=mix(horizon,zenith,pow(h,.45));c=mix(c,vec3(.02,.03,.05),smoothstep(0.,-.25,d.y));
float s=max(dot(d,normalize(uSun)),0.);c+=vec3(1.,.8,.55)*(pow(s,600.)*20.+pow(s,8.)*.25*(1.-uAlt*.6));gl_FragColor=vec4(c,1.);}`;
const STARS_FRAGMENT='uniform float uAlt;varying float vB;void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d)*uAlt*vB;gl_FragColor=vec4(vec3(1.,.95,.9)*a,a);}';
const TERRAIN_FRAGMENT=`uniform float uTime;uniform vec3 uSun;uniform vec3 uCam;varying vec3 vW;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*n(p);p*=2.1;a*=.5;}return s;}
void main(){vec2 p=vW.xz;float coast=22.+(fbm(p*.04)-.5)*18.;float d=length(p);
if(p.y>coast){vec2 w=p*.35+vec2(uTime*.25,uTime*.12);float wave=fbm(w)*.6+fbm(w*2.3-uTime*.2)*.4;
 vec3 nrm=normalize(vec3((fbm(w+vec2(.1,0))-wave)*3.,1.,(fbm(w+vec2(0,.1))-wave)*3.));vec3 v=normalize(uCam-vW);
 float fres=pow(1.-max(dot(nrm,v),0.),4.);vec3 sea=mix(vec3(.004,.025,.045),vec3(.12,.2,.3),fres);
 float spec=pow(max(dot(reflect(-normalize(uSun),nrm),v),0.),120.)*3.;float foam=smoothstep(.6,1.,1.-(p.y-coast)*.35)*n(p*3.+uTime);
 gl_FragColor=vec4(sea+spec+vec3(.6)*foam*.4,1.);}
else{float g=fbm(p*.12);vec3 scrub=mix(vec3(.035,.045,.025),vec3(.08,.075,.045),g);vec3 sand=vec3(.2,.18,.14);
 vec3 c=mix(scrub,sand,smoothstep(coast-3.,coast,p.y));float road=smoothstep(.5,.35,abs(p.x-(p.y*.15)))*step(p.y,coast-2.)*step(10.,d);c=mix(c,vec3(.06,.06,.065),road);
 float light=.55+.45*max(dot(vec3(0,1,0),normalize(uSun)),0.);gl_FragColor=vec4(c*light,1.);}}`;

export function createSpaceWorld(host){
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'});let dpr=Math.min(devicePixelRatio||1,1.7);renderer.setPixelRatio(dpr);host.append(renderer.domElement);
 const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x5d6f84,.006);
 const camera=new THREE.PerspectiveCamera(48,1,.2,900);
 const post=createPost(renderer,scene,camera,{strength:.85,radius:.6,threshold:.95});scene.environmentIntensity=.4;
 const quality=adaptiveScale(dpr,{min:.7,apply(s){dpr=s;renderer.setPixelRatio(dpr);resize();}});
 const pointScale={value:400};
 const sunDir=new THREE.Vector3(-12,18,8).normalize();
 scene.add(new THREE.HemisphereLight(0xc9e4ff,0x3a2c1e,.7));
 const sun=new THREE.DirectionalLight(0xffe6c4,2);sun.position.copy(sunDir).multiplyScalar(40);scene.add(sun);
 const flameLight=new THREE.PointLight(0xffa048,0,40,1.6);scene.add(flameLight);

 const skyUniforms={uAlt:{value:0},uSun:{value:sunDir}};
 const sky=new THREE.Mesh(new THREE.SphereGeometry(600,48,24),new THREE.ShaderMaterial({uniforms:skyUniforms,side:THREE.BackSide,depthWrite:false,fog:false,vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:SKY_FRAGMENT}));scene.add(sky);
 const starGeo=new THREE.BufferGeometry(),n=1800,sp=[],sb=[];
 for(let i=0;i<n;i++){const u=Math.random(),v=Math.random()*.95,th=u*Math.PI*2,c=v,s=Math.sqrt(1-c*c);sp.push(500*s*Math.cos(th),500*c,500*s*Math.sin(th));sb.push(.35+Math.random()*.65);}
 starGeo.setAttribute('position',new THREE.Float32BufferAttribute(sp,3));starGeo.setAttribute('aB',new THREE.Float32BufferAttribute(sb,1));
 const stars=new THREE.Points(starGeo,new THREE.ShaderMaterial({uniforms:skyUniforms,vertexShader:'attribute float aB;varying float vB;void main(){vB=aB;gl_PointSize=1.6+aB*1.8;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:STARS_FRAGMENT,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}));
 stars.frustumCulled=false;scene.add(stars);

 const terrainUniforms={uTime:{value:0},uSun:{value:sunDir},uCam:{value:new THREE.Vector3()}};
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(900,900),new THREE.ShaderMaterial({uniforms:terrainUniforms,vertexShader:'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',fragmentShader:TERRAIN_FRAGMENT}));
 ground.rotation.x=-Math.PI/2;ground.position.y=-.02;scene.add(ground);
 const concrete=mat(0x4f4e4a,{roughness:.9});
 const pad=new THREE.Mesh(new THREE.CylinderGeometry(4.8,5.4,.25,48),concrete);pad.position.y=.1;scene.add(pad);
 const trench=new THREE.Mesh(new THREE.BoxGeometry(1.6,.3,6),mat(0x2a2a2a,{roughness:.95}));trench.position.set(0,.14,3.4);scene.add(trench);
 for(const [x,z] of [[-9,-8],[9,-8],[-9,7],[9,7]]){const mast=new THREE.Mesh(new THREE.CylinderGeometry(.05,.1,9,6),mat(0x6d737a,{metalness:.6}));mast.position.set(x,4.5,z);scene.add(mast);const tip=new THREE.Mesh(new THREE.SphereGeometry(.07,8,6),new THREE.MeshBasicMaterial({color:new THREE.Color(1.3,.12,.08)}));tip.position.set(x,9.05,z);scene.add(tip);}
 const waterTower=new THREE.Group();waterTower.add(Object.assign(new THREE.Mesh(new THREE.SphereGeometry(1.4,24,16),mat(0xa9a8a2,{roughness:.4})),{}));waterTower.children[0].position.y=5;waterTower.children[0].scale.setScalar(.8);
 for(let i=0;i<4;i++){const l=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,5,6),mat(0x6d737a,{metalness:.6}));const a=i*Math.PI/2+.78;l.position.set(Math.cos(a)*.7,2.5,Math.sin(a)*.9);waterTower.add(l);}
 waterTower.position.set(15,0,-12);scene.add(waterTower);
 for(const [x,z,r] of [[-14,-8,2],[-18,-3,1.6],[12,6,1.4]]){const tank=new THREE.Mesh(new THREE.CylinderGeometry(r,r,1.6*r,24),mat(0x9d9c96,{roughness:.4,metalness:.3}));tank.position.set(x,.8*r,z);scene.add(tank);}
 const barge=new THREE.Mesh(new THREE.BoxGeometry(7,.7,14),mat(0x4b5057,{roughness:.7,metalness:.4}));barge.position.set(0,.45,44);scene.add(barge);
 const deck=new THREE.Group(),deckRing=new THREE.Mesh(new THREE.RingGeometry(1.9,2.2,48),new THREE.MeshBasicMaterial({color:0xf2f2ea}));deckRing.rotation.x=-Math.PI/2;deck.add(deckRing);
 for(const r of [0,Math.PI/2]){const bar=new THREE.Mesh(new THREE.PlaneGeometry(.35,3),new THREE.MeshBasicMaterial({color:0xf2f2ea}));bar.rotation.set(-Math.PI/2,0,r+Math.PI/4);bar.position.y=.005;deck.add(bar);}
 deck.position.set(0,.81,44);scene.add(deck);
 const strong=new THREE.Mesh(new THREE.BoxGeometry(1.1,8,.8),mat(0x5a626c,{metalness:.6,roughness:.45}));strong.position.set(-2.4,4,0);scene.add(strong);

 const twr=tower();scene.add(twr);
 const f9=buildFalcon(),ss=buildStarship();
 scene.add(f9.booster,f9.upper,ss.booster,ss.ship);
 const plume=makePlume(0xff9a3a,0xfff0c8,6),plume2=makePlume(0xff9448,0xfff4d8,0);scene.add(plume,plume2);
 const plasma=new THREE.Mesh(new THREE.SphereGeometry(1,24,16,0,Math.PI*2,Math.PI*.5,Math.PI*.5),new THREE.MeshBasicMaterial({color:new THREE.Color(2.4,.9,.35),transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));plasma.scale.set(.35,.6,.35);scene.add(plasma);

 // Exhaust smoke: emitted at the nozzle in the lower atmosphere, expands and drifts; spreads along the ground.
 const SMOKE=900,smokeGeo=new THREE.BufferGeometry(),sPos=new Float32Array(SMOKE*3),sSize=new Float32Array(SMOKE),sAlpha=new Float32Array(SMOKE),sHeat=new Float32Array(SMOKE);
 smokeGeo.setAttribute('position',new THREE.BufferAttribute(sPos,3));smokeGeo.setAttribute('aSize',new THREE.BufferAttribute(sSize,1));smokeGeo.setAttribute('aAlpha',new THREE.BufferAttribute(sAlpha,1));smokeGeo.setAttribute('aHeat',new THREE.BufferAttribute(sHeat,1));
 const smokeUniforms={uScale:pointScale,uLight:{value:new THREE.Color(1,1,1)}};
 const smoke=new THREE.Points(smokeGeo,new THREE.ShaderMaterial({uniforms:smokeUniforms,vertexShader:SMOKE_VERTEX,fragmentShader:SMOKE_FRAGMENT,transparent:true,depthWrite:false}));smoke.frustumCulled=false;scene.add(smoke);
 const puffs=Array.from({length:SMOKE},()=>({life:1,max:1,x:0,y:0,z:0,vx:0,vy:0,vz:0,size:1}));let cursor=0,emitCarry=0;
 function emit(x,y,z,count,ground){for(let i=0;i<count;i++){const p=puffs[cursor];cursor=(cursor+1)%SMOKE;const a=Math.random()*Math.PI*2,sp=ground?2.5+Math.random()*5:.3+Math.random()*.9;
  Object.assign(p,{life:0,max:ground?5+Math.random()*4:3+Math.random()*3,x:x+(Math.random()-.5)*.4,y,z:z+(Math.random()-.5)*.4,vx:Math.cos(a)*sp,vy:ground?.4+Math.random()*.8:-1.2-Math.random()*1.5,vz:Math.sin(a)*sp,size:ground?1.2:.6+Math.random()*.4});}}
 function stepSmoke(dt){for(let i=0;i<SMOKE;i++){const p=puffs[i];if(p.life>=p.max){sAlpha[i]=0;continue;}p.life+=dt;const k=p.life/p.max;
  p.vx*=1-dt*.7;p.vz*=1-dt*.7;p.vy=p.y<.6?Math.abs(p.vy)*.5+.2:p.vy*(1-dt*.9)+dt*.25;p.x+=p.vx*dt+dt*.6;p.y=Math.max(.3,p.y+p.vy*dt);p.z+=p.vz*dt;
  sPos[i*3]=p.x;sPos[i*3+1]=p.y;sPos[i*3+2]=p.z;sSize[i]=p.size*(1+k*4.5);sAlpha[i]=Math.min(1,p.life*4)*(1-k)*.55;sHeat[i]=Math.max(0,1-p.life*3)*.8;}
  for(const a of ['position','aSize','aAlpha','aHeat'])smokeGeo.attributes[a].needsUpdate=true;}
 function clearSmoke(){for(const p of puffs)p.life=p.max;}

 let theta=.55,phi=.32,dist=22,goalTheta=.55,goalPhi=.32,goalDist=22,dragging=false,lx=0,ly=0,last=performance.now(),clock=0,lastTime=0;
 const focus=new THREE.Vector3(0,6,0);
 function placeCam(target,dt){
  goalPhi=Math.min(1.1,Math.max(.03,goalPhi));goalDist=Math.min(90,Math.max(7,goalDist));
  const k=1-Math.exp(-dt*(reduce?30:4));theta+=(goalTheta-theta)*k;phi+=(goalPhi-phi)*k;dist+=(goalDist-dist)*k;
  if(target.distanceTo(focus)>25)focus.copy(target);else focus.lerp(target,1-Math.exp(-dt*5));
  camera.position.set(focus.x+dist*Math.sin(theta)*Math.cos(phi),Math.max(.6,focus.y+dist*Math.sin(phi)+2),focus.z+dist*Math.cos(theta)*Math.cos(phi));
  camera.lookAt(focus);
 }
 function resize(){const w=host.clientWidth,h=Math.max(1,host.clientHeight);renderer.setSize(w,h);post.setSize(w,h,dpr);camera.aspect=w/h;camera.updateProjectionMatrix();pointScale.value=pointScaleFor(h,dpr,camera.fov);}
 new ResizeObserver(resize).observe(host);resize();
 host.addEventListener('pointerdown',e=>{if(e.target!==renderer.domElement)return;dragging=true;lx=e.clientX;ly=e.clientY;host.setPointerCapture(e.pointerId);});
 host.addEventListener('pointerup',()=>dragging=false);
 host.addEventListener('pointermove',e=>{if(!dragging)return;goalTheta-=(e.clientX-lx)*0.006;goalPhi+=(e.clientY-ly)*0.004;lx=e.clientX;ly=e.clientY;});
 host.addEventListener('wheel',e=>{e.preventDefault();goalDist*=e.deltaY>0?1.08:.92;},{passive:false});
 renderer.domElement.addEventListener('webglcontextlost',e=>e.preventDefault());

 function lerp(a,b,u){return a+(b-a)*Math.min(1,Math.max(0,u));}
 function poseFalcon(s){
  const t=s.time,reuse=s.reuse,sep=t>=150,landed=reuse&&t>=480;
  let y=3.5,z=0,bY=3.5,bZ=0;
  if(t<8){y=3.5+t*.18;}
  else if(t<150){const u=(t-8)/142;y=5+u*u*40;z=u*18;}
  else {const u=Math.min(1,(t-150)/490);y=45+u*58;z=18+u*78;}
  if(!sep){bY=y;bZ=z;}
  else if(!reuse){bY=y-6;bZ=z+5;}
  else if(t<260){const u=(t-150)/110;bY=y-u*12;bZ=z-u*8;}
  else if(t<480){const u=(t-260)/220;bY=lerp(y-12,1.15,u*u);bZ=lerp(z-8,44,u);}
  else {bY=1.15;bZ=44;}
  f9.booster.position.set(0,bY,bZ);
  f9.booster.rotation.x=sep&&reuse&&!landed?lerp(.05,.55,(t-150)/200):landed?0:.1*Math.min(1,t/70);
  f9.upper.position.set(0,(sep?y:bY)+46*M,sep?z:bZ);
  f9.upper.rotation.x=sep?.08:.1*Math.min(1,t/70);
  const fair=Math.max(0,t-195);
  f9.fairL.position.x=-.015-fair*.04;f9.fairR.position.x=.015+fair*.04;
  f9.fairL.rotation.z=-Math.min(.8,fair*.015);f9.fairR.rotation.z=Math.min(.8,fair*.015);
  const finU=sep?Math.min(1,(t-150)/8):0;
  f9.fins.forEach(fin=>{fin.rotation.x=finU*.6;});
  const legU=landed?1:sep&&reuse?Math.min(1,Math.max(0,(t-400)/50)):0;
  f9.legs.forEach(({boom,foot,a})=>{
   boom.rotation.z=.15+legU*.55;
   boom.position.set(Math.cos(a)*(1.15+legU)*M,(3.8-legU*.4)*M,Math.sin(a)*(1.15+legU)*M);
   foot.position.set(Math.cos(a)*(2.2+legU*2.2)*M,.12*M,Math.sin(a)*(2.2+legU*2.2)*M);
   foot.visible=legU>.05;
  });
  const fire=t>8&&!(landed&&sep);
  plume.visible=fire;plume2.visible=fire&&t<160;
  plume.position.set(0,bY-2.6,bZ);plume.scale.set(1,t<20?1.3:t<150?2.4:.9,1);
  plume2.position.set(0,(sep?y:bY)-1.8,sep?z:bZ);
  twr.visible=false;barge.visible=true;deck.visible=true;strong.visible=true;
  return new THREE.Vector3(0,sep?Math.max(bY,y*.35):y,sep?bZ*.35+z*.4:z);
 }
 function poseStarship(s){
  const t=s.time,reuse=s.reuse,sep=t>=160,caught=reuse&&t>=420;
  let y=6.4,z=0,bY=6.4,bZ=0;
  if(t<10)y=6.4+t*.12;
  else if(t<160){const u=(t-10)/150;y=7.6+u*u*44;z=u*11;}
  else {const u=Math.min(1,(t-160)/480);y=52+u*58;z=11+u*42;}
  if(!sep){bY=y;bZ=z;}
  else if(!reuse){bY=y-14;bZ=z+6;}
  else if(t<250){const u=(t-160)/90;bY=y-u*10;bZ=z-u*5;}
  else if(t<420){const u=(t-250)/170;bY=lerp(y-10,12.1,u);bZ=lerp(z-5,0,u);}
  else {bY=12.1;bZ=0;}
  ss.booster.position.set(0,bY,bZ);
  ss.booster.rotation.x=sep&&reuse&&!caught?.12:0;
  ss.ship.position.set(0,(sep?y:bY)+70*M,sep?z:bZ);
  ss.ship.rotation.x=sep?.06:0;
  const close=caught?1:Math.max(0,(t-390)/30);
  twr.userData.armL.position.z=lerp(-1.15,-.4,close);twr.userData.armR.position.z=lerp(1.15,.4,close);
  twr.visible=true;barge.visible=false;deck.visible=false;strong.visible=false;
  const fire=t>10&&!caught;
  plume.visible=fire;plume2.visible=fire&&sep;
  plume.position.set(0,bY-3.4,bZ);plume.scale.set(1.8,2.6,1.8);
  plume2.position.set(0,y-2.2,z);plume2.scale.set(1.2,1.8,1.2);
  return new THREE.Vector3(0,sep?Math.max(bY,10):y,sep?bZ:z);
 }

 const wp=new THREE.Vector3();
 function render(s){
  const now=performance.now(),dt=Math.min(.1,(now-last)/1000);last=now;clock+=dt;
  const star=s.vehicle==='starship';
  f9.booster.visible=f9.upper.visible=!star;
  ss.booster.visible=ss.ship.visible=star;
  if(s.time<lastTime-1||s.time>lastTime+120)clearSmoke();
  const advancing=s.time>lastTime;lastTime=s.time;
  const target=star?poseStarship(s):poseFalcon(s);
  // Plumes: flicker, and a wider vacuum plume as the air thins.
  const alt=Math.min(1,Math.max(0,(target.y-8)/80));
  for(const p of [plume,plume2])for(const u of p.userData.uniforms){u.uTime.value=clock;u.uPower.value=1;}
  plume.scale.x*=1+alt*1.6;plume.scale.z*=1+alt*1.6;plume2.scale.set(1+alt*2,1+alt*.6,1+alt*2);
  // Smoke only while climbing through the lower atmosphere, and dust at the landing site.
  const boosterFiring=plume.visible&&advancing;
  if(boosterFiring&&!reduce){plume.getWorldPosition(wp);const low=wp.y<40;emitCarry+=dt*(low?140:0);const nEmit=Math.floor(emitCarry);emitCarry-=nEmit;if(nEmit)emit(wp.x,wp.y-2,wp.z,nEmit,false);
   if(wp.y<8){emit(wp.x,.5,wp.z,Math.ceil(dt*120),true);}}
  stepSmoke(reduce?0:dt);
  flameLight.intensity=plume.visible?60*(1-alt):0;plume.getWorldPosition(flameLight.position);
  // Entry heating on the returning booster.
  const booster=star?ss.booster:f9.booster,descending=booster.position.y>6&&booster.position.y<60&&s.reuse&&(star?s.time>200&&s.time<400:s.time>300&&s.time<470);
  plasma.visible=descending;if(descending){plasma.position.copy(booster.position);plasma.scale.set(star?.6:.3,star?.9:.55,star?.6:.3);plasma.material.opacity=.45+.25*Math.sin(clock*30);}
  skyUniforms.uAlt.value=Math.min(1,Math.max(0,(focus.y-10)/95));scene.fog.density=.006*(1-skyUniforms.uAlt.value*.9);
  scene.fog.color.setRGB(.3*(1-skyUniforms.uAlt.value)+.02,.38*(1-skyUniforms.uAlt.value)+.03,.5*(1-skyUniforms.uAlt.value)+.06);
  terrainUniforms.uTime.value=clock;terrainUniforms.uCam.value.copy(camera.position);
  placeCam(target,dt);post.render(dt);quality.frame(dt);
 }
 return {render,zoomBy(f){goalDist/=f;},fit(){goalTheta=.55;goalPhi=.32;goalDist=22;}};
}
