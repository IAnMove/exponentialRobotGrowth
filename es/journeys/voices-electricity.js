// Recorded with MiniMax speech-2.8-hd. No credentials are shipped.
export const VOICES = {
  "es": [
    {
      "id": "step-0",
      "title": "1 · Convertir energía",
      "text": "El viento hace girar un generador. Los paneles convierten luz en electricidad. Sigue la potencia disponible durante un día: al anochecer desaparece la aportación solar. Un megavatio mide potencia; mantenerlo una hora produce un megavatio hora de energía.",
      "file": "journey-electricity-es-step-0-5c4d88ccb180.mp3",
      "duration": 16.956
    },
    {
      "id": "step-1",
      "title": "2 · Elevar la tensión",
      "text": "Un transformador cambia la tensión de una corriente alterna. Para transportar la misma potencia, una tensión mayor permite una corriente menor. En nuestro circuito simplificado, la potencia es tensión por corriente y el calentamiento del cable es corriente al cuadrado por resistencia. Prueba el control de tensión.",
      "file": "journey-electricity-es-step-1-e47a0fc3de1b.mp3",
      "duration": 19.044
    },
    {
      "id": "step-2",
      "title": "3 · Atravesar la red",
      "text": "Las torres sostienen conductores; parte de la energía se transforma en calor. Las subestaciones vuelven a reducir la tensión antes de distribuirla. Las luces que recorren los cables representan transferencia de energía, no electrones viajando desde la central hasta tu casa.",
      "file": "journey-electricity-es-step-2-e00827f3ef5c.mp3",
      "duration": 17.532
    },
    {
      "id": "step-3",
      "title": "4 · Equilibrar cada hora",
      "text": "La ciudad pide potencia y la batería guarda energía. Este ejemplo empieza con diez megavatios hora y permite cargar o descargar hasta seis megavatios. Avanza las horas: una batería vacía no cubre un déficit, y una llena obliga a recortar un excedente. El gráfico muestra demanda y suministro efectivo.",
      "file": "journey-electricity-es-step-3-dff7f4d1183d.mp3",
      "duration": 21.42
    }
  ],
  "en": [
    {
      "id": "step-0",
      "title": "1 · Converting energy",
      "text": "Wind turns a generator. Panels convert light into electricity. Follow available power over a day: solar production disappears at night. A megawatt measures power; sustaining it for one hour produces one megawatt hour of energy.",
      "file": "journey-electricity-en-step-0-c8983d6d9da6.mp3",
      "duration": 16.776
    },
    {
      "id": "step-1",
      "title": "2 · Raising voltage",
      "text": "A transformer changes alternating voltage. For the same power, higher voltage allows lower current. In our simplified circuit, power equals voltage times current, and cable heating equals current squared times resistance. Try the voltage control.",
      "file": "journey-electricity-en-step-1-3cd8979e502e.mp3",
      "duration": 16.776
    },
    {
      "id": "step-2",
      "title": "3 · Crossing the grid",
      "text": "Towers support conductors; some energy becomes heat. Substations reduce voltage again before distribution. Lights moving along these wires represent energy transfer, not electrons travelling from the power station to your home.",
      "file": "journey-electricity-en-step-2-1bf07266f69c.mp3",
      "duration": 13.824
    },
    {
      "id": "step-3",
      "title": "4 · Balancing every hour",
      "text": "The city demands power and the battery stores energy. This example starts with ten megawatt hours and allows charging or discharging at up to six megawatts. Advance the hours: an empty battery cannot cover a shortage, and a full one forces surplus curtailment. The chart shows demand and actual supply.",
      "file": "journey-electricity-en-step-3-2a5297ba28a5.mp3",
      "duration": 20.016
    }
  ]
};
const base = new URL(document.documentElement.lang === 'es' ? '../../audio/' : '../audio/', import.meta.url);
for (const entries of Object.values(VOICES)) for (const entry of entries) entry.src = new URL(entry.file, base).href;
