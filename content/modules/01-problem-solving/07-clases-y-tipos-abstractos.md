---
title: Clases y tipos abstractos de datos para dividir problemas
kind: lesson
hours: 2
sources: Think Like a Programmer, cap. 5 "Solving Problems with Classes" (pp. 145–182) | Think Like a Programmer, cap. 7 "Abstract Data Types" (pp. 221–222)
links: TypeScript Handbook, Classes | https://www.typescriptlang.org/docs/handbook/2/classes.html
---

## Objetivo

Usar clases como herramienta de resolución de problemas: separar la interfaz de la implementación, ocultar información, mantener invariantes y reconocer los errores de diseño más comunes (la clase falsa y las clases de un solo uso). Entender qué es un tipo abstracto de datos.

## Estudio

### Las clases como herramienta de pensamiento

Muchas veces se enseñan las clases como sintaxis: `class`, `constructor`, `this`, `private`. Pero el valor real de una clase no es sintáctico: es que te permite **dividir un problema grande en piezas con responsabilidades claras** y luego olvidarte de cómo está hecha cada pieza mientras trabajas en otra. Es la técnica de "dividir el problema" de la sesión 01, convertida en estructura de código.

Piensa en un auto. Para manejarlo usas el volante, los pedales y la palanca. No necesitas saber cómo funciona la inyección de combustible. Los pedales son la **interfaz**; el motor es la **implementación**. El fabricante puede cambiar el motor (de combustión a eléctrico) y tú sigues manejando igual. Una buena clase funciona así.

### Los objetivos de usar una clase

Cuando decides crear una clase, deberías poder decir **cuál de estos objetivos persigues**. Si no puedes nombrar ninguno, probablemente la clase sobra.

**1. Encapsulación.** Agrupar datos con las operaciones que los manipulan. Los datos de un estudiante (nombre, ID, nota) y las operaciones sobre ellos (calcular la letra de la nota, validar el ID) viven juntos.

**2. Reutilización de código.** Una clase bien diseñada se puede usar en muchos programas. Una clase de "fecha" o de "cola de prioridad" sirve en cientos de contextos.

**3. Dividir el problema.** Cada clase resuelve una parte. Mientras programas la clase `Roster` (lista de clase), puedes asumir que `Student` funciona; mientras programas `Student`, no piensas en la lista.

**4. Ocultar información.** Los usuarios de la clase no ven ni dependen de los detalles internos. Esto es más fuerte que encapsular: no solo agrupas, sino que **escondes**. Si mañana cambias un array por un mapa dentro de la clase, nadie de afuera se entera.

**5. Legibilidad.** `roster.averageGrade()` se lee como lo que hace. Un bucle suelto sumando `grades[i]` requiere que el lector descifre la intención.

**6. Expresividad.** Una clase amplía el vocabulario del lenguaje. Después de definir `Money` o `Matrix`, tu código puede hablar en esos términos, lo que lo vuelve más cercano al problema que resuelve.

### Construir una clase simple, paso a paso

**Problema:** diseña el soporte para una lista de clase. Por cada estudiante se guarda nombre, ID y nota final de 0 a 100. Se necesita: agregar y quitar estudiantes, mostrar un estudiante por ID con su nota numérica y en letra (A ≥ 90, B ≥ 80, C ≥ 70, D ≥ 60, F en otro caso) y calcular el promedio del curso.

**Primer paso: dividir.** Hay dos responsabilidades: representar **un** estudiante y manejar **la colección**. Empieza por la más pequeña.

**La clase base.** Primero lo mínimo: datos y acceso controlado.

```ts
export class StudentRecord {
  private _grade: number;

  constructor(readonly id: number, readonly name: string, grade: number) {
    this._grade = StudentRecord.validGrade(grade);
  }

  get grade(): number { return this._grade; }

  set grade(value: number) { this._grade = StudentRecord.validGrade(value); }

  private static validGrade(value: number): number {
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      throw new RangeError(`Nota fuera de rango: ${value}`);
    }
    return value;
  }
}
```

Fíjate en una decisión clave: la nota es **privada** y solo se modifica a través de un setter que valida. Eso garantiza un **invariante**: "la nota de un `StudentRecord` siempre está entre 0 y 100". Ningún código externo puede romperlo. Si la nota fuera un campo público, cualquier parte del programa podría poner `-5` y el error aparecería lejos de donde se cometió.

