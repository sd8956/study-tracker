---
title: "DDD V: diseño estratégico, bounded contexts, context map y destilación del core domain"
kind: lesson
hours: 3
sources: Domain-Driven Design (Evans), parte IV, introducción y cap. 14 "Maintaining Model Integrity" (pp. 233–278) | Domain-Driven Design (Evans), cap. 15 "Distillation" (pp. 279–306) | Domain-Driven Design (Evans), caps. 16 "Large-Scale Structure" y 17 "Bringing the Strategy Together" (pp. 307–348)
links: Martin Fowler, "Bounded Context" | https://martinfowler.com/bliki/BoundedContext.html ; Context Mapper | https://contextmapper.org/ ; Vlad Khononov, "Learning Domain-Driven Design" (subdominios core, de soporte y genéricos) | https://www.oreilly.com/library/view/learning-domain-driven-design/9781098100124/
---

## Objetivo

Aprender las tres herramientas del diseño estratégico de DDD: dividir un sistema grande en **bounded contexts** donde cada modelo es consistente y dibujar el **context map** con sus relaciones (shared kernel, cliente/proveedor, conformista, capa anticorrupción, caminos separados, open host service, lenguaje publicado); **destilar** el modelo para concentrar el esfuerzo en el **core domain**; y conocer lo esencial de la **estructura a gran escala**.

## Estudio

### El problema de escalar un modelo

El modelo completo de casi cualquier organización es **demasiado grande** para manejarlo como una unidad. Hay dos extremos malos: un **modelo monolítico** que lo abarca todo, lleno de duplicaciones sutiles y contradicciones, y **subsistemas pegados con interfaces improvisadas**, con problemas de consistencia en cada punto de integración.

El diseño estratégico ofrece tres herramientas: **bounded contexts**, **destilación** y **estructura a gran escala**. Evans dice que el bounded context, aunque es el menos obvio, es el **más fundamental**.

### Una historia: el objeto "Charge"

En un proyecto con varios equipos, el de facturación a clientes iba a crear un objeto `Charge` y descubrió que otro equipo ya tenía uno. Decidieron **reutilizarlo**: le agregaron un campo, renombraron "monto contabilizado" a "monto adeudado" ("¿qué importa un nombre?") y sumaron métodos. Días después, el módulo de pago a proveedores, para el que se había escrito `Charge`, empezó a mostrar cargos que nadie había creado. Para un equipo, un `Charge` era algo que el cliente debía pagar; para el otro, un pago que la empresa debía a un proveedor. **Mismo nombre, dos conceptos.** Al unificarlos se rompieron ambos.

La lección: en un sistema grande coexisten **varios modelos**, y mezclar código basado en modelos distintos produce software defectuoso y difícil de entender.

### Bounded Context

Un modelo solo es válido **dentro de un contexto**. Un **bounded context** lo delimita explícitamente: en qué equipo, en qué parte de la aplicación y en qué código y esquemas aplica un modelo. **Dentro** del límite, el modelo es estrictamente consistente y el lenguaje ubicuo tiene un significado preciso; **fuera**, no te confunden los problemas de otros modelos.

```
┌──────── Contexto: Ventas ────────┐   ┌────── Contexto: Soporte ───────┐
│ Cliente = alguien que puede      │   │ Cliente = titular de tickets,  │
│ comprar: segmento, límite de     │   │ historial de incidencias, SLA. │
│ crédito, vendedor asignado.      │   │ Producto = algo que puede      │
│ Producto = ítem con precio.      │   │ fallar: versión, garantía.     │
└──────────────────────────────────┘   └────────────────────────────────┘
     mismo término, modelos distintos: está bien si los límites son explícitos
```

No lo confundas con otras dos ideas. Un **módulo** organiza elementos **dentro** de un mismo modelo; un contexto puede tener muchos módulos. Un **subdominio** es una parte del **problema** (un área del negocio); un contexto es una parte de la **solución**. Idealmente se alinean, pero no siempre.

Dos síntomas de que dentro de un supuesto contexto hay dos modelos mezclados: **conceptos duplicados** (dos representaciones del mismo concepto que hay que cambiar a la vez) y **falsos cognados** (dos personas usan el mismo término pensando en cosas distintas, como `Charge`). Los segundos son más peligrosos, porque nadie nota el malentendido hasta que aparecen los errores.

