---
title: Workflow entre servicios: transacciones distribuidas y sagas
kind: lesson
hours: 2
sources: Building Microservices 2nd ed., cap. 6 "Workflow" (pp. 223–249) | Hands-On Microservices with Kubernetes, cap. 2 "Using sagas to manage transactions across multiple services" (pp. 66–69)
links: microservices.io — Saga pattern | https://microservices.io/patterns/data/saga.html ; microservices.io — Transactional outbox | https://microservices.io/patterns/data/transactional-outbox.html
---

## Objetivo

Entender por qué las transacciones ACID no cruzan fronteras de servicio, por qué el two-phase commit suele ser mala idea, y diseñar sagas con transacciones compensatorias, eligiendo entre orquestación y coreografía.

## Estudio

### 1. El punto de partida: transacciones ACID

En una sola base de datos, una transacción agrupa varios cambios para que se comporten como uno. Recuerda ACID:

- **Atomicity**: o se aplican todos los cambios o ninguno.
- **Consistency**: la base pasa de un estado válido a otro válido (restricciones, foreign keys).
- **Isolation**: transacciones concurrentes no ven estados intermedios de las otras.
- **Durability**: una vez confirmada (commit), la transacción sobrevive a caídas.

En un monolito, "registrar un cliente nuevo" puede ser: insertar en `customers`, insertar en `loyalty_accounts`, borrar de `pending_enrollments`. Una transacción y listo: si algo falla, rollback y nada pasó.

Ahora parte el sistema: `Customers` es dueño de los clientes, `Loyalty` de las cuentas de puntos, `Enrollments` de las inscripciones pendientes. Cada servicio puede seguir usando transacciones ACID **dentro** de su base. Pero el cambio global ya no es atómico: puede crearse el cliente y fallar la cuenta de puntos. Seguimos teniendo ACID, pero **sin atomicidad entre servicios**.

```
 Monolito                         Microservicios
 ┌──────────────────────┐         ┌───────────┐  ┌──────────┐  ┌─────────────┐
 │ BEGIN                │         │ Customers │  │ Loyalty  │  │ Enrollments │
 │  INSERT customers    │         │ BEGIN..   │  │ BEGIN..  │  │ BEGIN..     │
 │  INSERT loyalty      │         │ COMMIT ✔  │  │ COMMIT ✘ │  │ ¿?          │
 │  DELETE pending      │         └───────────┘  └──────────┘  └─────────────┘
 │ COMMIT  (todo o nada)│          tres transacciones independientes:
 └──────────────────────┘          no hay "todo o nada" global
```

### 2. Transacciones distribuidas: two-phase commit (2PC)

La respuesta clásica es el **two-phase commit**. Un **coordinador** gestiona la operación en dos fases:

1. **Fase de votación (prepare)**: el coordinador pregunta a cada participante "¿puedes aplicar tu cambio?". Cada uno verifica, **bloquea** los recursos necesarios y responde sí o no.
2. **Fase de commit**: si todos dijeron sí, el coordinador ordena a todos confirmar. Si alguno dijo no, ordena a todos abortar y liberar.

```
          Coordinador
     ┌─────────┼─────────┐
  prepare  prepare   prepare        Fase 1: todos bloquean recursos
     ▼         ▼         ▼
  [ A: sí ] [ B: sí ] [ C: sí ]
     ▲         ▲         ▲
  commit    commit    commit        Fase 2: todos confirman
```

Problemas en la práctica:

- **Bloqueos durante la espera.** Entre la fase 1 y la 2, cada participante tiene recursos bloqueados. Si la red es lenta o el coordinador tarda, todo el sistema espera. Cuanto más dura el bloqueo, más contención.
- **Fallos a mitad de camino.** Si el coordinador muere después de que todos votaron sí pero antes de enviar el commit, los participantes quedan bloqueados sin saber qué hacer. Si un participante muere después de votar sí y no recibe el commit, al volver no sabe si confirmar.
- **No es realmente atómico en el tiempo.** Los commits de la fase 2 llegan en momentos distintos a cada participante; durante unos instantes, un observador externo puede ver a A confirmado y a B todavía no.
- **Acoplamiento.** Todos los servicios deben soportar el protocolo y participar en el mismo coordinador; su disponibilidad depende de la de todos.

Hay sistemas que usan transacciones distribuidas con éxito, como algunas bases de datos distribuidas globales, pero ahí el algoritmo está **dentro** de una base de datos lógica, con una infraestructura extraordinaria (relojes atómicos en centros de datos). Eso no es lo mismo que coordinar varios microservicios independientes.

