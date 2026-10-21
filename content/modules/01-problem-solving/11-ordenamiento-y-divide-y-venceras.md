---
title: Ordenamiento y divide y vencerás
kind: lesson
hours: 2
sources: Grokking Algorithms, cap. 2 "Selection sort" (pp. 51–55) y cap. 4 "Quicksort" (pp. 69–91) | Think Like a Programmer, cap. 3 "Insertion Sort" (pp. 83–84) | Cracking the Coding Interview, cap. 10 "Sorting and Searching" (pp. 158–163)
links: VisuAlgo, ordenamientos animados | https://visualgo.net/en/sorting
---

## Objetivo

Comprender cómo funcionan y cuánto cuestan los algoritmos de ordenamiento principales (selección, inserción, merge sort, quicksort y counting sort), dominar la estrategia divide y vencerás y saber elegir y usar el ordenamiento adecuado en TypeScript.

## Estudio

### Por qué estudiar ordenamiento si existe `sort()`

En el trabajo casi siempre vas a usar `arr.sort(...)`. Entonces, ¿por qué estudiar cómo se ordena? Por tres razones:

1. **Los algoritmos de ordenamiento son la mejor escuela de técnicas algorítmicas.** Selección e inserción enseñan invariantes; merge sort y quicksort enseñan divide y vencerás y recursión; counting sort enseña a aprovechar propiedades de los datos.
2. **Muchos problemas se vuelven fáciles después de ordenar.** Buscar duplicados, agrupar, encontrar la mediana, el par más cercano o intervalos que se solapan.
3. **Necesitas saber cuánto cuesta `sort()`** para analizar tus propias soluciones: O(n log n).

### Ordenamiento por selección: el más intuitivo

Tienes una lista de canciones con su número de reproducciones y quieres ordenarlas de más a menos escuchada. La forma más intuitiva: busca la más escuchada, ponla primera; de las que quedan, busca la más escuchada, ponla segunda; y así.

```ts
function selectionSort(arr: number[]): void {
  for (let i = 0; i < arr.length - 1; i++) {
    let minIndex = i;
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[j] < arr[minIndex]) minIndex = j;
    }
    [arr[i], arr[minIndex]] = [arr[minIndex], arr[i]];
  }
}
```

```
[29, 10, 14, 37, 13]
 i=0: mínimo 10 → [10 | 29, 14, 37, 13]
 i=1: mínimo 13 → [10, 13 | 14, 37, 29]
 i=2: mínimo 14 → [10, 13, 14 | 37, 29]
 i=3: mínimo 29 → [10, 13, 14, 29 | 37]
```

**Invariante:** antes de cada iteración `i`, las posiciones `0..i-1` contienen los `i` elementos más pequeños, ya ordenados. La barra `|` en el diagrama marca ese límite.

**Costo:** la primera pasada revisa `n` elementos, la segunda `n−1`, etc. La suma es ~n²/2: **O(n²)**, siempre, aunque el array ya esté ordenado (no tiene forma de enterarse). Espacio O(1).

### Ordenamiento por inserción: el de las cartas

Lo viste en la sesión de arrays: recorres el array y vas **insertando** cada elemento en su lugar dentro de la parte ya ordenada, corriendo a la derecha los mayores. Como ordenar las cartas en la mano.

Comparación con selección:

| | Selección | Inserción |
| --- | --- | --- |
| Peor caso | O(n²) | O(n²) |
| Array ya ordenado | O(n²) | **O(n)** |
| Casi ordenado | O(n²) | casi O(n) |
| Estable | no | sí |
| Intercambios | pocos (n) | muchos |

**Estable** significa que elementos iguales conservan su orden original. Importa cuando ordenas por un campo y quieres preservar un orden previo por otro (por ejemplo, ordenar por ciudad manteniendo dentro de cada ciudad el orden por apellido que ya tenías).

El buen comportamiento de inserción con datos casi ordenados hace que los ordenamientos reales (como Timsort, el que usa V8 para `Array.prototype.sort`) lo usen para tramos pequeños.

### Divide y vencerás

Antes de los algoritmos rápidos, la estrategia que los sustenta. **Divide y vencerás** (D&C) resuelve un problema así:

1. **Caso base:** encuentra el caso más simple posible.
2. **Dividir:** reduce el problema hasta llegar al caso base.
3. **Combinar:** junta las soluciones de las partes.

