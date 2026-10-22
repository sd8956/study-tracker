---
title: Por qué testear y cómo escribir unit tests limpios
kind: lesson
hours: 3
sources: Software Engineering at Google, cap. 11 Testing Overview (pp. 240–266) y cap. 12 Unit Testing (pp. 267–294) | Clean Code, cap. 9 Unit Tests (pp. 152–164) | The Pragmatic Programmer, tema 41 Test to Code (pp. 361–374)
---

## Objetivo

Entender para qué sirven los tests (cambiar el código rápido y con confianza, y diseñar mejor), clasificarlos por tamaño y alcance como hace Google, reconocer la pirámide y sus antipatrones, y escribir unit tests que sigan siendo útiles durante años: legibles, enfocados en comportamientos, a través de la API pública, sin lógica, F.I.R.S.T. y DAMP. Al terminar vas a poder diseñar la estrategia de pruebas de un proyecto TypeScript pequeño y reescribir un test frágil de Vitest para que se explique solo.

## Estudio

### Por qué testear: la historia del Google Web Server

A mediados de los 2000, el servidor que atiende las búsquedas de Google tenía despliegues lentos y peligrosos: en algún momento, más del 80 % de las subidas a producción llevaban bugs que afectaban a los usuarios. El líder técnico impuso una política simple: **todo cambio viene con tests automatizados**. En un año, los despliegues de emergencia se redujeron a la mitad, aunque había más cambios que nunca.

La lección: **no puedes confiar en que la gente evite los bugs por pura habilidad**. Con suficientes personas y cambios, los bugs se acumulan más rápido de lo que se descubren. Y el beneficio principal de los tests no es encontrar bugs, sino **poder cambiar el código con confianza y rapidez**: menos depuración, refactors seguros, ejemplos de uso que no se desactualizan, revisiones más simples y entregas frecuentes.

*The Pragmatic Programmer* va más lejos en "Test to Code": el mayor beneficio aparece cuando **piensas** en el test, no cuando lo ejecutas. Pensar en cómo probarías una función te obliga a definir su interfaz y sus dependencias. El test es el primer cliente de tu código.

```ts
// Difícil de probar: mezcla I/O y cálculo
async function averageStudyHours(userId: string): Promise<number> {
  const rows = await db.query("SELECT hours FROM sessions WHERE user_id = ?", [userId]);
  const total = rows.reduce((sum, row) => sum + row.hours, 0);
  return rows.length === 0 ? 0 : total / rows.length;
}

// Fácil de probar: el cálculo es una función pura y el I/O queda fuera
export function average(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export async function averageStudyHours(sessions: SessionRepository, userId: string): Promise<number> {
  return average(await sessions.hoursFor(userId));
}
```

Pensar en el test reveló que la función hacía dos cosas y mejoró el diseño antes de escribir una línea de test.

### TDD: el ciclo y sus tres leyes

El ciclo de **TDD** es **rojo → verde → refactor**: escribes un test pequeño que falla, el mínimo código que lo hace pasar y luego limpias código y test sin cambiar el comportamiento. Martin lo formula con tres leyes:

1. No escribes código de producción sin un test que falle.
2. No escribes más test del suficiente para fallar (no compilar es fallar).
3. No escribes más código del suficiente para pasar el test que falla.

El resultado es un ciclo de segundos o minutos en el que test y código avanzan juntos, y al final tienes tantos tests como código. Los pragmáticos añaden una advertencia: no seas esclavo de TDD (perseguir el 100 % de cobertura, tests redundantes, diseñar siempre de abajo arriba sin rumbo). Construye **de extremo a extremo** en rebanadas pequeñas que atraviesan todas las capas, y deja que los tests te den feedback en cada paso. Lo practicarás a fondo en las sesiones 23 y 24.

### Tamaño y alcance: dos dimensiones distintas

Google clasifica cada test en dos dimensiones independientes. El **tamaño** son los **recursos** que necesita:

| Tamaño | Restricciones | Ejemplo en TypeScript |
| --- | --- | --- |
| **Pequeño** | Un proceso; sin red, sin disco, sin `sleep` | Función pura o clase con dobles en memoria |
| **Mediano** | Una máquina; `localhost`, base de datos local | Repositorio contra SQLite en un archivo temporal |
| **Grande** | Varias máquinas, sin restricciones | Extremo a extremo contra un entorno desplegado |

