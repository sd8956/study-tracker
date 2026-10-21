---
title: "Stream processing: logs, CDC, event sourcing y tiempo"
kind: lesson
hours: 2
sources: Designing Data-Intensive Applications (Kleppmann), cap. 11 (pp. 461–501)
links: Jay Kreps, "The Log" | https://engineering.linkedin.com/distributed-systems/log-what-every-software-engineer-should-know-about-real-time-datas-unifying ; Debezium, change data capture | https://debezium.io/documentation/reference/stable/architecture.html
---

## Objetivo

Entender cómo se transmiten y procesan flujos de eventos sin fin: brokers de mensajes frente a logs particionados (Kafka), cómo mantener sistemas sincronizados con change data capture y event sourcing, cómo razonar sobre el tiempo (event time, ventanas, eventos tardíos), los tipos de stream joins y la tolerancia a fallos con semántica exactly-once.

## Estudio

### De lotes acotados a flujos sin fin

El batch de la sesión anterior asume una entrada **acotada**: un tamaño conocido y finito, así que el trabajo sabe cuándo terminó de leer. En la realidad, muchos datos son **no acotados**: llegan poco a poco y nunca "terminan" (los usuarios produjeron datos ayer, hoy y lo harán mañana). Un batch tiene que dividir artificialmente los datos en trozos de un día o una hora, y los cambios se reflejan con ese retraso. Para reducirlo, procesas con más frecuencia, hasta el extremo: procesar **cada evento en cuanto ocurre**. Esa es la idea del **stream processing**.

### Transmitir flujos de eventos

En streaming, un registro se llama **evento**: un objeto pequeño, autocontenido e inmutable con los detalles de algo que ocurrió en un momento, normalmente con un timestamp. Puede ser una acción del usuario (ver una página, comprar), una medición de un sensor o una línea de log. Un evento lo genera un **productor** (*publisher*, *sender*) y lo procesan varios **consumidores** (*subscribers*, *recipients*). Los eventos relacionados se agrupan en un **topic** o *stream*.

Sondear una base de datos buscando eventos nuevos es caro; es mejor que los consumidores sean **notificados**, y para eso existen herramientas especializadas.

#### Sistemas de mensajería

Un sistema de mensajería notifica a los consumidores de eventos nuevos. Dos preguntas los diferencian:

1. **¿Qué pasa si los productores envían más rápido de lo que los consumidores procesan?** Tres opciones: **descartar** mensajes, **encolarlos** en un buffer (¿y si la cola crece más que la memoria?, ¿se escribe a disco?) o aplicar **backpressure** (bloquear al productor, como hacen los pipes Unix y TCP).
2. **¿Qué pasa si un nodo se cae o se desconecta?** ¿Se pierden mensajes? La durabilidad cuesta escribir a disco y replicar.

Opciones de entrega:

- **Mensajería directa** (UDP multicast, ZeroMQ, webhooks): sin intermediario; exige que productor y consumidor estén online y tolerar pérdidas.
- **Message brokers** (RabbitMQ, ActiveMQ, Amazon SQS): un servidor intermedio que centraliza los datos, tolera clientes que van y vienen y hace que los consumidores sean **asíncronos**.

Comparados con una base de datos, los brokers tradicionales **borran el mensaje cuando se entrega con éxito**, asumen colas cortas, notifican a los clientes cuando cambian los datos y no ofrecen consultas arbitrarias.

#### Múltiples consumidores y acknowledgments

Con varios consumidores en el mismo topic hay dos patrones:

```
load balancing (cada mensaje a UNO)          fan-out (cada mensaje a TODOS)
productor ─► [m1 m2 m3 m4] ─┬─► consumidor A: m1, m3      productor ─► [m1 m2] ─┬─► A: m1, m2
                            └─► consumidor B: m2, m4                            └─► B: m1, m2
```

Para no perder mensajes, el broker usa **acknowledgments**: el cliente avisa explícitamente cuando terminó de procesar un mensaje. Si la conexión se cierra sin ack, el broker asume que no se procesó y lo **reentrega** a otro consumidor. Combinado con load balancing, esto **reordena** mensajes: si el consumidor 2 se cae procesando m3, m3 se reentrega a otro consumidor después de m4. Si los mensajes son causalmente dependientes, importa; se evita con una cola por consumidor.

### Logs particionados

