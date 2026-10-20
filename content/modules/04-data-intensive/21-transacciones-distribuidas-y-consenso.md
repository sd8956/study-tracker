---
title: Transacciones distribuidas y consenso
kind: lesson
hours: 2
sources: Designing Data-Intensive Applications (Kleppmann), cap. 9 (pp. 374–399)
links: Raft, visualización interactiva | https://raft.github.io/ ; Apache ZooKeeper, visión general | https://zookeeper.apache.org/doc/current/zookeeperOver.html
---

## Objetivo

Entender el problema del consenso y por qué es tan difícil, cómo funciona el two-phase commit (2PC) para el commit atómico distribuido y por qué se bloquea, qué propiedades exige un algoritmo de consenso tolerante a fallos (Raft, Paxos, Zab), y para qué se usan servicios de coordinación como ZooKeeper y etcd.

## Estudio

### El problema del consenso

El consenso es uno de los problemas más importantes y fundamentales de la computación distribuida. En apariencia es simple: **lograr que varios nodos se pongan de acuerdo en algo**. Muchos intentos fallidos de sistemas se basaron en la creencia de que es fácil. Situaciones donde los nodos deben acordar:

- **Elección de líder**: en replicación single-leader, todos los nodos deben acordar quién es el líder. Si algunos nodos no pueden comunicarse por un fallo de red, puede haber disputa. Un desacuerdo lleva a **split brain**: dos nodos que creen ser líderes aceptan escrituras y los datos divergen.
- **Commit atómico**: en una transacción que abarca varios nodos o particiones, puede fallar en unos y tener éxito en otros. Para mantener la atomicidad, todos deben acordar el resultado: **todos confirman o todos abortan**. Este caso concreto se llama **atomic commit**.

#### La imposibilidad FLP

Existe un resultado famoso, **FLP** (Fischer, Lynch y Paterson), que demuestra que **no existe un algoritmo que siempre alcance el consenso si existe el riesgo de que un nodo se caiga**. Pero se demuestra en el **modelo asíncrono** (sesión 18): un modelo muy restrictivo que asume un algoritmo determinista **sin relojes ni timeouts**. Si el algoritmo puede usar **timeouts** o alguna otra forma de identificar nodos sospechosos de haberse caído (aunque la sospecha sea a veces errónea), el consenso se vuelve **resoluble**. Incluso con números aleatorios basta. Así que, aunque FLP es teóricamente importante, en la práctica los sistemas distribuidos **sí logran consenso**.

### Commit atómico y two-phase commit (2PC)

#### De un nodo a varios

En un solo nodo, la atomicidad la implementa el motor de almacenamiento. Al confirmar, la base escribe los datos de la transacción de forma durable (en el WAL) y luego añade un **registro de commit** al log en disco. Si se cae a mitad, al reiniciar: si el registro de commit llegó a disco, la transacción está confirmada; si no, se deshace. El momento decisivo es cuando **el disco termina de escribir el registro de commit**. Es un único dispositivo (el controlador de un disco, en un nodo) el que hace atómico el commit.

¿Y si participan varios nodos? Por ejemplo, una transacción multiobjeto en una base particionada, o un índice secundario particionado por término (sesión 14). No basta con enviar una petición de commit a todos y que cada uno confirme por su cuenta. Podría pasar que el commit tenga éxito en unos nodos y falle en otros:

- Algunos nodos detectan una violación de restricción o un conflicto y deben abortar, mientras otros confirman.
- Algunas peticiones de commit se pierden en la red y acaban abortando por timeout, mientras otras llegan.
- Algunos nodos se caen antes de escribir el registro de commit y deshacen al recuperarse, mientras otros confirman.

Si unos nodos confirman y otros abortan, quedan inconsistentes. Y una vez confirmada en un nodo, una transacción **no puede retirarse**: los datos confirmados se vuelven visibles y otros clientes pueden empezar a depender de ellos (es la base de read committed). Por eso un nodo solo debe confirmar cuando está **seguro de que todos los demás también lo harán**. (Los efectos de una transacción confirmada pueden deshacerse después con una **transacción compensatoria**, pero eso es otra transacción y su corrección es problema de la aplicación.)

#### Cómo funciona 2PC

