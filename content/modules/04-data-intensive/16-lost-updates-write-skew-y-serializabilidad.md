---
title: Lost updates, write skew y serializabilidad
kind: lesson
hours: 2
sources: Designing Data-Intensive Applications (Kleppmann), cap. 7 (pp. 264–290)
links: PostgreSQL, Serializable Snapshot Isolation (wiki) | https://wiki.postgresql.org/wiki/SSI ; VoltDB, arquitectura de ejecución serial | https://docs.voltdb.com/UsingVoltDB/IntroHowVoltDBWorks.php
---

## Objetivo

Reconocer las race conditions que los niveles débiles no evitan (lost updates, write skew y phantoms), conocer las técnicas para prevenirlas, y comparar las tres formas de lograr serializabilidad: ejecución serial real, two-phase locking y serializable snapshot isolation (SSI).

## Estudio

### Más allá de las dirty writes

Read committed y snapshot isolation garantizan qué puede ver una transacción de solo lectura ante escrituras concurrentes. Pero hay otro tipo de conflicto entre **dos transacciones que escriben**: las dirty writes son solo uno. El más conocido es el **lost update**.

### Lost updates

Ocurre cuando una aplicación hace un ciclo **leer-modificar-escribir**: lee un valor, lo cambia y escribe el resultado. Si dos transacciones lo hacen a la vez, una de las modificaciones se pierde, porque la segunda escritura no incluye la primera (se dice que *clobbers* la primera). Ejemplos:

- Incrementar un contador o actualizar el saldo de una cuenta.
- Modificar una lista dentro de un documento JSON (leer, parsear, añadir, escribir).
- Dos usuarios editando a la vez una página de wiki, guardando cada uno la página completa.

Soluciones:

#### 1. Operaciones de escritura atómicas

Muchas bases evitan el ciclo leer-modificar-escribir con operaciones atómicas:

```sql
UPDATE counters SET value = value + 1 WHERE key = 'foo';   -- seguro en la mayoría de bases
```

MongoDB tiene operadores atómicos para modificar partes de un documento (`$inc`, `$push`); Redis los tiene para estructuras como colas de prioridad. Normalmente se implementan con un **lock exclusivo** sobre el objeto mientras se lee y escribe (*cursor stability*), o forzando que todas las operaciones atómicas se ejecuten en un solo hilo.

Ojo con los ORMs: `user.balance += 100; user.save()` hace leer-modificar-escribir en la aplicación, un bug sutil que los tests no detectan.

#### 2. Locks explícitos

Si la base no tiene la operación atómica que necesitas, la aplicación puede bloquear explícitamente los objetos a actualizar. Ejemplo: un juego multijugador donde varios jugadores pueden mover la misma figura. La lógica de validación (¿es legal este movimiento?) no cabe en una consulta, así que bloqueas la fila:

```sql
BEGIN TRANSACTION;
SELECT * FROM figures WHERE name = 'robot' AND game_id = 222 FOR UPDATE;  -- lock sobre las filas
-- la aplicación comprueba si el movimiento es válido
UPDATE figures SET position = 'c4' WHERE id = 1234;
COMMIT;
```

`FOR UPDATE` indica que la base debe bloquear todas las filas devueltas. Funciona, pero tienes que **pensar bien la lógica**: es fácil olvidar un lock en algún sitio.

#### 3. Detección automática de lost updates

En lugar de impedir que ocurran, deja que las transacciones se ejecuten en paralelo y, si el gestor detecta un lost update, **aborta la transacción** y la obliga a reintentar. Ventaja: las bases pueden comprobarlo eficientemente junto con snapshot isolation. PostgreSQL (repeatable read), Oracle (serializable) y SQL Server (snapshot) detectan lost updates automáticamente. **MySQL/InnoDB en repeatable read no lo hace.** Es una gran ventaja: la aplicación no tiene que usar operaciones especiales; menos propenso a errores.

#### 4. Compare-and-set

