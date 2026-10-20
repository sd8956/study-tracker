---
title: Diseño de APIs — REST, RPC/gRPC, GraphQL y tiempo real
kind: lesson
hours: 2
sources: System Design Primer, "Communication" (RPC, REST, comparación RPC vs REST) | karanpratapsingh/system-design, cap. III "REST, GraphQL, gRPC" y "Long polling, WebSockets, Server-Sent Events (SSE)" | System Design Interview (Alex Xu), cap. 12, "Polling", "Long polling" y "WebSocket" (pp. 180–185)
links: Primer — Remote procedure call (RPC) | https://github.com/donnemartin/system-design-primer#remote-procedure-call-rpc ; Primer — Representational state transfer (REST) | https://github.com/donnemartin/system-design-primer#representational-state-transfer-rest ; Karan — REST, GraphQL, gRPC | https://github.com/karanpratapsingh/system-design#rest-graphql-grpc ; Karan — Long polling, WebSockets, SSE | https://github.com/karanpratapsingh/system-design#long-polling-websockets-server-sent-events-sse
---

## Objetivo

Elegir el estilo de API adecuado para cada frontera de un sistema (pública, interna, móvil, tiempo real), diseñar endpoints con paginación, versionado, errores e idempotencia, y decidir entre polling, long polling, SSE y WebSockets para enviar datos del servidor al cliente.

## Estudio

### Una API es un contrato

Una **API** es el contrato entre dos programas: qué operaciones existen, qué datos entran, qué salen y qué errores pueden ocurrir. En un diseño de sistema, la API es lo primero que defines después de los requisitos, porque fija qué tiene que hacer el sistema sin decir todavía cómo. Elegir mal el estilo o el diseño de la API cuesta caro: los clientes externos dependen de ella durante años.

Hay tres estilos dominantes para petición-respuesta (REST, RPC/gRPC y GraphQL) y varias técnicas para que el servidor empuje datos al cliente (polling, long polling, SSE y WebSockets).

### REST: recursos y verbos

**REST** es un estilo de arquitectura donde el cliente actúa sobre **recursos** que el servidor gestiona. Sus restricciones:

- **Interfaz uniforme**: los recursos se identifican con URIs (`/users/42`) y se manipulan con los mismos verbos HTTP.
- **Cliente-servidor**: separación de responsabilidades.
- **Sin estado**: cada petición lleva todo lo necesario; el servidor no guarda contexto del cliente entre peticiones. Esto es lo que permite la capa web stateless de la sesión 01.
- **Cacheable**: cada respuesta indica si se puede cachear y por cuánto tiempo.
- **Sistema en capas**: el cliente no sabe si habla con el servidor final o con un proxy, una CDN o un gateway.
- **Código bajo demanda** (opcional): el servidor puede enviar código ejecutable.

Un diseño REST típico:

```
 GET    /v1/users/42               → leer un usuario
 GET    /v1/users/42/orders?limit=20&cursor=abc  → listar pedidos del usuario
 POST   /v1/orders                 → crear pedido (201 Created + Location)
 PATCH  /v1/orders/981             → modificar parcialmente
 DELETE /v1/orders/981             → cancelar
```

Ventajas: simple, universal, aprovecha HTTP (cache, códigos de estado, proxies, herramientas), bajo acoplamiento entre cliente y servidor. Es la opción por defecto para **APIs públicas**.

Desventajas:

- Si los recursos no forman una jerarquía natural, las URIs se vuelven forzadas ("todos los registros actualizados en la última hora que coincidan con estos eventos").
- Pocos verbos: acciones como "archivar documentos vencidos" no encajan limpiamente (se suele usar `POST /documents:archive` o un recurso de acción).
- **Under-fetching**: renderizar una vista con datos anidados (un post con su autor y sus comentarios) requiere varias peticiones, lo que en móviles con red lenta se nota.
- **Over-fetching**: con el tiempo las respuestas acumulan campos que muchos clientes no necesitan.

### RPC y gRPC: operaciones

**RPC** (Remote Procedure Call) expone **comportamientos**: el cliente llama a una función remota como si fuera local. Un *stub* en el cliente serializa (marshalling) el nombre de la operación y los argumentos, los envía por la red, y el stub del servidor los deserializa y llama a la función real.

```
 Cliente: orders.createOrder(req)
   └─ stub serializa → red → stub del servidor deserializa → createOrder(req)
   ←────────────────── respuesta por el mismo camino ──────────────────┘
```

