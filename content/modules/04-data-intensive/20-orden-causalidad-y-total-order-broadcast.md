---
title: Orden, causalidad y total order broadcast
kind: lesson
hours: 2
sources: Designing Data-Intensive Applications (Kleppmann), cap. 9 (pp. 361–374)
links: Lamport, "Time, Clocks, and the Ordering of Events" | https://lamport.azurewebsites.net/pubs/time-clocks.pdf ; Kafka, garantías de orden por partición | https://kafka.apache.org/documentation/#intro_concepts_and_terms
---

## Objetivo

Entender por qué el orden importa tanto en los sistemas distribuidos, la diferencia entre orden total y orden causal, cómo los números de secuencia y los timestamps de Lamport ordenan eventos de forma consistente con la causalidad, por qué eso no basta para restricciones como la unicidad, y cómo el total order broadcast se relaciona con la linealizabilidad y el consenso.

## Estudio

### El orden aparece en todas partes

Has visto el tema del orden una y otra vez en este módulo:

- En la replicación con líder (sesión 10), el líder determina el **orden de las escrituras** en el replication log, y los seguidores las aplican en ese orden. Sin un líder, aparecen conflictos por operaciones concurrentes.
- La **serializabilidad** (sesión 16) asegura que las transacciones se comportan como si se ejecutaran en algún orden secuencial.
- El uso de **timestamps y relojes** (sesión 18) intentaba introducir orden: decidir qué escritura fue más reciente.
- La **linealizabilidad** (sesión 19) exige un orden de operaciones consistente con el tiempo real.

Hay una conexión profunda entre orden, linealizabilidad y consenso. Esta sesión la explora.

### Orden y causalidad

El orden importa por una razón fundamental: ayuda a preservar la **causalidad**. Ya la viste varias veces:

- En **consistent prefix reads** (sesión 11): la respuesta a una pregunta no puede verse antes que la pregunta. Hay una dependencia causal entre ambas.
- En la replicación multi-líder (sesión 12): un `UPDATE` que llega antes que el `INSERT` de la fila que actualiza. El update depende causalmente del insert.
- En la **detección de escrituras concurrentes** (sesión 12): si A *happens-before* B, B puede sobrescribir a A; si son concurrentes, hay conflicto. La causalidad es la que define qué es concurrente.
- En **snapshot isolation** (sesión 15): una transacción lee de un snapshot consistente. ¿Consistente con qué? **Con la causalidad**: si el snapshot contiene una respuesta, también debe contener la pregunta. Observar toda la base en un instante la hace consistente con la causalidad: los efectos de todas las operaciones que ocurrieron causalmente antes son visibles, y ninguna posterior lo es.
- En el **write skew** (sesión 16): Alice dejó la guardia porque *vio* que Bob estaba de guardia. La acción depende causalmente de la observación. SSI detecta write skew rastreando las dependencias causales entre transacciones.
- En el ejemplo de **Alice y Bob en el Mundial** (sesión 19): Bob recargó *porque* oyó a Alice. La violación es de causalidad entre canales.

La causalidad impone un **orden sobre los eventos**: la causa viene antes que el efecto; un mensaje se envía antes de recibirse; la pregunta va antes que la respuesta. Como en la vida real, una cosa lleva a otra. Esas cadenas de operaciones causalmente dependientes definen el orden causal del sistema.

Si un sistema respeta el orden impuesto por la causalidad, decimos que es **causalmente consistente**. Snapshot isolation da consistencia causal: al leer de la base, si ves un dato, también ves todos los que causalmente lo precedieron.

### Orden total frente a orden parcial

Un **orden total** permite comparar **cualquier par** de elementos: los números naturales están totalmente ordenados (5 < 13). Los **conjuntos matemáticos** no: ¿es `{a, b}` mayor que `{b, c}`? Ninguno es subconjunto del otro, así que son **incomparables**: los conjuntos están **parcialmente ordenados**.

