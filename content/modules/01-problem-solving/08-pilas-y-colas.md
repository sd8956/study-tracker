---
title: Pilas y colas
kind: lesson
hours: 2
sources: Cracking the Coding Interview, cap. 3 "Stacks and Queues" (pp. 108–111) | Grokking Algorithms, cap. 3 "The stack" (pp. 60–64) y cap. 6 "Queues" (p. 122)
links: VisuAlgo, pilas y colas | https://visualgo.net/en/list
---

## Objetivo

Entender las pilas (LIFO) y las colas (FIFO) como tipos abstractos, implementarlas eficientemente en TypeScript y reconocer qué problemas resuelven: deshacer, paréntesis balanceados, evaluación de expresiones, el mínimo en O(1) y el procesamiento por orden de llegada.

## Estudio

### Dos políticas de orden

Pilas y colas son colecciones donde **no eliges** qué elemento sacar: la estructura lo decide según una política.

- **Pila (stack), LIFO: Last In, First Out.** Como una pila de platos: pones arriba y sacas de arriba. El último que pusiste es el primero que sale.
- **Cola (queue), FIFO: First In, First Out.** Como la fila del banco: el primero que llegó es el primero que atienden.

```
PILA                         COLA
 push ▼  ▲ pop               enqueue → [ d | c | b | a ] → dequeue
     ┌───┐                              entra por atrás   sale por delante
     │ d │ ← top
     │ c │
     │ b │
     │ a │
     └───┘
```

Esa restricción parece una limitación, pero es justamente lo que las hace útiles: cuando un problema tiene naturaleza "lo más reciente primero" o "lo más antiguo primero", usar la estructura correcta vuelve la solución casi automática.

### La pila como ADT

Operaciones:

| Operación | Qué hace | Costo |
| --- | --- | --- |
| `push(x)` | agrega `x` arriba | O(1) |
| `pop()` | quita y devuelve el de arriba | O(1) |
| `peek()` | devuelve el de arriba sin quitarlo | O(1) |
| `isEmpty()` | ¿está vacía? | O(1) |

Lo que **no** ofrece: acceso al elemento `i`. Si necesitas eso, no quieres una pila.

### Implementación de una pila

Con un array de JavaScript es inmediato, porque `push` y `pop` trabajan al final en O(1) amortizado:

```ts
export class ArrayStack<T> {
  private items: T[] = [];
  push(value: T): void { this.items.push(value); }
  pop(): T | undefined { return this.items.pop(); }
  peek(): T | undefined { return this.items[this.items.length - 1]; }
  get size(): number { return this.items.length; }
  isEmpty(): boolean { return this.items.length === 0; }
}
```

Con una lista enlazada, el tope es la cabeza: `push` es `prepend` y `pop` es quitar la cabeza. Ambas O(1) estrictas (sin amortizado). En la práctica el array suele ser más rápido por la localidad de memoria, pero conviene saber ambas.

### La pila que ya usas: la pila de llamadas

Tu programa usa una pila todo el tiempo sin que la declares: la **pila de llamadas** (call stack). Cada vez que llamas a una función, se apila un **marco** con sus variables locales y el punto al que debe volver. Cuando la función termina, su marco se desapila y la ejecución continúa donde quedó la función que la llamó.

```ts
function greet(name: string) {
  console.log(`Hola, ${name}`);
  howAreYou(name);       // se apila howAreYou encima de greet
  console.log("Chau");   // se ejecuta cuando howAreYou se desapila
}
function howAreYou(name: string) { console.log(`¿Cómo estás, ${name}?`); }
```

```
llamar greet     llamar howAreYou    howAreYou termina    greet termina
┌──────────┐     ┌────────────┐      ┌──────────┐         (vacía)
│ greet    │     │ howAreYou  │      │ greet    │
└──────────┘     │ greet      │      └──────────┘
                 └────────────┘
```

Esto explica dos cosas que verás en la sesión de recursión: por qué una función recursiva "recuerda" dónde estaba en cada nivel, y por qué una recursión demasiado profunda produce un error de **desbordamiento de pila** (`RangeError: Maximum call stack size exceeded` en JavaScript).

### Problemas que piden una pila

**1. Paréntesis balanceados.** ¿La cadena `"{[()()]}"` está bien anidada? ¿Y `"([)]"`? Cada vez que se abre algo, hay que recordar qué se abrió; cuando se cierra, debe coincidir con **lo último que se abrió**. "Lo último" es la señal de una pila.

