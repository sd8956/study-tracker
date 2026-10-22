---
title: Recursión, casos base y la gran idea recursiva
kind: lesson
hours: 2
sources: Grokking Algorithms, cap. 3 "Recursion" (pp. 55–69) | Think Like a Programmer, cap. 6 "Solving Problems with Recursion", hasta "Common Mistakes" (pp. 183–200)
links: Python Tutor (visualiza la pila de llamadas, también JavaScript) | https://pythontutor.com/javascript.html
---

## Objetivo

Escribir funciones recursivas correctas con confianza: identificar el caso base y el caso recursivo, seguir la pila de llamadas, distinguir recursión de cabeza y de cola, y aplicar la "gran idea recursiva" para pasar de una solución iterativa a una recursiva sin perderte.

## Estudio

### Qué es la recursión

Una función es **recursiva** cuando se llama a sí misma. Dicho así suena a truco o a bucle infinito, pero la idea es muy natural: resolver un problema **apoyándose en la solución de una versión más pequeña del mismo problema**.

Ejemplo cotidiano: estás en una fila larga y quieres saber en qué posición estás, pero no ves el principio. Le preguntas a la persona de adelante: "¿en qué posición estás tú?". Ella hace lo mismo con la de adelante, y así hasta llegar a la primera persona, que **sabe** que es la número 1 sin preguntar a nadie. Esa respuesta vuelve hacia atrás: la segunda dice "yo soy la 2", la tercera "yo soy la 3", hasta que te llega a ti. Nadie necesitó ver toda la fila; cada uno hizo una pregunta más pequeña y sumó 1.

En esa historia están las dos partes de toda recursión:

- **Caso base:** la primera persona responde directamente, sin preguntar. Es lo que detiene la recursión.
- **Caso recursivo:** cualquier otra persona pregunta a la de adelante (un problema más pequeño) y usa la respuesta.

### Caso base y caso recursivo

```ts
function countdown(n: number): void {
  if (n <= 0) {            // caso base
    console.log("¡Despegue!");
    return;
  }
  console.log(n);
  countdown(n - 1);        // caso recursivo: problema más pequeño
}
```

Si olvidas el caso base, o si el caso recursivo no acerca el problema al caso base, la función se llama para siempre (hasta que la pila de llamadas se desborda). Por eso, al escribir una función recursiva, hazte siempre dos preguntas:

1. ¿Cuál es la versión del problema tan pequeña que puedo responder sin recursión?
2. ¿Cada llamada recursiva se acerca a ese caso?

Una observación importante: **la recursión nunca es más rápida que un bucle** por el simple hecho de ser recursión. A veces es más lenta y usa más memoria. Su valor está en que ciertos problemas se expresan de forma mucho más **clara** con recursión, sobre todo los que tienen estructura recursiva: árboles, listas, divide y vencerás, exploración de posibilidades.

### La pila de llamadas en acción

En la sesión de Big O viste que la pila de llamadas cuenta como memoria: cada llamada a función apila un marco con sus variables. Con recursión, la misma función tiene **varios marcos apilados a la vez**, cada uno con su propio valor de `n`. Mira el factorial:

```ts
function factorial(n: number): number {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}
```

Al llamar `factorial(4)`:

```
fase de ida (apilar)                    fase de vuelta (desapilar)
┌──────────────┐                        
│ factorial(1) │ → devuelve 1           factorial(1) = 1
├──────────────┤
│ factorial(2) │ espera 2 * f(1)        factorial(2) = 2 * 1 = 2
├──────────────┤
│ factorial(3) │ espera 3 * f(2)        factorial(3) = 3 * 2 = 6
├──────────────┤
│ factorial(4) │ espera 4 * f(3)        factorial(4) = 4 * 6 = 24
└──────────────┘
```

Cada marco queda "en pausa" esperando el resultado de la llamada de arriba. Cuando el caso base devuelve 1, los marcos se resuelven uno por uno en orden inverso. Esto explica por qué la recursión usa O(n) de memoria aquí: hay `n` marcos esperando al mismo tiempo.

