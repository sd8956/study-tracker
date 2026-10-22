---
title: Cache y CDN
kind: lesson
hours: 2
sources: System Design Primer, "Cache" (niveles, cache-aside, write-through, write-behind, refresh-ahead) y "Content delivery network" | karanpratapsingh/system-design, cap. I "Caching" y "Content Delivery Network (CDN)" | System Design Interview (Alex Xu), cap. 1, "Cache" y "Content delivery network" (pp. 12–17)
links: Primer — Cache | https://github.com/donnemartin/system-design-primer#cache ; Primer — When to update the cache | https://github.com/donnemartin/system-design-primer#when-to-update-the-cache ; Primer — Content delivery network | https://github.com/donnemartin/system-design-primer#content-delivery-network ; Karan — Caching | https://github.com/karanpratapsingh/system-design#caching ; Karan — CDN | https://github.com/karanpratapsingh/system-design#content-delivery-network-cdn
---

## Objetivo

Decidir qué cachear, dónde y con qué estrategia de escritura e invalidación; dimensionar una cache con números; reconocer y mitigar los fallos clásicos (stampede, hot keys, datos viejos), y elegir entre CDN push y pull.

## Estudio

### Por qué funciona una cache

Una cache es un almacenamiento pequeño y rápido que guarda una copia de datos que viven en un almacenamiento más grande y lento. Funciona por el **principio de localidad**: lo que se pidió hace poco probablemente se vuelva a pedir, y unos pocos elementos concentran la mayoría de los accesos. En casi cualquier producto, una fracción pequeña de los objetos (el 20 % o menos) recibe la gran mayoría de las lecturas (el 80 % o más).

Los números explican el beneficio. Leer de memoria local cuesta del orden de 100 ns; leer de Redis dentro del mismo datacenter, alrededor de 0,5–1 ms incluyendo la red; una consulta a una base relacional bien indexada, de 1 a 10 ms, y una consulta compleja, mucho más. Pero el beneficio más importante no es la latencia: es la **capacidad**. Un nodo de Redis atiende fácilmente más de 100.000 operaciones por segundo; una base relacional con consultas reales, unos pocos miles. La cache protege a la base.

### Dónde cachear: la cadena completa

```
 [Navegador / app]  cache HTTP, localStorage
        │
 [CDN]              estáticos, a veces respuestas dinámicas
        │
 [Reverse proxy]    Varnish/NGINX: páginas o respuestas completas
        │
 [Aplicación]       cache local en memoria del proceso
        │
 [Cache distribuida] Redis / Memcached
        │
 [Base de datos]    buffer pool interno, cache de consultas
```

Cada nivel tiene un costo distinto de invalidación. Cuanto más cerca del usuario, más rápido y más barato, pero más difícil de invalidar: no puedes borrar algo del navegador de un usuario.

- **Cliente**: cabeceras `Cache-Control` y `ETag`. Ideal para recursos versionados (`app.3f2a.js` con `max-age` de un año).
- **CDN**: contenido estático y, cada vez más, respuestas dinámicas cortas.
- **Reverse proxy**: páginas completas para usuarios anónimos.
- **Aplicación (local)**: muy rápida, pero cada servidor tiene su propia copia; invalidarla en todos es difícil.
- **Distribuida**: compartida por todos los servidores; es la cache "de manual" en diseño de sistemas.
- **Base de datos**: ya cachea páginas en memoria; ajustar su configuración puede dar mucho rendimiento gratis.

### Qué cachear

Hay dos grandes familias:

1. **Resultados de consultas**: la clave es un hash de la consulta. Es fácil de implementar, pero muy difícil de invalidar: si cambia una fila, ¿qué consultas cacheadas la incluían?
2. **Objetos**: la aplicación arma un objeto (el perfil de usuario con sus contadores, por ejemplo) y lo cachea bajo una clave clara (`user:123`). Cuando cambian los datos subyacentes, borra esa clave. Es el enfoque recomendado.

Buenos candidatos: sesiones, páginas renderizadas, timelines o feeds, grafos sociales, contadores, configuraciones, resultados de cálculos caros. Malos candidatos: datos que cambian en cada lectura, datos con muy poca repetición de accesos (patrones aleatorios) y casos donde leer de la cache cuesta lo mismo que leer de la fuente.