Dentro de un contexto, la defensa contra la fragmentación es la **integración continua** en sentido amplio: integrar el **código** con frecuencia, con builds y tests automatizados, e integrar los **conceptos** hablando constantemente el lenguaje ubicuo. Su costo crece con el tamaño del equipo, y esa es una razón más para dividir en varios contextos.

### Context Map

Un **context map** describe los contextos que existen y las **relaciones** entre ellos:

- Identifica cada modelo en juego, incluidos los implícitos de sistemas legados o comprados.
- Nombra cada contexto e incorpora el nombre al lenguaje ubicuo.
- Describe los **puntos de contacto** y la **traducción** en cada uno, y cúbrelos con tests: los límites son especialmente propensos a errores.
- **Mapea el terreno existente, no el ideal.** Primero lo que hay; después decides qué cambiar.

Para leer las relaciones necesitas dos conceptos: el contexto **upstream** (aguas arriba) es aquel cuyas decisiones afectan al otro; el **downstream** (aguas abajo) depende de él y recibe el impacto de sus cambios.

### Relaciones entre contextos

| Patrón | Qué es | Cuándo | Costo |
| --- | --- | --- | --- |
| **Shared Kernel** | Dos equipos comparten un subconjunto pequeño del modelo y su código; nadie lo cambia sin consultar al otro. | Equipos muy cercanos, mucha integración. | Coordinación constante; acoplamiento. Mantenlo pequeño. |
| **Customer/Supplier** | El downstream actúa como cliente en la planificación del upstream; juntos escriben **tests de aceptación** que el upstream ejecuta en su suite. | Upstream dispuesto a atenderte (misma gerencia u objetivos compartidos). | Negociación y tests compartidos. |
| **Conformist** | El downstream adopta el modelo upstream tal cual, sin traducción. | Upstream que no va a cambiar por ti, con un modelo aceptable. | Renuncias a tu propio modelo en esa parte. |
| **Anticorruption Layer** | Capa que ofrece la funcionalidad del otro sistema **en términos de tu modelo** y traduce en ambas direcciones. | Upstream con modelo malo, ajeno o legado. | Una capa que construir y mantener. |
| **Separate Ways** | Sin conexión: cada contexto resuelve lo suyo. | No hay relación significativa. | Duplicar algo de funcionalidad. |
| **Open Host Service** | Un protocolo abierto y documentado para que cualquiera se integre. | Muchos consumidores. | Diseñar, versionar y documentar el protocolo. |
| **Published Language** | Un lenguaje de intercambio bien documentado (estándar del sector o esquema de eventos versionado). | El modelo interno no sirve como formato de intercambio. | Mantener y traducir desde y hacia el lenguaje. |

El cliente/proveedor resuelve un problema concreto: sin acuerdo, el upstream se paraliza por miedo a romper al downstream, o el downstream queda a merced de las prioridades ajenas. Los tests de aceptación compartidos permiten que el upstream cambie con confianza. El open host service lo reconoces hoy como una **API pública bien diseñada** (REST, gRPC, eventos) con versiones y documentación, y suele ir con un lenguaje publicado (FHIR en salud, el formato de facturación electrónica del país, JSON Schema o Protobuf para eventos).

#### La capa anticorrupción en código

Se construye con piezas que ya conoces: una **Facade** que simplifica el acceso al otro sistema, un **Adapter** que convierte su interfaz y **traductores** que convierten datos y errores de un modelo al otro.

```ts
// Modelo de NUESTRO contexto (clínica)
export interface Invoice { id: string; patientName: string; lines: { concept: string; amount: number }[] }
export interface InvoicingPort { issue(invoice: Invoice): Promise<{ legalNumber: string }> }

// Modelo AJENO: facturación legada (formato y vocabulario propios)
interface LegacyBillingApi {
  crearDocumento(doc: { TIPO: "FV"; TERCERO: string; ITEMS: { DESC: string; VLR: string }[] }):
    Promise<{ COD_RTA: "00" | "99"; CONSEC?: string; MSJ?: string }>;
}

// Capa anticorrupción: facade + adapter + translator
export class LegacyBillingAcl implements InvoicingPort {
  constructor(private readonly legacy: LegacyBillingApi) {}
  async issue(invoice: Invoice) {
    const res = await this.legacy.crearDocumento(this.toLegacy(invoice));
    if (res.COD_RTA !== "00" || !res.CONSEC) throw new Error(`Facturación rechazada: ${res.MSJ ?? "sin mensaje"}`);
    return { legalNumber: res.CONSEC };                      // de vuelta a nuestro idioma
  }
  private toLegacy(i: Invoice) {
    return {
      TIPO: "FV" as const,
      TERCERO: i.patientName.toUpperCase().slice(0, 60),     // reglas de formato del legado
      ITEMS: i.lines.map((l) => ({ DESC: l.concept.slice(0, 40), VLR: l.amount.toFixed(2) })),
    };
  }
}
```

