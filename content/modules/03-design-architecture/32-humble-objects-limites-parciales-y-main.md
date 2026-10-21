---
title: "Clean Architecture III: humble objects, límites parciales, capas y el componente Main"
kind: lesson
hours: 2
sources: Clean Architecture, cap. 23 "Presenters and Humble Objects" (pp. 167–170) | Clean Architecture, cap. 24 "Partial Boundaries" (pp. 171–173) | Clean Architecture, cap. 25 "Layers and Boundaries" (pp. 174–180) | Clean Architecture, cap. 26 "The Main Component" (pp. 181–184)
---

## Objetivo

Aprender a separar lo difícil de testear de lo fácil de testear con el patrón **Humble Object** (presentadores y vistas, gateways, mappers, listeners), a abaratar límites con **límites parciales** cuando un límite completo es demasiado caro, a decidir **cuándo** trazar un límite (YAGNI vs. costo de agregarlo tarde) y a usar el componente **Main** como el plugin más sucio que ensambla el sistema.

## Estudio

### El patrón Humble Object

El patrón **Humble Object** (objeto humilde) nació como una técnica de testing: separar los comportamientos **difíciles de testear** de los **fáciles de testear** en dos módulos. Uno es **humilde**: contiene solo lo difícil de testear, reducido a su mínima expresión. El otro contiene todo lo testeable que se le quitó al humilde.

Martin observa algo importante: esa separación **suele coincidir con un límite arquitectónico**. Por eso Clean Architecture está llena de humble objects.

#### Presentadores y vistas

Las interfaces gráficas son difíciles de testear unitariamente: es complicado escribir tests que "miren" la pantalla. Pero la mayor parte del **comportamiento** de una interfaz es fácil de testear si se separa:

- La **vista** es el objeto humilde: mueve datos a la pantalla **sin procesarlos**.
- El **presentador** es testeable: recibe datos de la aplicación y los formatea para que la vista solo tenga que mostrarlos, dejándolos en un **ViewModel**.

Todo lo que aparece en pantalla y la aplicación controla está representado en el ViewModel como un **string, un booleano o un enum**: fechas ya formateadas, montos con decimales y símbolo de moneda, un flag que indica si el monto va en rojo, el texto de cada botón, si un botón está deshabilitado, las filas de una tabla como strings. A la vista no le queda nada por decidir.

```ts
// Datos de salida del caso de uso: tipos del dominio, sin formato
export interface AccountSummaryOutput {
  owner: string;
  balanceCents: number;
  lastMovementAt: Date | null;
  overdraftAllowed: boolean;
}

// ViewModel: solo strings, booleanos y enums
export interface AccountSummaryViewModel {
  title: string;
  balanceText: string;
  balanceIsNegative: boolean;
  lastMovementText: string;
  withdrawButtonEnabled: boolean;
}

// Presentador: testeable, sin pantalla
export class AccountSummaryPresenter {
  constructor(private readonly locale = "es-CO", private readonly currency = "COP") {}
  present(o: AccountSummaryOutput): AccountSummaryViewModel {
    const money = new Intl.NumberFormat(this.locale, { style: "currency", currency: this.currency });
    const date = new Intl.DateTimeFormat(this.locale, { dateStyle: "medium" });
    return {
      title: `Cuenta de ${o.owner}`,
      balanceText: money.format(o.balanceCents / 100),
      balanceIsNegative: o.balanceCents < 0,
      lastMovementText: o.lastMovementAt ? date.format(o.lastMovementAt) : "Sin movimientos",
      withdrawButtonEnabled: o.balanceCents > 0 || o.overdraftAllowed,
    };
  }
}

// Vista: humilde, solo traslada el ViewModel (difícil de testear y no hace falta)
export const renderAccountSummary = (vm: AccountSummaryViewModel) => `
  <h1>${vm.title}</h1>
  <p class="${vm.balanceIsNegative ? "negative" : ""}">${vm.balanceText}</p>
  <small>${vm.lastMovementText}</small>
  <button ${vm.withdrawButtonEnabled ? "" : "disabled"}>Retirar</button>`;
```

El test del presentador comprueba todas las decisiones de presentación ("si el saldo es negativo, se marca en rojo"; "sin movimientos muestra el texto adecuado") sin navegador. La vista es tan simple que una revisión visual basta. Lo mismo aplica a componentes de React: un componente que solo recibe props ya formateadas es una vista humilde; la lógica de formato y de qué mostrar va en una función o un hook testeable.