Evita la cache basada en archivos del disco local del servidor: complica el autoscaling y la clonación de servidores.

### Estrategias de lectura y escritura

**Cache-aside (lazy loading).** La aplicación habla con ambos:

```ts
async function getUser(id: string): Promise<User> {
  const cached = await cache.get(`user:${id}`);
  if (cached) return JSON.parse(cached);             // hit
  const user = await db.query("SELECT ... WHERE id = $1", [id]); // miss
  await cache.set(`user:${id}`, JSON.stringify(user), { ttlSeconds: 300 });
  return user;
}

async function updateUser(id: string, data: Partial<User>) {
  await db.update(id, data);
  await cache.del(`user:${id}`);                     // invalidar, no actualizar
}
```

Solo se cachea lo que se pide. Desventajas: cada miss cuesta tres viajes (cache, base, cache); los datos pueden quedar viejos hasta que expire el TTL; un nodo nuevo empieza vacío. Fíjate en que al escribir se **borra** la clave en lugar de actualizarla: así evitas que dos escrituras concurrentes dejen en la cache un valor más viejo que el de la base.

**Write-through.** La aplicación escribe en la cache y la cache escribe de forma síncrona en la base. Las lecturas posteriores siempre encuentran datos frescos. Desventajas: cada escritura es más lenta y se cachean datos que quizás nadie lea (mitígalo con TTL).

**Write-behind (write-back).** La aplicación escribe en la cache y responde; la cache persiste en la base de forma asíncrona, a menudo en lotes. Escrituras muy rápidas y alto throughput. Riesgo: si la cache cae antes de persistir, **pierdes datos**. Mitigación: replicar la cache antes de confirmar. Útil para contadores de vistas o "me gusta", donde perder unos pocos es aceptable.

**Write-around.** Se escribe directo en la base, sin tocar la cache; la cache se llena solo en lecturas. Evita llenar la cache con datos que no se leen, pero la primera lectura tras escribir es un miss.

**Refresh-ahead.** La cache renueva automáticamente las claves populares antes de que expiren. Reduce la latencia si predices bien qué se va a pedir; si predices mal, gastas recursos en vano.

| Estrategia | Latencia de lectura | Latencia de escritura | Frescura | Riesgo principal |
| --- | --- | --- | --- | --- |
| Cache-aside | Alta en miss | Normal | TTL o invalidación | Datos viejos, cache fría |
| Write-through | Baja | Alta | Alta | Cachear lo que no se lee |
| Write-behind | Baja | Muy baja | Alta en cache | Pérdida de datos |
| Write-around | Alta tras escribir | Normal | Alta | Misses frecuentes |
| Refresh-ahead | Baja | Normal | Alta si predices bien | Trabajo desperdiciado |

### Expulsión (eviction)

La memoria es limitada; cuando se llena, hay que expulsar algo:

- **LRU** (Least Recently Used): expulsa lo que hace más tiempo no se usa. El default razonable.
- **LFU** (Least Frequently Used): expulsa lo menos usado en total. Bueno con popularidad estable; malo cuando la popularidad cambia (un elemento viejo con muchos accesos históricos ocupa espacio).
- **FIFO**: expulsa lo más antiguo sin mirar el uso. Simple, rara vez óptimo.
- **Random**: sorprendentemente aceptable y barato.

El **TTL** es complementario: define cuánto tiempo puede vivir una entrada aunque haya espacio.

### Dimensionar una cache con números

Supón 50 M de usuarios, perfil de 2 KB cada uno, y que el 20 % de los usuarios genera el 80 % de las lecturas. Cachear ese 20 %: `50 M × 0,2 × 2 KB = 20 GB`. Con un factor de 1,5 por sobrecarga de estructuras y fragmentación, ~30 GB: cabe en dos o tres nodos de Redis de 16 GB, más réplicas.

Ahora la carga: 100.000 lecturas/s de perfiles. Con un **hit ratio** del 95 %, la base recibe 5.000 lecturas/s. Si el hit ratio cae al 80 %, la base recibe 20.000/s: **cuatro veces más** por una caída de 15 puntos. Por eso el hit ratio es una métrica crítica que debes monitorear, y por eso perder la cache es tan peligroso.

