---
title: Caso de estudio — un web crawler escalable
kind: lesson
hours: 2
sources: System Design Interview (Alex Xu), cap. 9 "Design a web crawler" (pp. 132–150) | System Design Primer, solución "Design a web crawler"
links: Primer — Design a web crawler | https://github.com/donnemartin/system-design-primer#design-a-web-crawler ; Primer — Web crawler solution | https://github.com/donnemartin/system-design-primer/blob/master/solutions/system_design/web_crawler/README.md ; Karan — Message Queues | https://github.com/karanpratapsingh/system-design#message-queues ; Karan — Consistent Hashing | https://github.com/karanpratapsingh/system-design#consistent-hashing
---

## Objetivo

Diseñar un crawler que descargue mil millones de páginas al mes de forma escalable, cortés con los sitios, robusta ante trampas y extensible: frontier con prioridad y cortesía, deduplicación de URLs y de contenido, robots.txt, cache de DNS, distribución entre servidores y manejo de fallos.

## Estudio

### Qué es un crawler y para qué se usa

Un **web crawler** (o spider) descubre y descarga páginas web: empieza con unas URLs semilla, descarga sus páginas, extrae los enlaces y repite. Se usa para:

- **Indexación de buscadores**: alimentar un índice de búsqueda.
- **Archivo web**: preservar páginas para el futuro.
- **Minería de datos**: analizar tendencias, precios o menciones.
- **Monitoreo**: detectar usos no autorizados de contenido o marcas.

En pseudocódigo, el núcleo cabe en cinco líneas: tomar una URL de la cola, descargarla, extraer sus enlaces, agregar a la cola los que no se vieron antes y repetir. Todo lo demás de esta sesión existe porque esas cinco líneas, ejecutadas mil millones de veces al mes contra servidores ajenos, fallan de maneras muy variadas.

El algoritmo básico es trivial (un BFS sobre el grafo de la web). La dificultad está en la **escala** y en el comportamiento: la web tiene miles de millones de páginas, muchas duplicadas, trampas que generan URLs infinitas, servidores lentos y sitios que no quieren ser saturados.

### Requisitos

Diálogo de alcance (del libro):

```
 ¿Propósito?                     → Indexación para un buscador.
 ¿Páginas por mes?               → 1.000 millones.
 ¿Tipos de contenido?            → Solo HTML.
 ¿Páginas nuevas o editadas?     → Ambas.
 ¿Guardar el HTML?               → Sí, hasta 5 años.
 ¿Contenido duplicado?           → Se ignora.
```

Características deseadas: **escalabilidad** (paralelismo masivo), **robustez** (HTML mal formado, servidores que no responden, caídas, enlaces maliciosos), **cortesía** (no hacer demasiadas peticiones a un mismo sitio en poco tiempo) y **extensibilidad** (agregar nuevos tipos de contenido, como imágenes, con cambios mínimos).

### Estimaciones

```
 páginas/s    = 1.000 M / (30 × 86.400) ≈ 400/s   (pico ≈ 800/s)
 tamaño medio ≈ 500 KB
 por mes      = 1.000 M × 500 KB = 500 TB
 5 años       = 500 TB × 12 × 5 = 30 PB
 ancho banda  = 400/s × 500 KB = 200 MB/s ≈ 1,6 Gbps  (pico ≈ 3,2 Gbps)
```

Conclusiones: el almacenamiento (30 PB) obliga a object storage o un sistema distribuido con compresión (el HTML se comprime muy bien, a menudo 5–10×); 400 páginas/s es manejable, pero cada descarga tarda cientos de ms (red, DNS, servidor remoto lento), así que por la ley de Little necesitas cientos o miles de descargas **concurrentes**: 400/s × 0,5 s ≈ 200 en vuelo en promedio, y muchas más para absorber servidores lentos.

### Arquitectura de alto nivel

```
 [Semillas] → [URL Frontier] → [HTML Downloader] ←→ [DNS Resolver (cache)]
                   ▲                    │
                   │                    ▼
                   │            [Content Parser] → [¿Contenido visto?] ─sí→ descartar
                   │                    │ no
                   │                    ▼
                   │            [Content Storage]
                   │                    │
                   │            [URL Extractor] → [URL Filter] → [¿URL vista?] ─sí→ descartar
                   │                                                   │ no
                   └──────────────────────── [URL Storage] ←───────────┘
```

