---
title: List comprehensions y generators
kind: course
hours: 2
sources: DataCamp — Python Toolbox, cap. 2
links: Python Toolbox (DataCamp) | https://www.datacamp.com/courses/python-toolbox
---

## Objetivo

Escribir list/dict comprehensions con condiciones, y usar generator expressions y funciones con `yield` para producir datos bajo demanda.

## Qué hacer

1. Abre *Python Toolbox* en DataCamp (ver enlaces de la sesión) y completa el capítulo 2 «List comprehensions and generators» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **List comprehension**: `[expr for x in iterable if cond]` crea una lista en una línea.
- **Condición en el filtro vs en la expresión**: `[x for x in xs if x > 0]` filtra; `[x if x > 0 else 0 for x in xs]` transforma todos.
- **Comprehension anidada**: `[[f(i, j) for j in cols] for i in filas]` construye una matriz.
- **Dict comprehension**: `{k: v for k, v in pares}` crea un dict.
- **Generator expression**: igual que la comprehension pero con paréntesis; no construye la lista, produce valores bajo demanda (lazy).
- **yield**: convierte una función en generator function: pausa y devuelve un valor, y continúa en la siguiente llamada a `next()`.

## Preguntas de repaso

1. Escribe una comprehension que devuelva los cuadrados de los pares de 0 a 9.
   R: `[x ** 2 for x in range(10) if x % 2 == 0]` → `[0, 4, 16, 36, 64]`.
2. ¿Qué ventaja tiene `sum(x * x for x in range(10**8))` frente a `sum([x * x for x in range(10**8)])`?
   R: La generator expression no crea una lista de 100 millones de elementos en memoria; produce cada valor cuando `sum` lo pide. El uso de memoria es constante.
3. ¿Qué hace `yield` en una función?
   R: Convierte la función en un generator: al llamarla devuelve un objeto generator; cada `next()` ejecuta hasta el siguiente `yield`, entrega ese valor y deja la función pausada con su estado local intacto.
4. ¿Cuándo NO conviene una comprehension?
   R: Cuando la lógica tiene varios pasos, efectos secundarios o anidaciones profundas: un `for` normal es más legible. Tampoco si solo necesitas recorrer una vez valores muy grandes: usa un generator.

## Explícalo con tus palabras

Explica la diferencia entre una lista y un generator usando la analogía de una panadería que hornea todo el pan por la mañana frente a una que hornea cada pan cuando llega un cliente.
