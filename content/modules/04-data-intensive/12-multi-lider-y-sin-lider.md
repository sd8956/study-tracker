---
title: Replicación multi-líder y sin líder (quorums)
kind: lesson
hours: 2
sources: Designing Data-Intensive Applications (Kleppmann), cap. 5 (pp. 190–214)
links: Amazon Dynamo, paper original | https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf ; Cassandra, niveles de consistencia | https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html
---

## Objetivo

Entender cuándo tiene sentido aceptar escrituras en varios nodos (multi-líder y leaderless), cómo se detectan y resuelven los conflictos, cómo funcionan los quorums `w + r > n` y sus límites, y cómo se detectan escrituras concurrentes con la relación happens-before y version vectors.

## Estudio

### Más allá del líder único

La replicación con un solo líder tiene una gran debilidad: **todas las escrituras pasan por un nodo**. Si no puedes conectarte al líder (por ejemplo, por una partición de red), no puedes escribir. La extensión natural: permitir que **más de un nodo acepte escrituras**. Cada nodo que procesa una escritura la reenvía a los demás. Esto es la **replicación multi-líder** (*master–master*, *active/active*): cada líder es a la vez seguidor de los otros.

### Casos de uso de multi-líder

Usar varios líderes dentro de un solo datacenter rara vez compensa la complejidad. Pero hay situaciones donde tiene sentido:

#### Operación en varios datacenters

Tienes réplicas en varios datacenters (para tolerar la caída de uno entero o estar cerca de los usuarios). Con un solo líder, este vive en un datacenter y todas las escrituras cruzan internet hasta él. Con multi-líder, hay **un líder en cada datacenter**: dentro de cada uno se usa líder-seguidor normal, y entre datacenters los líderes replican sus cambios entre sí.

```
   datacenter Europa                         datacenter América
 ┌──────────────────────┐                 ┌──────────────────────┐
 │  líder EU ◄──────────┼── replicación ──┼──────────► líder US  │
 │   │      conflictos  │   asíncrona     │  conflictos    │     │
 │   ▼      resueltos   │                 │  resueltos     ▼     │
 │ seguidores EU        │                 │        seguidores US │
 └──────────────────────┘                 └──────────────────────┘
```

| Aspecto | Single-leader multi-DC | Multi-leader multi-DC |
| --- | --- | --- |
| **Rendimiento** | Cada escritura cruza internet hasta el DC del líder: más latencia | Cada escritura se procesa en el DC local y se replica asíncronamente: la latencia entre DC queda oculta |
| **Tolerancia a la caída de un DC** | Hay que promover un seguidor de otro DC (failover) | Cada DC opera independientemente; el que cae se pone al día al volver |
| **Tolerancia a problemas de red** | Muy sensible al enlace entre DC (internet público, menos fiable) | Tolera mejor interrupciones temporales porque replica asíncronamente |

La gran desventaja: **el mismo dato puede modificarse a la vez en dos datacenters**, y esos conflictos hay que resolverlos. Además, multi-líder suele ser una funcionalidad añadida a posteriori en muchas bases, con interacciones sorprendentes con autoincrementos, triggers y restricciones de integridad. Por eso se considera **terreno peligroso** que conviene evitar si se puede. Ejemplos: Tungsten Replicator para MySQL, BDR para PostgreSQL, GoldenGate para Oracle.

#### Clientes con operación offline

Una app que debe seguir funcionando sin conexión: el calendario de tu móvil, portátil y otros dispositivos. Puedes ver y crear eventos sin internet, y se sincronizan al reconectar. Cada dispositivo tiene una **base local que actúa como líder** y la sincronización es replicación multi-líder asíncrona, con lag de horas o días. Desde el punto de vista de la arquitectura, **cada dispositivo es un datacenter** con una red muy poco fiable. CouchDB está diseñado para este modo.

#### Edición colaborativa en tiempo real

