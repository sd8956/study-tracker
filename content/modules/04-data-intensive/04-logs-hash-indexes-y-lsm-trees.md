---
title: Logs, hash indexes, SSTables y LSM-trees
kind: lesson
hours: 2
sources: Designing Data-Intensive Applications (Kleppmann), cap. 3 (pp. 91–101)
links: Bitcask, paper original | https://riak.com/assets/bitcask-intro.pdf ; RocksDB, visión general | https://github.com/facebook/rocksdb/wiki/RocksDB-Overview
---

## Objetivo

Entender cómo guarda y encuentra datos un motor de almacenamiento log-structured: desde el log de solo escritura con hash index en memoria (Bitcask) hasta los SSTables y LSM-trees que usan LevelDB, RocksDB, Cassandra y HBase.

## Estudio

### Por qué te interesa cómo almacena datos la base

No vas a escribir tu propio motor de almacenamiento. Pero sí vas a **elegir** uno entre muchos, y luego **ajustarlo**. Para eso necesitas una idea de qué hace por dentro. En particular, hay una gran diferencia entre motores optimizados para **transacciones** (muchas lecturas y escrituras pequeñas) y motores optimizados para **analítica** (pocas consultas que recorren millones de filas). Esta sesión y la siguiente cubren los primeros; la sesión 06 cubre los segundos.

Hay dos familias de motores transaccionales:

- **Log-structured**: solo añaden datos al final de archivos y nunca modifican lo escrito (Bitcask, LevelDB, RocksDB, Cassandra, HBase).
- **Page-oriented**: actualizan páginas de tamaño fijo en su sitio; el representante es el **B-tree** (PostgreSQL, MySQL InnoDB, SQL Server, Oracle).

### La base de datos más simple del mundo

Dos funciones de Bash:

```bash
db_set () { echo "$1,$2" >> database; }
db_get () { grep "^$1," database | sed -e "s/^$1,//" | tail -n 1; }
```

`db_set` añade una línea `clave,valor` al final de un archivo. `db_get` busca la última línea con esa clave. Si actualizas una clave, la versión vieja no se borra: queda escrita y `tail -n 1` se queda con la más reciente.

```
$ db_set 42 '{"name":"San Francisco"}'
$ db_set 42 '{"name":"San Francisco","attractions":["Golden Gate"]}'
$ db_get 42
{"name":"San Francisco","attractions":["Golden Gate"]}

archivo "database":
42,{"name":"San Francisco"}
42,{"name":"San Francisco","attractions":["Golden Gate"]}
```

Escribir es rapidísimo: añadir al final de un archivo es lo más eficiente que se puede hacer en disco, porque es **escritura secuencial**. Muchas bases de datos usan internamente un **log**: una secuencia de registros de solo-añadido (*append-only*). No tiene por qué ser legible por humanos; puede ser binario.

El problema es leer: `db_get` recorre el archivo entero, así que su coste es **O(n)**. Si duplicas los datos, duplicas el tiempo de lectura.

### Índices: el gran trade-off

Para encontrar rápido un valor necesitas un **índice**: una estructura adicional, derivada de los datos primarios, que funciona como señalización. Puedes añadir y quitar índices sin cambiar el contenido de la base; solo afectan al rendimiento.

El trade-off fundamental de todo el almacenamiento:

> **Los índices bien elegidos aceleran las lecturas, pero todo índice ralentiza las escrituras.**

Cada escritura debe actualizar también los índices, y nada es más rápido que simplemente añadir al final de un archivo. Por eso las bases no indexan todo por defecto: tú eliges los índices según tus consultas.

### Hash index: un mapa en memoria hacia el log

La forma más simple de indexar un log de clave-valor: mantener en memoria un **hash map** que asocia cada clave con el **byte offset** donde está su valor más reciente en el archivo.

```
hash map en memoria                     archivo de log en disco
┌──────────┬────────┐                   offset
│ clave    │ offset │                     0   123456,{"name":"London",...}
├──────────┼────────┤                    64   42,{"name":"San Francisco",...}
│ 123456   │   0    │ ─────────────────►  0
│ 42       │   64   │ ─────────────────► 64
└──────────┴────────┘
```

- **Escribir**: añades el par al final del archivo y actualizas el hash map con el nuevo offset.
- **Leer**: consultas el hash map, haces un `seek` al offset y lees el valor. **Un solo acceso a disco** (o ninguno si esa parte está en el cache del sistema de archivos).

Parece demasiado simple, pero es exactamente lo que hace **Bitcask**, el motor por defecto de Riak. Su gran restricción: **todas las claves deben caber en RAM**. Los valores pueden ser más grandes que la memoria porque viven en disco.

