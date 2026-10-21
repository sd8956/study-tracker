---
title: "Batch processing: de Unix a MapReduce y Spark"
kind: lesson
hours: 2
sources: Designing Data-Intensive Applications (Kleppmann), Parte III intro (pp. 407–410) | cap. 10 (pp. 411–451)
links: Google, paper de MapReduce | https://research.google/pubs/mapreduce-simplified-data-processing-on-large-clusters/ ; Apache Spark, guía de RDDs | https://spark.apache.org/docs/latest/rdd-programming-guide.html
---

## Objetivo

Entender el procesamiento por lotes: la filosofía Unix de componer herramientas, cómo MapReduce ejecuta trabajos sobre un sistema de archivos distribuido, cómo se implementan los joins (reduce-side y map-side), por qué la salida de un batch debe ser inmutable, y qué mejoran los motores de dataflow como Spark y Flink.

## Estudio

### Sistemas de registro y datos derivados

Arranca la Parte III. Hasta ahora asumiste que hay una única base de datos. En la realidad, una aplicación combina varios almacenes, índices, caches y sistemas analíticos, y necesita mover datos entre ellos. Los sistemas que guardan y procesan datos se dividen en dos grandes categorías:

- **Sistemas de registro** (*systems of record*, *source of truth*): guardan la versión autoritativa de los datos. Cuando llega un dato nuevo (por ejemplo, input de un usuario), se escribe primero aquí, normalizado, cada hecho una sola vez. Si hay discrepancia con otro sistema, gana este.
- **Sistemas de datos derivados**: el resultado de tomar datos existentes de otro sistema y transformarlos o procesarlos. Si los pierdes, puedes **recrearlos** desde la fuente original. Ejemplos: un **cache**, un **índice de búsqueda**, una **vista materializada**, un **modelo predictivo**. Son técnicamente redundantes (duplican información), pero esenciales para un buen rendimiento de lectura, y a menudo están desnormalizados.

Esta distinción no depende de la herramienta, sino de **cómo la usas** en tu aplicación. Pensar en qué datos derivan de cuáles aclara un sistema complicado.

### Tres tipos de sistemas

| Tipo | Cómo funciona | Métrica principal |
| --- | --- | --- |
| **Servicios (online)** | Esperan una petición y responden lo antes posible | Response time y disponibilidad |
| **Batch (offline)** | Toman un gran volumen de datos de entrada, ejecutan un trabajo y producen una salida; suelen tardar de minutos a días y se programan periódicamente | **Throughput**: tiempo para procesar un volumen de datos |
| **Stream (near-real-time)** | Entre online y offline: consumen entradas y producen salidas como un batch, pero operan sobre **eventos poco después de ocurrir** | Latencia baja sobre datos que no paran de llegar |

Esta sesión trata el batch; la siguiente, el streaming.

### Batch processing con herramientas Unix

Empecemos con un ejemplo simple. Tienes un servidor web nginx que añade una línea al log por cada petición:

```
216.58.210.78 - - [27/Feb/2015:17:55:11 +0000] "GET /css/typography.css HTTP/1.1" 200 3377 "http://martin.kleppmann.com/" "Mozilla/5.0 ..."
```

Quieres las **cinco páginas más populares** del sitio. En un shell Unix:

```bash
cat /var/log/nginx/access.log |   # leer el log
  awk '{print $7}' |               # extraer la URL (7º campo)
  sort             |               # ordenar alfabéticamente: URLs iguales quedan juntas
  uniq -c          |               # contar repeticiones consecutivas
  sort -r -n       |               # ordenar por número, descendente
  head -n 5                        # las 5 primeras
```

Es una cadena potentísima: procesa gigabytes de logs en segundos y se modifica fácilmente (por ejemplo, para omitir CSS o contar IPs de cliente).

La alternativa sería un programa con una **tabla hash en memoria** (`URL → contador`). ¿Cuál es mejor? Depende:

- Si el número de URLs distintas cabe en memoria, la tabla hash funciona bien aunque el log sea enorme.
- Si no cabe, el enfoque de **ordenar** tiene ventaja: se puede hacer con merges eficientes en disco (como las SSTables de la sesión 04). GNU `sort` vuelca a disco automáticamente cuando el dataset supera la memoria y paraleliza entre núcleos. El cuello de botella suele ser leer el archivo de disco.

#### La filosofía Unix

No es casualidad que podamos analizar logs así: es uno de los principios clave de diseño de Unix (McIlroy, 1964: "conectar programas como mangueras de jardín"). Resumido en 1978:

1. Haz que cada programa haga **una cosa bien**. Para algo nuevo, crea un programa nuevo en lugar de complicar uno viejo.
2. Espera que **la salida de cada programa sea la entrada de otro**, aún desconocido. No ensucies la salida con información extra. Evita formatos binarios o columnas estrictas. No insistas en entrada interactiva.
3. Diseña y construye software para **probarlo pronto**, incluso semanas. No dudes en tirar las partes torpes y reconstruirlas.
4. Usa **herramientas** en lugar de mano de obra no especializada para aliviar una tarea, aunque tengas que desviarte para construirlas.

Lo que hace posible componer:

- **Una interfaz uniforme**: en Unix, un **archivo**, es decir, una secuencia ordenada de bytes que por convención se interpreta como texto con un registro por línea. La mayoría del software actual no comparte una interfaz así.
- **Separar la lógica del cableado**: los programas usan `stdin` y `stdout` sin saber de dónde vienen ni a dónde van; el shell hace el cableado (*loose coupling*, *inversión de control*).
- **Transparencia y experimentación**: los archivos de entrada son **inmutables** (puedes reejecutar el pipeline cuanto quieras); puedes cortar el pipeline en cualquier punto y mirar la salida con `less`; puedes guardar la salida de una etapa en un archivo y reanudar desde ahí.

La mayor limitación de Unix: estas herramientas solo corren en **una máquina**. Ahí entra Hadoop.

### MapReduce y sistemas de archivos distribuidos

MapReduce es un poco como las herramientas Unix, pero **distribuido en miles de máquinas**. Es una herramienta bastante tosca, pero eficaz. Un trabajo MapReduce es como un proceso Unix: toma una o más entradas y produce una o más salidas. Como la mayoría de herramientas Unix, **no modifica la entrada** y no tiene efectos secundarios más allá de producir la salida.

En lugar de `stdin`/`stdout`, los trabajos MapReduce leen y escriben archivos en un **sistema de archivos distribuido**. En Hadoop es **HDFS** (*Hadoop Distributed File System*), una reimplementación open source del Google File System. Hoy es más común usar **almacenamiento de objetos** como Amazon S3 o Google Cloud Storage.

HDFS es **shared-nothing**: un daemon en cada máquina expone sus archivos, un **NameNode** central sabe qué bloques están dónde, y los bloques se **replican** (o se protegen con *erasure coding*) para tolerar fallos.

#### Ejecución de un trabajo MapReduce

Para crear un trabajo MapReduce implementas dos funciones de callback, **mapper** y **reducer**:

1. **Leer** los archivos de entrada y partirlos en **registros** (en el ejemplo, cada línea es un registro).
2. **Map**: llamar al mapper para extraer una **clave y un valor** de cada registro (la URL como clave, valor vacío). El mapper se llama una vez por registro y es **stateless**: cada registro se maneja de forma independiente.
3. **Ordenar** todos los pares clave-valor por clave (en el ejemplo de Unix, el primer `sort`). En MapReduce esto es **implícito**: la salida del mapper siempre se ordena antes de pasar al reducer.
4. **Reduce**: llamar al reducer para iterar sobre los valores de cada clave (contar cuántas veces aparece la URL). Como están ordenados, todos los valores de una clave son adyacentes.

