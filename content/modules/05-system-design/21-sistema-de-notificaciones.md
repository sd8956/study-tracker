---
title: Caso de estudio — un sistema de notificaciones
kind: lesson
hours: 2
sources: System Design Interview (Alex Xu), cap. 10 "Design a notification system" (pp. 151–165) | karanpratapsingh/system-design, cap. III "Message Queues" y "Publish-Subscribe"; cap. IV "Rate Limiting" | System Design Primer, "Asynchronism"
links: Karan — Message Queues | https://github.com/karanpratapsingh/system-design#message-queues ; Karan — Publish-Subscribe | https://github.com/karanpratapsingh/system-design#publish-subscribe ; Karan — Rate Limiting | https://github.com/karanpratapsingh/system-design#rate-limiting ; Primer — Asynchronism | https://github.com/donnemartin/system-design-primer#asynchronism
---

## Objetivo

Diseñar un sistema que envíe millones de notificaciones por día a través de push móvil (iOS y Android), SMS y email: integración con proveedores externos, desacople con colas por canal, confiabilidad (no perder, deduplicar, reintentar), plantillas, preferencias de usuario, límites de frecuencia, seguimiento y operación.

## Estudio

### El problema

Las notificaciones (que no son lo mismo que las alertas de monitoreo para ingenieros de la sesión 12) son la forma en que un producto avisa a sus usuarios: el pedido salió, alguien comentó tu foto, tu factura vence mañana, hay una oferta. Casi todos los productos grandes tienen un **servicio central de notificaciones** que los demás servicios usan, en lugar de que cada equipo integre por su cuenta proveedores de email y SMS.

Lo interesante del problema no es enviar un mensaje (eso lo hace un proveedor externo), sino hacerlo **a escala, sin perder notificaciones, sin duplicarlas en exceso, respetando las preferencias de cada persona y sin depender de que todos los proveedores funcionen siempre**.

### Requisitos

Diálogo de alcance del libro:

```
 ¿Tipos?                        → Push, SMS y email.
 ¿Tiempo real?                  → "Suave": lo antes posible, pero se tolera algo de demora bajo carga.
 ¿Dispositivos?                 → iOS, Android, laptops/escritorio.
 ¿Qué dispara notificaciones?   → Aplicaciones cliente o tareas programadas del servidor.
 ¿Opt-out?                      → Sí; quien se da de baja no recibe más.
 ¿Volumen diario?               → 10 M push, 1 M SMS, 5 M emails.
```

Requisitos no funcionales que agregamos: **no perder notificaciones** (pueden retrasarse o llegar desordenadas, pero no perderse), alta disponibilidad, escalabilidad horizontal y observabilidad.

### Estimaciones

```
 push   10 M/día → ≈ 115/s promedio (picos de campañas: 10–50× durante minutos)
 SMS     1 M/día → ≈ 12/s
 email   5 M/día → ≈ 58/s
 total  16 M/día → ≈ 185/s promedio
```

Los promedios son modestos; el reto es el **pico**: una campaña de marketing que se dispara para 10 M de usuarios a las 9:00 genera 10 M de push en pocos minutos. Si quieres entregarlas en 10 minutos, son ~17.000/s. Esto, y no el promedio, dimensiona colas, workers y los límites de los proveedores. También costo: el SMS es caro (del orden de centavos por mensaje), así que 1 M de SMS diarios es un costo significativo que justifica preferir push o email cuando sea posible.

### Los canales y sus proveedores

**Push en iOS**: tres actores. El **provider** (tu servidor) construye la notificación con el **device token** (identificador único del dispositivo para push, que la app obtiene al registrarse) y un **payload** JSON (título, cuerpo, badge, datos). La envía a **APNs** (Apple Push Notification service), que la entrega al dispositivo.

```
 [Tu provider] ──token + payload──> [APNs] ──> [iPhone]
```

**Push en Android**: el mismo esquema con **FCM** (Firebase Cloud Messaging) en lugar de APNs. (En mercados donde FCM no está disponible, se usan otros servicios equivalentes; por eso conviene que el diseño permita agregar proveedores.)

**SMS**: proveedores comerciales como Twilio o Nexmo (Vonage), que se integran por API HTTP.

