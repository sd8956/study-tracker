---
title: "Transacciones: ACID, read committed y snapshot isolation"
kind: lesson
hours: 2
sources: Designing Data-Intensive Applications (Kleppmann), cap. 7 (pp. 243–264)
links: PostgreSQL, aislamiento de transacciones | https://www.postgresql.org/docs/current/transaction-iso.html ; Hermitage, pruebas de niveles de aislamiento | https://github.com/ept/hermitage
---

## Objetivo

Entender qué garantiza realmente una transacción (atomicidad, consistencia, aislamiento y durabilidad), por qué importan las operaciones multiobjeto, y cómo funcionan los niveles de aislamiento débiles más comunes: read committed y snapshot isolation con MVCC.

## Estudio

### Por qué existen las transacciones

En un sistema de datos real, muchas cosas pueden ir mal:

- El software o el hardware de la base de datos puede fallar en cualquier momento, incluso **a mitad de una escritura**.
- La aplicación puede caerse en mitad de una serie de operaciones.
- Un corte de red puede aislar a la aplicación de la base, o a un nodo de otro.
- Varios clientes pueden escribir a la vez y **pisarse los cambios**.
- Un cliente puede leer datos que no tienen sentido porque solo se actualizaron a medias.
- Las race conditions entre clientes pueden causar bugs sorprendentes.

Para que el sistema sea fiable, hay que manejar estos fallos y asegurarse de que no causen la falla del sistema entero. Implementar tolerancia a fallos a mano es muchísimo trabajo. Durante décadas, la herramienta para simplificarlo ha sido la **transacción**: una forma de **agrupar varias lecturas y escrituras en una unidad lógica**. Conceptualmente, todas las operaciones de una transacción se ejecutan como una sola: o la transacción completa tiene éxito (**commit**), o falla (**abort**, **rollback**). Si falla, la aplicación puede reintentar con seguridad.

Las transacciones no son una ley natural: se crearon para **simplificar el modelo de programación** de las aplicaciones. Con ellas, la aplicación puede ignorar ciertos fallos y problemas de concurrencia porque la base se encarga (a esto se le llama **safety guarantees**).

No todas las aplicaciones necesitan transacciones, y a veces conviene debilitar sus garantías o abandonarlas para ganar rendimiento o disponibilidad. Pero para decidirlo necesitas entender exactamente qué ofrecen.

#### El mito de NoSQL

A finales de los 2000, muchas bases NoSQL abandonaron las transacciones o redefinieron la palabra para garantías mucho más débiles. Surgió la creencia de que **las transacciones son la antítesis de la escalabilidad**. Al mismo tiempo, algunos proveedores presentaban las transacciones como requisito imprescindible para "aplicaciones serias". **Ambas posturas son exageraciones**: como toda decisión técnica, las transacciones tienen ventajas y límites.

### El significado de ACID

ACID (Atomicity, Consistency, Isolation, Durability) lo acuñaron Theo Härder y Andreas Reuter en 1983 para establecer una terminología precisa. En la práctica, **la implementación de ACID de una base no equivale a la de otra**; sobre todo el aislamiento es ambiguo. "ACID compliant" se ha vuelto en buena medida un término de marketing. (A los sistemas que no cumplen ACID a veces se les llama **BASE**: *Basically Available, Soft state, Eventual consistency*, una definición aún más vaga; su única definición sensata es "no ACID".)

#### Atomicidad

En programación concurrente, "atómico" significa que otro hilo no puede ver el resultado a medio hacer. **En ACID no se trata de concurrencia** (eso es la I). La atomicidad describe qué pasa si un cliente hace varias escrituras y **ocurre un fallo a mitad**: el proceso se cae, la red se corta, el disco se llena o se viola una restricción. Si las escrituras están agrupadas en una transacción atómica y no puede completarse, **se aborta y la base descarta o deshace todas las escrituras hechas hasta ese momento**.

Sin atomicidad, si algo falla a mitad, es difícil saber qué cambios se aplicaron. Reintentar arriesga duplicar cambios. Con atomicidad, si la transacción se abortó, sabes que **no cambió nada** y puedes reintentar con seguridad. El libro sugiere que *abortability* habría sido un nombre mejor.

