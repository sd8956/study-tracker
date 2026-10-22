---
title: Bases de datos y almacenamiento en la práctica
kind: lesson
hours: 2
sources: System Design Primer, "Database" (RDBMS, federation, sharding, denormalization, SQL tuning, NoSQL, SQL or NoSQL) | karanpratapsingh/system-design, cap. I "Storage"; cap. II "SQL databases", "NoSQL databases", "SQL vs NoSQL databases", "Indexes", "Normalization and Denormalization", "Sharding" y "Database Federation" | System Design Interview (Alex Xu), cap. 1, "Database" y "Database scaling" (pp. 6–7, 28–31)
links: Primer — Database | https://github.com/donnemartin/system-design-primer#database ; Primer — SQL or NoSQL | https://github.com/donnemartin/system-design-primer#sql-or-nosql ; Karan — Storage | https://github.com/karanpratapsingh/system-design#storage ; Karan — NoSQL databases | https://github.com/karanpratapsingh/system-design#nosql-databases ; Karan — SQL vs NoSQL | https://github.com/karanpratapsingh/system-design#sql-vs-nosql-databases ; Karan — Database Federation | https://github.com/karanpratapsingh/system-design#database-federation ; Karan — Normalization and Denormalization | https://github.com/karanpratapsingh/system-design#normalization-and-denormalization
---

## Objetivo

Elegir y justificar el almacenamiento de cada dato en un diseño: relacional, key-value, documento, wide-column, grafo, series de tiempo u object storage; y escalar la capa de datos con la secuencia correcta de técnicas (índices, réplicas, federación, desnormalización, sharding).

## Estudio

### Qué ya sabes y qué agrega esta sesión

En el módulo 04 estudiaste por dentro los motores de almacenamiento (B-trees, LSM-trees), la replicación, el particionado y las transacciones. Esta sesión no repite eso. Su pregunta es otra: **en un diagrama de diseño, qué caja de almacenamiento pones para cada tipo de dato y cómo la escalas**. Un buen diseño casi nunca usa una sola base de datos: usa la adecuada para cada patrón de acceso (*polyglot persistence*).

### Tipos de almacenamiento físico

Antes de las bases de datos, los bloques más bajos:

| Tipo | Qué es | Acceso | Uso en diseños |
| --- | --- | --- | --- |
| Block storage | Disco "crudo" dividido en bloques que se monta en una máquina | Muy rápido, bajo nivel | Disco de una base de datos o de una VM |
| File storage | Sistema de archivos jerárquico compartido por red (NAS, NFS) | Rutas y carpetas | Archivos compartidos entre servidores |
| Object storage | Objetos inmutables con clave y metadatos en un espacio plano, vía HTTP (S3, GCS) | API HTTP, alto throughput, latencia mayor | Fotos, videos, backups, archivos de usuarios, data lakes |
| HDFS | Sistema de archivos distribuido para procesamiento masivo | Lectura secuencial de archivos grandes | Big data, batch |

**RAID** combina varios discos para ganar rendimiento o redundancia: RAID 0 reparte (rápido, sin redundancia), RAID 1 duplica (espejo), RAID 5/6 usa paridad, RAID 10 combina espejo y reparto.

Regla de oro para tus diseños: **los archivos binarios grandes (imágenes, video, documentos) van a object storage**, y la base de datos guarda solo su metadato y su URL. Guardar BLOBs grandes dentro de una base relacional infla backups, réplicas y caches sin beneficio.

### La familia relacional

Una base relacional (PostgreSQL, MySQL) organiza datos en tablas con esquema, permite joins y ofrece transacciones ACID. Es la opción por defecto para datos de negocio: usuarios, pedidos, pagos, inventario. Herramientas que aparecen a menudo en diseños:

- **Índices**: aceleran búsquedas a costa de espacio y de escrituras más lentas (cada escritura actualiza los índices). Indexa las columnas usadas en `WHERE`, `JOIN`, `ORDER BY` y `GROUP BY`. Un índice **denso** tiene una entrada por fila; uno **disperso** (sparse), una por bloque, y requiere datos ordenados.
- **Vistas materializadas**: el resultado de una consulta cara guardado físicamente y refrescado de forma periódica. Convierten un reporte de 30 s en una lectura de 10 ms, a costa de frescura.
- **Problema N+1**: el código pide una lista de 50 pedidos y luego hace una consulta por cada uno para traer su cliente: 51 consultas en vez de 1 o 2. Es la causa más común de lentitud en APIs con ORMs. Se resuelve con joins o con carga por lotes (`WHERE id IN (...)`).

