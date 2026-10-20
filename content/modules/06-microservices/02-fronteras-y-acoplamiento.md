---
title: Fronteras de servicio, cohesión y tipos de acoplamiento
kind: lesson
hours: 2
sources: Building Microservices 2nd ed., cap. 2 "How to Model Microservices" (pp. 57–100) | Hands-On Microservices with Kubernetes, cap. 2 "Employing interfaces and contracts" y "Taking advantage of ownership" (pp. 52–57)
links: Martin Fowler — BoundedContext | https://martinfowler.com/bliki/BoundedContext.html ; Event Storming (Alberto Brandolini) | https://www.eventstorming.com/
---

## Objetivo

Evaluar si una frontera de servicio es buena usando information hiding, cohesión y acoplamiento; reconocer los cuatro tipos de acoplamiento de implementación (domain, pass-through, common, content) y saber cómo reducir cada uno; traducir bounded contexts y aggregates de DDD a servicios.

## Estudio

### 1. Qué hace buena a una frontera

Una frontera de servicio es buena si permite que **la mayoría de los cambios se queden dentro de un solo servicio**. Si cada historia de usuario obliga a tocar tres servicios, las fronteras están mal, por limpio que se vea el diagrama.

Tres ideas, que vienen de la programación estructurada de los años 70, te sirven para juzgar una frontera:

1. **Information hiding.** Un módulo esconde las decisiones que probablemente van a cambiar detrás de una interfaz estable. Cuanto menos expongas, más libertad tienes para cambiar el interior. En microservicios, lo que se esconde es el modelo de datos interno, la tecnología, los algoritmos, incluso qué otros servicios llamas.
2. **Cohesión.** "El código que cambia junto, vive junto". Un servicio cohesivo agrupa la funcionalidad que tiende a cambiar por las mismas razones de negocio.
3. **Acoplamiento.** Cuánto un cambio en un servicio obliga a cambiar otro. Lo buscamos bajo.

Estas tres ideas se refuerzan. Una frase que resume la relación (atribuida a Larry Constantine) dice que una estructura es estable si la cohesión es fuerte y el acoplamiento es bajo. Si la cohesión es baja, la funcionalidad relacionada queda repartida en varios servicios, y entonces esos servicios necesitan hablar mucho entre sí: el acoplamiento sube.

```
   Baja cohesión → la lógica de "precio" vive en 3 servicios
   ┌─────────┐   ┌─────────┐   ┌─────────┐
   │ Catálogo│◄─►│ Carrito │◄─►│ Checkout│     un cambio en descuentos
   │ precio  │   │ precio  │   │ precio  │     = 3 despliegues
   └─────────┘   └─────────┘   └─────────┘

   Alta cohesión → "Pricing" es dueño del precio
   ┌─────────┐   ┌─────────┐   ┌─────────┐
   │ Catálogo│──►│ Pricing │◄──│ Checkout│     un cambio en descuentos
   └─────────┘   └─────────┘   └─────────┘     = 1 despliegue
```

Ten en cuenta que no existe la frontera perfecta para siempre. Los requisitos cambian y tus decisiones de hoy pueden volverse incómodas mañana. Por eso conviene que las fronteras sean fáciles de revisar, y por eso no vale la pena separar en servicios una parte del sistema que todavía cambia de forma caótica.

### 2. El espectro de acoplamiento

No todo acoplamiento es malo. Un sistema de microservicios **necesita** que los servicios colaboren; si no, no haría nada útil. Lo que buscamos es reducir el acoplamiento y preferir sus formas más sueltas. Ordenados de más suelto (aceptable) a más fuerte (peligroso):

```
 suelto ◄────────────────────────────────────────────────► fuerte
 Domain        Pass-through        Common          Content
 coupling      coupling            coupling        coupling
 (uso una      (paso datos que     (compartimos    (modifico tus
  capacidad    necesita otro       un recurso:     datos internos
  tuya)        más abajo)          BD, archivo)    por detrás)
```

#### 2.1 Domain coupling

Un servicio usa una capacidad de otro. Por ejemplo, `OrderProcessor` llama a `Warehouse` para reservar stock y a `Payment` para cobrar. Es inevitable y, en general, aceptable.

Señal de alarma: un servicio que depende de **muchos** servicios downstream. Puede indicar que acumula demasiada lógica (un "god service" orquestador). Otra señal: que los datos intercambiados crezcan sin control. Comparte solo lo mínimo necesario.

