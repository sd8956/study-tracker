---
title: Proyecto — diseña un sistema de chat en 3 horas
kind: project
hours: 3
sources: System Design Interview (Alex Xu), cap. 12 "Design a chat system" (pp. 178–199) | karanpratapsingh/system-design, cap. V "WhatsApp" y cap. III "Long polling, WebSockets, Server-Sent Events (SSE)"
links: Karan — WhatsApp | https://github.com/karanpratapsingh/system-design#whatsapp ; Karan — Long polling, WebSockets, SSE | https://github.com/karanpratapsingh/system-design#long-polling-websockets-server-sent-events-sse ; Karan — Service Discovery | https://github.com/karanpratapsingh/system-design#service-discovery
---

## Objetivo

Diseñar de punta a punta un chat tipo WhatsApp o Messenger: conexiones persistentes, servicios con y sin estado, almacenamiento de mensajes, IDs ordenados, flujos uno a uno y de grupo, sincronización entre dispositivos, presencia, entrega a usuarios desconectados y confirmaciones de lectura; entregar un design doc y un prototipo con WebSockets en TypeScript.

## Estudio

### Requisitos de referencia

Del libro: chat uno a uno y de grupo (hasta 100 personas), app móvil y web, 50 M DAU, solo texto (menos de 100.000 caracteres), indicador de en línea, soporte multi-dispositivo, notificaciones push, historial guardado para siempre; el cifrado de extremo a extremo queda fuera.

De Karan (tipo WhatsApp): además, archivos multimedia y, como extendidos, confirmaciones de enviado, entregado y leído, "última vez en línea" y push.

### Estimaciones de referencia (Karan)

```
 mensajes/día = 50 M DAU × 40 = 2.000 M  → ≈ 24.000/s (pico ~50.000/s)
 texto        = 2.000 M × 100 B = 200 GB/día
 media        = 5 % = 100 M archivos × 100 KB = 10 TB/día
 10 años      ≈ 10,2 TB × 365 × 10 ≈ 38 PB
 ingreso      ≈ 120 MB/s
```

Y conexiones: si en el pico hay 1 M de usuarios conectados a la vez y cada conexión ocupa ~10 KB de memoria en el servidor, son ~10 GB: cabe en un servidor moderno, pero **no** conviene poner a todos en uno (punto único de fallo). El límite práctico es cuántas conexiones concurrentes sostiene cada servidor de chat.

### Cómo llegan los mensajes al cliente

El emisor envía por HTTP o WebSocket sin problema. Lo difícil es que **el servidor empuje** mensajes al receptor (sesión 10):

- **Polling**: el cliente pregunta periódicamente; desperdicia recursos (la mayoría de las respuestas están vacías).
- **Long polling**: el servidor retiene la petición hasta tener mensajes o vencer un timeout. Problemas: el emisor y el receptor pueden estar conectados a servidores distintos (los servidores HTTP suelen ser stateless y el balanceador reparte al azar); el servidor no sabe bien si el cliente se desconectó; y usuarios inactivos igualmente reconectan cada timeout.
- **WebSocket**: conexión bidireccional y persistente iniciada como HTTP y "promovida". Es la solución estándar: sirve para enviar y recibir, usa los puertos 80/443 (atraviesa firewalls) y es eficiente. Su costo: conexiones **con estado** que hay que gestionar en el servidor.

### Servicios con y sin estado

```
                  ┌──────── HTTP ────────> [LB] → [Servicios stateless: login, signup, perfil, grupos]
 Usuario ─────────┤                                      └→ [Service discovery]
                  └─────── WebSocket ─────> [Chat servers (stateful)] ←→ [Presence servers]
                                                  │
                                         [ID generator] [Message sync queues] [KV store]
                                                  │
                                         [Push notification service] (usuarios offline)
```

- **Servicios sin estado** (detrás de un LB): login, registro, perfil, gestión de grupos. Uno importante es **service discovery**: recomienda al cliente el mejor servidor de chat según ubicación y capacidad. ZooKeeper (u otro registro) conoce todos los servidores de chat disponibles.
- **Servicios con estado**: los servidores de chat. Cada cliente mantiene una conexión persistente con **uno** de ellos y normalmente no cambia mientras ese servidor esté disponible.
- **Integración con terceros**: el servicio de push (sesión 21) para avisar a usuarios desconectados.

