---
title: "Patrones de comportamiento II: Observer, Mediator y Command"
kind: lesson
hours: 2
sources: Design Patterns (GoF), Command (pp. 253–262) | Design Patterns (GoF), Mediator (pp. 293–302) | Design Patterns (GoF), Observer (pp. 313–324) | Design Patterns (GoF), Discussion of Behavioral Patterns (pp. 365–370)
links: Refactoring.Guru, Observer | https://refactoring.guru/es/design-patterns/observer ; Refactoring.Guru, Command | https://refactoring.guru/es/design-patterns/command
---

## Objetivo

Aprender a organizar la **comunicación** entre objetos: Observer (notificar a muchos sin conocerlos), Mediator (centralizar un protocolo de interacción) y Command (convertir una petición en un objeto que se puede encolar, registrar y deshacer). Son la base de los eventos de dominio, los buses de mensajes y CQRS que verás más adelante.

## Estudio

### El problema de fondo: ¿quién sabe de quién?

Cuando divides un sistema en muchos objetos pequeños, aparece una tensión: necesitan cooperar y mantenerse consistentes, pero si cada uno conoce directamente a los demás, el sistema se vuelve una red de dependencias donde nada puede reutilizarse por separado. Estos tres patrones responden de formas distintas a la pregunta "¿quién conoce a quién?":

| Patrón | Estructura de conocimiento | Pregunta que responde |
| --- | --- | --- |
| Observer | El sujeto conoce una **lista abstracta** de observadores | ¿Cómo aviso a muchos interesados sin depender de ellos? |
| Mediator | Todos conocen **solo al mediador** | ¿Cómo coordino a muchos objetos que se afectan entre sí? |
| Command | El emisor conoce una **petición objeto**, no al receptor | ¿Cómo desacoplo quién pide algo de quién lo hace y cuándo? |

### Observer

**Intención:** definir una dependencia de uno a muchos entre objetos, de modo que cuando uno cambie de estado, todos sus dependientes sean notificados y actualizados automáticamente. También se le llama **Dependents** o **Publish-Subscribe**.

#### El problema

Una hoja de cálculo y un gráfico de barras muestran los mismos datos. No se conocen entre sí (así puedes reutilizar uno sin el otro), pero se comportan como si se conocieran: si cambias un valor en la hoja, el gráfico se actualiza. Los dos dependen del objeto de datos (el **sujeto**). El sujeto mantiene una lista de **observadores** y los notifica cuando cambia; cada observador consulta entonces al sujeto para sincronizarse. El sujeto no sabe cuántos observadores hay ni de qué clase son.

```
          ┌────────────────────┐ notifica  ┌──────────────────────┐
          │ Subject            │──────────▶│ «interface» Observer │
          │ attach(o) detach(o)│ 0..*      │ update(event)        │
          │ notify()           │           └────▲───────▲─────────┘
          └────────────────────┘                │       │
                                       EmailNotifier  StockProjection
```

#### Ejemplo: eventos de un pedido

```ts
export type OrderEvent =
  | { type: "OrderPlaced"; orderId: string; total: number; email: string }
  | { type: "OrderCancelled"; orderId: string; reason: string };

type Listener<E> = (event: E) => void | Promise<void>;

export class EventPublisher<E extends { type: string }> {
  private listeners = new Map<E["type"], Listener<E>[]>();

  subscribe<T extends E["type"]>(type: T, l: Listener<Extract<E, { type: T }>>) {
    const list = this.listeners.get(type) ?? [];
    list.push(l as Listener<E>);
    this.listeners.set(type, list);
    return () => this.listeners.set(type, (this.listeners.get(type) ?? []).filter((x) => x !== l));
  }

  async publish(event: E) {
    const list = this.listeners.get(event.type as E["type"]) ?? [];
    // Cada observador es independiente: un fallo no debe impedir a los demás
    const results = await Promise.allSettled(list.map((l) => l(event)));
    return results.filter((r) => r.status === "rejected").length;
  }
}

// Uso
const bus = new EventPublisher<OrderEvent>();
bus.subscribe("OrderPlaced", (e) => console.log(`Email a ${e.email}: pedido ${e.orderId}`));
bus.subscribe("OrderPlaced", (e) => console.log(`Reservar stock de ${e.orderId}`));
const unsubscribe = bus.subscribe("OrderCancelled", (e) => console.log(`Liberar ${e.orderId}`));
```