#### Consistencia

La palabra está terriblemente sobrecargada: consistencia de réplicas y consistencia eventual (sesión 11), *consistent hashing* (sesión 14), la C del teorema CAP (que significa linealizabilidad, sesión 19) y la C de ACID.

En ACID, consistencia significa que existen **ciertas afirmaciones sobre tus datos (invariantes) que siempre deben ser ciertas**. Por ejemplo, en un sistema contable, los créditos y débitos de todas las cuentas deben cuadrar. Si una transacción empieza con una base válida y sus escrituras preservan la validez, los invariantes se cumplen.

Pero ojo: esto **depende de la aplicación**. Es responsabilidad de la aplicación definir transacciones correctas. La base puede comprobar algunos invariantes (foreign keys, unicidad, `CHECK`), pero en general la aplicación define qué datos son válidos. Atomicidad, aislamiento y durabilidad son propiedades de la base; la consistencia es una propiedad de la aplicación que se apoya en las otras tres. Se dice que la C se añadió para que el acrónimo sonara bien.

#### Aislamiento

Si varios clientes acceden a los mismos registros a la vez, aparecen **race conditions**. Ejemplo clásico: dos clientes incrementan un contador a la vez. Cada uno lee 42, suma 1 y escribe 43. El contador debería valer 44.

```
usuario 1:  lee 42 ──── 42 + 1 = 43 ──── escribe 43
usuario 2:        lee 42 ──── 42 + 1 = 43 ──── escribe 43
resultado: 43   (se perdió un incremento)
```

**Aislamiento** significa que las transacciones concurrentes no interfieren entre sí. La formalización clásica es la **serializabilidad**: cada transacción puede actuar como si fuera la única ejecutándose; el resultado final es el mismo que si se hubieran ejecutado **en serie**, una tras otra, aunque en realidad se ejecutaran a la vez.

En la práctica, el aislamiento serializable casi no se usa por su coste de rendimiento. Oracle 11g ni siquiera lo implementa: su nivel llamado "serializable" es en realidad snapshot isolation, una garantía más débil.

#### Durabilidad

La promesa de que, una vez confirmada una transacción, **los datos escritos no se olvidarán**, aunque haya un fallo de hardware o la base se caiga. En un solo nodo, significa que los datos están escritos en almacenamiento no volátil (disco duro, SSD), normalmente con un WAL. En una base replicada, puede significar que los datos se copiaron a cierto número de nodos. La base debe esperar a que esas escrituras o replicaciones terminen antes de confirmar.

**La durabilidad perfecta no existe**: si todos tus discos y backups se destruyen a la vez, no hay nada que hacer. Detalles del mundo real:

- Si escribes a disco y la máquina muere, los datos no se pierden pero no son accesibles hasta que arreglas la máquina o pasas el disco a otra. Los sistemas replicados siguen disponibles.
- Un fallo correlacionado (un corte de luz, un bug que se activa con cierta entrada) puede tumbar todas las réplicas a la vez; los datos solo en memoria se pierden. Para bases en memoria importa escribir a disco.
- Con replicación asíncrona, las escrituras recientes pueden perderse si el líder muere.
- Los SSDs a veces violan sus propias garantías: el `fsync` no siempre funciona como se espera, y el firmware puede tener bugs.
- Las interacciones entre el motor y el sistema de archivos pueden causar bugs difíciles de rastrear, que corrompen archivos tras un crash.
- Los datos en disco pueden **corromperse lentamente** sin detección; si las réplicas y backups se corrompen, necesitas restaurar de un backup histórico.
- Estudios de SSDs muestran que entre el 30 % y el 80 % de los discos desarrollan al menos un bloque defectuoso en sus primeros cuatro años de uso.

En la práctica, ninguna técnica da garantías absolutas: se combinan escribir a disco, replicar a máquinas remotas y hacer backups.

### Operaciones de un objeto y multiobjeto

