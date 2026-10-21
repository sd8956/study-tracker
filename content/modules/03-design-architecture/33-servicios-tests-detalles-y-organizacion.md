---
title: "Clean Architecture IV: servicios, el límite de los tests, los detalles y cómo organizar el código"
kind: lesson
hours: 2
sources: Clean Architecture, cap. 27 "Services: Great and Small" (pp. 185–191) | Clean Architecture, cap. 28 "The Test Boundary" (pp. 192–194) | Clean Architecture, parte VI, caps. 30–32 (pp. 209–219) | Clean Architecture, cap. 34 "The Missing Chapter" (pp. 225–240)
links: Simon Brown, "Package by component and architecturally-aligned testing" | https://www.codingthearchitecture.com/2015/03/08/package_by_component_and_architecturally_aligned_testing.html
---

## Objetivo

Desmitificar los servicios (no son una arquitectura por sí mismos), entender los tests como un componente más del sistema que necesita su propia API, tratar la base de datos, la web y los frameworks como **detalles**, y elegir una forma de organizar el código (por capa, por funcionalidad, puertos y adaptadores, por componente) que haga cumplir la arquitectura en lugar de depender solo de la disciplina.

## Estudio

### Servicios: grandes y pequeños

Las arquitecturas de servicios y microservicios se volvieron muy populares porque los servicios **parecen** estar fuertemente desacoplados y **parecen** permitir desarrollo y despliegue independientes. Martin cuestiona ambas ideas.

#### Los servicios no son una arquitectura

La arquitectura de un sistema la definen los **límites** que separan las políticas de alto nivel de los detalles y que siguen la **regla de dependencia**. Los servicios que simplemente separan comportamientos de la aplicación son poco más que **llamadas a función caras**. Algunos servicios son arquitectónicamente significativos y otros no, igual que algunas funciones cruzan límites arquitectónicos y la mayoría no.

#### La falacia del desacoplamiento

Es cierto que los servicios no comparten variables. Pero pueden estar acoplados por **recursos compartidos** (red, base de datos) y, sobre todo, por los **datos que intercambian**: si se agrega un campo a un registro que viaja entre servicios, todos los servicios que lo usan deben cambiar y ponerse de acuerdo sobre su significado. Y las interfaces de los servicios no son más formales ni rigurosas que las de las funciones.

#### La falacia del desarrollo y despliegue independientes

Se dice que cada servicio puede pertenecer a un equipo que lo desarrolla, despliega y opera de forma independiente. Algo hay de cierto, pero: los sistemas empresariales grandes también se construyen con monolitos y componentes; y el acoplamiento por datos hace que muchos cambios **requieran coordinar** varios servicios a la vez.

#### El problema de los gatitos

Martin lo ilustra con un sistema de taxis compuesto por servicios: `TaxiUI`, `TaxiFinder`, `TaxiSelector`, `TaxiDispatcher`, etc. Un día marketing propone un servicio nuevo: **entregar gatitos** a domicilio usando los taxis (algunos conductores son alérgicos, algunos usuarios también, ciertos taxis no pueden llevar animales). ¿Qué servicios hay que cambiar? **Todos**: el buscador debe filtrar conductores alérgicos, el selector debe considerar el tipo de pedido, el despachador debe incluir la información del gatito... Los servicios estaban desacoplados técnicamente, pero **una característica nueva atraviesa todos**: es un problema transversal (*cross-cutting concern*), y los servicios, por sí solos, no lo resuelven.

#### Objetos al rescate

La solución es aplicar los principios SOLID **dentro y alrededor** de los servicios: diseñar los componentes con polimorfismo para que el comportamiento nuevo se agregue con **plugins** sin modificar el código existente (OCP). Por ejemplo, la lógica de selección y despacho se diseña con clases abstractas base y el "viaje con gatito" se agrega como una extensión en un componente nuevo. Lo mismo vale para servicios: **servicios basados en componentes**, cuya estructura interna sigue la regla de dependencia y que pueden extenderse agregando componentes nuevos.

La conclusión de Martin: los servicios son útiles para la escalabilidad y el desarrollo, pero **no son en sí mismos elementos arquitectónicos**. La arquitectura la definen los límites y las dependencias **dentro** de los servicios y entre ellos. Un servicio puede ser un único componente rodeado por un límite arquitectónico, o puede estar compuesto internamente por varios componentes con sus propios límites.

### El límite de los tests

Martin hace una afirmación que cambia la forma de ver los tests: **los tests son parte del sistema** y participan en la arquitectura como cualquier otro componente.

