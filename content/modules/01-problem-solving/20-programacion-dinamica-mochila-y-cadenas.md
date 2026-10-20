---
title: Programación dinámica II, mochila y subsecuencias
kind: lesson
hours: 2
sources: Grokking Algorithms, cap. 9 "Dynamic Programming", The knapsack problem, Knapsack FAQ y Longest common substring/subsequence (pp. 180–205) | Cracking the Coding Interview, cap. 8 (pp. 142–148)
links: Visualizador de DP de la mochila | https://visualgo.net/en/recursion
---

## Objetivo

Resolver problemas de DP en dos dimensiones: la mochila 0/1 con su tabla, la subcadena común más larga, la subsecuencia común más larga y la distancia de edición; saber llenar, leer e interpretar la tabla y reconstruir la solución.

## Estudio

### Volver a la mochila

En la sesión de greedy viste que la mochila 0/1 no se resuelve eligiendo "el más valioso" ni "el de mejor valor por kilo". La fuerza bruta prueba todos los subconjuntos: O(2ⁿ). Con 4 objetos son 16 combinaciones; con 32 objetos, más de 4.000 millones. Necesitamos algo mejor, y la clave está en la observación de siempre: **subproblemas más pequeños que se repiten**.

Ejemplo de trabajo (propio). Mochila de capacidad **4 kg** y estos objetos:

| Objeto | Peso | Valor |
| --- | --- | --- |
| Cámara | 1 kg | 1.500 |
| Proyector | 4 kg | 3.000 |
| Portátil | 3 kg | 2.000 |

### La idea de la tabla

Construimos una tabla donde:

- Cada **fila** corresponde a "puedo usar los objetos hasta esta fila".
- Cada **columna** es una capacidad de mochila más pequeña: 1, 2, 3, 4 kg.
- La celda `[i][w]` contiene el **mayor valor** posible usando los primeros `i` objetos con capacidad `w`.

¿Por qué capacidades pequeñas? Porque al decidir si meter un objeto de 3 kg en una mochila de 4 kg, la pregunta que surge es "¿qué es lo mejor que puedo hacer con el kilo que sobra?", que es el mismo problema con capacidad 1. Los subproblemas son **mochilas más pequeñas con menos objetos**.

### La recurrencia

Para la celda `[i][w]`, con el objeto `i` de peso `p` y valor `v`, hay dos opciones:

1. **No tomarlo:** el mejor valor es el de la fila anterior, misma capacidad: `[i − 1][w]`.
2. **Tomarlo** (si cabe, `p ≤ w`): su valor más lo mejor que puedo hacer con el espacio que sobra usando los objetos anteriores: `v + [i − 1][w − p]`.

```
celda[i][w] = máx( celda[i−1][w],  v_i + celda[i−1][w − p_i] )
```

Casos base: sin objetos (fila 0) o sin capacidad (columna 0), el valor es 0.

### Llenado paso a paso

**Fila Cámara (1 kg, 1.500).** Con cualquier capacidad de 1 a 4, la cámara cabe y es lo único disponible:

| | 1 | 2 | 3 | 4 |
| --- | --- | --- | --- | --- |
| Cámara | 1.500 | 1.500 | 1.500 | 1.500 |

**Fila Proyector (4 kg, 3.000).** Para capacidades 1, 2 y 3 no cabe: se copia la fila anterior. Para 4: máx(no tomarlo = 1.500, tomarlo = 3.000 + celda[cámara][0] = 3.000) = 3.000.

| | 1 | 2 | 3 | 4 |
| --- | --- | --- | --- | --- |
| Cámara | 1.500 | 1.500 | 1.500 | 1.500 |
| Proyector | 1.500 | 1.500 | 1.500 | 3.000 |

**Fila Portátil (3 kg, 2.000).**

- Capacidad 1 y 2: no cabe → 1.500.
- Capacidad 3: máx(1.500, 2.000 + celda[proyector][0] = 2.000) = 2.000.
- Capacidad 4: máx(3.000, 2.000 + celda[proyector][1] = 2.000 + 1.500 = 3.500) = **3.500**.

