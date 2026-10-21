---
title: "Patrones de comportamiento III: Iterator, Chain of Responsibility y cómo elegir un patrón"
kind: lesson
hours: 2
sources: Design Patterns (GoF), Chain of Responsibility (pp. 243–252) | Design Patterns (GoF), Iterator (pp. 277–292) | Design Patterns (GoF), cap. 1, secs. 1.7–1.8 (pp. 48–52) | Design Patterns (GoF), cap. 6, "What to Expect from Design Patterns" (pp. 371–375)
links: Refactoring.Guru, Chain of Responsibility | https://refactoring.guru/es/design-patterns/chain-of-responsibility ; MDN, protocolos de iteración | https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Iteration_protocols
---

## Objetivo

Cerrar el bloque de patrones con Iterator (recorrer una colección sin exponer su estructura) y Chain of Responsibility (pasar una petición por una cadena de manejadores), y consolidar un método para elegir, combinar y **no** abusar de los patrones.

## Estudio

### Iterator

**Intención:** proporcionar una forma de acceder secuencialmente a los elementos de un objeto agregado sin exponer su representación interna. También se le llama **Cursor**.

#### El problema

Una colección debería permitir recorrer sus elementos sin que el cliente sepa si internamente es un arreglo, una lista enlazada, un árbol o una página de resultados de una API. Además, puede que quieras varios recorridos distintos (en orden, filtrado, al revés) e incluso varios recorridos simultáneos sobre la misma colección. Meter todas esas operaciones en la interfaz de la colección la inflaría.

La idea clave es **sacar la responsabilidad del recorrido** de la colección y ponerla en un objeto iterador, que sabe cuál es el elemento actual y cuáles ya se visitaron. El libro define la interfaz clásica `first()`, `next()`, `isDone()` y `currentItem()`.

#### Iterator ya está en el lenguaje

JavaScript y TypeScript incorporan el patrón en el propio lenguaje con los **protocolos de iteración**: un objeto es *iterable* si tiene un método `[Symbol.iterator]()` que devuelve un *iterador* con `next()` que entrega `{ value, done }`. Todo lo que funcione con `for...of`, el operador de propagación `...` o la desestructuración usa este patrón. Y los **generadores** (`function*`) son la forma más cómoda de escribir iteradores.

```ts
// Una colección con varias formas de recorrerla, sin exponer su estructura
export class Playlist implements Iterable<string> {
  private readonly songs: string[] = [];
  add(s: string) { this.songs.push(s); return this; }

  // Recorrido por defecto
  *[Symbol.iterator]() { yield* this.songs; }

  // Recorridos alternativos sin inflar la interfaz con estado de recorrido
  *reversed() { for (let i = this.songs.length - 1; i >= 0; i--) yield this.songs[i]; }
  *shuffled(random = Math.random) {
    const copy = [...this.songs];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    yield* copy;
  }
}

const p = new Playlist().add("A").add("B").add("C");
for (const s of p) console.log(s);        // A B C
console.log([...p.reversed()]);           // [ "C", "B", "A" ]
```

#### Iteradores sobre árboles (Composite + Iterator)

Recorrer un árbol compuesto es el caso clásico donde Iterator brilla: el cliente quiere "todos los archivos" sin escribir recursión cada vez.

```ts
type Node = { name: string; children?: Node[] };

export function* depthFirst(node: Node, path = ""): Generator<string> {
  const current = `${path}/${node.name}`;
  yield current;
  for (const child of node.children ?? []) yield* depthFirst(child, current);
}
```

#### Iteradores perezosos y paginación asíncrona

Un iterador no necesita tener todos los elementos en memoria: puede **producirlos bajo demanda**. Esto es muy útil para recorrer resultados paginados de una API o filas de una base de datos sin cargar todo:

```ts
interface Page<T> { items: T[]; nextCursor: string | null }

export async function* allItems<T>(fetchPage: (cursor: string | null) => Promise<Page<T>>) {
  let cursor: string | null = null;
  do {
    const page = await fetchPage(cursor);
    yield* page.items;
    cursor = page.nextCursor;
  } while (cursor !== null);
}

// El cliente no sabe que hay paginación:
// for await (const invoice of allItems(api.listInvoices)) { ... }
```

