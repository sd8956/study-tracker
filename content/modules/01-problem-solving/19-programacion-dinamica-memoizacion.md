---
title: Programación dinámica I, memoización y tabulación
kind: lesson
hours: 2
sources: Cracking the Coding Interview, cap. 8 "Recursion and Dynamic Programming", Dynamic Programming & Memoization (pp. 142–148) | Grokking Algorithms, cap. 9 "Dynamic Programming" (pp. 180–190)
links: VisuAlgo, recursión y DP | https://visualgo.net/en/recursion
---

## Objetivo

Reconocer cuándo un problema tiene subproblemas repetidos, convertir una recursión exponencial en una solución eficiente con memoización (de arriba hacia abajo) y con tabulación (de abajo hacia arriba), y reducir la memoria cuando solo se necesitan los últimos resultados.

## Estudio

### El problema: trabajo repetido

En la sesión de recursión viste que Fibonacci ingenuo es exponencial. Recordemos la definición: `fib(0) = 0`, `fib(1) = 1`, y `fib(n) = fib(n − 1) + fib(n − 2)`.

```ts
function fib(n: number): number {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
}
```

Dibuja el árbol de llamadas para `fib(6)`:

```
                         fib(6)
                 /                  \
            fib(5)                  fib(4)
           /      \                /      \
       fib(4)    fib(3)        fib(3)    fib(2)
       /    \     /   \        /   \      /  \
   fib(3) fib(2) f(2) f(1)   f(2) f(1)  f(1) f(0)
    / \    / \   ...
  ...
```

`fib(4)` se calcula 2 veces, `fib(3)` 3 veces, `fib(2)` 5 veces. El árbol crece como O(2ⁿ) (más precisamente, como φⁿ con φ ≈ 1,618). Para `fib(50)` son decenas de miles de millones de llamadas. Pero ¿cuántos valores **distintos** hay que calcular? Solo 51: de `fib(0)` a `fib(50)`. Casi todo el trabajo es **repetido**.

La **programación dinámica** (DP) es la técnica de resolver un problema dividiéndolo en subproblemas que **se solapan**, resolviendo cada subproblema **una sola vez** y guardando su resultado. El nombre es histórico y no muy descriptivo; una mejor descripción sería "recursión + recordar resultados".

Un problema es candidato a DP cuando tiene dos propiedades:

1. **Subestructura óptima:** la solución del problema se construye a partir de soluciones de subproblemas más pequeños (como `fib(n)` a partir de `fib(n − 1)` y `fib(n − 2)`).
2. **Subproblemas solapados:** los mismos subproblemas aparecen una y otra vez.

Si solo hay subestructura pero los subproblemas no se repiten (como en merge sort, donde cada mitad es distinta), es divide y vencerás, no DP.

### Enfoque 1: memoización (de arriba hacia abajo)

Mantén la recursión tal cual, pero antes de calcular, **pregunta si ya lo calculaste**; después de calcular, **guárdalo**. Es la cache de la sesión de tablas hash aplicada a una función.

```ts
function fibMemo(n: number, memo = new Map<number, number>()): number {
  if (n <= 1) return n;
  const cached = memo.get(n);
  if (cached !== undefined) return cached;
  const result = fibMemo(n - 1, memo) + fibMemo(n - 2, memo);
  memo.set(n, result);
  return result;
}
```

Ahora el árbol se "poda": la primera vez que se pide `fib(4)` se calcula; las siguientes se responden desde la memo en O(1).

```
fib(6) → fib(5) → fib(4) → fib(3) → fib(2) → fib(1), fib(0)
                                     fib(3) pide fib(1): base
                           fib(4) pide fib(2): memo ✓
                 fib(5) pide fib(3): memo ✓
       fib(6) pide fib(4): memo ✓
```

**Costo:** cada `n` se calcula una vez con trabajo O(1): **O(n) tiempo**, O(n) espacio (memo + pila de recursión). De exponencial a lineal agregando tres líneas.

Ventajas de la memoización:

- Partes de la recursión natural, que ya sabes escribir (gran idea recursiva).
- Solo calcula los subproblemas que realmente se necesitan.

Desventajas: usa la pila de llamadas (riesgo de desbordamiento con `n` muy grande en JavaScript) y el costo de las llamadas recursivas.

