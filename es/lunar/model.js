// Teaching scenario, not an engineering forecast. Masses are tonnes of installed
// productive equipment equivalents, including the associated power hardware.
export const DEFAULTS={seed:100,payload:25,flights:2,flightGrowth:0,local:.9,reinvest:1,doubling:12,uptime:.85,power:250};
export const YEARS=20,START=2030,POWER_PER_TONNE=.05;
export function simulate(input={}){
 const p={...DEFAULTS,...input};
 for(const [k,min,max] of [['seed',1,10000],['payload',1,1000],['flights',0,120],['flightGrowth',0,.5],['local',0,.98],['reinvest',0,1],['doubling',3,120],['uptime',0,1],['power',.05,100000]])if(!Number.isFinite(p[k])||p[k]<min||p[k]>max)throw new RangeError(k);
 const powerLimit=Math.max(p.seed,p.power/POWER_PER_TONNE),seedFlights=Math.ceil(p.seed/p.payload),monthlyFactor=2**(1/p.doubling)-1;
 let capital=p.seed,stock=0,localTotal=0,usedImports=0,delivered=p.seed,flightCount=0,scheduledTotal=0;
 const rows=[];
 for(let month=0;month<=YEARS*12;month++){
  let build=0,localMade=0,arrivals=0,limit='seed',wanted=0;
  if(month){
   scheduledTotal+=p.flights/12*(1+p.flightGrowth)**((month-1)/12);
   const scheduled=Math.floor(scheduledTotal+1e-9);arrivals=scheduled-flightCount;flightCount=scheduled;
   const delivery=arrivals*p.payload;delivered+=delivery;stock+=delivery;
   wanted=capital*monthlyFactor*p.reinvest*p.uptime;
   const importBound=stock/(1-p.local),powerBound=Math.max(0,powerLimit-capital);
   build=Math.max(0,Math.min(wanted,importBound,powerBound));
   limit=powerBound<=wanted+1e-9&&powerBound<=importBound?'power':importBound<wanted-1e-9?'imports':p.reinvest===0?'reinvest':p.uptime===0?'uptime':'manufacturing';
   localMade=build*p.local;const imported=build-localMade;stock=Math.max(0,stock-imported);usedImports+=imported;localTotal+=localMade;capital+=build;
  }
  const prior=rows[Math.max(0,month-12)],annualLocal=localTotal-(prior?.localTotal||0);
  rows.push({month,year:START+month/12,capital,ideal:p.seed*2**(month/p.doubling),earthOnly:Math.min(delivered,powerLimit),stock,localTotal,usedImports,delivered,flights:seedFlights+flightCount,seedFlights,arrivals,build,localMade,annualLocal,power:capital*POWER_PER_TONNE,limit,wanted,factor:capital/p.seed,localShare:localTotal/capital});
 }
 return {params:p,rows,powerLimit};
}
export function sample(run,month){return run.rows[Math.max(0,Math.min(YEARS*12,Math.floor(month)))];}
export function crossingYear(seedWatts,targetWatts,doublingMonths){if(!(seedWatts>0&&targetWatts>0&&doublingMonths>0))throw new RangeError('Positive values required');return START+Math.max(0,Math.log2(targetWatts/seedWatts))*doublingMonths/12;}
export const STAGES=[
 {id:'seed',month:0,view:'route',title:['La Tierra envía la semilla','Earth sends the seed'],text:['Primero se envía un sistema capaz de trabajar: energía, excavación, procesamiento, fabricación y repuestos. 100 t y 25 t por entrega son supuestos de este laboratorio.','First send a system that can work: power, excavation, processing, manufacturing and spares. 100 t and 25 t per delivery are assumptions in this lab.']},
 {id:'launch',month:12,view:'route',title:['Entregar en la superficie','Deliver to the surface'],text:['Despegar no basta. Hay que transferir la carga, frenar y alunizar. Contamos entregas útiles en la Luna; no equivalen al total de lanzamientos, repostajes ni combustible.','Liftoff is not enough. Cargo must transfer, brake and land. We count useful deliveries to the Moon; these are not total launches, refueling flights or fuel.']},
 {id:'power',month:24,view:'base',title:['Primero, que funcione','First, make it work'],text:['Los paneles, el almacenamiento, los cables y la gestión térmica sostienen la base. La actividad efectiva reduce la producción; no se presupone trabajo continuo sin energía.','Panels, storage, cables and thermal management support the base. Effective uptime reduces output; continuous work without power is not assumed.']},
 {id:'mine',month:36,view:'base',title:['La Luna aporta la materia','The Moon supplies material'],text:['Excavar → separar → transformar. El regolito puede aportar materiales, pero requiere procesamiento y energía. La fracción local es un supuesto de capacidad industrial, no la composición directa del suelo.','Excavate → separate → transform. Regolith can supply materials, but needs processing and energy. The local fraction assumes industrial capability; it is not raw soil composition.']},
 {id:'factory',month:60,view:'base',title:['Una fábrica ayuda a construir otra','One factory helps build another'],text:['Se fabrican piezas, se ensamblan equipos y se prueban. Electrónica, sensores y componentes complejos siguen llegando de la Tierra. Tener mucho material no cierra toda la cadena.','Parts are manufactured, equipment is assembled and tested. Electronics, sensors and complex components still arrive from Earth. Plenty of material does not close the whole supply chain.']},
 {id:'replicate',month:96,view:'growth',title:['La producción se convierte en capacidad','Output becomes capacity'],text:['La parte reinvertida añade equipos productivos. Más capacidad puede construir todavía más. El gráfico compara duplicación ideal, crecimiento limitado y llevar todos los equipos desde la Tierra.','Reinvested output adds productive equipment. More capacity can build still more. The chart compares ideal doubling, constrained growth and importing all equipment from Earth.']},
 {id:'limits',month:240,view:'growth',title:['La curva encuentra sus límites','The curve meets its limits'],text:['Sin componentes importados o sin potencia disponible, el crecimiento se frena. Aumenta entregas, fabricación local o potencia y observa qué restricción aparece después.','Without imported components or available power, growth slows. Increase deliveries, local manufacturing or power and see which constraint appears next.']}
];
