---
title: Caso de estudio — YouTube y el streaming de video
kind: lesson
hours: 2
sources: System Design Interview (Alex Xu), cap. 14 "Design YouTube" (pp. 220–243) | karanpratapsingh/system-design, cap. V "Netflix" | System Design Primer, "Content delivery network"
links: Karan — Netflix | https://github.com/karanpratapsingh/system-design#netflix ; Karan — CDN | https://github.com/karanpratapsingh/system-design#content-delivery-network-cdn ; Primer — Content delivery network | https://github.com/donnemartin/system-design-primer#content-delivery-network
---

## Objetivo

Diseñar una plataforma de video tipo YouTube o Netflix: subida de archivos grandes, pipeline de transcodificación como DAG, almacenamiento en blob storage, streaming adaptativo por CDN, metadatos, seguridad del contenido y, sobre todo, la optimización de costos, que en este problema domina todas las decisiones.

## Estudio

### El problema

Subir un video y verlo parece simple; a escala, es uno de los problemas más caros de la industria. YouTube recibe cientos de horas de video por minuto y sirve miles de millones de visualizaciones al día. Lo que hace interesante el diseño es la combinación de: **archivos enormes** (cientos de MB o GB), **procesamiento pesado** (transcodificar a muchos formatos y resoluciones), **ancho de banda gigantesco** al servir, y un **costo** que hay que vigilar en cada decisión.

### Requisitos

Diálogo del libro:

```
 ¿Funciones?                → Subir y ver videos.
 ¿Clientes?                 → Móvil, web y smart TV.
 ¿DAU?                      → 5 millones.
 ¿Tiempo promedio diario?   → 30 minutos.
 ¿Internacional?            → Sí, gran parte de los usuarios es de otros países.
 ¿Resoluciones?             → Casi todas las resoluciones y formatos.
 ¿Cifrado?                  → Sí.
 ¿Tamaño máximo?            → Videos cortos y medianos; máximo 1 GB.
 ¿Infraestructura de nube?  → Sí, se puede usar la de proveedores existentes.
```

No funcionales: subida rápida, streaming fluido, posibilidad de cambiar la calidad, bajo costo de infraestructura, alta disponibilidad y escalabilidad. Karan agrega (para Netflix): búsqueda por título y etiquetas, comentarios, **ninguna subida perdida**, bloqueo geográfico, retomar la reproducción donde se dejó, y métricas.

### Estimaciones

Del libro:

```
 DAU 5 M; cada usuario ve 5 videos al día
 10 % de los usuarios sube 1 video al día; tamaño promedio 300 MB
 Almacenamiento diario = 5 M × 10 % × 300 MB = 150 TB/día
 Costo de CDN (≈ 0,02 USD/GB en EE. UU.):
   5 M × 5 videos × 0,3 GB × 0,02 USD = 150.000 USD por día
```

Esa última línea es la que cambia el diseño: **150.000 dólares diarios solo en CDN**, más de 50 millones al año. Las optimizaciones de costo no son un detalle: son el problema.

Karan (escenario tipo Netflix): 200 M DAU, 5 videos por día → 1.000 M de visualizaciones diarias (~12.000/s), 5 M de subidas por día con ratio 200:1.

### Construir o comprar

El libro recomienda **no construir** blob storage ni CDN propios en una entrevista ni en la mayoría de las empresas: son extremadamente complejos y costosos, e incluso grandes empresas los compran a proveedores de nube (Netflix usa la infraestructura de nube de AWS para casi todo y construyó su propia CDN, Open Connect, solo por su escala excepcional). Lo correcto es elegir los servicios adecuados y explicar cómo se combinan.

### Arquitectura de alto nivel

```
 [Clientes] ──streaming──> [CDN]
     │
     └──todo lo demás (subida, metadatos, login)──> [API servers]
```

Tres piezas: **clientes** (web, móvil, TV), **CDN** (sirve el video) y **API servers** (todo lo que no es streaming: feed de recomendaciones, URL de subida, metadatos, registro de usuarios).

### Flujo de subida