Flujo de login: (1) el usuario hace login vía API; (2) el LB lo envía a los servidores de API; (3) tras autenticar, service discovery elige el mejor servidor de chat (por ejemplo, el servidor 2) y devuelve su dirección; (4) el cliente abre un WebSocket con el servidor 2.

### Almacenamiento

Hay dos tipos de datos:

1. **Genéricos** (perfiles, configuración, amigos): en bases relacionales con réplicas y sharding.
2. **Historial de chat**: el patrón es particular. El volumen es enorme (Facebook Messenger y WhatsApp procesaban del orden de 60.000 millones de mensajes por día). Solo se acceden con frecuencia los mensajes **recientes**. Pero hay acceso aleatorio ocasional (búsqueda, saltar a una mención). Y la proporción lectura/escritura es de aproximadamente 1:1 en chats uno a uno.

Por eso el libro recomienda un **key-value / wide-column store**: escala horizontal sencilla, latencia muy baja, y es lo que usan sistemas probados (Messenger usó HBase; Discord, Cassandra). Las bases relacionales sufren con índices enormes y accesos aleatorios a esta escala.

Modelos de datos:

```
 Mensajes 1:1:     message(message_id PK, message_from, message_to, content, created_at)
 Mensajes grupo:   group_message(channel_id, message_id, user_id, content, created_at)
                   PK compuesta (channel_id, message_id); channel_id es la clave de partición
```

No se ordena por `created_at` porque dos mensajes pueden crearse en el mismo instante.

### IDs de mensaje

Requisitos: **únicos** y **ordenables por tiempo** (un mensaje nuevo tiene un ID mayor). Opciones:

- Auto-increment: no existe en la mayoría de los key-value stores.
- **Generador global tipo Snowflake** (sesión 18).
- **Generador de secuencia local** por canal: el ID solo debe ser único y ordenado **dentro de una conversación**, lo cual es más fácil de implementar y suficiente.

### Flujo uno a uno

```
 A ──WS──> [Chat server 1] ─1. obtiene ID─> [ID generator]
                │ 2. envía a la message sync queue
                ▼
          [Message sync queue] ─3. guarda─> [KV store]
                │
     4a. B online:  → [Chat server 2] ──WS──> B
     4b. B offline: → [Push notification service] → B
```

### Sincronización multi-dispositivo

Un usuario puede tener el teléfono y el portátil conectados a la vez, cada uno con su WebSocket (quizás a servidores distintos). Cada dispositivo mantiene una variable **`cur_max_message_id`**: el ID del último mensaje que vio. Los mensajes nuevos para ese dispositivo son los que cumplen: destinatario igual al usuario conectado **y** `message_id > cur_max_message_id`. Con un valor distinto por dispositivo, cada uno pide al KV store solo lo que le falta.

### Grupos pequeños

Cuando A envía a un grupo con B y C, el mensaje se **copia** a la cola de sincronización (la "bandeja de entrada") de cada miembro. Es **fan-out al escribir** (sesión 22): cada cliente solo revisa su propia bandeja, lo que simplifica la sincronización. Funciona bien para grupos pequeños (WeChat limitaba los grupos a 500 miembros con un diseño de este tipo); para grupos o canales enormes, copiar a cada miembro es demasiado caro y se usa fan-out al leer. Del lado del receptor, su bandeja recibe mensajes de muchos emisores distintos.

### Presencia (en línea / desconectado)

Los **presence servers** gestionan el estado y lo comunican por WebSocket.