Encaja muy bien cuando hay **muchas escrituras por clave pero pocas claves distintas**. Ejemplo: la clave es la URL de un video y el valor el número de reproducciones, que se incrementa con cada play.

### Segmentos y compactación

Si solo añades, el disco se llena. La solución: dividir el log en **segmentos**. Cuando un segmento alcanza cierto tamaño, se cierra y las escrituras siguen en un archivo nuevo. Los segmentos cerrados son **inmutables**.

Luego aplicas **compactación**: recorres un segmento y te quedas solo con el valor más reciente de cada clave.

```
segmento (antes de compactar)
mew:1078  purr:2103  purr:2104  mew:1079  mew:1080  mew:1081  purr:2105  mew:1082

después de compactar
purr:2105  mew:1082
```

Como la compactación reduce mucho el tamaño, puedes **fusionar varios segmentos** a la vez (*merging*). El resultado se escribe en un **archivo nuevo**; los segmentos viejos siguen sirviendo lecturas mientras tanto. Cuando el merge termina, cambias las lecturas al segmento nuevo y borras los viejos. Todo ocurre en un hilo en segundo plano.

Cada segmento tiene su propio hash map. Para leer una clave, miras primero el hash map del segmento más reciente; si no está, el anterior, y así sucesivamente. El merge mantiene bajo el número de segmentos.

### Detalles que hacen que funcione en la vida real

| Problema | Solución |
| --- | --- |
| **Formato de archivo** | CSV es mala idea; mejor binario: longitud en bytes + bytes crudos, sin necesidad de escapar caracteres. |
| **Borrar claves** | Añadir un registro especial de borrado, una **tombstone**. Al fusionar, la tombstone indica descartar los valores anteriores de esa clave. |
| **Recuperación tras crash** | Los hash maps en memoria se pierden. Puedes reconstruirlos leyendo cada segmento entero (lento) o, como Bitcask, guardar un **snapshot del hash map** en disco para cargarlo rápido. |
| **Registros escritos a medias** | La base puede caerse mientras escribe un registro. Se añaden **checksums** para detectar y descartar registros corruptos. |
| **Concurrencia** | Como las escrituras son estrictamente secuenciales, lo habitual es **un solo hilo escritor**. Los segmentos son inmutables, así que muchos hilos pueden leer a la vez. |

### ¿Por qué no actualizar en el sitio?

A primera vista, un log de solo-añadido parece un desperdicio. ¿Por qué no sobrescribir el valor viejo? Por varias razones:

1. **Las escrituras secuenciales son mucho más rápidas que las aleatorias**, sobre todo en discos magnéticos, pero también en SSDs (por cómo gestionan internamente los bloques).
2. **Concurrencia y recuperación son mucho más simples** si los segmentos son inmutables: no hay que preocuparse de un crash a mitad de sobrescribir un valor, que dejaría mezcla de dato viejo y nuevo.
3. **Fusionar segmentos viejos evita la fragmentación** a lo largo del tiempo.

Pero el hash index tiene limitaciones serias:

- **Las claves tienen que caber en memoria.** Un hash map en disco es posible pero rinde mal: mucho I/O aleatorio, crecer es caro y las colisiones requieren lógica delicada.
- **Las consultas por rango son ineficientes.** No puedes pedir "todas las claves entre `kitty00000` y `kitty99999`": tendrías que buscar cada clave por separado.

### SSTables: ordenar por clave

Cambiemos una sola cosa: exijamos que, dentro de cada segmento, los pares estén **ordenados por clave**. A ese formato se le llama **Sorted String Table** (SSTable). Además, cada clave aparece una sola vez por segmento (la compactación ya lo garantiza).

Ventajas enormes frente a los segmentos con hash index:

**1. Fusionar es simple y eficiente aunque los archivos no quepan en memoria.** Es el algoritmo de merge de *mergesort*: abres los segmentos de entrada, miras la primera clave de cada uno, copias la menor al archivo de salida y avanzas. Si la misma clave aparece en varios segmentos, te quedas con la del segmento **más reciente**.

```
segmento 1 (viejo)        segmento 2               segmento 3 (nuevo)
handbag:8786             handcuffs:2729           handful:44662
handful:40308            handlebars:3869          handicap:70140
handicap:65182           handful:...              handsome:...
         \                     │                       /
          └──────────── merge ordenado ───────────────┘
                              ▼
          handbag:8786 handcuffs:2729 handful:44662
          handicap:70140 handlebars:3869 handsome:...
          (si la clave se repite, gana el segmento más nuevo)
```