La diferencia entre un orden total y uno parcial se refleja en los modelos de consistencia:

| Modelo | Orden | Qué significa |
| --- | --- | --- |
| **Linealizabilidad** | **Total** | El sistema se comporta como una sola copia y todas las operaciones son atómicas: para dos operaciones cualesquiera, siempre puedes decir cuál ocurrió primero. No hay concurrencia en el registro: todo está en una línea temporal única. |
| **Causalidad** | **Parcial** | Dos eventos están ordenados si están causalmente relacionados (uno ocurrió antes que el otro), pero son **incomparables** si son concurrentes. |

```
linealizable (orden total):   ●──●──●──●──●──●──●   una sola línea temporal

causal (orden parcial):           ┌──●──●──┐
                              ●──●┤         ├──●──●
                                  └──●─────┘
                              ramas concurrentes que se bifurcan y se fusionan
```

Así, en una base linealizable no hay operaciones concurrentes: siempre hay una sola línea temporal en la que las operaciones están totalmente ordenadas. La concurrencia significaría que la línea se **ramifica y se fusiona**, y las operaciones de distintas ramas son incomparables. Si alguna vez usaste Git, los historiales de versiones se parecen mucho a un grafo de dependencias causales: un commit sucede tras otro en una rama, las ramas se separan y luego se fusionan.

#### La linealizabilidad es más fuerte que la consistencia causal

**La linealizabilidad implica causalidad**: cualquier sistema linealizable preserva la causalidad correctamente. Si hay varios canales de comunicación (como la cola y el almacenamiento del ejemplo de las fotos), la linealizabilidad garantiza que la causalidad se preserve automáticamente sin que el sistema haga nada especial. Por eso los sistemas linealizables son simples de entender.

Pero, como viste, la linealizabilidad cuesta rendimiento y disponibilidad. La buena noticia: hay un punto intermedio. **La consistencia causal es el modelo de consistencia más fuerte posible que no se ralentiza por los retrasos de red y sigue disponible ante fallos de red**. En muchos casos, los sistemas que parecen requerir linealizabilidad en realidad solo necesitan consistencia causal, que se puede implementar de forma más eficiente. La investigación en este área es reciente y prometedora, aunque aún no muy extendida en producción.

#### Capturar dependencias causales

Para mantener la causalidad necesitas saber qué operación ocurrió antes que cuál. Es un orden parcial: las operaciones concurrentes pueden procesarse en cualquier orden, pero si una ocurrió antes que otra, **deben procesarse en ese orden en todas las réplicas**. Cuando una réplica procesa una operación, debe asegurarse de que todas las operaciones causalmente anteriores ya se procesaron; si falta alguna, la posterior debe esperar.

Para determinar dependencias causales necesitas describir el **"conocimiento"** de un nodo: si un nodo ya había visto el valor X cuando emitió la escritura Y, X e Y pueden estar causalmente relacionados. Es como una investigación de fraude: ¿sabía el CEO lo de X cuando tomó la decisión Y?

Las técnicas son las de la sesión 12 (detección de escrituras concurrentes), pero la consistencia causal va más allá: debe rastrear dependencias en **toda la base**, no solo para una clave. Los **version vectors** pueden generalizarse para ello. Por eso la base necesita saber **qué versión leyó la aplicación**: en el algoritmo del carrito, el cliente devolvía el número de versión de su lectura al escribir. SSI hace algo parecido al comprobar en el commit si la versión leída sigue vigente.

### Ordenar con números de secuencia

Rastrear todas las dependencias causales puede ser **impráctico**: muchas aplicaciones leen montones de datos antes de escribir, y no está claro si la escritura depende de todas o solo de algunas lecturas. Rastrear todo lo leído sería un overhead enorme.

Hay una forma mejor: usar **números de secuencia** o **timestamps** para ordenar eventos. No tienen por qué venir de un reloj de pared: pueden venir de un **reloj lógico**, un algoritmo que genera números que identifican operaciones, normalmente con contadores que se incrementan.

