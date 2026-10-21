---
title: Particionamiento (sharding)
kind: lesson
hours: 2
sources: Designing Data-Intensive Applications (Kleppmann), cap. 6 (pp. 221–238)
links: Cassandra, modelado con clave de partición | https://cassandra.apache.org/doc/latest/cassandra/developing/data-modeling/intro.html ; DynamoDB, diseño de claves de partición | https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html
---

## Objetivo

Entender cómo se reparten los datos entre nodos (por rango de clave o por hash), cómo evitar hot spots, cómo particionar índices secundarios (por documento o por término), cómo rebalancear sin mover todo y cómo encuentran los clientes la partición correcta.

## Estudio

### Qué es particionar y por qué

Cuando un dataset es muy grande o el throughput de consultas es muy alto, replicar no basta: cada réplica sigue teniendo **todos** los datos. Necesitas **dividir** los datos en **particiones**, también llamadas *shards*. La terminología varía mucho:

| Sistema | Nombre de una partición |
| --- | --- |
| MongoDB, Elasticsearch, SolrCloud | shard |
| HBase | region |
| Bigtable | tablet |
| Cassandra, Riak | vnode |
| Couchbase | vBucket |
| DynamoDB | partition |

Normalmente cada registro (fila, documento) pertenece a **exactamente una** partición. Cada partición es una pequeña base de datos en sí misma, aunque la base pueda ejecutar operaciones que tocan varias particiones a la vez.

La razón principal es la **escalabilidad**: distintas particiones pueden estar en distintos nodos de un clúster shared-nothing. Un dataset grande se reparte entre muchos discos y la carga de consultas entre muchos procesadores. Las consultas que operan sobre una sola partición se ejecutan independientemente en su nodo, así que puedes escalar el throughput añadiendo nodos. Las consultas complejas pueden paralelizarse entre nodos.

### Particionamiento y replicación juntos

Se combinan casi siempre: cada partición tiene copias en varios nodos para tolerancia a fallos. Un nodo puede guardar varias particiones. Con replicación líder-seguidor, cada nodo es líder de algunas particiones y seguidor de otras:

```
            nodo 1          nodo 2          nodo 3          nodo 4
P1         [líder]        [seguidor]                       [seguidor]
P2                         [líder]        [seguidor]       [seguidor]
P3        [seguidor]                       [líder]         [seguidor]
P4        [seguidor]      [seguidor]                        [líder]
```

Todo lo de las sesiones 10–12 sobre replicación aplica igual a cada partición. La elección del esquema de particionamiento es mayormente independiente del de replicación.

### Particionar datos clave-valor

Objetivo: repartir datos y carga de consultas **uniformemente**. Si cada nodo tiene su parte justa, 10 nodos aguantan 10 veces los datos y el throughput de lectura y escritura de uno.

Si el reparto es injusto y unas particiones tienen más datos o consultas que otras, decimos que hay **skew** (sesgo). En el caso extremo, toda la carga va a una partición y 9 de 10 nodos están ociosos: el cuello de botella es un nodo. Una partición con carga desproporcionada es un **hot spot**.

Lo más simple sería asignar registros a nodos aleatoriamente: reparte bien, pero para leer un registro no sabrías dónde está y tendrías que preguntar a todos. Hay mejores opciones.

#### Particionar por rango de clave

Asignas a cada partición un **rango continuo de claves**, de un mínimo a un máximo, como los tomos de una enciclopedia en papel: el tomo 1 va de A a B, el 12 de T a Z.

```
volumen 1: A–B    volumen 2: C    volumen 3: Ce–F   ...   volumen 12: T–Z
```

Si conoces los límites, sabes qué partición contiene una clave y puedes ir directo al nodo. Los rangos **no tienen por qué ser iguales**, porque los datos no se reparten uniformemente (quizá el tomo 1 tiene A y B, y el 12 de T a Z). Los límites deben adaptarse a los datos; los elige el administrador o la base automáticamente. Lo usan Bigtable, HBase, RethinkDB y MongoDB antes de la versión 2.4 (y hoy en su modo *ranged sharding*).

