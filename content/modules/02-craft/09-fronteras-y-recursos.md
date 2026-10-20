---
title: Fronteras con código ajeno, recursos y pasos pequeños
kind: lesson
hours: 2
sources: Clean Code, cap. 8 Boundaries (pp. 144–151) | The Pragmatic Programmer, temas 26–27 How to Balance Resources, Don't Outrun Your Headlights (pp. 212–225)
---

## Objetivo

Aprender a integrar código de terceros sin que contamine tu sistema (envolverlo, aprender con learning tests, diseñar contra APIs que aún no existen), gestionar recursos como archivos, conexiones y temporizadores sin fugas, y avanzar en pasos pequeños que te permitan corregir el rumbo. Al terminar vas a poder escribir un adaptador y un learning test en TypeScript.

## Estudio

### La tensión en la frontera

Casi ningún sistema se construye solo con código propio. Usamos librerías open source, SDKs de proveedores, APIs de otros equipos, frameworks. En cada uno de esos puntos hay una **frontera**, y en ella hay una tensión natural:

- **Quien provee** la librería quiere que sea genérica, que sirva para el mayor número de casos posible.
- **Quien la usa** quiere una interfaz enfocada en sus necesidades concretas.

Martin muestra esta tensión con el `Map` de Java, que tiene muchísimos métodos: puedes limpiarlo, añadir cualquier cosa, borrar. Si pasas un `Map` por todo tu sistema, cualquier parte del código puede borrarlo o meterle objetos del tipo equivocado. En TypeScript ocurre lo mismo con `Map`, con objetos de librerías complejas o con el cliente de una base de datos.

```ts
// Frontera expuesta: todo el sistema conoce Map y puede hacer cualquier cosa con él
const sensors: Map<string, Sensor> = new Map();
// ...en 30 archivos distintos...
const s = sensors.get(sensorId);
sensors.clear(); // ¡alguien podría hacer esto!
```

```ts
// Frontera encapsulada: la interfaz es la que necesita el negocio
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

La recomendación de Martin no es envolver cada `Map` que uses, sino **no pasar las interfaces de frontera por todo el sistema**. Mantenlas dentro de una clase o de una familia cercana de clases. Evita devolverlas desde APIs públicas o aceptarlas como argumentos de tus APIs públicas. Si mañana cambias la estructura interna (o la librería cambia su API), el impacto queda confinado en un solo lugar.

### Explorar y aprender la frontera: learning tests

Cuando adoptas una librería nueva, tienes dos trabajos a la vez: aprender a usarla y escribir el código que la usa. Hacer ambos dentro del código de producción es lento y confuso: cuando algo falla, no sabes si es tu código o tu malentendido de la librería.

Martin propone una técnica de Jim Newkirk: los **learning tests** (tests de aprendizaje). En lugar de experimentar con la librería directamente en tu aplicación, escribes tests que ejercitan la librería tal como piensas usarla. Cada test es una pregunta: "¿si hago esto, pasa aquello?".

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
    const a = new Date(2026, 9, 20, 23, 59);
    const b = new Date(2026, 9, 21, 0, 1);
    expect(differenceInCalendarDays(b, a)).toBe(1);
  });
});
```

Ventajas de los learning tests:

- **Son experimentos controlados**: aíslas la librería y ves exactamente cómo se comporta.
- **No cuestan nada extra**: ibas a tener que aprender la API de todas formas, y ahora el aprendizaje queda registrado.
- **Son mejor que gratis**: cuando sale una versión nueva de la librería, ejecutas los learning tests y ves de inmediato si cambió algún comportamiento del que dependes. Es la regla de Beyoncé de la sesión 1 aplicada a tus dependencias, y la defensa más práctica contra la ley de Hyrum desde el lado del consumidor.

Sin estos tests, actualizar una dependencia es un salto de fe. Con ellos, es una verificación.

### Usar código que todavía no existe

Otra frontera habitual separa lo que conoces de lo que todavía no conoces. Martin cuenta un proyecto en el que tenían que comunicarse con un subsistema de radio ("Transmitter") cuyo API aún no estaba definido. En lugar de esperar, el equipo definió **la interfaz que a ellos les gustaría tener**, programó contra ella y, cuando el API real llegó, escribió un adaptador que traducía de su interfaz a la real.

