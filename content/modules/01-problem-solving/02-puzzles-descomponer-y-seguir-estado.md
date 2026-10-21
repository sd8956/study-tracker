---
title: Puzzles de código, entrada y estado
kind: lesson
hours: 2
sources: Think Like a Programmer, cap. 2 "Pure Puzzles" (pp. 40–76)
links: Algoritmo de Luhn (Wikipedia) | https://es.wikipedia.org/wiki/Algoritmo_de_Luhn
---

## Objetivo

Aplicar dividir y reducir a problemas de código pequeños pero tramposos: patrones de salida, procesamiento de entrada carácter por carácter y problemas donde hay que recordar un estado que cambia.

## Estudio

### Por qué practicar con puzzles "puros"

Un puzzle puro es un problema pequeño, con reglas estrictas, que no necesita librerías ni estructuras complicadas: solo variables, bucles, condicionales y aritmética. Parecen ejercicios de principiante, pero son el gimnasio ideal: como las herramientas son mínimas, toda la dificultad está en **el razonamiento**. Si aprendes a descomponer un puzzle de 20 líneas, aprendes a descomponer un sistema de 20.000.

La técnica que vas a practicar en toda la sesión es la misma, en tres variantes:

1. Partir el problema en piezas tan pequeñas que cada una sea trivial.
2. Resolver cada pieza con un programa pequeño y probarlo.
3. Ensamblar las piezas, reutilizando el código y, sobre todo, la comprensión que ganaste.

Un detalle psicológico importante: si al descomponer sientes que "este paso es demasiado fácil", vas bien. La meta principal es llegar a un programa correcto; la secundaria es llegar rápido. **No** es una meta usar pocos pasos. Subir una colina en línea recta tiene menos pasos que seguir el sendero en zigzag, pero lo más probable es que te agotes a mitad de camino.

### Parte 1: patrones de salida

Imagina esta regla artificial: solo puedes usar dos instrucciones de salida, una que imprime un `#` y otra que imprime un salto de línea. Con eso debes dibujar formas. En TypeScript lo simulamos con dos funciones:

```ts
let out = "";
const hash = () => { out += "#"; };
const newline = () => { out += "\n"; };
```

**Objetivo final:** dibujar un triángulo "de lado", así:

```
#
##
###
####
###
##
#
```

Intentarlo de una vez suele terminar en bucles con condiciones raras. Mejor **reducir** paso a paso.

**Reducción 1: un cuadrado.** 4 filas de 4 `#`. Dos bucles anidados: el externo cuenta filas, el interno imprime los `#` de cada fila.

```ts
for (let row = 1; row <= 4; row++) {
  for (let col = 1; col <= 4; col++) hash();
  newline();
}
```

**Reducción 2: medio cuadrado (triángulo creciente).** La fila `row` tiene `row` hashes. Solo cambia el límite del bucle interno: `col <= row`. Aquí aparece la idea clave del capítulo: **la cantidad de cada fila es una función del número de fila**. Si encuentras esa función, el dibujo sale solo.

**Reducción 3: contar hacia abajo contando hacia arriba.** Para el triángulo decreciente, queremos que la fila 1 tenga 4, la fila 2 tenga 3, etc. Con un contador que sube (`row = 1..4`), la cantidad es `5 - row`. En general, para convertir un contador ascendente en uno descendente usas `max + 1 - row`.

**Ensamblaje: el triángulo de lado.** Tiene 7 filas; las cantidades son 1, 2, 3, 4, 3, 2, 1. ¿Qué función da eso para `row = 1..7`? Mira la tabla:

| row | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
| --- | - | - | - | - | - | - | - |
| row − 4 | −3 | −2 | −1 | 0 | 1 | 2 | 3 |
| \|row − 4\| | 3 | 2 | 1 | 0 | 1 | 2 | 3 |
| 4 − \|row − 4\| | 1 | 2 | 3 | 4 | 3 | 2 | 1 |