`id` y `name` son `readonly`: una vez creado el registro, no cambian. Hacer inmutable todo lo que no necesita cambiar reduce la cantidad de estados posibles y, por lo tanto, de bugs.

**Métodos de soporte.** Ahora la letra de la nota. Podrías calcularla con una cadena de `if`, pero recuerda la tabla de búsqueda de la sesión de arrays:

```ts
const LETTER_THRESHOLDS: ReadonlyArray<readonly [number, string]> = [
  [90, "A"], [80, "B"], [70, "C"], [60, "D"],
];

// dentro de StudentRecord:
get letterGrade(): string {
  for (const [min, letter] of LETTER_THRESHOLDS) if (this._grade >= min) return letter;
  return "F";
}
```

¿Debería `letterGrade` ser un dato guardado o calculado? Si lo guardaras, tendrías que mantenerlo sincronizado cada vez que cambia la nota: dos datos que deben coincidir son una invitación a inconsistencias. Calcularlo a partir de la nota garantiza que nunca se desincronice. Regla útil: **no guardes lo que puedes derivar barato**.

Otro método de soporte típico: validar el formato del ID o generar una representación para mostrar (`toString`). Los métodos de soporte no son parte del requisito literal, pero hacen que la clase sea **completa** y fácil de usar.

### Clases que gestionan colecciones

Ahora la segunda responsabilidad: la colección. Aquí aparece la pregunta interesante: ¿qué estructura interna uso? Un array, una lista enlazada, un `Map` por ID. La respuesta depende de las operaciones:

| Operación requerida | Array | Lista enlazada | `Map<id, record>` |
| --- | --- | --- | --- |
| Agregar | O(1) amortizado | O(1) | O(1) promedio |
| Buscar por ID | O(n) | O(n) | O(1) promedio |
| Quitar por ID | O(n) | O(n) | O(1) promedio |
| Promedio | O(n) | O(n) | O(n) |

Elegimos `Map`. Pero lo importante es que **esa decisión queda escondida**: quien use `Roster` nunca sabrá si hay un array, una lista o un mapa.

```ts
export class Roster {
  private readonly records = new Map<number, StudentRecord>();
  private gradeSum = 0;

  add(record: StudentRecord): void {
    if (this.records.has(record.id)) throw new Error(`ID duplicado: ${record.id}`);
    this.records.set(record.id, record);
    this.gradeSum += record.grade;
  }

  remove(id: number): boolean {
    const record = this.records.get(id);
    if (!record) return false;
    this.gradeSum -= record.grade;
    return this.records.delete(id);
  }

  find(id: number): StudentRecord | undefined {
    return this.records.get(id);
  }

  averageGrade(): number {
    return this.records.size === 0 ? 0 : this.gradeSum / this.records.size;
  }
}
```

Aquí hay una optimización: mantenemos `gradeSum` actualizado en cada `add` y `remove`, de modo que `averageGrade()` es O(1). Pero cuidado: esto introduce un **nuevo invariante** ("`gradeSum` es igual a la suma de las notas") y un nuevo riesgo. Como `StudentRecord` permite cambiar la nota con su setter, alguien podría hacer `roster.find(7)!.grade = 50` y `gradeSum` quedaría desactualizado. Opciones:

1. Calcular el promedio recorriendo (O(n), siempre correcto).
2. Hacer `StudentRecord` inmutable y cambiar notas solo a través de `Roster.updateGrade(id, value)`.
3. Devolver copias desde `find`.

Esta discusión es exactamente el tipo de razonamiento que las clases te obligan a hacer: **¿quién es responsable de mantener cada invariante, y puede alguien de afuera romperlo?**

### Copias superficiales y profundas

En C++, una clase que maneja memoria dinámica necesita definir cómo se copia (constructor de copia, operador de asignación, destructor), porque copiar por defecto solo duplica los punteros y ambas copias terminarían compartiendo y liberando la misma memoria. En TypeScript no hay destructores ni liberación manual, pero el problema conceptual **sigue existiendo**: si copias un objeto que contiene un `Map`, ¿la copia comparte el mapa o tiene el suyo?

```ts
const a = new Roster();
const b = a;            // no es una copia: es la misma instancia
b.add(new StudentRecord(1, "Ana", 90));
a.averageGrade();       // 90: a y b son el mismo objeto
```

