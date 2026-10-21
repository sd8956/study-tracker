---
title: "Integración: del requisito al código, un caso completo y el mapa del módulo"
kind: lesson
hours: 3
sources: Clean Architecture, cap. 33 "Case Study: Video Sales" (pp. 220–224) | Clean Architecture, cap. 25 y cap. 34 (pp. 174–180, 225–240) | Domain-Driven Design (Evans), cap. 17 "Bringing the Strategy Together" (pp. 339–348) | Systems Analysis and Design 9.ª ed., cap. 10, "Systems Design Completion" (pp. 507–510)
---

## Objetivo

Integrar todo el módulo en un solo razonamiento: partir de actores y casos de uso, trazar contextos y componentes, decidir dependencias, límites y despliegue, y ubicar cada patrón y principio en el nivel donde actúa (función, clase, componente, sistema), con una lista de verificación que puedas usar para revisar cualquier arquitectura real.

## Estudio

### Por qué una sesión de integración

En las 34 sesiones anteriores viste las piezas por separado: paradigmas, patrones, SOLID, componentes, análisis y modelado, DDD táctico y estratégico, Clean Architecture. En un proyecto real no aparecen por separado: aparecen todas a la vez, en una secuencia de decisiones. Esta sesión recorre esa secuencia con dos casos: el **caso de estudio de Martin** (venta de videos) y un **recorrido completo** con el sistema de la clínica veterinaria que has ido construyendo.

### Caso de estudio de Martin: venta de videos

#### El producto

Un sitio web vende videos de formación. Los **individuos** pagan un precio para verlos en streaming y otro, más alto, para descargarlos y tenerlos para siempre. Las **empresas** compran licencias solo de streaming, por lotes, con descuentos por volumen. Los individuos suelen ser a la vez compradores y espectadores; en las empresas, unas personas compran y otras ven. Los **autores** suben los videos, descripciones y material complementario (ejercicios, soluciones, código). Los **administradores** crean series, agregan y quitan videos y fijan precios para cada tipo de licencia.

#### Paso 1: actores y casos de uso

El primer paso es identificar **actores** y **casos de uso**. Hay cuatro actores principales: **espectador, comprador, autor y administrador**. Según el **SRP**, son las cuatro fuentes principales de cambio: cada característica nueva o modificada sirve a uno de ellos. Por eso conviene particionar el sistema de modo que un cambio para un actor no afecte a los otros.

```
                 ┌─────────────── Sistema de venta de videos ───────────────┐
   Espectador ───┼─▶ Ver catálogo como espectador ─┐                         │
                 │   Ver video                     ├─▷ «abstracto» Ver catálogo
   Comprador ────┼─▶ Ver catálogo como comprador ──┘                         │
                 │   Comprar video (individuo) / Comprar licencias (empresa) │
   Autor ────────┼─▶ Subir video, Editar descripción, Agregar material      │
   Administrador ┼─▶ Crear serie, Agregar/Quitar video, Fijar precios       │
                 └──────────────────────────────────────────────────────────┘
```

Martin destaca un detalle: un **caso de uso abstracto** ("Ver catálogo") del que heredan "ver catálogo como espectador" y "ver catálogo como comprador". No era estrictamente necesario, pero los dos casos son tan parecidos que decidió reconocer la similitud temprano. (Es una decisión de modelado como las de DDD: nombrar una abstracción del dominio.)

#### Paso 2: arquitectura preliminar de componentes

Con actores y casos de uso, se dibuja una **arquitectura de componentes preliminar**: las capas típicas (vistas, presentadores, interactores, controladores) **y además** partidas por actor.

```
   ┌──────────────┐ ┌───────────────┐ ┌─────────────────┐ ┌──────────────┐
   │ Vistas        │ │ Presentadores │ │ Interactores     │ │ Controladores│
   │ espectador    │ │ espectador    │ │ espectador       │ │ espectador   │
   │ comprador     │ │ comprador     │ │ comprador        │ │ comprador    │
   │ autor         │ │ autor         │ │ autor            │ │ autor        │
   │ admin         │ │ admin         │ │ admin            │ │ admin        │
   │ catálogo (abs)│ │ catálogo (abs)│ │                  │ │              │
   └──────────────┘ └───────────────┘ └─────────────────┘ └──────────────┘
        flujo de control: controladores → interactores → presentadores → vistas
        dependencias de código: hacia los interactores (la política más alta)
```