Atomicidad y aislamiento describen lo que hace la base si un cliente hace varias escrituras en la misma transacción. Ejemplo: una app de email que muestra el número de no leídos. Por rendimiento, guardas un contador separado en vez de contar con `SELECT COUNT(*)`.

```
usuario 1:  INSERT INTO emails (...)  ──────────────  UPDATE mailboxes SET unread = unread + 1
usuario 2:                          SELECT emails → ve el email nuevo
                                    SELECT unread → 0   (¡incoherente!)
```

El usuario 2 ve el email nuevo en la lista pero el contador en cero: una **anomalía de aislamiento**. El aislamiento habría impedido que viera la inserción sin el contador, o ambos o ninguno. Y la atomicidad asegura que si el incremento del contador falla, la inserción del email se deshace.

Las **transacciones multiobjeto** necesitan saber qué lecturas y escrituras pertenecen a la misma transacción. En bases relacionales se hace por la conexión TCP: todo entre `BEGIN TRANSACTION` y `COMMIT` en una conexión es una transacción. (No es ideal: si la conexión se corta después de enviar el commit pero antes de recibir el ack, el cliente no sabe si se confirmó.) Muchas bases no relacionales no tienen forma de agrupar operaciones: una API multi-put puede actualizar varias claves en una operación, pero **sin semántica transaccional**: algunas claves pueden actualizarse y otras no.

#### Escrituras de un solo objeto

Incluso escribiendo un solo objeto (un documento JSON de 20 KB), la atomicidad y el aislamiento importan: ¿qué pasa si la red se corta tras enviar 10 KB? ¿Si la luz se va a mitad de sobrescribir el valor en disco? ¿Si otro cliente lee mientras se escribe? Los motores casi siempre buscan atomicidad y aislamiento a nivel de un objeto en un nodo: atomicidad con un log para recuperarse de crashes, aislamiento con un lock por objeto.

Algunas bases ofrecen operaciones atómicas más complejas: una operación de **incremento** que evita el ciclo leer-modificar-escribir, o **compare-and-set** (escribir solo si el valor no cambió desde que lo leíste). Son útiles, pero **no son transacciones** en el sentido habitual: una transacción agrupa operaciones sobre **varios objetos**.

#### La necesidad de transacciones multiobjeto

Muchas bases distribuidas abandonaron las transacciones multiobjeto porque son difíciles de implementar entre particiones y estorban en escenarios de alta disponibilidad. Pero muchas aplicaciones las necesitan:

- En el modelo relacional, una fila suele tener foreign keys a otra tabla; al insertar registros que se referencian entre sí, las referencias deben quedar correctas.
- En bases de documentos sin JOINs, la desnormalización obliga a actualizar varios documentos a la vez.
- Los **índices secundarios** deben actualizarse cada vez que cambia un valor: el registro y el índice son objetos distintos desde el punto de vista de la transacción.

Sin transacciones, todo esto puede hacerse, pero el manejo de errores es mucho más complejo y la falta de aislamiento causa problemas de concurrencia.

#### Manejar errores y aborts

La gracia de las transacciones es poder **abortar y reintentar con seguridad**. Las bases ACID siguen la filosofía de "si corremos el riesgo de violar atomicidad, aislamiento o durabilidad, mejor abandonar la transacción por completo". No todos los sistemas son así: la replicación leaderless funciona en modo "best effort" y la aplicación debe recuperarse.

Muchos ORMs (como ActiveRecord de Rails o Django) **no reintentan** las transacciones abortadas: el error sube como excepción y se pierde lo que el usuario había escrito. Reintentar tampoco es perfecto:

- Si la transacción tuvo éxito pero la red falló al enviar el ack, reintentar **la ejecuta dos veces** (necesitas deduplicación).
- Si el error es por sobrecarga, reintentar lo empeora; limita reintentos y usa **exponential backoff**.
- Solo vale la pena reintentar errores **transitorios** (deadlock, violación de aislamiento, red), no los permanentes (violación de una restricción).
- Si la transacción tiene **efectos fuera de la base** (enviar un email), esos efectos pueden ocurrir aunque se aborte. Para coordinar varios sistemas existe el two-phase commit (sesión 21).
- Si el cliente muere mientras reintenta, se pierden los datos que intentaba escribir.