**Con un broker tradicional, consumir un mensaje lo borra**: no puedes reejecutar un consumidor y obtener el mismo resultado (al contrario que en batch), y un consumidor nuevo solo ve mensajes futuros. Los **log-based message brokers** combinan la durabilidad de una base con las notificaciones de baja latencia de la mensajería.

Un **log** es una secuencia de registros de solo-añadido en disco (sesión 04). El productor envía un mensaje **añadiéndolo al final** y el consumidor recibe mensajes **leyendo el log secuencialmente**; al llegar al final, espera notificación de mensajes nuevos (como `tail -f`). Para escalar, el log se **particiona**: cada partición es un log independiente que puede estar en otra máquina, y un topic es un grupo de particiones del mismo tipo. Dentro de cada partición, el broker asigna a cada mensaje un número creciente, el **offset**. Los mensajes dentro de una partición están **totalmente ordenados**; entre particiones no hay orden garantizado.

```
topic "pedidos"
partición 0: [0][1][2][3][4][5][6] ◄── productor añade aquí
                      ▲ offset del consumidor A = 3
partición 1: [0][1][2][3][4]
                         ▲ offset del consumidor A = 4
partición 2: [0][1][2][3][4][5]
                ▲ offset del consumidor A = 1 (va atrasado en esta partición)
```

**Apache Kafka, Amazon Kinesis Streams y Twitter DistributedLog** funcionan así. Google Cloud Pub/Sub es arquitectónicamente similar pero expone una API estilo JMS. Logran throughput de millones de mensajes por segundo particionando entre máquinas, y tolerancia a fallos replicando.

#### Logs frente a mensajería tradicional

Para hacer fan-out basta con que varios consumidores lean el log de forma independiente: leer **no borra** nada. Para load balancing, en vez de asignar mensajes individuales, el broker asigna **particiones enteras** a nodos de un grupo de consumidores. Cada cliente consume todos los mensajes de sus particiones, en orden, en un solo hilo. Desventajas: el número de nodos que comparten un topic está limitado al número de particiones, y un mensaje lento bloquea los siguientes de su partición (*head-of-line blocking*).

Regla práctica: si los mensajes son caros de procesar, quieres paralelizar mensaje a mensaje y **el orden no importa**, un broker estilo JMS/AMQP (RabbitMQ) es preferible. Si necesitas **alto throughput**, cada mensaje es rápido de procesar y **el orden importa**, un log encaja muy bien.

#### Offsets, espacio en disco y replays

Consumir una partición secuencialmente hace fácil saber qué mensajes se procesaron: todos los de offset menor que el actual. El broker no necesita acks por mensaje, solo registrar periódicamente el **offset del consumidor**. Se parece mucho al *log sequence number* de la replicación con líder (sesión 10): el broker es como el líder y el consumidor como un seguidor. Si un consumidor falla, otro del grupo empieza desde el último offset registrado; los mensajes procesados pero sin offset confirmado **se procesan dos veces**.

Si solo añades, te quedas sin disco: el log se divide en segmentos y los viejos se borran o archivan. Así, el log implementa un buffer limitado que funciona como un **buffer circular** en disco. Con un disco de 6 TB escribiendo a 150 MB/s, llenarlo tarda unas 11 horas: un consumidor puede ir hasta horas atrasado sin perder mensajes. Y el throughput del log es casi constante (siempre escribe a disco), a diferencia de los brokers que guardan en memoria y se ralentizan al desbordar a disco.

Lo más poderoso: **leer no tiene efectos secundarios**. Puedes **reprocesar** mensajes viejos moviendo el offset atrás, crear un consumidor nuevo con código distinto y ejecutarlo desde el principio para producir una salida derivada nueva. Igual que en batch, los datos derivados se separan claramente de los de entrada, y eso facilita la experimentación y la recuperación de bugs.

### Bases de datos y streams

Los brokers basados en logs tomaron ideas de las bases de datos. La conexión también va al revés: **una escritura en una base de datos es un evento** que puede capturarse, almacenarse y procesarse. De hecho, el replication log (sesión 10) es un flujo de eventos de escritura que los seguidores aplican.

#### Mantener sistemas sincronizados

No hay un sistema que satisfaga todas las necesidades: una base OLTP, un cache, un índice de búsqueda y un data warehouse deben tener los mismos datos en distintas representaciones. Si un dato cambia en la base, el cache, el índice y el warehouse deben actualizarse.

