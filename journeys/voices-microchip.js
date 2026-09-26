// Recorded with MiniMax speech-2.8-hd. No credentials are shipped.
export const VOICES = {
  "es": [
    {
      "id": "step-0",
      "title": "1 · Un campo abre un canal",
      "text": "La puerta de un transistor MOS controla, mediante un campo eléctrico, un canal entre fuente y drenador. La capa aislante separa la puerta del semiconductor. Este corte ampliado es esquemático: los chips modernos también utilizan geometrías tridimensionales. Una señal lógica es un rango de tensión, no una bolita física.",
      "file": "journey-microchip-es-step-0-3d533ecda83e.mp3",
      "duration": 21.6
    },
    {
      "id": "step-1",
      "title": "2 · Dos transistores invierten un bit",
      "text": "Un inversor CMOS combina un transistor de tipo p y otro de tipo n. Idealmente, una entrada baja activa el camino hacia la alimentación; una entrada alta activa el camino hacia tierra. Así, la salida es lo contrario de la entrada. Cambia A para ver ambos caminos.",
      "file": "journey-microchip-es-step-1-cd6215a00947.mp3",
      "duration": 20.412
    },
    {
      "id": "step-2",
      "title": "3 · Combinar puertas lógicas",
      "text": "Una puerta XOR produce uno cuando sus dos entradas son diferentes. AND necesita ambas entradas a uno; OR necesita al menos una. Conecta estas operaciones para formar un sumador completo. Los pulsos de color indican qué señales usamos; su velocidad es una ayuda visual, no un tiempo electrónico real.",
      "file": "journey-microchip-es-step-2-3b4dd6eac42e.mp3",
      "duration": 21.888
    },
    {
      "id": "step-3",
      "title": "4 · Suma y acarreo",
      "text": "Un sumador completo recibe A, B y un acarreo previo. Devuelve un bit de suma y un nuevo acarreo. Uno más uno da diez en binario: suma cero y acarreo uno. Prueba las ocho combinaciones de entrada. Los procesadores encadenan circuitos de este tipo y añaden registros, memoria y control.",
      "file": "journey-microchip-es-step-3-d1b686de9dc7.mp3",
      "duration": 20.268
    }
  ],
  "en": [
    {
      "id": "step-0",
      "title": "1 · A field opens a channel",
      "text": "A MOS transistor gate uses an electric field to control a channel between source and drain. An insulating layer separates the gate from the semiconductor. This enlarged cross-section is schematic: modern chips also use three-dimensional geometries. A logic signal is a voltage range, not a physical bead.",
      "file": "journey-microchip-en-step-0-e62b578515c9.mp3",
      "duration": 19.512
    },
    {
      "id": "step-1",
      "title": "2 · Two transistors invert a bit",
      "text": "A CMOS inverter combines a p-type and an n-type transistor. Ideally, a low input enables the path to the supply; a high input enables the path to ground. The output therefore reverses the input. Change A to see both paths.",
      "file": "journey-microchip-en-step-1-e4595643a4b5.mp3",
      "duration": 16.704
    },
    {
      "id": "step-2",
      "title": "3 · Combining logic gates",
      "text": "An XOR gate produces one when its inputs differ. AND needs both inputs to be one; OR needs at least one. Connect these operations to build a full adder. Coloured pulses show the signals being used; their speed is a visual aid, not a real electronic timing.",
      "file": "journey-microchip-en-step-2-41c154d459da.mp3",
      "duration": 18.288
    },
    {
      "id": "step-3",
      "title": "4 · Sum and carry",
      "text": "A full adder receives A, B and a previous carry. It returns a sum bit and a new carry. One plus one is binary ten: sum zero and carry one. Try all eight input combinations. Processors connect circuits of this kind and add registers, memory and control.",
      "file": "journey-microchip-en-step-3-50c322688008.mp3",
      "duration": 19.26
    }
  ]
};
const base = new URL(document.documentElement.lang === 'es' ? '../../audio/' : '../audio/', import.meta.url);
for (const entries of Object.values(VOICES)) for (const entry of entries) entry.src = new URL(entry.file, base).href;
