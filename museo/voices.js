// Recorded with MiniMax speech-2.8-hd. No credentials are shipped.
export const VOICES = {
  "es": [
    {
      "id": "hall",
      "title": "Un museo de mundos",
      "text": "Estás en el atrio de Atlas. Cuatro salas conectan inteligencia, industria y vida cotidiana, cosmos, y vida y naturaleza. Hay veinte cuadros. Los marcos iluminados indican mundos que puedes recorrer en primera persona; todos tienen un notebook web. Camina con W, A, S y D, o con el joystick. Activa el ratón para mirar libremente y pulsa Escape para soltarlo. El plano te guía a cualquier cuadro. En la barra inferior puedes reproducir la voz, leer el texto y saltar a cada sala. La visita guiada te lleva caminando; tú puedes seguir mirando alrededor.",
      "file": "museo-es-hall-91701efee763.mp3",
      "duration": 36.288
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
      "text": "En la sala del cosmos viajamos desde la Tierra hasta la escala de una civilización. Sus cinco cuadros presentan Starlink, los vehículos espaciales, un enjambre de Dyson, la escala de Kardashev y el crecimiento de una industria en la Luna. Compara viajes, energía y crecimiento en sus notebooks. Una animación tridimensional no siempre permite caminar dentro: la etiqueta de cada cuadro te indica si abre un mundo transitable o una experiencia web. Las escenas distinguen los mecanismos conocidos de los escenarios hipotéticos.",
      "file": "museo-es-cosmos-fd20cefd5ca4.mp3",
      "duration": 32.544
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
      "text": "You are in the Atlas atrium. Four galleries connect intelligence, industry and everyday life, cosmos, and life and nature. There are twenty paintings. Illuminated frames mark worlds you can explore in first person; every painting has a web notebook. Walk with W, A, S and D, or use the joystick. Enable mouse look to look freely, and press Escape to release it. The map guides you to any painting. The bottom bar lets you play the narration, read the transcript and jump to each gallery. The guided visit walks you there while you keep looking around.",
      "file": "museo-en-hall-80fb91624275.mp3",
      "duration": 36.18
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
      "text": "In the cosmos gallery, we travel from Earth to the scale of a civilization. Its five paintings present Starlink, spacecraft, a Dyson swarm, the Kardashev scale and the growth of industry on the Moon. Compare journeys, energy and growth in their notebooks. A three dimensional animation does not always let you walk inside: each painting tells you whether it opens a walkable world or a web experience. The scenes distinguish known mechanisms from hypothetical scenarios.",
      "file": "museo-en-cosmos-f3bcf99e37c6.mp3",
      "duration": 30.168
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
