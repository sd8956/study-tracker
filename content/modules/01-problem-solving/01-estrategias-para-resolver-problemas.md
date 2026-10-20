---
title: Estrategias para resolver problemas
kind: lesson
hours: 2
sources: Think Like a Programmer, cap. 1 "Strategies for Problem Solving" (pp. 10–39) | Cracking the Coding Interview, cap. VII "Technical Questions", Walking Through a Problem (pp. 72–78)
---

## Objetivo

Tener un método repetible para atacar un problema que todavía no sabes resolver: replantearlo, dividirlo, reducirlo, buscar analogías y experimentar con un plan, en lugar de escribir código a ciegas.

## Estudio

### El problema real no es la sintaxis

Cuando empiezas a programar, la dificultad parece estar en el lenguaje: dónde va el punto y coma, cómo se declara un array, qué hace `map`. Esa etapa pasa rápido. La dificultad que no pasa sola es otra: tienes un enunciado frente a ti, entiendes cada palabra, conoces el lenguaje y aun así no sabes **por dónde empezar**. Esa es la habilidad que este módulo entrena: resolver problemas, no escribir código.

La idea central de esta sesión es que resolver problemas **no es un talento místico**. Es un conjunto de técnicas que se pueden aprender, practicar y aplicar de forma deliberada. Un programador experimentado que "ve" la solución rápido no tiene un don especial: tiene muchas soluciones previas en la memoria y aplica sin darse cuenta un puñado de estrategias. Tu objetivo es volver conscientes esas estrategias hasta que se vuelvan automáticas.

Una analogía útil: piensa en un escalador frente a una pared. El principiante mira la cima y se paraliza. El experto mira el siguiente agarre, prueba el peso, vuelve atrás si el agarre no aguanta y rodea la pared buscando una ruta más fácil. No es más fuerte; tiene un método.

### Lecciones de los puzzles clásicos

Antes de tocar código conviene practicar con puzzles, porque quitan el ruido del lenguaje y dejan solo el razonamiento. Hay cuatro tipos de puzzle que enseñan cosas distintas.

**1. Cruzar el río con restricciones.** El clásico: un granjero debe cruzar un río con un zorro, una gallina y un saco de maíz. La barca solo lleva al granjero y un elemento. Si el zorro queda solo con la gallina, se la come; si la gallina queda sola con el maíz, se lo come. Mucha gente se queda atascada porque asume, sin decirlo, que cada viaje debe *llevar algo al otro lado*. La salida aparece cuando replanteas el problema y escribes las acciones posibles de forma explícita: el granjero puede cruzar solo, llevar un elemento o **traer un elemento de vuelta**. En cuanto la acción "traer de vuelta" existe en tu lista, la solución sale sola: llevas la gallina, vuelves, llevas el zorro, **traes la gallina**, llevas el maíz, vuelves, llevas la gallina.

Lecciones:

- Las restricciones que te bloquean a veces no están en el enunciado: las pusiste tú.
- Formalizar el problema (estados posibles, acciones posibles) lo vuelve mecánico.

**2. Rompecabezas de piezas deslizantes.** El tablero de 3×3 con una casilla vacía donde hay que ordenar los números. Intentar resolverlo "todo a la vez" fracasa. Lo que funciona es descubrir una **técnica para un caso pequeño** (por ejemplo, cómo rotar tres piezas en un cuadrado de 2×2 sin desordenar las demás) y luego aplicarla repetidamente. Además, puedes **reducir** el problema: resolver primero la fila superior y la columna izquierda, y lo que queda es un tablero más pequeño del mismo tipo.

Lecciones:

- Busca una operación pequeña que domines y que puedas repetir.
- Reducir un problema a una versión más pequeña del mismo problema es una herramienta poderosa (vas a reencontrarla en la recursión).

**3. Sudoku.** Aquí la lección es **empezar por lo que sabes**. Un buen jugador no prueba números al azar: busca la fila, columna o caja con más restricciones, donde el número correcto está más determinado. En programación, eso equivale a empezar por la parte del problema que ya sabes resolver y dejar que esa parte te dé información para el resto.

