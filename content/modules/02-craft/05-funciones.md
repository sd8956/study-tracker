---
title: Funciones pequeñas que hacen una sola cosa
kind: lesson
hours: 2
sources: Clean Code, cap. 3 Functions (pp. 62–83)
---

## Objetivo

Escribir funciones cortas, con un solo propósito, un solo nivel de abstracción, pocos argumentos y sin efectos secundarios ocultos. Al terminar vas a poder tomar una función larga de TypeScript y descomponerla paso a paso en funciones que se leen de arriba hacia abajo como un relato.

## Estudio

### La función es la primera unidad de organización

Las funciones son la primera línea de organización de cualquier programa. Antes de pensar en clases, módulos o servicios, el código se agrupa en funciones. Si las funciones están mal construidas, nada de lo que pongas encima va a compensarlo.

Martin empieza el capítulo con una función real de un proyecto Java de testing (FitNesse): decenas de líneas, cadenas mágicas, condicionales anidados, llamadas a métodos con nombres extraños y varios niveles de abstracción mezclados. Después de unos minutos de lectura, casi nadie entiende qué hace. La versión refactorizada tiene unas pocas líneas y se entiende de un vistazo: "si es una página de test, incluye las páginas de setup y teardown". La lógica es la misma; lo que cambia es cómo está **organizada**.

¿Qué hace que la segunda versión sea fácil de leer? Esa es la pregunta del capítulo, y la respuesta son unas pocas reglas.

### Regla 1: pequeñas

La primera regla de las funciones es que sean pequeñas. La segunda es que sean más pequeñas todavía. Martin no da una cifra exacta, pero su experiencia es que las funciones de 2 a 5 líneas son perfectamente normales en código bien hecho, y que rara vez una función debería pasar de unas 20 líneas.

Una consecuencia directa: **los bloques dentro de `if`, `else` y `while` deberían tener una línea**, normalmente una llamada a otra función con un nombre descriptivo. Eso mantiene la función contenedora pequeña y, además, añade valor documental: el nombre de la función llamada explica qué hace ese bloque. También significa que el nivel de indentación no debería pasar de uno o dos.

```ts
// Antes: el bloque del if es la lógica entera
if (user.subscription) {
  const days = Math.ceil((user.subscription.endsAt.getTime() - Date.now()) / 86_400_000);
  if (days < 7) {
    mailer.send(user.email, "Tu suscripción vence pronto", `Te quedan ${days} días`);
  }
}

// Después: el bloque es una llamada con nombre
if (user.subscription) {
  warnIfSubscriptionEndsSoon(user);
}
```

### Regla 2: haz una sola cosa

La regla más citada del libro: **una función debería hacer una cosa, hacerla bien y hacer solo eso**. El problema es saber qué es "una cosa". Martin da dos criterios prácticos:

1. **Una función hace una cosa si todos sus pasos están un nivel de abstracción por debajo del nombre de la función.** Si la función se llama `renderPageWithSetupsAndTeardowns`, sus pasos son: ¿es una página de test?, si lo es, incluir setups y teardowns, y renderizar la página en HTML. Todos esos pasos están justo un nivel por debajo del nombre.
2. **Si puedes extraer de ella otra función con un nombre que no sea una mera reformulación de su implementación, hace más de una cosa.**

Otra señal: si una función se divide naturalmente en **secciones** (declaraciones, inicializaciones, filtrado, cálculo), hace más de una cosa. Las funciones que hacen una sola cosa no se pueden dividir razonablemente en secciones.

### Regla 3: un nivel de abstracción por función

Mezclar niveles de abstracción confunde. Si en una misma función tienes `getHtml()` (alto nivel), `PathParser.render(pagePath)` (nivel intermedio) y `.append("\n")` (bajo nivel), quien lee no sabe si un detalle es esencial o accidental. Y una vez que los detalles se mezclan con los conceptos, empiezan a acumularse más detalles.

