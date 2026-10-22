---
title: Deprecación, evolución de contratos e integración continua
kind: lesson
hours: 3
sources: Software Engineering at Google, cap. 15 Deprecation (pp. 355–369), cap. 16 Version Control and Branch Management (pp. 370–395), cap. 23 Continuous Integration (pp. 538–567) y cap. 24 Continuous Delivery (pp. 568–579) | The Pragmatic Programmer, temas 19 Version Control, 50 Coconuts Don't Cut It y 51 Pragmatic Starter Kit (pp. 161–167, 446–461)
---

## Objetivo

Cambiar un contrato que otros ya usan sin romperlos: distinguir los cambios compatibles de los que rompen, evolucionar una API con el patrón expandir y contraer, y retirar lo viejo con una deprecación ordenada (avisos accionables, dueño, hitos y herramientas de descubrimiento, migración y prevención). Lo completas con lo esencial de la política de ramas y de la integración y entrega continuas, que son el sistema de feedback que hace seguro cambiar a menudo. Al terminar vas a poder planificar la evolución de una función pública en TypeScript de principio a fin.

## Estudio

### El código es un pasivo

Cada línea de código que mantienes tiene un costo continuo: hay que entenderla, protegerla, migrarla de plataforma y mantenerla compatible con todo lo que la usa. Lo valioso es la **funcionalidad**, no el código. Por eso retirar sistemas y APIs viejos es parte del oficio, y el capítulo 15 de *Software Engineering at Google* le dedica un tema que casi nadie enseña: la **deprecación**, el proceso de retirar ordenadamente algo y migrar a sus usuarios a una alternativa.

¿Por qué cuesta tanto? Por la ley de Hyrum de la sesión 1: un sistema con usuarios tiene muchos más contratos implícitos de los que crees. Además, los usuarios no tienen incentivos para migrar (lo viejo funciona) y nadie quiere el trabajo poco visible de hacerlo. La primera recomendación es **pensar en la evolución desde el diseño**: interfaces pequeñas, superficie observable mínima y fronteras limpias (sesión 7) hacen que una API se pueda reemplazar por partes.

### Cambios compatibles y cambios que rompen

Antes de cambiar un contrato, clasifica el cambio desde el punto de vista de quien lo consume. La regla general: **puedes aceptar más y prometer lo mismo; no puedes aceptar menos ni prometer menos**.

| Cambio en una función o API pública | ¿Rompe a los consumidores? | Por qué |
| --- | --- | --- |
| Añadir un parámetro **opcional** al final | No | Las llamadas existentes siguen siendo válidas |
| Añadir un campo nuevo a la respuesta | Normalmente no | Salvo para quien valida el objeto de forma estricta (Hyrum) |
| Añadir una función o un endpoint nuevo | No | Nadie dependía de él |
| Añadir un parámetro **obligatorio** | Sí | Todas las llamadas existentes dejan de compilar o fallan |
| Quitar o renombrar un campo, función o export | Sí | Quien lo usaba se rompe |
| Cambiar el tipo o el formato de un valor (`DD/MM/AAAA` → ISO) | Sí | Cambia lo que el consumidor recibe o envía |
| Aceptar menos entradas (validación más estricta) | Sí | Peticiones que antes funcionaban ahora fallan |
| Añadir un valor nuevo a una unión que se devuelve | Puede romper | Un `switch` exhaustivo del consumidor deja de cubrir todos los casos |

El último caso es sutil en TypeScript: si devuelves `status: "paid" | "pending"` y añades `"refunded"`, el código del consumidor con `const unreachable: never = status` deja de compilar. Desde tu lado parece "solo añadir", pero amplía lo que prometes devolver. Y recuerda la ley de Hyrum: el orden, los tiempos y el texto de los errores también son observables, así que "compatible según el tipo" no siempre es "compatible en la práctica".