### Enfoque 2: tabulación (de abajo hacia arriba)

En lugar de empezar por `fib(n)` y bajar, empieza por los casos más pequeños y **sube** llenando una tabla, en un orden que garantiza que cuando calculas un valor, sus dependencias ya están calculadas.

```ts
function fibTable(n: number): number {
  if (n <= 1) return n;
  const table = new Array<number>(n + 1);
  table[0] = 0;
  table[1] = 1;
  for (let i = 2; i <= n; i++) table[i] = table[i - 1] + table[i - 2];
  return table[n];
}
```

```
i:      0  1  2  3  4  5  6
table:  0  1  1  2  3  5  8
```

O(n) tiempo, O(n) espacio, sin recursión.

### Optimización de espacio

Mira la tabla: para calcular `table[i]` solo necesitas los dos valores anteriores. No hace falta guardar toda la tabla:

```ts
function fibFast(n: number): number {
  if (n <= 1) return n;
  let prev = 0, curr = 1;
  for (let i = 2; i <= n; i++) [prev, curr] = [curr, prev + curr];
  return curr;
}
```

O(n) tiempo, **O(1) espacio**. Esta optimización es frecuente: en muchas DP, cada fila o cada valor depende solo de los inmediatamente anteriores.

### Memoización vs tabulación

| | Memoización (top-down) | Tabulación (bottom-up) |
| --- | --- | --- |
| Punto de partida | la recursión natural | el caso base |
| Qué calcula | solo los subproblemas necesarios | todos los subproblemas de la tabla |
| Pila de llamadas | sí (riesgo con n grande) | no |
| Optimización de espacio | difícil | natural |
| Facilidad para escribir | alta si ya tienes la recursión | requiere pensar el orden de llenado |

Una estrategia de trabajo muy efectiva:

1. Escribe la **recursión** correcta (aunque sea exponencial).
2. Agrega **memoización** → ya es eficiente.
3. Si hace falta (profundidad, memoria), conviértela en **tabulación** y optimiza espacio.

### La receta para diseñar una DP

Casi todas las soluciones de DP se diseñan respondiendo cinco preguntas:

1. **Estado:** ¿qué información define un subproblema? (En Fibonacci, `n`. En problemas de grillas, `(fila, columna)`. En la mochila, `(objeto, capacidad)`.)
2. **Recurrencia:** ¿cómo se calcula un estado a partir de estados más pequeños?
3. **Casos base:** ¿qué estados se responden directamente?
4. **Orden:** ¿en qué orden llenar la tabla para que las dependencias estén listas? (Solo para tabulación.)
5. **Respuesta:** ¿qué estado (o combinación de estados) es la respuesta final?

Aplicada a cada ejemplo que sigue, esta receta convierte la DP en un procedimiento.

### Ejemplo 1: subir escaleras

Un niño sube una escalera de `n` escalones dando saltos de 1, 2 o 3 escalones. ¿De cuántas formas distintas puede subir?

1. **Estado:** `ways(i)` = formas de llegar al escalón `i`.
2. **Recurrencia:** el último salto fue de 1, 2 o 3. Entonces `ways(i) = ways(i − 1) + ways(i − 2) + ways(i − 3)`.
3. **Casos base:** `ways(0) = 1` (una forma de "estar" abajo: no moverse); `ways(negativo) = 0`.
4. **Orden:** de 0 a `n`.
5. **Respuesta:** `ways(n)`.

```ts
function countWays(n: number): number {
  const ways = new Array<number>(n + 1).fill(0);
  ways[0] = 1;
  for (let i = 1; i <= n; i++) {
    ways[i] = ways[i - 1] + (i >= 2 ? ways[i - 2] : 0) + (i >= 3 ? ways[i - 3] : 0);
  }
  return ways[n];
}
// countWays(4) = 7: 1111, 112, 121, 211, 22, 13, 31
```

Sin DP, el árbol tendría tres ramas por nivel: O(3ⁿ). Con DP, O(n). El caso base `ways(0) = 1` suele desconcertar; piénsalo así: hay exactamente una forma de no hacer nada, y sin él todas las sumas darían 0.

Atención a un detalle práctico: los números crecen rápido. Para `n` grande superan `Number.MAX_SAFE_INTEGER`; en esos casos se usa `BigInt` o se pide el resultado módulo un primo.

