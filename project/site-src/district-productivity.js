// Finished output over an equal time window; not output per worker.
export function productionSeries(frames,industry=8){
 let total=0;const prefix=frames.map(f=>(total+=f.flow[industry]*(industry===1?4:1)));
 return prefix.map((v,i)=>v-prefix[Math.max(0,i-24)]);
}
export function productionComparison(current,reference,index){
 const actual=current[index],human=reference[index];
 return {actual,human,hours:Math.min(24,index),percent:human>0?(actual/human-1)*100:null};
}
