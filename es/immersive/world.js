import * as THREE from '../../vendor/three.module.js';
import {STOPS} from './model.js';
import {contextWindow,transformerTrace,embedding,positionEncoding,vector,nextCandidates,softmax,pendingToken} from '../llms/model.js';
const BLUE=0x8dbdff,MINT=0x9cf0c8,GOLD=0xffd780,PURPLE=0xb8a5ff;
const visible=x=>x==='<EOS>'?'EOS':/^\s+$/.test(x)?'␠':x;
export function createExperience(host,{es,onInspect}){
  const t=(a,b)=>es?a:b,renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0x071520);renderer.toneMapping=THREE.ACESFilmicToneMapping;
  const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label',t('Mundo 3D. WASD para caminar, arrastra para mirar, pulsa objetos para inspeccionarlos.','3D world. WASD to walk, drag to look, select objects to inspect.'));host.append(canvas);
  const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x071520,.018);scene.add(new THREE.HemisphereLight(0xc9f4ff,0x162430,2.5));
  const light=new THREE.DirectionalLight(0xf0f8ff,3);light.position.set(5,12,10);scene.add(light);
  const camera=new THREE.PerspectiveCamera(68,1,.08,180);camera.rotation.order='YXZ';
  const staticGroup=new THREE.Group(),exhibits=new THREE.Group();scene.add(staticGroup,exhibits);
  let clickables=[],dynamicResources=[],fixedResources=[],active=0,lastSignature='',groups=[],signalPaths=[],layerNodes=[];
  function own(obj,list){list.push(obj);return obj;}
  function box(parent,x,y,z,w,h,d,color,info=null){const list=parent===staticGroup?fixedResources:dynamicResources;const m=new THREE.Mesh(own(new THREE.BoxGeometry(w,h,d),list),own(new THREE.MeshStandardMaterial({color,roughness:.38,metalness:.28}),list));m.position.set(x,y,z);parent.add(m);if(info){m.userData=info;clickables.push(m);}return m;}
  function label(parent,text,x,y,z,w=5,color='#d6edff',fixed=false){
    const list=fixed?fixedResources:dynamicResources,c=document.createElement('canvas'),ctx=c.getContext('2d');ctx.font='600 50px system-ui';c.width=Math.ceil(ctx.measureText(text).width+32);c.height=86;ctx.font='600 50px system-ui';ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,c.width/2,43);
    const texture=own(new THREE.CanvasTexture(c),list);texture.colorSpace=THREE.SRGBColorSpace;
    const mesh=new THREE.Mesh(own(new THREE.PlaneGeometry(w,w*86/c.width),list),own(new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide,depthWrite:false}),list));mesh.position.set(x,y,z);parent.add(mesh);return mesh;
  }
  function line(parent,points,color=GOLD,fixed=false){const list=fixed?fixedResources:dynamicResources,g=own(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))),list);const mat=own(new THREE.LineBasicMaterial({color,transparent:true,opacity:.7}),list);parent.add(new THREE.Line(g,mat));}
  function path(parent,points,phase,color=GOLD){line(parent,points,color);const curve=new THREE.CurvePath();for(let i=1;i<points.length;i++)curve.add(new THREE.LineCurve3(new THREE.Vector3(...points[i-1]),new THREE.Vector3(...points[i])));const ball=new THREE.Mesh(own(new THREE.SphereGeometry(.11,12,8),dynamicResources),own(new THREE.MeshBasicMaterial({color:GOLD}),dynamicResources));parent.add(ball);signalPaths.push({ball,curve,phase});}
  function tensor(parent,data,x,y,z,w,h,name,color=BLUE,phase=3,causal=false){
    const rows=data.length,cols=data[0].length;label(parent,name,x,y+h/2+.35,z,w+1);
    data.forEach((row,i)=>row.forEach((v,j)=>{const blocked=causal&&j>i,c=new THREE.Color(blocked?0x172737:v<0?0xffb791:color);c.multiplyScalar(blocked?1:.38+Math.min(1,Math.abs(v))*.62);
      const m=box(parent,x-w/2+(j+.5)*w/cols,y+h/2-(i+.5)*h/rows,z,w/cols*.86,h/rows*.83,.15,c,{phase,text:`${name} [${i+1},${j+1}] = ${blocked?'0':v.toFixed(3)}`});
      if(i===rows-1){m.material.emissive.setHex(GOLD);m.material.emissiveIntensity=.2;}
    }));label(parent,`${rows} × ${cols}`,x,y-h/2-.3,z,w*.65,'#8aaec4');
  }
  box(staticGroup,-2.7,-.12,-48,16,.2,124,0x10232e);
  box(staticGroup,-10.6,3.3,-48,.2,7,124,0x132b39);box(staticGroup,5.4,1.4,-48,.2,2.8,124,0x102331);
  for(let z=10;z>=-106;z-=2){line(staticGroup,[[-10,.01,z],[5,.01,z]],0x234251,true);}
  for(let x=-10;x<=5;x+=1.5)line(staticGroup,[[x,.01,11],[x,.01,-108]],0x1c3545,true);
  for(const s of STOPS){
    box(staticGroup,-5.6,.13,s.z,7,.25,11,0x1c3542);box(staticGroup,4.8,3.4,s.z,.22,6.8,.22,0x2b4e61);box(staticGroup,-2.8,6.8,s.z,15,.15,.2,0x315366);
    const sign=new THREE.Group();sign.position.set(-5.8,0,s.z);sign.rotation.y=Math.PI/2;staticGroup.add(sign);label(sign,`${String(s.index+1).padStart(2,'0')} / ${s.titles[es?0:1]}`,0,5,0,8,'#d0efed',true);
    const lamp=new THREE.PointLight(s.index===4?PURPLE:MINT,15,16,2);lamp.position.set(-3,4,s.z);staticGroup.add(lamp);
    line(staticGroup,[[1,.03,s.z+5],[1,.03,s.z-5]],GOLD,true);
  }
  function rebuild(run){
    exhibits.clear();dynamicResources.forEach(r=>r.dispose());dynamicResources=[];clickables=[];signalPaths=[];groups=[];layerNodes=[];
    const {tokens,offset}=contextWindow(run),trace=transformerTrace(tokens,offset);
    STOPS.forEach(s=>{const g=new THREE.Group();g.position.set(s.x,0,s.z);g.rotation.y=Math.PI/2;exhibits.add(g);groups.push(g);});
    const g=groups;
    [[t('INSTRUCCIONES','INSTRUCTIONS'),t('Responde brevemente.','Answer briefly.')],[t('CONVERSACIÓN','CONVERSATION'),run.data.history||t('Sin mensajes anteriores','No previous messages')],[t('PREGUNTA','QUESTION'),run.data.question]].forEach(([title,text],i)=>{
      box(g[0],0,3.4-i*1.15,-.3,7,.85,.2,0x254b60,{phase:0,text});label(g[0],title,-2.1,3.6-i*1.15,0,2,'#9feacc');label(g[0],text,0,3.2-i*1.15,0,6.4);
    });path(g[0],[[3.7,3.4,0],[4,3.4,0],[4,1.1,0],[3.4,1.1,0]],0);
    for(let i=0;i<4;i++)box(g[1],-2,.7+i*.45,-i*.15,2.4,.12,2,0x44647b,{phase:1,text:t('Documento externo: se añade al contexto, no a los pesos.','External document: added to context, not weights.')});
    label(g[1],run.data.source?.title||t('SIN FUENTE EXTERNA','NO EXTERNAL SOURCE'),0,3.3,0,7);
    label(g[1],run.data.source?.text||t('Esta pregunta usa patrones aprendidos.','This question uses learned patterns.'),0,2.6,0,8);
    box(g[1],2,1,0,2,1.8,.5,0x235344);label(g[1],t('CONTEXTO','CONTEXT'),2,2.1,.3,2.3);path(g[1],[[-1,1.2,.7],[1,1.2,.7]],1);
    run.tokens.slice(-12).forEach((token,i)=>{const x=(i%4-1.5)*2,z=(Math.floor(i/4)-1)*.6,y=3.7-Math.floor(i/4)*1.2;box(g[2],x,y,z,1.7,.7,.5,0x355775,{phase:2,text:`${visible(token)} · ID ${run.tokenIds[Math.max(0,run.tokens.length-12)+i]}`});label(g[2],visible(token),x,y,z+.28,1.4);});
    path(g[2],[[-3,4.3,0],[3,4.3,0],[3,.5,1],[-3,.5,1]],2);
    const sample=tokens.slice(-4),start=offset+tokens.length-sample.length;
    tensor(g[3],sample.map(embedding),-3,2,0,2.4,2.5,'E[token ID]');tensor(g[3],sample.map((_,i)=>positionEncoding(start+i)),0,2,0,2,2.5,t('Posición','Position'),PURPLE);tensor(g[3],sample.map((v,i)=>vector(v,start+i)),3,2,0,2.4,2.5,'X = E + P');path(g[3],[[-1.6,2,.3],[-1.1,2,.3]],3);path(g[3],[[1.1,2,.3],[1.6,2,.3]],3);
    [['Q',trace.Q,BLUE],['K',trace.K,PURPLE],['V',trace.V,MINT]].forEach(([name,data,c],i)=>tensor(g[4],data,-3.5+i*1.3,3.1,-.5,1,1.9,name,c,4));
    tensor(g[4],trace.A,1.2,3.1,-.5,2.4,1.9,'A · mask + softmax',MINT,4,true);tensor(g[4],trace.Y,3.7,3.1,-.5,1.5,1.9,'Y',BLUE,4);
    ['XW','QKᵀ / √3','mask → softmax','AV','Add / Norm / FFN'].forEach((name,i)=>{const x=-3.6+i*1.8;layerNodes.push(box(g[4],x,.65,.4,1.55,.65,.9,i===4?0x3b5550:0x314463,{phase:4,text:name}));label(g[4],name,x,1.2,1,1.6,'#f9d79c');path(g[4],[[x-.7,1.7,.8],[x+.7,1.7,.8],[x+.7,2,.1]],4);signalPaths.at(-1).operation=i;});
    label(g[4],t('Una cabeza · pesos sintéticos · 8 tokens','One head · synthetic weights · 8 tokens'),0,.22,1.4,8,'#9ab9ce');
    const candidates=nextCandidates(run),ps=softmax(candidates.logits,run.options.temperature);
    ps.forEach((p,i)=>{const x=(i-(ps.length-1)/2)*2.7,h=.2+p*3;box(g[5],x,.25+h/2,0,1.6,h,1.6,i===0?MINT:BLUE,{phase:5,text:`${visible(candidates.pieces[i])} · ${(p*100).toFixed(1)}%`});label(g[5],`${(p*100).toFixed(1)} %`,x,h+.8,1,2);label(g[5],visible(candidates.pieces[i]),x,.45,1.2,2);path(g[5],[[0,4.3,0],[x,4.3,0],[x,h+.3,.8]],5);});
    label(g[5],t('Logits preparados · no son medidas de un LLM','Curated logits · not measurements from an LLM'),0,.1,2,8,'#9ab9ce');
    box(g[6],0,1.6,0,3.2,2.3,1,MINT,{phase:6,text:t('Al avanzar se añade exactamente una pieza.','Advancing adds exactly one piece.')});label(g[6],visible(pendingToken(run)),0,1.9,.6,2.6,'#06291f');label(g[6],t('UN TOKEN','ONE TOKEN'),0,3.6,.2,5);path(g[6],[[-4,1.6,1],[-2,1.6,1],[0,1.6,1]],6);
    box(g[7],-2,1.3,0,2.6,2,.8,BLUE);box(g[7],2,1.3,0,2.6,2,.8,MINT);label(g[7],t('CONTEXTO','CONTEXT'),-2,2.8,0,2.6);label(g[7],run.done?'EOS':visible(run.generated.at(-1)||'…'),2,1.6,.5,2,'#06291f');path(g[7],[[2,.5,1],[2,.5,2],[-2,.5,2],[-2,.5,1]],7);
    label(g[7],run.generated.join('')||t('La respuesta crece pieza a pieza','The answer grows piece by piece'),0,3.8,.2,8);
    label(g[7],t('Caché KV: reutilizar claves y valores','KV cache: reuse keys and values'),0,.2,2.5,7,'#9ab9ce');
  }
  function update(run){const signature=JSON.stringify([run.prompt,run.generated,run.done,run.options.temperature]);if(signature!==lastSignature){lastSignature=signature;rebuild(run);}active=run.phase;}
  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
  function inspect(x,y){const rect=canvas.getBoundingClientRect();pointer.set((x-rect.left)/rect.width*2-1,1-(y-rect.top)/rect.height*2);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(clickables)[0];if(hit&&hit.distance<20)onInspect(hit.object.userData);}
  function resize(){renderer.setSize(host.clientWidth,host.clientHeight,false);camera.aspect=host.clientWidth/Math.max(1,host.clientHeight);camera.fov=Math.min(118,2*Math.atan(Math.tan(34*Math.PI/180)/Math.min(1,camera.aspect/1.5))*180/Math.PI);camera.updateProjectionMatrix();}
  const observer=new ResizeObserver(resize);observer.observe(host);resize();
  return {canvas,update,inspect,render(player,dt,progress,running,cue={index:0,progress:0}){
    camera.position.set(player.x,1.65,player.z);camera.rotation.set(player.pitch,player.yaw,0,'YXZ');
    layerNodes.forEach((mesh,i)=>{mesh.material.emissive.setHex(GOLD);mesh.material.emissiveIntensity=active===4&&i===cue.index?.6:0;});
    signalPaths.forEach(({ball,curve,phase,operation})=>{ball.visible=phase===active&&(operation===undefined||operation===cue.index);ball.position.copy(curve.getPoint(Math.max(0,Math.min(.999,operation===undefined?progress:cue.progress))));});renderer.render(scene,camera);
  },dispose(){observer.disconnect();dynamicResources.concat(fixedResources).forEach(r=>r.dispose());renderer.dispose();canvas.remove();}};
}