Los números de secuencia son **compactos** (pocos bytes) y dan un **orden total**: cada operación tiene un número único y siempre puedes comparar dos. Y se pueden crear de forma **consistente con la causalidad**: si A ocurrió causalmente antes que B, A tiene un número menor que B. Las operaciones concurrentes se ordenan arbitrariamente. Ese orden total captura toda la información de causalidad, pero impone más orden del estrictamente necesario.

(Un orden total inconsistente con la causalidad es fácil de crear pero inútil: generar un UUID aleatorio por operación y comparar lexicográficamente da un orden total, pero no dice nada de qué ocurrió primero.)

En una base con **replicación single-leader**, el replication log define un orden total de escrituras **consistente con la causalidad**: el líder incrementa un contador por operación. Si un seguidor aplica las escrituras en el orden del log, su estado es siempre causalmente consistente, aunque vaya atrasado.

#### Generadores de secuencias no causales

Sin un solo líder (multi-líder, leaderless o base particionada), ¿cómo generas números de secuencia? Métodos usados en la práctica:

- **Cada nodo genera su propia secuencia independiente**: con dos nodos, uno genera impares y otro pares; en general, reservas algunos bits del número para el ID del nodo.
- **Adjuntar un timestamp del reloj de pared**: no es secuencial, pero con suficiente resolución puede ordenar totalmente. Es lo que hace LWW. (Los IDs tipo **Snowflake** de Twitter combinan timestamp, ID de máquina y contador.)
- **Preasignar bloques de números**: el nodo A reclama del 1 al 1.000 y el B del 1.001 al 2.000; cada nodo asigna de su bloque y pide uno nuevo al agotarse.

Los tres rinden mejor y escalan más que pasar todo por un líder único. Generan un número único y aproximadamente creciente por operación. Pero tienen un problema: **los números que generan no son consistentes con la causalidad**:

- Cada nodo puede procesar un número distinto de operaciones por segundo. Si un nodo genera pares y otro impares, el contador de pares puede ir por detrás del de impares (o al revés). Ante una operación impar y una par, **no puedes saber cuál ocurrió primero**.
- Los timestamps físicos están sujetos al **desfase de relojes**, así que pueden ser inconsistentes con la causalidad (el ejemplo de LWW de la sesión 18).
- Con bloques, una operación puede recibir un número del bloque 1.001–2.000 y otra causalmente posterior uno del bloque 1–1.000. Otra vez, **inconsistente con la causalidad**.

#### Timestamps de Lamport

Hay un método simple para generar números de secuencia **consistentes con la causalidad**: los **Lamport timestamps**, propuestos por Leslie Lamport en 1978 en uno de los artículos más citados de los sistemas distribuidos.

Cada nodo tiene un **identificador único** y mantiene un **contador** del número de operaciones que ha procesado. El timestamp de Lamport es el **par `(contador, nodeID)`**. Dos nodos pueden tener el mismo contador, pero al incluir el ID, cada timestamp es único.

Un timestamp de Lamport no tiene relación con un reloj físico, pero da un **orden total**: entre dos timestamps, **el de mayor contador es el mayor**; si los contadores son iguales, **el de mayor ID de nodo es el mayor**.

La idea clave que lo hace consistente con la causalidad: **cada nodo y cada cliente llevan la cuenta del contador máximo que han visto y lo incluyen en cada petición**. Cuando un nodo recibe una petición o respuesta con un contador mayor que el suyo, **aumenta inmediatamente su contador a ese máximo**.

```
              nodo 1                      nodo 2
contador:     0                           0
cliente A ──write──► nodo 1: c=1  → ts (1,1)  respuesta incluye max=1
cliente A ──write──► nodo 2 (con max=1): nodo 2 tenía c=0
                                         sube a 1, incrementa → c=2  → ts (2,2)
cliente B ──write──► nodo 1 (max=0): c=2 → ts (2,1)
cliente A ──write──► nodo 1 (con max=2): c = max(2,2)+1 = 3 → ts (3,1)

orden total: (1,1) < (2,1) < (2,2) < (3,1)
```

