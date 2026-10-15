export const LESSONS = [
  {
    "id": "task",
    "title": [
      "La misma tarea",
      "The same task"
    ],
    "body": [
      "Comparamos una tarea ya automatizable. Una hora efectiva produce una unidad equivalente, tanto para una persona como para un robot.",
      "We compare an already automatable task. One effective hour makes one equivalent unit, for a person or a robot."
    ],
    "formula": [
      "Mismo ritmo por hora y misma calidad asumida. Tres experimentos independientes.",
      "Same hourly pace and assumed quality. Three independent experiments."
    ],
    "caption": [
      "Los objetos ilustran trabajo equivalente; no son toneladas ni productos comerciales.",
      "Objects illustrate equivalent work, not tonnes or commercial products."
    ]
  },
  {
    "id": "hours",
    "title": [
      "Más horas, más producción",
      "More hours, more output"
    ],
    "body": [
      "Un robot puede presupuestar más horas al día. Una fábrica humana también puede cubrir las veinticuatro horas mediante turnos de personas distintas.",
      "A robot can budget more daily hours. A human factory can also cover twenty-four hours using shifts staffed by different people."
    ],
    "formula": [
      "10 × horas por robot frente a 10 × 8 × turnos, antes del suministro.",
      "10 × robot hours versus 10 × 8 × shifts, before supply constraints."
    ],
    "caption": [
      "Más horas es una ventaja fija; todavía no multiplica el número de productores.",
      "More hours is a fixed advantage; it does not yet multiply the producers."
    ]
  },
  {
    "id": "reinvest",
    "title": [
      "Bienes hoy o productores mañana",
      "Goods today or producers tomorrow"
    ],
    "body": [
      "El trabajo de la flota creciente se divide: una parte entrega bienes y otra construye robots. Ambas salen del mismo presupuesto.",
      "The growing fleet splits its work: some delivers goods and some builds robots. Both use the same budget."
    ],
    "formula": [
      "Trabajo utilizado = bienes + trabajo para construir capacidad.",
      "Utilized work = goods + work building capacity."
    ],
    "caption": [
      "Reinversión de trabajo, no una cuenta de dinero. La fabricación requiere piezas externas.",
      "Work reinvestment, not a cash account. Manufacturing needs external parts."
    ]
  },
  {
    "id": "commission",
    "title": [
      "Construir no es estar operativo",
      "Built does not mean operational"
    ],
    "body": [
      "El saldo de trabajo completa robots enteros al cerrar un día. Cada lote pasa dos días completos en puesta en marcha antes de incorporarse.",
      "The work balance completes whole robots at a day’s close. Each batch spends two full days commissioning before joining the fleet."
    ],
    "formula": [
      "Construido en día d → disponible al comienzo de d + 3.",
      "Built during day d → available at the start of d + 3."
    ],
    "caption": [
      "Sigue la misma identidad entre montaje, pruebas y puesto activo.",
      "Follow the same identity through assembly, testing and an active workstation."
    ]
  },
  {
    "id": "compound",
    "title": [
      "Los productores crean productores",
      "Producers make producers"
    ],
    "body": [
      "Con una fracción reinvertida, más robots pueden construir más robots. Sin nuevos productores, las horas diarias permanecen constantes.",
      "With a reinvested fraction, more robots can build more robots. Without new producers, daily hours remain constant."
    ],
    "formula": [
      "Ideal divisible: N(d) = 10 × (1 + reinversión × horas / horas de construcción)^d.",
      "Divisible ideal: N(d) = 10 × (1 + reinvestment × hours / build hours)^d."
    ],
    "caption": [
      "La espera, los robots enteros, el suministro y las plazas modifican ese ideal. No hay fechas de adopción.",
      "Delays, whole robots, supply and slots change that ideal. These are not adoption dates."
    ]
  },
  {
    "id": "cost",
    "title": [
      "Cuánto cuesta cada unidad",
      "What each unit costs"
    ],
    "body": [
      "Compara costes editables para la misma tarea y plena utilización. La instalación, el servicio, la supervisión y la electricidad se reparten entre las unidades.",
      "Compare editable costs for the same task at full utilization. Installation, service, supervision and electricity are spread across units."
    ],
    "formula": [
      "Robot = material + coste diario por robot / horas activas.",
      "Robot = material + daily robot cost / active hours."
    ],
    "caption": [
      "Tener más robots no baja por sí solo este coste por unidad. Menos utilización lo aumenta.",
      "Having more robots does not by itself reduce this unit cost. Lower utilization increases it."
    ]
  }
];
export const SOURCES = [["OpenStax · crecimiento exponencial / exponential growth", "https://openstax.org/books/college-algebra-2e/pages/6-1-exponential-functions"], ["Universal Robots · inversión e integración / investment and integration", "https://www.universal-robots.com/blog/calculating-roi-and-payback-period-for-your-robotic-investment/"], ["IFR · robots industriales / industrial robots", "https://ifr.org/industrial-robots"]];
const LIMITS = [["Todas las cantidades, productividad, horas, reinversión y costes son supuestos editables. No medimos humanoides comerciales, no modelamos desempleo ni demostramos autorreplicación de una cadena industrial completa. Los robots dibujados son hardware didáctico genérico, no un modelo comercial.", "All quantities, productivity, hours, reinvestment and costs are editable assumptions. We do not measure commercial humanoids, model unemployment or establish self-replication of a complete industrial supply chain. Rendered robots are generic teaching hardware, not a commercial model."], ["Una unidad equivale a una hora efectiva de trabajo. El suministro limita ese trabajo en los tres escenarios e incluye fabricar robots; no representa una receta de materiales. Las plazas solo limitan la flota creciente. Las nuevas instalaciones no se construyen aquí. Con límites desactivados se supone suministro e instalaciones ilimitados.", "One unit equals one effective working hour. Supply caps that work in all three scenarios, including robot manufacturing; it is not a material recipe. Slots limit only the growing fleet. New facilities are not built here. Disabling limits assumes unlimited supply and facilities."], ["Diez puestos humanos por turno: tres turnos emplean treinta personas distintas. No se modelan descansos semanales. Veintiuna horas descuentan paradas ilustrativas; veinticuatro es un máximo ideal. La fracción del día interpola uniformemente el presupuesto; no reproduce horarios de turnos. Los robots enteros terminan al cierre del día y se activan al comienzo de d + 3.", "Ten human workstations per shift: three shifts employ thirty different people. Weekly rest is not modeled. Twenty-one hours allows illustrative downtime; twenty-four is an ideal maximum. Day fractions uniformly interpolate the budget, not shift schedules. Whole robots finish at day close and activate at the start of d + 3."], ["Los acumulados incluyen solamente el trabajo transcurrido. La capacidad diaria es un presupuesto, no bienes ya fabricados. En el horizonte final mostramos capacidad potencial por separado. Un icono agregado identifica su cantidad exacta; no equivale siempre a un robot.", "Cumulative quantities include only elapsed work. Daily capacity is a budget, not already produced goods. At the final horizon potential capacity is identified separately. An aggregate icon identifies its exact count; it does not always equal one robot."], ["Costes: material y calidad iguales; amortización lineal sin valor residual durante vida × 365 días. Servicio anual y supervisión por robot/día. Se asume plena utilización durante las horas elegidas. Faltan financiación, impuestos, edificio, otras máquinas, rechazos y cambios de proceso. No es un presupuesto total de fábrica. Los euros no financian la reinversión de trabajo.", "Costs: equal material and quality; straight-line depreciation without residual value over life × 365 days. Annual service and supervision per robot/day. Full utilization during selected hours is assumed. Financing, taxes, buildings, other machines, rejects and process changes are omitted. This is not a total factory budget. Euros do not finance work reinvestment."], ["La voz y los controles mueven una única posición del modelo. Las pausas de observación no producen trabajo. Los tiempos de la grabación se asocian a tramos del ejemplo, sin alineación por palabra ni velocidad industrial real.", "Narration and controls move one model position. Observation pauses produce no work. Recording times map to example segments, without word alignment or real industrial timing."]];
export function scopeMarkup(es){return LIMITS.map(p=>`<p>${p[es?0:1]}</p>`).join('');}
