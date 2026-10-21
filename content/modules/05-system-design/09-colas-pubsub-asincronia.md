---
title: Asincronía — colas, pub/sub y back pressure
kind: lesson
hours: 2
sources: System Design Primer, "Asynchronism" (message queues, task queues, back pressure) | karanpratapsingh/system-design, cap. III "Message Brokers", "Message Queues", "Publish-Subscribe" y "Enterprise Service Bus (ESB)" | System Design Interview (Alex Xu), cap. 1, "Message queue" (pp. 24–25)
links: Primer — Asynchronism | https://github.com/donnemartin/system-design-primer#asynchronism ; Primer — Back pressure | https://github.com/donnemartin/system-design-primer#back-pressure ; Karan — Message Brokers | https://github.com/karanpratapsingh/system-design#message-brokers ; Karan — Message Queues | https://github.com/karanpratapsingh/system-design#message-queues ; Karan — Publish-Subscribe | https://github.com/karanpratapsingh/system-design#publish-subscribe ; Karan — ESB | https://github.com/karanpratapsingh/system-design#enterprise-service-bus-esb
---

## Objetivo

Decidir cuándo sacar trabajo de la ruta síncrona, elegir entre cola punto a punto, pub/sub y log de eventos, dimensionar consumidores con números, y manejar entregas duplicadas, orden, mensajes envenenados y sobrecarga con back pressure.

## Estudio

### Síncrono frente a asíncrono

En una llamada **síncrona**, quien llama espera la respuesta: el navegador espera a que el servidor guarde el pedido, el servidor espera a la base de datos. Es simple de razonar, pero acopla en el tiempo: si cualquier eslabón es lento o está caído, quien llama también lo está (recuerda la ley de Little y los fallos en cascada de la sesión 02).

En un flujo **asíncrono**, quien produce el trabajo lo deja en un intermediario y sigue; otro proceso lo hace después. Usarlo tiene sentido cuando:

1. **El trabajo es lento** y el usuario no necesita el resultado para continuar: transcodificar un video, generar un PDF, enviar emails, redimensionar imágenes.
2. **Hay picos** que superan la capacidad de procesamiento: la cola absorbe el pico y los consumidores lo procesan a su ritmo (*load leveling*).
3. **Varios sistemas deben reaccionar** al mismo hecho: un pedido creado dispara facturación, inventario, email y analítica.
4. **Quieres aislar fallos**: si el servicio de emails cae, los pedidos siguen creándose; los emails esperan en la cola.
5. **El trabajo puede hacerse por adelantado**: agregaciones periódicas, precálculo de feeds o reportes.

Piensa en la diferencia como en dos formas de pedir comida: en la síncrona esperas de pie en el mostrador hasta que te entregan el plato; en la asíncrona dejas tu pedido, recibes un número y te avisan cuando está listo. La segunda escala mejor porque el mostrador queda libre para el siguiente cliente.

Y no lo uses cuando el cálculo es barato o el flujo es realmente de tiempo real y el usuario necesita la respuesta: una cola agrega latencia, piezas móviles y complejidad de depuración.

### Anatomía de una cola de mensajes

```
 [Productor A]─┐                          ┌─> [Consumidor 1]
 [Productor B]─┼──> [  cola: m5 m4 m3 m2 m1 ] ─┼─> [Consumidor 2]
 [Productor C]─┘                          └─> [Consumidor 3]
                    persistida y replicada
```

El flujo típico:

1. La aplicación publica un trabajo (`{ type: "resize", imageId: 123 }`) y responde al usuario de inmediato con un estado ("procesando").
2. Un worker toma el mensaje, lo procesa y lo **confirma** (*ack*). Solo entonces la cola lo borra.
3. Si el worker muere antes de confirmar, el mensaje vuelve a estar visible tras un tiempo (*visibility timeout*) y otro worker lo toma.

El usuario no queda bloqueado. Para que la experiencia parezca instantánea, el cliente puede hacer una parte del trabajo localmente: al publicar un tweet, aparece de inmediato en tu propio timeline aunque la distribución a tus seguidores tarde unos segundos más.

### Punto a punto frente a pub/sub

Hay dos estilos de distribución:

**Punto a punto (cola)**: cada mensaje lo procesa **un solo** consumidor. Varios consumidores compiten por los mensajes (*competing consumers*), lo que permite escalar horizontalmente el procesamiento. Ejemplo: una cola de imágenes por redimensionar con 20 workers.

