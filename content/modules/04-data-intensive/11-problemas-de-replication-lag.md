---
title: "Replication lag: read-your-writes, lecturas monótonas y prefijo consistente"
kind: lesson
hours: 2
sources: Designing Data-Intensive Applications (Kleppmann), cap. 5 (pp. 183–190)
links: MongoDB, sesiones causalmente consistentes | https://www.mongodb.com/docs/manual/core/read-isolation-consistency-recency/ ; DynamoDB, consistencia de lectura | https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html
---

## Objetivo

Reconocer las anomalías que aparecen cuando lees de seguidores asíncronos (no ver tus propias escrituras, retroceder en el tiempo, ver respuestas antes que preguntas), dibujarlas en una línea de tiempo y conocer las técnicas para evitarlas.

## Estudio

### Escalar lecturas con seguidores, y su precio

Tolerar fallos es solo una razón para replicar. Las otras son **escalabilidad** y **latencia**. En la replicación basada en líder, todas las escrituras pasan por un nodo, pero las lecturas pueden ir a cualquier réplica. En la web es muy común que la carga sea mayoritariamente de lectura con un pequeño porcentaje de escrituras. Así que hay una arquitectura tentadora: **crear muchos seguidores y repartir entre ellos las lecturas**. Descargas al líder y sirves las lecturas desde réplicas cercanas. Para aumentar capacidad de lectura, añades seguidores. Es la **read-scaling architecture**.

Este enfoque solo es realista con **replicación asíncrona**: con todos los seguidores síncronos, la caída de cualquier nodo bloquearía las escrituras, y cuantos más nodos, más probable es que alguno esté caído.

El problema: si lees de un seguidor asíncrono que va atrasado, ves **información desactualizada**. Si lanzas la misma consulta al líder y a un seguidor al mismo tiempo, puedes obtener resultados distintos. Es un estado temporal: si dejas de escribir y esperas, los seguidores acaban poniéndose al día. Por eso se habla de **eventual consistency** (consistencia eventual).

La palabra "eventual" es deliberadamente vaga: **no hay límite** a cuánto puede atrasarse una réplica. El retraso entre que una escritura ocurre en el líder y se refleja en un seguidor, el **replication lag**, suele ser una fracción de segundo. Pero si el sistema está cerca de su capacidad o hay problemas de red, puede llegar a varios segundos o minutos. Entonces las inconsistencias dejan de ser teóricas y se vuelven bugs reales.

Veamos las tres anomalías clásicas.

### 1. Reading your own writes

Muchas aplicaciones permiten al usuario enviar datos y luego verlos: un comentario, un cambio de perfil, un registro de cliente. La escritura va al líder, pero la lectura puede ir a un seguidor. Con replicación asíncrona:

```
tiempo ──────────────────────────────────────────────────────────────────►

usuario 1234   ──INSERT comentario──►           ──SELECT comentarios──►
                        │                                │
líder          escribe ●│──── replica ─────────────────────────────────●───►
                        │                                │             │
seguidor 1              │                                │       aplica ● (tarde)
                        │                                ▼
seguidor 2              │                         lee aquí: ¡no está!
                                                  "¿se perdió mi comentario?"
```

Para el usuario, parece que lo que envió **se perdió**, y se enfada con razón. La garantía que necesitas se llama **read-after-write consistency** (o *read-your-writes consistency*): si el usuario recarga la página, **siempre verá las actualizaciones que él mismo envió**. No promete nada sobre otros usuarios: sus cambios pueden tardar en verse.

#### Técnicas para implementarla

1. **Leer del líder lo que el usuario pudo modificar.** Requiere saber qué puede haber cambiado sin consultarlo. Ejemplo: en una red social, el perfil de un usuario normalmente solo lo edita su dueño. Regla simple: **tu propio perfil se lee siempre del líder; los perfiles ajenos, de un seguidor**.
2. **Criterios temporales.** Si casi todo es editable por el usuario, leer todo del líder anularía el beneficio de escalar lecturas. Alternativa: durante un minuto después de la última escritura del usuario, sus lecturas van al líder. O monitorizar el lag de los seguidores y **no consultar los que vayan más de un minuto atrasados**.
3. **Recordar el timestamp de la última escritura.** El cliente guarda la marca temporal de su escritura más reciente, y el sistema garantiza que la réplica que atiende sus lecturas refleje al menos hasta esa marca. Si la réplica no está al día, otra atiende la lectura, o la consulta espera. La marca puede ser **lógica** (una posición en el log, como el LSN de PostgreSQL) o un reloj real (lo cual exige sincronización de relojes; sesión 17).
4. **Varios datacenters** añaden complejidad: cualquier petición que deba servirla el líder tiene que enrutarse al datacenter que contiene al líder.