### Niveles de aislamiento débiles

Si dos transacciones no tocan los mismos datos, pueden ejecutarse en paralelo sin problema. Los problemas de concurrencia solo aparecen cuando una lee datos que otra modifica a la vez, o ambas modifican los mismos datos. Los bugs de concurrencia son difíciles de encontrar con tests (aparecen solo con mala suerte de timing) y de razonar. Por eso las bases intentan ocultarlos con aislamiento.

El aislamiento **serializable** da la garantía de que todo es como si se ejecutara en serie. Pero tiene coste, así que muchas bases usan niveles **más débiles**, que protegen contra algunos problemas pero no todos. Estos niveles causan **bugs reales**: pérdidas de dinero, auditorías financieras fallidas y corrupción de datos. Incluso bases "ACID" usan aislamiento débil por defecto. En lugar de confiar a ciegas, necesitas entender qué problemas existen.

### Read committed

El nivel más básico de aislamiento transaccional. Da dos garantías:

1. **No dirty reads**: al leer, solo ves datos que ya fueron confirmados (committed).
2. **No dirty writes**: al escribir, solo sobrescribes datos que ya fueron confirmados.

#### Sin dirty reads

Una **dirty read** es leer escrituras de una transacción que **todavía no hizo commit**. Con read committed, las escrituras de una transacción solo se vuelven visibles para otras cuando se confirma, y entonces **todas a la vez**.

```
usuario 1:  BEGIN; SET x = 3; ─────────────────── SET y = 3; COMMIT;
usuario 2:          GET x → 2 (valor viejo, ✔)                     GET x → 3
                    (con dirty reads vería 3 antes del commit)
```

Por qué evitarlas:

- Si una transacción actualiza varios objetos, una dirty read haría que otra transacción vea **algunas actualizaciones pero no otras** (el email sin contador).
- Si la transacción se **aborta**, sus escrituras se deshacen; con dirty reads, otra transacción habría visto datos que **nunca fueron confirmados** y que luego desaparecen.

#### Sin dirty writes

Si dos transacciones actualizan el mismo objeto a la vez, normalmente la última sobrescribe a la primera. Pero ¿qué pasa si la primera **no ha hecho commit** todavía? Sobrescribir un valor no confirmado es una **dirty write**. Read committed lo evita, normalmente **retrasando la segunda escritura** hasta que la primera transacción confirme o aborte.

Ejemplo: una web de coches usados donde Alice y Bob compran el mismo coche. La compra requiere dos escrituras: actualizar el anuncio con el comprador y enviar la factura al comprador.

```
Alice:  UPDATE listings SET buyer='Alice' ─────────────────── UPDATE invoices SET recipient='Alice'
Bob:                 UPDATE listings SET buyer='Bob' ── UPDATE invoices SET recipient='Bob'
resultado con dirty writes: el coche se vende a Bob, pero la factura va a Alice
```

Read committed **no** evita el problema del contador perdido (dos incrementos concurrentes): la segunda escritura llega después de que la primera confirmó, así que no es una dirty write, pero el resultado sigue siendo incorrecto. Eso se trata en la próxima sesión.

#### Implementación

Read committed es el **nivel por defecto** en Oracle 11g, PostgreSQL, SQL Server 2012, MemSQL y muchas otras.

- **Dirty writes**: se evitan con **row-level locks**. Para modificar un objeto, la transacción adquiere un lock sobre él y lo mantiene hasta el commit o abort. Otra transacción que quiera escribirlo debe esperar.
- **Dirty reads**: se podrían evitar con el mismo lock para leer, pero funciona mal: una transacción de escritura larga bloquearía a muchísimas de solo lectura. En cambio, la mayoría de bases **recuerdan el valor viejo confirmado y el valor nuevo** de la transacción en curso. Mientras no haya commit, las demás leen el valor viejo; tras el commit, el nuevo.

