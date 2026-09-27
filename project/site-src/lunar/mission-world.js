import * as T from '../vendor/three.module.js';
import {missionPose} from './mission.js';
import {visualKit} from './visuals.js';
const V=a=>new T.Vector3(...a),GOLD=0xffbd73;
export function buildMission(es,{textures=true}={}){
 const group=new T.Group(),resources=[],own=x=>(resources.push(x),x);
 const kit=visualKit(own,{textures}),{box,ship,solar,rod,ring,crate}=kit;
 const mat=(c,e=0)=>kit.mat(c,'metal',e),cylinder=kit.cyl;
 const earthmat=own(new T.MeshStandardMaterial({color:0x427e9b,roughness:.9,metalness:0,fog:false,envMapIntensity:0,emissive:0x0c1f33,emissiveIntensity:1}));if(textures)new T.TextureLoader().load('../kardashev/earth-blue-marble.jpg',tx=>{own(tx);tx.colorSpace=T.SRGBColorSpace;earthmat.map=tx;earthmat.emissiveMap=tx;earthmat.emissive.set(0xffffff);earthmat.emissiveIntensity=.1;earthmat.color.set(0xffffff);earthmat.needsUpdate=true;});
 const sphere=own(new T.SphereGeometry(1,48,32));function planet(g,p,r,m){const a=new T.Mesh(sphere,m);a.position.set(...p);a.scale.setScalar(r);g.add(a);return a;}
 const launch=new T.Group(),orbit=new T.Group(),crossing=new T.Group(),surface=new T.Group();group.add(launch,orbit,crossing,surface);
 const shoreGeo=own(new T.PlaneGeometry(170,300,36,80));shoreGeo.rotateX(-Math.PI/2);const shorePos=shoreGeo.attributes.position;for(let i=0;i<shorePos.count;i++){const z=shorePos.getZ(i),edge=19+7*Math.sin(z*.038)+2*Math.sin(z*.13),u=(shorePos.getX(i)+85)/170;shorePos.setX(i,-130+u*(130+edge));shorePos.setY(i,-.1);}shoreGeo.computeVertexNormals();const land=[new T.Color(0x4f6a45),new T.Color(0x7d8457),new T.Color(0x36513a)],tint=new T.Color(),landColors=new Float32Array(shorePos.count*3);for(let i=0;i<shorePos.count;i++){const x=shorePos.getX(i),z=shorePos.getZ(i),n=.5+.3*Math.sin(x*.061+z*.017)*Math.cos(z*.043)+.2*Math.sin(x*.19-z*.11);tint.copy(land[0]).lerp(n>.5?land[1]:land[2],Math.abs(n-.5)*1.6);tint.toArray(landColors,i*3);}shoreGeo.setAttribute('color',new T.BufferAttribute(landColors,3));const shore=new T.Mesh(shoreGeo,own(new T.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0})));kit.sky(launch);shore.receiveShadow=true;launch.add(shore);box(launch,[90,-.25,0],[300,.1,320],0x24586c,'soil');
 const beachGeo=own(new T.PlaneGeometry(2,300,1,160));beachGeo.rotateX(-Math.PI/2);const beachPos=beachGeo.attributes.position;for(let i=0;i<beachPos.count;i++){const z=beachPos.getZ(i),edge=19+7*Math.sin(z*.038)+2*Math.sin(z*.13);beachPos.setX(i,edge-1+beachPos.getX(i));beachPos.setY(i,-.07);}beachGeo.computeVertexNormals();const beach=new T.Mesh(beachGeo,kit.mat(0xb0a88b,'soil'));beach.receiveShadow=true;launch.add(beach);
