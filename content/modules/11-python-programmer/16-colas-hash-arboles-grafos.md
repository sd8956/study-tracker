---
title: Colas, hash tables, árboles, grafos y recursión
kind: course
hours: 2
sources: DataCamp — Data Structures and Algorithms in Python, cap. 2
links: Data Structures and Algorithms in Python (DataCamp) | https://www.datacamp.com/courses/data-structures-and-algorithms-in-python
---

## Objetivo

Conocer colas, hash tables, árboles y grafos, cómo se representan en Python y cómo funciona la recursión.

## Qué hacer

1. Abre *Data Structures and Algorithms in Python* en DataCamp (ver enlaces de la sesión) y completa el capítulo 2 «Queues, Hash Tables, Trees, Graphs, and Recursion» (~60 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Queue (FIFO)**: primero en entrar, primero en salir; en Python, `collections.deque` o `queue.SimpleQueue`.
- **Hash table**: acceso O(1) promedio por clave; el dict de Python es una hash table.
- **Árbol**: nodos con hijos y una raíz; un árbol binario tiene hasta dos hijos por nodo.
- **Grafo**: vértices y aristas; se representa con listas de adyacencia (dict de listas).
- **Recursión**: una función que se llama a sí misma con un problema más pequeño; necesita caso base.
- **Call stack**: cada llamada recursiva ocupa un marco; demasiadas causan `RecursionError`.

## Preguntas de repaso

1. ¿Por qué no conviene usar `list.pop(0)` como cola en Python?
   R: Porque es O(n): mueve todos los elementos. `collections.deque.popleft()` es O(1).
2. ¿Qué pasa si una función recursiva no tiene caso base?
   R: Se llama indefinidamente hasta agotar el límite de recursión y Python lanza `RecursionError`.
3. ¿Cómo representas un grafo dirigido pequeño en Python?
   R: Con un dict de listas de adyacencia: `{'A': ['B', 'C'], 'B': ['C'], 'C': []}`.

## Explícalo con tus palabras

Explica la recursión con la imagen de muñecas rusas: qué es el caso base y qué es el paso recursivo.