**Two-phase commit** es un algoritmo para lograr el commit atómico entre varios nodos: que **todos confirmen o todos aborten**. Es un algoritmo clásico. Se usa internamente en algunas bases y está disponible para aplicaciones en forma de **transacciones XA** (soportadas por la Java Transaction API) o vía WS-AtomicTransaction para servicios web SOAP. (No lo confundas con two-phase *locking*.)

2PC usa un componente nuevo: un **coordinador** (o *transaction manager*). A menudo es una biblioteca dentro del mismo proceso de la aplicación que pide la transacción (por ejemplo, embebido en un servidor de aplicaciones Java EE), aunque puede ser un proceso o servicio aparte (Narayana, JOTM, BTM, MSDTC).

```
                 fase 1: prepare                     fase 2: commit
coordinador ──── "¿puedes confirmar?" ────►  BD 1: "sí" ───┐
            ──── "¿puedes confirmar?" ────►  BD 2: "sí" ───┤
                                                           ▼
                        el coordinador decide COMMIT y lo escribe en SU log (commit point)
coordinador ──── "commit" ──────────────────► BD 1: ok
            ──── "commit" ──────────────────► BD 2: ok   (reintenta para siempre hasta que llegue)

si alguna dice "no" (o no responde a tiempo) → el coordinador envía "abort" a todas
```

Una transacción 2PC empieza con lecturas y escrituras normales en varios nodos de base de datos, llamados **participantes**. Cuando la aplicación quiere confirmar, el coordinador inicia la **fase 1**: envía una petición **prepare** a cada participante preguntando si puede confirmar. Luego:

- Si **todos** responden "sí", el coordinador envía **commit** en la **fase 2** y el commit ocurre.
- Si **alguno** responde "no", el coordinador envía **abort** a todos.

Es como una ceremonia de boda: el oficiante pregunta a cada uno "¿aceptas?", espera ambos "sí", y entonces los declara casados. Si alguno dice "no", la ceremonia se cancela.

#### Un sistema de promesas

¿Por qué funciona 2PC si un commit de una fase no lo hace? Desglosemos el proceso:

1. Cuando la aplicación quiere iniciar una transacción distribuida, pide al coordinador un **ID de transacción** globalmente único.
2. La aplicación inicia una transacción de un nodo en cada participante y le adjunta el ID global. Todas las lecturas y escrituras se hacen en esas transacciones. Si algo va mal en esta etapa, el coordinador o cualquier participante puede abortar.
3. Cuando la aplicación está lista para confirmar, el coordinador envía **prepare** a todos los participantes, etiquetado con el ID global. Si alguna petición falla o expira, envía abort a todos.
4. Cuando un participante recibe prepare, se asegura de que **puede confirmar en cualquier circunstancia**: escribe todos los datos de la transacción a disco (un crash, un fallo eléctrico o falta de espacio no son excusa para negarse después) y comprueba conflictos y restricciones. Al responder "sí", **renuncia al derecho de abortar** la transacción, pero aún no confirma.
5. Cuando el coordinador recibe todas las respuestas, toma la **decisión definitiva** de confirmar o abortar (confirma solo si todos votaron "sí"). Debe escribir esa decisión en **su log de transacciones en disco**, para saber qué decidió si se cae después. Este es el **commit point**.
6. Una vez escrita la decisión, el coordinador envía commit o abort a todos. Si la petición falla o expira, **reintenta para siempre** hasta que tenga éxito. No hay vuelta atrás: si la decisión fue confirmar, se debe cumplir, sin importar cuántos reintentos. Si un participante se cayó, la transacción se confirmará cuando se recupere: como votó "sí", no puede negarse.

Así, el protocolo tiene **dos puntos de no retorno**: cuando un participante vota "sí", promete que podrá confirmar más tarde; y cuando el coordinador decide, esa decisión es irrevocable. Estas promesas garantizan la atomicidad. (Un commit de un nodo junta ambos eventos: escribir el registro de commit en el log.)

#### Fallo del coordinador

Si un participante o la red fallan durante 2PC: si una petición prepare falla, el coordinador aborta; si fallan las peticiones de commit o abort, el coordinador reintenta indefinidamente.

Lo grave es si **falla el coordinador**. Si cae antes de enviar los prepare, el participante puede abortar con seguridad. Pero una vez que el participante recibió prepare y votó "sí", **ya no puede abortar unilateralmente**: debe esperar a saber del coordinador si confirmar o abortar. Si el coordinador se cae o la red falla en ese punto, el participante solo puede **esperar**. La transacción del participante queda **en duda** (*in doubt* o *uncertain*).

