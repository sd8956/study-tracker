---
title: Replicación líder-seguidor
kind: lesson
hours: 2
sources: Designing Data-Intensive Applications (Kleppmann), Parte II intro (pp. 167–172) | cap. 5 (pp. 173–183)
links: PostgreSQL, alta disponibilidad y replicación | https://www.postgresql.org/docs/current/high-availability.html ; MySQL, formatos de binlog | https://dev.mysql.com/doc/refman/8.0/en/replication-formats.html
---

## Objetivo

Entender por qué se distribuyen los datos, cómo funciona la replicación basada en líder (síncrona, asíncrona y semisíncrona), cómo se añaden seguidores, qué pasa cuando un nodo falla (catch-up y failover) y qué formatos de replication log existen.

## Estudio

### Por qué distribuir datos

Arranca la Parte II del libro: qué pasa cuando los datos viven en **varias máquinas**. Hay varias razones para hacerlo:

- **Escalabilidad**: si el volumen de datos o la carga de lectura y escritura supera lo que aguanta una máquina, repartes la carga.
- **Tolerancia a fallos y alta disponibilidad**: si una máquina (o un datacenter entero) cae, otras toman el relevo.
- **Latencia**: si tus usuarios están en todo el mundo, quieres servidores cerca de cada uno para que los paquetes no crucen medio planeta.

#### Escalar hacia más carga

Si solo necesitas más capacidad, podrías comprar una máquina más potente (**scale up**). Hay dos variantes:

- **Shared-memory**: muchas CPUs, RAM y discos bajo un mismo sistema operativo. El coste crece más rápido que linealmente (una máquina con el doble de CPU cuesta mucho más del doble) y, por cuellos de botella, no rinde el doble. Además, la tolerancia a fallos es limitada y todo está en un solo lugar.
- **Shared-disk**: varias máquinas con CPU y RAM propias que comparten un array de discos por una red rápida. Se usa en algunos warehouses, pero la contención y el overhead de locks limitan su escalabilidad.

La alternativa es la arquitectura **shared-nothing** (**scale out**): cada máquina (nodo) usa su propia CPU, RAM y discos, y la coordinación ocurre por software a través de una red convencional. No requiere hardware especial, puedes usar las máquinas con mejor relación precio/rendimiento, repartir los datos por regiones geográficas y aguantar la pérdida de un datacenter entero. Con la nube, incluso una empresa pequeña puede tener arquitectura multirregión.

Shared-nothing no es gratis: añade mucha complejidad y a veces limita los modelos de datos que puedes usar. Toda la Parte II trata de esos trade-offs.

#### Replicación frente a particionamiento

Hay dos formas comunes de repartir datos entre nodos, que suelen combinarse:

```
  replicación: la MISMA copia en varios nodos      particionamiento: datos DISTINTOS en cada nodo

   nodo 1: [A B C D]                               nodo 1: [A B]
   nodo 2: [A B C D]                               nodo 2: [C D]
   nodo 3: [A B C D]

  combinadas: cada partición replicada
   nodo 1: [A B]  [C D]'
   nodo 2: [C D]  [A B]'
```

- **Replicación**: mantener una copia de los mismos datos en varios nodos, posiblemente en lugares distintos. Aporta redundancia (si un nodo cae, otros sirven los datos) y rendimiento de lectura. Es el tema de esta sesión y las dos siguientes.
- **Particionamiento** (*sharding*): dividir una base grande en subconjuntos más pequeños (particiones) asignados a nodos distintos. Sesión 14.

### Qué significa replicar

Replicar es guardar una copia de los mismos datos en varias máquinas conectadas por red. Motivos: mantener los datos **cerca de los usuarios** (latencia), permitir que el sistema siga funcionando si fallan algunas partes (**disponibilidad**) y aumentar el número de máquinas que pueden servir **lecturas** (throughput).

Si los datos nunca cambiaran, replicar sería trivial: los copias una vez y listo. Toda la dificultad está en **gestionar los cambios**. Hay tres algoritmos populares para replicar cambios: **single-leader**, **multi-leader** y **leaderless**. Esta sesión se centra en el primero.

### Líderes y seguidores

Cada nodo que guarda una copia se llama **réplica**. Con varias réplicas surge la pregunta: ¿cómo aseguras que todos los datos acaban en todas? La solución más común es la **replicación basada en líder** (también llamada *active/passive* o *master–slave*):

