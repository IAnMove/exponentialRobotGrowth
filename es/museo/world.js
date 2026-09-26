import * as THREE from '../../vendor/three.module.js';
import {EYE,WALL_H,walls,exhibits,rooms,roomAt,standAt} from './model.js';
import {paintingCanvas} from './art.js';
import {immersiveHref} from '../immersive/catalog.js';

export function createMuseum(host,es){
  const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setClearColor(0x151d29);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;host.append(renderer.domElement);
  const scene=new THREE.Scene();scene.fog=new THREE.Fog(0x151d29,26,68);scene.add(new THREE.HemisphereLight(0xe3edff,0x433b31,2.1));
  const sun=new THREE.DirectionalLight(0xfff1d9,2.8);sun.position.set(3,10,4);scene.add(sun);
  const resources=[],own=r=>(resources.push(r),r),screens=[],sculptures=[],solids=[];
  function mat(color,extra={}){return own(new THREE.MeshStandardMaterial({color,roughness:.65,...extra}));}
  function box(parent,x,y,z,w,h,d,color,extra={}){const m=new THREE.Mesh(own(new THREE.BoxGeometry(w,h,d)),mat(color,extra));m.position.set(x,y,z);parent.add(m);return m;}
  function text(parent,words,x,y,z,w,color='#f4e7cf'){
    const c=document.createElement('canvas'),g=c.getContext('2d');g.font='500 48px system-ui';c.width=Math.ceil(g.measureText(words).width+40);c.height=90;g.font='500 48px system-ui';g.fillStyle=color;g.textAlign='center';g.textBaseline='middle';g.fillText(words,c.width/2,45);const tx=own(new THREE.CanvasTexture(c));tx.colorSpace=THREE.SRGBColorSpace;
    const m=new THREE.Mesh(own(new THREE.PlaneGeometry(w,w*90/c.width)),own(new THREE.MeshBasicMaterial({map:tx,transparent:true,depthWrite:false})));m.position.set(x,y,z);parent.add(m);return m;
  }
  const wallMaterial=mat(0x58606a,{roughness:.93});
  for(const b of walls){const mesh=new THREE.Mesh(own(new THREE.BoxGeometry(b.maxX-b.minX,WALL_H,b.maxZ-b.minZ)),wallMaterial);mesh.position.set((b.minX+b.maxX)/2,WALL_H/2,(b.minZ+b.maxZ)/2);scene.add(mesh);solids.push(mesh);box(scene,mesh.position.x,.12,mesh.position.z,b.maxX-b.minX+.045,.24,b.maxZ-b.minZ+.045,0x263444);}
  rooms.forEach((r,i)=>{
    const width=r.maxX-r.minX,depth=r.maxZ-r.minZ,cx=(r.minX+r.maxX)/2,cz=(r.minZ+r.maxZ)/2;
    box(scene,cx,-.13,cz,width,.24,depth,i===0?0x73746e:i===1?0x343f59:i===2?0x3c5955:0x4d4b55,{metalness:.2,roughness:.4});
    for(let x=r.minX+1;x<r.maxX;x+=2)box(scene,x,.002,cz,.018,.004,depth,0x9bafa8);
    for(let z=r.minZ+1;z<r.maxZ;z+=2)box(scene,cx,.002,z,width,.004,.018,0x9bafa8);
    // Roof beams and a luminous skylight keep the space bright and recognisable.
    box(scene,cx,WALL_H,cz,width,.12,depth,0x293546);
    box(scene,cx,WALL_H-.08,cz,width*.48,.06,depth*.55,0xd9e3ec,{emissive:0xc9d8ee,emissiveIntensity:.8});
    for(let z=r.minZ+2;z<r.maxZ;z+=3)box(scene,cx,WALL_H-.18,z,width,.25,.12,0x536371);
    const lamp=new THREE.PointLight(r.color,40,24,2);lamp.position.set(cx,4,cz);scene.add(lamp);
  });
  // Four open, coloured portals join the galleries through the atrium.
  for(const r of rooms.slice(1)){
    const g=new THREE.Group();g.position.set(r.gate.x,0,r.gate.z);g.rotation.y=r.id==='industry'?Math.PI/2:r.id==='cosmos'?-Math.PI/2:r.id==='life'?Math.PI:0;scene.add(g);
    [-2,2].forEach(x=>{box(g,x,2.1,0,.18,4.2,.6,0x2a3541);box(g,x,2.1,.32,.055,4.2,.03,r.color,{emissive:r.color,emissiveIntensity:.7});});box(g,0,4.2,0,4.2,.22,.6,0x2a3541);text(g,es?r.es:r.en,0,4.65,.36,3.7,r.color);
    const p=new THREE.Group();p.position.set(r.x,0,r.z);scene.add(p);const ring=new THREE.Mesh(own(new THREE.TorusGeometry(1.25,.035,8,60)),mat(r.color,{emissive:r.color,emissiveIntensity:.4}));ring.position.y=3.5;p.add(ring);sculptures.push(ring);
    if(r.id==='mind'){const core=new THREE.Mesh(own(new THREE.IcosahedronGeometry(.72,1)),mat(r.color,{wireframe:true,emissive:r.color,emissiveIntensity:.2}));core.position.y=3.5;p.add(core);sculptures.push(core);}
    if(r.id==='cosmos'){const globe=new THREE.Mesh(own(new THREE.SphereGeometry(.66,24,16)),mat(0x91abc8,{metalness:.45}));globe.position.y=3.5;p.add(globe);}
  }
  text(scene,'ATLAS',4.1,3.2,7.79,2.8).rotation.y=Math.PI;
  const floorTitle=text(scene,es?'ELIGE UNA SALA · ENTRA EN UN CUADRO':'CHOOSE A GALLERY · ENTER A PAINTING',0,.024,2.7,6.8,'#e7dec5');floorTitle.rotation.x=-Math.PI/2;
  // Real frames: moulding, inner bevel, canvas and a separate museum label.
  for(const e of exhibits){
    const group=new THREE.Group();group.position.set(e.x,2.35,e.z);group.rotation.y=Math.atan2(e.nx,e.nz);scene.add(group);const w=e.width||3.6,h=w*2/3;
    box(group,0,0,-.07,w+.36,h+.36,.18,0x302922,{metalness:.5});
    const frameMaterial=mat(0xb49765,{metalness:.72,roughness:.26,emissive:e.color,emissiveIntensity:.08});
    [[0,h/2+.09,w+.32,.17],[0,-h/2-.09,w+.32,.17],[-w/2-.09,0,.17,h],[w/2+.09,0,.17,h]].forEach(([x,y,a,b])=>{const m=new THREE.Mesh(own(new THREE.BoxGeometry(a,b,.22)),frameMaterial);m.position.set(x,y,.02);group.add(m);});
    const texture=own(new THREE.CanvasTexture(paintingCanvas(e,es)));texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    const mesh=new THREE.Mesh(own(new THREE.PlaneGeometry(w,h,36,24)),own(new THREE.ShaderMaterial({uniforms:{map:{value:texture},time:{value:0},hover:{value:0},enter:{value:0}},vertexShader:'uniform float time; uniform float hover; uniform float enter; varying vec2 vUv; void main(){vUv=uv; vec3 p=position; float d=length(uv-.5); p.z+=sin(d*22.-time*3.)*.035*hover+sin(d*28.-time*8.)*.25*enter; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',fragmentShader:'uniform sampler2D map; uniform float hover; uniform float enter; varying vec2 vUv; void main(){vec2 uv=(vUv-.5)*(1.-enter*.12)+.5; vec4 col=texture2D(map,uv); float edge=pow(max(abs(vUv.x-.5),abs(vUv.y-.5))*2.,14.); col.rgb+=vec3(.16,.23,.3)*edge*hover; gl_FragColor=col;\n #include <tonemapping_fragment>\n #include <colorspace_fragment>\n }'})));
    mesh.position.z=.065;mesh.userData.exhibit=e;group.add(mesh);
    text(group,`${e.num} / ${es?e.es:e.en}`,0,-h/2-.46,.08,Math.min(w,3),'#f0e6d5');
    text(group,immersiveHref(e.id)?(es?'ENTRAR EN EL MUNDO 3D':'ENTER THE 3D WORLD'):(es?'NOTEBOOK WEB · 3D EN PREPARACIÓN':'WEB NOTEBOOK · 3D COMING LATER'),0,-h/2-.73,.08,Math.min(w,3),immersiveHref(e.id)?'#b6f5cf':'#c2c6cc');
    const spot=new THREE.PointLight(0xffe6bc,12,6,2);spot.position.set(e.x+e.nx*1.4,4.6,e.z+e.nz*1.4);scene.add(spot);screens.push({e,mesh,frameMaterial});
  }
  const camera=new THREE.PerspectiveCamera(68,1,.06,90);camera.rotation.order='YXZ';
  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),ground=new THREE.Plane(new THREE.Vector3(0,1,0),0);
  const marker=new THREE.Mesh(own(new THREE.RingGeometry(.18,.25,32)),own(new THREE.MeshBasicMaterial({color:0xc6f2e2,side:THREE.DoubleSide})));marker.rotation.x=-Math.PI/2;marker.position.y=.035;marker.visible=false;scene.add(marker);
  function resize(){renderer.setSize(host.clientWidth,host.clientHeight,false);camera.aspect=host.clientWidth/Math.max(1,host.clientHeight);camera.fov=Math.min(110,2*Math.atan(Math.tan(34*Math.PI/180)/Math.min(1,camera.aspect/1.3))*180/Math.PI);camera.updateProjectionMatrix();}
  const observer=new ResizeObserver(resize);observer.observe(host);resize();let time=0;
  function pick(x,y){const r=renderer.domElement.getBoundingClientRect();pointer.set((x-r.left)/r.width*2-1,1-(y-r.top)/r.height*2);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(screens.map(s=>s.mesh))[0],wall=ray.intersectObjects(solids)[0];if(hit&&hit.distance<24&&(!wall||hit.distance<wall.distance))return {exhibit:hit.object.userData.exhibit};const p=new THREE.Vector3();if(ray.ray.intersectPlane(ground,p)&&p.distanceTo(camera.position)<28&&(!wall||p.distanceTo(camera.position)<wall.distance)&&roomAt(p.x,p.z))return {point:{x:p.x,z:p.z}};return null;}
  return {dom:renderer.domElement,pick,render(player,nearId,dt=.016,portal=null,destination=null){
    time+=dt;camera.position.set(player.x,EYE,player.z);camera.rotation.set(player.pitch,player.yaw,0,'YXZ');camera.updateMatrixWorld();
    for(const s of screens){const hot=s.e.id===nearId,u=s.mesh.material.uniforms;u.time.value=time;u.hover.value=hot?1:0;u.enter.value=portal?.exhibit.id===s.e.id?portal.progress:0;s.frameMaterial.emissiveIntensity=hot?.32:.06;}
    sculptures.forEach((s,i)=>{s.rotation.y=time*.1*(i%2?-1:1);s.rotation.z=Math.sin(time*.2)*.15;});
    marker.visible=!!destination;if(destination)marker.position.set(destination.x,.035,destination.z);renderer.render(scene,camera);
  },lookLock(){return renderer.domElement.requestPointerLock?.();},dispose(){observer.disconnect();resources.forEach(r=>r.dispose());renderer.dispose();renderer.domElement.remove();}};
}
export function placeInFront(exhibit){return standAt(exhibit);}
