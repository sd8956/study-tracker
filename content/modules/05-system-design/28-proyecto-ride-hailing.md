---
title: Proyecto — diseña una plataforma de viajes tipo Uber en 3 horas
kind: project
hours: 3
sources: karanpratapsingh/system-design, cap. V "Uber" y cap. IV "Geohashing and Quadtrees" | System Design Interview (Alex Xu), cap. 12 (conexiones persistentes y presencia, pp. 180–199) y cap. 10 (notificaciones, pp. 151–165) como piezas reutilizadas | System Design Primer, "Consistency patterns"
links: Karan — Uber | https://github.com/karanpratapsingh/system-design#uber ; Karan — Geohashing and Quadtrees | https://github.com/karanpratapsingh/system-design#geohashing-and-quadtrees ; Karan — Distributed Transactions | https://github.com/karanpratapsingh/system-design#distributed-transactions ; Primer — Consistency patterns | https://github.com/donnemartin/system-design-primer#consistency-patterns
---

## Objetivo

Diseñar de punta a punta una plataforma de transporte que conecte pasajeros con conductores cercanos: seguimiento de ubicación en vivo a gran escala, emparejamiento sin condiciones de carrera, ETA y precios dinámicos, ciclo de vida del viaje, pagos y notificaciones; entregar un design doc y un prototipo del índice de conductores y del emparejamiento en TypeScript.

## Estudio

### Requisitos de referencia (Karan)

**Pasajeros**: ver los vehículos cercanos con ETA y precio; pedir un viaje a un destino; ver la ubicación del conductor. **Conductores**: aceptar o rechazar viajes; ver el punto de recogida tras aceptar; marcar el viaje como terminado. **No funcionales**: alta confiabilidad, alta disponibilidad con latencia mínima, escalabilidad. **Extendidos**: calificar el viaje, procesar pagos, métricas y analítica.

### Estimaciones de referencia (Karan)

```
 100 M DAU, 1 M de conductores, 10 M de viajes/día
 10 acciones por usuario/día → 1.000 M peticiones/día ≈ 12.000/s
 400 B por mensaje → 400 GB/día → ~1,4 PB en 10 años; ~5 MB/s de ingreso
```

Falta una estimación clave que el escenario de este proyecto te pedirá: las **actualizaciones de ubicación**. Con 1 M de conductores activos enviando su posición cada 4 s: 250.000 escrituras/s, casi todas efímeras. Esa cifra, y no las 12.000 peticiones/s de negocio, es la que define la arquitectura.

### Servicios

Karan propone microservicios, cada uno dueño de sus datos: **Customer**, **Driver**, **Ride** (emparejamiento y el índice geoespacial), **Trip** (ciclo de vida del viaje), **Payment**, **Notification** y **Analytics**; comunicación con gRPC entre servicios, service discovery y, si hace falta, un service mesh (sesiones 04 y 11).

### Cómo funciona un viaje

1. El pasajero pide un viaje con origen, destino, tipo de vehículo y medio de pago.
2. El servicio de viajes registra la solicitud, busca conductores cercanos y calcula el ETA.
3. La solicitud se envía a conductores cercanos para que acepten o rechacen.
4. Si un conductor acepta, el pasajero ve su ubicación en vivo y el ETA mientras espera.
5. El conductor recoge al pasajero e inicia el viaje.
6. Al llegar, el conductor marca el viaje como terminado y se cobra.
7. Tras el pago, el pasajero puede calificar.

### Seguimiento de ubicación

Dos opciones para enviar y recibir ubicaciones en vivo:

- **Pull**: el cliente envía periódicamente su posición por HTTP y recibe ETA y precios (o usa long polling). No escala: muchísimas peticiones con respuestas vacías.
- **Push**: el cliente mantiene una conexión persistente (WebSocket o SSE) y el servidor envía datos cuando los hay. Es la opción recomendada para minimizar latencia (sesión 10).

La app del conductor necesita además un mecanismo en segundo plano para seguir enviando GPS aunque no esté en primer plano.