La función es `4 - Math.abs(row - 4)`. El valor absoluto convierte una recta que cruza cero en una "V", y restarlo de 4 la invierte en un pico.

```ts
for (let row = 1; row <= 7; row++) {
  const count = 4 - Math.abs(row - 4);
  for (let i = 1; i <= count; i++) hash();
  newline();
}
```

La lección no es el valor absoluto. Es el proceso: cuadrado → triángulo → contar al revés → combinar. Cada reducción era trivial y, juntas, resolvieron algo que de frente parecía difícil. Y el truco de **hacer una tabla con el número de fila y la cantidad deseada** sirve para cualquier patrón.

### Parte 2: procesar entrada carácter por carácter

Ahora un problema real: validar un número de identificación con la **fórmula de Luhn**, la que usan las tarjetas de crédito. La regla, explicada con tus palabras:

1. Recorre los dígitos empezando por la **derecha** (el último es el dígito verificador).
2. Duplica uno de cada dos dígitos: el segundo desde la derecha, el cuarto, el sexto, etc.
3. Si al duplicar obtienes un número de dos cifras, suma sus cifras (por ejemplo, 7 × 2 = 14 → 1 + 4 = 5). Equivale a restar 9.
4. Suma todo. Si el total es divisible por 10, el número es válido.

Ejemplo con `79927398713`:

```
dígitos (der→izq): 3 1 7 8 9 3 7 2 9 9 7
¿duplicar?:        n s n s n s n s n s n
resultado:         3 2 7 7 9 6 7 4 9 9 7     (8*2=16→7, 9*2=18→9 ...)
suma = 70  → 70 % 10 == 0 → válido
```

La restricción que vuelve interesante el problema: **debes procesar cada carácter antes de leer el siguiente** (como si llegaran por un stream) y no sabes de antemano cuántos dígitos hay. Eso es un problema, porque qué dígitos se duplican depende de la posición contada **desde la derecha**, y no sabes dónde está la derecha hasta el final.

Apliquemos el método:

**Reducción A: convertir un carácter en número.** `"7".charCodeAt(0) - "0".charCodeAt(0)` da `7`. Pieza trivial, pero aislarla evita errores.

**Reducción B: suma simple, longitud fija.** Leer 6 dígitos y sumarlos, comprobar divisibilidad por 10. Fácil.

**Reducción C: Luhn con longitud fija.** Si sabes que siempre son 6 dígitos, sabes qué posiciones duplicar (las impares contando desde la izquierda, en este caso). Separas la lógica del duplicado en una función:

```ts
function doubledDigitValue(d: number): number {
  const doubled = d * 2;
  return doubled >= 10 ? doubled - 9 : doubled;
}
```

**Reducción D: el problema de la longitud desconocida.** Aquí está la dificultad real, y la descubriste gracias a reducir. Para atacarla, el libro usa un problema auxiliar: "leer números y al final decir si eran mayoría positivos o negativos, sin guardar todos". La solución es **llevar las dos cuentas a la vez** y decidir al final. Con Luhn es igual: llevas dos sumas en paralelo, una que asume que la longitud es par y otra que asume que es impar. Al terminar, ya sabes la longitud y eliges la suma correcta.

```ts
export function isValidLuhn(stream: Iterable<string>): boolean {
  let sumIfEven = 0; // suma correcta si la longitud total resulta par
  let sumIfOdd = 0;  // suma correcta si la longitud total resulta impar
  let position = 0;  // posición desde la izquierda, empieza en 0

  for (const ch of stream) {
    if (ch < "0" || ch > "9") return false;
    const d = ch.charCodeAt(0) - 48;
    // Con longitud par, se duplican las posiciones pares desde la izquierda (0, 2, 4...).
    // Con longitud impar, se duplican las impares (1, 3, 5...).
    if (position % 2 === 0) {
      sumIfEven += doubledDigitValue(d);
      sumIfOdd += d;
    } else {
      sumIfEven += d;
      sumIfOdd += doubledDigitValue(d);
    }
    position++;
  }
  if (position === 0) return false;
  const total = position % 2 === 0 ? sumIfEven : sumIfOdd;
  return total % 10 === 0;
}
```

