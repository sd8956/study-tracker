---
title: Proyecto, set de problemas de entrevista con enfoque escrito
kind: project
hours: 3
sources: Cracking the Coding Interview, cap. VII "Technical Questions" (pp. 72–93) y caps. 1–4, 8 y 10 como inspiración de problemas (pp. 100–123, 142–148, 158–163) | Think Like a Programmer, cap. 8 "Thinking Like a Programmer" (pp. 246–284)
links: LeetCode, para practicar más (opcional) | https://leetcode.com/problemset/ ; NeetCode roadmap | https://neetcode.io/roadmap
---

## Objetivo

Simular una preparación real de entrevista: resolver ocho problemas de distintas categorías aplicando el proceso completo (escuchar, ejemplo, fuerza bruta, BCR, optimizar, recorrer, implementar, probar), dejar por escrito el razonamiento de cada uno y medir tu tiempo para detectar qué categorías necesitas reforzar.

## Estudio

### La plantilla del enfoque escrito

En una entrevista real hablas en voz alta. Aquí lo vas a **escribir**, porque escribir te obliga a ordenar el razonamiento y te deja un registro para repasar. Para cada problema, crea un archivo `NN-nombre.ts` que empiece con este comentario y complétalo **antes** de escribir la solución final:

```ts
/**
 * PROBLEMA: (enunciado con tus palabras)
 * DATOS CLAVE: (restricciones del enunciado que pueden importar)
 * EJEMPLO: (uno grande y no especial, resuelto a mano)
 * CASOS BORDE: (vacío, un elemento, duplicados, negativos, el máximo tamaño...)
 * FUERZA BRUTA: (idea + Big O de tiempo y espacio)
 * BCR: (mejor tiempo concebible y por qué)
 * OPTIMIZACIÓN: (qué técnica usé: BUD, DIY, simplificar, caso base, lluvia de estructuras)
 * SOLUCIÓN FINAL: (idea + Big O de tiempo y espacio)
 * TIEMPO: (minutos hasta tener la solución correcta)
 */
```

### Reglas del ejercicio

- **Cronometra** cada problema: 25 minutos como referencia. Si a los 25 minutos no tienes una solución, escribe en el comentario hasta dónde llegaste, mira la pista correspondiente de este archivo y continúa; anota que usaste la pista.
- **Nada de buscar la solución** en internet ni pedirla a un asistente durante el tiempo cronometrado. Después, sí puedes comparar.
- **Primero corrección, después optimización**: escribe la fuerza bruta como función aparte y úsala en los tests para verificar la versión óptima con entradas aleatorias.
- **Nombres legibles** y funciones pequeñas, como si alguien fuera a revisar tu código.

## Qué hacer

Crea una carpeta `interview-set/` en tu espacio de prácticas con TypeScript y Vitest. Resuelve los ocho problemas en orden. Los enunciados son propios de esta ruta.

### Problema 1: compresión segura (strings)

Dado un string de letras, devuelve su versión comprimida por repeticiones (`"aaabccc"` → `"a3b1c3"`), pero **solo si es más corta** que el original; si no, devuelve el original. Construye el resultado sin concatenaciones cuadráticas.

*Pista si te atascas:* calcula primero la longitud que tendría el resultado comprimido sin construirlo.

### Problema 2: ¿es rotación? (strings)

Dadas dos cadenas `a` y `b` del mismo largo, decide si `b` es una rotación de `a` (`"pelota"` y `"otapel"` sí; `"pelota"` y `"pelato"` no), usando **una sola** llamada a `includes` y nada más que operaciones O(n).

*Pista:* ¿qué contiene `a + a`?

### Problema 3: el punto de cruce (listas enlazadas)

Dos listas enlazadas simples pueden compartir su parte final (a partir de cierto nodo, son el mismo nodo, no solo el mismo valor). Devuelve el primer nodo compartido o `null`. O(a + b) tiempo y O(1) espacio.

*Pista:* si las listas tuvieran la misma longitud, ¿cómo las recorrerías? ¿Cómo logras que la tengan?

### Problema 4: cola con máximo (pilas y colas)

Diseña una cola con `enqueue`, `dequeue` y `max()`, las tres en O(1) amortizado.

*Pista:* recuerda la cola con dos pilas y la pila con mínimo de la sesión 08.