### Índices geoespaciales: lo esencial

"¿Qué conductores hay a menos de 2 km de este punto?" es una **consulta de proximidad**, y un índice normal no la resuelve bien. Un B-tree ordena por una sola dimensión: con un índice en `lat` y otro en `lon`, cada uno devuelve una franja que cruza toda la ciudad (o el planeta) y la base tiene que intersecar dos conjuntos enormes. La solución es convertir las dos dimensiones en **celdas**: dividir el mapa en regiones con un identificador, buscar primero por celda (fase gruesa) y después filtrar los candidatos por distancia real (fase fina).

#### Geohash

Geohash parte el mundo en dos por longitud, luego en dos por latitud, y así alternando; cada corte agrega un bit, y los bits se escriben en base32. El resultado es una cadena donde **cada carácter más estrecha la celda**:

```
 longitud del geohash →  tamaño aproximado de la celda
   4                      ~39 km × 20 km
   5                      ~4,9 km × 4,9 km
   6                      ~1,2 km × 0,6 km
 "6gkzw" contiene a "6gkzwd", que contiene a "6gkzwdf"…
```

Dos puntos con un **prefijo común largo** están cerca, así que "conductores en mi celda" es una búsqueda por prefijo o una igualdad sobre la celda, algo que cualquier hash map o índice resuelve. Eliges la longitud según el radio: para un radio de 1–2 km sirven celdas de 6 caracteres.

El problema clásico son los **bordes**: dos puntos a 50 m pueden caer en celdas vecinas con prefijos muy distintos, y un punto cerca del borde de tu celda tiene vecinos que no comparten tu prefijo. Por eso nunca consultas solo tu celda: consultas **tu celda y sus 8 vecinas**, juntas los candidatos y los filtras por distancia real (con la fórmula de haversine, que calcula distancias sobre la esfera). Si no alcanzan los resultados, acortas el geohash un carácter y repites con celdas más grandes.

```
 ┌────┬────┬────┐
 │ NO │ N  │ NE │   1. celda del pasajero + 8 vecinas (fase gruesa)
 ├────┼────┼────┤   2. reunir conductores de las 9 celdas
 │ O  │ ●  │ E  │   3. haversine y descartar los que superan el radio (fase fina)
 ├────┼────┼────┤   4. ordenar por distancia o ETA y quedarte con los mejores
 │ SO │ S  │ SE │
 └────┴────┴────┘
```

Para posiciones en vivo, geohash tiene una virtud enorme: actualizar es barato. Cuando llega una posición, calculas la celda nueva; si coincide con la anterior solo actualizas el punto, y si cambió, sacas al conductor del conjunto de la celda vieja y lo agregas al de la nueva. Son dos operaciones O(1) en memoria (por ejemplo, conjuntos en Redis o un `Map<celda, Set<driverId>>`), con 250.000 actualizaciones por segundo repartidas por ciudad.

#### Quadtree

Un quadtree empieza con un nodo que cubre todo el mapa y lo **divide en cuatro cuadrantes** cuando contiene más de K puntos (por ejemplo, 100). Cada cuadrante se vuelve a dividir si también se llena. El árbol queda profundo en el centro de la ciudad y plano en las afueras: **se adapta a la densidad**, algo que la grilla fija de geohash no hace. Para buscar, bajas desde la raíz hasta la hoja que contiene al pasajero y amplías a hojas vecinas hasta reunir suficientes candidatos.

El costo es que es una estructura **en memoria** que hay que construir, y que mover puntos con frecuencia obliga a sacarlos de una hoja y meterlos en otra, con divisiones y fusiones ocasionales. Con 64 B por conductor, 400.000 conductores ocupan unos 26 MB: cabe holgado en una máquina por ciudad, y tras un reinicio se reconstruye en segundos con las posiciones que los conductores siguen enviando.

#### Cuál elegir