```
                     map                       shuffle (partición por hash de clave + sort)        reduce
bloque 1 ──► mapper 1 ──► (url_a,1)(url_b,1) ─┐
bloque 2 ──► mapper 2 ──► (url_a,1)(url_c,1) ─┼──► reducer 1: url_a [1,1,1] → url_a 3
bloque 3 ──► mapper 3 ──► (url_b,1)(url_a,1) ─┘     reducer 2: url_b [1,1]   → url_b 2
                                                    reducer 3: url_c [1]     → url_c 1
```

La gran diferencia con Unix es que MapReduce **paraleliza** el cómputo en muchas máquinas sin que tengas que escribir código de paralelización. El paralelismo se basa en el **particionado**: la entrada suele ser un directorio en HDFS, y cada archivo o bloque es una partición que procesa una tarea map separada.

El scheduler intenta ejecutar cada mapper **en una máquina que tenga una réplica del bloque de entrada**: *putting the computation near the data*. Así ahorra copiar el archivo por la red y mejora la localidad.

El número de tareas reduce lo configura el autor del trabajo. Para asegurar que todos los pares con la misma clave terminen en el mismo reducer, el framework usa un **hash de la clave** para decidir qué tarea reduce recibe cada par. Cada mapper particiona su salida por reducer y la ordena (con una técnica parecida a las SSTables). Cuando un mapper termina, los reducers se conectan a cada mapper y **descargan** los archivos ordenados de su partición. Este proceso de particionar por reducer, ordenar y copiar de mappers a reducers se llama **shuffle** (nombre confuso: no hay aleatoriedad). El reducer fusiona los archivos ordenados preservando el orden.

#### Workflows

Un solo trabajo resuelve poco (contar visitas no da el top 5), así que se **encadenan** trabajos en un **workflow**, conectados implícitamente por nombres de directorio. Han surgido schedulers de workflows: **Oozie, Azkaban, Luigi, Airflow** y Pinball. Workflows de **50 a 100 trabajos MapReduce** son comunes para construir sistemas de recomendación. Herramientas de alto nivel como **Pig, Hive, Cascading, Crunch y FlumeJava** montan automáticamente workflows de varias etapas.

### Joins en batch: reduce-side

En una base de datos, una consulta sobre pocos registros usa un índice; con joins, varias búsquedas de índice. **MapReduce no tiene índices** en el sentido habitual: lee el contenido completo de los archivos de entrada (un *full table scan*). Para leer pocos registros sería carísimo, pero en consultas analíticas que agregan sobre muchísimos registros, escanear todo es razonable, sobre todo si se paraleliza. Cuando hablamos de joins en batch, nos referimos a resolver **todas** las ocurrencias de una asociación en un dataset.

#### Ejemplo: actividad de usuarios

A la izquierda, un **log de eventos de actividad** (clickstream) con el ID de usuario; a la derecha, una **base de datos de usuarios** con su perfil (fecha de nacimiento). Quieres saber qué páginas son más populares por grupo de edad. Es un star schema: el log es la tabla de hechos y la base de usuarios una dimensión.

La implementación más simple **consultaría la base de usuarios remota** por cada evento: lentísimo (limitado por el tiempo de ida y vuelta), capaz de saturar la base y no determinista si la base cambia durante el trabajo.

Mejor: tomar una **copia de la base de usuarios** (por ejemplo, un volcado del backup o vía CDC) y ponerla en el mismo sistema de archivos que los logs. Así puedes usar MapReduce para juntar todos los registros relevantes en un sitio y procesarlos eficientemente.

#### Sort-merge join

```
mapper de eventos:   evento(user=104, url=/x)  ──► clave 104, valor (url=/x)
mapper de usuarios:  usuario(id=104, dob=1990) ──► clave 104, valor (dob=1990)

shuffle: todos los registros con clave 104 llegan al mismo reducer, y con
"secondary sort" el registro del usuario llega PRIMERO, luego sus eventos:

reducer(104): [dob=1990, url=/x, url=/y, url=/z]
   → guarda dob en una variable local, recorre los eventos y emite (url, edad)
```

