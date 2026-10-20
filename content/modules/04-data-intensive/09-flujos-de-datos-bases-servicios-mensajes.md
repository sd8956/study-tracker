---
title: "Flujos de datos: bases de datos, servicios y mensajes"
kind: lesson
hours: 2
sources: Designing Data-Intensive Applications (Kleppmann), cap. 4 (pp. 150–161)
links: gRPC, conceptos básicos | https://grpc.io/docs/what-is-grpc/core-concepts/ ; Microsoft, guía de versionado de APIs REST | https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design
---

## Objetivo

Entender las tres formas principales en que los datos fluyen entre procesos (a través de bases de datos, de llamadas a servicios REST/RPC y de mensajes asíncronos) y qué exige cada una en términos de compatibilidad y evolución.

## Estudio

### La compatibilidad es una relación entre procesos

En la sesión anterior viste cómo codificar datos y cómo los esquemas evolucionan. La compatibilidad siempre es una relación entre **un proceso que codifica** y **otro que decodifica**. Para saber qué compatibilidad necesitas, pregúntate: ¿quién escribe, quién lee y en qué momento? Hay tres modos de flujo muy comunes:

```
1. a través de una base de datos       2. a través de servicios        3. a través de mensajes
   proceso A ──write──► [BD]              cliente ──request──► servidor   productor ──► [broker] ──► consumidor
   proceso B ◄──read──  [BD]              cliente ◄─response── servidor   (asíncrono, desacoplado)
   (quizá años después)                   (síncrono)
```

### 1. Flujo a través de bases de datos

En una base de datos, quien escribe codifica y quien lee decodifica. Si solo hay un proceso, el lector es una versión futura del mismo proceso: **guardar algo en la base es enviarte un mensaje a tu yo del futuro**. La **backward compatibility** es obligatoria: tu yo futuro debe poder leer lo que escribiste.

Pero lo habitual es que varios procesos accedan a la vez: distintas aplicaciones, o varias instancias del mismo servicio. Durante un rolling upgrade, unas instancias corren código nuevo y otras viejo. Un valor escrito por el código nuevo puede ser leído por el viejo, así que también necesitas **forward compatibility**.

#### El problema de los campos desconocidos

Hay un detalle peligroso. Supón que añades un campo `photoUrl` al esquema. El código nuevo escribe un registro con ese campo. Luego, código viejo (que no conoce `photoUrl`) **lee el registro, lo modifica y lo escribe de vuelta**. Lo deseable es que el código viejo **preserve el campo nuevo intacto**, aunque no lo entienda.

```
código nuevo escribe:  { id: 7, name: "Ana", photoUrl: "https://..." }
                                     │
código viejo lee  ──► objeto modelo { id: 7, name: "Ana" }   ← photoUrl se perdió al decodificar
código viejo cambia name y escribe:
                       { id: 7, name: "Ana María" }          ← ¡photoUrl borrado!
```

Los formatos que vimos (protobuf, Avro) permiten preservar campos desconocidos, pero a veces debes cuidarlo **a nivel de aplicación**: si decodificas a objetos de modelo y luego los recodificas, el campo desconocido se pierde en la traducción. Protobuf moderno conserva los campos desconocidos en el mensaje decodificado; muchos ORMs y mapeadores a mano no lo hacen.

#### Los datos sobreviven al código

Cuando despliegas una versión nueva de tu aplicación, el código viejo se reemplaza en minutos. Pero los datos de la base pueden tener **cinco años**. Es decir, **data outlives code**: en una base conviven valores escritos hace milisegundos y otros escritos hace años.

Migrar todos los datos al esquema nuevo es posible, pero caro en datasets grandes, así que la mayoría de bases lo evitan cuando pueden. Muchas permiten cambios simples, como añadir una columna con valor `NULL` por defecto, **sin reescribir los datos existentes**: al leer una fila vieja, la base rellena el null para la columna que falta. LinkedIn, con su base de documentos Espresso, guarda los datos en Avro y aprovecha sus reglas de evolución.

La evolución de esquema permite que **toda la base parezca codificada con un único esquema**, aunque por debajo haya registros codificados con muchas versiones históricas.

#### Archivado

A veces tomas un **snapshot** de la base para backups o para cargarla en un data warehouse. Aunque la base original contenga una mezcla de versiones de esquema, al volcarla conviene **codificar todo con el esquema más reciente**. Como el volcado se escribe de una sola vez y no cambia, un formato como un object container file de Avro encaja muy bien, y también formatos columnares como **Parquet** para analítica.

