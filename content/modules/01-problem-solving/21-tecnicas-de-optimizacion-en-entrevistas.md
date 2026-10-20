---
title: Técnicas para optimizar soluciones en entrevistas
kind: lesson
hours: 2
sources: Cracking the Coding Interview, cap. VII "Technical Questions", de How to Prepare a Don't Give Up (pp. 72–93)
links: NeetCode, problemas organizados por patrón | https://neetcode.io/roadmap
---

## Objetivo

Tener un repertorio de técnicas concretas para pasar de una solución de fuerza bruta a una óptima (BUD, hazlo tú mismo, simplificar y generalizar, caso base y construir, lluvia de estructuras de datos y mejor tiempo concebible) y saber qué evalúa un entrevistador al mirar tu código.

## Estudio

### Qué se evalúa realmente

En una entrevista técnica de algoritmos no se mide si te sabes la respuesta de memoria. Se mide cómo **piensas**: si analizas el problema, si propones soluciones razonables, si las mejoras, si escribes código limpio y si verificas tu trabajo. Por eso un candidato que razona en voz alta, empieza por fuerza bruta y llega a una buena solución con alguna pista suele quedar mejor que uno que recita una solución perfecta sin poder explicarla.

Lo que necesitas saber es más acotado de lo que parece:

| Estructuras de datos | Algoritmos | Conceptos |
| --- | --- | --- |
| Listas enlazadas | Búsqueda en anchura (BFS) | Manipulación de bits |
| Árboles, tries, grafos | Búsqueda en profundidad (DFS) | Memoria (stack vs heap) |
| Pilas y colas | Búsqueda binaria | Recursión |
| Heaps | Merge sort y quicksort | Programación dinámica |
| Arrays dinámicos | | Big O (tiempo y espacio) |
| Tablas hash | | |

Casi todo esto ya lo estudiaste en este módulo. Para cada elemento deberías poder: implementarlo desde cero, usarlo para resolver problemas y conocer su costo.

Un dato práctico que ayuda a estimar: las potencias de 2. `2¹⁰ ≈ mil` (1 KB), `2²⁰ ≈ un millón` (1 MB), `2³⁰ ≈ mil millones` (1 GB), `2³² ≈ 4 mil millones`. Si te dicen "hay mil millones de elementos", ya sabes que log₂ de eso es unos 30 y que un `boolean` por elemento ocupa del orden de 1 GB (o 125 MB si lo empaquetas en bits).

### El proceso, en resumen

En la sesión 01 viste los siete pasos: escuchar, ejemplo, fuerza bruta, optimizar, recorrer, implementar y probar. Esta sesión se concentra en el paso más difícil: **optimizar**. Las técnicas que siguen son herramientas que puedes aplicar una tras otra cuando te quedas atascado.

### Técnica 1: busca BUD

BUD son las siglas en inglés de tres cosas que buscar en tu solución actual:

- **B**ottlenecks (cuellos de botella)
- **U**nnecessary work (trabajo innecesario)
- **D**uplicated work (trabajo duplicado)

**Cuello de botella.** Es la parte del algoritmo que domina el costo total. Si tu solución ordena (O(n log n)) y luego hace un recorrido (O(n)), mejorar el recorrido no sirve: el cuello de botella es el ordenamiento. Hay dos tipos frecuentes: un paso único que es lento (como ordenar), o un paso que se repite muchas veces (como buscar dentro de un bucle).

*Ejemplo:* "Cuenta cuántos pares de números de un array (sin duplicados) tienen diferencia exactamente `k`." Fuerza bruta: todos los pares, O(n²). Mejora: ordenar y, para cada número `x`, buscar `x + k` con búsqueda binaria: O(n log n), donde el cuello de botella pasa a ser el ordenamiento más las búsquedas. Mejora final: meter todos los números en un `Set` y, para cada `x`, preguntar si `x + k` está: O(n). Atacaste el cuello de botella (la búsqueda) con la estructura adecuada.