### Problema 5: el ancestro común (árboles)

Dado un árbol binario (no necesariamente de búsqueda) y dos nodos que están en él, devuelve su ancestro común más bajo. Luego resuelve la versión para BST aprovechando el orden.

*Pista:* para el caso general, pregúntale recursivamente a cada subárbol "¿contienes a alguno de los dos?".

### Problema 6: ¿hay camino? y ¿cuántos componentes? (grafos)

Dado un grafo dirigido de tareas, implementa `canReach(from, to)` y `weakComponents()` (cantidad de grupos de nodos conectados si ignoras el sentido de las aristas). Decide y justifica BFS o DFS en cada caso.

*Pista:* para los componentes, construye primero la versión no dirigida del grafo.

### Problema 7: formas de decodificar (recursión y DP)

Un mensaje de letras se codificó como dígitos con `a = 1`, `b = 2`, …, `z = 26`, sin separadores. Dado un string de dígitos, ¿de cuántas formas se puede decodificar? (`"226"` → 3: `bbf`, `vf`, `bz`; `"06"` → 0). Escribe la recursiva, la memoizada y la tabulada con O(1) de espacio.

*Pista:* el estado es la posición en el string; en cada paso puedes consumir uno o dos dígitos, con condiciones.

### Problema 8: buscar en un array rotado (ordenamiento y búsqueda)

Un array ordenado de números distintos fue rotado un número desconocido de posiciones (`[15, 16, 19, 20, 25, 1, 3, 4, 5, 7, 10, 14]`). Encuentra la posición de un valor en O(log n).

*Pista:* al partir por la mitad, al menos una de las dos mitades está ordenada normalmente. ¿Cómo sabes cuál?

### Cierre (30 min): informe y repaso

1. Crea `SUMMARY.md` en la carpeta del proyecto con una tabla: problema, categoría, minutos, ¿usaste pista?, Big O final, técnica de optimización que funcionó.
2. Identifica tus dos categorías más débiles (más tiempo o más pistas) y escribe tres problemas adicionales que vas a resolver de esas categorías durante el repaso de la próxima semana.
3. Actualiza tu `MASTER-PLAN.md` de la sesión 23 con cualquier error nuevo que hayas detectado.

### Criterio de terminado

- Los ocho archivos tienen la plantilla completa (incluido el tiempo).
- Cada problema tiene tests con sus casos borde y, cuando aplica, un test que compara la solución óptima con la fuerza bruta sobre al menos 200 entradas aleatorias.
- Las soluciones finales cumplen el Big O pedido en cada enunciado.
- `SUMMARY.md` existe con la tabla y los tres problemas de refuerzo.

## Preguntas de repaso

1. ¿Por qué conviene escribir la fuerza bruta como función separada aunque no sea la solución final?
   R: Porque sirve como referencia confiable para verificar la solución optimizada: un test puede generar cientos de entradas aleatorias y comprobar que ambas coinciden, lo que encuentra errores en casos borde que no se te ocurrieron.
2. En el problema de la rotación, ¿por qué `b` es rotación de `a` si y solo si `b` aparece dentro de `a + a`?
   R: Porque cualquier rotación de `a` consiste en cortar `a` en un punto y poner la segunda parte delante de la primera, y `a + a` contiene todas esas combinaciones como substrings contiguos de longitud |a|. Con la condición de que tengan el mismo largo, aparecer en `a + a` equivale a ser una rotación.
3. En el problema del array rotado, ¿cómo decides hacia qué mitad seguir?
   R: Comparas el elemento del medio con un extremo para saber qué mitad está ordenada normalmente. Si el valor buscado está dentro del rango de esa mitad ordenada, sigues por ella; si no, sigues por la otra. Así descartas la mitad en cada paso y el costo es O(log n).
4. ¿Qué información útil te da medir el tiempo por problema?
   R: Muestra objetivamente qué categorías te cuestan más, para dirigir el repaso a tus debilidades reales en lugar de practicar lo que ya dominas, que es lo que pide el plan maestro.

## Explícalo con tus palabras

Elige el problema que más te costó y explícalo de principio a fin como lo harías frente a un entrevistador: ejemplo, fuerza bruta, cuello de botella, idea clave y solución final con su costo.
