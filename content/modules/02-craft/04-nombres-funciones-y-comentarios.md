---
title: Nombres, funciones pequeñas y comentarios
kind: lesson
hours: 3
sources: Clean Code, cap. 2 Meaningful Names (pp. 48–61), cap. 3 Functions (pp. 62–83), cap. 4 Comments (pp. 84–105) y cap. 5 Formatting (pp. 106–123) | The Pragmatic Programmer, tema 44 Naming Things (pp. 395–402)
---

## Objetivo

Escribir código que se explica solo, con el foco puesto en las funciones: funciones pequeñas que hacen una sola cosa, en un solo nivel de abstracción, sin argumentos flag y sin efectos secundarios ocultos. Lo acompañan los nombres que revelan intención y los comentarios que explican solo el porqué. Al terminar vas a poder tomar una función larga de TypeScript, detectar sus responsabilidades mezcladas y descomponerla paso a paso con tests que lo demuestran.

## Estudio

### El nombre es la primera abstracción

Casi todo en el código tiene nombre, y cada nombre es una pequeña decisión de diseño: un buen nombre te ahorra leer la implementación; uno malo te obliga a leerla, y a veces te engaña. *The Pragmatic Programmer* lo compara con el **efecto Stroop**: si ves la palabra "AZUL" escrita en rojo, tardas más en decir el color de la tinta, porque el cerebro ya leyó la palabra. Si una función se llama `getUser` y además borra la sesión, tu cerebro decide qué hace antes de leer el cuerpo. **Un nombre que miente es peor que uno genérico**.

La pregunta para elegir un nombre es: ¿cuál es la motivación de crear esto? `list` dice qué es; `pendingInvoices` dice para qué existe.

```ts
// Antes: el código es simple, pero no sabes qué significa nada
function getThem(theList: number[][]): number[][] {
  const list1: number[][] = [];
  for (const x of theList) if (x[0] === 4) list1.push(x);
  return list1;
}

// Después: mismo algoritmo, intención explícita
const FLAGGED = 4;
type Cell = { status: number };

function getFlaggedCells(gameBoard: Cell[]): Cell[] {
  return gameBoard.filter((cell) => cell.status === FLAGGED);
}
```

El problema del primero no es la complejidad sino la **implicitud**: el contexto no está en el código.

### Las reglas de nombres que más rinden

| Regla | Mal | Bien |
| --- | --- | --- |
| No desinformes | `accountList` que es un `Map`; `isValid` que además guarda | `accountsById`; `validateAndSave` o dos funciones |
| Distinciones con significado | `copy(a1, a2)`; `ProductInfo` y `ProductData` | `copy(source, destination)`; un solo concepto |
| Pronunciable y buscable | `genymdhms`, `7` suelto | `generationTimestamp`, `MAX_CLASSES_PER_STUDENT` |
| Sin codificaciones | `IUserRepository`, `UserRepositoryImpl`, `strName` | `UserRepository`, `PostgresUserRepository`, `name` |
| Una palabra por concepto | `fetchUser`, `retrieveOrder`, `getInvoice` | `getUser`, `getOrder`, `getInvoice` |
| Sin juegos de palabras | `add(a, b)` y `add(item)` | `sum(a, b)` y `append(item)` |

Dos reglas más. **La longitud del nombre es proporcional a su ámbito**: un índice de un bucle de tres líneas puede ser `i`; una constante usada en todo el módulo merece un nombre largo y único. Y **usa el vocabulario correcto**: términos técnicos (`jobQueue`, `AccountVisitor`) cuando hablas de mecanismos, y términos del negocio (`Invoice`, `Shipment`) cuando hablas del dominio. En TypeScript, respeta además la cultura del lenguaje: camelCase para variables y funciones, PascalCase para tipos, UPPER_SNAKE_CASE para constantes inmutables y prefijos `is`, `has`, `can` para booleanos.

