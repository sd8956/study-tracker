---
title: Guías de estilo, análisis estático y documentación como código
kind: lesson
hours: 3
sources: Software Engineering at Google, cap. 8 Style Guides and Rules (pp. 169–194), cap. 20 Static Analysis (pp. 471–483), cap. 10 Documentation (pp. 216–239) y cap. 3 Knowledge Sharing (pp. 61–87) | The Pragmatic Programmer, tema 7 Communicate! (pp. 63–72) | Gentleman Programming Book, cap. 10 Typescript Con De Tuti (buenas prácticas)
links: Gentleman · Typescript Con De Tuti | https://the-amazing-gentleman-programming-book.vercel.app/es/book/Chapter10_TypeScript ; Google TypeScript Style Guide | https://google.github.io/styleguide/tsguide.html
---

## Objetivo

Escribir en el repositorio lo que un equipo necesita saber para trabajar sin pisarse: reglas de estilo que se justifican y se aplican con herramientas (formateadores, linters y análisis estático), y documentación tratada como código (versionada, revisada, con dueño y una audiencia clara). A esto se suma cómo circula el conocimiento en una organización. Al terminar vas a poder configurar las reglas de un proyecto TypeScript con su porqué y escribir un README y un documento de diseño breve con la estructura adecuada.

## Estudio

### Por qué tener reglas

En la sesión 4 viste que un equipo debe tener un solo estilo de formato. El capítulo 8 de *Software Engineering at Google* lleva la idea más lejos: Google tiene **guías de estilo** por lenguaje que cubren formato, pero también qué características usar, cuáles evitar y cómo. El objetivo no es restringir la creatividad sino **gestionar la complejidad**: con miles de ingenieros leyendo código ajeno a diario, cada variación innecesaria es un costo multiplicado por miles de lecturas. Es el eje de la escala de la sesión 1.

### Cinco principios para que una regla merezca existir

1. **Debe compensar su costo.** Cada regla hay que aprenderla, recordarla y aplicarla; no se prohíbe lo que nadie haría por error.
2. **Optimiza para quien lee, no para quien escribe.** El código se lee muchas más veces de las que se escribe; un tipo de retorno anotado o una constante con nombre dejan evidencia de la intención.
3. **Sé consistente.** Si todo el código sigue las mismas normas, la gente se concentra en qué hace el código y las herramientas pueden transformarlo. En muchas reglas **importa más elegir que la elección concreta**: "¿2 o 4 espacios?" importa mucho menos que "todos usamos lo mismo".
4. **Evita construcciones propensas a errores.** En TypeScript: `==` (usa `===`), `var` (usa `const`/`let`), `any` (usa `unknown` y estrecha), aserciones `as` innecesarias, `enum` numéricos (usa uniones de literales), `export default` (usa exportaciones con nombre) y promesas sin `await` ni `.catch`.
5. **Cede ante la practicidad.** Las reglas no son dogma; las excepciones conscientes y justificadas están permitidas.

Google clasifica sus reglas en tres grupos: para **evitar peligros** (bugs, seguridad, rendimiento: nada de `eval`, nada de promesas sueltas), para **imponer buenas prácticas** (mantenibilidad: documentar las APIs públicas) y para **asegurar consistencia** (decisiones arbitrarias pero útiles: formato, orden de imports, nombres). Además de reglas obligatorias tiene **guías** (*guidance*): consejos que conviene seguir sin ser obligatorios.

Las reglas también cambian. Google documenta **la razón** de cada una, porque una regla que solo dice "haz X" no se puede reevaluar cuando el lenguaje evoluciona. Cualquier ingeniero puede proponer un cambio con argumentos, y deciden los **árbitros de estilo** de cada lenguaje. En un equipo pequeño basta con un `STYLE.md` (o la configuración comentada del linter) donde cada regla no obvia tiene su porqué, y un pull request como forma de proponer cambios.

### Aplicar las reglas: herramientas, no personas

