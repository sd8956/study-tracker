---
title: Caso de estudio — news feed (timeline tipo Twitter o Facebook)
kind: lesson
hours: 2
sources: System Design Interview (Alex Xu), cap. 11 "Design a news feed system" (pp. 166–177) | karanpratapsingh/system-design, cap. V "Twitter" | System Design Primer, solución "Design the Twitter timeline and search"
links: Karan — Twitter | https://github.com/karanpratapsingh/system-design#twitter ; Primer — Twitter timeline and search | https://github.com/donnemartin/system-design-primer#design-the-twitter-timeline-and-search-or-facebook-feed-and-search ; Primer — Twitter solution | https://github.com/donnemartin/system-design-primer/blob/master/solutions/system_design/twitter/README.md
---

## Objetivo

Diseñar el news feed de una red social: API de publicación y lectura, fan-out al escribir frente a fan-out al leer y el modelo híbrido para celebridades, el servicio de fan-out, la arquitectura de cache en capas, la paginación y los modos de fallo, justificando cada decisión con números.

## Estudio

### El problema

El **news feed** es la lista de publicaciones de las personas y páginas que sigues, actualizada constantemente: la pantalla principal de Facebook, el timeline de X/Twitter o el feed de Instagram. Es el ejemplo perfecto de un sistema con muchísimas más lecturas que escrituras, donde la pregunta central es: **¿cuándo se arma el feed de cada usuario, al publicar o al leer?**

### Requisitos

Diálogo del libro:

```
 ¿Web o móvil?                      → Ambos.
 ¿Funciones principales?            → Publicar y ver el feed de amigos.
 ¿Orden?                            → Cronológico inverso (para simplificar).
 ¿Máximo de amigos?                 → 5.000.
 ¿Volumen?                          → 10 M DAU.
 ¿Contenido?                        → Texto, imágenes y video.
```

Karan plantea un escenario tipo Twitter más grande: 1.000 M de usuarios, 200 M DAU, 5 tweets por usuario al día, búsqueda de tweets, seguir usuarios y, como extendidos, retweets, favoritos y métricas.

No funcionales: feed con baja latencia (por ejemplo, p99 < 200–300 ms), alta disponibilidad, consistencia eventual aceptable (un post puede tardar unos segundos en aparecer en feeds ajenos) y read-your-writes para el autor.

### Estimaciones (escenario de Karan)

```
 tweets/día   = 200 M × 5 = 1.000 M  → ≈ 12.000 escrituras/s (pico ~25.000)
 texto        = 1.000 M × 100 B = 100 GB/día
 media        = 10 % × 1.000 M = 100 M archivos/día × 50 KB = 5 TB/día
 10 años      ≈ (5 + 0,1) TB × 365 × 10 ≈ 19 PB
 ingreso      ≈ 5,1 TB/día ≈ 60 MB/s
```

Agrega las lecturas, que dominan: si cada DAU abre el feed 10 veces al día, son 2.000 M de lecturas de feed por día ≈ 23.000/s promedio y más de 50.000/s en el pico. Cada lectura muestra ~20 posts: hasta un millón de posts por segundo que hay que hidratar. Conclusión: **la lectura del feed debe ser una operación barata y casi siempre servida desde memoria**.

### API

```
 POST /v1/me/feed            body: content, media_ids     auth: token   → publicar
 GET  /v1/me/feed?cursor=... &limit=20                    auth: token   → leer el feed
```

Paginación por cursor (sesión 10), nunca por offset: el feed cambia constantemente y el offset produciría duplicados y saltos.

### Dos flujos: publicar y construir el feed

**Publicación**:

```
 Usuario → [LB] → [Web servers: auth, rate limit]
                      ├→ [Post service] → [Post DB] + [Post cache]
                      ├→ [Fanout service] → escribe el post en los feeds de los amigos (cache)
                      └→ [Notification service] → avisa a los amigos
```

**Lectura del feed**:

```
 Usuario → [LB] → [Web servers] → [Newsfeed service] → [News feed cache: IDs de posts]
                                           └→ hidrata con [User cache] y [Post cache] → JSON
```

