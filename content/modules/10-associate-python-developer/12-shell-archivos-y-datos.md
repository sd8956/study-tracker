---
title: Shell — archivos, directorios y ver datos
kind: course
hours: 2
sources: DataCamp — Introduction to Shell, caps. 1–2
links: Introduction to Shell (DataCamp) | https://www.datacamp.com/courses/introduction-to-shell
---

## Objetivo

Moverte por el sistema de archivos, crear, copiar, mover y borrar archivos, y ver o recortar su contenido con herramientas simples.

## Qué hacer

1. Abre *Introduction to Shell* en DataCamp (ver enlaces de la sesión) y completa el capítulo 1 «Manipulating files and directories» y el capítulo 2 «Manipulating data» (~75 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Repite en tu propia terminal cinco comandos del curso sobre una carpeta de prueba (10 min).
4. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
5. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **pwd, ls, cd**: dónde estás, qué hay y cómo moverte; rutas absolutas (desde `/`) y relativas (desde donde estás).
- **cp, mv, rm, mkdir, rmdir**: copiar, mover o renombrar, borrar, crear y borrar directorios vacíos.
- **cat, less**: mostrar un archivo completo o paginado.
- **head, tail**: primeras o últimas líneas; `-n` controla cuántas.
- **cut**: selecciona columnas: `cut -d , -f 2` toma el segundo campo separado por comas.
- **history y !**: repetir comandos anteriores.
- **grep**: busca líneas que coinciden con un patrón; `-c` cuenta, `-v` invierte, `-i` ignora mayúsculas.

## Preguntas de repaso

1. ¿Qué diferencia hay entre una ruta absoluta y una relativa?
   R: La absoluta empieza en la raíz `/` y funciona desde cualquier lugar; la relativa se interpreta desde el directorio actual.
2. ¿Cómo muestras la segunda columna de un CSV sin la primera línea de cabecera?
   R: `tail -n +2 datos.csv | cut -d , -f 2`.
3. ¿Por qué `rm` es peligroso y qué hábito lo hace más seguro?
   R: Porque borra sin papelera ni confirmación. Revisar antes con `ls` el mismo patrón, o usar `rm -i` para confirmar cada archivo.
4. ¿Cómo cuentas las líneas de `log.txt` que NO contienen 'DEBUG'?
   R: `grep -v -c DEBUG log.txt`.

## Explícalo con tus palabras

Explica a alguien acostumbrado al explorador de archivos por qué vale la pena aprender `ls`, `cd`, `cp` y `grep`.