Verifica con un ejemplo de longitud par y uno de longitud impar antes de creerle al código. En una entrevista o en el trabajo, con un array completo simplemente recorrerías desde la derecha; la restricción del stream existía para forzarte a pensar en el **estado mínimo** que necesitas recordar. Esa forma de pensar aparece en sistemas reales: procesar logs gigantes, datos de sensores o streams de red donde no puedes guardar todo.

### Parte 3: seguir el estado

El tercer tipo de puzzle es el más rico: el significado de cada entrada **depende de un modo** que cambia mientras lees. Vamos a resolver un problema propio, del mismo estilo que el del libro.

**Problema: decodificador con modos.** Recibes una cadena de enteros positivos separados por comas. Hay dos modos: `LETTER` y `DIGIT`. Empiezas en `LETTER`.

- En `LETTER`, el número módulo 27 indica una letra (1 = a, 2 = b, …, 26 = z).
- En `DIGIT`, el número módulo 11 indica un dígito (1 = "0", 2 = "1", …, 10 = "9").
- Si el módulo da 0, **no se imprime nada** y se cambia al otro modo.

Ejemplo: `"8,9,27,3,4,11,1"` → `8 % 27 = 8 → "h"`, `9 → "i"`, `27 % 27 = 0 → cambio a DIGIT`, `3 % 11 = 3 → "2"`, `4 → "3"`, `11 % 11 = 0 → cambio a LETTER`, `1 → "a"`. Resultado: `"hi23a"`.

**Descomposición:**

1. Leer números de una cadena separada por comas, procesando carácter a carácter (acumular dígitos hasta ver una coma o el final). Pieza aislada, probada sola.
2. Convertir un número en letra para un valor 1–26.
3. Convertir un número en dígito para un valor 1–10.
4. Llevar el modo y cambiarlo cuando el módulo da 0.

Cada pieza es pequeña. La pieza 4 es la del **estado**. Conviene modelarlo explícitamente con un tipo:

```ts
type Mode = "LETTER" | "DIGIT";

function decode(input: string): string {
  let mode: Mode = "LETTER";
  let output = "";
  let current = 0;
  let hasDigits = false;

  const flush = () => {
    if (!hasDigits) return;
    const divisor = mode === "LETTER" ? 27 : 11;
    const r = current % divisor;
    if (r === 0) {
      mode = mode === "LETTER" ? "DIGIT" : "LETTER";
    } else if (mode === "LETTER") {
      output += String.fromCharCode(96 + r);  // 97 es "a"
    } else {
      output += String(r - 1);
    }
    current = 0;
    hasDigits = false;
  };

  for (const ch of input) {
    if (ch === ",") flush();
    else { current = current * 10 + (ch.charCodeAt(0) - 48); hasDigits = true; }
  }
  flush(); // el último número no termina en coma
  return output;
}
```

Fíjate en el `flush()` final: es el típico caso borde que se olvida. Lo descubres si pruebas con una entrada que no termina en coma (es decir, casi todas).

### Diagrama de estados

Cuando un problema tiene modos, dibujar un **diagrama de estados** antes de programar ahorra mucho tiempo:

```
          módulo 0
   ┌─────────────────────┐
   ▼                     │
[LETTER] ── módulo 0 ──► [DIGIT]
   │  ▲                   │  ▲
   └──┘ módulo≠0:         └──┘ módulo≠0:
        emitir letra           emitir dígito
```

Cada flecha es una transición; cada nodo, un modo. Si el diagrama está bien, el código es casi una traducción directa. Este patrón (máquina de estados finitos) aparece en parsers, protocolos de red, flujos de UI ("cargando", "listo", "error") y lógica de juegos.

### Parte 4: un problema que combina todo

