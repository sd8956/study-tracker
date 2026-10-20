---
title: Implementar la comunicación: tecnologías, schemas y evolución de contratos
kind: lesson
hours: 2
sources: Building Microservices 2nd ed., cap. 5 "Implementing Microservice Communication" (pp. 158–200) | Hands-On Microservices with Kubernetes, cap. 7 "Providing and consuming an internal gRPC API" y "Sending and receiving events via a message queue" (pp. 214–232)
links: gRPC — Introduction | https://grpc.io/docs/what-is-grpc/introduction/ ; Pact — contract testing | https://docs.pact.io/ ; Semantic Versioning | https://semver.org/
---

## Objetivo

Comparar RPC (gRPC), REST, GraphQL y message brokers; entender por qué los schemas explícitos importan; y aplicar técnicas para evitar cambios incompatibles (expansion changes, tolerant reader) o gestionarlos cuando no hay remedio (versiones coexistentes, emular la interfaz vieja).

## Estudio

### 1. Qué le pedimos a una tecnología de comunicación

Antes de comparar herramientas, fija los criterios. Una buena tecnología de comunicación entre servicios debería:

1. **Facilitar la compatibilidad hacia atrás.** Añadir un campo nuevo no debería romper a nadie.
2. **Hacer explícita la interfaz.** Un consumidor debe poder saber exactamente qué ofrece el servicio, idealmente con un schema que una máquina pueda leer.
3. **Ser agnóstica de tecnología.** No obligar a los consumidores a usar tu mismo lenguaje o framework.
4. **Ser simple para los consumidores.** Con o sin librería cliente, debe ser fácil llamarla bien.
5. **Esconder detalles internos.** La interfaz no debe filtrar tu modelo de base de datos ni tus clases internas.

Ninguna tecnología cumple todo perfectamente. Usarás esta lista para evaluar los trade-offs.

### 2. Remote Procedure Calls (RPC) y gRPC

RPC busca que una llamada remota se vea como una llamada local: `inventory.reserve(sku, qty)`. Las implementaciones modernas, como **gRPC**, se basan en un **schema explícito** (Protocol Buffers), a partir del cual se genera código cliente y servidor en muchos lenguajes.

```proto
// inventory.proto
syntax = "proto3";
package inventory.v1;

service Inventory {
  rpc Reserve(ReserveRequest) returns (ReserveResponse);
}

message ReserveRequest {
  string sku = 1;
  int32 quantity = 2;
  string order_id = 3;
}

message ReserveResponse {
  bool reserved = 1;
  string reservation_id = 2;
}
```

Fíjate en los **números de campo** (`= 1`, `= 2`): son lo que viaja por la red, no los nombres. Por eso puedes añadir un campo `4` sin romper a clientes viejos (lo ignoran), pero **nunca debes reutilizar un número** de un campo borrado.

**Ventajas:** schema explícito y generación de código; serialización binaria compacta y rápida; tipado fuerte en ambos lados; soporte de streaming. Es una buena elección para comunicación interna entre servicios donde controlas ambos lados.

**Desventajas y trampas:**

- **Ocultar la red es peligroso.** Si `inventory.reserve()` parece una función local, los desarrolladores olvidan que puede tardar, fallar o no responder. Siempre pon timeouts y maneja errores remotos.
- **Acoplamiento por generación de código.** Algunos frameworks RPC antiguos (Java RMI) obligaban a usar la misma tecnología en ambos lados. gRPC no, pero todavía necesitas regenerar stubs cuando cambia el `.proto`.
- **Fragilidad.** Ciertas implementaciones RPC rompen si cambias cualquier cosa del mensaje. Protocol Buffers está diseñado para tolerar campos nuevos, pero solo si respetas sus reglas.
- **Menos amigable para navegadores** sin una capa extra (gRPC-Web).

En el libro de Sayfan, el servicio de noticias se expone por gRPC: se define el contrato en un `.proto`, se generan stubs y el resto de servicios internos lo consumen con el cliente generado. Es un patrón típico: **gRPC para el tráfico este-oeste (interno), REST para el tráfico norte-sur (hacia afuera)**.

### 3. REST sobre HTTP