Un conjunto de mappers procesa los eventos y emite el ID de usuario como clave; otro procesa la base de usuarios y emite también el ID como clave. Tras el shuffle, todos los registros de un usuario quedan **adyacentes** en el mismo reducer. Con un **secondary sort**, el reducer ve primero el registro del usuario y luego sus eventos ordenados por fecha. El reducer guarda el perfil en una variable local e itera los eventos: solo necesita **un registro de usuario en memoria** a la vez y **no hace peticiones de red**. Como los mappers ordenan su salida por clave y los reducers fusionan las listas ordenadas, se llama **sort-merge join**.

La idea clave: **traer los datos relacionados al mismo lugar**. Separar la comunicación de red (el shuffle) de la lógica de la aplicación es lo que permite que MapReduce **maneje fallos de forma transparente**: si un nodo cae, se reintenta la tarea sin afectar a la lógica.

#### GROUP BY y skew

El mismo patrón sirve para **agrupar** (`GROUP BY`): configurar los mappers para que la clave sea la de agrupación. Útil también para **sesionizar**: juntar todos los eventos de la sesión de un usuario para ver su secuencia de acciones (por ejemplo, para un test A/B).

Problema: **hot keys** o *linchpin objects*. En una red social, una celebridad con millones de seguidores: en un join por usuario, todo su trabajo cae en un reducer, que tarda muchísimo y frena todo el trabajo (*skew*). Soluciones: el **skewed join** de Pig muestrea primero para detectar claves calientes y reparte sus registros entre **varios reducers aleatorios**, replicando el otro lado del join a todos ellos. El **sharded join** de Crunch es parecido, pero requiere especificar las claves explícitamente. Hive usa un **map-side join** para las claves calientes. En agregaciones, se puede hacer en **dos etapas**: primero agregar parcialmente en reducers aleatorios y luego combinar.

### Joins en el lado map

Los joins reduce-side no asumen nada sobre los datos de entrada (los mappers los preparan), pero el sort, el copiado y el merge pueden ser caros. Si **sí puedes asumir** algo sobre la entrada, los **map-side joins** son más rápidos: no hay reducers ni sorting; cada mapper lee un bloque de entrada y escribe un bloque de salida.

| Tipo | Requisito | Cómo funciona |
| --- | --- | --- |
| **Broadcast hash join** | Un dataset grande y uno **pequeño** que cabe en memoria de cada mapper | Cada mapper carga el dataset pequeño en una **tabla hash** y recorre su bloque del grande buscando en ella |
| **Partitioned hash join** | Ambas entradas **particionadas igual** (mismo número de particiones, misma clave y misma función hash) | Cada mapper solo carga la partición correspondiente del dataset pequeño (*bucketed map joins* en Hive) |
| **Map-side merge join** | Ambas entradas particionadas igual **y ordenadas** por la misma clave | El mapper lee ambos archivos secuencialmente en orden ascendente y empareja claves, como un reducer |

La salida de un reduce-side join está particionada y ordenada por la clave del join; la de un map-side join, igual que la entrada grande. Para usar map-side joins hay que conocer la **disposición física** de los datasets (codificación, particiones, orden): por eso son importantes los **metadatos** como el *HCatalog* y el *Hive metastore*.

### La salida de los workflows batch

¿Para qué sirve el resultado de un batch? No es OLTP (consultar pocos registros por clave) ni exactamente analítica (aunque Hive genera informes). Suele construir algo:

#### Construir índices de búsqueda

Google usó MapReduce originalmente para construir los **índices de su buscador**. Los mappers particionan los documentos, cada reducer construye el índice de su partición y lo escribe como archivos inmutables; si cambian los documentos, se reejecuta el workflow y se sustituyen los índices viejos.

#### Almacenes clave-valor como salida

Otro uso común: construir sistemas de **machine learning** (clasificadores, recomendaciones como "personas que quizá conozcas"). La salida suele ser una base de datos que la aplicación web consulta por ID de usuario. ¿Cómo llega la salida a esa base?

