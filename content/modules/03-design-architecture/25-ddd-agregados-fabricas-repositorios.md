---
title: "DDD IV: el ciclo de vida de los objetos de dominio: agregados, fábricas y repositorios"
kind: lesson
hours: 2
sources: Domain-Driven Design (Evans), cap. 6 "The Lifecycle of a Domain Object" (pp. 88–114) | Domain-Driven Design (Evans), cap. 7 "A Cargo Shipping System" (pp. 115–132)
links: Vaughn Vernon, "Effective Aggregate Design" (PDF) | https://www.dddcommunity.org/library/vernon_2011/
---

## Objetivo

Aprender a gestionar el ciclo de vida de los objetos del dominio: delimitar **agregados** con una raíz y un límite que protegen las invariantes, encapsular la creación compleja en **fábricas** y dar acceso a los agregados persistidos mediante **repositorios** que se comportan como colecciones, conectando todo con los **eventos de dominio**.

## Estudio

### El problema: el ciclo de vida y las invariantes

Todo objeto tiene un ciclo de vida: se crea, pasa por varios estados, se guarda, se recupera, quizá se archiva y finalmente se borra. Para objetos simples no hay drama, pero en un modelo con muchas asociaciones aparecen dos desafíos:

1. **Mantener la integridad** durante todo el ciclo de vida: las reglas de consistencia (invariantes) deben cumplirse siempre.
2. **No ahogar el modelo** en la complejidad de gestionar ese ciclo de vida (crear, guardar, buscar).

Evans propone tres patrones: **AGREGADOS** para lo primero, **FÁBRICAS** y **REPOSITORIOS** para lo segundo.

Piensa en este problema: si borras una `Persona` de la base de datos, ¿borras también su `Dirección`? Si otras personas comparten esa dirección, quedarían apuntando a algo borrado. Si no la borras, se acumula basura. Y en un sistema con usuarios concurrentes, ¿qué objetos hay que bloquear cuando alguien modifica un pedido: solo el pedido, también sus líneas, también el producto, el cliente...? En un modelo con una red de asociaciones sin límites claros, **no hay un límite obvio** para el efecto de un cambio. El problema no es técnico: está en el modelo, en su falta de fronteras.

### Agregados

Un **AGREGADO** es un grupo de objetos asociados que se trata como **una unidad** para los cambios de datos. Tiene:

- Una **raíz**: una entidad concreta, la única puerta de entrada al agregado.
- Un **límite**: define qué hay dentro.

```
            ┌───────────────── Agregado Pedido ─────────────────┐
 Cliente ─ ─│─ ─▶ ┌───────────┐                                 │
 (otro      │     │  Pedido   │◆────▶ LíneaDePedido ──▶ Money   │
 agregado,  │     │  (raíz)   │◆────▶ LíneaDePedido ──▶ Money   │
 por ID)    │     └───────────┘                                 │
            │       │ envío: DirecciónDeEnvío (value object)    │
            └───────────────────────────────────────────────────┘
   Desde fuera: solo se referencia y se habla con la raíz (Pedido).
```

#### Las reglas de los agregados

1. **La raíz tiene identidad global** y es responsable de comprobar las invariantes.
2. Las entidades **dentro** del límite tienen identidad **local**: solo es única dentro del agregado (la línea 3 del pedido 1001).
3. **Nada fuera del agregado puede guardar una referencia a algo de su interior**, excepto a la raíz. La raíz puede entregar referencias temporales a objetos internos (o, mejor, copias de value objects), pero nadie debe conservarlas.
4. Solo las raíces se obtienen directamente con consultas a la base de datos; los demás objetos se encuentran **navegando** desde la raíz.
5. Los objetos internos pueden tener referencias a raíces de **otros** agregados.
6. Una operación de **borrado** debe eliminar todo lo que está dentro del límite de una vez.
7. Cuando se confirma un cambio en cualquier objeto del agregado, **todas las invariantes del agregado deben cumplirse**.

Ejemplo clásico de Evans: un auto es la raíz de un agregado que incluye sus neumáticos. Un neumático tiene una posición y un historial de kilometraje, pero a nadie le interesa un neumático fuera del contexto de su auto. Para "rotar" los neumáticos se le pide al auto, que mantiene su invariante. El motor, en cambio, puede tener su propio número de serie y rastrearse por separado: puede ser la raíz de otro agregado.

#### Invariantes: la razón de ser del agregado

