---
title: "DDD VI: diseño estratégico, bounded contexts y context map"
kind: lesson
hours: 2
sources: Domain-Driven Design (Evans), parte IV, introducción (pp. 233–234) | Domain-Driven Design (Evans), cap. 14 "Maintaining Model Integrity" (pp. 235–278)
links: Martin Fowler, "Bounded Context" | https://martinfowler.com/bliki/BoundedContext.html ; Context Mapper | https://contextmapper.org/
---

## Objetivo

Aprender a dividir un sistema grande en **bounded contexts** (contextos delimitados) donde cada modelo es consistente, a mantener la integridad de cada uno con **integración continua**, y a dibujar el **context map** con las relaciones entre contextos: shared kernel, cliente/proveedor, conformista, capa anticorrupción, caminos separados, servicio de host abierto y lenguaje publicado.

## Estudio

### El problema de escalar un modelo

El objetivo más ambicioso de muchos sistemas empresariales es uno integrado que cubra todo el negocio. Pero el modelo completo de casi cualquier organización es **demasiado grande y complejo** para manejarlo como una unidad. Hay dos extremos malos:

- Un **modelo monolítico** que lo abarca todo: inmanejable, lleno de duplicaciones sutiles y contradicciones.
- **Subsistemas pequeños pegados con interfaces improvisadas**: sin poder para resolver problemas de toda la empresa y con problemas de consistencia en cada punto de integración.

El **diseño estratégico** de DDD ofrece tres herramientas para escalar: **bounded contexts** (esta sesión), **destilación** y **estructura a gran escala** (próxima sesión). Evans dice que el bounded context, aunque es el menos obvio, es el **más fundamental**.

### Una historia: el objeto "Charge"

Evans cuenta un proyecto con varios equipos en paralelo. El equipo de facturación a clientes iba a crear un objeto `Charge` y descubrió que otro equipo ya tenía uno. Con buena intención, decidieron **reutilizarlo**: le agregaron un "código de gasto" que faltaba, renombraron "monto contabilizado" a lo que ellos llamaban "monto adeudado" ("¿qué importa un nombre?"), sumaron métodos y asociaciones. Su módulo funcionó. Días después aparecieron problemas misteriosos en el módulo de pago de facturas, para el que se había escrito `Charge` originalmente: cargos extraños que nadie había creado. Resultó que para un equipo un `Charge` era un cargo que el cliente debía pagar, y para el otro, un pago que la empresa debía hacer a un proveedor. **Mismo nombre, dos conceptos.** Al unificarlos se rompieron ambos.

La lección: en un sistema grande coexisten **varios modelos**, y cuando el código basado en modelos distintos se combina, el software se vuelve defectuoso, poco confiable y difícil de entender. La comunicación entre equipos se confunde, y a menudo no está claro en qué contexto aplica cada modelo.

### Bounded Context

Un modelo solo es válido **dentro de un contexto**. Un **BOUNDED CONTEXT** define explícitamente ese contexto:

- Delimita **dónde aplica** un modelo particular: en términos de organización de equipos, de uso dentro de partes de la aplicación y de manifestaciones físicas como el código y los esquemas de base de datos.
- **Dentro** del límite, el modelo se mantiene estrictamente consistente y el lenguaje ubicuo tiene un significado preciso.
- **Fuera** del límite, no te distraen ni te confunden los problemas de otros modelos.

```
┌──────── Contexto: Ventas ────────┐   ┌────── Contexto: Soporte ───────┐
│ Cliente = alguien que puede      │   │ Cliente = titular de tickets,  │
│ comprar: segmento, límite de     │   │ con historial de incidencias,  │
│ crédito, vendedor asignado.      │   │ nivel de servicio (SLA).       │
│ Producto = ítem con precio y     │   │ Producto = algo que puede      │
│ descuentos.                      │   │ fallar: versión, garantía.     │
└──────────────────────────────────┘   └────────────────────────────────┘
       mismo término, modelos distintos: está bien si los límites son explícitos
```

#### Bounded context no es módulo

