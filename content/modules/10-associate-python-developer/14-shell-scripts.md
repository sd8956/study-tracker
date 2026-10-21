---
title: Shell — scripts y herramientas propias
kind: course
hours: 2
sources: DataCamp — Introduction to Shell, cap. 5
links: Introduction to Shell (DataCamp) | https://www.datacamp.com/courses/introduction-to-shell
---

## Objetivo

Editar archivos en la terminal y convertir pipelines en scripts reutilizables que reciben argumentos.

## Qué hacer

1. Abre *Introduction to Shell* en DataCamp (ver enlaces de la sesión) y completa el capítulo 5 «Creating new tools» (~60 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Escribe en tu máquina un script `resumen.sh` que reciba un CSV como argumento e imprima número de filas y las 5 primeras líneas sin cabecera; dale permisos con `chmod +x` (25 min).
4. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
5. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Editor en terminal**: `nano` para editar sin salir de la terminal.
- **Script de shell**: archivo con comandos que se ejecuta con `bash script.sh`.
- **Argumentos**: `$1`, `$2`... son los argumentos; `$@` son todos.
- **Shebang y permisos**: `#!/usr/bin/env bash` en la primera línea y `chmod +x` para ejecutarlo como `./script.sh`.
- **Scripts con bucles**: un script puede tener varias líneas, bucles y pipes.

## Preguntas de repaso

1. ¿Qué contiene `$@` dentro de un script?
   R: Todos los argumentos que recibió el script; `"$@"` los conserva separados correctamente aunque tengan espacios.
2. ¿Para qué sirve la línea `#!/usr/bin/env bash`?
   R: Indica qué intérprete debe ejecutar el script cuando lo lanzas directamente como `./script.sh`.
3. ¿Qué ventaja tiene guardar un pipeline en un script en lugar de recordarlo?
   R: Se puede repetir exactamente, versionar en git, compartir y parametrizar con argumentos.

## Explícalo con tus palabras

Explica, paso a paso, qué pasa cuando ejecutas `./resumen.sh ventas.csv`: shebang, permisos, `$1` y el pipeline.
