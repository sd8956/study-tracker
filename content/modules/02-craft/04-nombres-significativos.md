---
title: Nombres significativos
kind: lesson
hours: 2
sources: Clean Code, cap. 2 Meaningful Names (pp. 48–61) | The Pragmatic Programmer, tema 44 Naming Things (pp. 395–402)
---

## Objetivo

Aprender a elegir nombres que revelen intención, que no desinformen y que sean consistentes en todo el código. Al terminar vas a poder detectar los nombres problemáticos de un archivo TypeScript y proponer alternativas con argumentos concretos.

## Estudio

### Por qué los nombres importan tanto

En el código casi todo tiene nombre: variables, funciones, parámetros, clases, módulos, archivos, carpetas, ramas, tablas, endpoints. Escribimos nombres todo el tiempo, y cada nombre es una pequeña decisión de diseño. Un buen nombre te ahorra leer la implementación; un mal nombre te obliga a hacerlo, y a veces te engaña.

*The Pragmatic Programmer* lo explica con un experimento psicológico conocido, el **efecto Stroop**: si ves la palabra "AZUL" escrita en tinta roja y te piden decir el color de la tinta, tardas más y te equivocas más. El cerebro lee la palabra antes de procesar el color. Con el código pasa algo parecido: si una función se llama `getUser` pero además borra la sesión, tu cerebro ya "decidió" qué hace antes de leer el cuerpo. Un nombre equivocado es peor que un nombre genérico, porque activamente te lleva a la conclusión incorrecta.

La pregunta que propone el libro para elegir un nombre es: **¿cuál es la motivación de crear esto?** No qué es técnicamente, sino qué papel cumple. Una variable `list` dice qué es; `pendingInvoices` dice para qué existe.

### Usa nombres que revelen intención

El nombre de una variable, función o clase debería responder tres preguntas: por qué existe, qué hace y cómo se usa. Si necesitas un comentario para explicar el nombre, el nombre no revela su intención.

Martin muestra un ejemplo en el que una función recorre una lista de celdas de un tablero (un buscaminas) y devuelve las marcadas. Aquí tienes una versión en TypeScript:

```ts
// Antes: el código es simple, pero no sabes qué significa nada
function getThem(theList: number[][]): number[][] {
  const list1: number[][] = [];
  for (const x of theList) {
    if (x[0] === 4) list1.push(x);
  }
  return list1;
}
```

No hay nada complicado: un bucle, una condición, un `push`. Y sin embargo no puedes saber qué hace. ¿Qué hay en `theList`? ¿Qué significa la posición 0? ¿Qué significa el 4? El problema no es la complejidad del código sino su **implicitud**: el contexto no está en el código.

```ts
// Después: mismo algoritmo, intención explícita
const FLAGGED = 4;
type Cell = { status: number };

function getFlaggedCells(gameBoard: Cell[]): Cell[] {
  return gameBoard.filter((cell) => cell.status === FLAGGED);
}

// Y aún mejor, un tipo que encapsula la regla:
class BoardCell {
  constructor(private readonly status: number) {}
  isFlagged(): boolean {
    return this.status === FLAGGED;
  }
}
const flaggedCells = (board: BoardCell[]) => board.filter((cell) => cell.isFlagged());
```

La complejidad es la misma. La legibilidad es otra.

### Evita la desinformación

Un nombre desinforma cuando sugiere algo que no es cierto. Ejemplos típicos:

| Nombre engañoso | Por qué engaña | Mejor |
| --- | --- | --- |
| `accountList` (pero es un `Map`) | "List" sugiere un tipo concreto | `accounts`, `accountsById` |
| `hp`, `aix`, `sco` | Abreviaturas que coinciden con términos conocidos | `hypotenuse` |
| `XYZControllerForEfficientHandlingOfStrings` y `XYZControllerForEfficientStorageOfStrings` | Difieren en un detalle en mitad del nombre, difícil de ver | Nombres que difieren al principio o en su concepto |
| `l` y `O` como variables | Se confunden con `1` y `0` | Cualquier nombre descriptivo |
| `isValid` que además guarda en la base de datos | El nombre oculta un efecto secundario | `validateAndSave`, o separar en dos funciones |

En TypeScript tenemos una ventaja: el tipo ayuda. Pero no te apoyes en que "el tipo ya lo dice": el tipo no aparece en cada lugar donde se usa la variable, y el nombre sí.

### Haz distinciones con significado

