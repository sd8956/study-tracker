---
title: Arrays y strings como herramientas para resolver problemas
kind: lesson
hours: 2
sources: Grokking Algorithms, cap. 2 "How memory works" y "Arrays" (pp. 41–47) | Think Like a Programmer, cap. 3 "Solving Problems with Arrays" (pp. 77–105) | Cracking the Coding Interview, cap. 1 "Arrays and Strings" (pp. 100–103)
---

## Objetivo

Entender cómo vive un array en memoria y por qué eso define sus costos, dominar las operaciones básicas (guardar, copiar, buscar, ordenar, calcular estadísticas) y aplicar técnicas como el histograma, las tablas de búsqueda y las matrices a problemas concretos de arrays y strings.

## Estudio

### Cómo funciona la memoria

Imagina la memoria de la computadora como una pared enorme de cajones numerados. Cada cajón guarda un dato pequeño y tiene una **dirección** (su número). Cuando pides guardar algo, el sistema te asigna un cajón y te da su dirección. Para guardar **varios** elementos tienes dos opciones básicas: ponerlos en cajones contiguos (un **array**) o dispersarlos y hacer que cada uno sepa dónde está el siguiente (una **lista enlazada**, próxima sesión).

Un array ocupa cajones **seguidos**. Si el primer elemento está en la dirección 1000 y cada elemento ocupa 8 bytes, el elemento `i` está en `1000 + 8 × i`. Esa simple multiplicación es la razón de la propiedad más importante del array:

> **Acceso aleatorio en O(1):** puedes ir directo a cualquier posición sin recorrer las anteriores.

```
dirección:  1000   1008   1016   1024   1032
índice:      [0]    [1]    [2]    [3]    [4]
valor:       12     7      33     5      19
             ▲
         base + 8 × i
```

El costo de esa contigüidad aparece al **insertar o borrar en el medio**: para insertar en la posición 1 tienes que correr una posición hacia la derecha todo lo que viene después. Eso es O(n). Y si el bloque reservado se llena, hay que buscar un bloque más grande y copiar todo (lo viste como tiempo amortizado en la sesión anterior).

Analogía: un array es como una fila de butacas numeradas en el cine. Si sabes tu número, vas directo. Pero si llega un amigo y quiere sentarse en medio del grupo, todos los de la derecha tienen que correrse una butaca.

En JavaScript, los arrays son dinámicos y pueden mezclar tipos, pero los motores los optimizan como arrays contiguos cuando los usas de forma homogénea. Los **typed arrays** (`Int32Array`, `Float64Array`) son arrays contiguos de verdad y de tamaño fijo, útiles cuando el rendimiento importa.

### Las operaciones fundamentales

Antes de resolver problemas con arrays, conviene tener a mano el repertorio de operaciones básicas. Casi todo problema de arrays es una combinación de estas.

**1. Guardar.** Asignar `arr[i] = valor`. O(1).

**2. Copiar.** Crear un array nuevo con los mismos valores. En JavaScript, `[...arr]` o `arr.slice()` hacen una **copia superficial**: si los elementos son objetos, ambos arrays apuntan a los mismos objetos. Confundir copia superficial y profunda es fuente de errores sutiles:

```ts
const a = [{ score: 1 }];
const b = [...a];
b[0].score = 99;
console.log(a[0].score); // 99: el objeto es compartido
const c = structuredClone(a); // copia profunda
```

**3. Buscar un valor concreto.** Recorrer hasta encontrarlo: O(n). Si está ordenado, búsqueda binaria: O(log n).

**4. Buscar por criterio.** "El elemento con mayor puntaje", "el primer usuario mayor de edad". Patrón: mantener el **mejor candidato hasta ahora** y actualizarlo.

```ts
function bestIndex<T>(items: T[], better: (a: T, b: T) => boolean): number {
  if (items.length === 0) return -1;
  let best = 0;
  for (let i = 1; i < items.length; i++) {
    if (better(items[i], items[best])) best = i;
  }
  return best;
}
```

Observa que guardamos el **índice** del mejor, no el valor. Así tenemos ambas cosas: el valor (`items[best]`) y su posición. Inicializar con el primer elemento (y no con un "valor imposible" como `-1`) evita errores cuando todos los valores son negativos.