Una guía de estilo que se aplica a mano es una guía que se incumple. Los formateadores eliminan las discusiones de formato (en Google, `gofmt` hizo posibles los cambios automáticos a gran escala), los linters y el análisis estático detectan lo demás, y el code review queda para lo que solo una persona puede juzgar. Una regla de oro: **si un comentario de review se repite mucho, es candidato a regla automática**.

| Comentario repetido en reviews | Veces | Regla automática |
| --- | --- | --- |
| "Falta un `await` aquí" | 7 | `@typescript-eslint/no-floating-promises` |
| "Formatea el archivo" | 9 | Prettier con check en CI |
| "Usa `===`" | 4 | `eqeqeq` |
| "Este nombre no se entiende" | 6 | No automatizable: queda para el review |

Una configuración razonable para TypeScript, con la categoría y el porqué de cada regla a la vista:

```js
// eslint.config.js (fragmento, ESLint con typescript-eslint)
export default [
  ...tseslint.configs.strictTypeChecked,
  {
    rules: {
      // Peligro: errores perdidos en promesas
      "@typescript-eslint/no-floating-promises": "error",
      // Peligro: any desactiva el compilador
      "@typescript-eslint/no-explicit-any": "error",
      // Buena práctica: exportaciones con nombre (refactors y búsquedas más fáciles)
      "import/no-default-export": "error",
      // Consistencia: se decide una vez y no se discute en reviews
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
    },
  },
];
```

Junto con un `tsconfig.json` estricto (`strict`, `noUncheckedIndexedAccess`, `noFallthroughCasesInSwitch`), el flujo queda así: el editor marca errores al escribir, el formateador actúa al guardar, un hook de pre-commit revisa los archivos cambiados y la CI lo exige en cada pull request. Es *shifting left*: un error de formato detectado al guardar no cuesta nada; el mismo error discutido en un review cuesta minutos de dos personas.

El capítulo de TypeScript del Gentleman Book aporta "guías" en el mismo espíritu: anota tipos donde aportan claridad (sobre todo en funciones públicas), documenta a través de los tipos, revisa el tipado en los code reviews (un `any` o un `as` deberían despertar preguntas), usa ESLint como complemento del compilador y elige de forma consistente entre `type` e `interface`.

### Excepciones bien hechas y reglas propias

Ceder ante la practicidad no es dejar ventanas rotas. La diferencia está en cómo se hace:

```ts
// Mal: desactiva todo el archivo, sin explicación
/* eslint-disable */

// Bien: una regla concreta, una línea concreta, con la razón
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- el SDK de pagos no publica tipos (issue #212)
const response: any = await paymentsSdk.charge(request);

// Bien: el compilador avisará cuando el error desaparezca
// @ts-expect-error -- la v2.x tipa mal este parámetro; quitar al actualizar
legacyLib.configure({ retries: "3" });
```

Desactiva la regla **más específica**, en el **ámbito más pequeño** y **siempre con una razón**. `@ts-expect-error` es preferible a `@ts-ignore` porque falla cuando el problema desaparece. Y si tu equipo repite un error propio del dominio (importar la base de datos desde un componente, rompiendo la arquitectura de la sesión 15), `no-restricted-imports` convierte la convención en estructura, con un mensaje que dice qué hacer en lugar de solo prohibir.

### Análisis estático: solo funciona si la gente confía en él

El capítulo 20 describe Tricorder, la plataforma de Google que ejecuta cientos de analizadores sobre cada cambio y muestra los resultados en el code review. Su lección principal: **el análisis estático solo funciona si los desarrolladores confían en él**. Un aviso es un **falso positivo efectivo** si el desarrollador no hace nada al verlo, sea porque era incorrecto o porque no se entendía; lo que cuenta es la percepción de quien lo recibe. El objetivo de Google: **menos del 10 %** de falsos positivos efectivos.

Para entrar en Tricorder, un analizador debe ser comprensible, accionable (idealmente con una **corrección sugerida** de un clic), tener ese bajo nivel de falsos positivos y un impacto real en la calidad. Los resultados aparecen **donde el desarrollador ya está mirando** (editor, compilador, review), nunca en un informe semanal que nadie abre, y cada aviso tiene un botón de "no útil" que hace revisar o desactivar los analizadores ruidosos. Un linter con cientos de avisos que todos ignoran entrena al equipo para ignorar también los importantes.