**Email**: se puede montar un servidor de correo propio, pero la entregabilidad (no caer en spam) es difícil; lo habitual es usar servicios como SendGrid o Mailchimp, que además ofrecen analítica.

### Elegir el canal

No todos los canales sirven para lo mismo, y elegir bien reduce costo y molestias:

| Canal | Costo | Latencia | Alcance | Bueno para |
| --- | --- | --- | --- | --- |
| Push | Casi nulo | Segundos | Solo con la app instalada y permisos | Avisos en tiempo real, interacción |
| SMS | Alto (centavos por mensaje) | Segundos | Casi universal | Códigos de verificación, alertas críticas |
| Email | Muy bajo | Segundos a minutos | Universal | Recibos, resúmenes, contenido largo, marketing |
| In-app | Nulo | Inmediato si está abierta | Solo usuarios activos | Novedades dentro del producto |

Una estrategia común es la **cascada**: intentar push y, si el usuario no lo abre en cierto tiempo (o no tiene la app), enviar email; reservar el SMS para lo crítico. El servicio central de notificaciones es el lugar natural para implementar estas reglas una sola vez, en lugar de que cada equipo decida por su cuenta.

### Recolectar los datos de contacto

Para enviar necesitas tokens, teléfonos y emails. Al instalar la app o registrarse, los servidores de API los guardan:

```
 users(user_id, email, country_code, phone_number, created_at)
 devices(id, user_id, device_token, platform, last_logged_in_at)
```

Un usuario puede tener **varios dispositivos**, y se debe enviar a todos (o al más reciente, según el tipo de notificación). Los tokens caducan o cambian: hay que actualizarlos cuando la app los renueva y borrar los que el proveedor reporta como inválidos.

### Diseño inicial y sus problemas

```
 [Servicio 1..N] ──> [Servidor de notificaciones] ──> APNs / FCM / SMS / Email ──> dispositivos
                            │
                        [BD/Cache]
```

Los servicios (facturación, envíos, marketing) llaman a un servidor de notificaciones que arma el mensaje y llama al proveedor. Problemas:

1. **Punto único de fallo**: un solo servidor.
2. **Difícil de escalar**: base, cache y procesamiento en un mismo componente; no se pueden escalar por separado.
3. **Cuello de botella de rendimiento**: armar y enviar notificaciones consume recursos (construir HTML de emails, esperar respuestas de terceros que pueden tardar). Si un proveedor está lento, todo se frena.

### Diseño mejorado

```
 [Servicios] ──> [LB] ──> [Servidores de notificaciones x N] ──> [Cache / BD: usuarios, dispositivos, plantillas, preferencias]
                                     │ (validan, arman, encolan)
          ┌──────────────┬───────────┴───┬──────────────┐
     [cola iOS]     [cola Android]   [cola SMS]     [cola Email]
          │              │               │              │
     [workers]      [workers]       [workers]      [workers]
          │              │               │              │
        APNs            FCM           Twilio        SendGrid ──> dispositivos
          │
     [Notification log BD] ← registro de cada envío y su estado
```

Cambios clave:

- **Base de datos y cache fuera** del servidor de notificaciones.
- **Varios servidores** de notificaciones detrás de un balanceador, con escalado horizontal automático.
- **Colas de mensajes por canal**: desacoplan la recepción del envío y **aíslan fallos**. Si el proveedor de SMS cae, solo se acumula la cola de SMS; push y email siguen funcionando (un bulkhead, sesión 12).
- **Workers por canal** que consumen su cola y llaman al proveedor.

Responsabilidades del servidor de notificaciones: exponer la API a los servicios internos (`POST /v1/notifications` con destinatario, tipo, plantilla y parámetros), **autenticar** a los servicios que llaman (no cualquiera puede enviar notificaciones), validaciones básicas (emails y teléfonos válidos), consultar la base o cache para obtener tokens, preferencias y plantillas, y encolar los eventos.

Flujo completo:

1. Un servicio llama a la API.
2. El servidor obtiene usuario, dispositivos y plantilla (de la cache, o de la base si falla).
3. Arma el evento y lo pone en la cola del canal correspondiente.
4. Los workers lo toman.
5. Los workers llaman al proveedor.
6. El proveedor entrega al dispositivo.

