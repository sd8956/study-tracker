---
title: Reversibilidad, configuración y programar como transformación (con TypeScript a tu favor)
kind: lesson
hours: 2
sources: The Pragmatic Programmer, tema 11 Reversibility (pp. 104–108) | The Pragmatic Programmer, tema 30 Transforming Programming (pp. 255–271) | The Pragmatic Programmer, tema 32 Configuration (pp. 284–288) | Gentleman Programming Book, cap. 10 Typescript Con De Tuti
links: Gentleman · Typescript Con De Tuti | https://the-amazing-gentleman-programming-book.vercel.app/es/book/Chapter10_TypeScript
---

## Objetivo

Diseñar sin decisiones irreversibles, sacar de tu código lo que cambia entre entornos (configuración) y pensar los programas como tuberías que transforman datos. De paso, usar el sistema de tipos de TypeScript (uniones, `as const`, tipos utilitarios, genéricos, `unknown`) para que esas transformaciones y configuraciones sean seguras.

## Estudio

### No hay decisiones finales

El tema de **reversibilidad** de *The Pragmatic Programmer* parte de una observación: los ingenieros preferimos soluciones simples y únicas, como en un problema de matemáticas. Pero en los proyectos reales, las decisiones críticas cambian. El libro cuenta, en tono de broma, la historia de un proyecto que decidía y re-decidía su base de datos: primero relacional, luego orientada a objetos, luego relacional otra vez, porque cambiaban los requisitos, el proveedor o la dirección.

El consejo es directo: **no hay decisiones finales**. En lugar de grabar las decisiones en piedra, piensa que están escritas en la arena de la playa: llegará una ola y tendrás que volver a escribirlas.

¿Cómo se diseña para eso?

- **Separa las decisiones de su implementación.** Si tu código depende de una interfaz `Repository` en lugar de una base de datos concreta, cambiar de base de datos es escribir un adaptador nuevo, no reescribir la aplicación. Es la idea de ortogonalidad de la sesión 11 y de las fronteras de la sesión 9.
- **Arquitectura flexible.** El libro repasa cómo cambiaron las "mejores prácticas" de arquitectura en pocos años: monolitos, cliente-servidor, n capas, microservicios, serverless... y probablemente cambien de nuevo. No puedes saber cuál será la correcta en cinco años, pero puedes hacer que tu código no dependa de ella. Mantén la lógica de negocio fuera del mecanismo de despliegue.
- **No sigas modas.** Nadie sabe qué pasará en el futuro. Elegir tecnología porque está de moda, sin una razón concreta, es apostar sin saber.

Un ejemplo pequeño de reversibilidad en TypeScript:

```ts
// Irreversible: la decisión "usamos SQLite" está en cada caso de uso
import { DatabaseSync } from "node:sqlite";
const db = new DatabaseSync("study.db");

export function markSessionDone(key: string): void {
  db.prepare("INSERT INTO progress(key, done_at) VALUES (?, ?)").run(key, Date.now());
}
```

```ts
// Reversible: el caso de uso depende de una abstracción
export interface ProgressStore {
  markDone(sessionKey: string, at: Date): void;
}

export function markSessionDone(store: ProgressStore, sessionKey: string, clock: () => Date): void {
  store.markDone(sessionKey, clock());
}

// La decisión concreta vive en un adaptador
export class SqliteProgressStore implements ProgressStore {
  constructor(private readonly db: DatabaseSync) {}
  markDone(sessionKey: string, at: Date): void {
    this.db.prepare("INSERT INTO progress(key, done_at) VALUES (?, ?)").run(sessionKey, at.getTime());
  }
}
```

Si mañana la app vuelve a una base de datos remota, cambias un adaptador. Fíjate también en el reloj inyectado: una decisión pequeña (de dónde sale "ahora") que hace el código testeable y reversible.

### Configuración: saca de tu código lo que cambia

El tema 32 dice: **parametriza tu aplicación usando configuración externa**. Cuando el código depende de valores que pueden cambiar después de que la aplicación esté en producción, esos valores deben vivir fuera del código. Ejemplos que da el libro:

- Credenciales de servicios externos (bases de datos, APIs de terceros).
- Niveles y destinos de logging.
- Puertos, direcciones IP, nombres de máquinas y clústeres.
- Parámetros de validación específicos de un entorno.
- Parámetros externos, como tasas de impuestos.
- Detalles de formato específicos de un sitio.
- Claves de licencia.