El servicio de pedidos publica `OrderPlaced` y no sabe que existen el email ni el inventario. Mañana agregas un observador de analítica sin tocar el servicio. Este es el corazón de los **eventos de dominio** de DDD (sesión 25) y de las arquitecturas orientadas a eventos.

#### Decisiones de implementación

El libro discute varios puntos que siguen siendo muy actuales:

1. **Modelo push vs. pull.** En *push* el sujeto envía toda la información del cambio en la notificación (como el evento de arriba). En *pull* solo avisa "cambié" y el observador consulta lo que necesita. Push acopla al sujeto con lo que necesitan los observadores; pull puede ser ineficiente porque cada observador debe averiguar qué cambió. Los eventos de dominio suelen ser push con datos mínimos pero suficientes.
2. **¿Quién dispara la notificación?** Si cada operación del sujeto notifica, una secuencia de cambios produce una avalancha de notificaciones. Si la dispara el cliente, puede agrupar varios cambios pero también olvidarse. Un patrón útil es acumular eventos durante la operación y publicarlos al final.
3. **Estado consistente antes de notificar.** Notifica solo cuando el sujeto está en un estado coherente; si un observador consulta al sujeto a mitad de una operación, verá datos a medias.
4. **Referencias colgantes.** Si un observador se destruye sin desuscribirse, el sujeto lo sigue notificando (en JavaScript, una fuga de memoria típica en componentes de interfaz). Por eso `subscribe` devuelve una función para desuscribirse.
5. **Actualizaciones en cascada.** Un observador que modifica otro sujeto que notifica a otros observadores puede provocar ciclos y actualizaciones imprevisibles.

#### Consecuencias

- ✅ **Acoplamiento abstracto y mínimo** entre sujeto y observadores: el sujeto solo conoce una interfaz.
- ✅ **Comunicación de difusión (broadcast)**: el sujeto no especifica receptores; agregar y quitar observadores es libre.
- ❌ **Actualizaciones inesperadas**: como los observadores no se conocen, un cambio aparentemente inocente puede desencadenar una cascada costosa. El flujo de control se vuelve difícil de seguir: "¿quién reacciona cuando pasa esto?" ya no se responde leyendo el código del sujeto.
- ❌ Orden de notificación y manejo de errores no definidos, si no los defines tú.

#### Observer en el ecosistema JavaScript

`EventEmitter` de Node, `addEventListener` del DOM, los observables de RxJS y la reactividad de los frameworks de interfaz son variaciones de Observer. Fíjate en un detalle práctico de `EventEmitter`: si un listener síncrono lanza una excepción, interrumpe a los siguientes. Por eso en el ejemplo usamos `Promise.allSettled`.

#### Dentro del proceso vs. entre procesos

El `EventPublisher` del ejemplo vive en memoria: si el proceso se cae justo después de guardar el pedido y antes de notificar, el email nunca se envía. Para reacciones que no pueden perderse, los sistemas reales guardan el evento en la base de datos **en la misma transacción** que el cambio de estado y un proceso aparte lo publica después (el patrón *outbox*). Lo verás en los módulos de datos y microservicios; por ahora quédate con la idea de que Observer en memoria es perfecto para reacciones internas y baratas, pero no es una garantía de entrega.

### Mediator

**Intención:** definir un objeto que encapsula cómo interactúa un conjunto de objetos. Mediator promueve el acoplamiento débil evitando que los objetos se refieran unos a otros explícitamente, y permite variar su interacción de forma independiente.

#### El problema

En un formulario, los campos se afectan entre sí: el botón "Enviar" se habilita solo si el email es válido; elegir "Empresa" en el tipo de cliente muestra el campo NIT; cambiar el país cambia el formato del teléfono. Si cada widget conoce a los que afecta, terminas con una red en la que cada componente conoce a muchos otros, nada es reutilizable y cambiar una regla obliga a tocar varios widgets.

```
Sin mediador (red)                     Con mediador (estrella)
 email ◀──▶ submit                      email ──┐
   ▲ ╲      ▲                           submit ─┼──▶ FormMediator
   │   ╲    │                           tipo ───┤
 tipo ◀──▶ nit                          nit ────┘
```

Un objeto mediador (el "director" del diálogo) concentra las reglas: cada widget solo le avisa "cambié", y el mediador decide qué hacer con los demás.