```
  Nuestro código  ──►  interfaz Transmitter (la que queremos)
                              ▲
                              │ implementa
               ┌──────────────┴──────────────┐
         FakeTransmitter             TransmitterAdapter ──► API real del proveedor
         (para tests)                (cuando exista)
```

En TypeScript:

```ts
// La interfaz que nuestro dominio necesita
export interface PaymentGateway {
  charge(customerId: string, amountInCents: number): Promise<ChargeId>;
}

// Doble para tests y desarrollo mientras no hay API real
export class FakePaymentGateway implements PaymentGateway {
  readonly charges: Array<{ customerId: string; amountInCents: number }> = [];
  async charge(customerId: string, amountInCents: number): Promise<ChargeId> {
    this.charges.push({ customerId, amountInCents });
    return `fake-${this.charges.length}` as ChargeId;
  }
}

// Adaptador al proveedor real, escrito cuando su SDK está disponible
export class StripePaymentGateway implements PaymentGateway {
  constructor(private readonly stripe: StripeClient) {}
  async charge(customerId: string, amountInCents: number): Promise<ChargeId> {
    const intent = await this.stripe.paymentIntents.create({
      customer: customerId,
      amount: amountInCents,
      currency: "usd",
    });
    return intent.id as ChargeId;
  }
}
```

Beneficios: el equipo no se bloquea, el dominio no depende de los nombres ni de los formatos del proveedor, el adaptador es el único lugar que cambia si el proveedor cambia, y el fake da tests rápidos. Este es exactamente el patrón **Adapter** y la semilla de la arquitectura hexagonal (puertos y adaptadores) que verás en la sesión 15.

### Fronteras limpias

La conclusión del capítulo: en las fronteras pasan cosas interesantes, sobre todo cambios. Un buen diseño acomoda el cambio sin grandes reescrituras. Para lograrlo:

- **Depende de algo que controlas**, no de algo que no controlas, o terminará controlándote a ti.
- **Ten pocos lugares que conozcan los detalles de terceros**: envuélvelos o usa un adaptador.
- **Protege tus expectativas con tests**: learning tests o tests de contrato sobre la frontera.

| Riesgo en la frontera | Técnica |
| --- | --- |
| La librería tiene una API demasiado amplia | Envolverla en una clase con la interfaz que necesitas |
| No conoces bien cómo se comporta | Learning tests |
| La API aún no existe o la definirá otro equipo | Definir tu interfaz ideal y un fake; escribir el adaptador después |
| La librería puede cambiar de versión | Learning tests en CI y un único adaptador que actualizar |

### Equilibrar recursos: termina lo que empiezas

Pasamos ahora a *The Pragmatic Programmer*. Todos los programas gestionan recursos: memoria, archivos, conexiones a bases de datos, sockets, transacciones, bloqueos, temporizadores, suscripciones. El patrón es siempre el mismo: **adquirir, usar, liberar**. Y el problema es siempre el mismo: olvidar liberar, o liberar dos veces, o liberar en el lugar equivocado.

El consejo central del libro es simple: **termina lo que empiezas**. La función (o el objeto) que asigna un recurso debería ser responsable de liberarlo. El libro muestra un ejemplo en el que una función abre un archivo, otra lo lee y una tercera lo cierra, con variables globales de por medio. Un cambio inocente en una de ellas hace que el archivo no se cierre en un caso. La solución es que la apertura y el cierre estén en la misma rutina.

```ts
// Antes: abrir en un sitio, cerrar en otro
let handle: FileHandle;
async function openLog() { handle = await fs.open("app.log", "a"); }
async function writeLog(line: string) { await handle.write(line + "\n"); }
async function closeLog() { await handle.close(); } // ¿siempre se llama?

// Después: quien abre, cierra
async function appendToLog(lines: string[]): Promise<void> {
  const handle = await fs.open("app.log", "a");
  try {
    for (const line of lines) await handle.write(line + "\n");
  } finally {
    await handle.close();
  }
}
```

El libro añade un segundo consejo: **actúa localmente**. Mantén el ámbito de las variables que referencian recursos tan pequeño como sea posible, para que sea obvio dónde empieza y dónde termina su vida.

