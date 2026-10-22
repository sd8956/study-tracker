---
title: Linealizabilidad y el teorema CAP
kind: lesson
hours: 2
sources: Designing Data-Intensive Applications (Kleppmann), cap. 9 (pp. 343–361)
links: Jepsen, modelos de consistencia | https://jepsen.io/consistency/models/linearizable ; Martin Kleppmann, "Please stop calling databases CP or AP" | https://martin.kleppmann.com/2015/05/11/please-stop-calling-databases-cp-or-ap.html
---

## Objetivo

Entender la linealizabilidad (la ilusión de una sola copia de los datos), cómo distinguirla de la serializabilidad, cuándo la necesitas de verdad, qué modelos de replicación pueden ofrecerla y cuál es su coste según el teorema CAP y la latencia.

## Estudio

### Garantías de consistencia

Viste que en una base replicada, si miras dos réplicas al mismo tiempo, puedes ver datos distintos: las escrituras llegan a distintos nodos en distintos momentos. La mayoría de bases replicadas ofrecen al menos **consistencia eventual**: si dejas de escribir y esperas un tiempo indeterminado, todas las lecturas acabarán devolviendo el mismo valor. Un nombre mejor sería **convergencia**.

Es una garantía muy **débil**: no dice nada de **cuándo** convergen. Hasta entonces, las lecturas pueden devolver cualquier cosa o nada. Es difícil para los desarrolladores, porque se comporta muy distinto de una variable en un programa de un solo hilo: si asignas un valor y lo lees enseguida, no esperas leer el viejo. Los bugs de la consistencia eventual son sutiles y difíciles de detectar con tests, porque la aplicación funciona bien casi siempre; aparecen con fallos (red) o alta concurrencia.

Esta sesión explora **modelos de consistencia más fuertes**. Tienen un coste: peor rendimiento o menor tolerancia a fallos. Pero son más fáciles de usar correctamente. Ojo: los niveles de aislamiento de transacciones (sesiones 15–16) y los modelos de consistencia distribuida **se parecen pero son independientes**: el aislamiento trata de evitar race conditions entre transacciones concurrentes; la consistencia distribuida trata de coordinar el estado de las réplicas frente a retrasos y fallos.

### Linealizabilidad

En una base eventualmente consistente, si preguntas lo mismo a dos réplicas a la vez, puedes obtener respuestas distintas. ¿No sería más simple si la base diera la **ilusión de que solo hay una réplica**? Así cada cliente tendría la misma visión y no habría que preocuparse por el lag.

Esa es la idea de la **linealizabilidad** (también llamada *atomic consistency*, *strong consistency*, *immediate consistency* o *external consistency*): hacer que el sistema **parezca tener una sola copia de los datos y que todas las operaciones sobre ella sean atómicas**. En un sistema linealizable, en cuanto un cliente completa una escritura, **todos los clientes que lean deben ver el valor recién escrito**. Es una **garantía de recencia**: el valor leído es el más actual, no viene de un cache o réplica desactualizados.

#### El ejemplo del Mundial

Alice y Bob están en la misma habitación mirando el resultado de la final del Mundial de 2014 en sus móviles. Justo tras el pitido final, Alice recarga, ve el ganador y se lo dice a Bob. Bob, incrédulo, recarga su móvil, pero su petición va a una réplica atrasada que muestra el partido **en curso**.

```
tiempo ──────────────────────────────────────────────────────────────►
líder BD:      marcador final escrito ●
réplica 1:                              ● aplicado
réplica 2 (lag):                                                    ● aplicado
Alice:                    recarga ──► réplica 1 → "¡final: 1-0!"  "¡Bob, terminó!"
Bob:                                                  recarga ──► réplica 2 → "partido en curso"
```

Si hubieran recargado a la vez, obtener resultados distintos sería menos sorprendente: no sabrían exactamente cuándo se procesó cada petición. Pero Bob **sabe** que recargó **después** de oír a Alice, así que espera un resultado al menos tan reciente como el de ella. Que su consulta devolviera un resultado viejo es una **violación de la linealizabilidad**.

#### Qué hace linealizable a un sistema