#### El caso multidispositivo

Más difícil todavía: el mismo usuario usa varios dispositivos (navegador del portátil y app del móvil). Ahí quieres **cross-device read-after-write consistency**: si escribe en un dispositivo, debe verlo en el otro.

- Recordar el timestamp en el dispositivo no sirve: el otro dispositivo no lo conoce. Hay que **centralizar ese metadato**.
- Las réplicas pueden estar en distintos datacenters y no hay garantía de que las conexiones de dos dispositivos se enruten al mismo. (El portátil por la fibra de casa y el móvil por la red celular pueden ir por rutas completamente distintas.) Si tu estrategia requiere leer del líder, quizá primero debas **enrutar todas las peticiones de un usuario al mismo datacenter**.

#### Cómo lo resuelven sistemas reales

| Sistema | Mecanismo |
| --- | --- |
| **DynamoDB** | Lecturas *eventually consistent* por defecto; puedes pedir `ConsistentRead: true` por petición (más caro, solo en la región de la tabla) |
| **MongoDB** | *Causally consistent sessions*: el driver lleva un `operationTime`/`clusterTime` y el secundario espera hasta haber aplicado ese punto antes de responder |
| **PostgreSQL** | Guardas el LSN tras escribir (`pg_current_wal_lsn()`) y en la réplica compruebas `pg_last_wal_replay_lsn()` antes de leer; o usas `synchronous_commit = remote_apply` para que el commit espere a que la réplica lo aplique |
| **Aplicaciones Rails/Django** | Middleware que, tras un POST, fija una cookie y fuerza lecturas del primario durante unos segundos |

### 2. Monotonic reads

La segunda anomalía es más extraña: un usuario puede ver que **las cosas retroceden en el tiempo**. Ocurre si hace varias lecturas a **distintas réplicas**:

```
tiempo ──────────────────────────────────────────────────────────────────►

usuario 2345 escribe comentario ──► líder ●──── replica ────►
                                          │
seguidor 1 (poco lag)                     └─► aplica ●
seguidor 2 (mucho lag)                                              aplica ●

usuario 2345? no. Usuario 1234 lee dos veces:
  lectura A ──► seguidor 1:  ve el comentario de 2345   ✔
  lectura B ──► seguidor 2:  NO ve el comentario        ✘ "¡desapareció!"
```

El usuario 1234 recarga la página. La primera vez ve el comentario recién publicado por el usuario 2345; la segunda (otro seguidor, más atrasado) ya no está. Es como si el tiempo hubiera ido hacia atrás.

**Monotonic reads** es la garantía de que esto no ocurra. Es más débil que la consistencia fuerte, pero más fuerte que la eventual: puedes seguir viendo datos viejos, pero **si haces varias lecturas seguidas, nunca verás datos más viejos después de haber visto datos más nuevos**.

Una forma de lograrlo: **cada usuario lee siempre de la misma réplica** (usuarios distintos pueden usar réplicas distintas). Por ejemplo, eliges la réplica con un hash del ID de usuario, en lugar de aleatoriamente. Si esa réplica falla, las consultas se reenrutan a otra, y entonces habría que comprobar que la nueva esté al menos tan avanzada como la anterior (otra vez, con una posición de log).

### 3. Consistent prefix reads

La tercera anomalía viola la **causalidad**. Imagina este diálogo entre el señor Poons y la señora Cake:

> **Sr. Poons**: ¿Hasta dónde puede ver en el futuro, señora Cake?
> **Sra. Cake**: Normalmente unos diez segundos, señor Poons.

Hay una relación causal: la señora Cake escuchó la pregunta y respondió. Ahora imagina un observador que lee la conversación a través de seguidores. Si la base está **particionada** y la pregunta y la respuesta están en particiones distintas con distinto lag:

```
             partición 1 (mensajes de Poons)     partición 2 (mensajes de Cake)
líder        ● "¿hasta dónde ve?"   (t=1)         ● "unos diez segundos" (t=2)
seguidor     ─────────────── aplica ● (t=5)       ── aplica ● (t=3)

observador lee en t=4:
   ve:  Sra. Cake: "Normalmente unos diez segundos, señor Poons."
        (la pregunta aún no aparece)
   ...  ¡parece que la señora Cake respondió antes de la pregunta!
```

El observador ve la respuesta **antes** que la pregunta. Parece que la señora Cake efectivamente ve el futuro.

**Consistent prefix reads** es la garantía de que, si una secuencia de escrituras ocurre en cierto orden, quien las lea **las verá en ese mismo orden**.

Es un problema particular de las bases **particionadas** (sesión 14). Si la base siempre aplica las escrituras en el mismo orden, las lecturas siempre ven un prefijo consistente. Pero en muchas bases distribuidas, **las particiones operan de forma independiente** y no hay un orden global de escrituras: cuando alguien lee, puede ver partes de la base en un estado más viejo y otras en uno más nuevo.

Soluciones: asegurar que las escrituras **causalmente relacionadas vayan a la misma partición** (todos los mensajes de una conversación en la misma partición). En algunas aplicaciones no es eficiente; entonces existen algoritmos que **rastrean dependencias causales** explícitamente, un tema que retomarás con la relación *happens-before* en la próxima sesión y en la sesión 20.

### Tabla resumen de garantías

| Garantía | Qué promete | Para quién | Técnica típica |
| --- | --- | --- | --- |
| **Eventual consistency** | Si dejas de escribir, todas las réplicas acaban convergiendo | Todos | Replicación asíncrona |
| **Read-your-writes** | Ves siempre tus propias escrituras | El usuario que escribió | Leer del líder, recordar la posición de tu última escritura |
| **Monotonic reads** | No retrocedes en el tiempo entre lecturas sucesivas | Cada usuario | Fijar una réplica por usuario |
| **Consistent prefix reads** | Ves las escrituras en el orden en que ocurrieron | Cualquier lector | Escrituras causalmente relacionadas en la misma partición |

Ninguna de estas tres garantías equivale a consistencia fuerte. Son **garantías de sesión** más baratas que resuelven las quejas más visibles de los usuarios.

### Soluciones para el replication lag

Cuando trabajes con un sistema eventualmente consistente, pregúntate: **¿cómo se comporta la aplicación si el lag sube a varios minutos u horas?** Si la respuesta es "no pasa nada", perfecto. Si la experiencia es mala, necesitas diseñar el sistema para dar una garantía más fuerte, como read-after-write.

Fingir que la replicación es síncrona cuando en realidad es asíncrona es **receta para problemas**. Como viste, hay formas de dar garantías más fuertes desde la aplicación (leer ciertas cosas del líder, etc.), pero hacerlo en la aplicación es **complejo y fácil de equivocarse**.

Sería mejor que los desarrolladores no tuvieran que preocuparse por estos problemas sutiles y pudieran **confiar en que la base de datos hace lo correcto**. Esa es la razón de ser de las **transacciones**: una forma de que la base dé garantías fuertes para que la aplicación sea más simple. Las transacciones en un solo nodo existen hace mucho, pero en el paso a bases distribuidas (escalables) muchos sistemas las abandonaron, argumentando que son demasiado caras en rendimiento y disponibilidad, y que la consistencia eventual es inevitable en un sistema escalable. Hay algo de verdad en eso, pero es una simplificación excesiva. Lo verás con matices en las sesiones 15, 16 y 21.

### Un ejemplo de diseño completo

Supón una app de notas con 1 líder y 4 réplicas de lectura en otra región. Requisitos de producto:

1. Al guardar una nota, el usuario debe verla en la lista inmediatamente, en cualquier dispositivo.
2. Al navegar, la lista no debe "parpadear" (notas que aparecen y desaparecen).
3. En notas compartidas, los comentarios deben verse en orden.

Diseño:

- Tras cada escritura, el backend devuelve la posición del log (LSN) y la guarda en una tabla `user_last_write(user_id, lsn)` en el líder (o en un cache rápido compartido), no solo en el dispositivo, para cubrir el caso multidispositivo.
- Cada lectura del usuario consulta su `lsn` y elige una réplica cuyo `replay_lsn ≥ lsn`; si ninguna cumple, lee del líder. → **read-your-writes**.
- Las réplicas candidatas se ordenan por `hash(user_id)` para que cada usuario use siempre la misma mientras esté sana. → **monotonic reads**.
- Los comentarios de una nota se guardan en la misma partición que la nota (clave `note_id`). → **consistent prefix**.

```
leer(user=42):
  lsn_min = user_last_write[42]            # p. ej., 0/3A00F10
  for r in réplicas ordenadas por hash(42):
      if r.replay_lsn >= lsn_min: return r.query(...)
  return líder.query(...)
```

### Medir el lag: convertir "eventual" en un número

Aunque tu aplicación tolere lecturas viejas, operativamente necesitas saber **cuánto** atrasan tus réplicas y recibir una alerta si el atraso crece. En la replicación basada en líder es relativamente fácil: líder y seguidores aplican las escrituras en el mismo orden y cada nodo tiene una **posición en el log**. Restando la posición del seguidor a la del líder obtienes el lag en bytes o en número de transacciones.

En la práctica:

- **PostgreSQL** expone en `pg_stat_replication` (en el primario) las columnas `write_lag`, `flush_lag` y `replay_lag`: el tiempo desde que el primario generó un cambio hasta que la réplica lo escribió, lo sincronizó a disco y lo aplicó. También puedes comparar LSNs con `pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn)` para obtener el atraso en bytes.
- **MySQL** muestra `Seconds_Behind_Source` en `SHOW REPLICA STATUS`. Cuidado: se calcula con timestamps de los eventos y puede ser engañoso (por ejemplo, marca 0 si el hilo de I/O está atascado y no llegan eventos nuevos). Herramientas como `pt-heartbeat` escriben una fila con la hora cada segundo en el primario y miden en la réplica cuánto tarda en aparecer: un "latido" mucho más fiable.
- **Amazon RDS / Aurora** publican métricas como `ReplicaLag` en CloudWatch, sobre las que puedes poner alarmas.

¿Qué dispara el lag en la vida real?

| Causa | Por qué atrasa |
| --- | --- |
| Transacción enorme en el primario (`UPDATE` de millones de filas) | La réplica tiene que aplicarla entera y, en muchos motores, de forma secuencial |
| Réplica con hardware más débil o discos más lentos | Aplica cambios más despacio de lo que el primario los genera |
| Consultas analíticas pesadas en la réplica | Compiten por CPU e I/O con el proceso que aplica el log; en PostgreSQL pueden incluso pausar la aplicación del WAL para no cancelar la consulta (`max_standby_streaming_delay`) |
| Problemas de red entre regiones | Los cambios llegan tarde o en ráfagas |
| Aplicación single-threaded del log | El primario escribe en paralelo con muchas conexiones, pero la réplica aplica en un solo hilo (MySQL mejoró esto con replicación paralela) |

En los sistemas **leaderless** que verás en la próxima sesión, medir es más difícil: no hay un orden fijo de escrituras y, si solo se reparan valores al leerlos, un valor que casi nunca se lee puede estar viejísimo en alguna réplica. Que "eventual" sea vago como garantía está bien, pero **para operar el sistema necesitas cuantificarlo**.

### Ideas erróneas frecuentes

- **"Eventual consistency significa unos milisegundos."** No hay cota: bajo carga o con problemas de red, el lag puede ser de minutos.
- **"Read-your-writes es consistencia fuerte."** Solo garantiza que tú ves tus escrituras; otros usuarios pueden ver datos viejos.
- **"Guardar el timestamp en el navegador basta."** No cubre al mismo usuario en otro dispositivo.
- **"Las anomalías solo pasan con mucho tráfico."** Basta con que dos lecturas consecutivas vayan a réplicas con lag distinto.
- **"Si todo está en un líder único, no hay problemas de orden."** Con particiones independientes, cada una tiene su propio orden y el lector puede ver mezclas.

### Resumen