Para librerías publicadas, el **versionado semántico** comunica esta clasificación: un cambio que rompe sube la versión mayor (2.x → 3.0), una funcionalidad compatible sube la menor y un arreglo sube el parche. No evita las roturas por Hyrum, pero le dice a cada consumidor cuándo debe revisar.

### Evolucionar sin romper: expandir y contraer

La técnica para hacer un cambio incompatible sin que nadie se rompa a la vez es el patrón **expandir y contraer** (*expand and contract*, también llamado *parallel change*): en lugar de cambiar el contrato en un paso, lo haces en tres.

```
1. Expandir:  la forma nueva convive con la vieja (ambas funcionan)
2. Migrar:    los consumidores pasan, uno a uno, a la forma nueva
3. Contraer:  cuando la vieja no tiene usos, se borra
```

Por ejemplo, para cambiar el formato de fechas de una librería interna:

```ts
// Paso 1, expandir: la nueva función convive con la vieja, que se marca deprecada.
/** Devuelve la fecha de calendario en ISO 8601 (AAAA-MM-DD). */
export function formatPlanDateIso(date: CalendarDate): string {
  return `${date.year}-${pad(date.month)}-${pad(date.day)}`;
}

/**
 * @deprecated Usa {@link formatPlanDateIso}. Devuelve DD/MM/AAAA y se elimina
 * en la v3.0 (prevista para 2027-01). Guía: docs/migrations/format-plan-date.md
 */
export function formatPlanDate(date: CalendarDate): string {
  return `${pad(date.day)}/${pad(date.month)}/${date.year}`;
}

// Paso 2, migrar: cada consumidor cambia en su propio commit, con sus tests en verde.
// Paso 3, contraer: un commit que borra formatPlanDate cuando ya no tiene usos.
```

El mismo patrón sirve para un campo de una base de datos o de un JSON (escribir los dos campos, migrar a quien lee, dejar de escribir el viejo) o para un parámetro (aceptar ambos, avisar del viejo, retirarlo). En cada paso, todo el sistema funciona y cada paso se puede revertir solo. Fíjate en que la función nueva trabaja con una fecha de calendario explícita: así evitas el bug clásico de `toISOString`, que usa UTC y cerca de medianoche puede devolver otro día.

### Deprecación consultiva y obligatoria

El libro distingue dos tipos:

- **Consultiva** (*advisory*): sin fecha ni obligación; se informa de que existe algo mejor. Sirve para que los usuarios **nuevos** elijan bien, pero **casi nunca consigue que los existentes migren**: si lo viejo funciona, nadie se mueve.
- **Obligatoria** (*compulsory*): tiene fecha límite y se hace cumplir (el sistema viejo se apaga, o una herramienta impide usos nuevos). Es la que realmente retira sistemas, y funciona cuando el equipo que depreca **hace la migración él mismo o la hace muy fácil**: la churn rule de la sesión 1.

Un aviso de deprecación solo sirve si es **accionable** (dice qué usar en su lugar y dónde está la guía) y **relevante** (aparece cuando el usuario puede actuar, idealmente al escribir código nuevo, no como mil advertencias en cada build que todos aprenden a ignorar). La etiqueta `@deprecated` de TSDoc hace que el editor tache el uso y muestre el mensaje en el momento justo.

### Gestionar la deprecación como un proyecto

Una deprecación sin dueño no termina nunca. El libro pide tratarla como un proyecto más:

- **Un dueño** responsable de llevarla hasta el final. Los sistemas abandonados son los más difíciles de retirar, porque nadie tiene el conocimiento ni el mandato.
- **Hitos** medibles: "ningún uso nuevo desde marzo", "50 % migrado en junio", "borrado en septiembre". Celebrarlos mantiene el impulso en un trabajo poco visible.
- **Herramientas** en tres áreas: **descubrimiento** (búsqueda de código y logs de uso para saber quién depende de qué), **migración** (codemods con jscodeshift o ts-morph que reescriben los usos) y **prevención de retrocesos** (impedir que aparezcan usos nuevos mientras migras).