Hay dos formas principales de mantener configuración:

**Configuración estática**: archivos planos (JSON, YAML, TOML, `.env`) o tablas de base de datos que se leen al arrancar. El libro recomienda **envolver** la información de configuración detrás de una API fina (como el módulo `config.ts` que viste en la sesión 7), para que el resto del código no dependa del formato concreto ni de dónde viene.

**Configuración como servicio**: la configuración vive detrás de un servicio (o de un almacén compartido) al que la aplicación consulta. Ventajas: varias aplicaciones comparten la misma información, se puede cambiar sin reiniciar (con un mecanismo de suscripción), se puede auditar y tener permisos. En sistemas grandes es habitual (feature flags, gestores de secretos).

Y una advertencia con nombre: **no escribas código dodo**. El dodo no pudo adaptarse a la llegada de humanos y animales nuevos a su isla y se extinguió. Un código que no se puede adaptar sin recompilar o redesplegar está en peligro. Pero el libro también avisa del extremo contrario: no conviertas todo en configuración por pereza de tomar decisiones. Una configuración con cientos de opciones es otra forma de complejidad, y cada opción es un camino que hay que probar.

### Configuración tipada y validada en TypeScript

La configuración es una frontera: llega del exterior como texto sin tipo. Aquí es donde TypeScript y una validación en tiempo de ejecución se complementan:

```ts
import { z } from "zod";

const ConfigSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  NAN_API_KEY: z.string().min(1).optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = ConfigSchema.safeParse(env);
  if (!parsed.success) {
    // crash early: arrancar con configuración inválida es peor que no arrancar
    throw new Error(`Configuración inválida: ${parsed.error.message}`);
  }
  return Object.freeze(parsed.data);
}
```

Fíjate en cómo se juntan varias sesiones: DRY (el tipo sale del esquema), crash early (sesión 8), envolver lo global en una API (sesión 7) y configuración externa (este tema). Además, recibir `env` como parámetro hace la función fácil de probar.

### Programar es transformar datos

El tema 30 propone un cambio de mirada. Pensamos los programas en términos de objetos, clases y métodos, pero si te alejas un poco, casi cualquier programa es una **transformación**: recibe una entrada y la convierte en una salida. Un servidor web transforma peticiones en respuestas; un compilador transforma texto en instrucciones; un reporte transforma registros en un documento.

```
entrada ──► transformación ──► transformación ──► transformación ──► salida
```

El libro usa como inspiración las tuberías de Unix. Para encontrar los cinco archivos más largos de un directorio, no escribes un programa: encadenas herramientas pequeñas, cada una con una sola responsabilidad.

```
find . -type f | xargs wc -l | sort -n | tail -5
```

La recomendación es: **la programación trata de código, pero los programas tratan de datos**. Empieza por los datos: ¿cuál es la entrada?, ¿cuál es la salida que quieres?, ¿qué pasos intermedios la transforman? Luego implementa cada paso como una función.

### Encontrar las transformaciones

El libro sugiere trabajar de arriba hacia abajo: describe el programa entero como una transformación, y luego divide cada paso en sub-transformaciones hasta que cada una sea fácil de implementar. Su ejemplo es un buscador de palabras para un juego: a partir de un conjunto de letras, encontrar las palabras de un diccionario que se pueden formar.

En TypeScript, un ejemplo cercano a esta app: obtener las sesiones pendientes de un módulo ordenadas, a partir de los archivos de contenido.

```ts
// Programa completo como transformación:
// archivos .md  ──►  sesiones pendientes ordenadas

const pendingSessions = (files: ContentFile[], done: ReadonlySet<string>): SessionSummary[] =>
  files
    .filter(isSessionFile)            // descartar module.md
    .map(parseSession)                // texto ──► Session
    .filter((session) => !done.has(session.key))
    .sort(byFilePrefix)               // 01-, 02-, ...
    .map(toSummary);                  // Session ──► SessionSummary
```

Cada paso es una función pequeña, testeable por separado, sin estado compartido. En JavaScript, `filter`, `map`, `reduce` y `sort` actúan como las tuberías de Unix. (Ojo: `sort` muta el arreglo original; como el `filter` previo crea un arreglo nuevo, aquí es seguro, pero en general prefiere `toSorted` en entornos que lo soporten.)

