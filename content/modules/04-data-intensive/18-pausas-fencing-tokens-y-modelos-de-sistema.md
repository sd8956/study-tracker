---
title: Pausas de proceso, fencing tokens y modelos de sistema
kind: lesson
hours: 2
sources: Designing Data-Intensive Applications (Kleppmann), cap. 8 (pp. 313–335)
links: Martin Kleppmann, sobre locks distribuidos con Redis | https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html ; Spanner, paper de Google | https://research.google/pubs/spanner-googles-globally-distributed-database-2/
---

## Objetivo

Entender los peligros de depender de relojes sincronizados (last write wins, intervalos de confianza, snapshots globales), por qué un proceso puede pausarse en cualquier momento, cómo la mayoría define la verdad, cómo los fencing tokens protegen recursos frente a "zombies", qué son los fallos bizantinos y cómo se razona con modelos de sistema y propiedades de safety y liveness.

## Estudio

### Depender de relojes sincronizados

Los relojes parecen simples, pero tienen muchas trampas: un día puede no tener 86.400 segundos, el reloj de pared puede ir hacia atrás y la hora de un nodo puede ser muy distinta de la de otro. Igual que con la red, el software robusto debe estar preparado para relojes incorrectos.

Lo peligroso es que **un reloj incorrecto pasa desapercibido**. Una CPU defectuosa o una red mal configurada hacen que la máquina no funcione y se arregla pronto. Pero si el cuarzo está defectuoso o el cliente NTP mal configurado, casi todo parece funcionar mientras el reloj se aleja poco a poco de la realidad. Si algún software depende de relojes sincronizados, el resultado es más probable que sea **pérdida de datos silenciosa y sutil** que un crash dramático. Por eso, si usas software que requiere relojes sincronizados, **monitoriza los desfases** entre máquinas y declara muerto a cualquier nodo cuyo reloj se aleje demasiado.

#### Timestamps para ordenar eventos

Una situación tentadora y peligrosa: ordenar eventos de varios nodos por timestamp. ¿Quién escribió primero? Ejemplo con replicación multi-líder:

```
nodo 1 (reloj 42,004 s): cliente A escribe x = 1 ──── replica a nodo 3 y nodo 2
nodo 3 (reloj 42,003 s): recibe x = 1; cliente B hace x = x + 1 → x = 2 ── replica a nodo 2
nodo 2: recibe x = 1 (ts 42,004) y x = 2 (ts 42,003)
        con LWW: gana 42,004 → x = 1   ← ¡el incremento de B se perdió!
```

La sincronización aquí es muy buena (menos de 3 ms de desfase, mejor de lo que suele lograrse), y aun así los timestamps ordenan mal: `x = 2` ocurrió **claramente después**, pero tiene un timestamp anterior. Es **last write wins**, muy usado en multi-líder y en bases leaderless como Cassandra y Riak. Sus problemas:

- **Escrituras que desaparecen misteriosamente**: un nodo con el reloj atrasado no puede sobrescribir valores escritos por un nodo con reloj adelantado hasta que pase el desfase. Se pueden perder cantidades arbitrarias de datos **sin ningún error**.
- **No distingue** entre escrituras secuenciales rápidas (el incremento de B fue claramente posterior) y escrituras verdaderamente concurrentes. Hacen falta mecanismos de causalidad como version vectors.
- Dos nodos pueden generar el **mismo timestamp** (sobre todo con resolución de milisegundos). Se necesita un desempate adicional (un número aleatorio), que también puede violar la causalidad.

Incluso con NTP bien ajustado, puedes enviar un paquete con timestamp 100 ms (reloj del emisor) y que llegue con timestamp 99 ms (reloj del receptor): parece que llegó antes de enviarse. No se puede hacer NTP lo bastante preciso, porque su precisión está limitada por el propio retraso de red que intentarías ordenar.

La alternativa segura son los **relojes lógicos**, basados en contadores que se incrementan en lugar de osciladores de cuarzo. No miden la hora ni los segundos transcurridos, solo el **orden relativo** de eventos. Los relojes de pared y monotónicos, que miden tiempo real, se llaman **relojes físicos**. Volverás a esto en la sesión 20.

