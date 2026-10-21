---
title: "Componentes I: qué es un componente y los principios de cohesión (REP, CCP, CRP)"
kind: lesson
hours: 2
sources: Clean Architecture, parte IV, cap. 12 "Components" (pp. 88–92) | Clean Architecture, cap. 13 "Component Cohesion" (pp. 93–97)
---

## Objetivo

Subir un nivel de abstracción: de clases a **componentes** (unidades de despliegue y de versión) y aprender a decidir qué clases van juntas en un componente con los tres principios de cohesión y su diagrama de tensión.

## Estudio

### Qué es un componente

Un **componente** es la unidad de despliegue: la pieza más pequeña que puede desplegarse como parte de un sistema. En Java es un archivo `.jar`; en Ruby, una gema; en .NET, una DLL. En el ecosistema de TypeScript, un componente suele ser un **paquete npm** (publicado o interno de un monorepo), o al menos una carpeta con un punto de entrada claro (`index.ts`) y reglas sobre quién puede importarla.

Los componentes pueden enlazarse en un solo ejecutable, agruparse en un archivo o desplegarse por separado como plugins. Pero, sin importar cómo se desplieguen, **los componentes bien diseñados conservan siempre la capacidad de desplegarse por separado** y, por tanto, de desarrollarse por separado.

### Una historia breve (que explica por qué existen)

En los primeros tiempos, el programador decidía en qué dirección de memoria se cargaba su programa, y las librerías se incluían **en código fuente**, compilándose junto con la aplicación. Como la memoria era escasa y los dispositivos lentos, compilar programas grandes tardaba horas. Para acelerar, se separaron las librerías: se compilaban una vez y se cargaban en direcciones fijas. Pero cuando la aplicación crecía y "chocaba" con la memoria de la librería, había que fragmentar el programa alrededor de ella. Un desastre.

La solución fue el **código reubicable** (relocatable): el compilador produce binarios que un cargador inteligente puede colocar en cualquier dirección, y se agregan **referencias externas y definiciones externas** con nombre para que un **enlazador** (linker) conecte los programas con las librerías. Con el tiempo, los enlazadores se volvieron lentos a medida que los programas crecían, pero luego los discos y la memoria se hicieron tan rápidos que el enlace pudo hacerse **al cargar el programa**. Así nació la arquitectura de plugins de componentes que hoy damos por sentada: cargar librerías compartidas en tiempo de ejecución es algo trivial.

La moraleja es que el concepto de componente nació de una necesidad práctica: **poder trabajar, compilar y cargar partes del sistema por separado**. Esa necesidad sigue intacta: hoy se llama build incremental, caché de CI, versionado semántico o despliegue independiente.

### ¿Qué clases van en qué componente?

Es una decisión importante que suele tomarse a ojo. Martin propone tres principios de **cohesión de componentes**:

| Principio | Enunciado | Tendencia |
| --- | --- | --- |
| **REP** — Reuse/Release Equivalence | La unidad de reutilización es la unidad de liberación (release). | Agrupar para que los usuarios puedan reutilizar |
| **CCP** — Common Closure | Agrupa las clases que cambian por las mismas razones y al mismo tiempo; separa las que cambian en momentos distintos y por razones distintas. | Agrupar para el mantenimiento (componentes más grandes) |
| **CRP** — Common Reuse | No obligues a los usuarios de un componente a depender de cosas que no necesitan. | Separar para evitar dependencias innecesarias (componentes más pequeños) |

### REP: la unidad de reutilización es la unidad de release

Vivimos en la era de la reutilización: gestores de paquetes como npm, Maven o pip dependen de que existan miles de componentes reutilizables. Y la gente **no reutiliza** algo que no tiene un proceso de release con números de versión. No solo por compatibilidad: los desarrolladores necesitan saber cuándo llegan versiones nuevas y qué cambian, para decidir si las adoptan o se quedan con la anterior. Por eso el proceso de release debe producir notificaciones y documentación (un changelog, versionado semántico).

