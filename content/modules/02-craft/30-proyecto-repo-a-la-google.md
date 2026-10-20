---
title: Proyecto 3 — un repositorio "a la Google" con tests, review y CI
kind: project
hours: 3
sources: Software Engineering at Google, caps. 8–16, 23–24 (pp. 169–395, 538–579) | The Pragmatic Programmer, temas 19, 41, 51 (pp. 161–167, 361–374, 452–461) | Gentleman Programming Book, caps. 2 y 10
links: Google Engineering Practices · Code Review | https://google.github.io/eng-practices/review/ ; Google TypeScript Style Guide | https://google.github.io/styleguide/tsguide.html ; Documentación de GitHub Actions | https://docs.github.com/actions
---

## Objetivo

Montar desde cero un repositorio pequeño pero completo que aplique las prácticas de ingeniería a escala de equipo de las sesiones 25–29: guía de estilo automatizada, tests con estrategia explícita, plantilla y checklist de code review, propiedad del código, documentación como código, flujo trunk-based con commits pequeños, una deprecación completa y un pipeline de CI que protege la rama principal.

## Estudio

### El producto: `study-plan-core`

Vas a construir una librería TypeScript que contiene la lógica pura del planificador de estudio: leer el frontmatter de una sesión, calcular el horario semanal y proyectar fechas. Es pequeña a propósito: el foco no es la complejidad del dominio sino **el proceso alrededor del código**. Al final, el repositorio debería parecer el de un equipo profesional, aunque lo hayas hecho tú solo.

Funcionalidades mínimas:

1. `parseSessionFrontmatter(text: string): Result<SessionMeta, ParseError>` que valida `title`, `kind` (unión de literales) y `hours` (2 o 3).
2. `weeklyCapacity(date: CalendarDate): 0 | 2 | 3` (lunes a viernes 2, sábado 3, domingo 0).
3. `projectSchedule(sessions, from): PlannedSession[]`, con sesiones secuenciales que saltan los domingos.
4. Una función `formatPlanDate(date)` que devuelve `DD/MM/AAAA` y que **deprecarás** durante el proyecto a favor de `formatPlanDateIso`.

### Estructura objetivo del repositorio

```
study-plan-core/
  .github/
    workflows/ci.yml
    pull_request_template.md
    CODEOWNERS
  docs/
    adr/0001-trunk-based.md
    design/schedule-projection.md
    migrations/format-plan-date.md
  src/
    domain/            calendar-date.ts, session.ts, schedule.ts
    index.ts           barrel explícito: la API pública
  test/
    *.test.ts          unitarios y propiedades
  .editorconfig  .nvmrc  .prettierrc  eslint.config.js  tsconfig.json
  CONTRIBUTING.md  STYLE.md  TESTING.md  README.md  package.json
```

## Qué hacer

1. **Esqueleto y reglas (30 min).**
   - Crea el repositorio con Git, `.nvmrc`, `package.json` con scripts `typecheck`, `lint`, `format:check`, `test`, `build` y `check` (este último ejecuta todos).
   - Configura `tsconfig.json` estricto, ESLint con `typescript-eslint` y Prettier.
   - Escribe `STYLE.md` con al menos ocho reglas, cada una con categoría (peligro, buena práctica, consistencia) y su porqué. Incluye la prohibición de `export default` y de `any` explícito.
   - Primer commit: `chore: esqueleto del proyecto`.
2. **Documentos de proceso (25 min).**
   - `CONTRIBUTING.md`: flujo trunk-based (ramas de vida corta, PR de menos de unas 200 líneas, feature flags para lo incompleto, Conventional Commits, "si `main` se rompe, se revierte primero").
   - `docs/adr/0001-trunk-based.md`: contexto, decisión y consecuencias.
   - `.github/pull_request_template.md`: descripción (qué y por qué), cómo se probó y la checklist de review de la sesión 26.
   - `.github/CODEOWNERS`: asigna `src/domain/` y `docs/` a tu usuario.