```
 Usuario ─1─> [LB] → [API servers] → [Metadata DB + Metadata cache]
    │
    └─2─> [Original storage (blob)] ─3─> [Transcoding servers]
                                              ├─4a─> [Transcoded storage] ─> [CDN]
                                              └─4b─> [Completion queue] ─> [Completion handler]
                                                                                  └─> actualiza Metadata DB/cache
                                                                                  └─> notifica: "tu video está listo"
```

Componentes: **metadata DB** (particionada y replicada, para rendimiento y disponibilidad) con su **cache**; **original storage** (blob storage para los originales: objetos binarios grandes); **transcoding servers**; **transcoded storage** (blob storage de los archivos codificados); **completion queue** y **completion handler** (workers que toman eventos de transcodificación terminada y actualizan metadatos).

La subida tiene dos procesos **en paralelo**: (a) subir el archivo al original storage y (b) mientras tanto, el cliente envía los metadatos (nombre, tamaño, formato) a los API servers, que los guardan.

### Flujo de streaming

Ver un video **no** es descargarlo entero antes de reproducir: es **streaming**, donde el dispositivo recibe el video de forma continua desde una fuente remota y empieza a reproducir casi de inmediato. Se usan **protocolos de streaming** estándar sobre HTTP: MPEG-DASH, Apple HLS, Microsoft Smooth Streaming, Adobe HDS. No hace falta memorizarlos; importa saber que soportan codificaciones y reproductores distintos, y que el diseño debe elegir los que necesitan sus clientes.

El video llega desde el **servidor de la CDN más cercano**, con baja latencia.

### Transcodificación

Un video grabado en una cámara tiene un formato y una resolución concretos y ocupa mucho. Hay que **transcodificarlo** (codificarlo de nuevo) a varios formatos, porque:

- El video crudo ocupa muchísimo (una hora de video HD a 60 fps puede ocupar cientos de GB).
- Muchos dispositivos y navegadores solo soportan ciertos formatos.
- Para una reproducción fluida, se entrega mayor resolución a quien tiene buen ancho de banda y menor a quien no.
- Las condiciones de red cambian (sobre todo en móviles): el reproductor cambia de calidad durante la reproducción. Esto es el **streaming adaptativo**: el video se codifica en varias calidades (*bitrate ladder*: 240p, 360p, 480p, 720p, 1080p, 4K), cada una partida en segmentos de pocos segundos; el reproductor mide su ancho de banda y pide el siguiente segmento en la calidad que puede sostener.

Dos conceptos: el **contenedor** (la "canasta" con video, audio y metadatos: `.mp4`, `.mov`, `.avi`) y el **códec** (el algoritmo de compresión y descompresión: H.264, VP9, HEVC, AV1).

### Cuánto ocupa un video codificado

El original no es lo único que se guarda. Con un bitrate ladder típico y un video de 10 minutos (600 s), los tamaños aproximados de cada calidad son:

| Calidad | Bitrate aproximado | Tamaño de 10 min |
| --- | --- | --- |
| 240p | 0,4 Mbps | 30 MB |
| 360p | 0,8 Mbps | 60 MB |
| 480p | 1,5 Mbps | 112 MB |
| 720p | 3 Mbps | 225 MB |
| 1080p | 6 Mbps | 450 MB |
| 4K | 20 Mbps | 1,5 GB |

(Tamaño = bitrate × duración / 8. Por ejemplo, 3 Mbps × 600 s = 1.800 Mb = 225 MB.)

Sin 4K, todas las calidades suman unos 880 MB; con varios códecs (por ejemplo, H.264 para compatibilidad y VP9 o AV1 para ahorrar ancho de banda en dispositivos modernos), el total puede duplicarse. Es decir, un video puede ocupar varias veces su original una vez codificado. Multiplica por 500.000 subidas diarias (10 % de 5 M de usuarios) y entiendes por qué la regla "no precodificar todo para videos que nadie ve" ahorra tanto: la mayoría de esos videos nunca se reproducirá en 1080p ni en 4K.

La elección de códec es un trade-off clásico de costo: AV1 comprime alrededor de un 30 % mejor que H.264 a la misma calidad (menos ancho de banda servido, el costo dominante), pero codificar cuesta mucha más CPU. Para los videos más vistos vale la pena gastar CPU una vez y ahorrar ancho de banda millones de veces; para los poco vistos, no.