```
coordinador ── prepare ──► BD1: "sí"     BD2: "sí"
coordinador escribe COMMIT en su log ── envía commit a BD1 ── ✘ SE CAE antes de enviar a BD2
BD1: confirma
BD2: "voté sí… ¿confirmo o aborto?"  → no puede decidir solo: ESPERA (in doubt), con locks retenidos
```

¿Por qué no puede BD2 decidir por su cuenta con un timeout? Si abortara, sería inconsistente con BD1, que confirmó. Si confirmara, sería inconsistente si otro participante votó "no" y el coordinador decidió abortar. Sin noticias del coordinador, el participante **no tiene forma de saber** la decisión. En principio podría preguntar a los demás participantes, pero eso no forma parte de 2PC.

La única forma de que 2PC termine es **esperar a que el coordinador se recupere**. Por eso el coordinador debe escribir su decisión en su log **antes** de enviar commit o abort: al recuperarse, lee el log para determinar el estado de las transacciones en duda. Las que no tengan registro de commit en su log se abortan. El commit point de 2PC se reduce, en el fondo, a un commit atómico **de un nodo** en el coordinador.

#### Three-phase commit

2PC se llama un protocolo de commit atómico **bloqueante** porque puede quedarse atascado esperando a que el coordinador se recupere. Existe una alternativa, **three-phase commit (3PC)**, que es no bloqueante, pero asume una red con **retraso acotado** y nodos con tiempos de respuesta acotados. En sistemas reales con retrasos de red no acotados y pausas de proceso, 3PC **no garantiza la atomicidad**. Un commit atómico no bloqueante requiere un **detector de fallos perfecto** (un mecanismo fiable para saber si un nodo se cayó), y en una red con retrasos no acotados un timeout no es un detector fiable. Por eso, pese a sus problemas, **se sigue usando 2PC**.

### Transacciones distribuidas en la práctica

Las transacciones distribuidas con 2PC tienen reputación mixta: dan una garantía de seguridad difícil de lograr de otra forma, pero causan problemas operativos y de rendimiento. Se ha reportado que en MySQL son **más de 10 veces más lentas** que las de un nodo, sobre todo por el `fsync` adicional y los viajes de red extra. Hay dos tipos:

- **Internas de la base**: todos los participantes ejecutan el mismo software (VoltDB, NDB Cluster de MySQL), así que el protocolo puede optimizarse y funciona bastante bien.
- **Heterogéneas**: participan tecnologías distintas, como dos bases de proveedores diferentes o una base y un **message broker**. Son mucho más difíciles.

Con transacciones heterogéneas puedes lograr **exactly-once message processing**: el ack de un mensaje y las escrituras que provoca se confirman atómicamente; si algo falla, ambos se abortan y el mensaje se reentrega sin duplicar efectos. Solo funciona si **todos** los sistemas afectados hablan el mismo protocolo: un email enviado como efecto secundario podría salir dos veces.

**X/Open XA** (1991) es el estándar para 2PC heterogéneo, implementado por PostgreSQL, MySQL, Oracle, SQL Server y brokers como ActiveMQ o IBM MQ. No es un protocolo de red, sino una API en C (en Java, JTA). El coordinador suele ser una biblioteca dentro del proceso de la aplicación, con su log en el disco local: si ese servidor muere, los participantes preparados quedan en duda hasta que se reinicie.

#### El problema de fondo: locks retenidos

Una transacción en duda **mantiene sus locks** (de fila para escrituras y, con 2PL, compartidos para lecturas) mientras no se resuelva. Si el coordinador tarda 20 minutos en volver, son 20 minutos de filas bloqueadas; si su log se pierde, para siempre. Peor aún, aparecen **transacciones huérfanas** que ni reiniciar la base resuelve (una implementación correcta preserva los locks tras reiniciar). Solo queda que un administrador decida a mano, o usar las **heuristic decisions** de XA, un eufemismo de "probablemente romper la atomicidad".

Otras limitaciones: el coordinador suele ser un **punto único de fallo**; convierte servidores de aplicación stateless en **stateful** (su log es estado crítico); XA es un mínimo común denominador que no detecta deadlocks entre sistemas ni funciona con SSI; y como 2PC necesita respuesta de **todos** los participantes, las transacciones distribuidas tienden a **amplificar los fallos**.

