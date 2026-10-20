---
title: CAP, PACELC y patrones de consistencia
kind: lesson
hours: 2
sources: System Design Primer, "Availability vs consistency" (CAP, CP, AP) y "Consistency patterns" | karanpratapsingh/system-design, cap. II "ACID and BASE consistency models", "CAP Theorem" y "PACELC Theorem" | System Design Interview (Alex Xu), cap. 6, "CAP theorem" (pp. 88–91)
links: Primer — Availability vs consistency | https://github.com/donnemartin/system-design-primer#availability-vs-consistency ; Primer — Consistency patterns | https://github.com/donnemartin/system-design-primer#consistency-patterns ; Karan — ACID and BASE | https://github.com/karanpratapsingh/system-design#acid-and-base-consistency-models ; Karan — CAP Theorem | https://github.com/karanpratapsingh/system-design#cap-theorem ; Karan — PACELC Theorem | https://github.com/karanpratapsingh/system-design#pacelc-theorem
---

## Objetivo

Usar CAP y PACELC como herramientas de decisión de producto: identificar qué datos de un sistema exigen consistencia fuerte y cuáles toleran consistencia eventual, elegir el patrón de consistencia adecuado y explicar el costo en disponibilidad y latencia de cada elección.

## Estudio

### De la teoría a la decisión

En DDIA estudiaste con rigor la linealizabilidad, los modelos de consistencia y por qué el teorema CAP es más sutil de lo que parece. En diseño de sistemas, CAP cumple otra función: es un **vocabulario para negociar con el producto**. Cuando dices "este dato es AP", estás diciendo "durante una falla de red, preferimos responder con un dato posiblemente viejo antes que no responder". Esa es una decisión de negocio, no solo técnica. Esta sesión te enseña a tomarla dato por dato.

### Las tres propiedades, en lenguaje de diseño

- **Consistencia (C)**: todos los clientes ven los mismos datos al mismo tiempo, sin importar a qué nodo se conecten. Una lectura devuelve la escritura más reciente o un error. Para lograrlo, una escritura debe propagarse a los nodos necesarios antes de confirmarse.
- **Disponibilidad (A)**: toda petición a un nodo que no está caído recibe una respuesta (no un error), aunque no necesariamente con el dato más reciente.
- **Tolerancia a particiones (P)**: el sistema sigue operando aunque se pierdan mensajes entre nodos.

El teorema dice que, ante una partición, no puedes tener C y A a la vez. Como en un sistema distribuido real las particiones **ocurren** (cables, switches, configuraciones, pausas de GC largas que parecen particiones), P no es opcional. La elección real es: **cuando hay partición, ¿consistencia o disponibilidad?**

### Un ejemplo con tres réplicas

Imagina un dato replicado en tres nodos, `n1`, `n2` y `n3`. Un problema de red aísla a `n3`:

```
     [n1] ←──→ [n2]
       ╲        ╱
        ╳      ╳      ← partición: n3 no recibe nada
         [n3]
```

Un cliente escribe en `n1` el valor nuevo `v2`; se replica a `n2`, pero no puede llegar a `n3`. Otro cliente lee desde `n3`, que todavía tiene `v1`. ¿Qué debe hacer `n3`?

- **Elección CP**: `n3` sabe (o sospecha) que puede estar desactualizado y **rechaza** la lectura o la escritura con un error o un timeout. El sistema es consistente pero parcialmente no disponible. Además, para mantener la consistencia, el sistema puede bloquear escrituras que no alcancen a la mayoría.
- **Elección AP**: `n3` **responde** con `v1`. El cliente recibe un dato viejo, pero recibe algo. Las escrituras que acepte `n3` durante la partición se reconcilian cuando la red se recupere (con *last write wins*, versiones vectoriales o lógica de la aplicación).

¿Y "CA"? Un sistema que no tolera particiones solo existe si no hay red entre nodos: una base de datos en una sola máquina. Por eso se dice a veces que PostgreSQL de un solo nodo es "CA": no hay partición posible porque no hay distribución. En cuanto replicas, vuelves a elegir.

### Decidir con el negocio: ejemplos

La pregunta útil es: **¿qué es peor para este dato, mostrar algo viejo o no mostrar nada?**