### El modelo DAG

Transcodificar es caro y lento, y cada creador puede querer cosas distintas: marcas de agua, miniaturas propias, alta calidad o calidad básica. Para soportar pipelines distintos con mucho paralelismo, se modela el procesamiento como un **grafo dirigido acíclico** (DAG) de tareas, organizadas en etapas que se ejecutan en secuencia o en paralelo (el motor de video de Facebook usa una idea así):

```
                    ┌─> [Video] ─┬─> [Inspección] ─> [Codificación 360p/720p/1080p] ─┐
 [Original] ─split──┤            ├─> [Miniatura]                                     ├─> [Ensamblar]
                    │            └─> [Marca de agua]                                  │
                    ├─> [Audio] ───> [Codificación de audio] ─────────────────────────┤
                    └─> [Metadatos] ──────────────────────────────────────────────────┘
```

Arquitectura del procesamiento (seis componentes):

1. **Preprocessor**: divide el video en **GOPs** (*Group of Pictures*: grupos de cuadros, cada uno reproducible por separado, de pocos segundos); genera el DAG según la configuración del cliente; y cachea los segmentos en **almacenamiento temporal**, de modo que si falla la codificación se reintenta desde ahí.
2. **DAG scheduler**: divide el grafo en etapas de tareas y las pone en la cola de tareas del resource manager.
3. **Resource manager**: asigna recursos con tres colas (tareas pendientes con prioridad, workers disponibles con su uso, y tareas en ejecución) y un scheduler que empareja la tarea de mayor prioridad con el worker óptimo.
4. **Task workers**: ejecutan las tareas del DAG (codificar, generar miniaturas, marcas de agua...).
5. **Temporary storage**: guarda datos intermedios. Metadatos pequeños y frecuentes en memoria; video y audio en blob storage. Se borran al terminar.
6. **Encoded video**: el resultado final, por ejemplo `funny_720p.mp4`.

### Optimizaciones de velocidad

- **Subida paralela por partes**: el cliente divide el video en partes (alineadas a GOP) y las sube en paralelo; si falla una parte, se reintenta solo esa (subida reanudable). Lo hacen las APIs multipart del object storage.
- **Centros de subida cercanos**: puntos de subida en distintas regiones (la CDN puede actuar como centro de subida).
- **Paralelismo en todo el pipeline**: introducir **colas** entre etapas (descarga de originales, codificación, subida a transcoded storage) para que cada una avance de forma independiente; sin colas, cada etapa espera a la anterior.

### Optimizaciones de seguridad

- **URL prefirmada**: el cliente pide a los API servers una URL de subida firmada y con expiración que da permiso a esa ubicación del object storage; así el cliente sube directo al storage, sin pasar los GB por tus servidores, y solo usuarios autorizados pueden subir.
- **Protección del contenido**: DRM (gestión de derechos digitales: FairPlay, Widevine, PlayReady), **cifrado AES** del video (solo se descifra al reproducir para usuarios autorizados) y **marcas de agua visuales** con información de identificación.

### Optimizaciones de costo (la parte decisiva)

La observación clave: el consumo de video sigue una **distribución de cola larga**. Pocos videos populares concentran la mayoría de las visualizaciones; la inmensa mayoría tiene pocas o ninguna. Por eso:

1. **Servir desde la CDN solo los videos populares**; los demás, desde servidores de video propios de alta capacidad (más baratos por GB).
2. **No precodificar todo**: para videos con pocas vistas, guardar pocas calidades y codificar otras **bajo demanda** si llegan a necesitarse; los videos cortos pueden codificarse al vuelo.
3. **Distribución regional**: un video popular solo en un país no necesita estar en las CDNs de todo el mundo.
4. **CDN propia y acuerdos con ISPs**: a escala enorme, construir una CDN propia y colocar servidores dentro de las redes de los proveedores de internet (lo que hace Netflix con Open Connect, con miles de appliances en ubicaciones de ISPs) reduce costos y mejora la experiencia, a cambio de una inversión enorme.

Todas estas optimizaciones dependen de **datos de popularidad**: hay que analizar los patrones históricos de visualización antes de aplicarlas.