El libro hace una observación profunda: cuando programas así, **los datos dejan de estar escondidos dentro de objetos y pasan a ser el flujo** que conecta las funciones. Eso reduce el acoplamiento: cada función depende solo de la forma de sus datos de entrada, no de quién los produjo.

### ¿Y los errores en una tubería?

Si un paso de la tubería puede fallar, ¿cómo evitas llenar cada paso de comprobaciones? El libro propone dos ideas:

1. **Envolver los valores** en un tipo que indica si son válidos o un error (como el `Result` de la sesión 8). Cada transformación solo actúa si recibe un valor válido; si recibe un error, lo pasa intacto al siguiente paso.
2. **Hacer las comprobaciones dentro de las transformaciones**, no entre ellas.

```ts
type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = <T>(error: string): Result<T> => ({ ok: false, error });

function andThen<A, B>(result: Result<A>, step: (value: A) => Result<B>): Result<B> {
  return result.ok ? step(result.value) : result;
}

const readFile = (path: string): Result<string> => (exists(path) ? ok(read(path)) : fail(`no existe ${path}`));
const parseFrontmatter = (text: string): Result<Frontmatter> => { /* ... */ return fail("sin frontmatter"); };
const validateHours = (fm: Frontmatter): Result<Frontmatter> =>
  fm.hours === 2 || fm.hours === 3 ? ok(fm) : fail(`hours inválido: ${fm.hours}`);

const result = andThen(andThen(readFile("01-intro.md"), parseFrontmatter), validateHours);
```

