// Recorded with MiniMax speech-2.8-hd. No credentials are shipped.
export const VOICES = {
  "es": [
    {
      "id": "question",
      "title": "Tu pregunta",
      "text": "Empezamos con tu pregunta. Estas tarjetas representan las instrucciones y los mensajes que la aplicación reúne antes de llamar al modelo. Si existe una conversación anterior, puede incluirse aquí. El modelo recibe esta entrada, no todo lo que sabes ni todo internet. Observa cómo la información entra por el mismo recorrido. Vamos a detenernos en cada paso.",
      "file": "llms-es-question-f2ead56a9935.mp3",
      "duration": 22.212
    },
    {
      "id": "retrieval",
      "title": "Añadir una fuente",
      "text": "Aquí la aplicación puede recuperar una fuente. En el experimento del museo, activar la consulta añade una ficha al contexto. Si no hay documento, seguimos sin esa evidencia. El texto recuperado no modifica los pesos del modelo. Una fuente antigua puede inducir una respuesta equivocada. La búsqueda es una herramienta adicional, no algo que todos los modelos hagan automáticamente.",
      "file": "llms-es-retrieval-059766333609.mp3",
      "duration": 24.912
    },
    {
      "id": "tokens",
      "title": "Separar en tokens",
      "text": "Ahora el texto se divide en tokens. Cada bloque es una pieza: una palabra, un fragmento, un espacio o un signo. Debajo aparece su identificador. Dos piezas iguales comparten identificador. Puedes seleccionar un bloque para verlo de cerca. Estos cortes pertenecen a nuestro tokenizador didáctico; un modelo real utiliza un vocabulario propio. Todavía no hemos producido la respuesta.",
      "file": "llms-es-tokens-f2e74d183e9b.mp3",
      "duration": 23.616
    },
    {
      "id": "vectors",
      "title": "Una matriz de números",
      "text": "Cada token se transforma en un vector, una lista de números. Mira la matriz tridimensional: cada fila representa un token y cada columna una dimensión. Azul y naranja distinguen valores positivos y negativos; la altura muestra su magnitud. Selecciona una celda para leer su valor. Las dimensiones no son etiquetas como país o inteligencia. Estos seis números son ilustrativos, no pesos extraídos de un modelo real.",
      "file": "llms-es-vectors-2ee35a2fd330.mp3",
      "duration": 27.648
    },
    {
      "id": "layers",
      "title": "Atención y capas",
      "text": "Esta matriz muestra qué posiciones pueden intercambiar información. Cada fila es un token que consulta; cada columna, una posición a la que puede atender. Las casillas oscuras bloquean el futuro. Las columnas luminosas muestran pesos de atención calculados en nuestro ejemplo. Un Transformer real combina múltiples cabezas, transformaciones y conexiones residuales. Aquí vemos una cabeza pequeña; no es una imagen de pensamientos ni una medida de verdad.",
      "file": "llms-es-layers-76ac4111b3df.mp3",
      "duration": 29.052
    },
    {
      "id": "scores",
      "title": "Del cálculo a las probabilidades",
      "text": "Tras las capas, el modelo calcula puntuaciones para los posibles tokens siguientes. Softmax las convierte en probabilidades. Las columnas tridimensionales representan ese reparto y suman el cien por cien. Una columna alta significa texto más probable según esas puntuaciones, no una afirmación más verdadera. Puedes cambiar la temperatura y comparar. Nuestras puntuaciones están preparadas para explicar el mecanismo.",
      "file": "llms-es-scores-2f18d23f68c3.mp3",
      "duration": 25.956
    },
    {
      "id": "choose",
      "title": "Elegir un solo token",
      "text": "Ahora se elige una sola pieza. Podemos tomar la más probable o sortear según la distribución. Mira las opciones alrededor de la plataforma: todavía no sale una frase completa. Cuando terminemos este paso, aparecerá exactamente un token nuevo en la respuesta. En este laboratorio, la primera elección usa probabilidades; después seguimos una continuación guionizada para poder estudiar el recorrido.",
      "file": "llms-es-choose-708a108c1a3f.mp3",
      "duration": 26.28
    },
    {
      "id": "feedback",
      "title": "Volver al contexto",
      "text": "Ya ha salido una pieza. El bloque luminoso vuelve al contexto junto a la pregunta y los tokens anteriores. El siguiente cálculo utiliza también lo que acaba de escribir. Repetiremos atención, probabilidades y elección para producir otra pieza, y así sucesivamente. Los sistemas reales suelen reutilizar cálculos mediante una caché. Observa el contador: responder no está actualizando los pesos del modelo.",
      "file": "llms-es-feedback-8e71d912e523.mp3",
      "duration": 26.748
    },
    {
      "id": "loop-layers",
      "title": "Otro token · atención",
      "text": "Comienza el siguiente token. La atención combina la entrada con lo que ya se escribió. El futuro sigue bloqueado y los pesos del modelo siguen fijos.",
      "file": "llms-es-loop-layers-4cf3ad957b2c.mp3",
      "duration": 8.352
    },
    {
      "id": "loop-scores",
      "title": "Otro token · probabilidades",
      "text": "Se vuelve a calcular una distribución para la siguiente pieza. Aquí la continuación está guionizada. La columna más alta muestra el siguiente token previsto en esta demostración.",
      "file": "llms-es-loop-scores-095dbd0aed3c.mp3",
      "duration": 12.024
    },
    {
      "id": "loop-choose",
      "title": "Otro token · elección",
      "text": "Nos detenemos antes de emitir la siguiente pieza. Al terminar este paso, solo se añade un token: puede ser una palabra, un fragmento o incluso un espacio.",
      "file": "llms-es-loop-choose-15ac3b0f8a4a.mp3",
      "duration": 9.576
    },
    {
      "id": "loop-feedback",
      "title": "Otro token · contexto",
      "text": "Esta nueva pieza ya forma parte de la respuesta y del contexto. Mira cómo regresa al inicio del siguiente cálculo. Dejamos unos segundos para observarlo.",
      "file": "llms-es-loop-feedback-670ae90d0b20.mp3",
      "duration": 10.116
    },
    {
      "id": "done",
      "title": "Respuesta terminada",
      "text": "Hemos llegado al token de final de secuencia. La respuesta está terminada. Cada pieza se generó usando el contexto anterior. Los pesos no cambiaron. Puedes repetir el recorrido o comparar otro contexto y otra fuente.",
      "file": "llms-es-done-dab5c9c01d39.mp3",
      "duration": 14.04
    }
  ],
  "en": [
    {
      "id": "question",
      "title": "Your question",
      "text": "We start with your question. These cards represent the instructions and messages the application gathers before calling the model. If there is an earlier conversation, it may be included here. The model receives this input, not everything you know or the whole internet. Watch the information enter the same processing path. We will stop at every step.",
      "file": "llms-en-question-c7c8376fd9ba.mp3",
      "duration": 21.816
    },
    {
      "id": "retrieval",
      "title": "Adding a source",
      "text": "Here the application can retrieve a source. In the museum experiment, enabling retrieval adds a record to the context. Without a document, we continue without that evidence. Retrieved text does not change the model weights. An outdated source can lead to a wrong answer. Search is an additional tool, not something every model performs automatically.",
      "file": "llms-en-retrieval-d89b52b211b6.mp3",
      "duration": 22.5
    },
    {
      "id": "tokens",
      "title": "Splitting into tokens",
      "text": "The text is now split into tokens. Each block is a piece: a word, a fragment, a space or punctuation. Its identifier appears underneath. Identical pieces share an identifier. Select a block to inspect it. These splits belong to our teaching tokenizer; a real model uses its own vocabulary. We have not generated the answer yet.",
      "file": "llms-en-tokens-a60ab39ac9c1.mp3",
      "duration": 24.624
    },
    {
      "id": "vectors",
      "title": "A matrix of numbers",
      "text": "Each token becomes a vector, a list of numbers. Look at the three dimensional matrix: every row represents a token and every column a dimension. Blue and orange distinguish positive and negative values; height shows magnitude. Select a cell to read its value. Dimensions are not labels such as country or intelligence. These six numbers are illustrative, not weights extracted from a real model.",
      "file": "llms-en-vectors-979325ce3909.mp3",
      "duration": 28.692
    },
    {
      "id": "layers",
      "title": "Attention and layers",
      "text": "This matrix shows which positions can exchange information. Each row is a querying token; each column is a position it can attend to. Dark cells block the future. Bright columns show attention weights computed in our example. A real Transformer combines multiple heads, transformations and residual connections. Here we show one small head. This is not a picture of thoughts or a measure of truth.",
      "file": "llms-en-layers-c30261d9eb19.mp3",
      "duration": 27.54
    },
    {
      "id": "scores",
      "title": "From scores to probabilities",
      "text": "After the layers, the model computes scores for possible next tokens. Softmax turns them into probabilities. The three dimensional columns represent that distribution and add up to one hundred percent. A tall column means more likely text under these scores, not a more truthful statement. Change the temperature to compare. Our scores are prepared to explain the mechanism.",
      "file": "llms-en-scores-be9d8f27d5e1.mp3",
      "duration": 22.788
    },
    {
      "id": "choose",
      "title": "Choosing one token",
      "text": "Now one piece is selected. We can take the most likely option or sample from the distribution. Look at the options around the platform: a complete sentence does not come out at once. When this step finishes, exactly one new token appears in the answer. In this lab, the first choice uses probabilities; the rest follows a scripted continuation so we can study the path.",
      "file": "llms-en-choose-1baabf3618d2.mp3",
      "duration": 23.148
    },
    {
      "id": "feedback",
      "title": "Returning to context",
      "text": "One piece has now come out. The glowing block returns to the context alongside the question and earlier tokens. The next computation also uses what was just written. We repeat attention, probabilities and selection to produce another piece, and continue that loop. Real systems commonly reuse computations through a cache. Watch the counter: answering is not updating the model weights.",
      "file": "llms-en-feedback-8301de2a8270.mp3",
      "duration": 26.208
    },
    {
      "id": "loop-layers",
      "title": "Next token · attention",
      "text": "A new token cycle begins. Attention combines the input with what has already been written. Future positions remain blocked and the model weights stay fixed.",
      "file": "llms-en-loop-layers-622196adc834.mp3",
      "duration": 9.72
    },
    {
      "id": "loop-scores",
      "title": "Next token · probabilities",
      "text": "A new distribution describes the next piece. The continuation here is scripted. The tallest column shows the next token planned for this demonstration.",
      "file": "llms-en-loop-scores-d1c09a37ea2a.mp3",
      "duration": 9.684
    },
    {
      "id": "loop-choose",
      "title": "Next token · selection",
      "text": "We pause before emitting the next piece. When this step ends, just one token is added. It may be a word, a fragment, or even a space.",
      "file": "llms-en-loop-choose-6bb6bc3725e3.mp3",
      "duration": 10.368
    },
    {
      "id": "loop-feedback",
      "title": "Next token · context",
      "text": "The new piece is now part of both the answer and the context. Watch it return to the next computation. We leave a few seconds to observe it.",
      "file": "llms-en-loop-feedback-db62a46ed186.mp3",
      "duration": 7.92
    },
    {
      "id": "done",
      "title": "Answer complete",
      "text": "We have reached the end of sequence token. The answer is complete. Every piece was generated using the preceding context. The weights did not change. You can replay the journey or compare another context and source.",
      "file": "llms-en-done-2913f22eafa9.mp3",
      "duration": 13.932
    }
  ]
};
const base = new URL(document.documentElement.lang === 'es' ? '../../audio/' : '../audio/', import.meta.url);
for (const entries of Object.values(VOICES)) for (const entry of entries) entry.src = new URL(entry.file, base).href;