Cada recuadro es un componente potencial (un `.jar`, una DLL; en TypeScript, un paquete o una carpeta con API pública). El caso abstracto se resuelve con un componente de vista y uno de presentador de catálogo con clases abstractas, de las que heredan los componentes de cada actor.

#### Paso 3: gestión de dependencias

El flujo de control va de los controladores a los interactores, de ahí a los presentadores y a las vistas. Pero **no todas las flechas de dependencia siguen el flujo**: la mayoría apuntan en sentido contrario, porque la arquitectura sigue la **regla de dependencia**: todas cruzan los límites en una dirección, hacia los componentes con la política de más alto nivel. Las relaciones de **uso** apuntan con el flujo de control; las de **herencia/implementación** apuntan en contra. Es el **OCP** en acción: los cambios en los detalles de bajo nivel no suben hacia las políticas.

El diagrama tiene **dos dimensiones de separación**:

1. **Por actor** (SRP): separa lo que cambia por **razones distintas**.
2. **Por nivel** (regla de dependencia): separa lo que cambia a **ritmos distintos**.

#### Paso 4: decidir el despliegue (sin decidirlo del todo)

¿Desplegaría Martin todos esos componentes por separado? **Sí y no.** Separaría así el entorno de compilación y build, para poder construir y probar cada uno de forma independiente. Pero para desplegar podría **agruparlos** como convenga: cinco paquetes (vistas, presentadores, interactores, controladores, utilidades); o dos (vistas+presentadores, y el resto); o los que se necesiten. Como la estructura de código ya respeta los límites, **la forma de desplegar es una opción abierta** que se puede cambiar cuando cambien las condiciones. Es exactamente lo que viste en la sesión 30 con los modos de desacoplamiento.

### Recorrido completo: Huellitas de principio a fin

Ahora aplica la misma secuencia, pero con todas las herramientas del módulo, al sistema de la clínica (sesiones 21 y 34).

#### 1. Requisitos y actores (sesiones 16–20)

| Actor | Necesidades principales | Requisitos no funcionales relevantes |
| --- | --- | --- |
| Tutor (cliente) | Agendar citas en línea, recibir recordatorios de vacunas | Disponibilidad en temporada alta (×3 citas) |
| Recepcionista | Gestionar agenda de ambas sedes, facturar | No ve diagnósticos |
| Veterinario | Ver historial clínico, registrar consultas y vacunas | Acceso desde tablet; privacidad de datos clínicos |
| Dueña | Reportes de ingresos por sede y veterinario | Tercera sede el próximo año |
| Sistema de facturación legado | Recibir CSV diario de ventas | No se puede reemplazar todavía |

Fíjate en que cada actor es también una **fuente de cambio** (SRP) y que los requisitos no funcionales ya anticipan decisiones: escalabilidad, seguridad por rol, integración con legado por lotes.

#### 2. Lenguaje y contextos (sesiones 22, 27)

Al escuchar a la dueña aparecen palabras con significados distintos: para recepción, una **cita** es un hueco en la agenda; para el veterinario, una **consulta** es un acto clínico con diagnóstico. Son dos contextos:

```
 ┌───────────── Agenda ─────────────┐  Customer/Supplier   ┌──────── Clínica ────────┐
 │ Cita, Horario, Sede, Veterinario │ ───(U)──────(D)────▶ │ Consulta, Diagnóstico,  │
 │ (recepción, tutor en línea)      │  evento CitaAtendida │ Vacuna, PlanPreventivo  │
 └──────────────────────────────────┘                      └───────────┬─────────────┘
          │ Published Language (eventos v1)                             │ eventos VacunaAplicada
          ▼                                                             ▼
 ┌──────────── Recordatorios ───────┐                      ┌──────── Facturación ────────┐
 │ Recordatorio, Canal, Plantilla   │                      │ Venta, Ítem → ACL → CSV     │
 └──────────────────────────────────┘                      │ hacia el sistema legado     │
                                                           └─────────────────────────────┘
```

#### 3. Destilación (sesión 28)

- **Core**: Clínica, en particular el **plan preventivo** (qué vacunas y controles tocan, cuándo y por qué). Es lo que hace que los tutores vuelvan.
- **Soporte**: Agenda (reglas propias de la clínica, pero no diferenciadoras).
- **Genérico**: Recordatorios (envío de mensajes: se integra un proveedor), facturación electrónica (se mantiene el legado y luego se compra un servicio), identidad (proveedor externo).

Consecuencia: el mejor tiempo de diseño (modelo profundo, diseño flexible, Specification para "vacuna vencida") va a Clínica; la Agenda se construye limpia pero simple; lo genérico se integra con adaptadores.