- Arquitectónicamente, los tests son el componente **más externo**: siguen la regla de dependencia (dependen de todo lo que prueban, y nada depende de ellos), son muy detallados y concretos, y **nunca se despliegan**. Son, en ese sentido, el ejemplo más puro de código que no le importa a nadie más del sistema.
- Su función es apoyar el desarrollo, no la operación. Pero son tan importantes como cualquier otro componente.

#### El problema de los tests frágiles

Los tests que están **fuertemente acoplados** al sistema deben cambiar con él. Un cambio trivial en un componente (renombrar un método, mover un botón de la interfaz) puede romper cientos de tests. Este es el **problema de los tests frágiles**: hace que el sistema sea rígido, porque los desarrolladores empiezan a temer cambiar el código. Ejemplo típico: tests que manejan la aplicación a través de la interfaz gráfica; un cambio en el diseño de la página rompe toda la suite.

#### Diseñar para la testabilidad

La primera regla del diseño de software, sea para testabilidad o para cualquier otra cosa, es **no depender de cosas volátiles**. Las interfaces gráficas son volátiles; las suites que operan el sistema a través de la interfaz son frágiles. Diseña el sistema y los tests para que las reglas de negocio se puedan probar **sin la interfaz**.

#### La API de testing

La forma de lograrlo es crear una **API específica para los tests**: una API que permita a los tests verificar todas las reglas de negocio, con poderes especiales (saltarse la seguridad, forzar estados, evitar recursos costosos como la base de datos), y que sea un **superconjunto** de los casos de uso que ve la interfaz. Su objetivo es **desacoplar la estructura de los tests de la estructura de la aplicación**.

- **Acoplamiento estructural**: si tienes una clase de test por cada clase de producción y un método de test por cada método, cualquier refactorización de la estructura rompe los tests. Una API de testing permite que la estructura de producción evolucione (se divida en clases, se reorganice) sin romper los tests, que se escriben contra comportamientos.
- **Seguridad**: los poderes especiales de la API de testing pueden ser peligrosos si se despliegan; mantenla en un componente propio que no se despliegue a producción.

```ts
// Una API de testing: comportamientos, no clases internas
export function createTestApp() {
  const accounts = new Map<string, number>();
  const notifications: string[] = [];
  let now = new Date("2026-01-01T00:00:00Z");

  const app = buildBankingCore({
    accounts: { get: async (id) => accounts.get(id) ?? 0, set: async (id, v) => void accounts.set(id, v) },
    notify: async (m) => void notifications.push(m),
    clock: () => now,
  });

  return {
    ...app,                                                  // los mismos casos de uso que la UI
    givenBalance: (id: string, v: number) => accounts.set(id, v),   // poderes especiales
    advanceDays: (d: number) => { now = new Date(now.getTime() + d * 86_400_000); },
    notificationsSent: () => [...notifications],
  };
}
declare function buildBankingCore(deps: unknown): Record<string, (...a: never[]) => unknown>;
```

### Los detalles

La parte VI del libro tiene tres capítulos cortos con un mensaje común: la base de datos, la web y los frameworks son **detalles**.

#### La base de datos es un detalle

Ojo: Martin no dice que el **modelo de datos** sea un detalle (la estructura de los datos del dominio es muy importante); dice que la **base de datos** (el software, la tecnología de acceso) lo es. Argumentos:

- Las bases de datos relacionales se impusieron porque los discos eran lentos y había que organizar los datos para leerlos eficientemente (índices, tablas, cachés). Esa es una preocupación **técnica de almacenamiento**, no del negocio.
- Imagina que no hubiera discos y todo estuviera en memoria: organizarías los datos como listas, árboles, mapas, es decir, como estructuras de datos de tu programa. Ese es el modelo que importa a las reglas de negocio.
- ¿Y el rendimiento? Es una preocupación real, pero se resuelve **dentro** de los mecanismos de acceso a datos, no en la arquitectura general.

Martin cuenta una anécdota de una empresa a la que el área de marketing le exigía "tener una base de datos relacional" porque los clientes lo esperaban, aunque el sistema funcionaba perfectamente con archivos: la base de datos era una decisión de **marketing**, no de arquitectura.

#### La web es un detalle

La industria oscila como un **péndulo sin fin**: de mainframes centrales a computadoras personales, de servidores a clientes gruesos, de páginas renderizadas en el servidor a aplicaciones en el navegador, y de vuelta. Cada oscilación mueve la potencia de cómputo entre el centro y la periferia. Si tu arquitectura depende de dónde está esa potencia, cada oscilación te obliga a reescribir. La web es un **dispositivo de entrada/salida**, y desde los años 60 sabemos que conviene escribir aplicaciones **independientes de los dispositivos**. Martin reconoce que la independencia total de la interfaz no es fácil (la interacción web tiene sus particularidades), pero la separación entre la lógica de negocio y la interfaz siempre es posible y valiosa.

