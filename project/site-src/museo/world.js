import * as THREE from '../vendor/three.module.js';
import {EYE,WALL_H,walls,exhibits,rooms,roomAt,standAt} from './model.js';
import {paintingCanvas} from './art.js';
import {immersiveHref} from '../immersive/catalog.js';
import {createPost,adaptiveScale,pointScaleFor,pointMaterial} from '../fx/fx.js';

export function createMuseum(host,es){
  const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'});let dpr=Math.min(devicePixelRatio||1,1.5);renderer.setPixelRatio(dpr);renderer.setClearColor(0x151d29);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;host.append(renderer.domElement);
  const scene=new THREE.Scene();scene.fog=new THREE.Fog(0x151d29,26,68);scene.add(new THREE.HemisphereLight(0xe3edff,0x433b31,1.45));
  const sun=new THREE.DirectionalLight(0xfff1d9,2.8);sun.position.set(3,10,4);scene.add(sun);
  const resources=[],own=r=>(resources.push(r),r),screens=[],sculptures=[],solids=[];
  function mat(color,extra={}){return own(new THREE.MeshStandardMaterial({color,roughness:.65,...extra}));}
  function box(parent,x,y,z,w,h,d,color,extra={}){const m=new THREE.Mesh(own(new THREE.BoxGeometry(w,h,d)),mat(color,extra));m.position.set(x,y,z);parent.add(m);return m;}
  function text(parent,words,x,y,z,w,color='#f4e7cf'){
    const c=document.createElement('canvas'),g=c.getContext('2d');g.font='500 48px system-ui';c.width=Math.ceil(g.measureText(words).width+40);c.height=90;g.font='500 48px system-ui';g.fillStyle=color;g.textAlign='center';g.textBaseline='middle';g.fillText(words,c.width/2,45);const tx=own(new THREE.CanvasTexture(c));tx.colorSpace=THREE.SRGBColorSpace;
    const m=new THREE.Mesh(own(new THREE.PlaneGeometry(w,w*90/c.width)),own(new THREE.MeshBasicMaterial({map:tx,transparent:true,depthWrite:false})));m.position.set(x,y,z);parent.add(m);return m;
  }

  // Museum plaques: enamel board, double brass frame and diamond corners. Lettering lives on the front face only,
  // so from behind a visitor sees the plain back of the board, never mirrored text.
  const brass=mat(0xb49765,{metalness:.75,roughness:.3}),plaqueBack=mat(0x1b1814,{metalness:.55,roughness:.5});
  function plaque(parent,lines,{x=0,y=0,z=0,w=3,h=.8,accent='#d9bd8d',depth=.06}={}){
    const c=document.createElement('canvas'),W=1024,H=Math.round(W*h/w),g=c.getContext('2d');c.width=W;c.height=H;
    const bg=g.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#231d16');bg.addColorStop(1,'#0e0c09');g.fillStyle=bg;g.fillRect(0,0,W,H);
    const gold=g.createLinearGradient(0,0,W,H);gold.addColorStop(0,'#e7cf98');gold.addColorStop(.5,'#9c7c46');gold.addColorStop(1,'#e2c58a');
    const rim=Math.max(8,H*.07),inset=rim*2.3;g.strokeStyle=gold;g.lineWidth=rim;g.strokeRect(rim/2,rim/2,W-rim,H-rim);
    g.lineWidth=Math.max(2,rim*.22);g.strokeStyle=accent;g.globalAlpha=.75;g.strokeRect(inset,inset,W-inset*2,H-inset*2);g.globalAlpha=1;
    const d=inset*.55;g.fillStyle=gold;for(const [cx,cy] of [[inset,inset],[W-inset,inset],[inset,H-inset],[W-inset,H-inset]]){g.save();g.translate(cx,cy);g.rotate(Math.PI/4);g.fillRect(-d/2,-d/2,d,d);g.restore();g.fillStyle=accent;g.beginPath();g.arc(cx,cy,d*.18,0,Math.PI*2);g.fill();g.fillStyle=gold;}
    const total=lines.reduce((a,l)=>a+l.size*H*1.18,0);let yy=H/2-total/2;g.textAlign='center';g.textBaseline='middle';
    lines.forEach((l,i)=>{const px=l.size*H;yy+=px*.59;g.font=`${l.weight||600} ${px}px ${l.serif===false?'Inter,system-ui,sans-serif':'Georgia,"Times New Roman",serif'}`;g.letterSpacing=`${(l.spacing??.08)*px}px`;g.fillStyle=l.color||'#f3e6cc';g.fillText(l.text,W/2,yy,W-inset*3.2);
      if(l.rule){const rw=Math.min(W*.46,g.measureText(l.text).width*.9),ry=yy+px*.62;g.fillStyle=gold;g.fillRect(W/2-rw/2,ry-1.5,rw,3);g.fillStyle=accent;for(const sx of [-1,1]){g.save();g.translate(W/2+sx*(rw/2+px*.14),ry);g.rotate(Math.PI/4);g.fillRect(-px*.07,-px*.07,px*.14,px*.14);g.restore();}}
      yy+=px*.59;});
    const tx=own(new THREE.CanvasTexture(c));tx.colorSpace=THREE.SRGBColorSpace;tx.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    const face=own(new THREE.MeshStandardMaterial({map:tx,emissiveMap:tx,emissive:0xffffff,emissiveIntensity:.32,roughness:.45,metalness:.25}));
    const board=new THREE.Mesh(own(new THREE.BoxGeometry(w,h,depth)),[brass,brass,brass,brass,face,plaqueBack]);board.position.set(x,y,z);parent.add(board);return board;
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
    [-2,2].forEach(x=>{box(g,x,2.1,0,.18,4.2,.6,0x2a3541);box(g,x,2.1,.32,.055,4.2,.03,r.color,{emissive:r.color,emissiveIntensity:.7});});box(g,0,4.2,0,4.2,.22,.6,0x2a3541);plaque(g,[{text:(es?r.es:r.en).toUpperCase(),size:.34,rule:true,color:r.color},{text:r.subtitle[es?0:1],size:.15,weight:400,serif:false,spacing:.12,color:'#d8ccb4'}],{y:4.83,z:.22,w:3.5,h:.98,accent:r.color});for(const x of [-1.25,1.25]){const b=new THREE.Mesh(own(new THREE.BoxGeometry(.07,.16,.34)),brass);b.position.set(x,4.36,.12);g.add(b);}
    const p=new THREE.Group();p.position.set(r.x,0,r.z);scene.add(p);const ring=new THREE.Mesh(own(new THREE.TorusGeometry(1.25,.035,8,60)),own(new THREE.MeshBasicMaterial({color:new THREE.Color(r.color).multiplyScalar(1.12)})));ring.position.y=3.5;p.add(ring);sculptures.push(ring);
    if(r.id==='mind'){const core=new THREE.Mesh(own(new THREE.IcosahedronGeometry(.72,1)),mat(r.color,{wireframe:true,emissive:r.color,emissiveIntensity:.2}));core.position.y=3.5;p.add(core);sculptures.push(core);}
    if(r.id==='cosmos'){const globe=new THREE.Mesh(own(new THREE.SphereGeometry(.66,24,16)),mat(0x91abc8,{metalness:.45}));globe.position.y=3.5;p.add(globe);}
  }
  plaque(scene,[{text:'ATLAS',size:.4,rule:true,spacing:.3},{text:es?rooms[0].subtitle[0]:rooms[0].subtitle[1],size:.14,weight:400,serif:false,spacing:.14,color:'#d8ccb4'}],{x:4.1,y:3.2,z:7.8,w:2.6,h:.9,accent:rooms[0].color,depth:.05}).rotation.y=Math.PI;
  const floorTitle=text(scene,es?'ELIGE UNA SALA · ENTRA EN UN CUADRO':'CHOOSE A GALLERY · ENTER A PAINTING',0,.024,2.7,6.8,'#e7dec5');floorTitle.rotation.x=-Math.PI/2;
  // Real frames: moulding, inner bevel, canvas and a separate museum label.
  // LED coves along the foot of every wall: HDR strips that the bloom turns into a soft glow.
  const coveMaterial=own(new THREE.MeshBasicMaterial({color:new THREE.Color(0xffc98a).multiplyScalar(1.6)}));
  for(const b of walls){const m=new THREE.Mesh(own(new THREE.BoxGeometry(b.maxX-b.minX+.07,.022,b.maxZ-b.minZ+.07)),coveMaterial);m.position.set((b.minX+b.maxX)/2,.255,(b.minZ+b.maxZ)/2);scene.add(m);}
  const coneGeometry=own(new THREE.CylinderGeometry(.07,1,1,32,1,true)),poolGeometry=own(new THREE.CircleGeometry(1,48)),washGeometry=own(new THREE.PlaneGeometry(1,1));
  const fixtureMaterial=own(new THREE.MeshBasicMaterial({color:new THREE.Color(0xfff0d8).multiplyScalar(3)})),fixtureGeometry=own(new THREE.CylinderGeometry(.1,.13,.1,16));
  const CONE_FRAG='uniform vec3 uColor;uniform float uPower;varying float vY;varying vec3 vN;varying vec3 vV;void main(){float edge=pow(abs(dot(vN,vV)),1.5);float a=edge*uPower*(.3+.7*vY);gl_FragColor=vec4(uColor*a,a);}';
  const CONE_VERT='varying float vY;varying vec3 vN;varying vec3 vV;void main(){vY=uv.y;vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}';
  const GLOW_VERT='varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
  const GLOW_FRAG='uniform vec3 uColor;uniform float uOpacity;varying vec2 vUv;void main(){vec2 d=(vUv-.5)*2.;float a=pow(max(0.,1.-dot(d,d)),2.)*uOpacity;gl_FragColor=vec4(uColor*a,a);}';
  const glow=(color,opacity)=>own(new THREE.ShaderMaterial({uniforms:{uColor:{value:color},uOpacity:{value:opacity}},vertexShader:GLOW_VERT,fragmentShader:GLOW_FRAG,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
  for(const e of exhibits){
    const group=new THREE.Group();group.position.set(e.x,2.35,e.z);group.rotation.y=Math.atan2(e.nx,e.nz);scene.add(group);const w=e.width||3.6,h=w*2/3;
    box(group,0,0,-.07,w+.36,h+.36,.18,0x302922,{metalness:.5});
    const frameMaterial=mat(0xb49765,{metalness:.72,roughness:.26,emissive:e.color,emissiveIntensity:.08});
    [[0,h/2+.09,w+.32,.17],[0,-h/2-.09,w+.32,.17],[-w/2-.09,0,.17,h],[w/2+.09,0,.17,h]].forEach(([x,y,a,b])=>{const m=new THREE.Mesh(own(new THREE.BoxGeometry(a,b,.22)),frameMaterial);m.position.set(x,y,.02);group.add(m);});
    const texture=own(new THREE.CanvasTexture(paintingCanvas(e,es)));texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    const mesh=new THREE.Mesh(own(new THREE.PlaneGeometry(w,h,36,24)),own(new THREE.ShaderMaterial({uniforms:{map:{value:texture},time:{value:0},hover:{value:0},enter:{value:0}},vertexShader:'uniform float time; uniform float hover; uniform float enter; varying vec2 vUv; void main(){vUv=uv; vec3 p=position; float d=length(uv-.5); p.z+=sin(d*22.-time*3.)*.035*hover+sin(d*28.-time*8.)*.25*enter; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',fragmentShader:'uniform sampler2D map; uniform float hover; uniform float enter; varying vec2 vUv; void main(){vec2 uv=(vUv-.5)*(1.-enter*.12)+.5; vec4 col=texture2D(map,uv); float edge=pow(max(abs(vUv.x-.5),abs(vUv.y-.5))*2.,14.); col.rgb+=vec3(.16,.23,.3)*edge*hover; gl_FragColor=col;\n #include <tonemapping_fragment>\n #include <colorspace_fragment>\n }'})));
    mesh.position.z=.065;mesh.userData.exhibit=e;group.add(mesh);
    const live=!!immersiveHref(e.id);plaque(group,[{text:`${e.num} · ${es?e.es:e.en}`,size:.3},{text:live?(es?'ENTRAR EN EL MUNDO 3D':'ENTER THE 3D WORLD'):(es?'NOTEBOOK WEB · 3D EN PREPARACIÓN':'WEB NOTEBOOK · 3D COMING LATER'),size:.17,weight:500,serif:false,spacing:.14,color:live?'#b6f5cf':'#c2c6cc'}],{y:-h/2-.62,z:-.02,w:Math.min(w,2.7),h:.62,accent:e.color,depth:.05});
    const warm=new THREE.Color(e.color).lerp(new THREE.Color(0xfff0d8),.65),from=new THREE.Vector3(e.x+e.nx*1.35,WALL_H-.12,e.z+e.nz*1.35),to=new THREE.Vector3(e.x+e.nx*.1,2.35,e.z+e.nz*.1);
    const fixture=new THREE.Mesh(fixtureGeometry,fixtureMaterial);fixture.position.copy(from);scene.add(fixture);
    const cone=new THREE.Mesh(coneGeometry,own(new THREE.ShaderMaterial({uniforms:{uColor:{value:warm},uPower:{value:.22}},vertexShader:CONE_VERT,fragmentShader:CONE_FRAG,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide})));
    cone.scale.set(1,from.distanceTo(to),1);cone.position.copy(from).lerp(to,.5);cone.lookAt(to);cone.rotateX(-Math.PI/2);scene.add(cone);
    const pool=new THREE.Mesh(poolGeometry,glow(warm.clone().multiplyScalar(.55),.3));pool.rotation.x=-Math.PI/2;pool.scale.setScalar(1.25);pool.position.set(e.x+e.nx*1.05,.014,e.z+e.nz*1.05);scene.add(pool);
    const wash=new THREE.Mesh(washGeometry,glow(warm.clone().multiplyScalar(.5),.3));wash.scale.set(w+1.6,h+2.2,1);wash.position.set(0,.35,-.155);group.add(wash);
    screens.push({e,mesh,frameMaterial,cone,pool,wash});
  }
  const pointScale={value:400},DUST=420,dustSeed=Array.from({length:DUST},(_,i)=>{const r=Math.sin(i*12.9898)*43758.5453;return r-Math.floor(r);});
  const dustGeo=own(new THREE.BufferGeometry());dustGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(DUST*3),3));
  dustGeo.setAttribute('aSize',new THREE.BufferAttribute(Float32Array.from(dustSeed,s=>.012+s*.02),1));dustGeo.setAttribute('aAlpha',new THREE.BufferAttribute(Float32Array.from(dustSeed,s=>.2+(1-s)*.5),1));
  const dust=new THREE.Points(dustGeo,own(pointMaterial(pointScale,0xffe2b8,1.4)));dust.frustumCulled=false;scene.add(dust);
  const camera=new THREE.PerspectiveCamera(68,1,.06,90);camera.rotation.order='YXZ';
  const post=createPost(renderer,scene,camera,{strength:.38,radius:.55,threshold:1.02});scene.environmentIntensity=.12;renderer.toneMappingExposure=1.02;
  const quality=adaptiveScale(dpr,{min:.6,apply(v){dpr=v;renderer.setPixelRatio(dpr);resize();}});
  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),ground=new THREE.Plane(new THREE.Vector3(0,1,0),0);
  const marker=new THREE.Mesh(own(new THREE.RingGeometry(.18,.25,32)),own(new THREE.MeshBasicMaterial({color:0xc6f2e2,side:THREE.DoubleSide})));marker.rotation.x=-Math.PI/2;marker.position.y=.035;marker.visible=false;scene.add(marker);
  function resize(){renderer.setSize(host.clientWidth,host.clientHeight,false);post.setSize(host.clientWidth,Math.max(1,host.clientHeight),dpr);camera.aspect=host.clientWidth/Math.max(1,host.clientHeight);camera.fov=Math.min(110,2*Math.atan(Math.tan(34*Math.PI/180)/Math.min(1,camera.aspect/1.3))*180/Math.PI);camera.updateProjectionMatrix();pointScale.value=pointScaleFor(Math.max(1,host.clientHeight),dpr,camera.fov);}
  const observer=new ResizeObserver(resize);observer.observe(host);resize();let time=0;
  function pick(x,y){const r=renderer.domElement.getBoundingClientRect();pointer.set((x-r.left)/r.width*2-1,1-(y-r.top)/r.height*2);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(screens.map(s=>s.mesh))[0],wall=ray.intersectObjects(solids)[0];if(hit&&hit.distance<24&&(!wall||hit.distance<wall.distance))return {exhibit:hit.object.userData.exhibit};const p=new THREE.Vector3();if(ray.ray.intersectPlane(ground,p)&&p.distanceTo(camera.position)<28&&(!wall||p.distanceTo(camera.position)<wall.distance)&&roomAt(p.x,p.z))return {point:{x:p.x,z:p.z}};return null;}
  return {dom:renderer.domElement,pick,render(player,nearId,dt=.016,portal=null,destination=null){
    time+=dt;camera.position.set(player.x,EYE,player.z);camera.rotation.set(player.pitch,player.yaw,0,'YXZ');camera.updateMatrixWorld();
    for(const s of screens){const hot=s.e.id===nearId,u=s.mesh.material.uniforms;u.time.value=time;u.hover.value=hot?1:0;u.enter.value=portal?.exhibit.id===s.e.id?portal.progress:0;s.frameMaterial.emissiveIntensity=hot?.3+.08*Math.sin(time*3):.06;s.cone.material.uniforms.uPower.value=hot?.4:.22;s.pool.material.uniforms.uOpacity.value=hot?.9:.42;s.wash.material.uniforms.uOpacity.value=hot?.75:.45;}
    const dp=dustGeo.attributes.position;for(let i=0;i<DUST;i++){const s=dustSeed[i];dp.setXYZ(i,player.x+((s*37)%1-.5)*9+Math.sin(time*.2+i)*.2,((s*71+time*.02*(.3+s))%1)*WALL_H,player.z+((s*53)%1-.5)*12);}dp.needsUpdate=true;
    sculptures.forEach((s,i)=>{s.rotation.y=time*.1*(i%2?-1:1);s.rotation.z=Math.sin(time*.2)*.15;});
    marker.visible=!!destination;if(destination)marker.position.set(destination.x,.035,destination.z);post.render(dt);quality.frame(dt);
  },lookLock(){return renderer.domElement.requestPointerLock?.();},dispose(){observer.disconnect();post.dispose();resources.forEach(r=>r.dispose());renderer.dispose();renderer.domElement.remove();}};
}
export function placeInFront(exhibit){return standAt(exhibit);}