**Temporal coupling** es una variante a considerar: si `OrderProcessor` hace una llamada HTTP síncrona a `Warehouse`, ambos tienen que estar disponibles **al mismo tiempo** para que la operación funcione. Si `Warehouse` está caído, el pedido falla, y además `OrderProcessor` queda bloqueado esperando, consumiendo recursos. No siempre es malo, pero escala mal a medida que crecen las cadenas de llamadas. La forma típica de reducirlo es la comunicación asíncrona (sesión 04).

#### 2.2 Pass-through coupling

Un servicio pasa datos a otro **solo porque un tercero más abajo los necesita**. Ejemplo: `OrderProcessor` envía a `Warehouse` un "manifiesto de envío" que `Warehouse` solo reenvía a `Shipping`.

El problema: si `Shipping` cambia el formato del manifiesto, tienen que cambiar `Warehouse` y `OrderProcessor`. El que llama conoce detalles de un servicio que ni siquiera invoca directamente.

Tres formas de arreglarlo, con sus costos:

| Estrategia | Cómo funciona | Costo |
| --- | --- | --- |
| Saltarse al intermediario | `OrderProcessor` llama directo a `Shipping` | Más domain coupling y más lógica de coordinación en `OrderProcessor` (reservar stock antes de enviar, actualizar después) |
| Esconder el detalle | `Warehouse` recibe los datos de negocio (dirección, tipo de envío) y **construye** el manifiesto internamente | Algunos cambios todavía afectan a todos, pero puedes desplegarlos por fases en vez de en lockstep |
| Tratarlo como blob opaco | `Warehouse` reenvía el manifiesto sin interpretarlo | `Warehouse` ya no cambia, pero `OrderProcessor` y `Shipping` siguen acoplados |

La segunda es casi siempre la más sana: cada servicio recibe datos **en su propio lenguaje**, y la traducción al formato de otro servicio es un detalle interno.

```ts
// Antes: OrderProcessor conoce el formato de Shipping
await warehouse.prepareDispatch({
  orderId,
  shippingManifest: { addressLines, carrierCode: "DHL-EXP", customsForm: null },
});

// Después: OrderProcessor habla el lenguaje de Warehouse
await warehouse.prepareDispatch({
  orderId,
  deliveryAddress,
  speed: "express",
}); // Warehouse construye el manifiesto para Shipping por dentro
```

#### 2.3 Common coupling

Dos o más servicios usan un **mismo conjunto de datos o recurso compartido**: una base de datos, un archivo en un bucket, una tabla de configuración, memoria compartida.

El caso más frecuente es una tabla compartida. Supón que `Warehouse` y `OrderProcessor` actualizan la columna `status` de la tabla `orders`. ¿Quién decide qué transiciones son válidas? Cada servicio podría escribir un estado inconsistente ("enviado" antes de "pagado"). La lógica de las transiciones queda repartida y nadie es dueño.

Un caso menos grave: datos de referencia de solo lectura (la lista de países), compartidos como tabla estática. El riesgo es menor porque casi no cambian, pero aun así cualquier cambio de esquema afecta a todos.

Cómo reducirlo:

- Dar un **único dueño** al estado mutable. En el ejemplo, un servicio `Order` gestiona la máquina de estados del pedido; los demás le **piden** transiciones ("marca este pedido como empaquetado") en vez de escribir la columna. El dueño puede rechazar una transición inválida.
- Para datos de referencia, copiarlos en cada servicio, exponerlos en un servicio dedicado o empaquetarlos en una librería, según qué tan seguido cambien.

```
 Antes (common coupling)                 Después (un dueño)
 ┌────────┐   ┌──────────┐               ┌────────┐ "marcar pagado" ┌─────────┐
 │Payment │   │Warehouse │               │Payment │────────────────►│  Order  │
 └───┬────┘   └────┬─────┘               └────────┘                 │ (dueño  │
     │ UPDATE      │ UPDATE              ┌──────────┐"marcar        │  de la  │
     ▼             ▼                     │Warehouse │ empaquetado"─►│máquina  │
   [ tabla orders.status ]               └──────────┘               │de estado)│
                                                                    └────┬────┘
                                                                         ▼
                                                                  [ tabla orders ]
```

Recuerda la máquina de estados: si un servicio es dueño de una entidad con ciclo de vida, también debe ser dueño de **todas** sus transiciones.

#### 2.4 Content coupling

El más grave. Un servicio entra **por detrás** en el interior de otro y cambia su estado sin pasar por su API, por ejemplo escribiendo directamente en la base de datos de `Order`. Se diferencia del common coupling en que aquí el recurso no es compartido "por diseño": es interno de otro servicio, y lo estás invadiendo.

