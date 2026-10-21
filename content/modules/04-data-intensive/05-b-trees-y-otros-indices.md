---
title: B-trees, comparación con LSM y otros índices
kind: lesson
hours: 2
sources: Designing Data-Intensive Applications (Kleppmann), cap. 3 (pp. 101–112)
links: Use The Index, Luke (índices en SQL) | https://use-the-index-luke.com/ ; PostgreSQL, tipos de índices | https://www.postgresql.org/docs/current/indexes-types.html
---

## Objetivo

Entender cómo funciona un B-tree (la estructura de índice más usada del mundo), cómo se hace fiable ante crashes, compararlo con los LSM-trees con criterio, y conocer otros tipos de índices: secundarios, clustered, covering, multidimensionales, de texto completo y bases en memoria.

## Estudio

### B-trees: la estructura que está en casi todas partes

Los índices log-structured se están volviendo populares, pero la estructura de índice más extendida es otra muy distinta: el **B-tree**. Apareció en 1970 y en menos de diez años ya se le llamaba "ubicuo". Sigue siendo el índice estándar de casi todas las bases relacionales (PostgreSQL, MySQL InnoDB, SQL Server, Oracle, SQLite) y de muchas no relacionales.

Igual que las SSTables, un B-tree mantiene los pares clave-valor **ordenados por clave**, lo que permite búsquedas por clave y por rango. Ahí acaban las similitudes; la filosofía de diseño es otra.

| | LSM-tree | B-tree |
| --- | --- | --- |
| Unidad de almacenamiento | Segmentos de tamaño variable (MB o más), escritos secuencialmente | **Páginas** (bloques) de tamaño fijo, normalmente 4 KB (a veces más) |
| Modificación | Nunca modifica: solo añade y fusiona | **Sobrescribe** páginas en su sitio |
| Relación con el hardware | Escrituras secuenciales grandes | Se parece al hardware: los discos también están organizados en bloques fijos |

### Cómo se organiza un B-tree

Cada página se identifica por una dirección, y una página puede **referenciar a otra**, como un puntero pero en disco. Así se construye un árbol de páginas:

```
                         página raíz
          ┌──────┬─────┬──────┬─────┬──────┬─────┬──────┐
          │ ref  │ 100 │ ref  │ 200 │ ref  │ 300 │ ref  │
          └──┬───┴─────┴──┬───┴─────┴──┬───┴─────┴──┬───┘
             │ <100       │ 100–199    │ 200–299    │ ≥300
             ▼            ▼            ▼
                    ┌─────┬─────┬─────┬─────┬─────┐
                    │ ref │ 250 │ ref │ 270 │ ref │   (página interna)
                    └─────┴─────┴──┬──┴─────┴─────┘
                                   │ 250–269
                                   ▼
                    ┌────────────────────────────────┐
                    │ 251:val 252:val ... 269:val    │   (página hoja)
                    └────────────────────────────────┘
```

- Una página es la **raíz**; toda búsqueda empieza ahí.
- Cada página interna contiene claves y referencias a páginas hijas. Cada hijo es responsable de un **rango continuo** de claves, y las claves entre referencias marcan los límites.
- Las **páginas hoja** contienen las claves individuales y, o bien los valores, o bien referencias a donde están los valores.

Para buscar la clave 251: en la raíz ves que está entre 200 y 300, bajas a esa página; ahí ves que está entre 250 y 270, bajas; llegas a la hoja y la encuentras.

El número de referencias a hijos por página se llama **branching factor**. En la práctica depende del espacio que ocupen las claves y las referencias, y suele ser de **varios cientos**.

#### Actualizar e insertar

- **Actualizar** el valor de una clave: buscas la hoja que la contiene, cambias el valor y escribes la página de vuelta al disco. Las referencias a esa página siguen siendo válidas.
- **Insertar** una clave nueva: buscas la página cuyo rango la contiene y la añades. Si no hay espacio, la página se **divide** en dos medias páginas, y el padre se actualiza para reflejar la nueva división del rango.

```
antes: hoja llena  [333 335 337 340 342 344]      quieres insertar 334
después:           [333 334 335 337]   [340 342 344]
padre:   ... ref 333 ref 340 ref ...   (nuevo límite 340 en el padre)
```

Este algoritmo garantiza que el árbol esté siempre **balanceado**: un B-tree con *n* claves tiene profundidad **O(log n)**. La mayoría de bases caben en un B-tree de 3 o 4 niveles. Una cuenta para que lo sientas: con páginas de 4 KB y branching factor 500, un árbol de 4 niveles almacena hasta **256 TB**.

