import * as THREE from '../../vendor/three.module.js';
import {STOPS} from './model.js';
import {createStageKit,createAtmosphere,createPost,pointScaleFor,adaptiveScale} from '../llms/stage.js';

// The walkable corridor hosts the same eight computed stages as notebook 08, one per station.
const ACCENT=[0xa184ff,0x46e0bb,0x5d8dff,0x5d8dff,0xffc35a,0x46e0bb,0xffc35a,0x4fd6c8];
const STAGE_SCALE=.48;
export function createExperience(host,{es,onInspect}){
  const t=(a,b)=>es?a:b,reduce=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;
  const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'});let dpr=Math.min(globalThis.devicePixelRatio||1,1.5);renderer.setPixelRatio(dpr);
  const quality=adaptiveScale(dpr,{min:.6,apply(scale){dpr=scale;renderer.setPixelRatio(dpr);resize();}});
  const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label',t('Mundo 3D. WASD para caminar, arrastra para mirar, pulsa objetos para inspeccionarlos.','3D world. WASD to walk, drag to look, select objects to inspect.'));host.append(canvas);
  const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x050b16,.03);
  scene.add(new THREE.HemisphereLight(0x9fc3ff,0x070b14,1.2));
  const key=new THREE.DirectionalLight(0xf1f5ff,1.6);key.position.set(9,10,4);scene.add(key);
  const rim=new THREE.DirectionalLight(0x4f7dff,2.2);rim.position.set(-10,6,-3);scene.add(rim);
  const camera=new THREE.PerspectiveCamera(68,1,.08,260);camera.rotation.order='YXZ';
  const post=createPost(renderer,scene,camera,{strength:.7,threshold:.92}),pointScale={value:400},atmosphere=createAtmosphere(scene,{pointScale,dust:700,spread:[30,9,40]});
  const kit=createStageKit({es,reduce,pointScale,labelFog:true});

  // Architecture: a platform and a light gate per station, and a gold guide line on the floor.
  const fixed=[],own=x=>{fixed.push(x);return x;},architecture=new THREE.Group();scene.add(architecture);
  const gateMaterials=[],padMaterials=[];
  const guide=new THREE.Mesh(own(new THREE.BoxGeometry(.05,.01,120)),own(new THREE.MeshBasicMaterial({color:new THREE.Color(0xffc35a).multiplyScalar(1.4),transparent:true,opacity:.55})));guide.position.set(1,.01,-48);architecture.add(guide);
  const gateGeometry=own(new THREE.TorusGeometry(7.4,.035,8,96,Math.PI)),padGeometry=own(new THREE.RingGeometry(5.9,6.05,96)),markerGeometry=own(new THREE.RingGeometry(.42,.5,48));
  for(const s of STOPS){
    const accent=new THREE.Color(ACCENT[s.index]);
    const gm=own(new THREE.MeshBasicMaterial({color:accent.clone().multiplyScalar(.6),transparent:true,opacity:.35,blending:THREE.AdditiveBlending,depthWrite:false}));gateMaterials.push(gm);
    const gate=new THREE.Mesh(gateGeometry,gm);gate.position.set(-2.4,0,s.z+7);architecture.add(gate);
    const pm=own(new THREE.MeshBasicMaterial({color:accent.clone().multiplyScalar(.8),transparent:true,opacity:.3,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));padMaterials.push(pm);
    const pad=new THREE.Mesh(padGeometry,pm);pad.rotation.x=-Math.PI/2;pad.position.set(-6.2,.02,s.z);pad.scale.set(.62,1,1);architecture.add(pad);
    const marker=new THREE.Mesh(markerGeometry,own(new THREE.MeshBasicMaterial({color:new THREE.Color(0xffc35a).multiplyScalar(1.6),transparent:true,opacity:.7,side:THREE.DoubleSide})));marker.rotation.x=-Math.PI/2;marker.position.set(0,.02,s.z);architecture.add(marker);
    const c=document.createElement('canvas'),x=c.getContext('2d');c.width=1400;c.height=260;x.textBaseline='top';
    x.font='700 54px "JetBrains Mono",ui-monospace,monospace';x.fillStyle='#'+accent.getHexString();x.fillText(`${String(s.index+1).padStart(2,'0')} / 08 · ${s.titles[es?2:3].toUpperCase()}`,8,10);
    x.font='800 108px Inter,system-ui,sans-serif';x.fillStyle='#eef4ff';x.fillText(s.titles[es?0:1],8,92);
    const texture=own(new THREE.CanvasTexture(c));texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
    const sign=new THREE.Mesh(own(new THREE.PlaneGeometry(7,1.3)),own(new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,toneMapped:false})));
    sign.position.set(-8.6,6.3,s.z);sign.rotation.y=Math.PI/2;architecture.add(sign);
  }
  let sets=[],fading=[],active=0,signature='',operation=0,lastRun=null,time=0;
  const positionSet=(set,s)=>{set.position.set(-6.3,.6,s.z-.9);set.rotation.y=Math.PI/2;set.scale.setScalar(STAGE_SCALE);set.userData.baseY=.6;};
  function rebuild(run){
    for(const set of sets)kit.destroy(set);
    sets=STOPS.map(s=>{const set=kit.build(s.index,run,{selectedToken:Math.max(0,run.tokens.length-8),queryIndex:7,operation:s.index===4?operation:0,inPlace:true});positionSet(set,s);scene.add(set);return set;});
  }
  function update(run){
    lastRun=run;const next=JSON.stringify([run.prompt,run.generated,run.done,run.options.temperature,run.options.decoding,run.seed]);
    if(next!==signature){signature=next;rebuild(run);}
    if(run.phase!==active||!sets[active].userData.arrived){active=run.phase;for(const s of sets)s.userData.arrived=false;kit.replay(sets[active]);sets[active].userData.arrived=true;}
  }
  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
  function inspect(x,y){const rect=canvas.getBoundingClientRect();pointer.set((x-rect.left)/rect.width*2-1,1-(y-rect.top)/rect.height*2);ray.setFromCamera(pointer,camera);
    const hits=ray.intersectObjects(sets.flatMap(s=>s.userData.hits),false).filter(h=>h.distance<22);const info=hits.length?kit.pickInfo(hits[0]):null;if(info)onInspect({phase:active,...info});}
  function resize(){const w=host.clientWidth,h=Math.max(1,host.clientHeight);renderer.setSize(w,h,false);post.setSize(w,h,dpr);camera.aspect=w/h;camera.fov=Math.min(118,2*Math.atan(Math.tan(34*Math.PI/180)/Math.min(1,camera.aspect/1.5))*180/Math.PI);camera.updateProjectionMatrix();pointScale.value=pointScaleFor(h,dpr,camera.fov);}
  const observer=new ResizeObserver(resize);observer.observe(host);resize();
  return {canvas,update,inspect,render(player,dt,progress,running,cue={index:0,progress:0}){
    time+=dt;kit.advance(dt);
    camera.position.set(player.x,1.65,player.z);camera.rotation.set(player.pitch,player.yaw,0,'YXZ');
    if(lastRun&&active===4&&running&&cue.index!==operation){operation=cue.index;const old=sets[4];kit.leave(old);old.userData.fading=true;sets[4]=kit.build(4,lastRun,{selectedToken:0,queryIndex:7,operation});positionSet(sets[4],STOPS[4]);sets[4].userData.arrived=true;scene.add(sets[4]);fading.push(old);}
    for(const set of fading)if(kit.fade(set,dt)){kit.destroy(set);set.userData.gone=true;}fading=fading.filter(s=>!s.userData.gone);
    const live=running||(progress>0&&progress<1);
    sets.forEach((set,i)=>{const gap=Math.abs(STOPS[i].z-player.z),near=gap<18;set.visible=gap<30;if(!near)return;
      const on=i===active;kit.tick(set,{dt,sig:on&&live?(active===4?cue.progress:progress):1,live:on&&live});});
    gateMaterials.forEach((m,i)=>{m.opacity=i===active?.75+.15*Math.sin(time*2):.25;});padMaterials.forEach((m,i)=>{m.opacity=i===active?.55:.18;});
    atmosphere.update(time,camera.position);post.render(dt);quality.frame(dt);
  },dispose(){observer.disconnect();for(const s of [...sets,...fading])kit.destroy(s);kit.dispose();for(const r of fixed)r.dispose();atmosphere.dispose();post.dispose();renderer.dispose();canvas.remove();}};
}
