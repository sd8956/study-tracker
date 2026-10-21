---
title: "Patrones estructurales II: Decorator y Composite"
kind: lesson
hours: 2
sources: Design Patterns (GoF), Composite (pp. 183–194) | Design Patterns (GoF), Decorator (pp. 195–204) | Design Patterns (GoF), Discussion of Structural Patterns (pp. 239–240)
links: Refactoring.Guru, Decorator | https://refactoring.guru/es/design-patterns/decorator ; Refactoring.Guru, Composite | https://refactoring.guru/es/design-patterns/composite
---

## Objetivo

Aprender a agregar responsabilidades a objetos individuales en tiempo de ejecución con Decorator, y a tratar objetos simples y compuestos de forma uniforme con Composite. Ambos se basan en la **composición recursiva** y explican desde los middlewares HTTP hasta los árboles de componentes de una interfaz.

## Estudio

### Composición recursiva: la idea común

Decorator y Composite comparten un truco: un objeto que **implementa la misma interfaz** que los objetos que contiene. Gracias a eso, el cliente no distingue entre "uno" y "un envoltorio de uno" (Decorator) o entre "uno" y "un grupo de varios" (Composite). Y como el contenedor es del mismo tipo que lo contenido, puedes anidar sin límite.

```
Decorator: una cadena                  Composite: un árbol
  Logging(                                 Carpeta
    Retry(                                  ├── archivo.txt
      Timeout(                              ├── Carpeta
        HttpClient)))                       │    ├── foto.png
                                            │    └── nota.md
                                            └── video.mp4
```

### Decorator

**Intención:** agregar responsabilidades adicionales a un objeto de forma dinámica. Los decoradores ofrecen una alternativa flexible a la herencia para extender funcionalidad. También se le llama **Wrapper**, igual que Adapter, pero con una intención distinta.

#### El problema

Un toolkit de interfaz quiere permitir que cualquier componente visual tenga borde, barra de desplazamiento o ambos. Con herencia, tendrías `TextViewWithBorder`, `TextViewWithScroll`, `TextViewWithBorderAndScroll`, y lo mismo para cada componente: una **explosión combinatoria** de subclases. Además, la decisión sería estática: no podrías agregar el borde solo a un objeto concreto en ejecución.

La solución es encerrar el componente en otro objeto, el **decorador**, que cumple la misma interfaz, reenvía las peticiones al componente y hace algo extra antes o después. Como es transparente para el cliente, puedes anidar decoradores: un `BorderDecorator` que envuelve un `ScrollDecorator` que envuelve un `TextView`.

#### Participantes

- **Component**: interfaz de los objetos que pueden recibir responsabilidades.
- **ConcreteComponent**: el objeto básico.
- **Decorator**: mantiene una referencia a un `Component` y cumple su interfaz.
- **ConcreteDecorator**: agrega la responsabilidad concreta.

#### Ejemplo: un cliente HTTP con capacidades apilables

Este es probablemente el uso más útil de Decorator en un backend TypeScript: agregar logging, reintentos, timeouts o métricas a una dependencia sin tocarla.

```ts
export interface HttpClient {
  get(url: string): Promise<{ status: number; body: string }>;
}

export class FetchClient implements HttpClient {
  async get(url: string) {
    const res = await fetch(url);
    return { status: res.status, body: await res.text() };
  }
}

export class LoggingClient implements HttpClient {
  constructor(private readonly inner: HttpClient, private readonly log = console.log) {}
  async get(url: string) {
    const start = Date.now();
    const res = await this.inner.get(url);
    this.log(`GET ${url} → ${res.status} en ${Date.now() - start} ms`);
    return res;
  }
}

export class RetryClient implements HttpClient {
  constructor(private readonly inner: HttpClient, private readonly attempts = 3) {}
  async get(url: string) {
    let last: unknown;
    for (let i = 0; i < this.attempts; i++) {
      try {
        const res = await this.inner.get(url);
        if (res.status < 500) return res;          // solo reintenta errores de servidor
        last = new Error(`HTTP ${res.status}`);
      } catch (e) { last = e; }
    }
    throw last;
  }
}

export class TimeoutClient implements HttpClient {
  constructor(private readonly inner: HttpClient, private readonly ms: number) {}
  get(url: string) {
    return Promise.race([
      this.inner.get(url),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), this.ms)),
    ]);
  }
}

// Ensamblaje: el orden es una decisión de diseño
const client: HttpClient =
  new LoggingClient(new RetryClient(new TimeoutClient(new FetchClient(), 2_000), 3));
```

