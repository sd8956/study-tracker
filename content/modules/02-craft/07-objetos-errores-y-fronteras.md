---
title: Objetos, errores y fronteras con código ajeno
kind: lesson
hours: 3
sources: Clean Code, cap. 6 Objects and Data Structures (pp. 124–132), cap. 7 Error Handling (pp. 134–143) y cap. 8 Boundaries (pp. 144–151) | The Pragmatic Programmer, temas 23–28 Design by Contract, Dead Programs Tell No Lies, Assertive Programming, How to Balance Resources, Don't Outrun Your Headlights, Decoupling (pp. 188–238)
---

## Objetivo

Proteger tu código de lo que no controlas. Vas a trabajar tres defensas: fronteras limpias (envolver APIs de terceros detrás de adaptadores, learning tests, programar contra la interfaz que necesitas), datos que no se mutan a escondidas (no modificar las entradas, objetos que protegen sus invariantes, Demeter) y errores bien diseñados (excepciones con contexto, `Result`, casos especiales, contratos, fallos parciales y recursos que siempre se liberan). Al terminar vas a poder escribir un adaptador con su fake y su learning test, y una función que nunca deja datos a medias.

## Estudio

### Objetos y estructuras de datos

Encapsular no es poner un getter y un setter a cada campo: eso expone la misma estructura con más pasos. Compara dos formas de describir un vehículo:

```ts
// Concreto: cualquier cliente sabe que hay galones de gasolina
interface Vehicle {
  getFuelTankCapacityInGallons(): number;
  getGallonsOfGasoline(): number;
}

// Abstracto: el concepto que le importa al cliente
interface Vehicle {
  getPercentFuelRemaining(): number;
}
```

Si mañana el vehículo es eléctrico, la versión concreta rompe a todos los clientes. La idea central de Clean Code es la **antisimetría**: los **objetos** esconden sus datos y exponen comportamiento; las **estructuras de datos** exponen datos y no tienen comportamiento significativo. Cada uno facilita lo que al otro le cuesta:

| Si añades... | Estructuras + funciones (`area(shape)` con switch) | Objetos polimórficos (`shape.area()`) |
| --- | --- | --- |
| Una función nueva (`perimeter`) | Fácil | Hay que tocar todas las clases |
| Un tipo nuevo (`Triangle`) | Hay que tocar todas las funciones | Fácil |

En TypeScript ambos estilos conviven, y está bien: el JSON que llega de una API (un **DTO**) es una estructura de datos; un `Order` que no deja añadir productos después de pagado es un objeto que debe esconder sus datos. Lo que hay que evitar son los **híbridos**: entidades con reglas de negocio y, a la vez, todos los campos públicos y mutables. Son lo peor de los dos mundos.

### Demeter y "tell, don't ask"

La **Ley de Demeter** dice que un método solo habla con sus amigos directos: su propia clase, los objetos que crea, sus argumentos y sus campos. No con los objetos que devuelven esas llamadas. El síntoma visible es el **choque de trenes**:

```ts
// Antes: el cliente navega por cart → customer → account y decide por la cuenta
function canCheckout(cart: Cart): boolean {
  return (
    cart.getCustomer().getAccount().getStatus() === "active" &&
    cart.getItems().length > 0 &&
    cart.getCustomer().getAccount().getBalance() >= cart.getTotal()
  );
}

// Después: cada objeto responde por lo suyo
class Account {
  constructor(private status: "active" | "blocked", private balance: number) {}
  canPay(amount: number): boolean {
    return this.status === "active" && this.balance >= amount;
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

Partir la cadena en variables mejora la lectura, no el acoplamiento: la solución real es preguntar **para qué** querías el dato y mover esa decisión al objeto que tiene la información. *The Pragmatic Programmer* lo llama **tell, don't ask**: dile al objeto qué hacer (`order.applyDiscount(10)`) en lugar de pedirle sus datos, modificarlos desde fuera y devolvérselos. Así el pedido puede proteger sus reglas (no aplicar un descuento mayor que el total, no aplicarlo dos veces). Dos matices: Demeter **no aplica a estructuras de datos** (`config.database.host` en un objeto plano está bien), ni a APIs estables que devuelven valores (`text.trim().toLowerCase()`).

El mismo tema advierte contra los **datos globales**: cada global es un parámetro oculto que reciben todos tus métodos. Si algo es lo bastante importante para ser global, envuélvelo en una API: un único módulo `config.ts` que lea y valide `process.env` una vez y exporte un objeto congelado y tipado, en lugar de `process.env.API_KEY` disperso en veinte archivos.

### No mutes tus entradas

Una función que modifica los objetos que recibe rompe una expectativa básica de quien la llama: que lo que pasó como argumento siga igual después. En JavaScript los objetos y arrays se pasan por referencia, así que la mutación no se queda dentro de la función: aparece en el código del llamador, a veces muy lejos, y produce los bugs más difíciles de rastrear.

```ts
// Antes: "solo" calcula el ranking, pero reordena el array del llamador
function topStudents(students: Student[], count: number): Student[] {
  return students.sort((a, b) => b.score - a.score).slice(0, count);
}