Los nombres envejecen: si `getActiveUsers` ahora también devuelve suspendidos, ya no dice la verdad. **Renombra cuando haga falta**; si algo te lo impide (falta de tests, una API pública), ese es el verdadero problema. Y una señal que conecta con el resto de la sesión: **si no encuentras un nombre honesto y corto, la función hace demasiado**. No hay una sola cosa que nombrar.

### Regla 1: funciones pequeñas

Las funciones son la primera unidad de organización: si están mal hechas, nada de lo que pongas encima lo compensa. La primera regla de Martin es que sean pequeñas, y la segunda, que sean más pequeñas todavía. Funciones de 2 a 5 líneas son normales en código bien hecho, y rara vez deberían pasar de unas 20.

Una consecuencia directa: **el bloque de un `if`, un `else` o un `while` debería ser una línea**, normalmente una llamada con un nombre que explica el bloque. Eso mantiene la indentación en uno o dos niveles.

```ts
// Antes: el bloque del if es la lógica entera
if (user.subscription) {
  const days = Math.ceil((user.subscription.endsAt.getTime() - Date.now()) / 86_400_000);
  if (days < 7) mailer.send(user.email, "Tu suscripción vence pronto", `Te quedan ${days} días`);
}

// Después: el bloque es una llamada con nombre
if (user.subscription) {
  warnIfSubscriptionEndsSoon(user);
}
```

### Regla 2: haz una sola cosa

La regla más citada del libro: **una función debería hacer una cosa, hacerla bien y hacer solo eso**. El problema es saber qué es "una cosa", y Martin da criterios prácticos:

1. **Todos sus pasos están un nivel de abstracción por debajo de su nombre.** `renderPageWithSetupsAndTeardowns` comprueba si es una página de test, incluye setups y teardowns y renderiza. Los tres pasos están justo un nivel por debajo del nombre.
2. **Si puedes extraer otra función con un nombre que no sea una reformulación de su implementación, hace más de una cosa.**
3. **Si se divide naturalmente en secciones** (validar, calcular, guardar, notificar), hace más de una cosa.

Esta regla es el principio de responsabilidad única aplicado a la escala más pequeña: una función con cuatro secciones tiene cuatro razones para cambiar. Si cambia la regla de validación, el cálculo de precios y la plantilla del correo, los tres cambios tocan la misma función, chocan en los merges y se prueban juntos. El síntoma más común en un code review es el **controlador gordo**: un handler HTTP que valida, consulta, calcula, guarda y envía correos.

### Regla 3: un nivel de abstracción por función

Mezclar niveles confunde: si en una misma función aparecen el concepto ("generar el reporte mensual") y los detalles (concatenar strings, escribir en disco), quien lee no sabe qué es esencial y qué es accidental. Y una vez que los detalles se mezclan con los conceptos, atraen más detalles.

```ts
// Mezcla de niveles: concepto + SQL + formato + I/O
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

Fíjate en un efecto colateral importante: la primera versión construía SQL concatenando un valor, que es una **inyección SQL** esperando a pasar. Cuando los detalles de bajo nivel quedan encerrados en una función dedicada (`findByMonth`, con una consulta parametrizada dentro), son más fáciles de ver, revisar y hacer bien. Mezclar niveles no solo dificulta leer: esconde bugs y vulnerabilidades entre líneas de lógica de negocio.

Una prueba rápida para detectar la mezcla: lee la función en voz alta. Si dices "obtenemos las ventas, las convertimos a CSV y lo guardamos", el nivel es uniforme. Si dices "obtenemos las ventas, luego por cada fila concatenamos el producto, una coma y el total con dos decimales...", acabas de bajar dos niveles en mitad de la frase.

### La regla de descenso

Martin propone que un archivo se lea de arriba abajo como una narración, la **stepdown rule**: cada función va seguida de las del siguiente nivel que usa.

```
Para generar el reporte mensual, obtenemos las ventas, las convertimos a CSV y lo guardamos.
  Para convertir a CSV, ponemos la cabecera y una línea por venta.
    Para formatear una venta, ...