Desde el punto de vista del diseño, el REP significa que las clases de un componente deben formar un **grupo cohesivo**, con un tema o propósito común, y que deben poder **liberarse juntas**: que compartan número de versión, seguimiento y documentación debe tener sentido para el autor y para los usuarios.

Martin admite que el consejo es débil ("que tenga sentido" es difícil de precisar), pero las violaciones se detectan fácil: si publicas un paquete `utils` que mezcla formateo de fechas, cliente HTTP y validación de tarjetas, tus usuarios lo notarán, porque cada versión trae cambios que no les importan. Los otros dos principios precisan esta idea.

### CCP: lo que cambia junto, va junto

> Reúne en componentes las clases que cambian por las mismas razones y al mismo tiempo. Separa en componentes distintos las clases que cambian en momentos distintos y por razones distintas.

Es el **SRP aplicado a componentes**: así como una clase no debería tener varias razones para cambiar, un componente tampoco. Para la mayoría de las aplicaciones, **la mantenibilidad importa más que la reutilización**: si el código debe cambiar, prefieres que todos los cambios caigan en un solo componente en lugar de repartirse en muchos. Así solo redespliegas y revalidas ese componente.

El CCP también está relacionado con el OCP: como no se puede cerrar el código a todos los cambios, el CCP te dice que agrupes las clases que están cerradas **a los mismos tipos de cambio**. Así, cuando llega un cambio de ese tipo, toca un solo componente.

Ejemplo: en una tienda, todo lo relacionado con "cómo se calculan los envíos" (tarifas por zona, reglas de peso, integración con la transportadora) cambia junto cuando el negocio renegocia con una transportadora. Si esas clases están repartidas en `models/`, `services/` y `controllers/`, un solo cambio de negocio toca tres carpetas y quizás tres paquetes.

```
Por capa técnica (viola CCP)          Por razón de cambio (cumple CCP)
src/                                  src/
  models/ShippingRate.ts                shipping/
  models/Order.ts                         rates.ts
  services/ShippingService.ts             carrier-adapter.ts
  services/OrderService.ts                shipping-policy.ts
  controllers/ShippingController.ts       index.ts      ← API pública del componente
  controllers/OrderController.ts        orders/
                                          ...
```

### CRP: no obligues a depender de lo que no se usa

> No obligues a los usuarios de un componente a depender de cosas que no necesitan.

Las clases rara vez se reutilizan solas; suelen colaborar con otras del mismo componente. Por ejemplo, una clase contenedora y sus iteradores se reutilizan juntos, así que deben estar en el mismo componente.

Pero el principio también dice qué clases **no** poner juntas. Cuando un componente usa a otro, se crea una dependencia **con todo el componente**, aunque use una sola clase. Cada vez que el componente usado cambia (aunque sea en clases que no te importan), el que lo usa probablemente deba recompilarse, revalidarse y redesplegarse.

El CRP es la **versión genérica del ISP**: el ISP dice que no dependas de clases con métodos que no usas; el CRP dice que no dependas de componentes con clases que no usas. Ambos se resumen en: **no dependas de cosas que no necesitas**.

En el mundo npm, lo ves cuando instalas una librería enorme para usar una función: cada actualización de seguridad de una parte que no usas te obliga a actualizar, y el tamaño de tu bundle crece. Por eso muchas librerías modernas se publican en paquetes pequeños (`@empresa/dates`, `@empresa/http`) o con exportaciones por subruta.

### El diagrama de tensión

Los tres principios **pelean entre sí**. REP y CCP son **inclusivos** (tienden a hacer componentes más grandes); CRP es **exclusivo** (tiende a hacerlos más pequeños). El arquitecto busca un equilibrio que dependa del momento del proyecto.

```
                        REP
            (agrupar para reutilizar)
                    ╱       ╲
   Demasiados      ╱         ╲    Demasiados componentes
   cambios        ╱           ╲   innecesarios se
   afectan a     ╱             ╲  liberan juntos
   muchos       ╱    ZONA DE    ╲
   componentes ╱    EQUILIBRIO   ╲
              ╱                   ╲
           CCP ─────────────────── CRP
  (agrupar para mantener)   (separar para no arrastrar)
              Difícil de reutilizar
```

