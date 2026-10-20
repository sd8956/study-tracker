---
title: Code smells y heurísticas
kind: lesson
hours: 2
sources: Clean Code, cap. 17 Smells and Heuristics (pp. 316–346)
---

## Objetivo

Usar el catálogo de olores y heurísticas de *Clean Code* como lista de verificación para revisar código: comentarios, entorno, funciones, generales, nombres y tests. Al terminar vas a poder nombrar con precisión lo que está mal en un fragmento de TypeScript (por ejemplo, "G14 envidia de funcionalidad" o "F3 argumento flag") y proponer la refactorización correspondiente.

## Estudio

### Un vocabulario para el code review

El capítulo 17 de *Clean Code* es distinto a los demás: no es una explicación, es un **catálogo**. Martin lo construyó mientras refactorizaba programas reales: cada vez que hacía un cambio, se preguntaba por qué lo hacía y anotaba la razón. El resultado es una lista de **olores** (*smells*, un término que popularizaron Kent Beck y Martin Fowler) y **heurísticas**.

Un olor no es un error: es una señal de que **probablemente** hay un problema de diseño. Como el olor a humo en casa, no te dice qué se quema, pero te dice que mires. Tener nombres precisos para estos olores tiene un valor enorme en equipo: en un code review, "esto tiene envidia de funcionalidad, ¿y si movemos el cálculo a `Order`?" es mucho más claro y menos personal que "esto no me gusta".

El catálogo usa códigos: C (comentarios), E (entorno), F (funciones), G (general), J (Java), N (nombres) y T (tests). Las heurísticas de Java (J1–J3) se adaptan fácilmente a TypeScript. Muchas ya las conoces de sesiones anteriores, así que aquí verás un repaso organizado con ejemplos y la refactorización típica de cada una.

### Comentarios (C1–C5)

| Código | Olor | Qué hacer |
| --- | --- | --- |
| C1 | Información inapropiada (historial, autores, metadatos que pertenecen al control de versiones o al gestor de tickets) | Borrar; usar Git y el sistema de tickets |
| C2 | Comentario obsoleto | Actualizarlo o, mejor, eliminar la necesidad de tenerlo |
| C3 | Comentario redundante (`i++; // incrementa i`) | Borrar |
| C4 | Comentario mal escrito | Si vale la pena escribirlo, escríbelo bien: breve, correcto, sin divagar |
| C5 | Código comentado | Borrar; Git lo recuerda |

### Entorno (E1–E2)

- **E1. Construir requiere más de un paso.** Clonar el repositorio y construir el proyecto debería ser un solo comando. Si hay que instalar cosas a mano, copiar archivos o seguir un ritual, es un olor.
- **E2. Ejecutar los tests requiere más de un paso.** Debería bastar con un comando (`npm test`) o un botón en el editor.

En un proyecto TypeScript, esto se traduce en un `package.json` con scripts claros (`npm run build`, `npm test`, `npm run lint`), un archivo `.nvmrc` o el campo `engines` con la versión de Node y un README con los pasos mínimos. Lo verás en la sesión 29 como parte del "kit de inicio pragmático".

### Funciones (F1–F4)

- **F1. Demasiados argumentos.** Cero es ideal, luego uno, dos, tres. Más de tres es muy cuestionable. Agrupa en un objeto con significado.
- **F2. Argumentos de salida.** Si la función tiene que cambiar algo, que cambie el estado de su propio objeto o devuelva un valor nuevo.
- **F3. Argumentos flag.** Un booleano que cambia lo que hace la función: divide en dos funciones.
- **F4. Función muerta.** Métodos que nunca se llaman: bórralos. En TypeScript, el compilador (`noUnusedLocals`) y ESLint ayudan a detectarlos dentro de un módulo; para exportaciones sin uso hay herramientas como `knip` o `ts-prune`.

### Generales (G1–G36): los más importantes

Esta es la sección más larga. Agrupamos los olores por tema.

**Duplicación y abstracción**

