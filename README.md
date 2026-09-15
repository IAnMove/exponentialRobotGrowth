# Robots que refuerzan su cadena de fabricación

## Región industrial

`region.html` añade el tercer nivel, accesible desde distrito y fábrica. Empieza con 24 robots y seis instalaciones; no importa el estado de las otras escenas. El control de inversión limita la fracción de la flota destinada a construir y reserva esa misma fracción de material recién refinado para próximas obras. La producción, las obras y los inventarios conservan material; el dinero no se modela.

Hay seis tipos de industria, seis parcelas por tipo y hasta tres proyectos simultáneos. Cada proyecto consume 48 lotes y necesita 24 unidades de trabajo, con hasta cuatro robots. La electricidad limita producción y construcción; la logística limita flujos industriales. La referencia también incorpora los robots fabricados, pero mantiene sus seis instalaciones originales. Los ciclos no son días ni años. Los robots se dibujan individualmente hasta que hace falta agruparlos para mantener legible el mapa; la equivalencia se indica en pantalla.

El modelo está en `site-src/region-model.js`; `node check-region.mjs` comprueba conservación, existencias, demoras, límites, construcción manual, coste inicial de la inversión y mayor capacidad posterior. Las narraciones adicionales están en `narration/region.es.json` y `narration/region.en.json` y se generan con el mismo comando de narración. `check-site.py` valida las seis rutas y `check-localization.mjs` también compara ambos modelos regionales.

## Inglés, español y GitHub Pages

Web pública: https://ianmove.github.io/exponentialRobotGrowth/ · Repositorio público: https://github.com/IAnMove/exponentialRobotGrowth

El inglés es el idioma inicial en `/`; el español está en `/es/`. EN/ES cambia interfaz y narración conservando la escena (distrito o fábrica). Hay 28 grabaciones por idioma, con texto y controles de reproducción. El cambio de idioma recarga la escena desde el inicio.

Editar HTML/CSS/JS en `site-src/`, traducciones en `site-src/en.tsv`, y los modelos industriales clásicos en los archivos de la raíz. `python tools/build_site.py` genera las cuatro rutas con referencias relativas, compatibles con el subdirectorio de GitHub Pages. `python build-site.py` también actualiza el proveedor Three.js desde las dependencias instaladas. No editar las traducciones directamente en `dist/`.

Guiones: `narration/places.json` y `narration/places.en.json`. Generar únicamente clips nuevos mediante `python tools/build_narration.py --language es` o `--language en`. Los audios existentes se reutilizan. No hace falta generar voces para compilar o servir la web.

Validación: `python check-site.py`, `node check-localization.mjs`, `node check-narrator.mjs`, `node check-industrial.js` y `node check-factory.mjs`. La prueba de localización confirma que los resultados numéricos de ambos idiomas coinciden.

El checkout público de publicación está en `C:/Users/ina/.codex/artifacts/robot-lab-pages`. Su remoto `origin` apunta a `IAnMove/exponentialRobotGrowth`; `previous-site` conserva el destino anterior `IAnMove/robot-lab`. `python tools/package_pages.py --output C:/Users/ina/.codex/artifacts/robot-lab-pages` copia únicamente los recursos públicos de `dist/` (sin `.env`, metadatos de generación ni configuración de Sites). Publicar sus cambios en `main` actualiza GitHub Pages. Las credenciales MiniMax siguen fuera de ambos repositorios y no son necesarias para reproducir la web.

## Escena de la fábrica de móviles

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