Google Docs o Figma permiten que varias personas editen a la vez. Los cambios se aplican al instante en la réplica local (el estado del documento en tu navegador) y se replican asíncronamente al servidor y a los demás. Para evitar conflictos, podrías exigir un **lock** sobre el documento (equivalente a single-leader con transacciones). Para colaborar más rápido, haces la unidad de cambio muy pequeña (una tecla) y sin locks, lo que trae todos los retos de multi-líder, incluyendo resolución de conflictos (con algoritmos como Operational Transformation o CRDTs).

### Manejar conflictos de escritura

El gran problema de multi-líder: los **conflictos de escritura**. Ejemplo: una página de wiki con título "A". El usuario 1 lo cambia a "B" en el líder 1 y el usuario 2 lo cambia a "C" en el líder 2, al mismo tiempo. Ambas escrituras tienen éxito localmente. Al replicarse, aparece el conflicto.

```
usuario 1 ──título = B──► líder 1  ok ─┐
                                       ├── replicación ──► ¡CONFLICTO! ¿B o C?
usuario 2 ──título = C──► líder 2  ok ─┘
```

#### Detección síncrona frente a asíncrona

En una base single-leader, el segundo escritor espera o su transacción se aborta. En multi-líder, ambas escrituras tienen éxito y el conflicto se detecta **después**, quizá cuando ya es tarde para preguntarle al usuario. Podrías detectar conflictos de forma síncrona (esperar a replicar a todos antes de confirmar), pero perderías la ventaja de multi-líder. En ese caso, mejor usar single-leader.

#### Evitar conflictos

La estrategia más simple y la más recomendada: **evitarlos**. Si todas las escrituras de un registro pasan por el mismo líder, no hay conflictos. Por ejemplo, cada usuario tiene un datacenter "hogar" (el más cercano) y todas sus lecturas y escrituras van ahí. Desde el punto de vista de un usuario, es single-leader. Se rompe cuando hay que cambiar el líder de un registro (un DC cae o el usuario se muda).

#### Converger a un estado consistente

Una base single-leader aplica las escrituras en orden secuencial: la última determina el valor final. En multi-líder no hay orden definido. Si cada réplica aplicara las escrituras en el orden en que le llegan, el líder 1 acabaría con "C" y el líder 2 con "B": **inconsistencia permanente**. La base debe resolver el conflicto de forma **convergente**: todas las réplicas deben llegar al mismo valor final. Formas de hacerlo:

- **Dar a cada escritura un ID único** (timestamp, UUID, hash) y quedarse con la de ID mayor. Si el ID es un timestamp, se llama **last write wins (LWW)**. Muy popular, pero **pierde datos**.
- **Dar a cada réplica un ID único** y que gane la escritura de la réplica con ID mayor. También pierde datos.
- **Fusionar los valores**: por ejemplo, ordenarlos y concatenarlos ("B/C").
- **Guardar el conflicto** en una estructura que preserve toda la información y resolverlo después con código de aplicación (quizá preguntando al usuario).

#### Lógica de resolución personalizada

La forma más adecuada depende de la aplicación, así que muchas herramientas permiten escribir código de resolución:

- **Al escribir** (*on write*): en cuanto la base detecta un conflicto en el log de cambios replicados, ejecuta un *conflict handler*. Suele correr en segundo plano sin poder preguntar al usuario (Bucardo lo permite con un fragmento de Perl).
- **Al leer** (*on read*): se guardan todas las versiones en conflicto. La próxima vez que se leen los datos, la aplicación recibe todas las versiones y las resuelve (preguntando al usuario o automáticamente) y escribe el resultado. CouchDB funciona así.

La resolución suele aplicarse a nivel de fila o documento, no a la transacción completa.

#### Resolución automática de conflictos

Hay investigación muy interesante:

- **CRDTs** (*conflict-free replicated datatypes*): estructuras (sets, mapas, listas ordenadas, contadores) que varios usuarios pueden editar a la vez y que se fusionan automáticamente de forma sensata. Riak 2.0 los implementa; Automerge y Yjs los usan para colaboración.
- **Mergeable persistent data structures**: rastrean el historial explícitamente, como Git, y usan un merge a tres vías.
- **Operational transformation**: el algoritmo detrás de Etherpad y Google Docs, diseñado para listas ordenadas de elementos, como los caracteres de un texto.

