// A tiny, explicit TCP teaching trace. Times are model steps, never measured milliseconds.
export const MSS=1500;
export const TOY_TIMEOUT=15;
export const TCP_EDGES=Object.freeze([[0,1,1],[1,2,1.7],[2,4,1.3],[1,3,2.8],[3,4,3.2]].map(Object.freeze));
const freeze=o=>{if(o&&typeof o==='object'){for(const v of Object.values(o))freeze(v);Object.freeze(o);}return o;};
const finite=(x,name)=>{if(typeof x!=='number'||!Number.isFinite(x))throw new RangeError(name+' must be finite');return x;};
export function shortestPath(edges,start=0,end=4){
 if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<0||start>4||end>4)throw new RangeError('Invalid node');
 const d=Array(5).fill(Infinity),previous=[],pending=new Set([0,1,2,3,4]);d[start]=0;
 for(const [a,b,w]of edges)if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a>4||b>4||!Number.isFinite(w)||w<0)throw new RangeError('Invalid edge');
 while(pending.size){const u=[...pending].sort((a,b)=>d[a]-d[b]||a-b)[0];pending.delete(u);if(!Number.isFinite(d[u]))break;
  for(const [a,b,w]of edges){const v=a===u?b:b===u?a:null;if(v===null||!pending.has(v))continue;if(d[u]+w<d[v]){d[v]=d[u]+w;previous[v]=u;}}
 }
 const path=[];if(Number.isFinite(d[end]))for(let u=end;u!==undefined;u=previous[u])path.unshift(u);
 return {path,delay:d[end]};
}
export function tcpTrace(raw={}){
 const size=Math.max(3,Math.min(30,finite(raw.size===undefined?12:raw.size,'Size'))),params={size,cut:raw.cut===true,loss:raw.loss===true,duplicate:raw.duplicate===true};
 const edges=TCP_EDGES.filter(([a,b])=>!(params.cut&&a===1&&b===2));
 const {path:route,delay}=shortestPath(edges),totalBytes=Math.round(size*1000),packets=Math.ceil(totalBytes/MSS);
 const hops=route.slice(1).map((node,i)=>({from:route[i],to:node,duration:edges.find(([a,b])=>a===route[i]&&b===node||b===route[i]&&a===node)[2]}));
 let elapsed=0;for(const hop of hops){hop.start=elapsed;elapsed+=hop.duration;hop.end=elapsed;}
 const segments=Array.from({length:packets},(_,i)=>({id:i,seq:i*MSS,end:Math.min(totalBytes,(i+1)*MSS),bytes:Math.min(MSS,totalBytes-i*MSS)}));
 const transmissions=segments.map(s=>({...s,id:'data-'+s.id,segment:s.id,send:s.id*.45,arrival:s.id*.45+delay,lost:params.loss&&s.id===0,retransmit:false,duplicate:false}));
 // Lose the first copy inside a hop; the sender learns nothing until its toy timeout.
 const lostAt=hops[1].start+hops[1].duration*.5;
 for(const tx of transmissions)if(tx.lost){tx.lossTime=tx.send+lostAt;tx.arrival=null;}
 if(params.duplicate){const s=segments[1];transmissions.push({...s,id:'duplicate-1',segment:1,send:.45+1.2,arrival:.45+1.2+delay,lost:false,retransmit:false,duplicate:true});}
 function receiveLedger(){
 const received=new Set(),events=[],acks=[];let nextByte=0,uniqueBytes=0,requestCompleteAt=null;
 for(const tx of [...transmissions].filter(tx=>!tx.lost).sort((a,b)=>a.arrival-b.arrival||a.id.localeCompare(b.id))){
  const duplicate=received.has(tx.segment);if(!duplicate){received.add(tx.segment);uniqueBytes+=tx.bytes;}
  while(nextByte<totalBytes&&received.has(Math.floor(nextByte/MSS)))nextByte=Math.min(totalBytes,nextByte+MSS);
  events.push({id:'receive-'+tx.id,type:'receive',time:tx.arrival,tx:tx.id,segment:tx.segment,duplicate,uniqueBytes,deliveredBytes:nextByte});
  const ack={id:'ack-'+tx.id,send:tx.arrival,arrival:tx.arrival+delay,nextByte,tx:tx.id};acks.push(ack);
  events.push({id:ack.id,type:'ack-arrival',time:ack.arrival,nextByte});
  if(nextByte===totalBytes&&requestCompleteAt===null)requestCompleteAt=tx.arrival;
 }
 return {events,acks,requestCompleteAt};
 }
 // The sender only observes arriving ACKs. A first-byte ACK cancels this toy
 // timer; duplicate ACK=0 does not. 15 exceeds both example round-trip paths.
 const initial=receiveLedger(),ackAtTimeout=Math.max(0,...initial.acks.filter(a=>a.arrival<=TOY_TIMEOUT).map(a=>a.nextByte));
 const retryDecision={time:TOY_TIMEOUT,ackBytes:ackAtTimeout,expired:ackAtTimeout===0};
 if(retryDecision.expired)transmissions.push({...segments[0],id:'retry-0',segment:0,send:TOY_TIMEOUT,arrival:TOY_TIMEOUT+delay,lost:false,retransmit:true,duplicate:false});
 const {events,acks,requestCompleteAt}=receiveLedger();
 for(const tx of transmissions){events.push({id:'send-'+tx.id,type:'send',time:tx.send,tx:tx.id,segment:tx.segment,retransmit:tx.retransmit});if(tx.lost)events.push({id:'loss-'+tx.id,type:'loss',time:tx.lossTime,tx:tx.id});}
 const response={send:requestCompleteAt+1,arrival:requestCompleteAt+1+delay};
 events.push({id:'request-complete',type:'request-complete',time:requestCompleteAt},{id:'response-send',type:'response-send',time:response.send},{id:'response-arrival',type:'response-arrival',time:response.arrival});
 events.sort((a,b)=>a.time-b.time||a.id.localeCompare(b.id));
 return freeze({params,route,edges,hops,delay,totalBytes,packets,segments,transmissions,acks,events,requestCompleteAt,response,horizon:30,timeUnit:'teaching step',initialSequenceNumber:0,connectionEstablished:true,timeout:TOY_TIMEOUT,retryDecision});
}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function tcpPathAt(trace,elapsed,reverse=false){
 const q=clamp(elapsed,0,trace.delay),hops=reverse?[...trace.hops].reverse().map(h=>({from:h.to,to:h.from,duration:h.duration})):trace.hops;
 let start=0;for(let i=0;i<hops.length;i++){const h=hops[i];if(q<=start+h.duration||i===hops.length-1)return {from:h.from,to:h.to,progress:clamp((q-start)/h.duration,0,1)};start+=h.duration;}
}
export function sampleTCP(trace,time=0){
 const t=clamp(finite(time,'Time'),0,trace.horizon),arrivals=trace.events.filter(e=>e.type==='receive'&&e.time<=t),last=arrivals.at(-1),acks=trace.acks.filter(a=>a.arrival<=t);
 const uniqueBytes=last?.uniqueBytes??0,deliveredBytes=last?.deliveredBytes??0,ackBytes=Math.max(0,...acks.map(a=>a.nextByte));
 const dataFlights=trace.transmissions.flatMap(tx=>{const end=tx.lost?tx.lossTime:tx.arrival;if(t<tx.send||t>=end)return[];return [{...tx,kind:'data',position:tcpPathAt(trace,t-tx.send),elapsed:t-tx.send}];});
 const ackFlights=trace.acks.flatMap(a=>t<a.send||t>=a.arrival?[]:[{...a,kind:'ack',position:tcpPathAt(trace,t-a.send,true)}]);
 const responseActive=t>=trace.response.send&&t<trace.response.arrival;
 return freeze({t,uniqueBytes,deliveredBytes,bufferedBytes:uniqueBytes-deliveredBytes,ackBytes,
  unique:arrivals.filter(e=>!e.duplicate).length,packets:trace.packets,attempts:trace.transmissions.filter(tx=>tx.send<=t).length,
  duplicateArrivals:arrivals.filter(e=>e.duplicate).length,nextByte:deliveredBytes,requestComplete:t>=trace.requestCompleteAt,
  processingProgress:clamp((t-trace.requestCompleteAt),0,1),responseReady:t>=trace.response.send,responseArrived:t>=trace.response.arrival,
  flights:[...dataFlights,...ackFlights,...(responseActive?[{id:'response',kind:'response',position:tcpPathAt(trace,t-trace.response.send,true)}]:[])],
  events:trace.events.filter(e=>e.time<=t),receivedSegments:arrivals.filter(e=>!e.duplicate).map(e=>e.segment),
  lossOccurred:trace.transmissions.some(tx=>tx.lost&&tx.lossTime<=t),retrySent:trace.transmissions.some(tx=>tx.retransmit&&tx.send<=t)});
}