### Hacer fiable un B-tree

La operación básica de escritura de un B-tree es **sobrescribir una página en disco**. Se asume que sobrescribir no mueve la página: todas las referencias siguen apuntando al mismo sitio. Es lo contrario de los LSM, que nunca modifican archivos.

Algunas operaciones requieren sobrescribir **varias páginas**. Una división de página escribe las dos mitades y actualiza el padre. Si la base se cae a medio camino, el índice queda **corrupto** (por ejemplo, una página huérfana que no es hija de nadie).

La solución estándar es el **write-ahead log (WAL)**, también llamado *redo log*: un archivo de solo-añadido donde se escribe cada modificación **antes** de aplicarla a las páginas del árbol. Tras un crash, el WAL se usa para devolver el B-tree a un estado consistente.

```
UPDATE clave 251
  1. append al WAL: "página 87: clave 251 = v2"   ← durable (fsync)
  2. modificar la página 87 en memoria (buffer pool)
  3. más tarde, escribir la página 87 al disco (checkpoint)
crash entre 2 y 3 → al reiniciar, se reaplica el WAL y la página 87 queda bien
```

Otra complicación es la **concurrencia**: si varios hilos acceden al árbol a la vez, uno podría ver el árbol en un estado inconsistente. Se protege con **latches** (locks ligeros) sobre las páginas. Los enfoques log-structured son más sencillos aquí: el merge ocurre en segundo plano y luego se sustituye atómicamente.

PostgreSQL llama a su WAL precisamente "WAL"; en MySQL InnoDB es el *redo log*. Ese mismo log se usa además para la **replicación** (lo verás en la sesión 10).

### Optimizaciones de B-tree

Tras décadas de uso, hay muchas:

- **Copy-on-write** en lugar de WAL: una página modificada se escribe en una ubicación nueva y se crea una nueva versión de las páginas padre que apuntan a ella. LMDB lo hace. Además facilita el control de concurrencia (snapshots).
- **Abreviar claves**: en páginas internas basta con guardar lo suficiente para separar rangos. Más claves por página implican más branching factor y menos niveles. (Esta variante suele llamarse **B+ tree**.)
- **Disposición secuencial de hojas**: las páginas pueden estar en cualquier sitio del disco; para escanear rangos grandes, muchos motores intentan poner las hojas en orden. Mantenerlo al crecer es difícil; los LSM lo consiguen de forma natural porque reescriben segmentos completos.
- **Punteros a hermanos**: cada hoja apunta a la hoja de la izquierda y la de la derecha, para escanear en orden sin volver al padre.
- **Fractal trees**: variantes que toman ideas log-structured para reducir los seeks.

### B-trees frente a LSM-trees

Regla general: **los LSM suelen ser más rápidos para escribir y los B-trees para leer**. Las lecturas en LSM son más lentas porque deben mirar varias estructuras y varias SSTables en distintos estados de compactación. Pero los benchmarks son delicados: **prueba con tu carga real**.

#### Ventajas de los LSM-trees

**Menor write amplification.** Un B-tree escribe cada dato al menos dos veces: en el WAL y en la página (y quizá más si la página se divide). Además, escribe la página entera aunque solo cambien unos bytes; algunos motores escriben la misma página dos veces para protegerse de escrituras parciales en un corte de luz. Los LSM también reescriben datos varias veces por la compactación. Ese efecto, que **una escritura lógica produzca varias escrituras físicas** a lo largo de la vida del dato, se llama **write amplification**. Importa mucho en SSDs (que soportan un número limitado de sobrescrituras por bloque) y en cargas intensivas en escritura, donde el ancho de banda del disco es el cuello de botella.

**Mayor throughput de escritura.** Los LSM suelen sostener más escrituras por segundo, en parte por menor write amplification (depende de la configuración) y en parte porque escriben **secuencialmente** SSTables compactas en vez de sobrescribir páginas dispersas. En discos magnéticos la diferencia es enorme.

**Mejor compresión y menos fragmentación.** Los B-trees dejan espacio sin usar dentro de las páginas cuando se dividen o cuando una fila no cabe. Los LSM reescriben periódicamente y comprimen mejor, sobre todo con leveled compaction.

En los SSDs, el firmware ya usa internamente un algoritmo log-structured para convertir escrituras aleatorias en secuenciales, así que la diferencia se atenúa. Aun así, representar los datos de forma más compacta permite más operaciones dentro del mismo ancho de banda.

#### Desventajas de los LSM-trees