#### Las lecturas de reloj tienen un intervalo de confianza

Puedes leer el reloj con resolución de microsegundos o nanosegundos, pero eso **no significa que sea preciso** a ese nivel. Con NTP en la red local cada minuto, la deriva puede ser de varios milisegundos; con un servidor público, decenas de milisegundos, más en congestión.

Por eso no tiene sentido pensar en una lectura de reloj como un punto exacto: es más bien un **rango de tiempos dentro de un intervalo de confianza**. Un sistema puede tener un 95 % de confianza en que la hora está entre 10,3 y 10,5 segundos después del minuto. El límite de incertidumbre se puede calcular según la fuente de tiempo (GPS o reloj atómico local tienen un rango de error del fabricante; con un servidor remoto, la incertidumbre depende de la deriva esperada desde la última sincronización, más la incertidumbre del servidor y el tiempo de ida y vuelta). Pero la mayoría de sistemas **no exponen** esa incertidumbre: `clock_gettime()` no te dice el error esperado.

Una excepción notable: la API **TrueTime** de **Google Spanner**, que devuelve explícitamente el intervalo de confianza: `[earliest, latest]`. El reloj real está en algún punto de ese intervalo, y su anchura depende del tiempo desde la última sincronización con un reloj más preciso.

#### Relojes sincronizados para snapshots globales

En la sesión 15 viste snapshot isolation implementado con un contador monotónico de IDs de transacción. En un solo nodo, un contador basta. En una base distribuida en muchas máquinas y datacenters, generar un ID de transacción **global y monotónico** (consistente con la causalidad) es difícil: requiere coordinación y puede ser un cuello de botella.

¿Y si usamos los timestamps de relojes sincronizados como IDs? Spanner lo hace: si tienes dos intervalos de confianza `A = [A_earliest, A_latest]` y `B = [B_earliest, B_latest]` que **no se solapan** (`A_earliest < A_latest < B_earliest < B_latest`), entonces B ocurrió definitivamente después que A. Solo si se solapan no sabes el orden.

Para garantizar que los timestamps de transacciones reflejan la causalidad, **Spanner espera deliberadamente** la duración del intervalo de confianza antes de confirmar una transacción de lectura-escritura (*commit wait*). Así, cualquier transacción que lea esos datos ocurrirá lo bastante tarde como para que sus intervalos no se solapen. Para que la espera sea corta, Google instala un **receptor GPS o un reloj atómico en cada datacenter**, lo que mantiene la incertidumbre en unos **7 ms**. Es un área de investigación activa; fuera de Google, CockroachDB usa *hybrid logical clocks* con una incertidumbre máxima configurada en lugar de hardware especial.

### Pausas de proceso

Otro ejemplo peligroso de uso de relojes. Supón una base con un líder por partición. ¿Cómo sabe un nodo que sigue siendo líder (que los demás no lo declararon muerto) y puede aceptar escrituras? Una opción: el líder obtiene un **lease** (un lock con timeout) de los demás nodos. Solo un nodo puede tener el lease a la vez. Para seguir siendo líder, debe **renovarlo** periódicamente antes de que expire; si falla, deja de renovarlo y otro nodo lo toma.

```ts
while (true) {
  const request = getIncomingRequest();
  // asegurar que al lease le queden al menos 10 s
  if (lease.expiryTimeMillis - Date.now() < 10_000) {
    lease = lease.renew();
  }
  if (lease.isValid()) {
    process(request);
  }
}
```

Problemas de este código:

1. Depende de **relojes sincronizados**: la expiración la fijó otra máquina y se compara con el reloj local. Si los relojes difieren en unos segundos, falla.
2. Aunque uses relojes monotónicos locales, el código asume que entre comprobar la hora (`Date.now()`) y procesar la petición (`process(request)`) pasa muy poco tiempo. ¿Y si el hilo **se detiene 15 segundos** justo entre la comprobación y el `process`? Para cuando procesa, el lease expiró y otro nodo ya es líder. El hilo no se entera y **procesa la petición de forma insegura**.

¿Puede un hilo pausarse tanto? Sí, por muchas razones:

- **Garbage collection** "stop-the-world" en lenguajes como Java: pausas de **varios minutos** en casos extremos. Hasta los GC "concurrentes" a veces paran todo.
- En **entornos virtualizados**, la VM puede **suspenderse** (pausar todos sus procesos y guardar la memoria a disco) y reanudarse, por ejemplo en una **migración en vivo** de un host a otro. La pausa dura lo que tarde la migración.
- En portátiles y dispositivos, la ejecución se suspende cuando el usuario **cierra la tapa**.
- Cuando el sistema operativo hace un **cambio de contexto** a otro hilo, o el hipervisor cambia a otra VM (*steal time*), el hilo actual se pausa un tiempo arbitrario. Con mucha carga, puede tardar en volver a ejecutarse.
- **I/O síncrono**: acceder al disco, o a un sistema de archivos en red (como Amazon EBS), puede bloquear. Incluso cargar una clase en Java la primera vez puede requerir I/O.
- **Swapping** (paginación a disco): un acceso a memoria puede provocar un page fault que carga una página de disco; si el sistema pasa casi todo el tiempo intercambiando páginas (*thrashing*), apenas avanza. Muchos servidores desactivan el swap.
- Un proceso Unix puede pausarse con **SIGSTOP** (por ejemplo, Ctrl-Z) y no seguir hasta recibir SIGCONT.

Todas estas situaciones pueden **interrumpir un hilo en cualquier momento** y reanudarlo después, sin que el hilo se entere. Es el mismo problema de hacer código seguro multihilo en una máquina: no puedes asumir nada sobre el timing. En una sola máquina tienes mutexes, semáforos y operaciones atómicas. En un sistema distribuido no hay memoria compartida: solo mensajes por una red poco fiable. **Un nodo distribuido debe asumir que su ejecución puede pausarse un tiempo significativo en cualquier punto**, incluso a mitad de una función. Durante la pausa, el resto del mundo sigue moviéndose y puede declararlo muerto. Al volver, el nodo no sabe que estuvo dormido.

#### Garantías de tiempo de respuesta

Algunos sistemas no pueden tolerar respuestas tardías: control de aviones, cohetes, robots, coches. Son **sistemas de tiempo real duro** (*hard real-time*): hay un **plazo** que, si no se cumple, provoca la falla del sistema. Lograrlo requiere un **RTOS** que garantice la asignación de CPU en intervalos concretos, funciones de biblioteca con tiempos de ejecución en el peor caso documentados, asignación de memoria dinámica restringida o prohibida, y muchísimas pruebas. Es carísimo y se usa en dispositivos embebidos críticos. "Real-time" no es lo mismo que "alto rendimiento": puede tener throughput bajo porque prioriza respuestas a tiempo. Para la mayoría de servidores no compensa, así que **deben convivir con pausas y relojes inestables**.

Existen técnicas para **limitar el impacto del GC**: tratar las pausas de GC como breves caídas planificadas del nodo y dejar que otros nodos atiendan peticiones mientras se recolecta; o usar el GC solo para objetos de vida corta (rápidos de recolectar) y **reiniciar procesos periódicamente** antes de acumular objetos de larga vida, como un rolling restart.

### Conocimiento, verdad y mentiras

Hasta aquí: en un sistema distribuido no hay memoria compartida, los mensajes por red tienen retrasos variables, los fallos son parciales, los relojes no son fiables y los procesos pueden pausarse. Un nodo **no puede saber nada con certeza**: solo puede hacer conjeturas basadas en los mensajes que recibe (o no recibe). Si un nodo no responde, no hay forma de saber en qué estado está. ¿Cómo razonar en estas condiciones?

#### La verdad la define la mayoría

Imagina una red con un fallo asimétrico: un nodo puede **recibir** todos los mensajes pero los que **envía** se pierden o retrasan. Aunque funciona perfectamente y recibe peticiones, los demás no oyen sus respuestas. Tras un timeout, lo declaran muerto. El nodo puede protestar ("¡no estoy muerto!"), pero nadie lo oye. Es una pesadilla.

Escenario un poco menos pesadillesco: el nodo se da cuenta de que sus mensajes no reciben acks y de que fue declarado muerto. Aun así, no puede hacer nada. Y otro: un nodo sufre una pausa de GC de un minuto. Los demás lo declaran muerto. Al volver, el nodo **sigue creyendo que es el líder** y no sabe que pasó un minuto.

