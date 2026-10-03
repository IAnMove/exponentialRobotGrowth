// Presentation cues are approximate narration segments, not physical mission time.
export const NARRATION_CHAPTERS=Object.freeze([
 {vehicle:'falcon',local:0,start:0,end:8}, {vehicle:'falcon',local:1,start:8,end:50},
 {vehicle:'falcon',local:2,start:50,end:85}, {vehicle:'falcon',local:3,start:85,end:100},
 {vehicle:'starship',local:0,start:0,end:8}, {vehicle:'starship',local:1,start:8,end:50},
 {vehicle:'starship',local:2,start:50,end:85}, {vehicle:'starship',local:3,start:85,end:100}
].map(Object.freeze));
export const CUES=Object.freeze({
 es:[[[0,0],[.90,0],[1,8]],[[0,8],[.16,20],[.38,28],[.46,30],[.53,32],[.65,38],[.76,43],[1,50]],[[0,50],[.31,58],[.43,65],[.54,78],[.63,84],[1,85]],[[0,85],[.18,92],[.34,98],[1,100]],[[0,0],[.90,0],[1,8]],[[0,8],[.25,27],[.43,30],[.64,43],[1,50]],[[0,50],[.23,74],[.46,82],[1,85]],[[0,85],[.22,93],[.32,96],[.43,99],[1,100]]],
 en:[[[0,0],[.90,0],[1,8]],[[0,8],[.16,20],[.38,28],[.46,30],[.53,32],[.65,38],[.76,43],[1,50]],[[0,50],[.31,58],[.43,65],[.54,78],[.63,84],[1,85]],[[0,85],[.18,92],[.34,98],[1,100]],[[0,0],[.90,0],[1,8]],[[0,8],[.25,27],[.43,30],[.64,43],[1,50]],[[0,50],[.23,74],[.46,82],[1,85]],[[0,85],[.22,93],[.32,96],[.43,99],[1,100]]]
});
const clamp=(n,a,b)=>Math.min(b,Math.max(a,Number(n)||0));
export function narrationTime(index,progress,language='es'){
 const cues=CUES[language==='en'?'en':'es'][clamp(Math.floor(index),0,7)],p=clamp(progress,0,1);
 for(let i=1;i<cues.length;i++){const [a,x]=cues[i-1],[b,y]=cues[i];if(p<=b)return x+(y-x)*(p-a)/(b-a);}
 return cues.at(-1)[1];
}
export function narrationProgress(index,time,language='es',preferred=0){
 const c=NARRATION_CHAPTERS[clamp(Math.floor(index),0,7)],local=clamp(time,c.start,c.end),cues=CUES[language==='en'?'en':'es'][clamp(Math.floor(index),0,7)],p=clamp(preferred,0,1),choices=[];
 for(let i=1;i<cues.length;i++){const [a,x]=cues[i-1],[b,y]=cues[i];if(local<x-1e-8||local>y+1e-8)continue;choices.push(x===y?clamp(p,a,b):a+(b-a)*(local-x)/(y-x));}
 return choices.length?choices.reduce((best,value)=>Math.abs(value-p)<Math.abs(best-p)?value:best):0;
}