Con el warehouse se suele hacer ETL batch. Otra opción es la **escritura dual** (*dual writes*): la aplicación escribe explícitamente en cada sistema. Tiene problemas graves:

- **Race conditions**: dos clientes escriben X en la base y en el índice; si las escrituras se intercalan, la base puede quedarse con el valor de un cliente y el índice con el del otro, **permanentemente inconsistentes**, sin que nadie lo note.

```
cliente 1: set X=A en BD ───────────────────────────── set X=A en índice
cliente 2:            set X=B en BD ── set X=B en índice
resultado:  BD: X=B   índice: X=A    ← inconsistentes para siempre
```

- **Fallos parciales**: una escritura puede tener éxito y la otra fallar. Mantenerlas atómicas requeriría 2PC (sesión 21), que es caro.

La solución: tener **un solo líder** (la base de datos) y hacer que los demás sistemas sean **seguidores** que consumen su log de cambios.

#### Change data capture (CDC)

Durante mucho tiempo, el log de replicación de las bases era un detalle interno sin API pública. **Change data capture** es el proceso de observar todos los cambios escritos en una base y extraerlos de forma que puedan replicarse a otros sistemas, **en el mismo orden en que se escribieron**. Así un índice de búsqueda o un cache consumen el stream de cambios y aplican lo mismo, quedando consistentes con la base.

Implementaciones: **Debezium** (lee el binlog de MySQL, el logical decoding de PostgreSQL, MongoDB…) y publica en Kafka; Databus de LinkedIn, Wormhole de Facebook, Bottled Water para PostgreSQL, Maxwell para MySQL; los triggers son otra opción, frágil y con overhead. CDC suele ser **asíncrono**: la base no espera a los consumidores, así que un consumidor lento no afecta a la base, pero aparecen los problemas de replication lag.

Si el log no se guarda entero desde el principio, reconstruir un sistema nuevo requiere un **snapshot inicial** consistente ligado a un offset del log (igual que al añadir un seguidor). Una alternativa es la **log compaction** (como en la sesión 04): el broker conserva solo el último valor de cada clave y borra los sobrescritos (y las claves con tombstone). Así, el log compactado contiene **una copia completa de la base** y puedes reconstruir un sistema derivado leyendo el topic desde el offset 0. Kafka soporta log compaction, y eso permite usarlo como almacenamiento durable.

Cada vez más bases exponen streams de cambios como API de primera clase: los **change streams** de MongoDB, los **DynamoDB Streams**, RethinkDB, Firebase y CouchDB. Kafka Connect integra CDC de muchas bases.

#### Event sourcing

**Event sourcing** es una técnica de la comunidad de **domain-driven design** con una idea parecida a CDC, pero a otro nivel de abstracción:

- En **CDC**, la aplicación usa la base de forma **mutable** (actualiza y borra registros). El log de cambios se extrae a bajo nivel y la aplicación ni se entera.
- En **event sourcing**, la lógica de la aplicación se construye explícitamente sobre **eventos inmutables** escritos en un **event log**. El almacén de eventos es de solo-añadido; las actualizaciones y borrados se desaconsejan o prohíben. Los eventos reflejan cosas que pasaron **a nivel de aplicación**, no cambios de estado de bajo nivel.

Ejemplo: "el estudiante canceló su inscripción al curso" expresa claramente la intención. El efecto secundario "se borró una fila de inscripciones y se añadió un motivo de cancelación a la tabla de feedback" no la expresa. Con eventos, añadir funciones nuevas es más fácil (por ejemplo, ofrecer el asiento liberado a alguien en lista de espera encadenando un nuevo consumidor del evento).

Un log de eventos no es útil por sí solo: los usuarios quieren el **estado actual** (el contenido del carrito, no el historial de cambios). Las aplicaciones toman el log y lo transforman en estado actual de forma **determinista**. A diferencia de CDC con log compaction, en event sourcing los eventos posteriores **no sobrescriben** a los anteriores (un evento expresa una intención, no un valor final), así que necesitas el historial completo; se mitigan los costes con **snapshots** del estado derivado.

Distingue **comandos** de **eventos**: una petición del usuario es inicialmente un **comando** que puede fallar (validación, restricciones). Si la validación pasa y el comando se acepta, se convierte en un **evento**: un **hecho** durable e inmutable. Aunque el cliente después cancele una reserva, el evento de reserva sigue siendo cierto; la cancelación es otro evento.