**Trabajo innecesario.** Pasos que no aportan nada al resultado. *Ejemplo:* encontrar todas las cuádruplas de enteros entre 1 y 1.000 que cumplen `a² + b² = c² + d²`. Fuerza bruta: cuatro bucles anidados, O(n⁴). Pero cuando ya fijaste `a`, `b` y `c`, el valor de `d` está **determinado** (es la raíz cuadrada de `a² + b² − c²`, si es entera); no hace falta un cuarto bucle que lo pruebe todo. Calcularlo directamente baja a O(n³). Además, si encontraste la respuesta, sal del bucle (`break`).

**Trabajo duplicado.** Calcular lo mismo varias veces. En el ejemplo anterior, los pares `(c, d)` que dan una suma son los mismos pares `(a, b)` que dan esa suma. Puedes calcular **una vez** todas las sumas `a² + b²` y guardarlas en un `Map<suma, pares[]>`: O(n²). Luego, cada suma con varios pares genera las soluciones combinándolos. De O(n⁴) a O(n²) eliminando trabajo innecesario y duplicado.

```ts
function squareSumPairs(n: number): Array<[number, number, number, number]> {
  const bySum = new Map<number, Array<[number, number]>>();
  for (let a = 1; a <= n; a++)
    for (let b = 1; b <= n; b++) {
      const s = a ** 2 + b ** 2;
      const list = bySum.get(s) ?? [];
      list.push([a, b]);
      bySum.set(s, list);
    }
  const result: Array<[number, number, number, number]> = [];
  for (const pairs of bySum.values())
    for (const [a, b] of pairs) for (const [c, d] of pairs) result.push([a, b, c, d]);
  return result;
}
```

### Técnica 2: hazlo tú mismo (DIY)

Muchas veces tu cerebro ya sabe resolver el problema de forma eficiente, aunque no sepas escribir el algoritmo. **Resuelve un ejemplo grande a mano, sin pensar en código, y luego analiza qué hiciste.**

*Ejemplo:* "Dado un string corto `s` y uno largo `b`, encuentra todas las posiciones de `b` donde aparece una **permutación** de `s`." Con `s = "abbc"` y un `b` de 40 caracteres, si lo haces a mano no generas las 12 permutaciones de "abbc" para buscarlas una por una. Lo que haces es deslizar la vista por `b` mirando tramos de 4 letras y comprobando si tienen exactamente una `a`, dos `b` y una `c`. Eso es una **ventana deslizante con histograma**: mantienes las cuentas de la ventana y, al deslizarla, sumas la letra que entra y restas la que sale. O(|b|) en lugar de O(|s|! × |b|).

El "algoritmo" que usaste a mano era bueno; solo había que traducirlo. Para que funcione, el ejemplo debe ser **grande** y **realista**: con un ejemplo pequeño, tu cerebro usa fuerza bruta sin darse cuenta.

### Técnica 3: simplificar y generalizar

**Simplifica** una restricción del problema (como hacíamos con "reducir" en la sesión 01), resuelve esa versión y luego **generaliza** la solución al problema original.

*Ejemplo:* "¿Se puede escribir una nota de rescate recortando letras de una revista?" (es decir, ¿cada letra de la nota está disponible suficientes veces en la revista?). Simplifica: en lugar de palabras, piensa en caracteres sueltos. Cuentas las letras de la revista en un histograma y restas las de la nota; si algún contador queda negativo, no se puede. Generaliza: si la nota se forma recortando **palabras** completas, usas el mismo enfoque con un `Map` de palabras en lugar de un array de 26 letras.

### Técnica 4: caso base y construir

Resuelve el problema para el caso más pequeño (`n = 1`), luego para `n = 2` usando la solución anterior, luego para `n = 3`… y busca el patrón para construir el caso `n` a partir de `n − 1`. Conduce naturalmente a soluciones recursivas o de DP.

*Ejemplo:* "Genera todas las permutaciones de un string con caracteres únicos." Para `"a"`: `{a}`. Para `"ab"`: toma las permutaciones de `"a"` y **inserta `b` en cada posición posible**: `ba`, `ab`. Para `"abc"`: toma cada permutación de `"ab"` e inserta `c` en cada posición: de `ab` salen `cab`, `acb`, `abc`; de `ba` salen `cba`, `bca`, `bac`. El patrón: permutaciones(n) = insertar el carácter n en todas las posiciones de cada permutación de los primeros n − 1. Ya tienes un algoritmo recursivo.