**La compactación interfiere.** Los discos tienen recursos limitados; una petición puede tener que esperar a que el disco termine una compactación cara. El throughput medio apenas se nota, pero en los **percentiles altos** la latencia de un LSM puede dispararse; los B-trees son más **predecibles**.

**La compactación puede quedarse atrás.** El ancho de banda de escritura se reparte entre las escrituras nuevas (WAL y volcado de memtables) y los hilos de compactación. Cuanto más grande la base, más ancho de banda necesita la compactación. Si el ritmo de escritura es alto y la compactación no da abasto, los segmentos sin fusionar crecen hasta llenar el disco y las lecturas se ralentizan. Normalmente el motor **no frena las escrituras**, así que necesitas **monitorizarlo explícitamente** (RocksDB expone métricas de *pending compaction bytes* y aplica *write stalls* configurables).

**Una clave, un sitio.** En un B-tree cada clave existe en **exactamente un lugar** del índice. En un LSM puede haber varias copias en distintos segmentos. Esto hace a los B-trees atractivos para semánticas transaccionales fuertes: muchas bases implementan el aislamiento con **locks sobre rangos de claves**, y en un B-tree esos locks se pueden colgar directamente del árbol.

| Criterio | B-tree | LSM-tree |
| --- | --- | --- |
| Escrituras | Más lentas (aleatorias, página completa) | Más rápidas (secuenciales) |
| Lecturas puntuales | Rápidas y predecibles | Pueden tocar varias SSTables |
| Latencia en cola (p99) | Predecible | Picos por compactación |
| Write amplification | WAL + página (+ splits) | Compactaciones repetidas (depende de la estrategia) |
| Espacio en disco | Fragmentación interna | Más compacto, mejor compresión |
| Locks por rango de clave | Naturales | Más complejos |
| Ejemplos | PostgreSQL, InnoDB, SQL Server, SQLite, LMDB | RocksDB, LevelDB, Cassandra, HBase, ScyllaDB |

No hay una regla definitiva: los motores log-structured son cada vez más populares en almacenes nuevos y los B-trees siguen arraigados. Decide midiendo.

### Otros tipos de índices

Hasta ahora hablamos de índices de **clave primaria**: identifican de forma única una fila, documento o vértice, y otros registros se refieren a ella con esa clave (foreign key).

#### Índices secundarios

Son muy comunes. En SQL los creas con `CREATE INDEX` y son clave para hacer JOINs eficientes (por ejemplo, un índice sobre `user_id` en la tabla de pedidos). La diferencia principal: **las claves no son únicas**. Muchas filas pueden tener el mismo valor. Dos soluciones:

- Cada valor del índice apunta a una **lista de identificadores** de filas (como la *posting list* de un índice de texto).
- Hacer cada clave única **añadiéndole el identificador** de la fila.

Tanto B-trees como LSM sirven para índices secundarios.

#### Guardar valores dentro del índice

La clave de un índice es lo que buscas; el valor puede ser:

1. **La fila completa** dentro del índice: un **clustered index**. En MySQL InnoDB, la clave primaria es siempre un clustered index y los índices secundarios apuntan a la clave primaria (no a una ubicación física). En SQL Server puedes elegir un clustered index por tabla.
2. **Una referencia** a la fila guardada en otro lugar, en un **heap file** (sin orden particular). Es lo que hace PostgreSQL. Evita duplicar datos cuando hay varios índices secundarios: todos apuntan al heap. Al actualizar un valor sin cambiar la clave, si el nuevo valor cabe, se reescribe en su sitio; si no cabe, se mueve y se deja un puntero de reenvío (o se actualizan los índices).
3. Un punto intermedio: un **covering index** (o *index with included columns*), que guarda **algunas** columnas de la tabla dentro del índice. Así ciertas consultas se responden **solo con el índice** (*index-only scan*), sin ir a la tabla.

```sql
-- PostgreSQL: el índice "cubre" la consulta, no hace falta visitar el heap
CREATE INDEX orders_user_idx ON orders (user_id) INCLUDE (total, created_at);
SELECT total, created_at FROM orders WHERE user_id = 42;
```

Duplicar datos en índices acelera lecturas, pero cuesta espacio y escrituras, y la base debe cuidar que las transacciones no vean inconsistencias entre las copias.

#### Índices multicolumna

El más común es el **concatenated index**: combina varias columnas en una sola clave, concatenadas en orden. Es como una guía telefónica ordenada por `(apellido, nombre)`: encuentras rápido a todos los "García" o a "García, Ana", pero **no sirve** para buscar a todas las "Ana" de cualquier apellido. El orden de las columnas importa.