```ts
interface Field { name: string; value: string; enabled: boolean; visible: boolean }

export class SignupFormMediator {
  constructor(private readonly fields: Record<"email" | "type" | "nit" | "submit", Field>) {
    this.recompute();
  }
  changed(name: keyof typeof this.fields, value: string) {
    this.fields[name].value = value;
    this.recompute();
  }
  private recompute() {
    const f = this.fields;
    f.nit.visible = f.type.value === "empresa";
    const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.value);
    const nitOk = !f.nit.visible || /^\d{9,10}$/.test(f.nit.value);
    f.submit.enabled = emailOk && nitOk;
  }
}
```

#### Consecuencias

- ✅ **Limita la creación de subclases**: el comportamiento que estaría repartido entre muchos objetos se concentra en uno; para cambiarlo, cambias o reemplazas el mediador.
- ✅ **Desacopla a los colegas**: los widgets se pueden reutilizar en otros formularios.
- ✅ **Simplifica los protocolos**: reemplaza interacciones muchos-a-muchos por uno-a-muchos, más fáciles de entender.
- ✅ **Abstrae cómo cooperan los objetos**: la cooperación se vuelve un concepto con nombre propio.
- ❌ **Centraliza el control**: el mediador puede volverse un monolito difícil de mantener si no lo cuidas, porque cambia complejidad de interacción por complejidad en el mediador.

#### Observer vs. Mediator

El libro los presenta como patrones **competidores**: Observer **distribuye** la comunicación (sujetos y observadores, sin un centro), y Mediator la **encapsula** en un objeto. Con Observer es más fácil reutilizar y agregar participantes, pero el flujo es más difícil de seguir; con Mediator el flujo es fácil de leer en un lugar, pero ese lugar concentra el conocimiento. Es común combinarlos: los colegas notifican al mediador usando Observer.

Este mismo dilema reaparece a escala de sistemas distribuidos como **coreografía** (servicios que reaccionan a eventos, estilo Observer) frente a **orquestación** (un servicio que coordina a los demás, estilo Mediator). Lo verás en el módulo de microservicios.

### Command

**Intención:** encapsular una petición como un objeto, lo que permite parametrizar clientes con distintas peticiones, encolar o registrar peticiones y soportar operaciones que se pueden deshacer. También se le llama **Action** o **Transaction**.

#### El problema

Un toolkit de interfaz tiene botones y menús, pero no puede saber qué debe hacer cada uno: eso lo sabe la aplicación. La solución es que el botón tenga un objeto `Command` con una operación `execute()`. Cada comando concreto guarda al **receptor** (el objeto que sabe hacer el trabajo) y la acción a invocar. El botón (el **invocador**) no sabe nada de la acción: solo llama a `execute()`.

#### Participantes

- **Command**: interfaz con `execute()` (y opcionalmente `undo()`).
- **ConcreteCommand**: une un receptor con una acción.
- **Invoker**: pide al comando que se ejecute (un botón, una cola, un planificador).
- **Receiver**: sabe realizar el trabajo.
- **Client**: crea el comando y le asigna el receptor.

#### Ejemplo: editor con deshacer y rehacer

```ts
interface Command {
  execute(): void;
  undo(): void;
  readonly label: string;
}

class TextBuffer {           // receptor
  text = "";
  insert(pos: number, s: string) { this.text = this.text.slice(0, pos) + s + this.text.slice(pos); }
  remove(pos: number, len: number) { this.text = this.text.slice(0, pos) + this.text.slice(pos + len); }
}

class InsertText implements Command {
  readonly label: string;
  constructor(private buf: TextBuffer, private pos: number, private s: string) {
    this.label = `Insertar "${s}"`;
  }
  execute() { this.buf.insert(this.pos, this.s); }
  undo() { this.buf.remove(this.pos, this.s.length); }
}

class DeleteText implements Command {
  private removed = "";                  // estado necesario para deshacer
  readonly label = "Borrar";
  constructor(private buf: TextBuffer, private pos: number, private len: number) {}
  execute() {
    this.removed = this.buf.text.slice(this.pos, this.pos + this.len);
    this.buf.remove(this.pos, this.len);
  }
  undo() { this.buf.insert(this.pos, this.removed); }
}

class History {              // invocador con historial
  private done: Command[] = [];
  private undone: Command[] = [];
  run(c: Command) { c.execute(); this.done.push(c); this.undone = []; }
  undo() { const c = this.done.pop(); if (c) { c.undo(); this.undone.push(c); } }
  redo() { const c = this.undone.pop(); if (c) { c.execute(); this.done.push(c); } }
}
```

