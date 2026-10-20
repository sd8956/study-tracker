---
title: Big O a fondo, tiempo, espacio y reglas de análisis
kind: lesson
hours: 2
sources: Cracking the Coding Interview, cap. VI "Big O" (pp. 50–71) | Grokking Algorithms, cap. 1 "Big O notation" (pp. 29–38)
links: Big-O Cheat Sheet | https://www.bigocheatsheet.com
---

## Objetivo

Analizar con soltura el costo en tiempo y en espacio de cualquier fragmento de código: aplicar las reglas para simplificar expresiones, distinguir sumar de multiplicar, entender el tiempo amortizado y calcular el costo de funciones recursivas.

## Estudio

### Una analogía para empezar

Tienes que enviar un archivo a alguien en otra ciudad. Puedes mandarlo por internet o subirte a un avión con un disco duro. Para un archivo de 1 MB, internet gana sin discusión. Para 100 terabytes, el avión gana: el vuelo tarda lo mismo lleve 1 GB o 100 TB, mientras que la transferencia crece con el tamaño.

- Transferencia por internet: **O(s)**, donde `s` es el tamaño del archivo. Crece linealmente.
- Avión: **O(1)** respecto al tamaño del archivo. Es constante (aunque esa constante sea "10 horas").

La lección: **O(1) no significa rápido, significa que no crece**. Y un algoritmo O(n) puede ganarle a uno O(1) para entradas pequeñas. Big O habla del comportamiento cuando la entrada se hace grande.

### Mejor, peor y caso esperado

Un mismo algoritmo puede comportarse distinto según la entrada. Toma quicksort (lo verás en detalle más adelante):

- **Mejor caso:** si los pivotes parten siempre bien, O(n log n). (El mejor caso casi nunca es interesante: casi cualquier algoritmo tiene un mejor caso trivial con una entrada favorable.)
- **Peor caso:** si el pivote es siempre el mayor o el menor, O(n²).
- **Caso esperado:** con entradas típicas, O(n log n).

Para la mayoría de algoritmos el peor y el esperado coinciden. Cuando no coinciden, menciona ambos.

No confundas esto con O, Ω y Θ. En la academia, O es una cota superior, Ω una cota inferior y Θ una cota ajustada. En la industria (y en entrevistas) se dice "O" queriendo decir la cota ajustada: "este algoritmo es O(n)" significa "crece como n", no "crece como mucho como n". En esta ruta usamos ese sentido práctico.

### Complejidad espacial

No solo importa el tiempo; también la memoria. Si creas un array de tamaño `n`, usas O(n) espacio. Una matriz `n × n`, O(n²).

Un caso que se olvida mucho: **la pila de llamadas cuenta**. Esta función recursiva usa O(n) espacio aunque no cree ningún array:

```ts
function sumTo(n: number): number {
  if (n <= 0) return 0;
  return n + sumTo(n - 1); // n llamadas apiladas a la vez
}
```

En cambio, esta versión hace `n` llamadas, pero nunca más de una activa a la vez, así que usa O(1) espacio extra:

```ts
function pairSum(a: number, b: number): number { return a + b; }

function sumPairs(n: number): number {
  let sum = 0;
  for (let i = 0; i < n; i++) sum += pairSum(i, i + 1); // cada llamada termina antes de la siguiente
  return sum;
}
```

La pregunta clave para el espacio es: **¿cuánta memoria está ocupada a la vez en el peor momento?**

### Regla 1: elimina las constantes

`O(2n)` se escribe `O(n)`. ¿Por qué? Porque Big O describe la **forma** del crecimiento, no el número exacto. Mira estos dos códigos:

```ts
// Versión A: un bucle que calcula mínimo y máximo a la vez
let min = Infinity, max = -Infinity;
for (const x of arr) { if (x < min) min = x; if (x > max) max = x; }

// Versión B: dos bucles separados
let min2 = Infinity; for (const x of arr) if (x < min2) min2 = x;
let max2 = -Infinity; for (const x of arr) if (x > max2) max2 = x;
```

