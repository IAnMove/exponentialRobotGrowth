export const sum=a=>a.reduce((n,v)=>n+v,0);
export function laborIndex(row,robotRatio=.2){
 const a=row.humanHours+row.robotHours*robotRatio,b=row.referenceHumanHours+row.referenceRobotHours*robotRatio;
 return row.total>0&&row.reference>0&&b>0?100*(a/row.total)/(b/row.reference):null;
}
export function fixedIndex(row){return row.total>0&&row.reference>0&&row.referenceSiteTime>0?100*(row.siteTime/row.total)/(row.referenceSiteTime/row.reference):null;}
export function taskIndex(covered,total,ratio=.2){return total>0?100*(total-covered+covered*ratio)/total:null;}
export function createLedger(){let h=0,r=0,bh=0,br=0,sites=0,bsites=0;return {add(dt,a,b){h+=(a.humans||0)*dt;r+=(a.robots||0)*dt;bh+=(b.humans||0)*dt;br+=(b.robots||0)*dt;sites+=(a.sites||0)*dt;bsites+=(b.sites||0)*dt;},values(){return {humanHours:h,robotHours:r,referenceHumanHours:bh,referenceRobotHours:br,siteTime:sites,referenceSiteTime:bsites};}};}
export function districtRows(frames,reference){const ledger=createLedger();return frames.map((f,i)=>{if(i){const a=frames[i-1],b=reference[i-1];ledger.add(1,{humans:sum(a.humansWorking),robots:sum(a.robots)},{humans:sum(b.humansWorking),robots:sum(b.robots)});}return {time:f.step,total:f.total,reference:reference[i].total,fleet:sum(f.robots),referenceFleet:0,...ledger.values()};});}