#### Decisiones de implementación

- **Iterador externo vs. interno.** En el externo, el cliente controla el avance (`for...of`, `next()`). En el interno, el cliente pasa una función y la colección la aplica a cada elemento (`forEach`, `map`). El externo es más flexible (puedes detenerte, comparar dos colecciones a la vez); el interno es más simple.
- **¿Quién define el algoritmo de recorrido?** Puede estar en el iterador o en la colección (que usa el iterador solo como cursor).
- **Robustez ante modificaciones.** ¿Qué pasa si agregas o quitas elementos mientras recorres? Un iterador robusto lo tolera sin copiar toda la colección; muchos lenguajes simplemente lo prohíben y lanzan un error. En tus propias colecciones, documenta el comportamiento o itera sobre una copia.

#### Consecuencias

- ✅ Soporta **variaciones en el recorrido** de una colección sin cambiar su interfaz.
- ✅ **Simplifica la interfaz** de la colección.
- ✅ Permite **más de un recorrido pendiente** a la vez, porque cada iterador guarda su propio estado.

### Chain of Responsibility

**Intención:** evitar acoplar al emisor de una petición con su receptor dando a más de un objeto la oportunidad de manejarla. Encadena los objetos receptores y pasa la petición a lo largo de la cadena hasta que uno la maneje.

#### El problema

En una interfaz con ayuda contextual, el usuario hace clic en un botón para obtener ayuda. Si el botón tiene ayuda específica, la muestra; si no, la pide al diálogo que lo contiene; si el diálogo tampoco tiene, a la ventana principal. La ayuda se organiza de lo más específico a lo más general, y el objeto que inicia la petición **no sabe quién la va a atender**.

```
petición ──▶ [Handler A] ──▶ [Handler B] ──▶ [Handler C] ──▶ (nadie: comportamiento por defecto)
               maneja o          maneja o         maneja o
               pasa              pasa             pasa
```

Cada manejador tiene una referencia al siguiente (su **sucesor**) y decide: manejar la petición, pasarla, o ambas cosas.

#### Ejemplo: aprobación de gastos

```ts
export interface Expense { amount: number; category: "travel" | "equipment" | "other"; requester: string }
export type Decision = { approvedBy: string } | { rejected: string };

export abstract class Approver {
  private next?: Approver;
  setNext(a: Approver): Approver { this.next = a; return a; } // permite encadenar
  handle(e: Expense): Decision {
    const d = this.tryHandle(e);
    if (d) return d;
    if (this.next) return this.next.handle(e);
    return { rejected: "Nadie en la cadena puede aprobar este gasto" };
  }
  protected abstract tryHandle(e: Expense): Decision | null;
}

class TeamLead extends Approver {
  protected tryHandle(e: Expense) { return e.amount <= 500_000 ? { approvedBy: "líder" } : null; }
}
class Manager extends Approver {
  protected tryHandle(e: Expense) {
    if (e.category === "other" && e.amount > 1_000_000) return { rejected: "Categoría 'other' > 1M no permitida" };
    return e.amount <= 5_000_000 ? { approvedBy: "gerente" } : null;
  }
}
class Cfo extends Approver {
  protected tryHandle(e: Expense) { return e.amount <= 50_000_000 ? { approvedBy: "CFO" } : null; }
}

const chain = new TeamLead();
chain.setNext(new Manager()).setNext(new Cfo());
chain.handle({ amount: 2_000_000, category: "travel", requester: "ana" }); // { approvedBy: "gerente" }
```

#### La variante que usas todos los días: middlewares y pipelines

En muchos frameworks web, la cadena de middlewares es una variante de Chain of Responsibility (combinada con Decorator): cada eslabón puede **cortar** la cadena (por ejemplo, responder 401), **modificar** la petición y pasarla, o **hacer algo después** de que el resto responda.

