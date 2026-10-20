---
title: Arquitectura de aplicación — capas, servicios y eventos
kind: lesson
hours: 2
sources: karanpratapsingh/system-design, cap. III "N-tier architecture", "Monoliths and Microservices", "Event-Driven Architecture (EDA)", "Event Sourcing" y "Command and Query Responsibility Segregation (CQRS)"; cap. IV "Service Discovery" | System Design Primer, "Application layer" (microservices, service discovery)
links: Primer — Application layer | https://github.com/donnemartin/system-design-primer#application-layer ; Karan — N-tier architecture | https://github.com/karanpratapsingh/system-design#n-tier-architecture ; Karan — Monoliths and Microservices | https://github.com/karanpratapsingh/system-design#monoliths-and-microservices ; Karan — Event-Driven Architecture | https://github.com/karanpratapsingh/system-design#event-driven-architecture-eda ; Karan — Event Sourcing | https://github.com/karanpratapsingh/system-design#event-sourcing ; Karan — CQRS | https://github.com/karanpratapsingh/system-design#command-and-query-responsibility-segregation-cqrs ; Karan — Service Discovery | https://github.com/karanpratapsingh/system-design#service-discovery
---

## Objetivo

Elegir la forma de organizar el código y los procesos de un sistema (capas, monolito, monolito modular, microservicios), saber cómo se encuentran los servicios entre sí, y decidir cuándo vale la pena una arquitectura dirigida por eventos, event sourcing o CQRS.

## Estudio

### Dónde encaja esta sesión

En el módulo 03 viste arquitectura de software desde dentro del código (Clean Architecture, DDD, bounded contexts), y en el módulo 06 vas a estudiar microservicios a fondo. Esta sesión toma la perspectiva intermedia del diseño de sistemas: **cómo se reparte una aplicación en procesos y máquinas**, y qué consecuencias tiene eso en escalabilidad, disponibilidad y consistencia.

### Separar la capa web de la capa de aplicación

El primer paso, que el primer llama "capa de aplicación", es separar los servidores que atienden HTTP (la capa web) de los que ejecutan la lógica (la capa de aplicación o de servicios). Así cada capa escala y se despliega de forma independiente: si la lógica de negocio necesita más CPU, agregas servidores de aplicación sin tocar la capa web, y viceversa. Es el principio de responsabilidad única aplicado a procesos.

### Capas lógicas y niveles físicos (N-tier)

Distingue dos ideas que a menudo se mezclan:

- **Capas** (layers): separación **lógica** de responsabilidades dentro del código (presentación, negocio, acceso a datos). Una capa superior usa servicios de las inferiores, nunca al revés.
- **Niveles** (tiers): separación **física**: procesos o máquinas distintas. Una capa puede vivir en su propio nivel o compartirlo con otras.

```
 3-tier clásico
 [Presentación]  navegador / app / servidor web
       │
 [Lógica de negocio]  servidores de aplicación
       │
 [Datos]  base de datos
```

Variantes: **1-tier** (todo en una máquina, como una app de escritorio), **2-tier** (el cliente habla directo con la base, sin capa de negocio en el medio; frágil y difícil de asegurar), **3-tier** (el estándar web) y **N-tier** con más niveles (cache, colas, servicios).

En una arquitectura de **capas cerradas**, cada capa solo llama a la inmediatamente inferior: limita dependencias, pero puede agregar saltos que solo reenvían. En una de **capas abiertas**, una capa puede saltar a cualquiera inferior: más eficiente, más acoplada.

Ventajas de separar en niveles: disponibilidad (cada nivel redundante), seguridad (cada nivel actúa como frontera; la base no es alcanzable desde internet), escalado independiente y equipos que mantienen niveles distintos. Desventajas: más complejidad, más latencia por cada salto de red, más costo y más reglas de red que gestionar.

### Monolito

Un **monolito** es una aplicación que se construye y despliega como **una sola unidad** y resuelve todas las necesidades del negocio.

Ventajas reales (y a menudo subestimadas):

- Simple de desarrollar, depurar, probar y monitorear.
- Llamadas entre módulos en memoria: rápidas y sin fallos de red.
- Transacciones ACID entre cualquier par de tablas.
- Un solo pipeline de despliegue.

Desventajas que aparecen al crecer:

- La base de código se vuelve difícil de mantener; todo está acoplado.
- Cada cambio redespliega la aplicación entera; un bug puede tumbar todo.
- Escala como bloque: si solo la generación de reportes necesita más CPU, igual replicas todo.
- Compromete a un stack tecnológico para siempre.
- Muchos equipos pisándose en el mismo código y el mismo ciclo de releases.

### Monolito modular

Un punto medio muy recomendable: **un solo despliegue**, pero el código dividido en módulos independientes por dominio (pedidos, pagos, catálogo), con interfaces explícitas entre ellos y sin acceso directo a las tablas de otro módulo. Conserva la simplicidad operativa del monolito y prepara el terreno para extraer servicios cuando haya una razón concreta. Si los módulos están bien separados, extraer uno es mover código, no desenredarlo.

### Microservicios

Una arquitectura de **microservicios** es un conjunto de servicios pequeños y autónomos, cada uno responsable de una capacidad de negocio dentro de un bounded context, con su propio código, su propio equipo, su propio despliegue y **sus propios datos** (base de datos por servicio).

```
 [API Gateway]
   ├─> [Pedidos] ──> (BD pedidos)
   ├─> [Pagos]   ──> (BD pagos)
   ├─> [Catálogo]──> (BD catálogo)
   └─> [Envíos]  ──> (BD envíos)
        └── eventos ──> [broker] ──> otros servicios
```

Características: bajo acoplamiento, foco en una sola responsabilidad (por alcance, no por tamaño), organización alrededor del negocio, diseño para tolerar fallos y facilidad de mantenimiento.

Ventajas: despliegue independiente, equipos autónomos que avanzan en paralelo, aislamiento de fallos y de datos, escalado por servicio, libertad tecnológica.

Desventajas: toda la complejidad de un sistema distribuido (red, latencia, fallos parciales), pruebas de integración más difíciles, más infraestructura y costo, consistencia de datos entre servicios (sagas, eventual), comunicación entre servicios que hay que diseñar, observabilidad obligatoria.

### El monolito distribuido

El peor de ambos mundos: un sistema dividido en servicios que **siguen acoplados**. Señales:

- Para desplegar un servicio hay que desplegar otros al mismo tiempo.
- Varios servicios comparten la misma base de datos o el mismo esquema.
- Una petición de usuario atraviesa en serie seis servicios que requieren baja latencia entre sí.
- Un servicio no puede escalar sin que escalen otros.

Tienes la complejidad operativa de los microservicios sin ninguno de sus beneficios. Recuerda la disponibilidad en serie de la sesión 02: seis servicios de 99,9 % en serie dan 99,4 %.

### SOA frente a microservicios

**SOA** (Service-Oriented Architecture) también organiza el sistema en servicios, pero con otro énfasis: maximizar la **reutilización** de componentes a nivel empresa, a menudo mediante un ESB central (sesión 09) que concentra integración y lógica. Los microservicios ponen el énfasis en la **autonomía** de cada servicio y en tuberías simples. En la práctica, SOA tiende a componentes compartidos y gobierno central; microservicios, a componentes independientes y gobierno descentralizado.

### ¿Necesitas microservicios?

El consejo de las fuentes es claro: **empieza con un monolito** (idealmente modular) y migra cuando haya razones concretas. Preguntas para decidir:

1. ¿El equipo es demasiado grande para trabajar en una sola base de código?
2. ¿Hay equipos bloqueados esperando a otros para desplegar?
3. ¿Partes del sistema necesitan escalar o fallar de forma realmente independiente?
4. ¿Tienes madurez en automatización, observabilidad y operación de sistemas distribuidos?
5. ¿Hay un beneficio de negocio claro que justifique el costo?

Si la mayoría de las respuestas es "no", los microservicios te harán más lento.

### Migrar de monolito a servicios: el patrón strangler fig

Cuando sí hay razones para extraer servicios, la reescritura completa ("el gran rewrite") casi siempre fracasa: tarda años, el sistema viejo sigue cambiando y nunca se alcanza. El patrón **strangler fig** (higuera estranguladora) migra de a poco:

1. Pon un proxy o gateway delante del monolito: todo el tráfico pasa por él.
2. Elige una capacidad con fronteras claras y alto valor (por ejemplo, notificaciones o catálogo).
3. Constrúyela como servicio nuevo, con sus propios datos sincronizados desde el monolito (eventos o CDC) mientras dure la transición.
4. Cambia en el proxy las rutas de esa capacidad hacia el servicio nuevo, primero un porcentaje (canary) y luego todo.
5. Borra el código viejo del monolito. Repite con la siguiente capacidad.

