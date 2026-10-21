---
title: Filosofía pragmática y el costo del código sucio
kind: lesson
hours: 2
sources: The Pragmatic Programmer, cap. 1 A Pragmatic Philosophy, temas 1–6 (pp. 34–62) | Clean Code, cap. 1 Clean Code (pp. 32–46)
---

## Objetivo

Adoptar la actitud profesional que sostiene todo el módulo: asumir responsabilidad, no tolerar las "ventanas rotas", saber cuándo el software es suficientemente bueno y gestionar tu conocimiento como una inversión. Entender por qué el código sucio te hace ir más lento, no más rápido.

## Estudio

### Es tu vida, es tu carrera

*The Pragmatic Programmer* abre con una idea simple: tú eres dueño de tu carrera. Si no te gusta tu trabajo, si tu equipo no aprende, si la tecnología que usas está estancada, tienes opciones. Los autores lo resumen con un juego de palabras en inglés que se puede traducir como "cambia tu organización o cambia de organización". La primera opción siempre es intentar mejorar desde dentro; la segunda está disponible si no se puede.

La consecuencia práctica es que **nadie te va a entregar el aprendizaje**. Si quieres aprender sobre testing, CI o arquitectura, no esperes a que tu empresa te mande a un curso: invierte tu propio tiempo de forma deliberada. Este plan de estudio es exactamente eso.

### "El gato se comió mi código fuente": responsabilidad

El segundo tema trata la responsabilidad profesional. Un programador pragmático **asume la responsabilidad** de su trabajo, de sus decisiones y de sus errores. Eso no significa aceptar cualquier tarea: antes de comprometerte, analiza los riesgos que están fuera de tu control. Si aceptas, respondes por el resultado.

Cuando algo sale mal (y va a salir mal: un bug, un plazo incumplido, un backup que no existía), la reacción profesional no es buscar excusas sino **ofrecer opciones**. Compara:

| Excusa poco convincente | Opción profesional |
| --- | --- |
| "No pude terminar porque el API de pagos no estaba documentado." | "El API de pagos no está documentado. Puedo (a) leer su código y documentarlo, lo que lleva dos días, o (b) hacer un prototipo con el sandbox y validarlo con su equipo mañana." |
| "El servidor se cayó y perdimos los datos, no fue mi culpa." | "Perdimos los datos de ayer. Propongo restaurar desde el backup de anteayer y añadir backups cada hora; además, voy a revisar por qué no había alertas." |

Un truco del libro: antes de ir a dar una explicación, **díselo primero a un objeto** (un patito de goma, una planta). Si la excusa suena tonta en voz alta, sonará igual de tonta para tu jefa. Pregúntate qué te preguntarán y qué alternativas puedes ofrecer.

Responsabilidad también es decir "no lo sé, pero lo averiguo". Admitir ignorancia o un error a tiempo genera más confianza que esconderlo.

### Entropía del software y la teoría de las ventanas rotas

La entropía es una medida de desorden. El software, como cualquier sistema, tiende al desorden si nadie lo mantiene. Los autores toman de la criminología urbana la **teoría de las ventanas rotas**: un edificio con una ventana rota que nadie arregla transmite abandono. Pronto aparece otra ventana rota, grafitis, basura, y el deterioro se acelera.

En el código pasa exactamente igual. Una función de 300 líneas sin tests invita a que la siguiente persona añada la línea 301 "porque total, ya está así". Un `// TODO: arreglar esto` de hace dos años normaliza el descuido. En cambio, en un código limpio y cuidado, la gente se esfuerza por no ser quien lo ensucie. El libro cuenta la anécdota de unos bomberos que, al entrar a apagar un incendio en una casa impecable, extendieron una alfombra para no manchar con la manguera: el cuidado del entorno condiciona el comportamiento.

Regla práctica: **no vivas con ventanas rotas**. Si ves un mal diseño, una decisión equivocada o código pobre, arréglalo en cuanto lo descubras. Si no tienes tiempo de arreglarlo bien, al menos "tapa la ventana con tablas": comenta el código problemático, muestra un mensaje de "no implementado", añade datos de prueba que lo hagan evidente o abre un ticket visible. Lo importante es dejar claro que alguien lo vio y que no es aceptable.