¿Qué es un conflicto? A veces es obvio (dos escrituras al mismo campo). A veces es sutil: en un sistema de reservas, dos reservas de la misma sala a la misma hora en líderes distintos son un conflicto aunque toquen filas distintas.

### Topologías de replicación multi-líder

Con más de dos líderes, hay varias formas de conectar quién replica a quién:

```
  circular                 estrella                  todos con todos
  L1 ──► L2                     L2                    L1 ◄────► L2
  ▲       │                     ▲│                    ▲ ╲      ╱ ▲
  │       ▼                L3 ◄─L1─► L4               │   ╲  ╱   │
  L4 ◄── L3                     │▼                    │   ╱  ╲   │
                                L5                    L4 ◄────► L3
```

- **Circular** (MySQL por defecto) y **estrella**: una escritura pasa por varios nodos antes de llegar a todos. Cada nodo reenvía las escrituras que recibe. Para evitar bucles infinitos, cada escritura se etiqueta con los IDs de los nodos por los que pasó. Problema: **si un nodo falla, interrumpe el flujo** de replicación entre otros nodos hasta que se reconfigura a mano.
- **All-to-all**: cada líder envía sus escrituras a todos los demás. Más tolerante a fallos, pero con un problema de **orden**: algunos enlaces de red pueden ser más rápidos que otros, así que un mensaje puede "adelantar" a otro. Por ejemplo, un `UPDATE` puede llegar a un líder antes que el `INSERT` de la fila que actualiza. Es un problema de **causalidad**, como el de consistent prefix. Los timestamps no bastan (los relojes no están sincronizados); se usan **version vectors**, que veremos abajo.

Muchos sistemas multi-líder implementan mal la detección de conflictos. Si usas uno, **lee su documentación con atención y pruébalo a fondo**.

### Replicación sin líder (leaderless)

Single-leader y multi-leader se basan en que un cliente envía la escritura a un líder, que decide el orden. Algunos sistemas abandonan la idea de líder y permiten que **cualquier réplica acepte escrituras directamente**. Fue popular en los primeros sistemas replicados, pero cayó en el olvido durante la era de las bases relacionales. Volvió con fuerza cuando Amazon describió **Dynamo** (2007), su sistema interno. Riak, Cassandra y Voldemort son open source inspirados en él: se les llama bases **Dynamo-style**. (Ojo: Amazon DynamoDB, el servicio actual, usa un diseño distinto con líderes por partición.)

En algunas implementaciones el cliente envía la escritura a varias réplicas directamente; en otras, un **nodo coordinador** lo hace por el cliente, pero sin imponer un orden de escrituras.

#### Escribir cuando un nodo está caído

Supón 3 réplicas y una de ellas no disponible. Con líder, quizá harías failover. Sin líder no hace falta: el cliente envía la escritura **a las tres réplicas en paralelo**; dos la aceptan y la tercera no la recibe. Si basta con que dos de tres confirmen, la escritura tiene éxito y se ignora la réplica caída.

Cuando la réplica vuelve y alguien lee de ella, puede obtener **valores viejos**. Por eso, **las lecturas también se envían a varios nodos en paralelo**. El cliente puede recibir respuestas distintas (un valor nuevo y uno viejo) y usa **números de versión** para saber cuál es más reciente.

```
usuario 1234 escribe (versión 7) ──► réplica 1 ✔   réplica 2 ✔   réplica 3 ✘ (caída)

réplica 3 vuelve

usuario 2345 lee de las 3 ──► réplica 1: v7   réplica 2: v7   réplica 3: v6 (vieja)
                              el cliente se queda con v7 y repara la réplica 3 (read repair)
```

#### Read repair y anti-entropy

¿Cómo se pone al día una réplica que estuvo caída? Dos mecanismos en sistemas Dynamo-style:

- **Read repair**: cuando un cliente lee de varios nodos en paralelo y detecta respuestas viejas, **escribe el valor nuevo en la réplica atrasada**. Funciona bien para valores que se leen a menudo.
- **Anti-entropy**: un proceso de fondo compara constantemente las réplicas y copia los datos que faltan. A diferencia del log de replicación con líder, **no copia en orden** y puede tardar bastante. Cassandra usa *Merkle trees* para encontrar diferencias eficientemente (`nodetool repair`).

Sin anti-entropy, los valores que casi nunca se leen pueden faltar en algunas réplicas, reduciendo la durabilidad.

### Quorums para leer y escribir

Si hay **n** réplicas, cada escritura debe ser confirmada por **w** nodos para considerarse exitosa, y cada lectura debe consultar al menos **r** nodos. Mientras **w + r > n**, esperas obtener un valor actualizado al leer, porque **al menos uno de los r nodos que lees debe estar al día**. Lecturas y escrituras que cumplen esto se llaman **quorum reads y writes**.

```
n = 5, w = 3, r = 3   →   w + r = 6 > 5

escritura confirmada por:   [R1] [R2] [R3]  R4   R5
lectura consulta a:          R1   R2  [R3] [R4] [R5]
                                       ▲
                     intersección: al menos un nodo tiene el valor nuevo
```

En Dynamo-style, n, w y r suelen ser configurables. Una elección común: n impar (3 o 5) y `w = r = (n + 1) / 2` redondeado hacia arriba. Puedes ajustar: una carga con pocas escrituras y muchas lecturas puede usar `w = n` y `r = 1`; las lecturas son rápidas, pero **un solo nodo caído impide escribir**.

La condición de quorum permite **tolerar nodos no disponibles**:

- Si `w < n`, puedes escribir aunque falte un nodo.
- Si `r < n`, puedes leer aunque falte un nodo.
- Con `n = 3, w = 2, r = 2` toleras un nodo caído. Con `n = 5, w = 3, r = 3`, dos.

Las lecturas y escrituras siempre se envían a los n nodos en paralelo; w y r solo determinan **cuántas respuestas esperas**. Si hay menos de w o r nodos disponibles, la operación devuelve error. En Cassandra lo eliges por consulta con niveles de consistencia como `ONE`, `QUORUM`, `LOCAL_QUORUM` o `ALL`.

#### Los límites de la consistencia por quorum

Con `w + r > n` *en general* lees el valor más reciente. También puedes elegir `w + r ≤ n`: más probabilidad de leer valores viejos, pero menor latencia y mayor disponibilidad. Pero incluso con `w + r > n` hay casos límite donde lees valores viejos:

- Con un **sloppy quorum** (abajo), las w escrituras pueden caer en nodos distintos de las r lecturas: ya no hay solapamiento garantizado.
- Si **dos escrituras son concurrentes**, no está claro cuál fue primero. Si se elige un ganador por timestamp (LWW), se pueden perder escrituras por desfase de relojes.
- Si una **escritura es concurrente con una lectura**, puede que solo algunas réplicas la reflejen: no está definido si la lectura devuelve el valor viejo o el nuevo.
- Si una escritura **tuvo éxito en algunas réplicas pero falló en otras** (menos de w en total), **no se deshace** en las que tuvo éxito: lecturas posteriores pueden devolver o no ese valor "fallido".
- Si un nodo con el valor nuevo falla y se restaura desde una réplica con el valor viejo, el número de réplicas con el valor nuevo puede caer por debajo de w.
- Incluso funcionando todo bien, hay casos de **mala suerte con el timing** (los verás en la sesión de linealizabilidad).

Conclusión: los quorums no son garantías absolutas. Las bases Dynamo-style están optimizadas para cargas que **toleran consistencia eventual**. Normalmente **no obtienes** read-your-writes, monotonic reads ni consistent prefix. Garantías más fuertes requieren transacciones o consenso.

#### Sloppy quorums y hinted handoff

Una interrupción de red puede aislar a un cliente de muchos nodos. Quizá alcance algunos nodos, pero no los w o r que forman el quorum **para esa clave**. Opciones:

- Devolver error a todas las peticiones que no alcancen quorum.
- Aceptar escrituras igualmente en nodos alcanzables **que no están entre los n "hogares"** de esa clave. Eso es un **sloppy quorum**: se siguen necesitando w y r confirmaciones, pero pueden venir de nodos fuera del conjunto habitual.