### Ejemplo 2: caminos en una grilla con obstáculos

Un robot está en la esquina superior izquierda de una grilla de `r × c` y solo puede moverse a la derecha o hacia abajo. Algunas celdas están bloqueadas. ¿De cuántas formas llega a la esquina inferior derecha?

1. **Estado:** `paths[i][j]` = formas de llegar a la celda `(i, j)`.
2. **Recurrencia:** a `(i, j)` se llega desde arriba o desde la izquierda: `paths[i][j] = paths[i − 1][j] + paths[i][j − 1]`, o 0 si la celda está bloqueada.
3. **Caso base:** `paths[0][0] = 1` si no está bloqueada.
4. **Orden:** fila por fila, de izquierda a derecha (así arriba e izquierda ya están calculadas).
5. **Respuesta:** `paths[r − 1][c − 1]`.

```ts
function gridPaths(blocked: boolean[][]): number {
  const rows = blocked.length, cols = blocked[0].length;
  const paths = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (blocked[i][j]) continue;               // queda en 0
      if (i === 0 && j === 0) { paths[i][j] = 1; continue; }
      paths[i][j] = (i > 0 ? paths[i - 1][j] : 0) + (j > 0 ? paths[i][j - 1] : 0);
    }
  }
  return paths[rows - 1][cols - 1];
}
```

```
grilla 3×3, centro bloqueado (X):    tabla:
.  .  .                              1  1  1
.  X  .                              1  0  1
.  .  .                              1  1  2   → 2 caminos
```

O(r · c) tiempo y espacio (reducible a O(c) guardando solo la fila anterior). La fuerza bruta exploraría todos los caminos: O(2^(r+c)).

### Ejemplo 3: el cambio con menos monedas

En la sesión de greedy viste que con monedas `[1, 3, 4]` el greedy falla para 6. La DP lo resuelve para cualquier sistema de monedas.

1. **Estado:** `best[a]` = menor cantidad de monedas para formar el monto `a`.
2. **Recurrencia:** la última moneda usada fue alguna `m`; entonces `best[a] = 1 + min(best[a − m])` sobre las monedas `m ≤ a`.
3. **Caso base:** `best[0] = 0`.
4. **Orden:** de 0 al monto objetivo.
5. **Respuesta:** `best[amount]` (o "imposible" si quedó en infinito).

```ts
function minCoins(coins: number[], amount: number): number {
  const best = new Array<number>(amount + 1).fill(Infinity);
  best[0] = 0;
  for (let a = 1; a <= amount; a++) {
    for (const m of coins) {
      if (m <= a && best[a - m] + 1 < best[a]) best[a] = best[a - m] + 1;
    }
  }
  return best[amount] === Infinity ? -1 : best[amount];
}
```

```
monedas [1, 3, 4]
a:     0  1  2  3  4  5  6
best:  0  1  2  1  1  2  2     → 6 = 3 + 3
```

O(amount × cantidad de monedas). Observa que la DP prueba **todas** las opciones para la última moneda (no solo la más grande, como el greedy) y se queda con la mejor; lo que la hace eficiente es que cada `best[a − m]` ya está calculado y no se recalcula.

Para **reconstruir** qué monedas usar, guarda en otra tabla qué moneda dio el mejor valor en cada monto y retrocede desde `amount`, igual que reconstruías caminos con la tabla de padres en BFS y Dijkstra.

### Ejemplo 4: elegir sin vecinos (las casas de la calle)

**Problema (propio):** en una calle hay casas con cierta cantidad de dinero guardado: `[6, 1, 2, 7, 3]`. Un ladrón no puede entrar en dos casas **contiguas** porque se activa una alarma compartida. ¿Cuánto es lo máximo que puede reunir?

Primero, prueba un greedy: "toma la casa más rica disponible". Toma 7 (índice 3), lo que bloquea 2 y 3; luego 6 (índice 0), que bloquea 1. Total 13. ¿Es óptimo? Las alternativas válidas son, por ejemplo, 6 + 2 + 3 = 11, 1 + 7 = 8 o 1 + 3 = 4; ninguna supera 13, así que aquí el greedy acertó, pero por suerte. Con `[5, 6, 5]` el greedy toma 6, que bloquea a ambos vecinos, y se queda en 6; en cambio 5 + 5 = 10. **Falla.** Como siempre, busca contraejemplos pequeños antes de confiar en un greedy.