Lee la cadena de fuera hacia dentro: cada llamada se registra **una vez** (el logging está fuera), se reintenta hasta 3 veces, y **cada intento** tiene su propio timeout de 2 segundos. Si pusieras el `TimeoutClient` por fuera del `RetryClient`, los 2 segundos serían para todos los intentos juntos. Mismo conjunto de piezas, comportamiento distinto: por eso el ensamblaje debe estar en un lugar visible.

#### Decorator en el ecosistema que ya conoces

- Los **middlewares** de Express o Koa son una cadena de decoradores sobre el manejo de la petición.
- Los **interceptores** de clientes HTTP son decoradores de las llamadas.
- Las **funciones de orden superior** (`withAuth(handler)`, `memoize(fn)`) son decoradores funcionales: reciben una función y devuelven otra con la misma firma.
- Los **decoradores de TypeScript** (`@Injectable()`, `@Get()`) comparten el nombre, pero son otra cosa: metaprogramación que anota clases y métodos. A veces se usan para implementar el patrón, pero no son el patrón.

```ts
// Decorator funcional: misma firma de entrada y salida
type Handler = (req: { user?: string }) => Promise<string>;

const withAuth = (h: Handler): Handler => async (req) => {
  if (!req.user) throw new Error("401");
  return h(req);
};
const withTiming = (h: Handler): Handler => async (req) => {
  const t = performance.now();
  try { return await h(req); } finally { console.log(`${performance.now() - t} ms`); }
};

const handler: Handler = withTiming(withAuth(async (req) => `Hola ${req.user}`));
```

#### Consecuencias

| ✅ Ventajas | ❌ Costos |
| --- | --- |
| Más flexible que la herencia: agregas y quitas responsabilidades en ejecución, y puedes aplicar la misma dos veces (doble borde). | Un decorador y su componente **no son idénticos**: comparar identidad de objetos falla. |
| Evita clases sobrecargadas arriba en la jerarquía: pagas solo por lo que usas, añadiendo funcionalidad de forma incremental. | Muchos objetos pequeños parecidos: depurar una cadena larga cuesta. |
| Cada decorador se testea por separado con un componente falso. | Si la interfaz es grande, cada decorador debe reenviar todos los métodos. |

Ese último costo es importante: Decorator funciona mejor con **interfaces pequeñas**. Si tu componente tiene 25 métodos, cada decorador tendrá 24 métodos de puro reenvío. Es otra razón para seguir el principio de segregación de interfaces (que verás en la sesión 12). El libro lo dice así: mantén ligera la clase base común, centrada en la interfaz y no en almacenar datos.

#### Decorator vs. Strategy

El libro compara ambas formas de cambiar un objeto: Decorator cambia la **piel** del objeto (lo envuelve desde fuera; el componente no sabe nada de sus decoradores), mientras que Strategy cambia sus **tripas** (el objeto delega una parte de su comportamiento en una estrategia que él conoce). Si el componente es pesado o tiene una interfaz grande, Strategy suele ser mejor; si quieres agregar capacidades transversales sin que el componente lo sepa, Decorator.

### Composite

**Intención:** componer objetos en estructuras de árbol para representar jerarquías parte-todo. Composite permite que los clientes traten de manera uniforme a los objetos individuales y a las composiciones de objetos.

#### El problema

En un editor de diagramas, el usuario agrupa figuras simples para formar figuras más grandes, que a su vez se agrupan. Si el código trata de forma distinta a las figuras primitivas y a los contenedores, cada operación (dibujar, mover, calcular el área ocupada) se llena de `if (esGrupo)`. La clave del patrón es una interfaz común (`Graphic`) que representa **tanto** a las primitivas como a los contenedores: `Picture` implementa `draw()` llamando a `draw()` de sus hijos, y como también es un `Graphic`, puede contener otras `Picture`.

```
               «interface» Component
               + operation()
                  ▲            ▲
          ┌───────┘            └────────┐
      Leaf                       Composite
      + operation()              + operation()  → para cada hijo: hijo.operation()
                                 + add(c), remove(c), children
                                 children: Component[] ◆──────────▶ Component
```

#### Ejemplo: reglas de precio componibles