Analogía: si te quedas fuera de tu casa, llamas a la puerta del vecino y le pides quedarte en su sofá. Cuando la red se arregla, las escrituras que un nodo aceptó temporalmente se envían a los nodos "hogar": **hinted handoff** (cuando encuentras tus llaves, el vecino te pide amablemente que te vayas de su sofá).

Los sloppy quorums aumentan la **disponibilidad de escritura**, pero entonces **ni siquiera con `w + r > n` puedes asegurar leer el último valor**: no es un quorum en el sentido tradicional, solo una garantía de durabilidad (el dato está en w nodos en alguna parte). Riak los activa por defecto; Cassandra y Voldemort no.

Leaderless también encaja en **varios datacenters**: Cassandra incluye en n réplicas de todos los DC, configuras cuántas por DC, y el cliente suele esperar solo el quorum de su DC local (`LOCAL_QUORUM`), mientras las escrituras a otros DC ocurren de forma asíncrona.

### Detectar escrituras concurrentes

Las bases Dynamo-style permiten que varios clientes escriban la misma clave a la vez, así que hay conflictos incluso con quorums estrictos. Los eventos pueden llegar en distinto orden a distintos nodos:

```
cliente A: set X = A        cliente B: set X = B   (al mismo tiempo)

nodo 1: recibe A                         (B se pierde por un fallo transitorio)   → X = A
nodo 2: recibe A, luego B                                                         → X = B
nodo 3: recibe B, luego A                                                         → X = A
```

Si cada nodo sobrescribe sin más, quedan **permanentemente inconsistentes**. Para converger:

#### Last write wins (descartar escrituras concurrentes)

Cada réplica guarda solo el valor "más reciente" según un timestamp adjunto a cada escritura. Converge, pero **a costa de durabilidad**: si hay varias escrituras concurrentes, todas reportan éxito al cliente, pero solo una sobrevive; las demás se descartan en silencio. LWW incluso puede descartar escrituras que no son concurrentes, por desfase de relojes. Es el único método de resolución que soporta Cassandra. Si perder datos no es aceptable, la única forma segura de usar LWW es que **cada clave se escriba una sola vez** y sea inmutable (por ejemplo, usando un UUID como clave para cada escritura).

#### La relación happens-before y la concurrencia

¿Cuándo son concurrentes dos operaciones?

- Si la operación B **conoce, depende o se construye sobre** A, entonces A **happens-before** B: B es **causalmente dependiente** de A. Ejemplo: un cliente inserta un valor y otro lo incrementa.
- Si ninguna conoce a la otra, son **concurrentes**. Ejemplo: los clientes A y B escriben X sin saber del otro.

Dadas dos operaciones A y B, hay tres posibilidades: A ocurrió antes que B, B antes que A, o son concurrentes. Necesitas un algoritmo que lo distinga: si una ocurrió antes, la posterior **puede sobrescribir** a la anterior; si son concurrentes, **hay un conflicto** que resolver.

Importante: "concurrente" **no significa "al mismo tiempo"**. Por los problemas de relojes, el tiempo físico importa poco. Dos operaciones son concurrentes si **no se conocían**, sin importar cuándo ocurrieron.

#### Capturar happens-before con números de versión

Algoritmo para una réplica (ejemplo del carrito de compras con dos clientes):

1. El servidor mantiene un **número de versión** por clave, que incrementa en cada escritura, y guarda el valor con su versión.
2. Cuando un cliente lee, el servidor devuelve **todos los valores no sobrescritos** y la última versión. **El cliente debe leer antes de escribir**.
3. Cuando un cliente escribe, debe incluir la versión de su lectura anterior y **fusionar** todos los valores que recibió.
4. Cuando el servidor recibe una escritura con cierta versión, sobrescribe todos los valores con esa versión o anterior (porque el cliente ya los fusionó), pero **mantiene los valores con versión mayor** (son concurrentes con esta escritura).