```ts
const PAIRS: Record<string, string> = { ")": "(", "]": "[", "}": "{" };

export function isBalanced(text: string): boolean {
  const stack: string[] = [];
  for (const ch of text) {
    if (ch === "(" || ch === "[" || ch === "{") stack.push(ch);
    else if (ch in PAIRS) {
      if (stack.pop() !== PAIRS[ch]) return false; // cierre sin apertura o que no coincide
    }
  }
  return stack.length === 0; // aperturas sin cerrar
}
```

Tres formas de fallar, tres comprobaciones: un cierre con la pila vacía, un cierre que no coincide y aperturas que quedan al final.

**2. Deshacer (undo).** Cada acción se apila; deshacer es hacer `pop` y revertir. Para "rehacer" se usa una segunda pila: lo deshecho se apila allí, y cualquier acción nueva vacía la pila de rehacer.

**3. Evaluar expresiones en notación postfija.** En notación postfija (`3 4 + 2 *` significa `(3 + 4) * 2`) no hacen falta paréntesis. Recorres los símbolos: los números se apilan; un operador desapila dos operandos, opera y apila el resultado.

```
símbolo:  3     4      +      2       *
pila:    [3]  [3,4]   [7]   [7,2]   [14]
```

Los compiladores y calculadoras convierten expresiones normales a esta forma justamente para evaluarlas con una pila.

**4. Recorrido en profundidad (DFS).** Explorar un laberinto "yendo lo más hondo posible y retrocediendo al último cruce" es usar una pila (explícita o la de llamadas). Lo verás en la sesión de grafos.

### Una pila con mínimo en O(1)

**Problema:** diseña una pila que, además de `push` y `pop`, tenga `min()` en O(1).

Idea ingenua: guardar una variable `minValue`. Funciona al hacer `push`, pero al hacer `pop` del mínimo, ¿cuál es el nuevo mínimo? Tendrías que recorrer toda la pila, O(n).

Idea correcta: **cada nivel de la pila recuerda el mínimo hasta ese nivel**. Como una pila solo cambia por arriba, el mínimo de los elementos de abajo nunca cambia mientras estén ahí.

```ts
export class MinStack {
  private values: number[] = [];
  private mins: number[] = []; // mins[i] = mínimo de values[0..i]

  push(x: number): void {
    this.values.push(x);
    const currentMin = this.mins.length === 0 ? x : Math.min(x, this.mins[this.mins.length - 1]);
    this.mins.push(currentMin);
  }
  pop(): number | undefined {
    this.mins.pop();
    return this.values.pop();
  }
  min(): number | undefined { return this.mins[this.mins.length - 1]; }
}
```

```
push 5  → values [5]         mins [5]
push 7  → values [5,7]       mins [5,5]
push 2  → values [5,7,2]     mins [5,5,2]
pop     → values [5,7]       mins [5,5]   → min() = 5 sin recorrer nada
```

Optimización de espacio opcional: en `mins` solo apilar cuando el nuevo valor es ≤ al mínimo actual, y desapilar de `mins` solo cuando el valor que sale es igual al tope de `mins`. La lección general: **cuando necesitas una consulta rápida sobre una estructura que cambia, guarda información auxiliar que se actualiza en cada operación**.

### La pila monótona: el siguiente elemento mayor

Este patrón es menos conocido y aparece en muchos problemas de entrevista. **Problema:** dado un array de temperaturas diarias, para cada día indica cuántos días hay que esperar hasta una temperatura más alta (0 si nunca llega).

```
temps:  [22, 19, 24, 21, 20, 25]
answer: [ 2,  1,  3,  2,  1,  0]
```

**Fuerza bruta:** para cada día, recorrer hacia adelante hasta encontrar uno mayor. O(n²) en el peor caso (por ejemplo, temperaturas decrecientes).

**Observación clave:** mientras recorres de izquierda a derecha, hay días que todavía están "esperando" su respuesta. Si llega un día más caliente, resuelve a **todos** los días en espera que sean más fríos que él, empezando por los más recientes. Y entre los días en espera, las temperaturas siempre forman una secuencia **decreciente** desde el fondo hacia el tope (si no, el más caliente ya habría resuelto al más frío). Una pila que mantiene esa propiedad se llama **pila monótona**.

