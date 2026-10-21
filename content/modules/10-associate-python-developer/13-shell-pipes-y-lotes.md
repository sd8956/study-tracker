---
title: Shell — combinar herramientas y procesar lotes
kind: course
hours: 2
sources: DataCamp — Introduction to Shell, caps. 3–4
links: Introduction to Shell (DataCamp) | https://www.datacamp.com/courses/introduction-to-shell
---

## Objetivo

Encadenar comandos con pipes y redirecciones, ordenar y eliminar duplicados, y procesar muchos archivos con wildcards, variables y bucles `for`.

## Qué hacer

1. Abre *Introduction to Shell* en DataCamp (ver enlaces de la sesión) y completa el capítulo 3 «Combining tools» y el capítulo 4 «Batch processing» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Redirección**: `>` escribe la salida en un archivo (sobrescribe), `>>` la agrega, `<` toma la entrada de un archivo.
- **Pipe |**: la salida de un comando es la entrada del siguiente.
- **wc**: cuenta líneas, palabras o caracteres (`-l`, `-w`, `-c`).
- **sort y uniq**: ordenar líneas; `uniq` elimina duplicados adyacentes (por eso va después de `sort`); `uniq -c` cuenta.
- **Wildcards**: `*`, `?`, `[...]` y `{a,b}` seleccionan varios archivos.
- **Variables**: de entorno (`HOME`, `PATH`) y de shell (`archivo=datos.csv`, se leen con `$archivo`).
- **for ... in ...; do ...; done**: repite un comando para cada archivo.

## Preguntas de repaso

1. Escribe un pipeline que muestre las 3 palabras más frecuentes de la columna 2 de `datos.csv`.
   R: `cut -d , -f 2 datos.csv | sort | uniq -c | sort -n -r | head -n 3`.
2. ¿Por qué `uniq` suele ir después de `sort`?
   R: Porque `uniq` solo elimina duplicados que están en líneas consecutivas; ordenar primero los junta.
3. Escribe un bucle que muestre la primera línea de cada CSV del directorio.
   R: `for f in *.csv; do head -n 1 "$f"; done`.
4. ¿Por qué hay que poner comillas en `"$f"`?
   R: Para que un nombre de archivo con espacios no se divida en varios argumentos.

## Explícalo con tus palabras

Explica la filosofía Unix de «herramientas pequeñas que se combinan con pipes» con un ejemplo de tu propio trabajo.