const roster = await loadRoster();          // en orden alfabético para la vista
const podium = topStudents(roster, 3);
renderAlphabetical(roster);                 // ¡ya no está en orden alfabético!
```

`Array.prototype.sort` (igual que `reverse`, `splice` o `push`) muta el array en el sitio. La función parece una consulta pura y en realidad tiene un efecto secundario sobre su entrada. Las correcciones, de menos a más estricta:

```ts
// 1. Copiar antes de transformar (o usar los métodos que no mutan)
function topStudents(students: readonly Student[], count: number): Student[] {
  return students.toSorted((a, b) => b.score - a.score).slice(0, count);
}

// 2. Devolver estructuras nuevas en lugar de modificar las recibidas
type Invoice = Readonly<{ id: string; lines: readonly InvoiceLine[] }>;

function withLine(invoice: Invoice, line: InvoiceLine): Invoice {
  return { ...invoice, lines: [...invoice.lines, line] };
}
```

`readonly T[]` y `Readonly<T>` hacen que el compilador rechace la mutación: con `readonly Student[]`, la versión con `.sort()` ni siquiera compila. Por eso conviene declarar como `readonly` los parámetros que una función solo debe leer; es un contrato que el tipo hace cumplir. Tres reglas prácticas:

- **Las funciones que reciben datos devuelven datos nuevos.** Si el propósito de la función es cambiar algo, que sea un método del objeto que cambia (`cart.addItem(item)`), con un nombre que lo diga.
- **Ojo con la copia superficial.** `{ ...invoice }` copia el primer nivel; los arrays y objetos anidados siguen compartidos. Copia también el nivel que vas a cambiar, o usa `structuredClone` cuando necesites una copia profunda.
- **En las fronteras, copia lo que guardas.** Si un objeto guarda un array que le pasaron (`new Course(students)`), cópialo al guardarlo; si devuelve su estado interno, devuelve una copia o una vista `readonly`. Si no, el llamador puede cambiar tu estado sin pasar por tus reglas.

Con estructuras inmutables, el estilo de "funciones que transforman datos" se vuelve muy seguro: cada función recibe datos y devuelve datos nuevos, sin efectos ocultos. Lo verás de nuevo en la sesión 13, con la programación como transformación.

### Fronteras: no dejes que el código ajeno se extienda

Casi ningún sistema se hace solo con código propio. En cada librería, SDK o API de otro equipo hay una **frontera** con una tensión natural: quien provee quiere una interfaz genérica; quien usa quiere una enfocada en lo suyo. Si dejas que la interfaz del tercero se extienda por todo tu sistema, todo tu sistema queda atado a sus decisiones.

```ts
// Frontera expuesta: 30 archivos conocen Map y cualquiera puede hacer cualquier cosa
const sensors: Map<string, Sensor> = new Map();
sensors.clear(); // ¡alguien podría hacer esto!

// Frontera encapsulada: la interfaz que necesita el negocio
class Sensors {
  readonly #sensors = new Map<string, Sensor>();

  getById(id: string): Sensor {
    const sensor = this.#sensors.get(id);
    if (!sensor) throw new SensorNotFound(id);
    return sensor;
  }