Fíjate en que `DeleteText` guarda lo que borró: **un comando que se puede deshacer debe almacenar el estado necesario** para revertir su efecto. Para operaciones donde guardar ese estado es complicado, se combina con Memento (una foto del estado).

#### Usos de Command en backend

Command es mucho más que deshacer en editores:

| Uso | Cómo aparece |
| --- | --- |
| **Colas y trabajos diferidos** | Un "job" serializado (`{ type: "SendInvoice", invoiceId }`) es un comando que un worker ejecuta más tarde. |
| **Registro y reintento** | Guardar los comandos permite auditarlos y volver a ejecutarlos tras un fallo. |
| **Transacciones** | Un comando agrupa operaciones que deben ejecutarse juntas. |
| **Macros** | Un `MacroCommand` es un Composite de comandos que se ejecutan en secuencia. |
| **CQRS y casos de uso** | Un "command" (`PlaceOrder { customerId, items }`) es un objeto con la intención del usuario, procesado por un *handler*. |

```ts
// Estilo moderno: el comando son datos; el handler es el receptor
type PlaceOrder = { kind: "PlaceOrder"; customerId: string; items: { sku: string; qty: number }[] };
type CancelOrder = { kind: "CancelOrder"; orderId: string; reason: string };
type AppCommand = PlaceOrder | CancelOrder;

type Handlers = { [K in AppCommand["kind"]]: (c: Extract<AppCommand, { kind: K }>) => Promise<void> };

export function makeDispatcher(h: Handlers) {
  return (c: AppCommand) => (h[c.kind] as (c: AppCommand) => Promise<void>)(c);
}
```

Separar los **datos** del comando de su **ejecución** tiene ventajas: los datos se serializan, se validan, se guardan en una cola o en un log de auditoría; la ejecución se testea por separado.

#### Consecuencias

- ✅ Desacopla al objeto que invoca la operación del que sabe realizarla.
- ✅ Los comandos son objetos de primera clase: se pueden manipular, extender, guardar y pasar.
- ✅ Se pueden ensamblar en comandos compuestos (macros).
- ✅ Es fácil agregar comandos nuevos: no hay que cambiar clases existentes.
- ❌ Muchas clases o tipos pequeños; para una acción trivial, una función basta.

### Discusión: comunicación encapsulada o distribuida

El libro observa que varios patrones de comportamiento son variaciones de **desacoplar emisores de receptores**: Command los conecta con un objeto que encapsula la petición; Observer, con una interfaz de suscripción que permite muchos receptores cambiantes; Mediator, con un objeto intermedio por el que pasa todo; y Chain of Responsibility (próxima sesión), pasando la petición por una cadena de posibles receptores. Cada uno tiene compromisos distintos de reutilización, facilidad de lectura y flexibilidad.

### Analogía de construcción

**Observer** es el grupo de mensajería de la obra: el jefe de obra publica "se retrasa el hormigón al jueves" y cada subcontratista suscrito reacciona a su manera, sin que el jefe sepa qué hará cada uno. **Mediator** es la torre de control de una grúa compartida: los equipos no se coordinan entre sí para usarla, todos hablan con el operador, que decide el orden. **Command** es la orden de trabajo escrita: describe qué hacer, puede archivarse, programarse para mañana, asignarse a otra cuadrilla y, si hubo un error, registrar cómo revertirlo.

### Cuándo usar y cuándo no

| Patrón | Úsalo cuando… | Evítalo cuando… |
| --- | --- | --- |
| Observer | Un cambio debe disparar reacciones independientes y extensibles (eventos de dominio, actualizaciones de interfaz). | Necesitas un flujo garantizado y ordenado con manejo de errores transaccional: una llamada explícita es más clara. |
| Mediator | Muchos objetos interactúan con reglas complejas entre ellos (formularios, coordinación de procesos). | Solo hay dos o tres objetos con una relación simple. |
| Command | Necesitas encolar, programar, registrar, reintentar o deshacer acciones, o representar intenciones del usuario. | La acción es trivial, inmediata y no necesita historial. |

### Errores comunes

