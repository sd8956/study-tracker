---
title: Diseño simple, programar a propósito y refactoring
kind: lesson
hours: 2
sources: Clean Code, cap. 12 Emergence (pp. 202–207) | The Pragmatic Programmer, tema 38 Programming by Coincidence (pp. 334–342) | The Pragmatic Programmer, tema 40 Refactoring (pp. 354–360)
---

## Objetivo

Conocer las cuatro reglas del diseño simple de Kent Beck, aprender a programar de forma deliberada en lugar de "por coincidencia" y hacer del refactoring una actividad diaria, segura y en pasos pequeños. Al terminar vas a poder detectar cuándo un código funciona "por casualidad" y refactorizarlo con una secuencia de pasos verificados.

## Estudio

### Diseño emergente: las cuatro reglas del diseño simple

¿Y si hubiera unas pocas reglas que, aplicadas con constancia, hicieran que un buen diseño **emergiera** solo? El capítulo 12 de *Clean Code* (escrito por Jeff Langr) presenta las cuatro reglas del diseño simple de Kent Beck. Según Beck, un diseño es simple si, en orden de importancia:

1. **Ejecuta todos los tests.**
2. **No contiene duplicación.**
3. **Expresa la intención del programador.**
4. **Minimiza el número de clases y métodos.**

El orden importa: cada regla está por encima de las siguientes. Vamos una por una.

### Regla 1: ejecuta todos los tests

Primero, un diseño tiene que producir un sistema que funcione como se espera. Un sistema puede tener un diseño precioso en papel, pero si no hay forma sencilla de verificar que funciona, todo ese esfuerzo es dudoso. Un sistema completamente probado, que pasa todos sus tests todo el tiempo, es un sistema **verificable**.

La parte interesante es el efecto secundario: **escribir tests empuja hacia mejores diseños**. Las clases pequeñas y con un solo propósito son más fáciles de probar. Las dependencias fuertes dificultan escribir tests, así que, cuantos más tests escribes, más te inclinas a usar inyección de dependencias, interfaces y abstracciones para reducir el acoplamiento. Es decir, cumplir la regla 1 te empuja a cumplir los principios de la sesión anterior (SRP, DIP) casi sin proponértelo.

Y, sobre todo, los tests son lo que **permite** aplicar las otras tres reglas: una vez que tienes tests, puedes limpiar el código sin miedo, porque sabes de inmediato si rompiste algo.

### Reglas 2 a 4: refactorizar

Con los tests en su sitio, el código se mantiene limpio refactorizándolo de forma incremental. Cada vez que añades unas líneas de código, haces una pausa y reflexionas sobre el diseño: ¿lo acabo de degradar? Si es así, lo limpias y ejecutas los tests.

**Sin duplicación.** La duplicación es el principal enemigo de un sistema bien diseñado: trabajo extra, riesgo extra y complejidad innecesaria. Puede ser evidente (líneas idénticas) o sutil (implementaciones duplicadas). El capítulo pone un ejemplo de una colección con `size()` e `isEmpty()`: si las dos tienen su propia implementación, `isEmpty` debería simplemente apoyarse en `size`:

```ts
class TaskList {
  #tasks: Task[] = [];
  size(): number { return this.#tasks.length; }
  isEmpty(): boolean { return this.size() === 0; } // no reimplementa nada
}
```

Incluso pequeñas reutilizaciones como esta reducen la complejidad. Y eliminar duplicación a menudo revela violaciones de SRP: el código extraído a veces pertenece a otra clase. Un ejemplo más grande es el patrón **Template Method**, que elimina duplicación de alto nivel:

```ts
// Antes: dos políticas de vacaciones casi iguales
class VacationPolicy {
  accrueUSDivisionVacation(): void {
    // calcular vacaciones según horas trabajadas (igual)
    // asegurar el mínimo legal de EE. UU. (distinto)
    // aplicar vacaciones a la nómina (igual)
  }
  accrueEUDivisionVacation(): void {
    // calcular vacaciones según horas trabajadas (igual)
    // asegurar el mínimo legal de la UE (distinto)
    // aplicar vacaciones a la nómina (igual)
  }
}

// Después: Template Method; solo varía el paso distinto
abstract class VacationPolicy {
  accrueVacation(): void {
    this.calculateBaseVacationHours();
    this.alterForLegalMinimums();
    this.applyToPayroll();
  }
  private calculateBaseVacationHours(): void { /* ... */ }
  protected abstract alterForLegalMinimums(): void;
  private applyToPayroll(): void { /* ... */ }
}

class USVacationPolicy extends VacationPolicy {
  protected alterForLegalMinimums(): void { /* lógica de EE. UU. */ }
}

class EUVacationPolicy extends VacationPolicy {
  protected alterForLegalMinimums(): void { /* lógica de la UE */ }
}
```