**Publish-subscribe (tópico)**: cada mensaje publicado en un tópico llega a **todos** los suscriptores, y cada uno hace algo distinto en paralelo. El publicador no sabe quién consume. Ejemplo: el evento `OrderPlaced` llega a facturación, inventario, email y analítica.

```
 Punto a punto                       Pub/sub
 [P] → [cola] → C1 o C2 o C3         [P] → [tópico] ─┬→ Facturación
                                                   ├→ Inventario
                                                   ├→ Email
                                                   └→ Analítica
```

Muchas plataformas combinan ambos: un tópico se distribuye a varias colas (una por suscriptor), y cada cola tiene sus consumidores que compiten. Así cada servicio recibe todos los eventos, y dentro de cada servicio el trabajo se reparte entre instancias.

### Brokers de mensajes frente a logs de eventos

Hay dos grandes familias de software (DDIA las compara a fondo; aquí, para elegir):

| Aspecto | Broker tradicional (RabbitMQ, SQS, ActiveMQ) | Log de eventos (Kafka, Kinesis, Pulsar) |
| --- | --- | --- |
| Modelo | El mensaje se borra al confirmarse | El mensaje se queda en un log por un tiempo de retención |
| Consumo | Reparto mensaje por mensaje | Cada grupo de consumidores lleva su propio offset |
| Releer | No (una vez consumido, desaparece) | Sí: puedes rebobinar el offset y reprocesar |
| Orden | Mejor esfuerzo, o FIFO con limitaciones | Garantizado dentro de cada partición |
| Paralelismo | Tantos consumidores como quieras | Hasta un consumidor por partición en cada grupo |
| Funciones | Ruteo flexible, prioridades, delays, DLQ nativas | Throughput enorme, retención, replay, stream processing |
| Bueno para | Colas de tareas, trabajos individuales | Eventos de dominio, pipelines de datos, CDC, auditoría |

Regla práctica: **trabajo por hacer** (tareas) → broker o cola gestionada; **hechos que ocurrieron** (eventos que varios sistemas consumen, quizá más tarde o de nuevo) → log de eventos.

### Garantías de entrega

Ningún sistema real ofrece "exactamente una vez" gratis. Las garantías posibles son:

- **At-most-once** (como mucho una vez): se confirma antes de procesar. Si el consumidor muere, el mensaje se pierde. Aceptable para métricas o logs de baja importancia.
- **At-least-once** (al menos una vez): se confirma después de procesar. Si el consumidor muere entre procesar y confirmar, el mensaje se reentrega y se procesa **dos veces**. Es el default en casi todos los sistemas.
- **Exactly-once** (efectivamente una vez): se logra combinando at-least-once con **procesamiento idempotente** o con transacciones que atan el procesamiento y el avance del offset. Algunas colas FIFO deduplican por un ID de mensaje dentro de una ventana de tiempo.

La conclusión práctica: **diseña consumidores idempotentes**. Un consumidor idempotente produce el mismo resultado aunque reciba el mismo mensaje varias veces:

```ts
async function handlePaymentCaptured(msg: { eventId: string; orderId: string }) {
  // tabla processed_events con eventId como clave primaria
  const inserted = await db.tryInsert("processed_events", { eventId: msg.eventId });
  if (!inserted) return;                       // ya procesado: ignorar duplicado
  await db.update("orders", msg.orderId, { status: "PAID" });
  // ideal: insertar y actualizar en la misma transacción
}
```

Otras técnicas: operaciones naturalmente idempotentes (`SET status = PAID` en vez de `balance = balance + 10`) y versiones condicionales (`UPDATE ... WHERE version = 7`).

### Orden

Muchas colas solo garantizan **mejor esfuerzo** en el orden. Cuando el orden importa (los eventos de un mismo pedido: creado → pagado → enviado), la técnica estándar es particionar por una clave: todos los mensajes con el mismo `orderId` van a la misma partición y se procesan en orden por un único consumidor. El orden **global** entre todas las claves casi nunca se necesita y es carísimo (un solo consumidor para todo).

Si el orden no está garantizado, el consumidor puede protegerse con números de versión: ignora un evento cuya versión sea menor que la que ya aplicó.

### Mensajes que fallan: reintentos y dead-letter queues