**4. Un problema disfrazado.** El libro presenta una cerradura alienígena con nombres extraños y un mecanismo de alarma confuso. Si quitas el disfraz, es exactamente el problema del zorro, la gallina y el maíz con otros nombres. La lección: **buscar analogías**. Muchos problemas nuevos son problemas viejos con ropa distinta. Los detalles irrelevantes (la historia, los nombres) existen para distraerte; tu trabajo es abstraer.

### Las técnicas generales

De esos puzzles salen ocho técnicas que funcionan casi en cualquier situación. Vale la pena memorizarlas como una lista de verificación.

#### 1. Ten siempre un plan

Es la regla más importante. No necesitas saber la solución para tener un plan: necesitas un plan **para encontrar** la solución. Un plan puede ser tan simple como:

1. Replantear el problema con mis palabras.
2. Resolver a mano tres ejemplos.
3. Escribir una solución lenta pero correcta.
4. Buscar dónde se repite trabajo y optimizar.

El plan cumple dos funciones. Primero, te evita la actividad sin dirección (probar cosas al azar esperando un golpe de suerte). Segundo, te da **metas intermedias**: cada paso cumplido es progreso medible, y eso combate la frustración. Sin plan, la única meta es "que funcione", y hasta que funcione sientes que no avanzaste nada. El plan puede cambiar a mitad de camino; eso está bien. Lo que importa es haber planificado, porque planificar te obliga a entender las piezas.

#### 2. Replantea el problema

Decir el problema con otras palabras, otros términos o desde otro ángulo a menudo lo vuelve fácil. Es como rodear una colina antes de subirla para ver si hay un lado menos empinado. A veces el replanteo revela que el objetivo real es otro: en el problema del río, el objetivo no es "llevar cosas" sino "llegar a un estado final válido sin pasar por estados prohibidos".

Un ejemplo de programación: "dado un array, encuentra si hay dos números que sumen 10". Replanteado: "para cada número `x`, ¿existe ya en el array el número `10 - x`?". El segundo enunciado sugiere de inmediato una búsqueda, y con una búsqueda rápida (un `Set`) la solución es lineal.

Replantear también sirve para verificar: si alguien te asignó el problema, le devuelves tu versión y confirmas que entendiste.

#### 3. Divide el problema

Si separas un problema en partes, cada parte suele ser **mucho más** fácil que la mitad del original. Imagina que tienes 100 fichas para ordenar alfabéticamente insertando una por una en su lugar. Cada inserción te obliga a buscar la posición entre las que ya están. Si alguien separa antes las fichas en cuatro grupos por letra inicial (A–F, G–M, N–S, T–Z) y ordenas cada grupo por separado, cada inserción busca entre a lo sumo 25 fichas en lugar de 100. El trabajo total baja drásticamente, no solo a la mitad. Es la misma intuición que hay detrás de "divide y vencerás", que verás en la sesión de quicksort.

En la práctica, dividir significa identificar etapas: leer la entrada, transformarla, calcular, presentar el resultado. Cada etapa se puede resolver y probar por separado.

#### 4. Empieza por lo que sabes

Igual que en el Sudoku, empieza por la parte que ya sabes resolver. Si el problema pide leer un archivo, validar datos y calcular estadísticas, y lo único que tienes claro es cómo calcular el promedio, empieza por ahí con datos de ejemplo escritos a mano. Resolver una parte te da confianza y, muchas veces, información sobre las otras partes.

Esta técnica tiene una versión más amplia: **construye sobre tus habilidades**. Si un problema se parece a algo que ya resolviste, reutiliza ese razonamiento.

#### 5. Reduce el problema

Si no puedes resolver el problema completo, **quita o relaja una restricción** y resuelve esa versión más simple. Luego vuelve a agregar la restricción. Ejemplos:

- ¿No sabes manejar una entrada de longitud arbitraria? Resuelve primero para longitud fija.
- ¿No sabes manejar números negativos? Resuelve solo para positivos.
- ¿No sabes hacerlo en un solo recorrido? Hazlo primero en dos.

La reducción también sirve como diagnóstico: si quitas una restricción y el problema se vuelve fácil, acabas de descubrir **dónde está la dificultad real**. Ese conocimiento vale oro, porque ahora sabes en qué concentrarte.

