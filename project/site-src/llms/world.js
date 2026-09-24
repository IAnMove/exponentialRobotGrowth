import * as THREE from '../vendor/three.module.js';
import {EffectComposer} from '../vendor/EffectComposer.js';
import {RenderPass} from '../vendor/RenderPass.js';
import {UnrealBloomPass} from '../vendor/UnrealBloomPass.js';
import {OutputPass} from '../vendor/OutputPass.js';
import {RoundedBoxGeometry} from '../vendor/RoundedBoxGeometry.js';
import {RoomEnvironment} from '../vendor/RoomEnvironment.js';
import {tokenize,embedding,positionEncoding,vector,transformerTrace,contextWindow,softmax,nextCandidates,pendingToken,randomStep,sample} from './model.js';

// Palette. Values above 1 (×HDR) feed the bloom pass; everything else stays below the threshold.
const C={gold:0xffc35a,blue:0x5d8dff,coral:0xff7b5e,mint:0x46e0bb,violet:0xa184ff,teal:0x4fd6c8,steel:0x1a2c47,dark:0x0b1526};
const CSS={gold:'#ffc35a',blue:'#79a8ff',coral:'#ff8d72',mint:'#5fe6c6',violet:'#b39bff',teal:'#62dccf',ink:'#e8f0ff',dim:'#8ea6c4'};
const SANS='Inter,"Segoe UI",system-ui,-apple-system,sans-serif',MONO='"JetBrains Mono","SFMono-Regular",ui-monospace,Menlo,Consolas,monospace';
const piece=t=>t==='<EOS>'?'EOS':/^\s+$/.test(t)?(t.includes('\n')?'↵':'␠'):t;
const clamp01=x=>Math.max(0,Math.min(1,x));
const ease=x=>1-Math.pow(1-clamp01(x),3);
const back=x=>{x=clamp01(x);const c=1.4;return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2);};
const V=(x,y,z)=>new THREE.Vector3(x,y,z);

const POINT_VERTEX=`attribute float aSize;attribute float aAlpha;varying float vAlpha;uniform float uScale;
void main(){vAlpha=aAlpha;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=aSize*uScale/max(.1,-mv.z);gl_Position=projectionMatrix*mv;}`;
const POINT_FRAGMENT=`uniform vec3 uColor;uniform float uOpacity;varying float vAlpha;
void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d);a*=a;float core=smoothstep(.16,0.,d);gl_FragColor=vec4(uColor*(a+core*.8)*vAlpha*uOpacity,a*vAlpha*uOpacity);}`;

function roundRect(x,left,top,w,h,r){x.beginPath();x.moveTo(left+r,top);x.arcTo(left+w,top,left+w,top+h,r);x.arcTo(left+w,top+h,left,top+h,r);x.arcTo(left,top+h,left,top,r);x.arcTo(left,top,left+w,top,r);x.closePath();}
function wrap(x,text,width){const lines=[];let line='';for(const word of String(text).split(/\s+/)){const next=line?line+' '+word:word;if(x.measureText(next).width>width&&line){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);return lines;}
// A polyline with rounded corners, measured by arc length so signals move at constant speed.
function roundedPath(points,radius=.35){
  const v=points.map(p=>p.isVector3?p:V(...p)),path=new THREE.CurvePath();
  if(v.length===2){path.add(new THREE.LineCurve3(v[0],v[1]));return path;}
  let start=v[0].clone();
  for(let i=1;i<v.length-1;i++){
    const a=v[i-1],b=v[i],c=v[i+1],l1=b.distanceTo(a),l2=c.distanceTo(b),r=Math.min(radius,l1/2,l2/2);
    const p1=b.clone().sub(b.clone().sub(a).normalize().multiplyScalar(r)),p2=b.clone().add(c.clone().sub(b).normalize().multiplyScalar(r));
    if(start.distanceTo(p1)>1e-4)path.add(new THREE.LineCurve3(start,p1));
    path.add(new THREE.QuadraticBezierCurve3(p1,b.clone(),p2));start=p2;
  }
  path.add(new THREE.LineCurve3(start,v.at(-1)));return path;
}
const arc=(a,b,lift=1.2,bulge=0)=>{const m=a.clone().lerp(b,.5);m.y+=lift;m.z+=bulge;return new THREE.QuadraticBezierCurve3(a,m,b);};

export function createWorld(host,{language='es',onSelect=()=>{}}={}){
  const es=language==='es',t=(a,b)=>es?a:b;
  const reduce=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;
  const format=(v,d=2)=>new Intl.NumberFormat(es?'es-ES':'en-US',{maximumFractionDigits:d,minimumFractionDigits:Math.min(d,1)}).format(v);

  const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'});
  const dpr=Math.min(globalThis.devicePixelRatio||1,1.75);renderer.setPixelRatio(dpr);
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
  host.prepend(renderer.domElement);const canvas=renderer.domElement;
  canvas.setAttribute('aria-label',t('Modelo 3D interactivo. Arrastra para girar. Selecciona tokens o celdas para leer sus valores. Flechas para girar, más y menos para acercar.','Interactive 3D model. Drag to orbit. Select tokens or cells to read values. Arrow keys rotate; plus and minus zoom.'));canvas.tabIndex=0;

  const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x050b16,.022);
  const camera=new THREE.PerspectiveCamera(34,1,.1,220);
  const pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromScene(new RoomEnvironment(),.04);pmrem.dispose();
  scene.environment=environment.texture;scene.environmentIntensity=.3;
  scene.add(new THREE.HemisphereLight(0x9fc3ff,0x070b14,1.15));
  const key=new THREE.DirectionalLight(0xf1f5ff,1.7);key.position.set(4,9,8);scene.add(key);
  const rim=new THREE.DirectionalLight(0x4f7dff,2.4);rim.position.set(-8,5,-9);scene.add(rim);
  const warm=new THREE.PointLight(0xffb45a,0,14,1.6);scene.add(warm);

  const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:4});
  const composer=new EffectComposer(renderer,target);composer.addPass(new RenderPass(scene,camera));
  const bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.78,.62,.9);composer.addPass(bloom);composer.addPass(new OutputPass());

  const pointScale={value:400};
  const cellGeometry=new RoundedBoxGeometry(1,1,1,2,.12),blockGeometry=new RoundedBoxGeometry(1,1,1,3,.16),sphereGeometry=new THREE.SphereGeometry(1,24,16);
  const shared=[cellGeometry,blockGeometry,sphereGeometry];

  // Environment: deep gradient sky, a fading blueprint floor and slow dust.
  const sky=new THREE.Mesh(new THREE.SphereGeometry(120,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,
    vertexShader:'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec3 vP;void main(){float h=vP.y;vec3 top=vec3(.0015,.003,.009),mid=vec3(.006,.014,.036),low=vec3(.001,.002,.006);vec3 c=mix(mid,top,smoothstep(.02,.7,h));c=mix(low,c,smoothstep(-.3,.04,h));c+=vec3(.004,.008,.022)*exp(-pow(vP.x*1.6,2.)-pow((h-.12)*4.,2.));gl_FragColor=vec4(c,1.);}'}));
  scene.add(sky);shared.push(sky.geometry,sky.material);
  const floorUniforms={uTime:{value:0},uGlow:{value:new THREE.Color(0x0d1c3c)}};
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(90,90),new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:floorUniforms,
    vertexShader:'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader:`uniform float uTime;uniform vec3 uGlow;varying vec3 vW;