### Sopa de piedras y ranas hervidas

Este tema tiene dos historias.

**La sopa de piedras.** Unos soldados llegan hambrientos a un pueblo que no quiere compartir comida. Ponen una olla con agua y piedras al fuego. Los vecinos, curiosos, se acercan y los soldados comentan que la sopa estaría mejor con unas zanahorias... con un poco de carne... Al final, entre todos hicieron una sopa excelente. La lección: cuando sabes que algo es correcto pero pedir permiso para el proyecto completo genera resistencia, **sé un catalizador del cambio**. Construye algo pequeño que funcione (un script de CI, un prototipo de linter, un test que ya atrapó un bug), muéstralo y deja que la gente quiera sumarse. Es más fácil unirse a un éxito en marcha que aprobar una idea abstracta.

**La rana hervida.** Si metes una rana en agua hirviendo salta; si calientas el agua poco a poco, no nota el peligro. (Biológicamente no es exacto, pero la metáfora funciona.) Los proyectos se degradan así: un requisito más, un parche más, una semana más de retraso, y de pronto el proyecto está en ruinas sin que nadie notara el momento. **Recuerda el panorama general**: revisa periódicamente qué pasa a tu alrededor, no solo lo que estás haciendo.

### Software suficientemente bueno

Ningún software es perfecto, y perseguir la perfección es una forma segura de no entregar nunca. Pero "suficientemente bueno" no significa descuidado: significa que **el nivel de calidad es una decisión explícita** que se toma con los usuarios.

- **Involucra a los usuarios en el trade-off.** Muchas veces preferirán tener hoy una versión con algunas asperezas que esperar un año por la versión perfecta. Pregúntales.
- **Haz de la calidad un requisito.** Igual que se define el alcance, se define cuánta calidad se necesita en cada área. Un sistema de control de un marcapasos y una herramienta interna de reportes no tienen el mismo listón.
- **Sabe cuándo parar.** Como un pintor que arruina un cuadro por seguir añadiendo capas, un programador puede arruinar un programa por embellecerlo sin fin.

Esto tiene una consecuencia de diseño: el software que se entrega pronto y recibe feedback suele terminar siendo mejor que el que se pule en aislamiento, porque el feedback te dice qué importa de verdad.

### Tu portafolio de conocimiento

Tu conocimiento es un activo que **caduca**: el framework de moda hoy será legado en cinco años. Por eso los autores proponen gestionarlo como un portafolio financiero:

| Principio financiero | Aplicado a tu conocimiento |
| --- | --- |
| Invierte con regularidad | Dedica tiempo fijo cada semana a aprender, aunque sea poco |
| Diversifica | No solo tu stack: otros lenguajes, paradigmas, bases de datos, habilidades no técnicas |
| Gestiona el riesgo | Combina tecnologías estables y de alto riesgo/alto potencial |
| Compra barato, vende caro | Aprende algo emergente antes de que sea popular |
| Revisa y rebalancea | Cada cierto tiempo, revisa qué está quedando obsoleto |

Metas concretas que sugiere el libro: aprender al menos un lenguaje nuevo cada año, leer un libro técnico al mes (y también libros no técnicos), tomar cursos, participar en grupos de usuarios o comunidades, experimentar con otros entornos (otro sistema operativo, otro editor) y mantenerte al día.

El libro añade el **pensamiento crítico**: no todo lo que lees es cierto, y mucho contenido está escrito para venderte algo. Algunas preguntas útiles:

- **Pregunta "¿por qué?" cinco veces** hasta llegar a la raíz.
- **¿Quién se beneficia?** Sigue el dinero o la influencia detrás de una recomendación.
- **¿Cuál es el contexto?** Lo que funciona en una empresa de 50,000 ingenieros puede no servir en un equipo de cinco.
- **¿Cuándo o dónde funcionaría esto?** ¿Bajo qué condiciones?
- **¿Por qué es esto un problema?** ¿Hay un modelo de fondo que lo explique?