Mucha gente diría que B es O(2n) y A es O(n). Pero A hace dos comparaciones por elemento y B hace una por elemento dos veces: el trabajo real es parecido. A nivel de instrucciones de máquina, cachés y compilador, contar exacto es una ilusión. Ambas son **O(n)**.

### Regla 2: elimina los términos no dominantes

`O(n² + n)` se escribe `O(n²)`. Cuando `n` es grande, el término `n²` domina tanto que `n` se vuelve irrelevante: con `n = 1.000.000`, `n²` es un billón y `n` es un millón (0,0001 % del total).

Ejemplos:

- `O(n² + n)` → `O(n²)`
- `O(n + log n)` → `O(n)`
- `O(5 · 2ⁿ + 1000 n¹⁰⁰)` → `O(2ⁿ)` (lo exponencial termina superando a cualquier polinomio)

**Pero cuidado:** `O(b² + a)` **no** se simplifica. Son dos variables distintas y no sabes cuál domina. Solo eliminas términos cuando uno es claramente menor que otro **en la misma variable**.

### Regla 3: ¿sumar o multiplicar?

Esta es la fuente número uno de errores.

```ts
// SUMAR: primero recorro A, después recorro B
for (const a of A) console.log(a);
for (const b of B) console.log(b);
// O(A + B)

// MULTIPLICAR: por cada elemento de A, recorro todo B
for (const a of A) {
  for (const b of B) console.log(a, b);
}
// O(A × B)
```

Regla mnemotécnica:

- "Haz esto, **y cuando termines**, haz aquello" → **suma**.
- "Haz esto **por cada vez** que hagas aquello" → **multiplica**.

Error típico: escribir O(n²) para el segundo código. Si A y B son arrays distintos, el costo es O(a · b). Solo es O(n²) si ambos tienen tamaño `n` (por ejemplo, si son el mismo array).

### Regla 4: usa nombres de variables con sentido

Cuando hay varias entradas, nombra cada dimensión. Ejemplo: ordenar cada string de una lista de strings y luego ordenar la lista.

- `a` = cantidad de strings, `s` = longitud del string más largo.
- Ordenar cada string: `a × O(s log s)`.
- Ordenar la lista: comparar dos strings cuesta O(s), y ordenar `a` elementos hace O(a log a) comparaciones → `O(s × a log a)`.
- Total: `O(a · s (log a + log s))`.

Si hubieras usado una sola `n` para todo, habrías mezclado dos cosas distintas y el resultado sería incorrecto o inútil.

### Tiempo amortizado: el array dinámico

En JavaScript, `arr.push(x)` casi siempre es instantáneo. Pero por dentro, un array dinámico tiene una capacidad fija. Cuando se llena, crea un array nuevo del **doble** de tamaño y copia todo. Esa copia cuesta O(n). Entonces, ¿`push` es O(1) u O(n)?

La respuesta es: **O(1) amortizado**. Mira cuántas copias se hacen al insertar `n` elementos empezando con capacidad 1:

```
capacidad: 1 → 2 → 4 → 8 → 16 → ... → n
copias:      1 + 2 + 4 + 8 + ... + n/2  ≈ n
```

La suma `1 + 2 + 4 + … + n/2` es menor que `n`. Así que `n` inserciones cuestan en total O(n) (inserciones) + O(n) (copias) = O(n), es decir, **O(1) por inserción en promedio**. El peor caso de una inserción individual es O(n), pero ocurre tan rara vez que, repartido entre todas, el costo es constante.

Analogía: una vez al año pagas el seguro del auto (caro), pero si lo repartes en doce meses es una cuota pequeña. El tiempo amortizado es esa cuota mensual.

Por qué duplicar y no sumar una cantidad fija: si cada vez creciera en 10 posiciones, harías `n/10` copias de tamaños crecientes, y el total sería O(n²). **Crecer multiplicando** es lo que hace que el amortizado sea O(1).

### Cuándo aparece un log n

Ya lo viste con búsqueda binaria: cuando el espacio del problema **se divide** (por 2 o por cualquier constante) en cada paso, aparece un `log n`. Señales en el código:

```ts
for (let i = n; i > 1; i = Math.floor(i / 2)) { /* ... */ }  // O(log n)
for (let i = 1; i < n; i *= 2) { /* ... */ }                   // O(log n)
```