```ts
type Ctx = { headers: Record<string, string>; user?: string; status?: number; body?: string };
type Middleware = (ctx: Ctx, next: () => Promise<void>) => Promise<void>;

export function compose(mws: Middleware[]) {
  return (ctx: Ctx) => {
    const run = (i: number): Promise<void> =>
      i < mws.length ? mws[i](ctx, () => run(i + 1)) : Promise.resolve();
    return run(0);
  };
}

const auth: Middleware = async (ctx, next) => {
  const token = ctx.headers.authorization;
  if (!token) { ctx.status = 401; return; }        // corta la cadena
  ctx.user = token.replace("Bearer ", "");
  await next();
};
const handler: Middleware = async (ctx) => { ctx.status = 200; ctx.body = `Hola ${ctx.user}`; };

await compose([auth, handler])({ headers: { authorization: "Bearer ana" } });
```

La diferencia con la versión clásica es que en la clásica **uno solo** maneja la petición y la cadena se detiene; en los pipelines de middlewares, **varios** eslabones participan.

#### Consecuencias

- ✅ **Reduce el acoplamiento**: el emisor no conoce al receptor ni la estructura de la cadena; cada eslabón solo conoce a su sucesor.
- ✅ **Flexibilidad para repartir responsabilidades**: puedes agregar, quitar o reordenar manejadores en ejecución.
- ❌ **La recepción no está garantizada**: una petición puede llegar al final sin que nadie la atienda. Por eso es buena práctica definir un comportamiento por defecto explícito (como el rechazo del ejemplo).
- ❌ Depurar "quién atendió esto" puede costar: registra qué eslabón decidió.

### Cómo elegir un patrón: un método

Ya conoces los patrones más usados. El libro propone un método para elegir que vale la pena repetir, con algunos añadidos prácticos:

1. **Describe el dolor en una frase.** "Cada vez que agregamos un medio de pago tocamos cinco archivos." Sin dolor concreto, no hay patrón.
2. **Identifica qué varía.** El medio de pago, el algoritmo, el estado, la plataforma, el receptor de una petición, el orden de pasos.
3. **Busca en la tabla de "qué permite variar cada patrón".**

| Patrón | Lo que permite variar |
| --- | --- |
| Abstract Factory | Familias de productos |
| Builder | Cómo se crea un objeto compuesto |
| Factory Method | La subclase o clase del objeto que se crea |
| Singleton | (La única instancia de una clase; úsalo con cautela) |
| Adapter | La interfaz hacia un objeto |
| Composite | La estructura y composición de un objeto |
| Decorator | Las responsabilidades de un objeto sin subclasificar |
| Facade | La interfaz hacia un subsistema |
| Proxy | Cómo se accede a un objeto; su ubicación |
| Chain of Responsibility | El objeto que puede atender una petición |
| Command | Cuándo y cómo se atiende una petición |
| Iterator | Cómo se recorren los elementos de un agregado |
| Mediator | Cómo y qué objetos interactúan entre sí |
| Observer | El número de objetos que dependen de otro y cómo se mantienen actualizados |
| State | Los estados de un objeto |
| Strategy | Un algoritmo |
| Template Method | Pasos de un algoritmo |

4. **Compara alternativas del mismo propósito** (Strategy vs. State vs. Template Method; Adapter vs. Facade vs. Proxy; Observer vs. Mediator).
5. **Revisa las consecuencias** y pregúntate si estás dispuesto a pagar sus costos: más clases, indirección, flujo menos obvio.
6. **Aplícalo con nombres del dominio**: `ShippingStrategy` está bien, pero `ShippingMethod` puede ser aún mejor si es como habla el negocio.
7. **Escribe el test antes del refactor** para asegurar que el comportamiento no cambia.

### El método aplicado: un caso de principio a fin

Imagina este código en un servicio de facturación, que ha crecido release a release:

```ts
async function issueInvoice(order: Order, country: string) {
  let tax = 0;
  if (country === "CO") tax = order.total * 0.19;
  else if (country === "MX") tax = order.total * 0.16;
  else if (country === "CL") tax = order.total * 0.19;
  const invoice = { ...order, tax, status: "issued" };
  await db.insert("invoices", invoice);
  await mailer.send(order.email, "Tu factura");
  await analytics.track("invoice_issued", invoice);
  await accounting.post(invoice);
}
```

