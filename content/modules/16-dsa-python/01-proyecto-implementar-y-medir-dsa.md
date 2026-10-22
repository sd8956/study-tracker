---
title: Proyecto — implementar y medir estructuras de datos y algoritmos en Python
kind: project
hours: 3
sources: Proyecto propio sobre Data Structures and Algorithms in Python | Comparación opcional con el módulo 01 (tabla hash, heap y grafos en TypeScript)
links: Data Structures and Algorithms in Python (DataCamp) | https://www.datacamp.com/courses/data-structures-and-algorithms-in-python ; timeit (documentación) | https://docs.python.org/3/library/timeit.html
---

## Objetivo

Implementar desde cero en Python una linked list, una stack, una queue, un binary search tree, búsqueda en grafos (BFS y DFS) y cinco algoritmos de ordenamiento; probarlos y medir si escalan como predice Big O frente a las versiones de la librería estándar. Como extensión opcional, comparar una tabla hash, un heap y Dijkstra con lo que construiste en TypeScript en el módulo 01.

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

- Ordenamiento: n = 1.000, 10.000 y 100.000 (los O(n²) solo hasta 10.000) con datos aleatorios, ya ordenados e invertidos; compara cada uno con `sorted()`.
- BST: insertar 100.000 claves aleatorias frente a ordenadas (verás la degeneración) y su altura en cada caso. Si la recursión desborda con las claves ordenadas, usa inserción iterativa.
- Queue: tu `Queue` frente a `list.pop(0)` y `collections.deque` para 100.000 encolados y desencolados.
- Stack: tu `Stack` frente a `list.append` / `list.pop`.

Para cada medición, anota antes de ejecutar qué esperas que pase al multiplicar n por 10 según su Big O, y compara después con lo medido.

### Extensión opcional: comparar con tu código del módulo 01

En el módulo 01 implementaste en TypeScript una tabla hash (`HashMap` con encadenamiento y `OpenHashMap` con sondeo lineal), un `MinHeap` y Dijkstra con heap y lazy deletion. Si quieres cerrar el círculo:

- **Tabla hash:** porta tu `OpenHashMap` a Python y mídelo contra `dict` insertando y consultando 100.000 claves; mide también tu versión TypeScript contra `Map` en Node con `performance.now()`.
- **Heap:** porta tu `MinHeap` y compáralo con `heapq` en `top_k` sobre 1.000.000 de números; repite con tu `topK` en TypeScript.
- **Grafos:** ejecuta tu BFS en Python y tu Dijkstra en TypeScript sobre el mismo grafo aleatorio generado con semilla, y compara la forma en que crece el tiempo al duplicar V y E.

Compara la **forma** del crecimiento (cuánto sube al multiplicar n), no los milisegundos absolutos: dos runtimes distintos tienen constantes distintas.

## Qué hacer

1. Implementa `LinkedList`, `Stack`, `Queue` y `BST` con sus pruebas (55 min).
2. Implementa BFS, DFS y camino más corto en un grafo no ponderado, con pruebas que incluyan un grafo con ciclo y uno desconectado (35 min).
3. Implementa los cinco ordenamientos y una prueba parametrizada que compare cada uno con `sorted()` sobre 200 listas aleatorias (35 min).
4. Escribe `bench.py` y ejecuta todas las mediciones (25 min).
5. Completa `COMPARACION.md` con una tabla de resultados y tres conclusiones: qué escala como predice Big O, dónde gana la librería estándar (Timsort, `deque`, `dict`) y por qué, y qué medición no coincidió con tu predicción. Si hiciste la extensión opcional, agrega una sección con la comparación contra tu código TypeScript del módulo 01 (20 min).
6. Criterio de terminado: `pytest` pasa, `bench.py` imprime todas las mediciones y `COMPARACION.md` explica al menos un resultado que te sorprendió (10 min).

## Explícalo con tus palabras

Explica por qué `sorted()` de Python le gana a tu merge sort aunque ambos sean O(n log n).
