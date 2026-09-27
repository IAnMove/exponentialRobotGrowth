// MiniMax speech-2.8-hd; durations measured from the recordings.
export const VOICES = {
  "es": [
    {
      "id": "home",
      "text": "Todo empieza aquí: en tu ordenador. Has pedido una página que, en este ejemplo, está alojada en Estados Unidos. Antes de enviar esta petición, el navegador ha obtenido una dirección IP mediante DNS y ha preparado una conexión HTTPS. Esa preparación también requiere intercambios por la red. Ahora seguimos los datos de la petición. El contenido viaja cifrado; los routers necesitan la información de encaminamiento, pero no leen la página dentro del cifrado. El punto dorado representa esos datos, no un objeto que atraviesa los cables.",
      "file": "internet-voyage-es-home-cf3b6e0b0cf3.mp3",
      "duration": 35.1
    },
    {
      "id": "access",
      "text": "Salimos de casa. El ordenador se comunica con el router, por wifi o por cable. En una conexión de fibra doméstica, un terminal óptico convierte entre señales eléctricas y ópticas. La fibra de acceso enlaza el edificio con la red del operador, a menudo mediante divisores ópticos pasivos. Aquí comprimimos muchos equipos en una pequeña ciudad. No existe un único tubo directo hasta la web: vamos entrando en redes conectadas entre sí.",
      "file": "internet-voyage-es-access-10e6aab40b3e.mp3",
      "duration": 25.596
    },
    {
      "id": "spain",
      "text": "Ahora cambiamos de escala. Este ejemplo empieza en Madrid y lleva los datos hacia la costa de Bizkaia. Dentro de un operador hay varios saltos posibles. Entre operadores, BGP intercambia información de rutas y aplica políticas: no busca simplemente la línea más corta del mapa. La línea dorada es un corredor ilustrativo; no hemos medido tu conexión ni conocemos por dónde pasan todos sus cables. Incluso una web estadounidense puede responder desde una caché cercana.",
      "file": "internet-voyage-es-spain-927e5ff329e3.mp3",
      "duration": 30.528
    },
    {
      "id": "landing",
      "text": "Llegamos al extremo español del cable MAREA, en Sopelana, cerca de Bilbao. Aquí los equipos de transmisión preparan señales ópticas para el enlace submarino. Varias longitudes de onda pueden compartir una fibra, como canales diferentes de luz. El edificio y este corte ampliado son ilustraciones, no planos de la instalación. Los extremos del cable sí son reales: Sopelana y Virginia Beach. Entre ambos hay aproximadamente seis mil seiscientos kilómetros de cable.",
      "file": "internet-voyage-es-landing-0c583a756a93.mp3",
      "duration": 28.584
    },
    {
      "id": "ocean",
      "text": "Bajamos al Atlántico. Dentro del cable, la información se transmite mediante luz por fibras ópticas. Los repetidores amplifican la señal a lo largo del trayecto: no deciden a qué servidor enviar tu petición. Hemos agrandado el cable y ralentizado los pulsos para poder verlos. Si suponemos una velocidad de doscientos mil kilómetros por segundo en la fibra, seis mil seiscientos kilómetros requieren unos treinta y tres milisegundos, solo de propagación y solo en un sentido. Faltan los demás enlaces, las colas y el procesamiento.",
      "file": "internet-voyage-es-ocean-541ced911f42.mp3",
      "duration": 33.372
    },
    {
      "id": "america",
      "text": "La señal llega a Virginia Beach. Ya hemos cruzado el océano, pero todavía no estamos en el servidor. Desde la estación de amarre, redes terrestres llevan los datos hacia centros de datos. Telxius documenta conexiones desde este punto hacia Ashburn y Richmond. En nuestro ejemplo elegimos Ashburn. La ubicación regional es real; la ruta exacta, el operador de destino y el servidor son parte de esta demostración.",
      "file": "internet-voyage-es-america-53595b7633e5.mp3",
      "duration": 25.956
    },
    {
      "id": "server",
      "text": "Entramos en un centro de datos ilustrativo de Ashburn. Los routers y switches encaminan el tráfico hacia el servicio de destino. Puede haber un balanceador y muchas máquinas trabajando detrás de una sola web. Aquí iluminamos una para seguir la historia. En el extremo que termina la conexión segura se descifra la petición; la aplicación prepara la respuesta y vuelve a cifrarla para enviarla. Estos racks representan hardware realista, pero no el plano de un centro de datos concreto.",
      "file": "internet-voyage-es-server-b04ee693400c.mp3",
      "duration": 28.62
    },
    {
      "id": "return",
      "text": "Ahora la respuesta recorre Internet hacia tu ordenador. Cambiamos el dorado por verde para distinguir la vuelta. La respuesta suele ser mayor que la petición y se transporta en muchos segmentos y paquetes. En este ejemplo usamos HTTPS sobre TCP: TCP permite entregar un flujo de bytes ordenado y recuperar pérdidas mediante retransmisiones. La vuelta puede seguir una ruta diferente; usamos el mismo corredor solo para que puedas comparar. Un sitio real también puede usar HTTP tres sobre QUIC.",
      "file": "internet-voyage-es-return-0ec65a62a40c.mp3",
      "duration": 31.752
    },
    {
      "id": "render",
      "text": "De vuelta en casa, el navegador recibe y descifra la respuesta. Después interpreta el documento y dibuja la página. Las piezas que ves son una metáfora de la recepción progresiva, no una división real en cuatro paquetes. Una página normalmente necesita más peticiones para imágenes, estilos y scripts, y puede ir mostrando contenido antes de que llegue todo. Tu clic ha conectado equipos locales, operadores, luz bajo el océano y servidores. La distancia importa, pero la rapidez final depende de mucho más que los kilómetros.",
      "file": "internet-voyage-es-render-c2dc1c6c4da7.mp3",
      "duration": 33.228
    }
  ],
  "en": [
    {
      "id": "home",
      "text": "Everything starts here, at your computer. You have requested a page that, in this example, is hosted in the United States. Before sending this request, the browser obtained an IP address through DNS and prepared an HTTPS connection. That preparation also requires exchanges across the network. Now we follow the request data. The content travels encrypted; routers need routing information, but they cannot read the page inside that encryption. The golden point represents data, not an object moving through a cable.",
      "file": "internet-voyage-en-home-57a2ed3d77fb.mp3",
      "duration": 33.732
    },
    {
      "id": "access",
      "text": "We leave the house. Your computer communicates with the router over wifi or a cable. In a home fiber connection, an optical terminal converts between electrical and optical signals. Access fiber links the building to the operator's network, often through passive optical splitters. We compress many devices into this small city. There is no single dedicated tube straight to the website: we enter a series of interconnected networks.",
      "file": "internet-voyage-en-access-6f210ac2069d.mp3",
      "duration": 26.46
    },
    {
      "id": "spain",
      "text": "Now we change scale. This example starts in Madrid and takes the data towards the coast of Biscay. Within an operator, several hops are possible. Between operators, BGP exchanges route information and applies policies: it does not simply search for the shortest line on a map. The golden line is an illustrative corridor. We have not measured your connection or located all its cables. Even an American website might respond from a nearby cache.",
      "file": "internet-voyage-en-spain-9594df51cbbd.mp3",
      "duration": 27.72
    },
    {
      "id": "landing",
      "text": "We reach the Spanish end of the MAREA cable, in Sopelana, near Bilbao. Here, transmission equipment prepares optical signals for the submarine link. Multiple wavelengths can share a fiber, acting as separate channels of light. This building and enlarged cutaway are illustrations, not installation blueprints. The cable endpoints are real: Sopelana and Virginia Beach. Around six thousand six hundred kilometers of cable connect them.",
      "file": "internet-voyage-en-landing-bac2383a8026.mp3",
      "duration": 27.612
    },
    {
      "id": "ocean",
      "text": "We descend into the Atlantic. Inside the cable, light carries information through optical fibers. Repeaters amplify the signal along the route; they do not decide which server should receive your request. We have enlarged the cable and slowed the pulses so you can see them. Assuming light travels at two hundred thousand kilometers per second in fiber, six thousand six hundred kilometers takes about thirty-three milliseconds of propagation, in one direction alone. Other links, queues and processing add more delay.",
      "file": "internet-voyage-en-ocean-3eec5e075e48.mp3",
      "duration": 32.4
    },
    {
      "id": "america",
      "text": "The signal reaches Virginia Beach. We have crossed the ocean, but we have not reached the server yet. From the cable landing station, terrestrial networks carry data towards data centers. Telxius documents connections from this location to Ashburn and Richmond. Our example chooses Ashburn. The regional location is real; the exact route, destination operator and server are part of this demonstration.",
      "file": "internet-voyage-en-america-1a56a65bfff7.mp3",
      "duration": 25.236
    },
    {
      "id": "server",
      "text": "We enter an illustrative data center in Ashburn. Routers and switches forward traffic towards the destination service. A load balancer and many machines might sit behind a single website. We highlight one machine to follow the story. The endpoint that terminates the secure connection decrypts the request. The application prepares the response and encrypts it again for transmission. These racks represent realistic hardware, but not the floor plan of a specific data center.",
      "file": "internet-voyage-en-server-23d9a2c85c52.mp3",
      "duration": 30.024
    },
    {
      "id": "return",
      "text": "Now the response travels across the Internet towards your computer. Gold changes to green to distinguish the return journey. A response is often larger than a request and is carried in many segments and packets. Our example uses HTTPS over TCP: TCP provides an ordered byte stream and recovers losses through retransmission. The return trip can take a different route; we use the same corridor only to make comparison easier. A real website might also use HTTP three over QUIC.",
      "file": "internet-voyage-en-return-6d74900bfce5.mp3",
      "duration": 31.896
    },
    {
      "id": "render",
      "text": "Back at home, the browser receives and decrypts the response. It then interprets the document and draws the page. The pieces you see are a metaphor for progressive reception, not a real division into four packets. A page usually needs more requests for images, styles and scripts, and can start displaying content before everything arrives. Your click has connected local equipment, network operators, light beneath the ocean and servers. Distance matters, but final loading speed depends on much more than kilometers.",
      "file": "internet-voyage-en-render-4d13811fecbf.mp3",
      "duration": 32.688
    }
  ]
};
const base = new URL(document.documentElement.lang === 'es' ? '../../audio/' : '../audio/', import.meta.url);
for (const entries of Object.values(VOICES)) for (const entry of entries) entry.src = new URL(entry.file, base).href;