box(launch,[0,.04,0],[13,.3,13],0x67787e,'soil');cylinder(launch,[0,1.3,0],2.8,2.4,0x727d7c);
 for(const x of [-7,-5])for(const z of [-2,0])box(launch,[x,12,z],[.35,24,.35],0x87969b);for(let y=2;y<24;y+=2){box(launch,[-6,y,-1],[2.2,.2,2.2],0x758a92);const brace=box(launch,[-6,y,-1],[.13,2.8,.13],0xa7b3b8);brace.rotation.z=.7;}box(launch,[-3.5,15,-1],[6,.45,.45],0xb3b5ac);
 for(let i=0;i<5;i++){cylinder(launch,[-20+i*3,2.5,-10],1.1,5,0xc3cecf);box(launch,[-20+i*3,.2,-4],[.18,.25,12],0x6c8c93);}
 // Service gantries, pipework and pad markings give the launch site a readable scale.
 for(let i=0;i<14;i++){box(launch,[-8,.13,5+i*2],[.12,.04,1],0xf1ddb1);box(launch,[8,.13,5+i*2],[.12,.04,1],0xf1ddb1);}
 box(launch,[0,.02,32],[18,.12,48],0x424d50,'soil');
 for(const x of [-26,-16]){box(launch,[x,1,-17],[8,2,5],0x8eaaa9);for(let j=0;j<5;j++)box(launch,[x-3+j*1.5,2.1,-17],[.08,.1,5],0xc9d1ce);}
 for(let y=2;y<24;y+=2){rod(launch,[-7,y,-2],[-5,y+2,-2],.05);rod(launch,[-5,y,-2],[-7,y+2,-2],.05);}
 for(const z of [-3,3]){rod(launch,[-6,15,z],[1,15,z],.16);rod(launch,[-6,13,z],[0,15,z],.08);}
 for(let i=0;i<5;i++){ring(launch,[-20+i*3,4.7,-10],1.11,.04,0x6c8c93);rod(launch,[-20+i*3,4,-10],[-20+i*3,.3,-10],.06);}
 const booster=ship(launch,{booster:true}),upper=ship(launch,{stowed:true});
 // Soft billboard particles: atmospheric launch exhaust; lunar ejecta is a thin radial sheet.
 function cloud(g,count,color){const geo=own(new T.PlaneGeometry(1,1));const m=own(new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{tint:{value:new T.Color(color)},opacity:{value:.35}},vertexShader:'varying vec2 v;void main(){v=uv;vec4 p=modelViewMatrix*vec4(0.,0.,0.,1.);p.xy+=position.xy*vec2(length(modelMatrix[0].xyz),length(modelMatrix[1].xyz));gl_Position=projectionMatrix*p;}',fragmentShader:'varying vec2 v;uniform vec3 tint;uniform float opacity;void main(){float r=length(v-.5)*2.;float a=pow(max(0.,1.-r*r),2.);gl_FragColor=vec4(tint,a*opacity);}'}));return Array.from({length:count},()=>{const p=new T.Mesh(geo,m);p.frustumCulled=false;g.add(p);return p;});}
 const smoke=cloud(launch,40,0xbfc7cd);
 const orbitalEarth=planet(orbit,[0,-70,-20],58,earthmat);orbitalEarth.rotation.set(-1.05,4.4,0);kit.atmosphere(orbit,orbitalEarth,58);const lunarOrbiter=ship(orbit),depot=ship(orbit,{depot:true}),tanker=ship(orbit,{depot:true});lunarOrbiter.group.rotation.z=Math.PI/2;lunarOrbiter.group.position.set(-2,5,0);depot.group.rotation.z=-Math.PI/2;depot.group.position.set(2,5,0);tanker.group.scale.setScalar(.5);tanker.group.rotation.z=Math.PI/2;tanker.group.position.set(14,0,-8);[lunarOrbiter,depot,tanker].forEach(s=>s.burn.visible=false);

 const fuel=Array.from({length:20},()=>planet(orbit,[0,0,0],.10,mat(0x87e3c3,2)));
 const transitEarth=planet(crossing,[-17,0,-4],6,earthmat);kit.atmosphere(crossing,transitEarth,6);const transitMoon=new T.Mesh(kit.craterSphere(),kit.moonMaterial());transitMoon.position.set(18,0,0);transitMoon.scale.setScalar(3.4);crossing.add(transitMoon);const curve=new T.CatmullRomCurve3([V([-16,5,-2]),V([-10,12,1]),V([7,11,4]),V([17,3,3])]);const line=new T.Mesh(own(new T.TubeGeometry(curve,100,.035,6,false)),mat(0x4c829f,.2));crossing.add(line);const transit=ship(crossing);transit.group.scale.setScalar(.3);transit.burn.visible=false;

 kit.terrain(surface);
 const earthrise=planet(surface,[10,26,-85],7,earthmat);earthrise.rotation.y=2.4;kit.atmosphere(surface,earthrise,7);
 const landed=ship(surface),elevator=new T.Group();landed.group.add(elevator);
 box(elevator,[2.4,0,0],[2.4,.13,2.4],0x859aa4);const pallet=crate(elevator,[2.4,.08,0]);
 for(const z of [-1.1,1.1]){rod(elevator,[1.3,.1,z],[3.5,.1,z],.035,0xffc77b);for(const x of [1.3,3.5])rod(elevator,[x,0,z],[x,.4,z],.025);}
 const cable=box(landed.group,[2.1,5,0],[.04,8,.04],0xd2dedf);rod(landed.group,[.9,9.1,0],[3.4,9.1,0],.09);rod(landed.group,[.9,9.8,0],[3.3,9.1,0],.045);cylinder(landed.group,[2.5,9.1,0],.18,.3,0x526678);
 const rover=new T.Group();surface.add(rover);box(rover,[0,.65,0],[2.4,.38,1.8],0xb1bfbe);box(rover,[0,.87,0],[2.3,.1,1.9],0x344654);
 const wheels=[];for(const x of [-.9,0,.9])for(const z of [-1,1]){const axle=cylinder(rover,[x,.38,z],.38,.26,0x3b4650);axle.rotation.x=Math.PI/2;const hub=cylinder(rover,[x,.38,z*1.15],.18,.04,0xbac4c5);hub.rotation.x=Math.PI/2;wheels.push(axle);for(let j=0;j<12;j++){const lug=box(axle,[Math.cos(j*Math.PI/6)*.37,0,Math.sin(j*Math.PI/6)*.37],[.08,.29,.04],0x899497);lug.rotation.y=-j*Math.PI/6;}rod(rover,[x,.65,0],[x,.38,z],.065);}
 rod(rover,[-.95,1,0],[-.95,1.9,0],.04);box(rover,[-.95,1.9,0],[.27,.17,.3],0x22384a);for(const z of [-.65,.65])box(rover,[1.21,.68,z],[.03,.13,.2],0xb7eeea,'metal',1);
 const hauled=crate(rover,[.15,.92,0],.85);
 const dust=cloud(surface,50,0xb4aaa0);
 for(let i=0;i<28;i++)for(const z of [-1,1])box(surface,[4+i*.37,-.21,z],[.21,.015,.24],0x65666b,'soil');
 // Small deployed instruments and marked cargo pallets, separate from the landing zone.
 for(const x of [15,20]){crate(surface,[x,0,-5],.65);solar(surface,[x,1,-7],3,2);rod(surface,[x,0,-7],[x,1,-7],.06);}
 function update(id,progress){const p=missionPose(id,progress),launching=['liftoff','booster'].includes(id);launch.visible=launching;orbit.visible=id==='refuel';crossing.visible=id==='transfer';surface.visible=['descent','unload','return'].includes(id);booster.group.position.set(0,2.6+(p.height||0),0);upper.group.position.set(id==='booster'?p.separation:0,id==='booster'?p.upper:15.7+(p.height||0),0);booster.burn.visible=!!p.flame;upper.burn.visible=id==='booster';
  smoke.forEach((m,i)=>{m.visible=id==='liftoff'&&p.u<.65;const q=p.u*26+i*.23;m.position.set(Math.sin(i*2.4)*q,.3+i%5*.36,Math.cos(i*2.4)*q);m.scale.set(3+q*.37,2+q*.2,1);m.material.uniforms.opacity.value=.38*(1-T.MathUtils.smoothstep(p.u,.35,.65));});
  fuel.forEach((m,i)=>{m.position.set(2-((p.u*3+i/20)%1)*4,5,0);});tanker.group.position.x=16-4*Math.sin(p.u*Math.PI);const q=curve.getPointAt(p.u);transit.group.position.copy(q);transit.group.quaternion.setFromUnitVectors(V([0,1,0]),curve.getTangentAt(p.u));
  landed.group.position.y=.3+(p.height||0);landed.burn.visible=!!p.flame;elevator.position.y=id==='unload'?.6+7.4*p.lift:8;cable.visible=id==='unload';cable.scale.y=9.1-elevator.position.y;cable.position.y=(9.1+elevator.position.y)/2;elevator.visible=id!=='return';pallet.visible=id!=='unload'||p.u<.6;rover.visible=id==='unload';rover.position.set(2.4+10*(p.cargo||0),0,0);hauled.visible=id==='unload'&&p.u>=.6;wheels.forEach(w=>w.rotation.y=(p.cargo||0)*26);
  dust.forEach((m,i)=>{const force=id==='descent'?T.MathUtils.smoothstep(p.u,.55,.87)*(1-T.MathUtils.smoothstep(p.u,.96,1)):id==='return'?(1-T.MathUtils.smoothstep(p.u,.25,.7))*T.MathUtils.smoothstep(p.u,.04,.1):0;m.visible=force>0;const q=(p.u*5+i/50)%1,r=1+q*22;m.position.set(Math.cos(i*2.4)*r,.12+q*.22,Math.sin(i*2.4)*r);m.scale.set(1+q*5,.12+q*.22,1);m.material.uniforms.opacity.value=force*.25;});
  [booster,upper,landed].forEach(s=>{const big=s===booster&&id==='liftoff';s.burn.scale.set(big?1.45:1,(.94+.06*Math.sin(p.u*220))*(big?1.7:1),big?1.45:1);s.burn.userData.material.uniforms.phase.value=p.u*25;s.light.visible=s.burn.visible;s.light.intensity=s.burn.visible?24:0;});return p;
 }
 return {group,update,dispose(){resources.forEach(r=>r.dispose());}};
}
