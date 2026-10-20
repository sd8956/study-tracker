---
title: Búsqueda binaria e introducción a Big O
kind: lesson
hours: 2
sources: Grokking Algorithms, cap. 1 "Introduction to Algorithms" (pp. 20–38) | Cracking the Coding Interview, cap. X "Sorting and Searching", Searching Algorithms (pp. 161–162)
links: Visualizador de búsqueda binaria (VisuAlgo) | https://visualgo.net/en/bst ; Big-O Cheat Sheet | https://www.bigocheatsheet.com
---

## Objetivo

Entender la búsqueda binaria, implementarla sin errores en TypeScript y usar la notación Big O para comparar cuánto crece el trabajo de un algoritmo cuando crece la entrada.

## Estudio

### ¿Qué es un algoritmo y por qué medirlo?

Un algoritmo es un conjunto de instrucciones precisas para resolver una tarea. "Recorre la lista y quédate con el mayor" es un algoritmo. Para cualquier tarea suele haber muchos algoritmos posibles, y la diferencia entre ellos puede ser enorme: no un 10 % más rápido, sino la diferencia entre milisegundos y años. Esta sesión te da la primera herramienta para medir esa diferencia sin necesidad de cronometrar nada.

### El juego de adivinar un número

Piensa un número entre 1 y 100. Yo intento adivinarlo y tú solo me respondes "más alto", "más bajo" o "correcto".

**Estrategia ingenua:** digo 1, luego 2, luego 3… Si pensaste 99, necesito 99 intentos. Cada intento descarta **un solo** número. Esto se llama **búsqueda lineal** (o simple).

**Estrategia inteligente:** digo 50. Si respondes "más bajo", acabo de descartar 51–100 de un golpe: la mitad. Digo 25, luego 37 o 12, y así. Cada intento descarta **la mitad** de lo que queda.

```
100 → 50 → 25 → 13 → 7 → 4 → 2 → 1
```

En el peor caso necesito 7 intentos para 100 números. Esto es la **búsqueda binaria**.

Ahora escala el problema. Un diccionario con 240.000 palabras:

| Método | Peor caso |
| --- | --- |
| Lineal | 240.000 pasos |
| Binaria | 18 pasos |

Y si el diccionario duplica su tamaño, la búsqueda lineal duplica su trabajo; la binaria agrega **un solo paso**. Esa asimetría es lo que hace a la búsqueda binaria tan valiosa.

### Logaritmos sin miedo

El número de veces que puedes partir `n` a la mitad hasta llegar a 1 es el **logaritmo en base 2** de `n`, escrito `log₂ n`. Es la operación inversa de la potencia:

```
2³ = 8      ⇔   log₂ 8 = 3
2¹⁰ = 1024  ⇔   log₂ 1024 = 10
2²⁰ ≈ 1 millón  ⇔   log₂ 1.000.000 ≈ 20
2³⁰ ≈ mil millones ⇔ log₂ ≈ 30
```

Pregunta guía para recordarlo: "¿cuántos 2 tengo que multiplicar para obtener `n`?". En algoritmos, cuando decimos "log" casi siempre es base 2, y la base da igual para Big O (cambia solo por una constante).

Regla práctica que vas a usar mucho: **si en cada paso el espacio del problema se reduce a la mitad, el algoritmo es logarítmico**.

### La condición indispensable: datos ordenados

La búsqueda binaria **solo funciona si la lista está ordenada**. En el juego del número funciona porque los números del 1 al 100 tienen un orden natural, y "más alto" o "más bajo" te dice en qué mitad está. Si la lista está desordenada, saber que el elemento del medio no es el buscado no te dice nada sobre las mitades.

Este es un patrón de entrevista importante: si un enunciado dice "dado un array **ordenado**…", deberías pensar inmediatamente en búsqueda binaria o en dos punteros.

### Implementación en TypeScript

La idea: mantener dos índices, `low` y `high`, que delimitan la zona donde el elemento todavía puede estar. En cada paso miras el del medio y descartas la mitad que no puede contenerlo.

