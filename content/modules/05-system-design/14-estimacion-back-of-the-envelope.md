---
title: Estimaciones back-of-the-envelope
kind: lesson
hours: 2
sources: System Design Interview (Alex Xu), cap. 2 "Back-of-the-envelope estimation" (pp. 34–41) | System Design Primer, "Appendix": "Powers of two table" y "Latency numbers every programmer should know" | karanpratapsingh/system-design, cap. V "System Design Interviews", sección "Estimation and Constraints"
links: Primer — Powers of two table | https://github.com/donnemartin/system-design-primer#powers-of-two-table ; Primer — Latency numbers every programmer should know | https://github.com/donnemartin/system-design-primer#latency-numbers-every-programmer-should-know ; Primer — Back-of-the-envelope calculations | https://github.com/donnemartin/system-design-primer#back-of-the-envelope-calculations ; Karan — System Design Interviews | https://github.com/karanpratapsingh/system-design#system-design-interviews
---

## Objetivo

Estimar en pocos minutos y con números redondos la carga (QPS y pico), el almacenamiento, el ancho de banda, la memoria de cache y el número de servidores de un sistema, usando potencias de dos, números de latencia y de disponibilidad, para que cada decisión de diseño se apoye en órdenes de magnitud.

## Estudio

### Para qué sirve estimar

Una estimación back-of-the-envelope (literalmente, "en el reverso de un sobre") es un cálculo rápido que combina supuestos razonables con números de referencia para saber **qué orden de magnitud** tiene el problema. No buscas exactitud: buscas saber si necesitas 1 servidor o 1.000, si los datos caben en memoria o necesitan sharding, si un enlace de red alcanza o no.

Las estimaciones deciden diseños. "100 escrituras por segundo" y "100.000 escrituras por segundo" llevan a arquitecturas completamente distintas. Si no estimas, terminas sobrediseñando (sharding para 50 GB) o subdiseñando (una sola base para 50 TB que crecen 1 TB por semana).

En una entrevista importa más el **proceso** que el resultado: escribir supuestos, redondear con criterio, etiquetar unidades y sacar conclusiones de diseño de los números.

### Herramienta 1: potencias de dos y unidades

| Potencia | Valor aproximado | Nombre | Unidad |
| --- | --- | --- | --- |
| 2¹⁰ | mil (10³) | Kilo | 1 KB |
| 2²⁰ | millón (10⁶) | Mega | 1 MB |
| 2³⁰ | mil millones (10⁹) | Giga | 1 GB |
| 2⁴⁰ | billón (10¹²) | Tera | 1 TB |
| 2⁵⁰ | mil billones (10¹⁵) | Peta | 1 PB |

Un carácter ASCII ocupa 1 byte; un carácter UTF-8 en español, 1–2 bytes. Un `int64` o un timestamp, 8 bytes. Un UUID, 16 bytes en binario (36 como texto). Para estimar, trata 2¹⁰ como 1.000: el error del 2,4 % no cambia ninguna decisión.

Otro dato útil: 2³² ≈ 4.300 millones (el límite de un entero sin signo de 32 bits, y de IPv4) y 2⁶⁴ ≈ 1,8 × 10¹⁹ (prácticamente inagotable para IDs).

### Herramienta 2: números de latencia

Estos valores (de una tabla clásica, con números aproximados de hardware relativamente reciente) dan las proporciones que importan:

| Operación | Tiempo aproximado |
| --- | --- |
| Referencia a cache L1 | 0,5 ns |
| Referencia a memoria principal | 100 ns |
| Comprimir 1 KB con un algoritmo rápido | 10 µs |
| Enviar 1 KB por una red de 1 Gbps | 10 µs |
| Leer 4 KB al azar de un SSD | 150 µs |
| Leer 1 MB secuencial de memoria | 250 µs |
| Ida y vuelta dentro del mismo datacenter | 500 µs |
| Leer 1 MB secuencial de SSD | 1 ms |
| Seek de disco duro (HDD) | 10 ms |
| Leer 1 MB secuencial por red de 1 Gbps | 10 ms |
| Leer 1 MB secuencial de HDD | 30 ms |
| Paquete California → Países Bajos → California | 150 ms |

Conclusiones que debes recordar, más que los números exactos:

- **La memoria es rápida; el disco es lento**: memoria ~100 ns, SSD aleatorio ~100 µs (mil veces más), HDD ~10 ms (cien mil veces más).
- **Evita los seeks**: lee secuencialmente siempre que puedas.
- **La compresión es barata** comparada con la red: comprime antes de enviar por internet.
- **Cruzar continentes cuesta ~150 ms** por ida y vuelta: solo puedes hacer unas 6–7 idas y vueltas intercontinentales por segundo de forma secuencial, frente a unas 2.000 dentro de un datacenter.
- Ritmos de lectura secuencial aproximados: HDD 30 MB/s (los modernos, más), red de 1 Gbps ~100 MB/s, SSD ~1 GB/s, memoria ~4 GB/s o más.

### Herramienta 3: números de disponibilidad

Ya los calculaste en la sesión 02: 99 % ≈ 3,65 días de caída al año; 99,9 % ≈ 8,8 h; 99,99 % ≈ 53 min; 99,999 % ≈ 5 min.

### Herramienta 4: conversiones de tiempo

Un día tiene 86.400 segundos. Para estimar, usa **10⁵ segundos/día** (100.000). Con eso:

| Eventos por día | Por segundo (promedio) |
| --- | --- |
| 1 millón | ≈ 10–12 |
| 10 millones | ≈ 100–120 |
| 100 millones | ≈ 1.000–1.200 |
| 1.000 millones | ≈ 10.000–12.000 |

Y un año tiene ~3 × 10⁷ segundos (365 × 86.400 ≈ 31,5 M); un mes, ~2,5 × 10⁶.

### El método en cinco pasos

1. **Escribe los supuestos** con números: usuarios activos, acciones por usuario, tamaño de cada objeto, ratio lectura/escritura, retención.
2. **Calcula el tráfico**: QPS promedio = acciones por día / 10⁵. **Pico** = 2–3× el promedio (o más si hay eventos especiales).
3. **Calcula el almacenamiento**: objetos por día × tamaño × días de retención × factor de replicación.
4. **Calcula el ancho de banda**: QPS × tamaño de la respuesta (para lectura) o de la petición (para escritura).
5. **Calcula memoria y servidores**: cache del 20 % más caliente; servidores = QPS pico / capacidad por servidor.

Y siempre un sexto paso: **saca una conclusión de diseño** de cada número.

### Ejemplo 1: un servicio tipo Twitter

Supuestos (no son números reales de la empresa):

- 300 M de usuarios activos mensuales; 50 % los usa cada día → **150 M DAU**.
- Cada usuario publica 2 posts por día en promedio.
- 10 % de los posts lleva una imagen o video, de 1 MB en promedio.
- Los datos se conservan 5 años.

Tráfico de escritura:

```
 posts/día   = 150 M × 2 = 300 M
 QPS promedio = 300 M / 10^5 s ≈ 3.000  (cálculo exacto con 86.400 s: ~3.500)
 QPS pico     ≈ 2 × promedio ≈ 7.000
```

Almacenamiento de media:

```
 media/día = 300 M × 10 % × 1 MB = 30 M MB = 30 TB/día
 5 años    = 30 TB × 365 × 5 ≈ 55 PB  (sin replicación)
```

Texto: si cada post tiene ID (8 B), texto (~140–280 B) y metadatos (~100 B), unos 500 B por post: 300 M × 500 B = 150 GB/día ≈ 270 TB en 5 años. Comparado con los 55 PB de media, el texto es casi irrelevante.

**Conclusiones de diseño**: la media domina todo → object storage + CDN, nunca la base de datos; el texto y los metadatos caben en una base particionada con unos pocos TB por año; 7.000 escrituras/s de posts es manejable con una base particionada, pero las **lecturas** (timelines) serán decenas o cientos de veces más, así que el diseño de lectura (cache, fan-out) es el problema principal (sesión 22).

### Ejemplo 2: ancho de banda de un servicio de video

Supuestos: 5 M de usuarios diarios ven 5 videos al día; cada video dura en promedio 5 minutos a 3 Mbps (calidad media).

```
 visualizaciones/día = 25 M
 datos por video     = 5 min × 60 s × 3 Mbps = 900 Mb ≈ 112 MB
 egreso diario       = 25 M × 112 MB ≈ 2,8 PB/día
 ancho de banda prom = 2,8 PB / 10^5 s ≈ 28 GB/s ≈ 224 Gbps  (pico: ~2-3x)
```