Escalar lecturas con seguidores asíncronos introduce replication lag y, con él, consistencia eventual sin cota temporal. Tres anomalías aparecen en la práctica: no ver tus propias escrituras (se resuelve con read-after-write consistency), retroceder en el tiempo entre lecturas (monotonic reads) y ver efectos antes que causas en bases particionadas (consistent prefix reads). Implementarlas en la aplicación es posible pero delicado; por eso conviene que la base dé garantías, tema de las transacciones.

## Conceptos clave

- **Read-scaling architecture**: muchos seguidores asíncronos para repartir lecturas.
- **Replication lag**: retraso entre una escritura en el líder y su aplicación en un seguidor.
- **Eventual consistency**: las réplicas convergen si dejan de llegar escrituras, sin cota de tiempo.
- **Read-after-write (read-your-writes) consistency**: un usuario siempre ve sus propias escrituras.
- **Cross-device read-after-write**: la misma garantía entre varios dispositivos del mismo usuario.
- **Monotonic reads**: las lecturas sucesivas de un usuario nunca retroceden en el tiempo.
- **Consistent prefix reads**: las escrituras se leen en el orden en que ocurrieron.
- **Causalidad**: relación en la que un evento depende de otro anterior (pregunta → respuesta).
- **Session guarantees**: garantías por sesión de cliente más débiles que la consistencia fuerte.

## Preguntas de repaso

1. ¿Por qué la read-scaling architecture solo funciona con replicación asíncrona?
   R: Porque con muchos seguidores síncronos el líder tendría que esperar a todos en cada escritura, y la caída de cualquiera bloquearía las escrituras; cuantos más nodos, más probable es que alguno falle.
2. Describe la anomalía de read-your-writes con una línea de tiempo.
   R: El usuario escribe un comentario en el líder; antes de que el cambio llegue al seguidor, recarga la página y su lectura va a ese seguidor atrasado, que no tiene el comentario. El usuario cree que su escritura se perdió.
3. Da dos técnicas para garantizar read-your-writes y una limitación de cada una.
   R: Leer del líder los datos que el usuario puede modificar (por ejemplo su propio perfil): no funciona si casi todo es editable. Recordar la posición de la última escritura y leer solo de réplicas que la hayan alcanzado: requiere centralizar ese dato para el caso multidispositivo y, si es un timestamp de reloj, sincronización de relojes.
4. ¿Qué es monotonic reads y cómo se implementa de forma simple?
   R: La garantía de que un usuario no verá datos más viejos después de haber visto datos más nuevos. Se implementa haciendo que cada usuario lea siempre de la misma réplica, elegida por ejemplo con un hash del ID de usuario.
5. ¿Por qué consistent prefix reads es un problema especial de las bases particionadas?
   R: Porque las particiones operan de forma independiente y no hay un orden global de escrituras; si una causa y su efecto están en particiones con distinto lag, un lector puede ver el efecto (la respuesta) antes que la causa (la pregunta).
6. ¿Qué pregunta de diseño debes hacerte con un sistema eventualmente consistente?
   R: Cómo se comporta la aplicación si el replication lag crece a minutos u horas. Si la experiencia se vuelve inaceptable, necesitas garantías más fuertes, en lugar de asumir que la replicación es síncrona.

## Ejercicio

Escribe en TypeScript una simulación pequeña (la versión completa llegará en el proyecto de la sesión 13):

1. Un `Leader` con un array `log` de escrituras `{lsn, key, value}` y dos `Follower` que aplican el log con retrasos distintos (por ejemplo 50 ms y 400 ms), usando `setTimeout`.
2. Un cliente que escribe `comment:1` y lee inmediatamente desde una réplica aleatoria. Ejecuta 1.000 iteraciones y cuenta cuántas veces no ve su propia escritura.
3. Implementa la técnica "recordar LSN": el cliente guarda el LSN devuelto por la escritura y solo lee de réplicas con `appliedLsn >= lsn` (si ninguna, del líder). Repite y cuenta.
4. Mide cuántas veces dos lecturas consecutivas "retroceden" con réplica aleatoria y con réplica fija por `hash(userId)`.

Criterio de terminado: imprimes una tabla con cuatro números (violaciones de read-your-writes sin y con LSN; retrocesos sin y con réplica fija) y las versiones corregidas dan 0.

## Explícalo con tus palabras

Explica las tres anomalías con un ejemplo de la vida real (un chat de grupo) y di qué garantía arregla cada una.
