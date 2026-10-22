---
title: Requisitos, tracer bullets, estimación y agilidad con TDD
kind: lesson
hours: 2
sources: The Pragmatic Programmer, tema 45 The Requirements Pit (pp. 405–417) | The Pragmatic Programmer, temas 12–13 Tracer Bullets, Prototypes and Post-it Notes (pp. 109–123) | The Pragmatic Programmer, tema 15 Estimating (pp. 133–142) | The Pragmatic Programmer, tema 48 The Essence of Agility (pp. 429–434) | Gentleman Programming Book, cap. 1 Código limpio y agilidad
links: Gentleman · Código limpio y agilidad | https://the-amazing-gentleman-programming-book.vercel.app/es/book/Chapter01_Clean-Agile
---

## Objetivo

Entender cómo se descubren los requisitos (no se "recogen"), cómo avanzar con tracer bullets y prototipos, cómo estimar con honestidad y qué es de verdad la agilidad. Al terminar vas a poder escribir una historia de usuario con casos de uso, convertirlos en tests y planificar una primera rebanada de extremo a extremo de una funcionalidad.

## Estudio

### El pozo de los requisitos

Mucha gente habla de "recoger requisitos", como si estuvieran tirados por el suelo esperando a que alguien los recoja. *The Pragmatic Programmer* dice lo contrario: **nadie sabe exactamente lo que quiere**. Los requisitos rara vez están en la superficie; están enterrados bajo capas de suposiciones, malentendidos y política.

El libro propone un cambio de rol: **los programadores ayudamos a la gente a entender lo que quiere**. Un ejemplo que cuenta: un cliente pide "envío gratis para pedidos de más de 50 dólares". Parece claro. Pero un buen programador pregunta: ¿los 50 dólares incluyen impuestos?, ¿incluyen el costo del envío?, ¿aplica a envíos internacionales?, ¿y a productos digitales?, ¿y si el pedido baja de 50 tras una devolución parcial? Cada pregunta revela algo que el cliente no había pensado.

La forma en que esto funciona es un **bucle de feedback**: muestras algo (una maqueta, un prototipo, una versión funcional), el cliente reacciona ("no, eso no era lo que quería" o "sí, pero..."), y ambos aprenden. Los requisitos se **aprenden** en ese bucle, no se escriben de una vez al principio.

### Políticas frente a requisitos

Una distinción útil del libro: no confundas **requisitos** con **políticas**. "Solo los supervisores y el departamento de personal pueden ver el historial de un empleado" parece un requisito, pero en realidad es una **política** que cambiará (mañana también podrán verlo los auditores). El requisito general es "el historial solo lo ven ciertos roles autorizados", y la lista de roles es **configuración** (sesión 13), metadatos del sistema.

```ts
// Política grabada en el código: cambia la política, cambia el código
function canViewHistory(user: User): boolean {
  return user.role === "supervisor" || user.role === "hr";
}

// Requisito general + política como dato
function canViewHistory(user: User, policy: AccessPolicy): boolean {
  return policy.rolesAllowedTo("view-employee-history").includes(user.role);
}
```

### Trabaja con un usuario para pensar como un usuario

Una técnica muy recomendada por el libro: **conviértete en usuario**. Si vas a construir un sistema para atención al cliente, pasa un día con las personas de atención al cliente. Verás cómo trabajan de verdad, qué les molesta, qué atajos usan. Muchas veces descubrirás que lo que piden no es lo que necesitan.

### Documentar requisitos sin ahogarse

El libro es escéptico con los documentos de requisitos enormes: nadie los lee, se desactualizan, y dan una falsa sensación de que todo está decidido. Propone:

- **Los requisitos no son arquitectura ni diseño**: son necesidades.
- **Usa descripciones breves**, como historias de usuario o tarjetas, que sirvan para conversar, no como contrato definitivo.
- **No sobreespecifiques**: los buenos requisitos son abstractos; describen la necesidad del negocio, no cómo implementarla.
- **Mantén un glosario** del proyecto: un lugar donde se definen los términos específicos del dominio para que todos usen las mismas palabras con el mismo significado (la "una palabra por concepto" de la sesión 4, a nivel de proyecto).