### Estado, streams e inmutabilidad

Las bases de datos guardan el **estado actual**, optimizado para leer. El estado cambia. ¿Cómo encaja con la inmutabilidad? Siempre que tienes estado que cambia, ese estado es el **resultado de los eventos que lo mutaron** a lo largo del tiempo:

```
estado actual = integral del flujo de cambios en el tiempo
flujo de cambios = derivada del estado respecto al tiempo
```

Visto así, el log de cambios es el **sistema de registro** y la base es un **cache** de un subconjunto del log: el último valor de cada clave. Como dijo Pat Helland: "la verdad es el log; la base de datos es un cache de un subconjunto del log".

Ventajas de los eventos inmutables:

- **Auditoría**: la contabilidad lleva siglos usando un **libro mayor** de solo-añadido. Si se comete un error, no se borra la transacción: se añade una **transacción compensatoria**. Con un log inmutable es fácil diagnosticar qué pasó y recuperarse de un bug que escribió datos malos.
- **Más información**: en un carrito, un usuario añade un producto y lo quita. Para el estado actual es como si nunca lo hubiera añadido, pero para análisis es valioso saber que lo consideró.
- **Varias vistas del mismo log** (*command query responsibility segregation*, CQRS): separas la forma en que escribes de la forma en que lees, con varias vistas de lectura optimizadas para distintas consultas, derivadas del mismo log. Para cambiar el modelo de lectura, construyes una vista nueva en paralelo y migras sin tocar la vieja.
- **Concurrencia**: la mayor desventaja de event sourcing y CDC es que los consumidores son asíncronos, así que puede que un usuario escriba y luego no lo vea en la vista (read-your-writes). Por otro lado, un evento puede describir una acción que toca varios objetos y escribirse en un solo lugar, evitando transacciones multiobjeto.

Limitaciones: si los datos cambian mucho sobre un dataset pequeño, el historial inmutable crece enormemente y la compactación y el GC son cruciales. Y a veces **hay que borrar de verdad** por razones administrativas o legales (el **GDPR**, por ejemplo): no basta con añadir un evento "borrado", hay que reescribir la historia (Datomic lo llama *excision*). Borrar de verdad es sorprendentemente difícil, porque las copias viven en muchos sitios (backups, sistemas derivados).

### Procesar streams

Con un stream puedes hacer tres cosas: escribir sus datos en una base, cache o índice; enviarlos a usuarios (alertas, dashboards); o **procesar** uno o varios streams para producir otros, a través de una cadena de **operadores** o **jobs**. Un procesador de streams se parece a un trabajo batch (consume entradas de solo lectura y escribe salidas de solo-añadido), pero **el stream nunca termina**: no se puede ordenar todo (no hay sort-merge join) y la tolerancia a fallos no puede reiniciar el trabajo desde el principio tras una semana.

Usos típicos:

- **Complex event processing (CEP)**: buscar patrones de eventos (como una expresión regular), con consultas de larga duración por las que pasan los eventos. Esper, IBM InfoSphere Streams.
- **Analítica de streams**: agregados y métricas estadísticas sobre muchos eventos: tasa de eventos por minuto, media móvil de 5 minutos, comparar con el mismo periodo anterior para detectar tendencias. Se usan algoritmos probabilísticos (Bloom filters, **HyperLogLog** para cardinalidad, percentiles aproximados). Apache Storm, Spark Streaming, Flink, Kafka Streams, Samza, Google Cloud Dataflow.
- **Mantener vistas materializadas**: mantener sincronizado un cache, índice o vista derivada (como en event sourcing). A diferencia de la analítica, necesita todos los eventos desde siempre, no una ventana.

### Razonar sobre el tiempo

Los procesadores de streams trabajan mucho con ventanas de tiempo ("la media de los últimos cinco minutos"). Parece trivial, pero no lo es.

En batch, el trabajo mira el **timestamp de cada evento**, no el reloj de la máquina: procesar un año de eventos en minutos no tiene nada que ver con cuándo ocurrieron. Así el procesamiento es determinista. Muchos frameworks de streaming, en cambio, usan el **reloj local de la máquina procesadora** (*processing time*) para las ventanas. Es simple y razonable si el retraso entre la creación y el procesamiento del evento es despreciable, pero **se rompe** si hay retraso.

#### Event time frente a processing time

