---
title: "Patrones creacionales II: Builder, Singleton (con cuidado) y Prototype"
kind: lesson
hours: 2
sources: Design Patterns (GoF), Builder (pp. 117–126) | Design Patterns (GoF), Prototype (pp. 137–146) | Design Patterns (GoF), Singleton (pp. 147–154) | Design Patterns (GoF), Discussion of Creational Patterns (pp. 155–156)
links: Refactoring.Guru, Builder | https://refactoring.guru/es/design-patterns/builder ; Refactoring.Guru, Singleton | https://refactoring.guru/es/design-patterns/singleton
---

## Objetivo

Saber construir objetos complejos paso a paso con Builder, entender qué promete Singleton y por qué hoy se usa con mucha cautela, conocer Prototype como alternativa basada en clonar, y elegir entre todos los creacionales según lo que necesitas variar.

## Estudio

### Builder

**Intención:** separar la construcción de un objeto complejo de su representación, de modo que el mismo proceso de construcción pueda crear representaciones distintas.

#### El problema original

Un lector de documentos RTF debe convertir el texto a muchos formatos: texto plano ASCII, TeX, o un widget de texto editable. La cantidad de conversiones posibles es abierta, así que añadir una nueva no debería obligar a modificar el lector.

La solución del libro: el lector (llamado **director**) recorre el documento y, cada vez que reconoce un elemento (un carácter, un cambio de fuente, un párrafo), le pide a un **builder** que lo convierta. Cada builder concreto sabe producir una representación: el de ASCII ignora todo menos el texto, el de TeX traduce también los estilos, el de widget construye un objeto de interfaz. El algoritmo de lectura se reutiliza; lo que cambia es el objeto que se va armando.

```
┌───────────────┐   usa    ┌─────────────────────┐
│ Director      │─────────▶│ «interface» Builder │
│ (RtfReader)   │          │ addText()           │
│ construct()   │          │ addHeading()        │
└───────────────┘          │ addParagraphBreak() │
                           └─────▲─────────▲─────┘
                                 │         │
                   ┌─────────────┴──┐  ┌───┴─────────────┐
                   │ MarkdownBuilder│  │ HtmlBuilder     │
                   │ getResult()    │  │ getResult()     │
                   └────────────────┘  └─────────────────┘
```

#### Participantes y colaboración

- **Builder**: interfaz con un paso por cada parte del producto.
- **ConcreteBuilder**: implementa los pasos, mantiene el producto parcial y ofrece una forma de obtener el resultado (`getResult()`).
- **Director**: conoce el **orden** de los pasos y llama al builder.
- **Product**: el objeto complejo resultante; distintos builders pueden producir productos sin una interfaz común (un string Markdown y un árbol DOM no se parecen en nada).

El cliente crea el builder concreto, se lo pasa al director, el director ejecuta los pasos y el cliente recoge el resultado **del builder**, no del director. Esa última parte es importante: como los productos pueden ser muy distintos, solo el builder concreto sabe qué tipo de resultado devuelve.

```ts
interface DocBuilder {
  heading(text: string): void;
  paragraph(text: string): void;
  list(items: string[]): void;
}

class MarkdownBuilder implements DocBuilder {
  private out: string[] = [];
  heading(t: string) { this.out.push(`# ${t}`); }
  paragraph(t: string) { this.out.push(t); }
  list(items: string[]) { this.out.push(items.map((i) => `- ${i}`).join("\n")); }
  result(): string { return this.out.join("\n\n"); }
}

class HtmlBuilder implements DocBuilder {
  private out: string[] = [];
  heading(t: string) { this.out.push(`<h1>${t}</h1>`); }
  paragraph(t: string) { this.out.push(`<p>${t}</p>`); }
  list(items: string[]) {
    this.out.push(`<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`);
  }
  result(): string { return this.out.join("\n"); }
}

// Director: sabe el ORDEN de construcción de un reporte semanal
function buildWeeklyReport(b: DocBuilder, done: string[], blocked: string[]) {
  b.heading("Reporte semanal");
  b.paragraph(`Tareas cerradas: ${done.length}`);
  b.list(done);
  if (blocked.length > 0) {
    b.paragraph("Bloqueos");
    b.list(blocked);
  }
}

