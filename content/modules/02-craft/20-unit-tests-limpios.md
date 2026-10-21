---
title: Unit tests limpios y mantenibles
kind: lesson
hours: 2
sources: Clean Code, cap. 9 Unit Tests (pp. 152–164) | Software Engineering at Google, cap. 12 Unit Testing (pp. 267–294)
---

## Objetivo

Escribir tests unitarios que sigan siendo útiles durante años: legibles, enfocados en comportamientos, a través de la API pública, sin lógica, con buenos nombres y mensajes de fallo, siguiendo F.I.R.S.T. y DAMP en lugar de DRY. Al terminar vas a poder reescribir un test frágil y críptico de Vitest para que sea robusto y se explique solo.

## Estudio

### Los tests sucios son peores que no tener tests

Martin cuenta la historia de un equipo que decidió que los tests no necesitaban la misma calidad que el código de producción: "son rápidos y sucios, solo tienen que funcionar". Al principio todo iba bien. Pero cada cambio en el código de producción rompía algunos tests, y los tests sucios eran tan difíciles de entender que arreglarlos llevaba cada vez más tiempo. Con el tiempo, los tests se convirtieron en el principal obstáculo para cambiar el código. El equipo terminó **descartando la suite entera**. Sin tests, el código empezó a pudrirse, porque nadie se atrevía a limpiarlo. El equipo concluyó que los tests no habían servido para nada.

La conclusión de Martin es la contraria: **el código de los tests es tan importante como el de producción**. No es un ciudadano de segunda: requiere pensamiento, diseño y cuidado. Y el motivo es potente: son los tests los que hacen posible las "-ilidades" (flexibilidad, mantenibilidad, reutilización). Sin tests, cada cambio es un posible bug, y por eso el código no se cambia y se degrada.

*Software Engineering at Google* llega a la misma conclusión desde la escala: una suite de tests es un activo solo si es **mantenible**. Los tests que hay que tocar con cada cambio, o que nadie entiende cuando fallan, se convierten en un costo.

### Las tres leyes de TDD

Martin presenta TDD con tres "leyes":

1. No puedes escribir código de producción hasta haber escrito un test unitario que falle.
2. No puedes escribir más de un test unitario del que sea suficiente para fallar (y no compilar es fallar).
3. No puedes escribir más código de producción del que sea suficiente para pasar el test que está fallando.

Estas leyes te encierran en un ciclo de unos treinta segundos: test y código avanzan juntos. Si trabajas así todo el día, al final tendrás muchísimos tests, tantos como código de producción. Por eso es tan importante que sean limpios.

### ¿Qué hace que un test sea limpio? Legibilidad

Para Martin, la cualidad más importante de un test es la **legibilidad**, más incluso que en el código de producción. Y la legibilidad se consigue con lo mismo de siempre: claridad, simplicidad y densidad de expresión. Un test debe decir mucho con pocas palabras.

Muchos tests siguen el patrón **construir-operar-comprobar** (*build-operate-check*), conocido también como **Arrange-Act-Assert** o **Given-When-Then**:

```ts
// Test difícil de leer: detalles mezclados, sin estructura
it("test1", () => {
  const s = new Scheduler(new Map([["mon", 2], ["tue", 2], ["wed", 2], ["thu", 2], ["fri", 2], ["sat", 3]]));
  const r = s.plan([{ k: "a", h: 2 }, { k: "b", h: 3 }, { k: "c", h: 2 }], new Date(2026, 9, 23));
  expect(r[0].d.getDate()).toBe(23);
  expect(r[1].d.getDate()).toBe(24);
  expect(r[2].d.getDate()).toBe(26);
});
```

```ts
// Test limpio: estructura evidente, lenguaje del dominio
it("salta el domingo al planificar sesiones", () => {
  // Given
  const scheduler = schedulerWithDefaultWeek();
  const sessions = [lesson("a"), project("b"), lesson("c")];

  // When
  const plan = scheduler.plan(sessions, friday("2026-10-23"));

  // Then
  expect(datesOf(plan)).toEqual(["2026-10-23", "2026-10-24", "2026-10-26"]);
});
```

