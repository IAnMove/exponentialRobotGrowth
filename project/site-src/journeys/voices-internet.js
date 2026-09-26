// Recorded with MiniMax speech-2.8-hd. No credentials are shipped.
export const VOICES = {
  "es": [
    {
      "id": "step-0",
      "title": "1 · Escribes una dirección",
      "text": "Tu navegador necesita localizar un servicio y comunicarse con él. El equipo entrega datos a su red local. El router permite continuar hacia otras redes; una antena Wi-Fi no contiene Internet. Aquí el mensaje de ejemplo se divide en piezas numeradas.",
      "file": "journey-internet-es-step-0-4460cc53d433.mp3",
      "duration": 16.056
    },
    {
      "id": "step-1",
      "title": "2 · Un nombre encuentra una dirección",
      "text": "DNS relaciona nombres con registros, entre ellos direcciones IP. Un resolvedor puede utilizar su caché o consultar otros servidores. Esta consulta es distinta de descargar la página. El armario DNS representa ese servicio distribuido, no una única máquina central.",
      "file": "journey-internet-es-step-1-9e8e0059fde5.mp3",
      "duration": 17.604
    },
    {
      "id": "step-2",
      "title": "3 · La red elige por dónde continuar",
      "text": "Cada router reenvía según su información de encaminamiento. Corta el enlace directo y observa el desvío por la ruta alternativa. El dibujo comprime distancias y equipos: los datos viajan mediante señales físicas y el cambio de ruta real puede tardar.",
      "file": "journey-internet-es-step-2-dd7b18105861.mp3",
      "duration": 15.948
    },
    {
      "id": "step-3",
      "title": "4 · Ordenar, confirmar y responder",
      "text": "TCP ofrece un flujo ordenado de bytes. Si faltan datos, puede retransmitirlos; recibir un duplicado no duplica el mensaje. El servidor procesa la petición y devuelve datos. La barra cuenta piezas únicas recibidas, mientras que los intentos incluyen la repetición del paquete perdido.",
      "file": "journey-internet-es-step-3-b311ec6c495a.mp3",
      "duration": 18.972
    }
  ],
  "en": [
    {
      "id": "step-0",
      "title": "1 · You type an address",
      "text": "Your browser needs to locate a service and communicate with it. The computer sends data to its local network. A router provides a path to other networks; a Wi-Fi antenna does not contain the Internet. Here the example message is divided into numbered pieces.",
      "file": "journey-internet-en-step-0-e0260705e277.mp3",
      "duration": 16.091
    },
    {
      "id": "step-1",
      "title": "2 · A name finds an address",
      "text": "DNS maps names to records, including IP addresses. A resolver can use cached information or query other servers. This lookup is separate from downloading the page. The DNS cabinet represents this distributed service, not a single central machine.",
      "file": "journey-internet-en-step-1-ddd550bb04b3.mp3",
      "duration": 16.2
    },
    {
      "id": "step-2",
      "title": "3 · The network forwards the data",
      "text": "Each router forwards according to its routing information. Cut the direct link and watch the alternate route. The diagram compresses distances and equipment: data travels as physical signals, and real routing changes can take time.",
      "file": "journey-internet-en-step-2-ef81383cb2ac.mp3",
      "duration": 14.76
    },
    {
      "id": "step-3",
      "title": "4 · Order, acknowledge and respond",
      "text": "TCP provides an ordered byte stream. Missing data can be retransmitted; a duplicate does not duplicate the message. The server processes the request and returns data. The bar counts unique pieces received, while attempts include retransmitting the lost packet.",
      "file": "journey-internet-en-step-3-0205b092549d.mp3",
      "duration": 18.144
    }
  ]
};
const base = new URL(document.documentElement.lang === 'es' ? '../../audio/' : '../audio/', import.meta.url);
for (const entries of Object.values(VOICES)) for (const entry of entries) entry.src = new URL(entry.file, base).href;
