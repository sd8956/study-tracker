---
title: Recursión sobre estructuras, funciones envoltorio y backtracking
kind: lesson
hours: 2
sources: Think Like a Programmer, cap. 6 "Applying Recursion to Dynamic Data Structures", "Wrapper Functions" y "When to Choose Recursion" (pp. 201–216) | Cracking the Coding Interview, cap. 8 "Recursion and Dynamic Programming", How to Approach y Recursive vs. Iterative Solutions (pp. 142–143)
---

## Objetivo

Aplicar recursión a estructuras recursivas (listas y árboles binarios), usar funciones envoltorio para ocultar parámetros internos, decidir cuándo conviene recursión y cuándo iteración, y generar combinaciones con backtracking.

## Estudio

### Estructuras que son recursivas por naturaleza

En la sesión anterior aplicaste recursión a arrays, donde funciona pero no es imprescindible: un bucle suele ser igual de claro. La recursión brilla de verdad cuando **la propia estructura de datos es recursiva**, es decir, cuando se define en términos de sí misma:

- Una **lista enlazada** es: vacía (`null`), o un nodo seguido de **otra lista**.
- Un **árbol binario** es: vacío (`null`), o un nodo con un valor, un **subárbol izquierdo** y un **subárbol derecho**.
- Una **carpeta** es: un conjunto de archivos y **otras carpetas**.
- Un **valor JSON** es: un primitivo, o un array/objeto que contiene **otros valores JSON**.

Cuando la estructura es recursiva, la solución recursiva prácticamente se escribe sola: el caso base es la estructura vacía y el caso recursivo procesa el nodo actual y delega en las subestructuras.

### Recursión sobre listas enlazadas

Usaremos el mismo nodo de la sesión de listas:

```ts
interface ListNode { value: number; next: ListNode | null }
```

**Contar los números negativos de una lista.**

- Caso base: lista vacía → 0.
- Caso recursivo: (1 si el nodo actual es negativo, si no 0) + negativos del resto.

```ts
function countNegatives(node: ListNode | null): number {
  if (node === null) return 0;
  return (node.value < 0 ? 1 : 0) + countNegatives(node.next);
}
```

Compara con la versión sobre arrays de la sesión anterior: ya no hace falta un índice, porque "el resto" de una lista **es** otra lista (`node.next`). La estructura hace el trabajo de dividir.

Otros ejemplos con el mismo esqueleto:

```ts
const sum = (n: ListNode | null): number => (n === null ? 0 : n.value + sum(n.next));
const max = (n: ListNode): number => (n.next === null ? n.value : Math.max(n.value, max(n.next)));
```

Fíjate en `max`: el caso base no es la lista vacía (el máximo de nada no está definido), sino la lista de **un** elemento. Elegir bien el caso base es parte del diseño.

### Recursión sobre árboles binarios

```ts
interface TreeNode { value: number; left: TreeNode | null; right: TreeNode | null }
```

```
          8
        /   \
       3     10
      / \      \
     1   6      14
        / \
       4   7
```

Aquí la recursión es todavía más natural, porque hay **dos** subestructuras y escribir lo mismo con bucles exige una pila explícita.

**Contar nodos:**

```ts
function countNodes(node: TreeNode | null): number {
  if (node === null) return 0;
  return 1 + countNodes(node.left) + countNodes(node.right);
}
```

**Contar hojas** (nodos sin hijos):

```ts
function countLeaves(node: TreeNode | null): number {
  if (node === null) return 0;
  if (node.left === null && node.right === null) return 1;
  return countLeaves(node.left) + countLeaves(node.right);
}
```

Hay dos casos base: el árbol vacío y la hoja. En el árbol de ejemplo, las hojas son 1, 4, 7 y 14: devuelve 4.

**Altura del árbol** (cantidad de niveles):

```ts
function height(node: TreeNode | null): number {
  if (node === null) return 0;
  return 1 + Math.max(height(node.left), height(node.right));
}
```

**Valor máximo:**

```ts
function maxValue(node: TreeNode): number {
  let best = node.value;
  if (node.left) best = Math.max(best, maxValue(node.left));
  if (node.right) best = Math.max(best, maxValue(node.right));
  return best;
}
```

