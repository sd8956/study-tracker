---
title: Objetos, estructuras de datos y desacoplamiento
kind: lesson
hours: 2
sources: Clean Code, cap. 6 Objects and Data Structures (pp. 124–132) | The Pragmatic Programmer, tema 28 Decoupling (pp. 228–238)
---

## Objetivo

Entender la diferencia entre objetos (que esconden datos y exponen comportamiento) y estructuras de datos (que exponen datos y no tienen comportamiento), cuándo conviene cada uno y cómo reducir el acoplamiento con la Ley de Demeter, "tell, don't ask" y evitando datos globales. Al terminar vas a poder reconocer y desarmar un "choque de trenes" en TypeScript.

## Estudio

### Abstracción de datos: esconder la implementación no es poner getters

Hay una confusión muy extendida: creer que encapsular es declarar los campos como privados y añadir un getter y un setter para cada uno. Eso no esconde nada; solo añade ceremonia. Compara estas dos interfaces para un punto:

```ts
// Expone la implementación: sabemos que son coordenadas cartesianas
class Point {
  x = 0;
  y = 0;
}

// Expone una abstracción: puede ser cartesiano o polar por dentro
interface Point {
  getX(): number;
  getY(): number;
  setCartesian(x: number, y: number): void;
  getR(): number;
  getTheta(): number;
  setPolar(r: number, theta: number): void;
}
```

La segunda interfaz no revela cómo se guarda el punto. Además, impone una política de acceso: puedes leer coordenadas por separado, pero tienes que establecerlas juntas, como una operación atómica.

Martin da otro ejemplo, el de un vehículo:

```ts
// Concreto: detalles de implementación
interface Vehicle {
  getFuelTankCapacityInGallons(): number;
  getGallonsOfGasoline(): number;
}

// Abstracto: el concepto que importa al usuario
interface Vehicle {
  getPercentFuelRemaining(): number;
}
```

En la versión concreta, cualquier código cliente sabe que el vehículo usa galones de gasolina. Si mañana el vehículo es eléctrico, todos los clientes cambian. En la abstracta, el cliente solo conoce el concepto "porcentaje de energía que queda". La lección: **no expongas los detalles de tus datos; expón abstracciones**. Y eso requiere pensar, no añadir getters automáticamente.

### La antisimetría entre datos y objetos

Esta es la idea central del capítulo:

- Los **objetos** esconden sus datos detrás de abstracciones y exponen funciones que operan sobre esos datos.
- Las **estructuras de datos** exponen sus datos y no tienen funciones significativas.

Son opuestos casi perfectos, y cada uno facilita lo que al otro le cuesta. Martin lo ilustra con figuras geométricas.

**Estilo procedural (estructuras de datos + funciones que las procesan):**

```ts
type Square = { kind: "square"; topLeft: Point; side: number };
type Rectangle = { kind: "rectangle"; topLeft: Point; height: number; width: number };
type Circle = { kind: "circle"; center: Point; radius: number };
type Shape = Square | Rectangle | Circle;

function area(shape: Shape): number {
  switch (shape.kind) {
    case "square": return shape.side ** 2;
    case "rectangle": return shape.height * shape.width;
    case "circle": return Math.PI * shape.radius ** 2;
  }
}
```

**Estilo orientado a objetos (polimorfismo):**

```ts
interface Shape {
  area(): number;
}

class Square implements Shape {
  constructor(private topLeft: Point, private side: number) {}
  area(): number { return this.side ** 2; }
}

class Circle implements Shape {
  constructor(private center: Point, private radius: number) {}
  area(): number { return Math.PI * this.radius ** 2; }
}
```

¿Cuál es mejor? Depende de **qué tipo de cambio esperas**:

| Si añades... | Estilo procedural | Estilo orientado a objetos |
| --- | --- | --- |
| Una **función nueva** (por ejemplo, `perimeter`) | Fácil: una función nueva, las estructuras no cambian | Difícil: hay que tocar todas las clases |
| Un **tipo nuevo** (por ejemplo, `Triangle`) | Difícil: hay que tocar todas las funciones | Fácil: una clase nueva, el resto no cambia |

