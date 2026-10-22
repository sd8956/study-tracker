---
title: Repaso, restricciones y reducción de problemas
kind: lesson
hours: 2
sources: Think Like a Programmer, cap. 2 "Pure Puzzles" (pp. 40–76)
links: Algoritmo de Luhn (Wikipedia) | https://es.wikipedia.org/wiki/Algoritmo_de_Luhn
---

## Objetivo

Repasar cómo leer las restricciones de un problema y usarlas para reducirlo, con foco en el punto que se te escapó en el diagnóstico: validar con Luhn dígitos que llegan de izquierda a derecha, sin conocer la longitud, en una sola pasada y con memoria O(1).

## Estudio

### Qué mostró tu diagnóstico

En el diagnóstico descompusiste bien la fórmula de Luhn: separaste convertir un carácter en dígito, duplicar y restar 9, sumar y comprobar el módulo 10. Esas piezas estaban bien. Lo que faltó fue otra cosa: notar que una restricción del enunciado (los dígitos llegan de izquierda a derecha y no sabes cuántos son) **rompía** una de esas piezas, la que decide qué dígitos duplicar.

Esa diferencia es el tema de esta sesión. **Descomponer** responde "¿qué piezas tiene el problema?". **Leer las restricciones** responde "¿qué información tengo, cuándo me llega y qué no se me permite hacer?". Puedes tener todas las piezas correctas y aun así no tener solución, porque una pieza necesita un dato que, por la restricción, todavía no existe en el momento en que lo necesitas.

La sesión 01 ya te dio la técnica general de reducir. Aquí la usas como herramienta de diagnóstico: para encontrar **cuál** restricción es la difícil y para descubrir qué hacer con ella.

### Las restricciones son parte del problema

Es tentador leer las restricciones como letra pequeña: "detalles que ya veré". Es al revés. En un problema bien planteado, las restricciones son lo que hace que la solución obvia no sirva, y por eso señalan hacia la solución buena. Conviene clasificarlas, porque cada tipo pide una pregunta distinta:

| Tipo de restricción | Ejemplo | Pregunta que te obliga a hacer |
| --- | --- | --- |
| De información | "los datos llegan de uno en uno", "no conoces la longitud" | ¿qué necesito saber y en qué momento lo sabré? |
| De recursos | "una sola pasada", "memoria O(1)", "no puedes modificar la entrada" | ¿cuál es el estado mínimo que debo recordar? |
| De forma de la entrada | "ordenado", "valores entre 1 y n", "sin duplicados" | ¿qué propiedad me regala el enunciado y qué técnica la aprovecha? |
| De salida | "devuelve cualquier solución", "en orden", "solo el conteo" | ¿necesito construir la respuesta o solo contarla? |

Las restricciones de información y de recursos **quitan** opciones. Las de forma de la entrada y de salida suelen **dar** opciones: "ordenado" permite descartar mitades, "solo el conteo" permite no guardar las soluciones. Un buen hábito es escribir las restricciones en una lista antes de pensar en el código y marcar al lado de cada una si quita o da.

### Tres preguntas para cada restricción

Antes de diseñar nada, pasa cada restricción por estas tres preguntas:

1. **¿Qué solución obvia prohíbe?** Si la respuesta es "ninguna", probablemente no la entendiste o no es importante. Si prohíbe la obvia, ya sabes que tu primera idea va a chocar con ella.
2. **¿Qué decisión depende de información que llega tarde?** Esta es la que se te escapó. Recorre tu descomposición pieza por pieza y pregunta, para cada decisión, qué datos necesita y si esos datos ya existen cuando la decisión se toma.
3. **¿Qué propiedad me da gratis?** "Ordenado", "pocos valores posibles", "k pequeño". Cada propiedad de la entrada es una pista.

La segunda pregunta merece un nombre propio: es buscar **dependencias hacia el futuro**. Si una pieza necesita algo que solo se sabe al final y la entrada no se puede releer, tienes tres salidas: guardar todo hasta el final (si la memoria lo permite), cambiar el orden de lectura (si se puede) o calcular la pieza **para todas las respuestas posibles** del dato que falta y elegir al final. La tercera es la que resuelve Luhn.

### Reducir para encontrar la dificultad real

Reducir es quitar una restricción, resolver esa versión y volver a ponerla. Su valor de diagnóstico es este: si quitas una restricción y el problema se vuelve fácil, **esa** restricción es la dificultad. Haz la escalera de versiones de forma explícita, como una tabla, y mira en qué escalón deja de funcionar tu idea.