Los servidores web aplican autenticación (solo usuarios válidos con token) y rate limiting (sesión 16) para frenar spam y abuso.

### El corazón del problema: fan-out

**Fan-out** es el proceso de entregar un post a todos los amigos o seguidores. Hay dos modelos.

**Fan-out al escribir (push).** El feed se **precalcula** al publicar: cuando Ana publica, el post se agrega de inmediato al feed (en cache) de cada uno de sus amigos.

- Ventajas: el feed se genera en tiempo real y se entrega al instante; **leer es rapidísimo** (una lectura de cache).
- Desventajas: si el autor tiene muchísimos seguidores, escribir en todos sus feeds es lento y costoso (**problema de hot key** o de celebridades). Y se desperdician recursos precalculando feeds de usuarios inactivos que nunca los leerán.

**Fan-out al leer (pull).** El feed se arma **bajo demanda** al abrirlo: se buscan los posts recientes de todas las personas que sigues y se mezclan.

- Ventajas: no hay hot keys al publicar; no se gasta nada en usuarios inactivos.
- Desventajas: leer es lento y costoso (consultar a cientos de personas por cada apertura del feed).

Los números muestran el dilema. Con fan-out al escribir y 200 seguidores promedio, 12.000 posts/s generan **2,4 M de escrituras/s** en feeds. Una celebridad con 50 M de seguidores generaría 50 M de escrituras con **un solo** post. Con fan-out al leer, cada una de las 50.000 lecturas/s del pico tendría que consultar los posts de ~200 cuentas: 10 M de consultas/s.

**Modelo híbrido** (el que proponen las tres fuentes):

- Para la mayoría de los usuarios: **push**. Las lecturas son rápidas y las escrituras acotadas.
- Para celebridades o cuentas con muchísimos seguidores: **pull**. Sus posts no se distribuyen; al leer el feed, se mezclan los posts recientes de las pocas celebridades que sigues con el feed precalculado.
- Con **consistent hashing** se reparten mejor las peticiones y los datos, mitigando hot keys.

```
 Feed de Beto al leer = feed precalculado (push de amigos normales)
                      ∪ últimos posts de las celebridades que sigue (pull)
                      → ordenar → paginar
```

### Elegir el umbral del híbrido con números

¿A partir de cuántos seguidores una cuenta pasa a pull? Razónalo con costos. Supón que el fan-out puede sostener 2 M de escrituras/s de forma cómoda y que el post de una cuenta debe aparecer en los feeds en menos de 10 s.

- Una cuenta con 100.000 seguidores genera 100.000 escrituras por post: 5 % de un segundo de capacidad. Push sin problema.
- Una cuenta con 5 M de seguidores genera 5 M de escrituras: 2,5 s de toda la capacidad del sistema, bloqueando el fan-out del resto. Mala idea si publica varias veces al día.
- Del lado de la lectura, cada cuenta en pull agrega una consulta (normalmente a una cache de "últimos posts por autor") a cada apertura del feed de sus seguidores. Si un usuario sigue a 30 celebridades, son 30 lecturas extra por apertura, que se pueden hacer en paralelo y casi siempre son hits de cache.

Un umbral razonable queda en el orden de cientos de miles a un millón de seguidores, ajustado con métricas reales. Un refinamiento: decidir por **actividad**, no solo por seguidores. Una cuenta con 2 M de seguidores que publica una vez al mes puede seguir en push; una con 300.000 que publica cada minuto quizás no.

### Consistencia del feed

Las garantías se negocian por tipo de lector:

- **El autor** debe ver su post de inmediato (read-your-writes; módulo 04, sesión 11): al publicar, el cliente lo inserta en su propia vista de forma optimista y el servidor agrega el post al feed del autor en la misma petición, antes del fan-out asíncrono.
- **Los seguidores** pueden verlo con unos segundos de retraso (consistencia eventual): es aceptable para una red social y es lo que permite un fan-out asíncrono con colas.
- **El orden**: si los posts se ordenan por un ID ordenable por tiempo (Snowflake, sesión 18), los feeds de distintas fuentes (push y pull) se mezclan con un merge simple por ID, sin consultar timestamps aparte.

