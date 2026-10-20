---
title: Evaluación — Python Programming Fundamentals
kind: evaluation
hours: 3
sources: Python Programming Fundamentals (DataCamp), todo el track
links: Python Programming Fundamentals (DataCamp) | https://app.datacamp.com/learn/skill-tracks/python-programming-fundamentals
---

## Objetivo

Comprobar que dominas los fundamentos de Python antes de pasar a SQL Server. Hazla como un examen: 3 horas, sin DataCamp, sin notas y sin buscar en internet. Primero responde todas las preguntas por escrito (o en un archivo `.py`/`.sql` cuando pidan código) durante unas 2 horas. Luego usa el tutor de la app para calificar cada respuesta contra la respuesta modelo, y dedica la última hora a repasar en DataCamp los capítulos donde fallaste.

## Preguntas de evaluación

1. ¿Qué imprime `print([1, 2, 3][::-1])` y qué hace `[::-1]`?
   R: `[3, 2, 1]`. Es slicing con paso -1: recorre la secuencia de atrás hacia adelante y devuelve una copia invertida.
2. Explica la diferencia entre `==` e `is`.
   R: `==` compara valores (igualdad); `is` compara identidad (si son el mismo objeto en memoria). Se usa `is` casi solo para `None`: `if x is None`.
3. ¿Qué valores son falsy en Python? Da al menos cinco.
   R: `False`, `None`, `0`, `0.0`, `''`, `[]`, `{}`, `set()` y `()`. Todo lo demás es truthy, salvo objetos que definan `__bool__` o `__len__` para devolver falso.
4. Escribe una dict comprehension que mapee cada palabra de `palabras` a su longitud, solo para palabras de más de 3 letras.
   R: `{p: len(p) for p in palabras if len(p) > 3}`.
5. ¿Qué imprime este código y por qué? `def f(x, acc=[]): acc.append(x); return acc` seguido de `f(1); print(f(2))`.
   R: `[1, 2]`. El valor por defecto `acc=[]` se crea una sola vez al definir la función, así que ambas llamadas comparten la misma lista.
6. Escribe una generator function `pares(n)` que entregue los números pares de 0 a n inclusive, y explica qué devuelve `pares(10)` sin `list()`.
   R: Una función con `yield` dentro de un bucle:
   ```python
   def pares(n):
       for i in range(0, n + 1, 2):
           yield i
   ```
   `pares(10)` devuelve un objeto generator; no calcula nada hasta que alguien pide valores con `next()`, un `for` o `list()`.
7. Tienes `ventas = [('ana', 10), ('luis', 5), ('ana', 7)]`. Escribe código que devuelva el total por vendedor.
   R: Un `defaultdict(int)` acumula sin comprobar si la clave existe:
   ```python
   from collections import defaultdict
   totales = defaultdict(int)
   for nombre, monto in ventas:
       totales[nombre] += monto
   # {'ana': 17, 'luis': 5}
   ```
8. ¿Qué diferencia hay entre un iterable y un iterador, y qué pasa si recorres dos veces un generator?
   R: El iterable puede producir iteradores nuevos (`iter()`) y por eso se recorre muchas veces; el iterador tiene estado y se agota. Un generator es un iterador: la segunda vez que lo recorres no produce nada.
9. Escribe una función `a_entero(texto)` que convierta un string a int y devuelva `None` si no es un número válido.
   R: Captura solo `ValueError`, que es lo que lanza `int()` con texto inválido:
   ```python
   def a_entero(texto):
       try:
           return int(texto)
       except ValueError:
           return None
   ```
10. ¿Cuándo usarías un set en lugar de una list para comprobar pertenencia, y por qué es más rápido?
   R: Cuando haces muchas búsquedas `x in coleccion`. El set usa una tabla hash: la búsqueda es O(1) en promedio, mientras que en una list es O(n) porque recorre elemento por elemento.

## Explícalo con tus palabras

Resume en un minuto, sin notas, las cinco ideas de Python que más te sorprendieron viniendo de TypeScript.
