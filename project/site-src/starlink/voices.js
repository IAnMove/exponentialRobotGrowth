// MiniMax speech-2.8-hd; measured and decoded clips.
export const VOICES = {
  "es": [
    {
      "id": "terminal",
      "title": "La antena envía tu petición",
      "text": "Cuando abres una página, tu dispositivo envía una petición al router. La antena Starlink la transmite por radio hacia un satélite visible. Su conjunto de antenas dirige el haz electrónicamente. El punto luminoso representa un paquete; el enlace azul representa la radio. Mueve al usuario y observa cómo cambia la dirección. Los tamaños de los satélites están ampliados para poder verlos.",
      "file": "starlink-es-terminal-a00b24d18c88.mp3",
      "duration": 26.496
    },
    {
      "id": "coverage",
      "title": "La cobertura se mueve",
      "text": "Los satélites de órbita baja atraviesan el cielo: ninguno permanece sobre tu casa. Su huella de visibilidad se desplaza y la red cambia de satélite para mantener la conexión. Activa el mapa y pausa las órbitas para verlo. Cada punto pertenece a una muestra didáctica: sus huecos no demuestran cortes reales del servicio, y visibilidad no significa capacidad disponible.",
      "file": "starlink-es-coverage-6b73074a5c45.mp3",
      "duration": 24.012
    },
    {
      "id": "laser",
      "title": "Láseres entre satélites",
      "text": "Si el satélite no puede bajar directamente a una pasarela adecuada, el paquete puede continuar por enlaces láser entre satélites. Cada enlace necesita visión directa: la Tierra no puede cortar su trayectoria. Desactiva los láseres para comparar. Añadir saltos puede resolver un recorrido, pero también alargarlo. Esta ruta ilustra la geometría; no reproduce las decisiones privadas de Starlink.",
      "file": "starlink-es-laser-d6c8dcd6fef5.mp3",
      "duration": 24.408
    },
    {
      "id": "gateway",
      "title": "Una pasarela lo devuelve a tierra",
      "text": "Una pasarela es una estación terrestre que comunica la constelación con la red de tierra. El último satélite debe verla para enviarle el paquete por radio. Si un satélite ve tanto tu antena como una pasarela, puede completar este tramo sin saltos láser. Los puntos azules son ubicaciones representativas para experimentar, no el inventario real de estaciones.",
      "file": "starlink-es-gateway-9f5c5c8ed368.mp3",
      "duration": 23.004
    },
    {
      "id": "server",
      "title": "El servidor está en internet",
      "text": "Desde la pasarela, el tráfico recorre redes terrestres hasta un punto de conexión con internet y después alcanza el servidor solicitado. Starlink proporciona el acceso; la página no tiene que vivir en un satélite. Aquí el destino es ilustrativo. La longitud del tramo terrestre, los equipos y las colas también influyen en cuánto tarda la respuesta.",
      "file": "starlink-es-server-578586e62652.mp3",
      "duration": 22.968
    },
    {
      "id": "return",
      "title": "La respuesta vuelve",
      "text": "El servidor responde y los paquetes regresan a tu dispositivo. La ruta de vuelta puede ser diferente. Nuestra cifra de propagación es distancia dividida por velocidad de la luz: cuenta solo el viaje espacial representado. El tiempo de ida y vuelta añade ambos sentidos, tramos terrestres, planificación de radio, procesamiento y colas. Por eso esta cifra no equivale a un ping real.",
      "file": "starlink-es-return-11cfa98e8a21.mp3",
      "duration": 23.652
    }
  ],
  "en": [
    {
      "id": "terminal",
      "title": "Your terminal sends the request",
      "text": "When you open a page, your device sends a request through the router. The Starlink terminal transmits it by radio toward a visible satellite. Its antenna array steers the beam electronically. Our glowing point represents a packet, and the blue link represents radio. Move the user and watch the direction change. Satellite sizes are enlarged so you can see them.",
      "file": "starlink-en-terminal-c0e344b15f2a.mp3",
      "duration": 22.608
    },
    {
      "id": "coverage",
      "title": "Coverage keeps moving",
      "text": "Low Earth orbit satellites cross the sky; none stays above your home. Their visibility footprints move, and the network switches satellites to maintain the connection. Enable the map, then pause the orbits to inspect it. Every point belongs to a teaching sample: its gaps do not prove real service outages, and geometric visibility does not mean that capacity is available.",
      "file": "starlink-en-coverage-4b3c47a75d3a.mp3",
      "duration": 23.112
    },
    {
      "id": "laser",
      "title": "Lasers connect satellites",
      "text": "If the satellite cannot downlink directly to a suitable gateway, the packet can continue through laser links between satellites. Each link needs a clear line of sight: Earth cannot block its path. Turn lasers off to compare. Extra hops can make a route possible, but also lengthen it. Our route demonstrates geometry; it does not reproduce Starlink's private routing decisions.",
      "file": "starlink-en-laser-b2dfdbc766e8.mp3",
      "duration": 22.752
    },
    {
      "id": "gateway",
      "title": "A gateway brings it back to Earth",
      "text": "A gateway is a ground station connecting the constellation to the terrestrial network. The final satellite must see it to send the packet down by radio. If one satellite can see both your terminal and a gateway, it can complete this section without laser hops. The blue points are representative locations for experimentation, rather than the real inventory of stations.",
      "file": "starlink-en-gateway-e9b6dbfaad3d.mp3",
      "duration": 22.14
    },
    {
      "id": "server",
      "title": "The server is on the internet",
      "text": "From the gateway, traffic travels through terrestrial networks to an internet connection point, then reaches the requested server. Starlink provides access; the website does not have to live on a satellite. The destination here is illustrative. The length of the terrestrial section, network equipment, and waiting queues also influence how long it takes for the reply to reach you.",
      "file": "starlink-en-server-ea2a4a385838.mp3",
      "duration": 22.428
    },
    {
      "id": "return",
      "title": "The reply returns",
      "text": "The server replies, and packets return to your device. The return route may differ. Our propagation figure is distance divided by the speed of light: it counts only physical travel along the represented space path. Round trip time includes both directions, terrestrial sections, radio scheduling, processing, and queues. This is why our figure is not a measurement of real world ping.",
      "file": "starlink-en-return-9d07b5209fcc.mp3",
      "duration": 26.28
    }
  ]
};
const base = new URL(document.documentElement.lang === 'es' ? '../../audio/' : '../audio/', import.meta.url);
for (const entries of Object.values(VOICES)) for (const entry of entries) entry.src = new URL(entry.file, base).href;
