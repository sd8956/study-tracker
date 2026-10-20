---
title: Clases pequeñas, cohesión y el impuesto de la herencia
kind: lesson
hours: 2
sources: Clean Code, cap. 10 Classes (pp. 166–182) | The Pragmatic Programmer, tema 31 Inheritance Tax (pp. 272–283)
---

## Objetivo

Diseñar clases pequeñas medidas por responsabilidades, con alta cohesión y organizadas para el cambio, y saber cuándo evitar la herencia en favor de interfaces, delegación y mixins. Al terminar vas a poder dividir una "clase dios" en TypeScript y justificar cada división.

## Estudio

### Organización de una clase

Martin propone un orden estándar dentro de una clase, inspirado en la convención de Java, que en TypeScript funciona igual de bien:

1. Constantes estáticas públicas.
2. Variables estáticas privadas.
3. Variables de instancia privadas (raramente hay buenas razones para variables públicas).
4. Constructor.
5. Funciones públicas.
6. Funciones privadas que usa cada función pública, justo después de ella (la stepdown rule de la sesión 5).

Así, la clase se lee como un artículo de periódico: lo público y conceptual arriba, los detalles abajo.

Sobre la **encapsulación**, Martin es pragmático: preferimos mantener todo privado, pero si un test necesita acceder a algo, a veces lo hacemos `protected` o accesible desde el paquete. Los tests mandan. Aun así, aflojar la encapsulación es siempre el último recurso; primero busca una forma de probar a través de la interfaz pública (lo verás en las sesiones de testing).

### Las clases deben ser pequeñas

La primera regla de las clases es la misma que la de las funciones: deben ser pequeñas. La diferencia es cómo se mide. En las funciones contamos líneas; **en las clases contamos responsabilidades**.

Martin muestra una clase `SuperDashboard` con unos 70 métodos públicos. Todos estaríamos de acuerdo en que es demasiado grande. Luego la reduce a solo cinco métodos (`getLastFocusedComponent`, `setLastFocused`, `getMajorVersionNumber`, `getMinorVersionNumber`, `getBuildNumber`) y pregunta: ¿ahora es pequeña? No: aunque tiene pocos métodos, tiene **dos responsabilidades**: seguir el foco de los componentes de la interfaz y conocer la información de versión.

Dos pruebas rápidas para detectar demasiadas responsabilidades:

- **El nombre.** Si no puedes darle a la clase un nombre conciso, probablemente es demasiado grande. Los nombres vagos (`Processor`, `Manager`, `Super`, `Helper`, `Utils`) suelen indicar que la clase acumula responsabilidades.
- **La descripción en 25 palabras.** Deberías poder describir la clase en unas 25 palabras sin usar "si", "y", "o" ni "pero". "El SuperDashboard da acceso al último componente con foco **y** también permite seguir los números de versión y de build" ya revela dos responsabilidades.

### El principio de responsabilidad única

El **principio de responsabilidad única** (SRP) dice que una clase o módulo debería tener **una, y solo una, razón para cambiar**. En el ejemplo, la información de versión cambiará cada vez que publiquemos el producto; el seguimiento del foco cambiará cuando cambie la interfaz. Son dos razones distintas, así que deberían ser dos clases:

```ts
// Antes: dos razones para cambiar
class SuperDashboard {
  getLastFocusedComponent(): Component { /* ... */ }
  setLastFocused(component: Component): void { /* ... */ }
  getMajorVersionNumber(): number { /* ... */ }
  getMinorVersionNumber(): number { /* ... */ }
  getBuildNumber(): number { /* ... */ }
}

// Después: una responsabilidad cada una
class Version {
  constructor(readonly major: number, readonly minor: number, readonly build: number) {}
}

class FocusTracker {
  #lastFocused?: Component;
  getLastFocused(): Component | undefined { return this.#lastFocused; }
  setLastFocused(component: Component): void { this.#lastFocused = component; }
}
```

`Version` ahora tiene un alto potencial de reutilización en otras aplicaciones.

SRP es uno de los conceptos más importantes del diseño orientado a objetos y, al mismo tiempo, uno de los más ignorados. ¿Por qué? Martin lo explica así: hacer que el software funcione y hacer que esté limpio son dos actividades distintas. La mayoría nos concentramos en que funcione y, cuando funciona, pasamos al siguiente problema, en lugar de volver a dividir lo que acumulamos.

