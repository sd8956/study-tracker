---
title: Qué es ingeniería de software — tiempo, escala y trade-offs
kind: lesson
hours: 2
sources: Software Engineering at Google, cap. 1 What Is Software Engineering? (pp. 16–41) | The Pragmatic Programmer, prefacio y Who Should Read This Book? (pp. 17–33)
---

## Objetivo

Entender la diferencia entre programar e ingeniería de software a través de tres ideas: el tiempo (el código vive y cambia), la escala (más personas, más código, más máquinas) y los trade-offs (toda decisión tiene un costo). Al terminar vas a poder explicar la ley de Hyrum y por qué cambia la forma en que diseñas APIs.

## Estudio

### Programar no es lo mismo que hacer ingeniería de software

Imagina dos situaciones. En la primera escribes un script para renombrar 300 fotos de tus vacaciones. Lo ejecutas una vez, funciona y lo borras. En la segunda escribes el módulo de cobros de una tienda online que va a estar en producción cinco años, que van a tocar diez personas distintas y que va a pasar por tres actualizaciones de Node.js. Las dos cosas son "programar", pero solo la segunda es un problema de **ingeniería de software**.

Los autores de *Software Engineering at Google* lo resumen con una frase que vale la pena memorizar: la ingeniería de software es **programación integrada en el tiempo**. Programar es el acto de producir código que funciona hoy. Hacer ingeniería es producir código que siga funcionando, que se pueda cambiar y que se pueda mantener mientras pasan los años, cambian las personas y cambia el entorno.

De ahí salen tres ejes que vas a ver una y otra vez en este módulo:

| Eje | Pregunta clave | Ejemplo |
| --- | --- | --- |
| **Tiempo** | ¿Cuánto va a vivir este código y cuánto va a cambiar? | Un script de una vez frente a un servicio de diez años |
| **Escala** | ¿Cuántas personas, líneas de código y máquinas están involucradas? | Un repositorio personal frente a un monorepo con miles de ingenieros |
| **Trade-offs** | ¿Qué gano y qué pierdo con esta decisión? | Escribir tests ahora (costo) frente a depurar en producción después (riesgo) |

### El eje del tiempo: la vida esperada del código

La vida esperada de un programa va desde minutos hasta décadas. Esa variable cambia todo. Si tu código vive minutos, no importa que dependa de una versión exacta de una librería ni que nadie más lo pueda leer. Si vive años, cada dependencia es una deuda que algún día habrá que pagar: el lenguaje evoluciona, el sistema operativo cambia, aparece una vulnerabilidad en una librería, cambian los requisitos del negocio.

El libro introduce un concepto central: la **sostenibilidad**. Tu proyecto es sostenible si, durante toda su vida esperada, eres capaz de reaccionar a cualquier cambio valioso que aparezca, ya sea por razones técnicas o de negocio. Ojo con el matiz: no se trata de cambiar por cambiar, sino de **poder** cambiar cuando haga falta. Puedes decidir no actualizar una dependencia, pero esa decisión debe ser tuya, no una imposibilidad.

Una analogía útil: una casa. Si la vas a usar un fin de semana, una carpa basta. Si vas a vivir en ella veinte años, necesitas cimientos, tuberías accesibles y planos, porque sabes que vas a remodelar la cocina, cambiar el techo y arreglar fugas. No sabes cuándo, pero sabes que va a pasar.

Un fenómeno que el libro describe con mucha honestidad es el de las **actualizaciones que nadie ha hecho antes**. La primera vez que un equipo intenta actualizar algo después de años sin tocarlo, todo es doloroso: nadie recuerda cómo se hizo, las dependencias ocultas aparecen, y muchas cosas se rompen a la vez. La lección es que **lo que haces seguido se vuelve barato**. Si actualizas tus dependencias cada semana, cada actualización es pequeña y aburrida. Si lo haces cada tres años, es un proyecto en sí mismo. A esto se le suele resumir como "si duele, hazlo más seguido".

### La ley de Hyrum

Esta es probablemente la idea más citada del libro. Se enuncia más o menos así: con un número suficiente de usuarios de una API, no importa lo que prometas en el contrato; **todo comportamiento observable de tu sistema será usado por alguien**.

