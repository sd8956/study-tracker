---
title: Evaluación — estructuras de datos y algoritmos en Python
kind: evaluation
hours: 3
sources: Data Structures and Algorithms in Python (DataCamp)
links: Data Structures and Algorithms in Python (DataCamp) | https://app.datacamp.com/learn/courses/data-structures-and-algorithms-in-python
---

## Objetivo

Comprobar que puedes elegir, implementar y analizar estructuras de datos y algoritmos en Python. Hazla como un examen: 3 horas, sin DataCamp, sin notas y sin buscar en internet. Primero responde todas las preguntas por escrito (o en un archivo `.py`/`.sql` cuando pidan código) durante unas 2 horas. Luego usa el tutor de la app para calificar cada respuesta contra la respuesta modelo, y dedica la última hora a repasar en DataCamp los capítulos donde fallaste.

## Preguntas de evaluación

1. ¿Cuál es la complejidad de acceder por índice, insertar al inicio y buscar un valor en una list de Python y en una linked list?
   R: List: acceso O(1), insertar al inicio O(n), buscar O(n). Linked list: acceso O(n), insertar al inicio O(1), buscar O(n).
2. Implementa una función que verifique si los paréntesis `()[]{}` de un string están balanceados.
   R: Una pila guarda las aperturas pendientes:
   ```python
   def balanceado(s):
       pares = {')': '(', ']': '[', '}': '{'}
       pila = []
       for c in s:
           if c in '([{':
               pila.append(c)
           elif c in pares:
               if not pila or pila.pop() != pares[c]:
                   return False
       return not pila
   ```
3. ¿Por qué el dict de Python tiene búsquedas O(1) en promedio y qué pasa en el peor caso?
   R: Porque calcula el hash de la clave y accede directo a su posición en una tabla. En el peor caso, si muchas claves colisionan, la búsqueda se degrada hacia O(n).
4. Escribe la función recursiva de búsqueda en un BST cuyo nodo tiene `valor`, `izq` y `der`.
   R: Cada llamada descarta la mitad del árbol que no puede contener el valor:
   ```python
   def buscar(nodo, x):
       if nodo is None:
           return False
       if x == nodo.valor:
           return True
       if x < nodo.valor:
           return buscar(nodo.izq, x)
       return buscar(nodo.der, x)
   ```
5. ¿Qué diferencia hay entre DFS y BFS en estructura usada y en lo que garantizan?
   R: DFS usa una pila (o recursión) y explora en profundidad; no garantiza el camino más corto. BFS usa una cola y explora por niveles; garantiza el camino con menos aristas en grafos no ponderados.
6. Escribe merge sort en Python.
   R: Divide, ordena cada mitad y mezcla:
   ```python
   def merge_sort(xs):
       if len(xs) <= 1:
           return xs
       mid = len(xs) // 2
       izq, der = merge_sort(xs[:mid]), merge_sort(xs[mid:])
       res, i, j = [], 0, 0
       while i < len(izq) and j < len(der):
           if izq[i] <= der[j]:
               res.append(izq[i]); i += 1
           else:
               res.append(der[j]); j += 1
       return res + izq[i:] + der[j:]
   ```
7. ¿Qué significa que un algoritmo de ordenamiento sea estable y cuándo importa?
   R: Que los elementos con la misma clave conservan su orden original. Importa cuando ordenas por varios criterios en pasadas sucesivas (por ejemplo, primero por nombre y luego por fecha, para que dentro de la misma fecha sigan por nombre).
8. ¿Cuál es la complejidad de `fib(n)` recursivo ingenuo y cómo la mejoras?
   R: O(2^n), porque recalcula los mismos subproblemas muchas veces. Con memoización (`functools.lru_cache`) o con un bucle iterativo baja a O(n).
9. ¿Qué observaste (o esperarías observar) al insertar 100.000 claves ordenadas en un BST simple, y por qué?
   R: El árbol degenera en una lista: altura n, inserciones y búsquedas O(n), y con recursión puede incluso superar el límite de recursión. Ocurre porque cada clave nueva es mayor que todas y siempre va a la derecha.

## Explícalo con tus palabras

Explica cómo eliges una estructura de datos para un problema nuevo: qué operaciones son frecuentes y qué complejidad necesitas para cada una.