| Dato | Peor caso si es viejo | Peor caso si no responde | Elección |
| --- | --- | --- | --- |
| Saldo de una cuenta al transferir | Doble gasto, pérdida de dinero | El usuario reintenta más tarde | CP |
| Stock del último ítem en una venta flash | Vender dos veces lo mismo | El usuario no compra ahora | CP (o reservar con consistencia fuerte) |
| Contador de "me gusta" | Ver 1.203 en vez de 1.205 | Página rota | AP |
| Timeline de una red social | Un post aparece segundos tarde | Feed vacío | AP |
| Carrito de compras | Un ítem reaparece tras borrarlo | No puedes agregar ítems: pierdes la venta | AP (la tienda prefiere aceptar siempre) |
| Unicidad de nombre de usuario | Dos usuarios con el mismo nombre | No puedes registrarte unos segundos | CP |
| Configuración del sistema, elección de líder | Dos líderes (split brain) | Se espera a que haya mayoría | CP |

Fíjate en que **un mismo sistema mezcla elecciones**. Una tienda online es AP para el catálogo, las reseñas y el carrito, y CP para pagos e inventario crítico. Diseñar bien es separar esos datos en almacenamientos (o en configuraciones) con garantías distintas.

### PACELC: lo que CAP no dice

CAP solo habla de lo que pasa **durante** una partición, que es poco frecuente. PACELC completa el cuadro:

```
 Si hay Partición (P): elige entre Availability (A) y Consistency (C)
 Else (E), en operación normal: elige entre Latency (L) y Consistency (C)
```

Incluso sin fallos, mantener consistencia fuerte exige coordinación: esperar a que una mayoría de réplicas confirme, o enviar todas las lecturas al líder. Eso cuesta latencia, sobre todo entre regiones (decenas o cientos de milisegundos por ida y vuelta). Mientras que CAP te dice que un sistema "disponible" podría responder en 30 días, PACELC te recuerda que la latencia también es un costo real y cotidiano.

Clasificaciones típicas:

| Sistema | Ante partición | En operación normal | Etiqueta |
| --- | --- | --- | --- |
| Dynamo, Cassandra (configuración típica) | Disponibilidad | Latencia | PA/EL |
| Bases con consenso (etcd, Spanner, bases NewSQL) | Consistencia | Consistencia | PC/EC |
| MongoDB (configuración por defecto) | Consistencia | Consistencia o latencia según la configuración | PC/EC (ajustable) |
| Bases con réplicas asíncronas y lecturas en réplicas | Disponibilidad para lecturas | Latencia | PA/EL para lecturas |

Muchas bases modernas permiten **ajustar** la consistencia por operación: en Cassandra eliges el nivel de consistencia (`ONE`, `QUORUM`, `ALL`) en cada consulta; en DynamoDB eliges lectura eventual (más barata y rápida) o fuerte.

### Quórums: la consistencia ajustable en una fórmula

Con N réplicas, si una escritura espera confirmación de W réplicas y una lectura consulta R réplicas:

```
 Si W + R > N  → toda lectura se solapa con al menos una réplica que tiene la última escritura
                 (consistencia fuerte en el sentido de quórum, con matices que viste en DDIA)
 Si W + R ≤ N  → las lecturas pueden no ver la última escritura (eventual), pero son más rápidas
```

| Configuración (N=3) | Comportamiento |
| --- | --- |
| W=1, R=3 | Escrituras rápidas, lecturas lentas |
| W=3, R=1 | Lecturas rápidas, escrituras lentas y frágiles (una réplica caída bloquea escrituras) |
| W=2, R=2 | Equilibrio común; tolera una réplica caída |
| W=1, R=1 | Muy rápido, eventual |

Lo usarás directamente al diseñar el key-value store en la sesión 17.

### Un cálculo de latencia: qué cuesta la consistencia fuerte

Supón un servicio con tres réplicas en tres zonas de la misma región (RTT entre zonas ≈ 1–2 ms) y otra configuración con tres réplicas en tres regiones (RTT ≈ 70–150 ms).

