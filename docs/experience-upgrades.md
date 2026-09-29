# Atlas — cola de mejoras

Base GitHub comprobada tras los merges del usuario: `main` en `8f35920c660cf8e53731f1ee86d057d17a996d55` (PR #11), 29 septiembre 2026. El historial de Sites es distinto del repositorio de publicación: los commits GitHub se realizan en el worktree que parte de esta main.

Objetivo: mejorar una experiencia cada vez, empezar por las notas menores y guardar un commit por tarea terminada. Las notas son valoraciones editoriales, no una medida objetiva ni una promesa de fotorealismo.

Para dar una experiencia por terminada con objetivo 9: escena legible y representativa del mecanismo, relación causal visible entre controles y resultados, cifras que describen la escena, explicación con límites y fuentes, ES/EN coherentes, audio/tiempo recuperables cuando existen y revisión real en navegador de escritorio y móvil. Ninguna experiencia pendiente sube de nota por cambiar una librería compartida.

| Orden | Experiencia | Gráficos iniciales | Explicación inicial | Estado |
|---|---|---:|---:|---|
| 1 | Starlink | 2 (canvas negro) | 8 | Terminada: 9 / 9 como simulación didáctica |
| 2 | Ideas | 5 | 7,5 | Investigación terminada; implementación pendiente |
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

## Ideas — siguiente tarea

Mantener una única red de 64 personas durante todo el recorrido. El modelo y la animación deben compartir un historial de mensajes por enlace: emisor, destinatario, éxito, fallo y ronda. Mostrar ramas, cruce de comunidades y agotamiento de nuevos destinatarios; evitar los destinatarios fijos que hoy contradicen el grafo. Sincronizar esos hitos tanto en el notebook como en la guía inmersiva, que hoy puede narrar con el experimento en ronda cero.

Comparaciones verificables: probabilidad 0 → solo la semilla; 100% sin puentes → 16 personas; 100% con puentes → 64. Conservar identidad de nodos, usar azar estable por enlace y mostrar alcanzados, nuevos por ronda e intentos con cifras grandes. Reutilizar las cuatro etapas y ocho voces existentes si los textos siguen correspondiendo a la escena.