El ejemplo clásico es el orden de iteración de un hash. Supón que tienes un `Set` o un diccionario basado en hash. La documentación no promete ningún orden. Sin embargo, en la práctica, una versión concreta siempre devuelve los elementos en el mismo orden. Con suficientes usuarios, alguien va a escribir código que (sin darse cuenta) depende de ese orden: un test que compara una lista, un reporte que asume que la primera clave es la más importante. El día que el equipo de la librería mejora el algoritmo de hash (por rendimiento o por seguridad, por ejemplo para evitar ataques de *hash flooding*), ese código se rompe. Técnicamente la culpa es del usuario, que dependía de algo no prometido. Pero en la práctica el cambio rompió producción.

Veamos una versión en TypeScript:

```ts
// Librería v1: devuelve los usuarios activos.
// El contrato solo dice "devuelve los usuarios activos".
export function activeUsers(users: User[]): User[] {
  return users.filter((u) => u.active); // conserva el orden de entrada
}

// Código de un cliente, escrito un año después:
const [owner] = activeUsers(team.members); // ¡asume que el primero es el dueño!
```

Si en la versión 2 la librería decide ordenar por fecha de último acceso, el cliente se rompe aunque el contrato nunca prometió el orden. Consecuencias prácticas de la ley de Hyrum:

- **Expón lo mínimo.** Cada cosa observable (orden, formato de un mensaje de error, tiempos, campos extra en un JSON) es un contrato implícito potencial.
- **Haz explícito lo que no prometes.** Algunos lenguajes aleatorizan el orden de los hash a propósito para que nadie dependa de él. En tus APIs puedes hacer lo mismo con cosas que quieres poder cambiar.
- **Los tests de los consumidores son tu red de seguridad.** Si sabes quién usa tu código y tienes sus tests, puedes detectar qué cambio rompe a quién.

Hay una frase del libro que conecta con esto: es programación si "ingenioso" es un cumplido, pero es ingeniería de software si "ingenioso" es una acusación. El código "clever" que aprovecha un detalle no documentado funciona hoy y explota mañana.

### El eje de la escala

La escala tiene dos caras: la escala de **tu software** (cuántos usuarios, cuántas máquinas) y la escala de **tu organización** (cuántos ingenieros, cuánto código, cuántas dependencias). El libro se concentra en la segunda: ¿cómo cambia el costo de hacer algo cuando la organización crece?

La pregunta clave es: **¿tu proceso escala de forma lineal o peor que lineal con el tamaño de la organización?** Algunos ejemplos:

| Política | ¿Escala bien? | Por qué |
| --- | --- | --- |
| "Cada equipo migra su código cuando cambia una librería compartida" | No | El costo total crece con el número de equipos, y cada uno lo hace por primera vez |
| "El equipo de infraestructura hace las migraciones de todos" (la *churn rule* de Google) | Mejor | Los expertos hacen el trabajo, lo automatizan y aprenden con cada repetición |
| "Usamos ramas de desarrollo de larga vida" | No | El costo del merge final crece con el tiempo y con el número de ramas |
| "Todos trabajan cerca de trunk con cambios pequeños" | Sí | Los conflictos son pequeños y se resuelven pronto |

La **churn rule** (regla de la rotación) dice algo así: si eres el equipo que cambia la infraestructura, eres responsable de actualizar a tus usuarios, no al revés. Así el costo de un cambio no se multiplica por el número de equipos afectados.

Otra regla famosa es la **regla de Beyoncé**: "si te gustaba, deberías haberle puesto un test". Si un equipo de infraestructura hace un cambio, pasa todos los tests de CI y aun así rompe tu producto, la responsabilidad es tuya por no tener un test que protegiera ese comportamiento. Esto obliga a que los comportamientos importantes estén protegidos por tests automatizados, lo que permite que otros equipos cambien cosas con confianza.

También aparece la idea de **desplazar a la izquierda** (*shifting left*): cuanto antes en el ciclo detectas un problema, más barato es corregirlo. Un error detectado por el editor cuesta segundos; detectado en code review, minutos; en CI, horas; en producción, días y reputación.