#### 4. Modelo táctico (sesiones 24–26)

En Agenda: agregado `Appointment` (raíz) con `TimeSlot` como value object; la invariante "un veterinario no solapa citas" se valida en el caso de uso con el repositorio y una restricción única. En Clínica: agregado `Patient` con su historial; `VaccinationPlan` como Specification/Policy; `Money` compartido como value object en un *shared kernel* mínimo o duplicado en cada contexto (duplicación aceptable si cambian por razones distintas).

#### 5. Arquitectura de cada contexto (sesiones 30–34)

Cada contexto es un componente con estructura hexagonal: dominio y casos de uso en el centro; puertos para repositorios, reloj, notificador; adaptadores HTTP, CLI, SQLite; presentadores y ViewModels para la interfaz del veterinario; un `main` por entorno.

#### 6. Despliegue: una opción abierta (sesión 30)

Hoy: **un solo proceso** (monolito modular) con cuatro componentes y reglas automáticas de dependencias. Si en temporada alta la agenda en línea necesita escalar sola, el componente Agenda puede pasar a ser un servicio, porque ya se comunica con los demás por eventos e interfaces. Si no hace falta, se queda como está. **La estructura del código no obliga a decidirlo ahora.**

#### 7. Patrones donde aparecen (sesiones 3–10)

| Necesidad concreta | Patrón |
| --- | --- |
| Integrar el sistema de facturación legado sin contaminar el modelo | Adapter + Facade (capa anticorrupción) |
| Elegir canal de recordatorio (WhatsApp, correo) | Strategy / puerto con varios adaptadores |
| Reaccionar a "vacuna aplicada" programando el próximo recordatorio | Observer (eventos de dominio) |
| Ciclo de vida de una cita | State (máquina de estados) |
| Reintentos y timeouts al proveedor de mensajes | Decorator |
| Construir datos de prueba legibles | Builder (test data builder) |
| Elegir implementaciones por entorno | Abstract Factory / composition root (Main) |
| Reglas de elegibilidad combinables | Composite + Specification |

### El mapa del módulo: los mismos principios a distintas escalas

Una de las ideas más potentes del módulo es que **los principios se repiten a cada escala**, con nombres distintos:

| Idea | Función / clase | Componente | Sistema / contextos |
| --- | --- | --- | --- |
| Separar lo que cambia por razones distintas | SRP | CCP | Bounded contexts; corte por actores y casos de uso |
| No depender de lo que no usas | ISP | CRP | Context map: conformista vs. ACL; no compartir modelos innecesarios |
| Depender de lo estable y abstracto | DIP | SDP + SAP | Regla de dependencia; núcleo en el centro |
| Extender sin modificar | OCP, Strategy, Decorator | Componentes plugin | Arquitectura de plugins; nuevos adaptadores |
| Sustituibilidad | LSP | Contratos de componentes | Open host service + published language; suites de contrato |
| Sin ciclos | Evitar imports circulares | ADP | Contextos con relaciones upstream/downstream claras |
| Ocultar los detalles | Encapsulamiento | API pública del componente | Límites arquitectónicos; humble objects |
| Nombrar con el negocio | Interfaces que revelan intención | Módulos con nombres del dominio | Lenguaje ubicuo; Screaming Architecture |

Si entiendes esta tabla, entiendes el módulo: **separar por razones de cambio, depender de lo estable y nombrar con el lenguaje del negocio**, a cada nivel.

### Lista de verificación para revisar una arquitectura

Úsala con cualquier proyecto (incluido el tuyo):

**Propósito y lenguaje**

- ¿La estructura de carpetas grita el dominio y los casos de uso, o el framework?
- ¿Existe un glosario y los nombres del código coinciden con él?
- ¿Se sabe cuál es el core y dónde está?

**Dependencias**

- ¿El dominio importa algo de infraestructura, frameworks o del entorno (`process.env`, `Date.now()` directo)?
- ¿Hay ciclos entre módulos?
- ¿Hay una regla automática (lint, test de arquitectura) que lo verifique?

**Límites**

- ¿La base de datos, la web y los proveedores externos están detrás de puertos definidos por la aplicación?
- ¿Por los límites viajan estructuras simples o tipos del framework y del ORM?
- ¿Hay capas anticorrupción para los sistemas ajenos o legados?

**Modelo**

- ¿Las entidades tienen comportamiento o son bolsas de datos con servicios gordos (modelo anémico)?
- ¿Los agregados son pequeños y protegen invariantes reales?
- ¿Los conceptos importantes del negocio tienen nombre propio (políticas, especificaciones) o están escondidos en condicionales?

