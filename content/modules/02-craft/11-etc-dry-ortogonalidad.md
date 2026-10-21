---
title: ETC, DRY y ortogonalidad
kind: lesson
hours: 2
sources: The Pragmatic Programmer, cap. 2 A Pragmatic Approach, temas 8–10 (pp. 73–103)
---

## Objetivo

Interiorizar los tres principios de diseño más generales de *The Pragmatic Programmer*: ETC (más fácil de cambiar) como valor que guía las decisiones, DRY (cada conocimiento en un solo lugar) y ortogonalidad (cambiar una cosa no debería afectar a otras). Al terminar vas a poder distinguir la duplicación de conocimiento de la duplicación casual de código y evaluar cuán ortogonal es un diseño.

## Estudio

### ETC: el principio detrás de todos los principios

Hay muchísimos principios de diseño: SOLID, DRY, KISS, YAGNI, Ley de Demeter, alta cohesión y bajo acoplamiento... Hunt y Thomas proponen algo que, según dicen, solo se les hizo evidente con los años: **un buen diseño es más fácil de cambiar que un mal diseño**. Lo llaman **ETC** (*Easier To Change*).

La idea es que casi todos los demás principios son casos particulares de ETC:

| Principio | Por qué es un caso de ETC |
| --- | --- |
| Desacoplamiento | Al aislar responsabilidades, cada una se puede cambiar por separado |
| Responsabilidad única | Un cambio de requisitos se refleja en un solo módulo |
| Buenos nombres | El código se entiende antes, y hay que entenderlo para cambiarlo |
| DRY | Un cambio de conocimiento se hace en un solo lugar |
| Tests | Puedes cambiar sabiendo enseguida si rompiste algo |

Un matiz importante: **ETC es un valor, no una regla**. Los valores te ayudan a decidir entre dos caminos; no son pasos mecánicos. Los autores sugieren reforzarlo de forma consciente al principio: durante una semana, cada vez que guardes un archivo, escribas un test o arregles un bug, pregúntate "¿lo que acabo de hacer hizo el sistema más fácil o más difícil de cambiar?". Con el tiempo, la pregunta se vuelve automática.

¿Y si no sabes qué forma tendrá el cambio futuro? El libro da dos respuestas:

1. **Haz que lo que escribes sea reemplazable.** Si no sabes cómo va a cambiar, al menos asegúrate de que esa pieza se pueda sustituir sin arrastrar al resto. Es otra forma de decir "desacoplado y cohesivo".
2. **Úsalo para desarrollar instinto.** Anota en tu cuaderno de ingeniería la decisión que tomaste y tu apuesta sobre el cambio futuro. Cuando el cambio llegue, compara. Así aprendes.

### DRY: no te repitas