La recomendación: **evita las transacciones distribuidas entre microservicios**. Si un conjunto de datos necesita de verdad atomicidad estricta, quizá debería vivir en un solo servicio (y una sola base). Y si no la necesita, usa sagas.

### 3. Sagas

Una **saga** divide un proceso de negocio largo en una **secuencia de pasos**, cada uno con su propia transacción local. No mantiene bloqueos entre pasos. La idea nació en los años 80 para las *long-lived transactions* (procesos que duran minutos, horas o días) dentro de una sola base; funciona igual de bien para coordinar varios servicios.

Ejemplo: procesar un pedido.

```
 1. Pedidos:      crear pedido (estado PENDIENTE)
 2. Inventario:   reservar stock
 3. Pagos:        cobrar
 4. Fidelización: sumar puntos
 5. Almacén:      empaquetar y enviar
 6. Pedidos:      marcar COMPLETADO
```

Cada paso es atómico **dentro** de su servicio. La saga, en conjunto, **no** es atómica. Lo que te da es un modelo explícito del proceso y suficiente información para saber en qué estado está y cómo recuperarse.

Un beneficio colateral: modelar la saga te obliga a **hacer explícito el proceso de negocio**, que en un monolito suele estar escondido en un método de 300 líneas.

### 4. Modos de fallo: hacia atrás o hacia adelante

Cuando un paso falla, tienes dos estrategias:

- **Backward recovery (rollback)**: deshacer los pasos ya completados mediante **transacciones compensatorias**.
- **Forward recovery**: reintentar o continuar desde el paso que falló. Requiere guardar suficiente información para retomarlo.

Puedes mezclar ambas: algunos fallos se compensan y otros se reintentan.

Un punto fundamental: **una saga maneja fallos de negocio, no fallos técnicos**. "El cliente no tiene fondos" o "el producto no está en el estante" son fallos de negocio que la saga debe contemplar. "El servicio de pagos devolvió 500" o "timeout" son fallos técnicos que se manejan con reintentos, idempotencia y resiliencia (sesión 16). La saga asume que sus componentes, con esas protecciones, son fiables.

### 5. Transacciones compensatorias

Supón que llegas al paso 5 y el almacén descubre que el producto no está en el estante. Decides cancelar el pedido. Pero ya cobraste y ya sumaste puntos. No hay rollback mágico: cada uno de esos pasos ya se confirmó en su base.

Necesitas una **transacción compensatoria** por cada paso que quieras revertir:

| Paso | Acción | Compensación |
| --- | --- | --- |
| 2 | Reservar stock | Liberar la reserva |
| 3 | Cobrar | Reembolsar |
| 4 | Sumar puntos | Restar los puntos |
| 5 | Enviar email "en camino" | Enviar email "pedido cancelado" |

Las compensaciones son **rollbacks semánticos**, no técnicos. Un rollback de base de datos ocurre antes del commit y deja todo como si nada hubiera pasado. Una compensación ocurre **después**: el cobro existió y quedará en el historial; lo que haces es un reembolso que lo neutraliza para el negocio. Y algunas cosas no se pueden deshacer: un email enviado no se "desenvía"; la compensación es enviar otro email explicando.

**Reordenar pasos para reducir compensaciones.** Pon primero los pasos que más probablemente fallen y después los que son caros o imposibles de compensar. En el ejemplo, si sumar puntos es fácil de revertir pero cobrar exige un reembolso con comisión bancaria, y empaquetar es donde más se falla, quizá conviene verificar el stock físico antes de cobrar. También puedes mover pasos "irreversibles" (enviar emails) al final, cuando ya es casi seguro que el proceso termina bien.

**Las compensaciones también pueden fallar.** Si el reembolso falla, ¿qué haces? Normalmente reintentas (forward recovery sobre la compensación) y, si aún falla, escalas a un humano. Diseña siempre ese camino; los procesos de negocio reales suelen incluir colas de "revisión manual".

### 6. Implementar sagas: orquestación

En una **saga orquestada**, un componente central (el orquestador) conoce el proceso completo y le dice a cada servicio qué hacer y cuándo. Normalmente el orquestador es parte del servicio que inicia el proceso (por ejemplo, `Pedidos`).

```
                     ┌──────────────────────────┐
                     │  Orquestador (Pedidos)   │
                     │  estado: PAGO_PENDIENTE  │
                     └──┬────────┬────────┬─────┘
           reservar     │ cobrar │ sumar  │ enviar
                        ▼        ▼        ▼
                 Inventario    Pagos   Fidelización  Almacén
```