  register(sensor: Sensor): void {
    this.#sensors.set(sensor.id, sensor);
  }
}
```

La recomendación no es envolver cada `Map`, sino **no pasar las interfaces de frontera por todo el sistema**: mantenlas dentro de una clase o de un módulo, sin devolverlas ni aceptarlas en tus APIs públicas. Lo mismo vale, con más razón, para el cliente HTTP, el SDK de pagos o la respuesta cruda de un proveedor.

### Envolver una API de terceros detrás de un adaptador

El patrón que lo resuelve es el **adaptador**: tu dominio define la interfaz que necesita (un **puerto**), y una clase traduce esa interfaz a la API real del tercero. El caso más instructivo es el de una API que todavía no existe: el equipo de Martin tenía que hablar con un subsistema de radio sin API definida, así que definió **la interfaz que le gustaría tener**, programó contra ella y escribió el adaptador cuando llegó la real.

```
  Nuestro dominio ──► PaymentGateway (la interfaz que queremos)
                               ▲
                               │ implementa
                ┌──────────────┴──────────────┐
        FakePaymentGateway           StripePaymentGateway ──► SDK real del proveedor
        (tests y desarrollo)         (único archivo que lo conoce)
```

```ts
// El puerto: vocabulario del dominio, sin tipos del proveedor
export interface PaymentGateway {
  charge(customerId: string, amountInCents: number): Promise<ChargeId>;
}

// El adaptador: traduce llamadas, tipos y errores del proveedor
export class StripePaymentGateway implements PaymentGateway {
  constructor(private readonly stripe: StripeClient) {}

  async charge(customerId: string, amountInCents: number): Promise<ChargeId> {
    try {
      const intent = await this.stripe.paymentIntents.create({
        customer: customerId,
        amount: amountInCents,
        currency: "usd",
      });
      return intent.id as ChargeId;
    } catch (error) {
      throw new PaymentFailed(`No se pudo cobrar al cliente ${customerId}`, { cause: error });
    }
  }
}

// El fake: estado real en memoria, para tests rápidos
export class FakePaymentGateway implements PaymentGateway {
  readonly charges: Array<{ customerId: string; amountInCents: number }> = [];
  async charge(customerId: string, amountInCents: number): Promise<ChargeId> {
    this.charges.push({ customerId, amountInCents });
    return `fake-${this.charges.length}` as ChargeId;
  }
}
```

Fíjate en lo que el adaptador traduce, porque son las tres cosas que no deben cruzar la frontera:

1. **Llamadas**: el dominio dice `charge`; el adaptador sabe que se llama `paymentIntents.create` y que pide `currency`.
2. **Tipos**: el dominio recibe un `ChargeId`, no el objeto `PaymentIntent` del SDK con sus cincuenta campos.
3. **Errores**: Martin muestra un cliente que captura tres excepciones distintas de una librería con el mismo manejo repetido. Al envolverla, el adaptador traduce todos sus errores a uno solo definido por ti (`PaymentFailed`, con `cause`), pensado según **cómo lo va a capturar el llamador**.

Las ventajas se acumulan: cambiar de proveedor toca un archivo, los tests del dominio corren contra el fake sin red, no te bloqueas esperando a otro equipo y tu dominio no hereda los nombres ni los formatos de nadie. Es la semilla de la arquitectura hexagonal (puertos y adaptadores) que verás en la sesión 15.

### Learning tests: aprender la frontera y vigilarla

Cuando adoptas una librería, tienes dos trabajos a la vez: aprenderla y usarla. Mezclarlos en producción hace que, cuando algo falla, no sepas si es tu código o tu malentendido. La técnica de Jim Newkirk que recoge Martin son los **learning tests**: tests que ejercitan la librería tal como piensas usarla, cada uno como una pregunta.

```ts
// learning/date-fns.learning.test.ts
import { addBusinessDays, differenceInCalendarDays } from "date-fns";
import { describe, expect, it } from "vitest";