**Conclusión**: ningún datacenter propio sirve esto de forma razonable; la CDN es obligatoria y el costo de transferencia es el costo dominante del sistema. Si un GB servido por CDN cuesta, digamos, 0,02 USD, son ~56.000 USD por día: una buena razón para optimizar la codificación y servir videos populares desde caches baratas.

### Ejemplo 3: memoria para una cache

Un servicio con 100 M de objetos de 1 KB cada uno, donde el 20 % de los objetos concentra el 80 % de los accesos.

```
 total     = 100 M × 1 KB = 100 GB
 cache 20% = 20 GB  (+ ~30-50 % por overhead) ≈ 30 GB
```

**Conclusión**: cabe en 2–3 nodos de cache medianos con réplicas. Si los objetos fueran de 100 KB, serían 3 TB de cache: ya hablaríamos de decenas de nodos y quizá de cachear solo parte del objeto.

### Ejemplo 4: número de servidores

Una API recibe 50.000 QPS en el pico. Cada petición consume unos 10 ms de CPU. Un servidor con 16 núcleos puede, en teoría, procesar 16 × (1.000 ms / 10 ms) = 1.600 QPS. Operándolo al 60–70 % por la curva de saturación (sesión 02): ~1.000 QPS útiles por servidor.

```
 servidores = 50.000 / 1.000 = 50   (+ redundancia N+2 o por zona: ~60–75)
```

**Conclusión**: decenas de servidores stateless detrás de un balanceador; nada exótico. Si cada petición consumiera 200 ms de CPU (por ejemplo, generar una imagen), serían 1.000 servidores: tendría sentido cachear resultados o mover el trabajo a workers asíncronos.

### Ejemplo 5: ¿cabe en una máquina?

Muchas veces la pregunta más útil es si algo cabe en un solo nodo:

- Una tabla de 50 M de usuarios con 1 KB por fila = 50 GB: **cabe** en una base de un solo líder, incluso en memoria de una máquina grande.
- Un índice de 10.000 millones de URLs con 100 B por entrada = 1 TB: cabe en disco de una máquina, pero no en memoria; probablemente quieras particionar para el throughput.
- 5 años de mensajes de chat a 200 GB/día ≈ 365 TB: **no cabe**; sharding o un wide-column store desde el primer día.

### Ejemplo 6: una estimación completa comentada

Una app para compartir fotos. Supuestos que escribes en la pizarra:

- 50 M DAU; cada usuario sube 0,2 fotos al día y abre el feed 10 veces, viendo 20 fotos cada vez.
- Foto original de 2 MB; además se generan 3 versiones redimensionadas que suman 0,5 MB.
- Metadatos por foto: 1 KB. Retención: indefinida; calcula 5 años. Pico: 3× el promedio.

Escrituras:

```
 fotos/día = 50 M × 0,2 = 10 M  → 10 M / 10^5 ≈ 100 subidas/s (pico ≈ 300/s)
 ingreso   = 100/s × 2 MB = 200 MB/s promedio (pico ≈ 600 MB/s ≈ 4,8 Gbps)
```

Lecturas:

```
 fotos vistas/día = 50 M × 10 × 20 = 10.000 M → 100.000 fotos/s (pico ≈ 300.000/s)
 tamaño servido   ≈ 150 KB (versión de feed, no el original)
 egreso           = 100.000 × 150 KB = 15 GB/s ≈ 120 Gbps (pico ≈ 360 Gbps)
 lecturas de feed = 50 M × 10 / 10^5 = 5.000 peticiones de feed/s (pico 15.000)
```

Almacenamiento:

```
 por día   = 10 M × 2,5 MB = 25 TB/día   → 5 años ≈ 45 PB (+ durabilidad del object storage)
 metadatos = 10 M × 1 KB = 10 GB/día      → 5 años ≈ 18 TB (×3 réplicas ≈ 55 TB)
```

Conclusiones:

1. El ratio de lectura a escritura de fotos es 1.000:1 → la CDN es el componente más importante del sistema; el origen debe atender solo misses.
2. 45 PB de imágenes → object storage con niveles: las fotos de más de un año casi no se ven, así que pasan a un nivel frío más barato.
3. Los metadatos (≈ 55 TB con réplicas en 5 años) no caben cómodamente en un solo líder → base particionada por `user_id` o un wide-column store.
4. 15.000 peticiones de feed/s en el pico → los feeds se precalculan y se cachean (sesión 22).
5. El redimensionado de 300 fotos/s en el pico va a una cola con workers, no en la petición de subida.