¿Por qué recursos y no "unitario o de integración"? Porque las restricciones determinan las dos propiedades que más importan: **velocidad y determinismo**. Un test pequeño no puede ser lento por la red ni fallar porque otro proceso ocupó un puerto. Por eso Google prefiere tests pequeños, sea cual sea el alcance.

El **alcance** es cuánto código se **valida**: estrecho (una función o clase), medio (unos pocos componentes, como un servicio y su base de datos) o amplio (comportamientos completos del sistema). Son dimensiones distintas: el flujo completo de un endpoint con todas sus dependencias sustituidas por fakes en memoria es de **alcance amplio y tamaño pequeño**.

### La pirámide, sus antipatrones y los tests inestables

Como guía, Google apunta a unos **80 % de tests estrechos, 15 % de alcance medio y 5 % de extremo a extremo**:

```
            /\
           /E2E\          ~5 %   lentos, caros, frágiles, mucha confianza
          /------\
         /  Integ. \     ~15 %
        /------------\
       /   Unitarios   \  ~80 %  rápidos, baratos, precisos
      /__________________\
```

Dos antipatrones: el **cono de helado** (muchos tests manuales y de extremo a extremo, casi ningún unitario; suite lenta, inestable y difícil de diagnosticar) y el **reloj de arena** (muchos unitarios y muchos de extremo a extremo, pocos de integración, normalmente por un acoplamiento que impide probar componentes parcialmente aislados). Para salir del cono no hace falta reescribir: reproduce cada bug nuevo con el test más pequeño posible, extrae lógica pura cada vez que tocas un módulo y retira los tests de extremo a extremo que ya quedaron cubiertos.

Un test **flaky** a veces pasa y a veces falla sin que cambie el código. Con 10,000 tests diarios y un 0.1 % de falsos fallos por test, investigas unos diez fallos falsos al día. Pero el daño real es la **pérdida de confianza**: cuando la inestabilidad se acerca al 1 %, los equipos reejecutan "hasta que pase" y dejan de mirar los fallos reales.

| Causa de inestabilidad | Remedio en TypeScript |
| --- | --- |
| Reloj real, zonas horarias | Reloj inyectado; `vi.useFakeTimers()` y `vi.setSystemTime()` |
| Estado compartido entre tests | Estado fresco en cada test, sin globales mutables |
| `setTimeout` arbitrarios | Esperar condiciones explícitas o temporizadores falsos |
| Red y servicios externos | Dobles en memoria (sesión 21) |
| Aleatoriedad sin semilla | Generadores con semilla fija o inyectada |

Dos ideas más del capítulo. **La cobertura es una pista, no un objetivo**: mide qué líneas se ejecutaron, no qué comportamientos se verificaron (un test sin aserciones da 100 %). Y la cultura se construye mostrando beneficios, no por decreto; *The Pragmatic Programmer* lo resume en una frase: **prueba tu software, o lo harán tus usuarios**.

### Los tests sucios son peores que no tener tests

Martin cuenta la historia de un equipo que decidió que sus tests no necesitaban la calidad del código de producción. Cada cambio rompía tests que nadie entendía, arreglarlos costaba cada vez más y, al final, **descartaron la suite entera**. Sin tests, nadie se atrevió a limpiar el código y el código se pudrió. La conclusión correcta es la contraria: **el código de los tests es tan importante como el de producción**, porque son los tests los que hacen posible cambiar todo lo demás. Google llega a lo mismo desde la escala: una suite es un activo solo si es **mantenible**.

### Legibilidad: given, when, then

La cualidad más importante de un test es la legibilidad. La estructura **construir-operar-comprobar** (Arrange-Act-Assert, Given-When-Then) la hace visible:

```ts
// Difícil de leer: detalles mezclados, sin estructura
it("test1", () => {
  const s = new Scheduler(new Map([["mon", 2], ["tue", 2], ["wed", 2], ["thu", 2], ["fri", 2], ["sat", 3]]));
  const r = s.plan([{ k: "a", h: 2 }, { k: "b", h: 3 }, { k: "c", h: 2 }], new Date(2026, 9, 23));
  expect(r[2].d.getDate()).toBe(26);
});

// Limpio: estructura evidente y lenguaje del dominio
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

Los ayudantes (`schedulerWithDefaultWeek`, `lesson`, `friday`, `datesOf`) forman un pequeño **lenguaje de testing del dominio**, que no se diseña de antemano: emerge al refactorizar tests repetitivos. Los tests siguen un **estándar dual**: deben ser limpios, pero no tan eficientes como el código de producción. Y aunque "una aserción por test" es una buena guía, la regla real es **un concepto por test**: si un test comprueba tres reglas distintas de `addMonths` y falla, no sabes cuál se rompió.

### F.I.R.S.T.

| Letra | Regla | Por qué |
| --- | --- | --- |
| **F**ast | Rápidos | Si son lentos, no los ejecutarás a menudo |
| **I**ndependent | Independientes | Ningún test prepara condiciones para otro; cualquier orden vale |
| **R**epeatable | Repetibles | Mismo resultado en tu portátil, en CI y sin red |
| **S**elf-validating | Autovalidables | Pasan o fallan, sin leer logs a mano |
| **T**imely | Oportunos | Se escriben justo antes del código; después, el código sale difícil de probar |

### Tests que no cambian: API pública y estado

Un test **frágil** falla ante un cambio que no introdujo ningún bug. Google define el ideal: **un test que no cambia** salvo que cambien los requisitos.

| Tipo de cambio en producción | ¿Cambian los tests existentes? |
| --- | --- |
| Refactor puro | No |
| Funcionalidad nueva | No (se añaden tests) |
| Corrección de bug | No (se añade el test que faltaba) |
| Cambio de comportamiento | Sí: el único caso legítimo |

Dos técnicas lo consiguen. **Prueba a través de la API pública**, al nivel en que la usan sus clientes reales, sin métodos privados ni `as any` para mirar el estado interno. Y **prueba el estado, no las interacciones**: comprobar que el usuario existe en el repositorio tras la operación sobrevive a cualquier refactor; comprobar que se llamó a `repository.save` con ciertos argumentos ata el test a la implementación (lo verás a fondo en la sesión de test doubles).

```ts
// Frágil: accede a detalles internos
it("guarda la transacción", () => {
  const processor = new TransactionProcessor();
  processor.process(new Transaction(100, "USD"));
  expect((processor as any).cache.size).toBe(1);
});

// Robusto: comprueba el comportamiento visible
it("rechaza una transacción duplicada", () => {
  const processor = new TransactionProcessor();
  const transaction = new Transaction(100, "USD", "tx-1");
  processor.process(transaction);
  expect(() => processor.process(transaction)).toThrow(DuplicateTransaction);
});
```

### Tests claros: completos, concisos y sin lógica

- **Completos y concisos**: el cuerpo contiene toda la información necesaria para entender el resultado, y nada irrelevante. Si el total esperado es 105 porque el impuesto es 5 %, el 5 % se ve en el test, no en un `beforeEach` lejano.
- **Un test por comportamiento, no por método**: "rechaza importes negativos", "aplica el descuento a clientes recurrentes". Un buen criterio: ¿se entiende qué hace el sistema leyendo solo los nombres de los tests?
- **Sin lógica**: ni bucles, ni condicionales, ni concatenaciones. La lógica del test puede tener bugs, nadie prueba los tests y puede reproducir el mismo error del código. Google muestra una URL construida en el test que reproducía la doble barra del código bajo prueba. Escribe los valores esperados literalmente.
- **Mensajes de fallo claros**: `expect(list).toContain(item)` dice mucho más que `expect(list.includes(item)).toBe(true)`.

### DAMP, no DRY

En producción buscamos DRY; en los tests, Google propone **DAMP** (*Descriptive And Meaningful Phrases*): algo de duplicación es aceptable si cada test se entiende solo. Quien lee un test que falla quiere entenderlo de un vistazo, sin saltar por cinco ayudantes, tres `beforeEach` y constantes compartidas como `ACCOUNT_1`. Comparte **constructores de datos con valores por defecto razonables** donde cada test fija solo lo que le importa:

```ts
function newAccount(overrides: Partial<AccountProps> = {}): Account {
  return new Account({ owner: "Ana", balance: 0, status: "active", ...overrides });
}