Cuando dos cosas necesitan nombres distintos en el mismo ámbito, la tentación es añadir un número o una palabra de relleno:

```ts
function copyChars(a1: string[], a2: string[]) { /* ... */ } // ¿cuál es el origen?
function copyChars(source: string[], destination: string[]) { /* ... */ } // claro
```

Las **palabras de ruido** son igual de malas: `ProductInfo` y `ProductData` no dicen en qué se diferencian. `info`, `data`, `object`, `manager`, `processor`, `the`, `a` suelen ser ruido. Otro ejemplo: si tienes `getActiveAccount()`, `getActiveAccounts()` y `getActiveAccountInfo()`, ¿cómo sabe alguien cuál llamar? Las distinciones tienen que significar algo que quien lee pueda entender.

Una regla útil: `customer` y `customerObject`, o `money` y `moneyAmount`, no son distinguibles. Si coexisten, uno de los dos sobra o tiene un nombre que no dice su diferencia real.

### Nombres pronunciables y buscables

**Pronunciables.** Programar es una actividad social: hablas del código en reuniones, en pair programming, en code reviews. Si un nombre es `genymdhms` ("generation year month day hour minute second"), nadie puede decirlo en voz alta sin parecer que está deletreando. `generationTimestamp` se pronuncia sin esfuerzo.

**Buscables.** Los nombres de una letra y las constantes numéricas son difíciles de encontrar con un buscador. Buscar `7` en un proyecto devuelve cientos de resultados; buscar `MAX_CLASSES_PER_STUDENT` devuelve exactamente los que importan. Martin propone una regla: **la longitud de un nombre debe ser proporcional al tamaño de su ámbito**. Una variable de bucle de tres líneas puede llamarse `i`; una constante usada en todo el módulo merece un nombre largo y único.

```ts
// Antes: números mágicos y nombres cortos
let s = 0;
for (let j = 0; j < 34; j++) s += (t[j] * 4) / 5;

// Después
const REAL_DAYS_PER_IDEAL_DAY = 4;
const WORK_DAYS_PER_WEEK = 5;
const NUMBER_OF_TASKS = 34;

let sum = 0;
for (let taskIndex = 0; taskIndex < NUMBER_OF_TASKS; taskIndex++) {
  const realTaskDays = taskEstimates[taskIndex] * REAL_DAYS_PER_IDEAL_DAY;
  const realTaskWeeks = realTaskDays / WORK_DAYS_PER_WEEK;
  sum += realTaskWeeks;
}
```

Es más largo, sí. Pero ahora `WORK_DAYS_PER_WEEK` se puede buscar, y cualquiera entiende la fórmula.

### Evita las codificaciones

Antes, cuando los compiladores no comprobaban tipos, se usaba la **notación húngara**: prefijos que codificaban el tipo en el nombre (`strName`, `iCount`, `bIsReady`). En TypeScript el compilador conoce los tipos, así que esos prefijos son ruido y, peor, pueden mentir cuando el tipo cambia y nadie actualiza el nombre.

Lo mismo con los **prefijos de miembros** (`m_name`, `_name` para campos privados): TypeScript tiene `private` y los campos `#privados`, y los editores colorean los miembros. Los prefijos terminan siendo invisibles para quien lee.

Un caso muy discutido en TypeScript es el prefijo `I` en interfaces (`IUserRepository`). Martin prefiere no codificar la interfaz y, si hay que marcar algo, marcar la implementación (`UserRepository` para la interfaz, `PostgresUserRepository` o `InMemoryUserRepository` para las implementaciones). Es la convención que siguen la mayoría de las guías de estilo modernas de TypeScript, y además te obliga a nombrar las implementaciones por lo que las distingue.

```ts
// Evita
interface IUserRepository { findById(id: string): Promise<User | null>; }
class UserRepositoryImpl implements IUserRepository { /* ... */ }

// Prefiere
interface UserRepository { findById(id: string): Promise<User | null>; }
class PostgresUserRepository implements UserRepository { /* ... */ }
class InMemoryUserRepository implements UserRepository { /* ... */ }
```

### Evita el mapeo mental

Quien lee no debería tener que traducir mentalmente tus nombres a los conceptos que representan. Si en un bucle `r` es "la URL sin el host y en minúsculas", quien lee tiene que recordar esa traducción todo el rato. Martin lo resume así: la diferencia entre un programador listo y uno profesional es que el profesional sabe que **la claridad es lo primero**. Demostrar que puedes recordar veinte variables de una letra no es una virtud.