La segunda versión usa funciones auxiliares (`schedulerWithDefaultWeek`, `lesson`, `friday`, `datesOf`) que forman un pequeño **lenguaje de testing específico del dominio**. Martin describe esta técnica: en lugar de usar directamente las APIs del sistema, construyes un conjunto de funciones que hacen los tests más fáciles de escribir y leer. Ese lenguaje no se diseña de antemano: emerge al refactorizar tests repetitivos.

### Un estándar dual

El código de los tests debe ser limpio, pero no tiene por qué ser tan **eficiente** como el de producción. Corre en un entorno de pruebas, no en producción. Martin muestra un ejemplo en el que, para comprobar el estado de un sistema de alarmas, construye un string con letras mayúsculas y minúsculas (`"HBchL"`, una letra por cada indicador: mayúscula si está encendido, minúscula si está apagado). No es la forma más eficiente, pero hace el test muchísimo más legible.

```ts
// Una letra por indicador: mayúscula = encendido
it("enciende la calefacción y el ventilador cuando hace demasiado frío", () => {
  tooCold();
  expect(controller.state()).toBe("HBchl");
});
```

### ¿Una aserción por test?

Hay una escuela que dice que cada test debe tener una sola aserción. Tiene la ventaja de que cada test llega a una sola conclusión, fácil de entender. Martin opina que es una buena guía pero no una regla absoluta. Lo que sí propone como regla es **un solo concepto por test**: no mezcles en un test comprobaciones de comportamientos distintos.

```ts
// Varios conceptos en un test: si falla, ¿qué se rompió?
it("fechas", () => {
  expect(addMonths(may31, 1)).toEqual(june30);
  expect(addMonths(may31, 2)).toEqual(july31);
  expect(addMonths(june30, 1)).toEqual(july30);
});

// Un concepto por test
it("ajusta al último día del mes si el día no existe en el mes destino", () => {
  expect(addMonths(may31, 1)).toEqual(june30);
});

it("conserva el día cuando existe en el mes destino", () => {
  expect(addMonths(may31, 2)).toEqual(july31);
});
```

### F.I.R.S.T.

Los tests limpios siguen cinco reglas, que forman el acrónimo F.I.R.S.T.:

| Letra | Regla | Por qué |
| --- | --- | --- |
| **F**ast | Rápidos | Si son lentos, no los ejecutarás a menudo, y no detectarás problemas pronto |
| **I**ndependent | Independientes | Un test no debe preparar condiciones para otro; deben poder correr en cualquier orden |
| **R**epeatable | Repetibles | Deben dar el mismo resultado en cualquier entorno: tu portátil, CI, sin red |
| **S**elf-validating | Autovalidables | Pasan o fallan; no tienes que leer un log ni comparar archivos a mano |
| **T**imely | Oportunos | Se escriben justo antes que el código que prueban; después, el código suele salir difícil de probar |

### Prevenir tests frágiles: tests que no cambian

Pasamos al capítulo 12 de Google. Un **test frágil** (*brittle*) es el que falla ante un cambio que no introdujo ningún bug: un refactor, un cambio de nombre interno, una reorganización. Los tests frágiles son una de las mayores fuentes de costo a escala.

Google define el ideal: **un test que no cambia**. Una vez escrito, solo debería tener que cambiar si cambian los requisitos del sistema. Analizan los tipos de cambio en el código de producción:

| Tipo de cambio | ¿Deberían cambiar los tests existentes? |
| --- | --- |
| Refactor puro (cambia la estructura interna, no el comportamiento) | No |
| Nueva funcionalidad | No (se añaden tests nuevos) |
| Corrección de bug | No (se añade un test que faltaba) |
| Cambio de comportamiento | Sí: son los únicos casos legítimos |

Si tus tests cambian en los tres primeros casos, están probando detalles de implementación.

### Prueba a través de la API pública

La primera técnica para tener tests que no cambian es **probar a través de las APIs públicas**, igual que lo harían los usuarios del código. No pruebes métodos privados ni accedas al estado interno.

```ts
// Frágil: accede a detalles internos
it("guarda la transacción", () => {
  const processor = new TransactionProcessor();
  processor.process(new Transaction(100, "USD"));
  expect((processor as any).cache.size).toBe(1); // ¿y si cambia la caché?
});

// Robusto: comprueba el comportamiento visible
it("rechaza una transacción duplicada", () => {
  const processor = new TransactionProcessor();
  const transaction = new Transaction(100, "USD", "tx-1");
  processor.process(transaction);
  expect(() => processor.process(transaction)).toThrow(DuplicateTransaction);
});
```