Los **módulos** organizan elementos **dentro de un mismo modelo**; no indican que haya contextos distintos. Un bounded context es un límite **entre modelos**. Un contexto puede tener muchos módulos. Y tampoco es lo mismo que un subdominio (un área del negocio): un subdominio es parte del **problema**; un contexto es parte de la **solución**. Idealmente se alinean, pero no siempre.

#### Reconocer que un contexto se está partiendo

Evans describe dos síntomas de que dentro de un supuesto contexto hay en realidad dos modelos mezclados:

- **Conceptos duplicados**: dos representaciones del mismo concepto. Cada cambio debe hacerse en ambas.
- **Falsos cognados**: dos personas usan el mismo término creyendo hablar de lo mismo, pero piensan en cosas distintas (el caso `Charge`). Son aún más peligrosos.

### Integración continua dentro del contexto

Cuando varias personas trabajan en el mismo contexto, el modelo tiende a **fragmentarse**: cada uno entiende algo un poco distinto. La defensa es la **INTEGRACIÓN CONTINUA** (en sentido amplio, no solo el servidor de CI):

- **Integrar el código** con frecuencia, con builds y tests automatizados que detecten pronto las inconsistencias.
- **Integrar los conceptos**: hablar constantemente el lenguaje ubicuo, ejercitarlo en discusiones y refinarlo, para que todos compartan la misma comprensión del modelo.

Evans advierte que la integración continua tiene un **costo** que crece con el tamaño del equipo; un contexto demasiado grande, con demasiada gente, no se puede mantener unificado. Esa es una de las razones para dividir en varios contextos.

### Context Map

Un **CONTEXT MAP** describe los contextos que existen en el proyecto y las **relaciones** entre ellos. Reglas:

- Identifica cada modelo en juego y define su contexto delimitado, incluyendo los modelos implícitos de subsistemas no orientados a objetos (el sistema legado también tiene un modelo).
- Nombra cada contexto y haz que el nombre forme parte del lenguaje ubicuo.
- Describe los **puntos de contacto** y la **traducción** necesaria en cada uno.
- **Mapea el terreno existente, no el ideal.** Primero dibuja lo que hay de verdad; después decide qué cambiar.

El mapa no tiene un formato obligatorio: puede ser un diagrama, un texto o ambos. Lo importante es que todos lo compartan y lo entiendan. Y un consejo práctico: el código de cada contexto debería poder **separarse físicamente** (paquetes, repositorios, esquemas), y la estructura del código debería reflejar los límites.

#### Testear en los límites

Los puntos de contacto entre contextos son especialmente propensos a errores. Evans recomienda tests en los límites que verifiquen que la traducción entre modelos sigue funcionando.

### Relaciones entre contextos

Evans describe un repertorio de patrones para las relaciones entre contextos. Primero, dos conceptos:

- **Upstream (aguas arriba)**: el contexto cuyas decisiones afectan al otro. Sus cambios fluyen hacia abajo.
- **Downstream (aguas abajo)**: el contexto que depende del otro y recibe el impacto de sus cambios.

#### Shared Kernel (núcleo compartido)

Dos equipos acuerdan compartir un **subconjunto del modelo** (y del código y la base de datos asociados). Ese núcleo tiene un estatus especial: **no se cambia sin consultar al otro equipo**, y se integra con frecuencia, con tests de ambos equipos.

- Útil cuando dos equipos trabajan muy de cerca y la integración funcional es alta.
- Riesgo: acoplamiento; el núcleo se vuelve difícil de cambiar. Mantenlo **pequeño**.

#### Customer/Supplier (cliente/proveedor)

Un contexto alimenta a otro y las dependencias van en una dirección. Sin acuerdo, el equipo upstream puede quedar paralizado (miedo a romper al downstream) o el downstream queda a merced de las prioridades del upstream. El patrón propone una relación explícita de **cliente y proveedor**:

- El equipo downstream actúa como **cliente** en la planificación del upstream: negocia y prioriza sus necesidades.
- Juntos escriben **tests de aceptación automatizados** que validan la interfaz esperada, y el equipo upstream los ejecuta en su propia suite. Así puede cambiar con confianza, y el downstream no tiene que vigilarlo constantemente.