También existe el miedo de que muchas clases pequeñas hagan el sistema más difícil de entender ("tengo que saltar entre veinte archivos"). La respuesta de Martin es una analogía: ¿prefieres tus herramientas organizadas en cajones con etiquetas claras, o todas metidas en un solo cajón? Un sistema con muchas clases pequeñas tiene la **misma cantidad de piezas** que uno con pocas clases grandes; la diferencia es que están organizadas y cada una se puede entender por separado.

(SOLID completo, con OCP, LSP, ISP y DIP en detalle, lo estudiarás en el módulo 03. Aquí te quedas con SRP y con la forma en que Clean Code conecta las clases pequeñas con OCP y DIP.)

### Cohesión

Una clase es **cohesiva** cuando sus métodos usan sus variables de instancia. En general, cuantas más variables manipula cada método, más cohesivo es ese método respecto a la clase. Una clase en la que cada variable es usada por cada método tiene máxima cohesión. No es posible ni deseable llegar siempre al máximo, pero sí queremos que la cohesión sea alta: significa que los métodos y las variables dependen mutuamente y forman un todo lógico.

```ts
// Alta cohesión: todos los métodos usan el estado de la pila
class Stack<T> {
  #top = 0;
  #elements: T[] = [];

  size(): number { return this.#top; }

  push(element: T): void {
    this.#elements[this.#top++] = element;
  }

  pop(): T {
    if (this.#top === 0) throw new EmptyStackError();
    return this.#elements[--this.#top];
  }
}
```

La señal de alarma es la contraria: cuando un subconjunto de métodos usa un subconjunto de variables que el resto no toca. Eso suele significar que **hay otra clase intentando salir** de la clase grande.

### Mantener la cohesión produce muchas clases pequeñas

Este es un razonamiento muy útil del capítulo. Imagina que tienes una función grande con muchas variables locales y quieres extraer una parte en una función pequeña. Esa parte usa cuatro de las variables. ¿Las pasas como argumentos a la nueva función? Puedes convertirlas en variables de instancia de la clase y así no pasas nada. Pero ahora la clase tiene variables que solo usan unos pocos métodos: la cohesión baja.

La salida es la clave: **si unos pocos métodos comparten ciertas variables, ¿no deberían ser una clase propia?** Cuando las clases pierden cohesión, divídelas. Así, extraer funciones pequeñas a partir de funciones grandes produce, naturalmente, varias clases pequeñas y cohesivas.

Martin lo ilustra con un programa de Knuth que imprime números primos: una función enorme se convierte en tres clases (una que imprime en columnas, otra que genera los primos y otra que orquesta). El programa refactorizado es más largo, pero cada parte se entiende sola, y se puede cambiar el formato de impresión sin tocar el cálculo de primos.

```ts
// Antes: una clase que calcula, formatea y paginaba todo
class PrimePrinter { /* 120 líneas mezclando cálculo, formato y paginación */ }

// Después: tres responsabilidades, tres clases
class PrimeGenerator {
  static generate(count: number): number[] { /* ... */ return []; }
}

class ColumnPrinter {
  constructor(private rowsPerPage: number, private columnsPerPage: number, private title: string) {}
  print(values: number[]): string { /* ... */ return ""; }
}

function printPrimes(count: number): string {
  const primes = PrimeGenerator.generate(count);
  return new ColumnPrinter(50, 4, `Los primeros ${count} primos`).print(primes);
}
```

### Organizar para el cambio

La mayoría de los sistemas cambian continuamente, y cada cambio es un riesgo de que el resto deje de funcionar. Una clase bien organizada reduce ese riesgo.

Martin muestra una clase `Sql` que genera sentencias SQL con métodos `create`, `insert`, `selectAll`, `findByKey`, `select`... y varios métodos privados auxiliares. Tiene dos razones para cambiar: cuando añadimos un tipo de sentencia nuevo (por ejemplo, `update`) y cuando cambiamos los detalles de una sentencia existente (por ejemplo, subconsultas en `select`). Además, algunos métodos privados solo los usa un método público, otra pista de que hay que dividir.

La solución es una clase abstracta `Sql` y una subclase por tipo de sentencia (`CreateSql`, `SelectSql`, `InsertSql`...). Ahora:

- Añadir `UpdateSql` **no toca** ninguna clase existente.
- Cambiar `SelectSql` no puede romper `InsertSql`.
- Cada clase es pequeña y fácil de probar.

Esto es el **principio abierto/cerrado** (OCP): las clases deberían estar abiertas a la extensión y cerradas a la modificación. Añades comportamiento creando código nuevo, no modificando código que ya funciona.

```ts
abstract class Sql {
  constructor(protected readonly table: string, protected readonly columns: Column[]) {}
  abstract generate(): string;
}

class CreateSql extends Sql {
  generate(): string { /* ... */ return ""; }
}

class SelectSql extends Sql {
  generate(): string { /* ... */ return ""; }
}

// Añadir UPDATE = añadir una clase; nada más cambia.
class UpdateSql extends Sql {
  constructor(table: string, columns: Column[], private readonly values: unknown[]) {
    super(table, columns);
  }
  generate(): string { /* ... */ return ""; }
}
```

(Fíjate en que aquí la herencia es muy superficial: una clase base abstracta con un único método abstracto. Enseguida verás por qué las jerarquías profundas son peligrosas, y en TypeScript esto mismo se podría expresar con una interfaz `SqlStatement { generate(): string }`.)

### Aislarse del cambio

El último apartado del capítulo trata las dependencias. Las clases concretas contienen detalles de implementación; las abstracciones representan conceptos. Un cliente que depende de detalles concretos está en riesgo cuando esos detalles cambian. Martin pone un ejemplo: una clase `Portfolio` que depende de un API externo `TokyoStockExchange` para obtener el precio de las acciones. Probar `Portfolio` es muy difícil, porque el precio cambia cada cinco minutos.

La solución es introducir una interfaz `StockExchange` con un método `currentPrice(symbol)`, hacer que `Portfolio` dependa de la interfaz y pasarla en el constructor:

```ts
interface StockExchange {
  currentPrice(symbol: string): number;
}

class Portfolio {
  readonly #holdings = new Map<string, number>();
  constructor(private readonly exchange: StockExchange) {}

  add(shares: number, symbol: string): void {
    this.#holdings.set(symbol, (this.#holdings.get(symbol) ?? 0) + shares);
  }

  value(): number {
    let total = 0;
    for (const [symbol, shares] of this.#holdings) total += shares * this.exchange.currentPrice(symbol);
    return total;
  }
}

// En el test, un intercambio fijo
class FixedStockExchangeStub implements StockExchange {
  constructor(private readonly prices: Record<string, number>) {}
  currentPrice(symbol: string): number { return this.prices[symbol]; }
}

it("calcula el valor del portafolio", () => {
  const portfolio = new Portfolio(new FixedStockExchangeStub({ MSFT: 100 }));
  portfolio.add(5, "MSFT");
  expect(portfolio.value()).toBe(500);
});
```

Si un sistema está lo bastante desacoplado como para probarse así, también es más flexible y reutilizable. Esta forma de depender de abstracciones y no de detalles es el **principio de inversión de dependencias** (DIP), y es la base de los adaptadores que viste en la sesión 9.

### El impuesto de la herencia

*The Pragmatic Programmer* dedica un tema provocador a la herencia: "¿Usas un lenguaje orientado a objetos? ¿Usas herencia? ¡Pues para!". Exagera a propósito, pero su argumento es serio.

Los autores explican que la herencia se usa por dos razones muy distintas:

- **Para reutilizar código**: "mi clase `Car` hereda de `Vehicle` para no reescribir `move()`".
- **Para modelar tipos**: "un `Car` es un tipo de `Vehicle`, y quiero poder usarlo donde se espera un `Vehicle`".

Ambas presentan problemas.

**Herencia para reutilizar código: es acoplamiento.** La subclase está acoplada a la clase padre, a la clase padre de la padre, y así sucesivamente. Si el padre cambia la implementación de un método del que dependes, o su orden de llamadas internas, tu subclase se rompe, aunque no hayas tocado nada. Además, el código que usa la subclase también queda acoplado a todos sus ancestros: cualquier método público de cualquier ancestro es parte de su interfaz.

