# Atlas — cola de mejoras

Base GitHub comprobada tras los merges del usuario: `main` en `8f35920c660cf8e53731f1ee86d057d17a996d55` (PR #11), 29 septiembre 2026. El historial de Sites es distinto del repositorio de publicación: los commits GitHub se realizan en el worktree que parte de esta main.

Objetivo: mejorar una experiencia cada vez, empezar por las notas menores y guardar un commit por tarea terminada. Las notas son valoraciones editoriales, no una medida objetiva ni una promesa de fotorealismo.

Para dar una experiencia por terminada con objetivo 9: escena legible y representativa del mecanismo, relación causal visible entre controles y resultados, cifras que describen la escena, explicación con límites y fuentes, ES/EN coherentes, audio/tiempo recuperables cuando existen y revisión real en navegador de escritorio y móvil. Ninguna experiencia pendiente sube de nota por cambiar una librería compartida.

| Orden | Experiencia | Gráficos iniciales | Explicación inicial | Estado |
|---|---|---:|---:|---|
| 1 | Starlink | 2 (canvas negro) | 8 | Terminada: 9 / 9 como simulación didáctica |
| 2 | Ideas | 5 | 7,5 | Terminada: 9 / 9 como simulación didáctica |
| 3 | Carbono | 5 | 7,5 | Terminada: 9 / 9 como simulación didáctica |
| 4 | Evolución | 5 | 8 | Pendiente |
| 5 | Electricidad | 5,5 | 8 | Pendiente |
| 6 | Microchip | 5,5 | 8 | Pendiente |
| 7 | Célula | 5,5 | 8 | Pendiente |
| 8 | Nuclear | 5,5 | 8 | Pendiente |
| 9 | Museo | 6,5 | 7 | Pendiente |
| 10 | Mente | 6,5 | 7 | Pendiente |
| 11 | Hogar | 6,5 | 7,5 | Pendiente |
| 12 | SpaceX | 6,5 | 7,5 | Pendiente |
| 13 | Terafab | 7 | 8 | Pendiente |
| 14 | Modelos | 7 | 7,5 | Pendiente |
| 15 | Crecimiento | 7 | 9 | Pendiente (gráficos) |
| 16 | Robots | 7,5 | 8 | Pendiente |
| 17 | Dyson | 7,5 | 8 | Pendiente |
| 18 | Internet | 7,5 | 8,5 | Pendiente |
| 19 | Luna | 7,5 | 8,5 | Pendiente |
| 20 | LLMs | 8 | 8 | Pendiente |
| 21 | Kardashev | 8 | 8,5 | Pendiente |

## Starlink — revisión completada

Seis etapas narradas con doce clips MiniMax ES/EN, textos completos y timeline persistente. Tres vistas: constelación sobre Tierra con Blue Marble, hardware satelital esquemático y pasarela → PoP → servidor. Indicadores de visibilidad, longitud, saltos y propagación espacial; versión móvil sin desbordamiento y con cifras sobre la escena. Cámara mediante ratón, rueda, teclado y controles; capas, mapa de visibilidad, posición y enlaces láser funcionan al pausar la narración.

Se corrigió el shader de atmósfera que dejaba negro el postprocesado. Las rutas ahora respetan ocultación por la Tierra, umbrales de elevación, distancia de los candidatos láser y pasarelas visibles. Cada frame valida la ruta almacenada y recalcula las cifras sobre los puntos dibujados. Una ruta fallida no inventa una bajada ni latencia, y cero capas produce cero satélites.

Validación: 38 checks generales pasaron antes del último ajuste; el check de recursos detectó el import inglés y se corrigió. `check-starlink.mjs` y `check-site.py` pasaron después sobre el resultado final. Navegador: audio real, etapa del servidor, cambio de idioma, transcript, pausa/recarga, comparación del océano sin láser, cero capas y preset polar a 78°. Móvil 390×844: ancho de contenido igual al viewport, indicadores y timeline visibles. Consola sin errores.

Límites: 448 objetos de muestra, órbitas circulares, cuerpos ampliados, hardware funcional sin réplica CAD, tres pasarelas ilustrativas. La ruta geométrica no reproduce el protocolo privado ni las asignaciones ópticas. Propagación espacial de ida ≠ ping; no se modelan red terrestre, colas, meteorología, capacidad ni disponibilidad comercial. Fuentes oficiales enlazadas en la página.

## Ideas — revisión completada

Una única red de 64 personas en cuatro comunidades conserva la identidad de cada nodo durante los cuatro capítulos. Personas con teléfonos, emisores amarillos, receptores verdes, puentes y mensajes animados por los enlaces del modelo. Se distinguen intentos, contactos ya alcanzados y éxitos/fallos de la ronda anterior; las cifras cambian cuando llegan los mensajes. Curvas de alcanzados, nuevos por ronda y referencia lineal. Notebook y paseo libre comparten voces MiniMax ES/EN, texto, timeline, pausas y recuperación de parámetros/posición del experimento.

Se sustituyó el azar consumido por orden de recorrido por oportunidades estables por enlace dirigido. Aumentar probabilidad o añadir enlaces conserva las oportunidades anteriores. Los receptores simultáneos cuentan una vez; cada emisor intenta cada vecino no alcanzado una vez, y la activación avanza un salto por ronda. El horizonte de 64 permite terminar incluso el caso lento con un vecino por lado (último receptor en 35; ningún emisor en 36). La guía usa hitos del historial real en lugar de cuatro cortes arbitrarios del tiempo.

El paseo ofrece cuatro stands con botón físico y tecla E por proximidad. Esc libera el ratón y pausa. Escuchar un stand conserva la cámara. Se filtran las acciones invisibles en la vista notebook. En navegadores que rechazan pointer lock, activar el ratón permite mirar moviéndolo sobre el canvas sin mantener pulsado; fuera del canvas queda libre para los controles.

Validación: suite completa 40/40; checks del modelo, escenas y controlador, más comprobación final de recursos/imports/sintaxis. 800 comparaciones de probabilidades, umbrales dirigidos, aristas reordenadas/duplicadas, cadena, diamante, límites y ciclos. Pruebas de control cubren pausa a mitad de ronda, cambio de idioma conservando el experimento, avance manual sin interferencia de la voz y escuchar un stand sin teletransporte. Navegador real: ES/EN, voces/textos, controles 0% → 1 persona, 100% sin puentes → 16, con puentes → 64; reapertura con parámetros y ronda conservados. Móvil 390×844: red, indicadores y footer visibles; sin desbordamiento horizontal. Consolas ES/EN sin errores. El navegador integrado rechazó pointer lock y se verificó la alternativa y la tecla E.

Límites: modelo de cascada independiente basado en Kempe/Kleinberg/Tardos; población y topología sintéticas, no una predicción humana. Una semilla es una realización, no un promedio. Los contadores de emisores activos describen la frontera que puede compartir, y no a todos los nodos ya activados en la terminología del paper. No mide verdad, persuasión ni recomendación de plataformas. Nota 9 editorial para una visualización explicativa estilizada, sin pretensión de fotorealismo.

## Carbono — revisión completada

Un paisaje continuo conecta atmósfera, bosque y suelo, océano y reserva fósil. Árboles de dos tipos, terreno seccionado con estratos y carbón, agua transparente y chimenea conectada a la reserva. Las cinco rutas muestran dirección y partículas según los flujos del modelo; sus cantidades aparecen en tarjetas y los cuatro depósitos en el header. Una barra de masa distribuye exactamente las 100 unidades; las barras 3D comparten la escala 0–100. La molécula CO₂ ampliada separa materia y energía: IR entrante, vibración y un rayo reemitido, sin pared atmosférica ni reflexión especular.

El ledger calcula las cinco transferencias a partir del estado anterior. Las cantidades se interpolan con el mismo tiempo usado por la escena, conservando total y balances individuales. Parar fósiles cierra únicamente ese flujo después del intervalo 10; los cuatro naturales continúan. Se distinguen parada, emisión cero y reserva agotada. La curva de comparación sin parada conserva los mismos parámetros de captación y emisión; el cursor muestra el intervalo activo sobre el horizonte fijo.

Cuatro voces MiniMax por idioma, reutilizadas sin cambiar sus textos. El último capítulo parte de intervalo 9, muestra la parada durante la instrucción y llega a 11 al explicar que cesan las emisiones (aproximadamente 8,23 s ES / 8,59 s EN, medido a partir de pausas de las grabaciones; no alineación por palabra). Notebook y paseo comparten footer, textos y restauración de parámetros, voz y fracción del experimento. Cámara guiada con ampliaciones de CO₂, bosque y mar, vista completa, giro y acercamiento. Cuatro stands físicos con E, ratón libre con alternativa al bloqueo rechazado y Esc; escuchar un stand conserva la cámara. Una notificación tardía de un audio pausado ya no sobreescribe el experimento manual. El reproductor guarda solo cuando cambia su estado: una pestaña antigua en pausa ya no reescribe periódicamente la posición de una nueva. Se mantienen la clave y la compatibilidad de los datos existentes.

Validación: suite completa 41/41; checks finales de Carbono, Ideas, escenas/control de journeys y reproducción. `check-carbon.mjs` cubre las 672 combinaciones de los sliders/toggle durante 60 intervalos, balances por depósito, no negatividad, equilibrio con flujos activos, parada desde 11, agotamiento parcial, interpolación, referencia y ocho guiones/archivos MiniMax. Geometría Three finita, mismos depósitos en las cuatro etapas, fósil invisible tras parada y reaparece al retroceder, flujos naturales visibles y barras con escala común. Navegador: voces reales ES/EN, textos, equilibrio 10/20/40/30 sin emisiones, agotamiento con emisión 2, pausa fraccional conservada tras recarga/cambio de voz/web↔3D, E, Esc y pausa al caminar. Móvil 390×844: cuatro depósitos, cinco flujos y footer legibles sin desbordamiento horizontal; encuadre ajustado a su frustum. El aviso de PCFSoftShadowMap eliminado en Three 0.186 se corrigió usando PCFShadowMap.

Límites permanentes: 100 unidades arbitrarias, no ppm, años ni temperatura. Geometría, árboles, volumen de agua y partículas son ilustrativos; los contadores/barras miden el carbono, que cambia de forma química al transferirse. No es una predicción del clima, el tamaño real de los depósitos no guarda estas proporciones y la parada fósil no equivale al cero neto de todos los gases. NASA, NOAA e IPCC enlazados en la página. Nota 9 editorial para una maqueta explicativa estilizada, sin pretensión de fotorealismo.

## Evolución — siguiente tarea

Rehacer la copia de padres a descendientes: la escena actual agranda A para representar ventaja reproductiva y fuerza una hija B para cualquier mutación positiva. Se necesitan cohortes de 50 organismos y eventos de selección/copia/mutación que expliquen los números. El modelo es Wright–Fisher haploide, selección relativa 1+s, mutación simétrica y muestreo binomial. Rotular la referencia sin deriva como determinista, no media exacta bajo selección. Conservar las ocho voces sustancialmente correctas, y distinguir población real de proporciones continuas sin deriva. Investigación previa: Genetics 2014 (PMC4224163), NHGRI Genetic Drift y Mutation.