```

En TypeScript, las declaraciones `function` se elevan (*hoisting*), así que puedes poner la función pública arriba y los detalles debajo. Es la misma idea que la **metáfora del periódico** del formato: el titular arriba, los detalles a medida que bajas.

### Argumentos flag: una función que hace dos cosas

Pasar un booleano a una función es, según Martin, una práctica terrible, porque anuncia a gritos que la función hace una cosa si es `true` y otra si es `false`. Además, en la llamada nadie sabe qué significa:

```ts
render(page, true);              // ¿true qué?
sendReport(user, true, false);   // imposible de leer sin abrir la función
```

Un flag tiene varios disfraces, y conviene reconocerlos todos:

| Disfraz | Ejemplo | Por qué sigue siendo un flag |
| --- | --- | --- |
| Booleano posicional | `render(page, true)` | Dos comportamientos en una función |
| Opción con nombre | `save(user, { notify: true })` | Más legible, pero sigue eligiendo entre dos comportamientos |
| `null` o `undefined` como modo | `export(data, null)` = "exportar todo" | Un valor especial cambia lo que hace |
| String de modo | `process(order, "draft")` | Igual que un booleano con más valores |

La corrección casi siempre es la misma: **dos funciones con nombres que dicen qué hacen**, y si hay una parte común, una tercera función que ambas usan.

```ts
// Antes: el flag elige entre dos comportamientos
function saveUser(user: User, notify: boolean): void {
  users.save(user);
  if (notify) mailer.send(user.email, "Tu cuenta fue actualizada");
}

// Después: cada función hace una cosa; el caso de uso las compone
function saveUser(user: User): void {
  users.save(user);
}

function notifyAccountUpdated(user: User): void {
  mailer.send(user.email, "Tu cuenta fue actualizada");
}

function updateAccount(user: User): void {
  saveUser(user);
  notifyAccountUpdated(user);
}
```

¿Cuándo es aceptable un objeto de opciones con booleanos? Cuando el valor es un **parámetro** de una única operación y no un **selector** de comportamiento: `formatPrice(amount, { withCurrencySymbol: true })` sigue siendo "formatear un precio", solo cambia un detalle del resultado. La pregunta para decidir: ¿podría escribir un nombre honesto para cada valor del flag? Si `true` y `false` merecen verbos distintos (`notify` frente a no notificar), son dos funciones.

### Pocos argumentos y objetos de parámetros

El número ideal de argumentos es cero; después vienen uno y dos. Tres deberían evitarse cuando se pueda, y más de tres necesitan una muy buena razón. Cada argumento obliga a quien lee a interpretarlo y multiplica los casos que hay que probar. Dos formas monádicas son naturales: preguntar algo sobre el argumento (`fileExists(path)`) o transformarlo (`parseDate(text)`). Cuando una función pide muchos argumentos, varios suelen formar un concepto propio:

```ts
// Antes
function makeCircle(x: number, y: number, radius: number): Circle { /* ... */ }