Y advierte sobre el **crecimiento del alcance** (*scope creep*), con una referencia humorística a una película de Monty Python ("solo una galletita más"): cada pequeña petición extra parece inofensiva, pero juntas hunden el proyecto. La defensa es que cada nuevo requisito pase por el mismo proceso visible (por ejemplo, el tablero del equipo), para que todos vean su costo.

### Historias de usuario y TDD (Gentleman)

El capítulo "Código limpio y agilidad" del Gentleman Programming Book propone un formato concreto para las historias de usuario:

> Como **(quién)**, quiero la capacidad de **(qué)**, para **(por qué)**.

Seguido de **casos de uso**: el camino feliz y, opcionalmente, los casos borde. El capítulo señala un efecto interesante: escribir la historia puede revelar que una funcionalidad **no tiene un propósito claro**. Si no puedes completar el "para qué", quizá no deberías construirla.

Lo más útil es el siguiente paso: **los casos de uso se convierten en casos de test**. Escribes tests que fallan a partir de ellos y luego implementas hasta que pasan.

```
Historia: Como estudiante, quiero ver qué me toca estudiar hoy,
          para no tener que decidirlo cada día.

Casos de uso:
  1. Un día laborable muestra 1 h de inglés y una sesión de 2 h.
  2. Un sábado muestra 1 h de inglés y una sesión de 3 h.
  3. Un domingo muestra descanso.
  4. Si ayer no completé la sesión, hoy me toca la misma (no se salta).
```

```ts
describe("Plan de hoy", () => {
  it("un día laborable propone 1 h de inglés y una sesión de 2 h", () => { /* ... */ });
  it("un sábado propone 1 h de inglés y una sesión de 3 h", () => { /* ... */ });
  it("un domingo propone descanso", () => { /* ... */ });
  it("repite la sesión pendiente si ayer no se completó", () => { /* ... */ });
});
```

El capítulo también resume el ciclo: define lo que quieres, identifica los requisitos, escribe tests que fallan, escribe el código, haz que pasen y refactoriza.

### Programación extrema: el círculo de la vida

El mismo capítulo presenta la **Programación Extrema** (XP) como esencia de la agilidad, organizada en tres anillos de prácticas:

| Anillo | Prácticas |
| --- | --- |
| **Exterior (negocio)** | Juego de planificación (dividir en historias y tareas), entregas pequeñas, tests de aceptación (definición clara de "terminado"), equipo completo |
| **Medio (equipo)** | Ritmo sostenible, propiedad colectiva del código, integración continua, metáfora (vocabulario compartido) |
| **Interior (técnico)** | Pair programming, diseño simple, refactoring, TDD |

Fíjate cuántas ya conoces: diseño simple y refactoring (sesión 14), TDD (sesión 19), integración continua (sesión 28), vocabulario compartido (glosario y nombres).

El capítulo también critica los falsos agilismos: hacer dailies, sprints y retrospectivas no te hace ágil si entregas funcionalidades enormes, no entregas nada cada sprint, resistes el cambio o acumulas conocimiento en una persona. **La agilidad es una forma de pensar, no una lista de ceremonias.**

### La esencia de la agilidad

*The Pragmatic Programmer* dice algo muy parecido en el tema 48: "ágil" es un **adjetivo**, describe cómo haces las cosas. Un proceso no puede ser ágil por sí mismo; las personas sí. Y no existe un proceso ágil que puedas comprar o certificar, porque la agilidad consiste precisamente en **responder al cambio**, y eso no se puede empaquetar.

El libro reduce la agilidad a una receta de cuatro pasos:

1. **Averigua dónde estás.**
2. **Da el paso más pequeño con sentido hacia donde quieres estar.**
3. **Evalúa dónde terminaste y arregla lo que hayas roto.**
4. **Repite.**

Y lo aplica en todos los niveles, desde el proyecto hasta cada línea de código. El paso 3 depende de algo que ya conoces: el feedback, que solo es posible si el código es fácil de cambiar (ETC) y si hay tests que te dicen si rompiste algo.

### Tracer bullets: rebanadas de extremo a extremo

