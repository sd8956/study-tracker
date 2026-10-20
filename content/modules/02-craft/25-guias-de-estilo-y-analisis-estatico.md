---
title: Guías de estilo, reglas y análisis estático
kind: lesson
hours: 2
sources: Software Engineering at Google, cap. 8 Style Guides and Rules (pp. 169–194) | Software Engineering at Google, cap. 20 Static Analysis (pp. 471–483) | Gentleman Programming Book, cap. 10 Typescript Con De Tuti (buenas prácticas)
links: Gentleman · Typescript Con De Tuti | https://the-amazing-gentleman-programming-book.vercel.app/es/book/Chapter10_TypeScript ; Google TypeScript Style Guide | https://google.github.io/styleguide/tsguide.html
---

## Objetivo

Entender para qué sirve una guía de estilo, qué principios hacen que una regla merezca existir, cómo se cambian las reglas y cómo se aplican con herramientas (formateadores, linters, análisis estático) sin convertir la revisión de código en una discusión de gustos. Al terminar vas a poder diseñar y configurar las reglas de un proyecto TypeScript con justificación para cada una.

## Estudio

### Por qué tener reglas

En la sesión 6 viste que un equipo debe tener un solo estilo de formato. El capítulo 8 de *Software Engineering at Google* lleva la idea mucho más lejos: Google tiene **guías de estilo** para cada lenguaje principal, que no solo cubren formato sino también qué características del lenguaje usar, cuáles evitar y cómo. ¿Por qué tanta regla?

El objetivo de las reglas es **gestionar la complejidad y mantener un código base comprensible y mantenible**. Con decenas de miles de ingenieros, cada uno leyendo código ajeno a diario, cualquier variación innecesaria es un costo multiplicado por miles de lecturas. Las reglas no existen para restringir la creatividad, sino para que el código de cualquier equipo sea familiar para cualquier ingeniero. Es una aplicación directa del eje de la escala de la sesión 1.

### Principios para crear reglas

No cualquier regla merece existir. Google usa cinco principios guía:

**1. Las reglas deben compensar su costo** (*pull their weight*). Cada regla tiene un costo: hay que aprenderla, recordarla y aplicarla. Una regla solo se añade si su beneficio supera ese costo. Por eso Google no prohíbe cosas que casi nadie haría por error: no hace falta una regla contra lo que nadie hace.

**2. Optimiza para quien lee, no para quien escribe.** El código se lee muchas más veces de las que se escribe (la proporción de la sesión 2). Si una regla obliga a escribir un poco más pero hace la lectura más clara, vale la pena. Un ejemplo: preferir código explícito que deje "evidencia del comportamiento intencionado", como anotar un tipo de retorno o nombrar una constante en lugar de usar un número.

```ts
// Optimizado para quien escribe
export const f = (u, d) => u.filter((x) => x.t > d).length;

// Optimizado para quien lee
export function countUsersActiveSince(users: readonly User[], since: Date): number {
  return users.filter((user) => user.lastActiveAt > since).length;
}
```

**3. Sé consistente.** Cuando todo el código sigue las mismas normas, los ingenieros pueden concentrarse en **qué** hace el código y no en **cómo** está escrito. La consistencia también permite automatizar: herramientas que entienden y transforman el código asumen ciertas convenciones. El libro insiste en que, a menudo, **lo importante no es qué opción eliges, sino elegir una**: "¿2 o 4 espacios?" tiene una respuesta mucho menos importante que "todos usamos lo mismo". Y la consistencia debe mirar también hacia fuera: si la comunidad del lenguaje tiene una convención, conviene adoptarla.

**4. Evita construcciones propensas a errores y sorprendentes.** Algunas características del lenguaje son difíciles de usar bien o tienen comportamientos poco intuitivos. Las guías las restringen. En TypeScript y JavaScript, ejemplos típicos:

| Construcción | Problema | Alternativa |
| --- | --- | --- |
| `==` | Conversión de tipos sorprendente (`"" == 0` es `true`) | `===` |
| `var` | Ámbito de función y elevación inesperada | `const` / `let` |
| `any` | Desactiva el compilador | `unknown` y estrechamiento |
| Aserciones `as` innecesarias | Le mienten al compilador | Modelar el tipo correcto o validar |
| `enum` numéricos | Aceptan números arbitrarios en algunos casos | Uniones de literales con `as const` |
| `export default` | Nombres inconsistentes al importar, refactors más difíciles | Exportaciones con nombre |
| Promesas sin `await` ni `.catch` | Errores perdidos | Regla `no-floating-promises` |

**5. Cede ante la practicidad cuando sea necesario.** Las reglas no son dogma. A veces la eficiencia, la interoperabilidad con código externo o un caso excepcional justifican romperlas. Lo importante es que las excepciones sean conscientes y estén justificadas.

### Tipos de reglas

El libro clasifica las reglas de sus guías en tres grandes grupos:

- **Reglas para evitar peligros**: prohíben o restringen prácticas que causan bugs, problemas de seguridad o de rendimiento. Ejemplo: no usar `eval`, no dejar promesas sin manejar.
- **Reglas para imponer buenas prácticas**: aseguran que el código sea mantenible. Ejemplo: documentar las APIs públicas, preferir ciertas estructuras, nombrar de cierta forma.
- **Reglas para asegurar consistencia**: decisiones arbitrarias pero útiles, como el formato, el orden de las importaciones o la convención de nombres. Aquí, como dijimos, importa más elegir que la elección concreta.

Además de las reglas, Google mantiene **guías** (*guidance*): recomendaciones, consejos y buenas prácticas que no son obligatorias, como los "tips de la semana" de C++ o las secciones de "Effective" de cada lenguaje. Las reglas dicen lo que **debes** hacer; las guías, lo que **conviene** hacer.

### Cambiar las reglas

Las reglas no son eternas: el lenguaje evoluciona, aparecen nuevas herramientas y se aprende de la experiencia. Google documenta la **razón** de cada regla, para que cuando cambien las circunstancias se pueda reevaluar. Si una regla solo dice "haz X" sin explicar por qué, nadie sabe si sigue siendo válida.

El proceso: cualquier ingeniero puede proponer un cambio, con argumentos y datos. Las decisiones las toman los **árbitros de estilo** (*style arbiters*) de cada lenguaje, un pequeño grupo de expertos que buscan consenso pero tienen la última palabra. El libro cuenta, por ejemplo, cómo se revisaron reglas antiguas que dejaron de tener sentido con nuevas versiones del lenguaje. También existen **excepciones** concedidas para casos concretos, pero son raras y documentadas.

Para un equipo pequeño, la versión adaptada es: un documento `STYLE.md` (o la configuración comentada del linter) donde cada regla no obvia tiene su porqué, y un proceso sencillo para proponer cambios (un pull request que modifica la configuración y explica la razón).

### Aplicar las reglas: herramientas, no personas

Una guía de estilo que se aplica a mano es una guía que se incumple. Google insiste en **automatizar** la aplicación de las reglas siempre que sea posible:

- **Formateadores automáticos** (como `clang-format` o `gofmt` en Google; Prettier o Biome en TypeScript): eliminan por completo las discusiones de formato. En Google, el código Go se formatea siempre con `gofmt`, y eso hizo posibles herramientas automáticas de cambio a gran escala.
- **Comprobadores de errores** (linters, análisis estático): detectan violaciones de las reglas que no son de formato.
- **Code review**: para las reglas que no se pueden automatizar (por ejemplo, si un nombre es claro). Y aquí está la clave: si un comentario de review se repite mucho, es candidato a convertirse en una regla automática.

Esto conecta con la sesión 1: automatizar las reglas es **desplazar a la izquierda** la detección de problemas. Un error de formato detectado al guardar el archivo no cuesta nada; el mismo error discutido en un code review cuesta minutos de dos personas y algo de paciencia.

### Análisis estático: lo que hace que funcione

El capítulo 20 trata el **análisis estático**: herramientas que analizan el código sin ejecutarlo para encontrar bugs, malas prácticas o problemas de seguridad. Google tiene una plataforma llamada Tricorder que ejecuta cientos de analizadores sobre cada cambio y muestra los resultados en el code review.

