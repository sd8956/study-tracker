---
title: Búsqueda binaria y Big O a fondo
kind: lesson
hours: 3
sources: Grokking Algorithms, cap. 1 "Introduction to Algorithms" (pp. 20–38) | Cracking the Coding Interview, cap. VI "Big O" (pp. 50–71) | Cracking the Coding Interview, cap. X "Sorting and Searching", Searching Algorithms (pp. 161–162)
links: Visualizador de búsqueda binaria (VisuAlgo) | https://visualgo.net/en/bst ; Big-O Cheat Sheet | https://www.bigocheatsheet.com
---

## Objetivo

Implementar la búsqueda binaria sin errores (también sobre el espacio de respuestas) y analizar con soltura el costo en tiempo y espacio de cualquier fragmento de código: reglas de simplificación, sumar frente a multiplicar, tiempo amortizado, pila de llamadas y funciones recursivas.

## Estudio

### Medir sin cronómetro

Para casi cualquier tarea hay muchos algoritmos posibles, y la diferencia entre ellos no es un 10 %: puede ser la diferencia entre milisegundos y años. Medir con un cronómetro no sirve para compararlos, porque el resultado depende de la máquina, del lenguaje y de la entrada que probaste. Lo que se compara es **cómo crece el número de operaciones cuando crece la entrada**. Esa es la idea de la notación Big O.

Una analogía para fijar el sentido: tienes que mandar un archivo a otra ciudad. Por internet, el tiempo crece con el tamaño del archivo: **O(s)**. En avión con un disco duro, el vuelo tarda lo mismo lleve 1 GB o 100 TB: **O(1)** respecto al tamaño. Para 1 MB gana internet; para 100 TB gana el avión. La lección: **O(1) no significa rápido, significa que no crece**, y Big O describe lo que pasa cuando la entrada se hace grande.

### Búsqueda binaria: descartar la mitad

Piensa un número entre 1 y 100; yo adivino y tú respondes "más alto", "más bajo" o "correcto". Si digo 1, 2, 3…, cada intento descarta un número: es **búsqueda lineal**, hasta 100 intentos. Si digo 50, la respuesta descarta la mitad de golpe; luego 25 o 75, y así. Nunca necesito más de 7 intentos. Eso es **búsqueda binaria**.

| Elementos | Lineal (peor caso) | Binaria (peor caso) |
| --- | --- | --- |
| 100 | 100 | 7 |
| 240.000 | 240.000 | 18 |
| 1.000.000.000 | 1.000.000.000 | 30 |

Duplicar la entrada duplica el trabajo de la lineal y le agrega **un solo paso** a la binaria. El número de veces que puedes partir `n` a la mitad hasta llegar a 1 es `log₂ n` ("¿cuántos 2 multiplico para obtener `n`?"): 2¹⁰ ≈ mil, 2²⁰ ≈ un millón, 2³⁰ ≈ mil millones. Regla que vas a usar siempre: **si en cada paso el espacio del problema se divide por una constante, aparece un log n**. La base no importa en Big O, porque cambiar de base solo multiplica por una constante.

La condición indispensable es que los datos estén **ordenados**. Saber que el elemento del medio es menor que el objetivo solo dice "está a la derecha" si hay orden. En un enunciado, "dado un array ordenado…" debería hacerte pensar de inmediato en búsqueda binaria o en dos punteros.

### Implementación e invariante

Dos índices, `low` y `high`, delimitan la zona donde el objetivo todavía puede estar. Miras el del medio y descartas la mitad que no puede contenerlo.

```ts
export function binarySearch(sorted: number[], target: number): number {
  let low = 0;
  let high = sorted.length - 1;
  while (low <= high) {
    const mid = low + Math.floor((high - low) / 2);
    if (sorted[mid] === target) return mid;
    if (sorted[mid] < target) low = mid + 1; // está a la derecha
    else high = mid - 1;                     // está a la izquierda
  }
  return -1;
}
```