// Después
type Point = { x: number; y: number };
function makeCircle(center: Point, radius: number): Circle { /* ... */ }
```

En TypeScript, el objeto de opciones con desestructuración hace legible la llamada cuando hay varios parámetros opcionales (`createUser({ name, email })`), con la advertencia de la sección anterior: úsalo para parámetros, no para elegir comportamientos.

### Sin efectos secundarios y separación entre comandos y consultas

Un efecto secundario es una mentira: la función promete una cosa y hace otra escondida. El ejemplo de Martin es `checkPassword`, que además inicializa la sesión. Quien la llame "solo para comprobar" borrará la sesión actual sin saberlo, y queda un **acoplamiento temporal**: solo es seguro llamarla en ciertos momentos.

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

Relacionado: una función debería **hacer algo** (comando) **o responder algo** (consulta), nunca ambas. `if (set("username", "bob"))` no dice si pregunta o asigna; `if (attributeExists("username")) setAttribute("username", "bob")` sí. Y evita los **argumentos de salida**: si `appendFooter(report)` modifica `report`, quien lee duda de qué se añade a qué. Que el objeto cambie su propio estado (`report.appendFooter()`) o, en estilo funcional, devuelve un valor nuevo; volverás a esto en la sesión 7, al hablar de no mutar las entradas.

### Switch, errores y guardas

Un `switch` sobre un tipo hace N cosas por naturaleza y suele repetirse (`calculatePay`, `isPayday`, `deliverPay`, todos con el mismo `switch`). La regla de Martin: se tolera **una sola vez**, dentro de una fábrica que crea objetos polimórficos. En TypeScript, una unión discriminada con comprobación de exhaustividad (`const unreachable: never = shape`) es una alternativa idiomática, siempre que el punto de decisión siga siendo uno solo.

Los códigos de error obligan a comprobar cada llamada y anidan el camino feliz; las excepciones lo separan. Y **manejar errores es "una cosa"**: la función con el `try` solo debería tener el `try`, una llamada dentro y el manejo en el `catch`. Verás el diseño completo de errores en la sesión 7. Por último, las **cláusulas de guarda** (`if (order.items.length === 0) return 0;` al inicio) despejan los casos especiales y dejan limpio el camino principal.

### Ejemplo integrado: descomponer un handler gordo

```ts
// Antes: valida, consulta, calcula, guarda y notifica, con un flag de regalo
async function handle(req: { body: any }, isGift: boolean) {
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
  if (isGift) total += 5;
  const id = await db.orders.insert({ email: b.email, items: b.items, total });
  await mailer.send(b.email, "Pedido " + id, "Total: " + total);
  return { status: 201, id };
}
```

Lee las secciones: validación, cálculo de subtotal, descuento, envoltorio de regalo, persistencia, notificación y traducción a HTTP. Siete razones para cambiar en una función, con un flag que añade un cargo.

```ts
// Después: el caso de uso se lee como un resumen
const BULK_DISCOUNT_THRESHOLD = 100;
const BULK_DISCOUNT_RATE = 0.05;
const GIFT_WRAP_FEE = 5;

async function createOrder(request: CreateOrderRequest): Promise<HttpResponse> {
  try {
    const order = parseOrder(request.body);
    const total = await orderTotal(order);
    const orderId = await orders.save({ ...order, total });
    await notifyOrderCreated(order.email, orderId, total);
    return { status: 201, body: { id: orderId } };
  } catch (error) {
    return toHttpError(error);
  }
}

async function orderTotal(order: NewOrder): Promise<number> {
  const discounted = applyBulkDiscount(await calculateSubtotal(order.items));
  return order.giftWrap ? discounted + GIFT_WRAP_FEE : discounted;
}

function applyBulkDiscount(amount: number): number {
  return amount > BULK_DISCOUNT_THRESHOLD ? amount * (1 - BULK_DISCOUNT_RATE) : amount;
}
```

El flag `isGift` desapareció de la firma: el envoltorio de regalo es un **dato del pedido** (`giftWrap`), no un modo de la función, y su efecto vive en un único lugar con nombre. Cada función hace una cosa en un solo nivel, `createOrder` se lee de corrido y cada regla de negocio tiene su constante y su función. La validación real de `parseOrder` debería usar una librería de esquemas, pero la estructura no cambia.

¿Cómo se llega ahí? Nadie escribe así a la primera. El proceso de Martin: escribe la versión larga que funciona, cúbrela con tests, y refina en pasos pequeños (extraer, renombrar, eliminar duplicación) ejecutando los tests tras cada paso. Sin tests, cada extracción es una apuesta.

### Comentarios: el porqué, no el qué

Martin es tajante: en el mejor de los casos, los comentarios son un mal necesario, porque **mienten al envejecer**. El código cambia y los comentarios rara vez lo acompañan, y un comentario falso es peor que ninguno. Antes de escribir uno, pregúntate si puedes decirlo con código, extrayendo una función o introduciendo una variable explicativa:

```ts
// Antes
// Si el pedido es internacional y pesa más de 20 kg, se cobra recargo
if (order.country !== "CO" && order.items.reduce((w, i) => w + i.weight, 0) > 20) {
  charge(order, SURCHARGE);
}