**2. No necesitas indexar todas las claves en memoria.** Como las claves están ordenadas, basta un **índice disperso** (*sparse index*): una entrada cada pocos kilobytes. Si buscas `handiwork` y sabes que `handbag` está en el offset 102134 y `handsome` en el 109993, `handiwork` (si existe) tiene que estar entre ambos. Saltas a `handbag` y escaneas desde ahí.

```
índice disperso en memoria         SSTable en disco (ordenada)
handbag   → 102134    ──────────►  handbag ... handcuffs ... handful ...
handsome  → 109993    ──────────►  handsome ... hangar ... ...
               "handiwork" está en el bloque [102134, 109993)
```

**3. Puedes comprimir bloques.** Como de todas formas lees varios registros por consulta, agrupas los registros en bloques, los comprimes, y cada entrada del índice disperso apunta al inicio de un bloque comprimido. Ahorras disco y ancho de banda de I/O.

### Construir y mantener SSTables: el LSM-tree

¿Cómo consigues que los datos queden ordenados por clave si las escrituras llegan en cualquier orden? Ordenar en disco es posible (lo verás con los B-trees), pero ordenar **en memoria** es mucho más fácil: usas una estructura de árbol balanceado como un **red-black tree** o un **AVL tree**, donde insertas claves en cualquier orden y las lees ordenadas.

El motor funciona así:

```
                escritura (k, v)
                       │
        ┌──────────────┼───────────────┐
        ▼                              ▼
   WAL / log en disco             memtable (árbol balanceado en RAM)
   (solo para recuperación)              │ cuando supera ~ unos MB
                                         ▼
                              volcado como SSTable nueva (ordenada)
                                         │
     disco:  [SSTable más nueva] [SSTable] [SSTable] [SSTable más vieja]
                                         ▲
                        compactación + merge en segundo plano
```

1. Una escritura llega y se inserta en el árbol en memoria, la **memtable**.
2. Cuando la memtable supera un umbral (unos pocos megabytes), se vuelca a disco como una **SSTable**. Es eficiente porque el árbol ya está ordenado. Mientras se escribe, las nuevas escrituras van a una memtable nueva.
3. Para **leer** una clave: primero buscas en la memtable, luego en la SSTable más reciente, luego en la anterior, etc.
4. De vez en cuando, en segundo plano, un proceso de **compactación y merge** combina SSTables y descarta valores sobrescritos o borrados.

Un problema: si la base se cae, se pierde lo que había en la memtable. Solución: mantener también un **log en disco** (WAL) al que se añade cada escritura inmediatamente. No está ordenado, pero no importa: solo sirve para reconstruir la memtable tras un crash. Cuando la memtable se vuelca como SSTable, se descarta su log.