Analogía de las cajas: buscas una llave dentro de una caja que contiene cajas, que contienen más cajas. Con un bucle, mantienes una pila de "cajas por revisar": un array donde agregas al final con `push` y sacas del final con `pop`. Con recursión, la función "revisar caja" se llama para cada caja interna, y la pila de llamadas lleva la cuenta por ti de dónde ibas. Las dos soluciones hacen lo mismo; la recursiva suele leerse más claro.

### Recursión de cabeza y de cola

Hay dos formas de organizar el trabajo en una función recursiva, según **cuándo** se hace el trabajo propio respecto a la llamada recursiva.

Imagina una línea de tren con varias estaciones. En cada estación hay un empleado que cuenta los pasajeros de su andén. Quieres el total de todas las estaciones desde la tuya hasta el final de la línea.

**Enfoque 1 (recursión de cola, *tail*):** cuentas tus pasajeros, sumas lo que te pasaron, y le pasas el **total parcial** al siguiente: "hasta aquí llevamos 37, suma los tuyos y sigue". El último empleado conoce el total final. El trabajo se hace **antes** de la llamada.

**Enfoque 2 (recursión de cabeza, *head*):** le preguntas al siguiente "¿cuántos hay desde tu estación hasta el final?", esperas su respuesta y le sumas tus pasajeros. El trabajo propio se hace **después** de la llamada.

```ts
// Cabeza: el trabajo (sumar) ocurre al volver de la llamada
function sumHead(arr: number[], i = 0): number {
  if (i === arr.length) return 0;
  return arr[i] + sumHead(arr, i + 1);
}

// Cola: el trabajo ocurre antes; la llamada recursiva es lo último que se hace
function sumTail(arr: number[], i = 0, acc = 0): number {
  if (i === arr.length) return acc;
  return sumTail(arr, i + 1, acc + arr[i]);
}
```

¿Qué cambia?

- En la versión de **cola**, la llamada recursiva es la última operación. Algunos lenguajes (Scheme, Scala, y en teoría JavaScript en modo estricto según la especificación, aunque casi ningún motor lo implementa) pueden **reutilizar el marco** y evitar el crecimiento de la pila. En la práctica, en JavaScript ambas versiones usan O(n) de pila.
- La versión de **cola** necesita un parámetro extra (el acumulador) que transporta el resultado parcial.
- La versión de **cabeza** suele ser más natural de razonar ("dame la respuesta del resto y yo agrego lo mío") y pasa menos información.

Un ejemplo donde el orden importa visiblemente: imprimir una lista al derecho o al revés.

```ts
function printForward(arr: string[], i = 0): void {
  if (i === arr.length) return;
  console.log(arr[i]);          // antes de la llamada → orden normal
  printForward(arr, i + 1);
}

function printBackward(arr: string[], i = 0): void {
  if (i === arr.length) return;
  printBackward(arr, i + 1);
  console.log(arr[i]);          // después de la llamada → orden inverso
}
```

`printBackward` imprime en orden inverso sin invertir nada: aprovecha que los marcos se resuelven al revés de como se apilaron.

### La gran idea recursiva

Aquí está la idea más útil de la sesión, la que te permite escribir funciones recursivas sin marearte siguiendo la pila mentalmente.

Vuelve a la fila de personas. Cuando le preguntas a la de adelante su posición, **no te importa cómo la averigua**. Solo te importa que te dé la respuesta correcta. Confías en ella. Esa confianza es la clave: al escribir el caso recursivo, **asume que la llamada recursiva ya funciona** para el problema más pequeño, y concéntrate solo en cómo usar su resultado.

Esta idea se puede convertir en una técnica casi mecánica, en tres pasos:

**Paso 1. Escribe una solución iterativa** (o cualquier solución que funcione).

```ts
function iterativeMax(arr: number[], size: number): number {
  let best = arr[0];
  for (let i = 1; i < size; i++) if (arr[i] > best) best = arr[i];
  return best;
}
```

**Paso 2. Escribe un "despachador"** que resuelva el caso trivial por sí solo y, para el resto, delegue en la función iterativa **un problema más pequeño**, usando su resultado para completar el trabajo.

```ts
function maxDispatcher(arr: number[], size: number): number {
  if (size === 1) return arr[0];                      // caso trivial, sin ayuda
  const maxOfRest = iterativeMax(arr, size - 1);      // problema más pequeño
  return Math.max(maxOfRest, arr[size - 1]);          // completo con mi parte
}
```