Es cara, pero protege la integridad de tu modelo, que es tu activo principal, y es la herramienta clave para **retirar un legado gradualmente**: reemplazas funcionalidad pieza a pieza detrás de la capa hasta que el legado deja de usarse.

#### Un context map de ejemplo

```
Clínica veterinaria

 ┌──────────┐  Customer/Supplier   ┌───────────┐     ACL      ┌────────────────────┐
 │ Agenda   │ ───────(U)────(D)──▶ │ Clínica   │ ──(D)──(U)── │ Facturación legada │
 │ (citas)  │                      │ (historia │              │ (sistema externo)  │
 └──────────┘                      │  médica)  │              └────────────────────┘
      │ Published Language          └───────────┘
      │ (eventos CitaAgendada v1)        │ Conformist
      ▼                                  ▼
 ┌──────────────┐                 ┌──────────────┐
 │ Recordatorios│                 │ Pasarela de  │ (upstream: proveedor externo)
 └──────────────┘                 │ mensajería   │
                                  └──────────────┘
```

Para dibujar tu primer mapa de un sistema que ya existe: lista equipos y sistemas (incluidos comprados y legados); anota para cada uno tres o cuatro términos clave y qué significan **para ellos**; traza un límite donde un término cambie de significado; para cada par que se comunica, pregunta quién se adapta a quién y si hay traducción; y marca las relaciones que hoy duelen. El mapa suele salir más desordenado de lo esperado, y eso es lo valioso.

El mapa evoluciona: los contextos se **fusionan** cuando la separación genera demasiada duplicación, un legado se retira detrás de una ACL y un open host service se apoya en un lenguaje publicado cuando aparecen más consumidores.

#### Bounded contexts y microservicios

La relación es estrecha, pero no es igualdad: **un bounded context es un límite de modelo**; un microservicio es una **unidad de despliegue**. Un contexto puede desplegarse como un servicio, como varios o como un módulo de un **monolito modular** (paquetes separados, sin imports cruzados, comunicación por interfaces o eventos), que a menudo es el camino más seguro hacia los microservicios cuando hagan falta. Lo verás en el módulo 06.

### Destilación: separar la esencia

**Destilar** es separar los componentes de una mezcla para extraer la esencia. En un modelo grande, gran parte del esfuerzo se va a cuestiones periféricas y lo que hace especial al sistema queda enterrado. La destilación hace prominente lo que más valor agrega, y sirve para comunicar el diseño, guiar la refactorización, enfocar el trabajo y decidir **qué comprar, qué subcontratar y a quién asignar**.

#### Core Domain

Los mejores desarrolladores tienden a gravitar hacia la infraestructura técnica y los problemas genéricos, porque son interesantes y transferibles, mientras que el conocimiento especializado del negocio parece menos atractivo. Resultado: el núcleo del negocio lo construyen los menos experimentados. La recomendación de Evans:

- Encuentra el **core domain** y haz que se distinga fácilmente del resto del modelo.
- **Hazlo pequeño.**
- Pon en él a **tus mejores talentos** e invierte ahí el modelado más profundo y el diseño flexible.
- Justifica la inversión en las demás partes por cuánto **apoyan** al core.

¿Cuál es tu core? La pregunta clave: ¿qué hace que este sistema valga la pena escribirlo en lugar de comprarlo? **El core de una aplicación puede ser el componente genérico de otra**: para una naviera, el enrutamiento de cargas es el core; para un proveedor de software de logística, quizás lo sea el motor de optimización. El core **no se compra** (si se pudiera comprar, no te distinguiría) y **no se subcontrata** ni se asigna a temporales: el equipo necesita acumular conocimiento, y un miembro temporal es "un agujero en el balde".

Una prueba rápida: pregúntale a alguien del negocio "si tuviéramos que comprar todo el software hecho excepto una parte, ¿cuál construiríamos?". Si dice "ninguna", quizás todo sea genérico; si dice "todas", todavía no has destilado.

#### Las tres clases de subdominios