### Nombres de clases y de funciones

- **Clases y tipos**: sustantivos o frases sustantivas (`Customer`, `WikiPage`, `AddressParser`). Evita palabras vagas como `Manager`, `Processor`, `Data` o `Info` cuando no aportan.
- **Funciones y métodos**: verbos o frases verbales (`postPayment`, `deletePage`, `save`). Los accesores y predicados siguen convenciones: `getName`, `setName`, `isPosted`, `hasChildren`.
- **Constructores sobrecargados**: cuando hay varias formas de crear un objeto, usa métodos de fábrica estáticos con nombres que describan los argumentos.

```ts
// Poco claro: ¿23.0 en qué unidad?
const fulcrumPoint = new Complex(23.0);

// Claro
class Complex {
  private constructor(readonly real: number, readonly imaginary: number) {}
  static fromRealNumber(value: number): Complex {
    return new Complex(value, 0);
  }
}
const point = Complex.fromRealNumber(23.0);
```

### No seas gracioso, y una palabra por concepto

**No seas gracioso.** Un método `holyHandGrenade()` que borra todo puede hacerte gracia hoy, pero nadie más va a entender la referencia. Prefiere `deleteAllItems()`. Di lo que quieres decir.

**Una palabra por concepto.** Si en un lugar usas `fetch`, en otro `retrieve` y en otro `get` para la misma operación, quien lee va a pensar que son cosas distintas. Lo mismo con `controller`, `manager` y `driver`. Elige un término por concepto y úsalo siempre.

**No hagas juegos de palabras (no "pun").** Lo contrario también es un problema: usar la misma palabra para dos conceptos distintos. Si `add` en todas las clases significa "sumar dos valores y devolver el resultado", no uses `add` para "insertar un elemento en una colección". Usa `insert` o `append`.

| Mal | Problema | Bien |
| --- | --- | --- |
| `fetchUser`, `retrieveOrder`, `getInvoice` | Tres verbos para la misma operación | `getUser`, `getOrder`, `getInvoice` |
| `add(a, b)` y `add(item)` en otra clase | Misma palabra, conceptos distintos | `sum(a, b)` y `append(item)` |
| `UserManager`, `OrderController`, `InvoiceDriver` | Tres sufijos para el mismo rol | Elegir uno y mantenerlo |

### Nombres del dominio de la solución y del problema

Quien lee tu código es otra persona programadora. Por eso está bien usar términos técnicos (**dominio de la solución**): `AccountVisitor` le dice algo a quien conoce el patrón Visitor; `jobQueue` es claro para cualquier desarrollador. Cuando no hay un término técnico, usa el vocabulario del negocio (**dominio del problema**): `Invoice`, `Shipment`, `Policyholder`. Así, al menos, quien lee puede preguntarle a un experto del dominio. Separar ambos vocabularios es parte de un buen diseño: el código que tiene que ver con el negocio debería usar el lenguaje del negocio.

### Añade contexto con significado, sin contexto gratuito

Una variable `state` sola es ambigua. Junto a `firstName`, `lastName`, `street`, `city` y `zipCode`, se entiende que es una dirección. Pero si aparece sola en una función, ¿es el estado de una máquina de estados o una provincia? La solución no es prefijar todo (`addrState`), sino **agrupar en una estructura** que dé contexto:

```ts
type Address = { street: string; city: string; state: string; zipCode: string };
```

Y al revés: no añadas contexto gratuito. Si tu aplicación se llama "Gas Station Deluxe", prefijar todas las clases con `GSD` (`GSDAccountAddress`) solo hace que el autocompletado sea inútil y los nombres más largos sin aportar nada. Los nombres cortos son mejores que los largos **siempre que sean claros**.

### Respeta la cultura del lenguaje y del equipo

*The Pragmatic Programmer* añade un matiz importante: los nombres viven dentro de una **cultura**. En Ruby, Python o TypeScript hay convenciones distintas (snake_case, camelCase, PascalCase). En algunos contextos matemáticos, `i`, `j`, `k` como índices son perfectamente idiomáticos. Respeta las convenciones del lenguaje y del proyecto: un nombre "correcto" que rompe la convención del equipo genera fricción.

En TypeScript, las convenciones más extendidas son:

| Elemento | Convención | Ejemplo |
| --- | --- | --- |
| Variables y funciones | camelCase | `totalPrice`, `calculateTax()` |
| Clases, tipos, interfaces, enums | PascalCase | `Invoice`, `PaymentStatus` |
| Constantes globales inmutables | UPPER_SNAKE_CASE | `MAX_RETRIES` |
| Booleanos | prefijo `is`, `has`, `can`, `should` | `isPaid`, `hasDiscount` |
| Archivos | kebab-case o según el framework | `invoice-service.ts` |

El libro insiste también en la **consistencia**: todo el equipo debería entender un mismo vocabulario. Propone mantener un glosario del proyecto con los términos que tienen significado especial. Esto conecta con el "lenguaje ubicuo" de Domain-Driven Design, que verás en el módulo 03.

### Renombrar es parte del trabajo

Los nombres envejecen. Una función `getActiveUsers` que hoy también devuelve usuarios suspendidos ya no dice la verdad. El consejo pragmático es: **nombra bien y renombra cuando haga falta**. Si algo te impide renombrar (miedo a romper cosas, falta de tests, un nombre expuesto en una API pública), ese es el verdadero problema que hay que resolver. En TypeScript, la refactorización "Rename Symbol" del editor hace que renombrar sea seguro dentro del proyecto; en APIs públicas, la ley de Hyrum de la sesión 1 te recuerda que hace falta un proceso de deprecación.

### Un ejemplo completo: antes y después

```ts
// Antes
async function proc(d: any[], f: boolean) {
  const r = [];
  for (const x of d) {
    if (f && x.st !== "A") continue;
    const t = x.amt * 1.21;
    r.push({ ...x, t });
  }
  await db.save("inv2", r);
  return r.length;
}
```

Problemas: `proc` no dice nada, `d` y `x` obligan a mapear mentalmente, `f` es un flag sin significado, `"A"` y `1.21` son valores mágicos, `t` no dice qué es, `inv2` es una tabla misteriosa y el valor de retorno (cuántos se guardaron) no se deduce del nombre.

```ts
// Después
const VAT_RATE = 0.21;
const ACTIVE_STATUS = "A";

type Invoice = { status: string; amount: number };
type InvoiceWithTax = Invoice & { amountWithVat: number };

function addVat(invoice: Invoice): InvoiceWithTax {
  return { ...invoice, amountWithVat: invoice.amount * (1 + VAT_RATE) };
}

async function saveInvoicesWithVat(
  invoices: Invoice[],
  options: { onlyActive: boolean },
): Promise<number> {
  const selected = options.onlyActive
    ? invoices.filter((invoice) => invoice.status === ACTIVE_STATUS)
    : invoices;
  const invoicesWithVat = selected.map(addVat);
  await invoiceRepository.saveAll(invoicesWithVat);
  return invoicesWithVat.length;
}
```

El flag booleano sigue ahí, pero ahora como opción con nombre; en la sesión de funciones verás por qué incluso así conviene separarla en dos funciones.

### Lista de verificación para elegir un nombre

Cuando dudes, recorre estas preguntas en orden. Si alguna respuesta es "no", busca otro nombre:

1. **¿Revela la intención?** Si alguien lee solo el nombre, ¿sabe para qué sirve?
2. **¿Dice la verdad?** ¿Describe todo lo que hace, incluidos los efectos secundarios?
3. **¿Es consistente?** ¿Usa el mismo verbo y el mismo sufijo que cosas parecidas del proyecto?
4. **¿Se puede pronunciar y buscar?** ¿Podrías decirlo en una reunión? ¿Aparece pocas veces en una búsqueda?
5. **¿Tiene la longitud adecuada a su ámbito?** ¿Es corto en un bucle y descriptivo en un módulo?
6. **¿Habla el idioma correcto?** ¿Usa el término del negocio si es un concepto de negocio, o el técnico si es un mecanismo?

Un truco final: si no se te ocurre un buen nombre, muchas veces el problema no es el nombre sino el diseño. Una función que hace tres cosas no tiene un nombre honesto corto, porque **no hay una sola cosa que nombrar**. La dificultad para nombrar es una señal de que hay que dividir, y eso es exactamente lo que verás en la próxima sesión sobre funciones.

### Errores comunes