const md = new MarkdownBuilder();
buildWeeklyReport(md, ["Login", "Pagos"], []);
console.log(md.result());
```

#### El Builder "fluido" que usas a diario

En el código moderno el uso más frecuente de Builder no es la versión con director, sino una variante para resolver otro problema: **constructores con demasiados parámetros** (el antipatrón del "constructor telescópico"), muchos de ellos opcionales. Un builder fluido permite construir el objeto paso a paso con nombres explícitos y validar todo al final:

```ts
class HttpRequest {
  constructor(
    readonly method: "GET" | "POST",
    readonly url: string,
    readonly headers: Readonly<Record<string, string>>,
    readonly body: string | undefined,
    readonly timeoutMs: number,
    readonly retries: number,
  ) {}
}

class HttpRequestBuilder {
  private method: "GET" | "POST" = "GET";
  private url?: string;
  private headers: Record<string, string> = {};
  private body?: string;
  private timeoutMs = 5_000;
  private retries = 0;

  to(url: string) { this.url = url; return this; }
  post(body: unknown) {
    this.method = "POST";
    this.body = JSON.stringify(body);
    this.headers["content-type"] = "application/json";
    return this;
  }
  header(k: string, v: string) { this.headers[k] = v; return this; }
  timeout(ms: number) { this.timeoutMs = ms; return this; }
  retry(n: number) { this.retries = n; return this; }

  build(): HttpRequest {
    if (!this.url) throw new Error("Falta la URL");
    if (this.retries > 0 && this.method === "POST" && !this.headers["idempotency-key"]) {
      throw new Error("Un POST con reintentos necesita idempotency-key");
    }
    return new HttpRequest(
      this.method, this.url, { ...this.headers }, this.body, this.timeoutMs, this.retries,
    );
  }
}

const req = new HttpRequestBuilder()
  .to("https://api.example.com/orders")
  .post({ sku: "A1", qty: 2 })
  .header("idempotency-key", "ord-123")
  .retry(3)
  .build();
```

Fíjate en que el builder valida **reglas entre campos** (un POST con reintentos necesita clave de idempotencia) en un solo lugar, y que el producto final es **inmutable**: una vez construido no puede quedar a medias.

En TypeScript, para objetos simples, a menudo basta con un objeto de opciones con valores por defecto (`function createRequest(opts: Partial<Options>)`). Usa el builder cuando la construcción tenga pasos, validaciones cruzadas o varias representaciones.

#### Builder en los tests: el "test data builder"

Un uso muy práctico, que vas a agradecer en los proyectos de este módulo, es construir datos de prueba. Cuando una entidad tiene diez campos obligatorios, cada test acaba repitiendo un objeto enorme en el que solo importa un campo. Eso tiene dos problemas: los tests son difíciles de leer (no se ve qué dato es relevante) y frágiles (si agregas un campo obligatorio, se rompen todos).

Un test data builder parte de un objeto **válido por defecto** y te deja cambiar solo lo que el test necesita:

```ts
interface Order {
  id: string;
  customerId: string;
  status: "draft" | "paid" | "shipped";
  lines: { sku: string; qty: number; price: number }[];
  createdAt: Date;
}

export class OrderBuilder {
  private order: Order = {
    id: "ord-1",
    customerId: "cus-1",
    status: "draft",
    lines: [{ sku: "SKU-1", qty: 1, price: 100 }],
    createdAt: new Date("2026-01-01T00:00:00Z"),
  };
  paid() { this.order = { ...this.order, status: "paid" }; return this; }
  withLine(sku: string, qty: number, price: number) {
    this.order = { ...this.order, lines: [...this.order.lines, { sku, qty, price }] };
    return this;
  }
  withoutLines() { this.order = { ...this.order, lines: [] }; return this; }
  build(): Order { return structuredClone(this.order); }
}