Las balas trazadoras son municiones que dejan un rastro luminoso: el tirador ve dónde impactan y corrige la puntería en tiempo real, en lugar de calcular todo de antemano. *The Pragmatic Programmer* usa la metáfora para el desarrollo: en lugar de especificar todo el sistema y construir cada capa por completo, **construyes muy pronto una versión mínima que atraviesa todas las capas** (interfaz, lógica, persistencia) y la vas engordando.

```
             UI      API     Dominio    Base de datos
Iteración 1  ──────────────────────────────────────   (un camino mínimo funciona de punta a punta)
Iteración 2  ══════════════════════════════════════   (más casos, más validaciones)
Iteración 3  ██████████████████████████████████████   (completo)
```

Ventajas que señala el libro:

- **Los usuarios ven algo funcionando pronto**, lo que alimenta el bucle de feedback de los requisitos.
- **Los desarrolladores construyen una estructura** en la que trabajar; cada parte nueva se conecta a algo que ya existe.
- **Tienes una plataforma de integración** desde el día uno: no hay un "gran día de integración" al final.
- **Tienes algo que demostrar** y una sensación de progreso real.

Una diferencia clave: el código de tracer bullets **no es desechable**. Es código de producción mínimo, con tests, que se va completando. Y a veces la bala no da en el blanco: el usuario ve la primera versión y dice "no era esto". Esa es justamente la ventaja: lo descubres pronto, cuando corregir es barato.

### Prototipos y notas adhesivas

Los **prototipos** son distintos: sirven para **aprender** algo concreto y luego se **descartan**. Se prototipa aquello que tiene riesgo o incertidumbre: una arquitectura, una funcionalidad nueva, la estructura o el contenido de datos externos, una herramienta o un componente de terceros, un problema de rendimiento o el diseño de la interfaz.

Un prototipo puede ignorar lo que no es relevante para la pregunta que responde: corrección completa, robustez, estilo, documentación. Puede incluso no ser código: notas adhesivas en una pizarra para un flujo de pantallas, o un diagrama en una servilleta para una arquitectura.

El peligro que destaca el libro: si muestras un prototipo de código, alguien (normalmente un responsable con prisa) querrá ponerlo en producción. **Deja muy claro que es desechable.** Si existe ese riesgo, usa tracer bullets en su lugar.

| | Tracer bullet | Prototipo |
| --- | --- | --- |
| Objetivo | Construir el sistema de forma incremental | Aprender o reducir un riesgo |
| Destino del código | Se queda y crece | Se tira |
| Calidad | Producción (mínimo pero sólido) | Lo justo para responder la pregunta |
| Cuándo | Para el esqueleto del sistema | Para la parte más incierta |

### Estimar sin mentir

El tema 15 trata la estimación. Primera idea: **la precisión de la respuesta está en sus unidades**. Si dices "130 días hábiles", la gente oye una precisión al día. Si dices "unos seis meses", oye una aproximación. El libro sugiere una tabla:

| Duración | Unidad para expresarla |
| --- | --- |
| 1–15 días | Días |
| 3–6 semanas | Semanas |
| 8–20 semanas | Meses |
| Más de 20 semanas | Piénsalo bien antes de dar una cifra |

¿De dónde salen las estimaciones? El libro propone un proceso:

1. **Entiende qué te preguntan**: el alcance y las condiciones ("suponiendo que no hay accidentes de tráfico, unos 25 minutos").
2. **Construye un modelo** del sistema o del trabajo, aunque sea mental y simple.
3. **Divide el modelo en componentes**.
4. **Da un valor a cada parámetro**.
5. **Calcula las respuestas**, idealmente varias (optimista, probable, pesimista).
6. **Lleva un registro** de tus estimaciones y compáralas con lo que pasó. Así aprendes a estimar mejor.

Para estimar proyectos enteros, el libro admite que la única forma fiable de estimar el calendario es **ganar experiencia con el propio proyecto**. Propone **iterar el calendario con el código**: estimas la primera iteración, la haces, ajustas la estimación de las siguientes con lo aprendido. Menciona también PERT, que usa tres estimaciones (optimista, más probable y pesimista) para expresar un rango.

