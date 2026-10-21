---
title: Control de versiones, ramas, monorepos y deprecación
kind: lesson
hours: 2
sources: Software Engineering at Google, cap. 16 Version Control and Branch Management (pp. 370–395) | Software Engineering at Google, cap. 15 Deprecation (pp. 355–369) | The Pragmatic Programmer, tema 19 Version Control (pp. 161–167)
---

## Objetivo

Entender el control de versiones como una herramienta de colaboración y de política (fuente de verdad, ramas, trunk-based development, la regla de una sola versión, monorepos) y aprender a retirar sistemas y APIs de forma ordenada (deprecación consultiva y obligatoria, avisos útiles, dueños, hitos y herramientas). Al terminar vas a poder elegir una estrategia de ramas para un proyecto y planificar la deprecación de una función pública en TypeScript.

## Estudio

### El control de versiones es para todo

*The Pragmatic Programmer* dedica el tema 19 a una regla que hoy parece obvia: **usa siempre control de versiones**. Siempre, para todo: proyectos de una persona, prototipos, documentación, configuración de tu máquina (tus *dotfiles*), scripts. Los autores lo describen como un "deshacer" gigante para todo tu proyecto, una máquina del tiempo que permite volver a cualquier versión, ver quién cambió qué y por qué, y trabajar en paralelo.

El libro hace un experimento mental: si un compañero borra por accidente todo el proyecto, ¿cuánto tardas en recuperarlo? Con control de versiones (y un remoto), minutos. También señala el papel del control de versiones como **centro de la automatización**: un commit puede disparar builds, tests y despliegues (lo verás en la sesión 29). Y propone una idea interesante: si el código, la configuración y la documentación de un sistema viven en el repositorio, puedes reconstruir cualquier versión del sistema completo en cualquier momento.

### Qué es y por qué importa a escala

El capítulo 16 de *Software Engineering at Google* define un sistema de control de versiones (VCS) como un sistema que registra los cambios de los archivos a lo largo del tiempo, permitiendo saber quién hizo qué, cuándo y por qué, y volver a estados anteriores. Lo interesante del capítulo no es la herramienta sino la **política**: cómo se usa el control de versiones en una organización determina cuánto cuesta colaborar.

**Centralizado frente a distribuido.** Los VCS centralizados (Subversion, Perforce) tienen un único repositorio central; los distribuidos (Git, Mercurial) dan a cada desarrollador una copia completa con todo el historial. Los distribuidos permiten trabajar sin conexión y colaborar con mucha flexibilidad.

**Fuente de verdad.** El libro insiste en que, incluso con un sistema distribuido, los proyectos bien gestionados declaran **una rama en un repositorio** como la **fuente de verdad**: lo que está ahí es "la versión actual". En la práctica de Git, eso es `main` en el remoto compartido. Sin una fuente de verdad acordada, la colaboración se vuelve caótica: ¿cuál de las veinte copias es la buena?

### Control de versiones frente a gestión de dependencias

Una distinción importante del capítulo: el control de versiones gestiona **tu** código; la gestión de dependencias gestiona el código de **otros** (librerías externas, otros equipos). Los problemas son muy distintos. Dentro de tu repositorio, todo cambia a la vez y se puede probar a la vez; con dependencias externas, cada una tiene su ciclo de versiones y tienes que decidir cuándo actualizar (y la ley de Hyrum entra en juego). Lo que esté bajo tu control en tu repositorio es mucho más fácil de cambiar que lo que dependa de versiones de terceros.

### Gestión de ramas

El libro observa que **cualquier trabajo en curso es, en la práctica, una rama**: aunque no crees una rama de Git, los cambios en tu máquina que aún no subiste divergen de la fuente de verdad. La pregunta es cuánto tiempo y cuánto código diverge.

**Ramas de desarrollo de larga vida.** Es una práctica muy común: el equipo trabaja durante semanas en una rama `develop` o en ramas de funcionalidad grandes, y "cuando esté listo" hace merge a `main`. El libro es muy crítico con esto:

- Cuanto más vive una rama, **más difícil es integrarla**: los conflictos crecen con el tiempo y con el número de ramas.
- El merge final es un **evento grande y arriesgado**, con muchos cambios a la vez que nadie revisó juntos.
- Las ramas dan una falsa sensación de estabilidad: el código "probado en la rama" no se probó con los cambios de los demás.

Un ejemplo del capítulo ilustra el problema: renombrar una clase usada en todo el código. En trunk, es un cambio (quizá automatizado). Con varias ramas de desarrollo vivas, hay que renombrar en cada una o pelear con conflictos en cada merge.

**Trunk-based development.** La alternativa que Google practica (y que la investigación de DevOps, citada en el capítulo con los estudios de DORA, asocia con equipos de alto rendimiento): todos trabajan **cerca de trunk** (`main`), con cambios pequeños que se integran al menos a diario. Las funcionalidades incompletas se esconden detrás de **feature flags** (sesión 13), no detrás de ramas. Las ramas de vida corta (horas o pocos días, el tiempo de un pull request) están bien; lo que se evita son las ramas que viven semanas.

```
Ramas de larga vida                     Trunk-based development

main ─────●────────────────●──          main ─●─●─●─●─●─●─●─●─●─●─
           \              /                    \/ \/ \/ \/  (PR de horas)
develop     ●──●──●──●──●  (semanas)
             \       /
feature       ●──●──●
```

**Ramas de release.** Son el caso aceptable de rama de larga vida: una rama congelada a partir de un commit de trunk para estabilizar y parchear una versión publicada. Las correcciones se hacen primero en trunk y se llevan (*cherry-pick*) a la rama de release, nunca al revés. Aun así, el libro señala que las organizaciones de mayor rendimiento tienden a desplegar directamente desde trunk con mucha frecuencia y casi no necesitan ramas de release.

### La regla de una sola versión

En Google, casi todo el código vive en un único repositorio (Piper). Pero el capítulo aclara que la escala del repositorio no es lo esencial; lo esencial es una política: la **regla de una sola versión** (*One-Version Rule*). Dice, más o menos: para cada dependencia del repositorio, los desarrolladores **no deben poder elegir** entre varias versiones. Hay una sola versión de cada librería, la que está en trunk.

¿Por qué? Porque la elección es costosa. Si dos equipos usan versiones distintas de la misma librería y luego un tercer componente necesita a ambos, aparecen conflictos de dependencias que nadie sabe resolver (el famoso "infierno de dependencias"). Cada versión adicional multiplica la complejidad. Para una persona, la falta de elección puede parecer arbitraria; para la organización, elimina una fuente enorme de problemas.

En un proyecto pequeño de TypeScript, la versión adaptada es: un solo `package.json` (o un *workspace* con versiones alineadas), un único archivo de bloqueo (`package-lock.json`) en el repositorio, ninguna dependencia duplicada en versiones distintas sin una razón y actualizaciones frecuentes y pequeñas.

### Monorepos

¿Debe una organización usar un único repositorio (monorepo) o muchos? El capítulo es matizado: lo que realmente defiende es la regla de una sola versión, y un monorepo es la forma más sencilla de cumplirla, porque todo el código y sus dependencias se ven y se prueban juntos. Ventajas: cambios atómicos que tocan varios proyectos, visibilidad total del código, refactors a gran escala, una única fuente de verdad. Desventajas: necesita herramientas que escalen (build, tests, búsqueda), y no encaja con todos los modelos de colaboración (por ejemplo, el open source está organizado en repositorios separados).

El libro sugiere que con muchos repositorios también se puede aproximar la regla de una sola versión si existe una forma de componerlos de manera coherente (un "monorepo virtual"). Lo que hay que evitar es la elección libre de versiones entre componentes de la misma organización.

| | Monorepo | Muchos repositorios |
| --- | --- | --- |
| Cambio que afecta a varios proyectos | Un solo commit atómico | Varios PR coordinados, versiones intermedias |
| Una sola versión de cada dependencia | Natural | Requiere disciplina y herramientas |
| Herramientas necesarias | Build y CI que escalen | Las estándar |
| Permisos y aislamiento | Más difícil | Natural por repositorio |

### Deprecación: el código es un pasivo