// El test dice exactamente qué le importa:
const empty = new OrderBuilder().withoutLines().build();
const paidBig = new OrderBuilder().paid().withLine("SKU-2", 10, 50).build();
```

Así, un test que comprueba "no se puede pagar un pedido sin líneas" solo menciona `withoutLines()`, y el lector entiende al instante la intención. Si mañana `Order` gana un campo obligatorio, lo agregas en un solo lugar: el valor por defecto del builder. Es el mismo principio del patrón (separar el proceso de construcción del uso), aplicado a la legibilidad de las pruebas.

#### Consecuencias

- Permite **variar la representación interna** del producto: para una representación nueva, escribes un builder nuevo.
- **Aísla el código de construcción y representación**: el director no sabe cómo se ensambla el producto.
- **Da control fino** sobre el proceso: el producto se construye paso a paso bajo la dirección del director, y solo se obtiene al final.

#### Builder frente a Abstract Factory

Ambos pueden construir objetos complejos, pero Builder se centra en construir **paso a paso** y devuelve el producto como **paso final**, mientras que Abstract Factory se centra en **familias** de productos y devuelve cada producto inmediatamente. Builder a menudo construye un Composite.

### Singleton

**Intención:** asegurar que una clase tenga una sola instancia y proporcionar un punto de acceso global a ella.

#### Lo que promete

Algunos recursos parecen únicos por naturaleza: un spooler de impresión, el sistema de archivos, el gestor de ventanas, un pool de conexiones. Una variable global hace accesible el objeto, pero no impide que alguien cree otro. Singleton hace que **la propia clase** controle su única instancia: oculta el constructor y expone una operación estática que crea la instancia la primera vez y la devuelve siempre.

El libro le reconoce ventajas reales frente a las variables globales: acceso controlado, espacio de nombres más limpio, posibilidad de subclasificar la instancia y de cambiar de idea para permitir más de una instancia.

```ts
// Singleton clásico en TypeScript
export class AppConfig {
  private static instance: AppConfig | undefined;
  private constructor(readonly dbUrl: string, readonly env: string) {}

  static get(): AppConfig {
    if (!AppConfig.instance) {
      AppConfig.instance = new AppConfig(
        process.env.DATABASE_URL ?? "file:dev.db",
        process.env.NODE_ENV ?? "development",
      );
    }
    return AppConfig.instance;
  }
}
```

#### Por qué tener cuidado

Con los años, Singleton se convirtió en uno de los patrones más criticados. No porque "una sola instancia" sea mala idea, sino por la segunda mitad de la intención: **el acceso global**.

| Problema | Qué ocurre en la práctica |
| --- | --- |
| **Dependencias ocultas** | Si una clase llama a `AppConfig.get()` dentro de un método, su constructor no dice que depende de la configuración. Lees la firma y te mienten. |
| **Tests acoplados** | El estado del singleton sobrevive entre tests; un test que cambia la instancia contamina al siguiente. Sustituirlo exige trucos (métodos `reset()` solo para tests). |
| **Estado global mutable** | Cualquier parte del sistema puede modificarlo; es una variable global con traje. |
| **Viola SRP** | La clase hace su trabajo y además gestiona su ciclo de vida. |
| **Concurrencia** | En lenguajes multihilo, la inicialización perezosa necesita sincronización. En Node.js es menos grave, pero aparecen problemas parecidos con inicializaciones asíncronas que se disparan dos veces. |
| **"Único" es relativo** | Hoy hay una base de datos; mañana hay una de lectura y otra de escritura, o un tenant por cliente. |

#### La alternativa: una sola instancia, sin acceso global

Casi siempre puedes conservar la parte buena (crear el objeto una sola vez) y eliminar la mala (el acceso global) creando la instancia **en el composition root** e inyectándola:

```ts
// main.ts (composition root)
const config = loadConfig(process.env);       // se crea UNA vez
const db = createPool(config.dbUrl);           // UNA vez
const orders = new OrderService(db, config);   // se pasa explícitamente
startHttpServer(orders);
```

Ahora `OrderService` declara sus dependencias en el constructor, los tests le pasan versiones falsas y nada impide tener dos instancias cuando haga falta. La "unicidad" es una decisión de ensamblaje, no una propiedad de la clase.

Detalle propio del ecosistema JavaScript: **un módulo ES ya es un singleton**. Si haces `export const pool = createPool()`, ese objeto se evalúa una vez y todos los imports comparten la misma instancia. Es cómodo, pero tiene exactamente los mismos riesgos de acceso global. Úsalo para cosas realmente inmutables (constantes, un logger sin estado) y prefiere inyección para lo demás.

#### Cuándo un singleton es razonable

- Objetos **sin estado mutable** o de solo lectura, como un registro de constantes.
- Recursos costosos que **deben** compartirse (un pool de conexiones), siempre que se creen en el arranque y se inyecten.
- Cachés de proceso bien encapsulados, con la conciencia de que en un despliegue con varias instancias del servicio cada proceso tiene la suya.

### Prototype (en breve)

**Intención:** especificar los tipos de objetos a crear mediante una instancia prototípica, y crear objetos nuevos **copiando** ese prototipo.

En lugar de una jerarquía de fábricas, registras objetos ya configurados y los clonas. Es útil cuando las clases a instanciar se deciden en ejecución, cuando quieres evitar una jerarquía de fábricas paralela a la de productos, o cuando las instancias solo difieren en unas pocas combinaciones de estado (por ejemplo, plantillas de documentos preconfiguradas).

```ts
interface Cloneable<T> { clone(): T }