Si tu clase necesita copiarse, implementa un método `clone()` explícito que decida qué se comparte y qué se duplica. Para objetos inmutables, compartir es seguro; para objetos mutables, compartir es peligroso. Esta es otra razón para preferir inmutabilidad.

### Tipos abstractos de datos (ADT)

Un **tipo abstracto de datos** es una descripción de **qué operaciones** ofrece una estructura y qué garantizan, sin decir **cómo** están implementadas. Ejemplos:

- **Pila (stack):** `push`, `pop`, `peek`, `isEmpty`. Garantía: el último en entrar es el primero en salir.
- **Cola (queue):** `enqueue`, `dequeue`, `peek`, `isEmpty`. Garantía: el primero en entrar es el primero en salir.
- **Conjunto (set):** `add`, `has`, `delete`. Garantía: no hay duplicados.
- **Mapa (map):** `get`, `set`, `delete`. Garantía: cada clave tiene un valor.
- **Cola de prioridad:** `insert`, `extractMin`. Garantía: siempre sale el de menor prioridad.

En TypeScript, una `interface` expresa naturalmente un ADT:

```ts
export interface Stack<T> {
  push(value: T): void;
  pop(): T | undefined;
  peek(): T | undefined;
  readonly size: number;
}
```

Después puedes tener varias implementaciones (`ArrayStack`, `LinkedStack`) que cumplen la misma interfaz. El código que usa una pila depende de la interfaz, no de la implementación. Esto te permite empezar con la implementación más simple y cambiarla si un benchmark lo justifica, sin tocar el resto del programa.

Los ADT son además **vocabulario para resolver problemas**. Cuando reconoces "esto es una cola" o "esto necesita una cola de prioridad", la mitad del problema está resuelta, porque ya sabes qué operaciones necesitas y cuánto cuestan. En las próximas sesiones vas a estudiar varios ADT y sus implementaciones.

### Errores de diseño que debes evitar

**La clase falsa.** Es una clase que en realidad no encapsula nada: tiene todos los campos públicos, o es solo un contenedor de funciones sueltas que no comparten estado, o sus métodos son getters y setters triviales para cada campo sin ninguna validación. Tiene la forma de una clase pero ninguno de sus beneficios. Señales:

- Cualquier código externo puede modificar cualquier campo sin control.
- Los métodos no usan `this` (son funciones sueltas disfrazadas).
- El nombre es vago: `Manager`, `Helper`, `Utils`, `Data`.

En TypeScript, si solo necesitas agrupar datos sin comportamiento, un `type` o `interface` es más honesto que una clase. Y si solo tienes funciones sin estado, un módulo con funciones exportadas es más simple.

**Las clases de un solo uso (single-taskers).** Por analogía con los utensilios de cocina que hacen una sola cosa (un aparato solo para cortar aguacates): una clase diseñada tan a medida de un caso concreto que no sirve para nada más. Por ejemplo, una clase `StudentGradeAverageCalculatorForRoster101`. El antídoto es preguntar: "¿qué haría falta para que esta clase sirviera en el próximo programa?". A menudo basta con generalizar un poco: una clase de estadísticas que recibe números, no estudiantes.

El equilibrio está en el medio: no diseñar para todos los casos imaginables (eso es sobreingeniería), pero tampoco atar la clase a un único uso cuando generalizar cuesta poco.

### Cómo decidir si algo merece ser una clase

Una guía rápida:

| Situación | Herramienta adecuada |
| --- | --- |
| Datos sin comportamiento | `type` / `interface` |
| Funciones puras sin estado compartido | funciones en un módulo |
| Datos + reglas que deben cumplirse siempre (invariantes) | clase con campos privados |
| Varias implementaciones intercambiables de las mismas operaciones | `interface` + clases que la implementan |
| Estado que cambia a lo largo del tiempo con operaciones controladas | clase |

El criterio de fondo es el **invariante**: si hay una regla que los datos deben cumplir siempre, una clase con campos privados es el lugar para hacerla cumplir.

### Un segundo ejemplo: una clase que amplía el vocabulario

Las clases de esta sesión manejan registros. Otro uso muy valioso es crear **tipos de valor** pequeños que amplían el lenguaje. Un caso típico: el dinero.