```ts
export function binarySearch(sorted: number[], target: number): number {
  let low = 0;
  let high = sorted.length - 1;

  while (low <= high) {
    const mid = low + Math.floor((high - low) / 2);
    const guess = sorted[mid];
    if (guess === target) return mid;
    if (guess < target) low = mid + 1;   // el objetivo está a la derecha
    else high = mid - 1;                 // el objetivo está a la izquierda
  }
  return -1; // no está
}
```

Recorrido con `[1, 3, 5, 7, 9, 11, 13]` buscando `11`:

```
low=0 high=6 mid=3 → 7  < 11 → low=4
low=4 high=6 mid=5 → 11 = 11 → devuelve 5
```

Buscando `4` (no está):

```
low=0 high=6 mid=3 → 7 > 4 → high=2
low=0 high=2 mid=1 → 3 < 4 → low=2
low=2 high=2 mid=2 → 5 > 4 → high=1
low=2 high=1 → sale del bucle → -1
```

### Los errores clásicos de la búsqueda binaria

La búsqueda binaria es famosa por ser fácil de explicar y fácil de implementar mal. Los errores típicos:

1. **`while (low < high)` en lugar de `<=`.** Con `<` nunca examinas el caso en que la zona tiene un solo elemento, y te pierdes el objetivo si está ahí.
2. **`low = mid` o `high = mid`** en lugar de `mid ± 1`. Si `low` y `high` son adyacentes, `mid` vuelve a ser el mismo y el bucle no termina nunca.
3. **Desbordamiento al calcular `mid`.** En lenguajes con enteros de tamaño fijo, `(low + high) / 2` puede desbordar con arrays enormes. `low + (high - low) / 2` lo evita. En JavaScript los números son de coma flotante, pero acostumbrarte a la forma segura no cuesta nada.
4. **Olvidar `Math.floor`.** En JavaScript, `7 / 2` es `3.5`; un índice decimal devuelve `undefined`.
5. **Usarla sobre datos desordenados.** Devuelve resultados incorrectos sin ningún error visible.

Una buena forma de evitarlos es pensar en el **invariante**: "si el objetivo está en el array, está entre `low` y `high`, inclusive". Cada línea del bucle debe preservar esa afirmación. Cuando `low > high`, la zona está vacía y puedes afirmar que no está.

### Medir sin cronómetro: tiempo de ejecución

¿Por qué no medimos simplemente cuántos milisegundos tarda? Porque eso depende de la máquina, del lenguaje, de lo que esté corriendo en paralelo y del tamaño de la entrada. Queremos algo que describa el **algoritmo**, no la ejecución. Por eso contamos **operaciones** en función del tamaño de la entrada `n`.

- Búsqueda lineal en una lista de `n` elementos: hasta `n` operaciones. Decimos que es **tiempo lineal**.
- Búsqueda binaria: hasta `log n` operaciones. Es **tiempo logarítmico**.

### La notación Big O

Big O es una forma de escribir **cómo crece** el número de operaciones cuando crece `n`. Se escribe `O(n)`, `O(log n)`, etc. No dice "cuántos segundos", dice "cómo escala".

¿Por qué importa el crecimiento y no el número exacto? Supón que pruebas ambos algoritmos con 100 elementos: lineal hace 100 operaciones, binaria hace 7. Podrías pensar "la binaria es unas 15 veces más rápida". Pero con mil millones de elementos, lineal hace mil millones y binaria hace 30: ahora es unas **33 millones de veces** más rápida. La relación no es constante; los dos tiempos **crecen a ritmos diferentes**. Big O captura exactamente ese ritmo.

### Visualizar los órdenes de crecimiento

Un ejercicio mental: tienes que dibujar una cuadrícula de 16 casillas.

- **Algoritmo 1:** dibujas las casillas una por una. 16 operaciones. Con `n` casillas, `n` operaciones: **O(n)**.
- **Algoritmo 2:** doblas el papel por la mitad, luego otra vez, y otra, y otra. Cada doblez duplica las casillas. 4 dobleces dan 16 casillas. Con `n` casillas, `log n` operaciones: **O(log n)**.

Los tiempos más comunes, de más rápido a más lento:

| Big O | Nombre | Ejemplo | n = 1.000 |
| --- | --- | --- | --- |
| O(1) | constante | leer `arr[i]` | 1 |
| O(log n) | logarítmico | búsqueda binaria | ~10 |
| O(n) | lineal | búsqueda simple | 1.000 |
| O(n log n) | lineal-logarítmico | buenos ordenamientos (quicksort, merge sort) | ~10.000 |
| O(n²) | cuadrático | ordenamiento por selección, doble bucle | 1.000.000 |
| O(2ⁿ) | exponencial | probar todos los subconjuntos | número de 302 cifras |
| O(n!) | factorial | probar todos los órdenes (viajante por fuerza bruta) | inimaginable |

Una forma de sentir la diferencia: si cada operación tardara 1 milisegundo y `n = 1.000`, O(n) tarda 1 segundo, O(n²) tarda unos 17 minutos y O(2ⁿ) tardaría muchísimo más que la edad del universo.

```
operaciones
  ▲                        O(n²)
  │                      /
  │                    /
  │                 /        O(n log n)
  │              /       __/
  │           /     __/       O(n)
  │        /   __/      ___/
  │     / __/     ___/
  │  /_/____/__________________ O(log n)
  │/____________________________ O(1)
  └────────────────────────────────► n
```

### Big O describe el peor caso

Si buscas con búsqueda lineal y el elemento es el primero, terminas en 1 paso. ¿Es entonces O(1)? No. Big O, en su uso habitual, describe el **peor caso**: te da una garantía de que el algoritmo nunca será más lento que eso. Saber el caso promedio también es útil (lo verás con quicksort), pero la garantía del peor caso es la base para decidir.

### El problema del viajante: un vistazo a lo intratable

Un vendedor debe visitar 5 ciudades y quiere la ruta total más corta. La forma obvia es probar todos los órdenes posibles. ¿Cuántos son? Para 5 ciudades, 5 × 4 × 3 × 2 × 1 = 120. Para 10 ciudades, 3.628.800. Para 20, unos 2,4 trillones (2,4 × 10¹⁸). Ese crecimiento es **factorial**, O(n!).

Lo inquietante es que nadie conoce un algoritmo exacto y rápido para este problema. Es uno de los problemas famosos sin solución eficiente conocida. Volverás a él en la sesión de algoritmos greedy y problemas NP-completos, donde verás que en la práctica se usan **aproximaciones**.

### La búsqueda binaria más allá de los arrays

La idea de "partir el espacio a la mitad" es más general que buscar un número en un array:

- **Buscar el primer elemento que cumple una condición.** Si en una lista ordenada de versiones de software hay un punto a partir del cual "todo falla", puedes encontrar la primera versión defectuosa con búsqueda binaria. Es lo que hace `git bisect` con los commits.
- **Buscar en un rango de respuestas.** "¿Cuál es la menor capacidad de camión que permite repartir todo en 5 días?" Si una capacidad funciona, todas las mayores también funcionan; puedes buscar binariamente sobre la capacidad.
- **Árboles binarios de búsqueda.** Cada nodo parte el espacio en "menores" y "mayores", que es búsqueda binaria hecha estructura (sesión de árboles).

Variante útil: encontrar el **primer índice** donde aparece un valor, cuando hay duplicados.

```ts
export function lowerBound(sorted: number[], target: number): number {
  let low = 0;
  let high = sorted.length; // zona semiabierta [low, high)
  while (low < high) {
    const mid = low + Math.floor((high - low) / 2);
    if (sorted[mid] < target) low = mid + 1;
    else high = mid; // mid podría ser la respuesta: no lo descartes
  }
  return low; // primera posición con valor >= target
}
```

Observa que aquí `high = mid` es correcto y `while (low < high)` también, porque el invariante es distinto: la zona es semiabierta `[low, high)`. Lo importante no es memorizar la fórmula, sino **elegir un invariante y respetarlo** en cada línea.

### Búsqueda binaria sobre la respuesta: un ejemplo completo

Este uso es menos obvio y aparece mucho en problemas reales. Enunciado: tienes una lista de paquetes con pesos `[3, 2, 2, 4, 1, 4]` que deben enviarse **en ese orden** durante `D = 3` días. Cada día cargas paquetes consecutivos hasta la capacidad del camión. ¿Cuál es la **menor capacidad** que permite terminar en 3 días?