```js
// eslint.config.js: bloquear usos nuevos de la API deprecada
{
  rules: {
    "no-restricted-imports": ["error", {
      paths: [{
        name: "@acme/dates",
        importNames: ["formatPlanDate"],
        message: "Deprecada: usa formatPlanDateIso (docs/migrations/format-plan-date.md).",
      }],
    }],
  },
}
```

El ciclo de vida completo de una API queda así: **diseño** con superficie mínima; **evolución** con cambios compatibles; **reemplazo** expandiendo con la forma nueva y un aviso accionable; **migración** con descubrimiento, codemods y bloqueo de usos nuevos; y **retirada**, el commit que borra el código viejo y que hace que todo el proceso haya valido la pena.

### Política de ramas: una fuente de verdad y una sola versión

El capítulo 16 trata el control de versiones como **política** más que como herramienta (los comandos de Git los practicas en el módulo 11). Tres ideas importan para evolucionar contratos:

- **Una fuente de verdad**: aunque Git sea distribuido, el equipo acuerda una rama en un repositorio (`main` en el remoto) como "la versión actual".
- **Trunk-based development**: todos integran cambios pequeños en `main` al menos a diario, con ramas de horas o pocos días y **feature flags** para lo incompleto, en lugar de ramas de desarrollo que viven semanas y terminan en merges grandes y arriesgados. Los mensajes de commit explican el porqué (con Conventional Commits, el tipo `feat`, `fix` o `refactor` anuncia si cambia el comportamiento).
- **La regla de una sola versión**: para cada dependencia, nadie puede elegir entre varias versiones; hay una, la de trunk. Esto hace posible la churn rule: el dueño de una librería puede cambiarla y migrar a todos sus consumidores en el mismo repositorio, con sus tests, en lugar de mantener la versión vieja para siempre. En un proyecto pequeño se traduce en un único `package.json` con su lockfile versionado y actualizaciones frecuentes.

### Integración continua: el sistema de feedback

La **integración continua** clásica integra el trabajo del equipo al menos a diario y verifica cada integración con un build automático y sus tests. Google la amplía: es la integración continua de **todo el ecosistema** del que depende tu software (librerías, servicios de otros equipos, configuración), para enterarte lo antes posible de que algo dejó de encajar. El feedback tiene que ser **rápido** (el costo de un bug crece cuanto más tarde aparece) y **accionable** (qué falló, por qué y cómo reproducirlo).

- **Presubmit**: comprobaciones rápidas y fiables antes de integrar (en GitHub, las del pull request). Protegen al autor sin hacerle esperar.
- **Postsubmit**: la batería completa sobre `main`, incluidos los tests de quienes dependen del cambio. Dos cambios que pasan por separado pueden romper algo juntos, y aquí se detecta.
- **Si `main` se rompe, se revierte primero** y se investiga después: un trunk roto bloquea a todos.

Para la evolución de contratos, la CI es lo que hace segura la fase de migración: si los tests de los consumidores corren en postsubmit, sabes en minutos si un paso del expandir y contraer rompió a alguien.

### Entrega continua y el kit de inicio pragmático

La **entrega continua** (capítulo 24) publica **con frecuencia y en lotes pequeños**, automatiza el release, **aísla los cambios con feature flags**, mide la fiabilidad, decide con datos y despliega por fases. Con **trenes de release** que salen a horas fijas con lo que esté listo, nadie bloquea a nadie, y se acepta que **ningún binario es perfecto**: lo importante es detectar y corregir rápido, no retrasar el release buscando la perfección. Diez cambios pequeños en una semana son menos arriesgados que uno grande con los mismos diez cambios, porque cada uno se diagnostica y se revierte solo.

*The Pragmatic Programmer* cierra con el **kit de inicio pragmático**, la base mínima de todo proyecto:

1. **Control de versiones** para todo, y builds y releases hechos desde él, nunca desde el portátil de alguien.
2. **Tests de regresión**: prueba pronto, a menudo y automáticamente; el código no está terminado hasta que pasan; **usa saboteadores** (introduce bugs a propósito y comprueba que los tests los detectan, la idea del *mutation testing*); y encuentra cada bug una sola vez, porque después lo detecta un test.
3. **Automatización total**: ningún procedimiento manual, porque es inconsistente, depende de que la persona correcta esté disponible y no escala.

El mismo libro advierte contra los **cultos cargo** ("los cocos no sirven"): copiar el pipeline o el proceso de una gran empresa sin entender qué problema resuelve cada paso. Cada comprobación de tu CI debe existir por una razón concreta. El pipeline real con GitHub Actions, la detección de secretos con gitleaks y los hooks de pre-commit los montas paso a paso en la ruta Cloud, al final del plan.

### Errores comunes

- **Cambiar un contrato en un solo paso** cuando tiene consumidores, en lugar de expandir y contraer.
- **Creer que "solo añadir" nunca rompe**: un valor nuevo en una unión devuelta o un campo validado de forma estricta sí pueden romper.
- **Marcar algo como deprecado y no hacer nada más** (deprecación consultiva eterna) o deprecar sin dueño ni hitos.
- **Avisos que no dicen qué hacer** o que aparecen miles de veces en cada build.
- **Olvidar el último paso**: el código viejo que nunca se borra sigue costando.
- **Ramas de desarrollo que viven semanas** y varias versiones de la misma dependencia sin plan.
- **Trunk roto durante horas** mientras se busca un arreglo en lugar de revertir, y pasos manuales en el release.

### Resumen

Cada contrato con consumidores es una promesa: puedes aceptar más y prometer lo mismo, pero quitar, renombrar, endurecer la validación o cambiar formatos rompe a alguien. Para hacerlo sin romper a nadie, expande (la forma nueva convive con la vieja), migra y contrae. Retira lo viejo con una deprecación obligatoria, con aviso accionable y relevante, dueño, hitos y herramientas de descubrimiento, migración y prevención, y termina siempre borrando el código. Una fuente de verdad, trunk-based development y una sola versión de cada dependencia permiten migrar a todos a la vez; la integración y la entrega continuas dan el feedback rápido que hace seguro cambiar a menudo, y el kit pragmático lo resume en control de versiones, tests de regresión y automatización total.

## Conceptos clave

- **Código como pasivo**: lo valioso es la funcionalidad; cada línea mantenida tiene un costo continuo.
- **Cambio compatible / que rompe**: el que no obliga a los consumidores a cambiar / el que sí.
- **Expandir y contraer**: evolucionar un contrato en tres pasos (convivencia, migración, borrado) sin romper a nadie.
- **Versionado semántico**: mayor para cambios que rompen, menor para funcionalidad compatible, parche para arreglos.
- **Deprecación consultiva / obligatoria**: recomendar migrar sin fecha / retirar con fecha y cumplimiento forzado.
- **Aviso de deprecación accionable y relevante**: dice qué usar en su lugar y aparece cuando el usuario puede actuar.
- **Trunk-based development**: integrar cambios pequeños en la rama principal al menos a diario.
- **Regla de una sola versión**: para cada dependencia no se puede elegir entre varias versiones.
- **Presubmit / postsubmit**: comprobaciones antes de integrar un cambio / después, sobre la rama principal.
- **Kit de inicio pragmático**: control de versiones, tests de regresión y automatización total.

## Preguntas de repaso

1. Clasifica estos cambios en una función pública como compatibles o no: añadir un parámetro opcional, añadir un parámetro obligatorio, añadir `"refunded"` a la unión de estados que devuelve.
   R: El parámetro opcional es compatible porque las llamadas existentes siguen siendo válidas. El obligatorio rompe todas las llamadas. Añadir un valor a una unión devuelta puede romper: amplía lo que se promete devolver y los `switch` exhaustivos de los consumidores dejan de cubrir todos los casos.