### Profundización: el servicio de fan-out

```
 1. Obtener los IDs de amigos/seguidores desde la base del grafo social
 2. Obtener info de amigos desde la user cache y filtrar
    (silenciados, bloqueados, configuraciones de privacidad)
 3. Enviar la lista de amigos + post_id a una cola
 4. Workers de fan-out consumen la cola y escriben en la news feed cache
```

La **news feed cache** guarda, por usuario, una lista de pares `<post_id, user_id>`, no los posts completos: guardar objetos enteros en millones de feeds consumiría muchísima memoria. Además, se guarda un **límite configurable** (por ejemplo, los últimos 500 o 800 IDs): casi nadie hace scroll hasta miles de posts atrás, así que la tasa de miss es baja; si alguien llega más lejos, se reconstruye desde la base.

```
 feed:beto = [ (post 9812, ana), (post 9790, carlos), (post 9751, ana), ... ]  ← hasta N entradas
```

El grafo social (quién sigue a quién) encaja en una **base de grafos** o en tablas de seguidores bien indexadas en ambas direcciones; las bases de grafos son buenas para relaciones y para recomendaciones de amigos.

Con 500 entradas de 16 bytes (dos IDs de 8 bytes) por usuario y 200 M de usuarios activos: 200 M × 500 × 16 B = 1,6 TB, más overhead ≈ 2–3 TB de memoria repartida en un cluster de Redis. Grande pero factible; guardar posts completos en cada feed multiplicaría eso por cien.

### Profundización: leer el feed

```
 1. Petición GET /v1/me/feed
 2. LB → web server
 3. Web server → newsfeed service
 4. Newsfeed service obtiene la lista de post_ids de la news feed cache
 5. Hidrata: user cache (nombre, foto) + post cache (contenido) → feed completo
 6. Devuelve JSON; imágenes y videos se sirven desde la CDN
```

### Presupuesto de latencia de una lectura

Para cumplir un p99 de 200 ms en el feed, reparte el presupuesto:

```
 LB + web server + auth                    ~5 ms
 news feed cache: obtener 20 IDs            ~2 ms
 pull de celebridades (paralelo, 10 caches) ~5 ms
 merge y ranking simple                     ~5 ms
 hidratación: MGET de 20 posts + 20 users   ~5 ms (dos llamadas en paralelo)
 serialización y respuesta                  ~5 ms
 total típico                               ~30 ms
```

El margen hasta 200 ms absorbe colas en el p99, misses de cache que van a la base (10–50 ms) y la red del cliente. Fíjate en dos técnicas: las llamadas independientes se hacen **en paralelo** (no en serie) y la hidratación usa **lecturas por lote** (`MGET`) en lugar de 40 lecturas individuales; con 40 lecturas en serie de 1 ms ya consumirías 40 ms. Un ranking con un modelo de aprendizaje automático puede agregar decenas de milisegundos, y ahí es donde suele gastarse el margen.

### Arquitectura de cache en capas

El libro divide la cache en cinco capas, cada una con su patrón de acceso:

| Capa | Contenido | Nota |
| --- | --- | --- |
| News feed | Listas de IDs de posts por usuario | Precalculadas por el fan-out |
| Content | Datos de posts; posts populares en una cache "caliente" aparte | Se comparten entre todos los feeds |
| Social graph | Seguidores y seguidos | Leído en cada fan-out |
| Action | Si un usuario dio like, respondió, etc. a un post | Para pintar el estado de los botones |
| Counters | Likes, respuestas, seguidores, seguidos | Contadores con escrituras muy frecuentes |

Separar capas permite dimensionar y expirar cada una según su ritmo de cambio (sesión 05: cachear por separado lo que cambia a distinto ritmo).

### Ranking

El feed puede ordenarse por relevancia en lugar de por tiempo. Un ejemplo histórico es EdgeRank, con una puntuación de la forma `afinidad × peso × decaimiento`: cuán cerca está el lector del autor, cuánto pesa el tipo de interacción y cuán viejo es el contenido. Hoy se usan modelos de aprendizaje automático con miles de señales. En diseño de sistemas, el punto importante es estructural: el ranking agrega una etapa entre "candidatos" (los IDs del feed) y "resultado" (la página ordenada), que necesita features precalculadas y un presupuesto de latencia propio.

