---
title: "SOLID II: Sustitución de Liskov, segregación de interfaces e inversión de dependencias"
kind: lesson
hours: 2
sources: Clean Architecture, cap. 9 "LSP" (pp. 75–79) | Clean Architecture, cap. 10 "ISP" (pp. 80–82) | Clean Architecture, cap. 11 "DIP" (pp. 83–86)
---

## Objetivo

Dominar los tres principios que gobiernan las abstracciones: LSP (las implementaciones intercambiables deben respetar el contrato), ISP (no depender de lo que no usas) y DIP (depender de abstracciones estables, no de concreciones volátiles), y verlos funcionar a nivel de clases y de arquitectura.

## Estudio

### LSP: el principio de sustitución de Liskov

En 1988, Barbara Liskov propuso una definición de subtipo basada en la sustitución. Dicho de forma sencilla:

> Si en cualquier programa que usa objetos de tipo T puedes poner un objeto de tipo S **sin que cambie el comportamiento** del programa, entonces S es un subtipo de T.

Fíjate en que la definición no habla de herencia ni de sintaxis, sino de **comportamiento**. Que una clase compile al implementar una interfaz no garantiza que sea sustituible.

#### Un ejemplo que cumple

Una aplicación de facturación usa una clase `License` con un método `calcFee()`. Hay dos variantes: `PersonalLicense` y `BusinessLicense`, cada una con su algoritmo. La facturación funciona igual con cualquiera de las dos: no pregunta cuál recibió. El diseño cumple LSP.

#### El problema del cuadrado y el rectángulo

El ejemplo clásico de violación: un `Square` que hereda de `Rectangle`. En geometría, todo cuadrado es un rectángulo, así que parece natural. Pero en el rectángulo el ancho y el alto **cambian por separado**, y en el cuadrado deben cambiar juntos.

```ts
class Rectangle {
  constructor(protected w: number, protected h: number) {}
  setWidth(w: number) { this.w = w; }
  setHeight(h: number) { this.h = h; }
  area() { return this.w * this.h; }
}

class Square extends Rectangle {
  constructor(side: number) { super(side, side); }
  setWidth(w: number) { this.w = w; this.h = w; }   // tiene que mantener el invariante
  setHeight(h: number) { this.w = h; this.h = h; }
}

// Un cliente escrito pensando en rectángulos
function stretch(r: Rectangle) {
  r.setWidth(5);
  r.setHeight(2);
  console.assert(r.area() === 10, `Esperaba 10 y obtuve ${r.area()}`); // falla con Square (4)
}
```

La única defensa del cliente sería preguntar `if (r instanceof Square)`, y en el momento en que el comportamiento del cliente depende del tipo concreto, los tipos **ya no son sustituibles**. La lección: "es un" en el mundo real no implica "es sustituible" en el código. La relación correcta depende del **comportamiento** que los clientes esperan.

¿Cómo se arregla? No con más herencia: con un contrato que ambos puedan cumplir. Si los clientes solo necesitan el área, una interfaz `Shape { area(): number }` con figuras **inmutables** elimina el problema.

```ts
interface Shape { area(): number }
const rectangle = (w: number, h: number): Shape => ({ area: () => w * h });
const square = (s: number): Shape => ({ area: () => s * s });
```

#### Reglas prácticas del contrato

Para que una implementación sea sustituible, respecto del contrato que esperan los clientes:

| Regla | Significado | Ejemplo de violación |
| --- | --- | --- |
| No exigir más (precondiciones) | No aceptes menos entradas que el contrato. | La interfaz acepta cualquier monto; tu implementación lanza error con montos > 1000. |
| No prometer menos (postcondiciones) | Entrega al menos lo que promete el contrato. | `save()` debería persistir y tu implementación lo ignora en silencio. |
| Mantener invariantes | Lo que siempre es cierto para el tipo base sigue siéndolo. | El ancho y el alto independientes del rectángulo. |
| No lanzar excepciones nuevas inesperadas | Los clientes manejan los errores del contrato. | Un repositorio que lanza `NotImplementedError` en `delete()`. |

Ese último es muy común: **una implementación que lanza "no soportado"** en métodos de la interfaz es casi siempre una violación de LSP, y también una señal de que la interfaz es demasiado grande (ISP).

#### LSP a nivel de arquitectura