### Normalizar y desnormalizar

**Normalizar** es organizar los datos para que cada hecho viva en un solo lugar, evitando anomalías de inserción, actualización y borrado. Las formas normales (1NF a BCNF) formalizan esto: valores atómicos, sin dependencias parciales de la clave, sin dependencias transitivas. Ventajas: consistencia, menos espacio, escrituras simples. Desventaja: las lecturas necesitan joins.

**Desnormalizar** es duplicar datos a propósito para que las lecturas no necesiten joins. Ejemplo: guardar `author_name` dentro de cada post además de en `users`. En sistemas que leen 100 o 1.000 veces más de lo que escriben, y sobre todo cuando los datos están repartidos en varias bases o shards (donde los joins son caros o imposibles), es una herramienta central.

| | Normalizado | Desnormalizado |
| --- | --- | --- |
| Lecturas | Joins, más lentas | Una sola consulta, rápidas |
| Escrituras | Simples, un lugar | Hay que actualizar todas las copias |
| Consistencia | Fuerte por diseño | Riesgo de copias divergentes |
| Espacio | Mínimo | Mayor |
| Bajo escrituras intensas | Bien | Puede rendir peor |

### Réplicas y transacciones: el recordatorio mínimo de DDIA

Dos ideas del módulo 04 que vas a usar constantemente en los diagramas, resumidas en una línea cada una:

- **Replicación síncrona vs asíncrona**: la síncrona confirma la escritura cuando la réplica también la tiene (más durabilidad, más latencia, la réplica lenta frena al líder); la asíncrona confirma antes (rápida, pero puede perder las últimas escrituras en un failover). La configuración habitual es *semi-síncrona*: una réplica síncrona y el resto asíncronas.
- **Transacciones distribuidas**: cuando una operación toca varias bases (o varios shards), no hay una transacción ACID gratuita. Las opciones son two-phase commit (consistente pero bloqueante si el coordinador falla) o **sagas** (una secuencia de transacciones locales con acciones compensatorias si algo falla). En diseño de sistemas, la regla práctica es diseñar los datos para que las operaciones críticas queden **dentro de un solo shard** y usar sagas para el resto.

### La familia NoSQL

"NoSQL" agrupa modelos muy distintos. Lo que suelen compartir: esquema flexible, escalado horizontal nativo, consistencia a menudo eventual (BASE: *basically available, soft state, eventually consistent*) y modelado según las consultas en vez de según las entidades.

**Key-value** (Redis, DynamoDB, etcd). Un diccionario gigante: `get(key)`, `put(key, value)`. Lecturas y escrituras O(1), latencia muy baja, escala horizontal trivial. No hay consultas por contenido salvo índices secundarios limitados. Usos: sesiones, caches, carritos, configuración, contadores. Diseñarás uno por dentro en la sesión 17.

**Documento** (MongoDB, Couchbase, Firestore). Guarda documentos JSON anidados identificados por clave, y permite consultar por campos internos. Ideal cuando un agregado se lee y escribe completo (un perfil con sus direcciones y preferencias) y el esquema evoluciona rápido. Débil en relaciones muchos-a-muchos y joins.

**Wide-column** (Cassandra, HBase, Bigtable). Filas identificadas por una clave de partición, con columnas que pueden variar por fila, ordenadas dentro de la partición por una clave de clustering. Escrituras masivas, particionado y replicación nativos, consultas eficientes **solo** por la clave de partición (y rangos de la de clustering). Usos: mensajes de chat, series de eventos, timelines, IoT. Se modela "una tabla por consulta".

```
 Tabla messages_by_channel (Cassandra)
 Partition key: channel_id   Clustering key: message_id (desc)
 ┌──────────────┬────────────────────────────────────────────┐
 │ channel 42   │ msg 9001 | msg 9000 | msg 8999 | ...       │ ← lectura de los últimos N: un solo nodo, secuencial
 │ channel 77   │ msg 5120 | msg 5119 | ...                  │
 └──────────────┴────────────────────────────────────────────┘
```

