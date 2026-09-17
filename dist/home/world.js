import * as THREE from '../vendor/three.module.js';
import {CHORES} from './model.js';

export function createHomeWorld(host){
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setClearColor(0x18232c);host.append(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-9,9,7,-7,.1,100);scene.add(new THREE.HemisphereLight(0xe4f2ff,0xb4a78e,2.6));
 const sun=new THREE.DirectionalLight(0xfff0d9,3.2);sun.position.set(-5,12,7);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-10,right:10,top:10,bottom:-10});sun.shadow.normalBias=.025;scene.add(sun);
 const materials=new Map();function mat(c){if(!materials.has(c))materials.set(c,new THREE.MeshStandardMaterial({color:c,roughness:.8}));return materials.get(c);}
 function box(w,h,d,x,y,z,c,parent=scene){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(c));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function cylinder(r,h,x,y,z,c,parent=scene){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,24),mat(c));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 box(12.4,.35,10.4,0,-.3,0,0x33464e);box(12,.12,10,0,-.05,0,0xd4b792);
 // Open front and low internal walls keep the working rooms visible.
 box(12,1.8,.16,0,.9,-5,0xe8e0d3);box(.16,1.8,10,-6,.9,0,0xe8e0d3);box(.14,.5,3,.3,.25,-3.5,0xe8e0d3);box(.14,.5,3,.3,.25,3.5,0xe8e0d3);
 box(1.6,.45,.14,1.2,.22,0,0xe8e0d3);box(2,.45,.14,5,.22,0,0xe8e0d3);box(.12,.5,2,3.3,.25,4,0xe8e0d3);
 box(5.5,.025,4.6,-3,.03,-2.5,0xcbcdbb);box(2.8,.03,4.6,1.8,.03,2.5,0xaabbb6);box(2.5,.03,4.6,4.65,.03,2.5,0xa9c5c7);
 for(let x=-5.5;x<6;x+=.7)box(.013,.015,9.7,x,.023,0,0xc1a581);
 // Kitchen: continuous worktop, hob, sink, fridge and dining table.
 box(4.6,.85,.8,-3.2,.45,-4.4,0x627e76);box(4.8,.08,.95,-3.2,.91,-4.4,0xf0e5cf);
 for(let x=-5.2;x<-1;x+=.85)box(.025,.55,.03,x,.5,-3.98,0xabc0b3);
 box(.75,.04,.6,-4.6,.97,-4.4,0x263839);for(const x of [-4.8,-4.4])for(const z of [-4.55,-4.25])cylinder(.12,.02,x,1,z,0x849ca0);
 box(.75,.04,.55,-2,.97,-4.4,0x81969d);box(.12,.38,.08,-2,1.14,-4.72,0xc1d2d5);
 box(.9,1.9,.9,-5.35,.95,-2.85,0xe8eee8);box(.06,.55,.08,-5,1.2,-2.36,0x758f8d);
 box(1.5,.1,1,-3,.8,-1.9,0xe1c195);for(const x of [-3.6,-2.4])for(const z of [-2.2,-1.6])box(.09,.8,.09,x,.4,z,0x806c5c);
 for(const x of [-4.1,-1.9]){box(.55,.12,.55,x,.45,-1.9,0x8faaa0);box(.1,.65,.55,x+(x<-3?-.25:.25),.7,-1.9,0x8faaa0);}
 // Living room: upholstered sofa, rug, coffee table, lamp, bookshelf.
 box(3.9,.035,3.1,-3,.04,2.5,0xc18769);box(3.6,.5,.9,-3,.38,4.1,0x537c7e);box(3.6,.8,.22,-3,.7,4.57,0x537c7e);
 for(const x of [-4.1,-3,-1.9])box(1,.17,.75,x,.71,4.02,0x78a1a0);
 for(const x of [-4.85,-1.15])box(.22,.65,1,x,.56,4.1,0x537c7e);
 box(1.5,.1,.85,-3,.51,2.35,0xc8a878);box(.08,.5,.08,-3.6,.25,2.1,0x4b5653);box(.08,.5,.08,-2.4,.25,2.6,0x4b5653);
 cylinder(.22,.08,-5.3,.08,4.1,0x4e5e5c);cylinder(.035,1.55,-5.3,.85,4.1,0x4e5e5c);cylinder(.38,.35,-5.3,1.7,4.1,0xf2d9a4);
 box(.55,1.6,1.6,-5.55,.8,.7,0x85775e);for(let i=0;i<10;i++)box(.18,.3,.09,-5.22,.4+(i%2)*.7,.05+Math.floor(i/2)*.28,[0xad816b,0x93aa9d,0xd2c69a][i%3]);
 // Bedroom and study.
 box(2.25,.35,3,1.9,.25,-2.6,0x856f5d);box(2.25,.22,3,1.9,.54,-2.6,0xf1e8d7);box(2.4,1.1,.16,1.9,.6,-4.15,0x718f86);
 const blanket=box(2.3,.12,1.95,1.85,.71,-2.05,0x8ea7bd);blanket.rotation.y=.2;
 const pillow=box(.85,.18,.5,1.4,.76,-3.6,0xfbf2e5);pillow.rotation.y=-.22;box(.85,.18,.5,2.4,.76,-3.6,0xfbf2e5);
 box(1.6,.12,.8,4.7,.9,-3,0xc8ab84);box(.12,.85,.6,4.05,.43,-3,0x698881);box(.12,.85,.6,5.35,.43,-3,0x698881);
 box(.85,.6,.1,4.7,1.3,-3.23,0x334a53);const screen=box(.72,.44,.02,4.7,1.3,-3.16,0xe2a56f);box(.6,.04,.25,4.7,.99,-2.85,0x596c72);
 const aiTicks=[];for(let i=0;i<4;i++)aiTicks.push(box(.45,.035,.015,4.7,1.45-i*.1,-3.14,0xb9f2d6));
 // Laundry: washer, basket, shelf. Bathroom: shower, toilet, sink.
 box(.95,1,.8,1.35,.5,3.95,0xf1ede2);const drum=cylinder(.32,.06,1.35,.53,3.51,0x445f6b);drum.rotation.x=Math.PI/2;box(.7,.55,.6,2.6,.28,3.8,0xbe9871);
 box(1.7,.1,.6,1.6,1.3,4.4,0x9d8e74);box(.7,.65,.65,4.8,.35,3.9,0xf3f1e7);cylinder(.37,.2,4.8,.42,3.5,0xf3f1e7);cylinder(.22,.02,4.8,.53,3.5,0xa1b5bb);
 box(.8,.8,.6,4.7,.4,1,0x5e8889);box(.88,.09,.72,4.7,.85,1,0xf5f0df);box(.35,.035,.3,4.7,.9,1,0x91a6a7);
 box(1.05,.08,1.15,5.2,.1,2.3,0xe5e8df);box(.05,1.5,1.1,5.7,.8,2.3,0x9bb8ba);
 // Small props visibly disappear only as their chore is completed.
 const mess=CHORES.map(()=>[]),results=CHORES.map(()=>[]);
 for(let i=0;i<18;i++)mess[0].push(box(.06,.045,.1,-4.5+(i%6)*.55,.11,1.2+Math.floor(i/6)*.7,0x655745));
 for(let i=0;i<5;i++)mess[1].push(cylinder(.25,.045,-3.35+(i%2)*.6,.89+Math.floor(i/2)*.045,-1.9,0xf9f3df));
 for(let i=0;i<4;i++)mess[2].push(box(.22,.17,.2,-3.8+i*.3,1.04,-4.4,[0xb68048,0x82a462][i%2]));
 results[2].push(cylinder(.38,.05,-3,.88,-1.9,0xf6edd8));for(let i=0;i<3;i++)results[2].push(cylinder(.09,.1,-3.2+i*.2,.96,-1.9,0xb89754));
 for(let i=0;i<7;i++){const cloth=box(.45,.1,.35,2.4+(i%2)*.35,.55+Math.floor(i/2)*.1,3.7,0x9a8cac);cloth.rotation.y=i*.6;mess[3].push(cloth);}
 for(let i=0;i<4;i++)results[3].push(box(.6,.09,.45,1.5,1.42+i*.09,4.4,0x9a8cac));
 for(let i=0;i<5;i++)mess[5].push(cylinder(.1,.015,4.1+i*.22,.12,2.7,0x8b987d));
 function actor(robot){const g=new THREE.Group();const color=robot?0xc5ebe1:0xe3a36d;box(.34,.45,.23,0,.71,0,color,g);box(.28,.27,.25,0,1.08,0,robot?0xe8f5ec:0xe3bd99,g);if(robot)box(.2,.075,.018,0,1.1,.134,0x304f59,g);const arms=[];for(const x of [-.25,.25])arms.push(box(.12,.44,.13,x,.69,0,color,g));for(const x of [-.11,.11])box(.13,.42,.14,x,.26,0,0x46616e,g);scene.add(g);return {g,arms};}
 const robot=actor(true),human=actor(false);const vacuum=new THREE.Group();cylinder(.31,.17,0,.13,0,0xa3d9cf,vacuum);cylinder(.11,.035,0,.23,0,0x385c63,vacuum);scene.add(vacuum);
 const ring=new THREE.Mesh(new THREE.RingGeometry(.56,.63,48),new THREE.MeshBasicMaterial({color:0xa7ead0,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.09;scene.add(ring);
 // Plants soften the cutaway without obstructing a task.
 for(const [x,z] of [[-5.2,1.9],[5.3,-4.3]]){cylinder(.23,.38,x,.2,z,0xad8264);for(let i=0;i<5;i++){const leaf=new THREE.Mesh(new THREE.SphereGeometry(.23,8,6),mat(0x6e9077));leaf.scale.set(.6,1.5,.6);leaf.position.set(x+Math.sin(i)*.15,.65,z+Math.cos(i)*.15);scene.add(leaf);}}
 let top=false,zoom=1;function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);const aspect=w/h,span=Math.max(7.6,8/aspect)/zoom;camera.left=-span*aspect;camera.right=span*aspect;camera.top=span;camera.bottom=-span;camera.position.set(top?0:11,top?22:16,top?0.01:15);camera.lookAt(0,0,0);camera.updateProjectionMatrix();}
 new ResizeObserver(resize).observe(host);resize();
 const dock=new THREE.Vector3(-.55,0,4.2),pos=new THREE.Vector3();
 const paths=[[],[[-.55,4.2],[-.55,-.6],[-2.3,-1.1]],[[-2.3,-1.1],[-1.2,-1.1],[-1.2,-3.1],[-3,-3.1]],[[-3,-3.1],[-.55,-3.1],[-.55,.6],[2.4,.6],[2.4,2.8]],[[2.4,2.8],[2.4,.5],[3.35,.5],[3.35,-1.8]],[[3.35,-1.8],[3.35,.5],[3,1.8],[4.05,1.8],[4.05,2.2]]];
 function route(points,progress){const lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1]));let distance=progress*lengths.reduce((a,b)=>a+b,0);for(let i=0;i<lengths.length;i++){if(distance<=lengths[i]||i===lengths.length-1){const f=Math.min(1,distance/lengths[i]);return pos.set(points[i][0]+(points[i+1][0]-points[i][0])*f,0,points[i][1]+(points[i+1][1]-points[i][1])*f);}distance-=lengths[i];}}
 function render(s,snapshot){const {done,index,work,phase,complete}=snapshot;mess.forEach((objects,i)=>objects.forEach((m,j)=>m.visible=i>index||i===index&&work<(j+1)/objects.length&&done<=i));results.forEach((objects,i)=>objects.forEach(m=>m.visible=done>i));
  const made=done>4?1:index===4?work:0;blanket.rotation.y=.2*(1-made);blanket.position.x=1.85+.05*made;pillow.rotation.y=-.22*(1-made);
  screen.material=mat(done===7?0x76cbb6:0xe2a56f);aiTicks.forEach((m,i)=>m.visible=done===7||index===6&&work>(i+1)/4);
  const task=CHORES[index];
  if(task.actor==='robot'&&!complete){route(paths[index],Math.min(1,phase/.25));robot.g.position.copy(pos);robot.g.rotation.y=Math.PI;robot.arms.forEach((arm,i)=>arm.rotation.x=work>0?Math.sin(s.time*5+i)*.5:0);}else{robot.g.position.copy(dock);robot.arms.forEach(a=>a.rotation.x=0);}
  const v=done>0?1:index===0?phase:0;vacuum.position.set(-4.4+Math.sin(v*Math.PI*6)*1.2,0,1.1+v*2.5);if(done>0)vacuum.position.set(-5,0,3.6);
  human.g.position.set(complete?-2.4:-1.2,complete?.1:0,complete?3.65:-1.2);human.g.rotation.y=complete?Math.PI:0;
  ring.visible=!complete;ring.position.x=task.position[0];ring.position.z=task.position[1];ring.material.color.set(task.actor==='ai'?0xb9b1ff:0xa7ead0);
  renderer.render(scene,camera);
 }
 function project(x,z){const p=new THREE.Vector3(x,.15,z).project(camera);return {x:(p.x+1)*host.clientWidth/2,y:(1-p.y)*host.clientHeight/2};}
 return {render,project,toggleView(){top=!top;resize();return top;},zoomBy(f){zoom=Math.max(.85,Math.min(1.5,zoom*f));resize();}};
}