### Técnica 5: lluvia de estructuras de datos

Recorre mentalmente la lista de estructuras y pregúntate, para cada una, si resuelve tu problema: ¿un array?, ¿una tabla hash?, ¿un heap?, ¿un árbol?, ¿una pila?, ¿un grafo? A veces la estructura correcta vuelve el problema trivial.

*Ejemplo:* "Se generan números aleatorios uno por uno; mantén la **mediana** actualizada después de cada número." ¿Lista enlazada? Insertar en orden es O(n). ¿Array ordenado? Insertar es O(n). ¿Árbol balanceado? Funciona pero es complejo. ¿Heap? Un solo heap da el mínimo o el máximo, no la mediana… pero **dos** heaps sí: un max-heap con la mitad menor y un min-heap con la mitad mayor, balanceados en tamaño. La mediana está en las raíces. O(log n) por número. La lluvia de ideas hizo aparecer la estructura que no era obvia.

### Técnica 6: el mejor tiempo concebible (BCR)

El **mejor tiempo concebible** (*best conceivable runtime*) es el menor costo que **cualquier** solución podría tener, por la naturaleza del problema. Si tienes que leer toda la entrada para responder, no puedes bajar de O(n). Si la salida tiene `n²` elementos, no puedes bajar de O(n²).

*Ejemplo:* "Encuentra los elementos comunes de dos arrays ordenados de tamaños `a` y `b`." Hay que mirar cada elemento al menos una vez: BCR = O(a + b). Una primera solución con búsqueda binaria de cada elemento del primero en el segundo es O(a log b). No alcanza el BCR. Con dos punteros que avanzan en ambos arrays (como en la mezcla de merge sort) se llega a O(a + b): ya es óptimo y **puedes dejar de optimizar el tiempo**.

El BCR sirve para dos cosas:

1. **Saber cuándo parar.** Si tu solución ya alcanza el BCR, no busques un algoritmo más rápido; a lo sumo optimiza memoria.
2. **Dar pistas.** Si el BCR es O(n) y tu solución es O(n log n), pregúntate qué parte del log n sobra. Y si ya tienes un paso O(n) obligatorio, cualquier otro paso O(n) es "gratis": por ejemplo, puedes preprocesar los datos en un `Map` sin empeorar el costo total.

Cuidado: el BCR no dice que exista un algoritmo con ese costo; dice que no existe uno mejor.

### Un ejemplo de principio a fin

**Problema (propio):** un array contiene los números del 1 al `n` excepto uno, en desorden. Por ejemplo, `[4, 1, 6, 2, 5]` con `n = 6`. Encuentra el que falta.

**Escuchar:** los valores son distintos, van de 1 a `n` y falta exactamente uno. Cada dato importa.

**Fuerza bruta:** para cada `v` de 1 a `n`, recorrer el array buscándolo. O(n²) tiempo, O(1) espacio.

**BCR:** tienes que mirar cada elemento al menos una vez (el que falta podría ser cualquiera), así que el BCR es O(n).

**BUD sobre la fuerza bruta:** el cuello de botella es la búsqueda lineal repetida. Lluvia de estructuras: un `Set` con todos los valores hace cada búsqueda O(1). Resultado: O(n) tiempo, alcanzamos el BCR. Pero usamos O(n) de memoria.

**¿Se puede mejorar la memoria?** El tiempo ya es óptimo, así que la conversación pasa al espacio. Aquí ayuda "usar toda la información": sabemos **exactamente** qué números deberían estar. Su suma es `n(n + 1)/2`. Si restamos la suma real, obtenemos el que falta.

```ts
function missingNumber(values: number[]): number {
  const n = values.length + 1;
  const expected = (n * (n + 1)) / 2;
  let actual = 0;
  for (const v of values) actual += v;
  return expected - actual;
}
// missingNumber([4, 1, 6, 2, 5]) → 21 − 18 = 3
```