Dentro de cada partición, las claves se guardan **ordenadas** (como en SSTables o B-trees). Eso hace los **escaneos por rango** muy eficientes. Ejemplo: sensores que envían mediciones con clave `timestamp` (año-mes-día-hora-minuto-segundo); pedir todas las lecturas de un mes es un escaneo de rango.

El problema: ciertos patrones de acceso producen **hot spots**. Si la clave es un timestamp, las particiones son rangos de tiempo (una por día). Como las mediciones se escriben según ocurren, **todas las escrituras van a la partición de hoy**, que se sobrecarga mientras las otras descansan.

Solución: no usar el timestamp como primer elemento de la clave. Por ejemplo, prefijarlo con el nombre del sensor: `sensor_17:2026-10-20T10:00:00`. Así, con muchos sensores activos, la carga de escritura se reparte. El precio: para obtener los valores de varios sensores en un rango de tiempo necesitas **una consulta por sensor**.

#### Particionar por hash de la clave

Por el riesgo de skew y hot spots, muchos almacenes distribuidos usan una **función hash** para decidir la partición. Una buena función hash toma datos sesgados y los distribuye uniformemente: dos strings muy parecidos producen hashes muy distintos.

No hace falta que sea criptográficamente fuerte: Cassandra y MongoDB usan MD5 (Cassandra hoy usa Murmur3 por defecto), Voldemort usa Fowler–Noll–Vo. Cuidado con las funciones hash integradas en los lenguajes: en Java (`Object.hashCode()`) o Ruby (`Object#hash`), la misma clave puede dar un hash distinto **en procesos distintos**. Para particionar necesitas un hash estable.

Con una función hash adecuada, asignas a cada partición **un rango de hashes** (no de claves):

```
hash(clave) ∈ [0, 2^32)

partición 0: [0,          1.073.741.824)
partición 1: [1.073.741.824, 2.147.483.648)
partición 2: [2.147.483.648, 3.221.225.472)
partición 3: [3.221.225.472, 4.294.967.296)

"2026-10-20T10:00:00" → hash 3.884.... → partición 3
"2026-10-20T10:00:01" → hash 52.1..... → partición 0   (claves vecinas, particiones distintas)
```

Los límites pueden estar equiespaciados o elegirse pseudoaleatoriamente; en ese caso a veces se habla de **consistent hashing**. Ojo: *consistent hashing* (Karger et al.) es una técnica para repartir carga en caches a escala de internet (CDNs) sin coordinación central. El "consistent" no tiene nada que ver con la consistencia de réplicas ni con la C de ACID. Además, como verás en el rebalanceo, no funciona muy bien para bases de datos, así que es mejor llamarlo simplemente **hash partitioning**.

El precio del hash: **pierdes las consultas por rango eficientes**. Claves que eran vecinas quedan dispersas en todas las particiones. En MongoDB con hashed sharding, una consulta por rango se envía a todas las particiones. Riak, Couchbase y Voldemort no soportan consultas por rango sobre la clave primaria.

#### El compromiso de Cassandra: claves compuestas

Cassandra combina ambas estrategias. Una tabla puede tener una **clave primaria compuesta**: solo la **primera parte** (la *partition key*) se hashea para elegir la partición; las demás columnas (las *clustering columns*) se usan como índice concatenado para **ordenar** los datos dentro de la SSTable.

No puedes buscar un rango sobre la primera columna, pero si fijas su valor, puedes escanear eficientemente por rango las demás. Esto da un modelo elegante para relaciones one-to-many. En una red social, con clave `(user_id, update_timestamp)` obtienes eficientemente todas las publicaciones de un usuario en un intervalo, ordenadas por fecha: usuarios distintos están en particiones distintas, pero las publicaciones de un usuario están juntas y ordenadas.