describe("learning: date-fns", () => {
  it("addBusinessDays salta sábados y domingos", () => {
    const friday = new Date(2026, 9, 16); // los meses empiezan en 0: 9 = octubre
    expect(addBusinessDays(friday, 1).getDay()).toBe(1); // lunes
  });

  it("differenceInCalendarDays ignora las horas", () => {
    expect(differenceInCalendarDays(new Date(2026, 9, 21, 0, 1), new Date(2026, 9, 20, 23, 59))).toBe(1);
  });
});
```

No cuestan nada extra (ibas a aprender la API igual) y son "mejor que gratis": al actualizar la librería, los ejecutas y ves de inmediato si cambió algo de lo que dependes. Es la regla de Beyoncé aplicada a tus dependencias y la defensa más práctica contra la ley de Hyrum desde el lado del consumidor. Un buen lugar para ellos es junto al adaptador: el adaptador es lo único que conoce la librería, y sus learning tests son lo que le avisa cuando la frontera se mueve.

| Riesgo en la frontera | Técnica |
| --- | --- |
| API demasiado amplia | Envolverla en una clase con la interfaz que necesitas |
| No sabes bien cómo se comporta | Learning tests |
| La API aún no existe | Definir tu interfaz ideal, un fake y el adaptador después |
| La librería cambiará de versión | Learning tests en CI y un único adaptador que actualizar |

### Errores sin ensuciar la lógica

Martin lo resume así: el manejo de errores es importante, pero si oscurece la lógica, está mal hecho. *The Pragmatic Programmer* aporta la actitud: **paranoia pragmática**, diseñar asumiendo que tú y los demás cometerán errores. Las herramientas, y cuándo usar cada una:

| Situación | Herramienta |
| --- | --- |
| Error esperado del dominio que el llamador debe manejar (validación, "no encontrado") | `Result` o `T \| undefined` explícito en el tipo |
| Fallo de infraestructura que no se resuelve aquí (red, disco) | Excepción con contexto y `cause`, capturada en una frontera |
| Ausencia con un comportamiento por defecto razonable | Caso especial o colección vacía |
| Algo que "no puede pasar" si el programa es correcto | Aserción que falla de inmediato |

```ts
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
type ParseError = { kind: "empty" } | { kind: "invalid-format"; input: string };

function parseQuantity(input: string): Result<number, ParseError> {
  if (input.trim() === "") return { ok: false, error: { kind: "empty" } };
  const value = Number(input);
  if (!Number.isInteger(value) || value <= 0) return { ok: false, error: { kind: "invalid-format", input } };
  return { ok: true, value };
}
```

Tres reglas que evitan la mayoría de los problemas:

- **Da contexto.** `Error("failed")` es casi inútil; di qué operación falló y por qué, y conserva la causa original con `{ cause }`.
- **No devuelvas `null` sorpresa.** Cada `null` crea trabajo para quien llama y una oportunidad de olvidarlo. Si la función devuelve listas, devuelve `[]`; si la ausencia tiene un comportamiento por defecto, usa el **patrón caso especial** (un objeto `PerDiemMealExpenses` que devuelve la dieta diaria cuando no hay gastos registrados); si la ausencia es legítima, que el tipo lo anuncie (`User | undefined`) y `strictNullChecks` te obligue a manejarla. Y no pases `null` donde no se espera.
- **No te tragues los errores.** Un `catch {}` o un `console.log("error")` seguido de "seguimos" es de los bugs más caros.

### Diseño por contrato y fallar pronto

El **diseño por contrato** de Bertrand Meyer define tres partes: **precondiciones** (lo que quien llama debe garantizar: el importe es positivo), **postcondiciones** (lo que la función garantiza al terminar: el saldo bajó exactamente el importe) e **invariantes** (lo que siempre es cierto para quien observa el objeto: el saldo nunca es negativo). Si quien llama cumple su parte, la función cumple la suya; si no, falla de forma ruidosa. El libro aconseja ser estricto en lo que aceptas y prometer lo mínimo en lo que devuelves.

```ts
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new ContractViolation(message);
}
```

La firma `asserts condition` hace que TypeScript estreche los tipos tras la llamada. Las aserciones son para lo que **nunca** debería ocurrir si el programa es correcto (no para validar la entrada del usuario), no deben tener efectos secundarios y conviene dejarlas activas en producción, porque es justo allí donde aparecen las condiciones que nunca probaste.

De ahí sale el consejo de **fallar pronto** (*crash early*): un programa muerto casi siempre hace menos daño que uno herido que sigue funcionando con datos corruptos, escribiéndolos en la base de datos o cobrando dos veces. Si no puedes manejar un error de forma significativa en un punto, deja que se propague hasta una frontera que sí pueda.

### Fallos parciales: nunca dejes el trabajo a medias

Un caso merece atención especial porque es fácil pasarlo por alto en una revisión: la operación que tiene **varios pasos con efectos** y falla a mitad de camino. Si el primer paso ya escribió algo y el segundo falla, el sistema queda en un estado que no es ni el de antes ni el de después.

```ts
// Antes: null y códigos mágicos, errores tragados y un fallo parcial posible
async function transfer(fromId: string, toId: string, amount: any) {
  const from = await accounts.find(fromId);
  const to = await accounts.find(toId);
  if (from == null || to == null) return null;
  if (from.balance < amount) return -1;
  try {
    from.balance -= amount;
    to.balance += amount;
    await accounts.save(from); // si esto funciona...
    await accounts.save(to);   // ...y esto falla, el dinero desapareció
  } catch (e) {}
  return 0;
}
```

Hay cuatro problemas encadenados: la mutación directa de los saldos desde fuera de las cuentas, el `catch` vacío, los códigos mágicos y, el peor, el **fallo parcial** entre los dos `save`. Las estrategias para evitarlo, según el caso:

1. **Atomicidad**: agrupar los pasos en una transacción para que se apliquen todos o ninguno.
2. **Validar todo antes de cambiar nada**: comprobar existencia, saldo y reglas primero; los efectos van al final, juntos.
3. **Compensar** cuando no hay transacción (por ejemplo, entre servicios distintos): si el segundo paso falla, deshacer el primero, y registrarlo.
4. **Idempotencia**: que reintentar una operación que quizá se aplicó a medias no duplique el efecto (por ejemplo, con un identificador único de operación).

```ts
type TransferError =
  | { kind: "account-not-found"; accountId: string }
  | { kind: "insufficient-funds"; available: number };