O(n) tiempo y O(1) espacio. Un detalle para mencionar en voz alta: con `n` gigantesco, la suma podría superar el rango de enteros seguros; la alternativa es combinar los números con XOR (`a ^ a = 0`), que nunca desborda. Mencionarlo demuestra que piensas en casos borde aunque no los implementes.

**Recorrer y probar:** con el ejemplo, `n = 6`, esperado 21, real 18, devuelve 3. Casos borde: falta el 1 (`[2]` → 1), falta el último (`[1]` → 2), array vacío (`[]` → falta el 1).

Observa cómo cada técnica tuvo su momento: fuerza bruta para empezar, BCR para saber hacia dónde ir, BUD y lluvia de estructuras para alcanzar el BCR en tiempo, y la información no usada del enunciado ("van de 1 a n") para optimizar el espacio. Ese es el ritmo que buscas en una entrevista.

### Cuando te equivocas o ya conoces el problema

- **Una respuesta incorrecta no es el fin.** Los entrevistadores evalúan comparando con otros candidatos en el mismo problema. Si el problema es difícil para todos, llegar lejos con buen razonamiento cuenta mucho. Si te dan una pista, tómala y sigue.
- **Si ya viste el problema, dilo.** Es lo honesto y además los entrevistadores suelen notarlo; ocultarlo puede verse peor que cualquier error.

### Cómo se ve el buen código

En la entrevista y en el trabajo, el código se evalúa por cinco cualidades:

1. **Correcto:** funciona para todas las entradas válidas, incluidos los casos borde.
2. **Eficiente:** en tiempo y memoria, tanto asintóticamente (Big O) como en la práctica.
3. **Simple:** si se puede hacer en 10 líneas, no lo hagas en 100.
4. **Legible:** otro desarrollador lo entiende; nombres claros, comentarios donde la lógica no es obvia.
5. **Mantenible:** se adapta a cambios razonables.

Prácticas concretas que ayudan:

- **Usa estructuras de datos con generosidad.** Si necesitas representar un polinomio, una clase `Term { coefficient, exponent }` es mejor que dos arrays paralelos.
- **Reutiliza código con criterio.** Si dos funciones comparten lógica (por ejemplo, convertir binario y hexadecimal a decimal), extrae una función general que reciba la base.
- **Modulariza.** Separa en funciones con nombre las partes que se entienden solas; el código principal queda como un resumen del algoritmo.
- **Sé flexible y robusto,** dentro de lo razonable: si resolver para `n × n` es tan fácil como para `3 × 3`, generaliza.
- **Valida la entrada.** En la entrevista basta con un `if` o con decir en voz alta qué asumes y comentarlo con un `// TODO: validar`.

```ts
// Menos legible
function f(a: number[], k: number) { const s = new Set(a); let c = 0;
  for (const x of a) if (s.has(x + k)) c++; return c; }

// Más legible: mismo algoritmo
function countPairsWithDifference(values: number[], difference: number): number {
  const present = new Set(values);
  let pairs = 0;
  for (const value of values) {
    if (present.has(value + difference)) pairs++;
  }
  return pairs;
}
```

### No te rindas

Los problemas de entrevista están diseñados para ser difíciles. Muchas preguntas buscan ver cómo reaccionas ante algo que no sabes resolver de inmediato. Abordar el problema con entusiasmo, decir en voz alta lo que piensas y aplicar las técnicas una por una es exactamente lo que se espera. Quedarte en silencio o abandonar es lo único que seguro sale mal.

### Mapa de técnicas: qué probar cuando estás atascado

```
¿Tengo fuerza bruta?          no → resuelve un ejemplo grande a mano (DIY)
          │ sí
¿Conozco su costo y el BCR?   no → calcúlalos
          │ sí
¿Coinciden?                   sí → listo en tiempo; optimiza memoria o termina
          │ no
BUD: ¿cuello de botella, trabajo innecesario, duplicado?
          │ nada claro
Lluvia de estructuras de datos (hash, heap, árbol, pila, grafo...)
          │ nada claro
Simplifica y generaliza / caso base y construye
          │
Pide o acepta una pista; sigue razonando en voz alta
```

### Errores comunes