```ts
// Mezcla de niveles: concepto (generar reporte) + detalle (formatear strings, I/O)
async function generateMonthlyReport(month: number) {
  const rows = await db.query(`SELECT * FROM sales WHERE month = ${month}`);
  let csv = "product,total\n";
  for (const r of rows) csv += `${r.product},${r.total.toFixed(2)}\n`;
  await fs.writeFile(`/reports/${month}.csv`, csv);
}

// Un nivel por función
async function generateMonthlyReport(month: number): Promise<void> {
  const sales = await salesRepository.findByMonth(month);
  const csv = toSalesCsv(sales);
  await reportStorage.save(`${month}.csv`, csv);
}

function toSalesCsv(sales: Sale[]): string {
  const header = "product,total";
  const lines = sales.map((sale) => `${sale.product},${sale.total.toFixed(2)}`);
  return [header, ...lines].join("\n");
}
```

De paso, la versión refactorizada deja de construir SQL concatenando strings, que era una inyección SQL esperando a pasar.

### La regla de descenso: leer de arriba abajo

Martin propone que el código se lea como una narración de arriba hacia abajo, lo que llama la **stepdown rule**: cada función va seguida de las funciones del siguiente nivel de abstracción que utiliza. Así, el archivo se lee como una serie de párrafos que empiezan con "Para hacer X, hacemos A, B y C":

```
Para generar el reporte mensual, obtenemos las ventas, las convertimos a CSV y lo guardamos.
  Para convertir a CSV, ponemos la cabecera y una línea por venta.
    Para formatear una venta, ...
```

En TypeScript, las declaraciones `function` se elevan (*hoisting*), así que puedes poner la función pública arriba y los detalles debajo sin problemas.

### Sentencias switch

Los `switch` (y las cadenas de `if/else if`) son difíciles de hacer pequeños y, por naturaleza, hacen N cosas. Martin muestra una función que calcula el pago de un empleado con un `switch` sobre el tipo de empleado. Sus problemas:

- Es larga, y crecerá con cada nuevo tipo de empleado.
- Hace más de una cosa.
- Viola el principio de responsabilidad única (hay más de una razón para cambiarla).
- Viola el principio abierto/cerrado (hay que modificarla cada vez que se añade un tipo).
- Lo peor: probablemente hay **otros** `switch` iguales repartidos por el código (`isPayday`, `deliverPay`...), todos con la misma estructura.

La solución que propone es esconder el `switch` en una **fábrica** abstracta y usar polimorfismo para el resto:

```ts
// Antes: el mismo switch se repetirá en isPayday, deliverPay, etc.
function calculatePay(employee: EmployeeRecord): number {
  switch (employee.type) {
    case "COMMISSIONED": return calculateCommissionedPay(employee);
    case "HOURLY":       return calculateHourlyPay(employee);
    case "SALARIED":     return calculateSalariedPay(employee);
    default: throw new InvalidEmployeeType(employee.type);
  }
}

// Después: un único switch, en la fábrica
interface Employee {
  isPayday(date: Date): boolean;
  calculatePay(): number;
}

class CommissionedEmployee implements Employee { /* ... */ }
class HourlyEmployee implements Employee { /* ... */ }
class SalariedEmployee implements Employee { /* ... */ }

function makeEmployee(record: EmployeeRecord): Employee {
  switch (record.type) {
    case "COMMISSIONED": return new CommissionedEmployee(record);
    case "HOURLY":       return new HourlyEmployee(record);
    case "SALARIED":     return new SalariedEmployee(record);
    default: throw new InvalidEmployeeType(record.type);
  }
}
```

La regla de Martin: un `switch` se tolera si aparece **una sola vez**, se usa para crear objetos polimórficos y queda escondido detrás de una relación de herencia o interfaz para que el resto del sistema no lo vea.

En TypeScript existe una alternativa muy idiomática: las **uniones discriminadas** con comprobación de exhaustividad. Si el `switch` está en un solo lugar y quieres que el compilador te avise cuando aparezca un tipo nuevo, puedes usar `never`:

```ts
type Shape = { kind: "circle"; radius: number } | { kind: "square"; side: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle": return Math.PI * shape.radius ** 2;
    case "square": return shape.side ** 2;
    default: {
      const unreachable: never = shape; // error de compilación si falta un caso
      throw new Error(`Forma no soportada: ${JSON.stringify(unreachable)}`);
    }
  }
}
```

Esto no contradice a Martin: sigue siendo un único punto de decisión, y el compilador garantiza que no olvidas casos.

### Nombres descriptivos

En la sesión anterior viste cómo nombrar. Aplicado a funciones: cuanto más pequeña y enfocada sea una función, más fácil es darle un buen nombre. No tengas miedo a los nombres largos: `includeSetupAndTeardownPages` es mejor que un nombre corto enigmático y mejor que un comentario largo. Sé consistente: si tienes `includeSetupPages`, `includeSuiteSetupPage` e `includeSetupPage`, la familia de nombres cuenta una historia.

### Argumentos: cuantos menos, mejor

El número ideal de argumentos es cero (*niládico*). Después vienen uno (*monádico*) y dos (*diádico*). Tres (*triádico*) deberían evitarse cuando se pueda, y más de tres necesitan una justificación muy especial. Los argumentos cuestan: obligan a quien lee a interpretarlos y multiplican los casos que hay que probar.

**Formas monádicas comunes.** Hay dos razones habituales para pasar un argumento: hacer una pregunta sobre él (`fileExists("MyFile")`) o transformarlo y devolver el resultado (`fileOpen("MyFile")` devuelve un handle). Una tercera forma, menos común, es el **evento**: un argumento de entrada sin salida, que cambia el estado del sistema (`passwordAttemptFailedNtimes(attempts)`). Que quede claro por el nombre que es un evento.

**Argumentos flag.** Pasar un booleano a una función es, según Martin, una práctica terrible: anuncia a gritos que la función hace dos cosas (una si es `true` y otra si es `false`). Mejor dos funciones.

```ts
// Antes: ¿qué significa true?
render(page, true);

// Después
renderForSuite(page);
renderForSingleTest(page);
```

**Funciones diádicas.** `writeField(name)` se entiende mejor que `writeField(outputStream, name)`. Hay casos naturales, como `new Point(0, 0)`, donde los dos argumentos son partes ordenadas de un mismo valor. Pero en `assertEquals(expected, actual)`, ¿cuántas veces has puesto `actual` primero? El orden de los argumentos es una convención que hay que aprender.

**Objetos como argumentos.** Cuando una función necesita más de dos o tres argumentos, probablemente algunos forman un concepto propio:

```ts
// Antes
function makeCircle(x: number, y: number, radius: number): Circle { /* ... */ }

// Después
type Point = { x: number; y: number };
function makeCircle(center: Point, radius: number): Circle { /* ... */ }
```

En TypeScript, el patrón de **objeto de opciones con desestructuración** es muy útil para funciones con varios parámetros opcionales, porque en la llamada se ve el nombre de cada valor:

```ts
function createUser({ name, email, isAdmin = false }: { name: string; email: string; isAdmin?: boolean }) {
  /* ... */
}
createUser({ name: "Ana", email: "ana@mail.com", isAdmin: true });
```

Ojo: un objeto de opciones con un `isAdmin` booleano sigue siendo un flag disfrazado si cambia por completo lo que hace la función. Úsalo para parámetros, no para elegir entre dos comportamientos.

**Verbos y palabras clave.** Un buen nombre de función forma un par verbo/sustantivo con su argumento: `write(name)`, o mejor `writeField(name)`. Incluso puedes codificar el orden de los argumentos en el nombre: `assertExpectedEqualsActual(expected, actual)`.

### Sin efectos secundarios