Funciona mejor cuando ambos equipos están bajo una misma gerencia o comparten objetivos.

#### Conformist (conformista)

Cuando el upstream **no tiene motivación** para atender al downstream (otra empresa, otra área con otras prioridades, un proveedor grande), el cliente/proveedor no funciona. Si el modelo upstream es razonablemente bueno, el downstream puede elegir **conformarse**: adoptar el modelo upstream tal cual, sin traducción. Simplifica enormemente la integración, a cambio de **renunciar a un modelo propio** en esa parte. Es como el shared kernel, pero sin poder de decisión sobre el modelo compartido.

#### Anticorruption Layer (capa anticorrupción)

Cuando el modelo upstream es malo, ajeno o legado, y conformarse contaminaría tu modelo, construye una **CAPA ANTICORRUPCIÓN**: una capa aislante que da a tus clientes funcionalidad **en términos de tu propio modelo**, y que habla con el otro sistema a través de su interfaz existente, traduciendo en ambas direcciones.

Cómo se implementa (y aquí convergen las sesiones anteriores): una combinación de **Facade** (simplifica el acceso al otro sistema), **Adapter** (convierte su interfaz) y **traductores** (convierten objetos y datos de un modelo a otro). Los servicios de la capa se expresan en el lenguaje de tu contexto.

```ts
// Modelo de NUESTRO contexto (clínica)
export interface Invoice { id: string; patientName: string; lines: { concept: string; amount: number }[] }
export interface InvoicingPort { issue(invoice: Invoice): Promise<{ legalNumber: string }> }

// Modelo AJENO: sistema de facturación legado (formato y vocabulario propios)
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
    return { legalNumber: res.CONSEC };                    // traducimos de vuelta a nuestro idioma
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

Es caro de construir y mantener, pero protege la integridad de tu modelo, que es tu activo principal. Muy útil al convivir con sistemas legados durante una migración gradual.

#### Separate Ways (caminos separados)

La integración siempre cuesta. Si dos conjuntos de funcionalidad **no tienen una relación significativa**, declara un contexto que **no tiene ninguna conexión** con el otro: cada uno busca soluciones simples y especializadas en su ámbito. A veces la mejor integración es ninguna (o una muy simple a nivel de interfaz de usuario, como un enlace).

#### Open Host Service (servicio de host abierto)

Cuando un contexto debe integrarse con **muchos** otros, crear una traducción a medida para cada uno es insostenible. Define un **protocolo** de acceso a tu contexto como un conjunto de **servicios abiertos y documentados**, que cualquiera que necesite integrarse pueda usar. Mejora el protocolo para nuevos requisitos de integración, pero evita adaptaciones exclusivas para un solo cliente (para casos especiales, usa un traductor puntual).

Hoy lo reconoces como una **API pública bien diseñada** (REST, gRPC, eventos) con versiones y documentación.

#### Published Language (lenguaje publicado)

La traducción entre modelos de dos contextos necesita un lenguaje común. Cuando el modelo interno de un contexto no es adecuado como formato de intercambio (es complejo o cambia a menudo), usa un **lenguaje compartido bien documentado** para las comunicaciones, y traduce hacia y desde él. Ejemplos: estándares de la industria (XML de comercio electrónico, formatos de facturación electrónica, HL7/FHIR en salud, el formato de mensajes de un banco central), o esquemas de eventos versionados (JSON Schema, Avro, Protobuf). Suele combinarse con Open Host Service.

### Elegir la estrategia de contexto

| Relación | Cuándo | Costo |
| --- | --- | --- |
| Shared Kernel | Dos equipos muy cercanos, mucha integración. | Coordinación constante; acoplamiento. |
| Customer/Supplier | Un upstream dispuesto a atender al downstream. | Negociación y tests de aceptación compartidos. |
| Conformist | Upstream que no va a cambiar por ti, con un modelo aceptable. | Renuncias a tu modelo en esa parte. |
| Anticorruption Layer | Upstream con modelo malo, ajeno o legado. | Capa de traducción que construir y mantener. |
| Separate Ways | No hay relación significativa. | Duplicar algo de funcionalidad. |
| Open Host + Published Language | Muchos consumidores. | Diseñar, versionar y documentar el protocolo. |

```
Ejemplo de context map (clínica veterinaria)

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