Los **índices multidimensionales** son más generales y son vitales para datos geoespaciales. Un sitio de restaurantes quiere todos los que están dentro de un rectángulo del mapa:

```sql
SELECT * FROM restaurants
WHERE latitude  > 51.4946 AND latitude  < 51.5079
  AND longitude > -0.1162 AND longitude < -0.1004;
```

Un B-tree o LSM normal puede dar todos los restaurantes en un rango de latitud (de cualquier longitud) o al revés, pero no ambos a la vez. Opciones: convertir las dos dimensiones en un solo número con una **curva de llenado del espacio** (Z-order, Hilbert) y usar un índice normal, o usar índices espaciales especializados como los **R-trees** (PostGIS usa R-trees sobre GiST). Sirven también para otras dimensiones: colores (rojo, verde, azul) en un ecommerce, o `(fecha, temperatura)` en observaciones meteorológicas.

#### Búsqueda de texto completo e índices difusos

Los índices vistos asumen valores exactos o rangos. No permiten buscar claves **parecidas**, como palabras mal escritas. Los motores de texto completo expanden una búsqueda a sinónimos, ignoran variaciones gramaticales, buscan palabras cercanas en el documento, etc.

**Lucene** puede buscar palabras dentro de una **distancia de edición** (una distancia de 1 significa una letra añadida, quitada o cambiada). Usa una estructura tipo SSTable para su diccionario de términos, pero su índice en memoria no es un conjunto disperso de claves como en LevelDB: es un **autómata finito** sobre los caracteres de las claves, parecido a un *trie*, que puede transformarse en un **autómata de Levenshtein** para buscar eficientemente por distancia de edición.

#### Mantenerlo todo en memoria

Todo lo anterior responde a las limitaciones del disco. Toleramos el disco porque es **durable** y **más barato por GB**. Pero la RAM se abarata y muchos datasets no son tan grandes, así que existen **bases de datos en memoria**:

- Algunas son solo cache, como **Memcached**: si la máquina se reinicia, se pierde todo y no pasa nada.
- Otras buscan durabilidad: hardware especial (RAM con batería), escribir un log de cambios a disco, snapshots periódicos, o replicar el estado a otras máquinas. **VoltDB**, **MemSQL (SingleStore)** y **Oracle TimesTen** son relacionales en memoria; **Redis** y **Couchbase** ofrecen durabilidad débil escribiendo a disco de forma asíncrona.

Un detalle contraintuitivo: **la ventaja de rendimiento de una base en memoria no viene de evitar leer disco**. Un motor basado en disco con memoria suficiente tampoco lee disco, porque el sistema operativo cachea los bloques recientes. La ventaja real es que **evita el coste de codificar estructuras en memoria en un formato apto para disco**.

Además, permiten modelos de datos difíciles de implementar con índices en disco: Redis expone colas de prioridad, sets, sorted sets, y su implementación es relativamente simple porque todo vive en memoria. Existe también la idea de **anti-caching**: expulsar a disco los registros menos usados cuando falta memoria y traerlos al volver a acceder, como hace el sistema operativo con el swap, pero con granularidad de registro.

### Ideas erróneas frecuentes

- **"Los LSM siempre son mejores porque escriben más rápido."** Pagan con lecturas más costosas y picos de latencia por compactación; mide con tu carga.
- **"Un índice compuesto `(a, b)` sirve para filtrar por `b`."** Solo sirve para prefijos: `a`, o `a` y `b`.
- **"Las bases en memoria son rápidas porque no leen disco."** Son rápidas porque evitan serializar estructuras para disco.
- **"El B-tree reescribe todo el árbol en cada cambio."** Sobrescribe solo las páginas afectadas (y escribe en el WAL).
- **"Más índices siempre es mejor."** Cada índice encarece cada escritura y ocupa espacio.

### Resumen

El B-tree organiza los datos en páginas fijas formando un árbol balanceado de poca profundidad, sobrescribe páginas en su sitio y usa un WAL para sobrevivir a crashes. Frente a los LSM, ofrece lecturas y latencias más predecibles y una ubicación única por clave, mientras que los LSM escriben más rápido y ocupan menos espacio. Más allá de la clave primaria existen índices secundarios, clustered, covering, multicolumna, espaciales y difusos, y las bases en memoria cambian las reglas del juego al eliminar el coste de codificar para disco.

## Conceptos clave