### Búsqueda

Karan y el primer agregan búsqueda de tweets: un servicio separado que indexa los posts en un **índice invertido** (sesión 06), alimentado de forma asíncrona por eventos de publicación. La consulta va a todos los shards del índice (scatter-gather), se mezclan los resultados y se ordenan. Es eventualmente consistente: un post nuevo tarda unos segundos en ser buscable.

### Variantes del mismo problema

El news feed es una plantilla que reaparece con otros nombres, y conviene reconocerla:

- **Feed de actividad** de un proyecto o de un equipo (quién comentó, quién subió un archivo): mismo fan-out, normalmente con pocos destinatarios, así que push puro funciona.
- **Bandeja de notificaciones** dentro de una app: es un feed por usuario, con fan-out desde los eventos que lo afectan.
- **Feed por intereses** (hashtags, temas): el autor no conoce a los lectores; el fan-out se hace hacia "canales" de temas y cada usuario lee los canales que sigue (un pull sobre pocas fuentes grandes).
- **Feed algorítmico de descubrimiento** (contenido de cuentas que no sigues): ya no hay grafo social; los candidatos vienen de un sistema de recomendación y la parte de sistemas se concentra en generar candidatos, rankear y cachear resultados por usuario.

En todos los casos la pregunta es la misma que en esta sesión: cuánto trabajo hacer al escribir y cuánto al leer, según el ratio de lecturas a escrituras y la distribución de seguidores.

### Media y otros detalles

- Fotos y videos se suben a object storage y se sirven por CDN; el post guarda solo referencias.
- **Retweets**: un post nuevo de tipo "retweet" que referencia al original (o una tabla aparte).
- **Contadores** de likes: escrituras masivas sobre pocas claves (un post viral recibe miles de likes por segundo). Se agregan en memoria y se persisten por lotes (write-behind, sesión 05), o se reparten en varios subcontadores que se suman al leer.

### Un recorrido completo: Ana publica, Beto lee

1. Ana (800 seguidores) publica una foto. El cliente sube primero la imagen a object storage mediante una URL prefirmada y luego llama a `POST /v1/me/feed` con el texto y el ID del medio.
2. El post service genera un ID ordenable por tiempo, guarda el post en la base (particionada por autor) y en la post cache, y lo agrega al feed de la propia Ana.
3. Se publica el evento `PostCreated` en una cola. La respuesta a Ana sale en ~50 ms.
4. Un worker de fan-out toma el evento, lee los 800 seguidores desde la cache del grafo social, descarta a quienes silenciaron a Ana y a los inactivos de hace más de 30 días, y agrega `(post_id, ana)` al principio de cada lista de feed activa, recortándola a 500 entradas.
5. El servicio de notificaciones (sesión 21) avisa a los seguidores que activaron alertas para Ana.
6. El indexador de búsqueda consume el mismo evento y agrega el texto al índice invertido.
7. Beto abre la app: el newsfeed service lee los primeros 20 IDs de `feed:beto`, agrega los posts recientes de las 3 celebridades que sigue, mezcla por ID, hidrata con `MGET` y devuelve el JSON. La imagen de Ana la descarga el cliente desde la CDN.

En este recorrido aparecen casi todas las piezas del módulo: object storage y CDN, IDs ordenables, cache, colas, fan-out, notificaciones, búsqueda e hidratación por lotes.

### Modos de fallo y escalado

- **Celebridad publica**: con el híbrido, no hay tormenta de escrituras; sin él, la cola de fan-out acumula millones de tareas y todos los feeds se retrasan.
- **Fan-out atrasado**: si los workers no dan abasto, los posts aparecen tarde. Monitorea la profundidad de la cola y la "edad" del post más viejo sin distribuir.
- **Cache de feeds perdida**: reconstruir los feeds desde la base para millones de usuarios a la vez es carísimo. Réplicas de cache y reconstrucción perezosa (solo cuando el usuario abre el feed).
- **Usuarios inactivos**: no hagas fan-out a quienes no abren la app hace semanas; reconstruye su feed cuando vuelvan.
- **Borrados y bloqueos**: un post borrado sigue en millones de listas de IDs; al hidratar, los IDs inexistentes o bloqueados se filtran, y un proceso asíncrono limpia las listas.
- **Escalado de la base**: posts particionados por autor o por ID (sesión 06); réplicas de lectura; los datos fríos a almacenamiento más barato.

