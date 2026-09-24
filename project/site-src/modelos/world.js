import * as THREE from '../vendor/three.module.js';
import {contextMemory} from './model.js';
import {createPost,adaptiveScale,pointScaleFor,pointMaterial} from '../fx/fx.js';

// One small stage per family. Each explains its mechanism with motion; geometry is illustrative.
const GOLD=0xf3d39a,AMBER=0xffb45a,TEAL=0x9fd7c8,ROSE=0xff8f7a,DIM=0x3a332c,INK='#f6ead6',MUTED='#b8a58a';
const clamp01=x=>Math.max(0,Math.min(1,x)),ease=x=>1-Math.pow(1-clamp01(x),3);
const hash=i=>{const x=Math.sin(i*91.7+17.3)*43758.5453;return x-Math.floor(x);};
const V=(x,y,z)=>new THREE.Vector3(x,y,z);

export function createModelsWorld(host){
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'});
  let dpr=Math.min(devicePixelRatio||1,1.75);renderer.setPixelRatio(dpr);host.append(renderer.domElement);
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x0c0906);scene.fog=new THREE.FogExp2(0x0c0906,.045);
  const camera=new THREE.PerspectiveCamera(40,1,.1,90);
  const post=createPost(renderer,scene,camera,{strength:.8,radius:.6,threshold:.95});scene.environmentIntensity=.35;
  const quality=adaptiveScale(dpr,{min:.7,apply(s){dpr=s;renderer.setPixelRatio(dpr);resize();}});
  const pointScale={value:400};
  scene.add(new THREE.HemisphereLight(0xfff1d2,0x1a120c,.55));
  const key=new THREE.DirectionalLight(0xfff0dc,1.4);key.position.set(-4,8,6);scene.add(key);
  const rim=new THREE.DirectionalLight(0xffa860,1.6);rim.position.set(5,3,-7);scene.add(rim);

  // Floor: warm radial pool with fine rings.
  const floor=new THREE.Mesh(new THREE.CircleGeometry(14,96),new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uTime:{value:0}},
    vertexShader:'varying vec2 vP;void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform float uTime;varying vec2 vP;void main(){float d=length(vP);float rings=smoothstep(.03,0.,abs(fract(d*1.25-uTime*.05)-.5)-.47)*.35;float pool=exp(-d*d*.05);vec3 c=vec3(.07,.045,.022)*pool+vec3(.22,.15,.07)*rings*exp(-d*.3);gl_FragColor=vec4(c,pool*.8+rings*.45*exp(-d*.25));}'}));
  floor.rotation.x=-Math.PI/2;scene.add(floor);
  const DUST=300,dustGeo=new THREE.BufferGeometry(),dust0=[];
  for(let i=0;i<DUST;i++)dust0.push((hash(i)-.5)*18,hash(i+.3)*7,(hash(i+.6)-.5)*14);
  dustGeo.setAttribute('position',new THREE.Float32BufferAttribute(dust0,3));dustGeo.setAttribute('aSize',new THREE.Float32BufferAttribute(Array.from({length:DUST},(_,i)=>.03+hash(i+.9)*.05),1));dustGeo.setAttribute('aAlpha',new THREE.Float32BufferAttribute(Array.from({length:DUST},(_,i)=>.15+hash(i+1.2)*.35),1));
  const dust=new THREE.Points(dustGeo,pointMaterial(pointScale,0xffc98a,1));dust.frustumCulled=false;scene.add(dust);

  // ——— Kit: every set owns its resources and fades as a unit. ———
  const orbGeometry=new THREE.SphereGeometry(1,32,24),boxGeometry=new THREE.BoxGeometry(1,1,1);
  let S=null;
  const own=x=>{S.userData.res.add(x);return x;};
  const add=(o,parent=S)=>{parent.add(o);return o;};
  function orb(x,y,z,r,color,glow=.3){const m=new THREE.Mesh(orbGeometry,own(new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:glow,roughness:.55,metalness:0})));m.position.set(x,y,z);m.scale.setScalar(r);return add(m);}
  function box(x,y,z,w,h,d,color,extra={}){const m=new THREE.Mesh(boxGeometry,own(new THREE.MeshStandardMaterial({color,roughness:.3,metalness:.2,...extra})));m.position.set(x,y,z);m.scale.set(w,h,d);return add(m);}
  function label(text,x,y,z,{size=.2,color=MUTED,weight=600}={}){const c=document.createElement('canvas'),g=c.getContext('2d'),px=80;g.font=`${weight} ${px}px Inter,system-ui,sans-serif`;c.width=Math.ceil(g.measureText(text).width+16);c.height=px*1.3;g.font=`${weight} ${px}px Inter,system-ui,sans-serif`;g.fillStyle=color;g.textAlign='center';g.textBaseline='middle';g.fillText(text,c.width/2,c.height/2);
    const tex=own(new THREE.CanvasTexture(c));tex.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(own(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,toneMapped:false})));s.scale.set(size*c.width/c.height,size,1);s.position.set(x,y,z);s.renderOrder=10;return add(s);}
  // A glowing link with pulses that travel along it.
  function link(a,b,{color=GOLD,lift=.6,weight=1,speed=1,count=3,opacity=.55}={}){
    const mid=a.clone().lerp(b,.5);mid.y+=lift;const curve=new THREE.QuadraticBezierCurve3(a.clone(),mid,b.clone());
    const tube=add(new THREE.Mesh(own(new THREE.TubeGeometry(curve,32,.008+.012*weight,6,false)),own(new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(1.2),transparent:true,opacity:opacity*(.4+.6*weight),blending:THREE.AdditiveBlending,depthWrite:false}))));
    const geo=own(new THREE.BufferGeometry()),pos=new Float32Array(count*3);geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('aSize',new THREE.Float32BufferAttribute(Array(count).fill(.12+.08*weight),1));geo.setAttribute('aAlpha',new THREE.Float32BufferAttribute(Array(count).fill(.9),1));
    const pts=add(new THREE.Points(geo,own(pointMaterial(pointScale,color,2.6))));pts.frustumCulled=false;const p=V(0,0,0),seed=hash(a.x*3+b.z*7);
    S.userData.ticks.push(({time,on=1})=>{for(let k=0;k<count;k++){curve.getPoint(((time*.45*speed+k/count+seed)%1),p);pos[k*3]=p.x;pos[k*3+1]=p.y;pos[k*3+2]=p.z;}geo.attributes.position.needsUpdate=true;pts.material.uniforms.uOpacity.value=on;});
    return {tube,pts,curve};
  }
  function newSet(){const g=new THREE.Group();g.userData={res:new Set(),ticks:[],clock:0};return g;}
  function tokenRow(n,z=0,y=.35,spread=.62,color=DIM){return Array.from({length:n},(_,i)=>orb((i-(n-1)/2)*spread,y,z,.15,color,.15));}
  const lit=(m,on,color=GOLD,base=DIM)=>{m.material.color.set(on?color:base);m.material.emissive.set(on?color:base);m.material.emissiveIntensity=on?.9:.12;};

  // ——— Families ———
  const builders={
    causal(){
      const row=tokenRow(8,0,.4);label('causal mask · j ≤ i',0,2.4,0,{color:INK,size:.24});
      const links=[];for(let i=0;i<8;i++)for(let j=0;j<=i;j++){if(i===j)continue;const l=link(row[i].position,row[j].position,{lift:.35+.12*(i-j),count:2});l.i=i;links.push(l);}
      const self=add(new THREE.Mesh(own(new THREE.TorusGeometry(.26,.012,8,40)),own(new THREE.MeshBasicMaterial({color:new THREE.Color(GOLD).multiplyScalar(2),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}))));
      const future=add(new THREE.Mesh(own(new THREE.BoxGeometry(1,.02,.02)),own(new THREE.MeshBasicMaterial({color:ROSE,transparent:true,opacity:.35}))));
      S.userData.ticks.push(({time})=>{const q=reduce?0:Math.floor(time*.7)%9;const active=Math.min(7,q);
        row.forEach((m,i)=>lit(m,i<=active,i===active?AMBER:GOLD));links.forEach(l=>{const on=l.i===active;l.tube.material.opacity=on?.75:.05;l.pts.visible=on;});
        self.position.copy(row[active].position);self.rotation.x=Math.PI/2;self.scale.setScalar(1+.08*Math.sin(time*6));
        const x0=row[active].position.x+.31,x1=row[7].position.x+.2;future.visible=active<7;future.position.set((x0+x1)/2,.4,0);future.scale.x=Math.max(.01,x1-x0);});
    },
    encoder(){
      const row=tokenRow(8,0,.4);label('bidirectional · every token sees all',0,2.6,0,{color:INK,size:.24});
      for(let i=0;i<8;i++)for(let j=i+1;j<8;j++)link(row[i].position,row[j].position,{lift:.25+.14*(j-i),weight:.5,count:1,speed:.6+.1*(j-i)});
      const out=orb(0,2,0,.26,TEAL,1);label('vector / label',0,1.55,0);row.forEach(m=>lit(m,true));
      row.forEach((m,i)=>link(m.position,out.position,{color:TEAL,lift:.2,weight:.3,count:1,opacity:.3}));
      S.userData.ticks.push(({time})=>{out.scale.setScalar(.26+.03*Math.sin(time*3));row.forEach((m,i)=>m.material.emissiveIntensity=.6+.3*Math.sin(time*2+i));});
    },
    encdec(){
      const src=tokenRow(6,-1.3,.4,.7),dst=tokenRow(6,1.3,.4,.7);src.forEach(m=>lit(m,true,TEAL));
      label('encoder · reads the source',0,1.7,-1.3,{color:INK});label('decoder · writes one by one',0,1.7,1.3,{color:INK});
      for(let i=0;i<6;i++)for(let j=i+1;j<6;j++)link(src[i].position,src[j].position,{color:TEAL,lift:.2+.1*(j-i),weight:.35,count:1});
      const cross=[];dst.forEach((d,i)=>src.forEach(s=>{const l=link(s.position,d.position,{lift:.5,weight:.4,count:1});l.i=i;cross.push(l);}));
      S.userData.ticks.push(({time})=>{const active=reduce?5:Math.floor(time*.8)%7;dst.forEach((m,i)=>lit(m,i<=Math.min(5,active),i===active?AMBER:GOLD));cross.forEach(l=>{const on=l.i===active;l.tube.material.opacity=on?.6:.04;l.pts.visible=on;});});
    },
    moe(){
      const token=orb(-3.4,1.2,0,.2,AMBER,1.2);const router=box(-1.6,1.2,0,.42,.42,.42,GOLD,{emissive:GOLD,emissiveIntensity:.5});router.rotation.set(.6,.8,0);
      label('router',-1.6,.6,0);label('8 experts · 2 active',1.3,2.9,0,{color:INK,size:.24});
      const experts=Array.from({length:8},(_,i)=>box(.6+(i%4)*.65,1.95-Math.floor(i/4)*1.3,0,.46,.46,.46,DIM));
      const merge=orb(3.8,1.2,0,.18,TEAL,.8);label('merge',3.8,.65,0);
      const inLink=link(token.position,router.position,{lift:.1,count:2});const paths=experts.map(e=>[link(router.position,e.position,{lift:.2,count:2}),link(e.position,merge.position,{lift:.2,count:2,color:TEAL})]);
      S.userData.ticks.push(({time})=>{const step=reduce?0:Math.floor(time*.6),a=Math.floor(hash(step)*8),b=(a+1+Math.floor(hash(step+.5)*7))%8;
        router.rotation.y=time*.8;experts.forEach((e,i)=>{const on=i===a||i===b;lit(e,on,GOLD);e.scale.setScalar(on?.52+.03*Math.sin(time*8):.42);paths[i].forEach(l=>{l.tube.material.opacity=on?.7:.03;l.pts.visible=on;});});
        const u=(time*.6)%1;token.position.x=-3.4+Math.sin(u*Math.PI)*.1;});
    },
    ssm(state){
      const mem=contextMemory(state.tokens),h=3.2,mlaH=Math.max(.08,h*mem.mla/mem.mha);
      const state3=orb(-2.4,1.3,0,.55,TEAL,.6);label('fixed state · does not grow',-2.4,.35,0,{color:INK});
      const swirl=add(new THREE.Mesh(own(new THREE.TorusGeometry(.75,.018,8,64)),own(new THREE.MeshBasicMaterial({color:new THREE.Color(TEAL).multiplyScalar(1.8),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}))));swirl.position.copy(state3.position);
      column(1.1,h,GOLD,'full KV cache');column(2.6,mlaH,AMBER,'compressed');
      const stream=Array.from({length:10},(_,i)=>orb(-5,1.3,0,.08,GOLD,1));
      S.userData.ticks.push(({time})=>{swirl.rotation.set(time*.7,time*.9,0);state3.material.emissiveIntensity=.5+.2*Math.sin(time*3);stream.forEach((m,i)=>{const u=((time*.35+i/10)%1);m.position.set(-5.2+u*2.8,1.3+Math.sin(u*9+i)*.05,0);m.visible=u<.95;m.scale.setScalar(.08*(1-u*.6));});});
    },
    diffusion(){
      const n=8,row=tokenRow(n,0,.9,.72);label('all positions at once · refined over rounds',0,2.5,0,{color:INK,size:.22});
      const round=label('',0,2.1,0),set=S;let lastRound=-1;
      S.userData.ticks.push(({time})=>{const cycle=reduce?1:(time*.18)%1,r=Math.min(4,Math.floor(cycle*5));
        row.forEach((m,i)=>{const noise=(1-cycle)*(hash(i+Math.floor(time*8))-.5);m.position.y=.9+noise*.6;const clean=clamp01(cycle*1.2-hash(i)*.3);m.material.color.setRGB(.25+.7*clean,.2+.6*clean,.15+.35*clean);m.material.emissive.copy(m.material.color);m.material.emissiveIntensity=.2+.8*clean;m.scale.setScalar(.15+.05*clean);});
        if(r!==lastRound){lastRound=r;round.material.map.dispose();const c=document.createElement('canvas'),g=c.getContext('2d');c.width=420;c.height=80;g.font='600 52px Inter,system-ui';g.fillStyle=MUTED;g.textAlign='center';g.fillText(`round ${r+1} / 5`,210,58);round.material.map=new THREE.CanvasTexture(c);set.userData.res.add(round.material.map);round.material.map.colorSpace=THREE.SRGBColorSpace;round.material.needsUpdate=true;round.scale.set(1.05,.2,1);}});
    },
    jepa(){
      const ctx=tokenRow(4,0,.4,.6).map(m=>{m.position.x-=2.2;lit(m,true,TEAL);return m;});label('context',-2.2,.0,0);
      const pred=[],target=[];for(let k=0;k<6;k++){pred.push(box(.7,.6+k*.32,0,.5,.24,.24,AMBER,{emissive:AMBER,emissiveIntensity:.5}));target.push(box(2.7,.6+k*.32,0,.5,.24,.24,TEAL,{emissive:TEAL,emissiveIntensity:.5}));}
      label('predicted vector',.7,2.75,0,{color:INK});label('target vector',2.7,2.75,0,{color:INK});label('no vocabulary · no sentence',1.7,-.05,.6);
      ctx.forEach(m=>link(m.position,pred[2].position,{color:TEAL,lift:.3,count:1,weight:.5}));
      const gap=add(new THREE.Mesh(own(new THREE.CylinderGeometry(.02,.02,1,8)),own(new THREE.MeshBasicMaterial({color:new THREE.Color(ROSE).multiplyScalar(1.8),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}))));gap.rotation.z=Math.PI/2;
      S.userData.ticks.push(({time})=>{const u=reduce?1:(time*.2)%1;pred.forEach((b,k)=>{const want=.35+.6*hash(k+3.3),start=.35+.6*hash(k+7.1),w=start+(want-start)*ease(u*1.4);b.scale.x=w;target[k].scale.x=want;});
        const err=Math.abs(1-ease(u*1.4));gap.position.set(1.7,1.4,0);gap.scale.set(1,1.2,1);gap.material.opacity=.2+.8*err;});
    },
    jev(){
      const q=orb(-2.6,1.3,0,.24,AMBER,1.1);label('question',-2.6,.75,0);
      const opts=['A','B','C'].map((o,i)=>{const b=box(1.8,2+i*-.7,0,1.1,.42,.3,DIM);label(o,1.8,2+i*-.7,.2,{color:INK,size:.26});return b;});label('declared options · one pass',1.8,2.75,0,{color:INK,size:.22});
      const ls=opts.map(b=>link(q.position,b.position,{lift:.2,count:2}));
      S.userData.ticks.push(({time})=>{const pick=reduce?1:Math.floor(time*.45)%3;opts.forEach((b,i)=>{lit(b,i===pick,GOLD);ls[i].tube.material.opacity=i===pick?.7:.05;ls[i].pts.visible=i===pick;});});
    },
    cache(state){
      const mem=contextMemory(state.tokens),h=3.4,mlaH=Math.max(.08,h*mem.mla/mem.mha);
      column(-2.2,h,GOLD,'MHA · full keys');column(0,mlaH,AMBER,'MLA · latent');
      const st=orb(2.2,.6,0,.42,TEAL,.6);label('state · fixed',2.2,.02,0);
      const row=tokenRow(8,2.3,.2,.46);row.forEach(m=>m.scale.setScalar(.13));
      S.userData.ticks.push(({time})=>{row.forEach((m,i)=>lit(m,i<5,GOLD));st.material.emissiveIntensity=.5+.15*Math.sin(time*2.5);});
    }
  };
  // A glass column filled with glowing slices: height is the cache size.
  function column(x,h,color,name){
    const glass=box(x,h/2,0,.78,h,.78,0xffffff,{transparent:true,opacity:.07,roughness:.05,metalness:.1,depthWrite:false});
    const edges=add(new THREE.LineSegments(own(new THREE.EdgesGeometry(boxGeometry)),own(new THREE.LineBasicMaterial({color,transparent:true,opacity:.45}))));edges.position.copy(glass.position);edges.scale.copy(glass.scale);
    const n=Math.max(1,Math.round(h/.14)),slices=[];for(let k=0;k<n;k++){const s=box(x,.07+k*(h/n),0,.64,Math.max(.02,h/n*.62),.64,color,{emissive:color,emissiveIntensity:.35,transparent:true,opacity:.9});slices.push(s);}
    label(name,x,h+.3,0,{color:INK});
    S.userData.ticks.push(({time,clock})=>{const fill=reduce?n:Math.min(n,Math.floor(clock*n/1.4));slices.forEach((s,k)=>{s.visible=k<fill;s.material.emissiveIntensity=.3+.25*Math.max(0,Math.sin(time*3-k*.35));});});
  }

  // ——— Composition ———
  let active=null,leaving=[],family='',signature='',time=0;
  function collectMats(set){const out=[];set.traverse(o=>{for(const m of [o.material].flat())if(m)out.push({m,o:m.uniforms?.uOpacity?1:m.opacity,t:m.transparent});});return out;}
  function setFade(list,f){for(const {m,o,t} of list){if(m.uniforms?.uOpacity)m.uniforms.uOpacity.value=Math.min(m.uniforms.uOpacity.value,f);else{m.opacity=o*f;m.transparent=t||f<1;}}}
  function destroy(set){scene.remove(set);for(const x of set.userData.res)x.dispose?.();}
  function show(state){
    if(active){active.userData.leave=0;active.userData.mats=collectMats(active);leaving.push(active);}
    S=newSet();(builders[state.family]??builders.cache)(state);active=S;S=null;scene.add(active);active.userData.mats=collectMats(active);
  }
  let theta=.5,phi=.42,dist=9,goalTheta=.5,goalPhi=.42,goalDist=9,dragging=false,lx=0,ly=0,userZoom=false,pinch=0,idle=0,last=performance.now();
  const look=V(0,1.2,0);
  function place(dt){goalPhi=Math.min(1.15,Math.max(.12,goalPhi));goalDist=Math.min(18,Math.max(4.5,goalDist));const k=1-Math.exp(-dt*(reduce?30:4));theta+=(goalTheta-theta)*k;phi+=(goalPhi-phi)*k;dist+=(goalDist-dist)*k;
    const drift=reduce||idle<4?0:Math.sin(time*.15)*.12*Math.min(1,(idle-4)/4),cp=Math.cos(phi);camera.position.set(look.x+dist*Math.sin(theta+drift)*cp,look.y+dist*Math.sin(phi),look.z+dist*Math.cos(theta+drift)*cp);camera.lookAt(look);}
  function resize(){const w=host.clientWidth,h=Math.max(1,host.clientHeight);renderer.setSize(w,h);post.setSize(w,h,dpr);camera.aspect=w/h;camera.updateProjectionMatrix();pointScale.value=pointScaleFor(h,dpr,camera.fov);if(!userZoom)goalDist=9*Math.max(1,1.35/camera.aspect);}
  new ResizeObserver(resize).observe(host);resize();
  host.addEventListener('pointerdown',e=>{if(e.target!==renderer.domElement)return;dragging=true;idle=0;lx=e.clientX;ly=e.clientY;host.setPointerCapture(e.pointerId);});
  host.addEventListener('pointerup',()=>{dragging=false;});
  host.addEventListener('pointermove',e=>{if(!dragging)return;idle=0;goalTheta-=(e.clientX-lx)*.005;goalPhi+=(e.clientY-ly)*.004;lx=e.clientX;ly=e.clientY;});
  host.addEventListener('wheel',e=>{e.preventDefault();idle=0;userZoom=true;goalDist*=e.deltaY>0?1.06:.94;},{passive:false});
  host.addEventListener('touchstart',e=>{if(e.touches.length===2)pinch=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);},{passive:true});
  host.addEventListener('touchmove',e=>{if(e.touches.length!==2)return;const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);if(pinch){userZoom=true;goalDist*=pinch/d;}pinch=d;idle=0;},{passive:true});
  host.tabIndex=0;
  renderer.domElement.addEventListener('webglcontextlost',e=>e.preventDefault());

  function render(state){
    const now=performance.now(),dt=Math.min(.1,(now-last)/1000);last=now;time+=dt;idle+=dt;
    const next=state.family+'|'+(['cache','ssm'].includes(state.family)?state.tokens:'');
    if(next!==signature){signature=next;const changed=state.family!==family;family=state.family;if(changed||!active)show(state);else{destroy(active);S=newSet();(builders[state.family]??builders.cache)(state);active=S;S=null;active.userData.clock=9;scene.add(active);}}
    for(const set of leaving){set.userData.leave+=dt;const f=1-ease(set.userData.leave/.4);setFade(set.userData.mats,f);set.position.y=-(1-f)*.4;if(f<=0){destroy(set);set.userData.gone=true;}}
    leaving=leaving.filter(s=>!s.userData.gone);
    if(active){const u=active.userData;u.clock+=dt;const e=ease(u.clock/.6);active.scale.setScalar(.85+.15*e);if(e<1)setFade(u.mats,e);else if(!u.settled){u.settled=true;setFade(u.mats,1);}for(const f of u.ticks)f({time,clock:u.clock,dt});}
    floor.material.uniforms.uTime.value=time;
    const p=dust.geometry.attributes.position;for(let i=0;i<DUST;i++)p.setY(i,(dust0[i*3+1]+time*.05*(.3+hash(i)))%7);p.needsUpdate=true;
    place(dt);post.render(dt);quality.frame(dt);
  }
  return {
    render,
    zoomBy(f){userZoom=true;goalDist/=f;},
    fit(){userZoom=false;goalTheta=.5;goalPhi=.42;resize();idle=0;}
  };
}