Con los años, LSP pasó de ser una guía para la herencia a un principio general sobre **interfaces e implementaciones**, que pueden ser interfaces de Java, clases de Ruby con los mismos métodos o **servicios que responden a la misma API REST**.

El ejemplo de Martin: un agregador de servicios de taxi. El sistema elige un conductor y le envía una petición a la URI de despacho de su compañía, con los campos `pickupAddress`, `pickupTime` y `destination`. Todas las compañías deben respetar esa interfaz. Pero los programadores de la compañía más grande (Acme) abreviaron `destination` como `dest`. ¿Qué le pasa a la arquitectura?

La salida fácil es un `if (uri.startsWith("acme.com"))`. Ningún buen arquitecto lo permitiría: el nombre de una empresa en el código es fuente de errores misteriosos, problemas de seguridad y más `if` cuando Acme compre otra compañía. La solución seria es un módulo de construcción de comandos de despacho **guiado por configuración**, con el formato de cada URI en una base de datos. Es decir: una sola violación de sustituibilidad **contaminó la arquitectura** con un mecanismo complejo.

```ts
// Lo que una violación de LSP obliga a construir
interface DispatchFormat { pattern: string } // p. ej. "/pickupAddress/%s/pickupTime/%s/dest/%s"

export class DispatchCommandBuilder {
  constructor(private readonly formats: Map<string, DispatchFormat>, private readonly defaultFormat: DispatchFormat) {}
  build(baseUri: string, address: string, time: string, destination: string) {
    const host = new URL(baseUri).host;
    const fmt = this.formats.get(host) ?? this.defaultFormat;
    const values = [address, time, destination].map(encodeURIComponent);
    return baseUri + values.reduce((p, v) => p.replace("%s", v), fmt.pattern);
  }
}
```

### ISP: el principio de segregación de interfaces

Imagina una clase `OPS` con tres operaciones, y tres usuarios: el primero usa solo `op1`, el segundo solo `op2`, el tercero solo `op3`. En un lenguaje con tipos estáticos, el código del primer usuario **depende** de `op2` y `op3` aunque no las llame: un cambio en `op2` obliga a recompilar y redesplegar al primer usuario aunque nada de lo que le importa haya cambiado.

La solución es segregar las operaciones en interfaces específicas para cada usuario (`U1Ops`, `U2Ops`, `U3Ops`), que la clase `OPS` implementa. Ahora cada usuario depende solo de lo que usa.

```
Antes                              Después
User1 ─┐                           User1 ──▶ «U1Ops» op1 ─┐
User2 ─┼──▶ OPS (op1,op2,op3)      User2 ──▶ «U2Ops» op2 ─┼──▷ OPS
User3 ─┘                           User3 ──▶ «U3Ops» op3 ─┘
```

#### ¿Es un problema solo de lenguajes compilados?

Martin reconoce que el problema de recompilación depende del lenguaje: en lenguajes dinámicos no hay declaraciones que importar, así que no se fuerza la recompilación. Pero la motivación de fondo es más general:

> Es dañino depender de módulos que contienen más de lo que necesitas.

A nivel arquitectónico: tu sistema S usa un framework F, y los autores de F lo ataron a una base de datos D. S depende de F, que depende de D. Si D tiene funcionalidades que F no usa (y que a S no le importan), un cambio en ellas puede obligar a redesplegar F y por tanto S. Peor: **un fallo** en esas funcionalidades de D puede provocar fallos en F y en S. Depender de algo que trae equipaje que no necesitas te trae problemas que no esperabas.

#### ISP en TypeScript

En TypeScript, el tipado es **estructural**: un objeto cumple una interfaz si tiene sus miembros, sin declararlo. Esto hace que ISP sea muy barato de aplicar: el consumidor declara exactamente lo que necesita, y cualquier implementación más grande lo satisface.

```ts
// Una implementación grande
class UserRepository {
  async findById(id: string) { return { id, email: "a@b.com", name: "Ana" }; }
  async findByEmail(email: string) { return null; }
  async save(u: unknown) {}
  async delete(id: string) {}
  async listAdmins() { return []; }
}

// Cada consumidor declara solo lo que usa (interfaz del lado del cliente)
interface FindsUserById { findById(id: string): Promise<{ id: string; email: string } | null> }

export class PasswordResetMailer {
  constructor(private readonly users: FindsUserById) {}
  async send(userId: string) {
    const u = await this.users.findById(userId);
    if (!u) return false;
    console.log(`Enviando enlace a ${u.email}`);
    return true;
  }
}

new PasswordResetMailer(new UserRepository());                    // funciona
new PasswordResetMailer({ findById: async (id) => ({ id, email: "t@t" }) }); // y en tests, trivial
```