Aplica la gran idea recursiva en cada caso: "si ya supiera la respuesta para el subárbol izquierdo y para el derecho, ¿cómo calculo la del árbol completo?". Contar: sumo ambas y agrego 1. Altura: tomo la mayor y agrego 1. Máximo: comparo mi valor con ambos máximos. **Nunca** necesitas imaginar cómo se recorre el árbol entero.

Costo: cada función visita cada nodo una vez, O(n) tiempo. Espacio: la profundidad de la pila es la altura `h` del árbol: O(log n) si está balanceado, O(n) si está degenerado (todos los nodos en una sola rama, como una lista).

### El orden de la visita: preorden, inorden y postorden

Cuando recorres un árbol recursivamente, hay tres momentos posibles para "hacer algo" con el nodo actual: antes de visitar los hijos, entre el hijo izquierdo y el derecho, o después de ambos. Es la misma distinción entre recursión de cabeza y de cola que viste en la sesión anterior, aplicada a dos ramas.

```ts
function preorder(n: TreeNode | null, out: number[]): void {
  if (!n) return;
  out.push(n.value);          // primero el nodo
  preorder(n.left, out);
  preorder(n.right, out);
}
function inorder(n: TreeNode | null, out: number[]): void {
  if (!n) return;
  inorder(n.left, out);
  out.push(n.value);          // entre los hijos
  inorder(n.right, out);
}
function postorder(n: TreeNode | null, out: number[]): void {
  if (!n) return;
  postorder(n.left, out);
  postorder(n.right, out);
  out.push(n.value);          // después de los hijos
}
```

Con el árbol de ejemplo:

| Recorrido | Resultado | Uso típico |
| --- | --- | --- |
| Preorden | 8, 3, 1, 6, 4, 7, 10, 14 | copiar o serializar un árbol (el padre antes que los hijos) |
| Inorden | 1, 3, 4, 6, 7, 8, 10, 14 | en un árbol binario de búsqueda, produce los valores **ordenados** |
| Postorden | 1, 4, 7, 6, 3, 14, 10, 8 | liberar o borrar (los hijos antes que el padre), calcular tamaños |

El inorden ordenado no es casualidad: el árbol de ejemplo es un **árbol binario de búsqueda** (todo lo de la izquierda es menor y todo lo de la derecha es mayor). Lo estudiarás a fondo en la sesión de árboles. Observa también que `countNodes`, `height` y `maxValue` son en realidad recorridos en postorden: necesitan la respuesta de los hijos antes de calcular la propia.

### Un caso real: tamaño de una carpeta

Los árboles binarios son el ejemplo de manual, pero en el trabajo diario la recursión aparece con estructuras de **muchos** hijos. Un sistema de archivos es el caso perfecto:

```ts
type Entry =
  | { kind: "file"; name: string; bytes: number }
  | { kind: "dir"; name: string; children: Entry[] };

function totalSize(entry: Entry): number {
  if (entry.kind === "file") return entry.bytes;          // caso base
  let total = 0;
  for (const child of entry.children) total += totalSize(child); // un nivel, n hijos
  return total;
}

function findLargestFile(entry: Entry): { name: string; bytes: number } | null {
  if (entry.kind === "file") return { name: entry.name, bytes: entry.bytes };
  let best: { name: string; bytes: number } | null = null;
  for (const child of entry.children) {
    const candidate = findLargestFile(child);
    if (candidate && (!best || candidate.bytes > best.bytes)) best = candidate;
  }
  return best;
}
```

El patrón es idéntico al de los árboles binarios: caso base en la hoja (archivo), y en el nodo interno (carpeta) se combina la respuesta de cada hijo. La única diferencia es que en lugar de "izquierda y derecha" hay un bucle sobre `children`. El tipo unión discriminado (`kind: "file" | "dir"`) hace que TypeScript te obligue a manejar ambos casos, lo que ayuda a no olvidar el caso base.

Lo mismo sirve para recorrer un JSON arbitrario, un árbol de componentes de React, un organigrama o los comentarios anidados de un foro. Cada vez que veas datos jerárquicos, piensa: "¿qué hago en una hoja? ¿cómo combino las respuestas de los hijos?".

### Funciones envoltorio (wrapper functions)

