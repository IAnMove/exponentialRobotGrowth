# Atlas — cola de mejoras

Base GitHub comprobada tras los merges del usuario: `main` en `8f35920c660cf8e53731f1ee86d057d17a996d55` (PR #11), 29 septiembre 2026. El historial de Sites es distinto del repositorio de publicación: los commits GitHub se realizan en el worktree que parte de esta main.

Objetivo: mejorar una experiencia cada vez, empezar por las notas menores y guardar un commit por tarea terminada. Las notas son valoraciones editoriales, no una medida objetiva ni una promesa de fotorealismo.

Para dar una experiencia por terminada con objetivo 9: escena legible y representativa del mecanismo, relación causal visible entre controles y resultados, cifras que describen la escena, explicación con límites y fuentes, ES/EN coherentes, audio/tiempo recuperables cuando existen y revisión real en navegador de escritorio y móvil. Ninguna experiencia pendiente sube de nota por cambiar una librería compartida.

| Orden | Experiencia | Gráficos iniciales | Explicación inicial | Estado |
|---|---|---:|---:|---|
| 1 | Starlink | 2 (canvas negro) | 8 | Terminada: 9 / 9 como simulación didáctica |
| 2 | Ideas | 5 | 7,5 | Terminada: 9 / 9 como simulación didáctica |
| 3 | Carbono | 5 | 7,5 | Pendiente |
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

## Carbono — siguiente tarea

Auditar la representación de depósitos y flujos antes de rehacerla: conservación de masa, combustibles fósiles, intercambio con océanos/tierra y persistencia tras detener emisiones. Sustituir los elementos genéricos por una escena causal y sincronizarla con su narración real, reutilizando sus voces cuando sigan siendo correctas.