Un efecto secundario es una mentira: la función promete hacer una cosa y además hace otra escondida. Martin muestra una función `checkPassword(userName, password)` que comprueba la contraseña y, si es correcta, **inicializa la sesión**. El nombre no lo dice. Quien la llame para "solo comprobar" una contraseña borrará la sesión actual sin saberlo.

Este tipo de efecto crea un **acoplamiento temporal**: `checkPassword` solo se puede llamar en ciertos momentos (cuando es seguro inicializar la sesión). Si el efecto es necesario, que el nombre lo diga (`checkPasswordAndInitializeSession`), aunque eso revela que la función hace dos cosas.

```ts
// Antes: efecto oculto
function checkPassword(user: User, password: string): boolean {
  const ok = hasher.verify(password, user.passwordHash);
  if (ok) session.initialize(user); // ¡sorpresa!
  return ok;
}

// Después: dos responsabilidades, dos funciones
function isPasswordCorrect(user: User, password: string): boolean {
  return hasher.verify(password, user.passwordHash);
}

function login(user: User, password: string): void {
  if (!isPasswordCorrect(user, password)) throw new InvalidCredentials();
  session.initialize(user);
}
```

**Argumentos de salida.** Los argumentos se interpretan como entradas. Si una función modifica un argumento que recibe (`appendFooter(report)`), quien lee duda: ¿añade el pie a `report` o añade `report` como pie de algo? En orientación a objetos, si una función tiene que cambiar el estado de algo, que cambie el estado de su propio objeto: `report.appendFooter()`. En código funcional, devuelve un valor nuevo en lugar de mutar.

### Separación entre comandos y consultas

Una función debería **hacer algo** (comando) **o responder algo** (consulta), pero no ambas cosas. Esto se llama *Command Query Separation* (CQS). Mira este ejemplo:

```ts
if (set("username", "unclebob")) { /* ... */ }
```

¿Pregunta si el atributo `username` ya valía "unclebob"? ¿O si se pudo asignar? Es imposible saberlo. La solución es separar:

```ts
if (attributeExists("username")) {
  setAttribute("username", "unclebob");
}
```

### Excepciones en lugar de códigos de error

Devolver códigos de error desde funciones comando viola sutilmente CQS (el comando se usa como expresión en un `if`) y produce estructuras muy anidadas, porque cada llamada exige comprobar su resultado:

```ts
// Antes: códigos de error anidados
if (deletePage(page) === E_OK) {
  if (registry.deleteReference(page.name) === E_OK) {
    if (configKeys.deleteKey(page.name.makeKey()) === E_OK) {
      logger.log("page deleted");
    } else logger.log("configKey not deleted");
  } else logger.log("deleteReference from registry failed");
} else logger.log("delete failed");

// Después: el camino feliz se lee de corrido
try {
  deletePage(page);
  registry.deleteReference(page.name);
  configKeys.deleteKey(page.name.makeKey());
} catch (error) {
  logger.log(errorMessage(error));
}
```

Dos refinamientos más:

- **Extrae los bloques `try/catch`.** Mezclan el procesamiento de errores con el normal. Lo ideal es que la función que tiene el `try` solo tenga eso: una llamada en el `try` y el manejo en el `catch`.
- **El manejo de errores es "una cosa".** Si una función maneja errores, no debería hacer nada más: la palabra `try` debería ser lo primero que aparece y no debería haber nada después del `catch`/`finally`.

```ts
function deletePageSafely(page: Page): void {
  try {
    deletePageAndAllReferences(page);
  } catch (error) {
    logError(error);
  }
}

function deletePageAndAllReferences(page: Page): void {
  deletePage(page);
  registry.deleteReference(page.name);
  configKeys.deleteKey(page.name.makeKey());
}
```

Martin advierte también sobre el **imán de dependencias** de los códigos de error: un enum global `ErrorCode` que todo el mundo importa hace que añadir un error nuevo obligue a recompilar o redesplegar todo. Las excepciones (clases que heredan de `Error`) permiten añadir errores sin tocar el resto. En TypeScript moderno, otra opción válida es devolver un tipo `Result` (lo verás en la sesión de manejo de errores), siempre que no anides comprobaciones manualmente.