### La documentación es como el código

Todos nos quejamos de la falta de documentación y casi nadie la escribe: se ve como una habilidad aparte, el beneficio lo disfruta otro más tarde y las herramientas suelen estar fuera del flujo de trabajo. Pero escribirla también beneficia a quien la escribe: si te cuesta explicar cómo se usa tu API, probablemente está mal diseñada; además, reduce preguntas y deja registro de por qué el código es como es.

La idea central del capítulo 10: **trata la documentación como código**. Vive en el repositorio, tiene historial, un **dueño** responsable, pasa por code review, sus errores se reportan como bugs y se revisa periódicamente para detectar lo obsoleto. La gran ventaja: un cambio de comportamiento y la actualización de su documentación **van en el mismo pull request**, y quien revisa comprueba que coinciden. *The Pragmatic Programmer* lo dice a su manera: construye la documentación dentro del proceso, no la añadas al final. Y aplica DRY: lo que se puede generar a partir del código (la referencia desde los tipos y el TSDoc) se genera.

### Audiencia y tipos de documento

El error más común es escribir para la audiencia equivocada, o para todas a la vez. Los lectores difieren en experiencia, en conocimiento del dominio y en propósito (quien **usa** una API quiere saber cómo usarla; quien la **mantiene**, cómo funciona por dentro), y en cómo llegan: los **buscadores** saben qué quieren y necesitan encontrarlo rápido; los **exploradores** necesitan orientación. Escribe recordando lo que sentías cuando no sabías nada del tema.

Cada documento tiene **un solo propósito**:

| Tipo | Para qué sirve | Clave |
| --- | --- | --- |
| **Referencia** | Cómo se usa el código (comentarios de archivo, clase y función) | Empieza por un verbo; documenta lo que el tipo no dice |
| **Diseño** | Problema, objetivos y no objetivos, solución, alternativas descartadas, riesgos y pruebas | Se escribe y revisa **antes** de construir |
| **Tutorial** | Llevar a alguien desde cero hasta un resultado que funciona | Pasos numerados, probados desde una máquina limpia |
| **Conceptual** | Cómo encajan las piezas y por qué | Complementa a la referencia; suele ser la que más falta |
| **Página de inicio** | Qué es, para quién y dónde está lo importante | Breve: un mapa, no un cajón de sastre |

Todo documento debería responder **quién** (para quién es), **qué** (su propósito en una frase), **cuándo** (escrito y revisado), **dónde** (y dónde está lo relacionado) y **por qué** (qué podrá hacer el lector después), con principio, medio y fin. Los documentos importantes pasan por revisión técnica, de audiencia y de redacción. Y los documentos **también se deprecan**: uno obsoleto es peor que ninguno, como un comentario que miente. Márcalo con un enlace a su reemplazo o bórralo.

Un README que aplica todo esto:

```markdown
# Study Tracker

Planificador de estudio local: qué estudiar hoy, cronómetro de inglés y progreso.
Para quien sigue el plan de estudio de este repositorio.

### Empezar (5 minutos)
1. Node 22.5 o superior (`node --version`).
2. `npm install`
3. `npm run dev` y abre http://127.0.0.1:3000

### Cómo funciona
- El contenido vive en `content/` (formato en docs/CONTENT-FORMAT.md).
- El progreso se guarda en SQLite (`data/study.db`).

### Dueño y última revisión
@duque · revisado 2026-10-20
```

Principio (qué es y para quién), un tutorial mínimo numerado, un mapa hacia los demás documentos y el quién/cuándo. En un documento de diseño, la sección que más valor da con los años suele ser **"Alternativas consideradas"**: cuando alguien pregunte "¿por qué no usamos X?", la respuesta estará escrita. Para decisiones puntuales, los **ADR** (*Architecture Decision Records*) son archivos cortos y numerados con contexto, decisión y consecuencias; no se editan: uno nuevo reemplaza al anterior y se enlazan.