#### Los frameworks son detalles

Los autores de frameworks resuelven **sus** problemas y los de la comunidad, no necesariamente los tuyos. Martin describe la relación con un framework como un **matrimonio asimétrico**: tú te comprometes por completo con el framework (heredas de sus clases, adoptas su estructura), pero el framework no se compromete en absoluto contigo. Riesgos:

- La arquitectura del framework no siempre es limpia y te empuja a violar la regla de dependencia (por ejemplo, entidades que heredan de sus clases base).
- Puede ayudarte al principio y estorbarte cuando el producto madura.
- Puede evolucionar en direcciones que no te sirven, o quedar abandonado.
- Puede aparecer uno mejor al que quieras migrar.

**La solución**: no te cases con el framework. Úsalo, pero **mantenlo detrás de un límite arquitectónico**, en los círculos exteriores. No dejes que entre en las reglas de negocio. Usa el framework como un plugin. Martin admite excepciones: la librería estándar del lenguaje (y algunas librerías muy estables) son relaciones con las que sí te puedes casar, pero debe ser una decisión consciente.

```ts
// ❌ Casado con el framework: la entidad conoce decoradores del ORM y del validador
// @Entity() class Customer { @PrimaryColumn() id!: string; @IsEmail() @Column() email!: string; }

// ✅ La entidad es tuya; el framework vive en el adaptador
export class Customer {
  constructor(readonly id: string, readonly email: string) {
    if (!/^[^@\s]+@[^@\s]+$/.test(email)) throw new Error("Email inválido");
  }
}
// infrastructure/customer-row.ts: tipos y decoradores del ORM + funciones toDomain/toRow
```

### El capítulo que faltaba: cómo organizar el código

El capítulo 34, escrito por Simon Brown, aterriza todo en una pregunta muy concreta: ¿cómo organizo las carpetas y paquetes? El ejemplo: una librería en línea con el caso de uso "ver el estado de mis pedidos".

#### 1. Paquete por capa

`web/`, `service/`, `data/`: código partido horizontalmente por función técnica. Es la forma más rápida de empezar y la que muestran casi todos los tutoriales. Problemas: cuando el software crece, tres grandes cajones no bastan; **no grita nada** sobre el dominio (dos sistemas totalmente distintos se ven iguales); y, como verás, no impide atajos.

#### 2. Paquete por funcionalidad

Un paquete `orders/` con el controlador, el servicio, el repositorio y su implementación juntos. Corte vertical por concepto del dominio. Ventajas: grita el dominio y es fácil encontrar todo lo que cambia con un caso de uso. Problema: el dominio y la infraestructura siguen mezclados dentro del paquete.

#### 3. Puertos y adaptadores

Un **"adentro"** (dominio: `Orders` como interfaz con nombre del lenguaje ubicuo, servicios de dominio) y un **"afuera"** (web, base de datos, integraciones). Regla: el afuera depende del adentro, nunca al revés. Nota de estilo: el repositorio deja de llamarse `OrdersRepository` y pasa a llamarse `Orders`, porque **en el adentro todo se nombra con el lenguaje del dominio**.

#### 4. Paquete por componente

La propuesta de Simon Brown: agrupar toda la responsabilidad de una funcionalidad de grano grueso en un **componente** con una interfaz limpia, que encapsula tanto la lógica de negocio como el código de persistencia. Por ejemplo, un `OrdersComponent` con la lógica y el repositorio JDBC **dentro**, y el controlador web **fuera**, dependiendo solo de la interfaz pública del componente. Es parecido a los "servicios" pero dentro de un monolito: una forma de llegar a una arquitectura de microservicios desde un monolito bien modularizado.

```
Paquete por capa          Por funcionalidad      Puertos y adaptadores       Por componente
web/                      orders/                domain/                     web/
  OrdersController          OrdersController       Orders (interfaz)           OrdersController
service/                    OrdersService          OrdersService             orders/            ← componente
  OrdersService             OrdersRepository     web/                          OrdersComponent  (público)
  OrdersServiceImpl         JdbcOrdersRepo         OrdersController            OrdersComponentImpl (privado)
data/                                            database/                     OrdersRepository   (privado)
  OrdersRepository                                 JdbcOrders                  JdbcOrdersRepo     (privado)
  JdbcOrdersRepository
```

#### El diablo está en los detalles de implementación: la visibilidad