```sql
-- CQL (Cassandra)
CREATE TABLE updates (
  user_id     uuid,
  ts          timestamp,
  body        text,
  PRIMARY KEY ((user_id), ts)      -- partition key: user_id; clustering: ts
) WITH CLUSTERING ORDER BY (ts DESC);

SELECT * FROM updates WHERE user_id = ? AND ts > '2026-10-01';  -- eficiente
SELECT * FROM updates WHERE ts > '2026-10-01';                  -- requiere ALLOW FILTERING: toca todo
```

DynamoDB tiene exactamente el mismo concepto: *partition key* + *sort key*.

### Cargas sesgadas y hot spots

El hash reduce hot spots pero **no los elimina**. En el caso extremo, si todas las lecturas y escrituras son sobre la **misma clave**, todas van a la misma partición. Ejemplo: una celebridad con millones de seguidores hace algo y genera una tormenta de escrituras sobre la misma clave (su user ID o el ID de la publicación comentada). El hash de dos IDs iguales es igual.

Hoy, la mayoría de sistemas no compensan automáticamente un sesgo así; **la responsabilidad es de la aplicación**. Técnica simple: si una clave es muy caliente, **añade un número aleatorio** al principio o al final. Con solo un número de dos dígitos, repartes las escrituras de esa clave entre 100 claves distintas, en particiones distintas.

```
clave caliente: post:999
escrituras:     post:999#00, post:999#01, ..., post:999#99   (repartidas)
lectura:        leer las 100 claves y combinar
```

El precio: las **lecturas** deben consultar las 100 claves y combinarlas. Además, debes llevar la cuenta de qué claves se dividen: solo tiene sentido para el pequeño número de claves calientes; para la inmensa mayoría con poco tráfico sería overhead innecesario. DynamoDB llama a esta técnica *write sharding* y además tiene *adaptive capacity* que aísla automáticamente elementos calientes.

### Particionamiento e índices secundarios

Lo anterior asume un modelo clave-valor: si solo accedes por clave primaria, la partición se determina por esa clave. Con **índices secundarios** es más complicado. Un índice secundario no identifica un registro de forma única: es una forma de buscar valores, como "todas las acciones del usuario 123" o "todos los artículos que contienen la palabra *hogwash*" o "todos los coches rojos".

Los índices secundarios son el pan de cada día de las bases relacionales, comunes en las de documentos, y la razón de ser de motores como Solr y Elasticsearch. Muchos almacenes clave-valor (HBase, Voldemort) los evitaron por su complejidad; otros (Riak) los fueron añadiendo. El problema: **no encajan limpiamente en las particiones**. Hay dos enfoques.

#### Por documento (índice local)

Una web de venta de coches usados. Cada anuncio tiene un ID único y la base se particiona por ID (0–499 en la partición 0, 500–999 en la 1…). Quieres que los usuarios filtren por color y marca, así que creas índices secundarios sobre `color` y `make`.

En el enfoque **por documento**, **cada partición mantiene sus propios índices secundarios**, que cubren solo los documentos de esa partición. Al añadir un coche rojo a la partición 0, la partición 0 añade su ID a su entrada `color:red`. Por eso se llama **índice local**.

```
partición 0 (IDs 0–499)                    partición 1 (IDs 500–999)
datos: 191 rojo Honda, 306 rojo Ford       datos: 768 rojo Volvo, 893 plata Audi
índice local:                              índice local:
  color:red    → [191, 306]                  color:red    → [768]
  make:Honda   → [191]                       make:Volvo   → [768]

consulta "coches rojos" → hay que preguntar a TODAS las particiones (scatter/gather)
```

Escribir es fácil: solo tocas la partición del documento. Pero leer es caro: nada garantiza que todos los coches rojos estén en la misma partición, así que **envías la consulta a todas las particiones y combinas los resultados**. Esto se llama **scatter/gather** y hace las lecturas por índice secundario bastante caras. Aunque consultes en paralelo, sufres de **tail latency amplification** (sesión 01). Es muy usado: MongoDB, Riak, Cassandra, Elasticsearch, SolrCloud y VoltDB. Los proveedores recomiendan diseñar el particionamiento para que las consultas por índice secundario se sirvan desde una sola partición, lo cual no siempre es posible.

