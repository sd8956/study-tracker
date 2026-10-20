---
title: Proyecto — implementar y medir estructuras de datos y algoritmos en Python
kind: project
hours: 3
sources: Proyecto propio sobre Data Structures and Algorithms in Python | Comparación con el módulo 01 (TypeScript)
links: Data Structures and Algorithms in Python (DataCamp) | https://www.datacamp.com/courses/data-structures-and-algorithms-in-python ; timeit (documentación) | https://docs.python.org/3/library/timeit.html
---

## Objetivo

Implementar desde cero en Python una linked list, una stack, una queue, un binary search tree, búsqueda en grafos (BFS y DFS) y cinco algoritmos de ordenamiento; probarlos, medirlos y compararlos con tus implementaciones en TypeScript del módulo 01.

## Estudio

### Estructura del repo

```
dsa/
  estructuras.py     LinkedList, Stack, Queue, BST
  grafos.py          bfs, dfs (iterativo y recursivo), camino_mas_corto
  ordenamiento.py    bubble, selection, insertion, merge, quick
  tests/             pytest: casos normales, vacíos, un elemento, duplicados
  bench.py           mediciones con timeit
  COMPARACION.md     tabla y conclusiones
```

### Qué medir

- Ordenamiento: n = 1.000, 10.000 y 100.000 (los O(n²) solo hasta 10.000) con datos aleatorios, ya ordenados e invertidos; compara también con `sorted()`.
- BST: insertar 100.000 claves aleatorias frente a ordenadas (verás la degeneración) y su altura en cada caso.
- Queue: tu `Queue` frente a `list.pop(0)` y `collections.deque`.
- Repite las mismas mediciones en tu código TypeScript del módulo 01 (con `performance.now()` en Node) para los mismos n.

## Qué hacer

1. Implementa `LinkedList`, `Stack`, `Queue` y `BST` con sus pruebas (55 min).
2. Implementa BFS, DFS y camino más corto en un grafo no ponderado, con pruebas que incluyan un grafo con ciclo y uno desconectado (35 min).
3. Implementa los cinco ordenamientos y una prueba parametrizada que compare cada uno con `sorted()` sobre 200 listas aleatorias (35 min).
4. Escribe `bench.py` y ejecuta todas las mediciones (25 min).
5. Ejecuta las mismas mediciones en TypeScript y completa `COMPARACION.md` con una tabla y tres conclusiones: qué escala como predice Big O, dónde gana el runtime (Timsort, V8) y en qué se diferencia tu código Python del TypeScript (20 min).
6. Criterio de terminado: `pytest` pasa, `bench.py` imprime todas las mediciones y `COMPARACION.md` explica al menos un resultado que te sorprendió (10 min).

## Explícalo con tus palabras

Explica por qué `sorted()` de Python le gana a tu merge sort aunque ambos sean O(n log n).
