---
title: "Patrones de comportamiento I: Strategy, Template Method y State"
kind: lesson
hours: 2
sources: Design Patterns (GoF), cap. 5, introducción (pp. 241–242) | Design Patterns (GoF), State (pp. 325–334) | Design Patterns (GoF), Strategy (pp. 335–344) | Design Patterns (GoF), Template Method (pp. 345–350)
links: Refactoring.Guru, Strategy | https://refactoring.guru/es/design-patterns/strategy ; Refactoring.Guru, State | https://refactoring.guru/es/design-patterns/state
---

## Objetivo

Aprender tres formas de hacer variar un algoritmo o un comportamiento: Strategy (intercambiar el algoritmo completo por composición), Template Method (fijar el esqueleto y dejar variar pasos por herencia) y State (cambiar el comportamiento cuando cambia el estado interno), y saber cuándo un `switch` es suficiente.

## Estudio

### Qué son los patrones de comportamiento

Los patrones de comportamiento tratan de **algoritmos y del reparto de responsabilidades entre objetos**. No describen solo objetos, sino también cómo se comunican. Sirven para domar flujos de control complejos que son difíciles de seguir en ejecución, porque te hacen pensar en cómo se conectan los objetos en lugar de en el flujo paso a paso.

Hay dos familias. Los de **clase** usan herencia para repartir el comportamiento (Template Method es el más común). Los de **objeto** usan composición (Strategy, State, Observer, Command y casi todos los demás).

Un tema atraviesa a casi todos: **encapsular lo que varía**. Cuando un aspecto del programa cambia a menudo, el patrón crea un objeto que lo encapsula y lo nombra: un objeto *Strategy* encapsula un algoritmo, un objeto *State* encapsula el comportamiento dependiente del estado, un *Mediator* el protocolo entre objetos y un *Iterator* la forma de recorrer una colección.

### Strategy

**Intención:** definir una familia de algoritmos, encapsular cada uno y hacerlos intercambiables. Strategy permite que el algoritmo varíe independientemente de los clientes que lo usan. También se le llama **Policy**.

#### El problema

Hay muchos algoritmos para partir un texto en líneas: uno simple que llena cada línea, uno que optimiza el párrafo completo (como TeX) y otro que reparte un número fijo de elementos por fila (útil para iconos). Meterlos todos en la clase que muestra el texto la hace grande, la obliga a cargar algoritmos que no usa y hace difícil agregar uno nuevo. La solución: una interfaz `Compositor` con un método para partir líneas y una clase por algoritmo. La clase `Composition` (el **contexto**) guarda una referencia a un compositor y le delega el trabajo.

```
┌──────────────────┐   strategy   ┌──────────────────────┐
│ Context          │◆────────────▶│ «interface» Strategy │
│ (ShippingQuote)  │              │ calculate(data)      │
└──────────────────┘              └──────▲────▲────▲─────┘
                                         │    │    │
                                 Standard  Express  PickupInStore
```

#### Ejemplo: cálculo de envío

```ts
export interface Parcel { weightKg: number; distanceKm: number; fragile: boolean }

export interface ShippingStrategy {
  readonly name: string;
  cost(p: Parcel): number;
  etaDays(p: Parcel): number;
}

export const standard: ShippingStrategy = {
  name: "standard",
  cost: (p) => 5_000 + p.weightKg * 1_200 + p.distanceKm * 15,
  etaDays: (p) => Math.ceil(p.distanceKm / 300) + 2,
};

export const express: ShippingStrategy = {
  name: "express",
  cost: (p) => (standard.cost(p) * 1.8) + (p.fragile ? 8_000 : 0),
  etaDays: (p) => Math.ceil(p.distanceKm / 800),
};

export const pickup: ShippingStrategy = {
  name: "pickup",
  cost: () => 0,
  etaDays: () => 1,
};

// Contexto: no sabe qué algoritmo concreto usa
export class ShippingQuote {
  constructor(private strategy: ShippingStrategy) {}
  use(s: ShippingStrategy) { this.strategy = s; }    // se puede cambiar en ejecución
  quote(p: Parcel) {
    return { method: this.strategy.name, cost: this.strategy.cost(p), eta: this.strategy.etaDays(p) };
  }
}

// Mostrar todas las opciones al usuario
export const allQuotes = (p: Parcel) =>
  [standard, express, pickup].map((s) => new ShippingQuote(s).quote(p));
```