Una **invariante** es una regla de consistencia que debe cumplirse cada vez que cambian los datos. Ejemplos:

- "El total de un pedido no puede superar el límite de crédito aprobado para ese pedido."
- "Un pedido tiene al menos una línea."
- "Un mismo producto no aparece en dos líneas del mismo pedido; se suma la cantidad."

El agregado se define **alrededor de las invariantes**: los objetos que deben ser consistentes entre sí **en todo momento** van en el mismo agregado. Evans muestra un ejemplo de órdenes de compra donde dos usuarios editan a la vez líneas distintas del mismo pedido: cada uno, por separado, respeta el límite de aprobación; juntos, lo superan. Si las líneas fueran objetos independientes, nada lo impediría. Al hacer del pedido la raíz y bloquear (o versionar) el agregado completo, la invariante se protege.

Y una consecuencia elegante: el **precio** del producto no forma parte del agregado del pedido (el catálogo cambia por su cuenta), así que la línea **copia** el precio en el momento de la compra. Exactamente lo que viste al normalizar en la sesión 19.

```ts
export class OrderLine {
  constructor(readonly productId: string, readonly quantity: number, readonly unitPrice: Money) {
    if (quantity <= 0) throw new Error("Cantidad inválida");
  }
  total() { return this.unitPrice.multiply(this.quantity); }
  withQuantity(q: number) { return new OrderLine(this.productId, q, this.unitPrice); }
}

export type OrderEvent =
  | { type: "OrderPlaced"; orderId: string; total: string }
  | { type: "OrderLineAdded"; orderId: string; productId: string };

export class Order {
  private lines: OrderLine[] = [];
  private status: "draft" | "placed" = "draft";
  private events: OrderEvent[] = [];

  constructor(readonly id: string, readonly customerId: string, private readonly approvedLimit: Money) {}

  addLine(productId: string, quantity: number, unitPrice: Money) {
    this.assertDraft();
    const existing = this.lines.find((l) => l.productId === productId);
    const next = existing
      ? this.lines.map((l) => (l === existing ? l.withQuantity(l.quantity + quantity) : l))
      : [...this.lines, new OrderLine(productId, quantity, unitPrice)];
    this.assertWithinLimit(next);                    // invariante ANTES de aplicar
    this.lines = next;
    this.events.push({ type: "OrderLineAdded", orderId: this.id, productId });
  }

  place() {
    this.assertDraft();
    if (this.lines.length === 0) throw new Error("Un pedido necesita al menos una línea");
    this.status = "placed";
    this.events.push({ type: "OrderPlaced", orderId: this.id, total: this.total().toString() });
  }

  total() { return this.lines.reduce((s, l) => s.add(l.total()), Money.of(0, "COP")); }
  get lineCount() { return this.lines.length; }      // nunca exponemos el arreglo interno
  pullEvents() { const e = this.events; this.events = []; return e; }

  private assertWithinLimit(lines: OrderLine[]) {
    const t = lines.reduce((s, l) => s.add(l.total()), Money.of(0, "COP"));
    if (t.isGreaterThan(this.approvedLimit)) throw new Error("Supera el límite aprobado");
  }
  private assertDraft() { if (this.status !== "draft") throw new Error("El pedido ya fue confirmado"); }
}

// Money: el value object de la sesión 24 (of, add, multiply, isGreaterThan, toString)
declare class Money {
  static of(a: number, c: "COP" | "USD"): Money;
  add(o: Money): Money; multiply(f: number): Money; isGreaterThan(o: Money): boolean; toString(): string;
}
```

Observa: `Cliente` no está dentro del agregado; el pedido lo referencia **por ID**. El precio unitario se copia. Las líneas no se exponen como arreglo mutable. Y el pedido acumula **eventos de dominio** que la aplicación publicará después de guardar (sesión 9).

#### Reglas prácticas de diseño (de la comunidad DDD)

Con los años, la comunidad destiló algunas reglas que complementan a Evans:

| Regla | Por qué |
| --- | --- |
| **Agregados pequeños** | Un agregado grande se bloquea más, se carga más lento y genera más conflictos de concurrencia. |
| **Referencia a otros agregados por ID** | Evita cargar grafos enormes y deja claro el límite. |
| **Un agregado por transacción** | Si un caso de uso necesita cambiar dos agregados, probablemente uno de ellos debe reaccionar al evento del otro (consistencia eventual). |
| **Diseña alrededor de invariantes reales** | No agrupes por "estar relacionados" sino por "deben ser consistentes en el mismo instante". |