En bases sin transacciones, la operación atómica **compare-and-set** evita lost updates: solo permite actualizar si el valor no cambió desde que lo leíste. Si cambió, la actualización no tiene efecto y debes reintentar.

```sql
UPDATE wiki_pages SET content = 'nuevo contenido'
WHERE id = 1234 AND content = 'contenido viejo';
-- si 0 filas afectadas: alguien cambió la página; recarga y reintenta
```

Cuidado: si la base permite que la condición `WHERE` lea de un snapshot viejo, esta sentencia puede no evitar el lost update. Comprueba que tu compare-and-set es seguro. Una variante muy usada es el **optimistic locking con columna de versión** (`WHERE id = ? AND version = ?` y `SET version = version + 1`).

#### 5. Resolución de conflictos en bases replicadas

En bases replicadas con multi-líder o leaderless, los locks y compare-and-set **no sirven**, porque asumen una única copia actualizada de los datos, y estas bases permiten escrituras concurrentes en varios nodos. El enfoque común: permitir versiones conflictivas (siblings) y resolverlas después (sesión 12). Las operaciones atómicas **conmutativas** (incrementar un contador, añadir a un set) funcionan bien en replicación, porque el orden no importa: es la idea de los datatypes de Riak 2.0. En cambio, **last write wins es propenso a lost updates**, y desafortunadamente es el default en muchas bases replicadas.

### Write skew y phantoms

Las dirty writes y los lost updates ocurren cuando dos transacciones escriben **el mismo objeto**. Hay conflictos más sutiles.

#### El ejemplo de los médicos de guardia

Una aplicación gestiona turnos de guardia en un hospital. Debe haber **al menos un médico de guardia** por turno. Un médico puede dejar su guardia si al menos otro colega sigue de guardia. Alice y Bob son los dos médicos de guardia de un turno. Ambos se sienten mal y pulsan "dejar la guardia" casi al mismo tiempo.

```
                    Alice                                   Bob
BEGIN                                           BEGIN
SELECT count(*) FROM doctors                    SELECT count(*) FROM doctors
  WHERE on_call AND shift_id = 1234;              WHERE on_call AND shift_id = 1234;
  → 2  (≥ 2, puedo irme)                          → 2  (≥ 2, puedo irme)
UPDATE doctors SET on_call = false              UPDATE doctors SET on_call = false
  WHERE name = 'Alice' AND shift_id = 1234;       WHERE name = 'Bob' AND shift_id = 1234;
COMMIT                                          COMMIT

resultado: 0 médicos de guardia   ← ¡invariante violado!
```

Cada transacción comprueba que hay dos médicos de guardia. Con snapshot isolation, ambas ven 2 en su snapshot, ambas actualizan **su propio** registro y ambas confirman. No queda nadie de guardia.

Esta anomalía es **write skew**. No es una dirty write ni un lost update, porque las transacciones actualizan **objetos distintos** (el registro de Alice y el de Bob). Es una generalización del lost update: dos transacciones leen los mismos objetos y luego actualizan algunos de ellos (distintos en cada una). Si actualizaran el mismo objeto, sería un lost update o una dirty write.

Con write skew, las opciones son más limitadas:

- Las **operaciones atómicas de un objeto no sirven**, porque hay varios objetos implicados.
- La **detección automática de lost updates** de snapshot isolation tampoco: el write skew no se detecta automáticamente en PostgreSQL repeatable read, MySQL/InnoDB repeatable read, Oracle serializable ni SQL Server snapshot. Prevenirlo requiere aislamiento serializable de verdad.
- Algunas bases permiten **restricciones** (unicidad, foreign keys, `CHECK` sobre una fila), pero una restricción que abarca varios objetos ("al menos un médico de guardia") no la soportan directamente; podrías implementarla con triggers o vistas materializadas.
- Si no puedes usar serializable, la segunda mejor opción es **bloquear explícitamente** las filas de las que depende la transacción:

```sql
BEGIN TRANSACTION;
SELECT * FROM doctors WHERE on_call = true AND shift_id = 1234 FOR UPDATE;
UPDATE doctors SET on_call = false WHERE name = 'Alice' AND shift_id = 1234;
COMMIT;
```

#### Más ejemplos de write skew

- **Reserva de salas**: no puede haber dos reservas de la misma sala a la misma hora. Compruebas que no hay reservas solapadas y, si no hay, insertas. Snapshot isolation no impide que otro usuario inserte una reserva conflictiva a la vez.
- **Reclamar un nombre de usuario**: dos usuarios intentan registrar el mismo nombre a la vez. Aquí una **restricción de unicidad** lo resuelve: la segunda transacción falla.
- **Evitar el doble gasto**: un servicio que deja gastar dinero o puntos comprueba que el usuario no gaste más de lo que tiene. Con dos gastos concurrentes, cada uno solo no deja el saldo en negativo, pero juntos sí.

#### El patrón común y los phantoms

Todos siguen el mismo patrón:

1. Un `SELECT` comprueba si se cumple un requisito buscando filas que cumplan una condición (al menos dos médicos de guardia, no hay reservas para esa sala y hora, la figura no está en esa casilla, el nombre no existe, hay saldo).
2. Según el resultado, la aplicación decide cómo seguir.
3. Si sigue, hace una escritura (`INSERT`, `UPDATE`, `DELETE`) y confirma.

**El efecto de esa escritura cambia la condición previa del paso 1**: si repitieras el `SELECT` tras el commit, obtendrías otro resultado.

En el ejemplo de los médicos, la fila que se modifica en el paso 3 es una de las devueltas en el paso 1, así que bloquearla con `FOR UPDATE` funciona. Pero en los otros cuatro ejemplos el `SELECT` busca **filas que no existen** (ninguna reserva, ningún nombre). Si el paso 1 no devuelve filas, `FOR UPDATE` **no tiene nada que bloquear**.

Este efecto, en el que una escritura de una transacción cambia el resultado de una consulta de búsqueda de otra, se llama **phantom**. Snapshot isolation evita phantoms en consultas de solo lectura, pero en transacciones de lectura-escritura los phantoms pueden provocar casos difíciles de write skew.

#### Materializar conflictos

Si el problema es que no hay objeto que bloquear, quizá puedes **introducirlo artificialmente**. En la reserva de salas, crea una tabla de **slots de tiempo y salas**, con una fila por cada combinación (por ejemplo, cada 15 minutos durante los próximos seis meses). La transacción que reserva bloquea con `FOR UPDATE` las filas de los slots deseados y luego comprueba e inserta la reserva. La tabla de slots no guarda información de reservas: es solo una colección de locks.

Esta técnica, **materializing conflicts**, convierte un phantom en un conflicto de lock sobre filas concretas. Es difícil y propensa a errores, y deja que un mecanismo de control de concurrencia se filtre al modelo de datos. Debe ser el **último recurso**: un nivel serializable es preferible en la mayoría de casos.

### Serializabilidad

Los niveles débiles son difíciles de entender, varían entre bases y es difícil saber si tu código es seguro con ellos. La respuesta de los investigadores: **aislamiento serializable**, el más fuerte. Garantiza que, aunque las transacciones se ejecuten en paralelo, el resultado final es el mismo que si se hubieran ejecutado **una a una, en serie**, sin concurrencia. La base previene **todas** las race conditions posibles.

Si es tan bueno, ¿por qué no lo usa todo el mundo? Para responder, veamos las tres técnicas que lo implementan.

### 1. Ejecución serial real

La forma más simple de evitar problemas de concurrencia: **eliminar la concurrencia**. Ejecutar una sola transacción a la vez, en orden serial, en **un solo hilo**. Así se evitan por definición todos los conflictos.

Parece obvio, pero hasta ~2007 nadie lo consideraba viable para bases de alto rendimiento: se pensaba que la concurrencia multihilo era esencial. ¿Qué cambió?