Este despachador es claramente correcto: el caso de tamaño 1 es trivial y, para el resto, usa una función que ya sabes que funciona sobre los primeros `size - 1` elementos, y le agrega el último.

**Paso 3. Reemplaza la llamada a la función iterativa por una llamada al propio despachador.** Como el despachador hace exactamente lo mismo que la iterativa (devolver el máximo de los primeros `size` elementos), el cambio no altera el resultado.

```ts
function recursiveMax(arr: number[], size: number): number {
  if (size === 1) return arr[0];
  const maxOfRest = recursiveMax(arr, size - 1);
  return Math.max(maxOfRest, arr[size - 1]);
}
```

¡Listo! Escribiste una función recursiva sin haber tenido que "pensar recursivamente". Las dos reglas del despachador garantizan que funciona:

1. **Maneja completamente el caso más trivial** sin llamar a nadie.
2. **Cuando delega, delega un problema estrictamente más pequeño** (y del mismo tipo).

Con el tiempo dejarás de necesitar los pasos 1 y 2: escribirás el despachador directamente. Pero cuando un problema recursivo te bloquee, vuelve a este método.

### Cómo diseñar el caso recursivo: preguntas guía

Para cualquier problema que sospeches recursivo:

1. **¿Cómo puedo partir este problema en "una parte pequeña que manejo yo" + "el resto, que es el mismo problema pero más chico"?** (Primer elemento + resto del array; último carácter + resto del string; raíz + subárboles.)
2. **¿Cuál es el caso más pequeño posible?** (Array vacío, string de un carácter, árbol nulo.)
3. **Suponiendo que la llamada recursiva me da la respuesta correcta para el resto, ¿cómo la combino con mi parte?**

Ejemplo: ¿es un string un palíndromo?

1. Parte pequeña: el primer y el último carácter. Resto: lo de en medio.
2. Caso base: un string de longitud 0 o 1 es palíndromo.
3. Combinación: es palíndromo si los extremos son iguales **y** lo de en medio es palíndromo.

```ts
function isPalindrome(s: string, lo = 0, hi = s.length - 1): boolean {
  if (lo >= hi) return true;
  return s[lo] === s[hi] && isPalindrome(s, lo + 1, hi - 1);
}
```

Fíjate en que usamos índices (`lo`, `hi`) en lugar de crear substrings con `slice` en cada llamada. Crear substrings costaría O(n) por llamada y llevaría el total a O(n²); con índices es O(n).

### Otro ejemplo: contar ocurrencias

Cuenta cuántas veces aparece un valor en un array.

- Parte pequeña: el primer elemento. Resto: el array desde el índice 1.
- Caso base: array vacío → 0.
- Combinación: `(primero === valor ? 1 : 0) + ocurrencias en el resto`.

```ts
function countOf(arr: number[], target: number, i = 0): number {
  if (i === arr.length) return 0;
  return (arr[i] === target ? 1 : 0) + countOf(arr, target, i + 1);
}
```

Observa el patrón: todas estas funciones se parecen. Con práctica, el "esqueleto" recursivo sobre secuencias se vuelve automático: caso base en el final, mi parte con el índice actual, el resto con `i + 1`.

### Recursión con varias llamadas: las Torres de Hanói

Hasta ahora cada función hacía una sola llamada recursiva. Hay problemas donde la forma natural de dividir produce **dos o más** subproblemas. El ejemplo clásico son las Torres de Hanói: tienes tres varillas (A, B, C) y `n` discos de tamaños distintos apilados en A, del más grande abajo al más pequeño arriba. Debes pasarlos todos a C moviendo un disco a la vez y sin poner nunca un disco sobre uno más pequeño.

Intentar resolverlo pensando en movimientos individuales es desesperante. Con la gran idea recursiva es casi inmediato. Pregúntate: "si ya supiera mover `n − 1` discos de una varilla a otra (confío en la llamada recursiva), ¿cómo muevo `n`?".

1. Mueve los `n − 1` discos de arriba de A a B, usando C como auxiliar (llamada recursiva).
2. Mueve el disco más grande de A a C (un movimiento directo).
3. Mueve los `n − 1` discos de B a C, usando A como auxiliar (llamada recursiva).