Ventajas inmediatas: los tests no necesitan simular cinco métodos que no se usan, y la firma del constructor documenta exactamente qué necesita la clase. También se conecta con Decorator: interfaces pequeñas hacen que los decoradores sean fáciles de escribir.

Una utilidad práctica: `Pick<T, K>` te permite derivar interfaces pequeñas de un tipo grande (`Pick<UserRepository, "findById">`), aunque es preferible que el consumidor defina su propia interfaz con nombres de su dominio.

### DIP: el principio de inversión de dependencias

El DIP dice que **los sistemas más flexibles son aquellos en los que las dependencias del código fuente se refieren solo a abstracciones, no a concreciones**. En TypeScript, que tus `import` apunten a módulos con interfaces o tipos abstractos, no a implementaciones concretas.

#### Estable contra volátil

Tomado como regla absoluta es irreal: siempre dependes de cosas concretas, como `String`, `Array` o `Date`. Pero esas son **estables**: cambian rara vez y de forma muy controlada. Lo que DIP quiere evitar es depender de elementos concretos **volátiles**: los módulos que tu equipo está desarrollando y que cambian con frecuencia.

Observa una asimetría importante: cada cambio en una interfaz abstracta obliga a cambiar sus implementaciones, pero los cambios en las implementaciones **no siempre** (ni siquiera normalmente) obligan a cambiar las interfaces. Por eso **las interfaces son menos volátiles que las implementaciones**. Los buenos diseñadores se esfuerzan por reducir la volatilidad de las interfaces: buscan agregar funcionalidad en las implementaciones sin tocar las interfaces.

#### Las cuatro reglas prácticas

1. **No hagas referencia a clases concretas volátiles.** Refiérete a interfaces abstractas. Esto también obliga a usar fábricas para crear objetos (porque crear exige conocer la clase concreta).
2. **No derives de clases concretas volátiles.** La herencia es la relación más fuerte y rígida del código; úsala con mucho cuidado.
3. **No sobrescribas funciones concretas.** Las funciones concretas suelen tener dependencias; al sobrescribirlas, las heredas. Haz la función abstracta y crea varias implementaciones.
4. **Nunca menciones el nombre de nada concreto y volátil.** Es la reformulación del principio completo.

#### Fábricas: cómo crear sin depender

Si `Application` necesita crear un `ConcreteImpl`, tiene que importarlo, y la dependencia apunta hacia lo concreto. La solución es una **fábrica abstracta**: `Application` usa la interfaz `ServiceFactory`, cuya implementación `ServiceFactoryImpl` crea el `ConcreteImpl`.

```
             LÍMITE ARQUITECTÓNICO
   abstracto          ┊            concreto
 ┌────────────┐       ┊
 │ Application│──usa──┊─▶ «interface» Service ◁───────── ConcreteImpl
 │            │──usa──┊─▶ «interface» ServiceFactory ◁── ServiceFactoryImpl ──crea──▶ ConcreteImpl
 └────────────┘       ┊                                    ▲
                      ┊                                    │ instancia
                      ┊                                  Main
```

La línea curva del diagrama original es un **límite arquitectónico**: separa lo abstracto de lo concreto. Todas las dependencias de código fuente lo cruzan en la misma dirección, **hacia lo abstracto**. El flujo de control va en sentido contrario (la aplicación llama al servicio concreto), y por eso se llama **inversión** de dependencias.

El lado abstracto contiene las reglas de negocio de alto nivel; el lado concreto, los detalles que esas reglas manipulan.

#### El componente main: donde vive lo concreto

No puedes eliminar todas las violaciones de DIP: en algún lugar hay que crear las clases concretas. Ese lugar es **`main`** (el composition root): el componente más sucio, que crea las implementaciones y las conecta. Lo verás a fondo en la sesión 32.

