---
title: Caso de estudio — un key-value store distribuido
kind: lesson
hours: 2
sources: System Design Interview (Alex Xu), cap. 6 "Design a key-value store" (pp. 87–109) | karanpratapsingh/system-design, cap. II "NoSQL databases" (key-value) y "Consistent Hashing" | System Design Primer, "Key-value store" y solución "Design a key-value store for a search engine"
links: Primer — Key-value store | https://github.com/donnemartin/system-design-primer#key-value-store ; Primer — Query cache solution | https://github.com/donnemartin/system-design-primer/blob/master/solutions/system_design/query_cache/README.md ; Karan — NoSQL databases | https://github.com/karanpratapsingh/system-design#nosql-databases ; Karan — Consistent Hashing | https://github.com/karanpratapsingh/system-design#consistent-hashing
---

## Objetivo

Ensamblar un key-value store distribuido estilo Dynamo/Cassandra a partir de piezas que ya conoces (consistent hashing, replicación sin líder, quórums, vector clocks, gossip, hinted handoff, Merkle trees, LSM) y justificar cada pieza por el requisito que cumple.

## Estudio

### El problema y sus requisitos

Un **key-value store** guarda pares `(clave, valor)` y ofrece dos operaciones: `put(key, value)` y `get(key)`. La clave es única (texto o hash); el valor es opaco para el sistema (un string, una lista, un objeto serializado). Es el almacenamiento más simple que existe y, a la vez, uno de los más usados a gran escala: carritos, sesiones, perfiles, preferencias, caches persistentes.

Requisitos del diseño (los del libro):

- Pares pequeños: menos de 10 KB.
- Capacidad para guardar **muchos** datos (más de los que caben en una máquina).
- **Alta disponibilidad**: responde rápido incluso con fallos.
- **Alta escalabilidad** y escalado automático al agregar o quitar servidores.
- **Consistencia ajustable** (tunable).
- Baja latencia.

En el módulo 04 estudiaste por dentro cada mecanismo de este diseño (replicación sin líder, quórums, relojes vectoriales, LSM-trees). Esta sesión los **ensambla**: el valor está en ver qué requisito cumple cada pieza y cómo encajan.

### De un servidor a muchos

En un solo servidor, un key-value store es una tabla hash en memoria. Para que quepan más datos: comprimir y mantener en memoria solo lo caliente, con el resto en disco. Pero un servidor se queda chico rápido y es un punto único de fallo. Necesitas una **tabla hash distribuida** (DHT): pares repartidos entre muchos servidores.

Como en todo sistema distribuido, eliges ante particiones (sesión 07). Este diseño, como Dynamo y Cassandra, elige **AP**: seguir aceptando lecturas y escrituras durante particiones y reconciliar después. Un sistema bancario elegiría CP. Lo importante es elegir conscientemente.

### Mapa del diseño

| Objetivo | Técnica |
| --- | --- |
| Guardar muchos datos | Particionado con consistent hashing |
| Lecturas con alta disponibilidad | Replicación en N nodos, incluso entre data centers |
| Escrituras con alta disponibilidad | Versionado con vector clocks y resolución de conflictos |
| Escalado incremental y heterogeneidad | Consistent hashing con nodos virtuales |
| Consistencia ajustable | Quórum: N, W, R configurables |
| Fallos temporales | Sloppy quorum y hinted handoff |
| Fallos permanentes | Anti-entropía con Merkle trees |
| Caída de un data center | Replicación entre data centers |
| Detección de fallos y membresía | Protocolo gossip |

### Particionado

Las claves se reparten con **consistent hashing** (sesión 08): servidores y claves en un anillo; cada clave pertenece al primer servidor en sentido horario. Con **nodos virtuales**, la carga se reparte de forma pareja, agregar o quitar nodos mueve una fracción pequeña de claves (escalado automático), y los servidores con más capacidad reciben más vnodes (heterogeneidad).

### Replicación

Para disponibilidad y durabilidad, cada clave se guarda en **N** servidores: desde su posición en el anillo, se recorren los siguientes nodos en sentido horario y se eligen los primeros N servidores **físicos distintos** (saltando vnodes de un mismo servidor). Para sobrevivir a la caída de un data center, las réplicas se ubican en data centers distintos, conectados por redes de alta velocidad.