```ts
export function daysUntilWarmer(temps: number[]): number[] {
  const answer = new Array<number>(temps.length).fill(0);
  const waiting: number[] = []; // índices, con temperaturas decrecientes de fondo a tope
  for (let i = 0; i < temps.length; i++) {
    while (waiting.length > 0 && temps[waiting[waiting.length - 1]] < temps[i]) {
      const j = waiting.pop()!;
      answer[j] = i - j; // el día i resuelve al día j
    }
    waiting.push(i);
  }
  return answer; // los que quedan en la pila nunca encontraron uno mayor: 0
}
```

Recorrido con el ejemplo:

```
i=0 (22): pila vacía → push 0                     pila [0]
i=1 (19): 22 no < 19 → push 1                     pila [0,1]
i=2 (24): 19<24 → ans[1]=1; 22<24 → ans[0]=2     pila [2]
i=3 (21): push                                    pila [2,3]
i=4 (20): push                                    pila [2,3,4]
i=5 (25): ans[4]=1, ans[3]=2, ans[2]=3            pila [5]
```

¿Costo? Hay un `while` dentro de un `for`, lo que invita a decir O(n²). Pero cada índice entra a la pila **una vez** y sale **como mucho una vez**. El total de operaciones de pila es como máximo 2n: **O(n)**. Es el mismo razonamiento "¿cuántas veces en total se ejecuta el cuerpo interno?" que viste en la sesión de Big O.

La misma técnica resuelve "el siguiente elemento mayor", "el anterior elemento menor", "el rectángulo más grande en un histograma" y variantes. La señal en el enunciado es: **"para cada elemento, el próximo (o anterior) que sea mayor (o menor)"**.

### La cola como ADT

| Operación | Qué hace | Costo deseado |
| --- | --- | --- |
| `enqueue(x)` | agrega al final | O(1) |
| `dequeue()` | quita y devuelve el primero | O(1) |
| `peek()` | mira el primero | O(1) |
| `isEmpty()` | ¿está vacía? | O(1) |

### La trampa de `shift()`

La forma "obvia" de hacer una cola en JavaScript es `push` para encolar y `shift` para desencolar. Funciona, pero `shift()` es **O(n)**: quita el primer elemento y desplaza todos los demás una posición. Con colas grandes, un algoritmo que debería ser O(n) se vuelve O(n²) sin que lo notes.

Tres implementaciones correctas:

**a) Lista enlazada con `head` y `tail`.** `enqueue` agrega en la cola (`tail`), `dequeue` quita la cabeza. Ambas O(1).

**b) Array con índice de inicio.** No borras al desencolar: avanzas un índice `head`. Para no desperdiciar memoria, compactas de vez en cuando.

```ts
export class Queue<T> {
  private items: T[] = [];
  private head = 0;

  enqueue(value: T): void { this.items.push(value); }

  dequeue(): T | undefined {
    if (this.head >= this.items.length) return undefined;
    const value = this.items[this.head];
    this.items[this.head] = undefined as T; // liberar referencia
    this.head++;
    if (this.head > 1024 && this.head * 2 > this.items.length) {
      this.items = this.items.slice(this.head); // compactar: O(n) pero poco frecuente
      this.head = 0;
    }
    return value;
  }

  get size(): number { return this.items.length - this.head; }
}
```

La compactación es un ejemplo de costo amortizado: ocurre solo cuando la mitad del array es basura, así que su costo repartido es O(1) por operación.

**c) Buffer circular.** Un array de capacidad fija donde `head` y `tail` dan la vuelta con módulo (`(tail + 1) % capacity`). Es lo que usan los sistemas de audio, los drivers y muchas colas de mensajes de tamaño acotado.

```
capacity = 5, después de varios enqueue/dequeue:
índice:  0   1   2   3   4
        [ e | f |   | c | d ]
              ▲       ▲
            tail     head      → orden de salida: c, d, e, f
```

### Una cola hecha con dos pilas

**Problema clásico:** implementa una cola usando solo dos pilas.

Idea: una pila `inbox` recibe los `enqueue`. Para desencolar necesitas el elemento **más antiguo**, que en `inbox` está al fondo. Si vuelcas `inbox` en otra pila `outbox`, el orden se invierte y el más antiguo queda arriba. La clave: **solo vuelcas cuando `outbox` está vacía**.