### Consenso tolerante a fallos

Informalmente, consenso significa que varios nodos acuerden algo. Formalmente: uno o más nodos **proponen** valores y el algoritmo **decide** uno de ellos. En el ejemplo de la reserva del asiento, cuando varios clientes intentan comprar el último asiento a la vez, cada nodo que atiende a un cliente propone el ID de ese cliente y la decisión indica qué cliente obtuvo el asiento.

Un algoritmo de consenso debe cumplir:

| Propiedad | Significado | Tipo |
| --- | --- | --- |
| **Uniform agreement** | Ningún par de nodos decide de forma distinta | Safety |
| **Integrity** | Ningún nodo decide dos veces | Safety |
| **Validity** | Si un nodo decide el valor v, entonces v fue propuesto por algún nodo | Safety |
| **Termination** | Todo nodo que no se cae acaba decidiendo algún valor | Liveness |

Acuerdo e integridad son la idea central: todos deciden lo mismo y, una vez decidido, no puedes cambiar de opinión. Validez existe para descartar soluciones triviales (un algoritmo que siempre decide `null` cumpliría acuerdo e integridad, pero no validez).

Si no te importa la tolerancia a fallos, satisfacer las tres primeras es fácil: designas un nodo como "dictador" que toma todas las decisiones. Pero si ese nodo falla, el sistema ya no puede decidir nada. Es exactamente lo que vimos con 2PC: si el coordinador falla, los participantes en duda no pueden decidir.

La propiedad de **terminación** formaliza la tolerancia a fallos: un algoritmo de consenso **no puede quedarse sentado sin hacer nada para siempre**; debe avanzar aunque algunos nodos fallen. (2PC **no cumple** la terminación.)

Hay un límite: cualquier algoritmo de consenso necesita que **al menos una mayoría de nodos funcione correctamente** para garantizar la terminación. Esa mayoría forma un **quorum**. Así, la terminación está sujeta a que menos de la mitad de los nodos esté caída o inalcanzable. Pero incluso si la mayoría falla o hay un problema grave de red, la mayoría de implementaciones garantizan que las propiedades de **safety** (acuerdo, integridad, validez) **siempre se cumplen**: un fallo grave puede impedir que el sistema procese peticiones, pero **no puede corromper** el sistema causando decisiones inválidas.

La mayoría de algoritmos de consenso asumen que **no hay fallos bizantinos**.

#### Algoritmos de consenso y total order broadcast

Los algoritmos más conocidos son **Viewstamped Replication (VSR)**, **Paxos**, **Raft** y **Zab**. Hay bastantes similitudes entre ellos, pero no son iguales. Raft se diseñó explícitamente para ser fácil de entender, y hoy lo usan etcd, Consul, CockroachDB, TiKV y Kafka (KRaft). Zab es el de ZooKeeper.

La mayoría no usa directamente el modelo formal (proponer y decidir un solo valor). En cambio, deciden una **secuencia de valores**, lo que los convierte en algoritmos de **total order broadcast** (sesión 20). Total order broadcast es equivalente a **rondas repetidas de consenso**: en cada ronda, los nodos proponen el mensaje que quieren enviar a continuación y deciden cuál es el siguiente mensaje en el orden total.

- Por **acuerdo**, todos los nodos entregan los mismos mensajes en el mismo orden.
- Por **integridad**, los mensajes no se duplican.
- Por **validez**, los mensajes no se corrompen ni se inventan.
- Por **terminación**, los mensajes no se pierden.

VSR, Raft y Zab implementan total order broadcast directamente, porque es más eficiente que hacer rondas repetidas de consenso de un valor. En Paxos, esa optimización se llama **Multi-Paxos**.

#### Replicación single-leader y consenso

En la sesión 10 viste la replicación single-leader: el líder toma todas las escrituras y las aplica a los seguidores en el mismo orden. ¿No es eso total order broadcast? ¿Por qué no hablamos de consenso entonces? La respuesta está en **cómo se elige el líder**. Si el líder lo elige un humano a mano, tienes un "algoritmo de consenso" dictatorial: solo un nodo acepta escrituras y, si se cae, el sistema no puede escribir hasta que un humano configure otro. Funciona en la práctica, pero no cumple la terminación porque requiere intervención humana.

