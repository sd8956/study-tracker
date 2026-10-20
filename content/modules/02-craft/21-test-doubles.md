---
title: Test doubles — fakes, stubs y mocks con criterio
kind: lesson
hours: 2
sources: Software Engineering at Google, cap. 13 Test Doubles (pp. 295–320)
---

## Objetivo

Saber cuándo sustituir una dependencia real en un test y con qué técnica: fake, stub o verificación de interacciones (mock). Entender por qué Google prefiere implementaciones reales y fakes frente a mocks, qué hace frágil a un test con demasiados mocks y cómo diseñar el código con *seams* para que se pueda probar. Al terminar vas a poder elegir el doble adecuado en Vitest y justificarlo.

## Estudio

### Qué es un test double

Un **test double** (doble de prueba, por analogía con los dobles de acción del cine) es un objeto o función que sustituye a una implementación real en un test. Por ejemplo, en lugar de llamar al servidor real de un proveedor de pagos, tu test usa un objeto que se comporta como él pero corre en memoria.

¿Por qué usar dobles? Las dependencias reales pueden ser:

- **Lentas**: una base de datos remota, un servicio de terceros.
- **No deterministas**: el reloj, la red, la aleatoriedad.
- **Difíciles de construir**: necesitan configuración, credenciales o un entorno entero.
- **Con efectos secundarios**: cobrar a una tarjeta real, enviar un correo de verdad.

El capítulo 13 de *Software Engineering at Google* explica que los dobles son muy útiles, pero también advierte de sus costos: un uso descuidado produce tests poco claros, frágiles y que no detectan bugs reales. Google aprendió esto a la fuerza: hubo un tiempo en que se usaban frameworks de mocks para casi todo, y los equipos terminaron con miles de tests que fallaban ante cualquier refactor y no daban confianza.

### Seams: diseñar para poder sustituir

Para usar un doble, el código tiene que permitir la sustitución. Un **seam** (costura) es un punto del código donde puedes cambiar el comportamiento sin modificar el código en sí. La forma más común de crear seams es la **inyección de dependencias**: en lugar de que una clase cree sus dependencias, las recibe.

```ts
// Sin seam: imposible probar sin cobrar de verdad
class PaymentProcessor {
  #service = new CreditCardService("https://api.pagos.example");
  async pay(card: CreditCard, amount: Money): Promise<boolean> {
    return this.#service.charge(card, amount);
  }
}

// Con seam: la dependencia se inyecta
interface CreditCardService {
  charge(card: CreditCard, amount: Money): Promise<boolean>;
}

class PaymentProcessor {
  constructor(private readonly service: CreditCardService) {}
  async pay(card: CreditCard, amount: Money): Promise<boolean> {
    return this.service.charge(card, amount);
  }
}
```

Esto es lo mismo que viste con `Portfolio` y `StockExchange` en la sesión 12 y con los puertos en la sesión 15. El código testeable y el código bien diseñado se parecen mucho.

### Las tres técnicas

Google describe tres técnicas principales para usar dobles:

| Técnica | Qué es | Ejemplo |
| --- | --- | --- |
| **Fake** | Implementación ligera y funcional de la API, no apta para producción | Una base de datos en memoria que de verdad guarda y busca |
| **Stub** | Doble al que le dices qué devolver en cada llamada | "Cuando llamen a `charge`, devuelve `true`" |
| **Verificación de interacciones** (mocks) | Comprobar cómo se llamó a una función: cuántas veces, con qué argumentos | "Comprueba que `charge` se llamó una vez con 100 USD" |

En el día a día se usa "mock" para todo, pero distinguirlas importa porque tienen trade-offs muy distintos.

```ts
// Fake: lógica real simplificada
class FakeCreditCardService implements CreditCardService {
  readonly charges: Array<{ card: CreditCard; amount: Money }> = [];
  constructor(private readonly declinedCards = new Set<string>()) {}
  async charge(card: CreditCard, amount: Money): Promise<boolean> {
    if (this.declinedCards.has(card.number)) return false;
    this.charges.push({ card, amount });
    return true;
  }
}

// Stub con Vitest: respuesta fija
const stubService = { charge: vi.fn().mockResolvedValue(true) };

// Verificación de interacciones con Vitest
expect(stubService.charge).toHaveBeenCalledWith(card, money(100, "USD"));
```

### Prefiere las implementaciones reales

