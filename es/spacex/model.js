// Teaching timeline. Times are typical Falcon 9 / Starship-order events, compressed where noted.
export const G0=9.81,F9_HEIGHT=70,F9_DIAM=3.66,STARSHIP_HEIGHT=121;
export const PAYLOAD={leoExpend:22800,leoReuse:16800,gtoExpend:8300};
export const SNAPSHOT={date:'2026-09',falconFlights2025:165,falconFlights2026pace:140,boosterRecord:37,boosterId:'B1067',successRate:.9948,starshipTests:13};
export const FALCON_STEPS=[
 {t:0,id:'pad',es:'En la rampa',en:'On the pad',body:['El primer tramo es el caro: nueve Merlin, tanques, aletas y patas. El segundo tramo y la cofia son más baratos de sustituir.','The first stage is the expensive part: nine Merlins, tanks, fins and legs. The second stage and fairing are cheaper to replace.']},
 {t:8,id:'liftoff',es:'Despegue',en:'Liftoff',body:['Los nueve Merlin del primer tramo encienden en tierra. El despegue es vertical unos segundos y luego la trayectoria se inclina mar adentro.','All nine first-stage Merlins light on the ground. The vehicle rises vertically for a few seconds, then pitches downrange.']},
 {t:70,id:'maxq',es:'Máximo esfuerzo aerodinámico',en:'Max-Q',body:['La presión dinámica alcanza su pico. El cohete ya va rápido dentro de aire todavía denso; a partir de aquí la atmósfera ayuda menos y estorba menos.','Dynamic pressure peaks. The rocket is already fast while the air is still dense; after this the atmosphere both helps and hinders less.']},
 {t:150,id:'meco',es:'MECO y separación',en:'MECO and separation',body:['Corte del primer tramo (~2 min 30 s típicos) y separación. El segundo tramo enciende su Merlin de vacío y sigue hacia órbita.','First-stage cutoff (typically ~2 min 30 s) and separation. The second stage lights its vacuum Merlin and continues toward orbit.']},
 {t:195,id:'fairing',es:'Cofia',en:'Fairing',body:['Fuera de la atmósfera densa, las dos mitades de la cofia se abren. SpaceX también las recupera; aquí se dibujan apartándose.','Out of dense atmosphere the two fairing halves open. SpaceX recovers those too; here they are shown peeling away.']},
 {t:260,id:'boostback',es:'Boostback',en:'Boostback',body:['El primer tramo se da la vuelta y frena para no seguir la elipse del segundo. Sin este encendido no hay aterrizaje cerca de la costa o en el barco.','The first stage flips and burns so it does not follow the second stage’s ellipse. Without this burn there is no landing near the coast or on the ship.']},
 {t:400,id:'entry',es:'Reentrada',en:'Entry',body:['Un encendido corto reduce la velocidad antes de la atmósfera densa. Las aletas de rejilla orientan el tramo como un dardo controlado.','A short burn cuts speed before dense air. Grid fins steer the stage like a guided dart.']},
 {t:480,id:'landing',es:'Aterrizaje',en:'Landing',body:['El encendido final deja el tramo a unos 2 m/s sobre la barcaza o la plaza. Eso es más lento que un ciclista rápido. Tiempo típico: ~8 minutos.','The landing burn sets the stage down at about 2 m/s on the droneship or pad — slower than a fast cyclist. Typical time: ~8 minutes.']},
 {t:560,id:'orbit',es:'Segundo tramo en órbita',en:'Second stage in orbit',body:['El Merlin de vacío sigue. En un vuelo real de Starlink el despliegue puede tardar cerca de una hora; aquí se comprime.','The vacuum Merlin keeps burning. On a real Starlink flight deployment can take about an hour; it is compressed here.']},
 {t:640,id:'deploy',es:'Despliegue',en:'Deploy',body:['La carga sale. El primer tramo ya está en la barcaza: se puede volver a integrar. Ahí está la cadencia de más de un vuelo cada pocos días.','The payload leaves. The first stage is already on the ship, ready to be stacked again. That is the cadence of more than one flight every few days.']}
];
export const STARSHIP_STEPS=[
 {t:0,id:'stack',es:'Torre y pila',en:'Tower and stack',body:['Super Heavy abajo, Starship arriba, brazos de la torre. La idea es coger el booster al vuelo y volver a lanzar sin grúa lenta.','Super Heavy below, Starship above, tower arms. The idea is to catch the booster in flight and launch again without a slow crane.']},
 {t:10,id:'liftoff',es:'Despegue',en:'Liftoff',body:['El booster es una placa de Raptor. El despegue de Starship es más una fábrica de empuje que un cohete clásico de nueve motores.','The booster is a Raptor plate. A Starship liftoff is more a thrust factory than a classic nine-engine rocket.']},
 {t:160,id:'stage',es:'Separación en caliente',en:'Hot staging',body:['La nave enciende mientras el booster aún empuja. Es más brusco que Falcon 9 y forma parte del diseño para no perder segundos.','The ship lights while the booster is still thrusting. It is harsher than Falcon 9 and is there to avoid losing seconds.']},
 {t:250,id:'return',es:'Booster de vuelta',en:'Booster returns',body:['Super Heavy gira hacia la torre. En pruebas se ha cogido con los brazos; no es todavía una operación diaria.','Super Heavy turns back to the tower. Test flights have caught it in the arms; it is not yet a daily operation.']},
 {t:420,id:'catch',es:'Captura',en:'Catch',body:['Los “chopsticks” recogen el booster. Si funciona a ritmo, no hace falta barcaza ni pata de aterrizaje clásica.','The chopsticks catch the booster. At rate, there is no droneship and no classic landing leg.']},
 {t:520,id:'ship',es:'Nave hacia órbita',en:'Ship toward orbit',body:['La etapa superior sigue. A mediados de 2026 SpaceX la describía aún en pruebas, con despliegues de Starlink V3 empezando a aparecer en los vuelos de ensayo.','The upper stage continues. As of mid-2026 SpaceX still described it as testing, with Starlink V3 deployments beginning to show up on trial flights.']},
 {t:640,id:'reentry',es:'Reentrada de la nave',en:'Ship reentry',body:['La nave reentra con tejas y alerones. Recuperarla entera es el objetivo; en 2026 aún se ensayaba, no se daba por industrializado.','The ship reenters with tiles and flaps. Recovering it whole is the goal; in 2026 that was still on trial, not an industrial routine.']}
];
export function stepAt(steps,t){let s=steps[0];for(const x of steps)if(t>=x.t)s=x;return s;}
export function nextStep(steps,t){return steps.find(x=>x.t>t)||null;}
export function progress(steps,t){const last=steps.at(-1).t;return Math.min(1,Math.max(0,t/last));}
export function payloadMass(reuse){return reuse?PAYLOAD.leoReuse:PAYLOAD.leoExpend;}
export function lightPayloadPenalty(){return PAYLOAD.leoExpend-PAYLOAD.leoReuse;}
export function tickFlight(s,dt){
 if(s.playing&&Number.isFinite(dt)&&dt>0){
  s.time=Math.min(s.duration,s.time+dt*s.speed);
  if(s.time>=s.duration){s.playing=false;if(s.loop){s.flights+=1;s.time=0;s.playing=true;}}
 }
 return s;
}
export function createFlight(vehicle='falcon'){
 const steps=vehicle==='starship'?STARSHIP_STEPS:FALCON_STEPS;
 return {vehicle,time:0,playing:false,speed:8,reuse:true,loop:false,flights:1,steps,duration:steps.at(-1).t};
}
export function boosterBack(s){return s.reuse&&s.time>=(s.vehicle==='starship'?250:260);}
export function landed(s){return s.reuse&&s.time>=(s.vehicle==='starship'?420:480);}