1. Una réplica se designa como **líder** (*leader*, *primary*). Los clientes que quieren escribir envían sus peticiones al líder, que escribe primero en su almacenamiento local.
2. Las demás réplicas son **seguidores** (*followers*, *read replicas*, *secondaries*). Cada vez que el líder escribe, envía el cambio a los seguidores como parte de un **replication log** o *change stream*. Cada seguidor aplica los cambios **en el mismo orden** en que se procesaron en el líder.
3. Los clientes pueden **leer** del líder o de cualquier seguidor, pero **solo el líder acepta escrituras**.

```
                escrituras
  cliente ───────────────────► ┌────────┐
                               │ LÍDER  │
                               └───┬────┘
                    replication log │ (cambios en orden)
                 ┌──────────────────┼──────────────────┐
                 ▼                  ▼                  ▼
            ┌──────────┐      ┌──────────┐       ┌──────────┐
            │seguidor 1│      │seguidor 2│       │seguidor 3│
            └──────────┘      └──────────┘       └──────────┘
                 ▲                  ▲                  ▲
  clientes ──────┴──── lecturas ────┴──────────────────┘
```

Es una función integrada en PostgreSQL (desde 9.0), MySQL, Oracle Data Guard y SQL Server AlwaysOn; también en MongoDB, RethinkDB y Espresso. Y no se limita a bases de datos: **Kafka** y las colas de alta disponibilidad de RabbitMQ también la usan, igual que dispositivos de bloque replicados como DRBD.

### Replicación síncrona y asíncrona

Un detalle crucial: ¿el líder espera a que los seguidores confirmen antes de responder al cliente?

```
tiempo ─────────────────────────────────────────────────────────────►

cliente      ──update──►                                ◄──ok──
líder                   escribe │──────────────────────│ confirma
                                │                      │
seguidor 1 (síncrono)           └──► aplica ──ack──────┘
seguidor 2 (asíncrono)          └───────────────────────────────► aplica (mucho después)
```

- **Síncrona** (seguidor 1): el líder espera la confirmación del seguidor antes de informar éxito al cliente y antes de hacer visible la escritura. Ventaja: el seguidor tiene **garantizada una copia actualizada**; si el líder muere, los datos siguen ahí. Desventaja: si el seguidor síncrono no responde (crash, red, lo que sea), **la escritura no puede procesarse** y el líder bloquea todas las escrituras.
- **Asíncrona** (seguidor 2): el líder envía el cambio y no espera. Normalmente los seguidores van menos de un segundo por detrás, pero **no hay garantía**: si un seguidor se recupera de un fallo, el sistema está al límite o hay problemas de red, puede ir minutos por detrás.

Como es impráctico que **todos** los seguidores sean síncronos (cualquier caída pararía el sistema), lo habitual al activar replicación síncrona es que **uno** sea síncrono y el resto asíncronos. Si el síncrono se vuelve lento o no está disponible, uno asíncrono pasa a ser síncrono. Así hay al menos dos nodos con datos al día: el líder y el seguidor síncrono. Se le llama **semi-synchronous** (MySQL tiene un plugin con ese nombre; PostgreSQL usa `synchronous_standby_names`).

Muchas veces la replicación es **completamente asíncrona**. Entonces, si el líder falla de forma irrecuperable, **se pierden las escrituras no replicadas, aunque se hayan confirmado al cliente**. Suena mal, pero es muy común, sobre todo con muchos seguidores o distribución geográfica, porque el líder puede seguir escribiendo aunque todos los seguidores vayan atrasados.

La investigación ofrece variantes que no pierden datos con buen rendimiento, como la **chain replication** (usada en Azure Storage). Y hay una conexión profunda entre consistencia de replicación y **consenso**, que verás en la sesión 21.

### Añadir seguidores nuevos

A veces necesitas un seguidor nuevo: más réplicas o reemplazar un nodo caído. ¿Cómo garantizas que tenga una copia exacta? Copiar los archivos de datos no basta: los clientes escriben continuamente y una copia de archivos vería partes distintas de la base en momentos distintos. Bloquear la base para escribir mataría la disponibilidad. El proceso habitual, sin downtime:

1. Tomar un **snapshot consistente** de la base del líder en algún momento, sin bloquearla (la mayoría de bases lo soportan para backups; en MySQL a veces con herramientas como `innobackupex`/Percona XtraBackup; en PostgreSQL con `pg_basebackup`).
2. Copiar el snapshot al nuevo seguidor.
3. El seguidor se conecta al líder y pide **todos los cambios ocurridos desde el snapshot**. Eso exige que el snapshot esté asociado a una **posición exacta** en el replication log: el *log sequence number* (LSN) en PostgreSQL o las coordenadas del binlog (o GTID) en MySQL.
4. Cuando el seguidor procesa el backlog, decimos que se ha **puesto al día** (*caught up*) y sigue procesando cambios a medida que llegan.