A veces la función recursiva necesita parámetros que no tienen sentido para quien la llama: un índice, un acumulador, un límite. Obligar al usuario a pasarlos es incómodo y propenso a errores (`sumFrom(arr, 0)`… ¿y si alguien pasa 3?).

La solución es una **función envoltorio**: una función pública con la interfaz limpia que llama a una función recursiva interna con los parámetros adicionales.

```ts
export function binarySearch(arr: number[], target: number): number {
  return search(0, arr.length - 1); // envoltorio: interfaz limpia

  function search(lo: number, hi: number): number { // recursiva interna
    if (lo > hi) return -1;
    const mid = lo + Math.floor((hi - lo) / 2);
    if (arr[mid] === target) return mid;
    return arr[mid] < target ? search(mid + 1, hi) : search(lo, mid - 1);
  }
}
```

Los envoltorios también sirven para:

- **Manejar casos especiales una sola vez**: por ejemplo, validar la entrada o resolver el árbol vacío antes de empezar la recursión, en lugar de comprobarlo en cada nivel.
- **Ocultar la estructura interna**: una clase `BinarySearchTree` expone `count()` sin parámetros, y por dentro llama a `countNodes(this.root)`. Quien usa la clase nunca ve nodos.

```ts
class BinaryTree {
  private root: TreeNode | null = null;
  count(): number { return countNodes(this.root); } // envoltorio público
}
```

En TypeScript también puedes usar parámetros con valor por defecto (`function sum(arr, i = 0)`), que es un envoltorio implícito. Funciona, pero deja la puerta abierta a que alguien pase un valor indebido. Para APIs públicas, el envoltorio explícito es más robusto.

### Cuándo elegir recursión (y cuándo no)

Argumentos **en contra** de la recursión:

1. **Memoria y profundidad.** Cada llamada ocupa un marco. Recursión lineal sobre una lista de 100.000 elementos desborda la pila en JavaScript.
2. **Costo de las llamadas.** Llamar a una función es más caro que una iteración de bucle (aunque los motores modernos reducen mucho la diferencia).
3. **Trabajo repetido oculto.** La recursión ingenua puede recalcular los mismos subproblemas una y otra vez (Fibonacci ingenuo es O(2ⁿ)).
4. **Claridad** en problemas lineales: para sumar un array, un bucle es más claro para la mayoría de lectores.

Argumentos **a favor**:

1. **Estructuras recursivas** (árboles, grafos, datos anidados): la recursión refleja la forma de los datos y el código queda mucho más corto.
2. **Divide y vencerás:** la profundidad es O(log n), así que la pila no es un problema.
3. **Exploración de posibilidades (backtracking):** generar combinaciones, resolver laberintos, Sudoku.
4. **Problemas con más de una subdivisión por paso**: escribir eso iterativamente exige gestionar una pila a mano.

Una regla práctica: si el problema tiene una sola "rama" por paso (recorrido lineal), prefiere un bucle. Si tiene varias ramas o la estructura es jerárquica, prefiere recursión, salvo que la profundidad pueda ser enorme.

Y recuerda: **todo algoritmo recursivo se puede escribir de forma iterativa** con una pila explícita, como viste en la sesión de pilas. Si la recursión es cómoda pero la profundidad te preocupa, primero escríbela recursiva (para que sea correcta) y después conviértela.

### Tres formas de pensar un problema recursivo

Cuando un problema "huele" a recursión (por ejemplo, "calcula todas las…", "lista las primeras n…", "de cuántas formas…"), hay tres enfoques para encontrar la división:

**1. De abajo hacia arriba (bottom-up).** Resuelve el caso más simple (un elemento), luego el de dos elementos usando el de uno, luego el de tres usando el de dos. Te preguntas: "¿cómo paso de la solución para `n − 1` a la solución para `n`?".

**2. De arriba hacia abajo (top-down).** Piensa cómo partir el problema de tamaño `n` en subproblemas. Te preguntas: "¿en qué casos se divide este problema?". Es el enfoque típico para "de cuántas formas".

**3. Mitad y mitad.** Partir los datos a la mitad, como en búsqueda binaria o merge sort.