- **B-tree**: árbol balanceado de páginas de tamaño fijo, ordenado por clave, con profundidad O(log n).
- **Página**: bloque fijo (típicamente 4 KB) que el B-tree lee y sobrescribe.
- **Branching factor**: número de hijos por página; suele ser de varios cientos.
- **Page split**: división de una página llena en dos al insertar.
- **WAL (redo log)**: log donde se escribe cada cambio antes de aplicarlo, para recuperarse tras un crash.
- **Latch**: lock ligero que protege estructuras internas frente a la concurrencia.
- **Write amplification**: cuántas escrituras físicas provoca una escritura lógica.
- **Clustered index**: índice que guarda la fila completa junto a la clave.
- **Heap file**: archivo donde viven las filas y al que apuntan los índices.
- **Covering index**: índice que incluye columnas extra para responder consultas sin visitar la tabla.
- **Concatenated index**: índice sobre varias columnas concatenadas en un orden.
- **R-tree**: índice espacial para consultas multidimensionales.
- **Anti-caching**: expulsar registros poco usados de una base en memoria a disco.

## Preguntas de repaso

1. ¿Por qué un B-tree con millones de claves solo necesita 3 o 4 niveles?
   R: Porque cada página tiene un branching factor de varios cientos; cada nivel multiplica el número de claves alcanzables por ese factor. Con 500 hijos por página y 4 niveles se alcanzan cientos de terabytes de datos con páginas de 4 KB.
2. ¿Qué problema resuelve el WAL en un B-tree?
   R: Algunas operaciones, como una división de página, requieren sobrescribir varias páginas; un crash a mitad dejaría el árbol corrupto. Escribiendo antes cada cambio en un log de solo-añadido, tras un reinicio se reaplica el log y el árbol vuelve a un estado consistente.
3. ¿Qué es la write amplification y por qué afecta a B-trees y LSM?
   R: Es la cantidad de escrituras físicas que provoca una escritura lógica a lo largo de la vida del dato. El B-tree escribe en el WAL y en la página completa (y en splits); el LSM reescribe datos en cada compactación. Importa porque consume ancho de banda de disco y desgasta los SSDs.
4. ¿Por qué un LSM puede tener peor p99 que un B-tree aunque su throughput medio sea mayor?
   R: Porque la compactación en segundo plano compite por el disco con las peticiones; ocasionalmente una lectura o escritura espera a que termine una compactación costosa, lo que produce picos en los percentiles altos. El B-tree no tiene ese trabajo de fondo y es más predecible.
5. ¿Cuál es la diferencia entre un clustered index, un heap file y un covering index?
   R: Un clustered index guarda la fila completa en el propio índice (InnoDB con la clave primaria). Con un heap file los índices solo guardan referencias a filas almacenadas aparte (PostgreSQL). Un covering index guarda algunas columnas adicionales en el índice para responder ciertas consultas sin visitar la tabla.
6. ¿Por qué un índice concatenado `(apellido, nombre)` no sirve para buscar por nombre?
   R: Porque las entradas están ordenadas primero por apellido; las personas con el mismo nombre están dispersas por todo el índice. Solo sirve para búsquedas por el prefijo de columnas (apellido, o apellido y nombre).
7. ¿De dónde viene realmente la ventaja de rendimiento de las bases en memoria?
   R: De evitar el coste de codificar las estructuras de datos en un formato apto para disco; no de evitar las lecturas, porque un motor en disco con suficiente memoria ya sirve todo desde el cache del sistema operativo.

## Ejercicio

En PostgreSQL (o SQLite, ajustando la sintaxis) crea una tabla `orders(id, user_id, status, total, created_at)` con 500.000 filas generadas (`generate_series`).

1. Ejecuta `EXPLAIN ANALYZE SELECT total FROM orders WHERE user_id = 1234;` sin índices y anota el plan y el tiempo.
2. Crea un índice sobre `user_id` y repite. Luego crea un índice con `INCLUDE (total)` y comprueba que aparece un *Index Only Scan* (ejecuta `VACUUM ANALYZE` antes).
3. Crea un índice `(status, created_at)` y comprueba con `EXPLAIN` que se usa para `WHERE status='paid' AND created_at > now() - interval '7 days'` pero no para `WHERE created_at > ...` solo.
4. Mide el tiempo de insertar 100.000 filas nuevas con 0 índices y con 3 índices.

Criterio de terminado: tienes una tabla con los cuatro planes y tiempos, y una frase que explica cada diferencia con los conceptos de la lección.

## Explícalo con tus palabras

Explica a alguien por qué "los LSM escriben más rápido y los B-trees leen más predecible" usando la imagen de un cuaderno donde solo añades notas frente a un archivador donde corriges las fichas en su sitio.