El procesamiento se retrasa por muchas razones: colas, fallos de red, contención en el broker, reinicios del consumidor, o **reprocesar** eventos viejos tras corregir un bug. Además, los retrasos pueden **desordenar** eventos: un usuario hace una petición atendida por el servidor A y luego otra atendida por el B, pero el evento de B llega antes al broker.

La analogía de **Star Wars**: los episodios IV, V y VI se estrenaron en 1977, 1980 y 1983; los I, II y III en 1999, 2002 y 2005. Si las viste en orden de estreno, el orden en que las "procesaste" no coincide con el orden de la narrativa. El número de episodio es el **event time**; la fecha en que la viste, el **processing time**.

Confundirlos produce datos malos. Si un procesador mide peticiones por segundo y se reinicia durante un minuto, al volver procesa el backlog de golpe. Si mide con processing time, verás un **pico anómalo** que en realidad no existió: la tasa real era estable.

#### ¿Cuándo está lista una ventana?

Con event time, **nunca sabes con certeza si recibiste todos los eventos** de una ventana. Si cuentas peticiones por minuto, ¿cuándo das por cerrado el minuto 37? Puede haber eventos **rezagados** (*stragglers*) retenidos en otra máquina o en una red lenta. Opciones:

1. **Ignorarlos**: probablemente sean pocos; monitoriza cuántos descartas y alerta si crecen.
2. **Publicar una corrección**: emitir un valor actualizado de la ventana con los rezagados, y quizá retractar el anterior.

Algunos sistemas emiten un mensaje especial, un **watermark**: "a partir de ahora no habrá más eventos con timestamp anterior a t". Pero con varios productores, cada uno con su watermark, el consumidor debe seguirlos todos.

#### ¿El reloj de quién?

Con eventos de móviles que pasan días offline, el reloj del dispositivo puede estar mal. Registra **tres timestamps** (cuando ocurrió según el dispositivo, cuando lo envió según el dispositivo y cuando lo recibió el servidor); la diferencia entre los dos últimos estima el desfase y corrige el primero.

#### Tipos de ventanas

| Ventana | Definición | Ejemplo |
| --- | --- | --- |
| **Tumbling** | Longitud fija; cada evento pertenece a **exactamente una** ventana | Minutos 10:03:00–10:03:59, 10:04:00–10:04:59… |
| **Hopping** | Longitud fija, pero las ventanas **se solapan** según un salto | Ventana de 5 min que avanza cada 1 min |
| **Sliding** | Contiene todos los eventos que ocurren a menos de cierto intervalo entre sí | "Eventos a menos de 5 min" sin bordes fijos |
| **Session** | Sin duración fija: agrupa eventos del mismo usuario cercanos en el tiempo; termina tras un periodo de inactividad | Sesión web que se cierra tras 30 min sin actividad |

### Stream joins

Los joins también se necesitan en streaming, y que lleguen eventos nuevos en cualquier momento lo complica. Tres tipos:

**1. Stream-stream join (window join).** Quieres calcular el *click-through rate* de una búsqueda: juntar el evento "búsqueda" con el evento "clic" en un resultado, por ID de sesión. El clic puede llegar segundos o semanas después, o nunca. El procesador mantiene **estado**: indexa los eventos de la última hora por ID de sesión; cuando llega una búsqueda o un clic, busca su pareja en el índice y, si la encuentra, emite el evento combinado. Si la búsqueda expira sin clic, emite "búsqueda sin clic".

**2. Stream-table join (enriquecimiento).** Juntar eventos de actividad de usuario con los perfiles de usuario (como el join batch de la sesión anterior, pero continuo). Consultar la base remota por cada evento sería lento y arriesgado. En cambio, el procesador carga **una copia local de la tabla** (en memoria o disco local) y la mantiene actualizada **suscribiéndose al changelog de la tabla** vía CDC. Es como un map-side hash join en el que la tabla se actualiza continuamente.

**3. Table-table join (mantener vistas materializadas).** El timeline de Twitter (sesión 01): mantener en cache el buzón de cada usuario. Cuando alguien publica, se añade el tweet a los timelines de sus seguidores; cuando lo borra, se quita; cuando alguien sigue o deja de seguir, se ajustan. El procesador mantiene una base con el conjunto de seguidores de cada usuario y procesa ambos streams (tweets y follows). Es como **mantener continuamente una vista materializada** de un join entre la tabla de tweets y la de follows.

#### Dependencia temporal de los joins

