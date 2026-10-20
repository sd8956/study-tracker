---
title: "Integración: datos derivados, corrección end-to-end y ética"
kind: lesson
hours: 3
sources: Designing Data-Intensive Applications (Kleppmann), cap. 12 (pp. 511–565)
links: Saltzer, Reed y Clark, "End-to-End Arguments in System Design" | https://web.mit.edu/Saltzer/www/publications/endtoend/endtoend.pdf ; Reglamento General de Protección de Datos (texto oficial) | https://eur-lex.europa.eu/eli/reg/2016/679/oj
---

## Objetivo

Integrar todo el módulo con la visión final del libro: combinar herramientas especializadas mediante datos derivados, "desagregar" la base de datos en dataflows, garantizar la corrección con el argumento end-to-end (IDs de petición, restricciones vía logs, timeliness frente a integridad, auditoría) y reflexionar sobre la responsabilidad ética de construir sistemas de datos. Esta sesión es de 3 horas: incluye un ejercicio de diseño que conecta las sesiones 01–23.

## Estudio

### Integración de datos

Una idea recorre todo el módulo: para cada problema hay varias soluciones con ventajas, desventajas y trade-offs distintos. No existe un motor de almacenamiento, un esquema de replicación o un índice que sea el mejor para todo. Así que la primera pregunta de diseño suele ser: ¿qué combinación de herramientas usar y cómo conectarlas?

#### Combinar herramientas especializadas derivando datos

Ejemplo clásico: una base OLTP como fuente de verdad y un **índice de texto completo** para búsquedas complejas. Con cada representación nueva (caches, warehouses, modelos de ML) crece la necesidad de integración.

#### Razonar sobre los flujos de datos

Cuando hay copias de los mismos datos en varios sistemas, debes tener clarísimas las **entradas y salidas**: ¿dónde se escribe primero el dato y qué representaciones se derivan de qué fuentes? ¿Cómo llega el dato a todos los sitios en el formato correcto?

Si puedes enviar todas las escrituras a un sistema de registro (una base de datos) y capturar sus cambios con CDC (sesión 23) para aplicarlos al índice en el **mismo orden**, el índice queda consistente. En cambio, si la aplicación escribe directamente en ambos (dual writes), puedes tener races y divergencias permanentes.

```
     ┌───────────── escritura ─────────────┐
     ▼                                      │
 sistema de registro (PostgreSQL) ──CDC──► log (Kafka) ──┬──► índice de búsqueda
                                                          ├──► cache
                                                          ├──► data warehouse
                                                          └──► modelo de recomendación
 un solo orden de escrituras decidido por un sistema → todos los derivados convergen
```

Decidir un **orden total** de escrituras en un único sistema facilita mucho derivar otras representaciones. Es una aplicación de la replicación por state machine (sesión 20).

#### Datos derivados frente a transacciones distribuidas

La forma clásica de mantener consistentes sistemas distintos es con **transacciones distribuidas** (2PC, sesión 21). ¿Cómo se compara con los datos derivados vía logs?

| | Transacciones distribuidas | Datos derivados (log + CDC/event sourcing) |
| --- | --- | --- |
| Orden de escrituras | Locks para exclusión mutua (2PL) | Un log ordenado |
| Que un cambio tenga efecto exactamente una vez | Commit atómico | Replay determinista + idempotencia |
| Garantía de lectura | Linealizabilidad (lees tus escrituras) | Actualización asíncrona: por defecto, sin garantías de recencia |
| Tolerancia a fallos | Amplifican fallos; XA con mal comportamiento ante caídas | Desacoplan componentes; un consumidor caído no bloquea a los demás |

El libro defiende que, en ausencia de un buen protocolo de transacciones distribuidas ampliamente soportado, **los datos derivados basados en logs son el enfoque más prometedor** para integrar sistemas heterogéneos. Pero las garantías de lectura (como read-your-writes) siguen siendo valiosas, y hay que construirlas explícitamente.

#### Los límites del orden total

Con sistemas pequeños, construir un log totalmente ordenado es factible (single-leader). Al crecer aparecen límites:

- Un log ordenado requiere que todos los eventos pasen por **un solo nodo líder**. Si el throughput supera a una máquina, hay que **particionar**, y el orden entre particiones es ambiguo.
- Con varios datacenters geográficos, sueles tener un líder por datacenter, y el orden de eventos de distintos datacenters no está definido.
- En microservicios, cada servicio tiene su propio estado durable; no hay un orden definido entre eventos de servicios distintos.
- Con aplicaciones offline en el cliente, el cliente y el servidor ven eventos en órdenes distintos.

Decidir un orden total es **consenso** (total order broadcast), y la mayoría de algoritmos están pensados para un nodo con suficiente throughput. Cómo escalar el consenso a sistemas geográficamente distribuidos sigue siendo un problema abierto.

#### Ordenar eventos para capturar causalidad

Sin relación causal, la falta de orden total no importa. Con ella, aparecen bugs sutiles: alguien elimina a su ex de sus amigos y luego publica un mensaje sobre ella; si amistades y mensajes viven en sistemas distintos, el servicio de notificaciones puede procesar el mensaje antes que el cambio de amistad y notificar justo a quien no debía. Hay soluciones parciales (timestamps lógicos, registrar con un ID el estado que vio el usuario antes de decidir, CRDTs), ninguna perfecta.

### Batch y stream juntos

El objetivo de la integración de datos es que los datos acaben en la forma correcta en todos los lugares correctos: consumir entradas, transformar, juntar, filtrar, agregar, entrenar modelos, evaluar y escribir salidas. Batch y stream son las herramientas para lograrlo. Sus salidas son **datos derivados**: índices, vistas materializadas, recomendaciones, métricas agregadas.

Ambos tienen principios en común. La principal diferencia: el stream opera sobre datos no acotados y el batch sobre entradas de tamaño finito. Las fronteras se difuminan: Spark hace streaming con microbatches, Flink hace batch sobre su motor de streaming.

#### Mantener el estado derivado

Batch y stream tienen un **sabor funcional**: funciones deterministas sin efectos secundarios, entradas inmutables y salidas de solo-añadido (el stream añade estado tolerante a fallos). Eso facilita la tolerancia a fallos y razonar sobre los flujos.

Aunque el estado derivado podría actualizarse de forma síncrona con la entrada (como un índice secundario en la misma transacción), las actualizaciones **asíncronas** hacen el sistema más robusto: un fallo queda contenido localmente en vez de propagarse por todo el sistema.

#### Reprocesar datos para evolucionar la aplicación

El batch permite **reprocesar** grandes volúmenes de datos históricos para derivar vistas nuevas, y el stream permite reflejar cambios en la entrada con baja latencia. Juntos permiten **evolucionar** el sistema: si quieres reestructurar un dataset (por ejemplo, cambiar el modelo de datos), no tienes que hacer una migración de golpe. Puedes mantener el esquema viejo y el nuevo **lado a lado** como dos vistas derivadas independientes de los mismos datos, mover gradualmente a los usuarios a la vista nueva (comparando comportamiento) y, cuando todos hayan migrado, eliminar la vieja. Cada etapa es fácilmente reversible.

Es como una migración de esquema en un ferrocarril del siglo XIX: había vías de anchos distintos incompatibles. Para convertirlas, se tendía un **tercer riel** (*dual gauge*) para que ambos tipos de tren pudieran circular, y luego se convertía gradualmente el material rodante.

#### La arquitectura lambda

La **arquitectura lambda** registra la entrada como eventos inmutables y ejecuta **dos sistemas en paralelo**: un stream (Storm) que da una respuesta rápida y aproximada, y un batch (Hadoop) que la corrige después. Problemas: mantener **la misma lógica en dos frameworks**, **fusionar** sus salidas y reprocesar el histórico con frecuencia. La alternativa moderna (a veces llamada **kappa**) unifica ambos en un motor capaz de **reproducir eventos históricos**, con semántica exactly-once y ventanas por **event time** (Flink, Apache Beam sobre Dataflow).

### Desagregar las bases de datos