class InvoiceTemplate implements Cloneable<InvoiceTemplate> {
  constructor(public currency: string, public taxRate: number, public notes: string[]) {}
  clone() { return new InvoiceTemplate(this.currency, this.taxRate, [...this.notes]); }
}

const templates = new Map<string, InvoiceTemplate>([
  ["co", new InvoiceTemplate("COP", 0.19, ["Régimen común"])],
  ["mx", new InvoiceTemplate("MXN", 0.16, [])],
]);

const draft = templates.get("co")!.clone(); // copia independiente
draft.notes.push("Pago a 30 días");
```

El punto delicado es la **copia profunda vs. superficial**: si clonas solo la referencia al arreglo `notes`, todos los clones compartirán la misma lista. En JavaScript moderno tienes `structuredClone()` para copias profundas de datos planos, pero no copia métodos ni instancias de clases con lógica propia.

### Discusión: cómo elegir un patrón creacional

Hay dos formas de parametrizar un sistema con las clases de objetos que crea:

1. **Mediante subclases** de la clase que crea los objetos: Factory Method. Simple, pero puede obligar a crear subclases solo para cambiar el producto, y los cambios se encadenan.
2. **Mediante composición de objetos**: definir un objeto responsable de conocer la clase de los productos y pasarlo como parámetro. Es lo que hacen Abstract Factory (un objeto fábrica que crea varias clases), Builder (un objeto que construye paso a paso un producto complejo) y Prototype (un objeto que se copia a sí mismo).

| Necesitas… | Patrón |
| --- | --- |
| Que una subclase o una función decida qué crear | Factory Method |
| Crear familias coherentes intercambiables | Abstract Factory |
| Construir paso a paso, validar al final o producir varias representaciones | Builder |
| Copiar objetos ya configurados elegidos en ejecución | Prototype |
| Garantizar una sola instancia | Créala una vez en el composition root; Singleton clásico solo si no hay alternativa |

El libro observa que los diseños suelen empezar con Factory Method y evolucionar hacia los demás a medida que el diseñador descubre dónde necesita flexibilidad.

### Analogía de construcción

Builder es el maestro de obra que sigue siempre la misma secuencia (cimientos, estructura, muros, techo, acabados), pero con cuadrillas distintas puede producir una casa de ladrillo o una de madera. Prototype es la casa modelo de un desarrollo inmobiliario: no diseñas cada casa desde cero, copias la modelo y cambias detalles. Singleton es la única llave maestra del edificio: útil, pero si cualquiera puede ir a buscarla al tablero de la entrada, pronto nadie sabe quién la tiene ni qué abrió con ella; es mejor entregarla explícitamente a quien la necesita.

### Elegir rápido entre los creacionales

Una regla práctica para el día a día en TypeScript: si solo necesitas desacoplar *qué* clase se crea, pasa una función fábrica; si necesitas varias piezas coherentes entre sí, una fábrica abstracta; si el objeto tiene muchos campos opcionales o reglas entre campos, un builder; si ya tienes objetos configurados que quieres reutilizar como plantilla, un prototipo con copia profunda; y si necesitas una sola instancia, créala una vez en el arranque. Casi nunca necesitarás más que eso, y si dudas entre dos opciones, empieza por la más simple: pasar de una función fábrica a una fábrica abstracta es un refactor pequeño y seguro.

### Errores comunes

- **Builder para objetos de dos campos.** Un objeto literal tipado es más claro.
- **Builders que permiten obtener objetos inválidos.** Si `build()` no valida, has movido el problema en lugar de resolverlo.
- **Productos mutables tras el build.** Pierdes la garantía de consistencia que daba la validación.
- **Singleton para "compartir datos" entre módulos.** Es estado global; pasa los datos explícitamente o usa un servicio inyectado.
- **Métodos `resetForTests()` en producción.** Indican que la dependencia debería inyectarse.
- **Clones superficiales accidentales** en Prototype que comparten arreglos u objetos internos.

### Resumen

Builder separa el orden de construcción (director) de la representación resultante (builders concretos), y en su versión fluida resuelve constructores con muchos parámetros y validaciones cruzadas. Singleton garantiza una sola instancia, pero su acceso global oculta dependencias y complica los tests; casi siempre es mejor crear la instancia una vez y pasarla. Prototype crea objetos copiando instancias configuradas, cuidando la profundidad de la copia. Elige el creacional por lo que necesitas variar.

## Conceptos clave

- **Builder**: objeto que construye paso a paso un producto complejo y lo entrega al final.
- **Director**: objeto que conoce el orden de los pasos de construcción y los ejecuta sobre un builder.
- **Builder fluido**: builder cuyos métodos devuelven `this` para encadenar llamadas y que valida en `build()`.
- **Constructor telescópico**: constructor con muchos parámetros, varios opcionales, difícil de leer y de usar correctamente.
- **Singleton**: clase que garantiza una única instancia y ofrece acceso global a ella.
- **Dependencia oculta**: dependencia que no aparece en la firma de una clase porque se obtiene desde un punto global.
- **Prototype**: creación de objetos clonando una instancia ya configurada.
- **Copia profunda vs. superficial**: copiar también los objetos internos frente a copiar solo las referencias.

## Preguntas de repaso

1. ¿Qué separa Builder y qué papel cumple el director?
   R: Separa el proceso de construcción de la representación del producto. El director conoce el orden de los pasos y los ejecuta sobre un builder; cada builder concreto decide cómo representar cada parte y entrega el resultado al final.
2. ¿Por qué el cliente pide el resultado al builder y no al director?
   R: Porque los productos de distintos builders pueden no tener una interfaz común (un string y un árbol DOM, por ejemplo); solo el builder concreto conoce el tipo de su producto.
3. ¿Qué problema cotidiano resuelve un builder fluido?
   R: Constructores con muchos parámetros, varios opcionales y reglas entre campos. Permite nombrar cada valor, aplicar valores por defecto y validar todas las reglas en `build()`, entregando un objeto inmutable y válido.
4. ¿Cuál es el principal problema de Singleton y cómo se resuelve sin perder la instancia única?
   R: El acceso global, que oculta dependencias, acopla los tests y crea estado global mutable. Se resuelve creando la instancia una sola vez en el composition root e inyectándola por constructor a quien la necesite.
5. ¿Por qué un módulo ES se comporta como un singleton y qué implica?
   R: Porque se evalúa una sola vez y todos los imports comparten sus exports. Es cómodo, pero un objeto mutable exportado así tiene los mismos riesgos que un singleton: acceso global y difícil sustitución en tests.
6. ¿Qué riesgo tiene Prototype al clonar?
   R: Hacer una copia superficial que comparta objetos internos (arreglos, objetos anidados) entre el prototipo y el clon, de modo que modificar uno afecta al otro.
7. ¿En qué se diferencian Builder y Abstract Factory?
   R: Builder construye un producto complejo paso a paso y lo entrega al final; Abstract Factory crea familias de productos y devuelve cada uno inmediatamente.

## Ejercicio

Implementa un `QueryBuilder` fluido para SQL de solo lectura: `select(...cols)`, `from(table)`, `where(cond, ...params)` (acumulativo con AND), `orderBy(col, dir)` y `limit(n)`. `build()` devuelve `{ sql: string; params: unknown[] }` inmutable y lanza error si falta `from`, si `limit` es negativo o si se usa `orderBy` con una columna que no está en `select` (cuando no es `*`). Luego reemplaza cualquier `AppConfig.get()` del ejemplo de la lección por inyección en un `ReportService`. **Terminado cuando:** hay al menos 6 tests con Vitest (casos válidos e inválidos), los valores nunca se concatenan en el SQL (siempre van en `params`) y `ReportService` recibe su configuración por constructor.

## Explícalo con tus palabras

Explica por qué "una sola instancia" y "acceso global" son dos ideas distintas, y por qué conviene quedarse con la primera y evitar la segunda.