### Fábricas

Cuando crear un objeto o un agregado completo es complejo, o revela demasiado de su estructura interna, conviene encapsular la creación en una **FÁBRICA**. La idea de Evans: un motor de auto es una máquina complicadísima, pero nadie espera que el motor **se ensamble a sí mismo**, ni que el conductor lo ensamble para conducir. Mezclar la lógica de ensamblaje con la de funcionamiento produce objetos difíciles de entender. Y si el cliente arma el objeto, queda acoplado a su estructura interna.

Una fábrica es un elemento del diseño **sin responsabilidad en el modelo del dominio**, pero que forma parte de la capa de dominio. Requisitos de una buena fábrica:

1. **Cada operación de creación es atómica**: produce un agregado completo y válido, con todas sus invariantes satisfechas, o lanza un error. Nunca un objeto a medias.
2. **Está abstraída al tipo deseado**, no a las clases concretas que crea (las sesiones 4 y 5 te dan las herramientas: Factory Method, Abstract Factory, Builder).

#### Dónde poner la fábrica

| Opción | Cuándo |
| --- | --- |
| **Método fábrica en la raíz de un agregado** | Para crear objetos internos del agregado: `order.addLine(...)` crea la línea. |
| **Método fábrica en otro objeto** que tiene la información necesaria | Un `Account` puede crear una `TradeOrder` porque tiene los datos del cliente y las reglas: `account.newTradeOrder(...)`. |
| **Fábrica independiente** | Cuando la creación no corresponde a ningún objeto del modelo o requiere coordinar varios. |
| **Constructor simple** | Cuando la creación es trivial: no todo necesita una fábrica. |

```ts
export class OrderFactory {
  constructor(private readonly creditPolicy: { limitFor(customerId: string): Money },
              private readonly newId: () => string) {}

  createFromCart(customerId: string, cart: { productId: string; qty: number; price: Money }[]) {
    if (cart.length === 0) throw new Error("El carrito está vacío");
    const order = new Order(this.newId(), customerId, this.creditPolicy.limitFor(customerId));
    for (const item of cart) order.addLine(item.productId, item.qty, item.price); // invariantes por el camino
    return order;                                                                 // completo o error
  }
}
```

#### Reconstituir objetos guardados

Las fábricas también **reconstituyen** objetos a partir de su forma persistida (filas de una base de datos, JSON). Hay dos diferencias con la creación:

- Una entidad reconstituida **no recibe un ID nuevo**: conserva el que tenía.
- Si los datos guardados violan una invariante, no basta con lanzar un error: hay que decidir qué hacer (corregir, registrar, rechazar), porque los datos ya existen.

### Repositorios

Para trabajar con un objeto necesitas una referencia a él. Puedes obtenerla creándolo, navegando desde otro objeto, o **buscándolo** en la base de datos. El riesgo de lo último es que, si cualquier parte del código puede lanzar consultas arbitrarias, los desarrolladores empiezan a saltarse los agregados y la navegación: consultan directamente lo que necesitan, la lógica de dominio se va a las consultas SQL y el modelo se vuelve irrelevante.

Un **REPOSITORIO** representa todos los objetos de cierto tipo como un **conjunto conceptual**, como si fuera una **colección en memoria**, con métodos para agregar, quitar y buscar según criterios del dominio. Oculta la tecnología de almacenamiento y da la **ilusión** de que todos los objetos están en memoria.

Reglas:

- Crea repositorios **solo para las raíces de agregados** que realmente necesitan acceso global. Los objetos internos se obtienen navegando desde la raíz.
- La interfaz habla el **lenguaje del dominio**: `pendingForCustomer(customerId)`, no `findByStatusAndCustomerIdOrderByCreatedAtDesc`.
- Devuelve **objetos del dominio completos** (agregados reconstituidos), no filas.
- **Deja el control de las transacciones al cliente** (la capa de aplicación), que sabe qué unidad de trabajo es atómica.

```ts
// Interfaz en el dominio (DIP)
export interface OrderRepository {
  nextId(): string;
  byId(id: string): Promise<Order | null>;
  pendingForCustomer(customerId: string): Promise<Order[]>;
  save(order: Order): Promise<void>;
}

// Implementación en memoria (tests) — en infraestructura
export class InMemoryOrderRepository implements OrderRepository {
  private store = new Map<string, Order>();
  private seq = 0;
  nextId() { return `ord-${++this.seq}`; }
  async byId(id: string) { return this.store.get(id) ?? null; }
  async pendingForCustomer(c: string) { return [...this.store.values()].filter((o) => o.customerId === c); }
  async save(o: Order) { this.store.set(o.id, o); }
}
```