Un mensaje puede fallar por causas **transitorias** (la base estaba ocupada) o **permanentes** (el JSON está mal formado, el usuario ya no existe). Si un mensaje que siempre falla vuelve a la cola una y otra vez, bloquea a los demás y gasta recursos: es un **mensaje envenenado**.

La solución estándar:

1. Reintentar con **backoff exponencial y jitter**: 1 s, 2 s, 4 s, 8 s… con un componente aleatorio.
2. Tras N intentos, moverlo a una **dead-letter queue** (DLQ), donde no bloquea y queda para inspección.
3. Alertar cuando la DLQ crece y tener una herramienta para **reinyectar** mensajes una vez corregido el problema.

(Karan llama también *poison pill* a un mensaje especial que indica a un consumidor que termine su trabajo; no lo confundas con el mensaje envenenado que falla siempre.)

Otras funciones útiles de las colas: **entrega retrasada** (procesar este mensaje en 15 minutos, útil para recordatorios o reintentos), **prioridades** y **push vs pull** (la cola notifica al consumidor o el consumidor pregunta; pull con *long polling* es lo habitual y deja al consumidor controlar su ritmo).

### Back pressure

Una cola absorbe picos, pero si los productores son **sostenidamente** más rápidos que los consumidores, la cola crece sin límite: primero ocupa memoria, luego disco, la latencia de cada mensaje (tiempo en cola) se dispara y al final el broker se cae. Una cola infinita solo esconde el problema.

**Back pressure** es empujar la sobrecarga hacia atrás de forma controlada:

- Limitar el tamaño de la cola; cuando está llena, el productor recibe un error (por ejemplo, el servidor responde `503` con `Retry-After`) y el cliente reintenta con backoff exponencial.
- Bloquear al productor (en sistemas internos) hasta que haya espacio.
- Descartar o degradar trabajo de baja prioridad (*load shedding*).

Así, el sistema mantiene un rendimiento alto para lo que sí acepta, en lugar de un rendimiento pésimo para todo.

### Dimensionar consumidores con números

Un servicio de notificaciones recibe en promedio 2.000 mensajes/s, con picos de 10.000/s durante 10 minutos tras una campaña. Cada worker procesa 50 mensajes/s (cada envío tarda ~20 ms y el worker los hace de a uno; con concurrencia interna podría ser más).

- **Para el promedio**: 2.000 / 50 = 40 workers. Con margen del 30 %: ~52.
- **Si dimensionas para el pico**: 10.000 / 50 = 200 workers, ociosos casi todo el día.
- **Con la cola absorbiendo el pico** y 60 workers (3.000/s): durante el pico entran 10.000/s y salen 3.000/s, así que la cola crece 7.000/s × 600 s = 4,2 M de mensajes. Tras el pico entran 2.000/s y salen 3.000/s: la cola baja 1.000/s y se vacía en 4.200 s ≈ **70 minutos**.

Si el negocio acepta que una notificación de campaña llegue con hasta 70 minutos de retraso, 60 workers bastan. Si exige menos de 10 minutos, necesitas autoescalar los workers según la **profundidad de la cola** (la métrica correcta para escalar consumidores, mejor que la CPU) o dimensionar más alto. Este es el tipo de trade-off que la cola vuelve explícito: **latencia de procesamiento frente a costo**.

### Task queues y trabajos programados

Una **task queue** es una cola especializada en ejecutar tareas: recibe la tarea con sus datos, la ejecuta en un worker y puede devolver el resultado. Celery (Python), Sidekiq (Ruby) o BullMQ (Node.js) son ejemplos. Además de lo que hace una cola, suelen ofrecer:

- **Programación**: ejecutar algo a una hora o de forma periódica (cron distribuido), con la garantía de que solo un worker lo ejecute aunque haya muchos.
- **Resultados y estado**: consultar si una tarea terminó, con qué resultado o error.
- **Cadenas y grupos**: ejecutar tareas en secuencia o en paralelo y esperar a que todas terminen.
- **Límites de concurrencia por tipo de tarea**: no más de 5 exportaciones pesadas a la vez.

En un diseño, suelen aparecer como "workers" detrás de la API: el endpoint `POST /reports` encola la tarea y devuelve `202 Accepted` con un ID; el cliente consulta `GET /reports/{id}` o recibe una notificación cuando termina.

### Coreografía frente a orquestación