- **Misma región, W=2**: la escritura espera la confirmación de la réplica más rápida de las otras dos: ≈ 2 ms extra. Barato: la consistencia fuerte casi no se nota.
- **Tres regiones, W=2**: la escritura espera a la región más cercana de las otras dos: ≈ 70 ms extra por escritura. Si una página hace 5 escrituras en serie, son 350 ms: el usuario lo nota.
- **Tres regiones, W=1 (asíncrono)**: la escritura responde en la región local en ≈ 2 ms, pero un fallo de esa región puede perder las últimas escrituras y otra región puede leer datos viejos durante ~100 ms o más.

La conclusión práctica es que la consistencia fuerte **dentro de una región** es casi gratis y suele valer la pena; la consistencia fuerte **entre regiones** es cara y debe reservarse para los datos que realmente la necesitan. Además, reduce el número de escrituras en serie: agrupar varias en una sola transacción o en un solo viaje convierte 5 RTT en 1.

### Patrones de consistencia

Con varias copias de un dato, hay tres grandes formas de sincronizarlas:

**Consistencia débil**. Tras una escritura, las lecturas pueden verla o no; se hace un esfuerzo razonable sin garantía. Ejemplos: Memcached, VoIP, videollamadas, juegos multijugador en tiempo real. Si pierdes la señal unos segundos en una llamada, no recuperas lo que se dijo: simplemente sigues desde ahora.

**Consistencia eventual**. Tras una escritura, las lecturas **terminarán** viéndola (normalmente en milisegundos o segundos), porque los datos se replican de forma asíncrona. Ejemplos: DNS, email, la mayoría de feeds sociales, réplicas de lectura. Es el patrón por defecto de los sistemas altamente disponibles.

**Consistencia fuerte**. Tras una escritura, todas las lecturas la ven. Los datos se replican de forma síncrona o se coordinan por consenso. Ejemplos: bases relacionales de un solo líder (si lees del líder), sistemas de archivos, etcd/ZooKeeper. Necesaria cuando hay transacciones o invariantes de negocio.

Entre eventual y fuerte hay garantías intermedias muy útiles en productos (las viste formalmente en DDIA; aquí, para qué sirven):

- **Read-your-writes**: un usuario siempre ve sus propias escrituras. Evita "publiqué un comentario y desapareció". Implementación típica: leer del líder durante unos segundos tras escribir, o enrutar al usuario a una réplica que ya tenga su versión.
- **Monotonic reads**: un usuario nunca ve "retroceder el tiempo" (ver un comentario y luego dejar de verlo al refrescar). Implementación: fijar al usuario a una réplica.
- **Consistent prefix**: si B responde a A, nadie ve B sin ver A. Importa en chats y en hilos de comentarios.

En muchas situaciones, eventual más read-your-writes da una experiencia indistinguible de la consistencia fuerte para el usuario, con mucho menos costo.

### ACID frente a BASE

Dos filosofías que resumen los extremos:

- **ACID** (atomicidad, consistencia, aislamiento, durabilidad): todas las operaciones de una transacción ocurren o ninguna; la base queda válida; las transacciones parecen ejecutarse en serie; lo confirmado sobrevive a caídas. Es el mundo de las bases relacionales.
- **BASE** (*Basically Available, Soft state, Eventual consistency*): el sistema responde casi siempre; el estado puede cambiar sin nuevas entradas mientras converge; las réplicas terminan coincidiendo. Es el mundo de muchos stores NoSQL distribuidos.

No hay un ganador. BASE da escala y resiliencia, pero traslada al desarrollador la responsabilidad de manejar inconsistencias (conflictos, duplicados, lecturas viejas). ACID es más simple de razonar y es la elección correcta cuando la confiabilidad del dato es esencial. Un error frecuente es elegir BASE "porque escala" para datos que en realidad caben en una base ACID y necesitan sus garantías.

### Cómo manejar la inconsistencia cuando eliges AP

Elegir disponibilidad no significa ignorar la inconsistencia; significa **diseñar para ella**:

1. **Operaciones conmutativas**: un contador que solo suma (`+1`) converge sin importar el orden. Los CRDTs generalizan esta idea a sets, mapas y textos colaborativos.
2. **Reconciliación de conflictos**: last write wins (simple, pierde datos), versionado con vector clocks (detecta conflictos y deja que la aplicación decida), o fusión semántica (el carrito une ítems de ambas versiones).
3. **Compensaciones**: si se vendió dos veces el mismo ítem, cancelar un pedido con disculpas y un cupón. Muchas empresas prefieren esto a rechazar ventas.
4. **Expectativas en la interfaz**: mostrar "procesando" o "enviado" en lugar de prometer un estado final inmediato.