## Conceptos clave

- **News feed**: lista de publicaciones de las cuentas seguidas, actualizada continuamente.
- **Fan-out**: distribución de un post a los feeds de los seguidores.
- **Fan-out al escribir (push)**: precalcular los feeds al publicar.
- **Fan-out al leer (pull)**: armar el feed al abrirlo.
- **Modelo híbrido**: push para cuentas normales y pull para celebridades.
- **Hot key / problema de celebridades**: un autor con tantos seguidores que su post satura el fan-out.
- **News feed cache**: listas acotadas de `<post_id, user_id>` por usuario.
- **Hidratación**: completar los IDs del feed con los datos de posts y usuarios desde otras caches.
- **Cache en capas**: caches separadas para feeds, contenido, grafo social, acciones y contadores.

## Preguntas de repaso

1. Compara fan-out al escribir y al leer en latencia de lectura, costo de escritura y uso de recursos.
   R: Al escribir, la lectura es muy rápida (el feed ya está precalculado), pero cada post cuesta tantas escrituras como seguidores tiene el autor y se gastan recursos en usuarios inactivos. Al leer, publicar es barato y no se desperdicia nada en inactivos, pero cada lectura debe consultar y mezclar los posts de todas las cuentas seguidas, lo que es lento y costoso.
2. ¿Cómo funciona el modelo híbrido y qué problema resuelve?
   R: Usa push para la mayoría de las cuentas y pull para las celebridades: sus posts no se distribuyen a millones de feeds, sino que se mezclan al leer el feed de cada seguidor. Resuelve el problema de hot keys, donde un solo post de una celebridad generaría millones de escrituras.
3. ¿Por qué la news feed cache guarda IDs y no posts completos, y por qué solo los últimos N?
   R: Porque un mismo post aparece en millones de feeds: guardar el contenido en cada uno multiplicaría enormemente la memoria; con IDs, el contenido se cachea una vez y se hidrata al leer. Se guardan solo los últimos N porque casi nadie hace scroll muy atrás, así que la tasa de miss es baja y la memoria queda acotada.
4. Estima la memoria de la news feed cache para 100 M de usuarios activos con 800 entradas de 16 bytes.
   R: 100 M × 800 × 16 B = 1,28 × 10¹² B ≈ 1,3 TB, más overhead de estructuras (~50 %) ≈ 2 TB, repartidos en un cluster de cache con réplicas.
5. ¿Qué pasa con un post borrado que ya se distribuyó a millones de feeds?
   R: Sigue presente como ID en las listas precalculadas. Al hidratar el feed, se filtran los IDs de posts borrados o de autores bloqueados, y un proceso asíncrono limpia las listas de forma gradual; así el borrado se refleja de inmediato sin reescribir millones de feeds en el momento.

## Ejercicio

Implementa en TypeScript un `FeedService` en memoria con `follow`, `post`, `getFeed(userId, cursor, limit)` y fan-out híbrido: cuentas con más de `CELEB_THRESHOLD` seguidores no hacen fan-out y sus posts se mezclan al leer. Las listas de feed guardan solo IDs con un máximo de 500 entradas. Pruebas: un seguidor normal ve el post de un amigo; un post de celebridad aparece en el feed sin haber sido escrito en la lista del seguidor; el orden es cronológico inverso al mezclar ambas fuentes; la paginación por cursor no repite ni salta posts aunque se publiquen posts nuevos entre páginas. Terminado cuando las cuatro pruebas pasen.

## Explícalo con tus palabras

Explica la diferencia entre fan-out al escribir y al leer con la imagen de un repartidor de periódicos que deja el diario en cada casa frente a un kiosco donde cada vecino va a buscarlo.