- **G5. Duplicación.** Martin la considera una de las reglas más importantes del libro. Cada duplicación es una oportunidad perdida de abstraer. La forma obvia son bloques idénticos; más sutiles son los `switch/case` o cadenas de `if/else` que se repiten en varios módulos (se reemplazan con polimorfismo) y los algoritmos parecidos con líneas distintas (Template Method o Strategy). Recuerda el matiz de la sesión 11: duplicación de **conocimiento**, no de forma.
- **G6. Código en el nivel de abstracción equivocado.** Los conceptos de alto nivel (en clases base o interfaces) no deben mezclarse con detalles de bajo nivel. Por ejemplo, una interfaz `Stack` con un método `percentFull()` asume una implementación de tamaño fijo: es un detalle que se coló en la abstracción.
- **G7. Clases base que dependen de sus derivadas.** La clase base no debería conocer a sus hijas; si lo hace, no se pueden desplegar ni cambiar por separado.
- **G8. Demasiada información.** Las interfaces buenas son pequeñas y hacen mucho con poco. Oculta datos, funciones auxiliares, constantes y temporales. Cuantos menos métodos y variables expone una clase, mejor.
- **G9. Código muerto.** Código que no se ejecuta: un `if` cuya condición nunca se cumple, un `catch` de algo que nunca se lanza. Bórralo.

**Organización y lectura**

- **G10. Separación vertical.** Variables y funciones se definen cerca de donde se usan (sesión 6).
- **G11. Inconsistencia.** Si haces algo de una forma, hazlo siempre igual. Si una función se llama `processVerificationRequest`, otra parecida no debería llamarse `handleDeletion`.
- **G12. Desorden.** Constructores vacíos, variables sin usar, funciones que nadie llama, comentarios sin información: todo eso sobra.
- **G16. Intención oscura.** Expresiones compactas, notación húngara, números mágicos: código que no se entiende a la primera.

```ts
// G16
const m = (o: any) => o.i * (1 + (o.c ? 0.19 : 0)) - (o.d ?? 0);

// Intención clara
const VAT_RATE = 0.19;
function finalPrice(order: Order): number {
  const tax = order.chargesVat ? VAT_RATE : 0;
  return order.itemsTotal * (1 + tax) - order.discount;
}
```

**Acoplamiento y responsabilidades**

- **G13. Acoplamiento artificial.** Cosas que no dependen entre sí no deberían estar acopladas. Por ejemplo, un enum general dentro de una clase específica obliga a todo el que lo use a conocer esa clase. Ponlo donde pertenece.
- **G14. Envidia de funcionalidad** (*feature envy*). Un método que usa más los datos de otro objeto que los suyos propios "envidia" a esa clase y probablemente debería vivir allí.

```ts
// G14: este método vive en ReportService pero solo usa datos de Employee
class ReportService {
  weeklyPay(employee: Employee): number {
    const tenthRate = employee.getTenthRate();
    const tenthsWorked = employee.getTenthsWorked();
    const straightTime = Math.min(400, tenthsWorked);
    const overTime = Math.max(0, tenthsWorked - straightTime);
    return straightTime * tenthRate + overTime * tenthRate * 1.5;
  }
}

// Mejor: el cálculo vive donde están los datos (tell, don't ask)
class Employee {
  weeklyPay(): number { /* misma lógica con this.tenthRate y this.tenthsWorked */ return 0; }
}
```

  A veces la envidia es aceptable: por ejemplo, un formateador de informes que lee datos de un empleado para imprimirlos. Mover el formato a `Employee` haría que la clase conozca el formato del informe, que es otra responsabilidad. Juzga caso a caso.

- **G15. Argumentos selectores.** Como el flag (F3), pero también con enums o enteros: `calculate(employee, PayType.OVERTIME)`. Divide en funciones.
- **G17. Responsabilidad mal ubicada.** ¿Dónde va una constante como `PI` o una función que calcula el total de horas? Donde quien lee esperaría encontrarla (principio de la menor sorpresa).
- **G18. Static inapropiado.** Una función estática está bien si nunca querrás que se comporte de forma polimórfica (`Math.max`). Si existe una posibilidad razonable de que necesites variantes, haz que sea un método de instancia.
- **G22. Haz físicas las dependencias lógicas.** Si un módulo depende de otro, que lo haga explícito pidiéndole la información, no asumiendo valores. Ejemplo: un reporte que asume que hay 55 líneas por página porque "el formateador usa 55" debería preguntarle al formateador su tamaño de página.
- **G31. Acoplamientos temporales ocultos.** Si el orden de llamada importa, hazlo evidente en la estructura:

```ts
// Oculto: nada impide llamarlas en otro orden
class MoogDiver {
  dive(reason: string): void {
    this.saturateGradient();
    this.reticulateSplines();
    this.diveForMoog(reason);
  }
}

// Explícito: cada paso necesita el resultado del anterior
class MoogDiver {
  dive(reason: string): void {
    const gradient = this.saturateGradient();
    const splines = this.reticulateSplines(gradient);
    this.diveForMoog(splines, reason);
  }
}
```

- **G36. Evita la navegación transitiva.** La Ley de Demeter de la sesión 7: `a.getB().getC().doSomething()` es un olor.

**Condicionales y polimorfismo**

- **G23. Prefiere polimorfismo a if/else o switch.** La regla de "un solo switch" de la sesión 5.
- **G28. Encapsula condicionales.** `if (shouldBeDeleted(timer))` se lee mejor que `if (timer.hasExpired() && !timer.isRecurrent())`.
- **G29. Evita condicionales negativos.** `if (buffer.shouldCompact())` es más fácil que `if (!buffer.shouldNotCompact())`.
- **G33. Encapsula condiciones de borde.** Los `+1` y `-1` dispersos son fuente de errores. Dales nombre:

```ts
// Antes
if (level + 1 < tags.length) {
  parts = new Parse(body, tags, level + 1, offset + endTag);
}

// Después
const nextLevel = level + 1;
if (nextLevel < tags.length) {
  parts = new Parse(body, tags, nextLevel, offset + endTag);
}
```

**Precisión y convenciones**

- **G3. Comportamiento incorrecto en los bordes.** No confíes en la intuición: escribe tests para cada caso borde (listas vacías, cero, máximos, fechas límite).
- **G4. Seguridades anuladas.** Desactivar advertencias del compilador, saltarse tests fallidos o poner `// @ts-ignore` es como quitar los fusibles porque saltan. En TypeScript, prefiere `// @ts-expect-error` con un motivo, y solo como último recurso.
- **G19. Usa variables explicativas.** Dividir un cálculo en pasos intermedios con nombre es una de las técnicas más poderosas para hacer legible un módulo.
- **G20. Los nombres de funciones dicen lo que hacen.** `date.add(5)`: ¿días?, ¿semanas?, ¿muta la fecha o devuelve una nueva? Mejor `addDaysTo` o `daysLater`.
- **G21. Entiende el algoritmo.** Mucho código raro aparece porque alguien añadió `if` y flags hasta que "funcionó" sin entender el problema (programar por coincidencia, sesión 14). Antes de dar algo por terminado, asegúrate de entender cómo funciona.
- **G24. Sigue las convenciones estándar.** Las del equipo y las de la industria (la guía de estilo de la sesión 25).
- **G25. Reemplaza números mágicos por constantes con nombre.** No solo números: cualquier valor que no se explica por sí mismo (`"A"`, `86400000`).
- **G26. Sé preciso.** Usar `number` de coma flotante para dinero, ignorar la concurrencia, no comprobar `undefined` o capturar una excepción genérica cuando debías capturar una específica: las decisiones ambiguas provocan bugs.

```ts
// G26: dinero en coma flotante
0.1 + 0.2 === 0.3; // false

// Preciso: céntimos como enteros (o una librería de decimales)
type Cents = number & { readonly __brand: "Cents" };
const toCents = (amount: number): Cents => Math.round(amount * 100) as Cents;
```

- **G27. Estructura sobre convención.** Una convención ("todos los switch deben tener todos los casos") depende de la disciplina; una estructura (una clase abstracta con métodos abstractos, o una unión discriminada con comprobación `never`) la impone el compilador.
- **G30. Las funciones hacen una cosa.** (Sesión 5.)
- **G32. No seas arbitrario.** Si la estructura del código parece arbitraria, otros se sentirán libres de cambiarla. Ten una razón para cómo estructuras el código y que esa razón se vea.
- **G34. Las funciones descienden un solo nivel de abstracción.** (Sesión 5.)
- **G35. Mantén los datos configurables en niveles altos.** Un valor por defecto o de configuración no debería estar enterrado en una función de bajo nivel; exponlo arriba (sesión 13).

**Otros generales**

- **G1. Varios lenguajes en un archivo.** Un archivo con TypeScript, SQL, HTML y CSS mezclados es confuso. Minimiza la mezcla (en React/JSX, la mezcla de marcado y lógica es parte del modelo, pero sigue siendo útil sacar SQL, estilos largos y lógica de negocio a otros archivos).
- **G2. Comportamiento obvio no implementado.** Según el principio de la menor sorpresa, una función o clase debería implementar lo que otro programador razonablemente esperaría. Si `parseDay("Monday")` funciona, se espera que `parseDay("monday")` también.

