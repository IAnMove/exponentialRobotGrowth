import * as THREE from '../../vendor/three.module.js';
import {walls,WALL_H} from './model.js';
import {pointMaterial,pointScaleFor} from '../fx/fx.js';
// Baked gallery accents add no per-painting dynamic lights.
export function createGalleryLighting(built,{mobile=false,reducedMotion=false}={}){
 const group=new THREE.Group();group.name='gallery-baked-light';built.scene.add(group);const resources=new Set(),own=x=>(resources.add(x),x),records=[];
 const strips=new THREE.InstancedMesh(own(new THREE.BoxGeometry(1,1,1)),own(new THREE.MeshBasicMaterial({color:new THREE.Color(0xffd4a2).multiplyScalar(1.35)})),walls.length),dummy=new THREE.Object3D();
 walls.forEach((w,i)=>{dummy.position.set((w.minX+w.maxX)/2,.22,(w.minZ+w.maxZ)/2);dummy.scale.set(w.maxX-w.minX+.06,.018,w.maxZ-w.minZ+.06);dummy.updateMatrix();strips.setMatrixAt(i,dummy.matrix);});group.add(strips);
 const vertex='varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
 const fragment='uniform vec3 uColor;uniform float uOpacity;varying vec2 vUv;void main(){vec2 d=(vUv-.5)*2.;float a=pow(max(0.,1.-dot(d,d)),2.)*uOpacity;gl_FragColor=vec4(uColor*a,a);}';
 const coneVertex='varying float vY;varying vec3 vN;varying vec3 vV;void main(){vY=uv.y;vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}';
 const coneFragment='uniform vec3 uColor;uniform float uOpacity;varying float vY;varying vec3 vN;varying vec3 vV;void main(){float a=pow(abs(dot(vN,vV)),1.5)*uOpacity*(.3+.7*vY);gl_FragColor=vec4(uColor*a,a);}';
 const plane=own(new THREE.PlaneGeometry(1,1)),coneGeo=own(new THREE.CylinderGeometry(.045,.65,1,mobile?12:24,1,true));
 function material(color,power,cone=false){return own(new THREE.ShaderMaterial({uniforms:{uColor:{value:color},uOpacity:{value:power}},vertexShader:cone?coneVertex:vertex,fragmentShader:cone?coneFragment:fragment,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:cone?THREE.DoubleSide:THREE.FrontSide}));}
 for(const painting of built.paintings){const {e}=painting,color=new THREE.Color(e.color).lerp(new THREE.Color(0xffedcf),.78),from=new THREE.Vector3(e.x+e.nx*.65,WALL_H-.24,e.z+e.nz*.65),to=painting.mesh.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(e.nx*.06,0,e.nz*.06));
  const cone=new THREE.Mesh(coneGeo,material(color,.065,true));cone.position.copy(from).lerp(to,.5);cone.scale.y=from.distanceTo(to);cone.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),from.clone().sub(to).normalize());group.add(cone);
  const pool=new THREE.Mesh(plane,material(color.clone().multiplyScalar(.55),.22));pool.rotation.x=-Math.PI/2;pool.scale.set(2.4,2.4,1);pool.position.set(e.x+e.nx*.9,.025,e.z+e.nz*.9);group.add(pool);records.push({id:e.id,cone,pool});}
 const pointScale={value:400},count=mobile?96:240,seed=Array.from({length:count},(_,i)=>{const n=Math.sin(i*12.9898)*43758.5453;return n-Math.floor(n);}),geometry=own(new THREE.BufferGeometry());
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(count*3),3));geometry.setAttribute('aSize',new THREE.Float32BufferAttribute(seed.map(s=>.009+s*.013),1));geometry.setAttribute('aAlpha',new THREE.Float32BufferAttribute(seed.map(s=>.1+s*.2),1));const dust=new THREE.Points(geometry,own(pointMaterial(pointScale,0xffe1b1,.8)));dust.frustumCulled=false;group.add(dust);
 return {resize(height,dpr,fov){pointScale.value=pointScaleFor(height,dpr,fov);},update(time,nearId,player){const clock=reducedMotion?0:time;for(const record of records){const hot=record.id===nearId;record.cone.material.uniforms.uOpacity.value=hot?.10:.065;record.pool.material.uniforms.uOpacity.value=hot?.38:.22;}const position=geometry.attributes.position;for(let i=0;i<count;i++){const s=seed[i];position.setXYZ(i,player.x+(s*37%1-.5)*8+Math.sin(clock*.15+i)*.1,(s*71+clock*.012*(.3+s))%1*WALL_H,player.z+(s*53%1-.5)*10);}position.needsUpdate=true;},dispose(){built.scene.remove(group);for(const resource of resources)resource.dispose();}};
}