Y el consejo más práctico: cuando te pidan una estimación en un pasillo, responde **"te lo digo más tarde"**. Las estimaciones rápidas suelen ser malas, y una vez dichas se convierten en compromisos.

### Ejemplo: estimar con tres valores

Supón que te piden estimar la funcionalidad "repaso espaciado de preguntas". Siguiendo el proceso del libro:

1. **Entender qué se pregunta**: ¿incluye la interfaz?, ¿la integración con el tutor que corrige respuestas?, ¿la migración de datos? Acordáis que es el motor de programación de repasos más una pantalla simple, sin tutor.
2. **Modelo y componentes**: lógica de cajas y fechas, persistencia, pantalla de repaso, extracción de preguntas desde los archivos de contenido.
3. **Valores por componente** (en días de trabajo efectivo):

| Componente | Optimista | Probable | Pesimista |
| --- | --- | --- | --- |
| Lógica de cajas y fechas | 1 | 1.5 | 3 |
| Persistencia | 0.5 | 1 | 2 |
| Pantalla de repaso | 1 | 2 | 4 |
| Extracción de preguntas | 0.5 | 1 | 3 |
| **Total** | **3** | **5.5** | **12** |

4. **Calcular**: una fórmula clásica de PERT para el valor esperado es (optimista + 4 × probable + pesimista) / 6, que aquí da (3 + 22 + 12) / 6 ≈ 6 días.
5. **Expresar con la unidad adecuada**: "entre una y dos semanas, probablemente algo más de una". No "6.17 días".
6. **Registrar** la estimación y, al terminar, comparar. Si la extracción de preguntas tardó 3 días (el pesimista), anota por qué: esa información mejora tu próxima estimación.

Fíjate en que el rango pesimista es mucho más ancho que el optimista. Es lo normal: las cosas pueden ir un poco mejor de lo previsto, pero pueden ir mucho peor. Comunicar el rango es más honesto que comunicar un número.

### Preguntas que destapan requisitos ocultos

Una lista de preguntas útiles cuando recibes un requisito, en el espíritu del pozo de los requisitos:

- **¿Para qué?** ¿Qué problema resuelve esto y cómo sabremos que lo resolvió?
- **¿Para quién?** ¿Todos los usuarios o solo algunos? ¿Hay roles con reglas distintas?
- **¿Qué pasa en los bordes?** ¿Con cero elementos? ¿Con miles? ¿A medianoche? ¿Si se repite la acción?
- **¿Qué pasa si falla?** ¿Qué ve el usuario? ¿Se puede reintentar? ¿Se pierde algo?
- **¿Qué es fijo y qué es política?** ¿Este número, esta lista o esta regla puede cambiar el mes que viene?
- **¿Qué no hay que hacer?** Delimitar lo que queda fuera evita el crecimiento silencioso del alcance.

### Juntando todo: cómo arrancar una funcionalidad

1. **Escribe la historia de usuario** y sus casos de uso con quien la pidió. Pregunta lo que no está claro y separa políticas de requisitos.
2. **Identifica la parte más incierta** y, si hace falta, haz un prototipo desechable para resolverla.
3. **Construye una tracer bullet**: el caso de uso más simple, de punta a punta, guiado por un test.
4. **Muestra el resultado**, recoge feedback y ajusta los casos de uso.
5. **Estima el resto** a partir de lo que aprendiste, en las unidades adecuadas.
6. **Repite** en pasos pequeños: averigua dónde estás, da el paso más pequeño con sentido, evalúa y arregla.

### Errores comunes

- **Tomar el primer enunciado del cliente como el requisito final.**
- **Grabar políticas en el código** en lugar de tratarlas como configuración.
- **Documentos de requisitos enormes** que nadie lee y que congelan el diseño.
- **Llevar un prototipo a producción.**
- **Dar estimaciones de pasillo** con una precisión falsa.
- **Creer que hacer ceremonias es ser ágil.**

### Resumen