Algunas bases hacen elección de líder y failover automáticos. Eso nos acerca al consenso. Pero hay un problema: para elegir un líder necesitas consenso, y los algoritmos de consenso parecen ser algoritmos de total order broadcast, que se parecen a replicación single-leader, que necesita un líder… Parece un **círculo**: para elegir un líder primero necesitas un líder.

#### Números de época y quorums

Todos los protocolos de consenso mencionados usan internamente un líder de alguna forma, pero **no garantizan que el líder sea único**. Dan una garantía más débil: definen un **número de época** (*ballot number* en Paxos, *view number* en VSR, *term number* en Raft) y garantizan que **dentro de cada época el líder es único**.

Cada vez que se cree que el líder actual está muerto, se inicia una votación entre los nodos para elegir uno nuevo. A esa elección se le da un número de época **mayor**, así que los números de época están totalmente ordenados y son monotónicamente crecientes. Si hay un conflicto entre dos líderes en épocas distintas (quizá porque el líder anterior no estaba muerto después de todo), **gana el líder con el número de época mayor**.

Antes de decidir algo, un líder debe comprobar que no hay otro líder con un número de época mayor. ¿Cómo sabe un líder que no ha sido destituido? Recuerda la sesión 18: un nodo no puede fiarse de su propio juicio. Debe recolectar votos de un **quorum** de nodos. Para cada decisión que quiere tomar, el líder envía el valor propuesto a los demás nodos y espera a que un quorum responda a favor. El quorum suele ser una mayoría. Un nodo vota a favor de una propuesta solo si **no conoce a ningún otro líder con una época mayor**.

Así, hay **dos rondas de votación**: una para elegir líder y otra para votar las propuestas del líder. La clave es que **los quorums de ambas votaciones deben solaparse**: si un voto sobre una propuesta tiene éxito, al menos uno de los nodos que votaron también participó en la elección de líder más reciente. Por tanto, si en la votación de una propuesta no aparece ninguna época mayor, el líder puede concluir que no se eligió otro líder con época mayor y puede decidir con seguridad el valor propuesto.

```
Raft (simplificado)
término 7: líder N1
  N1 ── AppendEntries(term=7, entrada X) ──► N2 ✔  N3 ✔  N4 ✘ (caído)  N5 ✘
  mayoría (3 de 5) aceptó → X está confirmada (committed)

N1 sufre una pausa larga. N2 no recibe heartbeats → se presenta: RequestVote(term=8)
  N3 ✔  N4 ✔ → N2 es líder del término 8
N1 vuelve y envía AppendEntries(term=7) → los nodos responden "conozco el término 8"
  → N1 se convierte en seguidor (fencing por número de época)
```

Se parece superficialmente a 2PC, pero en 2PC el coordinador **no se elige** y se necesita el "sí" de **todos**, mientras que el consenso solo requiere **una mayoría** y define cómo recuperarse tras elegir un nuevo líder.

#### Limitaciones del consenso

Los algoritmos de consenso son un gran avance: llevan seguridad concreta (acuerdo, integridad, validez) a sistemas donde todo es incierto, y aun así siguen siendo tolerantes a fallos (avanzan mientras una mayoría funcione). Dan total order broadcast y, por tanto, pueden implementar operaciones atómicas linealizables de forma tolerante a fallos. Pero no se usan en todas partes porque tienen un coste:

- El proceso de votar las propuestas antes de decidir es una especie de **replicación síncrona**. Muchas bases usan replicación asíncrona por rendimiento.
- Requieren una **mayoría estricta** para operar: para tolerar 1 fallo necesitas 3 nodos; para tolerar 2, 5. Si un fallo de red separa a algunos nodos del resto, solo la parte con mayoría puede avanzar; el resto queda bloqueado.
- La mayoría asume un **conjunto fijo de nodos** que votan, así que no puedes añadir o quitar nodos sin más. Las extensiones de **cambio dinámico de membresía** existen, pero son mucho menos comprendidas.
- Dependen de **timeouts** para detectar nodos caídos. En entornos con retrasos de red muy variables (sobre todo geográficamente distribuidos), un nodo puede creer que el líder falló por un problema transitorio. No daña la seguridad, pero las **elecciones frecuentes** degradan el rendimiento: el sistema puede pasar más tiempo eligiendo líderes que trabajando.
- Son sensibles a redes inestables: con **un solo enlace** poco fiable, Raft puede hacer rebotar el liderazgo entre dos nodos sin avanzar nunca.