```
 key → posición en el anillo
       → s1 (réplica 1) → s2 (réplica 2) → s5 (réplica 3)   N = 3, servidores físicos distintos
```

### Consistencia ajustable con quórums

No hay líder: cualquier réplica acepta lecturas y escrituras. Un nodo **coordinador** (el que recibe la petición del cliente) la reenvía a las N réplicas y espera:

- **W** confirmaciones para considerar exitosa una escritura.
- **R** respuestas para devolver una lectura.

```
 W = 1 → el coordinador responde tras la primera confirmación (los datos igual se escriben en las N réplicas)
 R = 1, W = N → lecturas rápidas
 W = 1, R = N → escrituras rápidas
 W + R > N → lectura y escritura se solapan en al menos una réplica (típico: N=3, W=R=2)
 W + R ≤ N → consistencia eventual, menor latencia
```

Con N=3, W=R=2 toleras un nodo caído en ambas operaciones. Elegir W y R es elegir el punto en la curva latencia/consistencia de PACELC, **por operación** si el sistema lo permite.

Modelos de consistencia posibles: fuerte (como si hubiera una sola copia), débil (sin garantías) y **eventual** (todas las réplicas convergen con el tiempo). Dynamo y Cassandra adoptan eventual por defecto: permiten escrituras concurrentes que producen versiones en conflicto, y las reconcilian.

### Conflictos: vector clocks

Si dos clientes escriben la misma clave en réplicas distintas durante una partición, quedan dos versiones divergentes. ¿Cuál gana?

- **Last write wins** (LWW): gana el timestamp mayor. Simple, pero pierde escrituras en silencio y depende de relojes que no están sincronizados.
- **Vector clocks**: cada versión lleva un vector de pares `[servidor, contador]`. Al escribir a través de un servidor, se incrementa su contador.

```
 D1 = ([Sx,1])            escritura vía Sx
 D2 = ([Sx,2])            otra escritura vía Sx (D2 desciende de D1)
 D3 = ([Sx,2],[Sy,1])     escritura vía Sy sobre D2
 D4 = ([Sx,2],[Sz,1])     escritura concurrente vía Sz sobre D2
 D3 y D4: ninguno domina al otro → CONFLICTO → el cliente reconcilia → D5 = ([Sx,3],[Sy,1],[Sz,1])
```

Regla: una versión X es ancestro de Y si cada contador de Y es mayor o igual que el de X (no hay conflicto; Y reemplaza a X). Si hay algún contador mayor en X y otro mayor en Y, son **hermanas** y hay conflicto. La reconciliación la hace la aplicación (por ejemplo, unir los ítems de dos carritos).

Desventajas: el cliente debe implementar la reconciliación, y los vectores crecen con el número de servidores que tocan la clave; se recortan los pares más viejos al superar un umbral, aceptando alguna imprecisión rara.

### Detección de fallos: gossip

No basta con que un nodo diga que otro cayó (puede ser un problema de red entre ellos dos). Se exige que al menos dos fuentes independientes lo confirmen. Un esquema "todos contra todos" de heartbeats cuesta O(N²) mensajes. El **protocolo gossip** escala mejor:

1. Cada nodo mantiene una lista de miembros con su ID y un contador de heartbeat.
2. Cada nodo incrementa su contador periódicamente.
3. Cada nodo envía su lista a unos pocos nodos al azar, que la combinan con la propia y la propagan.
4. Si el contador de un miembro no aumenta durante un tiempo definido, se le considera caído.

La información se propaga como un rumor en O(log N) rondas.

### Fallos temporales: sloppy quorum y hinted handoff

Con un quórum estricto, si una de las réplicas "oficiales" está caída, las escrituras pueden bloquearse. El **sloppy quorum** mejora la disponibilidad: el coordinador escribe en los primeros W servidores **sanos** que encuentra en el anillo, aunque no sean los dueños oficiales. El nodo que recibe el dato "prestado" lo guarda con una **pista** (hint) de a quién pertenece, y cuando el dueño vuelve, se lo entrega: **hinted handoff**.

```
 Dueños de k: s1, s2, s3.  s2 caído.
 Escritura → s1, s3 y s4 (con hint "esto es de s2").
 s2 vuelve → s4 le entrega k → s4 borra su copia temporal.
```