### Snapshot isolation y repeatable read

Read committed parece suficiente, pero hay anomalías que permite. Ejemplo: Alice tiene 1.000 € repartidos en dos cuentas de 500 €. Una transacción transfiere 100 € de una a otra. Si Alice mira sus saldos justo mientras se procesa:

```
transferencia:     UPDATE cuenta1 SET saldo = saldo + 100 ─── UPDATE cuenta2 SET saldo = saldo - 100; COMMIT
Alice (lecturas):  SELECT cuenta1 → 500                                   SELECT cuenta2 → 400
                   (leyó cuenta1 antes de la transferencia y cuenta2 después)
total visto: 900 €   ← ¡desaparecieron 100 €!
```

Esta anomalía se llama **nonrepeatable read** o **read skew**. Con read committed es aceptable (cada lectura vio valores confirmados), y si Alice recarga la página verá un estado consistente. Pero hay situaciones donde esta inconsistencia temporal **no se tolera**:

- **Backups**: un backup copia toda la base y puede tardar horas, mientras siguen llegando escrituras. Si partes del backup tienen datos viejos y otras nuevos, al restaurar la inconsistencia (como el dinero desaparecido) se vuelve **permanente**.
- **Consultas analíticas y verificaciones de integridad**: una consulta que recorre gran parte de la base devolvería resultados sin sentido si observa partes en momentos distintos.

La solución más común es **snapshot isolation**: cada transacción lee de un **snapshot consistente** de la base, es decir, ve todos los datos que estaban confirmados **al inicio de la transacción**. Aunque otra transacción cambie los datos después, cada transacción solo ve los datos viejos de ese momento.

Es una bendición para consultas largas de solo lectura como backups y analítica: es mucho más fácil razonar sobre una consulta si los datos no cambian mientras se ejecuta. Lo soportan PostgreSQL, MySQL con InnoDB, Oracle, SQL Server y otros.

#### Implementación: MVCC

Como read committed, usa **write locks** para evitar dirty writes: una transacción que escribe bloquea a otra que quiera escribir el mismo objeto. Pero **las lecturas no requieren locks**. Principio clave: **los lectores nunca bloquean a los escritores y los escritores nunca bloquean a los lectores**. Así, una consulta larga puede leer un snapshot consistente mientras se procesan escrituras normalmente.

Para lograrlo, la base mantiene **varias versiones confirmadas** de cada objeto, porque varias transacciones en curso pueden necesitar ver el estado en momentos distintos. Esta técnica se llama **multi-version concurrency control (MVCC)**.

Si solo necesitaras read committed, bastaría con dos versiones (la confirmada y la sobrescrita no confirmada). Las bases que soportan snapshot isolation suelen usar MVCC también para read committed: con read committed usan un **snapshot por sentencia**; con snapshot isolation, **el mismo snapshot para toda la transacción**.

En PostgreSQL, cada transacción recibe un **ID de transacción** (`txid`) creciente. Cada fila tiene dos campos ocultos:

- `created_by` (`xmin`): el ID de la transacción que insertó esa versión.
- `deleted_by` (`xmax`): inicialmente vacío; si una transacción borra la fila, se marca con su ID (la fila no se elimina físicamente hasta que el **garbage collector**, `VACUUM`, comprueba que ninguna transacción puede verla).

Un `UPDATE` se traduce internamente en un **borrado más una inserción**:

```
cuenta 2, saldo inicial 500 (creada por txid 3)

txid 13 transfiere 100 de cuenta 2 a cuenta 1:
  fila vieja: { id: 2, saldo: 500, created_by: 3,  deleted_by: 13 }
  fila nueva: { id: 2, saldo: 400, created_by: 13, deleted_by: — }

txid 12 (Alice, empezó antes que 13) lee cuenta 2:
  ve la fila con created_by 3 (txid 3 < 12, confirmada) y deleted_by 13 (13 no es visible para 12)
  → ve saldo 500 ✔ (consistente con su snapshot)
```

#### Reglas de visibilidad

