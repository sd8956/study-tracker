---
title: Los tres paradigmas y lo que le quitan al programador
kind: lesson
hours: 2
sources: Clean Architecture, parte II, caps. 3–6 (pp. 37–61)
---

## Objetivo

Comprender qué aporta cada paradigma (estructurado, orientado a objetos y funcional) a la arquitectura: descomposición funcional y testabilidad, polimorfismo e inversión de dependencias, e inmutabilidad para controlar la concurrencia.

## Estudio

### Los paradigmas quitan, no dan

Un paradigma es una forma de programar que te dice qué estructuras usar y cuándo. Lo curioso es que los tres grandes paradigmas no te dieron nuevos poderes: cada uno te **quitó** algo y, a cambio, te impuso una disciplina.

| Paradigma | Descubierto | Qué te quita | Disciplina que impone |
| --- | --- | --- | --- |
| Estructurado | Dijkstra, 1968 | El `goto` sin restricciones | Disciplina sobre la **transferencia directa** de control |
| Orientado a objetos | Dahl y Nygaard, 1966 | Los punteros a funciones "a mano" | Disciplina sobre la **transferencia indirecta** de control |
| Funcional | Church, 1936 (cálculo lambda) | La asignación libre | Disciplina sobre la **asignación** |

El orden de adopción fue distinto del orden de invención: el funcional se inventó primero (incluso antes de que existieran las computadoras) y se adoptó al final. Martin argumenta que probablemente no haya más paradigmas: después de quitar `goto`, punteros a función y asignación, no queda mucho más que quitar.

¿Y qué tiene que ver esto con la arquitectura? Mucho: **usamos el polimorfismo para cruzar límites arquitectónicos, la programación funcional para disciplinar dónde vive el estado y la programación estructurada como base algorítmica de cada módulo**. Las tres preocupaciones de la arquitectura (función, separación de componentes y gestión de datos) se alinean con los tres paradigmas.

### Programación estructurada: de la prueba a la ciencia

Dijkstra quería tratar la programación como matemática: demostrar que un programa era correcto, igual que se demuestra un teorema. Descubrió que ciertos usos de `goto` hacían imposible descomponer un programa en unidades demostrables, mientras que otros (los que equivalen a secuencia, selección e iteración) sí lo permitían. Otros investigadores ya habían demostrado que **cualquier programa se puede construir con solo esas tres estructuras**. De ahí salió la idea de eliminar el `goto` libre: lo que no se puede descomponer, no se puede razonar.

Las pruebas formales nunca se popularizaron, pero la idea sobrevivió de otra forma. La ciencia no demuestra que una teoría es verdadera; demuestra que es falsa cuando un experimento la contradice. Los **tests** funcionan igual: un test no prueba que tu código sea correcto, solo puede mostrar que es incorrecto. Lo que hace valiosa a la programación estructurada es que te permite descomponer el sistema en funciones pequeñas y **falsables**, cada una con sus propios tests.

```ts
// Una función pequeña, con entrada y salida claras, es falsable:
export function isLeapYear(y: number): boolean {
  if (y % 400 === 0) return true;
  if (y % 100 === 0) return false;
  return y % 4 === 0;
}

// Cada test es un experimento que podría refutarla.
import { expect, test } from "vitest";
test("1900 no es bisiesto", () => expect(isLeapYear(1900)).toBe(false));
test("2000 sí es bisiesto", () => expect(isLeapYear(2000)).toBe(true));
```

**Lección arquitectónica:** a todos los niveles, desde la función más pequeña hasta el componente más grande, el software es como una ciencia: se impulsa por la posibilidad de refutar. Los arquitectos buscan módulos, componentes y servicios que sean fáciles de falsar, es decir, fáciles de testear.

### Orientación a objetos: ¿qué la define de verdad?

Se suele decir que OO es "combinar datos y funciones" o "modelar el mundo real", pero ninguna de las dos respuestas es precisa: `o.f()` no es esencialmente distinto de `f(o)`, y "modelar el mundo real" no dice nada técnico. Otra respuesta típica son las tres palabras mágicas: **encapsulamiento, herencia y polimorfismo**. Revisemos cada una.