Bases de datos, Hadoop y sistemas operativos hacen en el fondo lo mismo: almacenar, procesar y consultar datos. Unix ofrece abstracciones de **bajo nivel** y las bases relacionales de **alto nivel**; el libro intenta reconciliar ambas filosofías.

#### Composición de tecnologías de almacenamiento

Muchas funciones de una base de datos tienen equivalentes en los dataflows que vimos:

- Un **índice secundario** (`CREATE INDEX`): la base escanea un snapshot consistente de la tabla, construye el índice y luego procesa el backlog de escrituras ocurridas mientras tanto y lo mantiene al día con cada transacción. Es **exactamente** lo que hace un seguidor nuevo en replicación (sesión 10) y lo que hace CDC al iniciar un sistema derivado (sesión 23). **Crear un índice es reprocesar el dataset existente y derivar el índice como una vista nueva.**
- Todo el dataflow de una organización empieza a parecerse a **una base de datos enorme**: cada vez que un batch, stream o ETL transporta datos de un sitio a otro, actúa como el subsistema de una base que mantiene sincronizados índices y vistas materializadas.

Dos caminos para que herramientas distintas funcionen juntas como un todo cohesionado:

| Enfoque | Idea | Ejemplo |
| --- | --- | --- |
| **Bases de datos federadas** (unificar lecturas) | Una interfaz de consulta unificada sobre muchos motores y métodos de almacenamiento | PostgreSQL *foreign data wrappers*, Presto/Trino |
| **Bases de datos desagregadas** (unificar escrituras) | Sincronizar escrituras entre sistemas distintos de forma fiable mediante logs, como si fueran índices de una base | CDC + Kafka + consumidores |

Desagregar sigue la **filosofía Unix**: herramientas pequeñas que hacen una cosa bien, comunicadas por una API uniforme de bajo nivel (pipes; aquí, logs), componibles con un lenguaje de alto nivel (el shell; aquí, los frameworks de dataflow).

#### Por qué un log asíncrono en lugar de transacciones distribuidas

Sincronizar escrituras entre tecnologías distintas con un log ordenado de eventos y consumidores **idempotentes** es mucho más robusto que las transacciones distribuidas. La gran ventaja es el **acoplamiento débil** entre componentes:

1. **A nivel de sistema**: si un consumidor se ralentiza o falla, el log **amortigua** (*buffer*) los mensajes y los demás consumidores siguen; el consumidor caído se pone al día al recuperarse. Las transacciones distribuidas, en cambio, **amplifican** los fallos locales en fallos a gran escala.
2. **A nivel humano**: equipos distintos pueden desarrollar, mejorar y mantener cada componente y cada consumidor de forma independiente. La especialización permite que cada equipo haga bien una cosa con interfaces bien definidas.

¿Desagregar significa que nunca más usarás una base de datos "todo en uno"? No. Las bases siguen siendo necesarias para mantener estado en stream processors y para servir consultas sobre la salida de batch y stream. Los motores especializados siguen siendo importantes. El objetivo de desagregar no es competir con ellos en rendimiento, sino **combinar varias bases distintas** para lograr buen rendimiento en un rango de cargas más amplio que el de una sola. Si una sola tecnología hace todo lo que necesitas, úsala: es mucho más simple que desagregar.

#### Diseñar aplicaciones alrededor del dataflow

La base desagregada se parece a una **hoja de cálculo**: cuando cambia una celda, las fórmulas que dependen de ella se recalculan solas. Así deberían comportarse índices, caches y vistas derivadas (la idea de **"database inside-out"**). Las funciones que derivan esos datos son código de aplicación arbitrario, que hoy se ejecuta con herramientas de despliegue (Kubernetes) mientras la base guarda el estado y el dataflow conecta ambos.

Por ejemplo, en vez de que el servicio de compras llame síncronamente al de tipos de cambio, puede **suscribirse** a su stream de cambios y consultar una copia local: un stream-table join (sesión 23), más rápido y robusto ante caídas del otro servicio.