Un ejemplo sin código: tienes un terreno rectangular de 1680 × 640 metros y quieres dividirlo en **parcelas cuadradas iguales, lo más grandes posible**. La observación clave es: si encuentras el cuadrado más grande que sirve para el **sobrante** después de cortar los cuadrados grandes que caben, ese mismo cuadrado sirve para todo el terreno.

```
1680 × 640: caben dos cuadrados de 640 → sobra 400 × 640
 640 × 400: cabe uno de 400            → sobra 400 × 240
 400 × 240: cabe uno de 240            → sobra 240 × 160
 240 × 160: cabe uno de 160            → sobra 160 × 80
 160 × 80 : caben exactamente dos de 80 → caso base
Respuesta: parcelas de 80 × 80
```

Esto es el **algoritmo de Euclides** para el máximo común divisor, `mcd(a, b) = mcd(b, a % b)`, visto como divide y vencerás: cada paso reduce el problema a uno más pequeño del mismo tipo.

```ts
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
```

Otro ejemplo: sumar un array recursivamente. Caso base: array vacío → 0. Reducir: `sum([2, 4, 6]) = 2 + sum([4, 6])`. Es un D&C trivial, pero entrena el reflejo: **cuando escribas una función recursiva sobre un array, el caso base suele ser un array vacío o de un elemento**.

### Merge sort: dividir a la mitad y mezclar

Idea:

1. Si el array tiene 0 o 1 elementos, ya está ordenado (caso base).
2. Divídelo en dos mitades.
3. Ordena cada mitad recursivamente (confía en la llamada recursiva).
4. **Mezcla** las dos mitades ordenadas en una sola.

La mezcla es la parte interesante: si tienes dos pilas de cartas ordenadas boca arriba, para combinarlas miras las dos de arriba, tomas la menor, y repites. Cada paso es O(1), así que mezclar `n` elementos es O(n).

```ts
export function mergeSort(arr: number[]): number[] {
  if (arr.length <= 1) return arr;
  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));
  return merge(left, right);
}

function merge(a: number[], b: number[]): number[] {
  const out: number[] = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    out.push(a[i] <= b[j] ? a[i++] : b[j++]); // <= mantiene la estabilidad
  }
  while (i < a.length) out.push(a[i++]);
  while (j < b.length) out.push(b[j++]);
  return out;
}
```

```
[38, 27, 43, 3, 9, 82, 10]
dividir:   [38, 27, 43]          [3, 9, 82, 10]
           [38] [27, 43]         [3, 9]   [82, 10]
                [27] [43]        [3] [9]  [82] [10]
mezclar:        [27, 43]         [3, 9]   [10, 82]
           [27, 38, 43]          [3, 9, 10, 82]
           [3, 9, 10, 27, 38, 43, 82]
```

**Costo:** el árbol de divisiones tiene `log n` niveles (partes a la mitad cada vez), y en cada nivel la mezcla total procesa `n` elementos. Total: **O(n log n)** en todos los casos: mejor, peor y promedio. Espacio: O(n) por los arrays auxiliares. Es estable.

```
nivel 0:  n                      → n de trabajo de mezcla
nivel 1:  n/2 + n/2              → n
nivel 2:  n/4 ×4                 → n
...       log n niveles          → n · log n total
```

### Quicksort: partir alrededor de un pivote

Idea:

1. Si el array tiene 0 o 1 elementos, ya está ordenado.
2. Elige un elemento como **pivote**.
3. **Particiona**: los menores que el pivote a un lado, los mayores al otro.
4. Ordena recursivamente ambos lados. El resultado es `menores ordenados + pivote + mayores ordenados`.

Versión clara (no en el lugar), ideal para entender:

```ts
export function quickSort(arr: number[]): number[] {
  if (arr.length < 2) return arr;
  const pivot = arr[Math.floor(Math.random() * arr.length)];
  const less = arr.filter((x) => x < pivot);
  const equal = arr.filter((x) => x === pivot);
  const greater = arr.filter((x) => x > pivot);
  return [...quickSort(less), ...equal, ...quickSort(greater)];
}
```

La diferencia filosófica con merge sort: merge sort divide **sin pensar** (a la mitad) y hace el trabajo al **combinar**; quicksort hace el trabajo al **dividir** (particionar) y combinar es trivial (concatenar).