**gRPC** es el framework de RPC más usado hoy. Usa **Protocol Buffers** para definir el contrato y serializar en binario, y corre sobre HTTP/2:

```proto
service OrderService {
  rpc CreateOrder (CreateOrderRequest) returns (Order);
  rpc StreamOrderUpdates (OrderId) returns (stream OrderEvent);  // streaming del servidor
}
message CreateOrderRequest { string user_id = 1; repeated Item items = 2; }
```

Ventajas: mensajes binarios compactos y rápidos de serializar, contratos tipados con generación de código en muchos lenguajes, streaming bidireccional, multiplexación de HTTP/2 y deadlines propagados entre servicios. Ideal para **comunicación interna entre servicios** donde el rendimiento importa y controlas ambos lados.

Desventajas: el cliente queda acoplado a la implementación del servicio; cada caso de uso nuevo suele requerir una operación nueva; es más difícil de depurar (binario, sin `curl` directo); soporte limitado en navegadores (requiere gRPC-Web y un proxy); y no aprovecha la cache HTTP estándar.

### GraphQL: el cliente pide la forma

**GraphQL** es un lenguaje de consulta para APIs. El servidor publica un **esquema** tipado; el cliente envía una consulta que describe **exactamente** los datos que quiere, y el servidor resuelve cada campo con funciones llamadas **resolvers**:

```graphql
query {
  post(id: "981") {
    title
    author { name avatarUrl }
    comments(first: 3) { text author { name } }
  }
}
```

Una sola petición devuelve el post, su autor y tres comentarios, sin campos de más. Además ofrece **mutations** (escrituras) y **subscriptions** (actualizaciones en tiempo real).

Ventajas: elimina el over-fetching y el under-fetching, un esquema fuertemente tipado y autodocumentado, evolución sin versiones (se agregan campos y se deprecan otros), excelente como **BFF** para frontends con necesidades distintas (sesión 04).

Desventajas: la complejidad se traslada al servidor; consultas arbitrarias pueden ser carísimas (un cliente pide amigos de amigos de amigos), así que necesitas límites de profundidad y de costo; el **problema N+1** en resolvers (resolver el autor de cada comentario con una consulta distinta), que se resuelve con *batching* (DataLoader); la cache HTTP es difícil porque casi todo es `POST` a un único endpoint; y la subida de archivos y el manejo de errores son menos estándar.

### Comparación

| Aspecto | REST | gRPC | GraphQL |
| --- | --- | --- | --- |
| Enfoque | Recursos (datos) | Operaciones (comportamiento) | Consultas declarativas |
| Formato | JSON (texto) | Protobuf (binario) | JSON |
| Transporte | HTTP/1.1 o 2 | HTTP/2 | HTTP (normalmente POST) |
| Contrato | OpenAPI (opcional) | `.proto` obligatorio | Esquema obligatorio |
| Cache HTTP | Natural | No | Difícil |
| Streaming | Limitado | Nativo (bidireccional) | Subscriptions |
| Navegador | Nativo | Requiere proxy | Nativo |
| Mejor uso | APIs públicas, CRUD | Microservicios internos | Frontends complejos, BFF |

No hay una "mejor": un sistema típico usa REST hacia afuera, gRPC entre servicios y quizá GraphQL como BFF para sus apps.

### Buenas prácticas de diseño de endpoints

**Paginación.** Nunca devuelvas listas sin límite.

- **Offset** (`?offset=200&limit=50`): simple y permite saltar a la página N, pero es lento en offsets grandes (la base recorre y descarta 200 filas) y se descoloca si se insertan elementos mientras paginas (ves duplicados o te saltas elementos).
- **Cursor** (`?cursor=eyJpZCI6OTgxfQ&limit=50`): el cursor codifica la posición (por ejemplo, el último ID visto) y la consulta es `WHERE id < :last ORDER BY id DESC LIMIT 50`, eficiente con índice y estable ante inserciones. Es la opción para feeds y listas grandes; su costo es que no permite saltar a una página arbitraria.

**Versionado.** Los clientes viejos deben seguir funcionando. Opciones: en la URI (`/v1/...`, explícito y fácil de enrutar), en cabeceras (`Accept: application/vnd.app.v2+json`) o evolución compatible sin versiones (solo agregar campos opcionales, nunca quitar ni cambiar significado). Lo importante es una política: cuánto tiempo se mantiene una versión y cómo se avisa la deprecación.

**Errores.** Usa los códigos de estado HTTP (no inventes los tuyos) y un cuerpo consistente con un código legible por máquinas, un mensaje para humanos y un ID de correlación para soporte:

```json
{ "error": { "code": "INSUFFICIENT_STOCK", "message": "Solo quedan 2 unidades", "requestId": "c0f3..." } }
```

**Idempotencia en operaciones no idempotentes.** Para un `POST /payments`, el cliente envía una cabecera `Idempotency-Key: 7d2c...`. El servidor guarda la clave con el resultado; si recibe la misma clave otra vez (reintento tras timeout), devuelve el resultado guardado sin cobrar de nuevo. Lo profundizarás en la sesión 12.

**Operaciones largas.** Si una operación tarda más de unos segundos, responde `202 Accepted` con un recurso de estado (`/jobs/77`) que el cliente consulta, o notifica al terminar (webhook o push).

**Rate limiting.** Toda API pública necesita límites por cliente y respuestas `429` con cabeceras que indiquen cuánto esperar (sesión 16).

### Del servidor al cliente: el problema del tiempo real

HTTP es petición-respuesta: el cliente pregunta y el servidor contesta. ¿Cómo hace el servidor para **avisar** al cliente de un mensaje nuevo en un chat, de un cambio de precio o de que su conductor llegó? Hay cuatro técnicas.

**Polling (sondeo corto).** El cliente pregunta cada N segundos "¿hay algo nuevo?".

```
 Cliente ──¿nuevo?──> Servidor ──no──>
 (5 s)
 Cliente ──¿nuevo?──> Servidor ──no──>
 (5 s)
 Cliente ──¿nuevo?──> Servidor ──sí: mensaje──>
```

Simple y funciona con cualquier infraestructura, pero desperdicia recursos (la mayoría de las respuestas son "no") y agrega latencia de hasta N segundos. Con 1 M de clientes sondeando cada 5 s, el servidor recibe 200.000 peticiones/s mayormente inútiles.

**Long polling.** El cliente pregunta y el servidor **mantiene la petición abierta** hasta que hay datos o vence un timeout (por ejemplo, 30 s). Al recibir la respuesta, el cliente vuelve a preguntar de inmediato.

Ventajas: casi tiempo real, funciona sobre HTTP normal y atraviesa proxies. Desventajas: cada cliente ocupa una conexión abierta; el servidor que tiene la conexión del destinatario puede no ser el que recibió el mensaje (hay que enrutar entre servidores); el servidor no sabe bien si el cliente se desconectó; y los clientes inactivos igual reconectan cada timeout.

**Server-Sent Events (SSE).** Una conexión HTTP de larga duración por la que el servidor envía un **flujo de eventos de texto** en un solo sentido (servidor → cliente). El navegador la soporta con `EventSource`, que reconecta automáticamente y reanuda desde el último ID recibido.

Ventajas: simple, sobre HTTP estándar, reconexión incorporada, ideal cuando el cliente casi solo recibe (cotizaciones, marcadores en vivo, notificaciones, respuestas de un LLM que se generan token a token). Desventajas: unidireccional (el cliente envía por peticiones HTTP normales), solo texto, y en HTTP/1.1 los navegadores limitan las conexiones por dominio.

**WebSockets.** Tras un *handshake* HTTP (`Upgrade: websocket`), la conexión se convierte en un canal TCP **bidireccional y persistente** con poco overhead por mensaje.

```
 Cliente ──GET /chat (Upgrade: websocket)──> Servidor
 Cliente <──101 Switching Protocols─────── Servidor
 Cliente <══════ mensajes en ambos sentidos ══════> Servidor
```

Ventajas: verdadero tiempo real en ambos sentidos, mínimo overhead tras abrir la conexión. Ideal para chat, juegos, edición colaborativa. Desventajas: es una conexión **con estado**, lo que complica el balanceo (usa least connections; las conexiones quedan pegadas a un servidor), los despliegues (hay que drenar y reconectar a los clientes de forma escalonada) y el escalado (cada servidor mantiene decenas o cientos de miles de conexiones; sesión 03). Además necesitas manejar reconexiones, heartbeats y algunos proxies corporativos que no las dejan pasar.

| Técnica | Dirección | Latencia | Costo en servidor | Complejidad | Usos |
| --- | --- | --- | --- | --- | --- |
| Polling | Cliente pregunta | Hasta el intervalo | Alto (peticiones vacías) | Baja | Datos que cambian poco, dashboards simples |
| Long polling | Servidor responde cuando hay datos | Baja | Conexiones abiertas + reconexiones | Media | Fallback cuando no hay WebSocket |
| SSE | Servidor → cliente | Muy baja | Conexiones abiertas | Baja | Feeds en vivo, notificaciones, streaming de texto |
| WebSocket | Bidireccional | Muy baja | Conexiones abiertas con estado | Alta | Chat, juegos, colaboración |