| | 1 | 2 | 3 | 4 |
| --- | --- | --- | --- | --- |
| Cámara | 1.500 | 1.500 | 1.500 | 1.500 |
| Proyector | 1.500 | 1.500 | 1.500 | 3.000 |
| Portátil | 1.500 | 1.500 | 2.000 | **3.500** |

La respuesta está en la última celda: **3.500** (portátil + cámara, 4 kg). Fíjate en el momento clave: en la celda `[portátil][4]`, al tomar el portátil sobra 1 kg, y la celda `[proyector][1]` ya sabía que lo mejor para 1 kg es la cámara. Eso es reutilizar un subproblema.

### Implementación

```ts
interface Item { name: string; weight: number; value: number }

export function knapsack(items: Item[], capacity: number): { value: number; chosen: string[] } {
  const n = items.length;
  const table = Array.from({ length: n + 1 }, () => new Array<number>(capacity + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    const { weight, value } = items[i - 1];
    for (let w = 1; w <= capacity; w++) {
      table[i][w] = table[i - 1][w];                              // no tomarlo
      if (weight <= w) {
        table[i][w] = Math.max(table[i][w], value + table[i - 1][w - weight]); // tomarlo
      }
    }
  }

  // Reconstrucción: si el valor cambió respecto a la fila anterior, el objeto se tomó.
  const chosen: string[] = [];
  let w = capacity;
  for (let i = n; i > 0; i--) {
    if (table[i][w] !== table[i - 1][w]) {
      chosen.push(items[i - 1].name);
      w -= items[i - 1].weight;
    }
  }
  return { value: table[n][capacity], chosen: chosen.reverse() };
}
```

**Costo:** O(n × W) tiempo y espacio, donde `W` es la capacidad. Espacio reducible a O(W) con una sola fila recorrida **de derecha a izquierda** (para no usar en la misma fila un valor ya actualizado, lo que equivaldría a tomar el mismo objeto dos veces).

Ojo: O(n × W) depende del **valor numérico** de la capacidad, no solo del número de objetos. Con capacidad un millón y pesos en gramos, la tabla tiene un millón de columnas por objeto. Por eso la mochila sigue siendo NP-completa aunque tenga esta DP: el algoritmo es "pseudo-polinómico".

### Preguntas frecuentes sobre la tabla

**¿Qué pasa si agrego un objeto?** No hay que recalcular nada: agregas una fila nueva al final y la llenas usando la fila anterior. Si agregas, por ejemplo, unos auriculares de 1 kg y 2.000, la última celda pasa a ser máx(3.500, 2.000 + celda[portátil][3] = 2.000 + 2.000) = 4.000: auriculares + portátil.

**¿Importa el orden de las filas?** No para el valor final: el óptimo es el mismo. Las celdas intermedias cambian, pero la última no.

**¿Se puede llenar por columnas en lugar de por filas?** En este problema sí, porque cada celda solo depende de la fila anterior. En otros problemas el orden sí importa; siempre verifica que las dependencias estén calculadas.

**¿La granularidad de las columnas importa?** Sí. Las columnas deben avanzar según el máximo común divisor de los pesos. Si un objeto pesa 0,5 kg, necesitas columnas de 0,5 kg (o trabajar en gramos).

**¿Y si los objetos se pueden fraccionar?** Entonces no es esta DP: el greedy por valor por kilo es óptimo.

**¿Y si los objetos dependen entre sí?** Por ejemplo, "si llevas la cámara, conviene llevar su batería, que ocupa menos espacio juntas". La DP asume que los subproblemas son **independientes**: el valor de una combinación es la suma de valores individuales. Si los objetos interactúan, la recurrencia deja de ser válida y hay que modelar el problema de otra forma (por ejemplo, tratar "cámara + batería" como un objeto compuesto).

**¿Puede la solución no llenar la mochila?** Sí. Si ninguna combinación encaja exacta, el óptimo puede dejar espacio libre.

### Otra aplicación del mismo molde: planificar un viaje