#### Encapsulamiento

En C ya existía encapsulamiento perfecto: declarabas un `struct Point` opaco y las funciones `makePoint` y `distance` en un header, y quien usaba el header no sabía qué campos tenía el punto. Lenguajes como C++ obligaron a declarar los campos en el header, y Java o C# eliminaron la separación entre declaración e implementación. Es decir, varios lenguajes OO **debilitaron** el encapsulamiento en vez de mejorarlo. En TypeScript ocurre algo parecido: `private` es una comprobación del compilador, y en tiempo de ejecución el campo sigue ahí (salvo que uses campos `#privados`).

**Puntuación para OO:** cero en encapsulamiento.

#### Herencia

En C se podía simular herencia colocando los campos de un `struct` derivado en el mismo orden que el base y haciendo un cast. Funcionaba, pero era un truco incómodo y la herencia múltiple era casi imposible. Los lenguajes OO lo hicieron cómodo y seguro.

**Puntuación:** medio punto.

#### Polimorfismo

Aquí está lo interesante. Las funciones `getchar()` y `putchar()` de UNIX ya eran polimórficas: leían y escribían en `STDIN` y `STDOUT` sin saber si era una consola, un archivo o una red. ¿Cómo? Cada driver de dispositivo llenaba una estructura con punteros a sus funciones `open`, `close`, `read`, `write` y `seek`. Llamar a `read` era seguir un puntero. Los lenguajes OO hacen exactamente eso con las vtables, pero **eliminan las convenciones manuales y peligrosas** de inicializar y llamar punteros a función.

```ts
// Lo que OO te da gratis: una "tabla de punteros" segura
interface Device {
  read(): string | null;
  write(c: string): void;
}

class Console implements Device {
  read() { return "x"; }
  write(c: string) { process.stdout.write(c); }
}

class InMemory implements Device {
  constructor(private input: string[], public output: string[] = []) {}
  read() { return this.input.shift() ?? null; }
  write(c: string) { this.output.push(c); }
}

// El programa de copia no sabe con qué dispositivo trabaja
export function copy(input: Device, output: Device) {
  let c: string | null;
  while ((c = input.read()) !== null) output.write(c);
}
```

¿Por qué esto es tan valioso? Porque el programa `copy` no necesita cambiar ni recompilarse cuando aparece un dispositivo nuevo. UNIX hizo que los dispositivos fueran **plugins** del programa. Esa es la semilla de toda la arquitectura de plugins que verás en Clean Architecture.

#### Inversión de dependencias: el verdadero poder

Sin polimorfismo seguro, el flujo de control y las dependencias del código fuente van en la misma dirección: `main` llama a funciones de alto nivel, que llaman a funciones de nivel medio, que llaman a funciones de bajo nivel, y cada uno **importa** al siguiente. La arquitectura queda dictada por el flujo de control.

```
Sin inversión:
  HighLevel ──importa──▶ LowLevel        (el control también va HL → LL)

Con inversión:
  HighLevel ──importa──▶ «interface» Port ◀──implementa── LowLevel
           (el control sigue yendo HL → LL, pero la dependencia apunta al revés)
```

Con una interfaz en medio, el módulo de alto nivel llama al de bajo nivel en tiempo de ejecución, pero en el **código fuente** el de bajo nivel depende de la interfaz que define el de alto nivel. Puedes invertir cualquier dependencia del sistema. Esto le da al arquitecto **control absoluto sobre la dirección de todas las dependencias del código fuente**.

Consecuencias prácticas:

- Las reglas de negocio pueden no depender de la interfaz de usuario ni de la base de datos: estas se vuelven plugins.
- Cada plugin se puede compilar y desplegar por separado (**despliegue independiente**).
- Cada equipo puede trabajar en su módulo sin pisar al resto (**desarrollo independiente**).

**Definición arquitectónica de OO:** la capacidad, mediante el polimorfismo, de controlar la dirección de cada dependencia del código fuente para crear una arquitectura de plugins, donde los módulos de alto nivel son independientes de los detalles de bajo nivel.

### Programación funcional: el problema es la asignación