### 2. Flujo a través de servicios: REST y RPC

Cuando procesos se comunican por red, el patrón más común es **cliente y servidor**. Los servidores exponen una **API**, y los clientes hacen peticiones a esa API. La web funciona así: el navegador pide recursos con `GET` y envía datos con `POST`. La API es un conjunto estandarizado de protocolos y formatos (HTTP, URLs, SSL/TLS, HTML).

Pero los clientes no son solo navegadores: apps móviles y JavaScript en el navegador (Ajax/fetch) hacen peticiones y reciben JSON. Además, **un servidor puede ser cliente de otro servicio**. Descomponer una aplicación grande en servicios por áreas funcionales, donde cada uno llama a otros, es lo que se conoce como **arquitectura orientada a servicios (SOA)**, rebautizada recientemente como **microservicios**.

Un servicio se parece a una base de datos (los clientes envían y piden datos), pero con una diferencia clave: una base de datos permite consultas arbitrarias con un lenguaje como SQL, mientras que un servicio expone una **API específica de la aplicación**, con entradas y salidas predeterminadas por su lógica de negocio. Eso da **encapsulación**: el servicio impone restricciones sobre lo que el cliente puede hacer.

Un objetivo central de los microservicios es que cada servicio sea **desplegable y evolucionable de forma independiente** por su equipo, sin coordinarse con los demás. Por eso servidores y clientes correrán versiones distintas de código, y los datos que intercambian deben ser compatibles entre versiones de la API.

#### Web services: REST y SOAP

Cuando un servicio usa HTTP como protocolo, se llama **web service**. Hay dos enfoques populares:

| | REST | SOAP |
| --- | --- | --- |
| Qué es | Una **filosofía de diseño** basada en los principios de HTTP | Un **protocolo** basado en XML |
| Ideas centrales | Formatos simples, URLs para identificar recursos, usar las características de HTTP (cache, autenticación, negociación de contenido) | Busca ser independiente de HTTP; trae un ecosistema de estándares WS-* |
| Descripción de la API | OpenAPI (Swagger) | WSDL, que permite generar código cliente |
| Tendencia | Dominante en APIs públicas y entre organizaciones | Mayormente en grandes empresas; difícil de usar sin herramientas |

#### Los problemas de RPC

Los web services son la última encarnación de una larga lista de tecnologías para hacer peticiones por red: Enterprise JavaBeans y RMI de Java (limitados a Java), DCOM (limitado a Microsoft), CORBA (enormemente complejo). Todas se basan en la idea de la **remote procedure call (RPC)**: hacer que una petición a un servicio remoto **parezca una llamada a una función local** de tu lenguaje. A esa abstracción se le llama *location transparency*.

La idea es atractiva, pero **está fundamentalmente rota**. Una llamada por red es muy distinta de una llamada local:

| Llamada local | Llamada por red |
| --- | --- |
| Predecible: funciona o falla por causas que controlas (los parámetros) | Impredecible: la petición o la respuesta pueden perderse, la máquina remota puede ir lenta o no estar disponible. Debes anticipar problemas de red, por ejemplo con **reintentos** |
| Devuelve un resultado, lanza una excepción o nunca vuelve (bucle infinito, crash) | Tiene un resultado más: puede volver **sin resultado** por un **timeout**, y no sabes si la petición llegó o no |
| Ejecutarla de nuevo no es un problema | Si reintentas, quizá la petición sí llegó y solo se perdió la respuesta: puedes **ejecutar la acción varias veces** salvo que añadas deduplicación (**idempotencia**) |
| Tarda casi siempre lo mismo | La latencia varía muchísimo: milisegundos o segundos según la congestión de la red y la carga del servicio |
| Pasas referencias (punteros) a objetos en memoria | Todos los parámetros deben codificarse en bytes; con objetos grandes es caro |
| Mismo lenguaje en ambos lados | Cliente y servicio pueden estar en lenguajes distintos; el framework traduce tipos y puede chocar (el problema de los enteros grandes en JavaScript) |

Fingir que un servicio remoto es un objeto local de tu lenguaje es inútil porque es otra cosa. Parte del atractivo de REST es que **no oculta que es un protocolo de red**.