El capítulo 15 trata un tema que casi nadie enseña: **cómo retirar sistemas viejos**. Si el código es un pasivo (sesión 26), mantener sistemas obsoletos tiene un costo continuo: hay que mantenerlos, protegerlos, migrarlos de plataforma, y obligan a otros sistemas a seguir siendo compatibles. La **deprecación** es el proceso de retirar ordenadamente un sistema o una API y migrar a sus usuarios a una alternativa.

¿Por qué es tan difícil? Por la ley de Hyrum: un sistema con usuarios tiene muchos más contratos implícitos de los que crees, y cada uno es una dependencia que hay que migrar. Además, los usuarios no tienen incentivos para migrar (lo viejo funciona) y nadie quiere ser responsable de un trabajo poco visible. El libro cita la reticencia al cambio como una fuerza constante.

Por eso la primera recomendación es **pensar en la deprecación durante el diseño**: ¿qué tan fácil será para tus usuarios migrar a otra cosa? ¿Puedes reemplazar tu sistema por partes? Un diseño con fronteras limpias e interfaces pequeñas (sesiones 9 y 15) se depreca mucho más fácilmente.

### Tipos de deprecación

El libro distingue dos tipos:

**Deprecación consultiva** (*advisory*): no tiene fecha límite ni obligación; se informa de que existe algo mejor y se recomienda migrar. Es útil para animar a los usuarios nuevos a elegir la alternativa, pero el libro advierte que **casi nunca consigue que los usuarios existentes migren**: si lo viejo funciona, nadie se mueve. Funciona cuando la alternativa es claramente mejor y migrar es fácil.

**Deprecación obligatoria** (*compulsory*): tiene una fecha límite y se hace cumplir (por ejemplo, el sistema viejo se apaga en una fecha, o una herramienta impide añadir nuevos usos). Es la que realmente retira sistemas. Para que funcione, el equipo que depreca necesita **hacer el trabajo de migración él mismo o darlo muy fácil** (la churn rule de la sesión 1): un equipo central que migra a todos con herramientas automáticas es mucho más eficiente que pedirle a cada equipo que lo haga.

### Avisos de deprecación útiles

Un aviso de deprecación tiene que cumplir dos condiciones para servir de algo:

- **Accionable**: dice qué hacer en su lugar. "Esta función está deprecada" no ayuda; "usa `formatDateIso` en su lugar; ver guía de migración" sí.
- **Relevante**: aparece en el momento en que el usuario puede actuar, idealmente **cuando escribe código nuevo** que usa lo deprecado, no como una avalancha de advertencias en cada build que todos aprenden a ignorar.

En TypeScript, la etiqueta `@deprecated` en TSDoc hace que el editor tache el uso y muestre el mensaje, y ESLint puede convertirlo en error para código nuevo:

```ts
/**
 * @deprecated Usa {@link formatDateIso}. Esta función devuelve DD/MM/AAAA y será
 * eliminada en la versión 3.0 (fecha prevista: 2027-01). Guía: docs/migrations/dates.md
 */
export function formatDate(date: Date): string {
  return formatDateLegacy(date);
}

/** Devuelve la fecha en formato ISO 8601 (AAAA-MM-DD). */
export function formatDateIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}
```

(Fíjate en que `toISOString` usa UTC: si la fecha es local, cerca de medianoche puede dar el día anterior o siguiente. Es otro ejemplo de por qué conviene trabajar con fechas de calendario explícitas; en una librería real lo documentarías y lo probarías.)

### Gestionar el proceso

El libro trata la deprecación como un proyecto más, con:

- **Dueños del proceso**: alguien responsable de llevar la deprecación hasta el final. Los sistemas abandonados (sin dueño) son los más difíciles de retirar, porque nadie tiene el conocimiento ni el mandato.
- **Hitos**: metas intermedias medibles (por ejemplo, "ningún uso nuevo a partir de marzo", "50 % de usuarios migrados en junio", "apagado en septiembre"). Celebrar los hitos ayuda a mantener el impulso en un trabajo poco visible.
- **Herramientas**, en tres áreas:
  - **Descubrimiento**: encontrar quién usa lo deprecado (búsqueda de código, logs de uso).
  - **Migración**: herramientas automáticas que reescriben los usos (en TypeScript, *codemods* con jscodeshift o ts-morph).
  - **Prevención de retrocesos**: impedir que aparezcan usos nuevos (una regla de lint, una anotación de deprecación que falla en CI para código nuevo).

