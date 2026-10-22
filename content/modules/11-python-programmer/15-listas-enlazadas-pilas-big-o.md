---
title: Listas enlazadas, pilas y Big O
kind: course
hours: 2
sources: DataCamp — Data Structures and Algorithms in Python, cap. 1
links: Data Structures and Algorithms in Python (DataCamp) | https://www.datacamp.com/courses/data-structures-and-algorithms-in-python
---

## Objetivo

Implementar listas enlazadas y pilas en Python y analizar la complejidad de algoritmos con notación Big O.

## Qué hacer

1. Abre *Data Structures and Algorithms in Python* en DataCamp (ver enlaces de la sesión) y completa el capítulo 1 «Work with Linked Lists and Stacks and Understand Big O notation» (~60 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Dibuja en papel cómo cambian los punteros al insertar y al borrar un nodo en medio de la lista, y anota por qué cada operación es O(1) u O(n) (15 min).
4. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
5. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Linked list**: nodos con dato y referencia al siguiente; insertar al inicio es O(1), buscar es O(n).
- **Stack (LIFO)**: último en entrar, primero en salir: `push`, `pop`, `peek`; en Python, `list.append`/`list.pop` o `collections.deque`.
- **Big O**: cómo crece el tiempo o la memoria con el tamaño de la entrada en el peor caso.
- **Complejidades comunes**: O(1), O(log n), O(n), O(n log n), O(n²).
- **Simplificación**: se eliminan constantes y términos menores: O(2n + 5) es O(n).

## Preguntas de repaso

1. ¿Qué costo tiene insertar al inicio de una linked list y al inicio de una list de Python?
   R: En la linked list O(1): solo cambias el puntero de la cabeza. En la list de Python O(n), porque debe mover todos los elementos una posición.
2. ¿Cuál es la complejidad de un algoritmo con dos bucles anidados sobre la misma lista de tamaño n?
   R: O(n²).
3. Da un uso real de una pila.
   R: El historial de deshacer de un editor, la pila de llamadas de funciones o verificar paréntesis balanceados.

## Explícalo con tus palabras

Explica Big O a alguien sin formación técnica usando el tiempo que tardas en encontrar un nombre en una lista desordenada frente a una ordenada.
