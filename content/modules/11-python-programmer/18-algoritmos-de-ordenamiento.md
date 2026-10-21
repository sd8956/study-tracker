---
title: Algoritmos de ordenamiento
kind: course
hours: 2
sources: DataCamp — Data Structures and Algorithms in Python, cap. 4
links: Data Structures and Algorithms in Python (DataCamp) | https://www.datacamp.com/courses/data-structures-and-algorithms-in-python
---

## Objetivo

Implementar bubble sort, selection sort, insertion sort, merge sort y quicksort y comparar su complejidad.

## Qué hacer

1. Abre *Data Structures and Algorithms in Python* en DataCamp (ver enlaces de la sesión) y completa el capítulo 4 «Sorting algorithms» (~60 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Bubble sort**: intercambia vecinos desordenados en pasadas sucesivas; O(n²), O(n) si ya está ordenado con corte temprano.
- **Selection sort**: elige el mínimo restante y lo coloca; siempre O(n²).
- **Insertion sort**: inserta cada elemento en la parte ya ordenada; O(n²) en el peor caso, muy bueno con datos casi ordenados.
- **Merge sort**: divide en mitades, ordena y mezcla; O(n log n) siempre, usa memoria extra O(n).
- **Quicksort**: particiona alrededor de un pivote; O(n log n) promedio, O(n²) en el peor caso.
- **Estabilidad**: un orden estable conserva el orden relativo de elementos iguales; `sorted()` de Python (Timsort) lo es.

## Preguntas de repaso

1. ¿Por qué merge sort es O(n log n)?
   R: Porque divide la lista a la mitad log n veces y en cada nivel mezcla n elementos en total.
2. ¿Cuándo quicksort cae a O(n²) y cómo se evita?
   R: Cuando el pivote es siempre el menor o el mayor (por ejemplo, el primer elemento en datos ya ordenados). Se evita eligiendo el pivote al azar o con la mediana de tres.
3. ¿Por qué insertion sort puede ser buena opción para listas pequeñas o casi ordenadas?
   R: Porque con datos casi ordenados hace muy pocos desplazamientos (se acerca a O(n)) y tiene muy poco costo fijo; Timsort lo usa para tramos pequeños.

## Explícalo con tus palabras

Explica merge sort con un mazo de cartas dividido entre amigos que luego juntan sus montones ordenados.