Y en estructuras: buscar en un árbol binario de búsqueda balanceado baja un nivel por paso, y un árbol balanceado de `n` nodos tiene ~log n niveles.

### Funciones recursivas: ramas elevadas a profundidad

Adivina el costo de esta función:

```ts
function f(n: number): number {
  if (n <= 1) return 1;
  return f(n - 1) + f(n - 1);
}
```

Mucha gente dice O(n²) porque "hay dos llamadas". Es incorrecto. Dibuja el árbol de llamadas para `n = 4`:

```
                 f(4)
          /               \
       f(3)               f(3)
     /     \            /     \
   f(2)    f(2)       f(2)    f(2)
   / \     / \        / \     / \
 f1  f1  f1  f1     f1  f1  f1  f1
```

Cada nivel tiene el doble de nodos que el anterior: 1, 2, 4, 8… Con profundidad `n`, el total es `2⁰ + 2¹ + … + 2ⁿ⁻¹ = 2ⁿ − 1`. El costo es **O(2ⁿ)**.

Regla general: **una función recursiva que hace `b` llamadas por invocación y tiene profundidad `d` suele costar O(bᵈ)**. Aquí `b = 2` y `d = n`.

¿Y el espacio? Aunque hay O(2ⁿ) llamadas en total, en un momento dado solo hay una rama activa en la pila, de profundidad `n`. El espacio es **O(n)**.

La base del exponente importa: O(2ⁿ) y O(8ⁿ) son órdenes completamente distintos (8ⁿ = 2³ⁿ). Las constantes se eliminan cuando multiplican, no cuando están en el exponente o son la base.

### Práctica guiada: analiza estos fragmentos

**1. Pares ordenados.**

```ts
for (let i = 0; i < n; i++)
  for (let j = i + 1; j < n; j++)
    visit(arr[i], arr[j]);
```

El bucle interno corre `n−1`, `n−2`, …, 1, 0 veces. La suma es `n(n−1)/2`, que es O(n²). Otra forma de verlo: visita cada par una vez, y hay unos `n²/2` pares.

**2. Bucle que divide.**

```ts
let count = 0;
for (let i = n; i > 0; i = Math.floor(i / 3)) count++;
```

Divide entre 3 en cada paso: O(log n). (La base del log no importa en Big O.)

**3. Recorrer un árbol binario balanceado sumando nodos.**

Una función recursiva con dos llamadas por nodo y profundidad log n. Con la regla de ramas: O(2^(log n)) = O(n). Tiene sentido: visita cada nodo una vez. La regla bᵈ funciona, pero hay que calcular bien la profundidad.

**4. ¿Es primo?**

```ts
function isPrime(n: number): boolean {
  for (let x = 2; x * x <= n; x++) if (n % x === 0) return false;
  return n >= 2;
}
```

El bucle corre hasta √n: O(√n). No todos los costos son potencias enteras de `n`.

**5. Factorial recursivo.** `fact(n) = n × fact(n−1)`: una llamada por nivel, profundidad `n` → O(n) tiempo y O(n) espacio.

**6. Generar todas las permutaciones de un string de longitud `n`.** Hay `n!` permutaciones y construir cada una cuesta O(n): O(n · n!) en total. Es un ejemplo de que a veces el costo está fijado por **el tamaño de la salida**: no puedes generar `n!` resultados en menos de `n!` pasos.

**7. Intersección de dos arrays con `includes`.**

```ts
function intersect(a: number[], b: number[]): number[] {
  return a.filter((x) => b.includes(x));
}
```

`filter` recorre `a` (tamaño `a`), y por cada elemento `includes` recorre `b` (tamaño `b`): **O(a · b)**. Si conviertes `b` en un `Set` primero, construirlo cuesta O(b) y cada consulta es O(1) en promedio: total **O(a + b)**. Esta transformación (de búsqueda lineal repetida a tabla hash) es una de las optimizaciones más frecuentes que vas a hacer.

**8. Un bucle que parece cuadrático pero no lo es.**

```ts
let j = 0;
for (let i = 0; i < n; i++) {
  while (j < n && arr[j] < arr[i] * 2) j++;
}
```