```
Costo de arreglar un defecto según dónde se detecta
editor/IDE  →  tests locales  →  code review  →  CI  →  staging  →  producción
   $                $$              $$$          $$$$     $$$$$      $$$$$$$$
```

Por eso en este módulo vas a ver tantas herramientas que actúan temprano: tipos de TypeScript, linters, tests, revisión de código.

La escala también afecta a la **experiencia** acumulada. Cuando una tarea se repite muchas veces (por ejemplo, actualizar un compilador), cada vez es más barata porque se automatiza, se documenta y se conocen sus trampas. Ese efecto de aprendizaje solo aparece si la tarea se hace con frecuencia y si el conocimiento se guarda en algún lugar compartido.

### El eje de los trade-offs

Ingeniería es decidir con información incompleta. El libro insiste en que en Google se prefieren las decisiones basadas en datos y razones explícitas, no en "porque yo lo digo". Las decisiones se toman considerando varios tipos de costo:

- **Financiero**: dinero, máquinas, licencias.
- **Recursos**: tiempo de CPU, memoria.
- **Personal**: horas de ingeniería.
- **Transaccional**: cuánto cuesta actuar (hacer un cambio, desplegar).
- **Oportunidad**: lo que dejas de hacer por hacer esto.
- **Social**: cómo afecta a la gente y a la organización.

Un ejemplo del libro, simplificado: ¿pagar marcadores y pizarras para todos o controlar su uso? El costo de los marcadores es ínfimo comparado con el costo de que un ingeniero pierda tiempo buscando uno. Las decisiones de herramientas siguen la misma lógica: si una herramienta de CI más rápida ahorra minutos a cientos de personas por día, vale más que su costo de máquinas.

Lo importante no es acertar siempre, sino que la decisión sea **explicable** y **revisable**. Una buena decisión de ingeniería se toma con lo que se sabe, se documenta con sus razones y se revisa cuando aparecen datos nuevos. Cambiar de opinión cuando cambian los datos no es un fracaso, es parte del proceso. Lo que sí es un problema es decir "siempre se hizo así" sin poder explicar por qué.

### Lo que aporta The Pragmatic Programmer

El prefacio de *The Pragmatic Programmer* encaja muy bien con esta visión. Hunt y Thomas describen al programador pragmático con varias características:

| Rasgo | Qué significa en la práctica |
| --- | --- |
| **Adoptante temprano / adaptable** | Pruebas tecnologías nuevas y las integras rápido, sin casarte con ninguna |
| **Curioso** | Haces preguntas: ¿cómo funciona esto?, ¿por qué se hizo así? |
| **Pensador crítico** | No aceptas una afirmación sin evidencia, aunque venga de un experto |
| **Realista** | Entiendes la naturaleza del problema y estimas cuán difícil es |
| **Generalista ("jack of all trades")** | Conoces muchas tecnologías y entornos, aunque te especialices en algo |

Y dos consejos que van al corazón de este módulo: **preocúpate por tu oficio** (no tiene sentido hacer software si no te importa hacerlo bien) y **piensa en tu trabajo** (no pongas el piloto automático; evalúa constantemente lo que haces). El libro también recuerda que, incluso en equipos grandes, cada individuo aporta su propio oficio: la analogía es la de los canteros que trabajaban en una catedral. Cada uno tallaba su piedra con cuidado, aunque el resultado fuera una obra colectiva que nunca vería terminada.

Por último, el prefacio insiste en que esto es un **proceso continuo**. No hay un día en que "ya sabes" ser buen ingeniero. Es una práctica diaria de pequeñas mejoras, que se parece más a cuidar un jardín que a construir un edificio y olvidarse.

### Juntando las piezas: un caso práctico

Supón que trabajas en una librería interna `@acme/dates` que usan 40 servicios. Quieres cambiar `formatDate(d)` para que use ISO 8601 en lugar de `DD/MM/YYYY`.

