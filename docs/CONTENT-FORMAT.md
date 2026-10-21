# Content format

The study plan lives in `content/`. The app reads it at runtime; there is no build step.

```
content/
  agenda.md                         Cloud Security route (6 blocks, existing format)
  plan-order.txt                    optional study order (see below)
  modules/
    01-problem-solving/
      module.md                     module metadata
      01-binary-search.md           one study session per file
      02-...
    02-.../
```

Order: sessions sort by their `NN-` prefix inside the module. Modules follow `content/plan-order.txt` when it exists: one id per line (a module folder such as `01-problem-solving`, or a Cloud block `cloud-b1` … `cloud-b6`); `#` comments and blank lines are ignored, and every module and block must appear exactly once or the plan fails to load. Without that file, modules sort by their `NN-` prefix and the Cloud route comes last.

A session's stable key is `<module-dir>/<file-name-without-.md>` (for example `01-problem-solving/01-binary-search`). Progress is stored by key, so renumbering files breaks progress: append new sessions, never renumber existing ones after the user started.

## `module.md`

```markdown
---
title: Resolución de problemas y algoritmos
phase: books
summary: Una línea que dice qué vas a poder hacer al terminar.
---

Texto libre (markdown): objetivo del módulo, fuentes y cómo se conecta con el resto.
```

`phase` is one of `books`, `datacamp`, `scrimba`. Cloud is not a module.

## Session file

```markdown
---
title: Búsqueda binaria y notación Big O
kind: lesson
hours: 2
sources: Grokking Algorithms, cap. 1 (pp. 20–38) | Cracking the Coding Interview, cap. VI (Big O)
links: Visualizador de búsqueda binaria | https://example.com ; Otro recurso | https://example.org
---

## Objetivo

Una o dos frases.

## Estudio

The study text. Original explanation in our own words, with `###` subsections,
code blocks, tables and ASCII diagrams. It replaces reading the book.

## Conceptos clave

- **Término**: definición en una frase.

## Preguntas de repaso

1. ¿Pregunta?
   R: Respuesta modelo, completa pero breve.
2. ¿Otra pregunta?
   R: Respuesta modelo.

## Ejercicio

Enunciado concreto, criterio de terminado.

## Explícalo con tus palabras

Una consigna para la técnica Feynman (una línea).
```

### Frontmatter

| Field | Required | Values |
| --- | --- | --- |
| `title` | yes | text |
| `kind` | yes | `lesson`, `project`, `evaluation`, `course` |
| `hours` | yes | `2` (weekday) or `3` (Saturday-sized: projects, evaluations, integration) |
| `sources` | no | items separated by ` \| ` |
| `links` | no | `Label \| https://url` pairs separated by ` ; ` (https only) |

### Sections

| Section | lesson | project | evaluation | course |
| --- | --- | --- | --- | --- |
| `## Objetivo` | required | required | required | required |
| `## Estudio` | required | optional | optional | optional |
| `## Qué hacer` | — | required | — | required |
| `## Conceptos clave` | required | optional | optional | optional |
| `## Preguntas de repaso` | ≥ 4 | optional | — | ≥ 3 |
| `## Preguntas de evaluación` | — | — | ≥ 8 | — |
| `## Ejercicio` | required | — | — | optional |
| `## Explícalo con tus palabras` | required | optional | optional | optional |

Questions in `## Preguntas de repaso` and `## Preguntas de evaluación` use the same shape: a numbered line with the question and an indented line starting with `R:` holding the model answer (the answer may continue on further indented lines). Review questions feed the spaced-repetition deck; evaluation questions are graded by the tutor.

## Writing rules

- Neutral Spanish with `tú`; keep standard technical terms in English (`cache`, `load balancer`, `bounded context`).
- Original explanations only. Never copy book passages; a quoted sentence at most, with its source.
- A 2 h session holds about 70–80 minutes of reading (2,500–4,000 words of `## Estudio`) plus questions and the exercise.
- Exercises use TypeScript unless the session is about another language or tool.