El punto más importante del capítulo: en muchos lenguajes, **declarar todo como público** destruye cualquier organización. Si todas las clases son públicas, los paquetes son solo **carpetas**, no mecanismos de encapsulamiento, y nada impide que un controlador use directamente el repositorio saltándose el servicio (el "atajo" que arruina la arquitectura por capas relajada). Las cuatro organizaciones anteriores son **idénticas** si todo es público.

La recomendación: usar los **modificadores de acceso** del lenguaje (o el sistema de módulos) para que el compilador haga cumplir la arquitectura. En el paquete por componente, solo la interfaz del componente es pública; el resto es privado al paquete.

En TypeScript no existe "privado al paquete" a nivel de lenguaje, pero tienes equivalentes:

| Mecanismo | Qué consigue |
| --- | --- |
| Un `index.ts` por componente que exporta solo la API pública | Convención clara de qué es público. |
| `exports` en `package.json` (en monorepos) | Impide importar rutas internas de otro paquete. |
| Reglas de lint (`no-restricted-imports`, `import/no-internal-modules`, `dependency-cruiser`) | Falla el build si alguien importa un archivo interno o viola la dirección de dependencias. |
| Referencias de proyecto de TypeScript | Declaran explícitamente qué paquete puede depender de cuál. |

#### Organización frente a encapsulamiento

Brown insiste: una arquitectura bien dibujada no sirve de nada si el código permite violarla. Si confías solo en la **disciplina** ("todos sabemos que el controlador no debe usar el repositorio"), tarde o temprano, con la presión del plazo, alguien tomará el atajo. Prefiere **que el compilador o el linter lo impidan**. También advierte contra el antipatrón de **"periferia"**: en puertos y adaptadores, los adaptadores (web y base de datos) pueden terminar comunicándose **directamente entre sí** por el "afuera", saltándose el dominio, si nada lo impide.

#### Otras formas de desacoplar

Además de los paquetes, existen sistemas de módulos más estrictos (como el sistema de módulos de Java 9) y la separación en **árboles de código fuente distintos** (por ejemplo, un repositorio o un paquete para el dominio y otro para la infraestructura), con su costo en complejidad de build.

#### El consejo que faltaba

> Tus mejores intenciones de diseño pueden destruirse en un instante si no consideras las complejidades de la estrategia de implementación.

Piensa en cómo **mapear** el diseño deseado a estructuras de código, cómo organizarlo y qué modos de desacoplamiento aplicar en tiempo de ejecución y de compilación. Deja opciones abiertas donde aplique, pero sé pragmático, y considera el tamaño del equipo, sus habilidades y la complejidad de la solución junto con las restricciones de tiempo y presupuesto. Y usa el compilador para hacer cumplir el estilo arquitectónico elegido.

### Analogía de construcción

Un **servicio** que se separa sin pensar en límites es como dividir una casa en varios edificios conectados por pasarelas: si mañana quieres agregar calefacción central (el "gatito"), tienes que intervenir todos los edificios igual. Los **tests** son los andamios de la obra: indispensables, nunca se entregan al cliente, y si están amarrados a la fachada definitiva, cualquier cambio de fachada obliga a rehacer todos los andamios. Los **frameworks** son la maquinaria alquilada: útil, pero no construyes los cimientos con forma de grúa. Y las **carpetas** sin encapsulamiento son como planos con puertas dibujadas en todas las paredes: el diseño dice "no se entra a la sala de máquinas desde el lobby", pero si la puerta existe, alguien la usará.

### Errores comunes

- **Creer que dividir en microservicios es diseñar una arquitectura.**
- **Servicios acoplados por un esquema de datos compartido** que nadie puede cambiar sin coordinar a todos.
- **Tests acoplados a la interfaz o a la estructura interna**, que se rompen con cada refactor.
- **Desplegar la API de testing** con sus poderes especiales a producción.
- **Entidades que heredan del framework o del ORM.**
- **Todo exportado y sin reglas de imports**: la arquitectura existe solo en el diagrama.

### Resumen

Los servicios no son una arquitectura: pueden estar acoplados por datos y las características transversales los atraviesan; los principios SOLID y los componentes con límites internos son lo que los hace extensibles. Los tests son el componente más externo del sistema; para evitar tests frágiles hay que diseñar para la testabilidad y crear una API de testing que desacople la estructura de los tests de la del código. La base de datos, la web y los frameworks son detalles: deben quedar detrás de límites arquitectónicos, sin casarse con ellos. Para organizar el código hay varias opciones (por capa, por funcionalidad, puertos y adaptadores, por componente), pero ninguna sirve si todo es público: hay que usar el sistema de módulos, la visibilidad y el linter para que la arquitectura se cumpla.