- **Mala idea**: escribir directamente desde el mapper o reducer a la base de producción, registro a registro. Una petición de red por registro es órdenes de magnitud más lenta que el throughput normal de un batch; muchas tareas en paralelo pueden **saturar** la base y afectar a los servicios online; y si el trabajo falla a medias, deja **resultados parciales** visibles (MapReduce garantiza "todo o nada" solo para su propia salida).
- **Buena idea**: construir una **base de datos nueva dentro del trabajo batch**, escribirla como archivos en el sistema de archivos distribuido (como se escriben los índices) y cargarla en bloque en los servidores. **Voldemort, Terrapin, ElephantDB y la carga masiva de HBase** lo soportan. Los servidores siguen sirviendo los archivos viejos mientras se copian los nuevos y luego cambian atómicamente; si algo va mal, se vuelve a los viejos.

#### La filosofía de las salidas batch

Los trabajos MapReduce siguen la filosofía Unix: **tratan la entrada como inmutable y evitan efectos secundarios**. Eso da propiedades muy valiosas:

- Si introduces un bug, puedes **revertir el código** y reejecutar para obtener una salida correcta; en una base con escrituras, revertir el código no arregla los datos ya escritos. A esto se le llama **human fault tolerance**.
- Como es fácil revertir, el desarrollo puede avanzar **más rápido** que en un entorno donde los errores son irreversibles (*minimizing irreversibility*, bueno para el desarrollo ágil).
- Si una tarea map o reduce falla, el framework la **reprograma** y la ejecuta con la misma entrada. Si el fallo se debe a un bug, acabará fallando del todo tras unos intentos; si es transitorio, se tolera. Reintentar es seguro porque **la entrada es inmutable** y las salidas de tareas fallidas se descartan.
- Los mismos archivos de entrada sirven para **varios trabajos distintos** (incluidos trabajos de monitorización que calculan métricas y comparan la salida con ejecuciones anteriores).
- Separa la **lógica del cableado**: aislamiento entre equipos (uno escribe un trabajo que hace bien una cosa y otros equipos deciden dónde y cuándo ejecutarlo).

### Hadoop frente a bases de datos distribuidas

Hadoop se parece a una versión distribuida de Unix: HDFS es el sistema de archivos y MapReduce una implementación peculiar de un proceso Unix. Cuando apareció (2004), algunos pensaron que no era nuevo: todo lo de la sesión de joins ya se había implementado en bases **MPP** (*massively parallel processing*) como Teradata o Gamma una década antes. La diferencia: las bases MPP ejecutan consultas SQL analíticas en paralelo en un clúster; MapReduce + sistema de archivos distribuido es más parecido a un **sistema operativo de propósito general** que puede ejecutar programas arbitrarios.

| Aspecto | MPP | Hadoop |
| --- | --- | --- |
| **Diversidad de almacenamiento** | Exige estructurar los datos con el modelo y esquema de la base antes de importarlos | Vuelcas cualquier dato (texto, imágenes, logs, vectores de features) y decides después cómo interpretarlo (*schema-on-read*, el "**sushi principle**": los datos crudos son mejores). Es la idea del **data lake** |
| **Diversidad de modelos de procesamiento** | SQL, monolítico y muy optimizado | SQL (Hive), pero también ML, sistemas de recomendación, índices de texto, análisis de imágenes con código arbitrario |
| **Diseño para fallos frecuentes** | Si un nodo falla durante una consulta, se aborta y se reejecuta toda; prefieren datos en memoria | Tolera fallos de tareas individuales sin afectar el trabajo; escribe a disco con generosidad |

¿Por qué MapReduce está diseñado para fallos tan frecuentes? No por hardware poco fiable, sino porque en Google los trabajos batch de baja prioridad comparten máquinas con servicios de producción y pueden ser **expulsados** (*preempted*) en cualquier momento: una tarea de una hora tenía un 5 % de probabilidad de ser terminada.