// Después
const isInternational = order.country !== HOME_COUNTRY;
const isHeavy = totalWeight(order.items) > HEAVY_ORDER_KG;
if (isInternational && isHeavy) charge(order, SURCHARGE);
```

Los comentarios que sí valen responden casi siempre al **porqué**: la intención de una decisión no obvia, una advertencia de consecuencias, la aclaración de un formato externo, un TODO enlazado a un ticket o la documentación de una API pública con TSDoc (solo lo que el tipo no dice).

```ts
// Usamos un pool de una sola conexión porque SQLite bloquea la base
// completa en cada escritura; más conexiones solo producen SQLITE_BUSY.
const db = createPool({ max: 1 });
```

Los que estorban: redundantes (`// devuelve el nombre`), engañosos, obligatorios (`@param title el título`), de bitácora o autoría (para eso está Git), marcadores de cierre de llaves (señal de funciones demasiado largas) y, sobre todo, **código comentado**: bórralo, el historial lo conserva. La prueba final: si borro el comentario, ¿se pierde información que no está en ningún otro lugar? Si no, sobra.

Sobre el formato, quédate con tres ideas: el archivo se lee como un periódico (lo general arriba, los detalles abajo), los conceptos relacionados van cerca (variables junto a su uso, la función que llama encima de la llamada) y **el equipo acuerda un solo estilo y lo automatiza** con un formateador. Lo verás a fondo en la sesión 25.

### Errores comunes

- **Extraer funciones que solo reformulan una línea** (`addOne(x)`): no aportan abstracción.
- **Funciones "pequeñas" con efectos secundarios ocultos**: el tamaño no compensa la mentira del nombre.
- **Booleanos, `null` o strings de modo** para elegir comportamiento, incluido el flag disfrazado de opción.
- **Mezclar niveles**: lógica de negocio junto a SQL concatenado, formateo de strings o I/O.
- **Controladores gordos** que validan, calculan, guardan y notifican.
- **Nombres genéricos o que mienten tras un cambio**, y mezclar idiomas en el código.
- **Comentar el qué** o dejar código comentado "por si acaso".
- **Refactorizar sin tests.**

## Conceptos clave

- **Nombre que revela intención**: dice por qué existe algo, qué hace y cómo se usa, sin comentario.
- **Regla de longitud y ámbito**: cuanto mayor el ámbito de un nombre, más largo y específico.
- **Hacer una sola cosa**: todos los pasos están un nivel de abstracción por debajo del nombre; la función no se divide en secciones.
- **Nivel de abstracción**: grado de detalle de una instrucción; una función no mezcla conceptos con detalles.
- **Stepdown rule**: el código se lee de arriba abajo, de lo general a lo particular.
- **Argumento flag**: valor (booleano, `null`, string de modo) que selecciona entre comportamientos; señal de que la función hace dos cosas.
- **Efecto secundario**: cambio de estado que el nombre de la función no anuncia.
- **Command Query Separation**: una función cambia estado o devuelve información, nunca ambas.
- **Variable explicativa**: variable intermedia cuyo nombre sustituye a un comentario.
- **Comentario de intención**: explica por qué se tomó una decisión no obvia.

## Preguntas de repaso

1. ¿Por qué un nombre equivocado es peor que uno genérico, y qué indica que no encuentres un nombre honesto y corto?
   R: Porque el nombre equivocado lleva activamente a una conclusión falsa (como el efecto Stroop): quien lee decide qué hace el código antes de leerlo. Uno genérico al menos obliga a leer. Si no encuentras un nombre honesto y corto, la función probablemente hace varias cosas: no hay una sola cosa que nombrar.