Este diseño se publicó como **Log-Structured Merge-Tree (LSM-tree)** (Patrick O'Neil et al., 1996), basado en trabajos sobre sistemas de archivos log-structured. A los motores que siguen este principio de fusionar y compactar archivos ordenados se les llama motores LSM.

### Quién usa LSM en el mundo real

- **LevelDB** (Google) y **RocksDB** (Facebook): bibliotecas embebibles. RocksDB está dentro de MySQL (MyRocks), CockroachDB (que luego escribió Pebble, compatible), Kafka Streams, TiKV y muchos más.
- **Cassandra** y **HBase**: inspirados en el paper de **Bigtable** de Google, que introdujo los términos *memtable* y *SSTable*.
- **Lucene** (el motor de Elasticsearch y Solr) usa una idea parecida para su **índice invertido**: el diccionario de términos (palabra → lista de documentos) se guarda en archivos ordenados tipo SSTable que se fusionan en segundo plano.

### Optimizaciones de rendimiento

**Bloom filters.** Buscar una clave que **no existe** es caro: hay que mirar la memtable y luego todas las SSTables hasta la más vieja. Un **Bloom filter** es una estructura en memoria que aproxima un conjunto: puede decirte con certeza que una clave **no está** (y te ahorras leer disco), aunque a veces dice "quizá está" por error (falso positivo). Nunca da falsos negativos.

**Estrategias de compactación.** Hay dos grandes familias:

| Estrategia | Cómo funciona | Usada en | Trade-off |
| --- | --- | --- | --- |
| **Size-tiered** | SSTables pequeñas y nuevas se fusionan sucesivamente en otras más grandes y viejas | HBase; Cassandra (por defecto) | Escritura barata, pero más espacio temporal y lecturas que tocan más archivos |
| **Leveled** | El rango de claves se parte en SSTables pequeñas organizadas en niveles; los datos viejos bajan de nivel | LevelDB, RocksDB; Cassandra (opcional) | Compactación más incremental, menos espacio y lecturas más predecibles, pero más escritura |

### Por qué los LSM-trees son buenos

- **Escrituras rapidísimas**: todo es secuencial (append al WAL, volcados de memtable, merges).
- **Rangos eficientes**: los datos están ordenados, así que `scan(desde, hasta)` es natural.
- **Datasets mucho mayores que la memoria**: solo necesitas el índice disperso y los Bloom filters en RAM.
- **Buena compresión** y poca fragmentación.

El coste aparece en lecturas de claves que requieren mirar varias SSTables y en el trabajo de compactación en segundo plano, que compite con las escrituras del usuario. Lo verás en detalle en la próxima sesión cuando los compares con los B-trees.

### Recorrido completo de una lectura en un LSM

```
get("handiwork")
  1. memtable activa ............................. no está
  2. memtable inmutable (volcándose) .............. no está
  3. SSTable nivel 0 #12: Bloom filter dice "no" ... saltar (sin disco)
  4. SSTable nivel 0 #11: Bloom filter dice "quizá"
       índice disperso → bloque [handful..hangar) → leer bloque,
       descomprimir, buscar ........................ no está (falso positivo)
  5. SSTable nivel 1: Bloom "quizá" → bloque → ENCONTRADA: handiwork:83321
  devolver 83321  (si fuera una tombstone, devolver "no existe")
```

Fíjate en el orden: siempre del dato más nuevo al más viejo, y el primer hallazgo gana, incluso si es una tombstone.

### Números para tener intuición

Haz el cálculo con un dataset realista para ver por qué el índice disperso cambia el juego. Supón 1.000 millones de claves de 20 bytes con valores de 200 bytes: unos 220 GB de datos.

- **Hash index completo (estilo Bitcask)**: cada entrada del hash map necesita la clave (20 bytes), el offset (8 bytes) y la sobrecarga de la estructura (fácilmente 30–50 bytes más). Son del orden de 60–80 GB de RAM solo para el índice. Inviable en una máquina normal.
- **Índice disperso sobre SSTables**: con bloques de 4 KB caben unos 18 registros por bloque, es decir, unos 55 millones de bloques. Una entrada por bloque (clave + offset ≈ 30 bytes) son unos 1,6 GB. Y si los bloques son de 64 KB comprimidos, el índice baja a unos 100 MB.
- **Bloom filters**: con 10 bits por clave obtienes una tasa de falsos positivos cercana al 1 %. Para 1.000 millones de claves son unos 1,25 GB, y casi siempre te ahorran leer disco al buscar claves inexistentes.

La cuenta muestra el trade-off: el índice disperso te obliga a leer y descomprimir un bloque entero en cada búsqueda (más CPU y algo más de latencia), pero hace que el dataset ya no tenga que caber en memoria.

### Cómo se ve en un sistema real: Cassandra

Cassandra combina exactamente estas piezas. Cuando escribes una fila, el nodo la añade al **commit log** (el WAL) y la inserta en la **memtable** de esa tabla. Cuando la memtable se llena, se vuelca como una SSTable inmutable compuesta por varios archivos: los datos ordenados por clave de partición, un índice de particiones, un **summary** (el índice disperso que vive en memoria), un **Bloom filter** y metadatos de compresión. Borrar escribe una tombstone que vive al menos `gc_grace_seconds` (10 días por defecto) para que las réplicas que estuvieron caídas reciban el borrado antes de que la compactación lo elimine; si la tombstone desapareciera antes, una réplica atrasada podría "resucitar" el dato borrado. Ese detalle operativo, las **tombstones acumuladas que ralentizan lecturas**, es una de las fuentes de incidentes más conocidas en Cassandra.

### Ideas erróneas frecuentes

- **"Append-only desperdicia espacio para siempre."** La compactación recupera el espacio; el log crece solo de forma temporal.
- **"Un hash index sirve para todo."** Requiere que las claves quepan en memoria y no soporta consultas por rango.
- **"Borrar una clave la elimina del disco al instante."** Se escribe una tombstone; el dato desaparece físicamente solo tras compactar.
- **"El WAL de un LSM está ordenado."** No: es un log de llegada; solo la memtable y las SSTables están ordenadas.
- **"Un Bloom filter puede dar falsos negativos."** No: si dice "no está", es seguro; solo puede equivocarse diciendo "quizá".

### Resumen

Un log de solo-añadido es la forma más rápida de escribir. Para leer rápido, un hash index en memoria apunta a offsets (Bitcask), con segmentos inmutables, compactación, tombstones y checksums. Si además ordenas cada segmento por clave obtienes SSTables, que permiten merges tipo mergesort, índices dispersos, compresión por bloques y consultas por rango. El LSM-tree organiza todo: memtable en RAM con WAL, volcados a SSTables y compactación en segundo plano, acelerado con Bloom filters.

## Conceptos clave

- **Log**: secuencia de registros de solo-añadido.
- **Índice**: estructura derivada que acelera lecturas a costa de ralentizar escrituras.
- **Hash index**: hash map en memoria de clave a byte offset en el archivo de datos.
- **Segmento**: archivo de log cerrado e inmutable.
- **Compactación**: descartar valores sobrescritos dejando solo el más reciente por clave.
- **Tombstone**: registro especial que marca una clave como borrada.
- **SSTable**: segmento con pares ordenados por clave y claves únicas.
- **Sparse index**: índice con una entrada cada cierto número de bytes, posible gracias al orden.
- **Memtable**: árbol balanceado en memoria donde se acumulan las escrituras recientes.
- **LSM-tree**: arquitectura de memtable + SSTables + compactación en segundo plano.
- **Bloom filter**: estructura probabilística que dice con certeza si una clave no está.
- **Size-tiered vs leveled compaction**: dos estrategias de fusión con trade-offs de escritura, lectura y espacio.

## Preguntas de repaso

1. ¿Qué limitación fundamental tiene un motor como Bitcask y en qué carga brilla?
   R: Todas las claves deben caber en RAM porque el hash index vive en memoria, y no soporta consultas por rango. Brilla con cargas de muchas escrituras sobre pocas claves distintas, como contadores de reproducciones por URL.
2. ¿Por qué ordenar los segmentos por clave (SSTables) permite no tener todas las claves en memoria?
   R: Porque con las claves ordenadas basta un índice disperso: si sabes los offsets de dos claves vecinas, cualquier clave intermedia está entre ellas, así que saltas al inicio del bloque y escaneas unos pocos kilobytes.
3. Describe los pasos de una escritura y una lectura en un LSM-tree.
   R: Escritura: se añade al WAL en disco y se inserta en la memtable; cuando la memtable supera un umbral se vuelca como SSTable ordenada. Lectura: se busca en la memtable, luego en las SSTables de la más nueva a la más vieja (usando Bloom filters e índices dispersos), y el primer hallazgo gana.
4. ¿Para qué sirve el WAL en un LSM y por qué no necesita estar ordenado?
   R: Sirve solo para reconstruir la memtable si el proceso se cae antes de volcarla a disco. Como se lee entero y secuencialmente durante la recuperación, el orden de llegada basta; se descarta cuando la memtable correspondiente ya es una SSTable.
5. ¿Qué hace una tombstone durante la compactación?
   R: Marca que la clave fue borrada; al fusionar segmentos, el proceso descarta todos los valores anteriores de esa clave. La tombstone puede eliminarse cuando ya no quedan segmentos más viejos que contengan la clave.
6. ¿Por qué un Bloom filter acelera las búsquedas de claves inexistentes?
   R: Porque puede afirmar con certeza que una clave no está en una SSTable sin leer disco. Sin él, buscar una clave inexistente obligaría a consultar todas las SSTables hasta la más vieja.
7. Compara size-tiered y leveled compaction.
   R: Size-tiered fusiona SSTables de tamaño similar en otras más grandes: escribe menos pero usa más espacio temporal y una lectura puede tocar más archivos. Leveled divide el rango de claves en SSTables pequeñas por niveles: compacta incrementalmente con menos espacio y lecturas más predecibles, a cambio de más escritura.

## Ejercicio

Implementa en TypeScript (Node ≥ 22, `node:fs`) una clase `TinyLog` con `set(key, value)`, `get(key)` y `delete(key)`:

1. Las escrituras se añaden a un archivo en formato `longitudClave|clave|longitudValor|valor\n`.
2. Un `Map<string, number>` en memoria guarda el offset del valor más reciente.
3. `delete` escribe una tombstone (por ejemplo, longitud de valor `-1`).
4. Al arrancar, `TinyLog` reconstruye el `Map` leyendo el archivo completo.

Criterio de terminado: un script de prueba escribe 1.000 actualizaciones sobre 10 claves, borra 2, reinicia la instancia (nueva `TinyLog` sobre el mismo archivo) y `get` devuelve los últimos valores correctos y `undefined` para las borradas. Esta clase es la semilla del proyecto de la sesión 07.

## Explícalo con tus palabras

Explica por qué ordenar las claves dentro de cada segmento convierte un hash index limitado por la RAM en un LSM-tree que maneja datasets más grandes que la memoria.