### Más allá de MapReduce

MapReduce es útil para aprender, pero usarlo directamente es **laborioso**, y su **modelo de ejecución** tiene problemas que no se arreglan añadiendo abstracciones encima.

#### Materialización del estado intermedio

Cada trabajo MapReduce es independiente; su contacto con el mundo son sus directorios de entrada y salida. En workflows de 50–100 trabajos, la mayoría de esos archivos son **estado intermedio**: solo sirven para pasar datos al siguiente trabajo. MapReduce los **materializa** por completo (los escribe a disco replicados), a diferencia de los pipes Unix, que hacen **streaming** de la salida a la entrada usando un pequeño buffer. Desventajas:

- Un trabajo solo puede empezar cuando **todas** las tareas del anterior terminaron; una tarea rezagada (*straggler*) frena todo el workflow.
- Los mappers a menudo son **redundantes**: solo releen lo que acaba de escribir un reducer y lo preparan para la siguiente etapa.
- Guardar el estado intermedio en un sistema de archivos distribuido implica **replicarlo** en varios nodos: exagerado para datos temporales.

#### Motores de dataflow

Para resolver estos problemas surgieron motores como **Spark, Tez y Flink**. Tienen diferencias, pero un rasgo común: **manejan el workflow completo como un solo trabajo**, en lugar de partirlo en subtrabajos independientes. Modelan el flujo a través de varias etapas como un grafo: son **dataflow engines**. Como MapReduce, llaman repetidamente a una función de usuario sobre registros en un solo hilo y paralelizan particionando. Pero no alternan estrictamente map y reduce: las funciones (**operadores**) se ensamblan de formas más flexibles. Ventajas:

- Operaciones caras como el sort solo se hacen **donde se necesitan**, no siempre entre cada map y reduce.
- No hay tareas map innecesarias: el trabajo de un mapper se puede incorporar al operador reduce anterior.
- Como todos los joins y dependencias de datos son explícitos, el scheduler puede **optimizar la localidad** (poner a consumidor y productor en la misma máquina).
- Suele bastar con guardar el estado intermedio **en memoria o en disco local**, sin replicarlo en HDFS.
- Los operadores pueden empezar en cuanto su entrada está lista, sin esperar a que termine toda la etapa anterior.
- Los procesos JVM existentes pueden **reutilizarse**, ahorrando tiempo de arranque.

Puedes reimplementar workflows de MapReduce sobre ellos sin cambiar el código (Pig, Hive o Cascading funcionan sobre Tez o Spark cambiando la configuración).

#### Tolerancia a fallos sin materializar

Si el estado intermedio no se materializa, ¿cómo se recupera un fallo? Spark, Flink y Tez **recomputan** los datos perdidos desde datos anteriores todavía disponibles (otra etapa intermedia o la entrada original). Para ello, el framework debe **rastrear cómo se calculó cada dato**: qué particiones de entrada se usaron y qué operadores se aplicaron. Spark usa la abstracción **RDD** (*Resilient Distributed Dataset*) para rastrear el **linaje** de los datos; Flink hace **checkpoints** del estado de los operadores.

Al recomputar importa si el cálculo es **determinista**: si los operadores no son deterministas (iteran tablas hash en orden aleatorio, usan números aleatorios o el reloj), recomputar puede dar un resultado distinto del que ya consumió una etapa posterior, que también habría que recomputar. Por eso los operadores deberían ser deterministas (por ejemplo, generar aleatorios con una semilla fija). Si el dato intermedio es mucho más pequeño que la entrada o el cálculo es caro, **materializarlo** puede ser más barato que recomputarlo.

#### Grafos y procesamiento iterativo

Algoritmos como **PageRank** iteran hasta converger, y en MapReduce cada iteración relee todo el dataset. El modelo **Pregel** (*bulk synchronous parallel*) lo resuelve: en cada iteración los vértices **se envían mensajes** a lo largo de las aristas y procesan los recibidos en la siguiente, con estado tolerante a fallos (Giraph, GraphX de Spark, Gelly de Flink). Ojo: si el grafo cabe en una máquina, un algoritmo de un solo nodo suele ser más rápido que repartirlo con tanta comunicación de red.

