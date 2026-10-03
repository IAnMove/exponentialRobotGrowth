// Approximate narration segments; not forced word alignment. Local time is a
// reversible presentation clock. It is not a measured human or robot duration.
export const CUES=Object.freeze({
 es:[[[0,0],[.23,0],[.34,2],[.64,9.5],[.84,9.5],[.95,10],[1,10]],[[0,0],[.10,1.7],[.34,9.5],[.77,9.5],[.91,10],[1,10]],[[0,0],[.09,2],[.31,9.5],[.90,9.5],[1,10]],[[0,0],[.10,2.5],[.18,5],[.22,6.25],[.26,7.5],[.35,9.5],[.91,9.5],[1,10]],[[0,0],[.15,3],[.37,9.5],[.89,9.5],[1,10]],[[0,0],[.12,2],[.30,9.5],[.89,9.5],[1,10]],[[0,0],[.10,3],[.20,6],[.35,9.5],[.57,10],[1,10]]],
 en:[[[0,0],[.22,0],[.34,2],[.63,9.5],[.84,9.5],[.95,10],[1,10]],[[0,0],[.11,1.7],[.35,9.5],[.77,9.5],[.91,10],[1,10]],[[0,0],[.10,2],[.32,9.5],[.90,9.5],[1,10]],[[0,0],[.11,2.5],[.19,5],[.23,6.25],[.27,7.5],[.36,9.5],[.91,9.5],[1,10]],[[0,0],[.16,3],[.38,9.5],[.89,9.5],[1,10]],[[0,0],[.13,2],[.31,9.5],[.89,9.5],[1,10]],[[0,0],[.11,3],[.21,6],[.36,9.5],[.57,10],[1,10]]]
});
export function narrationTime(index,progress,language='es'){
 const chapter=Math.min(6,Math.max(0,Math.floor(Number(index)||0))),p=Math.min(1,Math.max(0,Number(progress)||0)),cues=CUES[language==='en'?'en':'es'][chapter];
 for(let i=1;i<cues.length;i++)if(p<=cues[i][0]){const [a,x]=cues[i-1],[b,y]=cues[i];return chapter*10+x+(y-x)*(p-a)/(b-a);}
 return (chapter+1)*10;
}
// Choose an equivalent physical cue when changing recorded voice. During a
// held scene, prefer the closest point of that hold to the old audio fraction.
export function narrationProgress(index,time,language='es',preferred=0){
 const chapter=Math.min(6,Math.max(0,Math.floor(Number(index)||0))),local=Math.min(10,Math.max(0,(Number(time)||0)-chapter*10)),cues=CUES[language==='en'?'en':'es'][chapter],p=Math.min(1,Math.max(0,Number(preferred)||0)),candidates=[];
 for(let i=1;i<cues.length;i++){const [a,x]=cues[i-1],[b,y]=cues[i];if(local<x-1e-9||local>y+1e-9)continue;candidates.push(y===x?Math.min(b,Math.max(a,p)):a+(b-a)*(local-x)/(y-x));}
 return candidates.length?candidates.reduce((best,value)=>Math.abs(value-p)<Math.abs(best-p)?value:best):local===10?1:0;
}