| Tipo | Qué es | Estrategia | Ejemplo (clínica veterinaria) |
| --- | --- | --- | --- |
| **Core** | Lo que diferencia al negocio. | Construir en casa, con los mejores, con DDD a fondo. | Planes de salud preventiva y seguimiento clínico. |
| **De soporte** | Específico del negocio pero no diferenciador. | Construir de forma simple; se puede delegar. | Agenda de citas con las reglas de la clínica. |
| **Genérico** | Problema resuelto en general. | Comprar, usar un estándar u open source, subcontratar. | Facturación electrónica, autenticación, mensajería. |

Para un subdominio genérico tienes cuatro opciones: una **solución comprada** (menos código, pero hay que aprenderla e integrarla y te ata al proveedor), un **modelo publicado** o estándar (maduro, aunque quizá más complejo de lo que necesitas), una **implementación subcontratada** (el equipo se concentra en el core, a cambio de especificar e integrar con cuidado) o una **implementación propia** (encaja exacto, pero pagas por construir algo que no te diferencia). Ojo: los genéricos son tentadores porque son "limpios" y técnicamente interesantes. No busques el modelo perfecto de zonas horarias si tu negocio es veterinario.

#### Técnicas de destilación, de menor a mayor esfuerzo

1. **Domain Vision Statement.** Una página (o menos) sobre el core y el valor que aporta, ignorando lo que no lo distingue. Prueba: si cambiando solo el nombre de la empresa sirviera para cualquier competidor, todavía no describe tu core.

   ```markdown
   **Visión del dominio: Huellitas**
   El sistema permite a la clínica anticiparse a la salud de cada mascota: a partir de su
   especie, edad, historial y vacunas, propone y agenda el plan preventivo adecuado y avisa
   al tutor en el momento justo. Lo distintivo no es la agenda ni la facturación (se resuelven
   con herramientas estándar), sino el modelo de **plan preventivo**.
   ```

2. **Highlighted Core.** Hacer visible el core sin cambiar el diseño: un documento de destilación breve o **marcas** en el código y el repositorio que digan qué está dentro y qué fuera.
3. **Cohesive Mechanisms.** Separar los algoritmos complicados (el "cómo") en un módulo propio con una **interfaz que revele la intención**, para que el core exprese el **qué**.
4. **Segregated Core.** Refactorizar para llevar los conceptos del core a su propio módulo, aunque cueste reubicar responsabilidades.
5. **Abstract Core.** Llevar los conceptos más fundamentales a interfaces en un módulo propio, con las implementaciones en los subdominios: el SAP de la sesión 14 aplicado al modelo.

```ts
// Mecanismo cohesivo genérico: no sabe nada de veterinaria
export function nextOccurrence(lastDate: Date, intervalDays: number, today: Date): Date {
  const next = new Date(lastDate.getTime() + intervalDays * 86_400_000);
  return next < today ? today : next;
}

// Core: expresa el QUÉ con el lenguaje del dominio
export class PreventivePlan {
  constructor(private readonly protocol: { vaccine: string; boosterEveryDays: number }[]) {}
  dueVaccinations(history: { vaccine: string; appliedOn: Date }[], today: Date) {
    return this.protocol.map((p) => {
      const last = history.filter((h) => h.vaccine === p.vaccine)
                          .sort((a, b) => b.appliedOn.getTime() - a.appliedOn.getTime())[0];
      return { vaccine: p.vaccine,
               dueOn: last ? nextOccurrence(last.appliedOn, p.boosterEveryDays, today) : today };
    });
  }
}
```

No confundas un **subdominio genérico** (una parte del **modelo** que no es central, como la contabilidad) con un **mecanismo cohesivo** (una pieza de **cálculo** que encapsula complejidad algorítmica). Y cuando haya que priorizar mejoras, **empieza por el core**: un diseño de soporte feo es tolerable; un core confuso limita todo el proyecto.

### Estructura a gran escala

Incluso con contextos y módulos bien definidos, un modelo grande puede ser incomprensible en conjunto. Evans relata un simulador de comunicaciones satelitales con tantos módulos que nadie sabía dónde buscar ni dónde poner una clase nueva. La solución fue imponer **capas** que correspondían a aspectos del sistema simulado; los módulos se redefinieron para no atravesarlas. La estructura no era un módulo: era **un conjunto de reglas** sobre los límites y relaciones de cualquier elemento del diseño.

