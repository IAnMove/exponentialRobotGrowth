// A reversible educational sample, not Terafab's recipe, floor plan or output.
// Time and material amounts below are presentation units, not seconds, kg or nm.
import {stages as legacyStages} from './process-model.js';

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const finite=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const smooth=v=>{const u=clamp(v);return u*u*(3-2*u);};
const add=(a,b)=>a.map((x,i)=>x+b[i]);
const mix=(a,b,u)=>a.map((x,i)=>x+(b[i]-x)*u);
function freeze(v){if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
function between(t,start,end){return smooth((t-start)/(end-start));}
const pose=(position)=>({position:position.slice(),rotation:[0,0,0],quaternion:[0,0,0,1]});

export const DURATION=130;
export const STAGES=freeze(legacyStages.slice());
export const DIE_IDS=freeze(Array.from({length:9},(_,i)=>'die-'+i));
export const MASK=freeze(Array.from({length:9},(_,i)=>i%3===1));
export const FACTORY_LAYOUT=freeze({
  scope:'Independent learning lab, not a published factory floor plan.',
  waferRadius:.58,waferThickness:.08,waferY:1.7,foupBaseY:1.15,
  foupHeight:1.1,railFoupY:4.4,trolleyY:5.15,portOffsetZ:1.8,
  dieSize:[.23,.03,.23],waferDiePitch:.28,rackDiePitch:.30,
  rackCenter:[1.6,1.72,4.5],handlerRailY:3.6,transferY:3.0,
  waferGripLocal:[0,-.04,0],dieGripLocal:[0,.015,0],
  packageDieLocal:[0,.10,0],packageGripLocal:[0,.25,0],
  packageSize:[.70,.14,.70]
});
export const FAB_LAYOUT=FACTORY_LAYOUT;
function station(id,x,z){
  return {id,center:[x,0,z],dock:[x,1.7,z+1.8],chamber:[x,1.7,z],railDock:[x,4.4,z+1.8]};
}
export const STATIONS=freeze({
  input:station('input',-10,-4),deposit:station('deposit',-4,-4),
  track:station('track',0,-4),expose:station('expose',4,-4),
  etch:station('etch',8,-4),inspect:station('inspect',8,2),
  probe:station('probe',4,2),dice:station('dice',0,2),
  package:station('package',-4,2),final:station('final',-8,2)
});
export const OPERATION_STATIONS=freeze([
  'input','deposit','track','expose','track','etch','etch',
  'inspect','deposit','probe','dice','package','final'
]);
export const PHASES=freeze([
  {id:'lift',start:0,end:1},{id:'travel',start:1,end:2.5},
  {id:'lower',start:2.5,end:3.25},{id:'open',start:3.25,end:3.75},
  {id:'approach',start:3.75,end:4},{id:'transfer-in',start:4,end:5},
  {id:'seal',start:5,end:5.2},{id:'process',start:5.2,end:7.8},
  {id:'unseal',start:7.8,end:8},{id:'transfer-out',start:8,end:9},
  {id:'retract',start:9,end:9.6},{id:'close',start:9.6,end:10}
]);

function gridPoint(index,center,pitch){
  return add(center,[(index%3-1)*pitch,0,(Math.floor(index/3)-1)*pitch]);
}
function waferDiePoint(index,waferPosition){
  return gridPoint(index,add(waferPosition,[0,.055,0]),FACTORY_LAYOUT.waferDiePitch);
}
function rackPoint(index){return gridPoint(index,FACTORY_LAYOUT.rackCenter,FACTORY_LAYOUT.rackDiePitch);}
// Cartesian pick head: lift clear, translate above the tools, then lower.
function liftedPath(from,to,p,height=FACTORY_LAYOUT.transferY){
  p=clamp(p);const a=[from[0],height,from[2]],b=[to[0],height,to[2]];
  if(p<=.25)return mix(from,a,smooth(p/.25));
  if(p<=.75)return mix(a,b,smooth((p-.25)/.5));
  return mix(b,to,smooth((p-.75)/.25));
}
function operationProgress(t,index){return between(t,index*10+5.2,index*10+7.8);}
function phaseAt(index,u,t){
  if(t>=DURATION)return 'complete';
  if(index===10&&u>=5.2&&u<5.8)return 'dice';
  if(index===10&&u>=5.8&&u<6)return 'open-dicer';
  if(index===10&&u>=6&&u<8)return 'rack-transfer';
  if(index===10&&u>=8)return u<9.6?'retract':'close';
  if(index===11)return u<1?'approach-die':u<2?'lift-die':u<4?'carry-die':u<5?'place-die':u<5.2?'retract':u<6.5?'connect-package':u<7.8?'protect-package':'wait';
  if(index===12)return u<1?'approach-package':u<2?'lift-package':u<4?'carry-package':u<5?'socket-package':u<5.2?'retract':u<7.8?'final-continuity-test':'complete';
  return PHASES.find(p=>u>=p.start&&u<p.end)?.id||'close';
}
function loadDoor(u){return u<3.25?0:u<3.75?between(u,3.25,3.75):u<9.6?1:1-between(u,9.6,10);}
function chamberDoor(u,dice=false){
  if(u<3.25)return 0;
  if(u<3.75)return between(u,3.25,3.75);
  if(u<5)return 1;
  if(u<5.2)return 1-between(u,5,5.2);
  const openStart=dice?5.8:7.8,openEnd=8-(dice?2:0);
  if(u<openStart)return 0;
  if(u<openEnd)return between(u,openStart,openEnd);
  if(u<9.6)return 1;
  return 1-between(u,9.6,10);
}
function waferMotion(t){
  const index=Math.min(10,Math.floor(t/10)),u=clamp(t-index*10,0,10),id=OPERATION_STATIONS[index],s=STATIONS[id],previous=STATIONS[OPERATION_STATIONS[Math.max(0,index-1)]];
  let foup;
  if(t>=110)foup=STATIONS.dice.dock.slice();
  else if(u<1)foup=mix(previous.dock,previous.railDock,between(u,0,1));
  else if(u<2.5)foup=mix(previous.railDock,s.railDock,between(u,1,2.5));
  else if(u<3.25)foup=mix(s.railDock,s.dock,between(u,2.5,3.25));
  else foup=s.dock.slice();
  let position,holder;
  if(t>=105){position=STATIONS.dice.chamber.slice();holder='tool:dice';}
  else if(u<4){position=foup.slice();holder='foup-1';}
  else if(u<5){position=mix(s.dock,s.chamber,between(u,4,5));holder='arm:'+id;}
  else if(u<8){position=s.chamber.slice();holder='tool:'+id;}
  else if(u<9){position=mix(s.chamber,s.dock,between(u,8,9));holder='arm:'+id;}
  else{position=s.dock.slice();holder='foup-1';}
  return {index,u,stationId:id,position,holder,foup};
}
function toolArm(motion,t){
  const s=STATIONS[motion.stationId],u=motion.u,grip=FACTORY_LAYOUT.waferGripLocal;
  let center=s.chamber;
  if(t<110){
    if(u>=3.75&&u<4)center=mix(s.chamber,s.dock,between(u,3.75,4));
    else if(u>=4&&u<5)center=motion.position;
    else if(motion.index<10&&u>=8&&u<9)center=motion.position;
    else if(motion.index<10&&u>=9&&u<9.6)center=mix(s.dock,s.chamber,between(u,9,9.6));
  }
  const end=add(center,grip),base=add(s.chamber,[-1.05,-.35,0]),joint=add(mix(base,end,.5),[0,.28,0]);
  return {base,joint,end,holdingId:motion.holder==='arm:'+s.id?'wafer-1':null,active:t<110&&u>=3.75&&u<9.6};
}

function circuitTemplate(id,broken){
  const nodes=[{id:'in',position:[-.075,.02,0]},{id:'a',position:[-.025,.02,0]},{id:'b',position:[.025,.02,0]},{id:'out',position:[.075,.02,0]}];
  const edges=[['in','a'],['a','b'],['b','out']].map(([from,to],i)=>({
    id:id+'-wire-'+i,from,to,broken:broken&&i===1,
    segments:broken&&i===1?[[[-.025,.02,0],[-.006,.02,0]],[[.006,.02,0],[.025,.02,0]]]:[[nodes[i].position,nodes[i+1].position]]
  }));
  return {nodes,edges,input:'in',output:'out',scope:'Illustrative metal continuity network, not a complete transistor or functional chip.'};
}
export function circuitContinuity(circuit){
  const visited=new Set([circuit.input]),queue=[circuit.input];
  while(queue.length){
    const node=queue.shift();if(node===circuit.output)return true;
    for(const e of circuit.edges){
      if(e.broken||e.progress!==undefined&&e.progress<1)continue;
      const next=e.from===node?e.to:e.to===node?e.from:null;
      if(next!==null&&!visited.has(next)){visited.add(next);queue.push(next);}
    }
  }
  return false;
}
function probeTarget(index){return add(waferDiePoint(index,STATIONS.probe.chamber),[0,.02,0]);}
function probeAt(t){
  const start=95.2,endTime=97.8,slot=2.6/9,first=probeTarget(0),last=probeTarget(8),raised=point=>add(point,[0,.65,0]);
  let point,index=null,phase='idle';
  if(t<94.8)point=raised(first);
  else if(t<start){point=mix(raised(first),first,between(t,94.8,start));index=0;phase='approach';}
  else if(t<endTime){
    index=Math.min(8,Math.floor((t-start)/slot));
    const a=index?probeTarget(index-1):first,b=probeTarget(index),p=clamp((t-start-index*slot)/(slot*.4));
    point=index?liftedPath(a,b,p,2.25):first;phase=p<1&&index?'move-to-die':'contact';
  }else if(t<98){point=mix(last,raised(last),between(t,endTime,98));phase='retract';}
  else point=raised(last);
  const needles=[{id:'probe-in',nodeId:'in',base:add(point,[-.075,.45,0]),tip:add(point,[-.075,0,0])},{id:'probe-out',nodeId:'out',base:add(point,[.075,.45,0]),tip:add(point,[.075,0,0])}];
  const contactIndex=DIE_IDS.findIndex((id,i)=>Math.hypot(...point.map((v,k)=>v-probeTarget(i)[k]))<1e-9);
  return {head:{...pose(add(point,[0,.45,0]))},needles,targetDieId:index===null?null:DIE_IDS[index],contactDieId:contactIndex>=0?DIE_IDS[contactIndex]:null,contact:contactIndex>=0,phase};
}
function probeContactAt(time,index){
  const p=probeAt(time),center=probeTarget(index);
  return p.needles.every((needle,j)=>{
    const expected=add(center,[j? .075:-.075,0,0]);
    return Math.hypot(...needle.tip.map((v,k)=>v-expected[k]))<1e-9;
  });
}
const diceSlot=2/9;
function dieTransferTimes(i){return {start:106+i*diceSlot,pick:106+(i+.25)*diceSlot,place:106+(i+.95)*diceSlot,end:106+(i+1)*diceSlot};}
function diePosition(t,i,waferPosition,selected,packagePosition){
  const from=waferDiePoint(i,STATIONS.dice.chamber),to=rackPoint(i),timing=dieTransferTimes(i);
  if(t<timing.pick)return {position:waferDiePoint(i,waferPosition),holder:'wafer-1'};
  if(t<timing.place)return {position:liftedPath(from,to,(t-timing.pick)/(timing.place-timing.pick)),holder:'handler-1'};
  if(i===selected&&t>=111){
    const target=add(STATIONS.package.chamber,FACTORY_LAYOUT.packageDieLocal);
    if(t<115)return {position:liftedPath(to,target,(t-111)/4),holder:'handler-1'};
    return {position:add(packagePosition,FACTORY_LAYOUT.packageDieLocal),holder:'package-1'};
  }
  return {position:to,holder:'die-rack'};
}
function packageMotion(t){
  const start=STATIONS.package.chamber,end=STATIONS.final.chamber;
  if(t<121)return {position:start.slice(),holder:'package-support'};
  if(t<125)return {position:liftedPath(start,end,(t-121)/4),holder:'handler-1'};
  return {position:end.slice(),holder:'final-socket'};
}
function handlerAt(t,selected,packagePosition){
  const home=[STATIONS.package.center[0],FACTORY_LAYOUT.transferY,STATIONS.package.center[2]],rackHome=[FACTORY_LAYOUT.rackCenter[0],FACTORY_LAYOUT.transferY,FACTORY_LAYOUT.rackCenter[2]],grip=FACTORY_LAYOUT.dieGripLocal;
  let end=rackHome,holdingId=null,phase='idle';
  if(t>=105.8&&t<106){end=mix(rackHome,add(rackPoint(0),grip),between(t,105.8,106));phase='approach';}
  else if(t>=106&&t<108){
    const i=Math.min(8,Math.floor((t-106)/diceSlot)),v=dieTransferTimes(i),from=waferDiePoint(i,STATIONS.dice.chamber),to=rackPoint(i),previous=i?add(rackPoint(i-1),grip):add(rackPoint(0),grip);
    if(t<v.pick){end=liftedPath(previous,add(from,grip),(t-v.start)/(v.pick-v.start));phase='approach';}
    else if(t<v.place){end=add(liftedPath(from,to,(t-v.pick)/(v.place-v.pick)),grip);holdingId=DIE_IDS[i];phase='carry-die';}
    else{end=add(to,grip);phase='place-die';}
  }else if(t>=108&&t<110){end=liftedPath(add(rackPoint(8),grip),home,(t-108)/2);phase='retract';}
  else if(t>=110&&t<111){end=liftedPath(home,add(rackPoint(selected),grip),t-110);phase='approach';}
  else if(t>=111&&t<115){end=add(liftedPath(rackPoint(selected),add(STATIONS.package.chamber,FACTORY_LAYOUT.packageDieLocal),(t-111)/4),grip);holdingId=DIE_IDS[selected];phase='carry-die';}
  else if(t>=115&&t<115.2){end=mix(add(add(STATIONS.package.chamber,FACTORY_LAYOUT.packageDieLocal),grip),home,between(t,115,115.2));phase='retract';}
  else if(t>=115.2&&t<120)end=home;
  else if(t>=120&&t<121){end=liftedPath(home,add(STATIONS.package.chamber,FACTORY_LAYOUT.packageGripLocal),t-120);phase='approach-package';}
  else if(t>=121&&t<125){end=add(packagePosition,FACTORY_LAYOUT.packageGripLocal);holdingId='package-1';phase='carry-package';}
  else if(t>=125&&t<125.2){end=mix(add(STATIONS.final.chamber,FACTORY_LAYOUT.packageGripLocal),[STATIONS.final.center[0],FACTORY_LAYOUT.transferY,STATIONS.final.center[2]],between(t,125,125.2));phase='retract';}
  else if(t>=125.2)end=[STATIONS.final.center[0],FACTORY_LAYOUT.transferY,STATIONS.final.center[2]];
  const base=[end[0],FACTORY_LAYOUT.handlerRailY,end[2]],joint=mix(base,end,.5);
  return {id:'handler-1',base,joint,end,holdingId,active:phase!=='idle',phase};
}

function contact(id,time,kind,objectId,toolId,position,localPoint,from,to){
  return {id,time,type:'contact',kind,objectId,toolId,point:add(position,localPoint),objectPosition:position.slice(),localPoint:localPoint.slice(),from,to};
}
function eventsFor(trace){
  const events=[];
  for(let index=0;index<=10;index++){
    const s=STATIONS[OPERATION_STATIONS[index]],start=index*10,blade=FACTORY_LAYOUT.waferGripLocal;
    events.push(contact('wafer-pick-'+index,start+4,'pick','wafer-1','arm:'+s.id,s.dock,blade,'foup-1','arm:'+s.id));
    events.push(contact('wafer-load-'+index,start+5,'place','wafer-1','arm:'+s.id,s.chamber,blade,'arm:'+s.id,'tool:'+s.id));
    if(index<10){
      events.push(contact('wafer-return-pick-'+index,start+8,'pick','wafer-1','arm:'+s.id,s.chamber,blade,'tool:'+s.id,'arm:'+s.id));
      events.push(contact('wafer-return-'+index,start+9,'place','wafer-1','arm:'+s.id,s.dock,blade,'arm:'+s.id,'foup-1'));
    }
    events.push({id:'operation-'+STAGES[index],time:start+7.8,type:'operation-complete',stageId:STAGES[index]});
  }
  for(let i=0;i<9;i++){
    const timing=dieTransferTimes(i);
    events.push({id:'probe-'+i,time:95.2+2.6*(i+1)/9,type:'measurement',dieId:DIE_IDS[i],method:'illustrative continuity',contactPoints:[add(probeTarget(i),[-.075,0,0]),add(probeTarget(i),[.075,0,0])]});
    events.push(contact('die-pick-'+i,timing.pick,'pick',DIE_IDS[i],'handler-1',waferDiePoint(i,STATIONS.dice.chamber),FACTORY_LAYOUT.dieGripLocal,'wafer-1','handler-1'));
    events.push(contact('die-rack-'+i,timing.place,'place',DIE_IDS[i],'handler-1',rackPoint(i),FACTORY_LAYOUT.dieGripLocal,'handler-1','die-rack'));
  }
  const i=trace.selectedIndex,dieTarget=add(STATIONS.package.chamber,FACTORY_LAYOUT.packageDieLocal);
  events.push(contact('package-die-pick',111,'pick',DIE_IDS[i],'handler-1',rackPoint(i),FACTORY_LAYOUT.dieGripLocal,'die-rack','handler-1'));
  events.push(contact('package-die-place',115,'place',DIE_IDS[i],'handler-1',dieTarget,FACTORY_LAYOUT.dieGripLocal,'handler-1','package-1'));
  events.push({id:'package-connected',time:116.5,type:'connection-complete',objectId:'package-1'});
  events.push({id:'package-protected',time:117.8,type:'assembly-complete',objectId:'package-1'});
  events.push(contact('package-pick',121,'pick','package-1','handler-1',STATIONS.package.chamber,FACTORY_LAYOUT.packageGripLocal,'package-support','handler-1'));
  events.push(contact('package-socket',125,'place','package-1','handler-1',STATIONS.final.chamber,FACTORY_LAYOUT.packageGripLocal,'handler-1','final-socket'));
  events.push({id:'final-test',time:127.8,type:'measurement',objectId:'package-1',method:'illustrative die, bonds and socket continuity'});
  return events.sort((a,b)=>a.time-b.time);
}
export function makeFabTrace(params={}){
  const fault=params.fault==='illustrative-open'?'illustrative-open':'none';
  const dieTemplates=DIE_IDS.map((id,i)=>({id,index:i,circuit:circuitTemplate(id,fault==='illustrative-open'&&i===0)}));
  const selectedIndex=dieTemplates.findIndex(d=>circuitContinuity(d.circuit));
  const trace={
    params:{fault},horizon:DURATION,stages:STAGES,stations:STATIONS,layout:FACTORY_LAYOUT,
    operations:STAGES.map((id,index)=>({id,index,start:index*10,end:(index+1)*10,stationId:OPERATION_STATIONS[index],processStart:index*10+5.2,processEnd:index*10+7.8})),
    dieTemplates,selectedIndex,assumptions:{
      clock:'Presentation units, not physical elapsed manufacturing time.',
      material:'Nine normalized cross-section cells for one film/resist cycle; not a whole-wafer mass balance.',
      sample:'Nine persistent illustrative die samples, not real wafer density or Terafab yield.',
      process:'Positive-resist pattern transfer; repeated operations, transistor fabrication and recipes are condensed or omitted.',
      circuit:'A small illustrative metal continuity network, not functional-chip performance.',
      fault:'A deliberately introduced open in die-0, not measured defect frequency.',
      layout:'A teaching lab separate from the interpretive campus and any confirmed Terafab floor plan.',
      package:'One measured continuous die in one illustrative package; other samples remain on the rack.',
      unknown:'No claimed throughput, physical cycle time, water or power demand, node size, supplier or space qualification.'
    }
  };
  trace.events=eventsFor(trace);
  return freeze(trace);
}
export const makeTrace=makeFabTrace;

export function fabFrameAt(trace,time=0){
  const t=clamp(finite(time),0,DURATION),index=Math.min(12,Math.floor(t/10)),u=clamp(t-index*10,0,10),motion=waferMotion(t),stationId=OPERATION_STATIONS[index],phase=phaseAt(index,u,t);
  const deposited=operationProgress(t,1),coated=operationProgress(t,2),exposure=operationProgress(t,3),developed=operationProgress(t,4),etched=operationProgress(t,5),stripped=operationProgress(t,6),repeat=operationProgress(t,8);
  const film=MASK.map(open=>deposited*(open?1-etched:1));
  const resist=MASK.map(open=>coated*(open?1-developed:1)*(1-stripped));
  const filmAdded=9*deposited,filmRemaining=film.reduce((a,b)=>a+b,0),resistApplied=9*coated,resistDeveloped=3*coated*developed,resistStripped=(resistApplied-resistDeveloped)*stripped,resistRemaining=resist.reduce((a,b)=>a+b,0);
  const packagePose=packageMotion(t),connectionProgress=between(t,115.2,116.5),enclosureProgress=between(t,116.5,117.8),assembled=t>=117.8;
  const probeResults=trace.dieTemplates.map((d,i)=>{
    const start=95.2+2.6*i/9,end=95.2+2.6*(i+1)/9,done=t>=end,valid=done?probeContactAt(end,i)&&circuitContinuity(d.circuit):null;
    return {dieId:d.id,index:i,status:done?valid?'pass':'open':t>=start&&t<end?'measuring':'pending',valid,measuredAt:done?end:null,contactPoint:probeTarget(i)};
  });
  const dies=trace.dieTemplates.map((d,i)=>{
    const p=diePosition(t,i,motion.position,trace.selectedIndex,packagePose.position),result=probeResults[i];
    return {id:d.id,type:'die',index:i,...pose(p.position),holder:p.holder,visible:true,status:p.holder==='wafer-1'?'on-wafer':p.holder==='die-rack'?'rack':p.holder==='package-1'?'packaged':'in-transfer',valid:result.valid,tested:result.valid!==null,
      circuit:{...d.circuit,buildProgress:repeat,edges:d.circuit.edges.map((edge,j)=>({...edge,progress:clamp(repeat*3-j)}))}};
  });
  const remainingDieIds=dies.filter(d=>d.holder==='wafer-1').map(d=>d.id);
  const wafer={id:'wafer-1',type:'wafer',...pose(motion.position),holder:motion.holder,visible:true,status:t>=105.8?'diced-remnant':t>=87.8?'condensed-structures':t>=57.8?'patterned':'sample-wafer',radius:FACTORY_LAYOUT.waferRadius,remainingDieIds,cutProgress:between(t,105.2,105.8)};
  const carrierDoor=t<110?loadDoor(motion.u):0,foupWaferId=wafer.holder==='foup-1'?wafer.id:null;
  const foup={id:'foup-1',type:'foup',...pose(motion.foup),holder:'overhead-carrier',visible:true,lidOpen:carrierDoor,doorOpen:carrierDoor,waferId:foupWaferId};
  const carrier={id:'carrier-1',...pose([motion.foup[0],FACTORY_LAYOUT.trolleyY,motion.foup[2]]),phase:t>=110?'parked':phase,hoist:clamp((FACTORY_LAYOUT.railFoupY-motion.foup[1])/(FACTORY_LAYOUT.railFoupY-FACTORY_LAYOUT.waferY)),hoistLength:FACTORY_LAYOUT.trolleyY-motion.foup[1]-.60,active:t<110};
  const currentArm=toolArm(motion,t),machines={};
  for(const s of Object.values(STATIONS)){
    const current=t<110&&motion.stationId===s.id,emptyEnd=add(s.chamber,FACTORY_LAYOUT.waferGripLocal),base=add(s.chamber,[-1.05,-.35,0]);
    const arm=current?currentArm:{base,joint:add(mix(base,emptyEnd,.5),[0,.28,0]),end:emptyEnd,holdingId:null,active:false};
    machines[s.id]={id:s.id,center:s.center,dock:s.dock,chamber:s.chamber,doorOpen:current?loadDoor(motion.u):0,chamberOpen:current?chamberDoor(motion.u,motion.index===10):0,active:current?motion.index===10?motion.u>=5.2&&motion.u<5.8:motion.u>=5.2&&motion.u<7.8:index>=11&&stationId===s.id&&u>=5.2&&u<7.8,waferReady:wafer.holder==='tool:'+s.id,arm};
  }
  const handler=handlerAt(t,trace.selectedIndex,packagePose.position),packageDie=t>=115?DIE_IDS[trace.selectedIndex]:null;
  const pack={id:'package-1',type:'package',...pose(packagePose.position),holder:packagePose.holder,visible:true,dieId:packageDie,status:assembled?'assembled':packageDie?'connecting':'empty-support',connections:[{id:'bond-in',from:'package-in',to:'die-in',progress:connectionProgress,connected:connectionProgress===1},{id:'bond-out',from:'die-out',to:'package-out',progress:connectionProgress,connected:connectionProgress===1}],enclosureProgress,assembled};
  const probeCompleted=probeResults.filter(p=>p.valid!==null).length,probeActive=probeResults.find(p=>p.status==='measuring')?.dieId||null;
  const patternMeasured=t>=77.8,patternValid=patternMeasured?film.every((v,i)=>Math.abs(v-(MASK[i]?0:1))<1e-10)&&resist.every(v=>v===0):null;
  const finalMeasured=t>=127.8,selectedResult=probeResults[trace.selectedIndex],finalValid=finalMeasured?selectedResult.valid===true&&pack.connections.every(c=>c.connected)&&pack.assembled&&pack.holder==='final-socket':null;
  const quality={
    inspection:{status:patternMeasured?patternValid?'pass':'mismatch':t>=75.2?'measuring':'pending',valid:patternValid,layer:'one-patterned-film',scope:'Normalized pattern comparison only; not a dimensional or yield measurement.'},
    probe:{completed:probeCompleted,total:9,pending:9-probeCompleted,activeDieId:probeActive,results:probeResults,scope:'Individual illustrative network continuity, not chip functionality.'},
    final:{status:finalMeasured?finalValid?'pass':'open':t>=125.2?'measuring':'pending',valid:finalValid,dieId:packageDie,measuredAt:finalMeasured?127.8:null,scope:'Die network, package bonds and socket continuity; not space qualification.'}
  };
  const ledger={
    film:{added:filmAdded,remaining:filmRemaining,etched:filmAdded-filmRemaining},
    resist:{applied:resistApplied,remaining:resistRemaining,developed:resistDeveloped,stripped:resistStripped},
    dies:{total:9,onWafer:dies.filter(d=>d.holder==='wafer-1').length,rack:dies.filter(d=>d.holder==='die-rack').length,inTransfer:dies.filter(d=>d.holder==='handler-1').length,inPackage:dies.filter(d=>d.holder==='package-1').length,rejectedInRack:dies.filter(d=>d.holder==='die-rack'&&d.valid===false).length},
    probe:{pending:9-probeCompleted,continuous:probeResults.filter(p=>p.valid===true).length,open:probeResults.filter(p=>p.valid===false).length}
  };
  const section={film,resist,exposed:MASK.map(open=>open?exposure:0),mask:MASK,patternTransferred:etched===1,resistStripped:stripped===1,repeatProgress:repeat,condensedLayers:['device-summary','dielectric-and-vias','metal-connections'].map((id,i)=>({id,progress:clamp(repeat*3-i),recipeOmitted:true})),scope:'Magnified normalized section of one film/resist cycle; additional structures are condensed.'};
  const objects=[wafer,foup,...dies,pack];
  return freeze({
    time:t,t,continuous:true,completed:Math.floor(t),active:t<DURATION,index,stageId:STAGES[index],stationId,progress:u/10,phase,
    wafer,foup,carrier,machines,doors:{foup:carrierDoor,tool:machines[stationId].chamberOpen},arm:t<110?currentArm:handler,handler,probe:probeAt(t),
    section,dies,package:pack,objects,objectById:Object.fromEntries(objects.map(o=>[o.id,o])),
    quality,ledger,selectedDieId:t>=111?DIE_IDS[trace.selectedIndex]:null,
    events:trace.events.filter(e=>e.time<=t),contacts:trace.events.filter(e=>e.type==='contact'&&e.time<=t),assumptions:trace.assumptions
  });
}
export const frameAt=fabFrameAt;