- **Login**: al abrir el WebSocket, se guarda `status = online` y `last_active_at` en el KV store.
- **Logout**: al cerrar sesión, `status = offline`.
- **Desconexiones**: las redes móviles se cortan constantemente (por ejemplo, al entrar a un túnel). Marcar offline en cada corte haría parpadear el indicador. Se usa un **heartbeat**: el cliente envía un latido cada ~5 s; si el servidor no recibe ninguno en un plazo (por ejemplo, 30 s), recién entonces marca offline.
- **Propagación a amigos**: modelo pub/sub. Cada par de amigos tiene un canal; cuando A cambia de estado, se publica en los canales A-B, A-C, A-D y los amigos suscritos lo reciben. Funciona para grupos pequeños; para grupos de miles de miembros, propagar cada cambio sería muy caro: se obtiene la presencia solo al abrir el grupo o al refrescar manualmente.

### Confirmaciones de lectura y otros extendidos

Las confirmaciones (enviado, entregado, leído) son a su vez mensajes de control que viajan por el mismo canal: el servidor confirma "enviado" al guardar; el dispositivo del receptor envía "entregado" al recibir y "leído" al abrir la conversación, y el servidor los reenvía al emisor. Para grupos, se agregan por miembro. Los archivos multimedia se suben a object storage (con URLs prefirmadas) y el mensaje solo lleva la referencia; el cifrado de extremo a extremo implica que el servidor solo ve contenido cifrado, lo que impide búsquedas del lado del servidor.

### Escalado y fallos

- Si un servidor de chat cae, sus clientes reconectan; service discovery les asigna otro servidor y cada dispositivo sincroniza desde su `cur_max_message_id`, así que no se pierden mensajes (estaban en el KV store).
- Reenvío de mensajes fallidos: reintentos y colas.
- Cache en el cliente y en el servidor para conversaciones recientes; servidores de chat cerca del usuario para reducir latencia; aislar el procesamiento de media (que es pesado) del de texto.

## Qué hacer

Usa la plantilla de design doc de la sesión 15. Tiempo sugerido entre paréntesis.

**Escenario**: una app de mensajería para Latinoamérica con 30 M DAU, 60 mensajes por usuario al día, 8 M de usuarios conectados a la vez en el pico (20:00–22:00), chats 1:1, grupos de hasta 256 personas, envío de fotos y notas de voz, confirmaciones de entregado y leído, y sincronización entre teléfono y web.

1. **Requisitos (15 min).** Funcionales priorizados, no funcionales con números (latencia de entrega p99 entre usuarios conectados, durabilidad, disponibilidad), fuera de alcance (¿cifrado de extremo a extremo?).
2. **Estimación (20 min).** Mensajes/s promedio y pico; almacenamiento de texto y media a 5 años con replicación; número de servidores de chat si cada uno sostiene 100.000 WebSockets con margen del 50 %; heartbeats/s de presencia (cada 5 s por conectado); tráfico de confirmaciones. Cuatro conclusiones.
3. **API y protocolo (15 min).** Endpoints HTTP (login, historial paginado, subir media) y mensajes del protocolo WebSocket en JSON: enviar, ack de servidor, entregado, leído, heartbeat, cambio de presencia.
4. **Modelo de datos (15 min).** Tablas de mensajes 1:1 y de grupo, bandeja por usuario o por dispositivo, presencia, membresía de grupos; almacenamiento elegido y claves de partición; generación de IDs.
5. **Alto nivel (25 min).** Diagrama ASCII completo con servicios stateless, chat servers, service discovery, presence, ID generator, colas, KV store, object storage, push. Numera el flujo 1:1 con receptor conectado y con receptor desconectado.
6. **Profundización 1: enrutar mensajes entre servidores de chat (20 min).** ¿Cómo sabe el chat server 1 que B está en el chat server 7? Compara un registro de sesiones (usuario → servidor) frente a pub/sub por usuario; qué pasa durante una reconexión.
7. **Profundización 2: grupos, multi-dispositivo y confirmaciones (25 min).** Fan-out en grupos de 256 (¿copias o fan-out al leer?), `cur_max_message_id` por dispositivo, y cómo se agregan las confirmaciones de leído en un grupo sin generar una tormenta de mensajes.
8. **Fallos y escala (15 min).** Tabla "qué pasa si cae": un chat server, el KV store de una región, la cola, el servicio de push. Despliegue de una nueva versión de los chat servers sin desconectar a 8 M de usuarios a la vez.
9. **Prototipo (25 min).** Con Node.js y la librería `ws` (o el WebSocket nativo si tu runtime lo trae): un servidor con conexiones por usuario, envío 1:1, almacenamiento en memoria con IDs crecientes por conversación, entrega diferida al reconectar usando `lastSeenId`, y heartbeats con desconexión tras 3 latidos perdidos. Pruebas con dos clientes: entrega inmediata, entrega tras reconexión sin pérdidas ni duplicados, y paso a offline tras heartbeats perdidos.
10. **Alternativas descartadas (5 min).**

