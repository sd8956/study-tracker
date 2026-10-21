---
title: De un servidor a millones de usuarios
kind: lesson
hours: 2
sources: System Design Interview (Alex Xu), cap. 1 "Scale from zero to millions of users" (pp. 5–33) | System Design Primer, "Performance vs scalability" y "System design topics: start here" | karanpratapsingh/system-design, cap. I "Scalability"
links: Primer — Performance vs scalability | https://github.com/donnemartin/system-design-primer#performance-vs-scalability ; Primer — System design topics: start here | https://github.com/donnemartin/system-design-primer#system-design-topics-start-here ; Karan — Scalability | https://github.com/karanpratapsingh/system-design#scalability ; Primer — Scaling to millions of users on AWS | https://github.com/donnemartin/system-design-primer/blob/master/solutions/system_design/scaling_aws/README.md
---

## Objetivo

Entender la secuencia típica de evolución de una arquitectura web, desde un único servidor hasta un sistema multi-datacenter con cache, CDN, colas y sharding, y saber qué problema concreto resuelve cada pieza que se agrega.

## Estudio

### Por qué empezar por la evolución y no por el diagrama final

Cuando ves el diagrama de arquitectura de una empresa grande, ves decenas de cajas y flechas. Es tentador copiarlo. El error es que cada caja existe porque en algún momento hubo un **dolor concreto** que la justificó: un servidor que se caía, una base de datos que no daba abasto, usuarios lejanos con páginas lentas. Si agregas cajas sin dolor, pagas su costo (operación, latencia, complejidad, fallos nuevos) sin recibir su beneficio.

Por eso esta sesión recorre la evolución paso a paso. En cada paso hazte tres preguntas: ¿qué se rompe con la carga actual?, ¿qué pieza lo resuelve?, ¿qué nuevo problema introduce esa pieza? Esta forma de pensar es exactamente la que vas a usar en todos los casos de estudio del módulo.

### Rendimiento frente a escalabilidad

Antes de escalar, separa dos ideas que se confunden a menudo:

- Tienes un problema de **rendimiento** (performance) si el sistema es lento **para un solo usuario**. Una consulta sin índice que tarda 3 segundos es lenta aunque solo haya una persona usando la app.
- Tienes un problema de **escalabilidad** si el sistema es rápido para un usuario pero se degrada **cuando crece la carga**. La misma consulta con índice tarda 5 ms, pero con 10.000 usuarios concurrentes el servidor satura su CPU y todo se vuelve lento.

Un servicio es escalable si, al agregar recursos, el rendimiento aumenta de forma aproximadamente proporcional. Si duplicas servidores y solo ganas un 10 % de capacidad, hay un cuello de botella compartido (casi siempre la base de datos o un lock global) que no escala.

### Paso 0: todo en un servidor

```
 Usuario ──DNS──> IP pública
    │
    └──HTTP──> [ Servidor único: web app + base de datos + archivos ]
```

El flujo de una petición es: el navegador resuelve `api.misitio.com` con DNS (normalmente un servicio de terceros), obtiene una IP, envía la petición HTTP a esa IP y recibe HTML o JSON. El tráfico llega de dos fuentes: la aplicación web (HTML/JS renderizado) y la app móvil (que habla HTTP y casi siempre recibe JSON).

Ventajas: es barato, fácil de desplegar y fácil de depurar. Problemas: es un **single point of failure** (SPOF) y todos los componentes compiten por la misma CPU, memoria y disco. Un reporte pesado en la base de datos ralentiza las páginas web.

### Paso 1: separar la capa de datos

El primer movimiento es poner la base de datos en su propio servidor. Ahora la **capa web** (web tier) y la **capa de datos** (data tier) pueden escalarse por separado: la web necesita CPU para renderizar y serializar; la base de datos necesita RAM y discos rápidos.

Aquí aparece la pregunta de qué base de datos usar. La recomendación por defecto es una **relacional** (PostgreSQL, MySQL): tiene décadas de madurez, soporta joins y transacciones, y la mayoría de los datos de negocio son relacionales. Considera una **no relacional** cuando:

| Señal | Por qué apunta a NoSQL |
| --- | --- |
| Necesitas latencia muy baja con acceso por clave | Un key-value store evita el planificador de consultas |
| Los datos no tienen estructura fija o no hay relaciones | Un document store evita migraciones constantes |
| Solo serializas y deserializas objetos (JSON) | No aprovechas el modelo relacional |
| Volumen enorme de datos con escrituras masivas | Wide-column stores particionan y escriben de forma nativa |

Como ya viste en DDIA, la elección real depende del modelo de datos y del patrón de acceso; aquí basta con saber justificarla.

### Paso 2: escalar vertical u horizontalmente

- **Escalado vertical** (scale up): comprar una máquina más grande. Es simple: no cambias código. Pero tiene un **techo duro** (no existe una máquina con RAM infinita), el costo crece de forma no lineal en la gama alta y no te da redundancia: si esa máquina cae, cae todo.
- **Escalado horizontal** (scale out): agregar más máquinas. No tiene techo teórico y da redundancia, pero exige que la aplicación sepa repartirse entre nodos.

Regla práctica: escala verticalmente mientras sea barato y suficiente; diseña desde el principio para poder escalar horizontalmente la capa web.

### Paso 3: load balancer y redundancia en la capa web

```
              ┌──────────────── IP pública
 Usuarios ──> [ Load balancer ]
                 │ IP privada     │ IP privada
           [ Web 1 ]          [ Web 2 ]
                 \               /
                  [ Base de datos ]
```

El load balancer recibe todo el tráfico en su IP pública y lo reparte entre servidores web que solo tienen IPs privadas. Esto da tres beneficios:

1. **Failover**: si `Web 1` cae, el balanceador deja de enviarle tráfico (lo detecta con health checks) y todo va a `Web 2`.
2. **Capacidad elástica**: si el tráfico crece, agregas `Web 3` al pool sin que los clientes se enteren.
3. **Seguridad**: los servidores web no son alcanzables directamente desde internet.

El nuevo problema: el load balancer mismo es un SPOF si hay uno solo. En producción se usan pares activo-pasivo o servicios gestionados que ya son redundantes.

### Paso 4: replicación de la base de datos

La capa de datos sigue siendo un único punto de fallo. La solución típica es la **replicación líder-seguidor** (el libro y el primer usan los términos históricos master/slave): el líder recibe todas las escrituras y las réplicas reciben copias y atienden lecturas.

```
           escrituras            lecturas
 Web ───────────────> [Líder] ───replica──> [Réplica 1]
     \                                  └──> [Réplica 2]
      └──────────── lecturas ───────────────────┘
```

Por qué funciona: la mayoría de las aplicaciones leen mucho más de lo que escriben (ratios 10:1 o 100:1 son comunes). Repartir lecturas entre réplicas multiplica la capacidad de lectura. Además ganas **confiabilidad** (los datos existen en varias máquinas, idealmente en varias zonas) y **disponibilidad** (si una réplica cae, las lecturas van a otra; si cae el líder, se promueve una réplica).

En DDIA estudiaste lo difícil: el **replication lag**, la promoción con datos incompletos y el split brain. Aquí recuerda la consecuencia práctica: una lectura justo después de una escritura puede no ver el dato si va a una réplica atrasada. Patrones como "read-your-writes" (leer del líder durante unos segundos después de escribir) mitigan el problema.

### Paso 5: cache

Cada petición que va a la base de datos cuesta milisegundos y consume capacidad compartida. Una **cache** en memoria (Redis, Memcached) guarda resultados frecuentes:

```
 Web ──1. GET key──> [Cache]
  │   <──hit: dato──
  │   miss:
  └──2. SELECT───> [BD] ──3. SET key──> [Cache]
```

Este patrón se llama **cache-aside** o read-through desde la aplicación. Consideraciones que el libro destaca y que vas a ver en detalle en la sesión 05:

- **Cuándo usarla**: datos que se leen mucho y cambian poco.
- **Expiración (TTL)**: muy corta y la cache sirve de poco; muy larga y sirves datos viejos.
- **Consistencia**: base de datos y cache no se actualizan en una sola transacción; habrá ventanas de inconsistencia.
- **SPOF**: un único nodo de cache que cae puede enviar todo el tráfico de golpe a la base de datos. Usa varios nodos y sobredimensiona memoria.
- **Política de expulsión** (eviction): LRU es la más común; LFU y FIFO existen para otros patrones.

### Paso 6: CDN para contenido estático