La lección más importante del capítulo es que **el análisis estático solo funciona si los desarrolladores confían en él**. Para eso, Google se centra en tres cosas:

**1. La felicidad de los desarrolladores.** Si una herramienta da muchos **falsos positivos** (avisos de problemas que no lo son), los desarrolladores la ignoran, incluidos sus avisos correctos. Google habla de **falsos positivos efectivos**: un aviso es un falso positivo efectivo si el desarrollador no hace nada después de verlo, ya sea porque el aviso era incorrecto o porque era tan confuso que no lo entendió. Lo que importa es la percepción de quien lo recibe. Su objetivo: que los analizadores produzcan **menos del 10 % de falsos positivos efectivos**.

**2. Integrarlo en el flujo de trabajo principal.** Los resultados del análisis aparecen donde el desarrollador ya está mirando: en el compilador, en el editor, en el code review. Un informe semanal en un panel aparte nadie lo mira. Y cuanto antes aparezca (mientras editas, al compilar, en el review), más barato es corregir.

**3. Permitir que los usuarios contribuyan.** Los expertos de cada dominio (seguridad, rendimiento, una librería concreta) pueden escribir sus propios analizadores, en lugar de depender de un único equipo central.

Criterios que debe cumplir un analizador para entrar en Tricorder:

- **Ser comprensible**: cualquier ingeniero entiende el aviso.
- **Ser accionable y fácil de corregir**: idealmente con una **corrección sugerida** que se aplica con un clic.
- **Producir menos del 10 % de falsos positivos efectivos.**
- **Tener potencial de impacto significativo** en la calidad del código.

Y un mecanismo de feedback: cada aviso tiene un botón de "no útil". Si un analizador recibe muchos, se revisa o se desactiva.

### La configuración de un proyecto TypeScript

Con estos principios, una configuración razonable para un proyecto TypeScript sería:

```jsonc
// tsconfig.json (fragmento)
{
  "compilerOptions": {
    "strict": true,                       // evitar peligros: null, any implícito
    "noUncheckedIndexedAccess": true,     // arr[i] puede ser undefined
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true
  }
}
```

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
      // Consistencia: la decidimos una vez y no se discute en reviews
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
    },
  },
];
```

Fíjate en que **cada regla tiene un comentario con su porqué** y su categoría (peligro, buena práctica, consistencia). Eso es lo que permite revisarlas en el futuro.

El flujo completo de aplicación:

| Momento | Herramienta | Qué detecta |
| --- | --- | --- |
| Al escribir | Editor con TypeScript y ESLint | Errores de tipo, reglas del linter en vivo |
| Al guardar | Prettier o Biome (formato al guardar) | Formato |
| Al hacer commit | Hook de pre-commit (por ejemplo, con `lint-staged`) | Formato y lint de los archivos cambiados |
| En el pull request | CI: `tsc --noEmit`, `eslint`, `prettier --check`, tests | Todo lo anterior, de forma obligatoria |
| En el review | Personas | Lo que no se puede automatizar: diseño, claridad, nombres |

### Buenas prácticas de TypeScript del Gentleman Book

El capítulo de TypeScript del Gentleman Programming Book incluye un apartado de mejores prácticas que encaja aquí como "guía" (no reglas obligatorias, sino sabiduría acumulada):

- **Anotar los tipos donde aportan claridad**, sobre todo en funciones públicas, y **documentar a través de los tipos** (un tipo bien nombrado comunica más que un comentario).
- **Revisar el tipado en los code reviews**: un `any` o una aserción `as` deberían despertar preguntas.
- **Evitar `any`** salvo de forma temporal o con código de terceros sin tipos; preferir `unknown`.
- **Usar ESLint como complemento** de TypeScript: el compilador comprueba tipos, el linter impone reglas de estilo y prácticas (el capítulo menciona como ejemplo forzar comillas simples, una típica regla de consistencia).
- **Elegir de forma consistente entre `type` e `interface`**.

### Ejemplo: convertir comentarios repetidos en reglas

Imagina que en los últimos 20 code reviews de tu equipo aparecieron estos comentarios:

| Comentario repetido | Veces | ¿Automatizable? | Regla |
| --- | --- | --- | --- |
| "Falta un `await` aquí" | 7 | Sí | `@typescript-eslint/no-floating-promises` |
| "Usa `===`" | 4 | Sí | `eqeqeq` |
| "Este nombre no se entiende" | 6 | No | Queda para el review |
| "Formatea el archivo" | 9 | Sí | Prettier + check en CI |
| "No uses `export default`" | 3 | Sí | `import/no-default-export` |

Automatizar las cuatro primeras filas libera esos comentarios del review, que queda para lo que solo las personas pueden juzgar. Ese es el ciclo virtuoso que describe Google.

### Excepciones bien hechas

El principio de "ceder ante la practicidad" significa que a veces romperás una regla. La diferencia entre una excepción sana y una ventana rota es cómo se hace:

```ts
// Mal: desactiva todas las reglas, sin explicación, para todo el archivo
/* eslint-disable */

