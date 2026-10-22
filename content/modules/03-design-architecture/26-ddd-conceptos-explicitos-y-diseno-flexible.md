---
title: "DDD IV: hacer explícitos los conceptos implícitos, Specification y diseño flexible"
kind: lesson
hours: 2
sources: Domain-Driven Design (Evans), parte III, introducción y cap. 8 "Breakthrough" (pp. 133–144) | Domain-Driven Design (Evans), cap. 9 "Making Implicit Concepts Explicit" (pp. 145–169) | Domain-Driven Design (Evans), cap. 10 "Supple Design" (pp. 170–206)
links: Martin Fowler y Eric Evans, "Specifications" (PDF) | https://www.martinfowler.com/apsupp/spec.pdf
---

## Objetivo

Aprender a profundizar un modelo descubriendo conceptos implícitos (escuchando el lenguaje, notando la incomodidad, contemplando contradicciones), modelar reglas con el patrón **Specification** y aplicar los patrones de **diseño flexible** (supple design): interfaces que revelan la intención, funciones sin efectos secundarios, aserciones, contornos conceptuales, clases independientes y cierre de operaciones.

## Estudio

### Refactorizar hacia una comprensión más profunda

Los bloques de construcción (entidades, value objects, agregados) no garantizan un buen modelo. Los modelos útiles casi nunca salen a la primera: aparecen tras muchas iteraciones de refactorización guiadas por una comprensión cada vez más profunda del dominio. Evans distingue entre:

- **Refactorizaciones técnicas** (micro): renombrar, extraer métodos, aplicar un patrón. Son importantes pero no cambian el entendimiento del dominio.
- **Refactorizaciones hacia un modelo más profundo**: cambios que aparecen cuando el equipo **entiende mejor el negocio** y el modelo se transforma para reflejarlo.

#### El salto (breakthrough)

Evans relata un proyecto de préstamos sindicados (varios bancos prestan juntos a una empresa). Durante meses el modelo trataba las participaciones de cada banco como atributos de un préstamo, y cada nueva regla de pagos y comisiones complicaba el código. Hasta que, conversando con los expertos, el equipo entendió que las participaciones (las "acciones" de cada banco en una operación) eran un concepto propio, con su propia aritmética, que se aplicaba igual a préstamos, comisiones y pagos. Al hacer explícito ese concepto, muchas reglas complicadas se volvieron casos simples de una misma idea.

Lecciones del episodio:

- Los saltos no se planifican; aparecen cuando el equipo **sigue refactorizando** y conversando con los expertos.
- Suelen llegar **después** de muchas pequeñas mejoras, que preparan el terreno.
- Un salto puede implicar un cambio grande: hay que evaluar el riesgo, pero muchas veces vale la pena porque desbloquea el futuro del proyecto.
- No hay que paralizarse buscando el salto perfecto; hay que mantener el diseño limpio para que, cuando llegue la idea, se pueda aplicar.

### Hacer explícitos los conceptos implícitos

Un modelo profundo tiene conceptos que expresan lo esencial del dominio. Muchos de ellos están **implícitos** al principio: en el código, en una conversación, en un documento. ¿Cómo encontrarlos?

| Técnica | En qué consiste | Ejemplo |
| --- | --- | --- |
| **Escuchar el lenguaje** | Prestar atención a los términos que usan los expertos y que no están en el modelo, o a las frases que corrigen las tuyas. | El experto dice "¿y el *itinerario*?" cuando tú hablas de "lista de tramos". Falta un concepto. |
| **Examinar la incomodidad** | Las partes del diseño más complicadas, difíciles de explicar o que cambian todo el tiempo esconden algo. | Un método con siete `if` sobre fechas y tasas: probablemente falta un objeto. |
| **Contemplar contradicciones** | Dos expertos dicen cosas que parecen contradictorias; a menudo ambos tienen razón desde perspectivas distintas. | Uno dice que el interés se calcula diario y otro que es mensual: hay una política de devengo y otra de cobro. |
| **Leer el libro** | Consultar la literatura del dominio (contabilidad, logística). Muchos conceptos ya están bien definidos. | Los principios contables te dan "asiento", "cuenta", "partida doble". |
| **Probar una y otra vez** | Experimentar con modelos alternativos en código pequeño; descartar sin miedo. | Tres versiones del cálculo de comisiones en una tarde. |

#### Categorías de conceptos menos obvios

Además de las "cosas" del dominio, hay conceptos que es fácil pasar por alto:

- **Restricciones explícitas**: una regla que hoy vive en un `if` dentro de un método puede merecer su propio método o su propio objeto, con un nombre del dominio. `bucket.add(amount)` con un `if` sobre la capacidad se vuelve más claro con `isWithinCapacity()` explícito.
- **Procesos como objetos del dominio**: si el negocio habla de un procedimiento ("el proceso de enrutamiento"), puede ser un servicio o un objeto. La clave es si los expertos lo nombran.
- **Especificaciones**: reglas que **evalúan si algo cumple un criterio**. Merecen su propio patrón.

### El patrón Specification

En casi todos los dominios hay reglas booleanas: "¿esta factura está vencida?", "¿este cliente es elegible para crédito?", "¿esta carga necesita contenedor refrigerado?". Ponerlas como métodos de la entidad (`invoice.isOverdue()`) funciona hasta que la regla se complica, depende de otros objetos o cambia según el contexto. Ponerlas en la capa de aplicación las saca del dominio.

Una **SPECIFICATION** es un value object (o una función) que **evalúa si otro objeto cumple ciertos criterios**: un predicado con nombre del dominio.

```ts
export interface Specification<T> {
  isSatisfiedBy(candidate: T): boolean;
  and(other: Specification<T>): Specification<T>;
  or(other: Specification<T>): Specification<T>;
  not(): Specification<T>;
}

export abstract class BaseSpec<T> implements Specification<T> {
  abstract isSatisfiedBy(c: T): boolean;
  and(o: Specification<T>): Specification<T> { return spec((c) => this.isSatisfiedBy(c) && o.isSatisfiedBy(c)); }
  or(o: Specification<T>): Specification<T> { return spec((c) => this.isSatisfiedBy(c) || o.isSatisfiedBy(c)); }
  not(): Specification<T> { return spec((c) => !this.isSatisfiedBy(c)); }
}

export const spec = <T>(fn: (c: T) => boolean): Specification<T> =>
  new (class extends BaseSpec<T> { isSatisfiedBy = fn; })();

// Especificaciones del dominio de facturación
interface Invoice { dueDate: Date; amountDue: number; customerTier: "regular" | "vip" }

export const overdue = (today: Date, graceDays: number) =>
  spec<Invoice>((i) => i.amountDue > 0 && today.getTime() - i.dueDate.getTime() > graceDays * 86_400_000);
export const vipCustomer = spec<Invoice>((i) => i.customerTier === "vip");

// "Enviar a cobranza: vencidas con más de 30 días de gracia, salvo clientes VIP"
export const sendToCollections = (today: Date) => overdue(today, 30).and(vipCustomer.not());
```

#### Los tres usos de Specification

1. **Validación**: comprobar si un objeto cumple un criterio (`isSatisfiedBy`).
2. **Selección (consulta)**: elegir de una colección los objetos que cumplen el criterio. Un repositorio puede aceptar una especificación: `invoices.matching(sendToCollections(today))`. En la implementación, la especificación puede traducirse a una consulta SQL, manteniendo la regla en el dominio.
3. **Construcción a pedido (generación)**: describir qué debe cumplir un objeto que todavía no existe, y que un generador lo cree. Ejemplo de Evans: una especificación de qué contenedores necesita una carga química (ventilado, reforzado) que un empaquetador usa para asignar contenedores.

Fíjate en que la combinación con `and`, `or` y `not` forma un **Composite** (sesión 7) y que el resultado de combinar especificaciones es otra especificación: eso es el **cierre de operaciones**, que verás a continuación.

### Diseño flexible (supple design)

El propósito final del software es servir a los usuarios, pero **primero tiene que servir a los desarrolladores**. Cuando un diseño complejo no es claro, los desarrolladores temen tocarlo, aparecen duplicaciones por miedo a romper algo y el proyecto se frena. Un diseño **flexible** (supple) invita al cambio: es fácil de entender, revela el modelo y sus efectos son obvios.

Evans advierte que mucha sobreingeniería se ha justificado en nombre de la flexibilidad. El diseño flexible no es agregar capas de abstracción; suele ser **simple**, aunque lo simple no es fácil. Sirve a dos roles: el desarrollador **cliente**, que usa los objetos del dominio, y el desarrollador que **cambia** el diseño.

#### 1. Interfaces que revelan la intención

Si para usar un objeto tienes que leer su implementación, se pierde el valor del encapsulamiento. Nombra clases y operaciones según **su efecto y su propósito**, no según cómo lo hacen, usando el lenguaje ubicuo. Escribe primero un test que use la operación **como la usaría un cliente**, para forzar un nombre desde ese punto de vista.

