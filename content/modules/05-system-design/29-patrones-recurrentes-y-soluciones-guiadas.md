---
title: Patrones recurrentes — tres soluciones guiadas y el catálogo del módulo
kind: lesson
hours: 2
sources: System Design Primer, soluciones "Design Amazon's sales ranking by category feature", "Design the data structures for a social network", "Design Mint.com" y "Design a system that scales to millions of users on AWS" | System Design Interview (Alex Xu), cap. 16 "The learning continues" (pp. 264–268) | karanpratapsingh/system-design, "Next Steps"
links: Primer — Sales rank solution | https://github.com/donnemartin/system-design-primer/blob/master/solutions/system_design/sales_rank/README.md ; Primer — Social graph solution | https://github.com/donnemartin/system-design-primer/blob/master/solutions/system_design/social_graph/README.md ; Primer — Mint solution | https://github.com/donnemartin/system-design-primer/blob/master/solutions/system_design/mint/README.md ; Primer — Scaling on AWS solution | https://github.com/donnemartin/system-design-primer/blob/master/solutions/system_design/scaling_aws/README.md ; Primer — Real world architectures | https://github.com/donnemartin/system-design-primer#real-world-architectures
---

## Objetivo

Consolidar el módulo reconociendo los patrones que se repiten en todos los casos de estudio, practicándolos en tres problemas nuevos resueltos en el primer (ranking de ventas por categoría, búsqueda de caminos en una red social y un agregador de finanzas personales), y preparar la evaluación final con un catálogo "problema → patrón".

## Estudio

### Por qué una sesión de patrones

Después de nueve casos de estudio, el riesgo es recordar cada sistema como una historia aislada ("en el chat había WebSockets, en Google Drive había delta sync"). Lo que transfiere a problemas nuevos no son las historias sino los **patrones**: las mismas diez o quince ideas recombinadas. Esta sesión los hace explícitos con varios problemas que no viste todavía (y repasa uno conocido desde otro ángulo), resueltos en el primer, y termina con un catálogo que puedes usar como lista de verificación en cualquier diseño.

### Problema 1: ranking de ventas por categoría (tipo Amazon)

**Requisitos**: mostrar los productos más vendidos de la última semana en cada categoría; los resultados se actualizan cada hora (los más populares, quizás más a menudo); un producto puede estar en varias categorías.

**Supuestos del primer**: 10 M de productos, 1.000 categorías, 1.000 M de transacciones por mes, 100.000 M de lecturas por mes (100:1), tráfico desigual.

**Estimación**:

```
 transacción ≈ 40 bytes (timestamp, producto, categoría, vendedor, comprador, cantidad, precio)
 por mes     = 1.000 M × 40 B = 40 GB  → 3 años ≈ 1,44 TB
 escrituras  = 1.000 M / 2,5 M s por mes ≈ 400 transacciones/s
 lecturas    = 100.000 M / 2,5 M s ≈ 40.000 lecturas/s
```

(Conversión útil del primer: un mes tiene ~2,5 M de segundos; 1 petición/s ≈ 2,5 M por mes; 400 por segundo ≈ 1.000 M por mes.)

**Diseño**:

```
 [Ventas] → [Sales API] → logs crudos → [Object storage]
                                              │ cada hora
                                     [Sales Rank Service: MapReduce]
                                              │
                                    [tabla sales_rank (SQL)] ← [Read API] ← [Cache] ← [Clientes]
```

El cálculo es por lotes: un **MapReduce** de varios pasos (1) transforma las líneas de log en pares `(categoría, producto) → suma de cantidades`, y (2) hace un ordenamiento distribuido por categoría y total. El resultado (pocos miles de filas por categoría) se escribe en una tabla `sales_rank` indexada por categoría, que se lee a través de una cache.

**Patrones**: separar la ruta de escritura (registrar ventas, barato) de un **cálculo derivado por lotes** (ranking); **precalcular** el resultado que se lee 40.000 veces por segundo; **cache** delante del resultado. Es una forma que vas a reconocer en muchos sistemas (un autocompletado de búsquedas, por ejemplo, se construye igual): logs → agregación → estructura de lectura precalculada.