3. **Pipeline de CI (20 min).** `.github/workflows/ci.yml` en `pull_request` y `push` a `main`, con `npm ci`, typecheck, lint, formato, tests con cobertura y build, y `timeout-minutes`. Si usas GitHub, activa la protección de `main` (CI obligatoria y PR obligatorio). Si trabajas sin remoto, ejecuta `npm run check` en un hook de pre-push como sustituto y anótalo.
4. **Funcionalidad con TDD en PR pequeños (60 min).** Implementa las funcionalidades 1 a 4 en **al menos cuatro pull requests (o ramas cortas) distintos**, cada uno con su descripción completa siguiendo la plantilla. Antes de la funcionalidad 3, escribe un documento de diseño breve en `docs/design/schedule-projection.md` (problema, objetivos, no objetivos, solución, dos alternativas descartadas, plan de pruebas). Requisitos de tests (`TESTING.md` explica la estrategia): tests pequeños por comportamiento, al menos dos propiedades con `fast-check` (por ejemplo, que la proyección nunca asigna un domingo y que conserva el orden de las sesiones) y ningún test que dependa del reloj real.
5. **Autorreview (15 min).** Para cada PR, espera al menos unos minutos, léelo "con ojos frescos" y deja al menos dos comentarios propios clasificados (bloqueante, sugerencia, pregunta, nit, elogio). Corrige lo bloqueante antes de integrar.
6. **Deprecación completa (20 min).** Añade `formatPlanDateIso`, marca `formatPlanDate` con `@deprecated` accionable (qué usar, cuándo se elimina, enlace a `docs/migrations/format-plan-date.md`), añade una regla de lint que bloquee importaciones nuevas, migra los usos internos en un commit y elimina la función vieja en otro.
7. **Saboteadores y cierre (10 min).** Introduce en una rama tres errores (uno de tipos, uno de lint y uno de lógica) y comprueba que la CI o `npm run check` los detecta. Escribe el README final: qué es, para quién, cómo empezar en cinco pasos, mapa de documentos, dueño y fecha.

### Checklist de terminado

- [ ] `npm run check` pasa en `main` y la CI está en verde.
- [ ] Cada regla de `STYLE.md` tiene categoría y porqué, y las automatizables están en la configuración.
- [ ] Hay al menos cuatro PR (o ramas cortas) con descripción completa y comentarios de autorreview.
- [ ] Existen el ADR, el documento de diseño, la guía de migración, `TESTING.md` y `CONTRIBUTING.md`.
- [ ] Hay al menos dos propiedades de `fast-check` y ningún test usa el reloj real.
- [ ] La deprecación se ve completa en el historial: nueva función, aviso, bloqueo de usos nuevos, migración y borrado.
- [ ] Los tres saboteadores fueron detectados (o se añadió el test que faltaba).
- [ ] El README permite arrancar el proyecto desde una carpeta limpia sin pasos implícitos.

## Conceptos clave

- **Repositorio autoexplicativo**: un repositorio cuyas reglas, procesos y decisiones están escritos y automatizados dentro de él.
- **Proceso como código**: plantillas, CODEOWNERS, pipelines y reglas de lint versionados junto al código.
- **Autorreview**: revisión disciplinada del propio cambio, con distancia temporal y una checklist.

## Preguntas de repaso

1. ¿Por qué el proyecto exige varios PR pequeños en lugar de uno grande, aunque trabajes solo?
   R: Porque los cambios pequeños se revisan mejor, se revierten con facilidad y dejan un historial que explica cada decisión; además, practicar el flujo trunk-based con PR pequeños crea el hábito que necesitarás en un equipo.
2. ¿Qué aporta el documento de diseño antes de implementar la proyección de horario?
   R: Obliga a pensar el problema, los límites (no objetivos) y las alternativas antes de escribir código, cuando cambiar de idea es barato, y deja registro de por qué se eligió la solución y se descartaron las otras.
3. ¿Qué demuestra que los tres saboteadores sean detectados?
   R: Que el sistema de feedback funciona: las reglas de tipos y lint están realmente automatizadas y los tests detectan bugs de lógica. Si alguno sobrevive, revela un hueco concreto (una regla o un test que falta) que hay que cubrir.

## Explícalo con tus palabras

Explica a alguien qué ganas al tener las reglas, el proceso y las decisiones de un proyecto escritos y automatizados dentro del propio repositorio, en lugar de en la cabeza de sus autores.
