---
title: Tools of the Trade — code reviews, terminal y Git en equipo
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 4 Tools of the Trade — Code reviews; Command Line Fundamentals; Command Line Power Tools; Essential Git and GitHub Skills
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; GitHub Docs — Pull requests | https://docs.github.com/es/pull-requests
---

## Objetivo

Dominar la terminal, el flujo de ramas y pull requests de Git, y saber dar y recibir code review.

## Qué hacer

1. (≈ 90 min) **Módulo 4 Tools of the Trade** completo: **Code reviews** (incluida *The most common type of code review: GitHub PRs* y la revisión de un solo project real), **Command Line Fundamentals**, **Command Line Power Tools** y **Essential Git and GitHub Skills**. Haz los comandos en tu propia terminal, no solo en el scrim.
2. (≈ 30 min) Recuerdo activo: preguntas de repaso y consigna Feynman. Conecta con lo que viste de code review y control de versiones en el módulo 02.

## Conceptos clave

- **Terminal**: `pwd`, `ls`, `cd`, `mkdir`, `touch`, `mv`, `cp`, `rm`; rutas relativas y absolutas.
- **Herramientas potentes**: tuberías (`|`), redirección (`>`, `>>`), `grep` para buscar, y combinarlas para responder preguntas sobre archivos rápido.
- **Ramas**: `git switch -c feature` crea una rama para trabajar aislado; `main` queda estable.
- **Pull request**: propuesta de fusionar una rama; es el lugar del code review y de la CI.
- **Buen code review**: comenta el código, no a la persona; explica el porqué; distingue bloqueantes de sugerencias; revisa cambios pequeños.
- **Merge vs rebase**: merge conserva la historia con un commit de unión; rebase reescribe tus commits sobre la punta de `main` para una historia lineal (nunca rebases ramas compartidas).

## Preguntas de repaso

1. ¿Por qué se trabaja en ramas en lugar de directamente en `main`?
   R: Para aislar cambios a medio hacer, permitir code review mediante pull requests y mantener `main` siempre desplegable.
2. ¿Qué hace `cat log.txt | grep ERROR > errores.txt`?
   R: Envía el contenido de `log.txt` a `grep`, que filtra las líneas que contienen "ERROR", y escribe el resultado en `errores.txt`, sobrescribiéndolo.
3. Nombra tres características de un buen comentario de code review.
   R: Habla del código y no de la persona, explica el porqué (o enlaza la regla) y deja claro si es bloqueante o una sugerencia opcional. Idealmente propone una alternativa concreta.
4. ¿Cuándo no deberías hacer `git rebase`?
   R: Sobre commits que ya están en una rama compartida que otros usan, porque reescribe la historia y obliga a los demás a reconciliar commits que cambiaron de identidad.

## Explícalo con tus palabras

Explica el flujo completo de una feature en equipo: rama, commits, push, pull request, review, CI y merge.