REST modela el sistema como **recursos** (`/customers/c-981`) que se manipulan con los verbos de HTTP (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`). En la práctica, la mayoría usa "REST sobre HTTP con JSON".

**Ventajas:**

- HTTP es universal: cualquier lenguaje, cualquier herramienta (curl, navegadores, proxies).
- Aprovechas el ecosistema HTTP: caching con `Cache-Control` y `ETag`, códigos de estado, autenticación estándar, load balancers.
- Desacopla bien: los recursos no tienen por qué coincidir con tus tablas.

**Desventajas:**

- No hay generación de código obligatoria ni schema obligatorio (aunque OpenAPI lo resuelve).
- Más verboso y algo más lento que un formato binario.
- Las operaciones que no encajan en CRUD ("recalcular precios") se vuelven incómodas.
- **HATEOAS** (que las respuestas incluyan enlaces para navegar a acciones relacionadas) es elegante en teoría, pero pocos clientes lo aprovechan en la práctica.

Para describir explícitamente una API REST, usa **OpenAPI**. Un fragmento:

```yaml
paths:
  /customers/{id}:
    get:
      parameters:
        - { name: id, in: path, required: true, schema: { type: string } }
      responses:
        "200":
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Customer" }
        "404": { description: Cliente no encontrado }
```

**Dónde encaja REST:** APIs públicas o externas, interfaces consumidas por muchos equipos distintos, casos donde el caching de HTTP aporta.

### 4. GraphQL

Con GraphQL, el **cliente** decide qué campos quiere en una sola consulta, y el servidor resuelve los datos (a veces llamando a varios servicios por detrás).

```graphql
query {
  order(id: "o-77") {
    status
    customer { name }
    items { sku quantity }
  }
}
```

**Ventajas:** evita múltiples viajes y datos de más; ideal para interfaces de usuario, especialmente móviles con redes lentas; el schema es explícito y autodocumentado.

**Desventajas:** el cliente puede escribir consultas costosas que el servidor no anticipó (hay que limitar profundidad y complejidad); el caching HTTP estándar no sirve tan bien porque casi todo es un `POST` al mismo endpoint; las escrituras (mutations) son menos naturales que las lecturas.

**Dónde encaja:** como capa de agregación para frontends (sesión 18), **no** como mecanismo general de comunicación entre microservicios. Si lo usas como "puerta a mi base de datos", tienes content coupling disfrazado.

### 5. Message brokers

Los brokers son intermediarios que reciben mensajes de productores y los entregan a consumidores. Dos abstracciones principales:

| Abstracción | Semántica | Ejemplo |
| --- | --- | --- |
| **Queue (cola)** | Cada mensaje lo procesa **un** consumidor de un grupo; útil para repartir trabajo | Cola `emails.to-send` con 5 workers |
| **Topic (tópico)** | Cada **suscriptor** recibe su copia del mensaje; útil para eventos | Tópico `orders.confirmed` con 3 servicios suscritos |

Garantías importantes:

- **Entrega garantizada**: el broker persiste el mensaje hasta que el consumidor confirma (ack). Pero el broker en sí debe ser altamente disponible; si es un único nodo, se convierte en punto único de fallo.
- **Orden**: muchos brokers garantizan orden solo dentro de una partición o cola, no global.
- **Transacciones** en el broker: algunos permiten escribir en la base y publicar de forma atómica, pero con limitaciones.
- **Exactly once**: es la garantía que todos quieren y que casi nunca se obtiene de verdad. Asume **at least once** y diseña consumidores idempotentes.

Opciones conocidas: **RabbitMQ** (colas flexibles, enrutamiento), **Kafka** (log distribuido de alto volumen, retención de mensajes por días o indefinida, re-lectura desde cualquier punto, ideal para streaming), **NATS** (ligero y rápido, el que usa Sayfan para publicar eventos de links entre servicios en su cluster), y los servicios gestionados de cada nube.

En el ejemplo de Sayfan, el servicio de links publica un evento cada vez que se añade o borra un link, y el servicio de noticias se suscribe para construir el feed. El patrón es el mismo que viste en la sesión 04: el productor no conoce al consumidor.

### 6. Formatos de serialización

| Familia | Ejemplos | Ventajas | Desventajas |
| --- | --- | --- | --- |
| Texto | JSON, XML | Legible por humanos, universal, fácil de depurar | Más grande y lento de parsear |
| Binario | Protocol Buffers, Avro, Thrift | Compacto, rápido, con schema | No legible sin herramientas |

La regla práctica: si JSON te funciona, quédate con JSON. Pasa a binario cuando la latencia o el volumen lo justifiquen con mediciones.

### 7. Schemas: haz explícito lo que ya es implícito

Hay dos tipos de ruptura de contrato:

- **Ruptura estructural**: cambia la forma. Quitas un campo, renombras un método, añades un campo **obligatorio** en la petición. Un consumidor viejo deja de funcionar.
- **Ruptura semántica**: la forma es la misma pero el **comportamiento** cambia. `calculate(a, b)` antes sumaba y ahora multiplica. O un campo `price` pasaba en centavos y ahora en pesos.

Los schemas (OpenAPI, JSON Schema, `.proto`, Avro) permiten **detectar automáticamente** rupturas estructurales comparando la versión nueva con la anterior. Las rupturas semánticas solo se detectan con **tests** (en particular, contract tests, sesión 13).

Un argumento clave: **siempre tienes un schema**. Si tu API es "schemaless", tus consumidores escriben código con suposiciones sobre la forma de los datos. El schema existe, pero es implícito, y nadie puede verificar que no lo rompiste. Hacerlo explícito es documentación y red de seguridad a la vez. La excepción razonable: cuando cliente y servidor son del mismo equipo y se despliegan juntos, el costo de un cambio es bajo.

### 8. Evitar cambios incompatibles

La pregunta "¿cómo versiono mis servicios?" casi siempre es en realidad "¿cómo cambio un contrato sin romper a nadie?". Primero, intenta **no** romper. Cuatro ideas:

**8.1 Expansion changes.** Añade cosas nuevas; no quites ni cambies las viejas. Un campo nuevo opcional, un endpoint nuevo, un evento nuevo. Los consumidores viejos siguen funcionando.

**8.2 Tolerant reader.** Del lado del consumidor: **sé flexible con lo que recibes**. Lee solo los campos que necesitas e ignora el resto. No valides la respuesta completa contra un schema rígido que falle si aparece un campo nuevo o si cambia el orden.

```ts
import { z } from "zod";

// Tolerant reader: solo validamos lo que usamos y aceptamos campos extra
const CustomerView = z
  .object({
    id: z.string(),
    email: z.string().email(),
  })
  .passthrough(); // no rompe si el productor añade campos

const customer = CustomerView.parse(await res.json());
```

Un detalle sutil: si el productor mueve el email de `email` a `contact.email`, un lector tolerante que busca el campo por nombre en lugar de por posición sufre menos. La idea es que tu código dependa de **lo mínimo**.

**8.3 La tecnología adecuada.** Algunos formatos toleran mejor la evolución. Protocol Buffers ignora campos desconocidos; JSON también, si los lectores son tolerantes. Formatos posicionales o serialización binaria de objetos del lenguaje son frágiles.

**8.4 Interfaz explícita y detección temprana.** Si tienes schemas, añade al pipeline de CI una comprobación que compare el schema nuevo con el publicado y falle si hay una ruptura estructural. Herramientas: `buf breaking` para Protocol Buffers, comparadores de OpenAPI (por ejemplo `oasdiff`), registries de schemas para Avro con reglas de compatibilidad. Para rupturas semánticas, contract tests con herramientas como Pact.

```yaml
# Paso de CI (ejemplo conceptual)
- name: Detectar cambios incompatibles en el proto
  run: buf breaking --against ".git#branch=main"
```

### 9. Gestionar cambios incompatibles

A veces no hay forma de evitarlo: el modelo cambió de fondo. Tres estrategias:

**9.1 Lockstep deployment.** Cambias el productor y todos los consumidores y los despliegas juntos. Funciona si el número de consumidores es mínimo y del mismo equipo, pero contradice el despliegue independiente. Si lo haces seguido, tienes un monolito distribuido.

**9.2 Coexistir versiones incompatibles del servicio.** Despliegas `v1` y `v2` del servicio a la vez, como procesos distintos, y enrutas a cada consumidor a la suya. Problemas: tienes que mantener y corregir bugs en dos bases de código; ambas versiones probablemente comparten datos, lo que complica todo; y el enrutamiento añade complejidad. Tiene sentido como situación **muy breve**, por ejemplo durante un canary (sesión 12).

**9.3 Emular la interfaz vieja.** Un solo servicio expone **ambos** contratos: el viejo y el nuevo (por ejemplo, `/v1/customers` y `/v2/customers`), y traduce internamente. Los consumidores migran a su ritmo; cuando nadie usa `v1`, lo quitas. Es la opción preferida en la mayoría de los casos.

```ts
// Un solo servicio, dos contratos
app.get("/v2/customers/:id", async (req, res) => {
  const c = await repo.find(req.params.id);
  res.json({ id: c.id, name: { given: c.given, family: c.family }, contact: { email: c.email } });
});

// v1 se implementa sobre la misma lógica, con la forma antigua
app.get("/v1/customers/:id", async (req, res) => {
  const c = await repo.find(req.params.id);
  res.set("Deprecation", "true").set("Sunset", "Wed, 01 Apr 2027 00:00:00 GMT");
  res.json({ id: c.id, fullName: `${c.given} ${c.family}`, email: c.email });
});
```

| Estrategia | Costo para el productor | Costo para consumidores | Cuándo |
| --- | --- | --- | --- |
| Lockstep | Bajo | Alto: deben desplegar a la vez | Pocos consumidores, mismo equipo, excepcional |
| Versiones coexistentes | Alto: dos despliegues, dos bases de código | Bajo | Muy temporal |
| Emular interfaz vieja | Medio: mantener la traducción | Bajo: migran cuando pueden | La opción por defecto |

### 10. El contrato social y el seguimiento de uso

Las técnicas no bastan sin acuerdos entre equipos. Define un **contrato social** para cambios de interfaz:

- ¿Cómo se anuncia una ruptura? (canal, documento, cabecera `Deprecation`)
- ¿Cuánto tiempo se mantiene la versión vieja? (por ejemplo, 90 días)
- ¿Quién ayuda a los consumidores a migrar?

Para saber cuándo puedes quitar la versión vieja, necesitas **saber quién la usa**. Pide que cada consumidor se identifique (cabecera `User-Agent` o un client ID en el token) y registra el uso por versión. Sin esto, nunca sabrás si es seguro borrar `v1`.

Como medida extrema, si un consumidor ignora todos los avisos, puedes introducir latencia artificial o errores ocasionales en la versión vieja para que "lo note". Es una herramienta de último recurso, solo en entornos internos y con aviso previo.

### 11. DRY y el peligro de compartir código

En un monolito, "Don't Repeat Yourself" invita a extraer código común. Entre servicios, compartir código mediante **librerías** crea acoplamiento: si cambias la librería, ¿todos los servicios deben actualizar a la vez? Si sí, perdiste el despliegue independiente.

Reglas prácticas:

- Compartir librerías de **infraestructura** (logging, métricas, cliente HTTP con timeouts) está bien, siempre que cada servicio pueda quedarse en una versión vieja.
- **No** compartas librerías con **modelo de dominio** (`Customer`, `Order`) entre servicios. Cada servicio tiene su propia vista del cliente.
- Las **librerías cliente** de un servicio son útiles, pero que no las escriba solo el equipo productor con lógica de negocio dentro; si el cliente "hace cosas", empiezas a filtrar lógica del servidor hacia el consumidor. Mantén el cliente fino: transporte, serialización, reintentos, descubrimiento.

Un poco de duplicación entre servicios es preferible a un acoplamiento que te obliga a desplegar todo junto.

### 11.1 Receta: cambiar un contrato paso a paso

Juntemos todo en una receta que puedes seguir cada vez que quieras cambiar la forma de un recurso o de un evento:

1. **Pregúntate si de verdad necesitas romper.** Casi siempre puedes añadir un campo nuevo con el significado nuevo (`amountMinorUnits`) y dejar el viejo.
2. **Si es una expansión,** añade el campo como opcional, actualiza el schema y deja que el check de compatibilidad en CI confirme que no hay ruptura. Despliega. Los consumidores lo adoptan cuando quieran.
3. **Si es una ruptura inevitable,** publica el contrato nuevo **junto** al viejo (`/v2`, o un evento `CustomerRegistered.v2` en un tópico nuevo), implementado sobre la misma lógica.
4. **Marca el viejo como obsoleto:** cabeceras `Deprecation` y `Sunset`, nota en la documentación y aviso en el canal acordado.
5. **Mide el uso del viejo** por consumidor. Contacta a los que siguen usándolo.
6. **Retíralo** solo cuando el uso sea cero durante un periodo acordado, y deja una respuesta clara (`410 Gone`) en lugar de un error confuso.

Para eventos, el paso 3 tiene un matiz: los productores pueden **publicar las dos versiones** durante la transición (doble publicación) o publicar solo la nueva y que un pequeño traductor republique en el formato viejo. En ambos casos, el número de versión debe ir en el propio mensaje o en el nombre del tópico, para que el consumidor sepa qué está leyendo.

Esta receta es aburrida a propósito. Lo que hace caro un cambio de contrato no es la técnica, sino la falta de disciplina y de información sobre quién depende de qué.

### 12. Historia de fallo

Un equipo cambia el campo `amount` de un evento `PaymentCaptured` de "centavos" (entero) a "unidades con decimales" (número flotante), porque "es más legible". El schema no cambió: sigue siendo `number`. Ningún check de CI saltó. Tres consumidores empezaron a registrar pagos cien veces más pequeños. El error se detectó a fin de mes en la conciliación contable. Fue una **ruptura semántica**: el schema no bastaba. La solución fue doble: añadir un campo nuevo `amountMinorUnits` (expansion change) en lugar de cambiar el significado del viejo, y añadir contract tests que fijaran el ejemplo "un pago de 10,50 se publica como 1050".

### 13. Errores comunes

- Exponer tablas o clases internas directamente como JSON de la API.
- Reutilizar números de campo en Protocol Buffers.
- Validar respuestas con schemas estrictos del lado del consumidor que fallan ante campos nuevos.
- Cambiar el significado de un campo sin cambiar su nombre.
- Mantener dos versiones del servicio desplegadas durante meses.
- Borrar una versión vieja sin saber quién la usa.
- Compartir una librería de modelo de dominio entre todos los servicios.

## Conceptos clave

- **gRPC**: framework RPC con schema en Protocol Buffers y generación de código, eficiente para tráfico interno.
- **REST sobre HTTP**: recursos manipulados con verbos HTTP; universal y compatible con el ecosistema web.
- **GraphQL**: el cliente pide exactamente los campos que quiere; útil para agregar datos para frontends.
- **Queue vs. topic**: la cola reparte cada mensaje a un consumidor; el tópico entrega una copia a cada suscriptor.
- **Ruptura estructural**: cambio en la forma del contrato que rompe consumidores; detectable con schemas.
- **Ruptura semántica**: misma forma, comportamiento distinto; detectable solo con tests.
- **Expansion change**: añadir sin quitar ni cambiar lo existente.
- **Tolerant reader**: consumir solo lo necesario e ignorar lo desconocido.
- **Emular la interfaz vieja**: un mismo servicio expone el contrato viejo y el nuevo mientras los consumidores migran.

## Preguntas de repaso

1. ¿Por qué es peligroso que RPC haga que una llamada remota parezca local?
   R: Porque los desarrolladores olvidan que la llamada cruza la red: puede tardar, fallar o no responder, y no la tratan con timeouts, reintentos ni manejo de fallos parciales. Además pueden hacer muchas llamadas en bucle como si fueran baratas.
2. ¿Qué diferencia hay entre una ruptura estructural y una semántica, y cómo se detecta cada una?
   R: La estructural cambia la forma del contrato (quitar un campo, añadir uno obligatorio) y se detecta comparando schemas en CI. La semántica mantiene la forma pero cambia el comportamiento (un campo pasa de centavos a unidades) y solo se detecta con tests, como contract tests con ejemplos concretos.
3. Explica expansion changes y tolerant reader y cómo se complementan.
   R: Expansion changes es la disciplina del productor: añadir sin quitar ni cambiar. Tolerant reader es la del consumidor: leer solo lo que necesita e ignorar campos desconocidos. Juntas permiten que el productor evolucione su contrato sin que los consumidores viejos se rompan.
4. ¿Por qué emular la interfaz vieja suele ser mejor que mantener dos versiones desplegadas del servicio?
   R: Porque hay una sola base de código y un solo despliegue, con una capa de traducción para el contrato viejo. Las versiones coexistentes obligan a mantener y parchear dos bases de código y suelen compartir datos de forma complicada.
5. ¿Qué riesgo tiene compartir una librería de modelo de dominio entre servicios?
   R: Que cualquier cambio en el modelo obliga a actualizar y desplegar todos los servicios a la vez, perdiendo el despliegue independiente, y que cada servicio pierde la libertad de tener su propia vista de la entidad.
6. ¿Cuándo elegirías gRPC, REST o GraphQL?
   R: gRPC para comunicación interna entre servicios propios donde importa el rendimiento y quieres schema y generación de código; REST para APIs públicas o consumidas por muchos equipos y navegadores, aprovechando el ecosistema HTTP; GraphQL como capa de agregación para interfaces de usuario que necesitan combinar datos con pocos viajes.

## Ejercicio

En TypeScript, implementa con Express (o `node:http`) un servicio `customers` que exponga `/v1/customers/:id` con la forma `{ id, fullName, email }`. Luego evoluciona el contrato a `{ id, name: { given, family }, contact: { email } }` usando la estrategia de **emular la interfaz vieja**: expón `/v2` y mantén `/v1` desde la misma lógica, con la cabecera `Deprecation`. Escribe un consumidor tolerante con `zod` que solo use `id` y `email` de `v1`. Criterio de terminado: un test (vitest) demuestra que el consumidor viejo sigue funcionando después del cambio, y otro test demuestra que añadir un campo nuevo a `v1` no rompe el consumidor.

## Explícalo con tus palabras

Explica por qué "tener un schema explícito" es mejor que "no tener schema", usando la idea de que el schema implícito siempre existe en el código del consumidor.