```ts
class Vehicle {
  #speed = 0;
  stop(): void { this.moveAt(0); }
  moveAt(speed: number): void { this.#speed = speed; }
}

class Car extends Vehicle {
  info(): string { return "Soy un coche"; }
  // Supón que Car sobrescribe moveAt para registrar telemetría.
  // Si un día Vehicle.stop() deja de llamar a moveAt(0) y cambia el estado directamente,
  // la telemetría de Car deja de registrar las paradas sin que nadie toque Car.
}
```

Este problema tiene nombre en la literatura: el **problema de la clase base frágil**.

**Herencia para modelar tipos: el árbol se vuelve un bosque.** Cuando intentas modelar el mundo con jerarquías, las excepciones aparecen enseguida. ¿Un `Car` es un `Vehicle` y también un `Asset` (un activo de la empresa) y también un `InsuredItem`? Muchos lenguajes no permiten herencia múltiple, y donde se permite, los diagramas se vuelven telarañas. Cada capa añade acoplamiento y complejidad.

### Las alternativas

El libro propone tres técnicas que casi siempre funcionan mejor que la herencia:

**1. Interfaces y protocolos para expresar polimorfismo.** Si lo que quieres es poder tratar distintos tipos de la misma forma, declara una interfaz con el comportamiento compartido. Cada clase la implementa sin heredar ningún código. En TypeScript, además, el tipado es **estructural**: cualquier objeto con la forma correcta cumple la interfaz, aunque no lo declare.

```ts
interface Drivable {
  getSpeed(): number;
  stop(): void;
}

interface Locatable {
  getLocation(): Coordinate;
  locationIsValid(): boolean;
}

class Car implements Drivable, Locatable { /* ... */ }
class Phone implements Locatable { /* ... */ }

function trackAll(items: Locatable[]): Coordinate[] {
  return items.filter((item) => item.locationIsValid()).map((item) => item.getLocation());
}
```

Un `Car` puede ser `Drivable` y `Locatable` sin ninguna jerarquía.

**2. Delegación: "tiene un" en lugar de "es un".** Si quieres reutilizar comportamiento, contén un objeto que lo tenga y delega en él. El libro muestra un ejemplo con un framework de persistencia: en lugar de que `Account` herede de `PersistenceBaseClass` (y exponga todos sus métodos, incluso los que no deberían usarse), `Account` contiene un repositorio y expone solo lo necesario.

```ts
// Herencia: Account expone TODA la API de la clase base (findAll, deleteAll...)
class Account extends PersistenceBaseClass {}

// Delegación: Account expone solo lo que tiene sentido
class AccountRecord {
  constructor(private readonly repository: Repository<AccountData>) {}
  find(id: string): Promise<AccountData | undefined> {
    return this.repository.findById(id);
  }
  // no hay deleteAll: los clientes no pueden borrar todas las cuentas por accidente
}
```

**3. Mixins y traits.** Cuando quieres compartir funcionalidad entre clases sin una jerarquía, algunos lenguajes ofrecen mixins o traits: conjuntos de funciones que se "mezclan" en una clase. En TypeScript se pueden expresar como funciones que reciben una clase y devuelven una clase extendida, o, de forma más simple, como funciones puras que operan sobre una interfaz.

```ts
type Constructor<T = object> = new (...args: any[]) => T;

function Timestamped<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    createdAt = new Date();
  };
}

class Document {}
const TimestampedDocument = Timestamped(Document);
```

(Aquí el `any[]` es la convención que exige TypeScript para el constructor de un mixin; es un caso en el que `any` está justificado.)

Con frecuencia, en TypeScript la forma más simple de "mixin" es una función libre que opera sobre una interfaz: `isExpired(item: { expiresAt: Date }, now: Date)`. Sin clases, sin jerarquía.

### ¿Nunca herencia?

No es una prohibición absoluta. La herencia superficial para implementar un patrón concreto (una clase base abstracta con un método plantilla, como el `Sql` de Martin, o extender `Error` para crear excepciones propias) es razonable. La regla práctica:

| Si quieres... | Usa |
| --- | --- |
| Tratar tipos distintos de la misma forma | Interfaces (o uniones discriminadas en TS) |
| Reutilizar comportamiento | Composición y delegación |
| Compartir funcionalidad transversal | Funciones sobre interfaces o mixins |
| Crear tus propios errores | `class MyError extends Error` (herencia superficial) |
| Una jerarquía de más de dos niveles | Casi nunca: replantea el diseño |

### Errores comunes

