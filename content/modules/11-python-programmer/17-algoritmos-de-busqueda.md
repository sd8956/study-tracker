---
title: Algoritmos de búsqueda — lineal, binaria, DFS, BFS y BST
kind: course
hours: 2
sources: DataCamp — Data Structures and Algorithms in Python, cap. 3
links: Data Structures and Algorithms in Python (DataCamp) | https://www.datacamp.com/courses/data-structures-and-algorithms-in-python
---

## Objetivo

Implementar búsqueda lineal y binaria, recorrer grafos en profundidad y en anchura, y buscar en un binary search tree.

## Qué hacer

1. Abre *Data Structures and Algorithms in Python* en DataCamp (ver enlaces de la sesión) y completa el capítulo 3 «Searching algorithms» (~60 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Búsqueda lineal**: revisa uno por uno; O(n); funciona sin orden.
- **Búsqueda binaria**: parte a la mitad una colección ordenada; O(log n).
- **Binary search tree**: a la izquierda menores y a la derecha mayores; buscar, insertar y borrar en O(log n) si está balanceado.
- **DFS**: profundidad primero con una pila (o recursión); útil para recorrer todo o detectar ciclos.
- **BFS**: anchura primero con una cola; encuentra el camino más corto en grafos no ponderados.
- **Recorridos de árbol**: in-order (devuelve ordenado en un BST), pre-order y post-order.

## Preguntas de repaso

1. ¿Qué requisito tiene la búsqueda binaria y cuál es su complejidad?
   R: La colección debe estar ordenada; su complejidad es O(log n).
2. ¿Qué estructura usa BFS y por qué encuentra el camino más corto en un grafo no ponderado?
   R: Una cola: visita los nodos por niveles de distancia, así que el primer camino que llega a un nodo es el de menos aristas.
3. ¿Qué recorrido de un BST devuelve los valores ordenados?
   R: El in-order: izquierda, nodo, derecha.
4. ¿Cuándo un BST degenera a O(n)?
   R: Cuando se insertan datos ya ordenados: el árbol queda como una lista enlazada. Los árboles balanceados (AVL, rojo-negro) lo evitan.

## Explícalo con tus palabras

Explica DFS y BFS con la búsqueda de una salida en un laberinto: el que avanza hasta chocar y el que expande en círculos.
