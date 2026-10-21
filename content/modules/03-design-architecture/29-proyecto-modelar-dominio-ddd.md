---
title: "Proyecto: modelar un dominio con DDD (bicicletas eléctricas compartidas)"
kind: project
hours: 3
sources: Domain-Driven Design (Evans), partes I, II y IV (pp. 12–132, 233–348)
links: Alberto Brandolini, introducción a EventStorming | https://www.eventstorming.com/ ; Context Mapper | https://contextmapper.org/
---

## Objetivo

Aplicar DDD de punta a punta a un dominio nuevo: descubrir el lenguaje y los eventos, dividir el sistema en bounded contexts con su context map, distinguir core, soporte y genérico, diseñar agregados con invariantes y eventos de dominio, e implementar en TypeScript el núcleo del contexto principal sin infraestructura, con tests que hablen el lenguaje del negocio.

## Estudio

### El caso: "Volta", bicicletas eléctricas compartidas

Volta opera 800 bicicletas eléctricas en una ciudad con 60 estaciones. Esta es la información que obtuviste en dos conversaciones con el equipo (es tu material de knowledge crunching):

> **Operaciones (Laura):** "Un usuario desbloquea una bici con la app en una estación, la usa y la devuelve en cualquier estación con anclajes libres. Si la batería de una bici baja del 20 %, no se puede alquilar. Cada noche y en horas pico, nuestro equipo de **rebalanceo** mueve bicis de estaciones llenas a vacías en camionetas; el gran problema es saber cuáles mover y a dónde. Si lo hacemos mal, la gente no encuentra bici por la mañana y no puede devolverla por la tarde."
>
> "Cuando un usuario reporta un daño, la bici queda **bloqueada para alquiler** hasta que el taller la revise. El taller tiene su propio sistema de órdenes de reparación que compramos hace años."
>
> **Producto (Andrés):** "La tarifa es por minuto, con un desbloqueo fijo. Hay **planes**: mensual con 45 minutos diarios incluidos, y estudiantes con 30 % de descuento. Queremos premiar a quien devuelve la bici en una estación con pocas bicis: le damos **créditos**. Eso también ayuda al rebalanceo."
>
> "Un alquiler no puede durar más de 4 horas; pasado ese tiempo, cobramos una penalización y la bici se marca como posiblemente perdida. Un usuario no puede tener dos alquileres activos. Si el usuario tiene deuda pendiente, no puede alquilar."
>
> **Finanzas (Carolina):** "Cobramos con una pasarela de pagos externa; la tarjeta se preautoriza al desbloquear y se cobra al terminar. La facturación electrónica la hace un proveedor que recibe un formato estándar. Usuarios, contraseñas y verificación de identidad, ojalá no tener que construirlos."
>
> **Laura otra vez:** "Ojo: para nosotros una 'estación' es un lugar con anclajes y capacidad; para el equipo de rebalanceo es un nodo con demanda prevista por hora; y para el taller, solo una dirección donde recoger bicis."

### Reglas del proyecto

- Carpeta `volta-ddd/` con documentos Markdown y un paquete TypeScript `volta-ddd/core/` con Vitest. **Sin base de datos, sin HTTP y sin frameworks** en el núcleo: solo modelo y tests, como el prototipo de Evans.
- Todo nombre de clase, método, evento y test debe estar en el glosario del contexto al que pertenece.
- Cuando el caso no responda algo, escribe la pregunta para el experto y la suposición que tomas.

### Cómo repartir las 3 horas

| Bloque | Tiempo | Resultado |
| --- | --- | --- |
| 1. Descubrimiento | 35 min | Línea de tiempo de eventos, comandos y políticas; puntos calientes |
| 2. Estrategia | 35 min | Contextos, glosarios, context map, clasificación y visión |
| 3. Diseño táctico | 40 min | Agregados, invariantes, value objects, eventos, repositorios |
| 4. Implementación | 60 min | Núcleo en TypeScript con tests |
| 5. Revisión | 10 min | Autoevaluación con las preguntas de repaso |

## Qué hacer