Tienes 2 días libres en una ciudad y una lista de actividades, cada una con una duración (en medios días) y una puntuación de cuánto te interesa. Es exactamente una mochila: la capacidad es el tiempo disponible (4 medios días), el peso es la duración y el valor es la puntuación. Muchos problemas de "presupuesto limitado y opciones con costo y beneficio" (asignar sprints a features, elegir anuncios con un presupuesto, seleccionar inversiones) son mochilas disfrazadas.

### Variante: copias ilimitadas de cada objeto

Si en lugar de objetos únicos tuvieras **tipos** de objetos de los que puedes llevar tantas copias como quieras (por ejemplo, cajas de distintos productos en un camión), la recurrencia cambia en un solo detalle: al tomar el objeto, el resto no se mira en la fila **anterior**, sino en la **misma** fila, porque el objeto sigue disponible.

```
0/1:        celda[i][w] = máx(celda[i−1][w], v + celda[i−1][w − p])
ilimitada:  celda[i][w] = máx(celda[i−1][w], v + celda[i][w − p])
```

Con una sola fila, eso equivale a recorrer las capacidades **de menor a mayor** (exactamente lo que en la 0/1 había que evitar):

```ts
function unboundedKnapsack(items: Item[], capacity: number): number {
  const best = new Array<number>(capacity + 1).fill(0);
  for (const { weight, value } of items) {
    for (let w = weight; w <= capacity; w++) {    // de menor a mayor: permite repetir
      best[w] = Math.max(best[w], value + best[w - weight]);
    }
  }
  return best[capacity];
}
```

Observa la conexión: el problema de las monedas de la sesión anterior **es** una mochila ilimitada (cada moneda se puede usar muchas veces), con "minimizar cantidad" en lugar de "maximizar valor". Y el problema de "¿se puede formar la suma?" es una mochila 0/1 con booleanos. Reconocer que varios problemas comparten el mismo molde es una de las habilidades más rentables en DP: una vez que tienes el molde, cada problema nuevo es cuestión de decidir qué guarda la celda, cómo se combina y en qué sentido se recorre.

| Problema | Molde | Sentido con una fila |
| --- | --- | --- |
| Mochila 0/1 | tomar o no, cada objeto una vez | capacidad de mayor a menor |
| Suma de subconjunto | 0/1 con booleanos | de mayor a menor |
| Mochila ilimitada | tomar o no, con repetición | de menor a mayor |
| Monedas mínimas | ilimitada, minimizar | de menor a mayor |

### Subcadena común más larga

Cambiemos a strings. Un usuario escribe "hish" en un buscador. ¿Quería decir "fish" o "vista"? Una medida de parecido es la **subcadena común más larga**: el tramo **contiguo** más largo que aparece en ambas palabras.

1. **Estado:** `cell[i][j]` = longitud de la subcadena común que **termina** en la letra `i` de la primera palabra y en la letra `j` de la segunda.
2. **Recurrencia:** si las letras coinciden, `cell[i][j] = cell[i − 1][j − 1] + 1` (alargas la subcadena que venía en diagonal). Si no coinciden, `cell[i][j] = 0` (la subcadena contigua se corta).
3. **Respuesta:** el **máximo** de toda la tabla (no necesariamente la última celda).

```
        f  i  s  h
    h   0  0  0  1
    i   0  1  0  0
    s   0  0  2  0
    h   0  0  0  3      → "ish", longitud 3

        v  i  s  t  a
    h   0  0  0  0  0
    i   0  1  0  0  0
    s   0  0  2  0  0
    h   0  0  0  0  0   → "is", longitud 2
```

"hish" se parece más a "fish" (3) que a "vista" (2).

### Subsecuencia común más larga (LCS)

Ahora el usuario escribe "fosh". ¿"fish" o "fort"? Con subcadena: "fosh" y "fish" comparten "sh" (2); "fosh" y "fort" comparten "fo" (2). Empate. Pero intuitivamente "fosh" se parece más a "fish": comparten **f, s, h** en el mismo orden, aunque no contiguas. Eso es una **subsecuencia**: letras en el mismo orden, no necesariamente juntas.