Buscando `4` en `[1, 3, 5, 7, 9, 11, 13]`:

```
low=0 high=6 mid=3 → 7 > 4 → high=2
low=0 high=2 mid=1 → 3 < 4 → low=2
low=2 high=2 mid=2 → 5 > 4 → high=1
low=2 high=1 → zona vacía → -1
```

La búsqueda binaria es fácil de explicar y fácil de escribir mal. La defensa es pensar en el **invariante**: "si el objetivo está en el array, está entre `low` y `high`, inclusive". Cada línea debe preservarlo, y cuando `low > high` la zona está vacía y puedes afirmar que no está. Los errores clásicos son violaciones de ese invariante:

1. **`while (low < high)`** con esta zona cerrada: nunca examinas la zona de un solo elemento.
2. **`low = mid` o `high = mid`**: si `low === high`, la zona no se achica y el bucle no termina.
3. **Olvidar `Math.floor`**: `7 / 2` es `3.5` y `sorted[3.5]` es `undefined`.
4. **`(low + high) / 2`** en lenguajes con enteros de tamaño fijo puede desbordar; `low + (high - low) / 2` no.
5. **Usarla sobre datos desordenados**: devuelve basura sin ningún error.

Una variante muy útil es `lowerBound`, la primera posición con valor `>= target`. Cambia el invariante: la zona es semiabierta `[low, high)`, y por eso aquí `high = mid` y `while (low < high)` son **correctos**.

```ts
export function lowerBound(sorted: number[], target: number): number {
  let low = 0;
  let high = sorted.length;
  while (low < high) {
    const mid = low + Math.floor((high - low) / 2);
    if (sorted[mid] < target) low = mid + 1;
    else high = mid; // mid podría ser la respuesta: no lo descartes
  }
  return low;
}
```

Lo que importa no es memorizar una de las dos fórmulas, sino **elegir un invariante y respetarlo en cada línea**.

### Búsqueda binaria sobre la respuesta

La idea de partir a la mitad sirve aunque no haya ningún array. `git bisect` encuentra el primer commit defectuoso así: si un commit falla, todos los posteriores también. Ese patrón aparece en problemas de "el menor valor que cumple X".

Enunciado: paquetes de pesos `[3, 2, 2, 4, 1, 4]` deben enviarse **en ese orden** en `D = 3` días; cada día cargas paquetes consecutivos hasta la capacidad del camión. ¿Cuál es la menor capacidad que alcanza?