### Clean Code: el costo total de tener un desastre

Robert C. Martin abre *Clean Code* con una experiencia que casi cualquier programador ha vivido. Un equipo arranca un proyecto rapidísimo. Para cumplir plazos, toma atajos. Cada atajo hace que el siguiente cambio sea un poco más difícil. Al cabo de uno o dos años, cada cambio rompe dos cosas, la productividad tiende a cero, y la gerencia hace lo único que sabe hacer: añadir gente. La gente nueva no conoce el diseño, añade más desorden y la productividad sigue cayendo.

```
Productividad
 100% |*
      |  *
      |     *
      |         *
      |              *  *
      |                     *  *  *  *  .
      +------------------------------------> Tiempo
      Proyecto nuevo           "Ya no podemos tocar nada"
```

Cuando el desastre es insoportable, el equipo pide **el gran rediseño**: reescribir todo desde cero. Se forma un equipo "tigre" para la nueva versión mientras el resto mantiene la vieja. La nueva versión tiene que alcanzar a la vieja, que sigue cambiando. A veces la carrera dura una década, y para entonces la versión nueva también es un desastre. La conclusión: mantener el código limpio no es un lujo, es supervivencia.

### La actitud: es nuestra culpa

Martin hace una afirmación incómoda: el código malo es **culpa nuestra**, no de los gerentes, los plazos o los requisitos cambiantes. Los gerentes defienden el calendario con pasión, y es su trabajo. Nuestro trabajo es defender el código con la misma pasión. La analogía es la de un cirujano: si un paciente le pide que no se lave las manos porque tarda mucho, un cirujano profesional se niega, porque conoce mejor que el paciente el riesgo de una infección.

Y aquí está la paradoja central del libro: los programadores sienten la presión de ensuciar el código para ir rápido, pero **la única forma de ir rápido es mantener el código limpio**. El desorden te frena de inmediato, no "algún día".

### ¿Qué es código limpio?

Martin recopila definiciones de programadores reconocidos. En lugar de citarlas, quédate con las ideas que comparten:

- **Elegante y eficiente**: se lee con placer y no desperdicia recursos.
- **Hace una cosa bien**: cada función, clase y módulo tiene un propósito claro.
- **Se lee como prosa bien escrita**: expone la intención del autor, sin sorpresas.
- **Lo puede mejorar otra persona**: tiene tests, nombres claros y dependencias mínimas.
- **Parece escrito por alguien a quien le importa**: no hay nada obvio que puedas hacer para mejorarlo.
- **No tiene duplicación** y expresa todas las ideas de diseño del sistema.
- **Cada rutina hace más o menos lo que esperabas**.

Y una idea poderosa: **somos autores**. Pasamos mucho más tiempo leyendo código que escribiéndolo (Martin estima una proporción de más de 10 a 1). Para escribir una línea, primero lees el código alrededor. Por eso hacer que el código sea fácil de leer hace que sea fácil de escribir.

### La regla del boy scout

La regla de los scouts dice: deja el campamento más limpio de lo que lo encontraste. Aplicada al código: **cada vez que toques un archivo, déjalo un poco mejor**. Renombra una variable confusa, extrae una función, elimina un comentario obsoleto, añade un test que faltaba. No hace falta un gran proyecto de limpieza: si cada commit mejora un poco el código, el sistema mejora con el tiempo en lugar de degradarse.

```ts
// Encontraste esto mientras arreglabas un bug en otra parte del archivo:
function calc(d: number[]) {
  let t = 0;
  for (let i = 0; i < d.length; i++) t += d[i];
  return t / d.length;
}

// La dejas así (cambio pequeño, mismo comportamiento):
function average(values: number[]): number {
  const sum = values.reduce((acc, value) => acc + value, 0);
  return sum / values.length;
}
```

Fíjate que ni siquiera cambiaste el manejo de la lista vacía (que devuelve `NaN`). Eso sería un cambio de comportamiento que merece su propio test y su propio commit. La regla del boy scout es para mejoras pequeñas y seguras.