#### Repositorios y consultas complejas

Evans sugiere que, para consultas con criterios complejos, el repositorio acepte una **especificación** (patrón SPECIFICATION, sesión 26) en lugar de multiplicar métodos. También reconoce que a veces hace falta saltarse el modelo para cálculos masivos o reportes; en ese caso, hazlo de forma explícita (un servicio de consultas o un modelo de lectura) y no a escondidas desde el dominio.

#### Fábrica vs. repositorio

| Fábrica | Repositorio |
| --- | --- |
| Gestiona el **principio** de la vida del objeto. | Gestiona la **mitad y el final**: encontrar objetos existentes y guardarlos. |
| Crea objetos nuevos (o reconstituye a partir de datos). | Encuentra objetos viejos y da la ilusión de colección en memoria. |
| No sabe nada de persistencia. | Puede delegar en una fábrica la reconstitución. |

```
 nacimiento            vida en memoria               persistencia            reconstitución
 Fábrica.create() ──▶  agregado.metodosDelDominio() ──▶ repo.save() ─ ─ ─ ─ ▶ repo.byId()
                                                                        (usa una fábrica)
```

### Todo junto: un caso de uso

```ts
export class PlaceOrderFromCart {
  constructor(private readonly factory: OrderFactory,
              private readonly orders: OrderRepository,
              private readonly publish: (e: OrderEvent) => Promise<void>) {}

  async execute(cmd: { customerId: string; cart: { productId: string; qty: number; price: Money }[] }) {
    const order = this.factory.createFromCart(cmd.customerId, cmd.cart); // agregado válido
    order.place();                                                         // regla del dominio
    await this.orders.save(order);                                         // un agregado por transacción
    for (const e of order.pullEvents()) await this.publish(e);             // otros agregados reaccionan
    return order.id;
  }
}
```

### El ejemplo de Evans: el sistema de carga marítima

El capítulo 7 aplica todos los bloques a un sistema de reservas de carga: `Cargo` (raíz de un agregado con su especificación de entrega y su itinerario), `HandlingEvent` (cada vez que alguien carga, descarga o recibe la carga), `Voyage`, `Location` y `Customer`. Decisiones que vale la pena recordar:

- `Customer`, `Location` y `Voyage` son raíces de sus propios agregados, porque se comparten entre muchas cargas.
- El historial de eventos de manipulación de una carga **no** se guarda como colección dentro de `Cargo`: se obtiene con una consulta al repositorio de `HandlingEvent`. Así, registrar un evento no exige bloquear la carga completa, y se evita la contención entre usuarios.
- Se crean repositorios solo para las raíces que la aplicación necesita encontrar.

La lección: los límites de agregados se deciden pensando en **invariantes, concurrencia y uso real**, no solo en el diagrama de clases.

### Analogía de construcción

Un agregado es como un **departamento dentro de un edificio**: tiene una puerta principal (la raíz) y nadie entra a la cocina por la ventana. Las reglas internas (no conectar más de cierta potencia eléctrica en total) las controla el propio departamento. La **fábrica** es la constructora que entrega el departamento terminado y habitable, nunca a medio construir. El **repositorio** es la administración del edificio: le pides "el departamento 501" y te lo entrega, sin que sepas en qué archivador guardan las escrituras.

### Errores comunes

- **Agregados gigantes** que incluyen todo lo relacionado (el cliente con todos sus pedidos con todos sus productos).
- **Referencias directas a objetos de otros agregados** en lugar de IDs.
- **Exponer colecciones internas mutables** (`order.lines.push(...)` desde fuera).
- **Repositorios para cada tabla**, incluidas las entidades internas de un agregado.
- **Repositorios genéricos que filtran la base de datos** (`findWhere(sql)`), que llevan la lógica de dominio a las consultas.
- **Fábricas que devuelven objetos incompletos** "para llenarlos después".
- **Modificar varios agregados en una transacción** por costumbre, en vez de preguntar si la consistencia eventual basta.

### Resumen

