---
title: Code review — proceso, beneficios y buenas prácticas
kind: lesson
hours: 2
sources: Software Engineering at Google, cap. 9 Code Review (pp. 195–215) | Software Engineering at Google, cap. 19 Critique, Google's Code Review Tool (pp. 452–470) | Gentleman Programming Book, cap. 2 Comunicación en primer lugar
links: Google Engineering Practices · Code Review | https://google.github.io/eng-practices/review/ ; Gentleman · Comunicación en primer lugar | https://the-amazing-gentleman-programming-book.vercel.app/es/book/Chapter02_Communication-First-and-Foremost
---

## Objetivo

Entender cómo funciona el code review en Google (flujo, las tres aprobaciones, propiedad del código), qué beneficios aporta más allá de encontrar bugs y cómo hacerlo bien como autor y como revisor: cambios pequeños, buenas descripciones, comentarios amables y precisos, un número mínimo de revisores y automatización. Al terminar vas a tener una checklist de revisión propia para pull requests en TypeScript.

## Estudio

### Qué es el code review

El **code review** (revisión de código) es el proceso por el que alguien distinto del autor examina un cambio antes de que entre al código base. En Google, todo cambio pasa por revisión antes de hacerse commit al repositorio principal, sin excepciones.

El capítulo 9 empieza con una idea que cambia la perspectiva: **el código es un pasivo** (*code is a liability*). Cada línea de código hay que mantenerla, entenderla, probarla y actualizarla durante años. Escribir código nuevo no es gratis aunque funcione hoy. El code review es, entre otras cosas, un filtro para que solo entre el código que vale ese costo.

### El flujo

El flujo típico, que la herramienta de Google (Critique) y cualquier plataforma como GitHub o GitLab implementan con pequeñas variaciones:

1. **El autor crea un cambio** (en Google, un *changelist*; en GitHub, un pull request) y lo prepara: compila, pasa los tests y el análisis automático.
2. **El autor pide revisión** a uno o más revisores, con una descripción del cambio.
3. **Los revisores comentan**: preguntas, sugerencias, problemas.
4. **El autor modifica el cambio** y responde a cada comentario.
5. **Los revisores aprueban** (en Google, con un "LGTM": *looks good to me*).
6. **El autor hace commit** del cambio.

Los pasos 3 y 4 se repiten las veces necesarias. Critique hace explícito **de quién es el turno** en cada momento (el "conjunto de atención"), para que un cambio no se quede parado porque cada parte cree que le toca a la otra.

### Las tres aprobaciones de Google

Para que un cambio entre al repositorio de Google necesita tres tipos de aprobación:

| Aprobación | Quién la da | Qué comprueba |
| --- | --- | --- |
| **Corrección y comprensión** (LGTM) | Otro ingeniero | Que el código es correcto, se entiende y hace lo que dice |
| **Propiedad** (*owners*) | Un dueño del directorio afectado | Que el cambio es apropiado para esa parte del código base |
| **Legibilidad** (*readability*) | Alguien con certificación de legibilidad en el lenguaje | Que el código sigue las guías de estilo y las buenas prácticas del lenguaje |

Una misma persona puede dar las tres si cumple los tres roles, lo que es habitual. Y el autor puede cubrir implícitamente la de propiedad o la de legibilidad si él mismo es dueño o tiene la certificación.

La **propiedad** se gestiona con archivos `OWNERS` en cada directorio, que listan quiénes pueden aprobar cambios ahí. El código base es un árbol con dueños jerárquicos. En GitHub, el equivalente es el archivo `CODEOWNERS`, que asigna revisores automáticamente según las rutas cambiadas:

```
# .github/CODEOWNERS
/src/domain/          @ana @luis
/content/             @duque
/.github/workflows/   @devops-team
```

La **legibilidad** es un programa propio de Google: los ingenieros obtienen la certificación de un lenguaje tras demostrar que escriben código idiomático según la guía de estilo (sesión 25). Es una forma de **difundir el conocimiento** de las buenas prácticas por toda la organización.