async function transfer(fromId: string, toId: string, amount: PositiveAmount): Promise<Result<void, TransferError>> {
  const from = await accounts.findById(fromId);
  if (!from) return { ok: false, error: { kind: "account-not-found", accountId: fromId } };
  const to = await accounts.findById(toId);
  if (!to) return { ok: false, error: { kind: "account-not-found", accountId: toId } };
  if (!from.canWithdraw(amount)) return { ok: false, error: { kind: "insufficient-funds", available: from.balance } };

  // Todo o nada: si falla, la excepción se propaga y no queda dinero creado ni destruido.
  await accounts.inTransaction(async (tx) => {
    from.withdraw(amount); // la cuenta protege su invariante
    to.deposit(amount);
    await tx.saveAll([from, to]);
  });
  return { ok: true, value: undefined };
}
```

Los errores esperados son parte del tipo, las validaciones van antes de cualquier efecto, los fallos de infraestructura se propagan y la transacción elimina el estado intermedio. Al revisar código, pregunta siempre: **¿qué pasa si falla la segunda línea con efectos?**

### Recursos: termina lo que empiezas

Archivos, conexiones, temporizadores, suscripciones y transacciones siguen el mismo patrón: adquirir, usar, liberar. El consejo pragmático es **termina lo que empiezas**: quien adquiere un recurso lo libera, en la misma rutina y con el ámbito más pequeño posible. Adquiere **antes** del `try` (si la adquisición falla, el `finally` no debe liberar algo que no existe), libera en `finally` o con `await using` (TypeScript 5.2+, que llama a `[Symbol.asyncDispose]()` al salir del bloque) y, si hay varios recursos, libéralos en orden inverso y adquiérelos siempre en el mismo orden para evitar interbloqueos.

```ts
async function appendToLog(lines: string[]): Promise<void> {
  const handle = await fs.open("app.log", "a"); // adquirir fuera del try
  try {
    for (const line of lines) await handle.write(line + "\n");
  } finally {
    await handle.close(); // se libera en todos los caminos
  }
}
```

El recolector de basura libera memoria, pero no un `setInterval` sin `clearInterval`, un listener sin `off`, una conexión no devuelta al pool o una petición sin `AbortController.abort()`. En React, la limpieza de `useEffect` es exactamente "termina lo que empiezas". Y se puede **comprobar el equilibrio** en un test: un pequeño adaptador sobre el pool que cuente conexiones prestadas y un test que provoque un error y verifique que el contador vuelve a cero.

Por último, el tema que cierra la paranoia pragmática: **no vayas más rápido que tus faros**. Da pasos pequeños para los que tengas feedback (tests, un REPL, una demo) en lugar de diseñar para un futuro que no ves; como los eventos más influyentes son imprevisibles, diseña código fácil de reemplazar. Las fronteras limpias son justo eso: piezas reemplazables.

### Errores comunes

- **Pasar objetos de librerías por todo el sistema** (el cliente HTTP, el `Map`, la respuesta cruda de un SDK) o dejar que sus errores crucen la frontera sin traducir.
- **Aprender una librería en producción** en lugar de con learning tests.
- **Mutar las entradas**: `sort`, `push` o asignaciones sobre los argumentos de una función que parece una consulta.
- **Getters y setters para todo** e híbridos con reglas y campos públicos.
- **Tragarse excepciones** y devolver `null` o códigos mágicos que el tipo no anuncia.
- **Operaciones con varios efectos sin transacción ni compensación**, que dejan datos a medias.
- **Adquirir el recurso dentro del `try`** o abrirlo en una función y cerrarlo en otra.

### Resumen

Los objetos esconden datos y protegen sus reglas; las estructuras de datos solo transportan información y, mejor, inmutable. No mutes lo que recibes: devuelve datos nuevos y declara `readonly` lo que solo lees. En la frontera con código ajeno, define la interfaz que necesitas y escribe un adaptador que traduzca llamadas, tipos y errores, con un fake para los tests y learning tests que vigilen la librería. Diseña los errores según quien los captura: `Result` para lo esperado, excepciones con contexto para la infraestructura, casos especiales para las ausencias normales y aserciones para lo imposible. Valida antes de cambiar nada, haz atómicas las operaciones con varios efectos y libera cada recurso en todos los caminos.

## Conceptos clave

- **Antisimetría datos/objetos**: los objetos facilitan añadir tipos; las estructuras de datos facilitan añadir funciones.
- **Ley de Demeter**: un método solo habla con su clase, sus argumentos, lo que crea y sus campos.
- **Tell, don't ask**: decirle a un objeto qué hacer en vez de pedirle datos para decidir por él.
- **Mutación de entradas**: modificar los argumentos recibidos; efecto secundario que aparece en el código del llamador.
- **Frontera**: punto donde tu código se encuentra con código que no controlas.
- **Adaptador**: clase que implementa la interfaz de tu dominio traduciendo hacia la API de un tercero.
- **Learning test**: test que ejercita una librería como planeas usarla, para aprenderla y detectar cambios entre versiones.
- **Special Case**: objeto que encapsula el comportamiento de un caso excepcional para que el cliente no lo maneje.
- **Precondición / postcondición / invariante**: lo que garantiza quien llama, lo que promete la función y lo que siempre es cierto para el objeto.
- **Crash early**: detenerse ante un estado imposible en lugar de seguir con datos corruptos.
- **Fallo parcial**: operación con varios efectos que falla a mitad y deja un estado intermedio inconsistente.
- **Termina lo que empiezas**: quien adquiere un recurso es responsable de liberarlo en todos los caminos.

## Preguntas de repaso

1. ¿Por qué no conviene pasar una interfaz de frontera (un `Map`, el cliente de un SDK) por todo el sistema?
   R: Porque expone una API demasiado amplia que cualquiera puede usar mal y ata todo el código a los detalles del tercero; si la librería cambia, el cambio se propaga por todas partes. Mantenerla dentro de una clase o un adaptador con una interfaz enfocada confina el impacto a un solo lugar.
2. ¿Qué tres cosas traduce un buen adaptador y por qué ninguna debe cruzar la frontera?
   R: Las llamadas (el dominio dice `charge`, el adaptador sabe cómo lo llama el SDK), los tipos (el dominio recibe un `ChargeId`, no el objeto del proveedor) y los errores (todas las excepciones del tercero se traducen a una propia, con `cause`). Si cualquiera cruza, el dominio queda acoplado al proveedor y cambiarlo obliga a tocar todo el sistema.
3. ¿Cómo se trabaja con una API que todavía no existe?
   R: Definiendo la interfaz que tu código necesitaría, programando contra ella con un fake para tests y desarrollo, y escribiendo el adaptador hacia la API real cuando esté disponible. No te bloqueas y tu dominio no depende de los formatos del proveedor.
4. ¿Qué es un learning test y por qué se dice que es "mejor que gratis"?
   R: Es un test que ejercita una librería de terceros como planeas usarla, para aprender su comportamiento de forma controlada. Es mejor que gratis porque el aprendizaje lo ibas a hacer igual y, al actualizar la librería, los tests revelan de inmediato cualquier cambio de comportamiento del que dependes.
5. ¿Qué problema tiene `function top(students: Student[]) { return students.sort(...).slice(0, 3); }` y cómo lo corriges?
   R: `sort` reordena en el sitio el array que recibió, así que la función, que parece una consulta, cambia el orden del array del llamador. Se corrige sin mutar la entrada: `toSorted` o `[...students].sort(...)`, y declarando el parámetro como `readonly Student[]` para que el compilador rechace la mutación.
6. ¿Qué significa "tell, don't ask" y qué ventaja tiene para las invariantes?
   R: Decirle al objeto qué hacer (`order.applyDiscount(10)`) en lugar de pedirle sus datos y modificarlos desde fuera. Así el objeto valida y protege sus reglas (no aplicar un descuento mayor que el total) y nadie puede dejarlo en un estado inválido.
7. ¿Cuándo usarías una excepción, un `Result`, un caso especial y una aserción?
   R: Excepción con contexto para fallos de infraestructura que no se resuelven en ese punto; `Result` para errores esperados del dominio que el llamador debe manejar; caso especial cuando la ausencia tiene un comportamiento por defecto razonable; aserción para condiciones que nunca deberían ocurrir si el programa es correcto.
8. ¿Qué es un fallo parcial y qué estrategias lo evitan?
   R: Es una operación con varios efectos que falla a mitad y deja un estado intermedio, como un traspaso que descuenta de una cuenta y no abona en la otra. Se evita con transacciones (todo o nada), validando todo antes de cualquier efecto, compensando el paso ya aplicado cuando no hay transacción posible e implementando operaciones idempotentes para poder reintentar.
9. ¿Por qué es un error adquirir un recurso dentro del `try` y liberarlo en el `finally`?
   R: Porque si la adquisición falla, el `finally` intenta liberar un recurso que nunca se obtuvo; eso lanza un segundo error que puede ocultar el original. El recurso se adquiere antes del `try`.

## Ejercicio

Elige una librería que no conozcas bien (por ejemplo `zod`, `date-fns` o `node:sqlite`) y escribe un archivo de learning tests con Vitest de al menos cinco tests. Define una interfaz propia que tu aplicación necesite (por ejemplo `Clock` con `now()` o `Validator<T>` con `parse(input): Result<T, string>`), un fake y un adaptador que use la librería real y traduzca sus errores a uno propio con `cause`. Después implementa `reserveStock(store, productId, quantity)`: devuelve un `Result` con errores tipados para "producto no encontrado" y "stock insuficiente", usa `assert` para la precondición de que `quantity` es un entero positivo, valida todo antes de escribir, nunca devuelve `null` y **no muta** el objeto de producto que recibe del store (devuelve uno nuevo). Escribe tests para: reserva correcta, producto inexistente, stock insuficiente, cantidad inválida, fallo del store (se propaga con `cause`) y que el objeto original sigue igual tras la reserva. Terminado cuando los learning tests pasan, el dominio solo importa tu interfaz, los seis tests pasan y `tsc --strict` no da errores.

## Explícalo con tus palabras

Explica qué es un adaptador usando como ejemplo el enchufe de viaje que usas en otro país, y por qué el enchufe también debería protegerte de un voltaje distinto (los errores del tercero).