### No te repitas y programación estructurada

La duplicación es la raíz de muchos males del software. En el ejemplo de FitNesse, el mismo algoritmo para incluir páginas se repetía cuatro veces con pequeñas variaciones. Cada copia es un lugar más donde hay que aplicar un cambio y una oportunidad de olvidarlo. Profundizarás en DRY en la sesión 11.

Sobre la programación estructurada de Dijkstra (una entrada y una salida por función, sin `break` ni `continue`), Martin matiza: en funciones grandes esas reglas ayudan, pero en funciones pequeñas un `return` temprano, un `break` o un `continue` a veces son **más** expresivos. Las cláusulas de guarda (*guard clauses*) son un buen ejemplo:

```ts
function shippingCost(order: Order): number {
  if (order.items.length === 0) return 0;
  if (order.customer.isPremium) return 0;
  if (order.total > FREE_SHIPPING_THRESHOLD) return 0;
  return STANDARD_SHIPPING;
}
```

### ¿Cómo se escriben funciones así?

Nadie escribe estas funciones a la primera. Martin lo compara con escribir un ensayo: primero escribes el borrador tal como sale, desordenado, y luego lo editas hasta que se lee bien. Su proceso:

1. Escribe una función larga y torpe que funcione.
2. Escribe tests que cubran cada línea de esa función.
3. Refina: extrae funciones, cambia nombres, elimina duplicación, reordena.
4. Ejecuta los tests después de cada cambio.

Los tests son lo que hace que el refinamiento sea seguro. Sin ellos, cada extracción es una apuesta.

### Ejemplo integrado: refactorizar una función larga

```ts
// Antes
async function handle(req: { body: any }) {
  const b = req.body;
  if (!b.email || !b.email.includes("@")) return { status: 400, msg: "bad email" };
  if (!b.items || b.items.length === 0) return { status: 400, msg: "no items" };
  let total = 0;
  for (const it of b.items) {
    const p = await db.products.find(it.id);
    if (!p) return { status: 404, msg: "product " + it.id };
    total += p.price * it.qty;
  }
  if (total > 100) total = total * 0.95;
  const id = await db.orders.insert({ email: b.email, items: b.items, total });
  await mailer.send(b.email, "Pedido " + id, "Total: " + total);
  return { status: 201, id };
}
```

```ts
// Después
const BULK_DISCOUNT_THRESHOLD = 100;
const BULK_DISCOUNT_RATE = 0.05;

async function createOrder(request: CreateOrderRequest): Promise<HttpResponse> {
  try {
    const order = parseOrder(request.body);
    const total = applyBulkDiscount(await calculateSubtotal(order.items));
    const orderId = await orders.save({ ...order, total });
    await notifyOrderCreated(order.email, orderId, total);
    return { status: 201, body: { id: orderId } };
  } catch (error) {
    return toHttpError(error);
  }
}

function parseOrder(body: unknown): NewOrder {
  const order = body as Partial<NewOrder>;
  if (!order.email?.includes("@")) throw new ValidationError("bad email");
  if (!order.items?.length) throw new ValidationError("no items");
  return { email: order.email, items: order.items };
}

async function calculateSubtotal(items: OrderItem[]): Promise<number> {
  let subtotal = 0;
  for (const item of items) {
    const product = await products.findOrFail(item.productId);
    subtotal += product.price * item.quantity;
  }
  return subtotal;
}

function applyBulkDiscount(amount: number): number {
  return amount > BULK_DISCOUNT_THRESHOLD ? amount * (1 - BULK_DISCOUNT_RATE) : amount;
}
```

Cada función hace una cosa, en un solo nivel de abstracción, y `createOrder` se lee como un resumen del caso de uso. La validación real de `parseOrder` debería usar una librería de esquemas (como Zod), pero eso no cambia la estructura.

### Errores comunes

