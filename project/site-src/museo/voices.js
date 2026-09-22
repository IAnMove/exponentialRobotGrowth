// Recorded with MiniMax speech-2.8-hd. No credentials are shipped.
export const VOICES = {
  "es": [
    {
      "id": "hall",
      "title": "El pasillo",
      "text": "Estás en el pasillo del museo. Con W, A, S y D caminas. El ratón gira la vista. En el teléfono, el joystick queda a la izquierda y el dedo de la derecha mira alrededor. Cada notebook del atlas es una pantalla en la pared.",
      "file": "museo-es-hall-8d3a1c159138.mp3",
      "duration": 15.048
    },
    {
      "id": "screen",
      "title": "La pantalla",
      "text": "Acércate a una pantalla y mírala de frente. Esta es Robots. La ficha de la esquina dice el nombre de lo que estás mirando. Si pasas de largo, la ficha sigue a la pantalla de enfrente, no a la que dejaste atrás.",
      "file": "museo-es-screen-67e19f8f486f.mp3",
      "duration": 13.644
    },
    {
      "id": "enter",
      "title": "Entrar",
      "text": "Pulsa E, o el botón Entrar. La experiencia se abre a pantalla completa. Escape, o Volver al pasillo, te deja en el mismo sitio. Dentro está el notebook: la fábrica, la esfera, Starlink o el precio. Caminar, en cambio, ocurre aquí, en el edificio.",
      "file": "museo-es-enter-5b15299b8326.mp3",
      "duration": 17.388
    },
    {
      "id": "mind",
      "title": "La otra visita",
      "text": "Abrir en web es la otra manera de verlo. Sales del edificio y queda la página sola. Al fondo del pasillo está la sala de la mente. Ahí están los modelos de lenguaje, la comparación con un cerebro, y el precio del caché.",
      "file": "museo-es-mind-b8bdc9280e7d.mp3",
      "duration": 14.112
    }
  ],
  "en": [
    {
      "id": "hall",
      "title": "The corridor",
      "text": "You are in the museum corridor. W, A, S and D walk. The mouse turns your view. On a phone, the stick sits on the left and a finger on the right looks around. Every notebook in the atlas is a screen on the wall.",
      "file": "museo-en-hall-b7a5eadddc04.mp3",
      "duration": 13.068
    },
    {
      "id": "screen",
      "title": "The screen",
      "text": "Walk up to a screen and face it. This one is Robots. The card in the corner names whatever you are looking at. If you walk past, the card follows the screen in front of you, not the one you left behind.",
      "file": "museo-en-screen-9de3a78c6640.mp3",
      "duration": 12.24
    },
    {
      "id": "enter",
      "title": "Step in",
      "text": "Press E, or the Step in button. The experience opens full screen. Escape, or Back to the gallery, leaves you in the same place. Inside is the notebook: the factory, the sphere, Starlink, or the price. Walking happens here, in the building.",
      "file": "museo-en-enter-4700053ff85e.mp3",
      "duration": 19.728
    },
    {
      "id": "mind",
      "title": "The other visit",
      "text": "Open on the web is the other way to see it. You leave the building and the page stands alone. At the end of the corridor is the mind gallery. Language models are there, the comparison with a brain, and the price of the cache.",
      "file": "museo-en-mind-d3ef29b26c91.mp3",
      "duration": 13.788
    }
  ]
};
const base = new URL(document.documentElement.lang === 'es' ? '../../audio/' : '../audio/', import.meta.url);
for (const entries of Object.values(VOICES)) for (const entry of entries) entry.src = new URL(entry.file, base).href;