### Asignaciones anidadas y orden

Cuando una rutina necesita más de un recurso, el libro da dos reglas:

1. **Libera los recursos en el orden inverso al que los adquiriste.** Así no dejas referencias colgantes si un recurso depende de otro (por ejemplo, cerrar la transacción antes de devolver la conexión al pool).
2. **Adquiere los recursos siempre en el mismo orden en todo el código.** Esto reduce la posibilidad de interbloqueos (*deadlocks*): si el proceso A tiene el recurso 1 y espera el 2, mientras B tiene el 2 y espera el 1, ninguno avanza.

### Excepciones y liberación de recursos

Las excepciones complican la liberación: si algo lanza entre la adquisición y la liberación, la liberación puede no ejecutarse. Las dos estrategias que menciona el libro son:

- **Ámbitos de variable** (como RAII en C++ o `with` en Python): el recurso se libera automáticamente al salir del ámbito.
- **Cláusulas `finally`**: se ejecutan siempre, haya o no excepción.

Un error típico que el libro señala es adquirir el recurso **dentro** del `try`: si la adquisición falla, el `finally` intentará liberar algo que nunca se adquirió.

```ts
// Mal: si open falla, handle es undefined y close lanza otro error que oculta el original
let handle: FileHandle | undefined;
try {
  handle = await fs.open(path);
  // ...
} finally {
  await handle!.close();
}

// Bien: adquirir antes del try
const handle = await fs.open(path);
try {
  // ...
} finally {
  await handle.close();
}
```

TypeScript moderno (5.2+) añade un mecanismo tipo RAII: la declaración `using` (y `await using`), que llama automáticamente a `[Symbol.dispose]()` o `[Symbol.asyncDispose]()` al salir del bloque. Requiere un entorno que soporte esos símbolos (o un polyfill):

```ts
class TempDirectory implements AsyncDisposable {
  private constructor(readonly path: string) {}
  static async create(): Promise<TempDirectory> {
    return new TempDirectory(await fs.mkdtemp(join(tmpdir(), "job-")));
  }
  async [Symbol.asyncDispose](): Promise<void> {
    await fs.rm(this.path, { recursive: true, force: true });
  }
}

async function processUpload(file: Upload): Promise<Report> {
  await using workDir = await TempDirectory.create();
  await extract(file, workDir.path);
  return analyze(workDir.path);
} // aquí se borra el directorio, haya o no excepción
```

### Recursos que no son memoria

En JavaScript el recolector de basura libera la memoria, y eso a veces da una falsa sensación de seguridad. Pero hay muchos recursos que no libera solo:

| Recurso | Fuga típica | Cómo liberarlo |
| --- | --- | --- |
| Temporizador | `setInterval` que nunca se cancela | `clearInterval` en el cierre o en el `useEffect` cleanup |
| Suscripción / listener | `emitter.on(...)` sin `off` | Guardar la función y llamar `off`/`removeEventListener` |
| Conexión a base de datos | Pool que no devuelve conexiones | `finally { client.release() }` |
| Archivo o socket | Handle abierto tras un error | `finally` o `await using` |
| Petición HTTP en curso | Respuesta que llega a un componente desmontado | `AbortController.abort()` |

En React, la función de limpieza de `useEffect` es exactamente "termina lo que empiezas":

```tsx
useEffect(() => {
  const controller = new AbortController();
  fetch(`/api/sessions/${id}`, { signal: controller.signal })
    .then((response) => response.json())
    .then(setSession)
    .catch(ignoreAbort);
  return () => controller.abort(); // libera lo que este efecto empezó
}, [id]);
```

El libro también sugiere **comprobar el equilibrio**: escribir envoltorios o tests que verifiquen que, al final de una operación, el número de recursos abiertos vuelve al inicial (por ejemplo, que el pool no tiene conexiones prestadas al terminar un test).

### Ejemplo trabajado: comprobar el equilibrio en un test

Supón que tienes un repositorio que usa un pool de conexiones. Un bug clásico es que un camino de error no devuelva la conexión al pool: todo funciona hasta que, tras unas cuantas peticiones fallidas, el pool se queda sin conexiones y la aplicación se cuelga sin un error claro. Puedes detectar esto en los tests comprobando el equilibrio:

```ts
class CountingPool implements Pool {
  borrowed = 0;
  constructor(private readonly inner: Pool) {}

  async connect(): Promise<PoolClient> {
    const client = await this.inner.connect();
    this.borrowed++;
    const release = client.release.bind(client);
    client.release = () => {
      this.borrowed--;
      release();
    };
    return client;
  }
}

it("devuelve la conexión al pool incluso si la consulta falla", async () => {
  const pool = new CountingPool(testPool);
  const repo = new OrderRepository(pool);

  await expect(repo.save(invalidOrder)).rejects.toThrow();

  expect(pool.borrowed).toBe(0); // el equilibrio se mantiene
});
```

Fíjate en que `CountingPool` es a su vez un pequeño adaptador sobre la frontera (el pool de la librería) que te permite observar algo que la librería no expone directamente. Las dos ideas de la sesión se refuerzan: controlar la frontera te permite verificar que los recursos se equilibran.

Una lista de verificación rápida para cualquier función que toque recursos:

1. ¿Dónde se adquiere el recurso? ¿Es antes del `try`?
2. ¿Hay un `finally`, un `using` o una función de limpieza que lo libere en **todos** los caminos, incluidos los errores?
3. Si hay varios recursos, ¿se liberan en orden inverso?
4. ¿Hay un test que provoque un error y compruebe que el recurso se liberó?

### No vayas más rápido que tus faros

El tema 27 cierra el capítulo de paranoia pragmática con una metáfora de conducción nocturna: si conduces más rápido de lo que alcanzan a iluminar tus faros, cuando veas un obstáculo ya no podrás frenar. En software, nuestros "faros" son el feedback: tests, despliegues, opiniones de usuarios. El consejo es **da siempre pasos pequeños**: haz un cambio pequeño, obtén feedback, ajusta, repite.

¿Qué es un paso demasiado grande? Cualquier tarea que requiera **adivinar el futuro**. El libro menciona ejemplos: estimar fechas de entrega a meses vista, planificar un diseño para un mantenimiento o una extensión futura, adivinar las necesidades futuras de los usuarios o la disponibilidad futura de una tecnología. Cuanto más lejos miras, más incertidumbre hay.

Formas de obtener feedback rápido, que el libro enumera:

- Resultados en un REPL que confirman tu comprensión de una API o un algoritmo.
- Tests unitarios que validan el último cambio.
- Demostraciones a usuarios y conversaciones con ellos.

Y una advertencia sobre los **cisnes negros** (la idea de Nassim Taleb): los eventos que más cambian la historia son los imprevisibles. Los autores recuerdan que en la primera edición del libro se discutía qué tecnología dominaría los clientes de escritorio, y pocos años después la web y los móviles hicieron irrelevante esa discusión. En lugar de diseñar para un futuro que no puedes ver, **diseña código que sea fácil de reemplazar**: eso es lo único que funciona con cualquier futuro.

Esta idea conecta todo lo de la sesión: las fronteras limpias y los adaptadores hacen que las piezas sean reemplazables, los learning tests te dan feedback inmediato sobre tus dependencias, y liberar bien los recursos evita que un paso pequeño se convierta en una fuga que nadie ve.

### Errores comunes

- **Pasar objetos de librerías por todo el sistema** (el cliente HTTP, el `Map`, la respuesta cruda de un SDK).
- **Aprender una librería "en producción"** en vez de con learning tests aislados.
- **Esperar a que otro equipo termine su API** en lugar de programar contra la interfaz que necesitas.
- **Abrir un recurso en una función y cerrarlo en otra** sin una razón muy clara.
- **Adquirir el recurso dentro del `try`** y liberarlo en el `finally`.
- **Diseñar para necesidades futuras imaginadas** en lugar de dar un paso pequeño y medir.

### Resumen

En las fronteras con código ajeno pasan los cambios más peligrosos. Mantén las APIs de terceros encerradas en pocas clases, apréndelas con learning tests que además te protegen en cada actualización y, si la API no existe todavía, programa contra la interfaz que te gustaría tener. Con los recursos, quien empieza termina: adquiere fuera del `try`, libera en `finally` o con `using`, en orden inverso, y prueba que el equilibrio se mantiene. Y avanza siempre con pasos que tus faros puedan iluminar.