- **Nombres genéricos por pereza**: `data`, `info`, `item`, `result`, `temp` en ámbitos grandes.
- **Abreviar para ahorrar teclas**: el autocompletado escribe por ti; quien lee no tiene autocompletado mental.
- **Nombres que mienten tras un cambio**: actualizar el comportamiento y no el nombre.
- **Mezclar idiomas**: `getUsuarios`, `calcularTotal` y `saveOrder` en el mismo archivo. Elige un idioma (en código, normalmente inglés) y mantenlo.
- **Prefijos y sufijos decorativos**: `IThing`, `ThingImpl`, `ThingManager`, `MyThing`.

### Resumen

Un buen nombre revela intención, no desinforma, distingue con significado, se puede pronunciar y buscar, no codifica tipos, usa una palabra por concepto y respeta la cultura del lenguaje y del equipo. La longitud debe ser proporcional al ámbito. Y los nombres se mantienen: renombrar cuando la realidad cambia es parte del trabajo, no un lujo.

## Conceptos clave

- **Nombre que revela intención**: responde por qué existe algo, qué hace y cómo se usa, sin necesidad de comentario.
- **Desinformación**: nombre que sugiere algo falso sobre lo que representa.
- **Palabra de ruido**: término que no añade significado (`data`, `info`, `manager`).
- **Regla de longitud y ámbito**: cuanto mayor el ámbito de un nombre, más largo y específico debe ser.
- **Codificación**: información de tipo o ámbito incrustada en el nombre (notación húngara, prefijos `I`, `m_`).
- **Una palabra por concepto**: usar siempre el mismo término para la misma idea en todo el código.
- **Efecto Stroop**: interferencia cuando lo que lees contradice lo que percibes; un nombre equivocado engaña activamente.

## Preguntas de repaso

1. ¿Por qué un nombre equivocado es peor que un nombre genérico?
   R: Porque el nombre equivocado lleva activamente a una conclusión falsa (como en el efecto Stroop): quien lee "decide" qué hace el código antes de leerlo y comete errores. Un nombre genérico al menos obliga a leer la implementación.
2. ¿Qué relación hay entre la longitud de un nombre y su ámbito? Da un ejemplo.
   R: La longitud debe ser proporcional al ámbito. Un índice de un bucle de tres líneas puede llamarse `i`, pero una constante usada en todo el módulo debe tener un nombre largo y buscable como `MAX_LOGIN_ATTEMPTS`.
3. ¿Por qué se desaconseja el prefijo `I` en interfaces de TypeScript y qué alternativa hay?
   R: Porque codifica información que el compilador ya conoce y es ruido para quien usa la interfaz. La alternativa es nombrar la interfaz por su concepto (`UserRepository`) y las implementaciones por lo que las distingue (`PostgresUserRepository`, `InMemoryUserRepository`).
4. Explica "una palabra por concepto" y "no hagas juegos de palabras" con ejemplos.
   R: Una palabra por concepto: usar siempre `get` y no mezclar `fetch`, `retrieve` y `get` para la misma operación. No hacer juegos de palabras: no usar `add` para "sumar dos números" en una clase y para "insertar en una colección" en otra; el segundo debería ser `append` o `insert`.
5. ¿Cuándo conviene usar términos del dominio de la solución y cuándo del dominio del problema?
   R: Del dominio de la solución cuando existe un término técnico conocido por programadores (Visitor, queue, factory). Del dominio del problema cuando no lo hay o el concepto es del negocio (Invoice, Shipment), para que quien lee pueda consultar con expertos del dominio.
6. ¿Qué haces si un nombre ya no describe lo que hace la función pero renombrarla parece arriesgado?
   R: Renombrarla de todos modos, atacando la causa del miedo: añadir tests, usar la refactorización automática del editor y, si es API pública, seguir un proceso de deprecación (nuevo nombre, viejo marcado como deprecado, migración de consumidores).

## Ejercicio

Toma este fragmento y reescríbelo con nombres significativos, tipos y constantes con nombre, sin cambiar su comportamiento: `function chk(u: any, l: any[]) { let c = 0; for (const e of l) { if (e.u === u.id && e.t > Date.now() - 86400000) c++; } return c > 5; }`. Además, escribe un test con Vitest que demuestre que el comportamiento se mantiene (al menos un caso que devuelve `true` y uno que devuelve `false`). Terminado cuando no quedan números mágicos, cada nombre se puede leer en voz alta y explica su intención, y el test pasa antes y después del cambio.

## Explícalo con tus palabras

Explica con un ejemplo de tu vida diaria (no de código) por qué un nombre que miente es más peligroso que un nombre vago.