**Escalado**: réplicas de lectura y cache para las 40.000 lecturas/s; los logs crudos en object storage; si se necesitara frescura de minutos para productos muy populares, una capa de streaming que mantiene contadores en ventanas cortas y se fusiona con el resultado por lotes (una arquitectura con capa batch y capa de velocidad).

### Problema 2: el camino más corto en una red social

**Requisitos**: un usuario busca a otra persona y ve el camino más corto de amistades hasta ella ("tú → Ana → Beto → Carla"). El grafo no cabe en una máquina. El primer pide no usar una base de grafos, para ejercitar sistemas tradicionales.

**Supuestos**: 100 M de usuarios, 50 amigos promedio → **5.000 M de relaciones**; 1.000 M de búsquedas por mes ≈ **400 búsquedas/s**.

**El algoritmo**: en un grafo sin pesos, el camino más corto se encuentra con **BFS** (búsqueda en anchura): visitar los amigos, luego los amigos de los amigos, y así hasta encontrar al destino.

**El problema de escala**: los usuarios están repartidos en muchos **Person Servers** (shards). Un BFS ingenuo salta de un servidor a otro en cada nivel.

```
 [Cliente] → [Web server] → [Search API] → [User Graph Service]
                                                  │ ¿en qué servidor está la persona X?
                                           [Lookup Service]
                                                  │
                                [Person Server 1] [Person Server 2] ... [Person Server N]
```

El User Graph Service ejecuta el BFS: para cada persona en la frontera, pregunta al Lookup Service dónde vive y pide sus amigos al Person Server correspondiente.

**Optimizaciones** (aquí está la parte interesante):

- **Agrupar peticiones**: en cada nivel del BFS, agrupar a todas las personas de la frontera por servidor y hacer **una** petición por servidor con muchos IDs, en lugar de una por persona (el mismo principio del `MGET` del news feed).
- **BFS bidireccional**: buscar desde el origen y desde el destino a la vez y detenerse cuando las fronteras se tocan. Con 50 amigos por persona, un camino de longitud 6 desde un solo lado explora del orden de 50⁶ ≈ 15.600 M de nodos; desde ambos lados, 2 × 50³ = 250.000. La diferencia es de cinco órdenes de magnitud.
- **Limitar la profundidad** y el tiempo: si no se encuentra camino en 3–4 saltos o en cierto presupuesto, se responde "no conectados" (o se ofrece un resultado parcial).
- **Shardear por localidad**: ubicar en el mismo servidor a personas con muchas amistades en común (por ejemplo, por ciudad o por comunidad detectada) reduce los saltos entre servidores.
- **Cachear** resultados de búsquedas populares y las listas de amigos más consultadas.

¿Y si se permitiera una base de grafos? Cambia la implementación, no el razonamiento: una base de grafos distribuida también reparte nodos entre máquinas y sufre los mismos saltos de red en recorridos profundos; sus ventajas están en el modelo de consultas y en optimizaciones internas. Por eso el primer insiste en resolverlo con piezas tradicionales: obliga a entender dónde está el costo (los saltos entre shards) y cómo reducirlo. Con 5.000 M de relaciones de ~16 bytes (dos IDs), las listas de amigos ocupan ~80 GB sin contar réplicas: cabrían en la memoria de un cluster pequeño, lo que hace razonable mantener en cache las listas de los usuarios más consultados y servir la mayoría de los niveles del BFS sin tocar disco.

**Patrones**: **scatter-gather** con agrupación por shard, **directorio de shards** (Lookup Service), y la lección de que el algoritmo correcto (bidireccional) importa más que el hardware: ninguna cantidad de servidores compensa explorar cien mil veces más nodos de los necesarios.

### Problema 3: un agregador de finanzas personales (tipo Mint)

**Requisitos**: el usuario conecta sus cuentas bancarias; el servicio extrae las transacciones a diario, las **categoriza** (alimentación, vivienda, transporte), analiza gastos mensuales por categoría, recomienda un presupuesto y **notifica** cuando el usuario se acerca o supera su presupuesto (no hace falta que sea instantáneo).

**Supuestos**: 10 M de usuarios, 10 categorías de presupuesto cada uno (100 M de ítems), 30 M de cuentas financieras, 5.000 M de transacciones por mes, 500 M de lecturas por mes. **Ratio 10:1 de escritura sobre lectura**: los usuarios generan transacciones todos los días, pero pocos visitan la app a diario. La actualización automática solo aplica a usuarios activos en los últimos 30 días.