Para apps móviles en segundo plano, ninguna de estas sirve: el sistema operativo cierra las conexiones. Ahí se usan **notificaciones push** de la plataforma (APNs, FCM), que verás en la sesión 21.

### Un cálculo: polling frente a conexiones persistentes

Una app de seguimiento de pedidos tiene 2 M de usuarios con la app abierta en el pico, y cada pedido cambia de estado unas 6 veces en 40 minutos (≈ una vez cada 400 s).

- **Polling cada 5 s**: 2 M / 5 = **400.000 peticiones/s**, de las cuales más del 98 % responden "sin cambios". Con 2.000 peticiones/s por servidor, necesitas unos 200 servidores solo para decir "no".
- **Polling cada 30 s**: 66.000 peticiones/s, pero el usuario ve el cambio con hasta 30 s de retraso.
- **SSE o WebSocket**: 2 M conexiones abiertas; con unas 100.000 conexiones por servidor bien configurado, ~20 servidores de conexión. El tráfico útil es de 2 M / 400 s = **5.000 mensajes/s**, todos con información nueva y entregados en milisegundos.

El polling es más simple de operar, pero a esta escala las conexiones persistentes son mucho más eficientes. A escala pequeña (miles de usuarios), el polling suele ganar por simplicidad.

### Escalar conexiones persistentes

Con WebSockets o SSE, el mensaje para el usuario B puede llegar a un servidor distinto del que tiene la conexión de B. La solución típica es un registro de presencia o un pub/sub interno:

```
 [Servidor 1: conexión de A] ──publica "para B"──> [pub/sub (Redis, Kafka)]
                                                        │
 [Servidor 2: conexión de B] <───suscrito a canal de B──┘ ──WebSocket──> B
```

Cada servidor de conexiones se suscribe a los canales de los usuarios que tiene conectados. Esta es la base del diseño de chat de la sesión 23.

### Webhooks: el servidor llama al servidor

Cuando el cliente es **otro sistema** (no un navegador), la forma estándar de avisar es un **webhook**: el consumidor registra una URL y tu sistema le hace un `POST` cuando ocurre un evento (pago confirmado, envío entregado). Es como SSE, pero entre servidores y sin conexión persistente.

Diseñar webhooks bien implica:

- **Reintentos con backoff** durante horas o días, porque el receptor puede estar caído; y una cola por destinatario para que un receptor lento no frene a los demás.
- **Firmas** (HMAC con un secreto compartido) para que el receptor verifique que el aviso viene de ti y no fue alterado.
- **IDs de evento** para que el receptor deduplique: tus reintentos implican at-least-once.
- **Orden no garantizado**: incluye una versión o timestamp para que el receptor descarte eventos viejos.
- **Payload mínimo o completo**: enviar solo el ID obliga al receptor a consultar tu API (más tráfico, pero siempre datos frescos); enviar el objeto completo es más cómodo pero puede llegar desactualizado.

### Un ejemplo completo: la API de un acortador de URLs

Así se ve la sección de API de un design doc (la retomarás en el proyecto de la sesión 19):

```
 POST /v1/urls
   body: { "longUrl": "https://...", "customAlias"?: "promo-oct", "expiresAt"?: "2027-01-01" }
   201: { "shortUrl": "https://sho.rt/aZ3k9Q", "code": "aZ3k9Q" }
   400 INVALID_URL · 409 ALIAS_TAKEN · 429 RATE_LIMITED
   Cabecera opcional: Idempotency-Key

 GET /{code}
   301/302 Location: https://...   (sin cuerpo; es la ruta crítica de lectura)
   404 NOT_FOUND · 410 EXPIRED

 GET /v1/urls/{code}/stats?from=...&to=...
   200: { "clicks": 1203, "byCountry": {...} }   (eventualmente consistente)
```

Fíjate en las decisiones que ya quedan escritas: qué es síncrono y qué es eventual (las estadísticas), qué errores existen, qué operación necesita idempotencia, y que la ruta de lectura no lleva `/v1` porque la URL corta debe ser lo más breve posible. Una buena sección de API responde estas preguntas antes de dibujar cualquier caja.

### Cómo elegir en un diseño