Cada lado del triángulo describe **el costo de abandonar el principio del vértice opuesto**:

| Si te enfocas solo en… | Pierdes… | Consecuencia |
| --- | --- | --- |
| REP y CRP | CCP | Un cambio simple toca demasiados componentes. |
| CCP y CRP | REP | Los componentes son difíciles de reutilizar. |
| REP y CCP | CRP | Se generan demasiados releases innecesarios para usuarios que no usan lo que cambió. |

#### El equilibrio cambia con el tiempo

Al principio de un proyecto, la **facilidad de desarrollo** importa más que la reutilización: el proyecto suele estar a la derecha del triángulo, priorizando CCP (que los cambios caigan en pocos lugares) y sacrificando un poco la reutilización. A medida que el proyecto madura y otros proyectos empiezan a depender de él, se desplaza hacia la izquierda: aparece la necesidad de reutilizar y de releases independientes.

La lección: **la estructura de componentes de un proyecto no es fija**. Evoluciona con lo que el proyecto necesita en cada etapa, y tiene más que ver con cómo se desarrolla y se usa que con lo que hace el sistema.

### Cohesión de componentes en un monorepo TypeScript

En la práctica moderna, muchas aplicaciones TypeScript viven en un **monorepo** con varios paquetes. Los principios te ayudan a decidir los cortes:

```
packages/
  billing-domain/       ← reglas de facturación: cambian cuando cambia la normativa (CCP)
  billing-api/          ← HTTP: cambia cuando cambia el contrato con el frontend
  shared-money/         ← tipo Money y redondeo: lo usan varios (REP, se versiona)
  shared-testing/       ← builders de datos de prueba: solo para tests (CRP)
apps/
  web/
  worker/
```

Preguntas útiles antes de crear o fusionar un paquete:

1. ¿Estas clases cambian por la misma razón de negocio? (CCP)
2. ¿Quien use una de ellas usará casi siempre las demás? (CRP)
3. ¿Tiene sentido versionarlas y documentarlas juntas? (REP)
4. ¿En qué etapa está el proyecto: priorizo cambiar rápido o reutilizar?

#### Hacer cumplir los límites

Un componente solo existe si sus límites se respetan. En TypeScript tienes varias herramientas:

- Un **punto de entrada** (`index.ts`) que exporta solo la API pública; el resto es interno.
- El campo **`exports`** de `package.json`, que impide importar rutas internas de un paquete.
- Reglas de lint que prohíben ciertos imports entre carpetas (por ejemplo, que `billing-domain` importe de `billing-api`).
- **Referencias de proyecto** de TypeScript (`references` en `tsconfig.json`), que hacen explícito qué paquete puede depender de cuál y permiten builds incrementales.

```jsonc
// packages/billing-domain/package.json
{
  "name": "@acme/billing-domain",
  "version": "1.4.0",
  "exports": { ".": "./dist/index.js" }   // nada de "@acme/billing-domain/src/internal"
}
```

### Un caso trabajado: desarmar un paquete `@acme/utils`

Imagina un monorepo con cuatro aplicaciones (web, móvil, worker y panel de administración) que comparten un paquete `@acme/utils` con este contenido:

| Archivo | Lo usan | Cambia cuando… |
| --- | --- | --- |
| `money.ts` (tipo `Money`, redondeo, formato) | las cuatro apps | cambia una regla contable (rara vez) |
| `dates.ts` (zonas horarias, festivos) | web, worker | se agregan festivos (cada año) |
| `http-client.ts` (cliente con reintentos) | web, móvil, admin | cambia el backend o la política de reintentos |
| `pdf.ts` (generación de PDF con una librería pesada) | worker | cambia el diseño de las facturas (a menudo) |
| `test-builders.ts` (builders de datos de prueba) | tests de todas las apps | cambian las entidades |