```
 transacción ≈ 50 bytes → 5.000 M × 50 B = 250 GB por mes → 9 TB en 3 años
 escrituras ≈ 2.000/s · lecturas ≈ 200/s
```

**Diseño**:

```
 [Cliente] → [Web server] → [Accounts API] → [SQL: cuentas]
                                  │ "extraer transacciones de la cuenta X"
                              [Cola] → [Transaction Extraction Service (workers)]
                                            │ descarga de los bancos
                                            ├→ logs crudos en object storage
                                            ├→ [Category Service] (mapeo vendedor → categoría)
                                            ├→ [Budget Service] → actualiza agregados mensuales
                                            └→ [Notification Service] (si se supera el presupuesto)
```

Detalles del primer: la extracción es **asíncrona** con una cola de trabajos (los bancos son lentos y poco confiables); la categoría se deduce del **vendedor** con un diccionario (50.000 vendedores conocidos) y el usuario puede corregirla; los agregados mensuales por categoría se recalculan con **MapReduce** sobre los logs en lugar de consultar millones de filas en cada visita; y la actualización diaria solo se hace para usuarios activos, lo que reduce mucho el trabajo.

**Patrones**: sistema **dominado por escrituras** (al revés que casi todos los anteriores), por eso se invierte el esfuerzo: escrituras por lotes y asíncronas, agregados precalculados para las pocas lecturas; colas para aislar dependencias externas lentas (como los proveedores de notificaciones en la sesión 21); y notificaciones eventuales.

### Problema 4: la cache de consultas de un buscador

**Requisitos** (primer, "key-value store for a search engine"): cachear los resultados de las búsquedas más populares para responderlas sin consultar el índice completo. Supuestos: 10 M de usuarios, 10.000 M de búsquedas por mes (~4.000/s), tráfico desigual (las consultas populares deben estar casi siempre en cache), memoria limitada.

**Estimación**: cada entrada guarda la consulta (~50 B) y sus resultados (título y fragmento, ~220 B): ~270 B. Si las 10.000 M de búsquedas mensuales fueran distintas y se guardaran todas, serían 2,7 TB por mes: no cabe en memoria, así que hay que **expulsar**.

**Diseño**: una cache **LRU** implementada con una **tabla hash** (búsqueda O(1) de la consulta) y una **lista doblemente enlazada** (los accesos mueven la entrada a la cabeza; al llenarse, se expulsa la cola). Para expirar resultados que cambian, cada entrada tiene un TTL o se invalida cuando el índice se actualiza.

**Escalar a muchas máquinas**: el primer compara tres opciones: (1) cada máquina con su propia cache (simple, pero baja tasa de aciertos porque las consultas se reparten); (2) cada máquina con una copia completa (simple, pero desperdicia memoria); (3) **la cache particionada entre todas las máquinas**, con `machine = hash(query) % n` o, mejor, consistent hashing (sesión 17). La tercera es la recomendada: más compleja, pero cada consulta tiene un único lugar y la memoria total se suma.

Con 4.000 búsquedas/s y una cache bien dimensionada para las consultas populares, el índice completo solo recibe los misses, que son las consultas raras.

**Patrones**: la estructura de datos de la sesión 05 (LRU con hash y lista) llevada a escala con el particionado de la sesión 17. Un buen recordatorio de que muchas "piezas de infraestructura" son estructuras de datos clásicas más una estrategia de distribución.

### Problema 5: escalar a millones de usuarios en la nube

La última solución del primer repite, con servicios de AWS, el recorrido de la sesión 01: una sola instancia con IP estática y DNS; luego separar estáticos a object storage con CDN; mover la base a su propia instancia (gestionada); balanceador y varias instancias web en varias zonas; réplicas de lectura; cache; autoscaling; y al final, colas, workers y desnormalización o NoSQL donde haga falta. Lo valioso es el **método**: en cada paso se fijan supuestos de carga, se miden cuellos de botella (el primer insiste en monitorear antes de escalar) y se agrega solo la pieza que los resuelve. Es exactamente la narrativa que debes saber contar en la evaluación.

### El catálogo de patrones del módulo

