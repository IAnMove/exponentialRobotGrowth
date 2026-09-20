// A representative positive-resist pattern-transfer example, not a Terafab recipe.
export const stages=['wafer','deposit','coat','expose','develop','etch','strip','inspect','repeat','probe','dice','package','final'];
export function waferAt(step){
 if(!Number.isInteger(step)||step<0||step>=stages.length)throw new RangeError('Unknown process stage');
 const film=Array.from({length:9},(_,i)=>step>=1&&(step<5||i%3!==1));
 const resist=Array.from({length:9},(_,i)=>step>=2&&step<6&&(step<4||i%3!==1));
 return {stage:stages[step],film,resist,exposed:step===3,patternTransferred:step>=5,inspected:step>=7,multilayer:step>=8,probed:step>=9,diced:step>=10,packaged:step>=11,finalTest:step>=12};
}