(Recuerda el "impuesto de la herencia" de la sesión 12: esto es herencia superficial para un patrón concreto. La misma idea se puede expresar sin herencia, pasando el paso variable como función: `accrueVacation(alterForLegalMinimums: (hours: number) => number)`.)

**Expresividad.** Es fácil escribir código que entendemos nosotros, porque mientras lo escribimos estamos inmersos en el problema. Quien lo mantenga después no tendrá esa inmersión. La mayor parte del costo de un proyecto de software está en el mantenimiento a largo plazo, así que el código debe expresar claramente la intención de su autor. Herramientas para lograrlo, que ya conoces:

- Buenos nombres (sesión 4).
- Funciones y clases pequeñas (sesiones 4 y 12).
- Nomenclatura estándar: si usas un patrón como Command o Visitor, ponlo en el nombre de la clase para que otros lo reconozcan.
- Tests unitarios bien escritos, que funcionan como documentación por ejemplos.

Y la más importante: **inténtalo**. Muy a menudo hacemos que el código funcione y pasamos al siguiente problema sin pensar en quién lo leerá. Dedica un poco de tiempo a cada función y cada clase. Elige mejores nombres, divide funciones grandes. El cuidado es un recurso precioso.

**Mínimo de clases y métodos.** Incluso conceptos tan fundamentales como eliminar duplicación o SRP se pueden llevar demasiado lejos. En el afán de hacer clases y métodos pequeños, podemos crear demasiados. Esta regla sugiere mantener bajo el número de funciones y clases, y evitar el dogmatismo: por ejemplo, insistir en crear una interfaz para cada clase o separar siempre los campos y el comportamiento en clases distintas aunque no aporte nada. Es la regla de menor prioridad por una razón: lo más importante son los tests, eliminar duplicación y expresar intención. Pero recuerda que el objetivo es un sistema pequeño en su conjunto, no solo funciones pequeñas.

### Programar por coincidencia

*The Pragmatic Programmer* presenta el problema opuesto al diseño deliberado: **programar por coincidencia**, es decir, confiar en la suerte y en éxitos accidentales en lugar de programar con intención.

El libro empieza con una imagen: un soldado avanza por un campo minado. Da un paso y no explota nada. Otro paso, nada. Después de varios pasos, concluye que el campo es seguro... hasta que pisa una mina. Programar por coincidencia es lo mismo: escribes código, lo pruebas, parece funcionar, añades más, sigue funcionando... y un día falla sin que entiendas por qué, porque **nunca supiste por qué funcionaba**.

Tipos de coincidencias que describe el libro:

**Accidentes de implementación.** Cosas que funcionan porque el código está escrito de cierta manera, no porque esté garantizado. Por ejemplo, llamar a una función con datos fuera de rango y obtener por casualidad el resultado esperado, o depender de un comportamiento no documentado (la ley de Hyrum desde el otro lado). Si la implementación cambia, tu código se rompe.

```ts
// Funciona por coincidencia: Object.keys "suele" respetar el orden de inserción
// para claves string, pero las claves que parecen enteros se ordenan numéricamente.
const steps = { "10": "deploy", "2": "test", "1": "build" };
for (const key of Object.keys(steps)) run(steps[key as keyof typeof steps]);
// Ejecuta 1, 2, 10 por las reglas de ordenación de claves numéricas, no por intención.

// Deliberado: el orden es un dato explícito
const orderedSteps = ["build", "test", "deploy"] as const;
for (const step of orderedSteps) run(step);
```