Paso 1, replantear: buscamos el menor número `c` tal que "con capacidad `c` termino en ≤ 3 días" sea verdadero.

Paso 2, observar la **monotonía**: si con capacidad 6 termino a tiempo, con 7, 8 o 100 también. Si con 5 no termino, con 4 tampoco. Las respuestas forman una secuencia como:

```
capacidad:   4     5     6     7     8   ...
¿alcanza?:   no    no    sí    sí    sí  ...
```

Eso es un array ordenado de booleanos (todos los "no" antes que todos los "sí"), aunque nunca lo construyas. Buscas el primer "sí" con búsqueda binaria.

Paso 3, límites: la capacidad mínima posible es el paquete más pesado (4; si no, ese paquete nunca cabe). La máxima es la suma total (16; todo en un día).

Paso 4, la función de verificación, que es una simulación lineal:

```ts
function daysNeeded(weights: number[], capacity: number): number {
  let days = 1;
  let load = 0;
  for (const w of weights) {
    if (load + w > capacity) { days++; load = 0; }
    load += w;
  }
  return days;
}

export function minCapacity(weights: number[], days: number): number {
  let low = Math.max(...weights);
  let high = weights.reduce((a, b) => a + b, 0);
  while (low < high) {
    const mid = low + Math.floor((high - low) / 2);
    if (daysNeeded(weights, mid) <= days) high = mid; // alcanza: puede haber una menor
    else low = mid + 1;                                // no alcanza: hay que subir
  }
  return low;
}
```

Con el ejemplo, `minCapacity([3, 2, 2, 4, 1, 4], 3)` devuelve 6: día 1 `[3, 2]`, día 2 `[2, 4]`, día 3 `[1, 4]`.

Costo: la búsqueda binaria hace `log(S)` iteraciones, donde `S` es la suma de pesos, y cada iteración simula en O(n). Total: **O(n log S)**. Probar todas las capacidades una por una costaría O(n · S). Observa cómo usamos **dos variables** distintas (`n` y `S`) en el análisis: son dimensiones independientes del problema.

La idea transferible: cuando la pregunta es "¿cuál es el mínimo (o máximo) valor que cumple una condición?" y la condición es **monótona**, puedes buscar binariamente sobre el valor aunque no exista ningún array.

### Versión recursiva

La búsqueda binaria también se puede escribir de forma recursiva. Es útil verla porque anticipa la sesión de recursión:

```ts
function binarySearchRec(sorted: number[], target: number, low = 0, high = sorted.length - 1): number {
  if (low > high) return -1;                       // caso base: zona vacía
  const mid = low + Math.floor((high - low) / 2);
  if (sorted[mid] === target) return mid;           // caso base: encontrado
  return sorted[mid] < target
    ? binarySearchRec(sorted, target, mid + 1, high) // mitad derecha
    : binarySearchRec(sorted, target, low, mid - 1); // mitad izquierda
}
```

Tiempo: O(log n), igual que la iterativa. Espacio: O(log n) por las llamadas apiladas, frente a O(1) de la versión iterativa. Por eso en la práctica se prefiere la iterativa, aunque la recursiva exprese la idea de forma muy directa: "busca en la mitad que corresponda".

### Cuándo NO usar búsqueda binaria

- Si buscas una sola vez en datos desordenados, ordenar cuesta O(n log n), más que la búsqueda lineal O(n). Ordenar solo compensa si vas a buscar muchas veces.
- Si necesitas búsquedas por clave muy frecuentes y no te importa el orden, una tabla hash (O(1) en promedio) suele ser mejor.
- Para listas enlazadas no sirve: no puedes saltar al elemento del medio en O(1).

### Errores comunes al razonar sobre Big O

- **Creer que Big O mide segundos.** Mide crecimiento.
- **Pensar que O(log n) "se parece" a O(n) para entradas pequeñas y por eso da igual.** Para entradas reales, la diferencia es abismal.
- **Olvidar el costo de preparar los datos** (ordenar antes de buscar).
- **Asumir el mejor caso.** El análisis estándar es del peor caso.
- **Comparar algoritmos con una sola entrada pequeña.** Con 10 elementos casi todo parece igual de rápido; los órdenes de crecimiento se notan cuando duplicas o multiplicas por mil el tamaño.
- **No reconocer la monotonía.** Muchos problemas de "encontrar el mínimo valor que cumple X" se resuelven con búsqueda binaria sobre la respuesta, pero solo si cumplir X para un valor implica cumplirlo para todos los mayores (o todos los menores). Verifica esa propiedad antes de aplicar la técnica.