### Servicios de membresía y coordinación

**ZooKeeper** y **etcd** parecen almacenes clave-valor, pero rara vez los usas directamente: dependes de ellos a través de HBase, Hadoop YARN, Kafka clásico (ZooKeeper) o Kubernetes (etcd). Guardan **pocos datos que caben en memoria**, replicados en todos sus nodos con total order broadcast tolerante a fallos (ZooKeeper está inspirado en **Chubby**, el servicio de locks de Google). Lo que ofrecen:

| Funcionalidad | Para qué sirve |
| --- | --- |
| **Operaciones atómicas linealizables** (compare-and-set) | Locks y leases: si varios nodos lo intentan, solo uno gana. Es lo único que requiere consenso de verdad. |
| **Orden total de operaciones** (`zxid`, `cversion`) | Fencing tokens monotónicos para proteger recursos. |
| **Detección de fallos** con sesiones y heartbeats | **Nodos efímeros** que desaparecen cuando expira la sesión del cliente, liberando sus locks. |
| **Notificaciones de cambios** (*watches*) | Enterarse sin sondear de que un nodo se unió, falló o cambió un valor. |

#### Usos típicos

- **Elegir líder y asignar trabajo**: decidir qué instancia es primaria o qué partición va a qué nodo, y reasignar cuando un nodo entra o falla. Apache Curator ofrece recetas de alto nivel. ZooKeeper corre en un número fijo de nodos (normalmente **3 o 5**) y puede coordinar a miles de clientes: **externalizas** el consenso, el orden y la detección de fallos. Los datos que guarda cambian lentamente ("10.1.1.23 lidera la partición 7"), no el estado de la aplicación.
- **Service discovery**: los servicios se registran al arrancar para que otros los encuentren (también Consul). No requiere consenso estrictamente: DNS no es linealizable y funciona bien con caches. Pero si el sistema de consenso ya sabe quién es el líder, tiene sentido publicarlo ahí.
- **Membership services**: acordar qué nodos forman el clúster. La detección de fallos sola no es fiable, pero acoplada con consenso permite que **todos coincidan** en la membresía actual (aunque a veces declaren muerto a un nodo vivo). Con una membresía acordada, elegir líder puede ser tan simple como tomar el miembro de menor número.

### Ideas erróneas frecuentes

- **"FLP demuestra que el consenso es imposible en la práctica."** Solo en el modelo asíncrono sin timeouts; con timeouts o aleatoriedad, se resuelve.
- **"2PC es tolerante a fallos."** Si el coordinador cae tras el prepare, los participantes quedan en duda con locks retenidos: no cumple la terminación.
- **"Raft garantiza un único líder siempre."** Garantiza un líder único por término; los conflictos se resuelven con el término mayor y quorums que se solapan.
- **"Pongamos los datos de la aplicación en ZooKeeper/etcd."** Están diseñados para poca información que cambia lentamente (configuración, líderes, membresía).
- **"3PC resuelve el bloqueo de 2PC."** Solo con retrasos acotados; en redes reales no garantiza atomicidad.

### Resumen

El consenso (acordar un valor) aparece en la elección de líder y el commit atómico. 2PC logra commit atómico con un coordinador y un sistema de promesas, pero se bloquea si el coordinador cae (transacciones en duda que retienen locks); XA lo extiende a sistemas heterogéneos con limitaciones serias. Los algoritmos de consenso tolerantes a fallos (VSR, Paxos, Raft, Zab) cumplen acuerdo, integridad, validez y terminación con una mayoría, implementan total order broadcast y usan números de época y quorums que se solapan. ZooKeeper y etcd ofrecen consenso "externalizado": operaciones atómicas linealizables, orden total con fencing tokens, detección de fallos y notificaciones, ideales para elegir líderes, asignar particiones y gestionar membresía.

## Conceptos clave