**Problema: compresión por repeticiones (run-length encoding).** Recibes una cadena como `"aaabccdddd"` y debes devolver `"a3b1c2d4"`. Restricción: procesas carácter a carácter, una sola pasada.

Apliquemos las tres herramientas de la sesión.

**¿Qué estado mínimo necesito?** Al leer un carácter, solo me importa saber cuál era el carácter del grupo actual y cuántas veces lo vi. No necesito guardar la cadena entera. Estado: `currentChar` y `count`.

**¿Cuáles son las transiciones?** Hay dos situaciones al leer un carácter `ch`:

| Situación | Acción sobre el estado | Salida |
| --- | --- | --- |
| `ch === currentChar` | `count++` | nada |
| `ch !== currentChar` | emitir grupo anterior, `currentChar = ch`, `count = 1` | `currentChar + count` |

Y una situación especial: el **final de la entrada**, donde hay que emitir el último grupo (otra vez el `flush`). También el **inicio**, donde todavía no hay grupo anterior que emitir.

**Reducción previa:** antes de escribir la versión final, resuelve una más simple: "cuenta cuántos grupos de caracteres iguales hay" (`"aaabccdddd"` → 4). Esa versión ya obliga a detectar el cambio de grupo, que es la parte delicada, sin preocuparte por construir la salida.

```ts
export function runLengthEncode(input: string): string {
  let output = "";
  let currentChar: string | null = null;
  let count = 0;

  for (const ch of input) {
    if (ch === currentChar) {
      count++;
    } else {
      if (currentChar !== null) output += currentChar + count;
      currentChar = ch;
      count = 1;
    }
  }
  if (currentChar !== null) output += currentChar + count; // flush final
  return output;
}
```

Recorrido con `"aab"`:

```
ch='a': currentChar=null → no emite; currentChar='a', count=1
ch='a': igual → count=2
ch='b': distinto → emite "a2"; currentChar='b', count=1
fin:    flush → emite "b1"          resultado: "a2b1"
```

Casos borde que debes probar: cadena vacía (debe devolver `""`, y el `null` inicial lo garantiza), un solo carácter (`"z"` → `"z1"`), todo igual (`"zzzz"` → `"z4"`) y todo distinto (`"abc"` → `"a1b1c1"`).

Observa que el problema más "nuevo" de la sesión se resolvió casi solo porque ya tenías las piezas mentales: estado mínimo (de Luhn), transiciones explícitas (del decodificador) y el `flush` final. Eso es exactamente lo que significa **construir sobre lo que sabes**: cada problema resuelto con método deja herramientas reutilizables para el siguiente.

Una pregunta para pensar: ¿qué pasa si la cadena original contiene dígitos, como `"a11"`? La salida `"a121"` se vuelve ambigua al decodificar. Esa observación no es un detalle: es un defecto de diseño del formato, y detectarlo forma parte de resolver bien el problema. Una solución sería usar un separador o limitar la entrada a letras, y esa decisión debería quedar escrita.

### Ensamblar sin miedo a "copiar y pegar"

Cuando ensamblas las piezas, reutilizas código que acabas de escribir. Esto es un buen tipo de copiar y pegar: entiendes cada línea porque la escribiste y la probaste. El mal tipo es pegar código ajeno que no entiendes. La diferencia está en el conocimiento, no en el atajo de teclado.

Otro beneficio del enfoque por piezas: el código "en obra" nunca se vuelve feo ni largo, porque siempre trabajas sobre algo pequeño. Un programador experto podría escribir la solución final de una vez, pero tendría pasos falsos, código comentado y vuelto a descomentar. Ir por piezas no es de principiantes: es la forma profesional de reducir errores.

### Errores comunes

- **Atacar la forma final directamente.** Empieza siempre por la versión más reducida que puedas resolver.
- **No escribir la tabla fila → cantidad** en los patrones. Sin la tabla, buscas la fórmula a ciegas.
- **Olvidar el último elemento** al procesar entrada delimitada (el `flush` final).
- **Guardar más estado del necesario.** Pregúntate qué es lo mínimo que debes recordar (en Luhn: dos sumas y una posición).
- **Mezclar parsing y lógica** en el mismo bloque de código. Sepáralos: primero obtener números, luego interpretarlos.
- **Probar solo el caso feliz.** Prueba entrada vacía, un solo elemento y longitudes par e impar.