### Compartir conocimiento

El capítulo 3 trata cómo fluye el conocimiento en una organización. Los obstáculos más comunes: falta de **seguridad psicológica** (nadie pregunta por miedo a parecer ignorante), **islas de información** que producen fragmentación, duplicación y desviación, **puntos únicos de fallo** (el factor bus), repetir patrones sin entenderlos y **cementerios encantados**: código que nadie se atreve a tocar.

Lo que funciona:

- **Seguridad psicológica**: mentores distintos del jefe para las "preguntas tontas", y nada de fingir sorpresa ("¿cómo que no sabes qué es un monorepo?").
- **Preguntar y entender el contexto**: la **valla de Chesterton** dice que no quites una valla del camino sin averiguar antes por qué está ahí. Muchas rarezas del código tienen una razón (un bug antiguo, un requisito legal); otras no, y entonces sí se quitan.
- **Escalar las preguntas**: preguntar en un canal del equipo deja la respuesta disponible para todos.
- **Siempre hay algo que enseñar**: si aprendiste algo que no estaba documentado, documéntalo; si un paso de un tutorial no funcionaba, arréglalo. Es la regla del boy scout aplicada a los documentos.
- **Fuentes canónicas**: lugares de referencia acordados (guías, enlaces cortos memorables, tutoriales interactivos), y el propio análisis estático, que difunde buenas prácticas justo cuando hacen falta.

Google añade su programa de **legibilidad**: revisores certificados que enseñan, comentando cambios reales, a escribir código idiomático. Es mentoría estandarizada, con un costo explícito (más latencia de revisión) a cambio de calidad, consistencia y pericia a largo plazo; lo verás junto al code review en la sesión 26.

### Errores comunes

- **Reglas sin porqué**, que nadie sabe si siguen siendo válidas, y reglas que no compensan su costo.
- **Aplicar las reglas a mano** en los code reviews y discutir gustos en lugar de elegir una vez.
- **Linters ruidosos** o cientos de reglas activadas de golpe sobre código existente sin plan de migración.
- **Desactivar reglas sin justificar** (`eslint-disable` de archivo, `@ts-ignore`).
- **Documentar al final** o fuera del repositorio, sin dueño ni revisión.
- **Un documento para todas las audiencias** y tutoriales con pasos implícitos que nadie probó desde cero.
- **Castigar las preguntas** y quitar vallas sin entender por qué están.

### Resumen

Las reglas de estilo existen para que cualquier persona entienda cualquier parte del código. Una buena regla compensa su costo, optimiza para quien lee, aporta consistencia, evita construcciones peligrosas y tiene su porqué escrito; se aplica con herramientas (formateador, linter, análisis estático en el editor, los hooks y la CI) y deja al code review lo que necesita juicio humano. El análisis estático solo sirve si es fiable y accionable. La documentación se trata como código: en el repositorio, con dueño, revisada y actualizada en el mismo cambio que el comportamiento, con un propósito y una audiencia por documento. Y el conocimiento circula cuando hay seguridad para preguntar, preguntas hechas en público y fuentes canónicas.

## Conceptos clave

- **Guía de estilo**: reglas y recomendaciones sobre cómo escribir código en un lenguaje dentro de una organización.
- **Optimizar para quien lee**: preferir la claridad en la lectura aunque cueste algo más al escribir.
- **Reglas de peligro, de buenas prácticas y de consistencia**: las tres categorías de reglas de Google.
- **Análisis estático**: herramientas que analizan el código sin ejecutarlo para detectar problemas.
- **Falso positivo efectivo**: aviso ante el que el desarrollador no actúa, por incorrecto o confuso.
- **Documentación como código**: versionada, revisada, con dueño, con seguimiento de errores y revisión periódica.
- **Documento de diseño**: describe problema, solución, alternativas y riesgos antes de construir.
- **Buscadores y exploradores**: lectores que saben qué buscan frente a lectores que necesitan orientación.
- **Islas de información**: grupos aislados que provocan fragmentación, duplicación y desviación.
- **Valla de Chesterton**: no eliminar algo hasta entender por qué existe.