**"Bastante cerca no es suficiente".** El libro cuenta un caso de un sistema que trabajaba con zonas horarias y tenía ajustes "+1" o "-1" dispersos por el código para corregir desfases que nadie entendía. Cada parche funcionaba en los casos probados. Si no entiendes por qué hay un desfase, el parche probablemente rompe otro caso (por ejemplo, el cambio de horario de verano).

**Patrones fantasma.** Los humanos vemos patrones donde no los hay. Un test que falla "a veces" no es mala suerte: hay una causa. Asumir que algo funciona porque pasó tres veces seguidas es ver un patrón fantasma.

**Accidentes de contexto.** Tu código funciona porque asume un contexto: que hay un usuario sentado delante, que el idioma del sistema es inglés, que hay conexión a internet, que la zona horaria del servidor es la misma que la del usuario. ¿Lo garantiza alguien?

**Suposiciones implícitas.** Las coincidencias más peligrosas son las que ni siquiera sabes que estás haciendo. Una suposición no basada en hechos bien establecidos puede arruinar cualquier proyecto.

### Cómo programar deliberadamente

El libro da una lista de prácticas:

- **Sé siempre consciente de lo que haces.** Si no lo eres, terminarás como la rana hervida de la sesión 1.
- **¿Puedes explicar el código a un programador junior?** Si no puedes, quizá dependes de coincidencias.
- **No programes con los ojos vendados.** Si construyes una aplicación con una tecnología que no entiendes, es probable que te engañen las coincidencias.
- **Procede según un plan**, aunque sea un esquema en una servilleta o un comentario.
- **Confía solo en cosas fiables.** No dependas de suposiciones; si no puedes saber algo, asume lo peor.
- **Documenta tus suposiciones.** El diseño por contrato (sesión 7) ayuda a aclararlas para ti y para otros.
- **No pruebes solo tu código: prueba también tus suposiciones.** Escribe una aserción o un test que las verifique (como los learning tests de la sesión 7).
- **Prioriza tu esfuerzo.** Dedica tiempo a lo importante, que suele ser lo difícil.
- **No seas esclavo de la historia.** No dejes que el código existente dicte el código futuro. Todo código se puede reemplazar si ya no es apropiado.

Y una regla que conecta con el debugging (sesión 18): cuando arregles un bug, asegúrate de entender **por qué** se arregló. Si "lo cambié y ahora funciona" sin saber por qué, quizá solo moviste la mina de sitio.

### Refactoring: el código es un jardín

El tema 40 empieza con una metáfora. Solemos imaginar el software como un edificio: se planifica, se construye y se mantiene. Pero los autores dicen que el software se parece más a un **jardín**: algo orgánico, no estático. Plantas cosas según un plan, pero algunas crecen mucho, otras se marchitan, algunas hay que trasplantarlas a donde da más sol. Hay que podar, mover y arrancar malas hierbas constantemente.

Martin Fowler, autor del libro de referencia sobre el tema, define refactorizar como un proceso disciplinado de reestructurar código existente, cambiando su estructura interna sin cambiar su comportamiento externo. Dos ideas clave:

1. **Es disciplinado**, no una reescritura libre.
2. **El comportamiento externo no cambia.** Por eso no añades funcionalidad mientras refactorizas.

Para garantizar que el comportamiento no cambia necesitas tests automáticos. Y para que el riesgo sea bajo, el refactoring se hace en **pasos pequeños**: cada paso es una transformación diminuta (renombrar, extraer función, mover método) seguida de la ejecución de los tests.

### ¿Cuándo refactorizar?

Cuando hayas aprendido algo. Cuando entiendas algo mejor que el año pasado, ayer o hace diez minutos. El libro enumera situaciones que lo justifican:

| Situación | Ejemplo |
| --- | --- |
| **Duplicación** | Encontraste una violación de DRY |
| **Diseño no ortogonal** | Algo que debería ser independiente está acoplado |
| **Conocimiento desactualizado** | Los requisitos cambiaron, o entiendes mejor el problema |
| **Uso** | El sistema se usa de forma distinta a la prevista y algunas funciones importan más |
| **Rendimiento** | Hay que mover funcionalidad para mejorar el rendimiento |
| **Los tests pasan** | Acabas de hacer pasar un test: es el mejor momento para limpiar (el ciclo de TDD) |