#### Por término (índice global)

En lugar de que cada partición tenga su índice, construyes un **índice global** que cubre los datos de todas las particiones. No puedes guardarlo en un solo nodo (sería un cuello de botella), así que **el índice también se particiona**, pero de forma distinta a los datos.

```
índice global particionado por término:
  partición de índice 0 (colores a–r):  color:black → [...], color:red → [191, 306, 768]
  partición de índice 1 (colores s–z):  color:silver → [893], color:yellow → [...]

consulta "coches rojos" → solo la partición de índice 0
```

Se llama **term-partitioned** porque el término buscado determina la partición del índice. Puedes particionar el índice por el término mismo (útil para rangos, como un rango de precios) o por un hash del término (reparte mejor la carga).

| | Índice local (por documento) | Índice global (por término) |
| --- | --- | --- |
| Escritura | Barata: una partición | Cara: un documento puede tocar varias particiones de índice |
| Lectura | Cara: scatter/gather a todas | Barata: solo la partición del término |
| Consistencia del índice | Se actualiza junto al dato | Suele actualizarse **asíncronamente**: puede no reflejar una escritura reciente |
| Ejemplos | MongoDB, Cassandra, Elasticsearch | DynamoDB (GSIs), Riak search, Oracle data warehouse |

Mantener un índice global sincronizado requeriría una **transacción distribuida** entre todas las particiones afectadas, que no todas las bases soportan. En la práctica, las actualizaciones de índices globales suelen ser **asíncronas**: si lees el índice poco después de escribir, quizá no veas el cambio. Los Global Secondary Indexes de DynamoDB se actualizan normalmente en una fracción de segundo, pero pueden atrasarse ante fallos de infraestructura.

### Rebalanceo de particiones

Con el tiempo cambian las cosas: aumenta el throughput (añades CPUs), crece el dataset (añades discos y RAM), falla una máquina (otras toman sus responsabilidades). Todo esto exige **mover datos y peticiones de un nodo a otro**. A eso se le llama **rebalanceo**. Requisitos mínimos:

- Tras rebalancear, la carga (datos, lecturas, escrituras) debe quedar repartida de forma justa.
- Durante el rebalanceo, la base debe seguir aceptando lecturas y escrituras.
- No se deben mover más datos de los necesarios, para que sea rápido y gaste poca red y disco.

#### Cómo no hacerlo: hash mod N

Si particionas con `hash(key) mod N` (N = número de nodos), el problema es que **al cambiar N casi todas las claves cambian de nodo**. Si `hash(key) = 123456`, con 10 nodos va al nodo 6; con 11, al nodo 3; con 12, al nodo 0. Rebalancear sería carísimo.

```
hash = 123456
N = 10 → 123456 mod 10 = 6
N = 11 → 123456 mod 11 = 3
N = 12 → 123456 mod 12 = 0      ← casi todas las claves se mueven al añadir un nodo
```

#### Número fijo de particiones

Solución simple: crea **muchas más particiones que nodos** y asigna varias a cada nodo. Por ejemplo, 1.000 particiones en 10 nodos (unas 100 por nodo). Si añades un nodo, este **roba algunas particiones** a cada nodo existente hasta que el reparto vuelve a ser justo. Si quitas uno, ocurre lo contrario.

```
antes (4 nodos):  N0: p0 p4 p8 p12   N1: p1 p5 p9 p13   N2: p2 p6 p10 p14   N3: p3 p7 p11 p15
añades N4:        N0: p0 p4 p8       N1: p1 p5 p9       N2: p2 p6 p10       N3: p3 p7 p11
                  N4: p12 p13 p14 p15                    ← solo se mueven particiones completas
```