Composite no es solo para gráficos. Un uso de negocio muy potente es representar **reglas** como árboles: una regla compuesta que aplica todas sus subreglas, otra que aplica la mejor, etc.

```ts
export interface Cart { total: number; items: number; customerTier: "regular" | "vip" }

export interface Discount {
  amount(cart: Cart): number; // cuánto descuenta
  describe(): string;
}

// Hojas
export class PercentOff implements Discount {
  constructor(private pct: number) {}
  amount(c: Cart) { return c.total * this.pct; }
  describe() { return `${this.pct * 100}%`; }
}
export class VipOnly implements Discount {
  constructor(private inner: Discount) {}           // (esto es un Decorator, ¡se combinan!)
  amount(c: Cart) { return c.customerTier === "vip" ? this.inner.amount(c) : 0; }
  describe() { return `${this.inner.describe()} solo VIP`; }
}
export class FixedOff implements Discount {
  constructor(private value: number, private minItems: number) {}
  amount(c: Cart) { return c.items >= this.minItems ? this.value : 0; }
  describe() { return `$${this.value} desde ${this.minItems} ítems`; }
}

// Compuestos
export class AllOf implements Discount {
  constructor(private children: Discount[]) {}
  amount(c: Cart) { return this.children.reduce((s, d) => s + d.amount(c), 0); }
  describe() { return `todos(${this.children.map((d) => d.describe()).join(", ")})`; }
}
export class BestOf implements Discount {
  constructor(private children: Discount[]) {}
  amount(c: Cart) { return Math.max(0, ...this.children.map((d) => d.amount(c))); }
  describe() { return `mejor(${this.children.map((d) => d.describe()).join(", ")})`; }
}

// Un árbol de reglas: el cliente solo llama amount()
const blackFriday: Discount = new BestOf([
  new PercentOff(0.1),
  new AllOf([new VipOnly(new PercentOff(0.05)), new FixedOff(20_000, 3)]),
]);
```

El código que aplica descuentos no sabe si recibe una hoja o un árbol de diez niveles: llama `amount(cart)`. Agregar un tipo de combinación nuevo (por ejemplo, `FirstApplicable`) es agregar una clase, sin tocar las existentes.

#### Decisiones de implementación

El libro discute varias, y estas son las que más importan:

1. **¿Dónde declarar `add` y `remove`?** Si los declaras en la interfaz común, ganas **transparencia** (el cliente trata todo igual) pero pierdes **seguridad** (alguien puede intentar agregar hijos a una hoja). Si los declaras solo en el compuesto, ganas seguridad pero el cliente a veces debe saber con qué trata. En TypeScript se suele preferir la seguridad: interfaz común mínima y métodos de gestión solo en el compuesto.
2. **Referencias al padre.** Facilitan subir por el árbol (por ejemplo, para calcular rutas), pero hay que mantenerlas consistentes al mover nodos.
3. **Orden de los hijos.** A veces importa (el orden de dibujo, el orden de evaluación de reglas).
4. **Caché en el compuesto.** Un compuesto puede cachear resultados costosos de sus hijos (como el área total), invalidando cuando un hijo cambia.
5. **¿Quién elimina a los hijos?** En lenguajes con recolector de basura no es un problema, pero sí importa al persistir el árbol.

#### Consecuencias

- ✅ Define jerarquías de objetos primitivos y compuestos, y simplifica al cliente, que no distingue entre ellos.
- ✅ Facilita agregar nuevos tipos de componentes: funcionan automáticamente con el código existente.
- ❌ Puede hacer el diseño **demasiado general**: es difícil restringir qué componentes puede contener un compuesto (por ejemplo, "un pedido solo puede contener líneas, no otros pedidos"). Necesitarás comprobaciones en ejecución o tipos más específicos.

#### Dónde aparece Composite

- Sistemas de archivos (carpetas y archivos).
- Árboles de componentes de interfaz (un `<div>` contiene otros elementos; en React, un componente devuelve otros componentes).
- Menús con submenús, organigramas, estructuras de costos (un proyecto con fases con tareas).
- Expresiones y reglas (filtros con AND/OR, como verás con el patrón Specification en DDD).

### Cómo testear decoradores y compuestos

Los dos patrones son muy agradecidos de testear, siempre que respetes una regla: **cada pieza se prueba sola, con colaboradores falsos**, y el ensamblaje completo se prueba aparte con uno o dos tests de integración.