Fíjate en que en TypeScript una estrategia no necesita ser una clase: un objeto literal o incluso **una función** cumple el papel. `array.sort((a, b) => a.price - b.price)` es Strategy en su forma más pura: el algoritmo de ordenamiento es fijo y la comparación es la estrategia.

#### Cómo pasa los datos el contexto

Hay dos opciones, y es una decisión de diseño real:

1. **El contexto pasa los datos como parámetros** (como arriba). La estrategia queda desacoplada del contexto, pero quizás reciba datos que no usa.
2. **El contexto se pasa a sí mismo** y la estrategia pide lo que necesita. Más flexible, pero acopla la estrategia al contexto.

#### Consecuencias

- ✅ **Familias de algoritmos reutilizables**, con la posibilidad de extraer lo común.
- ✅ **Alternativa a la herencia**: no necesitas subclasificar el contexto para variar el algoritmo, y puedes cambiarlo en ejecución.
- ✅ **Elimina condicionales**: un `switch` sobre el tipo de envío repetido en varios métodos desaparece.
- ✅ **Elección de implementaciones**: distintas versiones del mismo comportamiento con distintos compromisos de tiempo y espacio.
- ❌ **Los clientes deben conocer las estrategias** para elegir una; si no, alguien tiene que elegir por ellos (una fábrica, la configuración).
- ❌ **Costo de comunicación**: la interfaz común puede obligar a pasar datos que algunas estrategias no usan.
- ❌ **Más objetos** en la aplicación.

#### ¿Quién elige la estrategia?

Strategy deja abierta una pregunta: si el contexto no decide qué algoritmo usar, ¿quién lo hace? Hay tres respuestas habituales, cada una con su lugar:

1. **El usuario, en ejecución**: el cliente muestra las opciones (como `allQuotes`) y la elegida se pasa al contexto. Las estrategias se registran en una lista o un mapa por nombre.
2. **La configuración, al arrancar**: el composition root lee una variable de entorno o un archivo y crea el contexto con la estrategia adecuada (por ejemplo, el algoritmo de hashing de contraseñas o la política de reintentos).
3. **Una regla de negocio**: una pequeña función de selección decide según los datos ("si el paquete pesa más de 30 kg, solo carga estándar"). Esa función es en sí una regla que conviene testear por separado.

Lo que no conviene es esconder la elección dentro del contexto con un `if`, porque entonces vuelves al punto de partida: el contexto conoce todas las variantes.

### Template Method

**Intención:** definir el esqueleto de un algoritmo en una operación, delegando algunos pasos a las subclases. Template Method permite que las subclases redefinan ciertos pasos sin cambiar la estructura del algoritmo.

#### El problema

Un framework de aplicaciones define cómo se abre un documento: comprobar si se puede abrir, crear el objeto documento, agregarlo a la lista, avisar que está por abrirse y leer su contenido. Ese orden es siempre el mismo; lo que cambia es **cómo** se hace cada paso en cada aplicación. La operación `openDocument()` es un *template method*: define el algoritmo en términos de operaciones abstractas que las subclases implementan.

Es una técnica fundamental para **reutilizar código** en librerías y frameworks, porque factoriza el comportamiento común en un lugar. Además produce una estructura de control invertida que el libro llama **principio de Hollywood**: "no nos llames, nosotros te llamamos". La clase padre llama a las operaciones de la subclase, y no al revés.

#### Tipos de operaciones dentro de un template method

| Tipo | Qué es | ¿Obligatorio sobrescribir? |
| --- | --- | --- |
| Operaciones concretas | Pasos fijos implementados en la clase base | No se sobrescriben |
| Operaciones primitivas (abstractas) | Pasos que cada subclase **debe** implementar | Sí |
| Ganchos (hooks) | Pasos con comportamiento por defecto (a menudo vacío) | Opcional |
| Factory methods | Pasos que crean objetos | Según el caso |

Es importante que el diseño deje claro qué operaciones son ganchos (puedes sobrescribirlas) y cuáles son abstractas (debes hacerlo). También conviene minimizar el número de operaciones primitivas: cuantas más haya, más tediosa es cada subclase.

#### Ejemplo: importadores de archivos

