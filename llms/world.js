import * as THREE from '../vendor/three.module.js';
import {vector,embedding,positionEncoding,transformerTrace,contextWindow,softmax,nextCandidates,pendingToken} from './model.js';

const ink=0xc9e5ff,blue=0x78aaff,mint=0x79e1ca,amber=0xffb58b,gold=0xffd16a,purple=0xbc9aff;
const piece=t=>t==='<EOS>'?'EOS':/^\s+$/.test(t)?(t.includes('\n')?'↵':'␠'):t;
export function createWorld(host,{language='es',onSelect=()=>{}}={}){
  const es=language==='es',t=(a,b)=>es?a:b;
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setClearColor(0x091321);
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
  host.prepend(renderer.domElement);const canvas=renderer.domElement;canvas.setAttribute('aria-label',t('Modelo 3D interactivo. Arrastra para girar. Selecciona tokens o celdas para leer sus valores. Flechas para girar, más y menos para acercar.','Interactive 3D model. Drag to orbit. Select tokens or cells to read values. Arrow keys rotate; plus and minus zoom.'));canvas.tabIndex=0;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.1,120);
  scene.fog=new THREE.Fog(0x091321,32,70);
  scene.add(new THREE.HemisphereLight(0xbddeff,0x131829,2.1));
  const light=new THREE.DirectionalLight(0xe8f0ff,3);light.position.set(3,10,7);scene.add(light);
  const rim=new THREE.DirectionalLight(0x6ca4ff,2.2);rim.position.set(-7,4,-6);scene.add(rim);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:0x0c1929,roughness:.82,metalness:.2}));ground.rotation.x=-Math.PI/2;ground.position.y=-.26;scene.add(ground);
  const grid=new THREE.GridHelper(70,70,0x2c4561,0x172b42);grid.position.y=-.24;grid.material.transparent=true;grid.material.opacity=.5;scene.add(grid);
  const content=new THREE.Group();scene.add(content);let interactive=[],movers=[],signature='',phase=0,disposed=false,flow={index:0,progress:0},current=null;
  let yaw=.15,pitch=.72,zoom=1,width=1,height=1;
  const target=new THREE.Vector3(0,1.1,0),raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  const labelTextures=new Set(),resources=new Set();
  const format=(v,d=2)=>new Intl.NumberFormat(es?'es-ES':'en-US',{maximumFractionDigits:d}).format(v);
  function material(color,extra={}){const m=new THREE.MeshStandardMaterial({color,metalness:.22,roughness:.35,...extra});resources.add(m);return m;}
  function box(x,y,z,w,h,d,color,info,extra={}){
    const geo=new THREE.BoxGeometry(w,h,d);resources.add(geo);const mesh=new THREE.Mesh(geo,material(color,extra));mesh.position.set(x,y,z);content.add(mesh);
    if(info){mesh.userData=info;interactive.push(mesh);}return mesh;
  }
  function label(text,x,y,z,w=3,color='#c9def3',fontSize=38,backplate=false){
    const c=document.createElement('canvas'),ctx=c.getContext('2d');ctx.font='600 64px system-ui';c.width=Math.ceil(ctx.measureText(text).width+28);c.height=100;
    if(backplate){ctx.fillStyle='#102239';ctx.fillRect(0,0,c.width,c.height);}
    ctx.font='600 64px system-ui';ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,c.width/2,50);
    const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;labelTextures.add(texture);
    const m=new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false});resources.add(m);const s=new THREE.Sprite(m);s.position.set(x,y,z);const h=Math.min(fontSize/55,w*c.height/c.width);s.scale.set(h*c.width/c.height,h,1);content.add(s);return s;
  }
  function card(text,x,y,z,w=6,h=1.6,color=0x233b58){
    box(x,y,z,w,h,.18,color);
    const words=text.split(' '),lines=[];let line='';for(const word of words){if((line+' '+word).length>40){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);
    lines.slice(0,3).forEach((l,i)=>label(l,x,y+(lines.length-1)*.17-i*.34,z+.15,w*.94,'#dfedff',32));
  }
  function line(points,color=mint){const geo=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));resources.add(geo);const mat=new THREE.LineBasicMaterial({color,transparent:true,opacity:.65});resources.add(mat);content.add(new THREE.Line(geo,mat));}
  function particle(path,color=gold){const geo=new THREE.SphereGeometry(.105,16,12);resources.add(geo);const ball=new THREE.Mesh(geo,material(color,{emissive:color,emissiveIntensity:2}));content.add(ball);movers.push({ball,path});}
  function route(points,color=gold,strength=1){
    line(points,color);
    const curve=new THREE.CurvePath();for(let i=1;i<points.length;i++)curve.add(new THREE.LineCurve3(new THREE.Vector3(...points[i-1]),new THREE.Vector3(...points[i])));
    const tip=new THREE.ConeGeometry(.10,.24,8);resources.add(tip);const arrow=new THREE.Mesh(tip,material(color));arrow.position.copy(curve.getPoint(.94));arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),curve.getTangent(.94));content.add(arrow);
    particle(f=>curve.getPoint(Math.min(.999,Math.max(0,f))),gold);movers.at(-1).ball.scale.setScalar(.65+strength*.65);
  }
  // Tensor diagrams use token rows and feature columns, as in paper figures.
  function tensor(data,x,y,z,w,h,title,color=blue,selected=-1,{probability=false,future=false}={}){
    const rows=data.length,cols=data[0].length,cw=w/cols,ch=h/rows;
    box(x,y,z-.07,w+.14,h+.14,.08,0x152a42);
    label(title,x,y+h/2+.42,z,w+1,'#d5e7fc',26);
    label(`${rows} × ${cols}`,x,y-h/2-.30,z,w,'#8ba8c6',21);
    data.forEach((row,i)=>row.forEach((value,j)=>{
      const blocked=!Number.isFinite(value)||(future&&j>i),baseColor=new THREE.Color(blocked?0x172438:probability?mint:value<0?amber:color);
      if(!blocked)baseColor.multiplyScalar(probability?.3+.7*value:.38+.62*Math.min(1,Math.abs(value)));
      const cx=x-w/2+(j+.5)*cw,cy=y+h/2-(i+.5)*ch;
      box(cx,cy,z,cw*.87,ch*.84,.10,baseColor,{kind:'cell',text:`${title} [${i+1}, ${j+1}] = ${blocked?(probability?'0':'−∞'):format(value,4)}`},{emissive:i===selected?gold:0,emissiveIntensity:i===selected?.18:0});
      if(blocked&&cols<=8)label(probability?'0':'×',cx,cy,z+.1,cw*.8,'#627991',14);
    }));
    if(selected>=0&&selected<rows){const yy=y+h/2-(selected+.5)*ch;line([[x-w/2-.15,yy-ch/2,z+.12],[x+w/2+.15,yy-ch/2,z+.12],[x+w/2+.15,yy+ch/2,z+.12],[x-w/2-.15,yy+ch/2,z+.12],[x-w/2-.15,yy-ch/2,z+.12]],gold);}
  }
  function layerScene(run,queryIndex){
    const {tokens,offset}=contextWindow(run),q=Math.min(queryIndex,tokens.length-1),d=transformerTrace(tokens,offset),op=flow.index;
    box(0,-2,0,13,.1,6,0x102238);
    label(t('UNA CABEZA · OPERACIONES MATRICIALES','ONE HEAD · MATRIX OPERATIONS'),0,4.7,0,11,'#b8cfe9',28);
    label(`${t('Consulta activa','Active query')}: ${piece(tokens[q])} · ${t('posición','position')} ${offset+q+1}`,0,-.9,.1,10,'#ffd16a',25);
    const pane=(values,x,name,color=blue,width=2.5,opts={})=>tensor(values,x,1.8,0,width,values.length===1?.65:3,name,color,values.length===1?0:q,opts);
    if(op===0){
      pane(d.X,-4.7,'X · N × 6',blue,2.2);pane(d.Q,-1.5,'Q · N × 3',blue,1.7);pane(d.K,1.5,'K · N × 3',purple,1.7);pane(d.V,4.5,'V · N × 3',mint,1.7);
      [[-1.5,blue,'WQ'],[1.5,purple,'WK'],[4.5,mint,'WV']].forEach(([x,c,name],i)=>{
        const yy=-.25-i*.23;route([[-4.7,.18,.25],[-4.7,yy,.25],[x,yy,.25],[x,.2,.25]],c);label(`${name} · 6 × 3`,x,-1.7,0,2.8,'#8ba8c6',22);
      });
    }else if(op===1){
      pane([d.Q[q]],-4.4,'qᵢ · 1 × 3',blue,2.2);
      tensor(d.K[0].map((_,j)=>d.K.map(row=>row[j])),0,1.8,0,3,2,'Kᵀ · 3 × N',purple);
      pane(d.scores,4.1,'S · N × N',blue,2.8);
      route([[-3.2,1.8,.3],[-1.6,1.8,.3]]);route([[1.6,1.8,.3],[2.6,1.8,.3]]);
      label('÷ √3',2.1,2.6,.2,1.1,'#ffd16a',24);
      label(t('Cada celda: qᵢ · kⱼ','Each cell: qᵢ · kⱼ'),0,-1.7,0,8,'#98aec8',24);
    }else if(op===2){
      pane(d.masked,-3.1,'S + M',blue,4);pane(d.A,3.1,'A · softmax',mint,4,{probability:true,future:true});
      route([[-.9,1.8,.25],[.9,1.8,.25]]);label('softmax',0,2.5,.2,1.7,'#ffd16a',22);
      label(t('× = −∞ · futuro bloqueado','× = −∞ · future blocked'),-3.1,-1.7,0,4.8,'#98aec8',23);label('Σ Aᵢⱼ = 1',3.1,-1.7,0,4,'#9cebd7',26);
    }else if(op===3){
      pane(d.A,-4.2,'A · N × N',mint,2.8,{probability:true,future:true});pane(d.V,0,'V · N × 3',mint,2);pane(d.mixed,4.2,'Z = AV · N × 3',blue,2.3);
      const yy=1.8+1.5-(q+.5)*3/tokens.length;
      d.A[q].forEach((weight,j)=>{if(weight>0){const yj=3.3-(j+.5)*3/tokens.length;route([[-2.7,yy,.22],[-1.1,yj,.22]],gold,weight);route([[1.1,yj,.22],[2.9,yy,.22]],gold,weight);}});
      label(t('Pulso mayor = mayor coeficiente Aᵢⱼ','Larger pulse = larger coefficient Aᵢⱼ'),0,-1.7,0,10,'#98aec8',23);
    }else{
      pane(d.X,-4.8,'X',blue,1.7);pane(d.projected,-2.4,'ZWO',purple,1.7);pane(d.H,0,'H · Add & Norm',blue,1.7);pane(d.hidden,2.4,'ReLU(HW₁)',purple,1.7);pane(d.Y,4.8,'Y · W₂ + Add & Norm',mint,1.7);
      route([[-1.45,1.5,.2],[-.95,1.5,.2]]);route([[.95,1.5,.2],[1.45,1.5,.2]]);route([[3.35,1.5,.2],[3.85,1.5,.2]]);
      route([[-4.8,3.5,-.2],[-4.8,4.05,-.2],[0,4.05,-.2],[0,3.5,0]]);route([[0,.1,-.2],[0,-.45,-.2],[4.8,-.45,-.2],[4.8,.1,0]]);
      label(t('Suma residual · normalización · red por posición','Residual addition · normalization · per-position network'),0,-1.7,0,11,'#98aec8',24);
    }
  }
  function clear(){content.clear();interactive=[];movers=[];for(const x of resources)x.dispose();resources.clear();for(const x of labelTextures)x.dispose();labelTextures.clear();}
  function base(title,subtitle){box(0,-.12,0,10,.16,8.5,0x15283e);const matrix=phase===3||phase===4;label(title,0,matrix?3:5.4,matrix?-4.9:-1,8,'#cfe7ff',32);label(subtitle,0,.05,4.5,8,'#8ba7c7',23);}
  function build(run,p,selectedToken,queryIndex){
    clear();phase=p;
    ground.position.y=p===3||p===4?-2.15:-.26;grid.position.y=ground.position.y+.02;
    if(p===0){
      base(t('01  ·  CONTEXTO DE ENTRADA','01  ·  INPUT CONTEXT'),t('Instrucciones + conversación + pregunta','Instructions + conversation + question'));
      card(t('INSTRUCCIONES · Responde brevemente','INSTRUCTIONS · Answer briefly'),0,3.9,-1.4,7,1,0x233f65);
      card(run.data.history||t('Sin conversación anterior','No earlier conversation'),0,2.6,0,7,1,0x21413f);
      card(run.data.question,0,1.1,1.6,8,1.6,0x314872);
      route([[4,3.9,-1.4],[4.6,3.9,-1.4],[4.6,1.1,1.6],[3.8,1.1,1.6]]);
    }else if(p===1){
      base(t('02  ·  FUENTES EXTERNAS','02  ·  EXTERNAL SOURCES'),t('Texto al contexto · los pesos no cambian','Text enters context · weights do not change'));
      for(let i=2;i>=0;i--)box(-2,1+i*.25,-.4-i*.6,3,.2,3,run.data.source?0x365668:0x253243);
      card(run.data.source?.title||t('Sin documento recuperado','No retrieved document'),0,3.8,0,8,1,0x28485b);
      card(run.data.source?.text||t('El modelo continúa sin evidencia externa.','The model continues without external evidence.'),0,2,1.8,8,1.7,0x213448);
      label(run.data.source?'＋  CONTEXT':t('BÚSQUEDA DESACTIVADA','RETRIEVAL DISABLED'),2,.7,2.5,4,'#8de7d0',24);
      route(run.data.source?[[-2,1.6,-.4],[-3.7,1.6,-.4],[-3.7,2,1.8],[-3.2,2,1.8]]:[[-4,.5,3.2],[4,.5,3.2]]);
    }else if(p===2){
      base(t('03  ·  PIEZAS DEL TEXTO','03  ·  TEXT PIECES'),t('Muestra de 12 tokens · pulsa un bloque · ␠ = espacio','12-token sample · select a block · ␠ = space'));
      const start=Math.max(0,Math.min(selectedToken-5,run.tokens.length-12));
      run.tokens.slice(start,start+12).forEach((token,i)=>{const index=start+i,x=(i%4-1.5)*2.2,z=(Math.floor(i/4)-1)*2.1;
        box(x,.45,z,1.95,.55,1.45,index===selectedToken?gold:0x284768,{kind:'token',index,text:`${piece(token)} · ID ${run.tokenIds[index]}`});
        label(piece(token),x,1,z,1.9,'#eef6ff',36);label('ID '+run.tokenIds[index],x,.25,z+.7,1.8,'#8cb4de',23);
      });
      route([[-4.3,.12,-3.3],[-4.3,.12,3.3],[4.3,.12,3.3]]);
    }else if(p===3){
      const start=Math.max(0,Math.min(selectedToken-2,run.tokens.length-6)),tokens=run.tokens.slice(start,start+6),row=selectedToken-start;
      box(0,-2,0,13,.1,6,0x102238);
      label(t('04 · LOOKUP + POSICIÓN','04 · LOOKUP + POSITION'),0,4.7,0,10,'#d5e7fc',28);
      tensor(tokens.map(embedding),-4,1.8,0,3,3,'E[token ID]',blue,row);
      tensor(tokens.map((_,i)=>positionEncoding(start+i)),0,1.8,0,2.4,3,t('Posición P','Position P'),purple,row);
      tensor(tokens.map((token,i)=>vector(token,start+i)),4,1.8,0,3,3,'X = E + P',blue,row);
      route([[-2.4,1.8,.2],[-1.4,1.8,.2]]);route([[1.4,1.8,.2],[2.4,1.8,.2]]);
      label('+',-1.9,2.6,.2,1,'#ffd16a',32);label('=',1.9,2.6,.2,1,'#ffd16a',32);
      label(`${piece(run.tokens[selectedToken])} · ID ${run.tokenIds[selectedToken]} · ${t('fila activa','active row')}`,0,-.8,0,10,'#ffd16a',26);
      label(t('6 dimensiones · valores sintéticos · filas = tokens','6 dimensions · synthetic values · rows = tokens'),0,-1.5,0,11,'#8ba8c6',23);
    }else if(p===4){
      layerScene(run,queryIndex);
    }else if(p===5){
      base(t('06  ·  DISTRIBUCIÓN DEL SIGUIENTE TOKEN','06  ·  NEXT TOKEN DISTRIBUTION'),t('Softmax · las probabilidades suman 100 %','Softmax · probabilities add up to 100%'));
      const c=nextCandidates(run),ps=softmax(c.logits,run.options.temperature);
      label(t('Logits didácticos → softmax','Teaching logits → softmax'),0,3.8,-2.5,7,'#ffd16a',26);
      ps.forEach((p,i)=>{const x=(i-(ps.length-1)/2)*2.8,h=.14+p*3.5;
        box(x,h/2,0,1.5,h,1.5,i===ps.indexOf(Math.max(...ps))?mint:blue,{kind:'probability',text:`${piece(c.pieces[i])} · ${format(p*100,1)} % · ${t('probabilidad de texto, no de verdad','text probability, not truth')}`});
        label(format(p*100,1)+' %',x,h+.7,0,2.5,'#ddf7f0',34,true);label(piece(c.pieces[i]),x,.45,2.2,2.5,'#d3e6fc',36);
        route([[0,3.1,-2.5],[x,3.1,-1.5],[x,h+.13,0]],gold,p);
      });
    }else if(p===6){
      base(t('07  ·  UN SOLO TOKEN','07  ·  ONE TOKEN ONLY'),t('La pieza se emite al avanzar · después se recalcula','The piece is emitted on advance · then recompute'));
      const token=pendingToken(run);box(0,.5,0,4,1,3,0x246075,{kind:'pending',text:t('Siguiente pieza al emitir: ','Next piece to emit: ')+piece(token)},{emissive:0x124b51,emissiveIntensity:.8});
      label(piece(token),0,2.2,0,6,'#aaf6df',55);
      label(run.options.decoding==='greedy'?t('ELECCIÓN MÁXIMA','GREEDY CHOICE'):t('MUESTREO','SAMPLING'),0,3.65,-.2,6,'#93b3d0',25);
      const c=nextCandidates(run);c.pieces.forEach((p,i)=>label(piece(p),(i-1)*2.4,.5,2.8,2,'#8eafc8',28));
      c.pieces.forEach((candidate,i)=>{if(candidate===token)route([[(i-1)*2.4,.8,2.8],[0,1.15,.8]]);});
    }else{
      base(run.done?t('08  ·  FIN DE SECUENCIA','08  ·  END OF SEQUENCE'):t('08  ·  EL BUCLE AUTOREGRESIVO','08  ·  THE AUTOREGRESSIVE LOOP'),t('Pregunta + lo escrito → siguiente token · pesos fijos','Question + generated text → next token · fixed weights'));
      box(-2.8,.7,0,2.8,1.4,2.1,0x264967);label(t('CONTEXTO','CONTEXT'),-2.8,1.9,0,2.6,'#c6dcf7',29);
      box(2.8,.7,0,2.8,1.4,2.1,0x246657);label(run.done?'EOS':piece(run.generated.at(-1)??'?'),2.8,1.9,0,2.6,'#b2f6df',39);
      const path=f=>new THREE.Vector3(Math.cos(f*Math.PI*2)*3.3,.5,Math.sin(f*Math.PI*2)*2.6);
      line(Array.from({length:97},(_,i)=>path(i/96).toArray()));if(!run.done)route([[2.8,1.1,1.3],[2.8,1.1,2.1],[-2.8,1.1,2.1],[-2.8,1.1,1.3]]);
      label(t('Caché KV: se reutilizan claves y valores anteriores','KV cache: previous keys and values can be reused'),0,4.5,-.5,9,'#98aec8',23);
      label(t('1 token nuevo → otro cálculo','1 new token → another computation'),0,3.75,-.5,7,'#acc6e0',28);
      card(run.generated.join('')||'…',0,.7,3,8,1,0x1c3149);
    }
  }
  function cameraPosition(){const tensorView=phase===3||phase===4,distance=(tensorView?12.8:19.5)*Math.max(1,(tensorView?1.85:1.15)/(width/height))*zoom;target.y=tensorView?1.4:1.1;camera.position.set(target.x+Math.sin(yaw)*Math.cos(pitch)*distance,target.y+Math.sin(pitch)*distance,target.z+Math.cos(yaw)*Math.cos(pitch)*distance);camera.lookAt(target);}
  function resize(){width=Math.max(1,host.clientWidth);height=Math.max(1,host.clientHeight);renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();cameraPosition();}
  const observer=new ResizeObserver(resize);observer.observe(host);
  let down=null;
  function pointerDown(e){down={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false};canvas.setPointerCapture(e.pointerId);}
  function pointerMove(e){if(!down)return;const dx=e.clientX-down.lastX,dy=e.clientY-down.lastY;if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)down.moved=true;yaw-=dx*.008;pitch=THREE.MathUtils.clamp(pitch+dy*.006,.18,1.35);down.lastX=e.clientX;down.lastY=e.clientY;cameraPosition();}
  function pointerUp(e){if(!down)return;const click=!down.moved;down=null;if(!click)return;const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(interactive)[0];if(hit)onSelect(hit.object.userData);}
  function wheel(e){e.preventDefault();zoom=THREE.MathUtils.clamp(zoom*Math.exp(e.deltaY*.001),.65,1.8);cameraPosition();}
  function key(e){if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','+','-','='].includes(e.key)){e.preventDefault();if(e.key==='Home')reset();if(e.key==='ArrowLeft')yaw-=.12;if(e.key==='ArrowRight')yaw+=.12;if(e.key==='ArrowUp')pitch=Math.min(1.35,pitch+.1);if(e.key==='ArrowDown')pitch=Math.max(.18,pitch-.1);if(e.key==='+'||e.key==='=')zoom=Math.max(.65,zoom*.9);if(e.key==='-')zoom=Math.min(1.8,zoom*1.1);cameraPosition();}}
  canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',()=>{down=null;});canvas.addEventListener('wheel',wheel,{passive:false});canvas.addEventListener('keydown',key);
  function reset(){yaw=.15;pitch=phase===3||phase===4?.23:.72;zoom=1;cameraPosition();}
  function update(run,p,selectedToken=0,queryIndex=7){
    current={run,p,selectedToken,queryIndex};
    const next=JSON.stringify([p,run.prompt,run.generated,run.done,run.options.temperature,run.options.decoding,run.seed,selectedToken,queryIndex]);
    if(next!==signature){signature=next;const changed=p!==phase;if(changed)flow={index:0,progress:0};build(run,p,selectedToken,queryIndex);if(changed)reset();}
  }
  function render(dt=0,nextFlow=flow){
    if(disposed)return;
    const changed=nextFlow.index!==flow.index;flow=nextFlow;
    if(changed&&phase===4&&current)build(current.run,current.p,current.selectedToken,current.queryIndex);
    for(const {ball,path} of movers)ball.position.copy(path(Math.min(.999,flow.progress)));
    renderer.render(scene,camera);
  }
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();onSelect({kind:'error',text:t('Se perdió el contexto 3D. Recarga la página; el texto y el audio siguen disponibles.','3D context lost. Reload the page; text and audio remain available.')});});
  resize();
  return {update,render,reset,zoom(delta){zoom=THREE.MathUtils.clamp(zoom*delta,.65,1.8);cameraPosition();},dispose(){disposed=true;observer.disconnect();clear();ground.geometry.dispose();ground.material.dispose();grid.geometry.dispose();grid.material.dispose();renderer.dispose();canvas.remove();}};
}