Representar precios con `number` causa problemas conocidos: `0.1 + 0.2` da `0.30000000000000004`, nada impide sumar pesos con dólares y nada impide un precio negativo por error. Una clase `Money` resuelve los tres problemas de una vez:

```ts
export class Money {
  private constructor(readonly cents: number, readonly currency: "USD" | "COP" | "EUR") {}

  static of(amount: number, currency: Money["currency"]): Money {
    const cents = Math.round(amount * 100);
    if (!Number.isSafeInteger(cents)) throw new RangeError("Monto inválido");
    return new Money(cents, currency);
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.cents + other.cents, this.currency);
  }

  multiply(factor: number): Money {
    return new Money(Math.round(this.cents * factor), this.currency);
  }

  equals(other: Money): boolean {
    return this.cents === other.cents && this.currency === other.currency;
  }

  toString(): string {
    return `${(this.cents / 100).toFixed(2)} ${this.currency}`;
  }

  private assertSameCurrency(other: Money): void {
    if (other.currency !== this.currency) {
      throw new Error(`No se puede operar ${this.currency} con ${other.currency}`);
    }
  }
}
```

Observa varias decisiones de diseño:

- **Constructor privado + método de fábrica `of`.** El único camino para crear un `Money` pasa por la validación. No existe un `Money` inválido.
- **Enteros por dentro.** Guardar centavos como enteros elimina los errores de coma flotante en sumas. La representación interna (centavos) está oculta: si mañana necesitas milésimas, cambias la clase y nadie más.
- **Inmutabilidad.** `add` no modifica el objeto: devuelve uno nuevo. Así puedes compartir instancias sin miedo, y el problema de las copias desaparece.
- **Igualdad por valor.** Dos `Money` con el mismo monto y moneda son "iguales" aunque sean objetos distintos; por eso hay un método `equals` (recuerda que `===` compara referencias).

Ahora el código del resto del programa puede decir `subtotal.add(shipping).multiply(1.19)` en lugar de manipular números sueltos. Esa es la **expresividad**: el código habla el idioma del problema. Y es la **reutilización**: esta clase sirve en cualquier aplicación que maneje dinero, no solo en esta. Es lo opuesto a un single-tasker.

Compara con la clase falsa equivalente: un `class Price { public value: number }` sin validación ni operaciones. No protege nada, no expresa nada, y el código cliente sigue haciendo aritmética de coma flotante a mano.

### Diseñar la interfaz antes que la implementación

Una técnica práctica: escribe primero **cómo quieres usar** la clase, como si ya existiera, y después impleméntala.

```ts
// Uso deseado (lo escribo primero, como un test):
const roster = new Roster();
roster.add(new StudentRecord(1, "Ana", 95));
roster.add(new StudentRecord(2, "Luis", 72));
expect(roster.find(1)?.letterGrade).toBe("A");
expect(roster.averageGrade()).toBe(83.5);
```

Este enfoque te obliga a pensar en la interfaz desde el punto de vista del usuario (legibilidad, expresividad) y te da tests desde el primer momento. Es también la base del desarrollo guiado por tests, que verás en el módulo de buenas prácticas.

### Errores comunes

- **Campos públicos que deberían ser privados**: cualquiera rompe tus invariantes.
- **Guardar datos derivados** que pueden desincronizarse (la letra y la nota).
- **Devolver referencias internas mutables** (por ejemplo, el `Map` interno): el usuario puede modificarlo sin pasar por tus validaciones. Devuelve copias o vistas de solo lectura.
- **Confundir asignación con copia**: `const b = a` no copia un objeto.
- **Clases gigantes** que hacen de todo: si no puedes describir la responsabilidad de una clase en una frase, divídela.
- **Crear clases por costumbre** donde una función bastaba.
- **Comparar objetos de valor con `===`**: compara identidad, no contenido; define `equals` para tipos como `Money`.
- **Validar en el lugar equivocado**: si la validación vive en cada lugar que crea el objeto (formularios, endpoints, tests) en lugar de vivir en la clase, tarde o temprano alguien la olvida. El constructor o el método de fábrica es el único punto donde la validación es imposible de saltar.

### Para llevarte

