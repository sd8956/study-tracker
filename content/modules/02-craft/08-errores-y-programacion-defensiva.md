---
title: Manejo de errores y paranoia pragmática
kind: lesson
hours: 2
sources: Clean Code, cap. 7 Error Handling (pp. 134–143) | The Pragmatic Programmer, temas 23–25 Design by Contract, Dead Programs Tell No Lies, Assertive Programming (pp. 188–211)
---

## Objetivo

Manejar errores sin ensuciar la lógica principal y diseñar código que detecte sus propios problemas: contratos (precondiciones, postcondiciones, invariantes), fallar pronto y aserciones. Al terminar vas a poder decidir en TypeScript cuándo lanzar una excepción, cuándo devolver un `Result`, cuándo usar un caso especial y por qué no debes devolver `null`.

## Estudio

### El error es parte del diseño, no un añadido

Los programas reciben entradas incorrectas, los discos se llenan, las redes se cortan y los servicios externos fallan. El manejo de errores no es opcional. El problema es que, mal hecho, oscurece la lógica: el camino feliz queda enterrado bajo comprobaciones, códigos de retorno y bloques `try` anidados. Martin lo resume: **el manejo de errores es importante, pero si oscurece la lógica, está mal hecho**.

*The Pragmatic Programmer* aporta la actitud complementaria: la **paranoia pragmática**. Nadie escribe código perfecto, ni siquiera tú. Así que diseñas defensivamente: no solo contra los errores de los demás, sino contra los tuyos. El libro compara a un buen programador con un buen conductor: conduce a la defensiva, esperando que los demás cometan errores, y se prepara para ello.

### Usa excepciones en lugar de códigos de retorno

Ya lo viste en la sesión de funciones: los códigos de error obligan al llamador a comprobarlos inmediatamente, lo que mezcla la lógica normal con la de error y es fácil de olvidar. Con excepciones, el código del camino feliz se lee de corrido y el manejo de errores queda separado.

```ts
// Con códigos de retorno: fácil de olvidar comprobar
const handle = getHandle(deviceId);
if (handle !== INVALID) {
  const record = retrieveDeviceRecord(handle);
  if (record.status !== DEVICE_SUSPENDED) {
    pauseDevice(handle);
    clearDeviceWorkQueue(handle);
    closeDevice(handle);
  } else {
    logger.log("Device suspended. Unable to shut down");
  }
} else {
  logger.log(`Invalid handle for: ${deviceId}`);
}

// Con excepciones: dos responsabilidades separadas
function sendShutDown(): void {
  try {
    tryToShutDown();
  } catch (error) {
    logger.log(error);
  }
}

function tryToShutDown(): void {
  const handle = getHandle(DEV1);          // lanza si el handle es inválido
  const record = retrieveDeviceRecord(handle); // lanza si está suspendido
  pauseDevice(handle);
  clearDeviceWorkQueue(handle);
  closeDevice(handle);
}
```

### Escribe primero el try-catch-finally

Martin propone una técnica: cuando escribas código que puede lanzar excepciones, **empieza por el bloque `try/catch/finally`**. El `try` define un ámbito, casi como una transacción: pase lo que pase dentro, el programa debe quedar en un estado consistente al salir. Escribir primero el `try` te obliga a pensar qué espera el llamador cuando algo falla.

Esto encaja muy bien con TDD: escribes primero un test que fuerza la excepción, luego la estructura `try/catch` que lo hace pasar, y después vas añadiendo la lógica dentro del `try` con más tests.

```ts
it("lanza StorageError si el archivo no existe", async () => {
  await expect(sectionStore.retrieve("invalid-file")).rejects.toThrow(StorageError);
});

class SectionStore {
  async retrieve(sectionName: string): Promise<RecordedGrip[]> {
    try {
      const content = await fs.readFile(sectionName, "utf8");
      return parseGrips(content);
    } catch (error) {
      throw new StorageError("retrieval error", { cause: error });
    }
  }
}
```

### Excepciones no comprobadas y contexto

Java tiene excepciones comprobadas (*checked*): el compilador obliga a declararlas en la firma de cada método que las lanza o propaga. Martin argumenta que su precio es alto: si una función de bajo nivel empieza a lanzar una excepción nueva, todas las firmas de la cadena de llamadas cambian, lo que rompe la encapsulación (el principio abierto/cerrado). TypeScript, como C# o Python, no tiene excepciones comprobadas, así que este problema no existe. Pero aparece su contrapartida: **el tipo de la función no dice qué puede fallar**. Por eso, en TypeScript, es importante documentar las excepciones de las APIs públicas o usar tipos de resultado explícitos (lo verás más abajo).