1. ¿Quién consume? Público y heterogéneo → REST. Servicios internos con alto volumen → gRPC. Frontends con vistas complejas y equipos que iteran rápido → GraphQL como BFF.
2. ¿El servidor necesita avisar al cliente? Si casi nunca hay datos nuevos → polling espaciado. Solo servidor → cliente → SSE. Bidireccional y frecuente → WebSocket. App en segundo plano → push de plataforma.
3. ¿Qué pasa con reintentos? Las operaciones no idempotentes llevan claves de idempotencia.
4. ¿Cómo crece la API? Define desde el inicio paginación por cursor, versionado y formato de errores.

## Conceptos clave

- **REST**: estilo que expone recursos identificados por URIs y manipulados con verbos HTTP, sin estado y cacheable.
- **RPC**: llamada a una función remota como si fuera local, con stubs que serializan los argumentos.
- **gRPC**: RPC sobre HTTP/2 con Protocol Buffers y streaming.
- **GraphQL**: lenguaje de consulta donde el cliente pide exactamente los campos que necesita según un esquema.
- **Over-fetching / under-fetching**: recibir datos de más / necesitar varias peticiones para una vista.
- **Paginación por cursor**: la posición se codifica en un token y la consulta continúa desde ahí.
- **Idempotency-Key**: clave que permite reintentar una operación no idempotente sin duplicar efectos.
- **Long polling**: el servidor retiene la petición hasta tener datos o vencer un timeout.
- **SSE**: flujo unidireccional de eventos del servidor al cliente sobre HTTP.
- **WebSocket**: canal bidireccional persistente que se abre con un upgrade de HTTP.

## Preguntas de repaso

1. ¿Por qué gRPC es popular entre microservicios pero poco usado como API pública?
   R: Entre servicios internos aporta mensajes binarios compactos, contratos tipados con generación de código, streaming y HTTP/2, y ambos lados están bajo control del mismo equipo. Como API pública es incómodo: requiere proxy para navegadores, es difícil de depurar, acopla al cliente con el contrato y no aprovecha la cache HTTP estándar.
2. ¿Qué problema de GraphQL corresponde al N+1 y cómo se resuelve?
   R: Al resolver una lista (por ejemplo, comentarios) y luego un campo de cada elemento (su autor), un resolver ingenuo hace una consulta por elemento. Se resuelve con batching: un DataLoader acumula los IDs pedidos en el mismo ciclo y hace una sola consulta `WHERE id IN (...)`, además de cachear dentro de la petición.
3. ¿Por qué la paginación por cursor es mejor que la de offset para un feed?
   R: Porque con índice continúa directamente desde el último elemento visto, sin recorrer y descartar filas, y es estable ante inserciones nuevas: con offset, un post nuevo desplaza los elementos y el usuario ve duplicados o se salta elementos. La desventaja es que no permite saltar a una página arbitraria.
4. ¿Cuándo usarías SSE en lugar de WebSocket?
   R: Cuando la comunicación es casi solo del servidor al cliente, como notificaciones, cotizaciones, marcadores en vivo o respuestas que se generan token a token. SSE es más simple, va sobre HTTP estándar, atraviesa mejor la infraestructura existente y reconecta automáticamente reanudando desde el último ID. WebSocket se justifica cuando el cliente también envía mensajes frecuentes.
5. ¿Qué dificultades operativas introducen los WebSockets?
   R: Son conexiones con estado: el balanceo debe considerar conexiones (least connections) y quedan pegadas a un servidor; los despliegues requieren drenar y reconectar clientes gradualmente; cada servidor consume memoria por conexión; los mensajes para un usuario deben enrutarse al servidor que tiene su conexión (pub/sub o registro de presencia); y hay que manejar heartbeats, reconexiones y proxies que las bloquean.

## Ejercicio

Diseña la API de un servicio de reservas de canchas deportivas: escribe (a) los endpoints REST públicos con paginación por cursor, códigos de error y `Idempotency-Key` en la creación de reservas, (b) el `.proto` de un servicio interno de disponibilidad con un RPC de streaming, y (c) la elección justificada de mecanismo para avisar en vivo que una cancha se liberó. Implementa en TypeScript el endpoint de creación de reservas (con un framework HTTP que conozcas) con idempotencia en memoria y una prueba que envíe dos veces la misma clave y verifique que solo existe una reserva. Terminado cuando la prueba pase y el documento tenga las tres partes.

## Explícalo con tus palabras

Explica la diferencia entre polling, long polling y WebSockets con la imagen de esperar una carta: revisar el buzón cada hora, quedarte junto al buzón hasta que llegue algo, o tener una línea telefónica abierta con el remitente.