### Consistencia entre regiones: tres patrones

Cuando un sistema vive en varias regiones (sesión 01), PACELC deja de ser teoría: la luz tarda unos 70–80 ms en ir y volver entre América y Europa por fibra, y eso es un piso físico. Hay tres patrones habituales:

1. **Líder único global**: todas las escrituras van a una región; las demás tienen réplicas de lectura. Consistencia simple, pero los usuarios lejanos pagan el RTT intercontinental en cada escritura, y si cae la región líder, hay que promover otra (con posible pérdida de escrituras asíncronas).
2. **Datos con "región dueña"** (home region): cada usuario o entidad tiene una región dueña donde se escriben sus datos. Un usuario de Colombia escribe en la región de América; uno de España, en Europa. La mayoría de las operaciones son locales y consistentes; las que cruzan entidades de distintas regiones son más lentas. Es el patrón más común en productos globales.
3. **Multi-líder o sin líder entre regiones**: cada región acepta escrituras de cualquier dato y se replican de forma asíncrona. Latencia mínima y máxima disponibilidad (PA/EL), a cambio de **conflictos** que hay que resolver (sección siguiente). Adecuado para datos que admiten fusión: contadores, carritos, presencia.

Existe una cuarta vía, las bases distribuidas con consenso multi-región (estilo Spanner), que ofrecen consistencia fuerte global pagando la latencia del quórum entre regiones en cada escritura. Son la elección cuando el negocio exige consistencia fuerte global y acepta ese costo.

### Cómo escribir la consistencia en un design doc

Una sección de consistencia útil no dice "usamos consistencia eventual". Dice, para cada dato importante:

```
 Dato: inventario de un producto
 Fuente de verdad: tabla inventory en PostgreSQL (shard por product_id)
 Garantía de escritura: transacción ACID con condición available >= qty
 Garantía de lectura: búsqueda → cache 60 s (eventual); checkout → líder (fuerte)
 Durante una partición: el checkout del shard afectado devuelve 503 y se reintenta
 Inconsistencia tolerada: la búsqueda puede mostrar stock hasta 60 s desactualizado
 Reconciliación: no aplica (CP)
```

Este formato obliga a responder las preguntas que el equipo hará en producción: de dónde se lee, qué se ve cuando algo falla y cuánta obsolescencia se tolera. Lo vas a reutilizar en los proyectos de 3 horas.

### Modos de fallo y malentendidos comunes

- **"Elijo CA"**: en un sistema distribuido no es una opción real; en cuanto hay red entre nodos, hay particiones.
- **Confundir la C de CAP con la C de ACID**: la de CAP habla de réplicas que coinciden (linealizabilidad); la de ACID, de invariantes de la aplicación (por ejemplo, "el saldo no es negativo").
- **Split brain**: dos nodos creen ser líderes durante una partición y aceptan escrituras contradictorias. Los sistemas CP lo evitan exigiendo mayoría (quórum) para actuar.
- **Lecturas de réplicas en flujos críticos**: verificar el saldo leyendo de una réplica atrasada y aprobar un pago que no debía aprobarse.
- **Consistencia fuerte multi-región sin medir la latencia**: cada escritura paga un viaje entre continentes.
- **Cache que rompe la garantía**: la base es CP, pero una cache delante con TTL de 5 minutos convierte las lecturas en eventuales sin que nadie lo haya decidido. La garantía del sistema es la del eslabón más débil del camino de lectura.

### Un ejercicio resuelto: una plataforma de reservas de hotel

Datos y decisiones:

1. **Disponibilidad de habitaciones al buscar**: AP, con cache de minutos. Mostrar "quedan 3" cuando quedan 2 es aceptable en la búsqueda.
2. **Reserva final**: CP. Se usa una transacción en la base del hotel (un solo shard por hotel) que decrementa el inventario con una condición (`WHERE available > 0`). Si la base no está disponible, se rechaza la reserva y se pide reintentar.
3. **Reseñas y fotos**: AP, eventual; aparecen en segundos.
4. **Confirmación por email**: asíncrona vía cola; la reserva ya es válida aunque el email tarde.
5. **Experiencia del usuario**: tras reservar, read-your-writes en "Mis reservas" para que vea su reserva de inmediato aunque el listado general venga de réplicas.