### Fallos permanentes: anti-entropía con Merkle trees

Si una réplica pierde datos de forma permanente (disco roto) o quedó muy desactualizada, hay que **comparar** réplicas y reparar diferencias. Comparar claves una por una entre dos nodos con millones de claves es carísimo. Un **Merkle tree** lo hace eficiente:

1. El espacio de claves se divide en buckets (por ejemplo, 1 M de buckets).
2. Se calcula el hash de cada clave, luego un hash por bucket.
3. Se construye un árbol: cada nodo padre es el hash de sus hijos, hasta la raíz.
4. Dos réplicas comparan raíces: si coinciden, están sincronizadas. Si no, comparan los hijos y bajan solo por las ramas que difieren hasta encontrar los buckets distintos.

La cantidad de datos a transferir es proporcional a las **diferencias**, no al total. Con mil millones de claves en un millón de buckets, cada bucket tiene ~1.000 claves: solo se sincronizan los buckets distintos.

### Caída de un data center

Cortes de energía, de red o desastres naturales pueden dejar fuera un data center completo. Replicar en varios data centers permite que los clientes sigan accediendo a los datos desde otro sitio. En la práctica se configuran quórums locales (por ejemplo, W=2 dentro del data center del cliente) y la replicación hacia los demás data centers es asíncrona, para no pagar la latencia entre regiones en cada escritura.

### Arquitectura de cada nodo

El sistema es **descentralizado**: no hay un nodo especial, todos tienen las mismas responsabilidades (API, detección de fallos, reparación, motor de almacenamiento, replicación). Esto evita puntos únicos de fallo y simplifica operar.

```
 Cliente ──API (get/put)──> [Coordinador = cualquier nodo]
                                 │ reenvía a las N réplicas según el anillo
                ┌────────────────┼────────────────┐
             [nodo]           [nodo]           [nodo]
```

### Ruta de escritura y de lectura (motor tipo LSM)

Como viste en DDIA, el motor de cada nodo suele ser un **LSM-tree** (como en Cassandra):

**Escritura**: (1) se agrega la escritura al **commit log** en disco (durabilidad); (2) se escribe en la **memtable** en memoria; (3) cuando la memtable se llena, se vuelca a disco como una **SSTable** inmutable y ordenada.

**Lectura**: (1) se busca en la memtable; si está, se devuelve. (2) Si no, un **Bloom filter** por SSTable dice rápido en cuáles SSTables **no** está la clave (y en cuáles podría estar); (3) se leen solo esas SSTables; (4) se devuelve el resultado.

```
 put → [commit log] → [memtable] ──(llena)──> [SSTable 1] [SSTable 2] ...
 get → [memtable]? → [Bloom filters] → SSTables candidatas → valor
```

### Un recorrido completo con un fallo

Sigue una escritura y una lectura de la clave `cart:ana` con N=3, W=2, R=2, cuando uno de sus dueños está caído:

1. El cliente envía `put(cart:ana, {items: [libro]}, contexto: D([s1,4]))` a cualquier nodo, digamos `s7`, que actúa como coordinador. El contexto es el vector clock que el cliente leyó antes.
2. `s7` calcula la posición de la clave en el anillo: los dueños son `s1`, `s2` y `s3`. Gossip le informó que `s2` no responde.
3. Con sloppy quorum, `s7` envía la escritura a `s1`, `s3` y al siguiente nodo sano, `s4`, con un hint para `s2`. La nueva versión lleva `D([s1,5])` porque `s1` coordina el versionado de esta escritura.
4. `s1` y `s3` confirman (W=2 alcanzado) y `s7` responde éxito al cliente. `s4` también confirma un poco después.
5. Minutos más tarde, el cliente lee: `s7` consulta a `s1`, `s3` (y `s4`) y espera R=2 respuestas. Ambas devuelven `D([s1,5])`: no hay conflicto, devuelve el carrito.
6. Si una réplica hubiera devuelto una versión vieja, el coordinador devolvería la más nueva y además actualizaría la réplica atrasada en segundo plano (*read repair*).
7. Cuando `s2` vuelve, `s4` le entrega la escritura guardada con el hint y la borra.
8. Si `s2` hubiera perdido su disco, la anti-entropía con Merkle trees entre `s2` y sus vecinos reconstruiría todas sus claves.