**Proporciona contexto.** Cada excepción debería llevar información suficiente para saber dónde y por qué ocurrió. Un `Error("failed")` es casi inútil. Incluye la operación que falló y el tipo de fallo, y conserva la causa original con `cause`:

```ts
throw new PaymentError(`No se pudo cobrar el pedido ${orderId} (proveedor: ${provider})`, {
  cause: originalError,
});
```

### Define las excepciones según las necesidades del llamador

Hay muchas formas de clasificar errores: por origen (¿vienen de este componente o de otro?), por tipo (¿fallo de red, de programación?). Pero lo más importante al definir clases de excepción es **cómo se van a capturar**. Martin muestra un ejemplo con una librería de terceros que lanza tres excepciones distintas, y el código cliente las captura todas con el mismo manejo:

```ts
// Antes: duplicación por cada tipo de error de la librería
try {
  port.open();
} catch (e) {
  if (e instanceof DeviceResponseException) { reportPortError(e); logger.log("Device response exception", e); }
  else if (e instanceof ATM1212UnlockedException) { reportPortError(e); logger.log("Unlock exception", e); }
  else if (e instanceof GMXError) { reportPortError(e); logger.log("Device response exception", e); }
  else throw e;
}
```

La solución es **envolver** la API de terceros en una clase propia que traduzca sus excepciones a una sola, definida por ti:

```ts
class LocalPort {
  constructor(private readonly innerPort: ACMEPort) {}

  open(): void {
    try {
      this.innerPort.open();
    } catch (error) {
      if (isAcmeError(error)) throw new PortDeviceFailure(error);
      throw error;
    }
  }
}

// El cliente queda simple
try {
  port.open();
} catch (error) {
  if (!(error instanceof PortDeviceFailure)) throw error;
  reportError(error);
  logger.log(error.message, error);
}
```

Envolver APIs de terceros tiene más ventajas: minimizas tu dependencia de ellas (puedes cambiar de librería tocando un solo archivo), puedes simularlas fácilmente en los tests y no quedas atado a las decisiones de diseño de su autor. Lo verás de nuevo en la próxima sesión sobre fronteras.

### Define el flujo normal: el patrón caso especial

A veces una excepción es exagerada para algo que en realidad es un caso normal del negocio. Martin muestra un ejemplo de cálculo de gastos: si el empleado tiene gastos de comida registrados se suman; si no, se suma una dieta por día. El código original lo hace con una excepción:

```ts
// Antes: la excepción se usa para un caso de negocio normal
try {
  const expenses = expenseReportDao.getMeals(employee.id);
  total += expenses.getTotal();
} catch (error) {
  if (error instanceof MealExpensesNotFound) total += getMealPerDiem();
  else throw error;
}
```

La solución es el **patrón Special Case** (caso especial) de Martin Fowler: el DAO siempre devuelve un objeto de gastos; cuando no hay gastos, devuelve un objeto especial que devuelve la dieta por día como total.

```ts
interface MealExpenses {
  getTotal(): number;
}

class PerDiemMealExpenses implements MealExpenses {
  getTotal(): number {
    return DEFAULT_PER_DIEM;
  }
}

// El cliente ya no se entera del caso especial
const expenses = expenseReportDao.getMeals(employee.id);
total += expenses.getTotal();
```

El caso especial encapsula el comportamiento excepcional dentro de un objeto, y el código cliente no necesita manejarlo.

### No devuelvas null

Una de las reglas más prácticas del capítulo. Cada vez que una función devuelve `null`, crea trabajo para quien la llama y una oportunidad de olvidarlo. Basta con una comprobación olvidada para tener un error en tiempo de ejecución. Martin muestra código lleno de `if (x != null)`, y su conclusión es que el problema no son las comprobaciones que faltan, sino que **hay demasiadas**.

Alternativas:

- **Lanzar una excepción** si la ausencia es realmente un error.
- **Devolver un caso especial** si la ausencia tiene un comportamiento por defecto razonable.
- **Devolver una colección vacía** en lugar de `null` cuando la función devuelve listas.

```ts
// Antes
function getEmployees(): Employee[] | null { /* puede devolver null */ }
const employees = getEmployees();
if (employees !== null) {
  for (const e of employees) totalPay += e.getPay();
}

// Después
function getEmployees(): Employee[] { /* devuelve [] si no hay */ }
for (const employee of getEmployees()) totalPay += employee.getPay();
```