Componentes:

- **URLs semilla**: punto de partida. Una buena estrategia divide el espacio de URLs por país (sitios populares de cada país) o por tema (compras, deportes, salud).
- **URL Frontier**: la estructura que guarda las URLs pendientes de descargar. Es el corazón del diseño.
- **HTML Downloader**: descarga las páginas.
- **DNS Resolver**: traduce hosts a IPs.
- **Content Parser**: valida y parsea el HTML (páginas mal formadas desperdician recursos y pueden causar problemas). Va como componente separado para no frenar las descargas.
- **¿Contenido visto?**: cerca del 30 % de las páginas web son duplicadas. Comparar caracteres es lento; se compara un **hash** del contenido (o huellas como SimHash para casi-duplicados).
- **Content Storage**: la mayoría del contenido en disco (o object storage); lo popular en memoria.
- **URL Extractor**: extrae enlaces y convierte rutas relativas en absolutas.
- **URL Filter**: excluye tipos de contenido, extensiones, enlaces erróneos y sitios en listas de exclusión.
- **¿URL vista?**: evita procesar dos veces la misma URL (y bucles infinitos). Se implementa con un **Bloom filter** o una tabla hash.
- **URL Storage**: URLs ya visitadas.

### El flujo paso a paso

1. Se cargan las URLs semilla en el frontier.
2. El HTML Downloader toma una URL del frontier, resuelve la IP con el DNS resolver (cache) y descarga la página respetando `robots.txt`.
3. El Content Parser valida y parsea el HTML; si es inválido, se descarta.
4. Se calcula la huella del contenido y se consulta "¿contenido visto?". Si la página ya existe (duplicada), se descarta; si no, se guarda en Content Storage.
5. El URL Extractor obtiene los enlaces y los normaliza (rutas absolutas, minúsculas en el host, sin fragmentos `#`, parámetros ordenados).
6. El URL Filter descarta extensiones no deseadas, hosts excluidos y URLs inválidas.
7. "¿URL vista?" descarta las ya procesadas o encoladas.
8. Las URLs nuevas se guardan en URL Storage y se envían al frontier, que las ubica según su prioridad y su host.

El paso 5 merece atención: sin **normalización**, `http://Ejemplo.com/a`, `http://ejemplo.com/a#top` y `http://ejemplo.com/a?` serían tres URLs distintas para la misma página, y el crawler desperdiciaría trabajo.

### Cuánta memoria cuesta "¿URL vista?"

Con 5.000 millones de URLs conocidas, una tabla hash con URLs de 100 bytes ocuparía unos 500 GB: demasiado para memoria. Guardar solo un hash de 8 bytes por URL baja a 40 GB, todavía grande. Un **Bloom filter** lo resuelve con poca memoria a cambio de falsos positivos:

```
 Bits por elemento ≈ −1,44 × log2(p)   (p = tasa de falsos positivos)
 p = 1 %   → ~9,6 bits por URL → 5.000 M × 9,6 bits ≈ 6 GB
 p = 0,1 % → ~14,4 bits por URL → ≈ 9 GB
```

Un falso positivo significa que el filtro dice "ya la vi" cuando no es cierto: el crawler **se salta** una URL nueva. Para un buscador, perder el 1 % de URLs nuevas en una pasada suele ser aceptable (se descubrirán por otros enlaces o en la siguiente pasada). Nunca hay falsos negativos: una URL vista nunca se reprocesa por error. El filtro se puede particionar por host entre los servidores de crawl, como el resto del estado.

### Frescura y recrawl con números

De los 1.000 millones de páginas mensuales, ¿cuántas son nuevas y cuántas son recrawls? Supón un índice de 5.000 millones de páginas conocidas. Si quisieras refrescar todas cada mes, necesitarías 5.000 millones de descargas mensuales, cinco veces el presupuesto. Por eso se prioriza:

- Páginas que cambian a menudo e importan (portadas de noticias): cada pocas horas.
- Páginas importantes y estables (documentación, artículos de referencia): cada pocas semanas.
- Páginas poco importantes que casi no cambian: cada varios meses.

