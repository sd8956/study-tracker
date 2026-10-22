---
title: Estilos de comunicación entre microservicios
kind: lesson
hours: 2
sources: Building Microservices 2nd ed., cap. 4 "Microservice Communication Styles" (pp. 121–156) | Hands-On Microservices with Kubernetes, cap. 2 "Coordinating microservices" (pp. 55–56)
links: Enterprise Integration Patterns | https://www.enterpriseintegrationpatterns.com/ ; Martin Fowler — What do you mean by "Event-Driven"? | https://martinfowler.com/articles/201701-event-driven.html
---

## Objetivo

Elegir el estilo de comunicación adecuado para cada interacción entre servicios (síncrono bloqueante, asíncrono no bloqueante, request-response, event-driven, datos comunes) antes de elegir la tecnología, y diseñar el contenido de un evento.

## Estudio

### 1. De la llamada en proceso a la llamada en red

Dentro de un monolito, llamar a una función es casi gratis: nanosegundos, sin fallos de red, sin serialización. Al separar en servicios, esa misma llamada cruza la red, y eso cambia tres cosas de fondo.

**Rendimiento.** Una llamada en red cuesta milisegundos, no nanosegundos: serializar los datos, enviarlos, deserializarlos, y el viaje de ida y vuelta. Lo que antes era un bucle inocente de 1.000 llamadas a una función puede convertirse en 1.000 peticiones HTTP. Además, en proceso pasas **referencias** a objetos; en red siempre pasas **copias**. Mandar un objeto grande por la red tiene costo; tienes que pensar en el tamaño del payload.

**Cambios de interfaz.** En un monolito, si cambias la firma de una función, el IDE refactoriza todas las llamadas y se despliegan juntas. Entre servicios, el consumidor y el productor se despliegan por separado. Un cambio incompatible obliga a coordinar despliegues (lockstep) o a mantener versiones compatibles. Esto lo verás a fondo en la sesión 05.

**Manejo de errores.** En proceso, los errores suelen ser binarios: funciona o lanza una excepción. En red hay más modos de fallo. Una clasificación útil distingue:

| Tipo de fallo | Ejemplo | Qué implica |
| --- | --- | --- |
| Crash failure | El servidor se cayó | Reiniciar, redirigir a otra instancia |
| Omission failure | Enviaste la petición y nunca llegó respuesta | No sabes si se procesó: ¿reintentas? |
| Timing failure | La respuesta llegó demasiado tarde | Tu timeout ya saltó, pero quizá el otro lado sí hizo el trabajo |
| Response failure | Llegó una respuesta, pero es incorrecta (falta un campo, formato roto) | Validar, rechazar, alertar |
| Byzantine failure | El servicio responde cosas inconsistentes o maliciosas | Raro en sistemas internos, pero existe |

Por eso es importante que los errores de una API sean **expresivos**. HTTP ayuda: los códigos 4xx dicen "el problema es tu petición, no reintentes igual"; los 5xx dicen "el problema es mío, quizá funcione si reintentas". Un cliente que distingue entre ambos puede decidir bien si reintentar.

```ts
async function getStock(sku: string): Promise<number | "unknown"> {
  const res = await fetch(`http://inventory/stock/${sku}`, {
    signal: AbortSignal.timeout(500), // timing failure acotado
  });
  if (res.status === 404) throw new Error(`SKU desconocido: ${sku}`); // no reintentar
  if (res.status >= 500) return "unknown"; // degradar: mostrar "consultar disponibilidad"
  return (await res.json()).available;
}
```

### 2. Primero el estilo, después la tecnología

Hay decenas de tecnologías (REST, gRPC, GraphQL, Kafka, RabbitMQ, SQS, NATS...). Un error clásico es elegir la tecnología de moda y luego forzar todas las interacciones a encajar en ella. Es mejor decidir primero **qué tipo de interacción** necesitas y luego qué tecnología la implementa.

Un modelo útil para ordenar las opciones:

```
                     Estilos de comunicación
        ┌──────────────────────┴───────────────────────┐
  Síncrono bloqueante                     Asíncrono no bloqueante
        │                          ┌──────────────┼────────────────┐
  Request-response          Request-response   Event-driven    Datos comunes
  (REST, gRPC sobre         (petición y        (Kafka,          (archivos,
   HTTP en espera)           respuesta por      RabbitMQ,        data lake,
                             colas)             NATS)            BD compartida)