// Mal: silencia el compilador sin decir por qué
// @ts-ignore
const total = legacyLib.compute(data);

// Bien: una regla concreta, una línea concreta, con la razón
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- el SDK de pagos no publica tipos (issue #212)
const response: any = await paymentsSdk.charge(request);

// Bien: el compilador avisará cuando el error desaparezca
// @ts-expect-error -- la versión 2.x de la librería tiene mal tipado este parámetro; quitar al actualizar
legacyLib.configure({ retries: "3" });
```

Tres reglas para las excepciones: desactiva la regla **más específica** posible, en el **ámbito más pequeño** posible (una línea mejor que un archivo) y **siempre con una razón** (ESLint permite escribirla tras `--`). Muchos equipos activan además la regla `eslint-comments/require-description` para que una excepción sin razón sea en sí misma un error. Y `@ts-expect-error` es preferible a `@ts-ignore` porque falla cuando el problema desaparece, recordándote que borres la excepción.

### Cuándo escribir tu propia regla

Si tu equipo comete una y otra vez un error específico de vuestro dominio (por ejemplo, importar el cliente de base de datos desde un componente de interfaz, rompiendo la arquitectura de la sesión 15), una regla genérica no existe, pero puedes crearla. Muchas veces no hace falta programar un plugin: la regla `no-restricted-imports` de ESLint cubre los casos más comunes.

```js
{
  files: ["src/**/components/**/*.tsx"],
  rules: {
    "no-restricted-imports": ["error", {
      patterns: [{ group: ["**/db/**", "node:sqlite"], message: "Los componentes no acceden a la base de datos: usa un servicio o un container." }],
    }],
  },
}
```

Fíjate en el mensaje: explica qué hacer en lugar de solo prohibir. Es la versión pequeña de lo que Google exige a sus analizadores: comprensible, accionable y con impacto real. Esta es también una forma de "estructura sobre convención" (G27, sesión 16): la regla de arquitectura deja de depender de que todos la recuerden.

### Resumen

Las reglas de estilo existen para que un código base sea comprensible para cualquiera, no para limitar la creatividad. Una buena regla compensa su costo, optimiza para quien lee, aporta consistencia, evita construcciones peligrosas y admite excepciones justificadas. Cada regla debe tener su porqué para poder revisarla, y debe aplicarse con herramientas, no con personas: formateadores, linters y análisis estático integrados en el editor, los hooks y la CI. El análisis estático solo funciona si es fiable (pocos falsos positivos efectivos) y accionable. Y lo que queda para el code review es lo que de verdad necesita juicio humano.

### Errores comunes

- **Reglas sin porqué**: nadie sabe si siguen siendo válidas ni se atreve a cambiarlas.
- **Reglas que no compensan**: prohibir cosas que nadie hace o exigir ceremonias sin beneficio.
- **Aplicar las reglas a mano** en los code reviews en lugar de con herramientas.
- **Linters ruidosos** con muchos falsos positivos, que entrenan al equipo para ignorar los avisos.
- **Desactivar reglas en línea** (`eslint-disable`) sin un comentario que lo justifique.
- **Discutir gustos** ("prefiero tabulaciones") cuando lo importante es elegir una vez.
- **Activar de golpe cientos de reglas nuevas** sobre un código existente sin un plan de migración, generando miles de avisos que todos ignoran.

## Conceptos clave

- **Guía de estilo**: conjunto de reglas y recomendaciones sobre cómo escribir código en un lenguaje dentro de una organización.
- **Optimizar para quien lee**: preferir la claridad en la lectura aunque cueste algo más al escribir.
- **Reglas de peligro, de buenas prácticas y de consistencia**: las tres categorías de reglas de Google.
- **Árbitros de estilo**: grupo que decide los cambios en las reglas de un lenguaje.
- **Análisis estático**: herramientas que analizan el código sin ejecutarlo para detectar problemas.
- **Falso positivo efectivo**: aviso ante el que el desarrollador no actúa, por ser incorrecto o confuso.
- **Corrección sugerida**: arreglo automático propuesto junto al aviso de un analizador.

## Preguntas de repaso

1. Enumera los cinco principios de Google para crear reglas de estilo.
   R: Las reglas deben compensar su costo, optimizar para quien lee, ser consistentes, evitar construcciones propensas a errores o sorprendentes y ceder ante la practicidad cuando sea necesario.
2. ¿Por qué en muchas reglas de consistencia "importa más elegir que la elección concreta"?
   R: Porque el beneficio viene de que todo el código se vea igual, lo que permite leerlo sin fricción y automatizar herramientas; la diferencia entre las opciones (por ejemplo, 2 o 4 espacios) es mucho menor que el costo de tener ambas en el código.
3. Da tres ejemplos de construcciones propensas a errores en TypeScript y su alternativa.
   R: `==` frente a `===` (conversiones sorprendentes), `any` frente a `unknown` con estrechamiento (desactiva el compilador) y promesas sin `await` ni manejo de errores frente a la regla `no-floating-promises` (errores perdidos). También `var` frente a `const`/`let`.
4. ¿Por qué Google documenta la razón de cada regla y quién decide los cambios?
   R: Para poder reevaluarla cuando cambien las circunstancias (nuevas versiones del lenguaje, nuevas herramientas); una regla sin porqué no se puede revisar con criterio. Los cambios los decide un grupo de árbitros de estilo por lenguaje, a partir de propuestas con argumentos de cualquier ingeniero.
5. ¿Qué es un falso positivo efectivo y qué umbral usa Google?
   R: Un aviso ante el que el desarrollador no toma ninguna acción, ya sea porque era incorrecto o porque era confuso; lo que importa es la percepción de quien lo recibe. Google exige que sus analizadores produzcan menos del 10 % de falsos positivos efectivos.
6. ¿Por qué el análisis estático debe integrarse en el flujo de trabajo principal?
   R: Porque los desarrolladores solo actúan sobre los avisos que ven donde ya trabajan (editor, compilador, code review) y en el momento en que el cambio es barato; los informes separados se ignoran. Además, detectar antes reduce el costo de corregir (shifting left).

## Ejercicio

Crea para un proyecto TypeScript tuyo (o para esta app) un archivo `STYLE.md` y la configuración correspondiente: `tsconfig.json` estricto, ESLint con `typescript-eslint` y Prettier (o Biome). Incluye al menos diez reglas, cada una con su categoría (peligro, buena práctica o consistencia) y una línea con su porqué. Añade un hook de pre-commit con `lint-staged` y un script `npm run check` que ejecute `tsc --noEmit`, el linter, el formateador en modo comprobación y los tests. Después introduce a propósito cinco violaciones en un archivo y verifica que `npm run check` las detecta todas. Terminado cuando `npm run check` pasa en el código limpio, falla con las cinco violaciones y cada regla del `STYLE.md` tiene categoría y porqué.

## Explícalo con tus palabras

Explica a alguien por qué automatizar las reglas de estilo hace que los code reviews sean más amables y más útiles.