Solo se mueven **particiones enteras**; el número de particiones y la asignación clave→partición no cambian. Lo único que cambia es la asignación partición→nodo. Mientras se transfiere, la asignación vieja sigue sirviendo. Puedes incluso dar más particiones a nodos más potentes. Lo usan Riak, Elasticsearch, Couchbase y Voldemort.

El número de particiones se fija al crear la base y no cambia (aunque se puede dividir o fusionar, eso complica las cosas). Debes elegirlo **suficientemente alto** para el crecimiento futuro, pero sin exagerar, porque cada partición tiene overhead. Si las particiones son muy grandes, rebalancear y recuperar un nodo es caro; si son muy pequeñas, el overhead domina.

#### Particionamiento dinámico

Con particionamiento por rango de clave, un número fijo de particiones con límites fijos es incómodo: si te equivocas con los límites, todos los datos acaban en una partición. Por eso HBase y RethinkDB crean particiones **dinámicamente**: cuando una partición supera un tamaño (en HBase, 10 GB por defecto), se **divide** en dos, cada una con la mitad de los datos; si se encoge mucho por borrados, se fusiona con una vecina. Es como un B-tree a nivel de cluster.

Ventaja: el número de particiones se adapta al volumen de datos. Una base vacía empieza con una sola partición, así que al principio todas las escrituras van a un nodo mientras los demás esperan. HBase y MongoDB permiten **pre-splitting**: configurar particiones iniciales en una base vacía (requiere saber de antemano cómo se repartirán las claves). El particionamiento dinámico también sirve con hash (MongoDB lo soporta en ambos modos).

#### Particionamiento proporcional al número de nodos

Una tercera opción, usada por Cassandra y Ketama: un **número fijo de particiones por nodo**. El tamaño de cada partición crece con el dataset mientras el número de nodos no cambie; al añadir nodos, las particiones se hacen más pequeñas. Cuando un nodo entra, elige aleatoriamente un número fijo de particiones existentes para dividir, y toma una mitad de cada una. Elegir límites aleatorios requiere particionamiento por hash. Es lo que más se acerca a la definición original de consistent hashing. (Cassandra 3.0 introdujo un algoritmo de asignación alternativo para evitar divisiones injustas.)

| Estrategia | Número de particiones | Ejemplos |
| --- | --- | --- |
| Fijo | Constante, mucho mayor que el número de nodos | Riak, Elasticsearch, Couchbase, Voldemort |
| Dinámico | Crece y decrece con el volumen de datos | HBase, RethinkDB, MongoDB |
| Proporcional a nodos | Fijo por nodo (p. ej. 256 vnodes) | Cassandra, Ketama |

#### Automático o manual

¿Rebalanceo automático o con un humano en el circuito? Hay un continuo: Couchbase, Riak y Voldemort generan una asignación sugerida automáticamente pero requieren que un administrador la confirme.

El rebalanceo totalmente automático es cómodo pero **impredecible**. Rebalancear es caro: mueve muchos datos y puede sobrecargar la red y los nodos. Combinado con detección automática de fallos es peligroso: un nodo sobrecargado responde lento, otros concluyen que murió y rebalancean para quitarle carga, lo que **añade más carga** a ese nodo, a los demás y a la red. Puede provocar un fallo en cascada. Por eso es bueno tener un humano en el circuito.

### Request routing: ¿a qué nodo pregunto?

Con los datos repartidos, un cliente que quiere leer la clave "foo" necesita saber **a qué IP y puerto conectarse**. Como las particiones se rebalancean, la asignación cambia. Es un caso del problema general de **service discovery**. Tres enfoques:

```
1) cualquier nodo reenvía        2) capa de routing             3) cliente consciente
cliente ─► nodo 0 ─► nodo 2      cliente ─► router ─► nodo 2    cliente ─► nodo 2
          (si no es suyo)                 (sabe la asignación)  (sabe la asignación)
```