Aplica el método paso a paso:

1. **Dolor.** Cada país nuevo modifica esta función, y cada integración nueva (contabilidad, analítica) también. Dos equipos distintos la tocan por razones distintas y los merges chocan.
2. **Qué varía.** Dos cosas independientes: la **regla de impuestos por país** y la **lista de reacciones** cuando se emite una factura.
3. **Patrones candidatos.** Para el algoritmo de impuestos: Strategy (o un registro de estrategias por país). Para las reacciones: Observer (eventos).
4. **Alternativas.** ¿State? No: el país no es un estado que cambie con las operaciones. ¿Chain of Responsibility para impuestos? Podría servir si las reglas se aplicaran "la primera que encaje", pero aquí cada país tiene exactamente una regla: un mapa es más simple. ¿Mediator para las reacciones? No hay interacción entre ellas; cada una es independiente, así que Observer encaja mejor.
5. **Costos.** Más archivos y un flujo menos visible para las reacciones. Se acepta porque el email, la analítica y la contabilidad no deben poder bloquear la emisión, y porque los países se agregan seguido.
6. **Nombres del dominio.** `TaxPolicy` en lugar de `TaxStrategy`, `InvoiceIssued` como evento.
7. **Tests primero.** Antes de tocar nada, tests que fijen el impuesto por país y que la factura se guarde con estado `issued`.

El resultado: `issueInvoice` calcula el impuesto con `taxPolicies[country]`, guarda la factura y publica `InvoiceIssued`. Agregar un país es agregar una entrada al registro; agregar una integración es suscribir un observador. Nadie más toca la función.

### Qué esperar de los patrones (y qué no)

En la conclusión del libro, los autores dicen qué aportan los patrones:

- **Un vocabulario común de diseño**: hablar en patrones eleva la conversación.
- **Una ayuda para documentar y aprender**: reconocer patrones en un sistema existente acelera entenderlo.
- **Un complemento a los métodos existentes**: no sustituyen al análisis ni a la experiencia.
- **Un objetivo para refactorizar**: los sistemas evolucionan y los patrones suelen aparecer como destino de una refactorización, no como punto de partida. El ciclo típico es: prototipo, expansión con muchos parches, consolidación (aquí aparecen los patrones).

Y lo que **no** son: no son una receta mecánica, ni una lista de verificación, ni una medida de calidad ("este sistema tiene 14 patrones" no significa nada).

### Antipatrones típicos al aprender patrones

| Antipatrón | Cómo se ve | Remedio |
| --- | --- | --- |
| **Patronitis** | Un CRUD de tres entidades con fábricas abstractas, estrategias y observadores. | Empieza simple; aplica el patrón cuando aparezca el dolor. |
| **Nombres de catálogo** | `UserServiceFactoryStrategyImpl`. | Nombra por el dominio y la intención. |
| **Patrón equivocado por parecido** | Un "Proxy" que agrega funcionalidad (es un Decorator) o un "Strategy" que cambia solo (es un State). | Elige por intención, no por diagrama. |
| **Indirección sin variación** | Interfaces con una sola implementación que nunca cambiará y que no cruzan ningún límite. | Elimínalas o espera a la segunda variante. |
| **Herencia por defecto** | Jerarquías profundas para reutilizar código. | Composición, funciones, estrategias. |

### Analogía de construcción

**Iterator** es el recorrido guiado de una obra: el guía conoce el camino (por pisos, por especialidad, solo las zonas terminadas) y tú solo dices "siguiente", sin necesidad de conocer los planos. **Chain of Responsibility** es la escalera de aprobaciones de cambios de obra: el residente aprueba cambios menores; si excede su límite, lo pasa al director de obra; si excede el suyo, al cliente. Quien solicita no necesita saber quién firmará.

### Errores comunes

- **Exponer la estructura interna "para poder recorrerla"** (devolver el arreglo interno mutable). Expón un iterable o una copia de solo lectura.
- **Modificar una colección mientras se recorre** sin definir qué pasa.
- **Cadenas sin final definido**, donde una petición se pierde en silencio.
- **Cadenas donde el orden es crítico pero implícito.** Si el orden importa (autenticación antes de autorización), ensámblala en un solo lugar con un test.
- **Elegir patrones por catálogo** en lugar de por el problema.

