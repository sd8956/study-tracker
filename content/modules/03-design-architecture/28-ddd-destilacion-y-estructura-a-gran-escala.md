---
title: "DDD VII: destilación del core domain y estructura a gran escala"
kind: lesson
hours: 2
sources: Domain-Driven Design (Evans), cap. 15 "Distillation" (pp. 279–306) | Domain-Driven Design (Evans), cap. 16 "Large-Scale Structure" (pp. 307–338) | Domain-Driven Design (Evans), cap. 17 "Bringing the Strategy Together" (pp. 339–348)
links: Vlad Khononov, "Learning Domain-Driven Design" (subdominios core, de soporte y genéricos) | https://www.oreilly.com/library/view/learning-domain-driven-design/9781098100124/
---

## Objetivo

Aprender a concentrar el esfuerzo donde está el valor: identificar el **core domain** y separarlo de los **subdominios genéricos** y de soporte con las técnicas de destilación, y conocer lo esencial de la **estructura a gran escala** (orden evolutivo, metáfora del sistema, capas de responsabilidad, nivel de conocimiento, framework de componentes enchufables) y cómo se combina todo en una estrategia.

## Estudio

### Destilación: separar la esencia

**Destilar** es separar los componentes de una mezcla para extraer la esencia de una forma más valiosa y útil. En un modelo grande, gran parte del esfuerzo se va a cuestiones periféricas, y lo que hace especial al sistema queda enterrado. La destilación hace prominente lo que más valor agrega y lo estructura para darle todo el poder posible.

Sirve para:

- Ayudar a todos a captar el diseño general y cómo encaja.
- Facilitar la comunicación al reducir el modelo a un núcleo manejable que entra en el lenguaje ubicuo.
- Guiar la refactorización.
- Enfocar el trabajo en las áreas del modelo con más valor.
- Guiar decisiones de **outsourcing**, uso de **componentes comprados** y **asignación de personas**.

### Core Domain

En un sistema grande, hay tantos componentes que contribuyen, todos complicados y todos necesarios, que la esencia del modelo de dominio (el **activo de negocio**) puede quedar oculta y descuidada. Los mejores desarrolladores tienden a gravitar hacia la infraestructura técnica o los problemas genéricos bien definidos, porque son interesantes y transferibles a otros trabajos, mientras que el conocimiento especializado del negocio parece menos atractivo. El resultado: el núcleo del negocio lo construyen los menos experimentados o queda sin atención.

La recomendación de Evans:

- **Reduce el modelo**: encuentra el **CORE DOMAIN** (dominio central) y ofrece una forma de distinguirlo fácilmente de la masa de modelo y código de soporte.
- **Haz el core pequeño**.
- Aplica en él a **tus mejores talentos** y contrata en consecuencia.
- Invierte en el core el esfuerzo de buscar un **modelo profundo** y un **diseño flexible**, suficiente para cumplir la visión del sistema.
- Justifica la inversión en cualquier otra parte según cuánto **apoya** al core.

#### ¿Cuál es tu core?

Depende de tu punto de vista y de tu negocio. Para una empresa de transporte marítimo, el modelo de cómo enrutar cargas puede ser el core; para un proveedor de software genérico de logística, quizás sea el motor de optimización. **El core de una aplicación puede ser el componente genérico de otra.** La pregunta clave: ¿qué hace que este sistema valga la pena escribirlo en lugar de comprarlo? ¿Qué nos distingue de la competencia?

Evans añade advertencias prácticas:

- El core no se compra: si se pudiera comprar, no te distinguiría. (Puede que uses componentes comprados **en** el core, pero el modelo y las reglas distintivas son tuyos.)
- **No subcontrates el core** ni lo asignes a personas temporales: el equipo necesita acumular conocimiento del dominio, y un miembro temporal es "un agujero en el balde".
- El core se descubre y **evoluciona** con las iteraciones.

### Las tres clases de subdominios

La comunidad DDD popularizó una clasificación que resume las ideas del capítulo:

| Tipo | Qué es | Estrategia | Ejemplo (clínica veterinaria) |
| --- | --- | --- | --- |
| **Core** | Lo que diferencia al negocio; complejo y valioso. | Construir en casa, con los mejores, con DDD a fondo. | Planes de salud preventiva y seguimiento clínico personalizado. |
| **De soporte** | Específico del negocio pero no diferenciador. | Construir de forma simple; se puede delegar. | Agenda de citas con las reglas de la clínica. |
| **Genérico** | Problema resuelto en general, igual para muchos negocios. | Comprar, usar open source o subcontratar. | Facturación electrónica, autenticación, envío de mensajes. |

### Subdominios genéricos

Algunas partes del modelo agregan complejidad sin capturar conocimiento especializado: zonas horarias, cálculos de impuestos estándar, gestión de usuarios, contabilidad general. Evans recomienda **identificar los subdominios cohesivos que no son la motivación del proyecto**, extraerlos en módulos separados y **no ponerles el énfasis del core**. Opciones para implementarlos, con sus costos:

| Opción | Ventajas | Desventajas |
| --- | --- | --- |
| **Solución comprada (off-the-shelf)** | Menos código; mantenimiento externo; probablemente más madura. | Hay que aprenderla; puede no encajar; integración; dependencia del proveedor. |
| **Modelo publicado (estándar)** | Más maduro que uno propio; bien documentado. | Puede ser más complejo o no encajar del todo. |
| **Implementación subcontratada** | El equipo se concentra en el core. | Requiere especificaciones e integración cuidadosas; costo de comunicación. |
| **Implementación propia** | Encaja exactamente con tus necesidades. | Costo de construir y mantener algo que no te diferencia. |

Un riesgo que Evans señala: los subdominios genéricos son tentadores para los desarrolladores (son "limpios" y técnicamente interesantes), y es fácil que se lleven más esfuerzo del que merecen. Evita sobrediseñarlos: no busques el modelo de zonas horarias perfecto si tu negocio es veterinario.

### Técnicas de destilación (de menor a mayor esfuerzo)

#### Domain Vision Statement (declaración de visión del dominio)

Escribe una descripción breve (aproximadamente una página) del **core domain** y del **valor** que aporta, su "propuesta de valor". Ignora los aspectos que no distinguen a este modelo de otros. Muestra cómo el modelo sirve y equilibra intereses diversos. Escríbela pronto y revísala cuando aprendas algo nuevo. Es una guía para que el equipo vaya en la misma dirección. Una buena prueba: si la declaración pudiera aplicarse a cualquier competidor cambiando solo el nombre de la empresa, todavía no describe tu core; reescríbela hasta que diga algo que solo tu negocio hace.

```markdown
**Visión del dominio: Huellitas**
El sistema permite a la clínica anticiparse a la salud de cada mascota: a partir de su
especie, edad, historial y vacunas, propone y agenda el plan preventivo adecuado y
avisa al tutor en el momento justo. Lo distintivo no es la agenda ni la facturación
(se resuelven con herramientas estándar), sino el modelo de **plan preventivo**: qué
toca, cuándo, por qué y qué pasa si se omite.
```

#### Highlighted Core (núcleo resaltado)

Hacer visible cuál es el core sin cambiar el diseño. Dos formas:

- Un **documento de destilación** breve (3 a 7 páginas) que describa los elementos centrales del core y sus interacciones principales.
- **Marcar** los elementos del core en el código o el repositorio (una anotación, un comentario, una carpeta) para que cualquier desarrollador sepa qué está dentro y qué fuera.

Si el documento de destilación necesita cambiar, es una señal de que el core cambió: debe ser una decisión consciente del equipo.

#### Cohesive Mechanisms (mecanismos cohesivos)

A veces el core se ensucia con **algoritmos complicados** que resuelven el "cómo" (por ejemplo, recorrer un grafo, optimizar una asignación, resolver reglas). Separa el **mecanismo** conceptualmente cohesivo en un módulo ligero propio, expuesto con una **interfaz que revele la intención**. El core expresa el **qué** (el problema del negocio) y delega el **cómo** al mecanismo. Ejemplo de Evans: un organigrama modela las relaciones entre personas y unidades; el algoritmo de recorrido de grafos que responde "¿quién está en la cadena de mando de X?" es un mecanismo cohesivo genérico.

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

Diferencia con un subdominio genérico: el genérico es una parte del **modelo** que no es central (un modelo de contabilidad); el mecanismo cohesivo es una pieza de **cálculo** que encapsula complejidad algorítmica.