En TypeScript con `strict: true`, el compilador te obliga a manejar `null` y `undefined` si aparecen en el tipo. Eso ayuda muchísimo, porque convierte el olvido en un error de compilación. Pero no cambia el consejo de diseño: cuantas menos funciones devuelvan `null`, menos ramas tendrá tu código. Cuando la ausencia es un resultado legítimo (buscar un usuario por id), es razonable devolver `User | undefined` y que el tipo lo haga explícito; lo que hay que evitar es el `null` sorpresa que el tipo no anuncia.

### No pases null

Devolver `null` es malo; pasar `null` como argumento es peor. Si una función recibe `null` en un parámetro que no lo espera, tienes dos opciones malas: añadir comprobaciones en todas partes (ruido) o dejar que falle de forma confusa. En la mayoría de los lenguajes no hay una buena forma de manejar un `null` pasado por accidente, así que la mejor política es **prohibirlo por defecto**. En TypeScript, `strictNullChecks` hace justamente eso: si el parámetro no incluye `null` en su tipo, el compilador no deja pasarlo.

### Alternativa moderna: el tipo Result

En TypeScript (y en lenguajes como Rust o Go), una alternativa a las excepciones para errores **esperados** es devolver un tipo de resultado explícito. No contradice a Martin: la clave es que no termines anidando comprobaciones.

```ts
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

type ParseError = { kind: "empty" } | { kind: "invalid-format"; input: string };

function parseQuantity(input: string): Result<number, ParseError> {
  if (input.trim() === "") return { ok: false, error: { kind: "empty" } };
  const value = Number(input);
  if (!Number.isInteger(value) || value <= 0) {
    return { ok: false, error: { kind: "invalid-format", input } };
  }
  return { ok: true, value };
}

const result = parseQuantity(form.quantity);
if (!result.ok) {
  showError(result.error);
} else {
  addToCart(result.value);
}
```

Una guía práctica para decidir:

| Situación | Herramienta |
| --- | --- |
| Error esperado del dominio que el llamador debe manejar (validación, "no encontrado") | `Result` o tipo con `undefined` explícito |
| Fallo de infraestructura que no se puede resolver aquí (red, disco) | Excepción con contexto, capturada en una frontera |
| Ausencia con comportamiento por defecto razonable | Caso especial o colección vacía |
| Algo que "no puede pasar" (bug de programación) | Aserción que falla de inmediato |

### Diseño por contrato

*The Pragmatic Programmer* introduce el **diseño por contrato** (*Design by Contract*, DBC), una idea de Bertrand Meyer para el lenguaje Eiffel. Un contrato entre una función y quien la llama tiene tres partes:

- **Precondiciones**: lo que debe ser cierto para que se pueda llamar a la función. Es responsabilidad de quien llama cumplirlas. Por ejemplo, `sqrt(x)` requiere `x >= 0`.
- **Postcondiciones**: lo que la función garantiza que será cierto cuando termine. Por ejemplo, una función de ordenamiento garantiza que el resultado está ordenado y tiene los mismos elementos.
- **Invariantes de clase**: condiciones que siempre son ciertas para un objeto desde el punto de vista de quien lo usa. Durante un método pueden romperse temporalmente, pero al salir deben cumplirse. Por ejemplo, "el saldo de una cuenta nunca es negativo".

El contrato se resume así: **si quien llama cumple las precondiciones, la función garantiza las postcondiciones y las invariantes**. Si quien llama no cumple su parte, la función no promete nada (y lo correcto es que falle de forma ruidosa). El libro aconseja ser **estricto en lo que aceptas y prometer lo mínimo posible en lo que devuelves**. (Ojo: esto es casi lo contrario del famoso principio de robustez de "ser liberal en lo que aceptas", y el libro lo plantea a propósito: cuanto más claro el contrato, menos sorpresas.)

TypeScript no tiene contratos nativos, pero los tipos expresan una parte enorme de ellos (un parámetro `PositiveInteger` es una precondición) y el resto se puede comprobar en tiempo de ejecución:

```ts
class BankAccount {
  #balance = 0;

  withdraw(amount: number): void {
    // Precondiciones
    assert(Number.isFinite(amount) && amount > 0, "amount debe ser positivo");
    assert(amount <= this.#balance, "fondos insuficientes");

    const before = this.#balance;
    this.#balance -= amount;

    // Postcondición e invariante
    assert(this.#balance === before - amount, "el saldo se descontó mal");
    assert(this.#balance >= 0, "invariante: saldo no negativo");
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new ContractViolation(message);
}
```

La firma `asserts condition` hace que TypeScript estreche los tipos después de la llamada, lo que convierte la aserción también en una ayuda para el compilador.