Problemas que aparecen con el tiempo, todos predecibles con los principios:

- La app móvil se actualiza cada vez que cambia el diseño de las facturas, porque `utils` publica una versión nueva aunque la móvil no use `pdf.ts` (**viola CRP**). Peor: la librería de PDF entra en el árbol de dependencias de la app móvil.
- Los `test-builders` están en el paquete de producción, así que el código de pruebas viaja en los bundles (**viola CRP**).
- Nadie sabe qué significa la versión 3.7.0 de `utils`: el changelog mezcla festivos, reintentos y márgenes de PDF (**viola REP**: no hay un tema común que justifique liberarlo junto).

Aplicando los principios, una reorganización razonable sería:

```
packages/
  money/          ← estable, lo usan todos; se versiona con cuidado (REP)
  calendar/       ← dates + festivos; cambia una vez al año (CCP)
  http/           ← cliente con reintentos; lo usan los frontends (CRP)
  invoice-pdf/    ← solo el worker; cambia a menudo, aislado (CCP + CRP)
  testing/        ← solo devDependencies (CRP)
```

¿Significa esto que siempre hay que dividir? No. Si el proyecto tiene una sola app y dos personas, cinco paquetes con su versión, su build y su changelog son un costo sin beneficio: estás en la fase donde el CCP manda y una carpeta por tema con un `index.ts` basta. La división se justifica cuando los síntomas aparecen: releases innecesarios, dependencias pesadas que se cuelan donde no deben, changelogs que nadie entiende.

Fíjate también en el orden de razonamiento: no empezaste preguntando "¿qué paquetes debería tener?", sino "¿quién usa cada cosa y por qué cambia?". Esa pregunta es la misma que hiciste con el SRP para las clases, ahora a una escala mayor.

### Señales de que la cohesión de tus componentes falla

| Señal | Principio en juego | Pregunta que debes hacerte |
| --- | --- | --- |
| Un cambio de negocio pequeño exige tocar cinco paquetes y coordinar cinco releases. | CCP | ¿Separé por capa técnica lo que cambia por la misma razón? |
| Los consumidores se quejan de actualizaciones frecuentes que no les afectan. | CRP | ¿Mezclé en un paquete cosas que se usan por separado? |
| Nadie sabe explicar qué contiene un paquete ni por qué se llama así. | REP | ¿Hay un propósito común que justifique liberarlo junto? |
| Un paquete trae dependencias pesadas que la mayoría de sus usuarios no necesita. | CRP | ¿Debería aislar esa parte en su propio componente? |
| Equipos distintos editan el mismo paquete a la vez y chocan. | CCP | ¿Este componente responde a varios actores? |

Ninguna señal aislada obliga a reorganizar. Cuando varias coinciden, o cuando una se repite en cada release, es momento de revisar los cortes.

### Analogía de construcción

Piensa en la **prefabricación** en construcción. Un módulo prefabricado de baño (con sanitarios, tuberías y revestimientos) se fabrica, se prueba y se instala como una unidad: lo que cambia junto (la instalación sanitaria de ese baño) va junto (CCP). El fabricante le pone un número de modelo y una ficha técnica, y los constructores lo eligen por versión (REP). Pero si el fabricante metiera en el mismo módulo el baño y la escalera "porque a veces se compran juntos", obligaría a quien solo quiere el baño a cargar con la escalera y sus revisiones (CRP).

### Errores comunes

- **Paquetes `common` o `shared` gigantes.** Todos dependen de todo; cada cambio se propaga a todos (viola CRP).
- **Cortar por capas técnicas** (`models`, `services`, `controllers`) cuando los cambios llegan por funcionalidad (viola CCP).
- **Fragmentar demasiado pronto.** Diez paquetes de una clase cada uno en un proyecto de dos personas: mucho costo de release y poco beneficio.
- **Componentes sin API pública definida.** Si cualquiera puede importar cualquier archivo interno, el componente no existe.
- **Creer que la estructura es definitiva.** Revísala cuando cambie la etapa del proyecto.

### Resumen