Al empezar una transacción, la base anota qué transacciones estaban en curso. Un objeto es visible si:

1. La transacción que lo creó **ya había confirmado** cuando empezó la transacción lectora.
2. El objeto no está marcado para borrado, o la transacción que lo borró **aún no había confirmado** cuando empezó la lectora.

En concreto, se ignoran: escrituras de transacciones que estaban en curso al empezar (aunque confirmen después), escrituras de transacciones abortadas, y escrituras de transacciones con un ID posterior. Una transacción de larga duración puede seguir viendo durante mucho tiempo filas que, para otras, ya fueron sobrescritas.

#### Índices y snapshot isolation

Con múltiples versiones, ¿cómo funcionan los índices? Una opción es que el índice apunte a todas las versiones y la consulta filtre las no visibles; el GC elimina entradas viejas. PostgreSQL tiene optimizaciones para evitar actualizar índices si varias versiones caben en la misma página (*HOT updates*). CouchDB, Datomic y LMDB usan **B-trees append-only / copy-on-write**: no sobrescriben páginas, sino que crean copias de las páginas modificadas y de sus padres hasta la raíz. Cada raíz es un snapshot consistente de la base en un momento.

#### Repeatable read y la confusión de nombres

Snapshot isolation es muy útil, pero muchas bases la llaman de otra forma. En Oracle se llama **serializable**; en PostgreSQL y MySQL, **repeatable read**. La razón: el estándar SQL no tiene el concepto de snapshot isolation (se basa en la definición de 1975 de System R). Define repeatable read, que se parece a snapshot isolation. Por eso PostgreSQL y MySQL llaman repeatable read a su snapshot isolation: cumple el estándar. El problema es que el estándar es ambiguo, y lo que distintas bases llaman repeatable read da garantías muy distintas. IBM DB2 usa "repeatable read" para referirse a serializabilidad. **Nadie sabe realmente qué significa repeatable read**.

| Nivel | Dirty reads | Dirty writes | Read skew | Dónde |
| --- | --- | --- | --- | --- |
| Read uncommitted | Posibles | Evitadas | Posible | Raramente usado |
| Read committed | Evitadas | Evitadas | Posible | Default en PostgreSQL, Oracle, SQL Server |
| Snapshot isolation ("repeatable read") | Evitadas | Evitadas | Evitado | PostgreSQL RR, MySQL InnoDB RR (default), Oracle "serializable" |

### Ideas erróneas frecuentes

- **"ACID es un estándar preciso."** Cada base lo implementa distinto; el aislamiento es especialmente ambiguo.
- **"La atomicidad de ACID trata de concurrencia."** Trata de deshacer escrituras parciales ante fallos; la concurrencia es la I.
- **"La base garantiza la consistencia."** La consistencia depende de que la aplicación escriba transacciones correctas.
- **"Repeatable read significa lo mismo en todas partes."** En PostgreSQL/MySQL es snapshot isolation; en DB2, serializabilidad.
- **"Snapshot isolation bloquea a los escritores mientras leo."** Con MVCC los lectores nunca bloquean a los escritores ni viceversa.

### Resumen

Las transacciones simplifican el manejo de fallos y concurrencia agrupando operaciones en una unidad que confirma o aborta. ACID combina atomicidad (abortability), consistencia (invariantes de la aplicación), aislamiento (no interferencia) y durabilidad (no olvidar lo confirmado). Read committed evita dirty reads y dirty writes con locks de fila y versiones viejas; snapshot isolation evita además read skew dando a cada transacción un snapshot consistente mediante MVCC, con reglas de visibilidad basadas en IDs de transacción.

## Conceptos clave

