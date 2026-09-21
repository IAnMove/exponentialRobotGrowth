import {createRegion,tickRegion,STEP,END,counts} from './region-model.js';
export {STEP,END};
export const SECTORS=[
 {name:'Urban logistics',tasks:80,limits:[.35,.65,.85],description:'Delivery, sorting and warehouses. Driving and access depend on the environment and supervision.'},
 {name:'Retail and food',tasks:120,limits:[.2,.5,.75],description:'Stocking, preparation and cleaning. Service, exceptions and decisions still require people.'},
 {name:'Construction and repair',tasks:100,limits:[.25,.6,.8],description:'Material handling and repeatable operations. Design, coordination and changing environments retain human tasks.'},
 {name:'Cleaning and maintenance',tasks:80,limits:[.4,.7,.9],description:'Cleaning spaces and routine maintenance. Access, breakdowns and unexpected situations limit automation.'},
 {name:'Care and health',tasks:100,limits:[.1,.25,.4],description:'Internal transport, materials and physical support. Personal care, clinical judgment and responsibility remain human.'},
 {name:'Education and services',tasks:120,limits:[.05,.15,.3],description:'Logistics, spaces and simple administrative support. Teaching, supporting people and deciding are not shown as fully replaced.'}
];
export const TOTAL_TASKS=SECTORS.reduce((a,s)=>a+s.tasks,0);
export const FULL_END=300;
export function createCity(scenario=3,share=.35){const industry=createRegion(.6,true);industry.end=scenario===3?FULL_END:END;industry.exportShare=share;return {industry,scenario,share,assigned:SECTORS.map(()=>0),pending:[],available:0,received:0,dispatched:0,history:[]};}
export const eligible=s=>SECTORS.map(t=>Math.floor(t.tasks*(s.scenario===3?1:t.limits[s.scenario])));
export function tickCity(s){
 if(s.industry.time>=s.industry.end)return;
 s.industry.exportShare=s.share;const before=s.industry.exported;tickRegion(s.industry);const newRobots=s.industry.exported-before;
 if(newRobots){s.pending.push({count:newRobots,ready:s.industry.time+1});s.dispatched+=newRobots;}
 s.pending=s.pending.filter(p=>{if(p.ready<=s.industry.time+1e-8){s.available+=p.count;s.received+=p.count;return false;}return true;});
 const cap=eligible(s);
 while(s.available>0){const choices=SECTORS.map((_,i)=>i).filter(i=>s.assigned[i]<cap[i]);if(!choices.length)break;const selected=choices.reduce((a,b)=>s.assigned[a]/cap[a]<=s.assigned[b]/cap[b]?a:b);s.assigned[selected]++;s.available--;}
 const t=s.industry.time;
 if(!s.history.length||t-s.history.at(-1).time>=1-1e-8||t>=s.industry.end)s.history.push({time:t,assigned:[...s.assigned],covered:s.assigned.reduce((a,b)=>a+b,0),made:s.industry.built,industryFleet:s.industry.fleet,facilities:counts(s.industry).reduce((a,b)=>a+b,0)});
}
export function advanceCity(s,cycles){for(let i=0;i<Math.round(cycles/STEP);i++)tickCity(s);return s;}