### Confiabilidad: no perder, no duplicar (demasiado)

**No perder**: las notificaciones pueden retrasarse o reordenarse, pero no perderse. El sistema **persiste** cada notificación en una base de registro (notification log) con su estado (`pending`, `sent`, `failed`) y reintenta las fallidas. Si un worker muere después de tomar un mensaje, la cola lo reentrega (at-least-once, sesión 09).

**¿Exactamente una vez?** No. La naturaleza distribuida hace posible que se envíe dos veces (por ejemplo, el proveedor aceptó pero la confirmación se perdió y el worker reintentó). Se reduce con **deduplicación**: cada evento lleva un `event_id`; al procesarlo, si ya se vio, se descarta. Pero no se puede eliminar del todo, porque el último salto (proveedor → dispositivo) está fuera de tu control. Aceptar "casi siempre una vez" es parte del diseño.

### Componentes adicionales

**Plantillas.** Millones de notificaciones siguen unos pocos formatos. Una plantilla parametrizada (`¡[NOMBRE], tu pedido [ID] llega [FECHA]!`) mantiene formato consistente, reduce errores y ahorra tiempo. Se versionan y se cachean; admiten idiomas (localización).

**Preferencias del usuario.** La gente recibe demasiadas notificaciones y se harta. Cada usuario controla qué recibe y por qué canal:

```
 notification_settings(user_id, channel, category, opt_in)
```

Antes de enviar, se verifica que el usuario esté suscrito a esa categoría en ese canal. Además de ser buena experiencia, en muchos países es obligatorio legalmente para comunicaciones de marketing.

**Rate limiting por usuario.** Limitar cuántas notificaciones recibe una persona por día o por hora. Si envías demasiadas, el usuario desactiva todas, y pierdes el canal para siempre. (Distinto del rate limiting de la sesión 16, que protege tus servidores: este protege al usuario.)

**Reintentos.** Si un proveedor falla, el evento vuelve a una cola de reintento con backoff exponencial; si el problema persiste, se alerta al equipo. Tras N intentos, a una DLQ.

**Seguridad en push.** Solo clientes autenticados (con `appKey` y `appSecret` u otro mecanismo) pueden usar la API de envío. Una API de notificaciones abierta es una herramienta perfecta para spam o phishing con tu marca.

**Monitoreo de colas.** La métrica clave es el **número de notificaciones encoladas**. Si crece, los workers no dan abasto y hay que agregar más (autoescalado por profundidad de cola).

**Seguimiento de eventos.** Tasa de apertura, de clic y de interacción son esenciales para el negocio. El sistema emite eventos (`created`, `sent`, `delivered`, `opened`, `clicked`, `unsubscribed`, `error`) hacia el servicio de analítica.

### Diseño final con todo junto

```
 [Servicios] → [LB] → [Notif. servers: authn + rate limit + validación]
                          │                 │
                    [Cache + BD]      [Notification log]
                          │
          ┌───────────────┼──────────────────┐
     [cola push]      [cola SMS]        [cola email]
          │               │                  │
     [workers] ──falla──> [cola de reintento] ──N intentos──> [DLQ + alerta]
          │
     APNs / FCM / Twilio / SendGrid
          │
     [Eventos de entrega/apertura] → [Analítica]
```

### Más allá del libro: decisiones que aparecen en producción

- **Prioridades**: una alerta de seguridad ("alguien inició sesión en tu cuenta") no debe esperar detrás de 10 M de push de marketing. Usa colas separadas por prioridad (transaccional frente a masivo) o una cola con prioridades; los workers atienden primero la alta.
- **Programación y zonas horarias**: "enviar a las 9:00 hora local" significa repartir la campaña a lo largo de 24 horas según el huso de cada usuario. Las "horas de silencio" evitan despertar a alguien a las 3:00 con una oferta.
- **Proveedores de respaldo**: si el proveedor de SMS principal falla o es lento, un circuit breaker (sesión 12) conmuta a uno secundario. Para email, dividir el tráfico entre proveedores también protege la reputación del dominio emisor.
- **Límites de los proveedores**: APNs, FCM y los proveedores de SMS imponen límites de envío; los workers deben respetarlos con su propio rate limiter para no ser bloqueados.
- **Agregación**: "A Ana y otras 12 personas les gustó tu foto" en lugar de 13 notificaciones. Requiere esperar un breve intervalo y combinar eventos.
- **Tokens inválidos**: cuando APNs o FCM responden que un token ya no es válido (app desinstalada), hay que borrarlo para no seguir pagando y enviando en vano.
- **Bandeja dentro de la app**: además de enviar, guardar las notificaciones recientes para mostrarlas en un centro de notificaciones con estado leído/no leído.