it("no permite retirar de una cuenta bloqueada", () => {
  const account = newAccount({ status: "blocked", balance: 100 }); // lo relevante, visible
  expect(() => account.withdraw(10)).toThrow(AccountBlocked);
});
```

Evita en cambio los ayudantes que hacen "todas las aserciones" (`assertUserIsValid`), porque esconden qué comprueba cada test. Y cuando un mismo comportamiento se verifica con varios datos, usa `it.each`: un test por fila, con nombre propio y sin bucles en el cuerpo.

```ts
it.each([
  { password: "abc", expected: false, reason: "menos de 8 caracteres" },
  { password: "abcdefg1", expected: false, reason: "sin mayúsculas" },
  { password: "Abcdefg1", expected: true, reason: "cumple todas las reglas" },
])("devuelve $expected cuando la contraseña tiene $reason", ({ password, expected }) => {
  expect(isStrongPassword(password)).toBe(expected);
});
```

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
    expect(c._discount).toBe(0.1);
    let total = 0;
    for (const i of c.items) total += i.price * i.qty;
    expect(c.total()).toBe(total * 0.9);
  });
});
```

Nombre inútil, varios conceptos, estado interno (`_discount`, `items`), lógica en el test, datos clave escondidos en el `beforeEach` y `any`.

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

Si mañana cambia cómo se guarda el descuento por dentro, estos tests no se enteran.

### Una estrategia y una checklist

Para una app como este planificador de estudio, una estrategia razonable: el dominio (fechas, reglas de secuencia, parsers de contenido) con tests pequeños para todos sus bordes, que son la mayoría; los repositorios SQLite con unos pocos tests medianos sobre un archivo temporal; las rutas con uno o dos tests por ruta; y muy pocos flujos completos.

Antes de dar por terminado un test, revisa: ¿el nombre describe un comportamiento?, ¿se ven given, when y then?, ¿los datos relevantes están en el test?, ¿usa solo la API pública?, ¿está libre de lógica?, ¿comprueba un solo concepto?, ¿sobreviviría a un refactor? Y la más valiosa: **¿lo has visto fallar?** Rompe el código a propósito una vez y mira el mensaje; un test que nunca falló puede no estar probando nada.

### Errores comunes

- **Ver los tests como una fase final** o como código de segunda categoría.
- **Perseguir el 100 % de cobertura** en lugar de cubrir los comportamientos importantes.
- **Confiar en tests de extremo a extremo para todo** (cono de helado) y tolerar tests inestables.
- **Tests que dependen del reloj, la red o el orden de ejecución.**
- **Un test por método**, nombres como `works` o `test1` y acceso a miembros privados con `as any`.
- **Bucles, condicionales y valores esperados calculados** dentro de los tests.
- **`beforeEach` gigantes** que esconden los datos relevantes.

### Resumen

Los tests existen para cambiar el código rápido y con confianza, y pensar en ellos mejora el diseño. Clasifícalos por tamaño (recursos) y por alcance (cuánto validan), prefiere los pequeños, apunta a una pirámide y trata los tests inestables como bugs urgentes. Escríbelos con el mismo cuidado que el código de producción: un concepto por test, given/when/then visibles, a través de la API pública, comprobando estado, sin lógica y con datos relevantes a la vista. Prefiere DAMP a DRY y aspira a tests que solo cambian cuando cambian los requisitos.

## Conceptos clave

- **Tamaño de un test**: recursos que necesita (pequeño: un proceso sin I/O; mediano: una máquina; grande: varias).
- **Alcance de un test**: cuánto código valida (estrecho, medio o amplio).
- **Pirámide de tests**: ~80 % estrechos, ~15 % de integración y ~5 % de extremo a extremo.
- **Cono de helado / reloj de arena**: antipatrones con demasiados tests amplios o sin tests de integración.
- **Test flaky**: test que pasa o falla de forma no determinista sin cambios en el código.
- **Tres leyes de TDD**: no escribir código sin un test que falle, solo el test justo para fallar y solo el código justo para pasar.
- **Un concepto por test**: cada test verifica un solo comportamiento.
- **F.I.R.S.T.**: rápidos, independientes, repetibles, autovalidables y oportunos.
- **Test frágil**: test que falla ante cambios que no introducen bugs.
- **DAMP**: en los tests se prefieren frases descriptivas aunque haya algo de duplicación.