Los agregados agrupan objetos que deben ser consistentes en todo momento, con una raíz como única puerta de entrada y un límite que define qué se carga, guarda, bloquea y borra junto; se diseñan pequeños y alrededor de invariantes reales, referenciando a otros agregados por ID. Las fábricas encapsulan la creación (y reconstitución) de agregados completos y válidos de forma atómica. Los repositorios dan acceso a las raíces de agregados como si fueran una colección en memoria, con una interfaz en el lenguaje del dominio y la tecnología oculta en la infraestructura. Los eventos de dominio conectan agregados sin romper sus límites.

## Conceptos clave

- **Agregado**: conjunto de objetos tratados como una unidad para los cambios de datos, con una raíz y un límite.
- **Raíz del agregado**: entidad con identidad global, única puerta de entrada y responsable de las invariantes.
- **Invariante**: regla de consistencia que debe cumplirse cada vez que cambian los datos.
- **Identidad local**: identidad de una entidad interna que solo es única dentro de su agregado.
- **Fábrica**: elemento que encapsula la creación atómica de objetos o agregados complejos y válidos.
- **Reconstitución**: recrear un objeto a partir de su forma almacenada, conservando su identidad.
- **Repositorio**: abstracción que presenta los agregados persistidos como una colección en memoria.
- **Consistencia eventual**: los agregados afectados se actualizan poco después, por eventos, en lugar de en la misma transacción.

## Preguntas de repaso

1. ¿Qué problema resuelven los agregados?
   R: La falta de límites en un modelo con muchas asociaciones: sin ellos no está claro qué objetos borrar, bloquear o mantener consistentes al cambiar algo. El agregado define una unidad de consistencia con una raíz que protege sus invariantes y un límite que determina qué se carga, guarda y borra junto.
2. Enumera al menos cuatro reglas de los agregados.
   R: La raíz tiene identidad global y comprueba las invariantes; las entidades internas tienen identidad local; nada externo guarda referencias a objetos internos, solo a la raíz; solo las raíces se obtienen con consultas; borrar elimina todo el límite; al confirmar un cambio se cumplen todas las invariantes del agregado.
3. ¿Por qué el precio unitario se copia en la línea de pedido?
   R: Porque el producto y su precio pertenecen a otro agregado que cambia por su cuenta, y la invariante del pedido (por ejemplo, el límite de crédito) debe calcularse con el precio acordado en el momento de la compra. Copiarlo mantiene el pedido consistente sin bloquear el catálogo.
4. ¿Cuáles son los dos requisitos de una buena fábrica?
   R: Que cada operación de creación sea atómica, produciendo un objeto o agregado completo con todas sus invariantes cumplidas (o fallando), y que esté abstraída al tipo deseado y no a las clases concretas.
5. ¿Por qué los repositorios se crean solo para raíces de agregados?
   R: Porque los objetos internos deben obtenerse navegando desde la raíz, que protege las invariantes. Permitir buscarlos directamente rompería el límite del agregado y llevaría la lógica de dominio a consultas dispersas.
6. ¿Quién controla las transacciones y por qué?
   R: El cliente del repositorio, normalmente la capa de aplicación, porque es quien sabe qué conjunto de cambios forma una unidad de trabajo atómica. El repositorio no debe decidirlo por su cuenta.
7. ¿Qué haces si un caso de uso necesita modificar dos agregados?
   R: Preguntar si realmente necesitan ser consistentes en el mismo instante. Si no, se modifica uno, se publica un evento de dominio y el otro agregado reacciona después (consistencia eventual). Si sí, quizá el límite del agregado está mal trazado.

## Ejercicio

Implementa el agregado `Reservation` para el hotel de la sesión anterior: raíz `Reservation` con `ReservationLine` internas (habitación + rango de fechas + precio por noche copiado), invariantes "no hay dos líneas de la misma habitación con fechas que se solapen", "máximo 5 habitaciones por reserva" y "una reserva confirmada no se modifica", y eventos `ReservationConfirmed` y `RoomAddedToReservation`. Crea una `ReservationFactory` que construya la reserva desde una solicitud (aplicando tarifas de un `RatePolicy` inyectado), un `ReservationRepository` (interfaz + implementación en memoria) y un caso de uso `ConfirmReservation` que guarde y publique eventos. **Terminado cuando:** ninguna invariante se puede violar desde fuera (hay un test por invariante), el agregado no expone colecciones mutables, la fábrica nunca devuelve una reserva inválida, los eventos se publican solo después de guardar y la reserva referencia al huésped solo por ID.

## Explícalo con tus palabras

Explica con la analogía del departamento, la constructora y la administración del edificio qué hacen el agregado, la fábrica y el repositorio, y por qué nadie debe entrar por la ventana.