**5. Ordenar.** En la práctica usas `arr.sort((a, b) => a - b)`. Pero conviene conocer el **ordenamiento por inserción**, porque es fácil de adaptar: recorres el array y vas insertando cada elemento en su lugar dentro de la parte ya ordenada, igual que ordenas cartas en la mano.

```ts
function insertionSort(arr: number[]): void {
  for (let i = 1; i < arr.length; i++) {
    const current = arr[i];
    let j = i - 1;
    while (j >= 0 && arr[j] > current) {
      arr[j + 1] = arr[j]; // correr a la derecha
      j--;
    }
    arr[j + 1] = current;
  }
}
```

Es O(n²) en el peor caso, pero O(n) si el array ya está casi ordenado, y es estable (no cambia el orden relativo de elementos iguales).

**6. Calcular estadísticas.** Suma, promedio, mínimo, máximo. Un solo recorrido acumulando.

### Un problema completo: la moda

**Problema:** tienes las respuestas de una encuesta, números del 1 al 10. Encuentra la **moda** (el valor que más se repite). Si hay empate, cualquiera vale.

**Primer enfoque, ordenar y contar rachas.** Si ordenas, los valores iguales quedan juntos, y la moda es la racha más larga. Lo resuelves con lo que ya sabes: ordenar + buscar por criterio (la racha más larga). Costo: O(n log n) por el ordenamiento.

```ts
function modeBySorting(data: number[]): number {
  const sorted = [...data].sort((a, b) => a - b);
  let best = sorted[0], bestRun = 0, run = 0;
  for (let i = 0; i < sorted.length; i++) {
    run = i > 0 && sorted[i] === sorted[i - 1] ? run + 1 : 1;
    if (run > bestRun) { bestRun = run; best = sorted[i]; }
  }
  return best;
}
```

Este enfoque es correcto y nace de **empezar por lo que sabes**. Pero no aprovecha un dato del enunciado: los valores están entre 1 y 10.

**Segundo enfoque, el histograma.** Si el rango de valores es pequeño y conocido, puedes crear un array de contadores: `counts[v]` cuenta cuántas veces apareció `v`. Recorres los datos una vez incrementando contadores, y luego buscas el contador mayor.

```ts
function modeByHistogram(data: number[], maxValue = 10): number {
  const counts = new Array<number>(maxValue + 1).fill(0); // índice 0 sin usar
  for (const v of data) counts[v]++;
  let best = 1;
  for (let v = 2; v <= maxValue; v++) if (counts[v] > counts[best]) best = v;
  return best;
}
```

Costo: O(n + k), donde `k` es el tamaño del rango (aquí 10). Como `k` es fijo, es O(n). Lo usamos así:

```
datos:   [4, 7, 3, 8, 9, 7, 3, 9, 9, 3, 3, 10]
counts:  idx 1 2 3 4 5 6 7 8 9 10
             0 0 4 1 0 0 2 1 3 1     → moda = 3
```

La lección importante: **el valor de un dato se usa como índice de otro array**. Esa idea (convertir datos en posiciones) es la semilla de las tablas hash, que generalizan el histograma a claves arbitrarias. En JavaScript, cuando el rango no es pequeño, usarías un `Map` en lugar del array de contadores.

Además, el primer enfoque no fue un desperdicio: te dio una solución correcta para comparar y te hizo pensar en "contar". Refactorizar de una solución correcta a una mejor es un camino normal.

### Arrays de datos fijos: tablas de búsqueda

Otra técnica poderosa: usar un array constante para **reemplazar lógica condicional**. Ejemplo: convertir un número de mes en su nombre.

```ts
// Con condicionales: largo y propenso a errores
function monthName(m: number): string {
  if (m === 1) return "enero";
  if (m === 2) return "febrero";
  // ... 10 más
  return "?";
}

// Con tabla de búsqueda
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"] as const;
const monthName2 = (m: number) => MONTHS[m - 1] ?? "?";
```