### Heurísticas de Java adaptadas (J1–J3)

- **J1. Evita listas largas de importaciones.** En TypeScript, el equivalente es preferir importaciones agrupadas y, cuando tiene sentido, un barrel explícito por módulo (con las precauciones de la sesión 15).
- **J2. No heredes constantes.** No uses la herencia para tener acceso a constantes; impórtalas.
- **J3. Constantes frente a enums.** Usa tipos con significado en lugar de números o strings sueltos. En TypeScript, una unión de literales con `as const` suele ser preferible a `enum`, porque no genera código extra y se integra mejor con el resto del sistema de tipos.

### Nombres (N1–N7)

| Código | Heurística |
| --- | --- |
| N1 | Elige nombres descriptivos (y revísalos a medida que el código evoluciona) |
| N2 | Elige nombres en el nivel de abstracción adecuado: `Modem.connect(connectionLocator)` en lugar de `Modem.dial(phoneNumber)` si el módem puede no usar teléfono |
| N3 | Usa nomenclatura estándar (nombres de patrones, términos del dominio) |
| N4 | Nombres inequívocos, aunque sean largos |
| N5 | Nombres largos para ámbitos largos |
| N6 | Evita codificaciones (prefijos de tipo o ámbito) |
| N7 | Los nombres deben describir los efectos secundarios: `getOrCreateSession` en lugar de `getSession` si la crea |

### Tests (T1–T9)

- **T1. Tests insuficientes.** Un conjunto de tests debería probar todo lo que pueda romperse.
- **T2. Usa una herramienta de cobertura.** Te muestra las zonas sin probar (con Vitest: `vitest run --coverage`).
- **T3. No te saltes los tests triviales.** Son baratos y documentan.
- **T4. Un test ignorado es una pregunta sobre una ambigüedad.** Si no sabes qué debería pasar, deja el test con `it.todo` o `it.skip` y una pregunta, no lo borres.
- **T5. Prueba las condiciones de borde.**
- **T6. Prueba exhaustivamente cerca de los bugs.** Los bugs se agrupan; donde hubo uno, probablemente hay más.
- **T7. Los patrones de fallo son reveladores.** Si fallan todos los tests con entradas de más de cinco caracteres, el patrón te dice dónde mirar.
- **T8. Los patrones de cobertura son reveladores.** Ver qué código no se ejecuta en los tests que fallan da pistas.
- **T9. Los tests deben ser rápidos.** Un test lento es un test que no se ejecuta.

Profundizarás en todo esto en las sesiones 19 a 22.

### Cómo usar el catálogo en la práctica

El catálogo es útil de tres maneras:

1. **Como lista de revisión.** Antes de abrir un pull request, recorre las categorías mentalmente: ¿hay duplicación (G5)?, ¿flags (F3)?, ¿números mágicos (G25)?, ¿nombres que no describen efectos (N7)?
2. **Como vocabulario compartido.** En un code review, nombrar el olor ("G14") despersonaliza el comentario y lo hace preciso.
3. **Como guía de refactoring.** Cada olor sugiere una refactorización: G14 → mover método; G5 → extraer función o Template Method; G23 → reemplazar condicional por polimorfismo; G28 → extraer función para la condición; G31 → pasar resultados como argumentos.

Martin cierra el capítulo con una advertencia: esta lista no es exhaustiva ni un sistema de valores. El código limpio no se obtiene siguiendo reglas sino con una **disciplina** y unos valores profesionales que las reglas solo describen.

### Ejercicio guiado: encuentra los olores

```ts
// ¿Cuántos olores encuentras?
export class OrderUtils {
  static process(o: any, s: boolean, t: number) {
    // procesar
    let tot = 0;
    for (const i of o.items) tot += i.p * i.q;
    if (t == 1) tot = tot * 0.9;
    else if (t == 2) tot = tot * 0.8;
    if (s) {
      o.customer.address.country == "CO" ? (tot += 5000) : (tot += 20000);
    }
    // o.saved = true
    o.total = tot;
    return o;
  }
}
```