El estado derivado es el punto de encuentro entre el **write path** (trabajo precalculado al llegar los datos) y el **read path** (trabajo hecho solo al preguntar). Caches, índices y vistas mueven esa frontera: más trabajo al escribir para leer barato, como el fan-out del timeline de Twitter (sesión 01). Llevado al extremo, con WebSockets o Server-Sent Events el servidor **empuja** cambios al cliente, que se convierte en un suscriptor más del stream (como ya hacen React o Redux con el estado de la interfaz).

### Apuntar a la corrección

Con servicios stateless, un bug se arregla y se reinicia. Con bases de datos, el estado persiste: un error puede dejar datos malos para siempre. Queremos aplicaciones **fiables y correctas**: programas cuya semántica esté bien definida incluso ante fallos. Las transacciones (ACID) han sido la herramienta principal durante décadas, pero sus garantías son más débiles de lo que parecen (niveles de aislamiento débiles, problemas con configuraciones) y su coste en sistemas distribuidos es alto. ¿Hay alternativas?

#### El argumento end-to-end para las bases de datos

Una base con transacciones serializables **no te protege** si tu aplicación escribe datos incorrectos o borra datos por un bug. La inmutabilidad ayuda (puedes recuperar), pero no lo resuelve todo.

Considera la **supresión de duplicados**. Un cliente envía una transacción para transferir 11 € de una cuenta a otra. La conexión se corta tras enviar el `COMMIT` pero antes de recibir la respuesta. El cliente no sabe si se confirmó. Reintenta, y se transfiere **dos veces**. TCP deduplica paquetes dentro de una conexión, pero no entre conexiones. 2PC rompe el acoplamiento 1:1 entre conexión TCP y transacción, pero no resuelve el problema. Incluso con deduplicación entre cliente y servidor, el usuario puede pulsar "pagar" dos veces en el navegador si la primera petición expiró.

```
navegador ──POST pagar (id=7f3a)──► app ──BEGIN; UPDATE...; COMMIT──► BD
                                          ✘ conexión cortada antes del OK
navegador (reintento) ──POST pagar (id=7f3a)──► app ──► BD: ¿ya existe la operación 7f3a?
                                                          sí → no repetir
```

La solución es un **identificador de operación único** generado **en el cliente** (un UUID en un campo oculto del formulario, o un hash de los campos relevantes) que se pasa de extremo a extremo hasta la base:

```sql
ALTER TABLE requests ADD UNIQUE (request_id);

BEGIN TRANSACTION;
INSERT INTO requests (request_id, from_account, to_account, amount)
  VALUES ('0286FDB8-D7E1-423F-B40B-792B3608036C', 4321, 1234, 11.00);
UPDATE accounts SET balance = balance + 11.00 WHERE account_id = 1234;
UPDATE accounts SET balance = balance - 11.00 WHERE account_id = 4321;
COMMIT;
```

Si la petición se reintenta, la restricción de unicidad sobre `request_id` hace fallar el `INSERT` y aborta la transacción: el pago no se duplica. Además, la tabla `requests` funciona como un **log de eventos** del que se derivan los saldos (event sourcing), y sus filas sirven de auditoría.

Este es el **argumento end-to-end** (Saltzer, Reed y Clark, 1984): una función solo puede implementarse completa y correctamente con el conocimiento y la ayuda de la aplicación en los **extremos** del sistema de comunicación. Proporcionarla como característica del propio sistema de comunicación no es posible (aunque una versión incompleta puede ser útil como mejora de rendimiento). Pasa con la deduplicación (TCP ayuda, pero no basta), con la integridad de datos (los checksums de red no detectan corrupción por bugs en los extremos) y con la seguridad (el cifrado en la red no te protege si el servidor está comprometido: necesitas cifrado de extremo a extremo).

Las transacciones de bajo nivel son útiles, pero **no son suficientes**: siempre hace falta algo end-to-end. Eso es difícil de hacer bien cada vez, y es un problema que merecería mejores abstracciones.

#### Aplicar restricciones con logs