### Redis frente a Memcached

Las dos caches distribuidas más usadas tienen filosofías distintas:

| Aspecto | Memcached | Redis |
| --- | --- | --- |
| Modelo de datos | Clave → blob de bytes | Strings, hashes, listas, sets, sorted sets, streams, bitmaps, HyperLogLog |
| Concurrencia | Multihilo | Ejecución de comandos en un hilo principal (muy rápida, sin locks) |
| Persistencia | No | Opcional (snapshots RDB, log AOF) |
| Replicación y cluster | No nativa; reparto en el cliente | Réplicas, Sentinel para failover, Redis Cluster |
| Usos típicos | Cache simple de objetos | Cache, sesiones, rankings, rate limiters, colas ligeras, pub/sub |

Las estructuras de Redis permiten resolver en la cache problemas que de otro modo irían a la base: un **sorted set** mantiene un ranking (el leaderboard de un juego o el "top 10" de una búsqueda); un **contador atómico** (`INCR`) implementa un rate limiter (sesión 16); una **lista** guarda los últimos N elementos de un feed (sesión 22). Pero recuerda: aunque Redis pueda persistir, trátalo como almacenamiento volátil salvo que hayas diseñado conscientemente su durabilidad.

### Cache HTTP: lo que el navegador y la CDN hacen por ti

Las cabeceras HTTP controlan la cache de clientes, proxies y CDNs sin código adicional:

- `Cache-Control: public, max-age=31536000, immutable` para assets versionados: se cachean un año y no se revalidan.
- `Cache-Control: private, max-age=60` para respuestas personalizadas: solo el navegador puede cachearlas, nunca una CDN compartida (si una CDN cachea la página privada de un usuario, otro usuario podría verla: un incidente de seguridad clásico).
- `Cache-Control: no-store` para datos sensibles.
- `ETag` y `If-None-Match`: el cliente pregunta "¿cambió?" y el servidor responde `304 Not Modified` sin cuerpo si no cambió. Ahorra ancho de banda aunque no ahorra el RTT.
- `stale-while-revalidate`: permite servir una copia algo vieja mientras se obtiene la nueva en segundo plano, ocultando la latencia del origen.

### Un caso práctico: cachear un timeline

Una red social muestra a cada usuario los últimos 50 posts de las cuentas que sigue. Opciones:

1. **Cachear la página renderizada por usuario**: rapidísimo, pero cualquier post nuevo invalida miles de páginas.
2. **Cachear objetos por separado**: `post:{id}` (inmutable salvo ediciones, TTL largo) y `timeline:{userId}` como una lista de IDs (se actualiza al publicar). Al leer, obtienes la lista de IDs y luego haces un `MGET` de los posts. Los posts se comparten entre todos los timelines que los incluyen, así que se cachean una sola vez.

La segunda opción separa lo que cambia mucho (la lista de IDs) de lo que cambia poco (el contenido del post), y es la base del diseño de news feed de la sesión 22. Generaliza la lección: **cachea las piezas con distinto ritmo de cambio por separado** y ensámblalas al leer.

### Cache distribuida: repartir las claves

Una cache de 300 GB no cabe en un nodo. Las claves se reparten entre nodos, típicamente con **consistent hashing** (sesión 17) para que agregar o quitar un nodo mueva solo una fracción pequeña de claves. Redis Cluster usa 16.384 *hash slots* asignados a nodos; Memcached delega el reparto al cliente.

### Fallos clásicos y cómo mitigarlos

**Cache stampede (thundering herd).** Una clave muy popular expira; 5.000 peticiones simultáneas hacen miss y todas consultan la base para recalcular lo mismo. Mitigaciones:

- **Request coalescing / single flight**: solo una petición recalcula; las demás esperan su resultado.
- **Lock** con `SET NX` en la cache mientras se recalcula.
- **TTL con jitter**: en vez de 300 s exactos, 300 ± 30 s, para que las claves no expiren juntas.
- **Recalcular antes de expirar** (refresh-ahead o expiración probabilística temprana).