- **Consenso**: que varios nodos acuerden un valor de forma tolerante a fallos.
- **FLP**: imposibilidad del consenso determinista en el modelo asíncrono sin timeouts.
- **Atomic commit**: todos los nodos de una transacción confirman o todos abortan.
- **Two-phase commit (2PC)**: prepare y commit/abort dirigidos por un coordinador.
- **Coordinador (transaction manager)**: componente que recoge votos y registra la decisión.
- **Commit point**: momento en que el coordinador escribe la decisión en su log.
- **In-doubt transaction**: participante que votó "sí" y espera la decisión del coordinador.
- **XA**: API estándar para 2PC entre sistemas heterogéneos.
- **Heuristic decision**: decisión unilateral de emergencia que puede romper la atomicidad.
- **Uniform agreement, integrity, validity, termination**: propiedades del consenso.
- **Número de época (term, ballot, view)**: identifica un liderazgo; el mayor gana.
- **Raft / Paxos / Zab / VSR**: algoritmos de consenso que implementan total order broadcast.
- **Ephemeral node**: nodo de ZooKeeper que desaparece cuando expira la sesión que lo creó.
- **Service discovery / membership service**: encontrar servicios y acordar qué nodos están vivos.

## Preguntas de repaso

1. ¿Por qué no basta con enviar "commit" a todos los nodos de una transacción distribuida?
   R: Porque algunos podrían confirmar y otros abortar (por conflictos, peticiones perdidas o caídas antes de escribir el registro de commit), dejando los nodos inconsistentes, y un commit no puede retirarse una vez visible para otros.
2. Describe las dos "promesas" que hacen funcionar a 2PC.
   R: Al votar "sí" en el prepare, el participante promete que podrá confirmar pase lo que pase (escribió todo a disco y comprobó restricciones), renunciando a abortar. Al escribir la decisión en su log, el coordinador hace la decisión irrevocable y debe reintentar hasta que todos la apliquen.
3. ¿Por qué una transacción en duda es tan dañina?
   R: Porque el participante no puede decidir solo y mantiene los locks de las filas modificadas (y quizá leídas) hasta que el coordinador se recupere; si el log del coordinador se pierde, los locks pueden durar para siempre y dejar indisponible gran parte de la aplicación.
4. Nombra las cuatro propiedades del consenso y cuál no cumple 2PC.
   R: Uniform agreement, integrity, validity (safety) y termination (liveness). 2PC no cumple la terminación porque puede quedarse bloqueado esperando a un coordinador caído.
5. ¿Cómo evitan los algoritmos de consenso el problema circular de "para elegir un líder necesito un líder"?
   R: No garantizan un líder único global, sino único por número de época; cada elección usa una época mayor, y el líder necesita votos de un quorum para cada decisión. Como el quorum de la elección y el de la propuesta se solapan, si nadie reporta una época mayor el líder sabe que no fue destituido.
6. Da tres limitaciones de los algoritmos de consenso.
   R: Votar cada decisión es como replicación síncrona (coste de rendimiento); necesitan mayoría estricta (3 nodos para tolerar 1 fallo, 5 para 2) y la minoría aislada se bloquea; asumen membresía fija; dependen de timeouts y en redes inestables pueden pasar mucho tiempo eligiendo líderes.
7. ¿Para qué se usa ZooKeeper y para qué no?
   R: Para coordinación: elección de líder, locks con fencing tokens, asignación de particiones, detección de fallos con sesiones y nodos efímeros, notificaciones y membresía. No para guardar el estado de la aplicación, que cambia muy rápido; está pensado para pocos datos que cambian lentamente.

## Ejercicio

Implementa en TypeScript una simulación de 2PC con fallos:

1. Un `Coordinator` y tres `Participant` en memoria. Cada participante, al recibir `prepare`, vota "sí" con probabilidad 0,9 y, si vota sí, marca sus filas como bloqueadas.
2. El coordinador escribe su decisión en un "log" (array) antes de enviar commit/abort.
3. Inyecta un crash del coordinador justo después de escribir COMMIT y enviar el commit solo al participante 1. Muestra el estado: P1 confirmado, P2 y P3 en duda con locks retenidos. Intenta una escritura de otra transacción sobre esas filas y muestra que queda bloqueada.
4. "Recupera" el coordinador leyendo su log y completa la transacción.
5. Extensión: usa etcd real (Docker `quay.io/coreos/etcd`) o la librería `etcd3` para Node y elige un líder entre 3 procesos con `lease` y `campaign`; mata al líder y mide cuánto tarda en aparecer otro.

Criterio de terminado: el log de la simulación muestra los estados in-doubt y la resolución tras la recuperación; con la extensión, imprimes el tiempo de failover observado.

## Explícalo con tus palabras

Explica por qué 2PC necesita "sí" de todos y Raft solo de una mayoría, y qué consecuencia tiene eso para la tolerancia a fallos.
