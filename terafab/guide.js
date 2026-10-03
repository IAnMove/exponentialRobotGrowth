// Approximate narration segments drive presentation positions, never factory timings.
export const NARRATION_CHAPTERS=Object.freeze([
 {id:'campus',start:0,end:0,view:'campus'},
 {id:'services',start:0,end:0,view:'layers'},
 {id:'layers',start:0,end:30,view:'fab'},
 {id:'expose',start:30,end:50,view:'fab'},
 {id:'transfer',start:50,end:90,view:'fab'},
 {id:'assembly',start:90,end:130,view:'fab'}
].map(Object.freeze));
const cues=[
 [[0,0],[1,0]],[[0,0],[1,0]],
 [[0,0],[.12,8],[.23,10],[.33,15.2],[.49,17.8],[.57,20],[.67,25.2],[.81,27.8],[1,30]],
 [[0,30],[.08,32],[.28,35.2],[.47,37.8],[.59,40],[.69,45.2],[.79,47.8],[.90,50],[1,50]],
 [[0,50],[.08,55.2],[.22,59],[.28,60],[.35,65.2],[.44,69],[.56,70],[.67,79],[.77,80],[.95,87.8],[1,90]],
 [[0,90],[.08,95.2],[.24,97.8],[.42,100],[.50,105.2],[.61,108],[.65,110],[.71,115],[.79,117.8],[.84,120],[.9,125.2],[.97,127.8],[1,130]]
].map(c=>Object.freeze(c.map(Object.freeze)));
export const CUES=Object.freeze({es:cues,en:cues});
const clamp=(n,a,b)=>Math.min(b,Math.max(a,Number(n)||0));
export function narrationTime(index,progress,language='es'){
 const c=CUES[language==='en'?'en':'es'][clamp(Math.floor(index),0,5)],p=clamp(progress,0,1);
 for(let i=1;i<c.length;i++){const [a,x]=c[i-1],[b,y]=c[i];if(p<=b)return x+(y-x)*(p-a)/(b-a);}
 return c.at(-1)[1];
}
export function narrationProgress(index,time,language='es',preferred=0){
 const i=clamp(Math.floor(index),0,5),ch=NARRATION_CHAPTERS[i],local=clamp(time,ch.start,ch.end),c=CUES[language==='en'?'en':'es'][i],p=clamp(preferred,0,1),choices=[];
 for(let j=1;j<c.length;j++){const [a,x]=c[j-1],[b,y]=c[j];if(local<x-1e-8||local>y+1e-8)continue;choices.push(x===y?clamp(p,a,b):a+(b-a)*(local-x)/(y-x));}
 return choices.length?choices.reduce((best,value)=>Math.abs(value-p)<Math.abs(best-p)?value:best):0;
}
export const processChapter=time=>time<30?2:time<50?3:time<90?4:5;