En ningún momento hubo un líder ni una escritura rechazada: eso es lo que compra el diseño AP.

### La alternativa con líder y consenso

No todos los key-value stores son AP. etcd, ZooKeeper o Consul guardan pares clave-valor con **consenso** (Raft o similar): un líder ordena todas las escrituras y una mayoría debe confirmarlas. Son **CP**: si no hay mayoría, rechazan escrituras; a cambio ofrecen lecturas linealizables, operaciones *compare-and-swap* y *watches*. Se usan para datos pequeños y críticos: configuración, elección de líder, locks distribuidos, registros de servicios (sesión 11). Su throughput de escritura es mucho menor que el de un diseño tipo Dynamo, porque todo pasa por un líder y por un quórum.

| Aspecto | Estilo Dynamo/Cassandra | Estilo etcd/ZooKeeper |
| --- | --- | --- |
| Elección CAP | AP | CP |
| Líder | No | Sí (por consenso) |
| Volumen | Terabytes a petabytes | Megabytes a pocos gigabytes |
| Escrituras | Muy altas, en cualquier réplica | Moderadas, vía el líder |
| Uso | Datos de aplicación a gran escala | Coordinación y metadatos críticos |

### API más allá de get y put

Los key-value stores reales suelen agregar operaciones que conviene mencionar en un diseño: **TTL** por clave (expiración automática, útil para sesiones), **compare-and-swap** o escrituras condicionales (actualizar solo si la versión es la esperada, para concurrencia optimista), **operaciones por lotes** (`multi-get` para reducir viajes de red) y, en algunos, **rangos** de claves si el particionado lo permite (con hash no es eficiente; con rango sí).

### Números para dimensionar

Supón 10.000 millones de pares de 1 KB promedio, N = 3, nodos con 4 TB útiles de disco y 50.000 operaciones/s cada uno.

```
 datos       = 10^10 × 1 KB = 10 TB      → con N=3: 30 TB
 nodos (espacio) = 30 TB / 4 TB ≈ 8 → con margen del 50 % para compactación y crecimiento: ~12
 tráfico     = 200.000 lecturas/s + 50.000 escrituras/s
 operaciones internas: lectura R=2 → 400.000; escritura N=3 → 150.000; total ≈ 550.000/s
 nodos (tráfico) = 550.000 / 50.000 ≈ 11 → ~14 con margen
```

Conclusión: unos 14–16 nodos; el tráfico (no el espacio) es la restricción que manda en este caso. Si mañana los valores pasaran a 10 KB, el espacio (300 TB con réplicas) pasaría a mandar y necesitarías unos 110 nodos: el mismo diseño, otra restricción dominante.

### Operación del cluster

Un diseño así no termina en el diagrama. Para operarlo necesitas:

- **Agregar y quitar nodos** de forma gradual (sesión 08): el nodo nuevo recibe sus rangos con ancho de banda limitado antes de atender lecturas.
- **Compactación** del motor LSM: fusiona SSTables y elimina versiones viejas y borrados; consume I/O y debe programarse para no afectar la latencia. Los borrados se marcan con *tombstones* que deben sobrevivir lo suficiente para propagarse a todas las réplicas; si se eliminan antes de que una réplica caída vuelva, el dato borrado puede "resucitar".
- **Métricas clave**: latencia p99 por operación y por nodo, tasa de hints pendientes (indica nodos con problemas), progreso de reparaciones, uso de disco (el LSM necesita espacio libre para compactar) y desbalance de carga entre nodos (hot partitions).
- **Reparaciones periódicas** con anti-entropía, incluso sin fallos detectados, para corregir divergencias silenciosas.

### Trade-offs que debes saber defender