1. **Tiempo**: la librería va a vivir años; si no puedes hacer este cambio ahora, mañana será peor.
2. **Hyrum**: aunque la documentación diga "devuelve una fecha legible", alguien parsea ese string. Asume que habrá consumidores rotos.
3. **Escala**: 40 servicios. Si cada equipo migra solo, son 40 migraciones aprendidas desde cero. Mejor: tú creas `formatDateIso`, marcas la vieja como deprecada y haces tú (o automatizas) los cambios en los consumidores (churn rule).
4. **Beyoncé**: si un consumidor no tenía test y se rompe en producción, la conversación cambia: el comportamiento importante debía estar protegido.
5. **Trade-off**: ¿vale la pena el cambio? Si ISO evita bugs de zona horaria en 5 servicios, probablemente sí. Documenta la razón.

### Diseñar APIs pensando en Hyrum: antes y después

Veamos cómo reducir la superficie observable de una función. Esta versión expone detalles que nadie debería poder usar:

```ts
// Antes: devuelve el arreglo interno y un mensaje de error "parseable"
class TagStore {
  tags: string[] = []; // público: cualquiera puede mutarlo o depender del orden

  add(tag: string): string {
    if (this.tags.includes(tag)) return `ERROR:DUPLICATE:${tag}`;
    this.tags.push(tag);
    return "OK";
  }
}
```

Problemas: el arreglo es público (alguien lo va a mutar desde fuera), el orden de inserción es observable y el formato del string de error se convertirá en un contrato el día que alguien haga `result.split(":")`.

```ts
// Después: superficie mínima y contrato explícito
export type AddResult = { ok: true } | { ok: false; reason: "duplicate" };

export class TagStore {
  readonly #tags = new Set<string>();

  add(tag: string): AddResult {
    if (this.#tags.has(tag)) return { ok: false, reason: "duplicate" };
    this.#tags.add(tag);
    return { ok: true };
  }

  /** Devuelve una copia. El orden NO está garantizado. */
  list(): readonly string[] {
    return [...this.#tags].sort(); // orden definido a propósito: alfabético
  }
}
```

Fíjate en las decisiones: el estado es privado (`#tags`), el resultado es un tipo discriminado en lugar de un string con formato, y `list()` devuelve una copia con un orden **elegido y documentado**. Hyrum no desaparece (siempre hay algo observable), pero ahora lo observable es lo que tú decidiste prometer.

### Cómo aplicar esto en tus propios proyectos

No necesitas trabajar en Google para usar estas ideas. Algunas prácticas concretas para un proyecto personal o un equipo pequeño:

1. **Pregunta la vida esperada antes de empezar.** Escribe en el README si el proyecto es un experimento, una herramienta interna o un producto. Eso define cuánto invertir en tests, documentación y diseño.
2. **Actualiza dependencias con frecuencia.** Programa una revisión semanal o usa un bot que abra PRs de actualización. Cada actualización pequeña es aburrida; una acumulada es peligrosa.
3. **Protege lo que te importa con tests.** Si una pantalla, un cálculo o un formato de exportación es crítico, ponle un test aunque "sea obvio".
4. **Registra decisiones.** Un archivo `docs/decisions.md` con fecha, contexto, decisión y alternativas descartadas basta. Dentro de seis meses vas a agradecerlo.
5. **Desconfía de lo ingenioso.** Si tienes que explicar con un comentario largo por qué un truco funciona, probablemente hay una forma más simple y más fácil de mantener.

### Errores comunes

- **Optimizar para el hoy en código de larga vida.** "Es temporal" es una de las frases más peligrosas de la industria: lo temporal suele quedarse años.
- **Sobre-ingeniería en código de corta vida.** Tampoco tiene sentido montar una arquitectura hexagonal para un script de una vez. La vida esperada define cuánto invertir.
- **Confundir "no está en el contrato" con "nadie depende de esto".** La ley de Hyrum dice lo contrario.
- **Tomar decisiones sin registrar el porqué.** Dentro de un año nadie recordará la razón y la decisión se volverá intocable o se revertirá a ciegas.
- **Evitar las tareas dolorosas.** Si una migración duele, la solución es hacerla más seguido y automatizarla, no posponerla.

### Resumen