| | Geohash | Quadtree |
| --- | --- | --- |
| Estructura | Celdas fijas identificadas por una cadena | Árbol que se divide según la densidad |
| Actualizar una posición | Muy barato (cambiar de conjunto si cambió la celda) | Más caro (mover entre hojas, dividir o fusionar) |
| Densidad muy desigual | Celdas del centro saturadas (hot cells) | Se adapta sola |
| Particionar y cachear | Natural: la celda es la clave | Más difícil |
| Encaja con | Puntos que se mueven todo el tiempo, sharding por zona | Datos que cambian poco y búsquedas de k vecinos |

Uber usa **H3**, una variante con celdas hexagonales jerárquicas: los hexágonos tienen vecinos a la misma distancia en las seis direcciones, lo que simplifica agregar demanda por zona (precios dinámicos). La idea de fondo es la misma: celda primero, distancia exacta después.

### Emparejamiento: encontrar conductores cercanos

Opciones para guardar y consultar posiciones:

- **SQL** con `lat BETWEEN ... AND lon BETWEEN ...`: no escala con grandes volúmenes ni con 250.000 actualizaciones por segundo.
- **Geohash**: el geohash de cada conductor indexado **en memoria**; los cercanos al pasajero se encuentran comparando prefijos (más las celdas vecinas).
- **Quadtree**: búsqueda eficiente en 2D; se puede actualizar con cada posición. Para reducir carga, Karan sugiere actualizar el índice en memoria con las posiciones recientes y persistir la información con menos frecuencia, y dividir un nodo solo al superar un umbral.

**Condiciones de carrera**: muchos pasajeros pidiendo a la vez pueden ser emparejados con el **mismo** conductor. El emparejamiento debe ser atómico: un lock (mutex) sobre el conductor o, mejor, una actualización condicional ("asignar si el estado sigue siendo `available`"), que en una base es una transacción y en Redis un script atómico. Si la asignación involucra varios servicios, se usa una saga con compensaciones (sesión 06).

**Elegir al mejor conductor**: no solo el más cercano. Se filtran conductores por calificación, tipo de vehículo, relevancia; se envía la solicitud a los mejores; si nadie acepta en un tiempo (por ejemplo, 10 s), se pasa a los siguientes. Por cada solicitud aceptada, el conductor queda bloqueado para otras.

### Otros componentes

- **ETA**: requiere un servicio de rutas que considere la red vial y el tráfico (no la distancia en línea recta). Un grafo de calles con tiempos por tramo y un algoritmo de caminos más cortos con datos de tráfico en vivo.
- **Precios dinámicos (surge)**: cuando la demanda supera a la oferta en una zona, sube el precio para atraer conductores y moderar la demanda. Se calcula por celda (por ejemplo, hexágonos H3) a partir de solicitudes y conductores disponibles en ventanas cortas.
- **Pagos**: delegados a un procesador externo (Stripe, PayPal); al completarse, el procesador redirige o notifica y el servicio de pagos registra el resultado. Idempotencia obligatoria (sesión 12).
- **Notificaciones**: con una cola o broker (Kafka) y FCM/APNs (sesión 21).
- **Particionado**: sharding de las bases por un criterio como ciudad o región, con consistent hashing (sesiones 06 y 17).
- **Cache**: posiciones recientes de pasajeros y conductores en Redis o Memcached con LRU; ante un miss, se va a la base y se repuebla.
- **Analítica**: eventos de todos los servicios procesados por lotes o en streaming.
- **Cuellos de botella**: varias instancias por servicio, balanceadores entre capas, réplicas de lectura, cache replicada, y un broker dedicado para orden y entrega de mensajes.

## Qué hacer

Usa la plantilla de design doc de la sesión 15. Tiempo sugerido entre paréntesis.

**Escenario**: una plataforma de viajes y motos para 12 ciudades de Latinoamérica. 15 M DAU, 400.000 conductores activos en el pico (hora pico de la tarde), 3 M de viajes por día; los conductores envían su ubicación cada 3 s; el pasajero debe ver conductores cercanos en el mapa en menos de 1 s y obtener asignación en menos de 15 s el 95 % de las veces; los pagos pueden ser en efectivo o con tarjeta; los datos de cada país deben quedarse en su región.