**Testabilidad**

- ¿Las reglas de negocio se prueban sin base de datos ni servidor?
- ¿Los tests se escriben contra comportamientos o contra la estructura interna?
- ¿Las implementaciones de un mismo puerto comparten una suite de contrato?

**Evolución**

- ¿Puedes cambiar de base de datos o de mecanismo de entrega tocando solo adaptadores y `main`?
- ¿La forma de desplegar (monolito o servicios) es una decisión abierta?
- ¿Hay registros de las decisiones importantes (ADR) con su contexto?

### Cuándo **no** hacer todo esto

Tan importante como saber aplicar estas ideas es saber cuándo no hace falta. Martin aclara que no aplicaría Clean Architecture a un programa de 200 líneas como Hunt the Wumpus; Evans dice que Smart UI puede ser la mejor opción para aplicaciones simples. Algunas guías:

| Situación | Enfoque razonable |
| --- | --- |
| Script, prototipo descartable, prueba de concepto de una semana | Lo más simple que funcione. Sin capas. |
| CRUD interno con pocas reglas | Capas ligeras; quizás Smart UI o un framework con todas sus convenciones. |
| Producto con reglas de negocio que crecen y varios desarrolladores | Núcleo aislado, puertos para infraestructura, tests de casos de uso. |
| Dominio complejo, varios equipos, años de vida | DDD estratégico y táctico, contextos, Clean Architecture, reglas automáticas. |

Y la regla de oro de la sesión 32: implementa los límites **en el punto de inflexión**, cuando la fricción empieza a costar más que construirlos. Observa, mide y decide; no construyas catedrales para un kiosco, pero no construyas un kiosco donde vas a necesitar una catedral.

### Cerrar el diseño: la especificación del sistema

Shelly y Rosenblatt cierran la fase de diseño con una **especificación de diseño del sistema** que se revisa con los usuarios y la dirección antes de construir: resumen, componentes, entorno, requisitos de implementación, costos y calendario. En un equipo moderno, el equivalente ligero es:

- Un **README de arquitectura** de una o dos páginas con el diagrama de contextos y el diagrama hexagonal de cada uno.
- Un **glosario** por contexto.
- Una carpeta de **ADR** con las decisiones importantes.
- Las **reglas automáticas** de dependencias, que son documentación ejecutable.

Y, como dicen tanto Evans como Martin, quien escribe esto **sigue programando**: la arquitectura no se entrega en un documento, se mantiene en cada commit.

### Analogía de construcción

Este módulo te llevó por todo el proceso de un estudio de arquitectura: la **entrevista con la familia** (requisitos), los **planos de instalaciones** (DFD), los **planos arquitectónicos** (UML, ERD), el **vocabulario común de la obra** (lenguaje ubicuo), la **división en edificios con funciones distintas** (bounded contexts), la decisión de **dónde invertir en acabados de lujo y dónde usar soluciones estándar** (core vs. genérico), la **estructura que separa lo permanente de lo cambiante** (Clean Architecture) y los **componentes prefabricados con nombre** (patrones). Un buen arquitecto no aplica todas las técnicas a una caseta de jardín, pero sabe cuándo el proyecto ha crecido lo suficiente como para necesitarlas.

### Errores comunes en la integración

- **Empezar por la tecnología** ("usaremos microservicios con Kafka") en lugar de por actores, casos de uso y lenguaje.
- **Aplicar todas las técnicas por igual** en vez de concentrarlas en el core.
- **Diagramas que no coinciden con el código** porque no hay reglas automáticas.
- **Decidir el despliegue demasiado pronto** y quedar atado a él.
- **Confundir los niveles**: discutir un ADP cuando el problema es un SRP en una clase, o viceversa.
- **Olvidar la evolución**: tratar el diseño como terminado en lugar de revisarlo cuando aparece la fricción.

### Resumen

El caso de venta de videos muestra la secuencia: identificar actores (fuentes de cambio por SRP) y casos de uso, partir los componentes por actor y por nivel, orientar las dependencias hacia las políticas de más alto nivel (regla de dependencia, OCP) y dejar abierta la forma de desplegar. El recorrido de Huellitas integra requisitos, lenguaje, contextos, destilación, modelo táctico, arquitectura hexagonal y patrones en un mismo razonamiento. Los principios se repiten a cada escala (SRP/CCP/contextos, ISP/CRP, DIP/SDP+SAP/regla de dependencia), y una lista de verificación permite revisar cualquier arquitectura real, recordando que la cantidad de estructura debe ser proporcional al problema y que los límites se implementan en el punto de inflexión.