En la literatura, la clave `x` se llama **registro** (*register*): en la práctica, una clave de un key-value store, una fila o un documento. Representamos cada petición como una barra: empieza cuando el cliente envía la petición y termina cuando recibe la respuesta. Por los retrasos de red, el cliente no sabe exactamente cuándo la base procesó su petición, solo que fue **en algún momento entre el envío y la respuesta**.

Ejemplo: `x` vale 0 y el cliente C escribe 1. Mientras tanto, A y B leen repetidamente.

```
cliente A:  [read x → 0]      [read x → ?]               [read x → 1 obligatorio]
cliente B:         [read x → ?]          [read x → ?]
cliente C:              [────── write x = 1 ──────]
                         ▲ inicio              ▲ fin
```

- La primera lectura de A termina **antes** de que empiece la escritura: debe devolver 0.
- La última lectura de A **empieza después** de que termine la escritura: en un sistema linealizable debe devolver 1.
- Las lecturas que **se solapan** con la escritura pueden devolver 0 o 1, porque son **concurrentes** con ella.

Pero eso no basta: si las lecturas concurrentes pudieran devolver 0 o 1 indistintamente, un lector podría ver el valor **oscilar** entre el viejo y el nuevo mientras dura la escritura. Eso no es lo que esperas de "una sola copia". Por eso se añade una restricción clave:

> **Una vez que una lectura devolvió el valor nuevo, todas las lecturas posteriores (de cualquier cliente) deben devolver también el valor nuevo**, aunque la escritura no haya terminado.

Intuitivamente, imagina que hay **un instante** en el que el valor de `x` cambia **atómicamente** de 0 a 1, en algún punto entre el inicio y el fin de la escritura. Una vez que alguien ve 1, el cambio ya ocurrió para todos.

```
              punto de linealización de la escritura
                         ▼
cliente C:  [────────────●──────────── write x=1 ──]
cliente A:        [read → 1]●               (A vio 1)
cliente B:                    [read → 0] ✘  (B empezó DESPUÉS de que A terminara de leer 1:
                                             viola linealizabilidad)
```

Se puede refinar con operaciones como **compare-and-set** (`cas(x, viejo, nuevo)`): la idea es que cada operación tiene un **punto de linealización** dentro de su barra, y el orden de esos puntos forma una secuencia válida en la que cada lectura devuelve el valor de la escritura más reciente. Comprobar si un historial de operaciones es linealizable se puede hacer (con coste computacional) registrando tiempos de todas las peticiones y respuestas: es lo que hacen herramientas como **Jepsen** y su checker *Knossos*.

#### Linealizabilidad frente a serializabilidad

Se confunden mucho porque ambas suenan a "se puede ordenar en secuencia". Son garantías **distintas**:

| | Serializabilidad | Linealizabilidad |
| --- | --- | --- |
| Es una propiedad de | **Transacciones** (que pueden leer y escribir varios objetos) | **Lecturas y escrituras de un registro** (un objeto) |
| Garantiza | El resultado equivale a **algún** orden serial de transacciones (no necesariamente el orden real) | Recencia: el valor leído es el más reciente según el **tiempo real** |
| Agrupa operaciones | Sí | No; no evita problemas como el write skew |

Una base puede ofrecer ambas: **strict serializability** o *strong one-copy serializability*. Las implementaciones con 2PL o ejecución serial real suelen ser linealizables. **SSI no es linealizable** por diseño: lee de un snapshot consistente que no incluye escrituras más recientes que el snapshot.

### Cuándo necesitas linealizabilidad

En el sitio deportivo, que Bob vea el resultado unos segundos tarde no es grave. Pero hay áreas donde la linealizabilidad es un requisito para que el sistema funcione bien.

#### Locks y elección de líder

Un sistema con replicación de un solo líder debe asegurar que **solo haya un líder** (sin split brain). Una forma de elegirlo es con un **lock**: cada nodo que arranca intenta adquirirlo y el que lo consigue es el líder. Este lock debe ser **linealizable**: todos los nodos deben estar de acuerdo en quién lo tiene.

Servicios de coordinación como **Apache ZooKeeper** y **etcd** se usan a menudo para locks distribuidos y elección de líder. Usan algoritmos de consenso para implementar operaciones linealizables de forma tolerante a fallos. Librerías como **Apache Curator** añaden recetas de alto nivel sobre ZooKeeper. Kubernetes usa etcd (y sus *leases*) para elegir el líder de sus controladores. Las bases particionadas como Oracle RAC también usan locks linealizables por página de disco.