¿Qué es "público"? Depende del nivel: para una clase, sus métodos públicos; para un módulo, lo que exporta; para un servicio, su API. Una buena regla: prueba la unidad al nivel en que la usarán sus clientes reales.

### Prueba el estado, no las interacciones

La segunda técnica: **comprueba el resultado (el estado), no la secuencia de llamadas** que el código hizo para llegar a él. Comprobar que se llamó a `repository.save` con ciertos argumentos ata el test a la implementación; comprobar que después de la operación el usuario existe en el repositorio no. Verás esto en detalle en la sesión de test doubles.

### Escribir tests claros

**Tests completos y concisos.** Un test es *completo* si su cuerpo contiene toda la información necesaria para entender cómo llega al resultado, y *conciso* si no tiene información irrelevante. Los valores que importan al test deben verse en el test, no esconderse en un `beforeEach` lejano.

```ts
// Incompleto: ¿por qué el total es 105? El dato clave está escondido
it("calcula el total con impuestos", () => {
  expect(calculator.totalFor(defaultOrder)).toBe(105);
});

// Completo y conciso: solo lo relevante, todo visible
it("suma el 5 % de impuesto al subtotal", () => {
  const calculator = new Calculator({ taxRate: 0.05 });
  const order = orderWithSubtotal(100);
  expect(calculator.totalFor(order)).toBe(105);
});
```

**Prueba comportamientos, no métodos.** La tentación es escribir un test por método (`testProcess`, `testValidate`). Pero un método suele tener varios comportamientos, y un comportamiento puede involucrar varios métodos. Escribe un test por comportamiento: "muestra el nombre del comprador", "rechaza importes negativos", "aplica el descuento a clientes recurrentes".

**Estructura los tests para resaltar el comportamiento.** Usa given/when/then (con comentarios o líneas en blanco). Si un test necesita varios pasos, alterna when/then de forma explícita.

**Nombra los tests según el comportamiento.** El nombre debe resumir la acción y el resultado esperado. Un buen ejercicio: ¿podría alguien entender qué hace el sistema leyendo solo los nombres de los tests?

```ts
describe("BankAccount", () => {
  it("permite retirar si hay saldo suficiente", () => { /* ... */ });
  it("rechaza retiros que dejarían el saldo negativo", () => { /* ... */ });
  it("registra cada retiro en el historial", () => { /* ... */ });
});
```

**No pongas lógica en los tests.** Ni bucles, ni condicionales, ni concatenaciones complejas. La lógica en los tests puede tener bugs, y nadie prueba los tests. Google muestra un ejemplo con una URL construida concatenando strings en el test: el test reproducía el mismo bug que el código. Escribe los valores esperados literalmente:

```ts
// Lógica en el test: reproduce el bug de la doble barra
const baseUrl = "http://photos.google.com/";
expect(navigator.currentUrl()).toBe(baseUrl + "/albums");

// Literal: el bug salta a la vista
expect(navigator.currentUrl()).toBe("http://photos.google.com/albums");
```

**Escribe mensajes de fallo claros.** Un buen mensaje dice qué se esperaba, qué se obtuvo y, si es posible, el contexto. Con Vitest, usar el matcher adecuado ayuda: `expect(list).toContain(item)` produce un mensaje mucho mejor que `expect(list.includes(item)).toBe(true)`.

### DAMP, no DRY

En el código de producción buscamos DRY. En los tests, Google propone **DAMP**: *Descriptive And Meaningful Phrases* (frases descriptivas y con significado). Un poco de duplicación en los tests es aceptable si hace que cada test sea más fácil de entender por sí solo.

¿Por qué? Porque cuando un test falla, quien lo lee quiere entenderlo de un vistazo, sin saltar por cinco funciones auxiliares, una jerarquía de `beforeEach` y constantes compartidas. Un test excesivamente "DRY" obliga a reconstruir mentalmente todo el contexto.

Pautas de Google para compartir código en tests:

- **Valores compartidos**: evita constantes globales como `ACCOUNT_1`, `ACCOUNT_2` usadas por todos los tests sin que se sepa por qué. Prefiere **funciones auxiliares que construyen valores con parámetros por defecto razonables**, donde cada test especifica solo lo que le importa.