Si falla la lectura, los pasos siguientes no se ejecutan y el error llega al final con su mensaje original. Algunos lenguajes (Elixir con `|>`, F#, Haskell) tienen operadores para esto; en TypeScript se usan funciones auxiliares como `andThen` o librerías como `neverthrow`.

El libro cierra el tema con una frase que resume el cambio de mentalidad: **no acumules estado, pásalo de una transformación a otra**.

### TypeScript como aliado: lo esencial del capítulo Gentleman

El capítulo "Typescript Con De Tuti" del Gentleman Programming Book repasa el sistema de tipos. Para este módulo importa una idea: **los tipos son documentación verificada y una forma de hacer reversibles y seguras las decisiones**. Lo más útil para lo que viste hoy:

**`unknown` en lugar de `any` en las fronteras.** `any` desactiva el compilador; `unknown` te obliga a comprobar antes de usar. Todo lo que viene de fuera (JSON, variables de entorno, respuestas HTTP) debería entrar como `unknown` y convertirse en un tipo real tras validarse.

```ts
function parseJson(text: string): unknown {
  return JSON.parse(text);
}

const data = parseJson(body);
// data.title  -> error de compilación: hay que validar primero
```

**Uniones de literales y `as const` para valores cerrados.** En lugar de strings sueltos o números mágicos, define el conjunto de valores válidos una sola vez:

```ts
export const SESSION_KINDS = ["lesson", "project", "evaluation", "course"] as const;
export type SessionKind = (typeof SESSION_KINDS)[number]; // "lesson" | "project" | ...

function isSessionKind(value: string): value is SessionKind {
  return (SESSION_KINDS as readonly string[]).includes(value);
}
```

El arreglo sirve en tiempo de ejecución (para validar) y el tipo en tiempo de compilación, y ambos salen de la misma fuente: DRY aplicado a tipos.

**Tipos utilitarios para no duplicar formas.** El capítulo repasa `Partial`, `Required`, `Readonly`, `Record`, `Pick`, `Omit` y `ReturnType`. Úsalos para derivar tipos en lugar de copiarlos:

```ts
type Session = { key: string; title: string; kind: SessionKind; hours: 2 | 3; body: string };

type SessionSummary = Pick<Session, "key" | "title" | "hours">;   // vista para la lista
type SessionDraft = Omit<Session, "key">;                          // antes de tener clave
type SessionPatch = Partial<Pick<Session, "title" | "body">>;      // edición parcial
```

Si `Session` cambia, los tipos derivados cambian con él.

**`type` frente a `interface`.** El capítulo sugiere `interface` para contratos de objetos que se pueden extender o implementar, y `type` para uniones, intersecciones y tuplas. En la práctica, lo importante es ser consistente en el proyecto (una regla de estilo más).

**Genéricos para transformaciones reutilizables.** Las funciones de la tubería suelen ser genéricas, con restricciones (`extends`) que expresan qué necesitan:

```ts
function groupBy<T, K extends PropertyKey>(items: readonly T[], keyOf: (item: T) => K): Record<K, T[]> {
  const groups = {} as Record<K, T[]>;
  for (const item of items) {
    const key = keyOf(item);
    (groups[key] ??= []).push(item);
  }
  return groups;
}

const byModule = groupBy(sessions, (session) => session.key.split("/")[0]);
```

**Evita las aserciones de tipo innecesarias.** `as` le dice al compilador "confía en mí", y el compilador confía aunque te equivoques. Úsalo solo cuando realmente sabes algo que el compilador no puede saber, y nunca para silenciar un error que no entiendes. El capítulo también advierte sobre usar `any` como atajo: es aceptable solo de forma temporal o para código de terceros sin tipos.

Un aviso honesto sobre el capítulo: algunas explicaciones (por ejemplo, sobre el estrechamiento de tipos dentro de `forEach`) son imprecisas. Contrasta siempre con el manual oficial de TypeScript, una buena práctica pragmática de pensamiento crítico (sesión 2).

### Juntando las tres ideas

| Idea | Pregunta | Herramienta en TypeScript |
| --- | --- | --- |
| Reversibilidad | ¿Puedo cambiar esta decisión tocando un solo lugar? | Interfaces + adaptadores, dependencias inyectadas |
| Configuración | ¿Este valor cambia entre entornos o después del despliegue? | Esquema validado al arrancar, objeto `Config` congelado |
| Transformación | ¿Cuál es la entrada, cuál la salida y qué pasos hay en medio? | Funciones puras, `map`/`filter`/`reduce`, `Result` |
| Tipos | ¿El compilador puede impedir este error? | `unknown`, uniones literales, `as const`, tipos utilitarios |

### Ejemplo trabajado: una feature flag reversible

Las *feature flags* (interruptores de funcionalidad) son una aplicación directa de reversibilidad y configuración: despliegas código nuevo apagado y lo enciendes con configuración, sin redesplegar. Si algo sale mal, lo apagas. Una implementación mínima y testeable:

```ts
export const FLAGS = ["voiceAnswers", "newTodayView"] as const;
export type Flag = (typeof FLAGS)[number];

export interface FeatureFlags {
  isEnabled(flag: Flag): boolean;
}

// Adaptador: flags desde una variable de entorno "voiceAnswers,newTodayView"
export class EnvFeatureFlags implements FeatureFlags {
  readonly #enabled: ReadonlySet<string>;
  constructor(raw = process.env.FEATURE_FLAGS ?? "") {
    this.#enabled = new Set(raw.split(",").map((name) => name.trim()).filter(Boolean));
  }
  isEnabled(flag: Flag): boolean {
    return this.#enabled.has(flag);
  }
}

// Uso en un caso de uso: la decisión se toma en un solo lugar
export function answerMode(flags: FeatureFlags): "voice" | "text" {
  return flags.isEnabled("voiceAnswers") ? "voice" : "text";
}
```

Tres cosas a notar. Primero, el tipo `Flag` impide escribir mal el nombre de un flag (`"voiceAnswer"` sin la s no compila). Segundo, el caso de uso depende de la interfaz `FeatureFlags`, así que en un test pasas un objeto `{ isEnabled: () => true }` sin tocar variables de entorno. Tercero, los flags tienen un costo: cada uno duplica los caminos posibles del código. La práctica sana es **borrar el flag** cuando la funcionalidad ya está estable, para no acumular "código dodo" al revés: caminos muertos que nadie se atreve a quitar.

### Resumen

No hay decisiones finales: separa cada decisión de su implementación para poder cambiarla tocando un solo lugar. Lo que cambia entre entornos va en configuración externa, validada al arrancar y envuelta en una API tipada, sin caer en el extremo de configurarlo todo. Piensa tus programas como tuberías de transformaciones con funciones pequeñas y datos que fluyen, y maneja los errores envolviendo valores en un `Result`. TypeScript te ayuda en todo esto si tratas lo externo como `unknown`, defines los valores cerrados con `as const` y derivas tipos en lugar de duplicarlos.

### Errores comunes

- **Tratar una decisión tecnológica como definitiva** y dejar que se filtre por todo el código.
- **Dejar credenciales o URLs en el código fuente.**
- **Leer configuración sin validarla**, descubriendo el error horas después en producción.
- **Configurarlo todo**: cientos de opciones que nadie prueba.
- **Usar `any` o `as` para "callar" al compilador** en lugar de modelar el tipo correcto.
- **Mutar datos compartidos en una tubería** (por ejemplo, `sort` sobre el arreglo original).

## Conceptos clave

- **Reversibilidad**: diseñar de modo que las decisiones críticas se puedan cambiar tocando pocos lugares.
- **Configuración externa**: valores que cambian entre entornos o tras el despliegue y viven fuera del código.
- **Configuración como servicio**: configuración servida por un sistema central, compartida, auditable y modificable en caliente.
- **Código dodo**: código que no puede adaptarse a su entorno sin recompilar o redesplegar.
- **Programación como transformación**: ver el programa como una tubería de funciones que convierten datos de entrada en datos de salida.
- **`unknown`**: tipo seguro para datos externos que obliga a validar antes de usar.
- **Tipos derivados**: tipos construidos a partir de otros con `Pick`, `Omit`, `Partial` o `typeof`, en lugar de duplicarlos.

## Preguntas de repaso

1. ¿Qué significa que "no hay decisiones finales" y cómo se diseña en consecuencia?
   R: Que las decisiones críticas (base de datos, arquitectura, proveedor) pueden cambiar por requisitos, negocio o tecnología. Se diseña separando las decisiones de su implementación mediante interfaces y adaptadores, de modo que cambiar una decisión toque un solo lugar.
2. ¿Qué tipo de valores deben ir en configuración externa y por qué hay que envolverla en una API?
   R: Valores que cambian entre entornos o después del despliegue: credenciales, puertos, niveles de log, tasas, claves de licencia. Se envuelve en una API para que el resto del código no dependa del formato ni del origen, y para validarla en un único lugar.
3. ¿Qué es el "código dodo" y cuál es el riesgo del extremo opuesto?
   R: Código que no puede adaptarse a cambios del entorno sin recompilar o redesplegar. El extremo opuesto es convertirlo todo en configuración, creando cientos de opciones y combinaciones que nadie prueba, lo que añade complejidad.
4. Describe el enfoque de "programar como transformación" y su ventaja respecto al acoplamiento.
   R: Pensar el programa como una tubería: definir entrada y salida y dividir la conversión en pasos pequeños implementados como funciones que reciben y devuelven datos. Reduce el acoplamiento porque cada función depende solo de la forma de sus datos, no de quién los produjo ni de estado compartido.
5. ¿Cómo se manejan los errores en una tubería de transformaciones sin llenar cada paso de comprobaciones?
   R: Envolviendo los valores en un tipo como `Result` y encadenando los pasos con una función como `andThen`: cada paso solo se ejecuta si recibe un valor válido y, si recibe un error, lo pasa sin tocar hasta el final.
6. ¿Por qué es mejor usar `unknown` que `any` para datos externos, y qué aporta `as const` junto a un tipo derivado?
   R: `unknown` obliga a comprobar o validar antes de usar el valor, mientras que `any` desactiva el compilador. `as const` crea un arreglo de literales inmutable del que se deriva un tipo unión, de modo que la lista de valores válidos existe una sola vez y sirve tanto en tiempo de ejecución como de compilación.

## Ejercicio

Construye en TypeScript una mini-herramienta de línea de comandos `study-report` que: (1) cargue una configuración validada con Zod desde variables de entorno (`CONTENT_DIR`, `REPORT_FORMAT` como unión `"md" | "csv"`, `MAX_ITEMS` numérico con valor por defecto), fallando de inmediato si es inválida; (2) lea los archivos `.md` de un directorio y, como una tubería de funciones puras, produzca un resumen por tipo de sesión (cuántas lecciones, proyectos y evaluaciones, y horas totales); (3) use un `Result` y una función `andThen` para que un archivo mal formado produzca un error con su nombre sin detener el resto; (4) escriba la salida a través de una interfaz `ReportWriter` con dos adaptadores (Markdown y CSV). Terminado cuando no hay ningún `any`, cambiar de formato solo requiere cambiar la variable de entorno y hay tests de la tubería que no tocan el sistema de archivos.

## Explícalo con tus palabras

Explica a alguien cómo una línea de montaje de una fábrica se parece a un programa escrito como tubería de transformaciones, y qué pasa en esa línea cuando una pieza llega defectuosa.