```
llamada RPC con timeout: ¿se cobró el pago?
cliente                     red                         servicio de pagos
  │── cobrar(42€, id=abc) ──────────────────────────────►│ cobra 42 €
  │                                    ✗ respuesta perdida│
  │  (timeout: ¿cobró o no?)                              │
  │── reintento cobrar(42€, id=abc) ────────────────────►│ ¿cobra otra vez?
                                                         │ solo si NO deduplica por id=abc
```

#### Direcciones actuales de RPC

Pese a todo, RPC no desaparece. Hay frameworks construidos sobre los formatos de la sesión anterior: **Thrift** y **Avro** traen RPC, **gRPC** usa Protocol Buffers sobre HTTP/2, **Finagle** usa Thrift y **Rest.li** usa JSON sobre HTTP. Esta nueva generación es más honesta con la naturaleza de la red:

- Finagle y Rest.li usan **futures** (promesas) para encapsular acciones asíncronas que pueden fallar, y permiten lanzar peticiones a varios servicios en paralelo y combinar los resultados.
- gRPC soporta **streams**: una llamada puede consistir en una serie de peticiones y respuestas a lo largo del tiempo.
- Algunos ofrecen **service discovery**: el cliente averigua en qué IP y puerto está el servicio.

Los protocolos RPC con codificación binaria pueden rendir mejor que JSON sobre REST. Pero REST tiene ventajas prácticas: lo depuras con un navegador o `curl`, lo soportan todos los lenguajes y plataformas, y tiene un ecosistema enorme (servidores, caches, load balancers, proxies, firewalls, monitorización). Por eso REST domina en **APIs públicas**, y RPC se concentra en la comunicación entre servicios de una misma organización, normalmente dentro del mismo datacenter.

#### Evolución de datos en RPC

Para evolucionar, cliente y servidor deben poder cambiar y desplegarse **de forma independiente**. Hay una simplificación razonable: **los servidores se actualizan primero y los clientes después**. Así necesitas:

- **Backward compatibility en las peticiones**: el servidor nuevo debe entender peticiones de clientes viejos.
- **Forward compatibility en las respuestas**: el cliente viejo debe entender respuestas del servidor nuevo.

Las propiedades de compatibilidad dependen del formato: Thrift, gRPC (protobuf) y Avro RPC siguen sus reglas de evolución; SOAP usa XML Schema, que puede evolucionar con cuidado; REST suele usar JSON, donde **añadir parámetros opcionales a una petición y añadir campos nuevos a una respuesta** se consideran cambios compatibles.

El problema es que, si la API la usan clientes de otras organizaciones, **no controlas a los clientes** ni puedes forzarlos a actualizar. La compatibilidad debe mantenerse mucho tiempo, quizá indefinidamente. Si un cambio rompe la compatibilidad, el proveedor termina **manteniendo varias versiones de la API a la vez**.

No hay un acuerdo sobre cómo versionar una API. En REST lo común es poner el número de versión en la URL (`/v2/users`) o en una cabecera HTTP `Accept`. Para servicios con API keys, otra opción es guardar en el servidor la versión de API que usa cada cliente y permitir cambiarla desde un panel de administración (Stripe lo hace con versiones fechadas por cuenta).

### 3. Flujo a través de mensajes asíncronos

Entre la base de datos (asíncrona, quizá años de diferencia) y el RPC (síncrono, petición y respuesta) existe un punto intermedio: los **message brokers** (también llamados *message queues* o *message-oriented middleware*). Igual que en RPC, un cliente envía una petición (el **mensaje**) con baja latencia; igual que con una base de datos, el mensaje no va directo al destinatario, sino a un **intermediario** que lo guarda temporalmente.

Ventajas de usar un broker frente a RPC directo:

1. **Actúa como buffer** si el destinatario no está disponible o está sobrecargado, lo que mejora la fiabilidad.
2. **Reentrega automática** de mensajes a un proceso que se cayó, evitando que se pierdan.
3. **El emisor no necesita conocer la IP y el puerto** del destinatario (útil en la nube, donde las máquinas van y vienen).
4. **Un mensaje puede llegar a varios destinatarios**.
5. **Desacopla lógicamente** emisor y receptor: el emisor publica y no le importa quién consume.

La diferencia esencial con RPC: la comunicación suele ser **en una sola dirección**. El emisor normalmente no espera respuesta; si la hay, llega por otro canal. Este patrón es **asíncrono**: el emisor no espera a que el mensaje se entregue, lo envía y se olvida.