#### 6. Busca analogías

Pregúntate: ¿esto se parece a algo que ya resolví? Una analogía puede ser directa (el mismo problema con otros nombres) o parcial (comparten una parte). Con la práctica vas a reconocer familias: "esto es una búsqueda", "esto es un recorrido de grafo", "esto es contar frecuencias". Por eso es útil resolver muchos problemas: no por memorizar respuestas, sino por llenar tu biblioteca mental de patrones.

#### 7. Experimenta

Experimentar no es probar al azar. Es formular una hipótesis ("creo que esta función devuelve el índice, no el valor") y escribir un pequeño programa para comprobarla. Un experimento controlado responde una pregunta concreta. En TypeScript, una consola de Node o un test de Vitest de cinco líneas son laboratorios perfectos.

```ts
// Hipótesis: Array.prototype.sort ordena números como texto si no paso comparador.
console.log([10, 9, 1, 100].sort());           // [1, 10, 100, 9]  -> confirmado
console.log([10, 9, 1, 100].sort((a, b) => a - b)); // [1, 9, 10, 100]
```

La diferencia con "probar cosas hasta que funcione" es que, después de un experimento, **sabes algo nuevo** aunque el resultado haya sido negativo.

#### 8. No te frustres

La frustración no es solo un sentimiento: es un estado que empeora tu razonamiento. Cuando estás frustrado tiendes a repetir lo que ya falló, a hacer cambios al azar y a abandonar. Tener un plan ayuda mucho (siempre hay un siguiente paso concreto). También ayuda **hacer una pausa**: muchas soluciones aparecen al volver después de caminar diez minutos. Decidir parar no es rendirse; seguir golpeando la pared sin método sí lo es.

### El mismo método, versión entrevista

En las entrevistas técnicas se usa una variante muy concreta de este método. La secuencia recomendada para recorrer un problema es:

| Paso | Qué haces | Error típico que evita |
| --- | --- | --- |
| 1. Escuchar | Anotas **toda** la información del enunciado. Cada dato suele importar ("el array está ordenado" casi siempre significa algo). | Ignorar una pista que habilita la solución óptima. |
| 2. Ejemplo | Dibujas un ejemplo **grande** y **no especial** (no uses `[1, 2, 3]`). | Ejemplos tan pequeños o simétricos que esconden el caso general. |
| 3. Fuerza bruta | Dices en voz alta una solución lenta pero correcta y su costo. | Quedarte en blanco buscando la solución perfecta. |
| 4. Optimizar | Buscas trabajo repetido, cuellos de botella, información no usada. | Optimizar sin saber qué parte es lenta. |
| 5. Recorrer | Antes de codificar, repasas el algoritmo paso a paso con el ejemplo. | Codificar una idea a medio entender. |
| 6. Implementar | Escribes código limpio y modular. | Código enredado que no puedes depurar. |
| 7. Probar | Revisas conceptualmente, buscas código raro, pruebas casos pequeños y casos borde. | Entregar código sin verificar. |

Observa que es el mismo espíritu de las técnicas generales: tener un plan (la secuencia completa), replantear (escuchar y ejemplificar), empezar por lo que sabes (fuerza bruta), reducir y experimentar (optimizar y probar).

### Un ejemplo completo con el método

**Problema:** dado un texto, devuelve el primer carácter que no se repite. Para `"programacion"`, la respuesta es `"p"`. Si todos se repiten, devuelve `null`.

**Plan:**

1. Replantear: "busco, en orden de aparición, el primer carácter cuya cantidad total de apariciones sea 1".
2. Ejemplos: `"programacion"` → `p`; `"aabb"` → `null`; `"aabcb"` → `c`; `""` → `null`.
3. Fuerza bruta: para cada carácter, cuento cuántas veces aparece recorriendo todo el texto. Costo: n × n.
4. Optimizar: el trabajo repetido es contar lo mismo muchas veces. Puedo contar **una sola vez** todas las frecuencias y luego recorrer el texto buscando la primera con frecuencia 1.

El replanteo del paso 1 es lo que sugiere la optimización: separaste "contar" de "buscar en orden", es decir, **dividiste** el problema en dos etapas.