```ts
// ❌ Revela el mecanismo
paint.mix(otherPaint);            // ¿qué hace exactamente? ¿cambia paint? ¿devuelve algo?
// ✅ Revela la intención
const result = paint.mixedWith(otherPaint); // devuelve una pintura nueva, el original no cambia
```

#### 2. Funciones sin efectos secundarios

Separa las operaciones en **comandos** (cambian el estado) y **consultas** (devuelven información sin cambiar nada). Pon tanta lógica como puedas en **funciones** sin efectos secundarios, especialmente en **value objects**, porque se pueden combinar y testear sin miedo. Los comandos deben ser simples y no devolver información del dominio. Ejemplo de Evans: la mezcla de pinturas se vuelve mucho más clara cuando el cálculo del color resultante es una función pura de un value object `PigmentColor`, y la pintura (entidad) solo reemplaza su color con el resultado.

#### 3. Aserciones

Cuando quedan efectos secundarios, hazlos **explícitos**: declara las **postcondiciones** de las operaciones y las **invariantes** de clases y agregados. Si el lenguaje no lo soporta, exprésalas en **tests automatizados** y en la documentación. Así, quien usa la operación sabe qué esperar sin leer el código.

```ts
import { expect, test } from "vitest";
test("mezclar pinturas: el volumen resultante es la suma y los originales no cambian", () => {
  const a = Paint.of(1, Color.yellow()); const b = Paint.of(2, Color.blue());
  const c = a.mixedWith(b);
  expect(c.volume).toBe(3);                 // postcondición
  expect(a.volume).toBe(1);                 // sin efectos secundarios
});
declare const Paint: { of(v: number, c: unknown): { volume: number; mixedWith(o: unknown): { volume: number } } };
declare const Color: { yellow(): unknown; blue(): unknown };
```

#### 4. Contornos conceptuales

Hay una tensión al dividir el código: piezas demasiado grandes (monolíticas) obligan a duplicar; piezas demasiado pequeñas obligan al cliente a entender cómo se combinan. La pista de Evans es buscar los **contornos conceptuales** del dominio: descomponer siguiendo las líneas naturales de división del negocio, de modo que los cambios frecuentes caigan dentro de un objeto y no lo atraviesen. Si cada cambio de requisitos obliga a tocar muchos objetos, los cortes no siguen los contornos del dominio. (Es el CCP de la sesión 13, visto desde el modelo.)

#### 5. Clases independientes

Cada dependencia es una carga mental: para entender una clase hay que entender aquello de lo que depende. Esfuérzate por que los conceptos más intrincados sean **clases independientes** (standalone), que dependan solo de primitivos y de sí mismas o de unos pocos value objects básicos. Un `Money` o un `DateRange` sin dependencias son fáciles de entender, testear y reutilizar. Elimina toda dependencia que no sea esencial para el concepto.

#### 6. Cierre de operaciones

Cuando sea posible, define operaciones cuyo **tipo de retorno sea el mismo que el de sus argumentos**, como la suma de números. Así las operaciones se pueden encadenar sin introducir conceptos nuevos: `money.add(money)` devuelve `Money`, `spec.and(spec)` devuelve `Specification`, `range.intersect(range)` devuelve un `DateRange`. Es habitual en value objects y reduce mucho la carga mental.

```ts
// Cierre de operaciones: DateRange → DateRange
class Range {
  constructor(readonly start: number, readonly end: number) { if (end < start) throw new Error("Rango inválido"); }
  intersect(o: Range): Range | null {
    const s = Math.max(this.start, o.start), e = Math.min(this.end, o.end);
    return s <= e ? new Range(s, e) : null;
  }
  span(o: Range): Range { return new Range(Math.min(this.start, o.start), Math.max(this.end, o.end)); }
}
```

#### Diseño declarativo

Combinando todo lo anterior, el código del cliente puede leerse casi como una **declaración** de las reglas del negocio: `overdue(today, 30).and(vipCustomer.not())`. Evans es cauto con los frameworks de "diseño declarativo" que generan código a partir de reglas (suelen limitar más de lo que ayudan), pero celebra el **estilo** declarativo que emerge de un modelo flexible.

#### Ataques al problema

Evans termina con consejos prácticos para aplicar estas ideas: **separa subdominios** y trabaja primero en uno; y **apóyate en formalismos establecidos** cuando puedas (aritmética, lógica de predicados, contabilidad de partida doble): son modelos probados durante siglos.

### Patrones de diseño y modelo (cap. 12, en breve)