## Preguntas de repaso

1. Enumera los cinco principios de Google para crear reglas de estilo.
   R: Las reglas deben compensar su costo, optimizar para quien lee, ser consistentes, evitar construcciones propensas a errores o sorprendentes y ceder ante la practicidad cuando sea necesario.
2. ¿Por qué en muchas reglas de consistencia "importa más elegir que la elección concreta"?
   R: Porque el beneficio viene de que todo el código se vea igual, lo que permite leerlo sin fricción y automatizar herramientas; la diferencia entre las opciones (2 o 4 espacios) es mucho menor que el costo de tener ambas.
3. ¿Por qué Google documenta la razón de cada regla y quién decide los cambios?
   R: Para poder reevaluarla cuando cambian las circunstancias (versiones del lenguaje, herramientas nuevas); una regla sin porqué no se puede revisar con criterio. Deciden los árbitros de estilo de cada lenguaje, a partir de propuestas argumentadas de cualquier ingeniero.
4. ¿Qué es un falso positivo efectivo, qué umbral usa Google y por qué importa tanto?
   R: Un aviso ante el que el desarrollador no hace nada, por ser incorrecto o confuso. Google exige menos del 10 %. Importa porque una herramienta ruidosa entrena a la gente para ignorar todos sus avisos, incluidos los correctos.
5. ¿Cómo se hace bien una excepción a una regla de lint o del compilador?
   R: Desactivando la regla más específica posible, en el ámbito más pequeño (una línea mejor que un archivo) y siempre con la razón escrita. `@ts-expect-error` es preferible a `@ts-ignore` porque falla cuando el problema desaparece.
6. ¿Qué significa tratar la documentación como código? Da tres prácticas concretas.
   R: Aplicarle las prácticas del código: guardarla en el repositorio junto al código, asignarle un dueño, revisarla en code review, reportar sus errores como bugs y revisarla periódicamente. Así se actualiza en el mismo pull request que el comportamiento que describe.
7. ¿Por qué un documento debería tener un solo propósito y una audiencia clara?
   R: Porque audiencias distintas necesitan cosas distintas: un usuario quiere saber cómo usar la API y un mantenedor cómo funciona; un buscador quiere encontrar rápido y un explorador necesita orientación. Un documento que intenta servir a todos no sirve bien a ninguno.
8. ¿Qué es la valla de Chesterton y cómo se aplica al código?
   R: No eliminar algo cuya razón desconoces hasta averiguar para qué sirve. Antes de quitar una comprobación o una rareza que parece absurda, entiende por qué existe (un bug antiguo, un requisito legal); si no tiene razón, entonces se puede quitar.

## Ejercicio

Para un proyecto TypeScript tuyo (o esta app): (1) crea un `STYLE.md` con al menos ocho reglas, cada una con su categoría (peligro, buena práctica o consistencia) y una línea con su porqué, y la configuración que las aplica (`tsconfig.json` estricto, ESLint con `typescript-eslint` y Prettier o Biome); añade un script `npm run check` que ejecute `tsc --noEmit`, el linter, el formateador en modo comprobación y los tests, e introduce a propósito cuatro violaciones para verificar que las detecta; (2) escribe un README con principio, tutorial mínimo numerado probado desde una carpeta limpia, mapa de documentos y dueño con fecha; (3) escribe un documento de diseño de máximo dos páginas para una funcionalidad futura con problema, objetivos, no objetivos, solución, dos alternativas descartadas con su razón y plan de pruebas. Terminado cuando `npm run check` pasa en el código limpio y falla con las cuatro violaciones, cada regla tiene categoría y porqué, alguien puede arrancar el proyecto siguiendo solo el README y el documento de diseño responde quién, qué, cuándo, dónde y por qué.

## Explícalo con tus palabras

Explica a alguien por qué automatizar las reglas de estilo hace que los code reviews sean más amables, y por qué la persona que más se beneficia de escribir documentación suele ser quien la escribe.