```
 Antes:   [Clientes] ──> [Monolito: A B C D]
 Durante: [Clientes] ──> [Proxy] ──/notificaciones──> [Servicio N]
                               └──── resto ──────────> [Monolito: A B C]
 Después: el monolito se reduce hasta desaparecer (o queda como un núcleo pequeño)
```

En cada paso el sistema funciona y se puede revertir. El costo es convivir durante meses con dos versiones y con datos sincronizados entre ambas.

### Síncrono o asíncrono entre servicios

Separar en servicios obliga a decidir cómo se hablan. Una guía práctica:

| Usa llamadas síncronas (REST/gRPC) cuando… | Usa eventos o colas cuando… |
| --- | --- |
| El llamador necesita la respuesta para continuar (validar stock antes de confirmar) | El llamador solo informa que algo pasó |
| La operación es rápida y la dependencia es muy disponible | La operación es lenta o la dependencia es poco confiable |
| Hay un solo destinatario | Varios servicios deben reaccionar |
| La consistencia inmediata es un requisito | La consistencia eventual es aceptable |

Una buena heurística es minimizar la **profundidad** de las cadenas síncronas: idealmente, una petición de usuario hace como mucho una o dos llamadas síncronas en serie, y el resto del trabajo se propaga por eventos. Cuando un servicio necesita con frecuencia datos de otro, en vez de llamarlo en cada petición puede mantener una **copia local de solo lectura** alimentada por sus eventos: más almacenamiento y consistencia eventual, a cambio de autonomía y menor latencia.

### Descubrimiento de servicios

Con decenas de servicios cuyas instancias aparecen y desaparecen (autoscaling, despliegues, fallos), las IPs fijas en configuración no sirven. **Service discovery** resuelve "¿dónde está ahora el servicio de pagos?".

Componentes:

- **Registro de servicios** (service registry): base de datos con las instancias vivas de cada servicio, su IP, puerto y estado. Ejemplos: Consul, etcd, ZooKeeper, Eureka; en Kubernetes, el propio API server con los Services y DNS interno.
- **Registro de instancias**: cada instancia se registra al arrancar y envía heartbeats (*self-registration*), o un componente externo la registra observando el entorno (*third-party registration*, como hace Kubernetes).

Dos formas de usarlo:

```
 Client-side discovery                    Server-side discovery
 [Servicio A] ──consulta──> [Registro]     [Servicio A] ──> [LB / proxy] ──consulta──> [Registro]
      └────────── llama directo ──> [B #3]                       └──────────────> [B #3]
```

- **Del lado del cliente**: el cliente consulta el registro y balancea él mismo. Menos saltos, pero cada cliente necesita la lógica (y una librería por lenguaje).
- **Del lado del servidor**: el cliente llama a un balanceador o proxy que consulta el registro. Clientes simples, un salto más.

El **service mesh** (sesión 04) lleva esto al extremo: cada instancia tiene un sidecar que descubre, balancea, cifra y reintenta.

### Arquitectura dirigida por eventos (EDA)

En una **arquitectura dirigida por eventos**, los servicios se comunican publicando **eventos**: hechos inmutables que ya ocurrieron ("PedidoCreado", "PagoRechazado"). Los componentes son productores, el broker o log de eventos (sesión 09) y consumidores.

Dos patrones dentro de EDA:

- **Pub/sub**: los suscriptores reciben los eventos que llegan desde que se suscribieron.
- **Event streaming**: los eventos se guardan en un log y los consumidores pueden leer desde cualquier punto, incluso releer el historial.

Ventajas: desacople (el productor no conoce a los consumidores), extensibilidad (agregar un consumidor nuevo no toca al productor), escalado y tolerancia a fallos (los consumidores procesan a su ritmo), auditoría natural. Desafíos: consistencia eventual, entregas duplicadas y fuera de orden (consumidores idempotentes), flujos difíciles de seguir (necesitas tracing y un catálogo de eventos) y gestión de esquemas de eventos que evolucionan.

Usos: microservicios que reaccionan a cambios de otros, integración entre sistemas, procesamiento en tiempo real (fraude, IoT), notificaciones y analítica.

### Event sourcing