```ts
export function firstUnique(text: string): string | null {
  // Etapa 1: contar frecuencias (un recorrido).
  const counts = new Map<string, number>();
  for (const ch of text) {
    counts.set(ch, (counts.get(ch) ?? 0) + 1);
  }
  // Etapa 2: buscar en orden de aparición (otro recorrido).
  for (const ch of text) {
    if (counts.get(ch) === 1) return ch;
  }
  return null;
}
```

5. Recorrer con `"aabcb"`: counts = {a:2, b:2, c:1}; segundo recorrido: a(2), a(2), b(2), c(1) → devuelve `c`. Correcto.
6. Probar casos borde: texto vacío (devuelve `null`), un solo carácter (lo devuelve), mayúsculas y minúsculas (¿son distintas? hay que decidirlo y documentarlo).

Fíjate en el último punto: las pruebas hicieron aparecer una **ambigüedad del enunciado**. Eso es normal y valioso. Un buen solucionador de problemas no la oculta: la nombra y toma una decisión explícita.

### Cómo se ve un mal proceso

Para fijar la idea, compara con el proceso sin método:

```
Leer enunciado → empezar a escribir código → no compila → arreglar →
compila pero falla → cambiar algo al azar → falla distinto →
frustración → copiar una solución de internet sin entenderla
```

Y el proceso con método:

```
Leer y replantear → ejemplos a mano → solución lenta correcta →
medir costo → detectar trabajo repetido → optimizar →
recorrer con un ejemplo → codificar → probar casos borde
```

El segundo parece más largo, pero casi siempre es más rápido, porque cada paso reduce la incertidumbre en lugar de aumentarla.

### Reducir en acción: un segundo ejemplo

**Problema:** recibes una cadena con números separados por comas, por ejemplo `"4, -2,  7,,10"`. Debes devolver la suma de los números válidos, ignorando los huecos vacíos y los espacios.

Si intentas resolver todo a la vez, te enredas entre `split`, `trim`, conversiones y casos raros. Aplica reducción en escalones:

| Versión | Restricción quitada | Qué aprendes |
| --- | --- | --- |
| A | Ya tienes un array de números `[4, -2, 7, 10]` | Sumar es trivial: un `reduce`. |
| B | Tienes strings limpios `["4", "-2", "7", "10"]` | Hay que convertir con `Number` y decidir qué hacer si falla. |
| C | Tienes la cadena sin espacios ni huecos `"4,-2,7,10"` | `split(",")` te lleva a la versión B. |
| D | El problema completo | Falta limpiar espacios (`trim`) y descartar vacíos (`filter`). |

```ts
export function sumCsv(input: string): number {
  return input
    .split(",")                 // D -> C
    .map((part) => part.trim()) // limpiar espacios
    .filter((part) => part !== "") // descartar huecos
    .map(Number)                // C -> B -> A
    .filter((n) => !Number.isNaN(n))
    .reduce((acc, n) => acc + n, 0);
}
```

Observa dos cosas. Primero, cada versión reducida era fácil por sí sola, y la solución final es literalmente la composición de esas versiones. Segundo, la reducción te mostró **dónde estaba la decisión difícil**: no era sumar ni separar, sino qué hacer con una parte que no es un número (`"abc"`). Esa decisión de diseño (ignorarla, lanzar un error, devolver `null`) es lo que deberías discutir con quien te pidió el código. Sin reducir, esa pregunta se habría perdido entre la sintaxis.

### Errores comunes

- **Confundir actividad con progreso.** Escribir código muy rápido no es avanzar si no sabes qué estás construyendo.
- **Ejemplos demasiado pequeños.** `[1, 2]` casi nunca revela el patrón; usa ejemplos de 6 a 10 elementos con valores variados.
- **No anotar las restricciones del enunciado.** "Ordenado", "sin duplicados", "cabe en memoria" suelen ser la clave.
- **Asumir restricciones que no existen.** Como en el puzzle del río: revisa si lo que te bloquea está realmente en el enunciado.
- **No parar.** Si llevas 20 minutos sin ningún avance, cambia de técnica (reduce, busca analogía) o haz una pausa.

