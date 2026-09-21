// Recorded with MiniMax speech-2.8-hd. No credentials are shipped.
export const VOICES = {
  "es": [
    {
      "id": "intro",
      "title": "Tres precios",
      "text": "Un token no tiene un solo precio. Hay tres precios distintos. La entrada nueva. El prefijo que ya se repitió. Y la salida. Solo el prefijo repetido puede abaratarse. Primero recorremos las familias de modelos. Después miramos la factura.",
      "file": "modelos-es-intro-6dd4f6573815.mp3",
      "duration": 16.02
    },
    {
      "id": "causal",
      "title": "Decodificador",
      "text": "Esta es la familia del notebook de modelos de lenguaje, y también la de Grok. Escribe una pieza detrás de otra. Mira la primera esfera. Solo se une a sí misma. El futuro pesa cero. Esa es la máscara causal, y aquí sí se calcula. Las frases de aquel otro notebook, en cambio, están escritas de antemano.",
      "file": "modelos-es-causal-89a9007edf97.mp3",
      "duration": 18.504
    },
    {
      "id": "encoder",
      "title": "Codificador",
      "text": "El codificador lee hacia atrás y hacia delante. Por eso todas las esferas quedan unidas a la primera. Un modelo como BERT hace esto. Devuelve una etiqueta o un vector. No continúa una frase.",
      "file": "modelos-es-encoder-1e4640e4e1e6.mp3",
      "duration": 14.976
    },
    {
      "id": "encdec",
      "title": "Las dos mitades",
      "text": "Aquí el trabajo se reparte. Una mitad lee la fuente entera, sin tapar el futuro. La otra escribe en serie y, en cada paso, puede mirar toda esa fuente. Es el dibujo de Vaswani, de dos mil diecisiete. También es la forma de T5.",
      "file": "modelos-es-encdec-0942be473f5c.mp3",
      "duration": 16.091
    },
    {
      "id": "moe",
      "title": "Expertos",
      "text": "Los expertos siguen siendo un decodificador. En algunas capas, cada token enciende dos de las ocho cajas. Grok uno y DeepSeek están en esta familia. Esos dos de ocho no son una cuarta parte de todos los pesos. La atención sigue usando los suyos en cada paso.",
      "file": "modelos-es-moe-bb666ca5cc3e.mp3",
      "duration": 15.876
    },
    {
      "id": "ssm",
      "title": "Estado fijo",
      "text": "Mira la esfera. No crece aunque alargues el contexto. Es un estado de ancho fijo. Las barras sí crecen, porque guardan una clave por cada token. Jamba mezcla las dos ideas. Pone una capa de atención cada siete de Mamba. La caché de claves vive solo en un octavo de las capas.",
      "file": "modelos-es-ssm-766d29116d44.mp3",
      "duration": 20.304
    },
    {
      "id": "diffusion",
      "title": "Difusión",
      "text": "La difusión no espera turno. Todas las posiciones se proponen a la vez y se corrigen durante varias rondas. No hay una pieza número cuarenta esperando a la treinta y nueve. El trabajo se parece a rondas por longitud, no a una sola pasada de izquierda a derecha.",
      "file": "modelos-es-diffusion-47e9cb7a1afd.mp3",
      "duration": 15.696
    },
    {
      "id": "jepa",
      "title": "JEPA",
      "text": "JEPA compara dos vectores. Uno es la predicción. El otro es el objetivo. El error es la distancia entre ellos. No reparte probabilidad sobre una lista de palabras, así que no escribe la frase. Es la familia de Yann LeCun.",
      "file": "modelos-es-jepa-28afd66a7b52.mp3",
      "duration": 14.688
    },
    {
      "id": "jev",
      "title": "Jev",
      "text": "De Jev no está publicada la arquitectura. Sí está publicado el contrato. Una sola pasada. Una opción de las que tú declaraste. Una opción permitida puede ser, aun así, la decisión falsa. Dos preguntas pueden salir empatadas sin compartir una sola distribución. Jev no escribe.",
      "file": "modelos-es-jev-f33597316767.mp3",
      "duration": 18.972
    },
    {
      "id": "cache",
      "title": "La factura",
      "text": "Ahora la factura. Usamos la tarifa que DeepSeek publicó el diecinueve de septiembre de dos mil veintiséis. En Flash, fuera de la hora punta, un millón de tokens acertados cuesta tres milésimas de dólar. Un millón de entrada nueva cuesta quince centavos. Un millón de salida cuesta sesenta centavos. El acierto es cincuenta veces más barato que el fallo. La salida no hereda ese descuento. Se calcula siempre.",
      "file": "modelos-es-cache-41dbbdd9057c.mp3",
      "duration": 25.74
    },
    {
      "id": "disk",
      "title": "Por qué cabe en disco",
      "text": "Ese acierto cabe en disco, y por eso pueden cobrarlo así. DeepSeek V2 comprime la clave y el valor. Guarda quinientos setenta y seis números por cada token y por cada capa. Una atención completa, con las mismas ciento veintiocho cabezas, guardaría treinta y dos mil setecientos sesenta y ocho números. Unas cincuenta y siete veces más. El anuncio de dos mil veinticuatro ya ponía el acierto a una décima del fallo. Esa cifra es el anuncio viejo, no la tarifa de ahora.",
      "file": "modelos-es-disk-3a46288df39b.mp3",
      "duration": 30.168
    },
    {
      "id": "rule",
      "title": "La otra regla",
      "text": "DeepSeek no cobra un recargo por guardar el prefijo. La primera visita paga la entrada nueva. La siguiente, si el prefijo coincide entero, paga el acierto. No hay garantía. Es un sistema de mejor esfuerzo. Anthropic usa otra regla. Guardar cinco minutos cuesta un veinticinco por ciento más que la entrada normal. Leer esa copia cuesta una décima. Con esa regla, la segunda visita ya compensa. La salida, en los dos casos, se paga entera.",
      "file": "modelos-es-rule-d5bf51101f5b.mp3",
      "duration": 28.62
    }
  ],
  "en": [
    {
      "id": "intro",
      "title": "Three prices",
      "text": "A token does not have one price. It has three. Fresh input. A prefix you have already sent. And the output. Only the repeated prefix can get cheaper. We will walk the model families first. Then we will look at the bill.",
      "file": "modelos-en-intro-1fcb9ca8194b.mp3",
      "duration": 15.192
    },
    {
      "id": "causal",
      "title": "Decoder",
      "text": "This is the family from the language-model notebook, and Grok’s family too. It writes one piece after another. Look at the first sphere. It connects only to itself. The future weighs zero. That is the causal mask, and this page really does compute it. The sentences in that other notebook, by contrast, were written in advance.",
      "file": "modelos-en-causal-515d7e3a3562.mp3",
      "duration": 21.6
    },
    {
      "id": "encoder",
      "title": "Encoder",
      "text": "An encoder reads backward and forward. That is why every sphere is tied to the first one. A model like BERT does this. It returns a label or a vector. It does not continue a sentence.",
      "file": "modelos-en-encoder-242348cb309e.mp3",
      "duration": 12.78
    },
    {
      "id": "encdec",
      "title": "Both halves",
      "text": "Here the work is split. One half reads the whole source, without hiding the future. The other half writes one piece at a time, and at every step it may look at that whole source. This is Vaswani’s diagram, from twenty seventeen. It is also the shape of T5.",
      "file": "modelos-en-encdec-28aef0fdbfbd.mp3",
      "duration": 17.892
    },
    {
      "id": "moe",
      "title": "Experts",
      "text": "Experts are still a decoder. In some layers, each token lights two of the eight boxes. Grok one and DeepSeek belong to this family. Those two of eight are not a quarter of every weight. Attention still uses its own weights on every step.",
      "file": "modelos-en-moe-e56db175abd8.mp3",
      "duration": 16.596
    },
    {
      "id": "ssm",
      "title": "Fixed state",
      "text": "Watch the sphere. It does not grow when you lengthen the context. It is a state of fixed width. The bars do grow, because they store a key for every token. Jamba mixes the two ideas. It places one attention layer for every seven Mamba layers. The key cache lives in only one eighth of the layers.",
      "file": "modelos-en-ssm-548140f29ef3.mp3",
      "duration": 19.008
    },
    {
      "id": "diffusion",
      "title": "Diffusion",
      "text": "Diffusion does not wait its turn. Every position is proposed at once, then corrected over several rounds. Piece forty does not wait for piece thirty-nine. The work looks like rounds times length, not one left-to-right pass.",
      "file": "modelos-en-diffusion-e51b022b7ee2.mp3",
      "duration": 13.752
    },
    {
      "id": "jepa",
      "title": "JEPA",
      "text": "JEPA compares two vectors. One is the prediction. The other is the target. The error is the distance between them. It does not spread probability over a word list, so it does not write the sentence. This is Yann LeCun’s family.",
      "file": "modelos-en-jepa-052cfbc34c33.mp3",
      "duration": 16.379
    },
    {
      "id": "jev",
      "title": "Jev",
      "text": "Jev’s architecture has not been published. The contract has. One pass. One of the options you declared. A permitted option can still be the wrong decision. Two questions can tie without sharing a single distribution. Jev does not write.",
      "file": "modelos-en-jev-d355d1805b1c.mp3",
      "duration": 17.856
    },
    {
      "id": "cache",
      "title": "The bill",
      "text": "Now the bill. We use the tariff DeepSeek published on the nineteenth of September, twenty twenty-six. On Flash, off peak, a million cache hits cost three thousandths of a dollar. A million fresh input tokens cost fifteen cents. A million output tokens cost sixty cents. A hit is fifty times cheaper than a miss. The output does not inherit that discount. It is computed every time.",
      "file": "modelos-en-cache-4d5ab82bc7e9.mp3",
      "duration": 28.152
    },
    {
      "id": "disk",
      "title": "Why it fits on disk",
      "text": "Those hits fit on disk, which is why they can be priced this way. DeepSeek V2 compresses the key and the value. It stores five hundred seventy-six numbers for each token and each layer. Full attention, with the same one hundred twenty-eight heads, would store thirty-two thousand seven hundred sixty-eight numbers. About fifty-seven times more. The twenty twenty-four announcement already priced a hit at one tenth of a miss. That figure is the old announcement, not today’s tariff.",
      "file": "modelos-en-disk-da990b008343.mp3",
      "duration": 32.76
    },
    {
      "id": "rule",
      "title": "The other rule",
      "text": "DeepSeek does not charge extra to store the prefix. The first visit pays for fresh input. The next visit, if the prefix matches completely, pays the hit price. There is no guarantee. It is a best-effort system. Anthropic uses a different rule. Storing a five-minute copy costs twenty-five percent more than ordinary input. Reading that copy costs one tenth. Under that rule, the second visit already pays it back. In both systems, the output is paid in full.",
      "file": "modelos-en-rule-bf33851f13bb.mp3",
      "duration": 33.12
    }
  ]
};
const base = new URL(document.documentElement.lang === 'es' ? '../../audio/' : '../audio/', import.meta.url);
for (const entries of Object.values(VOICES)) for (const entry of entries) entry.src = new URL(entry.file, base).href;