```

La primera decisión suele ser: **¿request-response o event-driven?** Si eliges request-response, aún puedes implementarlo de forma síncrona o asíncrona. Si eliges eventos, la implementación es necesariamente asíncrona.

Un sistema real **mezcla estilos**, e incluso un mismo servicio puede exponer una API request-response para consultas y publicar eventos para avisar de cambios. No hay un estilo "correcto" para todo el sistema.

### 3. Síncrono bloqueante

El servicio A llama a B y **espera** la respuesta antes de seguir. Es el modelo que todos conocemos: una petición HTTP a una API REST.

**Ventajas:**

- Familiar y fácil de razonar: el flujo se lee de arriba a abajo.
- Las herramientas, frameworks y depuradores lo soportan bien.
- Obtienes el resultado inmediatamente, útil cuando lo necesitas para continuar.

**Desventajas:**

- **Temporal coupling**: B tiene que estar disponible en ese momento. Si B está caído o lento, A también falla o se pone lento.
- **Cadenas largas**: si A llama a B, que llama a C, que llama a D, la latencia se suma y la probabilidad de fallo se multiplica. Si cada servicio tiene 99,5 % de disponibilidad, una cadena de cuatro está disponible aproximadamente 98 % del tiempo.
- **Contención de recursos**: mientras espera, A mantiene una conexión y un hilo o una promesa abiertos. Con mucha carga y un B lento, A puede quedarse sin recursos.

```
 Cadena síncrona (frágil)

 cliente ─► API ─► Pedidos ─► Fraude ─► Pagos ─► Banco externo
                                                    │
                       si el banco tarda 10 s ──────┘
                       todos los eslabones esperan 10 s
                       y acumulan conexiones abiertas
```

**Dónde usarlo:** consultas simples con pocas dependencias, operaciones donde el usuario espera la respuesta inmediata y la cadena es corta. Cuando veas cadenas largas, pregúntate si algún paso puede hacerse después (asíncrono) o si un servicio debería tener localmente los datos que pide.

### 4. Asíncrono no bloqueante

El servicio que inicia la comunicación **no se queda esperando**: envía el mensaje y sigue con su trabajo. Hay tres variantes principales: request-response asíncrono, eventos y datos comunes.

**Ventajas:**

- **Desacoplamiento temporal**: el receptor no necesita estar arriba en ese instante. El broker guarda el mensaje hasta que pueda procesarlo.
- **Absorbe picos**: si llegan 10.000 pedidos en un minuto, la cola los guarda y el consumidor los procesa a su ritmo.
- **Tareas largas**: procesos de minutos u horas (generar un PDF pesado, empaquetar un pedido) no mantienen una conexión abierta.

**Desventajas:**

- **Más complejidad**: más piezas (el broker), más conceptos (acks, reintentos, dead letter queues, orden de mensajes).
- **Depuración más difícil**: el flujo no se lee en un solo lugar; necesitas correlation IDs y tracing (sesión 14).
- **Consistencia eventual**: durante un tiempo, distintos servicios ven estados distintos.

**Dónde usarlo:** tareas largas, picos de carga, cuando no necesitas la respuesta para continuar, o cuando quieres que el emisor no conozca a los receptores.

### 5. Request-response

Un servicio **pide** a otro que haga algo y espera una respuesta con el resultado. Puede ser:

- **Síncrono**: HTTP, gRPC. La respuesta llega por la misma conexión.
- **Asíncrono**: el pedido viaja por una cola y la respuesta vuelve por otra cola. El emisor debe poder recibir la respuesta en otro momento (quizá en otra instancia) y relacionarla con el pedido original mediante un **correlation ID**.

```
 Request-response asíncrono con colas

 Pedidos ──(reservar stock, corrId=42)──► [cola: inventory.requests] ──► Inventario
    ▲                                                                       │
    └────────(reservado, corrId=42)──── [cola: orders.replies] ◄────────────┘