**Costo y el papel del pivote.**

- **Mejor caso / promedio:** si el pivote parte el array en dos mitades razonables, hay ~log n niveles con O(n) de trabajo cada uno: **O(n log n)**.
- **Peor caso:** si el pivote es siempre el menor o el mayor (por ejemplo, eliges siempre el primero y el array ya está ordenado), cada partición deja un lado vacío y el otro con `n−1` elementos. Hay `n` niveles: **O(n²)**.

```
pivote = primero, array ordenado      pivote = medio
[1,2,3,4,5,6,7,8]                     [1,2,3,4,5,6,7,8]
  [2,3,4,5,6,7,8]                       [1,2,3]  [5,6,7,8]
    [3,4,5,6,7,8]                       [1] [3]  [5] [7,8]
      ...  (n niveles)                  ... (log n niveles)
```

**Solución:** elegir el pivote **al azar** (o la mediana de tres). Con pivote aleatorio, el caso esperado es O(n log n) para cualquier entrada, porque ninguna entrada específica puede forzar sistemáticamente malos pivotes.

### Quicksort en el lugar: la partición de Lomuto

La versión con `filter` es clara pero crea arrays nuevos en cada nivel. La versión real trabaja **en el mismo array**: reordena los elementos de un tramo `[lo, hi]` para que queden los menores que el pivote a la izquierda, luego el pivote, luego los mayores, y devuelve la posición final del pivote. La forma más fácil de razonar es el esquema de **Lomuto**:

1. Mueve el pivote elegido al final del tramo (`arr[hi]`).
2. Mantén un índice `boundary`: todo lo que está a la izquierda de `boundary` es menor que el pivote.
3. Recorre con `j` de `lo` a `hi − 1`. Si `arr[j] < pivot`, intercámbialo con `arr[boundary]` y avanza `boundary`.
4. Al terminar, intercambia el pivote (en `hi`) con `arr[boundary]`. Ahora el pivote está en su posición definitiva.

```ts
function partition(arr: number[], lo: number, hi: number): number {
  const p = lo + Math.floor(Math.random() * (hi - lo + 1));
  [arr[p], arr[hi]] = [arr[hi], arr[p]];   // pivote al final
  const pivot = arr[hi];
  let boundary = lo;
  for (let j = lo; j < hi; j++) {
    if (arr[j] < pivot) {
      [arr[boundary], arr[j]] = [arr[j], arr[boundary]];
      boundary++;
    }
  }
  [arr[boundary], arr[hi]] = [arr[hi], arr[boundary]]; // pivote a su lugar
  return boundary;
}

export function quickSortInPlace(arr: number[], lo = 0, hi = arr.length - 1): void {
  if (lo >= hi) return;
  const p = partition(arr, lo, hi);
  quickSortInPlace(arr, lo, p - 1);
  quickSortInPlace(arr, p + 1, hi);
}
```

Recorrido de una partición con pivote 5 ya colocado al final:

```
[7, 2, 9, 1, 5]   boundary=0
 j=0: 7 < 5? no
 j=1: 2 < 5? sí → swap(arr[0], arr[1]) → [2, 7, 9, 1, 5]  boundary=1
 j=2: 9 < 5? no
 j=3: 1 < 5? sí → swap(arr[1], arr[3]) → [2, 1, 9, 7, 5]  boundary=2
 fin: swap(arr[2], arr[4])             → [2, 1, 5, 7, 9]  pivote en índice 2
```

El **invariante** que hace correcto el algoritmo: en todo momento, `arr[lo..boundary−1]` son menores que el pivote y `arr[boundary..j−1]` son mayores o iguales. Cada iteración lo mantiene, y al final basta colocar el pivote en el borde. Fíjate en que la recursión es sobre tramos (`lo`, `hi`), con una función envoltorio implícita en los valores por defecto: no se copia ningún array.

Una debilidad de Lomuto: con muchos elementos **iguales**, todas las comparaciones `arr[j] < pivot` fallan y las particiones quedan desbalanceadas, volviendo a O(n²). Las implementaciones serias usan partición en tres vías (menores, iguales, mayores), que es lo que hacía nuestra versión con `filter` y su array `equal`.

### ¿Por qué quicksort si merge sort siempre es O(n log n)?

