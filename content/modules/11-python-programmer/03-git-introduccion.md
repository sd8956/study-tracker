---
title: Git — repositorios, commits e historial
kind: course
hours: 2
sources: DataCamp — Introduction to Git, caps. 1–2
links: Introduction to Git (DataCamp) | https://www.datacamp.com/courses/introduction-to-git
---

## Objetivo

Crear un repositorio, preparar y confirmar cambios, comparar versiones y restaurar archivos a estados anteriores.

## Qué hacer

1. Abre *Introduction to Git* en DataCamp (ver enlaces de la sesión) y completa el capítulo 1 «Introduction to Git» y el capítulo 2 «Version history» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Repositorio**: carpeta con historial de cambios guardado en `.git`.
- **Staging area**: zona intermedia: `git add` elige qué cambios entran en el próximo commit.
- **Commit**: instantánea con mensaje, autor y hash; `git log` muestra el historial.
- **git diff**: compara working tree vs staging (`git diff`), staging vs último commit (`--staged`) o dos commits.
- **HEAD**: puntero al commit actual; `HEAD~1` es el anterior.
- **git restore / git revert**: `restore` descarta cambios de archivos; `revert` crea un commit que deshace otro sin reescribir historia.

## Preguntas de repaso

1. ¿Para qué sirve la staging area?
   R: Para elegir qué cambios van en cada commit: puedes tener varios archivos modificados y confirmar solo los que forman una unidad lógica.
2. ¿Qué diferencia hay entre `git diff` y `git diff --staged`?
   R: `git diff` muestra cambios aún no preparados; `git diff --staged` muestra lo que ya está en staging y entrará en el próximo commit.
3. ¿Por qué `git revert` es más seguro que reescribir la historia en un repo compartido?
   R: Porque no borra commits: agrega uno nuevo que deshace el cambio, así nadie que ya tenga el historial queda desincronizado.

## Explícalo con tus palabras

Explica working tree, staging area y repositorio con la analogía de preparar paquetes para enviar por correo.