Mientras el contador máximo se transmite con cada operación, se garantiza que el orden de los timestamps de Lamport es consistente con la causalidad, porque cada dependencia causal resulta en un timestamp mayor.

```ts
class LamportClock {
  private counter = 0;
  constructor(private readonly nodeId: number) {}
  tick(): [number, number] {               // evento local o envío
    this.counter += 1;
    return [this.counter, this.nodeId];
  }
  observe(remoteCounter: number): void {   // al recibir un mensaje
    this.counter = Math.max(this.counter, remoteCounter);
  }
}
const compare = (a: [number, number], b: [number, number]) =>
  a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1];
```

A veces se confunden con los **version vectors** (sesión 12). Tienen propósitos distintos: los version vectors **distinguen** si dos operaciones son concurrentes o si una depende causalmente de la otra; los timestamps de Lamport siempre imponen un **orden total**. Del orden total de Lamport **no puedes saber** si dos operaciones son concurrentes o causalmente dependientes. La ventaja de Lamport frente a los version vectors es que son más **compactos**.

#### Los timestamps no bastan

Los timestamps de Lamport definen un orden total consistente con la causalidad, pero **no bastan para muchos problemas comunes**. Ejemplo: asegurar que un nombre de usuario sea único. Si dos usuarios intentan registrar el mismo nombre a la vez, uno debe tener éxito y el otro fallar.

Parecería suficiente: ante dos registros con el mismo nombre, elige el de menor timestamp como ganador y haz fallar al otro. Como los timestamps están totalmente ordenados, la comparación siempre es válida.

El problema: ese enfoque funciona para determinar el ganador **a posteriori**, una vez que tienes **todas** las operaciones de registro del sistema. Pero cuando un nodo acaba de recibir una petición de registro y debe decidir **ahora mismo** si tiene éxito, no tiene esa información. Necesitaría saber si otro nodo está procesando a la vez un registro del mismo nombre y qué timestamp le asignará. Tendría que **preguntar a todos los demás nodos**, y si uno falla o es inalcanzable por un problema de red, el sistema **se paraliza**. No es el sistema tolerante a fallos que necesitamos.

El problema es que el orden total de operaciones solo **emerge después** de haber recopilado todas. Para implementar algo como una restricción de unicidad, no basta con tener un orden total: también necesitas **saber cuándo ese orden está finalizado**. Si tienes la operación de crear un nombre y estás seguro de que **ningún otro nodo** puede insertar un registro del mismo nombre **antes** en el orden total, entonces puedes declarar el éxito con seguridad. Esa idea de saber cuándo el orden total está finalizado es el **total order broadcast**.

### Total order broadcast

Si el programa corre en un solo núcleo, definir un orden total es fácil: el orden en que la CPU ejecutó las operaciones. En un sistema distribuido, lograr que todos los nodos acuerden el mismo orden total es complicado. Con replicación single-leader, el líder secuencia todas las operaciones en un núcleo y el orden total es el del líder. Los retos: cómo escalar si el throughput supera a un líder, y cómo manejar el **failover** si el líder falla. En la literatura, este problema se llama **total order broadcast** o **atomic broadcast**.

Total order broadcast es un protocolo para intercambiar mensajes entre nodos que exige siempre dos propiedades de seguridad:

1. **Entrega fiable** (*reliable delivery*): no se pierden mensajes; si un mensaje se entrega a un nodo, se entrega a **todos**.
2. **Entrega totalmente ordenada** (*totally ordered delivery*): los mensajes se entregan a **todos los nodos en el mismo orden**.

Un algoritmo correcto debe garantizar ambas siempre, incluso si un nodo o la red fallan. Mientras la red esté interrumpida, los mensajes no pueden entregarse, pero el algoritmo puede reintentar para que lleguen al recuperarse (en el orden correcto).