### Resumen

Iterator separa el recorrido de la colección y en TypeScript está integrado en el lenguaje mediante iterables y generadores, incluidos los asíncronos para paginación. Chain of Responsibility encadena manejadores para desacoplar al emisor del receptor, con la variante de middlewares en la que varios eslabones participan. Para elegir un patrón, parte del dolor, identifica qué varía, compara alternativas y acepta sus costos; los patrones suelen ser el destino de una refactorización, no el punto de partida.

## Conceptos clave

- **Iterator (Cursor)**: objeto que recorre un agregado elemento a elemento sin exponer su representación.
- **Iterable**: en JavaScript, objeto con `[Symbol.iterator]()` que devuelve un iterador.
- **Generador**: función (`function*`) que produce valores bajo demanda con `yield`, usada para escribir iteradores.
- **Iterador externo vs. interno**: el cliente controla el avance frente a la colección que aplica una función a cada elemento.
- **Chain of Responsibility**: cadena de manejadores donde cada uno atiende la petición o la pasa a su sucesor.
- **Sucesor**: siguiente manejador de la cadena.
- **Pipeline de middlewares**: variante en la que varios eslabones procesan la petición y cualquiera puede cortar la cadena.
- **Patronitis**: aplicar patrones sin un problema que los justifique.

## Preguntas de repaso

1. ¿Qué responsabilidad saca Iterator de la colección y qué se gana?
   R: La responsabilidad de recorrerla y de recordar la posición actual. Se gana poder variar el recorrido sin cambiar la interfaz de la colección, una interfaz más simple y varios recorridos simultáneos e independientes.
2. ¿Cómo se implementa Iterator de forma idiomática en TypeScript?
   R: Con el protocolo de iteración: un método `[Symbol.iterator]()` (o métodos que devuelven iterables), normalmente escrito con generadores `function*`, y `async function*` con `for await` para fuentes asíncronas como APIs paginadas.
3. ¿Cuál es el principal riesgo de Chain of Responsibility y cómo se mitiga?
   R: Que ninguna pieza atienda la petición y se pierda sin aviso. Se mitiga con un comportamiento por defecto explícito al final de la cadena y registrando qué eslabón decidió.
4. ¿En qué se diferencia un pipeline de middlewares de la cadena clásica?
   R: En la clásica un solo manejador atiende la petición y la cadena termina; en el pipeline varios eslabones procesan la petición (antes y después del siguiente) y cualquiera puede cortar la cadena.
5. Describe el método para elegir un patrón.
   R: Describir el dolor concreto, identificar qué aspecto varía, buscar los patrones que permiten variar ese aspecto, comparar alternativas del mismo propósito, evaluar consecuencias y costos, aplicarlo con nombres del dominio y proteger el refactor con tests.
6. ¿Por qué los patrones suelen ser el destino de una refactorización y no el punto de partida?
   R: Porque al principio no sabes qué va a variar; los puntos de variación reales aparecen con la evolución del sistema. Aplicarlos cuando aparece el dolor evita la indirección innecesaria.

## Ejercicio

Implementa un validador de solicitudes de crédito con Chain of Responsibility: eslabones `RequiredFields`, `AgeCheck` (≥ 18), `IncomeToDebtRatio` (deuda < 40 % del ingreso) y `BlacklistCheck` (recibe un repositorio inyectado). Cada eslabón puede rechazar con un motivo o pasar al siguiente; el último aprueba. Además, crea un iterable `rejectedApplications(applications, chain)` con un generador que produzca solo las rechazadas con su motivo. **Terminado cuando:** el orden de la cadena se define en una sola función, hay al menos un test con Vitest por eslabón (aceptar y rechazar), un test demuestra que reordenar la cadena cambia el motivo de rechazo de una solicitud con varios problemas, y el generador funciona con `for...of` sin crear arreglos intermedios.

## Explícalo con tus palabras

Explica a alguien por qué "este sistema usa muchos patrones" no es un elogio, y qué preguntas harías antes de introducir uno.