Otro ejemplo: calcular una tarifa según tramos. En lugar de una cadena de `if`, guarda los límites y tarifas en arrays paralelos (o un array de objetos) y recorre la tabla. Ventajas: los datos se pueden modificar sin tocar la lógica, el código es más corto y cada tramo se ve de un vistazo. Cuando ves muchos `if` que solo cambian datos, piensa en una tabla.

### Arrays de objetos (no escalares)

Rara vez trabajas con arrays de números sueltos. Lo normal es un array de registros:

```ts
interface Student { name: string; grade: number; id: number }
const students: Student[] = [
  { name: "Ana", grade: 87, id: 101 },
  { name: "Luis", grade: 92, id: 102 },
];
```

Todas las técnicas anteriores se aplican, pero eligiendo **un campo** como criterio: buscar el estudiante con mejor nota, ordenar por nombre, calcular el promedio de `grade`. La función `bestIndex` de arriba ya funciona con cualquier tipo gracias a los genéricos.

Una pregunta de diseño frecuente: ¿arrays paralelos (`names[]`, `grades[]`) o array de objetos? Casi siempre es mejor el array de objetos: mantiene juntos los datos que van juntos y al ordenar no puedes desincronizar los arrays.

### Arrays multidimensionales

Una matriz es un array de arrays. Sirve para tableros, imágenes, tablas de datos o grillas de programación dinámica.

```ts
const grid: number[][] = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
];
grid[1][2]; // fila 1, columna 2 → 6
```

**Problema clásico: rotar una matriz cuadrada 90° en sentido horario.** Observa a dónde va cada elemento:

```
1 2 3        7 4 1
4 5 6   →    8 5 2
7 8 9        9 6 3
```

El elemento en `(fila r, columna c)` termina en `(fila c, columna n−1−r)`. Con esa fórmula escribes la versión con matriz auxiliar en O(n²) tiempo y O(n²) espacio. Una solución elegante en el mismo lugar: **transponer** (intercambiar `[r][c]` con `[c][r]`) y luego **invertir cada fila**.

```ts
function rotateInPlace(m: number[][]): void {
  const n = m.length;
  for (let r = 0; r < n; r++)
    for (let c = r + 1; c < n; c++)
      [m[r][c], m[c][r]] = [m[c][r], m[r][c]];
  for (const row of m) row.reverse();
}
```

O(n²) tiempo (no puedes hacerlo mejor, hay que mover n² elementos) y O(1) espacio extra. El truco vino de **dividir** una transformación difícil en dos fáciles.

Trampa clásica al crear matrices en JavaScript: `new Array(3).fill([])` crea tres referencias al **mismo** array. Usa `Array.from({ length: 3 }, () => [])`.

### Strings: arrays de caracteres

Un string se comporta como un array de caracteres, con una diferencia importante: en JavaScript los strings son **inmutables**. `s[0] = "x"` no hace nada. Cada concatenación crea un string nuevo. Construir un string grande con `+=` en un bucle puede ser O(n²) en el peor caso; la alternativa es acumular partes en un array y unir al final con `join("")`. (Este es el papel que cumple `StringBuilder` en Java.)

Patrones de entrevista típicos con strings, todos variantes de lo visto:

**¿Todos los caracteres son únicos?** Fuerza bruta: comparar cada par, O(n²). Con un `Set`: O(n). Sin estructuras adicionales: ordenar y comparar vecinos, O(n log n). Detalle valioso: si el alfabeto es ASCII (128 caracteres), un string de más de 128 caracteres **no puede** tener todos únicos; puedes responder `false` de inmediato.

**¿Un string es permutación de otro?** Mismo histograma de caracteres. Si las longitudes difieren, `false` directo. Luego cuentas con un `Map` (o un array de 26 si solo hay minúsculas), sumando para uno y restando para el otro; todos los contadores deben quedar en cero.

```ts
function isPermutation(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const counts = new Map<string, number>();
  for (const ch of a) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  for (const ch of b) {
    const c = (counts.get(ch) ?? 0) - 1;
    if (c < 0) return false;
    counts.set(ch, c);
  }
  return true;
}
```

**¿Es un palíndromo?** Dos punteros: uno al inicio y otro al final, avanzando hacia el centro mientras coincidan. O(n) tiempo, O(1) espacio.