## Conceptos clave

- **Servicio arquitectónicamente significativo**: servicio que separa políticas de detalles siguiendo la regla de dependencia, no solo comportamientos.
- **Acoplamiento por datos**: dependencia entre servicios a través de los registros que intercambian.
- **Preocupación transversal (cross-cutting concern)**: característica que afecta a muchos componentes o servicios a la vez.
- **Servicio basado en componentes**: servicio cuya estructura interna sigue la regla de dependencia y se extiende con componentes nuevos.
- **Test frágil**: test fuertemente acoplado al sistema que se rompe con cambios triviales.
- **API de testing**: interfaz para los tests que verifica comportamientos con poderes especiales y desacopla la estructura de los tests de la del código.
- **Matrimonio asimétrico con el framework**: tú te comprometes con el framework, pero él no contigo.
- **Paquete por capa / por funcionalidad / puertos y adaptadores / por componente**: estrategias de organización del código.
- **Antipatrón de periferia**: adaptadores que se comunican directamente entre sí sin pasar por el dominio.

## Preguntas de repaso

1. ¿Por qué Martin dice que los servicios no son, por sí mismos, una arquitectura?
   R: Porque la arquitectura la definen los límites que separan políticas de detalles y siguen la regla de dependencia. Un servicio que solo separa comportamientos es una llamada a función cara; algunos servicios son arquitectónicamente significativos y otros no.
2. ¿Qué enseña el problema de los gatitos?
   R: Que una característica nueva puede atravesar todos los servicios aunque estén técnicamente desacoplados, obligando a cambiarlos todos. La solución es diseñar los servicios con componentes y polimorfismo para que el comportamiento nuevo se agregue como extensión (OCP), no repartiendo cambios por todos.
3. ¿Qué es un test frágil y cómo se evita?
   R: Un test tan acoplado al sistema (a su interfaz o a su estructura interna) que se rompe con cambios triviales, volviendo rígido el sistema. Se evita no dependiendo de cosas volátiles como la interfaz gráfica y escribiendo los tests contra una API de testing que expresa comportamientos.
4. ¿Por qué la base de datos es un detalle pero el modelo de datos no?
   R: Porque el modelo de datos (la estructura de la información del dominio) es central para las reglas de negocio, mientras que la base de datos es una tecnología de almacenamiento y acceso cuya razón de ser es técnica (discos lentos); las reglas solo necesitan funciones para leer y guardar.
5. ¿Qué significa el "matrimonio asimétrico" con un framework y qué propone Martin?
   R: Que tú te comprometes por completo con el framework (heredas de sus clases, adoptas su estructura) y él no se compromete contigo. Propone usarlo como un plugin detrás de un límite arquitectónico, sin dejar que entre en las reglas de negocio.
6. ¿Por qué las cuatro formas de organizar el código son equivalentes si todo es público?
   R: Porque los paquetes o carpetas dejan de encapsular: cualquier clase puede usar cualquier otra, y nada impide los atajos que violan la arquitectura. Solo la visibilidad, el sistema de módulos o reglas automáticas hacen que la organización se cumpla.
7. ¿Cómo puedes hacer cumplir la arquitectura en TypeScript?
   R: Con un `index.ts` por componente que exporte solo la API pública, el campo `exports` de `package.json`, reglas de lint sobre imports o herramientas como dependency-cruiser, y referencias de proyecto de TypeScript que declaran qué paquete puede depender de cuál.

## Ejercicio

Toma el proyecto de la sesión 30 (lista de lectura) o el de la 32 y: (a) reorganízalo como **paquete por componente** (`reading-list/` con un `index.ts` que exporta solo el componente y sus tipos públicos; el adaptador web fuera); (b) agrega una configuración de `dependency-cruiser` o reglas de ESLint que prohíban importar archivos internos del componente y que el dominio importe infraestructura, y comprueba que fallan si introduces una violación a propósito; (c) crea una **API de testing** (`createTestApp`) con al menos dos poderes especiales (fijar el reloj, precargar datos) y reescribe los tests de casos de uso contra ella. **Terminado cuando:** la herramienta de reglas falla con una violación intencional y pasa sin ella, los tests no importan ninguna clase interna del componente y puedes renombrar o dividir una clase interna sin tocar ningún test.

## Explícalo con tus palabras

Explica con la analogía de los planos con puertas en todas las paredes por qué una arquitectura que solo existe en un diagrama acaba violándose, y qué herramientas usarías para impedirlo.