```ts
export class TwoStackQueue<T> {
  private inbox: T[] = [];
  private outbox: T[] = [];
  enqueue(x: T): void { this.inbox.push(x); }
  dequeue(): T | undefined {
    if (this.outbox.length === 0) {
      while (this.inbox.length > 0) this.outbox.push(this.inbox.pop()!);
    }
    return this.outbox.pop();
  }
}
```

¿Costo? Un `dequeue` individual puede ser O(n) (cuando vuelca). Pero cada elemento se mueve de `inbox` a `outbox` **una sola vez** en toda su vida. Así que `n` operaciones cuestan O(n) en total: **O(1) amortizado** por operación. Si volcaras de ida y vuelta en cada operación, sería O(n) cada vez. Este problema es un excelente ejercicio para practicar el razonamiento amortizado de la sesión 04.

### Problemas que piden una cola

**1. Procesar en orden de llegada.** Tareas de una impresora, solicitudes a un servidor, mensajes de un chat. Cualquier sistema "justo" en el sentido de "primero en llegar, primero en ser atendido".

**2. Búsqueda en anchura (BFS).** Explorar un grafo "por capas": primero los vecinos directos, luego los vecinos de los vecinos. La cola garantiza que procesas todos los de distancia 1 antes que cualquiera de distancia 2. Es el algoritmo para encontrar caminos más cortos en grafos sin pesos (sesión de grafos).

**3. Ventanas y buffers.** Guardar los últimos `k` eventos (por ejemplo, para calcular un promedio móvil): encolas el nuevo y desencolas el más viejo cuando superas `k`.

### Variantes: deque y cola de prioridad

- **Deque (double-ended queue):** permite agregar y quitar por ambos extremos en O(1). Sirve como pila y como cola a la vez, y es la base de técnicas como el "máximo en ventana deslizante".
- **Cola de prioridad:** no sale el más antiguo, sino el de **mayor prioridad** (o menor valor). No se implementa con un array ordenado (insertar sería O(n)) sino con un **heap**, que lo verás en la sesión de árboles. Es la estructura detrás del algoritmo de Dijkstra.

### De recursión a pila explícita

Como la recursión usa la pila de llamadas, **toda recursión se puede reescribir con una pila explícita**. Esto importa en JavaScript, donde la pila de llamadas tiene un límite de algunas decenas de miles de marcos. Ejemplo: sumar todos los números de una estructura anidada arbitrariamente profunda, como `[1, [2, [3, [4]]], 5]`.

```ts
type Nested = number | Nested[];

function sumNested(root: Nested): number {
  let total = 0;
  const stack: Nested[] = [root];
  while (stack.length > 0) {
    const item = stack.pop()!;
    if (typeof item === "number") total += item;
    else for (const child of item) stack.push(child); // "llamadas pendientes"
  }
  return total;
}
```

Cada elemento de `stack` representa trabajo pendiente, igual que cada marco en la pila de llamadas representa una función que todavía no terminó. Esta versión no tiene límite de profundidad (más allá de la memoria) y es la forma estándar de recorrer árboles muy profundos o grafos grandes sin riesgo de desbordamiento.

### Cómo reconocer cuál usar

| Señal en el enunciado | Estructura |
| --- | --- |
| "lo último que…", "el más reciente", "deshacer", "anidado", "volver atrás" | pila |
| "en orden de llegada", "por niveles", "el más cercano primero (sin pesos)" | cola |
| "por ambos extremos", "ventana deslizante con máximo" | deque |
| "el más urgente", "el menor costo hasta ahora" | cola de prioridad |

### Errores comunes

- **Usar `shift()` como dequeue** en bucles grandes: O(n²) oculto.
- **No comprobar la pila vacía** antes de `pop` o `peek` (devuelve `undefined` y el error aparece más tarde).
- **Olvidar comprobar la pila al final** en paréntesis balanceados: `"(("` no está balanceado.
- **Recorrer la pila para obtener el mínimo**: guarda la información auxiliar en cada operación.
- **Confundir cola de prioridad con cola ordenada en array**: la inserción en un array ordenado es O(n).
- **Recursión muy profunda** en JavaScript: si la profundidad puede ser de decenas de miles, usa una pila explícita.

### Para llevarte