## Preguntas de repaso

1. ¿Por qué The Pragmatic Programmer dice que "testear no trata de encontrar bugs"?
   R: Porque el mayor beneficio aparece al pensar en cómo probar el código: eso obliga a definir su interfaz, separar responsabilidades y reducir el acoplamiento, mejorando el diseño antes de escribir el test. El test es el primer cliente del código.
2. Explica la diferencia entre tamaño y alcance de un test, con un ejemplo de alcance amplio y tamaño pequeño.
   R: El tamaño mide los recursos que necesita (proceso, máquina, red); el alcance, cuánto código valida. Ejemplo: probar el flujo completo de un endpoint con la base de datos y los servicios externos sustituidos por fakes en memoria, de modo que todo corre en un proceso sin I/O.
3. Describe los antipatrones del cono de helado y del reloj de arena.
   R: Cono de helado: muchos tests manuales y de extremo a extremo y pocos unitarios; la suite es lenta, inestable y difícil de diagnosticar. Reloj de arena: muchos unitarios y muchos de extremo a extremo pero pocos de integración, normalmente por un acoplamiento que impide probar componentes parcialmente aislados.
4. ¿Por qué los tests flaky son tan dañinos y cómo se combaten en TypeScript?
   R: Porque hacen perder tiempo investigando falsos fallos y, sobre todo, destruyen la confianza en la suite: cerca del 1 % de inestabilidad, los equipos ignoran los fallos. Se combaten eliminando el no determinismo: reloj inyectado o temporizadores falsos, estado fresco por test, sin red real, sin esperas arbitrarias y aleatoriedad con semilla.
5. ¿Por qué, según Martin, los tests sucios pueden ser peores que no tener tests?
   R: Porque se vuelven cada vez más caros de mantener; cada cambio de producción rompe tests que nadie entiende, hasta que el equipo los descarta. Sin tests, nadie se atreve a limpiar el código y este se degrada.
6. ¿Qué es un test frágil y qué cambios de código deberían obligar a modificar tests existentes?
   R: Un test que falla ante un cambio que no introduce ningún bug. Solo los cambios de comportamiento deberían obligar a modificar tests existentes; refactors, funcionalidades nuevas y correcciones de bugs como mucho añaden tests nuevos.
7. ¿Por qué no se debe poner lógica (bucles, condicionales, concatenaciones) en los tests?
   R: Porque la lógica puede tener bugs y nadie prueba los tests; además, puede reproducir el mismo error que el código bajo prueba, como al construir una URL concatenando strings. Los valores esperados se escriben de forma literal.
8. ¿Qué significa DAMP y por qué es preferible a DRY en los tests?
   R: Descriptive And Meaningful Phrases: tests descriptivos aunque repitan algo. Al leer un test que falla hay que entenderlo de un vistazo, sin reconstruir contexto repartido en ayudantes, constantes globales y setups. Se comparten constructores de datos con valores por defecto, pero lo relevante se ve en cada test.

## Ejercicio

Elige un proyecto TypeScript tuyo (o esta app) y escribe un `TESTING.md` de máximo una página con su estrategia: capas, qué se prueba en cada una, tamaño y alcance de esos tests y una proporción objetivo. Después escribe con TDD estricto (un commit por ciclo rojo-verde-refactor) una clase `StudyStreak` que calcule la racha de días de estudio consecutivos a partir de una lista de fechas completadas, sabiendo que los domingos no rompen la racha. Requisitos: al menos ocho tests, uno por comportamiento, con nombres que describan el comportamiento, given/when/then visibles, un ayudante `day("2026-10-20")`, al menos un `it.each`, sin bucles ni condicionales en los tests y solo a través de la API pública; si la clase usa la fecha de hoy, elimina la dependencia del reloj con un reloj inyectado o `vi.setSystemTime()`. Terminado cuando leyendo solo los nombres (`npx vitest run --reporter=verbose`) se entiende la regla completa, la suite pasa diez veces seguidas y el `TESTING.md` clasifica tus tests por tamaño y alcance.

## Explícalo con tus palabras

Explica a alguien por qué un test que falla "solo a veces" es más peligroso que no tener ese test, y por qué en los tests a veces preferimos la duplicación que odiamos en producción.