```ts
// domain/ — abstracto, estable
export interface Clock { now(): Date }
export interface InvoiceRepository { nextNumber(): Promise<number>; save(i: Invoice): Promise<void> }
export interface Invoice { number: number; issuedAt: Date; total: number }

export class IssueInvoice {
  constructor(private readonly repo: InvoiceRepository, private readonly clock: Clock) {}
  async execute(total: number): Promise<Invoice> {
    if (total <= 0) throw new Error("El total debe ser positivo");
    const invoice = { number: await this.repo.nextNumber(), issuedAt: this.clock.now(), total };
    await this.repo.save(invoice);
    return invoice;
  }
}

// infrastructure/ — concreto, volátil (importa de domain, nunca al revés)
// import { InvoiceRepository, Invoice } from "../domain/issue-invoice";
export class SqliteInvoiceRepository implements InvoiceRepository {
  async nextNumber() { return 1; /* SELECT MAX(number)+1 ... */ }
  async save(_i: Invoice) { /* INSERT ... */ }
}

// main.ts — lo único que conoce todo
// const issue = new IssueInvoice(new SqliteInvoiceRepository(), { now: () => new Date() });
```

No necesitas un contenedor de inyección de dependencias ni decoradores mágicos para aplicar DIP. Pasar las dependencias por constructor y ensamblarlas a mano en `main` es suficiente para la mayoría de los servicios, y tiene la ventaja de que todo el grafo de objetos se lee en un solo archivo. Un contenedor empieza a compensar cuando el grafo es muy grande o cuando necesitas ciclos de vida distintos (por petición, por proceso).

Fíjate en un detalle valioso: hasta el **reloj** es una dependencia. `new Date()` dentro de la regla de negocio la vuelve no determinista y difícil de testear; inyectar un `Clock` lo resuelve.

### Los cinco principios en conjunto

| Principio | Pregunta de revisión de código |
| --- | --- |
| SRP | ¿Cuántos actores pueden pedir cambios en este archivo? |
| OCP | ¿Agregar la próxima variante probable obliga a modificar código existente? |
| LSP | ¿Puede cualquier implementación sustituir a otra sin que el cliente pregunte cuál es? |
| ISP | ¿Este cliente depende de métodos que no usa? |
| DIP | ¿Hacia dónde apuntan los imports? ¿Hay algo concreto y volátil del lado de las reglas? |

### Analogía de construcción

**LSP**: si los planos dicen "puerta de 90 cm", cualquier puerta que cumpla la norma debe encajar en el marco; una puerta "especial" de 88 cm que obliga a rellenar con cuñas no es sustituible, y pronto el plano tendrá notas del tipo "excepto en el piso de Acme". **ISP**: el electricista no necesita el juego completo de planos de la obra, solo los planos eléctricos; si le das todo, cada cambio en la fachada le llega como "revisión de planos" que no le importa. **DIP**: los aparatos dependen de la norma del enchufe (abstracción estable), no del cableado concreto de cada pared (detalle volátil); y es la norma la que define la forma, no el aparato.

### Los tres principios en una revisión de código

Al revisar un pull request, tres preguntas resumen esta sesión: ¿alguna implementación nueva lanza errores o ignora en silencio operaciones de su interfaz? (LSP); ¿algún constructor recibe un objeto enorme del que solo usa uno o dos métodos? (ISP); ¿algún archivo de reglas de negocio importa un cliente de base de datos, un SDK o lee el reloj o el entorno directamente? (DIP). Si las tres respuestas son no, el diseño de abstracciones está en buena forma.

### Errores comunes

- **Herencia por taxonomía.** "Un pingüino es un ave, así que hereda `fly()`." Diseña por comportamiento esperado, no por clasificación.
- **Métodos que lanzan "no implementado".** Violan LSP y revelan una interfaz demasiado grande.
- **Interfaces "header" que copian la clase completa** (`IUserService` con los mismos 20 métodos). No segregan nada.
- **Interfaces del lado del proveedor.** La interfaz pertenece a quien la **usa** (el dominio), no a quien la implementa.
- **Llamar DIP a cualquier inyección.** Si el dominio recibe por constructor un `PrismaClient`, inyectaste, pero sigues dependiendo de lo concreto.
- **`new Date()`, `Math.random()` o `process.env` dentro de las reglas.** Son dependencias ocultas.

### Resumen

LSP exige que las implementaciones intercambiables respeten el comportamiento que esperan los clientes; una sola violación (como un servicio REST que no cumple el formato) puede contaminar la arquitectura con casos especiales. ISP dice que no dependas de más de lo que usas, desde las interfaces de una clase hasta los frameworks con equipaje. DIP orienta las dependencias del código hacia abstracciones estables, deja lo concreto y volátil del otro lado de un límite y concentra la creación de lo concreto en `main` y en fábricas.