```ts
type Step = { name: string; run: () => Promise<void>; compensate: () => Promise<void> };

async function runSaga(steps: Step[]): Promise<"completed" | "compensated"> {
  const done: Step[] = [];
  for (const step of steps) {
    try {
      await step.run();
      done.push(step);
      await sagaLog.record(step.name, "done"); // estado persistido para retomar
    } catch (err) {
      await sagaLog.record(step.name, "failed");
      for (const s of done.reverse()) {
        await s.compensate(); // reintentar con backoff; escalar si falla
        await sagaLog.record(s.name, "compensated");
      }
      return "compensated";
    }
  }
  return "completed";
}
```

**Ventajas:**

- El proceso de negocio está **en un solo lugar**: fácil de leer, de razonar y de explicar.
- Sabes en qué estado está cada saga mirando al orquestador.
- Es más fácil añadir monitoreo y reglas de reintento.

**Desventajas:**

- **Más domain coupling**: el orquestador conoce a todos los servicios y sus capacidades.
- **Riesgo de centralizar lógica**: el orquestador puede volverse un "god service" con toda la lógica, dejando a los demás como servicios anémicos que solo guardan datos. Mitiga esto haciendo que el orquestador **coordine** y que cada servicio mantenga su propia lógica.

Existen herramientas de workflow (motores BPM, Temporal, Camunda, AWS Step Functions) que implementan orquestadores persistentes. Úsalas si el proceso es complejo, pero cuidado con los editores visuales que generan flujos que solo un equipo central sabe modificar.

### 7. Implementar sagas: coreografía

En una **saga coreografiada**, no hay director. Cada servicio reacciona a eventos y publica los suyos. La responsabilidad se reparte.

```
 Pedidos ──OrderPlaced──► [broker] ──► Inventario (reserva) ──StockReserved──►
          ──► Pagos (cobra) ──PaymentTaken──► Fidelización (suma) ──►
          ──► Almacén (envía) ──OrderShipped──► Pedidos (marca completado)

 Si Pagos falla:  ──PaymentFailed──► Inventario libera la reserva
                                  ──► Pedidos marca CANCELADO
```

**Ventajas:**

- **Menos acoplamiento**: cada servicio solo conoce eventos, no a otros servicios.
- Añadir un paso (por ejemplo, `Antifraude` escucha `OrderPlaced`) no exige cambiar a nadie más.
- La lógica queda distribuida entre servicios autónomos.

**Desventajas:**

- **Nadie tiene la foto completa.** El proceso está repartido en varios códigos. ¿En qué estado está el pedido o-77? Hay que reconstruirlo a partir de eventos.
- Más difícil de depurar y de cambiar el orden de los pasos.
- Riesgo de ciclos de eventos y de comportamientos emergentes difíciles de prever.

Para mitigar la falta de visibilidad: incluye un **correlation ID** (el ID del pedido o de la saga) en todos los eventos y construye un servicio o una vista que escuche todos los eventos y muestre el estado de cada saga.

### 8. ¿Orquestación o coreografía?

| Criterio | Orquestación | Coreografía |
| --- | --- | --- |
| Visibilidad del proceso | Alta, en un lugar | Baja, repartida |
| Acoplamiento | Más domain coupling | Menor, solo eventos |
| Añadir pasos | Cambiar el orquestador | Añadir un suscriptor |
| Depuración | Más simple | Requiere tracing y correlation IDs |
| Encaje organizacional | Un equipo dueño del proceso completo | Varios equipos autónomos |

Una heurística útil: si **un mismo equipo** es dueño de todo el proceso, la orquestación es cómoda y clara. Si el proceso cruza **varios equipos**, la coreografía preserva su autonomía. También puedes mezclar: un orquestador para el núcleo del proceso y eventos para las reacciones secundarias (notificaciones, analytics).

### 9. Publicar eventos de forma fiable: el problema de la doble escritura

Tanto en orquestación como en coreografía aparece un problema técnico: el servicio debe **guardar en su base** y **publicar un mensaje**. Si hace las dos cosas por separado, puede fallar entre ambas:

```
 1. COMMIT en la base (pedido creado)   ✔
 2. publish(OrderPlaced)                ✘  ← el proceso muere aquí
 → el pedido existe, pero nadie se enteró
```