- **La RAM se abarató**: para muchos casos de uso, es factible mantener todo el dataset activo en memoria. Sin esperas de disco, las transacciones son mucho más rápidas.
- Los diseñadores vieron que las **transacciones OLTP suelen ser cortas** y hacen pocas lecturas y escrituras. Las consultas analíticas largas pueden ejecutarse sobre un snapshot consistente fuera del bucle serial.

VoltDB/H-Store, Redis y Datomic usan ejecución serial. A veces rinde mejor que un sistema con concurrencia porque evita la coordinación de locks. Pero su throughput está limitado a **un núcleo de CPU**.

#### Encapsular transacciones en stored procedures

Las aplicaciones web mantienen las transacciones cortas, dentro de una petición HTTP, porque esperar al usuario dentro de una transacción sería carísimo. Aun así, en la forma interactiva (consulta, la aplicación procesa, otra consulta) se pierde muchísimo tiempo en **la red entre la aplicación y la base**. Con ejecución en un solo hilo, la base estaría ociosa esperando a la aplicación. Por eso los sistemas de ejecución serial **no permiten transacciones interactivas de varias sentencias**: la aplicación envía **todo el código de la transacción por adelantado** como una **stored procedure**.

```
interactiva (no permitida en serial)       stored procedure (serial)
app ──SELECT──► BD                         app ──"ejecuta reservar(vuelo, asiento)"──► BD
app ◄─────────  BD   (espera red)                    BD ejecuta todo de una vez
app ──UPDATE──► BD                         app ◄──────────────── resultado
app ◄─────────  BD   (espera red)
```

Las stored procedures tienen mala fama (PL/SQL, difíciles de depurar y versionar), pero los sistemas modernos usan lenguajes de propósito general: VoltDB usa Java o Groovy, Redis **Lua**. Como VoltDB ejecuta procedimientos deterministas, puede incluso **replicar ejecutando el mismo procedimiento en cada réplica**.

#### Particionar

Ejecutar todo en serie limita el throughput a un núcleo. Para escalar a varios núcleos y nodos, **particionas los datos** y cada partición tiene su propio hilo independiente. Si cada transacción solo lee y escribe datos de **una partición**, el throughput escala linealmente.

Pero las transacciones que tocan **varias particiones** requieren coordinación adicional entre todas ellas. Son mucho más lentas: VoltDB reporta del orden de **1.000 transacciones entre particiones por segundo**, órdenes de magnitud menos que las de una sola partición, y no mejoran añadiendo máquinas. Que las transacciones sean de una sola partición depende mucho de la estructura de los datos. Un modelo clave-valor simple se particiona fácil; datos con muchos índices secundarios probablemente requieren mucha coordinación.

**Resumen de la ejecución serial**, viable con restricciones:

- Cada transacción debe ser **pequeña y rápida**: una sola transacción lenta frena a todas.
- Limitado a casos donde el **dataset activo cabe en memoria** (datos raramente usados pueden estar en disco, pero si una transacción los necesita, sería muy lenta; se puede abortar, traerlos a memoria y reintentar: *anti-caching*).
- El **throughput de escritura** debe ser lo bastante bajo para un núcleo, o hay que particionar sin coordinación entre particiones.
- Las transacciones entre particiones son posibles, pero muy limitadas.

### 2. Two-phase locking (2PL)

Durante unos 30 años, el único algoritmo ampliamente usado para serializabilidad fue el **two-phase locking** (2PL). (No confundir con two-phase *commit*, 2PC, que es otra cosa: sesión 21.)

Ya viste locks contra dirty writes: si dos transacciones escriben el mismo objeto, la segunda espera. 2PL es **mucho más estricto**:

- Si la transacción A **leyó** un objeto y la B quiere **escribirlo**, B debe esperar a que A confirme o aborte. (Así B no cambia el objeto bajo los pies de A.)
- Si A **escribió** un objeto y B quiere **leerlo**, B debe esperar a que A confirme o aborte. (Leer una versión vieja, como en snapshot isolation, no está permitido.)

En 2PL, **los escritores bloquean a los escritores y también a los lectores, y viceversa**. Es justo lo contrario del lema de snapshot isolation ("los lectores nunca bloquean a los escritores"). Por eso 2PL protege contra todas las race conditions, incluidos lost updates y write skew.

#### Implementación

Se usa en MySQL InnoDB y SQL Server en nivel serializable, y en DB2 en repeatable read. Cada objeto tiene un lock que puede estar en **modo compartido** (*shared*) o **exclusivo**:

- Para **leer**, la transacción adquiere el lock en modo compartido. Varias pueden tenerlo compartido a la vez, pero si otra tiene un lock exclusivo, hay que esperar.
- Para **escribir**, adquiere el lock en modo exclusivo. Ninguna otra puede tener el lock (ni compartido ni exclusivo).
- Si primero lee y luego escribe, **promueve** el lock de compartido a exclusivo.
- Tras adquirir un lock, **lo mantiene hasta el final** de la transacción (commit o abort). De ahí "dos fases": la primera, mientras se ejecuta, adquiere locks; la segunda, al final, los libera todos.

Con tantos locks, es fácil que se produzca un **deadlock**: A espera a B y B espera a A. La base detecta automáticamente los deadlocks y aborta una de las transacciones, que la aplicación debe reintentar.

#### Rendimiento de 2PL

La gran desventaja, y la razón por la que no todo el mundo lo usa: **el throughput y los tiempos de respuesta son mucho peores** que con aislamiento débil. Parte es el overhead de adquirir y liberar locks, pero sobre todo es la **reducción de concurrencia**: si dos transacciones pueden provocar una race condition, una debe esperar a la otra.

Las bases con 2PL tienen latencias **muy inestables** y percentiles altos muy lentos si hay contención: basta una transacción lenta, o una que accede a muchos datos, para frenar todo el sistema. Los deadlocks son más frecuentes que con read committed basado en locks, y cada uno desperdicia el trabajo de la transacción abortada.

#### Predicate locks e index-range locks

¿Y los phantoms? Para evitarlos (reserva de salas), una base serializable necesita **predicate locks**: un lock que no pertenece a un objeto concreto sino a **todos los objetos que cumplen una condición de búsqueda**:

```sql
SELECT * FROM bookings
WHERE room_id = 123 AND end_time > '2026-01-01 12:00' AND start_time < '2026-01-01 13:00';
```

- Para leer con esa condición, se adquiere un predicate lock compartido sobre ella. Si otra transacción tiene un lock exclusivo sobre algún objeto que cumple la condición, hay que esperar.
- Para insertar, actualizar o borrar, se comprueba si el valor viejo o nuevo cumple algún predicate lock existente; si es así, hay que esperar.

La clave: el predicate lock aplica **incluso a objetos que aún no existen** pero que podrían añadirse (phantoms).

Los predicate locks rinden mal: comprobar muchos predicados es lento. Por eso la mayoría de bases con 2PL implementan **index-range locks** (*next-key locking*), una simplificación que bloquea un rango más amplio. Si hay un índice sobre `room_id`, la base puede bloquear la entrada del índice para la sala 123 (todas sus reservas, a cualquier hora). Si hay un índice por tiempo, puede bloquear un rango de tiempo (todas las salas). Cualquiera de los dos protege del phantom. Bloquea más de lo necesario, pero con mucho menos overhead. Si no hay un índice adecuado, puede caer a un **lock compartido sobre toda la tabla**: seguro, pero malo para el rendimiento.

### 3. Serializable snapshot isolation (SSI)