Con solo diez minutos de cuentas ya tienes el esqueleto del diseño.

### Estimar el costo

En el trabajo real, la pregunta "¿cuánto cuesta?" decide tanto como "¿escala?". No necesitas precios exactos, pero sí saber qué domina. Con precios de referencia del orden de: almacenamiento de objetos ~0,02 USD por GB al mes, transferencia por CDN ~0,01–0,05 USD por GB, y una instancia mediana de cómputo ~100–300 USD al mes:

- Los 45 PB del ejemplo anterior, a 0,02 USD/GB/mes, cuestan unos 900.000 USD **al mes** al final del quinto año: el tiering a almacenamiento frío (varias veces más barato) es una decisión de negocio, no un detalle.
- Los 15 GB/s de egreso suman ~1,3 PB por día; incluso a 0,01 USD/GB son ~13.000 USD por día.
- Los servidores de API (unas decenas) cuestan una fracción pequeña de lo anterior.

Este tipo de cálculo cambia prioridades: en sistemas de medios, optimizar la compresión y el almacenamiento ahorra más que optimizar el código.

### Ley de Little para estimar conexiones

La ley de Little (sesión 02) también estima recursos concurrentes: si una API atiende 20.000 peticiones/s y cada una mantiene una conexión a la base durante 5 ms, necesitas en promedio 20.000 × 0,005 = **100 conexiones** activas a la base; con margen para picos y variaciones, un pool total de 200–300 conexiones repartidas entre todos los servidores. Si cada consulta tardara 50 ms, necesitarías 1.000 conexiones activas, más de lo que muchas bases relacionales manejan bien: otra razón para optimizar consultas o usar un pooler.

### Consejos de método

- **Redondea sin culpa**: `99.987 / 9,1` es `100.000 / 10 = 10.000`. Nadie espera precisión.
- **Escribe los supuestos** y vuelve a ellos: si el entrevistador o un colega cambia uno, recalculas en segundos.
- **Etiqueta las unidades**: "5" no dice nada; "5 MB/s" sí. La mayoría de los errores grandes son confusiones entre bits y bytes (1 byte = 8 bits; los enlaces de red se miden en bits por segundo) o entre KB y MB.
- **Haz verificaciones de cordura**: si tu resultado dice que un usuario genera 1 TB por día, algo está mal.
- **Calcula solo lo que cambia una decisión**: no necesitas el almacenamiento de las sesiones si es despreciable frente al resto.
- **Factores a no olvidar**: replicación (×3), índices y metadatos (+10–30 %), picos (×2–10 según el producto), crecimiento anual.

### Estimar el pico con más cuidado

El factor "2–3× el promedio" es un punto de partida, no una ley. El pico real depende del producto:

- **Productos de uso diario con husos horarios repartidos** (una red social global): el tráfico se reparte durante el día; 2× suele bastar.
- **Productos de un solo país**: casi todo el tráfico ocurre en 12–14 horas; el pico puede ser 3–4× el promedio diario calculado sobre 24 horas.
- **Eventos**: una final de fútbol, un Black Friday o el lanzamiento de entradas de un concierto pueden traer 10–100× la carga normal durante minutos. Estos sistemas se diseñan para el evento (con colas virtuales de espera, precalentamiento y capacidad reservada), no para el día normal.
- **Tráfico sincronizado por máquinas**: trabajos programados "a la hora en punto" o apps que refrescan todas a la vez tras una notificación masiva generan picos muy agudos. Agregar jitter a los horarios de los clientes los suaviza.

Pregunta siempre si existe un evento extremo previsible; si existe, estima ese pico por separado.

### Errores comunes

1. Confundir usuarios registrados, mensuales y diarios. El tráfico lo generan los **activos**.
2. Olvidar el pico: diseñar para el promedio y caer cada noche a las 21 h.
3. Olvidar la replicación al calcular almacenamiento.
4. Calcular el almacenamiento del primer día y no el de la retención completa.
5. Ignorar el ratio lectura/escritura: un sistema 100:1 necesita un diseño de lectura muy distinto a uno 1:1.

### Plantilla para tus design docs