Imágenes, CSS, JS y videos no deberían salir de tus servidores web. Una **CDN** es una red de servidores distribuidos geográficamente que guarda copias del contenido estático cerca del usuario. El navegador pide `https://cdn.misitio.com/logo.png`; si el nodo CDN cercano lo tiene, responde en pocos milisegundos; si no, lo pide al origen, lo guarda con un TTL y lo sirve.

Consideraciones: costo (pagas por transferencia; no subas a la CDN contenido que casi nadie pide), TTL apropiado, plan de contingencia si la CDN falla (el cliente debe poder pedir al origen) e invalidación (por API del proveedor o, mejor, versionando los nombres de archivo: `app.v42.js`).

### Paso 7: capa web sin estado

Para escalar horizontalmente la capa web, cualquier servidor debe poder atender cualquier petición. Si la sesión del usuario vive en la memoria de `Web 1`, el balanceador tiene que enviar siempre a ese usuario a `Web 1` (**sticky sessions**). Eso complica agregar y quitar servidores y hace que un fallo pierda sesiones.

La solución es **sacar el estado** a un almacenamiento compartido: Redis, una base NoSQL o una base relacional. Los servidores web quedan **stateless**: los puedes crear y destruir según la carga (autoscaling).

```
 [LB] ──> [Web 1] ─┐
      └─> [Web 2] ─┼──> [Almacén de sesiones compartido]
      └─> [Web N] ─┘
```

### Paso 8: varios data centers

Con usuarios en varios continentes y requisitos de disponibilidad altos, despliegas en dos o más regiones. Un **DNS geográfico** (GeoDNS) dirige a cada usuario al centro de datos más cercano. Si una región cae, todo el tráfico se redirige a la otra.

Retos técnicos:

1. **Redirección de tráfico**: GeoDNS y health checks globales.
2. **Sincronización de datos**: cada región necesita los datos; replicar entre regiones agrega latencia (decenas a cientos de ms) y conflictos.
3. **Pruebas y despliegue**: necesitas herramientas automatizadas para desplegar de forma consistente en todas las regiones.

### Paso 9: cola de mensajes para desacoplar

Algunas tareas no necesitan hacerse dentro de la petición del usuario: redimensionar una foto, enviar un email, generar un PDF. Una **cola de mensajes** desacopla al productor (la web, que publica "procesar foto 123") del consumidor (workers que procesan a su ritmo).

```
 [Web] ──publica──> [ Cola ] ──consume──> [Worker 1..N]
```

Beneficios: si los workers están caídos, los mensajes esperan; si la cola crece, agregas workers; productor y consumidor escalan por separado. Profundizarás en la sesión 09.

### Paso 10: logs, métricas y automatización

Un sistema de muchos servidores no se opera mirando una consola. Necesitas:

- **Logs** centralizados para buscar errores entre todas las máquinas.
- **Métricas** de host (CPU, memoria, disco), agregadas (rendimiento de la capa de base de datos, de cache) y de negocio (usuarios activos, retención, ingresos).
- **Automatización**: integración continua, despliegues automáticos y pruebas en cada cambio.

### Paso 11: escalar la base de datos (sharding)

Cuando el líder ya no aguanta las escrituras o los datos no caben en una máquina, partes los datos en **shards**: cada shard tiene el mismo esquema pero un subconjunto de filas. Ejemplo con `user_id % 4`:

```
 user_id % 4 = 0 → Shard 0     user_id % 4 = 2 → Shard 2
 user_id % 4 = 1 → Shard 1     user_id % 4 = 3 → Shard 3
```

La decisión clave es la **sharding key**: debe repartir los datos de forma pareja y permitir que las consultas frecuentes vayan a un solo shard. Problemas que introduce:

| Problema | Descripción | Mitigación típica |
| --- | --- | --- |
| Resharding | Un shard se llena o crece desigual; hay que redistribuir | Consistent hashing (sesión 08) |
| Celebrity / hotspot | Un shard concentra a usuarios muy populares | Shard dedicado por celebridad, subparticionar |
| Joins entre shards | No hay joins eficientes entre máquinas | Desnormalizar, hacer el join en la aplicación |

DDIA ya te explicó el particionado por rango y por hash; aquí lo importante es reconocer el momento en que el sharding se vuelve necesario y sus costos operativos.

### El diagrama final y el resumen de técnicas