```ts
function newAccount(overrides: Partial<AccountProps> = {}): Account {
  return new Account({ owner: "Ana", balance: 0, status: "active", ...overrides });
}

it("no permite retirar de una cuenta bloqueada", () => {
  const account = newAccount({ status: "blocked", balance: 100 }); // lo relevante, visible
  expect(() => account.withdraw(10)).toThrow(AccountBlocked);
});
```

- **Setup compartido**: los `beforeEach` están bien para inicializar el objeto bajo prueba y sus dependencias, pero si un test depende de un valor concreto, que ese valor esté en el test.
- **Ayudantes y validación compartidos**: un ayudante que construye datos está bien; un ayudante que hace "todas las aserciones" (`assertUserIsValid(user)`) suele esconder qué comprueba cada test. Prefiere ayudantes de validación con un propósito concreto ("comprueba que esta lista está ordenada").

### Ejemplo integrado: reescribir un test frágil

```ts
// Antes
describe("Cart", () => {
  let c: any;
  beforeEach(() => {
    c = new Cart();
    c.add({ id: 1, price: 10, qty: 2 });
    c.add({ id: 2, price: 5, qty: 1 });
  });
  it("works", () => {
    c.applyCoupon("X");
    expect(c.items.length).toBe(2);
    expect(c._discount).toBe(0.1);
    let total = 0;
    for (const i of c.items) total += i.price * i.qty;
    expect(c.total()).toBe(total * 0.9);
  });
});
```

Problemas: nombre inútil (`works`), varios conceptos, acceso a estado interno (`_discount`, `items`), lógica en el test (el bucle), datos importantes escondidos en el `beforeEach` y `any`.

```ts
// Después
describe("Cart", () => {
  it("aplica un 10 % de descuento con el cupón X", () => {
    const cart = cartWith([item({ price: 10, quantity: 2 }), item({ price: 5, quantity: 1 })]);

    cart.applyCoupon("X");

    expect(cart.total()).toBe(22.5); // (10·2 + 5·1) · 0.9
  });

  it("ignora cupones desconocidos", () => {
    const cart = cartWith([item({ price: 10, quantity: 1 })]);

    cart.applyCoupon("NO-EXISTE");

    expect(cart.total()).toBe(10);
  });
});
```

Ahora cada test tiene un comportamiento, un nombre que lo describe, datos visibles, ninguna lógica y solo usa la API pública. Si mañana cambia cómo se guarda el descuento internamente, estos tests no se enteran.

### Tests parametrizados: varios casos, un solo concepto

A veces un mismo comportamiento se verifica con varios ejemplos (por ejemplo, las reglas de validación de una contraseña). Escribir diez tests casi idénticos es tedioso; meter un bucle en un test viola la regla de "sin lógica". Vitest ofrece una tercera vía: **tests parametrizados** con `it.each`, que generan un test por fila, cada uno con su propio nombre y su propio resultado:

```ts
describe("isStrongPassword", () => {
  it.each([
    { password: "abc", expected: false, reason: "menos de 8 caracteres" },
    { password: "abcdefgh", expected: false, reason: "sin números" },
    { password: "abcdefg1", expected: false, reason: "sin mayúsculas" },
    { password: "Abcdefg1", expected: true, reason: "cumple todas las reglas" },
  ])("devuelve $expected cuando la contraseña tiene $reason", ({ password, expected }) => {
    expect(isStrongPassword(password)).toBe(expected);
  });
});
```

Cada fila es un caso con nombre propio en el informe, la tabla se lee como una especificación y no hay lógica en el cuerpo del test. Úsalo cuando los casos comparten exactamente el mismo comportamiento y solo cambian los datos. Si los casos necesitan preparaciones distintas, son comportamientos distintos y merecen tests separados.

### Una checklist para revisar tus tests

Antes de dar por terminado un test, recorre estas preguntas:

1. ¿El nombre describe un comportamiento, de modo que se entiende sin leer el cuerpo?
2. ¿Se ven las tres partes (given, when, then)?
3. ¿Todos los datos relevantes para el resultado están dentro del test?
4. ¿Usa solo la API pública?
5. ¿Está libre de bucles, condicionales y cálculos del valor esperado?
6. ¿Comprueba un solo concepto?
7. ¿Fallaría si el comportamiento se rompe? (Pruébalo: rompe el código a propósito y mira el mensaje.)
8. ¿Seguiría pasando si refactorizas la implementación sin cambiar el comportamiento?