Caso base: con 0 discos no hay nada que hacer.

```ts
function hanoi(n: number, from: string, to: string, via: string, moves: string[] = []): string[] {
  if (n === 0) return moves;
  hanoi(n - 1, from, via, to, moves);  // despejar el camino
  moves.push(`${from} → ${to}`);       // mover el grande
  hanoi(n - 1, via, to, from, moves);  // reconstruir encima
  return moves;
}

hanoi(3, "A", "C", "B"); // 7 movimientos
```

Fíjate en que nunca tuviste que imaginar la secuencia completa de movimientos. Solo describiste **un nivel** y confiaste en el resto. Eso es exactamente lo que la gran idea recursiva promete.

¿Cuánto cuesta? Cada llamada con `n` hace dos llamadas con `n − 1`. Con la regla de la sesión de Big O (ramas elevadas a profundidad), son O(2ⁿ) llamadas. De hecho, el número exacto de movimientos es `2ⁿ − 1`: con 3 discos, 7; con 20 discos, más de un millón; con 64, una cantidad que tardaría cientos de miles de millones de años a un movimiento por segundo. Y no es que el algoritmo sea malo: se puede demostrar que no existe una solución con menos movimientos. Algunos problemas son intrínsecamente exponenciales.

Contraste importante: Fibonacci recursivo ingenuo (`fib(n) = fib(n−1) + fib(n−2)`) también hace dos llamadas y también es exponencial, pero **ahí sí sobra trabajo**: calcula muchas veces los mismos valores. Lo vas a resolver en la sesión de programación dinámica guardando resultados ya calculados. Distinguir "exponencial porque el problema lo exige" de "exponencial porque repito trabajo" es una habilidad clave.

### Errores comunes

**Demasiados parámetros.** Un síntoma frecuente de no haber aplicado la gran idea recursiva es pasar en cada llamada información que la llamada no necesita: contadores globales, el resultado parcial "por si acaso", banderas. Si estás agregando parámetros para que la recursión "funcione", probablemente estás pensando en cómo se ejecuta la recursión en lugar de en qué devuelve cada llamada. Pregúntate: "¿qué respuesta le pido a la llamada recursiva?" y pásale solo lo necesario para responderla.

**Variables globales.** Usar una variable externa para acumular el resultado (`let total = 0; function visit(...) { total += ... }`) funciona, pero rompe la independencia de cada llamada: la función deja de ser reutilizable (si la llamas dos veces, el total se acumula), no se puede razonar sobre ella localmente y no se puede usar en paralelo. La versión correcta **devuelve** el resultado y deja que cada nivel lo combine.

```ts
// Mal: depende de estado global
let total = 0;
function badSum(arr: number[], i = 0): void {
  if (i === arr.length) return;
  total += arr[i];
  badSum(arr, i + 1);
}

// Bien: cada llamada devuelve su respuesta
function goodSum(arr: number[], i = 0): number {
  return i === arr.length ? 0 : arr[i] + goodSum(arr, i + 1);
}
```

**Olvidar el caso base o no acercarse a él.** `f(n)` que llama a `f(n)` (o a `f(n + 1)` cuando el caso base es `n === 0`) nunca termina.

**Casos base incompletos.** Si la recursión avanza de dos en dos (`n - 2`), necesitas casos base para 0 y para 1, o para `n <= 1`.

**Recursión profunda en JavaScript.** Con arrays de cientos de miles de elementos, una recursión lineal desborda la pila. Usa recursión para estructuras de profundidad razonable (árboles balanceados, divide y vencerás) y bucles para recorrer secuencias largas.

**Copiar datos en cada llamada.** `arr.slice(1)` o `s.substring(1)` en cada nivel convierten un algoritmo O(n) en O(n²) en tiempo y memoria. Pasa índices.

### ¿Cuándo usar recursión?

Una guía inicial (la sesión siguiente profundiza):