Cuando un proceso de negocio involucra varios servicios (un pedido: reservar stock, cobrar, programar envío), hay dos formas de coordinarlo con mensajes:

- **Coreografía**: cada servicio reacciona a eventos y publica los suyos. Inventario escucha `OrderPlaced` y publica `StockReserved`; pagos escucha `StockReserved` y publica `PaymentCaptured`; y así. No hay un coordinador: el acoplamiento es bajo, pero el flujo completo no está escrito en ningún lugar y es difícil saber en qué paso quedó un pedido.
- **Orquestación**: un orquestador (un servicio o un motor de workflows) envía comandos a cada servicio y espera sus respuestas: "reserva stock", "cobra", "programa envío". Si un paso falla, ejecuta las compensaciones (liberar el stock). El flujo es explícito y observable, a costa de un componente central que conoce a todos.

```
 Coreografía:  Pedidos ─evt→ Inventario ─evt→ Pagos ─evt→ Envíos
 Orquestación:          ┌──cmd→ Inventario
               [Orquestador]─cmd→ Pagos
                        └──cmd→ Envíos
```

Ambas son implementaciones de una **saga** (sesión 06). Regla práctica: coreografía para flujos cortos y estables; orquestación cuando el flujo tiene muchos pasos, compensaciones o requiere visibilidad del estado.

### Brokers y ESB

Un **message broker** valida, almacena, enruta y entrega mensajes, y puede traducir entre protocolos. Es la pieza ligera que conecta servicios en arquitecturas modernas.

Un **Enterprise Service Bus** (ESB) es su antecesor pesado: un bus central que además de mover mensajes contiene transformaciones, orquestación y reglas de negocio. Ventajas: integración de sistemas heterogéneos (muchos legados) con un punto de control. Desventajas: es un punto central de fallo y de cambio, difícil de probar y depurar, caro de mantener, y termina concentrando lógica que debería estar en los servicios. La tendencia actual es **"smart endpoints, dumb pipes"**: tuberías simples (broker o log) y la lógica en los servicios.

### Consistencia entre la base de datos y la cola: el patrón outbox

Un problema muy frecuente: el servicio guarda un pedido en su base **y** publica `OrderPlaced` en la cola. Si guarda y luego falla al publicar, el evento se pierde; si publica y luego falla al guardar, se anuncia algo que no existe. No hay una transacción que abarque base y cola.

El **patrón outbox** lo resuelve:

```
 Transacción local:
   INSERT INTO orders (...)
   INSERT INTO outbox (event_id, type, payload)   ← misma transacción, mismo commit
 Proceso relay (o CDC del log de la base):
   lee outbox → publica en la cola → marca como enviado
```

El relay puede publicar dos veces si falla tras publicar y antes de marcar, así que los consumidores siguen siendo idempotentes. Pero nunca se pierde un evento ni se publica uno inexistente.

### Cómo representar la asincronía en un diagrama

En tus design docs, cada cola debe aparecer con cuatro datos: **qué mensajes lleva** (y su tamaño aproximado), **quién produce y quién consume**, **la garantía de entrega y de orden** (por ejemplo, "at-least-once, orden por `orderId`") y **qué pasa si se acumula** (cuánta demora se tolera y cómo escalan los consumidores). Un ejemplo de anotación:

```
 [API pedidos] ──OrderPlaced (≈1 KB, 300/s pico)──> [tópico orders, 12 particiones, clave orderId]
        retención 7 días, at-least-once
           ├──> [grupo facturación x6]   SLO: < 1 min de demora
           ├──> [grupo email x3]         tolera 30 min; DLQ tras 5 intentos
           └──> [grupo analítica x2]     tolera horas; reprocesable desde el log
```

Escribirlo así fuerza a pensar en el número de particiones (que limita el paralelismo de cada grupo), en la retención (cuánto tiempo puede estar caído un consumidor sin perder eventos) y en el SLO de cada consumidor.

### Modos de fallo de la asincronía

