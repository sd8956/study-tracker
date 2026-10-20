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

### Emparejamiento: encontrar conductores cercanos

Opciones para guardar y consultar posiciones (sesión 27):

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
- **Particionado**: sharding de las bases por un criterio como ciudad o región, con consistent hashing (sesiones 06 y 08).
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

## Explícalo con tus palabras

Explica cómo una app de viajes encuentra al conductor adecuado usando la imagen de una central de taxis que mira un mapa con fichas que se mueven y llama por radio a los más cercanos.