Un componente es la unidad de despliegue y conserva la capacidad de desarrollarse y desplegarse por separado. Tres principios deciden qué va dentro: REP (lo que se reutiliza se libera junto, con versión), CCP (lo que cambia junto va junto, el SRP de los componentes) y CRP (no obligues a depender de lo que no se usa, el ISP de los componentes). Los tres están en tensión, y el equilibrio correcto depende de la etapa del proyecto: al principio pesa más el CCP; con la madurez, la reutilización.

## Conceptos clave

- **Componente**: unidad de despliegue y de release; en TypeScript, típicamente un paquete o un módulo con API pública definida.
- **Código reubicable y enlazador**: técnicas que permitieron cargar y conectar librerías por separado, origen de los componentes.
- **REP**: la unidad de reutilización es la unidad de release.
- **CCP**: agrupa las clases que cambian por las mismas razones y al mismo tiempo.
- **CRP**: no obligues a los usuarios de un componente a depender de cosas que no necesitan.
- **Diagrama de tensión**: triángulo que muestra el costo de abandonar cada uno de los tres principios de cohesión.
- **API pública de un componente**: lo que el componente exporta deliberadamente; todo lo demás es interno.

## Preguntas de repaso

1. ¿Qué es un componente y qué capacidad debe conservar siempre?
   R: Es la unidad más pequeña que se puede desplegar como parte de un sistema (un jar, una gema, un paquete npm). Aunque se despliegue junto con otros, un componente bien diseñado conserva la capacidad de desplegarse y desarrollarse por separado.
2. ¿Por qué el REP exige versiones y releases para reutilizar?
   R: Porque nadie reutiliza algo que no tiene un proceso de release: los usuarios necesitan saber qué cambió y cuándo, para decidir si adoptan la versión nueva o se quedan con la anterior, y para asegurar la compatibilidad entre componentes.
3. ¿Qué relación hay entre CCP y SRP, y entre CRP e ISP?
   R: El CCP es el SRP aplicado a componentes: un componente no debe tener varias razones para cambiar. El CRP es la versión genérica del ISP: no depender de componentes con clases que no usas, igual que no depender de interfaces con métodos que no usas.
4. ¿Qué pasa si te enfocas solo en REP y CCP y abandonas CRP?
   R: Los componentes se vuelven grandes y se generan demasiados releases innecesarios: los usuarios reciben versiones nuevas por cambios en partes que no usan.
5. ¿Por qué un proyecto joven suele priorizar el CCP?
   R: Porque al principio importa más la facilidad de desarrollo y de cambio que la reutilización; agrupar lo que cambia junto hace que cada cambio toque pocos componentes. La reutilización gana peso cuando otros proyectos empiezan a depender de él.
6. ¿Cómo puedes hacer cumplir los límites de un componente en TypeScript?
   R: Con un punto de entrada que exporta solo la API pública, el campo `exports` de `package.json`, reglas de lint que prohíben ciertos imports y referencias de proyecto de TypeScript que declaran qué paquete puede depender de cuál.

## Ejercicio

Toma un proyecto TypeScript tuyo (o el de la app de este curso) y haz un mapa de componentes: lista las carpetas o paquetes, y para cada uno anota (a) qué actor o razón de negocio lo cambia, (b) quién lo usa y (c) si se reutiliza fuera. Propón una reorganización que mejore el CCP en al menos una funcionalidad (todo lo de esa funcionalidad en una carpeta con `index.ts` como API pública) y añade una regla de ESLint (`no-restricted-imports` o similar) que impida importar archivos internos de esa carpeta desde fuera. **Terminado cuando:** tienes una tabla con el mapa, una funcionalidad movida a su propia carpeta con API pública, la regla de lint falla si alguien importa un archivo interno y todos los tests siguen pasando.

## Explícalo con tus palabras

Explica con el ejemplo del módulo prefabricado de baño por qué REP, CCP y CRP tiran en direcciones distintas y por qué el equilibrio cambia a lo largo de la vida de un proyecto.
