---
title: Código eficiente — fundamentos y medición
kind: course
hours: 2
sources: DataCamp — Writing Efficient Python Code, caps. 1–2
links: Writing Efficient Python Code (DataCamp) | https://www.datacamp.com/courses/writing-efficient-python-code
---

## Objetivo

Reconocer código Pythonic y eficiente, aprovechar built-ins y NumPy, y medir tiempos y memoria con `%timeit`, `line_profiler` y `memory_profiler`.

## Qué hacer

1. Abre *Writing Efficient Python Code* en DataCamp (ver enlaces de la sesión) y completa el capítulo 1 «Foundations for efficiencies» y el capítulo 2 «Timing and profiling code» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Código eficiente**: rápido (baja latencia) y con poco consumo de memoria; además legible (Pythonic).
- **Built-ins**: `range`, `enumerate`, `map`, `zip` están implementados en C y suelen ganar a bucles manuales.
- **NumPy arrays**: operaciones vectorizadas (broadcasting) sobre arrays homogéneos, mucho más rápidas que bucles sobre listas.
- **%timeit**: mide un fragmento muchas veces y reporta media y desviación; `-r` y `-n` controlan repeticiones.
- **line_profiler**: `%lprun` muestra tiempo por línea de una función.
- **memory_profiler**: `%mprun` muestra la memoria usada por línea.

## Preguntas de repaso

1. ¿Por qué `%timeit` ejecuta el código muchas veces?
   R: Porque una sola medición tiene mucho ruido (otros procesos, caché); repetir y promediar da una estimación estable y una desviación estándar.
2. ¿Qué es más rápido para elevar al cuadrado un millón de números: un bucle sobre una lista o `arr ** 2` con NumPy? ¿Por qué?
   R: `arr ** 2` con NumPy, porque la operación se ejecuta en C sobre memoria contigua, sin el costo del intérprete por elemento.
3. ¿Cuándo usarías `line_profiler` en lugar de `%timeit`?
   R: Cuando ya sabes que una función es lenta y necesitas saber qué línea concreta consume el tiempo.

## Explícalo con tus palabras

Explica por qué «medir antes de optimizar» evita perder tiempo, con un ejemplo de una función de tres pasos.