Hay un bucle dentro de otro, pero `j` **nunca retrocede**: en todo el programa avanza como mucho `n` veces. El trabajo total es O(n) del bucle externo + O(n) de todos los avances de `j` = **O(n)**. Este patrón se llama "dos punteros" y es la razón por la que no debes contar bucles anidados mecánicamente: pregúntate cuántas veces, **en total**, se ejecuta el cuerpo interno.

### Cómo explicar tu análisis en voz alta

En una entrevista o en una revisión de código no basta con decir "es O(n log n)". Conviene seguir un guion:

1. **Define las variables.** "Sea `n` la cantidad de usuarios y `m` la cantidad de pedidos por usuario."
2. **Recorre el código por bloques.** "Este primer bucle es O(n). Dentro, ordeno los pedidos de cada usuario: O(m log m) por usuario."
3. **Combina con suma o multiplicación.** "Como el ordenamiento está dentro del bucle, multiplico: O(n · m log m)."
4. **Simplifica solo lo que se puede.** "No hay términos dominados en la misma variable, así que queda así."
5. **Menciona el espacio.** "Uso O(m) extra para la copia ordenada; la reutilizo entre usuarios."
6. **Si aplica, distingue casos.** "En el peor caso…, en el esperado…"

Hablar así demuestra que entiendes el análisis, no que memorizaste un resultado. Y te protege de errores: al nombrar las variables evitas mezclar dimensiones, y al decir "dentro" o "después" eliges bien entre multiplicar y sumar.

### Del análisis a las decisiones

Saber analizar te permite responder preguntas reales:

| Pregunta | Cómo te ayuda Big O |
| --- | --- |
| ¿Este endpoint aguantará 100× más usuarios? | Si es O(n²) en los usuarios, el costo crece 10.000×. |
| ¿Vale la pena ordenar antes de buscar? | Ordenar es O(n log n); compensa si haces muchas búsquedas. |
| ¿Puedo cachear algo para no recalcular? | Si el árbol recursivo repite subproblemas, la memoización baja de O(2ⁿ) a O(n). |
| ¿Cuál es el límite teórico de mejora? | Si debes mirar todos los elementos, nada será mejor que O(n). |

La última fila anticipa una idea clave de entrevistas: el **mejor tiempo concebible** (lo verás en la sesión de técnicas de optimización).

### Hoja de referencia de costos en JavaScript

Muchas sorpresas de rendimiento vienen de no saber cuánto cuesta una operación de la librería estándar. Esta tabla resume las más usadas (costos típicos de los motores modernos):

| Operación | Costo | Comentario |
| --- | --- | --- |
| `arr[i]`, `arr.length` | O(1) | acceso directo por índice |
| `arr.push(x)`, `arr.pop()` | O(1) amortizado | trabajan al final |
| `arr.shift()`, `arr.unshift(x)` | O(n) | desplazan todos los elementos |
| `arr.includes(x)`, `arr.indexOf(x)` | O(n) | búsqueda lineal |
| `arr.slice()`, `[...arr]`, `arr.concat()` | O(n) | copian |
| `arr.splice(i, 1)` | O(n) | desplaza lo que queda detrás de `i` |
| `arr.sort()` | O(n log n) | más el costo de cada comparación |
| `set.has`, `set.add`, `map.get`, `map.set` | O(1) promedio | tabla hash |
| `str + str2` | O(longitud total) | los strings son inmutables |
| `Object.keys(obj)` | O(cantidad de claves) | crea un array nuevo |

Dos consecuencias prácticas. Usar `shift()` para implementar una cola convierte un algoritmo lineal en cuadrático (lo verás en la sesión de pilas y colas). Y construir un string grande con `+=` dentro de un bucle puede volverse caro; reunir las partes en un array y hacer `join("")` al final es la alternativa segura.

### Errores comunes

