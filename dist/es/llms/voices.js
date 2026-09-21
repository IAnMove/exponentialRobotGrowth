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
      "text": "El identificador de cada token selecciona una fila de la tabla de embeddings. A la izquierda vemos esas representaciones; en el centro, una codificación de posición; a la derecha, su suma, X. Cada fila es un token y cada columna una dimensión. La fila dorada sigue el token seleccionado. Azul y naranja distinguen signos; la intensidad indica magnitud. Todos los valores son sintéticos. Usamos una suma de posición ilustrativa; otros modelos, como Llama, usan posiciones rotatorias en consultas y claves. Puedes pulsar una celda para ver su valor.",
      "file": "llms-es-vectors-162224d0bf01.mp3",
      "duration": 36.828
    },
    {
      "id": "layers",
      "title": "Atención y capas",
      "text": "Seguimos una fila de la entrada, marcada en dorado. Primero multiplicamos la matriz X por tres matrices de pesos diferentes. Así obtenemos Q, consultas; K, claves; y V, valores. Esas ramas pueden calcularse en paralelo. Los pesos permanecen fijos. Ahora comparamos la consulta activa con las claves. Cada producto escalar da una puntuación. Dividimos por la raíz de la dimensión, aquí tres. La fila dorada de la matriz muestra esas comparaciones. Aún no son probabilidades. Aplicamos la máscara causal. Las posiciones futuras reciben menos infinito, representado con una cruz. Después, softmax convierte la fila en coeficientes que suman uno. El futuro tiene exactamente cero. Esto no mide si una afirmación es verdadera. Esos coeficientes ponderan los vectores de valores. Sigue los pulsos desde la fila activa hacia V y hasta el resultado Z. Un pulso mayor indica mayor peso en la mezcla. El resultado es un vector de números, no una palabra sacada de una biblioteca. Finalmente proyectamos la mezcla y sumamos la entrada por la conexión residual. Normalizamos y aplicamos una red a cada posición, seguida de otra suma y normalización. Aquí usamos una cabeza, seis dimensiones y pesos sintéticos. Los modelos reales combinan cabezas y repiten bloques; la luz ilustra el flujo de activaciones, no un bit físico ni un pensamiento.",
      "segments": [
        "Seguimos una fila de la entrada, marcada en dorado. Primero multiplicamos la matriz X por tres matrices de pesos diferentes. Así obtenemos Q, consultas; K, claves; y V, valores. Esas ramas pueden calcularse en paralelo. Los pesos permanecen fijos.",
        "Ahora comparamos la consulta activa con las claves. Cada producto escalar da una puntuación. Dividimos por la raíz de la dimensión, aquí tres. La fila dorada de la matriz muestra esas comparaciones. Aún no son probabilidades.",
        "Aplicamos la máscara causal. Las posiciones futuras reciben menos infinito, representado con una cruz. Después, softmax convierte la fila en coeficientes que suman uno. El futuro tiene exactamente cero. Esto no mide si una afirmación es verdadera.",
        "Esos coeficientes ponderan los vectores de valores. Sigue los pulsos desde la fila activa hacia V y hasta el resultado Z. Un pulso mayor indica mayor peso en la mezcla. El resultado es un vector de números, no una palabra sacada de una biblioteca.",
        "Finalmente proyectamos la mezcla y sumamos la entrada por la conexión residual. Normalizamos y aplicamos una red a cada posición, seguida de otra suma y normalización. Aquí usamos una cabeza, seis dimensiones y pesos sintéticos. Los modelos reales combinan cabezas y repiten bloques; la luz ilustra el flujo de activaciones, no un bit físico ni un pensamiento."
      ],
      "file": "llms-es-layers-45273a92de98.mp3",
      "duration": 86.80709375,
      "cues": [
        {
          "start": 0,
          "end": 16.79546875
        },
        {
          "start": 16.79546875,
          "end": 30.739062500000003
        },
        {
          "start": 30.739062500000003,
          "end": 46.86534375000001
        },
        {
          "start": 46.86534375000001,
          "end": 62.99162500000001
        },
        {
          "start": 62.99162500000001,
          "end": 86.80709375
        }
      ]
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
      "text": "Otra pieza: la entrada produce nuevas consultas, claves y valores. La consulta se compara con las claves mediante productos escalares. La máscara bloquea el futuro. Softmax normaliza la fila. Los coeficientes mezclan los valores para obtener otro vector. Las conexiones residuales y la red transforman el resultado. Esta pequeña ventana se recalcula para mostrar las operaciones; una implementación real puede reutilizar una caché.",
      "segments": [
        "Otra pieza: la entrada produce nuevas consultas, claves y valores.",
        "La consulta se compara con las claves mediante productos escalares.",
        "La máscara bloquea el futuro. Softmax normaliza la fila.",
        "Los coeficientes mezclan los valores para obtener otro vector.",
        "Las conexiones residuales y la red transforman el resultado. Esta pequeña ventana se recalcula para mostrar las operaciones; una implementación real puede reutilizar una caché."
      ],
      "file": "llms-es-loop-layers-7c741daa2b2e.mp3",
      "duration": 28.688312500000002,
      "cues": [
        {
          "start": 0,
          "end": 5.41025
        },
        {
          "start": 5.41025,
          "end": 9.16028125
        },
        {
          "start": 9.16028125,
          "end": 13.5953125
        },
        {
          "start": 13.5953125,
          "end": 17.80975
        },
        {
          "start": 17.80975,
          "end": 28.688312500000002
        }
      ]
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
      "text": "Each token identifier selects a row from the embedding table. On the left are those representations; in the center, a position encoding; on the right, their sum, X. Each row is a token and each column a dimension. The gold row follows the selected token. Blue and orange distinguish signs; intensity indicates magnitude. All values are synthetic. We use an illustrative position sum; other models, such as Llama, use rotary positions in queries and keys. Select a cell to inspect its value.",
      "file": "llms-en-vectors-0506a9ce0edc.mp3",
      "duration": 35.28
    },
    {
      "id": "layers",
      "title": "Attention and layers",
      "text": "Follow one input row, outlined in gold. First, we multiply X by three different weight matrices. This produces Q, queries; K, keys; and V, values. These branches can be computed in parallel. The weights remain fixed. Now we compare the active query with the keys. Each dot product produces a score. We divide by the square root of the dimension, three in this example. The gold row shows those comparisons. They are not probabilities yet. We apply the causal mask. Future positions receive negative infinity, shown as crosses. Then softmax turns the row into coefficients that sum to one. Future positions have exactly zero weight. This does not measure whether a claim is true. Those coefficients weight the value vectors. Follow the pulses from the active row through V to the result Z. A larger pulse means a larger weight in the mixture. The result is a vector of numbers, not a word retrieved from a library. Finally, we project the mixture and add the input through a residual connection. We normalize and apply a network to each position, followed by another addition and normalization. Our example uses one head, six dimensions and synthetic weights. Real models combine heads and repeat blocks. The light illustrates activation flow, not a physical bit or a thought.",
      "segments": [
        "Follow one input row, outlined in gold. First, we multiply X by three different weight matrices. This produces Q, queries; K, keys; and V, values. These branches can be computed in parallel. The weights remain fixed.",
        "Now we compare the active query with the keys. Each dot product produces a score. We divide by the square root of the dimension, three in this example. The gold row shows those comparisons. They are not probabilities yet.",
        "We apply the causal mask. Future positions receive negative infinity, shown as crosses. Then softmax turns the row into coefficients that sum to one. Future positions have exactly zero weight. This does not measure whether a claim is true.",
        "Those coefficients weight the value vectors. Follow the pulses from the active row through V to the result Z. A larger pulse means a larger weight in the mixture. The result is a vector of numbers, not a word retrieved from a library.",
        "Finally, we project the mixture and add the input through a residual connection. We normalize and apply a network to each position, followed by another addition and normalization. Our example uses one head, six dimensions and synthetic weights. Real models combine heads and repeat blocks. The light illustrates activation flow, not a physical bit or a thought."
      ],
      "file": "llms-en-layers-ad466b333af3.mp3",
      "duration": 88.72009375,
      "cues": [
        {
          "start": 0,
          "end": 18.954625
        },
        {
          "start": 18.954625,
          "end": 33.757374999999996
        },
        {
          "start": 33.757374999999996,
          "end": 50.47575
        },
        {
          "start": 50.47575,
          "end": 64.976625
        },
        {
          "start": 64.976625,
          "end": 88.72009375
        }
      ]
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
      "text": "Another piece: the input produces queries, keys and values. The query is compared with the keys using dot products. The mask blocks the future. Softmax normalizes the row. The coefficients mix the values into another vector. Residual connections and the network transform the result. This small window is recomputed to show the operations; a real implementation can reuse a cache.",
      "segments": [
        "Another piece: the input produces queries, keys and values.",
        "The query is compared with the keys using dot products.",
        "The mask blocks the future. Softmax normalizes the row.",
        "The coefficients mix the values into another vector.",
        "Residual connections and the network transform the result. This small window is recomputed to show the operations; a real implementation can reuse a cache."
      ],
      "file": "llms-en-loop-layers-5ae9eec88b71.mp3",
      "duration": 25.00796875,
      "cues": [
        {
          "start": 0,
          "end": 5.0735625
        },
        {
          "start": 5.0735625,
          "end": 8.394031250000001
        },
        {
          "start": 8.394031250000001,
          "end": 12.3530625
        },
        {
          "start": 12.3530625,
          "end": 15.499375
        },
        {
          "start": 15.499375,
          "end": 25.00796875
        }
      ]
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