1. **Estado:** `cell[i][j]` = longitud de la LCS entre los primeros `i` caracteres de `a` y los primeros `j` de `b`.
2. **Recurrencia:**
   - Si `a[i] === b[j]`: `cell[i][j] = cell[i − 1][j − 1] + 1`.
   - Si no: `cell[i][j] = máx(cell[i − 1][j], cell[i][j − 1])` (descartas el último carácter de una de las dos y te quedas con lo mejor).
3. **Respuesta:** la última celda.

```ts
export function lcsLength(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}
// lcsLength("fosh", "fish") = 3 ; lcsLength("fosh", "fort") = 2
```

La diferencia entre ambas recurrencias está en una sola línea, el caso "no coinciden": la subcadena se **reinicia a 0** porque exige contigüidad; la subsecuencia **hereda** el mejor valor vecino porque puede saltar caracteres.

Aplicaciones reales de la LCS: `git diff` y las herramientas de comparación de archivos (las líneas que no cambiaron son la LCS de las dos versiones), la comparación de secuencias de ADN, la detección de plagio y los correctores ortográficos.

### Distancia de edición

Una medida muy usada para "¿cuánto se parecen dos strings?" es la **distancia de Levenshtein**: el mínimo número de operaciones (insertar, borrar o reemplazar un carácter) para transformar uno en otro. "gato" → "pato" es 1 (reemplazo); "casa" → "cosas" es 2.

1. **Estado:** `d[i][j]` = distancia entre los primeros `i` caracteres de `a` y los primeros `j` de `b`.
2. **Recurrencia:** si `a[i] === b[j]`, `d[i][j] = d[i − 1][j − 1]`. Si no, `1 + mín(d[i − 1][j] (borrar), d[i][j − 1] (insertar), d[i − 1][j − 1] (reemplazar))`.
3. **Casos base:** `d[i][0] = i` (borrar todo) y `d[0][j] = j` (insertar todo).

Es la misma forma de tabla que la LCS, con otra recurrencia. Una vez que dominas el molde "dos strings → tabla de (i, j) → mirar arriba, izquierda y diagonal", resuelves una familia entera de problemas.

### El molde general de las DP sobre dos secuencias

```
estado:       dp[i][j] sobre prefijos a[0..i) y b[0..j)
dependencias: dp[i-1][j-1] (diagonal), dp[i-1][j] (arriba), dp[i][j-1] (izquierda)
orden:        filas de arriba abajo, columnas de izquierda a derecha
costo:        O(|a| × |b|) tiempo; espacio reducible a dos filas
```

Para diseñar una nueva: decide qué significa la celda, qué pasa cuando los caracteres coinciden, qué pasa cuando no, y dónde está la respuesta (última celda o máximo de la tabla).

### Errores comunes

- **Confundir subcadena con subsecuencia**: la recurrencia del caso "no coinciden" es distinta (0 frente a máximo de vecinos).
- **Buscar la respuesta en la celda equivocada**: en la subcadena común es el máximo de la tabla.
- **Índices desplazados**: la tabla tiene una fila y una columna extra para el caso vacío, así que la letra `i` es `a[i − 1]`.
- **Reducir a una fila recorriendo en el sentido equivocado** en la mochila 0/1: permite tomar un objeto varias veces.
- **Aplicar la DP de la mochila cuando los objetos interactúan**: la independencia de subproblemas es un supuesto.
- **Olvidar que O(n × W) depende del valor de W**: con capacidades enormes la tabla no cabe en memoria.

### Para llevarte

Las DP en dos dimensiones parecen intimidantes hasta que ves que siempre se responden las mismas preguntas: qué significa la celda, de qué celdas depende, en qué orden se llena y dónde está la respuesta. La mochila te enseñó la decisión "tomar o no tomar" con capacidad limitada; las cadenas, la comparación de prefijos mirando arriba, a la izquierda y en diagonal. Con esos dos moldes y la reconstrucción hacia atrás puedes atacar la mayoría de los problemas de DP que encontrarás en entrevistas y en herramientas reales como los comparadores de texto. Un consejo práctico para estudiar: llena a mano al menos una tabla de cada tipo (mochila, subcadena, subsecuencia y distancia de edición) con ejemplos pequeños propios. Hacerlo una vez en papel fija la recurrencia mejor que leerla diez veces, y te deja listo para reconocer el molde cuando aparezca disfrazado. Empieza siempre por la recurrencia escrita en una línea.