1. El cliente contacta **cualquier nodo** (vía un load balancer round-robin). Si el nodo tiene la partición, responde; si no, reenvía la petición al nodo adecuado y devuelve la respuesta.
2. Todas las peticiones van a una **capa de routing** que conoce la asignación y reenvía (un load balancer consciente de particiones).
3. Los **clientes conocen la asignación** y se conectan directamente al nodo correcto.

El problema clave: ¿cómo se entera el componente que enruta de los cambios de asignación? Es un problema difícil, porque todos deben ponerse de acuerdo (si no, se envían peticiones a nodos equivocados). Hay protocolos de consenso para esto (sesión 21), pero son difíciles de implementar bien.

Muchos sistemas usan un **servicio de coordinación** como **ZooKeeper**: cada nodo se registra en ZooKeeper, que mantiene la asignación autoritativa de particiones a nodos; los demás actores (la capa de routing o los clientes) se suscriben a esa información y ZooKeeper les avisa de cada cambio. Lo usan HBase, SolrCloud y Kafka (en sus versiones clásicas; Kafka migró a su propio consenso KRaft). LinkedIn Espresso usa Helix (que usa ZooKeeper). MongoDB tiene sus *config servers* y el router `mongos`.

Cassandra y Riak usan un **gossip protocol**: los nodos se comunican los cambios de estado del clúster entre sí. Las peticiones pueden ir a cualquier nodo, que las reenvía (enfoque 1). Más complejidad en los nodos, pero sin dependencia de un servicio externo.

Couchbase no rebalancea automáticamente; usa un routing tier llamado *moxi* que aprende los cambios de los nodos.

#### Ejecución paralela de consultas

Hasta ahora hablamos de consultas simples que leen o escriben una clave (o un scatter/gather por índice). Los productos **MPP** (*massively parallel processing*) de data warehousing soportan consultas mucho más complejas: un optimizador divide la consulta (JOINs, filtros, agregaciones) en etapas y particiones que se ejecutan en paralelo en distintos nodos. Lo verás en la sesión de batch processing.

### Ideas erróneas frecuentes

- **"El hash elimina los hot spots."** Reparte claves distintas, pero una sola clave muy caliente sigue yendo a una partición.
- **"Consistent hashing tiene que ver con consistencia."** Es una técnica de reparto/rebalanceo; el libro recomienda llamarlo hash partitioning.
- **"`hash mod N` es suficiente."** Al cambiar N se mueven casi todas las claves.
- **"Un índice secundario global siempre está al día."** Suele actualizarse asíncronamente.
- **"El rebalanceo automático siempre es mejor."** Combinado con detección automática de fallos puede provocar cascadas.

### Resumen

Particionar reparte datos y carga entre nodos para escalar más allá de una máquina, normalmente combinado con replicación. Por rango de clave permite escaneos eficientes pero arriesga hot spots; por hash reparte mejor pero pierde los rangos (las claves compuestas de Cassandra/DynamoDB combinan ambos). Los índices secundarios se particionan por documento (escritura barata, lectura scatter/gather) o por término (lectura barata, escritura cara y asíncrona). Se rebalancea moviendo particiones completas (fijas, dinámicas o proporcionales a nodos) y se enruta con un servicio de coordinación, gossip o clientes conscientes.

## Conceptos clave

- **Partición (shard)**: subconjunto de los datos asignado a un nodo.
- **Skew / hot spot**: reparto desigual de datos o carga; partición con carga desproporcionada.
- **Key range partitioning**: cada partición cubre un rango continuo de claves ordenadas.
- **Hash partitioning**: cada partición cubre un rango de hashes de clave.
- **Partition key / clustering (sort) key**: parte de la clave que decide la partición y parte que ordena dentro de ella.
- **Índice local (document-partitioned)**: cada partición indexa solo sus documentos.
- **Scatter/gather**: enviar una consulta a todas las particiones y combinar resultados.
- **Índice global (term-partitioned)**: índice que cubre todos los datos, particionado por término.
- **Rebalanceo**: mover particiones entre nodos al cambiar el clúster.
- **Pre-splitting**: crear particiones iniciales antes de cargar datos.
- **Request routing**: decidir a qué nodo enviar una petición.
- **Gossip protocol**: los nodos se comunican entre sí el estado del clúster.