#### Gateways de base de datos

Entre los casos de uso y la base de datos están los **gateways**: interfaces polimórficas con un método por cada operación de lectura o escritura que la aplicación necesita (por ejemplo, `lastNamesOfUsersWhoLoggedInAfter(date)`). No se permite SQL en la capa de casos de uso. La **implementación** del gateway, en la capa de base de datos, es el objeto humilde: simplemente ejecuta el SQL. Los interactores no son humildes (contienen reglas de la aplicación), pero son testeables porque los gateways se reemplazan por dobles de prueba.

#### Data mappers (los mal llamados ORM)

Martin hace una observación provocadora: **no existe tal cosa como un ORM** (object-relational mapper). Un **objeto**, desde el punto de vista de quien lo usa, es un conjunto de operaciones; sus datos son privados. Una **estructura de datos** es un conjunto de variables públicas sin comportamiento. Las herramientas llamadas ORM cargan datos de tablas en **estructuras de datos**, así que deberían llamarse **data mappers**. ¿Dónde viven? En la capa de base de datos: forman otro límite humilde entre las interfaces de gateway y la base de datos.

La consecuencia práctica en TypeScript: los tipos generados por tu ORM o tu cliente de base de datos son **estructuras de datos de la capa de infraestructura**; el adaptador los convierte en objetos del dominio. No los uses como entidades.

#### Listeners de servicios

Lo mismo ocurre con los servicios externos: la aplicación carga datos en estructuras simples y las pasa a módulos que les dan formato y las envían. En la entrada, los **listeners** reciben datos del servicio y los convierten en estructuras simples para la aplicación. En **cada límite arquitectónico** suele haber un humble object cerca, y la comunicación a través del límite casi siempre usa estructuras de datos simples.

### Límites parciales

