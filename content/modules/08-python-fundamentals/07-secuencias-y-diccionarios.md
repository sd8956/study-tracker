---
title: Secuencias y diccionarios en profundidad
kind: course
hours: 2
sources: DataCamp — Data Types in Python, caps. 1–2
links: Data Types in Python (DataCamp) | https://www.datacamp.com/courses/data-types-in-python
---

## Objetivo

Manipular lists, strings y dicts con fluidez: agregar, ordenar, buscar, recorrer datos anidados y combinar dicts.

## Qué hacer

1. Abre *Data Types in Python* en DataCamp (ver enlaces de la sesión) y completa el capítulo 1 «Fundamental Sequence Data Types» y el capítulo 2 «Dictionaries - The Root of Python» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **append / extend / insert**: agregan un elemento al final, varios elementos o en una posición.
- **sorted vs list.sort**: `sorted()` devuelve una lista nueva; `.sort()` ordena en el lugar y devuelve `None`.
- **Strings inmutables**: los métodos de str (`upper`, `split`, `join`, `strip`) devuelven strings nuevos.
- **Recorrer dicts**: `.keys()`, `.values()`, `.items()`; el orden de inserción se conserva desde Python 3.7.
- **Datos anidados**: dicts de dicts o de lists: `datos['2012']['F'][0]`.
- **update y pop**: `d.update(otro)` mezcla claves; `d.pop(k, None)` elimina sin fallar si no existe.

## Preguntas de repaso

1. ¿Qué devuelve `lista.sort()` y por qué es una trampa común?
   R: Devuelve `None` porque ordena la lista en el lugar. Si escribes `ordenada = lista.sort()`, `ordenada` queda en `None`; para obtener una lista nueva usa `sorted(lista)`.
2. ¿Cómo unes `['a', 'b', 'c']` en el string `'a-b-c'`?
   R: `'-'.join(['a', 'b', 'c'])`.
3. Tienes `nombres = {}` y quieres agrupar nombres por año. ¿Cómo agregas `'Ana'` al año 2012 sin que falle si el año no existe?
   R: `nombres.setdefault(2012, []).append('Ana')`, o comprobar `if 2012 not in nombres: nombres[2012] = []` antes de agregar. (En la sesión siguiente verás `defaultdict`, que lo resuelve más limpio.)
4. ¿Cómo eliminas una clave de un dict sin lanzar `KeyError` si no existe?
   R: `d.pop(clave, None)`: devuelve el valor eliminado o `None` si la clave no estaba.

## Explícalo con tus palabras

Explica por qué se dice que «los dicts son la raíz de Python» (piensa en módulos, objetos y kwargs) con dos ejemplos concretos.