#### Segregated Core (núcleo segregado)

Cuando el core está mezclado con elementos de soporte, **refactoriza** para separar los conceptos del core en su propio módulo (o paquete), incluso a costa de reubicar responsabilidades y cortar algunas dependencias. El core segregado da la mayor visibilidad y facilita el trabajo futuro sobre el modelo central, pero cuesta: es una refactorización grande. Hazlo cuando el sistema sea grande, el core sea crítico y la mezcla esté frenando al equipo.

#### Abstract Core (núcleo abstracto)

Cuando incluso el core segregado es grande y tiene mucha interacción entre subdominios, identifica los conceptos **más fundamentales** y llévalos a clases abstractas o interfaces en un módulo propio, mientras las implementaciones especializadas quedan en módulos de subdominio. Es la idea del SAP (sesión 14) aplicada al modelo: lo más central se vuelve lo más abstracto y estable.

#### Elegir objetivos de refactorización

Evans cierra el capítulo con un consejo simple: cuando haya que priorizar mejoras, **empieza por el core**. Un diseño de soporte feo es tolerable; un core confuso limita todo el proyecto. Y los modelos profundos destilan solos: una comprensión más profunda del core suele simplificarlo.

### Estructura a gran escala

Incluso con módulos y contextos bien definidos, un modelo grande puede ser **difícil de comprender en conjunto**: hay demasiados módulos, cada uno con decisiones razonables pero idiosincrásicas, y nadie ve el "arco de la historia". Evans relata un simulador de comunicaciones satelitales con tantos módulos que nadie sabía dónde buscar una funcionalidad o dónde poner una clase nueva. La solución fue imponer una **estructura**: ver todo el simulador como una serie de **capas** que correspondían a aspectos del sistema simulado (infraestructura física, enrutamiento de paquetes, etc.). Los módulos se redefinieron para no atravesar capas y los objetos se ajustaron para pertenecer claramente a una. La estructura no era un módulo: era **un conjunto de reglas** que limitaba los límites y relaciones de cualquier elemento del diseño. El techo de complejidad se levantó.

Una **estructura a gran escala** es un lenguaje que permite discutir y entender el sistema a grandes rasgos: un conjunto de conceptos o reglas de alto nivel que establecen un patrón de diseño para todo el sistema.

| Patrón | Idea | Cuándo |
| --- | --- | --- |
| **Evolving Order (orden evolutivo)** | La estructura conceptual debe evolucionar con la aplicación, incluso cambiar por completo. No impongas una estructura rígida prematuramente; tampoco te quedes sin ninguna. | Siempre: es la actitud de base. |
| **System Metaphor (metáfora del sistema)** | Una analogía concreta que capte la imaginación del equipo y guíe el pensamiento ("el sistema es como una línea de ensamblaje"). | Cuando surge una metáfora útil; no la fuerces. Úsala con cuidado: toda metáfora es imperfecta. |
| **Responsibility Layers (capas de responsabilidad)** | Capas del **dominio** según responsabilidades amplias (por ejemplo: potencial, operaciones, compromisos, políticas, soporte a decisiones), con dependencias hacia abajo. | Dominios grandes donde los objetos tienen naturalezas distintas (recursos, operaciones diarias, reglas). |
| **Knowledge Level (nivel de conocimiento)** | Un grupo de objetos que describe cómo debe comportarse otro grupo; las reglas se configuran como datos en lugar de código. | Cuando los usuarios necesitan configurar reglas y tipos sin programar (tipos de pólizas, roles y permisos). |
| **Pluggable Component Framework** | Un núcleo abstracto con interfaces y protocolos que permite enchufar implementaciones diversas. | Cuando varias aplicaciones deben interoperar a partir de un modelo maduro y destilado. Rara vez al principio. |

#### Capas de responsabilidad: un ejemplo

En un sistema de transporte, Evans propone capas del dominio como estas (de abajo hacia arriba):

```
┌───────────────────────────────────────────┐
│ Soporte a decisiones (análisis, planes)    │  ← usa todo lo de abajo
├───────────────────────────────────────────┤
│ Políticas (reglas de enrutamiento, cupos)  │
├───────────────────────────────────────────┤
│ Compromisos (reservas, acuerdos)           │
├───────────────────────────────────────────┤
│ Operaciones (qué está pasando: manejos)    │
├───────────────────────────────────────────┤
│ Potencial (qué se puede hacer: barcos,     │
│            rutas, instalaciones)           │
└───────────────────────────────────────────┘
```