```

Es apropiado cuando el resultado importa para continuar ("¿se reservó el stock? si no, no confirmo el pedido") y cuando el emisor **sabe** qué quiere que pase.

Un caso típico es una consulta en paralelo: pides precios a varios proveedores al mismo tiempo y combinas las respuestas. Con promesas en TypeScript:

```ts
const quotes = await Promise.allSettled(
  providers.map((p) => fetch(p.url, { signal: AbortSignal.timeout(800) }).then((r) => r.json())),
);
const valid = quotes.filter((q) => q.status === "fulfilled").map((q) => q.value);
```

Fíjate que es no bloqueante a nivel de hilo (Node no se bloquea), pero lógicamente sigue siendo request-response: necesitas las respuestas.

### 6. Event-driven

Aquí cambia la intención. Un servicio **emite un evento**: un hecho sobre algo que ocurrió dentro de su dominio ("pedido empaquetado", "cliente registrado"). No sabe quién lo escucha, ni siquiera si alguien lo escucha. Los interesados se suscriben y deciden qué hacer.

```
                         ┌──────────────► Notificaciones (envía email)
 Almacén ── "Pedido      │
            empaquetado" ┼──────────────► Inventario (ajusta stock)
            ──► [broker] │
                         └──────────────► Analytics (actualiza métricas)