Martin lo resume así: el código procedural facilita añadir funciones sin cambiar las estructuras; el código orientado a objetos facilita añadir clases sin cambiar las funciones. Y viceversa para lo difícil. Por eso los programadores maduros saben que la idea de que "todo es un objeto" es un mito: a veces quieres estructuras de datos simples con procedimientos que operan sobre ellas.

En TypeScript, que mezcla paradigmas, esta decisión aparece constantemente. Los tipos de un JSON que viene de una API (DTO) son estructuras de datos, y está bien que lo sean. Una entidad con reglas de negocio (un `Order` que no permite añadir productos si ya se pagó) es un objeto, y debe esconder sus datos.

### La Ley de Demeter

La Ley de Demeter es una heurística que dice que **un módulo no debería conocer las entrañas de los objetos que manipula**. Más formalmente: un método `f` de una clase `C` solo debería llamar a métodos de:

- `C` misma,
- objetos creados por `f`,
- objetos pasados como argumento a `f`,
- objetos guardados en campos de `C`.

Lo que **no** debería hacer es llamar a métodos de los objetos que devuelven esas llamadas. Dicho de forma coloquial: habla con tus amigos, no con los amigos de tus amigos.

### Choques de trenes

El síntoma más visible de violar Demeter es la cadena de llamadas, que Martin llama **choque de trenes** (*train wreck*) porque parece una fila de vagones:

```ts
const outputDir = ctxt.getOptions().getScratchDir().getAbsolutePath();
```

Este código conoce que `ctxt` tiene opciones, que las opciones tienen un directorio temporal, y que el directorio tiene una ruta absoluta. Si cualquiera de esos eslabones cambia, este código se rompe. Partirlo en variables mejora la legibilidad, pero no el acoplamiento:

```ts
const opts = ctxt.getOptions();
const scratchDir = opts.getScratchDir();
const outputDir = scratchDir.getAbsolutePath();
```

Un matiz importante: **si son estructuras de datos, Demeter no aplica**. `config.database.host` es perfectamente razonable si `config` es un objeto de configuración plano sin comportamiento. Demeter trata de no depender de la estructura interna de **objetos** que deberían esconderla.

### Híbridos: lo peor de ambos mundos

A veces aparecen estructuras que son mitad objeto y mitad estructura de datos: tienen funciones que hacen cosas importantes, pero también getters y setters públicos que exponen todo su estado. Martin las llama **híbridos** y los considera lo peor de ambos mundos: es difícil añadir funciones nuevas (como en los objetos) y también es difícil añadir estructuras nuevas (como en el estilo procedural). Suelen indicar que el diseñador no tenía claro qué estaba construyendo.

### Esconder la estructura: pregúntate por qué necesitas el dato

¿Cómo se arregla el choque de trenes? La clave es preguntar **para qué** querías la ruta absoluta del directorio temporal. En el ejemplo de Martin, era para crear un archivo temporal con cierto nombre. Entonces, que lo haga el objeto que tiene la información:

```ts
// En lugar de navegar por la estructura...
const outputDir = ctxt.getOptions().getScratchDir().getAbsolutePath();
const filePath = `${outputDir}/${className.replaceAll(".", "/")}.class`;
const stream = fs.createWriteStream(filePath);

// ...pídele al objeto lo que necesitas
const stream = ctxt.createScratchFileStream(classFileName);
```

Ahora el contexto esconde su estructura interna, y el cliente solo dice lo que quiere.

### Tell, don't ask