DRY (*Don't Repeat Yourself*) es uno de los principios más citados y, según los propios autores, más malinterpretados de la primera edición del libro. La definición precisa es:

> Cada pieza de conocimiento debe tener una representación única, inequívoca y autorizada dentro de un sistema. (*The Pragmatic Programmer*, tema 9)

La palabra clave es **conocimiento**. DRY no trata de copiar y pegar código; trata de **no duplicar conocimiento ni intención**. La prueba que proponen es simple: cuando un aspecto del sistema tiene que cambiar, ¿tienes que cambiarlo en varios lugares y en varios formatos (código, documentación, esquema de base de datos)? Si sí, tu código no es DRY.

### Duplicación en el código que sí viola DRY

```ts
function printBalance(account: Account): void {
  if (account.debits < 0) console.log(`Débitos: ${(-account.debits).toFixed(2)}`);
  else console.log(`Débitos: ${account.debits.toFixed(2)}`);
  if (account.credits < 0) console.log(`Créditos: ${(-account.credits).toFixed(2)}`);
  else console.log(`Créditos: ${account.credits.toFixed(2)}`);
  // ... lo mismo para comisiones e intereses
  const balance = account.credits - account.debits;
  if (balance < 0) console.log(`Saldo: ${(-balance).toFixed(2)}`);
  else console.log(`Saldo: ${balance.toFixed(2)}`);
}
```

El conocimiento duplicado aquí es "cómo se formatea un importe" (valor absoluto con dos decimales) y "cómo se imprime una línea con etiqueta". Si mañana los importes negativos se muestran entre paréntesis, hay que cambiarlo en cinco sitios.

```ts
function formatAmount(amount: number): string {
  return Math.abs(amount).toFixed(2);
}

function printLine(label: string, amount: number): void {
  console.log(`${label}: ${formatAmount(amount)}`);
}

function printBalance(account: Account): void {
  printLine("Débitos", account.debits);
  printLine("Créditos", account.credits);
  printLine("Comisiones", account.fees);
  printLine("Intereses", account.interest);
  printLine("Saldo", account.credits - account.debits);
}
```

### No toda duplicación de código viola DRY

Esta es la parte que suele malinterpretarse. Mira estas dos funciones:

```ts
function validateAge(value: number): void {
  if (!Number.isInteger(value) || value <= 0) throw new ValidationError("edad inválida");
}

function validateQuantity(value: number): void {
  if (!Number.isInteger(value) || value <= 0) throw new ValidationError("cantidad inválida");
}
```

El código es casi idéntico. ¿Viola DRY? **No necesariamente.** Representan dos piezas de conocimiento distintas que por casualidad coinciden hoy: la regla de validez de una edad y la de una cantidad. Mañana la edad puede requerir un máximo de 120 y la cantidad permitir cero para "borrar del carrito". Si las fusionaras en una función `validatePositiveInteger`, cuando una regla cambie tendrías que separarlas otra vez (o, peor, añadir un flag). Es una **coincidencia**, no una duplicación de conocimiento.

Lo que sí puedes hacer es que ambas usen un ayudante de bajo nivel (`isPositiveInteger`) mientras cada una conserva su propia regla con nombre. Así el conocimiento "qué es un entero positivo" está en un solo lugar, y el conocimiento "qué es una edad válida" está en otro.

Una heurística práctica: antes de extraer código repetido, pregúntate **"si una de estas copias cambia, ¿la otra debería cambiar también?"**. Si la respuesta es sí, es duplicación de conocimiento. Si es "no necesariamente", es coincidencia, y forzar la abstracción crea acoplamiento.

### Duplicación en la documentación

Los comentarios que repiten lo que hace el código son duplicación: cuando el código cambia, el comentario queda desactualizado (la sesión 6 ya lo mostró). El libro da un ejemplo de una función con un comentario que describe exactamente sus pasos: si cambian las reglas, hay que actualizar dos cosas. Mejor un nombre de función claro y, si hace falta, un comentario que explique el porqué.

### Duplicación en los datos

Las estructuras de datos también pueden duplicar conocimiento. El ejemplo clásico es una línea con punto inicial, punto final y longitud:

```ts
// Duplicación: length se puede derivar de start y end
class Line {
  constructor(public start: Point, public end: Point, public length: number) {}
}

// DRY: la longitud se calcula
class Line {
  constructor(readonly start: Point, readonly end: Point) {}
  get length(): number {
    return this.start.distanceTo(this.end);
  }
}
```

Si `length` se guarda, alguien cambiará `end` sin actualizar `length` y el objeto quedará inconsistente. A veces se guarda un valor derivado por rendimiento (por ejemplo, un total precalculado en una base de datos); en ese caso, la clave es **que la duplicación quede encapsulada**: solo la clase sabe que existe la caché y se encarga de mantenerla coherente. Por eso el libro recomienda, cuando sea posible, el **principio de acceso uniforme** de Bertrand Meyer: que quien usa un módulo no pueda saber si un valor está guardado o se calcula. En TypeScript, los `get` cumplen exactamente esa función.

### Duplicación de representación y entre personas

**Duplicación de representación.** Cuando tu código se comunica con el exterior (otra librería, un API, una base de datos), tu código y el exterior comparten conocimiento sobre la forma de los datos. Esta duplicación es inevitable, pero se puede mitigar:

- **APIs internas**: definir el contrato en un formato neutral (por ejemplo, OpenAPI o un esquema compartido) y generar documentación, clientes y validaciones a partir de él.
- **APIs externas**: usar las especificaciones formales que publique el proveedor (OpenAPI, GraphQL) para generar tipos en lugar de escribirlos a mano.
- **Fuentes de datos**: generar los tipos o los contenedores a partir del esquema de la base de datos, o al revés, en lugar de mantener las dos cosas a mano.

En TypeScript, un ejemplo muy práctico es definir el esquema una sola vez con una librería como Zod y **derivar** de él tanto la validación como el tipo:

```ts
import { z } from "zod";

const SessionSchema = z.object({
  title: z.string().min(1),
  kind: z.enum(["lesson", "project", "evaluation", "course"]),
  hours: z.union([z.literal(2), z.literal(3)]),
});

type Session = z.infer<typeof SessionSchema>; // el tipo sale del mismo conocimiento
```

**Duplicación entre desarrolladores.** Es la más difícil de detectar: dos personas de equipos distintos implementan la misma utilidad sin saberlo. El libro cuenta el caso de un gobierno en el que se encontraron decenas de implementaciones distintas de la validación de un número de identificación nacional. La solución no es técnica sino de comunicación: canales donde se compartan las utilidades, un responsable del conocimiento compartido, revisiones de código, y **hacer que reutilizar sea fácil**. Si encontrar y usar algo existente cuesta más que escribirlo de nuevo, la gente lo escribirá de nuevo.

### Ortogonalidad

El término viene de la geometría: dos rectas son ortogonales si se cortan en ángulo recto, de modo que moverse a lo largo de una no cambia tu posición en la otra. En software, dos componentes son ortogonales si **los cambios en uno no afectan al otro**. El ejemplo clásico del libro: en un sistema bien diseñado, el código de la base de datos y el de la interfaz de usuario son ortogonales; puedes cambiar la interfaz sin tocar la base de datos, y cambiar de base de datos sin tocar la interfaz.

El libro cuenta la historia de alguien que pilota un helicóptero por primera vez: cada control (cíclico, colectivo, pedales) afecta a todos los demás. Si subes el colectivo, el helicóptero gira, y para compensar tienes que mover los pedales, lo que cambia la sustentación... Un sistema no ortogonal es así: tocar algo provoca efectos en todas partes.

### Beneficios de la ortogonalidad

**Ganas productividad:**

- Los cambios quedan localizados, así que el tiempo de desarrollo y de pruebas baja.
- Se fomenta la reutilización: componentes con responsabilidades bien definidas se combinan de formas que sus autores no imaginaron.
- Hay una ganancia combinatoria: si un componente hace M cosas y otro hace N, combinados ortogonalmente hacen M × N. Si se solapan, hacen menos.

**Reduces el riesgo:**

- Las partes enfermas del código quedan aisladas: si un módulo tiene problemas, es menos probable que contagie al resto, y es más fácil reemplazarlo.
- El sistema es menos frágil: los cambios pequeños tienen efectos pequeños.
- Se prueba mejor, porque cada componente se puede probar por separado.
- Dependes menos de un proveedor o una plataforma concreta, porque las interfaces con terceros quedan aisladas.

### Cómo comprobar si un diseño es ortogonal

El libro propone una prueba sencilla: **si cambio drásticamente los requisitos detrás de una función concreta, ¿cuántos módulos se ven afectados?** En un sistema ortogonal, la respuesta debería ser "uno".

Otra pregunta útil: **¿mi diseño está desacoplado de los cambios del mundo real?** El libro da un ejemplo: ¿usas el número de teléfono como identificador de cliente? ¿Qué pasa cuando la compañía telefónica reasigna los números? No dependas de propiedades de cosas que no controlas.

```ts
// No ortogonal: el identificador depende de un dato externo que puede cambiar
type Customer = { phone: string; name: string }; // phone usado como clave
const ordersByCustomer = new Map<string, Order[]>(); // clave: teléfono

// Ortogonal: identificador propio, el teléfono es un atributo más
type CustomerId = string & { readonly __brand: "CustomerId" };
type Customer = { id: CustomerId; phone: string; name: string };
```

### Ortogonalidad en la práctica

El libro repasa varias áreas donde se aplica:

**Diseño.** Los sistemas en capas son una forma de ortogonalidad: cada capa usa solo los servicios de la capa inferior. Cambiar la implementación de una capa no afecta a las de arriba mientras se respete su interfaz.

**Librerías y toolkits.** Cuando elijas una librería, pregúntate si te obliga a hacer cambios en tu código que no deberían estar ahí. Un framework que exige que tus objetos de dominio hereden de sus clases base o lleven sus decoradores reduce la ortogonalidad: tu dominio queda atado a él.

**Código.** Algunas técnicas concretas:

- **Mantén el código desacoplado**: módulos tímidos que no revelan nada innecesario (la Ley de Demeter de la sesión 7).
- **Evita los datos globales**: cada referencia a datos globales ata al componente con todo lo demás que los usa.
- **Evita funciones parecidas**: si tienes varias funciones con el mismo esqueleto y pequeñas diferencias, probablemente falta una abstracción (por ejemplo, el patrón Strategy).

**Tests.** Un sistema ortogonal es más fácil de probar, porque las pruebas unitarias no necesitan montar medio sistema. Al revés, si escribir un test unitario te obliga a importar media aplicación, es una señal de acoplamiento. Arreglar un bug también es una prueba: si para arreglarlo tienes que tocar muchos módulos, el diseño no es ortogonal.

**Documentación.** Incluso la documentación puede ser ortogonal: el contenido y la presentación deberían poder cambiar por separado (por ejemplo, escribir en Markdown y dejar que una herramienta genere el HTML).

### Ejemplo integrado: notificaciones

```ts
// No ortogonal: lógica de negocio, formato y canal mezclados
async function onOrderShipped(order: Order): Promise<void> {
  const html = `<h1>¡Tu pedido ${order.id} salió!</h1><p>Llega el ${order.eta}</p>`;
  if (order.customer.prefersSms) {
    await twilio.messages.create({ to: order.customer.phone, body: `Pedido ${order.id} enviado` });
  } else {
    await sendgrid.send({ to: order.customer.email, subject: "Pedido enviado", html });
  }
  await db.query("UPDATE orders SET notified = 1 WHERE id = ?", [order.id]);
}
```

Cambiar el proveedor de SMS, el texto del mensaje, la forma de guardar el estado o añadir notificaciones push obliga a tocar esta función, y cada cambio puede romper los demás.

```ts
// Ortogonal: cada eje de cambio en su propio módulo
interface Notifier {
  send(recipient: Customer, message: Message): Promise<void>;
}

function shippedMessage(order: Order): Message {
  return { title: `Tu pedido ${order.id} salió`, body: `Llega el ${order.eta}` };
}

async function onOrderShipped(order: Order, deps: { notifier: Notifier; orders: OrderRepository }) {
  await deps.notifier.send(order.customer, shippedMessage(order));
  await deps.orders.markNotified(order.id);
}

// El canal (SMS, correo, push) se elige en un Notifier compuesto,
// y cada proveedor vive en su propio adaptador.
```

Ahora hay cuatro ejes independientes: el contenido del mensaje (`shippedMessage`), el canal (`Notifier`), la persistencia (`OrderRepository`) y el flujo del caso de uso (`onOrderShipped`). Prueba la pregunta del libro: si cambias drásticamente los requisitos de cualquiera de ellos, ¿cuántos módulos cambian? Uno.

### ETC, DRY y ortogonalidad juntos

| Principio | Pregunta que haces |
| --- | --- |
| ETC | ¿Esta decisión hace el sistema más fácil o más difícil de cambiar? |
| DRY | Si esta pieza de conocimiento cambia, ¿en cuántos lugares tengo que tocar? |
| Ortogonalidad | Si cambio esta parte, ¿cuántas otras partes se ven afectadas? |

Las tres preguntas apuntan a lo mismo: que el costo de un cambio sea proporcional al tamaño del cambio, no al tamaño del sistema. Cuando dudes entre dos diseños, haz las tres preguntas en voz alta y elige el que gane en más de ellas.

### Errores comunes

- **Aplicar DRY a la forma del código y no al conocimiento**, fusionando funciones que coinciden por casualidad.
- **Crear abstracciones prematuras** con parámetros y flags para cubrir casos "parecidos" que en realidad evolucionan distinto.
- **Guardar datos derivados sin encapsular** su sincronización.
- **Usar datos externos (teléfono, correo) como identificadores internos.**
- **Dejar que un framework invada el dominio** con herencias o decoradores obligatorios.

### Resumen

ETC es la brújula: cada decisión debería hacer el sistema más fácil de cambiar, y cuando no sabes qué cambiará, haz que la pieza sea reemplazable. DRY trata del conocimiento, no del texto: cada regla, dato o contrato tiene un único lugar autorizado, y el código que coincide por casualidad puede (y a veces debe) seguir separado. Los datos derivados se calculan o se encapsulan, y las representaciones compartidas con el exterior se generan desde un esquema. La ortogonalidad hace que los cambios queden localizados: comprueba tu diseño preguntando cuántos módulos cambian si cambian los requisitos de una función. Las tres ideas juntas buscan que el costo de un cambio sea proporcional al cambio, no al tamaño del sistema.

## Conceptos clave

- **ETC (Easier To Change)**: valor de diseño según el cual una buena decisión hace el sistema más fácil de cambiar.
- **DRY**: cada pieza de conocimiento tiene una representación única, inequívoca y autorizada en el sistema.
- **Duplicación casual**: código parecido que representa conocimientos distintos; no viola DRY.
- **Principio de acceso uniforme**: quien usa un módulo no debe saber si un valor está guardado o se calcula.
- **Duplicación de representación**: conocimiento compartido con sistemas externos; se mitiga generando código a partir de esquemas.
- **Ortogonalidad**: propiedad por la que cambiar un componente no afecta a otros.
- **Prueba de ortogonalidad**: contar cuántos módulos cambian si cambian drásticamente los requisitos de una función.

## Preguntas de repaso

1. ¿Por qué los autores dicen que ETC es "un valor, no una regla"?
   R: Porque no es un procedimiento mecánico sino un criterio que te ayuda a elegir entre alternativas preguntando si la decisión hace el sistema más fácil o más difícil de cambiar. Al principio se refuerza conscientemente y con el tiempo se vuelve un instinto.
2. Explica la diferencia entre duplicación de conocimiento y duplicación casual con un ejemplo.
   R: Duplicación de conocimiento: la misma regla (cómo se formatea un importe) escrita en cinco lugares; si cambia, hay que cambiar todos. Duplicación casual: `validateAge` y `validateQuantity` tienen hoy el mismo código pero representan reglas distintas que pueden evolucionar por separado; fusionarlas crearía acoplamiento.
3. ¿Qué es el principio de acceso uniforme y cómo ayuda a respetar DRY en los datos?
   R: Que quien usa un módulo no pueda distinguir si un valor está almacenado o se calcula. Permite derivar valores (como la longitud de una línea) con un getter, o cachearlos si hace falta, sin que el cliente lo sepa y sin duplicar estado inconsistente.
4. ¿Cómo se mitiga la duplicación de representación con APIs y esquemas?
   R: Definiendo el contrato una sola vez en un formato neutral (OpenAPI, esquema de base de datos, esquema Zod) y generando o derivando de él tipos, validaciones, clientes y documentación, en lugar de mantener varias copias a mano.
5. ¿Qué pregunta propone el libro para comprobar si un diseño es ortogonal?
   R: Si cambio drásticamente los requisitos detrás de una función concreta, ¿cuántos módulos se ven afectados? En un diseño ortogonal debería ser uno.
6. Menciona tres beneficios de la ortogonalidad.
   R: Cambios localizados que reducen el tiempo de desarrollo y pruebas; mayor reutilización y ganancia combinatoria; menor riesgo, porque los problemas quedan aislados, el sistema es menos frágil, se prueba mejor y depende menos de un proveedor concreto.

## Ejercicio

Escribe en TypeScript un pequeño generador de facturas con tres requisitos: calcular el total con impuestos, exportarlo a CSV y enviarlo por correo. Primero hazlo en una sola función de forma no ortogonal. Después refactoriza para que cálculo, formato y envío sean ortogonales (interfaces `InvoiceFormatter` y `InvoiceSender`), elimina toda duplicación de conocimiento (por ejemplo, la tasa de impuesto y el formato de importes en un solo lugar) y deja intencionadamente una duplicación casual justificada con un comentario de intención. Comprueba la ortogonalidad añadiendo un formato PDF falso y un envío por Slack falso. Terminado cuando añadir el formato y el canal nuevos no modifica ninguna línea del cálculo y hay tests para el cálculo que no importan nada de formato ni de envío.

## Explícalo con tus palabras

Explica DRY a alguien que cree que significa "nunca tener dos líneas de código iguales", y convéncelo de que a veces dos funciones idénticas deben seguir separadas.