Para Luhn la escalera queda así:

| Versión | Qué tienes | Cómo decides qué duplicar | ¿Fácil? |
| --- | --- | --- | --- |
| A | El número completo en un array | Recorres desde la derecha: duplicas el 2.º, 4.º, 6.º… | Sí |
| B | Dígitos de izquierda a derecha, longitud conocida `L` | La posición `i` desde la izquierda está en la posición `L − i` desde la derecha | Sí |
| C | Dígitos de izquierda a derecha, longitud desconocida | Necesitas `L` y no la tienes hasta el final | No |

Entre B y C solo cambia una cosa: conocer `L`. Ahí está toda la dificultad, y ahora la puedes enunciar con precisión: **la decisión "¿duplico este dígito?" depende de la paridad de la longitud total, que solo conoces cuando termina la entrada.**

Fíjate en que la tabla te dice además qué **no** es difícil. Convertir caracteres, duplicar, restar 9 y comprobar el módulo 10 funcionan igual en las tres versiones. No hace falta repensarlos: el problema completo se reduce a resolver una sola pregunta.

### Luhn con dígitos de izquierda a derecha

Recuerda la regla: contando desde la derecha, el último dígito es el verificador y no se duplica; se duplican el segundo, el cuarto, el sexto, etc. Si un duplicado da dos cifras, se suman sus cifras, lo que equivale a restar 9. El número es válido si la suma total es divisible por 10.

Numera las posiciones desde la izquierda empezando en 0. Con longitud `L`, la posición `i` está en el lugar `L − i` contando desde la derecha, y se duplica si ese lugar es par:

- Si `L` es **par**, `L − i` es par cuando `i` es par: se duplican las posiciones 0, 2, 4…
- Si `L` es **impar**, `L − i` es par cuando `i` es impar: se duplican las posiciones 1, 3, 5…

#### Los instintos que no sirven

Antes de la solución, mira por qué fallan las ideas que suelen aparecer, porque cada una choca con una restricción concreta:

- **Guardar todos los dígitos y recorrerlos al final desde la derecha.** Es correcto, pero usa memoria O(n). Si la restricción es memoria O(1) (o si el stream es enorme), está prohibido.
- **Leer primero para contar y después para sumar.** Necesita dos pasadas. Un stream no se puede releer.
- **Suponer una paridad y "corregir" al final.** No hay corrección barata: si supusiste mal, duplicaste justo los dígitos equivocados, y para deshacerlo necesitarías los dígitos originales.

#### La idea: dos sumas en paralelo

La paridad de `L` solo puede tener **dos** valores. Entonces no hace falta adivinarla: lleva las dos respuestas a la vez. Una suma asume que la longitud total será par; la otra, que será impar. Cada dígito se suma a las dos, duplicado en una y sin duplicar en la otra. Al terminar, ya conoces `L` y eliges la suma que corresponde.

```ts
function doubledDigitValue(d: number): number {
  const doubled = d * 2;
  return doubled >= 10 ? doubled - 9 : doubled;
}

export function isValidLuhn(digits: Iterable<string>): boolean {
  let sumIfEven = 0; // correcta si la longitud total resulta par
  let sumIfOdd = 0;  // correcta si la longitud total resulta impar
  let length = 0;    // también es la posición del dígito actual

  for (const ch of digits) {
    if (ch < "0" || ch > "9") return false;
    const d = ch.charCodeAt(0) - 48;
    if (length % 2 === 0) {
      sumIfEven += doubledDigitValue(d); // longitud par: se duplican las posiciones pares
      sumIfOdd += d;
    } else {
      sumIfEven += d;
      sumIfOdd += doubledDigitValue(d);  // longitud impar: se duplican las impares
    }
    length++;
  }
  if (length < 2) return false; // hace falta al menos un dígito además del verificador
  const total = length % 2 === 0 ? sumIfEven : sumIfOdd;
  return total % 10 === 0;
}
```

#### Recorrido con una longitud par: `8763`

| Posición | Dígito | `sumIfEven` | `sumIfOdd` |
| --- | --- | --- | --- |
| 0 | 8 | 0 + 7 (16 − 9) = 7 | 0 + 8 = 8 |
| 1 | 7 | 7 + 7 = 14 | 8 + 5 (14 − 9) = 13 |
| 2 | 6 | 14 + 3 (12 − 9) = 17 | 13 + 6 = 19 |
| 3 | 3 | 17 + 3 = 20 | 19 + 6 = 25 |

