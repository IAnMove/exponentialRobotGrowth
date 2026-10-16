export const sum=a=>a.reduce((n,v)=>n+v,0);
function compareCosts(cost,units,referenceCost,referenceUnits){
 const perUnit=units>0?cost/units:null,referencePerUnit=referenceUnits>0?referenceCost/referenceUnits:null;
 return Object.freeze({cost,units,referenceCost,referenceUnits,perUnit,referencePerUnit,index:perUnit!==null&&referencePerUnit>0?100*perUnit/referencePerUnit:null});
}
export function laborCost(row,robotRatio=.2){return compareCosts(row.humanHours+row.robotHours*robotRatio,row.total,row.referenceHumanHours+row.referenceRobotHours*robotRatio,row.reference);}
export function fixedCost(row){return compareCosts(row.siteTime,row.total,row.referenceSiteTime,row.reference);}
export function taskCost(covered,total,ratio=.2){return compareCosts(total-covered+covered*ratio,total,total,total);}
export function laborIndex(row,robotRatio=.2){return laborCost(row,robotRatio).index;}
export function fixedIndex(row){return fixedCost(row).index;}
export function taskIndex(covered,total,ratio=.2){return taskCost(covered,total,ratio).index;}
export function createLedger(){let h=0,r=0,bh=0,br=0,sites=0,bsites=0;return {add(dt,a,b){h+=(a.humans||0)*dt;r+=(a.robots||0)*dt;bh+=(b.humans||0)*dt;br+=(b.robots||0)*dt;sites+=(a.sites||0)*dt;bsites+=(b.sites||0)*dt;},values(){return {humanHours:h,robotHours:r,referenceHumanHours:bh,referenceRobotHours:br,siteTime:sites,referenceSiteTime:bsites};}};}
export function districtRows(frames,reference){const ledger=createLedger();return frames.map((f,i)=>{if(i){const a=frames[i-1],b=reference[i-1];ledger.add(1,{humans:sum(a.humansWorking),robots:sum(a.robots)},{humans:sum(b.humansWorking),robots:sum(b.robots)});}return {time:f.step,total:f.total,reference:reference[i].total,fleet:sum(f.robots),referenceFleet:0,...ledger.values()};});}
