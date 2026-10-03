import {STAGES,sample,YEARS} from './model.js';
import {missionPose,deliveryEvents,deliveriesAt} from './mission.js';
const schedules=new WeakMap(),freeze=o=>{if(o&&typeof o==='object'){for(const value of Object.values(o))freeze(value);Object.freeze(o);}return o;};
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function lunarFrameAt(run,index=0,progress=0,options={}){
 if(!Number.isInteger(index)||index<0||index>=STAGES.length||typeof progress!=='number'||!Number.isFinite(progress))throw new RangeError('Valid lunar stage and finite progress required');
 const p=clamp(progress,0,1),lesson=STAGES[index],next=STAGES[index+1],source=options.source==='manual'||options.source==='growth'?options.source:'narration';
 let month=lesson.month+Math.max(0,(next?.month??lesson.month)-lesson.month)*p;
 if(options.month!==undefined){if(typeof options.month!=='number'||!Number.isFinite(options.month))throw new RangeError('Finite lunar month required');month=clamp(options.month,0,YEARS*12);}
 const view=options.view??lesson.view;if(!['mission','route','base','growth'].includes(view))throw new RangeError('Invalid lunar view');
 const row=sample(run,month),mission=index<7?missionPose(lesson.id,p):null;
 if(!schedules.has(run))schedules.set(run,deliveryEvents(run));
 const deliveries=deliveriesAt(schedules.get(run),month),inFlightCount=deliveries.reduce((n,event)=>n+event.count,0);
 // Animate a labelled example of the last completed month's industrial work.
 // It replays the mechanism without crediting output, using future deliveries,
 // or pretending that an arbitrary scene fraction is real lunar process time.
 const operation={active:row.month>0&&row.build>0,month:row.month,progress:month>=YEARS*12?1:month%1,kind:'completed-month-example',build:row.build,local:row.localMade,imported:row.build-row.localMade};
 return freeze({index,progress:p,visualTime:(index+p)*20,stage:lesson.id,lesson,month,source,view,row,mission,operation,deliveries,inFlightCount,
 signals:{request:mission?'mission':'industry',refuel:mission?.refuel??null,cargoLocation:mission?.cargoLocation??null,installed:row.capital,localIncorporated:row.localIncorporated,importsConsumed:row.usedImports,stock:row.stock,active:operation.active,complete:p===1}});
}
export const frameAt=lunarFrameAt;