Una política simple estima la frecuencia de cambio de cada página a partir de su historial (¿cambió el hash desde la última visita?) y ajusta el intervalo: si cambió, se acorta; si no, se alarga. Además, las peticiones condicionales HTTP (`If-Modified-Since`, `ETag`) permiten que el servidor responda `304` sin cuerpo cuando nada cambió, ahorrando ancho de banda a ambos lados.

### BFS, no DFS

La web es un grafo dirigido: páginas como nodos, enlaces como aristas. DFS no sirve porque la profundidad puede ser enorme. Se usa **BFS** con una cola FIFO, pero el BFS ingenuo tiene dos problemas:

1. **Descortés**: la mayoría de los enlaces de una página apuntan al **mismo host** (por ejemplo, enlaces internos de wikipedia.org). Procesarlos en paralelo es inundar ese servidor de peticiones, algo que el sitio puede considerar un ataque.
2. **Sin prioridades**: no todas las páginas valen lo mismo. La portada de un medio importante merece más frecuencia que un foro olvidado.

El URL Frontier resuelve ambas cosas.

### URL Frontier: prioridad y cortesía

El frontier tiene dos niveles de colas:

```
            [Prioritizer] — calcula prioridad (PageRank, tráfico, frecuencia de cambio)
                 │
   Front queues: f1 (alta)  f2  ...  fn (baja)        ← PRIORIDAD
                 │
   [Front queue selector] — elige cola con sesgo hacia las de mayor prioridad
                 │
   [Back queue router] + [Tabla host → cola]
                 │
   Back queues:  b1 (wikipedia.org)  b2 (apple.com) ... bn   ← CORTESÍA
                 │
   [Back queue selector] → Worker 1 ... Worker N
```

- **Front queues (prioridad)**: el prioritizer asigna cada URL a una cola según su importancia. El selector toma URLs eligiendo colas al azar con sesgo hacia las de mayor prioridad.
- **Back queues (cortesía)**: cada cola contiene URLs de **un solo host**, según una tabla de mapeo host → cola. Cada worker descarga de una cola a la vez, una página por vez, con una **pausa** entre descargas al mismo host. Así nunca hay ráfagas contra un sitio.

**Frescura**: las páginas cambian, así que hay que volver a descargarlas. Recrawlear todo es caro; se prioriza según el historial de cambios de cada página y su importancia.

**Almacenamiento del frontier**: con cientos de millones de URLs pendientes, no cabe todo en memoria, pero tampoco se puede leer del disco en cada operación. Solución híbrida: la mayoría en disco, con **buffers en memoria** para encolar y desencolar que se vuelcan y recargan por lotes.

### HTML Downloader

**Robots.txt** (Robots Exclusion Protocol): cada sitio publica qué rutas pueden o no recorrer los crawlers. Antes de descargar de un host, se lee su `robots.txt` y se respeta; se **cachea** y se refresca periódicamente para no descargarlo en cada petición.

```
 User-agent: *
 Disallow: /privado/
 Disallow: /buscar?*
```

Optimizaciones de rendimiento:

1. **Crawl distribuido**: muchos servidores, cada uno con muchos threads; el espacio de URLs se reparte (por host, con consistent hashing, sesión 08) para que cada host lo maneje un solo servidor y la cortesía sea local.
2. **Cache de DNS**: una resolución tarda de 10 a 200 ms y en muchas librerías es síncrona (bloquea threads). Mantener una cache propia host → IP, actualizada por un job periódico, evita el cuello de botella.
3. **Localidad**: servidores de crawl distribuidos geográficamente; un crawler cerca del sitio descarga más rápido. Aplica también a cache, cola y almacenamiento.
4. **Timeouts cortos**: un servidor que no responde no debe retener al worker; tras el timeout, se pasa a otra URL.

### Dimensionar la flota de descargadores

Con 800 páginas/s en el pico y una descarga media de 1 s (incluyendo servidores lentos y timeouts), la ley de Little da 800 descargas en vuelo. Pero la cortesía limita cuántas puedes hacer por host: si cada host admite una petición cada 2 s y la mayoría de las URLs pendientes se concentra en relativamente pocos hosts, necesitas que haya **muchos hosts distintos** activos a la vez en el frontier, del orden de miles. El paralelismo útil de un crawler no lo fija la CPU sino la **diversidad de hosts** en la cola.