#### Message brokers

Antes dominaban productos comerciales (TIBCO, IBM WebSphere, webMethods). Hoy son comunes los open source: **RabbitMQ, ActiveMQ, HornetQ, NATS y Apache Kafka**. La semántica varía, pero en general: un proceso envía un mensaje a una **cola** o **topic**, y el broker garantiza que se entregue a uno o más **consumidores** o **suscriptores** de esa cola o topic. Puede haber muchos productores y consumidores en el mismo topic.

Un topic ofrece flujo en una dirección, pero un consumidor puede publicar en otro topic (encadenando, como verás en la sesión de stream processing) o en una **reply queue** que consuma el emisor original (patrón petición-respuesta sobre mensajería).

Los brokers no imponen un modelo de datos: un mensaje es una secuencia de bytes con metadatos. Puedes usar cualquier codificación, y si es backward y forward compatible, puedes cambiar emisores y consumidores de forma independiente. **El mismo problema de la base de datos aplica**: si un consumidor republica mensajes en otro topic, debe tener cuidado de **preservar los campos desconocidos**.

#### Actores distribuidos

El **actor model** es un modelo de programación para concurrencia en un solo proceso. En lugar de hilos con estado compartido (y los problemas de race conditions, locks y deadlocks), la lógica se encapsula en **actores**. Cada actor representa un cliente o entidad, puede tener estado local (no compartido) y se comunica con otros actores **enviando y recibiendo mensajes asíncronos**. No se garantiza la entrega: en ciertos fallos los mensajes se pierden. Cada actor procesa un mensaje a la vez, así que no necesita preocuparse por hilos.

En los **frameworks de actores distribuidos**, el modelo se extiende a varios nodos: el mismo mecanismo de paso de mensajes funciona tanto si emisor y receptor están en el mismo nodo como en otro. Si están en nodos distintos, el mensaje se codifica, se envía por red y se decodifica. La location transparency funciona **mejor** aquí que en RPC, porque el actor model ya asume que los mensajes pueden perderse, incluso en un solo proceso.

Tres frameworks populares y cómo manejan la codificación:

| Framework | Codificación por defecto | Rolling upgrades |
| --- | --- | --- |
| **Akka** (JVM) | Serialización nativa de Java | No da compatibilidad por defecto; puedes enchufar protobuf |
| **Orleans** (.NET) | Formato propio | Por defecto no soporta rolling upgrades; hay que desplegar un clúster nuevo y migrar el tráfico |
| **Erlang OTP** | Términos de Erlang | Cambiar esquemas de registros es sorprendentemente difícil, aunque el sistema se diseñó para alta disponibilidad |

### Comparación de los tres modos

| Modo | Sincronía | Quién lee | Compatibilidad necesaria | Ejemplos |
| --- | --- | --- | --- | --- |
| Base de datos | Asíncrono, quizá años después | Tu yo futuro y otras versiones | Backward (siempre) y forward (durante upgrades); preservar campos desconocidos | PostgreSQL, Espresso, DynamoDB |
| REST / RPC | Síncrono | El servidor (petición) y el cliente (respuesta) | Backward en peticiones, forward en respuestas | APIs REST, gRPC, Thrift |
| Mensajes | Asíncrono, poco después | Uno o varios consumidores desconocidos | Ambas, y preservar campos al republicar | Kafka, RabbitMQ, NATS, actores |

### Ideas erróneas frecuentes

- **"RPC es como llamar a una función local."** Una llamada por red puede perderse, tardar arbitrariamente o ejecutarse dos veces al reintentar.
- **"Reintentar siempre es seguro."** Solo si la operación es idempotente o se deduplica con un identificador de petición.
- **"Una migración de esquema reescribe todos los datos."** Muchas bases permiten cambios como añadir columnas nullables sin tocar los datos existentes.
- **"Si mi código no conoce un campo, no importa."** Si lees, modificas y reescribes, puedes borrar campos que escribió una versión más nueva.
- **"Con un broker siempre hay respuesta."** La mensajería suele ser unidireccional; una respuesta requiere otro canal.

### Resumen

Los datos fluyen entre procesos a través de bases de datos (donde los datos sobreviven al código y hay que preservar campos desconocidos), de servicios REST y RPC (donde la red hace imposible fingir una llamada local y los servidores se actualizan antes que los clientes) y de mensajes asíncronos mediante brokers o actores (que desacoplan emisor y receptor y amortiguan fallos). En todos los casos, la evolución sin dolor depende de codificaciones con backward y forward compatibility.

