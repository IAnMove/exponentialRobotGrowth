// Phase order follows the proposed HLS architecture; timings and payload are illustrative.
export const MISSION_STAGES=[
 ['liftoff','Despegar desde la Tierra','Liftoff from Earth','Super Heavy impulsa la nave lunar. La carga industrial empieza aquí, pero aún no ha llegado a la Luna.','Super Heavy launches the lunar vehicle. Industrial cargo starts here, but has not yet reached the Moon.'],
 ['booster','Separar y recuperar el propulsor','Separate and recover the booster','El propulsor regresa a la Tierra. La nave superior continúa hacia órbita: son vehículos con destinos distintos.','The booster returns to Earth. The upper vehicle continues toward orbit: these vehicles have different destinations.'],
 ['refuel','Repostar en órbita terrestre','Refuel in Earth orbit','Depósito, vuelos cisterna y nave lunar: una entrega requiere una campaña de apoyo. No fijamos un número de vuelos cisterna.','Depot, tanker flights and lunar vehicle: a delivery requires a support campaign. We do not assume a fixed number of tanker flights.'],
 ['transfer','Cruzar hasta la Luna','Transfer to the Moon','La nave abandona la órbita terrestre, viaja durante días y realiza maniobras para llegar a la Luna. Curva y tiempos comprimidos.','The vehicle leaves Earth orbit, travels for days and maneuvers to reach the Moon. The curve and time are compressed.'],
 ['descent','Frenar y alunizar','Brake and land','Hay que reducir la velocidad y descender de forma controlada. La Luna no tiene una atmósfera útil para frenar con paracaídas.','Velocity must be reduced for a controlled descent. The Moon has no useful atmosphere for parachute braking.'],
 ['unload','Bajar la carga a la superficie','Lower cargo to the surface','Un elevador deposita equipos; un vehículo los acerca a la base. La descarga representa una entrega, no una fábrica completa.','An elevator lowers equipment; a rover takes it toward the base. Unloading represents a delivery, not a complete factory.'],
 ['return','Qué vuelve, y adónde','What returns, and where','HLS regresa a órbita lunar en la arquitectura tripulada. No lleva el escudo ni las aletas de la versión que reentra en la Tierra. El ciclo de carga futuro puede ser diferente.','HLS returns to lunar orbit in the crewed architecture. It lacks the heat shield and flaps of the Earth-reentry variant. Future cargo cycles may differ.']
].map(([id,es,en,tes,ten])=>({id,month:0,view:'mission',title:[es,en],text:[tes,ten]}));
export function missionPose(id,progress){const u=Math.max(0,Math.min(1,progress)),smooth=u*u*(3-2*u);switch(id){
 case 'liftoff':return {u,height:42*u*u,flame:1,camera:[30,19+35*u*u,43],target:[0,12+42*u*u,0]};
 case 'booster':return {u,height:42*(1-smooth),upper:54+55*u,separation:8*u,flame:u<.25||u>.72?1:0,camera:[31,18+30*(1-smooth),44],target:[0,10+30*(1-smooth),0]};
 case 'refuel':return {u,camera:[30-6*u,16,34],target:[0,4,0]};
 case 'transfer':return {u,camera:[0,19,55-6*u],target:[0,1,0]};
 case 'descent':return {u,height:36*(1-smooth),flame:u<.97?1:0,camera:[25,14+22*(1-smooth),36],target:[0,9+25*(1-smooth),0]};
 case 'unload':return {u,lift:Math.max(0,1-u/.55),cargo:Math.max(0,(u-.6)/.4),camera:[21-5*u,13-3*u,25],target:[1,7,0]};
 default:return {u,height:45*u*u,flame:u>.04?1:0,camera:[28,15+36*u*u,40],target:[0,10+45*u*u,0]};
}}

// One marker is one modeled lunar delivery, irrespective of the tanker campaign.
export function deliveryEvents(run){return run.rows.flatMap(r=>Array.from({length:r.arrivals},(_,i)=>({number:r.flights-r.arrivals+i+1,arrival:r.month,departure:r.month-.85+i/Math.max(1,r.arrivals)*.2})));}
export function deliveriesAt(events,month){return events.filter(e=>month>=e.departure&&month<e.arrival).map(e=>({...e,progress:(month-e.departure)/(e.arrival-e.departure)}));}
