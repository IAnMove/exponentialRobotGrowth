// Normalized steady-state capacity, NOT wafer counts, chip counts, watts or time.
// Every stage is expressed in equivalent complete sets; no inventory simulation.
export const DEFAULTS=Object.freeze({logic:120,yield:75,packaging:80,utilities:100});
export function capacity(input={}){
  const p={...DEFAULTS,...input};
  for(const [k,max] of [['logic',240],['yield',100],['packaging',160],['utilities',140]]){
    if(!Number.isFinite(p[k])||p[k]<0||p[k]>max)throw new RangeError(`Invalid ${k}`);
  }
  const stages={logic:p.logic*p.yield/100,memory:110,packaging:p.packaging,test:100,utilities:p.utilities,supply:120};
  const output=Math.min(...Object.values(stages));
  const bottlenecks=Object.keys(stages).filter(k=>Math.abs(stages[k]-output)<1e-8);
  return {output,stages,bottlenecks};
}