**Grafo** (Neo4j, Neptune). Nodos y aristas como ciudadanos de primera clase. Recorrer relaciones de varios saltos ("amigos de amigos que viven en Bogotá y siguen a X") es eficiente, cuando en SQL serían joins recursivos caros. Usos: redes sociales, recomendaciones, detección de fraude, grafos de conocimiento.

**Series de tiempo** (InfluxDB, TimescaleDB, Prometheus). Optimizadas para puntos `(timestamp, métrica, valor)` que llegan en orden y se consultan por rangos y agregaciones. Comprimen muy bien y expiran datos viejos (retention). Usos: métricas, monitoreo, telemetría.

**Multi-modelo**: algunas bases combinan varios modelos (documento, grafo, key-value) en un solo motor, a cambio de no ser la mejor en ninguno.

### SQL o NoSQL: cómo decidir

| Razones para SQL | Razones para NoSQL |
| --- | --- |
| Datos estructurados y relacionales | Datos semiestructurados o esquema muy cambiante |
| Necesitas transacciones multi-fila y restricciones | Volumen o tasa de escritura que excede una máquina |
| Consultas ad hoc y joins | Patrones de acceso conocidos y simples (por clave) |
| Herramientas, talento y ecosistema maduros | Latencia muy baja y predecible a gran escala |
| Integridad referencial | Escalado horizontal y alta disponibilidad multi-región nativos |

La respuesta honesta en un diseño suele ser **ambas**: PostgreSQL para usuarios y pagos, Cassandra para mensajes, Redis para sesiones y rankings, S3 para archivos, un motor de búsqueda (Elasticsearch) para texto libre. Lo importante es justificar cada una con su patrón de acceso.

### Escalar la capa de datos: la escalera

No saltes al sharding. Sube la escalera de a un peldaño, porque cada uno agrega complejidad:

```
 1. Optimizar consultas e índices (slow query log, EXPLAIN, evitar N+1)
 2. Escalar verticalmente (más RAM = más working set en memoria)
 3. Cache delante de la base (sesión 05)
 4. Réplicas de lectura (repartir lecturas)
 5. Federación (separar por función)
 6. Desnormalizar y vistas materializadas (evitar joins caros)
 7. Sharding (repartir escrituras y volumen)
```

**Optimizar primero**: perfila con el log de consultas lentas y haz benchmarks bajo carga. Ajusta el esquema (tipos de tamaño adecuado, `DECIMAL` para dinero, `NOT NULL` donde aplique, BLOBs fuera de la base), agrega índices donde las consultas los necesiten, evita joins innecesarios y particiona tablas enormes (por ejemplo, por mes) para que las consultas toquen menos datos.

**Federación** (partición funcional): en vez de una base monolítica, una por dominio: `usuarios`, `foros`, `productos`. Cada base recibe menos tráfico, cabe mejor en memoria (más cache hits) y puede escalar por separado; además, las escrituras a distintos dominios ya no compiten. Desventajas: la aplicación debe saber a qué base ir, los joins entre dominios se vuelven complejos y no ayuda si una sola tabla o función es enorme. Es la contraparte de datos de separar un monolito en servicios (sesión 11).

**Sharding**: cada shard tiene un subconjunto de las filas de una misma tabla. Reduce tráfico, índices y replicación por máquina, y un shard caído afecta solo a una parte de los usuarios. Criterios de partición:

| Criterio | Ejemplo | Ventaja | Riesgo |
| --- | --- | --- | --- |
| Hash | `hash(user_id) mod N` | Reparto parejo | Rangos dispersos; resharding costoso sin consistent hashing |
| Rango | IDs 1–1M en shard 1 | Consultas por rango eficientes | Hotspots (todo lo nuevo cae en el último shard) |
| Lista / geografía | País → shard | Localidad de datos, regulación | Desbalance entre países |
| Directorio | Tabla de búsqueda clave → shard | Flexible, permite mover clientes | El directorio es un componente crítico más |
| Compuesto | Geografía + hash | Combina beneficios | Más complejidad |

Desventajas del sharding: lógica de aplicación más compleja, joins y transacciones entre shards, distribución desigual (usuarios "pesados" concentrados en un shard), rebalanceo complejo y más hardware. Cuándo sí: cuando el volumen de datos o la tasa de escritura superan lo que un líder bien dimensionado puede manejar, o cuando el working set ya no cabe en la memoria de una máquina.

### Un ejemplo de decisión con números

