import * as THREE from '../vendor/three.module.js';
import {STOPS,standPosition} from './model.js';
import {contextWindow,transformerTrace,nextCandidates,softmax,pendingToken} from '../llms/model.js';
export const PALETTE={blue:0x8fb3ff,mint:0x7fe6d3,gold:0xffcf7a,coral:0xff8a7a,violet:0xb79bff};
export const visible=x=>x==='<EOS>'?'EOS':/^\s+$/.test(x)?'␠':x;
const {blue,mint,gold,coral,violet}=PALETTE;

// The same computed tensors as the notebook, staged like the cinematic view.
// Geometry represents information, not the physical layout of a processor.
export function createGallery(es){
 const t=(a,b)=>es?a:b,scene=new THREE.Scene(),fixed=[],dynamic=[],targets=[],groups=[],operations=[],paths=[];
 scene.background=new THREE.Color(0x05070f);scene.fog=new THREE.FogExp2(0x05070f,.017);
 scene.add(new THREE.HemisphereLight(0xc6d8ff,0x11162b,2));const sun=new THREE.DirectionalLight(0xd0e0ff,2);sun.position.set(4,12,8);scene.add(sun);
 const architecture=new THREE.Group(),exhibits=new THREE.Group();scene.add(architecture,exhibits);
 let resources=fixed,signature='',active=0,currentOperation=0,elapsed=0;
 const own=o=>(resources.push(o),o);
 function box(g,x,y,z,w,h,d,color,info){const mesh=new THREE.Mesh(own(new THREE.BoxGeometry(w,h,d)),own(new THREE.MeshStandardMaterial({color,roughness:.4,metalness:.22,emissive:color,emissiveIntensity:.18})));mesh.position.set(x,y,z);g.add(mesh);if(info){mesh.userData=info;targets.push(mesh);}return mesh;}
 function text(g,str,x,y,z,width=5,color='#dbe5ff',height=.3){
  const c=document.createElement('canvas'),ctx=c.getContext('2d');ctx.font='500 52px system-ui';c.width=Math.max(64,Math.ceil(ctx.measureText(str).width+36));c.height=84;ctx.font='500 52px system-ui';ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(str,c.width/2,42);
  const tx=own(new THREE.CanvasTexture(c));tx.colorSpace=THREE.SRGBColorSpace;const h=Math.min(height*1.4,width*c.height/c.width);
  const mesh=new THREE.Mesh(own(new THREE.PlaneGeometry(h*c.width/c.height,h)),own(new THREE.MeshBasicMaterial({map:tx,transparent:true,depthWrite:false,toneMapped:false,side:THREE.DoubleSide})));mesh.position.set(x,y,z);g.add(mesh);return mesh;
 }
 function glow(g,x,y,z,color,size=.8){const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d'),grad=ctx.createRadialGradient(32,32,0,32,32,32);grad.addColorStop(0,'#ffffff');grad.addColorStop(.15,'#ffffffaa');grad.addColorStop(1,'#ffffff00');ctx.fillStyle=grad;ctx.fillRect(0,0,64,64);const tx=own(new THREE.CanvasTexture(c));const sprite=new THREE.Sprite(own(new THREE.SpriteMaterial({map:tx,color,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending})));sprite.position.set(x,y,z);sprite.scale.setScalar(size);g.add(sprite);return sprite;}
 function chip(g,str,x,y,z,w=1.05,color=blue,info){
  const mesh=box(g,x,y,z,w,.49,.19,0x17213b,info);const edge=new THREE.LineSegments(own(new THREE.EdgesGeometry(mesh.geometry)),own(new THREE.LineBasicMaterial({color,transparent:true,opacity:.65})));mesh.add(edge);text(g,str,x,y,z+.106,w-.08,'#e8efff',.29);return mesh;
 }
 function route(g,points,phase,color=gold,weight=.035,operation=null){
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const tube=new THREE.Mesh(own(new THREE.TubeGeometry(curve,40,weight,5,false)),own(new THREE.MeshBasicMaterial({color,transparent:true,opacity:.35,depthWrite:false})));g.add(tube);
  const ball=glow(g,0,0,0,color,.24+weight*3);paths.push({curve,ball,tube,phase,operation});return curve;
 }
 function column(g,values,x,y,z,name,width=.52,height=1.8){
  const cell=height/values.length;values.forEach((v,i)=>{const c=box(g,x,y+height/2-(i+.5)*cell,z,width,cell*.84,.22,v>=0?blue:coral,{text:name+' · d'+(i+1)+' = '+v.toFixed(4),value:v});c.material.emissive.setHex(v>=0?blue:coral);c.material.emissiveIntensity=.12;});text(g,name,x,y-height/2-.26,z+.15,width*1.8,'#aabbd8',.24);
 }
 function card(g,title,body,x,y,z,w=6,color=blue){
  const h=.76+Math.ceil(body.length/(w*7))*.3;box(g,x,y,z,w,h,.15,0x10182d);box(g,x-w/2+.035,y,z+.08,.035,h,.025,color);text(g,title,x,y+h/2-.24,z+.1,w-.4,'#a5b8db',.23);
  const words=body.split(' '),lines=[''];for(const word of words){if((lines.at(-1)+' '+word).length>w*7)lines.push(word);else lines[lines.length-1]+=(lines.at(-1)?' ':'')+word;}lines.forEach((line,i)=>text(g,line,x,y+h/2-.6-i*.3,z+.11,w-.4,'#e8efff',.29));
 }
 box(architecture,-2,-.18,-47,16,.3,122,0x080d19);
 for(let z=8;z>-107;z-=2){box(architecture,1.2,.001,z,6,.009,.009,0x1a2340);}
 for(let x=-1;x<5;x+=2)box(architecture,x,.001,-49,.009,.009,114,0x1a2340);
 box(architecture,4.9,3,-48,.12,6.4,118,0x080c18);
 const starPositions=[];for(let i=0;i<800;i++){const r=Math.sin(i*127.1+3)*43758.54,s=r-Math.floor(r);starPositions.push(-13+s*25,3+(Math.sin(i*89.7)*.5+.5)*10,-110+(Math.sin(i*23.4)*.5+.5)*126);}
 const starGeometry=own(new THREE.BufferGeometry());starGeometry.setAttribute('position',new THREE.Float32BufferAttribute(starPositions,3));scene.add(new THREE.Points(starGeometry,own(new THREE.PointsMaterial({color:0x7888b0,size:.027,transparent:true,opacity:.65}))));
 STOPS.forEach(s=>{
  const g=new THREE.Group();g.position.set(s.x,0,s.z);g.rotation.y=Math.PI/2;architecture.add(g);
  box(g,0,.12,0,10,.24,4.9,0x101729);box(g,0,2.8,-1.35,10.4,5.55,.14,0x090f20);
  box(g,-5.18,2.8,-1.24,.025,5.5,.03,0x29375b);box(g,5.18,2.8,-1.24,.025,5.5,.03,0x29375b);
  text(g,String(s.index+1).padStart(2,'0'),-4.72,4.88,-1.15,.6,'#6f84ad',.28);
  box(g,0,.255,2.44,9.6,.012,.018,gold);
  const p=standPosition(s.index),stand=new THREE.Group();stand.position.set(p.x,0,p.z);stand.rotation.y=Math.PI/2;architecture.add(stand);
  box(stand,0,.38,0,.38,.76,.38,0x14213b);const button=box(stand,0,.96,0,.86,.4,.26,0x263b50,{action:'listen',index:s.index});button.material.emissive.setHex(mint);button.material.emissiveIntensity=.16;
  text(stand,'▶  '+String(s.index+1).padStart(2,'0'),0,.96,.145,.72,'#beffec',.24);glow(stand,0,.96,.17,mint,.9);
 });
 const fixedTargetCount=targets.length;
 function rebuild(run,query){
  dynamic.splice(0).forEach(r=>r.dispose());exhibits.clear();groups.length=operations.length=paths.length=0;targets.splice(fixedTargetCount);resources=dynamic;
  STOPS.forEach(s=>{const g=new THREE.Group();g.position.set(s.x,0,s.z);g.rotation.y=Math.PI/2;exhibits.add(g);groups.push(g);});
  const {tokens,offset}=contextWindow(run),trace=transformerTrace(tokens,offset),q=Math.min(tokens.length-1,Math.max(0,query??tokens.length-1)),xs=tokens.map((_,i)=>(i-(tokens.length-1)/2)*1.09);
  const info=t('Operaciones reales · pesos sintéticos · ventana de 8 tokens','Real operations · synthetic weights · 8-token window');
  card(groups[0],t('INSTRUCCIÓN','INSTRUCTION'),es?'Responde brevemente.':'Answer briefly.',-1,run.data.history?4.05:3.85,-.15,6,blue);
  if(run.data.history)card(groups[0],t('CONVERSACIÓN','CONVERSATION'),run.data.history,-.3,2.9,.1,6.6,violet);
  card(groups[0],t('TU PREGUNTA','YOUR QUESTION'),run.data.question,.65,run.data.history?1.55:2.05,.35,7,gold);
  text(groups[0],t('El contexto es texto. Los pesos no cambian al preguntar.','Context is text. Asking a question does not change the weights.'),0,.7,.6,9,'#8fa4c9',.29);
  route(groups[0],[[-3,3.8,.1],[3.5,3.8,.2],[3.5,2,.65],[2.5,2,.65]],0);
  const source=run.data.source;
  card(groups[1],t('FUENTE EXTERNA','EXTERNAL SOURCE'),source?.text||t('Sin documento en este ejemplo. No se ha consultado internet.','No document in this example. No internet search took place.'),-1.8,3.2,0,4.2,source?mint:0x52607d);
  card(groups[1],t('CONTEXTO','CONTEXT'),source?t('El documento se añade como texto de entrada.','The document is added as input text.'):t('La pregunta usa el conocimiento representado por los pesos.','The question uses knowledge represented by the weights.'),2.8,2.15,.4,3.8,blue);
  if(source)route(groups[1],[[-.4,3.25,.3],[1.3,3.6,1],[2.5,2.9,.7]],1,mint);
  text(groups[1],source?t('Ejemplo ficticio de RAG · recuperar no garantiza acertar','Fictional RAG example · retrieval does not guarantee correctness'):t('La búsqueda es una herramienta opcional, no un paso automático','Search is an optional tool, not an automatic step'),0,.75,.5,9,'#a4b7d9',.3);
  const last=run.tokens.slice(-12),start=run.tokens.length-last.length;
  last.forEach((token,i)=>{const x=(i%4-1.5)*2.12,y=3.75-Math.floor(i/4)*1.08,z=Math.floor(i/4)*.28;chip(groups[2],visible(token),x,y,z,1.83,[blue,violet,mint][i%3],{text:visible(token)+' · ID '+run.tokenIds[start+i]});text(groups[2],'ID '+run.tokenIds[start+i],x,y-.41,z+.14,1.6,'#8fa4c9',.23);});
  text(groups[2],t('Últimas 12 piezas · ␠ = espacio · tokenizador de ejemplo','Last 12 pieces · ␠ = space · example tokenizer'),0,.55,.8,8,'#a4b7d9',.28);
  route(groups[2],[[-4.2,4.25,0],[4.25,4.25,0],[4.25,.8,1],[-3.7,.8,1]],2);
  tokens.forEach((token,i)=>{column(groups[3],trace.X[i],xs[i],2.55,0,'',.77,2.3);chip(groups[3],visible(token),xs[i],.95,.17,.97,i===q?gold:blue,{text:visible(token)+' · '+t('posición ','position ')+(offset+i)});});
  text(groups[3],'x = E[id] + P('+t('posición','position')+')',0,4.32,.1,8,'#ffcf7a',.39);
  text(groups[3],t('Una columna por token · 6 dimensiones · azul + / coral −','One column per token · 6 dimensions · blue + / coral −'),0,.43,.4,9,'#a4b7d9',.28);
  for(let d=0;d<6;d++)text(groups[3],'d'+(d+1),-4.72,3.51-d*.383,.12,.38,'#8fa4c9',.19);
  // Five separate exhibits occupy the same attention stage, following audio cues.
  for(let op=0;op<5;op++){const g=new THREE.Group();groups[4].add(g);operations.push(g);g.userData.operation=op;}
  const g0=operations[0];column(g0,trace.X[q],-3.35,2.5,.3,'X · 6',1,2.4);
  [['Q',trace.Q,gold],['K',trace.K,violet],['V',trace.V,mint]].forEach(([name,values,color],i)=>{const x=-.6+i*2.15;column(g0,values[q],x,2.5,.15,name+' · 3',1.15,1.5);text(g0,'W'+name,x,3.75,.2,1.5,'#b0c3e3',.28);route(g0,[[-2.75,2.5,.6],[-1.7,4.15,.7],[x,4.15,.7],[x,3.4,.4]],4,color,.024,0);});
  text(g0,t('Un vector de entrada → tres proyecciones distintas','One input vector → three different projections'),0,.63,.7,9,'#c5d3ec',.31);
  for(const op of [1,2,3]){
   const g=operations[op],weights=trace.A[q];
   chip(g,op===3?'Z = Σ A·V':'Q · '+visible(tokens[q]),xs[q]*.4,4.14,.5,2.2,gold,{text:t('Consulta activa: ','Active query: ')+visible(tokens[q])});
   tokens.forEach((token,j)=>{
    const blocked=j>q,x=xs[j],color=j===q?gold:op>=2&&blocked?0x46506b:op===3?mint:blue;
    chip(g,visible(token),x,1.16,.5,.97,color,{action:'query',query:j,text:visible(token)});
    if(op===1){column(g,trace.K[j],x,2.15,.15,'K',.52,.83);text(g,trace.scores[q][j].toFixed(2),x,.68,.62,.92,'#b9c9e6',.27);}
    else if(op===2){const h=.12+weights[j]*1.4;const bar=box(g,x,1.7+h/2,.12,.65,h,.5,blocked?0x141c30:gold,{text:'A['+q+','+j+'] = '+weights[j].toFixed(5),value:weights[j]});if(!blocked)bar.material.emissive.setHex(0x513913);text(g,blocked?'−∞ → 0':(weights[j]*100).toFixed(1)+'%',x,.68,.62,.99,blocked?'#677692':'#ffcf7a',.27);}
    else{column(g,trace.V[j],x,2,.12,'V',.57,.9);text(g,'× '+weights[j].toFixed(2),x,.68,.65,.99,blocked?'#677692':'#7fe6d3',.25);}
    if(op===1||!blocked){const start=[x,op===1?2.75:2.7,.45],end=[xs[q]*.4,3.84,.65];route(g,[start,[x*.85,3.2+Math.abs(x-xs[q])*.08,1.2],end],4,op===3?mint:gold,op===1?.018:.012+weights[j]*.09,op);}
   });
   text(g,op===1?t('Puntuaciones Q·K / √3 · aún no son probabilidades','Scores Q·K / √3 · these are not probabilities'):op===2?t('El futuro queda bloqueado · los pesos visibles suman 100 %','Future positions are blocked · visible weights sum to 100%'):t('Cada peso multiplica un vector V · luego se suman','Each weight multiplies a V vector · then the vectors are added'),0,.28,.8,9,'#a4b7d9',.27);
   if(op===3){column(g,trace.mixed[q],-3.55,4.02,.5,'Z = Σ A·V',.85,.85);route(g,[[xs[q]*.4,4.1,.65],[-1.8,4.65,1],[-3.55,4.6,.6]],4,mint,.04,3);}
  }
  const g4=operations[4];text(g4,'H = LN(X + ZWₒ)',-3.25,4.22,0,2.7,'#9fb4d8',.27);[['H',trace.H[q],-3.25,6],['ReLU(HW₁)',trace.hidden[q],0,12],['Y',trace.Y[q],3.25,6]].forEach(([name,data,x])=>column(g4,data,x,2.5,0,name,1.05,2.6));
  route(g4,[[-2.7,2.5,.2],[-1.8,2.5,.8],[-.65,2.5,.2]],4,blue,.035,4);route(g4,[[.65,2.5,.2],[1.8,2.5,.8],[2.65,2.5,.2]],4,violet,.035,4);route(g4,[[-3.25,3.85,.2],[-2,4.55,.8],[2,4.55,.8],[3.25,3.85,.2]],4,gold,.035,4);
  text(g4,t('Residual: sumar la entrada · red por posición: 6 → 12 → 6','Residual: add the input · position-wise network: 6 → 12 → 6'),0,.64,.5,9,'#ffcf7a',.3);
  text(groups[4],info,0,-.04,1,9,'#7588ac',.24);
  const candidates=nextCandidates(run),ps=softmax(candidates.logits,run.options.temperature),colors=[mint,blue,violet];
  ps.forEach((p,i)=>{const y=3.8-i*1.15;chip(groups[5],visible(candidates.pieces[i]),-2.9,y,.2,2.2,colors[i%3],{text:'logit = '+candidates.logits[i]});box(groups[5],1.35,y,0,4.9,.36,.22,0x192039);box(groups[5],-1.1+p*2.45,y,.13,Math.max(.018,4.9*p),.36,.25,colors[i%3],{text:'p = '+p.toFixed(5),value:p});text(groups[5],(p*100).toFixed(1)+'%',4.35,y,.25,1.1,'#e8efff',.29);text(groups[5],'logit '+candidates.logits[i],-2.9,y-.41,.3,2.1,'#8295ba',.22);route(groups[5],[[-4.2,4.3,.3],[-4.45,y,.8],[-4.05,y,.3]],5,colors[i%3],.025);});
  text(groups[5],'softmax(logits / T)   ·   T = '+run.options.temperature.toFixed(2),0,.65,.5,9,'#ffcf7a',.33);
  text(groups[5],t('Continuación ≠ verdad · logits preparados, independientes del bloque anterior','Continuation ≠ truth · curated logits, independent of the block above'),0,.23,.6,9,'#91a4c8',.26);
  let edge=-4;ps.forEach((p,i)=>{const w=p*8;box(groups[6],edge+w/2,1.7,.2,Math.max(.008,w-.015),.62,.48,colors[i%3]);if(w>.8)text(groups[6],(p*100).toFixed(1)+'%',edge+w/2,1.7,.46,w-.12,'#091223',.29);edge+=w;});
  const chosen=candidates.pieces.indexOf(pendingToken(run)),before=ps.slice(0,Math.max(0,chosen)).reduce((a,b)=>a+b,0),cx=-4+8*(before+(ps[Math.max(0,chosen)]||0)/2);
  chip(groups[6],visible(pendingToken(run)),0,3.95,.1,3.5,gold,{text:t('Se emite una sola pieza al avanzar.','Advancing emits a single piece.')});route(groups[6],[[0,3.65,.3],[cx,3,.9],[cx,2.2,.6]],6,gold,.045);
  text(groups[6],run.outputTokens?t('Continuación preparada · una pieza por ciclo','Curated continuation · one piece per cycle'):run.options.decoding==='greedy'?t('Elegir la probabilidad mayor (greedy)','Choose the highest probability (greedy)'):t('Muestreo reproducible con semilla','Reproducible sampling with a seed'),0,.75,.7,9,'#d0dcf1',.31);
  text(groups[6],t('Los pesos del modelo permanecen fijos','The model weights stay fixed'),0,.32,.7,8,'#8fa4c9',.27);
  card(groups[7],t('LO QUE RECIBES','WHAT YOU RECEIVE'),run.generated.join('')||'…',0,3.95,0,8,gold);
  chip(groups[7],t('CONTEXTO','CONTEXT'),-2.9,1.9,0,2.45,blue);chip(groups[7],t('MODELO','MODEL'),.05,1.9,0,2.35,violet);chip(groups[7],run.done?'EOS':visible(run.generated.at(-1)||'…'),3,1.9,0,2,gold);
  route(groups[7],[[-1.65,1.9,.3],[-1.2,2.25,.7],[-1.12,1.9,.3]],7,blue);route(groups[7],[[1.25,1.9,.3],[1.65,2.25,.7],[1.9,1.9,.3]],7,gold);
  if(!run.done)route(groups[7],[[3,1.58,.4],[3,.65,1.2],[-2.9,.65,1.2],[-2.9,1.58,.4]],7,mint);
  text(groups[7],t('El nuevo token vuelve a la entrada · la caché KV evita recalcular K y V anteriores','The new token returns to the input · KV caching reuses earlier keys and values'),0,.29,1.4,9,'#8fbfc5',.27);
  scene.updateMatrixWorld(true);
 }
 return {scene,targets,groups,operations,paths,fixed,dynamic,
  update(run,query){const key=JSON.stringify([run.prompt,run.generated,run.done,run.options.temperature,run.options.decoding,query]);if(key!==signature){signature=key;rebuild(run,query);}active=run.phase;},
  animate(dt,progress,running,cue,reduced=false){if(running)elapsed+=dt;currentOperation=cue.index;operations.forEach((g,i)=>g.visible=i===currentOperation);paths.forEach(({ball,curve,tube,phase,operation},i)=>{const isActive=phase===active&&(operation===null||operation===currentOperation);ball.visible=isActive;tube.material.opacity=isActive?.5:.14;const u=reduced?.5:(elapsed*.32+i*.11)%1;ball.position.copy(curve.getPoint(u));});},
  dispose(){[...fixed,...dynamic].forEach(r=>r.dispose());}
 };
}
export function createExperience(host,{es,onInspect,onAction}){
 const gallery=createGallery(es),renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=THREE.ACESFilmicToneMapping;
 const camera=new THREE.PerspectiveCamera(64,1,.08,155);camera.rotation.order='YXZ';const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label',es?'Galería 3D. Ratón: mirar. WASD: caminar. E: escuchar el stand.':'3D gallery. Mouse: look. WASD: walk. E: listen at a stand.');host.append(canvas);
 const ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),projected=new THREE.Vector3();
 function visibleAncestors(o){for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;}
 function inspect(x,y){const rect=canvas.getBoundingClientRect();pointer.set(x===null?0:(x-rect.left)/rect.width*2-1,y===null?0:1-(y-rect.top)/rect.height*2);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(gallery.targets.filter(visibleAncestors))[0];if(hit&&hit.distance<14){if(hit.object.userData.action)onAction(hit.object.userData);else onInspect(hit.object.userData);}}
 function resize(){renderer.setSize(host.clientWidth,host.clientHeight,false);camera.aspect=host.clientWidth/Math.max(1,host.clientHeight);camera.fov=Math.min(88,2*Math.atan(Math.tan(32*Math.PI/180)/Math.min(1,camera.aspect/1.35))*180/Math.PI);camera.updateProjectionMatrix();}
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 return {canvas,update:gallery.update,inspect,render(player,dt,progress,running,cue,reduced){camera.position.set(player.x,1.65,player.z);camera.rotation.set(player.pitch,player.yaw,0,'YXZ');gallery.animate(dt,progress,running,cue,reduced);renderer.render(gallery.scene,camera);},
  projectStand(index,player){const s=standPosition(index);projected.set(s.x,s.y+.5,s.z).project(camera);return {x:(projected.x+1)*host.clientWidth/2,y:(1-projected.y)*host.clientHeight/2,visible:projected.z<1&&projected.z>-1&&Math.abs(projected.x)<.9&&Math.abs(projected.y)<.83&&Math.hypot(player.x-s.x,player.z-s.z)<11};},
  dispose(){observer.disconnect();gallery.dispose();renderer.dispose();canvas.remove();}
 };
}