Un límite arquitectónico **completo** es caro: interfaces polimórficas recíprocas (de entrada y de salida), estructuras de datos de entrada y salida, y toda la gestión de dependencias para que ambos lados se compilen y desplieguen por separado. Mucho trabajo de construir y de mantener. A veces un buen arquitecto juzga que el costo es demasiado alto, pero quiere **dejar reservado el lugar** por si el límite se necesita más adelante (en el espíritu de YAGNI: *you aren't going to need it*, pero sin cerrarse la puerta). Para eso están los **límites parciales**:

| Técnica | Cómo es | Qué ahorras | Qué riesgo corres |
| --- | --- | --- | --- |
| **Saltar el último paso** | Todo preparado como si fueran componentes independientes (interfaces, estructuras de datos), pero compilados y desplegados **juntos**. | El trabajo de versionar y desplegar por separado. | Con el tiempo, las dependencias empiezan a cruzar la línea porque nada lo impide físicamente. |
| **Límite unidimensional (Strategy)** | Una sola interfaz de un lado, que el cliente usa y el servicio implementa; sin la interfaz recíproca. | La mitad de la maquinaria. | Nada impide que el cliente use directamente la implementación; requiere disciplina. |
| **Fachada** | Una clase fachada que lista todos los servicios como métodos y delega en las clases de servicio; el cliente no las accede directamente. | Incluso la inversión de dependencias. | El cliente depende transitivamente de todas las clases de servicio; cualquier cambio en ellas obliga a recompilarlo. |

```
Saltar el último paso:     Unidimensional:                Fachada:
┌────────┬────────┐        Client ──▶ «ServiceBoundary»   Client ──▶ Facade ──▶ ServiceA
│ A │ ifc│ B      │                         ▲                                 ──▶ ServiceB
└────────┴────────┘                   ServiceImpl                             ──▶ ServiceC
(mismo paquete/despliegue)
```

En TypeScript, una forma sencilla de "saltar el último paso" es mantener dos carpetas con un `index.ts` cada una y una regla de lint que prohíba los imports internos cruzados, sin separarlas todavía en paquetes. Si el día de mañana hace falta, la separación física es casi mecánica.

### Capas y límites: el ejemplo de Hunt the Wumpus

Martin usa un juego de aventura de texto de los años 70, *Hunt the Wumpus*, como ejemplo pequeño (que obviamente no necesita Clean Architecture; es un sustituto de un sistema grande) para mostrar que los límites aparecen **en lugares inesperados**:

1. Primero, se separa la **interfaz de texto** de las **reglas del juego**: el juego no debería saber en qué idioma se juega. Las reglas se comunican con la interfaz mediante una API independiente del idioma, y la interfaz traduce a español, inglés o lo que sea.
2. Luego aparece otro eje: el **mecanismo de entrega** de esa interfaz (consola, SMS, chat). El idioma y el mecanismo de entrega cambian por razones distintas: otro límite.
3. Del lado de los datos, las reglas del juego no deberían saber **dónde se guarda** el estado (memoria, archivos, base de datos en la nube): otro límite.

```
   Español  Inglés            ← idiomas
       ╲    ╱
     API de texto              Consola  SMS     ← mecanismos de entrega
          │                        ╲   ╱
          ▼                         ▼
   ┌──────────────────────────────────────┐
   │        Reglas del juego (alto nivel)  │
   └──────────────────────────────────────┘
          ▲
   API de datos ◀── Memoria | Archivos | Nube   ← almacenamiento
```

Al profundizar, incluso las reglas del juego se separan en dos niveles: las de **movimiento** (que dependen del mapa) y una política de mayor nivel (salud, puntaje). Los datos fluyen por varios "streams" que conviene separar.

La lección: **hay límites potenciales por todas partes**. Un arquitecto debe reconocer cuándo se necesitan, saber que implementarlos completos es caro, y que **ignorarlos y agregarlos tarde es todavía más caro**, incluso con buenos tests y disciplina de refactorización.

#### Entonces, ¿qué hacer? Ver el futuro (inteligentemente)

La respuesta de Martin es honesta e incómoda:

- Por un lado, YAGNI tiene razón: el **sobrediseño suele ser peor que el subdiseño**.
- Por otro, descubrir tarde que necesitabas un límite donde no lo hay puede ser muy costoso.

El arquitecto debe **observar** la evolución del sistema, notar dónde podría hacer falta un límite y estar atento a la **primera señal de fricción** por su ausencia. En ese momento compara el costo de implementarlo con el de ignorarlo, y revisa esa decisión con frecuencia. El objetivo es implementar el límite **justo en el punto de inflexión** en que el costo de implementarlo se vuelve menor que el de ignorarlo.

Señales de fricción típicas:

- Los tests de reglas de negocio empiezan a necesitar base de datos o servidor.
- Un cambio cosmético en la interfaz rompe una regla.
- Dos equipos chocan constantemente en los mismos archivos.
- Aparece un segundo mecanismo de entrega (una app móvil además de la web) o un segundo almacenamiento.

### El componente Main

En todo sistema hay al menos un componente que **crea, coordina y supervisa** a los demás: **Main**. Es el **detalle más bajo de todos**, la política de más bajo nivel, el punto de entrada inicial. Nada depende de él, excepto el sistema operativo.

Su trabajo: crear todas las fábricas, estrategias y demás recursos globales, y luego **entregar el control** a las partes abstractas de alto nivel del sistema. Si usas un framework de inyección de dependencias, es en Main donde se inyectan las dependencias; desde ahí, Main las distribuye normalmente, sin que el resto del sistema conozca el framework.

Martin lo llama **el más sucio de los componentes sucios**. En el ejemplo de Hunt the Wumpus, Main carga todos los textos que el resto del código no debe conocer, crea el flujo de entrada, contiene el bucle principal que interpreta comandos simples y genera el mapa aleatorio, y delega todo el procesamiento a componentes de más alto nivel.

#### Main como plugin

Lo más útil: Main es un **plugin** de la aplicación que establece las condiciones iniciales y la configuración, reúne los recursos externos y entrega el control a la política de alto nivel. Como es un plugin, **puede haber varios**: uno para desarrollo, otro para tests, otro para producción; uno por país, por cliente o por jurisdicción. Pensar así hace mucho más fácil resolver el problema de la configuración.

```ts
// main.dev.ts — plugin para desarrollo
import { InMemoryAccounts } from "./accounts/infrastructure/in-memory-accounts";
import { ConsoleNotifier } from "./shared/infrastructure/console-notifier";
import { buildApp } from "./app";
buildApp({ accounts: new InMemoryAccounts(), notifier: new ConsoleNotifier(), clock: () => new Date() })
  .listen(3000);

// main.prod.ts — plugin para producción (lee configuración, abre conexiones reales)
// const db = new DatabaseSync(process.env.DB_PATH!);
// buildApp({ accounts: new SqliteAccounts(db), notifier: new SmtpNotifier(...), clock: () => new Date() })
//   .listen(Number(process.env.PORT));

// app.ts — no sabe qué entorno es: recibe sus dependencias
// export function buildApp(deps: AppDeps) { ... crea casos de uso y rutas con deps ... }
```

Reglas prácticas para tu `main` en TypeScript:

- Es el **único** lugar que lee `process.env` y que hace `new` de las implementaciones concretas.
- Es el único lugar que conoce el orden de los decoradores (logging, caché, reintentos) y de los middlewares.
- No contiene reglas de negocio.
- Puede haber un `main` por entorno o por punto de entrada (servidor HTTP, worker, CLI).
- Los tests de integración pueden tener su propio "main" que ensambla el sistema con dobles.

#### Configuración sin dolor

Ver Main como plugin resuelve uno de los problemas más molestos de los proyectos reales: la configuración. En lugar de que cada módulo lea variables de entorno por su cuenta (con nombres inconsistentes y valores por defecto escondidos), Main lee y **valida** toda la configuración una sola vez al arrancar, falla de inmediato con un mensaje claro si falta algo, y entrega a cada componente un objeto tipado con exactamente lo que necesita:

```ts
// config.ts — usado SOLO por los main
export function loadConfig(env: NodeJS.ProcessEnv) {
  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port)) throw new Error("PORT debe ser un entero");
  if (!env.DB_PATH) throw new Error("Falta DB_PATH");
  return { port, dbPath: env.DB_PATH, smtpHost: env.SMTP_HOST ?? "localhost" } as const;
}
```

Así, un error de configuración aparece en el primer segundo y no a las tres de la mañana cuando se ejecuta por primera vez la rama de código que leía la variable mal escrita.

### Todo junto: dónde están los humble objects

```
 Mundo exterior            Límite                          Núcleo testeable
 ────────────────          ─────────────────────           ─────────────────────────────
 Navegador / pantalla  ◀── Vista (humilde)   ◀── ViewModel ◀── Presenter ◀── Interactor
 Base de datos         ◀── Gateway SQL (humilde) ◀── interfaz Gateway ◀────── Interactor
 Servicio externo      ◀── Cliente HTTP (humilde) ◀── estructura simple ◀──── Interactor
 Cola de mensajes      ──▶ Listener (humilde) ──▶ estructura simple ──▶ InputBoundary
 Sistema operativo     ──▶ Main (el más sucio) ──▶ ensambla todo y entrega el control
```

### Analogía de construcción

El **humble object** es como separar el **tablero eléctrico** (lleno de lógica: circuitos, protecciones, temporizadores, que se prueban en banco) de los **enchufes y lámparas** (humildes, casi sin lógica, solo conectan). Un **límite parcial** es dejar un **ducto vacío** en la losa durante la obra: no instalas el cableado de la futura cocina del segundo piso, pero si algún día se necesita, no hay que romper el piso. Romper la losa después (agregar el límite tarde) es mucho más caro, pero llenar el edificio de ductos que nadie usará también lo es. Y **Main** es el **maestro de obra** del primer día: conoce a todos los proveedores, trae los materiales, organiza las cuadrillas y luego deja que cada especialidad haga su trabajo; puedes tener uno distinto para cada obra con los mismos planos.

### Errores comunes

- **Lógica de formato en la vista** (o en el componente de React): imposible de testear sin navegador.
- **Presentadores que acceden a la base de datos** o deciden reglas de negocio.
- **Usar los tipos del ORM como entidades del dominio.**
- **Límites completos en todas partes "por si acaso"**, o ningún límite hasta que el dolor es insoportable.
- **`process.env` y `new` de infraestructura dispersos** por todo el código en lugar de concentrados en Main.
- **Un único `main` con `if (env === "test")`** en lugar de un Main por configuración.

### Resumen

El patrón Humble Object separa lo difícil de testear (vistas, SQL, clientes de red, listeners) de lo testeable (presentadores, interactores), y esa separación suele marcar un límite arquitectónico; por esos límites viajan estructuras de datos simples, y los "ORM" son en realidad data mappers de la capa de base de datos. Los límites completos son caros, así que existen límites parciales (saltar el último paso, límite unidimensional, fachada) que reservan el lugar. Hay límites potenciales por todas partes, y el arquitecto debe implementarlos en el punto de inflexión en que el costo de agregarlos es menor que el de ignorarlos. Main es el componente más sucio y de más bajo nivel: crea y ensambla todo, entrega el control a las políticas y, como plugin, puede existir en varias versiones según la configuración.

## Conceptos clave

- **Humble Object**: patrón que separa los comportamientos difíciles de testear en un módulo mínimo y los testeables en otro.
- **Presentador y vista**: el presentador formatea los datos en un ViewModel testeable; la vista humilde solo los muestra.
- **Gateway**: interfaz polimórfica con las operaciones de datos que necesita la aplicación; su implementación SQL es humilde.
- **Data mapper**: herramienta que carga datos relacionales en estructuras de datos (lo que suele llamarse ORM).
- **Listener de servicio**: humble object que recibe datos de un servicio externo y los convierte en estructuras simples.
- **Límite parcial**: forma barata de reservar un límite (saltar el último paso, límite unidimensional, fachada).
- **YAGNI**: principio de no construir lo que todavía no se necesita.
- **Punto de inflexión**: momento en que implementar un límite cuesta menos que seguir ignorándolo.
- **Main**: componente de más bajo nivel que crea y conecta las implementaciones y entrega el control; un plugin por configuración.

## Preguntas de repaso

1. ¿En qué consiste el patrón Humble Object y por qué se relaciona con los límites arquitectónicos?
   R: Divide un comportamiento en un módulo humilde con lo difícil de testear reducido al mínimo y otro con todo lo testeable. Esa división suele coincidir con un límite arquitectónico (vista/presentador, gateway SQL/interactor), por donde cruzan estructuras de datos simples.
2. ¿Qué contiene un ViewModel y qué le queda por hacer a la vista?
   R: Todo lo que se muestra y la aplicación controla, como strings, booleanos o enums: textos de botones, fechas y montos formateados, flags de color o de habilitación, filas ya formateadas. A la vista solo le queda trasladar esos valores a la pantalla.
3. ¿Por qué dice Martin que no existe tal cosa como un ORM?
   R: Porque los objetos exponen operaciones y ocultan sus datos, mientras que esas herramientas cargan datos en estructuras de datos con campos públicos y sin comportamiento. Son data mappers, y pertenecen a la capa de base de datos como otro límite humilde.
4. Describe las tres formas de límite parcial y un riesgo de cada una.
   R: Saltar el último paso (preparar interfaces y estructuras pero compilar y desplegar juntos; riesgo: las dependencias cruzan la línea con el tiempo); límite unidimensional tipo Strategy (una sola interfaz; riesgo: el cliente puede saltársela); fachada (una clase que delega en los servicios; riesgo: el cliente depende transitivamente de todos ellos).
5. ¿Qué enseña el ejemplo de Hunt the Wumpus sobre los límites?
   R: Que aparecen en lugares inesperados (idioma de la interfaz, mecanismo de entrega, almacenamiento, distintos niveles de reglas); implementarlos todos es caro, pero ignorarlos y agregarlos tarde es aún más caro, así que hay que observar la fricción y actuar en el punto de inflexión.
6. ¿Por qué Main es "el más sucio" y por qué conviene verlo como un plugin?
   R: Porque es el detalle de más bajo nivel: conoce las implementaciones concretas, la configuración y los recursos externos, crea y conecta todo y entrega el control a las políticas. Verlo como plugin permite tener varios Main (desarrollo, test, producción, por país) sin cambiar el resto del sistema.

## Ejercicio

Toma el caso de uso de cotización de préstamos de la sesión anterior (o cualquier caso de uso tuyo) y: (a) extrae un presentador y un ViewModel, dejando una vista que solo interpole valores; (b) crea un gateway de datos con implementación en memoria y otra con `node:sqlite`, donde la de SQLite sea humilde (solo SQL y mapeo); (c) crea dos archivos `main` (`main.dev.ts` con dobles en memoria y `main.prod.ts` con SQLite y configuración leída de variables de entorno) que ensamblen el mismo `buildApp`; (d) deja un límite parcial "saltando el último paso" entre dos funcionalidades con una regla de lint. **Terminado cuando:** el presentador tiene al menos 4 tests de formato, la vista no contiene condicionales salvo los que leen flags del ViewModel, `process.env` solo aparece en los archivos `main`, y ambos `main` arrancan la aplicación sin cambiar ningún otro archivo.

## Explícalo con tus palabras

Explica con la analogía del tablero eléctrico, los ductos vacíos y el maestro de obra qué son un humble object, un límite parcial y el componente Main.