Patrón habitual: **transactional outbox**. En la misma transacción local, guardas el cambio y una fila en una tabla `outbox` con el evento. Un proceso aparte lee la `outbox` y publica en el broker, marcando lo publicado. Como el evento y el cambio se guardan atómicamente, nunca se pierde; como mucho se publica dos veces, y los consumidores idempotentes lo toleran.

```sql
BEGIN;
  INSERT INTO orders (id, status) VALUES ('o-77', 'PENDING');
  INSERT INTO outbox (id, type, payload) VALUES ('e-1', 'OrderPlaced', '{"orderId":"o-77"}');
COMMIT;
-- un "relay" lee outbox y publica en el broker
```

### 10. Sagas frente a transacciones distribuidas

Las sagas no te dan aislamiento: otros procesos pueden ver estados intermedios (el pedido está "pagado" pero aún sin stock confirmado). Diseña tu dominio para que esos estados intermedios sean **explícitos y válidos** ("PAGO_PENDIENTE", "EN_PREPARACIÓN") en vez de esconderlos.

Ventajas de las sagas: no bloquean recursos entre pasos, toleran procesos largos, hacen explícito el proceso de negocio. Su costo: más diseño, compensaciones que pensar y consistencia eventual.

Y un recordatorio del libro de Sayfan: en el mundo distribuido aparece el **teorema CAP** (lo verás de nuevo en la sesión 16): ante una partición de red, tienes que elegir entre consistencia y disponibilidad. Las sagas son, en buena medida, una elección consciente de disponibilidad con consistencia eventual.

### 10.1 Ejemplo trabajado: diseñar la saga de una suscripción

Una plataforma de cursos vende suscripciones anuales. El proceso: crear la suscripción, cobrar, habilitar el acceso a los cursos, generar la factura y enviar el email de bienvenida. Participan `Subscriptions`, `Payments`, `Access`, `Invoicing` y `Notifications`, cada uno de un equipo distinto excepto `Subscriptions` y `Access`, que son del mismo.

**Paso 1: estados explícitos.** En vez de un booleano `active`, la suscripción tiene una máquina de estados que hace visibles los estados intermedios:

```
 CREATED ──cobro ok──► PAID ──acceso ok──► ACTIVE ──factura ok──► ACTIVE (facturada)
    │                    │
    │ cobro rechazado    │ acceso falló (negocio: curso retirado)
    ▼                    ▼
 PAYMENT_FAILED       REFUND_PENDING ──reembolso ok──► CANCELLED
```

**Paso 2: clasificar fallos.** "Tarjeta rechazada" es fallo de negocio: la saga termina en `PAYMENT_FAILED` y se avisa al usuario. "Timeout llamando a `Payments`" es fallo técnico: se reintenta con la misma clave de idempotencia; no es un motivo para compensar.

**Paso 3: orden de pasos.** Generar la factura es legalmente difícil de anular (requiere una nota de crédito), así que va **después** de habilitar el acceso, que es el paso que más falla. El email de bienvenida va al final de todo.

**Paso 4: compensaciones.**

| Paso | Compensación | Si la compensación falla |
| --- | --- | --- |
| Cobrar | Reembolsar | Reintentar 5 veces con backoff; luego cola de revisión manual de finanzas |
| Habilitar acceso | Revocar acceso | Reintentar; el acceso caduca solo en 24 h como red de seguridad |
| Facturar | Emitir nota de crédito | Revisión manual (requisito contable) |

**Paso 5: orquestación o coreografía.** El núcleo (crear, cobrar, habilitar acceso) lo decide un orquestador dentro de `Subscriptions`, porque ese equipo es dueño del proceso y necesita ver el estado de cada suscripción. Las reacciones secundarias (factura, email, analytics) se cuelgan de un evento `SubscriptionActivated` por coreografía, porque pertenecen a otros equipos y ninguna debe bloquear la activación.

Este diseño mixto es muy común: orquestación donde necesitas control y visibilidad, coreografía donde quieres autonomía y extensibilidad.

### 11. Historia de fallo

Un sistema de reservas de viajes usa coreografía: `Vuelos`, `Hoteles` y `Coches` reaccionan a `TripBooked`. Cuando `Hoteles` falla, publica `HotelFailed`, y se supone que `Vuelos` y `Coches` cancelan. Pero `Coches` se añadió seis meses después por otro equipo, que no se suscribió a `HotelFailed`. Durante semanas, clientes con el hotel fallido recibieron cargos por coches que nunca pidieron. Nadie lo detectó porque no había ninguna vista del estado global del viaje. Solución: un pequeño servicio `TripStatus` que escucha todos los eventos y alerta de viajes en estados inconsistentes durante más de 10 minutos, más una checklist obligatoria para nuevos participantes en la saga.