```ts
export interface ImportReport { imported: number; rejected: { row: number; reason: string }[] }

export abstract class Importer<Row> {
  // Template method: el orden NO se puede cambiar
  async run(raw: string): Promise<ImportReport> {
    const rows = this.parse(raw);                   // primitiva
    const report: ImportReport = { imported: 0, rejected: [] };
    for (const [i, row] of rows.entries()) {
      const error = this.validate(row);             // primitiva
      if (error) { report.rejected.push({ row: i + 1, reason: error }); continue; }
      await this.save(this.transform(row));         // gancho + primitiva
      report.imported++;
    }
    await this.afterImport(report);                 // gancho
    return report;
  }

  protected abstract parse(raw: string): Row[];
  protected abstract validate(row: Row): string | null;
  protected abstract save(row: Row): Promise<void>;
  protected transform(row: Row): Row { return row; }               // gancho: por defecto, nada
  protected async afterImport(_r: ImportReport): Promise<void> {}  // gancho vacío
}

type ProductRow = { sku: string; price: number };

export class ProductCsvImporter extends Importer<ProductRow> {
  saved: ProductRow[] = [];
  protected parse(raw: string) {
    return raw.trim().split("\n").slice(1).map((l) => {
      const [sku, price] = l.split(",");
      return { sku: sku.trim(), price: Number(price) };
    });
  }
  protected validate(r: ProductRow) {
    if (!r.sku) return "SKU vacío";
    if (!(r.price > 0)) return "Precio inválido";
    return null;
  }
  protected transform(r: ProductRow) { return { ...r, sku: r.sku.toUpperCase() }; }
  protected async save(r: ProductRow) { this.saved.push(r); }
}
```

#### Template Method vs. Strategy

Ambos hacen variar partes de un algoritmo, pero con mecanismos opuestos:

| | Template Method | Strategy |
| --- | --- | --- |
| Mecanismo | **Herencia**: la subclase completa los pasos | **Composición**: el contexto delega en un objeto |
| Qué varía | **Partes** de un algoritmo con esqueleto fijo | El algoritmo **completo** |
| Cuándo se decide | En compilación (qué subclase instancias) | En ejecución (puedes cambiar la estrategia) |
| Acoplamiento | Alto: la subclase depende de la base | Bajo: solo la interfaz |

Una regla práctica moderna: si el esqueleto es estable y es tu propio framework, Template Method es claro y compacto. Si te encuentras con una jerarquía de subclases que solo difieren en uno o dos pasos que quieres combinar, pasa esos pasos a estrategias inyectadas. Muchos equipos de TypeScript prefieren la versión con composición: el "esqueleto" es una función que recibe los pasos como funciones.

### State

**Intención:** permitir que un objeto altere su comportamiento cuando su estado interno cambia. Parecerá que el objeto cambió de clase.

#### El problema

Una conexión TCP puede estar establecida, escuchando o cerrada, y cada petición (`open`, `close`, `acknowledge`) hace algo distinto según el estado. La versión ingenua es un `switch` sobre el estado en **cada** método. Con pocos estados está bien; con muchos estados y muchas operaciones, los mismos condicionales se repiten en todas partes y cualquier cambio de reglas obliga a tocarlos todos.

La solución: una interfaz con una operación por evento y una clase por estado. El objeto principal (el **contexto**) guarda el estado actual y le delega cada petición. Cuando hay una transición, se reemplaza el objeto estado.

#### Ejemplo: ciclo de vida de un pedido

```ts
type OrderStatus = "draft" | "paid" | "shipped" | "cancelled";

interface OrderState {
  readonly status: OrderStatus;
  pay(o: Order): void;
  ship(o: Order): void;
  cancel(o: Order): void;
}

const fail = (action: string, s: OrderStatus): never => {
  throw new Error(`No se puede ${action} un pedido en estado ${s}`);
};

const Draft: OrderState = {
  status: "draft",
  pay: (o) => o.transitionTo(Paid),
  ship: () => fail("enviar", "draft"),
  cancel: (o) => o.transitionTo(Cancelled),
};

const Paid: OrderState = {
  status: "paid",
  pay: () => fail("pagar", "paid"),
  ship: (o) => o.transitionTo(Shipped),
  cancel: (o) => { o.refund(); o.transitionTo(Cancelled); }, // regla específica de este estado
};

const Shipped: OrderState = {
  status: "shipped",
  pay: () => fail("pagar", "shipped"),
  ship: () => fail("enviar", "shipped"),
  cancel: () => fail("cancelar", "shipped"),
};

const Cancelled: OrderState = {
  status: "cancelled",
  pay: () => fail("pagar", "cancelled"),
  ship: () => fail("enviar", "cancelled"),
  cancel: () => fail("cancelar", "cancelled"),
};

export class Order {
  private state: OrderState = Draft;
  refunds = 0;
  get status() { return this.state.status; }
  pay() { this.state.pay(this); }
  ship() { this.state.ship(this); }
  cancel() { this.state.cancel(this); }
  /** @internal solo los estados lo usan */
  transitionTo(s: OrderState) { this.state = s; }
  refund() { this.refunds++; }
}
```