## Conceptos clave

- **Frontera**: punto donde tu código se encuentra con código que no controlas (librerías, APIs de otros, código que aún no existe).
- **Learning test**: test que ejercita una librería de terceros tal como planeas usarla, para aprenderla y detectar cambios en nuevas versiones.
- **Adaptador**: clase que implementa la interfaz que tu sistema necesita traduciendo hacia la API real de un tercero.
- **Termina lo que empiezas**: quien adquiere un recurso es responsable de liberarlo.
- **Orden de recursos**: liberar en orden inverso a la adquisición y adquirir siempre en el mismo orden para evitar interbloqueos.
- **`using` / `Symbol.dispose`**: mecanismo de TypeScript para liberar recursos automáticamente al salir de un ámbito.
- **No adelantar a tus faros**: avanzar en pasos pequeños con feedback, sin intentar adivinar un futuro lejano.

## Preguntas de repaso

1. ¿Por qué no conviene pasar una interfaz de frontera (como un `Map` o el cliente de un SDK) por todo el sistema?
   R: Porque expone una API demasiado amplia que cualquiera puede usar mal y ata todo el código a los detalles del tercero. Si la librería o la estructura cambian, el cambio se propaga por todas partes. Mantenerla dentro de una clase con una interfaz enfocada confina el impacto.
2. ¿Qué es un learning test y por qué se dice que es "mejor que gratis"?
   R: Es un test que ejercita una librería de terceros tal como planeas usarla, para aprender su comportamiento de forma controlada. Es mejor que gratis porque el aprendizaje lo ibas a hacer igual y, además, al actualizar la librería los tests revelan de inmediato cualquier cambio de comportamiento del que dependes.
3. ¿Cómo se trabaja con una API que todavía no existe?
   R: Definiendo la interfaz que tu código necesitaría, programando contra ella con un fake para tests y desarrollo, y escribiendo un adaptador hacia la API real cuando esté disponible. Así no te bloqueas y tu dominio no depende de los formatos del proveedor.
4. ¿Qué dos reglas da The Pragmatic Programmer cuando una rutina usa varios recursos?
   R: Liberarlos en el orden inverso al que se adquirieron, para no dejar referencias colgantes, y adquirirlos siempre en el mismo orden en todo el código, para reducir la posibilidad de interbloqueos.
5. ¿Por qué es un error adquirir el recurso dentro del bloque try y liberarlo en el finally?
   R: Porque si la adquisición falla, el finally intenta liberar un recurso que nunca se obtuvo; eso lanza un segundo error que puede ocultar el original. El recurso debe adquirirse antes del try.
6. ¿Qué significa "no vayas más rápido que tus faros" y qué relación tiene con los cisnes negros?
   R: Avanzar en pasos pequeños para los que tienes feedback (tests, demos, REPL), sin hacer planes que dependen de adivinar un futuro lejano. Como los eventos más influyentes son imprevisibles (cisnes negros), es mejor diseñar código fácil de reemplazar que intentar predecir qué se necesitará.

## Ejercicio

Elige una librería que no conozcas bien (por ejemplo `zod`, `date-fns` o `node:sqlite`) y escribe un archivo de learning tests con Vitest de al menos cinco tests que documenten comportamientos que te sorprendieron o que vas a usar. Después define una interfaz propia que tu aplicación necesitaría (por ejemplo, `Clock` con `now()` o `Validator<T>` con `parse(input): Result<T, string>`), un fake para tests y un adaptador que use la librería real. Finalmente escribe una función que use un recurso (un archivo temporal o un temporizador) y garantice su liberación con `try/finally` o `await using`, con un test que compruebe que el recurso queda liberado aunque ocurra un error. Terminado cuando los learning tests pasan, el dominio solo importa tu interfaz y el test de liberación pasa en el caso de error.

## Explícalo con tus palabras

Explica a alguien qué es un adaptador usando como ejemplo el enchufe de viaje que usas cuando vas a otro país.