```
                 [GeoDNS]
            ┌───────┴────────┐
        Región A          Región B
        [CDN]               [CDN]
        [LB]                [LB]
   [Web stateless xN]  [Web stateless xN]
     │      │      │
 [Cache] [Cola]  [Sesiones]
     │      │
 [BD shards + réplicas] <══ replicación ══> [BD shards + réplicas]
   [Workers]
   [Logs / métricas / CI-CD]
```

Las técnicas para pasar de cero a millones caben en una lista que conviene memorizar:

1. Capa web sin estado.
2. Redundancia en cada capa.
3. Cache de todo lo que se pueda.
4. Varios data centers.
5. Estáticos en CDN.
6. Sharding de la capa de datos.
7. Separar capas en servicios independientes.
8. Monitorear y automatizar.

### Un ejemplo con números: cuándo cambia el cuello de botella

Para que la evolución no quede abstracta, sigue a una app ficticia de recetas. Supón que cada usuario activo diario (DAU) hace 20 peticiones al día, que el 90 % son lecturas y que el pico es 3 veces el promedio.

**Con 10.000 DAU**: 10.000 × 20 = 200.000 peticiones/día. Un día tiene unos 86.400 s (redondea a 100.000 para estimar): 200.000 / 100.000 ≈ 2 peticiones por segundo (QPS) de promedio y unas 6 en el pico. Un solo servidor modesto atiende cientos de QPS simples. No necesitas nada más que el paso 0 o el paso 1.

**Con 1 M DAU**: 20 M peticiones/día ≈ 200 QPS de promedio, 600 QPS de pico. La capa web empieza a necesitar 2–4 instancias (supón que cada una atiende 200–300 QPS con margen), así que entran el load balancer y la capa stateless. La base de datos recibe unas 540 lecturas/s y 60 escrituras/s en el pico: un buen servidor relacional lo aguanta, pero conviene una réplica para failover y para descargar lecturas.

**Con 20 M DAU**: 400 M peticiones/día ≈ 4.000 QPS de promedio y 12.000 en el pico. Las lecturas en el pico (≈ 10.800/s) ya no tienen sentido contra la base: una cache con 90 % de hit ratio deja pasar unas 1.080 lecturas/s, que un líder con dos réplicas absorbe cómodamente. Las escrituras (≈ 1.200/s en el pico) todavía caben en un líder bien dimensionado.

**Con 200 M DAU**: 12.000 escrituras/s en el pico y varios terabytes por año. Aquí el líder único deja de ser razonable y aparece el sharding. Además, con usuarios en varios continentes, la latencia de red (100–200 ms de ida y vuelta entre continentes) justifica regiones múltiples.

Fíjate en el patrón: cada orden de magnitud mueve el cuello de botella. Primero es la CPU web, luego las lecturas, luego las escrituras y finalmente la geografía. Las técnicas no se aplican todas a la vez; se aplican cuando los números lo piden.

### Trade-offs de cada pieza en una sola tabla

| Pieza | Resuelve | Introduce |
| --- | --- | --- |
| BD separada | Competencia de recursos web vs datos | Latencia de red entre capas |
| Load balancer | SPOF web, capacidad | Otro componente que puede fallar, health checks mal configurados |
| Réplicas | Lecturas, disponibilidad de datos | Replication lag, failover complejo |
| Cache | Latencia y carga de lectura | Datos viejos, invalidación, fallos en cascada |
| CDN | Latencia de estáticos, ancho de banda | Costo por GB, invalidación, dependencia de un proveedor |
| Web stateless | Autoscaling, fallos sin pérdida de sesión | Un almacén de sesiones que también debe ser redundante |
| Multi-región | Latencia global, desastres regionales | Replicación entre regiones, conflictos, despliegues complejos |
| Cola | Picos, tareas lentas, desacople | Procesamiento eventual, mensajes duplicados, monitoreo de backlog |
| Sharding | Escrituras y volumen | Resharding, hotspots, joins y transacciones entre shards |

### Modos de fallo a tener presentes

- **Fallo en cascada**: cae la cache, toda la carga va a la base de datos, la base de datos se satura, las peticiones se acumulan en los servidores web y todo cae. Mitigación: circuit breakers, límites de concurrencia, calentar la cache.
- **Thundering herd**: muchas claves expiran a la vez y miles de peticiones recalculan lo mismo. Mitigación: TTL con jitter, coalescing de peticiones.
- **Promoción con pérdida**: un líder cae antes de replicar y la réplica promovida no tiene las últimas escrituras.
- **Configuración desigual entre regiones**: un despliegue manual deja una región con otra versión.