#### Restricciones de unicidad y garantías

Las restricciones de unicidad son comunes: un nombre de usuario o email debe identificar a un solo usuario; en un servicio de almacenamiento no puede haber dos archivos con la misma ruta. Para aplicarlas al escribir los datos, necesitas linealizabilidad.

La situación se parece a un lock: cuando un usuario registra un nombre, es como si adquiriera un lock sobre él. La operación se parece mucho a un compare-and-set atómico: asignar el nombre al usuario solo si no está ya tomado.

Problemas parecidos: que el saldo de una cuenta **nunca sea negativo**, no vender más productos de los que hay en almacén, que dos personas no reserven el **mismo asiento** en un vuelo o teatro. Todos necesitan un valor actualizado en el que todos los nodos estén de acuerdo. En la práctica, a veces se pueden tratar estas restricciones de forma más laxa (por ejemplo, si un vuelo se sobrevende, mover a alguien a otro vuelo y compensarlo). En esos casos, la linealizabilidad no es necesaria (lo retoma el repaso de integración de la sesión 25).

Una restricción de unicidad dura, como la que impones con una clave primaria en una base relacional, **sí requiere linealizabilidad**. Otras restricciones como foreign keys o atributos no la requieren necesariamente.

#### Dependencias entre canales de comunicación

En el ejemplo de Alice y Bob, la violación solo se notó porque había un **canal adicional** de comunicación (la voz de Alice a los oídos de Bob). Lo mismo pasa en sistemas reales. Ejemplo: un sitio donde los usuarios suben una foto y un proceso en segundo plano la redimensiona para descargas más rápidas.

```
                                        1. guardar imagen completa
web server ──────────────────────────────────────────────────────► file storage
     │                                                                  ▲
     │ 2. enviar mensaje "redimensiona foto 123"                        │ 4. leer imagen
     ▼                                                                  │
 cola de mensajes ──────────── 3. entregar ──────────────► resizer ─────┘
                                                              │ 5. guardar miniatura
```

El servidor web escribe la foto en el almacenamiento de archivos y luego pone un mensaje en la cola. Si el almacenamiento **no es linealizable**, hay una race condition: la cola (pasos 2 y 3) puede ser **más rápida** que la replicación interna del almacenamiento. El redimensionador puede leer una versión **vieja** de la imagen, o ninguna. Si procesa una versión vieja, la miniatura y la imagen completa quedan **permanentemente inconsistentes**.

El problema surge porque hay **dos canales** distintos entre el servidor web y el redimensionador: el almacenamiento y la cola. Sin la garantía de recencia de la linealizabilidad, son posibles race conditions entre ambos. Puedes evitarlas con linealizabilidad o con otras técnicas (como leer tu propia escritura incluyendo la versión en el mensaje), pero la linealizabilidad es la más simple de entender.

### Implementar sistemas linealizables

Como la linealizabilidad significa "comportarse como si hubiera una sola copia de los datos y todas las operaciones fueran atómicas", la respuesta más simple sería **usar una sola copia**. Pero eso no tolera fallos. Revisemos los métodos de replicación:

| Replicación | ¿Linealizable? | Por qué |
| --- | --- | --- |
| **Single-leader** | **Potencialmente** | Si lees del líder o de seguidores actualizados síncronamente. Pero un líder que *cree* serlo y no lo es (split brain), o la replicación asíncrona con failover que pierde escrituras confirmadas, rompen la linealizabilidad. Snapshot isolation tampoco lo es. |
| **Algoritmos de consenso** | **Sí** | Se parecen a single-leader, pero incluyen medidas contra split brain y réplicas obsoletas. ZooKeeper y etcd lo hacen. |
| **Multi-leader** | **No** | Procesan escrituras concurrentemente en varios nodos y las replican asíncronamente: producen conflictos. |
| **Leaderless (Dynamo-style)** | **Probablemente no** | LWW basado en relojes no es linealizable (por el desfase de relojes); los sloppy quorums arruinan cualquier opción; incluso con quorums estrictos hay casos no linealizables. |

