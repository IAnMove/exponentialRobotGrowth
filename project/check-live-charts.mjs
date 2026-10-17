import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';import {laborCost,fixedCost,taskCost} from './site-src/live/metrics.js';
const source=readFileSync('site-src/live/header.js','utf8').replace(/^import .*;$/gm,'').replace('export function createLiveHeader','function createLiveHeader');let cases=0;
for(const language of ['es','en'])for(const kind of ['factory','district','city','region'])for(const width of [64,72,96,320,800]){
 let currentWidth=width,resize,root;const nodes=new Map(),node=()=>({style:{},attrs:{},textContent:'',value:'',writes:0,_html:'',setAttribute(k,v){this.attrs[k]=String(v);},getBoundingClientRect(){return {width:currentWidth,height:98};},get innerHTML(){return this._html;},set innerHTML(v){this._html=v;this.writes++;},querySelector(s){if(!nodes.has(s))nodes.set(s,node());return nodes.get(s);},before(r){root=r;}}),document={documentElement:{lang:language},createElement:node,querySelector:node};
 const make=vm.runInNewContext(source+'\ncreateLiveHeader',{document,Intl,laborCost,fixedCost,taskCost,ResizeObserver:class{constructor(fn){resize=fn;}observe(){}}}),live=make({anchor:'#test',kind});
 const row=(time,total,reference,fleet)=>({time,total,reference,fleet,referenceFleet:kind==='factory'||kind==='district'?0:24,humanHours:total,robotHours:time?10:0,referenceHumanHours:reference*2,referenceRobotHours:0,siteTime:time*6,referenceSiteTime:time*6});
 const data={time:25,horizon:100,playing:false,points:[row(0,0,0,0),row(10,10,5,40),row(25,20,10,80),row(50,999999,999999,999999)]};
 for(const ratio of [.05,.2,1.5]){
  live.setRatio(ratio);live.update(data);
  for(let i=0;i<3;i++){
   const chart=nodes.get('[data-chart="'+i+'"]'),svg=chart.innerHTML,box=chart.attrs.viewBox.split(' ').map(Number);assert.deepEqual(box,[0,0,width,98]);assert.equal((svg.match(/font-size="13"/g)||[]).length,3,'every axis label retains 13 logical/CSS px');assert(svg.includes('data-current-time="25"'));assert(svg.includes('0 → 100'));assert(svg.includes('>'+((kind==='city'||kind==='region')?(language==='es'?'ciclos':'cycles'):'h')+'</text>'));
   const peak=Number(svg.match(/data-chart-range="([^"]+)"/)[1]),costPeak=kind==='city'?Math.max(100,100+20/600*(ratio-1)*100):kind==='region'?100:Math.max(100,50*(1+ratio));assert(Math.abs(peak-(i===0&&kind==='city'?600:i===0?20:i===1?80:costPeak))<1e-8,'future production cannot inflate the vertical scale');
   const actual=svg.match(/data-series="actual" d="([^"]*)"/)[1],reference=svg.match(/data-series="reference" d="([^"]*)"/)[1];assert(actual&&reference);const values=[...actual.matchAll(/[ML]([\d.]+) ([\d.]+)/g)].map(m=>[+m[1],+m[2]]);assert(values.every(([x,y])=>x>=4&&x<=4+(width-8)*.25+.00501&&y>=24-.01&&y<=57+.01),'paths stop at the selected time, before the supplied future row');const last=values.at(-1);assert(Math.abs(last[0]-(4+(width-8)*.25))<=.00501,'the current point occupies one quarter of the full time axis');
   if(i===0)assert.equal(last[1],kind==='city'?55.9:24);if(i===1)assert.equal(last[1],24);
   assert(chart.attrs['aria-label'].includes(language==='es'?'Escala vertical':'Vertical range'));cases++;
  }
  const writes=[0,1,2].map(i=>nodes.get('[data-chart="'+i+'"]')).map(n=>n.writes);live.update(data);assert.deepEqual([0,1,2].map(i=>nodes.get('[data-chart="'+i+'"]')).map(n=>n.writes),writes,'held SVGs are reused');
 }
 const old=[0,1,2].map(i=>nodes.get('[data-chart="'+i+'"]')).map(n=>n.writes);currentWidth=width+17;resize();for(let i=0;i<3;i++){const chart=nodes.get('[data-chart="'+i+'"]');assert.equal(+chart.attrs.viewBox.split(' ')[2],currentWidth);assert.equal(chart.writes,old[i]+1);}assert.equal(data.time,25);
 live.update({...data,time:0,points:[data.points[0]]});const empty=nodes.get('[data-chart="2"]').innerHTML;if(kind!=='city')assert.equal(empty.match(/data-series="actual" d="([^"]*)"/)[1],'','an unavailable cost remains a gap, not zero cost');
}
console.log(`Live charts: ${cases} bilingual/scope/width/cost plot cases, independent coordinates, no future leakage, missing costs, 13 px axes, quiet paused SVG and resize without changing time: OK`);