La clave es la **monotonía**: si la capacidad 6 alcanza, 7 y 100 también; si 5 no alcanza, 4 tampoco. Las respuestas forman un array implícito de "no… no, sí… sí", y buscas el primer "sí". El límite inferior es el paquete más pesado (4) y el superior, la suma (16).

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
    if (daysNeeded(weights, mid) <= days) high = mid; // alcanza: quizá una menor también
    else low = mid + 1;
  }
  return low;
}
```

Resultado: 6 (días `[3, 2]`, `[2, 4]`, `[1, 4]`). Costo: `log S` iteraciones, con `S` la suma de pesos, y cada una simula en O(n): **O(n log S)**, frente a O(n · S) de probar todas las capacidades. Antes de usar la técnica, verifica la monotonía: sin ella, la búsqueda binaria descarta mitades que sí contenían la respuesta.

### Órdenes de crecimiento

| Big O | Nombre | Ejemplo | n = 1.000 |
| --- | --- | --- | --- |
| O(1) | constante | leer `arr[i]` | 1 |
| O(log n) | logarítmico | búsqueda binaria | ~10 |
| O(n) | lineal | búsqueda lineal | 1.000 |
| O(n log n) | lineal-logarítmico | buenos ordenamientos | ~10.000 |
| O(n²) | cuadrático | comparar todos los pares | 1.000.000 |
| O(2ⁿ) | exponencial | probar todos los subconjuntos | número de 302 cifras |
| O(n!) | factorial | probar todos los órdenes | inimaginable |

Si cada operación tardara 1 ms con `n = 1.000`, O(n) tardaría 1 segundo, O(n²) unos 17 minutos y O(2ⁿ) muchísimo más que la edad del universo. El problema del viajante por fuerza bruta prueba todos los órdenes de visitar `n` ciudades: con 20 ciudades ya son unos 2,4 × 10¹⁸ rutas. Nadie conoce un algoritmo exacto y rápido para él; volverás a él en la sesión de greedy y NP.

### Mejor, peor y caso esperado

El mismo algoritmo puede comportarse distinto según la entrada. Si el elemento buscado es el primero, la búsqueda lineal termina en un paso, pero eso no la hace O(1): el mejor caso casi nunca es interesante. Lo habitual es dar el **peor caso**, que es una garantía, y mencionar el **esperado** cuando difiere (quicksort es O(n log n) esperado y O(n²) en el peor).

En la academia, O es una cota superior, Ω una inferior y Θ una ajustada. En la industria y en entrevistas se dice "O" queriendo decir la ajustada: "es O(n)" significa "crece como n". En esta ruta usamos ese sentido práctico.

### Cuatro reglas para simplificar

**1. Elimina las constantes.** Un bucle que calcula mínimo y máximo a la vez y dos bucles separados hacen un trabajo parecido; ambos son O(n), no "O(n) contra O(2n)". Big O describe la **forma** del crecimiento, y contar instrucciones exactas es una ilusión con cachés y compiladores de por medio.

**2. Elimina los términos no dominantes en la misma variable.** `O(n² + n)` es `O(n²)`; `O(n + log n)` es `O(n)`; `O(5 · 2ⁿ + n¹⁰⁰)` es `O(2ⁿ)`. Pero `O(b² + a)` **no** se simplifica: son variables distintas y no sabes cuál domina.

**3. Suma si es secuencial, multiplica si es anidado.**

```ts
for (const a of A) visit(a);
for (const b of B) visit(b);          // O(a + b)

for (const a of A)
  for (const b of B) visit(a, b);     // O(a · b)
```

"Haz esto y, cuando termines, haz aquello" suma. "Haz esto por cada vez que hagas aquello" multiplica. El segundo fragmento solo es O(n²) si los dos arrays tienen tamaño `n`.

**4. Nombra cada dimensión.** Ordenar cada string de una lista y después la lista: con `a` strings de longitud máxima `s`, ordenar cada uno cuesta `a · s log s`; ordenar la lista hace `a log a` comparaciones de costo `s`. Total: `O(a · s (log a + log s))`. Con una sola `n` para todo, habrías mezclado dos cosas distintas.

### Espacio: lo que está ocupado a la vez

La complejidad espacial cuenta la memoria adicional **ocupada a la vez en el peor momento**. Un array de tamaño `n` es O(n); una matriz `n × n`, O(n²). Y algo que se olvida mucho: **la pila de llamadas cuenta**. Cada llamada a función apila un marco con sus variables y su punto de retorno, y ese marco vive hasta que la llamada termina.

```ts
function sumTo(n: number): number {
  if (n <= 0) return 0;
  return n + sumTo(n - 1); // n marcos apilados a la vez: O(n) espacio
}