| Patrón | Idea | Cuándo |
| --- | --- | --- |
| **Evolving Order** | La estructura evoluciona con la aplicación; ni rígida antes de tiempo ni ausente. | Siempre: es la actitud de base. |
| **System Metaphor** | Una analogía concreta que guíe al equipo ("es como una línea de ensamblaje"). | Cuando surge sola; no la fuerces. |
| **Responsibility Layers** | Capas **del dominio** por responsabilidad amplia (potencial, operaciones, compromisos, políticas, soporte a decisiones), con dependencias hacia abajo. | Dominios grandes con objetos de naturalezas distintas. |
| **Knowledge Level** | Objetos que describen cómo debe comportarse otro grupo; las reglas se configuran como datos. | Usuarios que configuran tipos y reglas sin programar (tipos de póliza, roles). |
| **Pluggable Component Framework** | Un núcleo abstracto con interfaces para enchufar implementaciones. | Modelos maduros y destilados; rara vez al principio. |

Las capas de responsabilidad son capas **del modelo de dominio**, no las capas técnicas de la sesión 22: ayudan a decidir dónde va un concepto nuevo y qué puede depender de qué. La estructura debe ser **mínima** y refactorizarse cuando deje de encajar.

### Unir la estrategia

Contextos, destilación y estructura se complementan: una estructura puede vivir dentro de un contexto u organizar el context map entero, y la destilación indica dónde invertir dentro de cada contexto. Evans sugiere **evaluar primero** (dibujar el mapa actual, identificar core y genéricos, revisar el lenguaje) y advierte sobre **quién decide**: la estrategia no la impone un arquitecto aislado; funciona cuando surge del equipo o cuando los arquitectos trabajan **dentro** de los equipos, con decisiones que llegan al código, absorben retroalimentación y no le quitan al core sus mejores personas.

### Analogía de construcción

En una obra grande, el plano estructural, el eléctrico y el de paisajismo usan "nivel" con significados distintos, y no pasa nada mientras cada equipo sepa en qué plano está: cada plano es un **bounded context**, y el plano de coordinación que muestra dónde se tocan es el **context map**. La **capa anticorrupción** es la junta de dilatación entre un edificio nuevo y uno antiguo. Y en un hospital, el **core** es el quirófano (los mejores especialistas, el mejor diseño), la agenda de consultas es **de soporte**, y la lavandería y el estacionamiento son **genéricos**: se contratan. La organización por plantas y alas es la **estructura a gran escala** que te dice dónde buscar algo nuevo.

### Errores comunes

- **Un modelo único para toda la empresa** ("el `Cliente` canónico"), lleno de campos opcionales y contradicciones.
- **Reutilizar una clase de otro contexto porque tiene el mismo nombre** (el caso `Charge`).
- **Dibujar el mapa ideal en lugar del real.**
- **Conformarse sin darse cuenta**: el modelo de un proveedor se filtra por todo el código sin traducción.
- **Confundir bounded context con microservicio.**
- **No saber cuál es el core** e invertir más en lo genérico porque es más interesante.
- **Subcontratar el core** o construir en casa genéricos que se compran resueltos.
- **Core enorme**: si todo es core, nada lo es.
- **Imponer una estructura a gran escala rígida** desde el principio.

### Resumen

En sistemas grandes conviven varios modelos, y mezclarlos rompe el software. Un bounded context delimita dónde aplica cada modelo, con integración continua de código y conceptos dentro. El context map describe los contextos reales y sus relaciones: shared kernel, cliente/proveedor (con tests de aceptación), conformista, capa anticorrupción (facade, adapter y traductores), caminos separados, open host service y lenguaje publicado; los contextos son límites de modelo, no unidades de despliegue. La destilación separa el core domain, donde van los mejores y el modelo más profundo, de los subdominios de soporte y genéricos, con técnicas que van de la declaración de visión al núcleo abstracto. La estructura a gran escala da un lenguaje para entender el sistema completo y debe ser mínima y evolutiva.

## Conceptos clave

- **Bounded context**: límite explícito dentro del cual un modelo y su lenguaje son consistentes.
- **Falso cognado**: término que dos partes usan creyendo que significa lo mismo cuando no es así.
- **Context map**: descripción de los contextos existentes, sus relaciones y sus traducciones.
- **Upstream / downstream**: contexto cuyos cambios afectan a otro / contexto que depende del otro.
- **Capa anticorrupción**: capa de traducción que protege un modelo del modelo de otro sistema.
- **Open host service y published language**: protocolo abierto para muchos consumidores y lenguaje común documentado para el intercambio.
- **Core domain**: parte del modelo que diferencia al negocio y concentra el mayor valor.
- **Subdominio de soporte / genérico**: específico pero no diferenciador / resuelto en general, candidato a comprar.
- **Mecanismo cohesivo**: algoritmo complejo separado del core detrás de una interfaz que revela la intención.
- **Estructura a gran escala**: reglas o conceptos de alto nivel que organizan todo el diseño.