```
        pay            ship
 draft ─────▶ paid ─────────▶ shipped
   │            │
   │cancel      │cancel (+refund)
   ▼            ▼
      cancelled
```

#### Decisiones de implementación

- **¿Quién define las transiciones?** Pueden estar en el contexto (centralizadas, fáciles de ver) o en los estados (cada estado sabe a cuál pasa, como arriba). Las segundas son más fáciles de extender, pero los estados se conocen entre sí.
- **Una alternativa basada en tablas:** representar las transiciones como datos (`{ draft: { pay: "paid", cancel: "cancelled" }, ... }`). Es muy legible para transiciones simples, pero no permite comportamiento específico (como el reembolso al cancelar un pedido pagado) sin volver a los condicionales.
- **¿Crear o compartir los objetos estado?** Si los estados no tienen datos propios, se pueden compartir como en el ejemplo (son objetos constantes). Si guardan datos, cada contexto necesita los suyos.

#### Consecuencias

- ✅ **Localiza el comportamiento de cada estado** y reparte el de los distintos estados en objetos separados; agregar un estado es agregar un objeto.
- ✅ **Hace explícitas las transiciones**: cambiar de estado es un acto visible, no la modificación de un campo cualquiera, y protege al contexto de estados internos inconsistentes.
- ✅ Los objetos estado se pueden compartir si no tienen datos propios.
- ❌ Más objetos y el comportamiento repartido; para dos estados y una operación, es demasiado.

#### State vs. Strategy

Tienen el mismo diagrama. La diferencia es quién decide el cambio: en Strategy, el **cliente** elige el algoritmo y normalmente no cambia solo; en State, el **propio objeto** cambia de estado como consecuencia de las operaciones, y los estados suelen conocer las transiciones.

### ¿Y el `switch`? Cuándo no usar estos patrones

Los tres patrones reemplazan condicionales por polimorfismo, pero un `switch` no es pecado. En TypeScript, una **unión discriminada con `switch` exhaustivo** es clara, tipada y el compilador te avisa si olvidas un caso:

```ts
type Shipping = "standard" | "express" | "pickup";
function eta(kind: Shipping, km: number): number {
  switch (kind) {
    case "standard": return Math.ceil(km / 300) + 2;
    case "express": return Math.ceil(km / 800);
    case "pickup": return 1;
    default: { const _exhaustive: never = kind; return _exhaustive; }
  }
}
```

| Prefiere `switch` cuando… | Prefiere el patrón cuando… |
| --- | --- |
| El condicional aparece en **un solo** lugar. | El mismo condicional se repite en varios métodos o archivos. |
| Las variantes son pocas y estables. | Se agregan variantes con frecuencia o las agregan otros equipos (plugins). |
| Cada rama es una expresión corta. | Cada rama tiene lógica, datos y tests propios. |
| No necesitas cambiar el comportamiento en ejecución. | Necesitas intercambiar algoritmos o transicionar estados en ejecución. |

### Analogía de construcción

**Strategy** es elegir el método de cimentación según el terreno: zapatas, losa o pilotes. La casa (el contexto) no cambia; cambia el algoritmo para sostenerla, y el ingeniero lo elige. **Template Method** es el proceso de licencia de obra: los pasos y su orden están fijados por la municipalidad (solicitud, revisión estructural, inspección, aprobación), pero cada proyecto completa su propia memoria de cálculo. **State** es una obra que pasa de "en diseño" a "en construcción" a "entregada": la misma pregunta ("¿puedo cambiar la fachada?") tiene respuestas distintas según la fase.

### Errores comunes