- **Saltar directo a codificar** sin fuerza bruta ni análisis.
- **Optimizar la parte equivocada** (no el cuello de botella).
- **Seguir optimizando** cuando ya alcanzaste el BCR.
- **Ejemplos pequeños o especiales** que ocultan el patrón.
- **Pensar en silencio:** el entrevistador no puede evaluar lo que no oye.
- **Código críptico** con nombres de una letra para "ahorrar tiempo".

### Para llevarte

Las técnicas de esta sesión no son trucos de entrevista: son la versión explícita de cómo optimiza un programador con experiencia. Úsalas también en tu trabajo diario.

## Conceptos clave

- **BUD**: buscar cuellos de botella, trabajo innecesario y trabajo duplicado en una solución.
- **Cuello de botella**: parte del algoritmo que domina su costo total.
- **DIY (hazlo tú mismo)**: resolver a mano un ejemplo grande y traducir a código el método intuitivo que usaste.
- **Simplificar y generalizar**: resolver una versión con menos restricciones y luego extender la solución.
- **Caso base y construir**: resolver n = 1, luego construir cada caso a partir del anterior.
- **Lluvia de estructuras de datos**: probar mentalmente cada estructura conocida contra el problema.
- **Mejor tiempo concebible (BCR)**: cota inferior del costo de cualquier solución posible del problema.

## Preguntas de repaso

1. ¿Qué significa BUD y cómo aplicarías cada parte?
   R: Cuellos de botella, trabajo innecesario y trabajo duplicado. Primero identificas el paso que domina el costo y lo atacas (por ejemplo, cambiando una búsqueda lineal repetida por un Set). Luego eliminas pasos que no aportan, como un bucle que prueba valores ya determinados por los otros. Por último, guardas resultados que se calculan varias veces para reutilizarlos.
2. ¿Para qué sirve el mejor tiempo concebible y qué no garantiza?
   R: Sirve para saber cuándo dejar de optimizar el tiempo (si tu solución ya lo alcanza) y para dar pistas (cualquier trabajo por debajo del BCR es gratis, y la diferencia con tu costo actual indica qué sobra). No garantiza que exista un algoritmo que lo alcance; solo que ninguno puede ser mejor.
3. ¿Por qué la técnica DIY necesita un ejemplo grande?
   R: Porque con un ejemplo pequeño el cerebro resuelve por fuerza bruta sin notarlo. Con uno grande y realista se ve obligado a usar un método eficiente (como deslizar una ventana), que luego puedes analizar y traducir a código.
4. Explica cómo dos heaps mantienen la mediana de un stream.
   R: Un max-heap guarda la mitad menor de los números y un min-heap la mitad mayor, manteniendo sus tamaños iguales o con diferencia de uno. Cada número nuevo se inserta en el heap que corresponde y, si se desbalancean, se pasa la raíz de uno al otro. La mediana es la raíz del heap más grande o el promedio de ambas raíces. Cada inserción cuesta O(log n).
5. ¿Qué cinco cualidades definen el buen código según esta sesión?
   R: Correcto, eficiente, simple, legible y mantenible.
6. ¿Qué haces si en una entrevista te dan un problema que ya resolviste antes?
   R: Decirlo con honestidad. El entrevistador puede cambiar de problema o pedirte que lo resuelvas igual; ocultarlo es arriesgado y suele notarse.

## Ejercicio

Resuelve estos tres problemas en TypeScript siguiendo el proceso completo (escribe en comentarios: ejemplo grande, fuerza bruta con costo, BCR, técnica aplicada y solución final con costo): (a) encontrar todas las posiciones de un string largo donde empieza una permutación de un string corto; (b) dados dos arrays ordenados, devolver los elementos comunes; (c) `MedianTracker` con `add(x)` y `median()` usando dos heaps.

Criterio de terminado: cada archivo tiene los cinco comentarios del proceso; (a) y (b) alcanzan su BCR y lo justifican; (c) tiene tests con 10.000 números aleatorios comparando contra ordenar y tomar el medio; ningún nombre de variable tiene una sola letra salvo índices de bucle.

## Explícalo con tus palabras

Explica a un amigo que prepara entrevistas qué es el mejor tiempo concebible y cómo te ayuda a decidir cuándo dejar de optimizar, con un ejemplo propio.