Evans dedica un capítulo a mostrar que algunos patrones de GoF pueden ser **patrones de dominio** si representan conceptos del negocio: un **Strategy** se convierte en una **POLICY** (política) cuando el negocio habla de "la política de enrutamiento" o "la política de sobreventa", y un **Composite** es natural cuando el dominio tiene jerarquías parte-todo (una ruta compuesta de tramos que a su vez son rutas). La diferencia con su uso puramente técnico es que el nombre y la estructura salen del lenguaje ubicuo.

### Un caso pequeño: de la incomodidad al concepto

Imagina este método en un sistema de suscripciones, que cada mes recibe un parche nuevo:

```ts
function monthlyCharge(sub: { plan: "basic" | "pro"; startedAt: Date; seats: number; coupon?: string }, today: Date) {
  let price = sub.plan === "basic" ? 10 : 30;
  price = price * sub.seats;
  const months = (today.getFullYear() - sub.startedAt.getFullYear()) * 12 + today.getMonth() - sub.startedAt.getMonth();
  if (months < 3 && sub.plan === "pro") price = price * 0.5;      // promo de bienvenida
  if (sub.coupon === "EDU") price = price * 0.7;
  if (sub.coupon === "EDU" && months < 3 && sub.plan === "pro") price = price / 0.5 * 0.7; // ¿?
  if (sub.seats > 10) price = price * 0.9;
  return Math.round(price * 100) / 100;
}
```

Aplica las técnicas de la sesión:

1. **Examina la incomodidad.** La penúltima línea es sospechosa: alguien está "deshaciendo" un descuento para aplicar otro. Hay una regla escondida sobre **cómo se combinan** los descuentos.
2. **Escucha el lenguaje.** Al preguntarle al equipo de producto, dicen: "los **beneficios** no se acumulan, salvo el de **volumen**; si hay varios, se aplica el **mejor**". Tres conceptos que no existen en el código: beneficio, acumulable, el mejor.
3. **Haz explícitos los conceptos.** Un `Benefit` con una especificación de elegibilidad (`appliesTo(sub, today)`) y un porcentaje; una política `BestNonStackablePlusVolume` que elige; y un value object `Price` con cierre de operaciones (`applyDiscount` devuelve otro `Price`).

```ts
interface Benefit { name: string; appliesTo: Specification<Sub>; discount: number; stackable: boolean }

function finalPrice(base: Price, sub: Sub, benefits: Benefit[]): Price {
  const eligible = benefits.filter((b) => b.appliesTo.isSatisfiedBy(sub));
  const best = eligible.filter((b) => !b.stackable).sort((a, b) => b.discount - a.discount)[0];
  const stackable = eligible.filter((b) => b.stackable);
  return [best, ...stackable].filter(Boolean)
    .reduce((p, b) => p.applyDiscount(b!.discount), base);
}
declare type Sub = unknown;
declare interface Price { applyDiscount(pct: number): Price }
```

El resultado no tiene condicionales sobre cupones concretos; agregar un beneficio nuevo es agregar un dato con su especificación; y la frase de producto ("se aplica el mejor beneficio no acumulable más los acumulables") está escrita casi literalmente en el código. Ese es el tipo de mejora que Evans llama hacer explícito lo implícito: no cambió la tecnología, cambió el **modelo**.

### Analogía de construcción

Un diseño flexible es como un **sistema constructivo modular** bien pensado: las piezas tienen nombres que dicen para qué sirven (no "pieza A-17"), combinarlas no altera las piezas originales (funciones sin efectos), las fichas técnicas declaran cargas máximas y tolerancias (aserciones), los cortes coinciden con las juntas naturales de la obra (contornos conceptuales), cada módulo se entiende sin conocer todo el edificio (clases independientes) y unir dos paneles da otro panel del mismo sistema (cierre de operaciones). Una especificación es como la **norma de inspección**: "muro apto si resiste X y aísla Y"; la misma norma sirve para inspeccionar muros existentes, seleccionar proveedores o encargar muros nuevos.

### Errores comunes

- **Buscar el modelo perfecto antes de escribir código.** La profundidad llega iterando.
- **Ignorar la incomodidad**: un método con muchos condicionales suele esconder un concepto sin nombre.
- **Especificaciones como `if` sueltos** repetidos en varias capas.
- **Nombres que describen el mecanismo** (`processData`, `handleStuff`) en lugar de la intención.
- **Métodos que cambian estado y además devuelven resultados del dominio**, haciendo imposible llamarlos sin miedo.
- **Flexibilidad especulativa**: capas y abstracciones que no siguen ningún contorno real del dominio.

### Resumen

