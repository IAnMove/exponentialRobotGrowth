# Robots que refuerzan su cadena de fabricación

## Escena de la fábrica de móviles

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
