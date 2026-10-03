// Approximate phrase cues, estimated from the recorded scripts. Not word alignment.
// The same reversible model is used for narration and manual exploration.
export const CUES=Object.freeze({
 es:{memory:[[0,0],[.12,0],[.167,1],[.241,2],[.264,3],[.305,4],[.333,5],[.356,6],[.483,6],[.570,7],[.598,8],[.632,48],[1,48]],learn:[[0,0],[.245,0],[.301,12],[.374,24],[.442,36],[.620,36],[.675,48],[1,48]],energy:[[0,0],[.245,0],[.358,48],[1,48]]},
 en:{memory:[[0,0],[.129,0],[.172,1],[.252,2],[.276,3],[.319,4],[.350,5],[.374,6],[.515,6],[.610,7],[.638,8],[.669,48],[1,48]],learn:[[0,0],[.230,0],[.291,12],[.370,24],[.442,36],[.624,36],[.679,48],[1,48]],energy:[[0,0],[.238,0],[.354,48],[1,48]]}
});
export function narrationTick(chapter,progress,language='es'){
 const cues=CUES[language==='en'?'en':'es'][chapter];if(!cues)return 0;
 const p=Math.max(0,Math.min(1,Number.isFinite(progress)?progress:0));
 const i=Math.max(0,cues.findIndex((point,j)=>j>0&&p<=point[0]));
 if(!i)return cues.at(-1)[1];const a=cues[i-1],b=cues[i];
 return a[1]+(b[1]-a[1])*(p-a[0])/(b[0]-a[0]);
}