**Hot key.** Una sola clave (el perfil de una celebridad) recibe tanto tráfico que satura el nodo de cache que la guarda. Mitigaciones: cache local de pocos segundos en cada servidor de aplicación, o replicar la clave con sufijos (`celeb:1#0` … `celeb:1#9`) y leer uno al azar.

**Cache penetration.** Peticiones a claves que no existen (por error o ataque) siempre hacen miss y siempre van a la base. Mitigaciones: cachear también el "no existe" con un TTL corto, o un **Bloom filter** que descarta claves imposibles.

**Avalancha por caída de la cache.** El nodo cae y toda la carga va a la base (ya lo viste en la sesión 01). Mitigaciones: réplicas, circuit breakers y límites de concurrencia hacia la base, calentamiento antes de poner un nodo en servicio.

**Datos inconsistentes.** Orden de operaciones mal resuelto: escribes en la base, otro proceso lee el valor viejo y lo vuelve a cachear después de tu invalidación. Mitigaciones: invalidar en lugar de actualizar, TTL como red de seguridad, *delayed double delete* (borrar otra vez unos cientos de ms después) o invalidación basada en el log de cambios de la base (CDC).

### Calentar, observar y versionar la cache

Tres prácticas operativas que separan una cache de manual de una cache de producción:

- **Calentamiento** (warm-up): antes de poner en servicio un nodo nuevo o tras un despliegue que vacía la cache, precarga las claves más populares (por ejemplo, reproduciendo las claves más leídas de la última hora). Así evitas que el primer minuto de tráfico caiga entero sobre la base.
- **Observabilidad**: monitorea hit ratio por tipo de clave, memoria usada, número de expulsiones por segundo, latencia p99 de la cache y las claves más calientes. Un aumento de expulsiones suele anticipar una caída del hit ratio: la cache se quedó chica para el working set.
- **Versionado de claves**: si cambias el formato del objeto cacheado (agregas un campo), incluye una versión en la clave (`user:v2:123`). Durante el despliegue, los servidores viejos y nuevos leen claves distintas y nadie deserializa un formato que no entiende. La desventaja es que la versión nueva arranca con la cache fría, así que despliega de forma gradual.

Un último matiz sobre consistencia: la cache convierte casi cualquier sistema en **eventualmente consistente** para lecturas. Si el producto exige que un usuario vea su propio cambio de inmediato (cambió su foto de perfil), combina invalidación con *read-your-writes*: durante unos segundos después de escribir, las lecturas de ese usuario sobre ese dato saltan la cache.

### CDN en detalle

Una **CDN** es una red global de servidores proxy (puntos de presencia, PoPs) que sirven contenido desde ubicaciones cercanas al usuario. Mejora el rendimiento de dos formas: el usuario recibe los bytes desde cerca (menos RTT) y tus servidores no atienden esas peticiones.

```
 Usuario en Bogotá ──> [PoP Bogotá] ── hit ──> responde en ~10 ms
                            │ miss
                            └──> [Origen en Virginia] (~80 ms) → guarda copia con TTL
```

**Pull CDN.** El contenido se queda en tu servidor; la CDN lo trae la primera vez que alguien lo pide y lo guarda según el TTL. La primera petición es lenta. Ocupa poco almacenamiento en la CDN, pero puede volver a traer archivos que no cambiaron si el TTL expira. Encaja con sitios de **mucho tráfico**, donde lo popular se mantiene siempre caliente.

**Push CDN.** Tú subes el contenido a la CDN cuando cambia y controlas la expiración. Encaja con sitios de **poco tráfico** o contenido que cambia poco: se sube una vez y no se vuelve a traer.

Desventajas de las CDNs: costo por GB transferido (que hay que comparar con el costo de servirlo tú), contenido viejo si cambia antes del TTL, necesidad de reescribir URLs hacia el dominio de la CDN, y dependencia de un proveedor: diseña un plan B por si falla (el cliente puede recurrir al origen).

**Invalidación en la CDN**: purgar por API es lento y a veces cuesta dinero. La técnica preferida es **versionar nombres**: `logo.png?v=7` o `logo.7c1e.png`. Al cambiar el archivo cambia la URL; el viejo simplemente deja de pedirse.