Resultado: la consistencia fuerte se paga solo en el 1 % de las operaciones que lo necesita (la reserva); el 99 % restante disfruta de baja latencia y alta disponibilidad.

## Conceptos clave

- **CAP**: ante una partición, un sistema distribuido debe elegir entre consistencia y disponibilidad.
- **CP**: rechaza o bloquea operaciones durante una partición para no devolver datos inconsistentes.
- **AP**: siempre responde, aunque el dato pueda estar desactualizado, y reconcilia después.
- **PACELC**: además, en operación normal se elige entre latencia y consistencia.
- **Quórum (W + R > N)**: condición para que lecturas y escrituras se solapen en al menos una réplica.
- **Consistencia débil**: sin garantía de que una lectura vea una escritura.
- **Consistencia eventual**: las réplicas convergen con el tiempo si no hay nuevas escrituras.
- **Consistencia fuerte**: toda lectura ve la última escritura confirmada.
- **Read-your-writes**: un usuario siempre ve lo que él mismo escribió.
- **BASE**: disponibilidad básica, estado blando y consistencia eventual.

## Preguntas de repaso

1. ¿Por qué se dice que en un sistema distribuido la elección real es entre C y A?
   R: Porque las particiones de red ocurren inevitablemente (fallos de red, configuraciones, pausas largas), así que la tolerancia a particiones no es opcional. Lo que se decide es el comportamiento durante una partición: rechazar operaciones para mantener la consistencia (CP) o responder con datos posiblemente viejos para mantener la disponibilidad (AP).
2. ¿Qué agrega PACELC a CAP? Da un ejemplo.
   R: Agrega que, aun sin particiones, hay que elegir entre latencia y consistencia, porque la consistencia fuerte requiere coordinación entre réplicas. Ejemplo: una base multi-región con consistencia fuerte debe esperar confirmaciones entre continentes en cada escritura (alta latencia), mientras que una configuración eventual responde localmente rápido pero con posibles lecturas viejas.
3. Con N=3, ¿qué configuración de W y R elegirías para tolerar una réplica caída tanto en lecturas como en escrituras manteniendo lecturas que vean la última escritura?
   R: W=2 y R=2. W + R = 4 > 3, así que lecturas y escrituras se solapan en al menos una réplica, y ambas operaciones pueden completarse con una réplica caída porque solo necesitan dos de tres.
4. En una tienda online, ¿qué datos harías AP y cuáles CP? Justifica.
   R: AP: catálogo, reseñas, recomendaciones y carrito, porque un dato algo viejo es tolerable y no responder pierde ventas. CP: pagos, inventario del último ítem y unicidad de cupones o cuentas, porque un dato inconsistente provoca dobles cobros, sobreventa o fraude, lo que es peor que rechazar temporalmente la operación.
5. ¿Cómo lograrías que un usuario vea siempre su propio comentario recién publicado si las lecturas van a réplicas asíncronas?
   R: Con read-your-writes: durante unos segundos después de escribir, enrutar las lecturas de ese usuario sobre ese recurso al líder, o recordar la versión (timestamp o LSN) de su escritura y leer solo de réplicas que ya la tengan. También se puede insertar el comentario en la interfaz de forma optimista.

## Ejercicio

Elige un producto real complejo (por ejemplo, una app de delivery de comida) y lista al menos 10 datos distintos. Para cada uno, escribe: CP o AP, garantía intermedia necesaria (read-your-writes, monotonic reads, ninguna), qué ve el usuario durante una partición y cómo se reconcilian conflictos si es AP. Termina con un diagrama ASCII que muestre qué almacenamiento guarda cada grupo de datos. Terminado cuando cada fila tenga su justificación de negocio en una línea y al menos tres datos sean CP.

## Explícalo con tus palabras

Explica el teorema CAP usando la historia de dos sucursales de un banco que pierden la comunicación telefónica entre sí durante una tarde.