## Preguntas de repaso

1. ¿Por qué particionar por timestamp crea un hot spot y cómo se evita?
   R: Porque las escrituras llegan en orden temporal y todas caen en la partición del rango actual (hoy), mientras las demás están ociosas. Se evita poniendo otro componente antes del timestamp en la clave, como el nombre del sensor, a costa de hacer una consulta de rango por sensor.
2. ¿Qué pierdes al particionar por hash y cómo lo compensa Cassandra?
   R: Pierdes las consultas por rango eficientes, porque las claves vecinas quedan dispersas. Cassandra usa claves compuestas: solo la partition key se hashea y las clustering columns ordenan los datos dentro de la partición, permitiendo rangos si fijas la partition key.
3. Compara índices secundarios locales y globales en lecturas y escrituras.
   R: El índice local se actualiza en la misma partición que el documento (escritura barata), pero una consulta debe ir a todas las particiones (scatter/gather, lectura cara). El índice global permite leer solo la partición del término, pero una escritura puede afectar varias particiones de índice y suele actualizarse de forma asíncrona.
4. ¿Por qué `hash(key) mod N` es mala estrategia de rebalanceo?
   R: Porque al cambiar el número de nodos N casi todas las claves cambian de nodo, lo que obliga a mover casi todos los datos en cada cambio de tamaño del clúster.
5. Explica el rebalanceo con número fijo de particiones.
   R: Se crean muchas más particiones que nodos y cada nodo tiene varias. Al añadir un nodo, este toma particiones completas de los existentes; la asignación clave→partición nunca cambia, solo partición→nodo, y la asignación vieja sirve peticiones mientras dura la transferencia.
6. ¿Por qué combinar rebalanceo automático y detección automática de fallos es peligroso?
   R: Porque un nodo sobrecargado y lento puede declararse muerto, lo que dispara un rebalanceo que mueve muchos datos y añade carga a ese nodo, a los demás y a la red, pudiendo provocar un fallo en cascada.
7. Nombra tres formas de enrutar una petición a la partición correcta.
   R: Que el cliente hable con cualquier nodo y este reenvíe si hace falta; una capa de routing consciente de particiones; o clientes que conocen la asignación y se conectan directamente. La asignación se mantiene con un servicio de coordinación como ZooKeeper o con gossip.

## Ejercicio

En TypeScript, compara estrategias de particionamiento:

1. Genera 1.000.000 de claves de eventos de sensores: 200 sensores, timestamps de 30 días, con un sensor "celebridad" que produce el 20 % de los eventos.
2. Implementa cuatro particionadores para 16 particiones: rango por timestamp, rango por `sensor:timestamp`, `hash mod 16` (usa un hash estable, por ejemplo FNV-1a) y hash con 256 particiones fijas asignadas a 16 nodos.
3. Mide para cada uno la desviación estándar de claves por nodo y el porcentaje de escrituras de la última hora que caen en el nodo más cargado.
4. Simula pasar de 16 a 17 nodos y cuenta qué fracción de claves cambia de nodo con `hash mod N` y con particiones fijas.
5. Aplica write sharding (sufijo aleatorio de 0–9) solo al sensor celebridad y vuelve a medir.

Criterio de terminado: una tabla con las métricas de los puntos 3–5, donde se ve el hot spot del particionado por timestamp, que `mod N` mueve alrededor del 94 % de las claves frente a alrededor del 6 % con particiones fijas, y que el write sharding reduce la carga del nodo más cargado.

## Explícalo con tus palabras

Explica por qué un índice de "coches rojos" obliga a elegir entre escrituras baratas y lecturas baratas cuando los datos están particionados por ID.