### Manejar caídas de nodos

Cualquier nodo puede caer por un fallo o por mantenimiento planificado (reinicios para parches del kernel). El objetivo: que el sistema siga funcionando aunque caigan nodos individuales, y que el impacto sea mínimo.

#### Caída de un seguidor: catch-up recovery

Cada seguidor guarda en disco un log de los cambios recibidos. Si se cae y reinicia, o si la red se interrumpe un rato, sabe cuál fue la **última transacción procesada**. Se reconecta al líder y pide los cambios desde ese punto. Cuando los aplica, está al día.

#### Caída del líder: failover

Es mucho más delicado. Hay que **promover un seguidor a líder**, reconfigurar a los clientes para que envíen escrituras al nuevo líder y hacer que los demás seguidores consuman del nuevo. A esto se le llama **failover**. Puede ser manual (un administrador recibe la alerta y actúa) o automático:

1. **Determinar que el líder falló.** Puede haber caído, haberse quedado sin luz, tener problemas de red… No hay forma infalible de detectarlo, así que la mayoría de sistemas usan un **timeout**: los nodos se envían mensajes periódicos (*heartbeats*) y si un nodo no responde durante, digamos, 30 segundos, se asume muerto. (Si se apagó para mantenimiento planificado, no aplica.)
2. **Elegir un nuevo líder.** Por elección (los nodos restantes eligen) o designado por un **controller node** previamente elegido. El mejor candidato suele ser la réplica con los datos **más actualizados**, para minimizar pérdidas. Lograr que todos los nodos se pongan de acuerdo es un problema de **consenso** (sesión 21).
3. **Reconfigurar el sistema** para usar el nuevo líder. Los clientes envían escrituras al nuevo líder. Si el viejo vuelve, puede **creerse aún líder**; el sistema debe asegurarse de que se convierta en seguidor y reconozca al nuevo.

#### Todo lo que puede salir mal en un failover

El failover está lleno de trampas:

- **Escrituras perdidas con replicación asíncrona.** El nuevo líder puede no haber recibido todas las escrituras del viejo. Si el viejo vuelve, ¿qué pasa con sus escrituras no replicadas? Puede que el nuevo líder ya haya recibido escrituras conflictivas. Lo más común es **descartarlas**, lo que viola las expectativas de durabilidad de los clientes.
- **Descartar es peligroso si otros sistemas dependen de los datos.** Un incidente real en GitHub: un seguidor MySQL desactualizado fue promovido a líder. La base usaba un contador autoincremental para asignar claves primarias, y el nuevo líder **reutilizó claves** que el viejo ya había asignado. Esas claves también se usaban en una base Redis, así que hubo inconsistencias entre MySQL y Redis que provocaron que **datos privados se mostraran a usuarios equivocados**.
- **Split brain.** En ciertos fallos, dos nodos pueden creer a la vez que son el líder. Si ambos aceptan escrituras y no hay forma de resolver conflictos, los datos se pierden o corrompen. Algunos sistemas tienen un mecanismo para apagar un nodo si detectan dos líderes (**STONITH**: *shoot the other node in the head*), pero si está mal diseñado puede acabar apagando a **ambos**.
- **¿Qué timeout usar?** Un timeout largo implica más tiempo de recuperación. Uno corto provoca **failovers innecesarios**: un pico de carga hace que el nodo tarde en responder, se dispara un failover, y el failover añade carga a un sistema que ya estaba sufriendo, empeorando todo.

No hay soluciones fáciles. Por eso algunos equipos de operaciones **prefieren hacer failovers a mano**, aunque el software soporte el automático. Estos problemas (nodos que fallan, redes poco fiables, trade-offs entre consistencia, durabilidad, disponibilidad y latencia) son los problemas fundamentales de los sistemas distribuidos y los verás a fondo en las sesiones 17 a 21.

### Implementación del replication log

¿Qué envía exactamente el líder a los seguidores? Hay cuatro enfoques:

#### 1. Statement-based replication

El líder registra cada **sentencia** de escritura (`INSERT`, `UPDATE`, `DELETE`) y la envía; cada seguidor la ejecuta como si viniera de un cliente. Parece razonable, pero se rompe fácilmente:

- Sentencias con funciones **no deterministas** como `NOW()` o `RAND()` dan valores distintos en cada réplica.
- Sentencias que dependen de datos existentes (`UPDATE ... WHERE <condición>`) o usan autoincremento deben ejecutarse **exactamente en el mismo orden** en cada réplica, lo que limita la concurrencia de transacciones.
- Sentencias con **efectos secundarios** (triggers, stored procedures, funciones de usuario) pueden comportarse distinto en cada réplica.