#### Linealizabilidad y quorums

Intuitivamente, con quorums estrictos (`w + r > n`) parecería que obtienes linealizabilidad. Pero con retrasos de red variables puede haber race conditions:

```
n = 3, w = 3, r = 2.  x vale 0.  El escritor envía x = 1 a las 3 réplicas.

réplica 1:  recibe x=1 pronto
réplica 2:  recibe x=1 tarde
réplica 3:  recibe x=1 tarde

lector A (quorum réplicas 1 y 2): ve 1 y 0 → devuelve 1
lector B (quorum réplicas 2 y 3, empieza DESPUÉS de que A terminó): ve 0 y 0 → devuelve 0  ✘
```

El quorum se cumple (`w + r > n`), pero la ejecución **no es linealizable**: B lee después de A y obtiene un valor más viejo. Es posible hacer linealizable un sistema Dynamo-style a costa de rendimiento: el lector debe hacer **read repair síncrono** antes de devolver resultados, y el escritor debe leer el estado más reciente de un quorum antes de escribir. Riak no hace read repair síncrono por su coste; Cassandra **sí espera** a que el read repair termine en lecturas con quorum, pero pierde linealizabilidad si hay escrituras concurrentes sobre la misma clave por usar LWW. Además, solo así se logran lecturas y escrituras linealizables, **no** un compare-and-set linealizable, que requiere consenso. En resumen: **lo más seguro es asumir que un sistema leaderless Dynamo-style no da linealizabilidad**.

### El coste de la linealizabilidad

Algunos métodos de replicación pueden ofrecer linealizabilidad y otros no. Pensemos en sus pros y contras con un despliegue en **dos datacenters** y una **interrupción de red** entre ellos (cada datacenter sigue funcionando y los clientes pueden alcanzar su datacenter, pero los datacenters no se ven).

- Con **multi-líder**, cada datacenter sigue funcionando normalmente: las escrituras se encolan y se intercambian cuando vuelve la conexión.
- Con **single-leader**, el líder está en uno de los datacenters. Cualquier escritura y cualquier lectura linealizable debe ir al líder. Los clientes del datacenter de los seguidores **no pueden escribir ni leer de forma linealizable**: quedan **no disponibles** mientras dure el corte. Pueden leer de los seguidores, pero quizá datos viejos.

#### El teorema CAP

Esto no es exclusivo de single-leader y multi-leader: **cualquier base linealizable** tiene este problema, sin importar cómo se implemente. El trade-off es:

- Si tu aplicación **requiere linealizabilidad** y algunas réplicas quedan desconectadas de las demás por un problema de red, esas réplicas **no pueden procesar peticiones** mientras estén desconectadas: deben esperar a que se arregle la red o devolver error. En ambos casos, **no están disponibles**.
- Si tu aplicación **no requiere linealizabilidad**, puede escribirse de forma que cada réplica procese peticiones de forma independiente aunque esté desconectada (como multi-líder). La aplicación sigue **disponible** ante un problema de red, pero su comportamiento **no es linealizable**.

Así, las aplicaciones que no requieren linealizabilidad toleran mejor los problemas de red. Esta idea se conoce como el **teorema CAP**, propuesto por Eric Brewer en 2000 (con antecedentes desde los años 70). Tuvo un gran impacto cultural: animó a los ingenieros a explorar diseños de bases no linealizables (el movimiento NoSQL).

CAP se presenta a veces como "**Consistencia, Disponibilidad, tolerancia a Particiones: elige 2 de 3**". Es **engañoso**: las particiones de red son un tipo de fallo, **no algo que elijas**: van a ocurrir quieras o no. Cuando la red funciona, un sistema puede dar consistencia (linealizabilidad) y disponibilidad total. Cuando hay un fallo de red, **tienes que elegir** entre linealizabilidad y disponibilidad total. Una forma mejor de enunciarlo: **"consistente o disponible cuando hay una partición"**. Una red más fiable reduce la frecuencia de la elección, pero no la elimina.