```js
// eslint.config.js: impedir usos nuevos de la API deprecada
{
  rules: {
    "no-restricted-imports": ["error", {
      paths: [{ name: "@acme/dates", importNames: ["formatDate"], message: "Deprecada: usa formatDateIso (docs/migrations/dates.md)." }],
    }],
  },
}
```

### Buenos hábitos de Git en el día a día

Las políticas de Google se traducen en hábitos concretos que puedes practicar en cualquier proyecto, incluso trabajando solo:

| Hábito | Por qué | Cómo en Git |
| --- | --- | --- |
| Integrar a menudo | Divergencias pequeñas, conflictos pequeños | `git pull --rebase` al empezar el día; PR de horas, no de semanas |
| Commits pequeños con un solo propósito | Revisables y revertibles por separado (sesión 14) | `git add -p` para elegir qué entra en cada commit |
| Mensajes que explican el porqué | El historial es documentación (sesión 27) | Conventional Commits: `fix(today): ...` con cuerpo explicativo |
| Nada de secretos en el repositorio | El historial es para siempre | `.env.local` en `.gitignore`; un `.env.example` sin valores reales |
| El lockfile versionado | Builds reproducibles, una sola versión | Commit de `package-lock.json`; `npm ci` en CI |
| Etiquetar las versiones publicadas | Poder volver a cualquier release | `git tag v1.4.0` y releases desde la etiqueta |

Un ejemplo de mensaje de commit que respeta lo visto en el módulo:

```
refactor(schedule): extrae CalendarDate del cálculo de fechas

Mover la aritmética de fechas a un tipo propio elimina la dependencia
de la zona horaria del servidor (bug #57). Sin cambios de comportamiento:
los tests existentes pasan sin modificaciones.
```

El tipo (`refactor`) anuncia que no hay cambio de comportamiento; el cuerpo explica el porqué y cómo se verificó. Quien haga `git log` o `git blame` dentro de un año entenderá la decisión sin preguntar a nadie.

### Juntando todo: el ciclo de vida de una API

1. **Diseño**: interfaz pequeña, superficie observable mínima (Hyrum), pensada para poder reemplazarse.
2. **Evolución en trunk**: cambios pequeños, una sola versión, tests de los consumidores en el mismo repositorio o en CI.
3. **Reemplazo**: la nueva API convive con la vieja; la vieja se marca `@deprecated` con un aviso accionable.
4. **Migración**: el equipo dueño descubre los usos, los migra con herramientas y bloquea usos nuevos.
5. **Retirada**: al llegar a cero usos (o en la fecha acordada), se borra el código viejo. Ese commit es el que hace que la deprecación haya valido la pena.

### Resumen

Usa control de versiones para todo y declara una única fuente de verdad. Integra a menudo, con ramas de vida corta y feature flags en lugar de ramas de desarrollo que viven semanas; reserva las ramas largas para estabilizar releases. Mantén una sola versión de cada dependencia, en un monorepo o con la disciplina equivalente. Y trata la retirada de código como parte del oficio: piensa en la deprecación desde el diseño, usa avisos accionables y relevantes, prefiere la deprecación obligatoria con dueño, hitos y herramientas de descubrimiento, migración y prevención de retrocesos, y termina siempre borrando el código viejo.

### Errores comunes

- **Ramas de desarrollo que viven semanas** y terminan en merges dolorosos.
- **Varias versiones de la misma dependencia** sin una razón y sin plan.
- **Marcar algo como deprecado y no hacer nada más** (deprecación consultiva eterna).
- **Avisos que no dicen qué hacer** o que aparecen miles de veces en cada build.
- **Deprecar sin dueño ni hitos**: el sistema viejo vive para siempre.
- **No versionar la configuración o la documentación** del sistema.

