// Recorded with MiniMax speech-2.8-hd. No credentials are shipped.
export const VOICES = {
  "es": [
    {
      "id": "step-0",
      "title": "1 · Variación heredable",
      "text": "Esta población idealizada tiene dos variantes de un gen: A y B. Empezamos con la mitad de cada una. Los cuerpos recuerdan a células, pero sus colores son etiquetas del modelo, no especies reales. La evolución se mide aquí como un cambio en la frecuencia de esas variantes entre generaciones.",
      "file": "journey-evolution-es-step-0-edb86e442200.mp3",
      "duration": 16.128
    },
    {
      "id": "step-1",
      "title": "2 · Diferencias en reproducción",
      "text": "Una ventaja positiva hace que A contribuya, en promedio, con más descendientes. Una ventaja negativa favorece a B. Cambia el control para representar otro entorno. Los individuos no deciden adaptarse: una diferencia heredable modifica las probabilidades reproductivas y la composición de la siguiente generación.",
      "file": "journey-evolution-es-step-1-165961acc066.mp3",
      "duration": 21.564
    },
    {
      "id": "step-2",
      "title": "3 · Copiar también introduce variación",
      "text": "En cada generación se seleccionan las variantes que formarán la siguiente y algunas copias pueden mutar. Nuestro modelo permite cambios de A a B y de B a A con igual probabilidad. Las mutaciones no aparecen porque un organismo las necesite. Esta tasa es didáctica, no una tasa genética medida.",
      "file": "journey-evolution-es-step-2-873c30084cc6.mp3",
      "duration": 19.116
    },
    {
      "id": "step-3",
      "title": "4 · El azar cambia la trayectoria",
      "text": "Con solo cincuenta individuos, el muestreo aleatorio puede aumentar o perder una variante: es deriva genética. Cambia la semilla para comparar historias. Desactiva población finita para ver la expectativa matemática. Con ventaja y mutación a cero, esa expectativa permanece estable, mientras una población pequeña puede fluctuar.",
      "file": "journey-evolution-es-step-3-8baf34bfef82.mp3",
      "duration": 21.924
    }
  ],
  "en": [
    {
      "id": "step-0",
      "title": "1 · Heritable variation",
      "text": "This idealised population has two variants of one gene: A and B. We start with half of each. The shapes resemble cells, but their colours are model labels, not real species. Here evolution is measured as a change in variant frequencies across generations.",
      "file": "journey-evolution-en-step-0-224b95e57041.mp3",
      "duration": 18.396
    },
    {
      "id": "step-1",
      "title": "2 · Differences in reproduction",
      "text": "A positive advantage makes A contribute more offspring on average. A negative advantage favours B. Change the control to represent another environment. Individuals do not decide to adapt: an inherited difference changes reproductive probabilities and the composition of the next generation.",
      "file": "journey-evolution-en-step-1-0369b3dac9af.mp3",
      "duration": 17.604
    },
    {
      "id": "step-2",
      "title": "3 · Copying also introduces variation",
      "text": "Each generation selects the variants forming the next, and some copies may mutate. Our model allows A-to-B and B-to-A changes with equal probability. Mutations do not appear because an organism needs them. This rate is educational, not a measured genetic rate.",
      "file": "journey-evolution-en-step-2-66fc2436a7b5.mp3",
      "duration": 18.0
    },
    {
      "id": "step-3",
      "title": "4 · Chance changes the trajectory",
      "text": "With only fifty individuals, random sampling can increase or lose a variant: this is genetic drift. Change the seed to compare histories. Disable finite population to see the mathematical expectation. With advantage and mutation at zero, that expectation stays stable while a small population can fluctuate.",
      "file": "journey-evolution-en-step-3-834ac72d2da1.mp3",
      "duration": 20.628
    }
  ]
};
const base = new URL(document.documentElement.lang === 'es' ? '../../audio/' : '../audio/', import.meta.url);
for (const entries of Object.values(VOICES)) for (const entry of entries) entry.src = new URL(entry.file, base).href;