Ejemplo de top-down: **¿de cuántas formas puedes subir una escalera de `n` escalones si en cada paso subes 1 o 2?** El último paso fue de 1 escalón (vienes de `n − 1`) o de 2 (vienes de `n − 2`). Por lo tanto, `formas(n) = formas(n − 1) + formas(n − 2)`, con `formas(0) = 1` y `formas(1) = 1`. Es la estructura de Fibonacci; y como el ingenuo repite trabajo, lo optimizarás en la sesión de programación dinámica.

### Backtracking: explorar y deshacer

El **backtracking** es una forma de recursión para generar o buscar entre **todas las combinaciones posibles**, construyendo la solución paso a paso y **deshaciendo** la última elección para probar otra. Es como recorrer un laberinto: avanzas, si llegas a un callejón sin salida vuelves al último cruce y pruebas otro camino.

El esqueleto general:

```
explorar(estado parcial):
  si el estado es una solución completa: registrarla y volver
  para cada opción disponible:
    elegir la opción (modificar el estado)
    explorar(estado nuevo)
    deshacer la opción (restaurar el estado)
```

**Ejemplo 1: todos los subconjuntos** de `[1, 2, 3]`. Para cada elemento hay dos opciones: incluirlo o no. Eso genera un árbol de decisiones:

```
                         []
               incluir 1?   \ no
               [1]            []
             /     \        /    \
         [1,2]    [1]     [2]     []
         /  \     / \     / \     / \
   [1,2,3][1,2][1,3][1][2,3][2] [3] []
```

```ts
export function subsets<T>(items: T[]): T[][] {
  const result: T[][] = [];
  const current: T[] = [];
  explore(0);
  return result;

  function explore(i: number): void {
    if (i === items.length) { result.push([...current]); return; }
    current.push(items[i]);   // elegir: incluir items[i]
    explore(i + 1);
    current.pop();            // deshacer
    explore(i + 1);           // la otra opción: no incluirlo
  }
}
```

Hay `2ⁿ` subconjuntos y copiar cada uno cuesta O(n): O(n · 2ⁿ). No se puede hacer mejor, porque la salida misma tiene ese tamaño. Observa el `[...current]`: si guardaras `current` directamente, todos los resultados serían el mismo array (que al final queda vacío). Es el error más común en backtracking.

**Ejemplo 2: todas las permutaciones** de `"abc"`. En cada posición, eliges uno de los caracteres que todavía no usaste.

```ts
export function permutations(s: string): string[] {
  const result: string[] = [];
  const used = new Array<boolean>(s.length).fill(false);
  const current: string[] = [];
  explore();
  return result;

  function explore(): void {
    if (current.length === s.length) { result.push(current.join("")); return; }
    for (let i = 0; i < s.length; i++) {
      if (used[i]) continue;
      used[i] = true; current.push(s[i]);   // elegir
      explore();
      used[i] = false; current.pop();       // deshacer
    }
  }
}
```

`n!` permutaciones, cada una de longitud `n`: O(n · n!).

**Poda.** El backtracking se vuelve práctico cuando puedes **cortar ramas** que no pueden llevar a una solución. Por ejemplo, si buscas subconjuntos que sumen exactamente 10 y la suma parcial ya supera 10 (con números positivos), no tiene sentido seguir explorando esa rama. La poda no cambia el peor caso teórico, pero en la práctica puede reducir el trabajo de forma drástica. Así se resuelven Sudokus, el problema de las ocho reinas o la asignación de horarios.

### Errores comunes

- **Guardar la referencia del estado en lugar de una copia** en backtracking: todas las soluciones terminan iguales.
- **Olvidar deshacer** la elección: el estado queda contaminado para las ramas siguientes.
- **Casos base incompletos en árboles**: no manejar `null` en ambos hijos produce errores de acceso.
- **Exponer parámetros internos** (índices, acumuladores) en la API pública: usa un envoltorio.
- **Usar recursión lineal sobre listas enormes** en JavaScript: riesgo de desbordamiento de pila.
- **Pensar en la ejecución completa** en lugar de un nivel: confía en la llamada recursiva.

### Para llevarte