1. **Requisitos (15 min).** Funcionales del pasajero y del conductor, no funcionales con números (latencia de mapa y de asignación, disponibilidad del flujo de pedir un viaje, durabilidad del registro del viaje), fuera de alcance.
2. **Estimación (20 min).** Actualizaciones de ubicación por segundo en el pico; memoria del índice de conductores (ID, posición, estado, tipo: ~64 B por conductor); peticiones de "ver cercanos" por segundo; viajes por segundo en el pico; almacenamiento del historial de posiciones de los viajes (traza para facturación y seguridad) a 1 año. Cuatro conclusiones.
3. **API y protocolo (15 min).** Endpoints HTTP (pedir, cancelar, aceptar/rechazar, iniciar, terminar, calificar) y mensajes del WebSocket (posición del conductor, oferta de viaje, cambios de estado, posición en vivo para el pasajero).
4. **Modelo de datos (15 min).** Viajes con su máquina de estados (`requested → matched → driver_arriving → in_progress → completed / cancelled`), conductores, vehículos, pagos, calificaciones; qué va a una base relacional (con qué partición) y qué vive solo en memoria.
5. **Alto nivel (25 min).** Diagrama ASCII con gateway WebSocket, servicio de ubicación, índice geoespacial en memoria, servicio de emparejamiento, servicio de viajes, ETA/rutas, precios, pagos, notificaciones, log de eventos y analítica. Numera el flujo completo de un viaje.
6. **Profundización 1: ubicación y emparejamiento (30 min).** Elige geohash, quadtree o H3 para el índice en vivo y justifica con la tasa de escritura; describe cómo se actualiza el índice cuando un conductor cambia de celda; diseña el emparejamiento atómico (cómo evitas que dos pasajeros obtengan al mismo conductor) y la estrategia de ofertas en cascada con timeout.
7. **Profundización 2: ciclo de vida y consistencia (20 min).** ¿Qué datos son CP y cuáles AP? (posición en vivo frente a estado del viaje y pago). Cómo manejas que el conductor pierda conexión a mitad del viaje (heartbeats, reconexión, el estado vive en el servidor) y la idempotencia de "terminar viaje" y del cobro.
8. **Fallos, escala y regiones (15 min).** Tabla "qué pasa si cae" (gateway WS, índice en memoria de una ciudad, servicio de rutas, procesador de pagos, una región). Cómo se reconstruye el índice tras un reinicio (los conductores vuelven a enviar posición en segundos). Partición por ciudad y residencia de datos.
9. **Prototipo (25 min).** En TypeScript: un `DriverIndex` en memoria basado en geohash (o en celdas de grilla) con `updateLocation(driverId, lat, lon)`, `nearby(lat, lon, radiusKm, limit)` y `tryAssign(driverId, rideId)` atómico. Pruebas: un conductor que cruza de celda aparece en la nueva y desaparece de la vieja; `nearby` coincide con fuerza bruta en 100 consultas; 50 solicitudes concurrentes (`Promise.all`) por el mismo conductor producen exactamente una asignación.
10. **Alternativas descartadas (5 min).**

**Entregable**: `ride-hailing-design.md` con las 11 secciones y el prototipo con pruebas.

**Rúbrica** (1 a 3 por criterio):

| Criterio | 1 | 2 | 3 |
| --- | --- | --- | --- |
| Requisitos y estimación | Sin números | Peticiones y viajes | Ubicaciones/s, memoria del índice, historial y conclusiones que guían el diseño |
| Ubicación en vivo | Base SQL por posición | Índice en memoria | Índice justificado por la tasa de escritura, cambio de celda y persistencia fuera de la ruta caliente |
| Emparejamiento | Sin control de concurrencia | Lock o condición | Asignación atómica, cascada con timeout y criterios de calidad |
| Consistencia y ciclo de vida | Ignorados | Máquina de estados | CP/AP por dato, desconexiones e idempotencia de cobro |
| Fallos y regiones | Ausente | Algunos casos | Tabla completa, reconstrucción del índice y partición por ciudad |
| Prototipo | No funciona | Funciona sin pruebas | Las tres pruebas pasan |

