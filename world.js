import * as THREE from './vendor/three.module.js';

export const WORLD={width:98,depth:90,home:{x:-35,z:38},park:{x:-35,z:-4},canteen:{x:-35,z:13},charging:{x:35,z:38},hub:{x:11,z:37}};
export function createWorld(scene,industries){
  const materials=new Map(),cube=new THREE.BoxGeometry(1,1,1);
  function mat(color,roughness=.75,metalness=.05){const key=color+':'+roughness; if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness,metalness}));return materials.get(key);}
  function box(parent,x,y,z,w,h,d,m,shadow=true){const o=new THREE.Mesh(cube,m);o.position.set(x,y,z);o.scale.set(w,h,d);o.castShadow=shadow;o.receiveShadow=true;parent.add(o);return o;}
  function cyl(parent,x,y,z,r,h,m,segments=12){const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,segments),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
  function pipe(parent,a,b,r,m){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),mid=p.clone().add(q).multiplyScalar(.5),o=cyl(parent,mid.x,mid.y,mid.z,r,p.distanceTo(q),m,8);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),q.sub(p).normalize());return o;}
  const palette={white:mat(0xe5efeb),dark:mat(0x253e50),wall:mat(0xacbabc),mint:mat(0x7bbcad),blue:mat(0x6291c6),yellow:mat(0xe6b85e),orange:mat(0xee9959),road:mat(0x334957),floor:mat(0x749296)};
  const windows=new THREE.MeshStandardMaterial({color:0xf8c677,emissive:0xffb35e,emissiveIntensity:.1,roughness:.4});
  const lamps=new THREE.MeshStandardMaterial({color:0xffe3a3,emissive:0xffcf87,emissiveIntensity:.1});
  const board=new THREE.Group();scene.add(board);box(board,0,-.8,3,98,1.4,90,mat(0x2b4354));box(board,0,-.04,3,97.7,.15,89.7,mat(0x425e68));
  const tiles=new THREE.InstancedMesh(cube,mat(0xffffff),33*30);const dummy=new THREE.Object3D(),color=new THREE.Color();let tile=0;
  for(let x=-47;x<=47;x+=3)for(let z=-40;z<=46;z+=3){dummy.position.set(x,.025,z);dummy.scale.set(2.95,.03,2.95);dummy.updateMatrix();tiles.setMatrixAt(tile,dummy.matrix);color.set((Math.round(x+z)%2)?0x496974:0x456571);tiles.setColorAt(tile,color);tile++;}tiles.count=tile;tiles.receiveShadow=true;board.add(tiles);
  for(const z of [-14,8,31,44]){box(board,0,.07,z,94,.08,2.8,palette.road,false);for(let x=-46;x<47;x+=3)box(board,x,.115,z,.85,.015,.09,mat(0x96abae),false);}
  for(const x of [-43,-23,0,24,45]){box(board,x,.07,2,2.8,.08,80,palette.road,false);for(let z=-36;z<43;z+=3)box(board,x,.115,z,.09,.015,.85,mat(0x96abae),false);}
  const groups=[],extensions=[],cranes=[],machines=[];
  function hall(g,accent,width=11){box(g,0,1.65,-3,width,2.7,4.2,palette.wall);box(g,0,3.15,-3,width+.5,.3,4.6,accent);box(g,0,1.9,-.86,width-1,.65,.06,palette.dark);for(let x=-width/2+1;x<width/2;x+=1.6)box(g,x,1.9,-.82,.6,.4,.06,windows,false);}
  function bench(g,x,z,accent){box(g,x,.9,z,2,1,1.7,accent);box(g,x,1.48,z,2.2,.14,1.9,palette.dark);}
  industries.forEach((s,i)=>{
    const g=new THREE.Group();g.position.set(s.x,0,s.z);board.add(g);groups.push(g);
    box(g,0,.19,0,s.kind==='mine'?19:16,.25,14,palette.floor);box(g,0,.34,-6.5,15,.1,.14,palette.white,false);
    if(s.kind==='mine'){
      for(let j=0;j<5;j++){const ring=new THREE.Mesh(new THREE.RingGeometry(1.4+j*1.2,2.6+j*1.2,32),mat([0x756b5b,0x877961,0x9b886a,0xab9678,0xbba687][j]));ring.rotation.x=-Math.PI/2;ring.position.set(-1.4,.4+j*.28,-1.2);ring.receiveShadow=true;g.add(ring);}
      cyl(g,-1.4,.36,-1.2,1.5,.1,mat(0x4d504a),20);
      for(let j=0;j<13;j++){const rock=new THREE.Mesh(new THREE.IcosahedronGeometry(.45+(j%4)*.13,0),mat(j%2?0xa48d68:0x777e73));rock.position.set(-3+(j%5)*.75,.7+Math.floor(j/5)*.15,-2+(j%3)*.7);rock.castShadow=true;g.add(rock);}
      box(g,6.4,1.2,1,3.1,1.8,3.4,palette.orange);box(g,6.4,2.3,1,3.3,.28,3.6,palette.dark);
      const arm=new THREE.Group();arm.position.set(3.7,1.1,-.2);g.add(arm);pipe(arm,[0,0,0],[-1.6,2.7,0],.2,palette.yellow);pipe(arm,[-1.6,2.7,0],[-4.5,1.3,0],.15,palette.yellow);box(arm,-4.6,.95,0,.9,.7,1.1,palette.dark);machines.push({o:arm,site:i,type:'dig'});
      pipe(g,[6,1.3,-1.4],[3,1.3,-4.5],.3,palette.dark);
    }else if(s.kind==='refinery'){
      for(let j=0;j<4;j++){cyl(g,-4.5+j*2.5,2.3,-2.8,1.05,3.8,palette.wall);cyl(g,-4.5+j*2.5,4.3,-2.8,1.08,.2,palette.yellow);pipe(g,[-4.5+j*2.5,3,-2.8],[-4.5+j*2.5,3,.1],.16,palette.yellow);}
      pipe(g,[-4.5,3,.1],[3.2,3,.1],.18,palette.yellow);box(g,5.4,1.8,-2,2.6,3,4,palette.mint);cyl(g,5.4,4.7,-2,.5,3,palette.dark);
      for(let j=0;j<5;j++)box(g,-4+j*1.8,.7,2,1.4,.65,1.2,mat(0xc2ad82));
    }else if(s.kind==='structure'){
      hall(g,palette.blue);for(let j=0;j<3;j++){bench(g,-4+j*4,1.4,palette.blue);box(g,-4+j*4,2.1,1.4,.3,1.1,.3,palette.yellow);box(g,-4+j*4,2.7,1.4,1.3,.25,.9,palette.dark);}
      for(let j=0;j<5;j++)box(g,5.9,.6+j*.16,2,1,.12,3,palette.wall);
    }else if(s.kind==='motor'){
      hall(g,palette.orange);for(let j=0;j<4;j++){bench(g,-4.8+j*3.1,1.6,palette.orange);const wheel=cyl(g,-4.8+j*3.1,1.9,1.6,.6,.65,palette.dark,16);wheel.rotation.z=Math.PI/2;machines.push({o:wheel,site:i,type:'spin'});cyl(g,-4.8+j*3.1,1.93,1.6,.2,.8,palette.yellow,12).rotation.z=Math.PI/2;}
    }else if(s.kind==='battery'){
      hall(g,palette.mint);for(let j=0;j<12;j++){cyl(g,-4.7+(j%6)*1.65,.98,1+Math.floor(j/6)*1.8,.42,1.2,palette.mint);cyl(g,-4.7+(j%6)*1.65,1.62,1+Math.floor(j/6)*1.8,.24,.12,palette.dark);}
    }else if(s.kind==='electronics'){
      hall(g,palette.white);for(let j=0;j<4;j++){box(g,-4+j*2.5,3.7,-3,1.65,.8,1.6,palette.dark);bench(g,-4+j*2.5,1.7,palette.white);box(g,-4+j*2.5,1.62,1.7,.8,.12,.9,palette.mint);for(let k=0;k<3;k++)box(g,-4.2+j*2.5+k*.2,1.74,1.7,.12,.12,.4,palette.dark);}
    }else if(s.kind==='logistics'){
      hall(g,palette.mint);for(let j=0;j<4;j++)box(g,-4.5+j*3,.95,-.82,2,1.5,.08,palette.dark);
      for(let j=0;j<16;j++){const x=-5+(j%8)*1.4,z=1.2+Math.floor(j/8)*1.5;box(g,x,.55,z,1.1,.2,1.1,mat(0x8e795c));box(g,x,1,z,.9,.75,.9,[palette.blue,palette.orange,palette.mint,palette.yellow][j%4]);}
    }else if(s.kind==='assembly'){
      box(g,0,.5,-.5,13,.2,7,palette.floor);box(g,0,1.8,-4,13,2.5,.2,palette.wall);
      for(const x of [-6,6])for(const z of [-4,3])box(g,x,2.2,z,.23,3.7,.23,palette.dark);
      box(g,0,4,-4,12.6,.3,.3,palette.mint);box(g,0,4,3,12.6,.3,.3,palette.mint);
      for(let j=0;j<5;j++){bench(g,-4.8+j*2.4,-.3,palette.white);const arm=new THREE.Group();arm.position.set(-4.8+j*2.4,1.5,-1);g.add(arm);pipe(arm,[0,0,0],[.4,1,0],.13,palette.mint);pipe(arm,[.4,1,0],[1,.7,.1],.1,palette.mint);machines.push({o:arm,site:i,type:'dig'});}
    }else{
      box(g,0,.45,-1,12,.35,7,palette.dark);for(let j=0;j<4;j++){const x=-4.5+j*3;box(g,x,.7,-1,2,.1,5,palette.mint);for(const side of [-1,1])box(g,x+side,2,-2,.13,2.7,.13,palette.wall);box(g,x,3.4,-2,2.2,.18,.2,palette.white);box(g,x,3.27,-2,1.8,.06,.1,windows,false);}
    }
    const extra=new THREE.Group();g.add(extra);extensions.push(extra);
    const crane=new THREE.Group();crane.position.set(7,0,-5);g.add(crane);cranes.push(crane);box(crane,0,3,0,.23,5.8,.23,palette.yellow);box(crane,-2.4,5.7,0,5.7,.2,.23,palette.yellow);pipe(crane,[-4.4,5.6,0],[-4.4,2,0],.03,palette.dark);box(crane,-4.4,1.8,0,.8,.7,.6,palette.orange);crane.visible=false;
  });
  const village=new THREE.Group();village.position.set(WORLD.home.x,0,WORLD.home.z);board.add(village);box(village,0,.1,0,20,.16,14,mat(0x6a9981));
  for(let i=0;i<4;i++){const x=-5+(i%2)*10,z=-3+Math.floor(i/2)*6;box(village,x,1.6,z,6,2.8,4.5,palette.wall);box(village,x,3.2,z,6.5,.35,5,palette.orange);box(village,x,1.1,z+2.3,1,1.9,.08,palette.dark);for(const d of [-1.8,1.8])box(village,x+d,1.9,z+2.3,1,.8,.08,windows,false);}
  const cafe=new THREE.Group();cafe.position.set(WORLD.canteen.x,0,WORLD.canteen.z);board.add(cafe);box(cafe,0,.16,4.5,16,.25,23,mat(0x91a591));box(cafe,0,1.8,-3,11,3.1,5,palette.wall);box(cafe,0,3.5,-3,11.7,.25,5.5,palette.orange);box(cafe,0,1.6,-.45,9,1.7,.08,windows,false);
  for(let i=0;i<19;i++){const x=-5.5+(i%4)*3.6,z=2+Math.floor(i/4)*3;box(cafe,x,.95,z,2.2,.13,1.6,mat(0xc5b48f));box(cafe,x,.5,z,1.6,.85,.17,palette.dark);box(cafe,x,.6,z-1.1,2.1,.15,.45,palette.orange);box(cafe,x,.6,z+1.1,2.1,.15,.45,palette.orange);for(const side of [-1,1])for(const seat of [-.55,.55]){cyl(cafe,x+seat,1.04,z+side*.4,.2,.035,palette.white,10);cyl(cafe,x+seat+.23,1.13,z+side*.5,.06,.16,palette.orange,8);}}
  const park=new THREE.Group();park.position.set(WORLD.park.x,0,WORLD.park.z);board.add(park);box(park,0,.12,0,16,.2,14,mat(0x759b80));box(park,0,.24,0,2,.03,14,mat(0xb2b29b),false);box(park,0,.25,0,16,.03,1.6,mat(0xb2b29b),false);
  for(let j=0;j<6;j++){const x=j%2?-5:5,z=-4+Math.floor(j/2)*4;box(park,x,.7,z,2.3,.18,.65,mat(0xc2ae87));box(park,x,1.05,z-.35,2.3,.65,.12,mat(0xc2ae87));cyl(park,x+(j%2?-1.8:1.8),.8,z,.15,1.4,mat(0x82765e),8);const tree=new THREE.Mesh(new THREE.IcosahedronGeometry(1.05,1),mat(0x7cab8d));tree.position.set(x+(j%2?-1.8:1.8),2.2,z);tree.scale.y=1.3;tree.castShadow=true;park.add(tree);}
  const charge=new THREE.Group();charge.position.set(WORLD.charging.x,0,WORLD.charging.z);board.add(charge);box(charge,0,.2,0,18,.3,13,palette.floor);
  for(let j=0;j<12;j++){const x=-6+(j%6)*2.4,z=-4+Math.floor(j/6)*4;box(charge,x,.95,z,.55,1.4,.45,palette.white);box(charge,x,1.25,z+.25,.3,.6,.07,mat(0x7ad1d5));box(charge,x,.43,z+1,1.8,.12,1.5,palette.mint);}
  const energy=new THREE.Group();energy.position.set(36,0,-28);board.add(energy);box(energy,0,.13,0,14,.2,16,mat(0x648b78));
  for(let j=0;j<12;j++){const p=box(energy,-4.5+(j%3)*4.5,1.2,-5+Math.floor(j/3)*3.5,3.8,.14,2.7,mat(0x294d76,.3,.2));p.rotation.x=-.28;box(energy,p.position.x,.7,p.position.z,.15,1.2,2,palette.dark);}
  const dispatch=new THREE.Group();dispatch.position.set(WORLD.hub.x,0,WORLD.hub.z);board.add(dispatch);box(dispatch,0,.2,0,16,.3,12,palette.floor);for(let j=0;j<6;j++)box(dispatch,-5.5+j*2.2,.4,0,1.6,.12,7,palette.mint);box(dispatch,-7,2.3,-3,.25,4.2,.25,palette.orange);box(dispatch,7,2.3,-3,.25,4.2,.25,palette.orange);box(dispatch,0,4.4,-3,14.3,.3,.3,palette.orange);
  for(const x of [-46,-25,2,26,47])for(const z of [-16,7,30,45]){cyl(board,x,2,z,.08,3.8,palette.dark,8);box(board,x,4,z,1.1,.15,.5,lamps,false);}
  for(let i=0;i<28;i++){const x=i<14?-47+(i%14)*7: i%2?-46:47,z=i<14?-39: -34+Math.floor((i-14)/2)*11;cyl(board,x,.7,z,.12,1.2,mat(0x82765e),6);const tree=new THREE.Mesh(new THREE.IcosahedronGeometry(.9,1),mat(i%2?0x75a28c:0x629b83));tree.position.set(x,2,z);tree.scale.y=1.4;tree.castShadow=true;board.add(tree);}
  function update(frame,time){cranes.forEach((g,i)=>g.visible=Boolean(frame.projects[i]));machines.forEach(m=>{if(!frame.flow[m.site]||!frame.capacity[m.site])return;if(m.type==='spin')m.o.rotation.y=time*1.4;else m.o.rotation.y=Math.sin(time*.8+m.site)*.22;});}
  function rebuild(frame){extensions.forEach((g,i)=>{for(const child of [...g.children])g.remove(child);for(let n=2;n<frame.modules[i];n++){const j=n-2,x=-6+(j%4)*3.3,z=-6.7-Math.floor(j/4)*2;box(g,x,.9,z,2.6,1.4,1.5,palette.wall);box(g,x,1.7,z,2.8,.2,1.7,palette.mint);}});}
  return {board,groups,windows,lamps,mat,box,cyl,palette,update,rebuild};
}
export function roadRoute(from,to){const rows=[-14,8,31,44],cols=[-43,-23,0,24,45],nearest=(v,list)=>list.reduce((a,b)=>Math.abs(v-a)<Math.abs(v-b)?a:b);const a=nearest(from.z,rows),b=nearest(to.z,rows),x=nearest((from.x+to.x)/2,cols);return [from,{x:from.x,z:a},{x,z:a},{x,z:b},{x:to.x,z:b},to];}
export function routePoint(points,t){let total=0;const lengths=points.slice(1).map((p,i)=>{const d=Math.hypot(p.x-points[i].x,p.z-points[i].z);total+=d;return d;});let d=Math.max(0,Math.min(1,t))*total;for(let i=0;i<lengths.length;i++){if(d<=lengths[i]||i===lengths.length-1){const a=points[i],b=points[i+1],u=lengths[i]?Math.min(1,d/lengths[i]):0;return {x:a.x+(b.x-a.x)*u,z:a.z+(b.z-a.z)*u,angle:Math.atan2(b.x-a.x,b.z-a.z)};}d-=lengths[i];}return {...points[0],angle:0};}
