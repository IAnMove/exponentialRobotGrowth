# Qué encontré y qué corregí

Revisé las dos presentaciones cuantitativas del Atlas — **Crecimiento** (`/growth/`) y **Hogar** (`/home/`) — y, de paso, Terafab, porque comparte el mismo tipo de explicación. Después añadí el notebook 03: la esfera de Dyson en Three.js.

## Crecimiento (`site-src/growth/`)

### Errores conceptuales
1. **Las plazas de robot limitaban las horas humanas.** El tope era `min(plazas × 24 h, suministro)` y se aplicaba también a los turnos humanos. Las plazas son aparcamientos/instalaciones de robots, no un techo de la jornada humana. Con el rango de la interfaz casi no se notaba (a 10 plazas y 3 turnos ambos dan 240 h), pero la fórmula era incorrecta.
2. **El tope `plazas × 24` era redundante para los robots.** Si la flota no puede superar las plazas y cada robot trabaja como máximo 24 h, `plazas × 24` nunca aprieta más que `flota × horas`. Mezclaba dos límites distintos.
3. **Los bienes acumulados no incluían el día visible.** El gráfico diario mostraba la producción de ese día; el acumulado mostraba solo los días anteriores. En el día 90 faltaba un día entero de producción. El veredicto, además, hablaba siempre de bienes disponibles aunque el gráfico enseñara capacidad.

### Correcciones
- El suministro limita las horas equivalentes de todos los escenarios. Las plazas solo limitan cuántos robots pueden existir (y, si se piden menos plazas que los 10 iniciales, la flota de partida se recorta).
- Cada fila guarda `goodsToDate`, `humanToDate` y `fixedToDate` (incluye el día visible).
- El veredicto usa la misma magnitud que el gráfico: capacidad, bienes del día o acumulado.
- El texto de supuestos deja de decir que las plazas recortan turnos humanos.

## Hogar (`site-src/home/`)

### Errores conceptuales / de datos
1. **La tarjeta del Atlas prometía «Cuidado».** El modelo dice explícitamente que no representa cuidados personales. Los siete quehaceres son: aspirar, platos, comida, ropa, cama, baño y agenda. «Cuidado» era un paso inventado.
2. **El desenlace con supervisión escribía «29 minutos» a mano.** Coincide con el 20 % de 145 min, pero se desincronizaba si cambiaba la lista o el porcentaje.
3. **El contador «con IA» solo se encendía al terminar las 7 tareas**, porque asumía que la IA es siempre la última. Ahora cuenta las tareas delegadas con `actor === 'ai'`.

### Correcciones
- Pasos del Atlas: Cocina · Limpieza · Ropa · Agenda (Kitchen · Cleaning · Laundry · Planning).
- El texto de cierre usa `v.remaining` del modelo.
- El recuento de máquinas / IA recorre las tareas ya delegadas.

Los 145 minutos siguen siendo ejemplos de trabajo humano activo, no una jornada doméstica completa. Eso ya estaba bien declarado.

## Terafab (arreglos menores al revisar)

1. **El menú «Robots» apuntaba a `/growth/`**, la calculadora 2D, no a las cuatro escalas 3D. Ahora va a `/robots/`.
2. **«Oblea preparada» saltaba a metrología.** La oblea llega ya cortada y pulida; el lingote no se funde en el fab. El paso 1 lleva a logística y lo explica.

El proceso de resina positiva (exponer → revelar → grabar → retirar resina) y el orden prueba en oblea → dicing → encapsulado → prueba final estaban bien.

## Notebook 03 · Esfera de Dyson

Nueva sección en `site-src/dyson/`, rutas `/dyson/` y `/es/dyson/`. En el Atlas es el **03**; el Hogar pasa a **04**.

Idea que enseña: Dyson (1960) no propuso una bola rígida. Propóso un **enjambre** de colectores. La cáscara de ciencia ficción es inestable; el calor tiene que salir en infrarrojo; la materia de un planeta da una capa delgada, no una muralla.

### Física del modelo (no de la malla 3D)
| Magnitud | Valor usado | Por qué |
|---|---|---|
| Luminosidad solar | 3,828×10²⁶ W | Valor nominal IAU |
| 1 ua | 1,495978707×10¹¹ m | IAU |
| Constante solar a 1 ua | ≈ 1361 W/m² | Consecuencia de las dos anteriores |
| Temperatura del enjambre | (F / 2σ)¼ ≈ 331 K a 1 ua | Placa de dos caras, absorbedor perfecto |
| Temperatura de cáscara cerrada | (F / σ)¼ ≈ 394 K a 1 ua | Solo radia al espacio por fuera; solo al 100 % |
| Masa de Júpiter | 1,898×10²⁷ kg | Orden de magnitud de Dyson |
| Densidad para el espesor | 3000 kg/m³ | Roca/metal declarado, no un material «oficial» |
| Consumo mundial 2025 | 600 EJ ≈ 19 TW | Energy Institute, Statistical Review 2026 |
| Tipo II de Kardashev (1964) | 4×10²⁶ W | Cifra original, no el Tipo I popular de ~10¹⁶ W |

Conservación: interceptado + luz que sigue escapando = luminosidad de la estrella. La temperatura del enjambre **no** sube al añadir más placas (mismo flujo, mismas dos caras). T ∝ R⁻½. El 3D agranda Sol y Tierra a propósito; el texto lo dice.

No es un plan de construcción ni una búsqueda SETI. Dyson 1960: *Search for Artificial Stellar Sources of Infrared Radiation*, *Science*.

## Qué no toqué a propósito
- Cifras didácticas de robots (21 h, 240 h por robot nuevo, 70 % de reinversión): ya están etiquetadas como supuestos.
- Costes en euros del experimento aparte: no son precios de Optimus.
- Tiempos del hogar (25 min aspirar, etc.): ejemplos, no mediciones.
- Interior de Terafab: sigue siendo interpretativo.

## Segunda pasada (18 septiembre 2026)

- El enjambre 3D ya no es una reja esférica (eso se confundía con la cáscara). Ahora son **12 anillos orbitales**; la cobertura añade anillos. La cáscara crece como un casquete, etiquetada como el dibujo imposible.
- Tierra en 1 ua y Júpiter más lejos (reserva de materia). Sol con corona; calor residual más visible. Temperaturas de enjambre y cáscara se ven a la vez.
- El hogar mira hacia la habitación de la tarea seleccionada, no solo al centro de la casa.
- Crecimiento: el «ahorro» es euros y porcentaje; si el robot sale más caro, lo dice. El freno distingue suministro y plazas. Enlaces a hogar y Dyson.
- El Atlas enlaza el modelo 2D de producción, que antes solo se alcanzaba desde las escenas de robots.

## Cómo comprobarlo
```
python build-site.py
node check-explanations.mjs
node check-dyson.mjs
python check-site.py
```