### Los beneficios del code review

El libro enumera varios beneficios, y la mayoría no tienen que ver con encontrar bugs:

**1. Corrección del código.** Detectar errores antes de que entren. Sin embargo, el libro aclara que no es el beneficio principal: muchos bugs los encuentran ya las herramientas automáticas (compilador, tests, análisis estático) antes del review. El revisor aporta sobre todo en errores de lógica, casos borde no considerados y problemas de diseño.

**2. Comprensión.** Si el revisor no entiende el código, probablemente tampoco lo entenderá quien lo mantenga en el futuro. El revisor actúa como el primer "lector futuro". Una pregunta del revisor ("¿por qué esto es así?") es una señal de que falta claridad en el código, no solo una duda personal.

**3. Consistencia.** El review ayuda a que el código siga las guías de estilo y las convenciones del código base, lo que facilita que cualquiera pueda leerlo y que las herramientas puedan transformarlo.

**4. Beneficios psicológicos y culturales.** El review refuerza que el código pertenece al equipo y no al autor. También ofrece validación: incluso los ingenieros más expertos se benefician de que alguien confirme que su cambio tiene sentido. Y amortigua las críticas: en el contexto estructurado del review, las sugerencias se reciben mejor que en un comentario espontáneo.

**5. Compartir conocimiento.** Probablemente el beneficio más infravalorado. El autor aprende de los comentarios del revisor; el revisor aprende cómo funciona otra parte del sistema y técnicas nuevas. A lo largo del tiempo, el review distribuye el conocimiento por el equipo y reduce el factor bus (sesión 3). El Gentleman Book menciona lo mismo: los code reviews y el pair programming reparten el conocimiento entre oficinas y reducen la coordinación necesaria.

**6. Registro histórico.** Cada review queda guardado: por qué se hizo un cambio, qué alternativas se discutieron. Es documentación que se puede consultar años después.

### Buenas prácticas: ser amable y profesional

La primera práctica que menciona el libro es de actitud. Cada comentario de un revisor debe tratarse como una contribución; cada respuesta del autor, también. El revisor no tiene que exigir que el código esté escrito como él lo habría escrito: si el código es correcto, legible y sigue las guías, la preferencia personal del revisor no es razón suficiente para bloquearlo. Al revés, el autor no debe tomarse los comentarios como ataques personales (recuerda de la sesión 3: tú no eres tu código).

Algunos patrones de comentario útiles:

| Tipo de comentario | Ejemplo | Por qué funciona |
| --- | --- | --- |
| Pregunta genuina | "¿Qué pasa aquí si la lista viene vacía?" | Invita a pensar sin acusar |
| Sugerencia con razón | "Sugiero extraer esto a `isOverdue`: se repite en tres lugares (G5)" | Da el porqué y una referencia compartida |
| Bloqueante explícito | "Bloqueante: esta consulta concatena input del usuario (inyección SQL)" | Deja claro qué impide aprobar |
| Opcional explícito | "Nit (opcional): prefiero `toSorted` aquí" | Separa preferencias de problemas |
| Elogio concreto | "Muy claro el uso del `Result` para los errores de validación" | Refuerza buenas prácticas |

Marcar los comentarios opcionales (muchos equipos usan "nit:" para detalles menores) evita que el autor gaste tiempo en preferencias creyendo que son obligatorias.

### Buenas prácticas: cambios pequeños

El libro es claro: **escribe cambios pequeños**. Como referencia, un cambio "pequeño" en Google suele limitarse a unas **200 líneas** de código. Los cambios pequeños:

- Se revisan **más rápido** (el revisor puede hacerlo entre otras tareas, sin bloquear una tarde entera).
- Se revisan **mejor** (en un cambio de 2,000 líneas, el revisor deja de leer con atención a partir de cierto punto).
- Son **más fáciles de revertir** si algo sale mal.
- Generan **menos conflictos** con el trabajo de otros.

Esto encaja con todo el módulo: pasos pequeños (sesión 9), commits de refactor separados de los de funcionalidad (sesión 14) y tracer bullets (sesión 23). Una funcionalidad grande se entrega como una serie de cambios pequeños que se revisan por separado.