float grid(vec2 p,float s){vec2 q=p/s;vec2 g=abs(fract(q-.5)-.5)/fwidth(q);return 1.-min(min(g.x,g.y),1.);}
void main(){float d=length(vW.xz);float fade=exp(-d*d*.004);float minor=grid(vW.xz,.5)*.16,major=grid(vW.xz,2.5)*.42;
float ring=smoothstep(.35,0.,abs(d-mod(uTime*2.2,34.)))*.35*exp(-d*.06);
float pool=exp(-d*d*.018);vec3 line=vec3(.07,.16,.36)*(minor+major+ring*1.6);
gl_FragColor=vec4(line+uGlow*pool*.6,(minor+major+ring)*fade+pool*.45);}`}));
  floor.rotation.x=-Math.PI/2;floor.position.y=-.02;scene.add(floor);shared.push(floor.geometry,floor.material);
  const pointMaterial=(color,intensity=3)=>new THREE.ShaderMaterial({uniforms:{uColor:{value:new THREE.Color(color).multiplyScalar(intensity)},uScale:pointScale,uOpacity:{value:1}},vertexShader:POINT_VERTEX,fragmentShader:POINT_FRAGMENT,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
  const DUST=520,dustGeometry=new THREE.BufferGeometry(),dustSeed=Array.from({length:DUST},(_,i)=>{const r=Math.sin(i*12.9898)*43758.5453;return r-Math.floor(r);});
  dustGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(DUST*3),3));
  dustGeometry.setAttribute('aSize',new THREE.BufferAttribute(Float32Array.from(dustSeed,s=>.04+s*.09),1));
  dustGeometry.setAttribute('aAlpha',new THREE.BufferAttribute(Float32Array.from(dustSeed,s=>.12+(1-s)*.35),1));
  const dust=new THREE.Points(dustGeometry,pointMaterial(0x7fa9ff,1.1));dust.frustumCulled=false;scene.add(dust);shared.push(dustGeometry,dust.material);

  let S=null,active=null,leaving=[],phase=-1,op=0,signature='',current=null,disposed=false,time=0;
  const memory=new Map();
  let hovered=null;

  // ——— Building blocks. Every resource is owned by the set being built and disposed with it. ———
  function newSet(){const g=new THREE.Group();g.userData={res:new Set(),anims:[],ticks:[],hits:[],clock:0};return g;}
  const own=x=>{S.userData.res.add(x);return x;};
  const add=(o,parent=S)=>{parent.add(o);return o;};
  function collect(obj){const out=[];obj.traverse(o=>{for(const m of [o.material].flat())if(m&&!out.some(x=>x.m===m))out.push({m,o:m.uniforms?.uOpacity?m.uniforms.uOpacity.value:m.opacity,t:m.transparent});});return out;}
  function setOpacity(list,f){for(const {m,o,t:transparent} of list){if(m.uniforms?.uOpacity)m.uniforms.uOpacity.value=o*f;else{m.opacity=o*f;m.transparent=f<.999||transparent;}}}
  function appear(obj,delay=0,{dy=-.55,s0=.35,dur=.85,from=null,pop=false}={}){
    S.userData.anims.push({obj,delay,dur:reduce?.01:dur,dy,s0,pop,from:from?.clone(),pos:obj.position.clone(),scale:obj.scale.clone(),mats:collect(obj)});return obj;
  }
  function material(color,extra={}){return own(new THREE.MeshStandardMaterial({color,roughness:.34,metalness:.16,...extra}));}
  function text(str,{size=.32,color=CSS.ink,weight=650,mono=false,pill=null,stroke=null,align='center'}={}){
    const px=96,c=document.createElement('canvas'),x=c.getContext('2d'),font=`${weight} ${px}px ${mono?MONO:SANS}`;x.font=font;
    const w=Math.ceil(x.measureText(str).width),padX=pill?px*.46:px*.1,padY=pill?px*.26:px*.06;
    c.width=Math.max(8,w+padX*2);c.height=Math.ceil(px*1.22+padY*2);x.font=font;
    if(pill){x.fillStyle=pill;roundRect(x,2,2,c.width-4,c.height-4,(c.height-4)/2);x.fill();if(stroke){x.lineWidth=4;x.strokeStyle=stroke;x.stroke();}}
    x.fillStyle=color;x.textAlign='center';x.textBaseline='middle';x.fillText(str,c.width/2,c.height/2+px*.04);
    const texture=own(new THREE.CanvasTexture(c));texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
    const sprite=new THREE.Sprite(own(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false,toneMapped:false,fog:false})));
    const h=size*c.height/(px*1.22);sprite.scale.set(h*c.width/c.height,h,1);sprite.renderOrder=30;sprite.center.set(align==='left'?0:align==='right'?1:.5,.5);return sprite;
  }
  const at=(o,x,y,z)=>{o.position.set(x,y,z);return o;};
  function label(str,x,y,z,opts={}){const s=text(str,opts);s.position.set(x,y,z);return add(s);}
  // A designed card rendered to canvas: kicker, title and body with an accent rail.
  function panel(w,h,{kicker='',title='',body='',accent=CSS.blue,titleSize=.3,bodySize=.18,dim=false,mono=false}={}){
    const P=200,c=document.createElement('canvas');c.width=Math.round(w*P);c.height=Math.round(h*P);const x=c.getContext('2d');
    const g=x.createLinearGradient(0,0,c.width,c.height);g.addColorStop(0,dim?'#0d1626':'#12223d');g.addColorStop(1,'#070e1b');
    x.fillStyle=g;roundRect(x,3,3,c.width-6,c.height-6,26);x.fill();x.lineWidth=3;x.strokeStyle=accent+(dim?'44':'88');x.stroke();
    x.fillStyle=accent+(dim?'55':'');roundRect(x,22,26,7,c.height-52,3.5);x.fill();
    const pad=58,width=c.width-pad-40;let y=28;x.textBaseline='top';
    if(kicker){x.font=`700 ${P*.12}px ${MONO}`;x.fillStyle=accent+(dim?'99':'');x.fillText(kicker.toUpperCase(),pad,y);y+=P*.21;}
    if(title){x.font=`700 ${P*titleSize}px ${mono?MONO:SANS}`;x.fillStyle=dim?'#91a3bd':'#f1f6ff';for(const line of wrap(x,title,width).slice(0,3)){x.fillText(line,pad,y);y+=P*titleSize*1.18;}y+=P*.05;}
    if(body){x.font=`500 ${P*bodySize}px ${SANS}`;x.fillStyle=dim?'#6c7f99':'#a8bcd8';for(const line of wrap(x,body,width).slice(0,4)){x.fillText(line,pad,y);y+=P*bodySize*1.45;}}
    const texture=own(new THREE.CanvasTexture(c));texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
    const group=new THREE.Group();
    const face=new THREE.Mesh(own(new THREE.PlaneGeometry(w,h)),own(new THREE.MeshBasicMaterial({map:texture,transparent:true,toneMapped:false,depthWrite:false})));face.position.z=.061;face.renderOrder=5;group.add(face);
    const slab=new THREE.Mesh(blockGeometry,material(0x0a1322,{roughness:.5,metalness:.4}));slab.scale.set(w,h,.12);group.add(slab);
    return group;
  }
  function block(x,y,z,w,h,d,color,info=null,extra={}){const mesh=new THREE.Mesh(blockGeometry,material(color,extra));mesh.scale.set(w,h,d);mesh.position.set(x,y,z);if(info){mesh.userData.info=info;S.userData.hits.push(mesh);}return mesh;}
  function glowPoints(count,color,intensity=3.2){
    const geometry=own(new THREE.BufferGeometry());
    geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(count*3),3));
    geometry.setAttribute('aSize',new THREE.BufferAttribute(new Float32Array(count),1));
    geometry.setAttribute('aAlpha',new THREE.BufferAttribute(new Float32Array(count),1));
    const points=new THREE.Points(geometry,own(pointMaterial(color,intensity)));points.frustumCulled=false;points.renderOrder=25;return points;
  }
  // A glowing conduit with a comet (synchronised with narration) and a slow ambient stream.
  function route(points,{color=C.gold,weight=1,span=[0,1],radius=.018,curve=null,trail=14,stream=5,opacity=.5,arrow=true,delay=0}={}){
    const path=curve??roundedPath(points),length=path.getLength();
    const tube=new THREE.Mesh(own(new THREE.TubeGeometry(path,Math.max(24,Math.round(length*16)),radius*(.55+.6*weight),8,false)),own(new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(1.3),transparent:true,opacity:opacity*(.35+.65*weight),depthWrite:false,blending:THREE.AdditiveBlending})));
    add(tube);
    if(arrow){const cone=new THREE.Mesh(own(new THREE.ConeGeometry(.075+.05*weight,.2,12)),own(new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(1.6)})));cone.position.copy(path.getPointAt(1));cone.quaternion.setFromUnitVectors(V(0,1,0),path.getTangentAt(.999).normalize());add(cone);}
    const count=trail+stream,dots=add(glowPoints(count,color,2.6+weight*1.4)),pos=dots.geometry.attributes.position,size=dots.geometry.attributes.aSize,alpha=dots.geometry.attributes.aAlpha,p=V(0,0,0);
    const step=.11/Math.max(.5,length),seed=(delay*7.31)%1;
    S.userData.ticks.push(({sig,live})=>{
      const head=live?clamp01((sig-span[0])/Math.max(.001,span[1]-span[0])):((time*.42+seed)%1.35)/1.1;
      for(let i=0;i<trail;i++){
        const u=head-i*step,visible=head>.001&&u>=0&&u<=1&&head<=1.02;
        if(visible){path.getPointAt(Math.min(1,u),p);pos.setXYZ(i,p.x,p.y,p.z);}
        size.setX(i,visible?(.5-i*.028)*(.55+.45*weight)*(i===0?1+.15*Math.sin(time*9):1):0);alpha.setX(i,visible?(1-i/trail)*(.3+.7*weight):0);
      }
      for(let k=0;k<stream;k++){const u=((time*1.1)/length+k/stream+seed)%1;path.getPointAt(u,p);pos.setXYZ(trail+k,p.x,p.y,p.z);size.setX(trail+k,.12+.05*weight);alpha.setX(trail+k,.18+.3*weight*Math.sin(u*Math.PI));}
      pos.needsUpdate=size.needsUpdate=alpha.needsUpdate=true;
    });
    return {path,tube};
  }
  // Paper-style tensor: rows = tokens, columns = features. Cells are extruded by |value|.
  function cellMaterial(){
    const m=material(0xffffff,{roughness:.3,metalness:.12});
    m.onBeforeCompile=s=>{
      s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nattribute float glow;\nvarying float vGlow;').replace('#include <begin_vertex>','#include <begin_vertex>\nvGlow=glow;');
      s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying float vGlow;').replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n#ifdef USE_COLOR\ntotalEmissiveRadiance+=vColor.rgb*vGlow;\n#endif');
    };
    m.customProgramCacheKey=()=>'llm-cell-glow';return m;
  }
  function tensor(data,{x=0,y=1.8,z=0,w=2.4,h=3,title='',color=C.blue,selected=-1,probability=false,future=false,depth=.5,reveal=null,rowInfo=null,dimOthers=false,showDims=true,titleColor=CSS.ink}={}){
    const rows=data.length,cols=data[0].length,cw=w/cols,ch=h/rows,n=rows*cols,group=add(new THREE.Group());group.position.set(x,y,z);
    const plate=new THREE.Mesh(blockGeometry,material(0x0a1424,{roughness:.55,metalness:.35}));plate.scale.set(w+.26,h+.26,.08);plate.position.z=-.06;group.add(plate);
    const edge=new THREE.Mesh(blockGeometry,own(new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(.35),transparent:true,opacity:.35,depthWrite:false,blending:THREE.AdditiveBlending})));edge.scale.set(w+.34,h+.34,.04);edge.position.z=-.1;group.add(edge);
    if(title){const s=text(title,{size:.27,color:titleColor,weight:700});s.position.set(0,h/2+.42,0);group.add(s);}
    if(showDims){const s=text(`${rows} × ${cols}`,{size:.19,color:CSS.dim,mono:true,weight:500});s.position.set(0,-h/2-.32,0);group.add(s);}
    const mesh=new THREE.InstancedMesh(cellGeometry,cellMaterial(),n);group.add(mesh);
    const glow=new THREE.InstancedBufferAttribute(new Float32Array(n),1);
    // Instanced attributes live on the geometry; clone so each tensor owns its glow buffer.
    mesh.geometry=own(cellGeometry.clone());mesh.geometry.setAttribute('glow',glow);
    const cells=[],color3=new THREE.Color(),dark=new THREE.Color(0x0e192b),hot=new THREE.Color(color),neg=new THREE.Color(C.coral),mint=new THREE.Color(C.mint),blocked=new THREE.Color(0x221325);
    data.forEach((row,i)=>row.forEach((value,j)=>{
      const off=!Number.isFinite(value)||(future&&j>i),magnitude=probability?clamp01(value):Math.min(1,Math.abs(value));
      if(off)color3.copy(blocked);else color3.copy(dark).lerp(probability?mint:value<0?neg:hot,.28+.72*magnitude);
      mesh.setColorAt(i*cols+j,color3);
      cells.push({i,j,off,value,magnitude,cx:-w/2+(j+.5)*cw,cy:h/2-(i+.5)*ch,text:`${title||'T'} [${i+1}, ${j+1}] = ${off?(probability?'0':'−∞'):format(value,4)}`});
    }));
    mesh.userData.infos=cells.map(c=>rowInfo?rowInfo(c):{kind:'cell',text:c.text});S.userData.hits.push(mesh);
    let frame=null;
    if(selected>=0&&selected<rows){
      const yy=h/2-(selected+.5)*ch,pad=.1;
      frame=route([[-w/2-pad,yy-ch/2-.02,.32],[w/2+pad,yy-ch/2-.02,.32],[w/2+pad,yy+ch/2+.02,.32],[-w/2-pad,yy+ch/2+.02,.32],[-w/2-pad,yy-ch/2-.02,.32]],{radius:.014,trail:0,stream:0,arrow:false,opacity:.9,curve:null});
      group.add(frame.tube);
    }
    const matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),pos=V(0,0,0),scl=V(1,1,1);
    const update=({sig,live,clock,R})=>{
      for(let k=0;k<n;k++){
        const c=cells[k],r=reveal?reveal(c.i,c.j,{sig,live,clock,R}):1,d=c.off?.03:(.05+depth*c.magnitude)*Math.max(.04,r);
        pos.set(c.cx,c.cy,d/2);scl.set(cw*.84,ch*.82,d);matrix.compose(pos,q,scl);mesh.setMatrixAt(k,matrix);
        let g=c.off?0:.05+(r<1&&r>0?(1-r)*1.4:0);
        if(c.i===selected&&!c.off)g+=.22+.14*Math.sin(time*3.2-c.j*.7);
        if(dimOthers&&c.i!==selected)g*=.4;
        if(hovered?.mesh===mesh&&hovered.id===k)g+=.9;
        glow.setX(k,g);
      }
      mesh.instanceMatrix.needsUpdate=true;glow.needsUpdate=true;
    };
    S.userData.ticks.push(update);
    const cellPoint=(i,j,front=true)=>V(x-w/2+(j+.5)*cw,y+h/2-(i+.5)*ch,z+(front?.3:0));
    const rowY=i=>y+h/2-(i+.5)*ch;
    return {group,mesh,cellPoint,rowY,left:x-w/2-.2,right:x+w/2+.2,top:y+h/2,bottom:y-h/2,x,y,z,w,h,rows,cols};
  }
  function rowLabels(tokens,tensorBox,{offset=0,selected=-1}={}){
    tokens.forEach((token,i)=>label(piece(token),tensorBox.left-.36,tensorBox.rowY(i),tensorBox.z+.1,{size:.2,mono:true,weight:600,align:'right',color:i===selected?'#1b1203':CSS.dim,pill:i===selected?CSS.gold:'#0f1b2ecc'}));
  }
  function contextGrid(run,{x=3.6,y=2.4,z=0,cols=8,size=.34,highlight=null,fill=[.02,.3]}={}){
    const parts=[{text:es?'Responde brevemente.':'Answer briefly.',color:C.violet},{text:run.data.history,color:C.teal},{text:run.data.source?.text??'',color:C.mint},{text:run.data.question,color:C.blue}].filter(p=>p.text);
    const owners=[];parts.forEach((p,k)=>{const n=tokenize(p.text).length+(k<parts.length-1?1:0);for(let i=0;i<n;i++)owners.push(k);});
    const N=Math.min(run.tokens.length,owners.length||run.tokens.length),gap=size*.24,step=size+gap,rows=Math.ceil(N/cols),width=cols*step-gap,height=rows*step-gap;
    const mesh=new THREE.InstancedMesh(cellGeometry,cellMaterial(),N);mesh.geometry=own(cellGeometry.clone());const glow=new THREE.InstancedBufferAttribute(new Float32Array(N),1);mesh.geometry.setAttribute('glow',glow);
    const color3=new THREE.Color();const infos=[];
    for(let k=0;k<N;k++){const part=parts[owners[k]]??parts.at(-1);color3.set(part.color).multiplyScalar(highlight===null||highlight===owners[k]?.8:.28);mesh.setColorAt(k,color3);infos.push({kind:'token',index:k,text:`${piece(run.tokens[k])} · ID ${run.tokenIds[k]}`});}
    mesh.userData.infos=infos;S.userData.hits.push(mesh);
    const group=add(new THREE.Group());group.position.set(x,y,z);group.add(mesh);
    const firstRow=[];parts.forEach((_,k)=>{const index=owners.indexOf(k);firstRow.push(index<0?0:index);});
    const cellPos=k=>V(-width/2+(k%cols)*step+size/2,height/2-Math.floor(k/cols)*step-size/2,0);
    const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),s=V(1,1,1);
    S.userData.ticks.push(({R})=>{
      const f=R(fill[0],fill[1],.45,1.6)*N;
      for(let k=0;k<N;k++){const e=back(clamp01(f-k)),p=cellPos(k);p.z=size/2;s.setScalar(size*Math.max(.001,e));m4.compose(p,q,s);mesh.setMatrixAt(k,m4);
        const fresh=clamp01(1-(f-k)/4);glow.setX(k,(highlight!==null&&highlight===owners[k]?.45+.25*Math.sin(time*3+k*.4):.08)+fresh*1.4*(e>0?1:0)+(hovered?.mesh===mesh&&hovered.id===k?.9:0));}
      mesh.instanceMatrix.needsUpdate=true;glow.needsUpdate=true;
    });
    const world=k=>cellPos(k).add(group.position);
    return {group,parts,owners,firstRow,world,width,height,N,top:y+height/2,bottom:y-height/2,left:x-width/2,right:x+width/2};
  }

  // ——— Scenes ———
  function sceneContext(run){
    const items=[
      {kicker:t('Instrucciones','Instructions'),title:es?'Responde brevemente.':'Answer briefly.',accent:CSS.violet,color:C.violet},
      {kicker:t('Conversación anterior','Earlier conversation'),title:run.data.history||t('Sin conversación anterior','No earlier conversation'),accent:CSS.teal,color:C.teal,dim:!run.data.history},
      ...(run.data.source?[{kicker:t('Documento recuperado','Retrieved document'),title:run.data.source.text,accent:CSS.mint,color:C.mint,titleSize:.2}]:[]),
      {kicker:t('Tu pregunta','Your question'),title:run.data.question,accent:CSS.blue,color:C.blue,titleSize:.32,h:1.45}
    ];
    const grid=contextGrid(run,{x:3.7,y:2.35});
    label(t('CONTEXTO','CONTEXT'),grid.x??3.7,grid.top+.62,0,{size:.3,weight:800,color:CSS.ink});
    label(`${grid.N} tokens · ${t('una sola secuencia','one single sequence')}`,3.7,grid.top+.28,0,{size:.19,mono:true,color:CSS.dim,weight:500});
    label(t('El modelo solo recibe esto','The model only receives this'),3.7,grid.bottom-.38,0,{size:.2,color:CSS.gold,weight:600});
    const total=items.reduce((s,it)=>s+(it.h??1.05),0)+(items.length-1)*.3;let top=2.35+total/2;
    items.forEach((it,k)=>{
      const h=it.h??1.05,cy=top-h/2;top-=h+.3;
      const p=panel(5.3,h,{...it,bodySize:.17});p.position.set(-3.2,cy,-.25+k*.18);p.rotation.y=.1;add(p);appear(p,.08+k*.14,{dy:-.4,s0:.85});
      const ownerIndex=grid.parts.findIndex(part=>part.color===it.color);
      if(it.dim)return;
      const end=grid.world(Math.max(0,grid.firstRow[ownerIndex]??0));end.x-=.3;
      route([],{curve:new THREE.CubicBezierCurve3(V(-.45,cy,-.2+k*.18),V(.6,cy,.4),V(.9,end.y,.4),end),color:it.color,span:[.02+k*.06,.25+k*.06],delay:k});
    });
    appear(grid.group,.2,{dy:0,s0:.9});
  }
  function sceneRetrieval(run){
    const source=run.data.source;
    const archive=add(new THREE.Group());archive.position.set(-4.4,0,-.4);
    const edges=own(new THREE.EdgesGeometry(own(new THREE.BoxGeometry(2,2.5,.05))));
    for(let i=0;i<6;i++){const hot=i===5&&source,card=block(0,1.45,-1.1+i*.42,2,2.5,.05,hot?0x1f5b58:0x1a2d4a,null,{roughness:.6,emissive:hot?C.mint:C.blue,emissiveIntensity:hot?.35:.04});card.rotation.y=-.35;card.rotation.z=(i-2.5)*.02;
      const rim=new THREE.LineSegments(edges,own(new THREE.LineBasicMaterial({color:hot?C.mint:C.blue,transparent:true,opacity:hot?.9:.35})));card.add(rim);rim.scale.set(1/2,1/2.5,1/.05);archive.add(card);
      for(let l=0;l<5;l++){const line=block(-.1,2.25-l*.3,-1.1+i*.42+.04,l===0?1.2:1.5-(l%2)*.4,.06,.01,hot?C.mint:0x3a5680,null,{emissive:hot?C.mint:0,emissiveIntensity:hot?.4:0});line.rotation.copy(card.rotation);archive.add(line);}}
    archive.add(at(text(t('ARCHIVO LOCAL','LOCAL ARCHIVE'),{size:.22,mono:true,color:source?CSS.mint:CSS.dim,weight:700}),0,3.15,0));
    archive.add(at(text(t('Museo Delta · ficticio','Delta Museum · fictional'),{size:.17,color:CSS.dim,weight:500}),0,.02,.9));
    appear(archive,.05,{dy:-.3,s0:.9});
    if(source){
      const ring=new THREE.Mesh(own(new THREE.TorusGeometry(1.35,.02,8,64)),own(new THREE.MeshBasicMaterial({color:new THREE.Color(C.mint).multiplyScalar(2.2),transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false})));
      ring.rotation.y=-.35;archive.add(ring);S.userData.ticks.push(()=>{const u=(time*.45)%1;ring.position.set(0,1.45,-1.3+u*2.7);ring.scale.setScalar(.85+.15*Math.sin(u*Math.PI));ring.material.opacity=.8*Math.sin(u*Math.PI);});
    }
    const doc=panel(4.8,2.25,source?{kicker:'↳ '+source.title,title:source.text,body:t('Texto que se añade al contexto, no a los pesos.','Text added to the context, not to the weights.'),accent:CSS.mint,titleSize:.24}:{kicker:t('Búsqueda desactivada','Retrieval off'),title:t('El modelo continúa sin evidencia externa.','The model continues without external evidence.'),body:t('Activa «Consultar un documento» para añadir una fuente al contexto.','Turn on “Retrieve a document” to add a source to the context.'),accent:CSS.dim,dim:true,titleSize:.24});
    doc.position.set(-.2,2.85,.5);add(doc);appear(doc,source?.35:.15,{from:source?V(-4.4,1.6,-.4):null,dy:-.3,s0:.4,dur:1.1});
    const grid=contextGrid(run,{x:4.5,y:2.2,cols:7,size:.3,highlight:source?2:null});
    label(t('CONTEXTO','CONTEXT'),4.5,grid.top+.45,0,{size:.26,weight:800});
    appear(grid.group,.2,{dy:0,s0:.9});
    // Weights sit apart and never change during inference.
    const weights=add(new THREE.Group());weights.position.set(-.2,.55,1.4);
    for(let i=0;i<24;i++){const c=block((i%12-5.5)*.34,0,Math.floor(i/12)*.34,.26,.26,.26,0x1f2d45,null,{roughness:.5,metalness:.5});weights.add(c);}
    weights.add(at(text(t('PESOS · sin cambios','WEIGHTS · unchanged'),{size:.19,mono:true,color:CSS.dim,weight:600}),0,.42,.6));
    appear(weights,.3,{dy:-.2,s0:.9});
    if(source){
      route([],{curve:new THREE.CubicBezierCurve3(V(-3.4,2.3,-.2),V(-2.6,2.5,.6),V(-3.2,2.9,.6),V(-2.65,2.9,.55)),color:C.mint,span:[.03,.25]});
      const end=grid.world(grid.firstRow[2]??0);end.x-=.3;
      route([],{curve:new THREE.CubicBezierCurve3(V(2.25,2.85,.55),V(3,2.85,.6),V(2.9,end.y,.5),end),color:C.mint,span:[.25,.45],delay:1});
    }else label(t('Sin búsqueda: la pregunta sigue sola','No retrieval: the question goes on alone'),4.5,grid.bottom-.36,0,{size:.18,color:CSS.dim,weight:500});
  }
  function sceneTokens(run,selectedToken){
    const N=run.tokens.length,start=Math.max(0,Math.min(selectedToken-7,N-16)),list=run.tokens.slice(start,start+16);
    const widthOf=tok=>/^\s+$/.test(tok)?.5:Math.min(2.3,.62+piece(tok).length*.15),gap=.2,max=11;
    const rows=[[]];let w=0;list.forEach((tok,k)=>{const bw=widthOf(tok);if(w+bw>max&&rows.at(-1).length){rows.push([]);w=0;}rows.at(-1).push({tok,k,bw});w+=bw+gap;});
    const centers=[];
    rows.forEach((row,r)=>{const total=row.reduce((s,b)=>s+b.bw,0)+gap*(row.length-1);let x=-total/2;const y=2.3+((rows.length-1)/2-r)*1.8,z=r*.2;
      row.forEach(({tok,k,bw})=>{const index=start+k,cx=x+bw/2,selected=index===selectedToken,space=/^\s+$/.test(tok);x+=bw+gap;
        const g=add(new THREE.Group());g.position.set(cx,y,z);
        const inner=new THREE.Group();g.add(inner);
        const mesh=block(0,0,0,bw,.74,.74,selected?0x3a2a0c:space?0x111c2e:0x1b3052,{kind:'token',index,text:`${piece(tok)} · ID ${run.tokenIds[index]}`},{emissive:selected?C.gold:0,emissiveIntensity:selected?.55:0});inner.add(mesh);
        const face=text(piece(tok),{size:space?.26:.32,color:selected?'#fff3d6':space?CSS.dim:CSS.ink,weight:650,mono:true});face.position.set(0,.02,.4);inner.add(face);
        const id=text('ID '+run.tokenIds[index],{size:.16,mono:true,color:selected?'#20160a':CSS.dim,weight:600,pill:selected?CSS.gold:'#0c1627'});id.position.set(0,-.6,.36);inner.add(id);
        centers.push(V(cx,y,z-.6));
        const spread=(k-list.length/2)*.12;
        appear(g,.12+k*.05,{from:V(cx*.35+spread,y+1.6,z-1.2),s0:.2,dur:1});
        if(selected){S.userData.ticks.push(()=>{inner.position.y=.22+.06*Math.sin(time*2.4);});
          const beam=new THREE.Mesh(own(new THREE.CylinderGeometry(.02,.34,1.5,24,1,true)),own(new THREE.MeshBasicMaterial({color:new THREE.Color(C.gold).multiplyScalar(.9),transparent:true,opacity:.08,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide})));beam.position.set(0,-1.05,0);g.add(beam);}
      });
    });
    label(t('TEXTO  →  PIEZAS  →  IDs','TEXT  →  PIECES  →  IDs'),0,4.75,-.5,{size:.26,weight:800,color:CSS.ink});
    label(`${N} tokens · ${new Set(run.tokens).size} ${t('distintos','distinct')} · ${t('mostrando','showing')} ${start+1}–${start+list.length}`,0,4.35,-.5,{size:.18,mono:true,color:CSS.dim,weight:500});
    if(centers.length>1)route([],{curve:new THREE.CatmullRomCurve3(centers,false,'centripetal'),span:[.03,.6],radius:.014,opacity:.45,arrow:false});
  }
  function sceneVectors(run,selectedToken){
    const start=Math.max(0,Math.min(selectedToken-2,run.tokens.length-6)),tokens=run.tokens.slice(start,start+6),row=selectedToken-start;
    const info=(c)=>({kind:'token',index:start+c.i,text:c.text});
    const E=tensor(tokens.map(embedding),{x:-4.15,w:2.6,h:3,title:'E[token ID]',color:C.blue,selected:row,rowInfo:info});
    const P=tensor(tokens.map((_,i)=>positionEncoding(start+i)),{x:0,w:2.2,h:3,title:t('Posición P','Position P'),color:C.violet,selected:row,depth:.4,rowInfo:info});
    const X=tensor(tokens.map((tok,i)=>vector(tok,start+i)),{x:4.15,w:2.6,h:3,title:'X = E + P',color:C.blue,selected:row,rowInfo:info,reveal:(i,j,{R})=>{const rv=R(.08,.45,.5,1.4),d=(i+j)/10;return ease((rv-d*.7)/.3);}});
    rowLabels(tokens,E,{selected:row});
    label('+',-2.05,1.85,.3,{size:.8,color:CSS.gold,weight:300});label('=',2.05,1.85,.3,{size:.8,color:CSS.gold,weight:300});
    [E,P,X].forEach((m,k)=>appear(m.group,.1+k*.18,{dy:-.5,s0:.8}));
    const yy=E.rowY(row);
    route([],{curve:arc(V(E.right,yy,.35),V(X.left,yy,.35),2.4,.8),span:[.05,.4]});
    route([],{curve:arc(V(P.right,yy,.35),V(X.left,yy,.35),.5,.3),span:[.15,.45],color:C.violet,delay:1});
    label(`${piece(run.tokens[selectedToken])} · ID ${run.tokenIds[selectedToken]} · ${t('fila activa','active row')}`,0,-.35,.4,{size:.24,color:CSS.gold,weight:650});
    label(t('6 dimensiones · valores sintéticos · filas = tokens · columnas = dimensiones','6 dimensions · synthetic values · rows = tokens · columns = dimensions'),0,-.8,.4,{size:.17,color:CSS.dim,weight:500});
  }
  function sceneLayers(run,queryIndex){
    const {tokens,offset}=contextWindow(run),N=tokens.length,q=Math.min(queryIndex,N-1),d=transformerTrace(tokens,offset);
    const rowInfo=c=>({kind:'attention',index:c.i,text:`${c.text} · ${t('consulta','query')} → ${piece(tokens[c.i])}`});
    const opNames=[t('PROYECTAR Q · K · V','PROJECT Q · K · V'),t('COMPARAR Q CON K','COMPARE Q WITH K'),t('MÁSCARA + SOFTMAX','MASK + SOFTMAX'),t('MEZCLAR LOS VALORES','MIX THE VALUES'),t('RESIDUAL + RED','RESIDUAL + FEED-FORWARD')];
    label(`${t('UNA CABEZA DE ATENCIÓN','ONE ATTENTION HEAD')} · ${op+1}/5 · ${opNames[op]}`,0,4.75,-.2,{size:.24,weight:800,color:CSS.ink});
    label(`${t('Consulta activa','Active query')}: ${piece(tokens[q])} · ${t('posición','position')} ${offset+q+1}`,0,4.32,-.2,{size:.22,color:CSS.gold,weight:650,mono:true});
    const seq=(k,span=.3)=>(i,j,{R})=>ease((R(.05,.65,.35,1.8)-k)/span);
    if(op===0){
      const X=tensor(d.X,{x:-4.7,w:2.2,title:'X · N × 6',selected:q,rowInfo});rowLabels(tokens,X,{selected:q});
      const specs=[[d.Q,-1.35,C.blue,'Q = XW_Q'],[d.K,1.55,C.violet,'K = XW_K'],[d.V,4.45,C.mint,'V = XW_V']];
      appear(X.group,.05,{dy:-.4,s0:.85});
      specs.forEach(([m,x,color,name],k)=>{
        const T=tensor(m,{x,w:1.7,title:name,color,selected:q,rowInfo,reveal:(i,j,ctx)=>ease((ctx.R(.04,.6,.35,1.8)-k*.18-i/N*.35)/.2)});appear(T.group,.2+k*.15,{dy:-.4,s0:.85});
        const yy=-.2-k*.28;route([[X.x,X.bottom-.05,.4],[X.x,yy,.4],[x,yy,.4],[x,T.bottom-.05,.4]],{color,span:[k*.12,.25+k*.12],delay:k,radius:.016});
        label(`W${['Q','K','V'][k]} · 6 × 3`,x,-1.1,.3,{size:.17,mono:true,color:CSS.dim,weight:500});
      });
    }else if(op===1){
      const qv=tensor([d.Q[q]],{x:-4.5,y:1.8,w:2,h:.62,title:'qᵢ · 1 × 3',selected:0,rowInfo:c=>({kind:'cell',text:c.text})});
      const K=tensor(d.K[0].map((_,j)=>d.K.map(r=>r[j])),{x:-.2,w:3,h:1.9,title:'Kᵀ · 3 × N',color:C.violet,rowInfo:c=>({kind:'cell',text:c.text})});
      const Sx=tensor(d.scores,{x:4.2,w:2.9,title:'S = QKᵀ / √3',selected:q,rowInfo,dimOthers:true,reveal:(i,j,{R})=>i!==q?1:ease((R(.1,.6,.35,1.8)-j/N*.75)/.18)});
      [qv,K,Sx].forEach((m,k)=>appear(m.group,.05+k*.16,{dy:-.4,s0:.85}));
      route([[qv.right,1.8,.4],[K.left,1.8,.4]],{span:[.02,.2]});route([[K.right,1.8,.4],[Sx.left,Sx.rowY(q),.4]],{span:[.2,.45],delay:1});
      label('÷ √3',2.25,2.35,.4,{size:.22,color:CSS.gold,mono:true});
      label(t('Cada celda: qᵢ · kⱼ — un producto escalar, aún no es probabilidad','Each cell: qᵢ · kⱼ — a dot product, not a probability yet'),0,-.85,.4,{size:.17,color:CSS.dim,weight:500});
    }else if(op===2){
      const M=tensor(d.masked,{x:-3.1,w:3.6,title:'S + M',selected:q,rowInfo});
      const A=tensor(d.A,{x:3.1,w:3.6,title:'A = softmax(S + M)',color:C.mint,probability:true,future:true,selected:q,rowInfo,reveal:(i,j,{R})=>ease((R(.1,.6,.35,1.8)-i/N*.7)/.22)});
      rowLabels(tokens,M,{selected:q});
      appear(M.group,.05,{dy:-.4,s0:.85});appear(A.group,.25,{dy:-.4,s0:.85});
      route([[M.right,1.8,.4],[A.left,1.8,.4]],{span:[.03,.3]});label('softmax',0,2.35,.4,{size:.22,color:CSS.gold,mono:true});
      label(t('Futuro = −∞ → peso 0','Future = −∞ → weight 0'),-3.1,-.85,.4,{size:.17,color:CSS.coral,weight:600});label('Σⱼ Aᵢⱼ = 1',3.1,-.85,.4,{size:.2,color:CSS.mint,mono:true,weight:600});
    }else if(op===3){
      const A=tensor(d.A,{x:-4.3,w:2.7,title:'A · N × N',color:C.mint,probability:true,future:true,selected:q,rowInfo});
      const Vv=tensor(d.V,{x:0,w:1.9,title:'V · N × 3',color:C.mint,rowInfo});
      const Z=tensor(d.mixed,{x:4.3,w:2.2,title:'Z = AV',selected:q,rowInfo,reveal:(i,j,{R})=>i!==q?1:ease((R(.3,.7,.9,1)))});
      [A,Vv,Z].forEach((m,k)=>appear(m.group,.05+k*.16,{dy:-.4,s0:.85}));
      d.A[q].forEach((w,j)=>{if(w<=0)return;const a=V(A.right,A.rowY(q),.4),b=V(Vv.left,Vv.rowY(j),.4),c=V(Vv.right,Vv.rowY(j),.4),e=V(Z.left,Z.rowY(q),.4);
        route([],{curve:arc(a,b,.25,.2),weight:w,span:[.05,.35],delay:j,arrow:false});route([],{curve:arc(c,e,.25,.2),weight:w,span:[.3,.6],delay:j+.5,arrow:false});
        if(w>.12)label(`${Math.round(w*100)} %`,(A.right+Vv.left)/2,(A.rowY(q)+Vv.rowY(j))/2+.12,.5,{size:.15,mono:true,color:CSS.gold,weight:600});});
      label(t('Pulso más grueso = mayor coeficiente Aᵢⱼ','Thicker pulse = larger coefficient Aᵢⱼ'),0,-.85,.4,{size:.17,color:CSS.dim,weight:500});
    }else{
      const specs=[[d.X,-5,'X',C.blue],[d.projected,-2.5,'ZW_O',C.violet],[d.H,0,'H · Add & Norm',C.blue],[d.hidden,2.5,'ReLU(HW₁)',C.violet],[d.Y,5,'Y · Add & Norm',C.mint]];
      const T=specs.map(([m,x,name,color],k)=>{const box=tensor(m,{x,w:1.75,title:name,color,selected:q,rowInfo,depth:.4,reveal:k?seq(k*.15,.2):null});appear(box.group,.05+k*.12,{dy:-.4,s0:.85});return box;});
      rowLabels(tokens,T[0],{selected:q});
      for(let k=0;k<4;k++)route([[T[k].right,1.8,.4],[T[k+1].left,1.8,.4]],{span:[k*.12,k*.12+.18],delay:k,radius:.014});
      route([[T[0].x,T[0].top+.6,.1],[T[0].x,4.1,.1],[T[2].x,4.1,.1],[T[2].x,T[2].top+.6,.1]],{color:C.teal,span:[.05,.3],radius:.014});
      route([[T[2].x,T[2].bottom-.45,.1],[T[2].x,-.05,.1],[T[4].x,-.05,.1],[T[4].x,T[4].bottom-.45,.1]],{color:C.teal,span:[.4,.65],radius:.014,delay:2});
      label(t('residual','residual'),-2.5,4.3,.1,{size:.17,mono:true,color:CSS.teal});
    }
  }
  function sceneProbabilities(run){
    const c=nextCandidates(run),ps=softmax(c.logits,run.options.temperature),best=ps.indexOf(Math.max(...ps));
    const {tokens,offset}=contextWindow(run),Y=transformerTrace(tokens,offset).Y.at(-1);
    const h=tensor(Y.map(v=>[v]),{x:-4.9,y:2,w:.55,h:3,title:'h',color:C.blue,showDims:false,depth:.35});
    label(t('vector final','final vector'),-4.9,.2,.3,{size:.17,color:CSS.dim,weight:500});
    appear(h.group,.05,{dy:-.4,s0:.8});
    label(`softmax(logits / T)  ·  T = ${format(run.options.temperature,2)}`,.6,5,-.3,{size:.22,mono:true,color:CSS.gold,weight:600});
    const spacing=Math.min(2.7,8/ps.length),maxH=3.9;
    ps.forEach((p,i)=>{
      const x=.9+(i-(ps.length-1)/2)*spacing,win=i===best,key=`p5:${run.data.question}:${i}`,from=memory.get(key)??0,to=p;memory.set(key,to);
      const g=add(new THREE.Group());g.position.set(x,0,0);
      const shell=new THREE.LineSegments(own(new THREE.EdgesGeometry(own(new THREE.BoxGeometry(1.2,maxH,1.2)))),own(new THREE.LineBasicMaterial({color:win?C.mint:C.blue,transparent:true,opacity:.18})));shell.position.y=maxH/2;g.add(shell);
      const bar=new THREE.Mesh(blockGeometry,material(win?C.mint:C.blue,{emissive:win?C.mint:C.blue,emissiveIntensity:win?.42:.2,roughness:.2,metalness:.1,transparent:true,opacity:.92}));g.add(bar);
      bar.userData.info={kind:'probability',text:`${piece(c.pieces[i])} · ${format(p*100,1)} % · ${t('probabilidad de texto, no de verdad','text probability, not truth')}`};S.userData.hits.push(bar);
      const pct=text(`${format(p*100,1)} %`,{size:.4,weight:800,color:win?'#dffcf4':CSS.ink});g.add(pct);
      const logit=text(`logit ${format(c.logits[i],1)}`,{size:.16,mono:true,color:CSS.dim,weight:500});g.add(logit);
      const tag=text(piece(c.pieces[i]),{size:.3,weight:700,mono:true,color:win?'#062019':CSS.ink,pill:win?CSS.mint:'#122540',stroke:win?null:'#2c4670'});tag.position.set(0,-.02,.95);g.add(tag);
      const inPlace=S.userData.clock>=100,born=time;
      S.userData.ticks.push(({R})=>{const k=inPlace?clamp01((time-born)/.6):R(.04,.3,.5,1.1),v=from+(to-from)*ease(k),hh=.06+v*maxH;bar.scale.set(1.05,hh,1.05);bar.position.y=hh/2;pct.position.set(0,hh+.45,0);logit.position.set(0,hh+.16,0);});
      appear(g,.15+i*.12,{dy:0,s0:.9});
      route([],{curve:new THREE.CubicBezierCurve3(V(h.right,2,.3),V(-2.6,2,.4),V(x-1.6,.6,.6),V(x-.1,.35,.65)),weight:p,span:[.02,.25],delay:i,arrow:false,color:win?C.mint:C.gold});
    });
    label(t('Probable no significa verdadero','Probable does not mean true'),.9,-.62,.9,{size:.19,color:CSS.dim,weight:600});
  }
  function sceneChoose(run){
    const c=nextCandidates(run),ps=softmax(c.logits,run.options.temperature),token=pendingToken(run);
    const greedy=run.options.decoding==='greedy',scripted=!!run.outputTokens;
    let chosen=c.pieces.indexOf(token),u;
    if(!scripted&&!greedy){u=randomStep(run.seed).value;chosen=sample(ps,u);}
    if(chosen<0)chosen=ps.indexOf(Math.max(...ps));
    const W=10,left=-W/2;let acc=0;const colors=[C.mint,C.blue,C.violet,C.coral];
    const segs=ps.map((p,i)=>{const s={x0:left+acc*W,x1:left+(acc+p)*W,p,i};acc+=p;return s;});
    if(u===undefined)u=(segs[chosen].x0+segs[chosen].x1)/2/W+.5;
    const dropX=left+u*W;
    label(greedy||scripted?t('ELECCIÓN MÁXIMA · argmax','GREEDY · argmax'):`${t('MUESTREO · semilla','SAMPLING · seed')} ${run.seed}`,0,4.95,-.3,{size:.24,weight:800,mono:true,color:CSS.ink});
    label(t('Cada segmento mide lo que su probabilidad','Each segment is as wide as its probability'),0,4.55,-.3,{size:.18,color:CSS.dim,weight:500});
    segs.forEach(s=>{const w=Math.max(.02,s.x1-s.x0-.05),win=s.i===chosen,cx=(s.x0+s.x1)/2;
      const seg=block(cx,.95,0,w,.42,.9,colors[s.i%4],{kind:'probability',text:`${piece(c.pieces[s.i])} · ${format(s.p*100,1)} %`},{emissive:colors[s.i%4],emissiveIntensity:.15});add(seg);appear(seg,.08+s.i*.1,{dy:0,s0:.2});
      S.userData.ticks.push(({R})=>{const hit=R(.18,.24,.95,.25);seg.material.emissiveIntensity=win?.12+hit*(.28+.06*Math.sin(time*4)):.08;});
      if(w>.5){label(piece(c.pieces[s.i]),cx,1.5,.7,{size:.22,mono:true,weight:700,color:win?'#fff':CSS.ink});label(`${format(s.p*100,1)} %`,cx,.42,.5,{size:.17,mono:true,color:CSS.dim,weight:500});}
    });
    label('0',left,.2,.3,{size:.16,mono:true,color:CSS.dim});label('1',-left,.2,.3,{size:.16,mono:true,color:CSS.dim});
    const ball=add(new THREE.Mesh(sphereGeometry,own(new THREE.MeshBasicMaterial({color:new THREE.Color(C.gold).multiplyScalar(3)}))));ball.scale.setScalar(.16);
    const halo=add(glowPoints(1,C.gold,2.4));const wave=add(new THREE.Mesh(own(new THREE.TorusGeometry(1,.025,8,64)),own(new THREE.MeshBasicMaterial({color:new THREE.Color(C.gold).multiplyScalar(2),transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}))));wave.rotation.x=Math.PI/2;wave.position.set(dropX,1.18,0);
    const out=add(new THREE.Group());const outBlock=block(0,0,0,Math.min(3,.9+piece(token).length*.2),.95,.95,0x2a2006,{kind:'pending',text:t('Siguiente pieza al emitir: ','Next piece to emit: ')+piece(token)},{emissive:C.gold,emissiveIntensity:.6});out.add(outBlock);
    const outText=text(piece(token),{size:.46,weight:800,mono:true,color:'#fff4db'});outText.position.z=.52;out.add(outText);
    const hint=text(t('1 token — no la frase entera','1 token — not the whole sentence'),{size:.18,color:CSS.dim,weight:500});hint.position.y=.8;out.add(hint);
    const outMats=collect(out);
    S.userData.ticks.push(({R})=>{
      const fall=R(.04,.18,.55,1),y=4.3-3.1*fall*fall,landed=fall>=1;
      ball.position.set(dropX,landed?1.2+.04*Math.sin(time*6):y,0);halo.position.copy(ball.position);
      halo.geometry.attributes.position.setXYZ(0,0,0,0);halo.geometry.attributes.aSize.setX(0,1.4);halo.geometry.attributes.aAlpha.setX(0,1);halo.geometry.attributes.aSize.needsUpdate=halo.geometry.attributes.aAlpha.needsUpdate=true;
      const k=R(.18,.28,1.05,.6);wave.scale.setScalar(.2+k*2.4);wave.material.opacity=landed?(1-k)*.9:0;
      const rise=R(.22,.4,1.3,.9);out.position.set(dropX*(1-ease(rise)),1.2+ease(rise)*2.15,-.2*ease(rise));out.scale.setScalar(Math.max(.001,back(rise)));setOpacity(outMats,clamp01(rise*3));
      warm.intensity=landed?1.2:0;warm.position.set(out.position.x,out.position.y+.5,out.position.z+1);
    });
  }
  function sceneLoop(run){
    const {tokens,offset}=contextWindow(run),N=tokens.length,generatedStart=run.tokens.length,radius=7.5,arcSpan=.95;
    const slots=tokens.map((_,i)=>{const a=(i/(Math.max(1,N-1))-.5)*arcSpan;return V(Math.sin(a)*radius,1.1,-Math.cos(a)*radius+radius-1.8);});
    const newest=run.generated.length?N-1:-1;
    tokens.forEach((tok,i)=>{const absolute=offset+i,generated=absolute>=generatedStart,g=add(new THREE.Group());g.position.copy(slots[i]);g.lookAt(0,1.1,8);
      const bw=Math.min(1.6,.55+piece(tok).length*.13);
      g.add(block(0,0,0,bw,.66,.66,generated?0x0f3b33:0x1b3052,{kind:'token-window',text:`${piece(tok)} · ${generated?t('generado','generated'):t('entrada','input')} · ${t('posición','position')} ${absolute+1}`},{emissive:generated?C.mint:0,emissiveIntensity:generated?.25:0}));
      const face=text(piece(tok),{size:.26,mono:true,weight:650,color:generated?'#c9fff0':CSS.ink});face.position.z=.36;g.add(face);
      const k=block(-.16,.62,0,.26,.1,.46,C.violet,null,{emissive:C.violet,emissiveIntensity:.35}),v=block(.16,.62,0,.26,.1,.46,C.mint,null,{emissive:C.mint,emissiveIntensity:.35});g.add(k,v);
      if(i===newest&&!run.done){const outPos=V(4.4,1.5,2.6),curve=new THREE.CubicBezierCurve3(outPos,V(6.5,5.5,1.5),V(slots[i].x+1.5,5,slots[i].z),slots[i].clone());
        route([],{curve,color:C.mint,span:[.05,.3],radius:.02});
        S.userData.ticks.push(({R})=>{const f=ease(R(.05,.3,.5,1.6));curve.getPoint(f,g.position);const pulse=clamp01(1-Math.abs(f-1)*6);k.material.emissiveIntensity=v.material.emissiveIntensity=.35+pulse*2+(f>=1?.35*Math.sin(time*4):0);});
      }else appear(g,.05+i*.06,{dy:-.4,s0:.7});
    });
    label(t('VENTANA VISIBLE · últimas 8 piezas','VISIBLE WINDOW · last 8 pieces'),0,.3,-1.2,{size:.2,mono:true,weight:700,color:CSS.dim});
    label(t('▮ K  ▮ V  ·  caché KV: se reutiliza, no se recalcula','▮ K  ▮ V  ·  KV cache: reused, not recomputed'),0,2.25,-1.2,{size:.18,mono:true,color:CSS.violet,weight:600});
    label(run.done?t('FIN DE SECUENCIA · EOS','END OF SEQUENCE · EOS'):t('LO ESCRITO VUELVE AL CONTEXTO','THE OUTPUT RETURNS TO CONTEXT'),0,5.15,-1,{size:.26,weight:800,color:run.done?CSS.coral:CSS.ink});
    label(t('1 token nuevo → otra pasada · pesos fijos','1 new token → another pass · fixed weights'),0,4.75,-1,{size:.18,color:CSS.dim,weight:500});
    const answer=panel(6.4,1.35,{kicker:t('Lo que recibes','What you receive'),title:(run.generated.join('')||'…')+(run.done?'':' ▍'),accent:CSS.mint,titleSize:.24});answer.position.set(-.9,.85,3.1);add(answer);appear(answer,.2,{dy:-.3,s0:.9});
    if(run.done){const eos=text('⏹ EOS',{size:.42,weight:800,mono:true,color:'#2a0d06',pill:CSS.coral});eos.position.set(4.4,1.5,2.6);add(eos);appear(eos,.3,{dy:-.3,s0:.5});}
  }

  // ——— Composition, camera and interaction ———
  const VIEWS=[{t:[0,2.35,0],w:12,h:6.2,yaw:-.1,pitch:.2},{t:[0,2.1,0],w:12.4,h:6,yaw:.12,pitch:.24},{t:[0,2.2,0],w:13.4,h:6.2,yaw:0,pitch:.16},{t:[0,1.9,0],w:13.4,h:6.4,yaw:0,pitch:.1},{t:[0,2,0],w:14,h:6.8,yaw:0,pitch:.1},{t:[0,2.2,0],w:12.2,h:6.8,yaw:-.08,pitch:.2},{t:[0,2.2,0],w:11.5,h:6.2,yaw:0,pitch:.5},{t:[0,2.3,0],w:13,h:6.6,yaw:0,pitch:.3}];
  const cam={yaw:0,pitch:.3,dist:16,target:V(0,2,0)},goal={yaw:0,pitch:.3,dist:16,target:V(0,2,0)};
  let userYaw=0,userPitch=0,zoom=1,width=1,height=1,idle=0;
  function frameGoal(){const v=VIEWS[Math.max(0,phase)]??VIEWS[0],half=THREE.MathUtils.degToRad(camera.fov/2),aspect=width/height;
    const fit=Math.max((v.h/2)/Math.tan(half),(v.w/2)/(Math.tan(half)*aspect))*1.08;
    goal.dist=fit*zoom;goal.yaw=v.yaw+userYaw;goal.pitch=THREE.MathUtils.clamp(v.pitch+userPitch,-.05,1.3);goal.target.set(...v.t);}
  function build(run,p,selectedToken,queryIndex,{transition}){
    if(active){if(transition){active.userData.leaving=0;active.userData.leaveMats=collect(active);leaving.push(active);}else destroy(active);}
    S=newSet();active=S;scene.add(S);
    if(!transition)S.userData.clock=100;
    if(p===0)sceneContext(run);else if(p===1)sceneRetrieval(run);else if(p===2)sceneTokens(run,selectedToken);else if(p===3)sceneVectors(run,selectedToken);
    else if(p===4)sceneLayers(run,queryIndex);else if(p===5)sceneProbabilities(run);else if(p===6)sceneChoose(run);else sceneLoop(run);
    S=null;hovered=null;
  }
  function destroy(set){scene.remove(set);for(const x of set.userData.res)x.dispose?.();set.userData.res.clear();}
  function update(run,p,selectedToken=0,queryIndex=7){
    current={run,p,selectedToken,queryIndex};
    const next=JSON.stringify([p,run.prompt,run.generated,run.done,run.options.temperature,run.options.decoding,run.seed,selectedToken,queryIndex]);
    if(next===signature)return;signature=next;
    const changedPhase=p!==phase;
    if(changedPhase){phase=p;op=0;userYaw=0;userPitch=0;zoom=1;frameGoal();}
    const transition=changedPhase||(p===7&&run.generated.length!==active?.userData.generated);
    build(run,p,selectedToken,queryIndex,{transition});active.userData.generated=run.generated.length;
  }
  function cameraApply(dt){
    const k=1-Math.exp(-dt*(reduce?30:3.2));
    cam.yaw+=(goal.yaw-cam.yaw)*k;cam.pitch+=(goal.pitch-cam.pitch)*k;cam.dist+=(goal.dist-cam.dist)*k;cam.target.lerp(goal.target,k);
    const sway=reduce||idle<3?0:Math.min(1,(idle-3)/4),yaw=cam.yaw+sway*Math.sin(time*.16)*.07,pitch=cam.pitch+sway*Math.sin(time*.11)*.025;
    camera.position.set(cam.target.x+Math.sin(yaw)*Math.cos(pitch)*cam.dist,cam.target.y+Math.sin(pitch)*cam.dist,cam.target.z+Math.cos(yaw)*Math.cos(pitch)*cam.dist);camera.lookAt(cam.target);
  }
  function resize(){width=Math.max(1,host.clientWidth);height=Math.max(1,host.clientHeight);renderer.setSize(width,height,false);composer.setPixelRatio(dpr);composer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();pointScale.value=height*dpr/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));frameGoal();}
  const observer=new ResizeObserver(resize);observer.observe(host);
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  function pick(e){if(!active)return null;const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(active.userData.hits,false)[0];if(!hit)return null;
    const info=hit.instanceId!==undefined?hit.object.userData.infos?.[hit.instanceId]:hit.object.userData.info;return info?{mesh:hit.object,id:hit.instanceId,info}:null;}
  let down=null;
  function pointerDown(e){down={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false};canvas.setPointerCapture(e.pointerId);idle=0;}
  function pointerMove(e){
    if(!down){const h=pick(e);if(hovered?.boost)hovered.mesh.material.emissiveIntensity-=hovered.boost;hovered=h;if(h&&h.id===undefined&&h.mesh.material.emissiveIntensity!==undefined){h.boost=.5;h.mesh.material.emissiveIntensity+=h.boost;}canvas.style.cursor=h?'pointer':'grab';return;}
    const dx=e.clientX-down.lastX,dy=e.clientY-down.lastY;if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)down.moved=true;
    userYaw-=dx*.006;userPitch=THREE.MathUtils.clamp(userPitch+dy*.005,-.4,1.1);down.lastX=e.clientX;down.lastY=e.clientY;idle=0;frameGoal();cam.yaw=goal.yaw;cam.pitch=goal.pitch;
  }
  function pointerUp(e){if(!down)return;const click=!down.moved;down=null;if(!click)return;const h=pick(e);if(h)onSelect(h.info);}
  function wheel(e){e.preventDefault();zoom=THREE.MathUtils.clamp(zoom*Math.exp(e.deltaY*.001),.55,1.8);idle=0;frameGoal();}
  function keydown(e){if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','+','-','='].includes(e.key))return;e.preventDefault();idle=0;
    if(e.key==='Home')return reset();if(e.key==='ArrowLeft')userYaw-=.12;if(e.key==='ArrowRight')userYaw+=.12;if(e.key==='ArrowUp')userPitch=Math.min(1.1,userPitch+.08);if(e.key==='ArrowDown')userPitch=Math.max(-.4,userPitch-.08);if(e.key==='+'||e.key==='=')zoom=Math.max(.55,zoom*.9);if(e.key==='-')zoom=Math.min(1.8,zoom*1.1);frameGoal();}
  canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',()=>{down=null;});
  canvas.addEventListener('pointerleave',()=>{if(hovered?.boost)hovered.mesh.material.emissiveIntensity-=hovered.boost;hovered=null;});
  canvas.addEventListener('wheel',wheel,{passive:false});canvas.addEventListener('keydown',keydown);
  function reset(){userYaw=0;userPitch=0;zoom=1;idle=0;frameGoal();}

  let lastFlow={index:0,progress:0};
  function render(dt=0,flow=lastFlow,{live=true}={}){
    if(disposed)return;
    time+=dt;idle+=dt;
    if(phase===4&&current&&flow.index!==op){op=flow.index;const {run,p,selectedToken,queryIndex}=current;build(run,p,selectedToken,queryIndex,{transition:true});active.userData.generated=run.generated.length;}
    lastFlow=flow;
    const sig=live?clamp01(flow.progress):1;
    for(const set of leaving){set.userData.leaving+=dt;const f=1-ease(set.userData.leaving/(reduce?.01:.45));setOpacity(set.userData.leaveMats,f);set.position.y=-(1-f)*.6;if(f<=0){destroy(set);set.userData.gone=true;}}
    leaving=leaving.filter(s=>!s.userData.gone);
    if(active){
      const u=active.userData;u.clock+=dt;const clock=u.clock;
      const R=(s0,s1,c0=.4,cd=1.4)=>live?clamp01((sig-s0)/Math.max(.001,s1-s0)):clamp01((clock-c0)/cd);
      for(const a of u.anims){if(a.done)continue;const e=ease((clock-a.delay)/a.dur);
        if(a.from)a.obj.position.lerpVectors(a.from,a.pos,e);else a.obj.position.set(a.pos.x,a.pos.y+a.dy*(1-e),a.pos.z);
        a.obj.scale.copy(a.scale).multiplyScalar(a.s0+(1-a.s0)*back(e));setOpacity(a.mats,clamp01(e*1.6));if(e>=1){a.done=true;a.obj.scale.copy(a.scale);a.obj.position.copy(a.pos);setOpacity(a.mats,1);}}
      const ctx={sig,live,clock,R,dt};for(const tick of u.ticks)tick(ctx);
    }
    if(phase!==6)warm.intensity=0;
    floorUniforms.uTime.value=time;
    const pos=dust.geometry.attributes.position;for(let i=0;i<DUST;i++){const s=dustSeed[i];pos.setXYZ(i,(s*37%1-.5)*36+Math.sin(time*.05+i)*.4,((s*71+time*.012*(.3+s))%1)*11,(s*53%1-.5)*26-3);}pos.needsUpdate=true;
    cameraApply(dt);
    composer.render(dt);
  }
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();onSelect({kind:'error',text:t('Se perdió el contexto 3D. Recarga la página; el texto y el audio siguen disponibles.','3D context lost. Reload the page; text and audio remain available.')});});
  resize();cam.dist=goal.dist*1.25;cam.pitch=goal.pitch+.25;
  return {update,render,reset,zoom(delta){zoom=THREE.MathUtils.clamp(zoom*delta,.55,1.8);idle=0;frameGoal();},dispose(){disposed=true;observer.disconnect();for(const s of [active,...leaving])if(s)destroy(s);for(const x of shared)x.dispose();environment.dispose();target.dispose();composer.dispose?.();renderer.dispose();canvas.remove();}};
}