- **Observers que dependen del orden de notificación.** Si el orden importa, no es Observer: es un proceso, y debe expresarse explícitamente.
- **Excepciones de un listener que tumban al publicador.** Aísla los fallos de cada observador.
- **Olvidar desuscribirse** en componentes con ciclo de vida: fugas de memoria y notificaciones a objetos muertos.
- **Mediadores que crecen hasta ser objetos dios.** Divide por subprocesos o por formularios.
- **Comandos con `undo` que no guardan el estado necesario** para revertir.
- **Comandos que devuelven grandes resultados.** En CQRS, los comandos cambian estado y las consultas leen; mezclar ambos complica la semántica.

### Resumen

Observer establece una dependencia uno-a-muchos donde el sujeto notifica a observadores que no conoce; es la base de los eventos de dominio, con riesgos de cascadas y flujo difícil de seguir. Mediator concentra la interacción de muchos objetos en uno, a cambio de centralizar el control. Command convierte una petición en un objeto que puede guardarse, encolarse, auditarse y deshacerse, y es el origen del concepto de "comando" en CQRS y colas de trabajo.

## Conceptos clave

- **Sujeto (subject)**: objeto observado que mantiene una lista de observadores y los notifica cuando cambia.
- **Observador**: objeto que recibe notificaciones de un sujeto y reacciona.
- **Push vs. pull**: enviar los datos del cambio en la notificación o solo avisar y dejar que el observador consulte.
- **Mediador**: objeto que encapsula cómo interactúa un conjunto de objetos colegas.
- **Comando**: objeto que representa una petición, con lo necesario para ejecutarla (y deshacerla).
- **Invocador / receptor**: quien dispara el comando / quien sabe hacer el trabajo.
- **Macro command**: comando compuesto que ejecuta varios comandos en secuencia.
- **Coreografía vs. orquestación**: coordinación distribuida por eventos frente a coordinación centralizada.

## Preguntas de repaso

1. ¿Qué gana un sujeto al no conocer a sus observadores concretos?
   R: Acoplamiento mínimo: solo depende de una interfaz, puede notificar a cualquier número de observadores y se pueden agregar o quitar reacciones nuevas sin modificar el sujeto.
2. ¿Cuál es el principal riesgo de Observer?
   R: Las actualizaciones inesperadas y en cascada: como los observadores no se conocen, un cambio puede disparar una cadena costosa o cíclica, y el flujo de control se vuelve difícil de seguir leyendo el código del sujeto.
3. ¿Qué diferencia hay entre el modelo push y el modelo pull?
   R: En push el sujeto envía los datos del cambio en la notificación, lo que lo acopla a lo que necesitan los observadores; en pull solo avisa y cada observador consulta lo que necesita, lo que puede ser ineficiente.
4. ¿Por qué el libro dice que Observer y Mediator compiten?
   R: Porque resuelven el mismo problema de comunicación de formas opuestas: Observer distribuye la comunicación entre sujetos y observadores; Mediator la encapsula en un objeto central. Uno favorece la extensibilidad, el otro la legibilidad del flujo.
5. ¿Qué necesita un comando para poder deshacerse?
   R: Guardar el estado necesario para revertir su efecto (por ejemplo, el texto borrado), o apoyarse en un Memento con una foto del estado previo.
6. Menciona tres usos de Command en un backend.
   R: Trabajos encolados que un worker ejecuta más tarde, registro de acciones para auditoría y reintento, y comandos de CQRS que representan la intención del usuario y son procesados por un handler.

## Ejercicio

Construye un mini módulo de "carrito" en TypeScript: un `Cart` que publica eventos `ItemAdded`, `ItemRemoved` y `CartCleared` con un `EventPublisher` tipado; dos observadores (`CartTotalProjection` que mantiene el total y `AbandonedCartTracker` que registra carritos vaciados); y comandos `AddItem`, `RemoveItem` y `ClearCart` con `undo`, gestionados por un `History`. **Terminado cuando:** hay tests con Vitest que demuestran que deshacer `ClearCart` restaura todos los ítems, que la proyección del total siempre coincide con el carrito tras cualquier secuencia de comandos y deshacer, y que un observador que lanza una excepción no impide que el otro reciba el evento.

## Explícalo con tus palabras

Explica con el grupo de mensajería de la obra, el operador de la grúa y la orden de trabajo escrita en qué se diferencian Observer, Mediator y Command.
