// Recorded with MiniMax speech-2.8-hd. No credentials are shipped.
export const VOICES = {
  "es": [
    {
      "id": "hall",
      "title": "Un museo de mundos",
      "text": "Estás en el atrio. Ahora se abren cuatro salas: inteligencia, industria y vida cotidiana, cosmos, y vida y naturaleza. Hay diecinueve cuadros. Nueve permiten entrar en un mundo transitable: modelos de lenguaje y las ocho experiencias nuevas. Camina con las teclas W, A, S y D, o utiliza el joystick. Arrastra para mirar. El plano te lleva hasta cualquier cuadro. Elige entrar en tres dimensiones o abrir su notebook web.",
      "file": "museo-es-hall-1ddd45095287.mp3",
      "duration": 30.276
    },
    {
      "id": "mind",
      "title": "Inteligencia",
      "text": "En inteligencia puedes recorrer una respuesta de un modelo de lenguaje, acompañar un mensaje por Internet, entrar en un microchip o seguir cómo una idea se propaga. También encontrarás los notebooks de mente y familias de modelos. Los marcos iluminados dan acceso a mundos transitables. Dentro puedes escuchar la guía, caminar entre estaciones y cambiar los parámetros del experimento.",
      "file": "museo-es-mind-1ebece8fc398.mp3",
      "duration": 22.968
    },
    {
      "id": "industry",
      "title": "Industria y vida cotidiana",
      "text": "Esta sala conecta robots, fábricas, hogares y energía. Los cuadros de electricidad y reactor nuclear ya abren mundos transitables. Podrás seguir la energía desde su origen, comparar pérdidas y demanda o descubrir por qué una parada nuclear todavía requiere refrigeración. Robots, Terafab, hogar y crecimiento conservan sus notebooks. Cada explicación distingue su mecanismo real de las simplificaciones del modelo.",
      "file": "museo-es-industry-8ffcd3b450ac.mp3",
      "duration": 26.28
    },
    {
      "id": "cosmos",
      "title": "Cosmos",
      "text": "En la sala del cosmos viajamos desde la órbita terrestre hasta la escala de una civilización. Los cuadros presentan Starlink, los vehículos espaciales, un enjambre de Dyson y la escala de Kardashev. Puedes abrir sus notebooks para explorar las escenas y sus explicaciones. Estos cuatro interiores todavía no son mundos transitables. El museo distingue lo disponible en web de lo que ya puedes recorrer en primera persona.",
      "file": "museo-es-cosmos-5dfea3ea0074.mp3",
      "duration": 24.768
    },
    {
      "id": "life",
      "title": "Vida y naturaleza",
      "text": "Bienvenido a vida y naturaleza. Entra en la célula para seguir la producción de una proteína. En carbono y clima, mueve carbono entre la atmósfera, la tierra, el océano y una reserva fósil. En evolución, compara selección, mutación y deriva a través de muchas generaciones. Los tres cuadros tienen un mundo en tres dimensiones, un notebook web, números que responden a tus controles y narración en español e inglés.",
      "file": "museo-es-life-ae66756e3ad1.mp3",
      "duration": 27.54
    }
  ],
  "en": [
    {
      "id": "hall",
      "title": "A museum of worlds",
      "text": "You are in the atrium. Four galleries now open from here: intelligence, industry and everyday life, cosmos, and life and nature. There are nineteen paintings. Nine let you enter walkable worlds: language models and the eight new experiences. Walk with W, A, S and D, or use the joystick. Drag to look around. The map takes you to any painting. Choose to enter its three dimensional world or open its web notebook.",
      "file": "museo-en-hall-7fcbd8da98be.mp3",
      "duration": 29.016
    },
    {
      "id": "mind",
      "title": "Intelligence",
      "text": "In intelligence, you can walk through a language model answer, accompany a message across the Internet, enter a microchip or follow how an idea spreads. You will also find the mind and model-family notebooks. Illuminated frames open walkable worlds. Inside, listen to the guide, walk between stations and change the experiment parameters.",
      "file": "museo-en-mind-14aff9623971.mp3",
      "duration": 22.068
    },
    {
      "id": "industry",
      "title": "Industry and everyday life",
      "text": "This gallery connects robots, factories, homes and energy. The electricity and nuclear reactor paintings now open walkable worlds. Follow energy from its origin, compare losses and demand, or discover why a nuclear shutdown still needs cooling. Robots, Terafab, home and growth retain their notebooks. Every explanation distinguishes its real mechanism from the model’s simplifications.",
      "file": "museo-en-industry-a62e15eeb32f.mp3",
      "duration": 27.072
    },
    {
      "id": "cosmos",
      "title": "Cosmos",
      "text": "In the cosmos gallery, we travel from Earth orbit to the scale of a civilization. The paintings present Starlink, spacecraft, a Dyson swarm and the Kardashev scale. Open their notebooks to explore the scenes and explanations. These four interiors are not yet walkable worlds. The museum distinguishes web experiences from places you can already explore in first person.",
      "file": "museo-en-cosmos-535e5889e7a0.mp3",
      "duration": 22.968
    },
    {
      "id": "life",
      "title": "Life and nature",
      "text": "Welcome to life and nature. Enter the cell to follow protein production. In carbon and climate, move carbon between the atmosphere, land, ocean and a fossil reserve. In evolution, compare selection, mutation and drift across many generations. All three paintings have a three dimensional world, a web notebook, numbers that respond to your controls and narration in English and Spanish.",
      "file": "museo-en-life-c4f172b16b0e.mp3",
      "duration": 26.244
    }
  ]
};
const base = new URL(document.documentElement.lang === 'es' ? '../../audio/' : '../audio/', import.meta.url);
for (const entries of Object.values(VOICES)) for (const entry of entries) entry.src = new URL(entry.file, base).href;