Además, CAP como teorema formal tiene un alcance **muy estrecho**: solo considera **un** modelo de consistencia (linealizabilidad) y **un** tipo de fallo (particiones de red, es decir, nodos vivos pero desconectados). No dice nada de retrasos de red, nodos caídos u otros trade-offs. Aunque fue históricamente influyente, **tiene poco valor práctico para diseñar sistemas**. Muchos sistemas no son ni linealizables ni "disponibles" en el sentido de CAP (que define disponibilidad de forma muy particular), así que etiquetarlos como "CP" o "AP" no aclara mucho. Hay resultados de imposibilidad más precisos que lo superan.

#### Linealizabilidad y retrasos de red

Aunque la linealizabilidad es útil, **pocos sistemas son linealizables en la práctica**. Ejemplo sorprendente: **la RAM de una CPU multinúcleo moderna no es linealizable**. Si un hilo en un núcleo escribe en una dirección de memoria y otro hilo en otro núcleo la lee justo después, no está garantizado que lea el valor escrito, salvo que uses una **memory barrier** o *fence*. Cada núcleo tiene su propia cache y su buffer de escritura; la memoria se accede primero en la cache, y los cambios se escriben a la memoria principal asíncronamente. Como acceder a la cache es mucho más rápido, esto es esencial para el rendimiento. Hay varias copias de los datos (memoria principal y caches) replicadas asíncronamente: se pierde la linealizabilidad.

¿Por qué este trade-off? No tiene sentido usar CAP aquí: no esperas que un núcleo siga funcionando desconectado del resto del ordenador. La razón de abandonar la linealizabilidad es el **rendimiento**, no la tolerancia a fallos.

Lo mismo pasa con muchas bases distribuidas que no dan garantías linealizables: lo hacen principalmente **para mejorar el rendimiento**. La linealizabilidad es **lenta**, y eso es cierto siempre, no solo durante fallos de red. Se ha demostrado (Attiya y Welch) que si quieres linealizabilidad, el tiempo de respuesta de lecturas y escrituras es **al menos proporcional a la incertidumbre de los retrasos de red**. En una red con retrasos muy variables (como la mayoría de redes de ordenadores), la respuesta de las operaciones linealizables será inevitablemente alta. No existe un algoritmo más rápido para la linealizabilidad, pero los modelos de consistencia más débiles pueden ser mucho más rápidos, lo cual es importante para sistemas sensibles a la latencia. En la próxima sesión verás formas de evitar la linealizabilidad sin sacrificar la corrección.

### Ideas erróneas frecuentes

- **"Linealizabilidad y serializabilidad son lo mismo."** Una es recencia sobre un objeto; la otra, orden serial equivalente de transacciones.
- **"Con quorums estrictos tengo linealizabilidad."** Los retrasos variables permiten que una lectura posterior vea un valor más viejo.
- **"CAP dice que elijo 2 de 3."** Las particiones no se eligen; solo eliges qué sacrificar cuando ocurren.
- **"Mi base es AP o CP."** CAP es demasiado estrecho; muchas bases no encajan en ninguna etiqueta.
- **"Los sistemas renuncian a la linealizabilidad por los fallos de red."** Muchas veces lo hacen por rendimiento y latencia, como las caches de CPU.

### Resumen

La linealizabilidad hace que un sistema replicado parezca tener una sola copia con operaciones atómicas: es una garantía de recencia en tiempo real, distinta de la serializabilidad. Se necesita para elegir líder y locks, restricciones de unicidad y para evitar races entre canales de comunicación. Se puede implementar con single-leader (con cuidado) y con consenso, no con multi-leader y probablemente no con leaderless. Su coste: ante un fallo de red debes elegir entre consistencia y disponibilidad (CAP, con sus limitaciones) y, siempre, una latencia proporcional a la incertidumbre de la red.

## Conceptos clave

- **Consistencia eventual (convergencia)**: las réplicas acaban coincidiendo sin cota de tiempo.
- **Linealizabilidad**: ilusión de una sola copia con operaciones atómicas; garantía de recencia.
- **Registro (register)**: objeto único (clave, fila, documento) sobre el que se razona la linealizabilidad.
- **Punto de linealización**: instante, dentro de la duración de una operación, en que surte efecto.
- **Strict serializability**: serializabilidad más linealizabilidad.
- **Elección de líder con lock**: usar un lock linealizable para que solo haya un líder.
- **Cross-channel timing dependency**: race condition entre dos canales de comunicación distintos.
- **Teorema CAP**: ante una partición de red, elegir entre linealizabilidad y disponibilidad.
- **Memory barrier (fence)**: instrucción que fuerza la visibilidad de escrituras entre núcleos.
- **Coste de latencia**: el tiempo de respuesta linealizable es proporcional a la incertidumbre de los retrasos de red.