| Situación | Recomendación |
| --- | --- |
| Recorrer una secuencia lineal larga | bucle |
| Estructuras recursivas (árboles, JSON anidado, sistemas de archivos) | recursión |
| Divide y vencerás (quicksort, merge sort, búsqueda binaria) | recursión (profundidad log n) |
| Explorar todas las combinaciones o caminos (backtracking) | recursión |
| Profundidad potencialmente enorme | pila explícita |

## Conceptos clave

- **Recursión**: técnica en la que una función resuelve un problema llamándose a sí misma con una versión más pequeña.
- **Caso base**: versión del problema que se resuelve directamente y detiene la recursión.
- **Caso recursivo**: parte que reduce el problema y combina el resultado de la llamada recursiva.
- **Marco de pila**: registro de una llamada con sus variables locales y su punto de retorno.
- **Recursión de cabeza**: el trabajo propio se hace después de la llamada recursiva.
- **Recursión de cola**: la llamada recursiva es la última operación; el resultado parcial viaja en un acumulador.
- **Despachador**: función intermedia que resuelve el caso trivial y delega un problema más pequeño; paso para convertir una solución iterativa en recursiva.
- **Gran idea recursiva**: al escribir el caso recursivo, confiar en que la llamada recursiva devuelve la respuesta correcta y ocuparse solo de combinarla.

## Preguntas de repaso

1. ¿Cuáles son las dos partes de toda función recursiva y qué pasa si falta una?
   R: El caso base, que resuelve directamente el problema más pequeño, y el caso recursivo, que reduce el problema y se llama a sí mismo. Sin caso base, o si el caso recursivo no se acerca a él, la función se llama indefinidamente hasta desbordar la pila. Sin caso recursivo no hay recursión.
2. ¿Por qué `factorial(n)` recursivo usa O(n) de memoria?
   R: Porque cada llamada queda en pausa esperando el resultado de la siguiente, y hasta llegar al caso base hay n marcos apilados a la vez en la pila de llamadas.
3. ¿Qué diferencia hay entre recursión de cabeza y de cola?
   R: En la de cabeza, la función primero hace la llamada recursiva y después hace su propio trabajo con el resultado. En la de cola, hace su trabajo antes y la llamada recursiva es la última operación, normalmente pasando un acumulador. Algunos lenguajes optimizan la de cola reutilizando el marco, pero los motores de JavaScript en general no.
4. Explica las dos reglas del despachador en la gran idea recursiva.
   R: Primera, el despachador debe resolver completamente el caso más trivial sin llamar a ninguna otra función. Segunda, cuando delega, debe pasar un problema estrictamente más pequeño del mismo tipo y usar el resultado para completar la respuesta. Si se cumplen, se puede reemplazar la llamada a la función iterativa por una llamada al propio despachador y la función recursiva resultante es correcta.
5. ¿Por qué usar una variable global para acumular resultados en una función recursiva es mala idea?
   R: Porque la función deja de ser independiente: llamarla dos veces acumula resultados mezclados, no se puede razonar sobre cada llamada de forma local y no es reutilizable. Es mejor que cada llamada devuelva su resultado y que el nivel superior lo combine.
6. ¿Por qué `isPalindrome` recursivo debería usar índices en lugar de `slice`?
   R: Porque `slice` crea un string nuevo de longitud proporcional a n en cada llamada, lo que lleva el costo total a O(n²) en tiempo y memoria. Con índices, cada llamada es O(1) y el total es O(n).

## Ejercicio

Aplica la técnica del despachador (escribe los tres pasos: iterativa, despachador, recursiva) para dos funciones en TypeScript: `countNegatives(arr)` y `reverseString(s)` (esta última con índices y un array de caracteres, sin `slice` por llamada). Después escribe directamente, sin pasos intermedios, `power(base, exp)` recursiva que calcule `base^exp` en O(log exp) usando que `b^e = (b^(e/2))²` si `e` es par.

Criterio de terminado: los tres pasos de las dos primeras funciones están en el archivo con comentarios; las tres funciones finales tienen tests (incluidos array vacío, string vacío y exponente 0); `power(2, 30)` hace como máximo unas 10 llamadas recursivas, no 30 (verifícalo con un contador).

## Explícalo con tus palabras

Explica la gran idea recursiva usando la historia de la fila de personas: por qué cada persona puede confiar en la respuesta de la de adelante sin saber cómo la obtuvo.