En los tres, el **orden** importa: si un perfil cambia, ¿qué eventos se juntan con la versión vieja y cuáles con la nueva? Al reprocesar, el intercalado puede variar y el resultado no ser determinista. Es el problema de las **slowly changing dimensions**: se resuelve dando un **ID a cada versión** del registro (la factura guarda el ID de la tasa de impuestos vigente), a costa de no poder compactar el log.

### Tolerancia a fallos

En batch, si una tarea falla, se reinicia y su salida descartada se sustituye: el resultado es como si cada registro se hubiera procesado **exactamente una vez** (*exactly-once semantics*, mejor dicho **effectively-once**). En streaming no puedes esperar a que termine el stream para publicar la salida. Técnicas:

- **Microbatching y checkpointing**: Spark Streaming divide el stream en bloques pequeños (≈1 s) y los trata como mini lotes; Flink genera **checkpoints** periódicos del estado (con *barriers* en el stream) y, si un operador falla, reinicia desde el último checkpoint descartando la salida posterior. Dentro del framework funciona; pero **en cuanto la salida sale del procesador** (escribir en una base, enviar un email), reiniciar no la deshace.
- **Transacciones atómicas**: confirmar atómicamente todas las salidas y efectos (mensajes a otros topics, cambios de estado, offset del consumidor) solo si el procesamiento tuvo éxito. Google Cloud Dataflow, VoltDB y Kafka (*transactions* desde 0.11) lo hacen **internamente**, sin transacciones heterogéneas.
- **Idempotencia**: una operación idempotente produce el mismo efecto aunque se ejecute varias veces. Incluso si no lo es por naturaleza, se puede hacer idempotente con metadatos: al consumir de Kafka, cada mensaje tiene un offset persistente y monotónico; si al escribir en una base guardas también el offset del mensaje que causó la escritura, puedes saber si ya se aplicó y evitar repetirla.
- **Reconstruir el estado tras un fallo**: el estado del procesador (contadores de ventana, tablas para joins) debe recuperarse. Puede guardarse en un almacén remoto replicado (lento) o localmente con réplicas periódicas: Flink hace snapshots a HDFS; Kafka Streams y Samza replican los cambios de estado a un topic de Kafka con log compaction. A veces basta con reconstruirlo desde los streams de entrada (las ventanas cortas se recalculan rápido).

### Ideas erróneas frecuentes

- **"Kafka es una cola como RabbitMQ."** Es un log particionado: leer no borra, el orden es por partición y se puede reprocesar desde cualquier offset.
- **"Escribir en la base y en el índice desde la aplicación mantiene ambos sincronizados."** Las escrituras duales tienen races y fallos parciales; usa CDC con un único líder.
- **"Event sourcing y CDC son lo mismo."** CDC extrae cambios de bajo nivel de una base mutable; event sourcing modela eventos de dominio inmutables a nivel de aplicación.
- **"Las ventanas por processing time son correctas."** Un reinicio o un backlog producen picos y huecos falsos; usa event time y watermarks.
- **"Exactly-once significa que el código se ejecuta una vez."** Significa que el efecto visible es como si se hubiera procesado una vez (effectively-once), gracias a checkpoints, transacciones o idempotencia.

### Resumen

Los streams son datos no acotados que se procesan evento a evento. Los brokers tradicionales borran al confirmar y reparten mensajes individuales; los logs particionados (Kafka, Kinesis) conservan los mensajes, ordenan por partición, usan offsets y permiten replays. Las bases y los streams se unen con CDC (un único líder cuyos cambios alimentan índices, caches y warehouses) y event sourcing (eventos de dominio inmutables), con la idea de que la verdad es el log y el estado es un cache. Procesar streams exige razonar con event time, ventanas y eventos tardíos, implementar joins con estado (stream-stream, stream-table, table-table) y lograr effectively-once con checkpoints, transacciones o idempotencia.

## Conceptos clave

