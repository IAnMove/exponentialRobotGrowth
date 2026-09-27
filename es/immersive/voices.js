// MiniMax speech-2.8-hd. Gallery-specific text; unchanged clips reused.
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
      "text": "Cada token selecciona un vector de la tabla de embeddings. En esta escena, cada columna vertical pertenece a un token, escrito debajo. Sus seis celdas representan seis dimensiones. Sumamos una codificación de posición para obtener X. Azul indica números positivos y coral, negativos. Puedes seleccionar una celda para leer su valor. Son valores sintéticos, no atributos humanos como inteligencia o verdad. Esta suma de posición es didáctica: otros modelos utilizan posiciones rotatorias en consultas y claves.",
      "file": "llms-es-vectors-f4d9a45acc33.mp3",
      "duration": 34.02
    },
    {
      "id": "layers",
      "title": "Atención y capas",
      "text": "Seguimos el token seleccionado en el control inferior. Su vector X tiene seis dimensiones. Tres multiplicaciones con pesos diferentes producen la consulta Q, la clave K y el valor V, aquí de tres dimensiones. Las curvas muestran esas tres ramas. Los pesos están fijos: no estamos entrenando al modelo. Ahora la consulta dorada se compara con las claves de los ocho tokens visibles. Bajo cada token aparece el producto escalar dividido por la raíz de tres. Estas puntuaciones pueden ser positivas o negativas. Aún no son probabilidades. Las curvas conectan la consulta con las posiciones que está comparando. La máscara causal bloquea posiciones posteriores a la consulta. Sus puntuaciones se sustituyen por menos infinito. Después, softmax produce los porcentajes de las barras: suman cien por cien, y el futuro tiene exactamente cero. Para verlo, pausa y selecciona un token anterior. Atención no significa verdad ni es una explicación completa de la respuesta. Los pesos de atención multiplican los vectores V. Las curvas más gruesas representan contribuciones con más peso. Todas convergen en la mezcla Z, cuyo vector aparece arriba a la izquierda. Estamos sumando vectores ponderados, no recuperando palabras de una biblioteca. Proyectamos la mezcla, sumamos la entrada y normalizamos para obtener H. La red transforma cada posición: de seis dimensiones a doce y de vuelta a seis. La curva superior representa la conexión residual. Y es el resultado tras otra normalización. Este bloque usa una cabeza y pesos sintéticos. Los modelos reales combinan cabezas y repiten bloques. La luz representa activaciones, no un bit físico ni un pensamiento.",
      "segments": [
        "Seguimos el token seleccionado en el control inferior. Su vector X tiene seis dimensiones. Tres multiplicaciones con pesos diferentes producen la consulta Q, la clave K y el valor V, aquí de tres dimensiones. Las curvas muestran esas tres ramas. Los pesos están fijos: no estamos entrenando al modelo.",
        "Ahora la consulta dorada se compara con las claves de los ocho tokens visibles. Bajo cada token aparece el producto escalar dividido por la raíz de tres. Estas puntuaciones pueden ser positivas o negativas. Aún no son probabilidades. Las curvas conectan la consulta con las posiciones que está comparando.",
        "La máscara causal bloquea posiciones posteriores a la consulta. Sus puntuaciones se sustituyen por menos infinito. Después, softmax produce los porcentajes de las barras: suman cien por cien, y el futuro tiene exactamente cero. Para verlo, pausa y selecciona un token anterior. Atención no significa verdad ni es una explicación completa de la respuesta.",
        "Los pesos de atención multiplican los vectores V. Las curvas más gruesas representan contribuciones con más peso. Todas convergen en la mezcla Z, cuyo vector aparece arriba a la izquierda. Estamos sumando vectores ponderados, no recuperando palabras de una biblioteca.",
        "Proyectamos la mezcla, sumamos la entrada y normalizamos para obtener H. La red transforma cada posición: de seis dimensiones a doce y de vuelta a seis. La curva superior representa la conexión residual. Y es el resultado tras otra normalización. Este bloque usa una cabeza y pesos sintéticos. Los modelos reales combinan cabezas y repiten bloques. La luz representa activaciones, no un bit físico ni un pensamiento."
      ],
      "file": "llms-es-layers-da0fccde5088.mp3",
      "duration": 108.98640625,
      "cues": [
        {
          "start": 0,
          "end": 19.81946875
        },
        {
          "start": 19.81946875,
          "end": 38.0189375
        },
        {
          "start": 38.0189375,
          "end": 61.83440625
        },
        {
          "start": 61.83440625,
          "end": 78.7269375
        },
        {
          "start": 78.7269375,
          "end": 108.98640625
        }
      ]
    },
    {
      "id": "scores",
      "title": "Del cálculo a las probabilidades",
      "text": "Un modelo entrenado transforma el vector final en logits para los tokens del vocabulario. Aquí usamos puntuaciones preparadas, independientes del pequeño bloque anterior. Softmax las convierte en probabilidades. La longitud de cada barra muestra el porcentaje de una continuación. Entre todas suman cien por cien. Más probable no significa más verdadero. Cambia la temperatura en el recorrido para comparar el reparto.",
      "file": "llms-es-scores-3cbadc1d668a.mp3",
      "duration": 26.136
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
      "text": "Calculamos el reparto para la siguiente pieza. En esta demostración la continuación está guionizada. La barra más larga señala el siguiente token previsto; no es una medida de si su contenido es verdadero.",
      "file": "llms-es-loop-scores-ea4b0a15fd96.mp3",
      "duration": 12.168
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
      "text": "Each token selects a vector from the embedding table. Here, each vertical column belongs to the token written underneath it. Its six cells represent six dimensions. We add an illustrative position encoding to obtain X. Blue means positive numbers and coral means negative numbers. Select a cell to read its value. These synthetic dimensions are not human qualities such as intelligence or truth. This position sum is a teaching simplification: other models use rotary positions in queries and keys.",
      "file": "llms-en-vectors-410a0fcd6289.mp3",
      "duration": 32.148
    },
    {
      "id": "layers",
      "title": "Attention and layers",
      "text": "Follow the token selected in the control below. Its input vector X has six dimensions. Three multiplications with different weights produce the query Q, key K and value V, each with three dimensions here. The curves show these three branches. The weights stay fixed: we are not training the model. The gold query is now compared with the keys of the eight visible tokens. Under each token you can read its dot product divided by the square root of three. Scores can be positive or negative. They are not probabilities yet. The curves connect the query to the positions it is comparing. The causal mask blocks positions after the query. Their scores are replaced with minus infinity. Softmax then produces the bar percentages: they sum to one hundred percent and future positions have exactly zero. To see this, pause and select an earlier token. Attention does not mean truth and is not a complete explanation of the answer. Attention weights multiply the value vectors. Thicker curves indicate contributions with more weight. They converge on the mixture Z, whose vector appears at the upper left. We are adding weighted vectors, not retrieving words from a library. We project the mixture, add the input and normalize to obtain H. The network transforms each position from six dimensions to twelve and back to six. The upper curve represents the residual connection. Y is the result after another normalization. This block has one head and synthetic weights. Real models combine heads and repeat blocks. Light represents activations, not a physical bit or a thought.",
      "segments": [
        "Follow the token selected in the control below. Its input vector X has six dimensions. Three multiplications with different weights produce the query Q, key K and value V, each with three dimensions here. The curves show these three branches. The weights stay fixed: we are not training the model.",
        "The gold query is now compared with the keys of the eight visible tokens. Under each token you can read its dot product divided by the square root of three. Scores can be positive or negative. They are not probabilities yet. The curves connect the query to the positions it is comparing.",
        "The causal mask blocks positions after the query. Their scores are replaced with minus infinity. Softmax then produces the bar percentages: they sum to one hundred percent and future positions have exactly zero. To see this, pause and select an earlier token. Attention does not mean truth and is not a complete explanation of the answer.",
        "Attention weights multiply the value vectors. Thicker curves indicate contributions with more weight. They converge on the mixture Z, whose vector appears at the upper left. We are adding weighted vectors, not retrieving words from a library.",
        "We project the mixture, add the input and normalize to obtain H. The network transforms each position from six dimensions to twelve and back to six. The upper curve represents the residual connection. Y is the result after another normalization. This block has one head and synthetic weights. Real models combine heads and repeat blocks. Light represents activations, not a physical bit or a thought."
      ],
      "file": "llms-en-layers-f6fee5451691.mp3",
      "duration": 100.6195625,
      "cues": [
        {
          "start": 0,
          "end": 20.17946875
        },
        {
          "start": 20.17946875,
          "end": 37.2989375
        },
        {
          "start": 37.2989375,
          "end": 58.66640625
        },
        {
          "start": 58.66640625,
          "end": 74.57209375000001
        },
        {
          "start": 74.57209375000001,
          "end": 100.6195625
        }
      ]
    },
    {
      "id": "scores",
      "title": "From scores to probabilities",
      "text": "A trained model transforms the final vector into logits for vocabulary tokens. Here we use curated scores, independent of the small block you just saw. Softmax converts them into probabilities. Each bar’s length shows one continuation’s percentage. Together they sum to one hundred percent. More probable does not mean more truthful. Change temperature in the route menu to compare the distribution.",
      "file": "llms-en-scores-db4737fa4d65.mp3",
      "duration": 25.38
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
      "text": "We calculate the distribution for the next piece. The continuation in this demonstration is scripted. The longest bar indicates the next expected token; it does not measure whether its content is true.",
      "file": "llms-en-loop-scores-2cab2fe05d06.mp3",
      "duration": 11.952
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