Normalmente guardas el **estado actual**: la fila `accounts(id=7, balance=150)`. Con **event sourcing** guardas la **secuencia de eventos** que produjo ese estado, en un almacén de solo inserción (*event store*):

```
 account 7:
   1. AccountOpened  { initial: 0 }
   2. MoneyDeposited { amount: 200 }
   3. MoneyWithdrawn { amount: 50 }
 Estado actual = reproducir eventos → balance 150
```

El estado actual se obtiene **reproduciendo** los eventos (con *snapshots* periódicos para no reproducir millones cada vez).

Diferencia con EDA: en EDA los eventos son un mecanismo de **comunicación** entre servicios; en event sourcing los eventos son el **modelo de almacenamiento** de un servicio. Se pueden combinar, pero son decisiones independientes.

Ventajas: historial completo y auditable (ideal en dominios financieros o regulados), reconstruir el estado en cualquier momento del pasado, depurar reproduciendo eventos, crear nuevas vistas de lectura a partir del historial, escrituras rápidas (solo se insertan eventos). Desventajas: consultar el estado actual requiere proyecciones; los eventos no se pueden cambiar, así que versionarlos es delicado; borrar datos personales (derecho al olvido) es difícil en un log inmutable; y el modelo es menos familiar para la mayoría de los equipos.

### CQRS

**CQRS** (Command and Query Responsibility Segregation) separa el modelo de **escritura** (comandos que cambian estado y validan reglas de negocio) del modelo de **lectura** (consultas optimizadas para mostrar datos). Pueden vivir en almacenamientos distintos:

```
 Comandos ──> [Modelo de escritura] ──> (BD normalizada / event store)
                                            │ eventos o CDC
                                            ▼
 Consultas <── [Modelo de lectura] <── (vistas desnormalizadas: Elasticsearch, Redis, tablas por pantalla)
```

Ventajas: cada lado escala por separado (normalmente las lecturas son muchas más), las vistas de lectura se diseñan para cada pantalla sin joins, el modelo de escritura se mantiene limpio y enfocado en invariantes, y encaja naturalmente con event sourcing (los eventos alimentan las proyecciones de lectura). Desventajas: más complejidad, más código y más infraestructura; consistencia eventual entre escribir y ver el cambio (mitígala con read-your-writes, sesión 07); y no tiene sentido para CRUD simple.

Úsalo cuando hay una gran asimetría entre lecturas y escrituras, cuando las lecturas necesitan formas muy distintas a la del modelo de escritura, o cuando ya usas event sourcing. De hecho, muchos diseños de esta etapa son CQRS sin nombrarlo: el timeline precalculado del news feed (sesión 22) es un modelo de lectura alimentado por eventos de publicación.

### Un ejemplo combinado: pedidos con CQRS y eventos

Para ver cómo encajan las piezas, sigue un pedido en una tienda con microservicios:

1. El cliente envía `POST /orders`. El servicio de **Pedidos** valida el comando (modelo de escritura), guarda el pedido y, en la misma transacción, un registro en su outbox (sesión 09).
2. El relay publica `OrderPlaced` en el log de eventos.
3. **Inventario** consume el evento, reserva stock y publica `StockReserved` (o `StockRejected`).
4. **Pagos** consume `StockReserved`, cobra y publica `PaymentCaptured`.
5. Un **proyector** consume todos estos eventos y actualiza la vista de lectura "Mis pedidos" en una tabla desnormalizada por usuario (modelo de lectura), que la app consulta.
6. Si el pago falla, Inventario consume `PaymentFailed` y libera el stock (compensación de la saga).

En este flujo hay EDA (comunicación por eventos), una saga coreografiada (pasos con compensación) y CQRS (vista de lectura separada). No hay event sourcing: cada servicio guarda su estado actual de forma convencional. Reconocer qué patrón aporta cada parte, y cuál no hace falta, es exactamente lo que se espera de ti en un diseño.

### Tabla de decisión

| Situación | Elección razonable |
| --- | --- |
| Producto nuevo, equipo pequeño | Monolito modular |
| Varios equipos bloqueándose, dominios claros | Extraer microservicios por bounded context |
| Muchos sistemas deben reaccionar a los mismos hechos | EDA con log de eventos |
| Auditoría completa obligatoria, dominio financiero | Event sourcing en ese dominio |
| Lecturas masivas con formas distintas a las escrituras | CQRS con vistas de lectura |
| Instancias efímeras que cambian todo el tiempo | Service discovery (o la plataforma que lo da) |

