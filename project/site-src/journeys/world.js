import * as THREE from '../vendor/three.module.js';
import {poseAt} from './common.js';
export function createLessonScene(lesson,es){
 const scene=new THREE.Scene();scene.fog=new THREE.Fog(0x10202d,26,110);scene.add(new THREE.HemisphereLight(0xd2e9ff,0x314339,2.4));const sun=new THREE.DirectionalLight(0xffe7c3,3);sun.position.set(7,15,5);scene.add(sun);
 const resources=[],targets=[],groups=[],own=x=>(resources.push(x),x),color=Number.parseInt(lesson.color.slice(1),16);
 const material=(c,extra={})=>own(new THREE.MeshStandardMaterial({color:c,roughness:.45,metalness:.22,...extra}));
 function mesh(parent,geometry,pos,c,info,extra){const m=new THREE.Mesh(own(geometry),material(c,extra));m.position.set(...pos);parent.add(m);if(info){m.userData.info=info;targets.push(m);}return m;}
 function box(g,p,size,c,info,extra){return mesh(g,new THREE.BoxGeometry(...size),p,c,info,extra);}
 function sphere(g,p,r,c,info,extra){return mesh(g,new THREE.SphereGeometry(r,20,14),p,c,info,extra);}
 function cylinder(g,p,r,h,c,info,extra){return mesh(g,new THREE.CylinderGeometry(r,r,h,20),p,c,info,extra);}
 function label(g,words,x,y,z,w=3){const c=document.createElement('canvas'),ctx=c.getContext('2d');ctx.font='600 44px system-ui';c.width=Math.ceil(ctx.measureText(words).width+30);c.height=76;ctx.font='600 44px system-ui';ctx.fillStyle='#e7f2fb';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(words,c.width/2,38);const texture=own(new THREE.CanvasTexture(c));texture.colorSpace=THREE.SRGBColorSpace;const h=Math.min(.48,w*76/c.width),m=new THREE.Mesh(own(new THREE.PlaneGeometry(h*c.width/76,h)),own(new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide,depthWrite:false})));m.position.set(x,y,z);g.add(m);return m;}
 function tube(g,points,r,c,info){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return mesh(g,new THREE.TubeGeometry(curve,Math.max(16,points.length*8),r,6,false),[0,0,0],c,info);}
 function pulse(g,points,c){const m=sphere(g,points[0],.14,c,null,{emissive:c,emissiveIntensity:1});return (path,progress)=>{if(path.length<2){m.visible=false;return;}m.visible=true;const f=(progress%1)*(path.length-1),i=Math.floor(f);m.position.set(...path[i]).lerp(new THREE.Vector3(...path[Math.min(path.length-1,i+1)]),f-i);};}
 function group(i){if(!groups[i]){const g=new THREE.Group();g.position.z=-i*16;g.rotation.y=Math.PI/2;scene.add(g);groups[i]=g;}return groups[i];}
 box(scene,[1,-.18,-24],[21,.3,70],0x253b44);for(let z=8;z>-58;z-=2)box(scene,[1,.001,z],[20,.006,.012],0x78909a);for(let x=-8;x<11;x+=2)box(scene,[x,.001,-24],[.012,.006,68],0x647e86);
 const outlines=[];for(let i=0;i<4;i++){box(scene,[0,.09,-i*16],[8,.18,10],0x2b4955);const g=group(i);label(g,lesson.steps[i].title[es?0:1],0,5,0,8);const ring=new THREE.Mesh(own(new THREE.TorusGeometry(4,.04,6,80)),material(color,{emissive:color,emissiveIntensity:.4}));ring.rotation.x=Math.PI/2;ring.position.set(0,.21,-i*16);scene.add(ring);outlines.push(ring);box(scene,[7,.03,-i*16],[.06,.04,14],color);}
 const k={scene,group,box,sphere,cylinder,label,tube,pulse,color,THREE,own};const update=lesson.build(k);
 return {scene,resources,targets,outlines,update};
}

export function createWorld(host,lesson,es,onInspect){
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setClearColor(0x10202d);renderer.toneMapping=THREE.ACESFilmicToneMapping;host.append(renderer.domElement);renderer.domElement.tabIndex=0;
 const {scene,resources,targets,outlines,update}=createLessonScene(lesson,es);
 const camera=new THREE.PerspectiveCamera(60,1,.08,150);camera.rotation.order='YXZ';const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let state,elapsed=0,phase=0,mode='web';
 function resize(){renderer.setSize(host.clientWidth,host.clientHeight,false);camera.aspect=host.clientWidth/Math.max(1,host.clientHeight);camera.fov=Math.min(108,2*Math.atan(Math.tan(31*Math.PI/180)/Math.min(1,camera.aspect/1.2))*180/Math.PI);camera.updateProjectionMatrix();}const observer=new ResizeObserver(resize);observer.observe(host);resize();
 return {canvas:renderer.domElement,update(s,i){state=s;phase=i;outlines.forEach((r,j)=>{r.material.emissiveIntensity=j===i?1:.12;});},render(player,dt,animation=true,orbit={yaw:.5,pitch:.4,distance:11},view='web'){
  mode=view;if(animation)elapsed+=dt;if(state)update(state,elapsed,phase);
  if(mode==='immersive'){camera.position.set(player.x,1.65,player.z);camera.rotation.set(player.pitch,player.yaw,0,'YXZ');}
  else{const center=new THREE.Vector3(0,1.9,-phase*16),d=orbit.distance;camera.position.set(Math.cos(orbit.yaw)*Math.cos(orbit.pitch)*d,1.9+Math.sin(orbit.pitch)*d,center.z+Math.sin(orbit.yaw)*Math.cos(orbit.pitch)*d);camera.lookAt(center);}renderer.render(scene,camera);
 },inspect(x,y){const r=renderer.domElement.getBoundingClientRect();pointer.set((x-r.left)/r.width*2-1,1-(y-r.top)/r.height*2);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(targets)[0];if(hit&&hit.distance<30)onInspect(hit.object.userData.info);},dispose(){observer.disconnect();resources.forEach(r=>r.dispose());renderer.dispose();},poseAt};
}