#### APIs y lenguajes de alto nivel

Las **APIs de dataflow** de Spark y Flink construyen el grafo con operadores relacionales (`join`, `groupBy`, `filter`) y funciones arbitrarias. Además de requerir menos código, permiten **optimización**: como los operadores son **declarativos** (sesión 03), un optimizador basado en coste puede elegir el algoritmo de join más adecuado (por ejemplo, broadcast si un lado es pequeño), reordenar joins para minimizar el estado intermedio y aplicar **ejecución vectorizada** sobre datos columnares (sesión 06). Así los sistemas batch se parecen cada vez más a las bases MPP, sin perder la flexibilidad de ejecutar código arbitrario. Spark SQL y Flink SQL son la consecuencia natural.

```ts
// Pseudocódigo estilo Spark (DataFrame API): páginas más populares por grupo de edad
events
  .join(users, "userId")                       // el optimizador puede elegir broadcast join
  .withColumn("ageGroup", floor((2026 - col("birthYear")) / 10) * 10)
  .groupBy("ageGroup", "url")
  .count()
  .orderBy(desc("count"))
  .limit(5);
```

### Ideas erróneas frecuentes

- **"MapReduce usa índices para los joins."** Hace full scans y junta los datos relacionados con el shuffle.
- **"Escribir directamente a la base de producción desde el batch es eficiente."** Satura la base y deja resultados parciales; mejor construir archivos y cargarlos en bloque.
- **"MapReduce está diseñado para hardware poco fiable."** Está diseñado para tolerar la expulsión frecuente de tareas de baja prioridad.
- **"Los motores de dataflow no son tolerantes a fallos porque no materializan."** Recomputan desde el linaje o checkpoints, idealmente con operadores deterministas.

### Resumen

Los sistemas de registro guardan la verdad y los datos derivados (caches, índices, modelos) se pueden recalcular. El batch procesa grandes volúmenes priorizando throughput, heredando de Unix la interfaz uniforme, la separación lógica-cableado y la inmutabilidad de la entrada. MapReduce ejecuta map, shuffle y reduce sobre un sistema de archivos distribuido, con joins reduce-side (sort-merge, con cuidado de hot keys) y map-side (broadcast, particionados, merge). Su salida inmutable da human fault tolerance. Los motores de dataflow (Spark, Flink, Tez) evitan materializar el estado intermedio, recomputan desde el linaje y, con APIs declarativas, se acercan a las bases MPP.

## Conceptos clave

- **System of record / derived data**: fuente de verdad frente a datos recalculables a partir de ella.
- **Batch processing**: procesar un gran volumen de datos acotado, priorizando throughput.
- **Filosofía Unix**: programas pequeños con interfaz uniforme compuestos con pipes.
- **HDFS / object storage**: sistema de archivos distribuido donde viven entradas y salidas.
- **Mapper / reducer**: funciones que extraen pares clave-valor y combinan valores por clave.
- **Shuffle**: particionar por clave, ordenar y copiar la salida de mappers a reducers.
- **Sort-merge join**: join reduce-side que junta registros relacionados por clave.
- **Hot key (skew)**: clave con desproporción de registros que sobrecarga un reducer.
- **Broadcast / partitioned hash join / map-side merge join**: joins sin reducers basados en supuestos sobre la entrada.
- **Human fault tolerance**: poder recuperarse de código con bugs reejecutando sobre entradas inmutables.
- **Data lake**: almacenar datos crudos y decidir después cómo interpretarlos.
- **Dataflow engine**: motor que ejecuta el workflow entero como un grafo de operadores (Spark, Flink, Tez).
- **RDD / linaje**: abstracción de Spark que registra cómo se calculó cada dato para recomputarlo.
- **Pregel (BSP)**: modelo iterativo de grafos con mensajes entre vértices.

