import * as THREE from '../vendor/three.module.js';
import {createStageKit,createAtmosphere,createPost,pointScaleFor,adaptiveScale} from './stage.js';

// Camera framing per stage: content width/height in world units, plus a gentle default angle.
const VIEWS=[{t:[0,2.35,0],w:12,h:6.2,yaw:-.1,pitch:.2},{t:[0,2.1,0],w:12.4,h:6,yaw:.12,pitch:.24},{t:[0,2.2,0],w:13.4,h:6.2,yaw:0,pitch:.16},{t:[0,1.9,0],w:13.4,h:6.4,yaw:0,pitch:.1},{t:[0,2,0],w:14,h:6.8,yaw:0,pitch:.1},{t:[0,2.2,0],w:12.2,h:6.8,yaw:-.08,pitch:.2},{t:[0,2.2,0],w:11.5,h:6.2,yaw:0,pitch:.5},{t:[0,2.3,0],w:13,h:6.6,yaw:0,pitch:.3}];

export function createWorld(host,{language='es',onSelect=()=>{}}={}){
  const es=language==='es',t=(a,b)=>es?a:b;
  const reduce=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;
  const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'});
  let dpr=Math.min(globalThis.devicePixelRatio||1,1.75);renderer.setPixelRatio(dpr);
  const quality=adaptiveScale(dpr,{min:.7,apply(scale){dpr=scale;renderer.setPixelRatio(dpr);resize();}});
  host.prepend(renderer.domElement);const canvas=renderer.domElement;
  canvas.setAttribute('aria-label',t('Modelo 3D interactivo. Arrastra para girar. Selecciona tokens o celdas para leer sus valores. Flechas para girar, más y menos para acercar.','Interactive 3D model. Drag to orbit. Select tokens or cells to read values. Arrow keys rotate; plus and minus zoom.'));canvas.tabIndex=0;

  const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x050b16,.022);
  const camera=new THREE.PerspectiveCamera(34,1,.1,260);
  scene.add(new THREE.HemisphereLight(0x9fc3ff,0x070b14,1.15));
  const key=new THREE.DirectionalLight(0xf1f5ff,1.7);key.position.set(4,9,8);scene.add(key);
  const rim=new THREE.DirectionalLight(0x4f7dff,2.4);rim.position.set(-8,5,-9);scene.add(rim);
  const warm=new THREE.PointLight(0xffb45a,0,14,1.6);scene.add(warm);
  const post=createPost(renderer,scene,camera),pointScale={value:400},atmosphere=createAtmosphere(scene,{pointScale});
  const kit=createStageKit({es,reduce,pointScale,light:warm});

  let active=null,leaving=[],phase=-1,op=0,signature='',current=null,disposed=false,time=0;
  const cam={yaw:0,pitch:.3,dist:16,target:new THREE.Vector3(0,2,0)},goal={yaw:0,pitch:.3,dist:16,target:new THREE.Vector3(0,2,0)};
  let userYaw=0,userPitch=0,zoom=1,width=1,height=1,idle=0;
  function frameGoal(){const v=VIEWS[Math.max(0,phase)]??VIEWS[0],half=THREE.MathUtils.degToRad(camera.fov/2),aspect=width/height;
    const fit=Math.max((v.h/2)/Math.tan(half),(v.w/2)/(Math.tan(half)*aspect))*1.08;
    goal.dist=fit*zoom;goal.yaw=v.yaw+userYaw;goal.pitch=THREE.MathUtils.clamp(v.pitch+userPitch,-.05,1.3);goal.target.set(...v.t);}
  function show(run,p,selectedToken,queryIndex,transition){
    if(active){if(transition){kit.leave(active);leaving.push(active);}else kit.destroy(active);}
    active=kit.build(p,run,{selectedToken,queryIndex,operation:op,inPlace:!transition});active.userData.generated=run.generated.length;scene.add(active);
    if(kit.hovered?.boost)kit.hovered.mesh.material.emissiveIntensity-=kit.hovered.boost;kit.hovered=null;
  }
  function update(run,p,selectedToken=0,queryIndex=7){
    current={run,p,selectedToken,queryIndex};
    const next=JSON.stringify([p,run.prompt,run.generated,run.done,run.options.temperature,run.options.decoding,run.seed,selectedToken,queryIndex]);
    if(next===signature)return;signature=next;
    const changedPhase=p!==phase;
    if(changedPhase){phase=p;op=0;userYaw=0;userPitch=0;zoom=1;frameGoal();}
    show(run,p,selectedToken,queryIndex,changedPhase||(p===7&&run.generated.length!==active?.userData.generated));
  }
  function cameraApply(dt){
    const k=1-Math.exp(-dt*(reduce?30:3.2));
    cam.yaw+=(goal.yaw-cam.yaw)*k;cam.pitch+=(goal.pitch-cam.pitch)*k;cam.dist+=(goal.dist-cam.dist)*k;cam.target.lerp(goal.target,k);
    const sway=reduce||idle<3?0:Math.min(1,(idle-3)/4),yaw=cam.yaw+sway*Math.sin(time*.16)*.07,pitch=cam.pitch+sway*Math.sin(time*.11)*.025;
    camera.position.set(cam.target.x+Math.sin(yaw)*Math.cos(pitch)*cam.dist,cam.target.y+Math.sin(pitch)*cam.dist,cam.target.z+Math.cos(yaw)*Math.cos(pitch)*cam.dist);camera.lookAt(cam.target);
  }
  function resize(){width=Math.max(1,host.clientWidth);height=Math.max(1,host.clientHeight);renderer.setSize(width,height,false);post.setSize(width,height,dpr);camera.aspect=width/height;camera.updateProjectionMatrix();pointScale.value=pointScaleFor(height,dpr,camera.fov);frameGoal();}
  const observer=new ResizeObserver(resize);observer.observe(host);
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  function pick(e){if(!active)return null;const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(active.userData.hits,false)[0];if(!hit)return null;
    const info=kit.pickInfo(hit);return info?{mesh:hit.object,id:hit.instanceId,info}:null;}
  let down=null;
  function pointerDown(e){down={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false};canvas.setPointerCapture(e.pointerId);idle=0;}
  function pointerMove(e){
    if(!down){const h=pick(e),old=kit.hovered;if(old?.boost)old.mesh.material.emissiveIntensity-=old.boost;kit.hovered=h;
      if(h&&h.id===undefined&&h.mesh.material.emissiveIntensity!==undefined){h.boost=.5;h.mesh.material.emissiveIntensity+=h.boost;}canvas.style.cursor=h?'pointer':'grab';return;}
    const dx=e.clientX-down.lastX,dy=e.clientY-down.lastY;if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)down.moved=true;
    userYaw-=dx*.006;userPitch=THREE.MathUtils.clamp(userPitch+dy*.005,-.4,1.1);down.lastX=e.clientX;down.lastY=e.clientY;idle=0;frameGoal();cam.yaw=goal.yaw;cam.pitch=goal.pitch;
  }
  function pointerUp(e){if(!down)return;const click=!down.moved;down=null;if(!click)return;const h=pick(e);if(h)onSelect(h.info);}
  function wheel(e){e.preventDefault();zoom=THREE.MathUtils.clamp(zoom*Math.exp(e.deltaY*.001),.55,1.8);idle=0;frameGoal();}
  function keydown(e){if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','+','-','='].includes(e.key))return;e.preventDefault();idle=0;
    if(e.key==='Home')return reset();if(e.key==='ArrowLeft')userYaw-=.12;if(e.key==='ArrowRight')userYaw+=.12;if(e.key==='ArrowUp')userPitch=Math.min(1.1,userPitch+.08);if(e.key==='ArrowDown')userPitch=Math.max(-.4,userPitch-.08);if(e.key==='+'||e.key==='=')zoom=Math.max(.55,zoom*.9);if(e.key==='-')zoom=Math.min(1.8,zoom*1.1);frameGoal();}
  canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',()=>{down=null;});
  canvas.addEventListener('pointerleave',()=>{if(kit.hovered?.boost)kit.hovered.mesh.material.emissiveIntensity-=kit.hovered.boost;kit.hovered=null;});
  canvas.addEventListener('wheel',wheel,{passive:false});canvas.addEventListener('keydown',keydown);
  function reset(){userYaw=0;userPitch=0;zoom=1;idle=0;frameGoal();}

  // live: narration (or a manual operation) drives reveals; otherwise each stage plays on its own clock.
  function render(dt=0,flow={index:0,progress:0},{live=true}={}){
    if(disposed)return;
    time+=dt;idle+=dt;kit.advance(dt);
    if(phase===4&&current&&flow.index!==op){op=flow.index;const {run,p,selectedToken,queryIndex}=current;show(run,p,selectedToken,queryIndex,true);}
    for(const set of leaving)if(kit.fade(set,dt)){kit.destroy(set);set.userData.gone=true;}
    leaving=leaving.filter(s=>!s.userData.gone);
    if(active)kit.tick(active,{dt,sig:live?Math.max(0,Math.min(1,flow.progress)):1,live});
    if(phase!==6)warm.intensity=0;
    atmosphere.update(time);cameraApply(dt);post.render(dt);quality.frame(dt);
  }
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();onSelect({kind:'error',text:t('Se perdió el contexto 3D. Recarga la página; el texto y el audio siguen disponibles.','3D context lost. Reload the page; text and audio remain available.')});});
  resize();cam.dist=goal.dist*1.25;cam.pitch=goal.pitch+.25;
  return {update,render,reset,zoom(delta){zoom=THREE.MathUtils.clamp(zoom*delta,.55,1.8);idle=0;frameGoal();},dispose(){disposed=true;observer.disconnect();for(const s of [active,...leaving])if(s)kit.destroy(s);kit.dispose();atmosphere.dispose();post.dispose();renderer.dispose();canvas.remove();}};
}