#### Usarlo

Los servicios de consenso como **ZooKeeper** y **etcd** implementan total order broadcast. Esto ya sugiere una conexión fuerte con el consenso (sesión 21). Es exactamente lo que necesitas para **replicar una base de datos**: si cada mensaje representa una escritura y cada réplica procesa las mismas escrituras en el mismo orden, las réplicas quedan consistentes entre sí (salvo un lag temporal). Este principio se llama **state machine replication**.

```
                total order broadcast
  cliente ──► [ m1 m2 m3 m4 m5 ... ] ──► réplica A: aplica m1,m2,m3,... → estado S
                                     ──► réplica B: aplica m1,m2,m3,... → estado S
                                     ──► réplica C: aplica m1,m2,m3,... → estado S
          mismo orden + mismas operaciones deterministas = mismo estado
```

También sirve para implementar **transacciones serializables**: si cada mensaje es una transacción determinista ejecutada como stored procedure, y cada nodo procesa esos mensajes en el mismo orden, las particiones y réplicas de la base quedan consistentes (sesión 16).

Un aspecto importante: **el orden se fija en el momento en que se entregan los mensajes**. Un nodo no puede insertar retroactivamente un mensaje en una posición anterior si ya se entregaron mensajes posteriores. Esto lo hace **más fuerte** que los timestamps.

Otra forma de verlo: total order broadcast es una manera de crear un **log** (como un replication log, un log de transacciones o un write-ahead log): entregar un mensaje es como **añadir al log**. Como todos los nodos deben entregar los mismos mensajes en el mismo orden, todos pueden leer el log y ver la misma secuencia. **Kafka** es un ejemplo práctico de este modelo de log (por partición).

También sirve para implementar un **servicio de locks con fencing tokens**: cada petición de lock se añade al log como un mensaje, y todos los mensajes se numeran secuencialmente en el orden del log. El número de secuencia sirve de fencing token, porque es monotónicamente creciente. En ZooKeeper, ese número es el `zxid`.

#### Implementar almacenamiento linealizable con total order broadcast

Total order broadcast es **asíncrono**: garantiza que los mensajes se entregan de forma fiable en un orden fijo, pero **no cuándo** se entregarán (un receptor puede ir atrasado). La linealizabilidad, en cambio, es una garantía de **recencia**. Pero si tienes total order broadcast, puedes construir almacenamiento linealizable sobre él. Por ejemplo, para garantizar que un nombre de usuario identifique a una sola cuenta, implementas una operación **compare-and-set linealizable**:

1. **Añade un mensaje al log**, indicando tentativamente el nombre que quieres reclamar.
2. **Lee el log** y espera a que el mensaje que añadiste te sea entregado de vuelta.
3. Busca mensajes que reclamen el mismo nombre. Si **el primero** con ese nombre es el **tuyo**, tienes éxito: puedes confirmar la reclamación (quizá añadiendo otro mensaje al log) y responder al cliente. Si el primero es de **otro usuario**, abortas.

Como las entradas del log se entregan a todos los nodos en el mismo orden, si hay varias escrituras concurrentes, **todos los nodos acuerdan cuál fue la primera**. Elegir la primera de las escrituras en conflicto como ganadora y abortar las demás asegura que todos los nodos acuerden si una escritura se confirmó o abortó.

Este procedimiento garantiza **escrituras** linealizables, pero no lecturas linealizables: si lees de un almacén actualizado asíncronamente desde el log, puede estar atrasado (esto es **consistencia secuencial** o *timeline consistency*, ligeramente más débil). Para lecturas linealizables:

- **Secuenciar las lecturas a través del log**: añadir un mensaje, leer el log y hacer la lectura cuando el mensaje vuelve. La posición del mensaje en el log define el momento de la lectura. (Las lecturas por quorum de etcd funcionan algo así.)
- Si el log permite obtener la **posición del último mensaje** de forma linealizable, consultarla, esperar a que todas las entradas hasta ella se entreguen y luego leer. (Es la idea del `sync()` de ZooKeeper.)
- Leer de una réplica que se actualiza **síncronamente** con cada escritura y por tanto está al día (como en chain replication).