- **Contar "dos llamadas" como n².** En recursión, dibuja el árbol y usa ramas^profundidad.
- **Usar `n` para todo.** Si hay dos entradas, usa dos variables.
- **Simplificar términos de variables distintas.** `O(a + b)` no se reduce.
- **Olvidar la pila de recursión** en el espacio.
- **Confundir amortizado con promedio sobre entradas.** Amortizado es el promedio sobre una **secuencia de operaciones**, garantizado; no depende de la suerte con la entrada.
- **Ignorar el costo de operaciones "ocultas"**: `arr.includes`, `arr.indexOf`, `str.slice`, `arr.shift` son O(n) en JavaScript. Un `includes` dentro de un bucle convierte O(n) en O(n²).

## Conceptos clave

- **Complejidad temporal**: cómo crece el número de operaciones con el tamaño de la entrada.
- **Complejidad espacial**: cuánta memoria adicional se usa a la vez en el peor momento, incluida la pila de llamadas.
- **Eliminar constantes**: O(2n) es O(n), porque Big O describe la forma del crecimiento.
- **Términos no dominantes**: en una suma, solo queda el término que crece más rápido en la misma variable.
- **Suma vs multiplicación**: pasos secuenciales se suman; pasos anidados se multiplican.
- **Tiempo amortizado**: costo promedio por operación a lo largo de una secuencia, aunque algunas operaciones individuales sean caras.
- **Ramas elevadas a profundidad**: una recursión con `b` llamadas por nivel y profundidad `d` cuesta O(bᵈ).

## Preguntas de repaso

1. ¿Cuál es el costo de dos bucles anidados donde el externo recorre un array `A` y el interno un array `B` distinto? ¿Y si son dos bucles uno después del otro?
   R: Anidados, O(a · b), porque por cada elemento de A recorres todo B. Secuenciales, O(a + b), porque haces un recorrido y después el otro. Solo sería O(n²) si ambos arrays tuvieran el mismo tamaño n.
2. ¿Por qué `push` en un array dinámico es O(1) amortizado aunque a veces cueste O(n)?
   R: Porque cuando el array se llena se duplica su capacidad y se copian los elementos. Al insertar n elementos, las copias suman 1 + 2 + 4 + … + n/2 < n, así que el trabajo total es O(n) y el costo promedio por inserción es O(1). Si creciera sumando una cantidad fija en vez de duplicar, el total sería O(n²).
3. Una función recursiva hace dos llamadas a sí misma con `n - 1` hasta llegar a 1. ¿Cuál es su costo en tiempo y en espacio?
   R: Tiempo O(2ⁿ), porque el árbol de llamadas duplica los nodos en cada nivel y tiene profundidad n. Espacio O(n), porque en un momento dado solo hay una rama activa en la pila, de profundidad n.
4. ¿Se puede simplificar O(n² + m)? Justifica.
   R: No. n y m son variables independientes y no sabes cuál domina; m podría ser mucho mayor que n². Solo se eliminan términos no dominantes de la misma variable.
5. ¿Por qué O(1) no significa "rápido"?
   R: Porque O(1) solo dice que el costo no crece con el tamaño de la entrada, pero la constante puede ser grande. Como en la analogía del avión, enviar un disco por avión es O(1) respecto al tamaño del archivo pero tarda horas; para archivos pequeños, internet (O(s)) es más rápido.
6. ¿Qué costo tiene un bucle `for (let i = 1; i < n; i *= 2)` y por qué?
   R: O(log n), porque i se duplica en cada iteración y llega a n después de unos log₂ n pasos. En general, cuando una variable se multiplica o divide por una constante en cada paso, aparece un logaritmo.

## Ejercicio

En `big-o-lab.ts`, escribe seis funciones pequeñas en TypeScript, una por cada orden: O(1), O(log n), O(n), O(n log n), O(n²) y O(2ⁿ). Cada una debe contar sus operaciones en una variable y devolver ese número. Ejecuta cada función con `n = 1, 2, 4, 8, 16, 32` (la exponencial solo hasta 20) e imprime una tabla.

Criterio de terminado: la tabla muestra que al duplicar `n` la columna O(n) se duplica, O(n²) se cuadruplica, O(log n) suma 1 y O(2ⁿ) se eleva al cuadrado; junto a cada función hay un comentario que justifica su Big O con las reglas de esta sesión.

## Explícalo con tus palabras

Explica a un compañero por qué una función recursiva con dos llamadas es O(2ⁿ) y no O(n²), dibujando el árbol de llamadas en papel.