Moraleja: **un nodo no puede fiarse de su propio juicio**. Muchos algoritmos distribuidos dependen de un **quorum**: votos de una mayoría de nodos. Las decisiones requieren un número mínimo de votos para reducir la dependencia de un nodo concreto. Si un quorum declara muerto a un nodo, **está muerto**, aunque se sienta vivo: debe acatar la decisión y retirarse.

Lo más habitual es que el quorum sea una **mayoría absoluta** (más de la mitad). Con mayoría, el sistema tolera la caída de nodos individuales (con 3 nodos, 1; con 5, 2) y es seguro: solo puede haber **una mayoría** a la vez, así que no puede haber dos decisiones contradictorias.

#### El líder y el lock

A menudo un sistema necesita que **solo haya uno** de algo:

- Solo un nodo puede ser el **líder** de una partición, para evitar split brain.
- Solo una transacción o cliente puede tener el **lock** de un recurso, para evitar escrituras concurrentes que lo corrompan.
- Solo un usuario puede registrar un **nombre de usuario**.

Aunque un nodo crea que es "el elegido", **eso no significa que un quorum esté de acuerdo**. Puede haber sido líder, pero si los demás lo declararon muerto (por un fallo de red o una pausa de GC), puede que ya lo hayan relevado. Si el nodo sigue actuando como el elegido, puede causar problemas. Un caso real (un bug de HBase): asegurar que un archivo de un servicio de almacenamiento solo lo escribe un cliente a la vez, usando un lock con lease.

```
tiempo ───────────────────────────────────────────────────────────────►

cliente 1:  obtiene lease ── [pausa de GC larga ··························] ── escribe ✘ (corrompe)
                               el lease expira
lock service:                         ▲
cliente 2:                         obtiene lease ── escribe ✔
almacenamiento:                                     datos de 2  ...  datos de 1 encima: ¡corrupto!
```

El cliente 1 obtiene el lease, se pausa por GC, el lease expira, el cliente 2 lo obtiene y escribe. El cliente 1 vuelve creyendo (incorrectamente) que sigue teniendo el lease válido y escribe también. Los datos quedan **corruptos**.

#### Fencing tokens

Para que un nodo que cree erróneamente ser "el elegido" no rompa el sistema, se usa una técnica simple: los **fencing tokens**. Cada vez que el servidor de locks concede un lock o lease, devuelve también un **token**: un número que **crece en cada concesión**. Luego, cada vez que el cliente envía una escritura al almacenamiento, debe incluir su token.

```
cliente 1: obtiene lease con token 33 ── [pausa ··············] ── escribe(token 33) ✘ rechazada
cliente 2:                   obtiene lease con token 34 ── escribe(token 34) ✔
almacenamiento: recuerda el mayor token visto (34) y rechaza cualquier escritura con token menor
```

El cliente 1 obtiene el token 33 y se pausa; el cliente 2 obtiene el token 34 y escribe. Cuando el cliente 1 vuelve y escribe con el token 33, el servidor de almacenamiento recuerda que ya procesó una escritura con un token mayor (34) y **la rechaza**.

Si usas **ZooKeeper** como servicio de locks, el ID de transacción `zxid` o la versión del nodo `cversion` sirven como fencing token: son monotónicamente crecientes. Fíjate en un detalle crucial: **el recurso protegido debe comprobar activamente los tokens**. No basta con que los clientes comprueben su propio estado de lock. Si el recurso no soporta tokens, puedes a veces sortearlo (por ejemplo, incluyendo el token en el nombre del archivo en un almacén de archivos). Comprobar tokens en el servidor es positivo: no es prudente asumir que los clientes siempre se portan bien, porque los ejecutan personas con prioridades distintas a las tuyas.

Esta es también la razón de la crítica conocida a algoritmos como **Redlock** de Redis: un lock basado en tiempos, sin fencing tokens, no protege frente a pausas de proceso.

### Fallos bizantinos

Los fencing tokens detectan y bloquean a un nodo que actúa **por error** (porque no sabe que su lease expiró). Pero si el nodo **quisiera** romper las garantías, podría enviar un token falso.