## Conceptos clave

- **Dataflow**: camino que siguen los datos entre el proceso que codifica y el que decodifica.
- **Data outlives code**: los datos de una base sobreviven mucho más que la versión del código que los escribió.
- **Preservación de campos desconocidos**: no borrar campos nuevos al leer, modificar y reescribir con código viejo.
- **Service-oriented architecture / microservicios**: aplicación descompuesta en servicios desplegables de forma independiente.
- **REST**: filosofía de diseño de APIs basada en HTTP y recursos identificados por URL.
- **RPC**: llamada a un servicio remoto presentada como una función local.
- **Location transparency**: ocultar si un recurso es local o remoto.
- **Idempotencia**: propiedad de una operación que produce el mismo efecto aunque se ejecute varias veces.
- **Message broker**: intermediario que almacena y entrega mensajes de forma asíncrona.
- **Topic / queue**: canal con nombre al que se publican y del que se consumen mensajes.
- **Actor model**: entidades con estado privado que se comunican solo mediante mensajes asíncronos.

## Preguntas de repaso

1. ¿Por qué guardar algo en una base de datos es "enviarte un mensaje a tu yo del futuro" y qué compatibilidad exige?
   R: Porque el dato lo leerá más tarde una versión posterior del código. Exige backward compatibility (el código futuro lee lo escrito por el viejo) y, durante rolling upgrades con varias instancias, también forward compatibility.
2. Describe el bug de la pérdida de campos desconocidos y cómo evitarlo.
   R: El código nuevo escribe un campo que el viejo no conoce; el viejo decodifica a un objeto de modelo sin ese campo, lo modifica y lo reescribe, borrando el campo. Se evita usando formatos y bibliotecas que conserven campos desconocidos y no traduciendo a modelos que los descarten.
3. Nombra tres diferencias entre una llamada local y una llamada por red.
   R: La llamada por red puede perderse o tardar arbitrariamente y terminar en timeout sin saber si se ejecutó; reintentar puede ejecutar la acción dos veces si no es idempotente; y los parámetros deben codificarse en bytes, quizá entre lenguajes distintos, mientras que localmente pasas referencias.
4. Si los servidores se actualizan antes que los clientes, ¿qué compatibilidad necesita cada dirección?
   R: Backward compatibility en las peticiones (el servidor nuevo entiende peticiones de clientes viejos) y forward compatibility en las respuestas (el cliente viejo entiende respuestas del servidor nuevo).
5. Da cuatro ventajas de un message broker frente a RPC directo.
   R: Actúa como buffer si el receptor está caído o saturado, reentrega mensajes a procesos que fallaron, evita que el emisor conozca la dirección del receptor, permite entregar un mensaje a varios consumidores y desacopla lógicamente a emisor y receptor.
6. ¿Por qué la location transparency funciona mejor en el actor model que en RPC?
   R: Porque el modelo de actores ya asume, incluso dentro de un proceso, que los mensajes son asíncronos y pueden perderse; así, pasar a mensajes por red no rompe las suposiciones del programador, mientras que RPC promete una semántica de llamada local que la red no puede cumplir.

## Ejercicio

Implementa en TypeScript un servicio de pagos simulado y su cliente para ver el problema del reintento:

1. `PaymentService.charge(requestId, amount)` guarda cargos en un `Map`. Introduce un 30 % de probabilidad de que la "respuesta" se pierda (el cargo se aplica pero el cliente recibe un error de timeout).
2. Un cliente ingenuo reintenta hasta 3 veces ante timeout. Ejecuta 1.000 pagos y cuenta cuántos cargos duplicados hay.
3. Haz el servicio idempotente: si `requestId` ya existe, devuelve el resultado guardado sin cobrar de nuevo. Repite la prueba.
4. Añade un campo `currency` en la "v2" de la respuesta y comprueba que el cliente v1 (que solo conoce `status` y `amount`) sigue funcionando y que, si reenvía el objeto recibido, no borra `currency`.

Criterio de terminado: la versión ingenua muestra cargos duplicados (> 0), la idempotente muestra 0, y el test del punto 4 pasa.

## Explícalo con tus palabras

Explica por qué "hacer que una llamada remota parezca local" es una abstracción que engaña, usando el ejemplo del pago reintentado.