#### Cómo dibujar tu primer context map

Un procedimiento práctico para un sistema que ya existe: (1) lista los equipos y los sistemas (incluidos los comprados y los legados); (2) para cada uno, anota tres o cuatro términos clave y qué significan **para ellos**; (3) donde el mismo término cambie de significado, traza un límite; (4) para cada par de contextos que se comunican, pregúntate quién se adapta a quién y si hay traducción; (5) marca en rojo las relaciones que hoy duelen (integraciones frágiles, modelos ajenos filtrados). El mapa resultante suele ser más desordenado de lo que esperabas, y eso es justamente lo valioso: muestra la realidad sobre la que tienes que tomar decisiones.

### Transformaciones

El mapa no es estático. Evans describe transformaciones típicas: **fusionar** contextos (de caminos separados a shared kernel, o de shared kernel a un solo contexto con integración continua) cuando la separación genera demasiada duplicación, y **retirar un sistema legado** de forma gradual, reemplazando funcionalidad pieza a pieza detrás de una capa anticorrupción hasta que el legado deja de usarse. También puede evolucionar un servicio de host abierto hacia un lenguaje publicado cuando aparecen más consumidores.

### Bounded contexts y microservicios

Muchas personas descubren DDD por los microservicios. La relación es estrecha pero no es igualdad: **un bounded context es un límite de modelo**; un microservicio es una **unidad de despliegue**. Un contexto puede desplegarse como un servicio, como varios o como un módulo dentro de un monolito bien estructurado. Empezar con un **monolito modular** con contextos claramente separados (paquetes distintos, sin imports cruzados, comunicación por interfaces o eventos) es a menudo la forma más segura de llegar a microservicios cuando haga falta. Lo verás en el módulo 06.

### Analogía de construcción

En una obra grande, el plano estructural, el eléctrico y el de paisajismo usan la palabra "nivel" con significados distintos (cota estructural, nivel de tensión, nivel de terreno). No pasa nada mientras cada equipo sepa en qué plano está: cada plano es un **bounded context**. El **context map** es el plano de coordinación que muestra dónde se tocan y quién se adapta a quién. La **capa anticorrupción** es la junta de dilatación entre un edificio nuevo y uno antiguo: los conecta sin que los movimientos de uno agrieten al otro. El **lenguaje publicado** es la norma técnica común (unidades, símbolos) que permite que cualquier proveedor lea los planos.

### Errores comunes

- **Un modelo único para toda la empresa** ("el `Cliente` canónico"), que acaba lleno de campos opcionales y contradicciones.
- **Reutilizar una clase de otro contexto porque tiene el mismo nombre** (el caso `Charge`).
- **Dibujar el mapa ideal en lugar del real.**
- **Conformarse sin darse cuenta**: el modelo de un proveedor externo se filtra por todo el código sin una capa de traducción.
- **Shared kernels grandes** que nadie se atreve a tocar.
- **Confundir bounded context con microservicio** y partir el sistema por tablas o por equipos sin pensar en el modelo.

### Resumen

En sistemas grandes conviven varios modelos, y mezclarlos produce software defectuoso. Un bounded context delimita explícitamente dónde aplica cada modelo, dentro del cual el lenguaje es preciso y el modelo consistente, mantenido con integración continua de código y conceptos. El context map describe los contextos reales y sus relaciones: shared kernel, cliente/proveedor (con tests de aceptación), conformista, capa anticorrupción (facade, adapter y traductores), caminos separados, servicio de host abierto y lenguaje publicado. El mapa evoluciona, y los contextos son límites de modelo, no necesariamente unidades de despliegue.

## Conceptos clave

