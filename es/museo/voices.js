// Recorded with MiniMax speech-2.8-hd. No credentials are shipped.
export const VOICES = {
  "es": [
    {
      "id": "hall",
      "title": "Un museo de mundos",
      "text": "Estás en el atrio. Desde aquí se abren tres salas: inteligencia, industria y vida cotidiana, y cosmos. Camina con las teclas W, A, S y D, o utiliza el joystick. Arrastra para mirar. También puedes pulsar un cuadro o elegirlo en el plano: el paseo te llevará hasta él. La superficie iluminada del cuadro de modelos de lenguaje es una puerta. Al entrar, cruzarás el marco y aparecerás dentro de su mundo en tres dimensiones.",
      "file": "museo-es-hall-99937ab664d1.mp3",
      "duration": 29.628
    },
    {
      "id": "mind",
      "title": "Inteligencia",
      "text": "Esta es la sala de inteligencia. Los cuadros exploran el lenguaje, la mente y distintas familias de modelos. Dentro de una respuesta es la primera experiencia inmersiva. Acércate a su cuadro y pulsa Entrar, o la tecla E. Al otro lado puedes caminar entre ocho estaciones, inspeccionar matrices y seguir una pregunta hasta que se genera un token. Allí tienes una guía de voz. Es una representación didáctica con pesos sintéticos y respuestas preparadas, no el interior físico de un ordenador.",
      "file": "museo-es-mind-652ba6b78f57.mp3",
      "duration": 32.364
    },
    {
      "id": "industry",
      "title": "Industria y vida cotidiana",
      "text": "Esta sala conecta robots, fábricas y vida cotidiana. Encontrarás una cadena de producción, la fabricación de chips, una casa y un modelo de crecimiento. Cada cuadro muestra el tema antes de abrirlo. Por ahora, estas experiencias se visitan como notebooks web. Sus interiores inmersivos se construirán uno a uno. La automatización y el crecimiento que verás dependen de los supuestos y límites que explica cada simulación.",
      "file": "museo-es-industry-7c8d6ba43ac9.mp3",
      "duration": 26.424
    },
    {
      "id": "cosmos",
      "title": "Cosmos",
      "text": "En la sala del cosmos viajamos desde la órbita terrestre hasta la escala de una civilización. Los cuadros presentan Starlink, los vehículos espaciales, un enjambre de Dyson y la escala de Kardashev. Puedes abrir sus notebooks para explorar las escenas y sus explicaciones. Estos cuatro interiores todavía no son mundos transitables. El museo distingue lo disponible en web de lo que ya puedes recorrer en primera persona.",
      "file": "museo-es-cosmos-5dfea3ea0074.mp3",
      "duration": 24.768
    }
  ],
  "en": [
    {
      "id": "hall",
      "title": "A museum of worlds",
      "text": "You are in the atrium. Three galleries open from here: intelligence, industry and everyday life, and the cosmos. Walk with W, A, S and D, or use the joystick. Drag to look around. You can also select a painting or choose it on the map: the walking route will take you there. The illuminated surface of the language model painting is a doorway. Enter it to cross the frame and arrive inside its three dimensional world.",
      "file": "museo-en-hall-2651b1e8304c.mp3",
      "duration": 29.124
    },
    {
      "id": "mind",
      "title": "Intelligence",
      "text": "This is the intelligence gallery. Its paintings explore language, the mind and different model families. Inside an answer is the first immersive experience. Approach its painting and press Enter the painting, or the E key. On the other side, you can walk through eight stations, inspect matrices and follow a question until a token is generated. A voice guide is available there. This is a teaching representation with synthetic weights and curated answers, not the physical inside of a computer.",
      "file": "museo-en-mind-ffa6ebce14d9.mp3",
      "duration": 32.364
    },
    {
      "id": "industry",
      "title": "Industry and everyday life",
      "text": "This gallery connects robots, factories and everyday life. You will find a production chain, chip manufacturing, a home and a growth model. Each painting introduces its topic before you open it. For now, these experiences are available as web notebooks. Their immersive interiors will be built one at a time. The automation and growth you see depend on the assumptions and constraints explained by each simulation.",
      "file": "museo-en-industry-24fb2570f96d.mp3",
      "duration": 25.02
    },
    {
      "id": "cosmos",
      "title": "Cosmos",
      "text": "In the cosmos gallery, we travel from Earth orbit to the scale of a civilization. The paintings present Starlink, spacecraft, a Dyson swarm and the Kardashev scale. Open their notebooks to explore the scenes and explanations. These four interiors are not yet walkable worlds. The museum distinguishes web experiences from places you can already explore in first person.",
      "file": "museo-en-cosmos-535e5889e7a0.mp3",
      "duration": 22.968
    }
  ]
};
const base = new URL(document.documentElement.lang === 'es' ? '../../audio/' : '../audio/', import.meta.url);
for (const entries of Object.values(VOICES)) for (const entry of entries) entry.src = new URL(entry.file, base).href;