Al terminar, `length = 4` es par: el total es `sumIfEven = 20`, divisible por 10, válido. Compruébalo con la versión A: desde la derecha, 3 (no), 6 → 3, 7 (no), 8 → 7; total 3 + 3 + 7 + 7 = 20.

#### Recorrido con una longitud impar: `125`

| Posición | Dígito | `sumIfEven` | `sumIfOdd` |
| --- | --- | --- | --- |
| 0 | 1 | 2 | 1 |
| 1 | 2 | 4 | 1 + 4 = 5 |
| 2 | 5 | 4 + 1 (10 − 9) = 5 | 5 + 5 = 10 |

Ahora `length = 3` es impar: el total es `sumIfOdd = 10`, válido. Con la versión A: 5 (no), 2 → 4, 1 (no); total 10. Verificar con un ejemplo de cada paridad no es un trámite: si intercambiaras sin querer las dos ramas del `if`, uno de los dos recorridos lo delataría.

#### Costo

Una pasada: O(n) tiempo. Memoria: dos sumas y un contador, O(1), sin importar cuántos dígitos lleguen. Incluso el contador se puede reducir a un booleano, porque solo importa su paridad. Ese es el **estado mínimo**: todo lo que el resto del algoritmo necesita saber del pasado cabe en tres números.

### Generalizar: hipótesis paralelas

La técnica de Luhn tiene nombre propio en esta ruta: **hipótesis paralelas**. Se aplica cuando se cumplen tres condiciones:

1. Una decisión depende de un dato que llega tarde.
2. Ese dato tiene **pocos valores posibles** (dos paridades, tres modos, k estados).
3. Para cada valor posible, el trabajo se puede hacer de forma incremental.

Entonces mantienes un estado por cada valor posible del dato y eliges al final. El costo se multiplica por la cantidad de hipótesis, así que la técnica solo es buena si son pocas. Con dos, es casi gratis.

El libro llega a esta idea con un problema auxiliar que vale la pena recordar: "lee números de uno en uno y, al final, di si hubo más positivos o más negativos, sin guardarlos". Nadie guarda la lista: llevas los dos contadores y comparas al final. Luhn es el mismo movimiento con sumas en lugar de contadores.

Vas a ver la misma idea más adelante con otros nombres. En programación dinámica, "una tabla con una fila por estado posible" es llevar todas las hipótesis a la vez. En los grafos con estado ampliado, como `(ciudad, vuelosUsados)`, cada nodo se duplica en una copia por valor de la restricción. Reconocer la forma general te ahorra redescubrirla cada vez.

### Otra herramienta de estado mínimo: el resto acumulado

No todo dato que llega tarde se resuelve con hipótesis paralelas. A veces basta con **comprimir** el pasado. Problema: los dígitos de un número enorme llegan de izquierda a derecha; di si es divisible por 7. El número puede tener un millón de dígitos, así que no cabe en un `number`.

Reducción: si el número ya leído es `N` y llega el dígito `d`, el número nuevo es `10 · N + d`. Su resto módulo 7 solo depende del resto de `N`:

```ts
export function isDivisibleBy(digits: Iterable<string>, k: number): boolean {
  let remainder = 0;
  for (const ch of digits) remainder = (remainder * 10 + (ch.charCodeAt(0) - 48)) % k;
  return remainder === 0;
}
```

Con `"343"` y `k = 7`: 3 → 3; 34 → 34 % 7 = 6; 6 · 10 + 3 = 63 → 0. Divisible (343 = 7³). Aquí el dato que falta (el número completo) tiene demasiados valores para hipótesis paralelas, pero lo único que el futuro necesita de él es su resto. La pregunta guía es la misma en los dos casos: **¿qué es lo mínimo del pasado que el resto del algoritmo necesita?**

### Cuando la restricción te regala algo

Las restricciones de forma de la entrada funcionan al revés: no esconden un problema, revelan un atajo. Algunas que vale la pena reconocer en cuanto aparecen:

| Si el enunciado dice… | Piensa en… |
| --- | --- |
| "ordenado" | búsqueda binaria, dos punteros (sesión 03) |
| "valores entre 0 y k", k pequeño | usar el valor como índice de un array de conteo |
| "encuentra el menor valor que cumple X" y X es monótona | búsqueda binaria sobre la respuesta (sesión 03) |
| "¿existe un par…?", "¿ya apareció…?" | un `Set` o un `Map` con lo ya visto (sesión 13) |
| "los k mayores", k mucho menor que n | un heap de tamaño k (sesión 13) |
| "solo cuenta", "di cuántas formas" | no construyas las soluciones; cuenta, y quizá hay subproblemas repetidos (sesión 19) |

Y una advertencia del lado contrario: **no inventes restricciones**. "Los números son positivos" o "cabe en memoria" solo son ciertos si el enunciado lo dice o si lo preguntaste. Muchas soluciones fallan en producción por una suposición que nunca se escribió.

### Reducir a un problema conocido

Hay un segundo sentido de "reducir" que conviene distinguir del anterior. Reducir **quitando una restricción** te da una versión más fácil del mismo problema. Reducir **a otro problema** transforma tu problema en uno que ya sabes resolver, y la solución de ese te da la del tuyo.

Ejemplo: "dada una lista de reuniones `[inicio, fin)`, di si alguna se solapa con otra". Comparar todos los pares es O(n²). Replanteo: si las reuniones estuvieran ordenadas por inicio, un solapamiento solo puede ocurrir entre **vecinas** (si la reunión `i` no choca con la `i + 1`, que empieza antes que todas las siguientes, tampoco choca con ninguna posterior). El problema se reduce a "ordena y compara cada reunión con la siguiente": O(n log n), con la librería estándar haciendo el trabajo difícil.

```ts
type Meeting = [start: number, end: number];

export function hasOverlap(meetings: Meeting[]): boolean {
  const sorted = meetings.toSorted((a, b) => a[0] - b[0]);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i][0] < sorted[i - 1][1]) return true; // empieza antes de que termine la anterior
  }
  return false;
}
```

La pregunta que dispara este tipo de reducción es: "¿qué tendría que ser cierto de la entrada para que esto fuera fácil?". Si la respuesta es "que esté ordenada", "que no tenga duplicados" o "que sea un grafo", a veces puedes hacer que lo sea pagando un costo razonable.

### Una plantilla para leer un enunciado

Junta todo en un procedimiento corto que puedes aplicar a cualquier problema nuevo, antes de escribir una línea de código:

1. Escribe las restricciones en una lista y marca si cada una **quita** o **da**.
2. Escribe la solución obvia y señala qué restricción viola, si viola alguna.
3. Descompón en piezas y, para cada decisión, anota qué datos necesita y **cuándo** existen.
4. Si alguna decisión depende de un dato que llega tarde: ¿puedes guardarlo todo?, ¿puedes cambiar el orden de lectura?, ¿el dato tiene pocos valores (hipótesis paralelas)?, ¿basta con un resumen del pasado (estado comprimido)?
5. Haz la escalera de reducciones y verifica la solución con un ejemplo de cada caso que la escalera mostró como distinto (en Luhn: longitud par e impar).

El paso 3 es el que faltó en tu diagnóstico. No es un paso nuevo: es mirar tu propia descomposición con una pregunta más.

### Errores comunes

- **Tratar las restricciones como detalles.** Suelen ser la razón por la que la solución obvia no sirve.
- **Descomponer sin preguntar cuándo llega cada dato.** Las piezas pueden estar bien y la solución mal.
- **Adivinar una hipótesis y planear "corregir al final".** Si corregir requiere los datos originales, no se puede.
- **Usar hipótesis paralelas con demasiadas hipótesis.** Si el dato que falta tiene muchos valores, busca un resumen del pasado (como el resto acumulado) en lugar de una copia del estado por valor.
- **Verificar con un solo ejemplo.** Si la solución distingue casos (par o impar), prueba al menos uno de cada uno.
- **Inventar restricciones que el enunciado no da**, como "son positivos" o "cabe en memoria".

### Para llevarte

Descomponer te da las piezas; leer las restricciones te dice si esas piezas pueden funcionar con la información que tienes y cuando la tienes. Cuando una decisión depende de algo que llega tarde y ese algo tiene pocos valores posibles, no adivines: calcula todas las respuestas a la vez y elige al final. En Luhn eso son dos sumas, una pasada y memoria O(1).

## Conceptos clave