### 12. Errores comunes

- Intentar coordinar microservicios con two-phase commit.
- Creer que una saga es atómica o aislada.
- No diseñar compensaciones, o diseñarlas sin pensar que también pueden fallar.
- Usar la saga para manejar errores técnicos (timeouts) en vez de reintentos e idempotencia.
- Orquestadores que concentran toda la lógica de negocio.
- Coreografía sin correlation ID ni vista del estado global.
- Guardar en la base y publicar un evento sin outbox ni idempotencia.

## Conceptos clave

- **ACID**: atomicidad, consistencia, aislamiento y durabilidad de una transacción local.
- **Two-phase commit**: protocolo de transacción distribuida con fase de votación y fase de commit, que bloquea recursos.
- **Saga**: secuencia de transacciones locales que implementa un proceso de negocio sin bloqueos globales.
- **Transacción compensatoria**: acción que neutraliza semánticamente un paso ya confirmado.
- **Backward / forward recovery**: deshacer con compensaciones / reintentar y continuar.
- **Orquestación**: un coordinador central dirige los pasos de la saga.
- **Coreografía**: cada servicio reacciona a eventos y publica los suyos, sin coordinador.
- **Transactional outbox**: guardar el evento en la misma transacción que el cambio y publicarlo después.

## Preguntas de repaso

1. ¿Por qué el two-phase commit es problemático entre microservicios?
   R: Porque bloquea recursos entre la fase de votación y la de commit, generando contención; porque deja participantes en estado incierto si el coordinador o un participante falla a mitad; porque los commits no son simultáneos; y porque acopla la disponibilidad de todos los servicios al coordinador.
2. ¿Qué garantiza una saga y qué no?
   R: Garantiza que cada paso es atómico dentro de su servicio y que el proceso tiene un estado explícito para recuperarse hacia adelante o hacia atrás. No garantiza atomicidad ni aislamiento global: otros pueden ver estados intermedios y algunos efectos ya ocurrieron.
3. ¿Por qué se dice que una compensación es un rollback semántico? Da un ejemplo de algo que no se puede deshacer.
   R: Porque no borra el hecho original: crea una nueva acción que lo neutraliza para el negocio, por ejemplo un reembolso en vez de "des-cobrar". Un email enviado no se puede deshacer; la compensación es enviar otro explicando la cancelación.
4. ¿Cómo puedes reducir la cantidad de compensaciones de una saga?
   R: Reordenando los pasos: primero los que más probablemente fallan y al final los caros o imposibles de compensar, como enviar notificaciones o cobrar con comisión.
5. Compara orquestación y coreografía en visibilidad y acoplamiento.
   R: La orquestación concentra el proceso en un lugar, lo que da buena visibilidad pero aumenta el domain coupling del orquestador con todos los servicios. La coreografía reduce el acoplamiento porque solo hay eventos, pero el proceso queda repartido y hace falta tracing, correlation IDs y vistas del estado para entenderlo.
6. ¿Qué problema resuelve el patrón transactional outbox?
   R: El de la doble escritura: si un servicio guarda en su base y luego publica un evento por separado, puede morir entre ambas y perder el evento. Con outbox, el evento se guarda en la misma transacción local y un proceso aparte lo publica, de modo que como mucho se duplica y nunca se pierde.

## Ejercicio

Implementa en TypeScript una saga orquestada en memoria para un pedido con cuatro pasos (`reserveStock`, `chargePayment`, `addLoyaltyPoints`, `shipOrder`), cada uno con su compensación. Simula fallos con una variable (`FAIL_AT=chargePayment|shipOrder`). Guarda un log de la saga (paso, estado) en un array que represente la persistencia. Escribe tests con vitest. Criterio de terminado: (1) sin fallos, el log muestra los cuatro pasos `done`; (2) con `FAIL_AT=shipOrder`, se ejecutan las compensaciones de los tres pasos previos en orden inverso; (3) con una compensación que falla dos veces y luego funciona, el orquestador reintenta y termina en `compensated`; (4) un comentario explica qué paso reordenarías y por qué.

## Explícalo con tus palabras

Explica con el ejemplo de organizar un viaje (vuelo, hotel, coche) por qué no puedes "deshacer" todo con un botón cuando falla el hotel y qué harías en su lugar.