### Ejemplo trabajado: tapar una ventana rota

Imagina que estás añadiendo un descuento por cupón en un carrito y te topas con esta función, que no es tu tarea pero tocas al pasar:

```ts
// carrito.ts (lo que encontraste)
export function total(items: any[], c?: string) {
  let t = 0;
  for (const i of items) t += i.p * i.q;
  if (c == "PROMO10") t = t - t * 0.1; // TODO arreglar cupones
  if (c == "PROMO20") t = t - t * 0.2;
  return Math.round(t * 100) / 100;
}
```

Tienes tres opciones, de peor a mejor:

1. **Ignorarla y añadir tu cupón con otro `if`.** Es la ventana rota que se multiplica: ahora hay tres `if`, y el siguiente añadirá el cuarto.
2. **Rediseñar todo el sistema de precios.** Es tentador, pero se sale del alcance de tu tarea y aumenta el riesgo del cambio.
3. **Mejorar lo justo y dejar constancia del resto.** Tipas los ítems, sacas los cupones a una tabla y, si algo queda pendiente, lo dejas visible.

```ts
// carrito.ts (lo que dejas)
type CartItem = { unitPrice: number; quantity: number };

const COUPON_DISCOUNTS: Record<string, number> = {
  PROMO10: 0.1,
  PROMO20: 0.2,
  PROMO30: 0.3, // tu tarea
};

export function cartTotal(items: CartItem[], couponCode?: string): number {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const discount = couponCode ? COUPON_DISCOUNTS[couponCode] ?? 0 : 0;
  return roundToCents(subtotal * (1 - discount));
}

function roundToCents(amount: number): number {
  return Math.round(amount * 100) / 100;
}
// Pendiente visible: los cupones deberían venir de la base de datos (ticket #142).
```

El comportamiento es el mismo para los cupones existentes, tu cambio cabe en una línea de la tabla y la deuda que queda está nombrada y enlazada a un ticket. Eso es asumir responsabilidad, aplicar la regla del boy scout y no vivir con ventanas rotas, todo en un solo cambio pequeño. Antes de hacerlo, eso sí, conviene tener (o escribir) un test que fije el comportamiento actual de `total`, para que la limpieza no introduzca un bug.

### Cómo invertir en tu portafolio sin quemarte

El consejo de "aprende un lenguaje al año y lee un libro al mes" puede sonar abrumador. Lo que importa es la **regularidad**, no la intensidad. Una forma realista de organizarlo:

| Frecuencia | Actividad | Ejemplo |
| --- | --- | --- |
| Diaria | Bloque fijo de estudio | Las 2 horas de este plan |
| Semanal | Practicar algo fuera de tu stack | Una kata en otro lenguaje |
| Mensual | Un libro o curso corto | Un capítulo por semana |
| Trimestral | Revisar y rebalancear | ¿Qué aprendí? ¿Qué dejo? ¿Qué empiezo? |

Lleva un registro (los autores lo llaman *engineering daybook*, lo verás más adelante): qué aprendiste, qué dudas te quedaron y qué quieres probar. Ese registro convierte el aprendizaje disperso en un portafolio que puedes revisar.

### Cómo se relacionan ambos libros

| Idea pragmática | Equivalente en Clean Code |
| --- | --- |
| Ventanas rotas | El costo total de tener un desastre |
| Asumir responsabilidad | "Es nuestra culpa": defender el código como el cirujano defiende la higiene |
| Software suficientemente bueno | Saber cuándo parar; limpio no es perfecto |
| Catalizador del cambio (sopa de piedras) | La regla del boy scout: mejoras pequeñas y continuas |

### Errores comunes