## Conceptos clave

- **Fuente de verdad**: la rama y el repositorio acordados que contienen la versión actual del código.
- **Trunk-based development**: integrar cambios pequeños en la rama principal al menos a diario, sin ramas de desarrollo de larga vida.
- **Rama de release**: rama congelada para estabilizar una versión publicada; las correcciones van primero a trunk.
- **Regla de una sola versión**: para cada dependencia, no se puede elegir entre varias versiones en la organización.
- **Monorepo**: un único repositorio para el código de muchos proyectos de una organización.
- **Deprecación consultiva / obligatoria**: recomendar migrar sin fecha límite / retirar con fecha y cumplimiento forzado.
- **Aviso de deprecación accionable y relevante**: dice qué usar en su lugar y aparece cuando el usuario puede actuar.

## Preguntas de repaso

1. ¿Qué es la fuente de verdad en un sistema de control de versiones distribuido y por qué hace falta?
   R: Es la rama de un repositorio concreto que todo el equipo acuerda como la versión actual (por ejemplo, `main` en el remoto). Hace falta porque, aunque cada copia de Git es completa, sin una referencia acordada la colaboración se vuelve caótica: nadie sabe qué versión es la buena.
2. ¿Por qué Google desaconseja las ramas de desarrollo de larga vida?
   R: Porque los conflictos crecen con el tiempo y con el número de ramas, el merge final es un evento grande y arriesgado con cambios que nadie revisó juntos, y dan una falsa sensación de estabilidad. Se prefiere trunk-based development con cambios pequeños y feature flags.
3. Explica la regla de una sola versión y su beneficio.
   R: Para cada dependencia, los desarrolladores no pueden elegir entre varias versiones: hay una sola, la de trunk. Evita conflictos de dependencias y el "infierno de dependencias" cuando componentes que usan versiones distintas deben combinarse, y reduce la complejidad de mantener varias versiones.
4. ¿Qué diferencia hay entre deprecación consultiva y obligatoria, y por qué la consultiva rara vez basta?
   R: La consultiva recomienda migrar sin fecha ni obligación; la obligatoria tiene fecha límite y se hace cumplir. La consultiva rara vez basta porque, si lo viejo funciona, los usuarios existentes no tienen incentivos para migrar.
5. ¿Qué dos condiciones debe cumplir un aviso de deprecación? Escribe un ejemplo en TypeScript.
   R: Ser accionable (decir qué usar en su lugar) y relevante (aparecer cuando el usuario puede actuar, idealmente al escribir código nuevo). Ejemplo: `/** @deprecated Usa formatDateIso. Se eliminará en la v3.0. Guía: docs/migrations/dates.md */` sobre la función vieja, más una regla de lint que impida importarla en código nuevo.
6. ¿Qué tres áreas de herramientas ayudan a gestionar una deprecación?
   R: Descubrimiento (encontrar quién usa lo deprecado), migración (herramientas o codemods que reescriben los usos automáticamente) y prevención de retrocesos (reglas de lint o anotaciones que impiden usos nuevos).

## Ejercicio

En un repositorio de práctica con una pequeña librería TypeScript (por ejemplo, utilidades de fechas con al menos tres consumidores internos en otras carpetas): (1) escribe en `CONTRIBUTING.md` la estrategia de ramas del proyecto (trunk-based, ramas de vida corta, feature flags, cuándo se crea una rama de release) con una justificación de tres líneas; (2) depreca una función pública siguiendo el ciclo completo: nueva función con tests, `@deprecated` accionable en la vieja, regla de ESLint que bloquea usos nuevos, una guía de migración breve en `docs/migrations/`, migración de los tres consumidores en commits separados y, por último, un commit que borra la función vieja; (3) usa `git log --oneline` para comprobar que el historial cuenta la historia de la deprecación. Terminado cuando la función vieja ya no existe, los tests pasan en cada commit del proceso y la regla de lint falló al menos una vez al intentar un uso nuevo antes de la migración.

## Explícalo con tus palabras

Explica a alguien por qué borrar código viejo es tan valioso como escribir código nuevo y por qué cuesta tanto hacerlo.