## Preguntas de repaso

1. ¿Qué diferencia hay entre un sistema de registro y un sistema de datos derivados?
   R: El sistema de registro guarda la versión autoritativa de los datos, escrita primero y normalizada; un sistema derivado (cache, índice, vista materializada, modelo) es el resultado de transformar esos datos y puede recrearse desde la fuente si se pierde.
2. ¿Qué tres rasgos de Unix hacen tan componibles sus herramientas?
   R: Una interfaz uniforme (archivos como secuencias de bytes, normalmente líneas de texto), la separación de la lógica y el cableado mediante stdin/stdout, y la transparencia: entradas inmutables, salida inspeccionable en cualquier etapa y posibilidad de reanudar.
3. Describe las etapas de un trabajo MapReduce.
   R: Leer la entrada y partirla en registros; map, que extrae pares clave-valor de cada registro; shuffle, que particiona por hash de la clave, ordena y copia a los reducers; y reduce, que itera sobre todos los valores de cada clave para producir la salida.
4. ¿Cómo funciona un sort-merge join y por qué no necesita peticiones de red a una base externa?
   R: Mappers de ambos datasets emiten la clave del join; el shuffle junta todos los registros con la misma clave en el mismo reducer y un secondary sort pone primero el registro del usuario. El reducer guarda ese registro en memoria y recorre los eventos. Como se usó una copia de la base en el sistema de archivos, no hay consultas remotas.
5. ¿Por qué es mala idea escribir desde un trabajo batch directamente a la base de producción?
   R: Porque una petición por registro es mucho más lenta que el throughput del batch, muchas tareas en paralelo pueden saturar la base y afectar a los servicios online, y si el trabajo falla quedan resultados parciales visibles; es mejor construir archivos nuevos y cargarlos en bloque.
6. ¿Qué es human fault tolerance y por qué la ofrece el batch?
   R: La capacidad de recuperarse de código con bugs: como la entrada es inmutable y la salida se reemplaza completa, basta con revertir el código y reejecutar para obtener una salida correcta, algo imposible si el código con bugs ya modificó datos en una base.
7. ¿Qué tres desventajas de materializar el estado intermedio resuelven los motores de dataflow?
   R: Esperar a que termine toda la etapa anterior (stragglers frenan todo), mappers redundantes que solo releen lo escrito por un reducer, y replicar en el sistema de archivos distribuido datos temporales; los motores de dataflow ejecutan el grafo completo, guardan el intermedio en memoria o disco local y recomputan desde el linaje.

## Ejercicio

Implementa en TypeScript un mini MapReduce en un solo proceso:

1. `runJob({ inputs, map, reduce, numReducers })`: aplica `map` a cada registro, particiona por `hash(key) % numReducers`, ordena cada partición por clave y aplica `reduce` a cada grupo.
2. Usa un log de acceso sintético (100.000 líneas, 500 URLs con distribución Zipf) y encadena dos trabajos: contar visitas por URL y luego obtener el top 5. Compara el resultado con el pipeline Unix de la lección sobre el mismo archivo.
3. Implementa un sort-merge join entre `events.jsonl` (`userId`, `url`) y `users.jsonl` (`userId`, `birthYear`) para obtener las URLs más populares por década de nacimiento.
4. Implementa el mismo join como broadcast hash join (usuarios en un `Map`) y compara tiempos.
5. Introduce un usuario "celebridad" con el 30 % de los eventos y mide el tiempo del reducer más lento frente al promedio.

Criterio de terminado: el top 5 coincide con el de `sort | uniq -c | sort -rn | head -5`, ambos joins dan el mismo resultado, e imprimes los tiempos de los puntos 4 y 5.

## Explícalo con tus palabras

Explica por qué "la entrada es inmutable y la salida se reemplaza entera" hace que un bug en un trabajo batch sea mucho menos grave que un bug en una aplicación que escribe en la base.