2. Explica el patrón expandir y contraer con un ejemplo.
   R: Es hacer un cambio incompatible en tres pasos: expandir (la forma nueva convive con la vieja, que se marca deprecada), migrar (los consumidores pasan uno a uno) y contraer (se borra la vieja sin usos). Ejemplo: añadir `formatPlanDateIso`, deprecar `formatPlanDate`, migrar cada consumidor en su commit y borrar la vieja al final. En cada paso todo funciona y se puede revertir.
3. ¿Qué diferencia hay entre deprecación consultiva y obligatoria, y por qué la consultiva rara vez basta?
   R: La consultiva recomienda migrar sin fecha ni obligación; la obligatoria tiene fecha límite y se hace cumplir. La consultiva rara vez basta porque, si lo viejo funciona, los usuarios existentes no tienen incentivos para migrar.
4. ¿Qué dos condiciones debe cumplir un aviso de deprecación? Escribe un ejemplo en TypeScript.
   R: Ser accionable (decir qué usar en su lugar) y relevante (aparecer cuando el usuario puede actuar, al escribir código nuevo). Ejemplo: `/** @deprecated Usa formatPlanDateIso. Se elimina en la v3.0. Guía: docs/migrations/format-plan-date.md */`, más una regla `no-restricted-imports` que bloquee usos nuevos.
5. ¿Qué tres áreas de herramientas ayudan a gestionar una deprecación?
   R: Descubrimiento (encontrar quién usa lo deprecado), migración (codemods que reescriben los usos automáticamente) y prevención de retrocesos (reglas de lint o anotaciones que impiden usos nuevos).
6. ¿Cómo ayuda la regla de una sola versión a evolucionar una librería interna?
   R: Como solo existe la versión de trunk, el dueño de la librería puede cambiarla y migrar a todos sus consumidores en el mismo repositorio, con sus tests, en lugar de mantener versiones viejas indefinidamente; evita además los conflictos entre componentes que dependen de versiones distintas.
7. ¿Por qué el presubmit no es suficiente y qué hace el postsubmit?
   R: Porque ejecutar todos los tests afectados por cada cambio sería demasiado lento y caro, y dos cambios que pasan por separado pueden romper algo al combinarse. El presubmit ejecuta tests rápidos para proteger al autor; el postsubmit ejecuta la batería completa sobre trunk, incluidos los consumidores, y si algo se rompe se revierte primero.
8. Enumera los tres pilares del kit de inicio pragmático y dos reglas sobre los tests de regresión.
   R: Control de versiones, tests de regresión y automatización total. Reglas: probar pronto, a menudo y automáticamente; el código no está terminado hasta que pasan todos los tests; usar saboteadores para probar los tests; encontrar cada bug una sola vez.

## Ejercicio

En un repositorio de práctica con una pequeña librería TypeScript de utilidades de fechas y al menos tres consumidores internos en otras carpetas: (1) escribe en `CONTRIBUTING.md` la estrategia del proyecto (trunk-based, ramas de vida corta, feature flags, "si `main` se rompe, se revierte primero") con una justificación de tres líneas; (2) clasifica por escrito tres cambios posibles de la librería como compatibles o no, con su razón; (3) evoluciona una función pública con expandir y contraer: nueva función con tests, `@deprecated` accionable en la vieja, regla de ESLint que bloquea usos nuevos, guía de migración en `docs/migrations/`, migración de los tres consumidores en commits separados y un commit final que borra la vieja; (4) aplica un saboteador: cambia una condición de la función nueva y comprueba que algún test falla, y si no falla, escribe el test que faltaba. Terminado cuando la función vieja ya no existe, los tests pasan en cada commit del proceso, la regla de lint falló al menos una vez ante un uso nuevo y `git log --oneline` cuenta la historia completa de la deprecación.

## Explícalo con tus palabras

Explica a alguien por qué borrar código viejo es tan valioso como escribir código nuevo, y por qué cambiar un contrato en tres pasos es más seguro que hacerlo en uno.