#### Implementar total order broadcast con almacenamiento linealizable

También se puede ir al revés. Supón que tienes un **registro linealizable** que guarda un entero y tiene una operación atómica de **increment-and-get** (o compare-and-set). El algoritmo: para cada mensaje que quieras enviar por total order broadcast, haz increment-and-get sobre el registro y adjunta el valor obtenido al mensaje como **número de secuencia**. Luego envía el mensaje a todos los nodos (reenviando los perdidos), y los receptores entregan los mensajes **consecutivamente** por número de secuencia.

A diferencia de los timestamps de Lamport, los números que obtienes del registro linealizable **no tienen huecos**. Si un nodo entregó el mensaje 4 y recibe el 6, sabe que debe **esperar al 5** antes de entregar el 6. Esa es la diferencia clave entre total order broadcast y el orden por timestamps.

¿Qué tan difícil es un registro linealizable con increment-and-get? Fácil si nada falla: lo guardas en una variable en un nodo. El problema es manejar la caída del nodo, restaurar su valor… En general, si lo piensas a fondo, llegas inevitablemente a un algoritmo de **consenso**. No es casualidad: se puede demostrar que un registro compare-and-set (o increment-and-get) linealizable y el total order broadcast son **equivalentes al consenso**. Si resuelves uno de ellos, puedes transformarlo en una solución para los demás. Es una idea profunda y potente, y la base de la próxima sesión.

### Ideas erróneas frecuentes

- **"El orden total es lo mismo que el causal."** El causal es parcial: los eventos concurrentes son incomparables.
- **"Los IDs con timestamp + nodo respetan la causalidad."** Relojes desfasados y bloques preasignados violan la causalidad.
- **"Los timestamps de Lamport detectan concurrencia."** Imponen un orden total; para detectar concurrencia hacen falta version vectors.
- **"Con timestamps de Lamport puedo aplicar unicidad."** Necesitas saber cuándo el orden está finalizado: eso es total order broadcast.
- **"Total order broadcast garantiza recencia."** Es asíncrono; para lecturas linealizables hay que secuenciarlas por el log o sincronizar.

### Resumen

El orden preserva la causalidad, que aparece en consistent prefix, detección de concurrencia, snapshots y write skew. La linealizabilidad impone un orden total y es más fuerte que la consistencia causal, que es parcial y es el modelo más fuerte que no sacrifica disponibilidad ni latencia ante fallos de red. Los números de secuencia de un líder y los timestamps de Lamport ordenan de forma consistente con la causalidad, pero no permiten decidir en el momento (por ejemplo, unicidad) porque el orden emerge después. Total order broadcast fija el orden al entregar los mensajes (como un log compartido), permite state machine replication y es equivalente a la linealizabilidad con compare-and-set y al consenso.

## Conceptos clave

- **Causalidad**: relación causa-efecto que impone orden entre eventos.
- **Consistencia causal**: el sistema respeta el orden de los eventos causalmente relacionados.
- **Orden total / orden parcial**: todo par es comparable frente a pares incomparables (concurrentes).
- **Número de secuencia**: entero que identifica y ordena operaciones.
- **Reloj lógico**: generador de números de orden basado en contadores, no en tiempo físico.
- **Lamport timestamp**: par (contador, nodeID) con propagación del contador máximo visto.
- **Total order broadcast (atomic broadcast)**: entrega fiable y en el mismo orden a todos los nodos.
- **State machine replication**: réplicas que aplican las mismas operaciones deterministas en el mismo orden.
- **Consistencia secuencial (timeline consistency)**: escrituras ordenadas pero lecturas posiblemente atrasadas.
- **Equivalencia con consenso**: compare-and-set linealizable, total order broadcast y consenso son problemas equivalentes.