El ejemplo clásico: imprimir los cuadrados de los primeros 25 enteros. En estilo imperativo usas una variable que cambia en cada vuelta; en estilo funcional describes una transformación sin mutar nada.

```ts
// Imperativo: una variable mutable
for (let i = 0; i < 25; i++) console.log(i * i);

// Funcional: valores que no cambian
const squares = Array.from({ length: 25 }, (_, i) => i * i);
squares.forEach((n) => console.log(n));
```

¿Por qué importa a un arquitecto? Porque **todas las condiciones de carrera, deadlocks y problemas de actualización concurrente se deben a variables mutables**. Si nada cambia, no hay carreras. Sin embargo, la inmutabilidad total solo es práctica con almacenamiento y potencia de cómputo infinitos, así que necesitas un compromiso.

#### Segregación de la mutabilidad

La estrategia razonable es separar el sistema en dos tipos de componentes:

```
┌────────────────────────────────┐        ┌───────────────────────────┐
│  Componentes inmutables         │ ─────▶ │ Componentes mutables       │
│  (lógica pura, la mayor parte)  │        │ (estado, protegido por     │
│                                 │        │  transacciones/locks)      │
└────────────────────────────────┘        └───────────────────────────┘
```

Pon la mayor cantidad de lógica posible en funciones puras y empuja el estado mutable a un borde pequeño, protegido por transacciones o mecanismos atómicos. Es la misma idea de "functional core, imperative shell".

```ts
// Núcleo funcional: puro, trivial de testear
export function applyDeposit(balance: number, amount: number): number {
  if (amount <= 0) throw new Error("El depósito debe ser positivo");
  return balance + amount;
}

// Borde imperativo: el único lugar que muta estado compartido
export class AccountStore {
  private balances = new Map<string, number>();
  deposit(id: string, amount: number) {
    const current = this.balances.get(id) ?? 0;
    this.balances.set(id, applyDeposit(current, amount)); // mutación aislada
  }
}
```

#### Event sourcing

Llevado al extremo, en lugar de guardar el estado actual guardas las **transacciones** (eventos) y calculas el estado sumándolas cuando lo necesitas. Un banco no necesita guardar "saldo = 300": puede guardar "depósito 500", "retiro 200" y derivar el saldo. Así nada se actualiza ni se borra; solo se agregan eventos. Para no recalcular desde el principio, puedes guardar fotos periódicas (snapshots). Es como un sistema de control de versiones: tu código fuente actual es la suma de todos los commits.

```ts
type Event =
  | { type: "Deposited"; amount: number }
  | { type: "Withdrew"; amount: number };

export const balanceOf = (events: readonly Event[]) =>
  events.reduce(
    (b, e) => (e.type === "Deposited" ? b + e.amount : b - e.amount),
    0,
  );
```

### Lo que te llevas de cada paradigma

| Paradigma | Herramienta arquitectónica | Pregunta que te hace |
| --- | --- | --- |
| Estructurado | Descomposición funcional en unidades falsables | ¿Puedo testear esta pieza por separado? |
| OO | Polimorfismo para invertir dependencias y crear plugins | ¿Hacia dónde apuntan mis imports? |
| Funcional | Inmutabilidad y segregación de la mutabilidad | ¿Dónde vive el estado y quién puede cambiarlo? |

No compiten: un buen sistema en TypeScript usa los tres. Funciones pequeñas y testeables, interfaces para invertir dependencias en los límites y datos inmutables en el núcleo.

### Analogía de construcción

Piensa en un edificio. La programación estructurada es la regla de que cada piso se construye con elementos estándar (vigas, columnas, losas) que un ingeniero puede calcular por separado. La orientación a objetos son los enchufes y tomas estandarizadas: el edificio define la forma del enchufe, y cualquier aparato que cumpla la norma se conecta sin rehacer la instalación. La programación funcional es la idea de que los planos aprobados no se modifican: si cambias algo, emites una nueva revisión y conservas el historial.

### Cuándo usar cada enfoque