```

La diferencia con request-response es una **inversión de responsabilidad**:

| Request-response | Event-driven |
| --- | --- |
| "Notificaciones, envía este email" | "Pasó esto; quien le importe, que actúe" |
| El emisor sabe qué debe pasar después | Los receptores deciden qué hacer |
| El emisor conoce las capacidades del receptor (más domain coupling) | El emisor no conoce a los receptores (menos acoplamiento) |
| Añadir un consumidor nuevo exige cambiar al emisor | Añadir un consumidor nuevo no toca al emisor |

Esta distribución de responsabilidad se parece a cómo se organizan los equipos autónomos: en vez de concentrar la lógica en un servicio central que lo sabe todo, cada servicio decide cómo reaccionar a lo que pasa.

**Eventos y mensajes no son lo mismo.** Un **evento** es un hecho (el contenido). Un **mensaje** es lo que viaja por un mecanismo asíncrono (el medio). Puedes mandar un evento dentro de un mensaje, y también puedes mandar un pedido dentro de un mensaje (request-response asíncrono).

**Implementación.** Necesitas dos cosas: una forma de emitir eventos y una forma de que los consumidores se enteren. Los message brokers (RabbitMQ, Kafka, NATS) resuelven ambas: el productor publica en un tópico y el broker entrega a los suscriptores, a veces recordando qué mensajes ya leyó cada uno. Una advertencia importante: **middleware tonto, endpoints inteligentes**. Si empiezas a poner lógica de negocio dentro del broker (transformaciones, enrutamiento complejo, reglas), recreas el antiguo enterprise service bus, un punto central que todos dependen y nadie entiende. La lógica vive en los servicios.

Otra opción, más modesta, es publicar eventos por HTTP como un feed (por ejemplo, con el formato Atom) que los consumidores consultan periódicamente. Sirve si ya tienes buena infraestructura HTTP, pero si empiezas a necesitar más garantías (entrega exactamente a un consumidor de un grupo, seguimiento de lo leído), es mejor pasarte a un broker en vez de reinventarlo.

### 7. ¿Qué va dentro de un evento?

Imagina el evento `ClienteRegistrado`. Lo escuchan `Fidelización` (crea una cuenta de puntos) y `Notificaciones` (envía un email de bienvenida). Hay dos opciones:

**Solo el ID.**

```json
{ "type": "CustomerRegistered", "customerId": "c-981", "occurredAt": "2026-10-20T14:02:11Z" }
```

`Fidelización` tiene suficiente, pero `Notificaciones` necesita el email y el nombre, así que llama a `Clientes` para pedirlos. Problemas: más domain coupling (Notificaciones ahora conoce a Clientes) y, si cinco servicios reaccionan al mismo evento, `Clientes` recibe una avalancha de peticiones justo después de publicar.

**Evento completo.**

```json
{
  "type": "CustomerRegistered",
  "eventId": "e-5f2a",
  "occurredAt": "2026-10-20T14:02:11Z",
  "customer": { "id": "c-981", "name": "Ana Torres", "email": "ana@example.com", "country": "CO" }
}
```

La regla práctica: **pon en el evento todo lo que estarías dispuesto a compartir por una API**. Si dejarías que `Notificaciones` pida el email, inclúyelo de una vez. Los receptores se vuelven autosuficientes y el evento sirve además como registro histórico (útil para auditoría o event sourcing).

Cuidados con los eventos completos:

- **Tamaño**: los brokers tienen límites (Kafka, por defecto, alrededor de 1 MB por mensaje). Para datos grandes, manda una referencia.
- **Datos sensibles**: todo lo que pongas en el evento lo ven todos los suscriptores, y queda guardado en el broker. No incluyas datos que algunos receptores no deberían ver; en ese caso, que pidan el detalle a una API con control de acceso.
- **Es un contrato**: los campos que publicas son difíciles de quitar después. Trátalos con el mismo cuidado que una API.

Incluye siempre un `eventId` único (para que los consumidores detecten duplicados) y el momento en que ocurrió el hecho.

### 8. Comunicación a través de datos comunes

Un servicio escribe datos en un lugar compartido y otro los lee: un archivo en un directorio, un data lake, un data warehouse, o una base de datos. No siempre se piensa como "comunicación", pero lo es.

**Ventajas:** cualquier tecnología sabe leer un archivo; sirve para volúmenes enormes (exportar millones de registros); los sistemas viejos pueden participar.

**Desventajas:** la latencia suele ser alta (el lector sondea cada X minutos); el formato del archivo es un contrato frágil; si el recurso es mutable y lo escriben varios, vuelves al common coupling.

**Dónde usarlo:** integración con sistemas heredados, grandes volúmenes en batch, pipelines de datos. Y una distinción importante: un **data lake** donde cada productor deja datos crudos y un **data warehouse** con un esquema común son patrones distintos; en el segundo, cambiar el esquema afecta a todos.

### 9. Cómo elegir: una guía de decisión

```
 ¿Necesitas el resultado para continuar?
   ├── Sí ─► request-response
   │         ├── ¿respuesta en < 1 s y cadena corta? ─► síncrono (HTTP/gRPC)
   │         └── ¿tarea larga o el receptor puede estar caído? ─► asíncrono (colas + correlation ID)
   └── No ─► ¿El emisor debe decidir qué pasa después?
             ├── Sí ─► comando asíncrono por cola
             └── No ─► evento (pub/sub)
 ¿Grandes volúmenes en batch o sistemas heredados? ─► datos comunes (archivos, lake)