**¿Se puede reordenar en un palíndromo?** Un palíndromo tiene, como mucho, un carácter con cantidad impar. Histograma + contar impares.

Observa cuánto se repite el **histograma**. Es una de las herramientas más rentables que vas a aprender.

### Dos patrones de recorrido: dos punteros y ventana deslizante

Con arrays aparecen una y otra vez dos patrones que transforman soluciones O(n²) en O(n). Vale la pena conocerlos desde ya.

**Dos punteros desde los extremos.** Problema: en un array **ordenado**, ¿hay dos números que sumen `target`? La fuerza bruta prueba todos los pares, O(n²). Observa en cambio esto: pon un puntero `i` al inicio y otro `j` al final. Si `arr[i] + arr[j]` es menor que el objetivo, la única forma de aumentar la suma es mover `i` a la derecha (porque `arr[j]` ya es el mayor disponible). Si es mayor, mueve `j` a la izquierda. Cada paso descarta un elemento para siempre.

```ts
function hasPairWithSum(sorted: number[], target: number): boolean {
  let i = 0, j = sorted.length - 1;
  while (i < j) {
    const sum = sorted[i] + sorted[j];
    if (sum === target) return true;
    if (sum < target) i++;
    else j--;
  }
  return false;
}
```

```
target = 13     [1, 3, 4, 6, 9, 11]
                 i              j   1+11=12 < 13 → i++
                    i           j   3+11=14 > 13 → j--
                    i        j      3+9 =12 < 13 → i++
                       i     j      4+9 =13 ✓
```

O(n) tiempo, O(1) espacio. La clave fue usar el dato "ordenado" del enunciado. Si el array no estuviera ordenado, la alternativa O(n) sería un `Set` de complementos (como en la sesión 01), a cambio de O(n) de memoria.

**Dos punteros lector-escritor.** Problema: eliminar duplicados de un array ordenado **en el mismo array** y devolver la nueva longitud. Un puntero `read` recorre todo; un puntero `write` marca dónde va el siguiente valor distinto. Como `write` nunca supera a `read`, nunca pisas algo que todavía no leíste.

```ts
function dedupeSorted(arr: number[]): number {
  if (arr.length === 0) return 0;
  let write = 1;
  for (let read = 1; read < arr.length; read++) {
    if (arr[read] !== arr[write - 1]) arr[write++] = arr[read];
  }
  arr.length = write;
  return write;
}
```

**Ventana deslizante.** Problema: la suma máxima de `k` elementos consecutivos. Sumar cada ventana desde cero cuesta O(n·k). Pero dos ventanas vecinas comparten `k−1` elementos: al deslizar, sumas el que entra y restas el que sale. O(n) total.

```ts
function maxWindowSum(arr: number[], k: number): number {
  let sum = 0;
  for (let i = 0; i < k; i++) sum += arr[i];
  let best = sum;
  for (let i = k; i < arr.length; i++) {
    sum += arr[i] - arr[i - k]; // entra arr[i], sale arr[i-k]
    best = Math.max(best, sum);
  }
  return best;
}
```

La idea de fondo de los tres patrones es la misma: **no recalcular lo que ya sabes**. Reconocer trabajo repetido es el corazón de la optimización, y volverás a ella en programación dinámica.

### Cuándo usar un array (y cuándo no)

Usa un array cuando:

- Conoces aproximadamente la cantidad de elementos, o solo agregas al final.
- Necesitas acceso por posición rápido.
- Recorres los datos en orden muchas veces (la contigüidad hace que la caché del procesador trabaje a tu favor).
- Los valores caben en un rango pequeño que puedes usar como índice (histograma, tabla de búsqueda).

Considera otra estructura cuando:

- Insertas o borras mucho al principio o en el medio (lista enlazada, deque).
- Buscas por clave arbitraria (tabla hash).
- Necesitas siempre el mínimo o el máximo (heap).

Un consejo de diseño: a veces conviene usar un array **aunque no sea estrictamente necesario**, porque simplifica el código. Por ejemplo, para calcular la mediana necesitas los datos ordenados, así que guardarlos todos en un array es lo natural. Para calcular solo el promedio, no hace falta guardar nada: basta un acumulador.