Porque Big O oculta las **constantes**. Si un algoritmo hace `c₁ · n log n` operaciones y otro `c₂ · n log n`, ambos son O(n log n), pero el de constante menor es más rápido en la práctica. Quicksort en su versión en el lugar:

- No necesita arrays auxiliares (espacio O(log n) para la recursión, frente a O(n) de merge sort).
- Tiene muy buena localidad de memoria.
- El caso promedio ocurre con altísima probabilidad si el pivote es aleatorio.

Por eso quicksort (y variantes) es tan usado. Merge sort, en cambio, se prefiere cuando necesitas **estabilidad**, garantía de peor caso, o cuando los datos no caben en memoria (ordenamiento externo: ordenas trozos en disco y los mezclas) o están en listas enlazadas (mezclar listas no requiere memoria extra).

Las constantes importan cuando los órdenes son iguales. Cuando los órdenes son distintos (O(n log n) frente a O(n²)), las constantes casi nunca salvan al más lento para entradas grandes.

### Counting sort: romper la barrera de n log n

Se puede demostrar que cualquier ordenamiento basado en **comparar** pares de elementos necesita, en el peor caso, del orden de `n log n` comparaciones. Pero si los datos tienen una propiedad especial, se puede ir más rápido sin comparar.

Si los valores son enteros en un rango pequeño `0..k` (edades, notas de 0 a 100, puntuaciones del 1 al 10), puedes usar el **histograma** de la sesión de arrays: cuentas cuántas veces aparece cada valor y luego reescribes el array en orden.

```ts
function countingSort(arr: number[], maxValue: number): number[] {
  const counts = new Array<number>(maxValue + 1).fill(0);
  for (const v of arr) counts[v]++;
  const out: number[] = [];
  for (let v = 0; v <= maxValue; v++) for (let c = 0; c < counts[v]; c++) out.push(v);
  return out;
}
```

**O(n + k)**. Si `k` es pequeño comparado con `n`, es lineal. Radix sort extiende la idea ordenando dígito a dígito. La lección: **las cotas teóricas valen bajo ciertos supuestos; si tus datos tienen estructura, aprovéchala**.

### Ordenar en TypeScript sin sorpresas

```ts
[10, 9, 1].sort();                       // [1, 10, 9] → compara como strings
[10, 9, 1].sort((a, b) => a - b);        // [1, 9, 10]
users.sort((a, b) => a.name.localeCompare(b.name)); // strings con reglas del idioma
users.sort((a, b) => a.age - b.age || a.name.localeCompare(b.name)); // por edad, luego nombre
const sorted = arr.toSorted((a, b) => a - b); // copia ordenada sin mutar (ES2023)
```

Desde ES2019, `Array.prototype.sort` es **estable** por especificación. El comparador debe devolver un número negativo, cero o positivo, y ser **consistente** (si `a < b` y `b < c`, entonces `a < c`); un comparador incoherente produce resultados impredecibles.

### Resumen de algoritmos

| Algoritmo | Mejor | Promedio | Peor | Espacio | Estable |
| --- | --- | --- | --- | --- | --- |
| Selección | n² | n² | n² | 1 | no |
| Inserción | n | n² | n² | 1 | sí |
| Merge sort | n log n | n log n | n log n | n | sí |
| Quicksort | n log n | n log n | n² | log n | no |
| Counting sort | n + k | n + k | n + k | n + k | sí |

### Problemas que se vuelven fáciles al ordenar

- **¿Hay duplicados?** Ordena y compara vecinos: O(n log n), sin memoria extra.
- **Intervalos solapados:** ordena por inicio; dos intervalos se solapan solo si son vecinos en ese orden y el inicio del segundo es menor que el fin del primero.
- **Agrupar anagramas:** la "firma" de una palabra es la palabra con sus letras ordenadas (`"amor"` y `"roma"` → `"amor"`). Agrupas por firma en un `Map`.
- **Mediana:** ordena y toma el del medio (hay algoritmos O(n) promedio como quickselect, una variante de quicksort que solo recurre hacia un lado).

### Errores comunes

- **`sort()` sin comparador** en números.
- **Quicksort con pivote fijo** sobre datos ordenados: O(n²).
- **Olvidar que `sort` muta el array**: usa `toSorted` o copia antes si necesitas el original.
- **Comparadores que devuelven booleanos** (`(a, b) => a > b`): no cumplen el contrato y dan resultados erráticos.
- **Ordenar dentro de un bucle** sin darte cuenta: O(n² log n).
- **Creer que O(n log n) siempre gana**: para arrays de 10 elementos, inserción puede ser más rápido.