| Situación | Enfoque recomendado | Por qué |
| --- | --- | --- |
| Cálculos de negocio (precios, impuestos, reglas) | Funciones puras | Fáciles de testear, sin efectos laterales |
| Integración con base de datos, APIs, colas | Interfaz + implementación (OO) | Permite invertir la dependencia y cambiar el detalle |
| Estado compartido entre peticiones concurrentes | Borde mutable pequeño, transacciones | Limita las condiciones de carrera |
| Auditoría o historial completo | Event sourcing | El historial es la fuente de verdad |
| Script de un solo uso | Lo más simple posible | La arquitectura no se paga en código descartable |

### Los tres paradigmas en un mismo servicio

Para que veas que no son teoría separada, imagina un servicio de reservas de salas de reuniones. Así se reparte el trabajo entre paradigmas:

```
          HTTP / CLI (detalle)
                 │
                 ▼
     ┌───────────────────────┐
     │ Caso de uso            │  estructurado: secuencia clara de pasos
     │ reserveRoom()          │  (validar → calcular → guardar → notificar)
     └──────────┬────────────┘
                │ usa
     ┌──────────▼────────────┐      ┌──────────────────────────┐
     │ Núcleo puro            │      │ «interface» RoomStore     │ OO: el caso de
     │ overlaps(), price()    │      │ «interface» Notifier      │ uso depende de
     │ funcional: sin estado  │      └───────────▲──────────────┘ interfaces
     └───────────────────────┘                  │ implementan
                                    ┌───────────┴──────────────┐
                                    │ PostgresRoomStore         │ borde mutable,
                                    │ EmailNotifier             │ protegido por
                                    └──────────────────────────┘ transacciones
```

```ts
// Núcleo funcional
export interface Slot { start: number; end: number }
export const overlaps = (a: Slot, b: Slot) => a.start < b.end && b.start < a.end;

// Puertos (OO): el caso de uso define lo que necesita
export interface RoomStore {
  bookingsFor(roomId: string): Promise<Slot[]>;
  add(roomId: string, slot: Slot): Promise<void>;
}
export interface Notifier { send(to: string, text: string): Promise<void> }

// Caso de uso (estructurado: secuencia, selección)
export async function reserveRoom(
  roomId: string, slot: Slot, user: string,
  store: RoomStore, notifier: Notifier,
) {
  const existing = await store.bookingsFor(roomId);
  if (existing.some((b) => overlaps(b, slot))) {
    throw new Error("La sala ya está ocupada en ese horario");
  }
  await store.add(roomId, slot);
  await notifier.send(user, `Reserva confirmada para ${roomId}`);
}
```

Fíjate en tres cosas. Primero, `overlaps` se testea con dos objetos literales, sin mocks: es pura. Segundo, `reserveRoom` se testea con implementaciones en memoria de `RoomStore` y `Notifier`, gracias al polimorfismo. Tercero, la única parte con estado compartido (y por tanto con riesgo de carreras, como dos reservas simultáneas de la misma sala) es el adaptador de persistencia, que es justo donde pondrás una transacción o una restricción única en la base de datos. Cada paradigma resuelve un problema distinto en el lugar donde mejor encaja.

### Una pregunta para cada revisión de código

Cuando revises código propio o ajeno, puedes usar los tres paradigmas como una lista rápida: ¿esta función se puede probar sola con datos de entrada y salida claros? (estructurado); ¿los imports de las reglas apuntan a interfaces o a librerías concretas? (orientado a objetos); ¿dónde se modifica estado y quién más lo lee al mismo tiempo? (funcional). Tres preguntas, un minuto, y detectas la mayoría de los problemas de diseño antes de que lleguen a producción.

### Errores comunes

- **Pensar que usar clases ya es OO.** Si tus clases solo agrupan funciones y todos los imports apuntan hacia la base de datos, no estás aprovechando la inversión de dependencias.
- **Abusar de la herencia para reutilizar código.** El valor de OO está en el polimorfismo a través de interfaces, no en jerarquías profundas.
- **Inmutabilidad dogmática.** Copiar estructuras enormes en cada operación puede ser lento; aísla la mutabilidad en lugar de prohibirla.
- **Event sourcing por moda.** Añade complejidad (versionado de eventos, proyecciones); úsalo cuando el historial tenga valor de negocio.
- **Creer que los tests demuestran corrección.** Solo pueden demostrar que algo está mal; por eso necesitas unidades pequeñas y muchos experimentos bien elegidos.