Una app de mensajería recibe 1.000 M de mensajes por día. Cada mensaje ocupa unos 200 bytes con metadatos.

- **Escrituras**: 1.000 M / 100.000 s ≈ 10.000 escrituras/s en promedio, unas 30.000 en el pico.
- **Volumen**: 1.000 M × 200 B = 200 GB/día ≈ 73 TB/año, sin contar réplicas (×3 ≈ 220 TB/año).
- **Patrón de acceso**: casi siempre "los últimos N mensajes de una conversación", por clave, ordenados por tiempo; nunca joins.

Un líder relacional único no soporta 30.000 escrituras/s sostenidas con 220 TB creciendo; necesitarías sharding manual. Un wide-column store con `conversation_id` como clave de partición y `message_id` ordenado como clustering key encaja exactamente con el patrón de acceso, escala horizontalmente y replica de forma nativa. Mientras tanto, los usuarios y sus contactos (pocos GB, relacionales, con restricciones) se quedan cómodos en PostgreSQL. Así se justifica una elección: **volumen, tasa, patrón de acceso y necesidades de consistencia**, no la moda.

### Cómo elegir una sharding key paso a paso

Elegir la clave de partición es la decisión más difícil de revertir de todo el diseño de datos. Un método práctico:

1. **Lista las consultas más frecuentes** con su volumen. Por ejemplo, en una tienda multi-vendedor: "pedidos de un comprador" (40 %), "pedidos de un vendedor" (35 %), "pedido por ID" (25 %).
2. **Busca la clave que hace que la mayoría de las consultas toquen un solo shard**. Si particionas por `buyer_id`, la primera consulta va a un shard, pero la de vendedor debe consultar **todos** (scatter-gather). Si particionas por `seller_id`, pasa lo contrario.
3. **Verifica el reparto**: ¿hay valores con muchísimos datos? Un vendedor gigante con el 5 % de todos los pedidos convierte su shard en un hotspot. Los compradores, en cambio, suelen repartirse de forma más pareja.
4. **Resuelve las consultas que quedan fuera** con estructuras secundarias: una tabla "pedidos por vendedor" desnormalizada y particionada por `seller_id`, alimentada por eventos; o un índice global mantenido por separado.
5. **Haz que el ID lleve la información de enrutamiento**: si el `order_id` incluye el número de shard (o se deriva del `buyer_id`), "pedido por ID" también va a un solo shard sin consultar un directorio. Verás este truco en el generador de IDs (sesión 18).

El resultado típico es una clave principal más una o dos vistas desnormalizadas con otra clave. Es más almacenamiento y más escritura a cambio de lecturas de un solo shard.

### Búsqueda de texto: un almacenamiento aparte

Ni las bases relacionales ni los key-value stores son buenos para "buscar productos que contengan 'zapatillas rojas' ordenados por relevancia". Un `LIKE '%rojas%'` recorre toda la tabla. Para eso existe el **índice invertido**: un mapa de cada término a la lista de documentos que lo contienen, con información para calcular relevancia.

```
 "zapatillas" → [doc 12, doc 45, doc 97]
 "rojas"      → [doc 45, doc 97, doc 230]
 consulta "zapatillas rojas" → intersección → [doc 45, doc 97] → ranking
```

Motores como Elasticsearch u OpenSearch mantienen estos índices, particionados y replicados. El patrón habitual es que la base de datos sea la **fuente de verdad** y el buscador sea una **vista derivada** que se alimenta de forma asíncrona (CDC o eventos). Consecuencia: la búsqueda es eventualmente consistente; un producto recién creado puede tardar unos segundos en aparecer en los resultados.

### Retención y niveles de almacenamiento

Los datos no tienen el mismo valor toda su vida. Un mensaje de hace 5 minutos se lee muchísimo; uno de hace 3 años casi nunca. Diseñar **niveles** (tiering) ahorra mucho dinero:

| Nivel | Ejemplo | Costo relativo | Latencia |
| --- | --- | --- | --- |
| Caliente | Cache + SSD de la base principal | Alto | ms |
| Tibio | Base con discos más baratos o réplicas de menor capacidad | Medio | decenas de ms |
| Frío | Object storage estándar | Bajo | ~100 ms |
| Archivo | Object storage de archivo (tipo Glacier) | Muy bajo | minutos a horas |

Define en tus diseños una política: cuánto tiempo vive cada dato en cada nivel y cuándo se borra (también por obligaciones legales como el derecho al olvido).