## Conceptos clave

- **Mochila 0/1**: elegir objetos indivisibles con peso y valor para maximizar el valor sin superar la capacidad.
- **Tabla de DP en dos dimensiones**: matriz cuyas celdas son subproblemas indexados por dos parámetros.
- **Reconstrucción**: recorrido de la tabla desde la respuesta hacia atrás para recuperar qué decisiones se tomaron.
- **Pseudo-polinómico**: algoritmo polinómico en el valor numérico de la entrada (como la capacidad), no en su tamaño en bits.
- **Subcadena común más larga**: tramo contiguo más largo presente en dos strings.
- **Subsecuencia común más larga (LCS)**: secuencia más larga de caracteres en el mismo orden, no necesariamente contiguos, presente en ambos strings.
- **Distancia de edición (Levenshtein)**: mínimo de inserciones, borrados y reemplazos para transformar un string en otro.

## Preguntas de repaso

1. ¿Qué representa cada celda de la tabla de la mochila y cuál es su recurrencia?
   R: La celda [i][w] es el mayor valor alcanzable usando los primeros i objetos con una mochila de capacidad w. Su valor es el máximo entre no tomar el objeto i (celda [i−1][w]) y tomarlo si cabe (su valor más la celda [i−1][w − peso]).
2. ¿Por qué la DP de la mochila no contradice que el problema sea NP-completo?
   R: Porque su costo O(n × W) depende del valor numérico de la capacidad W, no del tamaño de la entrada en bits. Si W es enorme (por ejemplo, pesos en gramos con capacidades de millones), la tabla es inmanejable; es un algoritmo pseudo-polinómico.
3. ¿Qué diferencia hay entre la recurrencia de la subcadena común más larga y la de la subsecuencia común más larga?
   R: Cuando los caracteres coinciden, ambas suman 1 a la diagonal. Cuando no coinciden, la subcadena pone 0 porque exige contigüidad y la secuencia se corta, mientras que la subsecuencia toma el máximo entre la celda de arriba y la de la izquierda porque puede saltar caracteres. Además, la respuesta de la subcadena es el máximo de la tabla y la de la subsecuencia es la última celda.
4. ¿Cómo reconstruyes qué objetos se eligieron en la mochila?
   R: Partiendo de la última celda, se recorre fila por fila hacia arriba: si el valor de la celda difiere del de la fila anterior con la misma capacidad, el objeto de esa fila se tomó, y se resta su peso a la capacidad antes de seguir.
5. ¿Qué pasa con la tabla de la mochila si agregas un objeto nuevo?
   R: No hay que recalcular lo existente: se agrega una fila al final y se llena usando la fila anterior. La nueva última celda da el nuevo óptimo.
6. ¿Para qué sirve la LCS en herramientas como `git diff`?
   R: Las líneas comunes a dos versiones de un archivo, en el mismo orden, forman su subsecuencia común más larga; todo lo que no está en ella son las líneas agregadas o borradas que la herramienta muestra.

## Ejercicio

Implementa en TypeScript `knapsack` con reconstrucción y una versión optimizada a una sola fila; `longestCommonSubstring(a, b)` que devuelva el texto de la subcadena; `lcs(a, b)` que devuelva la subsecuencia (no solo su longitud) reconstruyendo desde la tabla; y `editDistance(a, b)`. Con `editDistance`, construye `suggest(word, dictionary)` que devuelva las 3 palabras más cercanas.

Criterio de terminado: el ejemplo de esta sesión devuelve 3.500 con `[Cámara, Portátil]` y 4.000 al agregar los auriculares; tests comparan la mochila con una fuerza bruta sobre 100 instancias aleatorias de hasta 12 objetos; `lcs("fosh", "fish")` devuelve `"fsh"`; `editDistance("casa", "cosas")` devuelve 2; `suggest("ordenador", [...])` funciona con un diccionario de al menos 50 palabras.

## Explícalo con tus palabras

Explica con la tabla de la mochila, celda por celda, por qué la DP encuentra la combinación portátil + cámara y el greedy no.