### Buenas prácticas: buenas descripciones

La descripción del cambio es lo primero que lee el revisor y, más tarde, lo que leerá alguien que investigue el historial. El libro recomienda que la **primera línea sea un resumen** del cambio completo (como el título de un commit) y que el cuerpo explique **qué cambia y por qué**: el contexto, las decisiones tomadas y cómo se probó.

```
fix(today): mantiene la sesión pendiente si el día anterior no se completó

Hasta ahora, si el estudiante no marcaba la sesión del lunes, el martes
la vista "hoy" mostraba la siguiente sesión y la del lunes quedaba
saltada. La regla (S2 del plan) es que las sesiones son secuenciales.

Cambios:
- `nextSession` busca la primera sesión no completada en lugar de
  calcularla por fecha.
- Test de regresión con un lunes sin completar.

Probado: npm test (unitarios) y manualmente con la base de datos de
ejemplo saltando un día.
```

Una descripción como "arreglos" o "cambios varios" obliga al revisor a deducir la intención leyendo el diff, y deja un historial inútil.

### Buenas prácticas: pocos revisores y automatización

**Mantén el número de revisores al mínimo.** La mayoría de los reviews en Google los hace **un solo revisor**. Añadir más revisores tiene rendimientos decrecientes: cada uno añade retrasos y comentarios que pueden contradecirse, y la responsabilidad se diluye ("seguro que el otro lo miró"). El proceso se basa en la confianza en los ingenieros: un buen revisor es suficiente en la gran mayoría de los casos.

**Automatiza todo lo posible.** Todo lo que una herramienta puede comprobar (formato, lint, tipos, tests, cobertura, análisis estático) debe comprobarse **antes** de que una persona mire el cambio. Critique muestra los resultados del análisis estático dentro del propio review, junto a las líneas afectadas, con correcciones sugeridas que se aplican con un clic. Así el revisor humano se concentra en lo que solo una persona puede juzgar: diseño, claridad, adecuación a los requisitos.

### Tipos de code review

No todos los cambios se revisan igual. El libro distingue:

- **Código nuevo** (*greenfield*): es el que más atención necesita, porque se va a mantener durante años. Idealmente, el diseño ya se revisó antes con un documento de diseño, y el review del código comprueba que la implementación lo sigue. Hay que preguntarse si el código merece existir (el código es un pasivo), si tiene tests y si su API es adecuada.
- **Cambios de comportamiento, mejoras y optimizaciones**: el foco es si el cambio es necesario y si mejora el código base. Las optimizaciones deberían venir con mediciones (benchmarks) que las justifiquen.
- **Correcciones de bugs y reversiones**: deben limitarse a arreglar el bug, sin mezclar otros cambios, y venir con un test que lo reproduzca. Las reversiones (*rollbacks*) deben ser rápidas y simples.
- **Refactorings y cambios a gran escala**: suelen ser mecánicos (a menudo generados por herramientas). El revisor comprueba sobre todo que el cambio es lo que dice ser, sin cambios de comportamiento ocultos.

### Una checklist para revisar

Combinando el capítulo con lo visto en el módulo, esta es una checklist razonable para revisar un pull request en TypeScript:

1. **Propósito**: ¿la descripción explica qué y por qué? ¿El cambio hace eso y solo eso?
2. **Tamaño**: ¿se puede revisar con atención? Si no, pide dividirlo.
3. **Corrección**: ¿maneja casos borde (vacío, nulo, límites, errores)? ¿Hay condiciones de carrera?
4. **Tests**: ¿hay tests para el comportamiento nuevo o el bug? ¿Prueban comportamiento a través de la API pública? ¿Fallarían si el código se rompe?
5. **Diseño**: ¿la responsabilidad está en el lugar correcto? ¿Hay duplicación de conocimiento? ¿Respeta la arquitectura (dominio sin infraestructura)?
6. **Legibilidad**: ¿se entiende sin explicación del autor? ¿Nombres claros? ¿Comentarios con porqué?
7. **Tipos**: ¿hay `any`, aserciones `as` o `@ts-ignore` sin justificación?
8. **Seguridad y datos**: ¿se valida la entrada externa? ¿Hay secretos en el código? ¿Consultas parametrizadas?
9. **Documentación**: ¿se actualizaron el README, la documentación o los mensajes de ayuda si cambió el comportamiento visible?
10. **Hyrum**: ¿cambia algún comportamiento observable del que otros puedan depender?