La recursión deja de ser un truco cuando los datos tienen forma recursiva: listas, árboles, carpetas, JSON. En todos esos casos la pregunta es la misma: ¿qué hago en el caso más pequeño y cómo combino las respuestas de las partes? Las funciones envoltorio mantienen limpia la interfaz, y el backtracking extiende la idea a explorar decisiones: elegir, explorar, deshacer. Cuando la exploración repita subproblemas, la próxima herramienta será la programación dinámica; cuando la profundidad sea enorme, la pila explícita. Practica dibujando: un árbol pequeño en papel y la respuesta de cada subárbol anotada junto a su raíz te muestran el flujo completo sin seguir la pila mentalmente.

## Conceptos clave

- **Estructura recursiva**: estructura definida en términos de sí misma (lista = nodo + lista; árbol = nodo + dos árboles).
- **Hoja**: nodo de un árbol sin hijos.
- **Altura de un árbol**: número de niveles desde la raíz hasta la hoja más profunda.
- **Función envoltorio**: función pública con interfaz limpia que inicia una recursión interna con parámetros adicionales.
- **Bottom-up / top-down**: construir la solución desde el caso más pequeño hacia arriba, o partir el problema grande en casos.
- **Backtracking**: exploración recursiva de combinaciones que elige, explora y deshace cada opción.
- **Poda**: descartar ramas del backtracking que no pueden llevar a una solución válida.

## Preguntas de repaso

1. ¿Por qué la recursión es especialmente adecuada para árboles binarios?
   R: Porque un árbol binario es una estructura recursiva: cada nodo tiene dos subárboles que también son árboles. La solución recursiva refleja esa forma (resolver para cada subárbol y combinar), mientras que una versión iterativa necesita gestionar una pila explícita.
2. ¿Qué es una función envoltorio y qué problemas resuelve?
   R: Es una función pública con una interfaz limpia que llama a una función recursiva interna con parámetros adicionales (índices, acumuladores, nodo raíz). Evita que el usuario tenga que pasar esos parámetros, impide valores incorrectos, permite manejar casos especiales una sola vez y oculta la estructura interna.
3. Da dos argumentos a favor y dos en contra de usar recursión.
   R: A favor: refleja naturalmente estructuras recursivas como árboles y simplifica problemas con varias ramas por paso, como divide y vencerás o backtracking. En contra: cada llamada consume pila, lo que puede desbordar con profundidades grandes, y la recursión ingenua puede repetir trabajo (como Fibonacci), además de tener un costo de llamada mayor que un bucle.
4. En el backtracking de subconjuntos, ¿por qué se guarda `[...current]` y no `current`?
   R: Porque `current` es un único array que se modifica durante toda la exploración. Si se guarda la referencia, todas las entradas del resultado apuntan al mismo array y al final todas muestran su contenido final (vacío). La copia captura el estado en ese momento.
5. ¿Cuál es la complejidad de generar todas las permutaciones de un string de longitud n y por qué no se puede mejorar?
   R: O(n · n!), porque hay n! permutaciones y construir cada una cuesta O(n). No se puede mejorar porque el tamaño de la salida ya es de ese orden: cualquier algoritmo tiene que producir cada permutación.
6. ¿Cuánto espacio de pila usa una función recursiva que recorre un árbol binario, y de qué depende?
   R: O(h), donde h es la altura del árbol, porque en cada momento solo hay apilados los marcos del camino desde la raíz hasta el nodo actual. En un árbol balanceado es O(log n); en uno degenerado (como una lista) es O(n).

## Ejercicio

Implementa en TypeScript, para el tipo `TreeNode` de esta sesión: `sumOfLeaves(root)`, `isMirror(root)` (¿el árbol es simétrico respecto a su eje vertical?) y `paths(root)` que devuelva todos los caminos de la raíz a cada hoja como arrays (backtracking). Luego escribe `combinationsSum(nums, target)` que devuelva todos los subconjuntos de números positivos que suman `target`, con poda cuando la suma parcial lo supera.

Criterio de terminado: tests con árbol vacío, un nodo, el árbol de ejemplo de esta sesión y un árbol degenerado; `combinationsSum([2, 3, 5, 7], 10)` devuelve exactamente `[2,3,5]`, `[3,7]` (en cualquier orden); un contador demuestra que la poda reduce las llamadas respecto a la versión sin poda.

## Explícalo con tus palabras

Explica el backtracking usando la imagen de un laberinto, y por qué el paso de "deshacer" es tan importante como el de "elegir".
