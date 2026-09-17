import {createRegion,tickRegion,STEP,END} from './region-model.js';
import {SECTORS,FULL_END} from './city-model.js';
import {recordDoublings} from './learning-model.js';
export const TOWNS=[
 {name:'River city',tasks:[24,36,30,24,30,36],travel:1},
 {name:'Central city',tasks:[32,48,40,32,40,48],travel:3},
 {name:'Valley city',tasks:[24,36,30,24,30,36],travel:5}
];
export const townCapacity=t=>t.tasks.map((n,i)=>Math.floor(n*(t.full?1:SECTORS[i].limits[1])));
export const covered=t=>t.assigned.reduce((a,b)=>a+b,0);
export function createTerritory(share=.4,auto=true,delivery=.35,full=false){
 const s=createRegion(share,auto);s.end=full?FULL_END:END;s.full=full;s.delivery=delivery;s.exportShare=delivery;
 s.towns=TOWNS.map(t=>({full,tasks:[...t.tasks],travel:t.travel,assigned:t.tasks.map(()=>0),reserved:0,received:0}));
 s.shipments=[];s.depot=0;s.delivered=0;s.urbanHistory=[];s.doublings=[];return s;
}
export function tickTerritory(s){
 if(s.time>=s.end)return;
 const before=s.exported;s.exportShare=s.delivery;tickRegion(s);s.depot+=s.exported-before;recordDoublings(s);
 // Completed robots leave the industrial workforce before being dispatched.
 // Reserve only feasible tasks, so cities never receive duplicate allocations.
 while(s.depot>0){
  const options=s.towns.map((t,i)=>i).filter(i=>covered(s.towns[i])+s.towns[i].reserved<townCapacity(s.towns[i]).reduce((a,b)=>a+b,0));
  if(!options.length)break;
  const i=options.reduce((a,b)=>{
   const ratio=j=>(covered(s.towns[j])+s.towns[j].reserved)/townCapacity(s.towns[j]).reduce((x,y)=>x+y,0);
   return ratio(a)<=ratio(b)?a:b;
  });
  const t=s.towns[i];t.reserved++;s.depot--;
  s.shipments.push({town:i,count:1,depart:s.time,ready:s.time+t.travel});
 }
 s.shipments=s.shipments.filter(p=>{
  if(p.ready>s.time+1e-8)return true;
  const t=s.towns[p.town],cap=townCapacity(t),options=cap.map((n,i)=>i).filter(i=>t.assigned[i]<cap[i]);
  const i=options.reduce((a,b)=>t.assigned[a]/cap[a]<=t.assigned[b]/cap[b]?a:b);
  t.assigned[i]++;t.reserved--;t.received++;s.delivered++;return false;
 });
 if(!s.urbanHistory.length||s.time-s.urbanHistory.at(-1).time>=1-1e-8||s.time>=s.end)
  s.urbanHistory.push({time:s.time,total:s.fleet+s.exported,covered:s.towns.map(covered),delivered:s.delivered,rate:s.flow[3]});
}
export function advanceTerritory(s,cycles){for(let i=0;i<Math.round(cycles/STEP);i++)tickTerritory(s);return s;}