Hasta aquí, un panorama sombrío: implementaciones de serializabilidad que rinden mal (2PL) o no escalan (ejecución serial), y niveles débiles rápidos pero propensos a race conditions. ¿Son incompatibles la serializabilidad y el buen rendimiento? Quizá no: **SSI** ofrece serializabilidad completa con una pequeña penalización respecto a snapshot isolation. Se describió en 2008 (tesis de Michael Cahill) y se usa en PostgreSQL desde la 9.1 (nivel `SERIALIZABLE`) y, de forma parecida, en FoundationDB y CockroachDB.

#### Pesimista frente a optimista

- **2PL es pesimista**: si algo podría salir mal (hay un lock), espera hasta que sea seguro. La ejecución serial es pesimista al extremo (un lock exclusivo sobre toda la base), compensado haciendo cada transacción muy rápida.
- **SSI es optimista**: en lugar de bloquear, las transacciones siguen adelante con la esperanza de que todo saldrá bien. Al hacer commit, la base comprueba si ocurrió algo malo (si se violó el aislamiento); si es así, aborta y hay que reintentar. Solo confirman las transacciones que se ejecutaron de forma serializable.

El control optimista rinde **mal con mucha contención** (muchas transacciones accediendo a los mismos objetos), porque una gran proporción aborta, y los reintentos añaden carga a un sistema ya saturado. Pero con capacidad de sobra y contención moderada, **rinde mejor** que el pesimista. La contención se reduce con operaciones atómicas conmutativas (incrementos concurrentes no conflictan si no se lee el contador en la misma transacción).

#### Decisiones basadas en premisas desactualizadas

SSI se basa en snapshot isolation: todas las lecturas de una transacción vienen de un snapshot consistente. Sobre eso, añade un algoritmo para detectar conflictos de serialización y decidir qué transacciones abortar.

En el write skew, el patrón era: la transacción lee datos, examina el resultado y decide actuar según lo que vio. Pero con snapshot isolation, el resultado de la consulta original puede **ya no estar actualizado** al hacer commit, porque otra transacción lo modificó. Es decir, la transacción actuó sobre una **premisa** (un hecho que era cierto al empezar, como "hay dos médicos de guardia") que puede haber dejado de serlo.

La base debe detectar cuándo una transacción pudo actuar sobre una premisa desactualizada y abortarla. Hay dos casos:

**1. Detectar lecturas de versiones MVCC obsoletas** (una escritura no confirmada ocurrió antes de la lectura). La transacción 43 lee el estado de Alice y ve `on_call = true`, pero la transacción 42 (todavía no confirmada) ya lo había cambiado a `false`; por las reglas de visibilidad de MVCC, 43 la ignora. Si 42 confirma antes que 43, la premisa de 43 era falsa. La base registra cuándo una transacción ignora escrituras de otra por visibilidad MVCC, y **al hacer commit** comprueba si alguna de esas escrituras ya confirmó. Si es así, aborta.

¿Por qué esperar al commit en vez de abortar al leer? Porque si 43 es de solo lectura, no hay riesgo de write skew; y en el momento de leer, la base no sabe si 43 escribirá después ni si 42 abortará. Esperar evita aborts innecesarios.

**2. Detectar escrituras que afectan a lecturas previas** (la escritura ocurre después de la lectura). SSI usa algo parecido a los index-range locks, pero **sin bloquear**: si hay un índice sobre `shift_id`, la base anota en la entrada del índice 1234 que las transacciones 42 y 43 leyeron esos datos (esta anotación puede borrarse cuando todas las transacciones concurrentes terminen). Cuando una transacción escribe, busca en los índices transacciones que leyeron los datos afectados y les **notifica** que su lectura puede estar desactualizada (como un tripwire). La primera en confirmar lo hace con éxito; la otra, al intentar confirmar, descubre que una escritura conflictiva ya se confirmó y **aborta**.

```
txn 42 (Alice):  lee guardias de 1234 ── escribe on_call=false (Alice) ── COMMIT ✔
txn 43 (Bob):    lee guardias de 1234 ── escribe on_call=false (Bob) ──── COMMIT ✘ abortada
                   ▲ la base anotó que 42 y 43 leyeron 1234; la escritura de 42 "dispara" a 43
```