Consecuencias: el dueño no puede cambiar su esquema, no controla sus invariantes y ni siquiera sabe qué está compartido y qué no. Se pierde toda la frontera entre interno y externo. Regla: **nunca accedas a la base de datos de otro servicio**. Si necesitas algo, pídeselo por su interfaz.

### 3. Lo justo de DDD (repaso aplicado)

En el módulo 03 estudiaste DDD. Aquí solo conectamos sus piezas con servicios:

- **Ubiquitous language.** Usa en APIs y eventos las mismas palabras que usa el negocio. Si el negocio dice "reserva" y tu endpoint dice `/allocations`, alguien va a traducir mal.
- **Aggregate.** Un grupo de objetos que se trata como unidad de consistencia, con un ciclo de vida y reglas de transición. Una regla práctica: **un aggregate pertenece a un solo servicio**. Un servicio puede gestionar varios aggregates, pero un aggregate no se reparte.
- **Referencias entre aggregates.** Cuando un aggregate de un servicio apunta a otro de otro servicio, guarda un identificador (idealmente una URI o un ID con el tipo explícito), no una copia del objeto completo.
- **Bounded context.** Una frontera explícita dentro de la cual un modelo es coherente. Esconde detalles internos y expone una interfaz. Es, por definición, information hiding. Por eso es el **punto de partida natural** para un microservicio.

```
 Bounded context "Logística"
 ┌───────────────────────────────────────────┐
 │  aggregates: Envío, Paquete, Ruta         │
 │                                           │
 │  ┌──────────────┐     ┌────────────────┐  │
 │  │ svc Envíos   │     │ svc Rutas      │  │  ← si el contexto es grande,
 │  └──────────────┘     └────────────────┘  │    puede partirse después
 └───────────────────────────────────────────┘    en varios servicios
```

Empieza con **bounded contexts grandes** como servicios iniciales (servicios gruesos). Más tarde, si un contexto crece demasiado, puedes dividirlo por los aggregates. Desde fuera, nadie debería notar la división: los consumidores siguen hablando con la misma interfaz (por ejemplo, a través de un gateway o de un servicio fachada). Esto se llama a veces "contextos anidados".

**Event Storming** es la técnica colaborativa (con post-its de colores) para descubrir eventos de dominio, comandos, aggregates y, al final, bounded contexts, junto a expertos del negocio. Es especialmente útil antes de partir un monolito porque saca a la luz el lenguaje y las fronteras reales.

### 4. Alternativas y complementos a las fronteras de dominio

DDD es la herramienta principal, pero no la única. Otros criterios sirven para **decidir qué partir** o **refinar** una frontera:

| Criterio | Idea | Cuándo ayuda | Cuidado |
| --- | --- | --- | --- |
| Volatilidad | Extraer las partes que cambian más seguido para trabajarlas con más agilidad | Si el problema es la velocidad de cambio | No ayuda si tu problema es escalar; dividir "rápido vs. lento" tipo bimodal IT simplifica de más |
| Datos | Aislar los datos sensibles (tarjetas, salud) en pocos servicios | Cumplimiento (PCI, GDPR): reduces el alcance auditado | Puede chocar con la frontera de negocio |
| Tecnología | Separar una parte que necesita un runtime distinto (ML en Python, búsqueda en un motor especial) | Requisitos técnicos realmente distintos | No partas por capas técnicas (UI/lógica/BD) |
| Organización | Alinear servicios con equipos (Conway) | Varios equipos sobre el mismo sistema | Un servicio con muchos equipos dueños es una fuente de fricción |

Las fronteras reales suelen combinar criterios. Por ejemplo, partir por dominio, y dentro del dominio de pagos aislar el manejo de tarjetas por razones de cumplimiento. Lo importante es **saber qué criterio estás aplicando y por qué**, y aceptar excepciones explícitas cuando un criterio pesa más que otro.

Un antipatrón común es la **separación por capas técnicas**: un servicio "frontend", otro "backend", otro "data access". Esto produce justo el problema de la sesión 01: cada cambio de negocio atraviesa todos los servicios.

### 5. La perspectiva del dueño (Sayfan)

El libro de Sayfan enfatiza dos ideas que completan el modelo:

- **Interfaces y contratos.** Cada servicio expone un contrato explícito (un archivo `.proto`, un esquema OpenAPI, la firma de una interfaz en el cliente) y todo lo demás es privado. El contrato es la promesa; la implementación puede cambiar.
- **Ownership.** Un servicio tiene un equipo dueño que decide sobre su API, su tecnología y su ciclo de despliegue. La propiedad clara es lo que hace posible la autonomía. Cuando nadie es dueño de algo (una tabla compartida, una librería común), aparecen la deriva y los cambios peligrosos.