Receta de DP:

1. **Estado:** `best[i]` = máximo reunido considerando las casas `0..i`.
2. **Recurrencia:** con la casa `i` hay dos opciones. No entrar: `best[i − 1]`. Entrar: `money[i] + best[i − 2]` (la anterior queda prohibida). `best[i] = máx(best[i − 1], money[i] + best[i − 2])`.
3. **Casos base:** `best[0] = money[0]`; `best[1] = máx(money[0], money[1])`.
4. **Orden:** de izquierda a derecha.
5. **Respuesta:** `best[n − 1]`.

```ts
function maxLoot(money: number[]): number {
  let prev2 = 0, prev1 = 0;            // best[i-2], best[i-1]
  for (const m of money) {
    const current = Math.max(prev1, m + prev2);
    prev2 = prev1;
    prev1 = current;
  }
  return prev1;
}
```

```
money:  6   1   2   7   3
best:   6   6   8  13  13
```

Fíjate en la estructura de la recurrencia: "**tomar o no tomar**" el elemento actual, donde tomarlo impone una restricción sobre los anteriores. Es la misma forma de pensar que vas a usar en la mochila de la próxima sesión, y también la del backtracking de subconjuntos (incluir o no incluir), pero ahora sin explorar todas las combinaciones, porque el estado resume todo lo que importa del pasado en un solo número.

Y como `best[i]` solo depende de los dos anteriores, el espacio es O(1), igual que en Fibonacci. De hecho, este problema **es** un Fibonacci con decisiones.

### Ejemplo 5: ¿se puede formar la suma?

**Problema:** dado un conjunto de números positivos `[3, 34, 4, 12, 5, 2]` y un objetivo `9`, ¿existe un subconjunto que sume exactamente 9?

Aquí la pregunta no es "cuántas formas" ni "el mínimo", sino "**¿es posible?**". La DP funciona igual, con booleanos:

1. **Estado:** `can[s]` = ¿se puede formar la suma `s` con los números procesados hasta ahora?
2. **Recurrencia:** al procesar un número `x`, cualquier suma `s` que ya se podía formar sigue pudiendo formarse, y además `s` se puede formar si `s − x` se podía formar antes de usar `x`.
3. **Caso base:** `can[0] = true` (el subconjunto vacío suma 0).

```ts
function canReachSum(nums: number[], target: number): boolean {
  const can = new Array<boolean>(target + 1).fill(false);
  can[0] = true;
  for (const x of nums) {
    for (let s = target; s >= x; s--) {   // de mayor a menor: cada número se usa una vez
      if (can[s - x]) can[s] = true;
    }
  }
  return can[target];
}
// canReachSum([3, 34, 4, 12, 5, 2], 9) → true (4 + 5, o 3 + 4 + 2)
```

El recorrido **de mayor a menor** es sutil pero crucial: si recorrieras de menor a mayor, al procesar `x = 3` marcarías `can[3]`, y enseguida `can[6]` usando ese mismo 3 otra vez, como si tuvieras dos treses. Recorrer hacia abajo garantiza que `can[s − x]` todavía refleja el estado **antes** de usar `x`. Volverás a ver este detalle en la mochila de la próxima sesión.

Costo: O(n × target). La fuerza bruta (probar los 2ⁿ subconjuntos) sería O(2ⁿ).

### Cómo reconocer un problema de DP

Señales en el enunciado:

- "¿De **cuántas formas**…?"
- "¿Cuál es el **mínimo / máximo**…?" cuando hay que elegir entre opciones en cada paso.
- "¿Es **posible**…?" formar algo con piezas.
- Calcular el **n-ésimo** término de algo definido recursivamente.
- Una recursión que, al dibujar su árbol, muestra **los mismos argumentos** en varias ramas.

Y una prueba práctica: escribe la recursión, ponle un contador o un `console.log` de los argumentos y mira si se repiten. Si se repiten, memoiza.

### Errores comunes