```
 Supuestos: DAU, acciones/usuario/día, tamaño medio, ratio R:W, retención, pico = x veces
 Tráfico:   escrituras/s (prom, pico) · lecturas/s (prom, pico)
 Datos:     por día · por año · total con replicación
 Red:       ingreso y egreso (prom, pico)
 Memoria:   cache del working set caliente
 Cómputo:   servidores por capa (pico / capacidad útil, + redundancia)
 Conclusiones: 3–5 decisiones que se derivan de los números
```

## Conceptos clave

- **Back-of-the-envelope**: estimación rápida de órdenes de magnitud con supuestos y números de referencia.
- **DAU / MAU**: usuarios activos diarios / mensuales; el tráfico se calcula con los activos.
- **QPS**: consultas o peticiones por segundo.
- **Pico**: carga máxima esperada, típicamente 2–3 veces el promedio o más.
- **10⁵ segundos por día**: redondeo práctico de 86.400 s.
- **Factor de replicación**: multiplicador del almacenamiento por las copias (habitualmente 3).
- **Working set**: subconjunto de datos que concentra la mayoría de los accesos.
- **Bits vs bytes**: los enlaces se miden en bits por segundo; el almacenamiento en bytes.
- **Capacidad útil**: capacidad teórica de un servidor reducida al 60–70 % para mantener latencia aceptable.

## Preguntas de repaso

1. Un servicio tiene 20 M DAU y cada usuario hace 50 lecturas y 5 escrituras al día. Estima QPS promedio y pico de lectura y de escritura.
   R: Lecturas: 20 M × 50 = 1.000 M/día; entre 10⁵ s ≈ 10.000 QPS promedio, ≈ 20.000–30.000 en el pico. Escrituras: 20 M × 5 = 100 M/día ≈ 1.000 QPS promedio, ≈ 2.000–3.000 en el pico. El ratio es 10:1, así que el diseño de lectura (cache, réplicas) es prioritario.
2. ¿Cuánto almacenamiento necesitan 10 M de fotos nuevas por día de 500 KB cada una durante 3 años con replicación 3?
   R: Por día: 10 M × 500 KB = 5 TB. En 3 años: 5 TB × 365 × 3 ≈ 5,5 PB. Con replicación 3: ≈ 16,5 PB. Conclusión: object storage (que ya gestiona la durabilidad, a menudo con codificación de borrado más barata que la replicación ×3) y CDN.
3. ¿Por qué no se debe estimar con usuarios registrados?
   R: Porque muchos usuarios registrados no usan el producto a diario; el tráfico lo generan los activos. Usar registrados sobreestima la carga por un factor que puede ser 5 o 10, lo que lleva a sobredimensionar y a decisiones de diseño innecesariamente complejas.
4. Un enlace de 10 Gbps, ¿cuántos MB por segundo transfiere aproximadamente y cuánto tarda en copiar 1 TB?
   R: 10 Gbps son 10 / 8 = 1,25 GB/s, unos 1.250 MB/s en teoría (algo menos en la práctica). 1 TB / 1,25 GB/s ≈ 800 s, unos 13–15 minutos. Útil para estimar cuánto dura un rebalanceo o una restauración.
5. ¿Qué conclusiones de diseño sacas si un servicio necesita 2 PB de almacenamiento y 300.000 lecturas/s de objetos de 50 KB?
   R: Los 2 PB no caben en una base convencional: object storage o un almacén distribuido. Las 300.000 lecturas/s de 50 KB suman unos 15 GB/s (120 Gbps) de egreso: hace falta CDN o una capa de cache distribuida muy amplia, y probablemente el costo de transferencia sea un factor central.

## Ejercicio

Escribe en TypeScript una pequeña librería `estimate` con funciones `qps(perDay, peakFactor)`, `storage(perDay, sizeBytes, days, replication)`, `bandwidth(qps, sizeBytes)` y `servers(peakQps, perServerQps, utilization, redundancy)` que devuelvan valores con unidades legibles (`"3.5 K/s"`, `"55 PB"`, `"224 Gbps"`). Úsala para estimar un servicio de mensajería con 500 M DAU, 40 mensajes por usuario al día de 100 bytes, retención de 2 años, ratio 1:1 y pico 3×. Terminado cuando tengas pruebas para cada función, la estimación completa con la plantilla de la sesión y tres conclusiones de diseño escritas.

## Explícalo con tus palabras

Explica por qué un ingeniero calcula "a ojo" cuántos servidores necesita antes de diseñar, comparándolo con calcular cuánta comida comprar para una fiesta según el número de invitados.