También señala el trade-off **uniformidad vs. flexibilidad**: dejar que cada equipo elija tecnología da autonomía pero encarece la operación (cada stack necesita su conocimiento de logging, despliegue, seguridad). La mayoría de organizaciones fija unos pocos estándares (cómo se loguea, cómo se exponen métricas, cómo se despliega) y deja libre el interior.

### 6. Cómo evaluar una propuesta de fronteras

Cuando tengas un diagrama de servicios propuesto, recorre estas comprobaciones:

1. **Simula cambios.** Toma 5 cambios de negocio recientes o probables. ¿Cuántos servicios toca cada uno? Si la mayoría toca más de uno, revisa la cohesión.
2. **Busca estado compartido.** ¿Hay tablas o archivos escritos por más de un servicio? Asigna un dueño.
3. **Busca pass-through.** ¿Algún servicio reenvía datos que no usa?
4. **Cuenta dependencias.** ¿Algún servicio depende de cinco o más? ¿Algún ciclo A → B → A?
5. **Revisa los aggregates.** ¿Algún aggregate está partido entre servicios?
6. **Revisa el lenguaje.** ¿Los nombres de APIs y eventos son los del negocio?

### 6.1 Ejemplo trabajado: una plataforma de reservas de clínicas

Un equipo propone cinco servicios para una plataforma que permite reservar citas médicas: `Pacientes`, `Médicos`, `Agenda`, `Notificaciones` y `Facturación`. Apliquemos la lista anterior.

**Simulación de cambios.** Tomamos cuatro cambios probables:

| Cambio | Servicios que toca | Comentario |
| --- | --- | --- |
| Permitir citas por videollamada | Agenda, Notificaciones | Agenda necesita un tipo de cita nuevo; Notificaciones solo cambia una plantilla. Aceptable |
| Cobrar una multa por inasistencia | Agenda, Facturación | Agenda debe emitir un evento "inasistencia"; Facturación decide si cobra. Aceptable, domain coupling |
| Cambiar cómo se calcula la disponibilidad de un médico | Médicos, Agenda | **Sospechoso**: la disponibilidad está repartida |
| Añadir un seguro médico al perfil del paciente | Pacientes, Facturación | Facturación necesita el seguro; ¿debe pedirlo o recibirlo en un evento? |

El tercer cambio revela un problema de cohesión: `Médicos` guarda los horarios de trabajo y `Agenda` las citas ocupadas, así que "disponibilidad" es un cálculo que necesita ambas cosas. Opciones: mover los horarios de trabajo a `Agenda` (que pasa a ser dueña de todo lo que tiene que ver con tiempo) o crear un concepto "Disponibilidad" dentro de `Agenda` alimentado por eventos de `Médicos`. La primera suele ser mejor: el horario de un médico cambia junto con las reglas de reserva, no junto con su especialidad o su matrícula.

**Estado compartido.** La propuesta original tenía una tabla `appointments` leída por `Facturación` para saber qué cobrar. Eso es common coupling de lectura que se vuelve content coupling en cuanto alguien escriba. Corrección: `Agenda` publica `CitaCompletada` con los datos que `Facturación` necesita, y `Facturación` guarda su propia copia.

**Pass-through.** `Agenda` enviaba a `Notificaciones` el número de teléfono del paciente que antes pedía a `Pacientes`. Es aceptable si el teléfono forma parte del contrato del evento, pero si `Notificaciones` empieza a necesitar preferencias de canal (email o SMS), conviene que lo consulte a `Pacientes` directamente, o que `Pacientes` publique esas preferencias.

**Dependencias.** Ningún servicio depende de más de dos. No hay ciclos.

Resultado: cuatro de las seis comprobaciones pasan; las fronteras se ajustan moviendo la disponibilidad a `Agenda` y eliminando la lectura directa de tablas. Este tipo de revisión toma una hora y evita meses de cambios coordinados.

### 7. Historia de fallo

Un equipo divide su plataforma de cursos en `Users`, `Courses` y `Enrollments`, pero deja una tabla `user_course_progress` que escriben `Courses` (al publicar lecciones nuevas) y `Enrollments` (al marcar progreso). Un día `Courses` cambia la forma de numerar lecciones. El progreso de miles de alumnos queda apuntando a lecciones inexistentes, y el bug aparece en `Enrollments`, que no cambió nada. Tardan dos días en descubrir el origen porque nadie sabía que `Courses` escribía esa tabla. La solución fue dar la tabla a `Enrollments` y hacer que `Courses` publicara un evento `LessonRenumbered` para que `Enrollments` actualizara su propio estado.

### 8. Errores comunes