Un matiz importante: "fondos insuficientes" es una regla de negocio que los usuarios pueden provocar, así que en un sistema real probablemente sería un error de dominio (un `Result` o una excepción de dominio), no una violación de contrato. Las precondiciones de contrato son para condiciones que un llamador correcto **nunca** violaría.

Otra relación interesante que señala el libro: **DBC y TDD se complementan**. Los tests comprueban casos concretos que elegiste; los contratos comprueban las condiciones en todas las ejecuciones, incluidas las que no imaginaste.

### Los programas muertos no mienten

El segundo tema pragmático es contundente: **falla pronto** (*crash early*). Cuando tu código descubre que algo que "no podía pasar" ha pasado, lo mejor que puede hacer casi siempre es detenerse. Un programa muerto normalmente hace mucho menos daño que uno herido que sigue funcionando: un programa que continúa con datos corruptos puede escribir esos datos en la base de datos, enviarlos a otros sistemas o cobrar a un cliente dos veces.

El libro critica un patrón muy común: capturar todas las excepciones y seguir como si nada.

```ts
// Antipatrón: tragarse los errores
try {
  await chargeCustomer(order);
} catch (error) {
  console.log("error"); // y seguimos
}
markOrderAsPaid(order); // ¡se marca como pagado aunque el cobro falló!
```

Si no puedes manejar la excepción de forma significativa en ese punto, déjala propagarse. Capturar solo para registrar y volver a lanzar (`catch (e) { log(e); throw e; }`) añade ruido y a menudo duplica los registros. El libro recuerda la filosofía de Erlang y Elixir: "deja que falle" (*let it crash*), con supervisores que reinician los procesos caídos. En Node.js, un proceso que encuentra un estado imposible puede terminar y dejar que el orquestador (systemd, Kubernetes, PM2) lo reinicie limpio.

### Programación asertiva

El tercer tema completa la idea: **usa aserciones para prevenir lo imposible**. Cada vez que pienses "esto no puede pasar nunca", añade código que lo compruebe. Ejemplos: "esta lista nunca está vacía aquí", "este switch cubre todos los casos", "el usuario siempre está autenticado en este punto".

Reglas que da el libro:

- **No uses aserciones en lugar del manejo de errores real.** Una aserción es para condiciones que nunca deberían ocurrir si el programa es correcto. Si el usuario puede escribir un correo inválido, eso no es imposible: es validación.
- **Las aserciones no deben tener efectos secundarios.** Si la expresión dentro de la aserción cambia el estado (`assert(queue.pop() !== undefined)`), el programa se comporta distinto según si las aserciones están activas.
- **Deja las aserciones activadas en producción.** Existe la idea de que las aserciones son para desarrollo y se desactivan en producción por rendimiento. El libro lo discute: los tests no encuentran todos los bugs y producción es justamente donde aparecen las condiciones que nunca probaste. Desactiva solo las aserciones que hayas medido como costosas.

En TypeScript, la comprobación exhaustiva con `never` es una aserción que el compilador verifica en tiempo de compilación, y una función `assert` con `asserts condition` cubre el tiempo de ejecución.

### Juntando todo: un ejemplo realista

```ts
// Antes
async function transfer(fromId: string, toId: string, amount: any) {
  const from = await accounts.find(fromId);
  const to = await accounts.find(toId);
  if (from == null || to == null) return null;
  if (from.balance < amount) return -1;
  try {
    from.balance -= amount;
    to.balance += amount;
    await accounts.save(from);
    await accounts.save(to);
  } catch (e) {}
  return 0;
}
```

Problemas: `any` en el importe, `null` y códigos mágicos (`-1`, `0`) como resultado, ninguna validación de que el importe sea positivo, errores tragados (si falla el segundo `save` queda dinero creado o destruido) y lógica de negocio fuera del objeto cuenta.

```ts
type TransferError =
  | { kind: "account-not-found"; accountId: string }
  | { kind: "insufficient-funds"; available: number };

async function transfer(
  fromId: string,
  toId: string,
  amount: PositiveAmount,
): Promise<Result<void, TransferError>> {
  const from = await accounts.findById(fromId);
  if (!from) return { ok: false, error: { kind: "account-not-found", accountId: fromId } };
  const to = await accounts.findById(toId);
  if (!to) return { ok: false, error: { kind: "account-not-found", accountId: toId } };

  if (!from.canWithdraw(amount)) {
    return { ok: false, error: { kind: "insufficient-funds", available: from.balance } };
  }

  // Si la transacción falla, la excepción se propaga: no fingimos que todo fue bien.
  await accounts.inTransaction(async (tx) => {
    from.withdraw(amount); // mantiene la invariante de saldo no negativo
    to.deposit(amount);
    await tx.saveAll([from, to]);
  });
  return { ok: true, value: undefined };
}
```