| Patrón | Qué resuelve | Dónde lo viste |
| --- | --- | --- |
| Capa web stateless + LB | Escalar y tolerar fallos de servidores | 01, 04, todos los casos |
| Cache (aside, write-through, write-behind) | Latencia y carga de lectura | 05, 19, 22, 26 |
| CDN y object storage | Archivos grandes y egreso masivo | 05, 06, 22, 26 |
| Réplicas de lectura | Lecturas y disponibilidad | 01, 06, 28 |
| Sharding + consistent hashing | Volumen y escrituras | 06, 17, 22, 28 |
| Cola / log de eventos | Picos, desacople, dependencias lentas | 09, 21, 28, 29 |
| Precalcular al escribir (fan-out, top-k, rankings) | Lecturas O(1) en sistemas de mucha lectura | 22, 29 |
| Calcular al leer (pull) | Escrituras baratas, datos poco leídos | 22 (celebridades) |
| Pipeline por lotes (logs → agregación → vista) | Derivar datos caros sin afectar la ruta caliente | 29 (ranking de ventas, Mint) |
| Conexiones persistentes + pub/sub interno | Tiempo real servidor → cliente | 10, 23, 26, 28 |
| IDs ordenables por tiempo | Orden, paginación, particionado | 18, 22, 23 |
| Idempotencia + at-least-once | Reintentos seguros | 09, 12, 16, 21, 28 |
| Rate limiting | Protección y equidad | 16, 21 |
| Quórums y consistencia ajustable | Elegir C o A por operación | 17 |
| Índice especializado (invertido, geoespacial, Bloom) | Consultas que un B-tree no resuelve | 05, 19, 28 |
| Fase gruesa + fase fina | Búsqueda eficiente de candidatos y filtrado exacto | 17 (Bloom filters y SSTables), 28 (celdas y haversine) |
| Aislamiento por canal o prioridad (bulkhead) | Que un fallo o un pico no afecte todo | 12, 21 |
| Cola larga y tiering | Costo en sistemas de contenido | 06, 26 |

### Cómo usar el catálogo frente a un problema nuevo

1. **Clasifica la carga**: ¿mucha lectura, mucha escritura o equilibrada? ¿Picos? ¿Tiempo real?
2. **Identifica el dato dominante**: ¿qué ocupa más (media, eventos, metadatos) y qué se lee más?
3. **Busca la consulta difícil**: ¿hay algo que un índice normal no resuelve (prefijos, cercanía, texto, grafos)? Ahí va un índice especializado.
4. **Decide dónde se hace el trabajo**: al escribir (precalcular) o al leer (calcular bajo demanda), según el ratio y la distribución.
5. **Marca consistencia por dato** (CP/AP) y la idempotencia de cada operación con efectos.
6. **Aísla lo lento y lo externo** detrás de colas.
7. **Estima el costo** si hay media o ancho de banda masivo.
8. **Revisa la lista de antipatrones** de abajo antes de dar el diseño por terminado, y escribe qué cambiaría si la carga creciera diez veces.

### Antipatrones que aparecen una y otra vez

Tan útil como el catálogo de patrones es la lista de errores frecuentes al diseñar. Revísala antes de entregar cualquier design doc:

1. **Escalar sin números**: agregar sharding, microservicios o Kafka sin una estimación que los justifique.
2. **Base de datos en la ruta de cada lectura caliente**: sin cache ni precálculo en un sistema 100:1.
3. **Binarios grandes dentro de la base de datos** en lugar de object storage.
4. **Trabajo lento dentro de la petición del usuario**: transcodificar, enviar emails o llamar a terceros de forma síncrona.
5. **Un único componente sin redundancia** en la ruta crítica (un balanceador, una cola, un generador de IDs central).
6. **Consistencia sin decidir**: no decir qué datos toleran estar desactualizados ni qué pasa durante una partición.
7. **Reintentos sin idempotencia**: cobros, mensajes o pedidos duplicados.
8. **Ignorar los picos**: dimensionar para el promedio.
9. **Hot keys olvidadas**: celebridades, productos virales, enlaces populares, celdas de geohash en el centro de una ciudad.
10. **Ignorar el costo** en sistemas de media o de datos masivos.
11. **Sin plan de fallos**: no decir qué pasa cuando cae cada componente, ni cómo se detecta.