#### Rendimiento de SSI

La **granularidad** del seguimiento de lecturas es un trade-off: más detalle reduce aborts innecesarios pero cuesta más memoria y CPU.

Comparado con 2PL, la gran ventaja: **una transacción no necesita bloquearse esperando locks de otra**. Lectores y escritores no se bloquean mutuamente, así que la latencia es mucho más predecible. Las consultas de solo lectura pueden ejecutarse sobre un snapshot sin locks, muy atractivo para cargas de lectura.

Comparado con la ejecución serial, SSI **no está limitado a un núcleo**: FoundationDB distribuye la detección de conflictos entre máquinas, escalando a mucho throughput. Funciona incluso con datos particionados en varias máquinas.

La tasa de aborts afecta mucho al rendimiento. Una transacción de lectura-escritura larga probablemente conflictúe y aborte, así que SSI requiere que las transacciones de lectura-escritura sean **bastante cortas** (las de solo lectura largas no tienen problema). Aun así, SSI es probablemente menos sensible a transacciones lentas que 2PL o la ejecución serial.

### Comparación final

| | Ejecución serial | 2PL | SSI |
| --- | --- | --- | --- |
| Estrategia | Sin concurrencia (un hilo) | Pesimista: locks compartidos/exclusivos | Optimista: detectar y abortar al commit |
| Lectores vs escritores | No aplica | Se bloquean mutuamente | No se bloquean |
| Phantoms | Imposibles | Predicate / index-range locks | Seguimiento de lecturas en índices |
| Escalabilidad | Un núcleo por partición | Limitada por contención | Buena; distribuible |
| Riesgo principal | Una transacción lenta frena todo | Latencias inestables, deadlocks | Muchos aborts con alta contención |
| Ejemplos | VoltDB, Redis, Datomic | MySQL InnoDB y SQL Server serializable | PostgreSQL serializable, FoundationDB, CockroachDB |

### Ideas erróneas frecuentes

- **"Snapshot isolation es serializable."** Evita read skew y algunos lost updates, pero permite write skew y phantoms.
- **"`SELECT ... FOR UPDATE` resuelve cualquier write skew."** No bloquea filas que no existen; los phantoms requieren materializar conflictos o serializable.
- **"MySQL detecta lost updates en repeatable read."** InnoDB no lo hace; PostgreSQL, Oracle y SQL Server sí.
- **"Two-phase locking y two-phase commit son lo mismo."** 2PL es aislamiento en un nodo; 2PC es commit atómico entre nodos.
- **"Serializable siempre es lento."** SSI ofrece serializabilidad con un coste cercano a snapshot isolation si la contención es moderada.

### Resumen

Los niveles débiles dejan pasar lost updates (que se evitan con operaciones atómicas, locks explícitos, detección automática o compare-and-set) y write skew con phantoms (que requieren locks sobre filas existentes, materializar conflictos o aislamiento serializable). La serializabilidad se logra con ejecución serial real (rápida pero limitada a un núcleo y transacciones cortas en stored procedures), two-phase locking (correcta pero con latencias inestables) o serializable snapshot isolation (optimista, con buen rendimiento si hay poca contención).

## Conceptos clave

- **Lost update**: dos ciclos leer-modificar-escribir concurrentes; uno pisa al otro.
- **Atomic write operation**: operación que la base ejecuta sin exponer el ciclo leer-modificar-escribir.
- **Compare-and-set**: actualizar solo si el valor no cambió desde la lectura.
- **Write skew**: dos transacciones leen lo mismo y actualizan objetos distintos, violando un invariante.
- **Phantom**: una escritura de una transacción cambia el resultado de la búsqueda de otra.
- **Materializing conflicts**: crear filas artificiales para tener algo que bloquear.
- **Serializabilidad**: el resultado equivale a alguna ejecución en serie.
- **Stored procedure**: transacción enviada completa a la base para ejecutarse de una vez.
- **Two-phase locking (2PL)**: locks compartidos y exclusivos que se mantienen hasta el final de la transacción.
- **Deadlock**: dos transacciones esperándose mutuamente.
- **Predicate lock / index-range lock**: lock sobre una condición de búsqueda o un rango del índice.
- **Serializable snapshot isolation (SSI)**: snapshot isolation más detección optimista de conflictos de serialización.