### Ejemplo: un review de principio a fin

Supón este cambio en un pull request titulado "feat: racha de estudio":

```ts
export function streak(days: any[]) {
  let s = 0;
  const sorted = days.sort();
  for (let i = sorted.length - 1; i > 0; i--) {
    const diff = (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) / 86400000;
    if (diff == 1) s++;
    else break;
  }
  return s;
}
```

Un review útil, siguiendo la checklist, podría tener estos comentarios:

1. **Bloqueante (corrección):** "Con un solo día completado devuelve 0, pero la racha debería ser 1. ¿Puedes añadir un test para ese caso?"
2. **Bloqueante (requisito):** "Según el plan, los domingos no rompen la racha. Ahora, de sábado a lunes la diferencia es 2 y corta la racha."
3. **Sugerencia (diseño, sesión 18):** "Las fechas con `new Date(string)` y milisegundos dependen de la zona horaria y del cambio de horario. ¿Usamos el `CalendarDate` que ya existe en `domain/`?"
4. **Sugerencia (efecto secundario):** "`days.sort()` ordena el arreglo del llamador (lo muta). Mejor `[...days].sort()` o `toSorted()`."
5. **Pregunta (tipos):** "¿Qué contiene `days`? Si son strings ISO, tiparlo como `readonly CalendarDate[]` evita el `any`."
6. **Nit (opcional):** "`s` y `diff` podrían llamarse `streakLength` y `daysBetween`."
7. **Elogio:** "Me gusta que sea una función pura: será muy fácil de probar."

Fíjate en que todos los comentarios hablan del código, explican el porqué, distinguen lo que bloquea de lo opcional y proponen una salida. El autor sabe exactamente qué tiene que hacer para conseguir la aprobación.

### Cómo responder como autor

El review es una conversación, y el autor también tiene responsabilidades:

- **Responde a cada comentario**, aunque sea con "Hecho" o "Buena idea, lo cambio". Un comentario sin respuesta deja al revisor sin saber si lo viste.
- **Si no estás de acuerdo, explica tu razón** con datos o referencias, y propone una alternativa. "Lo dejé así porque X; si prefieres Y, lo cambio" abre la puerta al acuerdo.
- **No mezcles en el mismo PR cambios que el revisor no pidió**, porque obligan a revisar todo de nuevo. Si descubres algo más, abre otro PR.
- **Agradece los comentarios útiles.** Alguien dedicó su tiempo a mejorar tu código.
- **Si la discusión se alarga**, pasa a una llamada corta y deja escrito en el PR lo que se decidió (el patrón de comunicación del Gentleman Book que viste en la sesión 3).

### Code review en un proyecto personal

¿Y si trabajas solo, como en esta app? Puedes conseguir buena parte de los beneficios con un **autorreview** disciplinado: abre siempre un pull request (aunque lo apruebes tú), espera unas horas antes de revisarlo para leerlo "con ojos frescos", recorre la checklist y deja comentarios para ti mismo. La CI hace la parte automática. Y si tienes acceso a un asistente de IA o a un compañero de estudio, pídeles una revisión con la misma checklist: el valor está en tener un segundo lector, no en el cargo de quien revisa.

### Resumen

El code review es el filtro que decide qué código entra a un código base que alguien tendrá que mantener durante años. Sus mayores beneficios son la comprensión, la consistencia y el conocimiento compartido, más que la caza de bugs, que en gran parte hacen las herramientas. Funciona bien con cambios pequeños y bien descritos, un revisor de confianza, todo lo automatizable automatizado y comentarios amables, concretos y clasificados. Y es una conversación: el autor responde, argumenta y agradece.