La pregunta 7 es especialmente valiosa: un test que nunca has visto fallar puede no estar probando nada.

### Errores comunes

- **Tratar el código de test como de segunda categoría.**
- **Un test por método** en lugar de uno por comportamiento.
- **Acceder a miembros privados** con `as any` para comprobar estado interno.
- **Bucles y condicionales en los tests.**
- **`beforeEach` gigantes** que esconden los datos relevantes.
- **Nombres como `test1`, `works`, `should work`.**
- **Tests que dependen del orden de ejecución.**

## Conceptos clave

- **Tres leyes de TDD**: no escribir código sin un test que falle, solo el test justo para fallar y solo el código justo para pasar.
- **Build-operate-check / Given-When-Then**: estructura de un test en preparación, acción y comprobación.
- **Lenguaje de testing del dominio**: funciones auxiliares que hacen los tests legibles en términos del negocio.
- **Un concepto por test**: cada test verifica un solo comportamiento.
- **F.I.R.S.T.**: rápidos, independientes, repetibles, autovalidables y oportunos.
- **Test frágil**: test que falla ante cambios que no introducen bugs (refactors, cambios internos).
- **DAMP**: en los tests se prefieren frases descriptivas aunque haya algo de duplicación.

## Preguntas de repaso

1. ¿Por qué, según Martin, los tests sucios pueden ser peores que no tener tests?
   R: Porque se vuelven cada vez más difíciles de mantener; cada cambio de producción rompe tests que nadie entiende, hasta que el equipo los descarta. Sin tests, nadie se atreve a limpiar el código y este se degrada. Los tests deben ser tan cuidados como el código de producción.
2. Explica F.I.R.S.T.
   R: Fast: rápidos para ejecutarlos a menudo. Independent: no dependen unos de otros ni del orden. Repeatable: mismo resultado en cualquier entorno. Self-validating: pasan o fallan sin interpretación manual. Timely: se escriben justo antes que el código de producción.
3. ¿Qué es un test frágil y qué cambios de código deberían obligar a modificar tests existentes?
   R: Es un test que falla ante un cambio que no introduce ningún bug. Solo los cambios de comportamiento deberían obligar a modificar tests existentes; refactors, funcionalidades nuevas y correcciones de bugs no deberían (como mucho, añaden tests nuevos).
4. ¿Por qué no se debe poner lógica (bucles, condicionales, concatenaciones) en los tests?
   R: Porque la lógica puede tener bugs y nadie prueba los tests; además, puede reproducir el mismo error que el código bajo prueba, como al construir una URL concatenando strings. Los valores esperados deben escribirse de forma literal y evidente.
5. ¿Qué significa DAMP y por qué es preferible a DRY en los tests?
   R: Descriptive And Meaningful Phrases: tests descriptivos aunque repitan algo. Es preferible porque al leer un test que falla hay que entenderlo de un vistazo, sin reconstruir contexto repartido en ayudantes, constantes globales y setups. Se comparten constructores de datos con valores por defecto, pero lo relevante para cada test se ve en el test.
6. ¿Qué significa que un test sea "completo y conciso"?
   R: Completo: contiene toda la información necesaria para entender cómo llega al resultado, sin datos clave escondidos. Conciso: no contiene información irrelevante ni distracciones. Ambos juntos hacen que el test se entienda solo.

## Ejercicio

Escribe con TDD estricto (las tres leyes) una clase `StudyStreak` que calcule la racha de días de estudio consecutivos a partir de una lista de fechas completadas, sabiendo que los domingos no rompen la racha. Requisitos de los tests: al menos ocho tests, uno por comportamiento, con nombres que describan el comportamiento, estructura given/when/then visible, una función auxiliar `day("2026-10-20")` como lenguaje de dominio, sin bucles ni condicionales en los tests y solo a través de la API pública. Haz un commit por cada ciclo rojo-verde-refactor. Terminado cuando leyendo solo los nombres de los tests (`npx vitest run --reporter=verbose`) se entiende la regla completa de la racha y el historial muestra al menos ocho ciclos.

## Explícalo con tus palabras

Explica a alguien por qué en el código de producción odiamos la duplicación pero en los tests a veces la preferimos.