## Preguntas de repaso

1. ¿Por qué el caso de Alice y Bob viola la linealizabilidad pero no la violaría si hubieran recargado a la vez?
   R: Porque Bob inició su consulta después de que la de Alice terminara (lo supo por su voz), así que esperaba un resultado al menos tan reciente; recibir uno más viejo viola la recencia. Si hubieran sido concurrentes, cualquiera de los dos resultados sería aceptable.
2. ¿Qué restricción añade la linealizabilidad a las lecturas concurrentes con una escritura?
   R: Que una vez que cualquier lectura devolvió el valor nuevo, todas las lecturas que empiecen después deben devolver también el valor nuevo, aunque la escritura no haya terminado; el valor no puede oscilar entre viejo y nuevo.
3. Diferencia linealizabilidad y serializabilidad.
   R: La serializabilidad es una propiedad de aislamiento de transacciones que tocan varios objetos: el resultado equivale a algún orden serial. La linealizabilidad es una garantía de recencia sobre lecturas y escrituras de un objeto individual según el tiempo real. Juntas forman strict serializability; SSI es serializable pero no linealizable.
4. Explica la race condition entre el almacenamiento de archivos y la cola del redimensionador.
   R: El servidor escribe la imagen y luego envía un mensaje por la cola; si el almacenamiento no es linealizable, el mensaje puede llegar al redimensionador antes de que la nueva versión esté visible en la réplica que lee, que procesa una imagen vieja o ninguna, dejando miniatura e imagen inconsistentes.
5. ¿Por qué un sistema leaderless con w + r > n puede no ser linealizable?
   R: Porque con retrasos variables una escritura puede haber llegado a algunas réplicas y no a otras; un lector puede leer de un quorum que incluye la réplica actualizada y ver el valor nuevo, y otro lector posterior puede leer de un quorum que no la incluye y ver el valor viejo.
6. ¿Por qué el resumen "elige 2 de 3" del teorema CAP es engañoso?
   R: Porque las particiones de red no son opcionales: ocurren. Cuando la red funciona puedes tener consistencia y disponibilidad; solo cuando hay una partición debes elegir entre linealizabilidad y disponibilidad. Además, CAP solo considera un modelo de consistencia y un tipo de fallo.
7. ¿Por qué muchas bases renuncian a la linealizabilidad incluso sin fallos de red?
   R: Por rendimiento: se ha demostrado que la latencia de operaciones linealizables es al menos proporcional a la incertidumbre de los retrasos de red, así que en redes con retrasos variables es inevitablemente lenta; los modelos más débiles son mucho más rápidos.

## Ejercicio

Escribe en TypeScript un **checker de linealizabilidad** para un registro:

1. Representa un historial como una lista de operaciones `{client, type: "read"|"write", value, start, end}`.
2. Implementa `isLinearizable(history)` con búsqueda exhaustiva (backtracking): en cada paso elige una operación aún no linealizada cuyo `start` sea anterior al menor `end` de las pendientes, aplícala al estado del registro y comprueba que cada lectura devuelve el valor actual.
3. Crea tres historiales de prueba: el del Mundial (debe fallar), uno con una lectura concurrente que devuelve el valor viejo (debe pasar) y el del quorum n = 3, w = 3, r = 2 de la lección (debe fallar).
4. Genera historiales con tu simulador del proyecto 13 (lecturas de seguidores con lag) y comprueba cuántos son linealizables con la política `random` y cuántos con `leader-only`.

Criterio de terminado: los tres historiales del punto 3 dan el resultado esperado y el punto 4 muestra 100 % linealizables con `leader-only` y menos con `random`.

## Explícalo con tus palabras

Explica por qué las caches de tu CPU tampoco son linealizables y qué te dice eso sobre por qué las bases distribuidas eligen consistencia débil.