### Errores comunes

- **Pull requests gigantes** que nadie puede revisar con atención.
- **Descripciones vacías** o que solo repiten el título.
- **Revisar el formato a mano** en lugar de automatizarlo.
- **Bloquear por preferencias personales** cuando el código es correcto y sigue las guías.
- **Añadir cinco revisores "por si acaso"**, diluyendo la responsabilidad y retrasando todo.
- **Aprobar sin leer** ("LGTM" automático) por presión de tiempo.
- **Tomarse los comentarios como ataques**, o escribirlos como si lo fueran.

## Conceptos clave

- **Code review**: revisión de un cambio por alguien distinto del autor antes de integrarlo.
- **El código es un pasivo**: cada línea tiene un costo de mantenimiento durante toda su vida.
- **LGTM**: aprobación de corrección y comprensión ("looks good to me").
- **OWNERS / CODEOWNERS**: archivos que definen quién puede aprobar cambios en cada parte del código.
- **Readability**: certificación de Google que acredita escribir código idiomático en un lenguaje.
- **Cambio pequeño**: cambio revisable con atención; en Google, del orden de 200 líneas.
- **Nit**: comentario sobre un detalle menor y opcional.

## Preguntas de repaso

1. ¿Qué significa que "el código es un pasivo" y qué relación tiene con el code review?
   R: Que cada línea de código implica un costo de mantenimiento, comprensión, pruebas y actualización durante años, aunque funcione hoy. El code review actúa como filtro para que solo entre código que vale ese costo y que otros podrán mantener.
2. Describe las tres aprobaciones que necesita un cambio en Google.
   R: LGTM de otro ingeniero que comprueba corrección y comprensión; aprobación de un dueño del directorio (OWNERS) que confirma que el cambio es apropiado para esa parte del código; y aprobación de legibilidad de alguien certificado en el lenguaje, que comprueba que sigue las guías. Una sola persona puede cubrir varias.
3. Menciona cuatro beneficios del code review además de encontrar bugs.
   R: Asegurar que el código es comprensible para otros, mantener la consistencia con las guías, reforzar la propiedad colectiva del código y la validación (beneficios psicológicos), compartir conocimiento entre autor y revisor y dejar un registro histórico de las decisiones.
4. ¿Por qué se recomiendan cambios pequeños y qué tamaño de referencia da el libro?
   R: Porque se revisan más rápido y con más atención, son más fáciles de revertir y generan menos conflictos. Como referencia, unas 200 líneas de código.
5. ¿Por qué Google suele usar un solo revisor?
   R: Porque añadir revisores tiene rendimientos decrecientes: más retrasos, comentarios contradictorios y responsabilidad diluida. El proceso se basa en la confianza en los ingenieros, y un buen revisor basta en la gran mayoría de los casos.
6. ¿Qué debe contener una buena descripción de un cambio?
   R: Una primera línea que resuma el cambio completo y un cuerpo que explique qué cambia y por qué (contexto y decisiones) y cómo se probó, para que el revisor entienda la intención y el historial sea útil en el futuro.

## Ejercicio

Escribe tu propia checklist de code review (puedes partir de la de la lección) en un archivo `.github/pull_request_template.md` con secciones para descripción, cómo se probó y la checklist del autor. Después revisa un pull request real (tuyo antiguo, de un proyecto open source o uno que crees a propósito con cinco problemas plantados: un `any`, un caso borde sin manejar, un nombre confuso, duplicación y falta de test). Escribe al menos seis comentarios clasificados como bloqueante, sugerencia, pregunta, nit o elogio, cada uno con su razón. Terminado cuando la plantilla existe, encontraste los cinco problemas plantados (si usaste el PR preparado) y cada comentario es específico, explica el porqué y no menciona a la persona sino al código.

## Explícalo con tus palabras

Explica a alguien por qué el code review sirve más para compartir conocimiento que para encontrar bugs.