### Dos recorridos distintos: transaccional frente a campaña

**Transaccional** ("tu código de verificación es 482913"):

1. El servicio de autenticación llama a la API con prioridad alta y una clave de idempotencia (el `event_id`).
2. El servidor verifica preferencias (los mensajes transaccionales críticos suelen ignorar el opt-out de marketing, pero respetan el canal elegido), arma el mensaje y lo encola en la cola de alta prioridad de SMS.
3. Un worker lo toma en milisegundos y llama al proveedor principal; si el circuit breaker de ese proveedor está abierto, usa el secundario.
4. El estado queda en el notification log. Objetivo: entrega en segundos, porque el usuario está esperando con la pantalla abierta.

**Campaña** (10 M de usuarios, "20 % de descuento este fin de semana"):

1. El servicio de marketing crea una campaña con un segmento y una plantilla; no llama 10 M de veces a la API, sino que entrega el segmento.
2. Un **planificador** expande el segmento en lotes, calcula la hora local de cada usuario y respeta las horas de silencio.
3. Cada lote se filtra por preferencias y por el límite diario por usuario, se deduplica y se encola en la cola de baja prioridad.
4. Los workers envían respetando los límites de los proveedores, sin bloquear la cola transaccional.
5. Los eventos de apertura y clic vuelven a analítica para medir la campaña.

El mismo sistema, dos rutas muy diferentes. Tratar ambas igual es la causa clásica de que un código de verificación llegue con 40 minutos de retraso durante una campaña.

### El notification log

La tabla de registro es a la vez el mecanismo de confiabilidad y la fuente de verdad para soporte ("¿le llegó al usuario el aviso de pago?"):

```
 notification_log(notification_id, event_id, user_id, channel, template_id,
                  status, attempts, provider, provider_message_id, created_at, updated_at)
```

Recibe una escritura por cada cambio de estado de cada notificación: con 16 M de notificaciones diarias y ~4 cambios cada una, son ~64 M de escrituras por día (~750/s promedio, mucho más en campañas). Es un patrón de escritura masiva con consultas por usuario y por fecha: encaja bien en un wide-column store particionado por `user_id`, con retención limitada (por ejemplo, 90 días) y agregados históricos en el sistema de analítica.

### Modos de fallo

| Fallo | Efecto | Mitigación |
| --- | --- | --- |
| Proveedor caído | Cola de ese canal crece | Circuit breaker + proveedor secundario; reintentos con backoff |
| Pico de campaña | Retraso de transaccionales | Colas separadas por prioridad |
| Worker muere a mitad de envío | Mensaje reentregado, posible duplicado | Deduplicación por event_id antes de enviar |
| Tokens inválidos acumulados | Costo y errores crecientes | Borrar tokens que el proveedor rechaza |
| Plantilla con error | Millones de mensajes rotos | Validar plantillas, enviar primero a un grupo pequeño (canary) |
| Bucle de un servicio emisor | Spam a usuarios | Rate limit por usuario y por servicio emisor |

### Privacidad del contenido

Las notificaciones push pasan por servidores de terceros (Apple, Google) y aparecen en pantallas bloqueadas. No incluyas datos sensibles en el texto ("tu resultado médico es…"); envía un aviso genérico y muestra el detalle dentro de la app tras autenticarse. Los códigos de verificación por SMS deben expirar rápido y limitarse en número de intentos.

### Dimensionar workers con números

Una campaña de 10 M de push debe entregarse en 15 minutos (900 s): ~11.000 envíos/s. Si cada llamada al proveedor tarda ~50 ms y un worker mantiene 100 llamadas concurrentes (I/O asíncrono), cada worker hace ~2.000 envíos/s: con 6 workers bastaría, más margen (10). Pero si FCM limita tu proyecto a, digamos, 6.000 mensajes/s, el cuello de botella es el proveedor: la campaña tardará al menos 10 M / 6.000 ≈ 28 minutos, y no tiene sentido escalar más workers. Detectar cuál es la restricción real (tus workers o el proveedor) es la clave del dimensionamiento.