Algunos olores: N1 y G16 (`process`, `o`, `s`, `t`, `tot`), F1 (tres argumentos, uno `any`), F3 (flag `s`), G15 (selector `t`), G25 (números mágicos `0.9`, `0.8`, `5000`, `20000`, `"CO"`), G23 (if/else por tipo), G36 (`o.customer.address.country`), F2 (modifica el argumento `o`), C3 y C5 (comentario redundante y código comentado), G18 (static que probablemente necesite variantes), G26 (dinero en coma flotante), N7 (no dice que modifica el pedido) y G17 (una clase `Utils` donde nadie espera encontrar reglas de precios).

### Errores comunes

- **Usar el catálogo como garrote** en los code reviews en lugar de como vocabulario compartido.
- **Tratar cada olor como un error obligatorio de corregir**: es una señal, no una ley.
- **Corregir olores sin tests**, introduciendo bugs mientras "limpias".
- **Ignorar los olores de entorno y tests** (E1, E2, T9), que afectan a todo el equipo cada día.

## Conceptos clave

- **Code smell**: síntoma en el código que sugiere un posible problema de diseño.
- **Envidia de funcionalidad (G14)**: método que usa más los datos de otra clase que los de la suya.
- **Acoplamiento temporal oculto (G31)**: orden de llamadas obligatorio que la estructura del código no hace evidente.
- **Estructura sobre convención (G27)**: preferir mecanismos que el compilador impone a reglas que dependen de la disciplina.
- **Seguridades anuladas (G4)**: desactivar advertencias, tests o comprobaciones de tipos.
- **Condición de borde encapsulada (G33)**: dar nombre a los `+1`/`-1` y límites en lugar de dispersarlos.
- **Patrón de fallo (T7)**: regularidad en los tests que fallan que señala dónde está el problema.

## Preguntas de repaso

1. ¿Qué es un code smell y por qué es útil tener nombres para ellos en un equipo?
   R: Es una señal de un probable problema de diseño, no necesariamente un error. Tener nombres precisos crea un vocabulario compartido que hace los code reviews más claros, menos personales y orientados a una refactorización concreta.
2. Explica G14 (envidia de funcionalidad) y cuándo puede ser aceptable.
   R: Un método que usa más los datos de otro objeto que los suyos y probablemente debería vivir en esa otra clase. Es aceptable cuando moverlo daría a la clase una responsabilidad ajena, como un formateador de informes que lee datos de un empleado: mover el formato al empleado mezclaría responsabilidades.
3. ¿Cómo se hace explícito un acoplamiento temporal oculto (G31)?
   R: Haciendo que cada paso reciba como argumento el resultado del paso anterior, de modo que la estructura de las llamadas imponga el orden y no se puedan reordenar sin que el código deje de compilar o tenga sentido.
4. ¿Qué significa "estructura sobre convención" (G27)? Da un ejemplo en TypeScript.
   R: Preferir mecanismos que impone el compilador o el diseño a reglas que dependen de que la gente las recuerde. Ejemplo: una unión discriminada con un switch que termina en una comprobación `never`, que da error de compilación si falta un caso, en lugar de una convención de "acuérdate de cubrir todos los casos".
5. ¿Por qué G26 ("sé preciso") menciona el dinero en coma flotante y cómo se resuelve?
   R: Porque los números de coma flotante no representan exactamente muchos decimales (0.1 + 0.2 no es 0.3), lo que produce errores de redondeo en importes. Se resuelve trabajando con céntimos enteros o con una librería de decimales.
6. ¿Qué dicen las heurísticas T4 y T6 sobre los tests?
   R: T4: un test ignorado es una pregunta sobre una ambigüedad en los requisitos; se deja marcado con la pregunta en lugar de borrarlo. T6: los bugs tienden a agruparse, así que donde encuentras uno debes probar exhaustivamente porque probablemente hay más.

## Ejercicio

Toma el fragmento `OrderUtils.process` de la lección y crea una tabla con cada olor que encuentres (código, descripción, línea y refactorización propuesta), con al menos diez filas. Después escribe tests de caracterización con Vitest y refactoriza el código eliminando todos los olores de tu tabla, en commits pequeños. Terminado cuando la tabla tiene al menos diez olores con su refactorización, los tests pasan antes y después y el código final no contiene ninguno de los olores de la tabla.

## Explícalo con tus palabras

Explica a alguien por qué decir "esto tiene envidia de funcionalidad" en un code review es mejor que decir "esto está mal hecho".