Para un decorador, el colaborador falso es un componente que registra lo que recibe y devuelve lo que tú le programes. Así compruebas exactamente lo que agrega el decorador y nada más:

```ts
import { expect, test } from "vitest";

class ScriptedClient implements HttpClient {
  calls = 0;
  constructor(private readonly statuses: number[]) {}
  async get() {
    const status = this.statuses[Math.min(this.calls++, this.statuses.length - 1)];
    return { status, body: "" };
  }
}

test("RetryClient reintenta errores 5xx y devuelve el primer éxito", async () => {
  const fake = new ScriptedClient([503, 502, 200]);
  const res = await new RetryClient(fake, 3).get("/x");
  expect(res.status).toBe(200);
  expect(fake.calls).toBe(3);
});

test("RetryClient no reintenta errores 4xx", async () => {
  const fake = new ScriptedClient([404]);
  await new RetryClient(fake, 3).get("/x");
  expect(fake.calls).toBe(1);
});
```

Para un compuesto, construye árboles pequeños con hojas triviales cuyo resultado conoces (por ejemplo, un descuento fijo de 10 y otro de 30) y comprueba la regla de combinación: que `BestOf` devuelve 30, que `AllOf` devuelve 40 y que un árbol vacío devuelve 0. Ese último caso límite es el que más se olvida: ¿qué significa "el mejor de ningún descuento"? En el ejemplo, `Math.max(0, ...[])` devuelve 0, que es una decisión de negocio razonable, pero debe estar fijada por un test.

### Composite y persistencia

En aplicaciones reales los árboles suelen guardarse en una base de datos o en JSON (por ejemplo, reglas configurables desde un panel de administración). Un enfoque limpio es separar dos representaciones: una **estructura de datos plana y serializable** (`{ type: "bestOf", children: [...] }`) y el **árbol de objetos** con comportamiento. Una función recursiva convierte la primera en el segundo:

```ts
type DiscountSpec =
  | { type: "percent"; pct: number }
  | { type: "fixed"; value: number; minItems: number }
  | { type: "allOf" | "bestOf"; children: DiscountSpec[] };

export function fromSpec(s: DiscountSpec): Discount {
  switch (s.type) {
    case "percent": return new PercentOff(s.pct);
    case "fixed": return new FixedOff(s.value, s.minItems);
    case "allOf": return new AllOf(s.children.map(fromSpec));
    case "bestOf": return new BestOf(s.children.map(fromSpec));
  }
}
```

Esta función es una pequeña fábrica recursiva (sesión 4) que construye un Composite. Gracias a la unión discriminada, TypeScript te avisa si agregas un tipo de regla nuevo y olvidas manejarlo.

### Composite + Decorator + Iterator

El libro señala que estos patrones suelen ir juntos. En el ejemplo de descuentos ya viste un decorador (`VipOnly`) dentro de un árbol compuesto: ambos implementan la misma interfaz, así que encajan sin fricción. Para recorrer un árbol compuesto sin exponer su estructura usarás Iterator (sesión 10), y para construirlo paso a paso, Builder.

### Analogía de construcción

Un **decorador** es como los acabados de una pared: sobre el muro de ladrillo (el componente) pones aislante, luego tablaroca, luego pintura. Cada capa cumple la función de "pared" y agrega una propiedad, y el orden importa (no pintas antes de poner la tablaroca). Un **composite** es el presupuesto de una obra: el costo de la casa es la suma de los costos de sus pisos, cada piso la suma de sus habitaciones, y cada habitación la suma de materiales y mano de obra. Quien pregunta "¿cuánto cuesta?" no necesita saber a qué nivel del árbol está preguntando.

### Cuándo usar y cuándo no

| Patrón | Úsalo cuando… | Evítalo cuando… |
| --- | --- | --- |
| Decorator | Quieres agregar responsabilidades transversales (logging, caché, reintentos, métricas, permisos) a objetos concretos, combinables y en ejecución. | La interfaz es enorme o el comportamiento extra depende de detalles internos del componente (usa Strategy o modifica la clase). |
| Composite | Hay una jerarquía parte-todo y quieres que el cliente trate igual a hojas y grupos. | La estructura es plana o tiene restricciones fuertes de qué puede contener qué que el tipo genérico no expresa. |

### Errores comunes