## Conceptos clave

- **Actor como fuente de cambio**: cada actor del sistema es una razón distinta para cambiarlo, base para particionar componentes (SRP).
- **Caso de uso abstracto**: caso que fija una política general que otros casos especializan.
- **Dos dimensiones de separación**: por actor (razones de cambio) y por nivel (ritmos de cambio).
- **Despliegue como opción abierta**: estructura de código que permite agrupar componentes en desplegables de distintas formas.
- **Principios fractales**: las mismas ideas (separar por razones de cambio, depender de lo estable, nombrar con el dominio) aplicadas a funciones, clases, componentes y sistemas.
- **Documentación ejecutable**: reglas automáticas (tests de arquitectura, lint) que verifican el diseño.

## Preguntas de repaso

1. ¿Por qué Martin empieza el caso de venta de videos identificando actores?
   R: Porque, según el SRP, cada actor es una fuente distinta de cambio; particionar el sistema por actor hace que un cambio pedido por uno no afecte a los demás.
2. ¿Cuáles son las dos dimensiones de separación del diagrama de componentes y qué separa cada una?
   R: La separación por actor, que divide lo que cambia por razones distintas, y la separación por nivel según la regla de dependencia, que divide lo que cambia a ritmos distintos (políticas de alto nivel frente a detalles).
3. ¿Por qué en el diagrama muchas flechas de dependencia van en contra del flujo de control?
   R: Porque se usa inversión de dependencias: las relaciones de uso siguen el flujo de control, pero las de herencia o implementación apuntan en sentido contrario, de modo que todas las dependencias cruzan los límites hacia las políticas de más alto nivel (OCP y regla de dependencia).
4. ¿Qué significa que la forma de desplegar sea una opción abierta?
   R: Que, como el código ya está separado en componentes que respetan los límites, se pueden agrupar en distintos desplegables (muchos, pocos o uno) y cambiar esa agrupación cuando cambien las condiciones, sin reestructurar el código.
5. Relaciona SRP, CCP y bounded context.
   R: Son la misma idea a distintas escalas: separar lo que cambia por razones distintas. El SRP lo aplica a clases y módulos (un actor por módulo), el CCP a componentes (lo que cambia junto va junto) y los bounded contexts a modelos completos del sistema.
6. ¿Cuándo no conviene aplicar Clean Architecture o DDD completos?
   R: En scripts, prototipos descartables, programas muy pequeños o CRUD simples con pocas reglas, donde la estructura cuesta más de lo que aporta. Se aplican cuando las reglas de negocio crecen, hay varios desarrolladores o equipos y el sistema vivirá años, implementando los límites en el punto de inflexión.
7. Menciona cuatro preguntas de la lista de verificación de arquitectura y qué detectan.
   R: Si la estructura grita el dominio o el framework (Screaming Architecture); si el dominio importa infraestructura (regla de dependencia); si por los límites viajan tipos del framework u ORM (límites contaminados); si las reglas se prueban sin base de datos ni servidor (testabilidad). También: ciclos entre módulos, modelo anémico y existencia de ADR.

## Ejercicio

Haz una **revisión de arquitectura** de un proyecto real: la app de este plan de estudio (este mismo repositorio) o un proyecto tuyo. Entrega un documento `revision-arquitectura.md` con: (a) actores y casos de uso principales; (b) el mapa de componentes actual en ASCII con la dirección de las dependencias (búscalas con `grep` de los `import`); (c) la lista de verificación de esta sesión respondida punto por punto con evidencia (archivo y línea); (d) las tres violaciones o riesgos más importantes, cada una con el principio afectado y una propuesta de mejora concreta; (e) un ADR con la decisión que tomarías primero. Como prueba práctica, implementa un test de arquitectura (como el de la sesión 34) que verifique al menos una regla de dependencia del proyecto. **Terminado cuando:** cada respuesta de la lista tiene evidencia concreta, las tres propuestas nombran el principio y el patrón que aplicarían, el ADR tiene contexto, opciones, decisión y consecuencias, y el test de arquitectura corre (en verde si la regla se cumple, o documentando la violación encontrada).

## Explícalo con tus palabras

Explica en cinco minutos, sin diapositivas, cómo pasarías de una conversación con un cliente a la estructura de carpetas de un proyecto, mencionando en qué momento usas cada herramienta del módulo.