## Preguntas de repaso

1. ¿Qué enseña la historia del objeto `Charge`?
   R: Que un mismo nombre puede referirse a conceptos distintos en partes diferentes de un sistema; al unificarlos por reutilizar, ambos módulos se rompieron. En sistemas grandes coexisten varios modelos y hay que delimitar explícitamente dónde aplica cada uno.
2. ¿Qué diferencia hay entre un bounded context y un módulo?
   R: El módulo organiza elementos dentro de un mismo modelo; el bounded context delimita dónde aplica un modelo y lo separa de otros modelos. Un contexto puede contener muchos módulos.
3. ¿Cuándo elegirías conformista y cuándo capa anticorrupción?
   R: Conformista cuando el upstream no va a adaptarse a ti pero su modelo es razonablemente bueno, y quieres simplificar la integración renunciando a un modelo propio en esa parte. Capa anticorrupción cuando el modelo upstream es malo, ajeno o legado y adoptarlo contaminaría tu modelo.
4. ¿Con qué patrones se construye una capa anticorrupción?
   R: Con una fachada que simplifica el acceso al otro sistema, adaptadores que convierten su interfaz y traductores que transforman objetos, datos y errores entre ambos modelos, exponiendo los servicios en el lenguaje del propio contexto.
5. ¿Un bounded context es lo mismo que un microservicio?
   R: No. El contexto es un límite de modelo y el microservicio una unidad de despliegue. Un contexto puede desplegarse como uno o varios servicios o como un módulo de un monolito modular.
6. ¿Por qué el core domain tiende a quedar descuidado y qué recomienda Evans?
   R: Porque los mejores desarrolladores suelen preferir la infraestructura técnica y los problemas genéricos, que son interesantes y transferibles. Evans recomienda identificar un core pequeño, hacerlo visible, asignarle los mejores talentos e invertir en él el modelado más profundo, sin comprarlo ni subcontratarlo.
7. Distingue subdominio genérico y mecanismo cohesivo.
   R: El subdominio genérico es una parte del modelo que no es central para el negocio (como la contabilidad o las zonas horarias). El mecanismo cohesivo es una pieza de cálculo algorítmico compleja (como recorrer un grafo) que se separa del core para que este exprese el qué y delegue el cómo.
8. Ordena las técnicas de destilación de menor a mayor esfuerzo.
   R: Declaración de visión del dominio, núcleo resaltado (documento de destilación o marcas), mecanismos cohesivos, núcleo segregado y núcleo abstracto.
9. ¿Qué es el nivel de conocimiento y cuándo conviene?
   R: Es un grupo de objetos que describe y restringe el comportamiento de otro grupo, de modo que las reglas y tipos se configuran como datos y no como código. Conviene cuando los usuarios necesitan definir o cambiar reglas y tipos (por ejemplo, tipos de pólizas o roles) sin programar.

## Ejercicio

Para una plataforma de comercio electrónico con catálogo, carrito, pedidos, pagos (proveedor externo), envíos (transportadora externa con un API anticuado), facturación electrónica (estándar del país) y un CRM comprado: (a) identifica al menos 5 bounded contexts y escribe para cada uno su definición de "Producto" y de "Cliente" (si aplica); (b) dibuja el context map en ASCII con upstream/downstream y el patrón de cada relación, justificando cada elección en una línea; (c) clasifica cada contexto como core, de soporte o genérico, escribe una declaración de visión de máximo 150 palabras y elige para cada genérico una opción (comprar, estándar, subcontratar, propio); (d) implementa en TypeScript una capa anticorrupción para la transportadora (su API usa `{ PESO_GR, DIR1, DIR2, CIUDAD_COD }` y responde con códigos numéricos) que exponga `ShippingPort.quote(parcel, address)` en el lenguaje de tu contexto, con tests de Vitest de traducción en ambas direcciones. **Terminado cuando:** cada relación del mapa tiene patrón y justificación, la visión dice explícitamente qué **no** es el core, ningún tipo de la API de la transportadora aparece fuera de la capa anticorrupción y los tests cubren al menos un caso de error del proveedor.

## Explícalo con tus palabras

Explica con los planos de una obra y las áreas de un hospital por qué no conviene que toda la empresa use un único modelo de "Cliente" ni que todo el sistema reciba el mismo esfuerzo de diseño.