Con I/O asíncrono, un servidor puede mantener miles de conexiones concurrentes; con 800 en vuelo, unos pocos servidores bastan para la descarga en sí. El costo real está en el parseo (CPU), en la deduplicación y en escribir 200 MB/s comprimidos en el almacenamiento. Una flota de unas decenas de servidores, particionada por host con consistent hashing, es un punto de partida razonable.

### Robustez

- **Consistent hashing** para repartir la carga y agregar o quitar descargadores.
- **Guardar el estado** del crawl (frontier y URLs vistas) en almacenamiento persistente para reanudar tras una caída.
- **Manejo de excepciones**: un error en una página no debe tumbar el proceso.
- **Validación de datos** para prevenir errores del sistema: una página de 2 GB o un HTML con millones de enlaces no deben poder agotar la memoria de un parser.

### Extensibilidad

El flujo es un pipeline de módulos enchufables. Agregar soporte para imágenes es agregar un "PNG Downloader"; agregar un "Web Monitor" que busca infracciones de copyright es agregar un consumidor del contenido descargado, sin tocar el resto. Conectar los módulos mediante colas (sesión 09) en lugar de llamadas directas facilita esta extensibilidad: cada etapa escala por separado y un consumidor nuevo se suscribe sin que las etapas anteriores se enteren.

### Contenido problemático

1. **Contenido redundante**: hashes o checksums para detectar duplicados (~30 % de la web).
2. **Spider traps**: páginas que generan URLs infinitas, como un calendario con enlace "mes siguiente" sin fin o rutas que se repiten (`/foo/bar/foo/bar/foo/bar/...`). Mitigaciones: longitud máxima de URL, límite de páginas por host, detección de patrones repetitivos y listas de exclusión manuales; no hay una solución universal.
3. **Ruido**: anuncios, fragmentos de código, spam. Se filtran porque aportan poco valor.

### Modos de fallo y cómo se notan

| Fallo | Síntoma | Mitigación |
| --- | --- | --- |
| Un servidor de crawl cae | Sus hosts dejan de rastrearse | Estado persistido; consistent hashing reasigna sus hosts a otros servidores |
| Frontier crece sin control | Disco lleno, prioridades degradadas | Límite por host, descartar URLs de baja prioridad, detectar trampas |
| Un host responde lento | Workers ocupados esperando | Timeouts cortos, límite de conexiones por host, posponer la cola de ese host |
| Cambio en robots.txt | Rastreo de rutas prohibidas | Refrescar la cache de robots.txt periódicamente y antes de cada sesión larga con un host |
| Bloqueo por un sitio | Errores 403/429 masivos de un host | Respetar `Retry-After`, bajar el ritmo, identificarse con un user-agent con contacto |
| Contenido duplicado no detectado | Almacenamiento y CPU desperdiciados | Huellas de casi-duplicados (SimHash), normalización de URLs |

Observa que casi todas las mitigaciones son de **comportamiento** (ritmo, límites, respeto a las reglas) y no de infraestructura. Un crawler técnicamente perfecto que no es cortés termina bloqueado por los sitios que quiere rastrear.

### Temas para ampliar

- **Renderizado del lado del servidor**: muchos sitios generan enlaces con JavaScript; un parser de HTML no los ve. Hay que renderizar las páginas (navegador headless), lo que es mucho más caro.
- **Filtrado de páginas indeseadas**: con almacenamiento y presupuesto finitos, un componente anti-spam ahorra recursos.
- **Replicación y particionado de la base**.
- **Escalado horizontal**: cientos o miles de servidores stateless de descarga.
- **Disponibilidad, consistencia y confiabilidad** del sistema de crawl.
- **Analítica**: métricas de páginas por segundo, errores por host, cobertura, edad promedio del contenido indexado y tamaño del frontier por prioridad.

### Ética y legalidad del rastreo

Un crawler consume recursos ajenos, así que el diseño incluye reglas de conducta: respetar `robots.txt` y las cabeceras de límite de ritmo; identificarse con un user-agent que incluya una URL o un correo de contacto, para que un administrador pueda pedir que se ajuste el ritmo; no rastrear contenido detrás de autenticación ni eludir protecciones; y atender los términos de uso y las leyes de protección de datos cuando se procesa información personal. En un design doc, una línea sobre esto demuestra que piensas en el sistema dentro de su entorno, no solo en su rendimiento.

