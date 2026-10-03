// Navigation dimensions belong to the teaching scenes, not to real facilities.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite);
const obstacle=(x,z,w,d)=>({min:[x-w/2,z-d/2],max:[x+w/2,z+d/2]});
const buildings=[];
for(let row=0;row<2;row++)for(let i=0;i<9;i++)buildings.push(obstacle(-17+i*4,-13-row*6,2.7,3));
const racks=[];
for(const x of [-7,-3,3,7])for(let z=-9;z<=3;z+=4)racks.push(obstacle(x,z,1.45,1.45));
const definitions={
 city:{mode:'walk',grounded:true,eyeHeight:1.8,bounds:{min:[-21,1.8,-21],max:[21,1.8,21]},start:[1.5,1.8,3.6],yaw:0,obstacles:[obstacle(0,0,3.8,1.9),obstacle(0,2.1,1.4,1.25),obstacle(-2.7,-1.9,.6,.6),obstacle(2.4,-.2,1.1,1),obstacle(0,-2.95,7.1,.2),obstacle(-3.4,-1,.2,4),obstacle(6,-5,1.4,.9),obstacle(-8,-10,5.3,3.3),...buildings]},
 landing:{mode:'walk',grounded:true,eyeHeight:1.95,bounds:{min:[-13,1.95,-6],max:[-3.8,1.95,6]},start:[-8,1.95,4.6],yaw:0,obstacles:[obstacle(-8,-2,7.1,.25),obstacle(-11.45,0,.25,4),...[-10,-8.2,-6.4].map(x=>obstacle(x,-1,1.45,1.45))]},
 server:{mode:'walk',grounded:true,eyeHeight:1.65,bounds:{min:[-10.8,1.65,-11.8],max:[10.8,1.65,10.8]},start:[0,1.65,9],yaw:0,obstacles:racks},
 ocean:{mode:'observe',grounded:false,bounds:{min:[-30,-.4,-18],max:[30,12,18]},start:[8,4,11],yaw:.45,obstacles:[]},
 earth:{mode:'orbit',grounded:false,bounds:{radius:[12,42],elevation:[-.95,1.25]},start:[-14.5,12,24],yaw:0,obstacles:[]}
};
for(const spec of Object.values(definitions)){for(const box of spec.obstacles){Object.freeze(box.min);Object.freeze(box.max);Object.freeze(box);}Object.freeze(spec.obstacles);Object.freeze(spec.start);if(spec.bounds.min){Object.freeze(spec.bounds.min);Object.freeze(spec.bounds.max);}else{Object.freeze(spec.bounds.radius);Object.freeze(spec.bounds.elevation);}Object.freeze(spec.bounds);Object.freeze(spec);}
export const VOYAGE_NAVIGATION=Object.freeze(definitions);
export function navigationFor(scene){return VOYAGE_NAVIGATION[scene]||VOYAGE_NAVIGATION.city;}
export function collides(position,spec,radius=.23){return spec.obstacles.some(o=>position[0]>o.min[0]-radius&&position[0]<o.max[0]+radius&&position[2]>o.min[1]-radius&&position[2]<o.max[1]+radius);}
export function safePosition(scene,position){
 const spec=navigationFor(scene),p=finite(position)?position.slice():spec.start.slice();
 if(spec.mode==='orbit'){const length=Math.hypot(...p);if(!length)return spec.start.slice();const r=clamp(length,...spec.bounds.radius);return p.map(n=>n*r/length);}
 for(let i=0;i<3;i++)p[i]=clamp(p[i],spec.bounds.min[i],spec.bounds.max[i]);
 if(spec.grounded)p[1]=spec.eyeHeight;
 return spec.grounded&&collides(p,spec)?spec.start.slice():p;
}
export function moveInScene(scene,position,{yaw=0,pitch=0,forward=0,side=0,vertical=0,dt=0}={}){
 const spec=navigationFor(scene),p=safePosition(scene,position),seconds=clamp(Number.isFinite(dt)?dt:0,0,.1);
 if(spec.mode==='orbit')return p;
 const flat=spec.grounded?1:Math.cos(pitch),dy=spec.grounded?0:Math.sin(pitch)*forward+vertical;
 const delta=[-Math.sin(yaw)*forward*flat+Math.cos(yaw)*side,dy,-Math.cos(yaw)*forward*flat-Math.sin(yaw)*side];
 const length=Math.hypot(...delta);if(!length)return p;
 const speed=spec.grounded?2.8:4.2;for(let i=0;i<3;i++)delta[i]*=speed*seconds/length;
 // Resolve each horizontal axis separately so a person slides along equipment.
 for(const axis of [0,2,1]){const candidate=p.slice();candidate[axis]=clamp(p[axis]+delta[axis],spec.bounds.min[axis],spec.bounds.max[axis]);if(!spec.grounded||!collides(candidate,spec))p[axis]=candidate[axis];}
 if(spec.grounded)p[1]=spec.eyeHeight;return p;
}
export function orbitFromPosition(position){const radius=Math.hypot(...position)||24;return {azimuth:Math.atan2(position[0],position[2]),elevation:Math.asin(clamp(position[1]/radius,-1,1)),radius};}
export function orbitPosition(orbit){const s=navigationFor('earth'),radius=clamp(orbit.radius,...s.bounds.radius),elevation=clamp(orbit.elevation,...s.bounds.elevation),azimuth=Number.isFinite(orbit.azimuth)?orbit.azimuth:0;return [Math.sin(azimuth)*Math.cos(elevation)*radius,Math.sin(elevation)*radius,Math.cos(azimuth)*Math.cos(elevation)*radius];}