**Entregable**: `chat-design.md` con las 11 secciones y el prototipo con sus pruebas.

**Rúbrica** (1 a 3 por criterio):

| Criterio | 1 | 2 | 3 |
| --- | --- | --- | --- |
| Requisitos y estimación | Sin números | Mensajes y almacenamiento | Conexiones, servidores, presencia y conclusiones |
| Protocolo y datos | Vagos | Tablas y mensajes WS definidos | Particionado, IDs por conversación y bandejas justificadas |
| Enrutamiento | No resuelto | Una solución | Dos soluciones comparadas, con reconexión |
| Grupos y multi-dispositivo | Ignorados | Uno tratado | Fan-out, sync por dispositivo y confirmaciones agregadas |
| Fallos y despliegue | Ausente | Algunos casos | Tabla completa y despliegue gradual de conexiones |
| Prototipo | No funciona | Funciona sin pruebas | Las tres pruebas pasan |

Proyecto terminado cuando todos los criterios estén al menos en 2 y el prototipo pase sus pruebas.

## Conceptos clave

- **Chat server stateful**: servidor que mantiene las conexiones persistentes de sus clientes.
- **Service discovery para chat**: servicio que asigna a cada cliente el mejor chat server disponible.
- **Message sync queue**: bandeja de entrada por destinatario de la que el cliente obtiene sus mensajes.
- **cur_max_message_id**: último ID de mensaje visto por un dispositivo; base de la sincronización.
- **Heartbeat de presencia**: latido periódico que evita marcar offline por cortes breves.
- **Fan-out en grupos**: copia del mensaje a la bandeja de cada miembro.

## Preguntas de repaso

1. ¿Por qué WebSocket es preferible a long polling para un chat?
   R: Porque es bidireccional y persistente, con poco overhead por mensaje, y permite que el servidor empuje mensajes al instante. Long polling obliga a enrutar entre servidores stateless que no tienen la conexión del receptor, no detecta bien desconexiones y hace reconectar continuamente incluso a usuarios inactivos.
2. ¿Cómo sincroniza mensajes un usuario con teléfono y portátil conectados a la vez?
   R: Cada dispositivo guarda su propio cur_max_message_id, el último mensaje que recibió. Al conectarse o recibir un aviso, pide al almacenamiento los mensajes dirigidos a ese usuario con ID mayor que ese valor. Como cada dispositivo tiene su propio valor, cada uno obtiene exactamente lo que le falta.
3. ¿Por qué se usa un heartbeat para la presencia en lugar de marcar offline al cortarse la conexión?
   R: Porque las conexiones móviles se cortan con frecuencia por instantes (túneles, cambios de red). Marcar offline en cada corte haría parpadear el estado y generaría muchos eventos. Con heartbeats, solo se marca offline si no llega ningún latido en un plazo, como 30 segundos.
4. ¿Por qué el historial de chat suele ir a un key-value o wide-column store?
   R: Por el volumen enorme y creciente, el patrón de acceso centrado en los mensajes recientes de una conversación (clave de partición por canal y orden por ID), el ratio de lectura y escritura cercano a 1:1 y la necesidad de escalar horizontalmente con baja latencia, algo que las bases relacionales manejan peor a esa escala.

## Explícalo con tus palabras

Explica cómo un mensaje de chat llega de tu teléfono al de un amigo usando la imagen de dos personas hablando por walkie-talkie a través de una central que guarda una copia de cada mensaje.