Para la cola: si la campaña encola 10 M de mensajes de ~1 KB (token, payload, metadatos), la cola retiene ~10 GB en el peor momento; cualquier broker moderno lo maneja, pero conviene saberlo para configurar retención y disco. Y para el notification log: 10 M de envíos con 4 cambios de estado son 40 M de escrituras concentradas en media hora, más de 20.000 escrituras/s: otra razón para un almacenamiento optimizado para escrituras masivas.

## Conceptos clave

- **Device token**: identificador de un dispositivo para recibir push.
- **APNs / FCM**: servicios de Apple y Google que entregan push a iOS y Android.
- **Cola por canal**: aísla el envío de cada canal para que el fallo de un proveedor no afecte a los demás.
- **Notification log**: registro persistente de cada notificación y su estado, base de los reintentos.
- **Deduplicación por event_id**: descartar eventos ya procesados para reducir duplicados.
- **Plantilla de notificación**: mensaje parametrizado reutilizable.
- **Preferencias (opt-in/opt-out)**: control del usuario sobre categorías y canales.
- **Rate limiting por usuario**: límite de notificaciones que recibe una persona por periodo.
- **Horas de silencio**: ventana en la que no se envían notificaciones no urgentes.

## Preguntas de repaso

1. ¿Por qué usar una cola separada por canal?
   R: Para desacoplar la recepción del envío y aislar fallos: si el proveedor de SMS cae o se vuelve lento, solo se acumula la cola de SMS, mientras push y email siguen saliendo. Además cada canal escala sus workers según su propio volumen y límites.
2. ¿Puede un sistema de notificaciones garantizar entrega exactamente una vez? ¿Qué se hace en su lugar?
   R: No, porque es distribuido y el último salto depende de proveedores externos; un reintento tras una confirmación perdida puede duplicar el envío. Se garantiza no perder (persistencia, colas at-least-once, reintentos) y se reducen los duplicados con deduplicación por event_id.
3. ¿Qué diferencia hay entre el rate limiting de esta sesión y el de la sesión 16?
   R: El de la sesión 16 protege a los servidores de clientes que hacen demasiadas peticiones. El de esta sesión protege a los usuarios de recibir demasiadas notificaciones, para que no desactiven el canal; limita cuántas recibe cada persona por periodo.
4. Una campaña de 20 M de push debe salir en 20 minutos y el proveedor permite 10.000/s. ¿Es posible? ¿Qué harías?
   R: 20 M en 1.200 s requiere ~16.700/s, por encima del límite del proveedor; al máximo de 10.000/s tardaría ~33 minutos. Opciones: negociar un límite mayor, extender la ventana, priorizar segmentos (enviar primero a los usuarios más activos) o repartir por zona horaria.
5. ¿Qué datos de usuario necesita el sistema y cómo se mantienen correctos los device tokens?
   R: Email y teléfono en la tabla de usuarios, y uno o más device tokens con su plataforma en la tabla de dispositivos, además de las preferencias por canal. Los tokens se actualizan cuando la app los renueva o el usuario inicia sesión, y se eliminan cuando APNs o FCM informan que son inválidos.

## Ejercicio

Implementa en TypeScript un `NotificationService` con colas en memoria por canal, workers con reintentos y DLQ (puedes reutilizar tu cola de la sesión 09), verificación de preferencias, rate limiting por usuario (máximo 3 de marketing por día) y deduplicación por `eventId`. Simula proveedores con una interfaz `Provider.send()` que falle de forma configurable. Pruebas: un usuario dado de baja no recibe; el cuarto mensaje de marketing del día se descarta; un evento duplicado se envía una vez; si el proveedor de SMS falla siempre, los emails siguen saliendo y los SMS terminan en la DLQ. Terminado cuando las cuatro pruebas pasen.

## Explícalo con tus palabras

Explica cómo funciona un sistema de notificaciones con la imagen de la oficina de correos de una ciudad que separa cartas, telegramas y paquetes en mostradores distintos.