Asumimos que los nodos son poco fiables pero **honestos**: pueden ser lentos o no responder, y su estado puede estar desactualizado, pero si responden, "dicen la verdad" según su conocimiento. Los problemas distribuidos son mucho más difíciles si existe el riesgo de que los nodos **mientan** (envíen respuestas arbitrariamente defectuosas o corruptas): por ejemplo, afirmar haber recibido un mensaje que no recibieron. Ese comportamiento es un **fallo bizantino**, y lograr consenso en ese entorno es el **problema de los generales bizantinos**.

Un sistema es **tolerante a fallos bizantinos** si sigue funcionando correctamente aunque algunos nodos fallen de forma arbitraria o haya atacantes. Importa en:

- **Aeroespacial**: la radiación puede corromper la memoria o los registros de la CPU y hacer que un nodo responda de forma impredecible. Un fallo del sistema sería catastrófico, así que los sistemas de control de vuelo toleran fallos bizantinos.
- **Sistemas con varias organizaciones** que no confían entre sí: algunos participantes pueden intentar hacer trampas. **Blockchains** como Bitcoin son una forma de que partes que no confían entre sí acuerden si una transacción ocurrió.

En los sistemas de este libro, normalmente **podemos asumir que no hay fallos bizantinos**: en tu datacenter, todos los nodos los controla tu organización y la radiación es lo bastante baja. Los protocolos bizantinos son complicados y requieren hardware especial; no son prácticos en la mayoría de bases de servidor. Además, un sistema bizantino necesita que más de **dos tercios** de los nodos funcionen correctamente; y si un atacante compromete un nodo, probablemente comprometa todos (corren el mismo software), así que la tolerancia bizantina no te protege de bugs comunes. Las defensas tradicionales (autenticación, control de acceso, cifrado, firewalls) siguen siendo la protección principal.

#### Protecciones débiles contra "mentiras"

Aunque no asumas bizantinos, conviene añadir protecciones baratas contra mentiras accidentales:

- **Paquetes corruptos** por hardware, bugs del sistema operativo o drivers: los checksums de TCP y UDP a veces fallan en detectarlo. Un **checksum a nivel de aplicación** lo atrapa.
- **Entradas de usuarios**: una aplicación pública debe **validar** todo lo que recibe (valores razonables, tamaño de strings) para evitar denegación de servicio.
- **NTP con varios servidores**: el cliente consulta varios, estima sus errores y comprueba que la mayoría coincida en un rango; un servidor que se desvía mucho se detecta como atípico y se excluye.

### Modelos de sistema y la realidad

Para diseñar algoritmos distribuidos (y razonar sobre ellos) necesitamos formalizar qué fallos pueden ocurrir. Un **modelo de sistema** es una abstracción que describe qué puede asumir un algoritmo.

**Modelos de timing:**

| Modelo | Qué asume | Realismo |
| --- | --- | --- |
| **Síncrono** | Retraso de red, pausas de proceso y error de reloj **acotados** (no necesariamente cero, pero con un máximo conocido) | Poco realista para la mayoría de sistemas |
| **Parcialmente síncrono** | Se comporta como síncrono **la mayor parte del tiempo**, pero a veces excede los límites de forma arbitraria | **El más realista** |
| **Asíncrono** | No se puede asumir **nada** de tiempos; ni siquiera hay reloj (no hay timeouts) | Muy restrictivo |

**Modelos de fallo de nodo:**

| Modelo | Qué asume |
| --- | --- |
| **Crash-stop** | Un nodo solo falla deteniéndose; una vez caído, nunca vuelve |
| **Crash-recovery** | Un nodo puede caerse y volver tras un tiempo; conserva lo que guardó en almacenamiento estable, pierde la memoria |
| **Byzantine** | Un nodo puede hacer absolutamente cualquier cosa, incluido engañar |

Para sistemas reales, el modelo más útil suele ser **parcialmente síncrono con crash-recovery**.

#### Corrección: safety y liveness

Para definir qué significa que un algoritmo sea **correcto**, describimos sus **propiedades**. Para un algoritmo que genera fencing tokens:

- **Unicidad**: dos peticiones de token no reciben el mismo valor.
- **Secuencia monotónica**: si la petición x terminó antes de que empezara la y, el token de x es menor que el de y.
- **Disponibilidad**: un nodo que pide un token y no se cae, acaba recibiendo una respuesta.

Hay que distinguir dos tipos de propiedades:

- **Safety** (seguridad): "**nunca pasa nada malo**". Unicidad y monotonía son de safety. Si se violan, puedes señalar el momento exacto en que ocurrió (por ejemplo, cuando se devolvió un token duplicado), y la violación **no se puede deshacer**.
- **Liveness** (vivacidad): "**algo bueno acaba pasando**". La disponibilidad es de liveness. Suelen incluir la palabra "eventualmente" (la consistencia eventual es una propiedad de liveness). Puede que no se cumpla en un momento dado, pero siempre hay esperanza de que se cumpla después.

En los algoritmos distribuidos, es habitual exigir que **las propiedades de safety se cumplan siempre**, en todas las situaciones del modelo: aunque todos los nodos se caigan o la red falle entera, el algoritmo **nunca debe devolver un resultado incorrecto**. Para liveness se permiten salvedades: solo se exige una respuesta si la mayoría de nodos no se cayó y la red acabó recuperándose.

#### Mapear modelos a la realidad

Los modelos son simplificaciones. En crash-recovery se asume que lo guardado en almacenamiento estable sobrevive, pero ¿y si el disco se corrompe, se borra por error de firmware o el servidor no reconoce el disco al reiniciar? Los algoritmos teóricos a veces declaran que ciertas cosas **no pueden ocurrir**; en la práctica, el código debe manejarlas aunque sea con un `printf("Sucks to be you")` y `exit(666)`, dejando que un humano limpie. Ese es la diferencia entre ciencia de la computación e ingeniería de software. Aun así, el razonamiento abstracto es valioso: demostrar que un algoritmo es correcto en un modelo no garantiza que su implementación funcione, pero es un muy buen primer paso, y el testing empírico es igualmente importante.

### Ideas erróneas frecuentes

- **"Con NTP bien configurado, LWW es seguro."** Un incremento claramente posterior puede tener un timestamp anterior y perderse.
- **"Comprobé el lease justo antes de escribir, así que es válido."** Una pausa de GC entre la comprobación y la escritura invalida esa suposición.
- **"Un lock distribuido basta para proteger un recurso."** Sin fencing tokens comprobados por el recurso, un cliente pausado puede corromper datos.
- **"Si el nodo cree que es líder, lo es."** La verdad la define la mayoría, no el propio nodo.
- **"Necesito tolerancia bizantina en mi datacenter."** Normalmente no: todos los nodos son tuyos; usa autenticación, checksums y validación.

### Resumen

Depender de relojes sincronizados lleva a pérdidas silenciosas (LWW) salvo que se trabaje con intervalos de confianza, como TrueTime de Spanner. Cualquier proceso puede pausarse arbitrariamente (GC, VMs, I/O, swap), así que un nodo no puede confiar en su juicio: la verdad la decide un quorum. Para proteger recursos frente a nodos "zombies" se usan fencing tokens monotónicos comprobados por el recurso. Los fallos bizantinos importan en aeroespacial y blockchains, rara vez en un datacenter. Los algoritmos se diseñan para un modelo (normalmente parcialmente síncrono con crash-recovery) con propiedades de safety que siempre se cumplen y de liveness con salvedades.

## Conceptos clave

- **Last write wins (LWW)**: resolver conflictos por timestamp; pierde escrituras con relojes desfasados.
- **Reloj lógico**: contador que ordena eventos sin medir tiempo real.
- **Intervalo de confianza del reloj**: rango [earliest, latest] donde está la hora real.
- **TrueTime / commit wait**: API de Spanner que expone la incertidumbre y espera a que pase antes del commit.
- **Lease**: lock con tiempo de expiración que debe renovarse.
- **Process pause**: detención arbitraria de un proceso (GC, VM, I/O, swap, SIGSTOP).
- **Quorum**: votación de una mayoría que decide la verdad del sistema.
- **Fencing token**: número creciente que el recurso usa para rechazar escrituras de poseedores obsoletos del lock.
- **Fallo bizantino**: un nodo responde de forma arbitraria o maliciosa.
- **Modelo parcialmente síncrono**: tiempos acotados la mayoría del tiempo, con excepciones arbitrarias.
- **Crash-recovery**: los nodos pueden caerse y volver conservando el almacenamiento estable.
- **Safety / liveness**: "nada malo ocurre nunca" frente a "algo bueno acaba ocurriendo".