## Preguntas de repaso

1. Nombra cuatro formas de evitar lost updates y una limitación de alguna.
   R: Operaciones atómicas de escritura, locks explícitos con SELECT FOR UPDATE, detección automática en snapshot isolation (PostgreSQL, Oracle, SQL Server) y compare-and-set. Limitación: en bases multi-líder o leaderless, locks y compare-and-set no funcionan porque no hay una única copia actualizada.
2. ¿Por qué el caso de los médicos es write skew y no un lost update?
   R: Porque cada transacción modifica un objeto distinto (el registro de Alice y el de Bob); ambas leyeron el mismo conjunto (los médicos de guardia) y tomaron una decisión basada en una premisa que la otra transacción invalidó.
3. ¿Por qué `FOR UPDATE` no evita el doble booking de una sala?
   R: Porque la consulta busca reservas solapadas que no existen; si el SELECT no devuelve filas, no hay nada que bloquear, y otra transacción puede insertar una reserva conflictiva: es un phantom.
4. ¿Qué condiciones hacen viable la ejecución serial en un solo hilo?
   R: Transacciones cortas enviadas como stored procedures, dataset activo en memoria, throughput de escritura que quepa en un núcleo (o datos particionados con transacciones de una sola partición) y pocas transacciones entre particiones.
5. ¿Por qué 2PL tiene latencias tan inestables?
   R: Porque los lectores y escritores se bloquean mutuamente y los locks se mantienen hasta el fin de la transacción; una transacción lenta o que accede a muchos datos hace esperar a muchas otras, y los deadlocks desperdician trabajo.
6. ¿Qué detecta SSI en el momento del commit?
   R: Si la transacción actuó sobre una premisa desactualizada: lecturas que ignoraron escrituras no confirmadas que luego se confirmaron, y escrituras de otras transacciones que afectaron datos que esta transacción leyó. Si es así, la aborta.
7. ¿Cuándo rinde mal un control de concurrencia optimista?
   R: Con alta contención: muchas transacciones acceden a los mismos objetos, una gran proporción aborta y los reintentos añaden carga a un sistema que ya estaba cerca de su capacidad.

## Ejercicio

Con PostgreSQL y dos sesiones `psql`:

1. Crea `doctors(name text, shift_id int, on_call bool)` con Alice y Bob de guardia en el turno 1234.
2. Reproduce el write skew en `REPEATABLE READ`: intercala a mano las dos transacciones (ambas cuentan, ambas actualizan, ambas confirman) y comprueba que quedan 0 médicos de guardia.
3. Repite en `SERIALIZABLE` y anota el error exacto que recibe la segunda transacción (SQLSTATE `40001`).
4. Corrige el caso en `REPEATABLE READ` usando `SELECT ... FOR UPDATE` y comprueba que la segunda sesión se bloquea.
5. Escribe en TypeScript (con `pg`) una función `goOffCall(name)` que use `SERIALIZABLE` y reintente hasta 3 veces con backoff exponencial ante `40001`; lánzala dos veces en paralelo con `Promise.all`.

Criterio de terminado: tienes las salidas de los pasos 2–4, y el paso 5 termina con exactamente un médico de guardia y una de las llamadas informando que no pudo dejar la guardia.

## Explícalo con tus palabras

Explica la diferencia entre el enfoque pesimista (2PL) y el optimista (SSI) usando la imagen de dos personas que quieren usar la misma sala de reuniones.