- **Transacción**: grupo de lecturas y escrituras que se confirma o aborta como unidad.
- **Atomicidad**: si la transacción falla, se deshacen todas sus escrituras.
- **Consistencia (ACID)**: los invariantes de la aplicación se mantienen.
- **Aislamiento**: transacciones concurrentes no interfieren; idealmente, serializabilidad.
- **Durabilidad**: lo confirmado no se pierde.
- **Dirty read**: leer datos de una transacción no confirmada.
- **Dirty write**: sobrescribir datos de una transacción no confirmada.
- **Read committed**: nivel que evita dirty reads y dirty writes.
- **Read skew (nonrepeatable read)**: ver partes de la base en momentos distintos dentro de una transacción.
- **Snapshot isolation**: cada transacción lee de un snapshot consistente tomado al empezar.
- **MVCC**: mantener varias versiones de cada objeto para servir snapshots.
- **Reglas de visibilidad**: criterios con IDs de transacción para decidir qué versión ve cada transacción.

## Preguntas de repaso

1. ¿Por qué el libro dice que "abortability" sería mejor nombre que atomicidad?
   R: Porque en ACID la atomicidad no trata de concurrencia, sino de poder abortar una transacción ante un fallo y descartar todas sus escrituras parciales, de modo que la aplicación sepa que nada cambió y pueda reintentar con seguridad.
2. ¿Por qué la C de ACID es distinta de las otras tres letras?
   R: Porque los invariantes los define la aplicación y es la aplicación la que debe escribir transacciones que los preserven; la base solo puede comprobar algunos (foreign keys, unicidad). Atomicidad, aislamiento y durabilidad son propiedades que proporciona la base.
3. Da dos razones por las que reintentar una transacción abortada no siempre es seguro.
   R: Si la transacción sí se confirmó pero se perdió el ack, reintentar la ejecuta dos veces sin deduplicación; y si tiene efectos externos como enviar un email, estos pueden repetirse. Además, si el error es por sobrecarga, reintentar sin backoff lo empeora.
4. ¿Cómo implementan las bases read committed sin bloquear las lecturas?
   R: Usan locks de fila solo para escrituras (evitando dirty writes) y, para evitar dirty reads, recuerdan el valor viejo confirmado: mientras una transacción no confirma, las demás leen el valor viejo; tras el commit pasan a leer el nuevo.
5. Explica la anomalía de read skew con el ejemplo de las cuentas bancarias y por qué importa en un backup.
   R: Alice lee una cuenta antes de una transferencia y la otra después, y ve 100 € menos en total. En una consulta interactiva desaparece al recargar, pero un backup que copia partes en momentos distintos haría permanente esa inconsistencia al restaurarlo.
6. ¿Cómo decide PostgreSQL si una versión de fila es visible para una transacción?
   R: La versión es visible si la transacción que la creó ya había confirmado al empezar la lectora y si no está borrada o la transacción que la borró no había confirmado al empezar la lectora. Se ignoran escrituras de transacciones en curso al inicio, abortadas o con ID posterior.
7. ¿Por qué "repeatable read" es un término confuso?
   R: Porque el estándar SQL no define snapshot isolation y su definición de repeatable read es ambigua; PostgreSQL y MySQL llaman repeatable read a su snapshot isolation, Oracle la llama serializable, y DB2 usa repeatable read para serializabilidad.

## Ejercicio

Con PostgreSQL (Docker sirve) y dos sesiones `psql` abiertas a la vez:

1. Crea `accounts(id int primary key, balance int)` con dos cuentas de 500.
2. En **read committed**: en la sesión A haz `BEGIN; SELECT balance FROM accounts WHERE id=1;`. En la sesión B ejecuta y confirma una transferencia de 100 de la cuenta 1 a la 2. En A lee la cuenta 2 y suma. Anota el total.
3. Repite con `BEGIN ISOLATION LEVEL REPEATABLE READ;` en A. Anota el total.
4. Comprueba que no hay dirty reads: en B haz un `UPDATE` sin commit y lee desde A.
5. Observa las versiones: `SELECT xmin, xmax, * FROM accounts;` antes y después de una actualización, con una transacción abierta en otra sesión.

Criterio de terminado: tienes las salidas de los cinco pasos, el total es 900 en read committed y 1.000 en repeatable read, y explicas `xmin`/`xmax` en dos frases.

## Explícalo con tus palabras

Explica a alguien que nunca usó bases de datos por qué un backup puede "perder dinero" si no usa snapshot isolation.