```
cliente 1: añade leche       → servidor v1: [leche]
cliente 2: añade huevos (sin haber leído)
                             → servidor v2: [leche] [huevos]   ← concurrentes: hermanos
cliente 1: leyó v1 [leche], escribe [leche, harina] con v1
                             → servidor v3: [leche, harina] [huevos]  (sobrescribe v1, mantiene v2)
cliente 2: leyó v2 [leche][huevos], fusiona y escribe [leche, huevos, jamón] con v2
                             → servidor v4: [leche, huevos, jamón] [leche, harina]
```

Los valores concurrentes se llaman **siblings** (hermanos). Fusionarlos es trabajo de la aplicación. Para un carrito, la unión es razonable; pero si un usuario **quitó** un producto, la unión lo resucitaría. Por eso los borrados se marcan con **tombstones** en lugar de eliminarse. Los CRDTs de Riak hacen esta fusión automáticamente.

#### Version vectors

Con varias réplicas, un solo número no basta: se usa un número de versión **por réplica y por clave**. Cada réplica incrementa el suyo al procesar una escritura y registra los de las demás réplicas que ha visto. Esa colección es un **version vector**. Se envía al cliente al leer y vuelve a la base al escribir (Riak lo codifica como un *causal context*). Permite distinguir sobrescrituras de escrituras concurrentes. (Los version vectors se parecen a los *vector clocks*, pero no son lo mismo; muchos usan los términos como sinónimos.)

### Comparación de los tres enfoques

| Aspecto | Single-leader | Multi-leader | Leaderless |
| --- | --- | --- | --- |
| Quién acepta escrituras | Un nodo | Un líder por DC/dispositivo | Cualquier réplica |
| Conflictos de escritura | No (orden único) | Sí, hay que resolverlos | Sí, hay que resolverlos |
| Caída de un nodo | Failover si cae el líder | Cada líder sigue | Sin failover; quorums |
| Latencia de escritura multi-DC | Alta (cruza al líder) | Baja (local) | Baja (quorum local) |
| Ejemplos | PostgreSQL, MySQL, MongoDB, Kafka | BDR, Tungsten, CouchDB, apps offline | Cassandra, Riak, Voldemort, ScyllaDB |

### Ideas erróneas frecuentes

- **"Con `w + r > n` siempre leo el último valor."** Sloppy quorums, escrituras concurrentes, fallos parciales y timing pueden devolver valores viejos.
- **"Concurrente significa al mismo tiempo."** Significa que ninguna operación conocía a la otra.
- **"Last write wins no pierde datos."** Descarta en silencio escrituras confirmadas como exitosas.
- **"Multi-líder es la forma de escalar escrituras en un datacenter."** Rara vez compensa; su valor está en multi-DC, offline y colaboración.
- **"DynamoDB es Dynamo."** DynamoDB tiene líderes por partición; Dynamo-style (Cassandra, Riak) es leaderless.

### Resumen

Multi-líder permite escribir en varios datacenters o dispositivos offline a cambio de conflictos, que conviene evitar o resolver de forma convergente (LWW, merges, CRDTs). Leaderless envía escrituras y lecturas a varias réplicas y usa quorums `w + r > n`, read repair y anti-entropy; los sloppy quorums priorizan disponibilidad. Para detectar escrituras concurrentes se usa la relación happens-before, capturada con números de versión y version vectors; los valores concurrentes (siblings) se fusionan en la aplicación.

## Conceptos clave

- **Multi-leader replication**: varios nodos aceptan escrituras y se replican entre sí.
- **Conflict avoidance**: enrutar todas las escrituras de un registro al mismo líder.
- **Convergencia**: todas las réplicas terminan con el mismo valor final.
- **Last write wins (LWW)**: gana la escritura con timestamp mayor; descarta las demás.
- **CRDT**: tipo de dato replicado que se fusiona automáticamente sin conflictos.
- **Leaderless replication**: cualquier réplica acepta escrituras; el cliente o un coordinador las envía a varias.
- **Quorum (w + r > n)**: condición para que lecturas y escrituras se solapen en al menos un nodo.
- **Read repair**: corregir réplicas atrasadas al detectarlas durante una lectura.
- **Anti-entropy**: proceso de fondo que sincroniza réplicas.
- **Sloppy quorum / hinted handoff**: aceptar escrituras en nodos fuera del conjunto habitual y devolverlas después.
- **Happens-before**: relación en la que una operación conoce o depende de otra.
- **Siblings**: valores concurrentes guardados a la vez para fusionarlos después.
- **Version vector**: conjunto de números de versión por réplica para detectar concurrencia.