### Resumen

Los paradigmas son disciplinas: el estructurado restringe el salto directo y nos dio unidades testeables; el OO restringe el salto indirecto, nos dio polimorfismo seguro y con él el control sobre la dirección de las dependencias; el funcional restringe la asignación y nos da sistemas sin carreras cuando segregamos la mutabilidad. La arquitectura moderna usa los tres a la vez.

## Conceptos clave

- **Paradigma**: disciplina que restringe una capacidad del programador para producir programas más ordenados.
- **Falsabilidad**: propiedad de una unidad de código de poder ser refutada por un test; los tests muestran errores, no corrección.
- **Polimorfismo**: llamar a una operación sin conocer qué implementación concreta se ejecutará.
- **Inversión de dependencias**: hacer que la dependencia del código fuente apunte en sentido contrario al flujo de control mediante una interfaz.
- **Arquitectura de plugins**: el núcleo define interfaces y los detalles las implementan, de modo que se pueden reemplazar sin tocar el núcleo.
- **Segregación de la mutabilidad**: separar componentes puros de los pocos componentes que gestionan estado mutable.
- **Event sourcing**: guardar los eventos que ocurrieron en lugar del estado actual y derivar el estado a partir de ellos.

## Preguntas de repaso

1. ¿Qué tienen en común los tres paradigmas?
   R: Que cada uno quita una capacidad al programador e impone una disciplina: el estructurado restringe el `goto` (control directo), el OO restringe los punteros a función manuales (control indirecto) y el funcional restringe la asignación.
2. ¿Por qué se dice que un test no demuestra que el código es correcto?
   R: Porque, como en la ciencia, un experimento solo puede refutar una hipótesis. Un test que pasa muestra que no encontró el error en ese caso; uno que falla demuestra que hay un error. Por eso conviene descomponer el sistema en unidades pequeñas y falsables.
3. ¿Qué aporta realmente OO a la arquitectura según Clean Architecture?
   R: Polimorfismo seguro y cómodo, que permite invertir cualquier dependencia del código fuente con una interfaz. Así el arquitecto controla la dirección de las dependencias y puede convertir la UI y la base de datos en plugins de las reglas de negocio.
4. ¿Cómo funcionaba el polimorfismo antes de los lenguajes OO y qué problema tenía?
   R: Con estructuras de punteros a funciones, como los drivers de UNIX con `open`, `read`, `write`. Funcionaba, pero dependía de convenciones manuales para inicializar y llamar los punteros; un olvido producía bugs muy difíciles de encontrar. Los lenguajes OO eliminaron ese riesgo.
5. ¿Por qué le interesa la inmutabilidad a un arquitecto?
   R: Porque las condiciones de carrera, los deadlocks y las actualizaciones concurrentes defectuosas se deben a variables mutables. Si la mayor parte del sistema es inmutable y el estado se aísla en pocos componentes protegidos, desaparece buena parte de los problemas de concurrencia.
6. ¿Qué es event sourcing y qué analogía cotidiana lo explica?
   R: Guardar los eventos (transacciones) en lugar del estado actual y calcular el estado sumándolos. Es como el historial de commits de git: el código actual es el resultado de aplicar todos los cambios en orden.

## Ejercicio

Implementa en TypeScript un pequeño monedero con event sourcing: tipos de eventos `Deposited` y `Withdrew`, una función pura `balanceOf(events)`, una función pura `withdraw(events, amount)` que devuelve un nuevo evento o lanza un error si no hay saldo, y una clase `WalletStore` que es el único lugar que agrega eventos a un arreglo. Escribe tests con Vitest para las funciones puras. **Terminado cuando:** las funciones puras no mutan sus argumentos (compruébalo con `Object.freeze` en los tests), hay al menos 5 tests que pasan y la única mutación del programa está en `WalletStore`.

## Explícalo con tus palabras

Explica en un minuto por qué "OO es polimorfismo para invertir dependencias" es una definición más útil para un arquitecto que "OO es modelar el mundo real".