## Preguntas de repaso

1. ¿Por qué LWW puede perder un incremento aunque los relojes estén sincronizados a menos de 3 ms?
   R: Porque el nodo donde ocurrió la escritura posterior puede tener el reloj ligeramente atrasado y asignarle un timestamp menor que el de la escritura anterior; LWW se queda con el timestamp mayor y descarta en silencio la escritura causalmente posterior.
2. ¿Cómo usa Spanner los intervalos de confianza para ordenar transacciones?
   R: TrueTime devuelve [earliest, latest]; si los intervalos de dos transacciones no se solapan, su orden es seguro. Spanner espera la anchura del intervalo antes de confirmar (commit wait) para que las transacciones posteriores tengan intervalos que no se solapen, y usa GPS o relojes atómicos para que la espera sea de unos milisegundos.
3. ¿Por qué comprobar el lease justo antes de procesar una petición no es suficiente?
   R: Porque el proceso puede pausarse arbitrariamente (GC, migración de VM, I/O) entre la comprobación y el procesamiento; cuando se reanuda, el lease puede haber expirado y otro nodo puede ser líder, sin que el proceso lo sepa.
4. Explica cómo un fencing token evita la corrupción del archivo en el ejemplo del lock.
   R: El servicio de locks entrega un número creciente con cada lease; el cliente lo incluye en cada escritura y el almacenamiento rechaza las escrituras con un token menor que el mayor ya visto. El cliente pausado con token 33 es rechazado porque ya se escribió con token 34.
5. ¿Por qué la tolerancia bizantina no suele usarse en bases de datos de servidor?
   R: Porque todos los nodos los controla la misma organización, los protocolos son complejos y caros, requieren más de dos tercios de nodos correctos, y un atacante que comprometa un nodo probablemente comprometa todos porque corren el mismo software; las defensas tradicionales son más útiles.
6. Clasifica como safety o liveness: unicidad de tokens, consistencia eventual, "nunca hay dos líderes", "toda petición acaba respondiéndose".
   R: Unicidad de tokens y "nunca hay dos líderes" son safety (nada malo ocurre nunca; su violación tiene un instante concreto). Consistencia eventual y "toda petición acaba respondiéndose" son liveness (algo bueno acaba ocurriendo).
7. ¿Qué modelo de sistema es el más realista y por qué?
   R: El parcialmente síncrono con crash-recovery: las redes y procesos suelen comportarse con tiempos razonables pero a veces exceden cualquier límite, y los nodos se caen y vuelven conservando su almacenamiento estable.

## Ejercicio

Implementa en TypeScript una simulación del bug del lock y su arreglo:

1. `LockService` concede leases de 1 s con un `token` creciente. `Storage` acepta escrituras `write(data, token?)`.
2. Dos clientes compiten: el cliente 1 obtiene el lease, sufre una "pausa" simulada de 2 s (`await sleep(2000)`) y luego escribe; el cliente 2 obtiene el lease tras la expiración y escribe.
3. Versión sin fencing: el almacenamiento acepta todo. Muestra que el contenido final es del cliente 1 (el zombie).
4. Versión con fencing: el almacenamiento guarda `maxToken` y rechaza tokens menores. Muestra que la escritura del zombie se rechaza.
5. Escribe un test que repita el escenario 100 veces con pausas aleatorias entre 0 y 2 s y verifique la propiedad de safety: nunca se acepta una escritura con un token menor que otro ya aceptado.

Criterio de terminado: la versión sin fencing termina con el dato del zombie, la versión con fencing lo rechaza, y el test de safety pasa en las 100 repeticiones.

## Explícalo con tus palabras

Explica por qué un nodo "no puede fiarse de su propio juicio" usando el ejemplo del líder que vuelve de una pausa de GC de un minuto.