### Cómo usar esta sesión en una entrevista o en el trabajo

Cuando te pidan "escalar" algo, no saltes al diagrama final. Pregunta la carga actual y la esperada, identifica el cuello de botella (¿CPU web?, ¿lecturas de base de datos?, ¿escrituras?, ¿latencia geográfica?) y agrega **solo** la pieza que lo resuelve, nombrando el costo que introduce. Esa narrativa vale más que cualquier diagrama.

## Conceptos clave

- **Rendimiento vs escalabilidad**: lentitud con un usuario frente a degradación al crecer la carga.
- **Escalado vertical**: más recursos en una máquina; simple pero con techo y sin redundancia.
- **Escalado horizontal**: más máquinas; sin techo práctico, exige diseño distribuido.
- **Load balancer**: reparte tráfico entre servidores y permite failover.
- **Replicación líder-seguidor**: un nodo recibe escrituras y las copia a réplicas que atienden lecturas.
- **Cache-aside**: la aplicación consulta la cache y, si falla, lee de la base y llena la cache.
- **CDN**: red de servidores cercanos al usuario que sirve contenido estático.
- **Capa web stateless**: el estado de sesión vive fuera de los servidores web.
- **GeoDNS**: DNS que resuelve a la región más cercana al usuario.
- **Sharding**: partir los datos horizontalmente entre bases con el mismo esquema.

## Preguntas de repaso

1. ¿Cuál es la diferencia entre un problema de rendimiento y uno de escalabilidad? Da un ejemplo de cada uno.
   R: Rendimiento es lentitud aun con un solo usuario (una consulta sin índice que tarda 3 s). Escalabilidad es que el sistema va bien con poca carga pero se degrada al crecer (la consulta indexada tarda 5 ms, pero con miles de usuarios concurrentes la CPU de la base satura). Un sistema escalable gana capacidad de forma proporcional al agregar recursos.
2. ¿Por qué la capa web debe ser stateless antes de usar autoscaling?
   R: Porque si la sesión vive en la memoria de un servidor, el balanceador debe enviar al usuario siempre a ese servidor (sticky sessions). Agregar o quitar servidores rompería sesiones y un fallo perdería estado. Con el estado en un almacén compartido, cualquier servidor atiende cualquier petición y se pueden crear o destruir libremente.
3. ¿Qué gana un sistema al agregar réplicas de lectura y qué problema nuevo introduce?
   R: Gana capacidad de lectura (las lecturas se reparten), confiabilidad (copias de los datos) y disponibilidad (failover a otra réplica o promoción). Introduce replication lag: una lectura en una réplica puede no ver una escritura reciente, y una promoción del líder puede perder escrituras no replicadas.
4. Nombra tres problemas que introduce el sharding y una mitigación para cada uno.
   R: Resharding cuando un shard se llena o crece desigual (consistent hashing para mover pocas claves); hotspots por celebridades (shard dedicado o subparticionar la clave); joins entre shards (desnormalizar o hacer el join en la aplicación).
5. ¿Qué es un fallo en cascada provocado por la cache y cómo se mitiga?
   R: Si la cache cae o se vacía, toda la carga va de golpe a la base de datos, que se satura; las peticiones se acumulan en la capa web y el sistema completo cae. Se mitiga con varios nodos de cache, calentamiento previo, límites de concurrencia, circuit breakers y TTL con jitter para evitar expiraciones simultáneas.

## Ejercicio

Toma una app que conozcas (por ejemplo, este mismo Study Tracker) y escribe su "historia de escalado" en una tabla de 6 filas: carga (1 usuario, 1.000, 100.000, 1 M, 10 M, 100 M), cuello de botella esperado, pieza que agregas y costo que introduce esa pieza. Dibuja en ASCII el diagrama de la última fila. Terminado cuando cada pieza esté justificada por un cuello de botella concreto de la fila anterior y ninguna fila agregue más de dos piezas.

## Explícalo con tus palabras

Explica a alguien que no programa por qué una tienda online no puede simplemente "comprar un servidor más grande" para siempre.