Una clase bien hecha es una **promesa**: "si me usas a través de esta interfaz, mis reglas siempre se cumplen y no necesitas saber cómo funciono por dentro". Esa promesa es lo que te permite dividir un problema grande en partes y trabajar en cada una por separado, con la cabeza libre de los detalles de las demás. Los tipos abstractos de datos llevan la idea un paso más allá: separan el **qué** (operaciones y garantías) del **cómo** (implementación), y te dan un vocabulario compartido para pensar soluciones.

## Conceptos clave

- **Encapsulación**: agrupar datos con las operaciones que los manipulan.
- **Ocultamiento de información**: impedir que el código externo dependa de los detalles internos de una clase.
- **Interfaz vs implementación**: lo que una clase promete hacer frente a cómo lo hace por dentro.
- **Invariante de clase**: regla que los datos de un objeto cumplen siempre, garantizada por sus métodos.
- **Método de soporte**: operación que no es un requisito literal pero hace la clase completa y cómoda de usar.
- **Tipo abstracto de datos (ADT)**: especificación de operaciones y garantías sin fijar la implementación (pila, cola, conjunto, mapa).
- **Clase falsa**: clase sin encapsulación real; tiene la forma pero no los beneficios.
- **Single-tasker**: clase tan específica que no sirve fuera de su caso original.

## Preguntas de repaso

1. ¿Qué diferencia hay entre encapsular y ocultar información?
   R: Encapsular es agrupar datos y operaciones en una unidad. Ocultar información va más allá: impide que el código externo vea o dependa de los detalles internos, de modo que la implementación puede cambiar sin afectar a quien usa la clase. Se puede encapsular sin ocultar (campos públicos), pero entonces se pierde la protección de los invariantes.
2. ¿Por qué conviene calcular la letra de la nota en lugar de guardarla como un campo?
   R: Porque es un dato derivado de la nota. Si se guardara, habría que actualizarlo cada vez que cambia la nota y podría desincronizarse. Calcularlo a partir de la nota garantiza que siempre es coherente, y el costo es mínimo.
3. ¿Qué es un tipo abstracto de datos y para qué sirve en TypeScript?
   R: Es la especificación de las operaciones de una estructura y sus garantías (por ejemplo, una pila con push y pop, último en entrar primero en salir) sin decir cómo se implementa. En TypeScript se expresa con una interface; permite tener varias implementaciones intercambiables y que el código cliente dependa solo de las operaciones.
4. Mantener una suma acumulada en `Roster` hace que el promedio sea O(1). ¿Qué riesgo introduce y cómo lo mitigas?
   R: Introduce un invariante nuevo (la suma debe coincidir con las notas) que se rompe si alguien modifica la nota de un registro directamente sin pasar por Roster. Se mitiga haciendo los registros inmutables y cambiando notas solo con un método de Roster, devolviendo copias, o volviendo a calcular el promedio recorriendo la colección.
5. ¿Cómo reconoces una clase falsa y qué alternativa usarías en TypeScript?
   R: Tiene campos públicos sin control, métodos que no usan el estado de la instancia o getters y setters triviales sin validación, y suele tener nombres vagos como Helper o Manager. Si solo agrupa datos, un type o interface es más honesto; si solo agrupa funciones sin estado, un módulo con funciones exportadas.
6. ¿Qué ventaja tiene escribir primero el uso deseado de una clase antes de implementarla?
   R: Te obliga a diseñar la interfaz desde el punto de vista de quien la usa, lo que mejora la legibilidad y la expresividad, y te deja con tests desde el principio que verifican la implementación.

## Ejercicio

Diseña e implementa en TypeScript una clase `Inventory` para una tienda: cada producto tiene `sku` (string único), nombre, precio en centavos (entero ≥ 0) y stock (entero ≥ 0). Operaciones: agregar producto, ajustar stock (`+n` o `-n`, sin permitir negativos), buscar por `sku`, listar productos con stock bajo un umbral y obtener el valor total del inventario. Escribe primero los tests de uso y luego la implementación.

Criterio de terminado: los invariantes (sku único, precio y stock enteros no negativos) no se pueden romper desde fuera de la clase y hay tests que lo comprueban; la estructura interna no es visible desde la interfaz pública; un comentario explica qué estructura interna elegiste y el Big O de cada operación.

## Explícalo con tus palabras

Explica a alguien que conoce solo funciones qué es un invariante de clase y por qué un campo privado con un setter que valida lo protege mejor que un campo público.