## Preguntas de repaso

1. Da tres ejemplos del módulo donde aparece la causalidad.
   R: Consistent prefix reads (la respuesta no puede verse antes que la pregunta), la detección de escrituras concurrentes con happens-before (sobrescribir solo si una conocía a la otra) y el write skew (Alice dejó la guardia porque vio a Bob de guardia; SSI rastrea esas dependencias). También los snapshots consistentes y el caso de Alice y Bob en el Mundial.
2. ¿Por qué la linealizabilidad es un orden total y la causalidad uno parcial?
   R: En un sistema linealizable todas las operaciones están en una sola línea temporal y siempre puedes decir cuál fue primero. En la causalidad, solo los eventos causalmente relacionados están ordenados; los concurrentes son incomparables, como ramas en el historial de Git.
3. ¿Por qué los generadores de secuencia por nodo (pares e impares, bloques, timestamps) no respetan la causalidad?
   R: Porque los nodos avanzan a ritmos distintos (un contador puede ir por detrás de otro), los relojes físicos tienen desfase y los bloques preasignados pueden dar a una operación posterior un número menor; así, una operación causalmente posterior puede recibir un número menor.
4. ¿Qué hace consistentes con la causalidad a los timestamps de Lamport?
   R: Que cada nodo y cliente propagan el contador máximo que han visto en cada petición y respuesta, y un nodo que recibe un contador mayor que el suyo lo adopta antes de incrementar; así, toda dependencia causal produce un timestamp mayor.
5. ¿Por qué los timestamps de Lamport no bastan para garantizar nombres de usuario únicos?
   R: Porque el orden total solo se conoce cuando ya se recopilaron todas las operaciones; un nodo que debe decidir ahora no sabe si otro nodo está registrando el mismo nombre con un timestamp menor sin consultar a todos, y si alguno no responde el sistema se paraliza.
6. ¿Qué dos propiedades exige el total order broadcast y para qué sirve?
   R: Entrega fiable (si un nodo recibe un mensaje, todos lo reciben) y entrega totalmente ordenada (todos en el mismo orden). Sirve para state machine replication, transacciones serializables deterministas, logs compartidos como Kafka y servicios de locks con fencing tokens.
7. Explica cómo implementar un compare-and-set linealizable para nombres de usuario usando total order broadcast.
   R: Se añade al log un mensaje que reclama el nombre, se espera a que ese mensaje vuelva entregado y se buscan mensajes con el mismo nombre; si el primero es el propio, se confirma; si es de otro, se aborta. Como todos los nodos ven el mismo orden, todos coinciden en el ganador.

## Ejercicio

En TypeScript:

1. Implementa la clase `LamportClock` de la lección y simula 3 nodos que intercambian 30 mensajes con retrasos aleatorios. Registra cada evento con su timestamp.
2. Marca relaciones causales reales (envío → recepción, y eventos sucesivos en el mismo nodo) y verifica que para cada par causal el timestamp de la causa es menor.
3. Implementa también version vectors para los mismos eventos y escribe `isConcurrent(a, b)`. Encuentra un par de eventos concurrentes y muestra que Lamport los ordena igualmente (no detecta la concurrencia).
4. Implementa un "total order broadcast" de juguete con un secuenciador central (increment-and-get en memoria) y receptores que entregan mensajes consecutivos con un buffer para huecos. Úsalo para registrar nombres de usuario desde 3 nodos concurrentes y comprueba que todos los nodos coinciden en los ganadores.

Criterio de terminado: la verificación del punto 2 pasa para todos los pares causales, el punto 3 muestra al menos un par concurrente detectado por version vectors, y en el punto 4 los tres nodos producen exactamente la misma tabla de nombres.

## Explícalo con tus palabras

Explica por qué "tener un orden total" no es lo mismo que "saber cuándo el orden está decidido", usando el ejemplo de dos personas registrando el mismo nombre de usuario.