## Conceptos clave

- **LSP**: un subtipo debe poder sustituir a su tipo base sin cambiar el comportamiento de los programas que lo usan.
- **Contrato**: precondiciones, postcondiciones e invariantes que los clientes esperan de una abstracción.
- **ISP**: los clientes no deben depender de operaciones que no usan.
- **Interfaz del lado del cliente**: interfaz definida por quien la consume, con solo lo que necesita.
- **DIP**: las dependencias del código fuente deben apuntar a abstracciones, no a concreciones volátiles.
- **Volatilidad**: frecuencia con la que un módulo cambia; las interfaces bien diseñadas son menos volátiles que sus implementaciones.
- **Límite arquitectónico**: línea que separa lo abstracto (reglas) de lo concreto (detalles), cruzada por las dependencias en una sola dirección.
- **Tipado estructural**: en TypeScript, un objeto cumple una interfaz si tiene sus miembros, sin declararlo explícitamente.

## Preguntas de repaso

1. ¿Por qué `Square` no es un subtipo correcto de `Rectangle` aunque geométricamente lo sea?
   R: Porque el rectángulo permite cambiar ancho y alto por separado, y el cuadrado debe cambiarlos juntos. Un cliente que fija ancho 5 y alto 2 espera un área de 10 y obtiene otra cosa; para defenderse tendría que preguntar el tipo concreto, lo que demuestra que no son sustituibles.
2. ¿Cómo afecta una violación de LSP a la arquitectura según el ejemplo de los taxis?
   R: Un servicio que no respeta la interfaz REST común obliga a introducir casos especiales; la forma segura de hacerlo es un mecanismo de construcción de comandos guiado por configuración, es decir, complejidad extra en todo el sistema por una sola violación.
3. ¿Cuál es la motivación profunda del ISP más allá de la recompilación?
   R: Que es dañino depender de módulos que contienen más de lo que necesitas: los cambios y los fallos en partes que no usas pueden obligarte a redesplegar o hacerte fallar, como un framework atado a una base de datos con funciones que no usas.
4. ¿Por qué el DIP tolera depender de `String` o `Array`?
   R: Porque son concretos pero estables: cambian raramente y de forma controlada. El DIP busca evitar depender de concreciones volátiles, como los módulos que el equipo desarrolla activamente.
5. ¿Por qué las interfaces son menos volátiles que las implementaciones?
   R: Porque cambiar una interfaz obliga a cambiar sus implementaciones, pero cambiar una implementación normalmente no obliga a cambiar la interfaz. Los buenos diseños añaden funcionalidad en las implementaciones sin tocar las interfaces.
6. ¿Qué papel cumplen las fábricas y el componente `main` en el DIP?
   R: Crear un objeto concreto exige conocer su clase. Las fábricas abstractas permiten crear sin depender de lo concreto, y `main` es el único lugar que instancia y conecta las implementaciones concretas, aceptando ahí la violación inevitable.
7. ¿Por qué el ISP es barato de aplicar en TypeScript?
   R: Por el tipado estructural: cada consumidor puede declarar una interfaz con solo lo que usa, y cualquier objeto con esos miembros la satisface sin declararlo, incluidos objetos literales en los tests.

## Ejercicio

Tienes una interfaz `Storage { read(k); write(k, v); delete(k); list(prefix); watch(k, cb) }` y tres implementaciones: `S3Storage`, `LocalDiskStorage` y `ReadOnlyCdnStorage` (que lanza error en `write` y `delete`). Rediseña aplicando ISP y LSP: interfaces pequeñas por capacidad (`Reader`, `Writer`, `Lister`, `Watcher`), cada implementación declara solo las que cumple de verdad, y tres consumidores (`ThumbnailService`, `BackupJob`, `ConfigReloader`) dependen solo de lo que usan. Añade un `Clock` inyectado en `BackupJob` para nombrar los respaldos por fecha. **Terminado cuando:** ninguna implementación lanza "no soportado", TypeScript impide pasar `ReadOnlyCdnStorage` a `BackupJob`, los tests con Vitest usan objetos literales mínimos como dobles y la carpeta de dominio no importa ninguna implementación concreta.

## Explícalo con tus palabras

Explica a alguien por qué "un cuadrado es un rectángulo" es cierto en geometría pero puede ser falso en el código, y qué te dice eso sobre cómo diseñar herencia e interfaces.