- **Memo compartida entre llamadas independientes** sin querer (por ejemplo, una memo global que guarda resultados para otro conjunto de monedas). La memo debe corresponder a una sola instancia del problema.
- **Estado incompleto:** si el resultado depende de algo que no está en la clave de la memo, la memo devuelve respuestas equivocadas.
- **Orden de llenado incorrecto** en tabulación: calcular un valor antes que sus dependencias.
- **Casos base mal definidos** (`ways(0) = 0` en lugar de 1).
- **Comprobar la memo con `if (memo.get(n))`**: falla cuando el valor guardado es 0. Compara con `undefined` o usa `has`.
- **Desbordamiento numérico** silencioso en conteos grandes.

## Conceptos clave

- **Programación dinámica**: técnica que resuelve problemas con subproblemas solapados calculando cada uno una sola vez y guardando su resultado.
- **Subestructura óptima**: la solución se construye a partir de soluciones de subproblemas más pequeños.
- **Subproblemas solapados**: los mismos subproblemas se necesitan varias veces.
- **Memoización (top-down)**: recursión que guarda y reutiliza resultados en una cache.
- **Tabulación (bottom-up)**: llenado iterativo de una tabla desde los casos base hacia la respuesta.
- **Estado**: información mínima que identifica un subproblema.
- **Recurrencia**: fórmula que expresa un estado en función de estados más pequeños.

## Preguntas de repaso

1. ¿Por qué Fibonacci recursivo ingenuo es exponencial y cómo lo vuelve lineal la memoización?
   R: Porque cada llamada genera dos más y los mismos valores se recalculan muchísimas veces en distintas ramas del árbol, que crece de forma exponencial. La memoización guarda cada `fib(k)` la primera vez que se calcula y lo devuelve directamente las siguientes, así que solo se calculan n + 1 valores distintos con trabajo constante cada uno.
2. ¿Qué dos propiedades indican que un problema se puede resolver con programación dinámica?
   R: Subestructura óptima (la solución se forma a partir de soluciones de subproblemas más pequeños) y subproblemas solapados (los mismos subproblemas aparecen repetidamente). Si solo hay subestructura pero los subproblemas no se repiten, es divide y vencerás.
3. Compara memoización y tabulación.
   R: La memoización parte de la recursión natural y guarda resultados en una cache; calcula solo los subproblemas necesarios pero usa la pila de llamadas. La tabulación llena una tabla desde los casos base en un orden donde las dependencias ya están calculadas; no usa recursión y facilita reducir la memoria, pero exige pensar el orden y suele calcular todos los subproblemas.
4. En el problema de las escaleras, ¿por qué `ways(0) = 1` y no 0?
   R: Porque hay exactamente una forma de estar en el escalón 0: no hacer ningún salto. Ese valor es la semilla de todas las sumas; si fuera 0, todos los valores de la tabla serían 0.
5. ¿Por qué la DP de monedas encuentra el óptimo donde el greedy falla?
   R: Porque para cada monto prueba todas las monedas posibles como última moneda y se queda con la que da menos monedas en total, usando los óptimos ya calculados de montos menores. El greedy, en cambio, se compromete con la moneda más grande sin considerar las alternativas.
6. ¿Cuándo puedes reducir el espacio de una tabulación y cómo?
   R: Cuando cada valor depende solo de un número fijo de valores anteriores (los dos últimos en Fibonacci, la fila anterior en una grilla). Entonces basta guardar esas variables o esa fila, en lugar de la tabla completa.

## Ejercicio

Para cada problema escribe tres versiones en TypeScript (recursiva ingenua, memoizada y tabulada) y cuenta las llamadas o iteraciones: (a) `countWays(n)` con saltos de 1, 2 o 3; (b) `minCoins(coins, amount)` que además devuelva la lista de monedas usadas; (c) `gridPaths(blocked)` con optimización a una sola fila.

Criterio de terminado: tests que comparan las tres versiones en entradas pequeñas (deben coincidir); una tabla que muestra cómo crecen las llamadas de la versión ingenua frente a la memoizada para `n = 10, 20, 25`; `minCoins([1, 3, 4], 6)` devuelve 2 monedas `[3, 3]`; `minCoins([5, 10], 3)` devuelve -1.

## Explícalo con tus palabras

Explica a alguien que empieza por qué "recordar lo que ya calculaste" convierte un problema que tardaría años en uno que tarda milisegundos, usando el árbol de Fibonacci como dibujo.