Se puede mitigar (el líder sustituye `NOW()` por un valor fijo), pero hay tantos casos límite que se prefieren otros métodos. MySQL lo usaba antes de la 5.1; hoy cambia a row-based cuando hay no determinismo. VoltDB lo usa exigiendo transacciones deterministas.

#### 2. Write-ahead log (WAL) shipping

En la sesión 05 viste que los motores ya escriben un log: el WAL de un B-tree o los segmentos de un LSM. Ese log contiene todos los bytes escritos. Puedes usar **exactamente el mismo log** para construir una réplica: el líder lo envía a los seguidores, que construyen una copia idéntica de las estructuras. PostgreSQL (streaming replication) y Oracle lo usan.

La desventaja: el log describe los datos a **muy bajo nivel** (qué bytes cambiaron en qué bloques de disco). Eso acopla la replicación al motor de almacenamiento: si la base cambia el formato de almacenamiento entre versiones, normalmente **no puedes tener líder y seguidores en versiones distintas**. Eso impide upgrades sin downtime (actualizar primero los seguidores y luego hacer failover).

#### 3. Logical (row-based) log replication

Usar un formato de log **distinto** para replicación, desacoplado del motor. A esto se le llama **logical log**. Para una base relacional es una secuencia de registros a nivel de fila:

- Para una fila insertada: los valores nuevos de todas las columnas.
- Para una fila borrada: suficiente información para identificarla (normalmente la clave primaria).
- Para una fila actualizada: lo necesario para identificarla y los nuevos valores (al menos de las columnas que cambiaron).

Una transacción que modifica varias filas genera varios registros y uno final que indica el commit. El **binlog de MySQL** configurado en modo row-based funciona así; PostgreSQL ofrece **logical decoding** y replicación lógica.

Ventajas: líder y seguidores pueden ejecutar **versiones distintas del motor** o incluso motores distintos; y es mucho más fácil de **parsear por aplicaciones externas**. Esto habilita el **change data capture (CDC)**: enviar los cambios de la base a un data warehouse, un índice de búsqueda o un cache (Debezium hace exactamente esto; lo verás en la sesión 23).

#### 4. Trigger-based replication

Los enfoques anteriores los implementa la base de datos sin código de aplicación. Si necesitas más flexibilidad (replicar solo un subconjunto de datos, replicar entre bases distintas, o lógica de resolución de conflictos), puedes subir la replicación a la **capa de aplicación**. Una forma es usar **triggers** y stored procedures: un trigger registra el cambio en una tabla separada y un proceso externo lo lee, aplica lógica y lo replica. Databus (Oracle) y Bucardo (PostgreSQL) funcionan así. Tiene más overhead y más probabilidad de bugs, pero aporta flexibilidad.

| Método | Qué se envía | Ventajas | Desventajas | Ejemplos |
| --- | --- | --- | --- | --- |
| Statement-based | Sentencias SQL | Compacto | No determinismo, orden estricto, efectos secundarios | MySQL < 5.1, VoltDB |
| WAL shipping | Bytes de bloques de disco | Réplica idéntica, sin trabajo extra | Acoplado a la versión del motor | PostgreSQL streaming, Oracle |
| Logical (row-based) | Cambios por fila | Desacoplado del motor; permite CDC | Más volumen que statement-based | MySQL binlog ROW, PostgreSQL logical replication |
| Trigger-based | Lo que decida tu código | Máxima flexibilidad | Overhead, propenso a bugs | Databus, Bucardo |

### Ideas erróneas frecuentes

- **"Si el cliente recibió un OK, el dato es durable."** Con replicación asíncrona, un OK puede perderse si el líder muere antes de replicar.
- **"Hacer todos los seguidores síncronos es más seguro."** Cualquier seguidor caído bloquearía todas las escrituras.
- **"El failover automático siempre es mejor."** Timeouts mal ajustados, split brain y pérdida de escrituras hacen que muchos equipos prefieran failover manual.
- **"Replicar sentencias SQL es suficiente."** El no determinismo y los efectos secundarios divergen entre réplicas.
- **"Copiar los archivos de datos crea una réplica."** Sin un snapshot consistente asociado a una posición del log, la copia es incoherente.

### Resumen

Distribuyes datos para escalar, tolerar fallos y reducir latencia, normalmente con arquitectura shared-nothing, combinando replicación y particionamiento. En la replicación basada en líder, solo el líder acepta escrituras y envía un replication log ordenado a los seguidores, de forma síncrona, asíncrona o semisíncrona. Los seguidores nuevos se crean desde un snapshot ligado a una posición del log. Un seguidor caído se pone al día solo; un líder caído requiere failover, con riesgos de pérdida de datos, split brain y timeouts mal elegidos. El log puede ser de sentencias, WAL, lógico por filas o basado en triggers.