### Para llevarte

Los tres problemas usaron el mismo método: descomponer en piezas, resolver cada una con un programa pequeño y ensamblar. Las herramientas concretas fueron la tabla para encontrar funciones de posición, las cuentas paralelas cuando falta información hasta el final y el modelo explícito de estados.

## Conceptos clave

- **Puzzle puro**: problema con herramientas mínimas donde toda la dificultad está en el razonamiento.
- **Función de posición**: fórmula que da, para cada número de fila o índice, la cantidad o el valor esperado.
- **Contar al revés contando hacia adelante**: usar `max + 1 - i` para invertir un contador ascendente.
- **Procesamiento de stream**: leer cada elemento una vez, sin poder volver atrás, guardando solo el estado mínimo.
- **Cuentas paralelas**: llevar varias hipótesis a la vez y elegir la correcta cuando llega la información que faltaba.
- **Máquina de estados**: modelo con modos y transiciones donde el significado de una entrada depende del modo actual.
- **Flush final**: procesar el último elemento acumulado cuando la entrada termina sin delimitador.

## Preguntas de repaso

1. ¿Cómo encuentras la fórmula para la cantidad de `#` de cada fila en un patrón simétrico?
   R: Haces una tabla con el número de fila y la cantidad deseada, y buscas una expresión que la produzca. Para patrones que suben y bajan, `pico - |row - centro|` suele funcionar, porque el valor absoluto convierte una recta en una "V" y restarlo la invierte.
2. En la validación de Luhn procesando un stream, ¿por qué hacen falta dos sumas?
   R: Porque los dígitos que se duplican dependen de su posición contada desde la derecha, y no conoces la longitud total hasta el final. Llevas una suma que asume longitud par y otra que asume longitud impar; al terminar sabes la longitud y eliges la correcta.
3. ¿Qué es una máquina de estados y por qué ayuda en el decodificador con modos?
   R: Es un modelo con un conjunto finito de modos y reglas de transición entre ellos. En el decodificador, el significado de cada número depende del modo actual; modelar el modo como un tipo explícito y dibujar sus transiciones hace que el código sea una traducción directa del diagrama y evita condiciones enredadas.
4. ¿Por qué es un error frecuente olvidar el `flush()` al final del bucle?
   R: Porque el último número no va seguido de un delimitador, así que la lógica que procesa "al ver una coma" nunca se ejecuta para él. Sin un procesamiento explícito al final, el último elemento se pierde.
5. ¿Por qué no es un objetivo minimizar el número de pasos al descomponer?
   R: Porque la meta es llegar a un programa correcto en el menor tiempo, no en el menor número de pasos. Pasos más pequeños son más fáciles, generan menos errores y menos frustración; un paso grande y difícil suele costar más tiempo total.

## Ejercicio

Implementa en TypeScript `drawDiamond(n: number): string` que devuelva un rombo de `#` con `2n - 1` filas (la fila central tiene `2n - 1` hashes, centrados con espacios), usando solo concatenaciones de `"#"`, `" "` y `"\n"`. Antes, escribe en un comentario la tabla fila → espacios → hashes para `n = 3`, y resuelve primero las reducciones (triángulo centrado creciente, luego decreciente).

Criterio de terminado: la tabla está en el comentario; `drawDiamond(1)` devuelve `"#\n"`; `drawDiamond(3)` produce 5 filas con 1, 3, 5, 3, 1 hashes centrados; tienes tests que lo verifican.

## Explícalo con tus palabras

Explica, como si fuera para un compañero que empieza, por qué la validación de Luhn sobre un stream necesita dos sumas y qué idea general de "estado mínimo" hay detrás.