Las restricciones de unicidad requieren **consenso** (sesión 21): con escrituras concurrentes del mismo valor, hay que decidir cuál gana. Lo habitual es pasar todas las peticiones por un líder. Pero se puede escalar **particionando por el valor** que debe ser único: todas las peticiones para el mismo nombre de usuario van a la misma partición de un log, y un procesador de streams las lee **secuencialmente**:

1. Cada petición de nombre de usuario se codifica como mensaje y se añade a la partición determinada por el hash del nombre.
2. Un procesador lee las peticiones del log en orden, con una base local que recuerda los nombres tomados. Para cada petición libre, registra el nombre y emite un mensaje de éxito a un stream de salida; si está tomado, emite un rechazo.
3. El cliente que pidió el nombre espera en el stream de salida un mensaje con su resultado.

Es esencialmente el algoritmo de la sesión 20 (linealizabilidad sobre total order broadcast), y escala añadiendo particiones. Funciona igual para otras restricciones (saldo no negativo, asientos).

**Procesamiento multi-partición.** Una transferencia toca tres particiones: la de la petición (ID), la de la cuenta origen y la de la destino. Con transacciones distribuidas requeriría commit atómico. Con logs:

1. La petición de transferencia recibe un ID único y se añade a la partición del log según ese ID.
2. Un procesador lee el log de peticiones y emite **dos mensajes**: una instrucción de débito para la cuenta A (particionada por A) y una de crédito para la cuenta B (particionada por B), ambas con el ID original.
3. Procesadores posteriores consumen los streams de crédito y débito, **deduplican por ID** y aplican los cambios a los saldos.

Como la petición se escribe una sola vez en el log (atómicamente), y los pasos siguientes son deterministas e idempotentes, el resultado es correcto **sin transacciones atómicas entre particiones**. Si el procesador falla, reprocesa desde el último checkpoint y genera los mismos mensajes (deduplicados después). Para comprobar el saldo antes del débito, se añade un paso que valida contra el estado de la cuenta origen.

#### Timeliness frente a integridad

Una propiedad cómoda de las transacciones es que son linealizables: el escritor espera al commit y después todos ven el cambio. Al desagregar en etapas de stream processing, los consumidores son **asíncronos**. El libro propone separar dos conceptos que la palabra "consistencia" mezcla:

| | Timeliness (puntualidad) | Integrity (integridad) |
| --- | --- | --- |
| Significa | Los usuarios observan el sistema en un estado actualizado | Ausencia de corrupción: no se pierden datos ni hay datos contradictorios o falsos |
| Si se viola | La inconsistencia es **temporal**: se resuelve esperando ("eventual consistency") | La inconsistencia es **permanente**: requiere detección y reparación ("perpetual inconsistency") |
| Ejemplos | Linealizabilidad, read-your-writes | Un índice que refleja todos los registros; un saldo que cuadra con sus transacciones |

**En la mayoría de aplicaciones, la integridad es mucho más importante que la puntualidad.** En tu extracto bancario no te sorprende que una compra de las últimas 24 horas no aparezca todavía. Pero sería gravísimo que el saldo no cuadrara con la suma de transacciones, o que te cobraran algo que nunca llegó al comercio.

Las transacciones ACID dan ambas a la vez. Los sistemas de dataflow basados en eventos **las desacoplan**: no garantizan puntualidad (salvo que construyas consumidores que esperen), pero **la integridad es central** en ellos, mediante exactly-once/effectively-once, idempotencia y deduplicación. Se logra integridad sin transacciones distribuidas combinando:

- Representar el contenido de una operación de escritura como **un solo mensaje** que se escribe atómicamente (event sourcing).
- Derivar todas las demás actualizaciones de ese mensaje con **funciones deterministas**.
- Pasar un **ID de petición generado por el cliente** a lo largo de todo el procesamiento para deduplicar end-to-end.
- Hacer los mensajes **inmutables** y permitir reprocesar los datos derivados para recuperarse de bugs.

#### Restricciones laxas: disculparse en lugar de prevenir

Muchas aplicaciones reales **no necesitan** restricciones estrictas en el momento de escribir:

- Si dos personas reservan el mismo asiento, una aerolínea puede **compensar** (mover a alguien a otro vuelo, ofrecer un vale). Las aerolíneas ya **sobrevenden** a propósito.
- Si un cliente compra más unidades de las que hay en almacén, pides más al proveedor y te disculpas por el retraso. Un almacén puede tener existencias dañadas o robadas de todos modos: ya necesitas el proceso de disculpa.
- Un banco te cobra una comisión por descubierto en lugar de impedir el pago.

En estos casos, el **coste de la disculpa** es aceptable, y basta con verificar la restricción **después** y corregir. Esto se llama a veces **apologies / compensating transactions**. Lo que sí necesitas es **integridad** (no perder la reserva, no cobrar dos veces), pero no puntualidad en la aplicación de la restricción. Así se evita la coordinación síncrona, que es la que mata el rendimiento y la disponibilidad.

#### Sistemas sin coordinación

Juntando ambas ideas (integridad sin commit atómico y restricciones laxas), los dataflows pueden gestionar datos **sin coordinación síncrona** y con fuertes garantías de integridad: mejor rendimiento y tolerancia a fallos, incluso entre datacenters con replicación multi-líder asíncrona. Reserva la coordinación síncrona para lo estrictamente necesario (antes de una acción irrecuperable): no puedes llevar las disculpas a cero, pero sí elegir el mejor trade-off.

#### Confiar, pero verificar

Todo el módulo asume un modelo de sistema (sesión 18), pero sus suposiciones son probabilísticas: los discos corrompen datos en silencio, la RAM sufre bit flips y hasta MySQL y PostgreSQL han tenido bugs que violaban su aislamiento. Por eso hay que **auditar** continuamente: HDFS y S3 releen y comparan réplicas en segundo plano; los backups deben **probarse restaurándolos**; con event sourcing puedes **reejecutar la derivación** y comprobar que coincide; y estructuras criptográficas como los **Merkle trees** permiten verificar integridad eficientemente. Los sistemas deberían incluir verificación de integridad end-to-end igual que incluyen tests.

### Hacer lo correcto

El último tema del libro no es técnico: **todo sistema se construye con un propósito, y cada acción tiene consecuencias**, intencionadas o no. Como ingenieros, tenemos la responsabilidad de pensar con cuidado en esas consecuencias y elegir conscientemente el mundo que queremos crear. Muchos datasets son sobre **personas**: su comportamiento, intereses e identidad. Hay que tratarlos con humanidad y respeto. Los usuarios son seres humanos, y la dignidad humana es primordial. Los códigos de ética de la ingeniería del software (como el de la ACM) existen, pero rara vez se discuten o aplican.

#### Analítica predictiva

Predecir el tiempo está bien; predecir si alguien reincidirá, devolverá un préstamo o merece un empleo **afecta directamente a su vida**. Un rechazo algorítmico puede dejar a alguien en una **"prisión algorítmica"**, excluido sin pruebas y sin forma clara de apelar.

- **Sesgo**: si los datos de entrenamiento reflejan discriminación histórica, el modelo la **aprende y amplifica**, incluso sin usar atributos protegidos (el código postal correlaciona con la etnia). Es **"machine learning como lavado de dinero para el sesgo"**: el resultado parece objetivo. Un futuro mejor que el pasado requiere **imaginación moral**, que solo aportan los humanos.
- **Rendición de cuentas**: ¿quién responde y cómo se apela cuando un algoritmo opaco se equivoca, o cuando los datos que usó tenían errores?
- **Bucles de retroalimentación**: recomendaciones que encierran en burbujas, o un scoring crediticio que niega empleo y empeora el propio score. Pensar en el **sistema completo**, personas incluidas, ayuda a detectarlos.

#### Privacidad y seguimiento

Si el sistema guarda lo que el usuario pide guardar, le sirve. Si **rastrea** su actividad como efecto secundario y el negocio es la publicidad, los anunciantes son los clientes y el usuario es **el producto**. El experimento mental del libro: cambia "datos" por **"vigilancia"** en tus frases ("nuestro almacén de vigilancia en tiempo real…") y mira cómo suenan.