## Conceptos clave

- **Shared-nothing**: arquitectura donde cada nodo tiene sus propios recursos y se coordina por red.
- **Replicación**: mantener copias de los mismos datos en varios nodos.
- **Líder (primary)**: la única réplica que acepta escrituras en replicación single-leader.
- **Seguidor (follower, read replica)**: réplica que aplica los cambios del líder en orden.
- **Replicación síncrona / asíncrona**: el líder espera o no la confirmación del seguidor antes de responder.
- **Semi-synchronous**: un seguidor síncrono y el resto asíncronos.
- **Snapshot consistente**: copia de la base en un instante, ligada a una posición del log.
- **Catch-up recovery**: un seguidor pide los cambios desde la última posición que procesó.
- **Failover**: promover un seguidor a líder cuando el líder falla.
- **Split brain**: dos nodos creen ser líderes a la vez.
- **WAL shipping**: replicar enviando el log de bajo nivel del motor.
- **Logical log**: log de cambios a nivel de fila, desacoplado del motor.
- **Change data capture**: exportar los cambios de una base a sistemas externos.

## Preguntas de repaso

1. ¿Por qué casi nunca se hacen síncronos todos los seguidores?
   R: Porque el líder tendría que esperar la confirmación de todos, y la caída o lentitud de cualquiera bloquearía todas las escrituras. Lo habitual es semi-synchronous: un seguidor síncrono para garantizar dos copias al día y el resto asíncronos.
2. ¿Qué riesgo implica la replicación totalmente asíncrona?
   R: Que una escritura confirmada al cliente se pierda si el líder falla de forma irrecuperable antes de enviarla a algún seguidor; la durabilidad no está garantizada a cambio de que el líder nunca se bloquee por los seguidores.
3. Describe cómo se añade un seguidor nuevo sin downtime.
   R: Se toma un snapshot consistente del líder sin bloquearlo, asociado a una posición exacta del replication log; se copia al seguidor; el seguidor pide al líder todos los cambios posteriores a esa posición y los aplica hasta ponerse al día, y luego sigue recibiendo cambios.
4. Explica qué salió mal en el incidente de GitHub durante un failover.
   R: Se promovió un seguidor MySQL desactualizado; el contador autoincremental reasignó claves primarias que el viejo líder ya había usado. Como esas claves también estaban en Redis, los datos quedaron inconsistentes y se mostró información privada a usuarios equivocados.
5. ¿Por qué un timeout muy corto para detectar la caída del líder es peligroso?
   R: Porque un pico de carga o un problema de red transitorio harían que el líder pareciera muerto y dispararían failovers innecesarios, que añaden más carga a un sistema ya estresado y pueden empeorar la situación o provocar split brain.
6. ¿Por qué la statement-based replication es frágil?
   R: Porque funciones no deterministas (NOW, RAND) dan resultados distintos en cada réplica, las sentencias que dependen de datos existentes o autoincrementos requieren el mismo orden exacto de ejecución, y los triggers o procedimientos con efectos secundarios pueden divergir.
7. ¿Qué ventaja tiene un logical log frente a WAL shipping?
   R: Está desacoplado del formato interno del motor, así que líder y seguidores pueden correr versiones distintas (permitiendo upgrades sin downtime) y sistemas externos pueden parsearlo fácilmente para change data capture.

## Ejercicio

Con Docker, levanta un PostgreSQL primario y una réplica con streaming replication (`pg_basebackup -R`), o usa una imagen ya preparada como `bitnami/postgresql` con variables de replicación.

1. Crea una tabla en el primario, inserta filas y verifica que aparecen en la réplica. Intenta un `INSERT` en la réplica y anota el error.
2. Consulta `pg_stat_replication` en el primario y `pg_last_wal_replay_lsn()` en la réplica; explica qué representa cada LSN.
3. Pausa la réplica (`docker pause`), inserta 1.000 filas en el primario, reanúdala y observa cómo se pone al día.
4. Configura `synchronous_standby_names` para hacerla síncrona, pausa la réplica e intenta un `INSERT` en el primario. Anota qué ocurre y deshaz la configuración.

Criterio de terminado: tienes las salidas de los cuatro pasos y una frase por paso que las explica con los conceptos de la lección (read-only, LSN, catch-up, bloqueo síncrono).

## Explícalo con tus palabras

Explica a un compañero por qué "el failover es simple: si cae el líder, promueve otro" esconde al menos tres problemas serios.