2. Da los criterios de Martin para saber si una función hace "una sola cosa".
   R: Que todos sus pasos estén un nivel de abstracción por debajo de su nombre; que no se pueda extraer otra función con un nombre que no sea una reformulación de la implementación; y que no se divida naturalmente en secciones como validar, calcular y guardar.
3. ¿Qué problema tiene mezclar niveles de abstracción en una función? Usa el ejemplo del reporte mensual.
   R: Quien lee no distingue lo esencial de lo accidental, y los detalles atraen más detalles. En el reporte, el concepto (obtener ventas, convertir a CSV, guardar) se mezclaba con SQL concatenado, formateo y escritura en disco; eso escondía una inyección SQL. Separar en funciones de un solo nivel deja el concepto legible y encierra cada detalle donde se puede revisar.
4. ¿Por qué un argumento booleano es mala señal y cómo se corrige? Menciona dos disfraces del mismo problema.
   R: Porque la función hace una cosa si es true y otra si es false, y en la llamada no se entiende qué significa. Se corrige con dos funciones con nombres claros (y una tercera que las componga si hace falta). Disfraces: una opción con nombre que elige comportamiento (`{ notify: true }`), `null` como modo especial o un string de modo como `"draft"`.
5. ¿Cuándo es aceptable un objeto de opciones con un booleano?
   R: Cuando el booleano es un parámetro de una sola operación que solo ajusta un detalle del resultado, como `formatPrice(amount, { withCurrencySymbol: true })`. Si cada valor merece un verbo distinto, es un selector de comportamiento y deben ser dos funciones.
6. Explica Command Query Separation y el problema de `checkPassword` que inicializa la sesión.
   R: Una función cambia estado o responde algo, no ambas. `checkPassword` parece una consulta pero inicializa la sesión: tiene un efecto secundario oculto que crea acoplamiento temporal y puede borrar la sesión de quien solo quería comprobar. Se separa en `isPasswordCorrect` (consulta) y `login` (comando).
7. ¿Qué tipos de comentario conviene conservar y qué haces con el código comentado?
   R: Los que dan información que el código no puede expresar: la intención de una decisión no obvia, advertencias de consecuencias, aclaraciones de formatos externos, TODO con ticket y documentación de API pública. El código comentado se borra: el control de versiones conserva cualquier versión anterior.
8. ¿Cuál es el proceso que propone Martin para llegar a funciones limpias?
   R: Escribir primero una versión que funcione aunque sea torpe, cubrirla con tests y refinarla en pasos pequeños (extraer, renombrar, eliminar duplicación), ejecutando los tests tras cada paso.

## Ejercicio

Escribe en TypeScript una función "sucia" de unas 40 líneas que procese la inscripción de un estudiante a un curso: validar datos, comprobar cupo, calcular el precio con descuento si es recurrente, guardar y enviar un correo. Debe tener nombres crípticos, al menos un flag booleano (por ejemplo `sendEmail`), un `switch` sobre el tipo de curso, dos niveles de abstracción mezclados (lógica de negocio junto a formateo de strings) y dos comentarios redundantes. Escribe primero tests con Vitest que fijen su comportamiento (mínimo cinco casos). Después refactorízala en pasos pequeños hasta que ninguna función supere 12 líneas, cada función esté en un solo nivel de abstracción, no quede ningún flag (ni disfrazado de opción), el `switch` aparezca una sola vez, se cumpla CQS y solo queden comentarios de intención. Terminado cuando los cinco tests pasan sin cambios antes y después del refactor y puedes leer en voz alta la función principal como un resumen del caso de uso.

## Explícalo con tus palabras

Explica qué significa "un nivel de abstracción por función" y por qué un argumento booleano delata que una función hace dos cosas, usando como ejemplo una receta de cocina.