Proyecto terminado cuando todos los criterios estén al menos en 2 y el prototipo pase sus pruebas.

## Conceptos clave

- **Ubicación en vivo**: posiciones efímeras de alta frecuencia que viven en memoria.
- **Índice geoespacial en memoria**: estructura (geohash, quadtree, H3) que responde "quién está cerca" sin tocar la base.
- **Geohash**: cadena base32 jerárquica que identifica una celda del mapa; un prefijo común largo indica cercanía.
- **Celdas vecinas**: la celda del punto y sus 8 vecinas, que se consultan juntas para no perder candidatos en los bordes.
- **Quadtree**: árbol que divide un cuadrante en cuatro cuando supera K puntos, adaptándose a la densidad.
- **Fase gruesa y fase fina**: buscar candidatos por celda y filtrarlos después por distancia real (haversine).
- **Emparejamiento atómico**: asignación de un conductor que no puede repetirse ante solicitudes concurrentes.
- **Oferta en cascada**: enviar la solicitud a los mejores conductores y pasar a los siguientes si nadie acepta a tiempo.
- **ETA**: tiempo estimado de llegada según la red vial y el tráfico.
- **Precio dinámico**: precio que sube cuando la demanda supera a la oferta en una zona.
- **Máquina de estados del viaje**: estados y transiciones válidas del ciclo de vida de un viaje.

## Preguntas de repaso

1. ¿Por qué la ubicación de los conductores no debe escribirse en una base relacional en cada actualización?
   R: Porque son cientos de miles de escrituras por segundo de datos efímeros que pierden valor en segundos; una base relacional con durabilidad fuerte se saturaría sin necesidad. Se guardan en un índice en memoria (posición más reciente) y el historial se envía de forma asíncrona a un log y a almacenamiento frío.
2. ¿Cómo evitas que dos pasajeros sean emparejados con el mismo conductor?
   R: Haciendo la asignación atómica: una actualización condicional que solo asigna si el conductor sigue en estado disponible (transacción en la base o script atómico en Redis), o un lock por conductor. La segunda solicitud ve que el estado ya cambió y pasa al siguiente conductor.
3. ¿Qué datos de la plataforma son AP y cuáles CP?
   R: La posición en vivo y el mapa de conductores cercanos son AP: un dato de hace unos segundos es aceptable y la disponibilidad importa más. El estado del viaje, la asignación del conductor y los pagos son CP: no puede haber dos asignaciones ni cobros duplicados o perdidos.
4. ¿Por qué el ETA no puede calcularse con la distancia en línea recta?
   R: Porque los vehículos circulan por calles con sentidos, giros y tráfico variable; un conductor a 500 m en línea recta puede estar a 10 minutos si debe rodear un río o una autopista. Se necesita un servicio de rutas sobre el grafo vial con tiempos de tráfico en vivo.

5. ¿Por qué una búsqueda de cercanía con geohash consulta 9 celdas y no solo la del pasajero?
   R: Porque dos puntos muy cercanos pueden quedar a ambos lados del borde de una celda y tener prefijos distintos; si solo se consultara la celda del pasajero, se perderían conductores a pocos metros. Se reúnen los candidatos de la celda y sus 8 vecinas y luego se filtran por distancia real.
6. ¿Cuándo preferirías un quadtree a un geohash para el índice de conductores?
   R: Cuando la densidad es muy desigual y importa más buscar los k vecinos que actualizar barato: el quadtree se subdivide donde hay muchos puntos y queda plano donde hay pocos. Para posiciones que cambian cada pocos segundos suele ganar el geohash, porque actualizar es mover al conductor de un conjunto a otro y la celda sirve directamente como clave de partición.

## Explícalo con tus palabras

Explica cómo una app de viajes encuentra al conductor adecuado usando la imagen de una central de taxis que mira un mapa con fichas que se mueven y llama por radio a los más cercanos.