Los modelos profundos aparecen al refactorizar con mejor comprensión del dominio, y a veces dan saltos que simplifican de golpe muchas reglas. Los conceptos implícitos se descubren escuchando el lenguaje, examinando la incomodidad, contemplando contradicciones, leyendo sobre el dominio y experimentando; las restricciones, los procesos y las especificaciones merecen nombre propio. Specification modela reglas booleanas combinables para validar, seleccionar y construir. El diseño flexible se apoya en interfaces que revelan la intención, funciones sin efectos secundarios, aserciones, contornos conceptuales, clases independientes y cierre de operaciones.

## Conceptos clave

- **Refactorizar hacia una comprensión más profunda**: cambiar el modelo a medida que se entiende mejor el dominio, no solo el código.
- **Salto (breakthrough)**: cambio de modelo que simplifica drásticamente muchas reglas al descubrir un concepto esencial.
- **Concepto implícito**: idea del dominio presente en el lenguaje o el código pero sin representación propia en el modelo.
- **Specification**: predicado del dominio que evalúa si un objeto cumple un criterio; sirve para validar, seleccionar y construir.
- **Interfaz que revela la intención**: nombres que describen el efecto y el propósito, no el mecanismo.
- **Función sin efectos secundarios**: operación que devuelve un resultado sin modificar el estado observable.
- **Aserción**: postcondición o invariante declarada explícitamente, a menudo como test.
- **Contornos conceptuales**: líneas naturales de división del dominio que guían la descomposición del diseño.
- **Cierre de operaciones**: operaciones cuyo resultado es del mismo tipo que sus argumentos.

## Preguntas de repaso

1. ¿Qué diferencia hay entre una refactorización técnica y una hacia un modelo más profundo?
   R: La técnica mejora la estructura del código (renombrar, extraer, aplicar un patrón) sin cambiar el entendimiento del dominio; la otra cambia el modelo porque el equipo comprende mejor el negocio, y suele simplificar reglas o revelar conceptos esenciales.
2. Menciona tres técnicas para descubrir conceptos implícitos.
   R: Escuchar el lenguaje de los expertos (términos que no están en el modelo o que corrigen los tuyos), examinar la incomodidad del diseño (código complicado o que cambia mucho) y contemplar contradicciones entre expertos; también leer literatura del dominio y experimentar con modelos alternativos.
3. ¿Cuáles son los tres usos del patrón Specification?
   R: Validar si un objeto cumple un criterio, seleccionar de una colección (o de un repositorio) los objetos que lo cumplen y describir los requisitos de un objeto que todavía no existe para que un generador lo construya.
4. ¿Por qué conviene poner la lógica en funciones sin efectos secundarios, especialmente en value objects?
   R: Porque se pueden combinar, reutilizar y testear sin miedo a consecuencias ocultas, y quien las usa puede predecir su resultado sin leer la implementación. Los comandos que cambian estado quedan simples y aislados.
5. ¿Qué es el cierre de operaciones y qué ejemplo lo muestra?
   R: Es definir operaciones cuyo resultado es del mismo tipo que sus argumentos, de modo que se pueden encadenar sin introducir conceptos nuevos. Ejemplos: `money.add(money)` devuelve `Money` y `spec.and(spec)` devuelve una `Specification`.
6. ¿Qué indican los contornos conceptuales cuando un cambio de requisitos obliga a tocar muchos objetos?
   R: Que la descomposición no sigue las líneas naturales del dominio; habría que reagrupar los elementos para que los cambios frecuentes caigan dentro de un mismo objeto o módulo en lugar de atravesar varios.

## Ejercicio

Para un sistema de préstamos de una cooperativa, implementa con Specification las reglas: `hasStableIncome` (ingresos de al menos 6 meses), `debtRatioBelow(pct)`, `noLatePaymentsInLast(months)` y `isMember`. Combínalas en dos políticas del dominio: `eligibleForStandardLoan` y `eligibleForFastTrack` (más estricta). Añade un método al repositorio en memoria `applicantsMatching(spec)`. Diseña además un value object `LoanAmount` con cierre de operaciones (`add`, `subtract`, `min`) y funciones sin efectos secundarios. **Terminado cuando:** las políticas se leen como frases del dominio en una sola línea, cada especificación tiene tests con Vitest de casos que cumplen y no cumplen, el repositorio filtra con cualquier especificación sin métodos nuevos, y los tests de `LoanAmount` verifican que las operaciones no modifican a sus operandos.

## Explícalo con tus palabras

Explica con la analogía de la norma de inspección por qué una misma especificación puede servir para validar, para buscar y para encargar algo nuevo.