- **Consentimiento**: pocos usuarios entienden qué se recoge, y para servicios casi imprescindibles "si no te gusta, no lo uses" no es una elección real.
- **Privacidad** no es secreto, sino **poder decidir qué revelar a quién**; la vigilancia transfiere esa decisión a la empresa.
- Los datos son también **material peligroso**: se filtran, se venden o caen en malas manos. Recolecta lo necesario y **bórralo** cuando deje de hacer falta.
- El **GDPR** exige fines **especificados, explícitos y legítimos** y datos **limitados** a lo necesario, lo que choca con "guardarlo todo por si acaso". Además de la ley, hace falta un cambio cultural: tratar a los usuarios como personas, no como métricas.

### Ideas erróneas frecuentes

- **"Una base serializable garantiza la corrección de mi aplicación."** No protege de bugs de la aplicación ni de duplicados entre conexiones; hace falta deduplicación end-to-end.
- **"Sin transacciones distribuidas no hay integridad."** Logs, funciones deterministas, IDs de petición e idempotencia dan integridad sin coordinación síncrona.
- **"Consistencia es una sola cosa."** Separa timeliness (temporal, se arregla esperando) de integridad (permanente, requiere reparar).
- **"La arquitectura lambda es la forma de combinar batch y stream."** Duplica lógica; los motores unificados con replay y event time la sustituyen.
- **"Los algoritmos son neutrales."** Aprenden y amplifican los sesgos de los datos, y sus decisiones son difíciles de apelar.
- **"Guardar todos los datos por si acaso es gratis."** Son un riesgo (filtraciones, mal uso) y la regulación exige minimización.

### Resumen

La integración de datos se resuelve mejor con un sistema de registro y datos derivados por logs ordenados (CDC, event sourcing) que con transacciones distribuidas; el orden total tiene límites al escalar y la causalidad requiere cuidado. Batch y stream se unifican para reprocesar y evolucionar sin migraciones de golpe. "Desagregar la base de datos" compone herramientas especializadas con logs, como Unix compone programas con pipes, y diseña aplicaciones como hojas de cálculo que recalculan el estado derivado. La corrección exige argumentos end-to-end (IDs de petición), restricciones vía logs particionados, priorizar integridad sobre puntualidad, restricciones laxas con disculpas y auditoría continua. Y los ingenieros tienen la responsabilidad ética de evitar sesgos, bucles dañinos y vigilancia, tratando los datos personales con respeto.

## Conceptos clave

- **Datos derivados vs transacciones distribuidas**: integrar sistemas con logs asíncronos en lugar de commit atómico.
- **Arquitectura lambda / kappa**: batch y stream en paralelo frente a un solo motor con replay.
- **Dual gauge migration**: mantener vistas vieja y nueva en paralelo para migrar gradualmente.
- **Unbundling the database**: componer almacenes especializados sincronizados por logs.
- **Federated database**: interfaz de consulta unificada sobre varios motores.
- **Write path / read path**: trabajo precalculado al escribir frente a trabajo hecho al leer.
- **Argumento end-to-end**: ciertas garantías solo pueden implementarse en los extremos (IDs de petición).
- **Timeliness / integrity**: estar al día (temporal) frente a ausencia de corrupción (permanente).
- **Compensating transaction / apology**: corregir después una restricción violada.
- **Coordination-avoiding systems**: integridad sin coordinación síncrona.
- **Auditoría y verificación**: comprobar continuamente la integridad (Merkle trees, reejecución determinista).
- **Prisión algorítmica / bucle de retroalimentación**: daños de decisiones automatizadas sobre personas.
- **Minimización de datos**: recolectar solo lo necesario para fines explícitos (GDPR).

## Preguntas de repaso

1. ¿Por qué el libro prefiere los datos derivados vía logs a las transacciones distribuidas para integrar sistemas heterogéneos?
   R: Porque un log ordenado con consumidores idempotentes acopla débilmente los componentes: si un consumidor falla, el log amortigua y los demás siguen, y cada equipo evoluciona su parte de forma independiente; las transacciones distribuidas amplifican los fallos y XA tiene mal comportamiento ante caídas. A cambio, hay que construir explícitamente las garantías de lectura.