El libro también usa una metáfora médica: el código que necesita refactoring es como un tumor. Quitarlo requiere cirugía invasiva. Puedes hacerlo ahora, mientras es pequeño, o esperar a que crezca y se extienda, pero entonces será más caro y más peligroso. **Refactoriza pronto, refactoriza a menudo.**

¿Y la presión del calendario? La excusa más común para no refactorizar es "no tenemos tiempo". El consejo del libro: explica a los responsables del proyecto, con la analogía médica si hace falta, que no refactorizar hoy significa una inversión mucho mayor mañana. Y si de verdad no se puede ahora, asegúrate de que quede en el calendario y de que los afectados lo sepan (una "ventana tapada", como en la sesión 1).

### Cómo refactorizar

Los consejos del libro, basados en Fowler:

1. **No refactorices y añadas funcionalidad al mismo tiempo.**
2. **Asegúrate de tener buenos tests antes de empezar** y ejecútalos con la mayor frecuencia posible.
3. **Da pasos cortos y deliberados**: mover un campo de una clase a otra, partir un método, renombrar una variable. Muchos pasos pequeños acumulados producen un cambio grande y seguro.

Los editores modernos automatizan muchos refactorings comunes en TypeScript (renombrar símbolo, extraer función, extraer constante, mover a un archivo nuevo, convertir a función flecha). Úsalos: son más seguros que hacerlo a mano.

### Ejemplo: una secuencia de refactoring

Supón que tienes esta función con un test que la cubre:

```ts
export function summary(sessions: { h: number; d: boolean; k: string }[]) {
  let a = 0, b = 0;
  for (const s of sessions) {
    if (s.d) a += s.h;
    b += s.h;
  }
  return Math.round((a / b) * 100) + "% (" + a + "/" + b + "h)";
}
```

Secuencia de pasos pequeños, ejecutando los tests tras cada uno:

1. **Renombrar** `a` → `doneHours`, `b` → `totalHours`, `s` → `session` (refactor automático del editor).
2. **Introducir un tipo** `SessionProgress = { hours: number; done: boolean; key: string }` y renombrar los campos con el editor.
3. **Extraer función** `sumHours(sessions)` y usarla dos veces (con `filter` para las completadas).
4. **Extraer función** `percentage(part, whole)`.
5. **Sustituir la concatenación** por un template literal.

```ts
type SessionProgress = { hours: number; done: boolean; key: string };

const sumHours = (sessions: readonly SessionProgress[]): number =>
  sessions.reduce((total, session) => total + session.hours, 0);

const percentage = (part: number, whole: number): number => Math.round((part / whole) * 100);

export function progressSummary(sessions: readonly SessionProgress[]): string {
  const doneHours = sumHours(sessions.filter((session) => session.done));
  const totalHours = sumHours(sessions);
  return `${percentage(doneHours, totalHours)}% (${doneHours}/${totalHours}h)`;
}
```

Durante el refactor te das cuenta de que con una lista vacía la función devuelve `"NaN% (0/0h)"`. ¿Lo arreglas ya? **No**: eso es un cambio de comportamiento. Terminas el refactor, haces commit y después, en otro commit, escribes un test para la lista vacía ("0% (0/0h)") y lo haces pasar. Así cada commit tiene un propósito claro y se puede revisar o revertir por separado.

### Cómo se conectan las tres ideas

- Las **cuatro reglas** te dicen hacia dónde va el código: tests en verde, sin duplicación, expresivo y sin piezas de más.
- **Programar a propósito** te asegura que entiendes por qué el código funciona, para no construir sobre coincidencias.
- **Refactorizar** es el mecanismo diario y seguro para acercar el código a esas reglas a medida que aprendes.

### Errores comunes

- **"Refactorizar" sin tests**: no es refactoring, es cambiar código y esperar lo mejor.
- **Mezclar refactor y funcionalidad nueva** en el mismo commit.
- **Pasos gigantes**: reescribir un módulo entero de golpe y "ver si los tests pasan".
- **Parches que no entiendes** (+1, -1, un `setTimeout` que "arregla" algo).
- **Dejar el refactoring para "cuando haya tiempo"**: el tumor crece.
- **Crear clases e interfaces por dogma**, inflando el sistema sin aportar claridad.

### Resumen

