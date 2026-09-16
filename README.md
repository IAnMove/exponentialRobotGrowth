# Atlas: explicaciones interactivas

## Portada común y Terafab (publicación privada en Sites)

Desplegado el 16 de septiembre de 2026 en https://robot-lab-el-relevo.merithion.chatgpt.site (acceso privado del propietario), versión 5, fuente `0a79031affeb5ec9599aed72264209b65bcc2f0b`. Despliegue `appgdep_6aaab65e84e481919ef510a1bf93238c` confirmado como `succeeded`. Entrada española: `/es/index.html`; Terafab: `/es/terafab/index.html`. GitHub Pages no se modificó y los commits de `codex/robot-learning` siguen pendientes de integración.

La entrada `/` (inglés) y `/es/` (español) es ahora la colección Atlas. Robots tiene sus propias rutas `/robots/` y `/es/robots/`, con las cuatro escenas y narraciones existentes. Se conservan las rutas antiguas `factory.html`, `district.html`, `city.html` y `region.html`. Cada escena permite volver a la colección o entrar en Terafab.

La explicación vive en `site-src/terafab/` y se genera en `/terafab/` y `/es/terafab/`. La revisión actual sustituye el diagrama conceptual por una maqueta espacial en Three.js basada en el render exterior oficial y la lista de instalaciones del expediente JETI (fase 1, pp. 7 y 27–28). Tiene vistas de complejo, sala limpia y niveles separados de una nave; 16 zonas seleccionables; equipos litográficos, cámaras de proceso, metrología, encapsulado, pruebas, muelles, agua, energía, subfábrica y filtración. El recorrido automático se pausa con interacción manual. Se puede seguir un recipiente de obleas sobre un raíl cerrado, con paradas; el movimiento no representa tiempos ni volúmenes reales.