- **Evento**: registro inmutable de algo que ocurrió en un momento.
- **Message broker**: intermediario que entrega mensajes; los tradicionales los borran al confirmar.
- **Log particionado**: topic dividido en logs de solo-añadido con offsets (Kafka, Kinesis).
- **Consumer offset**: posición hasta la que un consumidor procesó una partición.
- **Dual writes**: escribir desde la aplicación en varios sistemas; propenso a inconsistencias.
- **Change data capture (CDC)**: extraer los cambios de una base como un stream ordenado.
- **Log compaction**: conservar solo el último valor por clave en un log.
- **Event sourcing**: modelar la aplicación como eventos de dominio inmutables.
- **Comando vs evento**: petición que puede fallar frente a hecho aceptado e inmutable.
- **CQRS**: separar el modelo de escritura de vistas de lectura derivadas.
- **Event time / processing time**: cuándo ocurrió el evento frente a cuándo se procesó.
- **Watermark**: señal de que no llegarán más eventos anteriores a cierto tiempo.
- **Tumbling, hopping, sliding y session windows**: formas de agrupar eventos en el tiempo.
- **Stream-stream, stream-table y table-table join**: joins con estado sobre flujos.
- **Effectively-once**: el efecto es como si cada evento se procesara una vez.

## Preguntas de repaso

1. ¿Qué diferencia fundamental hay entre un broker tradicional y un log particionado como Kafka?
   R: El broker tradicional borra el mensaje cuando se confirma y reparte mensajes individuales entre consumidores; el log conserva los mensajes, los ordena dentro de cada partición, asigna particiones completas a consumidores y permite releer desde cualquier offset sin efectos secundarios.
2. ¿Cuándo elegirías RabbitMQ y cuándo Kafka?
   R: RabbitMQ (estilo JMS/AMQP) si los mensajes son caros de procesar, quieres paralelizar mensaje a mensaje y el orden no importa. Kafka si necesitas alto throughput, procesar cada mensaje es rápido, el orden importa y quieres poder reprocesar.
3. ¿Por qué las escrituras duales llevan a inconsistencias permanentes?
   R: Porque dos clientes pueden intercalar sus escrituras a la base y al índice en distinto orden, dejando valores distintos en cada sistema, y porque una escritura puede fallar mientras la otra tiene éxito; sin 2PC no hay atomicidad, y nadie detecta la divergencia.
4. Diferencia CDC y event sourcing.
   R: En CDC la aplicación usa una base mutable y los cambios de bajo nivel se extraen del log de la base sin que la aplicación lo sepa. En event sourcing la aplicación escribe explícitamente eventos de dominio inmutables que expresan intenciones, y el estado se deriva de ellos de forma determinista.
5. ¿Por qué medir la tasa de peticiones por processing time produce datos malos tras un reinicio?
   R: Porque al reiniciar, el procesador consume de golpe el backlog acumulado; con processing time, todos esos eventos caen en la ventana del momento de procesamiento y parece haber un pico anómalo, cuando la tasa real (por event time) fue estable.
6. Describe cómo funciona un stream-table join.
   R: El procesador mantiene una copia local de la tabla (por ejemplo, perfiles de usuario) y la actualiza suscribiéndose a su changelog vía CDC; cada evento del stream se enriquece consultando esa copia local, sin peticiones remotas.
7. Nombra tres técnicas para lograr effectively-once en streaming.
   R: Microbatching o checkpointing del estado (Spark Streaming, Flink), transacciones atómicas internas que confirman salidas, estado y offset juntos (Kafka transactions, Dataflow), e idempotencia, por ejemplo guardando el offset del mensaje junto a la escritura para no aplicarla dos veces.

## Ejercicio

En TypeScript, sin dependencias:

1. Implementa un `PartitionedLog` en memoria con `append(topic, key, value)` (partición por hash de la clave), `read(topic, partition, offset, max)` y offsets de consumidor por grupo.
2. Simula CDC: una "base" (`Map`) que emite un evento al log por cada `set`/`delete`. Construye dos consumidores derivados: un índice invertido de búsqueda y un cache. Mata y reinicia el índice desde offset 0 y comprueba que queda idéntico.
3. Implementa log compaction para un topic y verifica que reconstruir desde el log compactado da el mismo estado que desde el log completo.
4. Genera eventos con event time y entregas desordenadas (hasta 30 s de retraso) y cuenta por **tumbling windows** de 1 minuto: una versión por processing time y otra por event time con watermark de 30 s. Simula un "reinicio" de 2 minutos y compara los gráficos (en texto) de ambas.

Criterio de terminado: el índice reconstruido coincide con el original, el log compactado reconstruye el mismo estado, y la versión por processing time muestra un pico falso tras el reinicio mientras la de event time no.

## Explícalo con tus palabras

Explica la frase "la verdad es el log; la base de datos es un cache de un subconjunto del log" usando el ejemplo de un carrito de compras.
