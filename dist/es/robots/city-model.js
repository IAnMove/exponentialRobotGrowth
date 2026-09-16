import {createRegion,tickRegion,STEP,END,counts} from './region-model.js';
export {STEP,END};
export const SECTORS=[
 {name:'Logística urbana',tasks:80,limits:[.35,.65,.85],description:'Reparto, clasificación y almacenes. Las tareas de conducción y acceso dependen del entorno y de la supervisión.'},
 {name:'Comercio y alimentación',tasks:120,limits:[.2,.5,.75],description:'Reposición, preparación y limpieza. La atención, las excepciones y las decisiones siguen requiriendo personas.'},
 {name:'Construcción y reparación',tasks:100,limits:[.25,.6,.8],description:'Transporte de material y operaciones repetibles. Diseñar, coordinar y trabajar en entornos cambiantes mantiene tareas humanas.'},
 {name:'Limpieza y mantenimiento',tasks:80,limits:[.4,.7,.9],description:'Limpieza de espacios y mantenimiento rutinario. El acceso, las averías y las situaciones inesperadas limitan la automatización.'},
 {name:'Cuidados y salud',tasks:100,limits:[.1,.25,.4],description:'Transporte interno, material y apoyo físico. El cuidado personal, el juicio clínico y la responsabilidad permanecen en manos humanas.'},
 {name:'Educación y servicios',tasks:120,limits:[.05,.15,.3],description:'Apoyo logístico, espacios y tareas administrativas simples. Enseñar, acompañar y decidir no se representan como sustituidos por completo.'}
];
export const TOTAL_TASKS=SECTORS.reduce((a,s)=>a+s.tasks,0);
export function createCity(scenario=1,share=.35){const industry=createRegion(.6,true);industry.exportShare=share;return {industry,scenario,share,assigned:SECTORS.map(()=>0),pending:[],available:0,received:0,dispatched:0,history:[]};}
export const eligible=s=>SECTORS.map(t=>Math.floor(t.tasks*t.limits[s.scenario]));
export function tickCity(s){
 if(s.industry.time>=END)return;
 s.industry.exportShare=s.share;const before=s.industry.exported;tickRegion(s.industry);const newRobots=s.industry.exported-before;
 if(newRobots){s.pending.push({count:newRobots,ready:s.industry.time+1});s.dispatched+=newRobots;}
 s.pending=s.pending.filter(p=>{if(p.ready<=s.industry.time+1e-8){s.available+=p.count;s.received+=p.count;return false;}return true;});
 const cap=eligible(s);
 while(s.available>0){const choices=SECTORS.map((_,i)=>i).filter(i=>s.assigned[i]<cap[i]);if(!choices.length)break;const selected=choices.reduce((a,b)=>s.assigned[a]/cap[a]<=s.assigned[b]/cap[b]?a:b);s.assigned[selected]++;s.available--;}
 const t=s.industry.time;
 if(!s.history.length||t-s.history.at(-1).time>=1-1e-8||t>=END)s.history.push({time:t,assigned:[...s.assigned],covered:s.assigned.reduce((a,b)=>a+b,0),made:s.industry.built,industryFleet:s.industry.fleet,facilities:counts(s.industry).reduce((a,b)=>a+b,0)});
}
export function advanceCity(s,cycles){for(let i=0;i<Math.round(cycles/STEP);i++)tickCity(s);return s;}