### Modos de fallo

- **Microservicios prematuros**: un equipo de cinco personas operando veinte servicios.
- **Base de datos compartida** entre servicios: cambiar un esquema rompe a otros equipos.
- **Cadenas síncronas largas**: latencia sumada y disponibilidad multiplicada a la baja.
- **Eventos con demasiado o muy poco contenido**: o acoplan a los consumidores a detalles internos, o los obligan a llamar de vuelta al productor por cada evento.
- **Registro de servicios caído**: si los clientes no cachean la última lista conocida, nadie encuentra a nadie.
- **Proyecciones atrasadas sin aviso**: el modelo de lectura de CQRS se queda minutos detrás del de escritura y nadie lo monitorea; mide el retraso de cada proyección como una métrica de primer nivel.

## Conceptos clave

- **Capa vs nivel**: separación lógica del código frente a separación física en procesos o máquinas.
- **Arquitectura 3-tier**: presentación, lógica de negocio y datos en niveles separados.
- **Monolito**: aplicación construida y desplegada como una sola unidad.
- **Monolito modular**: un solo despliegue con módulos internos aislados por dominio.
- **Microservicio**: servicio autónomo con su propio despliegue y sus propios datos, alineado a una capacidad de negocio.
- **Monolito distribuido**: servicios separados físicamente pero acoplados en despliegue, datos o latencia.
- **Service registry**: base de datos de instancias vivas de cada servicio.
- **EDA**: servicios que se comunican publicando y consumiendo eventos.
- **Event sourcing**: guardar la secuencia de eventos en lugar del estado actual.
- **CQRS**: separar el modelo de escritura del modelo de lectura.

## Preguntas de repaso

1. ¿Cuál es la diferencia entre una capa y un nivel en una arquitectura N-tier?
   R: Una capa es una separación lógica de responsabilidades dentro del código (presentación, negocio, datos); un nivel es una separación física en procesos o máquinas distintas. Varias capas pueden compartir un nivel, y separar en niveles permite escalar y asegurar cada uno por separado a costa de saltos de red.
2. ¿Qué señales indican que tienes un monolito distribuido?
   R: Servicios que deben desplegarse juntos, que comparten base de datos o esquema, que dependen de cadenas síncronas largas con baja latencia, o que no pueden escalar por separado. Tiene la complejidad operativa de los microservicios sin su independencia.
3. ¿Qué diferencia hay entre event sourcing y una arquitectura dirigida por eventos?
   R: En EDA los eventos son un mecanismo de comunicación entre servicios; cada servicio puede guardar su estado como quiera. En event sourcing los eventos son el modelo de almacenamiento: el estado se obtiene reproduciendo el log de eventos. Son decisiones independientes que pueden combinarse.
4. ¿Cuándo justificarías CQRS y qué costo introduce?
   R: Cuando las lecturas superan ampliamente a las escrituras y necesitan formas muy distintas al modelo de escritura, o cuando se usa event sourcing. Introduce más complejidad e infraestructura y consistencia eventual entre la escritura y su aparición en las vistas de lectura, que se mitiga con read-your-writes.
5. Compara service discovery del lado del cliente y del lado del servidor.
   R: Del lado del cliente, cada cliente consulta el registro y balancea por sí mismo: menos saltos y sin balanceador central, pero cada cliente necesita la lógica y librerías por lenguaje. Del lado del servidor, el cliente llama a un balanceador o proxy que consulta el registro: clientes simples, a cambio de un salto y un componente más que debe ser redundante.

## Ejercicio

Toma un sistema de e-commerce y escribe dos propuestas: (a) un monolito modular con sus módulos, sus interfaces y qué tablas pertenece a cada uno, y (b) una versión con 4–6 microservicios, sus bases de datos, los eventos que publica cada uno y dónde aplicarías CQRS. Para (b), dibuja en ASCII el flujo de "crear pedido" como saga coreografiada y calcula la disponibilidad de la ruta síncrona. Termina con un párrafo que diga en qué condiciones del equipo y del negocio migrarías de (a) a (b). Terminado cuando ambas propuestas tengan diagrama y la decisión final esté argumentada con al menos tres criterios.

## Explícalo con tus palabras

Explica la diferencia entre un monolito y microservicios usando la imagen de un restaurante con una sola cocina grande frente a un patio de comidas con puestos independientes.