La recomendación central del capítulo: **cuando sea posible, usa la implementación real** de una dependencia en lugar de un doble. Google lo llama preferir el **realismo sobre el aislamiento**.

Hay dos escuelas: la "clásica" (usar objetos reales siempre que se pueda) y la "mockista" (aislar cada clase sustituyendo todas sus dependencias por mocks). Google se inclina claramente por la clásica. ¿Por qué? Porque un test con implementaciones reales da **más confianza**: si el sistema funciona con las piezas reales, funciona de verdad. Un test con mocks solo demuestra que el código se comporta bien **frente a tus suposiciones** sobre las dependencias, y esas suposiciones pueden ser falsas.

¿Cuándo no usar la implementación real? El libro da criterios:

- **Tiempo de ejecución**: si la dependencia real hace que el test sea lento (red, disco, cálculos pesados), un doble puede valer la pena. Pero mide: muchas dependencias reales son lo bastante rápidas.
- **Determinismo**: si la dependencia real es no determinista (reloj, red, concurrencia), introduce inestabilidad.
- **Construcción de dependencias**: si construir la dependencia real exige construir medio sistema, quizá convenga un doble. Aun así, el libro sugiere que el código de producción que construye objetos (fábricas, inyección) se pueda reutilizar en los tests.

Una regla práctica: las funciones y clases puras de tu dominio (calculadoras, validadores, entidades) **nunca** necesitan dobles; úsalas tal cual. Los dobles son para las fronteras: red, disco, reloj, servicios externos.

### Fakes: la mejor opción cuando la real no sirve

Si no puedes usar la implementación real, Google prefiere un **fake**. Un fake se comporta como la implementación real (guarda datos, los devuelve, valida), así que el test sigue comprobando comportamiento real, no una secuencia de llamadas.

Ventajas de los fakes:

- Los tests son **rápidos** y **realistas** a la vez.
- Los tests usan la API de forma natural, sin programar respuestas en cada test.
- Si la implementación del código bajo prueba cambia (por ejemplo, hace las consultas en otro orden), el test sigue pasando.

Pero escribir un fake tiene costos, y el libro da varias pautas:

- **¿Quién escribe el fake?** Idealmente, **el equipo que es dueño de la API real**. Conoce mejor su comportamiento y puede mantener el fake sincronizado. Un fake escrito por cada consumidor se desincroniza y se duplica.
- **Fidelidad.** Un fake debe comportarse como la implementación real **en lo que importa a los tests**: si la real lanza un error con un id duplicado, el fake también. No hace falta simular rendimiento o detalles irrelevantes.
- **Los fakes deben tener sus propios tests.** Para garantizar la fidelidad, se escriben **tests de contrato**: la misma suite de tests se ejecuta contra la implementación real y contra el fake. Si ambos pasan, el fake es fiel.

```ts
// Tests de contrato compartidos por la implementación real y el fake
function userRepositoryContract(name: string, makeRepository: () => Promise<UserRepository>) {
  describe(`${name} cumple el contrato de UserRepository`, () => {
    it("devuelve el usuario guardado", async () => {
      const repository = await makeRepository();
      await repository.save(user({ id: "u1", name: "Ana" }));
      expect(await repository.findById("u1")).toEqual(user({ id: "u1", name: "Ana" }));
    });

    it("devuelve undefined si el usuario no existe", async () => {
      const repository = await makeRepository();
      expect(await repository.findById("nadie")).toBeUndefined();
    });
  });
}

userRepositoryContract("InMemoryUserRepository", async () => new InMemoryUserRepository());
userRepositoryContract("SqliteUserRepository", async () => SqliteUserRepository.inMemory());
```

¿Y si no hay un fake disponible? El libro sugiere pedírselo a los dueños de la API o, si no es posible, escribir uno tú mismo envolviendo la API en tu propia interfaz (la frontera limpia de la sesión 9), de modo que el fake sea de **tu** interfaz, que es más pequeña.

### Stubs: útiles, pero con cuidado

Un **stub** devuelve valores fijos programados en cada test. Es muy cómodo con frameworks como Vitest (`vi.fn().mockReturnValue(...)`). Precisamente por eso se abusa de él. El libro describe los peligros de usar stubs en exceso:

1. **Los tests se vuelven poco claros.** Cada test tiene un montón de líneas programando respuestas que no tienen que ver con lo que se quiere comprobar. Quien lo lee tiene que entender el código bajo prueba para entender por qué hacen falta esos stubs.
2. **Los tests se vuelven frágiles.** Los stubs filtran detalles de implementación: si el código cambia de llamar a `findById` a llamar a `findMany`, el test se rompe aunque el comportamiento sea el mismo.
3. **Los tests pierden efectividad.** Con stubs, no hay forma de saber si el código funciona con la dependencia real. Si el stub devuelve algo que la real nunca devolvería (por ejemplo, un formato distinto), el test pasa y producción falla.

```ts
// Abuso de stubs: el test conoce cada llamada interna
it("procesa el pago", async () => {
  const cards = { isValid: vi.fn().mockReturnValue(true) };
  const fraud = { score: vi.fn().mockResolvedValue(0.1) };
  const gateway = { authorize: vi.fn().mockResolvedValue({ id: "a1" }), capture: vi.fn().mockResolvedValue(true) };
  const processor = new PaymentProcessor(cards, fraud, gateway);
  expect(await processor.pay(card, money(100))).toBe(true);
});
```

¿Cuándo es apropiado un stub? Cuando necesitas que una función devuelva un valor concreto para llevar al código bajo prueba a un estado determinado, **y** no hay un fake razonable. Por ejemplo, simular que un servicio externo devuelve un error poco común. Cada stub debería tener una relación clara con las aserciones del test.

### Verificación de interacciones: el último recurso

La verificación de interacciones comprueba **cómo** se llamó a una dependencia. Google establece una preferencia clara: **prefiere probar el estado a probar las interacciones**. Comprobar el estado significa observar el sistema después de la acción (¿se guardó el pedido?, ¿cambió el saldo?). Comprobar interacciones significa verificar que se llamó a ciertos métodos.

```ts
// Interacción: frágil y sin garantía de que funcione
it("ordena los números", () => {
  const sorter = { sort: vi.fn() };
  const service = new NumberSorterService(sorter);
  service.sortNumbers([3, 1, 2]);
  expect(sorter.sort).toHaveBeenCalledWith([3, 1, 2]); // ¿y si sort está mal?
});

// Estado: verifica el resultado real
it("ordena los números", () => {
  const service = new NumberSorterService(new QuickSorter());
  expect(service.sortNumbers([3, 1, 2])).toEqual([1, 2, 3]);
});
```

El primer test pasa aunque el ordenamiento esté roto, y falla si el servicio decide usar otro algoritmo de ordenamiento. El segundo verifica lo que importa.

¿Cuándo es apropiada la verificación de interacciones? El libro da dos situaciones:

- **No puedes comprobar el estado** porque no hay una implementación real ni un fake, y la llamada es el único efecto observable (por ejemplo, que se envió una notificación a un servicio externo).
- **El número o el orden de llamadas importa** y es parte del comportamiento: por ejemplo, verificar que una caché evita llamar dos veces a la base de datos.

Y buenas prácticas cuando la uses:

- **Verifica solo funciones que cambian estado**, no las que solo leen. Que se llamó a `getUser` es un detalle; que se llamó a `sendEmail` es un efecto.
- **Evita la sobreespecificación**: verifica solo los argumentos y llamadas relevantes para el comportamiento que pruebas. Un test por comportamiento, no un test que verifica todas las llamadas.

```ts
it("envía un correo de bienvenida al registrar un usuario", async () => {
  const mailer = { send: vi.fn().mockResolvedValue(undefined) };
  const service = new RegistrationService(new InMemoryUserRepository(), mailer);

  await service.register({ name: "Ana", email: "ana@mail.com" });

  expect(mailer.send).toHaveBeenCalledTimes(1);
  expect(mailer.send).toHaveBeenCalledWith(expect.objectContaining({ to: "ana@mail.com" }));
  // No verificamos el asunto exacto ni el orden respecto al guardado:
  // no son parte del comportamiento que este test describe.
});
```

Fíjate en la combinación: repositorio fake (estado real) y mailer como mock (efecto externo cuyo único rastro es la llamada).

### Dobles para el tiempo y la aleatoriedad

Dos dependencias aparecen en casi todos los proyectos y merecen mención especial:

**El reloj.** Puedes inyectar una función `now: () => Date` o, en Vitest, usar temporizadores falsos:

```ts
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-24T09:00:00"));
});
afterEach(() => vi.useRealTimers());

it("muestra 3 horas de estudio los sábados", () => {
  expect(todayPlan().hours).toBe(3);
});
```