- **AP + eventual** da disponibilidad y escrituras siempre aceptadas, a cambio de conflictos que la aplicación resuelve.
- **Quórums** permiten mover el dial por operación, pero con sloppy quorum la garantía W + R > N deja de ser estricta durante fallos.
- **Sin líder** elimina el failover, pero complica el orden de escrituras concurrentes.
- **LSM** optimiza escrituras a costa de lecturas que pueden tocar varias SSTables y de compactaciones que consumen I/O.
- **Descentralización** total evita puntos únicos de fallo y simplifica el despliegue (todos los nodos son iguales), pero hace más difícil razonar sobre el estado global: no hay un lugar único donde preguntar "¿qué está pasando?", así que la observabilidad debe agregarse desde todos los nodos.
- **Valores pequeños** (menos de 10 KB) son un supuesto del diseño: con valores grandes (imágenes, videos), replicar N veces y reparar con Merkle trees se vuelve caro; esos objetos van a object storage y el key-value store guarda solo su referencia.

## Conceptos clave

- **DHT**: tabla hash distribuida entre muchos nodos.
- **Coordinador**: nodo que recibe la petición del cliente y la reenvía a las réplicas.
- **N, W, R**: réplicas, confirmaciones de escritura y respuestas de lectura requeridas.
- **Vector clock**: vector de contadores por servidor que detecta versiones concurrentes.
- **Gossip**: propagación epidémica de la membresía y los heartbeats.
- **Sloppy quorum**: quórum sobre los primeros nodos sanos, no necesariamente los dueños.
- **Hinted handoff**: devolución de datos guardados temporalmente al dueño cuando vuelve.
- **Merkle tree**: árbol de hashes que localiza diferencias entre réplicas transfiriendo poco.
- **Memtable / SSTable**: estructura en memoria / archivo ordenado e inmutable en disco del motor LSM.
- **Bloom filter**: estructura probabilística que descarta rápido dónde no está una clave.

## Preguntas de repaso

1. Con N=3, ¿qué valores de W y R eliges para un sistema que prioriza lecturas rápidas manteniendo lecturas consistentes? ¿Qué costo tiene?
   R: R=1 y W=3: W + R = 4 > 3, así que toda lectura ve la última escritura, y las lecturas solo esperan una respuesta. El costo es que las escrituras esperan a las tres réplicas: son más lentas y fallan si cualquier réplica está caída, salvo que se use sloppy quorum.
2. ¿Cómo detectas con vector clocks que dos versiones están en conflicto?
   R: Comparando los contadores por servidor: si todos los contadores de una versión son mayores o iguales que los de la otra, esa versión desciende de la otra y no hay conflicto. Si cada versión tiene al menos un contador mayor que la otra, son concurrentes y hay conflicto, que la aplicación debe reconciliar.
3. ¿Qué diferencia hay entre hinted handoff y anti-entropía con Merkle trees?
   R: Hinted handoff trata fallos temporales: otro nodo guarda las escrituras destinadas al nodo caído con una pista y se las entrega cuando vuelve. La anti-entropía con Merkle trees trata fallos permanentes o divergencias grandes: compara réplicas mediante árboles de hashes y sincroniza solo los buckets que difieren.
4. ¿Por qué se usa gossip en lugar de heartbeats de todos contra todos?
   R: Porque los heartbeats de todos contra todos generan O(N²) mensajes y no escalan con muchos nodos. Con gossip, cada nodo comparte periódicamente su lista de miembros con unos pocos nodos al azar y la información se propaga en O(log N) rondas, con tolerancia a fallos y sin coordinador central.
5. Describe la ruta de lectura en un nodo con motor LSM.
   R: Primero se busca en la memtable en memoria; si la clave no está, se consultan los Bloom filters de las SSTables para descartar las que seguro no la tienen; se leen solo las SSTables candidatas, desde la más reciente, y se devuelve el valor más nuevo encontrado.

## Ejercicio

Implementa en TypeScript una simulación de un key-value store con 5 nodos en memoria sobre tu `ConsistentHashRing` de la sesión 08: `put`/`get` con N, W y R configurables, versiones con vector clocks que devuelvan las hermanas en caso de conflicto, y un modo de fallo que marque un nodo como caído para probar sloppy quorum con hinted handoff. Escribe pruebas para: lectura consistente con W=R=2; conflicto detectado tras escrituras concurrentes en una partición simulada; y entrega del hint al nodo que vuelve. Terminado cuando las tres pruebas pasen.

## Explícalo con tus palabras

Explica cómo un key-value store distribuido sigue funcionando cuando se cae un servidor, usando la imagen de un grupo de amigos que guardan copias de las llaves de una casa compartida.