### La versión del primer: crawler + índice + búsqueda

La solución del primer agrega el contexto de un buscador: el crawler alimenta un **índice invertido** (palabra → lista de documentos) y un servicio de búsqueda que consulta ese índice y devuelve títulos y fragmentos. También propone generar una **firma** de cada página (por ejemplo, con hashing de fragmentos) para detectar casi-duplicados, y particionar las colas de URLs pendientes con un sorted set por prioridad. Es un buen recordatorio de que el crawler es solo la primera etapa de un pipeline de datos mucho más grande.

## Conceptos clave

- **URL Frontier**: estructura que guarda las URLs por descargar con prioridad y cortesía.
- **Front queues**: colas por prioridad.
- **Back queues**: colas por host para garantizar cortesía.
- **Cortesía (politeness)**: limitar la frecuencia de peticiones a un mismo host.
- **Robots.txt**: archivo con las reglas de rastreo de un sitio.
- **Deduplicación de contenido**: comparar hashes o huellas para ignorar páginas repetidas.
- **¿URL vista?**: verificación (con Bloom filter o hash) para no procesar dos veces una URL.
- **Spider trap**: estructura que genera URLs infinitas y atrapa al crawler.
- **Cache de DNS**: tabla local host → IP que evita resoluciones lentas y bloqueantes.

## Preguntas de repaso

1. ¿Por qué un BFS ingenuo es descortés y cómo lo corrige el frontier?
   R: Porque la mayoría de los enlaces de una página apuntan al mismo host, así que un BFS los descargaría en paralelo inundando ese servidor. El frontier usa back queues con una cola por host y un worker por cola que descarga de a una página con pausas entre peticiones, de modo que cada sitio recibe un ritmo controlado.
2. Calcula el almacenamiento de 5 años de crawl con 1.000 millones de páginas por mes de 500 KB y explica una forma de reducirlo.
   R: 1.000 M × 500 KB = 500 TB por mes; × 12 × 5 = 30 PB. Se reduce comprimiendo el HTML (que se comprime varias veces), descartando duplicados (~30 % de la web) y guardando solo las versiones que cambiaron.
3. ¿Por qué la resolución DNS puede ser un cuello de botella y cómo se resuelve?
   R: Porque cada resolución tarda entre 10 y 200 ms y muchas implementaciones son síncronas, bloqueando threads del descargador. Se resuelve con una cache propia de host a IP actualizada periódicamente por un job, de modo que casi ninguna descarga espera a DNS.
4. ¿Qué es una spider trap y cómo se mitiga?
   R: Es una página o estructura de enlaces que genera URLs infinitas (calendarios sin fin, rutas repetitivas) y deja al crawler en un bucle. Se mitiga con longitud máxima de URL, límite de páginas por host, detección de patrones repetidos y listas de exclusión.
5. ¿Cómo distribuyes el crawl entre muchos servidores sin romper la cortesía?
   R: Asignando cada host a un único servidor mediante consistent hashing sobre el nombre del host. Así todas las URLs de un sitio pasan por el mismo servidor, que aplica localmente sus pausas, y agregar o quitar servidores reasigna solo una fracción de los hosts.

## Ejercicio

Implementa en TypeScript un `UrlFrontier` en memoria con front queues por prioridad (3 niveles) y back queues por host, con una pausa mínima configurable entre descargas del mismo host y un método `next(now)` que devuelva la siguiente URL descargable o `null`. Agrega un "¿URL vista?" con un `Set` (o un Bloom filter simple) y un detector de spider traps por longitud y segmentos repetidos. Pruebas: nunca se devuelven dos URLs del mismo host dentro de la pausa; las URLs de prioridad alta salen antes en promedio; una URL repetida no se encola dos veces; `/a/b/a/b/a/b/a/b` se rechaza. Terminado cuando las cuatro pruebas pasen.

## Explícalo con tus palabras

Explica cómo trabaja un web crawler con la imagen de un bibliotecario que recorre una ciudad visitando librerías, anotando las direcciones de otras librerías que encuentra y sin visitar demasiadas veces la misma tienda en un mismo día.