### Errores comunes

- **Off-by-one** con rangos 1..n almacenados en índices 0..n−1. Decide una convención y documéntala.
- **Inicializar el máximo con 0** cuando los datos pueden ser negativos. Inicializa con el primer elemento.
- **`sort()` sin comparador** en números: ordena como texto.
- **Copias superficiales** que comparten objetos.
- **`fill` con objetos o arrays**: comparte la misma referencia.
- **Modificar un array mientras lo recorres** con `for…of` o `forEach` (por ejemplo, con `splice`): se saltan elementos.

## Conceptos clave

- **Array**: secuencia de elementos en memoria contigua; acceso por índice O(1), inserción en el medio O(n).
- **Acceso aleatorio**: capacidad de llegar a cualquier posición calculando su dirección, sin recorrer las anteriores.
- **Histograma**: array (o mapa) de contadores donde el valor de un dato se usa como índice.
- **Tabla de búsqueda**: array constante que reemplaza lógica condicional por un acceso por índice.
- **Copia superficial**: copia del array que comparte los objetos internos con el original.
- **Transponer**: intercambiar filas por columnas de una matriz (`[r][c]` ↔ `[c][r]`).
- **Inmutabilidad de strings**: en JavaScript cada modificación crea un string nuevo.

## Preguntas de repaso

1. ¿Por qué acceder a `arr[i]` es O(1) y por qué insertar en el medio de un array es O(n)?
   R: Porque los elementos están contiguos y la dirección de `arr[i]` se calcula con una multiplicación y una suma (base + tamaño × i), sin recorrer nada. Insertar en el medio obliga a correr una posición todos los elementos que vienen después, lo que en el peor caso son n movimientos.
2. ¿Por qué la solución de la moda con histograma es mejor que la de ordenar, y qué condición necesita?
   R: Porque cuenta en un solo recorrido, O(n + k) con k el tamaño del rango, frente a O(n log n) del ordenamiento. Necesita que los valores estén en un rango pequeño y conocido para poder usarlos como índices; si no, se usa un Map en lugar de un array.
3. ¿Qué ventaja tiene una tabla de búsqueda frente a una cadena de `if`?
   R: Separa los datos de la lógica: el código es más corto, cada caso se ve de un vistazo y se pueden cambiar o agregar datos sin tocar el algoritmo. También reduce errores al copiar y pegar condiciones.
4. Explica el truco para rotar una matriz cuadrada 90° en sentido horario sin matriz auxiliar.
   R: Primero se transpone la matriz (intercambiar m[r][c] con m[c][r] para c > r) y luego se invierte cada fila. La combinación lleva cada elemento de (r, c) a (c, n−1−r), que es la rotación horaria, con O(1) espacio extra.
5. ¿Cómo verificas que dos strings son permutación uno del otro en O(n)?
   R: Si las longitudes difieren, no lo son. Si no, cuentas las apariciones de cada carácter del primero en un Map y restas las del segundo; si algún contador queda negativo (o distinto de cero al final), no son permutaciones.
6. ¿Por qué conviene guardar el índice del mejor elemento y no su valor al buscar por criterio?
   R: Porque con el índice tienes las dos cosas: la posición y el valor (`arr[best]`). Además, inicializar con el índice 0 evita elegir un valor centinela arbitrario que podría ser incorrecto, por ejemplo con números negativos.

## Ejercicio

Implementa en TypeScript `zeroMatrix(m: number[][]): void`: si un elemento es 0, toda su fila y toda su columna deben quedar en 0. Cuidado: si pones ceros mientras recorres, contaminas el resto. Primero resuélvelo con dos arrays auxiliares de booleanos (filas y columnas a anular); después, como extra opcional, sin arrays auxiliares usando la primera fila y la primera columna como marcadores.

Criterio de terminado: tests con matriz sin ceros (no cambia), con un cero en el centro, con ceros en la primera fila y columna, y con una matriz no cuadrada de 3×5; comentario con el Big O de tiempo y espacio de tu solución.

## Explícalo con tus palabras

Explica a alguien que empieza qué significa "usar el valor de un dato como índice de otro array" y por qué esa idea resuelve tantos problemas de conteo.