Un cálculo rápido muestra el efecto. Si el 10 % de los videos genera el 90 % de las visualizaciones y solo ese 10 % se sirve por CDN, el 90 % del tráfico sigue en la CDN (con su mejor latencia), pero los 90 % de videos restantes, que generan el 10 % del tráfico, salen de servidores propios a, digamos, la mitad del costo por GB. Y si esos videos poco vistos no se codifican en 1080p ni 4K hasta que alguien los pide, el almacenamiento codificado baja a una fracción. Son ahorros del orden de millones de dólares al año con cambios de política, no de tecnología.

### Manejo de errores

Hay que construir un sistema tolerante a fallos. Dos tipos de errores:

- **Recuperables** (por ejemplo, falla la transcodificación de un segmento): reintentar unas veces; si no se recupera, devolver un error adecuado al cliente.
- **No recuperables** (por ejemplo, formato de video corrupto): detener las tareas de ese video y devolver el error.

Casos típicos: error de subida → reintentar; error al dividir el video en el servidor → el cliente envía el video entero y el servidor lo divide; error de transcodificación → reintentar; error del preprocessor → regenerar el DAG; error del DAG scheduler → reprogramar la tarea; caída del resource manager → usar una réplica; caída de un worker → reintentar la tarea en otro; caída de un API server → el LB envía a otro (son stateless); caída de la cache de metadatos → las réplicas atienden y se reemplaza el nodo; caída de la base de metadatos → si cae el líder, se promueve una réplica; si cae una réplica, se lee de otra y se reemplaza.

### Un recorrido de una reproducción

1. Beto toca un video en la app. El cliente pide a los API servers los metadatos: título, duración, y la URL del **manifiesto** de streaming (un archivo que lista las calidades disponibles y sus segmentos), junto con un token de acceso firmado si el contenido está protegido.
2. El reproductor descarga el manifiesto desde la CDN más cercana (resuelta por DNS o anycast, sesión 03).
3. Empieza pidiendo los primeros segmentos en una calidad conservadora (por ejemplo, 480p) para arrancar rápido.
4. Mide el tiempo de descarga de cada segmento; si su red sostiene más, sube a 720p o 1080p en los segmentos siguientes; si el buffer se vacía, baja la calidad.
5. Los segmentos populares están en la cache del nodo de la CDN (hit); si no, el nodo los trae del origen (transcoded storage) y los guarda.
6. Cada cierto tiempo, el cliente informa el progreso (offset) a los API servers para "seguir viendo" y para analítica; esos eventos van a una cola, no a una escritura síncrona.

Fíjate en que los API servers solo participan al principio y de forma asíncrona durante la reproducción: el 99 % de los bytes fluye entre la CDN y el dispositivo.

### Qué cambia con video en vivo

Una transmisión en directo comparte muchas piezas, pero cambia una restricción: la **latencia**. En video bajo demanda, transcodificar puede tardar minutos; en vivo, cada segundo de retraso se nota (un gol que tu vecino grita antes de que lo veas). Consecuencias:

- La transcodificación se hace en tiempo real, segmento a segmento, con segmentos más cortos (1–2 s) y menos calidades.
- El DAG se simplifica: no hay tiempo para tareas costosas como codificar en AV1 con máxima compresión.
- El origen recibe un flujo continuo del emisor (por protocolos de ingesta como RTMP o SRT) en lugar de un archivo.
- La CDN debe propagar segmentos nuevos a todos los nodos en segundos; un evento masivo genera millones de peticiones simultáneas por el mismo segmento recién creado, lo que exige *request coalescing* en la CDN (sesión 05).
- Para latencias de menos de un segundo (videollamadas, subastas en vivo) se usan protocolos distintos, como WebRTC sobre UDP (sesión 03).

### Más allá: búsqueda, retomar la reproducción, bloqueo geográfico

Karan agrega piezas útiles: búsqueda por título y etiquetas con un motor como Elasticsearch; una tabla de visualizaciones con el **offset** donde el usuario dejó cada video, para retomar desde el segmento correspondiente; **bloqueo geográfico** por licencias, determinando el país por IP o perfil y aplicando restricciones en la CDN; recomendaciones con modelos entrenados sobre el historial; y analítica con procesamiento por lotes.