1. **Event storming en texto (`01-descubrimiento.md`).** Escribe una línea de tiempo con al menos 15 **eventos de dominio** en pasado (por ejemplo `BiciDesbloqueada`, `AlquilerFinalizado`, `DañoReportado`, `BiciRebalanceada`), los **comandos** que los provocan, los **actores** y al menos 4 **políticas** del tipo "cuando ocurre X, entonces Y" (por ejemplo, "cuando se reporta un daño, bloquear la bici para alquiler"). Marca con ⚠ al menos 3 puntos calientes o dudas.
2. **Bounded contexts y lenguaje (`02-contextos.md`).** Identifica entre 4 y 6 contextos (sugerencias: Alquileres, Flota y estaciones, Rebalanceo, Precios y planes, Pagos, Identidad, Taller). Para cada uno: propósito en una frase, glosario de 5 a 8 términos y su definición de "Estación" y "Bici" cuando aplique (aprovecha la pista de Laura).
3. **Clasificación y visión.** Clasifica cada contexto como core, de soporte o genérico, justificando. Escribe una **declaración de visión del dominio** (máximo 150 palabras) que diga qué hace especial a Volta y qué **no** es el core. Para cada genérico, decide comprar, estándar, subcontratar o construir, con su compromiso.
4. **Context map (`03-context-map.md`).** Dibuja en ASCII los contextos y sus relaciones, marcando upstream/downstream y el patrón de cada una (customer/supplier, conformist, anticorruption layer, open host service, published language, separate ways, shared kernel). Debe incluir al menos: una **capa anticorrupción** hacia el sistema del taller, una relación con la **pasarela de pagos** y un **lenguaje publicado** de eventos entre Alquileres y Rebalanceo. Justifica cada patrón en una línea.
5. **Diseño táctico del contexto Alquileres (`04-tactico.md`).** Define: los agregados (sugerido: `Rental` y `Rider`, quizás `Bike` en Flota referenciada por ID), sus raíces y límites; las **invariantes** escritas como frases del dominio (al menos 5, incluyendo "un usuario no puede tener dos alquileres activos", "no se alquila una bici con batería < 20 % o bloqueada", "un alquiler dura como máximo 4 horas", "un usuario con deuda no puede alquilar"); los **value objects** (`Money`, `Minutes`, `BatteryLevel`, `StationId`...); los **eventos** que publica cada agregado; las interfaces de **repositorio**; y una **especificación** para "puede alquilar". Indica qué invariante se protege dentro de un agregado y cuál requiere coordinación entre agregados (y cómo: servicio de dominio, consulta previa o consistencia eventual).
6. **Implementación (`core/`).** En TypeScript, sin infraestructura:
   - Value objects inmutables con validación (`Money` con cierre de operaciones, `BatteryLevel`, `Minutes`).
   - Agregado `Rental` con `start`, `finish(at, station)` y `expire(now)`, que acumula eventos de dominio y nunca expone estado mutable.
   - Política de precios como **Strategy/Policy** del dominio (`PricingPolicy`) con al menos tres variantes: tarifa base, plan mensual con minutos incluidos y estudiante.
   - Una `CanRentSpecification` combinable (`and`, `not`).
   - Repositorios en memoria y un caso de uso `StartRental` que coordine sin reglas de negocio propias.
   - Un adaptador anticorrupción simulado para el sistema del taller que traduzca `DañoReportado` a su formato (`{ ORDEN_TIPO: "REP", ACTIVO: string, OBS: string }`).
7. **Tests.** Al menos 15 tests con Vitest cuyos nombres sean frases del lenguaje ubicuo (`"no permite iniciar un alquiler si el usuario ya tiene uno activo"`), con un test por invariante, tests de cada política de precios y un test que muestre que el evento `AlquilerFinalizado` incluye lo que necesita Rebalanceo (estación de destino y hora).
8. **Autoevaluación.** Responde las preguntas de repaso y anota qué decisión de modelado cambiarías si tuvieras otra conversación con los expertos.

**Criterio de terminado:** existen los cuatro documentos y el paquete `core/`; cada contexto tiene su glosario y su clasificación justificada; el context map tiene un patrón justificado por relación; todas las invariantes del punto 5 tienen test y no se pueden violar desde fuera de los agregados; ningún tipo del sistema del taller aparece fuera de la capa anticorrupción; `npx vitest run` pasa con al menos 15 tests; ningún archivo del núcleo importa librerías de infraestructura.

## Conceptos clave

- **Event storming**: taller para descubrir el dominio a partir de eventos en pasado, comandos, actores y políticas en una línea de tiempo.
- **Política (reacción)**: regla del tipo "cuando ocurre este evento, se ejecuta este comando".
- **Invariante entre agregados**: regla que involucra a más de un agregado y se resuelve con consulta previa, servicio de dominio o consistencia eventual.
- **Lenguaje publicado de eventos**: esquema versionado de eventos que otros contextos pueden consumir.

## Preguntas de repaso

1. ¿Por qué "Estación" debe modelarse distinto en Alquileres, Rebalanceo y Taller?
   R: Porque cada contexto le da un significado diferente: para Alquileres es un lugar con anclajes y capacidad donde se toma y deja la bici; para Rebalanceo es un nodo con demanda prevista; para el Taller, una dirección de recogida. Un modelo único mezclaría atributos y reglas de los tres y crearía falsos cognados; cada contexto tiene su propio modelo y se traducen en los límites.
2. ¿Cuál es el core de Volta y por qué?
   R: El rebalanceo y la política de precios e incentivos (créditos por devolver en estaciones vacías) son los candidatos más fuertes: determinan la disponibilidad de bicis y el ingreso, y son lo que diferencia el servicio. Alquileres es de soporte (necesario pero común a muchos servicios), y pagos, identidad y facturación son genéricos que conviene comprar o integrar.
3. ¿Cómo proteges la regla "un usuario no puede tener dos alquileres activos" si `Rental` y `Rider` son agregados distintos?
   R: Opciones: hacer que el agregado `Rider` registre el alquiler activo (por ID) y rechace iniciar otro, de modo que la invariante viva dentro de un agregado; o comprobarla en el caso de uso consultando el repositorio y respaldarla con una restricción única en la persistencia. La primera es más fiel a DDD porque la regla queda dentro de un límite de consistencia.
4. ¿Por qué el sistema del taller necesita una capa anticorrupción y no una relación conformista?
   R: Porque es un sistema comprado con un modelo y formato ajenos (órdenes de reparación con campos y códigos propios); conformarse filtraría ese modelo a Flota y Alquileres. La capa anticorrupción traduce `DañoReportado` y las respuestas del taller a los términos del propio contexto.

## Explícalo con tus palabras

Presenta en cinco minutos a Laura, Andrés y Carolina el context map y la visión del dominio, y explica por qué propones invertir más en rebalanceo y precios que en usuarios y pagos.