### Para llevarte

Resolver problemas es una habilidad entrenable. El plan es la herramienta principal; las otras técnicas (replantear, dividir, empezar por lo que sabes, reducir, buscar analogías, experimentar, manejar la frustración) son los movimientos que el plan organiza. En las próximas sesiones vas a aplicarlas a problemas de código cada vez más ricos.

## Conceptos clave

- **Plan de resolución**: secuencia de pasos para encontrar la solución, no la solución misma; da metas intermedias y dirección.
- **Replantear**: expresar el problema con otras palabras o desde otro ángulo para revelar el objetivo real o una solución obvia.
- **Dividir**: separar el problema en etapas o partes independientes, cada una mucho más fácil que el todo.
- **Reducir**: quitar o relajar una restricción para resolver una versión más simple y descubrir dónde está la dificultad real.
- **Analogía**: reconocer que un problema nuevo comparte estructura con uno que ya resolviste.
- **Experimento**: programa pequeño que comprueba una hipótesis concreta, no prueba y error al azar.
- **Fuerza bruta**: solución correcta aunque lenta que sirve de punto de partida para optimizar.

## Preguntas de repaso

1. ¿Por qué tener un plan es útil incluso si el plan cambia a mitad de camino?
   R: Porque planificar te obliga a entender las piezas del problema y te da metas intermedias medibles. Aunque el plan cambie, ya ganaste comprensión, evitaste la actividad sin dirección y cada paso cumplido te da progreso visible, lo que reduce la frustración.
2. ¿Qué diferencia hay entre reducir un problema y dividirlo?
   R: Dividir separa el problema completo en partes que juntas lo resuelven (por ejemplo, contar y luego buscar). Reducir quita o relaja una restricción para resolver una versión más simple del mismo problema (por ejemplo, longitud fija en lugar de variable), y luego se vuelve a agregar la restricción. Reducir además revela cuál restricción es la difícil.
3. En el puzzle del zorro, la gallina y el maíz, ¿qué bloqueaba a la mayoría y qué técnica lo destraba?
   R: La suposición implícita de que cada viaje debe llevar algo hacia el otro lado. Se destraba replanteando el problema de forma formal: listar todas las acciones posibles, incluida "traer un elemento de vuelta". Con esa acción explícita, la solución aparece casi mecánicamente.
4. ¿Por qué se recomienda usar un ejemplo grande y no especial al recorrer un problema de entrevista?
   R: Porque los ejemplos pequeños o con valores especiales (ordenados, simétricos, todos iguales) esconden el caso general y pueden hacer que una solución incorrecta parezca correcta. Un ejemplo de tamaño medio con valores variados muestra el patrón real.
5. ¿Qué distingue un experimento de "probar cosas hasta que funcione"?
   R: Un experimento parte de una hipótesis concreta y está diseñado para confirmarla o refutarla; después de hacerlo sabes algo nuevo aunque el resultado sea negativo. Probar al azar no tiene hipótesis y no produce conocimiento acumulable.
6. ¿Para qué sirve proponer primero una solución de fuerza bruta?
   R: Te da una solución correcta como punto de partida, demuestra que entendiste el problema y te permite medir su costo. A partir de ella buscas el trabajo repetido o el cuello de botella que se puede optimizar.

## Ejercicio

En un archivo `first-repeated.ts`, escribe una función `firstRepeated(values: number[]): number | null` que devuelva el primer número que aparece por segunda vez al recorrer el array de izquierda a derecha (para `[3, 8, 1, 8, 3]` es `8`). Antes del código, escribe en un comentario tu plan: replanteo, tres ejemplos propios (uno sin repetidos y uno vacío), la solución de fuerza bruta con su costo y la idea de optimización.

Criterio de terminado: el comentario tiene los cuatro elementos del plan; la función recorre el array una sola vez usando un `Set`; tienes al menos cinco casos de prueba (Vitest o `console.assert`) que pasan, incluidos array vacío, sin repetidos y repetido al final.

## Explícalo con tus palabras

Explícale a alguien que nunca programó cómo resolverías un problema que no sabes resolver, usando al menos tres de las ocho técnicas y un ejemplo de tu vida diaria.