### Escalar la base de metadatos

Los metadatos (título, descripción, dueño, URLs de cada calidad, contadores) son pequeños comparados con el video, pero se leen muchísimo: replicación con réplicas de lectura, cache con LRU para videos populares y sharding por ID de video. Los contadores de vistas usan escrituras agregadas por lotes, como los likes del news feed (sesión 22).

## Conceptos clave

- **Blob storage**: almacenamiento de objetos binarios grandes; aquí, originales y videos codificados.
- **Transcodificación**: recodificar un video a otros formatos, resoluciones y bitrates.
- **Bitrate ladder**: conjunto de calidades en que se codifica un video para el streaming adaptativo.
- **Streaming adaptativo**: el reproductor elige la calidad de cada segmento según su ancho de banda.
- **Contenedor y códec**: el archivo que agrupa video, audio y metadatos, y el algoritmo de compresión.
- **GOP**: grupo de cuadros reproducible por sí solo; unidad para dividir y paralelizar.
- **DAG de procesamiento**: grafo de tareas con dependencias que se ejecutan en etapas y en paralelo.
- **URL prefirmada**: URL temporal con permiso para subir o leer un objeto concreto.
- **Cola larga**: pocos videos concentran casi todas las vistas; base de las optimizaciones de costo.

## Preguntas de repaso

1. ¿Por qué el costo domina el diseño de una plataforma de video? Usa números.
   R: Porque el ancho de banda servido es enorme: con 5 M de usuarios viendo 5 videos de 0,3 GB al día y una CDN a 0,02 USD por GB, el costo es de unos 150.000 USD diarios, más de 50 millones al año, sin contar 150 TB diarios de almacenamiento nuevo. Cada optimización de distribución o codificación ahorra millones.
2. ¿Qué ventajas tiene subir el video con una URL prefirmada directo al object storage?
   R: Los gigabytes no pasan por los API servers (menos carga y costo), el cliente sube al almacenamiento más cercano y en paralelo por partes, y el permiso es limitado a ese objeto y expira, de modo que solo usuarios autorizados pueden subir y solo a la ubicación asignada.
3. ¿Para qué sirve modelar la transcodificación como un DAG?
   R: Para expresar pipelines distintos según el creador (marcas de agua, miniaturas, calidades) como tareas con dependencias, y ejecutar en paralelo todo lo que no depende entre sí (video, audio, miniaturas, distintas resoluciones), lo que reduce el tiempo total y permite reintentar tareas individuales.
4. Nombra tres optimizaciones de costo basadas en la cola larga.
   R: Servir desde la CDN solo los videos populares y el resto desde servidores propios más baratos; codificar pocas calidades para videos poco vistos y generar otras bajo demanda; y distribuir los videos solo en las regiones donde son populares. A gran escala, además, una CDN propia con servidores dentro de los ISPs.
5. ¿Cómo funciona el streaming adaptativo y por qué necesita varias codificaciones?
   R: El video se codifica en varias calidades y cada una se divide en segmentos de pocos segundos. El reproductor mide su ancho de banda y, segmento a segmento, pide la mejor calidad que puede sostener sin cortes. Sin varias codificaciones, un usuario con mala red tendría pausas constantes y uno con buena red recibiría menos calidad de la posible.

## Ejercicio

Escribe en TypeScript un pequeño motor de DAG: define un tipo `Task { id; deps: string[]; run(): Promise<void> }`, implementa `runDag(tasks, concurrency)` que ejecute en paralelo todas las tareas cuyas dependencias terminaron, respetando un límite de concurrencia y reintentando hasta 3 veces las que fallan. Modela el DAG de transcodificación de esta sesión con tareas simuladas (con `setTimeout`) y mide el tiempo total con concurrencia 1, 4 y 8. Pruebas: ninguna tarea empieza antes que sus dependencias; una tarea que falla dos veces termina bien al tercer intento; una dependencia circular produce un error. Terminado cuando las pruebas pasen y tengas la tabla de tiempos.

## Explícalo con tus palabras

Explica por qué YouTube guarda cada video en varias calidades usando la imagen de una panadería que hornea el mismo pan en tamaños distintos para clientes con distinto apetito.