- **Extraer funciones que solo reformulan la línea que envuelven**: `function addOne(x) { return x + 1; }` no aporta abstracción.
- **Funciones "pequeñas" que esconden efectos secundarios**: el tamaño no compensa la mentira del nombre.
- **Argumentos booleanos y `null` como señal de modo**: dos funciones son más claras.
- **Mezclar validación, cálculo, persistencia y notificación en una sola función**: el clásico "controlador gordo".
- **Refactorizar sin tests**: el riesgo de romper algo sin darte cuenta es alto.

## Conceptos clave

- **Hacer una sola cosa**: todos los pasos de la función están un nivel de abstracción por debajo de su nombre.
- **Stepdown rule**: organizar el código para que se lea de arriba abajo, de lo general a lo particular.
- **Argumento flag**: booleano que selecciona entre dos comportamientos; señal de que la función hace dos cosas.
- **Efecto secundario**: cambio de estado no anunciado por el nombre de la función.
- **Acoplamiento temporal**: dependencia oculta del orden o momento en que se llaman las funciones.
- **Command Query Separation**: una función o cambia estado o devuelve información, nunca ambas.
- **Cláusula de guarda**: `return` temprano que maneja casos especiales al inicio y deja limpio el camino principal.

## Preguntas de repaso

1. Da los dos criterios de Martin para saber si una función hace "una sola cosa".
   R: Que todos sus pasos estén un nivel de abstracción por debajo del nombre de la función, y que no se pueda extraer de ella otra función con un nombre que no sea una simple reformulación de su implementación. Una función que se divide en secciones hace más de una cosa.
2. ¿Por qué un argumento booleano es mala señal y cómo se corrige?
   R: Porque indica que la función hace una cosa si es true y otra si es false, y en la llamada `render(page, true)` no se entiende qué significa. Se corrige dividiendo en dos funciones con nombres claros, como `renderForSuite` y `renderForSingleTest`.
3. ¿Qué problemas tienen las sentencias switch según Clean Code y qué solución propone?
   R: Son largas, crecen con cada caso nuevo, hacen varias cosas, violan SRP y OCP, y suelen repetirse en varios lugares. La solución es tener un único switch dentro de una fábrica que crea objetos polimórficos, para que el resto del código use polimorfismo.
4. Explica Command Query Separation con un ejemplo de violación y su corrección.
   R: Una función debe cambiar estado o responder algo, no ambas. `if (set("username", "bob"))` es ambiguo: no se sabe si pregunta o asigna. Se corrige separando en `if (attributeExists("username")) setAttribute("username", "bob")`.
5. ¿Por qué se prefieren las excepciones a los códigos de error y qué recomendación se da sobre los bloques try/catch?
   R: Porque los códigos de error obligan a comprobar cada llamada, anidan el código, mezclan el camino feliz con el manejo de errores y crean un imán de dependencias. Se recomienda extraer el cuerpo del try a su propia función, ya que manejar errores es "una cosa": try primero y nada después del catch.
6. ¿Cuál es el proceso que propone Martin para llegar a funciones limpias?
   R: Escribir primero una versión que funcione aunque sea torpe, cubrirla con tests y luego refinarla en pasos pequeños (extraer, renombrar, eliminar duplicación), ejecutando los tests tras cada paso.

## Ejercicio

Escribe en TypeScript una función "sucia" de unas 40 líneas que procese el registro de un estudiante a un curso (validar datos, comprobar cupo, calcular precio con un descuento si es estudiante recurrente, guardar y enviar un correo), con al menos un flag booleano y un switch. Escribe tests con Vitest que fijen su comportamiento (mínimo cinco casos). Después refactorízala aplicando las reglas de la lección hasta que ninguna función supere 12 líneas, no haya flags, el switch aparezca una sola vez y se cumpla CQS. Terminado cuando los cinco tests pasan sin cambios antes y después del refactor.

## Explícalo con tus palabras

Explica qué significa "un nivel de abstracción por función" usando como ejemplo una receta de cocina.