Son capas **del modelo de dominio**, no las capas técnicas de la sesión 23. Ayudan a decidir dónde va un concepto nuevo y qué puede depender de qué.

#### Qué tan restrictiva debe ser la estructura

Una estructura demasiado rígida estorba; una demasiado laxa no aporta. Evans recomienda una estructura **mínima** que resuelva los problemas reales de comprensión y comunicación, refactorizarla cuando ya no encaje y no tratarla como dogma.

### Unir la estrategia

Contextos, destilación y estructura no compiten: se complementan. Una estructura a gran escala puede vivir **dentro** de un contexto o **organizar el context map** entero (por ejemplo, ubicar cada contexto, incluido el legado, en una capa de responsabilidad). La destilación indica dónde invertir dentro de cada contexto.

Para definir la estrategia, Evans sugiere **evaluar primero**: dibujar el context map actual, identificar el core y las partes genéricas, revisar el lenguaje y ver si hay una estructura emergente. Y sobre **quién decide**: la estrategia no debería imponerla un arquitecto aislado. Funciona mejor cuando surge del equipo de desarrollo (con alguien que la cuide) o cuando un equipo de arquitectura trabaja **dentro** de los equipos, con decisiones que llegan al código y retroalimentación constante. Seis principios que propone para decisiones estratégicas: deben llegar a todo el equipo, absorber retroalimentación, permitir la evolución, no quitar a los mejores del core para ponerlos solo en arquitectura, buscar minimalismo y humildad, y recordar que los objetos son especialistas y los desarrolladores, generalistas.

### Analogía de construcción

En un hospital, el **core** es el quirófano y la unidad de cuidados intensivos: ahí van los mejores especialistas y el mejor diseño. La lavandería, la cafetería y el estacionamiento son **genéricos**: se contratan o se compran soluciones estándar. La agenda de consultas es **de soporte**: específica del hospital, pero no lo diferencia. La **declaración de visión** es el cartel en la entrada que dice qué tipo de hospital es. Un **mecanismo cohesivo** es el sistema de distribución de oxígeno: complejo, crucial, pero genérico y separado del trabajo médico. Y la **estructura a gran escala** es la organización por plantas y alas (urgencias, hospitalización, consultas) que permite que cualquier persona sepa dónde buscar algo nuevo.

### Una prueba rápida para encontrar el core

Pregúntale a alguien del negocio: "si mañana tuviéramos que comprar todo el software hecho excepto una parte, ¿cuál construiríamos nosotros?". La respuesta casi siempre señala el core. Si la respuesta es "ninguna", quizás el sistema entero sea genérico y lo mejor sea comprarlo; si la respuesta es "todas", todavía no has destilado lo suficiente.

### Errores comunes

- **No saber cuál es el core** y repartir el esfuerzo por igual (o al revés: invertir más en lo genérico porque es más interesante).
- **Construir en casa subdominios genéricos** que se compran resueltos.
- **Subcontratar o asignar a temporales el core.**
- **Core enorme**: si todo es core, nada lo es.
- **Imponer una estructura a gran escala desde el principio** y rígida, o forzar una metáfora que no encaja.
- **Arquitectos que deciden sin tocar el código**.

### Resumen

La destilación separa el core domain (lo que diferencia al negocio, donde van los mejores y el modelo más profundo) de los subdominios genéricos (que se compran, se usan estándar o se subcontratan) y de soporte. Las técnicas van de lo barato a lo costoso: declaración de visión, núcleo resaltado, mecanismos cohesivos, núcleo segregado y núcleo abstracto. La estructura a gran escala (orden evolutivo, metáfora, capas de responsabilidad, nivel de conocimiento, framework enchufable) da un lenguaje para entender el sistema completo, y debe ser mínima y evolucionar. Contextos, destilación y estructura se combinan en una estrategia que surge del equipo y llega al código.

## Conceptos clave