## Conceptos clave

- **Algoritmo**: conjunto de instrucciones precisas para resolver una tarea.
- **Búsqueda lineal**: revisar elementos uno por uno; O(n).
- **Búsqueda binaria**: en datos ordenados, mirar el medio y descartar la mitad en cada paso; O(log n).
- **Logaritmo base 2**: cuántas veces puedes dividir `n` entre 2 hasta llegar a 1.
- **Invariante**: afirmación que el bucle mantiene verdadera en cada iteración (por ejemplo, "si está, está entre low y high").
- **Big O**: notación que describe cómo crece el número de operaciones de un algoritmo con el tamaño de la entrada, normalmente en el peor caso.
- **Tiempo factorial**: O(n!), crecimiento de probar todos los órdenes posibles; intratable incluso para `n` moderado.

## Preguntas de repaso

1. ¿Cuántos pasos necesita, como máximo, una búsqueda binaria sobre una lista ordenada de 1.000.000 de elementos? ¿Y si la lista crece a 2.000.000?
   R: Unos 20 pasos, porque 2²⁰ ≈ 1.000.000. Si la lista se duplica, solo se agrega un paso: unos 21. Por eso la búsqueda binaria es O(log n).
2. ¿Por qué la búsqueda binaria requiere datos ordenados?
   R: Porque descarta una mitad basándose en la comparación con el elemento del medio. Esa conclusión ("si el medio es menor que el objetivo, el objetivo está a la derecha") solo es válida si los elementos están en orden. Con datos desordenados, la comparación no dice nada sobre dónde está el objetivo.
3. ¿Qué mide Big O y qué no mide?
   R: Mide cómo crece el número de operaciones cuando crece el tamaño de la entrada, normalmente en el peor caso. No mide tiempo en segundos, ni depende de la máquina o el lenguaje.
4. Explica por qué `high = mid` en lugar de `high = mid - 1` puede causar un bucle infinito en la búsqueda binaria clásica con `while (low <= high)`.
   R: Porque cuando `low === high` y el elemento en `mid` es mayor que el objetivo, `high = mid` no cambia nada: `low`, `high` y `mid` quedan iguales y la condición `low <= high` sigue siendo verdadera para siempre. Restar 1 garantiza que la zona se reduce en cada iteración.
5. ¿Por qué el problema del viajante resuelto por fuerza bruta es O(n!)?
   R: Porque prueba todos los órdenes posibles de visitar las `n` ciudades, y el número de permutaciones de `n` elementos es `n × (n−1) × … × 1 = n!`. Ese número crece tan rápido que con 20 ciudades ya hay unos 2,4 × 10¹⁸ rutas.
6. Si vas a buscar un solo valor en un array desordenado de un millón de elementos, ¿conviene ordenarlo y usar búsqueda binaria?
   R: No. Ordenar cuesta O(n log n), más que una búsqueda lineal O(n). Ordenar compensa solo si vas a hacer muchas búsquedas sobre los mismos datos.

## Ejercicio

Implementa en TypeScript `binarySearch` (clásica) y `lowerBound` (primera posición con valor ≥ objetivo). Luego escribe `countOccurrences(sorted, x)` usando dos llamadas a búsqueda binaria (sin recorrer el array). Agrega un contador de iteraciones para comparar con una búsqueda lineal sobre arrays ordenados de 1.000, 1.000.000 y 10.000.000 elementos.

Criterio de terminado: tests que cubren array vacío, un elemento, objetivo al inicio, al final, ausente y con duplicados; una tabla impresa en consola con las iteraciones de lineal vs binaria para los tres tamaños, donde la binaria no supera ~24 iteraciones.

## Explícalo con tus palabras

Explica a alguien sin formación técnica por qué buscar en un diccionario de papel abriéndolo por la mitad es muchísimo mejor que leer página por página, y qué tiene que ver eso con la notación O(log n).
