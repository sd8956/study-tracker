---
title: Git — ramas, merges y repositorios remotos
kind: course
hours: 2
sources: DataCamp — Intermediate Git, caps. 1–2
links: Intermediate Git (DataCamp) | https://www.datacamp.com/courses/intermediate-git
---

## Objetivo

Crear, cambiar, comparar, renombrar, borrar y fusionar ramas, resolver conflictos y sincronizar con remotos usando clone, fetch, pull y push.

## Qué hacer

1. Abre *Intermediate Git* en DataCamp (ver enlaces de la sesión) y completa el capítulo 1 «Working with branches» y el capítulo 2 «Collaborating with Git» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Rama**: línea de desarrollo independiente; `git switch -c nueva` la crea y cambia a ella.
- **Merge**: integra los cambios de una rama en otra; puede ser fast-forward o con commit de merge.
- **Conflicto**: ocurre cuando dos ramas cambian las mismas líneas; Git marca el archivo con `<<<<<<<`, `=======` y `>>>>>>>`.
- **Remote**: repositorio en otro lugar (GitHub); `origin` es el nombre por defecto.
- **fetch vs pull**: `fetch` descarga cambios sin integrarlos; `pull` = fetch + merge.
- **push**: envía tus commits locales al remoto; falla si el remoto tiene commits que no tienes.

## Preguntas de repaso

1. ¿Por qué trabajar en una rama en lugar de directamente en `main`?
   R: Para mantener `main` estable mientras desarrollas o corriges algo; los cambios entran a `main` solo cuando están listos y revisados.
2. ¿Cómo resuelves un conflicto de merge?
   R: Abres los archivos marcados, eliges o combinas el contenido entre los marcadores, borras los marcadores, haces `git add` del archivo y completas el merge con `git commit`.
3. ¿Qué diferencia hay entre `git fetch` y `git pull`?
   R: `fetch` solo descarga los commits remotos y actualiza `origin/main`; `pull` además los integra en tu rama actual.
4. ¿Qué práctica reduce los conflictos de merge?
   R: Ramas cortas que se integran pronto, commits pequeños y traer a menudo los cambios de `main` a tu rama.

## Explícalo con tus palabras

Explica a un compañero qué es un conflicto de merge y por qué no es un error de Git sino una decisión que Git no puede tomar por ti.