Los errores esperados del dominio son parte del tipo; los fallos de infraestructura se propagan; el estado inconsistente se evita con una transacción; y las invariantes viven en la cuenta.

### Errores comunes

- **Tragarse excepciones** con `catch {}` o un `console.log` y seguir.
- **Usar excepciones para el flujo normal del negocio** cuando un caso especial o un `Result` es más claro.
- **Devolver `null` sin que el tipo lo anuncie**, o devolver `null` en lugar de una lista vacía.
- **Mensajes de error sin contexto**: "error", "failed", "algo salió mal".
- **Aserciones con efectos secundarios** o usadas para validar datos de usuario.
- **Dejar que un programa con estado corrupto siga funcionando.**

## Conceptos clave

- **Paranoia pragmática**: diseñar asumiendo que tú y los demás cometerán errores.
- **Special Case**: objeto que encapsula el comportamiento de un caso excepcional para que el cliente no lo maneje.
- **Envolver excepciones de terceros**: traducir los errores de una librería a una excepción propia definida por las necesidades del llamador.
- **Precondición / postcondición / invariante**: lo que el llamador debe garantizar, lo que la función promete al terminar y lo que siempre es cierto para un objeto.
- **Crash early**: detenerse en cuanto se detecta un estado imposible, en lugar de seguir con datos corruptos.
- **Aserción**: comprobación de una condición que "no puede pasar", activa también en producción.
- **Result**: tipo que representa explícitamente éxito o error esperado, en lugar de lanzar una excepción.

## Preguntas de repaso

1. ¿Por qué Martin recomienda escribir primero el bloque try-catch-finally?
   R: Porque el try define un ámbito parecido a una transacción y escribirlo primero obliga a pensar qué estado consistente debe quedar y qué espera el llamador si algo falla. Encaja con TDD: un test que fuerza la excepción guía la estructura.
2. ¿Qué es el patrón Special Case y cuándo conviene más que una excepción?
   R: Es devolver un objeto que encapsula el comportamiento del caso especial (por ejemplo, gastos de comida que devuelven la dieta por día cuando no hay registros). Conviene cuando la "ausencia" o el caso raro es parte normal del negocio y tiene un comportamiento por defecto razonable, para que el cliente no tenga que manejarlo.
3. Da tres alternativas a devolver null y di cuándo usar cada una.
   R: Lanzar una excepción cuando la ausencia es un error real; devolver un caso especial cuando hay un comportamiento por defecto; devolver una colección vacía cuando la función devuelve listas. En TypeScript, si la ausencia es legítima, devolver `T | undefined` explícito en el tipo.
4. Explica precondición, postcondición e invariante con el ejemplo de una cuenta bancaria.
   R: Precondición de `withdraw`: el importe es positivo (lo garantiza quien llama). Postcondición: el saldo final es el inicial menos el importe (lo garantiza la función). Invariante: el saldo nunca es negativo para quien observa la cuenta desde fuera.
5. ¿Qué significa "los programas muertos no mienten" y qué antipatrón critica?
   R: Que, ante un estado imposible, es mejor detener el programa que seguir funcionando con datos corruptos que pueden causar más daño. Critica capturar excepciones y seguir como si nada, por ejemplo marcar un pedido como pagado tras un cobro que falló.
6. ¿Por qué el libro recomienda dejar las aserciones activas en producción y qué no debes hacer con ellas?
   R: Porque los tests no cubren todo y producción es donde aparecen las condiciones no previstas; solo deberían desactivarse las medidas como costosas. No deben tener efectos secundarios ni sustituir la validación de errores esperables como la entrada del usuario.

## Ejercicio

Implementa en TypeScript un módulo `inventory.ts` con `reserveStock(productId, quantity)`. Requisitos: devuelve un `Result` con errores tipados para "producto no encontrado" y "stock insuficiente"; lanza una excepción propia con contexto y `cause` si falla el repositorio; usa una función `assert` con `asserts condition` para la precondición de que `quantity` es un entero positivo y para la invariante de que el stock nunca queda negativo; y nunca devuelve `null`. Escribe tests con Vitest para: reserva correcta, producto inexistente, stock insuficiente, cantidad inválida (debe fallar la aserción) y fallo del repositorio (debe propagarse la excepción con `cause`). Terminado cuando los cinco tests pasan y `tsc --strict` no da errores.

## Explícalo con tus palabras

Explica a alguien por qué un programa que se cae de inmediato ante un estado imposible es más seguro que uno que "sigue funcionando", usando como ejemplo un cajero automático.