**La aleatoriedad.** Inyecta un generador (`random: () => number`) y en los tests pasa uno determinista. Así los tests son repetibles (la R de F.I.R.S.T.).

### Guía de decisión

```
¿La dependencia es rápida, determinista y fácil de construir?
   └─ Sí → usa la implementación real
   └─ No → ¿existe (o puedes escribir y mantener) un fake fiel?
            └─ Sí → usa el fake (con tests de contrato)
            └─ No → ¿necesitas que devuelva algo concreto?
                     └─ Sí → stub, con pocos y relevantes valores
                     └─ ¿El único efecto observable es la llamada, o importa cuántas veces se llama?
                              └─ Sí → verificación de interacciones, solo en métodos que cambian estado
```

### El mismo test, dos estilos

Para ver el efecto de cada estilo, comparemos dos tests del mismo caso de uso: "al completar una sesión, se guarda el progreso y se programa su primer repaso para dentro de un día".

```ts
// Estilo mockista: verifica cada llamada
it("completa una sesión", async () => {
  const progress = { markDone: vi.fn(), findByKey: vi.fn().mockResolvedValue(undefined) };
  const reviews = { schedule: vi.fn() };
  const service = new CompleteSession(progress, reviews, () => new Date("2026-10-20"));

  await service.execute("02-craft/05-funciones");

  expect(progress.findByKey).toHaveBeenCalledWith("02-craft/05-funciones");
  expect(progress.markDone).toHaveBeenCalledWith("02-craft/05-funciones", new Date("2026-10-20"));
  expect(reviews.schedule).toHaveBeenCalledWith("02-craft/05-funciones", new Date("2026-10-21"));
});
```

```ts
// Estilo clásico con fakes: verifica el estado resultante
it("guarda el progreso y programa el primer repaso al día siguiente", async () => {
  const progress = new InMemoryProgressStore();
  const reviews = new InMemoryReviewSchedule();
  const service = new CompleteSession(progress, reviews, () => new Date("2026-10-20"));

  await service.execute("02-craft/05-funciones");

  expect(await progress.isDone("02-craft/05-funciones")).toBe(true);
  expect(await reviews.dueOn(new Date("2026-10-21"))).toEqual(["02-craft/05-funciones"]);
});
```

Supón que mañana optimizas `CompleteSession` para que no llame a `findByKey` antes de `markDone` (porque `markDone` ya es idempotente). El test mockista falla, aunque el comportamiento sea idéntico. El test clásico sigue pasando. Y si un día `markDone` del repositorio real tiene un bug, el test clásico con un fake fiel (verificado por tests de contrato) te da muchas más probabilidades de detectarlo que una lista de llamadas esperadas.

### Dobles en el frontend: interceptar la red

En aplicaciones de interfaz, la dependencia más común es la red. En lugar de mockear `fetch` en cada test con respuestas a mano (stubs dispersos), una práctica muy extendida es **interceptar las peticiones a nivel de red** con una herramienta como Mock Service Worker (MSW), que define un "servidor falso" con handlers por ruta. Funciona como un fake: el código del componente hace peticiones reales con `fetch`, y el handler responde con datos de prueba.