- **Confundir "suficientemente bueno" con "da igual".** La calidad se negocia explícitamente con los usuarios; no se rebaja en silencio.
- **Ver el refactoring como algo que se hace "cuando haya tiempo".** Ese tiempo nunca llega; la limpieza es parte de cada tarea.
- **Pedir el gran rediseño en lugar de mejorar de forma incremental.** Los rediseños totales rara vez alcanzan al sistema vivo.
- **Culpar al contexto.** El contexto existe, pero la decisión de ensuciar el código la toma quien escribe.
- **Aprender solo tu stack actual.** Un portafolio sin diversificar se queda obsoleto de golpe.

## Conceptos clave

- **Responsabilidad profesional**: asumir los compromisos y los errores, y ofrecer opciones en lugar de excusas.
- **Ventanas rotas**: pequeños descuidos visibles que, si se toleran, aceleran la degradación del código.
- **Catalizador del cambio**: impulsar una mejora construyendo algo pequeño que funcione y sumando gente después.
- **Software suficientemente bueno**: nivel de calidad decidido explícitamente con los usuarios.
- **Portafolio de conocimiento**: gestionar tu aprendizaje como una inversión diversificada y periódica.
- **Regla del boy scout**: dejar cada archivo que tocas un poco más limpio de lo que estaba.
- **Proporción lectura/escritura**: leemos mucho más código del que escribimos, por eso la legibilidad acelera la escritura.

## Preguntas de repaso

1. ¿Qué significa "ofrecer opciones, no excusas" y por qué es más útil?
   R: Ante un problema, en lugar de justificar por qué no se pudo, presentar alternativas concretas con su costo para resolverlo. Es más útil porque permite decidir y avanzar, y genera confianza; la excusa solo transfiere el problema.
2. Explica la teoría de las ventanas rotas aplicada al código y qué hacer si no tienes tiempo de arreglar una.
   R: Un descuido visible que se tolera (código feo, TODO eterno, test deshabilitado) normaliza el abandono y acelera la degradación. Si no puedes arreglarlo bien, "tápalo": hazlo visible con un comentario, un ticket, un mensaje de no implementado o un test pendiente, para dejar claro que no es aceptable.
3. ¿Qué es software "suficientemente bueno" y quién decide cuánto es suficiente?
   R: Software cuyo nivel de calidad se eligió de forma explícita según su uso y riesgo, sin buscar la perfección. Se decide involucrando a los usuarios en el trade-off entre calidad, tiempo y alcance; la calidad es un requisito más.
4. Menciona tres principios del portafolio de conocimiento y una acción concreta para cada uno.
   R: Invertir regularmente (una hora fija diaria de estudio); diversificar (aprender un lenguaje de otro paradigma, como Elixir o Haskell); revisar y rebalancear (cada trimestre, evaluar qué tecnologías están perdiendo relevancia y cuáles emergen).
5. ¿Por qué, según Martin, la única forma de ir rápido es mantener el código limpio?
   R: Porque el desorden frena cada cambio de inmediato: entender, modificar y verificar código sucio cuesta más y genera bugs. La productividad cae con el tiempo hasta casi cero, y ningún atajo compensa esa caída.
6. ¿Qué es la regla del boy scout y qué límite debe respetar?
   R: Dejar cada archivo un poco más limpio de lo que lo encontraste. El límite es que sean mejoras pequeñas y seguras que no cambien el comportamiento; los cambios de comportamiento van en su propio commit con su test.

## Ejercicio

Elige un archivo de un proyecto tuyo (o del repositorio de esta app) de al menos 80 líneas. Aplica la regla del boy scout con exactamente cinco mejoras pequeñas que no cambien el comportamiento (renombrar, extraer función, borrar código muerto o un comentario obsoleto, tipar algo que era `any`). Anota cada mejora en una lista con su motivo. Después, escribe tu portafolio de conocimiento para los próximos 12 meses: dos tecnologías estables, una de riesgo y una habilidad no técnica, con una acción concreta por trimestre. Terminado cuando los tests (si existen) siguen pasando, tienes la lista de cinco mejoras y el portafolio escrito.

## Explícalo con tus palabras

Explica a un compañero que dice "no tengo tiempo de escribir código limpio, hay que entregar" por qué ensuciar el código hoy lo hará entregar más lento la semana que viene.
