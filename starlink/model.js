// Teaching constellation: reduced sample, illustrative shells and gateways, never live telemetry.
export const R_EARTH=6371,MU=398600.4418,C=299792.458,MIN_ELEV=25,GEO_ALT=35786;
export const SNAPSHOT={date:'2026-09-13',active:11118,inOrbit:11133,launched:12935,source:'Jonathan McDowell / independent tracking'};
export const SHELLS=[
 {id:'mid53',alt:480,inc:53,planes:18,perPlane:12,color:0x6ee7c5,es:'Media latitud · 53° · ~480 km',en:'Mid-latitude · 53° · ~480 km',detail:['Capa principal de banda ancha. En 2026 Starlink está bajando muchos satélites desde ~550 km hacia ~480 km.','Main broadband layer. In 2026 Starlink is lowering many satellites from ~550 km toward ~480 km.']},
 {id:'low43',alt:480,inc:43,planes:12,perPlane:10,color:0x7eb8ff,es:'Bajas latitudes · 43° · ~480 km',en:'Lower latitudes · 43° · ~480 km',detail:['Cierra huecos cerca del ecuador, donde una órbita a 53° pasa menos tiempo.','Fills gaps near the equator, where a 53° orbit spends less time.']},
 {id:'high70',alt:570,inc:70,planes:8,perPlane:8,color:0xf0c075,es:'Altas latitudes · 70° · ~570 km',en:'High latitudes · 70° · ~570 km',detail:['Cubre Canadá, norte de Europa y el océano Ártico mejor que las capas a 53°.','Covers Canada, northern Europe and the Arctic Ocean better than the 53° shells.']},
 {id:'polar',alt:560,inc:97.6,planes:6,perPlane:8,color:0xd4a5ff,es:'Polar / heliosíncrona · 97,6°',en:'Polar / sun-sync · 97.6°',detail:['Los polos no se cubren con órbitas inclinadas a 53°. Esta capa pasa sobre ellos.','The poles are not covered by 53° orbits. This shell flies over them.']}
];
export const GATEWAYS=[{id:'us',lat:47.6,lon:-122.3,es:'Pasarela · costa oeste',en:'Gateway · west coast'},{id:'eu',lat:51.5,lon:0,es:'Pasarela · Europa',en:'Gateway · Europe'},{id:'au',lat:-33.9,lon:151.2,es:'Pasarela · Australia',en:'Gateway · Australia'}];
export function period(alt){const a=R_EARTH+alt;return 2*Math.PI*Math.sqrt(a*a*a/MU);}
export function lightMs(km){return 1000*km/C;}
export function geoOneWayMs(){return lightMs(GEO_ALT);}
export function leoOneWayMs(alt=550){return lightMs(alt);}
export function footprintHalfAngle(alt,minEl=MIN_ELEV){
 const e=minEl*Math.PI/180,r=R_EARTH+alt,sinEta=Math.min(1,(R_EARTH/r)*Math.cos(e)),eta=Math.asin(sinEta);
 return Math.PI/2-e-eta;
}
export function footprintKm(alt,minEl=MIN_ELEV){return R_EARTH*footprintHalfAngle(alt,minEl);}
export function eci(alt,incDeg,raan,u){
 const r=R_EARTH+alt,x=r*Math.cos(u),y=r*Math.sin(u),i=incDeg*Math.PI/180,y1=y*Math.cos(i),z1=y*Math.sin(i),c=Math.cos(raan),s=Math.sin(raan);
 return {x:x*c-y1*s,y:x*s+y1*c,z:z1};
}
export function geodetic(lat,lon,alt=0){
 const la=lat*Math.PI/180,lo=lon*Math.PI/180,r=R_EARTH+alt,cl=Math.cos(la);
 return {x:r*cl*Math.cos(lo),y:r*cl*Math.sin(lo),z:r*Math.sin(la)};
}
function sub(a,b){return {x:a.x-b.x,y:a.y-b.y,z:a.z-b.z};}
function dot(a,b){return a.x*b.x+a.y*b.y+a.z*b.z;}
function hypot3(a){return Math.hypot(a.x,a.y,a.z);}
function norm(a){const n=hypot3(a)||1;return {x:a.x/n,y:a.y/n,z:a.z/n};}
export function elevation(ground,sat){const look=norm(sub(sat,ground)),up=norm(ground),s=Math.min(1,Math.max(-1,dot(look,up)));return Math.asin(s)*180/Math.PI;}
export function distance(a,b){return hypot3(sub(a,b));}
export function buildConstellation(enabled){
 const sats=[];
 for(const sh of SHELLS){
  if(enabled&&!enabled.has(sh.id))continue;
  for(let p=0;p<sh.planes;p++){
   const raan=p*2*Math.PI/sh.planes;
   for(let k=0;k<sh.perPlane;k++)sats.push({id:sats.length,shell:sh.id,alt:sh.alt,inc:sh.inc,raan,u0:k*2*Math.PI/sh.perPlane+p*.12,plane:p,slot:k,color:sh.color});
  }
 }
 return sats;
}
export function satPosition(sat,t){return eci(sat.alt,sat.inc,sat.raan,sat.u0+2*Math.PI*t/period(sat.alt));}
export function positionsAt(sats,t){return sats.map(s=>satPosition(s,t));}
export function inView(ground,satPos,minEl=MIN_ELEV){return elevation(ground,satPos)>=minEl;}
export function visibleSats(ground,sats,pos,minEl=MIN_ELEV){
 return sats.map((s,i)=>({s,i,el:elevation(ground,pos[i])})).filter(x=>x.el>=minEl).sort((a,b)=>b.el-a.el);
}
// Geometric candidates only: these are not Starlink's private link assignments.
export const MAX_ISL_KM=5000;
export function lineOfSight(a,b){
 const d=sub(b,a),dd=dot(d,d);
 if(!dd)return hypot3(a)>=R_EARTH-1e-6;
 const u=Math.max(0,Math.min(1,-dot(a,d)/dd));
 return Math.hypot(a.x+u*d.x,a.y+u*d.y,a.z+u*d.z)>=R_EARTH-1e-6;
}
export function laserLink(a,b){return distance(a,b)<=MAX_ISL_KM&&lineOfSight(a,b);}
export function routePacket(user,sats,pos,lasers,gws=GATEWAYS){
 const vis=visibleSats(user,sats,pos);
 if(!vis.length)return {ok:false,reason:'none',hops:[],ms:0,mode:'none',inView:0};
 const costs=new Float64Array(sats.length).fill(Infinity),prev=new Int32Array(sats.length).fill(-1),done=new Uint8Array(sats.length);
 for(const v of vis)costs[v.i]=distance(user,pos[v.i]);
 const gates=gws.map(gw=>({gw,p:geodetic(gw.lat,gw.lon)}));
 let best=Infinity,end=-1,gate=null;
 for(let k=0;k<sats.length;k++){
  let i=-1,least=Infinity;
  for(let j=0;j<sats.length;j++)if(!done[j]&&costs[j]<least){least=costs[j];i=j;}
  if(i<0||least>=best)break;
  done[i]=1;
  for(const g of gates)if(inView(g.p,pos[i])){
   const total=least+distance(pos[i],g.p);
   if(total<best){best=total;end=i;gate=g;}
  }
  if(!lasers)continue;
  for(let j=0;j<sats.length;j++)if(!done[j]&&laserLink(pos[i],pos[j])){
   const total=least+distance(pos[i],pos[j]);
   if(total<costs[j]){costs[j]=total;prev[j]=i;}
  }
 }
 if(end<0){const v=vis[0];return {ok:false,reason:lasers?'mesh':'gateway',hops:[{kind:'user',p:user},{kind:'uplink',i:v.i,p:pos[v.i]}],ms:0,km:0,mode:lasers?'laser-mesh':'bent-pipe',serve:v.i,elevation:v.el,inView:vis.length,laserHops:0};}
 const chain=[];for(let i=end;i>=0;i=prev[i])chain.unshift(i);
 const hops=[{kind:'user',p:user},...chain.map((i,k)=>({kind:k?'laser':'uplink',i,p:pos[i]})),{kind:'gateway',p:gate.p,gw:gate.gw}];
 const km=pathLen(hops),laserHops=chain.length-1;
 return {ok:true,reason:laserHops?'laser':'bent',hops,km,ms:lightMs(km),mode:laserHops?'laser-mesh':'bent-pipe',serve:chain[0],elevation:elevation(user,pos[chain[0]]),laserHops,inView:vis.length};
}
function pathLen(hops){let n=0;for(let i=1;i<hops.length;i++)n+=distance(hops[i-1].p,hops[i].p);return n;}
// Refresh a cached route against the positions actually being drawn. Null means reroute.
export function refreshRoute(route,user,sats,pos){
 if(!route?.hops.length)return null;
 const hops=route.hops.map(h=>({...h,p:h.kind==='user'?user:h.i!=null?pos[h.i]:h.p}));
 if(!hops[1]?.p||!inView(user,hops[1].p))return null;
 for(let i=2;i<hops.length;i++){
  if(hops[i].kind==='laser'&&!laserLink(hops[i-1].p,hops[i].p))return null;
  if(hops[i].kind==='gateway'&&!inView(hops[i].p,hops[i-1].p))return null;
 }
 const km=route.ok?pathLen(hops):0;
 return {...route,hops,km,ms:lightMs(km),elevation:elevation(user,hops[1].p),inView:visibleSats(user,sats,pos).length};
}
export function coverageGrid(sats,pos,step=15){
 const cells=[];let covered=0,total=0;
 for(let lat=-75;lat<=75;lat+=step){
  for(let lon=-180;lon<180;lon+=step){
   const g=geodetic(lat,lon),n=visibleSats(g,sats,pos).length;total++;if(n)covered++;
   cells.push({lat,lon,n});
  }
 }
 return {cells,covered,total,fraction:total?covered/total:0};
}
export function sampleCount(enabled){return buildConstellation(enabled).length;}