- **Estrategias con una sola implementación "por si acaso".** Espera a tener la segunda variante real.
- **Template Method con diez ganchos.** Si cada subclase sobrescribe la mitad, el esqueleto no es estable; usa composición.
- **Subclases que llaman a `super` en desorden** o sobrescriben el template method: ciérralo (en TypeScript, documenta que no se sobrescribe y no lo marques como protegido abstracto).
- **State con transiciones repartidas y sin diagrama.** Dibuja siempre la máquina de estados y pruébala con un test por transición válida e inválida.
- **Cambiar el campo `status` directamente desde fuera.** Destruye las garantías del patrón; las transiciones deben pasar por las operaciones.

### Resumen

Strategy encapsula algoritmos intercambiables por composición, con el cliente eligiendo cuál usar. Template Method fija el orden de un algoritmo en la clase base y deja variar pasos concretos por herencia (principio de Hollywood). State encapsula el comportamiento de cada estado y hace explícitas las transiciones, de modo que el objeto parece cambiar de clase. Los tres sustituyen condicionales repetidos por polimorfismo, pero un `switch` exhaustivo en un solo lugar sigue siendo una opción válida.

## Conceptos clave

- **Strategy (Policy)**: objeto que encapsula un algoritmo intercambiable usado por un contexto.
- **Contexto**: objeto que usa una estrategia o un estado y le delega parte de su comportamiento.
- **Template method**: operación que define el esqueleto de un algoritmo llamando a pasos que las subclases implementan.
- **Operación primitiva**: paso abstracto que la subclase debe implementar.
- **Gancho (hook)**: paso con comportamiento por defecto que la subclase puede sobrescribir.
- **Principio de Hollywood**: "no nos llames, nosotros te llamamos"; la clase base o el framework llama a tu código.
- **State**: patrón en el que cada estado es un objeto y el contexto delega en el estado actual.
- **Máquina de estados**: conjunto de estados y transiciones permitidas entre ellos según eventos.

## Preguntas de repaso

1. ¿Qué diferencia esencial hay entre Strategy y Template Method?
   R: Strategy varía el algoritmo completo mediante composición y se puede cambiar en ejecución; Template Method fija el esqueleto en una clase base y varía solo algunos pasos mediante herencia, decidiéndose al elegir la subclase.
2. ¿Qué es el principio de Hollywood y qué patrón lo ejemplifica?
   R: "No nos llames, nosotros te llamamos": el código de alto nivel (la clase base o el framework) llama a las operaciones definidas por el código de bajo nivel. Template Method lo ejemplifica.
3. ¿Qué diferencia hay entre una operación primitiva y un gancho?
   R: La primitiva es abstracta y la subclase debe implementarla; el gancho tiene un comportamiento por defecto (a menudo vacío) y la subclase puede sobrescribirlo si lo necesita.
4. ¿Qué problema concreto resuelve State?
   R: Condicionales sobre el estado repetidos en muchas operaciones. Al encapsular cada estado en un objeto, el comportamiento de cada estado queda localizado, agregar un estado no exige tocar todos los métodos y las transiciones se vuelven explícitas.
5. Si State y Strategy tienen el mismo diagrama, ¿cómo los distingues?
   R: Por quién provoca el cambio: en Strategy el cliente elige el algoritmo; en State el propio objeto cambia de estado como resultado de sus operaciones, y los estados conocen las transiciones.
6. ¿Cuándo es preferible un `switch` a cualquiera de estos patrones?
   R: Cuando el condicional aparece en un solo lugar, las variantes son pocas y estables y cada rama es corta. En TypeScript, una unión discriminada con comprobación exhaustiva mediante `never` es segura y legible.

## Ejercicio

Modela el ciclo de vida de una suscripción con State: estados `trial`, `active`, `pastDue`, `cancelled`, y eventos `activate()`, `paymentFailed()`, `paymentSucceeded()`, `cancel()`. Reglas: desde `pastDue`, un pago exitoso vuelve a `active`; tres fallos seguidos en `pastDue` cancelan la suscripción; cancelar desde `trial` no genera factura final, desde `active` sí. Luego añade una `BillingStrategy` (mensual, anual con 15 % de descuento) para calcular el monto del cobro. **Terminado cuando:** dibujaste el diagrama de estados en ASCII en un comentario, hay un test con Vitest por cada transición válida y al menos tres por transiciones inválidas, y cambiar de estrategia de cobro no modifica ninguna clase de estado.

## Explícalo con tus palabras

Explica, con el ejemplo de la cimentación, la licencia de obra y las fases de una obra, cuándo usarías Strategy, Template Method o State.