- **Decoradores que cambian el contrato.** Si `CachedRepo.save()` deja de guardar, rompiste la sustitución; un decorador agrega, no altera la semántica esperada.
- **Ensamblar decoradores por todo el código.** Hazlo en un solo lugar para que el orden sea visible y testeable.
- **Recursión sin control en Composite.** Ciclos accidentales (un grupo que se contiene a sí mismo) producen bucles infinitos; valida al agregar.
- **Usar `instanceof` para distinguir hojas de compuestos en el cliente.** Destruye la uniformidad que buscabas.
- **Composite para todo.** Si nunca hay anidamiento real, un arreglo plano es más simple.

### Resumen

Decorator envuelve un objeto con otro de la misma interfaz para añadir responsabilidades en ejecución, apilables y en un orden que importa; brilla con interfaces pequeñas y preocupaciones transversales. Composite organiza objetos en árboles donde hojas y grupos comparten interfaz, de modo que el cliente opera sobre toda la estructura con una sola llamada. Ambos usan composición recursiva y se combinan muy bien entre sí.

## Conceptos clave

- **Decorator**: objeto que envuelve a otro con la misma interfaz para agregar comportamiento antes o después de reenviar la llamada.
- **Explosión combinatoria de subclases**: proliferación de clases para cubrir todas las combinaciones de características mediante herencia.
- **Preocupación transversal**: responsabilidad que afecta a muchas partes del sistema, como logging, métricas, reintentos o permisos.
- **Composite**: objeto contenedor que implementa la misma interfaz que sus elementos y delega en ellos recursivamente.
- **Jerarquía parte-todo**: estructura en la que un todo está formado por partes que pueden ser, a su vez, todos.
- **Transparencia vs. seguridad**: tensión entre declarar las operaciones de gestión de hijos en la interfaz común o solo en el compuesto.

## Preguntas de repaso

1. ¿Qué problema de la herencia resuelve Decorator?
   R: La explosión combinatoria de subclases para cada combinación de características y la decisión estática: con decoradores combinas responsabilidades en ejecución, solo en los objetos que lo necesitan.
2. ¿Por qué el orden de los decoradores importa? Da un ejemplo.
   R: Porque cada uno envuelve al siguiente. Un timeout dentro de un reintento limita cada intento; un timeout fuera del reintento limita todos los intentos juntos. El mismo conjunto de piezas produce comportamientos distintos.
3. ¿Por qué Decorator funciona mejor con interfaces pequeñas?
   R: Porque cada decorador debe implementar toda la interfaz y reenviar los métodos que no le interesan; con interfaces grandes se llena de código de reenvío y es más propenso a errores.
4. ¿Qué diferencia hay entre Decorator y Strategy según el libro?
   R: Decorator cambia la "piel" del objeto envolviéndolo desde fuera sin que el componente lo sepa; Strategy cambia las "tripas", porque el objeto delega parte de su comportamiento en una estrategia que conoce.
5. ¿Qué tensión hay al decidir dónde declarar `add` y `remove` en Composite?
   R: Declararlos en la interfaz común da transparencia (todo se trata igual) pero permite errores como agregar hijos a una hoja; declararlos solo en el compuesto da seguridad pero obliga al cliente a saber a veces con qué trata.
6. ¿Cuál es la principal desventaja de Composite?
   R: Que puede hacer el diseño demasiado general, dificultando restringir qué componentes puede contener un compuesto; esas restricciones acaban requiriendo comprobaciones en tiempo de ejecución.

## Ejercicio

Construye un sistema de permisos con Composite: una interfaz `Rule { allows(user: User, action: string): boolean; explain(): string }`, hojas `HasRole(role)`, `IsOwner()` y `DuringBusinessHours(clock)`, y compuestos `AllOf`, `AnyOf` y `Not`. Después escribe un decorador `AuditedRule` que registre cada evaluación en un `AuditLog` inyectado sin cambiar el resultado. **Terminado cuando:** puedes expresar "admin, o dueño en horario laboral" como un árbol, `explain()` devuelve una descripción legible del árbol completo, hay al menos 6 tests con Vitest (incluyendo uno con reloj falso) y el decorador no altera ningún resultado (compruébalo con un test que compare la regla decorada y sin decorar en varios casos).

## Explícalo con tus palabras

Explica con la analogía de las capas de una pared y del presupuesto de una obra por qué Decorator y Composite se basan en la misma idea de "un objeto que se parece a lo que contiene".