**CDN para contenido dinámico**: muchas CDNs aceleran también respuestas dinámicas: mantienen conexiones calientes con el origen, terminan TLS cerca del usuario y pueden cachear respuestas de API por pocos segundos (*micro-caching*), algo muy útil ante picos.

### Checklist para usar cache en un diseño

1. ¿Qué dato, con qué ratio lectura/escritura y qué popularidad?
2. ¿Cuánta obsolescencia tolera el producto (segundos, minutos, nunca)?
3. ¿Qué estrategia de escritura y cómo se invalida?
4. ¿Cuánta memoria y qué hit ratio esperas? ¿Qué pasa con la base si el hit ratio cae?
5. ¿Qué pasa si la cache entera cae?

## Conceptos clave

- **Hit ratio**: fracción de lecturas atendidas por la cache.
- **Cache-aside**: la aplicación lee de la cache y, ante un miss, lee de la base y llena la cache.
- **Write-through**: escritura síncrona en cache y base.
- **Write-behind**: escritura en cache y persistencia asíncrona; rápida pero con riesgo de pérdida.
- **TTL**: tiempo de vida de una entrada.
- **LRU**: expulsa la entrada usada hace más tiempo.
- **Cache stampede**: muchas peticiones recalculan a la vez una clave que expiró.
- **Hot key**: clave tan popular que satura un nodo.
- **Pull CDN / Push CDN**: la CDN trae el contenido bajo demanda / tú lo subes cuando cambia.
- **Versionado de assets**: cambiar la URL de un archivo al cambiar su contenido para evitar invalidaciones.

## Preguntas de repaso

1. ¿Por qué en cache-aside se recomienda borrar la clave al escribir en vez de actualizarla?
   R: Porque con escrituras concurrentes el orden de llegada a la cache puede diferir del orden en la base: una escritura vieja podría dejar su valor en la cache después de una más nueva. Borrar obliga a que la siguiente lectura traiga el valor actual de la base, reduciendo la ventana de inconsistencia.
2. Si una base soporta 8.000 lecturas/s y tu tráfico es de 120.000 lecturas/s, ¿qué hit ratio mínimo necesitas y qué implica?
   R: La base solo puede recibir 8.000/120.000 ≈ 6,7 % de las lecturas, así que necesitas un hit ratio de al menos 93,3 %, y en la práctica más para tener margen. Implica que la cache es crítica: si cae o se vacía, la base colapsa, así que necesitas réplicas, calentamiento y límites de concurrencia.
3. ¿Qué es un cache stampede y nombra dos mitigaciones?
   R: Cuando una clave popular expira y muchas peticiones simultáneas hacen miss y recalculan el mismo valor contra la base, saturándola. Mitigaciones: request coalescing o un lock para que solo una petición recalcule, TTL con jitter, y refrescar antes de la expiración.
4. ¿Cuándo elegirías una push CDN y cuándo una pull CDN?
   R: Push para sitios de poco tráfico o contenido que cambia poco, porque se sube una vez y no se vuelve a traer periódicamente. Pull para sitios de mucho tráfico, porque la CDN mantiene caliente lo popular automáticamente y no tienes que gestionar la subida, aceptando que la primera petición de cada objeto es lenta.
5. ¿Qué es write-behind y para qué tipo de dato lo usarías?
   R: Es escribir en la cache, responder de inmediato y persistir en la base de forma asíncrona, a menudo en lotes. Da escrituras muy rápidas pero puede perder datos si la cache cae antes de persistir. Sirve para datos donde perder algunas actualizaciones es tolerable, como contadores de vistas o "me gusta".

## Ejercicio

Implementa en TypeScript una `LruCache<K, V>` con capacidad máxima, TTL por entrada y un método `getOrLoad(key, loader)` que haga request coalescing: si llegan 100 llamadas concurrentes con la misma clave en miss, `loader` debe ejecutarse una sola vez. Escribe pruebas que verifiquen la expulsión LRU, la expiración por TTL y el coalescing (cuenta las llamadas a `loader`). Terminado cuando las tres pruebas pasen y `get`/`set` sean O(1).

## Explícalo con tus palabras

Explica qué es una cache usando la imagen de tener a mano en el escritorio los cinco libros que más consultas en vez de ir a la biblioteca cada vez.