## Preguntas de repaso

1. Da tres casos donde la replicación multi-líder tiene sentido.
   R: Operación en varios datacenters (escrituras locales con latencia baja y tolerancia a la caída de un DC), clientes que operan offline (cada dispositivo es un líder con su base local) y edición colaborativa en tiempo real (cada navegador aplica cambios localmente y los replica).
2. ¿Por qué evitar conflictos es la estrategia más recomendada en multi-líder y cuándo falla?
   R: Porque muchas implementaciones resuelven mal los conflictos; si todas las escrituras de un registro pasan por el mismo líder (por ejemplo el datacenter hogar del usuario), no hay conflictos. Falla cuando hay que cambiar el líder de un registro, por la caída de un DC o porque el usuario se muda.
3. Con n = 3, w = 2, r = 2, explica por qué una lectura suele ver la última escritura y cuántos nodos caídos se toleran.
   R: Porque w + r = 4 > 3: los 2 nodos que confirmaron la escritura y los 2 que responden a la lectura se solapan en al menos un nodo, que tiene el valor nuevo. Se tolera un nodo caído tanto para leer como para escribir.
4. Nombra tres casos en los que un quorum con w + r > n devuelve un valor viejo.
   R: Con sloppy quorum, porque las escrituras pueden estar en nodos fuera del conjunto leído; con una escritura concurrente con la lectura, que solo algunas réplicas reflejan; y con una escritura que falló globalmente pero no se deshizo en algunas réplicas, o tras restaurar un nodo desde una réplica vieja.
5. ¿Qué significa que dos operaciones sean concurrentes?
   R: Que ninguna conocía a la otra ni dependía de ella, independientemente de cuándo ocurrieron en tiempo físico. Si una conocía a la otra, hay relación happens-before y la posterior puede sobrescribir a la anterior.
6. ¿Por qué last write wins pierde datos y cuándo es seguro usarlo?
   R: Porque entre escrituras concurrentes se queda con la de timestamp mayor y descarta las demás aunque se confirmaron como exitosas; además el desfase de relojes puede descartar escrituras no concurrentes. Es seguro si cada clave se escribe una sola vez y es inmutable.
7. ¿Para qué sirve un version vector?
   R: Para distinguir, con varias réplicas aceptando escrituras, si una escritura sobrescribe a otra (happens-before) o es concurrente con ella; guarda un número de versión por réplica y viaja al cliente al leer y de vuelta al escribir.

## Ejercicio

Implementa en TypeScript un almacén leaderless de juguete con n = 3 réplicas en memoria:

1. `write(key, value, w)` envía a las 3 réplicas (con probabilidad configurable de que una falle) y devuelve éxito si al menos `w` confirman. Cada valor lleva un número de versión.
2. `read(key, r)` consulta 3 réplicas, espera `r` respuestas, devuelve la de versión mayor y aplica **read repair** a las réplicas atrasadas.
3. Ejecuta 10.000 operaciones mezcladas con fallos del 20 % y mide el porcentaje de lecturas viejas para (w, r) = (1, 1), (2, 1), (2, 2) y (3, 1).
4. Extensión: implementa el algoritmo de versiones del carrito de compras con siblings para una sola réplica y comprueba que dos clientes concurrentes no pierden productos.

Criterio de terminado: una tabla con el porcentaje de lecturas viejas por configuración, donde las configuraciones con w + r > n dan 0 % en ausencia de escrituras concurrentes con las lecturas.

## Explícalo con tus palabras

Explica con la analogía del sofá del vecino qué es un sloppy quorum y por qué "no es realmente un quorum".
