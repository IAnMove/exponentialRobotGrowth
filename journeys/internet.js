import {L,metric,control,toggle,chapter} from './common.js';
import {tcpTrace,sampleTCP,TCP_EDGES} from './internet-tcp.js';
export {shortestPath} from './internet-tcp.js';
let traceKey,trace;
const experiment=p=>{const key=[p.size,p.cut,p.loss,p.duplicate].join(':');if(key!==traceKey){trace=tcpTrace(p);traceKey=key;}return trace;};
export const internet={id:'internet',room:'mind',title:L('Internet: el viaje de un mensaje','Internet: a message in motion'),color:'#72d7ef',unit:L('paso didáctico','teaching step'),horizon:30,continuous:true,
 overview:{yaw:.06,pitch:.16,distance:7},fitLabel:L('Volver al encuadre','Reset framing'),
 viewBounds:[{center:[0,1.7,0],width:6.7,height:3.4},{center:[0,1.9,0],width:7.4,height:4},{center:[0,1.45,0],width:8,height:4},{center:[0,2.3,0],width:9.2,height:5.2}],
 narrationTime(p,i,f){return i<2?0:i===2?f*7:f*30;},
 intro:L('Acompaña un mensaje desde el portátil hasta el servidor. Cambia la red y observa qué llega y qué debe repetirse.','Follow a message from a laptop to a server. Change the network and see what arrives and what must be repeated.'),
 controls:[control('size',L('Mensaje · kB','Message · kB'),12,3,30),toggle('cut',L('Cortar el enlace directo','Cut the direct link')),toggle('loss',L('Perder el primer paquete','Lose the first packet')),toggle('duplicate',L('Enviar una copia duplicada','Send a duplicate copy'))],
 challenge:L('Corta el enlace y compara la ruta. Después pierde un paquete: ¿llegan los bytes finales completos?','Cut the link and compare routes. Then lose a packet: are the final bytes complete?'),
 limitations:L('Transferencia didáctica sobre TCP, con conexión ya preparada. kB = 1.000 bytes; fragmentos de hasta 1.500 bytes y secuencias relativas desde cero. Los tiempos son pasos inventados: el temporizador del primer byte vence en 15 solo si no llega su confirmación; no implementa el algoritmo RTO de TCP ni representa 15 segundos. Se envía un ACK inmediato por llegada, se retienen piezas fuera de orden y solo se entrega el prefijo continuo. La copia opcional tiene los mismos bytes y no se cuenta dos veces. Se omiten ventanas, congestión, fast retransmit, SACK, SYN/FIN y TLS. El camino mínimo muestra una política local sintética; BGP no calcula un óptimo global. La respuesta solo sale tras recibir el mensaje completo y procesarlo un paso. DNS se explica como servicio separado, sin simular la resolución ni atribuirle estos contadores. La visita transatlántica enlazada muestra otra escala y no mide tu conexión.','TCP teaching transfer with an established connection. kB = 1,000 bytes; chunks of up to 1,500 bytes and relative sequence numbers from zero. Timings are invented steps: the first-byte timer expires at 15 only if its acknowledgement has not arrived; it does not implement TCP’s RTO algorithm or mean 15 seconds. Each arrival generates an immediate ACK; out-of-order chunks are buffered and only the contiguous prefix is delivered. The optional copy contains the same bytes and never counts twice. Windows, congestion, fast retransmit, SACK, SYN/FIN and TLS are omitted. The shortest path illustrates a synthetic local policy; BGP does not compute a global optimum. The response leaves only after the complete message arrives and one processing step. DNS is explained separately; resolution is not simulated or measured by these counters. The linked transatlantic voyage shows another scale and does not measure your connection.'),
 sources:[['IETF · TCP','https://www.rfc-editor.org/rfc/rfc9293.html'],['IETF · DNS','https://www.rfc-editor.org/rfc/rfc1034.html']],
 steps:[chapter(L('1 · Escribes una dirección','1 · You type an address'),L('Tu navegador necesita localizar un servicio y comunicarse con él. El equipo entrega datos a su red local. El router permite continuar hacia otras redes; una antena Wi-Fi no contiene Internet. Aquí el mensaje de ejemplo se divide en piezas numeradas.','Your browser needs to locate a service and communicate with it. The computer sends data to its local network. A router provides a path to other networks; a Wi-Fi antenna does not contain the Internet. Here the example message is divided into numbered pieces.')),
 chapter(L('2 · Un nombre encuentra una dirección','2 · A name finds an address'),L('DNS relaciona nombres con registros, entre ellos direcciones IP. Un resolvedor puede utilizar su caché o consultar otros servidores. Esta consulta es distinta de descargar la página. El armario DNS representa ese servicio distribuido, no una única máquina central.','DNS maps names to records, including IP addresses. A resolver can use cached information or query other servers. This lookup is separate from downloading the page. The DNS cabinet represents this distributed service, not a single central machine.')),
 chapter(L('3 · La red elige por dónde continuar','3 · The network forwards the data'),L('Cada router reenvía según su información de encaminamiento. Corta el enlace directo y observa el desvío por la ruta alternativa. El dibujo comprime distancias y equipos: los datos viajan mediante señales físicas y el cambio de ruta real puede tardar.','Each router forwards according to its routing information. Cut the direct link and watch the alternate route. The diagram compresses distances and equipment: data travels as physical signals, and real routing changes can take time.')),
 chapter(L('4 · Ordenar, confirmar y responder','4 · Order, acknowledge and respond'),L('TCP ofrece un flujo ordenado de bytes. Si faltan datos, puede retransmitirlos; recibir un duplicado no duplica el mensaje. El servidor procesa la petición y devuelve datos. La barra cuenta piezas únicas recibidas, mientras que los intentos incluyen la repetición del paquete perdido.','TCP provides an ordered byte stream. Missing data can be retransmitted; a duplicate does not duplicate the message. The server processes the request and returns data. The bar counts unique pieces received, while attempts include retransmitting the lost packet.'))],
 evaluate(p,t){const trace=experiment(p),s=sampleTCP(trace,t),history=Array.from({length:Math.floor(t)+1},(_,i)=>sampleTCP(trace,i));
 return {...s,trace,delay:trace.delay,route:trace.route,cut:trace.params.cut,metrics:[metric(L('Ruta · un sentido','Route · one way'),trace.delay,L('pasos','steps')),metric(L('Piezas únicas','Unique pieces'),`${s.unique} / ${s.packets}`),metric(L('Bytes entregados a la app','Bytes delivered to app'),s.deliveredBytes/1000,'kB'),metric(L('Intentos de envío','Send attempts'),s.attempts)],series:[{label:L('Recibidos · kB','Received · kB'),values:history.map(s=>s.uniqueBytes/1000)},{label:L('Entregados · kB','Delivered · kB'),values:history.map(s=>s.deliveredBytes/1000)},{label:L('Confirmados en emisor · kB','Acknowledged at sender · kB'),values:history.map(s=>s.ackBytes/1000)}]};},
 build(k){
 const laptop=k.group(0);k.box(laptop,[0,1,0],[4,.18,2.4],0xa28d73,L('Mesa de trabajo','Desk'));
 for(const x of [-1.8,1.8])for(const z of [-1,1])k.box(laptop,[x,.5,z],[.12,1,.12],0x324454);
 k.box(laptop,[0,1.18,0],[2.1,.1,1.4],0xaabcc7,L('Portátil','Laptop'));k.box(laptop,[0,1.85,-.6],[2.2,1.3,.08],0x324b68,L('Navegador','Browser'));k.box(laptop,[0,1.85,-.54],[2,.99,.018],0x102d46);k.label(laptop,'atlas.example',0,1.85,-.5,1.7);
 for(let row=0;row<3;row++)for(let col=0;col<11;col++)k.box(laptop,[-.9+col*.18,1.237,-.35+row*.18],[.13,.015,.11],0x223b4a);
 k.box(laptop,[2.2,.6,-2.5],[1.4,.45,.9],0x839faf,L('Router / ONT · acceso al operador','Router / ONT · operator access'));
 for(const x of [1.7,2.7])k.cylinder(laptop,[x,1.1,-2.7],.03,.9,0x9db7c6);
 for(let i=0;i<4;i++)k.sphere(laptop,[1.8+i*.2,.75,-2.03],.033,0x80d9b7);k.label(laptop,'Wi-Fi / ONT',2.2,1.9,-2.5,2);
 k.tube(laptop,[[2.3,.55,-2.9],[3,.25,-3],[3,.25,-4]],.035,0x73a6bc,L('Fibra hacia el operador; no un cable dedicado a la web','Fiber to the operator; not a dedicated cable to the website'));
 const dns=k.group(1);k.box(dns,[0,1.4,0],[2.4,2.8,1.4],0x304c65,L('Resolvedor DNS · servicio distribuido','DNS resolver · distributed service'));
 for(let i=0;i<5;i++){k.box(dns,[0,.4+i*.45,.75],[2,.21,.08],0x52748e);k.sphere(dns,[-.8,.4+i*.45,.82],.04,0x7ee0b6);}
 k.label(dns,'DNS → IP',0,3.3,0,3);k.label(dns,'atlas.example',-2.5,1.7,0,2);k.label(dns,'192.0.2.10',2.5,1.7,0,2);
 k.tube(dns,[[-2.5,1,0],[0,1,.9],[2.5,1,0]],.035,0x76bdce,L('Ejemplo de nombre y dirección de documentación; sin resolver una web real','Example name and documentation address; no live lookup'));
 const net=k.group(2),coords=[[-3,1,3],[-2,1,0],[0,1,-3],[2,1,0],[3,1,-4]],links=[];
 const nodes=coords.map((p,i)=>{const n=k.box(net,p,[1.05,.55,.8],0x456b80,L(`Nodo ${i} · equipo esquemático`,`Node ${i} · schematic equipment`));k.label(net,String(i),p[0],p[1]+.7,p[2],.65);for(let j=0;j<3;j++)k.sphere(net,[p[0]-.3+j*.3,p[1]+.05,p[2]+.43],.035,0x86dfc1);return n;});
 for(const [a,b,w]of TCP_EDGES){links.push({a,b,mesh:k.tube(net,[coords[a],coords[b]],.045,0x476685,L('Enlace del grafo ilustrativo','Illustrative graph link'))});const mid=coords[a].map((v,i)=>(v+coords[b][i])/2);k.label(net,String(w),mid[0],mid[1]+.35,mid[2],.6);}
 const packets=Array.from({length:48},()=>k.sphere(net,[0,0,0],.095,0xffd786));
 const server=k.group(3);for(const x of [-3.5,3.5]){k.box(server,[x,1.35,-1.4],[1.3,2.7,1.2],0x263e53);for(let i=0;i<7;i++){k.box(server,[x,.3+i*.34,-.75],[1.1,.2,.06],0x476780);k.sphere(server,[x-.42,.3+i*.34,-.7],.028,0x88d9ba);}k.label(server,x<0?(k.es?'Emisor':'Sender'):(k.es?'Receptor':'Receiver'),x,3,1.1,1.9);}
 k.box(server,[0,3.25,.25],[5.8,3.2,.1],0x193548,L('Estado del receptor y confirmaciones en el emisor','Receiver state and acknowledgements at sender'));
 k.tube(server,[[-3.5,1.35,-.7],[-3.5,1.35,1.2],[0,1.35,1.2],[3.5,1.35,1.2],[3.5,1.35,-.7]],.03,0x5c788d,L('Datos hacia el receptor; confirmaciones y respuesta hacia el emisor','Data toward receiver; acknowledgements and response toward sender'));
 k.label(server,'TCP · SEQ → ACK',0,4.65,0,4.5);
 const cells=Array.from({length:20},(_,i)=>{const x=-2.3+i%10*.5,y=3.45-Math.floor(i/10)*.5;k.label(server,String(i+1),x,y+.18,.5,.3);return k.box(server,[x,y,.5],[.4,.3,.3],0x36495c,L(`Segmento ${i+1}: bytes únicos, no copias`,`Segment ${i+1}: unique bytes, not copies`));});
 const bar=k.box(server,[0,4.05,.5],[5,.15,.25],0x71e5bb),orderedBar=k.box(server,[0,2.3,.5],[5,.15,.25],0x71b7f0),ackBar=k.box(server,[0,1.9,.5],[5,.15,.25],0xddb980);
 for(const y of [4.05,2.3,1.9])k.box(server,[0,y,.34],[5,.17,.03],0x3b5063);
 k.label(server,'Rx',-3,4.05,.5,.7);k.label(server,'APP',-3,2.3,.5,.7);k.label(server,'ACK',-3,1.9,.5,.7);
 const localPackets=Array.from({length:48},()=>k.sphere(server,[0,0,0],.085,0xffd786));
 const parts={coords,nodes,links,packets,localPackets,cells,bar,orderedBar,ackBar,state:null};k.scene.userData.internet=parts;
 const between=(marker,a,b,f)=>{marker.position.set(...a).lerp(new k.THREE.Vector3(...b),f);};
 return (model,time)=>{
  const s=sampleTCP(model.trace,time);parts.state=s;
  links.forEach(l=>{const used=model.route.some((v,i)=>v===l.a&&model.route[i+1]===l.b||v===l.b&&model.route[i+1]===l.a);l.mesh.visible=!(model.cut&&l.a===1&&l.b===2);l.mesh.material.color.set(used?0xc9ad72:0x476685);});
  for(let i=0;i<48;i++){
   const f=s.flights[i],a=packets[i],b=localPackets[i];a.visible=b.visible=!!f;if(!f)continue;
   const color=f.kind==='ack'?0x78e3c0:f.kind==='response'?0x82baff:f.retransmit?0xff956c:0xffd786;a.material.color.set(color);b.material.color.set(color);
   between(a,coords[f.position.from],coords[f.position.to],f.position.progress);
   const from=f.kind==='data'?[-3.5,1.35,1.2]:[3.5,1.35,1.2],to=f.kind==='data'?[3.5,1.35,1.2]:[-3.5,1.35,1.2],start=f.send??model.trace.response.send;
   between(b,from,to,Math.max(0,Math.min(1,(s.t-start)/model.trace.delay)));b.position.y+=f.kind==='ack'?.28:f.kind==='response'?.52:0;
  }
  cells.forEach((m,i)=>{m.visible=i<model.packets;const received=s.receivedSegments.includes(i),delivered=model.trace.segments[i]?.end<=s.deliveredBytes;m.material.color.set(delivered?0x78e3c0:received?0xffd786:i===0&&s.lossOccurred&&!s.retrySent?0xb65665:0x36495c);});
  for(const [m,value]of [[bar,s.uniqueBytes],[orderedBar,s.deliveredBytes],[ackBar,s.ackBytes]]){const f=value/model.trace.totalBytes;m.scale.x=Math.max(.001,f);m.position.x=-2.5+2.5*f;}
 };
 }
};