```

Considera también requisitos no funcionales: latencia aceptable, volumen, si necesitas garantías de entrega, y las habilidades del equipo. Un equipo que nunca operó un broker no debería introducir Kafka para tres eventos al día.

### 10. Advertencia: lo asíncrono es potente pero tiene filo

Los sistemas basados en eventos son elegantes y desacoplados, pero un flujo de negocio repartido en diez consumidores es difícil de seguir. Es fácil perder la vista de "qué pasa cuando un cliente compra". Historias habituales:

- Un consumidor con un bug procesa un mensaje, falla, el mensaje vuelve a la cola, se reintenta y falla otra vez, indefinidamente, bloqueando a los demás o consumiendo recursos. Solución: límite de reintentos y una **dead letter queue** (DLQ) donde aparcar mensajes problemáticos para revisarlos.
- Se pierde el orden: `PedidoCancelado` llega antes que `PedidoCreado`. Solución: no asumir orden global, usar números de versión por entidad o particionar por ID para mantener el orden por entidad.
- Duplicados: el broker entrega "al menos una vez", así que un mismo evento puede llegar dos veces. Solución: consumidores **idempotentes** (módulo 05, sesión 12) usando el `eventId`.

Empieza con lo simple y adopta comunicación asíncrona donde aporte un beneficio claro. Invierte en observabilidad antes de que el sistema sea difícil de seguir.

### 10.1 Ejemplo trabajado: el flujo de compra completo

Toma una tienda con los servicios `Checkout`, `Inventario`, `Pagos`, `Pedidos`, `Notificaciones`, `Fidelización` y `Analytics`. Asignemos un estilo a cada interacción y justifiquemos.

| Interacción | Estilo elegido | Por qué |
| --- | --- | --- |
| `Checkout` consulta disponibilidad a `Inventario` para mostrar "en stock" | Request-response síncrono (HTTP) con timeout corto | El usuario espera la respuesta en pantalla; si falla, se degrada a "consultar disponibilidad" |
| `Checkout` pide a `Pagos` autorizar la tarjeta | Request-response síncrono | El usuario necesita saber ya si el pago se aprobó; la cadena es corta (Checkout → Pagos → pasarela) |
| `Pedidos` pide a `Inventario` reservar las unidades | Request-response asíncrono por cola | La reserva puede tardar si hay contención; `Pedidos` no debe bloquearse, pero sí necesita el resultado para confirmar |
| `Pedidos` anuncia que el pedido quedó confirmado | Evento `OrderConfirmed` | Varios servicios reaccionan (Notificaciones, Fidelización, Analytics) y `Pedidos` no debería conocerlos |
| `Analytics` recibe el detalle de todas las ventas del día para el data warehouse | Datos comunes (export diario a un bucket) | Volumen alto, latencia de horas aceptable, el equipo de datos usa herramientas de batch |

Observa varias cosas. Primero, **un mismo servicio usa varios estilos**: `Pedidos` hace request-response asíncrono con `Inventario` y publica eventos. Segundo, las interacciones síncronas están **en el borde**, donde un humano espera; las asíncronas, en el interior, donde el trabajo puede continuar sin bloquear. Tercero, si mañana aparece un servicio de `Recomendaciones` que quiere aprender de las compras, se suscribe a `OrderConfirmed` sin que nadie más cambie.

Ahora imagina la alternativa "todo síncrono": `Checkout` llama a `Pedidos`, que llama a `Inventario`, `Notificaciones`, `Fidelización` y `Analytics` antes de responder. Si el proveedor de email tarda tres segundos, cada compra tarda tres segundos más; si `Analytics` está caído, nadie puede comprar. Un fallo en una función secundaria tumba la función principal del negocio. Este análisis, interacción por interacción, es exactamente lo que harás en el proyecto de la sesión 08.

### 11. Errores comunes

- Elegir la tecnología antes de decidir el estilo de interacción.
- Usar llamadas síncronas en cadenas largas para tareas que no necesitan respuesta inmediata.
- Publicar eventos con solo un ID cuando todos los receptores terminan llamando de vuelta.
- Meter lógica de negocio en el broker.
- Tratar 4xx y 5xx igual y reintentar peticiones que nunca van a funcionar.
- Asumir que los mensajes llegan una sola vez y en orden.

## Conceptos clave

- **Síncrono bloqueante**: el emisor espera la respuesta antes de continuar.
- **Asíncrono no bloqueante**: el emisor sigue trabajando sin esperar a que el mensaje se procese.
- **Request-response**: un servicio pide algo y espera conocer el resultado; puede ser síncrono o asíncrono.
- **Event-driven**: un servicio emite hechos sin saber quién los consume; los receptores deciden cómo reaccionar.
- **Evento vs. mensaje**: el evento es el hecho; el mensaje es el sobre que lo transporta.
- **Correlation ID**: identificador que relaciona una respuesta asíncrona con su petición.
- **Dead letter queue**: cola donde se aparcan mensajes que fallaron demasiadas veces.
- **Middleware tonto, endpoints inteligentes**: la lógica de negocio vive en los servicios, no en el broker.

## Preguntas de repaso

1. ¿Qué tres cosas cambian cuando una llamada en proceso pasa a ser una llamada en red?
   R: El rendimiento (latencia de milisegundos, serialización y copias de datos en vez de referencias), la gestión de cambios de interfaz (consumidor y productor se despliegan por separado, así que los cambios incompatibles requieren coordinación) y el manejo de errores (aparecen fallos por omisión, timeouts y respuestas incorrectas, no solo excepciones).
2. ¿Por qué una cadena larga de llamadas síncronas es frágil?
   R: Porque la latencia se suma y la disponibilidad se multiplica: si cada eslabón está disponible 99,5 %, la cadena completa lo está menos. Además, un servicio lento al final hace que todos los anteriores mantengan conexiones abiertas y puedan agotar recursos (temporal coupling).
3. Explica la inversión de responsabilidad entre request-response y event-driven.
   R: En request-response el emisor sabe qué debe pasar y le dice al receptor qué hacer, lo que exige conocer sus capacidades. En event-driven el emisor solo publica un hecho, sin conocer a los receptores, y cada receptor decide cómo reaccionar. Esto reduce el acoplamiento y permite añadir consumidores sin tocar al emisor.
4. ¿Qué conviene incluir en un evento y qué precauciones hay que tener?
   R: Todo lo que estarías dispuesto a compartir por una API, para que los receptores no tengan que llamar de vuelta, más un eventId único y la fecha del hecho. Precauciones: límite de tamaño del broker, no incluir datos sensibles que algunos suscriptores no deban ver, y tratar los campos como contrato que es difícil quitar.
5. ¿Cuándo es apropiado comunicarse a través de datos comunes?
   R: Para grandes volúmenes en batch, integración con sistemas heredados o pipelines de datos, donde la latencia alta es aceptable. Hay que cuidar el formato como contrato y evitar que varios servicios escriban el mismo recurso mutable.
6. ¿Para qué sirve un correlation ID en request-response asíncrono?
   R: Para relacionar la respuesta, que llega por otra cola y quizá a otra instancia del emisor, con la petición original y retomar el flujo correcto.

## Ejercicio

Con Node y TypeScript, sin broker externo, simula los dos estilos con un `EventEmitter`. Escribe un servicio `customers` que registra un cliente y publica `CustomerRegistered` con el evento completo, y dos consumidores (`loyalty`, `notifications`) que reaccionan. Luego añade un tercer consumidor `analytics` **sin modificar** `customers`. Después implementa la variante request-response donde `customers` llama directamente a cada servicio. Criterio de terminado: en la versión con eventos, añadir `analytics` no cambia ninguna línea de `customers`; en la versión request-response sí. Anota en un comentario qué versión prefieres para este caso y por qué.

## Explícalo con tus palabras

Explica la diferencia entre "pedirle a alguien que haga algo" y "anunciar que algo pasó" usando el ejemplo de una oficina, y conéctala con el acoplamiento entre servicios.