## Conceptos clave

- **Divide y vencerás**: estrategia que reduce un problema a subproblemas del mismo tipo hasta un caso base y combina sus soluciones.
- **Ordenamiento por selección**: elige repetidamente el mínimo de lo que queda; O(n²) siempre.
- **Ordenamiento por inserción**: inserta cada elemento en la parte ya ordenada; O(n) si ya está ordenado.
- **Merge sort**: divide a la mitad, ordena recursivamente y mezcla; O(n log n) garantizado, estable, O(n) de espacio.
- **Quicksort**: particiona alrededor de un pivote y ordena cada lado; O(n log n) esperado, O(n²) peor caso.
- **Pivote aleatorio**: elección que hace improbable el peor caso de quicksort para cualquier entrada.
- **Estabilidad**: propiedad de conservar el orden relativo de elementos iguales.
- **Counting sort**: ordena enteros de rango pequeño contando apariciones; O(n + k).

## Preguntas de repaso

1. ¿Qué tienen en común y en qué se diferencian merge sort y quicksort?
   R: Ambos son divide y vencerás y cuestan O(n log n) en el caso típico. Merge sort divide a la mitad sin mirar los datos y hace el trabajo al mezclar; quicksort hace el trabajo al particionar alrededor del pivote y combinar es solo concatenar. Merge sort garantiza O(n log n) y es estable pero usa O(n) de memoria; quicksort puede degradarse a O(n²) y no es estable, pero en su versión en el lugar usa poca memoria y suele ser más rápido en la práctica.
2. ¿Por qué quicksort con el primer elemento como pivote es O(n²) sobre un array ya ordenado y cómo se evita?
   R: Porque el pivote es siempre el menor, así que cada partición deja un lado vacío y el otro con n−1 elementos; hay n niveles de recursión con trabajo lineal cada uno. Se evita eligiendo el pivote al azar o con la mediana de tres, de modo que ninguna entrada fuerce sistemáticamente malos pivotes.
3. ¿Por qué merge sort es O(n log n) en todos los casos?
   R: Porque siempre divide a la mitad, lo que produce log n niveles, y en cada nivel la mezcla procesa en total n elementos. El trabajo no depende del orden de los datos.
4. ¿Qué significa que un ordenamiento sea estable y cuándo importa?
   R: Que los elementos con la misma clave conservan su orden relativo original. Importa cuando ordenas por un criterio y quieres preservar un orden previo por otro, por ejemplo ordenar por ciudad manteniendo el orden por apellido dentro de cada ciudad.
5. ¿Cómo puede counting sort ser O(n + k) si los ordenamientos por comparación necesitan del orden de n log n?
   R: Porque no compara elementos: usa los valores como índices de un array de contadores. La cota n log n solo aplica a algoritmos basados en comparaciones; counting sort aprovecha que los datos son enteros en un rango pequeño.
6. ¿Por qué el ordenamiento por inserción sigue siendo útil si es O(n²)?
   R: Porque es O(n) con datos ya ordenados o casi ordenados, es estable, usa O(1) de memoria y tiene constantes muy pequeñas. Por eso los ordenamientos híbridos reales, como Timsort, lo usan para tramos pequeños.

## Ejercicio

Implementa en TypeScript `quickSortInPlace(arr)` con partición en el lugar (esquema de Lomuto o Hoare) y pivote aleatorio, y `mergeSort(arr)`. Escribe un test de propiedades simple: para 200 arrays aleatorios de tamaño 0 a 1.000 (incluyendo duplicados y negativos), el resultado debe ser igual a `toSorted((a, b) => a - b)`. Luego cuenta las comparaciones de quicksort con pivote fijo (primer elemento) frente a pivote aleatorio sobre un array ya ordenado de 2.000 elementos.

Criterio de terminado: el test de propiedades pasa para ambos algoritmos; la tabla impresa muestra que con pivote fijo las comparaciones crecen como ~n²/2 y con pivote aleatorio quedan cerca de n log n.

## Explícalo con tus palabras

Explica a alguien sin formación técnica cómo ordenarías un mazo de 1.000 fichas con merge sort usando la ayuda de amigos, y por qué es mucho más rápido que buscar repetidamente la menor.