- **Cola que crece sin que nadie lo note**: monitorea profundidad y "edad del mensaje más viejo"; alerta por tendencia.
- **Duplicados**: consumidores no idempotentes que cobran o envían dos veces.
- **Reordenamiento**: eventos aplicados fuera de orden que dejan un estado incorrecto.
- **Mensajes envenenados** sin DLQ que bloquean la cola.
- **Tormenta de reintentos** tras una caída: todos los consumidores reintentan a la vez contra una dependencia que apenas se recupera; usa backoff con jitter y límites de concurrencia.
- **Depuración difícil**: el flujo se reparte en el tiempo y entre servicios; propaga un ID de correlación en cada mensaje y usa tracing distribuido.
- **Cambios de formato incompatibles**: un productor cambia el esquema del mensaje y los consumidores viejos fallan; versiona los esquemas (por ejemplo, con un registro de esquemas) y agrega campos de forma compatible.
- **Retención insuficiente**: un consumidor cae un fin de semana y la retención era de 24 horas; esos eventos se perdieron para él.

## Conceptos clave

- **Cola punto a punto**: cada mensaje lo procesa un solo consumidor; los consumidores compiten.
- **Pub/sub**: cada mensaje publicado en un tópico llega a todos los suscriptores.
- **Log de eventos**: mensajes retenidos con offsets por grupo de consumidores; permite releer.
- **Ack y visibility timeout**: confirmación de procesamiento y tiempo tras el cual un mensaje no confirmado vuelve a estar disponible.
- **At-least-once**: garantía por defecto; implica posibles duplicados.
- **Consumidor idempotente**: procesar el mismo mensaje varias veces deja el mismo resultado.
- **Dead-letter queue**: cola donde van los mensajes que fallan repetidamente.
- **Back pressure**: rechazar o frenar a los productores cuando los consumidores no dan abasto.
- **Load leveling**: usar la cola para absorber picos y procesar a ritmo constante.
- **Patrón outbox**: guardar el evento en la misma transacción que el cambio y publicarlo después.

## Preguntas de repaso

1. ¿Cuándo no conviene introducir una cola?
   R: Cuando el trabajo es barato y rápido, o cuando el usuario necesita el resultado de inmediato para continuar (tiempo real). En esos casos la cola solo agrega latencia, componentes que operar, complejidad de depuración y consistencia eventual sin beneficio.
2. ¿Por qué at-least-once implica diseñar consumidores idempotentes? Da una técnica.
   R: Porque si el consumidor procesa el mensaje y muere antes de confirmarlo, la cola lo reentrega y se procesa de nuevo. Para que eso no duplique efectos, el consumidor debe ser idempotente; por ejemplo, registrando el ID del evento en una tabla con clave única dentro de la misma transacción que el efecto, e ignorando los IDs ya vistos.
3. ¿Cómo garantizas el orden de los eventos de un mismo pedido sin perder paralelismo?
   R: Particionando por la clave del pedido: todos sus eventos van a la misma partición, que procesa un único consumidor en orden, mientras que pedidos distintos se procesan en paralelo en otras particiones. Así se evita el costo del orden global.
4. Una cola recibe 5.000 msg/s durante 20 minutos y luego 1.000 msg/s; tienes 40 workers de 50 msg/s. ¿Cuánto crece la cola y cuánto tarda en vaciarse?
   R: Los workers procesan 2.000 msg/s. Durante el pico la cola crece 3.000 msg/s × 1.200 s = 3,6 M de mensajes. Después entran 1.000/s y salen 2.000/s, así que baja 1.000/s y tarda 3.600 s, una hora, en vaciarse.
5. ¿Qué problema resuelve el patrón outbox?
   R: La imposibilidad de guardar un cambio en la base y publicar un evento en la cola de forma atómica. Guardando el evento en una tabla outbox dentro de la misma transacción y publicándolo después con un relay o CDC, nunca se pierde un evento ni se publica uno de un cambio que no se confirmó; los duplicados posibles se manejan con consumidores idempotentes.

## Ejercicio

Implementa en TypeScript una cola en memoria con: `publish`, consumidores concurrentes con `ack`/`nack`, visibility timeout, reintentos con backoff exponencial y jitter, DLQ tras 5 intentos y un límite de tamaño que rechace publicaciones cuando está llena (back pressure). Escribe un consumidor idempotente y una prueba que simule la caída de un consumidor tras procesar y antes de confirmar, verificando que el efecto se aplica una sola vez. Terminado cuando las pruebas de reintento, DLQ, back pressure e idempotencia pasen.

## Explícalo con tus palabras

Explica para qué sirve una cola de mensajes usando la imagen de la ventanilla de pedidos de un restaurante donde los meseros dejan comandas y los cocineros las toman a su ritmo.