*The Pragmatic Programmer* llega a la misma conclusión desde el tema del **desacoplamiento**. Su consejo se resume en "**dile, no preguntes**" (*tell, don't ask*): no pidas datos a un objeto para tomar una decisión por él y luego actualizar su estado; dile lo que quieres que haga y deja que él decida cómo.

El libro muestra un ejemplo de un pedido de un cliente con un descuento:

```ts
// Preguntar: el código cliente conoce y manipula el interior de order y customer
function applyDiscount(customer: Customer, orderId: string, discount: number): void {
  const totals = customer.orders.find(orderId).getTotals();
  totals.grandTotal = totals.grandTotal - discount;
  totals.discount = discount;
}
```

Este código conoce la estructura de `customer`, de su colección de pedidos, de un pedido y de sus totales. Además, deja que cualquiera modifique `grandTotal` sin pasar por las reglas del pedido (¿se puede aplicar un descuento mayor que el total?, ¿se puede aplicar dos veces?).

```ts
// Decir: cada objeto es responsable de su estado
function applyDiscount(customer: Customer, orderId: string, discount: number): void {
  customer.findOrder(orderId).applyDiscount(discount);
}

class Order {
  #totals: Totals;
  applyDiscount(discount: number): void {
    if (discount > this.#totals.grandTotal) throw new InvalidDiscount();
    this.#totals = this.#totals.withDiscount(discount);
  }
}
```

El pedido protege sus invariantes. El libro añade una regla práctica derivada de Demeter: **no encadenes llamadas a métodos**. Intenta no tener más de un punto cuando accedes a algo. Y aclara que esto aplica a cosas que pueden cambiar: encadenar llamadas sobre una librería estable del lenguaje (`str.trim().toLowerCase()` o `array.filter(...).map(...)`) es aceptable, porque esas APIs no van a cambiar bajo tus pies y devuelven valores, no estructura interna.

### Los males de lo global

El tema de desacoplamiento del libro pragmático va más allá de Demeter. Otra fuente fuerte de acoplamiento son los **datos globales**: cada pieza de datos global es como si cada método de tu aplicación recibiera un parámetro extra. Cualquier código puede leerla y cambiarla, así que cualquier código puede romper a cualquier otro.

Formas de lo global que a veces pasan desapercibidas:

| Forma | Ejemplo en TypeScript |
| --- | --- |
| Variable global o de módulo mutable | `export let currentUser: User;` |
| Singleton | `Database.getInstance()` usado por todas partes |
| Recursos externos | Una base de datos, un archivo de configuración o un servicio compartido |
| Variables de entorno leídas en cualquier lugar | `process.env.API_KEY` disperso por el código |

El consejo pragmático: **si es lo bastante importante como para ser global, envuélvelo en una API**. En lugar de leer `process.env` en veinte archivos, crea un módulo de configuración que lea y valide las variables una sola vez y exporte un objeto tipado:

```ts
// config.ts: único lugar que conoce process.env
const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
};

export const config = Object.freeze({
  apiKey: required("NAN_API_KEY"),
  port: Number(process.env.PORT ?? 3000),
});
```

Así, si cambia el mecanismo (por ejemplo, las claves pasan a un gestor de secretos), cambias un archivo. Y en los tests puedes inyectar otra configuración.

### Herencia y acoplamiento

El libro pragmático también menciona que la herencia es una forma de acoplamiento: una subclase está atada a los detalles de su clase padre. Lo verás en profundidad en la sesión 12 ("impuesto de la herencia").

### Data Transfer Objects y Active Record

La forma pura de una estructura de datos es una clase con campos públicos y sin funciones: un **DTO** (*Data Transfer Object*). Son útiles en las fronteras del sistema: al leer de una base de datos, al recibir una petición HTTP, al parsear un mensaje. En TypeScript, normalmente son tipos o interfaces (`type CreateUserDto = { name: string; email: string }`) que a menudo se validan en tiempo de ejecución con una librería de esquemas.

Los **Active Records** son DTOs con métodos de navegación como `save` o `find`. El error común es meterles reglas de negocio, lo que los convierte en híbridos. La solución que propone Martin: trata el Active Record como una estructura de datos y crea objetos separados que contengan las reglas de negocio y escondan sus datos internos (que pueden ser instancias del Active Record).

```ts
// DTO en la frontera
type OrderRow = { id: string; status: string; total_cents: number };

// Objeto de dominio con reglas
class Order {
  private constructor(private readonly id: string, private status: OrderStatus, private totalCents: number) {}

  static fromRow(row: OrderRow): Order {
    return new Order(row.id, parseStatus(row.status), row.total_cents);
  }

  cancel(): void {
    if (this.status === "shipped") throw new CannotCancelShippedOrder(this.id);
    this.status = "cancelled";
  }

  toRow(): OrderRow {
    return { id: this.id, status: this.status, total_cents: this.totalCents };
  }
}
```

Esta separación entre DTO y modelo de dominio es la semilla de lo que verás como "adaptadores" en la arquitectura hexagonal (sesión 15 y módulo 03).

### Juntando todo: refactorizar un choque de trenes

```ts
// Antes
function canCheckout(cart: Cart): boolean {
  return (
    cart.getCustomer().getAccount().getStatus() === "active" &&
    cart.getItems().length > 0 &&
    cart.getCustomer().getAccount().getBalance() >= cart.getTotal()
  );
}
```

Problemas: el cliente navega por `cart → customer → account`, conoce cómo se representa el estado y decide por la cuenta si tiene saldo suficiente.

```ts
// Después
class Account {
  constructor(private status: "active" | "blocked", private balance: number) {}
  canPay(amount: number): boolean {
    return this.status === "active" && this.balance >= amount;
  }
}

class Customer {
  constructor(private account: Account) {}
  canPay(amount: number): boolean {
    return this.account.canPay(amount);
  }
}

class Cart {
  constructor(private customer: Customer, private items: CartItem[]) {}
  canCheckout(): boolean {
    return this.items.length > 0 && this.customer.canPay(this.total());
  }
  total(): number { /* ... */ return 0; }
}
```

Cada objeto responde por lo suyo. Si cambian las reglas de pago (por ejemplo, permitir saldo negativo hasta cierto límite), solo cambia `Account`. El precio es un pequeño método de delegación en `Customer`; si esas delegaciones proliferan, puede ser una señal de que hay que repensar qué objeto debería tener esa responsabilidad.

### Estructuras de datos inmutables en TypeScript

Si decides que algo es una estructura de datos, TypeScript te da herramientas para que sea una buena estructura de datos: **inmutable**. Un DTO que cualquiera puede modificar en cualquier momento es una fuente de bugs sutiles, porque una función que "solo lee" puede estar cambiando datos que otra función usa.

```ts
type Money = Readonly<{ amount: number; currency: "COP" | "USD" }>;
type Invoice = Readonly<{ id: string; lines: readonly InvoiceLine[]; total: Money }>;

function withLine(invoice: Invoice, line: InvoiceLine): Invoice {
  // No mutamos: devolvemos una estructura nueva
  return { ...invoice, lines: [...invoice.lines, line] };
}
```

`Readonly<T>` y `readonly T[]` hacen que el compilador rechace las mutaciones. Con estructuras inmutables, el estilo procedural (funciones que transforman datos) se vuelve muy seguro: cada función recibe datos y devuelve datos nuevos, sin efectos ocultos. Es el estilo que verás en la sesión 13 con la "programación como transformación".

### Demeter en el frontend

La Ley de Demeter también aparece en componentes de interfaz. Un componente que recibe un objeto enorme y navega por él para mostrar un dato está acoplado a toda esa estructura:

```tsx
// Acoplado: el avatar conoce la forma completa de la respuesta del API
function Avatar({ session }: { session: SessionResponse }) {
  return <img src={session.data.user.profile.images.small.url} alt="" />;
}

// Desacoplado: recibe exactamente lo que necesita
function Avatar({ imageUrl, name }: { imageUrl: string; name: string }) {
  return <img src={imageUrl} alt={name} />;
}
```

En la segunda versión, si el API cambia la forma de la respuesta, solo cambia el lugar donde se adapta esa respuesta (normalmente un *container* o un adaptador), no todos los componentes que la muestran. Es exactamente el patrón container-presentational: el container conoce la estructura de los datos, el componente de presentación solo recibe valores simples. Cuantos menos detalles conoce un componente, más fácil es reutilizarlo y testearlo.

### Una heurística rápida para decidir

Cuando diseñes un tipo nuevo, pregúntate:

1. **¿Tiene reglas que proteger?** (no se puede cancelar un pedido enviado, el saldo no puede ser negativo). Si sí, es un objeto: datos privados y métodos con intención.
2. **¿Solo transporta información entre capas?** Si sí, es una estructura de datos: tipo plano, idealmente inmutable, sin lógica.
3. **¿Espero añadir más tipos o más operaciones?** Más tipos favorece objetos polimórficos; más operaciones favorece estructuras con funciones.

### Errores comunes

- **Getters y setters para todo por defecto.** No es encapsular; es exponer la estructura con más pasos.
- **Aplicar Demeter a estructuras de datos.** Navegar `config.db.host` en un objeto plano está bien.
- **Crear híbridos**: entidades con reglas de negocio y, a la vez, todos los campos públicos y mutables.
- **Leer variables de entorno o singletons desde cualquier parte.** Centraliza en un módulo con API.
- **Romper Demeter "arreglándolo" con variables intermedias.** El acoplamiento sigue ahí; hay que mover la responsabilidad.

## Conceptos clave

- **Abstracción de datos**: exponer conceptos y operaciones en lugar de la representación interna.
- **Antisimetría datos/objetos**: los objetos facilitan añadir tipos; las estructuras de datos facilitan añadir funciones.
- **Ley de Demeter**: un método solo habla con sus "amigos directos" (su clase, sus argumentos, lo que crea y sus campos).
- **Choque de trenes**: cadena de llamadas que navega por la estructura interna de varios objetos.
- **Tell, don't ask**: decir a un objeto qué hacer en vez de pedirle datos para decidir por él.
- **Híbrido**: estructura que mezcla comportamiento significativo con datos expuestos; lo peor de ambos estilos.
- **DTO**: estructura de datos pura usada para mover información entre fronteras del sistema.

## Preguntas de repaso

1. ¿Por qué añadir getters y setters a todos los campos no es encapsular?
   R: Porque sigue exponiendo la representación interna; el cliente conoce y manipula los mismos datos, solo que a través de métodos. Encapsular es exponer abstracciones (como el porcentaje de combustible restante) que esconden cómo se guardan los datos.
2. Explica la antisimetría entre objetos y estructuras de datos con el ejemplo de las figuras.
   R: Con estructuras de datos y funciones procedurales (`area(shape)` con un switch), añadir una función nueva como `perimeter` es fácil, pero añadir un tipo nuevo obliga a tocar todas las funciones. Con objetos polimórficos (cada figura implementa `area()`), añadir un tipo es fácil, pero añadir una función obliga a tocar todas las clases.
3. Enuncia la Ley de Demeter y di cuándo no aplica.
   R: Un método de una clase solo debería llamar a métodos de la propia clase, de objetos que crea, de sus argumentos y de sus campos, no de los objetos devueltos por esas llamadas. No aplica a estructuras de datos sin comportamiento, ni de forma estricta a APIs estables que devuelven valores como `str.trim().toLowerCase()`.
4. ¿Cómo se arregla un choque de trenes de verdad (no solo cosméticamente)?
   R: Preguntando para qué se necesitaba el dato final y moviendo esa responsabilidad al objeto que tiene la información, por ejemplo `ctxt.createScratchFileStream(name)` en lugar de navegar hasta la ruta del directorio. Partir la cadena en variables solo mejora la lectura, no el acoplamiento.
5. ¿Qué significa "tell, don't ask" y qué ventaja tiene para las invariantes del dominio?
   R: Decirle al objeto qué hacer (`order.applyDiscount(10)`) en lugar de pedirle datos y modificarlos desde fuera. Así el objeto puede validar y proteger sus reglas (no aplicar un descuento mayor que el total), y nadie puede dejarlo en un estado inválido.
6. ¿Por qué los datos globales aumentan el acoplamiento y qué recomienda The Pragmatic Programmer?
   R: Porque cualquier código puede leerlos y modificarlos, como si todos los métodos recibieran un parámetro oculto, y un cambio en uno puede romper a cualquier otro. Recomienda envolver lo global en una API, por ejemplo un módulo de configuración que lea y valide las variables de entorno una sola vez.

## Ejercicio

Modela en TypeScript una biblioteca con `Library`, `Member` y `Loan`. Primero escribe una versión "que pregunta": una función `canBorrow(library, memberId, bookId)` que navega por getters (`library.getMembers().find(...).getLoans().filter(...)`) y decide fuera de los objetos. Después refactoriza a "tell, don't ask" de modo que el cliente solo llame a `library.lend(memberId, bookId)` y las reglas (máximo 3 préstamos, sin multas pendientes, libro disponible) vivan en el objeto que tiene la información. Añade tests con Vitest para las tres reglas. Terminado cuando ninguna línea del código cliente tiene más de un punto encadenado sobre objetos de dominio y los tres tests pasan.

## Explícalo con tus palabras

Explica la Ley de Demeter usando la analogía de pagar en una tienda: ¿le das tu billetera al cajero para que saque el dinero o le das el dinero tú?