La ingeniería de software es programación integrada en el tiempo. El tiempo exige sostenibilidad: la capacidad de cambiar lo que valga la pena cambiar. La escala exige procesos que crezcan de forma lineal o mejor con la organización. Y todo se decide con trade-offs explícitos y revisables. La ley de Hyrum te recuerda que cualquier comportamiento observable acaba siendo un contrato, y la regla de Beyoncé te recuerda que lo que te importa debe estar protegido por tests.

## Conceptos clave

- **Ingeniería de software**: programación integrada en el tiempo; escribir código que pueda mantenerse y cambiarse durante toda su vida útil.
- **Sostenibilidad**: capacidad de reaccionar a cualquier cambio valioso durante la vida esperada del software.
- **Ley de Hyrum**: con suficientes usuarios, todo comportamiento observable de una API será usado por alguien, esté o no en el contrato.
- **Churn rule**: quien cambia la infraestructura es responsable de migrar a sus usuarios.
- **Regla de Beyoncé**: si un comportamiento te importaba, debías protegerlo con un test.
- **Shifting left**: detectar problemas lo antes posible en el ciclo de desarrollo, donde son más baratos.
- **Trade-off**: decisión que equilibra costos (financieros, de personas, de oportunidad) con beneficios de forma explícita.

## Preguntas de repaso

1. ¿Qué significa que la ingeniería de software sea "programación integrada en el tiempo"?
   R: Que no basta con producir código que funcione hoy: hay que considerar toda su vida útil, durante la cual cambiarán requisitos, dependencias, plataformas y personas. La ingeniería añade la dimensión del mantenimiento y el cambio a lo largo del tiempo.
2. Enuncia la ley de Hyrum y da un ejemplo propio.
   R: Con suficientes usuarios de una API, todo comportamiento observable será usado por alguien, independientemente de lo que prometa el contrato. Ejemplo: una API REST devuelve los campos del JSON en cierto orden y un cliente parsea la respuesta por posición; si el servidor reordena los campos, el cliente se rompe aunque el contrato no prometía orden.
3. ¿Por qué una política como "cada equipo migra su propio código" escala mal y qué alternativa propone Google?
   R: Porque el costo total crece con el número de equipos y cada uno aprende la migración desde cero, sin efecto de experiencia. La alternativa es la churn rule: el equipo que hace el cambio de infraestructura migra a los usuarios, idealmente con herramientas automatizadas, acumulando experiencia.
4. ¿Qué es la regla de Beyoncé y qué comportamiento incentiva?
   R: "Si te gustaba, deberías haberle puesto un test": si un cambio ajeno pasa CI pero rompe tu producto, la responsabilidad es tuya por no tener un test. Incentiva que cada equipo proteja sus comportamientos importantes con tests automatizados, lo que permite a otros cambiar código compartido con confianza.
5. ¿Qué significa "shifting left" y por qué importa?
   R: Mover la detección de problemas hacia etapas más tempranas del desarrollo (editor, tests, review) porque el costo de un defecto crece cuanto más tarde se detecta; en producción es el más caro.
6. ¿Por qué "si duele, hazlo más seguido" es un buen consejo para actualizaciones y migraciones?
   R: Porque lo que se hace con frecuencia se vuelve pequeño, conocido y automatizable. Posponer acumula cambios, dependencias ocultas y olvido, lo que convierte una tarea rutinaria en un proyecto arriesgado.

## Ejercicio

Escribe en TypeScript un módulo `priceList.ts` con una función `listPrices(products: Product[]): string[]` y luego escribe un breve análisis (máximo una página, en un archivo `ANALISIS.md`) que responda: (a) qué comportamientos observables tiene tu función más allá de lo que documentas (orden, formato numérico, separador decimal, manejo de lista vacía); (b) cuáles harías explícitos en el contrato y cuáles aleatorizarías o documentarías como "no garantizado"; (c) qué tests escribirías como consumidor para cumplir la regla de Beyoncé. Terminado cuando tienes el código, al menos cinco comportamientos observables listados y tres tests escritos (aunque sea en pseudocódigo).

## Explícalo con tus palabras

Explícale a alguien que solo ha hecho scripts por qué el mismo código puede ser "bueno" como script y "malo" como software de producción, usando la ley de Hyrum en tu explicación.