- Creer que "pocas llamadas entre servicios" equivale a bajo acoplamiento, cuando el acoplamiento está escondido en una base compartida.
- Repartir un aggregate (por ejemplo, "Pedido") entre dos servicios.
- Partir por sustantivos ("servicio de Usuario", "servicio de Producto") en vez de por capacidades ("Registro", "Facturación").
- Exponer el modelo interno completo en la API "por si acaso".
- Usar Event Storming una vez y no volver a revisar las fronteras cuando el negocio cambia.

## Conceptos clave

- **Cohesión**: grado en que agrupas lo que cambia por la misma razón.
- **Acoplamiento**: grado en que un cambio en un servicio obliga a cambiar otro.
- **Domain coupling**: un servicio usa una capacidad que otro ofrece; forma suelta e inevitable.
- **Temporal coupling**: dos servicios deben estar disponibles al mismo tiempo para completar una operación.
- **Pass-through coupling**: un servicio pasa datos que solo necesita otro más abajo.
- **Common coupling**: varios servicios comparten un recurso o conjunto de datos mutable.
- **Content coupling**: un servicio modifica el estado interno de otro sin pasar por su interfaz.
- **Aggregate**: unidad de consistencia con ciclo de vida, que pertenece a un único servicio.
- **Bounded context**: frontera explícita de un modelo coherente; punto de partida natural para un servicio.
- **Event Storming**: taller colaborativo para descubrir eventos, aggregates y contextos del dominio.

## Preguntas de repaso

1. Ordena los cuatro tipos de acoplamiento de más suelto a más fuerte y da un ejemplo de cada uno.
   R: Domain (Pedidos llama a Pagos para cobrar), pass-through (Pedidos manda a Almacén un manifiesto que solo usa Envíos), common (Pagos y Almacén actualizan la misma tabla de estado de pedidos) y content (Envíos escribe directamente en la base de datos interna de Pedidos).
2. ¿Por qué esconder la construcción del manifiesto dentro de Warehouse reduce el pass-through coupling aunque no elimine todos los cambios coordinados?
   R: Porque OrderProcessor deja de conocer el formato de Shipping y envía datos en el lenguaje de Warehouse. Si Shipping cambia de forma compatible, solo cambia Warehouse. Si el cambio es obligatorio, quizá todos cambien, pero ya no hace falta desplegar en lockstep: puedes hacerlo por fases.
3. ¿Cómo resuelves el common coupling cuando dos servicios escriben el estado de un pedido?
   R: Dándole un único dueño a la entidad y a toda su máquina de estados. Los demás servicios piden transiciones a través de su API o le envían eventos, y el dueño valida que cada transición sea legal.
4. ¿Por qué un bounded context es un buen punto de partida para un microservicio y por qué conviene empezar con servicios grandes?
   R: Porque un bounded context ya es una frontera de information hiding con un modelo coherente y un lenguaje propio, así que la mayoría de cambios quedan dentro. Empezar grande reduce el riesgo de equivocarse en fronteras finas; si después hace falta, se divide por aggregates sin que los consumidores lo noten.
5. Nombra dos criterios alternativos al dominio para trazar fronteras y un riesgo de cada uno.
   R: Volatilidad (extraer lo que cambia mucho), cuyo riesgo es que no ayuda si el problema es el escalado; y datos sensibles (aislar el manejo de tarjetas), cuyo riesgo es que la frontera de cumplimiento choque con la de negocio y genere más coordinación.
6. ¿Qué es el temporal coupling y cómo se reduce?
   R: Es la necesidad de que dos servicios estén disponibles a la vez para completar una operación, típica de las llamadas síncronas. Se reduce con comunicación asíncrona (mensajes o eventos), con caches de datos de otros servicios o rediseñando el flujo para no esperar respuesta.

## Ejercicio

Modela en TypeScript un fragmento con pass-through coupling y luego corrígelo. Crea `before.ts` con tres funciones que simulan servicios (`orderProcessor`, `warehouse`, `shipping`) donde `orderProcessor` construye un `ShippingManifest` y `warehouse` lo reenvía. Crea `after.ts` donde `warehouse` recibe `{ orderId, deliveryAddress, speed }` y construye el manifiesto. Después añade a `ShippingManifest` un campo obligatorio `customsDeclaration`. Criterio de terminado: en `before.ts` el compilador de TypeScript marca errores en dos "servicios"; en `after.ts` solo en `warehouse`. Escribe en un comentario cuántos archivos tocaste en cada versión.

## Explícalo con tus palabras

Explica con un ejemplo cotidiano por qué compartir una tabla entre dos servicios es más peligroso que hacer que uno llame a la API del otro.
