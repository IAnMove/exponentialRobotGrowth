import {STAGES,CABLE_KM,propagationMs} from './internet-route.js';

const clamp=x=>Math.max(0,Math.min(1,x));
const freeze=o=>{if(o&&typeof o==='object'){for(const v of Object.values(o))freeze(v);Object.freeze(o);}return o;};
const SEGMENTS=['home-wifi','access','spain','landing','ocean','america'];

// One representative encrypted message, not a packet count or a measured connection.
// Chapter fractions determine all events; recorded voice duration never changes causality.
export function internetFrameAt(index=0,progress=0){
 if(!Number.isInteger(index)||index<0||index>=STAGES.length)throw new RangeError('Internet chapter must be 0–8');
 if(typeof progress!=='number'||!Number.isFinite(progress))throw new RangeError('Internet progress must be finite');
 const p=clamp(progress),activeSegments=[];
 const add=(id,direction,local)=>activeSegments.push({id,direction,local:clamp(local),arrived:local>=1});
 let processingProgress=0,status='request-travelling',kind='request';
 if(index<6)add(SEGMENTS[index],'request',p);
 else if(index===6){
  if(p<.3)add('server-in','request',p/.3);
  else if(p<.65){processingProgress=(p-.3)/.35;status='server-processing';kind='processing';}
  else{processingProgress=1;add('server-out','response',(p-.65)/.35);status='response-travelling';kind='response';}
 }else if(index===7){add('return','response',p);processingProgress=1;status='response-travelling';kind='response';}
 else{processingProgress=1;kind='response';if(p<.45){add('home-return','response',p/.45);status='response-travelling';}else status=p===1?'page-ready':'browser-rendering';}
 const requestArrived=index>6||(index===6&&p>=.3);
 const responseReady=index>6||(index===6&&p>=.65);
 const responseArrived=index===8&&p>=.45;
 const screenProgress=responseArrived?clamp((p-.45)/.55):0;
 const submarineProgress=index<4?0:index===4?p:1;
 return freeze({index,id:STAGES[index].id,stage:index,progress:p,visualTime:(index+p)*20,
  activeSegments,requestArrived,processingProgress,responseReady,responseArrived,screenProgress,
  signal:{kind,status,distanceKm:index===4?CABLE_KM*p:null,travelMs:index===4?propagationMs(CABLE_KM)*p:null,
   submarineProgress,submarineOneWayMs:propagationMs(CABLE_KM),submarineRoundTripMs:2*propagationMs(CABLE_KM),
   complete:p===1,representativeMessages:1},
  // Land links, queues, application time and rendering are deliberately not invented in milliseconds.
  totalLatencyMs:null,routeSurveyed:false,connectionEstablished:true,dnsPrepared:true,
  protocol:'HTTPS / TLS over TCP',illustrative:true});
}

export const frameAt=internetFrameAt;

export function internetStatus(frame,es=true){
 const copy={
  'request-travelling':['Petición en tránsito','Request in transit'],
  'server-processing':['Servidor procesando','Server processing'],
  'response-travelling':['Respuesta en tránsito','Response in transit'],
  'browser-rendering':['Navegador dibujando','Browser rendering'],
  'page-ready':['Página dibujada','Page rendered']
 };
 return copy[frame.signal.status][es?0:1];
}