Los requisitos no se recogen: se descubren con el usuario en un bucle de feedback, separando las necesidades estables de las políticas cambiantes y escribiéndolos como historias breves cuyos casos de uso se convierten en tests. Para avanzar, las tracer bullets construyen pronto un camino mínimo de extremo a extremo que se mantiene y crece, mientras que los prototipos responden preguntas concretas y se tiran. Las estimaciones se expresan con unidades honestas, como rangos, y se refinan con la experiencia del propio proyecto. Y la agilidad no es un proceso sino una actitud: averigua dónde estás, da el paso más pequeño con sentido, evalúa, arregla y repite.

## Conceptos clave

- **Requisito**: necesidad del negocio que se descubre en un bucle de feedback con los usuarios.
- **Política**: regla de negocio que cambia con frecuencia y conviene tratar como configuración.
- **Historia de usuario**: "Como (quién), quiero (qué), para (por qué)", con sus casos de uso.
- **Tracer bullet**: implementación mínima de extremo a extremo que se mantiene y crece.
- **Prototipo**: código o artefacto desechable para aprender o reducir un riesgo.
- **Estimación en unidades**: expresar la precisión de una estimación con la unidad elegida (días, semanas, meses).
- **Esencia de la agilidad**: averigua dónde estás, da el paso más pequeño con sentido, evalúa y arregla, repite.

## Preguntas de repaso

1. ¿Por qué The Pragmatic Programmer dice que los requisitos no se "recogen"?
   R: Porque nadie sabe exactamente lo que quiere: los requisitos están enterrados bajo suposiciones y malentendidos y se descubren en un bucle de feedback, mostrando versiones y haciendo preguntas que ayudan al cliente a entender lo que necesita.
2. ¿Qué diferencia hay entre un requisito y una política? Da un ejemplo.
   R: El requisito es la necesidad general y estable; la política es una regla concreta que cambia. Ejemplo: "solo ciertos roles autorizados ven el historial" es el requisito; "esos roles son supervisor y RR. HH." es una política que debe vivir en configuración o datos, no en el código.
3. ¿Cómo convierte el Gentleman Book una historia de usuario en tests?
   R: Escribiendo la historia con el formato "Como (quién), quiero (qué), para (por qué)" y listando sus casos de uso (camino feliz y casos borde); cada caso de uso se convierte en un test que falla, y luego se implementa el código hasta que todos pasan, refactorizando al final.
4. ¿Qué diferencia hay entre una tracer bullet y un prototipo?
   R: La tracer bullet es código de producción mínimo que atraviesa todas las capas y se mantiene y amplía; el prototipo es desechable, sirve para aprender o reducir un riesgo y puede ignorar la corrección, la robustez y el estilo.
5. ¿Por qué importan las unidades al dar una estimación y qué responderías a una petición de estimación en un pasillo?
   R: Porque la unidad comunica la precisión: "130 días" sugiere exactitud al día y "unos seis meses" una aproximación. En un pasillo conviene responder "te lo digo más tarde", porque las estimaciones rápidas suelen ser malas y se convierten en compromisos.
6. Resume la receta de la agilidad de The Pragmatic Programmer.
   R: Averigua dónde estás, da el paso más pequeño con sentido hacia donde quieres estar, evalúa dónde terminaste y arregla lo que hayas roto, y repite. Se aplica a todos los niveles y depende de tener feedback rápido y código fácil de cambiar.

## Ejercicio

Elige una funcionalidad real de esta app de estudio (por ejemplo, "temporizador de inglés con aviso sonoro" o "repaso espaciado de preguntas"). Escribe: (1) la historia de usuario con al menos cinco casos de uso, incluidos dos casos borde, y una lista de cinco preguntas que le harías al usuario para descubrir requisitos ocultos; (2) identifica una política escondida y muestra cómo la convertirías en configuración; (3) convierte los casos de uso en tests de Vitest (pueden fallar todos) e implementa una tracer bullet que haga pasar el primero de punta a punta (función de dominio más una ruta o componente mínimo); (4) estima el resto con tres valores (optimista, probable, pesimista) en la unidad adecuada y guárdalos para compararlos al terminar. Terminado cuando el primer test pasa de punta a punta, los demás están escritos y la estimación está registrada.

## Explícalo con tus palabras

Explica a alguien que nunca ha trabajado en software por qué es mejor mostrar una versión pequeña que funciona en una semana que una versión completa en seis meses.