- **Medir el tamaño de una clase en líneas** en lugar de en responsabilidades.
- **Convertir variables locales en campos** para no pasar argumentos, bajando la cohesión sin dividir la clase.
- **Clases `Utils`, `Helper`, `Manager`** que acumulan funciones sin relación.
- **Heredar solo para reutilizar un par de métodos**, acoplándote a toda la jerarquía.
- **Exponer la API completa de una clase base** (como `deleteAll`) cuando solo necesitabas parte de ella.

## Conceptos clave

- **Responsabilidad**: razón para cambiar; las clases se miden por responsabilidades, no por líneas.
- **SRP**: una clase debe tener una sola razón para cambiar.
- **Cohesión**: grado en que los métodos de una clase usan sus variables de instancia.
- **OCP**: abierto a la extensión, cerrado a la modificación; se añade comportamiento con código nuevo.
- **DIP**: depender de abstracciones, no de detalles concretos.
- **Clase base frágil**: cambios en una clase padre que rompen subclases que no se tocaron.
- **Delegación (tiene un)**: reutilizar comportamiento conteniendo un objeto en lugar de heredar de él.

## Preguntas de repaso

1. ¿Cómo se mide el tamaño de una clase según Clean Code y qué dos pruebas rápidas propone?
   R: Por responsabilidades, no por líneas. Las pruebas: poder darle un nombre conciso (los nombres vagos como Manager o Processor son señal de alarma) y poder describirla en unas 25 palabras sin usar "si", "y", "o" ni "pero".
2. ¿Qué es la cohesión y qué señal indica que una clase debería dividirse?
   R: La medida en que los métodos usan las variables de instancia de la clase. Cuando un subconjunto de métodos usa un subconjunto de variables que el resto no toca, hay otra clase intentando salir y conviene dividirla.
3. ¿Por qué mantener la cohesión lleva naturalmente a muchas clases pequeñas?
   R: Porque al extraer funciones de una función grande, las variables compartidas tienden a convertirse en campos usados por pocos métodos, lo que baja la cohesión. La solución es separar esos métodos y campos en una clase propia, y repetir ese proceso produce varias clases pequeñas y cohesivas.
4. Explica cómo el ejemplo de `Portfolio` y `StockExchange` muestra el principio de inversión de dependencias.
   R: `Portfolio` dependía de una clase concreta que consultaba precios reales, lo que lo hacía imposible de probar. Al depender de una interfaz `StockExchange` inyectada en el constructor, puede usar un stub con precios fijos en los tests y cualquier implementación real en producción: depende de una abstracción, no de un detalle.
5. ¿Cuáles son los dos usos de la herencia que critica The Pragmatic Programmer y qué problema tiene cada uno?
   R: Reutilizar código, que acopla la subclase a la implementación de todos sus ancestros (clase base frágil), y modelar tipos, que produce jerarquías que no encajan con el mundo real y crecen en complejidad cuando un objeto pertenece a varias categorías.
6. ¿Qué tres alternativas a la herencia propone el libro? Da un ejemplo en TypeScript de una.
   R: Interfaces para expresar polimorfismo, delegación (tiene un en lugar de es un) y mixins o traits. Ejemplo de delegación: `AccountRecord` contiene un `Repository<AccountData>` y expone solo `find`, en lugar de heredar de una clase base de persistencia que expondría `deleteAll`.

## Ejercicio

Escribe en TypeScript una clase `UserService` "dios" de unos 100 líneas que registre usuarios, valide contraseñas, envíe correos de bienvenida, genere informes CSV de usuarios y calcule estadísticas de actividad, y que herede de una clase `BaseService` con métodos genéricos de log y base de datos. Después: (a) lista sus responsabilidades en una tabla con su "razón para cambiar"; (b) divídela en clases cohesivas siguiendo SRP; (c) elimina la herencia de `BaseService` usando delegación e interfaces inyectadas; (d) escribe al menos un test por clase nueva usando stubs en lugar de dependencias reales. Terminado cuando cada clase se puede describir en 25 palabras sin "y", no queda ninguna herencia salvo la de errores propios y cada test corre sin red, disco ni base de datos.

## Explícalo con tus palabras

Explica a alguien por qué "un coche es un vehículo" parece un buen motivo para heredar y por qué, en código, "un coche tiene un motor" suele ser un diseño más fácil de cambiar.
