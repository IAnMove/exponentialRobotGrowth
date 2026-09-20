import * as THREE from '../../vendor/three.module.js';
import {vector,attention,softmax,nextCandidates,pendingToken} from './model.js';

const ink=0xc9e5ff,blue=0x78aaff,mint=0x79e1ca,amber=0xffb58b;
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
  const content=new THREE.Group();scene.add(content);let interactive=[],movers=[],signature='',phase=0,clock=0,disposed=false,active=true;
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
  function particle(path,color=mint){const geo=new THREE.SphereGeometry(.12,16,12);resources.add(geo);const ball=new THREE.Mesh(geo,material(color,{emissive:color,emissiveIntensity:1.2}));content.add(ball);movers.push({ball,path});}
  function clear(){content.clear();interactive=[];movers=[];for(const x of resources)x.dispose();resources.clear();for(const x of labelTextures)x.dispose();labelTextures.clear();}
  function base(title,subtitle){box(0,-.12,0,10,.16,8.5,0x15283e);const matrix=phase===3||phase===4;label(title,0,matrix?3:5.4,matrix?-4.9:-1,8,'#cfe7ff',32);label(subtitle,0,.05,4.5,8,'#8ba7c7',23);}
  function build(run,p,selectedToken,queryIndex){
    clear();phase=p;
    if(p===0){
      base(t('01  ·  CONTEXTO DE ENTRADA','01  ·  INPUT CONTEXT'),t('Instrucciones + conversación + pregunta','Instructions + conversation + question'));
      card(t('INSTRUCCIONES · Responde brevemente','INSTRUCTIONS · Answer briefly'),0,3.9,-1.4,7,1,0x233f65);
      card(run.data.history||t('Sin conversación anterior','No earlier conversation'),0,2.6,0,7,1,0x21413f);
      card(run.data.question,0,1.1,1.6,8,1.6,0x314872);
      particle(f=>new THREE.Vector3(-4+f*8,.3,3.5));
    }else if(p===1){
      base(t('02  ·  FUENTES EXTERNAS','02  ·  EXTERNAL SOURCES'),t('Texto al contexto · los pesos no cambian','Text enters context · weights do not change'));
      for(let i=2;i>=0;i--)box(-2,1+i*.25,-.4-i*.6,3,.2,3,run.data.source?0x365668:0x253243);
      card(run.data.source?.title||t('Sin documento recuperado','No retrieved document'),0,3.8,0,8,1,0x28485b);
      card(run.data.source?.text||t('El modelo continúa sin evidencia externa.','The model continues without external evidence.'),0,2,1.8,8,1.7,0x213448);
      label(run.data.source?'＋  CONTEXT':t('BÚSQUEDA DESACTIVADA','RETRIEVAL DISABLED'),2,.7,2.5,4,'#8de7d0',24);
    }else if(p===2){
      base(t('03  ·  PIEZAS DEL TEXTO','03  ·  TEXT PIECES'),t('Muestra de 12 tokens · pulsa un bloque · ␠ = espacio','12-token sample · select a block · ␠ = space'));
      const start=Math.max(0,Math.min(selectedToken-5,run.tokens.length-12));
      run.tokens.slice(start,start+12).forEach((token,i)=>{const index=start+i,x=(i%4-1.5)*2.2,z=(Math.floor(i/4)-1)*2.1;
        box(x,.45,z,1.95,.55,1.45,index===selectedToken?0x628dd0:0x284768,{kind:'token',index,text:`${piece(token)} · ID ${run.tokenIds[index]}`});
        label(piece(token),x,1,z,1.9,'#eef6ff',36);label('ID '+run.tokenIds[index],x,.25,z+.7,1.8,'#8cb4de',23);
      });
    }else if(p===3){
      base(t('04  ·  MATRIZ DE REPRESENTACIONES','04  ·  REPRESENTATION MATRIX'),t('Azul + / naranja − · altura = magnitud · 6 dimensiones de juguete','Blue + / orange − · height = magnitude · 6 toy dimensions'));
      const start=Math.max(0,Math.min(selectedToken-2,run.tokens.length-6));
      run.tokens.slice(start,start+6).forEach((token,row)=>{const index=start+row,z=(row-2.5)*1.2;
        label(piece(token),-4.15,.5,z,1.7,index===selectedToken?'#ffffff':'#9db3cb',26);
        vector(token,index).forEach((value,col)=>{const h=.16+Math.abs(value)*.7,x=(col-2.2)*1.02;
          box(x,h/2,z,.84,h,.84,value<0?amber:blue,{kind:'cell',text:`${piece(token)} · d${col+1} = ${format(value)} · ${t('valor ilustrativo','illustrative value')}`},{emissive:index===selectedToken?0x243c58:0x000000,emissiveIntensity:.4});
          label(format(value),x,h+.24,z,.9,value<0?'#ffd0b8':'#d3e6ff',22,true);
        });
      });
      for(let col=0;col<6;col++)label('d'+(col+1),(col-2.2)*1.02,.4,-4.1,1,'#90b7e6',28);
      const values=vector(run.tokens[selectedToken],selectedToken),row=selectedToken-start;
      particle(f=>{const col=Math.min(5,Math.floor(f*6));return new THREE.Vector3((col-2.2)*1.02,.65+Math.abs(values[col])*.7,(row-2.5)*1.2);});
    }else if(p===4){
      const tokens=[...run.tokens,...run.generated].filter(x=>x.trim()).slice(-8),q=Math.min(queryIndex,tokens.length-1),n=tokens.length;
      base(t('05  ·  ATENCIÓN CAUSAL','05  ·  CAUSAL ATTENTION'),t('Filas: quién consulta · columnas: a quién mira · oscuro: futuro bloqueado','Rows: query · columns: attended position · dark: future blocked'));
      tokens.forEach((token,row)=>{const {weights}=attention(tokens,row),z=(row-(n-1)/2)*.83;
        label(piece(token),-4.2,.4,z,1.5,row===q?'#ffffff':'#8ca6c0',25);
        weights.forEach((weight,col)=>{const x=(col-(n-1)/2)*.83,h=.1+weight*1.6,blocked=col>row;
          box(x,h/2,z,.68,h,.68,blocked?0x19283a:row===q?mint:0x426e9f,{kind:'attention',index:row,text:`${piece(token)} → ${piece(tokens[col])} · ${blocked?t('futuro bloqueado · 0 %','future blocked · 0%'):format(weight*100,1)+' %'}`},{emissive:row===q&&!blocked?0x174c49:0,emissiveIntensity:.45});
        });
      });
      tokens.forEach((token,col)=>label(piece(token),(col-(n-1)/2)*.83,.4,-3.9,1,'#b9d0ec',23));
      label(t('Una cabeza de juguete · no es importancia factual','One toy head · not factual importance'),0,1.9,-4.9,7,'#8dabc4',22);
      label(t('FUTURO','FUTURE'),1.65,.4,-1.8,2.3,'#829bb7',21);
      const weights=attention(tokens,q).weights;
      particle(f=>{const col=Math.min(q,Math.floor(f*(q+1)));return new THREE.Vector3((col-(n-1)/2)*.83,.5+weights[col]*1.6,(q-(n-1)/2)*.83);});
    }else if(p===5){
      base(t('06  ·  DISTRIBUCIÓN DEL SIGUIENTE TOKEN','06  ·  NEXT TOKEN DISTRIBUTION'),t('Softmax · las probabilidades suman 100 %','Softmax · probabilities add up to 100%'));
      const c=nextCandidates(run),ps=softmax(c.logits,run.options.temperature);
      ps.forEach((p,i)=>{const x=(i-(ps.length-1)/2)*2.8,h=.14+p*3.5;
        box(x,h/2,0,1.5,h,1.5,i===ps.indexOf(Math.max(...ps))?mint:blue,{kind:'probability',text:`${piece(c.pieces[i])} · ${format(p*100,1)} % · ${t('probabilidad de texto, no de verdad','text probability, not truth')}`});
        label(format(p*100,1)+' %',x,h+.7,0,2.5,'#ddf7f0',34,true);label(piece(c.pieces[i]),x,.45,2.2,2.5,'#d3e6fc',36);
      });
    }else if(p===6){
      base(t('07  ·  UN SOLO TOKEN','07  ·  ONE TOKEN ONLY'),t('La pieza se emite al avanzar · después se recalcula','The piece is emitted on advance · then recompute'));
      const token=pendingToken(run);box(0,.5,0,4,1,3,0x246075,{kind:'pending',text:t('Siguiente pieza al emitir: ','Next piece to emit: ')+piece(token)},{emissive:0x124b51,emissiveIntensity:.8});
      label(piece(token),0,2.2,0,6,'#aaf6df',55);
      label(run.options.decoding==='greedy'?t('ELECCIÓN MÁXIMA','GREEDY CHOICE'):t('MUESTREO','SAMPLING'),0,3.65,-.2,6,'#93b3d0',25);
      const c=nextCandidates(run);c.pieces.forEach((p,i)=>label(piece(p),(i-1)*2.4,.5,2.8,2,'#8eafc8',28));
      particle(f=>new THREE.Vector3(Math.cos(f*Math.PI*2)*3.3,.55,Math.sin(f*Math.PI*2)*2.5));
    }else{
      base(run.done?t('08  ·  FIN DE SECUENCIA','08  ·  END OF SEQUENCE'):t('08  ·  EL BUCLE AUTOREGRESIVO','08  ·  THE AUTOREGRESSIVE LOOP'),t('Pregunta + lo escrito → siguiente token · pesos fijos','Question + generated text → next token · fixed weights'));
      box(-2.8,.7,0,2.8,1.4,2.1,0x264967);label(t('CONTEXTO','CONTEXT'),-2.8,1.9,0,2.6,'#c6dcf7',29);
      box(2.8,.7,0,2.8,1.4,2.1,0x246657);label(run.done?'EOS':piece(run.generated.at(-1)??'?'),2.8,1.9,0,2.6,'#b2f6df',39);
      const path=f=>new THREE.Vector3(Math.cos(f*Math.PI*2)*3.3,.5,Math.sin(f*Math.PI*2)*2.6);
      line(Array.from({length:97},(_,i)=>path(i/96).toArray()));if(!run.done)particle(path);
      label(t('1 token nuevo → otro cálculo','1 new token → another computation'),0,3.75,-.5,7,'#acc6e0',28);
      card(run.generated.join('')||'…',0,.7,3,8,1,0x1c3149);
    }
  }
  function cameraPosition(){const distance=19.5*Math.max(1,.95/(width/height))*zoom;camera.position.set(target.x+Math.sin(yaw)*Math.cos(pitch)*distance,target.y+Math.sin(pitch)*distance,target.z+Math.cos(yaw)*Math.cos(pitch)*distance);camera.lookAt(target);}
  function resize(){width=Math.max(1,host.clientWidth);height=Math.max(1,host.clientHeight);renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();cameraPosition();}
  const observer=new ResizeObserver(resize);observer.observe(host);
  let down=null;
  function pointerDown(e){down={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false};canvas.setPointerCapture(e.pointerId);}
  function pointerMove(e){if(!down)return;const dx=e.clientX-down.lastX,dy=e.clientY-down.lastY;if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)down.moved=true;yaw-=dx*.008;pitch=THREE.MathUtils.clamp(pitch+dy*.006,.18,1.35);down.lastX=e.clientX;down.lastY=e.clientY;cameraPosition();}
  function pointerUp(e){if(!down)return;const click=!down.moved;down=null;if(!click)return;const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(interactive)[0];if(hit)onSelect(hit.object.userData);}
  function wheel(e){e.preventDefault();zoom=THREE.MathUtils.clamp(zoom*Math.exp(e.deltaY*.001),.65,1.8);cameraPosition();}
  function key(e){if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','+','-','='].includes(e.key)){e.preventDefault();if(e.key==='Home')reset();if(e.key==='ArrowLeft')yaw-=.12;if(e.key==='ArrowRight')yaw+=.12;if(e.key==='ArrowUp')pitch=Math.min(1.35,pitch+.1);if(e.key==='ArrowDown')pitch=Math.max(.18,pitch-.1);if(e.key==='+'||e.key==='=')zoom=Math.max(.65,zoom*.9);if(e.key==='-')zoom=Math.min(1.8,zoom*1.1);cameraPosition();}}
  canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',()=>{down=null;});canvas.addEventListener('wheel',wheel,{passive:false});canvas.addEventListener('keydown',key);
  function reset(){yaw=.15;pitch=phase===3||phase===4?1.05:.72;zoom=1;cameraPosition();}
  function update(run,p,selectedToken=0,queryIndex=7){const next=JSON.stringify([p,run.prompt,run.generated,run.done,run.options.temperature,run.options.decoding,run.seed,selectedToken,queryIndex]);if(next!==signature){signature=next;const changed=p!==phase;build(run,p,selectedToken,queryIndex);if(changed)reset();}active=run.playing;}
  function render(dt=0){if(disposed)return;if(active)clock+=dt;for(const {ball,path} of movers)ball.position.copy(path((clock*.18)%1));renderer.render(scene,camera);}
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();onSelect({kind:'error',text:t('Se perdió el contexto 3D. Recarga la página; el texto y el audio siguen disponibles.','3D context lost. Reload the page; text and audio remain available.')});});
  resize();
  return {update,render,reset,zoom(delta){zoom=THREE.MathUtils.clamp(zoom*delta,.65,1.8);cameraPosition();},dispose(){disposed=true;observer.disconnect();clear();ground.geometry.dispose();ground.material.dispose();grid.geometry.dispose();grid.material.dispose();renderer.dispose();canvas.remove();}};
}
