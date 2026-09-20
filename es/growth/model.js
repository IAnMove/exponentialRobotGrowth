// Teaching model. No empirical humanoid productivity or price is implied.
export const defaults={days:90,hours:21,shifts:1,reinvest:.7,buildHours:240,slots:100,supply:1500,limited:true,wage:25,installed:60000,life:5,service:3000,power:1,energy:.2,supervision:20,material:8};
export function simulate(p=defaults){
 let fleet=p.limited?Math.min(10,p.slots):10,bank=0,pending=[],made=0,goods=0,humanTotal=0,fixedTotal=0;const rows=[];
 for(let day=0;day<=p.days;day++){
  fleet+=pending.filter(x=>x.ready===day).reduce((n,x)=>n+x.count,0);pending=pending.filter(x=>x.ready>day);
  const pendingCount=pending.reduce((n,x)=>n+x.count,0);
  // Slots only cap how many robots can exist. Supply caps equivalent work for every scenario.
  // A slots×24 hour ceiling is redundant once fleet ≤ slots and hours ≤ 24, and it must not limit humans.
  const supply=p.limited?p.supply:Infinity;
  const human=Math.min(10*8*p.shifts,supply),fixed=Math.min(10*p.hours,supply),work=Math.min(fleet*p.hours,supply);
  const room=p.limited?Math.max(0,p.slots-fleet-pendingCount):Infinity;
  const buildWork=Math.min(work*p.reinvest,Math.max(0,room*p.buildHours-bank));
  const output=work-buildWork;
  rows.push({day,fleet,human,fixed,output,goods,goodsToDate:goods+output,humanTotal,humanToDate:humanTotal+human,fixedTotal,fixedToDate:fixedTotal+fixed,made,bank,pending:pendingCount,work,buildWork,limited:work+1e-6<fleet*p.hours});
  if(day===p.days)break;
  goods+=output;humanTotal+=human;fixedTotal+=fixed;bank+=buildWork;
  const count=Math.floor((bank+1e-9)/p.buildHours);bank-=count*p.buildHours;made+=count;
  if(count)pending.push({ready:day+3,count}); // Two full days of commissioning after production day ends.
 }
 return rows;
}
export function unitCosts(p){const robotDaily=p.installed/(p.life*365)+p.service/365+p.supervision+p.power*p.energy*p.hours;return {human:p.material+p.wage,robot:p.material+robotDaily/p.hours,robotDaily};}
export function idealDoubling(p){return p.reinvest>0?Math.log(2)/Math.log(1+p.reinvest*p.hours/p.buildHours):Infinity;}