Cada uno de estos errores corresponde a un patrón del catálogo que lo evita; leer la lista en orden inverso es otra forma de repasar el módulo entero.

### Cómo seguir aprendiendo

El libro cierra recomendando estudiar arquitecturas reales y blogs de ingeniería de empresas (el primer mantiene listas de "real world architectures" y "company engineering blogs"): cómo una empresa escaló su base de datos, cómo otra diseñó su sistema de notificaciones. Al leerlos, no memorices la tecnología: identifica el **requisito** que forzó cada decisión y el **patrón** que aplicaron, y anótalo en tu catálogo. Así cada lectura nueva refuerza el mismo mapa mental en vez de agregar una historia aislada más.

## Conceptos clave

- **Cálculo derivado por lotes**: generar periódicamente una vista precalculada a partir de logs crudos.
- **MapReduce**: modelo de procesamiento por lotes que transforma (map) y agrega (reduce) datos distribuidos.
- **BFS bidireccional**: búsqueda en anchura desde origen y destino a la vez, que reduce exponencialmente los nodos explorados.
- **Lookup service**: directorio que indica en qué shard vive cada entidad.
- **Scatter-gather agrupado**: consultar varios shards en paralelo con una petición por shard que agrupa muchos IDs.
- **Sistema dominado por escrituras**: aquel donde las escrituras superan a las lecturas, lo que invierte las optimizaciones habituales.
- **Catálogo de patrones**: lista de soluciones reutilizables asociadas al problema que resuelven.

## Preguntas de repaso

1. ¿Por qué el ranking de ventas por categoría se calcula por lotes y no en cada venta?
   R: Porque se lee unas 100 veces más de lo que se escribe y el resultado solo necesita actualizarse cada hora. Recalcular en cada venta sería caro y concurrente; un proceso por lotes sobre los logs produce una tabla pequeña y precalculada que se sirve desde cache a decenas de miles de lecturas por segundo.
2. ¿Cuántos nodos explora aproximadamente un BFS de 6 niveles con 50 amigos por persona, desde un lado y bidireccional?
   R: Desde un solo lado, del orden de 50⁶ ≈ 1,56 × 10¹⁰ nodos. Bidireccional, cada lado explora unos 3 niveles: 2 × 50³ = 250.000 nodos, unas cinco órdenes de magnitud menos.
3. ¿Qué cambia en el diseño de Mint por ser un sistema dominado por escrituras?
   R: Las optimizaciones se invierten: las escrituras (transacciones extraídas de los bancos) se procesan de forma asíncrona y por lotes mediante colas y workers; los agregados mensuales se precalculan para servir las pocas lecturas de forma barata; y se evita trabajo para usuarios inactivos.
4. Nombra tres patrones del catálogo que aparecen tanto en el agregador tipo Mint como en el ranking de ventas.
   R: Pipeline por lotes desde logs crudos (guardados en object storage) hasta una vista precalculada con MapReduce; precalcular los agregados para que las lecturas sean baratas en lugar de recorrer millones de filas en cada visita; y separar la ruta de escritura barata (registrar ventas o transacciones) del cálculo derivado, que corre aparte sin afectar la ruta caliente.
5. ¿Qué haces primero frente a un problema de diseño nuevo según el método de esta sesión?
   R: Clasificar la carga (lectura, escritura, picos, tiempo real) e identificar el dato dominante y la consulta difícil. De eso se deriva dónde hacer el trabajo (al escribir o al leer), qué índice especializado hace falta y qué consistencia necesita cada dato.

## Ejercicio

Elige dos problemas que no se vieron en el módulo (por ejemplo, "un sistema de reservas de entradas para conciertos" y "un servicio de métricas tipo Prometheus") y, para cada uno, escribe en una página: clasificación de carga con números estimados, dato dominante, consulta difícil, los 5 patrones del catálogo que aplicarías con una línea de justificación cada uno, y un diagrama ASCII de alto nivel. Terminado cuando ambos problemas tengan todos los apartados y al menos un patrón distinto entre ellos esté justificado por una diferencia de carga.

## Explícalo con tus palabras

Explica por qué conocer patrones sirve más que memorizar sistemas, usando la imagen de un cocinero que domina técnicas (freír, hornear, guisar) frente a uno que solo memoriza recetas.