2. ¿Qué problemas tiene la arquitectura lambda y qué la sustituye?
   R: Mantener la misma lógica en dos frameworks, fusionar sus salidas y reprocesar todo el histórico con frecuencia. La sustituye un motor unificado que puede reproducir eventos históricos, con semántica exactly-once y ventanas por event time.
3. Explica por qué crear un índice secundario es "derivar una vista".
   R: Porque la base escanea un snapshot consistente de la tabla, construye el índice, procesa las escrituras ocurridas mientras tanto y lo mantiene actualizado: es el mismo proceso que añadir un seguidor de replicación o iniciar un consumidor CDC.
4. ¿Cómo evita el argumento end-to-end un pago duplicado?
   R: El cliente genera un ID de operación único que viaja hasta la base; la tabla de peticiones tiene una restricción de unicidad sobre ese ID, así que un reintento hace fallar el INSERT y aborta la transacción sin repetir el cargo. TCP o las transacciones de la base por sí solas no lo evitan.
5. Diferencia timeliness e integridad con un ejemplo bancario.
   R: Timeliness es ver datos actualizados: que una compra de hoy no aparezca aún en el extracto es una violación temporal que se resuelve esperando. Integridad es la ausencia de corrupción: que el saldo no cuadre con la suma de transacciones es una violación permanente que requiere reparación. La integridad importa mucho más.
6. Describe cómo procesar una transferencia entre dos cuentas en particiones distintas sin transacciones distribuidas.
   R: La petición con un ID único se escribe una vez en el log; un procesador la lee y emite una instrucción de débito para la partición de la cuenta origen y una de crédito para la destino, ambas con el ID; los procesadores de cada cuenta deduplican por ID y aplican los cambios. El registro atómico inicial y los pasos deterministas e idempotentes garantizan la integridad.
7. ¿Qué significa "machine learning como lavado de dinero para el sesgo" y qué responsabilidad implica?
   R: Que un modelo entrenado con datos que reflejan discriminación histórica reproduce y amplifica esos sesgos, pero sus resultados parecen objetivos porque los produjo una máquina. Los ingenieros deben analizar sesgos, permitir rendir cuentas y apelar, y aportar la imaginación moral que el modelo no tiene.

## Ejercicio

**Diseño integrador (90 minutos).** Diseña la arquitectura de datos de una plataforma de reservas de clases de un gimnasio con 200 sedes en 3 países:

- Requisitos: reservar plazas (con cupo máximo), cancelar, lista de espera, pagos, búsqueda de clases por texto y ubicación, recomendaciones, panel de ocupación en tiempo real para cada sede, informes mensuales para dirección y cumplimiento de GDPR (derecho al olvido).

Entrega un documento (puede ser un `.md` en tu repositorio de prácticas) con:

1. Un diagrama ASCII del dataflow: sistema de registro, log, sistemas derivados y quién consume qué.
2. Para cada almacén: modelo de datos, motor (B-tree o LSM, filas o columnas) y por qué (sesiones 02–06).
3. Esquema de eventos con su estrategia de evolución (sesión 08).
4. Replicación y particionado: claves de partición, réplicas, qué lecturas necesitan read-your-writes y cómo las garantizas (sesiones 10–14).
5. Cómo aplicas el cupo máximo: transacción serializable, partición por clase en un log, o restricción laxa con lista de espera y disculpa; justifica (sesiones 16, 21, 24).
6. Cómo evitas pagos duplicados de extremo a extremo.
7. Qué es timeliness y qué es integridad en tu sistema, y cómo auditas la integridad.
8. Cómo cumples el derecho al olvido en todos los sistemas derivados y backups.

Criterio de terminado: el documento responde los 8 puntos, cada decisión cita al menos un trade-off concreto del módulo y el diagrama muestra un único sistema de registro por tipo de dato.

## Explícalo con tus palabras

Explica por qué "integridad sin puntualidad" es aceptable en la mayoría de aplicaciones y por qué "puntualidad sin integridad" nunca lo es.