function sumPairs(n: number): number {
  let sum = 0;
  for (let i = 0; i < n; i++) sum += pairSum(i, i + 1); // cada llamada termina antes de la siguiente
  return sum;                                          // O(1) espacio extra
}
```

Por eso la búsqueda binaria recursiva usa O(log n) de espacio y la iterativa O(1), aunque ambas tarden O(log n).

### Tiempo amortizado: el array dinámico

`arr.push(x)` casi siempre es instantáneo, pero un array dinámico tiene capacidad fija por dentro. Cuando se llena, reserva uno del **doble** de tamaño y copia todo, lo que cuesta O(n). ¿Entonces `push` es O(n)?

Cuenta las copias al insertar `n` elementos empezando con capacidad 1: `1 + 2 + 4 + … + n/2`, que es menor que `n`. El trabajo total de `n` inserciones es O(n), así que cada una cuesta **O(1) amortizado**. Es como el seguro del auto: un pago grande al año, repartido en cuotas pequeñas.

Duplicar es la clave. Si el array creciera sumando 10 posiciones, habría unas `n/10` copias de tamaños 10, 20, 30…, cuya suma es del orden de `n²/20`: O(n²) en total y O(n) por inserción. **Crecer multiplicando** es lo que deja el amortizado en O(1). Y amortizado no es "promedio con suerte": es una garantía sobre cualquier secuencia de operaciones.

### Recursión: ramas elevadas a profundidad

```ts
function f(n: number): number {
  if (n <= 1) return 1;
  return f(n - 1) + f(n - 1);
}
```

Mucha gente responde O(n²) porque "hay dos llamadas". Dibuja el árbol: `f(4)` llama a dos `f(3)`, cada una a dos `f(2)`, y así. Los niveles tienen 1, 2, 4, 8… nodos, y con profundidad `n` el total es `2ⁿ − 1`: **O(2ⁿ)**.

Regla general: **una recursión con `b` llamadas por invocación y profundidad `d` cuesta O(bᵈ)**. El espacio, en cambio, es la profundidad: en cada momento solo hay una rama activa en la pila, así que es **O(n)**. Ojo con los exponentes: O(2ⁿ) y O(8ⁿ) son órdenes distintos, porque 8ⁿ = 2³ⁿ. Las constantes se eliminan cuando multiplican, no cuando están en la base o el exponente.

La regla funciona si calculas bien la profundidad. Recorrer un árbol binario balanceado hace dos llamadas por nodo con profundidad `log n`: O(2^(log n)) = O(n), que tiene sentido porque visita cada nodo una vez.

### Práctica guiada

Analiza cada fragmento antes de leer la respuesta.

**1. Pares ordenados.** `for i` de 0 a `n`, `for j` de `i + 1` a `n`. El interno corre `n − 1, n − 2, …, 0` veces: `n(n − 1)/2`, **O(n²)**.

**2. Dividir entre 3.** `for (let i = n; i > 0; i = Math.floor(i / 3))`: **O(log n)**.

**3. ¿Es primo?** `for (let x = 2; x * x <= n; x++)`: el bucle llega hasta √n, **O(√n)**. No todo costo es una potencia entera de `n`.

**4. Permutaciones.** Generar todas las permutaciones de un string de longitud `n` produce `n!` resultados de longitud `n`: **O(n · n!)**. A veces el costo lo fija el tamaño de la salida.

**5. Intersección con `includes`.**

```ts
const common = a.filter((x) => b.includes(x)); // O(a · b)
```

`includes` es una búsqueda lineal dentro de un recorrido. Con `const inB = new Set(b)` y `inB.has(x)`, cuesta O(b) construir el `Set` y O(1) promedio cada consulta: **O(a + b)**. Pasar de búsqueda lineal repetida a tabla hash es la optimización más frecuente que vas a hacer.

**6. Un bucle anidado que es lineal.**

```ts
let j = 0;
for (let i = 0; i < n; i++) {
  while (j < n && arr[j] < arr[i] * 2) j++;
}
```

`j` nunca retrocede: en todo el programa avanza como mucho `n` veces. Total **O(n)**. Es el patrón de dos punteros, y la razón para no contar bucles anidados mecánicamente: pregúntate cuántas veces se ejecuta el cuerpo interno **en total**.

### Costos ocultos en JavaScript

| Operación | Costo |
| --- | --- |
| `arr[i]`, `arr.length` | O(1) |
| `arr.push`, `arr.pop` | O(1) amortizado |
| `arr.shift`, `arr.unshift`, `arr.splice(i, 1)` | O(n): desplazan elementos |
| `arr.includes`, `arr.indexOf` | O(n): búsqueda lineal |
| `arr.slice`, `[...arr]`, `arr.concat` | O(n): copian |
| `arr.sort`, `arr.toSorted` | O(n log n) comparaciones |
| `set.has`, `map.get`, `map.set` | O(1) promedio |
| `str + str2` | O(longitud total): los strings son inmutables |

Un `includes` o un `shift` dentro de un bucle convierten O(n) en O(n²) sin que el código lo parezca. Construir un string grande con `+=` en un bucle puede volverse caro; juntar las partes en un array y hacer `join("")` al final es lo seguro.

### Explicar tu análisis en voz alta

En una entrevista o una revisión de código, "es O(n log n)" no basta. Sigue un guion: (1) define las variables ("`n` usuarios, `m` pedidos por usuario"); (2) recorre el código por bloques; (3) combina con suma o multiplicación diciendo "después" o "dentro"; (4) simplifica solo lo que se puede; (5) menciona el espacio, incluida la pila; (6) distingue peor caso y esperado si difieren. Nombrar las variables te impide mezclar dimensiones, y decir "dentro" o "después" te obliga a elegir bien entre multiplicar y sumar.

### Del análisis a las decisiones

| Pregunta real | Cómo ayuda Big O |
| --- | --- |
| ¿Aguanta 100× más usuarios? | Si es O(n²) en usuarios, el costo crece 10.000×. |
| ¿Conviene ordenar para buscar con búsqueda binaria? | Ordenar es O(n log n): solo compensa si haces muchas búsquedas sobre los mismos datos. |
| ¿Puedo cachear para no recalcular? | Si la recursión repite subproblemas, memoizar baja de O(2ⁿ) a O(n). |
| ¿Cuánto puedo mejorar como máximo? | Si hay que mirar cada elemento, nada baja de O(n). |

### Errores comunes

- **Creer que Big O mide segundos.** Mide crecimiento.
- **Contar "dos llamadas" como n².** Dibuja el árbol y usa ramas elevadas a profundidad.
- **Usar `n` para todo** o simplificar términos de variables distintas: `O(a + b)` no se reduce.
- **Olvidar la pila de recursión** al calcular el espacio.
- **Confundir amortizado con promedio sobre entradas.** Amortizado es sobre una secuencia de operaciones y es garantizado.
- **Ignorar el costo de preparar los datos**, como ordenar antes de buscar una sola vez.
- **Aplicar búsqueda binaria sobre la respuesta sin verificar la monotonía.**
- **Mezclar invariantes** en la búsqueda binaria: zona cerrada con `high = mid`, o semiabierta con `<=`.

## Conceptos clave

- **Big O**: cómo crece el número de operaciones de un algoritmo con el tamaño de la entrada, normalmente en el peor caso.
- **Búsqueda binaria**: en datos ordenados, mirar el medio y descartar la mitad en cada paso; O(log n).
- **Invariante**: afirmación que el bucle mantiene verdadera en cada iteración, como "si está, está entre low y high".
- **Búsqueda binaria sobre la respuesta**: buscar el menor valor que cumple una condición monótona sin construir ningún array.
- **Términos no dominantes**: en una suma, solo queda el término que crece más rápido en la misma variable.
- **Suma frente a multiplicación**: pasos secuenciales se suman; pasos anidados se multiplican.
- **Complejidad espacial**: memoria adicional ocupada a la vez en el peor momento, incluida la pila de llamadas.
- **Tiempo amortizado**: costo por operación repartido a lo largo de una secuencia, aunque algunas operaciones sean caras.
- **Ramas elevadas a profundidad**: una recursión con `b` llamadas por nivel y profundidad `d` cuesta O(bᵈ).

## Preguntas de repaso

1. ¿Cuántos pasos necesita como máximo una búsqueda binaria sobre 1.000.000 de elementos ordenados? ¿Y si la lista crece a 2.000.000?
   R: Unos 20, porque 2²⁰ ≈ 1.000.000. Si la lista se duplica, solo se agrega un paso: unos 21. Por eso es O(log n).
2. Explica por qué `high = mid` en lugar de `high = mid - 1` puede causar un bucle infinito en la búsqueda binaria clásica con `while (low <= high)`.
   R: Porque cuando `low === high` y el elemento del medio es mayor que el objetivo, `high = mid` no cambia nada: `low`, `high` y `mid` quedan iguales y la condición sigue siendo verdadera para siempre. Restar 1 garantiza que la zona se achica en cada iteración.
3. ¿Qué propiedad debe cumplir un problema para resolverlo con búsqueda binaria sobre la respuesta?
   R: La condición debe ser monótona: si se cumple para un valor, se cumple para todos los mayores (o para todos los menores). Así las respuestas forman una secuencia de "no" seguida de "sí", y se busca el primer "sí" descartando mitades. Sin monotonía, se pueden descartar mitades que contenían la respuesta.
4. ¿Cuál es el costo de dos bucles anidados donde el externo recorre un array `A` y el interno un array `B` distinto? ¿Y si son uno después del otro?
   R: Anidados, O(a · b), porque por cada elemento de A se recorre todo B. Secuenciales, O(a + b). Solo sería O(n²) si ambos tuvieran el mismo tamaño n.
5. ¿Por qué `push` en un array dinámico es O(1) amortizado y qué pasaría si creciera sumando 10 posiciones en lugar de duplicarse?
   R: Al llenarse se duplica y copia sus elementos; para n inserciones las copias suman 1 + 2 + 4 + … + n/2 < n, así que el trabajo total es O(n) y el costo por inserción es O(1) amortizado. Creciendo de 10 en 10 habría unas n/10 copias de tamaños 10, 20, 30…, cuya suma es del orden de n²/20: O(n²) total y O(n) por inserción.
6. Una función recursiva hace dos llamadas a sí misma con `n - 1` hasta llegar a 1. ¿Cuál es su costo en tiempo y en espacio?
   R: Tiempo O(2ⁿ), porque el árbol de llamadas duplica los nodos en cada nivel y tiene profundidad n. Espacio O(n), porque en cada momento solo hay una rama activa en la pila, de profundidad n.
7. ¿Se puede simplificar O(n² + m)? Justifica.
   R: No. n y m son variables independientes y no se sabe cuál domina; m podría ser mucho mayor que n². Solo se eliminan términos no dominantes de la misma variable.
8. Si vas a buscar un solo valor en un array desordenado de un millón de elementos, ¿conviene ordenarlo y usar búsqueda binaria?
   R: No. Ordenar cuesta O(n log n), más que una búsqueda lineal O(n). Ordenar compensa solo si vas a hacer muchas búsquedas sobre los mismos datos.

## Ejercicio

Dos partes en TypeScript. (1) En `search.ts`, implementa `binarySearch`, `lowerBound`, `countOccurrences(sorted, x)` con dos búsquedas binarias (sin recorrer el array) y `minCapacity(weights, days)`. (2) En `big-o-lab.ts`, escribe seis funciones que cuenten sus operaciones y devuelvan el conteo, una por cada orden: O(1), O(log n), O(n), O(n log n), O(n²) y O(2ⁿ); ejecútalas con `n = 1, 2, 4, 8, 16, 32` (la exponencial solo hasta 20) e imprime una tabla.

Criterio de terminado: los tests de búsqueda cubren array vacío, un elemento, objetivo al inicio, al final, ausente y con duplicados, y `minCapacity([3, 2, 2, 4, 1, 4], 3)` devuelve 6; en la tabla, al duplicar `n` la columna O(n) se duplica, O(n²) se cuadruplica, O(log n) suma 1 y O(2ⁿ) se eleva al cuadrado; cada función tiene un comentario que justifica su Big O con las reglas de esta sesión.

## Explícalo con tus palabras

Explica a un compañero, dibujando en papel, por qué buscar en un diccionario abriéndolo por la mitad es O(log n) y por qué una función recursiva con dos llamadas es O(2ⁿ) y no O(n²).
