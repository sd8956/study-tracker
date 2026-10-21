---
title: Caso práctico — World Development Indicators con iteradores
kind: course
hours: 2
sources: DataCamp — Python Toolbox, cap. 3
links: Python Toolbox (DataCamp) | https://www.datacamp.com/courses/python-toolbox
---

## Objetivo

Combinar funciones, comprehensions, iteradores y generators para leer y transformar un dataset real (World Bank) por partes.

## Qué hacer

1. Abre *Python Toolbox* en DataCamp (ver enlaces de la sesión) y completa el capítulo 3 «Bringing it all together!» (~75 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Reescribe en tu máquina, sin mirar la solución, el generator que lee un archivo línea a línea y construye un dict por fila con `zip(cabeceras, valores)`.
4. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
5. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **zip + dict**: `dict(zip(claves, valores))` convierte una fila en un registro con nombre.
- **Generator para leer archivos**: una función con `with open(...)` y `yield` por línea lee archivos de cualquier tamaño con memoria constante.
- **Composición**: funciones pequeñas encadenadas (leer → parsear → filtrar → agregar) son fáciles de probar y reutilizar.
- **Lectura por chunks con pandas**: iterar sobre `read_csv(chunksize=...)` y aplicar la misma transformación a cada trozo.

## Preguntas de repaso

1. ¿Cómo conviertes `['pais', 'anio']` y `['CO', '2020']` en un dict?
   R: `dict(zip(['pais', 'anio'], ['CO', '2020']))` → `{'pais': 'CO', 'anio': '2020'}`.
2. ¿Por qué conviene que la función que lee el archivo sea un generator?
   R: Porque entrega una fila a la vez: puedes procesar archivos más grandes que la RAM y empezar a producir resultados antes de leer todo el archivo.
3. ¿Qué ventaja tiene separar leer, transformar y agregar en funciones distintas?
   R: Cada pieza se prueba sola, se reutiliza con otros datasets y se reemplaza sin tocar el resto (por ejemplo, cambiar el origen de un archivo a una API).

## Explícalo con tus palabras

Describe en voz alta el pipeline que construiste en el capítulo como si fuera una línea de ensamblaje: qué entra, qué sale de cada estación y por qué nunca hay más de una fila en la mesa.