`world.js` separa geometría, cámara y movimiento de `app.js`; `places.js` contiene las explicaciones bilingües y su procedencia. Las proporciones exteriores son una interpretación simplificada del render, no una planta a escala. La asignación funcional de naves, posiciones, cantidades y modelos de máquinas son representativos: no se presentan como un plano interior confirmado. La imagen oficial se incluye como referencia atribuida. Fuentes consultadas el 16 de septiembre de 2026: [Terafab](https://www.terafab.ai/), [expediente JETI](https://assets.comptroller.texas.gov/open-data/jeti/J0035/J0035-terafab-anderson-app.pdf), [ASML](https://www.asml.com/en/company/stories/2021/semiconductor-manufacturing-process-steps), [Lam Research](https://www.lamresearch.com/products/our-processes/) y [Daifuku](https://www.daifuku.com/daifuku-square/article/000999/). No se atribuyen contratos de suministro a estos fabricantes.

La portada está en `site-src/hub/`; su colección se define en `atlas.js`. Para añadir otra explicación: crear su carpeta fuente, registrarla en la colección y añadirla al bucle de carpetas independientes en `tools/build_site.py`. Los recursos compartidos de Robots siguen en la raíz de `dist/`; no se duplican los audios ni Three.js.

Construir con `python build-site.py`. Validar con `python check-site.py`, `node check-terafab.mjs`, `node check-localization.mjs` y `node check-narrator.mjs`. Las comprobaciones pasan; no se realizó QA visual en navegador.

## Robots que refuerzan su cadena de fabricación

## Ciudad y región: dos escalas distintas

Publicado en GitHub Pages: commit `e4154c3`, ejecución `35040241911` completada. Se verificaron las diez rutas, los nuevos mundos/modelos/controladores/estilos, ambos catálogos y los 98 audios públicos.

El recorrido es **fábrica → distrito → ciudad → región**. La ciudad muestra seis barrios de actividad, humanos y robots, una terminal de llegadas, cobertura por barrio y curvas de tareas humanas y robóticas. La región contiene tres ciudades conectadas con seis industrias. Usa `territory-model.js` sobre el motor industrial conservativo: 600 tareas equivalentes, reservas antes de envío, retrasos de 1/3/5 ciclos y un porcentaje configurable de robots nuevos destinado a ciudades. Los robots enviados salen de la flota industrial. Las reservas impiden asignar una tarea dos veces. El depósito conserva los excedentes.

La comparación regional incluye todos los robots (industria, tránsito y ciudades), y muestra por separado la producción por ciclo: acumular robots no equivale por sí solo a acelerar. La referencia mantiene sus seis instalaciones y el mismo porcentaje de entregas. Las tres ciudades usan el alcance intermedio por sector; las cifras y distancias son supuestos ilustrativos.

`urban-world.js` proporciona los dos nuevos mapas: barrios con edificios y calles a escala cercana; tres núcleos urbanos y un cinturón industrial en la vista regional. Geometría y figuras se agrupan en instancias. Las animaciones de llegada son ilustrativas; la contabilidad la determina el modelo. Las personas representan tareas y no poblaciones o empleos eliminados.

Hay **49 narraciones por idioma**. Se actualizaron siete explicaciones por idioma, incluidas las tres ciudades regionales, conservando la voz E aprobada en español. Los 98 MP3 se decodificaron y verificaron contra sus textos y voces. `check-territory.mjs` valida conservación, reservas, retrasos, límites y equivalencia EN/ES; `check-urban-world.mjs` comprueba geometría y proyección a 390/1200 px sin navegador ni GPU. No se realizó QA visual en navegador. Las comprobaciones existentes de sitio, ciudad, idiomas y narración también pasan.

## Recorrido de cuatro escalas

La entrada `index.html` ahora corresponde a `factory.html`, una fábrica de robots con cinco puestos. El distrito anterior se conserva en `district.html`, seguido de `city.html` y `region.html`. Una navegación común presenta el orden, la explicación general y un recorrido narrado por los sectores con enfoque de cámara. Cada escala mantiene condiciones iniciales propias.

La fábrica solo puede incorporar robots que ya haya terminado. El modo automático está activado inicialmente y prioriza puestos con baja capacidad diaria. Puede desactivarse para elegir manualmente. Se mantiene la comparación con humanos y el ensayo de configuración fija. Los cuerpos robóticos sustituyen a los móviles en las cintas y la salida; vuelven desde la salida a sus puestos.

La ciudad añade 600 tareas equivalentes, seis sectores y tres hipótesis de alcance. Su industria usa el modelo regional y exporta una fracción de los robots fabricados: esas unidades dejan de trabajar en industria. Los traslados tardan un ciclo y la asignación urbana es automática. Se conservan robots, materiales y tareas; nunca se equipara una tarea automatizada a un empleo eliminado. `node check-city.mjs` verifica conservación, demoras y límites.

Los guiones generales, los de la nueva fábrica y los urbanos están en `narration/lessons.es.json` y `narration/lessons.en.json`. El constructor omite los cinco clips antiguos de la fábrica de móviles. La versión inglesa tiene sus 46 clips vigentes generados. El usuario ha elegido la muestra E para español: `ttv-voice-2026091606404326-GjG0y5Nk`, guardada en `narration/voices.json`. Aunque su archivo de audición se llama `E-espana-femenina`, el usuario describe el resultado como voz masculina; el nombre procedía del prompt y no describe de forma fiable el audio. Debe conservarse el ID exacto aprobado.

La regrabación española se completó el 16 de septiembre de 2026 tras renovarse la cuota: 46 clips, 26.791 caracteres y unos 27,5 minutos, todos con la voz E aprobada. Los 92 audios de ambos idiomas decodifican correctamente, coinciden con sus guiones y tienen cobertura completa. También pasan las comprobaciones de rutas, sintaxis, modelos, conservación, equivalencia EN/ES y control de narración. Las cuatro escalas están publicadas en GitHub Pages (commit `593b7cd`, ejecución `35038428752` completada). Se verificaron las diez rutas de página y ambos catálogos contra la compilación, normalizando finales de línea, y los 92 audios públicos responden correctamente con el tamaño esperado.

Para futuras ediciones: `python tools/build_narration.py --language es` reutiliza clips válidos con la voz guardada; `python tools/build_site.py` construye las rutas. Ejecutar las comprobaciones relevantes, `node check-narrator.mjs`, empaquetar y publicar desde el checkout dedicado de Pages. Las credenciales siguen exclusivamente en el estudio externo.

## Región industrial

`region.html` añade el tercer nivel, accesible desde distrito y fábrica. Empieza con 24 robots y seis instalaciones; no importa el estado de las otras escenas. El control de inversión limita la fracción de la flota destinada a construir y reserva esa misma fracción de material recién refinado para próximas obras. La producción, las obras y los inventarios conservan material; el dinero no se modela.

Hay seis tipos de industria, seis parcelas por tipo y hasta tres proyectos simultáneos. Cada proyecto consume 48 lotes y necesita 24 unidades de trabajo, con hasta cuatro robots. La electricidad limita producción y construcción; la logística limita flujos industriales. La referencia también incorpora los robots fabricados, pero mantiene sus seis instalaciones originales. Los ciclos no son días ni años. Los robots se dibujan individualmente hasta que hace falta agruparlos para mantener legible el mapa; la equivalencia se indica en pantalla.

El modelo está en `site-src/region-model.js`; `node check-region.mjs` comprueba conservación, existencias, demoras, límites, construcción manual, coste inicial de la inversión y mayor capacidad posterior. Las narraciones adicionales están en `narration/region.es.json` y `narration/region.en.json` y se generan con el mismo comando de narración. `check-site.py` valida las cuatro escenas y su entrada en ambos idiomas y `check-localization.mjs` también compara ambos modelos regionales.

## Inglés, español y GitHub Pages

Web pública: https://ianmove.github.io/exponentialRobotGrowth/ · Repositorio público: https://github.com/IAnMove/exponentialRobotGrowth

El inglés es el idioma inicial en `/`; el español está en `/es/`. EN/ES cambia interfaz y narración conservando la escena. Hay 46 grabaciones por idioma, con texto y controles de reproducción. El cambio de idioma recarga la escena desde el inicio.

Editar HTML/CSS/JS en `site-src/`, traducciones en `site-src/en.tsv`, y los modelos industriales clásicos en los archivos de la raíz. `python tools/build_site.py` genera las cuatro escenas y su entrada en ambos idiomas con referencias relativas, compatibles con el subdirectorio de GitHub Pages. `python build-site.py` también actualiza el proveedor Three.js desde las dependencias instaladas. No editar las traducciones directamente en `dist/`.

Guiones: `narration/places.json` y `narration/places.en.json`. Generar únicamente clips nuevos mediante `python tools/build_narration.py --language es` o `--language en`. Los audios existentes se reutilizan. No hace falta generar voces para compilar o servir la web.

Validación: `python check-site.py`, `node check-localization.mjs`, `node check-narrator.mjs`, `node check-industrial.js` y `node check-factory.mjs`. La prueba de localización confirma que los resultados numéricos de ambos idiomas coinciden.

El checkout público de publicación está en `C:/Users/ina/.codex/artifacts/robot-lab-pages`. Su remoto `origin` apunta a `IAnMove/exponentialRobotGrowth`; `previous-site` conserva el destino anterior `IAnMove/robot-lab`. `python tools/package_pages.py --output C:/Users/ina/.codex/artifacts/robot-lab-pages` copia únicamente los recursos públicos de `dist/` (sin `.env`, metadatos de generación ni configuración de Sites). Publicar sus cambios en `main` actualiza GitHub Pages. Las credenciales MiniMax siguen fuera de ambos repositorios y no son necesarias para reproducir la web.

## Archivo: antigua fábrica de móviles (sustituida por fábrica de robots)

La narración al seleccionar cubre los 14 lugares del distrito y los 5 puestos de la fábrica. Cada lugar tiene una explicación grabada con MiniMax; los procesos añaden un segundo fragmento elegido según el estado del modelo. La simulación se pausa para conservar ese contexto. Reanudar o modificar la simulación detiene la explicación; seleccionar otro lugar sustituye el audio anterior. El reproductor incluye pausa, repetición, salto al estado actual, texto y desactivación global.

Los guiones están en `narration/places.json`; `tools/build_narration.py` genera audios con nombres derivados del contenido y reutiliza los ya existentes. La clave se lee del `.env` externo de MiniMax; no se copia al proyecto ni se necesita para reproducir el sitio. `node check-narrator.mjs` valida cobertura, archivos y el ciclo de reproducción, incluidas respuestas tardías de una selección anterior.

`dist/factory.html` abre una segunda escena independiente del distrito, con cinco puestos y diez personas. Los robots se incorporan desde el exterior, uno por tarea, y el usuario decide dónde introducirlos. Incluye selección de puestos, cámara isométrica con desplazamiento y zoom táctil, pausas humanas, recarga y servicio de robots, colas limitadas, comparación simultánea con una línea humana y un ensayo separado de 24 horas con la configuración fija.

`dist/factory-model.js` conserva unidades: cada kit pasa por preparación (incluida la RAM), montaje, pantalla/batería, pruebas y embalaje. Hay 160 kits iniciales, hasta 160 entregados cada día, buffers de 16 unidades y límites de maquinaria. Las tasas, el factor 1,4 de los robots, el turno humano de ocho horas y las 21 horas disponibles por robot son supuestos didácticos. Una estación bloqueada conserva su trabajo terminado hasta que el siguiente buffer tenga espacio. Los contadores diarios cambian a las 08:00; se conserva el resultado del último día completo.

`node check-factory.mjs` verifica conservación, límites, turnos, incorporación, comparación de intervenciones y suministro. `python check-site.py` valida ambas páginas y sus módulos. Las piezas del suministro y las cajas expedidas se dibujan de forma resumida; las colas internas y los contadores representan las unidades del modelo.

## Versión actual: Robot Lab 3D

La web actual está en `dist/`: un distrito isométrico en Three.js, cinco veces mayor que el anterior, con 74 humanos iniciales, robots articulados, vehículos, obras, comedor, viviendas, parque y recarga. Play inicia el reloj y las animaciones inmediatamente. El reloj es independiente del refresco del lienzo. Los controles se prueban en la página real, mediante clics.

Ejecutar `python build-site.py` tras instalar las dependencias con `npm install`. `python serve.py` sirve la web en una dirección local e imprime su URL. Mantener ese proceso abierto mientras se utiliza la web. La biblioteca 3D se sirve localmente desde `dist/vendor/`, sin depender de un CDN para arrancar.

El modelo actual está separado en `industrial-model.js`. `dist/world.js` crea el distrito, `dist/characters.js` representa personas y robots y `dist/game.js` conecta la simulación con la interfaz. `network-model.js` y los archivos de visualización de abajo conservan los prototipos anteriores.

### Distrito con humanos, relevos y turnos

Nueve industrias: mina, refinería, estructuras, motores, baterías, electrónica, logística, montaje y pruebas. Las cuatro familias de componentes son necesarias para formar un kit; los inventarios no pueden consumirse dos veces. Hay existencias intermedias al empezar. La red comienza sin robots operativos.

El turno humano es 08–12 y 14–18. Las personas caminan al comedor, vuelven a sus puestos y descansan en casa por la noche. Los robots cubren progresivamente sus tareas; las personas con relevo permanecen en la comunidad. Cada robot dispone de 21 horas, con 2 de recarga y 1 de mantenimiento escalonadas. Una figura representa una persona o robot; las mercancías son ilustrativas.

Hasta el 70 % de los robots se reinvierte según la capacidad útil. La incorporación tarda dos horas simuladas. Cada ampliación reserva hasta dos robots activos y necesita doce horas con una cuadrilla completa; puede haber tres obras simultáneas. La maquinaria se limita a ocho módulos por instalación. Energía, equipos e insumos especializados se suponen suministrados desde fuera.

Los doce días son una escala narrativa, no una predicción de plazos industriales. Horarios y productividades son supuestos. Se usa un único turno humano para visualizar el descanso, aunque una fábrica real puede organizar múltiples turnos.

Controles: arrastrar para desplazar, Mayús + arrastrar para girar, rueda o +/− para acercar, edificio para inspeccionar, minimapa para explorar, ⌖ para ver todo y ⛶ para pantalla completa. Los botones Trabajo, Comida y Noche permiten visitar momentos del día actual. El deslizador recorre las 280 instantáneas horarias y las estrategias comparan el mismo instante.

La capa visual de actividad (`dist/activity.js`) añade transporte local de cajas, cuerpos en montaje, pruebas con escáner, señales de estado, pilas de existencias e iluminación nocturna. Las pilas son orientativas; el inspector muestra las cantidades exactas de la red y distingue falta de materiales, falta de turno y maquinaria al máximo. Las tareas animadas utilizan el flujo calculado para la hora actual. Los cuerpos en montaje y pruebas son trabajo en curso, no robots operativos adicionales.

Seleccionar una fábrica ilumina sus suministros y destinos; Conexiones muestra la cadena completa. Los accesos a Inicio, Relevos, Red robotizada y Ampliaciones se calculan a partir del escenario seleccionado y se deshabilitan si no se alcanzan. La curva compara la producción acumulada hasta el instante visitado, sin dibujar resultados futuros.

Validación: `node check-industrial.js` comprueba conservación de materiales y robots, turnos, demoras, capacidades, inventarios y comparación de estrategias. `python check-site.py` comprueba referencias locales y sintaxis. El modelo de cinco etapas descrito a continuación es el prototipo anterior.

Demo isométrica e interactiva, en español, para explorar una red industrial que reinvierte robots en sus propios proveedores. Es un escenario didáctico condicionado a que los robots ya dominen las tareas asignadas. No es una predicción ni una simulación calibrada de Tesla.

## Modelo

Cinco etapas: materiales, procesamiento, componentes, logística, montaje y pruebas. Los lotes avanzan una etapa por ciclo como máximo, con inventarios intermedios explícitos. Cada lote representa los insumos equivalentes a un robot; se omiten mermas y rechazos.

La producción de cada etapa depende de sus trabajadores, maquinaria y material disponible. Los robots nuevos se destinan a otros usos o se reinvierten (70 %). La estrategia de red reparte los refuerzos según la menor capacidad futura, considerando incorporaciones pendientes; es una heurística, no un optimizador. La alternativa manda todos los refuerzos al montaje.

Los refuerzos tardan dos ciclos en incorporarse. Las ampliaciones ocupan a dos robots de la planta durante tres ciclos y dependen de módulos de maquinaria externos. Hay como máximo dos obras simultáneas, ocho módulos por instalación y entrada de recursos para 32 lotes por ciclo. El suministro de módulos externos, financiación, técnicos, energía y terreno se suponen disponibles dentro de estos límites. Estos recursos no se producen autónomamente dentro del modelo.

La referencia conceptual a Tesla procede de su documentación de fabricación: [Q2 2026 Update](https://ir.tesla.com/_flysystem/s3/sec/000162828026049213/tsla-20260722-gen.pdf). La distribución automática de robots por toda la cadena y todas las cifras de esta demo son supuestos propios.

## Archivos

- `network-model.js`: simulador puro, independiente de la presentación.
- `demo.template.html`: controles, escena isométrica y animaciones; incluye un marcador para insertar el modelo.
- `build-demo.py`: genera el fragmento autocontenido en la carpeta de visualizaciones de esta conversación.
- `check-model.js`: comprueba conservación de robots y lotes, demoras, límites de producción y las estrategias comparadas.

Ejecutar `node check-model.js` y después `python build-demo.py`.

## Patrón para futuras explicaciones

1. Definir el mecanismo y los supuestos antes de animar.
2. Mantener el modelo separado de su representación.
3. Mostrar una comparación que aísle la decisión relevante.
4. Hacer visibles las demoras y los límites.
5. Permitir explorar el tiempo sin asignarle fechas inventadas.
6. Verificar las cantidades y probar la visualización en pantalla estrecha.


## Revisión de realismo y lecciones cuantitativas (16 septiembre 2026)

- `/growth/index.html` y `/es/growth/index.html`: comparación con turno humano simple o múltiple, robots fijos y reinversión. Los bienes genéricos consumen una hora equivalente por unidad; fabricar un robot consume trabajo configurado y tiene dos días completos de incorporación. Las instalaciones están disponibles desde el comienzo; el límite de materiales usa unidades equivalentes, no una lista de materiales real. No representa una cadena autónoma demostrada.
- Los costes son un experimento independiente de capacidad plenamente utilizada. Incluyen material, trabajo humano o amortización del robot instalado, servicio, supervisión y electricidad. No son precios observados ni un coste fabril total; no financian el modelo de crecimiento.
- `/home/`: plano esquemático con tiempo humano neto; solo aspirado/fregado se etiqueta como capacidad de robots especializados actuales. Las otras tareas son hipótesis de delegación futura, sin fechas.
- Terafab: el render oficial y el expediente JETI sustentan el exterior y las familias previstas, no el plano interior ni cantidades de equipos. La maqueta interior es representativa. El transporte FOUP ya no se presenta como una oblea procesándose. La nueva sección permite inspeccionar transferencia de patrón con resina positiva, seguida de etapas resumidas hasta encapsulado y prueba, sin afirmar una receta de Terafab.
- Fuentes técnicas: ASML Annual Report 2021 (separación entre exposición, revelado y grabado), Lam Research (deposición, grabado, limpieza), Applied Materials (CMP), Intel (encapsulado), Universal Robots (elementos de coste), iRobot (limpieza especializada). Fuentes enlazadas en cada explicación.
- Los escenarios 3D anteriores mantienen cifras didácticas distintas: fábrica con ritmo robótico 1,4× y distrito con ritmo igual. No son mediciones de humanoides. Se integraron las mejoras de primera reincorporación, cadenas proveedoras y comparación de producción procedentes de `codex/robot-learning`.
- Validación adicional: `node check-explanations.mjs` verifica conservación del trabajo, flota fabricada/pendiente, turnos equivalentes, sensibilidad de costes, cambios de material en la oblea y tiempo doméstico neto.


## Cabeceras sincronizadas con las simulaciones (17 septiembre 2026)

Las cuatro escenas 3D incluyen una cabecera con tres gráficas y controles de reproducción/reinicio conectados a su reloj. La portada vuelve a entrar en la fábrica; la calculadora independiente permanece accesible como complemento.

- Fábrica/distrito: producción acumulada y robots asignados, comparados con su referencia humana. El índice parcial de coste suma horas humanas remuneradas y horas de robots asignados (también paradas), ponderadas por un supuesto editable, y divide por la producción acumulada real del escenario. Materiales y costes adicionales de instalaciones quedan fuera.
- Ciudad: cobertura de las mismas 600 tareas, flota industrial e índice de coste de tareas según la fracción robótica editable. No se inventa una referencia humana de producción industrial.
- Región: producción y flota de los escenarios con/sin ampliación; coste fijo parcial por unidad, suponiendo igual carga por instalación y ciclo. Excluye inversión de construcción y costes variables. No se impone una bajada del índice.
- Los gráficos solo muestran datos hasta el instante visible; las escalas verticales indican su máximo. Reinicio, saltos de tiempo y cambios de estrategia actualizan también la cabecera.
- `node check-live-metrics.mjs`: igualdad del coste de referencia, cobro del tiempo robot en espera, ausencia de división por cero, costes crecientes, contabilidad horaria del distrito y correspondencia con sus unidades producidas.