```ts
const server = setupServer(
  http.get("/api/today", () => HttpResponse.json({ english: 60, sessions: [{ key: "02-craft/05-funciones" }] })),
);
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

Así el componente no sabe que está en un test, los handlers se reutilizan entre tests (y en desarrollo) y cambiar de `fetch` a otra librería HTTP no rompe nada.

### Resumen

Usa la implementación real siempre que sea rápida, determinista y fácil de construir. Si no lo es, prefiere un fake fiel, escrito idealmente por los dueños de la API y verificado con tests de contrato. Usa stubs con moderación y solo con valores relevantes para el test. Reserva la verificación de interacciones para efectos que no se pueden observar de otra forma, solo sobre métodos que cambian estado y sin sobreespecificar. Y diseña con seams (inyección de dependencias) para que todo esto sea posible.

### Errores comunes

- **Mockear todo por defecto**, incluidas funciones puras del dominio.
- **Verificar llamadas de lectura** (`getUser` se llamó) en lugar del resultado.
- **Stubs que devuelven datos imposibles** para la implementación real.
- **Fakes sin tests de contrato**, que se desincronizan sin que nadie lo note.
- **Mockear lo que no es tuyo** directamente (el SDK de un tercero) en lugar de envolverlo en tu interfaz y doblar esa interfaz.
- **No restaurar los mocks globales** (`vi.restoreAllMocks`, `vi.useRealTimers`), contaminando otros tests.
- **Mockear módulos enteros con `vi.mock`** por comodidad cuando una dependencia inyectada haría el diseño más claro y el test más explícito.

## Conceptos clave

- **Test double**: objeto o función que sustituye a una dependencia real en un test.
- **Seam**: punto del código donde se puede cambiar el comportamiento sin modificarlo, normalmente mediante inyección de dependencias.
- **Fake**: implementación ligera y funcional de una API, adecuada para tests.
- **Stub**: doble programado para devolver valores concretos.
- **Verificación de interacciones (mock)**: comprobar cómo y cuántas veces se llamó a una dependencia.
- **Realismo sobre aislamiento**: preferir implementaciones reales para obtener más confianza.
- **Test de contrato**: suite que se ejecuta contra la implementación real y el fake para garantizar que se comportan igual.

## Preguntas de repaso

1. ¿Por qué Google prefiere usar implementaciones reales en los tests siempre que sea posible?
   R: Porque dan más confianza: si el código funciona con las dependencias reales, funciona de verdad. Los dobles solo verifican el código frente a suposiciones sobre las dependencias, que pueden ser falsas. Se usan dobles solo si la dependencia real es lenta, no determinista o muy difícil de construir.
2. ¿Qué es un fake, quién debería escribirlo y cómo se garantiza su fidelidad?
   R: Es una implementación ligera y funcional de una API (por ejemplo, un repositorio en memoria). Idealmente lo escribe el equipo dueño de la API real, que mejor conoce su comportamiento. Su fidelidad se garantiza con tests de contrato que se ejecutan contra la implementación real y contra el fake.
3. Menciona los tres peligros del abuso de stubs.
   R: Los tests se vuelven poco claros (muchas líneas programando respuestas irrelevantes), frágiles (filtran detalles de implementación que rompen el test ante refactors) y menos efectivos (no garantizan que el código funcione con la dependencia real, sobre todo si el stub devuelve algo que la real nunca devolvería).
4. ¿Por qué se prefiere probar el estado a probar las interacciones? Da un ejemplo.
   R: Porque probar el estado verifica el resultado real y no depende de cómo lo logra el código, mientras que verificar interacciones ata el test a la implementación y puede pasar aunque el resultado sea incorrecto. Ejemplo: comprobar que `sortNumbers([3,1,2])` devuelve `[1,2,3]` en lugar de comprobar que se llamó a `sorter.sort`.
5. ¿En qué dos situaciones es apropiada la verificación de interacciones y qué buenas prácticas siguen?
   R: Cuando no se puede comprobar el estado porque la llamada es el único efecto observable (enviar una notificación a un servicio externo) y cuando el número u orden de llamadas es parte del comportamiento (una caché que evita llamadas repetidas). Buenas prácticas: verificar solo funciones que cambian estado y evitar sobreespecificar argumentos y llamadas irrelevantes.
6. ¿Qué es un seam y qué relación tiene con el diseño del código?
   R: Es un punto donde se puede sustituir el comportamiento sin modificar el código, típicamente al inyectar dependencias en lugar de crearlas dentro. Un código con seams es más testeable y, a la vez, más desacoplado y flexible, por lo que testeabilidad y buen diseño van de la mano.

## Ejercicio

Implementa en TypeScript un `ReminderService` que, cada día, busca las sesiones pendientes de un usuario y le envía un recordatorio si no ha estudiado en las últimas 24 horas. Dependencias: `SessionRepository`, `Notifier` y un reloj. Escribe: (1) un `InMemorySessionRepository` (fake) con una suite de tests de contrato reutilizable; (2) tests del servicio que usen el fake para el repositorio, temporizadores falsos de Vitest para el reloj y un mock solo para `Notifier`; (3) un test que demuestre que no se envía recordatorio si hubo estudio hace 23 horas y otro que sí se envía a las 25 horas; (4) ningún stub ni verificación sobre métodos de lectura del repositorio. Terminado cuando todos los tests pasan, la única verificación de interacciones es sobre `Notifier.send` y puedes cambiar la consulta interna del repositorio sin que falle ningún test del servicio.

## Explícalo con tus palabras

Explica la diferencia entre un fake, un stub y un mock usando como ejemplo un simulador de vuelo, un cartel con respuestas fijas y un inspector que anota lo que haces.