- **Destilación**: proceso de separar y hacer prominente lo esencial del modelo.
- **Core domain**: parte del modelo que diferencia al negocio y concentra el mayor valor.
- **Subdominio de soporte**: parte específica del negocio pero no diferenciadora.
- **Subdominio genérico**: problema resuelto de forma general, igual para muchos negocios; candidato a comprar o subcontratar.
- **Declaración de visión del dominio**: descripción breve del core y del valor que aporta.
- **Núcleo resaltado**: marcar o documentar qué elementos forman el core sin cambiar el diseño.
- **Mecanismo cohesivo**: algoritmo complejo separado del core detrás de una interfaz que revela la intención.
- **Núcleo segregado / abstracto**: core separado en su propio módulo / conceptos fundamentales del core llevados a abstracciones.
- **Estructura a gran escala**: reglas o conceptos de alto nivel que organizan todo el diseño.
- **Capas de responsabilidad**: capas del modelo de dominio según responsabilidades amplias, con dependencias hacia abajo.

## Preguntas de repaso

1. ¿Por qué el core domain tiende a quedar descuidado y qué recomienda Evans?
   R: Porque los mejores desarrolladores suelen preferir la infraestructura técnica y los problemas genéricos, que son interesantes y transferibles, mientras que el conocimiento especializado del negocio parece menos atractivo. Evans recomienda identificar un core pequeño, hacerlo visible, asignarle los mejores talentos e invertir en él el modelado más profundo.
2. ¿Por qué el core no se compra ni se subcontrata?
   R: Porque es lo que diferencia al negocio; si se pudiera comprar, no te distinguiría. Además, el equipo necesita acumular conocimiento del dominio en el core, y las personas externas o temporales se llevan ese conocimiento al irse.
3. Distingue subdominio genérico y mecanismo cohesivo.
   R: El subdominio genérico es una parte del modelo que no es central para el negocio (como la contabilidad o las zonas horarias). El mecanismo cohesivo es una pieza de cálculo algorítmico compleja (como recorrer un grafo) que se separa del core para que este exprese el qué y delegue el cómo.
4. Ordena las técnicas de destilación de menor a mayor esfuerzo.
   R: Declaración de visión del dominio, núcleo resaltado (documento de destilación o marcas), mecanismos cohesivos, núcleo segregado y núcleo abstracto.
5. ¿Qué problema resolvió la estructura de capas en el simulador satelital?
   R: Había tantos módulos que nadie sabía dónde buscar ni dónde poner algo nuevo. Imponer capas conceptuales del sistema simulado dio reglas para ubicar módulos y objetos, hizo comprensible el diseño y permitió que las personas tomaran decisiones consistentes de forma independiente.
6. ¿Qué es el nivel de conocimiento y cuándo conviene?
   R: Es un grupo de objetos que describe y restringe el comportamiento de otro grupo, de modo que las reglas y tipos se configuran como datos y no como código. Conviene cuando los usuarios necesitan definir o cambiar reglas y tipos (por ejemplo, tipos de pólizas o roles) sin programar.
7. ¿Por qué una estructura a gran escala debe ser mínima y evolutiva?
   R: Porque una estructura rígida impuesta antes de tiempo estorba el diseño y no encaja con lo que se aprende después; debe resolver problemas reales de comprensión y comunicación y refactorizarse cuando deje de encajar.

## Ejercicio

Para la plataforma de comercio electrónico de la sesión anterior (o tu propio proyecto): (a) clasifica cada bounded context como core, de soporte o genérico, y justifica; (b) escribe una declaración de visión del dominio de máximo 150 palabras; (c) propone para cada subdominio genérico una opción (comprar, estándar, subcontratar, propio) con su compromiso; (d) identifica un mecanismo cohesivo dentro del core (por ejemplo, el cálculo de recomendaciones o de asignación de stock entre bodegas) e impleméntalo en TypeScript como función o módulo independiente con una interfaz que revele la intención y tests de Vitest, haciendo que una clase del core lo use. **Terminado cuando:** hay una tabla de clasificación con justificación, la visión menciona explícitamente qué **no** es el core, el mecanismo no importa nada del modelo del core y la clase del core se lee en el lenguaje del negocio sin detalles algorítmicos.

## Explícalo con tus palabras

Explica con la analogía del hospital (quirófano, lavandería, agenda) por qué no todo el sistema merece el mismo esfuerzo de diseño.