- **Bounded context**: límite explícito dentro del cual un modelo y su lenguaje son consistentes.
- **Falso cognado**: término que dos partes usan creyendo que significa lo mismo cuando no es así.
- **Integración continua (de modelo)**: integrar con frecuencia código y conceptos para evitar que un contexto se fragmente.
- **Context map**: descripción de los contextos existentes y de sus relaciones y traducciones.
- **Upstream / downstream**: contexto cuyos cambios afectan a otro / contexto que depende del otro.
- **Shared kernel, customer/supplier, conformist**: relaciones con distinto grado de modelo compartido y de poder de negociación.
- **Capa anticorrupción**: capa de traducción que protege un modelo del modelo de otro sistema.
- **Open host service y published language**: protocolo abierto para muchos consumidores y lenguaje común documentado para el intercambio.

## Preguntas de repaso

1. ¿Qué enseña la historia del objeto `Charge`?
   R: Que un mismo nombre puede referirse a conceptos distintos en partes diferentes de un sistema; al unificarlos por reutilizar, ambos módulos se rompieron. En sistemas grandes coexisten varios modelos y hay que delimitar explícitamente dónde aplica cada uno.
2. ¿Qué diferencia hay entre un bounded context y un módulo?
   R: El módulo organiza elementos dentro de un mismo modelo; el bounded context delimita dónde aplica un modelo y lo separa de otros modelos. Un contexto puede contener muchos módulos.
3. ¿Qué es un falso cognado y por qué es más peligroso que un concepto duplicado?
   R: Es un término que dos personas usan creyendo que significa lo mismo cuando piensan en cosas distintas. Es más peligroso porque nadie nota el malentendido hasta que aparecen errores, mientras que la duplicación al menos es visible.
4. ¿Cómo funciona la relación cliente/proveedor y qué papel cumplen los tests de aceptación?
   R: El equipo downstream actúa como cliente del upstream en la planificación y ambos acuerdan tests automatizados que validan la interfaz esperada; el upstream los ejecuta en su suite, de modo que puede cambiar con confianza sin romper al downstream, y este no necesita vigilarlo constantemente.
5. ¿Cuándo elegirías conformista y cuándo capa anticorrupción?
   R: Conformista cuando el upstream no va a adaptarse a ti pero su modelo es razonablemente bueno, y quieres simplificar la integración renunciando a un modelo propio en esa parte. Capa anticorrupción cuando el modelo upstream es malo, ajeno o legado y adoptarlo contaminaría tu modelo.
6. ¿Con qué patrones se construye una capa anticorrupción?
   R: Con una fachada que simplifica el acceso al otro sistema, adaptadores que convierten su interfaz y traductores que transforman objetos y datos entre ambos modelos, exponiendo los servicios en el lenguaje del propio contexto.
7. ¿Un bounded context es lo mismo que un microservicio?
   R: No. El contexto es un límite de modelo y el microservicio una unidad de despliegue. Un contexto puede desplegarse como uno o varios servicios o como un módulo de un monolito modular.

## Ejercicio

Para una plataforma de comercio electrónico con catálogo, carrito, pedidos, pagos (proveedor externo), envíos (transportadora externa con un API anticuado), facturación electrónica (estándar del país) y un CRM comprado: (a) identifica al menos 5 bounded contexts y escribe para cada uno su propia definición de "Producto" y de "Cliente" (si aplica); (b) dibuja el context map en ASCII indicando upstream/downstream y el patrón de cada relación, justificando cada elección; (c) implementa en TypeScript una capa anticorrupción para la transportadora (su API usa `{ PESO_GR, DIR1, DIR2, CIUDAD_COD }` y responde con códigos numéricos) que exponga `ShippingPort.quote(parcel, address)` en el lenguaje de tu contexto, con tests de traducción en ambas direcciones; (d) define un evento `OrderPlaced` versionado como lenguaje publicado (tipo TypeScript y ejemplo JSON). **Terminado cuando:** cada relación del mapa tiene un patrón y una justificación, ningún tipo de la API de la transportadora aparece fuera de la capa anticorrupción y los tests cubren al menos un caso de error del proveedor.

## Explícalo con tus palabras

Explica con el ejemplo de los planos estructural, eléctrico y de paisajismo por qué no hace falta (ni conviene) que toda la empresa use un único modelo de "Cliente".