Pilas y colas no son estructuras "más pobres" que un array: son arrays o listas con una **política** que te protege de errores y comunica intención. Cuando ves `stack.pop()` sabes que se trata de lo más reciente; cuando ves `queue.dequeue()`, de lo más antiguo. Las dos ideas transferibles de esta sesión son la **información auxiliar** (guardar algo extra en cada operación para responder rápido, como el mínimo por nivel) y el **análisis amortizado** de estructuras que a veces hacen trabajo grande (volcar una pila, compactar un array). Las dos vuelven en heaps, caches y diseño de sistemas.

## Conceptos clave

- **Pila (LIFO)**: colección donde el último elemento agregado es el primero en salir.
- **Cola (FIFO)**: colección donde el primer elemento agregado es el primero en salir.
- **Pila de llamadas**: pila que guarda un marco por cada función en ejecución y permite volver al punto de llamada.
- **Desbordamiento de pila**: error que ocurre cuando la pila de llamadas supera su tamaño máximo.
- **Buffer circular**: array de capacidad fija con índices que dan la vuelta usando módulo.
- **Deque**: cola con inserción y extracción en ambos extremos.
- **Información auxiliar**: datos extra que se actualizan en cada operación para responder consultas en O(1) (como el mínimo por nivel).

## Preguntas de repaso

1. ¿Por qué una pila es la estructura natural para verificar paréntesis balanceados?
   R: Porque cada cierre debe coincidir con la apertura más reciente que todavía no se cerró, y "lo más reciente primero" es exactamente la política LIFO. Se apilan las aperturas y, en cada cierre, se desapila y se compara; al final la pila debe quedar vacía.
2. ¿Por qué no conviene implementar una cola con `push` y `shift` en JavaScript?
   R: Porque `shift` es O(n): elimina el primer elemento y desplaza todos los demás. Un algoritmo que hace n desencolados termina siendo O(n²). Es mejor una lista enlazada, un array con índice de inicio o un buffer circular, que logran O(1).
3. ¿Cómo logras `min()` en O(1) en una pila y por qué funciona?
   R: Guardando, para cada nivel, el mínimo de todos los elementos hasta ese nivel (una segunda pila paralela). Funciona porque la pila solo cambia por arriba: los mínimos de los niveles inferiores no cambian mientras esos elementos sigan ahí, así que al desapilar, el mínimo correcto ya está guardado en el nuevo tope.
4. Una cola implementada con dos pilas tiene a veces un `dequeue` O(n). ¿Por qué se dice que es O(1) amortizado?
   R: Porque cada elemento se mueve de la pila de entrada a la de salida una sola vez en toda su vida, y solo se vuelca cuando la pila de salida está vacía. En n operaciones el total de movimientos es O(n), así que el costo promedio por operación es O(1).
5. ¿Qué relación hay entre la pila de llamadas y la recursión?
   R: Cada llamada recursiva apila un marco con sus variables locales y el punto de retorno; al terminar, se desapila y la ejecución vuelve al nivel anterior. Eso permite que cada nivel recuerde su propio estado. Si la recursión es demasiado profunda, la pila se llena y se produce un desbordamiento de pila.
6. Da un ejemplo de problema que pida cola y otro que pida cola de prioridad.
   R: Una cola sirve para procesar solicitudes en orden de llegada o para recorrer un grafo por niveles (BFS). Una cola de prioridad sirve cuando siempre debe atenderse primero el elemento más urgente o de menor costo, como en el algoritmo de Dijkstra o en un planificador de tareas por prioridad.

## Ejercicio

Implementa en TypeScript una calculadora de expresiones en notación postfija `evaluatePostfix(expr: string): number` que acepte números enteros y decimales y los operadores `+ - * /`, separados por espacios. Debe lanzar un error descriptivo si faltan operandos, si sobran números al final o si aparece un símbolo desconocido. Implementa también tu propia clase `Queue<T>` sin `shift()` y úsala para escribir `lastK(stream, k)` que devuelva los últimos `k` valores de un iterable.

Criterio de terminado: `evaluatePostfix("3 4 + 2 *")` devuelve 14 y `evaluatePostfix("5 1 2 + 4 * + 3 -")` devuelve 14; hay tests para los tres errores; un test inserta y extrae 100.000 elementos de tu cola en menos de 100 ms.

## Explícalo con tus palabras

Explica con un ejemplo de la vida diaria la diferencia entre una pila y una cola, y por qué la pila de llamadas tiene que ser una pila y no una cola.