- **Restricción de información**: regla del enunciado que limita qué datos tienes y en qué momento los tienes.
- **Restricción de recursos**: límite de tiempo, memoria o pasadas que prohíbe soluciones obvias.
- **Dependencia hacia el futuro**: decisión que necesita un dato que todavía no llegó cuando hay que tomarla.
- **Escalera de reducciones**: secuencia de versiones del problema, cada una con una restricción menos, que muestra dónde está la dificultad real.
- **Hipótesis paralelas**: mantener un estado por cada valor posible de un dato que llega tarde y elegir el correcto al final.
- **Estado mínimo**: lo más pequeño que hay que recordar del pasado para que el resto del algoritmo funcione.
- **Estado comprimido**: resumen del pasado que basta para el futuro, como el resto módulo k de un número.
- **Reducir a un problema conocido**: transformar el problema en otro con solución conocida, como ordenar para comparar solo vecinos.

## Preguntas de repaso

1. En la validación de Luhn con dígitos que llegan de izquierda a derecha y longitud desconocida, ¿por qué no puedes decidir al leer cada dígito si duplicarlo?
   R: Porque los dígitos que se duplican se cuentan desde la derecha (el segundo, el cuarto…), y la posición desde la derecha depende de la longitud total. Si la longitud es par se duplican las posiciones pares desde la izquierda; si es impar, las impares. La longitud solo se conoce cuando termina la entrada.
2. ¿Cómo se resuelve Luhn en una pasada y con memoria O(1) si no conoces la longitud?
   R: Con dos sumas en paralelo: una asume longitud total par y otra impar. Cada dígito se suma a ambas, duplicado en una y sin duplicar en la otra según la paridad de su posición. Al terminar se conoce la longitud y se elige la suma correspondiente; el número es válido si esa suma es divisible por 10. Solo se guardan dos sumas y un contador.
3. ¿Por qué no sirve suponer que la longitud es par y corregir al final si resulta impar?
   R: Porque si la suposición era incorrecta, se duplicaron justo los dígitos equivocados, y deshacerlo exige conocer los dígitos originales, que ya no están guardados. La única forma de no guardarlos es haber calculado también la otra hipótesis desde el principio.
4. ¿Qué tres condiciones hacen aplicable la técnica de hipótesis paralelas?
   R: Que una decisión dependa de un dato que llega tarde, que ese dato tenga pocos valores posibles y que, para cada valor, el trabajo se pueda hacer de forma incremental. El costo se multiplica por la cantidad de hipótesis, por eso solo conviene si son pocas.
5. ¿Cómo usas la reducción para encontrar la dificultad real de un problema?
   R: Construyes una escalera de versiones quitando una restricción a la vez y miras en qué escalón tu idea deja de funcionar. La restricción que separa una versión fácil de una difícil es la dificultad; todo lo que funciona igual en ambas versiones no necesita repensarse.
6. Para saber si un número de un millón de dígitos que llega dígito a dígito es divisible por 7, ¿qué estado mínimo guardas y por qué basta?
   R: Solo el resto módulo 7 de lo leído hasta ahora. Si lo leído es N y llega el dígito d, el nuevo número es 10·N + d, y su resto depende solo del resto de N: (10 · resto + d) mod 7. Al final, el número es divisible si el resto es 0.

## Ejercicio

En `luhn-stream.ts`, implementa en TypeScript `isValidLuhn(digits: Iterable<string>)` con dos sumas en paralelo y `checkDigit(payload: Iterable<string>)`, que devuelve el dígito verificador que hay que agregar a la derecha de `payload` para que el número completo sea válido, también en una sola pasada y con memoria O(1). Antes del código, escribe en un comentario la escalera de reducciones (versiones A, B y C) y qué cambia en `checkDigit` respecto de la validación (pista: el número completo tendrá un dígito más que el `payload`).

Criterio de terminado: `isValidLuhn` acepta `"79927398713"`, `"8763"` y `"125"` y rechaza `"79927398710"`; `checkDigit("7992739871")` devuelve `3`; los tests cubren entrada vacía, un solo dígito, un carácter no numérico y al menos un caso de cada paridad; las dos funciones reciben un generador (no un string) en al menos un test, para demostrar que nunca releen la entrada.

## Explícalo con tus palabras

Explícale a un compañero por qué validar con Luhn dígitos que llegan de izquierda a derecha necesita dos sumas, y en qué otros problemas usarías la misma idea de llevar varias hipótesis a la vez.