### Modos de fallo de la capa de datos

- **Hot partition**: una clave de partición mal elegida (fecha del día, un cliente enorme) concentra el tráfico en un nodo.
- **Migraciones de esquema bloqueantes** en tablas grandes: un `ALTER TABLE` que bloquea escrituras durante minutos. Usa migraciones online y cambios compatibles hacia atrás.
- **Agotamiento de conexiones** al escalar la capa web (sesión 04); usa poolers.
- **Datos desnormalizados divergentes**: una copia se actualizó y otra no. Usa eventos o CDC para propagar cambios y procesos de reconciliación.
- **Backups nunca restaurados**: un backup que no se probó no es un backup. Practica restauraciones y mide cuánto tardan.

## Conceptos clave

- **Object storage**: almacenamiento de objetos inmutables por clave vía HTTP; destino de archivos grandes.
- **Vista materializada**: resultado de una consulta guardado y refrescado periódicamente.
- **Problema N+1**: una consulta por cada elemento de una lista en lugar de una consulta por lotes.
- **Desnormalización**: duplicar datos para evitar joins en lecturas frecuentes.
- **Key-value store**: acceso O(1) por clave, sin consultas por contenido.
- **Document store**: documentos JSON consultables por campos internos.
- **Wide-column store**: filas por clave de partición con columnas ordenadas; escala escrituras masivas.
- **Federación**: separar bases de datos por dominio funcional.
- **Sharding key**: atributo que decide en qué shard vive cada fila.
- **Polyglot persistence**: usar distintos almacenamientos para distintos patrones de acceso.

## Preguntas de repaso

1. ¿Dónde guardarías las fotos de perfil de una red social y qué guardarías en la base de datos?
   R: Las imágenes en object storage (como S3), servidas mediante una CDN. En la base de datos solo el metadato: ID del usuario, clave o URL del objeto, tamaño, formato y fecha. Guardar los binarios en la base inflaría backups, réplicas y caches sin beneficio.
2. ¿Qué es la federación y en qué se diferencia del sharding?
   R: La federación separa las bases por función o dominio (usuarios, productos, foros), cada una con tablas distintas. El sharding parte una misma tabla en subconjuntos de filas con el mismo esquema repartidos en varias bases. La federación reduce la carga por dominio; el sharding resuelve que una sola tabla exceda la capacidad de una máquina.
3. ¿Por qué el sharding por rango de IDs autoincrementales genera hotspots?
   R: Porque todas las filas nuevas tienen los IDs más altos y caen en el último shard, que recibe todas las escrituras y casi todas las lecturas recientes, mientras los demás shards quedan ociosos. El hash reparte mejor a costa de perder las consultas por rango.
4. Ordena la escalera de escalado de una base de datos y explica por qué el sharding va al final.
   R: Optimizar consultas e índices, escalar verticalmente, poner cache, agregar réplicas de lectura, federar, desnormalizar y finalmente shardear. El sharding va al final porque es el más costoso: complica la lógica de la aplicación, rompe joins y transacciones entre shards, exige rebalanceos y más hardware, y es difícil de revertir.
5. ¿Qué tipo de base usarías para mensajes de chat y por qué?
   R: Un wide-column store como Cassandra o HBase: el patrón de acceso es casi siempre leer los últimos N mensajes de una conversación, lo que encaja con una clave de partición por conversación y una clave de clustering ordenada por tiempo. Soporta tasas de escritura masivas, escala horizontalmente y replica de forma nativa, y no se necesitan joins.

## Ejercicio

Para una plataforma de cursos online (usuarios, cursos, lecciones, videos, progreso, comentarios, métricas de reproducción, búsqueda de cursos), escribe una tabla con cada tipo de dato, su patrón de acceso principal, su volumen estimado a un año con 5 M de usuarios y el almacenamiento elegido con una frase de justificación. Luego modela en TypeScript los tipos de la tabla de progreso para un wide-column store (clave de partición, clave de clustering, columnas). Terminado cuando cada fila tenga números y una justificación basada en el patrón de acceso, y al menos cuatro tecnologías distintas aparezcan con razones distintas.

## Explícalo con tus palabras

Explica por qué una empresa grande usa varias bases de datos distintas en lugar de una sola, comparándolo con los distintos tipos de muebles de una cocina.