Un buen diseño puede emerger de cuatro reglas aplicadas con constancia: tests que pasan, nada duplicado, intención expresada y ninguna pieza de más. Los tests son la base porque hacen seguro todo lo demás. Programar a propósito significa entender por qué tu código funciona y verificar tus suposiciones, en lugar de avanzar por un campo minado confiando en la suerte. Y el refactoring es el cuidado diario del jardín: pasos pequeños, tests tras cada uno, nunca mezclado con funcionalidad nueva, y hecho pronto, antes de que el problema crezca.

## Conceptos clave

- **Diseño simple (Kent Beck)**: ejecuta todos los tests, sin duplicación, expresa la intención y minimiza clases y métodos, en ese orden.
- **Diseño emergente**: buen diseño que surge de aplicar reglas simples de forma constante, apoyado en tests.
- **Template Method**: patrón que fija el esqueleto de un algoritmo y deja los pasos variables a subclases o funciones.
- **Programar por coincidencia**: confiar en que el código funciona sin entender por qué.
- **Accidente de implementación**: comportamiento que funciona por cómo está escrito algo, no porque esté garantizado.
- **Refactoring**: reestructurar el código sin cambiar su comportamiento externo, en pasos pequeños verificados.
- **Metáfora del jardín**: el software requiere cuidado continuo (podar, mover, arrancar), no solo construcción.

## Preguntas de repaso

1. Enumera las cuatro reglas del diseño simple en orden y explica por qué la primera es la más importante.
   R: Ejecuta todos los tests, no contiene duplicación, expresa la intención y minimiza clases y métodos. La primera es la más importante porque un sistema debe funcionar y ser verificable, y porque los tests son lo que permite refactorizar con seguridad para cumplir las demás; además, escribir tests empuja hacia diseños desacoplados.
2. ¿Por qué la regla "minimiza clases y métodos" tiene la menor prioridad y qué abuso intenta evitar?
   R: Porque los tests, la eliminación de duplicación y la expresividad aportan más valor. Intenta evitar el dogmatismo de crear una interfaz para cada clase o dividir sin necesidad, inflando el sistema con piezas que no aportan claridad.
3. ¿Qué es programar por coincidencia? Da un ejemplo de accidente de implementación y uno de contexto.
   R: Es confiar en que el código funciona sin saber por qué. Accidente de implementación: depender del orden en que `Object.keys` devuelve las claves. Accidente de contexto: asumir que la zona horaria del servidor es la misma que la del usuario.
4. Menciona cuatro prácticas para programar deliberadamente.
   R: Ser consciente de lo que haces, proceder según un plan, confiar solo en cosas fiables, documentar las suposiciones, probar las suposiciones con tests o aserciones, priorizar el esfuerzo y no ser esclavo del código existente.
5. Según The Pragmatic Programmer, ¿cuándo conviene refactorizar? Da cuatro situaciones.
   R: Cuando hay duplicación, cuando el diseño no es ortogonal, cuando el conocimiento quedó desactualizado, cuando el uso real es distinto del previsto, por rendimiento y justo después de hacer pasar un test.
6. ¿Qué haces si durante un refactor descubres un bug, y por qué?
   R: Lo anotas, terminas el refactor y lo arreglas en un commit separado, primero con un test que falle. Así no mezclas un cambio de comportamiento con uno que promete no cambiarlo, y cada commit se puede revisar y revertir por separado.

## Ejercicio

Busca en un proyecto tuyo (o escribe) una función de al menos 30 líneas que tenga duplicación, nombres pobres y alguna suposición implícita (por ejemplo, sobre zona horaria, orden o formato). Primero escribe tests que cubran su comportamiento actual y un test o aserción que haga explícita la suposición. Luego refactoriza en al menos ocho pasos pequeños, cada uno en su propio commit con el nombre del refactoring aplicado ("Rename Variable", "Extract Function", "Introduce Parameter Object"...), ejecutando los tests tras cada uno. Si encuentras un bug, arréglalo en un commit `fix:` separado. Terminado cuando los tests pasan en todos los commits, el historial muestra los ocho pasos y la suposición quedó documentada en un test.

## Explícalo con tus palabras

Explica la diferencia entre "funciona" y "sé por qué funciona" usando la historia del soldado en el campo minado.
